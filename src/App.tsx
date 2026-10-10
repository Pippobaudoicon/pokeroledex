import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { PokemonType } from "@/api/schemas";
import { TypeEffectiveness } from "@/components/TypeEffectiveness";
import { Toaster } from "@/components/ui/toaster";
import { ErrorPage } from "@/ErrorPage";
import { AppLayout } from "@/layout/AppLayout";
import { appRoutes } from "@/routes";

const UiTestPage = () => (
  <div className="flex">
    <TypeEffectiveness typeOne={PokemonType.FIRE} typeTwo={PokemonType.GHOST} />
  </div>
);

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <QueryClientProvider client={queryClient}>
        <AppLayout />
        <Toaster />
      </QueryClientProvider>
    ),
    errorElement: <ErrorPage />,
    children: [
      ...appRoutes.map((route) => ({ path: route.path, element: route.page })),
      { path: "/ui-test", element: <UiTestPage /> },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;
