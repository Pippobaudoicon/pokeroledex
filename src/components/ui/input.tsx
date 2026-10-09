import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Render a bare input that inherits its surroundings (used inside stat boxes). */
  styleLess?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, styleLess, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      styleLess
        ? "hide-arrows p-0 m-0 bg-transparent text-lg font-move w-full focus:outline-none focus:ring-0"
        : "hide-arrows flex w-full rounded-3xl font-square text-xl text-pokerole-black border-none bg-pokerole-beige-light p-1 px-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokerole-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
