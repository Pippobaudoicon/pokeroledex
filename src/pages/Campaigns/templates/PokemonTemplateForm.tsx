import { Plus, Trash2 } from "lucide-react";
import type * as React from "react";
import { HABITAT_MACROS, habitatMacros } from "../../../../shared/habitats";
import { defaultCraft } from "../../../../shared/crafting";
import { ATTRIBUTES } from "../../../../shared/types";
import type * as T from "../../../../shared/types";
import { EvolutionDirection, EvolutionKind, type Habitat, PokemonType, Rank } from "@/api/schemas";
import { HabitatPicker } from "@/components/HabitatPicker";
import { button } from "@/components/kit/button";
import { Chip, Stepper, Switch } from "@/components/kit/Controls";
import { Group, Row } from "@/components/kit/List";
import { Picker, type PickerItem } from "@/components/kit/Picker";
import { TypeDot, typeColor, typeText } from "@/components/kit/Pills";
import { Sprite } from "@/components/kit/Sprite";
import { cn, formatEnumName } from "@/lib/utils";
import { Field, field, textArea } from "@/pages/Campaigns/common";
import { CraftFields } from "@/pages/Campaigns/CraftFields";

export interface FormMove {
  moveId: string;
  rank: Rank;
}

/** An evolution row as edited: direction and kind may be unset, and speed is free text. */
export type FormEvolution = T.EvolutionBody;

/** Optional ids and texts are "" while unset. */
export interface TemplateFormData {
  name: string;
  dexID: string;
  number: number;
  /** The type options include TYPELESS and VARIES. */
  types: PokemonType[];
  recommendedRank: Rank;
  dexCategory: string;
  image: string;
  legendary: boolean;
  goodStarter: boolean;
  genderType: T.GenderType;
  baseHp: number;
  height: number;
  weight: number;
  baseStats: T.AttributeStats;
  maxStats: T.AttributeStats;
  abilityOneId: string;
  abilityTwoId: string;
  hiddenAbilityId: string;
  eventAbilityId: string;
  habitats: Habitat[];
  moves: FormMove[];
  evolutions: FormEvolution[];
  description: string;
  craft: T.CraftSettings | null;
}

export const emptyTemplateForm = (): TemplateFormData => ({
  name: "",
  dexID: "",
  number: 0,
  types: [],
  recommendedRank: Rank.STARTER,
  dexCategory: "",
  image: "",
  legendary: false,
  goodStarter: false,
  genderType: "",
  baseHp: 3,
  height: 1,
  weight: 10,
  baseStats: { strength: 1, dexterity: 1, vitality: 1, special: 1, insight: 1 },
  maxStats: { strength: 5, dexterity: 5, vitality: 5, special: 5, insight: 5 },
  abilityOneId: "",
  abilityTwoId: "",
  hiddenAbilityId: "",
  eventAbilityId: "",
  habitats: [],
  moves: [],
  evolutions: [],
  description: "",
  craft: null,
});

/** The first missing required field; undefined when the form can be submitted. */
export const validationError = (form: TemplateFormData) => {
  if (form.name.trim() === "") return "Add a name to save.";
  if (form.types.length === 0) return "Pick at least one type to save.";
  if (form.abilityOneId === "") return "Pick a first ability to save.";
  return undefined;
};

export interface TemplateFormOptions {
  abilities: PickerItem[];
  moves: PickerItem[];
  templates: PickerItem[];
  loading: boolean;
}

const GENDERS: { value: T.GenderType; label: string }[] = [
  { value: "", label: "Male or female" },
  { value: "M", label: "Male only" },
  { value: "F", label: "Female only" },
  { value: "N", label: "Genderless" },
];
const SPEEDS = ["Slow", "Medium", "Fast", "Unknown"];
const RANKS = Object.values(Rank);

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div className="flex min-h-8 items-end justify-between gap-2">
      <h3 className="text-footnote font-semibold uppercase tracking-wide text-label-2">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const number = (value: string, fallback: number, parse: (value: string) => number = Number.parseFloat) => {
  const parsed = parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const RemoveButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" aria-label={label} onClick={onClick} className={cn(button({ variant: "gray", size: "icon" }), "shrink-0 text-[#d92d20]")}>
    <Trash2 aria-hidden className="size-4" />
  </button>
);

export const PokemonTemplateForm = ({
  form,
  onChange,
  options,
}: {
  form: TemplateFormData;
  onChange: (form: TemplateFormData) => void;
  options: TemplateFormOptions;
}) => {
  const update = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) => onChange({ ...form, [key]: value });
  const toggleType = (type: PokemonType) => {
    if (form.types.includes(type)) update("types", form.types.filter((entry) => entry !== type));
    // A third pick replaces the oldest, so there are never more than two.
    else update("types", [...form.types, type].slice(-2));
  };
  const setStat = (key: "baseStats" | "maxStats", attribute: T.Attribute, value: number) =>
    onChange({ ...form, [key]: { ...form[key], [attribute]: value } });
  const setMove = (index: number, changes: Partial<FormMove>) =>
    update(
      "moves",
      form.moves.map((move, moveIndex) => (moveIndex === index ? { ...move, ...changes } : move)),
    );
  const setEvolution = (index: number, changes: Partial<FormEvolution>) =>
    update(
      "evolutions",
      form.evolutions.map((evolution, evolutionIndex) => (evolutionIndex === index ? { ...evolution, ...changes } : evolution)),
    );
  const abilityPicker = (key: "abilityOneId" | "abilityTwoId" | "hiddenAbilityId" | "eventAbilityId", label: string, required = false) => (
    <Field as="div" label={label} required={required}>
      <Picker label={label} items={options.abilities} loading={options.loading} value={form[key]} onChange={(id) => update(key, id)} />
    </Field>
  );
  const macros = habitatMacros(form.habitats);

  return (
    <>
      <Section title="Identity">
        <div className="flex items-end gap-3">
          <Sprite image={form.image} set="book" className="size-20 shrink-0 rounded-2xl bg-fill" />
          <Field label="Name" required className="flex-1">
            <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="off" placeholder="Pokémon name" className={field} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.number}
              onChange={(event) => update("number", number(event.target.value, 0, (value) => Number.parseInt(value, 10)))}
              className={field}
            />
          </Field>
          <Field label="Dex ID">
            <input
              value={form.dexID}
              onChange={(event) => update("dexID", event.target.value)}
              placeholder={form.number.toString().padStart(4, "0")}
              className={field}
            />
          </Field>
        </div>
        <Field label="Category">
          <input value={form.dexCategory} onChange={(event) => update("dexCategory", event.target.value)} placeholder="e.g. Seed Pokémon" className={field} />
        </Field>
        <Field label="Image file" hint="A sprite file name, e.g. 001.png, or a full image URL.">
          <input value={form.image} onChange={(event) => update("image", event.target.value)} autoComplete="off" placeholder="Optional" className={field} />
        </Field>
      </Section>

      <Section title="Type & rank">
        <div role="group" aria-label="Types, pick up to two" className="flex flex-wrap gap-2">
          {Object.values(PokemonType).map((type) => {
            const pressed = form.types.includes(type);
            return (
              <Chip
                key={type}
                pressed={pressed}
                onClick={() => toggleType(type)}
                style={pressed ? { backgroundColor: typeColor(type) } : undefined}
                className={pressed ? typeText(type) : undefined}
              >
                <TypeDot type={type} className="-ml-1.5 size-5 lg:-ml-1 lg:size-4.5" />
                {formatEnumName(type)}
              </Chip>
            );
          })}
        </div>
        <p className="text-footnote text-label-2">Pick one or two types.</p>
        <Field label="Recommended rank">
          <select value={form.recommendedRank} onChange={(event) => update("recommendedRank", event.target.value as Rank)} className={field}>
            {RANKS.map((rank) => (
              <option key={rank} value={rank}>
                {formatEnumName(rank)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Profile">
        <Group>
          <Row title="Legendary" value={<Switch aria-label="Legendary" checked={form.legendary} onChange={(legendary) => update("legendary", legendary)} />} />
          <Row
            title="Good starter"
            value={<Switch aria-label="Good starter" checked={form.goodStarter} onChange={(goodStarter) => update("goodStarter", goodStarter)} />}
          />
          <Row title="Base HP" value={<Stepper label="Base HP" value={form.baseHp} onChange={(baseHp) => update("baseHp", baseHp)} min={1} max={20} />} />
        </Group>
        <Field label="Gender">
          <select value={form.genderType} onChange={(event) => update("genderType", event.target.value as T.GenderType)} className={field}>
            {GENDERS.map((gender) => (
              <option key={gender.value} value={gender.value}>
                {gender.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (m)">
            <input
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              value={form.height}
              onChange={(event) => update("height", number(event.target.value, 0))}
              className={field}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              value={form.weight}
              onChange={(event) => update("weight", number(event.target.value, 0))}
              className={field}
            />
          </Field>
        </div>
      </Section>

      <Section title="Attributes">
        <div className="rounded-xl bg-surface px-3 py-2 shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1">
            <span />
            <span className="text-center text-footnote font-medium text-label-2">Base</span>
            <span className="text-center text-footnote font-medium text-label-2">Max</span>
            {ATTRIBUTES.map((attribute) => {
              const name = formatEnumName(attribute);
              return (
                <div key={attribute} className="contents">
                  <span className="truncate text-body">{name}</span>
                  <Stepper
                    label={`base ${name}`}
                    value={form.baseStats[attribute]}
                    onChange={(value) => setStat("baseStats", attribute, value)}
                    min={0}
                    max={10}
                  />
                  <Stepper
                    label={`max ${name}`}
                    value={form.maxStats[attribute]}
                    onChange={(value) => setStat("maxStats", attribute, value)}
                    min={0}
                    max={10}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Abilities">
        <div className="grid gap-3 sm:grid-cols-2">
          {abilityPicker("abilityOneId", "Ability 1", true)}
          {abilityPicker("abilityTwoId", "Ability 2")}
          {abilityPicker("hiddenAbilityId", "Hidden ability")}
          {abilityPicker("eventAbilityId", "Event ability")}
        </div>
      </Section>

      <Section title="Habitats">
        <HabitatPicker
          selected={form.habitats}
          onChange={(habitats) => update("habitats", habitats as Habitat[])}
          collapsible
          specificOnly
          description="Where this Pokémon lives. A macro chip picks all of its habitats."
        />
        {macros.length > 0 && (
          <p className="text-footnote text-label-2">Found in: {macros.map((macro) => HABITAT_MACROS[macro].name).join(", ")}</p>
        )}
      </Section>

      <Section
        title={`Moves${form.moves.length ? ` · ${form.moves.length}` : ""}`}
        action={
          <button
            type="button"
            className={button({ variant: "plain", size: "sm" })}
            onClick={() => update("moves", [...form.moves, { moveId: "", rank: Rank.STARTER }])}
          >
            <Plus aria-hidden className="size-4" />
            Add move
          </button>
        }
      >
        {form.moves.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-center text-subhead text-label-2 shadow-card">No learnable moves yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {form.moves.map((move, index) => (
              // Rows have no stable id until saved; the index keeps each row's pickers in place.
              <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl bg-surface p-2 shadow-card sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                <Picker
                  label={`Move ${index + 1}`}
                  items={options.moves}
                  loading={options.loading}
                  value={move.moveId}
                  onChange={(moveId) => setMove(index, { moveId })}
                  placeholder="Choose a move"
                  clearable={false}
                  className="col-span-2 sm:col-span-1"
                />
                <select
                  aria-label={`Rank for move ${index + 1}`}
                  value={move.rank}
                  onChange={(event) => setMove(index, { rank: event.target.value as Rank })}
                  className={field}
                >
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {formatEnumName(rank)}
                    </option>
                  ))}
                </select>
                <RemoveButton
                  label={`Remove move ${index + 1}`}
                  onClick={() => update("moves", form.moves.filter((_, moveIndex) => moveIndex !== index))}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Evolutions"
        action={
          <button
            type="button"
            className={button({ variant: "plain", size: "sm" })}
            onClick={() =>
              update("evolutions", [...form.evolutions, { type: EvolutionDirection.FROM, kind: EvolutionKind.LEVEL, targetId: "", speed: "Medium" }])
            }
          >
            <Plus aria-hidden className="size-4" />
            Add evolution
          </button>
        }
      >
        {form.evolutions.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-center text-subhead text-label-2 shadow-card">No evolutions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {form.evolutions.map((evolution, index) => {
              // Keep an unknown target (e.g. from a hidden campaign) selectable by its id.
              const targets = options.templates.some((template) => template.value === evolution.targetId) || !evolution.targetId
                ? options.templates
                : [...options.templates, { value: evolution.targetId, label: evolution.targetId }];
              return (
                <li key={index} className="flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-card">
                  <div className="flex gap-2">
                    <select
                      aria-label={`Direction of evolution ${index + 1}`}
                      value={evolution.type}
                      onChange={(event) => setEvolution(index, { type: event.target.value as FormEvolution["type"] })}
                      className={cn(field, "w-auto shrink-0")}
                    >
                      <option value="">—</option>
                      <option value={EvolutionDirection.FROM}>Evolves from</option>
                      <option value={EvolutionDirection.TO}>Evolves to</option>
                    </select>
                    <Picker
                      label={`Pokémon of evolution ${index + 1}`}
                      items={targets}
                      loading={options.loading}
                      value={evolution.targetId}
                      onChange={(targetId) => setEvolution(index, { targetId })}
                      placeholder="Choose a Pokémon"
                      clearable={false}
                      className="min-w-0 flex-1"
                    />
                    <RemoveButton
                      label={`Remove evolution ${index + 1}`}
                      onClick={() => update("evolutions", form.evolutions.filter((_, evolutionIndex) => evolutionIndex !== index))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <select
                      aria-label={`Method of evolution ${index + 1}`}
                      value={evolution.kind}
                      onChange={(event) => setEvolution(index, { kind: event.target.value as FormEvolution["kind"] })}
                      className={field}
                    >
                      <option value="">Method</option>
                      {Object.values(EvolutionKind).map((kind) => (
                        <option key={kind} value={kind}>
                          {formatEnumName(kind)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Speed of evolution ${index + 1}`}
                      value={evolution.speed ?? ""}
                      onChange={(event) => setEvolution(index, { speed: event.target.value })}
                      className={field}
                    >
                      <option value="">Speed</option>
                      {/* Older entries may hold a speed outside the usual four. */}
                      {[...SPEEDS, ...(evolution.speed && !SPEEDS.includes(evolution.speed) ? [evolution.speed] : [])].map((speed) => (
                        <option key={speed} value={speed}>
                          {speed}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Item for evolution ${index + 1}`}
                      value={evolution.item ?? ""}
                      onChange={(event) => setEvolution(index, { item: event.target.value })}
                      placeholder="Item (optional)"
                      className={cn(field, "col-span-2 sm:col-span-1")}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Pokédex entry">
        <textarea
          aria-label="Pokédex entry"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          rows={4}
          placeholder="Optional"
          className={textArea}
        />
      </Section>

      <Section title="City crafting">
        <CraftFields
          kind="pokemon"
          base={defaultCraft("pokemon", { id: "", name: form.name, types: form.types as T.PokemonType[], recommendedRank: form.recommendedRank, legendary: form.legendary })}
          value={form.craft}
          onChange={(craft) => update("craft", craft)}
        />
      </Section>
    </>
  );
};
