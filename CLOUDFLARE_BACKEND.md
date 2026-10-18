# GitHub Pages + Cloudflare backend

The web pages remain on GitHub Pages. A separate Cloudflare Worker runs MiniMax calls and the shared D1 records. No browser request uses ChatGPT hosting.

## Boundaries

- `src/server/cloudflare-api.mjs` exposes a POST JSON API to the configured GitHub origin. Browser requests use random 256-bit bearer identities retained in local storage, not third-party cookies. The database stores the hash of this credential, never the credential itself. Origin checking is not treated as visitor authentication.
- The MiniMax credential and network hashing salt are Cloudflare Secrets. They are never exported to the web bundle, GitHub, env files or command-line arguments.
- Shared AI reservations cap provider calls at 50/day globally, 15/day per visitor and 30/day per daily keyed network identity. Failed reservations may consume a slot. No automatic application retry is performed. Limits are request caps, not an exact currency budget.
- Requests retain active dialogue for up to 2 hours, or 30 days after opt-in. Completed records and voluntary feedback are shared in D1. Raw answers are checked, scored and discarded. Expired records are pruned during later requests.
- Comparison invitations contain frozen bilingual questionnaire snapshots and only role/score summaries. Both participants consent before submitting, results stay hidden until both submit, a third participant cannot overwrite them, invites expire after 7 days and the creator may revoke them.
- GitHub query routes `/created/?id=...` and `/compare/?token=...` avoid static-host 404s. All shared links remain under `/test-garden/`, including English, version and invitation parameters. AI-created pages are noindex until editorial review.
- The previous Sites identity headers are not trusted here. There is no public owner/admin bypass. Request research is retained only under opt-in; the old Sites owner dashboard is not exposed by this API.
- A person clearing browser data loses their visitor identity. Ranking completion counts are deduplicated browser/version records, not verified unique humans.

## Deployment

Wrangler is pinned in package-lock. Use only the official OAuth permission scopes needed for this project: `account:read`, `user:read`, `workers_scripts:write`, `d1:write`, plus OAuth's background access. The previous broad `workers:write` scope did not permit script deployment on this account.

The D1 database is bound as `DB` in `wrangler.jsonc`. The initial schema is `drizzle/0000_white_morph.sql`; do not reapply the initial CREATE statements to an existing populated database. Use generated versioned migrations for future schema changes.

```sh
npm ci
npm test
npx wrangler deploy --dry-run
npx wrangler deploy
node scripts/configure-cloud-secrets.mjs
```

The secret transfer script reads the already-authorized local MMX configuration and streams the two secret values directly to Wrangler. It deliberately does not print values. It should not be rerun to reset rate limiting; an existing deployment retains its secrets across code deploys.

Copy the actual server-returned API URL into `cloudflare.config.mjs`, then:

```sh
npm run build:github
node scripts/check-github.mjs
```

Push the tested source to `main` to publish the GitHub frontend through its existing Pages workflow. Provider auth tokens and MiniMax credentials are not needed by this workflow. Worker changes are deployed by the local authorized Wrangler session, not by a credential embedded in GitHub.

## Free-plan contract

This deployment does not upgrade subscriptions or create billable add-ons. Free-plan CPU and storage/request limits still apply; live tests must verify provider streaming and questionnaire generation. MiniMax use is separate from Cloudflare hosting and follows the user's MiniMax quota/plan. Do not claim unlimited or guaranteed zero-cost AI.
