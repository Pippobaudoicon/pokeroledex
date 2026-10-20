import * as React from "react";
import { Link } from "react-router-dom";
import { useNaturesControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Stepper } from "@/components/kit/Controls";
import { Group, Row } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { Picker } from "@/components/kit/Picker";
import { Sprite } from "@/components/kit/Sprite";
import { SOCIALS, TRAINER_ATTRIBUTES, TRAINER_SKILLS } from "@/lib/stats";
import { capitalize, cn, formatEnumName } from "@/lib/utils";
import { type TrainerStatKey, useTrainer } from "@/pages/MyTrainers/context";
import { TrainerSheetHeader } from "@/pages/MyTrainers/Header";
import { InventoryList, InventorySection } from "@/pages/MyTrainers/Inventory";

type StatType = "attribute" | "social" | "skill";
const statsByType = { attribute: TRAINER_ATTRIBUTES, social: SOCIALS, skill: TRAINER_SKILLS };
const pointsByType = { attribute: "attributePoints", social: "socialPoints", skill: "skillPoints" } as const;

const TrainerStatRow = ({ stat, type }: { stat: TrainerStatKey; type: StatType }) => {
  const { baseTrainer, updatedTrainer, updateTrainer, editingMode, rankUpAttributes, statChanges } = useTrainer();
  if (!baseTrainer || !updatedTrainer) return null;
  const offset = type === "skill" ? 0 : 1;
  const value = updatedTrainer.stats[stat] + offset;
  const before = baseTrainer.stats[stat] + offset;
  const pointsLeft =
    editingMode === "edit"
      ? Infinity
      : editingMode === "view"
        ? 0
        : (rankUpAttributes?.[pointsByType[type]] ?? 0) - statsByType[type].reduce((sum, key) => sum + (statChanges?.[key] ?? 0), 0);
  const cap =
    editingMode === "edit" && type === "attribute"
      ? 6
      : type === "skill" && editingMode === "rankUp"
        ? Math.min(5, rankUpAttributes?.skillLimit ?? 5)
        : 5;
  const editable = editingMode !== "view";
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-hairline py-1 pr-2 pl-4 last:border-b-0 lg:min-h-10 lg:pl-3">
      <span className="w-20 shrink-0 text-body">{capitalize(stat)}</span>
      <span aria-hidden className="flex min-w-0 flex-1 gap-[3px]">
        {Array.from({ length: Math.max(cap, value) }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2.5 max-w-5 min-w-1 flex-1 rounded-full",
              index < (editingMode === "rankUp" ? before : value)
                ? "bg-label"
                : index < value
                  ? "bg-tint"
                  : "border-[1.5px] border-label/25",
            )}
          />
        ))}
      </span>
      {editable ? (
        <Stepper
          label={capitalize(stat)}
          value={value}
          min={editingMode === "rankUp" ? before : offset}
          max={Math.max(value, Math.min(cap, value + Math.max(0, pointsLeft)))}
          onChange={(next) => updateTrainer({ stats: { ...updatedTrainer.stats, [stat]: next - offset } })}
        />
      ) : (
        <output aria-label={capitalize(stat)} className="w-6 shrink-0 text-center text-body font-semibold tabular-nums">
          {value}
        </output>
      )}
    </div>
  );
};

const StatGroup = ({ type, title }: { type: StatType; title: string }) => {
  const { editingMode, rankUpAttributes, statChanges } = useTrainer();
  const left = (rankUpAttributes?.[pointsByType[type]] ?? 0) - statsByType[type].reduce((sum, key) => sum + (statChanges?.[key] ?? 0), 0);
  return (
    <Group
      title={title}
      action={
        editingMode === "rankUp" ? (
          <span className="rounded-full bg-tint/10 px-2 py-0.5 text-footnote font-semibold text-tint">{left} points left</span>
        ) : undefined
      }
    >
      {statsByType[type].map((stat) => (
        <TrainerStatRow key={stat} stat={stat} type={type} />
      ))}
    </Group>
  );
};

const Resource = ({ property, label, max }: { property: "currentHp" | "currentWill" | "money"; label: string; max?: number }) => {
  const { updatedTrainer, updateTrainer } = useTrainer();
  const stored = updatedTrainer?.[property] ?? 0;
  const [draft, setDraft] = React.useState(String(stored));
  React.useEffect(() => setDraft(String(stored)), [stored]);
  const commit = () => {
    const value = Number.parseInt(draft, 10);
    if (!Number.isNaN(value) && value >= 0 && value !== stored) updateTrainer({ [property]: value });
  };
  React.useEffect(() => {
    const timer = setTimeout(commit, 400);
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-3 shadow-card">
      <label className="flex flex-col gap-1">
        <span className="text-footnote font-semibold text-label-2">{label}</span>
        <input
          aria-label={label}
          type="number"
          min={0}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="h-10 w-full min-w-0 rounded-lg bg-fill px-2 text-title-2 font-semibold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
      </label>
      {max !== undefined && <p className="mt-1 text-caption text-label-2">of {max}</p>}
    </div>
  );
};

const Identity = () => {
  const { updatedTrainer: trainer, editingMode, updateTrainer } = useTrainer();
  const { data: natures } = useNaturesControllerFindAll({});
  if (!trainer) return null;
  const fieldClass =
    "h-11 w-full rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg";
  if (editingMode !== "edit")
    return (
      <Group title="Trainer">
        <Row title="Nature" value={trainer.nature?.name ?? "None"} />
        <Row title="Rank" value={formatEnumName(trainer.rank)} />
      </Group>
    );
  return (
    <Group title="Trainer">
      <div className="flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1 text-footnote text-label-2">
          Name
          <input value={trainer.name} onChange={(event) => updateTrainer({ name: event.target.value })} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-footnote text-label-2">
          Age
          <input
            type="number"
            min={0}
            value={trainer.age}
            onChange={(event) => updateTrainer({ age: Number(event.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-footnote text-label-2">
          Rank
          <select value={trainer.rank} onChange={(event) => updateTrainer({ rank: event.target.value as Rank })} className={fieldClass}>
            {Object.values(Rank).map((rank) => (
              <option key={rank} value={rank}>
                {formatEnumName(rank)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-footnote text-label-2">Nature</span>
          <Picker
            label="Nature"
            value={trainer.nature?.id ?? ""}
            clearable={false}
            items={(natures ?? []).map((nature) => ({ value: nature.id, label: nature.name }))}
            onChange={(id) => {
              const nature = natures?.find((entry) => entry.id === id);
              if (nature) updateTrainer({ nature });
            }}
          />
        </div>
      </div>
    </Group>
  );
};

export const TrainerSheet = () => {
  const { updatedTrainer: trainer, isError, updateTrainer } = useTrainer();
  if (isError)
    return (
      <>
        <PageHeader title="Trainer" back={{ to: "/myTrainers", label: "Trainers" }} />
        <div className="mx-4 rounded-2xl bg-surface p-8 text-center shadow-card">
          <p className="text-body">This trainer couldn’t be loaded.</p>
          <Link to="/myTrainers" className={cn(button({ variant: "tinted" }), "mt-3")}>
            Back to trainers
          </Link>
        </div>
      </>
    );
  if (!trainer)
    return (
      <div aria-hidden className="space-y-4 p-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-60 rounded-xl" />
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl pb-8">
      <TrainerSheetHeader />
      <div className="flex flex-col gap-6 px-4 lg:px-8">
        <div className="grid grid-cols-3 gap-3">
          <Resource property="currentHp" label="HP" max={trainer.stats.vitality + 5} />
          <Resource property="currentWill" label="Will" max={trainer.stats.insight + 4} />
          <Resource property="money" label="Money" />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            <Identity />
            <Group title="Party" action={<span className="text-footnote text-label-2">{trainer.pokemon.length} Pokémon</span>}>
              {trainer.pokemon.length ? (
                <ul className="flex flex-wrap gap-2 p-3">
                  {trainer.pokemon.slice(0, 6).map((pokemon) => (
                    <li key={pokemon.id}>
                      <Link
                        to={`/myPokemon/${pokemon.id}`}
                        className="flex w-24 flex-col items-center gap-1 rounded-xl p-2 text-center hover:bg-raised"
                      >
                        <Sprite image={pokemon.pokemonTemplate.image} set="box" className="h-14 w-17" />
                        <span className="w-full truncate text-footnote">{pokemon.nickname || pokemon.pokemonTemplate.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-subhead text-label-2">
                  No Pokémon assigned yet. Choose this trainer from a Pokémon’s sheet to add it to the party.
                </p>
              )}
            </Group>
            <StatGroup type="attribute" title="Attributes" />
            <StatGroup type="social" title="Socials" />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Group title="Inventory" action={<InventorySection />}>
              <InventoryList
                inventoryItems={trainer.inventory}
                onChange={(index, quantity) =>
                  updateTrainer({ inventory: trainer.inventory.map((entry, at) => (at === index ? { ...entry, quantity } : entry)) })
                }
                onDelete={(index) => updateTrainer({ inventory: trainer.inventory.filter((_, at) => at !== index) })}
              />
            </Group>
            <StatGroup type="skill" title="Skills" />
          </div>
        </div>
      </div>
    </div>
  );
};
