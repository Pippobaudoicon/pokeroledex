import { useDebounce, useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Link, useParams } from "react-router-dom";
import { usePokemonTemplatesControllerFindByCampaignsMinimal } from "@/api/components";
import { Habitat, PokemonType, Rank } from "@/api/schemas";
import { FilterSection } from "@/components/FilterSection";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { PokemonTemplateCard } from "@/components/PokemonTemplateCard";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { PokemonDetail } from "@/pages/PokemonCatalog/PokemonDetail";

interface PokemonFilter {
  id: string;
  filter: (pokemon: T.PokemonTemplateSummary) => boolean;
}

interface FilterProps {
  filters: PokemonFilter[];
  setFilters: (filters: PokemonFilter[]) => void;
  className?: string;
}

const useHabitatFilter = () => {
  const [selectedHabitats, setSelectedHabitats] = React.useState<Habitat[]>([]);
  return {
    filter: (pokemon: T.PokemonTemplateSummary) =>
      selectedHabitats.length === 0 ||
      selectedHabitats.some((habitat) => pokemon.habitats.includes(habitat)),
    selectedHabitats,
    setSelectedHabitats,
  };
};
const HabitatFilter = ({ filters, setFilters }: FilterProps) => {
  const { filter, selectedHabitats, setSelectedHabitats } = useHabitatFilter();
  React.useEffect(() => {
    const otherFilters = filters.filter((other) => other.id !== "habitat");
    otherFilters.push({ filter, id: "habitat" });
    setFilters(otherFilters);
  }, [filter]);
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
  return {
    filter: (pokemon: T.PokemonTemplateSummary) =>
      selectedTypes.length === 0 ||
      selectedTypes.some((type) =>
        pokemon.types.some((pokemonType) => pokemonType === type),
      ),
    selectedTypes,
    setSelectedTypes,
  };
};
const TypeFilter = ({ filters, setFilters }: FilterProps) => {
  const { filter, selectedTypes, setSelectedTypes } = useTypeFilter();
  React.useEffect(() => {
    const otherFilters = filters.filter((other) => other.id !== "type");
    otherFilters.push({ filter, id: "type" });
    setFilters(otherFilters);
  }, [filter]);
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
  return {
    filter: (pokemon: T.PokemonTemplateSummary) =>
      selectedRank == null
        ? true
        : andLower
          ? Object.values(Rank).indexOf(pokemon.recommendedRank) <=
            Object.values(Rank).indexOf(selectedRank)
          : Object.values(Rank).indexOf(pokemon.recommendedRank) ===
            Object.values(Rank).indexOf(selectedRank),
    selectedRank,
    setSelectedRank,
    andLower,
    setAndLower,
  };
};
const RankFilter = ({ filters, setFilters }: FilterProps) => {
  const { filter, selectedRank, setSelectedRank, andLower, setAndLower } =
    useRankFilter();
  React.useEffect(() => {
    const otherFilters = filters.filter((other) => other.id !== "rank");
    otherFilters.push({ filter, id: "rank" });
    setFilters(otherFilters);
  }, [filter]);
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
      className={`flex flex-col gap-2 filters-full overflow-hidden ${className}`}
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
        className="md:rounded-className-3xl rounded-3xl flex-1"
      >
        <div className="pokemon-card-grid grid gap-2">
          {showSpinner && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center filters-full event-full">
              <LoadingSpinner />
            </div>
          )}
          {pokemonCards}
          <div
            ref={sentinelRef}
            className="filters-1 event-full col-span-full"
          />
        </div>
      </ScrollArea>
    </div>
  );
};
export const PokemonCatalogPage = () => {
  const { id } = useParams();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(id);
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
      <DetailContainer className="md:col-span-3 col-span-full max-md:pb-2 h-full">
        <PokemonDetail pokemonTemplateId={selectedTemplateId} />
      </DetailContainer>
    </div>
  );
};
