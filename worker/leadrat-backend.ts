import type { AgentEnv, AgentSession } from "./agent-backend";

const LEADRAT_ORIGIN = "https://connect.leadrat.com";
const MAX_UPSTREAM_BYTES = 1_000_000;
const PAGE_SIZE = 50;
const DEFAULT_LEADRAT_OWNER_PSR_EMAIL = "admin@psrhomes.ae";

type LeadRatEnvelope = {
  succeeded?: boolean;
  message?: string;
  errors?: unknown;
  items?: unknown[];
  totalCount?: number;
  data?: unknown;
};

type LeadRatUser = Record<string, unknown>;
type LeadRatLead = Record<string, unknown>;
type LeadRatUserMappingRow = { leadrat_email: string };
type LeadRatLeadSyncState = "synced" | "failed";

export type LeadRatWebsiteLeadInput = {
  websiteLeadId: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  propertyReference?: string;
  propertyTitle?: string;
};

export type LeadRatWebsiteLeadSyncResult = {
  ok: boolean;
  leadRatLeadId: string;
  targetPsrEmail: string;
  targetLeadRatEmail: string;
  targetLeadRatUserId: string;
  error?: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

function appPath(pathname: string) {
  const decoded = pathname.replace(/^\/h%26g\/properties(?=\/|$)/i, "/h&g/properties");
  return decoded.startsWith("/h&g/properties") ? decoded.slice("/h&g/properties".length) || "/" : decoded;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}

function listFrom(payload: LeadRatEnvelope): Record<string, unknown>[] {
  const data = asRecord(payload.data);
  const source =
    Array.isArray(payload.items) ? payload.items :
    Array.isArray(payload.data) ? payload.data :
    Array.isArray(data.items) ? data.items :
    Array.isArray(data.records) ? data.records :
    Array.isArray(data.results) ? data.results :
    Array.isArray(data.leads) ? data.leads :
    Array.isArray(data.users) ? data.users :
    [];
  return source.map(asRecord).filter((item) => Object.keys(item).length > 0);
}

function totalFrom(payload: LeadRatEnvelope, fallback: number) {
  const data = asRecord(payload.data);
  const value = Number(payload.totalCount || (payload as Record<string, unknown>).total || data.totalCount || data.total || data.count || data.totalRecords);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function upstreamMessage(payload: LeadRatEnvelope, fallback: string) {
  const errors = Array.isArray(payload.errors) ? payload.errors.map((item) => text(item, 180)).filter(Boolean).join(" ") : "";
  return text(payload.message, 240) || errors || fallback;
}

async function upstreamJson(response: Response): Promise<LeadRatEnvelope> {
  const body = await boundedBody(response, MAX_UPSTREAM_BYTES, "LeadRat returned an unexpectedly large response.");
  try { return JSON.parse(body) as LeadRatEnvelope; } catch { throw new Error("LeadRat returned an unreadable response."); }
}

async function boundedBody(input: Request | Response, maxBytes: number, message: string) {
  const declared = Number(input.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    await input.body?.cancel();
    throw new Error(message);
  }
  if (!input.body) return "";
  const reader = input.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(message);
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally { reader.releaseLock(); }
}

async function token(env: AgentEnv) {
  const apiKey = text(env.LEADRAT_API_KEY, 1_000);
  const secretKey = text(env.LEADRAT_SECRET_KEY, 1_000);
  const tenant = text(env.LEADRAT_TENANT, 120);
  if (!apiKey || !secretKey || !tenant) throw new Error("LeadRat is not connected yet. An administrator needs to finish the secure setup.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${LEADRAT_ORIGIN}/api/v1/authentication/token`, {
      method: "POST",
      headers: { "content-type": "application/json", tenant },
      body: JSON.stringify({ apiKey, secretKey }),
      signal: controller.signal,
    });
    const payload = await upstreamJson(response);
    const data = asRecord(payload.data);
    const accessToken =
      text(data.accessToken, 4_000) ||
      text(data.token, 4_000) ||
      text(data.jwt, 4_000) ||
      text((payload as Record<string, unknown>).accessToken, 4_000);
    if (!response.ok || !accessToken) throw new Error("LeadRat authentication was rejected. Check the integration credentials.");
    return accessToken;
  } finally { clearTimeout(timeout); }
}

async function leadratGet(env: AgentEnv, path: string) {
  const accessToken = await token(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${LEADRAT_ORIGIN}${path}`, { headers: { authorization: `Bearer ${accessToken}` }, signal: controller.signal });
    const payload = await upstreamJson(response);
    if (!response.ok || payload.succeeded === false) throw new Error(upstreamMessage(payload, "LeadRat could not retrieve leads."));
    return payload;
  } finally { clearTimeout(timeout); }
}

async function leadratPut(env: AgentEnv, path: string, body: unknown) {
  const accessToken = await token(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${LEADRAT_ORIGIN}${path}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await upstreamJson(response);
    if (!response.ok || payload.succeeded === false) throw new Error(upstreamMessage(payload, "LeadRat could not save this lead."));
  } finally { clearTimeout(timeout); }
}

async function leadratPost(env: AgentEnv, path: string, body: unknown) {
  const accessToken = await token(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${LEADRAT_ORIGIN}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await upstreamJson(response);
    if (!response.ok || payload.succeeded === false) throw new Error(upstreamMessage(payload, "LeadRat could not create this lead."));
    return payload;
  } finally { clearTimeout(timeout); }
}

function userEmail(user: LeadRatUser) {
  return [user.email, user.emailAddress, user.emailId, user.Email, user.EmailAddress].map((value) => text(value, 320).toLowerCase()).find(Boolean) || "";
}

function userId(user: LeadRatUser) {
  return text(user.id || user._id || user.uuid || user.userId || user.userID || user.Id, 120);
}

async function leadRatTargetEmail(env: AgentEnv, psrEmail: string) {
  const fallback = text(psrEmail, 320).toLowerCase();
  if (!fallback || !env.DB) return fallback;
  try {
    const row = await env.DB.prepare(
      `SELECT leadrat_email FROM psr_leadrat_user_mappings
       WHERE psr_email = ? AND active = 1
       LIMIT 1`,
    ).bind(fallback).first<LeadRatUserMappingRow>();
    return text(row?.leadrat_email, 320).toLowerCase() || fallback;
  } catch (error) {
    console.error(JSON.stringify({
      event: "leadrat_user_mapping_lookup_failed",
      agent: fallback,
      message: error instanceof Error ? error.message.slice(0, 240) : "Mapping lookup failed",
    }));
    return fallback;
  }
}

async function leadRatUserForPsrEmail(env: AgentEnv, psrEmail: string) {
  const users = listFrom(await leadratGet(env, "/api/v1/user?PageNumber=1&PageSize=200"));
  const targetEmail = await leadRatTargetEmail(env, psrEmail);
  const matches = users.filter((user) => userEmail(user) === targetEmail);
  return matches.length === 1 ? { user: matches[0], targetEmail } : { user: null, targetEmail };
}

function leadRatDataId(payload: LeadRatEnvelope) {
  const data = asRecord(payload.data);
  return text(payload.data, 120) || text(data.id || data.leadId || data.Id, 120);
}

function leadRatLeadNotes(input: LeadRatWebsiteLeadInput) {
  return [
    `PSR website lead #${Math.max(0, Math.round(Number(input.websiteLeadId) || 0))}`,
    text(input.source, 160) && `Source: ${text(input.source, 160)}`,
    text(input.propertyTitle, 200) && `Property: ${text(input.propertyTitle, 200)}`,
    text(input.propertyReference, 180) && `Property reference: ${text(input.propertyReference, 180)}`,
    text(input.message, 4_000),
  ].filter(Boolean).join("\n\n").slice(0, 4_000);
}

async function recordLeadRatLeadSync(
  env: AgentEnv,
  input: LeadRatWebsiteLeadInput,
  state: {
    status: LeadRatLeadSyncState;
    leadRatLeadId?: string;
    targetPsrEmail: string;
    targetLeadRatEmail: string;
    targetLeadRatUserId: string;
    errorMessage?: string;
  },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO psr_leadrat_lead_syncs
       (website_lead_id, leadrat_lead_id, target_psr_email, target_leadrat_email, target_leadrat_user_id, status, error_message, attempt_count, attempted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(website_lead_id) DO UPDATE SET
         leadrat_lead_id = CASE WHEN excluded.leadrat_lead_id <> '' THEN excluded.leadrat_lead_id ELSE psr_leadrat_lead_syncs.leadrat_lead_id END,
         target_psr_email = excluded.target_psr_email,
         target_leadrat_email = excluded.target_leadrat_email,
         target_leadrat_user_id = excluded.target_leadrat_user_id,
         status = excluded.status,
         error_message = excluded.error_message,
         attempt_count = psr_leadrat_lead_syncs.attempt_count + 1,
         attempted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(
      Math.max(0, Math.round(Number(input.websiteLeadId) || 0)),
      text(state.leadRatLeadId, 120),
      text(state.targetPsrEmail, 320).toLowerCase(),
      text(state.targetLeadRatEmail, 320).toLowerCase(),
      text(state.targetLeadRatUserId, 120),
      state.status,
      text(state.errorMessage, 500),
    ).run();
  } catch (error) {
    console.error(JSON.stringify({
      event: "leadrat_lead_sync_log_failed",
      leadId: input.websiteLeadId,
      message: error instanceof Error ? error.message.slice(0, 240) : "LeadRat sync log failed",
    }));
  }
}

function leadOwner(lead: LeadRatLead) {
  const assigned = asRecord(lead.assignedUser || lead.assignUser || lead.user);
  return text(
    lead.assignTo ||
    lead.assignedTo ||
    lead.assignedUserId ||
    lead.assignedToId ||
    lead.assignUserId ||
    lead.userId ||
    assigned.id ||
    assigned._id ||
    assigned.userId ||
    assigned.Id,
    120,
  );
}

function leadSummary(lead: LeadRatLead) {
  const assigned = asRecord(lead.assignedUser || lead.assignUser || lead.user);
  const phones = Array.isArray(lead.phoneNumbers) ? lead.phoneNumbers.map((item) => text(item, 80)).filter(Boolean) : [];
  return {
    id: text(lead.id || lead.leadId || lead.Id, 120),
    name: text(lead.name || lead.fullName || lead.leadName || lead.Name, 200) || "Unnamed lead",
    email: text(lead.email || lead.emailAddress || lead.Email, 320),
    phone: text(lead.phone || lead.phoneNumber || lead.contactNo || lead.contactNumber || lead.mobile || lead.mobileNo || lead.Phone, 80) || phones[0] || "",
    source: text(lead.source || lead.sourceName || lead.leadSource || lead.Source, 160),
    status: text(lead.status || lead.statusName || asRecord(lead.leadStatus).displayName || asRecord(lead.leadStatus).status, 160),
    notes: text(lead.notes, 4_000),
    assignedTo: leadOwner(lead),
    assignedAgent: text(assigned.name || assigned.fullName || assigned.displayName, 200),
    createdAt: text(lead.createdOn || lead.createdAt || lead.createdDate, 80),
    updatedAt: text(lead.lastModifiedOn || lead.updatedAt || lead.modifiedOn, 80),
  };
}

async function currentUser(env: AgentEnv, session: AgentSession) {
  return (await leadRatUserForPsrEmail(env, session.email)).user;
}

export async function pushWebsiteLeadToLeadRat(
  env: AgentEnv,
  input: LeadRatWebsiteLeadInput,
  targetPsrEmail = DEFAULT_LEADRAT_OWNER_PSR_EMAIL,
): Promise<LeadRatWebsiteLeadSyncResult> {
  let targetLeadRatEmail = "";
  let targetLeadRatUserId = "";
  try {
    const mappedUser = await leadRatUserForPsrEmail(env, targetPsrEmail);
    targetLeadRatEmail = mappedUser.targetEmail;
    targetLeadRatUserId = mappedUser.user ? userId(mappedUser.user) : "";
    if (!targetLeadRatUserId) throw new Error("The default PSR LeadRat owner is not mapped to exactly one LeadRat user.");
    const body = {
      name: text(input.name, 200) || "Website lead",
      contactNo: text(input.phone, 80),
      email: text(input.email, 320),
      notes: leadRatLeadNotes(input),
      assignTo: targetLeadRatUserId,
      assignedFrom: targetLeadRatUserId,
      enquiry: {
        leadSource: "website",
      },
    };
    const payload = await leadratPost(env, "/api/v1/lead", body);
    const leadRatLeadId = leadRatDataId(payload);
    await recordLeadRatLeadSync(env, input, {
      status: "synced",
      leadRatLeadId,
      targetPsrEmail,
      targetLeadRatEmail,
      targetLeadRatUserId,
    });
    console.log(JSON.stringify({
      event: "leadrat_lead_created",
      leadId: input.websiteLeadId,
      leadRatLeadId,
      targetPsrEmail,
      targetLeadRatEmail,
    }));
    return { ok: true, leadRatLeadId, targetPsrEmail, targetLeadRatEmail, targetLeadRatUserId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "LeadRat could not create this lead.";
    await recordLeadRatLeadSync(env, input, {
      status: "failed",
      targetPsrEmail,
      targetLeadRatEmail,
      targetLeadRatUserId,
      errorMessage: message,
    });
    console.error(JSON.stringify({
      event: "leadrat_lead_create_failed",
      leadId: input.websiteLeadId,
      targetPsrEmail,
      targetLeadRatEmail,
      message: message.slice(0, 300),
    }));
    return { ok: false, leadRatLeadId: "", targetPsrEmail, targetLeadRatEmail, targetLeadRatUserId, error: message };
  }
}

async function fetchLeads(env: AgentEnv, scope: "mine" | "general" | "all", page: number, session: AgentSession) {
  const params = new URLSearchParams({ PageNumber: String(page), PageSize: String(PAGE_SIZE) });
  let ownerId = "";
  if (scope === "general") params.set("LeadVisibility", "unassigned");
  else if (scope === "mine") {
    const matchedUser = await currentUser(env, session);
    const id = matchedUser ? userId(matchedUser) : "";
    if (!id) return { leads: [], total: 0, page, pageSize: PAGE_SIZE, mappingRequired: true };
    ownerId = id;
    params.append("AssignUser", id);
  }
  const payload = await leadratGet(env, `/api/v1/lead?${params.toString()}`);
  const records = listFrom(payload);
  if ((scope === "mine" && records.some((lead) => leadOwner(lead) !== ownerId)) ||
      (scope === "general" && records.some((lead) => Boolean(leadOwner(lead))))) {
    throw new Error("LeadRat returned leads outside the requested ownership scope.");
  }
  const leads = records.map(leadSummary).filter((lead) => lead.id);
  return { leads, total: totalFrom(payload, leads.length), page, pageSize: PAGE_SIZE, mappingRequired: false };
}

async function readNotes(request: Request) {
  const body = await boundedBody(request, 16_000, "The note is too large.");
  let payload: Record<string, unknown>;
  try { payload = asRecord(JSON.parse(body)); } catch { throw new Error("Enter a note before saving."); }
  const notes = text(payload.notes, 4_000);
  if (!notes) throw new Error("Enter a note before saving.");
  return notes;
}

async function updateNotes(request: Request, env: AgentEnv, session: AgentSession, leadId: string) {
  const notes = await readNotes(request);
  const matchedUser = await currentUser(env, session);
  const userIdValue = matchedUser ? userId(matchedUser) : "";
  if (!userIdValue) return json({ error: "Your PSR workspace email is not yet matched to a LeadRat user." }, 403);
  const payload = await leadratGet(env, `/api/v1/lead/${encodeURIComponent(leadId)}`);
  const lead = asRecord(asRecord(payload.data).id ? payload.data : listFrom(payload)[0]);
  if (leadSummary(lead).id !== leadId || !leadOwner(lead) || leadOwner(lead) !== userIdValue) return json({ error: "You can only update notes on leads assigned to you." }, 403);
  await leadratPut(env, `/api/v1/lead/notes/${encodeURIComponent(leadId)}`, { id: leadId, notes });
  return json({ ok: true, notes });
}

export async function handleLeadRatRequest(request: Request, env: AgentEnv, session: AgentSession): Promise<Response | null> {
  const url = new URL(request.url);
  const path = appPath(url.pathname);
  if (path !== "/api/agent/leadrat" && !path.startsWith("/api/agent/leadrat/")) return null;
  const noteMatch = path.match(/^\/api\/agent\/leadrat\/leads\/([a-z0-9-]{8,})\/notes$/i);
  if (noteMatch && request.method === "PATCH") {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return json({ error: "Invalid request origin." }, 403);
    try { return await updateNotes(request, env, session, noteMatch[1]); }
    catch (error) {
      const message = error instanceof Error ? error.message : "LeadRat could not save this note.";
      console.error(JSON.stringify({ event: "leadrat_note_failed", agent: session.email, message: message.slice(0, 300) }));
      const status = message === "Enter a note before saving." || message === "The note is too large." ? 400 : 502;
      return json({ error: message }, status);
    }
  }
  if (path !== "/api/agent/leadrat") return json({ error: "LeadRat endpoint not found." }, 404);
  if (request.method !== "GET") return json({ error: "This LeadRat endpoint does not support that action." }, 405);

  const requestedScope = url.searchParams.get("scope");
  const scope = requestedScope === "general" || requestedScope === "all" ? requestedScope : "mine";
  if (scope !== "mine" && session.role.toLowerCase() !== "admin") return json({ error: "Only administrators can view the full or unassigned LeadRat pool." }, 403);
  const requestedPage = Number(url.searchParams.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, 1000)) : 1;
  try {
    const result = await fetchLeads(env, scope, page, session);
    return json({ scope, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LeadRat could not retrieve leads.";
    console.error(JSON.stringify({ event: "leadrat_leads_failed", scope, agent: session.email, message: message.slice(0, 300) }));
    return json({ error: message }, 502);
  }
}
