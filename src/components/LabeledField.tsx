import type * as React from "react";
import { cn } from "@/lib/utils";

export interface LabeledFieldProps {
  /** Tailwind background class. */
  color?: string;
  label?: React.ReactNode;
  topLabel?: React.ReactNode;
  /** Fraction of the width taken by the label. */
  ratio?: number;
  children?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export const LabeledField = ({
  color,
  label,
  topLabel,
  ratio = 0.3333,
  children,
  className,
  valueClassName,
}: LabeledFieldProps) => (
  <div className={`flex flex-row ${color} rounded-3xl p-2 gap-2 ${className}`}>
    {label != null && (
      <p
        className="field-label text-white font-square leading-none flex items-center justify-center"
        style={{
          flexBasis: ratio * 100 + "%",
        }}
      >
        {label}
      </p>
    )}
    <div className="field-value flex-grow flex flex-col justify-center">
      <div className="text-white font-square leading-none flex justify-center">
        {topLabel}
      </div>
      <div className={cn(`bg-pokerole-beige-light rounded-2xl p-2 ${valueClassName}`)}>
        {children}
      </div>
    </div>
  </div>
);
