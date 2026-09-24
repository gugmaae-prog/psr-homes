export type MarketScopeType = "uae" | "emirate" | "community" | "project";
export type MarketFreshness = "live" | "recent" | "reference" | "stale";

export type MarketScope = {
  type: MarketScopeType;
  key: string;
};

export type LatestMarketObservationQuery = {
  scopes: MarketScope[];
  metricKeys?: string[];
  asOf?: Date | string;
  limit?: number;
};

export type LatestMarketObservation = {
  id: string;
  seriesKey: string;
  version: number;
  metricKey: string;
  scope: MarketScope & { label: string };
  scopePriority: number;
  value: {
    numeric: number | null;
    text: string | null;
    unit: string;
    currencyCode: string | null;
  };
  period: {
    start: string | null;
    end: string | null;
  };
  observedAt: string;
  publishedAt: string;
  validFrom: string;
  validUntil: string | null;
  freshUntil: string;
  recentUntil: string;
  referenceUntil: string;
  freshness: MarketFreshness;
  source: {
    id: string;
    key: string;
    version: number;
    publisher: string;
    label: string;
    canonicalUrl: string;
    type: string;
    jurisdiction: string;
    publishedAt: string | null;
    checkedAt: string;
    metadata: Record<string, unknown>;
  };
  provenance: {
    sourceRecordId: string | null;
    evidenceUrl: string | null;
    note: string | null;
    methodology: string | null;
  };
  metadata: Record<string, unknown>;
};

export type MarketSourceType = "government" | "official" | "developer" | "research" | "brokerage" | "news" | "internal" | "other";
export type MarketSourceStatus = "active" | "retired" | "withdrawn";

export type PublishMarketDataSource = {
  id: string;
  key: string;
  version: number;
  publisher: string;
  label: string;
  canonicalUrl: string;
  type?: MarketSourceType;
  jurisdiction?: string;
  publishedAt?: string | null;
  checkedAt: string;
  status?: MarketSourceStatus;
  metadata?: unknown;
};

export type PublishMarketObservation = {
  id: string;
  seriesKey: string;
  version: number;
  metricKey: string;
  scope: MarketScope & { label?: string };
  value: {
    numeric?: number | null;
    text?: string | null;
    unit: string;
    currencyCode?: string | null;
  };
  period?: {
    start?: string | null;
    end?: string | null;
  };
  observedAt: string;
  publishedAt: string;
  validFrom: string;
  validUntil?: string | null;
  freshUntil: string;
  recentUntil: string;
  referenceUntil: string;
  sourceRecordId?: string | null;
  evidenceUrl?: string | null;
  provenanceNote?: string | null;
  methodology?: string | null;
  metadata?: unknown;
};

export type PublishMarketDataInput = {
  source: PublishMarketDataSource;
  observations: PublishMarketObservation[];
};

export type PublishedMarketDataSnapshot = {
  source: {
    id: string;
    key: string;
    version: number;
    publisher: string;
    label: string;
    canonicalUrl: string;
    type: MarketSourceType;
    jurisdiction: string;
    publishedAt: string | null;
    checkedAt: string;
    status: MarketSourceStatus;
    metadata: Record<string, unknown>;
  };
  observations: Array<{
    id: string;
    seriesKey: string;
    version: number;
    metricKey: string;
    scope: MarketScope & { label: string };
    observedAt: string;
    publishedAt: string;
    validFrom: string;
    validUntil: string | null;
    freshnessAtSourceCheck: MarketFreshness;
    status: "published";
  }>;
  insertedCount: number;
  committedAt: string;
};

export class MarketDataValidationError extends Error {
  readonly code = "INVALID_MARKET_DATA";

  constructor(readonly field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "MarketDataValidationError";
  }
}

type MarketObservationRow = {
  id: string;
  series_key: string;
  version: number;
  metric_key: string;
  scope_type: MarketScopeType;
  scope_key: string;
  scope_label: string;
  value_numeric: number | null;
  value_text: string;
  unit: string;
  currency_code: string;
  period_start: string;
  period_end: string;
  observed_at: string;
  published_at: string;
  valid_from: string;
  valid_until: string;
  fresh_until: string;
  recent_until: string;
  reference_until: string;
  source_id: string;
  source_record_id: string;
  evidence_url: string;
  provenance_note: string;
  methodology: string;
  metadata_json: string;
  source_key: string;
  source_version: number;
  source_publisher: string;
  source_label: string;
  source_url: string;
  source_type: string;
  source_jurisdiction: string;
  source_published_at: string;
  source_checked_at: string;
  source_metadata_json: string;
};

export const MAX_MARKET_SCOPE_COUNT = 32;
export const MARKET_SCOPE_BATCH_SIZE = 12;
export const MAX_MARKET_METRIC_COUNT = 32;
export const MAX_MARKET_RESULT_COUNT = 80;
export const MAX_MARKET_PUBLISH_OBSERVATIONS = 40;
export const MAX_MARKET_METADATA_BYTES = 8_192;

const SCOPE_TYPES = new Set<MarketScopeType>(["uae", "emirate", "community", "project"]);
const SOURCE_TYPES = new Set<MarketSourceType>(["government", "official", "developer", "research", "brokerage", "news", "internal", "other"]);
const SOURCE_STATUSES = new Set<MarketSourceStatus>(["active", "retired", "withdrawn"]);
const MARKET_TABLE_PATTERN = /no such table:\s*(?:main\.)?(?:psr_market_observations|psr_market_data_sources)\b/i;
const MARKET_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._:/-]{0,179})$/;
const MARKET_UNIT_PATTERN = /^[A-Za-z0-9%°](?:[A-Za-z0-9%°/._²³ -]{0,31})$/;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/;
const metadataEncoder = new TextEncoder();

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").trim().slice(0, maximum)
    : "";
}

function validationFailure(field: string, message: string): never {
  throw new MarketDataValidationError(field, message);
}

function requiredText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string") validationFailure(field, "must be a string.");
  const text = value.trim();
  if (!text) validationFailure(field, "is required.");
  if (text.length > maximum) validationFailure(field, `must not exceed ${maximum} characters.`);
  if (text.includes("\0")) validationFailure(field, "must not contain null characters.");
  return text;
}

function optionalValidatedText(value: unknown, field: string, maximum: number) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") validationFailure(field, "must be a string when provided.");
  const text = value.trim();
  if (text.length > maximum) validationFailure(field, `must not exceed ${maximum} characters.`);
  if (text.includes("\0")) validationFailure(field, "must not contain null characters.");
  return text;
}

function marketKey(value: unknown, field: string, maximum = 180) {
  const key = requiredText(value, field, maximum);
  if (!MARKET_KEY_PATTERN.test(key)) {
    validationFailure(field, "must be a lowercase canonical key using letters, numbers, dot, colon, slash, underscore, or hyphen.");
  }
  return key;
}

function positiveVersion(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 1_000_000) {
    validationFailure(field, "must be a positive safe integer no greater than 1000000.");
  }
  return Number(value);
}

function httpsUrl(value: unknown, field: string) {
  const text = requiredText(value, field, 2_048);
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      validationFailure(field, "must be an HTTPS URL without embedded credentials.");
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof MarketDataValidationError) throw error;
    return validationFailure(field, "must be a valid HTTPS URL.");
  }
}

function isoTimestamp(value: unknown, field: string) {
  const text = requiredText(value, field, 40);
  const parts = ISO_TIMESTAMP_PATTERN.exec(text);
  if (!parts) validationFailure(field, "must be a complete ISO 8601 timestamp with a timezone.");
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const hour = Number(parts[4]);
  const minute = Number(parts[5]);
  const second = Number(parts[6]);
  const offsetHour = Number(parts[9] ?? 0);
  const offsetMinute = Number(parts[10] ?? 0);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1
    || month > 12
    || day < 1
    || day > monthDays[month - 1]
    || hour > 23
    || minute > 59
    || second > 59
    || offsetHour > 14
    || offsetMinute > 59
    || (offsetHour === 14 && offsetMinute !== 0)
  ) validationFailure(field, "must be a valid ISO 8601 calendar timestamp.");
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) validationFailure(field, "must be a valid ISO 8601 timestamp.");
  return date.toISOString();
}

function optionalIsoTimestamp(value: unknown, field: string) {
  return value === undefined || value === null || value === "" ? "" : isoTimestamp(value, field);
}

function jsonValueIsValid(value: unknown, field: string, depth: number, seen: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) validationFailure(field, "must contain only finite JSON numbers.");
    return;
  }
  if (typeof value !== "object") validationFailure(field, "must contain JSON-serializable values only.");
  if (depth > 8) validationFailure(field, "must not exceed eight nested levels.");
  if (seen.has(value)) validationFailure(field, "must not contain circular references.");
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => jsonValueIsValid(item, `${field}[${index}]`, depth + 1, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      validationFailure(field, "must contain plain JSON objects only.");
    }
    for (const [key, item] of Object.entries(value)) {
      if (!key || key.length > 128 || key.includes("\0")) validationFailure(field, "contains an invalid object key.");
      jsonValueIsValid(item, `${field}.${key}`, depth + 1, seen);
    }
  }
  seen.delete(value);
}

function validatedMetadata(value: unknown, field: string) {
  const metadata = value === undefined ? {} : value;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    validationFailure(field, "must be a JSON object.");
  }
  jsonValueIsValid(metadata, field, 0, new Set());
  const json = JSON.stringify(metadata);
  if (metadataEncoder.encode(json).byteLength > MAX_MARKET_METADATA_BYTES) {
    validationFailure(field, `must not exceed ${MAX_MARKET_METADATA_BYTES} UTF-8 bytes.`);
  }
  return {
    json,
    value: JSON.parse(json) as Record<string, unknown>,
  };
}

function ordered(first: string, second: string, field: string, message: string, allowEqual = true) {
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  if (allowEqual ? firstTime > secondTime : firstTime >= secondTime) validationFailure(field, message);
}

function optionalText(value: unknown) {
  const text = cleanText(value, 4_096);
  return text || null;
}

function safeObjectJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function normalizedAsOf(value: Date | string | undefined) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError("asOf must be a valid date.");
  return date;
}

function timestamp(value: string) {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : Number.NEGATIVE_INFINITY;
}

export function marketFreshnessAt(
  deadlines: Pick<LatestMarketObservation, "freshUntil" | "recentUntil" | "referenceUntil">,
  asOf: Date | string = new Date(),
): MarketFreshness {
  const now = normalizedAsOf(asOf).getTime();
  if (now <= timestamp(deadlines.freshUntil)) return "live";
  if (now <= timestamp(deadlines.recentUntil)) return "recent";
  if (now <= timestamp(deadlines.referenceUntil)) return "reference";
  return "stale";
}

function normalizePublishSource(source: PublishMarketDataSource) {
  if (!source || typeof source !== "object") validationFailure("source", "is required.");
  const checkedAt = isoTimestamp(source.checkedAt, "source.checkedAt");
  const publishedAt = optionalIsoTimestamp(source.publishedAt, "source.publishedAt");
  if (publishedAt) {
    ordered(publishedAt, checkedAt, "source.checkedAt", "must be at or after source.publishedAt.");
  }
  const type = source.type ?? "other";
  if (!SOURCE_TYPES.has(type)) validationFailure("source.type", "is not supported.");
  const status = source.status ?? "active";
  if (!SOURCE_STATUSES.has(status)) validationFailure("source.status", "is not supported.");
  const metadata = validatedMetadata(source.metadata, "source.metadata");
  return {
    id: marketKey(source.id, "source.id"),
    key: marketKey(source.key, "source.key"),
    version: positiveVersion(source.version, "source.version"),
    publisher: requiredText(source.publisher, "source.publisher", 180),
    label: requiredText(source.label, "source.label", 240),
    canonicalUrl: httpsUrl(source.canonicalUrl, "source.canonicalUrl"),
    type,
    jurisdiction: requiredText(source.jurisdiction ?? "UAE", "source.jurisdiction", 80),
    publishedAt,
    checkedAt,
    status,
    metadata,
  };
}

function normalizePublishObservation(
  observation: PublishMarketObservation,
  index: number,
  source: ReturnType<typeof normalizePublishSource>,
) {
  const prefix = `observations[${index}]`;
  if (!observation || typeof observation !== "object") validationFailure(prefix, "must be an object.");
  if (!observation.scope || !SCOPE_TYPES.has(observation.scope.type)) {
    validationFailure(`${prefix}.scope.type`, "must be uae, emirate, community, or project.");
  }
  const scopeKey = marketKey(observation.scope.key, `${prefix}.scope.key`);
  const scopeLabel = optionalValidatedText(observation.scope.label, `${prefix}.scope.label`, 160) || scopeKey;

  const candidateNumeric = observation.value?.numeric;
  let numeric: number | null = null;
  if (candidateNumeric !== undefined && candidateNumeric !== null) {
    if (typeof candidateNumeric !== "number" || !Number.isFinite(candidateNumeric) || Math.abs(candidateNumeric) > Number.MAX_SAFE_INTEGER) {
      validationFailure(`${prefix}.value.numeric`, "must be a finite number within JavaScript's safe numeric range.");
    }
    numeric = candidateNumeric;
  }
  const text = optionalValidatedText(observation.value?.text, `${prefix}.value.text`, 1_000);
  if (numeric === null && !text) validationFailure(`${prefix}.value`, "must include a numeric or non-empty text value.");
  const unit = requiredText(observation.value?.unit, `${prefix}.value.unit`, 32);
  if (!MARKET_UNIT_PATTERN.test(unit)) validationFailure(`${prefix}.value.unit`, "contains unsupported unit characters.");
  const currencyCode = optionalValidatedText(observation.value?.currencyCode, `${prefix}.value.currencyCode`, 3).toUpperCase();
  if (currencyCode && !/^[A-Z]{3}$/.test(currencyCode)) {
    validationFailure(`${prefix}.value.currencyCode`, "must be a three-letter ISO-style currency code.");
  }

  const periodStart = optionalIsoTimestamp(observation.period?.start, `${prefix}.period.start`);
  const periodEnd = optionalIsoTimestamp(observation.period?.end, `${prefix}.period.end`);
  if (periodStart && periodEnd) {
    ordered(periodStart, periodEnd, `${prefix}.period.end`, "must be at or after period.start.");
  }
  const observedAt = isoTimestamp(observation.observedAt, `${prefix}.observedAt`);
  const publishedAt = isoTimestamp(observation.publishedAt, `${prefix}.publishedAt`);
  const validFrom = isoTimestamp(observation.validFrom, `${prefix}.validFrom`);
  const validUntil = optionalIsoTimestamp(observation.validUntil, `${prefix}.validUntil`);
  const freshUntil = isoTimestamp(observation.freshUntil, `${prefix}.freshUntil`);
  const recentUntil = isoTimestamp(observation.recentUntil, `${prefix}.recentUntil`);
  const referenceUntil = isoTimestamp(observation.referenceUntil, `${prefix}.referenceUntil`);
  ordered(observedAt, publishedAt, `${prefix}.publishedAt`, "must be at or after observedAt.");
  ordered(publishedAt, source.checkedAt, `${prefix}.publishedAt`, "must not be after source.checkedAt.");
  if (validUntil) {
    ordered(validFrom, validUntil, `${prefix}.validUntil`, "must be after validFrom.", false);
  }
  ordered(validFrom, freshUntil, `${prefix}.freshUntil`, "must be at or after validFrom.");
  ordered(freshUntil, recentUntil, `${prefix}.recentUntil`, "must be at or after freshUntil.");
  ordered(recentUntil, referenceUntil, `${prefix}.referenceUntil`, "must be at or after recentUntil.");
  if (validUntil) {
    ordered(referenceUntil, validUntil, `${prefix}.validUntil`, "must be at or after referenceUntil.");
  }

  const evidenceUrl = observation.evidenceUrl
    ? httpsUrl(observation.evidenceUrl, `${prefix}.evidenceUrl`)
    : source.canonicalUrl;
  const metadata = validatedMetadata(observation.metadata, `${prefix}.metadata`);
  return {
    id: marketKey(observation.id, `${prefix}.id`),
    seriesKey: marketKey(observation.seriesKey, `${prefix}.seriesKey`),
    version: positiveVersion(observation.version, `${prefix}.version`),
    metricKey: marketKey(observation.metricKey, `${prefix}.metricKey`, 96),
    scope: {
      type: observation.scope.type,
      key: scopeKey,
      label: scopeLabel,
    },
    value: { numeric, text, unit, currencyCode },
    period: { start: periodStart, end: periodEnd },
    observedAt,
    publishedAt,
    validFrom,
    validUntil,
    freshUntil,
    recentUntil,
    referenceUntil,
    sourceRecordId: optionalValidatedText(observation.sourceRecordId, `${prefix}.sourceRecordId`, 240),
    evidenceUrl,
    provenanceNote: optionalValidatedText(observation.provenanceNote, `${prefix}.provenanceNote`, 2_000),
    methodology: optionalValidatedText(observation.methodology, `${prefix}.methodology`, 4_000),
    metadata,
  };
}

const INSERT_MARKET_SOURCE_SQL = `
  INSERT INTO psr_market_data_sources (
    id, source_key, version, publisher, label, canonical_url, source_type,
    jurisdiction, published_at, checked_at, status, metadata_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const INSERT_MARKET_OBSERVATION_SQL = `
  INSERT INTO psr_market_observations (
    id, series_key, version, metric_key, scope_type, scope_key, scope_label,
    value_numeric, value_text, unit, currency_code, period_start, period_end,
    observed_at, published_at, valid_from, valid_until,
    fresh_until, recent_until, reference_until, status, source_id,
    source_record_id, evidence_url, provenance_note, methodology, metadata_json,
    ingested_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Validates a complete feed snapshot, then inserts its exact source revision
 * and observation revisions in one atomic D1 batch. Plain INSERT statements
 * intentionally make reused IDs or (key, version) pairs fail instead of
 * mutating previously published evidence.
 */
export async function publishMarketDataSnapshot(
  database: D1Database,
  input: PublishMarketDataInput,
): Promise<PublishedMarketDataSnapshot> {
  if (!input || typeof input !== "object") validationFailure("input", "must be an object.");
  if (!Array.isArray(input.observations) || input.observations.length === 0) {
    validationFailure("observations", "must contain at least one observation.");
  }
  if (input.observations.length > MAX_MARKET_PUBLISH_OBSERVATIONS) {
    validationFailure("observations", `must not contain more than ${MAX_MARKET_PUBLISH_OBSERVATIONS} observations.`);
  }

  const source = normalizePublishSource(input.source);
  const observations = input.observations.map((observation, index) => normalizePublishObservation(observation, index, source));
  const observationIds = new Set<string>();
  const revisions = new Set<string>();
  for (const [index, observation] of observations.entries()) {
    if (observationIds.has(observation.id)) validationFailure(`observations[${index}].id`, "duplicates another observation ID in this snapshot.");
    observationIds.add(observation.id);
    const revision = `${observation.seriesKey}\0${observation.version}`;
    if (revisions.has(revision)) validationFailure(`observations[${index}].version`, "duplicates another series revision in this snapshot.");
    revisions.add(revision);
  }

  const committedAt = new Date().toISOString();
  const sourceStatement = database.prepare(INSERT_MARKET_SOURCE_SQL).bind(
    source.id,
    source.key,
    source.version,
    source.publisher,
    source.label,
    source.canonicalUrl,
    source.type,
    source.jurisdiction,
    source.publishedAt,
    source.checkedAt,
    source.status,
    source.metadata.json,
    committedAt,
    committedAt,
  );
  const observationStatement = database.prepare(INSERT_MARKET_OBSERVATION_SQL);
  const statements: D1PreparedStatement[] = [
    sourceStatement,
    ...observations.map((observation) => observationStatement.bind(
      observation.id,
      observation.seriesKey,
      observation.version,
      observation.metricKey,
      observation.scope.type,
      observation.scope.key,
      observation.scope.label,
      observation.value.numeric,
      observation.value.text,
      observation.value.unit,
      observation.value.currencyCode,
      observation.period.start,
      observation.period.end,
      observation.observedAt,
      observation.publishedAt,
      observation.validFrom,
      observation.validUntil,
      observation.freshUntil,
      observation.recentUntil,
      observation.referenceUntil,
      source.id,
      observation.sourceRecordId,
      observation.evidenceUrl,
      observation.provenanceNote,
      observation.methodology,
      observation.metadata.json,
      committedAt,
      committedAt,
    )),
  ];
  const results = await database.batch(statements);
  if (results.length !== statements.length || results.some((result) => !result.success)) {
    throw new Error("D1 did not commit the complete market-data snapshot.");
  }

  return {
    source: {
      id: source.id,
      key: source.key,
      version: source.version,
      publisher: source.publisher,
      label: source.label,
      canonicalUrl: source.canonicalUrl,
      type: source.type,
      jurisdiction: source.jurisdiction,
      publishedAt: source.publishedAt || null,
      checkedAt: source.checkedAt,
      status: source.status,
      metadata: source.metadata.value,
    },
    observations: observations.map((observation) => ({
      id: observation.id,
      seriesKey: observation.seriesKey,
      version: observation.version,
      metricKey: observation.metricKey,
      scope: observation.scope,
      observedAt: observation.observedAt,
      publishedAt: observation.publishedAt,
      validFrom: observation.validFrom,
      validUntil: observation.validUntil || null,
      freshnessAtSourceCheck: marketFreshnessAt(observation, source.checkedAt),
      status: "published",
    })),
    insertedCount: observations.length,
    committedAt,
  };
}

function normalizeScopes(scopes: MarketScope[]) {
  const unique = new Map<string, MarketScope>();
  for (const scope of Array.isArray(scopes) ? scopes : []) {
    if (!scope || !SCOPE_TYPES.has(scope.type)) continue;
    const key = cleanText(scope.key, 180);
    if (!key) continue;
    const identity = `${scope.type}\0${key}`;
    if (!unique.has(identity)) unique.set(identity, { type: scope.type, key });
    if (unique.size === MAX_MARKET_SCOPE_COUNT) break;
  }
  return [...unique.values()];
}

function normalizeMetricKeys(metricKeys: string[] | undefined) {
  if (!Array.isArray(metricKeys)) return [];
  const unique = new Set<string>();
  for (const value of metricKeys) {
    const key = cleanText(value, 96);
    if (key) unique.add(key);
    if (unique.size === MAX_MARKET_METRIC_COUNT) break;
  }
  return [...unique];
}

function chunks<T>(values: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

function resultLimit(value: number | undefined) {
  if (value === undefined) return MAX_MARKET_RESULT_COUNT;
  if (!Number.isFinite(value)) return MAX_MARKET_RESULT_COUNT;
  return Math.min(MAX_MARKET_RESULT_COUNT, Math.max(0, Math.trunc(value)));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

export function isMarketDataMigrationMissingError(error: unknown) {
  return MARKET_TABLE_PATTERN.test(errorMessage(error));
}

function queryFor(scopeCount: number, metricCount: number) {
  const scopeRank = Array.from(
    { length: scopeCount },
    (_, index) => `WHEN o.scope_type = ? AND o.scope_key = ? THEN ${index}`,
  ).join(" ");
  const scopePredicate = Array.from(
    { length: scopeCount },
    () => "(o.scope_type = ? AND o.scope_key = ?)",
  ).join(" OR ");
  const metricPredicate = metricCount > 0
    ? `AND o.metric_key IN (${Array.from({ length: metricCount }, () => "?").join(", ")})`
    : "";
  return `
    WITH applicable AS (
      SELECT
        o.*,
        s.source_key,
        s.version AS source_version,
        s.publisher AS source_publisher,
        s.label AS source_label,
        s.canonical_url AS source_url,
        s.source_type,
        s.jurisdiction AS source_jurisdiction,
        s.published_at AS source_published_at,
        s.checked_at AS source_checked_at,
        s.metadata_json AS source_metadata_json,
        CASE ${scopeRank} ELSE ${scopeCount} END AS scope_rank,
        ROW_NUMBER() OVER (
          PARTITION BY o.series_key
          ORDER BY datetime(o.observed_at) DESC, o.version DESC, datetime(o.ingested_at) DESC, o.id DESC
        ) AS series_rank
      FROM psr_market_observations o
      INNER JOIN psr_market_data_sources s ON s.id = o.source_id
      WHERE o.status = 'published'
        AND s.status IN ('active', 'retired')
        AND (${scopePredicate})
        ${metricPredicate}
        AND datetime(o.valid_from) <= datetime(?)
        AND (o.valid_until = '' OR datetime(o.valid_until) > datetime(?))
    )
    SELECT *
    FROM applicable
    WHERE series_rank = 1
    ORDER BY scope_rank ASC, datetime(observed_at) DESC, series_key ASC
    LIMIT ?
  `;
}

function observationFromRow(row: MarketObservationRow, asOf: Date, scopePriority: number): LatestMarketObservation {
  const deadlines = {
    freshUntil: row.fresh_until,
    recentUntil: row.recent_until,
    referenceUntil: row.reference_until,
  };
  const numericValue = row.value_numeric === null || row.value_numeric === undefined
    ? null
    : Number(row.value_numeric);
  return {
    id: row.id,
    seriesKey: row.series_key,
    version: Number(row.version),
    metricKey: row.metric_key,
    scope: {
      type: row.scope_type,
      key: row.scope_key,
      label: row.scope_label,
    },
    scopePriority,
    value: {
      numeric: numericValue !== null && Number.isFinite(numericValue) ? numericValue : null,
      text: optionalText(row.value_text),
      unit: row.unit,
      currencyCode: optionalText(row.currency_code),
    },
    period: {
      start: optionalText(row.period_start),
      end: optionalText(row.period_end),
    },
    observedAt: row.observed_at,
    publishedAt: row.published_at,
    validFrom: row.valid_from,
    validUntil: optionalText(row.valid_until),
    ...deadlines,
    freshness: marketFreshnessAt(deadlines, asOf),
    source: {
      id: row.source_id,
      key: row.source_key,
      version: Number(row.source_version),
      publisher: row.source_publisher,
      label: row.source_label,
      canonicalUrl: row.source_url,
      type: row.source_type,
      jurisdiction: row.source_jurisdiction,
      publishedAt: optionalText(row.source_published_at),
      checkedAt: row.source_checked_at,
      metadata: safeObjectJson(row.source_metadata_json),
    },
    provenance: {
      sourceRecordId: optionalText(row.source_record_id),
      evidenceUrl: optionalText(row.evidence_url),
      note: optionalText(row.provenance_note),
      methodology: optionalText(row.methodology),
    },
    metadata: safeObjectJson(row.metadata_json),
  };
}

/**
 * Reads only published observations that are valid at `asOf` and returns the
 * newest revision of each series. Scope order is retained as `scopePriority`,
 * so callers can pass project -> community -> emirate -> UAE when resolving
 * progressively broader evidence.
 */
export async function latestApplicableMarketObservations(
  database: D1Database,
  query: LatestMarketObservationQuery,
): Promise<LatestMarketObservation[]> {
  const scopes = normalizeScopes(query.scopes);
  const metricKeys = normalizeMetricKeys(query.metricKeys);
  const limit = resultLimit(query.limit);
  if (scopes.length === 0 || limit === 0) return [];

  const asOf = normalizedAsOf(query.asOf);
  const asOfIso = asOf.toISOString();
  const scopePriority = new Map(
    scopes.map((scope, index) => [`${scope.type}\0${scope.key}`, index]),
  );
  const rowsById = new Map<string, LatestMarketObservation>();
  const metricBatches = metricKeys.length > 0
    ? chunks(metricKeys, MAX_MARKET_METRIC_COUNT)
    : [[]];

  try {
    for (const scopeBatch of chunks(scopes, MARKET_SCOPE_BATCH_SIZE)) {
      for (const metricBatch of metricBatches) {
        const bindings: Array<string | number> = [];
        for (const scope of scopeBatch) bindings.push(scope.type, scope.key);
        for (const scope of scopeBatch) bindings.push(scope.type, scope.key);
        bindings.push(...metricBatch, asOfIso, asOfIso, MAX_MARKET_RESULT_COUNT);
        const response = await database
          .prepare(queryFor(scopeBatch.length, metricBatch.length))
          .bind(...bindings)
          .all<MarketObservationRow>();
        for (const row of response.results ?? []) {
          const priority = scopePriority.get(`${row.scope_type}\0${row.scope_key}`) ?? scopes.length;
          rowsById.set(row.id, observationFromRow(row, asOf, priority));
        }
      }
    }
  } catch (error) {
    if (isMarketDataMigrationMissingError(error)) return [];
    throw error;
  }

  return [...rowsById.values()]
    .sort((left, right) => (
      left.scopePriority - right.scopePriority
      || right.observedAt.localeCompare(left.observedAt)
      || left.seriesKey.localeCompare(right.seriesKey)
    ))
    .slice(0, limit);
}
