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
| `pnpm preview` | Serve the production build locally (its API needs the Access login, see below) |
| `pnpm deploy` | Build, apply migrations to the remote D1 database, deploy |

## Deploy

`pnpm deploy` builds, applies migrations to the remote D1 database and deploys to https://pokeroledex.tommasolopiparo.com. `wrangler.jsonc` points at the existing `pokeroledex` database; to deploy to another Cloudflare account, run `pnpm exec wrangler d1 create pokeroledex` there and put the returned `database_id` into `wrangler.jsonc` first.

## Logins

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/) sits in front of the whole site: people log in with a one-time code sent to their email, and everyone's Pokémon, trainers and campaigns are kept apart by that email. The Worker checks the token Access signs every request with (`worker/access.ts`) and answers 401 without it, so the API stays closed until Access is set up:

1. In the Cloudflare dashboard open **Zero Trust** (pick a team name and the Free plan the first time).
2. **Access → Applications → Add an application → Self-hosted**: domain `pokeroledex.tommasolopiparo.com`, a policy that allows *Everyone* (or a list of emails), and the **One-time PIN** login method.
3. Put the team domain (`<team>.cloudflareaccess.com`) and the application's **Application Audience (AUD) tag** into `vars` in `wrangler.jsonc`, then `pnpm deploy`.

`pnpm dev` has no Access in front of it and uses a single local user. Records made before logins existed belong to `local-user`; give them to someone with `pnpm exec wrangler d1 execute pokeroledex --remote --command "UPDATE records SET owner = 'you@example.com' WHERE owner = 'local-user'"`.

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/<Page>/` | One folder per screen: Home, PokemonCatalog, Moves, Items, MyPokemon, MyTrainers, Campaigns, Generators, Import |
| `src/components/` | Shared app components; `ui/` holds the shadcn/ui primitives, `pokemon-sheet/` the Pokémon sheet |
| `src/layout/` | App shell: sidebar, mobile nav, guided tour, notes panel |
| `src/api/` | API client and typed react-query hooks |
| `src/lib/`, `src/hooks/` | Utilities (stats, type chart, colours) and shared hooks |
| `worker/` | Cloudflare Worker: `/api/*` routes, Access login check, pokeroledex.nl import, reference-data loader, static-file fallbacks |
| `shared/types.ts` | Domain and API types used by both the frontend and the Worker |
| `migrations/` | D1 schema |
| `scripts/build-reference.ts` | Compacts `data/reference/` into static JSON the Worker loads |
| `data/reference/` | Captured public game data (read-only) |
| `public/` | Precompiled stylesheet, fonts and images |
| `recovery/` | Untouched downloaded HTML, JavaScript and CSS, plus capture manifests, for comparison |

Static files are served directly. Requests that match no file reach the Worker, which serves `/api/*`, falls back from a missing `BoxSprites` image to the matching `BookSprites` image, returns 404 for missing images, fonts and assets, and serves `index.html` for app routes.

The app is an installable PWA: `/sw.js` caches the shell and static files, and keeps the last answer to each `/api` read so Pokémon, trainers, moves and items already opened stay readable offline (read-only; changes need a connection). Logging out clears those saved answers.

## Data

- **Reference data** (1,196 Pokémon forms, 892 moves, 394 items, 305 abilities, 25 natures, rank-up tables) lives in `data/reference/` and is published read-only as `/reference/*.json`.
- **Your data** (Pokémon sheets, trainers, campaigns, custom entries, notes) is stored in D1, in one `records` table, under the owner's email. Back it up with `pnpm exec wrangler d1 export pokeroledex --remote --output backup.sql` (or `--local`).

### Import from pokeroledex.nl

The **Import** page (`/import`) copies the logged-in person's Pokémon sheets, trainers (team and inventory), campaigns, and the moves, abilities, items and Pokémon templates in those campaigns from pokeroledex.nl. It needs their pokeroledex.nl login token: a bookmark on the page grabs it while they are logged in there and brings them back, or they paste it from the browser's developer tools. The Worker fetches the data (`worker/import.ts`), because pokeroledex.nl only allows its own pages to call its API. Records keep their ids, so importing again updates them instead of duplicating them.

The Pokémon and item generators are local approximations: the original server's selection algorithm could not be recovered. Rank-up point tables are captured data, but Unranked and Champion had no table response.

### DM encounters

**Generators → Encounters** (`/generators/encounters`) integrates the functions of [pokerol-encounter](https://github.com/malagonius/pokerol-encounter) into the existing interface. Generate 1–12 Pokémon using name, type, generation, habitat, rank, legendary/mythical, fossil, starter-family and form filters. Encounters use the active campaign selection and local reference data; no PokeAPI or GitHub requests are needed during generation.

Cards support locking across rolls, removal, two-d20 shiny rolls, HP tracking, full sheets and all rank-eligible moves with calculated dice pools. History holds the last encounter's unique templates and excludes them from the next roll; remove individual entries or clear history to allow them again. Copy exports the current encounter. Results, HP, shiny status and history last until you leave the generator screen or reload. A fixed seed reproduces species and stats with the same filters, campaign selection and history exclusions; shiny rolls remain independent.

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
