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
Not yet run against a real Cloudflare account. The code was tested only in the local runtime (`wrangler dev`).

```sh
cd worker
npx wrangler login
npm run deploy      # also stamps the git short SHA as the version
```
Wrangler prints a `https://nathancj-api.<your-subdomain>.workers.dev` address. Set it as `PUBLIC_API_URL` in Netlify and redeploy the site.

- **CORS:** only the origins in `ALLOWED_ORIGINS` (`wrangler.toml`) may call it from a browser. Others get a 403.
- **Chat rate limiting:** `/api/chat` is limited in code by a `RateLimiter` Durable Object, using fixed windows aligned to UTC. Per client IP (`CF-Connecting-IP`): `CHAT_PER_MINUTE` (5) and `CHAT_PER_DAY` (30). Across all visitors: `CHAT_GLOBAL_PER_DAY` (150), which protects the Workers AI free quota (about 10,000 neurons a day, reset at 00:00 UTC). Over a limit it returns 429 with `Retry-After`. Counters are wiped by an alarm at the end of each UTC day, and IPs are never logged. If the limiter or AI binding is missing or fails, chat returns 503 rather than running unlimited. The other endpoints have no limit; a Cloudflare dashboard rule can cap them.
- **Chat config (`wrangler.toml` vars):** `CHAT_MODEL` (default `@cf/meta/llama-3.1-8b-instruct-fp8-fast`; check the id and pricing against the current Workers AI docs), `CHAT_PER_MINUTE`, `CHAT_PER_DAY`, `CHAT_GLOBAL_PER_DAY`.
- **Workers AI in dev:** the `[ai]` binding always calls the real service, even under `wrangler dev`. It needs `npx wrangler login`, and local testing counts toward the free quota.
- **Resume context:** the model answers from `src/context.generated.ts`, generated from `../src/data/site.ts` by `npm run context` (run automatically by `npm run deploy`). Commit the regenerated file after editing site data. The system prompt is in `src/prompt.ts`.
- **Not verified:** none of the chat path has run against real Cloudflare (Durable Object limiter, Workers AI binding, model id, the streamed response shape, alarms). Tests use fakes under plain Node.
- **Custom domain:** a `workers.dev` address needs no DNS changes. A custom hostname such as `api.nathancj.com` is set up in the Cloudflare dashboard and, as far as I know, requires the zone's DNS to be on Cloudflare. Check the Workers docs before relying on it.
- **Durable Object:** the request counter uses a SQLite-backed Durable Object, the only kind on the free plan. If it fails, `/api/status` still answers with `requests: null`.
