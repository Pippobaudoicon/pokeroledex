import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared animated gold border for shiny Pokémon on every surface. */
export const shinyRing = "shiny-border ring-2 ring-pokerole-yellow";

/** Sparkles and "Shiny"; `compact` keeps only the icon (the word stays for screen readers). */
export const ShinyMark = ({ compact = false, className }: { compact?: boolean; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 font-semibold text-label", className)} title={compact ? "Shiny" : undefined}>
    <Sparkles aria-hidden className="size-3.5 shrink-0" />
    <span className={compact ? "sr-only" : undefined}>Shiny</span>
  </span>
);
