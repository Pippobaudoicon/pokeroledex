import * as React from "react";
import { ChevronDown, Flame, Home, Mountain, Orbit, Snowflake, Sprout, Trees, Waves } from "lucide-react";
import { HABITAT_MACROS, habitatMacroIds, habitatName } from "../../shared/habitats";
import type { HabitatFilter, HabitatMacro } from "../../shared/habitats";
import { Chip } from "@/components/kit/Controls";

const macroIcons = {
  FOREST: Trees,
  OPEN_LAND: Sprout,
  WATER: Waves,
  ICE: Snowflake,
  HIGHLANDS: Mountain,
  ARID: Flame,
  SETTLEMENTS: Home,
  OTHERWORLDLY: Orbit,
} satisfies Record<HabitatMacro, typeof Trees>;

const macroColors = {
  FOREST: "bg-emerald-100 text-emerald-700",
  OPEN_LAND: "bg-lime-100 text-lime-700",
  WATER: "bg-blue-100 text-blue-700",
  ICE: "bg-cyan-100 text-cyan-700",
  HIGHLANDS: "bg-amber-100 text-amber-800",
  ARID: "bg-orange-100 text-orange-700",
  SETTLEMENTS: "bg-rose-100 text-rose-700",
  OTHERWORLDLY: "bg-violet-100 text-violet-700",
} satisfies Record<HabitatMacro, string>;

export const HabitatPicker = ({
  selected, onChange, collapsible = false, specificOnly = false,
  description = "Pick a whole macro habitat or specific habitats. Matches any selection.",
}: {
  selected: HabitatFilter[];
  onChange: (habitats: HabitatFilter[]) => void;
  collapsible?: boolean;
  /** Macro chips select or clear all of their specific habitats instead of the macro itself. */
  specificOnly?: boolean;
  description?: string;
}) => {
  const [expanded, setExpanded] = React.useState<HabitatMacro[]>([]);
  const id = React.useId();
  const toggle = (habitat: HabitatFilter) =>
    onChange(selected.includes(habitat) ? selected.filter(value => value !== habitat) : [...selected, habitat]);
  const macroPressed = (macro: HabitatMacro) => specificOnly
    ? HABITAT_MACROS[macro].habitats.every(habitat => selected.includes(habitat))
    : selected.includes(macro);
  const toggleMacro = (macro: HabitatMacro) => {
    if (!specificOnly) return toggle(macro);
    const habitats: readonly HabitatFilter[] = HABITAT_MACROS[macro].habitats;
    onChange(macroPressed(macro)
      ? selected.filter(value => !habitats.includes(value))
      : [...selected, ...habitats.filter(habitat => !selected.includes(habitat))]);
  };
  const content = (
    <div className="flex flex-col gap-3 p-3" role="group" aria-label="Habitats">
      <p className="text-footnote text-label-2">{description}</p>
      {habitatMacroIds.map(macro => {
        const Icon = macroIcons[macro];
        return (
        <div key={macro} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip pressed={macroPressed(macro)} onClick={() => toggleMacro(macro)}
              className="h-auto min-h-9 min-w-0 shrink py-1.5 text-left whitespace-normal lg:min-h-7">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${macroColors[macro]}`}>
                <Icon aria-hidden className="size-4" />
              </span>
              {HABITAT_MACROS[macro].name}
            </Chip>
            <button type="button" className="ml-auto flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-footnote text-label-2 hover:bg-fill"
              aria-label={`Specific habitats in ${HABITAT_MACROS[macro].name}`}
              aria-expanded={expanded.includes(macro)} aria-controls={`${id}-${macro}`}
              onClick={() => setExpanded(current => current.includes(macro) ? current.filter(value => value !== macro) : [...current, macro])}>
              {HABITAT_MACROS[macro].habitats.filter(habitat => selected.includes(habitat)).length || "Specifics"}
              <ChevronDown aria-hidden className={`size-4 ${expanded.includes(macro) ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div id={`${id}-${macro}`} hidden={!expanded.includes(macro)}
            className={expanded.includes(macro) ? "flex flex-wrap gap-1.5 border-l border-hairline pl-3" : ""}
            role="group" aria-label={HABITAT_MACROS[macro].name}>
            {HABITAT_MACROS[macro].habitats.map(habitat => (
              <Chip key={habitat} pressed={selected.includes(habitat)} onClick={() => toggle(habitat)}
                className="h-auto min-h-9 py-1.5 text-left whitespace-normal lg:min-h-7">
                {habitatName(habitat)}
              </Chip>
            ))}
          </div>
        </div>
        );
      })}
      {selected.length > 0 && (
        <button type="button" className="self-start rounded-full px-2 py-1 text-footnote font-semibold text-tint hover:bg-tint/10"
          onClick={() => onChange([])}>Clear habitats</button>
      )}
    </div>
  );
  if (!collapsible) return content;
  return (
    <details className="group/habitats border-b border-hairline last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 text-body [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 font-medium">Habitats</span>
        <span className="text-footnote text-label-2">{selected.length ? `${selected.length} selected` : "Any"}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-label-3 transition-transform group-open/habitats:rotate-180" />
      </summary>
      {content}
    </details>
  );
};
