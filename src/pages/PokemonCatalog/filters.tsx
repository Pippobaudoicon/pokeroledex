import * as React from "react";
import type * as T from "../../../shared/types";
import { Habitat, Rank } from "@/api/schemas";
import { Chip, Stepper, Switch } from "@/components/kit/Controls";
import { Group } from "@/components/kit/List";
import { Picker } from "@/components/kit/Picker";
import { RankBall } from "@/components/kit/Pills";
import { useLearners, useMoveIndex } from "@/hooks/use-dex";
import { formatEnumName } from "@/lib/utils";

export interface DexFilters {
  types: T.PokemonType[];
  rank: T.Rank | "";
  andLower: boolean;
  habitats: T.Habitat[];
  moveId: string;
  abilityId: string;
  minimums: Partial<Record<T.Attribute, number>>;
}

export const noFilters: DexFilters = { types: [], rank: "", andLower: true, habitats: [], moveId: "", abilityId: "", minimums: {} };

const ranks = Object.values(Rank);
export const attributeNames: Record<T.Attribute, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Vitality",
  special: "Special",
  insight: "Insight",
};

const abilitiesOf = (pokemon: T.PokemonTemplateSummary) => [pokemon.abilityOne, pokemon.abilityTwo, pokemon.hiddenAbility, pokemon.eventAbility];

/** The filter as a predicate; undefined while the learners of the picked move are loading. */
export const useDexPredicate = (filters: DexFilters) => {
  const { data: learners } = useLearners(filters.moveId);
  return React.useMemo(() => {
    if (filters.moveId && !learners) return undefined;
    const learnerSet = new Set(learners);
    const rankIndex = filters.rank ? ranks.indexOf(filters.rank) : -1;
    return (pokemon: T.PokemonTemplateSummary) =>
      (filters.types.length === 0 || filters.types.every((type) => pokemon.types.includes(type))) &&
      (rankIndex < 0 ||
        (filters.andLower ? ranks.indexOf(pokemon.recommendedRank) <= rankIndex : ranks.indexOf(pokemon.recommendedRank) === rankIndex)) &&
      (filters.habitats.length === 0 || filters.habitats.some((habitat) => pokemon.habitats.includes(habitat))) &&
      (!filters.moveId || learnerSet.has(pokemon.id)) &&
      (!filters.abilityId || abilitiesOf(pokemon).some((ability) => ability?.id === filters.abilityId)) &&
      Object.entries(filters.minimums).every(([stat, minimum]) => pokemon.baseStats[stat as T.Attribute] >= (minimum ?? 0));
  }, [filters, learners]);
};

/** Every ability the listed species can have, for the ability picker. */
const useAbilityItems = (dex: T.PokemonTemplateSummary[] | undefined) =>
  React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const pokemon of dex ?? []) for (const ability of abilitiesOf(pokemon)) if (ability) byId.set(ability.id, ability.name);
    return [...byId].map(([value, label]) => ({ value, label })).sort((first, second) => first.label.localeCompare(second.label));
  }, [dex]);

const useMoveItems = () => {
  const { data, isFetching } = useMoveIndex();
  const items = React.useMemo(
    () => (data ?? []).map((move) => ({ value: move.id, label: move.name, detail: formatEnumName(move.type) })).sort((first, second) => first.label.localeCompare(second.label)),
    [data],
  );
  return { items, loading: isFetching };
};

const toggle = <V,>(list: V[], value: V) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);

const habitatName = (habitat: string) => formatEnumName(habitat).replace(/ And /g, " & ");

/** Everything but types, which sit above the list. Shown in a sheet. */
export const FilterForm = ({
  filters,
  setFilters,
  dex,
}: {
  filters: DexFilters;
  setFilters: React.Dispatch<React.SetStateAction<DexFilters>>;
  dex: T.PokemonTemplateSummary[] | undefined;
}) => {
  const moves = useMoveItems();
  const abilities = useAbilityItems(dex);
  const set = <K extends keyof DexFilters>(key: K, value: DexFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className="flex flex-col gap-6 p-4">
      <Group title="Recommended rank">
        <div className="flex flex-col gap-3 p-3">
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
            <Chip pressed={filters.rank === ""} onClick={() => set("rank", "")}>
              Any
            </Chip>
            {ranks.map((rank) => (
              <Chip key={rank} pressed={filters.rank === rank} onClick={() => set("rank", filters.rank === rank ? "" : rank)}>
                <RankBall rank={rank} className="size-3.5" />
                {formatEnumName(rank)}
              </Chip>
            ))}
          </div>
          <label htmlFor="and-lower" className="flex items-center justify-between gap-3 text-body">
            Include lower ranks
            <Switch id="and-lower" checked={filters.andLower} onChange={(checked) => set("andLower", checked)} />
          </label>
        </div>
      </Group>
      <Group title="Learns" footer="Species that can learn this move at any rank.">
        <div className="p-2">
          <Picker items={moves.items} loading={moves.loading} value={filters.moveId} onChange={(value) => set("moveId", value)} placeholder="Any move" label="Learns move" />
        </div>
      </Group>
      <Group title="Ability">
        <div className="p-2">
          <Picker items={abilities} value={filters.abilityId} onChange={(value) => set("abilityId", value)} placeholder="Any ability" label="Ability" />
        </div>
      </Group>
      <Group title="Minimum base attributes">
        {(Object.keys(attributeNames) as T.Attribute[]).map((stat) => (
          <div key={stat} className="flex items-center justify-between gap-3 border-b border-hairline py-1 pr-1.5 pl-4 last:border-b-0 lg:pl-3">
            <span className="text-body">{attributeNames[stat]}</span>
            <Stepper
              label={`minimum ${attributeNames[stat]}`}
              value={filters.minimums[stat] ?? 0}
              min={0}
              max={10}
              display={filters.minimums[stat] ? `${filters.minimums[stat]}+` : "Any"}
              className="bg-transparent"
              onChange={(value) =>
                setFilters(({ minimums: { [stat]: _, ...others }, ...current }) => ({ ...current, minimums: value === 0 ? others : { ...others, [stat]: value } }))
              }
            />
          </div>
        ))}
      </Group>
      <Group title="Habitats" footer="Matches any of the picked habitats.">
        <div className="flex flex-wrap gap-1.5 p-3">
          {Object.values(Habitat)
            .sort()
            .map((habitat) => (
              <Chip key={habitat} pressed={filters.habitats.includes(habitat)} onClick={() => set("habitats", toggle(filters.habitats, habitat))}>
                {habitatName(habitat)}
              </Chip>
            ))}
        </div>
      </Group>
    </div>
  );
};

/** The active filters as removable chips, so a collapsed filter never hides what is applied. */
export const activeFilterChips = (filters: DexFilters, names: { move?: string; ability?: string }) => {
  const chips: { key: string; label: string; clear: (filters: DexFilters) => DexFilters }[] = [];
  for (const type of filters.types)
    chips.push({ key: type, label: formatEnumName(type), clear: (current) => ({ ...current, types: current.types.filter((entry) => entry !== type) }) });
  if (filters.rank)
    chips.push({
      key: "rank",
      label: `${formatEnumName(filters.rank)}${filters.andLower ? " or lower" : ""}`,
      clear: (current) => ({ ...current, rank: "" }),
    });
  if (filters.moveId) chips.push({ key: "move", label: `Learns ${names.move ?? "move"}`, clear: (current) => ({ ...current, moveId: "" }) });
  if (filters.abilityId) chips.push({ key: "ability", label: names.ability ?? "Ability", clear: (current) => ({ ...current, abilityId: "" }) });
  for (const [stat, minimum] of Object.entries(filters.minimums))
    chips.push({
      key: stat,
      label: `${attributeNames[stat as T.Attribute].slice(0, 3)} ${minimum}+`,
      clear: ({ minimums: { [stat as T.Attribute]: _, ...others }, ...current }) => ({ ...current, minimums: others }),
    });
  for (const habitat of filters.habitats)
    chips.push({ key: habitat, label: habitatName(habitat), clear: (current) => ({ ...current, habitats: current.habitats.filter((entry) => entry !== habitat) }) });
  return chips;
};
