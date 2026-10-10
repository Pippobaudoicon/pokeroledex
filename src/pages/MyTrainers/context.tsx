import { type InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type * as T from "../../../shared/types";
import {
  useRankupAttributesControllerFindOne,
  useTrainersControllerFindOne,
  useTrainersControllerUpdate,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Rank } from "@/api/schemas";
import { SOCIALS, TRAINER_ATTRIBUTES, TRAINER_SKILLS } from "@/lib/stats";

export type EditingMode = "view" | "edit" | "rankUp";
export type TrainerStatKey =
  | (typeof TRAINER_ATTRIBUTES)[number]
  | (typeof SOCIALS)[number]
  | (typeof TRAINER_SKILLS)[number];
/** updatedTrainer.stats minus baseTrainer.stats, per stat. */
export type StatChanges = Record<TrainerStatKey, number>;
/** Entries added in the sheet have no id until saved; custom drafts carry a partial item. */
export type InventoryRow = { id: string | undefined; item: T.Item; quantity: number };
export type EditableTrainer = Omit<T.Trainer, "inventory"> & { inventory: InventoryRow[] };

export interface TrainerContextValue {
  updatedTrainer: EditableTrainer | undefined;
  baseTrainer: EditableTrainer | undefined;
  isLoading: boolean;
  isError: boolean;
  updateTrainer: (changes: Partial<EditableTrainer>) => void;
  saveTrainer: () => void;
  cancelEdit: () => void;
  editingMode: EditingMode;
  setEditingMode: (mode: EditingMode) => void;
  /** Point budget for ranking up to the next rank. */
  rankUpAttributes: T.RankUpAttributes | undefined;
  statChanges: StatChanges | undefined;
}

const TRAINER_STATS = [...TRAINER_ATTRIBUTES, ...SOCIALS, ...TRAINER_SKILLS];

function isCustomItem(item: T.Item) {
  return item.id === undefined || item.id === "" ? true : item.id.startsWith("custom-");
}
function toInventoryItemDto(entry: InventoryRow): NonNullable<T.UpdateTrainerBody["inventory"]>[number] {
  const id = entry.id === "" ? undefined : entry.id;
  return isCustomItem(entry.item)
    ? {
        id,
        quantity: entry.quantity,
        name: entry.item.name,
        source: entry.item.source,
        category: entry.item.category,
        pocket: entry.item.pocket,
        description: entry.item.description,
        oneUse: entry.item.oneUse,
        PMD: entry.item.PMD,
        trainerPrice: entry.item.trainerPrice,
        pmdPrice: entry.item.pmdPrice,
        image: entry.item.image,
      }
    : {
        id,
        itemId: entry.item.id,
        quantity: entry.quantity,
      };
}
/** The PATCH body holding only what changed between `base` and `updated`. */
function diffTrainer(base: EditableTrainer, updated: EditableTrainer): T.UpdateTrainerBody {
  const body: T.UpdateTrainerBody = {
    id: updated.id,
  };
  if (base.rank !== updated.rank) body.rank = updated.rank;
  if (base.gender !== updated.gender) body.gender = updated.gender;
  if (base.name !== updated.name) body.name = updated.name;
  if (base.age !== updated.age) body.age = updated.age;
  if (base.money !== updated.money) body.money = updated.money;
  if (base.currentHp !== updated.currentHp) body.currentHp = updated.currentHp;
  if (base.currentWill !== updated.currentWill) body.currentWill = updated.currentWill;
  if (base.nature?.id !== updated.nature?.id) body.natureId = updated.nature?.id;
  if (hasObjectChanges(base.stats, updated.stats))
    body.stats = {
      ...updated.stats,
    };
  if (hasInventoryChanges(base.inventory, updated.inventory))
    body.inventory = updated.inventory.map(toInventoryItemDto);
  if (hasListChanges(base.pokemon, updated.pokemon)) body.pokemonIds = updated.pokemon.map((pokemon) => pokemon.id);
  return body;
}
function hasObjectChanges(base: T.Stats, updated: T.Stats) {
  return (Object.keys(base) as T.StatKey[]).some((key) => base[key] !== updated[key]);
}
function hasInventoryChanges(base: InventoryRow[], updated: InventoryRow[]) {
  if (base.length !== updated.length) return true;
  for (let i = 0; i < base.length; i++) {
    const before = base[i];
    const after = updated[i];
    if (before.id !== after.id || before.item.id !== after.item.id || before.quantity !== after.quantity) return true;
  }
  return false;
}
function hasListChanges(base: { id: string }[], updated: { id: string }[]) {
  if (base.length !== updated.length) return true;
  for (let i = 0; i < base.length; i++) if (base[i].id !== updated[i].id) return true;
  return false;
}
/** A cleared nature leaves natureId undefined, which (like the original) does not count as an update. */
function hasUpdates(body: T.UpdateTrainerBody) {
  return Object.entries(body).some(([key, value]) => key !== "id" && value !== undefined);
}

const TrainerContext = React.createContext<TrainerContextValue | undefined>(undefined);

export const TrainerProvider = ({
  id,
  editingMode: initialEditingMode = "view",
  children,
}: {
  id: string;
  editingMode?: EditingMode;
  children?: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const {
    data: trainer,
    isLoading,
    isError,
  } = useTrainersControllerFindOne(
    {
      pathParams: {
        id,
      },
    },
    {
      enabled: id !== undefined,
    },
  );
  const [baseTrainer, setBaseTrainer] = React.useState<EditableTrainer | undefined>(trainer);
  const [updatedTrainer, setUpdatedTrainer] = React.useState<EditableTrainer | undefined>(trainer);
  const { mutate } = useTrainersControllerUpdate({
    onSuccess: () => {
      // A bare query key is read as filters, so this invalidates every query (original behaviour).
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/trainers/{id}",
          operationId: "trainersControllerFindOne",
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
  const ranks = Object.values(Rank);
  const { data: rankUpAttributes } = useRankupAttributesControllerFindOne({
    pathParams: {
      rank: ranks[ranks.indexOf(trainer?.rank ?? Rank.STARTER) + 1],
    },
  });
  const statChanges = React.useMemo(() => {
    if (updatedTrainer === undefined || baseTrainer === undefined) return;
    return Object.fromEntries(
      TRAINER_STATS.map((stat) => [stat, updatedTrainer.stats[stat] - baseTrainer.stats[stat]]),
    ) as StatChanges;
  }, [updatedTrainer, baseTrainer]);

  const saveTrainer = () => {
    if (updatedTrainer === undefined || baseTrainer === undefined || updatedTrainer === baseTrainer || updatedTrainer === trainer)
      return;
    const body = diffTrainer(baseTrainer, updatedTrainer);
    if (hasUpdates(body)) {
      mutate({
        body,
      });
      setBaseTrainer(updatedTrainer);
    }
  };
  const updateTrainer = (changes: Partial<EditableTrainer>) => {
    if (updatedTrainer === undefined) return;
    // Spreads even if the queued state is undefined, exactly as the original did.
    setUpdatedTrainer((current) => ({ ...current, ...changes }) as EditableTrainer);
  };
  const setEditingMode = (mode: EditingMode) => {
    setEditingModeState(mode);
    if (mode === "rankUp")
      setUpdatedTrainer((current) => {
        if (current === undefined) return;
        return { ...current, rank: ranks[ranks.indexOf(current.rank) + 1] };
      });
  };
  const cancelEdit = () => {
    setUpdatedTrainer(trainer);
    setEditingMode("view");
  };

  React.useEffect(() => {
    setUpdatedTrainer(trainer);
    setBaseTrainer(trainer);
    setEditingMode("view");
  }, [trainer]);
  React.useEffect(() => {
    if (updatedTrainer !== undefined && editingMode === "view") saveTrainer();
  }, [updatedTrainer]);

  const value: TrainerContextValue = {
    updatedTrainer,
    baseTrainer,
    isLoading,
    isError,
    updateTrainer,
    saveTrainer,
    cancelEdit,
    editingMode,
    setEditingMode,
    rankUpAttributes,
    statChanges,
  };
  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
};

export const useTrainer = () => {
  const context = React.useContext(TrainerContext);
  if (context === undefined) throw new Error("useTrainer must be used within a TrainerProvider");
  return context;
};
