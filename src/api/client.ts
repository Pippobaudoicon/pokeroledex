export const API_BASE_URL = "/api";

export interface LocalUser {
  sub: string;
  name: string;
  nickname: string;
}

// Cloudflare Access handles login in front of the site, so the client always has one signed-in user.
export const localAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: { sub: "local-user", name: "Local Trainer", nickname: "Local Trainer" } as LocalUser,
};

export const useAuth = () => localAuth;

// Cloudflare Access keeps two logins: a short one per hostname (the CF_Authorization
// cookie, which every PR preview build gets anew) and a longer team-wide one. Once the
// hostname's cookie lapses, fetches are redirected to the login page and fail, so reload
// the page instead: Access renews the cookie from the team-wide login without a new code.
const RENEWED = "access-renewed-at";

/** Fetch, reloading the page once if the Access login on this hostname has lapsed. */
export async function sameOriginFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await window.fetch(input, { ...init, redirect: "manual" });
  if (response.type !== "opaqueredirect" && response.status !== 401) return response;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RENEWED));
    sessionStorage.setItem(RENEWED, String(Date.now()));
  } catch {
    // Without storage, still reload; Access shows its login page if the team login lapsed too.
  }
  // A second lapse within a minute means the reload did not help; let the error show.
  if (Date.now() - last > 60_000) {
    window.location.reload();
    await new Promise(() => {}); // The page is going away; keep callers from showing an error.
  }
  return response;
}

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
    const response = await sameOriginFetch(`${API_BASE_URL}${resolveUrl(url, queryParams, pathParams)}`, {
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
