# Changelog

All notable changes to the Lubby Claude Code plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[unreleased]: https://github.com/aliwesome/lubby-plugin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aliwesome/lubby-plugin/releases/tag/v0.1.0
