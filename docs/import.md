# Importing from pokeroledex.nl

The **Import** page (`/import`) copies your data over from pokeroledex.nl:

- Pokémon sheets
- trainers, with their team and inventory
- campaigns, with the moves, abilities, items and Pokémon templates in them

It needs your pokeroledex.nl login token. A bookmark on the page grabs it while you're logged in there and brings you back, or you can paste it from the browser's developer tools.

Records keep their IDs, so importing again updates them instead of duplicating them.

## How it works

The Worker fetches the data (`worker/import.ts`), because pokeroledex.nl only allows its own pages to call its API.
