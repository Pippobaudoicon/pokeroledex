import { useMediaQuery } from "@uidotdev/usehooks";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Link, useParams } from "react-router-dom";
import { usePokemonControllerFindAllMinimal } from "@/api/components";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBall, TypePill } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Sprite } from "@/components/kit/Sprite";
import { PokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { fold } from "@/hooks/use-dex";
import { cn, formatEnumName } from "@/lib/utils";

const PokemonRow = ({ pokemon, selected }: { pokemon: T.PokemonMinimal; selected: boolean }) => (
  <li className="group/row">
    <Link
      to={`/myPokemon/${pokemon.id}`}
      replace={selected}
      aria-current={selected ? "page" : undefined}
      className="flex items-center gap-3 pl-2 transition-colors duration-150 hover:bg-raised active:bg-fill aria-[current]:bg-tint/10"
    >
      <Sprite image={pokemon.image} set="box" className="h-14 w-17 overflow-hidden [&_img]:scale-150" />
      <span className="flex min-h-15 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-2 pr-4 group-last/row:border-b-0 lg:pr-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium">{pokemon.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-footnote text-label-2">
            <RankBall rank={pokemon.rank} className="size-3.5" />
            {formatEnumName(pokemon.rank)}
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

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
    <Pokeball className="size-14 text-tint" strokeWidth={5} />
    <h2 className="text-title-3 font-semibold">No Pokémon yet</h2>
    <p className="max-w-sm text-subhead text-label-2">
      Every Pokémon you add gets a sheet with HP, Will, stats and moves with their dice pools. Find one in the Pokédex, or bring your collection over from pokeroledex.nl.
    </p>
    <div className="mt-2 flex flex-wrap justify-center gap-2">
      <Link to="/pokemon" className={button({ variant: "filled" })}>
        <Plus aria-hidden className="size-4" strokeWidth={2.5} />
        Browse the Pokédex
      </Link>
      <Link to="/import" className={button({ variant: "gray" })}>
        <Download aria-hidden className="size-4" />
        Import
      </Link>
    </div>
  </div>
);

const PokemonList = ({ selectedId, compact }: { selectedId?: string; compact: boolean }) => {
  const { data, isFetching, isError, refetch } = usePokemonControllerFindAllMinimal({});
  const [query, setQuery] = React.useState("");
  const list = React.useMemo(
    () =>
      data
        ?.filter((pokemon) => fold(pokemon.name ?? "").includes(fold(query.trim())))
        .sort((first, second) => (first.name ?? "").localeCompare(second.name ?? "")),
    [data, query],
  );
  return (
    <>
      <PageHeader
        title="My Pokémon"
        compact={compact}
        actions={
          <Link to="/pokemon" className={button({ variant: "plain", size: compact ? "sm" : "md" })} aria-label="Add a Pokémon from the Pokédex">
            <Plus aria-hidden className="size-5 lg:size-4" strokeWidth={2.5} />
            Add
          </Link>
        }
      >
        {!!data?.length && (
          <label className="relative mt-3 flex items-center lg:max-w-md">
            <span className="sr-only">Search your Pokémon</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
            />
          </label>
        )}
      </PageHeader>
      <div className={cn("px-4 pb-8", compact ? "pt-2 lg:px-3" : "lg:px-8")}>
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
            <p className="text-body">Your Pokémon didn’t load.</p>
            <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
              Try again
            </button>
          </div>
        ) : !list && isFetching ? (
          <div aria-hidden className="overflow-hidden rounded-xl bg-surface shadow-card">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex h-15 items-center gap-3 border-b border-hairline px-3 last:border-b-0">
                <div className="skeleton size-11 rounded-lg" />
                <div className="skeleton h-4 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState />
        ) : list?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
            <p className="text-body">No Pokémon named “{query}”.</p>
            <button type="button" onClick={() => setQuery("")} className={button({ variant: "tinted" })}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-footnote font-medium text-label-2" aria-live="polite">
              {list?.length} {list?.length === 1 ? "Pokémon" : "Pokémon"}
            </p>
            <ul className={cn("overflow-hidden rounded-xl bg-surface shadow-card", !compact && "lg:grid lg:grid-cols-2 lg:gap-x-0 2xl:grid-cols-3")}>
              {list?.map((pokemon) => (
                <PokemonRow key={pokemon.id} pokemon={pokemon} selected={pokemon.id === selectedId} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
};

/** The collection, and one Pokémon's sheet: beside the list on desktop, a pushed page on phones. */
export const MyPokemonPage = () => {
  const { id } = useParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!id) return <PokemonList compact={false} />;
  const sheet = (
    <PokemonProvider key={id} id={id} editingMode="view">
      <PokemonSheet back={desktop ? undefined : { to: "/myPokemon", label: "My Pokémon" }} />
    </PokemonProvider>
  );
  if (!desktop) return sheet;
  return (
    <div className="flex">
      <aside aria-label="My Pokémon" className="sticky top-0 h-dvh w-80 shrink-0 overflow-y-auto border-r border-hairline xl:w-88">
        <PokemonList selectedId={id} compact />
      </aside>
      <div className="min-w-0 flex-1">{sheet}</div>
    </div>
  );
};
