# pi extensions

## included

- `web-fetch.ts` → `web_fetch` tool for lightweight doc-page retrieval (Readability-first, fallback extractor, optional link extraction)
- `brave-search.ts` → `web_search` tool backed by Brave Search API

## install deps

```bash
cd ~/Projects/dotfiles/agents/pi/extensions
npm install
```

## env vars

```bash
export BRAVE_SEARCH_API_KEY="..."
# or BRAVE_API_KEY
```

## load once

```bash
pi -e ~/Projects/dotfiles/agents/pi/extensions/web-fetch.ts -e ~/Projects/dotfiles/agents/pi/extensions/brave-search.ts
```

## auto-load (recommended)

Use `~/.pi/agent/extensions` symlink (from your `install.sh`) or list explicit paths in pi settings:

```json
{
  "extensions": [
    "~/Projects/dotfiles/agents/pi/extensions/web-fetch.ts",
    "~/Projects/dotfiles/agents/pi/extensions/brave-search.ts"
  ]
}
```
