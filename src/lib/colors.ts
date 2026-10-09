interface Rgb {
  red: number;
  green: number;
  blue: number;
}

/** Picks black or white text for a Tailwind `bg-*` class by measuring its rendered luminance. */
export const getContrastTextColor = (backgroundClass: string) => {
  const colorName = backgroundClass.replace(/bg-/, "");
  const color = resolveBackgroundColor(backgroundClass);
  if (color === undefined)
    throw new Error(`Color ${colorName} not found in tailwind config`);
  let rgb: Rgb | undefined;
  if (color.startsWith("rgb")) rgb = parseRgb(color);
  if (color.startsWith("hsl")) rgb = parseHsl(color);
  if (color.startsWith("#")) rgb = parseHex(color);
  return 0.2126 * rgb!.red + 0.7152 * rgb!.green + 0.0722 * rgb!.blue > 165
    ? "text-pokerole-black"
    : "text-white";
};
const resolveBackgroundColor = (className: string): string | undefined => {
  const probe = document.createElement("div");
  probe.className = className;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  return color;
};
const parseRgb = (color: string): Rgb => {
  const parts = color
    .replace("rgba(", "")
    .replace("rgb(", "")
    .replace(")", "")
    .split(",");
  const red = parseInt(parts[0]);
  const green = parseInt(parts[1]);
  const blue = parseInt(parts[2]);
  return {
    red,
    green,
    blue,
  };
};
const parseHex = (color: string): Rgb => {
  const hex = color.replace("#", "");
  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);
  return {
    red,
    green,
    blue,
  };
};
const parseHsl = (color: string): Rgb => {
  const parts = color
    .replace("hsla(", "")
    .replace("hsl(", "")
    .replace(")", "")
    .split(",");
  const hue = parseInt(parts[0]);
  const saturation = parseInt(parts[1].replace("%", ""));
  const lightness = parseInt(parts[2].replace("%", ""));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue >= 0 && hue < 60) {
    red = chroma;
    green = x;
    blue = 0;
  } else if (hue >= 60 && hue < 120) {
    red = x;
    green = chroma;
    blue = 0;
  } else if (hue >= 120 && hue < 180) {
    red = 0;
    green = chroma;
    blue = x;
  } else if (hue >= 180 && hue < 240) {
    red = 0;
    green = x;
    blue = chroma;
  } else if (hue >= 240 && hue < 300) {
    red = x;
    green = 0;
    blue = chroma;
  } else if (hue >= 300 && hue < 360) {
    red = chroma;
    green = 0;
    blue = x;
  }
  red = Math.floor((red + m) * 255);
  green = Math.floor((green + m) * 255);
  blue = Math.floor((blue + m) * 255);
  return {
    red,
    green,
    blue,
  };
};
