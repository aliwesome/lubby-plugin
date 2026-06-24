---
description: Check for and install a newer Lubby plugin version. Use when the status line shows "update available" or the user wants to update Lubby.
allowed-tools: ["Bash"]
---

# Lubby update

Check whether a newer Lubby plugin is published and, with the user's go-ahead, install it.

1. Render the version card. It compares the installed manifest version against
   the latest the server last reported (cached in the presence snapshot):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lubby.mjs" version
```

   The card is the user-facing output, do NOT reprint or reformat it. Note that
   the "Latest" line can lag if this machine has not sent an event recently, so
   even when it does not show an update, an update may still be published.

2. If the card shows an update is available (or you want to be sure despite a
   lagging "Latest"), ask the user before changing anything. Once they confirm,
   refresh the marketplace cache so the newest published version is visible, then
   update. The plugin is installed as `lubby@lubby` (plugin@marketplace); the
   bare name `lubby` can resolve to "not found", so always use the qualified one:

```bash
claude plugin marketplace update lubby && claude plugin update lubby@lubby
```

3. Tell the user the update applies to a new Claude Code session: they should
   restart Claude Code (or start a new session) for the new plugin to load. On
   the next `SessionStart`, Lubby refreshes the status line script automatically,
   so no manual steps are needed.

Never invent version numbers; only report what the card actually shows.
