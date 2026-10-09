import type * as React from "react";
import { FaFistRaised, FaHome, FaUserFriends } from "react-icons/fa";
import { FaCompass } from "react-icons/fa6";
import { GiBigGear, GiBottledBolt } from "react-icons/gi";
import { MdCatchingPokemon } from "react-icons/md";
import { TbPokeball } from "react-icons/tb";
import { CampaignsPage } from "@/pages/Campaigns";
import { GeneratorsPage } from "@/pages/Generators";
import { HomePage } from "@/pages/Home";
import { ItemsPage } from "@/pages/Items";
import { MovesPage } from "@/pages/Moves";
import { MyPokemonPage } from "@/pages/MyPokemon";
import { MyTrainersPage } from "@/pages/MyTrainers";
import { PokemonCatalogPage } from "@/pages/PokemonCatalog";
export interface AppRoute {
  path: string;
  name: string;
  icon: React.ReactElement;
  page: React.ReactElement;
  /** Detail routes that should not appear in the navigation. */
  ignoreLink?: boolean;
  /** Only reachable when signed in (always true locally). */
  protected?: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    name: "Home",
    icon: <FaHome />,
    page: <HomePage />,
    ignoreLink: true,
  },
  {
    path: "/home",
    name: "Home",
    icon: <FaHome />,
    page: <HomePage />,
  },
  {
    path: "/pokemon",
    name: "Pokemon",
    icon: <TbPokeball />,
    page: <PokemonCatalogPage />,
  },
  {
    path: "/pokemon/:id",
    name: "Pokemon",
    icon: <TbPokeball />,
    page: <PokemonCatalogPage />,
    ignoreLink: true,
  },
  {
    path: "/moves",
    name: "Moves",
    icon: <FaFistRaised />,
    page: <MovesPage />,
  },
  {
    path: "/items",
    name: "Items",
    icon: <GiBottledBolt />,
    page: <ItemsPage />,
  },
  {
    path: "/items/:id",
    name: "Items",
    icon: <GiBottledBolt />,
    page: <ItemsPage />,
    ignoreLink: true,
  },
  {
    path: "/generators",
    name: "Generators",
    icon: <GiBigGear />,
    page: <GeneratorsPage />,
  },
  {
    path: "/generators/:generator",
    name: "Generators",
    icon: <GiBigGear />,
    page: <GeneratorsPage />,
    ignoreLink: true,
  },
  {
    path: "/myPokemon",
    name: "My Pokemon",
    icon: <MdCatchingPokemon />,
    page: <MyPokemonPage />,
    protected: true,
  },
  {
    path: "/myPokemon/:id",
    name: "My Pokemon",
    icon: <MdCatchingPokemon />,
    page: <MyPokemonPage />,
    ignoreLink: true,
    protected: true,
  },
  {
    path: "/myTrainers",
    name: "My Trainers",
    icon: <FaUserFriends />,
    page: <MyTrainersPage />,
    protected: true,
  },
  {
    path: "/myTrainers/:id",
    name: "My Trainers",
    icon: <FaUserFriends />,
    page: <MyTrainersPage />,
    ignoreLink: true,
    protected: true,
  },
  {
    path: "/campaigns",
    name: "Campaigns",
    icon: <FaCompass />,
    page: <CampaignsPage />,
    protected: true,
  },
  {
    path: "/campaigns/:id",
    name: "Campaigns",
    icon: <FaCompass />,
    page: <CampaignsPage />,
    ignoreLink: true,
    protected: true,
  },
];
