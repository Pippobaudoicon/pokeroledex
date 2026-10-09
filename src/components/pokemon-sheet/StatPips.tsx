import * as React from "react";
import type * as T from "../../../shared/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatPips } from "@/components/Pips";
import { type PokemonStatKey, usePokemon } from "@/components/pokemon-sheet/context";
import {
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  SOCIALS,
  getTotalStat,
} from "@/lib/stats";

type StatType = "attribute" | "social" | "skill" | "other";

export const PokemonStatPips = ({
  stat,
  type,
  className,
  pipClassName,
}: {
  stat: PokemonStatKey;
  type: StatType;
  className?: string;
  pipClassName?: string;
}) => {
  const {
    basePokemon,
    updatedPokemon,
    updatePokemon,
    rankUpAttributes,
    editingMode,
    statChanges,
  } = usePokemon();
  const selectPip = (index: number, statKey: PokemonStatKey) => {
    if (updatedPokemon == null || basePokemon == null) return;
    const pokemon = {
      ...updatedPokemon,
    };
    if (pokemon.stats == null) return;
    const minValue =
      type === "attribute"
        ? basePokemon.pokemonTemplate.baseStats[statKey as T.Attribute]
        : type === "skill"
          ? 0
          : 1;
    const currentValue = basePokemon.stats[statKey] + (statChanges?.[statKey] ?? 0);
    const selectedValue = index + 1 - minValue;
    const resetValue = editingMode === "edit" ? 0 : basePokemon.stats[statKey];
    const stats = {
      ...pokemon.stats,
      [statKey]: currentValue === selectedValue ? resetValue : selectedValue,
    };
    updatePokemon({
      stats,
    });
  };
  const sumChanges = (keys: readonly PokemonStatKey[]) =>
    keys.reduce((sum, key) => sum + (statChanges?.[key] ?? 0), 0);
  const allocatablePoints = React.useMemo(() => {
    if (editingMode === "edit") return Infinity;
    if (editingMode === "view" || rankUpAttributes == null) return 0;
    switch (type) {
      case "attribute":
        return (rankUpAttributes?.attributePoints ?? 0) - sumChanges(POKEMON_ATTRIBUTES);
      case "social":
        return (rankUpAttributes?.socialPoints ?? 0) - sumChanges(SOCIALS);
      case "skill":
        return (rankUpAttributes?.skillPoints ?? 0) - sumChanges(POKEMON_SKILLS);
      case "other":
        return 0;
    }
  }, [rankUpAttributes, statChanges, editingMode]);
  const limit = () => {
    if (editingMode !== "edit" && type === "skill") return rankUpAttributes?.skillLimit;
  };
  const baseStat = () =>
    basePokemon == null
      ? 0
      : editingMode === "rankUp" || editingMode === "view"
        ? type === "attribute"
          ? getTotalStat(basePokemon, stat as T.Attribute)
          : type === "skill"
            ? basePokemon.stats[stat]
            : basePokemon.stats[stat] + 1
        : type === "attribute"
          ? basePokemon.pokemonTemplate.baseStats[stat as T.Attribute]
          : type === "skill"
            ? 0
            : 1;
  const maxStat = () =>
    basePokemon == null
      ? 0
      : editingMode === "edit"
        ? type === "attribute"
          ? 12
          : 5
        : type === "attribute"
          ? basePokemon.pokemonTemplate.maxStats[stat as T.Attribute]
          : 5;
  const numSelected = () =>
    editingMode === "edit"
      ? (basePokemon?.stats[stat] ?? 0) + (statChanges?.[stat] ?? 0)
      : (statChanges?.[stat] ?? 0);
  return basePokemon == null || updatedPokemon == null ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : (
    <StatPips
      maxPips={type === "attribute" ? 12 : 5}
      baseStat={baseStat()}
      maxStat={maxStat()}
      numSelected={numSelected()}
      allocatablePoints={allocatablePoints}
      onSelect={(index: number) => {
        selectPip(index, stat);
      }}
      limit={limit()}
      className={className}
      pipClassName={pipClassName}
    />
  );
};
