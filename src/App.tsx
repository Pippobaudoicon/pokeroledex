import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { useAuth } from "@/api/client";
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

const RequireAuth = ({ children, redirectPath = "/home" }: { children: React.ReactNode; redirectPath?: string }) => {
  const { isAuthenticated, loginWithRedirect } = useAuth();
  if (isAuthenticated) return <>{children}</>;
  loginWithRedirect({ appState: { returnTo: window.location.pathname } });
  return <Navigate to={redirectPath} replace={true} />;
};

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
      ...appRoutes.map((route) => ({
        path: route.path,
        element: route.protected ? <RequireAuth redirectPath="/home">{route.page}</RequireAuth> : route.page,
      })),
      { path: "/ui-test", element: <UiTestPage /> },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;
