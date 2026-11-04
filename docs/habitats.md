# Habitats

Core Pokémon habitats are replaced when the reference data is built, not fetched at runtime.

## The files

| File | Contents |
| --- | --- |
| `data/reference/pokemon-habitats.json` | One record per Pokédex template, including forms: normalized habitat IDs, source article/revision/sections, status, and the species name when inherited |
| `data/reference/habitats.json` | The 31 normalized specific habitats, their `macroId`, and Pokémon/form counts (including zero counts) |
| `data/reference/habitat-macros.json` | The eight macro habitats, their specific habitat IDs, and distinct Pokémon/form counts. A Pokémon assigned to several specifics in a macro counts once for that macro |
| `shared/habitats.ts` | The taxonomy, labels, legacy aliases and matching used by the Pokédex, both generators and the campaign template editor |

Both catalogs and `pokemon-habitats.json` are published at `/reference/<name>.json`.

## The taxonomy

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

Pokémon store **specific habitat IDs only**, deduplicated and sorted, and macro membership is derived from them. Every specific belongs to one macro, and a Pokémon can belong to several macros through several specifics.

A few placements that might surprise you:

- Ordinary mountains and peaks do **not** imply Ice & Snow.
- Polar Seas and Icy Caves belong to Ice & Snow, not Water & Coasts or Mountains & Underground.

## In the app

The Pokédex and both generators share one grouped picker: select a whole macro or individual specifics, and a Pokémon matches **any** selection. Each macro has its own coloured icon. In both generators, the Habitats section starts collapsed, shows the selection count, and keeps your selections and expanded specifics when closed.

The Pokédex profile shows macros, specific habitats, the source or review fallback, and a link to the article revision the data came from.

## Current coverage

The initial collection queried all 1,023 species articles for 1,196 templates (including Egg):

| Status | Entries |
| --- | --- |
| Documented | 408 |
| Inherited from a species, explicitly | 80 |
| Awaiting review | 707 |
| Not applicable (Egg) | 1 |

The 73 habitat values in the base data are normalized into **31 specific habitats under eight macros**. 30 specifics currently have Pokémon assigned, and Outer Space is available for future or campaign assignments.

This is a conservative automated extraction, not a fully human-reviewed database. An unmatched statement doesn't prove a Pokémon lacks a documented habitat.

## Synonyms and legacy values

Synonyms merge into a single stored value:

| Terms | Stored as |
| --- | --- |
| forest, woodland, temperate forest | `FORESTS` |
| plains, prairies, savannas | `GRASSLANDS` |
| rivers, streams | `RIVERS_AND_STREAMS` |
| bogs, swamps, marshes | `WETLANDS` |
| houses, buildings, cities | `URBAN_AREAS` |

Legacy combined categories map to one broad normalized value, not every possible child. For example, Glaciers/Mountain Peaks/Icy Caves becomes `ICE_AND_SNOW` without inventing separate icy-cave evidence. The complete alias mapping is in `shared/habitats.ts`.

Existing campaign templates and legacy API filter values stay readable through this mapping. Campaign responses normalize old IDs without changing their stored records, and creating or updating a template's habitats saves canonical IDs. The campaign editor offers only normalized specifics and previews their macros. Generator filters accept macro IDs, but they're rejected as stored Pokémon habitat values. Campaign assignments are not replaced with Bulbapedia data.

## How collection works

The collector reads Bulbapedia's **Biology** and **Pokédex entries** sections, not game encounter locations or the older FireRed/LeafGreen habitat classification. It normalizes synonyms and separates regional and form evidence.

- Where form-specific evidence matches, it takes precedence over shared species evidence. Otherwise a form may explicitly inherit shared species habitats.
- If no supported statement matches, the entry is marked `needs-review` and keeps the normalized equivalent of its default habitats. The base Pokémon data isn't changed.

## Refreshing

```sh
pnpm habitats:refresh            # resume or reprocess cached articles
pnpm habitats:refresh --refresh  # fetch current revisions again
pnpm build
```

Articles are cached in `node_modules/.cache/pokeroledex-habitats/`. Requests use the public MediaWiki API in small sequential batches. Failures stop collection explicitly, and completed article batches stay cached.

Collection rewrites the habitat assignments and both catalogs, so review the Git diff before keeping a refresh or overwriting manual edits. No article prose is stored in the published datasets.

## Curating an assignment by hand

1. Edit the record in `pokemon-habitats.json`, using specific IDs from `shared/habitats.ts`, a source revision and section, and `documented` (or `inherited` with `inheritedFrom`).
2. Run `pnpm build`. This applies the change, normalizes and deduplicates stored assignments, and regenerates both the checked-in and published catalogs.

Your overrides are safe, because the base Pokémon JSON stays unchanged and the build applies this separate dataset. Missing or stale template mappings fail the build and mean you need to run the collector again.

## Editing habitats in the app

**Edit habitat** in an encounter card's menu (`PUT /api/pokemon-templates/<id>/habitats` with `{ "habitats": [...] }`) changes a Pokémon's specific habitats without a rebuild:

- **Core Pokémon** get a shared override in D1 (owner `global`, collection `habitat-overrides`) that applies for every player. The API serves the overridden habitats wherever templates appear, so generator filters and the Pokédex use them, and marks the template `habitatsEdited`; the Pokédex then shows the source as edited. Saving the reference habitats again deletes the override.
- **Your own campaign Pokémon** are updated directly. Other players' campaign Pokémon can't be changed.

The catalog counts in `habitats.json` and `habitat-macros.json` are built from the reference data and don't include overrides. To make an override permanent, copy it into `pokemon-habitats.json` as described above.
