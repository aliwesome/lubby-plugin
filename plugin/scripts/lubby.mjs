#!/usr/bin/env node
/**
 * Lubby command renderer. Skills call this to print a consistent, branded card
 * instead of letting the model improvise prose, so every command looks the same.
 *
 * Usage: node lubby.mjs <status|version|map>
 *
 * Reads only local files (config + presence snapshot) and the plugin manifest.
 * Never hits the network. Exits 0 on success.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as tui from './lubby-tui.mjs';

const HOME = homedir();
const configPath = join(HOME, '.lubby', 'config.json');
const presencePath = join(HOME, '.lubby', 'presence.json');

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

// Single source of truth for the running version: the manifest the plugin shipped
// with. Falls back to whatever the running plugin last recorded in the snapshot.
function installedVersion() {
    const root = process.env.CLAUDE_PLUGIN_ROOT;
    if (root) {
        const manifest = readJson(join(root, '.claude-plugin', 'plugin.json'));
        if (manifest?.version) return String(manifest.version);
    }
    return readJson(presencePath)?.plugin_version || null;
}

// Dotted numeric compare: is a strictly older than b? Unknown sides are never
// "older", so a missing version never produces a false update nag.
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

function notConnected(title) {
    tui.render([
        tui.header(title),
        tui.rule(),
        tui.hint('Not connected. Run /lubby:login to get started.'),
        '',
    ]);
}

function cmdStatus() {
    const config = readJson(configPath);
    if (!config) return notConnected('status');

    const server = config.api_url || 'https://lubby.tech/api';
    const token = config.token ? `${tui.green('yes')}   ${tui.dim(String(config.token).slice(0, 8) + '…')}` : tui.gold('no');
    const sharing = config.paused ? tui.gold('paused') : tui.green('on');
    const level = config.share_level || 'presence_only';
    const levelNote = level === 'presence_only' ? 'presence only, never code' : '';
    const installed = installedVersion();
    const latest = readJson(presencePath)?.latest_version || null;
    const version = installed
        ? `${installed}   ${isOlder(installed, latest) ? tui.gold(`→ ${latest} available`) : tui.dim('up to date')}`
        : tui.dim('unknown');

    tui.render([
        tui.header('status'),
        tui.rule(),
        tui.row('Server', server),
        tui.row('Logged in', token),
        tui.row('Sharing', sharing),
        tui.row('Share level', level, levelNote),
        tui.row('Version', version),
        '',
    ]);
}

function cmdVersion() {
    const installed = installedVersion();
    const latest = readJson(presencePath)?.latest_version || null;
    const behind = isOlder(installed, latest);

    tui.render([
        tui.header('update'),
        tui.rule(),
        tui.row('Installed', installed || tui.dim('unknown')),
        tui.row('Latest', latest || tui.dim('unknown')),
        '',
        behind
            ? tui.hint(`Update available. Run ${tui.gold('claude plugin update lubby')}${tui.DIM}, then restart Claude Code.`)
            : tui.hint('You are on the latest known version.'),
        '',
    ]);
}

function cmdMap() {
    const config = readJson(configPath);
    if (!config) return notConnected('share location');

    const web = (config.api_url || 'https://lubby.tech/api')
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '') || 'https://lubby.tech';

    tui.render([
        tui.header('share location'),
        tui.rule(),
        tui.row('Map', tui.gold(`${web}/map`)),
        '',
        tui.hint('Open the link and use the “share location” control there.'),
        tui.hint('Your location never passes through the plugin or terminal.'),
        '',
    ]);
}

const commands = { status: cmdStatus, version: cmdVersion, map: cmdMap };
const run = commands[process.argv[2]];
if (!run) {
    process.stderr.write(`unknown command: ${process.argv[2] || '(none)'}\n`);
    process.exit(1);
}
run();
