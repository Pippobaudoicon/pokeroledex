# Crafting

The **Crafting** tab in [My City](cities.md) turns the city's skills into items. Recipes come from the reference items only. The full rules are in the [crafting plan](crafting-plan.md), and the endpoints are in [City API](cities-api.md#crafting-endpoints).

## Craft

**Craft** lists what the city can craft now. Each item shows its skill, its tier (tier N needs city rank N, Starter to Champion), how much of its skill it uses (the tier's effort, 1 to 4), and any assist skill or Catalyst type it needs.

**Show locked recipes** adds the others, along with what each still needs. Long lists show 35 recipes per page, with numbered pages to jump between. Select an item to read its description.

Any member can add items to the **crafting order** and take them out again. Each crafting skill's value is how much of the order its recipes can fill: Apothecary 3 holds three tier 1 Apothecary items, or one tier 4 item and one tier 1.

The leader crafts the whole order at once, with no dice, and the items go to city storage.

## Research

**Research** unlocks tier 3 and higher recipes. Each roll uses the Research skill's dice, and every success is one step towards what the tier needs. The leader rolls in the app or types in the dice of a physical roll.

As GM, the leader can also add or remove steps, or unlock a recipe outright, even a locked one the city couldn't research yet.

## Storage

**Storage** is the city inventory. Any member can store items from one of their trainers, or take items out to one.

The leader can also add any reference item directly (**Add item**) and remove items for good, for example to adjust the city's stock as GM. In **Generators → Items**, the leader can add generated reference or campaign items to a city.

Reference items stack. Custom items are self-contained copies that stay separate, even when different accounts use the same item ID, and members can withdraw and edit them without access to the campaign they came from.

Older stored campaign items are turned into copies by `migrations/0008_city_inventory_copies.sql`, using a current member's item. Any that no member has any more show as **Unavailable item** for the leader to remove.
