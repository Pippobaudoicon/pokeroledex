import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * iOS segmented control as an ARIA tablist: arrow keys move between segments, and the
 * thumb glides to the selected one. Panels use `segmentPanelProps` to stay linked.
 * A value matching no option shows no thumb (another tablist owns the selection).
 */
export const Segmented = <V extends string>({
  label,
  options,
  value,
  onChange,
  idPrefix,
  className,
}: {
  label: string;
  options: { value: V; label: React.ReactNode }[];
  value: V;
  onChange: (value: V) => void;
  idPrefix: string;
  className?: string;
}) => {
  const index = options.findIndex((option) => option.value === value);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (next: number) => {
    const wrapped = (next + options.length) % options.length;
    onChange(options[wrapped].value);
    refs.current[wrapped]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("relative grid auto-cols-fr grid-flow-col rounded-[10px] bg-fill p-0.5", className)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") move(index + 1);
        else if (event.key === "ArrowLeft") move(index - 1);
        else if (event.key === "Home") move(0);
        else if (event.key === "End") move(options.length - 1);
        else return;
        event.preventDefault();
      }}
    >
      {index !== -1 && (
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0.5 rounded-lg bg-surface shadow-[0_2px_6px_rgb(40_32_20/0.12),0_0_0_0.5px_rgb(40_32_20/0.06)] transition-transform duration-250 ease-spring"
          style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        />
      )}
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          ref={(element) => {
            refs.current[optionIndex] = element;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${option.value}`}
          aria-selected={option.value === value}
          aria-controls={`${idPrefix}-panel-${option.value}`}
          tabIndex={option.value === value || (index === -1 && optionIndex === 0) ? 0 : -1}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 h-10 rounded-lg px-2 text-subhead font-semibold transition-colors duration-150 lg:h-7",
            option.value === value ? "text-label" : "text-label-2 hover:text-label",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export const segmentPanelProps = (idPrefix: string, value: string) => ({
  role: "tabpanel" as const,
  id: `${idPrefix}-panel-${value}`,
  "aria-labelledby": `${idPrefix}-tab-${value}`,
});
