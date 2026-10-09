// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce, useHover } from "@uidotdev/usehooks";
import * as React from "react";
import { FaSave, FaWrench } from "react-icons/fa";
import { FaPerson, FaTrash, FaTrashCan, FaXmark } from "react-icons/fa6";
import { GrUpgrade } from "react-icons/gr";
import { Link, useNavigate } from "react-router-dom";
import { Textfit } from "react-textfit";
import {
  useItemsControllerFindAll,
  useNaturesControllerFindAll,
  useTrainersControllerRemove,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Gender, ItemCategory, ItemPocket, Rank } from "@/api/schemas";
import { Box } from "@/components/Box";
import { CollapsableButton } from "@/components/CollapsableButton";
import { Combobox } from "@/components/Combobox";
import { GenderIcon } from "@/components/GenderIcon";
import { ItemCard, getItemColor } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { LabeledField } from "@/components/LabeledField";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatPips } from "@/components/Pips";
import { PokemonImage } from "@/components/PokemonImage";
import { RankIcon } from "@/components/RankIcon";
import { StatBox } from "@/components/StatBox";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getContrastTextColor } from "@/lib/colors";
import { SOCIALS, TRAINER_ATTRIBUTES, TRAINER_SKILLS } from "@/lib/stats";
import { capitalize, cn, formatEnumName } from "@/lib/utils";
import { useTrainer } from "@/pages/MyTrainers/context";
const TrainerStatPips = ({ stat: e, type: t, pipClassName: n }) => {
  const {
      baseTrainer: r,
      updatedTrainer: o,
      updateTrainer: s,
      rankUpAttributes: i,
      editingMode: l,
      statChanges: c,
    } = useTrainer(),
    u = (b, x) => {
      if (o == null || r == null) return;
      const y = {
        ...o,
      };
      if (y.stats == null) return;
      const S = t === "attribute" ? 1 : t === "skill" ? 0 : 1,
        E = (c == null ? undefined : c[x]) ?? 0,
        j = r.stats[x] + E,
        w = b + 1 - S,
        N = l === "edit" ? 0 : r.stats[x],
        k = {
          ...y.stats,
          [x]: j === w ? N : w,
        };
      s({
        stats: k,
      });
    },
    f = React.useMemo(() => {
      if (l === "edit") return 1 / 0;
      if (l === "view" || i == null) return 0;
      switch (t) {
        case "attribute":
          return (
            ((i == null ? undefined : i.attributePoints) ?? 0) -
            TRAINER_ATTRIBUTES.reduce(
              (b, x) => b + ((c == null ? undefined : c[x]) ?? 0),
              0,
            )
          );
        case "social":
          return (
            ((i == null ? undefined : i.socialPoints) ?? 0) -
            SOCIALS.reduce(
              (b, x) => b + ((c == null ? undefined : c[x]) ?? 0),
              0,
            )
          );
        case "skill":
          return (
            ((i == null ? undefined : i.skillPoints) ?? 0) -
            TRAINER_SKILLS.reduce(
              (b, x) => b + ((c == null ? undefined : c[x]) ?? 0),
              0,
            )
          );
        case "other":
          return 0;
      }
    }, [i, c, l]),
    p = () => {
      if (l !== "edit" && t === "skill")
        return i == null ? undefined : i.skillLimit;
    },
    h = () =>
      r == null
        ? 0
        : l === "rankUp" || l === "view"
          ? t === "attribute"
            ? r.stats[e] + 1
            : t === "skill"
              ? r.stats[e]
              : r.stats[e] + 1
          : t === "attribute"
            ? 1
            : t === "skill"
              ? 0
              : 1,
    m = () => (r == null ? 0 : l === "edit" && t === "attribute" ? 6 : 5),
    v = () =>
      l === "edit"
        ? ((r == null ? undefined : r.stats[e]) ?? 0) +
          ((c == null ? undefined : c[e]) ?? 0)
        : ((c == null ? undefined : c[e]) ?? 0),
    g = () => {
      const b = ((r == null ? undefined : r.stats[e]) ?? 0) + 1;
      return Math.max(l === "edit" && t === "attribute" ? 6 : 5, b);
    };
  return r == null || o == null ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : (
    <StatPips
      maxPips={g()}
      baseStat={h()}
      maxStat={m()}
      numSelected={v()}
      allocatablePoints={f}
      onSelect={(b) => {
        u(b, e);
      }}
      pipClassName={n}
      limit={p()}
    />
  );
};
const TrainerGenderToggle = ({ className: e }) => {
  const { updatedTrainer: t, updateTrainer: n } = useTrainer(),
    r = () => {
      if (t == null) return;
      const o = Object.values(Gender),
        i = (o.indexOf(t.gender) + 1) % o.length,
        l = o[i] ?? Gender.N;
      n({
        gender: l,
      });
    };
  return (
    <div className="hover:cursor-pointer hover:bg-pokerole-black-light rounded-3xl p-1">
      {t != null && <GenderIcon onClick={r} gender={t.gender} className={e} />}
    </div>
  );
};
const DeleteTrainerDialog = ({ children: e, trainer: t }) => {
  const { toast: n } = useToast(),
    r = useQueryClient(),
    o = useNavigate(),
    { mutate: s } = useTrainersControllerRemove({
      onSuccess: () => {
        n({
          title: "Trainer deleted",
          description: (
            <>
              <span>Your trainer has been deleted.</span>
            </>
          ),
        }),
          o("/myTrainers"),
          r.invalidateQueries(
            queryKeyFn({
              path: "/trainers/{id}",
              variables: {
                pathParams: {
                  id: t.id,
                },
              },
            }),
          ),
          r.invalidateQueries(
            queryKeyFn({
              path: "/trainers",
              variables: {},
            }),
          );
      },
      onError: (l) => {
        n({
          title: "Failed to delete trainer",
          description: l == null ? undefined : l.payload,
        });
      },
    }),
    i = () => {
      s({
        pathParams: {
          id: t == null ? undefined : t.id,
        },
      });
    };
  return (
    <Dialog>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {"Are you sure you want to delete "}
            {t == null ? undefined : t.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button variant="red" onClick={i}>
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
};
const DeleteTrainerButton = () => {
  const { updatedTrainer: e } = useTrainer();
  if (e == null) return <></>;
  const t = () => (
    <DeleteTrainerDialog trainer={e}>
      <CollapsableButton
        text="Delete Trainer"
        icon={<FaTrash size={20} />}
        variant="red"
      />
    </DeleteTrainerDialog>
  );
  return <>{t()}</>;
};
const TrainerSheetHeader = () => {
  const {
      baseTrainer: e,
      updatedTrainer: t,
      isLoading: n,
      editingMode: r,
      setEditingMode: o,
      saveTrainer: s,
      cancelEdit: i,
    } = useTrainer(),
    l = () =>
      r === "view" ? (
        <>
          <CollapsableButton
            onClick={() => {
              o("rankUp");
            }}
            text="Rank Up"
            icon={<GrUpgrade size={20} />}
            variant="blue"
            disabled={(t == null ? undefined : t.rank) === Rank.CHAMPION}
          />
          <CollapsableButton
            onClick={() => {
              o("edit");
            }}
            text="Edit"
            icon={<FaWrench size={20} />}
            variant="yellow"
          />
          <DeleteTrainerButton />
        </>
      ) : (
        <>
          <CollapsableButton
            onClick={() => {
              s();
            }}
            text="Save"
            icon={<FaSave size={20} />}
            variant="green"
          />
          <CollapsableButton
            onClick={() => {
              i();
            }}
            text="Cancel"
            icon={<FaXmark size={20} />}
            variant="red"
          />
        </>
      );
  return (
    <Box
      color="bg-pokerole-black"
      className="p-2 col-span-full flex flex-row gap-2 items-center justify-between"
    >
      {n && <Text color="text-white">Loading...</Text>}
      {!n && e == null && <Text color="text-white">No Trainer found</Text>}
      {e != null && t != null && (
        <>
          <div className="md:col-span-5 col-span-full flex flex-row space-x-2 items-center">
            <Text color="text-white">
              {"Name: "}
              {e.name}
            </Text>
            <TrainerGenderToggle />
            <Text color="text-white">
              {"Age: "}
              {e.age}
            </Text>
          </div>
          <div className="flex flex-row md:justify-end justify-center space-x-1 text-white leading-none md:col-span-2 col-span-full">
            {l()}
          </div>
        </>
      )}
    </Box>
  );
};
const TrainerTextField = ({ property: e, className: t }) => {
  const { updatedTrainer: n, updateTrainer: r } = useTrainer(),
    [o, s] = React.useState(n != null ? n[e] : ""),
    i = useDebounce(o, 500);
  React.useEffect(() => {
    if (n === undefined) return;
    let c =
      typeof n[e] == "number" && n[e] !== undefined
        ? parseInt((o == null ? undefined : o.toString()) ?? "")
        : i;
    typeof c == "number" && isNaN(c) && (c = 0),
      r({
        [e]: c,
      });
  }, [i]),
    React.useEffect(() => {
      n !== undefined && s(n[e]);
    }, [n]);
  const l = (c) => {
    s(c.target.value);
  };
  if (n === undefined) return <div>Loading...</div>;
  if (typeof n[e] != "number" && typeof n[e] != "string")
    throw new Error(
      `Value ${JSON.stringify(n[e])} of ValueInput is not a number or text`,
    );
  return (
    <Input
      className={`border-none rounded-md p-0 text-3xl text-center ${t}`}
      value={o}
      onChange={l}
      onBlur={() =>
        r({
          [e]: typeof n[e] === "number" ? parseInt(o) || 0 : o,
        })
      }
    />
  );
};
const TrainerRankField = () => {
  const { updatedTrainer: e, editingMode: t, updateTrainer: n } = useTrainer();
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Rank"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        <Combobox
          items={Object.keys(Rank).map((r) => ({
            label: (
              <div className="flex items-center space-x-1">
                <RankIcon rank={Rank[r]} size="md" />{" "}
                <Textfit className="md:max-w-20">{r}</Textfit>
              </div>
            ),
            value: r.toLowerCase(),
            searchValue: r,
          }))}
          value={e == null ? undefined : e.rank.toLowerCase()}
          className="flex-grow"
          disabled={t !== "edit"}
          onChange={(r) => {
            e !== undefined &&
              n({
                rank: r.toUpperCase(),
              });
          }}
        />
      </div>
    </LabeledField>
  );
};
const TrainerNatureField = () => {
  var s;
  const { updatedTrainer: e, editingMode: t, updateTrainer: n } = useTrainer(),
    { data: r } = useNaturesControllerFindAll({}),
    o = () =>
      r == null
        ? []
        : r.map((i) => ({
            label: <span>{(i == null ? undefined : i.name) ?? ""}</span>,
            value: (i == null ? undefined : i.name.toLowerCase()) ?? "",
            searchValue: (i == null ? undefined : i.name) ?? "",
          }));
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Nature"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        <Combobox
          items={o()}
          value={
            (s = e == null ? undefined : e.nature) == null
              ? undefined
              : s.name.toLowerCase()
          }
          className="flex-grow"
          disabled={t !== "edit"}
          onChange={(i) => {
            if (e === undefined) return;
            const l =
              r == null
                ? undefined
                : r.find(
                    (c) => (c == null ? undefined : c.name.toLowerCase()) === i,
                  );
            n({
              nature: l,
            });
          }}
        />
      </div>
    </LabeledField>
  );
};
const InventoryItemRow = React.forwardRef(
  ({ item: e, onChange: t, onDelete: n, onClick: r, className: o }, s) => {
    const [i, l] = React.useState(e.quantity),
      c = useDebounce(i, 500);
    React.useEffect(() => {
      let f = c;
      isNaN(c) && (f = 0),
        t == null ||
          t({
            ...e,
            quantity: f,
          });
    }, [c]),
      React.useEffect(() => {
        l(e.quantity);
      }, [e]);
    const u = (f) => {
      l(parseInt(f.target.value));
    };
    return (
      <div
        className={cn(
          `flex justify-between w-full p-1 border-b-2 border-pokerole-black-light/50 items-center ${r != null ? "cursor-pointer hover:bg-pokerole-black/10" : ""} rounded-t-md`,
          o,
        )}
        ref={s}
      >
        <div
          className="flex-grow"
          onClick={() => (r == null ? undefined : r(e))}
        >
          <Text font="font-move" size="text-lg">
            {e.item.name}
          </Text>
        </div>
        <Input
          type="number"
          value={i}
          className="text-lg font-move text-pokerole-black flex-grow-0 w-6"
          styleLess={true}
          onChange={u}
        />
        {n != null && (
          <Button
            variant="transparent"
            className="p-1"
            onClick={() => {
              n == null || n(e);
            }}
          >
            <FaTrashCan />
          </Button>
        )}
      </div>
    );
  },
);
InventoryItemRow.displayName = "InventoryListItem";
const InventoryList = ({
  inventoryItems: e,
  columnCount: t = 1,
  onChange: n,
  onClick: r,
  onDelete: o,
}) => (
  <div className={`grid grid-cols-${t} gap-2`}>
    {e.map((s, i) => (
      <Popover key={i}>
        <PopoverTrigger asChild={true}>
          <InventoryItemRow item={s} onChange={n} onClick={r} onDelete={o} />
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-transparent border-none shadow-none">
          <ItemCard item={s.item} />
        </PopoverContent>
      </Popover>
    ))}
  </div>
);
const ItemPickerCard = ({ item: e, onClick: t, selected: n = false }) => {
  const r = getContrastTextColor(getItemColor(e.pocket, e.category)),
    [o, s] = useHover();
  return (
    <div ref={o}>
      <Box
        color={
          s || n
            ? `bg-${getItemColor(e.pocket, e.category)}-dark`
            : `bg-${getItemColor(e.pocket, e.category)}`
        }
        className="p-2 cursor-pointer"
        onClick={t}
      >
        <Box
          color={
            s || n
              ? `bg-${getItemColor(e.pocket, e.category)}`
              : `bg-${getItemColor(e.pocket, e.category)}-light`
          }
          className="p-2 min-w-16 min-h-16 flex justify-center items-center flex-col"
        >
          <ItemImage imageFileName={e.image} />
          <Text
            color={r}
            size="text-xs"
            className="text-center whitespace-nowrap"
          >
            {e.name}
          </Text>
        </Box>
      </Box>
    </div>
  );
};
const ItemPicker = ({ onSelected: e, selected: t, scrollClassName: n }) => {
  const { data: r } = useItemsControllerFindAll({}),
    [o, s] = React.useState(""),
    i = useDebounce(o, 200),
    l = React.useMemo(
      () =>
        r == null
          ? undefined
          : r
              .filter((c) => c.name.toLowerCase().includes(i.toLowerCase()))
              .sort((c, u) => {
                if (c.pocket == null) return 1;
                if (u.pocket == null) return -1;
                const f = c.pocket.localeCompare(u.pocket);
                if (f !== 0) return f;
                if (c.category == null) return 1;
                if (u.category == null) return -1;
                const p = c.category.localeCompare(u.category);
                return p !== 0 ? p : c.name.localeCompare(u.name);
              }),
      [r, i],
    );
  return r === undefined || l === undefined ? (
    <LoadingSpinner />
  ) : (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex flex-row gap-2">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={o}
          onChange={(c) => {
            s(c.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className={`rounded-3xl ${n ?? ""}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {l.map((c) => (
            <ItemPickerCard
              key={c.id}
              item={c}
              onClick={() => {
                e(c);
              }}
              selected={(t == null ? undefined : t.id) === c.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
const InventorySection = ({ buttonClassName: e }) => {
  const [t, n] = React.useState(null),
    [r, o] = React.useState(null),
    { updatedTrainer: s, updateTrainer: i } = useTrainer();
  React.useEffect(() => {
    r != null && n(null);
  }, [r]);
  const l = () => {
    if (s != null) {
      if (t != null) {
        const c = {
            id: undefined,
            item: t,
            quantity: 1,
          },
          u = [...s.inventory, c];
        i({
          inventory: u,
        });
      } else if (r != null && r.name !== "") {
        const c = {
            id: undefined,
            item: {
              ...r,
              source: "custom",
            },
            quantity: 1,
          },
          u = [...s.inventory, c];
        i({
          inventory: u,
        });
      }
    }
  };
  return (
    <Sheet>
      <SheetTrigger asChild={true}>
        <Button variant="transparent" className={e}>
          <Text className="text-center">+</Text>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full md:w-[600px]">
        <SheetHeader>
          <SheetTitle>Add items to inventory</SheetTitle>
          <SheetDescription>
            Add items to your inventory from the list of items or by creating a
            new item.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <ItemPicker
              onSelected={(c) => {
                n(c), o(null);
              }}
              selected={t}
              scrollClassName="h-[50vh]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Text className="text-center" size="text-xl">
              - Or create a new item -
            </Text>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Name: "}</Text>
              <Input
                placeholder="Enter name..."
                onChange={(c) => {
                  o((u) => ({
                    ...u,
                    name: c.target.value ?? "",
                    id: (u == null ? undefined : u.id) ?? "",
                  }));
                }}
                value={(r == null ? undefined : r.name) ?? ""}
              />
            </div>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Pocket: "}</Text>
              <Combobox
                items={Object.values(ItemPocket).map((c) => ({
                  label: formatEnumName(c),
                  value: c.toLowerCase(),
                }))}
                className="text-md flex-grow p-1"
                value={(r == null ? undefined : r.pocket) ?? ""}
              />
            </div>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Category: "}</Text>
              <Combobox
                items={Object.values(ItemCategory).map((c) => ({
                  label: formatEnumName(c),
                  value: c.toLowerCase(),
                }))}
                className="text-md flex-grow p-1"
                value={(r == null ? undefined : r.category) ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Text size="text-xl">{"Description: "}</Text>
              <Textarea
                placeholder="Enter your description here..."
                value={(r == null ? undefined : r.description) ?? ""}
                onChange={(c) => {
                  o((u) => ({
                    ...u,
                    description: c.target.value ?? "",
                    id: (u == null ? undefined : u.id) ?? "",
                    name: (u == null ? undefined : u.name) ?? "",
                  }));
                }}
              />
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild={true}>
            <Button
              type="submit"
              variant="green"
              onClick={l}
              className="w-full mt-2"
            >
              Add{" "}
              {(t == null ? undefined : t.name) ??
                (r == null ? undefined : r.name) ??
                "nothing"}{" "}
              to inventory
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
const TrainerPokemonCard = ({ pokemon: e }) => {
  const [t] = useHover();
  return (
    <div ref={t}>
      <Link to={`/myPokemon/${e.id}`}>
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex flex-col items-center hover:bg-pokerole-black transition-colors duration-300 ease-in-out"
        >
          <PokemonImage
            imageFileName={e.pokemonTemplate.image}
            type="box"
            className="w-[42.5px] image-rendering-pixelated"
          />
        </Box>
      </Link>
    </div>
  );
};
export const TrainerSheet = () => {
  const { updatedTrainer: e, updateTrainer: t } = useTrainer();
  if (e === undefined)
    return (
      <div className="flex flex-row flex-grow justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  const n = (r) => (
    <div key={r} className="flex flex-col items-center">
      <Text color="text-pokerole-black" size="text-base">
        {capitalize(r)}
      </Text>
      <TrainerStatPips stat={r} type="skill" pipClassName="w-4 h-4" />
    </div>
  );
  return (
    <div className="grid grid-flow-row grid-cols-6 gap-2">
      <TrainerSheetHeader />
      <Box
        color="bg-pokerole-beige"
        className="p-2 flex flex-col gap-2 2xl:col-span-1 col-span-full"
      >
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex flex-col items-center"
          withBorder={true}
        >
          <FaPerson size={140} />
        </Box>
        <div className="flex flex-row space-x-2">
          <LabeledField
            color="bg-pokerole-black"
            label="HP"
            topLabel={`Max: ${e.stats.vitality + 4 + 1}`}
            className="flex-grow"
          >
            <TrainerTextField property="currentHp" />
          </LabeledField>
          <LabeledField
            color="bg-pokerole-black"
            label="Will"
            topLabel={`Max: ${e.stats.insight + 3 + 1}`}
            className="flex-grow"
          >
            <TrainerTextField property="currentWill" />
          </LabeledField>
        </div>
        <LabeledField color="bg-pokerole-black" label="$">
          <TrainerTextField property="money" />
        </LabeledField>
        <TrainerRankField />
        <TrainerNatureField />
      </Box>
      <div className="2xl:col-span-2 col-span-full flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 max-2xl:order-2">
          <Box
            color="bg-pokerole-beige"
            className="p-2 space-y-2 2xl:col-span-1 col-span-full"
          >
            <Text className="text-center">Attributes</Text>
            <StatBox
              statName="Strength"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="strength" type="attribute" />}
            />
            <StatBox
              statName="Dexterity"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="dexterity" type="attribute" />}
            />
            <StatBox
              statName="Vitality"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="vitality" type="attribute" />}
            />
            <StatBox
              statName="Insight"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="insight" type="attribute" />}
            />
          </Box>
          <Box
            color="bg-pokerole-red"
            className="p-2 flex flex-col flex-shrink 2xl:col-span-1 col-span-full"
          >
            <Text className="text-center" size="text-sm">
              Skills
            </Text>
            <div className="p-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(0, 4).map((r) => n(r))}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(4, 8).map((r) => n(r))}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(8, 12).map((r) => n(r))}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(12, 16).map((r) => n(r))}
              </div>
            </div>
          </Box>
        </div>
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex-grow gap-1 flex flex-col max-2xl:order-1"
        >
          <Text className="text-center" size="text-sm">
            Party
          </Text>
          <div className="flex flex-row gap-1 justify-around flex-grow flex-wrap">
            {e.pokemon.slice(0, 6).map((r, o) => (
              <TrainerPokemonCard key={o} pokemon={r} />
            ))}
          </div>
        </Box>
      </div>
      <Box
        color="bg-pokerole-beige"
        className="p-2 space-y-2 2xl:col-span-1 col-span-full"
      >
        <Text className="text-center">Socials</Text>
        <StatBox
          statName="Tough"
          color="bg-socials-tough"
          pipRow={<TrainerStatPips stat="tough" type="social" />}
        />
        <StatBox
          statName="Cool"
          color="bg-socials-cool"
          pipRow={<TrainerStatPips stat="cool" type="social" />}
        />
        <StatBox
          statName="Beauty"
          color="bg-socials-beauty"
          pipRow={<TrainerStatPips stat="beauty" type="social" />}
        />
        <StatBox
          statName="Cute"
          color="bg-socials-cute"
          pipRow={<TrainerStatPips stat="cute" type="social" />}
        />
        <StatBox
          statName="Clever"
          color="bg-socials-clever"
          pipRow={<TrainerStatPips stat="clever" type="social" />}
        />
      </Box>
      <Box
        color="bg-pokerole-beige"
        className="p-2 space-y-2 2xl:col-span-2 col-span-full"
      >
        <Text className="text-center">Inventory</Text>
        <ScrollArea className="h-[25.5rem]">
          <InventoryList
            inventoryItems={e.inventory}
            columnCount={2}
            onChange={(r) => {
              const o = e.inventory.map((s) => (s.id === r.id ? r : s));
              t({
                inventory: o,
              });
            }}
            onDelete={(r) => {
              const o = e.inventory.filter((s) => s.id !== r.id);
              t({
                inventory: o,
              });
            }}
          />
        </ScrollArea>
        <InventorySection buttonClassName="w-full" />
      </Box>
    </div>
  );
};
