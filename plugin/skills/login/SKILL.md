---
description: Connect this machine to a Lubby server with a connector token. Use when the user wants to log in to Lubby or set up Lubby presence sharing.
argument-hint: "[api-url] [token]"
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Lubby login

Store the user's Lubby connector token in `~/.lubby/config.json`.

1. Parse `$ARGUMENTS`. It may contain an API URL (anything starting with `http`) and/or a token (starts with `lub_`).
2. If the token is missing, ask the user to paste one — they can create it on their Lubby dashboard (e.g. `http://localhost:8000/dashboard`). Never invent a token.
3. If the API URL is missing, ask which server to use, suggesting `http://localhost:8000/api` for local development. Ensure the URL ends with `/api`.
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

(If `CLAUDE_PLUGIN_ROOT` is not set in your shell, locate the script under `~/.claude/plugins/`.) Tell the user they will now appear as "waiting" on the dashboard whenever Claude is working, and that only presence is shared — never code, file names, or prompts.
