import { ChevronDown } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { DiceRoll, type DiceRollRequest } from "@/components/DiceRoll";
import { RankBall, TypeDot } from "@/components/kit/Pills";
import { Hint, RollChip, STAB_HINT, poolDice } from "@/components/move-dice";
import { encounterMovePools } from "@/lib/encounter-moves";
import { capitalize, cn, formatEnumName } from "@/lib/utils";

const join = (...terms: (string | null | undefined)[]) => terms.filter((term) => term && term !== "0").join(" + ") || "—";

/** "PHYSICAL_SPECIAL" -> "Physical / Special" */
export const categoryName = (category: T.MoveCategory) => category.split("_").map(capitalize).join(" / ");

export const CategoryIcon = ({ category, className }: { category: T.MoveCategory; className?: string }) => (
  <img src={`/images/moveCategory/${category.toLowerCase()}.png`} alt="" className={cn("size-4 shrink-0 object-contain", className)} />
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 border-b border-hairline py-1.5 last:border-b-0">
    <dt className="w-20 shrink-0 text-subhead text-label-2">{label}</dt>
    <dd className="min-w-0 flex-1 text-subhead">{children}</dd>
  </div>
);

/**
 * One move as a disclosure row: name and the numbers that matter at the table, details on demand.
 * With a `pokemon`, accuracy and damage show that Pokémon's dice pools instead of the formulas.
 */
export const MoveRow = ({
  move,
  pokemon,
  rank,
  action,
  className,
}: {
  move: T.Move;
  pokemon?: T.Pokemon;
  /** The rank it is learned at, for Pokédex move lists. */
  rank?: T.Rank;
  /** Trailing control such as a remove button, outside the disclosure button. */
  action?: React.ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  const pools = pokemon ? encounterMovePools(move, pokemon) : undefined;
  const accuracyFormula = join(move.accuracy1, move.accuracy2);
  const damageFormula = join(move.damage1, move.damage2, move.damagePower);
  const accuracyHint = pools && pools.accuracy !== "—" ? `${pools.accuracyBreakdown} = ${pools.accuracy} dice` : undefined;
  const damageHint = pools && pools.damage !== "—" ? `${pools.damageBreakdown} = ${pools.damage} dice` : undefined;
  const accuracyDice = poolDice(pools?.accuracy);
  const damageDice = poolDice(pools?.damage);
  const [damageReduction, setDamageReduction] = React.useState(0);
  const damageRollDice = damageDice === undefined ? undefined : Math.max(0, damageDice - damageReduction);
  const [roll, setRoll] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const rollPool = (kind: DiceRollRequest["kind"], dice: number) => () =>
    setRoll((previous) => ({ title: move.name, kind, dice, key: (previous?.key ?? 0) + 1 }));

  return (
    <li className={cn("group/row list-none", className)}>
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left transition-colors duration-150 hover:bg-raised lg:min-h-10 lg:pl-3"
        >
          <TypeDot type={move.type} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-body font-medium">
              <span className="truncate">{move.name}</span>
              {rank && <RankBall rank={rank} className="size-3.5" />}
            </span>
            <span className="flex items-center gap-1.5 text-footnote text-label-2">
              <CategoryIcon category={move.category} className="size-3.5" />
              {categoryName(move.category)}
              {!pools && (
                <span className="truncate">
                  · {accuracyFormula} · {damageFormula}
                </span>
              )}
            </span>
          </span>
          {pools && (
            <span className="flex shrink-0 gap-1 text-footnote font-semibold tabular-nums" aria-label={`Accuracy ${pools.accuracy}, damage ${pools.damage}`}>
              <span className="rounded-md bg-fill px-1.5 py-0.5">
                <span className="font-normal text-label-2">Acc </span>
                {pools.accuracy}
              </span>
              <span className="rounded-md bg-fill px-1.5 py-0.5">
                <span className="font-normal text-label-2">Dmg </span>
                {pools.damage}
                {pools.stab && "★"}
              </span>
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={cn("mr-3 size-4 shrink-0 text-label-3 transition-transform duration-200 ease-spring", open && "rotate-180", action && "mr-1")}
          />
        </button>
        {action && <div className="shrink-0 pr-2">{action}</div>}
      </div>
      <div id={panelId} hidden={!open} className="border-b border-hairline px-4 pb-3 lg:px-3 lg:pl-12 pl-13">
        <dl>
          <Fact label="Type">{formatEnumName(move.type)}</Fact>
          <Fact label="Accuracy">
            {accuracyFormula}
            {pools && pools.accuracy !== "—" && (
              <>
                {" = "}
                {accuracyDice && accuracyHint ? (
                  <RollChip dice={accuracyDice} label="accuracy" title={accuracyHint} onClick={rollPool("accuracy", accuracyDice)} />
                ) : (
                  `${pools.accuracy} dice`
                )}
              </>
            )}
          </Fact>
          <Fact label="Damage">
            {damageFormula}
            {pools?.stab && (
              <>
                {" + "}
                <Hint hint={STAB_HINT}>1 ★</Hint>
              </>
            )}
            {pools && pools.damage !== "—" && (
              <>
                {" = "}
                {damageDice !== undefined && damageHint ? (
                  <>
                    <span className="ml-1 text-label-2" aria-hidden="true">−</span>
                    <input
                      type="number"
                      min={0}
                      max={damageDice}
                      step={1}
                      value={Math.min(damageReduction, damageDice)}
                      aria-label={`Damage dice to remove for ${move.name}`}
                      title="Damage dice to remove"
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value);
                        setDamageReduction(Number.isFinite(value) ? Math.min(damageDice, Math.max(0, Math.floor(value))) : 0);
                      }}
                      className="h-9 w-9 rounded-md border border-hairline bg-fill px-1 text-center text-subhead tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-tint lg:h-7"
                    />
                    <RollChip
                      dice={damageRollDice ?? 0}
                      label="damage"
                      title={`${damageHint}${damageReduction ? `, minus ${damageReduction} dice` : ""}`}
                      onClick={rollPool("damage", damageRollDice ?? 0)}
                    />
                  </>
                ) : (
                  `${pools.damage} dice`
                )}
              </>
            )}
          </Fact>
          <Fact label="Target">{formatEnumName(move.target)}</Fact>
          {move.effect && <Fact label="Effect">{move.effect}</Fact>}
        </dl>
        {move.description && <p className="mt-2 text-subhead text-label-2 italic">{move.description}</p>}
      </div>
      <div aria-hidden className="ml-13 border-b border-hairline group-last/row:hidden lg:ml-12" hidden={open} />
      {roll && (
        <DiceRoll
          key={roll.key}
          request={roll}
          onClose={() => setRoll(null)}
          next={roll.kind === "accuracy" && damageRollDice !== undefined ? `Roll damage (${damageRollDice} dice)` : undefined}
          onNext={damageRollDice !== undefined ? () => rollPool("damage", damageRollDice)() : undefined}
        />
      )}
    </li>
  );
};
