---
description: Connect this machine to a Lubby server with a connector token. Use when the user wants to log in to Lubby or set up Lubby presence sharing.
argument-hint: "[api-url] [token]"
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Lubby login

Store the user's Lubby connector token in `~/.lubby/config.json`.

1. Parse `$ARGUMENTS`. It may contain an API URL (anything starting with `http`) and/or a token (starts with `lub_`).
2. If the token is missing, ask the user to paste one; they can create it on their Lubby dashboard (`https://lubby.tech/dashboard`, or your own server). Never invent a token.
3. If the API URL is missing, ask which server to use, suggesting `https://lubby.tech/api` (use `http://localhost:8000/api` for local development). Ensure the URL ends with `/api`.
4. Write the config (mode 600, merging with any existing file):

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

Tell the user they will now appear as "waiting" on the dashboard whenever Claude is working, that a Lubby line stays in their status bar for the whole session, and that only presence is shared, never code, file names, or prompts.
