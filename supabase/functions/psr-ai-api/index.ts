import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "2026-09-14.1";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function decodeJwtPayload(authHeader: string | null): Record<string, unknown> | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let s = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return JSON.parse(atob(s));
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanStringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);

  // Supabase verifies the JWT before execution. We additionally require the
  // service_role claim so this function is intended for server-to-server use
  // (e.g. Cloudflare Worker -> Supabase), never direct browser access.
  const claims = decodeJwtPayload(req.headers.get("authorization"));
  if (!claims || claims.role !== "service_role") {
    return reply({ ok: false, error: "server_authorization_required" }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return reply({ ok: false, error: "server_not_configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!isObject(parsed)) return reply({ ok: false, error: "invalid_json_body" }, 400);
    body = parsed;
  } catch {
    return reply({ ok: false, error: "invalid_json_body" }, 400);
  }

  const action = cleanString(body.action, 80);
  if (!action) return reply({ ok: false, error: "action_required" }, 400);

  try {
    if (action === "health") {
      const [projects, leads, events] = await Promise.all([
        supabase.from("psr_projects").select("id", { count: "exact", head: true }),
        supabase.from("psr_leads").select("id", { count: "exact", head: true }),
        supabase.from("psr_events").select("id", { count: "exact", head: true }),
      ]);
      const error = projects.error || leads.error || events.error;
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({
        ok: true,
        service: "psr-ai-api",
        version: VERSION,
        counts: { projects: projects.count ?? 0, leads: leads.count ?? 0, events: events.count ?? 0 },
      });
    }

    if (action === "find_projects") {
      const filters = isObject(body.filters) ? body.filters : {};
      const { data, error } = await supabase.rpc("psr_find_projects", {
        max_budget_aed: cleanNumber(filters.max_budget_aed),
        min_budget_aed: cleanNumber(filters.min_budget_aed),
        filter_emirate: cleanString(filters.emirate, 100),
        filter_community: cleanString(filters.community, 160),
        filter_property_type: cleanString(filters.property_type, 100),
        filter_status: cleanString(filters.status, 50) ?? "active",
        result_limit: Math.max(1, Math.min(50, cleanNumber(filters.limit) ?? 20)),
      });
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, projects: data ?? [] });
    }

    if (action === "project_snapshot") {
      const projectId = cleanString(body.project_id, 80);
      if (!projectId) return reply({ ok: false, error: "project_id_required" }, 400);
      const { data, error } = await supabase.rpc("psr_get_project_snapshot", { target_project_id: projectId });
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, snapshot: data ?? null });
    }

    if (action === "match_knowledge") {
      const embedding = body.query_embedding;
      if (!Array.isArray(embedding) || embedding.length !== 384 || embedding.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
        return reply({ ok: false, error: "query_embedding_must_be_384_numbers" }, 400);
      }
      const { data, error } = await supabase.rpc("psr_match_knowledge", {
        query_embedding: embedding,
        match_threshold: Math.max(0, Math.min(1, cleanNumber(body.match_threshold) ?? 0.72)),
        match_count: Math.max(1, Math.min(25, cleanNumber(body.match_count) ?? 8)),
        filter_project_id: cleanString(body.project_id, 80),
      });
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, matches: data ?? [] });
    }

    if (action === "create_lead") {
      const input = isObject(body.lead) ? body.lead : {};
      const consentContact = input.consent_contact === true;
      const purpose = cleanString(input.purpose, 50);
      const allowedPurpose = new Set(["investment", "home", "business", "family_office", "combined", "other"]);
      const row = {
        full_name: cleanString(input.full_name, 200),
        email: cleanString(input.email, 320)?.toLowerCase() ?? null,
        phone: cleanString(input.phone, 80),
        source: cleanString(input.source, 80) ?? "website",
        source_context: isObject(input.source_context) ? input.source_context : {},
        budget_min_aed: cleanNumber(input.budget_min_aed),
        budget_max_aed: cleanNumber(input.budget_max_aed),
        purpose: purpose && allowedPurpose.has(purpose) ? purpose : null,
        preferred_emirates: cleanStringArray(input.preferred_emirates, 10),
        preferred_communities: cleanStringArray(input.preferred_communities, 20),
        bedrooms_min: cleanNumber(input.bedrooms_min),
        timeframe: cleanString(input.timeframe, 100),
        consent_contact: consentContact,
        consent_at: consentContact ? new Date().toISOString() : null,
        last_activity_at: new Date().toISOString(),
      };
      if (!row.full_name && !row.email && !row.phone) return reply({ ok: false, error: "lead_identity_required" }, 400);
      const { data, error } = await supabase.from("psr_leads").insert(row).select("id,status,created_at").single();
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, lead: data }, 201);
    }

    if (action === "start_conversation") {
      const leadId = cleanString(body.lead_id, 80);
      const channel = cleanString(body.channel, 30) ?? "web";
      const allowedChannels = new Set(["web", "whatsapp", "email", "agent", "event", "other"]);
      if (!allowedChannels.has(channel)) return reply({ ok: false, error: "invalid_channel" }, 400);
      const sessionKey = cleanString(body.session_key, 200) ?? crypto.randomUUID();
      const { data, error } = await supabase
        .from("psr_conversations")
        .insert({
          lead_id: leadId,
          session_key: sessionKey,
          channel,
          last_message_at: null,
          metadata: isObject(body.metadata) ? body.metadata : {},
        })
        .select("id,lead_id,session_key,channel,started_at")
        .single();
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, conversation: data }, 201);
    }

    if (action === "append_message") {
      const conversationId = cleanString(body.conversation_id, 80);
      const role = cleanString(body.role, 20);
      const content = cleanString(body.content, 20000);
      const allowedRoles = new Set(["user", "assistant", "system", "tool"]);
      if (!conversationId || !role || !allowedRoles.has(role) || !content) {
        return reply({ ok: false, error: "conversation_id_role_content_required" }, 400);
      }
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("psr_messages")
        .insert({
          conversation_id: conversationId,
          role,
          content,
          model: cleanString(body.model, 120),
          metadata: isObject(body.metadata) ? body.metadata : {},
        })
        .select("id,conversation_id,role,created_at")
        .single();
      if (error) return reply({ ok: false, error: error.message }, 500);
      const { error: updateError } = await supabase.from("psr_conversations").update({ last_message_at: now }).eq("id", conversationId);
      if (updateError) return reply({ ok: false, error: updateError.message }, 500);
      return reply({ ok: true, message: data }, 201);
    }

    if (action === "register_event") {
      const eventSlug = cleanString(body.event_slug, 160);
      const leadId = cleanString(body.lead_id, 80);
      if (!eventSlug || !leadId) return reply({ ok: false, error: "event_slug_and_lead_id_required" }, 400);
      const { data: event, error: eventError } = await supabase.from("psr_events").select("id,slug,event_status").eq("slug", eventSlug).maybeSingle();
      if (eventError) return reply({ ok: false, error: eventError.message }, 500);
      if (!event) return reply({ ok: false, error: "event_not_found" }, 404);
      if (["closed", "completed", "cancelled"].includes(event.event_status)) return reply({ ok: false, error: "event_not_open" }, 409);
      const { data, error } = await supabase
        .from("psr_event_registrations")
        .insert({
          event_id: event.id,
          lead_id: leadId,
          session_key: cleanString(body.session_key, 160),
          interests: cleanStringArray(body.interests, 12),
          budget_band: cleanString(body.budget_band, 100),
          notes: cleanString(body.notes, 4000),
          metadata: isObject(body.metadata) ? body.metadata : {},
        })
        .select("id,event_id,lead_id,registration_status,created_at")
        .single();
      if (error) return reply({ ok: false, error: error.message }, 500);
      return reply({ ok: true, registration: data }, 201);
    }

    return reply({ ok: false, error: "unsupported_action" }, 400);
  } catch (error) {
    console.error("psr-ai-api", action, error);
    return reply({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }, 500);
  }
});
