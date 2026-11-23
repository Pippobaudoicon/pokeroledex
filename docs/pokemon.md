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

## Filtering by trainer

The selector next to the search in **My Pokémon** shows **All trainers**, only **Unassigned** Pokémon, or one trainer's party. The choice is remembered for the browser tab. `/api/pokemon/minimal` includes each Pokémon's `trainerId` for this.

## Teams

A team is a saved group of your Pokémon that you can hand to a trainer in one go. Create and edit teams from **Teams** in **My Pokémon**:

- **New team** creates an empty team; **Start from a party** saves a trainer's current party as a team.
- Name the team (up to 60 characters), tick its members and **Save team**. **Delete team** removes only the team, never its Pokémon.

To use a team, open a trainer and choose **Use a team** in their **Party**, then pick a team. The team becomes that trainer's whole party. Party members that aren't in the team become unassigned, and team members in another trainer's party move over. A summary lists who moves before you confirm. The team that already matches the party is marked **Current party**.

Teams are stored in the `teams` collection (`/api/teams`) as `{ id, name, pokemonIds }`. Only your own Pokémon can be members. Pokémon that are deleted or moved into a city drop out of the team.

## Fainting and swapping in a fight

While fighting on a saved Pokémon's sheet (**…** → **Fight**), its party can take over:

- **Swap Pokémon** opens the party picker. Choose a party member with HP left and its sheet opens in the same fight, one turn later than the current one. Swapping uses an action, so it's unavailable on turn 5.
- When the fighting Pokémon reaches 0 HP, a dialog says it fainted and asks whether to send in another Pokémon. **Yes** opens the same picker and **No** keeps the fight open.
- If no other party member has HP left (or the Pokémon has no trainer), the picker says no Pokémon is available. After a faint, it also warns that the encounter ends for you and offers **End fight**.

## Throwing Poké Balls in a fight

While fighting on a saved Pokémon's sheet, the **Battle** section has a **Poké Balls** group below **Moves** listing every ball in the trainer's inventory (the Poké Balls pocket: Pokeball, Greatball, Ultraball and so on) with how many are left.

- **Throw** takes one ball out of the trainer's bag and rolls the throw accuracy (Dexterity or Strength, whichever is higher, + Throw). Balls with a fixed seal potency then offer to roll the seal.
- The **Acc** and **Seal** numbers under each ball roll those pools without using a ball.
- A ball that reaches 0 stays in the inventory at quantity 0 but leaves the list. If the Pokémon has no trainer or the trainer has no balls, the group says so.

## Evasion and Clash in a fight

During a fight (on a Pokémon's sheet or in an encounter), the **Evasion** and **Clash** pools track their use like moves do:

- Tap **Evasion** to check it as used this round; the pool is crossed out like a used move. Tap its number to roll the Evasion dice.
- Tap **Clash** to pick the move you clash with. Only Physical or Special moves not used yet this round are listed. The chosen move is crossed out in **Moves** and the Clash pool is crossed out like a used move (hover it to see the move). Tap **Clash** again, or uncheck the move, to clear the clash.
- Clash shows two numbers, Strength + Clash and Special + Clash. Tap one to roll it. After a clash with a Physical or Special move, the pool that doesn't apply is dimmed.
- **New round** and **Refresh round** clear Evasion and Clash together with the used moves.