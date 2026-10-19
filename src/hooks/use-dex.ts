import { useQuery } from "@tanstack/react-query";
import type * as T from "../../shared/types";
import { apiFetch } from "@/api/client";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";

// The list endpoints are POSTs (the body picks the campaigns), so the generated hooks are
// mutations. These wrap the same requests in cached queries, shared by the Pokédex and Search.

const useSelection = () => {
  const { state } = useCampaignFilter();
  return { campaignIds: state.campaignIds, includeCore: state.includeCore };
};

const STALE = 5 * 60_000;

/** Every Pokémon species and form in the selected campaigns, in Pokédex order. */
export const useDex = () => {
  const body = useSelection();
  return useQuery({
    queryKey: ["dex", body],
    queryFn: ({ signal }) =>
      apiFetch<T.PokemonTemplateSummary[]>({ url: "/pokemon-templates/campaigns/minimal", method: "post", body, signal }).then((templates) =>
        [...templates].sort((first, second) => (first.dexID ?? "").localeCompare(second.dexID ?? "") || first.name.localeCompare(second.name)),
      ),
    staleTime: STALE,
  });
};

export const useMoveIndex = (enabled = true) => {
  const body = useSelection();
  return useQuery({
    queryKey: ["move-index", body],
    queryFn: ({ signal }) => apiFetch<T.Move[]>({ url: "/moves/campaigns", method: "post", body, signal }),
    staleTime: STALE,
    enabled,
  });
};

export const useItemIndex = (enabled = true) => {
  const body = useSelection();
  return useQuery({
    queryKey: ["item-index", body],
    queryFn: ({ signal }) => apiFetch<T.Item[]>({ url: "/items/campaigns", method: "post", body, signal }),
    staleTime: STALE,
    enabled,
  });
};

/** Lower case without accents, so "pokemon" finds "Pokémon". */
export const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Ids of the species that can learn a move; undefined until a move is picked and loaded. */
export const useLearners = (moveId: string) => {
  const body = useSelection();
  return useQuery({
    queryKey: ["learners", moveId, body],
    queryFn: ({ signal }) => apiFetch<string[]>({ url: `/pokemon-templates/learns/${moveId}`, method: "post", body, signal }),
    staleTime: STALE,
    enabled: moveId !== "",
  });
};
