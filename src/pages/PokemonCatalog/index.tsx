import { useDebounce, useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Link, useParams } from "react-router-dom";
import {
  useNamesControllerFindByCampaigns,
  usePokemonTemplatesControllerFindByCampaignsMinimal,
  usePokemonTemplatesControllerFindLearners,
} from "@/api/components";
import { Habitat, PokemonType, Rank } from "@/api/schemas";
import { FilterSection } from "@/components/FilterSection";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { PokemonTemplateCard } from "@/components/PokemonTemplateCard";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { Combobox } from "@/components/Combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { type ListFilter, useRegisterFilter } from "@/hooks/use-register-filter";
import { PokemonDetail } from "@/pages/PokemonCatalog/PokemonDetail";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";

type PokemonFilter = ListFilter<T.PokemonTemplateSummary>;

interface FilterProps {
  filters: PokemonFilter[];
  setFilters: React.Dispatch<React.SetStateAction<PokemonFilter[]>>;
  className?: string;
}

/** Searchable picker over the moves or abilities in the selected campaigns. */
const EntryPicker = ({
  collection,
  value,
  onChange,
  placeholder,
}: {
  collection: "moves" | "abilities";
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) => {
  const { state: campaignFilter } = useCampaignFilter();
  const { mutate, data: entries } = useNamesControllerFindByCampaigns();
  React.useEffect(() => {
    mutate({
      pathParams: { collection },
      body: {
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
    });
  }, [mutate, collection, campaignFilter.campaignIds, campaignFilter.includeCore]);
  const items = React.useMemo(
    () =>
      (entries ?? [])
        .map((entry) => {
          const label = entry.campaignName
            ? `${entry.name} (${entry.campaignName})`
            : entry.name;
          // The id keeps entries with the same name and campaign apart.
          return { label, value: entry.id, searchValue: `${label} ${entry.id}` };
        })
        .sort((first, second) => first.label.localeCompare(second.label)),
    [entries],
  );
  return (
    <Combobox
      items={items}
      value={value}
      onChange={onChange}
      className="text-xl"
      placeholder={placeholder}
    />
  );
};

const MoveFilter = ({ setFilters }: FilterProps) => {
  const { state: campaignFilter } = useCampaignFilter();
  const [moveId, setMoveId] = React.useState("");
  const { mutate, data: learnerIds, reset } =
    usePokemonTemplatesControllerFindLearners();
  React.useEffect(() => {
    reset();
    if (moveId !== "")
      mutate({
        pathParams: { moveId },
        body: {
          campaignIds: campaignFilter.campaignIds,
          includeCore: campaignFilter.includeCore,
        },
      });
  }, [mutate, reset, moveId, campaignFilter.campaignIds, campaignFilter.includeCore]);
  // Shows nothing until the learners arrive rather than every Pokémon.
  const filter = React.useMemo(() => {
    const learners = new Set(learnerIds);
    return (pokemon: T.PokemonTemplateSummary) =>
      moveId === "" || learners.has(pokemon.id);
  }, [moveId, learnerIds]);
  useRegisterFilter("move", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl" className="whitespace-nowrap">Learns:</Text>
      <EntryPicker
        collection="moves"
        value={moveId}
        onChange={setMoveId}
        placeholder="Select move..."
      />
    </div>
  );
};

const AbilityFilter = ({ setFilters }: FilterProps) => {
  const [abilityId, setAbilityId] = React.useState("");
  const filter = React.useCallback(
    (pokemon: T.PokemonTemplateSummary) =>
      abilityId === "" ||
      [
        pokemon.abilityOne,
        pokemon.abilityTwo,
        pokemon.hiddenAbility,
        pokemon.eventAbility,
      ].some((ability) => ability?.id === abilityId),
    [abilityId],
  );
  useRegisterFilter("ability", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl" className="whitespace-nowrap">Ability:</Text>
      <EntryPicker
        collection="abilities"
        value={abilityId}
        onChange={setAbilityId}
        placeholder="Select ability..."
      />
    </div>
  );
};

const statLabels: Record<T.Attribute, string> = {
  strength: "Str",
  dexterity: "Dex",
  vitality: "Vit",
  special: "Spe",
  insight: "Ins",
};

const BaseStatFilter = ({ setFilters }: FilterProps) => {
  const [minimums, setMinimums] = React.useState<Partial<T.AttributeStats>>({});
  const filter = React.useCallback(
    (pokemon: T.PokemonTemplateSummary) =>
      Object.entries(minimums).every(
        ([stat, minimum]) => pokemon.baseStats[stat as T.Attribute] >= minimum,
      ),
    [minimums],
  );
  useRegisterFilter("base-stats", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl" className="whitespace-nowrap">Min. base:</Text>
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(statLabels) as T.Attribute[]).map((stat) => (
          <label key={stat} className="flex flex-col gap-1 items-center">
            <Text size="text-base">{statLabels[stat]}</Text>
            <Input
              type="number"
              min={0}
              max={10}
              inputMode="numeric"
              aria-label={`Minimum base ${stat}`}
              className="w-full rounded-3xl px-2 text-center"
              value={minimums[stat] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setMinimums(({ [stat]: _, ...others }) =>
                  value === "" ? others : { ...others, [stat]: Number(value) },
                );
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

const useHabitatFilter = () => {
  const [selectedHabitats, setSelectedHabitats] = React.useState<Habitat[]>([]);
  const filter = React.useCallback(
    (pokemon: T.PokemonTemplateSummary) =>
      selectedHabitats.length === 0 ||
      selectedHabitats.some((habitat) => pokemon.habitats.includes(habitat)),
    [selectedHabitats],
  );
  return {
    filter,
    selectedHabitats,
    setSelectedHabitats,
  };
};
const HabitatFilter = ({ setFilters }: FilterProps) => {
  const { filter, selectedHabitats, setSelectedHabitats } = useHabitatFilter();
  useRegisterFilter("habitat", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Habitat:</Text>
      <MultiSelect
        options={Object.values(Habitat)
          .map((habitat) => ({
            label: habitat.replace(/_/g, " "),
            value: habitat,
          }))
          .sort((first, second) => first.label.localeCompare(second.label))}
        selected={selectedHabitats}
        onChange={setSelectedHabitats}
        className="text-xl"
        placeholder="Select habitats..."
      />
    </div>
  );
};

const useTypeFilter = () => {
  const [selectedTypes, setSelectedTypes] = React.useState<PokemonType[]>([]);
  const filter = React.useCallback(
    (pokemon: T.PokemonTemplateSummary) =>
      selectedTypes.length === 0 ||
      selectedTypes.some((type) =>
        pokemon.types.some((pokemonType) => pokemonType === type),
      ),
    [selectedTypes],
  );
  return {
    filter,
    selectedTypes,
    setSelectedTypes,
  };
};
const TypeFilter = ({ setFilters }: FilterProps) => {
  const { filter, selectedTypes, setSelectedTypes } = useTypeFilter();
  useRegisterFilter("type", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Type:</Text>
      <MultiSelect
        options={Object.values(PokemonType)
          .filter((type) => type !== PokemonType.TYPELESS)
          .map((type) => ({ label: type, value: type }))}
        selected={selectedTypes}
        onChange={setSelectedTypes}
        className="text-xl"
        placeholder="Select types..."
      />
    </div>
  );
};

const useRankFilter = () => {
  const [selectedRank, setSelectedRank] = React.useState<Rank | undefined>(
    undefined,
  );
  const [andLower, setAndLower] = React.useState<boolean | "indeterminate">(
    false,
  );
  const filter = React.useCallback(
    (pokemon: T.PokemonTemplateSummary) =>
      selectedRank == null
        ? true
        : andLower
          ? Object.values(Rank).indexOf(pokemon.recommendedRank) <=
            Object.values(Rank).indexOf(selectedRank)
          : Object.values(Rank).indexOf(pokemon.recommendedRank) ===
            Object.values(Rank).indexOf(selectedRank),
    [selectedRank, andLower],
  );
  return {
    filter,
    selectedRank,
    setSelectedRank,
    andLower,
    setAndLower,
  };
};
const RankFilter = ({ setFilters }: FilterProps) => {
  const { filter, selectedRank, setSelectedRank, andLower, setAndLower } =
    useRankFilter();
  useRegisterFilter("rank", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Rank:</Text>
      <RankSelect
        onSelect={setSelectedRank}
        rank={selectedRank}
        placeholder="Select rank..."
        comboBoxClassName="text-xl"
      />
      <Checkbox checked={andLower} onCheckedChange={setAndLower} />
      <Text size="text-md">And lower</Text>
    </div>
  );
};
const PokemonFilters = ({ filters, setFilters, className }: FilterProps) => (
  <div className={className}>
    <TypeFilter setFilters={setFilters} filters={filters} />
    <RankFilter setFilters={setFilters} filters={filters} />
    <HabitatFilter setFilters={setFilters} filters={filters} />
    <MoveFilter setFilters={setFilters} filters={filters} />
    <AbilityFilter setFilters={setFilters} filters={filters} />
    <BaseStatFilter setFilters={setFilters} filters={filters} />
  </div>
);

const PokemonTemplateList = ({
  onClick,
  className,
}: {
  onClick?: (id: string) => void;
  className?: string;
}) => {
  const { state: campaignFilter } = useCampaignFilter();
  const [pokemonTemplates, setPokemonTemplates] = React.useState<
    T.PokemonTemplateSummary[] | undefined
  >(undefined);
  const [isFetching, setIsFetching] = React.useState(false);
  const { mutate: fetchPokemonTemplates } =
    usePokemonTemplatesControllerFindByCampaignsMinimal({
      onSuccess: (templates) => {
        setPokemonTemplates(templates);
        setIsFetching(false);
      },
      onError: () => setIsFetching(false),
    });
  const showSpinner = isFetching && pokemonTemplates == null;
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<PokemonFilter[]>([]);
  const debouncedSearch = useDebounce(search, 200);
  const filteredPokemonTemplates = React.useMemo(
    () =>
      pokemonTemplates
        ?.sort((first, second) =>
          (first.dexID ?? "").localeCompare(second.dexID ?? ""),
        )
        .filter((template) =>
          (template.name ?? "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()),
        )
        .filter((template) =>
          filters.every((filter) => filter.filter(template)),
        ),
    [pokemonTemplates, debouncedSearch, filters],
  );
  React.useEffect(() => {
    setIsFetching(true);
    fetchPokemonTemplates({
      body: {
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
    });
  }, [
    campaignFilter.campaignIds,
    campaignFilter.includeCore,
    fetchPokemonTemplates,
  ]);

  const [visibleCount, setVisibleCount] = React.useState(60);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setVisibleCount(60);
  }, [debouncedSearch, filters, pokemonTemplates]);
  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport === null || sentinelRef.current === null) return;
    const showMore = () =>
      setVisibleCount((count) =>
        Math.min(filteredPokemonTemplates?.length ?? 0, count + 60),
      );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) showMore();
      },
      { root: viewport, rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    const timeout = setTimeout(() => {
      if (viewport == null) return;
      for (
        let attempts = 0;
        viewport.scrollHeight <= viewport.clientHeight &&
        (filteredPokemonTemplates?.length ?? 0) > visibleCount &&
        attempts < 20;
        attempts++
      ) {
        showMore();
      }
    }, 50);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [filteredPokemonTemplates]);

  const pokemonCards = React.useMemo(
    () =>
      filteredPokemonTemplates?.slice(0, visibleCount).map((template) => (
        <Link
          key={template.id}
          to={`/pokemon/${template.id}`}
          className="flex flex-col"
        >
          <PokemonTemplateCard
            name={template.name}
            image={template.image}
            number={template.number}
            types={template.types}
            onClick={() => onClick?.(template.id)}
            className="flex-grow"
            numberClassName="md:hidden lg:block max-xs:hidden"
          />
        </Link>
      )),
    [filteredPokemonTemplates, visibleCount],
  );
  return (
    <div
      className={`flex flex-col gap-2 h-full overflow-hidden ${className}`}
    >
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          id="pokemon-search-input"
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button id="pokemon-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <div className="shrink-0">
        <FilterSection label="Filters">
          <PokemonFilters
            filters={filters}
            setFilters={setFilters}
            className="flex md:flex-row flex-col gap-2 mt-2 flex-wrap"
          />
        </FilterSection>
      </div>
      <ScrollArea
        ref={scrollAreaRef}
        className="md:rounded-t-3xl rounded-3xl flex-1"
      >
        <div className="pokemon-card-grid grid gap-2">
          {showSpinner && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {pokemonCards}
          <div
            ref={sentinelRef}
            className="h-1 w-full col-span-full"
          />
        </div>
      </ScrollArea>
    </div>
  );
};
export const PokemonCatalogPage = () => {
  const { id } = useParams();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(id);
  const detailRef = useScrollToDetail(selectedTemplateId);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    setSelectedTemplateId(id);
  }, [id]);
  const DetailContainer = isDesktop ? ScrollArea : "div";
  return (
    <div className="catalog-layout p-2 pb-0 grid md:h-[calc(100vh-1rem)] md:grid-rows-1 grid-cols-5 box-border gap-3">
      <PokemonTemplateList
        className="md:col-span-2 col-span-full max-md:min-h-[30vh] max-md:max-h-[50vh]"
        onClick={setSelectedTemplateId}
      />
      <DetailContainer ref={detailRef} className="md:col-span-3 col-span-full max-md:pb-2 h-full">
        <PokemonDetail pokemonTemplateId={selectedTemplateId} />
      </DetailContainer>
    </div>
  );
};
