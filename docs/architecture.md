# Architecture

## Where things live

| Path | Purpose |
| --- | --- |
| `src/pages/<Page>/` | One folder per screen: Home, PokemonCatalog, Moves, Items, MyPokemon, MyTrainers, MyCity, Campaigns, Generators, Rulebook, Import |
| `src/components/` | Shared app components; `ui/` holds the shadcn/ui primitives, `pokemon-sheet/` the Pokémon sheet |
| `src/layout/` | App shell: sidebar, mobile nav, guided tour, notes panel |
| `src/api/` | API client and typed react-query hooks |
| `src/lib/`, `src/hooks/` | Utilities (stats, type chart, colours) and shared hooks |
| `worker/` | Cloudflare Worker: `/api/*` routes, Access login check, data import, reference-data loader, static-file fallbacks |
| `shared/` | Domain types and rules used by both the frontend and the Worker |
| `migrations/` | D1 schema |
| `scripts/build-reference.ts` | Compacts `data/reference/` into static JSON the Worker loads |
| `data/reference/` | Game data (read-only) |
| `public/` | Precompiled stylesheet, fonts and images |

## How a request is served

Static files are served directly. Any request that matches no file reaches the Worker, which:

- serves `/api/*`
- falls back from a missing `BoxSprites` image to the matching `BookSprites` image
- returns 404 for missing images, fonts and assets
- serves `index.html` for app routes

## Offline support

The app is an installable PWA. `/sw.js` caches the shell and static files, and keeps the last answer to each `/api` read, so Pokémon, trainers, moves and items you've already opened stay readable offline. They're read-only until you reconnect, and logging out clears those saved answers.

## Known issues

Code comments mark these where they happen. Two you may run into:

- A new trainer doesn't save the chosen nature.
- Error toasts never show the server's message.
