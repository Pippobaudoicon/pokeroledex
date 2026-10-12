import { ATTRIBUTES, type Move, type Pokemon, type StatKey } from "../../shared/types.ts";
import { getTotalStat } from "./stats.ts";

/** A sheet value by stat name, or the term itself when it is not a stat. */
function termValue(term: string, pokemon: Pokemon): string {
  const key = term.trim().toLowerCase() as StatKey;
  if (key === "will") return String(getTotalStat(pokemon, "insight") + 3);
  if (ATTRIBUTES.some((attribute) => attribute === key)) return String(getTotalStat(pokemon, key as typeof ATTRIBUTES[number]));
  if (Object.hasOwn(pokemon.stats, key)) {
    const base = ["tough", "cool", "beauty", "cute", "clever"].includes(key) ? 1 : 0;
    return String(pokemon.stats[key] + base);
  }
  return term.trim();
}

/** Each term with its value, e.g. "2 Strength + 1 Channel / 3 Nature". */
function poolBreakdown(formulas: (string | null | undefined)[], pokemon: Pokemon): string {
  return formulas.filter((formula): formula is string => !!formula).map((formula) =>
    formula.split("/").map((term) => {
      const value = termValue(term, pokemon);
      return value === term.trim() ? value : `${value} ${term.trim()}`;
    }).join(" / "),
  ).join(" + ");
}

/** Substitute sheet values, then add every combination of slash-separated choices. */
function dicePool(formulas: (string | null | undefined)[], pokemon: Pokemon): string {
  const parts = formulas.filter((formula): formula is string => !!formula).map((formula) =>
    formula.split("/").map((term) => termValue(term, pokemon)).join("/"),
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
  const accuracy = [move.accuracy1, move.accuracy2];
  const damage = [move.damage1, move.damage2];
  const hasDamage = !!(move.damage1 || move.damage2);
  return {
    accuracy: dicePool(accuracy, pokemon),
    accuracyBreakdown: poolBreakdown(accuracy, pokemon),
    damage: hasDamage ? dicePool([...damage, power > 0 ? String(power) : "", stab ? "1" : ""], pokemon) : "—",
    damageBreakdown: hasDamage
      ? [poolBreakdown(damage, pokemon), power > 0 && `${power} Power`, stab && "1 S.T.A.B."].filter(Boolean).join(" + ")
      : "",
    stab,
  };
}
