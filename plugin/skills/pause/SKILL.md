---
description: Pause or resume Lubby presence sharing. Use when the user wants to go invisible on Lubby or turn sharing back on.
argument-hint: "[on|off]"
allowed-tools: ["Bash"]
---

# Lubby pause

Toggle the `paused` flag in `~/.lubby/config.json`. While paused, the hook script sends nothing at all.

- `$ARGUMENTS` = `on` (or empty): pause sharing (`paused: true`)
- `$ARGUMENTS` = `off`: resume sharing (`paused: false`)

```bash
node -e '
const fs = require("fs"), p = process.env.HOME + "/.lubby/config.json";
let c = {}; try { c = JSON.parse(fs.readFileSync(p, "utf8")); } catch { console.log("not configured, run /lubby:login"); process.exit(0); }
c.paused = process.argv[1] !== "off";
fs.writeFileSync(p, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
console.log(c.paused ? "Lubby presence paused" : "Lubby presence resumed");
' "$ARGUMENTS"
```

When pausing, also clear the user's current presence so they disappear from the dashboard immediately. Send a `cancelled` event *before* flipping the flag:

```bash
echo '{}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby-event.mjs" cancelled
```

(Run the `cancelled` event first, then write `paused: true`.) Confirm the final state to the user.
