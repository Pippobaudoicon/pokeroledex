import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dices, Keyboard, Lock } from "lucide-react";
import * as React from "react";
import {
  CRAFTING_SKILLS, type City, type CityCraftResult, type CityInventoryBody, type CityInventoryResult, type CityResearchResult,
  type CraftingSkill, type HydratedInventoryEntry, type Item, type Trainer,
} from "../../../shared/types";
import { TIERS, craftBlockers, craftPool, isUnlocked, itemRecipe, researchBlockers, type CraftingCity, type Recipe } from "../../../shared/crafting";
import { ITEM_EXCEPTIONS } from "../../../shared/crafting-data";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { DiceRoll, type DiceRollRequest } from "@/components/DiceRoll";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { TypePill } from "@/components/kit/Pills";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { fold } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/layout/AppShell";
import { cn, formatEnumName } from "@/lib/utils";
import { SkillIcon, errorText, field, panel, skillLabel } from "./common";

type Entry = { item: Item; recipe: Recipe };
type View = "craft" | "research" | "storage";
type RollKind = "craft" | "research";

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
const successes = (count: number) => `${count} ${count === 1 ? "success" : "successes"}`;

const RecipeFacts = ({ recipe }: { recipe: Recipe }) => {
  const tier = TIERS[recipe.tier];
  return <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-label-2">
    <span className="inline-flex items-center gap-1"><SkillIcon skill={recipe.skill} className="size-4" />{skillLabel(recipe.skill)}</span>
    <span>Tier {recipe.tier} · {formatEnumName(tier.minRank)}</span>
    <span>{tier.effort === 1 ? "1 per success" : `1 per ${tier.effort} successes`}</span>
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

const RecipeRow = ({ entry, children, actions }: { entry: Entry; children?: React.ReactNode; actions?: React.ReactNode }) =>
  <li className="flex flex-wrap items-center gap-3 py-3">
    <ItemImage imageFileName={entry.item.image} className="size-10 shrink-0" />
    <div className="min-w-0 flex-1 basis-56">
      <p className="font-semibold">{entry.item.name}</p>
      <RecipeFacts recipe={entry.recipe} />
      {children}
    </div>
    {actions}
  </li>;

/** Moves some of an inventory entry; the count stays within what is there. */
const MoveControl = ({ max, label, disabled, onMove }: { max: number; label: string; disabled: boolean; onMove: (quantity: number) => void }) => {
  const [count, setCount] = React.useState(1);
  React.useEffect(() => setCount(current => Math.min(Math.max(1, current), max)), [max]);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;
  return <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); if (valid) onMove(count); }}>
    <input type="number" min={1} max={max} value={count} onChange={event => setCount(Number(event.target.value))}
      className={cn(field, "w-18")} aria-label={`How many to ${label.toLowerCase()}`} />
    <button className={button({ variant: "tinted", size: "sm" })} disabled={disabled || !valid}>{label}</button>
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

const Storage = ({ city, trainers }: { city: City; trainers: Trainer[] }) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const [trainerId, setTrainerId] = React.useState(trainers[0]?.id ?? "");
  const trainer = trainers.find(entry => entry.id === trainerId);
  const move = useMutation({
    mutationFn: (body: CityInventoryBody) =>
      apiFetch<CityInventoryResult>({ url: `/cities/${encodeURIComponent(city.id)}/inventory`, method: "post", body }),
    onSuccess: (result, body) => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result.city));
      client.setQueryData<Trainer[]>(["trainers"], list => list?.map(entry => entry.id === result.trainer.id ? result.trainer : entry));
      client.invalidateQueries({ queryKey: ["trainers"] });
      toast({ title: body.direction === "deposit" ? `Stored in ${city.name}` : `Given to ${result.trainer.name || "your trainer"}` });
    },
    onError: (error: ApiFetchError) => toast({ title: "The items could not be moved", description: errorText(error) }),
  });
  const transfer = (entry: HydratedInventoryEntry, quantity: number, direction: CityInventoryBody["direction"]) =>
    trainer && move.mutate({ trainerId: trainer.id, entryId: entry.id, quantity, direction });

  return <div className="space-y-4">
    <p className="text-footnote text-label-2">Every member can store items here and take them out for their own trainers. Crafted items arrive here too.</p>
    {!trainers.length ? <p className="text-label-2">Create a trainer in Trainers to give or take items.</p> :
      <label className="flex max-w-sm flex-col gap-2">Your trainer
        <select className={field} value={trainerId} onChange={event => setTrainerId(event.target.value)}>
          {trainers.map(entry => <option key={entry.id} value={entry.id}>{entry.name || "Unnamed trainer"}</option>)}
        </select>
      </label>}
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-xl bg-fill p-3">
        <h3 className="font-semibold">{city.name} storage</h3>
        <InventoryList entries={city.inventory} empty="Nothing stored yet. Craft items or store some from a trainer."
          control={entry => trainer && <MoveControl max={entry.quantity} label="Take" disabled={move.isPending} onMove={quantity => transfer(entry, quantity, "withdraw")} />} />
      </section>
      {trainer && <section className="min-w-0 rounded-xl bg-fill p-3">
        <h3 className="font-semibold">{trainer.name || "Unnamed trainer"}'s bag</h3>
        <InventoryList entries={trainer.inventory} empty="This trainer carries no items."
          control={entry => <MoveControl max={entry.quantity} label="Store" disabled={move.isPending} onMove={quantity => transfer(entry, quantity, "deposit")} />} />
      </section>}
    </div>
  </div>;
};

/** Crafting tab of My City: what the city can craft and research now, and its storage (docs/crafting-plan.md). */
export const CityCrafting = ({ city, trainers }: { city: City; trainers: Trainer[] }) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const items = useReferenceItems();
  const [view, setView] = React.useState<View>("craft");
  const [query, setQuery] = React.useState("");
  const [skill, setSkill] = React.useState<CraftingSkill | "all">("all");
  const [showLocked, setShowLocked] = React.useState(false);
  const [shown, setShown] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const leader = city.members[0];
  const isLeader = !!me && me.email === leader;
  const state: CraftingCity = { rank: city.rank, skills: city.skills, catalysts: city.catalysts, research: city.research };
  const entries = React.useMemo(() => (items.data ?? []).map(item => ({ item, recipe: itemRecipe(item, ITEM_EXCEPTIONS[item.name]) })), [items.data]);
  const matches = (entry: Entry) => (skill === "all" || entry.recipe.skill === skill) && (!query || fold(entry.item.name).includes(fold(query)));
  const byTier = (a: Entry, b: Entry) => a.recipe.tier - b.recipe.tier || a.item.name.localeCompare(b.item.name);

  const roll = useMutation({
    mutationFn: ({ kind, itemId, faces }: { kind: RollKind; itemId: string; faces?: number[] }) =>
      apiFetch<CityCraftResult | CityResearchResult>({ url: `/cities/${encodeURIComponent(city.id)}/${kind}`, method: "post", body: { itemId, ...(faces && { faces }) } }),
    onSuccess: (result, { kind }) => {
      client.setQueryData<City[]>(["cities"], cities => replaceCity(cities, result.city));
      const name = entries.find(entry => entry.item.id === result.roll.itemId)?.item.name ?? "Item";
      const outcome = "quantity" in result.roll
        ? result.roll.quantity ? `Crafted ${result.roll.quantity} × ${name}` : `${successes(result.roll.successes)}: nothing crafted`
        : result.roll.unlocked ? `${name} unlocked!` : `${result.roll.steps} of ${result.roll.needed} steps`;
      setShown({ key: Date.now(), title: name, kind, dice: result.roll.pool, faces: result.roll.faces, result: outcome });
    },
    onError: (error: ApiFetchError) => toast({ title: "The roll could not be made", description: errorText(error) }),
  });

  const craftRows = entries.filter(matches).map(entry => ({ ...entry, blockers: craftBlockers(entry.recipe, state) }))
    .filter(row => showLocked || !row.blockers.length)
    .sort((a, b) => Number(a.blockers.length > 0) - Number(b.blockers.length > 0) || byTier(a, b));
  const craftableCount = entries.filter(entry => !craftBlockers(entry.recipe, state).length).length;
  const researchable = entries.filter(entry => entry.recipe.craftable && TIERS[entry.recipe.tier].research);
  const researchRows = researchable.filter(entry => matches(entry) && !isUnlocked(entry.recipe, city.research))
    .map(entry => ({ ...entry, blockers: researchBlockers(entry.recipe, state), steps: city.research[entry.item.id] ?? 0, needed: TIERS[entry.recipe.tier].research!.steps }))
    .filter(row => showLocked || !row.blockers.length)
    .sort((a, b) => Number(a.blockers.length > 0) - Number(b.blockers.length > 0) || Number(b.steps > 0) - Number(a.steps > 0) || byTier(a, b));
  const researchedCount = researchable.filter(entry => isUnlocked(entry.recipe, city.research)).length;
  const storedCount = city.inventory.reduce((total, entry) => total + entry.quantity, 0);
  const pending = roll.isPending;

  return <section className={`${panel} space-y-4`}>
    <div>
      <h2 className="text-title-3 font-semibold">Crafting</h2>
      <p className="mt-1 text-footnote text-label-2">
        The city crafts with its crafting skills: each roll uses the skill's dice, plus one die for every 3 points of an assist skill, and every 4, 5 or 6 is a success.
        Higher tiers need research first, and some recipes need a resident of the right type in Catalyst.
        {!isLeader && ` Only the city leader (${leader}) can roll crafts and research.`}
      </p>
    </div>
    <Segmented label="Crafting view" idPrefix="crafting" value={view} onChange={setView} options={[
      { value: "craft", label: `Craft · ${craftableCount}` },
      { value: "research", label: `Research · ${researchedCount}` },
      { value: "storage", label: `Storage · ${storedCount}` },
    ]} />
    <div {...segmentPanelProps("crafting", view)} className="space-y-3 outline-none" tabIndex={-1}>
      {view !== "storage" && <div className="flex flex-wrap items-center gap-2">
        <input type="search" className={cn(field, "sm:max-w-64")} placeholder="Search items" aria-label="Search items" value={query} onChange={event => setQuery(event.target.value)} />
        <select className={cn(field, "sm:w-48")} aria-label="Crafting skill" value={skill} onChange={event => setSkill(event.target.value as CraftingSkill | "all")}>
          <option value="all">All skills</option>
          {CRAFTING_SKILLS.map(entry => <option key={entry} value={entry}>{skillLabel(entry)} ({city.skills[entry]})</option>)}
        </select>
        <label className="inline-flex min-h-11 items-center gap-2 text-subhead lg:min-h-9">
          <input type="checkbox" checked={showLocked} onChange={event => setShowLocked(event.target.checked)} />Show locked recipes
        </label>
      </div>}
      {items.isError ? <p role="alert">The item list could not be loaded. <button type="button" className={button({ variant: "tinted", size: "sm" })} onClick={() => items.refetch()}>Try again</button></p> :
        !items.data ? <p role="status">Loading recipes...</p> :
        view === "craft" ? <>
          <p className="text-footnote text-label-2">{craftableCount} of {entries.filter(entry => entry.recipe.craftable).length} recipes can be crafted now.</p>
          {!craftRows.length ? <p className="text-label-2">{showLocked ? "No recipes match." : "Nothing matches that the city can craft yet. Turn on Show locked recipes to see what each one needs."}</p> :
            <ul className="divide-y divide-hairline">{craftRows.map(row => <RecipeRow key={row.item.id} entry={row}
              actions={isLeader && !row.blockers.length && <RollActions pool={craftPool(row.recipe, city.skills)} label="Craft" disabled={pending}
                onRoll={faces => roll.mutate({ kind: "craft", itemId: row.item.id, faces })} />}>
              <Blockers reasons={row.blockers} />
            </RecipeRow>)}</ul>}
        </> :
        view === "research" ? <>
          <p className="text-footnote text-label-2">Research rolls {dice(city.skills.research)} (the Research skill); each success is one step. Tier 1 and 2 recipes need none. {researchedCount} of {researchable.length} recipes are researched.</p>
          {!researchRows.length ? <p className="text-label-2">{showLocked ? "Nothing left to research that matches." : "Nothing the city can research yet matches. Turn on Show locked recipes to see what each one needs."}</p> :
            <ul className="divide-y divide-hairline">{researchRows.map(row => <RecipeRow key={row.item.id} entry={row}
              actions={isLeader && !row.blockers.length && <RollActions pool={city.skills.research} label="Research" disabled={pending}
                onRoll={faces => roll.mutate({ kind: "research", itemId: row.item.id, faces })} />}>
              <span className="mt-1.5 flex items-center gap-2">
                <span role="progressbar" aria-label={`${row.item.name} research`} aria-valuemin={0} aria-valuemax={row.needed} aria-valuenow={row.steps}
                  className="h-1.5 w-32 overflow-hidden rounded-full bg-fill"><span className="block h-full bg-tint" style={{ width: `${(row.steps / row.needed) * 100}%` }} /></span>
                <span className="text-footnote tabular-nums text-label-2">{row.steps} / {row.needed} steps</span>
              </span>
              <Blockers reasons={row.blockers} />
            </RecipeRow>)}</ul>}
        </> :
        <Storage city={city} trainers={trainers} />}
    </div>
    {shown && <DiceRoll key={shown.key} request={shown} onClose={() => setShown(null)} />}
  </section>;
};
