// Enum-like value objects used by the UI. Their value unions match shared/types.ts.
import type * as T from "../../shared/types";
import { HABITATS } from "../../shared/habitats";

export const Rank = {
  UNRANKED: "UNRANKED",
  STARTER: "STARTER",
  ROOKIE: "ROOKIE",
  STANDARD: "STANDARD",
  ADVANCED: "ADVANCED",
  EXPERT: "EXPERT",
  ACE: "ACE",
  MASTER: "MASTER",
  CHAMPION: "CHAMPION",
} as const satisfies Record<string, T.Rank>;
export type Rank = (typeof Rank)[keyof typeof Rank];

export const Gender = {
  M: "M",
  F: "F",
  N: "N",
} as const satisfies Record<string, T.Gender>;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const PokemonType = {
  BUG: "BUG",
  DARK: "DARK",
  DRAGON: "DRAGON",
  ELECTRIC: "ELECTRIC",
  FAIRY: "FAIRY",
  FIGHTING: "FIGHTING",
  FIRE: "FIRE",
  FLYING: "FLYING",
  GHOST: "GHOST",
  GRASS: "GRASS",
  GROUND: "GROUND",
  ICE: "ICE",
  NORMAL: "NORMAL",
  POISON: "POISON",
  PSYCHIC: "PSYCHIC",
  ROCK: "ROCK",
  STEEL: "STEEL",
  WATER: "WATER",
  TYPELESS: "TYPELESS",
  VARIES: "VARIES",
} as const satisfies Record<string, T.MoveType>;
export type PokemonType = (typeof PokemonType)[keyof typeof PokemonType];

export const Habitat = Object.fromEntries(Object.keys(HABITATS).map(id => [id, id])) as { [H in keyof typeof HABITATS]: H };
export type Habitat = T.Habitat;

export const MoveCategory = {
  PHYSICAL: "PHYSICAL",
  SPECIAL: "SPECIAL",
  SUPPORT: "SUPPORT",
  PHYSICAL_SPECIAL: "PHYSICAL_SPECIAL",
  SUPPORT_PHYSICAL_SPECIAL: "SUPPORT_PHYSICAL_SPECIAL",
} as const satisfies Record<string, T.MoveCategory>;
export type MoveCategory = (typeof MoveCategory)[keyof typeof MoveCategory];

export const MoveTarget = {
  USER_AND_ALLIES: "USER_AND_ALLIES",
  FOE: "FOE",
  RANDOM_FOE: "RANDOM_FOE",
  ALL_FOES: "ALL_FOES",
  ALL_ALLIES: "ALL_ALLIES",
  AREA: "AREA",
  ALLYS_BATTLEFIELD: "ALLYS_BATTLEFIELD",
  FOES_BATTLEFIELD: "FOES_BATTLEFIELD",
  BATTLEFIELD: "BATTLEFIELD",
  SELF: "SELF",
  ALLY: "ALLY",
} as const satisfies Record<string, T.MoveTarget>;
export type MoveTarget = (typeof MoveTarget)[keyof typeof MoveTarget];

export const EvolutionDirection = {
  TO: "TO",
  FROM: "FROM",
} as const;
export type EvolutionDirection = (typeof EvolutionDirection)[keyof typeof EvolutionDirection];

export const EvolutionKind = {
  LEVEL: "LEVEL",
  MEGA: "MEGA",
  FORM: "FORM",
  STAT: "STAT",
  STONE: "STONE",
  TRADE: "TRADE",
  SPECIAL: "SPECIAL",
  ITEM: "ITEM",
} as const;
export type EvolutionKind = (typeof EvolutionKind)[keyof typeof EvolutionKind];

export const ItemCategory = {
  MEGA_STONE: "MEGA_STONE",
  BATTLE_ITEM: "BATTLE_ITEM",
  TYPE_BOOSTING: "TYPE_BOOSTING",
  Z_CRYSTAL: "Z_CRYSTAL",
  STATUS: "STATUS",
  BERRY: "BERRY",
  MON_BOOSTING: "MON_BOOSTING",
  VITAMIN: "VITAMIN",
  HEALING: "HEALING",
} as const satisfies Record<string, T.ItemCategory>;
export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory];

export const ItemPocket = {
  HELD_ITEMS: "HELD_ITEMS",
  MEDICINE: "MEDICINE",
  TRAINER_ITEMS: "TRAINER_ITEMS",
  EVOLUTION_ITEM: "EVOLUTION_ITEM",
  POKEBALLS: "POKEBALLS",
  TECHNICAL_MACHINE: "TECHNICAL_MACHINE",
} as const satisfies Record<string, T.ItemPocket>;
export type ItemPocket = (typeof ItemPocket)[keyof typeof ItemPocket];

export const RankUpMethod = {
  RANDOM: "RANDOM",
  OPTIMIZED: "OPTIMIZED",
  MIN_MAX: "MIN_MAX",
} as const satisfies Record<string, T.RankUpMethod>;
export type RankUpMethod = (typeof RankUpMethod)[keyof typeof RankUpMethod];

export const LegendaryFilter = {
  NONE: "NONE",
  ALL: "ALL",
  ONLY: "ONLY",
} as const satisfies Record<string, T.LegendaryFilter>;
export type LegendaryFilter = (typeof LegendaryFilter)[keyof typeof LegendaryFilter];
