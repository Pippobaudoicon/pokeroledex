const SHELL = "pokeroledex-shell-v1";
const RUNTIME = "pokeroledex-runtime-v1";
const API = "pokeroledex-api-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("pokeroledex-") && ![SHELL, RUNTIME, API].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Logging out drops the saved copies of this person's records.
  if (url.pathname === "/cdn-cgi/access/logout") return event.waitUntil(caches.delete(API));

  // API reads: network first, last saved copy when offline. Writes still need a connection.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok && response.type === "basic" && !response.redirected) {
        await (await caches.open(API)).put(request, response.clone());
      }
      return response;
    }, async (error) => (await caches.match(request, { cacheName: API })) ?? Promise.reject(error)));
    return;
  }

  event.respondWith((async () => {
    const navigation = request.mode === "navigate";
    const cache = await caches.open(navigation ? SHELL : RUNTIME);
    const key = navigation ? "/" : request;
    const network = fetch(request).then(async (response) => {
      if (response.ok && response.type === "basic" && !response.redirected) {
        await cache.put(key, response.clone());
      }
      return response;
    });

    if (navigation) {
      try {
        return await network;
      } catch (error) {
        const shell = await cache.match("/");
        if (shell) return shell;
        throw error;
      }
    }

    const cached = await cache.match(key);
    if (cached) {
      event.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  })());
});
