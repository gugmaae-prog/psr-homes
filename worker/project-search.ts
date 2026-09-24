import registryData from "../data/projects.json";

const AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_QUERY_LENGTH = 320;

type SearchEnv = Env & { AI?: Ai };
type RegistryProject = {
  developer: string;
  emirate: string;
  propertyTypes: string[];
};

const registry = registryData as { projects: RegistryProject[] };
const emirates = [...new Set(registry.projects.map((project) => project.emirate).filter(Boolean))];
const developers = [...new Set(registry.projects.map((project) => project.developer).filter(Boolean))];
const propertyTypes = [...new Set(registry.projects.flatMap((project) => project.propertyTypes).filter(Boolean))];

export type ProjectSearchIntent = {
  query: string;
  emirate: string;
  developer: string;
  propertyType: string;
  bedrooms: string;
  maxPriceAed: number;
  interpretedByAi: boolean;
};

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\br\.?a\.?k\.?\b/g, "ras al khaimah")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function exactOption(value: unknown, options: string[]) {
  if (typeof value !== "string") return "";
  const key = normalized(value);
  return options.find((option) => normalized(option) === key) || "";
}

function parseMaximumPrice(query: string) {
  const value = normalized(query);
  const match = value.match(/(?:under|below|up to|maximum|max|budget(?: of)?|less than)\s+(?:aed\s*)?([0-9]+(?:\.[0-9]+)?)\s*(m|mn|million|k|thousand)?\b/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const multiplier = /^(?:m|mn|million)$/i.test(match[2] || "") ? 1_000_000 : /^(?:k|thousand)$/i.test(match[2] || "") ? 1_000 : 1;
  const result = Math.round(amount * multiplier);
  return result >= 100_000 && result <= 1_000_000_000 ? result : 0;
}

function parseBedrooms(query: string) {
  if (/\bstudio\b/i.test(query)) return "Studios";
  const match = normalized(query).match(/\b([1-9])\s*(?:bed|beds|bedroom|bedrooms|br)\b/i);
  return match ? `${match[1]}BR` : "";
}

function matchEmirate(query: string) {
  const value = normalized(query);
  return emirates
    .slice()
    .sort((left, right) => normalized(right).length - normalized(left).length)
    .find((option) => value.includes(normalized(option))) || "";
}

function matchPropertyType(query: string) {
  const value = normalized(query);
  const synonyms: Array<[RegExp, string]> = [
    [/\b(?:flat|flats|apartment|apartments)\b/, "Apartments"],
    [/\b(?:villa|villas)\b/, "Villas"],
    [/\b(?:townhouse|townhouses)\b/, "Townhouses"],
    [/\b(?:penthouse|penthouses)\b/, "Penthouses"],
    [/\b(?:duplex|duplexes)\b/, "Duplexes"],
    [/\b(?:studio|studios)\b/, "Studios"],
    [/\b(?:mansion|mansions)\b/, "Mansions"],
    [/\b(?:plot|plots|land)\b/, "Land Plots"],
    [/\b(?:commercial|office|offices|retail)\b/, "Commercial property"],
  ];
  return synonyms.find(([pattern]) => pattern.test(value))?.[1]
    || propertyTypes.find((option) => value.includes(normalized(option)))
    || "";
}

const invalidDeveloperNames = new Set(["the", "al", "one", "new", "g", "w", "dubai", "marina"]);

function credibleDevelopers() {
  return developers.filter((option) => {
    const key = normalized(option);
    return key.length >= 4 && !invalidDeveloperNames.has(key);
  });
}

function matchDeveloper(query: string) {
  const value = ` ${normalized(query)} `;
  return credibleDevelopers()
    .sort((left, right) => normalized(right).length - normalized(left).length)
    .find((option) => value.includes(` ${normalized(option)} `)) || "";
}

function compactResidual(query: string, intent: Omit<ProjectSearchIntent, "query" | "interpretedByAi">) {
  let result = ` ${normalized(query)} `;
  const phrases = [intent.emirate, intent.developer, intent.propertyType, intent.bedrooms]
    .map(normalized)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  for (const phrase of phrases) result = result.replaceAll(` ${phrase} `, " ");
  result = result
    .replace(/\b(?:show|find|search|looking|look|want|need|please|me|for|properties|property|homes|home|residences|residence|apartment|apartments|flat|flats|villa|villas|townhouse|townhouses|penthouse|penthouses|duplex|duplexes|studio|studios|mansion|mansions|bedroom|bedrooms|bed|beds|br|in|at|by|from|with|and|or|under|below|up|to|maximum|max|budget|of|less|than|aed|million|thousand|mn)\b/g, " ")
    .replace(/\b[0-9]+(?:\.[0-9]+)?\s*(?:m|k)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result.length >= 2 ? result : "";
}

export function interpretProjectSearchDeterministically(rawQuery: string): ProjectSearchIntent {
  const input = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const base = {
    emirate: matchEmirate(input),
    developer: matchDeveloper(input),
    propertyType: matchPropertyType(input),
    bedrooms: parseBedrooms(input),
    maxPriceAed: parseMaximumPrice(input),
  };
  return {
    query: compactResidual(input, base),
    ...base,
    interpretedByAi: false,
  };
}

function aiDeveloperHints(query: string) {
  const terms = normalized(query).split(" ").filter((term) => term.length > 2);
  return credibleDevelopers()
    .filter((developer) => terms.some((term) => normalized(developer).includes(term)))
    .slice(0, 24);
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

async function interpretWithAi(query: string, env: SearchEnv, fallback: ProjectSearchIntent) {
  if (!env.AI) return fallback;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string" },
      emirate: { type: "string" },
      developer: { type: "string" },
      propertyType: { type: "string" },
      bedrooms: { type: "string" },
      maxPriceAed: { type: "number" },
    },
    required: ["query", "emirate", "developer", "propertyType", "bedrooms", "maxPriceAed"],
  };
  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        {
          role: "system",
          content: "Interpret a UAE property search into the existing catalogue filters. Return only the requested JSON. Never invent a developer, emirate, property type, bedroom value or price. The query field must contain only remaining project, community, amenity or lifestyle terms; remove conversational filler and any criteria already represented by another field. Use an empty string for unknown values and 0 when no maximum budget was stated.",
        },
        {
          role: "user",
          content: JSON.stringify({
            search: query,
            allowedEmirates: emirates,
            allowedPropertyTypes: propertyTypes,
            allowedBedrooms: ["Studios", "1BR", "2BR", "3BR", "4BR", "5BR", "6BR", "7BR", "8BR", "9BR"],
            possibleDevelopers: aiDeveloperHints(query),
          }),
        },
      ],
      max_tokens: 260,
      temperature: 0.05,
      response_format: { type: "json_schema", json_schema: schema },
    }) as { response?: unknown };
    const parsed = readAiResponse(result?.response);
    if (!parsed) return fallback;
    const maxPrice = Number(parsed.maxPriceAed);
    const bedrooms = typeof parsed.bedrooms === "string" && /^(?:Studios|[1-9]BR)$/.test(parsed.bedrooms) ? parsed.bedrooms : "";
    return {
      query: typeof parsed.query === "string" ? normalized(parsed.query).slice(0, 120) : fallback.query,
      emirate: fallback.emirate || exactOption(parsed.emirate, emirates),
      developer: fallback.developer || exactOption(parsed.developer, aiDeveloperHints(query)),
      propertyType: fallback.propertyType || exactOption(parsed.propertyType, propertyTypes),
      bedrooms: fallback.bedrooms || bedrooms,
      maxPriceAed: fallback.maxPriceAed || (Number.isFinite(maxPrice) && maxPrice >= 100_000 && maxPrice <= 1_000_000_000 ? Math.round(maxPrice) : 0),
      interpretedByAi: true,
    } satisfies ProjectSearchIntent;
  } catch (error) {
    console.error(JSON.stringify({
      event: "project_search_ai_failed",
      message: error instanceof Error ? error.message.slice(0, 240) : "Search interpretation failed",
    }));
    return fallback;
  }
}

export async function interpretProjectSearch(rawQuery: string, env: SearchEnv) {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const fallback = interpretProjectSearchDeterministically(query);
  return query ? await interpretWithAi(query, env, fallback) : fallback;
}

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function handleProjectSearchIntent(request: Request, env: SearchEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname.replace(/^\/psr\/properties(?=\/|$)/, "") || "/";
  if (path !== "/api/projects/interpret-search") return null;
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
  if (!validOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > 4_096) return Response.json({ error: "Search request is too large." }, { status: 413 });
  let query = "";
  try {
    const payload = await request.json() as { query?: unknown };
    query = typeof payload.query === "string" ? payload.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  } catch {
    return Response.json({ error: "Invalid search request." }, { status: 400 });
  }
  const intent = await interpretProjectSearch(query, env);
  return Response.json({ intent }, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
