import {
  Check,
  ChevronDown,
  Crosshair,
  createLucideIcon,
  Flag,
  HeartHandshake,
  type LucideIcon,
  Map as MapIcon,
  Radar,
  Shield,
  Shuffle,
  User,
  Users,
  UsersRound,
} from "lucide-react";
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

// Lucide's user-group icon is not included in the installed 0.335.0 release.
const UserGroup = createLucideIcon("UserGroup", [
  ["path", { d: "M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1", key: "group" }],
  ["path", { d: "M19 10h1a2 2 0 012 2v1", key: "right" }],
  ["path", { d: "M5 10H4a2 2 0 00-2 2v1", key: "left" }],
  ["circle", { cx: "12", cy: "11", r: "3", key: "center-user" }],
  ["circle", { cx: "18", cy: "4", r: "2", key: "right-user" }],
  ["circle", { cx: "6", cy: "4", r: "2", key: "left-user" }],
]);

const TARGET_ICONS: Record<T.MoveTarget, LucideIcon> = {
  FOE: Crosshair,
  ALL_FOES: UserGroup,
  RANDOM_FOE: Shuffle,
  ALLY: HeartHandshake,
  ALL_ALLIES: Users,
  USER_AND_ALLIES: UsersRound,
  SELF: User,
  AREA: Radar,
  BATTLEFIELD: MapIcon,
  ALLYS_BATTLEFIELD: Shield,
  FOES_BATTLEFIELD: Flag,
};

const TARGET_CAPTIONS: Record<T.MoveTarget, string> = {
  FOE: "Foe",
  ALL_FOES: "All",
  RANDOM_FOE: "Random",
  ALLY: "Ally",
  ALL_ALLIES: "Allies",
  USER_AND_ALLIES: "Team",
  SELF: "Self",
  AREA: "Area",
  BATTLEFIELD: "Ground",
  ALLYS_BATTLEFIELD: "Our side",
  FOES_BATTLEFIELD: "Foe side",
};

/** Who the move hits, as an icon with the target name as its tooltip. */
export const TargetIcon = ({ target, className }: { target: T.MoveTarget; className?: string }) => {
  const Icon = TARGET_ICONS[target] ?? Crosshair;
  const label = `Target: ${formatEnumName(target)}`;
  return (
    <span title={label} className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-fill text-label-2", className)}>
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
};

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
  used,
  onUsedChange,
  className,
}: {
  move: T.Move;
  pokemon?: T.Pokemon;
  /** The rank it is learned at, for Pokédex move lists. */
  rank?: T.Rank;
  /** Trailing control such as a remove button, outside the disclosure button. */
  action?: React.ReactNode;
  /** In a fight: the move was used this round. With `onUsedChange`, a leading check toggles it. */
  used?: boolean;
  onUsedChange?: (used: boolean) => void;
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
  // Defenses never reduce the damage pool below 1 die (see the Damage quick reference).
  const maxDamageReduction = Math.max(0, (damageDice ?? 0) - 1);
  const appliedDamageReduction = Math.min(damageReduction, maxDamageReduction);
  const damageRollDice = damageDice === undefined ? undefined : damageDice - appliedDamageReduction;
  const [roll, setRoll] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const rollPool = (kind: DiceRollRequest["kind"], dice: number) => () =>
    setRoll((previous) => ({ title: move.name, kind, dice, key: (previous?.key ?? 0) + 1 }));

  return (
    <li className={cn("group/row @container list-none", className)}>
      <div className="relative flex items-center">
        {onUsedChange && (
          <button
            type="button"
            role="checkbox"
            aria-checked={!!used}
            aria-label={`${move.name} used this round`}
            title={used ? "Used this round" : "Mark as used this round"}
            onClick={() => onUsedChange(!used)}
            className="relative z-10 grid size-11 shrink-0 place-items-center pl-2 lg:size-9"
          >
            <span
              className={cn(
                "grid size-5.5 place-items-center rounded-md border-[1.5px] transition-colors duration-150",
                used ? "border-tint bg-tint text-on-tint" : "border-label/30 hover:border-label/60",
              )}
            >
              {used && <Check aria-hidden className="size-4" strokeWidth={3} />}
            </span>
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2 text-left transition-[background-color,opacity,filter] duration-150 hover:bg-raised lg:min-h-10",
            onUsedChange ? "pl-1" : "pl-4 lg:pl-3",
            used && "opacity-45 grayscale",
          )}
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
            <span className="flex shrink-0 items-center gap-2">
              <span aria-hidden className="hidden w-14 truncate text-right text-footnote text-label-2 @[22rem]:inline">
                {TARGET_CAPTIONS[move.target] ?? formatEnumName(move.target)}
              </span>
              <TargetIcon target={move.target} />
              {/* Three-character pools plus S.T.A.B. keep the targeting icons aligned. */}
              <span
                className="flex flex-col items-stretch gap-0.5 text-footnote font-semibold tabular-nums"
                aria-label={`Accuracy ${pools.accuracy}, damage ${pools.damage}`}
              >
                <span className="flex justify-between gap-2 rounded-md bg-fill px-1.5 py-px">
                  <span className="font-normal text-label-2">Acc</span>
                  <span title={pools.accuracy} className="w-[4ch] overflow-hidden text-right whitespace-nowrap">
                    {pools.accuracy.length > 3 ? "??" : pools.accuracy}
                  </span>
                </span>
                <span className="flex justify-between gap-2 rounded-md bg-fill px-1.5 py-px">
                  <span className="font-normal text-label-2">Dmg</span>
                  <span title={pools.damage} className="w-[4ch] overflow-hidden text-right whitespace-nowrap">
                    {pools.damage.length > 3 ? "??" : pools.damage}
                    {pools.stab && "★"}
                  </span>
                </span>
              </span>
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={cn("mr-3 size-4 shrink-0 text-label-3 transition-transform duration-200 ease-spring", open && "rotate-180", action && "mr-1")}
          />
        </button>
        {action && <div className="shrink-0 pr-2">{action}</div>}
        {used && (
          <span aria-hidden className="pointer-events-none absolute inset-y-1 right-2 left-11 text-tint lg:left-9">
            <svg className="size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
        )}
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
                    <RollChip
                      dice={damageRollDice ?? 0}
                      label="damage"
                      title={`${damageHint}${appliedDamageReduction ? `, minus ${appliedDamageReduction} dice` : ""}`}
                      onClick={rollPool("damage", damageRollDice ?? 0)}
                    />
                    <span className="mx-1 text-label-2" aria-hidden="true">−</span>
                    <input
                      type="number"
                      min={0}
                      max={maxDamageReduction}
                      step={1}
                      value={appliedDamageReduction}
                      aria-label={`Damage dice to remove for ${move.name}`}
                      title="Damage dice to remove (the pool never drops below 1 die)"
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value);
                        setDamageReduction(Number.isFinite(value) ? Math.min(maxDamageReduction, Math.max(0, Math.floor(value))) : 0);
                      }}
                      className="h-7 w-7 rounded-md border-0 bg-fill p-0 text-center text-subhead tabular-nums outline-none hover:bg-fill-strong focus-visible:ring-2 focus-visible:ring-tint [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
