// Domain and API types shared by the frontend and the Worker. Shapes are taken from
// data/reference/*.json (captured from pokeroledex.nl) and the local API in worker/api.ts.

export const RANKS = ['UNRANKED', 'STARTER', 'ROOKIE', 'STANDARD', 'ADVANCED', 'EXPERT', 'ACE', 'MASTER', 'CHAMPION'] as const;
export const ATTRIBUTES = ['strength', 'dexterity', 'vitality', 'special', 'insight'] as const;
export const SOCIALS = ['tough', 'cool', 'beauty', 'cute', 'clever'] as const;
export const SKILLS = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'allure', 'etiquette', 'intimidate', 'perform'] as const;
export const TRAINER_SKILLS = ['throw', 'weapons', 'empathy', 'crafts', 'lore', 'medicine', 'science'] as const;

export type Rank = typeof RANKS[number];
export type Attribute = typeof ATTRIBUTES[number];
export type Social = typeof SOCIALS[number];
export type Skill = typeof SKILLS[number];
export type TrainerSkill = typeof TRAINER_SKILLS[number];
export const CITY_SKILLS = [...SKILLS, ...TRAINER_SKILLS] as const;
export type CitySkills = Record<Skill | TrainerSkill, number>;
export interface City {
  id: string;
  userId: string;
  name: string;
  skills: CitySkills;
  tags: string[];
}
export type CityBody = Pick<City, 'name' | 'skills' | 'tags'>;
export type StatKey = Attribute | Social | Skill | TrainerSkill | 'happiness' | 'loyalty' | 'will';
export type Stats = Record<StatKey, number>;
export type AttributeStats = Record<Attribute, number>;

export type Gender = 'M' | 'F' | 'N';
/** '' means the species can be either male or female. */
export type GenderType = Gender | '';
export const POKEMON_TYPES = [
  'NORMAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE', 'FIGHTING', 'POISON', 'GROUND',
  'FLYING', 'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON', 'DARK', 'STEEL', 'FAIRY',
] as const;
export type PokemonType = typeof POKEMON_TYPES[number];
export type MoveType = PokemonType | 'VARIES' | 'TYPELESS';
export type MoveCategory = 'PHYSICAL' | 'SPECIAL' | 'SUPPORT' | 'PHYSICAL_SPECIAL' | 'SUPPORT_PHYSICAL_SPECIAL';
export type MoveTarget =
  | 'FOE' | 'ALL_FOES' | 'RANDOM_FOE' | 'ALLY' | 'ALL_ALLIES' | 'SELF' | 'AREA'
  | 'BATTLEFIELD' | 'ALLYS_BATTLEFIELD' | 'FOES_BATTLEFIELD' | 'USER_AND_ALLIES';
export type ItemPocket = 'HELD_ITEMS' | 'MEDICINE' | 'TRAINER_ITEMS' | 'EVOLUTION_ITEM' | 'POKEBALLS' | 'TECHNICAL_MACHINE';
export type ItemCategory =
  | 'TYPE_BOOSTING' | 'BATTLE_ITEM' | 'MEGA_STONE' | 'STATUS' | 'BERRY' | 'MON_BOOSTING'
  | 'HEALING' | 'Z_CRYSTAL' | 'VITAMIN';
export type Habitat =
  | 'BADLANDS_SCRUBLANDS_AND_WASTELANDS' | 'BEACHES' | 'CAVES' | 'CITIES' | 'DESERTS'
  | 'ELECTROMAGNETICALLY_ACTIVE_AREAS' | 'FIELDS_AND_MEADOWS' | 'GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES'
  | 'GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES' | 'LAKES' | 'LAKESIDES_AND_RIVERSIDES' | 'MOUNTAINS'
  | 'OCEANIC_ABYSSES' | 'OPEN_OCEAN_AND_THE_CONTINENTAL_SHELF' | 'POLAR_SEAS' | 'PONDS'
  | 'RUINS_AND_CEMETERIES' | 'STREAMS_AND_RIVERS' | 'SWAMPS_BOGS_AND_MARSHES' | 'TEMPERATE_DECIDUOUS_FORESTS'
  | 'TROPICAL_JUNGLES' | 'TROPICAL_SEAS_AND_CORAL_REEFS' | 'TUNDRAS_AND_BOREAL_FORESTS' | 'VOLCANOES' | 'WOODLANDS';
export type RankUpMethod = 'RANDOM' | 'OPTIMIZED' | 'MIN_MAX';
export type LegendaryFilter = 'NONE' | 'ALL' | 'ONLY';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  isCore: boolean;
  allowedUserIds: string[];
}

/** Custom moves, items, abilities, natures and templates belong to a user campaign. */
export interface CampaignScoped {
  campaignId: string;
  campaign: Campaign | null;
}

export interface Nature {
  id: string;
  name: string;
  nature: string;
  confidence: number;
  description: string;
  keywords: string;
  hash: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  effect: string;
  hash: string;
}

export interface MoveAttributes {
  accuracyReduction?: number;
  blockDamagePool?: number;
  priority?: number;
  duration?: number | 'wholeScene' | 'Permanent' | '';
  switcherMove?: boolean | 'Foe' | 'User';
  abilityChange?: boolean; alwaysCrit?: boolean; biteMove?: boolean; blocks?: boolean; charge?: boolean;
  copyMove?: boolean; cutterMove?: boolean; destroyShield?: boolean; doubleAction?: boolean; entryHazard?: boolean;
  fistBased?: boolean; fistMove?: boolean; forcefield?: boolean; highCritical?: boolean; ignoreDefenses?: boolean;
  ignoreShield?: boolean; inheritTeraType?: boolean; lethal?: boolean; maneuver?: boolean; mustRecharge?: boolean;
  neverFail?: boolean; ongoingDamage?: boolean; physicalRanged?: boolean; projectileMove?: boolean; rampage?: boolean;
  ranged?: boolean; recoil?: boolean; resetTerrain?: boolean; resistedWithDefense?: boolean; shieldMove?: boolean;
  soundBased?: boolean; successiveActions?: boolean; switcherMoveForFoe?: boolean; tripleAction?: boolean;
  unique?: boolean; userFaints?: boolean; vulnerable?: boolean; windBased?: boolean;
}

export type EffectTarget = 'User' | 'Targets';

export interface MoveAddedEffects {
  Ailments?: { Type: string; Affects: EffectTarget; ChanceDice?: number; Rounds?: number; TargetType?: string }[];
  StatChanges?: { Stats: string[]; Stages: number; Affects: EffectTarget; ChanceDice?: number }[];
  AilmentHeal?: string[];
  Heal?: { Type: 'Leech' | 'Basic' | 'Complete'; Target: EffectTarget; Percentage?: number; WillPointCost?: number };
  FixedDamage?: { Type: 'Absolute' | 'OneHitKO' | 'HpPercentage' | 'MaxHpPercentage'; Target: EffectTarget; Value?: number; MaxValue?: number };
  TerrainEffect?: string;
  IgnoreShield?: boolean;
}

export interface Move {
  id: string;
  name: string;
  type: MoveType;
  damage1: string;
  damage2: string;
  accuracy1: string;
  accuracy2: string;
  damagePower: string | null;
  category: MoveCategory;
  effect: string;
  target: MoveTarget;
  description: string;
  attributes: MoveAttributes;
  addedEffects: MoveAddedEffects;
  hash: string;
}

export interface Item {
  id: string;
  name: string;
  source: string;
  category: ItemCategory | null;
  pocket: ItemPocket;
  description: string;
  oneUse: boolean;
  PMD: boolean;
  /** Strings in reference data; custom items store numbers. */
  trainerPrice: string | number | null;
  pmdPrice: string | number | null;
  image: string;
  hash: string;
  campaign: Campaign;
}

export interface Evolution {
  type: 'FROM' | 'TO';
  targetId: string;
  kind: 'LEVEL' | 'MEGA' | 'TRADE' | 'SPECIAL' | 'STONE' | 'STAT' | 'ITEM' | 'FORM';
  speed?: 'Slow' | 'Medium' | 'Fast' | 'Unknown';
  special?: string;
  item?: string;
  region?: string;
  value?: number;
}

/** Core entries carry their own `id`; campaign templates keep the `moveId` they were saved with. */
export interface PossibleMove {
  id?: string;
  moveId?: string;
  rank: Rank;
  move: Move;
}

export interface PokemonTemplate {
  id: string;
  number: number;
  dexID: string;
  name: string;
  types: PokemonType[];
  recommendedRank: Rank;
  baseHp: number;
  baseStats: AttributeStats;
  maxStats: AttributeStats;
  genderType: GenderType;
  legendary: boolean;
  goodStarter: boolean;
  dexCategory: string;
  height: number;
  weight: number;
  description: string;
  evolutions: Evolution[];
  image: string;
  habitats: Habitat[];
  hash: string | null;
  campaign: Campaign | null;
  abilityOne: Ability | null;
  abilityTwo: Ability | null;
  hiddenAbility: Ability | null;
  eventAbility: Ability | null;
  possibleMoves: PossibleMove[];
}

/** List endpoints (`filtered`, `campaigns`) omit the nested moves. */
export type PokemonTemplateSummary = Omit<PokemonTemplate, 'possibleMoves'>;

/** Reference template as stored in the compact build output (public/reference/). */
export type CompactPokemonTemplate =
  Omit<PokemonTemplate, 'abilityOne' | 'abilityTwo' | 'hiddenAbility' | 'eventAbility' | 'possibleMoves'> & {
    abilityOneId: string | null;
    abilityTwoId: string | null;
    hiddenAbilityId: string | null;
    eventAbilityId: string | null;
    possibleMoves: { id: string; rank: Rank; moveId: string }[];
  };

export type RankUpAttributes = {
  rank: Rank;
  skillPoints: number;
  attributePoints: number;
  socialPoints: number;
  skillLimit: number;
};
export type RankUpTable = Partial<Record<Rank, RankUpAttributes>>;

// User-created records, as stored in D1.

export interface PokemonRecord {
  id: string;
  userId: string;
  pokemonTemplateId: string;
  rank: Rank;
  gender: Gender;
  noOfBattles: number;
  trainingPoints: number;
  moveIds: string[];
  abilityId: string | null;
  natureId: string | null;
  heldItemId: string | null;
  trainerId: string | null;
  /** Missing on older records; a Pokemon can belong to a city or a trainer, not both. */
  cityId?: string | null;
  stats: Stats;
  currentHp: number;
  currentWill: number;
}

/** A Pokemon sheet as returned by the API. */
export interface Pokemon extends PokemonRecord {
  pokemonTemplate: PokemonTemplate;
  ability: Ability | null;
  nature: Nature | null;
  heldItem: Item | null;
  trainer: TrainerRecord | null;
  moves: Move[];
}

export interface PokemonMinimal {
  id: string;
  name: string;
  number: number;
  dexID: string;
  image: string;
  types: PokemonType[];
  rank: Rank;
}

/** Inventory entries reference an item, or carry a custom item's fields inline. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type InventoryEntry = { id: string; quantity: number } & (
  | { itemId: string }
  | Pick<Item, 'name' | 'source' | 'category' | 'pocket' | 'description' | 'oneUse' | 'PMD' | 'trainerPrice' | 'pmdPrice' | 'image'>
);

export interface TrainerRecord {
  id: string;
  userId: string;
  rank: Rank;
  name: string;
  age: number;
  gender: Gender;
  money: number;
  natureId: string | null;
  inventory: InventoryEntry[];
  stats: Stats;
  currentHp: number;
  currentWill: number;
}

/** Custom inventory items get `id: "custom-<entry id>"`. */
export type HydratedInventoryEntry = InventoryEntry & { item: Item };

export interface Trainer extends Omit<TrainerRecord, 'inventory'> {
  nature: Nature | null;
  pokemon: Pokemon[];
  inventory: HydratedInventoryEntry[];
}

export interface Feedback {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  message: string;
  createdAt: string;
}

/** A report the Worker opened as a GitHub issue (worker/github.ts). */
export interface IssueReport {
  id: string;
  userId: string;
  title: string;
  number: number;
  url: string;
  createdAt: string;
}

/** `POST /{moves,abilities}/names`: what a picker needs. */
export interface NamedEntry {
  id: string;
  name: string;
  campaignName: string | null;
}

// Request bodies.

export interface SelectionBody {
  includeCore?: boolean;
  campaignIds?: string[];
}

export interface GeneratePokemonBody extends SelectionBody {
  rank: Rank;
  seed?: number;
  numberToGenerate?: number;
  pokemonTemplateId?: string;
  habitats?: Habitat[];
  includeLegendary?: LegendaryFilter;
  rankOrBelow?: boolean;
  rankUpMethod?: RankUpMethod;
}

export interface GenerateItemsBody extends SelectionBody {
  seed?: number;
  numberToGenerate?: number;
  categories?: ItemCategory[];
  pockets?: ItemPocket[];
}

export interface GenerateEncounterBody extends SelectionBody {
  seed?: number;
  numberToGenerate?: number;
  name?: string;
  types?: PokemonType[];
  generations?: number[];
  habitats?: Habitat[];
  ranks?: Rank[];
  rankOrBelow?: boolean;
  includeLegendary?: LegendaryFilter;
  includeMythical?: boolean;
  excludeForms?: boolean;
  allowDuplicates?: boolean;
  excludeStarters?: boolean;
  fossils?: 'ALL' | 'NONE' | 'ONLY';
  excludedTemplateIds?: string[];
  rankUpMethod?: RankUpMethod;
}

export type CreatePokemonBody = Partial<Omit<PokemonRecord, 'stats'>> & { pokemonTemplateId: string; stats?: Partial<Stats> };
export type UpdatePokemonBody = Partial<PokemonRecord> & {
  id: string;
  /** Explicitly take a city resident into the personal collection. */
  takeOwnership?: boolean;
};
export type CreateTrainerBody = Partial<Omit<TrainerRecord, 'stats'>> & { stats?: Partial<Stats> };
export type UpdateTrainerBody = Partial<Omit<TrainerRecord, 'inventory'>> & {
  id: string;
  pokemonIds?: string[];
  inventory?: (DistributiveOmit<InventoryEntry, 'id'> & { id?: string })[];
};
export type CampaignBody = Partial<Campaign> & { name: string };
export type FeedbackBody = Pick<Feedback, 'name' | 'email' | 'message'>;
/** Longest title and description an issue report may have. */
export const ISSUE_TITLE_LIMIT = 120;
export const ISSUE_DESCRIPTION_LIMIT = 5000;
export interface IssueReportBody {
  title: string;
  description: string;
}
/** What the template form sends: evolution rows can still be blank and `speed` is free text. */
export type EvolutionBody = Omit<Evolution, 'type' | 'kind' | 'speed'> & {
  type: Evolution['type'] | '';
  kind: Evolution['kind'] | '';
  speed?: string;
};
/** Custom templates reference abilities and moves by id; the form can send TYPELESS/VARIES types. */
export type CustomPokemonTemplateBody =
  Omit<CompactPokemonTemplate,
    'hash' | 'campaign' | 'types' | 'genderType' | 'description' | 'evolutions' | 'possibleMoves'
    | 'abilityTwoId' | 'hiddenAbilityId' | 'eventAbilityId'> & {
    campaignId: string;
    types: MoveType[];
    genderType?: GenderType;
    description?: string;
    evolutions: EvolutionBody[];
    abilityTwoId?: string;
    hiddenAbilityId?: string;
    eventAbilityId?: string;
    possibleMoves: { id?: string; rank: Rank; moveId: string }[];
  };

export interface ApiError {
  status?: number;
  payload: string;
}
