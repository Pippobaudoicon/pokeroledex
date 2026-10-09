// Request context shared by every generated hook (openapi-codegen layout).

export type FetcherExtraProps = { headers?: Record<string, string> };

export interface QueryOperation {
  path: string;
  operationId: string;
  variables: { pathParams?: object; queryParams?: object; body?: unknown } & FetcherExtraProps;
}

export function useApiContext<TQueryOptions extends object>(queryOptions?: TQueryOptions) {
  return {
    // Hosted builds sent an Auth0 bearer token here; the local API needs none.
    fetcherOptions: { headers: {} } as FetcherExtraProps,
    // This overrides any caller `enabled: false`, so every query runs (the hosted build only waited for the token).
    queryOptions: { ...queryOptions, enabled: true },
    queryKeyFn,
  };
}

/** "/pokemon/{id}" + { pathParams: { id: "x" } } -> ["pokemon", "x", ...queryParams?, ...body?] */
export const queryKeyFn = (operation: QueryOperation) => {
  const { pathParams, queryParams, body } = operation.variables;
  const parts = operation.path.split("/").filter(Boolean);
  const queryKey: unknown[] = pathParams ? parts.map((part) => resolvePathParam(part, pathParams as Record<string, unknown>)) : parts;
  if (queryParams) queryKey.push(queryParams);
  if (body) queryKey.push(body);
  return queryKey;
};

const resolvePathParam = (part: string, pathParams: Record<string, unknown>) =>
  part.startsWith("{") && part.endsWith("}") ? pathParams[part.slice(1, -1)] : part;
