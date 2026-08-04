# @pipeworx/libretranslate

LibreTranslate MCP — thin abstraction over any LibreTranslate-compatible instance.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `translate(text, target, source?, format?)`
- `detect_language(text)`
- `list_languages()`

## Auth / endpoint

LibreTranslate's free public instances have largely shut down or migrated to paid.
You must provide an instance:

- **Self-host:** https://github.com/LibreTranslate/LibreTranslate
- **Paid:** https://libretranslate.com (BYO their API key)
- **Community instance** that's still up

Configure via:
- **Platform:** gateway env vars `PLATFORM_LIBRETRANSLATE_ENDPOINT` (URL) and optionally `PLATFORM_LIBRETRANSLATE_KEY`.
- **BYO:** pass `?_endpoint=https://your-instance/&_apiKey=...` on the gateway URL.

## Data shape

Standard LibreTranslate v1 API — see [the spec](https://github.com/LibreTranslate/LibreTranslate#api).

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "libretranslate": {
      "url": "https://gateway.pipeworx.io/libretranslate/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Libretranslate data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
