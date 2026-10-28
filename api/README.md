# api

Small Go backend for nathancj.com. It serves live data for the site's terminal (`status`, `uptime`) and is the place to add more features later. Standard library only.

The site is static and works without it. When the API is unreachable the terminal prints a "backend offline" message.

## Endpoints
| Route | Description |
|---|---|
| `GET /health` | Liveness check, returns `{"ok":true}` |
| `GET /api/status` | Version, uptime, start time, Go runtime and request count |

## Run locally
```sh
cd api
go test ./...
go run .                       # listens on :8080
```
Then build the site against it: `PUBLIC_API_URL=http://localhost:8080 npm run build` (from the repo root).

## Configuration (environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Listen port |
| `ALLOWED_ORIGINS` | `https://nathancj.com,http://localhost:4321` | Comma-separated browser origins allowed by CORS. Other origins get 403. |
| `CLIENT_IP_HEADER` | empty | Header holding the real client IP when behind a proxy, e.g. `CF-Connecting-IP` for Cloudflare Tunnel. Used only for rate limiting. |

Rate limit: 60 requests per minute per client, held in memory. Client addresses are never logged or stored.

## Container
```sh
docker build -t nathancj-api --build-arg VERSION=$(git rev-parse --short HEAD) api
docker run -p 8080:8080 -e ALLOWED_ORIGINS=https://nathancj.com nathancj-api
```
The image is a static binary on distroless, running as non-root, so it can run on a homelab, Azure Container Apps or a VPS. Note: the Dockerfile has not been built in CI yet.

## Deploying the site against it
Set `PUBLIC_API_URL` (for example `https://api.nathancj.com`) as a build environment variable in Netlify. Leave it empty to hide live data.
