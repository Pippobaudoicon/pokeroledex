import { Backpack, BookOpen, Compass, Dices, Download, Home, Swords, Users } from "lucide-react";
import type * as React from "react";
import { Pokeball } from "@/components/kit/Pokeball";

export interface NavItem {
  to: string;
  label: string;
  /** One line on what the section is for, shown on Home and in Search. */
  hint: string;
  icon: React.ReactNode;
  /** Settings-style icon tile colour. */
  tile: string;
}

const Ball = () => <Pokeball strokeWidth={9} />;
const FilledBall = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 4a46 46 0 0 1 46 40H66a16 16 0 0 0-32 0H4A46 46 0 0 1 50 4Z" fill="currentColor" />
    <path d="M4 56h30a16 16 0 0 0 32 0h30A46 46 0 0 1 4 56Z" fill="currentColor" opacity=".45" />
    <circle cx="50" cy="50" r="9" fill="currentColor" />
  </svg>
);

export const home: NavItem = { to: "/", label: "Home", hint: "Your Pokémon, trainers and every section", icon: <Home />, tile: "bg-label-2" };

export const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Reference",
    items: [
      { to: "/pokemon", label: "Pokédex", hint: "Every species and form, with stats and moves", icon: <Ball />, tile: "bg-tint" },
      { to: "/moves", label: "Moves", hint: "Accuracy, damage and effects", icon: <Swords />, tile: "bg-[#c2410c]" },
      { to: "/items", label: "Items", hint: "Held items, medicine, balls and TMs", icon: <Backpack />, tile: "bg-[#7c3aed]" },
      { to: "/rulebook", label: "Rulebook", hint: "Read, search and ask the corebook", icon: <BookOpen />, tile: "bg-[#0e7490]" },
    ],
  },
  {
    title: "Your game",
    items: [
      { to: "/myPokemon", label: "My Pokémon", hint: "Sheets for play: HP, Will, moves and dice", icon: <FilledBall />, tile: "bg-[#b91c1c]" },
      { to: "/myTrainers", label: "Trainers", hint: "Trainer sheets, party and bag", icon: <Users />, tile: "bg-[#1d4ed8]" },
      { to: "/campaigns", label: "Campaigns", hint: "Custom Pokémon, moves, items and abilities", icon: <Compass />, tile: "bg-[#047857]" },
    ],
  },
  {
    title: "Tools",
    items: [
      { to: "/generators", label: "Generators", hint: "Random Pokémon, items and encounters", icon: <Dices />, tile: "bg-[#a16207]" },
      { to: "/import", label: "Import", hint: "Bring your data over from pokeroledex.nl", icon: <Download />, tile: "bg-[#475569]" },
    ],
  },
];

export const allNavItems = [home, ...navSections.flatMap((section) => section.items)];

/** The nav item a path belongs to, by its first segment. */
export const activeNav = (pathname: string) => {
  const first = `/${pathname.split("/")[1] ?? ""}`;
  return allNavItems.find((item) => item.to === first) ?? home;
};
