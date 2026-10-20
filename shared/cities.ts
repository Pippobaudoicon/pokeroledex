import { RANKS, type Pokemon, type PokemonType, type Rank } from './types.ts';

export function cityTypeCounts(pokemon: Pick<Pokemon, 'rank' | 'pokemonTemplate'>[]) {
  const counts = new Map<PokemonType, Partial<Record<Rank, number>>>();
  for (const resident of pokemon) {
    for (const type of new Set(resident.pokemonTemplate.types)) {
      const ranks = counts.get(type) ?? {};
      ranks[resident.rank] = (ranks[resident.rank] ?? 0) + 1;
      counts.set(type, ranks);
    }
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).flatMap(([type, ranks]) =>
    RANKS.filter(rank => ranks[rank]).map(rank => ({ type, rank, count: ranks[rank]! })));
}
