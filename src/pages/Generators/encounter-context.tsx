import * as React from "react";
import type * as T from "../../../shared/types";
import { LegendaryFilter, RankUpMethod } from "@/api/schemas";

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
  settings: T.GenerateEncounterBody;
  setSettings: React.Dispatch<React.SetStateAction<T.GenerateEncounterBody>>;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  status: string;
  setStatus: (value: string) => void;
  allies: AllyEntry[];
  setAllies: React.Dispatch<React.SetStateAction<AllyEntry[]>>;
  /** Current turn per tab key (encounter Pokémon id or ally key); missing means 0. */
  turns: Record<string, number>;
  setTurns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}>(null!);

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [entries, setEntries] = React.useState<EncounterEntry[]>([]);
  const [history, setHistory] = React.useState<T.PokemonTemplateSummary[]>([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [status, setStatus] = React.useState("Choose filters and generate an encounter.");
  const [allies, setAllies] = React.useState<AllyEntry[]>([]);
  const [turns, setTurns] = React.useState<Record<string, number>>({});
  const encounterEmpty = entries.length === 0;
  React.useEffect(() => {
    // Once the last encounter Pokémon is gone, drop the turns left behind by removed ones; allies keep theirs.
    if (!encounterEmpty) return;
    setTurns((turns) => {
      const kept = Object.entries(turns).filter(([key]) => allies.some((ally) => ally.key === key));
      return kept.length === Object.keys(turns).length ? turns : Object.fromEntries(kept);
    });
  }, [encounterEmpty]);
  return (
    <EncounterContext.Provider
      value={{
        entries,
        setEntries,
        history,
        setHistory,
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
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};
