import * as React from "react";
import { ChevronDown, Dices } from "lucide-react";
import { Chip, Switch } from "@/components/kit/Controls";
import { Group } from "@/components/kit/List";

export const fieldClass =
  "h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50 lg:h-9 lg:rounded-lg";

export const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-subhead font-medium">{label}</span>
    {children}
    {hint && <span className="text-footnote text-label-2">{hint}</span>}
  </label>
);

export const ToggleField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => {
  const id = React.useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
      <label htmlFor={id} className="flex-1 text-subhead">
        {label}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} />
    </div>
  );
};

export const ChoiceGroup = <V extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { label: string; value: V; icon?: React.ReactNode }[];
  selected: V[];
  onChange: (values: V[]) => void;
}) => (
  <details className="group/choices border-b border-hairline last:border-b-0">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 text-body [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1 font-medium">{label}</span>
      <span className="text-footnote text-label-2">{selected.length ? `${selected.length} selected` : "Any"}</span>
      <ChevronDown aria-hidden className="size-4 shrink-0 text-label-3 transition-transform group-open/choices:rotate-180" />
    </summary>
    <div className="flex flex-wrap gap-1.5 px-3 pb-3" role="group" aria-label={label}>
      {options.map((option) => (
        <Chip
          key={option.value}
          pressed={selected.includes(option.value)}
          onClick={() =>
            onChange(selected.includes(option.value) ? selected.filter((value) => value !== option.value) : [...selected, option.value])
          }
          className="h-auto min-h-9 gap-1.5 py-1.5 text-left whitespace-normal lg:min-h-7"
        >
          {option.icon}
          {option.label}
        </Chip>
      ))}
      {selected.length > 0 && (
        <button
          type="button"
          className="rounded-full px-2 py-1 text-footnote font-semibold text-tint hover:bg-tint/10"
          onClick={() => onChange([])}
        >
          Clear {label.toLowerCase()}
        </button>
      )}
    </div>
  </details>
);

export const SeedInput = ({
  value,
  onChange,
  useRandomSeed,
  setUseRandomSeed,
}: {
  value: number;
  onChange: (value: string) => void;
  useRandomSeed: boolean;
  setUseRandomSeed: (useRandomSeed: boolean) => void;
}) => (
  <Group title="Randomness">
    <div className="flex flex-col gap-3 p-3">
      <ToggleField label="Random seed" checked={useRandomSeed} onChange={setUseRandomSeed} />
      <Field label="Seed" hint="Use the same seed and settings to repeat a result.">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={useRandomSeed}
          className={fieldClass}
        />
      </Field>
    </div>
  </Group>
);

export const GeneratorEmpty = ({ title, description }: { title: string; description: string }) => (
  <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card">
    <span className="grid size-14 place-items-center rounded-2xl bg-tint/10 text-tint">
      <Dices aria-hidden className="size-7" />
    </span>
    <h3 className="text-title-3 font-semibold">{title}</h3>
    <p className="max-w-sm text-subhead text-label-2">{description}</p>
  </div>
);
