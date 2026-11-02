// Read-only reference data, served as static assets by scripts/build-reference.ts and
// parsed once per isolate. Templates are hydrated back to their full shape;
// they share the move and ability objects, so this costs little extra memory.
import type { Ability, CompactPokemonTemplate, Item, Move, Nature, PokemonTemplate, RankUpTable } from '../shared/types.ts';

export interface Reference {
  'pokemon-templates': PokemonTemplate[];
  moves: Move[];
  items: Item[];
  abilities: Ability[];
  natures: Nature[];
  rankAttributes: RankUpTable;
}

let cached: Reference | undefined;

export async function loadReference(assets: Fetcher, origin: string): Promise<Reference> {
  return cached ??= await load(assets, origin);
}

async function load(assets: Fetcher, origin: string): Promise<Reference> {
  const get = async <T>(name: string): Promise<T> => {
    const response = await assets.fetch(`${origin}/reference/${name}.json`);
    if (!response.ok) throw new Error(`Missing /reference/${name}.json (${response.status}); run pnpm build.`);
    return response.json();
  };
  const [templates, moves, items, abilities, natures, rankAttributes] = await Promise.all([
    get<CompactPokemonTemplate[]>('pokemon-templates'), get<Move[]>('moves'), get<Item[]>('items'),
    get<Ability[]>('abilities'), get<Nature[]>('natures'), get<RankUpTable>('rankup-attributes'),
  ]);
  const moveById = new Map(moves.map(move => [move.id, move]));
  const abilityById = new Map(abilities.map(ability => [ability.id, ability]));
  const ability = (id: string | null) => id === null ? null : abilityById.get(id)!;
  return {
    'pokemon-templates': templates.map(({ abilityOneId, abilityTwoId, hiddenAbilityId, eventAbilityId, possibleMoves, ...rest }) => ({
      ...rest,
      abilityOne: ability(abilityOneId), abilityTwo: ability(abilityTwoId),
      hiddenAbility: ability(hiddenAbilityId), eventAbility: ability(eventAbilityId),
      possibleMoves: possibleMoves.map(({ id, rank, moveId }) => ({ rank, move: moveById.get(moveId)!, id })),
    })),
    moves, items, abilities, natures, rankAttributes,
  };
}
