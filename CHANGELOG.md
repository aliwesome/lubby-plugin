# Changelog

All notable changes to the Lubby Claude Code plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-06-16

### Added

- A real, persistent status line (`scripts/lubby-statusline.mjs`). The 0.2.0
  "status line" was a one-time `systemMessage` from the `SessionStart` and
  `Notification` hooks, so it showed once and then disappeared. Claude Code
  re-renders a real `statusLine` continuously, so the Lubby line now stays
  visible for the whole session, for example `✻ Lubby · visible · 8 Laravel ·
  24 JavaScript waiting`. It reads a local presence snapshot and never hits the
  network, so it is instant. Because plugins cannot register a `statusLine`
  themselves, Lubby self-installs one on `SessionStart`: it refreshes
  `~/.lubby/statusline.mjs` from the plugin and adds the `statusLine` block to
  `~/.claude/settings.json` when you do not already have one (it never
  overwrites a status line you configured yourself). The `/lubby:login` skill
  does the same setup.

### Changed

- The event hook now caches each server reply's waiting snapshot to
  `~/.lubby/presence.json` (on every event, not just the announce hooks) so the
  status line always has fresh counts.

## [0.2.0] - 2026-06-16

### Added

- A Lubby status line in the Claude Code session. The `SessionStart` and
  `Notification` hooks now run synchronously and print a single line via the
  hook's `systemMessage`, for example `✻ Lubby — you're visible as waiting · 8
  Laravel · 24 JavaScript waiting now → /lubby:status to join a 5-min room`. The
  counts come from the server's `/agent-events` response (aggregate presence
  only). If Lubby is unreachable or you are paused, the hook stays silent and
  exits cleanly, so it never slows Claude.

### Changed

- Docs and the `/lubby:login` skill now default to the production server at
  `https://lubby.tech`, with `http://localhost:8000` kept as the local
  development option.

## [0.1.0] - 2026-06-11

### Added

- Initial release of the Lubby plugin and its marketplace manifest.
- Presence sharing via Claude Code hooks: working, heartbeat, waiting for
  input, completed, and session-end events sent to a Lubby server. Never
  transmits code, file names, or prompts.
- `/lubby:login` skill to store a connector token and API URL in
  `~/.lubby/config.json`.
- `/lubby:pause` skill to pause and resume presence sharing.
- `/lubby:status` skill to inspect the current connection and sharing state.

[unreleased]: https://github.com/aliwesome/lubby-plugin/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/aliwesome/lubby-plugin/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aliwesome/lubby-plugin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aliwesome/lubby-plugin/releases/tag/v0.1.0
