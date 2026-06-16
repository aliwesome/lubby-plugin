#!/usr/bin/env node
/**
 * Lubby status line. Unlike the one-shot `systemMessage` that the SessionStart
 * and Notification hooks emit (which shows once and then disappears), this is a
 * real Claude Code status line: it is configured in the user's settings.json
 * and Claude Code re-renders it continuously, so the Lubby line stays visible
 * for the whole session.
 *
 * Configure it in settings.json (the /lubby:login skill does this for you):
 *   "statusLine": {
 *     "type": "command",
 *     "command": "node ~/.lubby/statusline.mjs",
 *     "refreshInterval": 10
 *   }
 *
 * Reads only local files: the config and a small presence snapshot that the
 * event hook caches after each server reply. It NEVER hits the network, so it
 * is instant and can never slow the UI. Prints nothing when not logged in, so
 * it stays out of the way.
 *
 * What it shows:
 *  - the live agent status from presence.json (running / waiting / done / ...),
 *  - an animated spinner star while Claude is working (the frame is picked from
 *    the clock, so it advances every time Claude Code re-renders the line),
 *  - a clickable link (OSC 8) on the "Lubby" label that opens the web app.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// This script's version. Kept in step with the plugin version (plugin.json and
// lubby-event.mjs). Compared against the latest version the server reports so
// the line can flag when an update is available.
const VERSION = '0.3.3';

const ORANGE = '\x1b[38;2;255;107;53m';
const GOLD = '\x1b[38;2;255;183;3m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Spinner frames cycled while Claude is working. The frame is chosen from the
// clock so the star advances on every re-render, reading as a live animation.
const STARS = ['✶', '✦', '✳', '✻', '✺'];

// How the cached agent status maps to a short, human label on the line. The
// statuses come straight from the event hook (see lubby-event.mjs STATUS map).
const STATUS_LABEL = {
    running: 'waiting on Claude',
    waiting_input: 'Claude needs you',
    completed: 'Claude finished',
    failed: 'Claude failed',
    cancelled: 'Claude stopped',
};

// Cached counts older than this are dropped: the line still shows the status,
// just without stale "N devs waiting" numbers.
const FRESH_MS = 6 * 60 * 1000;

function read(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

// Wrap text in an OSC 8 hyperlink so terminals that support it make the label
// clickable. Terminals that do not simply render the plain text.
function link(text, url) {
    if (!url) return text;
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

// True when version `a` is strictly older than `b` (simple dotted-numeric
// compare; non-numeric or missing parts are treated as 0).
function isOlder(a, b) {
    if (!a || !b) return false;
    const pa = String(a).split('.');
    const pb = String(b).split('.');
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = Number(pa[i]) || 0;
        const y = Number(pb[i]) || 0;
        if (x !== y) return x < y;
    }
    return false;
}

const configPath = process.env.LUBBY_CONFIG ?? join(homedir(), '.lubby', 'config.json');
const config = read(configPath);

// Not logged in: contribute nothing to the status line.
if (!config?.token) {
    process.exit(0);
}

// The web app lives at the api_url without its trailing "/api"; clicking the
// Lubby label opens it. Falls back to the production host.
const webUrl =
    (config.api_url || '')
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '') || 'https://lubby.tech';

const star = (frame) => `${ORANGE}${frame}${RESET}`;
const label = `${ORANGE}${link('Lubby', webUrl)}${RESET}`;

if (config.paused) {
    process.stdout.write(`${star('✻')} ${label} ${DIM}paused${RESET}`);
    process.exit(0);
}

const snap = read(join(dirname(configPath), 'presence.json'));
const fresh =
    snap?.updated_at && Date.now() - Date.parse(snap.updated_at) < FRESH_MS;

const status = fresh ? snap?.status : null;
const working = status === 'running';

// Animate only while Claude is working; otherwise hold a steady star. The frame
// advances roughly four times a second, so each re-render lands on a new one.
const frame = working ? STARS[Math.floor(Date.now() / 250) % STARS.length] : '✻';

// Lead with the live status; fall back to the plain presence line when we have
// no fresh snapshot to read a status from.
let detail = STATUS_LABEL[status] ?? 'visible as waiting';

// Append aggregate "who else is waiting" counts when they are fresh. These are
// presence the user already shares; no code, paths, or names are included.
if (fresh) {
    const stacks = Array.isArray(snap.waiting?.stacks) ? snap.waiting.stacks : [];
    const total = Number(snap.waiting?.total ?? 0);
    if (stacks.length) {
        const parts = stacks.map((s) => `${s.count} ${s.stack}`).join(' · ');
        detail += ` · ${GOLD}${parts} waiting${RESET}${DIM}`;
    } else if (total > 0) {
        detail += ` · ${GOLD}${total} dev${total === 1 ? '' : 's'} waiting${RESET}${DIM}`;
    }
}

// Nudge to update when the server reports a newer plugin than this one. The
// hint is dim so it stays out of the way; run /lubby:update to act on it.
if (fresh && isOlder(VERSION, snap?.latest_version)) {
    detail += ` · ${GOLD}update available${RESET}${DIM} (/lubby:update)`;
}

process.stdout.write(`${star(frame)} ${label} ${DIM}· ${detail}${RESET}`);
process.exit(0);
