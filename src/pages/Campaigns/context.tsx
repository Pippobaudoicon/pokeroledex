// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  useCampaignsControllerFindOne,
  useCampaignsControllerUpdate,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
const CampaignContext = React.createContext(undefined);
export const CampaignProvider = ({ id: e, children: t }) => {
  const n = useQueryClient(),
    {
      data: r,
      isLoading: o,
      isError: s,
    } = useCampaignsControllerFindOne(
      {
        pathParams: {
          id: e,
        },
      },
      {
        enabled: e !== undefined,
      },
    ),
    [i, l] = React.useState(r),
    [c, u] = React.useState(r),
    { mutate: f } = useCampaignsControllerUpdate({
      onSuccess: () => {
        n.invalidateQueries(
          queryKeyFn({
            path: "/campaigns/{id}",
            variables: {
              pathParams: {
                id: e,
              },
            },
          }),
        );
      },
    }),
    p = () => {
      c !== undefined &&
        i !== undefined &&
        (c === i ||
          c === r ||
          (f({
            body: {
              id: c.id,
              name: c.name,
              isCore: c.isCore,
              allowedUserIds: c.allowedUserIds,
            },
          }),
          l(c)));
    },
    h = (g) => {
      c !== undefined &&
        u((b) =>
          b === undefined
            ? b
            : {
                ...b,
                ...g,
              },
        );
    },
    m = () => {
      u(r);
    };
  React.useEffect(() => {
    u(r), l(r);
  }, [r]);
  const v = {
    campaign: c,
    baseCampaign: i,
    isLoading: o,
    isError: s,
    updateCampaign: h,
    saveCampaign: p,
    cancelEdit: m,
  };
  return <CampaignContext.Provider value={v}>{t}</CampaignContext.Provider>;
};
export const useCampaign = () => {
  const e = React.useContext(CampaignContext);
  if (e === undefined)
    throw new Error(
      "useCampaignContext must be used within a CampaignProvider",
    );
  return e;
};
