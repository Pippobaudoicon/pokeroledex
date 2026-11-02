# Deployment and logins

## Deploying

`pnpm deploy` builds the app, applies migrations to the remote D1 database and deploys to https://pokeroledex.tommasolopiparo.com.

`wrangler.jsonc` points at the existing `pokeroledex` database. To deploy to another Cloudflare account, run `pnpm exec wrangler d1 create pokeroledex` there and put the returned `database_id` into `wrangler.jsonc` first.

## Production login

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/) sits in front of the whole site. People log in with a one-time code sent to their email, and that email keeps everyone's Pokémon, trainers and campaigns apart.

The Worker checks the token Access signs every request with (`worker/access.ts`) and answers 401 without it, so the API stays closed until Access is set up:

1. In the Cloudflare dashboard, open **Zero Trust** (pick a team name and the Free plan the first time).
2. Go to **Access → Applications → Add an application → Self-hosted**. Use the domain `pokeroledex.tommasolopiparo.com`, a policy that allows *Everyone* (or a list of emails), and the **One-time PIN** login method.
3. Put the team domain (`<team>.cloudflareaccess.com`) and the application's **Application Audience (AUD) tag** into `vars` in `wrangler.jsonc`, then run `pnpm deploy`.

## Staying logged in

Deploys never end a login. Access keeps two of them:

- The site's own `CF_Authorization` cookie. It lasts for the application's session duration and is tied to one hostname, so each new preview URL needs it again.
- A team-wide login, which renews that cookie without a new email code.

When the site's cookie lapses, the app reloads the page once and Access renews it (`sameOriginFetch` in `src/api/client.ts`).

To ask people for a code less often:

1. Go to **Zero Trust → Access controls → Applications →** the production and preview applications **→ Session duration**, and raise it from the 24 hour default (to 1 month, say). Leave **Access settings → Set your global session duration** at *Same as application session timeout*, so the team-wide login follows each application's duration and other applications in the account keep theirs. The *Session duration* under *Cloudflare One Client authentication* is for the WARP client, not browser logins.
2. Under **Access controls → Policies**, both applications use their own `pokeroledex - everyone` policy (Allow, Include *Everyone*, 1 month). A policy's session duration overrides the application's, so a shared policy with a shorter one would log people out sooner.
3. For previews, open the PR's branch alias URL (`<branch>-pokeroledex.<subdomain>.workers.dev`) instead of the per-version URL. The alias stays the same across builds of the branch.

## Pull request previews

Workers Builds publishes branch previews with `wrangler preview`. The `previews` block in `wrangler.jsonc` connects them to a separate `pokeroledex-preview` database with the same schema as production. Preview records start empty, while the rulebook's read-only R2 files and AI Search instance are shared.

To protect previews:

1. Enable **Workers & Pages → pokeroledex → Access → Protect this Worker behind Access → Previews only**. Its policy lets in members of the `new-era-horde` GitHub organization (Include → *GitHub Organization*, logging in with GitHub).
2. The organization restricts third-party access, so grant it to the Access login's GitHub OAuth app under GitHub → Settings → Applications → Authorized OAuth Apps → the app → Organization access.
3. Set `previews.vars.ACCESS_AUD` to that Access application's **Application Audience (AUD) tag**, from Zero Trust → Access → Applications → Additional settings.

The Worker verifies signed login tokens against this preview audience and `previews.vars.ACCESS_TEAM_DOMAIN`.

## Records from before logins

`pnpm dev` has no Access in front of it and uses a single local user. Records made before logins existed belong to `local-user`. To give them to someone:

```sh
pnpm exec wrangler d1 execute pokeroledex --remote --command "UPDATE records SET owner = 'you@example.com' WHERE owner = 'local-user'"
```
