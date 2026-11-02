// Writes the read-only reference data as compact static assets for the Worker.
// pokemon-templates.json embeds every move and ability object (20 MB); the compact
// copy keeps ids only and worker/reference.ts hydrates them again.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { CompactPokemonTemplate, PokemonTemplate } from '../shared/types.ts';
import { habitatCatalog, habitatMacroCatalog, normalizeHabitats, replaceHabitats } from '../shared/habitats.ts';
import type { PokemonHabitatEntry } from '../shared/habitats.ts';

const source = new URL('../data/reference/', import.meta.url);
const target = new URL('../public/reference/', import.meta.url);
mkdirSync(target, { recursive: true });

for (const name of ['natures', 'abilities', 'moves', 'items', 'rankup-attributes']) {
  writeFileSync(new URL(`${name}.json`, target), JSON.stringify(JSON.parse(readFileSync(new URL(`${name}.json`, source), 'utf8'))));
}

const base: PokemonTemplate[] = JSON.parse(readFileSync(new URL('pokemon-templates.json', source), 'utf8'));
const habitats: PokemonHabitatEntry[] = JSON.parse(readFileSync(new URL('pokemon-habitats.json', source), 'utf8'));
const normalized = habitats.map(entry => ({ ...entry, habitats: normalizeHabitats(entry.habitats) }));
const templates = replaceHabitats(base, habitats);
const catalog = habitatCatalog(templates);
const macros = habitatMacroCatalog(templates);
writeFileSync(new URL('pokemon-habitats.json', source), JSON.stringify(normalized, null, 2) + '\n');
writeFileSync(new URL('habitat-macros.json', source), JSON.stringify(macros, null, 2) + '\n');
writeFileSync(new URL('habitat-macros.json', target), JSON.stringify(macros));
writeFileSync(new URL('habitats.json', source), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('habitats.json', target), JSON.stringify(catalog));
writeFileSync(new URL('pokemon-habitats.json', target), JSON.stringify(normalized));
const compact = templates.map(({ abilityOne, abilityTwo, hiddenAbility, eventAbility, possibleMoves, ...rest }): CompactPokemonTemplate => ({
  ...rest,
  abilityOneId: abilityOne?.id ?? null, abilityTwoId: abilityTwo?.id ?? null,
  hiddenAbilityId: hiddenAbility?.id ?? null, eventAbilityId: eventAbility?.id ?? null,
  possibleMoves: possibleMoves.map(({ id, rank, move }) => ({ id: id!, rank, moveId: move.id })),
}));
writeFileSync(new URL('pokemon-templates.json', target), JSON.stringify(compact));
