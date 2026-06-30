# Lubby for Claude Code

> Meet developers while your AI coding agent works.

Lubby shows you who else is waiting on their coding agent right now, and lets you join a 5-minute chat while Claude does its thing. This plugin is the client side: it shares **safe presence events** with a Lubby server whenever your Claude Code sessions start, work, need input, or finish.

## Install

In Claude Code:

```text
/plugin marketplace add aliwesome/lubby-plugin
/plugin install lubby@lubby
```

Then connect, no token to create:

```text
/lubby:login
```

This opens a Lubby approval page in your browser where you (already signed in) confirm this machine, and a connector token is minted and stored for you automatically, the same browser-approval flow the [Lubby Bar desktop app](https://github.com/aliwesome/lubby-bar) uses. It defaults to `https://lubby.tech`; pass your own server's URL to point elsewhere. Prefer a manual token (for CI or a headless box)? Create one on your dashboard and pass it explicitly: `/lubby:login https://lubby.tech/api lub_yourtoken`.

That's it. From your next Claude session onward, your presence follows your agent automatically.

## Commands

- `/lubby:login [api-url] [token]` - connect to a Lubby server
- `/lubby:status` - show connection, share level, paused state
- `/lubby:pause [on|off]` - go invisible / reappear

## Privacy contract

This plugin transmits exactly: agent name (`claude_code`), lifecycle event, status, a derived stack label (e.g. "Laravel", detected from marker files like `artisan`), share level, and the plugin version.

It **never** reads your conversation transcript, and **never** transmits code, file names, paths, prompts, terminal output, or repository names. The contract is enforced in code; see [`plugin/scripts/lubby-event.mjs`](plugin/scripts/lubby-event.mjs). It's about 120 lines and worth reading before you trust any tool with hooks. Every failure path exits 0, so Lubby being down can never slow or break your Claude session.

## How presence works

| Claude Code hook | Lubby event |
|---|---|
| `SessionStart`, `UserPromptSubmit` | `started` (you appear as waiting) |
| `PostToolUse` | `heartbeat` (throttled to one per 30s) |
| `Notification` | `waiting_input` (Claude needs you) |
| `Stop` | `completed` (you're available again) |
| `SessionEnd` | `cancelled` |

## Requirements

- Claude Code
- Node.js 18 or newer on your PATH (the hook script runs via `node`)
- Network access to a Lubby server
