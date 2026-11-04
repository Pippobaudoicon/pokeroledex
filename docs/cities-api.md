# City API

How cities are stored and changed. For what players see, read [My City](cities.md) and [Crafting](crafting.md).

## Storage and concurrency

Cities and their residents are stored in D1 under the owner `city:<city id>`, and `city_members` (migration `0003_city_members.sql`) lists who can load them.

Each request loads the city, changes it and writes it back. Migration `0007_record_checks.sql` rolls the write back if another request changed the city in between, and the Worker runs the request again on the fresh city (up to 5 times, then 409). So members moving items or crafting at the same moment never lose or duplicate items.

Moving a Pokémon into or out of a city moves its record between that city and the person's own records.

## City endpoints

| Endpoint | Does |
| --- | --- |
| `GET`, `POST /api/cities` | List or create cities |
| `GET`, `PATCH`, `DELETE /api/cities/:id` | Load, update or delete a city (`DELETE` leaves it when it's shared) |
| `POST /api/cities/:id/members` | Invite a member with `{ email }` |

City `PATCH` accepts `name`, `rank`, `tags` and `assignments`:

```json
{ "<pokemon id>": "skill:metallurgy" | "tag:Can heal" | null }
```

Assignments are merged into the stored ones, so members' changes don't overwrite each other. A skill the resident's species can't work is refused.

The response adds these derived fields:

- `limits`, `skills` and `tagValues`
- `catalysts` (type → strongest Catalyst bonus)
- each resident's `bonuses` and `profiles`
- `inventory` (hydrated like a trainer's)
- `research` (steps per item ID)
- `order` (the crafting order, `{ itemId, quantity }[]`, where quantity counts crafts)
- `recipes` (the city's recipe edits per item ID, `{ tier?, costs?, yield? }`)

## Crafting endpoints

The rules are in the [crafting plan](crafting-plan.md) and `shared/crafting.ts`.

| Endpoint | Who | Body | Does |
| --- | --- | --- | --- |
| `POST /api/cities/:id/order` | Any member | `{ itemId, quantity }` | Sets how many of a reference item are in the crafting order (0 takes it out). Raising it needs a craftable recipe and room in every skill it uses: each craft uses the recipe's cost of each skill (by default its tier's effort of its own skill) |
| `POST /api/cities/:id/craft` | Leader | `{}` | Adds quantity × items per craft of each order line to the city inventory and empties the order, if every recipe is still craftable and fits |
| `POST /api/cities/:id/recipe` | Leader | `{ itemId, recipe: { tier?, costs?, yield? } \| null }` | Edits the city's recipe for a craftable item: tier 1–8, skill costs 0–14 per crafting skill (at least one above 0), items per craft 1–99. Only differences from the default are kept; `null` resets it |
| `POST /api/cities/:id/research` | Leader | `{ itemId, faces? }` | Rolls Research and adds one step per success, up to what the tier needs |
| `POST /api/cities/:id/steps` | Leader | `{ itemId, steps }` | Sets a recipe's research steps (0 to what its tier needs) without the rank or Research gates |
| `POST /api/cities/:id/inventory` | Any member | `{ trainerId, entryId, quantity, direction: "deposit" \| "withdraw" }` | Moves items between one of your trainers and the city; reference items stack |
| `POST /api/cities/:id/stock` | Leader | `{ itemId, quantity }` | Adds 1 to 999 of a reference item or an item from the leader's collection straight to the city inventory (no recipe needed); custom items are copied inline |
| `POST /api/cities/:id/discard` | Leader | `{ entryId, quantity }` | Removes items from the city inventory for good |

A few rules worth knowing:

- `faces` are the dice of a physical research roll. They must match the pool, each 1 to 6. Without them the server rolls.
- A recipe that can't be ordered, crafted or researched yet answers 409 with the reasons: rank, research, skill, assist, catalyst or room in the order.
- Lowering an order line is always allowed, so an order that no longer fits (a resident moved off the skill, say) can be trimmed.
- The last member can't delete a city that still stores items.

## Pokémon endpoints

- Moving a Pokémon to a city or trainer uses the existing Pokémon `PATCH` endpoint, which validates destinations among the person's trainers and cities.
- Taking ownership explicitly uses `{ id, takeOwnership: true }` on Pokémon `PATCH`.
- `GET /api/pokemon` and `/api/pokemon/minimal` list only personal Pokémon.
- `GET /api/pokemon/all` includes city residents, for city management.

## Migrations

Values saved by hand before skill values were calculated are ignored. Migration `0005_city_string_tags.sql` turns the `{ name, value }` actions from `0004_city_work_skills.sql` back into plain action names.

Migration `0006_city_crafting_skills.sql` moves assignments from the old work skills to the closest new skill. Assignments the species can't work are dropped, so those residents show up unassigned.

| Old work skill | New skill |
| --- | --- |
| Medicine Production, Farming, Planting | Apothecary |
| Handiwork | Craftsmanship |
| Generating Electricity | Technology |
| Mining | Metallurgy |
| Science | Research |
| Transporting | Foraging |

## Tests

City regression tests run with `pnpm test`. They exercise the actual API handler against an isolated in-memory SQLite database and reference fixtures, without touching Cloudflare or your local development records.
