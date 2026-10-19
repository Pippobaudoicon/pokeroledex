import { Minus, Plus } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** iOS switch. */
export const Switch = ({
  checked,
  onChange,
  id,
  "aria-label": label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
}) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-7.5 w-12.5 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 lg:h-5.5 lg:w-9",
      checked ? "bg-hp" : "bg-fill-strong",
    )}
  >
    <span
      aria-hidden
      className={cn(
        "size-6.5 rounded-full bg-white shadow-card transition-transform duration-250 ease-spring lg:size-4.5",
        checked && "translate-x-5 lg:translate-x-3.5",
      )}
    />
  </button>
);

/** − value + stepper. The buttons carry the field name, so each reads as "Increase Strength". */
export const Stepper = ({
  label,
  value,
  onChange,
  min,
  max,
  display,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Text shown instead of the number, e.g. "Any" for 0. */
  display?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("inline-flex items-center rounded-full bg-fill", className)}>
    <button
      type="button"
      aria-label={`Decrease ${label}`}
      disabled={value <= min}
      onClick={() => onChange(Math.max(min, value - 1))}
      className="grid size-11 place-items-center rounded-full text-label transition-colors hover:bg-fill-strong active:scale-95 disabled:opacity-30 lg:size-7"
    >
      <Minus aria-hidden className="size-4" />
    </button>
    <output aria-live="polite" aria-label={label} className="min-w-8 text-center text-body font-semibold tabular-nums lg:min-w-6">
      {display ?? value}
    </output>
    <button
      type="button"
      aria-label={`Increase ${label}`}
      disabled={value >= max}
      onClick={() => onChange(Math.min(max, value + 1))}
      className="grid size-11 place-items-center rounded-full text-label transition-colors hover:bg-fill-strong active:scale-95 disabled:opacity-30 lg:size-7"
    >
      <Plus aria-hidden className="size-4" />
    </button>
  </div>
);

/** Rounded toggle chip for filters (types, habitats). */
export const Chip = ({
  pressed,
  onClick,
  children,
  className,
  style,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    style={style}
    className={cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-subhead font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 lg:h-7 lg:px-2.5",
      pressed ? "border-transparent bg-label text-white" : "border-hairline bg-surface text-label hover:bg-raised",
      className,
    )}
  >
    {children}
  </button>
);
