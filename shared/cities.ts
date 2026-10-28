import { CITY_SKILLS, POKEMON_TYPES, RANKS, type CityAssignment, type CitySkill, type CitySkills, type Evolution, type Pokemon, type PokemonType, type ProfileSkill, type Rank, type WorkProfile } from './types.ts';
import { canWork, workBonus } from './crafting.ts';

/** Rank level counts from 1 (Unranked) to 9 (Champion). */
export function cityLimits(rank: Rank) {
  const level = Math.max(0, RANKS.indexOf(rank)) + 1;
  return { residents: 4 + 3 * level, skill: 5 + level };
}

type EvolutionNode = { legendary?: boolean; evolutions?: Evolution[] };
// Mega Evolutions and alternate forms are not evolution stages.
const isForm = (evolution: Evolution) => evolution.kind === 'MEGA' || evolution.kind === 'FORM';

/**
 * What a resident adds to its city skill or action: legendaries 5, species without
 * evolutions 2, otherwise the evolution stage (first 1, second 2, third 3). Forms use
 * their base form's stage. `resolve` finds a template by ID and may return null.
 */
export function residentBonus(template: EvolutionNode, resolve: (id: string) => EvolutionNode | null): number {
  if (template.legendary) return 5;
  let base = template;
  const seen = new Set<EvolutionNode>([base]);
  for (let link = base.evolutions?.find(e => e.type === 'FROM' && isForm(e)); link;) {
    const next = resolve(link.targetId);
    if (!next || seen.has(next)) break;
    seen.add(base = next);
    link = base.evolutions?.find(e => e.type === 'FROM' && isForm(e));
  }
  if (base.legendary) return 5;
  if (!base.evolutions?.some(e => !isForm(e))) return 2;
  let stage = 1;
  for (let current: EvolutionNode | null = base; current;) {
    const link: Evolution | undefined = current.evolutions?.find(e => e.type === 'FROM' && !isForm(e));
    if (!link) break;
    stage++;
    current = resolve(link.targetId);
    if (current && seen.has(current)) break;
    if (current) seen.add(current);
  }
  return stage;
}

/** What cityValues needs to know about each resident, keyed by Pokemon ID. */
export interface ResidentWork { bonus: number; profile: WorkProfile; types: readonly PokemonType[] }

/** A target is valid if it is a city skill the resident's profile allows, or one of the city's action tags. */
export function canAssign(target: unknown, tags: string[], profile: WorkProfile) {
  if (typeof target !== 'string') return false;
  if (target.startsWith('skill:')) return isCitySkill(target.slice(6)) && canWork(profile, target.slice(6) as CitySkill);
  return target.startsWith('tag:') && tags.includes(target.slice(4));
}

/**
 * Totals per skill and action tag, each capped at the rank's skill limit. A resident adds its full
 * bonus to actions and to skills its profile has at full, half of it at half. Catalyst residents add
 * no value; they provide their types, each at the strongest bonus, and Catalyst counts those types.
 */
export function cityValues(rank: Rank, tags: string[], assignments: Record<string, CityAssignment>, residents: Record<string, ResidentWork>) {
  const totals = new Map<string, number>();
  const catalysts: Partial<Record<PokemonType, number>> = {};
  for (const [id, target] of Object.entries(assignments)) {
    const resident = residents[id];
    if (!resident) continue;
    if (target === 'skill:catalyst') {
      for (const type of resident.types) catalysts[type] = Math.max(catalysts[type] ?? 0, resident.bonus);
      continue;
    }
    const amount = target.startsWith('skill:') ? workBonus(resident.bonus, resident.profile[target.slice(6) as ProfileSkill]) : resident.bonus;
    totals.set(target, (totals.get(target) ?? 0) + amount);
  }
  const cap = (target: string) => Math.min(totals.get(target) ?? 0, cityLimits(rank).skill);
  return {
    skills: Object.fromEntries(CITY_SKILLS.map(skill => [skill, skill === 'catalyst' ? Object.keys(catalysts).length : cap(`skill:${skill}`)])) as CitySkills,
    tagValues: Object.fromEntries(tags.map(tag => [tag, cap(`tag:${tag}`)])),
    catalysts,
  };
}

export const isCitySkill = (value: unknown): value is CitySkill => (CITY_SKILLS as readonly unknown[]).includes(value);

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

export function cityRankGroups(pokemon: Pick<Pokemon, 'rank' | 'pokemonTemplate'>[]) {
  const counts = cityTypeCounts(pokemon);
  return RANKS.flatMap(rank => {
    const population = pokemon.filter(resident => resident.rank === rank).length;
    if (!population) return [];
    return [{
      rank,
      population,
      types: [...POKEMON_TYPES].sort((a, b) => a.localeCompare(b)).map(type => ({
        type, count: counts.find(entry => entry.rank === rank && entry.type === type)?.count ?? 0,
      })),
    }];
  });
}
