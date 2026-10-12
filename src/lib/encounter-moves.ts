import { ATTRIBUTES, type Move, type Pokemon, type StatKey } from "../../shared/types.ts";
import { getTotalStat } from "./stats.ts";

/** Substitute sheet values, then add every combination of slash-separated choices. */
function dicePool(formulas: (string | null | undefined)[], pokemon: Pokemon): string {
  const parts = formulas.filter((formula): formula is string => !!formula).map((formula) =>
    formula.split("/").map((term) => {
      const key = term.trim().toLowerCase() as StatKey;
      if (key === "will") return String(getTotalStat(pokemon, "insight") + 3);
      if (ATTRIBUTES.some((attribute) => attribute === key)) return String(getTotalStat(pokemon, key as typeof ATTRIBUTES[number]));
      if (Object.hasOwn(pokemon.stats, key)) {
        const base = ["tough", "cool", "beauty", "cute", "clever"].includes(key) ? 1 : 0;
        return String(pokemon.stats[key] + base);
      }
      return term.trim();
    }).join("/"),
  );
  if (!parts.length) return "—";
  let totals = [0];
  for (const part of parts) {
    const choices = part.split("/").map(Number);
    if (!choices.every(Number.isFinite)) return parts.join(" + ");
    totals = totals.flatMap((total) => choices.map((choice) => total + choice));
  }
  return [...new Set(totals)].join("/");
}

/** Physical or Special moves of one of the user's own types roll 1 extra damage die (corebook p. 60). */
const hasStab = (move: Move, pokemon: Pokemon) =>
  move.category !== "SUPPORT" && pokemon.pokemonTemplate.types.some((type) => type === move.type);

export function encounterMovePools(move: Move, pokemon: Pokemon) {
  const power = Number(move.damagePower) || 0;
  const stab = hasStab(move, pokemon);
  return {
    accuracy: dicePool([move.accuracy1, move.accuracy2], pokemon),
    damage: move.damage1 || move.damage2
      ? dicePool([move.damage1, move.damage2, power > 0 ? String(power) : "", stab ? "1" : ""], pokemon)
      : "—",
    stab,
  };
}
