import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CITY_SKILLS, RANKS, type Campaign, type City, type CityBody, type NamedEntry, type Pokemon, type Rank, type Trainer, type UpdatePokemonBody } from "../../../shared/types";
import { cityRankGroups } from "../../../shared/cities";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { Picker } from "@/components/kit/Picker";
import { RankBall, TypePill } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { PokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/layout/AppShell";
import { cn, formatEnumName } from "@/lib/utils";

const field = "h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9";
const panel = "rounded-2xl bg-surface p-4 shadow-card";
type Change =
  | { kind: "create"; name: string }
  | { kind: "settings"; id: string; body: CityBody }
  | { kind: "delete"; id: string }
  | { kind: "invite"; id: string; email: string }
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
        case "assign": return apiFetch<Pokemon>({ url: "/pokemon", method: "patch", body: change.body });
        case "add": return apiFetch<Pokemon>({ url: "/pokemon", method: "post", body: { cityId: change.cityId, pokemonTemplateId: change.pokemonTemplateId, rank: change.rank } });
      }
    },
    onSuccess: async () => {
      await Promise.all(["cities", "pokemon", "trainers"].map(key => client.invalidateQueries({ queryKey: [key], refetchType: "all" })));
      toast({ title: "City changes saved" });
    },
    onError: (error: ApiFetchError) => {
      const detail = error.stack;
      toast({
        title: "City changes could not be saved",
        description: detail && typeof detail === "object" && "payload" in detail && typeof detail.payload === "string"
          ? detail.payload : "Check your connection and try again.",
      });
    },
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
  return <>
    <button type="button" onClick={() => setOpen(true)} className={button({ variant: "filled" })}><Plus aria-hidden className="size-4" />Add Pokémon</button>
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
  const [skills, setSkills] = React.useState(city.skills);
  const [tags, setTags] = React.useState(city.tags);
  const [tag, setTag] = React.useState("");
  const change = useCityChange();
  const navigate = useNavigate();
  return <div className="space-y-5">
    <form className={`${panel} space-y-5`} onSubmit={event => {
      event.preventDefault();
      change.mutate({ kind: "settings", id: city.id, body: { name, skills, tags } });
    }}>
      <h2 className="text-title-3 font-semibold">City skills and actions</h2>
      <label className="flex flex-col gap-2">City name<input required maxLength={100} className={field} value={name} onChange={event => setName(event.target.value)} /></label>
      <p className="text-subhead text-label-2">Set city-wide skills manually from 0 to 5. These are not automatically calculated from residents.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CITY_SKILLS.map(skill => <label key={skill} className="flex items-center justify-between gap-3">
          {formatEnumName(skill)}
          <input aria-label={`City ${skill}`} type="number" required min={0} max={5} step={1} className={`${field} max-w-20`} value={skills[skill]}
            onChange={event => setSkills({ ...skills, [skill]: event.target.valueAsNumber })} />
        </label>)}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">Custom action tags</h3>
        <p className="text-footnote text-label-2">Describe capabilities such as Can heal or Can produce food.</p>
        <div className="flex flex-wrap gap-2">{tags.map(value => <button key={value} type="button" aria-label={`Remove tag ${value}`} className={button({ variant: "tinted", size: "sm" })} onClick={() => setTags(tags.filter(tag => tag !== value))}>{value} ×</button>)}</div>
        <div className="flex gap-2">
          <input aria-label="New action tag" maxLength={80} className={field} value={tag} onChange={event => setTag(event.target.value)} placeholder="Can heal" />
          <button type="button" disabled={!tag.trim() || tags.length >= 50} className={button({ variant: "gray" })} onClick={() => { setTags([...new Set([...tags, tag.trim()])]); setTag(""); }}>Add tag</button>
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
  return <section className={`${panel} space-y-4`}>
    <h2 className="text-title-3 font-semibold">Members</h2>
    <p className="text-subhead text-label-2">Everyone in the city can see, add and take its residents and edit its skills. Invite friends with the email they log in with.</p>
    <ul className="divide-y divide-hairline">
      {city.members.map(member => <li key={member} className="py-2 break-all">{member}{member === me && <span className="text-label-2"> (you)</span>}</li>)}
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

const TransferPokemon = ({ pokemon, cities, trainers }: { pokemon: Pokemon; cities: City[]; trainers: Trainer[] }) => {
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
      {cities.filter(city => city.id !== pokemon.cityId).map(city => <option key={city.id} value={`city:${city.id}`}>City: {city.name}</option>)}
    </select>
    <button disabled={!destination || change.isPending} className={button({ variant: "tinted", size: "sm" })}>Move</button>
  </form>;
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
  const [tab, setTab] = React.useState<"overview" | "roster" | "settings">("overview");
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
            {(["overview", "roster", "settings"] as const).map(view => <button key={view} type="button" aria-pressed={tab === view} className={button({ variant: tab === view ? "filled" : "gray" })} onClick={() => setTab(view)}>{view === "overview" ? "Overview" : view === "roster" ? "Pokémon roster" : "Skills & actions"}</button>)}
          </div>
          {tab === "overview" ? <>
            <section className={panel}>
              <h2 className="text-title-3 font-semibold">{city.name}: {residents.length} Pokémon</h2>
              <p className="mt-1 mb-4 text-footnote text-label-2">Expand or collapse a rank to see all types. Each filled pip is one Pokémon; dual-type Pokémon count under both types.</p>
              <CityTypeOverview key={city.id} residents={residents} />
            </section>
            <section className={panel}><h2 className="mb-3 text-headline font-semibold">Capabilities</h2>
              <div className="flex flex-wrap gap-2">{CITY_SKILLS.filter(skill => city.skills[skill] > 0).map(skill => <span key={skill} className="rounded-xl bg-fill px-3 py-2">{formatEnumName(skill)} {city.skills[skill]}</span>)}</div>
              {!CITY_SKILLS.some(skill => city.skills[skill] > 0) && <p className="text-label-2">No city skills set yet.</p>}
              <div className="mt-3 flex flex-wrap gap-2">{city.tags.map(tag => <span key={tag} className="rounded-full bg-tint/10 px-3 py-1 text-tint">{tag}</span>)}</div>
              {!city.tags.length && <p className="mt-3 text-label-2">No custom actions yet. Add them in Skills & actions.</p>}
            </section>
          </> : tab === "settings" ? <>
            <CityMembers key={city.id} city={city} />
            <CitySettings key={JSON.stringify(city)} city={city} residentCount={residents.length} />
          </> :
            <section className={panel}><h2 className="mb-3 text-title-3 font-semibold">Pokémon roster ({residents.length})</h2>
              {!residents.length ? <p>No Pokémon assigned to this city.</p> : <ul className="divide-y divide-hairline">{residents.map(resident => <li key={resident.id} className="space-y-3 py-4">
                <Link to={`/myCity/${city.id}/pokemon/${resident.id}`} className="flex items-center gap-3">
                  <Sprite image={resident.pokemonTemplate.image} set="box" className="h-14 w-17" />
                  <span><span className="font-semibold">{resident.nickname || resident.pokemonTemplate.name}</span><span className="block text-footnote text-label-2">{formatEnumName(resident.rank)} · Open sheet</span>
                    <span className="mt-1 flex gap-1">{resident.pokemonTemplate.types.map(type => <TypePill key={type} type={type} size="sm" />)}</span>
                  </span>
                </Link>
                <TransferPokemon key={`${resident.id}:${resident.cityId}`} pokemon={resident} cities={cities.data!} trainers={trainers.data!} />
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
