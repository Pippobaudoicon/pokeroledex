// Writes the read-only reference data as compact static assets for the Worker.
// pokemon-templates.json embeds every move and ability object (20 MB); the compact
// copy keeps ids only and worker/reference.ts hydrates them again.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { CompactPokemonTemplate, PokemonTemplate } from '../shared/types.ts';

const source = new URL('../data/reference/', import.meta.url);
const target = new URL('../public/reference/', import.meta.url);
mkdirSync(target, { recursive: true });

for (const name of ['natures', 'abilities', 'moves', 'items', 'rankup-attributes']) {
  writeFileSync(new URL(`${name}.json`, target), JSON.stringify(JSON.parse(readFileSync(new URL(`${name}.json`, source), 'utf8'))));
}

const templates: PokemonTemplate[] = JSON.parse(readFileSync(new URL('pokemon-templates.json', source), 'utf8'));
const compact = templates.map(({ abilityOne, abilityTwo, hiddenAbility, eventAbility, possibleMoves, ...rest }): CompactPokemonTemplate => ({
  ...rest,
  abilityOneId: abilityOne?.id ?? null, abilityTwoId: abilityTwo?.id ?? null,
  hiddenAbilityId: hiddenAbility?.id ?? null, eventAbilityId: eventAbility?.id ?? null,
  possibleMoves: possibleMoves.map(({ id, rank, move }) => ({ id: id!, rank, moveId: move.id })),
}));
writeFileSync(new URL('pokemon-templates.json', target), JSON.stringify(compact));
