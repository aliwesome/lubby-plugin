---
description: Check for and install a newer Lubby plugin version. Use when the status line shows "update available" or the user wants to update Lubby.
allowed-tools: ["Bash"]
---

# Lubby update

Check whether a newer Lubby plugin is published and, with the user's go-ahead, install it.

1. Read the cached presence snapshot to compare the installed version with the latest the server reported. The status line writes `latest_version` here after each agent event:

```bash
node -e '
const fs = require("fs"), p = process.env.HOME + "/.lubby/presence.json";
let s = {}; try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
console.log("latest_known:", s.latest_version || "unknown");
'
```

The installed version is in the plugin manifest (`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`, field `version`). If `latest_known` is unknown, the machine has not sent an event recently, so just go ahead and run the update; it is a no-op when already current.

2. If an update is available (or the version is unknown), tell the user the installed and latest versions and ask before changing anything. Once they confirm, update via the Claude Code CLI:

```bash
claude plugin update lubby
```

3. Tell the user the update applies to a new Claude Code session: they should restart Claude Code (or start a new session) for the new plugin to load. On the next `SessionStart`, Lubby refreshes the status line script automatically, so no manual steps are needed.

Never invent version numbers; only report what the snapshot and manifest actually contain.
