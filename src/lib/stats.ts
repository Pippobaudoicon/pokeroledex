import type { Attribute, Pokemon } from "../../shared/types";

/** Template base value plus the points the Pokemon has invested. */
export const getTotalStat = (pokemon: Pokemon, attribute: Attribute) => {
  const base = pokemon.pokemonTemplate.baseStats[attribute];
  const invested = pokemon.stats[attribute];
  return base + invested;
};
export const POKEMON_SKILLS = [
  "brawl",
  "channel",
  "clash",
  "evasion",
  "alert",
  "athletic",
  "nature",
  "stealth",
  "allure",
  "etiquette",
  "intimidate",
  "perform",
] as const;
export const POKEMON_ATTRIBUTES = [
  "strength",
  "dexterity",
  "vitality",
  "special",
  "insight",
] as const;
export const SOCIALS = ["tough", "cool", "beauty", "cute", "clever"] as const;
export const TRAINER_SKILLS = [
  "brawl",
  "throw",
  "evasion",
  "weapons",
  "alert",
  "athletic",
  "nature",
  "stealth",
  "empathy",
  "etiquette",
  "intimidate",
  "perform",
  "crafts",
  "lore",
  "medicine",
  "science",
] as const;
export const TRAINER_ATTRIBUTES = [
  "strength",
  "dexterity",
  "vitality",
  "insight",
] as const;
/** Three-letter label for a stat name, matched case-insensitively. */
export const abbreviateStat = (stat: unknown) => {
  switch (typeof stat == "string" ? stat.toLowerCase() : stat) {
    case "brawl":
      return "Brl";
    case "channel":
      return "Chn";
    case "clash":
      return "Cls";
    case "evasion":
      return "Eva";
    case "alert":
      return "Alt";
    case "athletic":
      return "Ath";
    case "nature":
      return "Nat";
    case "stealth":
      return "Stl";
    case "allure":
      return "Alr";
    case "empathy":
      return "Emp";
    case "etiquette":
      return "Etq";
    case "intimidate":
      return "Itm";
    case "perform":
      return "Prf";
    case "strength":
      return "Str";
    case "dexterity":
      return "Dex";
    case "vitality":
      return "Vit";
    case "special":
      return "Spc";
    case "insight":
      return "Ins";
    case "tough":
      return "Tgh";
    case "cool":
      return "Col";
    case "beauty":
      return "Bty";
    case "cute":
      return "Cut";
    case "clever":
      return "Clv";
    case "will":
      return "Wil";
    case "loyalty":
      return "Lty";
    case "hapiness":
      return "Hap";
    default:
      return "???";
  }
};
