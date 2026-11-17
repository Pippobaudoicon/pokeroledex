# Crafting

The **Crafting** tab in [My City](cities.md) turns the city's skills into items. Recipes come from the reference items, plus the campaign's entries in a [campaign city](#campaign-cities). The full rules are in the [crafting plan](crafting-plan.md), and the endpoints are in [City API](cities-api.md#crafting-endpoints).

## Craft

**Craft** lists what the city can craft now. Each item shows its skill, its tier (tier N needs city rank N, Starter to Champion), how much of its skill it uses per craft (by default the tier's effort, 1 to 4), how many items one craft makes, and any assist skill or Catalyst type it needs.

**Show locked recipes** adds the others, along with what each still needs. Long lists show 35 recipes per page, with numbered pages to jump between. Select an item to read its description.

Every member has their own **crafting order**. Each crafting skill's value is how much of one order its recipes can fill: Apothecary 3 holds three tier 1 Apothecary items, or one tier 4 item and one tier 1. Each order is checked on its own, so two members can each fill the city's skills.

An order can also hold **research steps** (see [Research](#research)), up to the city's Research value in total. Asking for more steps than a recipe still needs is allowed, but the extra steps are lost when the order is approved.

When their order is ready, a member **submits** it, and can **withdraw** it to change it again. The leader sees the submitted orders under **Orders to approve**, and can change them, **send them back** to the member, or **approve** them. The leader's own order needs no submission.

Approving an order, with no dice, adds its research steps first (recipes that are already unlocked lose theirs), then crafts its items into city storage. Each craft makes the recipe's items per craft.

The leader can change a recipe for their city with **Edit craft**, next to **Add to order** (and in the item's details). The editor sets:

- the **tier** (this changes the city rank and research the recipe needs)
- how much of each crafting skill one craft uses (raise the main skill or add other skills; each skill used needs at least that value)
- the **research steps** it needs (by default the tier's; 0 starts it unlocked)
- **items per craft**, for example 1 Apothecary makes 2 Potions

Edited recipes show an **Edited** badge. **Reset to default** restores the reference recipe. Edits only apply to that city.

## Overrides

The **Overrides** card on a city's **Overview** lists the city's own rules. The leader adds or changes them with **New override**, a wizard:

1. Choose **A Pokémon** or **An item**.
2. Pick a species, or search for a craftable item. Without a search, the city's own species are listed; searching looks through the whole Pokédex, so you can set up a species before any moves in.
3. For a Pokémon, set what every Pokémon of that species adds to each city skill (0 to 14; skills at 0 are closed to it). This replaces the species' full or half bonus in that city only; Catalyst and actions keep its bonus. Any of it working a skill set to 0 stops working there. For an item, the same editor as **Edit craft** opens.

**Reset to species** or **Reset to default** removes an override. Other members see the overrides but can't change them.

## Research

**Research** unlocks tier 3 and higher recipes. Each roll uses the Research skill's dice, and every success is one step towards what the tier needs. The leader rolls in the app or types in the dice of a physical roll.

Any member can also put research steps in their order: once the leader approves it, the city gets that many steps on the recipe, and any steps beyond what the tier needs are lost.

As GM, the leader can also add or remove steps, or unlock a recipe outright, even a locked one the city couldn't research yet.

## Storage

**Storage** is the city inventory. Any member can store items from one of their trainers, or take items out to one.

The leader can also add any reference item directly (**Add item**) and remove items for good, for example to adjust the city's stock as GM. In **Generators → Items**, the leader can add generated reference or campaign items to a city.

Reference items stack. Custom items are self-contained copies that stay separate, even when different accounts use the same item ID, and members can withdraw and edit them without access to the campaign they came from.

Older stored campaign items are turned into copies by `migrations/0008_city_inventory_copies.sql`, using a current member's item. Any that no member has any more show as **Unavailable item** for the leader to remove.

## Campaign cities

A campaign owner can create cities inside a campaign, from the campaign's **Cities** tab. Campaign cities also show in My City, with a link back to their campaign, and work like any other city: members, residents, skills, orders and storage. Core items stay craftable there.

On top of the core items, a campaign city can research and craft its campaign's entries:

| Entry | Crafting makes | Default recipe |
| --- | --- | --- |
| Item | the item, in storage | as a core item of the same pocket and price |
| Move | a **TM · move** item, in storage | Technology, tier 3 for support or powerless moves, else 1 + half the power (2 to 7); the move's type as Catalyst; Research at half the tier's skill |
| Ability | an **Ability Capsule · ability** item, in storage | Technology, tier 5 |
| Pokémon | a new resident of the city (it needs a free slot) | Archaeology, the tier of its recommended rank (8 for legendaries); its types as Catalyst; Nursing at half the tier's skill |

Campaign moves, abilities and Pokémon always need research: tier 1 needs 1 step and tier 2 needs 2, and higher tiers follow the usual table. Campaign items follow the core rules.

Each campaign editor (Pokémon, moves, abilities and items) has a **City crafting** section to turn crafting off, or to change the tier, skill or Catalyst types. Cities can still edit the recipe further with **Edit craft**. The **campaign** chip in Crafting shows only the campaign's entries.

Members who don't own the campaign still see and craft its entries. Deleting a campaign keeps its cities, but they can only craft core items afterwards.
