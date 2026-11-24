# worker

The site's backend: a small Cloudflare Worker (TypeScript). The site works without it, and the terminal prints the real error when it can't be reached.

## Endpoints
| Route | Description |
|---|---|
| `GET /health` | `{"ok":true,"region":"IAD"}`. `region` is the Cloudflare data center that served the request. |
| `GET /api/status` | Version, runtime, edge region, time, and a running request count kept in a Durable Object. |
| `POST /api/views` | Records one page view and returns `{"total":N,"week":N}` (`week` = last 7 days incl. today). |
| `GET /api/views` | Same counts, without recording. |

| `POST /api/chat` | Resume chatbot. Body `{"messages":[{"role":"user"|"assistant","content":"..."}]}` (1 to 12 messages, last is `user`, user text up to 500 chars). Streams Workers AI's SSE (`data: {"response":"..."}` ... `data: [DONE]`; purely numeric tokens arrive as JSON numbers, so clients must accept both). The model may call read-only GitHub tools (`list_github_repos`, `get_repo_readme`, `get_repo_recent_commits`, fixed to `GITHUB_USER`, default `nathan815`; optional `GITHUB_TOKEN` secret raises GitHub's 60/hour limit) for up to 2 non-streaming rounds before the final answer. Contact questions end with a `[[contact]]` marker that the site turns into a button. Errors are `{"error","message","retryAfter?","scope?"}`: 400 `invalid_request`, 429 `rate_limited`, 503 `unavailable`. |

The terminal's `status` and `ping` commands call these.

## Develop
```sh
cd worker
npm install
npm test            # unit tests, plain Node
npm run typecheck
npm run dev         # runs the real Workers runtime locally on :8787
```
Build the site against it with `PUBLIC_API_URL=http://127.0.0.1:8787 npm run build` from the repo root. `localhost:4321` is already in the CORS allowlist.

## Deploy
Deploys run from CI: `.github/workflows/deploy-worker.yml` runs on every push to `master` that touches `worker/**` (and via **Actions > Deploy worker > Run workflow**). It runs `npm ci`, `npm run typecheck`, `npm test`, `npm run deploy`, then `wrangler d1 migrations apply nathancj-chat --remote --force`, which applies only new files in `migrations/`. It never runs on pull requests.

Required repository secrets (Settings > Secrets and variables > Actions):
- `CLOUDFLARE_API_TOKEN`: an API token with **Workers Scripts: Edit**, **D1: Edit** and **Account Settings: Read** (account level). Workers AI, Durable Objects and cron triggers are configured through the Worker script itself. Not verified against current Cloudflare docs (checked only from memory); if a deploy fails with an authentication error, the missing permission is named in the wrangler output.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account id.

The D1 `database_id` is pinned in `wrangler.toml` so CI never tries to create a database.

Manual fallback:
```sh
cd worker
npx wrangler login
npm run deploy      # also stamps the git short SHA as the version
npm run db:migrate  # apply new D1 migrations
```
Wrangler prints a `https://nathancj-api.<your-subdomain>.workers.dev` address. Set it as `PUBLIC_API_URL` in Netlify and redeploy the site.

- **CORS:** only the origins in `ALLOWED_ORIGINS` (`wrangler.toml`) may call it from a browser. Others get a 403.
- **Chat rate limiting:** `/api/chat` is limited in code by a `RateLimiter` Durable Object, using fixed windows aligned to UTC. Per client IP (`CF-Connecting-IP`): `CHAT_PER_MINUTE` (5) and `CHAT_PER_DAY` (30). Across all visitors: `CHAT_GLOBAL_PER_DAY` (120), which protects the Workers AI free quota (about 10,000 neurons a day, reset at 00:00 UTC). Over a limit it returns 429 with `Retry-After`. Counters are wiped by an alarm at the end of each UTC day, and IPs are never logged. If the limiter or AI binding is missing or fails, chat returns 503 rather than running unlimited. The other endpoints have no limit; a Cloudflare dashboard rule can cap them.
- **Chat config (`wrangler.toml` vars):** `CHAT_MODEL` (default `@cf/meta/llama-3.1-8b-instruct-fp8-fast`; check the id and pricing against the current Workers AI docs), `CHAT_PER_MINUTE`, `CHAT_PER_DAY`, `CHAT_GLOBAL_PER_DAY`.
- **Workers AI in dev:** the `[ai]` binding always calls the real service, even under `wrangler dev`. It needs `npx wrangler login`, and local testing counts toward the free quota.
- **Resume context:** the model answers from `src/context.generated.ts`, generated from `../src/data/site.ts` by `npm run context` (run automatically by `npm run deploy`). Commit the regenerated file after editing site data. The system prompt is in `src/prompt.ts`.
- **Not verified:** none of the chat path has run against real Cloudflare (Durable Object limiter, Workers AI binding, model id, the streamed response shape, alarms). Tests use fakes under plain Node.
- **Custom domain:** a `workers.dev` address needs no DNS changes. A custom hostname such as `api.nathancj.com` is set up in the Cloudflare dashboard and, as far as I know, requires the zone's DNS to be on Cloudflare. Check the Workers docs before relying on it.
- **Durable Object:** the request counter uses a SQLite-backed Durable Object, the only kind on the free plan. If it fails, `/api/status` still answers with `requests: null`.

- **Extra chat context:** `worker/context/extra.md` (optional) is appended to the bot's knowledge by `npm run context`. Start from `context/extra.template.md`. The generated file is committed, so anything in `extra.md` is public.
- **Ask Nathan offer:** when the model calls the `ask_nathan` tool, the stream ends with `data: {"action":"ask_nathan"}`; the site then offers to open the contact form pre-filled with the visitor's last three questions.

## Chat log (D1)
Every chat question is recorded in a D1 table `chat_log` (`migrations/0001_chat_log.sql`): time, a hashed IP, outcome (`ok`, `rate_limited_*`, `unavailable`), the question, the final answer, tools the model called, whether the "ask Nathan" offer was shown, turns, latency and model. Invalid (400) requests are not logged. Writes happen after the response (`waitUntil`) and failures are swallowed, so logging cannot break the chat.

- **Privacy:** the IP is stored only as `sha256(LOG_SALT + date + ip)`, truncated. The same visitor hashes differently each day, so you can count visitors per day but not follow them. Rows older than `LOG_RETENTION_DAYS` (90) are deleted by a daily cron. The site footer tells visitors conversations are logged. Optionally set a secret salt: `npx wrangler secret put LOG_SALT`.
- **Local:** `npm run db:migrate:local`, then `npm run logs:local`.
- **Production:** `npm run db:migrate` (CI does this on deploy), then `npm run logs`. CI applies migrations on deploy; `npm run db:migrate` is the manual equivalent. The `database_id` is pinned in `wrangler.toml`.
- **Useful queries** (`npx wrangler d1 execute nathancj-chat --remote --command "..."`):
  - Questions the bot could not answer: `SELECT ts, question FROM chat_log WHERE asked_nathan = 1 ORDER BY id DESC`
  - Daily usage: `SELECT substr(ts,1,10) day, count(*) questions, count(DISTINCT ip_hash) visitors FROM chat_log GROUP BY day ORDER BY day DESC`
  - Limit hits: `SELECT outcome, count(*) FROM chat_log WHERE outcome != 'ok' GROUP BY outcome`
  - Slowest answers: `SELECT latency_ms, question FROM chat_log ORDER BY latency_ms DESC LIMIT 10`
