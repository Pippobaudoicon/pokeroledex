# PokéroleDex

A companion app for the Pokérole tabletop RPG. Look up Pokémon, moves and items, keep your sheets and trainers in one place, run campaigns, roll encounters, build a city that crafts items, and read the rulebook.

It's a React + TypeScript app that runs on a single Cloudflare Worker.

## Get it running

You need Node.js 24 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Then open the URL Vite prints. No Cloudflare account? Use `pnpm dev:offline`, where everything works except most of the rulebook. [Development](docs/development.md) has the details and the full list of commands.

## Docs

**Using the app**

| Topic | What's in it |
| --- | --- |
| [Pokémon](docs/pokemon.md) | Nicknames and shiny Pokémon |
| [My City](docs/cities.md) | Residents, ranks, skills and sharing a city with friends |
| [Crafting](docs/crafting.md) | Crafting orders, research and city storage |
| [Generators](docs/generators.md) | Rolling encounters and running them at the table |
| [Rulebook](docs/rulebook.md) | The five ways to read the book, and how to upload it |
| [Importing](docs/import.md) | Bringing your data over from pokeroledex.nl |

**Working on the app**

| Topic | What's in it |
| --- | --- |
| [Development](docs/development.md) | Running locally and the command list |
| [Architecture](docs/architecture.md) | Where things live, how requests are served, offline support, known issues |
| [Data](docs/data.md) | Reference data, player data and backups |
| [Habitats](docs/habitats.md) | The habitat taxonomy and how to refresh or curate it |
| [City API](docs/cities-api.md) | City storage, concurrency and endpoints |
| [Crafting plan](docs/crafting-plan.md) | The full crafting rules and design |
| [Deployment](docs/deployment.md) | Deploying, previews and logins |
| [Issue reports](docs/issue-reports.md) | Setting up the Suggest a feature form |

## Legal

Pokérole rules and Pokémon assets belong to their respective creators.
