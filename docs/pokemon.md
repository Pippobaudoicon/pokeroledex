# Pokémon

## Nicknames

Open a saved Pokémon's sheet (including one in a trainer's party), choose **Edit**, and fill in **Nickname (optional)** next to its identity. **Save** keeps the nickname and **Cancel** discards your edits. To go back to the species name, clear the field and save.

Nicknames show on the sheet, in My Pokémon, in trainer parties and in city rosters. The species stays visible on nicknamed sheets. Existing records need no migration.

## Shiny Pokémon

There are two ways to get one:

- In **Generators → Encounters**, **Roll shiny** rolls 2d20 per Pokémon, and a double 20 makes it shiny. **Add to My Pokémon** from its **Details & moves** sheet catches it shiny.
- Any saved Pokémon can be made shiny, or not, with the **Shiny** checkbox under **Edit** on its sheet.

Shiny Pokémon stay shiny when moved to a trainer or a city, or sent to another player. Actual shiny sprites aren't shown yet.

### How they look

Shiny Pokémon get ✨ and an animated gold border with travelling pearly glints. A diagonal white sheen also sweeps across the whole box for 0.9 seconds every 30 seconds. You'll see this in the generator, on their sheet, in My Pokémon, on Home, in trainer parties and in city rosters. With reduced motion enabled, the border stays still and the sheen is hidden.

To change the timing, look at the `shiny-sheen` animation in `src/index.css`:

- Its duration sets the interval.
- Its `3%` keyframe, plus the `2.99%` opacity hold before it, sets how long the sweep lasts: interval × percentage / 100 = sweep seconds.

The flag is `shiny` on the Pokémon record (and on `/api/pokemon/minimal`). Older records simply aren't shiny and need no migration.

## Checking stat points

**Check stat points** (in a Pokémon sheet's **…** menu, and next to **Rank up** on a trainer's sheet) opens a summary of how the sheet's points compare with ranking up from Unranked to its current rank. The rank-up budgets from `rankup-attributes.json` are added together for every rank from Starter up to and including the current one.

- **Attributes, Skills and Socials** show how many points were spent compared with that total: **Matches**, **N to spend**, or **N too many**. Spent points are the stored stats: attribute points above the species' base for Pokémon (or above 1 for trainers), social points above 1, and skill points.
- Skills above the current rank's skill limit are listed, and so are Pokémon attributes above the species' maximum.

The check only reports. It never changes the sheet.