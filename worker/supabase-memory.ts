type SupabaseMemoryEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
};

export type AgentLongTermMemory = {
  summary: string;
  preferences: Record<string, unknown>;
  lastProjects: string[];
  lastConversationId: string;
  updatedAt: string;
};

type RememberAgentTurnInput = {
  email: string;
  displayName: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  projectSlugs: string[];
  preferences: Record<string, unknown>;
  previousSummary?: string;
  previousPreferences?: Record<string, unknown>;
};

const MEMORY_TIMEOUT_MS = 2_800;
const MAX_SUMMARY_CHARS = 4_000;
const MAX_EVENT_CHARS = 10_000;
const MEMORY_TABLE = "psr_agent_memory";
const MEMORY_EVENTS_TABLE = "psr_agent_memory_events";

function config(env: SupabaseMemoryEnv) {
  const url = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_SECRET_KEY || "").trim();
  return url && key ? { url, key } : null;
}

export function supabaseMemoryConfigured(env: SupabaseMemoryEnv) {
  return Boolean(config(env));
}

function headers(key: string, includeJson = false) {
  const value: Record<string, string> = {
    accept: "application/json",
    apikey: key,
  };
  // Legacy service-role JWTs require Authorization. Modern sb_secret_ keys are
  // intentionally passed only as the server-side apikey.
  if (key.startsWith("eyJ")) value.authorization = `Bearer ${key}`;
  if (includeJson) value["content-type"] = "application/json";
  return value;
}

async function memoryFetch(env: SupabaseMemoryEnv, path: string, init: RequestInit = {}) {
  const service = config(env);
  if (!service) return null;
  try {
    const response = await fetch(`${service.url}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers(service.key, Boolean(init.body)), ...(init.headers || {}) },
      signal: AbortSignal.timeout(MEMORY_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(JSON.stringify({ event: "supabase_agent_memory_failed", status: response.status }));
      return null;
    }
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      event: "supabase_agent_memory_unavailable",
      message: error instanceof Error ? error.message.slice(0, 180) : "unknown",
    }));
    return null;
  }
}

function stringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 180))
    .slice(0, limit);
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function readSupabaseAgentMemory(
  env: SupabaseMemoryEnv,
  email: string,
): Promise<AgentLongTermMemory | null> {
  const query = new URLSearchParams({
    agent_email: `eq.${email.toLowerCase()}`,
    select: "summary,preferences,last_projects,last_conversation_id,updated_at",
    limit: "1",
  });
  const response = await memoryFetch(env, `${MEMORY_TABLE}?${query.toString()}`);
  if (!response) return null;
  const rows = await response.json() as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  return {
    summary: typeof row.summary === "string" ? row.summary.slice(0, MAX_SUMMARY_CHARS) : "",
    preferences: safeObject(row.preferences),
    lastProjects: stringArray(row.last_projects),
    lastConversationId: typeof row.last_conversation_id === "string" ? row.last_conversation_id.slice(0, 80) : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

function nextSummary(input: RememberAgentTurnInput) {
  const previous = (input.previousSummary || "").trim();
  const user = input.userMessage.replace(/\s+/g, " ").trim().slice(0, 900);
  const assistant = input.assistantMessage.replace(/\s+/g, " ").trim().slice(0, 1_200);
  const latest = `Latest advisor request: ${user}\nLatest guidance: ${assistant}`;
  const combined = previous ? `${previous}\n\n${latest}` : latest;
  return combined.slice(-MAX_SUMMARY_CHARS);
}

export async function rememberSupabaseAgentTurn(
  env: SupabaseMemoryEnv,
  input: RememberAgentTurnInput,
) {
  if (!config(env)) return false;
  const now = new Date().toISOString();
  const email = input.email.toLowerCase();
  const memoryResponse = await memoryFetch(env, `${MEMORY_TABLE}?on_conflict=agent_email`, {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{
      agent_email: email,
      display_name: input.displayName.slice(0, 160),
      summary: nextSummary(input),
      preferences: { ...(input.previousPreferences || {}), ...input.preferences },
      last_projects: input.projectSlugs.slice(0, 12),
      last_conversation_id: input.conversationId.slice(0, 80),
      last_seen_at: now,
      updated_at: now,
    }]),
  });
  if (!memoryResponse) return false;

  const events = [
    {
      agent_email: email,
      conversation_id: input.conversationId.slice(0, 80),
      role: "user",
      content: input.userMessage.slice(0, MAX_EVENT_CHARS),
      metadata: { projectSlugs: input.projectSlugs.slice(0, 12) },
    },
    {
      agent_email: email,
      conversation_id: input.conversationId.slice(0, 80),
      role: "assistant",
      content: input.assistantMessage.slice(0, MAX_EVENT_CHARS),
      metadata: { projectSlugs: input.projectSlugs.slice(0, 12) },
    },
  ];
  await memoryFetch(env, MEMORY_EVENTS_TABLE, {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(events),
  });
  return true;
}
