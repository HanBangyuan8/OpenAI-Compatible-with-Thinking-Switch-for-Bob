# Changelog

## v1.0.1 - 2026-05-29

Patch release.

- Added optional streaming responses for OpenAI-compatible Chat Completions APIs.
- Kept streaming disabled by default for compatibility with existing v1.0.0 configurations.
- Added automatic fallback to non-streaming mode when Bob's streaming callback is unavailable.

## v1.0.0 - 2026-05-28

Initial public release.

- OpenAI-compatible Chat Completions translation for Bob.
- Custom Base URL, model, auth header, max token parameter, system prompt, and Extra Body JSON.
- Optional `thinking` control for compatible providers.
- Bob appcast metadata and GitHub Release packaging.
