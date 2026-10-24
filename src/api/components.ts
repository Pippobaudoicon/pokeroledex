// Typed fetchers and react-query hooks for every /api operation (openapi-codegen layout).
import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";

import type * as T from "../../shared/types";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { type FetcherExtraProps, useApiContext } from "@/api/context";

type MutationOptions<TData, TVariables> = Omit<UseMutationOptions<TData, ApiFetchError, TVariables>, "mutationFn">;
type QueryOptions<TQueryFnData, TData> = Omit<UseQueryOptions<TQueryFnData, ApiFetchError, TData>, "queryKey" | "queryFn">;

export type PokemonControllerCreateVariables = { body: T.CreatePokemonBody } & FetcherExtraProps;

const fetchPokemonControllerCreate = (variables: PokemonControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Pokemon>({ url: "/pokemon", method: "post", ...variables, signal });

export const usePokemonControllerCreate = (options?: MutationOptions<T.Pokemon, PokemonControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Pokemon, ApiFetchError, PokemonControllerCreateVariables>({
    mutationFn: (variables) => fetchPokemonControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonControllerUpdateVariables = { body: T.UpdatePokemonBody } & FetcherExtraProps;

const fetchPokemonControllerUpdate = (variables: PokemonControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Pokemon>({ url: "/pokemon", method: "patch", ...variables, signal });

export const usePokemonControllerUpdate = (options?: MutationOptions<T.Pokemon, PokemonControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Pokemon, ApiFetchError, PokemonControllerUpdateVariables>({
    mutationFn: (variables) => fetchPokemonControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonControllerGenerateVariables = { body: T.GeneratePokemonBody } & FetcherExtraProps;

const fetchPokemonControllerGenerate = (variables: PokemonControllerGenerateVariables, signal?: AbortSignal) =>
  apiFetch<T.Pokemon[]>({ url: "/pokemon/generate", method: "post", ...variables, signal });

export const usePokemonControllerGenerate = (options?: MutationOptions<T.Pokemon[], PokemonControllerGenerateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Pokemon[], ApiFetchError, PokemonControllerGenerateVariables>({
    mutationFn: (variables) => fetchPokemonControllerGenerate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonControllerFindAllMinimalVariables = {} & FetcherExtraProps;

const fetchPokemonControllerFindAllMinimal = (variables: PokemonControllerFindAllMinimalVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonMinimal[]>({ url: "/pokemon/minimal", method: "get", ...variables, signal });

export const usePokemonControllerFindAllMinimal = <TData = T.PokemonMinimal[]>(variables: PokemonControllerFindAllMinimalVariables, options?: QueryOptions<T.PokemonMinimal[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.PokemonMinimal[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/pokemon/minimal", operationId: "pokemonControllerFindAllMinimal", variables }),
    queryFn: ({ signal }) => fetchPokemonControllerFindAllMinimal({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type PokemonControllerFindOneVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchPokemonControllerFindOne = (variables: PokemonControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.Pokemon>({ url: "/pokemon/{id}", method: "get", ...variables, signal });

export const usePokemonControllerFindOne = <TData = T.Pokemon>(variables: PokemonControllerFindOneVariables, options?: QueryOptions<T.Pokemon, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Pokemon, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/pokemon/{id}", operationId: "pokemonControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchPokemonControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type PokemonControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchPokemonControllerRemove = (variables: PokemonControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/pokemon/{id}", method: "delete", ...variables, signal });

export const usePokemonControllerRemove = (options?: MutationOptions<unknown, PokemonControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, PokemonControllerRemoveVariables>({
    mutationFn: (variables) => fetchPokemonControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonControllerSendVariables = { pathParams: { id: string }; body: { email: string } } & FetcherExtraProps;

const fetchPokemonControllerSend = (variables: PokemonControllerSendVariables, signal?: AbortSignal) =>
  apiFetch<{ id: string; email: string }>({ url: "/pokemon/{id}/send", method: "post", ...variables, signal });

export const usePokemonControllerSend = (options?: MutationOptions<{ id: string; email: string }, PokemonControllerSendVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<{ id: string; email: string }, ApiFetchError, PokemonControllerSendVariables>({
    mutationFn: (variables) => fetchPokemonControllerSend({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type NaturesControllerFindAllVariables = {} & FetcherExtraProps;

const fetchNaturesControllerFindAll = (variables: NaturesControllerFindAllVariables, signal?: AbortSignal) =>
  apiFetch<T.Nature[]>({ url: "/natures", method: "get", ...variables, signal });

export const useNaturesControllerFindAll = <TData = T.Nature[]>(variables: NaturesControllerFindAllVariables, options?: QueryOptions<T.Nature[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Nature[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/natures", operationId: "naturesControllerFindAll", variables }),
    queryFn: ({ signal }) => fetchNaturesControllerFindAll({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type AbilitiesControllerCreateVariables = { body: Partial<T.Ability> & { campaignId: string } } & FetcherExtraProps;

const fetchAbilitiesControllerCreate = (variables: AbilitiesControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Ability>({ url: "/abilities", method: "post", ...variables, signal });

export const useAbilitiesControllerCreate = (options?: MutationOptions<T.Ability, AbilitiesControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Ability, ApiFetchError, AbilitiesControllerCreateVariables>({
    mutationFn: (variables) => fetchAbilitiesControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type AbilitiesControllerUpdateVariables = { body: Partial<T.Ability> & { id: string } } & FetcherExtraProps;

const fetchAbilitiesControllerUpdate = (variables: AbilitiesControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Ability>({ url: "/abilities", method: "patch", ...variables, signal });

export const useAbilitiesControllerUpdate = (options?: MutationOptions<T.Ability, AbilitiesControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Ability, ApiFetchError, AbilitiesControllerUpdateVariables>({
    mutationFn: (variables) => fetchAbilitiesControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type AbilitiesControllerFindAllByCampaignVariables = { pathParams: { id: string }; body?: T.SelectionBody } & FetcherExtraProps;

export const fetchAbilitiesControllerFindAllByCampaign = (variables: AbilitiesControllerFindAllByCampaignVariables, signal?: AbortSignal) =>
  apiFetch<T.Ability[]>({ url: "/abilities/all/{id}", method: "post", ...variables, signal });

export const useAbilitiesControllerFindAllByCampaign = (options?: MutationOptions<T.Ability[], AbilitiesControllerFindAllByCampaignVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Ability[], ApiFetchError, AbilitiesControllerFindAllByCampaignVariables>({
    mutationFn: (variables) => fetchAbilitiesControllerFindAllByCampaign({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type AbilitiesControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchAbilitiesControllerRemove = (variables: AbilitiesControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/abilities/{id}", method: "delete", ...variables, signal });

export const useAbilitiesControllerRemove = (options?: MutationOptions<unknown, AbilitiesControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, AbilitiesControllerRemoveVariables>({
    mutationFn: (variables) => fetchAbilitiesControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type CampaignsControllerCreateVariables = { body: T.CampaignBody } & FetcherExtraProps;

const fetchCampaignsControllerCreate = (variables: CampaignsControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Campaign>({ url: "/campaigns", method: "post", ...variables, signal });

export const useCampaignsControllerCreate = (options?: MutationOptions<T.Campaign, CampaignsControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Campaign, ApiFetchError, CampaignsControllerCreateVariables>({
    mutationFn: (variables) => fetchCampaignsControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type CampaignsControllerFindAllVariables = {} & FetcherExtraProps;

const fetchCampaignsControllerFindAll = (variables: CampaignsControllerFindAllVariables, signal?: AbortSignal) =>
  apiFetch<T.Campaign[]>({ url: "/campaigns", method: "get", ...variables, signal });

export const useCampaignsControllerFindAll = <TData = T.Campaign[]>(variables: CampaignsControllerFindAllVariables, options?: QueryOptions<T.Campaign[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Campaign[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/campaigns", operationId: "campaignsControllerFindAll", variables }),
    queryFn: ({ signal }) => fetchCampaignsControllerFindAll({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type CampaignsControllerUpdateVariables = { body: Partial<T.Campaign> & { id: string } } & FetcherExtraProps;

const fetchCampaignsControllerUpdate = (variables: CampaignsControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Campaign>({ url: "/campaigns", method: "patch", ...variables, signal });

export const useCampaignsControllerUpdate = (options?: MutationOptions<T.Campaign, CampaignsControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Campaign, ApiFetchError, CampaignsControllerUpdateVariables>({
    mutationFn: (variables) => fetchCampaignsControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type CampaignsControllerFindOneVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchCampaignsControllerFindOne = (variables: CampaignsControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.Campaign>({ url: "/campaigns/{id}", method: "get", ...variables, signal });

export const useCampaignsControllerFindOne = <TData = T.Campaign>(variables: CampaignsControllerFindOneVariables, options?: QueryOptions<T.Campaign, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Campaign, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/campaigns/{id}", operationId: "campaignsControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchCampaignsControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type CampaignsControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchCampaignsControllerRemove = (variables: CampaignsControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/campaigns/{id}", method: "delete", ...variables, signal });

export const useCampaignsControllerRemove = (options?: MutationOptions<unknown, CampaignsControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, CampaignsControllerRemoveVariables>({
    mutationFn: (variables) => fetchCampaignsControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerCreateVariables = { body: T.CustomPokemonTemplateBody } & FetcherExtraProps;

const fetchPokemonTemplatesControllerCreate = (variables: PokemonTemplatesControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplate>({ url: "/pokemon-templates", method: "post", ...variables, signal });

export const usePokemonTemplatesControllerCreate = (options?: MutationOptions<T.PokemonTemplate, PokemonTemplatesControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.PokemonTemplate, ApiFetchError, PokemonTemplatesControllerCreateVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerUpdateVariables = { body: Partial<T.CustomPokemonTemplateBody> & { id: string } } & FetcherExtraProps;

const fetchPokemonTemplatesControllerUpdate = (variables: PokemonTemplatesControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplate>({ url: "/pokemon-templates", method: "patch", ...variables, signal });

export const usePokemonTemplatesControllerUpdate = (options?: MutationOptions<T.PokemonTemplate, PokemonTemplatesControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.PokemonTemplate, ApiFetchError, PokemonTemplatesControllerUpdateVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindByCampaignsMinimalVariables = { body: T.SelectionBody } & FetcherExtraProps;

const fetchPokemonTemplatesControllerFindByCampaignsMinimal = (variables: PokemonTemplatesControllerFindByCampaignsMinimalVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplateSummary[]>({ url: "/pokemon-templates/campaigns/minimal", method: "post", ...variables, signal });

export const usePokemonTemplatesControllerFindByCampaignsMinimal = (options?: MutationOptions<T.PokemonTemplateSummary[], PokemonTemplatesControllerFindByCampaignsMinimalVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.PokemonTemplateSummary[], ApiFetchError, PokemonTemplatesControllerFindByCampaignsMinimalVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerFindByCampaignsMinimal({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindAllByCampaignVariables = { pathParams: { id: string }; body?: T.SelectionBody } & FetcherExtraProps;

export const fetchPokemonTemplatesControllerFindAllByCampaign = (variables: PokemonTemplatesControllerFindAllByCampaignVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplate[]>({ url: "/pokemon-templates/all/{id}", method: "post", ...variables, signal });

export const usePokemonTemplatesControllerFindAllByCampaign = (options?: MutationOptions<T.PokemonTemplate[], PokemonTemplatesControllerFindAllByCampaignVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.PokemonTemplate[], ApiFetchError, PokemonTemplatesControllerFindAllByCampaignVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerFindAllByCampaign({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindFilteredVariables = { body: T.SelectionBody } & FetcherExtraProps;

const fetchPokemonTemplatesControllerFindFiltered = (variables: PokemonTemplatesControllerFindFilteredVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplateSummary[]>({ url: "/pokemon-templates/filtered", method: "post", ...variables, signal });

export const usePokemonTemplatesControllerFindFiltered = (options?: MutationOptions<T.PokemonTemplateSummary[], PokemonTemplatesControllerFindFilteredVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.PokemonTemplateSummary[], ApiFetchError, PokemonTemplatesControllerFindFilteredVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerFindFiltered({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindLearnersVariables = { pathParams: { moveId: string }; body: T.SelectionBody } & FetcherExtraProps;

const fetchPokemonTemplatesControllerFindLearners = (variables: PokemonTemplatesControllerFindLearnersVariables, signal?: AbortSignal) =>
  apiFetch<string[]>({ url: "/pokemon-templates/learns/{moveId}", method: "post", ...variables, signal });

/** Ids of the templates that can learn a move. */
export const usePokemonTemplatesControllerFindLearners = (options?: MutationOptions<string[], PokemonTemplatesControllerFindLearnersVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<string[], ApiFetchError, PokemonTemplatesControllerFindLearnersVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerFindLearners({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type NamesControllerFindByCampaignsVariables = { pathParams: { collection: "moves" | "abilities" }; body: T.SelectionBody } & FetcherExtraProps;

const fetchNamesControllerFindByCampaigns = (variables: NamesControllerFindByCampaignsVariables, signal?: AbortSignal) =>
  apiFetch<T.NamedEntry[]>({ url: "/{collection}/names", method: "post", ...variables, signal });

export const useNamesControllerFindByCampaigns = (options?: MutationOptions<T.NamedEntry[], NamesControllerFindByCampaignsVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.NamedEntry[], ApiFetchError, NamesControllerFindByCampaignsVariables>({
    mutationFn: (variables) => fetchNamesControllerFindByCampaigns({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindOneVariables ={ pathParams: { id: string } } & FetcherExtraProps;

const fetchPokemonTemplatesControllerFindOne = (variables: PokemonTemplatesControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplate>({ url: "/pokemon-templates/{id}", method: "get", ...variables, signal });

export const usePokemonTemplatesControllerFindOne = <TData = T.PokemonTemplate>(variables: PokemonTemplatesControllerFindOneVariables, options?: QueryOptions<T.PokemonTemplate, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.PokemonTemplate, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/pokemon-templates/{id}", operationId: "pokemonTemplatesControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchPokemonTemplatesControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type PokemonTemplatesControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchPokemonTemplatesControllerRemove = (variables: PokemonTemplatesControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/pokemon-templates/{id}", method: "delete", ...variables, signal });

export const usePokemonTemplatesControllerRemove = (options?: MutationOptions<unknown, PokemonTemplatesControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, PokemonTemplatesControllerRemoveVariables>({
    mutationFn: (variables) => fetchPokemonTemplatesControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type PokemonTemplatesControllerFindManyVariables = { pathParams: { ids: string[] } } & FetcherExtraProps;

const fetchPokemonTemplatesControllerFindMany = (variables: PokemonTemplatesControllerFindManyVariables, signal?: AbortSignal) =>
  apiFetch<T.PokemonTemplate[]>({ url: "/pokemon-templates/find-many/{ids}", method: "get", ...variables, signal });

export const usePokemonTemplatesControllerFindMany = <TData = T.PokemonTemplate[]>(variables: PokemonTemplatesControllerFindManyVariables, options?: QueryOptions<T.PokemonTemplate[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.PokemonTemplate[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/pokemon-templates/find-many/{ids}", operationId: "pokemonTemplatesControllerFindMany", variables }),
    queryFn: ({ signal }) => fetchPokemonTemplatesControllerFindMany({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type MovesControllerCreateVariables = { body: Partial<T.Move> & { campaignId: string } } & FetcherExtraProps;

const fetchMovesControllerCreate = (variables: MovesControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Move>({ url: "/moves", method: "post", ...variables, signal });

export const useMovesControllerCreate = (options?: MutationOptions<T.Move, MovesControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Move, ApiFetchError, MovesControllerCreateVariables>({
    mutationFn: (variables) => fetchMovesControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type MovesControllerFindAllVariables = {} & FetcherExtraProps;

const fetchMovesControllerFindAll = (variables: MovesControllerFindAllVariables, signal?: AbortSignal) =>
  apiFetch<T.Move[]>({ url: "/moves", method: "get", ...variables, signal });

export const useMovesControllerFindAll = <TData = T.Move[]>(variables: MovesControllerFindAllVariables, options?: QueryOptions<T.Move[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Move[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/moves", operationId: "movesControllerFindAll", variables }),
    queryFn: ({ signal }) => fetchMovesControllerFindAll({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type MovesControllerUpdateVariables = { body: Partial<T.Move> & { id: string } } & FetcherExtraProps;

const fetchMovesControllerUpdate = (variables: MovesControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Move>({ url: "/moves", method: "patch", ...variables, signal });

export const useMovesControllerUpdate = (options?: MutationOptions<T.Move, MovesControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Move, ApiFetchError, MovesControllerUpdateVariables>({
    mutationFn: (variables) => fetchMovesControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type MovesControllerFindByCampaignsVariables = { body: T.SelectionBody } & FetcherExtraProps;

const fetchMovesControllerFindByCampaigns = (variables: MovesControllerFindByCampaignsVariables, signal?: AbortSignal) =>
  apiFetch<T.Move[]>({ url: "/moves/campaigns", method: "post", ...variables, signal });

export const useMovesControllerFindByCampaigns = (options?: MutationOptions<T.Move[], MovesControllerFindByCampaignsVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Move[], ApiFetchError, MovesControllerFindByCampaignsVariables>({
    mutationFn: (variables) => fetchMovesControllerFindByCampaigns({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type MovesControllerFindAllByCampaignVariables = { pathParams: { id: string }; body?: T.SelectionBody } & FetcherExtraProps;

export const fetchMovesControllerFindAllByCampaign = (variables: MovesControllerFindAllByCampaignVariables, signal?: AbortSignal) =>
  apiFetch<T.Move[]>({ url: "/moves/all/{id}", method: "post", ...variables, signal });

export const useMovesControllerFindAllByCampaign = (options?: MutationOptions<T.Move[], MovesControllerFindAllByCampaignVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Move[], ApiFetchError, MovesControllerFindAllByCampaignVariables>({
    mutationFn: (variables) => fetchMovesControllerFindAllByCampaign({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type MovesControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchMovesControllerRemove = (variables: MovesControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/moves/{id}", method: "delete", ...variables, signal });

export const useMovesControllerRemove = (options?: MutationOptions<unknown, MovesControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, MovesControllerRemoveVariables>({
    mutationFn: (variables) => fetchMovesControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type RankupAttributesControllerFindOneVariables = { pathParams: { rank: T.Rank } } & FetcherExtraProps;

const fetchRankupAttributesControllerFindOne = (variables: RankupAttributesControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.RankUpAttributes>({ url: "/rankup-attributes/{rank}", method: "get", ...variables, signal });

export const useRankupAttributesControllerFindOne = <TData = T.RankUpAttributes>(variables: RankupAttributesControllerFindOneVariables, options?: QueryOptions<T.RankUpAttributes, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.RankUpAttributes, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/rankup-attributes/{rank}", operationId: "rankupAttributesControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchRankupAttributesControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type ItemsControllerCreateVariables = { body: Partial<T.Item> & { campaignId: string } } & FetcherExtraProps;

const fetchItemsControllerCreate = (variables: ItemsControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Item>({ url: "/items", method: "post", ...variables, signal });

export const useItemsControllerCreate = (options?: MutationOptions<T.Item, ItemsControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Item, ApiFetchError, ItemsControllerCreateVariables>({
    mutationFn: (variables) => fetchItemsControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type ItemsControllerFindAllVariables = {} & FetcherExtraProps;

const fetchItemsControllerFindAll = (variables: ItemsControllerFindAllVariables, signal?: AbortSignal) =>
  apiFetch<T.Item[]>({ url: "/items", method: "get", ...variables, signal });

export const useItemsControllerFindAll = <TData = T.Item[]>(variables: ItemsControllerFindAllVariables, options?: QueryOptions<T.Item[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Item[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/items", operationId: "itemsControllerFindAll", variables }),
    queryFn: ({ signal }) => fetchItemsControllerFindAll({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type ItemsControllerUpdateVariables = { body: Partial<T.Item> & { id: string } } & FetcherExtraProps;

const fetchItemsControllerUpdate = (variables: ItemsControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Item>({ url: "/items", method: "patch", ...variables, signal });

export const useItemsControllerUpdate = (options?: MutationOptions<T.Item, ItemsControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Item, ApiFetchError, ItemsControllerUpdateVariables>({
    mutationFn: (variables) => fetchItemsControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type ItemsControllerGenerateVariables = { body: T.GenerateItemsBody } & FetcherExtraProps;

const fetchItemsControllerGenerate = (variables: ItemsControllerGenerateVariables, signal?: AbortSignal) =>
  apiFetch<T.Item[]>({ url: "/items/generate", method: "post", ...variables, signal });

export const useItemsControllerGenerate = (options?: MutationOptions<T.Item[], ItemsControllerGenerateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Item[], ApiFetchError, ItemsControllerGenerateVariables>({
    mutationFn: (variables) => fetchItemsControllerGenerate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type ItemsControllerFindByCampaignsVariables = { body: T.SelectionBody } & FetcherExtraProps;

const fetchItemsControllerFindByCampaigns = (variables: ItemsControllerFindByCampaignsVariables, signal?: AbortSignal) =>
  apiFetch<T.Item[]>({ url: "/items/campaigns", method: "post", ...variables, signal });

export const useItemsControllerFindByCampaigns = (options?: MutationOptions<T.Item[], ItemsControllerFindByCampaignsVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Item[], ApiFetchError, ItemsControllerFindByCampaignsVariables>({
    mutationFn: (variables) => fetchItemsControllerFindByCampaigns({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type ItemsControllerFindOneVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchItemsControllerFindOne = (variables: ItemsControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.Item>({ url: "/items/{id}", method: "get", ...variables, signal });

export const useItemsControllerFindOne = <TData = T.Item>(variables: ItemsControllerFindOneVariables, options?: QueryOptions<T.Item, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Item, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/items/{id}", operationId: "itemsControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchItemsControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type ItemsControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchItemsControllerRemove = (variables: ItemsControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/items/{id}", method: "delete", ...variables, signal });

export const useItemsControllerRemove = (options?: MutationOptions<unknown, ItemsControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, ItemsControllerRemoveVariables>({
    mutationFn: (variables) => fetchItemsControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type TrainersControllerCreateVariables = { body: T.CreateTrainerBody } & FetcherExtraProps;

const fetchTrainersControllerCreate = (variables: TrainersControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Trainer>({ url: "/trainers", method: "post", ...variables, signal });

export const useTrainersControllerCreate = (options?: MutationOptions<T.Trainer, TrainersControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Trainer, ApiFetchError, TrainersControllerCreateVariables>({
    mutationFn: (variables) => fetchTrainersControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type TrainersControllerFindAllVariables = {} & FetcherExtraProps;

const fetchTrainersControllerFindAll = (variables: TrainersControllerFindAllVariables, signal?: AbortSignal) =>
  apiFetch<T.Trainer[]>({ url: "/trainers", method: "get", ...variables, signal });

export const useTrainersControllerFindAll = <TData = T.Trainer[]>(variables: TrainersControllerFindAllVariables, options?: QueryOptions<T.Trainer[], TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Trainer[], ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/trainers", operationId: "trainersControllerFindAll", variables }),
    queryFn: ({ signal }) => fetchTrainersControllerFindAll({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type TrainersControllerUpdateVariables = { body: T.UpdateTrainerBody } & FetcherExtraProps;

const fetchTrainersControllerUpdate = (variables: TrainersControllerUpdateVariables, signal?: AbortSignal) =>
  apiFetch<T.Trainer>({ url: "/trainers", method: "patch", ...variables, signal });

export const useTrainersControllerUpdate = (options?: MutationOptions<T.Trainer, TrainersControllerUpdateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Trainer, ApiFetchError, TrainersControllerUpdateVariables>({
    mutationFn: (variables) => fetchTrainersControllerUpdate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type TrainersControllerFindOneVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchTrainersControllerFindOne = (variables: TrainersControllerFindOneVariables, signal?: AbortSignal) =>
  apiFetch<T.Trainer>({ url: "/trainers/{id}", method: "get", ...variables, signal });

export const useTrainersControllerFindOne = <TData = T.Trainer>(variables: TrainersControllerFindOneVariables, options?: QueryOptions<T.Trainer, TData>) => {
  const { fetcherOptions, queryOptions, queryKeyFn } = useApiContext(options);
  return useQuery<T.Trainer, ApiFetchError, TData>({
    queryKey: queryKeyFn({ path: "/trainers/{id}", operationId: "trainersControllerFindOne", variables }),
    queryFn: ({ signal }) => fetchTrainersControllerFindOne({ ...fetcherOptions, ...variables }, signal),
    ...options,
    ...queryOptions,
  });
};

export type TrainersControllerRemoveVariables = { pathParams: { id: string } } & FetcherExtraProps;

const fetchTrainersControllerRemove = (variables: TrainersControllerRemoveVariables, signal?: AbortSignal) =>
  apiFetch<unknown>({ url: "/trainers/{id}", method: "delete", ...variables, signal });

export const useTrainersControllerRemove = (options?: MutationOptions<unknown, TrainersControllerRemoveVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<unknown, ApiFetchError, TrainersControllerRemoveVariables>({
    mutationFn: (variables) => fetchTrainersControllerRemove({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type FeedbackControllerCreateVariables = { body: T.FeedbackBody } & FetcherExtraProps;

const fetchFeedbackControllerCreate = (variables: FeedbackControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.Feedback>({ url: "/feedback", method: "post", ...variables, signal });

export const useFeedbackControllerCreate = (options?: MutationOptions<T.Feedback, FeedbackControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.Feedback, ApiFetchError, FeedbackControllerCreateVariables>({
    mutationFn: (variables) => fetchFeedbackControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};

export type IssuesControllerCreateVariables = { body: T.IssueReportBody } & FetcherExtraProps;

const fetchIssuesControllerCreate = (variables: IssuesControllerCreateVariables, signal?: AbortSignal) =>
  apiFetch<T.IssueReport>({ url: "/issues", method: "post", ...variables, signal });

export const useIssuesControllerCreate = (options?: MutationOptions<T.IssueReport, IssuesControllerCreateVariables>) => {
  const { fetcherOptions } = useApiContext();
  return useMutation<T.IssueReport, ApiFetchError, IssuesControllerCreateVariables>({
    mutationFn: (variables) => fetchIssuesControllerCreate({ ...fetcherOptions, ...variables }),
    ...options,
  });
};
