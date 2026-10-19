import { Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import { MoveCategory } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Chip } from "@/components/kit/Controls";
import { Group } from "@/components/kit/List";
import { CategoryIcon, MoveRow, categoryName } from "@/components/kit/MoveRow";
import { PageHeader } from "@/components/kit/PageHeader";
import { TypeIcon, TypePill, typeColor } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { fold, useMoveIndex } from "@/hooks/use-dex";
import { cn, formatEnumName } from "@/lib/utils";

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
    (move.addedEffects?.Ailments ?? []).some((ailment) => ailment.Affects === "Targets" && statusAilments.test(ailment.Type)) ||
    inflictsStatus.test(move.effect),
  Healing: (move: T.Move) => move.addedEffects?.Heal != null || restoresHp.test(move.effect),
  "Area / multiple targets": (move: T.Move) => areaTargets.includes(move.target) || /\barea move\b|\ball foes\b/i.test(move.effect),
};
type MoveEffect = keyof typeof moveEffects;

const PAGE_SIZE = 60;

export const MovesPage = () => {
  const { data: moves, isError, refetch } = useMoveIndex();
  const [params] = useSearchParams();
  const [query, setQuery] = React.useState(params.get("search") ?? "");
  React.useEffect(() => setQuery(params.get("search") ?? ""), [params]);
  const deferredQuery = React.useDeferredValue(query);
  const [types, setTypes] = React.useState<T.MoveType[]>([]);
  const [categories, setCategories] = React.useState<T.MoveCategory[]>([]);
  const [effects, setEffects] = React.useState<MoveEffect[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const sentinel = React.useRef<HTMLButtonElement>(null);
  const availableTypes = React.useMemo(() => [...new Set(moves?.map((move) => move.type))].sort(), [moves]);
  const list = React.useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return moves
      ?.filter(
        (move) =>
          (!needle || [move.name, move.effect, move.description].some((text) => fold(text ?? "").includes(needle))) &&
          (!types.length || types.includes(move.type)) &&
          (!categories.length || categories.includes(move.category)) &&
          (!effects.length || effects.some((effect) => moveEffects[effect](move))),
      )
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  }, [moves, deferredQuery, types, categories, effects]);
  React.useEffect(() => setVisibleCount(PAGE_SIZE), [list]);
  React.useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [list, visibleCount]);
  const groups = new Map<T.MoveType, T.Move[]>();
  for (const move of list?.slice(0, visibleCount) ?? []) {
    const group = groups.get(move.type);
    if (group) group.push(move);
    else groups.set(move.type, [move]);
  }
  const filterCount = categories.length + effects.length;
  const clearFilters = () => {
    setTypes([]);
    setCategories([]);
    setEffects([]);
  };
  return (
    <div className="mx-auto max-w-6xl pb-8">
      <PageHeader title="Moves">
        <p className="text-subhead text-label-2">Accuracy, damage and effects at a glance. Open a move for its full details.</p>
        <div className="mt-3 flex gap-2">
          <label className="relative flex min-w-0 flex-1 items-center lg:max-w-md">
            <span className="sr-only">Search moves</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Names and effects"
              className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            className={button({ variant: filterCount ? "tinted" : "gray" })}
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters
            {filterCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-tint text-caption text-on-tint">{filterCount}</span>
            )}
          </button>
        </div>
      </PageHeader>
      <div role="group" aria-label="Filter by type" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 lg:px-8">
        {availableTypes.map((type) => (
          <Chip
            key={type}
            pressed={types.includes(type)}
            onClick={() => setTypes(types.includes(type) ? types.filter((entry) => entry !== type) : [...types, type])}
          >
              <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ backgroundColor: typeColor(type) }}>
                <TypeIcon type={type} className="size-3" />
              </span>
            {formatEnumName(type)}
          </Chip>
        ))}
      </div>
      <div className="px-4 lg:px-8">
        <div className="mb-3 flex min-h-8 flex-wrap items-center gap-1.5 px-1" aria-live="polite">
          <p className="mr-1 text-footnote font-medium text-label-2">{list ? `${list.length} moves` : "Loading…"}</p>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategories(categories.filter((entry) => entry !== category))}
              aria-label={`Remove filter: ${categoryName(category)}`}
              className="inline-flex items-center gap-1 rounded-full bg-tint/10 px-2.5 py-1 text-footnote text-tint"
            >
              {categoryName(category)}
              <X aria-hidden className="size-3" />
            </button>
          ))}
          {effects.map((effect) => (
            <button
              key={effect}
              type="button"
              onClick={() => setEffects(effects.filter((entry) => entry !== effect))}
              aria-label={`Remove filter: ${effect}`}
              className="inline-flex items-center gap-1 rounded-full bg-tint/10 px-2.5 py-1 text-footnote text-tint"
            >
              {effect}
              <X aria-hidden className="size-3" />
            </button>
          ))}
          {(types.length > 0 || filterCount > 0) && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full px-2 py-1 text-footnote font-semibold text-tint hover:bg-tint/10"
            >
              Clear filters
            </button>
          )}
        </div>
        {isError ? (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
            <p className="mb-3 text-body">Moves couldn’t be loaded.</p>
            <button type="button" className={button({ variant: "tinted" })} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : !list ? (
          <div aria-hidden className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton h-48 rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
            <p className="text-body">No moves match your search and filters.</p>
            <button
              type="button"
              className={cn(button({ variant: "tinted" }), "mt-3")}
              onClick={() => {
                setQuery("");
                clearFilters();
              }}
            >
              Reset search
            </button>
          </div>
        ) : (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {[...groups].map(([type, entries]) => (
              <Group key={type} title={<TypePill type={type} size="sm" />}>
                <ul>
                  {entries.map((move) => (
                    <MoveRow key={move.id} move={move} />
                  ))}
                </ul>
              </Group>
            ))}
          </div>
        )}
        {list && visibleCount < list.length && (
          <button
            ref={sentinel}
            type="button"
            className={cn(button({ variant: "gray" }), "mx-auto mt-6 flex")}
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more moves
          </button>
        )}
      </div>
      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter moves"
        initialExpanded
        toolbar={
          <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={clearFilters}>
            Reset
          </button>
        }
      >
        <div className="flex flex-col gap-6 p-4">
          <Group title="Category" footer="Matches any of the selected categories.">
            <div className="flex flex-wrap gap-2 p-3">
              {Object.values(MoveCategory).map((category) => (
                <Chip
                  key={category}
                  pressed={categories.includes(category)}
                  onClick={() =>
                    setCategories(
                      categories.includes(category) ? categories.filter((entry) => entry !== category) : [...categories, category],
                    )
                  }
                >
                  <CategoryIcon category={category} />
                  {categoryName(category)}
                </Chip>
              ))}
            </div>
          </Group>
          <Group title="Effects" footer="Matches any of the selected effects.">
            <div className="flex flex-wrap gap-2 p-3">
              {(Object.keys(moveEffects) as MoveEffect[]).map((effect) => (
                <Chip
                  key={effect}
                  pressed={effects.includes(effect)}
                  onClick={() => setEffects(effects.includes(effect) ? effects.filter((entry) => entry !== effect) : [...effects, effect])}
                >
                  {effect}
                </Chip>
              ))}
            </div>
          </Group>
          <button type="button" className={button({ variant: "filled" })} onClick={() => setFiltersOpen(false)}>
            Show {list?.length ?? 0} moves
          </button>
        </div>
      </Sheet>
    </div>
  );
};
