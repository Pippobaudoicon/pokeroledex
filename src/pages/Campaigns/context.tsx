import * as React from "react";
import type * as T from "../../../shared/types";
import { useCampaignsControllerFindOne } from "@/api/components";

export interface CampaignContextValue {
  campaign: T.Campaign | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const CampaignContext = React.createContext<CampaignContextValue | undefined>(undefined);

export const CampaignProvider = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { data, isLoading, isError, refetch } = useCampaignsControllerFindOne({ pathParams: { id } });
  const value = React.useMemo(() => ({ campaign: data, isLoading, isError, refetch: () => void refetch() }), [data, isLoading, isError, refetch]);
  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export const useCampaign = () => {
  const context = React.useContext(CampaignContext);
  if (context === undefined) throw new Error("useCampaign must be used within a CampaignProvider");
  return context;
};
