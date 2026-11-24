# worker

The site's backend: a small Cloudflare Worker (TypeScript). The site works without it, and the terminal prints the real error when it can't be reached.

## Endpoints
| Route | Description |
|---|---|
| `GET /health` | `{"ok":true,"region":"IAD"}`. `region` is the Cloudflare data center that served the request. |
| `GET /api/status` | Version, runtime, edge region, time, and a running request count kept in a Durable Object. |

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
- **Rate limiting:** there is none in code. The free plan stops at 100,000 requests a day, and a Cloudflare rate limiting rule (dashboard) can cap abuse per client. Add one after deploying.
- **Custom domain:** a `workers.dev` address needs no DNS changes. A custom hostname such as `api.nathancj.com` is set up in the Cloudflare dashboard and, as far as I know, requires the zone's DNS to be on Cloudflare. Check the Workers docs before relying on it.
- **Durable Object:** the request counter uses a SQLite-backed Durable Object, the only kind on the free plan. If it fails, `/api/status` still answers with `requests: null`.
