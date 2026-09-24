# PSR Homes full-stack handoff and critical audit

Snapshot: 2026-09-06, Asia/Dubai  
Scope: <code>psrhomes.ae</code>, <code>www.psrhomes.ae</code>, <code>psr.espacios.me</code>, the canonical local checkout, and the connected Cloudflare stack  
Canonical checkout: <code>/Users/keifferjapeth/Documents/Codex/PSR/psrhomes</code>  
Audit posture: read-only production inspection plus local build, test, source, configuration, and data-shape review  
Deployment performed during this audit: none

This is the current takeover document. It supersedes changing operational facts
in <code>docs/PSR-FULL-STACK-AI-HANDOFF.md</code>, whose snapshot is dated
2026-08-23. The older document remains useful history, but its domain,
deployment, staff, secret, database, and release-state claims must not be treated
as current.

## 1. Executive verdict

The PSR application is running on Cloudflare and is reachable through
<code>https://psr.espacios.me</code>. The primary brand domain is not live.
The failure occurs before the Worker: the <code>.ae</code> registry reports the
domain as expired and under <code>serverHold</code>, so the apex, <code>www</code>,
root mail, and application mail subdomain all return <code>NXDOMAIN</code>.
A Worker redeploy will not repair this incident.

The alternate domain is not a separate application. It is another custom-domain
entry to the same <code>psr-property</code> Worker. It currently serves public
pages, protected login shells, APIs, static assets, D1-backed feeds, R2-backed
media operations, Workers AI functions, and the Grace Durable Object.

The live alternate site is operational but not safe to treat as a complete
replacement for the primary:

- every inspected canonical URL, Open Graph URL, JSON-LD origin, sitemap URL,
  and the robots sitemap directive points to the dead primary domain;
- public email addresses use the dead domain and currently have no working MX;
- project-feed detail pages use generic, incorrect canonical metadata;
- the source and release chain is not reproducible from committed Git;
- several privacy, authorization, catalogue, AI-abuse, data-integrity, and
  interaction defects should be resolved before the next feature release.

### Stop-the-line priorities

| ID | Severity | Problem | Current impact | Required owner |
| --- | --- | --- | --- | --- |
| INC-001 | P0 | <code>psrhomes.ae</code> is expired and under registry <code>serverHold</code> | Apex, <code>www</code>, root mail, inbox mail, canonicals and sitemap destinations are unavailable | Domain registrant / finance / registrar administrator |
| INC-002 | P0 | Alias publishes the dead primary as canonical | Search engines and social crawlers are directed away from the only reachable host | SEO owner plus engineer, after domain recovery decision |
| INC-003 | P0 | Root and inbox mail DNS are <code>NXDOMAIN</code> | Company mail and Cloudflare inbound mail cannot be assumed deliverable | Domain owner, Google Workspace admin, Cloudflare admin |
| REL-001 | P1 | Deployed code cannot be reproduced from the committed checkout | Rollback, review and takeover are unsafe; there is no remote Git backup | Engineering owner |
| SEC-001 | P1 | One shared six-digit code grants both lead PII and analytics access | No individual identity, MFA, attribution or per-user revocation | Security / engineering |
| PRI-001 | P1 | Advisor portfolio publication control can fall through to static public contact data | A private or inactive advisor can still be exposed | Engineering / privacy owner |
| CAT-001 | P1 | Live-feed records are merged after base pagination | Some catalogue records can disappear between pages and totals can vary | Engineering |
| PRICE-001 | P1 | Compact <code>K</code>/<code>M</code> prices are parsed incorrectly | Community prices and budget filtering can be materially wrong | Data / engineering |
| CAT-002 | P1 | Archived, ready, sold-out and off-plan lifecycle states are inconsistent | Public directories and lead CTAs can misrepresent availability | Content / data / engineering |
| ENTITY-001 | P1 | Weak developer entities and unresolved developer links are indexable | Bogus entities and 404 links reduce trust and crawl quality | Data / SEO / engineering |
| SEO-001 | P1 | Runtime latest-project slugs have generic metadata and a bad canonical | Duplicate/index-quality risk for every D1-fed launch page | SEO / engineering |
| UX-001 | P1 | Latest-project page auto-opens a second lead form | Interruptive acquisition flow reproduces the reported “another form” problem | Product / design / engineering |
| UX-003 | P1 | Fixed conversion launchers overlap mobile form controls | Visitors can be blocked from selecting fields or submitting | Product / frontend |
| DAT-001 | P1 | Third-party catalogue and media provenance is not fully controlled | Licensing, brand-representation, availability and hotlink risk | Content / legal / engineering |

P0 means service restoration or immediate containment. P1 means fix before the
next feature release. P2 means scheduled correctness, reliability, performance
or compliance work. P3 means hardening or cleanup.

## 2. Evidence model and limitations

The handoff distinguishes these evidence classes:

| Label | Meaning |
| --- | --- |
| Live observed | DNS, WHOIS, HTTP, rendered browser DOM, computed style, or live API status observed on 2026-09-06 |
| Cloudflare observed | Read-only Wrangler output from the authenticated account |
| Local executed | A command or test executed against the current checkout |
| Source-derived | A behavior established from current code/configuration but not exercised against production |
| Inference | A likely consequence that must still be confirmed with a controlled live test |
| Not verified | An integration could not be safely or credibly tested in this audit |

No lead form was submitted, no production login credential was used, no mail
was sent, no D1 or R2 record was changed, no Cloudflare setting was changed, and
no deployment was performed.

The primary domain could not be visually audited because DNS resolution fails.
Formal Core Web Vitals, network waterfalls, CPU traces, and cache-hit traces
were not captured because the required Chrome DevTools performance interface
was unavailable. Browser timings in this document are observations, not
laboratory or field CWV measurements.

## 3. Domain-by-domain truth table

| Surface | DNS / registry | HTTP | Application state | Canonical/SEO state | Mail state |
| --- | --- | --- | --- | --- | --- |
| <code>psrhomes.ae</code> | <code>NXDOMAIN</code>; WHOIS <code>serverHold (Expired)</code> and <code>serverUpdateProhibited (Expired)</code> | Unreachable | Worker route exists but DNS never reaches it | Intended canonical, currently dead | Apex MX/TXT are <code>NXDOMAIN</code> |
| <code>www.psrhomes.ae</code> | <code>NXDOMAIN</code> | Unreachable | Worker contains a 301-to-apex branch but it cannot be reached | Intended redirect, currently dead | Not applicable |
| <code>psr.espacios.me</code> | Resolves through Cloudflare | HTTP/2 200 | Live alternate route to the same Worker | Pages advertise <code>https://psrhomes.ae</code>, not the reachable host | Public links still use <code>@psrhomes.ae</code> |
| <code>inbox.psrhomes.ae</code> | <code>NXDOMAIN</code> | Not an HTTP surface | Cloudflare Email Routing rules still exist | Not applicable | Inbound application mail is DNS-unreachable |

WHOIS identifies AESERVER as registrar and retains Cloudflare nameservers
<code>grant.ns.cloudflare.com</code> and <code>fatima.ns.cloudflare.com</code>.
The nameserver values do not overcome registry hold. Renewal/unhold must happen
at the registrant/registrar layer first.

### Alternate-domain response controls

The live alternate site returned:

- <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code>;
- <code>Permissions-Policy: camera=(), microphone=(), geolocation=()</code>;
- <code>Referrer-Policy: strict-origin-when-cross-origin</code>;
- <code>X-Content-Type-Options: nosniff</code>;
- <code>X-Frame-Options: DENY</code>;
- public HTML cache control of
  <code>public, max-age=0, s-maxage=90, stale-while-revalidate=300</code>;
- protected document cache control of <code>private, no-store</code>;
- public feed JSON cache control of
  <code>public, max-age=300, stale-while-revalidate=900</code>.

No document-level Content Security Policy header was observed.

## 4. Recovery runbook for the primary-domain incident

Do these steps in order. Do not redeploy the Worker expecting it to resolve
<code>NXDOMAIN</code>.

### Phase A: regain the domain

1. Sign in to the verified registrant account for <code>psrhomes.ae</code>.
2. Confirm the legal registrant, billing contact, renewal invoice and expiry.
3. Renew the domain and request removal of <code>serverHold</code>.
4. Record the registrar case number and renewal receipt outside this repository.
5. Wait until WHOIS no longer reports expired hold statuses.
6. Confirm that authoritative NS delegation is visible again.

Acceptance:

- WHOIS contains no expired hold status;
- <code>dig psrhomes.ae NS</code> returns the expected Cloudflare nameservers;
- the Cloudflare zone is active rather than pending or moved.

### Phase B: restore web DNS

1. Inspect the restored Cloudflare zone before changing records.
2. Confirm the Worker routes for the apex and <code>www</code> still exist.
3. Confirm apex and <code>www</code> resolve publicly.
4. Verify <code>https://psrhomes.ae/</code> returns the expected application.
5. Verify <code>https://www.psrhomes.ae/anything</code> preserves the path and
   redirects once to the apex with 301.
6. Compare the apex and alternate host for build/version parity.

Acceptance:

- apex returns 200;
- <code>www</code> returns one correct 301;
- TLS is valid;
- public and protected cache boundaries match the alias;
- no redirect loop or cross-brand content appears.

### Phase C: restore mail DNS

1. Reconfirm the intended Google Workspace MX records at the apex.
2. Reconfirm SPF, DKIM and DMARC TXT records.
3. Reconfirm Cloudflare Email Routing MX records for
   <code>inbox.psrhomes.ae</code>.
4. Confirm the existing Email Routing rules are enabled for approved staff
   aliases and the catch-all policy is intentional.
5. Send one external test to a Google Workspace mailbox.
6. Send one external test to the matching inbox subdomain.
7. If Google-to-app copying is required, verify the approved Workspace routing
   map with a real dual-delivery test.
8. Send a controlled reply from the authenticated workspace and verify thread,
   sender, Reply-To, D1 record and attachment behavior.

Acceptance:

- apex and inbox MX answer publicly;
- SPF/DKIM/DMARC pass on controlled delivery;
- the Google mailbox and application mailbox each receive only their intended
  copy;
- no catch-all leaks mail across staff accounts.

### Phase D: restore search trust

1. Crawl the apex after DNS recovery.
2. Verify every canonical, Open Graph URL, JSON-LD URL, sitemap entry and robots
   directive resolves.
3. Fix runtime latest-project metadata before submitting those URLs.
4. Resubmit the sitemap in the relevant search-console account.
5. Watch coverage, crawl errors and canonical selection for at least two crawl
   cycles.

If registrar recovery is not possible within the business deadline, make an
explicit executive decision to promote <code>psr.espacios.me</code> temporarily.
That is a migration, not a cosmetic switch: canonicals, site origin, sitemap,
robots, JSON-LD, Open Graph, email copy, analytics, Search Console and all
campaign destinations must be changed together. Do not create split canonicals.

## 5. System architecture

~~~text
Browser / crawler / API client
  |
  +-- psrhomes.ae and www.psrhomes.ae
  |     currently blocked at registry/DNS
  |
  +-- psr.espacios.me
        |
        v
Cloudflare Worker: psr-property
  |
  +-- Vinext / Vite / React application
  |     +-- app/ routes
  |     +-- components/
  |     +-- public/ assets
  |
  +-- Worker API dispatch
  |     +-- project and semantic search
  |     +-- translations
  |     +-- content feeds
  |     +-- analytics
  |     +-- leads dashboard
  |     +-- agent, CRM and inbox
  |
  +-- D1: cba-property-db
  +-- R2: psr-property-media
  +-- Workers AI: AI
  +-- Durable Object: GracePublicAgent
  +-- Images binding: IMAGES
  +-- Send Email binding: EMAIL
  +-- Static asset binding: ASSETS
  +-- Cron: six jobs every six hours

Optional / separate:
  +-- Supabase REST: advisor long-term memory only, currently inactive
  +-- Amazon S3 source archives: disaster recovery, not an application backend
  +-- Optional R2-to-S3 media mirror in source, currently not configured live
~~~

Cloudflare is the production runtime. D1 is the operational database. R2 is the
primary private object store. Supabase and S3 must not be treated as substitute
sources of truth without an approved migration.

## 6. Source authority and release reproducibility

### Canonical local checkout

| Item | Current state |
| --- | --- |
| Path | <code>/Users/keifferjapeth/Documents/Codex/PSR/psrhomes</code> |
| Branch | <code>main</code> |
| HEAD | <code>43d0db4510b416ec986f5c2a59d478bc5a7bd783</code> |
| Git remote | None |
| Tracked changed files | 88 |
| Untracked entries | 64 |
| Total dirty entries | 152 |
| Latest local sync receipt | Cloudflare-only commit <code>d2e503d27cc5d9acaa4fb4c6921673b168cd39a7</code>, completed 2026-08-23 |
| Latest local archive for current HEAD | <code>.sync/releases/psrhomes-43d0db4510b4.tar.gz</code> with manifest SHA-256 |

The current working tree contains substantial user work across frontend,
backend, migrations, tests, data and media. Never use a hard reset, checkout
over changed files, bulk clean, or destructive recovery command.

### Live deployment

| Item | Observed state |
| --- | --- |
| Worker | <code>psr-property</code> |
| Active version | <code>f72247fe-ef8f-48fc-a6a9-46cb3f27f6ba</code> |
| Created | 2026-09-05T15:59:08.854Z |
| Message | Publish complete Emirates editorial image set |
| Wrangler deployment source | Unknown |

The deployed version is newer than the last committed Git history and local
sync receipt. No Git remote exists. Therefore the current production source
cannot be recreated from committed HEAD alone. Cloudflare artifacts and old
archives are recovery aids, not a collaborative source-control strategy.

### Required release-chain repair

1. Freeze feature deployment until the dirty tree is classified.
2. Create an inventory of every changed and untracked file by feature/owner.
3. Run secret and large-file checks without deleting anything.
4. Commit coherent changes in reviewable units.
5. Create a private Git remote and push the full, reviewed history.
6. Embed the commit SHA in the build artifact and deployment message.
7. Remove or lock down <code>npm run deploy:psr</code>; it currently uploads the
   configured <code>dist</code> without build, tests or D1 migration application.
8. Use one guarded command that builds from a clean commit, runs tests and lint,
   checks remote migrations, deploys, and executes public plus authorized smoke
   tests.
9. Record the Cloudflare version, commit, migration set, operator, timestamp and
   acceptance evidence for each release.

Acceptance: a new engineer can clone the private remote, check out the recorded
commit, create an identical artifact, match its manifest, run all tests, and
identify the exact Cloudflare version without relying on this Mac's dirty tree.

### Local development contract

Use Node 22.13 or newer and the committed npm lockfile:

~~~bash
cd /Users/keifferjapeth/Documents/Codex/PSR/psrhomes
npm ci
npm run dev
~~~

Development uses isolated placeholder bindings from <code>vite.config.ts</code>:
a placeholder D1 database called <code>site-creator-d1</code>, a placeholder R2
bucket called <code>site-creator-r2</code>, and the local Grace Durable Object.
It must not point at the production D1 or R2 resources. Production builds read
the real bindings from <code>wrangler.jsonc</code>.

The public frontend can be reviewed without production data. Complete protected
flows require a migrated and seeded local D1 plus controlled substitutes for
Email, Workers AI and R2. There is no confirmed one-command seed for every
private workflow. Use the isolated backend tests as the default safety net.

The current local runtime is not interaction-equivalent to production for the
latest-project flow: the local project URL returned 200, but its
<code>/api/project-updates</code> request returned 404 and left the verification
shell in place. A local theme boot state was also observed changing visually
while the switch ARIA state remained stale; live correctly updated its checked
state. Repair and test these differences before using local browser QA as proof
of production interaction parity.

Useful commands:

~~~bash
npm run build
npm test
npm run lint
npm run validate:artifact
npx tsx --test tests/inbox-backend.test.ts
npx tsx --test tests/crm-backend.test.ts
npx tsx --test tests/design-system.test.ts
npx tsx --test tests/staff-directory.test.ts
npx tsx --test tests/supabase-memory.test.ts
~~~

Generated <code>node_modules</code>, <code>dist</code>, <code>.next</code>,
<code>.vinext</code>, <code>.wrangler</code>,
<code>.sites-runtime</code> and <code>.sync</code> are not source authority.
The project-local <code>.sync</code> archives are recovery artifacts and can be
large; do not commit them.

### Optional platform boundaries

<code>scripts/sync-platforms.sh</code> supports three deliberately separate
targets:

- Cloudflare: build, D1 migration and Worker deployment;
- Supabase: checked-in migrations for advisor long-term memory only;
- AWS: private source archive and manifest upload only.

The script refuses apply mode on a dirty tree. With no
<code>.psr-sync.env</code>, it defaults to Cloudflare. Its default health check
uses the currently dead primary domain, so an apply would fail post-deployment
until the registrar incident is resolved. Do not change that check merely to
make a release appear green; explicitly decide and document the intended
canonical host.

The optional Supabase implementation lives in
<code>worker/supabase-memory.ts</code> and
<code>supabase/migrations/20260822193000_psr_agent_memory.sql</code>. It creates
server-only <code>psr_agent_memory</code> and
<code>psr_agent_memory_events</code> contracts with RLS. The current checkout
has no <code>.psr-sync.env</code>, and the live Worker secret list has no
<code>SUPABASE_URL</code> or <code>SUPABASE_SECRET_KEY</code>; treat the
integration as inactive.

If activated, use a dedicated PSR project, verify project name and ref, keep the
database password and service secret in the operating-system credential store
and Worker secrets, apply only checked-in migrations, and prove that browser
roles cannot read the memory tables. Never use a
<code>NEXT_PUBLIC_</code> service credential.

The documented AWS source-archive bucket is
<code>psrhomes-source-613232991880-us-east-1</code>. AWS CLI is absent on this
Mac, and the remote bucket/versioning/encryption/latest upload were not
reverified in this audit. Install the CLI and use a least-privilege profile only
after confirming the account and bucket owner. An archive target needs
list/get/put on its dedicated prefix, not IAM, Route 53 or account-wide access.

## 7. Runtime and Cloudflare configuration

The production file <code>wrangler.jsonc</code> currently declares:

| Concern | Value |
| --- | --- |
| Main | <code>dist/server/index.js</code> |
| Compatibility date | <code>2026-08-20</code> |
| Compatibility flag | <code>nodejs_compat</code> |
| Workers.dev | disabled |
| Routes | apex pattern, <code>www</code> pattern, <code>psr.espacios.me</code> custom domain |
| D1 | <code>DB</code> to <code>cba-property-db</code> |
| R2 | <code>MEDIA</code> to <code>psr-property-media</code> |
| AI | <code>AI</code> |
| Durable Object | <code>GRACE_PUBLIC_AGENT</code> to <code>GracePublicAgent</code> |
| Images | <code>IMAGES</code> |
| Send Email | <code>EMAIL</code> |
| Assets | <code>./dist/client</code>, Worker runs first |
| Cron | <code>17 */6 * * *</code> |
| Logs | enabled, 100% head sampling and invocation logs |
| Traces | enabled, 1% head sampling |

Non-secret live variables:

- <code>CAMPAIGN_DELIVERY_ENABLED=false</code>;
- <code>EMAIL_INBOX_ENABLED=true</code>;
- <code>EMAIL_SENDING_ENABLED=true</code>;
- <code>EMAIL_RECEIVE_DOMAIN=inbox.psrhomes.ae</code>;
- <code>EMAIL_CANONICAL_REPLY_TO_ENABLED=false</code>.

Observed secret names, without values:

- <code>AGENT_ADMIN_ACCESS_CODE_HASH</code>;
- <code>LEADS_ACCESS_CODE</code>;
- <code>LEADS_SESSION_SECRET</code>.

No Supabase or AWS runtime secret names were observed. The Supabase memory
adapter and optional media mirroring code should therefore be considered
inactive in production unless a later read-only secret check proves otherwise.
The Images binding is active source functionality: it inspects and transforms
secondary-unit uploads and prepares bounded images for generated client/curated
briefs.

The local development workerd compatibility date is <code>2026-07-28</code>,
while production/build use <code>2026-08-20</code>. Align these to one source of
truth to avoid preview/production runtime drift.

## 8. Frontend route and component handoff

### Public page families

- <code>/</code>
- <code>/about</code>
- <code>/advisors</code> and <code>/advisors/:slug</code>
- <code>/projects</code>, <code>/projects/:slug</code>, and
  <code>/projects/latest/:slug</code>
- <code>/developers</code> and <code>/developers/:slug</code>
- <code>/communities</code> and <code>/communities/:slug</code>
- <code>/emirate</code> and <code>/emirate/:slug</code>
- <code>/off-plan</code>
- <code>/insights</code>, <code>/insights/:slug</code>, and
  <code>/insights/daily</code>
- <code>/journal</code>
- <code>/services</code>
- <code>/contact</code>
- <code>/list-your-property</code>
- <code>/mortgage-calculator</code>
- <code>/privacy</code>
- <code>/terms</code>
- <code>/properties</code>, which redirects to <code>/projects</code>

### Protected or operational pages

- <code>/agent</code>: staff workspace;
- <code>/admin</code>: administrator shell;
- <code>/leads</code>: website lead dashboard;
- <code>/analytics</code>: first-party analytics dashboard.

The protected HTML shells returned 200 with private no-store caching and
noindex/nofollow/noarchive/nocache metadata. Their unauthenticated APIs returned
401 in the sampled checks. This is a positive boundary, but dashboard access
architecture still needs the security change described below.

### Main component ownership

| Surface | Primary source |
| --- | --- |
| Root layout, metadata, scripts | <code>app/layout.tsx</code> |
| Header, menus and footer | <code>components/Chrome.tsx</code> |
| Theme system | <code>app/globals.css</code>, <code>app/psr-theme.css</code> |
| Language experience | <code>components/LanguageExperience.tsx</code> |
| Catalogue/filter UI | <code>components/ProjectCatalogue.tsx</code>, <code>components/RegistryProjectGrid.tsx</code> |
| Community directory | <code>components/CommunityDirectory.tsx</code> |
| Runtime launch detail | <code>components/LatestProjectDetail.tsx</code> |
| Lead forms/modal | <code>components/ProjectLeadExperience.tsx</code> |
| Public advisor page | <code>components/PublicAdvisorPortfolio.tsx</code> |
| AI concierge | <code>components/GraceChat.tsx</code>, <code>components/DeferredConcierge.tsx</code> |
| Staff workspace | <code>components/AgentWorkspace.tsx</code> |
| Analytics collection | <code>components/SiteAnalytics.tsx</code> |

Preserve real catalogue routes, metadata, brochures, public profiles, search,
forms, APIs and protected tools. Do not replace the system with demo arrays or
an SEO-only shell.

## 9. Current interface, typography and accessibility state

### Positive observations

- Representative fully rendered live pages used only
  <code>Inter, "Inter Fallback", Inter, "Helvetica Neue", Arial, sans-serif</code>.
  No Georgia, Times New Roman or generic serif was computed on the inspected
  browser pages, including the Olfah runtime project page.
- Dark Graphite and Gold/warm-limestone themes both produced readable hero and
  mobile-menu foreground/background combinations in inspected states.
- Representative desktop and mobile routes had no horizontal page overflow,
  no broken visible images, no missing image alt attributes, one H1, and named
  search/select controls.
- At the inspected narrow layout, only one language selector was visible even
  though the DOM contains multiple responsive instances.
- The header switches at the current breakpoint rather than visibly combining
  desktop and mobile navigation.

### UX-001: duplicate and interruptive lead capture

On <code>/projects/latest/olfah-6-alef-group-sharjah</code>, the page first
renders “Verifying the latest project release.”, then resolves the real project
after client data loads. Without a user click, the configured 30-second timer
auto-opens the “Receive a Private Brief” modal. A second compact enquiry form
remains lower on the same page. This is the direct explanation for the reported
“another form” behavior; viewport changes can make it more noticeable, but the
underlying cause is two form surfaces plus a timed auto-open.

At 1440 by 900, the live document changed from an approximately 1,125-pixel
verification shell to an approximately 7,988-pixel hydrated project page; the
feed request took about 1.08 seconds in that observation. Server-render or
edge-cache the published record and reserve stable geometry instead of
replacing nearly the entire page after hydration.

Required correction:

1. remove the timed auto-open;
2. open one canonical form only after an explicit user action;
3. make lower-page acquisition controls open the same form or remain a clearly
   different, non-duplicative action;
4. restore focus to the control that opened the dialog after Escape/close;
5. retain focus containment while the dialog is modal;
6. add desktop, tablet, portrait-phone and landscape-phone tests.

### UX-003: mobile conversion controls overlap

At 390 by 844 in the local dark-theme build, the 64-by-64 Sonu launcher
overlapped the property-type field and Find button. On the live project page at
844 by 390 in Gold, the project-brief float and 72-by-72 Sonu launcher occupied
the same bottom-right region.

Suppress or reposition fixed launchers while a user is completing a form,
reserve safe-area/bottom space, and create a single collision rule for Sonu,
project brief, cookie/consent UI, browser safe area and virtual keyboard.
Acceptance must cover 390-by-844, 844-by-390 and at least one smaller supported
viewport with every form field and submit action unobstructed.

### Additional accessibility and interaction findings

- The Sonu assistant exposes quick prompts wider than their visible container.
  The sampled strip was 342 pixels wide with 557 pixels of scroll content, so
  some actions were off-canvas with no obvious overflow affordance.
- Forward Tab order from the Sonu input jumps to the launcher and can escape to
  background navigation; quick actions are skipped.
- Two controls can share the accessible name “Close Sonu”.
- Currency selectors measured approximately 28 by 26 pixels and are represented
  as checkboxes although the choice is mutually exclusive. Use a radio group or
  segmented single-select with at least a 44-pixel target.
- “Reset filters” was approximately 77 by 15 pixels in the inspected state.
- Cards expose image/overlay and title links to the same destination, creating
  redundant keyboard stops.
- Opening the mobile menu does not lock background scrolling.
- The mobile-menu accessible name remained “Open navigation” while expanded,
  and Escape did not close it in the inspected phone state.
- Multiple language-selector components exist in the DOM for responsive
  variants. This is currently hidden rather than visibly duplicated, but it
  adds state and accessibility complexity.
- Sample mobile documents were extremely long: home measured about 14,211
  pixels and Olfah about 11,574 pixels at 390-pixel width. Use progressive
  disclosure for secondary intelligence without hiding decision-critical
  property facts.

### Forms and progressive enhancement

Contact and listing forms expose labels, required states, consent controls, and
an aria-hidden honeypot in the inspected browser. However, the forms have no
explicit <code>action</code> or <code>method</code>. React prevents native
submission, but a hydration/JavaScript failure can fall back to GET and place
name, email, phone and message in the URL, browser history, logs and referrer
data.

Required correction: implement a real POST fallback to a server handler or
explicitly disable unsafe native submission while preserving an accessible
error path. Add a no-JavaScript test that proves PII never enters the URL.

### Typography residue

The browser-facing pages are on Inter, but <code>app/api/leads/route.ts</code>
still includes several inline email headings with
<code>font-family:Georgia,serif</code>. If the brand requirement is “no Georgia
or serif anywhere in the product,” replace these email styles and test rendered
email HTML. This is not evidence that Georgia remains on the web page.

## 10. Staff and public-profile identity

The current checked-in roster contains 15 people:

| Display name | Public role | Public slug |
| --- | --- | --- |
| Sonu Sharma | Managing Director | <code>sonu-sharma</code> |
| Prateek Rawal | Managing Partner | <code>prateek-rawal</code> |
| Reegan Negi | Managing Partner | <code>reegan-negi</code> |
| Parv Sondhi | Managing Partner | <code>parv-sondhi</code> |
| Jumanah | Managing Partner | <code>jumanah</code> |
| Neshva Chundayil | Head Accountant | <code>neshva-chundayil</code> |
| Janet Genabio | Office Coordinator | <code>janet-genabio</code> |
| Sourabh Das | Property Consultant | <code>sourabh-das</code> |
| Mazhar Khan | Property Consultant | <code>majhar-khan</code> |
| Louay Betengane | Property Consultant | <code>louay-betengane</code> |
| Rohit Kumar Sinha | Property Consultant | <code>rohit-kumar-sinha</code> |
| Adhiyaman Aathimulam | Property Consultant | <code>adhiyaman-aathimulam</code> |
| Pratham Raval | Property Consultant | <code>pratham-raval</code> |
| Ujwal Kumar | Property Consultant | <code>ujwal-kumar</code> |
| Harna Raval | Property Consultant | <code>harna-raval</code> |

The sitemap contains 16 advisor URLs including the directory. D1 contains 15
profile rows and 15 credential rows at this snapshot. Public role/title must
remain separate from authorization role/access grants.

### PRI-001: publication-state bypass

Source review found that the public portfolio query correctly filters for
active, onboarded, published records, but a filtered-out static team member can
fall through to a static response that includes email and phone. The
server-rendered page can also emit static contact details in JSON-LD regardless
of D1 publication state.

Required behavior:

- an explicitly private, inactive or deleted D1 advisor must return 404 or 410;
- static fallback may only be used when no migrated record exists and the
  intended migration policy explicitly permits it;
- HTML, JSON API, JSON-LD, sitemap and cards must use the same visibility
  decision;
- tests must cover private, inactive, deleted, unmigrated and public states.

## 11. Catalogue, communities and developers

### Project layers

| Layer | Count / state |
| --- | --- |
| Base <code>data/projects.json</code> | 1,312 total; 1,044 current; 268 archived |
| Effective local registry after curated merges | 1,334 total; 1,068 current; 266 archived |
| Registry generation timestamp | 2026-07-22T11:20:58.155Z |
| Index Tier A | 29 |
| Index Tier B | 4 |
| Index Tier C | 1,301 |
| Indexable project routes | 33 |
| Live D1 project-feed rows | 7 |

The base JSON count and effective count are intentionally different because
current curated launch collections are merged at runtime. A handoff must always
state which layer it is quoting.

Current field gaps across the effective registry:

- 38 records without price;
- 337 without handover;
- 227 without payment plan;
- 1,035 without description;
- 438 without brochure;
- 1,327 with remote hero media;
- 266 without <code>sourceUpdatedAt</code>.

The Tier A/B/C gate is a positive control: only 33 sufficiently supported
projects are indexable. Do not weaken it to make the sitemap larger.

### PRICE-001: compact price parsing is materially wrong

Some public code normalizes a compact string by stripping non-digits instead of
applying its suffix. This turns <code>AED 1.98M</code> into approximately
<code>1.98</code> and <code>AED 95K</code> into <code>95</code>. The live Dubai
Hills Estate community page displayed an entry price of <code>AED 95</code>,
and a live max-price search could return a project whose actual source label is
<code>AED 1,980,000</code>. The current repository scan found 56 affected
communities.

Use one canonical money parser at ingestion, filtering and presentation. It
must support decimals, commas, <code>K</code>, <code>M</code> and already
normalized numeric values; reject implausible results; preserve original label,
currency, numeric AED value, source and date. Add regression tests before
changing the affected records.

### CAT-002: lifecycle and availability are inconsistent

The projects directory includes archived records while describing the
catalogue as current/upcoming, and cards do not expose archived state. The
off-plan page excludes only the <code>archived</code> flag, so its selected pool
also includes 381 records classified as ready. Its sampled first page included
sold-out or resale-only entries.

Create one reviewed lifecycle enum, for example draft, announced, presale,
selling, under-construction, ready-primary, ready-resale, sold-out, withdrawn
and archived. Define allowed transitions and apply the same state to:

- public directory inclusion and labels;
- off-plan selection;
- API filters and counts;
- search/AI eligibility;
- lead and brochure CTAs;
- sitemap/index status;
- source freshness and staff override.

Acceptance: each record appears in the correct family, carries an explicit
status/source/date, and totals reconcile across registry, API, page and sitemap.

### CAT-001: live-feed pagination defect

The Worker currently lets the base API paginate and then prepends live-feed
items to page one before slicing again. With six unique live items, page one can
show live 1–6 plus base 1–18 while page two begins at base 25; base 19–24 become
unreachable. Duplicate checks scoped to a page can also make totals change by
page.

Merge the complete logical dataset before pagination, or compute the base
offset from the live prefix. Add boundary tests for 0, 1, 6 and 24 live items,
duplicates on different pages, stable totals, and complete traversal.

### Communities

The live directory displays 213 canonical community guides:

- 158 have active catalogue projects;
- 35 are archive-only;
- 20 are curated zero-project guides;
- 20 have zero total projects;
- 67 have one total project;
- 21 have two total projects;
- 105 have three or more.

Of the 213 pages, 186 use the same generic overview pattern and only 20 have
curated source enrichment. This makes many canonical pages technically valid
but weak as independent search entities. Index eligibility should require
original, source-backed community content as well as a canonical identity.

The route system currently has 213 directory entries, 348 canonical-plus-alias
route slugs, and no exact canonical-slug duplicate. The sitemap correctly emits
canonical directory slugs, not every alias. However, conceptual duplicates and
thin indexation remain, including:

- Al Zorah, Al Zorah City, and Al Zorah (Al Zorah City);
- Jumeirah Village Circle, Jumeirah Village Circle (JVC), and JVC;
- Palm Jumeirah and Palm Jumeirah Island;
- Dubai Marina and Marina;
- Dubai Maritime City and Maritime City;
- Sobha Siniya Island variants;
- Jumeirah Village Triangle variants;
- Dubai Land Residence Complex and DLRC variants;
- Sustainable City variants;
- Jumeira Bay and Jumeira Bay Island;
- Bluewaters Island and Bluewaters Residences.

Curated guide aliases are applied after project grouping, so a future area such
as “The Villa Dubai” can create a separate project-derived community while the
curated canonical guide remains empty. Seed canonical groups first, map every
project through an explicit alias table, and fail tests on collisions.

The AI knowledge layer reports 173 communities while the directory reports 213.
Replace the ambiguous single count with explicit
<code>activeCatalogueCommunities</code>, <code>archiveCommunities</code>,
<code>communityGuides</code>, and <code>zeroProjectGuides</code>.

Zero-project pages should not say “On request” as though inventory exists or
use “What is being built” for mature communities. Prefer “No current PSR
catalogue record” and “Community composition.”

One locally reproduced correctness defect maps Arabian Ranches III to the
Arabian Ranches I benchmark of AED 2,417/sqft because a generic alias matches
the numbered phase. Require exact canonical or explicit phase aliases.

### Developers

The live sitemap exposes 276 developer-detail routes plus the directory:

- 177 developers have one total record;
- 35 have two;
- 64 have three or more;
- 96 have zero active records;
- 102 have one active record;
- 25 have two active records;
- 53 have three or more active records.

The base source includes obvious brand fragmentation such as case variants,
generic words and project-title fragments. Preserve old routes for compatibility
but introduce one canonical developer identity table, 301 redirects, index
gates, and merge review. Do not silently collapse unrelated companies.

Only one developer profile was found with editorial/official-site enrichment.
The permissive parser has created indexable “developers” such as
<code>four</code>, <code>golf</code>, <code>lagoon</code>,
<code>marina</code>, <code>meera</code> and <code>townhouses</code>, each of
which can receive an Organization schema assertion.

A resolver audit found 14 unresolved developer slugs affecting 26 project
records; three records are current and two are indexable. Live examples included
project links to <code>/developers/mantra-developments</code> and
<code>/developers/westf5-development</code>, both returning 404.

Use one canonical resolver for directory creation and project links. Quarantine
low-confidence parsed labels, require verified identity plus useful original
content before indexation, and fail the build when an indexable project points
to a missing entity.

## 12. Sitemap, SEO and GEO

The live sitemap contains 652 unique URLs:

| Family | URLs |
| --- | ---: |
| Home | 1 |
| Project directory/details | 34 |
| Off-plan | 1 |
| Developer directory/details | 277 |
| Community directory/details | 214 |
| Emirate directory/details | 8 |
| Insights family | 93 |
| Advisor directory/details | 16 |
| Remaining journal, service, company, legal and utility pages | 8 |
| Total | 652 |

Every sitemap URL uses the dead <code>https://psrhomes.ae</code> origin.
<code>robots.txt</code> also advertises the dead host and sitemap. The homepage
“VIEW PSR HOMES” link points to the dead apex. The footer “Our listings” link
points to <code>/properties</code>, adding an avoidable redirect to
<code>/projects</code>.

<code>lib/seo.ts</code> reads <code>NEXT_PUBLIC_SITE_ORIGIN</code> and otherwise
defaults to <code>https://psrhomes.ae</code>. This single setting fans out to
layout metadata, canonicals, JSON-LD, Open Graph, sitemap, robots, advisor share
links and <code>llms.txt</code>. Do not change it in isolation: a temporary
canonical-host migration requires a coordinated build, crawl and campaign
review.

### SEO-001: runtime project metadata

The live route
<code>/projects/latest/olfah-6-alef-group-sharjah</code> hydrates to the correct
project, but its initial/static metadata is:

- title: “Latest UAE Property Launch | PSR”;
- generic description;
- canonical: <code>https://psrhomes.ae/projects/latest</code>;
- robots: index, follow.

The canonical target is not the slug page and does not represent the rendered
project. The initial page also exposes the verification shell until client
hydration. Runtime feed slugs are not individually present in the sitemap.
The parent <code>/projects/latest</code> returns 404, while an arbitrary child
such as <code>/projects/latest/nonexistent-xyz</code> returns 200,
index/follow, and the same canonical to that 404 parent. This is a soft-404
factory, not just a missing optimization.

Required correction:

1. resolve the feed record server-side or provide a Worker metadata endpoint
   usable during rendering;
2. emit a project-specific title, description, canonical, Open Graph, JSON-LD
   and robots decision;
3. return a real 404 for missing/withdrawn slugs;
4. include only validated, published feed slugs in the sitemap;
5. do not index a generic hydration shell.

The <code>/llms.txt</code> route is live, and source-backed Insights pages
provide internal reading routes with original-source metadata. GEO quality
still depends on canonical domain recovery, source accuracy, claim dates,
entity consolidation, and avoiding thin directory pages.

### Other index-quality conflicts

- <code>/journal</code> directly reuses the Insights page but is independently
  indexable and self-canonical. Choose one canonical library purpose, or give
  Journal distinct content and information architecture.
- 72 of 91 Insights records are mechanically generated from the same
  three-section pattern. Twelve editorial records lack a complete source
  register.
- Daily-market articles are client-fetched query-parameter states without
  unique server metadata, Article schema, sitemap URLs or self-canonicals.
- The live managed robots output blocks GPTBot, ClaudeBot, Google-Extended and
  other AI crawlers. That may be an intentional rights policy, but it conflicts
  with broad GEO distribution if the business expects those systems to ingest
  public PSR content. Record an explicit policy owner and review date.

### Structured-data correctness

- Every project detail is typed as <code>ApartmentComplex</code>, including
  villas, plots and commercial property.
- Low-confidence developer pages assert standalone
  <code>Organization</code> entities.
- Emirates are typed as <code>City</code> rather than administrative areas.
- Community structured-data image values can remain relative rather than
  absolute.

Map schema from the real asset/entity class, use verified entities only, emit
absolute URLs, and validate representative JSON-LD with the same lifecycle and
visibility rules used by the page.

## 13. Content provenance and factual governance

The base registry was recovered from <code>https://opr.ae</code>.
<code>lib/imported-projects.ts</code> removes OPR/Metropolitan brand text and
replaces it with PSR in imported strings. Media is accepted from OPR, Creatium,
Property Finder and multiple developer domains.
Of 109 stored project-media overrides, 99 identify OPR and five identify
Property Finder as source; project-detail pages do not consistently expose the
underlying source fields to the reader.

This is an operational risk even where URLs return 200:

- PSR does not control availability, cache behavior or deletion;
- the original host can change an asset;
- brand substitution can imply ownership or authorship;
- brochure and image licensing is not recorded per asset;
- content source age and verification status are inconsistent.

Observed remote-image dependence is substantial. Representative live pages
showed OPR and other third-party origins, and the local whole-site media audit
found 6,796 image references, 1,371 unique image URLs, 52 local unique assets
and 1,319 remote unique assets across 16 origins. Of those remote references,
1,143 were tied to imported broker/extractor CDNs. The sample browser routes did
not show broken images during the audit; this is an ownership/control risk, not
a claim of present breakage.

Create an asset register with:

- PSR route and placement;
- source URL and source entity;
- license/permission basis;
- retrieval and last-verified date;
- checksum;
- embedded-text/third-party-brand review;
- local/R2 canonical object;
- replacement and takedown contact.

For the 20 newly curated community source records, 19 source checks returned
200 and the Umm Al Quwain Marina PDF returned 403. Several project-specific
links redirected to generic developer pages. Replace inaccessible or generic
sources with stable, specific official references.

Marketing metrics in <code>data/cba-company.ts</code> include “2,000+
properties”, “1,000+ successful deals”, and “AED 2.5B+ transaction volume”
without source, period, methodology or approval fields. Add an evidence record
and review date or remove the claims from public use.
The home surface also claims “25+ professionals”, while About relabels the same
“1,000+” value as “clients served.” Definitions must be consistent across
surfaces.

The live Brabus Island project copy includes the internal instruction “Sonu
should treat it as a premium branded family and lifestyle proposition.”
Internal workflow, staff instructions and model-facing notes must never appear
in client copy. Add a content-lint rule for names plus phrases such as
“should treat”, “internal”, “agent instruction” and prompt syntax, backed by
human review rather than blind removal.

Currency conversions in <code>lib/card-currency.ts</code> are hard-coded from
CBUAE mid rates dated 2026-08-28. Show the rate date in UI, define a refresh
owner/SLA, and fail safely when rates become stale.

## 14. Performance and asset delivery

### Observed document size

Representative live HTML payloads included:

| Route | Approximate response bytes |
| --- | ---: |
| <code>/developers</code> | 300,066 |
| <code>/communities</code> | 307,363 |
| <code>/insights</code> | 257,404 |
| <code>/journal</code> | 256,775 |
| <code>/emirate</code> | 243,715 |
| <code>/projects</code> | 132,920 |
| <code>/</code> | 128,160 |

One concurrent route batch completed individual fetches in roughly 559–1,327
milliseconds. These are end-to-end command observations, not controlled TTFB,
LCP, INP or cache-state measurements.

### CSS and JavaScript

- <code>app/globals.css</code>: 582,156 bytes and about 18,975 lines;
- <code>app/psr-theme.css</code>: 295,785 bytes and about 8,151 lines;
- current built CSS: approximately 421,327 decoded / 68,422 transferred with
  Brotli in the sampled response;
- major initial JavaScript chunks included roughly 198,356 decoded / 54,483
  transferred and 190,152 decoded / 58,997 transferred, plus smaller chunks.

The community directory serializes complete price-per-square-foot objects when
only display/label fields are used. A local measurement reduced its plain JSON
from 118,561 to 65,610 bytes by flattening the payload, before RSC encoding.

### Media

Large checked-in assets include:

- <code>public/hero/psr-uae-hero.mp4</code>: 7,409,218 bytes;
- <code>public/insights/etihad-rail-passenger-network.png</code>: 3,519,497;
- <code>public/hero/psr-home-reel.mp4</code>: 1,766,120;
- <code>public/og.png</code>: 1,664,176;
- Grace mascot/head assets around 0.7–0.9 MB;
- favicon: 774,987;
- two logo PNGs: 607,810 each.

The homepage hero video is muted, autoplaying, looping, plays inline and uses
metadata preload. A request with <code>Range: bytes=0-99999</code> returned 200
with the complete 7.4 MB object rather than 206 partial content. Optimize and
segment/encode the video, verify range support, provide responsive sources, and
measure the actual transfer with DevTools before declaring the issue fixed.

Hashed static assets receive one-year immutable caching, which is a positive
control. Non-hashed media receives a shorter public cache policy.

### Required performance test

After domain recovery and release-chain repair, capture cold and warm desktop
plus mobile traces for home, projects, communities, developers, Insights and
one detail page. Record LCP resource, INP interaction, CLS nodes, HTML/RSC
payload, JS/CSS transfer, cache status, third-party hosts, video transfer and
main-thread cost. Do not set numeric budgets without a baseline, but fail
regression if a change increases a route's transferred bytes or DOM materially
without an approved reason.

## 15. Worker request lifecycle

<code>worker/index.ts</code> handles requests in this order:

1. redirect <code>www</code> to apex;
2. special favicon handling;
3. route <code>/api/grace-chat</code> to the Durable Object;
4. translation API;
5. project-search interpretation;
6. semantic-search interpretation;
7. project and market content feeds;
8. analytics ingest/dashboard;
9. leads dashboard;
10. agent, inbox, CRM, profile, document and admin APIs;
11. static assets;
12. merge the live project feed into <code>/api/projects</code>;
13. apply private-document cache controls;
14. apply public edge-document caching;
15. fall through to the Vinext app handler.

The Worker owns <code>fetch</code>, <code>scheduled</code> and
<code>email</code> handlers.

### Public APIs

| Endpoint family | Method | Purpose | Current control |
| --- | --- | --- | --- |
| <code>/api/projects</code> | GET | Paginated catalogue plus live-feed merge | Public, cached |
| <code>/api/project-updates</code> | GET | Published D1 feed list or slug | Public, cached |
| <code>/api/market-daily</code> | GET | Published D1 daily insight list or slug | Public, cached |
| <code>/api/leads</code> | POST | Lead, brief and brochure request intake | Validation, consent, honeypot, IP-key rate limit |
| <code>/api/projects/interpret-search</code> | POST | Project query interpretation | Same-origin if Origin exists; body declaration limit |
| <code>/api/search/interpret</code> | POST | Semantic intent for supported scopes | Same-origin if Origin exists; body declaration limit |
| <code>/api/translate</code> | POST | Bounded Arabic/Hindi translation batches | Same-origin and bounded inputs |
| <code>/api/grace-chat</code> | POST | Public/advisor conversational assistant | UUID-scoped Durable Object limit |
| <code>/api/agent/avatar/:slug</code> | GET | Public canonical staff image | Public |
| <code>/api/agent/portfolio/:slug</code> | GET | Public advisor portfolio | Publication bypass requires fix |
| <code>/api/agent/listing-media/:id</code> | GET/HEAD | Approved public secondary-listing image | Publication/ownership gates |
| <code>/api/brochures/:slug</code> | GET | Token-gated brochure access | Expiring access record |
| <code>/api/client-briefs/:token</code> | GET | Expiring private brief download | Token-gated |
| <code>/llms.txt</code> | GET | AI-readable site guidance | Public |

### Protected API families

- agent auth request/verify/login/password setup/change/logout/session;
- admin unlock and staff user create/update/password/photo/delete;
- advisor profile/preferences and Property Finder sync;
- secondary-unit create/update/delete and media upload/delete;
- project research, advisor chat and chat history;
- document create/read/update/delete/library/download/send;
- CRM contacts, opportunities, tasks, activities and audit;
- inbox folders, message state, drafts, send and attachments;
- <code>/api/leads/access</code> and <code>/api/leads/dashboard</code>;
- <code>/api/analytics/events</code> ingest and
  <code>/api/analytics/dashboard</code>.

## 16. Authentication, authorization and security

### Positive controls

- Staff session cookies are HttpOnly, Secure and SameSite=Lax with a 12-hour
  lifetime.
- Passwords use PBKDF2 SHA-256 with per-user salt and 100,000 iterations.
- Stored sessions use hashed tokens.
- Login attempts and locks are recorded.
- Temporary administrator-created PINs force password change.
- Admin unlock uses an HttpOnly, Secure, SameSite=Strict cookie with a
  30-minute lifetime.
- Agent API access grants are checked for inbox, CRM, portfolio, research and
  documents.
- Unauthorized sampled session/dashboard requests returned 401.
- Protected pages are private/no-store and noindex.

### SEC-001: shared dashboard code

<code>LEADS_ACCESS_CODE</code> is a global six-digit value. A successful entry
creates the <code>hg_leads_session</code> cookie for 12 hours. That session is
also accepted by analytics, exposing lead names, email addresses, phone numbers,
messages and behavioral data without a named user, MFA, individual revocation
or per-user audit trail. The login throttle is five attempts per 15 minutes per
hashed IP, so distributed guessing remains possible.

Move both dashboards behind Cloudflare Access or the existing staff identity
and RBAC model. Require MFA, named access, least privilege, per-user revocation,
audit events and an account/global edge limit.

### Other security findings

- No site-wide CSP is emitted. Start with report-only, inventory inline scripts
  and third-party origins, then move to a nonce/hash-based enforcing policy.
- Public AI endpoints accept a missing Origin and have no edge/global quota.
  Project/semantic requests can call Workers AI, and a caller can rotate Grace
  UUIDs around the per-object 14-request limit. Add Cloudflare edge rate
  limiting, device/IP/global quotas, caching and Turnstile where justified.
- Lead intake has no Turnstile. Its five-per-15-minute hashed-IP limit reduces
  casual spam but does not stop distributed or server-to-server abuse.
- Several body limits trust <code>Content-Length</code> before calling
  <code>request.json()</code>. Chunked or omitted-length bodies can bypass that
  check. Reuse the bounded stream reader implemented in the agent backend.
- OTP verification reads the code, creates a session, then deletes the code.
  Concurrent verification can race. Consume the nonce atomically and test it.
- Public cache keys retain arbitrary query parameters, allowing cache-key
  explosion and repeated SSR with random query strings. Canonicalize permitted
  parameters and strip/ignore noise.
- No penetration test, authenticated role-matrix test or external vulnerability
  scan was performed in this audit.

## 17. D1 database handoff

Binding: <code>DB</code>  
Database: <code>cba-property-db</code>  
Remote migration status: no migrations pending at the time of audit  
Observed size after query: 12,464,128 bytes  
Current migration files: <code>0000</code> through <code>0035</code>

Legacy <code>cba</code>, <code>hg</code> and <code>haus_grace</code> prefixes
are stable data contracts. Do not bulk-rename them.

### Table groups

| Domain | Representative tables |
| --- | --- |
| Public leads | <code>haus_grace_leads</code>, lead attribution/session records |
| Staff/auth | <code>hg_agent_profiles</code>, <code>hg_agent_credentials</code>, <code>hg_agent_sessions</code>, <code>hg_agent_login_codes</code>, <code>hg_agent_rate_limits</code>, <code>hg_agent_admin_audit</code> |
| Advisor portfolio | <code>hg_agent_advisor_profiles</code>, <code>hg_agent_secondary_units</code>, <code>hg_agent_secondary_unit_media</code>, Property Finder listing/sync tables |
| Research/chat/docs | <code>hg_agent_conversations</code>, <code>hg_agent_messages</code>, <code>hg_agent_documents</code>, <code>hg_agent_email_log</code> |
| CRM | contact, opportunity, task, activity and audit tables |
| Inbox | <code>psr_inbox_messages</code>, <code>psr_inbox_attachments</code> |
| Private delivery | client briefs, public briefs, brochure download records |
| Content | <code>hg_project_feed</code>, <code>hg_daily_insights</code> |
| Analytics | <code>hg_site_analytics_events</code> |
| Grace | memories and generated-client-brief records |

### Read-only row counts

| Record set | Count |
| --- | ---: |
| Website leads | 0 |
| Agent profiles | 15 |
| Agent credentials | 15 |
| Agent sessions | 2 |
| Advisor profiles | 14 |
| Secondary units | 0 |
| Secondary-unit media | 0 |
| Documents | 11 |
| Conversations | 2 |
| Messages | 12 |
| CRM contacts / opportunities / tasks | 0 / 0 / 0 |
| Inbox messages | 25 |
| Inbox attachments | 4 |
| Published/project-feed records | 7 |
| Daily insights | 28 |
| Analytics events | 33,063 |
| Grace memories | 0 |
| Client briefs | 1 |
| Brochure downloads | 0 |
| Public briefs | 0 |
| Property Finder listings | 0 |

Counts are health evidence, not a backup. They can change immediately.

### Data-integrity risks

- R2 objects are often written before their D1 metadata. A D1 failure can leave
  orphan objects.
- Inbound mail inserts a message before attachments. On replay,
  <code>INSERT OR IGNORE</code> can return early and skip missing-attachment
  reconciliation.
- R2 deletion occurs before optional S3 mirror deletion; an S3 failure can
  retain deleted PII.
- The rate-limit table has no clear scheduled cleanup and can grow with hashed
  client keys.
- Public portfolio fallback can disagree with D1 publication state.

Add idempotent write states, compensating deletes, attachment manifests, orphan
sweeps, retry/outbox records, tombstones for mirrored deletions, and alerts.
Back up before any migration; Worker rollback never reverses D1 schema or data.

## 18. R2 and media storage

Binding: <code>MEDIA</code>  
Bucket: <code>psr-property-media</code>

R2 is used for:

- canonical uploaded staff photos;
- inbox attachments;
- private client briefs;
- secondary-unit media;
- other Worker-managed private media objects.

Checked-in <code>public/</code> assets are different: they are built into
<code>ASSETS</code>. Do not expose the R2 bucket publicly or migrate it to
Supabase/S3 as part of unrelated work.

<code>worker/media-storage.ts</code> can optionally mirror writes/deletes to S3
when six AWS settings are present. Those secret names were not observed live,
so R2 is currently the only confirmed operational store. If mirroring is
enabled later, persist replication status and retry rather than ignoring a
false return. Scrub object keys from logs because keys can contain staff
identifiers.

The optional setting names are <code>AWS_S3_BUCKET</code>,
<code>AWS_S3_REGION</code>, <code>AWS_S3_PREFIX</code>,
<code>AWS_S3_ACCESS_KEY_ID</code>, <code>AWS_S3_SECRET_ACCESS_KEY</code>, and
<code>AWS_S3_SESSION_TOKEN</code>. These are server-side only.

## 19. Leads, forms, briefs and email

### Lead transaction path

1. Browser posts JSON to <code>/api/leads</code>.
2. Handler checks declared size, parses/normalizes fields, rejects the
   honeypot, then applies a hashed-IP rate limit.
3. It validates name, email, optional/required phone, consent and delivery type.
4. It writes the lead to D1.
5. Depending on request type, it creates brochure access, Grace memory,
   recommendations, narrative, PDF and private R2 brief.
6. It sends internal notification to the PSR advisory mailbox.
7. For brief flows, it can also send client email.
8. It records <code>notified</code> or <code>notification_failed</code>.
9. If notification/brief delivery fails and no download fallback exists, it
   returns 502 while explicitly stating the request was saved.

Because D1 write occurs before email, the current DNS outage likely means a
general enquiry can be saved and then return the “advisory desk could not be
notified” 502 path. This is a source-plus-DNS inference; no live lead was
submitted. After mail recovery, execute one controlled end-to-end lead with a
known test identity and confirm D1, notification, dashboard and deletion policy.

The declared 20 KB lead-body limit is bypassable if the client omits or lies
about <code>Content-Length</code> because <code>request.json()</code> is not
stream-bounded. Fix before exposing the endpoint to campaign traffic.

### Email topology

Intended root mail:

~~~text
client -> staff@psrhomes.ae -> Google Workspace
~~~

Intended application inbox:

~~~text
client -> staff@inbox.psrhomes.ae
       -> Cloudflare Email Routing
       -> Worker email() handler
       -> PostalMime
       -> D1 message + R2 attachments
       -> staff-scoped inbox
~~~

Cloudflare Email Routing rules remain enabled for approved aliases and a
catch-all, but both apex and inbox MX are currently <code>NXDOMAIN</code>. An
enabled rule is not proof of delivery.

Inbound MIME handling permits a 25 MB message, buffers the stream, and then
passes it to PostalMime, which can materialize content and attachments again.
Load-test near the Worker memory limit, lower the aggregate ceiling if needed,
and reject oversized messages before allocating multiple copies.

Do not replace Google Workspace apex MX with Cloudflare as a shortcut. If the
business requires the same inbound message in Gmail and the application,
configure controlled Google Workspace recipient mapping/dual delivery after
DNS restoration, preserve original delivery, and test with external mail.

Campaign delivery is intentionally disabled. Do not enable it without explicit
approval, suppression/unsubscribe controls, sender-domain authentication,
volume limits, monitoring and a real acceptance test.

## 20. Workers AI, Grace, search and generated content

Workers AI supports:

- project-query interpretation;
- semantic search for catalogue, inbox, CRM and leads;
- Arabic/Hindi translation;
- the public and authenticated Grace/Sonu assistant;
- advisor research and profile drafting;
- client brief narratives and PDFs;
- latest-project and daily-market content summaries.

AI output must remain an interpretation layer. Project existence, route, price,
unit type, developer, community, availability, payment plan, handover, ROI and
source date must be validated against the catalogue or approved D1 record.

### Content-publishing risk

The scheduled content sync extracts external HTML, sends it to Workers AI,
validates only output shape, and can write it directly as
<code>status='published'</code>. A well-formed hallucination or prompt-like
source content can pass. Scraped project fields are also inferred with regular
expressions and auto-published.

Required pipeline:

1. fetch from allowlisted, specific sources;
2. store source URL, response date, content hash and evidence excerpt;
3. detect stale dates and prompt-like/instructional content;
4. produce a draft only;
5. validate numeric/date/entity claims against extracted evidence;
6. require editorial approval;
7. publish with reviewer, timestamp and revision;
8. support withdrawal/correction and cache invalidation.

The “daily” insight generator currently derives current-date output from older
Q1/January 2026 source material. Label the evidence period accurately or require
a recent source before calling the output daily.

## 21. Scheduled jobs and operational resilience

The cron <code>17 */6 * * *</code> runs every six hours and starts:

1. Property Finder listing synchronization;
2. analytics retention pruning;
3. latest launch discovery/sync;
4. daily market insight sync;
5. expired Grace client brief cleanup;
6. expired brochure token cleanup.

All six are passed into one <code>Promise.all</code>. One rejection weakens
completion accounting and per-job observability. Use named
<code>Promise.allSettled</code> handling or separate Queue jobs with independent
timeouts, retries, idempotency, metrics and alerts.

A public advisor GET can synchronously scrape Property Finder and mutate D1 on
a cache miss. Serve stale cached data immediately and refresh via cron, Queue or
<code>ctx.waitUntil</code> with a circuit breaker.

Required job telemetry per run:

- job name and version;
- start/end/duration;
- source URL/date/hash where applicable;
- rows read/created/updated/rejected;
- retry count;
- error class without PII;
- last successful run;
- freshness SLA and alert threshold.

## 22. Analytics, privacy and retention

The first-party client creates a persistent localStorage visitor UUID and a
sessionStorage session UUID. It records page/section, click coordinates, scroll,
time, referrer host, viewport/device and Cloudflare country. It excludes
protected routes, does not collect form contents, and honors Do Not Track.

Analytics events are retained for 13 months and pruned by cron. The privacy page
discloses tracking, but there is no observed consent gate/banner.

Required governance review:

- establish the lawful basis and jurisdictional requirements for UAE and
  international visitors;
- decide whether analytics starts before consent;
- document exact event fields and processors;
- define visitor-ID reset/deletion and data-subject request procedures;
- define retention for leads, inbox, documents, briefs, sessions, audit logs
  and rate-limit keys, not just analytics;
- ensure logs never include raw PII or full private object keys;
- restrict analytics access to named staff identity rather than the shared
  leads code.

This is a technical risk review, not legal advice. Obtain counsel for the final
privacy decision.

## 23. Dependency and build-chain state

Runtime stack:

- Node engine at least 22.13;
- React and React DOM 19.2.6;
- Next APIs 16.3.0;
- Vinext 1.0.0-beta.3;
- Vite 8.0.13;
- Cloudflare Vite plugin 1.46.0;
- Wrangler package range from 4.124.0.

Executed audit results:

- <code>npm audit --omit=dev</code>: zero production dependency
  vulnerabilities;
- full <code>npm audit</code>: 19 development/build findings
  (1 low, 5 moderate, 13 high, 0 critical).

Affected build-chain areas include the Cloudflare Vite plugin, Drizzle kit,
React server components tooling, Vinext and Vite. This is not evidence of 13
exploitable production-runtime vulnerabilities, but it is a release-toolchain
risk.

Available versions observed during the audit included:

- Cloudflare Vite plugin 1.46.0 to 1.54.4;
- Next 16.3.0 to 16.3.4;
- React/DOM/RSC 19.2.6 to 19.2.8;
- Vinext beta.3 to beta.9;
- Vite 8.0.13 to 8.2.2;
- Wrangler installed 4.124 to 4.129.

Upgrade one layer at a time in a clean branch. Read release notes, rebuild,
exercise Worker bindings, run the full suite, and compare live behavior. Do not
bulk-upgrade the dirty worktree.

## 24. Verification status

### Passed in the current checkout

- <code>npm test</code>: build completed and 230 tests passed, 0 failed;
- rendered-route and backend/design suites completed;
- remote D1 migration listing reported no pending migrations;
- local in-process sitemap audit rendered 652/652 routes with 200, H1, title,
  description and canonical present, with no duplicate titles;
- focused engineering audit suite passed 84/84 tests.

The local route audit validates output shape, not the correctness of the dead
production origin or every claim.

### Lint

<code>npm run lint</code> completed successfully with 0 errors and 70 warnings.
Most warnings are existing <code>no-img-element</code> findings; the remainder
include three React hook dependency warnings, generated declaration
<code>eslint-disable</code> warnings, and two unused document helper warnings.
No automatic fix was applied to the dirty tree.

### Gaps in automated coverage

Add tests for:

- live-feed pagination boundaries and total stability;
- private/inactive/deleted advisor fallback;
- OTP concurrent use;
- missing/rotating Origin and public AI quota enforcement;
- chunked bodies above every advertised limit;
- partial D1/R2/S3 failure and orphan reconciliation;
- future community alias collisions;
- no-JavaScript lead submission;
- timed modal absence and focus restoration;
- Sonu prompt visibility and keyboard order;
- theme/breakpoint combinations;
- canonical metadata for D1-fed launch routes;
- compact <code>K</code>/<code>M</code> money parsing and max-price filters;
- lifecycle reconciliation for current/off-plan/ready/sold-out/archive;
- indexable project-to-developer link integrity;
- content leakage of internal staff/model instructions;
- primary-domain and mail DNS health.

The rendered test currently hard-codes exactly 213 communities. Replace that
with invariant checks so legitimate expansion does not fail for the wrong
reason.

## 25. Prioritized remediation backlog

| ID | Severity | Owner | Action | Acceptance evidence |
| --- | --- | --- | --- | --- |
| INC-001 | P0 | Domain owner | Renew/unhold <code>psrhomes.ae</code> | Clean WHOIS status, working NS and apex 200 |
| INC-003 | P0 | Workspace + Cloudflare admins | Restore apex and inbox MX/TXT | External Gmail/inbox delivery, SPF/DKIM/DMARC evidence |
| INC-002 | P0 | SEO + engineering | Keep one reachable canonical origin | 652-URL crawl with zero dead canonical/sitemap destinations |
| REL-001 | P1 | Engineering | Classify dirty tree, create private remote, bind releases to commit | Fresh clone reproduces active artifact |
| DEV-002 | P1 | Engineering | Restore local latest-project/API parity | Local interaction and ARIA state match production contract |
| SEC-001 | P1 | Security | Replace shared dashboard code with named MFA/RBAC | Role matrix, revocation and audit-log test |
| PRI-001 | P1 | Engineering/privacy | Enforce one portfolio visibility decision | Private/inactive profile is absent from API, HTML, JSON-LD and sitemap |
| CAT-001 | P1 | Engineering | Merge feed before pagination | Boundary tests prove every record appears once and total is stable |
| PRICE-001 | P1 | Data/engineering | Replace compact money parsing | K/M/decimal tests and 56 affected communities corrected |
| CAT-002 | P1 | Content/data | Normalize lifecycle and availability | Off-plan, current, ready, sold-out and archive totals reconcile |
| ENTITY-001 | P1 | Data/SEO | Quarantine bogus developers and repair links | Every indexable project entity link returns 200 |
| SEO-001 | P1 | SEO/engineering | Server-render feed detail metadata | Correct unique canonical/title/JSON-LD and real 404 behavior |
| UX-001 | P1 | Product/design | Remove timed second form | One explicit form path; focus and breakpoint tests |
| UX-003 | P1 | Product/frontend | Prevent fixed-control overlap on forms | Portrait/landscape submit controls remain unobstructed |
| DAT-001 | P1 | Content/legal | Establish asset/content rights register | Every published asset has source, rights, checksum and owner |
| COPY-001 | P1 | Content/engineering | Remove internal workflow language | Content lint and crawl find no model/staff instructions |
| AI-001 | P1 | Engineering | Edge/global quotas on public AI | Load/abuse test, cost alert and fail-safe behavior |
| CON-001 | P1 | Editorial | Draft/review gate for generated feeds | No automatic publication; source-hash and approval record |
| FORM-001 | P1 | Engineering/privacy | Safe POST fallback and stream body limits | No-JS test and oversized chunked-body rejection |
| PER-001 | P1 | Frontend/performance | Fix 7.4 MB hero delivery and measure | 206/range or appropriately segmented media plus trace evidence |
| TAX-001 | P2 | Data/SEO | Canonical community/developer identity mapping | No conceptual duplicate indexation; old routes 301 |
| DAT-002 | P2 | Engineering | Atomic/idempotent D1/R2/S3 operations | Injected-failure tests and zero orphan reconciliation |
| AUTH-002 | P2 | Engineering | Atomic OTP consumption | Two concurrent verifies yield exactly one session |
| CACHE-001 | P2 | Engineering | Normalize public cache query keys | Noise-query test does not create new cache objects |
| CRON-001 | P2 | Engineering/ops | Isolate six scheduled jobs | Per-job result, retry, duration, freshness and alert |
| A11Y-001 | P2 | Frontend | Fix Sonu focus/order/labels and target size | Keyboard-only and screen-reader acceptance |
| A11Y-002 | P2 | Frontend | Repair mobile menu name, Escape and scroll lock | State/keyboard tests at every breakpoint |
| PRIV-001 | P2 | Legal/product/engineering | Consent and retention decision | Approved data map, consent state and deletion runbook |
| PERF-002 | P2 | Frontend | Reduce directory/RSC/CSS payload | Before/after trace with functional parity |
| CUR-001 | P2 | Content/engineering | Currency freshness SLA | Source date shown, automated stale-state behavior |
| CLAIM-001 | P2 | Management/content | Substantiate public metrics | Evidence owner/date/method or claims removed |
| CSP-001 | P2 | Security/frontend | Roll out CSP report-only then enforce | Clean report period and enforcing header |
| SCHEMA-001 | P2 | SEO/data | Map accurate JSON-LD entity types | Validator pass for project, developer, emirate and community samples |
| UX-002 | P3 | Frontend | Remove <code>/properties</code> footer hop | Link points directly to <code>/projects</code> |
| BRAND-001 | P3 | Brand/engineering | Remove Georgia from email templates | Rendered email snapshots use approved stack |
| DEV-001 | P3 | Engineering | Align compatibility dates | Local, build and production share one version |

## 26. Deployment and rollback

### Safe pre-deployment gate

1. Work from the canonical checkout and inspect <code>git status</code>.
2. Confirm the intended files and owner; preserve unrelated dirty work.
3. Commit a coherent, reviewed change.
4. Run focused tests.
5. Run <code>npm test</code>.
6. Run <code>npm run lint</code>.
7. Run <code>git diff --check</code>.
8. Run a secret scan and artifact validation.
9. Confirm Wrangler account and Worker name.
10. List remote D1 migrations and review every pending statement.
11. Run the guarded Cloudflare dry run.
12. Apply migrations before code that requires them.
13. Deploy with the exact commit in the message.
14. Record version ID and acceptance evidence.

Do not use <code>npm run deploy:psr</code> as a release workflow until it builds,
tests, checks migrations and verifies the source/artifact relationship.

### Live acceptance

Verify both hosts where DNS allows:

- home, projects, one registry detail and one live-feed detail;
- developers, communities, emirates and Insights;
- advisor directory plus public/private publication states;
- dark and Gold themes;
- desktop, tablet, phone portrait and phone landscape;
- header, mobile menu, language and theme controls;
- contact and list-property forms without sending real PII;
- one explicitly approved end-to-end lead;
- protected 401s and authenticated staff role matrix;
- CRM, inbox, documents, brochures and private briefs;
- one real inbound/reply email when mail changed;
- cache headers, security headers, logs and D1 migration state;
- sitemap, robots, llms, canonicals, JSON-LD and Open Graph;
- console, network, broken media, focus, keyboard and screen-reader paths.

### Worker rollback

~~~bash
npx wrangler deployments list --config wrangler.jsonc
npx wrangler rollback VERSION_ID --config wrangler.jsonc --message "reason"
~~~

Rollback only to a reviewed version whose database compatibility is known.
Worker rollback does not reverse D1 migrations, R2 writes, sent mail, feed
publication or registrar/DNS changes.

### Source-archive recovery

1. Read the JSON manifest.
2. Calculate and compare SHA-256.
3. Extract into a new directory, never over the current checkout.
4. Confirm commit and expected file inventory.
5. Run locked install, build, tests, lint and artifact validation.
6. Compare configuration, migrations and catalogue to the target deployment.
7. Restore only after owner review.

AWS CLI and ignored <code>.psr-sync.env</code> are absent on this Mac. The
documented private S3 bucket and its latest uploaded archive were not
reverified during this audit. Local archives are not a substitute for a remote
Git repository or tested backup restore.

## 27. First-day takeover checklist

### First hour

- acknowledge INC-001 and assign the domain owner;
- preserve the checkout and copy <code>git status</code> to the incident record;
- record current Cloudflare deployment/version and D1 migration status;
- confirm no one redeploys or changes MX during diagnosis;
- choose one canonical-source owner and one production operator.

### First four hours

- complete registrar renewal/unhold actions;
- create the dirty-tree ownership map;
- protect access to D1, R2, email, registrar and Google Workspace;
- begin private Git remote setup;
- decide whether the alias stays a temporary preview or becomes a formally
  migrated canonical during recovery;
- contain shared lead/analytics dashboard access if exposure risk is
  unacceptable.

### First business day

- restore and validate web plus mail DNS;
- run apex/alias crawl and controlled mail tests;
- commit and back up the current source in coherent units;
- create tickets for every P1 with an owner and target date;
- remove timed lead modal behavior;
- correct compact-price parsing and review every affected public community;
- reconcile archived, ready, sold-out and off-plan status;
- fix advisor publication-state leakage;
- design the canonical taxonomy and asset-rights registers;
- schedule a real DevTools performance baseline and authenticated security test.

## 28. Non-negotiable operating rules

- Preserve the complete catalogue, fields, routes, aliases, brochures and
  integrations unless an approved migration says otherwise.
- Keep PSR public identity distinct from legacy internal <code>cba</code>,
  <code>hg</code> and Grace names.
- Keep dark Graphite and Gold/warm-limestone themes functional.
- Keep public staff title separate from authorization role.
- Keep one canonical portrait per staff identity across public and protected
  surfaces.
- Do not change Google Workspace apex MX as a shortcut.
- Do not rename <code>cba-property-db</code> or legacy tables casually.
- D1 and R2 remain operational sources of truth until an explicit migration.
- Supabase remains server-only and limited to approved advisor memory.
- Campaign delivery stays disabled until explicitly approved and tested.
- Never commit secrets or include their values in screenshots, logs or docs.
- Never discard user changes or run destructive Git recovery commands.
- A 200 response, enabled rule, successful build, or green test is not proof of
  complete live behavior. Verify the actual public/protected flow.
- Do not publish generated property or market facts without source and review.

## 29. Read-only operational command reference

Use these as diagnostic patterns. Confirm the target and remain read-only.

~~~bash
cd /Users/keifferjapeth/Documents/Codex/PSR/psrhomes

git status --short --branch
git log --oneline -12
git remote -v

dig psrhomes.ae A
dig www.psrhomes.ae A
dig psrhomes.ae NS
dig psrhomes.ae MX
dig inbox.psrhomes.ae MX
whois psrhomes.ae

curl -I https://psrhomes.ae/
curl -I https://www.psrhomes.ae/
curl -I https://psr.espacios.me/
curl -i https://psr.espacios.me/api/agent/session

npx wrangler whoami
npx wrangler deployments list --config wrangler.jsonc
npx wrangler versions view f72247fe-ef8f-48fc-a6a9-46cb3f27f6ba --config wrangler.jsonc
npx wrangler secret list --config wrangler.jsonc
npx wrangler d1 migrations list cba-property-db --remote --config wrangler.jsonc
npx wrangler r2 bucket list

npm test
npm run lint
git diff --check
~~~

Never paste secret values, raw private lead records, message bodies, client
documents or signed URLs into a handoff report.

## 30. Acceptance and sign-off record

The handoff is not complete until named owners sign each line:

| Area | Owner | Evidence location | Status/date |
| --- | --- | --- | --- |
| Domain renewed and unheld |  |  |  |
| Apex and <code>www</code> live |  |  |  |
| Google Workspace and inbox mail live |  |  |  |
| Canonical/sitemap recovery |  |  |  |
| Source committed and private remote created |  |  |  |
| Active Worker mapped to Git commit |  |  |  |
| D1 backup/migration ownership |  |  |  |
| R2 lifecycle/backup ownership |  |  |  |
| Staff RBAC and advisor privacy |  |  |  |
| Lead and email end-to-end test |  |  |  |
| AI quotas and editorial review gate |  |  |  |
| Catalogue/taxonomy stewardship |  |  |  |
| Media rights register |  |  |  |
| Analytics/privacy decision |  |  |  |
| Accessibility acceptance |  |  |  |
| Performance trace/budgets |  |  |  |
| Restore drill |  |  |  |

## 31. Evidence ledger

| Evidence | Date | Result |
| --- | --- | --- |
| DNS A/NS/MX/TXT queries | 2026-09-06 | Primary, <code>www</code>, apex mail and inbox mail returned <code>NXDOMAIN</code> |
| <code>.ae</code> WHOIS | 2026-09-06 | Registrar AESERVER; expired server hold/update-prohibited statuses |
| Alternate-host HTTP/route matrix | 2026-09-06 | Representative public routes 200; <code>/properties</code> 308; protected APIs 401 |
| Alternate-host rendered-browser review | 2026-09-06 | Inter-only sampled pages; themes readable; project auto-modal and assistant accessibility findings |
| Phone/landscape interaction review | 2026-09-06 | Fixed conversion controls overlapped form/CTA regions; mobile menu state gaps observed |
| Live sitemap parse | 2026-09-06 | 652 unique URLs, all on dead primary origin |
| Compact-price audit | 2026-09-06 | Live AED 95 example; 56 locally affected communities |
| Project/developer link audit | 2026-09-06 | 14 unresolved slugs across 26 records, including 2 indexable |
| Cloudflare Wrangler inspection | 2026-09-06 | Worker/version/routes/bindings/vars/secret names observed; no changes |
| Remote D1 migration list | 2026-09-06 | No migrations pending |
| Read-only D1 counts | 2026-09-06 | Counts recorded in section 17; no row contents copied |
| R2 bucket listing | 2026-09-06 | <code>psr-property-media</code> exists |
| Local Git inspection | 2026-09-06 | HEAD, no remote, 88 tracked changes plus 64 untracked |
| Effective catalogue script | 2026-09-06 | 1,334 total, 1,068 current, 266 archived, 33 indexable |
| Local route audit | 2026-09-06 | 652/652 rendered locally with expected metadata shape |
| Full local test suite | 2026-09-06 | Build plus 230 tests passed |
| Lint | 2026-09-06 | 0 errors and 70 warnings; no auto-fix |
| Git whitespace check | 2026-09-06 | <code>git diff --check</code> passed |
| Production-only dependency audit | 2026-09-06 | 0 vulnerabilities |
| Full dependency audit | 2026-09-06 | 19 development/build findings |
| Primary-domain visual audit | 2026-09-06 | Blocked by registry/DNS outage |
| Protected production role matrix | 2026-09-06 | Not executed |
| Live lead/mail flow | 2026-09-06 | Not executed |
| Formal Core Web Vitals trace | 2026-09-06 | Not available in current tooling |

End of handoff.
