# Issue reports

The **Suggest a feature** button opens a form, and the Worker turns what people send into a GitHub issue (`worker/github.ts`). Nobody needs a GitHub account, and the token stays a Worker secret that never reaches the browser.

Each person can send 5 reports a day. Their email is kept with the report in D1 but isn't published on GitHub. Issues get the `from-app` label.

## Setup

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new): *Only select repositories* → this repository, permission **Issues: Read and write**, nothing else, with an expiry date.
2. Run `pnpm exec wrangler secret put GITHUB_TOKEN` and paste it. To try it locally, put `GITHUB_TOKEN=...` in `.dev.vars` (git-ignored).

`GITHUB_REPO` in `wrangler.jsonc` sets the target repository. Without a token, the form answers that reports aren't set up.
