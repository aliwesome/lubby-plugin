---
description: Show the current Lubby connection status, including server, login state, share level, and whether presence sharing is paused.
allowed-tools: ["Bash"]
---

# Lubby status

Run the status renderer and let its output stand on its own:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby.mjs" status
```

The command prints the user-facing status card (server, login state, share
level, sharing on/paused, version). Do NOT reprint, reformat, or summarise it,
the card is the answer. Add at most one short follow-up line if something needs
action (for example, suggest `/lubby:login` when it shows "Not connected").
