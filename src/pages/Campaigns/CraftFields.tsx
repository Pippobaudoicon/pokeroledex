import { Hammer } from "lucide-react";
import { CRAFTING_SKILLS, type CraftKind, type CraftSettings, type CraftingSkill, POKEMON_TYPES, type PokemonType, type Tier } from "../../../shared/types";
import { assistFor, type Recipe, researchNeeds, TIERS } from "../../../shared/crafting";
import { button } from "@/components/kit/button";
import { Chip, Switch } from "@/components/kit/Controls";
import { TypeDot } from "@/components/kit/Pills";
import { formatEnumName } from "@/lib/utils";
import { Field, field } from "@/pages/Campaigns/common";

const OUTPUT: Record<CraftKind, string> = {
  item: "this item, into city storage",
  move: "a TM of this move, into city storage",
  ability: "an Ability Capsule of this ability, into city storage",
  pokemon: "a new resident of the city",
};

/** Drops unset keys, so an untouched recipe is sent as null (the defaults). */
const tidy = (craft: CraftSettings): CraftSettings | null => {
  const result = Object.fromEntries(Object.entries(craft).filter(([, value]) => value !== undefined)) as CraftSettings;
  return Object.keys(result).length ? result : null;
};

/**
 * How a campaign city researches and crafts this entry. `base` is the default recipe for the entry
 * as it is being edited; `value` holds only the changes from it.
 */
export const CraftFields = ({
  kind,
  base,
  value,
  onChange,
}: {
  kind: CraftKind;
  base: Recipe;
  value: CraftSettings | null | undefined;
  onChange: (craft: CraftSettings | null) => void;
}) => {
  const craft = value ?? {};
  const set = (changes: Partial<CraftSettings>) => onChange(tidy({ ...craft, ...changes }));
  const craftable = craft.craftable ?? base.craftable;
  const tier = craft.tier ?? base.tier;
  const skill = craft.skill ?? base.skill;
  const catalyst = craft.catalyst !== undefined ? (craft.catalyst ?? []) : (base.catalyst ?? []);
  const research = researchNeeds({ tier, alwaysResearch: base.alwaysResearch });
  const assist = kind === "item" ? base.assist : assistFor(kind, tier);
  const toggle = (type: PokemonType) => {
    const next = catalyst.includes(type) ? catalyst.filter((entry) => entry !== type) : [...catalyst, type];
    set({ catalyst: next.length ? next : null });
  };
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl bg-fill/50 p-3">
      <legend className="sr-only">City crafting</legend>
      <div className="flex items-center gap-3">
        <Hammer aria-hidden className="size-5 shrink-0 text-tint" />
        <div className="min-w-0 flex-1">
          <p className="text-subhead font-medium">Craftable in campaign cities</p>
          <p className="text-footnote text-label-2">Makes {OUTPUT[kind]}.</p>
        </div>
        <Switch aria-label="Craftable in campaign cities" checked={craftable} onChange={(next) => set({ craftable: next === base.craftable ? undefined : next })} />
      </div>
      {craftable && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tier">
              <select
                className={field}
                value={craft.tier ?? ""}
                onChange={(event) => set({ tier: event.target.value ? (Number(event.target.value) as Tier) : undefined })}
              >
                <option value="">Default (tier {base.tier})</option>
                {Object.keys(TIERS).map((entry) => (
                  <option key={entry} value={entry}>
                    Tier {entry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Skill">
              <select className={field} value={craft.skill ?? ""} onChange={(event) => set({ skill: (event.target.value || undefined) as CraftingSkill | undefined })}>
                <option value="">Default ({formatEnumName(base.skill)})</option>
                {CRAFTING_SKILLS.map((entry) => (
                  <option key={entry} value={entry}>
                    {formatEnumName(entry)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-subhead font-medium">Catalyst types</span>
              {craft.catalyst !== undefined && (
                <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => set({ catalyst: undefined })}>
                  Use default
                </button>
              )}
            </div>
            <div role="group" aria-label="Catalyst types" className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 lg:mx-0 lg:flex-wrap lg:px-0">
              {POKEMON_TYPES.map((type) => (
                <Chip key={type} pressed={catalyst.includes(type)} onClick={() => toggle(type)}>
                  <TypeDot type={type} className="size-4" />
                  {formatEnumName(type)}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-footnote text-label-2">
            Needs {TIERS[tier].minSkill} {formatEnumName(skill)} and a {formatEnumName(TIERS[tier].minRank)} city
            {assist ? `, ${formatEnumName(assist.skill)} ${assist.min}` : ""}
            {research ? `, plus ${research.steps} research ${research.steps === 1 ? "step" : "steps"} (Research ${research.minResearch}+)` : ""}
            {catalyst.length ? `, and a ${catalyst.map(formatEnumName).join(" or ")} resident in Catalyst` : ""}. Each costs {TIERS[tier].effort}{" "}
            {formatEnumName(skill)}.
          </p>
        </>
      )}
    </fieldset>
  );
};
