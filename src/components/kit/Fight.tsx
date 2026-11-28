import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";

/** Glowing, orbiting red border for a Pokémon in an active encounter; on a shiny one it replaces the animated gold edge, inside the gold ring. */
export const fightBorder = "fight-border";

/** Clashing swords for a Pokémon in an active encounter (the label stays for screen readers). */
export const FightMark = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex items-center text-[#d92d20]", className)} title="In an encounter">
    <Swords aria-hidden className="size-3.5 shrink-0" />
    <span className="sr-only">In an encounter</span>
  </span>
);
