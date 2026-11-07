// City crafting rules (docs/crafting-plan.md): which city skills a species can work, and
// how each reference item is crafted. Hand-tuned exceptions live in data/crafting-items.json
// and data/crafting-species.json and are passed in, so the Worker, the app and the scripts
// share the same rules.
import {
  CRAFTING_SKILLS, POKEMON_TYPES, RANKS, type Attribute, type CityRecipe, type CitySkill, type CitySkills, type CraftingSkill, type Evolution, type Item,
  type PokemonType, type ProfileSkill, type Rank, type Tier, type WorkLevel, type WorkProfile,
} from './types.ts';

export { CITY_SKILLS, CRAFTING_SKILLS, SUPPORT_SKILLS } from './types.ts';
export type { CityRecipe, CitySkill, CraftingSkill, ProfileSkill, SupportSkill, Tier, WorkLevel, WorkProfile } from './types.ts';

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
  /** Another skill that must reach `min` before the recipe can be ordered. */
  assist: { skill: CitySkill; min: number } | null;
  craftable: boolean;
  note?: string;
  /** Skill value one craft uses, per crafting skill; by default the tier's effort of `skill`. */
  costs: Partial<Record<CraftingSkill, number>>;
  /** Items one craft makes. */
  yield: number;
  /** The city changed this recipe (CityRecipe). */
  edited?: boolean;
}
type RecipeFields = Partial<Omit<Recipe, 'itemId' | 'costs' | 'yield' | 'edited'>>;
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
  const recipe = {
    itemId: item.id, skill: defaultSkill(item), tier: defaultTier(item), catalyst: defaultCatalyst(item),
    assist: defaultAssist(item), craftable: true, ...exception,
  };
  return { ...recipe, costs: { [recipe.skill]: TIERS[recipe.tier].effort }, yield: 1 };
}

/** Upper bounds for a city's recipe edits: a cost above the highest skill cap could never be crafted. */
export const RECIPE_LIMITS = { cost: 14, yield: 99 };

/**
 * A recipe with the city's changes. Without its own costs the recipe uses the (new) tier's effort of
 * its skill; with them, its skill stays the default one if that is still used, else the first one used.
 */
export function cityRecipe(recipe: Recipe, override: CityRecipe | undefined): Recipe {
  if (!override || !recipe.craftable) return recipe;
  const tier = override.tier ?? recipe.tier;
  const costs = override.costs ?? { [recipe.skill]: TIERS[tier].effort };
  const skill = costs[recipe.skill] ? recipe.skill : CRAFTING_SKILLS.find(entry => costs[entry]) ?? recipe.skill;
  return { ...recipe, tier, skill, costs, yield: override.yield ?? recipe.yield, edited: true };
}

const sameCosts = (a: Recipe['costs'], b: Recipe['costs']) => CRAFTING_SKILLS.every(skill => (a[skill] ?? 0) === (b[skill] ?? 0));

/**
 * Checks a city's recipe edit against the default recipe and keeps only what differs from it.
 * Returns the error to show, or the edit (`null` when nothing differs, i.e. the default).
 */
export function checkCityRecipe(recipe: Recipe, input: unknown): { error: string } | { recipe: CityRecipe | null } {
  if (input === null) return { recipe: null };
  if (!recipe.craftable) return { error: 'This item cannot be crafted.' };
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'Send the recipe changes or null.' };
  const { tier, costs, yield: makes } = input as Record<string, unknown>;
  if (tier !== undefined && !(Number.isInteger(tier) && (tier as number) >= 1 && (tier as number) <= 8)) return { error: 'Choose a tier from 1 to 8.' };
  if (makes !== undefined && !(Number.isInteger(makes) && (makes as number) >= 1 && (makes as number) <= RECIPE_LIMITS.yield)) {
    return { error: `Choose from 1 to ${RECIPE_LIMITS.yield} items per craft.` };
  }
  let used: Recipe['costs'] | undefined;
  if (costs !== undefined) {
    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) return { error: 'Choose the skills the recipe uses.' };
    used = {};
    for (const [skill, cost] of Object.entries(costs) as [string, unknown][]) {
      if (!(CRAFTING_SKILLS as readonly string[]).includes(skill)) return { error: `${skill} is not a crafting skill.` };
      if (!Number.isInteger(cost) || (cost as number) < 0 || (cost as number) > RECIPE_LIMITS.cost) return { error: `Each skill can use from 0 to ${RECIPE_LIMITS.cost}.` };
      if (cost) used[skill as CraftingSkill] = cost as number;
    }
    if (!Object.keys(used).length) return { error: 'The recipe must use at least one crafting skill.' };
  }
  const edit: CityRecipe = {};
  if (tier !== undefined && tier !== recipe.tier) edit.tier = tier as Tier;
  if (used && !sameCosts(used, { [recipe.skill]: TIERS[edit.tier ?? recipe.tier].effort })) edit.costs = used;
  if (makes !== undefined && makes !== recipe.yield) edit.yield = makes as number;
  return { recipe: Object.keys(edit).length ? edit : null };
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

type CostLike = Pick<Recipe, 'skill' | 'tier'> & { costs?: Recipe['costs'] };

/** Skill value one craft uses, per crafting skill: the recipe's costs, or its tier's effort of its skill. */
export const recipeCosts = (recipe: CostLike): Recipe['costs'] => recipe.costs ?? { [recipe.skill]: TIERS[recipe.tier].effort };

/** Capacity one craft takes from a skill's value (its own skill by default). */
export const orderCost = (recipe: CostLike, skill: CraftingSkill = recipe.skill) => recipeCosts(recipe)[skill] ?? 0;

/** Capacity the order uses per crafting skill. */
export function orderUsage(lines: { recipe: CostLike; quantity: number }[]): Record<CraftingSkill, number> {
  const usage = { apothecary: 0, craftsmanship: 0, technology: 0, metallurgy: 0, archaeology: 0 };
  for (const { recipe, quantity } of lines) {
    for (const [skill, cost] of Object.entries(recipeCosts(recipe)) as [CraftingSkill, number][]) usage[skill] += cost * quantity;
  }
  return usage;
}

/** Research steps an order asks for in total; the city's Research value caps them. */
export const orderSteps = (lines: { steps: number }[]) => lines.reduce((total, line) => total + line.steps, 0);

/** How many more crafts of the recipe fit in the order, given what it already uses, across every skill it uses. */
export function orderRoom(recipe: CostLike, skills: CitySkills, usage: Record<CraftingSkill, number>) {
  const costs = (Object.entries(recipeCosts(recipe)) as [CraftingSkill, number][]).filter(([, cost]) => cost > 0);
  if (!costs.length) return 0;
  return Math.max(0, Math.min(...costs.map(([skill, cost]) => Math.floor((skills[skill] - usage[skill]) / cost))));
}

/** Skills whose order lines need more than the city has, e.g. after a resident moved off the skill. */
export const overCapacity = (skills: CitySkills, usage: Record<CraftingSkill, number>) =>
  (Object.keys(usage) as CraftingSkill[]).filter(skill => usage[skill] > skills[skill]);

/** Why the city cannot craft the recipe now; empty when it can. */
export function craftBlockers(recipe: Recipe, city: CraftingCity): string[] {
  if (!recipe.craftable) return [recipe.note ? `${recipe.note}: not craftable.` : 'This item cannot be crafted.'];
  const tier = TIERS[recipe.tier];
  const reasons: string[] = [];
  if (!rankAtLeast(city.rank, tier.minRank)) reasons.push(`Needs ${withArticle(label(tier.minRank))} city.`);
  if (!isUnlocked(recipe, city.research)) reasons.push('Needs research.');
  // Its own skill needs the tier's minimum; every skill needs enough for one craft.
  const costs = recipeCosts(recipe);
  for (const skill of [recipe.skill, ...CRAFTING_SKILLS.filter(entry => entry !== recipe.skill && costs[entry])]) {
    const needed = Math.max(costs[skill] ?? 0, skill === recipe.skill ? tier.minSkill : 0);
    if (city.skills[skill] < needed) reasons.push(`Needs ${label(skill)} ${needed}.`);
  }
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

/** Research dice typed in from a physical roll must match the pool; returns the problem, or null. */
export function checkFaces(faces: unknown, pool: number): string | null {
  if (!Array.isArray(faces) || faces.length !== pool || faces.some(face => !Number.isInteger(face) || face < 1 || face > 6)) {
    return `Enter ${pool} ${pool === 1 ? 'die' : 'dice'}, each from 1 to 6.`;
  }
  return null;
}
