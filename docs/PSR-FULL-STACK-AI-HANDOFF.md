# PSR Homes full-stack AI handoff

This is the operating manual for another AI or engineer taking over PSR Homes.
It describes the canonical local checkout, source lineage, frontend and backend,
live Cloudflare state, email routing, secondary Supabase integration, AWS archive
boundary, release process, and project-specific safety rules.

The document is intentionally explicit about what is live, what is implemented
but inactive, and what has only been prepared. Do not treat an available script
or migration as proof that a remote integration is enabled.

## 1. Current verified snapshot

Snapshot date: 2026-08-23, Asia/Dubai.

| Item | Current state |
| --- | --- |
| Canonical local checkout | `/Users/keifferjapeth/Documents/Codex/PSR/psrhomes` |
| Git branch | `main` |
| Application release commit | `5ef029ddd98e27d35c07a95c790ad3bf6485b015` |
| Cloudflare Worker version | `8647a2a4-a765-4ccb-8fac-7c9306542687` |
| Git remote | None configured |
| Worktree before this manual | Clean |
| Runtime | Cloudflare Worker built with Vinext/Vite, React 19, Next 16 APIs |
| Primary domain | `https://psrhomes.ae` returns HTTP 200 |
| `www` domain | `https://www.psrhomes.ae` redirects to the apex with HTTP 301 |
| Alternate domain | `https://psr.espacios.me` returns HTTP 200 |
| Worker | `psr-property` |
| D1 | `cba-property-db`, no pending migrations |
| R2 | `psr-property-media` |
| Supabase | Adapter and migration exist, but production secrets are absent and no project is linked locally |
| AWS | Private S3 archive target is documented, but AWS CLI is absent on this Mac and the latest upload is not live-verified |
| Root email | Google Workspace owns the `psrhomes.ae` MX records |
| App email ingress | Cloudflare owns the `inbox.psrhomes.ae` MX records |
| Campaign sending | Disabled by `CAMPAIGN_DELIVERY_ENABLED=false` |
| Agent inbox | Enabled by `EMAIL_INBOX_ENABLED=true` |
| Agent email sending | Enabled by `EMAIL_SENDING_ENABLED=true` |
| Node on this Mac | `v22.16.0` |
| npm on this Mac | `10.9.2` |
| Dependencies at snapshot | `node_modules` is not present; run `npm ci` before local build/test work |

The deployed application release passed 11 rendered-route checks and 104 unit
checks, for 115 checks total. Lint completed with zero errors and 59 pre-existing
warnings. Re-run the suite after any source change instead of relying on this
snapshot.

## 2. First commands for a new AI

Start here. Do not search for a different folder named PSR and do not begin from
the older white-label checkout.

```bash
cd /Users/keifferjapeth/Documents/Codex/PSR/psrhomes
git status --short --branch
git log --oneline -12
git remote -v
node --version
npm --version
npm ci
npm test
npm run lint
```

Expected important observations:

- The branch is `main`.
- There is currently no Git remote.
- `npm ci` recreates the ignored dependency folder from `package-lock.json`.
- `npm test` builds the Worker artifact before running route and unit tests.
- The existing lint warnings must not be auto-fixed as part of an unrelated task.
- A dirty worktree may contain user work. Never discard it.

For a quick live, read-only baseline:

```bash
curl -I https://psrhomes.ae/
curl -I https://www.psrhomes.ae/
curl -I https://psr.espacios.me/
curl -i https://psrhomes.ae/api/agent/session
```

An unauthenticated request to `/api/agent/session` should return `401`.

## 3. Source lineage and authority

This repository was recovered on 2026-08-22 from the complete working tree at:

`/Users/keifferjapeth/Documents/Codex/2026-07-22/and/work/real-estate-white-label`

The source checkout was at commit:

`8fa1647464e8308700abae92786cb396f13f61d8`

Its uncommitted PSR implementation and production assets were included. Git
metadata, dependencies, generated output, caches, screenshots, and secrets were
excluded. The original checkout still exists, but it is provenance and recovery
evidence, not the canonical PSR working copy.

The current repository starts with these recovery commits:

- `3ce1fbb` created the canonical PSR release repository.
- `1f28e1b` recorded the verified private AWS archive target.
- Later commits contain the bounded navigation, inbox, typography, and mail
  routing fixes.

Read `docs/SOURCE-PROVENANCE.md` before attempting source recovery. Internal
names beginning with `cba`, `hg`, `haus_grace`, or `Grace` are historical code
lineage. They do not mean that the public site is still CBA or Haus & Grace.
Do not bulk-rename them: several are live table names, migration identifiers,
or stable code contracts.

## 4. Architecture at a glance

```text
Browser
  |
  | HTTPS: psrhomes.ae, www.psrhomes.ae, psr.espacios.me
  v
Cloudflare Worker: psr-property
  |
  +-- Vinext app router -> app/, components/, public/
  +-- Worker APIs -> worker/*.ts
  +-- D1 DB binding -> cba-property-db
  +-- R2 binding -> psr-property-media
  +-- Workers AI binding -> AI search, chat, translation, content summaries
  +-- Durable Object -> GracePublicAgent per chat/advisor session
  +-- Images binding -> image delivery operations
  +-- Send Email binding -> approved @psrhomes.ae senders
  +-- Email handler -> MIME parse, D1 inbox records, R2 attachments
  +-- Cron -> listing sync, analytics retention, launch feed, daily insight

Optional and separate:
  Cloudflare Worker -> Supabase REST -> advisor long-term memory only
  Local Git commit -> private Amazon S3 source archive only
```

Cloudflare is the application runtime and operational source of truth.
Supabase is not a competing application database. Amazon is not a second
application host or writable backend.

## 5. Repository map

| Path | Responsibility |
| --- | --- |
| `app/` | Public and protected page routes plus Next-style route handlers |
| `components/` | Public UI, authenticated workspace, CRM, inbox, analytics and shared presentation |
| `worker/index.ts` | Cloudflare Worker entry point and handler ordering |
| `worker/agent-backend.ts` | Agent auth, staff admin, research, profiles, documents and PDF/send workflows |
| `worker/crm-backend.ts` | Per-advisor CRM contacts, opportunities, tasks, activities and audit |
| `worker/inbox-backend.ts` | Mailbox folders, drafts, sending, inbound MIME ingest and R2 attachments |
| `worker/leads-backend.ts` | Protected website-lead dashboard access and queries |
| `worker/analytics-backend.ts` | Anonymous event ingest and protected analytics dashboard |
| `worker/grace-public-agent.ts` | Stateful public/advisor AI concierge Durable Object |
| `worker/content-sync.ts` | Project launch and daily market feed refresh |
| `worker/supabase-memory.ts` | Optional server-only Supabase advisor memory adapter |
| `data/projects.json` | Canonical checked-in UAE project registry |
| `data/cba-team.ts` | Canonical 12-person public staff roster and order |
| `data/cba-company.ts` | Canonical public company contact and identity data |
| `lib/` | Catalogue, pricing, SEO, search, media and finder logic |
| `drizzle-agent/` | Active D1 migrations for workspace, CRM, inbox, analytics and content |
| `drizzle/` | Original public lead/import migrations |
| `supabase/migrations/` | Optional Supabase memory migration only |
| `public/` | Checked-in logos, staff fallbacks, hero media and editorial assets |
| `tests/` | Rendered-route and backend/design regression tests |
| `scripts/sync-platforms.sh` | Guarded Cloudflare, Supabase and AWS release coordinator |
| `wrangler.jsonc` | Production Worker routes, bindings, variables and cron |
| `vite.config.ts` | Vinext build and isolated local Cloudflare bindings |
| `docs/` | Architecture, provenance, sync and operational documentation |

Ignored and disposable paths include `node_modules/`, `dist/`, `.next/`,
`.vinext/`, `.wrangler/`, `.sites-runtime/`, and `.sync/`. The `.sync/` folder
contains local release archives and is not source code.

## 6. Frontend state

### Rendering and styling

- The application uses React 19 and Next 16 app-router conventions through
  Vinext and Vite.
- `vite.config.ts` builds `worker/index.ts` as the Worker entry point.
- `app/layout.tsx`, `app/globals.css`, `app/psr-theme.css`, and the PSR neutral
  stylesheets own the global visual language.
- `components/Chrome.tsx` owns the public internal header and footer.
- `components/AgentWorkspace.tsx` owns the authenticated `/agent` shell.
- `components/psr-agent-neutral.css` owns the authenticated workspace design.
- Static and framework assets are served from `dist/client` through `env.ASSETS`.

### Public routes

The current route families are:

```text
/
/about
/advisors
/advisors/:slug
/projects
/projects/:slug
/projects/latest/:slug
/developers
/developers/:slug
/communities
/communities/:slug
/insights
/insights/:slug
/insights/daily
/journal
/properties
/off-plan
/services
/contact
/list-your-property
/mortgage-calculator
/privacy
/terms
```

Do not remove or replace these routes with a smaller demo catalogue. Dynamic
slugs, SEO metadata, project facts, galleries, brochures, structured data and
internal links are part of the product.

### Protected or operational routes

```text
/agent       Agent workspace and staff administration
/leads       Website lead inbox
/analytics   Website analytics dashboard
```

The HTML pages can render before authentication. Protection is enforced by
their APIs and secure cookies. Every protected page has no-index metadata.

### Navigation decisions that must be preserved

- `Our people`, `Services`, and `Agent login` are inside the `About` menu.
- Do not add `Agent login` back as a crowded top-level tab.
- The `/agent` sidebar contains labels only. Do not re-add explanatory subtext.
- Existing sidebar label text is 14px and existing controls are 42px high.

### Authenticated five-role type system

`components/psr-agent-neutral.css` defines exactly five workspace roles:

```css
--agent-type-hero: clamp(48px, 5vw, 64px);
--agent-type-title: clamp(30px, 3vw, 38px);
--agent-type-sub: 16px;
--agent-type-body: 14px;
--agent-type-note: 11px;
```

Use these roles rather than inventing one-off font sizes. Sidebar tab labels
use the body role, not the sub role.

### Catalogue snapshot

`data/projects.json` currently contains:

- 1,312 UAE projects.
- 1,044 current projects.
- 268 archived projects.
- 347 developers.
- 7 emirates.
- 259 distinct project areas.

The registry timestamp is `2026-07-22T11:20:58.155Z`. Runtime feed records may
supplement this checked-in baseline, but the file is the resilient source for
route generation and search.

### Staff identity

- `data/cba-team.ts` contains 12 public PSR staff profiles.
- D1 contains 13 active profiles because `admin@psrhomes.ae` is operational and
  is not part of the public people carousel.
- Public and private surfaces share canonical profile records and avatar routes.
- A staff title is presentation data. It must never silently grant admin access.
- Uploaded canonical photos are stored in R2 and exposed through
  `/api/agent/avatar/:slug`; checked-in assets are fallbacks.

## 7. Worker backend request flow

`worker/index.ts` exports all three production handlers:

```text
fetch       HTTP application and API traffic
scheduled   Six-hour operational refresh
email       Inbound Cloudflare Email Routing events
```

The HTTP handler processes requests in this order:

1. Redirect `www.psrhomes.ae` to `psrhomes.ae`.
2. Serve the canonical favicon.
3. Route `/api/grace-chat` to the stateful Durable Object.
4. Handle translation.
5. Handle AI project-search interpretation.
6. Handle content feeds.
7. Handle analytics.
8. Handle the leads dashboard.
9. Handle agent, inbox and CRM APIs.
10. Serve static assets.
11. Merge the dynamic project feed into `/api/projects`.
12. Cache safe anonymous HTML documents at the edge.
13. Fall through to the Vinext app router.

Production responses receive HSTS, content-type protection, frame denial,
strict referrer handling, and a restrictive permissions policy.

### Main public APIs

| Method/path | Purpose |
| --- | --- |
| `POST /api/leads` | Store consented enquiries, generate optional briefs and send configured notifications |
| `GET /api/client-briefs/:token` | Time-limited private brief download from R2 |
| `GET /api/brochures/:slug` | Validated project brochure delivery |
| `GET /api/projects` | Checked-in registry plus published runtime feed |
| `POST /api/projects/interpret-search` | Workers AI interpretation with validated filters |
| `POST /api/grace-chat` | Stateful public or signed-in concierge session |
| `POST /api/translate` | Bounded Arabic/Hindi translation |
| `POST /api/analytics/events` | Anonymous, bounded interaction analytics |
| `GET /api/project-updates` | Published runtime project feed |
| `GET /api/market-daily` | Published daily market insight |

### Main agent APIs

All private endpoints are rooted at `/api/agent`.

| Family | Purpose |
| --- | --- |
| `/auth/*`, `/session`, `/logout` | Password/OTP setup, login, session and password change |
| `/admin/*` | Admin unlock, staff creation/update/deletion, reset and canonical photo upload |
| `/inbox/*` | Folder lists, search, read status, drafts, compose, reply, archive and attachments |
| `/crm/*` | Contacts, opportunities, tasks, activities, website-lead import and audit |
| `/advisor-profile` | Advisor profile, public portfolio preferences and publication |
| `/secondary-units/*` | Advisor-owned manually listed units |
| `/property-finder/sync` | Advisor Property Finder profile/listing refresh |
| `/projects`, `/chat`, `/chats` | Authenticated research and conversation history |
| `/documents/*` | Curated offer, proposal and comparison CRUD, PDF download and email send |
| `/avatar/:slug` | Public canonical avatar response |
| `/portfolio/:slug` | Public advisor portfolio response |

`docs/agent-crm.md` contains the detailed CRM endpoint contract.

## 8. Authentication and authorization

Agent authentication is owned by `worker/agent-backend.ts` and D1.

- Session cookie: `psr_agent_session`.
- Session lifetime: 12 hours.
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Password derivation: PBKDF2 SHA-256, 100,000 iterations, per-user salt.
- Session tokens are stored as hashes, not plaintext.
- Repeated failed logins can lock credentials temporarily.
- Temporary passwords force a password change before workspace access.
- Admin unlock cookie: `psr_admin_unlock`.
- Admin unlock lifetime: 30 minutes.
- Admin unlock uses the configured `AGENT_ADMIN_ACCESS_CODE_HASH` Worker secret.
- Access capabilities are independent of display title and include workspace,
  CRM, inbox, research, portfolio and documents.

Never place a password, temporary password, access code, service key or session
cookie in this repository or in this manual. Staff credentials must be managed
through the protected admin workflow.

Current operational warning: D1 has 13 active profiles but only 6 credential
rows. A profile without a credential cannot use password login until an admin
creates or resets that account credential.

The `/leads` and `/analytics` dashboards use a separate signed access cookie.
Their backend expects `LEADS_ACCESS_CODE` and `LEADS_SESSION_SECRET`. Those
secrets are not present in the current Worker version, so code exists but the
access-code login is currently unavailable. Do not claim those dashboards are
fully operational until dedicated secrets are set and a live login is tested.

## 9. D1 database

### Binding

```text
Binding:       DB
Database:      cba-property-db
Database ID:   a5165cff-70a5-4685-af87-5ffdcf08652a
Migrations:    drizzle-agent/
Current state: no pending remote migrations
```

The `cba-property-db` name is a live legacy identifier. Do not rename it to
`psr-property-db`, create a replacement database, or point migrations at an
unreviewed database as part of a normal feature task.

### Active table groups

- Leads: `haus_grace_leads`, `hg_grace_memories`, `hg_client_briefs`.
- Agent identity: `hg_agent_profiles`, `hg_agent_credentials`,
  `hg_agent_sessions`, `hg_agent_login_codes`, `hg_agent_admin_audit`.
- Research/documents: `hg_agent_conversations`, `hg_agent_messages`,
  `hg_agent_documents`, `hg_agent_email_log`.
- Portfolio: `hg_agent_advisor_profiles`, `hg_agent_secondary_units`,
  `hg_agent_property_finder_listings`, `hg_agent_property_finder_sync`.
- CRM: `hg_crm_contacts`, `hg_crm_opportunities`, `hg_crm_tasks`,
  `hg_crm_activities`, `hg_crm_lead_links`, `hg_crm_audit_log`,
  `hg_crm_campaign_events`.
- Inbox: `psr_inbox_messages`, `psr_inbox_attachments`.
- Private downloads: `psr_public_brief_downloads`.
- Analytics/content: `hg_site_analytics_events`, `hg_project_feed`,
  `hg_daily_insights`.

The database also contains older unprefixed CBA/CRM tables. Presence is not
proof of current use. Trace code references before reading, migrating or
deleting any legacy table.

### Read-only data snapshot

At the snapshot time, the active tables contained:

| Metric | Count |
| --- | ---: |
| Active staff profiles | 13 |
| Credential rows | 6 |
| Website leads | 0 |
| CRM contacts | 0 |
| CRM opportunities | 0 |
| CRM tasks | 0 |
| Agent documents | 6 |
| Inbound inbox messages | 1 |
| Outbound inbox messages | 3 |
| Property Finder listings | 0 |
| Analytics events | 13,193 |
| Runtime project feed records | 4 |
| Daily insight records | 14 |
| Client briefs | 0 |

These values are time-sensitive. Re-query rather than copying them into a new
feature decision.

### Safe database commands

```bash
wrangler d1 migrations list cba-property-db --remote --config wrangler.jsonc
wrangler d1 execute cba-property-db --remote --config wrangler.jsonc --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

Apply remote migrations only from the canonical checkout, after tests and a
dry run:

```bash
wrangler d1 migrations apply cba-property-db --remote --config wrangler.jsonc
```

Never run ad hoc destructive SQL without an exact target, recovery plan and
post-change query.

## 10. R2 storage

```text
Binding: MEDIA
Bucket:  psr-property-media
```

The bucket exists and is bound to the production Worker. It stores operational
objects that should not be committed to Git:

- Canonical uploaded advisor photos.
- Inbox attachments.
- Generated private client briefs with expiring tokens.
- Other Worker-managed PSR media objects.

The public static assets under `public/` are different: they are built and
deployed with the application through `env.ASSETS`.

Do not replace R2 with Supabase Storage or S3 without a separately approved
data migration. Do not expose the bucket publicly.

## 11. Workers AI and Durable Objects

`env.AI` is used for bounded, validated tasks including:

- Natural-language project search interpretation.
- Public and signed-in concierge responses.
- Authenticated advisor research.
- Translation.
- Project launch and daily insight summaries.

AI output is an interpretation or narrative layer. Catalogue facts, prices,
unit inputs, routes and persisted records must be validated against the checked
in registry or D1 before they are shown as facts.

`GracePublicAgent` is a Durable Object. Public visitors use a generated chat
session ID. Signed-in advisors use a stable ID derived from their company
email. The Durable Object stores short-term session state. D1 stores lead and
brief memory. Optional Supabase memory can extend signed-in advisor continuity
when its two server secrets are configured.

## 12. Scheduled work

The cron expression is:

```text
17 */6 * * *
```

Every six hours, the Worker schedules:

- Property Finder listing synchronization.
- Deletion of analytics older than 13 months.
- Discovery/publishing of project launch feed records.
- Generation/publishing of the daily market insight.

Content sync currently reads a bounded set of source pages defined in
`worker/content-sync.ts`. Preserve source URLs, timestamps and publication
status. Do not turn the feed into unsourced AI-generated news.

## 13. Email architecture

### Current working flow

Root company mail stays on Google Workspace:

```text
client -> parv@psrhomes.ae -> Google Workspace Gmail
```

The application inbox uses a dedicated Cloudflare subdomain:

```text
client -> parv@inbox.psrhomes.ae
       -> Cloudflare Email Routing rule
       -> psr-property email() handler
       -> PostalMime parse
       -> mailbox normalized to parv@psrhomes.ae
       -> message in D1
       -> attachment in R2
       -> visible only to Parv's signed-in account
```

Outbound mail uses the approved canonical sender and an ingress Reply-To:

```text
PSR app sends From: parv@psrhomes.ae
PSR app sets Reply-To: parv@inbox.psrhomes.ae
client reply returns to the Cloudflare app inbox
```

Current flags:

```text
EMAIL_INBOX_ENABLED=true
EMAIL_SENDING_ENABLED=true
EMAIL_RECEIVE_DOMAIN=inbox.psrhomes.ae
CAMPAIGN_DELIVERY_ENABLED=false
```

Cloudflare Email Routing has active ingress rules for these 13 local parts:

```text
admin, adhiyaman, harna, louay, majhar, parv, pratham, prateek,
reegan, rohit, sonu, sourabh, ujwal
```

The live acceptance message was delivered to
`parv@inbox.psrhomes.ae`, normalized to `parv@psrhomes.ae`, stored unread in
D1, and displayed in Chrome with the real `From` header sender.

### Why direct root mail is not automatically in the app

The public MX records for `psrhomes.ae` point to Google. The MX records for
`inbox.psrhomes.ae` point to Cloudflare. An SMTP sender follows MX, so a new
message addressed directly to `parv@psrhomes.ae` reaches Google and never
reaches Cloudflare unless Google sends a copy.

Do not replace the root Google MX records with Cloudflare records. That can
interrupt the company's normal Gmail delivery. Amazon SES has the same MX
boundary and is not a workaround for this architecture.

### Recommended no-MX-change workaround

Use a Google Workspace recipient address map to copy each canonical mailbox to
its Cloudflare ingress counterpart while retaining original Gmail delivery.

Google Admin path:

```text
Apps -> Google Workspace -> Gmail -> Routing
-> Email forwarding using recipient address map
```

Create these mappings:

```csv
admin@psrhomes.ae,admin@inbox.psrhomes.ae
adhiyaman@psrhomes.ae,adhiyaman@inbox.psrhomes.ae
harna@psrhomes.ae,harna@inbox.psrhomes.ae
louay@psrhomes.ae,louay@inbox.psrhomes.ae
majhar@psrhomes.ae,majhar@inbox.psrhomes.ae
parv@psrhomes.ae,parv@inbox.psrhomes.ae
pratham@psrhomes.ae,pratham@inbox.psrhomes.ae
prateek@psrhomes.ae,prateek@inbox.psrhomes.ae
reegan@psrhomes.ae,reegan@inbox.psrhomes.ae
rohit@psrhomes.ae,rohit@inbox.psrhomes.ae
sonu@psrhomes.ae,sonu@inbox.psrhomes.ae
sourabh@psrhomes.ae,sourabh@inbox.psrhomes.ae
ujwal@psrhomes.ae,ujwal@inbox.psrhomes.ae
```

Choose the incoming-message scope that matches the business requirement, check
`Also route to original destination`, and add `X-Gm-Original-To` for delivery
diagnostics. Apply to a small test group first. Google says routing changes can
take up to 24 hours, although they usually apply sooner.

This action requires Google Workspace Gmail Settings administrator access. The
current Chrome session stopped at a Google passkey challenge, so this mapping
has not been created. Do not bypass the passkey and do not claim root-mail
mirroring is complete until one external message reaches both Gmail and the
PSR app.

Official references:

- [Google Workspace recipient address mapping](https://knowledge.workspace.google.com/admin/gmail/advanced/redirect-or-forward-gmail-messages-to-another-user)
- [Google Workspace dual delivery](https://knowledge.workspace.google.com/admin/gmail/advanced/deliver-email-to-multiple-inboxes-with-dual-delivery?hl=en)
- [Cloudflare Email Routing subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/)
- [Cloudflare Email Worker handler](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/)

### Email verification commands

```bash
dig +short MX psrhomes.ae
dig +short MX inbox.psrhomes.ae
wrangler email routing rules list psrhomes.ae
wrangler email routing settings psrhomes.ae
```

The apex routing settings may report `misconfigured` because Google owns the
root MX. Judge the dedicated subdomain by its MX records, routing rules and a
real inbound test.

## 14. Supabase boundary

Supabase is implemented only as secondary signed-in advisor long-term memory.
It is not used for public pages, auth, CRM, inbox, lead storage, documents,
analytics, staff records or R2 media.

Implemented files:

- `worker/supabase-memory.ts`
- `supabase/migrations/20260822193000_psr_agent_memory.sql`
- `scripts/configure-supabase-cloudflare.sh`
- `tests/supabase-memory.test.ts`

The migration creates:

- `public.psr_agent_memory`
- `public.psr_agent_memory_events`

Both tables force RLS, revoke browser roles, and grant server-only service-role
access. The Worker uses the Supabase REST interface with a short timeout and
fails closed to no long-term memory when configuration is absent.

Current verified state:

- Supabase CLI `2.106.0` is installed.
- This checkout is not linked to a Supabase project.
- `.psr-sync.env` does not exist.
- `SUPABASE_URL` is not a production Worker secret.
- `SUPABASE_SECRET_KEY` is not a production Worker secret.
- Supabase memory is therefore inactive in production.
- The inspected Supabase account project is named `entity`; it is shared with
  unrelated systems and is not a safe PSR target. No dedicated PSR project is
  currently confirmed. Do not select an unrelated project by guesswork.

Safe activation sequence for a dedicated PSR project:

1. Confirm or create the dedicated PSR Supabase project with the user.
2. Copy `.psr-sync.env.example` to ignored `.psr-sync.env`.
3. Set `SUPABASE_PROJECT_REF`, `SUPABASE_PROJECT_NAME`, and `SUPABASE_URL`; do
   not store either Supabase secret in that file.
4. Run `npm run sync:secrets:store` to put the database password and server
   secret key in macOS Keychain.
5. Run `npm run sync:supabase-secrets` to bind the server credentials to the
   Cloudflare Worker.
6. Run `npm run sync:platforms` and review the Supabase migration dry run, RLS,
   grants, Cloudflare D1 state, and Worker bundle before apply.
7. Run `npm run sync:platforms:apply` for the first controlled release.
8. Verify Worker secret names without exposing values.
9. Live-test one signed-in advisor memory read/write and verify no browser can
    query the tables directly.

Never use a `NEXT_PUBLIC_` Supabase secret, never expose a service-role or
`sb_secret_` key to the browser, and never move D1 data into Supabase as part of
enabling memory.

## 15. AWS boundary

AWS is intended only for private, versioned source archives and checksum
manifests. It is not the deployed frontend, backend, database, media store or
email receiver.

Recorded target:

```text
s3://psrhomes-source-613232991880-us-east-1/psrhomes/
```

The bucket was recorded as versioned, SSE-S3 encrypted and Block Public Access
enabled. Current limitations on this Mac:

- The AWS CLI is not installed.
- `.psr-sync.env` does not exist.
- No AWS profile can be used from this checkout right now.
- The latest application archive exists locally under `.sync/releases/`, but
  its upload to S3 was not reverified after the latest Cloudflare-only releases.

The latest local release archive at the snapshot is:

```text
.sync/releases/psrhomes-5ef029ddd98e.tar.gz
.sync/releases/psrhomes-5ef029ddd98e.json
SHA-256: db5acae9afbeeaf68c7018a015707c88a44e1feb1342290524486d9dca7c680d
```

To restore AWS archiving, install AWS CLI, configure the dedicated
least-privilege profile, create ignored `.psr-sync.env`, and run the AWS target
dry run before apply. The profile only needs bucket list/get/put permissions for
the dedicated bucket and prefix. It does not need IAM, CloudFront, Route 53 or
account-wide access.

## 16. Local development

### Install and run

```bash
cd /Users/keifferjapeth/Documents/Codex/PSR/psrhomes
npm ci
npm run dev
```

`npm run dev` starts Vite/Vinext and uses isolated placeholder Cloudflare
bindings from `vite.config.ts`. It must not connect local development directly
to the production D1 or R2 resources.

The public frontend can be reviewed locally without production data. Full
protected-flow local development requires a migrated and seeded local D1 plus
local substitutes for email, AI and R2. There is not currently a supported
single-command local seed for all private workflows. Backend unit tests use
isolated SQLite fixtures and are the safer default for backend work.

### Build and test

```bash
npm run build
npm test
npm run lint
npm run validate:artifact
```

Useful focused tests:

```bash
npx tsx --test tests/inbox-backend.test.ts
npx tsx --test tests/crm-backend.test.ts
npx tsx --test tests/design-system.test.ts
npx tsx --test tests/staff-directory.test.ts
npx tsx --test tests/supabase-memory.test.ts
```

`scripts/install-ci.sh` and some Sites lifecycle helpers assume Linux/GNU
utilities. On this Mac, use normal `npm ci` unless specifically testing that CI
script.

## 17. Deployment and synchronization

### Cloudflare-only application release

Use this when Supabase and AWS are deliberately out of scope:

```bash
PSR_SYNC_TARGETS=cloudflare bash scripts/sync-platforms.sh --dry-run
PSR_SYNC_TARGETS=cloudflare bash scripts/sync-platforms.sh --apply
```

The script:

1. Refuses apply mode when Git is dirty.
2. Installs locked dependencies if required.
3. Verifies Cloudflare authentication.
4. Runs the full tests unless explicitly skipped.
5. Creates an immutable local release archive and manifest.
6. Applies pending D1 migrations.
7. Deploys the Worker with the exact Git commit in its version message.
8. Runs configured production health checks.
9. Writes non-secret release metadata to `.sync/last-success.json`.

Use `--skip-tests` only when the same commit has already passed the complete
suite in the current release session.

### All configured targets

`npm run sync:platforms` and `npm run sync:platforms:apply` use the targets in
ignored `.psr-sync.env`. Do not run all-target apply until the Supabase project,
AWS profile and S3 bucket have each passed a manual dry run.

The post-commit auto-sync hook is installed in `.git/hooks/post-commit`, but it
is currently inactive because `.psr-sync.env` is absent and `PSR_AUTO_SYNC`
defaults to `0`. When enabled, it queues commits and deploys each selected
release from a temporary detached worktree; edits made after the commit cannot
leak into that release, overlapping deploy processes are prevented, and the
next queue request recovers a lock left by a crashed runner. Do not
set `PSR_AUTO_SYNC_MODE=apply` until all configured targets are proven manually;
use `PSR_AUTO_SYNC_MODE=dry-run` for the first automatic canary.

### Current source-control risk

No Git remote is configured. The local `.git` directory is therefore the only
Git history copy on this Mac. Cloudflare has deploy artifacts, and local/S3
archives can recover source snapshots, but neither is a normal collaborative
Git remote. A private remote or reverified S3 upload is a high-priority
resilience improvement.

### Live acceptance after deployment

At minimum, verify:

- `/`, `/projects`, one project detail and one advisor detail.
- `www` redirect and alternate domain.
- Both warm limestone and dark graphite themes.
- Desktop and mobile navigation.
- `Our people` and `Agent login` under `About`.
- Unauthenticated agent API returns `401`.
- Signed-in workspace, CRM, inbox, search and documents.
- Generated PDF download if document code changed.
- A real inbound and reply email if mail code/config changed.
- D1 migration state and Worker binding names.
- Console/network errors and screenshot-level visual appearance.

Automated tests do not replace this acceptance pass.

## 18. Rollback and recovery

List Worker deployments:

```bash
wrangler deployments list --config wrangler.jsonc
```

Rollback the Worker to a known version:

```bash
wrangler rollback <version-id> --config wrangler.jsonc --message "Reason for rollback"
```

Worker rollback does not reverse D1 migrations or data changes. Database
changes require a separately reviewed forward migration or exact data recovery
plan.

To verify a source archive before recovery:

1. Read its JSON manifest.
2. Calculate the archive SHA-256.
3. Compare it with the manifest.
4. Extract into a new folder, never over the current checkout.
5. Run `npm ci`, tests and a production build.
6. Compare the recovered commit and catalogue before deployment.

## 19. Known gaps and priorities

These are current facts, not permission to change them without scope approval.

1. Root Gmail messages are not yet copied into the app. Google recipient
   mapping is the recommended workaround and requires admin passkey access.
2. Only 6 of 13 active D1 profiles currently have credential rows.
3. `LEADS_ACCESS_CODE` and `LEADS_SESSION_SECRET` are not configured, so the
   `/leads` and `/analytics` access-code dashboards are not live-operational.
4. Supabase advisor memory is implemented but inactive and has no confirmed
   dedicated project.
5. AWS CLI is absent and the latest archive upload is not reverified.
6. There is no Git remote.
7. CRM, website lead, client brief and Property Finder listing counts are zero;
   verify intended onboarding before treating this as a defect.
8. Existing lint warnings remain. Do not mix a broad warning cleanup into a
   requested product fix.

## 20. Non-negotiable project rules

- Make only the requested change. Do not add copy, tabs, features or redesigns
  because they seem helpful.
- Preserve the complete project catalogue, dynamic slugs, metadata, brochures,
  structured fields and routes.
- Keep PSR visually distinct. Do not turn it into Haus & Grace, CBA, a generic
  template, or an AI-purple landing page.
- Preserve the dark PSR identity and the intentional alternate warm limestone
  theme.
- Keep `Our people` and `Agent login` under `About`.
- Keep `/agent` sidebar navigation label-only and on the five-role type scale.
- Keep staff display title separate from access role.
- Keep one canonical staff photo across public and private surfaces.
- Treat `psrhomes.ae` as the canonical staff email domain.
- Do not revive `psrproperties.ae` without explicit reconciliation.
- Do not change root Google Workspace MX records as a shortcut.
- Do not add AWS SES as a parallel mail backend.
- Do not rename `cba-property-db` or legacy `hg_*` tables casually.
- Keep D1/R2 as operational sources of truth unless a migration is explicitly
  approved.
- Keep Supabase server-only and limited to its approved secondary contracts.
- Keep campaign delivery disabled until explicitly approved and live-tested.
- Never commit credentials or expose secrets in client code, logs or docs.
- Never delete user changes or use destructive Git commands to recover a file.

## 21. Safe change procedure for another AI

1. Read this file, `README.md`, `docs/SOURCE-PROVENANCE.md`, `wrangler.jsonc`,
   `worker/index.ts`, and the route/component being changed.
2. Run `git status --short` and preserve existing user edits.
3. Trace frontend, Worker handler, D1/R2 storage and tests before editing.
4. State the exact bounded edit before changing files.
5. Use migrations for schema changes; do not patch the production schema only.
6. Add or update regression tests for behavior changes.
7. Run focused tests, the full suite, lint and `git diff --check`.
8. Review the complete diff for unrelated copy or layout changes.
9. Commit one coherent change without amending unrelated history.
10. Dry-run the intended deployment target.
11. Apply only the approved target set.
12. Verify the live result in Chrome and query backend evidence where relevant.
13. Report what is proven, what remains blocked and any external admin action.

## 22. Suggested prompt for the next AI

Use this when handing the repository to another coding agent:

```text
Work only in /Users/keifferjapeth/Documents/Codex/PSR/psrhomes.
Read docs/PSR-FULL-STACK-AI-HANDOFF.md first, then inspect the relevant code.
Preserve the full catalogue, routes, D1/R2 backend, PSR identity, five-role
workspace type scale, and About submenu decisions. Do not make unrelated
changes. Before editing, check git status and trace the full frontend/backend
path. After editing, run focused tests, npm test, npm run lint, git diff --check,
then deploy only the explicitly approved targets and verify the live route in
Chrome. Never change Google Workspace MX, rename cba-property-db, expose
secrets, or assume Supabase/AWS are active without live verification.
```

## 23. Read-only operational command reference

```bash
# Local source
git status --short --branch
git log --oneline -12
git remote -v

# Cloudflare identity and versions
wrangler whoami
wrangler deployments list --config wrangler.jsonc
wrangler versions view 8647a2a4-a765-4ccb-8fac-7c9306542687 --config wrangler.jsonc
wrangler secret list --config wrangler.jsonc

# D1
wrangler d1 migrations list cba-property-db --remote --config wrangler.jsonc
wrangler d1 execute cba-property-db --remote --config wrangler.jsonc --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"

# R2 and mail
wrangler r2 bucket list
wrangler email routing rules list psrhomes.ae
dig +short MX psrhomes.ae
dig +short MX inbox.psrhomes.ae

# Public acceptance
curl -I https://psrhomes.ae/
curl -I https://www.psrhomes.ae/
curl -I https://psr.espacios.me/
curl -i https://psrhomes.ae/api/agent/session
```

Do not include secret values or private client records in a handoff report.
