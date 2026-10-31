import { RANKS } from './types.ts';
import { matchesHabitats } from './habitats.ts';
import type { GenerateEncounterBody, PokemonTemplate } from './types.ts';

const generationEnds = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
const mythicalNumbers = new Set([151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025]);
const fossilNumbers = new Set([138, 139, 140, 141, 142, 345, 346, 347, 348, 408, 409, 410, 411, 564, 565, 566, 567, 696, 697, 698, 699, 880, 881, 882, 883]);
const starterNumbers = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  650, 651, 652, 653, 654, 655, 656, 657, 658,
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  810, 811, 812, 813, 814, 815, 816, 817, 818,
  906, 907, 908, 909, 910, 911, 912, 913, 914,
]);

export function generationFor(number: number): number | undefined {
  if (!Number.isInteger(number) || number < 1) return undefined;
  const index = generationEnds.findIndex(end => number <= end);
  return index === -1 ? undefined : index + 1;
}

export const isMythical = (number: number): boolean => mythicalNumbers.has(number);
export const isFossil = (number: number): boolean => fossilNumbers.has(number);
export const isStarter = (number: number): boolean => starterNumbers.has(number);

export function matchesEncounterFilters(template: PokemonTemplate, body: GenerateEncounterBody): boolean {
  if (template.number === 0 && template.name === 'Egg') return false;
  const names = (body.name ?? '').toLowerCase().split(',').map(name => name.trim()).filter(Boolean);
  if (names.length && !names.some(name => template.name.toLowerCase().includes(name))) return false;
  if (body.types?.length && !body.types.some(type => template.types.includes(type))) return false;
  if (body.generations?.length && !body.generations.includes(generationFor(template.number) ?? 0)) return false;
  if (!matchesHabitats(template.habitats, body.habitats)) return false;
  if (body.ranks?.length && !body.ranks.some(rank => body.rankOrBelow !== false
    ? RANKS.indexOf(template.recommendedRank) <= RANKS.indexOf(rank)
    : template.recommendedRank === rank)) return false;
  const legendary = template.legendary && !isMythical(template.number);
  if (body.includeLegendary === 'ONLY' ? !legendary : body.includeLegendary !== 'ALL' && legendary) return false;
  if (!body.includeMythical && isMythical(template.number)) return false;
  // Numeric dex IDs identify canonical entries, even when their names contain a form label.
  const canonicalOgerpon = template.number === 1017 && template.dexID === '1017F3';
  const variant = !canonicalOgerpon && (/^\d+[a-z]/i.test(template.dexID) || (!/^\d+$/.test(template.dexID) && template.name.includes('(')));
  if (body.excludeForms === true && variant) return false;
  if (body.excludeStarters && isStarter(template.number)) return false;
  if (body.fossils === 'ONLY' && !isFossil(template.number)) return false;
  if (body.fossils === 'NONE' && isFossil(template.number)) return false;
  return !body.excludedTemplateIds?.includes(template.id);
}
