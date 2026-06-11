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

| Claude Code hook | Lubby event |
|---|---|
| `SessionStart`, `UserPromptSubmit` | `started` (you appear as waiting) |
| `PostToolUse` | `heartbeat` (throttled to one per 30s) |
| `Notification` | `waiting_input` (Claude needs you) |
| `Stop` | `completed` (you're available again) |
| `SessionEnd` | `cancelled` |

All hooks run async with a 10s timeout and fail silent, so Lubby being down never slows Claude.
