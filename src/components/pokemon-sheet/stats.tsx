import { Minus, Plus } from "lucide-react";
import type * as T from "../../../shared/types";
import { Group } from "@/components/kit/List";
import { type PokemonStatKey, usePokemon } from "@/components/pokemon-sheet/context";
import { POKEMON_ATTRIBUTES, POKEMON_SKILLS, SOCIALS } from "@/lib/stats";
import { capitalize, cn } from "@/lib/utils";

export type StatType = "attribute" | "social" | "skill" | "other";

const categoryStats: Record<Exclude<StatType, "other">, readonly PokemonStatKey[]> = {
  attribute: POKEMON_ATTRIBUTES,
  social: SOCIALS,
  skill: POKEMON_SKILLS,
};

/** Rank-up points still to spend in a category; Infinity while editing freely, 0 in view mode. */
export const usePointsLeft = (type: StatType) => {
  const { editingMode, rankUpAttributes, statChanges } = usePokemon();
  if (editingMode === "edit") return Infinity;
  if (editingMode === "view" || type === "other" || !rankUpAttributes) return 0;
  const budget = { attribute: rankUpAttributes.attributePoints, social: rankUpAttributes.socialPoints, skill: rankUpAttributes.skillPoints }[type];
  return budget - categoryStats[type].reduce((sum, key) => sum + (statChanges?.[key] ?? 0), 0);
};

/**
 * Stored stats are offsets: attributes add to the species' base, socials and happiness/loyalty start at 1,
 * skills at 0. The row shows the total and keeps the old pip rules for each editing mode.
 */
const useStat = (stat: PokemonStatKey, type: StatType) => {
  const { basePokemon, updatedPokemon, updatePokemon, editingMode, rankUpAttributes } = usePokemon();
  const pointsLeft = usePointsLeft(type);
  if (!basePokemon || !updatedPokemon) return undefined;
  const template = updatedPokemon.pokemonTemplate;
  const offset = type === "attribute" ? template.baseStats[stat as T.Attribute] : type === "skill" ? 0 : 1;
  const value = updatedPokemon.stats[stat] + offset;
  const before = basePokemon.stats[stat] + offset;
  const cap =
    editingMode === "edit"
      ? type === "attribute"
        ? 12
        : 5
      : type === "attribute"
        ? template.maxStats[stat as T.Attribute]
        : type === "skill" && editingMode === "rankUp"
          ? Math.min(5, rankUpAttributes?.skillLimit ?? 5)
          : 5;
  const editable = editingMode === "edit" || (editingMode === "rankUp" && type !== "other");
  const min = editingMode === "rankUp" ? before : offset;
  const max = editable ? Math.min(cap, value + Math.max(0, pointsLeft)) : value;
  return {
    value,
    before: editingMode === "rankUp" ? before : value,
    cap: Math.max(cap, value),
    editable,
    min,
    max,
    set: (next: number) => updatePokemon({ stats: { ...updatedPokemon.stats, [stat]: next - offset } }),
  };
};

const stepClass =
  "grid size-11 shrink-0 place-items-center rounded-full bg-fill text-label transition-[background-color,transform] duration-150 hover:bg-fill-strong active:scale-90 disabled:opacity-25 lg:size-7";

export const StatRow = ({ stat, type, label }: { stat: PokemonStatKey; type: StatType; label?: string }) => {
  const data = useStat(stat, type);
  if (!data) return null;
  const name = label ?? capitalize(stat);
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-hairline py-1 pr-2 pl-4 last:border-b-0 lg:min-h-9 lg:pl-3">
      <span className="w-22 shrink-0 text-body lg:w-20">{name}</span>
      <span aria-hidden className="flex min-w-0 flex-1 gap-[3px]">
        {Array.from({ length: data.cap }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2.5 max-w-5 min-w-1 flex-1 rounded-full transition-colors duration-200",
              index < data.before ? "bg-label" : index < data.value ? "bg-tint" : "border-[1.5px] border-label/25",
            )}
          />
        ))}
      </span>
      {data.editable && (
        <button type="button" className={stepClass} aria-label={`Lower ${name}`} disabled={data.value <= data.min} onClick={() => data.set(data.value - 1)}>
          <Minus aria-hidden className="size-4 lg:size-3.5" />
        </button>
      )}
      <output aria-label={name} className="w-6 shrink-0 text-center text-body font-semibold tabular-nums">
        {data.value}
      </output>
      {data.editable && (
        <button type="button" className={stepClass} aria-label={`Raise ${name}`} disabled={data.value >= data.max} onClick={() => data.set(data.value + 1)}>
          <Plus aria-hidden className="size-4 lg:size-3.5" />
        </button>
      )}
    </div>
  );
};

const PointsLeft = ({ type }: { type: StatType }) => {
  const { editingMode } = usePokemon();
  const left = usePointsLeft(type);
  if (editingMode !== "rankUp") return null;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-footnote font-semibold", left > 0 ? "bg-tint/10 text-tint" : "bg-fill text-label-2")}>
      {left} {left === 1 ? "point" : "points"} left
    </span>
  );
};

export const StatGroups = () => (
  <div className="flex flex-col gap-6 @3xl:gap-5">
    <Group title="Attributes" action={<PointsLeft type="attribute" />}>
      {POKEMON_ATTRIBUTES.map((stat) => (
        <StatRow key={stat} stat={stat} type="attribute" />
      ))}
    </Group>
    <Group title="Skills" action={<PointsLeft type="skill" />}>
      {POKEMON_SKILLS.map((stat) => (
        <StatRow key={stat} stat={stat} type="skill" />
      ))}
    </Group>
    <Group title="Socials" action={<PointsLeft type="social" />}>
      {SOCIALS.map((stat) => (
        <StatRow key={stat} stat={stat} type="social" />
      ))}
    </Group>
    <Group title="Bond">
      <StatRow stat="happiness" type="other" />
      <StatRow stat="loyalty" type="other" />
    </Group>
  </div>
);
