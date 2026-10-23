import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the theme's type scale and shadows, so `text-body text-label-2` keeps both.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["large-title", "title-1", "title-2", "title-3", "headline", "body", "callout", "subhead", "footnote", "caption"] }],
      shadow: [{ shadow: ["card", "float"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** "HELD_ITEMS" -> "Held Items" */
export const formatEnumName = (value: string) =>
  value
    .split("_")
    .map((part) => capitalize(part))
    .join(" ");

/** Phones and tablets, where focusing a text field brings up the on-screen keyboard. */
export const isTouchScreen = () => window.matchMedia("(pointer: coarse)").matches;

/**
 * For Radix `onOpenAutoFocus`: on touch screens focus the dialog or popover itself instead of its
 * first field, so opening it doesn't bring up the keyboard.
 */
export const keepKeyboardDown = (event: Event) => {
  if (!isTouchScreen()) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement).focus();
};
