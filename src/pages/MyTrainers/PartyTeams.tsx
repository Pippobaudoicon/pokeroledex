import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Users } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import type * as T from "../../../shared/types";
import { usePokemonControllerFindAllMinimal, useTeamsControllerFindAll, useTrainersControllerUpdate } from "@/api/components";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { Sheet } from "@/components/kit/Sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorMessage, plural, TeamSprites } from "@/pages/MyPokemon/Teams";

type PartyMember = { id: string; nickname?: string | null; pokemonTemplate: { name: string } };

/** Confirms who joins and who leaves before a team replaces the trainer's party. */
const ConfirmTeam = ({
  team,
  members,
  trainer,
  onBack,
  onDone,
}: {
  team: T.Team;
  members: T.PokemonMinimal[];
  trainer: { id: string; name: string; pokemon: PartyMember[] };
  onBack: () => void;
  onDone: () => void;
}) => {
  const { toast } = useToast();
  const client = useQueryClient();
  const { mutate, isPending, error } = useTrainersControllerUpdate({
    onSuccess: () => {
      toast({ title: `${team.name} is now ${trainer.name || "this trainer"}’s party` });
      client.invalidateQueries({ queryKey: ["pokemon"] });
      client.invalidateQueries({ queryKey: ["trainers"] });
      onDone();
    },
  });
  const teamIds = new Set(team.pokemonIds);
  const leaving = trainer.pokemon.filter((entry) => !teamIds.has(entry.id));
  const fromOthers = members.filter((entry) => entry.trainerId && entry.trainerId !== trainer.id);
  const message = errorMessage(error);
  return (
    <div className="flex flex-col gap-5 p-4">
      <button type="button" onClick={onBack} className={cn(button({ variant: "plain", size: "sm" }), "-ml-2 self-start")}>
        <ChevronLeft aria-hidden className="size-4" />
        Teams
      </button>
      <Group title={team.name} action={<span className="text-footnote text-label-2">{plural(members.length)}</span>}>
        <div className="p-3">
          <TeamSprites members={members} />
        </div>
      </Group>
      <div role="status" className="flex flex-col gap-1 text-subhead text-label-2">
        <p>
          {trainer.name || "This trainer"}’s party becomes the {plural(members.length)} in {team.name}.
        </p>
        {leaving.length > 0 && (
          <p>
            <span className="font-semibold text-label">Become unassigned:</span> {leaving.map((entry) => entry.nickname || entry.pokemonTemplate.name).join(", ")}
          </p>
        )}
        {fromOthers.length > 0 && (
          <p>
            <span className="font-semibold text-label">Leave another trainer:</span> {fromOthers.map((entry) => entry.name).join(", ")}
          </p>
        )}
      </div>
      {message && <p className="text-footnote text-[#d92d20]">{message}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() => mutate({ body: { id: trainer.id, pokemonIds: team.pokemonIds } })}
        className={button({ variant: "filled" })}
      >
        <Users aria-hidden className="size-4" />
        Make it {trainer.name || "this trainer"}’s party
      </button>
    </div>
  );
};

/** Party action: swap the trainer's whole party for one of your saved teams. */
export const UseTeam = ({ trainer, disabled }: { trainer: { id: string; name: string; pokemon: PartyMember[] }; disabled?: boolean }) => {
  const [open, setOpen] = React.useState(false);
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const { data: teams, isError, refetch } = useTeamsControllerFindAll({});
  const { data: pokemon } = usePokemonControllerFindAllMinimal({});
  React.useEffect(() => {
    if (!open) setTeamId(null);
  }, [open]);
  const byId = new Map((pokemon ?? []).map((entry) => [entry.id, entry]));
  const membersOf = (team: T.Team) => team.pokemonIds.flatMap((id) => byId.get(id) ?? []);
  const partyIds = trainer.pokemon.map((entry) => entry.id).sort().join();
  const selected = teams?.find((team) => team.id === teamId);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? "Finish editing first" : undefined}
        onClick={() => setOpen(true)}
        className={button({ variant: "plain", size: "sm" })}
      >
        <Users aria-hidden className="size-4" />
        Use a team
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={`${trainer.name || "Trainer"}’s party`}>
        {selected ? (
          <ConfirmTeam team={selected} members={membersOf(selected)} trainer={trainer} onBack={() => setTeamId(null)} onDone={() => setOpen(false)} />
        ) : (
          <div className="flex flex-col gap-5 p-4">
            <p className="text-subhead text-label-2">Choose a team to become this trainer’s whole party. Party members that aren’t in it become unassigned.</p>
            {isError ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
                <p className="text-body">Your teams didn’t load.</p>
                <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
                  Try again
                </button>
              </div>
            ) : !teams || !pokemon ? (
              <div aria-hidden className="skeleton h-24 rounded-xl" />
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
                <p className="text-body">You have no teams yet.</p>
                <Link to="/myPokemon" className={button({ variant: "tinted" })}>
                  Create one in My Pokémon
                </Link>
              </div>
            ) : (
              <Group title="Your teams">
                {teams.map((team) => {
                  const members = membersOf(team);
                  const current = members.length > 0 && members.map((entry) => entry.id).sort().join() === partyIds;
                  return (
                    <Row
                      key={team.id}
                      title={team.name}
                      subtitle={current ? "Current party" : members.length ? <TeamSprites members={members} /> : "No Pokémon yet"}
                      value={plural(members.length)}
                      onClick={members.length && !current ? () => setTeamId(team.id) : undefined}
                      chevron={members.length > 0 && !current}
                    />
                  );
                })}
              </Group>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
};
