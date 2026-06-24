# Changelog

All notable changes to the Lubby Claude Code plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.5] - 2026-06-24

### Fixed

- "Update available" no longer sticks after updating. The status line kept its
  own copy of the version, which was left at `0.3.3` in the `0.3.4` release, so
  it always read as behind the server's advertised version. The version now has
  a single source: the event hook reads it from `plugin.json`, records it in the
  presence snapshot, and the status line compares that recorded version against
  the latest, so it can no longer drift.

## [0.3.3] - 2026-06-16

### Added

- "Update available" hint on the status line. The `/api/agent-events` response
  now carries the latest published plugin version; the event hook caches it and
  the status line compares it against its own version, showing a dim
  `· update available (/lubby:update)` when this build is behind.
- `/lubby:update` skill. Reports the installed versus latest version and, with
  the user's confirmation, runs `claude plugin update lubby`.
- `/lubby:share-location` skill. Hands the user their Lubby map link so they can
  enable location from the dashboard. The plugin still never reads, infers, or
  transmits location: only an explicit, consented click on the map page (using
  the browser's geolocation) ever stores coordinates.

## [0.3.2] - 2026-06-16

### Changed

- The status line now reflects the live agent status instead of always reading
  "visible as waiting". It maps the cached status to a short label (running ->
  "waiting on Claude", waiting_input -> "Claude needs you", and finished /
  failed / stopped for the terminal events), falling back to "visible as
  waiting" when there is no fresh snapshot.
- The star is now an animated spinner while Claude is working. The frame is
  picked from the clock, so it advances each time Claude Code re-renders the
  line; non-working states hold a steady star.
- The "Lubby" label is now a clickable OSC 8 hyperlink to the web app, derived
  from the configured `api_url` (its trailing `/api` stripped). Terminals
  without OSC 8 support just render the plain word.

## [0.3.1] - 2026-06-16

### Fixed

- Hooks failed to load on Claude Code 2.1.x with "Duplicate hooks file
  detected". Recent Claude Code versions load the standard `hooks/hooks.json`
  automatically, so the `hooks` key in `plugin.json` double-loaded it. Removed
  the redundant manifest reference; the standard hooks file still loads on its
  own.

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

[unreleased]: https://github.com/aliwesome/lubby-plugin/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/aliwesome/lubby-plugin/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/aliwesome/lubby-plugin/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aliwesome/lubby-plugin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aliwesome/lubby-plugin/releases/tag/v0.1.0
