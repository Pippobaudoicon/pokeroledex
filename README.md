# PokéroleDex

A recovery of [pokeroledex.nl](https://pokeroledex.nl), rebuilt as a React + TypeScript app that runs on a single Cloudflare Worker. The interface and behaviour match the original, so it can be improved one feature at a time.

## Run

Requires Node.js 24 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Open the URL Vite prints. `pnpm dev` compacts the reference data into `public/reference/`, applies the D1 migrations to a local database in `.wrangler/state`, and starts Vite with the Worker running in workerd, so the frontend and `/api` are served together.

The rulebook R2 binding uses `remote: true`, so local development reads the live book text, page images and PDF. Run `pnpm exec wrangler login` with access to this Cloudflare account first. Development records use local D1; the book's R2 files are read-only in the app.

Without access to this Cloudflare account, run `pnpm dev:offline` instead: no login needed, everything works except the rulebook's Text, Pages, PDF and Ask views (Quick still works). To read the book offline, upload it to the local bucket with `node scripts/upload-rulebook.ts <pdf> --local` (see Rulebook below); Ask always needs the real AI Search instance.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local development (frontend + Worker + local D1) |
| `pnpm dev:offline` | The same without a Cloudflare login; the rulebook bucket is local and Ask is unavailable |
| `pnpm typecheck` | Strict type check of the app, the Worker and the build scripts |
| `pnpm test` | City, persistence, sharing, habitat extraction and reference coverage regression tests |
| `pnpm habitats:refresh` | Collect and normalize Bulbapedia habitats (resumes from the local article cache) |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serve the production build locally (its API needs the Access login, see below) |
| `pnpm deploy` | Build, apply migrations to the remote D1 database, deploy |

## Deploy

`pnpm deploy` builds, applies migrations to the remote D1 database and deploys to https://pokeroledex.tommasolopiparo.com. `wrangler.jsonc` points at the existing `pokeroledex` database; to deploy to another Cloudflare account, run `pnpm exec wrangler d1 create pokeroledex` there and put the returned `database_id` into `wrangler.jsonc` first.

## Logins

### Pull request previews

Workers Builds publishes branch previews with `wrangler preview`. The `previews` block in `wrangler.jsonc` connects them to the separate `pokeroledex-preview` database, initialized with the same schema as production. Preview records start empty. The rulebook's read-only R2 files and AI Search instance are shared.

Enable **Workers & Pages → pokeroledex → Access → Protect this Worker behind Access → Previews only**. Its policy lets in members of the `new-era-horde` GitHub organization (Include → *GitHub Organization*, logging in with GitHub). The organization restricts third-party access, so the Access login's GitHub OAuth app must be granted to it under GitHub → Settings → Applications → Authorized OAuth Apps → the app → Organization access. Set `previews.vars.ACCESS_AUD` to that Access application's **Application Audience (AUD) tag** from Zero Trust → Access → Applications → Additional settings. The Worker verifies signed login tokens against this preview audience and `previews.vars.ACCESS_TEAM_DOMAIN`.

### Production login

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/) sits in front of the whole site: people log in with a one-time code sent to their email, and everyone's Pokémon, trainers and campaigns are kept apart by that email. The Worker checks the token Access signs every request with (`worker/access.ts`) and answers 401 without it, so the API stays closed until Access is set up:

1. In the Cloudflare dashboard open **Zero Trust** (pick a team name and the Free plan the first time).
2. **Access → Applications → Add an application → Self-hosted**: domain `pokeroledex.tommasolopiparo.com`, a policy that allows *Everyone* (or a list of emails), and the **One-time PIN** login method.
3. Put the team domain (`<team>.cloudflareaccess.com`) and the application's **Application Audience (AUD) tag** into `vars` in `wrangler.jsonc`, then `pnpm deploy`.

### Staying logged in

Deploys never end a login. Access keeps two: the site's own `CF_Authorization` cookie, valid for the application's session duration and tied to one hostname (so each new preview URL needs it again), and a team-wide login that renews it without a new email code. When the site's cookie lapses, the app reloads the page once and Access renews it (`sameOriginFetch` in `src/api/client.ts`). To ask for a code less often:

1. **Zero Trust → Access controls → Applications →** the production and preview applications **→ Session duration**: raise it from the 24 hour default (e.g. 1 month). Leave **Access settings → Set your global session duration** at *Same as application session timeout*, so the team-wide login follows each application's duration and other applications in the account keep theirs. (The *Session duration* under *Cloudflare One Client authentication* is for the WARP client, not browser logins.)
2. **Access controls → Policies**: both applications use their own `pokeroledex - everyone` policy (Allow, Include *Everyone*, 1 month). A policy's session duration overrides the application's, so a shared policy with a shorter one would log people out sooner.
3. For previews, open the PR's branch alias URL (`<branch>-pokeroledex.<subdomain>.workers.dev`), which stays the same across builds of the branch, instead of the per-version URL.

`pnpm dev` has no Access in front of it and uses a single local user. Records made before logins existed belong to `local-user`; give them to someone with `pnpm exec wrangler d1 execute pokeroledex --remote --command "UPDATE records SET owner = 'you@example.com' WHERE owner = 'local-user'"`.

## Pokemon nicknames

Open a saved Pokemon's sheet (including one in a trainer's party), choose **Edit**,
and enter a **Nickname (optional)** next to its identity. **Save** keeps the nickname;
**Cancel** discards edits. Clear the field and save to use the species name again.
Nicknames appear on the sheet, in My Pokemon, trainer parties and city rosters.
The species remains visible on nicknamed sheets. Existing records need no migration.

## Shiny Pokemon

In **Generators → Encounters**, **Roll shiny** rolls 2d20 per Pokemon; a double 20
makes it shiny (yellow border and ✨ Shiny). **Add to My Pokemon** from its
**Details & moves** sheet catches it shiny. Any saved Pokemon can also be made
shiny, or not, with the **Shiny** checkbox under **Edit** on its sheet. Shiny
Pokemon share an animated gold border with travelling pearly glints, a diagonal
white sheen sweeping across the whole box for 0.9 seconds every 30 seconds, and ✨ in
the generator, on their sheet, in My Pokemon, Home, trainer parties and city
rosters. With reduced motion enabled, the border stays static and the sheen is
hidden; non-shiny Pokemon are unchanged. In `src/index.css`, tweak the
`shiny-sheen` animation duration to change the interval, and its `3%` keyframe
(plus the preceding `2.99%` opacity hold) to change the sweep duration:
interval × percentage / 100 = sweep seconds.
They stay shiny when moved to a trainer or a
city, or sent to another player. The flag is `shiny` on the Pokemon record (and
on `/api/pokemon/minimal`); older records are not shiny and need no migration.
Shiny sprites are not shown yet.

## My City

Open **My City** from the sidebar, Home, or app search. Each account can create
multiple named cities and switch between them. The overview starts with the
city's capabilities, then counts residents by type **and rank**: one compact block
for each populated rank, ordered from Unranked to Champion, with all 18 types. Each
type is a bar with its count, filled by its share of the Pokémon at that rank. The
resident limit belongs to the whole city and grows with its rank, so it appears once,
as a total bar above the types (for example 22 / 25 Pokémon). A dual-type resident
counts once under each type, so the sum of type counts can exceed the population.

**Add Pokémon** creates a sheet from a core or campaign species, or moves an
existing sheet from My Pokémon, a trainer, or another city. A Pokémon belongs to
at most one city or trainer; transfers preserve its ID, stats and moves. New sheets
use the selected rank but start with unallocated stats and moves, editable from
the city roster. City residents are separate from the personal **My Pokémon**
collection, including residents created directly from the Pokédex.
Moving an existing personal Pokémon into a city removes it from My Pokémon;
cached personal and trainer lists refresh before the transfer reports success.
The **Pokémon roster** is a grid of cards linking to each city sheet. A card's
**⋯** menu moves the resident to another city, a trainer, or **My Pokémon**. The
city leader can also delete it for good after a confirmation, freeing its slot and
its assignment. A city must be empty before
it can be deleted.

Every city has a rank, like trainers and Pokémon (new and older cities start
Unranked). With the rank level counted from 1 (Unranked) to 9 (Champion), a city
holds at most **4 + 3 × level** residents (Unranked 7, Starter 10, Rookie 13,
Standard 16…) and every skill or action shows at most **5 + level** (Unranked 6,
Starter 7 … Advanced 10). Adding or moving a Pokémon into a full city fails, and
a city cannot drop to a rank that is too small for its current residents.

**Skills & actions** lets you put residents to work: drag a resident from
**Unassigned** onto a city skill or a custom action such as "Can heal". Dragging
works with a mouse or touch and scrolls near the screen edges. You can also tap
or press Enter on a resident, then on its destination. Escape cancels. Each
resident works on one skill or action at a time.

Tap a colored skill icon to open its explanation: what it does, how residents
increase it, its rank cap, and which species can work it. Catalyst explains
type coverage and strength instead. Help is available even before adding
residents. Icons open help only; select a resident and tap the skill name to
assign it, or drag it onto the skill as before.

City skills are grouped for crafting (see `docs/crafting-plan.md`):

| Kind | Skills |
| --- | --- |
| Crafting (dice for recipes) | Apothecary, Craftsmanship, Technology, Metallurgy, Archaeology |
| Support | Research (unlocks recipes), Nursing, Foraging, Catalyst |

A resident's species decides which skills it can work. Its **work profile**
(shown under **City work** on its Pokédex page) is full, half or closed for each
skill. It starts from the species' types, and a high max attribute raises it:
6+ turns half into full, 7+ opens a skill at half. Hand-tuned exceptions live in
`data/crafting-species.json`. The rules are in `shared/crafting.ts`, and
`pnpm crafting:report` writes every species' profile and every item's recipe to
`docs/crafting-review/`. **Catalyst** takes any resident: it adds no value and
instead provides the resident's types, at its bonus, to recipes that need them.
A skill's value is the sum of its residents' bonuses, half (at least 1) for a
half skill, capped by the city rank:

| Resident | Bonus |
| --- | --- |
| First evolution stage (Charmander, Pichu, Eevee) | +1 |
| Second stage (Charmeleon, Pikachu, Vaporeon) | +2 |
| Third stage (Charizard, Raichu, Gardevoir) | +3 |
| Species that never evolve (Tauros, Rotom) | +2 |
| Legendary | +5 |

Mega Evolutions and alternate forms (Rotom Wash, Aegislash Blade) use their base
form's bonus. Values are calculated from the residents, so they cannot be set
by hand; values saved by hand before this change are ignored, and migration
`0005_city_string_tags.sql` turns the `{ name, value }` actions from
`0004_city_work_skills.sql` back into plain action names. Migration
`0006_city_crafting_skills.sql` moves assignments from the old work skills to the
closest new skill (Medicine Production, Farming and Planting to Apothecary;
Handiwork to Craftsmanship; Generating Electricity to Technology; Mining to
Metallurgy; Science to Research; Transporting to Foraging). Assignments the
species cannot work are dropped, so those residents show up unassigned. Removing an action
or moving a resident out of the city unassigns it. City settings below the board
edit the name, rank and custom actions; save them explicitly.

### Crafting

The **Crafting** tab turns the city's skills into items (rules in
`docs/crafting-plan.md`). Recipes come from the reference items only.

- **Craft** lists what the city can craft now, each with its skill, tier (tier N
  needs city rank N, Starter to Champion), how much of its skill each item uses
  (the tier's effort: 1 to 4), and any assist skill or Catalyst type it needs.
  **Show locked recipes** adds the others with what each still needs. Long lists
  show 35 recipes per page, with numbered pages to jump between. Select an
  item to read its description. Any member adds items to the **crafting order**
  and takes them out again: each crafting skill's value is how much of the order
  its recipes can fill (Apothecary 3 holds three tier 1 Apothecary items, or one
  tier 4 item and one tier 1). The leader crafts the whole order at once, with
  no dice, and the items go to the city storage.
- **Research** unlocks tier 3 and higher recipes: each roll uses the Research
  skill's dice and every success is one step towards the tier's steps. The
  leader rolls in the app, or types in the dice of a physical roll. As GM, the
  leader can also add or remove steps, or unlock a recipe outright, even a
  locked one the city could not research yet.
- **Storage** is the city inventory. Any member can store items from one of
  their trainers or take items out to one. The leader can also add any reference
  item directly (**Add item**) and remove items for good, e.g. to adjust the
  city's stock as GM. In **Generators → Items**, the leader can add generated
  reference or campaign items to a city. Reference items stack; custom items
  are self-contained copies that stay separate, even when different accounts
  use the same item ID. Members can withdraw and edit these copies without
  needing access to the original campaign. Older stored campaign items are
  turned into copies by `migrations/0008_city_inventory_copies.sql`, using a
  current member's item. Any that no member has any more show as
  **Unavailable item** for the leader to remove.

### Sharing a city

**Skills & actions → Members** invites friends by the email they log in with.
Every member has the same rights as the creator: they see the city, edit its
skills and residents' sheets, add their own Pokémon, take residents into their
own My Pokémon or trainers, and invite others. There is no email notification;
the city appears in the friend's My City the next time they open it. In
production the friend must also be allowed through the Cloudflare Access policy
(see Production login). When other members remain, **Leave city** removes only
you; the last member deletes the city, which must be empty first. Edits are
last-save-wins.

A city does not share its members' campaigns. A resident built from a custom
species keeps showing its species, moves, abilities and held item to whoever has
it, read-only, but the campaign never appears in their Campaigns list. A sheet can
only be pointed at entries its editor can already see. A custom species cannot
be deleted while a sheet in another account or a shared city still uses it.

Cities and their residents are stored in D1 under the owner `city:<city id>`, and
`city_members` (migration `0003_city_members.sql`) lists who can load them. Each
request loads the city, changes it and writes it back; migration
`0007_record_checks.sql` rolls the write back if another request changed the city
in between, and the Worker runs the request again on the fresh city (up to 5
times, then 409). So members moving items or crafting at the same moment never
lose or duplicate items. Moving
a Pokémon into or out of a city moves its record between that city and the
person's own records. `/api/cities` supports GET/POST, `/api/cities/:id` supports
GET/PATCH/DELETE (leave when shared), and `POST /api/cities/:id/members` with
`{ email }` invites a member. City PATCH accepts `name`, `rank`, `tags` and
`assignments` (`{ "<pokemon id>": "skill:metallurgy" | "tag:Can heal" | null }`,
merged into the stored assignments so members' changes don't overwrite each
other; a skill the resident's species cannot work is refused); the response adds the derived `limits`, `skills`, `tagValues`,
`catalysts` (type → strongest Catalyst bonus) and each resident's `bonuses` and `profiles`, plus the
city's `inventory` (hydrated like a trainer's), `research` (steps per item ID) and `order` (the crafting order, `{ itemId, quantity }[]`).

Crafting (rules in `docs/crafting-plan.md` and `shared/crafting.ts`):

| Endpoint | Who | Body | Does |
| --- | --- | --- | --- |
| `POST /api/cities/:id/order` | Any member | `{ itemId, quantity }` | Sets how many of a reference item are in the crafting order (0 takes it out). Raising it needs a craftable recipe and room in its skill: each item uses its tier's effort of the skill's value |
| `POST /api/cities/:id/craft` | Leader | `{}` | Moves the whole order into the city inventory and empties it, if every recipe is still craftable and fits |
| `POST /api/cities/:id/research` | Leader | `{ itemId, faces? }` | Rolls Research and adds one step per success, up to what the tier needs |
| `POST /api/cities/:id/steps` | Leader | `{ itemId, steps }` | Sets a recipe's research steps (0 to what its tier needs) without the rank or Research gates |
| `POST /api/cities/:id/inventory` | Any member | `{ trainerId, entryId, quantity, direction: "deposit" \| "withdraw" }` | Moves items between one of your trainers and the city; reference items stack |
| `POST /api/cities/:id/stock` | Leader | `{ itemId, quantity }` | Adds 1 to 999 of a reference item or an item from the leader's collection straight to the city inventory (no recipe needed); custom items are copied inline |
| `POST /api/cities/:id/discard` | Leader | `{ entryId, quantity }` | Removes items from the city inventory for good |

`faces` are the dice of a physical research roll and must match the pool, each 1 to 6;
without them the server rolls. A recipe that cannot be ordered, crafted or researched yet
answers 409 with the reasons (rank, research, skill, assist, catalyst or room in the order). Lowering
an order line is always allowed, so an order that no longer fits (a resident moved off the skill) can be trimmed. The
last member cannot delete a city that still stores items. Moving a Pokémon to a city or trainer uses the existing Pokémon PATCH
endpoint and validates destinations among the person's trainers and cities.
`GET /api/pokemon` and `/api/pokemon/minimal` list only personal Pokémon;
`GET /api/pokemon/all` includes city residents for city management.
Taking ownership explicitly uses `{ id, takeOwnership: true }` on Pokémon PATCH.

City regression tests run with `pnpm test`.
They exercise the actual API handler against an isolated in-memory SQLite
database and reference fixtures, without accessing Cloudflare or changing local
development records.

## Issue reports

The **Suggest a feature** button opens a form; the Worker turns it into a GitHub issue (`worker/github.ts`), so people need no GitHub account. The token stays a Worker secret and never reaches the browser. Each person can send 5 reports a day; their email is kept with the report in D1 but not published on GitHub. Issues get the `from-app` label.

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new): *Only select repositories* → this repository, permission **Issues: Read and write**, nothing else, with an expiry date.
2. `pnpm exec wrangler secret put GITHUB_TOKEN` and paste it. To try it locally, put `GITHUB_TOKEN=...` in `.dev.vars` (git-ignored).

`GITHUB_REPO` in `wrangler.jsonc` sets the target repository. Without a token the form answers that reports are not set up.

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/<Page>/` | One folder per screen: Home, PokemonCatalog, Moves, Items, MyPokemon, MyTrainers, MyCity, Campaigns, Generators, Import |
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

The **Rulebook** page (`/rulebook`) presents the Pokérole 3.0 corebook in five views, using the app's light and dark themes:

- **Text**: searchable text grouped by section (accents ignored, Ctrl+F works too). Chapter headers, subcategories and page badges distinguish the contents from the reading pane. Phones have a contents picker. A page number opens that page in Pages; search and scroll position survive tab changes.
- **Pages**: every page as a pre-rendered WebP image, with thumbnails on larger screens, previous/next buttons, a page-number field and fit-page / fit-width controls. Click a page to switch between the two sizes. The PDF's JPEG 2000 art takes seconds per page to decode, so the images scroll far more smoothly than the PDF.
- **PDF**: the original file in the browser's own viewer, searchable but slow to scroll.
- **Ask**: type a rules question and get a short answer from the book with the pages it came from (`POST /api/rulebook/ask`). The Worker asks the AI Search instance through the `RULEBOOK_SEARCH` binding (`ai_search` in `wrangler.jsonc`, `remote` so `pnpm dev` uses the real instance); the instance has no generation model, so `worker/ask.ts` names a Workers AI one. Every question costs a Workers AI call.
- **Quick**: battle-rule summaries with links to source pages. These remain readable when the book cannot be loaded.

The book is not in the repository. It lives in the R2 bucket `pokeroledex-rulebook`, behind the same login as the rest of the site: `corebook.pdf` (streamed in ranges), `pages.json` (text per page), `pages/` and `thumbs/` (one image per page), and `search/`, one Markdown file per section of the contents (`scripts/rulebook-sections.ts`) for the Cloudflare AI Search instance `pokeroledex-corebook`, whose path filter is `search/**`. To set it up, [download the corebook](https://www.mediafire.com/file/ciqdxrua7ur81q5/POKEROLE_COREBOOK_3.0.pdf/file), install poppler and webp (`brew install poppler webp`), then:

```sh
pnpm exec wrangler r2 bucket create pokeroledex-rulebook       # once
node scripts/upload-rulebook.ts POKEROLE_COREBOOK_3.0.pdf --remote  # --local for pnpm dev
```

Rendering the 641 pages takes about 13 minutes on 8 cores; finished pages are kept in `.wrangler/rulebook/` and skipped on the next run. The text and every page already viewed are cached for offline reading; the PDF needs a connection.

## Data

- **Reference data** (1,196 Pokémon forms, 892 moves, 394 items, 305 abilities, 25 natures, rank-up tables) lives in `data/reference/` and is published read-only as `/reference/*.json`.
- **Your data** (Pokémon sheets, trainers, campaigns, custom entries, notes) is stored in D1, in one `records` table, under the owner's email. Back it up with `pnpm exec wrangler d1 export pokeroledex --remote --output backup.sql` (or `--local`).

### Custom habitats

Core habitats are replaced at reference-build time, not fetched at runtime:

- `data/reference/pokemon-habitats.json` contains one record per Pokédex template, including forms: normalized habitat IDs, source article/revision/sections, status, and the species name when inherited.
- `data/reference/habitats.json` saves the 31 normalized specific habitats, their `macroId`, and Pokémon/form counts (including zero counts).
- `data/reference/habitat-macros.json` saves the eight macro habitats, their specific habitat IDs, and distinct Pokémon/form counts. A Pokémon assigned to several specifics in a macro is counted only once for that macro.
- Both catalogs and `pokemon-habitats.json` are published at `/reference/<name>.json`.
- `shared/habitats.ts` defines the taxonomy, labels, legacy aliases and matching used by the Pokédex, both generators and campaign template editor.

The initial collection queried all 1,023 species articles for 1,196 templates (including Egg). It contains **408 documented assignments**, **80 explicitly inherited form assignments**, **707 entries awaiting review**, and **one not-applicable Egg**. The original 73 effective habitat values are now normalized into **31 specific habitats under eight macros**; 30 specifics currently have Pokémon assigned, while Outer Space is available for future/campaign assignments. This is a conservative automated extraction, not a fully human-reviewed habitat database. An unmatched statement does not prove a Pokémon lacks a documented habitat.

| Macro habitat | Specific habitats |
| --- | --- |
| Forests | Forests; Tropical Forests & Jungles |
| Open Land | Grasslands & Savannas; Fields & Meadows; Farmlands; Gardens |
| Water & Coasts | Lakes & Ponds; Rivers & Streams; Lakeshores & Riverbanks; Wetlands; Oceans; Deep Seas; Coral Reefs; Seafloors; Coasts, Beaches & Islands |
| Ice & Snow | Frozen Areas & Glaciers; Snowy Mountains; Icy Caves; Polar Seas; Tundra & Boreal Forests |
| Mountains & Underground | Mountains & Peaks; Rocky Areas & Cliffs; Caves & Underground |
| Arid & Volcanic | Deserts; Badlands, Scrublands & Wastelands; Volcanoes |
| Settlements & Ruins | Settlements & Buildings; Power Plants & Electrical Areas; Ruins, Cemeteries & Abandoned Buildings |
| Otherworldly | Outer Space; Other Dimensions & Ultra Space |

Pokémon store **specific habitat IDs only**, deduplicated and sorted; macro membership is derived. The Pokédex and both generators use the same grouped picker: select an entire macro or individual specifics, and a Pokémon matches **any** selection. Each macro has a distinct colored icon. In both generators, the whole Habitats section starts collapsed, shows the selection count, and preserves selections and expanded specifics when closed. Ordinary mountains/peaks do **not** imply Ice & Snow. Every specific belongs to one macro; Polar Seas and Icy Caves belong to Ice & Snow, not Water & Coasts or Mountains & Underground. Pokémon can belong to multiple macros through multiple specific habitats.

Synonyms merge into a single stored value: forest/woodland/temperate forest → `FORESTS`; plains/prairies/savannas → `GRASSLANDS`; rivers/streams → `RIVERS_AND_STREAMS`; bogs/swamps/marshes → `WETLANDS`; houses/buildings/cities → `URBAN_AREAS`. Legacy combined categories map to one broad normalized value, not every possible child: for example, Glaciers/Mountain Peaks/Icy Caves → `ICE_AND_SNOW` without inventing separate icy-cave evidence. The complete alias mapping is in `shared/habitats.ts`.

The collector examines **Biology** and **Pokédex entries**, not game encounter locations or the older FireRed/LeafGreen habitat classification. It normalizes synonyms and separates regional/form evidence. Where form-specific evidence matches, it takes precedence over shared species evidence; otherwise a form may explicitly inherit shared species habitats. If no supported statement matches, the entry is marked `needs-review` and **retains the normalized equivalent of its original API habitats**. The original captured Pokémon snapshot is unchanged. The Pokédex profile shows macros, specific habitats, the source or review fallback, and a link to the captured article revision.

Existing campaign templates and legacy API filter values remain readable through the alias mapping. Campaign responses normalize old IDs without modifying their stored records; creating or updating a template's habitats persists canonical IDs. The campaign editor offers only normalized specifics and previews their macros. Macro IDs are accepted by generator filters, but rejected as stored Pokémon habitat values. Campaign assignments are not replaced with Bulbapedia data.

```sh
pnpm habitats:refresh
pnpm habitats:refresh --refresh
pnpm build
```

The first command resumes/reprocesses cached articles in `node_modules/.cache/pokeroledex-habitats/`; `--refresh` fetches current revisions again. Requests use the public MediaWiki API in small sequential batches. Failures stop collection explicitly; completed article batches remain cached. Collection rewrites the habitat assignments and both catalogs, so review the Git diff before retaining a refresh or overwriting manual edits. No article prose is stored in the published datasets.

To curate an assignment, edit its record in `pokemon-habitats.json`, using specific IDs from `shared/habitats.ts`, a source revision and section, and `documented` (or `inherited` with `inheritedFrom`). Run `pnpm build` to apply it, normalize/deduplicate stored assignments, and regenerate both the checked-in and published specific/macro catalogs. A reference refresh cannot silently erase overrides: the original captured Pokémon JSON stays unchanged, and the build applies the separate dataset. Missing/stale template mappings fail the build and require running the collector again.

### Import from pokeroledex.nl

The **Import** page (`/import`) copies the logged-in person's Pokémon sheets, trainers (team and inventory), campaigns, and the moves, abilities, items and Pokémon templates in those campaigns from pokeroledex.nl. It needs their pokeroledex.nl login token: a bookmark on the page grabs it while they are logged in there and brings them back, or they paste it from the browser's developer tools. The Worker fetches the data (`worker/import.ts`), because pokeroledex.nl only allows its own pages to call its API. Records keep their ids, so importing again updates them instead of duplicating them.

The Pokémon and item generators are local approximations: the original server's selection algorithm could not be recovered. Rank-up point tables are captured data, but Unranked and Champion had no table response.

### DM encounters

**Generators → Encounters** (`/generators/encounters`) integrates the functions of [pokerol-encounter](https://github.com/malagonius/pokerol-encounter) into the existing interface. Generate 1–12 Pokémon using name, type, generation, habitat, rank, legendary/mythical, fossil, starter-family and form filters. Encounters use the active campaign selection and local reference data; no PokeAPI or GitHub requests are needed during generation.

Cards support locking across rolls, removal, two-d20 shiny rolls, HP tracking, full sheets and all rank-eligible moves with calculated dice pools. History holds the last encounter's unique templates and excludes them from the next roll; remove individual entries or clear history to allow them again. Copy exports the current encounter. Results, HP, shiny status and history last until you leave the generator screen or reload. All three generators use a fresh seed for each generation; manual seed selection is not available. Shiny rolls remain independent.

The encounter details sheet has a **Your Pokémon** tablist above the encounter tablist. **Add Pokémon** adds one of My Pokémon (its HP and Will are saved to My Pokémon) or any species by name (generated at its recommended rank, kept only for the encounter); the × on the active tab removes it from the encounter, and its sheet shows no other actions. Every tab shows the Pokémon's turn (`1. Obstagoon · Turn 2`); set it with the **Turn** card next to HP and Will, 1–5, where the Nth action in a round needs N successes. **Refresh round** resets every turn to 1; removing the last encounter Pokémon also clears the turns it left behind. Encounter Pokémon show **Add to My Pokémon** at the bottom of their sheet; nature and confidence are in the Info section.

## What was recovered

The original source code, server and source maps were not available. The frontend was rebuilt from the deployed production bundle: bundled libraries were replaced by npm packages pinned to the versions found in it, and the application code was split into modules, renamed and typed. Every screen was compared against the original with screenshots and smoke flows. Some of the original's own bugs remain: for example, a new trainer does not save the chosen nature, and error toasts never show the server's message. Comments in the code mark these quirks.

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
