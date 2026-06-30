# Lubby for Claude Code

Shares **safe presence events** with your Lubby server while Claude works, so you can meet other developers who are also waiting on their agents.

## Privacy contract

This plugin transmits exactly: agent name (`claude_code`), lifecycle event, status, a derived stack label (e.g. "Laravel", detected from marker files like `artisan`), share level, and the plugin version.

It never reads the conversation transcript, and never transmits code, file names, paths, prompts, terminal output, or repository names. See `scripts/lubby-event.mjs`: the contract is enforced in code, and the script always exits 0 so it can never disturb your session.

## Install

```bash
/plugin marketplace add aliwesome/lubby-plugin   # public distribution repo
/plugin install lubby@lubby
/lubby:login                                     # approve in your browser, no token to create
```

`/lubby:login` opens a Lubby approval page where you (already signed in) confirm this
machine, and a connector token is minted and stored for you, the same browser-approval
flow the Lubby Bar desktop app uses. It defaults to `https://lubby.tech`; pass your own
server URL to point elsewhere. Prefer a manual token (CI, headless)? Pass one explicitly:
`/lubby:login https://lubby.tech/api lub_yourtoken`.

## Commands

- `/lubby:login [api-url] [token]` - connect to a Lubby server
- `/lubby:status` - show connection, share level, paused state
- `/lubby:pause [on|off]` - go invisible / reappear

## How presence works

| Claude Code hook | Lubby event | Shows a line? |
|---|---|---|
| `SessionStart` | `started` (you appear as waiting) | yes, once |
| `UserPromptSubmit` | `started` | no |
| `PostToolUse` | `heartbeat` (throttled to one per 30s) | no |
| `Notification` | `waiting_input` (Claude needs you) | yes |
| `Stop` | `completed` (you're available again) | no |
| `SessionEnd` | `cancelled` | no |

Most hooks run async and silent. The two "announce" hooks (`SessionStart` and
`Notification`) run synchronously with a short timeout and print a single Lubby
message right in Claude Code, for example:

```
✻ Lubby connected — you're visible as waiting · 32 devs around. /lubby:status to see who's here.
✻ Lubby — you're visible as waiting · 8 Laravel · 24 JavaScript waiting now → /lubby:status to join a 5-min room
```

The counts come from your Lubby server (aggregate presence only, the same data
you already share). If Lubby is unreachable or you are paused, the hook stays
silent and exits cleanly, so it never slows or disturbs Claude.

## Persistent status line

Those hook messages flash once and then clear. For a Lubby line that stays in
your status bar the whole session, the plugin ships a status line script.

A plugin cannot register a `statusLine` itself (Claude Code only reads it from
settings.json), so Lubby self-installs one on `SessionStart`: it refreshes
`~/.lubby/statusline.mjs` from the plugin and, if you do not already have a
status line, adds this to `~/.claude/settings.json`. It never overwrites a
status line you configured yourself. (`/lubby:login` does the same setup, so you
can wire it up the moment you log in.)

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.lubby/statusline.mjs",
    "refreshInterval": 10
  }
}
```

It then reads a local presence snapshot the event hook caches after each server
reply, so it renders instantly and never makes a network call of its own:

```
✻ Lubby · visible · 8 Laravel · 24 JavaScript waiting
```

When you are paused it shows `✻ Lubby paused`, and when you are not logged in it
prints nothing.
