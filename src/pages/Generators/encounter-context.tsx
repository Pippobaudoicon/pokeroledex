import * as React from "react";
import type * as T from "../../../shared/types";
import { LegendaryFilter, RankUpMethod } from "@/api/schemas";
import type { Boosts } from "@/components/pokemon-sheet/fight";
import type { Statuses } from "@/components/pokemon-sheet/status";

export interface EncounterEntry {
  pokemon: T.Pokemon;
  locked: boolean;
  shinyRoll: [number, number];
}

/** Your side of the encounter: a Pokémon from My Pokémon (saved as you play), or any species generated for this encounter. */
export type AllyEntry =
  | { key: string; kind: "owned"; pokemonId: string; name: string; image: string; shiny: boolean }
  | { key: string; kind: "species"; pokemon: T.Pokemon };

export const rollShiny = (): [number, number] => [Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1];
export const isShiny = (entry: EncounterEntry) => entry.shinyRoll.every((die) => die === 20);
export const defaultSettings = (): T.GenerateEncounterBody => ({
  numberToGenerate: 1,
  name: "",
  types: [],
  generations: [],
  habitats: [],
  ranks: [],
  includeLegendary: LegendaryFilter.NONE,
  includeMythical: false,
  excludeForms: false,
  rankOrBelow: true,
  allowDuplicates: true,
  excludeStarters: true,
  fossils: "NONE",
  seed: Date.now(),
  rankUpMethod: RankUpMethod.RANDOM,
});

export const EncounterContext = React.createContext<{
  entries: EncounterEntry[];
  setEntries: React.Dispatch<React.SetStateAction<EncounterEntry[]>>;
  history: T.PokemonTemplateSummary[];
  setHistory: React.Dispatch<React.SetStateAction<T.PokemonTemplateSummary[]>>;
  /** Species excluded from every roll until removed; cleared when you leave the Generators page. */
  banned: T.PokemonTemplateSummary[];
  setBanned: React.Dispatch<React.SetStateAction<T.PokemonTemplateSummary[]>>;
  settings: T.GenerateEncounterBody;
  setSettings: React.Dispatch<React.SetStateAction<T.GenerateEncounterBody>>;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  status: string;
  setStatus: (value: string) => void;
  allies: AllyEntry[];
  setAllies: React.Dispatch<React.SetStateAction<AllyEntry[]>>;
  /** Current turn (1–5) per tab key (encounter Pokémon id or ally key); missing means 1. */
  turns: Record<string, number>;
  setTurns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  /** Temporary stat changes per tab key, for the whole encounter. */
  boosts: Record<string, Boosts>;
  setBoosts: React.Dispatch<React.SetStateAction<Record<string, Boosts>>>;
  /** Moves used this round per tab key. */
  usedMoves: Record<string, string[]>;
  setUsedMoves: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  /** Status ailments per tab key, applied on Refresh round. */
  statuses: Record<string, Statuses>;
  setStatuses: React.Dispatch<React.SetStateAction<Record<string, Statuses>>>;
}>(null!);

/** Keeps only the keys of `record` that `keep` accepts, returning the same object when nothing is dropped. */
const pick = <V,>(record: Record<string, V>, keep: (key: string) => boolean) => {
  const kept = Object.entries(record).filter(([key]) => keep(key));
  return kept.length === Object.keys(record).length ? record : Object.fromEntries(kept);
};

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [entries, setEntries] = React.useState<EncounterEntry[]>([]);
  const [history, setHistory] = React.useState<T.PokemonTemplateSummary[]>([]);
  const [banned, setBanned] = React.useState<T.PokemonTemplateSummary[]>([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [status, setStatus] = React.useState("Choose filters and generate an encounter.");
  const [allies, setAllies] = React.useState<AllyEntry[]>([]);
  const [turns, setTurns] = React.useState<Record<string, number>>({});
  const [boosts, setBoosts] = React.useState<Record<string, Boosts>>({});
  const [usedMoves, setUsedMoves] = React.useState<Record<string, string[]>>({});
  const [statuses, setStatuses] = React.useState<Record<string, Statuses>>({});
  const encounterEmpty = entries.length === 0;
  React.useEffect(() => {
    // Once the last encounter Pokémon is gone, drop the fight state left behind by removed ones; allies keep theirs.
    if (!encounterEmpty) return;
    const isAlly = (key: string) => allies.some((ally) => ally.key === key);
    setTurns((turns) => pick(turns, isAlly));
    setBoosts((boosts) => pick(boosts, isAlly));
    setUsedMoves((usedMoves) => pick(usedMoves, isAlly));
    setStatuses((statuses) => pick(statuses, isAlly));
  }, [encounterEmpty]);
  return (
    <EncounterContext.Provider
      value={{
        entries,
        setEntries,
        history,
        setHistory,
        banned,
        setBanned,
        settings,
        setSettings,
        isGenerating,
        setIsGenerating,
        status,
        setStatus,
        allies,
        setAllies,
        turns,
        setTurns,
        boosts,
        setBoosts,
        usedMoves,
        setUsedMoves,
        statuses,
        setStatuses,
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};
