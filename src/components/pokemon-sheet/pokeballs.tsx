import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type * as T from "../../../shared/types";
import { useTrainersControllerFindOne, useTrainersControllerUpdate } from "@/api/components";
import { ItemPocket } from "@/api/schemas";
import { BallRollChips, useBallRoll } from "@/components/BallRolls";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { Pokeball } from "@/components/kit/Pokeball";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/pages/MyCity/common";
import { toInventoryItemDto } from "@/pages/MyTrainers/context";

const BallRow = ({
  entry,
  stats,
  disabled,
  onThrow,
}: {
  entry: T.HydratedInventoryEntry;
  stats: T.Stats;
  disabled: boolean;
  onThrow: (entry: T.HydratedInventoryEntry) => void;
}) => {
  const ball = useBallRoll(entry.item, stats);
  return (
    <li className="border-b border-hairline last:border-b-0">
      <div className="flex items-center gap-3 py-1 pr-2 pl-3">
        <ItemImage imageFileName={entry.item.image} className="size-8 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-body">{entry.item.name}</span>
        <span className="shrink-0 text-subhead text-label-2 tabular-nums" aria-label={`${entry.quantity} left`}>
          × {entry.quantity}
        </span>
        <button
          type="button"
          disabled={disabled}
          title="Use one ball and roll the throw"
          onClick={() => onThrow(entry)}
          className={button({ variant: "tinted", size: "sm" })}
        >
          <Pokeball className="size-4" strokeWidth={8} />
          Throw
        </button>
      </div>
      <BallRollChips ball={ball} className="flex flex-wrap items-center gap-x-3 pb-2 pl-14 text-footnote text-label-2" />
    </li>
  );
};

/** The roll for a thrown ball, kept outside its row so it stays open when the last one leaves the list. */
const ThrowRoll = ({ item, stats, onClose }: { item: T.Item; stats: T.Stats; onClose: () => void }) => {
  const ball = useBallRoll(item, stats, onClose);
  React.useEffect(() => ball.rollAccuracy(), []);
  return ball.dialog;
};

/**
 * The Poké Balls in the fighting Pokémon's trainer's bag. Throwing one takes it out of the bag and rolls
 * the trainer's throw, then the seal.
 */
export const PokeballsGroup = ({ pokemon }: { pokemon: T.Pokemon }) =>
  pokemon.trainerId ? (
    <TrainerBalls trainerId={pokemon.trainerId} />
  ) : (
    <Group title="Poké Balls">
      <p className="p-4 text-subhead text-label-2">This Pokémon isn’t in a trainer’s party, so there’s no bag to throw from.</p>
    </Group>
  );

// Mounted only with a trainer: the generated query hooks always run, even with `enabled: false`.
const TrainerBalls = ({ trainerId }: { trainerId: string }) => {
  const { data: trainer, isLoading, isError, refetch } = useTrainersControllerFindOne({ pathParams: { id: trainerId } });
  const client = useQueryClient();
  const { toast } = useToast();
  const [thrown, setThrown] = React.useState<{ item: T.Item; key: number } | null>(null);
  const { mutate, isPending } = useTrainersControllerUpdate({
    onSuccess: (updated) => {
      // A second throw must start from the new count, before the refetch lands.
      client.setQueryData(["trainers", updated.id], updated);
      client.invalidateQueries({ queryKey: ["trainers"] });
    },
  });
  const balls = (trainer?.inventory ?? []).filter((entry) => entry.item.pocket === ItemPocket.POKEBALLS && entry.quantity > 0);
  const throwBall = (ball: T.HydratedInventoryEntry) => {
    if (!trainer) return;
    const inventory = trainer.inventory.map((entry) =>
      toInventoryItemDto(entry.id === ball.id ? { ...entry, quantity: entry.quantity - 1 } : entry),
    );
    mutate(
      { body: { id: trainer.id, inventory } },
      {
        onSuccess: () => {
          toast({ title: `${trainer.name || "Trainer"} threw a ${ball.item.name}!`, description: `${ball.quantity - 1} left in the bag.` });
          setThrown((previous) => ({ item: ball.item, key: (previous?.key ?? 0) + 1 }));
        },
        onError: (error) => toast({ title: `The ${ball.item.name} could not be thrown`, description: errorText(error) }),
      },
    );
  };

  let body: React.ReactNode;
  if (isLoading) body = <div aria-hidden className="skeleton h-16" />;
  else if (isError || !trainer)
    body = (
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-subhead text-label-2">The trainer’s bag didn’t load.</p>
        <button type="button" onClick={() => refetch()} className={button({ variant: "tinted", size: "sm" })}>
          Try again
        </button>
      </div>
    );
  else if (balls.length === 0)
    body = <p className="p-4 text-subhead text-label-2">{trainer.name || "The trainer"} has no Poké Balls. Add some to their inventory.</p>;
  else
    body = (
      <ul>
        {balls.map((entry) => (
          <BallRow key={entry.id} entry={entry} stats={trainer.stats} disabled={isPending} onThrow={throwBall} />
        ))}
      </ul>
    );
  return (
    <Group title="Poké Balls">
      {body}
      {thrown && trainer && <ThrowRoll key={thrown.key} item={thrown.item} stats={trainer.stats} onClose={() => setThrown(null)} />}
    </Group>
  );
};
