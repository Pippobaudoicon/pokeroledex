import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { CampaignFilterProvider } from "@/hooks/use-campaign-filter";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

createRoot(document.getElementById("root")!).render(
  <CampaignFilterProvider>
    <App />
  </CampaignFilterProvider>,
);
