---
description: Connect this machine to a Lubby server by approving in your browser, no token needed. Use when the user wants to log in to Lubby or set up Lubby presence sharing.
argument-hint: "[api-url] [token]"
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Lubby login

Connect this machine to Lubby and store the resulting token in `~/.lubby/config.json`.

The preferred path is **browser approval** (no hand-made token): the helper opens a Lubby page where the user, already signed in, approves this device and a token is minted automatically, exactly like the Lubby Bar desktop app.

1. Parse `$ARGUMENTS`. It may contain an API URL (anything starting with `http`) and/or a token (starts with `lub_`).
   - If it **already contains a `lub_` token**, the user supplied one explicitly, skip to step 4 (manual path).
   - Otherwise resolve the API URL: use the one given, else `https://lubby.tech/api` (use `http://localhost:8000/api` for local development). You do not need to ask, the helper defaults to `https://lubby.tech/api` and normalizes a bare host.

2. **Browser approval (default).** Run the device-login helper. It prints an approval URL and a code, opens the browser, and blocks until the user approves, then writes the config itself:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby-login.mjs" "<API_URL_OR_BLANK>"
```

   Relay the printed approval URL and code to the user and tell them to approve in the browser. The command exits 0 once the token is saved. If it exits non-zero (e.g. no browser, offline, or the user prefers a token), fall through to the manual path below.

3. On success, skip to step 5 (verify). Do not also run the manual write.

4. **Manual fallback (only if step 2 failed or a `lub_` token was passed).** Ask the user to paste a token from their dashboard (`https://lubby.tech/dashboard`, or their own server); never invent one. Ensure the API URL ends with `/api`. Write the config (mode 600, merging with any existing file):

```bash
mkdir -p ~/.lubby
node -e '
const fs = require("fs"), p = process.env.HOME + "/.lubby/config.json";
let c = {}; try { c = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
c.api_url = process.argv[1]; c.token = process.argv[2];
c.share_level = c.share_level || "presence_only"; c.paused = false;
fs.writeFileSync(p, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
console.log("Lubby config written to " + p);
' "<API_URL>" "<TOKEN>"
```

5. Verify by sending a test event and confirming the server replies `{"ok":true,...}`:

```bash
echo '{}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby-event.mjs" heartbeat && echo "ok"
```

(If `CLAUDE_PLUGIN_ROOT` is not set in your shell, locate the script under `~/.claude/plugins/`.)

6. Install the persistent status line. A plugin cannot register a `statusLine`, so copy the script next to the config and add a `statusLine` block to `~/.claude/settings.json`. This is what keeps a Lubby line visible the whole session (the hooks only flash a one-time message). If the user already has a `statusLine` configured, show them the snippet below and ask before replacing it.

```bash
cp "${CLAUDE_PLUGIN_ROOT}/scripts/lubby-statusline.mjs" ~/.lubby/statusline.mjs
node -e '
const fs = require("fs"), p = process.env.HOME + "/.claude/settings.json";
let s = {}; try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
s.statusLine = { type: "command", command: "node ~/.lubby/statusline.mjs", refreshInterval: 10 };
fs.mkdirSync(require("path").dirname(p), { recursive: true });
fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
console.log("Lubby status line registered in " + p);
'
```

7. Finish on the status card so the whole flow ends clean (do NOT reprint or reformat it):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby.mjs" status
```

Then tell the user, in one or two short lines, that they will now appear as "waiting" on the dashboard whenever Claude is working, that a Lubby line stays in their status bar for the whole session, and that only presence is shared, never code, file names, or prompts.
