import type { PokemonType } from "@/api/schemas";
import { ClickTooltip } from "@/components/ClickTooltip";
import { TypeBadge } from "@/components/TypeBadge";
import { TypeEffectiveness } from "@/components/TypeEffectiveness";
import { cn } from "@/lib/utils";

export interface TypeBadgesProps {
  typeOne: PokemonType;
  typeTwo?: PokemonType;
  className?: string;
  pillClassName?: string;
  pillTextClassName?: string;
}

/** One or two type badges; clicking shows the combined defensive type chart. */
export const TypeBadges = ({
  typeOne,
  typeTwo,
  className = "",
  pillClassName = "",
  pillTextClassName = "",
}: TypeBadgesProps) => (
  <ClickTooltip
    trigger={
      <div className={cn("flex flex-row gap-1", className)}>
        <TypeBadge type={typeOne} className={pillClassName} textClassName={pillTextClassName} />
        {typeTwo !== undefined && (
          <TypeBadge type={typeTwo} className={pillClassName} textClassName={pillTextClassName} />
        )}
      </div>
    }
    content={<TypeEffectiveness typeOne={typeOne} typeTwo={typeTwo} />}
    contentClassName="p-3 bg-pokerole-beige max-w-[95vw]"
  />
);
