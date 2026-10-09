import * as React from "react";

interface CampaignFilterState {
  campaignIds: string[];
  includeCore: boolean;
}

interface CampaignFilterContextValue {
  state: CampaignFilterState;
  setCampaignIds: (campaignIds: string[]) => void;
  setIncludeCore: (includeCore: boolean) => void;
}

const STORAGE_KEY = "pokeroledex:campaignFilter";
const defaultCampaignFilter = (): CampaignFilterState => ({
  campaignIds: [],
  includeCore: true,
});
const CampaignFilterContext = React.createContext<CampaignFilterContextValue | null>(null);
export const CampaignFilterProvider = ({ children }: { children?: React.ReactNode }) => {
  const [state, setState] = React.useState<CampaignFilterState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultCampaignFilter();
    } catch {
      return defaultCampaignFilter();
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);
  const setCampaignIds = React.useCallback((campaignIds: string[]) => {
    setState((previous) => ({
      ...previous,
      campaignIds,
    }));
  }, []);
  const setIncludeCore = React.useCallback((includeCore: boolean) => {
    setState((previous) => ({
      ...previous,
      includeCore,
    }));
  }, []);
  return (
    <CampaignFilterContext.Provider
      value={{
        state,
        setCampaignIds,
        setIncludeCore,
      }}
    >
      {children}
    </CampaignFilterContext.Provider>
  );
};
export const useCampaignFilter = () => {
  const context = React.useContext(CampaignFilterContext);
  if (context == null)
    throw new Error("useCampaignFilter must be used within provider");
  return context;
};
