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
Shows recently active public GitHub repos with their descriptions and commit and PR counts. `scripts/github-activity.mjs` fetches them at build time (see `netlify.toml`) and writes `src/data/github-activity.json`. It needs no token, but set `GITHUB_TOKEN` in Netlify to avoid rate limits. If the fetch fails, the committed snapshot is used and the build continues. Run it locally with `npm run activity`.

The work activity charts (commits, PRs and AI sessions from a separate collector) are hidden until that project exists. See [issue 13](https://github.com/nathan815/site/issues/13).

## Backend (optional)
A small Go API in `api/` powers the terminal's live `status` and `uptime` commands. See `api/README.md`. Set `PUBLIC_API_URL` at build time to enable it.

## Keyboard
`Cmd/Ctrl+K` command palette, `` ` `` mini terminal.
