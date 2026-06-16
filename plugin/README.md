# Lubby for Claude Code

Shares **safe presence events** with your Lubby server while Claude works, so you can meet other developers who are also waiting on their agents.

## Privacy contract

This plugin transmits exactly: agent name (`claude_code`), lifecycle event, status, a derived stack label (e.g. "Laravel", detected from marker files like `artisan`), share level, and the plugin version.

It never reads the conversation transcript, and never transmits code, file names, paths, prompts, terminal output, or repository names. See `scripts/lubby-event.mjs`: the contract is enforced in code, and the script always exits 0 so it can never disturb your session.

## Install

```bash
/plugin marketplace add aliwesome/lubby-plugin   # public distribution repo
/plugin install lubby@lubby
/lubby:login https://lubby.tech/api lub_yourtoken
```

Create the token on your Lubby dashboard.

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
status line right in Claude Code, for example:

```
✻ Lubby connected — you're visible as waiting · 32 devs around. /lubby:status to see who's here.
✻ Lubby — you're visible as waiting · 8 Laravel · 24 JavaScript waiting now → /lubby:status to join a 5-min room
```

The counts come from your Lubby server (aggregate presence only, the same data
you already share). If Lubby is unreachable or you are paused, the hook stays
silent and exits cleanly, so it never slows or disturbs Claude.
