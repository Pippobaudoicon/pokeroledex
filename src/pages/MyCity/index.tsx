import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus, Tag } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CITY_SKILLS, CRAFTING_SKILLS, POKEMON_TYPES, RANKS, SUPPORT_SKILLS, type Campaign, type City, type CityAssignment, type CityBody, type CitySkill, type NamedEntry, type Pokemon, type ProfileSkill, type Rank, type Trainer, type UpdatePokemonBody } from "../../../shared/types";
import { cityLimits, cityRankGroups, cityValues, type ResidentWork } from "../../../shared/cities";
import { canWork, workBonus } from "../../../shared/crafting";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { Picker } from "@/components/kit/Picker";
import { RankBadge, RankBall, TypePill } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { PokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/layout/AppShell";
import { cn, formatEnumName } from "@/lib/utils";
import { CityCrafting } from "./Crafting";
import { SkillHelp } from "./SkillHelp";
import { SkillIcon, errorText, field, panel, skillLabel } from "./common";

/** What cityValues needs per resident: the city's bonus and profile, and the species' types. */
const residentWork = (city: City, residents: Pokemon[]): Record<string, ResidentWork> =>
  Object.fromEntries(residents.map(resident => [resident.id, { bonus: city.bonuses[resident.id] ?? 0, profile: city.profiles[resident.id] ?? {}, types: resident.pokemonTemplate.types }]));
type Change =
  | { kind: "create"; name: string }
  | { kind: "settings"; id: string; body: CityBody }
  | { kind: "delete"; id: string }
  | { kind: "invite"; id: string; email: string }
  | { kind: "remove"; id: string; email: string }
  | { kind: "assign"; body: UpdatePokemonBody }
  | { kind: "add"; cityId: string; pokemonTemplateId: string; rank: Rank };

function useCityChange() {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (change: Change): Promise<{ id: string }> => {
      switch (change.kind) {
        case "create": return apiFetch<City>({ url: "/cities", method: "post", body: { name: change.name } });
        case "settings": return apiFetch<City>({ url: `/cities/${encodeURIComponent(change.id)}`, method: "patch", body: change.body });
        case "delete": return apiFetch<{ id: string; left?: boolean }>({ url: `/cities/${encodeURIComponent(change.id)}`, method: "delete" });
        case "invite": return apiFetch<City>({ url: `/cities/${encodeURIComponent(change.id)}/members`, method: "post", body: { email: change.email } });
        case "remove": return apiFetch<City>({ url: `/cities/${encodeURIComponent(change.id)}/members/${encodeURIComponent(change.email)}`, method: "delete" });
        case "assign": return apiFetch<Pokemon>({ url: "/pokemon", method: "patch", body: change.body });
        case "add": return apiFetch<Pokemon>({ url: "/pokemon", method: "post", body: { cityId: change.cityId, pokemonTemplateId: change.pokemonTemplateId, rank: change.rank } });
      }
    },
    onSuccess: async () => {
      await Promise.all(["cities", "pokemon", "trainers"].map(key => client.invalidateQueries({ queryKey: [key], refetchType: "all" })));
      toast({ title: "City changes saved" });
    },
    onError: (error: ApiFetchError) => toast({ title: "City changes could not be saved", description: errorText(error) }),
  });
}

/** Moves one resident to a skill, an action or back to unassigned, updating the page before the server answers. */
function useCityWork(city: City, residents: Pokemon[]) {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ pokemonId, target }: { pokemonId: string; target: CityAssignment | null }) =>
      apiFetch<City>({ url: `/cities/${encodeURIComponent(city.id)}`, method: "patch", body: { assignments: { [pokemonId]: target } } satisfies CityBody }),
    onMutate: async ({ pokemonId, target }) => {
      await client.cancelQueries({ queryKey: ["cities"] });
      const previous = client.getQueryData<City[]>(["cities"]);
      client.setQueryData<City[]>(["cities"], cities => cities?.map(entry => {
        if (entry.id !== city.id) return entry;
        const { [pokemonId]: _old, ...assignments } = entry.assignments;
        if (target) assignments[pokemonId] = target;
        return { ...entry, assignments, ...cityValues(entry.rank, entry.tags, assignments, residentWork(entry, residents)) };
      }));
      return { previous };
    },
    onError: (error: ApiFetchError, _change, context) => {
      if (context?.previous) client.setQueryData(["cities"], context.previous);
      toast({ title: "The assignment could not be saved", description: errorText(error) });
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["cities"] }),
  });
}

const CreateCity = () => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const change = useCityChange();
  const navigate = useNavigate();
  return <>
    <button type="button" onClick={() => setOpen(true)} className={button({ variant: "tinted" })}><Plus aria-hidden className="size-4" />New city</button>
    <Sheet open={open} onOpenChange={setOpen} title="New city" initialExpanded>
      <form className="space-y-4 p-4" onSubmit={event => {
        event.preventDefault();
        change.mutate({ kind: "create", name: name.trim() }, { onSuccess: result => {
          setOpen(false);
          setName("");
          navigate(`/myCity/${result.id}`);
        } });
      }}>
        <label className="flex flex-col gap-2">City name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={field} /></label>
        <button disabled={!name.trim() || change.isPending} className={button({ variant: "filled" })}>Create city</button>
      </form>
    </Sheet>
  </>;
};

const AddPokemon = ({ city, pokemon, cities }: { city: City; pokemon: Pokemon[]; cities: City[] }) => {
  const [open, setOpen] = React.useState(false);
  const [source, setSource] = React.useState<"existing" | "new">("existing");
  const [selected, setSelected] = React.useState("");
  const [species, setSpecies] = React.useState("");
  const [rank, setRank] = React.useState<Rank>("UNRANKED");
  const change = useCityChange();
  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: ({ signal }) => apiFetch<Campaign[]>({ url: "/campaigns", method: "get", signal }),
    enabled: open,
  });
  const campaignIds = campaigns.data?.map(campaign => campaign.id);
  const templates = useQuery({
    queryKey: ["pokemon-templates", "names", campaignIds],
    queryFn: ({ signal }) => apiFetch<NamedEntry[]>({ url: "/pokemon-templates/names", method: "post", body: { includeCore: true, campaignIds }, signal }),
    enabled: open && !!campaignIds,
  });
  const candidates = pokemon.filter(entry => entry.cityId !== city.id);
  const failed = campaigns.isError || templates.isError;
  const full = pokemon.filter(entry => entry.cityId === city.id).length >= city.limits.residents;
  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={full} title={full ? `${city.name} is full for its rank` : undefined} className={button({ variant: "filled" })}><Plus aria-hidden className="size-4" />Add Pokémon</button>
    <Sheet open={open} onOpenChange={setOpen} title={`Add to ${city.name}`} initialExpanded>
      <form className="space-y-4 p-4" onSubmit={event => {
        event.preventDefault();
        change.mutate(source === "new"
          ? { kind: "add", cityId: city.id, pokemonTemplateId: species, rank }
          : { kind: "assign", body: { id: selected, cityId: city.id } }, {
          onSuccess: () => { setOpen(false); setSelected(""); setSpecies(""); },
        });
      }}>
        <label className="flex flex-col gap-2">Source
          <select className={field} value={source} onChange={event => setSource(event.target.value === "new" ? "new" : "existing")}>
            <option value="existing">My Pokémon / trainers / cities</option><option value="new">New Pokémon from the Pokédex</option>
          </select>
        </label>
        {source === "existing" ? <>
          <Picker label="Pokémon" value={selected} onChange={setSelected} items={candidates.map(entry => ({
            value: entry.id, label: `${entry.nickname || entry.pokemonTemplate.name} - ${formatEnumName(entry.rank)}`,
            detail: entry.trainer?.name ? `Trainer: ${entry.trainer.name}` : entry.cityId ? `City: ${cities.find(city => city.id === entry.cityId)?.name ?? entry.cityId}` : "Unassigned",
          }))} />
          <p className="text-footnote text-label-2">Moves the original sheet here, removing its previous trainer or city assignment. No copy is made.</p>
          {!candidates.length && <p>No Pokémon available. Choose a new Pokémon from the Pokédex instead.</p>}
        </> : <>
          {failed ? <div role="alert"><p>The Pokédex could not be loaded.</p><button type="button" className={button({ variant: "tinted" })} onClick={() => { campaigns.refetch(); templates.refetch(); }}>Try again</button></div> :
            <Picker label="Species" value={species} onChange={setSpecies} loading={!templates.data} items={(templates.data ?? []).map(entry => ({ value: entry.id, label: entry.name, detail: entry.campaignName ?? "Core" }))} />}
          <label className="flex flex-col gap-2">Rank<select className={field} value={rank} onChange={event => setRank(event.target.value as Rank)}>
            {RANKS.map(rank => <option key={rank} value={rank}>{formatEnumName(rank)}</option>)}
          </select></label>
          <p className="text-footnote text-label-2">Creates a city resident, not a personal Pokémon. Edit its stats and moves from the city roster.</p>
        </>}
        <button disabled={change.isPending || (source === "new" ? !species || failed : !selected)} className={button({ variant: "filled" })}>Add to city</button>
      </form>
    </Sheet>
  </>;
};

const CitySettings = ({ city, residentCount }: { city: City; residentCount: number }) => {
  const [name, setName] = React.useState(city.name);
  const [rank, setRank] = React.useState(city.rank);
  const [tags, setTags] = React.useState(city.tags);
  const [tag, setTag] = React.useState("");
  const change = useCityChange();
  const navigate = useNavigate();
  return <div className="space-y-5">
    <form className={`${panel} space-y-5`} onSubmit={event => {
      event.preventDefault();
      change.mutate({ kind: "settings", id: city.id, body: { name, rank, tags } });
    }}>
      <h2 className="text-title-3 font-semibold">City settings</h2>
      <label className="flex flex-col gap-2">City name<input required maxLength={100} className={field} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="flex flex-col gap-2">City rank
        <select className={field} value={rank} onChange={event => setRank(event.target.value as Rank)}>
          {RANKS.map(option => {
            const limits = cityLimits(option);
            return <option key={option} value={option} disabled={limits.residents < residentCount}>
              {formatEnumName(option)} · up to {limits.residents} residents, skills up to {limits.skill}
            </option>;
          })}
        </select>
      </label>
      <p className="text-footnote text-label-2">Ranks that cannot hold the current {residentCount} residents are unavailable.</p>
      <div className="space-y-3">
        <h3 className="font-semibold">Custom actions</h3>
        <p className="text-footnote text-label-2">Describe capabilities such as Can heal or Can produce food, then assign residents to them like skills. Removing an action unassigns its residents.</p>
        <div className="space-y-2">{tags.map(value => <div key={value} className="flex items-center gap-2">
          <span className="flex-1">{value}</span>
          <button type="button" aria-label={`Remove action ${value}`} className={button({ variant: "tinted", size: "sm" })} onClick={() => setTags(tags.filter(tag => tag !== value))}>Remove ×</button>
        </div>)}</div>
        <div className="flex gap-2">
          <input aria-label="New action" maxLength={80} className={field} value={tag} onChange={event => setTag(event.target.value)} placeholder="Can heal" />
          <button type="button" disabled={!tag.trim() || tags.length >= 50} className={button({ variant: "gray" })} onClick={() => { setTags([...new Set([...tags, tag.trim()])]); setTag(""); }}>Add action</button>
        </div>
      </div>
      <button disabled={change.isPending || !name.trim()} className={button({ variant: "filled" })}>Save city</button>
    </form>
    <div className={panel}>
      {city.members.length > 1 ? <>
        <p className="mb-3 text-subhead text-label-2">The other members keep this city and its residents. You can come back only if one of them invites you again.</p>
        <button type="button" disabled={change.isPending} className={button({ variant: "gray" })} onClick={() => {
          if (window.confirm(`Leave ${city.name}?`)) change.mutate({ kind: "delete", id: city.id }, { onSuccess: () => navigate("/myCity") });
        }}>Leave city</button>
      </> : <>
        <p className="mb-3 text-subhead text-label-2">Before deleting this city, move every resident to another city or assign it to yourself. Residents cannot simply be removed.</p>
        <button type="button" disabled={change.isPending || residentCount > 0} className={button({ variant: "gray" })} onClick={() => {
          if (window.confirm(`Delete ${city.name}?`)) change.mutate({ kind: "delete", id: city.id }, { onSuccess: () => navigate("/myCity") });
        }}>Delete city</button>
      </>}
    </div>
  </div>;
};

const CityMembers = ({ city }: { city: City }) => {
  const [email, setEmail] = React.useState("");
  const change = useCityChange();
  const me = useMe().data?.email;
  const leader = city.members[0];
  return <section className={`${panel} space-y-4`}>
    <h2 className="text-title-3 font-semibold">Members</h2>
    <p className="text-subhead text-label-2">Everyone in the city can see, add and take its residents and edit its skills. Invite friends with the email they log in with. The leader can remove members; their residents stay in the city.</p>
    <ul className="divide-y divide-hairline">
      {city.members.map(member => <li key={member} className="flex items-center gap-2 py-2">
        <span className="flex-1 break-all">{member}{member === leader && <span className="text-label-2"> (leader)</span>}{member === me && <span className="text-label-2"> (you)</span>}</span>
        {leader === me && member !== me && <button type="button" disabled={change.isPending} className={button({ variant: "tinted", size: "sm" })} onClick={() => {
          if (window.confirm(`Remove ${member} from ${city.name}?`)) change.mutate({ kind: "remove", id: city.id, email: member });
        }}>Remove</button>}
      </li>)}
    </ul>
    <form className="flex gap-2" onSubmit={event => {
      event.preventDefault();
      change.mutate({ kind: "invite", id: city.id, email: email.trim() }, { onSuccess: () => setEmail("") });
    }}>
      <input type="email" required maxLength={254} aria-label="Friend's email" placeholder="friend@example.com" className={field} value={email} onChange={event => setEmail(event.target.value)} />
      <button disabled={!email.trim() || change.isPending} className={button({ variant: "tinted" })}>Invite</button>
    </form>
  </section>;
};

const TransferPokemon = ({ pokemon, cities, trainers, allPokemon }: { pokemon: Pokemon; cities: City[]; trainers: Trainer[]; allPokemon: Pokemon[] }) => {
  const [destination, setDestination] = React.useState("");
  const change = useCityChange();
  return <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
    event.preventDefault();
    const [kind, id] = destination.split(":");
    change.mutate({ kind: "assign", body: { id: pokemon.id, ...(kind === "city" ? { cityId: id } : kind === "personal" ? { takeOwnership: true } : { trainerId: id }) } });
  }}>
    <select aria-label={`Destination for ${pokemon.nickname || pokemon.pokemonTemplate.name}`} required value={destination} className={`${field} sm:max-w-60`} onChange={event => setDestination(event.target.value)}>
      <option value="">Choose destination</option>
      <option value="personal">Assign to me (My Pokémon)</option>
      {trainers.map(trainer => <option key={trainer.id} value={`trainer:${trainer.id}`}>Trainer: {trainer.name}</option>)}
      {cities.filter(city => city.id !== pokemon.cityId).map(city => {
        const full = allPokemon.filter(entry => entry.cityId === city.id).length >= city.limits.residents;
        return <option key={city.id} value={`city:${city.id}`} disabled={full}>City: {city.name}{full ? " (full)" : ""}</option>;
      })}
    </select>
    <button disabled={!destination || change.isPending} className={button({ variant: "tinted", size: "sm" })}>Move</button>
  </form>;
};

type WorkTarget = CityAssignment | "unassigned";
const targetLabel = (target: WorkTarget) =>
  target === "unassigned" ? "Unassigned" : target.startsWith("skill:") ? skillLabel(target.slice(6) as CitySkill) : target.slice(4);

/** Drag residents (or tap one, then a skill) to choose the skill or action each one works on. */
const CityWorkBoard = ({ city, residents }: { city: City; residents: Pokemon[] }) => {
  const work = useCityWork(city, residents);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<{ id: string; x: number; y: number; over: WorkTarget | null } | null>(null);
  const press = React.useRef<{ id: string; x: number; y: number; dragged: boolean; clientY?: number } | null>(null);
  const allowed = (id: string, target: WorkTarget) => !target.startsWith("skill:") || canWork(city.profiles[id] ?? {}, target.slice(6) as CitySkill);
  /** What a resident adds where it works: half bonus on half skills; Catalyst shows its strength. */
  const contribution = (id: string, target: WorkTarget) => {
    const bonus = city.bonuses[id] ?? 0;
    return target.startsWith("skill:") && target !== "skill:catalyst" ? workBonus(bonus, city.profiles[id]?.[target.slice(6) as ProfileSkill]) : bonus;
  };
  const totals = new Map<WorkTarget, number>();
  for (const [id, target] of Object.entries(city.assignments)) totals.set(target, (totals.get(target) ?? 0) + contribution(id, target));
  const groups: [string, WorkTarget[]][] = [
    ["Crafting skills", CRAFTING_SKILLS.map(skill => `skill:${skill}` as const)],
    ["Support skills", SUPPORT_SKILLS.map(skill => `skill:${skill}` as const)],
    ["Actions", city.tags.map(tag => `tag:${tag}` as const)],
  ];
  const placed = (target: WorkTarget) => residents.filter(resident => (city.assignments[resident.id] ?? "unassigned") === target);
  const name = (resident: Pokemon) => resident.nickname || resident.pokemonTemplate.name;

  const move = (id: string, target: WorkTarget) => {
    setSelected(null);
    if (!allowed(id, target)) return;
    if ((city.assignments[id] ?? "unassigned") !== target) work.mutate({ pokemonId: id, target: target === "unassigned" ? null : target });
  };
  const targetAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-city-target]")?.dataset.cityTarget ?? null) as WorkTarget | null;

  React.useEffect(() => {
    if (!selected) return;
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) setSelected(null); };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [selected]);

  // Scroll the page while a dragged resident is held near the top or bottom edge.
  const dragging = !!drag;
  React.useEffect(() => {
    if (!dragging) return;
    let frame = requestAnimationFrame(function step() {
      const pointer = press.current;
      if (pointer?.dragged && pointer.clientY !== undefined) {
        const edge = 72;
        const y = pointer.clientY;
        const speed = y < edge ? -(edge - y) / 4 : y > window.innerHeight - edge ? (y - window.innerHeight + edge) / 4 : 0;
        if (speed) {
          window.scrollBy(0, speed);
          setDrag(current => current && { ...current, over: targetAt(current.x, current.y) });
        }
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  const chip = (resident: Pokemon) => {
    const current = city.assignments[resident.id] ?? "unassigned";
    const bonus = contribution(resident.id, current);
    const half = current.startsWith("skill:") && city.profiles[resident.id]?.[current.slice(6) as ProfileSkill] === "half";
    return <button key={resident.id} type="button" draggable={false} aria-pressed={selected === resident.id}
      aria-label={`${name(resident)}${resident.shiny ? " (shiny)" : ""}, +${bonus}${half ? " (half bonus)" : ""}, ${targetLabel(current)}. ${selected === resident.id ? "Selected: choose where it works." : "Select to move."}`}
      className={cn("relative flex w-18 touch-none select-none flex-col items-center gap-0.5 rounded-xl bg-surface p-1 text-caption shadow-card outline-none focus-visible:outline-2 focus-visible:outline-focus cursor-grab",
        selected === resident.id ? "ring-2 ring-tint" : resident.shiny && shinyRing, drag?.id === resident.id && "opacity-40")}
      onPointerDown={event => {
        if (event.button !== 0) return;
        window.getSelection()?.removeAllRanges();
        // Capture at once so a fast flick that leaves the chip still drags it.
        event.currentTarget.setPointerCapture(event.pointerId);
        press.current = { id: resident.id, x: event.clientX, y: event.clientY, dragged: false };
      }}
      onDragStart={event => event.preventDefault()}
      onPointerMove={event => {
        const start = press.current;
        if (!start || start.id !== resident.id) return;
        if (!start.dragged && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
        if (!start.dragged) {
          start.dragged = true;
          setSelected(null);
        }
        start.clientY = event.clientY;
        setDrag({ id: resident.id, x: event.clientX, y: event.clientY, over: targetAt(event.clientX, event.clientY) });
      }}
      onPointerUp={event => {
        if (press.current?.dragged) {
          const target = targetAt(event.clientX, event.clientY);
          if (target) move(resident.id, target);
        }
        setDrag(null);
      }}
      onPointerCancel={() => { press.current = null; setDrag(null); }}
      onClick={() => {
        if (press.current?.dragged) { press.current = null; return; }
        press.current = null;
        setSelected(selected === resident.id ? null : resident.id);
      }}>
      <Sprite image={resident.pokemonTemplate.image} set="box" className="h-10 w-12 pointer-events-none" />
      <span className="w-full truncate text-center">{name(resident)}</span>
      <span className={cn("absolute -top-1.5 -right-1.5 rounded-full px-1.5 text-caption font-semibold tabular-nums", half ? "bg-tint/25 text-tint" : "bg-tint text-on-tint")}
        title={half ? "Half bonus: this species is only partly suited to this skill." : undefined}>+{bonus}</span>
    </button>;
  };

  const active = drag?.id ?? selected;
  const zone = (target: WorkTarget, header: React.ReactNode) => {
    const members = placed(target);
    const blocked = !!active && !allowed(active, target);
    const activeName = active ? name(residents.find(resident => resident.id === active)!) : "";
    return <div key={target} data-city-target={target}
      className={cn("flex min-w-0 flex-col gap-2 rounded-xl bg-fill p-3 transition-[box-shadow,opacity]",
        blocked ? "opacity-40" : [drag?.over === target && "ring-2 ring-tint", selected && "ring-1 ring-tint/40"])}>
      <div className="flex items-center gap-2">
        {target.startsWith("skill:") ? <SkillHelp skill={target.slice(6) as CitySkill} limit={city.limits.skill} />
          : target.startsWith("tag:") && <Tag aria-hidden className="size-5 shrink-0 text-tint" />}
        <button type="button" disabled={!selected || blocked} onClick={() => selected && move(selected, target)}
          aria-label={blocked ? `${activeName} cannot work ${targetLabel(target)}` : selected ? `Move ${activeName} to ${targetLabel(target)}` : targetLabel(target)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left font-semibold outline-none focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default">
          {header}
        </button>
      </div>
      <div className="flex min-h-14 flex-wrap gap-2">
        {members.map(chip)}
        {!members.length && <span className="self-center text-footnote text-label-2">{target === "unassigned" ? "Every resident is working." : "Drop a Pokémon here"}</span>}
      </div>
    </div>;
  };

  const value = (target: WorkTarget) => {
    if (target === "skill:catalyst") {
      const types = POKEMON_TYPES.filter(type => city.catalysts[type]);
      return <span className="ml-auto flex flex-wrap justify-end gap-1">
        {types.map(type => <span key={type} title={`${formatEnumName(type)}: strength ${city.catalysts[type]}`}><TypePill type={type} size="sm" /></span>)}
        {!types.length && <span className="text-footnote font-normal text-label-2">No types</span>}
      </span>;
    }
    const total = totals.get(target) ?? 0;
    return <span className="ml-auto shrink-0 text-footnote tabular-nums text-label-2" title={total > city.limits.skill ? `Residents add ${total}; the city rank caps it at ${city.limits.skill}.` : undefined}>
      <span className="text-body font-semibold text-label">{Math.min(total, city.limits.skill)}</span> / {city.limits.skill}{total > city.limits.skill && " max"}
    </span>;
  };

  const dragged = drag && residents.find(resident => resident.id === drag.id);
  return <section className={`${panel} space-y-4`}>
    <div>
      <h2 className="text-title-3 font-semibold">Skills & actions</h2>
      <p className="mt-1 text-footnote text-label-2">Tap a colored skill icon to learn what it does and how to increase it.</p>
      <p className="mt-1 text-footnote text-label-2">Drag a resident onto a skill or action, or tap it and then tap where it works. A resident's species decides which skills it can work, at full or half bonus (see its Pokédex page; a pale badge marks half). The full bonus is: first stage +1, second +2, third +3, species that never evolve +2, legendaries +5. Catalyst takes any resident and adds no value: it provides its types to recipes that need them. {formatEnumName(city.rank)} cities cap every skill at {city.limits.skill}.</p>
    </div>
    {!residents.length ? <p>No residents yet. Add a Pokémon to put it to work.</p>
      : zone("unassigned", <><span>Unassigned</span><span className="ml-auto text-footnote font-normal text-label-2">{placed("unassigned").length} of {residents.length}</span></>)}
    {groups.filter(([, targets]) => targets.length).map(([title, targets]) => <div key={title} className="space-y-2">
      <h3 className="text-subhead font-semibold text-label-2">{title}</h3>
      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {targets.map(target => zone(target, <>
          <span className="min-w-0 truncate">{targetLabel(target)}</span>
          {value(target)}
        </>))}
      </div>
    </div>)}
    {!city.tags.length && <p className="text-footnote text-label-2">Add custom actions in City settings below to assign residents to them too.</p>}
    {dragged && <div aria-hidden className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
      <Sprite image={dragged.pokemonTemplate.image} set="box" className="h-14 w-17 drop-shadow-lg" />
    </div>}
  </section>;
};

const CityTypeOverview = ({ residents }: { residents: Pokemon[] }) => {
  const groups = cityRankGroups(residents);
  if (!groups.length) return <p>No residents yet. Add a Pokémon to get started.</p>;
  return <div className="grid items-start gap-4 xl:grid-cols-2">
    {groups.map(({ rank, population, types }) => <details key={rank} open className="group/rank min-w-0 overflow-hidden rounded-xl bg-fill">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <RankBall rank={rank} />
        <h3 className="text-body">{formatEnumName(rank)}</h3>
        <span className="ml-auto text-footnote font-medium text-label-2">{population} Pokémon</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-label-2 transition-transform group-open/rank:rotate-180" />
      </summary>
      <table className="w-full table-fixed border-collapse text-body">
        <caption className="sr-only">{formatEnumName(rank)} Pokémon counts by type</caption>
        <colgroup><col className="w-28" /><col /><col className="w-14" /></colgroup>
        <thead className="sr-only"><tr><th scope="col">Type</th><th scope="col">Population pips</th><th scope="col">Count</th></tr></thead>
        <tbody>
          {types.map(({ type, count }) => <tr key={type} className="border-t border-hairline">
            <th scope="row" className="w-28 px-3 py-2 text-left font-medium"><TypePill type={type} size="sm" /></th>
            <td className="py-2">
              <span aria-hidden className="flex flex-wrap gap-[3px]">
                {Array.from({ length: Math.max(5, count) }, (_, index) => <span key={index} className={cn(
                  "h-2.5 w-5 shrink-0 rounded-full",
                  index < count ? "bg-label" : "border-[1.5px] border-label/25",
                )} />)}
              </span>
            </td>
            <td className="w-14 px-3 py-2 text-right font-semibold tabular-nums">{count}</td>
          </tr>)}
        </tbody>
      </table>
    </details>)}
  </div>;
};

export const MyCityPage = () => {
  const { id } = useParams();
  const [tab, setTab] = React.useState<"overview" | "roster" | "settings" | "crafting">("overview");
  const cities = useQuery({ queryKey: ["cities"], queryFn: ({ signal }) => apiFetch<City[]>({ url: "/cities", method: "get", signal }) });
  const pokemon = useQuery({ queryKey: ["pokemon", "city-roster"], queryFn: ({ signal }) => apiFetch<Pokemon[]>({ url: "/pokemon/all", method: "get", signal }) });
  const trainers = useQuery({ queryKey: ["trainers"], queryFn: ({ signal }) => apiFetch<Trainer[]>({ url: "/trainers", method: "get", signal }) });
  const city = id ? cities.data?.find(city => city.id === id) : cities.data?.[0];
  const residents = pokemon.data?.filter(pokemon => pokemon.cityId === city?.id) ?? [];
  React.useEffect(() => setTab("overview"), [city?.id]);
  const failed = cities.isError || pokemon.isError || trainers.isError;
  return <>
    <PageHeader title="My City" actions={<CreateCity />}>
      <p className="text-subhead text-label-2">Manage your cities, their residents and what they can do.</p>
    </PageHeader>
    <div className="space-y-5 px-4 pb-8 lg:px-8">
      {failed ? <div role="alert" className={panel}><p>Your city data could not be loaded.</p><button type="button" className={button({ variant: "tinted" })} onClick={() => { cities.refetch(); pokemon.refetch(); trainers.refetch(); }}>Try again</button></div> :
        !cities.data || !pokemon.data || !trainers.data ? <p role="status">Loading cities...</p> :
        !cities.data.length ? <div className={`${panel} flex flex-col items-center gap-3 py-10 text-center`}><Building2 aria-hidden className="size-12 text-tint" /><h2 className="text-title-3 font-semibold">Your first city starts here</h2><p className="text-label-2">Create a city, then add Pokémon to see its types, ranks and capabilities.</p><CreateCity /></div> :
        !city ? <div className={panel}><p>This city was not found.</p><Link to="/myCity" className={button({ variant: "tinted" })}>Back to cities</Link></div> : <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="flex min-w-0 flex-col gap-2 sm:min-w-64">City
              <CitySelect cities={cities.data} selected={city.id} />
            </label>
            <AddPokemon key={city.id} city={city} cities={cities.data} pokemon={pokemon.data} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="City views">
            {(["overview", "roster", "settings", "crafting"] as const).map(view => <button key={view} type="button" aria-pressed={tab === view} className={button({ variant: tab === view ? "filled" : "gray" })} onClick={() => setTab(view)}>{view === "overview" ? "Overview" : view === "roster" ? "Pokémon roster" : view === "settings" ? "Skills & actions" : "Crafting"}</button>)}
          </div>
          {tab === "overview" ? <>
            <section className={panel}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-title-3 font-semibold">{city.name}</h2>
                <RankBadge rank={city.rank} />
                <span className="ml-auto text-subhead tabular-nums text-label-2">{residents.length} / {city.limits.residents} Pokémon</span>
              </div>
              <p className="mt-1 mb-4 text-footnote text-label-2">Expand or collapse a rank to see all types. Each filled pip is one Pokémon; dual-type Pokémon count under both types.</p>
              <CityTypeOverview key={city.id} residents={residents} />
            </section>
            <section className={panel}><h2 className="mb-3 text-headline font-semibold">Capabilities <span className="text-footnote font-normal text-label-2">(max {city.limits.skill})</span></h2>
              <div className="flex flex-wrap gap-2">{CITY_SKILLS.filter(skill => skill !== "catalyst" && city.skills[skill] > 0).map(skill => <span key={skill} className="inline-flex items-center gap-2 rounded-xl bg-fill px-3 py-2"><SkillIcon skill={skill} />{skillLabel(skill)} {city.skills[skill]}</span>)}</div>
              {!CITY_SKILLS.some(skill => city.skills[skill] > 0) && <p className="text-label-2">No residents are working on city skills yet. Assign them in Skills & actions.</p>}
              {city.skills.catalyst > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><SkillIcon skill="catalyst" /><span>Catalyst types</span>
                {POKEMON_TYPES.filter(type => city.catalysts[type]).map(type => <span key={type} title={`Strength ${city.catalysts[type]}`}><TypePill type={type} size="sm" /></span>)}</div>}
              <div className="mt-3 flex flex-wrap gap-2">{city.tags.map(tag => <span key={tag} className="rounded-full bg-tint/10 px-3 py-1 text-tint">{tag}: {city.tagValues[tag] ?? 0}</span>)}</div>
              {!city.tags.length && <p className="mt-3 text-label-2">No custom actions yet. Add them in Skills & actions.</p>}
            </section>
          </> : tab === "crafting" ? <CityCrafting key={city.id} city={city} trainers={trainers.data} /> : tab === "settings" ? <>
            <CityWorkBoard city={city} residents={residents} />
            <CityMembers key={city.id} city={city} />
            <CitySettings key={`${city.id}:${city.name}:${city.rank}:${city.tags.join("\n")}`} city={city} residentCount={residents.length} />
          </> :
            <section className={panel}><h2 className="mb-3 text-title-3 font-semibold">Pokémon roster ({residents.length})</h2>
              {!residents.length ? <p>No Pokémon assigned to this city.</p> : <ul className="divide-y divide-hairline">{residents.map(resident => <li key={resident.id} className="space-y-3 py-4">
                <Link to={`/myCity/${city.id}/pokemon/${resident.id}`} className="flex items-center gap-3">
                  <Sprite image={resident.pokemonTemplate.image} set="box" className={cn("h-14 w-17 rounded-xl", resident.shiny && shinyRing)} />
                  <span><span className="inline-flex items-center gap-1.5 font-semibold">{resident.nickname || resident.pokemonTemplate.name}{resident.shiny && <ShinyMark compact />}</span><span className="block text-footnote text-label-2">{formatEnumName(resident.rank)} · Open sheet</span>
                    <span className="mt-1 flex gap-1">{resident.pokemonTemplate.types.map(type => <TypePill key={type} type={type} size="sm" />)}</span>
                  </span>
                </Link>
                <TransferPokemon key={`${resident.id}:${resident.cityId}`} pokemon={resident} cities={cities.data!} trainers={trainers.data!} allPokemon={pokemon.data!} />
              </li>)}</ul>}
            </section>}
        </>}
    </div>
  </>;
};

const CitySelect = ({ cities, selected }: { cities: City[]; selected: string }) => {
  const navigate = useNavigate();
  return <select className={field} value={selected} onChange={event => navigate(`/myCity/${event.target.value}`)}>
    {cities.map(city => <option key={city.id} value={city.id}>{city.name}{city.members.length > 1 ? ` (shared with ${city.members.length - 1})` : ""}</option>)}
  </select>;
};

export const CityPokemonPage = () => {
  const { cityId, id } = useParams();
  return <PokemonProvider key={id} id={id!} editingMode="view">
    <PokemonSheet back={{ to: `/myCity/${cityId}`, label: "My City" }} />
  </PokemonProvider>;
};
