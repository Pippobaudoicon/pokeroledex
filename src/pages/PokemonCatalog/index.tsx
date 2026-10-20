import { useMediaQuery } from "@uidotdev/usehooks";
import { ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PokemonType } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Chip } from "@/components/kit/Controls";
import { PageHeader } from "@/components/kit/PageHeader";
import { TypeDot, TypeIcon, TypePill, typeText } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { fold, useDex, useMoveIndex } from "@/hooks/use-dex";
import { cn, formatEnumName } from "@/lib/utils";
import { FilterForm, activeFilterChips, noFilters, useDexPredicate, type DexFilters } from "@/pages/PokemonCatalog/filters";
import { PokemonDetail } from "@/pages/PokemonCatalog/PokemonDetail";

const types = Object.values(PokemonType).filter((type): type is T.PokemonType => type !== "TYPELESS" && type !== "VARIES");

const number = (pokemon: T.PokemonTemplateSummary) => `#${pokemon.dexID || String(pokemon.number).padStart(4, "0")}`;

/** Phone list row: pixel sprite, name, number, types. */
const DexRow = ({ pokemon, selected }: { pokemon: T.PokemonTemplateSummary; selected: boolean }) => (
  <li className="group/row [contain-intrinsic-size:auto_60px] [content-visibility:auto]">
    <Link
      to={`/pokemon/${pokemon.id}`}
      aria-current={selected ? "true" : undefined}
      className="flex items-center gap-3 pl-2 transition-colors duration-150 hover:bg-raised active:bg-fill aria-[current]:bg-tint/8"
    >
      <Sprite image={pokemon.image} set="box" className="h-14 w-17" />
      <span className="flex min-h-15 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-2 pr-4 group-last/row:border-b-0">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium">{pokemon.name}</span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="min-w-13 shrink-0 text-footnote text-label-2 tabular-nums">{number(pokemon)}</span>
            {pokemon.types.map((type) => (
              <TypePill key={type} type={type} size="sm" />
            ))}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />
      </span>
    </Link>
  </li>
);

/** Desktop grid tile with the book artwork. */
const DexTile = ({ pokemon, selected, replace }: { pokemon: T.PokemonTemplateSummary; selected: boolean; replace: boolean }) => (
  <li className="[contain-intrinsic-size:auto_150px] [content-visibility:auto]">
    <Link
      to={`/pokemon/${pokemon.id}`}
      replace={replace}
      aria-current={selected ? "true" : undefined}
      className="group flex h-full flex-col items-center rounded-xl bg-surface p-2 pb-2.5 text-center shadow-card transition-[box-shadow,transform] duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-float aria-[current]:ring-2 aria-[current]:ring-tint"
    >
      <span className="flex w-full items-center justify-between text-caption text-label-2 tabular-nums">
        {number(pokemon)}
        <span className="flex gap-0.5">
          {pokemon.types.map((type) => (
            <TypeDot key={type} type={type} className="size-4.5 [&_img]:size-2.5" />
          ))}
        </span>
      </span>
      <Sprite image={pokemon.image} set="book" className="my-1 size-20 transition-transform duration-300 ease-spring group-hover:scale-105" />
      <span className="line-clamp-2 text-subhead font-semibold leading-tight">{pokemon.name}</span>
    </Link>
  </li>
);

const SkeletonList = ({ desktop }: { desktop: boolean }) =>
  desktop ? (
    <ul aria-hidden className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-3">
      {Array.from({ length: 18 }, (_, index) => (
        <li key={index} className="skeleton h-36 rounded-xl" />
      ))}
    </ul>
  ) : (
    <div aria-hidden className="overflow-hidden rounded-xl bg-surface shadow-card">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="flex h-15 items-center gap-3 border-b border-hairline px-3 last:border-b-0">
          <div className="skeleton size-11 rounded-lg" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
      ))}
    </div>
  );

const useFiltered = (dex: T.PokemonTemplateSummary[] | undefined, query: string, filters: DexFilters) => {
  const predicate = useDexPredicate(filters);
  const deferredQuery = React.useDeferredValue(query);
  return React.useMemo(() => {
    if (!dex || !predicate) return undefined;
    const needle = fold(deferredQuery.trim()).replace(/^#/, "");
    return dex.filter(
      (pokemon) => (!needle || fold(pokemon.name).includes(needle) || pokemon.dexID?.startsWith(needle) || String(pokemon.number) === needle) && predicate(pokemon),
    );
  }, [dex, deferredQuery, predicate]);
};

export const PokedexPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { data: dex, isError, refetch } = useDex();
  const { data: moves } = useMoveIndex();
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState(noFilters);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const list = useFiltered(dex, query, filters);
  // Whether the list was on screen before this Pokémon opened: then closing goes back to it.
  const [listSeen, setListSeen] = React.useState(id === undefined);
  React.useEffect(() => {
    if (id === undefined) setListSeen(true);
  }, [id]);

  const close = () => (listSeen ? navigate(-1) : navigate("/pokemon", { replace: true }));
  const chips = activeFilterChips(filters, {
    move: moves?.find((move) => move.id === filters.moveId)?.name,
    ability: dex
      ?.flatMap((pokemon) => [pokemon.abilityOne, pokemon.abilityTwo, pokemon.hiddenAbility, pokemon.eventAbility])
      .find((ability) => ability?.id === filters.abilityId)?.name,
  });
  const moreFilters = chips.length - filters.types.length;

  // On a phone, a shared link opens the Pokémon as its own page; from the list it slides up as a sheet.
  if (id && !desktop && !listSeen) return <PokemonDetail id={id} layout="page" />;

  return (
    <div className="lg:flex">
      <div className="min-w-0 flex-1 pb-8">
        <PageHeader title="Pokédex">
          <div className="mt-3 flex gap-2">
            <label className="relative flex min-w-0 flex-1 items-center lg:max-w-md">
              <span className="sr-only">Search the Pokédex</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or number"
                className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className={cn(button({ variant: moreFilters ? "tinted" : "gray" }), "max-lg:px-3")}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Filters
              {moreFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-tint text-caption text-on-tint">{moreFilters}</span>}
            </button>
          </div>
        </PageHeader>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 lg:px-8" role="group" aria-label="Filter by type">
          {types.map((type) => {
            const pressed = filters.types.includes(type);
            return (
              <Chip
                key={type}
                pressed={pressed}
                className={cn("pl-1.5", pressed && typeText(type))}
                style={pressed ? { backgroundColor: `var(--color-type-${type.toLowerCase()})` } : undefined}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    types: pressed ? current.types.filter((entry) => entry !== type) : [...current.types, type].slice(-2),
                  }))
                }
              >
                <span className={cn("grid size-5 place-items-center rounded-full lg:size-4", pressed && "ring-1 ring-black/15")} style={{ backgroundColor: `var(--color-type-${type.toLowerCase()})` }}>
                  <TypeIcon type={type} className="size-3 lg:size-2.5" />
                </span>
                {formatEnumName(type)}
              </Chip>
            );
          })}
        </div>
        <div className="px-4 lg:px-8">
          <div className="mb-2 flex min-h-8 flex-wrap items-center gap-1.5 px-1" aria-live="polite">
            <p className="mr-1 text-footnote font-medium text-label-2">
              {list ? `${list.length} Pokémon` : "Loading…"}
              {filters.types.length === 2 && " · both types"}
            </p>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilters(chip.clear)}
                aria-label={`Remove filter: ${chip.label}`}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-tint/10 pr-1.5 pl-2.5 text-footnote font-medium text-tint hover:bg-tint/15 lg:h-6"
              >
                {chip.label}
                <X aria-hidden className="size-3.5" />
              </button>
            ))}
            {chips.length > 0 && (
              <button type="button" onClick={() => setFilters(noFilters)} className="h-7 rounded-full px-2 text-footnote font-semibold text-tint hover:bg-tint/10">
                Clear all
              </button>
            )}
          </div>
          {isError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-surface p-8 text-center shadow-card">
              <p className="text-body">The Pokédex didn’t load.</p>
              <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
                Try again
              </button>
            </div>
          ) : !list ? (
            <SkeletonList desktop={desktop} />
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-6 py-10 text-center shadow-card">
              <Pokeball className="size-12 text-label-3" />
              <p className="text-headline">No Pokémon match</p>
              <p className="max-w-xs text-subhead text-label-2">{query ? `Nothing named “${query}” with these filters.` : "Try removing a filter."}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilters(noFilters);
                }}
                className={button({ variant: "tinted" })}
              >
                Clear search and filters
              </button>
            </div>
          ) : desktop ? (
            <ul className={cn("grid gap-3", "grid-cols-[repeat(auto-fill,minmax(118px,1fr))]")}>
              {list.map((pokemon) => (
                <DexTile key={pokemon.id} pokemon={pokemon} selected={pokemon.id === id} replace={id !== undefined} />
              ))}
            </ul>
          ) : (
            <ul className="overflow-hidden rounded-xl bg-surface shadow-card">
              {list.map((pokemon) => (
                <DexRow key={pokemon.id} pokemon={pokemon} selected={pokemon.id === id} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {desktop && id && (
        <aside
          aria-label="Pokémon details"
          className="sticky top-0 h-dvh w-[min(40vw,540px)] shrink-0 overflow-y-auto border-l border-hairline bg-surface animate-in fade-in-0 slide-in-from-right-4 [--tw-duration:200ms]"
        >
          <PokemonDetail key={id} id={id} layout="inspector" onClose={close} />
        </aside>
      )}
      {!desktop && (
        <Sheet open={id !== undefined} onOpenChange={(open) => !open && close()} title={dex?.find((pokemon) => pokemon.id === id)?.name ?? "Pokémon"} hideTitle>
          {id && <PokemonDetail key={id} id={id} layout="sheet" />}
        </Sheet>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" initialExpanded toolbar={
        chips.length > 0 ? (
          <button type="button" onClick={() => setFilters(noFilters)} className={button({ variant: "plain", size: "sm" })}>
            Reset
          </button>
        ) : undefined
      }>
        <FilterForm filters={filters} setFilters={setFilters} dex={dex} />
        <div className="sticky bottom-0 bg-canvas/90 px-4 pt-2 pb-2 backdrop-blur-xl">
          <button type="button" onClick={() => setFiltersOpen(false)} className={cn(button({ variant: "filled", size: "lg" }), "w-full")}>
            {list ? `Show ${list.length} Pokémon` : "Show results"}
          </button>
        </div>
      </Sheet>
    </div>
  );
};
