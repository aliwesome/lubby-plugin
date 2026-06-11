---
description: Show the current Lubby connection status — server, login state, share level, and whether presence sharing is paused.
allowed-tools: ["Bash"]
---

# Lubby status

Read `~/.lubby/config.json` and report to the user:

```bash
cat ~/.lubby/config.json 2>/dev/null || echo "not configured"
```

Report concisely:
- **Server**: the `api_url` value
- **Logged in**: yes if `token` is set (show only the first 8 characters, e.g. `lub_AB12…`), no otherwise
- **Share level**: `share_level` (explain: `presence_only` means only "waiting + agent + stack" is shared — never code, files, or prompts)
- **Paused**: the `paused` flag

If not configured, suggest `/lubby:login`.
