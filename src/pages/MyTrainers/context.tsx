// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  useRankupAttributesControllerFindOne,
  useTrainersControllerFindOne,
  useTrainersControllerUpdate,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Rank } from "@/api/schemas";
function isCustomItem(e) {
  return e.id === undefined || e.id === "" ? true : e.id.startsWith("custom-");
}
function toInventoryItemDto(e) {
  const t = e.id === "" ? undefined : e.id;
  return isCustomItem(e.item)
    ? {
        id: t,
        quantity: e.quantity,
        name: e.item.name,
        source: e.item.source,
        category: e.item.category,
        pocket: e.item.pocket,
        description: e.item.description,
        oneUse: e.item.oneUse,
        PMD: e.item.PMD,
        trainerPrice: e.item.trainerPrice,
        pmdPrice: e.item.pmdPrice,
        image: e.item.image,
      }
    : {
        id: t,
        itemId: e.item.id,
        quantity: e.quantity,
      };
}
function diffTrainer(e, t) {
  var r, o, s;
  const n = {
    id: t.id,
  };
  return (
    e.rank !== t.rank && (n.rank = t.rank),
    e.gender !== t.gender && (n.gender = t.gender),
    e.name !== t.name && (n.name = t.name),
    e.age !== t.age && (n.age = t.age),
    e.money !== t.money && (n.money = t.money),
    e.currentHp !== t.currentHp && (n.currentHp = t.currentHp),
    e.currentWill !== t.currentWill && (n.currentWill = t.currentWill),
    ((r = e.nature) == null ? undefined : r.id) !==
      ((o = t.nature) == null ? undefined : o.id) &&
      (n.natureId = (s = t.nature) == null ? undefined : s.id),
    hasObjectChanges(e.stats, t.stats) &&
      (n.stats = {
        ...t.stats,
      }),
    hasInventoryChanges(e.inventory, t.inventory) &&
      (n.inventory = t.inventory.map(toInventoryItemDto)),
    hasListChanges(e.pokemon, t.pokemon) &&
      (n.pokemonIds = t.pokemon.map((i) => i.id)),
    n
  );
}
function hasObjectChanges(e, t) {
  return Object.keys(e).some((r) => e[r] !== t[r]);
}
function hasInventoryChanges(e, t) {
  if (e.length !== t.length) return true;
  for (let n = 0; n < e.length; n++) {
    const r = e[n],
      o = t[n];
    if (r.id !== o.id || r.item.id !== o.item.id || r.quantity !== o.quantity)
      return true;
  }
  return false;
}
function hasListChanges(e, t) {
  if (e.length !== t.length) return true;
  for (let n = 0; n < e.length; n++) if (e[n].id !== t[n].id) return true;
  return false;
}
function countUpdates(e) {
  let t = 0;
  return (
    e.rank !== undefined && t++,
    e.gender !== undefined && t++,
    e.name !== undefined && t++,
    e.age !== undefined && t++,
    e.natureId !== undefined && t++,
    e.money !== undefined && t++,
    e.currentHp !== undefined && t++,
    e.currentWill !== undefined && t++,
    e.stats !== undefined && t++,
    e.inventory !== undefined && t++,
    e.pokemonIds !== undefined && t++,
    t > 0
  );
}
const TrainerContext = React.createContext(undefined);
export const TrainerProvider = ({
  id: e,
  editingMode: t = "view",
  children: n,
}) => {
  const r = useQueryClient(),
    {
      data: o,
      isLoading: s,
      isError: i,
    } = useTrainersControllerFindOne(
      {
        pathParams: {
          id: e,
        },
      },
      {
        enabled: e !== undefined,
      },
    ),
    [l, c] = React.useState(o),
    [u, f] = React.useState(o),
    { mutate: p } = useTrainersControllerUpdate({
      onSuccess: () => {
        r.invalidateQueries(
          queryKeyFn({
            path: "/trainers/{id}",
            variables: {
              pathParams: {
                id: e,
              },
            },
          }),
        );
      },
    }),
    [h, m] = React.useState(t),
    { data: v } = useRankupAttributesControllerFindOne({
      pathParams: {
        rank: Object.values(Rank)[
          Object.values(Rank).indexOf(
            (o == null ? undefined : o.rank) ?? Rank.STARTER,
          ) + 1
        ],
      },
    }),
    g = React.useMemo(() => {
      if (u === undefined || l === undefined) return;
      const j = {
        strength: 0,
        dexterity: 0,
        vitality: 0,
        insight: 0,
        tough: 0,
        cool: 0,
        beauty: 0,
        cute: 0,
        clever: 0,
        brawl: 0,
        throw: 0,
        evasion: 0,
        weapons: 0,
        alert: 0,
        athletic: 0,
        nature: 0,
        stealth: 0,
        empathy: 0,
        etiquette: 0,
        intimidate: 0,
        perform: 0,
        crafts: 0,
        lore: 0,
        medicine: 0,
        science: 0,
      };
      for (const w of Object.keys(j)) j[w] = u.stats[w] - l.stats[w];
      return j;
    }, [u, l]),
    b = () => {
      if (u === undefined || l === undefined || u === l || u === o) return;
      const j = diffTrainer(l, u);
      countUpdates(j) &&
        (p({
          body: j,
        }),
        c(u));
    },
    x = (j) => {
      u !== undefined &&
        f((w) => ({
          ...w,
          ...j,
        }));
    },
    y = () => {
      f(o), S("view");
    };
  React.useEffect(() => {
    f(o), c(o), S("view");
  }, [o]),
    React.useEffect(() => {
      u !== undefined && h === "view" && b();
    }, [u]);
  const S = (j) => {
      m(j),
        j === "rankUp" &&
          f((w) => {
            if (w === undefined) return;
            const N = {
              ...w,
            };
            return (
              (N.rank =
                Object.values(Rank)[Object.values(Rank).indexOf(N.rank) + 1]),
              N
            );
          });
    },
    E = {
      updatedTrainer: u,
      baseTrainer: l,
      isLoading: s,
      isError: i,
      updateTrainer: x,
      saveTrainer: b,
      cancelEdit: y,
      editingMode: h,
      setEditingMode: S,
      rankUpAttributes: v,
      statChanges: g,
    };
  return <TrainerContext.Provider value={E}>{n}</TrainerContext.Provider>;
};
export const useTrainer = () => {
  const e = React.useContext(TrainerContext);
  if (e === undefined)
    throw new Error("useTrainer must be used within a TrainerProvider");
  return e;
};
