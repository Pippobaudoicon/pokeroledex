# Generators

All three generators use a fresh seed for each generation, and you can't pick the seed yourself. The Pokémon and item generators pick from the reference data and the rank point budgets.

## DM encounters

**Generators → Encounters** (`/generators/encounters`) brings the functions of [pokerol-encounter](https://github.com/malagonius/pokerol-encounter) into the app. It generates 1–12 Pokémon, with filters for name, type, generation, habitat, rank, legendary/mythical, fossil, starter family and form. Encounters use the active campaign selection and local reference data, so generating makes no PokeAPI or GitHub requests.

### Encounter cards

Each card has **Lock** (kept across rolls) and **Remove** buttons in its top corner. The chevron at the bottom opens an actions menu:

- **Show encounter** opens the encounter details sheet: full sheets, HP tracking and all rank-eligible moves with calculated dice pools.
- **Ban from generator** removes the species from the encounter and adds it to the banned list.
- **Edit habitat** picks any number of specific habitats for the species. Core Pokémon get a shared override that every player's future habitat filters (both generators and the Pokédex) use; your own campaign Pokémon are updated directly. See [habitats.md](habitats.md#editing-habitats-in-the-app).
- **Roll shiny** rolls two d20s, independent of the seed; double 20 is shiny.

History holds the last encounter's unique templates and excludes them from the next roll. Remove individual entries or clear the history to allow them again. Copy exports the current encounter.

**Banned** lists species excluded from every roll until you remove them. Unlike history it isn't replaced by the next roll, but it is cleared when you leave the Generators page.

Results, HP, shiny status and history last until you reload.

### Running the fight

The encounter details sheet has a **Your Pokémon** tablist above the encounter tablist.

- **Add Pokémon** adds one of My Pokémon, whose HP and Will are saved back to My Pokémon, or any species by name, generated at its recommended rank and kept only for the encounter.
- The × on the active tab removes that Pokémon from the encounter. Its sheet shows no other actions.
- Every tab shows the Pokémon's turn (`1. Obstagoon · Turn 2`). Set it from 1 to 5 with the **Turn** card next to HP and Will. The Nth action in a round needs N successes.
- **Refresh round** resets every turn to 1. Removing the last encounter Pokémon also clears the turns it left behind.
- Encounter Pokémon show **Add to My Pokémon** at the bottom of their sheet. Nature and confidence are in the Info section.
