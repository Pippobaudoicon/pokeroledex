import type * as React from "react";
import { cn } from "@/lib/utils";

export interface TextProps {
  children?: React.ReactNode;
  /** Tailwind text color class. */
  color?: string;
  /** Tailwind text size class. */
  size?: string;
  className?: string;
  /** Tailwind font family class. */
  font?: string;
  id?: string;
}

export const Text = ({
  children,
  color = "text-pokerole-black",
  size = "text-3xl",
  className,
  font = "font-square",
  id,
}: TextProps) => (
  <p id={id} className={cn(`${color} ${size} ${className} leading-none ${font}`)}>
    {children}
  </p>
);
