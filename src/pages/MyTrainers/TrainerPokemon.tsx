import { useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus, Search, X } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import type * as T from "../../../shared/types";
import { usePokemonControllerFindAllMinimal, usePokemonControllerUpdate, useTrainersControllerFindAll } from "@/api/components";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { FightMark, fightBorder } from "@/components/kit/Fight";
import { useInFight } from "@/components/pokemon-sheet/fight";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { Sprite } from "@/components/kit/Sprite";
import { fold } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/pages/MyPokemon/Teams";
import { type EditableTrainer, useTrainer } from "@/pages/MyTrainers/context";
import { UseTeam } from "@/pages/MyTrainers/PartyTeams";

const PARTY_LIMIT = 6;
type Tab = "party" | "pokemon";

const useUpdatePokemon = () => {
  const client = useQueryClient();
  const { toast } = useToast();
  return usePokemonControllerUpdate({
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pokemon"] });
      client.invalidateQueries({ queryKey: ["trainers"] });
    },
    onError: (error) => toast({ title: "Couldn’t update the Pokémon", description: errorMessage(error) }),
  });
};

const iconButton = "grid size-9 shrink-0 place-items-center rounded-full text-label-2 hover:bg-fill disabled:opacity-40 lg:size-8";

const Party = ({ trainer }: { trainer: EditableTrainer }) => {
  const inFight = useInFight();
  return trainer.pokemon.length ? (
    <ul className="flex flex-wrap gap-2 p-3">
      {trainer.pokemon.slice(0, PARTY_LIMIT).map((pokemon) => (
        <li key={pokemon.id}>
          <Link
            to={`/myPokemon/${pokemon.id}`}
            className={cn(
              "relative flex w-24 flex-col items-center gap-1 rounded-xl p-2 text-center hover:bg-raised",
              pokemon.shiny && shinyRing,
              inFight(pokemon.id) && fightBorder,
            )}
          >
            {inFight(pokemon.id) && <FightMark className="absolute top-1 right-1" />}
            <Sprite image={pokemon.pokemonTemplate.image} set="box" className="h-14 w-17" />
            <span className="w-full truncate text-footnote">
              {pokemon.nickname || pokemon.pokemonTemplate.name}
              {pokemon.shiny && <span className="sr-only"> (shiny)</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="p-4 text-subhead text-label-2">No Pokémon in the party yet. Add them from this trainer’s Pokémon, or use a team.</p>
  );
};

const Owned = ({ trainer, owned, disabled }: { trainer: EditableTrainer; owned: T.PokemonMinimal[] | undefined; disabled: boolean }) => {
  const update = useUpdatePokemon();
  const inFight = useInFight();
  const partyFull = trainer.pokemon.length >= PARTY_LIMIT;
  if (!owned) return <div aria-hidden className="skeleton m-3 h-15 rounded-xl" />;
  if (!owned.length) return <p className="p-4 text-subhead text-label-2">This trainer has no Pokémon yet. Give them some from My Pokémon.</p>;
  return (
    <ul>
      {owned.map((pokemon) => {
        const inParty = pokemon.trainerId === trainer.id;
        const fighting = inFight(pokemon.id);
        return (
          <li key={pokemon.id} className="group/row flex items-center gap-3 pl-2">
            <Link to={`/myPokemon/${pokemon.id}`} className="shrink-0 rounded-xl hover:bg-raised">
              <Sprite image={pokemon.image} set="box" className={cn("h-12 w-15 rounded-xl", pokemon.shiny && shinyRing, fighting && fightBorder)} />
            </Link>
            <span className="flex min-h-14 min-w-0 flex-1 items-center gap-1 border-b border-hairline py-1.5 pr-2 group-last/row:border-b-0">
              <Link to={`/myPokemon/${pokemon.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="flex items-center gap-1.5 text-body"><span className="truncate">{pokemon.name}</span>{pokemon.shiny && <ShinyMark compact />}{fighting && <FightMark />}</span>
                <span className="block text-footnote text-label-2">{inParty ? "In the party" : "Not in the party"}</span>
              </Link>
              <button
                type="button"
                disabled={disabled || update.isPending || (!inParty && partyFull)}
                title={!inParty && partyFull ? `The party already has ${PARTY_LIMIT} Pokémon` : undefined}
                onClick={() => update.mutate({ body: { id: pokemon.id, trainerId: inParty ? null : trainer.id } })}
                className={button({ variant: inParty ? "gray" : "tinted", size: "sm" })}
              >
                {inParty ? <Minus aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
                Party
              </button>
              <button
                type="button"
                aria-label={`Take ${pokemon.name} from ${trainer.name || "this trainer"}`}
                title="Take from this trainer"
                disabled={disabled || update.isPending}
                onClick={() => update.mutate({ body: { id: pokemon.id, ownerTrainerId: null } })}
                className={iconButton}
              >
                <X aria-hidden className="size-4" />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** Picks Pokémon from My Pokémon for a trainer to own; taking one from another trainer also takes it out of their party. */
const GivePokemon = ({ trainer, pokemon, disabled }: { trainer: EditableTrainer; pokemon: T.PokemonMinimal[] | undefined; disabled: boolean }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const update = useUpdatePokemon();
  const { data: trainers } = useTrainersControllerFindAll({});
  const names = new Map((trainers ?? []).map((entry) => [entry.id, entry.name || "Unnamed trainer"]));
  const candidates = (pokemon ?? [])
    .filter((entry) => entry.ownerTrainerId !== trainer.id && fold(entry.name).includes(fold(query.trim())))
    .sort((first, second) => Number(!!first.ownerTrainerId) - Number(!!second.ownerTrainerId) || first.name.localeCompare(second.name));
  return (
    <>
      <button type="button" disabled={disabled} title={disabled ? "Finish editing first" : undefined} onClick={() => setOpen(true)} className={button({ variant: "plain", size: "sm" })}>
        <Plus aria-hidden className="size-4" strokeWidth={2.5} />
        Add
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={`Give Pokémon to ${trainer.name || "this trainer"}`}>
        <div className="flex flex-col gap-4 p-4">
          <label className="relative flex items-center">
            <span className="sr-only">Search your Pokémon</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-9 lg:rounded-lg"
            />
          </label>
          {!pokemon ? (
            <div aria-hidden className="skeleton h-24 rounded-xl" />
          ) : candidates.length === 0 ? (
            <p className="text-center text-subhead text-label-2">{query.trim() ? `No Pokémon named “${query}”.` : "Every one of your Pokémon already belongs to this trainer."}</p>
          ) : (
            <Group title="My Pokémon">
              <ul>
                {candidates.map((entry) => (
                  <li key={entry.id} className="group/row">
                    <button
                      type="button"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ body: { id: entry.id, ownerTrainerId: trainer.id } })}
                      className="flex w-full items-center gap-3 pl-2 text-left transition-colors duration-150 hover:bg-raised active:bg-fill"
                    >
                      <Sprite image={entry.image} set="box" className={cn("h-11 w-14 rounded-lg", entry.shiny && shinyRing)} />
                      <span className="flex min-h-12 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-1.5 pr-4 group-last/row:border-b-0 lg:pr-3">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-body"><span className="truncate">{entry.name}</span>{entry.shiny && <ShinyMark compact />}</span>
                          <span className="block truncate text-footnote text-label-2">
                            {entry.ownerTrainerId ? `Owned by ${names.get(entry.ownerTrainerId) ?? "another trainer"}` : "Unassigned"}
                          </span>
                        </span>
                        <Check aria-hidden className="size-4 shrink-0 text-label-3" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Group>
          )}
        </div>
      </Sheet>
    </>
  );
};

/** The trainer's Pokémon: the party, and every Pokémon they own that the party is chosen from. */
export const TrainerPokemon = () => {
  const { updatedTrainer: trainer, editingMode } = useTrainer();
  const [tab, setTab] = React.useState<Tab>("party");
  const { data: pokemon } = usePokemonControllerFindAllMinimal({});
  if (!trainer) return null;
  const owned = pokemon?.filter((entry) => entry.ownerTrainerId === trainer.id).sort((first, second) => first.name.localeCompare(second.name));
  const disabled = editingMode !== "view";
  const idPrefix = `trainer-${trainer.id}-pokemon`;
  return (
    <Group
      title="Pokémon"
      action={
        <span className="flex items-center gap-2">
          {tab === "party" ? (
            <>
              <span className="text-footnote text-label-2">{trainer.pokemon.length} in party</span>
              <UseTeam trainer={trainer} disabled={disabled} />
            </>
          ) : (
            <>
              <span className="text-footnote text-label-2">{owned?.length ?? 0} owned</span>
              <GivePokemon trainer={trainer} pokemon={pokemon} disabled={disabled} />
            </>
          )}
        </span>
      }
    >
      <div className="p-2 pb-0">
        <Segmented
          label="Trainer Pokémon"
          idPrefix={idPrefix}
          value={tab}
          onChange={setTab}
          options={[
            { value: "party", label: "Party" },
            { value: "pokemon", label: "My Pokémon" },
          ]}
        />
      </div>
      <div {...segmentPanelProps(idPrefix, tab)}>
        {tab === "party" ? <Party trainer={trainer} /> : <Owned trainer={trainer} owned={owned} disabled={disabled} />}
      </div>
    </Group>
  );
};
