import type * as React from "react";
import { cn } from "@/lib/utils";

export interface BoxProps {
  /** Tailwind background class (may carry extra classes). */
  color: string;
  children?: React.ReactNode;
  className?: string;
  withBorder?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  ref?: React.Ref<HTMLDivElement>;
}

export const Box = ({
  color,
  children,
  className,
  withBorder = false,
  onClick,
  ref,
}: BoxProps) => (
  <div
    className={cn(
      `${color} rounded-3xl ${withBorder ? "border-8 border-pokerole-black" : ""} ${className}`,
    )}
    onClick={onClick}
    ref={ref}
  >
    {children}
  </div>
);
