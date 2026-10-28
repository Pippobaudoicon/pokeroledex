# City crafting: plan and rules

Status: revision 4. Build steps 2 (rules, exceptions and review drafts) and 3 (new city skills, work profiles, Catalyst, migration `0006`) are done.

## Goal
A "Crafting" tab in My city.
- From the city's skills, its residents and its rank, it suggests items the city can craft.
- Crafted items go into a **city inventory**. Players deposit and withdraw items there, so players and the city can exchange items.
- Higher-tier items must first be **researched**.

Scope: only the reference items (`data/reference/items.json`, 394 items) under the item filters (pockets and categories). Campaign items are ignored for now.

## Who does what
- **Leader (GM)** = `city.members[0]`. Only the leader crafts and researches, with no attempt limit.
- **Any member** can deposit items into, and withdraw items from, the city inventory.
- Crafting and research cost nothing. Skills, catalysts and rank are the only gates.

## City skills (replace the current 8 work skills)
Residents work on a skill. The skill's value is the sum of its workers' bonuses, capped by city rank (`shared/cities.ts`, unchanged). Custom actions (tags) stay as they are: free-form, and not part of the crafting rules.

### Crafting skills (each gives the dice pool for its recipes)
| Skill | Makes (~items) | Full-bonus types | Half-bonus types | Key attribute |
|---|---|---|---|---|
| **Apothecary** | Medicine pocket (healing, status, vitamins), berries, seeds, roots, herbs, powders, food and drinks, repels (~108) | Grass, Poison, Bug, Water | Ice, Ground | Insight |
| **Craftsmanship** | Tents, saddles, scarves, bands, belts, glasses, vests, boots, dolls, gear (~47) | Normal, Bug, Fighting | Fairy, Dark, Grass, Flying | Dexterity |
| **Technology** | Pokéballs, Pokédex, bike, stove, batteries, eject items, battle orbs, TM/TR, drives (~45) | Steel, Electric | Psychic, Normal, Fire | Special |
| **Metallurgy** | Evolution stones, gems, hard stone, metal coat, weather rocks, claws, lenses, iron ball (~60) | Rock, Ground, Steel, Fire | Fighting, Ice | Strength |
| **Archaeology** | Mega stones, Z-crystals, plates, memories, incense, spell/cleanse tags, Lucky Egg, Amulet Coin, Destiny Knot (~140, 82 of them Mega stones and Z-crystals, which are tier 6-7) | Ghost, Dragon, Dark, Psychic, Fairy | Rock, Ice | Special |

- Engineering and Science from revision 1 are merged into **Technology** because they overlapped. Research is now a support skill.
- Revision 3 adds **Archaeology** for the relic and legendary-flavoured items. This keeps Metallurgy to smithing and mining, and gives Ghost, Dragon and Dark a real crafting role. Cultivation (berries, food) stays in Apothecary.

### Support skills (do not count toward crafting)
| Skill | What it does | Full-bonus types | Half-bonus types | Key attribute |
|---|---|---|---|---|
| **Research** | Its pool is rolled to unlock recipes | Psychic, Dragon | Electric, Steel, Ghost | Insight |
| **Nursing** | City healing for Pokémon and trainers. Value only | Fairy, Normal, Water | Psychic, Grass | Vitality |
| **Foraging** | Finding things. Value only | Flying, Ground, Ghost, Dark | Bug, Grass, Water | Dexterity |
| **Catalyst** | Provides the types that catalyst recipes need (see Catalysts). Adds no dice | Any type | none | none |

The type columns are a **guide**: they are where each species' work profile starts (next section). They live in data (`shared/crafting.ts`) so they are easy to tune.

### Pokémon work profile (per species)
Every species has a work profile: for each skill it is **full**, **half** or **none**. It is computed in three steps:
1. **Types.** If any of its types is in the skill's full-bonus list, it starts at full. If any is in the half-bonus list, it starts at half. Otherwise it starts at none. A dual type takes its better type.
2. **Aptitude.** The species' max value in the skill's key attribute (`maxStats` in the species data) can raise the starting level:
   - 6 or more raises half to full.
   - 7 or more raises none to half. This only happens to exceptional species; for example, Alakazam's high Dexterity opens half Craftsmanship.
3. **Species exceptions.** `data/crafting-species.json` overrides any skill for a species, for example:
   - Porygon line: full Technology and full Research.
   - Chansey line and Audino: full Nursing.
   - Sableye and Carbink: full Metallurgy.
   - Smeargle: full Craftsmanship.
   - Rotom: full Technology.
   - Unown and Bronzor line: full Archaeology.

   An exception can apply to the whole evolution line. No exception may leave a species without a crafting skill (a test checks this).

Rules for residents:
- A resident can **work** a skill only if its species is full or half in it. The server rejects any other assignment. Catalyst accepts every resident.
- **Bonus:** full adds the resident's normal bonus (`residentBonus`: stage 1-3, 2 for species without evolutions, 5 for legendaries). Half adds half of that, rounded down, and at least 1.
- The profile is shown on the Pokémon detail page (catalog and sheets), so players can see what each species can do in a city before assigning it. Custom species get a profile automatically from their types and stats.

Simulated against the 1,196 reference species:
- Every species can work at least one crafting skill. Most can work 2-3; 17 can work all 5.
- Examples:

| Species | Full | Half |
|---|---|---|
| Oddish | Apothecary | Craftsmanship, Nursing, Foraging |
| Magnemite | Technology, Metallurgy | Research |
| Machamp | Craftsmanship, Metallurgy | none |
| Charmander | Metallurgy | Technology |
| Sableye (before its exception) | Archaeology, Foraging | Craftsmanship, Research |

### Catalysts
- Some recipes need a resident of a specific type working the **Catalyst** support skill. Example: a Fire Stone needs a Fire-type there; a Water Gem needs a Water-type.
- Catalyst accepts any type. A catalyst resident adds no dice to anything; it only provides its types. One Water catalyst covers every Water recipe (Water Stone, Water Gem, Splash Plate, Waterium Z) in every crafting skill.
- **Catalyst strength.** A catalyst's strength is its `residentBonus`. A recipe needs a catalyst of the right type with at least the strength in the tier table: 1 for tiers 1-2, 2 for tiers 3-5, 3 for tiers 6-8. A legendary (5) always qualifies. A single-stage species (2) can catalyse up to tier 5. Tiers 6-8 need a stage 3 Pokémon or a legendary.
- Assignment targets stay `skill:<skill>` (including `skill:catalyst`) and `tag:<action>`. No new prefix is needed.
- Catalysts are derived from item names, with overrides where needed:
  - `<Type> Gem`, `<Type>ium Z`, `<Type> Memory` map to that type.
  - Plates, drives, type-boosting items and incenses map by lookup (Flame Plate → Fire, Douse Drive → Water, Charcoal → Fire, Sea Incense → Water, ...).
  - Evolution stones: Fire → Fire, Water → Water, Thunder → Electric, Leaf → Grass, Ice → Ice, Moon → Fairy, Sun → Fire, Dusk → Dark, Dawn → Psychic, Shiny → Fairy.
  - Mega stones and signature Z-crystals need **any one** of the species' types (Charizardite: Fire or Flying; Pikanium Z: Electric).
- About 149 items have a catalyst.

### Migrating the existing assignments
| Old skill | New target |
|---|---|
| `medicine_production`, `farming`, `planting` | `skill:apothecary` |
| `handiwork` | `skill:craftsmanship` |
| `generating_electricity` | `skill:technology` |
| `mining` | `skill:metallurgy` |
| `science` | `skill:research` |
| `transporting` | `skill:foraging` |

- Assignments that break the type rules after migration are dropped when the city is loaded, so those residents show up as unassigned.
- One SQL migration (`0006`) rewrites the stored `assignments`.
- New skills use Lucide icons in the app; the old `public/images/myCity/*.webp` work-skill icons are no longer used.

## Recipes

### Recipe shape
`{ itemId, skill, tier, catalyst?: PokemonType[] (any of), assist?: { skill, min } }`.

- The tier gives `minSkill`, `minRank`, `effort` and research cost (table below).
- `assist` is the optional cross-skill interaction. The other skill's value must be at least `min`, and every 3 points of it add +1 die. Default assists:

| Recipe | Assist skill | Minimum |
|---|---|---|
| TM/TR | Research | 3 |
| Vitamins | Technology | 2 |
| Mega stones and Z-crystals | Research | 5 |

### Tiers
A recipe is **craftable** when all of these hold:
- it is unlocked (by research or by default);
- the city rank is at least `minRank`;
- the skill value is at least `minSkill`;
- the catalysts are present;
- the assist minimum is met.

There are 8 tiers, matching the Pokérole ranks: tier N needs city rank N (tier 1 Starter … tier 8 Champion). An Unranked city cannot craft anything.

| Tier | Rank | minSkill | Successes per item | Research steps | Min Research to start | Catalyst strength |
|---|---|---|---|---|---|---|
| 1 | Starter | 1 | 1 | not needed | not needed | 1 |
| 2 | Rookie | 2 | 1 | not needed | not needed | 1 |
| 3 | Standard | 3 | 1 | 3 | 3 | 2 |
| 4 | Advanced | 4 | 2 | 5 | 4 | 2 |
| 5 | Expert | 5 | 2 | 7 | 5 | 2 |
| 6 | Ace | 6 | 3 | 9 | 6 | 3 |
| 7 | Master | 8 | 3 | 12 | 8 | 3 |
| 8 | Champion | 10 | 4 | 15 | 10 | 3 |

Every minimum fits within the skill cap of its rank (`5 + rank level`); a test checks this.

### Default tier
The default tier comes from `trainerPrice` where there is one:

| Price up to | 200 | 600 | 1500 | 3500 | 7000 | 12000 | 25000 | above |
|---|---|---|---|---|---|---|---|---|
| Tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

For example: Pokéball 1, Greatball 2, Ultraball 3, Fire Stone 5, TM High Power 8.

Unpriced items use a category default:

| Items | Default tier |
|---|---|
| Status items, basic berries | 1 |
| Other berries, gems, incense, trainer items | 2 |
| Healing, type-boosting items | 3 |
| Battle items, unpriced Pokéballs, other held items | 4 |
| Plates, memories, drives, mon-boosting items, evolution items | 5 |
| Vitamins, type Z-crystals | 6 |
| Mega stones, signature Z-crystals | 7 |
| Rare Candy (exception) | 8 |

`data/crafting-items.json` holds per-item changes to skill, tier, catalyst and assist, plus the "not craftable" list (Masterball, Soul Dew, Adamant/Lustrous/Griseous Orb, legendary Mega stones and Z-crystals).

### Craft roll
- **Pool:** the city skill value plus assist dice, in d6. A die showing 4 or more is a success (same as `DiceRoll`).
- The server rolls, or the leader types in the faces of a physical roll (the server checks that the number of dice equals the pool size).
- **Quantity:** `floor(successes / effort)`. Example: Apothecary 4 and Technology 6 means 4 dice for Potions and 6 dice for Pokéballs.

### Research roll
- **Pool:** the Research value. Each success adds one step to the chosen recipe.
- A recipe is unlocked for good when its steps reach the number in the tier table.
- Starting research needs the rank and minimum Research value from the tier table. It does **not** need catalysts, so the city can unlock recipes ahead of time.

## Architecture
1. **`shared/crafting.ts`** (done) holds:
   - the skill definitions (crafting or support; full-bonus and half-bonus types; key attribute);
   - the tier table;
   - `workProfile` and `speciesOverrides` (species), and `itemRecipe` (items: default skill, tier, catalyst and assist, then the item exception).
   - Still to add: `residentSkillBonus`, `recipeStatus` and `resolveRoll`.
2. **Exceptions** (done): `data/crafting-items.json` and `data/crafting-species.json`.
   - Recipes are derived on the fly from `items.json` and these files, so there is no generated recipe file.
   - **`scripts/crafting-report.ts`** (`pnpm crafting:report`) writes the review drafts `docs/crafting-review/recipes.md` and `docs/crafting-review/species.md`.
3. **`shared/types.ts`**:
   - `CITY_SKILLS` becomes the 9 new skills (5 crafting, 4 support).
   - `City` gains `inventory`, `research` and `catalysts` (the types present in Catalyst, each with its best strength).
4. **`shared/cities.ts`**: `cityValues` applies each resident's work profile (full or half bonus) and collects the catalyst types and strengths.
5. **Worker API**:
   - `POST /cities/:id/craft { itemId, faces? }` (leader only)
   - `POST /cities/:id/research { itemId, faces? }` (leader only)
   - `POST /cities/:id/inventory { trainerId, entryId, quantity, direction }` (any member)
   - The city response includes the hydrated inventory and each recipe's status with the reason it is locked.
6. **UI**:
   - In `src/pages/MyCity/index.tsx`, the work board only offers each resident the skills in its work profile (Catalyst always), showing full or half.
   - A new **Crafting** tab has three parts: Craftable, Research and Storage.
   - The Pokémon detail page shows the species' work profile.
7. **Tests:**
   - `tests/crafting.test.mjs` covers work profiles, catalysts, tiers, the roll maths and research.
   - Update `tests/cities.test.mjs` for the new skills.

## Build order
1. Sign off this document.
2. Generate two drafts for review: the recipe table (per skill and tier) and the species work-profile report. Then write both exceptions files.
3. Skill migration, work profiles and catalysts (shared logic, `0006` migration, work board UI, detail page, tests).
4. Recipes, craft and research API, and city inventory.
5. Crafting tab UI.
6. README.

## Decided
- Catalysts are a support skill named **Catalyst**, with strength rules by tier.
- Nursing and Foraging show a value only, with no rolls.
- The fifth crafting skill is **Archaeology**.
- What a resident can work comes from its **species' work profile**: types (as a guide), then attributes, then species exceptions.

## Open questions
None blocking. Type lists, thresholds and exceptions are tuned in build step 2 against the generated reports.
