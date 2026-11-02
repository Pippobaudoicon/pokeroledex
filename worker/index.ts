import { userEmail } from './access.ts';
import { handleApi } from './api.ts';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Cloudflare Access team domain, e.g. pokeroledex.cloudflareaccess.com. */
  ACCESS_TEAM_DOMAIN: string;
  /** Application Audience (AUD) tag of the Access application in front of the site. */
  ACCESS_AUD: string;
  /** owner/name of the repository issue reports go to (worker/github.ts). */
  GITHUB_REPO?: string;
  /** Secret token allowed to create issues in GITHUB_REPO; unset disables reports. */
  GITHUB_TOKEN?: string;
  /** The Pokérole corebook PDF and its text, one string per page (scripts/upload-rulebook.ts). */
  RULEBOOK: R2Bucket;
  /** AI Search instance over the corebook's section files (README "Rulebook"). */
  RULEBOOK_SEARCH: AiSearchInstance;
}

const rulebookTypes: Record<string, string> = { 'corebook.pdf': 'application/pdf', 'pages.json': 'application/json' };
// One image and one thumbnail per page for the Pages view, e.g. pages/007.webp.
const rulebookType = (key: string) => rulebookTypes[key] ?? (/^(pages|thumbs)\/\d{3}\.webp$/.test(key) ? 'image/webp' : undefined);

// The PDF is 172 MB, too big for static assets. Range requests let the browser's
// PDF viewer show the first pages without downloading the whole book.
async function rulebook(request: Request, env: Env, key: string, type: string): Promise<Response> {
  if (!(await userEmail(request, env))) return new Response('Log in again.', { status: 401 });
  const range = request.headers.has('Range');
  const object = await env.RULEBOOK.get(key, range ? { range: request.headers } : {});
  if (!object) return Response.json({ message: 'Not found' }, { status: 404 });
  const headers = new Headers({
    'Content-Type': type, 'Accept-Ranges': 'bytes', ETag: object.httpEtag,
    'Cache-Control': 'private, max-age=86400',
  });
  const body = request.method === 'HEAD' ? null : object.body;
  const part = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (!range || !part) return new Response(body, { headers });
  const offset = part.suffix !== undefined ? object.size - part.suffix : part.offset ?? 0;
  const length = part.suffix ?? part.length ?? object.size - offset;
  headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
  return new Response(body, { status: 206, headers });
}

// Static assets are served before this Worker runs (wrangler.jsonc), so apart from
// /api/* it only sees requests that matched no file.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');
    if (url.pathname.startsWith('/api/')) {
      // The Access login is a cookie, so only this site's own pages may change data.
      const origin = request.headers.get('Origin');
      if (request.method !== 'GET' && request.method !== 'HEAD' && origin && origin !== url.origin) {
        return new Response('Same-origin requests only', { status: 403 });
      }
      const owner = await userEmail(request, env);
      if (!owner) return Response.json({ payload: 'Log in again.' }, { status: 401 });
      return handleApi(request, env, url, owner);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
    const key = url.pathname.slice('/rulebook/'.length);
    const type = url.pathname.startsWith('/rulebook/') && rulebookType(key);
    if (type) return rulebook(request, env, key, type);
    if (url.pathname.startsWith('/images/pokemon/BoxSprites/')) {
      // Some newer forms have no box sprite.
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
