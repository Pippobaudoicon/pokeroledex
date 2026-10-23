import { Minus, Plus, X } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { Gender } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { MoveRow } from "@/components/kit/MoveRow";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBadge, TypePill } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sprite } from "@/components/kit/Sprite";
import { AddMoveSheet, useCanAddMove } from "@/components/pokemon-sheet/AddMoveSheet";
import { AddToMyPokemon, LockButton, SheetActions } from "@/components/pokemon-sheet/actions";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { InfoGroups, useNumberDraft } from "@/components/pokemon-sheet/fields";
import { StatGroups, usePointsLeft } from "@/components/pokemon-sheet/stats";
import { Hint } from "@/components/move-dice";
import { getTotalStat } from "@/lib/stats";
import { useTypeEffectiveness } from "@/lib/type-chart";
import { cn, formatEnumName } from "@/lib/utils";
import { matchupLabels, typeWash } from "@/pages/PokemonCatalog/PokemonDetail";

/** Which actions the sheet shows: saved Pokémon edit, generated ones can be added (and locked). */
export type SheetButtons = "edit" | "add" | "addAndLock";

const genderLabel: Record<T.Gender, string> = { M: "Male", F: "Female", N: "Genderless" };
const genderSymbol: Record<T.Gender, string> = { M: "♂", F: "♀", N: "⚲" };

const GenderButton = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const { updatePokemon } = usePokemon();
  // Only species without a fixed gender can switch.
  const switchable = pokemon.pokemonTemplate.genderType === "";
  const symbol = (
    <span
      aria-hidden
      className={cn(
        "text-title-3 leading-none",
        pokemon.gender === "M" ? "text-[#1673d1]" : pokemon.gender === "F" ? "text-[#c2399f]" : "text-label-2",
      )}
    >
      {genderSymbol[pokemon.gender]}
    </span>
  );
  if (!switchable)
    return (
      <span className="grid size-8 place-items-center" title={genderLabel[pokemon.gender]}>
        {symbol}
        <span className="sr-only">{genderLabel[pokemon.gender]}</span>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => updatePokemon({ gender: pokemon.gender === Gender.M ? Gender.F : Gender.M })}
      aria-label={`Gender: ${genderLabel[pokemon.gender]}. Switch`}
      className="grid size-11 place-items-center rounded-full transition-colors hover:bg-black/5 lg:size-8"
    >
      {symbol}
    </button>
  );
};

/** Attacking types that don't hit this type combination for normal damage, shown on hover over the type pills. */
const Weaknesses = ({ types }: { types: T.PokemonType[] }) => {
  const chart = useTypeEffectiveness().getDefensiveChart(types[0], types[1]);
  const rows = matchupLabels.filter(([multiplier]) => chart[multiplier].length > 0);
  return (
    <span className="flex flex-col gap-2">
      {rows.map(([multiplier, label]) => (
        <span key={multiplier} className="flex flex-col gap-1">
          <span className="text-footnote text-label-2">{label}</span>
          <span className="flex flex-wrap gap-1">
            {chart[multiplier].map((type) => (
              <TypePill key={type} type={type} size="sm" />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
};

const Identity = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const template = pokemon.pokemonTemplate;
  const { editingMode, updatePokemon } = usePokemon();
  const nicknameId = React.useId();
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-card" style={{ backgroundImage: typeWash(template.types) }}>
      <Pokeball className="absolute -top-10 -right-10 size-48 text-surface/50" strokeWidth={4} />
      <div className="relative flex items-center gap-3 p-3 pr-4">
        <Sprite image={template.image} set="book" eager className="size-22 drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)] @lg:size-26" />
        <div className="min-w-0 flex-1">
          <p className="text-footnote font-medium text-label-2 tabular-nums">#{template.dexID || template.number}</p>
          <div className="flex flex-wrap items-center gap-1">
            <h2 className="min-w-0 font-display text-title-2 leading-tight break-words">{pokemon.nickname || template.name}</h2>
            <GenderButton pokemon={pokemon} />
            <RankBadge rank={pokemon.rank} className="text-footnote" />
          </div>
          {pokemon.nickname && <p className="text-footnote text-label-2">{template.name}</p>}
          {editingMode === "edit" && (
            <div className="mt-2">
              <label htmlFor={nicknameId} className="text-footnote text-label-2">Nickname (optional)</label>
              <input
                id={nicknameId}
                type="text"
                value={pokemon.nickname ?? ""}
                placeholder={template.name}
                onChange={(event) => updatePokemon({ nickname: event.target.value })}
                className="mt-1 h-11 w-full rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg"
              />
            </div>
          )}
          <Hint hint={<Weaknesses types={template.types} />} className="mt-1.5 flex w-fit flex-wrap items-center gap-1.5">
            {template.types.map((type) => (
              <TypePill key={type} type={type} size="sm" />
            ))}
          </Hint>
        </div>
      </div>
    </div>
  );
};

/** HP or Will: big current value over its max, a bar, and steppers sized for thumbs. */
const Vital = ({ property, label, max, color }: { property: "currentHp" | "currentWill"; label: string; max: number; color: string }) => {
  const { draft, setDraft, commit, value } = useNumberDraft(property);
  const id = React.useId();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const step = (delta: number) => {
    const next = String(Math.max(0, value + delta));
    setDraft(next);
    commit(next);
  };
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-card">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-footnote font-semibold tracking-wide text-label-2 uppercase">
          {label}
        </label>
        <span className="text-footnote text-label-2 tabular-nums">max {max}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Lower ${label}`}
          onClick={() => step(-1)}
          disabled={value <= 0}
          className={cn(button({ variant: "gray", size: "icon" }), "lg:size-8")}
        >
          <Minus aria-hidden className="size-5 lg:size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onFocus={(event) => event.currentTarget.select()}
          aria-describedby={`${id}-max`}
          className="h-11 w-0 min-w-0 flex-1 rounded-lg bg-transparent text-center font-display text-title-1 tabular-nums outline-none hover:bg-fill focus-visible:bg-fill lg:h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span id={`${id}-max`} className="sr-only">
          of {max}
        </span>
        <button
          type="button"
          aria-label={`Raise ${label}`}
          onClick={() => step(1)}
          className={cn(button({ variant: "gray", size: "icon" }), "lg:size-8")}
        >
          <Plus aria-hidden className="size-5 lg:size-4" />
        </button>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-fill">
        <div
          className="h-full rounded-full transition-[width] duration-250 ease-spring"
          style={{ width: `${ratio * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/** Pools rolled every round, worked out from the sheet (corebook p. 51). */
const Pools = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const stat = (key: keyof T.Stats) => pokemon.stats[key];
  const strength = getTotalStat(pokemon, "strength");
  const special = getTotalStat(pokemon, "special");
  const dexterity = getTotalStat(pokemon, "dexterity");
  const pools: [string, string, string][] = [
    ["Initiative", String(dexterity + stat("alert")), "Dexterity + Alert"],
    ["Evasion", String(dexterity + stat("evasion")), "Dexterity + Evasion"],
    ["Clash", `${strength + stat("clash")}/${special + stat("clash")}`, "Strength or Special + Clash"],
    ["Defense", String(getTotalStat(pokemon, "vitality")), "Vitality"],
    ["Sp. Def", String(getTotalStat(pokemon, "insight")), "Insight"],
  ];
  return (
    <dl className="grid grid-cols-5 overflow-hidden rounded-2xl bg-surface shadow-card">
      {pools.map(([label, value, formula]) => (
        <div
          key={label}
          title={formula}
          className="flex flex-col items-center gap-0.5 border-r border-hairline px-1 py-2.5 last:border-r-0"
        >
          <dt className="text-caption font-medium text-label-2">{label}</dt>
          <dd className="text-headline font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const Moves = ({ generated }: { generated: boolean }) => {
  const { updatedPokemon: pokemon, editingMode, updatePokemon } = usePokemon();
  const canAdd = useCanAddMove();
  const [adding, setAdding] = React.useState(false);
  const [changing, setChanging] = React.useState(false);
  if (!pokemon) return null;
  const slots = generated ? 6 : getTotalStat(pokemon, "insight") + 3;
  const editing = editingMode !== "view" || changing;
  const canAddGenerated = generated && changing && pokemon.moves.length < slots;
  return (
    <Group
      title="Moves"
      action={
        <div className="flex items-center gap-2">
          <span className="text-footnote text-label-2 tabular-nums">
            {pokemon.moves.length} of {slots}
          </span>
          {generated && (
            <button
              type="button"
              aria-pressed={changing}
              onClick={() => setChanging(!changing)}
              className={button({ variant: "tinted", size: "sm" })}
            >
              {changing ? "Done" : "Change moves"}
            </button>
          )}
        </div>
      }
      footer={
        changing
          ? "Remove a move, then add its replacement. Changes stay with this generated Pokémon."
          : !editing && pokemon.moves.length > 0
            ? "Tap a move, then its dice button to roll. Pools include this Pokémon’s stats; ★ is S.T.A.B."
            : undefined
      }
    >
      {pokemon.moves.length === 0 && !canAdd && (
        <p className="px-4 py-4 text-subhead text-label-2 lg:px-3">
          {generated ? "No moves selected. Choose Change moves to add one." : "No moves yet. Use Edit or Rank up to teach some."}
        </p>
      )}
      <ul>
        {pokemon.moves.map((move) => (
          <MoveRow
            key={move.id}
            move={move}
            pokemon={pokemon}
            action={
              editing && (
                <button
                  type="button"
                  aria-label={`Remove ${move.name}`}
                  onClick={() => updatePokemon({ moves: pokemon.moves.filter((candidate) => candidate.id !== move.id) })}
                  className="grid size-11 place-items-center rounded-full text-[#d92d20] hover:bg-[#d92d20]/10 lg:size-8"
                >
                  <X aria-hidden className="size-4.5" />
                </button>
              )
            }
          />
        ))}
      </ul>
      {(canAdd || canAddGenerated) && (
        <>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-12 w-full items-center gap-3 border-t border-hairline px-4 text-body font-medium text-tint hover:bg-tint/5 lg:min-h-10 lg:px-3"
          >
            <span className="grid size-6 place-items-center rounded-full bg-tint text-on-tint">
              <Plus aria-hidden className="size-4" strokeWidth={2.5} />
            </span>
            Add a move
          </button>
          <AddMoveSheet open={adding} onOpenChange={setAdding} />
        </>
      )}
    </Group>
  );
};

const RankUpBanner = () => {
  const { updatedPokemon, editingMode } = usePokemon();
  const attributes = usePointsLeft("attribute");
  const skills = usePointsLeft("skill");
  const socials = usePointsLeft("social");
  if (editingMode === "view" || !updatedPokemon) return null;
  return (
    <div role="status" className="rounded-2xl bg-tint/10 px-4 py-3 text-subhead text-label">
      {editingMode === "rankUp" ? (
        <>
          <p className="font-semibold text-tint">Ranking up to {formatEnumName(updatedPokemon.rank)}</p>
          <p className="mt-0.5 text-label-2">
            Points to spend: {attributes} attribute · {skills} skill · {socials} social. New pips show in red; save when done.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-tint">Editing</p>
          <p className="mt-0.5 text-label-2">Change anything freely, then save. Cancel throws the changes away.</p>
        </>
      )}
    </div>
  );
};

type Section = "battle" | "stats" | "info";

/**
 * A Pokémon's sheet for play. HP, Will and the rolled pools come first; moves, stats and details follow,
 * as tabs on a phone and side by side when there is room. `back` adds a back link to the top bar.
 */
export const PokemonSheet = ({
  showButtons = "edit",
  back,
  embedded = false,
}: {
  showButtons?: SheetButtons;
  back?: { to: string; label: string };
  /** Inside another page (generators): the top bar does not stick. */
  embedded?: boolean;
}) => {
  const { updatedPokemon: pokemon, isLoading, isError, editingMode } = usePokemon();
  const [section, setSection] = React.useState<Section>("battle");
  if (!pokemon)
    return isLoading ? (
      <div aria-busy className="flex flex-col gap-4 p-4">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Pokeball className="size-14 text-label-3" />
        <h2 className="text-title-3 font-semibold">{isError ? "This Pokémon couldn’t be found" : "No Pokémon"}</h2>
        <p className="max-w-xs text-subhead text-label-2">It may have been deleted. Pick another one from your list.</p>
      </div>
    );

  const actions =
    showButtons === "edit" ? (
      <SheetActions />
    ) : (
      <>
        <AddToMyPokemon />
        {showButtons === "addAndLock" && <LockButton />}
      </>
    );
  const sectionClass = (name: Section) => cn("flex flex-col gap-6 @3xl:gap-5", section !== name && "@max-3xl:hidden");
  return (
    <article className="@container min-h-full bg-canvas" aria-label={`${pokemon.nickname || pokemon.pokemonTemplate.name} sheet`}>
      {embedded ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 @lg:px-6">
          <h2 className="min-w-0 text-headline font-semibold break-words">{pokemon.nickname || pokemon.pokemonTemplate.name}</h2>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
      ) : (
        <PageHeader
          compact
          title={editingMode === "rankUp" ? "Rank up" : editingMode === "edit" ? "Edit" : pokemon.nickname || pokemon.pokemonTemplate.name}
          back={editingMode === "view" ? back : undefined}
          leading={editingMode !== "view" ? <span /> : undefined}
          actions={actions}
          className="bg-canvas/80 backdrop-blur-xl"
        />
      )}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 pt-2 pb-10 @lg:px-6">
        <RankUpBanner />
        <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] @3xl:items-stretch">
          <Identity pokemon={pokemon} />
          <div className="grid grid-cols-2 gap-3 @3xl:contents">
            <Vital
              property="currentHp"
              label="HP"
              max={getTotalStat(pokemon, "vitality") + pokemon.pokemonTemplate.baseHp}
              color="var(--color-hp)"
            />
            <Vital property="currentWill" label="Will" max={getTotalStat(pokemon, "insight") + 3} color="var(--color-will)" />
          </div>
        </div>
        <Pools pokemon={pokemon} />
        <Segmented
          label="Sheet section"
          idPrefix={`sheet-${pokemon.id}`}
          value={section}
          onChange={setSection}
          options={[
            { value: "battle", label: "Battle" },
            { value: "stats", label: "Stats" },
            { value: "info", label: "Info" },
          ]}
          className="@3xl:hidden"
        />
        <div className="grid gap-6 @3xl:grid-cols-2 @3xl:grid-rows-[auto_1fr] @3xl:items-start @3xl:gap-5 @6xl:grid-cols-3">
          <div
            {...segmentPanelProps(`sheet-${pokemon.id}`, "battle")}
            className={cn(sectionClass("battle"), "@3xl:col-start-1 @3xl:row-start-1")}
          >
            <Moves generated={showButtons !== "edit"} />
          </div>
          <div
            {...segmentPanelProps(`sheet-${pokemon.id}`, "stats")}
            className={cn(sectionClass("stats"), "@3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1 @6xl:row-span-1")}
          >
            <StatGroups />
          </div>
          <div
            {...segmentPanelProps(`sheet-${pokemon.id}`, "info")}
            className={cn(sectionClass("info"), "@3xl:col-start-1 @3xl:row-start-2 @6xl:col-start-3 @6xl:row-start-1")}
          >
            <InfoGroups showTrainer={showButtons !== "addAndLock"} />
          </div>
        </div>
      </div>
    </article>
  );
};
