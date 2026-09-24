# PSR Homes

Private source authority for **PSR Homes** (`psrhomes.ae`) in `gugmaae-prog/psr-homes`.

This checkout is the lean Codex working tree for the `psr-property` app (vinext / Next.js on Cloudflare Workers). `public/` static assets are omitted and stay on R2 / the live site. Cloudflare Builds auto-deploy is **not** enabled; the release gate in `docs/cloudflare-builds.md` still applies.

Tenants stay separate. Do **not** import Espacios map Workers, map assets, or hotspots, and do **not** import Haus & Grace private CRM, staff, or leads. See `docs/tenant-boundary.md`.

## Primary Worker

- `psr-property` — main app (routes on `psrhomes.ae`). Sources live at the repo root (`app/`, `worker/`, `lib/`, `components/`, `data/`).

## Companion Workers (PSR-owned, non-map)

- `psr-home-edge` — `worker/home-edge.ts`, `wrangler.home-edge.jsonc`
- `psr-media-edge` — `worker/media-edge.ts`, `wrangler.media-edge.jsonc`
- `psr-jumanah-presentation-edge` — `worker/jumanah-presentation-edge.ts`
- `psr-roadshow-dates`, `psr-projects-clean`, `psr-shell-events` — still outside this tree

Map Workers (`psr-portfolio-map*`, `psr-map-*`) are **out of scope**.

## Application

A full-stack UAE luxury property catalogue running on
[vinext](https://github.com/cloudflare/vinext), with Cloudflare D1 lead capture.

The independent PSR production build is published at
[`https://psrhomes.ae`](https://psrhomes.ae), with
[`https://psr.espacios.me`](https://psr.espacios.me) retained as an alternate
PSR domain. It preserves the full
catalogue and route structure of the reference application while using only
PSR-owned Cloudflare bindings. See `CLOUDFLARE-DEPLOY.md` for provisioning,
verification, and update commands.

See
`docs/PLATFORM-SYNC.md` for the guarded Cloudflare, Supabase, and AWS release
workflow. Another AI or engineer should begin with
`docs/PSR-FULL-STACK-HANDOFF-AUDIT-2026-09-06.md` for the current
domain, frontend, backend, data, security, infrastructure, email, local setup,
audit, recovery, and release state. The older
`docs/PSR-FULL-STACK-AI-HANDOFF.md` remains a historical
2026-08-23 snapshot.

## Project catalogue

The checked-in registry contains the complete validated set of unique UAE
project routes. Run `npm run sync:projects` to refresh the registry, normalize
the project taxonomy, validate legacy routes, and remove duplicate slugs.
Project pages enrich the registry at runtime with available gallery media,
floor plans, amenities, payment plans, and travel times while retaining the
registry as a resilient fallback.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

Production Worker bindings and the PSR custom domain are declared in
`wrangler.jsonc`. Do not substitute resource identifiers from another company.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered production metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run sync:platforms`: test and dry-run every configured release target
- `npm run sync:platforms:apply`: release one clean commit to every configured target
- `npm run sync:secrets:store`: store PSR Supabase credentials in macOS Keychain
- `npm run sync:supabase-secrets`: bind the server-only Supabase credentials to Cloudflare
- `npm run sync:auto-install`: install the immutable, queued post-commit release hook

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
