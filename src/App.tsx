import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as React from "react";
import { RouterProvider, createBrowserRouter, useLocation } from "react-router-dom";

import { PokemonType } from "@/api/schemas";
import { PageHeader } from "@/components/kit/PageHeader";
import { TypeEffectiveness } from "@/components/TypeEffectiveness";
import { Toaster } from "@/components/ui/toaster";
import { ErrorPage } from "@/ErrorPage";
import { AppShell } from "@/layout/AppShell";
import { activeNav } from "@/layout/nav";
import { CampaignsPage } from "@/pages/Campaigns";
import { GeneratorsPage } from "@/pages/Generators";
import { EncounterProvider } from "@/pages/Generators/Encounters";
import { HomePage } from "@/pages/Home";
import { ImportPage } from "@/pages/Import";
import { ItemsPage } from "@/pages/Items";
import { MovesPage } from "@/pages/Moves";
import { MyPokemonPage } from "@/pages/MyPokemon";
import { MyTrainersPage } from "@/pages/MyTrainers";
import { PokedexPage } from "@/pages/PokemonCatalog";
import { RulebookPage } from "@/pages/Rulebook";

const UiTestPage = () => (
  <div className="flex">
    <TypeEffectiveness typeOne={PokemonType.FIRE} typeTwo={PokemonType.GHOST} />
  </div>
);

/** Pages not yet redesigned keep their dark styling under the new bar. */
const Legacy = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const section = activeNav(pathname);
  const depth = pathname.split("/").filter(Boolean).length;
  return (
    <div className="flex min-h-[calc(100dvh-56px-env(safe-area-inset-bottom))] flex-col lg:min-h-dvh">
      <PageHeader
        compact
        title={section.label}
        back={depth > 1 ? { to: section.to, label: section.label } : { to: "/", label: "Home" }}
        className="bg-canvas/80 backdrop-blur-xl"
      />
      <div className="app-layout flex-1 bg-pokerole-gray">{children}</div>
    </div>
  );
};

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <QueryClientProvider client={queryClient}>
        <EncounterProvider>
          <AppShell />
          <Toaster />
        </EncounterProvider>
      </QueryClientProvider>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "home", element: <HomePage /> },
      { path: "pokemon/:id?", element: <PokedexPage /> },
      { path: "myPokemon/:id?", element: <MyPokemonPage /> },
      { path: "moves", element: <MovesPage /> },
      { path: "items/:id?", element: <ItemsPage /> },
      { path: "generators/:generator?", element: <GeneratorsPage /> },
      { path: "myTrainers/:id?", element: <MyTrainersPage /> },
      { path: "campaigns/:id?", element: <Legacy><CampaignsPage /></Legacy> },
      { path: "import", element: <Legacy><ImportPage /></Legacy> },
      { path: "rulebook", element: <Legacy><RulebookPage /></Legacy> },
      { path: "ui-test", element: <UiTestPage /> },
      { path: "*", element: <ErrorPage notFound /> },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;
