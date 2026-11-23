# nathancj.com

Personal site built with [Astro](https://astro.build) + Tailwind CSS v4. Hosted on Netlify (`nathancj.com`; `nathanieljohnson.me` redirects here via `netlify.toml`).

## Develop
```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run check    # type check
```

## Editing content
All copy lives in `src/data/site.ts`. Items marked `TODO` are placeholders.

## Activity section
Shows a contribution heatmap, a weekly contributions bar chart, and recently active public repos with descriptions and commit and PR counts. `scripts/github-activity.mjs` fetches the data at build time (see `netlify.toml`) and writes `src/data/github-activity.json`. Run it locally with `npm run activity`.

- **Repos and counts:** public REST API, no token needed. A token only raises rate limits.
- **Contribution calendar:** with `GITHUB_TOKEN` set it uses the official GraphQL API (a read-only token with access to public data is enough). Without one it falls back to the public profile page's calendar, which is unofficial and may break if GitHub changes the page.
- **Failure:** each part fails on its own, the previous data is kept, and the build continues. Until the first successful run the graphs are hidden.
- **Freshness:** the data only updates when the site builds, so trigger a rebuild on a schedule (for example a Netlify build hook called from a daily GitHub Actions cron).

The work activity charts (commits, PRs and AI sessions from a separate collector) are hidden until that project exists. See [issue 13](https://github.com/nathan815/site/issues/13).

## Backend (optional)
A small Go API in `api/` powers the terminal's live `status` and `uptime` commands. See `api/README.md`. Set `PUBLIC_API_URL` at build time to enable it.

## Keyboard
`Cmd/Ctrl+K` command palette, `` ` `` mini terminal.
