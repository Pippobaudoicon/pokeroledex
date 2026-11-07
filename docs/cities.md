# My City

Open **My City** from the sidebar, Home or app search. Each account can create several named cities and switch between them.

For what cities can make, see [Crafting](crafting.md). For storage and endpoints, see [City API](cities-api.md).

## The overview

The overview starts with what the city can do, then counts residents by type and rank. Each populated rank gets one compact block, ordered from Unranked to Champion, showing all 18 types. Each type is a bar with its count, filled by its share of the Pokémon at that rank.

The resident limit belongs to the whole city and grows with its rank, so it appears once, as a total bar above the types (22 / 25 Pokémon, for example). A dual-type resident counts once under each type, so the type counts can add up to more than the population.

## Residents

**Add Pokémon** creates a sheet from a core or campaign species, or moves an existing sheet from My Pokémon, a trainer or another city.

- A Pokémon belongs to at most one city or trainer. Transfers keep its ID, stats and moves.
- New sheets use the selected rank but start with unallocated stats and moves, which you can edit from the city roster.
- City residents are separate from your personal **My Pokémon** collection, including residents created directly from the Pokédex.
- Moving a personal Pokémon into a city removes it from My Pokémon. Cached personal and trainer lists refresh before the transfer reports success.

The **Pokémon roster** is a grid of cards linking to each city sheet. A card's **⋯** menu moves the resident to another city, a trainer or **My Pokémon**. The city leader can also delete it for good after a confirmation, which frees its slot and its assignment.

A city must be empty before it can be deleted.

## City rank

Every city has a rank, like trainers and Pokémon. New and older cities start Unranked. Counting the rank level from 1 (Unranked) to 9 (Champion):

- A city holds at most **4 + 3 × level** residents (Unranked 7, Starter 10, Rookie 13, Standard 16…).
- Every skill or action shows at most **5 + level** (Unranked 6, Starter 7 … Advanced 10).

Adding or moving a Pokémon into a full city fails, and a city can't drop to a rank too small for its current residents.

## Skills and actions

**Skills & actions** is where you put residents to work. Drag a resident from **Unassigned** onto a city skill or a custom action such as "Can heal". Dragging works with a mouse or touch, and scrolls near the screen edges. You can also tap or press Enter on a resident, then on its destination, and Escape cancels. Each resident works on one skill or action at a time.

City skills are shown as compact coloured icons. Above each icon is the number of residents working that skill, and below it the skill's value against the rank cap (Catalyst shows how many types it covers). From tablet width up the skill name is shown too, and on wide screens crafting and support skills sit side by side. Tap a skill (or hover it with a mouse) to open it: the panel slides open with every resident working the skill, and switching to another skill slides the new one in from its side. Those residents can be dragged or tapped out again. Hover-opened panels close when the mouse leaves the group; a click keeps one open, and clicking it again or pressing Escape closes it. To assign a resident, drag it onto a skill icon or open panel, or select it and tap the icon. While dragging, holding a resident over a skill it can work opens that skill, so you can drop it straight into the panel; dropping it anywhere else puts back whichever skill was open before. Custom actions stay as full cards.

The skill icon and the ⓘ button in an open skill both explain what it does, how residents increase it, its rank cap and which species can work it. Catalyst explains type coverage and strength instead. Help is available even before you add residents.

City settings below the board edit the name, rank and custom actions, and you save them explicitly. Removing an action or moving a resident out of the city unassigns it.

City skills are grouped for crafting (see the [crafting plan](crafting-plan.md)):

| Kind | Skills |
| --- | --- |
| Crafting (dice for recipes) | Apothecary, Craftsmanship, Technology, Metallurgy, Archaeology |
| Support | Research (unlocks recipes), Nursing, Foraging, Catalyst |

### Which species can work what

A resident's species decides which skills it can work. Its **work profile**, shown under **City work** on its Pokédex page, is full, half or closed for each skill.

It starts from the species' types, and a high max attribute raises it: 6+ turns half into full, and 7+ opens a skill at half. Hand-tuned exceptions live in `data/crafting-species.json` and the rules are in `shared/crafting.ts`. `pnpm crafting:report` writes every species' profile and every item's recipe to `docs/crafting-review/`.

**Catalyst** takes any resident. It adds no value, and instead provides the resident's types, at its bonus, to recipes that need them.

### Skill values

A skill's value is the sum of its residents' bonuses, capped by the city rank. A half skill counts for half the bonus, and at least 1.

| Resident | Bonus |
| --- | --- |
| First evolution stage (Charmander, Pichu, Eevee) | +1 |
| Second stage (Charmeleon, Pikachu, Vaporeon) | +2 |
| Third stage (Charizard, Raichu, Gardevoir) | +3 |
| Species that never evolve (Tauros, Rotom) | +2 |
| Legendary | +5 |

Mega Evolutions and alternate forms (Rotom Wash, Aegislash Blade) use their base form's bonus. Values are calculated from the residents, so they can't be set by hand.

## Sharing a city

**Skills & actions → Members** invites friends by the email they log in with. Every member has the same rights as the creator: they see the city, edit its skills and residents' sheets, add their own Pokémon, take residents into their own My Pokémon or trainers, and invite others.

There's no email notification. The city appears in your friend's My City the next time they open it. In production, your friend must also be allowed through the Cloudflare Access policy (see [Production login](deployment.md#production-login)).

When other members remain, **Leave city** removes only you. The last member deletes the city, which must be empty first. Edits are last-save-wins.

### Campaigns stay private

A city doesn't share its members' campaigns.

- A resident built from a custom species keeps showing its species, moves, abilities and held item to whoever has it, read-only, but the campaign never appears in their Campaigns list.
- A sheet can only be pointed at entries its editor can already see.
- A custom species can't be deleted while a sheet in another account or a shared city still uses it.
