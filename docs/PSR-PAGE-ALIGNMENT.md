# PSR public page alignment

New public pages should inherit the shared PSR frame instead of rebuilding the header, navigation, structured-data script or footer inside a route.

## Required page frame

Use `PsrPageShell` from `components/PsrPageShell.tsx`:

```tsx
return <PsrPageShell
  className="your-route-page"
  insightsSection="emirates"
  structuredData={structuredData}
>
  {/* Route-owned editorial sections */}
</PsrPageShell>;
```

- `className` is the narrow styling owner for the route.
- `insightsSection` supplies the shared Research / Daily Market Lens / Emirates navigation when the page belongs to Insights.
- `structuredData` is rendered in one consistent location before the shared footer.
- The shell supplies the theme-aware PSR header and footer exactly once.

## Editorial primitives

- Use `page-intro` for directory introductions and an existing detail-hero pattern for detail pages.
- Use `section-pad`, `kicker`, restrained headings, quiet dividers and one glass surface per meaningful group.
- Keep ordinary controls at least 44px tall and use the existing `--psr-*` tokens.
- Check Graphite and Gold independently; photographic heroes must retain an always-dark readability veil.
- Give media a bounded aspect ratio, verified ownership, descriptive alt text and lazy loading below the fold.
- Keep metadata, canonical URL, Open Graph image and JSON-LD specific to the new route.

## Emirates routes

The Emirates experience is a country-first market atlas, not a property-project guide. Its shared market model lives in `data/emirate-market-overviews.ts`; catalogue context is merged through `lib/emirates.ts`; and all seven detail routes use the single `app/emirate/[slug]/page.tsx` template. Update those shared layers rather than creating a separate layout for an emirate.

Keep initiative ownership explicit: federal and cross-emirate programmes live at `Emirates / UAE`, while local programmes live at `Emirates / UAE / {Emirate}` and link to that emirate's `#future-pipeline`. Put the national preview inside the existing UAE overview and local catalyst previews inside the existing seven emirate cards; do not create a second jurisdiction-card grid or duplicate local initiatives into the federal dataset.

Every emirate overview must keep the same reading order:

1. Market identity and timeline.
2. Economy.
3. Infrastructure and connectivity.
4. Culture and tourism.
5. Energy and natural assets.
6. Source-backed future initiatives with explicit operating, active-programme, phased or mixed, construction, procurement, development, announced or strategy status.
7. Property as a subordinate chapter using PSR catalogue figures, clearly labelled as catalogue coverage rather than whole-market data.
8. Hosted events and a primary-source evidence register.

Use a unique, locally stored editorial cover for the UAE and for each emirate. Generated composites must say that they are PSR editorial work and must never be described as official attraction designs, maps or masterplans. All claims and future-project statuses must resolve to entries in the relevant `sources` collection. Any additional page under `app/emirate` must use `PsrPageShell` with `insightsSection="emirates"`.

Research, article, Daily Market Lens and Emirates pages now share this same frame. `tests/design-system.test.ts` scans every route source under `app/insights` and `app/emirate` and fails if a future page bypasses it. `tests/rendered-html.test.mjs` confirms the shared frame, navigation and structured output in the built Emirates routes.

Before release, run the focused design and rendered-route tests, TypeScript, the production build and responsive browser QA in both themes. Deployment remains a separate, explicit step.
