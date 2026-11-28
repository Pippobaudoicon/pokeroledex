import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeftRight, X } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import type * as T from "../../../shared/types";
import { useTrainersControllerFindAll } from "@/api/components";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { Pokeball } from "@/components/kit/Pokeball";
import { Sheet } from "@/components/kit/Sheet";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { Sprite } from "@/components/kit/Sprite";
import { MAX_TURN, useStartFight } from "@/components/pokemon-sheet/fight";
import { useToast } from "@/hooks/use-toast";
import { getTotalStat } from "@/lib/stats";
import { cn } from "@/lib/utils";

const nameOf = (pokemon: T.Pokemon) => pokemon.nickname || pokemon.pokemonTemplate.name;
const maxHp = (pokemon: T.Pokemon) => getTotalStat(pokemon, "vitality") + pokemon.pokemonTemplate.baseHp;

/** Asks whether to send in another Pokémon once the fighting one reaches 0 HP. */
export const FaintedAlert = ({ open, onOpenChange, name, onSendIn }: { open: boolean; onOpenChange: (open: boolean) => void; name: string; onSendIn: () => void }) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(300px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface/95 text-center shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:200ms]">
        <div className="px-5 pt-5 pb-4">
          <DialogPrimitive.Title className="text-headline font-semibold break-words">{name} fainted</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-footnote text-label-2">Would you like to send in another Pokémon?</DialogPrimitive.Description>
        </div>
        <div className="grid grid-cols-2 border-t border-hairline">
          <DialogPrimitive.Close className="h-11 border-r border-hairline text-body text-tint hover:bg-fill">No</DialogPrimitive.Close>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSendIn();
            }}
            className="h-11 text-body font-semibold text-tint hover:bg-fill"
          >
            Yes
          </button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

/**
 * Picks a Pokémon from the same trainer's party to fight next. Swapping uses an action, so the new
 * Pokémon starts on the next turn. After a faint with nobody left, the encounter ends for the player.
 */
export const SwapSheet = ({
  open,
  onOpenChange,
  pokemon,
  turn,
  fainted,
  onEndFight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pokemon: T.Pokemon;
  turn: number;
  /** Opened because the fighting Pokémon fainted. */
  fainted: boolean;
  onEndFight: () => void;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: trainers, isError, refetch, isFetching } = useTrainersControllerFindAll({});
  // Other party members' HP may have changed in another tab or sheet since the list was loaded.
  React.useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);
  const trainer = pokemon.trainerId ? trainers?.find((entry) => entry.id === pokemon.trainerId) : undefined;
  const party = trainer?.pokemon.filter((entry) => entry.id !== pokemon.id) ?? [];
  const available = party.filter((entry) => entry.currentHp > 0);
  const loading = !trainers && isFetching && !!pokemon.trainerId;
  const startFight = useStartFight();
  const swapIn = (next: T.Pokemon) => {
    onOpenChange(false);
    toast({ title: `${nameOf(pokemon)}, come back! Go, ${nameOf(next)}!` });
    onEndFight();
    startFight(next.id, pokemon.trainerId, Math.min(MAX_TURN, turn + 1));
    navigate(`/myPokemon/${next.id}`);
  };
  const nobody = !loading && !isError && available.length === 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Swap Pokémon" initialExpanded>
      <div className="flex flex-col gap-4 p-4">
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
            <p className="text-body">The party didn’t load.</p>
            <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <div aria-hidden className="skeleton h-40 rounded-xl" />
        ) : nobody ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
            <Pokeball className="size-12 text-label-3" />
            <h2 className="text-title-3 font-semibold">No Pokémon available</h2>
            <p className="max-w-xs text-subhead text-label-2">
              {!trainer
                ? `${nameOf(pokemon)} isn’t in a trainer’s party, so there’s nobody to send in.`
                : party.length === 0
                  ? `${nameOf(pokemon)} is the only Pokémon in ${trainer.name || "the trainer"}’s party.`
                  : `Every other Pokémon in ${trainer.name || "the trainer"}’s party has 0 HP.`}
              {fainted && " The encounter ends for you."}
            </p>
            {fainted ? (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEndFight();
                }}
                className={button({ variant: "filled" })}
              >
                <X aria-hidden className="size-4" />
                End fight
              </button>
            ) : (
              <DialogPrimitive.Close className={button({ variant: "gray" })}>Keep fighting</DialogPrimitive.Close>
            )}
          </div>
        ) : (
          <>
            <p className="text-subhead text-label-2">
              Choose who fights next from {trainer?.name || "the trainer"}’s party. Swapping uses an action: the new Pokémon starts on turn {Math.min(MAX_TURN, turn + 1)}.
            </p>
            <Group title="Party">
              <ul>
                {party.map((entry) => {
                  const hp = entry.currentHp;
                  const max = maxHp(entry);
                  const out = hp <= 0;
                  return (
                    <li key={entry.id} className="group/row">
                      <button
                        type="button"
                        disabled={out}
                        onClick={() => swapIn(entry)}
                        className="flex w-full items-center gap-3 pl-2 text-left transition-colors duration-150 hover:bg-raised active:bg-fill disabled:opacity-45 disabled:hover:bg-transparent"
                      >
                        <Sprite image={entry.pokemonTemplate.image} set="box" className={cn("h-12 w-15 rounded-lg", entry.shiny && shinyRing, out && "grayscale")} />
                        <span className="flex min-h-14 min-w-0 flex-1 items-center gap-3 border-b border-hairline py-2 pr-4 group-last/row:border-b-0 lg:pr-3">
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-body font-medium"><span className="truncate">{nameOf(entry)}</span>{entry.shiny && <ShinyMark compact />}</span>
                            <span className="mt-1 flex items-center gap-2">
                              <span aria-hidden className="h-1.5 w-20 overflow-hidden rounded-full bg-fill">
                                <span className="block h-full rounded-full bg-[var(--color-hp)]" style={{ width: `${max > 0 ? Math.min(100, (Math.max(0, hp) / max) * 100) : 0}%` }} />
                              </span>
                              <span className="text-footnote text-label-2 tabular-nums">{out ? "Fainted" : `HP ${hp}/${max}`}</span>
                            </span>
                          </span>
                          {!out && <ArrowLeftRight aria-hidden className="size-4 shrink-0 text-tint" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Group>
          </>
        )}
      </div>
    </Sheet>
  );
};
