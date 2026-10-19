import { cva } from "class-variance-authority";

/** iOS-style buttons: 44px tall on touch screens, Mac-sized (32px) on desktop. */
export const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold whitespace-nowrap select-none transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        filled: "bg-tint text-white hover:bg-tint-hover",
        tinted: "bg-tint/10 text-tint hover:bg-tint/15",
        gray: "bg-fill text-label hover:bg-fill-strong",
        plain: "text-tint hover:bg-tint/10",
        destructive: "bg-tint/10 text-tint hover:bg-tint/15",
        surface: "bg-surface text-label shadow-card hover:bg-raised",
      },
      size: {
        md: "h-11 px-4 rounded-xl text-callout lg:h-8 lg:px-3 lg:rounded-lg",
        lg: "h-12 px-5 rounded-2xl text-headline lg:h-9 lg:px-4 lg:rounded-lg",
        sm: "h-9 px-3 rounded-full text-subhead lg:h-7 lg:px-2.5",
        icon: "size-11 rounded-full lg:size-8",
      },
    },
    defaultVariants: { variant: "gray", size: "md" },
  },
);
