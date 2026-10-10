// Cloudflare Access sits in front of the whole site and signs every request it lets
// through with a JWT. Its email decides whose records a request sees. The token is
// verified here so a forged header cannot read or change someone else's records.
import type { Env } from './index.ts';

type Jwk = JsonWebKey & { kid: string };
let keys: Jwk[] = [];

const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const claims = (part: string) => JSON.parse(new TextDecoder().decode(decode(part)));

export async function userEmail(request: Request, env: Env): Promise<string | null> {
  // `vite dev` has no Access in front of it; everything there belongs to one local user.
  if (import.meta.env.DEV) return 'local-user';
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  try {
    return await verify(token, env);
  } catch {
    return null; // A malformed token.
  }
}

async function verify(token: string, env: Env): Promise<string | null> {
  const [header, payload, signature] = token.split('.');
  const { kid, alg } = claims(header);
  if (alg !== 'RS256') return null;
  // Access rotates its signing keys every few weeks; refetch when the key is unknown.
  if (!keys.some(key => key.kid === kid)) {
    keys = (await (await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)).json<{ keys?: Jwk[] }>()).keys ?? [];
  }
  const jwk = keys.find(key => key.kid === kid);
  if (!jwk) return null;
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  const key = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify']);
  if (!await crypto.subtle.verify(algorithm, key, decode(signature), new TextEncoder().encode(`${header}.${payload}`))) return null;
  const { iss, aud, exp, email } = claims(payload);
  const audiences: string[] = Array.isArray(aud) ? aud : [aud];
  if (iss !== `https://${env.ACCESS_TEAM_DOMAIN}` || !audiences.includes(env.ACCESS_AUD) || exp * 1000 < Date.now()) return null;
  return typeof email === 'string' && email ? email.toLowerCase() : null;
}
