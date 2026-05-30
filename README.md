# OpenAI Compatible with Thinking Switch for Bob

![macOS](https://img.shields.io/badge/macOS-10.15%2B-blue?style=flat)
![JavaScript](https://img.shields.io/badge/JavaScript-ES5%2B-147EFB?style=flat)
![Bob](https://img.shields.io/badge/Bob-1.14%2B-orange?style=flat)
![GitHub release](https://img.shields.io/github/v/release/HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob?style=flat)
![GitHub Downloads](https://img.shields.io/github/downloads/HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob/total?style=flat)
![GitHub Repo stars](https://img.shields.io/github/stars/HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob?style=flat)

A Bob translation plugin for OpenAI-compatible Chat Completions APIs with optional `thinking` control.

<p align="center">
  <a href="https://bobtranslate.com">
    <img src="https://cdn.ripperhe.com/oss/master/2019/1222/bob-logo.png" alt="Bob" width="96">
  </a>
  <br>
  <sub>Built for Bob</sub>
</p>

## Features

- OpenAI-compatible `/v1/chat/completions` translation
- Custom Base URL and model
- Configurable auth header: `Authorization: Bearer`, raw `Authorization`, `api-key`, `x-api-key`, or custom header name
- Optional `thinking` field: do not send, disabled, or enabled
- Optional streaming responses with automatic fallback to non-streaming mode
- Configurable output token parameter: `max_completion_tokens`, `max_tokens`, both, or omitted
- Custom system prompt
- Extra Body JSON for provider-specific request fields
- Bob appcast update metadata

## Requirements

### Latest Version

- Bob 1.14.0+
- An OpenAI-compatible Chat Completions API endpoint
- API key for the selected provider

## Configuration

Typical OpenAI-compatible settings:

```text
API Key: your API key
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
Auth Header: Authorization: Bearer
Thinking: Do not send
Streaming: Off
Max Tokens Param: max_completion_tokens
Temperature: 0.2
Top P: 0.95
Extra Body JSON: {}
```

For providers that require non-standard fields, use `Extra Body JSON`.

## Build

No Node.js or browser runtime is required. Bob plugins run in Bob's JavaScriptCore-based plugin environment.

```bash
node --check src/main.js
python3 -m json.tool src/info.json
```

## Package

```bash
./scripts/package-plugin.sh
open dist/openai-compatible-translate-1.0.1.bobplugin
```

## Release

Download v1.0.0 and newer plugin packages from [GitHub Releases](https://github.com/HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob/releases).

Release notes are maintained in `CHANGELOG.md`.

## Bob Plugin Community

This repository includes Bob-specific publication metadata:

- `appcast.json` is stored in the repository root for Bob update checking and third-party plugin list discovery.
- The GitHub repository uses the `bobplugin` topic.
- Each release uploads the `.bobplugin` package as a GitHub Release asset.

## License

MIT License. See [LICENSE](LICENSE).

## Star History

<a href="https://www.star-history.com/?type=date&repos=HanBangyuan8%2FOpenAI-Compatible-with-Thinking-Switch-for-Bob">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=HanBangyuan8/OpenAI-Compatible-with-Thinking-Switch-for-Bob&type=date&legend=top-left" />
 </picture>
</a>
