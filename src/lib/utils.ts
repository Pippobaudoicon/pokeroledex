import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
