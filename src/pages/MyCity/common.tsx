import { Anvil, Cpu, FlaskConical, HeartPulse, Landmark, Microscope, Scissors, Search, Sparkles, type LucideIcon } from "lucide-react";
import type { CitySkill } from "../../../shared/types";
import type { ApiFetchError } from "@/api/client";
import { cn, formatEnumName } from "@/lib/utils";

export const field = "h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9";
export const panel = "rounded-2xl bg-surface p-4 shadow-card";
export const skillLabel = (skill: CitySkill) => formatEnumName(skill);

const skillIcons: Record<CitySkill, LucideIcon> = {
  apothecary: FlaskConical, craftsmanship: Scissors, technology: Cpu, metallurgy: Anvil, archaeology: Landmark,
  research: Microscope, nursing: HeartPulse, foraging: Search, catalyst: Sparkles,
};

export const SkillIcon = ({ skill, className }: { skill: CitySkill; className?: string }) => {
  const Icon = skillIcons[skill];
  return <Icon aria-hidden className={cn("size-5 shrink-0", className)} />;
};

export const errorText = (error: ApiFetchError) => {
  const detail = error.stack;
  return detail && typeof detail === "object" && "payload" in detail && typeof detail.payload === "string"
    ? detail.payload : "Check your connection and try again.";
};
