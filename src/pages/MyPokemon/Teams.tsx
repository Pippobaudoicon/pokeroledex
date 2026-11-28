import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, Plus, Search, Trash2 } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { TEAM_NAME_LIMIT } from "../../../shared/types";
import type { ApiFetchError } from "@/api/client";
import {
  useTeamsControllerCreate,
  useTeamsControllerFindAll,
  useTeamsControllerRemove,
  useTeamsControllerUpdate,
} from "@/api/components";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { Sheet } from "@/components/kit/Sheet";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { Sprite } from "@/components/kit/Sprite";
import { fold } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const field =
  "h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9 lg:rounded-lg";

export const errorMessage = (error: ApiFetchError | null) => {
  const detail = error?.stack;
  if (detail && typeof detail === "object" && "payload" in detail && typeof detail.payload === "string") return detail.payload;
  return error ? "Check your connection and try again." : undefined;
};

export const plural = (count: number) => `${count} Pokémon`;

/** A row of small sprites for a team's members. */
export const TeamSprites =  ({ members }: { members: T.PokemonMinimal[] }) => (
  <span className="mt-1 flex flex-wrap gap-0.5">
    {members.slice(0, 8).map((pokemon) => (
      <Sprite key={pokemon.id} image={pokemon.image} set="box" className={cn("h-8 w-10 rounded-md", pokemon.shiny && shinyRing)} />
    ))}
    {members.length > 8 && <span className="self-center px-1 text-footnote text-label-2">+{members.length - 8}</span>}
  </span>
);

const TeamEditor = ({
  team,
  pokemon,
  trainers,
  onBack,
  onCreated,
}: {
  team: T.Team;
  pokemon: T.PokemonMinimal[];
  trainers: T.Trainer[];
  onBack: () => void;
  onCreated: (team: T.Team) => void;
}) => {
  const { toast } = useToast();
  const client = useQueryClient();
  // A draft has no id until it is saved.
  const isNew = !team.id;
  const assigned = React.useMemo(() => new Set(pokemon.filter((entry) => entry.ownerTrainerId).map((entry) => entry.id)), [pokemon]);
  const assignedIds = (ids: string[]) => ids.filter((id) => assigned.has(id));
  const [name, setName] = React.useState(team.name);
  const [ids, setIds] = React.useState(() => assignedIds(team.pokemonIds));
  const [query, setQuery] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  React.useEffect(() => {
    setName(team.name);
    setIds(assignedIds(team.pokemonIds));
  }, [team, assigned]);
  const update = useTeamsControllerUpdate({
    onSuccess: () => {
      toast({ title: "Team saved" });
      client.invalidateQueries({ queryKey: ["teams"] });
    },
  });
  const create = useTeamsControllerCreate({
    onSuccess: (created) => {
      toast({ title: "Team saved" });
      client.invalidateQueries({ queryKey: ["teams"] });
      onCreated(created);
    },
  });
  const remove = useTeamsControllerRemove({
    onSuccess: () => {
      toast({ title: `${team.name} was deleted` });
      client.invalidateQueries({ queryKey: ["teams"] });
      onBack();
    },
  });
  const trainerNames = new Map(trainers.map((trainer) => [trainer.id, trainer.name || "Unnamed trainer"]));
  const selected = new Set(ids);
  const trimmed = name.trim();
  const dirty = trimmed !== team.name || ids.length !== team.pokemonIds.length || ids.some((id, index) => id !== team.pokemonIds[index]);
  const valid = trimmed.length > 0 && trimmed.length <= TEAM_NAME_LIMIT;
  const list = pokemon
    .filter((entry) => entry.ownerTrainerId && fold(entry.name).includes(fold(query.trim())))
    .sort((first, second) => Number(selected.has(second.id)) - Number(selected.has(first.id)) || first.name.localeCompare(second.name));
  const toggle = (id: string) => setIds((previous) => (previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id]));
  const message = errorMessage(create.error) ?? errorMessage(update.error) ?? errorMessage(remove.error);
  return (
    <div className="flex flex-col gap-5 p-4">
      <button type="button" onClick={onBack} className={cn(button({ variant: "plain", size: "sm" }), "-ml-2 self-start")}>
        <ChevronLeft aria-hidden className="size-4" />
        Teams
      </button>
      <label className="flex flex-col gap-1.5 text-footnote text-label-2">
        Team name
        <input className={field} value={name} maxLength={TEAM_NAME_LIMIT} onChange={(event) => setName(event.target.value)} />
      </label>
      <Group title="Members" action={<span className="text-footnote text-label-2">{plural(ids.length)}</span>}>
        <label className="relative flex items-center border-b border-hairline p-2">
          <span className="sr-only">Search your Pokémon</span>
          <Search aria-hidden className="pointer-events-none absolute left-4.5 size-4 text-label-2" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className={cn(field, "pl-8")} />
        </label>
        <ul className="max-h-80 overflow-y-auto">
          {list.map((entry) => {
            const checked = selected.has(entry.id);
            return (
              <li key={entry.id} className="group/row">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(entry.id)}
                  className="flex w-full items-center gap-3 pl-2 text-left transition-colors duration-150 hover:bg-raised active:bg-fill"
                >
                  <Sprite image={entry.image} set="box" className={cn("h-11 w-14 rounded-lg", entry.shiny && shinyRing)} />
                  <span className="flex min-h-12 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-1.5 pr-4 group-last/row:border-b-0 lg:pr-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-body"><span className="truncate">{entry.name}</span>{entry.shiny && <ShinyMark compact />}</span>
                      <span className="block truncate text-footnote text-label-2">{trainerNames.get(entry.ownerTrainerId!) ?? "A trainer"}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", checked ? "border-tint bg-tint text-on-tint" : "border-label-3")}
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="p-4 text-center text-subhead text-label-2">{query.trim() ? "No Pokémon match." : "Give Pokémon to a trainer to add them to a team."}</li>}
        </ul>
      </Group>
      {message && <p className="text-footnote text-[#d92d20]">{message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setName(team.name);
            setIds(assignedIds(team.pokemonIds));
          }}
          className={cn(button({ variant: "gray" }), "flex-1")}
        >
          Discard
        </button>
        <button
          type="button"
          disabled={isNew ? !valid || create.isPending : !dirty || !valid || update.isPending}
          onClick={() =>
            isNew
              ? create.mutate({ body: { name: trimmed, pokemonIds: ids } })
              : update.mutate({ body: { id: team.id, name: trimmed, pokemonIds: ids } })
          }
          className={cn(button({ variant: "filled" }), "flex-1")}
        >
          Save team
        </button>
      </div>
      <p className="text-footnote text-label-2">To make this team a trainer’s party, open the trainer and choose <span className="font-semibold">Use a team</span> in their Party.</p>
      {!isNew && <Group>
        {deleting ? (
          <div className="flex flex-col gap-3 p-3">
            <p className="text-subhead">Delete {team.name}? Its Pokémon and trainers aren’t changed.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting(false)} className={cn(button({ variant: "gray" }), "flex-1")}>
                Cancel
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ pathParams: { id: team.id } })}
                className={cn(button({ variant: "gray" }), "flex-1 text-[#d92d20]")}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <Row icon={<Trash2 className="size-4.5 text-[#d92d20]" />} title={<span className="text-[#d92d20]">Delete team</span>} onClick={() => setDeleting(true)} chevron={false} />
        )}
      </Group>}
    </div>
  );
};

/** Saved groups of your Pokémon, each one a shortcut to set a trainer's whole party. */
export const TeamsSheet = ({
  open,
  onOpenChange,
  pokemon,
  trainers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pokemon: T.PokemonMinimal[];
  trainers: T.Trainer[];
}) => {
  const { data: teams, isError, refetch } = useTeamsControllerFindAll({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<T.Team | null>(null);
  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setDraft(null);
    }
  }, [open]);
  const byId = new Map(pokemon.filter((entry) => entry.ownerTrainerId).map((entry) => [entry.id, entry]));
  const membersOf = (team: T.Team) => team.pokemonIds.flatMap((id) => byId.get(id) ?? []);
  const selected = teams?.find((team) => team.id === selectedId) ?? draft;
  const newTeam = (name: string, pokemonIds: string[] = []) => setDraft({ id: "", userId: "", name: name.slice(0, TEAM_NAME_LIMIT), pokemonIds });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={selected ? selected.name || "New team" : "Teams"} initialExpanded>
      {selected ? (
        <TeamEditor
          team={selected}
          pokemon={pokemon}
          trainers={trainers}
          onBack={() => {
            setDraft(null);
            setSelectedId(null);
          }}
          onCreated={(team) => {
            // Shown until the refetched list includes it.
            setDraft(team);
            setSelectedId(team.id);
          }}
        />
      ) : (
        <div className="flex flex-col gap-5 p-4">
          <p className="text-subhead text-label-2">
            A team is a saved group of Pokémon that belong to a trainer. Use it from a trainer’s Party to make it their whole party in one step.
          </p>
          {isError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
              <p className="text-body">Your teams didn’t load.</p>
              <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
                Try again
              </button>
            </div>
          ) : !teams ? (
            <div aria-hidden className="skeleton h-24 rounded-xl" />
          ) : (
            teams.length > 0 && (
              <Group title="Your teams">
                {teams.map((team) => {
                  const members = membersOf(team);
                  return (
                    <Row
                      key={team.id}
                      title={team.name}
                      subtitle={members.length ? <TeamSprites members={members} /> : "No Pokémon yet"}
                      value={plural(members.length)}
                      onClick={() => setSelectedId(team.id)}
                    />
                  );
                })}
              </Group>
            )
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!teams}
              onClick={() => newTeam(`Team ${(teams?.length ?? 0) + 1}`)}
              className={button({ variant: "filled" })}
            >
              <Plus aria-hidden className="size-4" strokeWidth={2.5} />
              New team
            </button>
            {trainers.some((trainer) => trainer.pokemon.length > 0) && (
              <Group title="Start from a party">
                {trainers
                  .filter((trainer) => trainer.pokemon.length > 0)
                  .map((trainer) => (
                    <Row
                      key={trainer.id}
                      title={`Save ${trainer.name || "Unnamed trainer"}’s party`}
                      value={plural(trainer.pokemon.length)}
                      onClick={() => newTeam(`${trainer.name || "Trainer"}’s party`, trainer.pokemon.map((entry) => entry.id))}
                    />
                  ))}
              </Group>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
};
