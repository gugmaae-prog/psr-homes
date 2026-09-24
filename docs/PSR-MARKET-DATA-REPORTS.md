# PSR market data and investor reports

## Purpose

The Agent Portal builds a decision brief around the investor's exact shortlist. A multi-project report preserves the hierarchy below and never borrows a missing value from another project, community, or emirate:

1. Named PSR advisor and saved portrait
2. PSR Homes company profile
3. UAE investment context
4. Each represented emirate
5. Each selected community
6. Each selected project and unit scenario

The report is decision support, not a valuation or return guarantee. A blank data point is shown as `Not available` until matching evidence exists.

## Cross-emirate comparison

When the shortlist contains more than one project, the report produces a mandatory comparison matrix. It includes every available project-specific variable:

- emirate, community, developer and selected unit;
- confirmed price, area and AED per square foot;
- dated area benchmark and unit variance;
- expected annual rent, gross yield, net yield and occupancy-adjusted net yield;
- service charge and all-in acquisition basis;
- payment plan, handover and current publication status;
- evidence coverage, latest stored market observations and source dates.

Projects are compared column by column. No universal winner is inferred when the investor's risk, liquidity, holding period, income target, or evidence quality differs.

## Project visual library

Each selected project snapshot keeps separate media collections for:

- exterior architecture;
- interior design;
- floor plans, rendered with contained proportions so the drawing is not cropped;
- additional gallery images.

The portal preview and generated PDF use the same saved media snapshot. Earlier reports therefore remain reproducible even when the website catalogue changes later.

## Canonical market-data store

Cloudflare D1 is the canonical operational store for time-sensitive market observations. Migration `drizzle-agent/0036_psr_market_observations.sql` creates:

- `psr_market_data_sources` for immutable, versioned source records;
- `psr_market_observations` for immutable, versioned metric observations.

Every observation records its UAE, emirate, community, or project scope; numeric or text value; unit and currency; measurement period; observation, publication, and validity dates; freshness deadlines; source; evidence link; methodology; and optional metadata.

Plain inserts preserve history. Reusing a source or observation revision is rejected instead of overwriting the evidence used by an earlier client brief.

## Freshness model

Each feed defines three ordered deadlines:

- `freshUntil`: the observation is labelled `live`;
- `recentUntil`: the observation is labelled `recent`;
- `referenceUntil`: the observation is labelled `reference`;
- after that deadline: the observation is labelled `stale`.

`Live` means the value is inside its source-specific freshness window. It does not mean a streaming transaction price. Report generation captures the latest valid observation at that moment and saves it into the document JSON and PDF.

## Admin ingestion API

`POST /api/agent/admin/market-data` publishes one source revision and 1–40 observation revisions atomically. It requires:

- a signed-in PSR administrator;
- the separate 30-minute administrator unlock;
- a same-origin request;
- a JSON body no larger than 512 KB.

Example shape:

```json
{
  "source": {
    "id": "source-dld-2026-09-06-v1",
    "key": "dld.daily.transactions",
    "version": 1,
    "publisher": "Dubai Land Department",
    "label": "Daily transaction summary",
    "canonicalUrl": "https://example.gov.ae/source",
    "type": "government",
    "jurisdiction": "Dubai",
    "checkedAt": "2026-09-06T08:00:00Z"
  },
  "observations": [
    {
      "id": "observation-dubai-transactions-2026-09-05-v1",
      "seriesKey": "dubai.daily.transaction-count",
      "version": 1,
      "metricKey": "transaction_count",
      "scope": { "type": "emirate", "key": "dubai", "label": "Dubai" },
      "value": { "numeric": 1280, "unit": "transactions" },
      "observedAt": "2026-09-05T23:59:59Z",
      "publishedAt": "2026-09-06T07:30:00Z",
      "validFrom": "2026-09-06T07:30:00Z",
      "freshUntil": "2026-09-07T07:30:00Z",
      "recentUntil": "2026-09-13T07:30:00Z",
      "referenceUntil": "2026-12-31T23:59:59Z",
      "evidenceUrl": "https://example.gov.ae/source"
    }
  ]
}
```

`GET /api/agent/admin/market-data` inspects the latest applicable revisions. It accepts repeated parameters such as:

```text
?scope=project:project-slug&scope=emirate:dubai&metric=price_per_sqft&limit=40
```

The endpoint returns the requested `asOf` time separately from the retrieval time.

## Upstream feeds

The storage and report pipeline are feed-ready, but no external provider should be described as real-time until PSR has authorized that provider and supplied the required API credentials or data-sharing access. A production adapter should:

1. fetch only from an approved government, developer, brokerage, or research source;
2. validate and normalize the complete snapshot before writing;
3. publish a new immutable source and observation version;
4. log failures and retain the previous valid revision;
5. set freshness windows that match the source's real publication cadence;
6. alert an administrator when a feed becomes stale or changes schema.

Likely adapters include official transaction, rental-index, planning, transport, tourism, and developer-inventory feeds. Each adapter should be scheduled at the cadence permitted by its source rather than forcing one universal refresh interval.

## Release order

1. Run the full test and production build suites.
2. Confirm remote migration status for the configured D1 database.
3. Dry-run the Worker build and confirm bindings.
4. Apply migration `0036` to D1.
5. Deploy the Worker while retaining existing variables and bindings.
6. Publish a controlled test source revision through the admin endpoint.
7. Generate a multi-emirate report and verify values, freshness labels, source links, PDF layout, and the advisor identity.

One Worker deployment serves the configured PSR hostnames. DNS and registrar health remain separate from Worker deployment health.
