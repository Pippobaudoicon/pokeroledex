import { useMediaQuery } from "@uidotdev/usehooks";
import { ChevronRight, Download, Plus, Search, Users } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Link, useParams } from "react-router-dom";
import { usePokemonControllerFindAllMinimal, useTrainersControllerFindAll } from "@/api/components";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBall, TypePill } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Sprite } from "@/components/kit/Sprite";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { PokemonProvider } from "@/components/pokemon-sheet/context";
import { useInFight } from "@/components/pokemon-sheet/fight";
import { FightMark, fightBorder } from "@/components/kit/Fight";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { fold } from "@/hooks/use-dex";
import { cn, formatEnumName } from "@/lib/utils";
import { TeamsSheet } from "@/pages/MyPokemon/Teams";

const PokemonRow = ({ pokemon, selected, fighting }: { pokemon: T.PokemonMinimal; selected: boolean; fighting: boolean }) => (
  <li className="group/row">
    <Link
      to={`/myPokemon/${pokemon.id}`}
      replace={selected}
      aria-current={selected ? "page" : undefined}
      className="flex items-center gap-3 pl-2 transition-colors duration-150 hover:bg-raised active:bg-fill aria-[current]:bg-tint/10"
    >
      <Sprite image={pokemon.image} set="box" className={cn("h-14 w-17 rounded-xl", pokemon.shiny && shinyRing, fighting && fightBorder)} />
      <span className="flex min-h-15 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-2 pr-4 group-last/row:border-b-0 lg:pr-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-body font-medium"><span className="truncate">{pokemon.name}</span>{pokemon.shiny && <ShinyMark compact />}{fighting && <FightMark />}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-footnote text-label-2">
            <RankBall rank={pokemon.rank} className="size-3.5" />
            {formatEnumName(pokemon.rank)}
            {pokemon.types.map((type) => (
              <TypePill key={type} type={type} size="sm" />
            ))}
            {pokemon.trainerId && <span className="font-medium text-tint">Party</span>}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />
      </span>
    </Link>
  </li>
);

const PokemonCard = ({ pokemon, fighting }: { pokemon: T.PokemonMinimal; fighting: boolean }) => (
  <li className="min-w-0">
    <Link
      to={`/myPokemon/${pokemon.id}`}
      title={pokemon.name}
      className={cn("relative flex h-full flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center shadow-card transition-colors duration-150 hover:bg-raised active:bg-fill sm:p-4", pokemon.shiny && shinyRing, fighting && fightBorder)}
    >
      {fighting && <FightMark className="absolute top-2 right-2 [&>svg]:size-5" />}
      <Sprite image={pokemon.image} set="book" className="size-24 lg:size-28" />
      <span className="line-clamp-2 min-h-[2.8em] w-full text-body font-semibold">{pokemon.name}</span>
      <span className="flex items-center justify-center gap-1.5 text-footnote text-label-2">
        <RankBall rank={pokemon.rank} className="size-3.5" />
        {formatEnumName(pokemon.rank)}
        {pokemon.shiny && <ShinyMark compact />}
        {pokemon.trainerId && <span className="font-medium text-tint">· Party</span>}
      </span>
      <span className="mt-auto flex flex-wrap justify-center gap-1">
        {pokemon.types.map((type) => (
          <TypePill key={type} type={type} size="sm" />
        ))}
      </span>
    </Link>
  </li>
);

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
    <Pokeball className="size-14 text-tint" strokeWidth={5} />
    <h2 className="text-title-3 font-semibold">No Pokémon yet</h2>
    <p className="max-w-sm text-subhead text-label-2">
      Every Pokémon you add gets a sheet with HP, Will, stats and moves with their dice pools. Find one in the Pokédex, or import your collection.
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

const FILTER_KEY = "myPokemon.trainer";
const UNASSIGNED = "none";

/** The trainer filter, kept for the tab session so it survives opening a sheet. */
const useTrainerFilter = () => {
  const [value, setValue] = React.useState(() => {
    try {
      return sessionStorage.getItem(FILTER_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const set = (next: string) => {
    setValue(next);
    try {
      sessionStorage.setItem(FILTER_KEY, next);
    } catch {
      // Without storage the filter just resets on navigation.
    }
  };
  return [value, set] as const;
};

const PokemonList = ({ selectedId, compact }: { selectedId?: string; compact: boolean }) => {
  const { data, isFetching, isError, refetch } = usePokemonControllerFindAllMinimal({});
  const { data: trainers } = useTrainersControllerFindAll({});
  const inFight = useInFight();
  const [query, setQuery] = React.useState("");
  const [storedTrainer, setTrainer] = useTrainerFilter();
  const [teamsOpen, setTeamsOpen] = React.useState(false);
  // A deleted trainer's filter falls back to everyone.
  const trainer = storedTrainer && storedTrainer !== UNASSIGNED && trainers && !trainers.some((entry) => entry.id === storedTrainer) ? "" : storedTrainer;
  const trainerName = trainers?.find((entry) => entry.id === trainer)?.name || "This trainer";
  const list = React.useMemo(
    () =>
      data
        ?.filter((pokemon) => !trainer || (trainer === UNASSIGNED ? !pokemon.ownerTrainerId : pokemon.ownerTrainerId === trainer))
        .filter((pokemon) => fold(pokemon.name ?? "").includes(fold(query.trim())))
        .sort((first, second) => (first.name ?? "").localeCompare(second.name ?? "")),
    [data, query, trainer],
  );
  const filterClass =
    "h-11 min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg";
  const filters = !!data?.length && (
    <div className={cn("flex gap-2", compact ? "flex-col px-4 pt-2 lg:px-3" : "mt-3 flex-col sm:flex-row lg:max-w-2xl")}>
      <label className="relative flex min-w-0 flex-1 items-center">
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
      {!!trainers?.length && (
        <select aria-label="Filter by trainer" value={trainer} onChange={(event) => setTrainer(event.target.value)} className={cn(filterClass, !compact && "sm:w-56")}>
          <option value="">All trainers</option>
          <option value={UNASSIGNED}>Unassigned</option>
          {trainers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name || "Unnamed trainer"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
  const teamsButton = !!data?.length && (
    <button type="button" onClick={() => setTeamsOpen(true)} className={button({ variant: "plain", size: compact ? "sm" : "md" })}>
      <Users aria-hidden className="size-5 lg:size-4" />
      Teams
    </button>
  );
  return (
    <>
      <PageHeader
        title="My Pokémon"
        compact={compact}
        actions={
          <>
            {!compact && teamsButton}
            <Link to="/pokemon" className={button({ variant: "plain", size: compact ? "sm" : "md" })} aria-label="Add a Pokémon from the Pokédex">
              <Plus aria-hidden className="size-5 lg:size-4" strokeWidth={2.5} />
              Add
            </Link>
          </>
        }
      >
        {!compact && filters}
      </PageHeader>
      {compact && filters}
      {data && <TeamsSheet open={teamsOpen} onOpenChange={setTeamsOpen} pokemon={data} trainers={trainers ?? []} />}
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
            <p className="text-body">
              {query.trim()
                ? `No Pokémon named “${query}”${trainer ? " here" : ""}.`
                : trainer === UNASSIGNED
                  ? "Every Pokémon belongs to a trainer."
                  : `${trainerName} has no Pokémon yet.`}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {query && (
                <button type="button" onClick={() => setQuery("")} className={button({ variant: "tinted" })}>
                  Clear search
                </button>
              )}
              {trainer && (
                <button type="button" onClick={() => setTrainer("")} className={button({ variant: "tinted" })}>
                  Show all trainers
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-footnote font-medium text-label-2" aria-live="polite">
              {list?.length} {list?.length === 1 ? "Pokémon" : "Pokémon"}
            </p>
            <ul className={compact ? "overflow-hidden rounded-xl bg-surface shadow-card" : "grid grid-cols-[repeat(2,minmax(0,220px))] justify-center gap-3 sm:grid-cols-[repeat(auto-fill,220px)] sm:justify-start sm:gap-4"}>
              {list?.map((pokemon) => compact ? (
                <PokemonRow key={pokemon.id} pokemon={pokemon} selected={pokemon.id === selectedId} fighting={inFight(pokemon.id)} />
              ) : (
                <PokemonCard key={pokemon.id} pokemon={pokemon} fighting={inFight(pokemon.id)} />
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
