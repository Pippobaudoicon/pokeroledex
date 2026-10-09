import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-3xl font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-square text-md",
  {
    variants: {
      variant: {
        default: "bg-attributes-blue text-primary-foreground hover:bg-attributes-blue-dark",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-white hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        green: "bg-pokerole-green text-white hover:bg-pokerole-green/90",
        blue: "bg-attributes-blue hover:bg-attributes-blue/90 text-white",
        yellow: "bg-pokerole-yellow hover:bg-pokerole-yellow/90 text-white",
        red: "bg-pokerole-red hover:bg-pokerole-red/90 text-white",
        white: "bg-pokerole-beige-light text-pokerole-black hover:bg-pokerole-beige-light/90",
        "white-disabled": "bg-pokerole-beige-light text-pokerole-black pointer-events-none",
        transparent: "bg-transparent text-pokerole-black hover:bg-pokerole-black/20",
        beige: "bg-pokerole-beige text-pokerole-black hover:bg-pokerole-beige/90",
      },
      size: {
        default: "px-3 py-2",
        equalPadding: "p-2",
        sm: "h-9 px-3 rounded-3xl",
        lg: "h-16 px-8 rounded-3xl",
        xl: "h-20 px-10 rounded-3xl",
        xlUnbound: "min-h-20 px-3 rounded-3xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
