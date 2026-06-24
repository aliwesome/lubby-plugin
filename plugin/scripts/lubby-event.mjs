#!/usr/bin/env node
/**
 * Lubby hook handler. Invoked by Claude Code hooks with the event name
 * as argv[2]; the hook payload arrives on stdin.
 *
 * Privacy contract:
 *  - transcript_path is NEVER read.
 *  - cwd is used locally to derive a stack label ("Laravel") and is NEVER
 *    transmitted.
 *  - Only { agent, event, status, project_stack, visibility, metadata }
 *    leave this machine.
 *
 * This script must never break the agent: every failure path exits 0.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// The running plugin version. Sourced from the manifest so it can never drift
// out of step with plugin.json the way a second hardcoded copy would; falls back
// to a baked-in default when CLAUDE_PLUGIN_ROOT is unset (e.g. odd invocations).
const VERSION = readPluginVersion();

function readPluginVersion() {
    try {
        const root = process.env.CLAUDE_PLUGIN_ROOT;
        if (root) {
            const manifest = JSON.parse(
                readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'),
            );
            if (manifest?.version) return String(manifest.version);
        }
    } catch {
        // fall through to the baked-in default
    }
    return '0.3.5';
}

const EVENTS = ['started', 'heartbeat', 'waiting_input', 'completed', 'failed', 'cancelled'];
// Only these events ever surface a status line to the user, no matter how the
// hooks happen to pass the "announce" flag.
const ANNOUNCE_EVENTS = new Set(['started', 'waiting_input']);
const STATUS = {
    started: 'running',
    heartbeat: 'running',
    waiting_input: 'waiting_input',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
};
const HEARTBEAT_THROTTLE_MS = 30_000;

const configPath = process.env.LUBBY_CONFIG ?? join(homedir(), '.lubby', 'config.json');
const throttlePath = `${configPath}.heartbeat`;
// The status line (scripts/lubby-statusline.mjs) reads this snapshot so it can
// render instantly without ever hitting the network.
const presencePath = join(dirname(configPath), 'presence.json');

function readStdin() {
    return new Promise((resolve) => {
        let data = '';
        const done = () => resolve(data);
        process.stdin.on('data', (chunk) => (data += chunk));
        process.stdin.on('end', done);
        process.stdin.on('error', done);
        setTimeout(done, 2000).unref();
    });
}

// Marker-file detection only; file names never leave the machine.
function detectStack(cwd) {
    if (!cwd) return null;
    try {
        if (existsSync(join(cwd, 'artisan'))) return 'Laravel';
        if (existsSync(join(cwd, 'nuxt.config.ts')) || existsSync(join(cwd, 'nuxt.config.js'))) return 'Nuxt';
        if (existsSync(join(cwd, 'package.json'))) return 'Node';
        if (existsSync(join(cwd, 'go.mod'))) return 'Go';
        if (existsSync(join(cwd, 'Gemfile'))) return 'Ruby';
    } catch {
        // unreadable cwd, stack stays unknown
    }
    return null;
}

const event = process.argv[2];
// When invoked with "announce" (SessionStart, Notification) the hook runs
// synchronously and prints a short Lubby status line to the user via the
// hook's systemMessage. All other events stay async and silent.
const announce = process.argv.includes('announce') && ANNOUNCE_EVENTS.has(event);

if (!EVENTS.includes(event)) {
    process.exit(0);
}

// A single, terminal-friendly status line. Counts are aggregate presence the
// user already shares; no code, paths, or names are ever included.
function buildMessage(name, waiting) {
    const total = Number(waiting?.total ?? 0);
    const stacks = Array.isArray(waiting?.stacks) ? waiting.stacks : [];
    const stacksLine = stacks
        .map((s) => `${s.count} ${s.stack}`)
        .join(' · ');
    const devs = (n) => `${n} dev${n === 1 ? '' : 's'}`;

    if (name === 'started') {
        const around = total > 0 ? ` · ${devs(total)} around` : '';
        return `✻ Lubby connected — you're visible as waiting${around}. /lubby:status to see who's here.`;
    }

    // waiting_input: Claude paused, so this is the moment you're free to chat.
    let who = '';
    if (stacksLine) who = ` · ${stacksLine} waiting now`;
    else if (total > 0) who = ` · ${devs(total)} waiting now`;

    return `✻ Lubby — you're visible as waiting${who} → /lubby:status to join a 5-min room`;
}

// Previously-surfaced "say hi" ids, so each ping shows in the terminal once.
function readShownHiIds() {
    try {
        const cached = JSON.parse(readFileSync(presencePath, 'utf8'));
        return Array.isArray(cached?.shown_hi_ids) ? cached.shown_hi_ids : [];
    } catch {
        return []; // no cache yet
    }
}

// "👋 Ali said hi, start chat: <url>" — a bare URL is clickable in most
// terminals (Claude Code renders systemMessage as plain text, so no markup).
function buildHellos(hellos) {
    return hellos
        .filter((h) => h && h.from && h.url)
        .map((h) => `👋 ${h.from} said hi, start chat: ${h.url}`);
}

// A plugin cannot ship a `statusLine` (Claude Code only reads it from
// settings.json), so on SessionStart Lubby self-installs one: it refreshes the
// script next to the config (so it tracks plugin updates) and registers it in
// the user's settings.json. It only adds a status line when none exists, so it
// never clobbers one you configured yourself. Entirely best-effort.
function ensureStatusLine() {
    try {
        const root = process.env.CLAUDE_PLUGIN_ROOT;
        if (!root) return;

        const lubbyDir = dirname(configPath);
        const dest = join(lubbyDir, 'statusline.mjs');
        mkdirSync(lubbyDir, { recursive: true });
        copyFileSync(join(root, 'scripts', 'lubby-statusline.mjs'), dest);

        const settingsPath = join(homedir(), '.claude', 'settings.json');
        let settings = {};
        try {
            settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
        } catch {
            // no settings yet, we will create one
        }
        if (settings.statusLine) return; // respect a status line you already set

        settings.statusLine = {
            type: 'command',
            command: `node ${dest}`,
            refreshInterval: 10,
        };
        mkdirSync(dirname(settingsPath), { recursive: true });
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    } catch {
        // never break the session over status line setup
    }
}

let config;
try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch {
    process.exit(0); // not logged in, stay silent
}

// SessionStart is the natural moment to make sure the persistent status line is
// wired up. `announce` is only set on SessionStart and Notification, and only
// SessionStart carries the `started` event.
if (config.token && announce && event === 'started') {
    ensureStatusLine();
}

if (!config.token || config.paused) {
    process.exit(0);
}

if (event === 'heartbeat') {
    try {
        if (Date.now() - statSync(throttlePath).mtimeMs < HEARTBEAT_THROTTLE_MS) {
            process.exit(0);
        }
    } catch {
        // no throttle file yet, proceed
    }
}

const payload = await readStdin();
let cwd = null;
try {
    cwd = JSON.parse(payload).cwd ?? null;
} catch {
    // no or invalid payload, stack detection is skipped
}

try {
    const controller = new AbortController();
    // Keep the announce path snappy since those hooks run synchronously.
    setTimeout(() => controller.abort(), announce ? 3500 : 5000).unref();

    const response = await fetch(`${config.api_url.replace(/\/$/, '')}/agent-events`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            agent: 'claude_code',
            event,
            status: STATUS[event],
            project_stack: detectStack(cwd),
            visibility: config.share_level ?? 'presence_only',
            sanitized_context: null,
            metadata: { connector_version: VERSION, source: 'claude-plugin' },
        }),
    });

    if (event === 'heartbeat') {
        writeFileSync(throttlePath, '');
    }

    if (response.ok) {
        const body = await response.json();

        // "Say hi" pings from other people. Each one is shown in the terminal
        // once (deduped by id via the presence cache); the web app owns read
        // state, so surfacing a hi here never marks it read there.
        const hellos = Array.isArray(body?.hellos) ? body.hellos : [];
        const shownHiIds = readShownHiIds();
        const newHellos = hellos.filter(
            (h) => h && h.id != null && !shownHiIds.includes(h.id),
        );
        // Only the synchronous announce hooks print, so only those consume a hi.
        const printedHiIds = announce ? newHellos.map((h) => h.id) : [];

        // Cache the waiting snapshot so the persistent status line always has
        // fresh counts to show, with no network call of its own. Best-effort:
        // if this fails the status line just falls back to "visible as waiting".
        try {
            writeFileSync(
                presencePath,
                JSON.stringify({
                    status: STATUS[event],
                    waiting: body?.waiting ?? null,
                    // The version actually running here, so the status line can
                    // compare it against latest_version without keeping its own
                    // copy of the version (which used to drift and pin the line
                    // to a permanent "update available").
                    plugin_version: VERSION,
                    // Latest published version the server knows about, so the
                    // status line can flag when this plugin is out of date.
                    latest_version: body?.latest_plugin_version ?? null,
                    // Remember which his we surfaced so they never repeat.
                    shown_hi_ids: [...shownHiIds, ...printedHiIds].slice(-50),
                    updated_at: new Date().toISOString(),
                }) + '\n',
                { mode: 0o600 },
            );
        } catch {
            // ignore, presence cache is optional
        }

        // Surface a one-time line to the user for the synchronous announce hooks,
        // plus any new "say hi" pings with a clickable link to the room.
        if (announce) {
            const lines = [
                buildMessage(event, body?.waiting),
                ...buildHellos(newHellos),
            ];
            process.stdout.write(
                JSON.stringify({ systemMessage: lines.join('\n') }),
            );
        }
    }
} catch {
    // Network/server problems must never disturb the session.
}

process.exit(0);
