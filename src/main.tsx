import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { CampaignFilterProvider } from "@/hooks/use-campaign-filter";

createRoot(document.getElementById("root")!).render(
  <CampaignFilterProvider>
    <App />
  </CampaignFilterProvider>,
);
