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
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const ORANGE = '\x1b[38;2;255;107;53m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Cached counts older than this are dropped: the line still shows "visible as
// waiting", just without stale numbers.
const FRESH_MS = 6 * 60 * 1000;

function read(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

const configPath = process.env.LUBBY_CONFIG ?? join(homedir(), '.lubby', 'config.json');
const config = read(configPath);

// Not logged in: contribute nothing to the status line.
if (!config?.token) {
    process.exit(0);
}

const star = `${ORANGE}✻${RESET}`;
const label = `${ORANGE}Lubby${RESET}`;

if (config.paused) {
    process.stdout.write(`${star} ${label} ${DIM}paused${RESET}`);
    process.exit(0);
}

const snap = read(join(dirname(configPath), 'presence.json'));
const fresh =
    snap?.updated_at && Date.now() - Date.parse(snap.updated_at) < FRESH_MS;

let detail = 'visible as waiting';
if (fresh) {
    const stacks = Array.isArray(snap.waiting?.stacks) ? snap.waiting.stacks : [];
    const total = Number(snap.waiting?.total ?? 0);
    if (stacks.length) {
        const parts = stacks.map((s) => `${s.count} ${s.stack}`).join(' · ');
        detail = `visible · ${parts} waiting`;
    } else if (total > 0) {
        detail = `visible · ${total} dev${total === 1 ? '' : 's'} waiting`;
    }
}

process.stdout.write(`${star} ${label} ${DIM}· ${detail}${RESET}`);
process.exit(0);
