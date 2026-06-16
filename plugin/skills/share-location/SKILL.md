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

1. Resolve the map URL from the configured server (the `api_url` without its
   trailing `/api`):

```bash
node -e '
const fs = require("fs"), p = process.env.HOME + "/.lubby/config.json";
let c = {}; try { c = JSON.parse(fs.readFileSync(p, "utf8")); } catch { console.log("not configured, run /lubby:login"); process.exit(0); }
const web = (c.api_url || "https://lubby.tech/api").replace(/\/api\/?$/, "").replace(/\/$/, "") || "https://lubby.tech";
console.log(web + "/map");
'
```

2. Give the user the printed `/map` link and tell them to open it and use the
   "share location" control there to appear on the map, and that they can turn
   sharing off again on the same page at any time. Reassure them that nothing
   about their location passes through the plugin or their terminal; it stays
   between their browser and the dashboard.

If the config is missing, suggest `/lubby:login` first.
