# PSR organic search and answer-engine strategy

## Position and commercial objective

PSR should not compete with Property Finder or Bayut on listing volume. Its stronger search position is:

> A Dubai-first property advisory that helps buyers, investors, owners and landlords compare projects, communities and developers with dated evidence and accountable advisors.

The commercial measure is qualified organic pipeline—not raw traffic or indexed-page count:

`Search query → landing page → enquiry → qualified lead → viewing → offer → transaction → revenue`

## Current baseline (13 August 2026)

- 1,312 project records are available in the catalogue, including 1,044 current records.
- Only 17 projects are currently PSR-curated with original overview copy, sources and deliberately assembled media.
- 109 legacy project records have enhanced media, but media alone is not enough to earn indexation.
- Projects and properties previously exposed the same catalogue. `/properties` now permanently redirects to `/projects` until genuine unit inventory exists.
- Project filter combinations canonicalize to `/projects` and are noindexed.
- Protected agent, analytics, lead and API routes are blocked from crawling and carry page-level noindex controls where applicable.
- Complete public advisor profiles are indexable and now expose `ProfilePage`, `Person` and breadcrumb structured data.
- The verified external brokerage entity is C B A REAL ESTATE L.L.C, Dubai RERA ORN 39665, with the Property Finder profile recorded in the company entity data.

## Search architecture

| Family | Search intent | Rule |
|---|---|---|
| `/` | PSR brand, Dubai brokerage and property advisory | Positioning, proof, services, research and advisors |
| `/projects` | Permanent development research | The canonical project catalogue |
| `/properties` | Future live unit inventory | Redirect to `/projects` until specific units exist |
| `/off-plan` | Off-plan commercial intent | Process, risks, selected projects and consultation |
| `/communities/[slug]` | Location decisions | Market evidence, supply, lifestyle, projects and advisors |
| `/developers/[slug]` | Developer investigation | Pipeline, delivery evidence and comparisons |
| `/projects/[slug]` | Named project decisions | Price, payment, handover, layouts, trade-offs and sources |
| `/advisors/[slug]` | People and trust | Expertise, languages, public record, listings and contact |
| `/insights/[slug]` | Informational and regulatory demand | Original, dated, sourced research |
| `/list-your-property` | Seller and landlord acquisition | Appraisal, marketing and management conversion |

Create `/properties/[slug]` only when PSR has a specific marketed unit with price, size, status, permit, media and responsible advisor. Sold or leased units need a documented 301, 404 or 410 policy.

## Indexation must be earned

The code applies three tiers:

- Tier A: PSR-curated projects with original analysis, at least two substantial overview sections, investment considerations, a dated source and a deliberate gallery. These are indexable and included in the sitemap.
- Tier B: useful supporting pages that are not yet at the Tier A standard. They may become indexable after editorial review.
- Tier C: registry-only or archived records. They remain accessible to catalogue users but are `noindex,follow` and omitted from the sitemap.

Do not loosen the quality gate merely to grow URL count. Promotion from Tier C or B should be an editorial decision backed by source verification and content review.

## Priority keyword clusters

### Transactional

- Dubai property for sale
- apartments and villas for sale in Dubai
- off-plan property Dubai
- Dubai commercial property
- sell or value property in Dubai
- Dubai landlord and property-management services

These require substantial service or inventory pages—not blog posts.

### Projects

Every priority project should answer price, payment plan, floor plans, handover, location, developer, trade-offs and investment suitability. Lead with the direct answer and show when commercial facts were checked.

### Communities

Prioritize clusters where PSR has listings, advisors or transaction knowledge. Each page should separate PSR catalogue figures from external market evidence and cover transactions, rents, supply, service charges, transport, schools and relevant property formats.

### Decisions and regulation

Build durable guides for buying costs, DLD fees, mortgages and LTV, off-plan versus ready, Oqood and escrow, foreign ownership, Golden Visa requirements, service charges and off-plan resale. Use primary sources such as DLD, the UAE Government and the Central Bank.

## Page-quality standards

### Tier A project sequence

1. Direct answer and dated facts.
2. Live-price and availability qualification.
3. Best suited to / may not suit.
4. Location and competing supply.
5. Developer delivery context.
6. Residence mix and layout quality.
7. Payment and total cash-flow requirements.
8. Operating costs and service-charge context.
9. Exit, leasing and handover risks.
10. Licensed gallery and authorized floor plans.
11. Comparable projects.
12. Named reviewer and enquiry path.
13. Primary sources and revision date.

Never turn a project development page into `Product`/`Offer` schema unless a genuine visible unit and current offer exist. The project pages use `ApartmentComplex`; specific properties may use `Residence`, `Apartment`, `House`, `Product` and `Offer` only when their visible content supports those claims.

## Authority, local SEO and entity consistency

- Use the legal name `C B A REAL ESTATE L.L.C` or the legally preferred rendering consistently after internal confirmation.
- Keep ORN 39665, address, phone and email consistent across the site, DLD, Google Business Profile, Property Finder, Bayut, LinkedIn, Bing Places and Apple Business Connect.
- Add licence details only after authoritative confirmation; never infer them from ORN.
- Request genuine reviews after meaningful client milestones; never fabricate or incentivize ratings.
- Produce link-worthy assets: DLD transaction dashboards, quarterly pipeline reports, community reports, delivery comparisons and buyer-cost tools with transparent methodology.

## International SEO

The browser translation is a visitor aid, not an Arabic search presence. Launch Arabic only with stable `/ar/` URLs, human property-professional review, translated metadata and links, reciprocal `hreflang`, and legal/financial review. Start with a small group of commercially important pages rather than translating the full catalogue.

## Measurement and CRM attribution

Every website lead now captures first landing path, lead landing path, referrer and UTM source/medium/campaign/term/content in its auditable message record. Continue measuring:

- non-branded clicks and impressions;
- qualified leads by landing-page family;
- WhatsApp, telephone, brochure and appraisal actions;
- viewing, offer and transaction rates;
- organic revenue and commission;
- Tier A indexation, crawl frequency and Core Web Vitals.

Connect Search Console for pre-visit query data and keep first-party website analytics/CRM data for post-click outcomes. Set numeric growth targets only after a 16-month Search Console export and a reliable 28-day CRM baseline.

## Execution roadmap

### First 30 days

- Confirm the exact legal-name rendering, ORN, trade licence and public address.
- Connect Search Console and Google Business Profile; submit the new sitemap after deployment.
- Export queries and landing pages, then select the first 25 PSR priority pages.
- Audit legacy `cbaestate.com` results and backlinks; define migrations where appropriate.
- Validate lead attribution through to CRM qualification.

### Days 31–90

- Bring 20–30 project pages to Tier A quality.
- Complete 10 Dubai community and 10 developer profiles with primary sources.
- Add robust Buy, Sell, Rent and Commercial landing pages.
- Add named expert reviewers and authentic public credentials to priority research.
- Start a review-request and local-profile maintenance workflow.

### Months 4–12

- Grow to 50–75 Tier A project pages based on search and lead evidence.
- Publish one substantive DLD-backed report monthly and two useful comparisons.
- Start digital PR and link reclamation around original datasets.
- Launch human-reviewed Arabic priority pages only when operationally supportable.
- Prune pages that do not gain depth or demand; expand proven clusters.

## Do not do

- Do not publish city × bedroom × property-type doorway pages.
- Do not copy developer or competitor descriptions.
- Do not index dynamically translated or filtered pages.
- Do not invent prices, yields, reviews, awards, licence numbers or availability.
- Do not use fake freshness dates or submit every catalogue record in the sitemap.
- Do not buy links or create virtual-office location pages.
- Do not measure success by index count alone.

