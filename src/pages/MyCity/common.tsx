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

const skillColors: Record<CitySkill, string> = {
  apothecary: "text-emerald-700 [[data-theme=dark]_&]:text-emerald-400",
  craftsmanship: "text-orange-700 [[data-theme=dark]_&]:text-orange-400",
  technology: "text-blue-700 [[data-theme=dark]_&]:text-blue-400",
  metallurgy: "text-slate-600 [[data-theme=dark]_&]:text-slate-300",
  archaeology: "text-amber-700 [[data-theme=dark]_&]:text-amber-400",
  research: "text-violet-700 [[data-theme=dark]_&]:text-violet-400",
  nursing: "text-rose-700 [[data-theme=dark]_&]:text-rose-400",
  foraging: "text-teal-700 [[data-theme=dark]_&]:text-teal-400",
  catalyst: "text-fuchsia-700 [[data-theme=dark]_&]:text-fuchsia-400",
};

export const SkillIcon = ({ skill, className }: { skill: CitySkill; className?: string }) => {
  const Icon = skillIcons[skill];
  return <Icon aria-hidden className={cn("size-5 shrink-0", skillColors[skill], className)} />;
};

export const errorText = (error: ApiFetchError) => {
  const detail = error.stack;
  return detail && typeof detail === "object" && "payload" in detail && typeof detail.payload === "string"
    ? detail.payload : "Check your connection and try again.";
};
