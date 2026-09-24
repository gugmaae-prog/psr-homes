# Dubai South private-client collection

Prepared for Mr. Arul (Singapore), advisor Jumanah, PSR Homes. Evidence cut-off: 8 September 2026.

## Deliverables and source of truth

Three independent PDF reports and a matching editable PowerPoint / private online presentation:

- Ready homes: maximum AED 1.2M including acquisition provisions; the selected examples also fit when the modelled first-year service charge is included.
- Off-Plan (Under Construction): strictly below AED 1.7M including the stated acquisition provisions.
- Off-Plan (Under Construction): approved comparison envelope AED 1.7M–1.85M including stated provisions.

`scripts/assemble-dubai-south-review.mjs` assembles evidence into `data/dubai-south-investor-review-2026-09-08.json`. `scripts/build-dubai-south-three-reports.py` calculates totals, checks budget invariants and generates the PDFs and the shared slide scene model. `scripts/export-dubai-south-presentation.mjs` exports the editable PowerPoint. The online viewer consumes the same scene model via its server page, never through a public client-bundle import.

The original 7 September report and its data are preserved. Original project context and imagery are retained, with four follow-up references separated from the priced shortlist: South Square, South Living, Divine Elements and Expo Valley Views. Cresswell Plaza remains excluded. Terra Gardens and The Pulse B8 are additional current comparisons.

## Research method and reconciliation

Official developer/unit records take precedence for exact published project facts and official fees. Current Property Finder, Bayut and Dubizzle advertisements are used as asking-price evidence, not as reservations or verified executable offers. Government sources support DLD, DEWA and residency guidance. Every displayed source is linked in the report; the premium record separately preserves official API paths, request bodies, unit identifiers and media provenance.

Current Emaar records identify Terra Gardens unit EX Terra Gardens Building 1-2-207 and Terra Woods unit EX Terra Woods Building 1-4-415 as available at the check. Each has nine dated instalments, official 4% DLD and AED 3,000 Oqood. The AED 37,000 booking deposit is a credit against the first instalment, not an additional fee. Official integer instalment rounding is preserved.

Key source conflicts are disclosed beside the affected property:

- Golf Trails: the lower one-bedroom broker price conflicts with higher current official remaining stock. It is conditional, not a guaranteed Emaar allocation.
- Golf Fields: published payment-plan and listing completion dates differ; the unit SPA must resolve them.
- Azizi Venice 15: the selected current advertisement uses 50/50; the project standard 10/40/50 is not automatically applied to that promotional offer.
- Enre: the selected advertised price uses 40/60, while Imtiaz publishes a different standard framework. Building floorplates are explicitly not represented as a one-bedroom unit plan.
- AVENEW 888: dated 50/50 and separate 60/40 marketing conflict. The September 2026 instalment has already elapsed. A refreshed unit ledger is required.
- Altura 2: final 30% is funded at handover conservatively; marketing of post-handover terms requires written confirmation.
- Both Windsor releases: resale prices cannot be used to scale an original developer plan. Timing remains unallocated pending the seller statement, original SPA price, paid-to-date amount and remaining developer balance.

No marketed DLD waiver is deducted. The full 4% is retained until written unit-specific developer terms confirm an incentive. The report shows possible waiver evidence as an offer check, not an assumed saving.

## Financial conventions

Full acquisition funding includes the price, transaction fees and explicitly marked allowances for unresolved invoices. Separate rows identify parking, handover, administration, DEWA refundable deposit and activation. No mortgage, foreign-exchange, financing or disposal costs are assumed. Annual service charges are recurring and are not presented as a finite lifetime total. Because some invoices remain unconfirmed, an all-in planning total is not a guaranteed fixed purchase quotation.

For ready units, gross ROI equals annual rent divided by purchase price. Net planning ROI uses 95% rent collection, less service charges, a 5% management allowance and the stated maintenance/insurance allowance, divided by the complete acquisition budget. Sources include configuration-matched registered-lease comparables and current asking rents. No capital appreciation is added to rental ROI.

No rental projection, rental yield or ROI appears in either off-plan report. Appreciation recommendations are qualitative and confined to this comparison, not a claim of a measured market-wide highest return.

## Presentation and media standards

Al Wasl Dome cover, simple sans-serif typography, restrained ivory / deep green / gold palette. Jumanah's approved modest portrait appears only on each report's cover. Project images are authentic source material; exact-unit plans are distinguished from indicative layouts, building floorplates and project-family references. No generated property imagery is substituted for project evidence.

The visual contract uses an executive summary before evidence, one purpose per page, native editable text and images, and tables for precise comparison and instalment lookups. No trend graphic is invented from point-in-time advertisements. Recommendations remain at the end of each report as requested. Exact-unit Terra drawing crops and AVENEW brochure-plan crops remove document margins only; complete source files are preserved. The original 121-slide PowerPoint render was inspected in full, with targeted rechecks after layout corrections.

Payment conventions distinguish credited deposits from separate administration fees. Full-4% buyer-funded DLD on resales is an explicit assumption pending Form F or the assignment terms and is counted among planning provisions. No buyer brokerage is assumed for initial sales; agency terms must be confirmed in writing.

Private route: `/advisors/jumanah/dubai-south`. The existing signed-code session also protects the four download routes. R2 public development access is disabled and the bucket has no custom public domain (checked before upload). New PDFs and PowerPoint are not placed in public static assets. No client or advisor message is sent by this workflow.

## Reproduction

1. Run `node scripts/assemble-dubai-south-review.mjs`.
2. Run the bundled Python runtime with `scripts/build-dubai-south-three-reports.py`.
3. Run `node scripts/export-dubai-south-presentation.mjs`.
4. Render every PDF page for visual QA; check arithmetic, source links, floorplan labels and portrait placement.
5. Run focused report, presentation, access and cache tests; build before publishing.
6. Upload the four versioned private files, deploy with retained bindings, then verify locked/unlocked presentation and downloads on both domains.

Publication status and final checks are recorded in the task handoff, not inferred from successful local generation.

## Publication and acceptance checks — 8 September 2026

- Final Worker version: `91822cee-b456-4d2c-9036-a7e53ba667c5`, deployed with `--keep-vars` to `psrhomes.ae`, `www.psrhomes.ae` and `psr.espacios.me`. The last release changes presentation chrome contrast and accessible download labels; the four uploaded documents are unchanged.
- Delivered artifacts: ready PDF 38 pages; under-budget off-plan PDF 76 pages; premium off-plan PDF 29 pages; editable PowerPoint 121 slides. The online collection retains all 143 report pages; the PowerPoint removes repeated shared context between sections.
- All PDF pages and all PowerPoint slides were rendered and visually reviewed. Final targeted checks covered payment/fee tables, credited deposits, DLD assumptions, the Enre introduction and floorplate label, gallery margins, exact-unit Terra plans and cover-only portrait use.
- TypeScript checking, the production build and 45 focused report, presentation, access and cache tests passed. A further eight presentation/access checks passed after the final scoped contrast correction. Public client bundles were checked for the private client name, exact Terra unit and slide-model import: no matches.
- Live browser checks on `psrhomes.ae`: all three report tabs, section-specific PDF links, slide selection, payment-table legibility, exact-unit Terra image loading and full-screen entry/exit passed. The user's light theme remains selected; viewer controls now retain the intended deep-green/ivory contrast without changing the slide artwork.
- At a 390 CSS-pixel mobile viewport, the document and viewport widths both measured 390 pixels. Financial tables remain readable in a locally horizontally scrollable wrapper, floorplans use `object-fit: contain`, and previous/next controls and report budget labels remain accessible. The temporary viewport override was reset after verification.
- Private gate, signed secure/HttpOnly session, unauthenticated download redirects, no-store/noindex headers and exact SHA-256 parity for all four files were verified on both domains. The machine-readable evidence is `output/presentation/Dubai_South_Publication_Verification_2026-09-08.json`. A transient interrupted mirror download during a repeat check is handled by bounded read-only transfer retries; assertion failures are never retried or suppressed.
- The original report remains preserved. No client/advisor message was sent, and no unrelated catalogue or operating-system change was made for this handoff.
