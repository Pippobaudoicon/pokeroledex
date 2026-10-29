import * as React from "react";
import type { CitySkill } from "../../../shared/types";
import { APTITUDE, SKILL_AFFINITIES } from "../../../shared/crafting";
import { Sheet } from "@/components/kit/Sheet";
import { formatEnumName } from "@/lib/utils";
import { SkillIcon, skillLabel } from "./common";

const descriptions: Record<CitySkill, string> = {
  apothecary: "Makes medicines, berries, herbs, food, drinks and repels. Its value provides capacity for Apothecary recipes in the crafting order.",
  craftsmanship: "Makes clothing, camping equipment and other practical gear. Its value provides capacity for Craftsmanship recipes in the crafting order.",
  technology: "Makes Pokéballs, devices, machines and technical equipment. Its value provides capacity for Technology recipes in the crafting order.",
  metallurgy: "Makes evolution stones, gems, metal goods and mineral-based items. Its value provides capacity for Metallurgy recipes in the crafting order.",
  archaeology: "Makes relics and mystical items, including Mega Stones, Z-Crystals, plates and incense. Its value provides capacity for Archaeology recipes in the crafting order.",
  research: "Provides the dice pool for research rolls in Crafting → Research. Successes add progress towards unlocking tier 3 and higher recipes; higher tiers also require enough Research and city rank.",
  nursing: "Represents the city's ability to care for and heal Pokémon and trainers. The app tracks its value for your game; it does not automatically heal anyone or add crafting capacity.",
  foraging: "Represents the city's ability to find and gather things. The app tracks its value for your game; it does not automatically generate items or add crafting capacity.",
  catalyst: "Provides the Pokémon types required by some recipes, not dice or crafting capacity. The displayed value counts distinct types; each type also has its own strength.",
};

export const SkillHelp = ({ skill, limit }: { skill: CitySkill; limit: number }) => {
  const [open, setOpen] = React.useState(false);
  const affinity = skill === "catalyst" ? null : SKILL_AFFINITIES[skill];
  return <>
    <button type="button" aria-label={`About ${skillLabel(skill)}`} aria-haspopup="dialog" aria-expanded={open}
      title={`What ${skillLabel(skill)} does and how to increase it`}
      onClick={() => setOpen(true)}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface shadow-card hover:bg-raised outline-none focus-visible:outline-2 focus-visible:outline-focus">
      <SkillIcon skill={skill} />
    </button>
    <Sheet open={open} onOpenChange={setOpen} title={skillLabel(skill)} initialExpanded>
      <div className="space-y-5 p-4 text-body">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-headline font-semibold"><SkillIcon skill={skill} />What it does</h3>
          <p>{descriptions[skill]}</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-headline font-semibold">How to increase it</h3>
          {affinity ? <>
            <p>Drag an eligible resident onto {skillLabel(skill)}, or select the resident and then tap the skill name. Each resident can work on only one skill or action at a time.</p>
            <p>Assign more eligible residents, or use residents with a higher bonus. Full workers add their whole bonus; half workers add half, rounded down, with a minimum of 1.</p>
            <p>The total is capped at <strong>{limit}</strong> for this city's rank. Raise the city rank to raise the cap; values cannot be edited by hand.</p>
          </> : <>
            <p>Assign any resident to Catalyst. Add residents with types not already represented to increase the type count. A dual-type resident provides both types.</p>
            <p>For each type, only the strongest resident's bonus is used; duplicate types do not add together. Use a higher-bonus resident to increase that type's strength.</p>
            <p>Recipes require strength 1 at tiers 1–2, strength 2 at tiers 3–5, and strength 3 at tiers 6–8. Catalyst counts types rather than using the normal skill cap.</p>
          </>}
          <p>Resident bonuses: first evolution stage +1, second +2, third +3, species that never evolve +2, legendary +5. Mega Evolutions and alternate forms use their base form's stage.</p>
        </section>
        {affinity && <section className="space-y-2">
          <h3 className="text-headline font-semibold">Which Pokémon can work here?</h3>
          <p><strong>Full-bonus types:</strong> {affinity.full.map(formatEnumName).join(", ")}.</p>
          <p><strong>Half-bonus types:</strong> {affinity.half.map(formatEnumName).join(", ")}.</p>
          <p>These are starting affinities. A species' maximum {formatEnumName(affinity.attribute)} of {APTITUDE.raise}+ raises half to full; {APTITUDE.open}+ opens an otherwise closed skill at half. These are species limits, not the resident's trained stats. Species-specific exceptions can override this.</p>
          <p>Check <strong>City work</strong> on the species' Pokédex page for its actual work profile.</p>
        </section>}
      </div>
    </Sheet>
  </>;
};
