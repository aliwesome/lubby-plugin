---
description: Show on the Lubby people map. Use when the user wants to share their location or appear on the Lubby map.
allowed-tools: ["Bash"]
---

# Lubby share location

Location on Lubby is enabled from the web dashboard, never from the plugin. By
design the plugin and connector never read, infer, or transmit your location:
the only thing that ever stores coordinates is an explicit click on the Lubby
map page, which uses your browser's geolocation with your consent. This skill
just hands you the link.

Render the map card:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby.mjs" map
```

The card prints the `/map` link for the configured server and the privacy note,
and shows "Not connected" with a `/lubby:login` hint when there is no config. Do
NOT reprint or reformat it. Add at most one short line, for example reminding the
user they can turn sharing off again on the same page at any time.
