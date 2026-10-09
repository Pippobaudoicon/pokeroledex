export const API_BASE_URL = "/api";

export interface LocalUser {
  sub: string;
  name: string;
  nickname: string;
}

// Hosted builds used Auth0; locally there is always one signed-in user.
export const localAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: { sub: "local-user", name: "Local Trainer", nickname: "Local Trainer" } as LocalUser,
  // Never called while isAuthenticated is true; kept so the hosted call sites still type-check.
  loginWithRedirect: (_options?: { appState?: { returnTo?: string } }) => {},
  loginWithPopup: () => {},
};

export const useAuth = () => localAuth;

export interface FetcherOptions {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  queryParams?: object;
  pathParams?: object;
  signal?: AbortSignal;
}

/** What apiFetch throws for any failure, including non-2xx responses. */
export interface ApiFetchError {
  name: string;
  message: string;
  stack: unknown;
}

export async function apiFetch<TData>({ url, method, body, headers, pathParams, queryParams, signal }: FetcherOptions): Promise<TData> {
  try {
    const requestHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers };
    if (requestHeaders["Content-Type"].toLowerCase().includes("multipart/form-data")) delete requestHeaders["Content-Type"];
    const response = await window.fetch(`${API_BASE_URL}${resolveUrl(url, queryParams, pathParams)}`, {
      signal,
      method: method.toUpperCase(),
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      headers: requestHeaders,
    });
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (e) {
        error = { status: "unknown", payload: e instanceof Error ? `Unexpected error (${e.message})` : "Unexpected error" };
      }
      throw error;
    }
    return response.headers.get("content-type")?.includes("json") ? await response.json() : ((await response.blob()) as TData);
  } catch (e) {
    // Every failure, including a non-2xx response, surfaces as this network error.
    throw { name: "unknown", message: e instanceof Error ? `Network error (${e.message})` : "Network error", stack: e };
  }
}

const resolveUrl = (url: string, queryParams: object = {}, pathParams: object = {}) => {
  let query = new URLSearchParams(queryParams as Record<string, string>).toString();
  if (query) query = `?${query}`;
  return url.replace(/\{\w*\}/g, (key) => (pathParams as Record<string, string>)[key.slice(1, -1)]) + query;
};
