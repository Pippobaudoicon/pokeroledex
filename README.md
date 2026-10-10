# PokéroleDex

A recovery of [pokeroledex.nl](https://pokeroledex.nl), rebuilt as a React + TypeScript app that runs on a single Cloudflare Worker. The interface and behaviour match the original, so it can be improved one feature at a time.

## Run

Requires Node.js 24 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Open the URL Vite prints. `pnpm dev` compacts the reference data into `public/reference/`, applies the D1 migrations to a local database in `.wrangler/state`, and starts Vite with the Worker running in workerd, so the frontend and `/api` are served together.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local development (frontend + Worker + local D1) |
| `pnpm typecheck` | Strict type check of the app, the Worker and the build scripts |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm deploy` | Build, apply migrations to the remote D1 database, deploy |

## Deploy

1. `pnpm exec wrangler d1 create pokeroledex` and put the returned `database_id` into `wrangler.jsonc` (it is a placeholder now).
2. `pnpm deploy`.

There is no login: the app has one built-in user, and anyone who can reach the URL can read and change its data. Non-GET API calls must come from the same origin. Put a deployment behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) if it should be private.

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/<Page>/` | One folder per screen: Home, PokemonCatalog, Moves, Items, MyPokemon, MyTrainers, Campaigns, Generators |
| `src/components/` | Shared app components; `ui/` holds the shadcn/ui primitives, `pokemon-sheet/` the Pokémon sheet |
| `src/layout/` | App shell: sidebar, mobile nav, guided tour, notes panel |
| `src/api/` | API client and typed react-query hooks |
| `src/lib/`, `src/hooks/` | Utilities (stats, type chart, colours) and shared hooks |
| `worker/` | Cloudflare Worker: `/api/*` routes, reference-data loader, static-file fallbacks |
| `shared/types.ts` | Domain and API types used by both the frontend and the Worker |
| `migrations/` | D1 schema |
| `scripts/build-reference.ts` | Compacts `data/reference/` into static JSON the Worker loads |
| `data/reference/` | Captured public game data (read-only) |
| `public/` | Precompiled stylesheet, fonts and images |
| `recovery/` | Untouched downloaded HTML, JavaScript and CSS, plus capture manifests, for comparison |

Static files are served directly. Requests that match no file reach the Worker, which serves `/api/*`, falls back from a missing `BoxSprites` image to the matching `BookSprites` image, returns 404 for missing images, fonts and assets, and serves `index.html` for app routes.

## Data

- **Reference data** (1,196 Pokémon forms, 892 moves, 394 items, 305 abilities, 25 natures, rank-up tables) lives in `data/reference/` and is published read-only as `/reference/*.json`.
- **Your data** (Pokémon sheets, trainers, campaigns, custom entries, notes) is stored in D1, in one `records` table. Back it up with `pnpm exec wrangler d1 export pokeroledex --remote --output backup.sql` (or `--local`).

The Pokémon and item generators are local approximations: the original server's selection algorithm could not be recovered. Rank-up point tables are captured data, but Unranked and Champion had no table response.

## What was recovered

The original source code, server and source maps were not available. The frontend was rebuilt from the deployed production bundle: bundled libraries were replaced by npm packages pinned to the versions found in it, and the application code was split into modules, renamed and typed. Every screen was compared against the original with screenshots and smoke flows. The original's own bugs were kept, not fixed: for example, the item generator crashes when it shows results, a new trainer does not save the chosen nature, and error toasts never show the server's message. Comments in the code mark these quirks.

2,606 image and font files were captured. Another 222 referenced URLs returned missing-asset HTML on the original site; exact paths are in `recovery/asset-manifest.json`.

## Refresh the public snapshot

These commands contact the original site. They are optional and are never run at startup. Python 3 is required only for capture.

```sh
python3 scripts/capture-reference.py
python3 scripts/capture-assets.py
```

Reference refreshes overwrite `data/reference/`, not your data. Review changes in Git before keeping a new snapshot.

## Provenance

The interface and captured assets originate from PokéroleDex, developed by Eliturbo. Pokérole rules and Pokémon assets belong to their respective creators. The related community data project is [Pokerole-Data](https://github.com/Pokerole-Software-Development/Pokerole-Data).

No license for the site's original application code was found during recovery. This workspace does not assign a new license to recovered third-party material. Existing bundled library license notices are preserved in the npm packages.
