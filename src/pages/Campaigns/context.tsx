import * as React from "react";
import type * as T from "../../../shared/types";
import { useCampaignsControllerFindOne } from "@/api/components";

export interface CampaignContextValue {
  /** The campaign being edited (local copy; edits are never sent to the API). */
  campaign: T.Campaign | undefined;
  isLoading: boolean;
  isError: boolean;
  updateCampaign: (changes: Partial<T.Campaign>) => void;
}

const CampaignContext = React.createContext<CampaignContextValue | undefined>(
  undefined,
);

export const CampaignProvider = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const { data, isLoading, isError } = useCampaignsControllerFindOne({
    pathParams: { id },
  });
  const [campaign, setCampaign] = React.useState(data);

  const updateCampaign = (changes: Partial<T.Campaign>) => {
    if (campaign === undefined) return;
    setCampaign((current) =>
      current === undefined ? current : { ...current, ...changes },
    );
  };

  React.useEffect(() => {
    setCampaign(data);
  }, [data]);

  const value: CampaignContextValue = {
    campaign,
    isLoading,
    isError,
    updateCampaign,
  };
  return (
    <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = React.useContext(CampaignContext);
  if (context === undefined)
    throw new Error(
      "useCampaignContext must be used within a CampaignProvider",
    );
  return context;
};
