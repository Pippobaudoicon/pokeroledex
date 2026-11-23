import * as React from "react";
import type * as T from "../../shared/types";
import { DiceRoll, type DiceRollRequest } from "@/components/DiceRoll";
import { RollChip } from "@/components/move-dice";

/** Fixed seal potency from a ball's description, like "Seal potency of 6 dice"; special balls have none. */
export const sealDice = (item: T.Item) => {
  const match = /seal potency (?:of )?(\d+)/i.exec(item.description);
  return match ? Number(match[1]) : undefined;
};

/** A trainer's throw pool: Dexterity or Strength, whichever is higher, + Throw (corebook p. 100). */
export const throwPool = (stats: T.Stats) => {
  // Attributes are stored one below their score; skills are not (see TrainerSheet).
  const dexterity = stats.dexterity + 1;
  const strength = stats.strength + 1;
  return {
    formula: `${dexterity >= strength ? "Dexterity" : "Strength"} ${Math.max(dexterity, strength)} + Throw ${stats.throw}`,
    dice: Math.max(dexterity, strength) + stats.throw,
  };
};

/** Throw accuracy and seal rolls for a ball, with the dice dialog that shows them. */
export const useBallRoll = (item: T.Item, stats: T.Stats, onClose?: () => void) => {
  const [roll, setRoll] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const accuracy = throwPool(stats);
  const seal = sealDice(item);
  const rollPool = (kind: DiceRollRequest["kind"], dice: number) =>
    setRoll((previous) => ({ title: item.name, kind, dice, key: (previous?.key ?? 0) + 1 }));
  const dialog = roll && (
    <DiceRoll
      key={roll.key}
      request={roll}
      onClose={() => {
        setRoll(null);
        onClose?.();
      }}
      next={roll.kind === "accuracy" && seal ? `Roll the seal (${seal} dice)` : undefined}
      onNext={seal ? () => rollPool("seal", seal) : undefined}
    />
  );
  return {
    accuracy,
    seal,
    rollAccuracy: () => rollPool("accuracy", accuracy.dice),
    rollSeal: () => seal && rollPool("seal", seal),
    dialog,
  };
};

/** A Poké Ball's throw and seal pools, rolled like a move's accuracy and damage. */
export const BallRollChips = ({ ball, className }: { ball: ReturnType<typeof useBallRoll>; className?: string }) => (
  <div className={className}>
    <span>
      Acc {ball.accuracy.formula} =
      <RollChip dice={ball.accuracy.dice} label="accuracy" title={ball.accuracy.formula} onClick={ball.rollAccuracy} />
    </span>
    <span>
      Seal
      {ball.seal ? <RollChip dice={ball.seal} label="seal" title="Seal potency" onClick={ball.rollSeal} /> : " varies, see the item"}
    </span>
    {ball.dialog}
  </div>
);

export const BallRolls = ({ item, stats }: { item: T.Item; stats: T.Stats }) => {
  const ball = useBallRoll(item, stats);
  return <BallRollChips ball={ball} className="flex flex-wrap items-center gap-x-3 pb-2 pl-13 text-footnote text-label-2" />;
};
