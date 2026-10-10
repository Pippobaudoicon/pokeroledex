import { type InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type * as T from "../../../shared/types";
import {
  usePokemonControllerFindOne,
  usePokemonControllerUpdate,
  useRankupAttributesControllerFindOne,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Rank } from "@/api/schemas";

export type EditingMode = "view" | "edit" | "rankUp";
/** Every stat a Pokemon sheet shows (trainer-only skills excluded). */
export type PokemonStatKey = Exclude<T.StatKey, T.TrainerSkill>;
/** updatedPokemon.stats minus basePokemon.stats, per stat. */
export type StatChanges = Record<PokemonStatKey, number>;

export interface PokemonContextValue {
  updatedPokemon: T.Pokemon | undefined;
  basePokemon: T.Pokemon | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Only the static provider supplies this (as a no-op). */
  setPokemon?: (pokemon: T.Pokemon | undefined) => void;
  updatePokemon: (changes: Partial<T.Pokemon>) => void;
  savePokemon: () => void;
  cancelEdit: () => void;
  editingMode: EditingMode;
  setEditingMode: (mode: EditingMode) => void;
  /** Point budget for ranking up to the next rank. */
  rankUpAttributes: T.RankUpAttributes | undefined;
  statChanges: StatChanges | undefined;
  isLocked?: boolean;
  lockedPressed?: () => void;
}

/** The PATCH body holding only what changed between `base` and `updated`. */
function diffPokemon(base: T.Pokemon, updated: T.Pokemon): T.UpdatePokemonBody {
  const body: T.UpdatePokemonBody = {
    id: updated.id,
  };
  if (base.rank !== updated.rank) body.rank = updated.rank;
  if (base.gender !== updated.gender) body.gender = updated.gender;
  if (base.noOfBattles !== updated.noOfBattles) body.noOfBattles = updated.noOfBattles;
  if (base.trainingPoints !== updated.trainingPoints) body.trainingPoints = updated.trainingPoints;
  if (base.currentHp !== updated.currentHp) body.currentHp = updated.currentHp;
  if (base.currentWill !== updated.currentWill) body.currentWill = updated.currentWill;
  if (base.pokemonTemplate?.id !== updated.pokemonTemplate?.id)
    body.pokemonTemplateId = updated.pokemonTemplate?.id;
  if (base.ability?.id !== updated.ability?.id) body.abilityId = updated.ability?.id ?? null;
  if (base.nature?.id !== updated.nature?.id) body.natureId = updated.nature?.id ?? null;
  if (base.heldItem?.id !== updated.heldItem?.id) body.heldItemId = updated.heldItem?.id ?? null;
  if (base.trainer?.id !== updated.trainer?.id) body.trainerId = updated.trainer?.id ?? null;
  if (hasObjectChanges(base.stats, updated.stats))
    body.stats = {
      ...updated.stats,
    };
  if (hasListChanges(base.moves, updated.moves)) body.moveIds = updated.moves.map((move) => move.id);
  return body;
}
function hasObjectChanges(base: T.Stats, updated: T.Stats) {
  return (Object.keys(base) as T.StatKey[]).some((key) => base[key] !== updated[key]);
}
function hasListChanges(base: { id: string }[], updated: { id: string }[]) {
  if (base.length !== updated.length) return true;
  for (let i = 0; i < base.length; i++) if (base[i].id !== updated[i].id) return true;
  return false;
}
function hasUpdates(body: T.UpdatePokemonBody) {
  return Object.keys(body).some((key) => key !== "id");
}

const PokemonContext = React.createContext<PokemonContextValue | undefined>(undefined);

export const PokemonProvider = ({
  id,
  editingMode: initialEditingMode = "view",
  children,
}: {
  id: string;
  editingMode?: EditingMode;
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const {
    data: pokemon,
    isLoading,
    isError,
  } = usePokemonControllerFindOne(
    {
      pathParams: {
        id,
      },
    },
    {
      enabled: id !== undefined,
    },
  );
  const [basePokemon, setBasePokemon] = React.useState(pokemon);
  const [updatedPokemon, setUpdatedPokemon] = React.useState(pokemon);
  const { mutate } = usePokemonControllerUpdate({
    onSuccess: () => {
      // Passing the bare key (not { queryKey }) means react-query v5 invalidates every query.
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/pokemon/{id}",
          operationId: "pokemonControllerFindOne",
          variables: {
            pathParams: {
              id,
            },
          },
        }) as InvalidateQueryFilters,
      );
    },
  });
  const [editingMode, setEditingModeState] = React.useState(initialEditingMode);
  const { data: rankUpAttributes } = useRankupAttributesControllerFindOne({
    pathParams: {
      rank: Object.values(Rank)[Object.values(Rank).indexOf(pokemon?.rank ?? Rank.STARTER) + 1],
    },
  });
  const statChanges = React.useMemo(() => {
    if (updatedPokemon === undefined || basePokemon === undefined) return;
    const changes: StatChanges = {
      strength: 0,
      dexterity: 0,
      vitality: 0,
      special: 0,
      insight: 0,
      happiness: 0,
      loyalty: 0,
      tough: 0,
      cool: 0,
      beauty: 0,
      cute: 0,
      clever: 0,
      brawl: 0,
      channel: 0,
      clash: 0,
      evasion: 0,
      alert: 0,
      athletic: 0,
      nature: 0,
      stealth: 0,
      allure: 0,
      etiquette: 0,
      intimidate: 0,
      perform: 0,
      will: 0,
    };
    for (const key of Object.keys(changes) as PokemonStatKey[])
      changes[key] = updatedPokemon.stats[key] - basePokemon.stats[key];
    return changes;
  }, [updatedPokemon, basePokemon]);
  const savePokemon = () => {
    if (
      updatedPokemon === undefined ||
      basePokemon === undefined ||
      updatedPokemon === basePokemon ||
      updatedPokemon === pokemon
    )
      return;
    const body = diffPokemon(basePokemon, updatedPokemon);
    if (hasUpdates(body)) {
      mutate({
        body,
      });
      setBasePokemon(updatedPokemon);
    }
  };
  const updatePokemon = (changes: Partial<T.Pokemon>) => {
    if (updatedPokemon !== undefined)
      setUpdatedPokemon((previous) => ({
        ...previous!,
        ...changes,
      }));
  };
  React.useEffect(() => {
    if (updatedPokemon !== undefined && editingMode === "view") savePokemon();
  }, [updatedPokemon]);
  const setEditingMode = (mode: EditingMode) => {
    setEditingModeState(mode);
    if (mode === "rankUp")
      setUpdatedPokemon((previous) => {
        if (previous === undefined) return;
        const next = {
          ...previous,
        };
        next.rank = Object.values(Rank)[Object.values(Rank).indexOf(next.rank) + 1];
        return next;
      });
  };
  const cancelEdit = () => {
    setUpdatedPokemon(pokemon);
    setEditingMode("view");
  };
  React.useEffect(() => {
    setUpdatedPokemon(pokemon);
    setBasePokemon(pokemon);
    setEditingMode("view");
  }, [pokemon]);
  const value: PokemonContextValue = {
    updatedPokemon,
    basePokemon,
    isLoading,
    isError,
    updatePokemon,
    savePokemon,
    cancelEdit,
    editingMode,
    setEditingMode,
    rankUpAttributes,
    statChanges,
  };
  return <PokemonContext.Provider value={value}>{children}</PokemonContext.Provider>;
};

/** Provider for an unsaved Pokemon. Encounters can update their local sheet. */
export const StaticPokemonProvider = ({
  pokemon,
  isLocked,
  lockedPressed,
  onChange,
  children,
}: {
  pokemon: T.Pokemon;
  isLocked?: boolean;
  lockedPressed?: () => void;
  onChange?: (changes: Partial<T.Pokemon>) => void;
  children: React.ReactNode;
}) => {
  const value: PokemonContextValue = {
    updatedPokemon: pokemon,
    basePokemon: pokemon,
    isLoading: false,
    isError: false,
    setPokemon: () => {},
    updatePokemon: onChange ?? (() => {}),
    savePokemon: () => {},
    cancelEdit: () => {},
    editingMode: "view",
    setEditingMode: () => {},
    rankUpAttributes: undefined,
    statChanges: undefined,
    isLocked,
    lockedPressed,
  };
  return <PokemonContext.Provider value={value}>{children}</PokemonContext.Provider>;
};

export const usePokemon = () => {
  const context = React.useContext(PokemonContext);
  if (context === undefined) throw new Error("usePokemon must be used within a PokemonProvider");
  return context;
};
