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
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VERSION = '0.1.0';
const EVENTS = ['started', 'heartbeat', 'waiting_input', 'completed', 'failed', 'cancelled'];
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

// Marker-file detection only — file names never leave the machine.
function detectStack(cwd) {
    if (!cwd) return null;
    try {
        if (existsSync(join(cwd, 'artisan'))) return 'Laravel';
        if (existsSync(join(cwd, 'nuxt.config.ts')) || existsSync(join(cwd, 'nuxt.config.js'))) return 'Nuxt';
        if (existsSync(join(cwd, 'package.json'))) return 'Node';
        if (existsSync(join(cwd, 'go.mod'))) return 'Go';
        if (existsSync(join(cwd, 'Gemfile'))) return 'Ruby';
    } catch {
        // unreadable cwd — fine, stack stays unknown
    }
    return null;
}

const event = process.argv[2];

if (!EVENTS.includes(event)) {
    process.exit(0);
}

let config;
try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch {
    process.exit(0); // not logged in — stay silent
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
        // no throttle file yet — proceed
    }
}

const payload = await readStdin();
let cwd = null;
try {
    cwd = JSON.parse(payload).cwd ?? null;
} catch {
    // no/invalid payload — stack detection is skipped
}

try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000).unref();

    await fetch(`${config.api_url.replace(/\/$/, '')}/agent-events`, {
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
} catch {
    // Network/server problems must never disturb the session.
}

process.exit(0);
