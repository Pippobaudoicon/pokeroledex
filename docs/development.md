# Development

You need Node.js 24 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Open the URL Vite prints. `pnpm dev` does three things:

1. Compacts the reference data into `public/reference/`.
2. Applies the D1 migrations to a local database in `.wrangler/state`.
3. Starts Vite with the Worker running in workerd, so the frontend and `/api` are served together.

There's no login in development. Everything you create belongs to a single local user.

## The rulebook in development

The rulebook's R2 binding uses `remote: true`, so local development reads the live book text, page images and PDF. Run `pnpm exec wrangler login` first, with access to this Cloudflare account. Your own records still go to local D1, and the book's files are read-only in the app.

Without access to the account, run `pnpm dev:offline`. It needs no login, and everything works except the rulebook's Text, Pages, PDF and Ask views (Quick still works).

To read the book offline, upload it to the local bucket with `node scripts/upload-rulebook.ts <pdf> --local` (see [Rulebook](rulebook.md)). Ask always needs the real AI Search instance.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local development (frontend + Worker + local D1) |
| `pnpm dev:offline` | The same without a Cloudflare login; the rulebook bucket is local and Ask is unavailable |
| `pnpm typecheck` | Strict type check of the app, the Worker and the build scripts |
| `pnpm test` | City, persistence, sharing, habitat extraction and reference coverage regression tests |
| `pnpm habitats:refresh` | Collect and normalize Bulbapedia habitats, resuming from the local article cache (see [Habitats](habitats.md)) |
| `pnpm crafting:report` | Write every species' work profile and every item's recipe to `docs/crafting-review/` |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serve the production build locally (its API needs the Access login, see [Deployment](deployment.md)) |
| `pnpm deploy` | Build, apply migrations to the remote D1 database and deploy |
