# Data

The app keeps two kinds of data apart.

**Reference data** is the game itself: 1,196 Pokémon forms, 892 moves, 394 items, 305 abilities, 25 natures and the rank-up tables. It lives in `data/reference/` and is published read-only as `/reference/*.json`. The rank-up tables have no entry for Unranked or Champion. Habitats have [their own page](habitats.md).

**Your data** is everything players make: Pokémon sheets, trainers, campaigns, custom entries and notes. It's stored in D1, in one `records` table, under the owner's email.

## Backups

```sh
pnpm exec wrangler d1 export pokeroledex --remote --output backup.sql
```

Use `--local` instead of `--remote` to back up your development database.

## Generators

The Pokémon and item generators are seeded, and pick from the reference data and the rank point budgets. See [Generators](generators.md) for the encounter generator.
