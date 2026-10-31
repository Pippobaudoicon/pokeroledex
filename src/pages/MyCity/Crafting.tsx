import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dices, Hammer, Keyboard, Lock, Minus, Plus, Trash2, Unlock } from "lucide-react";
import * as React from "react";
import {
  CRAFTING_SKILLS, type City, type CityCraftResult, type CityDiscardBody, type CityInventoryBody, type CityInventoryResult, type CityOrderBody,
  type CityResearchResult, type CityStepsBody, type CityStockBody, type CraftingSkill, type HydratedInventoryEntry, type Item, type Trainer,
} from "../../../shared/types";
import {
  TIERS, craftBlockers, isUnlocked, itemRecipe, orderCost, orderRoom, orderUsage, overCapacity, researchBlockers, type CraftingCity, type Recipe,
} from "../../../shared/crafting";
import { ITEM_EXCEPTIONS } from "../../../shared/crafting-data";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { ItemPocket } from "@/api/schemas";
import { DiceRoll, type DiceRollRequest } from "@/components/DiceRoll";
import { ItemCard } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Chip } from "@/components/kit/Controls";
import { Picker } from "@/components/kit/Picker";
import { TypePill } from "@/components/kit/Pills";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { fold } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/layout/AppShell";
import { cn, formatEnumName } from "@/lib/utils";
import { SkillIcon, errorText, field, panel, skillLabel } from "./common";

type Entry = { item: Item; recipe: Recipe };
type View = "craft" | "research" | "storage";
type Usage = Record<CraftingSkill, number>;

// The server only crafts reference items, whatever campaigns the Pokédex filter selects.
const useReferenceItems = () => useQuery({
  queryKey: ["items", "reference"],
  queryFn: ({ signal }) => apiFetch<Item[]>({ url: "/items/campaigns", method: "post", body: { includeCore: true, campaignIds: [] }, signal }),
  staleTime: Infinity,
});

const replaceCity = (cities: City[] | undefined, city: City) => cities?.map(entry => entry.id === city.id ? city : entry);
/** Dice typed in from a physical roll: every digit 1-6, with or without separators. */
const parseFaces = (text: string) => (text.match(/[1-6]/g) ?? []).map(Number);
const dice = (count: number) => `${count} ${count === 1 ? "die" : "dice"}`;
const cityUrl = (city: City, path: string) => `/cities/${encodeURIComponent(city.id)}/${path}`;

const RecipeFacts = ({ recipe }: { recipe: Recipe }) => {
  const tier = TIERS[recipe.tier];
  return <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-label-2">
    <span className="inline-flex items-center gap-1"><SkillIcon skill={recipe.skill} className="size-4" />{skillLabel(recipe.skill)}</span>
    <span>Tier {recipe.tier} · {formatEnumName(tier.minRank)}</span>
    <span>Uses {orderCost(recipe)} {skillLabel(recipe.skill)} each</span>
    {recipe.assist && <span>Assist: {skillLabel(recipe.assist.skill)} {recipe.assist.min}+</span>}
    {recipe.catalyst && <span className="inline-flex flex-wrap items-center gap-1">Catalyst {tier.catalystStrength}+:
      {recipe.catalyst.map(type => <TypePill key={type} type={type} size="sm" />)}</span>}
  </span>;
};

/** Roll on the server, or type in the faces of a physical roll. */
const RollActions = ({ pool, label, disabled, onRoll }: { pool: number; label: string; disabled: boolean; onRoll: (faces?: number[]) => void }) => {
  const [typing, setTyping] = React.useState(false);
  const [text, setText] = React.useState("");
  const faces = parseFaces(text);
  if (typing) return <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
    event.preventDefault();
    if (faces.length !== pool) return;
    onRoll(faces);
    setTyping(false);
    setText("");
  }}>
    <input autoFocus inputMode="numeric" className={cn(field, "w-36")} aria-label={`The ${dice(pool)} you rolled`} placeholder={`${dice(pool)}, e.g. 4 6 1`}
      value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setTyping(false); }} />
    <span className={cn("text-footnote tabular-nums", faces.length > pool ? "text-red-500" : "text-label-2")}>{faces.length}/{pool}</span>
    <button className={button({ variant: "filled", size: "sm" })} disabled={disabled || faces.length !== pool}>Save</button>
    <button type="button" className={button({ variant: "gray", size: "sm" })} onClick={() => setTyping(false)}>Cancel</button>
  </form>;
  return <div className="flex items-center gap-2">
    <button type="button" className={button({ variant: "filled", size: "sm" })} disabled={disabled} onClick={() => onRoll()}>
      <Dices aria-hidden className="size-4" />{label} · {dice(pool)}
    </button>
    <button type="button" className={button({ variant: "gray", size: "sm" })} disabled={disabled} onClick={() => setTyping(true)}
      aria-label={`${label} with dice from a physical roll`} title="Enter dice from a physical roll">
      <Keyboard aria-hidden className="size-4" />
    </button>
  </div>;
};

const Blockers = ({ reasons }: { reasons: string[] }) => !reasons.length ? null :
  <p className="mt-1 flex items-start gap-1 text-footnote text-label-2"><Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />{reasons.join(" ")}</p>;

/** The leader's GM override: step research up or down, or unlock it outright, whatever the city could research. */
const StepControls = ({ name, steps, needed, disabled, onSet }: { name: string; steps: number; needed: number; disabled: boolean; onSet: (steps: number) => void }) =>
  <div className="flex items-center gap-1" role="group" aria-label={`${name} research steps`}>
    <button type="button" className={button({ variant: "gray", size: "icon" })} aria-label={`One less research step for ${name}`} title="Remove a step"
      disabled={disabled || steps <= 0} onClick={() => onSet(steps - 1)}>
      <Minus aria-hidden className="size-4" />
    </button>
    <button type="button" className={button({ variant: "gray", size: "icon" })} aria-label={`One more research step for ${name}`} title="Add a step"
      disabled={disabled} onClick={() => onSet(steps + 1)}>
      <Plus aria-hidden className="size-4" />
    </button>
    <button type="button" className={button({ variant: "tinted", size: "sm" })} disabled={disabled} onClick={() => onSet(needed)}
      aria-label={`Unlock ${name}`} title="Complete the research">
      <Unlock aria-hidden className="size-4" />Unlock
    </button>
  </div>;

/** The item's image and name open its details. */
const ItemTitle = ({ item, size = "size-10", onOpen, children }: { item: Item; size?: string; onOpen: () => void; children?: React.ReactNode }) => <>
  <button type="button" tabIndex={-1} aria-hidden onClick={onOpen} className="shrink-0 rounded-lg">
    <ItemImage imageFileName={item.image} className={size} />
  </button>
  <div className="min-w-0 flex-1 basis-56">
    <button type="button" onClick={onOpen} className="rounded text-left font-semibold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      aria-haspopup="dialog">{item.name}</button>
    {children}
  </div>
</>;

const RecipeRow = ({ entry, onOpen, children, actions }: { entry: Entry; onOpen: () => void; children?: React.ReactNode; actions?: React.ReactNode }) =>
  <li className="flex flex-wrap items-center gap-3 py-3">
    <ItemTitle item={entry.item} onOpen={onOpen}><RecipeFacts recipe={entry.recipe} />{children}</ItemTitle>
    {actions}
  </li>;

/** Adds an item to the crafting order, then steps its quantity while there is room. */
const OrderStepper = ({ name, quantity, room, disabled, onSet }: { name: string; quantity: number; room: number; disabled: boolean; onSet: (quantity: number) => void }) =>
  !quantity ?
    <button type="button" className={button({ variant: "tinted", size: "sm" })} disabled={disabled || room < 1} onClick={() => onSet(1)}
      title={room < 1 ? "The order has no room left for this skill" : undefined}>
      <Plus aria-hidden className="size-4" />Add to order
    </button> :
    <div className="flex items-center gap-1" role="group" aria-label={`${name} in the order`}>
      <button type="button" className={button({ variant: "gray", size: "icon" })} aria-label={`One less ${name}`} disabled={disabled} onClick={() => onSet(quantity - 1)}>
        <Minus aria-hidden className="size-4" />
      </button>
      <span className="w-8 text-center tabular-nums" aria-live="polite">{quantity}</span>
      <button type="button" className={button({ variant: "gray", size: "icon" })} aria-label={`One more ${name}`} disabled={disabled || room < 1} onClick={() => onSet(quantity + 1)}
        title={room < 1 ? "The order has no room left for this skill" : undefined}>
        <Plus aria-hidden className="size-4" />
      </button>
    </div>;

const ItemDetail = ({ entry, open, onOpenChange, blockers, children }: {
  entry: Entry | null; open: boolean; onOpenChange: (open: boolean) => void; blockers: string[]; children?: React.ReactNode;
}) => <Sheet open={open} onOpenChange={onOpenChange} title={entry?.item.name ?? "Item"} initialExpanded>
  {entry && <div className="space-y-3 p-4">
    <ItemCard item={entry.item} />
    <section className="rounded-2xl bg-surface p-4 shadow-card">
      <h3 className="text-headline font-semibold">Recipe</h3>
      {entry.recipe.craftable ? <RecipeFacts recipe={entry.recipe} /> : null}
      <Blockers reasons={blockers} />
      {entry.recipe.note && entry.recipe.craftable && <p className="mt-1 text-footnote text-label-2">{entry.recipe.note}</p>}
      {children && <div className="mt-3">{children}</div>}
    </section>
  </div>}
</Sheet>;

/** Picks how many of a storage entry to move or remove; the count stays within what is there. */
const QuantityActions = ({ max, name, disabled, actions }: {
  max: number; name: string; disabled: boolean; actions: { label: string; destructive?: boolean; onMove: (quantity: number) => void }[];
}) => {
  const [count, setCount] = React.useState(1);
  React.useEffect(() => setCount(current => Math.min(Math.max(1, current), max)), [max]);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;
  return <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); if (valid) actions[0]?.onMove(count); }}>
    <input type="number" min={1} max={max} value={count} onChange={event => setCount(Number(event.target.value))}
      className={cn(field, "w-18")} aria-label={`How many ${name}`} />
    {actions.map(({ label, destructive, onMove }) =>
      <button key={label} type="button" className={button({ variant: destructive ? "destructive" : "tinted", size: "sm" })} disabled={disabled || !valid}
        onClick={() => onMove(count)}>{destructive && <Trash2 aria-hidden className="size-4" />}{label}</button>)}
  </form>;
};

const InventoryList = ({ entries, empty, control }: { entries: HydratedInventoryEntry[]; empty: string; control: (entry: HydratedInventoryEntry) => React.ReactNode }) =>
  !entries.length ? <p className="py-3 text-label-2">{empty}</p> :
    <ul className="divide-y divide-hairline">{entries.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-3 py-2.5">
      <ItemImage imageFileName={entry.item.image} className="size-9 shrink-0" />
      <span className="min-w-0 flex-1 basis-32"><span className="block font-semibold">{entry.item.name}</span>
        <span className="text-footnote tabular-nums text-label-2">× {entry.quantity}</span></span>
      {control(entry)}
    </li>)}</ul>;

/** The leader adds reference items straight to city storage. */
const AddToStorage = ({ city, items }: { city: City; items: Item[] }) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const selected = items.find(item => item.id === itemId);
  const valid = !!selected && Number.isInteger(quantity) && quantity >= 1 && quantity <= 999;
  const stock = useMutation({
    mutationFn: (body: CityStockBody) => apiFetch<City>({ url: cityUrl(city, "stock"), method: "post", body }),
    onSuccess: (result, body) => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result));
      toast({ title: `Added ${body.quantity} × ${selected?.name ?? "item"} to ${city.name}` });
      setOpen(false);
    },
    onError: (error: ApiFetchError) => toast({ title: "The items could not be added", description: errorText(error) }),
  });
  const options = React.useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name))
    .map(item => ({ value: item.id, label: item.name, detail: formatEnumName(item.pocket ?? "") })), [items]);
  return <>
    <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => { setItemId(""); setQuantity(1); setOpen(true); }}>
      <Plus aria-hidden className="size-4" />Add item
    </button>
    <Sheet open={open} onOpenChange={setOpen} title={`Add to ${city.name} storage`} initialExpanded>
      <form className="flex flex-col gap-4 p-4" onSubmit={event => { event.preventDefault(); if (valid) stock.mutate({ itemId, quantity }); }}>
        <Picker label="Item" placeholder="Choose an item" items={options} value={itemId} onChange={setItemId} />
        <label className="flex flex-col gap-1.5 text-subhead font-medium">Quantity
          <input type="number" min={1} max={999} value={quantity} onChange={event => setQuantity(Number(event.target.value))} className={cn(field, "w-24")} />
        </label>
        {selected && <ItemCard item={selected} />}
        <button className={button({ variant: "filled" })} disabled={!valid || stock.isPending}>
          Add {selected ? `${quantity} × ${selected.name}` : "item"}
        </button>
      </form>
    </Sheet>
  </>;
};

const Storage = ({ city, trainers, items, isLeader }: { city: City; trainers: Trainer[]; items: Item[]; isLeader: boolean }) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const [trainerId, setTrainerId] = React.useState(trainers[0]?.id ?? "");
  const trainer = trainers.find(entry => entry.id === trainerId);
  const move = useMutation({
    mutationFn: (body: CityInventoryBody) => apiFetch<CityInventoryResult>({ url: cityUrl(city, "inventory"), method: "post", body }),
    onSuccess: (result, body) => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result.city));
      client.setQueryData<Trainer[]>(["trainers"], list => list?.map(entry => entry.id === result.trainer.id ? result.trainer : entry));
      client.invalidateQueries({ queryKey: ["trainers"] });
      toast({ title: body.direction === "deposit" ? `Stored in ${city.name}` : `Given to ${result.trainer.name || "your trainer"}` });
    },
    onError: (error: ApiFetchError) => toast({ title: "The items could not be moved", description: errorText(error) }),
  });
  const discard = useMutation({
    mutationFn: (body: CityDiscardBody) => apiFetch<City>({ url: cityUrl(city, "discard"), method: "post", body }),
    onSuccess: result => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result));
      toast({ title: `Removed from ${city.name}` });
    },
    onError: (error: ApiFetchError) => toast({ title: "The items could not be removed", description: errorText(error) }),
  });
  const pending = move.isPending || discard.isPending;
  const transfer = (entry: HydratedInventoryEntry, quantity: number, direction: CityInventoryBody["direction"]) =>
    trainer && move.mutate({ trainerId: trainer.id, entryId: entry.id, quantity, direction });
  const remove = (entry: HydratedInventoryEntry, quantity: number) => {
    if (window.confirm(`Remove ${quantity} × ${entry.item.name} from ${city.name} for good?`)) discard.mutate({ entryId: entry.id, quantity });
  };

  return <div className="space-y-4">
    <p className="text-footnote text-label-2">
      Every member can store items here and take them out for their own trainers. Crafted items arrive here too.
      {isLeader && " As the leader you can also add items directly and remove items for good."}
    </p>
    {!trainers.length ? <p className="text-label-2">Create a trainer in Trainers to give or take items.</p> :
      <label className="flex max-w-sm flex-col gap-2">Your trainer
        <select className={field} value={trainerId} onChange={event => setTrainerId(event.target.value)}>
          {trainers.map(entry => <option key={entry.id} value={entry.id}>{entry.name || "Unnamed trainer"}</option>)}
        </select>
      </label>}
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-xl bg-fill p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex-1 font-semibold">{city.name} storage</h3>
          {isLeader && <AddToStorage city={city} items={items} />}
        </div>
        <InventoryList entries={city.inventory} empty="Nothing stored yet. Craft items or store some from a trainer."
          control={entry => (trainer || isLeader) && <QuantityActions max={entry.quantity} name={entry.item.name} disabled={pending} actions={[
            ...(trainer ? [{ label: "Take", onMove: (quantity: number) => transfer(entry, quantity, "withdraw") }] : []),
            ...(isLeader ? [{ label: "Remove", destructive: true, onMove: (quantity: number) => remove(entry, quantity) }] : []),
          ]} />} />
      </section>
      {trainer && <section className="min-w-0 rounded-xl bg-fill p-3">
        <h3 className="font-semibold">{trainer.name || "Unnamed trainer"}'s bag</h3>
        <InventoryList entries={trainer.inventory} empty="This trainer carries no items."
          control={entry => <QuantityActions max={entry.quantity} name={entry.item.name} disabled={pending}
            actions={[{ label: "Store", onMove: quantity => transfer(entry, quantity, "deposit") }]} />} />
      </section>}
    </div>
  </div>;
};

/** The crafting order: what members queued, how much of each skill it uses, and the leader's Craft button. */
const OrderPanel = ({ city, lines, usage, isLeader, leader, disabled, onSet, onOpen, onCraft, blockersOf }: {
  city: City; lines: (Entry & { quantity: number })[]; usage: Usage; isLeader: boolean; leader: string | undefined; disabled: boolean;
  onSet: (itemId: string, quantity: number) => void; onOpen: (entry: Entry) => void; onCraft: () => void; blockersOf: (entry: Entry) => string[];
}) => {
  const over = overCapacity(city.skills, usage);
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const blocked = lines.some(line => blockersOf(line).length);
  return <section aria-labelledby="crafting-order" className="space-y-3 rounded-xl bg-fill p-3">
    <div className="flex flex-wrap items-center gap-2">
      <h3 id="crafting-order" className="flex-1 font-semibold">Crafting order · {count}</h3>
      {isLeader && <button type="button" className={button({ variant: "filled", size: "sm" })} disabled={disabled || !lines.length || over.length > 0 || blocked} onClick={onCraft}>
        <Hammer aria-hidden className="size-4" />Craft order
      </button>}
    </div>
    <p className="text-footnote text-label-2">
      Every member can add and remove items. Each crafting skill's value is how much of the order its recipes can fill; each item uses its tier's effort.
      {isLeader ? " Crafting puts every item in storage." : ` The leader (${leader}) crafts the order into storage.`}
    </p>
    <ul className="flex flex-wrap gap-1.5" aria-label="Skill use">
      {CRAFTING_SKILLS.filter(skill => city.skills[skill] || usage[skill]).map(skill =>
        <li key={skill} className={cn("inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-footnote tabular-nums", over.includes(skill) && "text-red-500")}>
          <SkillIcon skill={skill} className="size-3.5" />{skillLabel(skill)} {usage[skill]}/{city.skills[skill]}
        </li>)}
    </ul>
    {over.length > 0 && <p role="alert" className="text-footnote text-red-500">
      The order needs more {over.map(skillLabel).join(" and ")} than the city has now. Remove some items before crafting.
    </p>}
    {!lines.length ? <p className="text-footnote text-label-2">The order is empty. Add items from the recipes below.</p> :
      <ul className="divide-y divide-hairline">{lines.map(line => {
        const blockers = blockersOf(line);
        return <li key={line.item.id} className="flex items-center gap-3 py-2">
          <ItemTitle item={line.item} size="size-9" onOpen={() => onOpen(line)}>
            <span className="block text-footnote text-label-2">{skillLabel(line.recipe.skill)} · uses {orderCost(line.recipe) * line.quantity}</span>
            <Blockers reasons={blockers} />
          </ItemTitle>
          <div className="flex items-center gap-1">
            <OrderStepper name={line.item.name} quantity={line.quantity} disabled={disabled} onSet={quantity => onSet(line.item.id, quantity)}
              room={blockers.length ? 0 : orderRoom(line.recipe, city.skills, usage)} />
            <button type="button" className={button({ variant: "destructive", size: "icon" })} aria-label={`Take ${line.item.name} out of the order`}
              disabled={disabled} onClick={() => onSet(line.item.id, 0)}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </li>;
      })}</ul>}
  </section>;
};

/** Crafting tab of My City: the crafting order, research and storage (docs/crafting-plan.md). */
export const CityCrafting = ({ city, trainers }: { city: City; trainers: Trainer[] }) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const items = useReferenceItems();
  const [view, setView] = React.useState<View>("craft");
  const [query, setQuery] = React.useState("");
  const [skill, setSkill] = React.useState<CraftingSkill | "all">("all");
  const [showLocked, setShowLocked] = React.useState(false);
  const [pockets, setPockets] = React.useState<ItemPocket[]>([]);
  const [shown, setShown] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const [detail, setDetail] = React.useState<Entry | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const leader = city.members[0];
  const isLeader = !!me && me.email === leader;
  const state: CraftingCity = { rank: city.rank, skills: city.skills, catalysts: city.catalysts, research: city.research };
  const entries = React.useMemo(() => (items.data ?? []).map(item => ({ item, recipe: itemRecipe(item, ITEM_EXCEPTIONS[item.name]) })), [items.data]);
  const byId = React.useMemo(() => new Map(entries.map(entry => [entry.item.id, entry])), [entries]);
  const matches = (entry: Entry) => (skill === "all" || entry.recipe.skill === skill) && (!query || fold(entry.item.name).includes(fold(query))) &&
    (!pockets.length || (!!entry.item.pocket && pockets.includes(entry.item.pocket)));
  const byTier = (a: Entry, b: Entry) => a.recipe.tier - b.recipe.tier || a.item.name.localeCompare(b.item.name);
  const blockersOf = (entry: Entry) => craftBlockers(entry.recipe, state);
  const open = (entry: Entry) => { setDetail(entry); setDetailOpen(true); };

  const orderLines = (city.order ?? []).flatMap(line => {
    const entry = byId.get(line.itemId);
    return entry ? [{ ...entry, quantity: line.quantity }] : [];
  });
  const usage = orderUsage(orderLines);
  const inOrder = (itemId: string) => city.order?.find(line => line.itemId === itemId)?.quantity ?? 0;

  const setOrder = useMutation({
    mutationFn: (body: CityOrderBody) => apiFetch<City>({ url: cityUrl(city, "order"), method: "post", body }),
    onSuccess: result => client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result)),
    onError: (error: ApiFetchError) => toast({ title: "The order could not be changed", description: errorText(error) }),
  });
  const craft = useMutation({
    mutationFn: () => apiFetch<CityCraftResult>({ url: cityUrl(city, "craft"), method: "post", body: {} }),
    onSuccess: result => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result.city));
      const total = result.crafted.reduce((sum, line) => sum + line.quantity, 0);
      toast({
        title: `Crafted ${total} ${total === 1 ? "item" : "items"}`,
        description: result.crafted.map(line => `${line.quantity} × ${byId.get(line.itemId)?.item.name ?? "Item"}`).join(", "),
      });
    },
    onError: (error: ApiFetchError) => {
      client.invalidateQueries({ queryKey: ["cities"] });
      toast({ title: "The order could not be crafted", description: errorText(error) });
    },
  });
  const research = useMutation({
    mutationFn: ({ itemId, faces }: { itemId: string; faces?: number[] }) =>
      apiFetch<CityResearchResult>({ url: cityUrl(city, "research"), method: "post", body: { itemId, ...(faces && { faces }) } }),
    onSuccess: result => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result.city));
      const name = byId.get(result.roll.itemId)?.item.name ?? "Item";
      const outcome = result.roll.unlocked ? `${name} unlocked!` : `${result.roll.steps} of ${result.roll.needed} steps`;
      setShown({ key: Date.now(), title: name, kind: "research", dice: result.roll.pool, faces: result.roll.faces, result: outcome });
    },
    onError: (error: ApiFetchError) => toast({ title: "The roll could not be made", description: errorText(error) }),
  });
  const setSteps = useMutation({
    mutationFn: (body: CityStepsBody) => apiFetch<City>({ url: cityUrl(city, "steps"), method: "post", body }),
    onSuccess: (result, body) => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result));
      const entry = byId.get(body.itemId);
      if (entry && isUnlocked(entry.recipe, result.research)) toast({ title: `${entry.item.name} unlocked!` });
    },
    onError: (error: ApiFetchError) => toast({ title: "The research steps could not be changed", description: errorText(error) }),
  });
  const pending = setOrder.isPending || craft.isPending || research.isPending || setSteps.isPending;
  const stepper = (entry: Entry) => <OrderStepper name={entry.item.name} quantity={inOrder(entry.item.id)} disabled={pending}
    room={orderRoom(entry.recipe, city.skills, usage)} onSet={quantity => setOrder.mutate({ itemId: entry.item.id, quantity })} />;

  const craftRows = entries.filter(matches).map(entry => ({ ...entry, blockers: blockersOf(entry) }))
    .filter(row => showLocked || !row.blockers.length)
    .sort((a, b) => Number(a.blockers.length > 0) - Number(b.blockers.length > 0) || byTier(a, b));
  const craftableCount = entries.filter(entry => !blockersOf(entry).length).length;
  const researchable = entries.filter(entry => entry.recipe.craftable && TIERS[entry.recipe.tier].research);
  const researchRows = researchable.filter(entry => matches(entry) && !isUnlocked(entry.recipe, city.research))
    .map(entry => ({ ...entry, blockers: researchBlockers(entry.recipe, state), steps: city.research[entry.item.id] ?? 0, needed: TIERS[entry.recipe.tier].research!.steps }))
    .filter(row => showLocked || !row.blockers.length)
    .sort((a, b) => Number(a.blockers.length > 0) - Number(b.blockers.length > 0) || Number(b.steps > 0) - Number(a.steps > 0) || byTier(a, b));
  const researchedCount = researchable.filter(entry => isUnlocked(entry.recipe, city.research)).length;
  const storedCount = city.inventory.reduce((total, entry) => total + entry.quantity, 0);
  const detailBlockers = detail ? blockersOf(detail) : [];

  return <section className={`${panel} space-y-4`}>
    <div>
      <h2 className="text-title-3 font-semibold">Crafting</h2>
      <p className="mt-1 text-footnote text-label-2">
        Members fill a crafting order within the city's crafting skills, and the leader crafts it into storage.
        Higher tiers need research first, rolled with the Research skill's dice (every 4, 5 or 6 is a step), and some recipes need a resident of the right type in Catalyst.
        Select an item to read its description.
        {!isLeader && ` Only the city leader (${leader}) can craft the order, roll research and remove stored items.`}
      </p>
    </div>
    <Segmented label="Crafting view" idPrefix="crafting" value={view} onChange={setView} options={[
      { value: "craft", label: `Craft · ${craftableCount}` },
      { value: "research", label: `Research · ${researchedCount}` },
      { value: "storage", label: `Storage · ${storedCount}` },
    ]} />
    <div {...segmentPanelProps("crafting", view)} className="space-y-3 outline-none" tabIndex={-1}>
      {items.isError ? <p role="alert">The item list could not be loaded. <button type="button" className={button({ variant: "tinted", size: "sm" })} onClick={() => items.refetch()}>Try again</button></p> :
        !items.data ? <p role="status">Loading recipes...</p> :
        view === "storage" ? <Storage city={city} trainers={trainers} items={items.data} isLeader={isLeader} /> : <>
          {view === "craft" && <OrderPanel city={city} lines={orderLines} usage={usage} isLeader={isLeader} leader={leader} disabled={pending}
            onSet={(itemId, quantity) => setOrder.mutate({ itemId, quantity })} onOpen={open} onCraft={() => craft.mutate()} blockersOf={blockersOf} />}
          <div className="flex flex-wrap items-center gap-2">
            <input type="search" className={cn(field, "sm:max-w-64")} placeholder="Search items" aria-label="Search items" value={query} onChange={event => setQuery(event.target.value)} />
            <select className={cn(field, "sm:w-48")} aria-label="Crafting skill" value={skill} onChange={event => setSkill(event.target.value as CraftingSkill | "all")}>
              <option value="all">All skills</option>
              {CRAFTING_SKILLS.map(entry => <option key={entry} value={entry}>{skillLabel(entry)} ({city.skills[entry]})</option>)}
            </select>
            <label className="inline-flex min-h-11 items-center gap-2 text-subhead lg:min-h-9">
              <input type="checkbox" checked={showLocked} onChange={event => setShowLocked(event.target.checked)} />Show locked recipes
            </label>
          </div>
          <div role="group" aria-label="Filter by pocket" className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {Object.values(ItemPocket).map(pocket => <Chip key={pocket} pressed={pockets.includes(pocket)}
              onClick={() => setPockets(pockets.includes(pocket) ? pockets.filter(entry => entry !== pocket) : [...pockets, pocket])}>
              {formatEnumName(pocket)}
            </Chip>)}
          </div>
          {view === "craft" ? <>
            <p className="text-footnote text-label-2">{craftableCount} of {entries.filter(entry => entry.recipe.craftable).length} recipes can be crafted now.</p>
            {!craftRows.length ? <p className="text-label-2">{showLocked ? "No recipes match." : "Nothing matches that the city can craft yet. Turn on Show locked recipes to see what each one needs."}</p> :
              <ul className="divide-y divide-hairline">{craftRows.map(row => <RecipeRow key={row.item.id} entry={row} onOpen={() => open(row)}
                actions={!row.blockers.length && stepper(row)}>
                <Blockers reasons={row.blockers} />
              </RecipeRow>)}</ul>}
          </> : <>
            <p className="text-footnote text-label-2">Research rolls {dice(city.skills.research)} (the Research skill); each success is one step. Tier 1 and 2 recipes need none. {researchedCount} of {researchable.length} recipes are researched.
              {isLeader && " As the leader you can also add or remove steps, or unlock a recipe outright, even if the city could not research it yet."}</p>
            {!researchRows.length ? <p className="text-label-2">{showLocked ? "Nothing left to research that matches." : "Nothing the city can research yet matches. Turn on Show locked recipes to see what each one needs."}</p> :
              <ul className="divide-y divide-hairline">{researchRows.map(row => <RecipeRow key={row.item.id} entry={row} onOpen={() => open(row)}
                actions={isLeader && <div className="flex flex-wrap items-center gap-2">
                  {!row.blockers.length && <RollActions pool={city.skills.research} label="Research" disabled={pending}
                    onRoll={faces => research.mutate({ itemId: row.item.id, faces })} />}
                  <StepControls name={row.item.name} steps={row.steps} needed={row.needed} disabled={pending}
                    onSet={steps => setSteps.mutate({ itemId: row.item.id, steps })} />
                </div>}>
                <span className="mt-1.5 flex items-center gap-2">
                  <span role="progressbar" aria-label={`${row.item.name} research`} aria-valuemin={0} aria-valuemax={row.needed} aria-valuenow={row.steps}
                    className="h-1.5 w-32 overflow-hidden rounded-full bg-fill"><span className="block h-full bg-tint" style={{ width: `${(row.steps / row.needed) * 100}%` }} /></span>
                  <span className="text-footnote tabular-nums text-label-2">{row.steps} / {row.needed} steps</span>
                </span>
                <Blockers reasons={row.blockers} />
              </RecipeRow>)}</ul>}
          </>}
        </>}
    </div>
    <ItemDetail entry={detail} open={detailOpen} onOpenChange={setDetailOpen} blockers={detailBlockers}>
      {detail && !detailBlockers.length && <div className="flex flex-wrap items-center gap-3">
        <span className="text-subhead text-label-2">In the order</span>
        {stepper(detail)}
      </div>}
    </ItemDetail>
    {shown && <DiceRoll key={shown.key} request={shown} onClose={() => setShown(null)} />}
  </section>;
};
