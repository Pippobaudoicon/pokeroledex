import { Dice5 } from "lucide-react";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Shared by MoveCard (Moves page) and MoveRow (Pokédex and Pokémon sheets).

/** Dice in a pool like "4/5" (a choice of attributes): roll the larger, as the corebook advises (p. 57). */
export const poolDice = (pool: string | undefined) => {
  const choices = pool?.split("/").map(Number) ?? [];
  return choices.length > 0 && choices.every((dice) => Number.isInteger(dice) && dice > 0) ? Math.max(...choices) : undefined;
};

export const STAB_HINT = "S.T.A.B.: same type as the Pokémon, +1 damage die";

/**
 * Explains a value on mouse hover, or on tap on touch screens. A popover rather than a tooltip so a tap
 * elsewhere closes it, and the click is kept from toggling the card.
 */
export const Hint = ({ hint, className, children }: { hint?: string; className?: string; children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  if (!hint) return <span className={className}>{children}</span>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>
        <span
          role="button"
          tabIndex={0}
          className={`move-hint ${className ?? ""}`}
          onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
          onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        collisionPadding={8}
        className="w-auto max-w-xs rounded-xl border-hairline px-3 py-2 text-subhead shadow-float"
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Returning focus to this trigger would close a hint opened meanwhile on another value.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
      >
        {hint}
      </PopoverContent>
    </Popover>
  );
};

/** Dice count at the end of a pool line; tap to roll that pool. */
export const RollChip = ({
  dice,
  label,
  title,
  onClick,
}: {
  dice: number;
  label: string;
  title: string;
  onClick: (event: React.MouseEvent) => void;
}) => {
  const className =
    "ml-1 inline-flex min-h-9 items-center gap-1 rounded-lg bg-tint/10 px-2 align-middle text-subhead font-semibold text-tint hover:bg-tint/15 lg:min-h-7";
  const content = (
    <>
      <Dice5 size={14} aria-hidden />
      {dice}
    </>
  );
  return (
    <button
      type="button"
      className={className}
      aria-label={`Roll ${label}: ${dice} dice`}
      title={`${title}. Tap to roll.`}
      onClick={onClick}
    >
      {content}
    </button>
  );
};
