import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  latestApplicableMarketObservations,
  MAX_MARKET_PUBLISH_OBSERVATIONS,
  MarketDataValidationError,
  marketFreshnessAt,
  publishMarketDataSnapshot,
  type PublishMarketDataInput,
} from "../worker/live-market-data";

const migrationPath = fileURLToPath(new URL("../drizzle-agent/0036_psr_market_observations.sql", import.meta.url));

function sqliteValues(input: unknown[]): SQLInputValue[] {
  return input.map((value) => {
    if (value === null || ["string", "number", "bigint"].includes(typeof value)) {
      return value as SQLInputValue;
    }
    throw new TypeError(`Unsupported SQLite value: ${typeof value}`);
  });
}

function d1Database(sqlite: DatabaseSync) {
  const metadata = (changes = 0) => ({
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: 0,
    changed_db: changes > 0,
    changes,
  });
  const statement = (query: string, bound: unknown[] = []): D1PreparedStatement => ({
    bind(...input: unknown[]) {
      return statement(query, input);
    },
    async run<T>() {
      const result = sqlite.prepare(query).run(...sqliteValues(bound));
      return {
        success: true,
        results: [] as T[],
        meta: metadata(Number(result.changes)),
      };
    },
    async all<T>() {
      const results = sqlite.prepare(query).all(...sqliteValues(bound)) as T[];
      return {
        success: true,
        results,
        meta: { ...metadata(), rows_read: results.length },
      };
    },
  }) as D1PreparedStatement;
  return {
    prepare(query: string) {
      return statement(query);
    },
    async batch<T>(statements: D1PreparedStatement[]) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const prepared of statements) results.push(await prepared.run<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}

type ObservationSeed = {
  id: string;
  seriesKey: string;
  version?: number;
  metricKey?: string;
  scopeType?: "uae" | "emirate" | "community" | "project";
  scopeKey?: string;
  value?: number;
  observedAt: string;
  validFrom?: string;
  validUntil?: string;
  freshUntil: string;
  recentUntil: string;
  referenceUntil: string;
  status?: "draft" | "published" | "superseded" | "withdrawn";
  sourceId?: string;
  metadata?: string;
};

function insertObservation(sqlite: DatabaseSync, seed: ObservationSeed) {
  sqlite.prepare(`
    INSERT INTO psr_market_observations (
      id, series_key, version, metric_key, scope_type, scope_key, scope_label,
      value_numeric, unit, currency_code, period_start, period_end,
      observed_at, published_at, valid_from, valid_until,
      fresh_until, recent_until, reference_until, status, source_id,
      source_record_id, evidence_url, provenance_note, methodology, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, 'Dubai', ?, 'AED/sqft', 'AED',
      '2026-08-01T00:00:00.000Z', '2026-08-31T23:59:59.000Z',
      ?, ?, ?, ?, ?, ?, ?, ?, ?, 'row-42', 'https://example.test/evidence',
      'Direct publisher record.', 'Published monthly aggregate.', ?)
  `).run(
    seed.id,
    seed.seriesKey,
    seed.version ?? 1,
    seed.metricKey ?? "price_per_sqft",
    seed.scopeType ?? "emirate",
    seed.scopeKey ?? "dubai",
    seed.value ?? 2_000,
    seed.observedAt,
    seed.observedAt,
    seed.validFrom ?? seed.observedAt,
    seed.validUntil ?? "2027-01-01T00:00:00.000Z",
    seed.freshUntil,
    seed.recentUntil,
    seed.referenceUntil,
    seed.status ?? "published",
    seed.sourceId ?? "source-one-v1",
    seed.metadata ?? '{"sampleSize":42}',
  );
}

function setupEmpty() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(migrationPath, "utf8"));
  return sqlite;
}

function marketTableCount(sqlite: DatabaseSync, table: "psr_market_data_sources" | "psr_market_observations") {
  const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number } | undefined;
  assert.ok(row);
  return Number(row.count);
}

function setup() {
  const sqlite = setupEmpty();
  sqlite.prepare(`
    INSERT INTO psr_market_data_sources (
      id, source_key, version, publisher, label, canonical_url, source_type,
      published_at, checked_at, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "source-one-v1",
    "publisher-monthly-market",
    1,
    "Example Publisher",
    "Monthly market bulletin",
    "https://example.test/source",
    "research",
    "2026-09-02T08:00:00.000Z",
    "2026-09-03T08:00:00.000Z",
    '{"cadence":"monthly"}',
  );
  return sqlite;
}

function publishInput(version = 1): PublishMarketDataInput {
  const observedAt = version === 1 ? "2026-08-31T20:00:00.000Z" : "2026-09-04T20:00:00.000Z";
  const publishedAt = version === 1 ? "2026-09-01T08:00:00.000Z" : "2026-09-05T08:00:00.000Z";
  const checkedAt = version === 1 ? "2026-09-02T08:00:00.000Z" : "2026-09-06T08:00:00.000Z";
  return {
    source: {
      id: `dld-monthly-v${version}`,
      key: "dld-monthly-market",
      version,
      publisher: "Dubai Land Department",
      label: "Dubai monthly market transactions",
      canonicalUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      type: "government",
      jurisdiction: "Dubai, UAE",
      publishedAt,
      checkedAt,
      metadata: { cadence: "monthly", language: "en" },
    },
    observations: [{
      id: `dubai-price-v${version}`,
      seriesKey: "dubai:price_per_sqft:all",
      version,
      metricKey: "price_per_sqft",
      scope: { type: "emirate", key: "dubai", label: "Dubai" },
      value: {
        numeric: version === 1 ? 1_950 : 2_050,
        unit: "AED/sqft",
        currencyCode: "aed",
      },
      period: {
        start: "2026-08-01T00:00:00.000Z",
        end: "2026-08-31T23:59:59.000Z",
      },
      observedAt,
      publishedAt,
      validFrom: publishedAt,
      validUntil: "2027-01-01T00:00:00.000Z",
      freshUntil: "2026-09-10T00:00:00.000Z",
      recentUntil: "2026-10-01T00:00:00.000Z",
      referenceUntil: "2026-12-31T23:59:59.000Z",
      sourceRecordId: `monthly-${version}`,
      evidenceUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      provenanceNote: "Published transaction aggregate.",
      methodology: "Monthly published aggregate; no unit-level inference.",
      metadata: { segment: "all-residential", sampleSize: version === 1 ? 10_000 : 12_000 },
    }],
  };
}

test("market migration preserves observation revisions and source provenance", async () => {
  const sqlite = setup();
  try {
    insertObservation(sqlite, {
      id: "dubai-price-v1",
      seriesKey: "dubai:price_per_sqft:all",
      version: 1,
      value: 1_900,
      observedAt: "2026-08-01T00:00:00.000Z",
      freshUntil: "2026-08-10T00:00:00.000Z",
      recentUntil: "2026-08-20T00:00:00.000Z",
      referenceUntil: "2026-12-31T00:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "dubai-price-v2",
      seriesKey: "dubai:price_per_sqft:all",
      version: 2,
      value: 2_050,
      observedAt: "2026-09-05T08:00:00.000Z",
      freshUntil: "2026-09-07T08:00:00.000Z",
      recentUntil: "2026-09-14T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "dubai-transactions",
      seriesKey: "dubai:transaction_count:monthly",
      metricKey: "transaction_count",
      value: 14_500,
      observedAt: "2026-09-01T08:00:00.000Z",
      freshUntil: "2026-09-05T08:00:00.000Z",
      recentUntil: "2026-09-10T08:00:00.000Z",
      referenceUntil: "2026-12-01T08:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "dubai-reference",
      seriesKey: "dubai:supply_pipeline:quarterly",
      metricKey: "supply_pipeline",
      value: 80_000,
      observedAt: "2026-04-01T08:00:00.000Z",
      freshUntil: "2026-05-01T08:00:00.000Z",
      recentUntil: "2026-08-01T08:00:00.000Z",
      referenceUntil: "2026-12-31T08:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "dubai-stale",
      seriesKey: "dubai:legacy-index:annual",
      metricKey: "legacy_index",
      value: 120,
      observedAt: "2024-01-01T08:00:00.000Z",
      freshUntil: "2024-02-01T08:00:00.000Z",
      recentUntil: "2024-06-01T08:00:00.000Z",
      referenceUntil: "2025-01-01T08:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "expired",
      seriesKey: "dubai:expired",
      observedAt: "2026-09-01T08:00:00.000Z",
      validUntil: "2026-09-05T08:00:00.000Z",
      freshUntil: "2026-09-07T08:00:00.000Z",
      recentUntil: "2026-09-14T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "future",
      seriesKey: "dubai:future",
      observedAt: "2026-09-01T08:00:00.000Z",
      validFrom: "2026-09-07T08:00:00.000Z",
      freshUntil: "2026-09-08T08:00:00.000Z",
      recentUntil: "2026-09-15T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "draft",
      seriesKey: "dubai:draft",
      observedAt: "2026-09-05T08:00:00.000Z",
      freshUntil: "2026-09-07T08:00:00.000Z",
      recentUntil: "2026-09-14T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
      status: "draft",
    });

    const rows = await latestApplicableMarketObservations(d1Database(sqlite), {
      scopes: [{ type: "emirate", key: "dubai" }],
      asOf: "2026-09-06T08:00:00.000Z",
    });

    assert.equal(rows.length, 4);
    assert.equal(rows.find((row) => row.seriesKey === "dubai:price_per_sqft:all")?.version, 2);
    assert.equal(rows.find((row) => row.seriesKey === "dubai:price_per_sqft:all")?.freshness, "live");
    assert.equal(rows.find((row) => row.metricKey === "transaction_count")?.freshness, "recent");
    assert.equal(rows.find((row) => row.metricKey === "supply_pipeline")?.freshness, "reference");
    assert.equal(rows.find((row) => row.metricKey === "legacy_index")?.freshness, "stale");
    assert.deepEqual(rows[0].source.metadata, { cadence: "monthly" });
    assert.equal(rows[0].source.canonicalUrl, "https://example.test/source");
    assert.deepEqual(rows[0].metadata, { sampleSize: 42 });
    assert.equal(rows.some((row) => ["expired", "future", "draft"].includes(row.id)), false);
  } finally {
    sqlite.close();
  }
});

test("market reads are bounded, filterable, and keep caller scope priority", async () => {
  const sqlite = setup();
  try {
    insertObservation(sqlite, {
      id: "uae-count",
      seriesKey: "uae:transactions:monthly",
      metricKey: "transaction_count",
      scopeType: "uae",
      scopeKey: "uae",
      observedAt: "2026-09-01T08:00:00.000Z",
      freshUntil: "2026-09-07T08:00:00.000Z",
      recentUntil: "2026-09-14T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
    });
    insertObservation(sqlite, {
      id: "project-price",
      seriesKey: "project-one:price_per_sqft",
      scopeType: "project",
      scopeKey: "project-one",
      observedAt: "2026-08-31T08:00:00.000Z",
      freshUntil: "2026-09-07T08:00:00.000Z",
      recentUntil: "2026-09-14T08:00:00.000Z",
      referenceUntil: "2027-01-01T00:00:00.000Z",
    });

    const rows = await latestApplicableMarketObservations(d1Database(sqlite), {
      scopes: [
        { type: "project", key: "project-one" },
        { type: "uae", key: "uae" },
      ],
      metricKeys: ["price_per_sqft", "price_per_sqft", "transaction_count"],
      asOf: "2026-09-06T08:00:00.000Z",
      limit: 1,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].scope.type, "project");
    assert.equal(rows[0].scopePriority, 0);
  } finally {
    sqlite.close();
  }
});

test("missing market tables are a safe empty state while unrelated D1 errors surface", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    const missing = await latestApplicableMarketObservations(d1Database(sqlite), {
      scopes: [{ type: "uae", key: "uae" }],
    });
    assert.deepEqual(missing, []);
  } finally {
    sqlite.close();
  }

  const unavailable = {
    prepare() {
      throw new Error("D1_ERROR: database unavailable");
    },
  } as unknown as D1Database;
  await assert.rejects(
    latestApplicableMarketObservations(unavailable, {
      scopes: [{ type: "uae", key: "uae" }],
    }),
    /database unavailable/,
  );
});

test("freshness thresholds are inclusive and deterministic", () => {
  const deadlines = {
    freshUntil: "2026-09-06T08:00:00.000Z",
    recentUntil: "2026-09-07T08:00:00.000Z",
    referenceUntil: "2026-09-08T08:00:00.000Z",
  };
  assert.equal(marketFreshnessAt(deadlines, deadlines.freshUntil), "live");
  assert.equal(marketFreshnessAt(deadlines, deadlines.recentUntil), "recent");
  assert.equal(marketFreshnessAt(deadlines, deadlines.referenceUntil), "reference");
  assert.equal(marketFreshnessAt(deadlines, "2026-09-09T08:00:00.000Z"), "stale");
});

test("publishing creates immutable source and observation revisions atomically", async () => {
  const sqlite = setupEmpty();
  const database = d1Database(sqlite);
  try {
    const first = await publishMarketDataSnapshot(database, publishInput(1));
    const second = await publishMarketDataSnapshot(database, publishInput(2));

    assert.equal(first.insertedCount, 1);
    assert.equal(first.source.version, 1);
    assert.equal(second.source.version, 2);
    assert.equal(second.source.canonicalUrl, "https://dubailand.gov.ae/en/open-data/real-estate-data/");
    assert.equal(second.observations[0].status, "published");
    assert.equal(second.observations[0].freshnessAtSourceCheck, "live");
    assert.equal(marketTableCount(sqlite, "psr_market_data_sources"), 2);
    assert.equal(marketTableCount(sqlite, "psr_market_observations"), 2);

    const latest = await latestApplicableMarketObservations(database, {
      scopes: [{ type: "emirate", key: "dubai" }],
      asOf: "2026-09-06T08:00:00.000Z",
    });
    assert.equal(latest.length, 1);
    assert.equal(latest[0].version, 2);
    assert.equal(latest[0].value.numeric, 2_050);
    assert.equal(latest[0].source.version, 2);
    assert.deepEqual(latest[0].source.metadata, { cadence: "monthly", language: "en" });

    const conflicting = publishInput(3);
    conflicting.observations[0].version = 2;
    await assert.rejects(publishMarketDataSnapshot(database, conflicting), /UNIQUE constraint failed/);
    assert.equal(marketTableCount(sqlite, "psr_market_data_sources"), 2);
    assert.equal(marketTableCount(sqlite, "psr_market_observations"), 2);
  } finally {
    sqlite.close();
  }
});

test("publishing rejects invalid payloads and stale timestamp ordering before writing", async () => {
  const sqlite = setupEmpty();
  const database = d1Database(sqlite);
  async function rejectsValidation(payload: PublishMarketDataInput, field: string) {
    await assert.rejects(
      publishMarketDataSnapshot(database, payload),
      (error: unknown) => error instanceof MarketDataValidationError && error.field === field,
    );
  }

  try {
    const insecureSource = publishInput();
    insecureSource.source.canonicalUrl = "http://dubailand.gov.ae/open-data";
    await rejectsValidation(insecureSource, "source.canonicalUrl");

    const insecureEvidence = publishInput();
    insecureEvidence.observations[0].evidenceUrl = "http://example.test/evidence";
    await rejectsValidation(insecureEvidence, "observations[0].evidenceUrl");

    const invalidScope = publishInput();
    invalidScope.observations[0].scope = { type: "district", key: "dubai" } as never;
    await rejectsValidation(invalidScope, "observations[0].scope.type");

    const invalidKey = publishInput();
    invalidKey.observations[0].metricKey = "Price Per Sqft";
    await rejectsValidation(invalidKey, "observations[0].metricKey");

    const missingValue = publishInput();
    missingValue.observations[0].value.numeric = null;
    missingValue.observations[0].value.text = "";
    await rejectsValidation(missingValue, "observations[0].value");

    const invalidTimestamp = publishInput();
    invalidTimestamp.source.checkedAt = "2026-02-30T08:00:00.000Z";
    await rejectsValidation(invalidTimestamp, "source.checkedAt");

    const staleOrdering = publishInput();
    staleOrdering.observations[0].freshUntil = "2026-10-02T00:00:00.000Z";
    await rejectsValidation(staleOrdering, "observations[0].recentUntil");

    const invalidUnit = publishInput();
    invalidUnit.observations[0].value.unit = "AED;<script>";
    await rejectsValidation(invalidUnit, "observations[0].value.unit");

    const invalidCurrency = publishInput();
    invalidCurrency.observations[0].value.currencyCode = "A3";
    await rejectsValidation(invalidCurrency, "observations[0].value.currencyCode");

    const invalidMetadata = publishInput();
    invalidMetadata.observations[0].metadata = { unsupported: BigInt(1) };
    await rejectsValidation(invalidMetadata, "observations[0].metadata.unsupported");

    const oversized = publishInput();
    oversized.observations = Array.from(
      { length: MAX_MARKET_PUBLISH_OBSERVATIONS + 1 },
      (_, index) => ({
        ...oversized.observations[0],
        id: `bounded-observation-${index}`,
        seriesKey: `dubai:bounded:${index}`,
      }),
    );
    await rejectsValidation(oversized, "observations");

    assert.equal(marketTableCount(sqlite, "psr_market_data_sources"), 0);
    assert.equal(marketTableCount(sqlite, "psr_market_observations"), 0);
  } finally {
    sqlite.close();
  }
});
