import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minus, Plus } from "lucide-react";
import type * as T from "../../../shared/types";
import { Group } from "@/components/kit/List";
import { cn, formatEnumName } from "@/lib/utils";

export type StatusKind = "burn" | "poison" | "badlyPoisoned" | "paralysis" | "sleep" | "frozen" | "confusion" | "flinch" | "inLove";

/** Active status ailments. The number is the burn degree (1–3) or the damage Badly Poisoned deals next round; 1 otherwise. */
export type Statuses = Partial<Record<StatusKind, number>>;

interface StatusInfo {
  label: string;
  color: string;
  immune?: T.PokemonType[];
  /** Starting value when switched on. */
  initial?: number;
  /** What the ailment does, shown under the picker. */
  rule: (value: number) => string;
  /** What happens when a new round starts. */
  onRound: (value: number) => { text: string; damage: number };
}

export const STATUS_INFO: Record<StatusKind, StatusInfo> = {
  burn: {
    label: "Burn",
    color: "#e8590c",
    immune: ["FIRE"],
    rule: (degree) => `${ordinal(degree)} degree: ${degree} damage per round.`,
    onRound: (degree) => ({ text: `Burn (${ordinal(degree)} degree) deals ${degree} damage`, damage: degree }),
  },
  poison: {
    label: "Poison",
    color: "#9c36b5",
    immune: ["POISON", "STEEL"],
    rule: () => "2 damage per round.",
    onRound: () => ({ text: "Poison deals 2 damage", damage: 2 }),
  },
  badlyPoisoned: {
    label: "Badly Poisoned",
    color: "#7b2cbf",
    immune: ["POISON", "STEEL"],
    initial: 2,
    rule: (damage) => `${damage} damage next round, 1 more each round after.`,
    onRound: (damage) => ({ text: `Badly Poisoned deals ${damage} damage (${damage + 1} next round)`, damage }),
  },
  paralysis: {
    label: "Paralysis",
    color: "#f2b705",
    immune: ["ELECTRIC"],
    rule: () => "−2 Dexterity, already taken off pools and moves.",
    onRound: () => ({ text: "Paralysis: still −2 Dexterity", damage: 0 }),
  },
  sleep: {
    label: "Sleep",
    color: "#5c7cfa",
    rule: () => "No actions. Roll Insight at the start of its turn; wakes after 5 total successes.",
    onRound: () => ({ text: "Asleep: roll Insight at the start of its turn to wake up", damage: 0 }),
  },
  frozen: {
    label: "Frozen",
    color: "#22b8cf",
    immune: ["ICE"],
    rule: () => "No actions. The ice has 5 HP, Def and Sp. Def 2; super-effective moves break it.",
    onRound: () => ({ text: "Frozen solid: no actions until the ice breaks", damage: 0 }),
  },
  confusion: {
    label: "Confusion",
    color: "#e64980",
    rule: () => "Roll Insight at the round start: 2 successes to act normally. A failed action deals 1 damage.",
    onRound: () => ({ text: "Confused: roll Insight now, 2 successes to act normally", damage: 0 }),
  },
  flinch: {
    label: "Flinch",
    color: "#868e96",
    rule: () => "Next action is wasted; no Reactions until that turn ends.",
    onRound: () => ({ text: "Flinch wears off", damage: 0 }),
  },
  inLove: {
    label: "In Love",
    color: "#f06595",
    rule: () => "Holds back against the beloved foe. Loyalty or Insight roll of 3 successes to attack at full power.",
    onRound: () => ({ text: "In Love: Loyalty or Insight roll (3 successes) to attack at full power", damage: 0 }),
  },
};

const STATUS_KINDS = Object.keys(STATUS_INFO) as StatusKind[];
/** Only one of these at a time. */
const EXCLUSIVE: StatusKind[][] = [["poison", "badlyPoisoned"]];

const ordinal = (value: number) => ["1st", "2nd", "3rd"][value - 1] ?? `${value}th`;

const activeKinds = (statuses: Statuses | undefined) => STATUS_KINDS.filter((kind) => !!statuses?.[kind]);

export const hasStatuses = (statuses: Statuses | undefined) => activeKinds(statuses).length > 0;

/** Paralysis takes 2 Dexterity off on top of the temporary stats. */
export const statusBoosts = (statuses: Statuses | undefined): Partial<Record<T.Attribute, number>> =>
  statuses?.paralysis ? { dexterity: -2 } : {};

/** What starting a new round does to a Pokémon with these statuses. */
export const roundEffects = (statuses: Statuses | undefined) =>
  activeKinds(statuses).map((kind) => ({ kind, ...STATUS_INFO[kind].onRound(statuses![kind]!) }));

/** The statuses after a new round: Badly Poisoned worsens and Flinch wears off. */
export const nextRoundStatuses = (statuses: Statuses): Statuses => {
  const next = { ...statuses };
  if (next.badlyPoisoned) next.badlyPoisoned += 1;
  delete next.flinch;
  return next;
};

const immuneType = (pokemon: T.Pokemon, kind: StatusKind) =>
  STATUS_INFO[kind].immune?.find((type) => pokemon.pokemonTemplate.types.includes(type));

/** Status ailments for this fight, applied when a new round starts. */
export const StatusPicker = ({
  pokemon,
  statuses,
  setStatuses,
}: {
  pokemon: T.Pokemon;
  statuses: Statuses;
  setStatuses: (statuses: Statuses) => void;
}) => {
  const toggle = (kind: StatusKind) => {
    const next = { ...statuses };
    if (next[kind]) delete next[kind];
    else {
      for (const group of EXCLUSIVE) if (group.includes(kind)) for (const other of group) delete next[other];
      next[kind] = STATUS_INFO[kind].initial ?? 1;
    }
    setStatuses(next);
  };
  const active = activeKinds(statuses);
  return (
    <Group
      title="Status"
      action={
        active.length > 0 && (
          <button type="button" onClick={() => setStatuses({})} className="text-footnote text-tint hover:underline">
            Clear
          </button>
        )
      }
      footer="Starting a new round applies them: damage comes off HP, Badly Poisoned worsens and Flinch wears off."
    >
      <div role="group" aria-label="Status ailments" className="flex flex-wrap gap-2 p-3">
        {STATUS_KINDS.map((kind) => {
          const info = STATUS_INFO[kind];
          const on = !!statuses[kind];
          const immune = immuneType(pokemon, kind);
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={on}
              title={immune ? `${formatEnumName(immune)} types are immune to ${info.label}` : info.rule(info.initial ?? 1)}
              onClick={() => toggle(kind)}
              style={on ? { backgroundColor: info.color, borderColor: info.color } : { borderColor: `${info.color}66` }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-subhead font-medium transition-[background-color,transform] duration-150 active:scale-95 lg:h-7 lg:text-footnote",
                on ? "text-white" : "bg-surface text-label hover:bg-fill",
                immune && !on && "opacity-50",
              )}
            >
              {!on && <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: info.color }} />}
              {info.label}
              {immune && <span className={cn("text-caption", on ? "text-white/80" : "text-label-2")}>immune</span>}
            </button>
          );
        })}
      </div>
      {active.map((kind) => {
        const info = STATUS_INFO[kind];
        const value = statuses[kind]!;
        const adjustable = kind === "burn" || kind === "badlyPoisoned";
        const min = kind === "burn" ? 1 : 2;
        const max = kind === "burn" ? 3 : 99;
        return (
          <div key={kind} className="flex min-h-12 items-center gap-3 border-t border-hairline py-1.5 pr-2 pl-4 lg:min-h-9 lg:pl-3">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: info.color }} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">{info.label}</span>
              <span className="block text-footnote text-label-2">{info.rule(value)}</span>
            </span>
            {adjustable && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={kind === "burn" ? "Lower burn degree" : "Lower Badly Poisoned damage"}
                  disabled={value <= min}
                  onClick={() => setStatuses({ ...statuses, [kind]: value - 1 })}
                  className="grid size-11 place-items-center rounded-full bg-fill text-label hover:bg-fill-strong active:scale-90 disabled:opacity-25 lg:size-7"
                >
                  <Minus aria-hidden className="size-4 lg:size-3.5" />
                </button>
                <output className="w-6 text-center text-body font-semibold tabular-nums">{value}</output>
                <button
                  type="button"
                  aria-label={kind === "burn" ? "Raise burn degree" : "Raise Badly Poisoned damage"}
                  disabled={value >= max}
                  onClick={() => setStatuses({ ...statuses, [kind]: value + 1 })}
                  className="grid size-11 place-items-center rounded-full bg-fill text-label hover:bg-fill-strong active:scale-90 disabled:opacity-25 lg:size-7"
                >
                  <Plus aria-hidden className="size-4 lg:size-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </Group>
  );
};

export interface RoundSubject {
  key: string;
  name: string;
  /** Unknown for saved Pokémon whose sheet isn't loaded. */
  hp?: number;
  statuses: Statuses;
}

/** "The following status will apply": lists each Pokémon's round effects before a new round starts. */
export const NewRoundAlert = ({
  open,
  onOpenChange,
  subjects,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: RoundSubject[];
  onConfirm: () => void;
}) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(560px,calc(100dvh-48px))] w-[min(340px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-surface/95 shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:200ms]">
        <div className="px-5 pt-5 pb-3 text-center">
          <DialogPrimitive.Title className="text-headline font-semibold">New round</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-footnote text-label-2">The following status will apply.</DialogPrimitive.Description>
        </div>
        <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pb-4">
          {subjects.map((subject) => {
            const effects = roundEffects(subject.statuses);
            const damage = effects.reduce((sum, effect) => sum + effect.damage, 0);
            return (
              <li key={subject.key} className="flex flex-col gap-1.5">
                {subjects.length > 1 && <span className="text-footnote font-semibold tracking-wide text-label-2 uppercase">{subject.name}</span>}
                <ul className="flex flex-col gap-1">
                  {effects.map((effect) => (
                    <li key={effect.kind} className="flex items-start gap-2 text-subhead">
                      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_INFO[effect.kind].color }} />
                      <span className="min-w-0 flex-1">{effect.text}</span>
                    </li>
                  ))}
                </ul>
                {damage > 0 && (
                  <p className="text-subhead font-semibold text-[#d92d20] tabular-nums">
                    {subject.hp === undefined ? `−${damage} HP` : `HP ${subject.hp} → ${Math.max(0, subject.hp - damage)}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="grid shrink-0 grid-cols-2 border-t border-hairline">
          <DialogPrimitive.Close className="h-11 border-r border-hairline text-body text-tint hover:bg-fill">Cancel</DialogPrimitive.Close>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="h-11 text-body font-semibold text-tint hover:bg-fill"
          >
            Apply
          </button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
