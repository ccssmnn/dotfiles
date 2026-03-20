# opencode

- `opencode.json` holds global opencode config.
- `plugins/` auto-loads local plugins.
- `package.json` provides plugin deps.

Env:

- `BRAVE_SEARCH_API_KEY` or `BRAVE_API_KEY` for `web_search`.
- `OPENAI_API_KEY` enables OpenAI TTS announcements.

TTS preferences live at the top of `agents/opencode/plugins/tts-announcements.ts` in `ttsPreferences`, including the OpenAI summary model.

Custom tools:

- `refresh_session_title` regenerates and applies a fresh session title.
