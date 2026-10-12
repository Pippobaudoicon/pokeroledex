import { useDebounce } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { useMovesControllerFindByCampaigns } from "@/api/components";
import { MoveCategory, PokemonType } from "@/api/schemas";
import { FilterSection } from "@/components/FilterSection";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCard } from "@/components/MoveCard";
import { MultiSelect } from "@/components/MultiSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { type ListFilter, useRegisterFilter } from "@/hooks/use-register-filter";

type MoveFilter = ListFilter<T.Move>;

interface FilterProps {
  filters: MoveFilter[];
  setFilters: React.Dispatch<React.SetStateAction<MoveFilter[]>>;
}

const useCategoryFilter = () => {
  const [selectedCategories, setSelectedCategories] = React.useState<
    MoveCategory[]
  >([]);
  const filter = React.useCallback(
    (move: T.Move) =>
      selectedCategories.length === 0 ||
      selectedCategories.some((category) => move.category === category),
    [selectedCategories],
  );
  return {
    filter,
    selectedCategories,
    setSelectedCategories,
  };
};

const CategoryFilter = ({ setFilters }: FilterProps) => {
  const { filter, selectedCategories, setSelectedCategories } =
    useCategoryFilter();
  useRegisterFilter("category", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Category:</Text>
      <MultiSelect
        options={Object.values(MoveCategory).map((category) => ({
          label: category,
          value: category,
        }))}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        className="text-xl"
        placeholder="Select categories..."
      />
    </div>
  );
};

const useTypeFilter = () => {
  const [selectedTypes, setSelectedTypes] = React.useState<PokemonType[]>([]);
  const filter = React.useCallback(
    (move: T.Move) =>
      selectedTypes.length === 0 || selectedTypes.some((type) => move.type === type),
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
        options={Object.values(PokemonType).map((type) => ({
          label: type,
          value: type,
        }))}
        selected={selectedTypes}
        onChange={setSelectedTypes}
        className="text-xl"
        placeholder="Select types..."
      />
    </div>
  );
};

// Structured added effects cover most core moves; the effect text covers the rest and custom moves.
const statusAilments = /^(Paralyze|Poison|BadlyPoison|Burn\d?|Freeze|Sleep|Drowzy|Confuse|Flinch|Infatuat|Disable)/;
const inflictsStatus =
  /\b(paralyze|poison|badly poison|burn|freeze|confuse|infatuate|flinch|disable)s? (the|all|each|every|a|any|one|foes?|targets?|that|those|both)\b|\bputs? (the|all|each) (?!user)[\w ]{0,20}to sleep|\b(1st|2nd|3rd)[ -]degree burn/i;
const restoresHp =
  /\b(basic|complete) heal\b|(?<!(can't|cannot) )\b(heals?|restores?|restoring) (\d+ )?HP\b|\brestores? [\w ]{0,20}\d+ HP\b/i;
const areaTargets: T.MoveTarget[] = [
  "ALL_FOES",
  "AREA",
  "BATTLEFIELD",
  "ALLYS_BATTLEFIELD",
  "FOES_BATTLEFIELD",
  "ALL_ALLIES",
  "USER_AND_ALLIES",
];
const moveEffects = {
  "Status conditions": (move: T.Move) =>
    (move.addedEffects?.Ailments ?? []).some(
      (ailment) => ailment.Affects === "Targets" && statusAilments.test(ailment.Type),
    ) || inflictsStatus.test(move.effect),
  Healing: (move: T.Move) => move.addedEffects?.Heal != null || restoresHp.test(move.effect),
  "Area / multiple targets": (move: T.Move) =>
    areaTargets.includes(move.target) || /\barea move\b|\ball foes\b/i.test(move.effect),
};
type MoveEffect = keyof typeof moveEffects;

const EffectFilter = ({ setFilters }: FilterProps) => {
  const [selectedEffects, setSelectedEffects] = React.useState<MoveEffect[]>([]);
  const filter = React.useCallback(
    (move: T.Move) =>
      selectedEffects.length === 0 ||
      selectedEffects.some((effect) => moveEffects[effect](move)),
    [selectedEffects],
  );
  useRegisterFilter("effect", filter, setFilters);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Effect:</Text>
      <MultiSelect
        options={(Object.keys(moveEffects) as MoveEffect[]).map((effect) => ({
          label: effect,
          value: effect,
        }))}
        selected={selectedEffects}
        onChange={setSelectedEffects}
        className="text-xl"
        placeholder="Select effects..."
      />
    </div>
  );
};

const MoveFilters = ({
  filters,
  setFilters,
  className,
}: FilterProps & { className?: string }) => (
  <div className={className}>
    <TypeFilter setFilters={setFilters} filters={filters} />
    <CategoryFilter setFilters={setFilters} filters={filters} />
    <EffectFilter setFilters={setFilters} filters={filters} />
  </div>
);

const PAGE_SIZE = 30;

const MoveList = ({ className }: { className?: string }) => {
  const { state: campaignFilter } = useCampaignFilter();
  const [moves, setMoves] = React.useState<T.Move[] | undefined>(undefined);
  const [isFetching, setIsFetching] = React.useState(false);
  const { mutate: fetchMoves } = useMovesControllerFindByCampaigns({
    onSuccess: (data) => {
      setMoves(data);
      setIsFetching(false);
    },
    onError: () => setIsFetching(false),
  });
  const showSpinner = isFetching && !moves;
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<MoveFilter[]>([]);
  const debouncedSearch = useDebounce(search, 200);
  const filteredMoves = React.useMemo(
    () =>
      moves
        ?.filter((move) =>
          [move.name, move.effect, move.description].some((text) =>
            (text ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()),
          ),
        )
        .filter((move) => filters.every((filter) => filter.filter(move)))
        .sort((first, second) => {
          const byType = (first.type ?? "").localeCompare(second.type ?? "");
          return byType !== 0
            ? byType
            : (first.name ?? "").localeCompare(second.name ?? "");
        }),
    [moves, debouncedSearch, filters],
  );
  React.useEffect(() => {
    setIsFetching(true);
    fetchMoves({
      body: {
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
    });
  }, [campaignFilter.campaignIds, campaignFilter.includeCore, fetchMoves]);

  // Infinite scroll: render PAGE_SIZE more cards whenever the sentinel nears the viewport.
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, filters, moves]);
  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport === null || sentinelRef.current === null) return;
    const showMore = () =>
      setVisibleCount((count) =>
        Math.min(filteredMoves?.length ?? 0, count + PAGE_SIZE),
      );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) showMore();
      },
      { root: viewport, rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    // Fill a viewport that is not yet scrollable.
    const timeout = setTimeout(() => {
      if (viewport == null) return;
      for (
        let attempts = 0;
        viewport.scrollHeight <= viewport.clientHeight &&
        (filteredMoves?.length ?? 0) > visibleCount &&
        attempts < 20;
        attempts++
      )
        showMore();
    }, 50);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [filteredMoves]);
  const moveCards = React.useMemo(
    () =>
      filteredMoves
        ?.slice(0, visibleCount)
        .map((move) => <MoveCard key={move.id} move={move} />),
    [filteredMoves, visibleCount],
  );
  return (
    <div className={`flex flex-col h-full ${className} gap-2`}>
      <div className="flex flex-row space-x-2">
        <Input
          id="moves-search-input"
          className="rounded-3xl"
          placeholder="Search names and effects..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button id="moves-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <FilterSection label="Filters">
        <MoveFilters
          filters={filters}
          setFilters={setFilters}
          className="flex md:flex-row flex-col gap-2 mt-2"
        />
      </FilterSection>
      <ScrollArea ref={scrollAreaRef} className="rounded-t-3xl flex-1">
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
          {showSpinner && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {moveCards}
          <div ref={sentinelRef} className="h-1 w-full col-span-full" />
        </div>
      </ScrollArea>
    </div>
  );
};

export const MovesPage = () => (
  <div className="moves-layout p-2 pb-0 md:h-[calc(100vh-1rem)] max-md:pb-2">
    <MoveList className="overflow-hidden" />
  </div>
);
