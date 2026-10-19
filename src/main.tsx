import { createRoot } from "react-dom/client";

import { App } from "@/App";
import "@/index.css";
import { CampaignFilterProvider } from "@/hooks/use-campaign-filter";
import { AppearanceProvider } from "@/layout/Appearance";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

createRoot(document.getElementById("root")!).render(
  <AppearanceProvider>
    <CampaignFilterProvider>
      <App />
    </CampaignFilterProvider>
  </AppearanceProvider>,
);
