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
Renders `src/data/activity.json` (placeholder sample). Real data comes from a separate collector project; set `ACTIVITY_DATA_URL` (Netlify build env var) to a published JSON file with the same schema and it is fetched at build time, falling back to the bundled file.

## Keyboard
`Cmd/Ctrl+K` command palette, `` ` `` mini terminal.
