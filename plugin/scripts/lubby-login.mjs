#!/usr/bin/env node
/**
 * Lubby device login. Runs OAuth 2.0 Device Authorization Grant (RFC 8628)
 * against a Lubby server so the user approves in their browser instead of
 * hand-creating a connector token, exactly like the Lubby Bar desktop app.
 *
 * Flow:
 *   1. POST {api}/agent/identity        -> { claim_token, user_code, verification_uri_complete, interval, expires_in }
 *   2. Open the approval page; user signs in and approves.
 *   3. Poll POST {api}/agent/identity/claim until a lub_ token is minted.
 *   4. Write the token into ~/.lubby/config.json (mode 600), merging any existing config.
 *
 * Usage: node lubby-login.mjs [api-url]
 *   api-url defaults to https://lubby.tech/api. A bare host is normalized to end with /api.
 *
 * Privacy: only a client name leaves this machine during login. Exits non-zero on failure
 * so the calling skill can fall back to manual token paste.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

const CLIENT_NAME = 'Claude Code (Lubby plugin)';

function normalizeApiUrl(raw) {
    let url = (raw || 'https://lubby.tech/api').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    if (!/\/api$/.test(url)) url = `${url}/api`;
    return url;
}

function openBrowser(url) {
    // Per-platform launcher, passing the URL as an explicit argv entry so no
    // shell quoting is involved. On Windows `start` is a cmd builtin, and its
    // first quoted argument is the window title, hence the empty string.
    const [cmd, args] =
        platform() === 'darwin'
            ? ['open', [url]]
            : platform() === 'win32'
              ? ['cmd', ['/c', 'start', '', url]]
              : ['xdg-open', [url]];
    try {
        const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
        child.on('error', () => {}); // missing launcher is fine; we printed the URL
        child.unref();
    } catch {
        // Printing the URL above is the reliable fallback.
    }
}

function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(1, seconds) * 1000));
}

async function start(api) {
    const res = await fetch(`${api}/agent/identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_name: CLIENT_NAME }),
    });
    if (res.status !== 201) {
        throw new Error(`Could not start login at ${api} (HTTP ${res.status}).`);
    }
    return res.json();
}

async function poll(api, claimToken, interval, expiresIn) {
    const deadline = Date.now() + expiresIn * 1000;
    let wait = interval;
    while (Date.now() < deadline) {
        await sleep(wait);
        const res = await fetch(`${api}/agent/identity/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ claim_token: claimToken }),
        });
        const body = await res.json().catch(() => ({}));
        switch (res.status) {
            case 200:
                if (body?.credential?.token) return body.credential.token;
                break;
            case 202:
                if (body?.interval) wait = body.interval; // honor server backoff
                continue;
            case 400:
                throw new Error(body?.status === 'denied' ? 'Approval was denied.' : 'The login request expired. Start again.');
            case 404:
                throw new Error('Login request not found. Start again.');
            case 410:
                throw new Error('This login was already claimed. Start again.');
            default:
                throw new Error(`Unexpected response while polling (HTTP ${res.status}).`);
        }
    }
    throw new Error('Timed out waiting for approval.');
}

function writeConfig(api, token) {
    const configPath = process.env.LUBBY_CONFIG ?? join(homedir(), '.lubby', 'config.json');
    let config = {};
    if (existsSync(configPath)) {
        try {
            config = JSON.parse(readFileSync(configPath, 'utf8'));
        } catch {
            config = {};
        }
    }
    config.api_url = api;
    config.token = token;
    config.share_level = config.share_level || 'presence_only';
    config.paused = false;
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    return configPath;
}

async function main() {
    const api = normalizeApiUrl(process.argv[2]);
    process.stderr.write(`Starting Lubby login against ${api}\n`);

    const session = await start(api);
    const url = session.verification_uri_complete || session.verification_uri;

    // The skill relays these to the user; auto-open is best-effort on top.
    process.stdout.write(`\nApprove this device in your browser:\n  ${url}\n`);
    if (session.user_code) process.stdout.write(`  Verification code: ${session.user_code}\n`);
    process.stdout.write('\nWaiting for approval...\n');
    if (url) openBrowser(url);

    const token = await poll(api, session.claim_token, session.interval || 5, session.expires_in || 600);
    const configPath = writeConfig(api, token);

    process.stdout.write(`\nConnected. Token saved to ${configPath}\n`);
}

main().catch((err) => {
    process.stderr.write(`Login failed: ${err.message}\n`);
    process.exit(1);
});
