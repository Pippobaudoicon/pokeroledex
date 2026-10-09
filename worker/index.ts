import { handleApi } from './api.ts';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

// Static assets are served before this Worker runs (wrangler.jsonc), so apart from
// /api/* it only sees requests that matched no file.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');
    if (url.pathname.startsWith('/api/')) {
      // There is no login, so only this site's own pages may change data.
      const origin = request.headers.get('Origin');
      if (request.method !== 'GET' && request.method !== 'HEAD' && origin && origin !== url.origin) {
        return new Response('Same-origin requests only', { status: 403 });
      }
      return handleApi(request, env, url);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
    if (url.pathname.startsWith('/images/pokemon/BoxSprites/')) {
      // Some newer forms have no box sprite on the original site.
      const book = await env.ASSETS.fetch(new Request(new URL(url.pathname.replace('/BoxSprites/', '/BookSprites/'), url), request));
      if (book.ok) return book;
    }
    // Browser routes load the same app; missing assets remain honest 404s.
    const file = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
    if (file.lastIndexOf('.') <= 0 && !/^\/(images|fonts|assets)(\/|$)/.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }
    return Response.json({ message: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
