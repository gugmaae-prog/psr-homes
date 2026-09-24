import {
  interpretSemanticSearchDeterministically,
  normalizeSemanticText,
  semanticSearchScopes,
  semanticSearchStatuses,
  type SemanticSearchIntent,
  type SemanticSearchScope,
} from "../lib/semantic-search";

const AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_QUERY_LENGTH = 320;
const validScopes = new Set<string>(semanticSearchScopes);

type SearchEnv = Env & { AI?: Ai };

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function readAiResponse(response: unknown): Record<string, unknown> | null {
  if (response && typeof response === "object" && !Array.isArray(response)) return response as Record<string, unknown>;
  if (typeof response !== "string") return null;
  try {
    const clean = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    return JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function supportedTerms(query: string, fallback: SemanticSearchIntent, value: unknown) {
  if (!Array.isArray(value)) return [];
  const sourceTerms = new Set(normalizeSemanticText(query).split(" ").filter(Boolean));
  const meaningfulTerms = new Set(fallback.terms.flatMap((term) => normalizeSemanticText(term).split(" ")).filter(Boolean));
  return value
    .filter((term): term is string => typeof term === "string")
    .map((term) => normalizeSemanticText(term).slice(0, 48))
    .filter((term) => term.length > 1 && term.split(" ").every((part) => sourceTerms.has(part) && meaningfulTerms.has(part)))
    .slice(0, 8);
}

export async function interpretSemanticSearch(
  rawQuery: string,
  scope: SemanticSearchScope,
  env: SearchEnv,
): Promise<SemanticSearchIntent> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const fallback = interpretSemanticSearchDeterministically(query, scope);
  if (!query || !env.AI) return fallback;
  const allowedStatuses = semanticSearchStatuses(scope);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      terms: { type: "array", items: { type: "string" }, maxItems: 8 },
      status: { type: "string" },
      timeframe: { type: "string", enum: ["", "today", "last_7_days", "last_30_days"] },
    },
    required: ["terms", "status", "timeframe"],
  };
  const startedAt = Date.now();
  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        {
          role: "system",
          content: "Interpret the search phrase into strict filters. Return only the requested JSON. Terms must be meaningful words already present in the user phrase; remove conversational filler and words represented by status or timeframe. Never invent a person, company, place, project, email, phone, tag, status, or date. Empty values are valid.",
        },
        {
          role: "user",
          content: JSON.stringify({
            scope,
            search: query,
            allowedStatuses,
            allowedTimeframes: ["today", "last_7_days", "last_30_days"],
          }),
        },
      ],
      max_tokens: 180,
      temperature: 0,
      response_format: { type: "json_schema", json_schema: schema },
    }) as { response?: unknown };
    const parsed = readAiResponse(result?.response);
    if (!parsed) return fallback;
    const aiTerms = supportedTerms(query, fallback, parsed.terms);
    const status = typeof parsed.status === "string" && allowedStatuses.includes(parsed.status)
      ? parsed.status
      : fallback.status;
    const timeframe = ["", "today", "last_7_days", "last_30_days"].includes(String(parsed.timeframe || ""))
      ? String(parsed.timeframe || "") as SemanticSearchIntent["timeframe"]
      : fallback.timeframe;
    const intent = {
      query,
      terms: aiTerms.length ? aiTerms : fallback.terms,
      status: fallback.status || status,
      timeframe: fallback.timeframe || timeframe,
      interpretedByAi: true,
    } satisfies SemanticSearchIntent;
    console.log({ event: "semantic_search_interpreted", scope, termCount: intent.terms.length, durationMs: Date.now() - startedAt });
    return intent;
  } catch (error) {
    console.error({
      event: "semantic_search_ai_failed",
      scope,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message.slice(0, 240) : "Search interpretation failed",
    });
    return fallback;
  }
}

export async function handleSemanticSearch(request: Request, env: SearchEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname.replace(/^\/psr\/properties(?=\/|$)/, "") || "/";
  if (path !== "/api/search/interpret") return null;
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
  if (!validOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4_096) return Response.json({ error: "Search request is too large." }, { status: 413 });
  try {
    const payload = await request.json() as { query?: unknown; scope?: unknown };
    const scope = typeof payload.scope === "string" && validScopes.has(payload.scope)
      ? payload.scope as SemanticSearchScope
      : null;
    if (!scope) return Response.json({ error: "Unknown search scope." }, { status: 400 });
    const query = typeof payload.query === "string" ? payload.query : "";
    const intent = await interpretSemanticSearch(query, scope, env);
    return Response.json({ intent }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return Response.json({ error: "Invalid search request." }, { status: 400 });
  }
}
