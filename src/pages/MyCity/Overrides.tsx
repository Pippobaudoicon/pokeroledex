import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Hammer, PawPrint, RotateCcw, SlidersHorizontal } from "lucide-react";
import * as React from "react";
import type { City, CityGrantsBody, Pokemon, PokemonTemplateSummary, ProfileSkill, SkillGrants } from "../../../shared/types";
import { GRANT_LIMIT, PROFILE_SKILLS } from "../../../shared/cities";
import { parseCraftKey, researchNeeds } from "../../../shared/crafting";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { fold, useDex } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RecipeForm, costText, useCraftEntries, type Entry } from "./Crafting";
import { SkillIcon, errorText, field, panel, skillLabel } from "./common";

type Step = { step: "kind" } | { step: "pokemon" } | { step: "item" } | { step: "grants"; templateId: string } | { step: "recipe"; itemId: string };
type Species = PokemonTemplateSummary;

const RESULTS = 40;

/** Every species the wizard can show: the Pokédex, plus the residents' species in case the Pokédex filter hides them. */
const useSpecies = (residents: Pokemon[]) => {
  const dex = useDex();
  return React.useMemo(() => {
    const byId = new Map<string, Species>(residents.map(resident => [resident.pokemonTemplateId, resident.pokemonTemplate]));
    for (const species of dex.data ?? []) byId.set(species.id, species);
    return { byId, list: dex.data ?? [], loading: dex.isPending };
  }, [dex.data, dex.isPending, residents]);
};

/**
 * What each species adds to each skill by default. The server works it out from every template, so it
 * matches what the grants endpoint compares against even when the Pokédex filter hides part of a line.
 */
const useGrantDefaults = (city: City, templateIds: string[]) => {
  const ids = [...new Set(templateIds)].sort();
  return useQuery({
    queryKey: ["grant-defaults", city.id, ids],
    queryFn: ({ signal }) => apiFetch<Record<string, SkillGrants>>({
      url: `/cities/${encodeURIComponent(city.id)}/grant-defaults`, method: "post", body: { templateIds: ids }, signal,
    }),
    enabled: ids.length > 0,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
};

/** e.g. "Technology 2 · Research 1", or "No skills". */
const grantsText = (grants: SkillGrants) =>
  PROFILE_SKILLS.filter(skill => grants[skill]).map(skill => `${skillLabel(skill)} ${grants[skill]}`).join(" · ") || "No skills";

const customBadge = <span className="ml-2 rounded-full bg-tint/10 px-2 py-0.5 text-caption font-semibold text-tint">Custom</span>;

const recipeText = (entry: Entry) => {
  const steps = researchNeeds(entry.recipe)?.steps ?? 0;
  return `${costText(entry.recipe)} · ${steps ? `${steps} research ${steps === 1 ? "step" : "steps"}` : "no research"}`;
};

const EntryImage = ({ entry }: { entry: Entry }) => parseCraftKey(entry.item.id).kind === "pokemon"
  ? <Sprite image={entry.item.image} set="box" className="h-9 w-11" />
  : <ItemImage imageFileName={entry.item.image} className="size-9" />;

/** The leader's override of what a species adds to each city skill, for every resident of it. */
const GrantsForm = ({ city, species, defaults, residents, onDone }: {
  city: City; species: Species; defaults: SkillGrants; residents: Pokemon[]; onDone: () => void;
}) => {
  const client = useQueryClient();
  const { toast } = useToast();
  const override = city.grants?.[species.id];
  const [values, setValues] = React.useState<Record<ProfileSkill, number>>(() =>
    Object.fromEntries(PROFILE_SKILLS.map(skill => [skill, (override ?? defaults)[skill] ?? 0])) as Record<ProfileSkill, number>);
  const save = useMutation({
    mutationFn: (body: CityGrantsBody) => apiFetch<City>({ url: `/cities/${encodeURIComponent(city.id)}/grants`, method: "post", body }),
    onSuccess: (result, body) => {
      client.setQueryData<City[]>(["cities"], cities => cities?.map(entry => entry.id === result.id ? result : entry));
      toast({ title: body.grants && result.grants[species.id] ? `${species.name} updated` : `${species.name} reset to its species' skills` });
      onDone();
    },
    onError: (error: ApiFetchError) => toast({ title: "The skills could not be saved", description: errorText(error) }),
  });
  const valid = PROFILE_SKILLS.every(skill => Number.isInteger(values[skill]) && values[skill] >= 0 && values[skill] <= GRANT_LIMIT);
  const living = residents.filter(resident => resident.pokemonTemplateId === species.id);
  const working = (skill: ProfileSkill) => living.filter(resident => city.assignments[resident.id] === `skill:${skill}`).length;
  const closing = PROFILE_SKILLS.filter(skill => values[skill] === 0 && working(skill) > 0);
  return <form className="flex flex-col gap-4" onSubmit={event => {
    event.preventDefault();
    if (valid) save.mutate({ templateId: species.id, grants: Object.fromEntries(PROFILE_SKILLS.filter(skill => values[skill]).map(skill => [skill, values[skill]])) });
  }}>
    <div className="flex items-center gap-3">
      <Sprite image={species.image} set="box" className="h-12 w-14 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{species.name}</p>
        <p className="text-footnote text-label-2">
          {living.length ? `${living.length} in ${city.name}` : `None in ${city.name} yet`}{override ? " · Custom skills" : ""}
        </p>
      </div>
    </div>
    <p className="text-footnote text-label-2">
      What every {species.name} adds to each skill while it works there, in {city.name} only, including any that move in later.
      Skills at 0 are closed to it. City skills still stop at {city.limits.skill}; Catalyst and actions are not affected.
    </p>
    <ul className="grid gap-2 sm:grid-cols-2">
      {PROFILE_SKILLS.map(skill => {
        const value = values[skill];
        const ok = Number.isInteger(value) && value >= 0 && value <= GRANT_LIMIT;
        const count = working(skill);
        return <li key={skill}>
          <label className="flex items-center gap-2 rounded-xl bg-fill px-3 py-1.5">
            <SkillIcon skill={skill} className="size-4" />
            <span className="flex-1 text-subhead">{skillLabel(skill)}
              <span className="text-label-2"> (default {defaults[skill] ?? 0})</span>
              {count > 0 && <span className="text-label-2"> · {count} working</span>}
            </span>
            <input type="number" inputMode="numeric" min={0} max={GRANT_LIMIT} value={value} aria-label={`${skillLabel(skill)} grant`}
              onChange={event => setValues(current => ({ ...current, [skill]: Number(event.target.value) }))}
              className={cn(field, "w-18 bg-surface text-center tabular-nums", !ok && "text-red-500")} />
          </label>
        </li>;
      })}
    </ul>
    {closing.length > 0 && <p role="status" className="text-footnote text-label-2">
      Once saved, any {species.name} working {closing.map(skillLabel).join(" or ")} stops, since it no longer adds to it.
    </p>}
    <div className="flex flex-wrap gap-2">
      <button className={button({ variant: "filled" })} disabled={!valid || save.isPending}>Save</button>
      {override && <button type="button" className={button({ variant: "gray" })} disabled={save.isPending}
        onClick={() => save.mutate({ templateId: species.id, grants: null })}>
        <RotateCcw aria-hidden className="size-4" />Reset to species
      </button>}
      <button type="button" className={button({ variant: "plain" })} onClick={onDone}>Cancel</button>
    </div>
  </form>;
};

const SpeciesRow = ({ city, species, defaults, onClick }: { city: City; species: Species; defaults?: SkillGrants; onClick?: () => void }) =>
  <Row icon={<Sprite image={species.image} set="box" className="h-9 w-11" />}
    title={<>{species.name}{city.grants?.[species.id] && customBadge}</>}
    subtitle={city.grants?.[species.id] ? grantsText(city.grants[species.id]) : defaults ? grantsText(defaults) : "…"} onClick={onClick} />

/** Wizard: choose a species or a recipe, then change what it grants or costs in this city. */
const OverrideWizard = ({ city, residents, entries, step, onStep, open, onOpenChange }: {
  city: City; residents: Pokemon[]; entries: Entry[]; step: Step; onStep: (step: Step) => void; open: boolean; onOpenChange: (open: boolean) => void;
}) => {
  const [query, setQuery] = React.useState("");
  React.useEffect(() => { if (open) setQuery(""); }, [open, step.step]);
  const species = useSpecies(residents);
  const close = () => onOpenChange(false);
  const back: Step | null = step.step === "pokemon" || step.step === "item" ? { step: "kind" }
    : step.step === "grants" ? { step: "pokemon" } : step.step === "recipe" ? { step: "item" } : null;
  const chosen = step.step === "grants" ? species.byId.get(step.templateId) : undefined;
  const entry = step.step === "recipe" ? entries.find(candidate => candidate.item.id === step.itemId) : undefined;
  const title = step.step === "kind" ? "New override" : step.step === "pokemon" ? "Choose a Pokémon" : step.step === "item" ? "Choose an item"
    : step.step === "grants" ? `Skills · ${chosen?.name ?? "Pokémon"}` : `Costs · ${entry?.item.name ?? "Item"}`;
  const craftable = entries.filter(candidate => candidate.base.craftable && (!query || fold(candidate.item.name).includes(fold(query))));
  const sorted = [...craftable.filter(candidate => city.recipes?.[candidate.item.id]), ...craftable.filter(candidate => !city.recipes?.[candidate.item.id])];
  // Without a search the city's own species are listed; a search looks through the whole Pokédex.
  const local = [...new Set(residents.map(resident => resident.pokemonTemplateId))].flatMap(id => species.byId.get(id) ?? []);
  const matches = query ? species.list.filter(candidate => fold(candidate.name).includes(fold(query))) : [];
  const pick = (candidate: Species) => () => onStep({ step: "grants", templateId: candidate.id });
  const shown = step.step === "pokemon" ? (query ? matches.slice(0, RESULTS) : local) : [];
  const defaults = useGrantDefaults(city, open ? [...shown.map(candidate => candidate.id), ...(step.step === "grants" ? [step.templateId] : [])] : []);
  const row = (candidate: Species) =>
    <SpeciesRow key={candidate.id} city={city} species={candidate} defaults={defaults.data?.[candidate.id]} onClick={pick(candidate)} />;
  const chosenDefaults = chosen ? defaults.data?.[chosen.id] : undefined;

  return <Sheet open={open} onOpenChange={onOpenChange} title={title} initialExpanded>
    <div className="flex flex-col gap-4 p-4">
      {back && <button type="button" className={cn(button({ variant: "plain", size: "sm" }), "self-start -ml-2")} onClick={() => onStep(back)}>
        <ChevronLeft aria-hidden className="size-4" />Back
      </button>}
      {step.step === "kind" && <>
        <p className="text-footnote text-label-2">Overrides change the rules for {city.name} only. Choose what to change.</p>
        <Group>
          <Row icon={<PawPrint className="size-5 text-tint" />} title="A Pokémon" subtitle="Which skills a species adds to, and how much to each"
            onClick={() => onStep({ step: "pokemon" })} />
          <Row icon={<Hammer className="size-5 text-tint" />} title="An item" subtitle="The skills one craft uses and the research steps it needs"
            onClick={() => onStep({ step: "item" })} />
        </Group>
      </>}
      {(step.step === "pokemon" || step.step === "item") && <input type="search" value={query} onChange={event => setQuery(event.target.value)}
        className={field} placeholder={step.step === "pokemon" ? "Search the Pokédex" : "Search items"} aria-label={step.step === "pokemon" ? "Search the Pokédex" : "Search items"} />}
      {step.step === "pokemon" && (query
        ? species.loading ? <p role="status">Loading the Pokédex...</p>
          : !matches.length ? <p className="text-label-2">No Pokémon matches.</p>
          : <Group footer={matches.length > RESULTS ? `Showing ${RESULTS} of ${matches.length}. Keep typing to narrow them down.` : undefined}>
            {shown.map(row)}
          </Group>
        : <>
          <p className="text-footnote text-label-2">Search for any species, even one {city.name} doesn't have yet: its override applies once one moves in.</p>
          {local.length > 0 && <Group title={`In ${city.name}`}>{local.map(row)}</Group>}
        </>)}
      {step.step === "item" && (!entries.length ? <p role="status">Loading items...</p>
        : !sorted.length ? <p className="text-label-2">No craftable item matches.</p>
        : <Group footer={sorted.length > RESULTS ? `Showing ${RESULTS} of ${sorted.length}. Search to narrow them down.` : undefined}>
          {sorted.slice(0, RESULTS).map(candidate => <Row key={candidate.item.id} icon={<EntryImage entry={candidate} />}
            title={<>{candidate.item.name}{city.recipes?.[candidate.item.id] && customBadge}</>}
            subtitle={recipeText(candidate)} onClick={() => onStep({ step: "recipe", itemId: candidate.item.id })} />)}
        </Group>)}
      {step.step === "grants" && (chosen && chosenDefaults
        ? <GrantsForm key={chosen.id} city={city} species={chosen} defaults={chosenDefaults} residents={residents} onDone={close} />
        : <p role="status">{species.loading || defaults.isFetching ? "Loading the species..." : defaults.isError ? "Its default skills could not be loaded." : "That species isn't in the Pokédex."}</p>)}
      {step.step === "recipe" && (entry ? <RecipeForm key={entry.item.id} city={city} entry={entry} onDone={close} />
        : <p role="status">Loading items...</p>)}
    </div>
  </Sheet>;
};

/** Overview card: the city's overrides, and for the leader the wizard to add or change them. */
export const CityOverrides = ({ city, residents, isLeader }: { city: City; residents: Pokemon[]; isLeader: boolean }) => {
  const entries = useCraftEntries(city);
  const species = useSpecies(residents);
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>({ step: "kind" });
  const start = (next: Step) => { setStep(next); setOpen(true); };
  const overridden = Object.keys(city.grants ?? {});
  const items = Object.keys(city.recipes ?? {}).flatMap(id => {
    const entry = entries.find(candidate => candidate.item.id === id);
    return entry ? [entry] : [];
  });
  const count = overridden.length + Object.keys(city.recipes ?? {}).length;
  return <section className={panel} aria-labelledby="city-overrides">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="city-overrides" className="flex items-center gap-2 text-headline font-semibold">
        <SlidersHorizontal aria-hidden className="size-5 text-tint" />Overrides
        <span className="text-footnote font-normal text-label-2">{count}</span>
      </h2>
      {isLeader && <button type="button" className={button({ variant: "tinted", size: "sm" })} onClick={() => start({ step: "kind" })}>
        <SlidersHorizontal aria-hidden className="size-4" />New override
      </button>}
    </div>
    <p className="mt-1 mb-3 text-footnote text-label-2">
      {city.name}'s own rules: what a Pokémon species adds to each skill, and what an item costs to craft and research.
      {!isLeader && ` Only the city leader (${city.members[0]}) can change them.`}
    </p>
    {!count ? <p className="text-label-2">No overrides yet; every Pokémon and item follows the default rules.</p> : <div className="flex flex-col gap-3">
      {overridden.length > 0 && <Group title="Pokémon">
        {overridden.map(id => {
          const found = species.byId.get(id);
          const onClick = isLeader ? () => start({ step: "grants", templateId: id }) : undefined;
          return found
            ? <Row key={id} icon={<Sprite image={found.image} set="box" className="h-9 w-11" />} title={found.name}
              subtitle={grantsText(city.grants[id])} onClick={onClick} />
            : <Row key={id} title={species.loading ? "Loading..." : "Unknown species"} subtitle={grantsText(city.grants[id])} onClick={onClick} />;
        })}
      </Group>}
      {Object.keys(city.recipes ?? {}).length > 0 && <Group title="Items">
        {!items.length ? <Row title="Loading items..." /> : items.map(entry => <Row key={entry.item.id} icon={<EntryImage entry={entry} />}
          title={entry.item.name} subtitle={recipeText(entry)}
          onClick={isLeader ? () => start({ step: "recipe", itemId: entry.item.id }) : undefined} />)}
      </Group>}
    </div>}
    {isLeader && <OverrideWizard city={city} residents={residents} entries={entries} step={step} onStep={setStep} open={open} onOpenChange={setOpen} />}
  </section>;
};
