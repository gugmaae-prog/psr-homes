export const semanticSearchScopes = [
  "developers",
  "communities",
  "agent-options",
  "crm",
  "inbox",
  "leads",
] as const;

export type SemanticSearchScope = typeof semanticSearchScopes[number];

export type SemanticSearchIntent = {
  query: string;
  terms: string[];
  status: string;
  timeframe: "" | "today" | "last_7_days" | "last_30_days";
  interpretedByAi: boolean;
};

const commonStopWords = new Set([
  "a", "all", "an", "and", "any", "are", "by", "can", "client", "clients", "community", "communities",
  "contact", "contacts", "containing", "developer", "developers", "development", "developments", "email",
  "emails", "find", "for", "from", "has", "have", "in", "inbox", "lead", "leads",
  "include", "including", "is", "looking", "mail", "mails", "me", "message", "messages", "of", "on",
  "or", "please", "project", "projects", "record", "records", "search", "show", "that", "the", "to",
  "tag", "tagged", "want", "with",
]);

const statuses: Record<SemanticSearchScope, string[]> = {
  developers: [],
  communities: [],
  "agent-options": [],
  crm: ["new", "qualified", "nurturing", "active", "won", "lost", "archived"],
  inbox: ["unread", "read", "draft", "sent", "failed", "archived"],
  leads: ["new", "notified", "notification_failed"],
};

export function normalizeSemanticText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\br\.?a\.?k\.?\b/g, "ras al khaimah")
    .replace(/[^a-z0-9@.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectedStatus(value: string, scope: SemanticSearchScope) {
  if (scope === "leads" && /\b(?:notification pending|not notified|failed notification)\b/.test(value)) {
    return "notification_failed";
  }
  if (scope === "leads" && /\b(?:notified|notification sent)\b/.test(value)) return "notified";
  return statuses[scope].find((status) => value.includes(status.replaceAll("_", " "))) || "";
}

function detectedTimeframe(value: string): SemanticSearchIntent["timeframe"] {
  if (/\b(?:today|since this morning)\b/.test(value)) return "today";
  if (/\b(?:this week|last week|past week|last 7 days|seven days)\b/.test(value)) return "last_7_days";
  if (/\b(?:this month|last month|past month|last 30 days|thirty days)\b/.test(value)) return "last_30_days";
  return "";
}

export function interpretSemanticSearchDeterministically(
  rawQuery: string,
  scope: SemanticSearchScope,
): SemanticSearchIntent {
  const query = rawQuery.trim().slice(0, 320);
  const normalized = normalizeSemanticText(query);
  const status = detectedStatus(normalized, scope);
  const timeframe = detectedTimeframe(normalized);
  const excluded = new Set([
    ...commonStopWords,
    ...statuses[scope].flatMap((value) => value.split("_")),
    "today", "since", "this", "morning", "last", "past", "week", "month", "days", "seven", "thirty",
    "notification", "notified", "pending",
  ]);
  const terms = normalized
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !excluded.has(term) && !/^\d+$/.test(term))
    .slice(0, 8);
  return { query, terms, status, timeframe, interpretedByAi: false };
}

export function semanticSearchStatuses(scope: SemanticSearchScope) {
  return statuses[scope];
}

export function semanticHaystack(values: Array<string | number | null | undefined>) {
  return normalizeSemanticText(values.filter((value) => value !== null && value !== undefined).join(" "));
}

export function matchesSemanticIntent(intent: SemanticSearchIntent, values: Array<string | number | null | undefined>) {
  if (!intent.terms.length) return true;
  const haystack = semanticHaystack(values);
  return intent.terms.every((term) => {
    const normalized = normalizeSemanticText(term);
    return haystack.includes(normalized) || (normalized.endsWith("s") && normalized.length > 3 && haystack.includes(normalized.slice(0, -1)));
  });
}
