import { Minus, Plus, RotateCcw } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { type Statuses, statusBoosts } from "@/components/pokemon-sheet/status";
import { getTotalStat, POKEMON_ATTRIBUTES } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** Temporary attribute changes from moves, abilities and items; they last for the fight only. */
export type Boosts = Partial<Record<T.Attribute, number>>;

/** Fight state for one Pokémon: the action this round, temporary stats and the moves already used this round. */
export interface SheetFight {
  turn: number;
  setTurn: (turn: number) => void;
  boosts: Boosts;
  setBoosts: (boosts: Boosts) => void;
  usedMoves: readonly string[];
  setUsedMoves: (ids: string[]) => void;
  statuses: Statuses;
  setStatuses: (statuses: Statuses) => void;
}

const FightContext = React.createContext<SheetFight | undefined>(undefined);

export const FightProvider = ({ fight, children }: { fight: SheetFight | undefined; children: React.ReactNode }) => (
  <FightContext.Provider value={fight}>{children}</FightContext.Provider>
);

/** The sheet's fight state, or undefined outside a fight. */
export const useFight = () => React.useContext(FightContext);

/** Fight state kept by the component using it, so it is gone once that component unmounts. */
export const useLocalFight = (): SheetFight & { reset: () => void } => {
  const [turn, setTurn] = React.useState(1);
  const [boosts, setBoosts] = React.useState<Boosts>({});
  const [usedMoves, setUsedMoves] = React.useState<string[]>([]);
  const [statuses, setStatuses] = React.useState<Statuses>({});
  const reset = React.useCallback(() => {
    setTurn(1);
    setBoosts({});
    setUsedMoves([]);
    setStatuses({});
  }, []);
  return { turn, setTurn, boosts, setBoosts, usedMoves, setUsedMoves, statuses, setStatuses, reset };
};

/** Temporary stats plus stat changes from statuses (Paralysis). */
export const fightBoosts = (fight: SheetFight | undefined): Boosts | undefined => {
  if (!fight) return undefined;
  const fromStatuses = statusBoosts(fight.statuses);
  const combined: Boosts = { ...fight.boosts };
  for (const [attribute, value] of Object.entries(fromStatuses) as [T.Attribute, number][])
    combined[attribute] = (combined[attribute] ?? 0) + value;
  return combined;
};

/** A boost never takes an attribute below 0. */
const clampedBoost = (pokemon: T.Pokemon, boosts: Boosts, attribute: T.Attribute) =>
  Math.max(-getTotalStat(pokemon, attribute), boosts[attribute] ?? 0);

export const hasBoosts = (boosts: Boosts | undefined) => !!boosts && Object.values(boosts).some((value) => !!value);

/** The Pokémon with its temporary stats applied, for working out dice pools. */
export const withBoosts = (pokemon: T.Pokemon, boosts: Boosts | undefined): T.Pokemon => {
  if (!hasBoosts(boosts)) return pokemon;
  const stats = { ...pokemon.stats };
  for (const attribute of POKEMON_ATTRIBUTES) stats[attribute] += clampedBoost(pokemon, boosts!, attribute);
  return { ...pokemon, stats };
};

const LABELS: Record<T.Attribute, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Defense",
  special: "Special",
  insight: "Sp. Def",
};

const HINTS: Record<T.Attribute, string | undefined> = {
  strength: undefined,
  dexterity: undefined,
  vitality: "Vitality",
  special: undefined,
  insight: "Insight",
};

const stepClass =
  "grid size-11 shrink-0 place-items-center rounded-full bg-fill text-label transition-[background-color,transform] duration-150 hover:bg-fill-strong active:scale-90 disabled:opacity-25 lg:size-7";

/** Raise or lower attributes for this fight; pools and moves use the changed values. */
export const TempStats = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const fight = useFight();
  if (!fight) return null;
  const { boosts, setBoosts } = fight;
  const set = (attribute: T.Attribute, value: number) => setBoosts({ ...boosts, [attribute]: value });
  return (
    <Group
      title="Temporary stats"
      action={
        hasBoosts(boosts) && (
          <button type="button" onClick={() => setBoosts({})} className={button({ variant: "plain", size: "sm" })}>
            <RotateCcw aria-hidden className="size-3.5" />
            Reset
          </button>
        )
      }
      footer="Stat changes for this fight. Pools and move dice include them; they’re cleared when you end the fight or leave the page."
    >
      {POKEMON_ATTRIBUTES.map((attribute) => {
        const base = getTotalStat(pokemon, attribute);
        const own = boosts[attribute] ?? 0;
        const fromStatus = statusBoosts(fight.statuses)[attribute] ?? 0;
        const boost = clampedBoost(pokemon, { [attribute]: own + fromStatus }, attribute);
        const label = LABELS[attribute];
        return (
          <div key={attribute} className="flex min-h-12 items-center gap-3 border-b border-hairline py-1 pr-2 pl-4 last:border-b-0 lg:min-h-9 lg:pl-3">
            <span className="min-w-0 flex-1 text-body">
              {label}
              {HINTS[attribute] && <span className="ml-1.5 text-footnote text-label-2">{HINTS[attribute]}</span>}
              {fromStatus !== 0 && <span className="ml-1.5 text-footnote text-[#d92d20]">Paralysis −{-fromStatus}</span>}
            </span>
            <button type="button" className={stepClass} aria-label={`Lower ${label} temporarily`} disabled={base + boost <= 0} onClick={() => set(attribute, own - 1)}>
              <Minus aria-hidden className="size-4 lg:size-3.5" />
            </button>
            <output
              aria-label={`${label}, ${boost > 0 ? `raised by ${boost}` : boost < 0 ? `lowered by ${-boost}` : "unchanged"}`}
              className={cn(
                "w-6 shrink-0 text-center text-body font-semibold tabular-nums",
                boost > 0 ? "text-[#1f9d55]" : boost < 0 ? "text-[#d92d20]" : undefined,
              )}
            >
              {base + boost}
            </output>
            <button type="button" className={stepClass} aria-label={`Raise ${label} temporarily`} onClick={() => set(attribute, own + 1)}>
              <Plus aria-hidden className="size-4 lg:size-3.5" />
            </button>
          </div>
        );
      })}
    </Group>
  );
};
