# PokéroleDex local

A local recovery of [pokeroledex.nl](https://pokeroledex.nl), preserving its existing interface so it can be improved one feature at a time.

## Run

Requires Node.js 22 or newer. There are no packages to install.

```sh
npm run dev
```

Open **http://localhost:3000**. The server listens only on your computer. `npm start` runs without watching server files. If port 3000 is busy, use `PORT=3001 npm run dev`.

Refresh the browser after editing frontend files. Server changes restart automatically in development mode.

## What was recovered

- The deployed React frontend and stylesheet, with the existing pages and controls.
- Public reference data: 1,196 Pokémon forms, 892 moves, 394 items, 305 abilities, and 25 natures, including learnsets and evolution links.
- Local images, icons, and fonts; see `recovery/asset-manifest.json` for the capture results.
- Public rank-up point tables for Starter through Master.

2,606 image/font files were captured. Another 222 referenced URLs returned missing-asset HTML on the original site. Missing box sprites fall back to the corresponding local book artwork; unavailable item art uses the original interface's placeholder. Exact missing paths are recorded in the asset manifest.

The original source repository, TypeScript components, server implementation, and source maps were not available. `src/app.js` is formatted, modified production JavaScript, including bundled libraries. It is editable, but it still contains many shortened variable names. This is a working recovery baseline, not a claim to have recovered the author's original source tree.

## Work on it

| File | Purpose |
| --- | --- |
| `src/app.js` | Recovered interface and client behavior; search for a visible label to find its screen |
| `src/local-mode.js` | Local account and API configuration |
| `public/assets/styles.css` | Existing styles |
| `server/api.js` | Reconstructed local API and persistence |
| `server.js` | Local HTTP server and static files |
| `data/reference/` | Captured public game data |
| `data/local.json` | Your locally created sheets and campaigns; created on first save and excluded from Git |
| `recovery/original/` | Unmodified downloaded HTML, JavaScript, and CSS for comparison |
| `recovery/manifest.json` | Capture provenance and recovered API routes |

The simplest next step is to choose one screen or bug, extract that part into a named module, and improve it while keeping the other screens working.

Verified locally: catalog/detail rendering, Pokémon and trainer creation, editing and reload persistence, persistence across a server restart, trainer-party linking, inventory, campaign custom moves and filters, and both generators. Browser network inspection on a trainer page showed only local app requests (apart from an installed browser extension). This is smoke verification, not an exhaustive check of every recovered feature.

## Local data

The app uses one local account. No Auth0 account or API key is required. New sheets and campaigns are stored on disk; back up `data/local.json` to preserve them. Reference browsing and local saves do not contact the original website. Existing accounts and private sheets from the hosted service have **not** been imported.

This server is intended for personal local development. It does not implement multi-user authentication, sharing, or hosted collaboration.

Pokémon and item generators are local approximations: the original server's selection algorithm could not be recovered. Rank-up point tables are captured data, but Unranked and Champion had no table response. The original frontend's other behavior is preserved, including existing rough edges. A numeric-input save delay found during verification was fixed by flushing the field when it loses focus.

## Refresh the public snapshot

These commands explicitly contact the original site. They are optional and are never run at app startup. Python 3 is required only for capture.

```sh
python3 scripts/capture-reference.py
python3 scripts/capture-assets.py
```

Reference refreshes overwrite `data/reference/`, not local sheets. Review changes in Git before keeping a new snapshot. The recovered frontend is pinned separately; refreshing the data does not upgrade it.

## Provenance

The interface and captured assets originate from PokéroleDex, developed by Eliturbo. Pokérole rules and Pokémon assets belong to their respective creators. The related community data project is [Pokerole-Data](https://github.com/Pokerole-Software-Development/Pokerole-Data).

No license for the site's original application code was found during recovery. This workspace does not assign a new license to recovered third-party material. Existing bundled library license notices are preserved.
