# Lingyue Tools

Lingyue Tools is a Cloudflare Worker based tool site. It is structured as a hub that can host many small tools; the first tool extracts direct magnet links from RSS feeds and formats them one per line for copy/paste.

## Current Tool

- `rss-magnet`: fetches one or more RSS/Atom URLs.
- Extracts `magnet:?xt=urn:btih:` links from feed content.
- Deduplicates results by BTIH hash.
- Returns structured details plus plain text output.
- Supports AI preset filtering for language, quality, subtitles, codec, and retention strategy; container format is read directly when it is explicit in the filename, magnet `dn`, or title.

## AI Filtering

The RSS tool can call DeepSeek's OpenAI-compatible Chat Completion API to select the best releases from many RSS entries. Users choose fixed presets in the UI instead of writing free-form prompts.

- Provider: DeepSeek.
- Endpoint: `POST /chat/completions` under `DEEPSEEK_BASE_URL`.
- Default model: `deepseek-v4-flash`.
- Output mode: JSON object with selected candidate hashes only.
- Secret: `DEEPSEEK_API_KEY` in Cloudflare Workers secrets.
- Optional browser session key: if the Worker secret is not configured, the UI can use a temporary key stored only in the current browser session and send it with the AI request.
- Workflow: parse the RSS feed first; DeepSeek then identifies the concrete preset options visible in the current RSS results, and the UI enables AI filtering with those RSS-specific choices.
- Rule boundary: directly readable container format such as `.mkv`, `.mp4`, `[MKV]`, or `[MP4]` is extracted locally; language, quality, subtitle, and codec are judged by AI without local keyword matching.
- Selection flow: DeepSeek first receives the full candidate list to create an episode overview. The Worker then sends each episode group to DeepSeek separately, so `best_per_episode` choices are made per episode instead of in one large cross-episode response.
- Duplicate guard: for `best_per_episode`, the Worker will not pass through more than one selected hash from the same AI episode group.

APIs:

- `GET /api/ai/status`
- `GET /api/ai/presets`
- `POST /api/rss/ai-select`

## Account System

The first account system is implemented for Cloudflare Workers + D1:

- Storage: Cloudflare D1.
- Tables: `account_users`, `account_sessions`.
- Passwords: PBKDF2-SHA256, 10000 iterations, per-user salt.
- Sessions: random session token in an `HttpOnly`, `SameSite=Lax` cookie; only the SHA-256 token hash is stored in D1.
- APIs:
  - `GET /api/account/session`
  - `POST /api/account/register`
  - `POST /api/account/login`
  - `POST /api/account/logout`

The UI has a top-level account entry and a login/register dialog. Tool-specific saved state is intentionally not added yet; future tools can attach user-owned tables through the D1 `account_users.id` key.

## Worker APIs

- `GET /`: tool site shell.
- `GET /tools/rss-magnet`: RSS magnet tool route.
- `GET /api/tools`: tool registry.
- `POST /api/rss/extract`: RSS magnet extraction.

Example:

```bash
curl -sS -X POST https://lingyuetools.org/api/rss/extract \
  -H 'Content-Type: application/json' \
  --data '{"feeds":["https://example.com/feed.xml"]}'
```

## Development

```bash
npm install
npm test
npx wrangler dev
```

For local AI testing, create `.dev.vars` with:

```bash
DEEPSEEK_API_KEY=sk-...
```

Python local app tests are still present for the original local prototype:

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest -q
```

## Deployment

The production Worker is configured by `wrangler.toml`.

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler d1 migrations apply lingyuetools-db --remote
npx wrangler deploy
```
