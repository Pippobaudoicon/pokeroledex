// City crafting rules (docs/crafting-plan.md): which city skills a species can work, and
// how each reference item is crafted. Hand-tuned exceptions live in data/crafting-items.json
// and data/crafting-species.json and are passed in, so the Worker, the app and the scripts
// share the same rules.
import {
  POKEMON_TYPES, RANKS, type Attribute, type CitySkill, type CitySkills, type CraftingSkill, type Evolution, type Item, type PokemonType,
  type ProfileSkill, type Rank, type WorkLevel, type WorkProfile,
} from './types.ts';

export { CITY_SKILLS, CRAFTING_SKILLS, SUPPORT_SKILLS } from './types.ts';
export type { CitySkill, CraftingSkill, ProfileSkill, SupportSkill, WorkLevel, WorkProfile } from './types.ts';

/** Where a species' work profile starts: its types, then its max value in the key attribute. */
export const SKILL_AFFINITIES: Record<ProfileSkill, { full: PokemonType[]; half: PokemonType[]; attribute: Attribute }> = {
  apothecary: { full: ['GRASS', 'POISON', 'BUG', 'WATER'], half: ['ICE', 'GROUND'], attribute: 'insight' },
  craftsmanship: { full: ['NORMAL', 'BUG', 'FIGHTING'], half: ['FAIRY', 'DARK', 'GRASS', 'FLYING'], attribute: 'dexterity' },
  technology: { full: ['STEEL', 'ELECTRIC'], half: ['PSYCHIC', 'NORMAL', 'FIRE'], attribute: 'special' },
  metallurgy: { full: ['ROCK', 'GROUND', 'STEEL', 'FIRE'], half: ['FIGHTING', 'ICE'], attribute: 'strength' },
  archaeology: { full: ['GHOST', 'DRAGON', 'DARK', 'PSYCHIC', 'FAIRY'], half: ['ROCK', 'ICE'], attribute: 'special' },
  research: { full: ['PSYCHIC', 'DRAGON'], half: ['ELECTRIC', 'STEEL', 'GHOST'], attribute: 'insight' },
  nursing: { full: ['FAIRY', 'NORMAL', 'WATER'], half: ['PSYCHIC', 'GRASS'], attribute: 'vitality' },
  foraging: { full: ['FLYING', 'GROUND', 'GHOST', 'DARK'], half: ['BUG', 'GRASS', 'WATER'], attribute: 'dexterity' },
};
/** A max key attribute of `raise` turns half into full; `open` turns none into half. */
export const APTITUDE = { raise: 6, open: 7 };

type SpeciesLike = { id?: string; name: string; types: readonly string[]; maxStats?: Partial<Record<Attribute, number>>; evolutions?: Evolution[] };
export type SkillOverrides = Partial<Record<ProfileSkill, WorkLevel | null>>;
/** Keyed by species name; `line` applies the entry to every species linked by evolutions or forms. */
export type SpeciesExceptions = Record<string, { line?: boolean; skills: SkillOverrides; note?: string }>;

export function workProfile(species: SpeciesLike, overrides: SkillOverrides = {}): WorkProfile {
  const profile: WorkProfile = {};
  for (const [skill, { full, half, attribute }] of Object.entries(SKILL_AFFINITIES) as [ProfileSkill, typeof SKILL_AFFINITIES[ProfileSkill]][]) {
    let level = species.types.some(type => (full as string[]).includes(type)) ? 2 : species.types.some(type => (half as string[]).includes(type)) ? 1 : 0;
    const aptitude = species.maxStats?.[attribute] ?? 0;
    if ((level === 1 && aptitude >= APTITUDE.raise) || (level === 0 && aptitude >= APTITUDE.open)) level++;
    const override = overrides[skill];
    if (override !== undefined) level = override === 'full' ? 2 : override === 'half' ? 1 : 0;
    if (level) profile[skill] = level === 2 ? 'full' : 'half';
  }
  return profile;
}

/** Resolves the exceptions file to per-species overrides; a species' own entry beats its line's. */
export function speciesOverrides(templates: SpeciesLike[], exceptions: SpeciesExceptions): Map<string, SkillOverrides> {
  const byId = new Map(templates.filter(t => t.id).map(t => [t.id!, t]));
  const result = new Map<string, SkillOverrides>();
  for (const [name, entry] of Object.entries(exceptions)) {
    if (!entry.line) continue;
    const start = templates.find(t => t.name === name);
    if (!start) continue;
    const seen = new Set([start]);
    for (const current of seen) {
      for (const link of current.evolutions ?? []) {
        const next = byId.get(link.targetId);
        if (next) seen.add(next);
      }
    }
    for (const member of seen) result.set(member.name, { ...result.get(member.name), ...entry.skills });
  }
  for (const [name, entry] of Object.entries(exceptions)) {
    if (!entry.line) result.set(name, { ...result.get(name), ...entry.skills });
  }
  return result;
}

/** What a resident adds to a skill it works at `level`: full is its whole bonus, half is half (at least 1). */
export const workBonus = (bonus: number, level: WorkLevel | undefined) =>
  level === 'full' ? bonus : level === 'half' ? Math.max(1, Math.floor(bonus / 2)) : 0;

/** Catalyst takes every resident; other skills only species whose profile opens them. */
export const canWork = (profile: WorkProfile, skill: CitySkill) => skill === 'catalyst' || !!profile[skill];

/** Tier N needs city rank N (1 Starter … 8 Champion), so Unranked cities craft nothing. */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const TIERS: Record<Tier, { minSkill: number; minRank: Rank; effort: number; research: { steps: number; minResearch: number } | null; catalystStrength: number }> = {
  1: { minSkill: 1, minRank: 'STARTER', effort: 1, research: null, catalystStrength: 1 },
  2: { minSkill: 2, minRank: 'ROOKIE', effort: 1, research: null, catalystStrength: 1 },
  3: { minSkill: 3, minRank: 'STANDARD', effort: 1, research: { steps: 3, minResearch: 3 }, catalystStrength: 2 },
  4: { minSkill: 4, minRank: 'ADVANCED', effort: 2, research: { steps: 5, minResearch: 4 }, catalystStrength: 2 },
  5: { minSkill: 5, minRank: 'EXPERT', effort: 2, research: { steps: 7, minResearch: 5 }, catalystStrength: 2 },
  6: { minSkill: 6, minRank: 'ACE', effort: 3, research: { steps: 9, minResearch: 6 }, catalystStrength: 3 },
  7: { minSkill: 8, minRank: 'MASTER', effort: 3, research: { steps: 12, minResearch: 8 }, catalystStrength: 3 },
  8: { minSkill: 10, minRank: 'CHAMPION', effort: 4, research: { steps: 15, minResearch: 10 }, catalystStrength: 3 },
};

export interface Recipe {
  itemId: string;
  skill: CraftingSkill;
  tier: Tier;
  /** Any one of these types must be present in the city's Catalyst skill. */
  catalyst: PokemonType[] | null;
  /** Another skill that must reach `min`; every 3 points of it add a die. */
  assist: { skill: CitySkill; min: number } | null;
  craftable: boolean;
  note?: string;
}
type RecipeFields = Partial<Omit<Recipe, 'itemId'>>;
/** Keyed by item name. */
export type ItemExceptions = Record<string, RecipeFields>;

type ItemLike = Pick<Item, 'id' | 'name' | 'pocket' | 'category' | 'trainerPrice'>;

const SKILL_KEYWORDS: [RegExp, CraftingSkill][] = [
  [/\b(memory|plate|incense|amulet|knot)\b|^(spell|cleanse) tag$|^soul dew$|^(adamant|lustrous|gaseous) orb$|^(lucky egg|amulet coin|king's rock|light ball|mystic water|fairy wings)$|^deep sea/i, 'archaeology'],
  [/drive$|pok[eé]dex|bike|stove|compass|battery|button|eject|room service|extender|balloon|policy|metronome|\borb$|smoke bomb/i, 'technology'],
  [/\bgem$|rock$|clay|coat|magnet|never-melt|soft sand|charcoal|hard stone|float stone|fang|beak|barb|iron ball|helmet|claw|lens|metal|spoon|eviolite/i, 'metallurgy'],
  [/seed|herb|root|moss|powder|sludge|leftovers|berry|cherry|leek|^stick$|food|meal|ration|canned|repel|spray|bulb|honey/i, 'apothecary'],
];

function defaultSkill(item: ItemLike): CraftingSkill {
  if (item.pocket === 'TECHNICAL_MACHINE' || item.pocket === 'POKEBALLS') return 'technology';
  if (item.category === 'MEGA_STONE' || item.category === 'Z_CRYSTAL') return 'archaeology';
  if (item.pocket === 'EVOLUTION_ITEM') return 'metallurgy';
  if (item.category === 'BERRY' || item.category === 'HEALING' || item.category === 'STATUS' || item.category === 'VITAMIN') return 'apothecary';
  return SKILL_KEYWORDS.find(([pattern]) => pattern.test(item.name))?.[1] ?? 'craftsmanship';
}

export const itemPrice = (item: Pick<Item, 'trainerPrice'>) => Number(String(item.trainerPrice ?? '').replace(/[^\d]/g, '')) || null;
const BASIC_BERRIES = /^(cheri|chesto|pecha|rawst|aspear|persim|oran) berry$|^berry juice$/i;

/** Upper price bound of tiers 1-7; anything dearer is tier 8. */
const PRICE_TIERS = [200, 600, 1500, 3500, 7000, 12000, 25000];

function defaultTier(item: ItemLike): Tier {
  const price = itemPrice(item);
  if (price) return (PRICE_TIERS.findIndex(bound => price <= bound) + 1 || 8) as Tier;
  if (/\bgem$|incense$/i.test(item.name)) return 2;
  if (/plate$|memory$|drive$/i.test(item.name)) return 5;
  switch (item.category) {
    case 'BERRY': return BASIC_BERRIES.test(item.name) ? 1 : 2;
    case 'STATUS': return 1;
    case 'HEALING': return 3;
    case 'VITAMIN': return 6;
    case 'TYPE_BOOSTING': return 3;
    case 'BATTLE_ITEM': return 4;
    case 'MON_BOOSTING': return 5;
    case 'Z_CRYSTAL': return 6;
    case 'MEGA_STONE': return 7;
  }
  return item.pocket === 'POKEBALLS' ? 4 : item.pocket === 'EVOLUTION_ITEM' ? 5 : item.pocket === 'TRAINER_ITEMS' ? 2 : 4;
}

const Z_TYPES: Record<string, PokemonType> = {
  normalium: 'NORMAL', firium: 'FIRE', waterium: 'WATER', electrium: 'ELECTRIC', grassium: 'GRASS', icium: 'ICE',
  fightinium: 'FIGHTING', poisonium: 'POISON', groundium: 'GROUND', flyinium: 'FLYING', psychium: 'PSYCHIC', buginium: 'BUG',
  rockium: 'ROCK', ghostium: 'GHOST', dragonium: 'DRAGON', darkinium: 'DARK', steelium: 'STEEL', fairium: 'FAIRY',
};
/** Items whose type tie is not spelled out as "<Type> Gem" or "<Type> Memory". */
const NAMED_CATALYSTS: Record<string, PokemonType> = {
  'flame plate': 'FIRE', 'splash plate': 'WATER', 'zap plate': 'ELECTRIC', 'meadow plate': 'GRASS', 'icicle plate': 'ICE',
  'fist plate': 'FIGHTING', 'toxic plate': 'POISON', 'earth plate': 'GROUND', 'sky plate': 'FLYING', 'mind plate': 'PSYCHIC',
  'insect plate': 'BUG', 'stone plate': 'ROCK', 'spooky plate': 'GHOST', 'draco plate': 'DRAGON', 'dread plate': 'DARK',
  'iron plate': 'STEEL', 'pixie plate': 'FAIRY',
  'burn drive': 'FIRE', 'douse drive': 'WATER', 'shock drive': 'ELECTRIC', 'chill drive': 'ICE',
  'black belt': 'FIGHTING', 'black glasses': 'DARK', 'metal coat': 'STEEL', 'mystic water': 'WATER', 'silver powder': 'BUG',
  'miracle seed': 'GRASS', 'spell tag': 'GHOST', 'never-melt ice': 'ICE', 'silk scarf': 'NORMAL', 'soft sand': 'GROUND',
  'twisted spoon': 'PSYCHIC', 'dragon fang': 'DRAGON', 'hard stone': 'ROCK', 'sharp beak': 'FLYING', 'fairy wings': 'FAIRY',
  'magnet': 'ELECTRIC', 'charcoal': 'FIRE', 'poison barb': 'POISON',
  'rose incense': 'GRASS', 'odd incense': 'PSYCHIC', 'rock incense': 'ROCK', 'sea incense': 'WATER', 'wave incense': 'WATER',
  'fire stone': 'FIRE', 'water stone': 'WATER', 'thunder stone': 'ELECTRIC', 'leaf stone': 'GRASS', 'ice stone': 'ICE',
  'moon stone': 'FAIRY', 'sun stone': 'FIRE', 'dusk stone': 'DARK', 'dawn stone': 'PSYCHIC', 'shiny stone': 'FAIRY',
  'heat rock': 'FIRE', 'damp rock': 'WATER', 'icy rock': 'ICE', 'smooth rock': 'ROCK', 'dark rock': 'DARK',
  'electric seed': 'ELECTRIC', 'grassy seed': 'GRASS', 'misty seed': 'FAIRY', 'psychic seed': 'PSYCHIC',
  'light ball': 'ELECTRIC', 'deep sea tooth': 'WATER', 'deep sea scale': 'WATER', 'thick club': 'GROUND',
};

function defaultCatalyst(item: ItemLike): PokemonType[] | null {
  const name = item.name.toLowerCase();
  const typed = /^(\w+) (gem|memory)$/.exec(name)?.[1].toUpperCase();
  if (typed && (POKEMON_TYPES as readonly string[]).includes(typed)) return [typed as PokemonType];
  const z = /^(\w+) z$/.exec(name)?.[1];
  if (z && Z_TYPES[z]) return [Z_TYPES[z]];
  return NAMED_CATALYSTS[name] ? [NAMED_CATALYSTS[name]] : null;
}

function defaultAssist(item: ItemLike): Recipe['assist'] {
  if (item.pocket === 'TECHNICAL_MACHINE') return { skill: 'research', min: 3 };
  if (item.category === 'VITAMIN') return { skill: 'technology', min: 2 };
  if (item.category === 'MEGA_STONE' || item.category === 'Z_CRYSTAL') return { skill: 'research', min: 5 };
  return null;
}

export function itemRecipe(item: ItemLike, exception: RecipeFields = {}): Recipe {
  return {
    itemId: item.id, skill: defaultSkill(item), tier: defaultTier(item), catalyst: defaultCatalyst(item),
    assist: defaultAssist(item), craftable: true, ...exception,
  };
}

/** What crafting and research need to know about a city. `research` holds steps per item ID. */
export interface CraftingCity {
  rank: Rank;
  skills: CitySkills;
  catalysts: Partial<Record<PokemonType, number>>;
  research: Record<string, number>;
}

const label = (value: string) => value.toLowerCase().split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const withArticle = (words: string) => `${/^[AEIOU]/.test(words) ? 'an' : 'a'} ${words}`;
const rankAtLeast = (rank: Rank, minimum: Rank) => RANKS.indexOf(rank) >= RANKS.indexOf(minimum);

/** Tier 1-2 recipes start unlocked; higher tiers once their research steps are done. */
export function isUnlocked(recipe: Recipe, research: Record<string, number>) {
  const needed = TIERS[recipe.tier].research;
  return !needed || (research[recipe.itemId] ?? 0) >= needed.steps;
}

/** Dice for a craft roll: the recipe's skill, plus one die per 3 points of its assist skill. */
export const craftPool = (recipe: Recipe, skills: CitySkills) =>
  skills[recipe.skill] + (recipe.assist ? Math.floor(skills[recipe.assist.skill] / 3) : 0);

/** Why the city cannot craft the recipe now; empty when it can. */
export function craftBlockers(recipe: Recipe, city: CraftingCity): string[] {
  if (!recipe.craftable) return [recipe.note ? `${recipe.note}: not craftable.` : 'This item cannot be crafted.'];
  const tier = TIERS[recipe.tier];
  const reasons: string[] = [];
  if (!rankAtLeast(city.rank, tier.minRank)) reasons.push(`Needs ${withArticle(label(tier.minRank))} city.`);
  if (!isUnlocked(recipe, city.research)) reasons.push('Needs research.');
  if (city.skills[recipe.skill] < tier.minSkill) reasons.push(`Needs ${label(recipe.skill)} ${tier.minSkill}.`);
  if (recipe.assist && city.skills[recipe.assist.skill] < recipe.assist.min) reasons.push(`Needs ${label(recipe.assist.skill)} ${recipe.assist.min}.`);
  if (recipe.catalyst && !recipe.catalyst.some(type => (city.catalysts[type] ?? 0) >= tier.catalystStrength)) {
    reasons.push(`Needs ${withArticle(recipe.catalyst.map(label).join(' or '))} Catalyst of strength ${tier.catalystStrength}.`);
  }
  return reasons;
}

/** Why the city cannot research the recipe now; empty when it can. Catalysts are not needed to research. */
export function researchBlockers(recipe: Recipe, city: CraftingCity): string[] {
  if (!recipe.craftable) return [recipe.note ? `${recipe.note}: not craftable.` : 'This item cannot be crafted.'];
  const tier = TIERS[recipe.tier];
  if (!tier.research) return ['This recipe needs no research.'];
  if (isUnlocked(recipe, city.research)) return ['Already researched.'];
  const reasons: string[] = [];
  if (!rankAtLeast(city.rank, tier.minRank)) reasons.push(`Needs ${withArticle(label(tier.minRank))} city.`);
  if (city.skills.research < tier.research.minResearch) reasons.push(`Needs Research ${tier.research.minResearch}.`);
  return reasons;
}

/** Rolls d6s; `random` returns a number in [0, 1). */
export const rollDice = (count: number, random: () => number = Math.random) =>
  Array.from({ length: count }, () => 1 + Math.floor(random() * 6));

/** Pokérole counts every 4, 5 or 6 as a success (same as src/components/DiceRoll.tsx). */
export const countSuccesses = (faces: number[]) => faces.filter(face => face >= 4).length;

/** Faces typed in from a physical roll must match the pool; returns the problem, or null. */
export function checkFaces(faces: unknown, pool: number): string | null {
  if (!Array.isArray(faces) || faces.length !== pool || faces.some(face => !Number.isInteger(face) || face < 1 || face > 6)) {
    return `Enter ${pool} ${pool === 1 ? 'die' : 'dice'}, each from 1 to 6.`;
  }
  return null;
}
