import { getProjectRegistry } from "../lib/imported-projects";

const CRM_PREFIX = "/api/agent/crm";
const MAX_JSON_BYTES = 32_000;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export const CRM_CONTACT_TYPES = ["buyer", "seller", "investor", "tenant", "landlord", "other"] as const;
export const CRM_CONTACT_STATUSES = ["new", "qualified", "nurturing", "active", "won", "lost", "archived"] as const;
export const CRM_OPPORTUNITY_KINDS = ["purchase", "sale", "lease", "investment", "other"] as const;
export const CRM_OPPORTUNITY_STAGES = ["new", "contacted", "qualified", "viewing", "negotiation", "reservation", "won", "lost", "archived"] as const;
export const CRM_TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const CRM_TASK_STATUSES = ["open", "completed", "cancelled"] as const;
export const CRM_ACTIVITY_TYPES = ["note", "call", "email", "whatsapp", "meeting", "viewing", "status_change", "task_completed", "lead_import", "system"] as const;
export const CRM_MANUAL_ACTIVITY_TYPES = ["note", "call", "email", "whatsapp", "meeting", "viewing"] as const;

type ContactType = typeof CRM_CONTACT_TYPES[number];
type ContactStatus = typeof CRM_CONTACT_STATUSES[number];
type OpportunityKind = typeof CRM_OPPORTUNITY_KINDS[number];
type OpportunityStage = typeof CRM_OPPORTUNITY_STAGES[number];
type TaskPriority = typeof CRM_TASK_PRIORITIES[number];
type TaskStatus = typeof CRM_TASK_STATUSES[number];
type ActivityType = typeof CRM_ACTIVITY_TYPES[number];
type DbValue = string | number | null;

export type CrmSession = {
  email: string;
  name: string;
  role: string;
};

type CrmEnv = Pick<Env, "DB"> & {
  EMAIL?: SendEmail;
  MAIL_CAMPAIGNS?: Fetcher;
  CRM_MAIL_SYNC_SECRET?: string;
  CAMPAIGN_DELIVERY_ENABLED?: string;
};

type ContactRow = {
  id: string;
  owner_email: string;
  created_by: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  preferred_language: string;
  client_type: ContactType;
  source: string;
  status: ContactStatus;
  consent_status: "unknown" | "granted" | "withdrawn";
  consent_recorded_at: string;
  consent_source: string;
  consent_detail: string;
  tags_json: string;
  notes: string;
  last_contact_at: string;
  next_follow_up_at: string;
  created_at: string;
  updated_at: string;
};

type ContactSummaryRow = ContactRow & {
  open_opportunities: number;
  pipeline_value_aed: number;
  next_task_at: string;
};

type OpportunityRow = {
  id: string;
  contact_id: string;
  owner_email: string;
  title: string;
  kind: OpportunityKind;
  stage: OpportunityStage;
  estimated_value_aed: number;
  probability: number;
  project_slug: string;
  property_reference: string;
  communities_json: string;
  bedrooms_json: string;
  budget_min_aed: number;
  budget_max_aed: number;
  move_timeline: string;
  next_step: string;
  expected_close_at: string;
  lost_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  owner_email: string;
  assigned_by: string;
  title: string;
  notes: string;
  due_at: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  task_id: string | null;
  owner_email: string;
  actor_email: string;
  type: ActivityType;
  subject: string;
  body: string;
  occurred_at: string;
  created_at: string;
};

type LeadRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  property_reference: string | null;
  consent: number;
  created_at: string;
};

class CrmHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function appPath(pathname: string) {
  const decoded = pathname.replace(/^\/h%26g\/properties(?=\/|$)/i, "/h&g/properties");
  return decoded.startsWith("/h&g/properties")
    ? decoded.slice("/h&g/properties".length) || "/"
    : decoded;
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").trim().slice(0, max)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function has(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isAdmin(session: CrmSession) {
  return session.role.toLowerCase() === "admin";
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

function projectSearch(request: Request) {
  const query = clean(new URL(request.url).searchParams.get("q"), 120).toLocaleLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const projects = getProjectRegistry().projects
    .filter((project) => !project.archived)
    .filter((project) => !terms.length || terms.every((term) => [project.name, project.slug, project.developer, project.developerDisplay || "", project.area, project.emirate].some((value) => value.toLocaleLowerCase().includes(term))))
    .sort((left, right) => {
      const leftName = left.name.toLocaleLowerCase();
      const rightName = right.name.toLocaleLowerCase();
      const leftRank = Number(!leftName.startsWith(query));
      const rightRank = Number(!rightName.startsWith(query));
      return leftRank - rightRank || leftName.localeCompare(rightName);
    })
    .slice(0, 24)
    .map((project) => ({
      slug: project.slug,
      name: project.name,
      developer: project.developerDisplay || project.developer,
      area: project.area,
      emirate: project.emirate,
    }));
  return json({ projects });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw new CrmHttpError(413, "Request body is too large.");
  }
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new CrmHttpError(413, "Request body is too large.");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    throw new CrmHttpError(400, "Enter valid JSON.");
  }
  if (!isRecord(parsed)) throw new CrmHttpError(400, "The request must be a JSON object.");
  return parsed;
}

function member<T extends readonly string[]>(value: unknown, options: T, fallback?: T[number]): T[number] {
  const candidate = clean(value, 40);
  if ((options as readonly string[]).includes(candidate)) return candidate as T[number];
  if (fallback !== undefined && !candidate) return fallback;
  throw new CrmHttpError(400, `Unsupported value: ${candidate || "empty"}.`);
}

function normalizedEmail(value: unknown) {
  const email = clean(value, 180).toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CrmHttpError(400, "Enter a valid email address.");
  return email;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character] || character));
}

function normalizedPhone(value: unknown) {
  const phone = clean(value, 32).replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ");
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) throw new CrmHttpError(400, "Enter a valid contact number.");
  return phone;
}

function boundedInteger(value: unknown, label: string, min: number, max: number, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new CrmHttpError(400, `${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function normalizedDate(value: unknown, label: string) {
  const candidate = clean(value, 80);
  if (!candidate) return "";
  const parsed = Date.parse(candidate);
  if (!Number.isFinite(parsed)) throw new CrmHttpError(400, `Enter a valid ${label}.`);
  return new Date(parsed).toISOString();
}

function stringList(value: unknown, maxItems = 12, maxItemLength = 80) {
  if (value === undefined || value === null || value === "") return [];
  if (!Array.isArray(value)) throw new CrmHttpError(400, "Expected a list of values.");
  const result = value
    .map((item) => clean(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return [...new Set(result)];
}

function parseJsonList(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function pageFrom(url: URL) {
  const page = boundedInteger(url.searchParams.get("page"), "Page", 1, 10_000, 1);
  const pageSize = boundedInteger(url.searchParams.get("pageSize"), "Page size", 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function teamScope(url: URL, session: CrmSession) {
  return isAdmin(session) && url.searchParams.get("scope") === "team";
}

function scopeSql(url: URL, session: CrmSession, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return teamScope(url, session)
    ? { clause: "1 = 1", bindings: [] as DbValue[] }
    : { clause: `${prefix}owner_email = ?`, bindings: [session.email.toLowerCase()] as DbValue[] };
}

function contactJson(row: ContactRow | ContactSummaryRow) {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    createdBy: row.created_by,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    preferredLanguage: row.preferred_language,
    clientType: row.client_type,
    source: row.source,
    status: row.status,
    consentStatus: row.consent_status,
    consentRecordedAt: row.consent_recorded_at,
    consentSource: row.consent_source,
    consentDetail: row.consent_detail,
    tags: parseJsonList(row.tags_json),
    notes: row.notes,
    lastContactAt: row.last_contact_at,
    nextFollowUpAt: row.next_follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...("open_opportunities" in row ? {
      openOpportunities: Number(row.open_opportunities || 0),
      pipelineValueAed: Number(row.pipeline_value_aed || 0),
      nextTaskAt: row.next_task_at || "",
    } : {}),
  };
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function crmMailSignature(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function mailCampaignRequest<T>(env: CrmEnv, path: string, payload: Record<string, unknown>): Promise<T> {
  if (!env.MAIL_CAMPAIGNS || !env.CRM_MAIL_SYNC_SECRET) {
    throw new CrmHttpError(503, "Campaign delivery is being configured. Try again shortly.");
  }
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = await crmMailSignature(env.CRM_MAIL_SYNC_SECRET, `${timestamp}.${body}`);
  let response: Response;
  try {
    response = await env.MAIL_CAMPAIGNS.fetch(new Request(`https://mail.espacios.me${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-haus-crm-timestamp": timestamp,
        "x-haus-crm-signature": signature,
      },
      body,
    }));
  } catch {
    throw new CrmHttpError(503, "The campaign delivery service is temporarily unavailable.");
  }
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new CrmHttpError(response.status, result.error || "The campaign delivery service rejected this request.");
  return result;
}

function campaignActor(session: CrmSession) {
  return {
    actorEmail: session.email.toLowerCase(),
    actorRole: isAdmin(session) ? "admin" : "agent",
  } as const;
}

async function syncCampaignContactState(
  env: CrmEnv,
  session: CrmSession,
  contact: Pick<ContactRow, "id" | "email" | "owner_email">,
  state: "active" | "withdrawn" | "blocked",
  reason: string,
  consent?: { recordedAt: string; source: string; detail: string },
) {
  if (!contact.email) return;
  await mailCampaignRequest(env, "/internal/haus-crm/contacts/state", {
    ...campaignActor(session),
    agentEmail: contact.owner_email,
    crmContactId: contact.id,
    email: contact.email,
    state,
    reason,
    ...(consent ? {
      consentRecordedAt: new Date(consent.recordedAt).toISOString(),
      consentSource: consent.source,
      consentDetail: consent.detail,
    } : {}),
  });
}

async function campaignOwner(request: Request, env: CrmEnv, session: CrmSession, payload?: Record<string, unknown>) {
  const url = new URL(request.url);
  return resolveOwner(env, session, payload?.ownerEmail ?? url.searchParams.get("ownerEmail"));
}

function campaignEventStatement(env: CrmEnv, input: {
  campaignId: string;
  ownerEmail: string;
  actorEmail: string;
  action: "created" | "test_sent" | "send_accepted" | "send_failed";
  metadata?: Record<string, unknown>;
}) {
  return env.DB.prepare(
    `INSERT INTO hg_crm_campaign_events
     (id, campaign_id, owner_email, actor_email, action, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    input.campaignId,
    input.ownerEmail,
    input.actorEmail.toLowerCase(),
    input.action,
    JSON.stringify(input.metadata || {}),
  );
}

async function campaignWorkspace(request: Request, env: CrmEnv, session: CrmSession) {
  const ownerEmail = await campaignOwner(request, env, session);
  const audience = await env.DB.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN email <> '' AND consent_status='granted'
        AND consent_recorded_at <> '' AND consent_source <> '' AND consent_detail <> ''
        AND status NOT IN ('lost','archived') THEN 1 ELSE 0 END) AS consented,
      SUM(CASE WHEN email = '' AND status NOT IN ('lost','archived') THEN 1 ELSE 0 END) AS missing_email,
      SUM(CASE WHEN email <> '' AND status NOT IN ('lost','archived')
        AND (consent_status<>'granted' OR consent_recorded_at='' OR consent_source='' OR consent_detail='')
        THEN 1 ELSE 0 END) AS missing_consent
     FROM hg_crm_contacts WHERE owner_email=?`,
  ).bind(ownerEmail).first<{ total: number; consented: number; missing_email: number; missing_consent: number }>();
  const remote = await mailCampaignRequest<{
    campaigns: unknown[];
    studioUrl: string;
  }>(env, "/internal/haus-crm/campaigns/list", {
    ...campaignActor(session),
    agentEmail: ownerEmail,
  });
  return json({
    ownerEmail,
    audience: {
      total: Number(audience?.total || 0),
      consented: Number(audience?.consented || 0),
      missingEmail: Number(audience?.missing_email || 0),
      missingConsent: Number(audience?.missing_consent || 0),
    },
    campaigns: remote.campaigns,
    studioUrl: remote.studioUrl,
  });
}

async function createCampaign(request: Request, env: CrmEnv, session: CrmSession) {
  const payload = await readJson(request);
  const ownerEmail = await campaignOwner(request, env, session, payload);
  const campaignName = clean(payload.campaignName, 150);
  const subject = clean(payload.subject, 200);
  const previewText = clean(payload.previewText, 250);
  const message = clean(payload.message, 8_000);
  const ctaLabel = clean(payload.ctaLabel, 80);
  const rawCtaUrl = clean(payload.ctaUrl, 2_000);
  let ctaUrl = "";
  if (rawCtaUrl) {
    try {
      const parsed = new URL(rawCtaUrl);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error("protocol");
      ctaUrl = parsed.toString();
    } catch {
      throw new CrmHttpError(400, "Enter a complete http or https link for the campaign button.");
    }
  }
  if (!campaignName) throw new CrmHttpError(400, "Name this campaign.");
  if (subject.length < 2) throw new CrmHttpError(400, "Add an email subject.");
  if (message.length < 10) throw new CrmHttpError(400, "Add a useful campaign message.");
  if (ctaLabel && !ctaUrl) throw new CrmHttpError(400, "Add a link for the campaign button.");
  if (ctaUrl && !ctaLabel) throw new CrmHttpError(400, "Add a label for the campaign button.");
  const requestedStatus = clean(payload.status, 40);
  const status = requestedStatus ? member(requestedStatus, CRM_CONTACT_STATUSES) : "";
  if (["lost", "archived"].includes(status)) throw new CrmHttpError(400, "Lost and archived contacts cannot be selected for campaigns.");
  const tag = clean(payload.tag, 80).toLowerCase();
  const contactId = clean(payload.contactId, 64);
  const rows = await env.DB.prepare(
    `SELECT * FROM hg_crm_contacts
     WHERE owner_email=? AND status NOT IN ('lost','archived')
       AND (?='' OR status=?)
     ORDER BY updated_at DESC LIMIT 3000`,
  ).bind(ownerEmail, status, status).all<ContactRow>();
  let selected = rows.results.filter((row) => !tag || parseJsonList(row.tags_json).some((item) => item.toLowerCase() === tag));
  if (contactId) {
    const target = await getContactRow(env, session, contactId);
    if (target.owner_email !== ownerEmail) throw new CrmHttpError(403, "The selected client is not owned by this advisor.");
    if (["lost", "archived"].includes(target.status)) throw new CrmHttpError(409, "Lost and archived contacts cannot be selected for campaigns.");
    selected = [target];
  }
  const contacts = selected.filter((row) => (
    row.email
    && row.consent_status === "granted"
    && row.consent_recorded_at
    && row.consent_source
    && row.consent_detail
  ));
  if (!contacts.length) {
    throw new CrmHttpError(409, "No contacts in this audience have both an email address and recorded marketing consent.");
  }
  if (contacts.length > 2_500) throw new CrmHttpError(413, "This audience exceeds 2,500 contacts. Narrow it by status or tag.");
  const advisor = await env.DB.prepare(
    "SELECT display_name FROM hg_agent_profiles WHERE lower(email)=? AND active=1",
  ).bind(ownerEmail).first<{ display_name: string }>();
  const remote = await mailCampaignRequest<{
    campaign: { id: string } & Record<string, unknown>;
    imported: number;
    blocked: number;
    validationQueued: number;
    studioUrl: string;
  }>(env, "/internal/haus-crm/campaigns", {
    ...campaignActor(session),
    agentEmail: ownerEmail,
    agentName: advisor?.display_name || ownerEmail.split("@")[0],
    campaignName,
    subject,
    previewText,
    message,
    ctaLabel,
    ctaUrl,
    audienceFilter: { status, tag, contactId },
    contacts: contacts.map((contact) => ({
      crmContactId: contact.id,
      email: contact.email,
      fullName: contact.full_name,
      consentRecordedAt: new Date(contact.consent_recorded_at).toISOString(),
      consentSource: contact.consent_source,
      consentDetail: contact.consent_detail,
    })),
  });
  await env.DB.prepare(
    `INSERT INTO hg_crm_campaign_events
     (id, campaign_id, owner_email, actor_email, action, metadata_json)
     VALUES (?, ?, ?, ?, 'created', ?)`,
  ).bind(
    crypto.randomUUID(), remote.campaign.id, ownerEmail, session.email.toLowerCase(),
    JSON.stringify({ selected: selected.length, imported: remote.imported, blocked: remote.blocked, filter: { status, tag, contactId } }),
  ).run();
  return json(remote, 201);
}

async function campaignAction(
  request: Request,
  env: CrmEnv,
  session: CrmSession,
  campaignId: string,
  action: "test" | "send",
) {
  const payload = await readJson(request);
  const ownerEmail = await campaignOwner(request, env, session, payload);
  if (env.CAMPAIGN_DELIVERY_ENABLED !== "true") {
    throw new CrmHttpError(503, "Campaign delivery is disabled for this PSR instance.");
  }
  if (action === "send" && !isAdmin(session)) {
    throw new CrmHttpError(403, "Only an administrator can approve and queue a campaign.");
  }
  if (action === "send" && clean(payload.confirmation, 40) !== "SEND NOW") {
    throw new CrmHttpError(400, "Type SEND NOW to confirm this campaign.");
  }
  try {
    const remote = await mailCampaignRequest<{
      campaign: Record<string, unknown>;
      queued?: boolean;
      eligibleRecipients?: number;
      testRecipient?: string;
    }>(env, `/internal/haus-crm/campaigns/${action}`, {
      ...campaignActor(session),
      agentEmail: ownerEmail,
      campaignId,
      ...(action === "send" ? { confirmation: "SEND NOW" } : {}),
    });
    await campaignEventStatement(env, {
      campaignId,
      ownerEmail,
      actorEmail: session.email,
      action: action === "test" ? "test_sent" : "send_accepted",
      metadata: action === "send" ? { eligibleRecipients: remote.eligibleRecipients || 0 } : {},
    }).run();
    return json(remote, action === "send" ? 202 : 200);
  } catch (error) {
    if (action === "send") {
      await campaignEventStatement(env, {
        campaignId,
        ownerEmail,
        actorEmail: session.email,
        action: "send_failed",
        metadata: { reason: error instanceof Error ? error.message.slice(0, 300) : "Campaign send failed" },
      }).run();
    }
    throw error;
  }
}

function opportunityJson(row: OpportunityRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    ownerEmail: row.owner_email,
    title: row.title,
    kind: row.kind,
    stage: row.stage,
    estimatedValueAed: Number(row.estimated_value_aed || 0),
    probability: Number(row.probability || 0),
    projectSlug: row.project_slug,
    propertyReference: row.property_reference,
    communities: parseJsonList(row.communities_json),
    bedrooms: parseJsonList(row.bedrooms_json),
    budgetMinAed: Number(row.budget_min_aed || 0),
    budgetMaxAed: Number(row.budget_max_aed || 0),
    moveTimeline: row.move_timeline,
    nextStep: row.next_step,
    expectedCloseAt: row.expected_close_at,
    lostReason: row.lost_reason,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskJson(row: TaskRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    opportunityId: row.opportunity_id || "",
    ownerEmail: row.owner_email,
    assignedBy: row.assigned_by,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function activityJson(row: ActivityRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    opportunityId: row.opportunity_id || "",
    taskId: row.task_id || "",
    ownerEmail: row.owner_email,
    actorEmail: row.actor_email,
    type: row.type,
    subject: row.subject,
    body: row.body,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

async function resolveOwner(env: CrmEnv, session: CrmSession, requested: unknown) {
  const ownEmail = session.email.toLowerCase();
  const candidate = normalizedEmail(requested) || ownEmail;
  if (candidate === ownEmail) return candidate;
  if (!isAdmin(session)) throw new CrmHttpError(403, "Only an administrator can assign another advisor.");
  const profile = await env.DB.prepare(
    "SELECT email FROM hg_agent_profiles WHERE lower(email) = ? AND active = 1",
  ).bind(candidate).first<{ email: string }>();
  if (!profile) throw new CrmHttpError(400, "Select an active PSR advisor.");
  return profile.email.toLowerCase();
}

async function getContactRow(env: CrmEnv, session: CrmSession, id: string) {
  const row = await env.DB.prepare(
    `SELECT * FROM hg_crm_contacts
     WHERE id = ? AND (? = 1 OR owner_email = ?)`,
  ).bind(id, isAdmin(session) ? 1 : 0, session.email.toLowerCase()).first<ContactRow>();
  if (!row) throw new CrmHttpError(404, "CRM contact not found.");
  return row;
}

async function getOpportunityRow(env: CrmEnv, session: CrmSession, id: string) {
  const row = await env.DB.prepare(
    `SELECT * FROM hg_crm_opportunities
     WHERE id = ? AND (? = 1 OR owner_email = ?)`,
  ).bind(id, isAdmin(session) ? 1 : 0, session.email.toLowerCase()).first<OpportunityRow>();
  if (!row) throw new CrmHttpError(404, "CRM opportunity not found.");
  return row;
}

async function getTaskRow(env: CrmEnv, session: CrmSession, id: string) {
  const row = await env.DB.prepare(
    `SELECT * FROM hg_crm_tasks
     WHERE id = ? AND (? = 1 OR owner_email = ?)`,
  ).bind(id, isAdmin(session) ? 1 : 0, session.email.toLowerCase()).first<TaskRow>();
  if (!row) throw new CrmHttpError(404, "CRM task not found.");
  return row;
}

function activityStatement(env: CrmEnv, input: {
  contactId: string;
  ownerEmail: string;
  actorEmail: string;
  type: ActivityType;
  subject: string;
  body?: string;
  opportunityId?: string;
  taskId?: string;
  occurredAt?: string;
}) {
  return env.DB.prepare(
    `INSERT INTO hg_crm_activities
      (id, contact_id, opportunity_id, task_id, owner_email, actor_email, type, subject, body, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), CURRENT_TIMESTAMP))`,
  ).bind(
    crypto.randomUUID(),
    input.contactId,
    input.opportunityId || null,
    input.taskId || null,
    input.ownerEmail,
    input.actorEmail.toLowerCase(),
    input.type,
    clean(input.subject, 180),
    clean(input.body, 4_000),
    input.occurredAt || "",
  );
}

function auditStatement(env: CrmEnv, input: {
  actorEmail: string;
  ownerEmail: string;
  action: string;
  entityType: "contact" | "opportunity" | "task" | "activity" | "lead";
  entityId: string;
  changes?: Record<string, unknown>;
}) {
  const visibleValues = new Set([
    "status", "previousStatus", "stage", "previousStage", "kind", "estimatedValueAed",
    "probability", "priority", "clientType", "assignedTo", "ownerEmail", "contactId",
    "opportunityId", "taskId", "matchedExistingContact", "type",
  ]);
  const auditChanges = Object.fromEntries(
    Object.entries(input.changes || {}).map(([key, value]) => [key, visibleValues.has(key) ? value : true]),
  );
  return env.DB.prepare(
    `INSERT INTO hg_crm_audit_log
      (id, actor_email, owner_email, action, entity_type, entity_id, changes_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    input.actorEmail.toLowerCase(),
    input.ownerEmail,
    clean(input.action, 80),
    input.entityType,
    input.entityId,
    JSON.stringify(auditChanges),
  );
}

async function overview(request: Request, env: CrmEnv, session: CrmSession) {
  const url = new URL(request.url);
  const scope = scopeSql(url, session);
  const [contactStatuses, stages, tasks, recentActivities, unimportedLead] = await Promise.all([
    env.DB.prepare(
      `SELECT status, COUNT(*) AS count
       FROM hg_crm_contacts WHERE ${scope.clause}
       GROUP BY status ORDER BY status`,
    ).bind(...scope.bindings).all<{ status: ContactStatus; count: number }>(),
    env.DB.prepare(
      `SELECT stage, COUNT(*) AS count,
              COALESCE(SUM(estimated_value_aed), 0) AS value_aed,
              COALESCE(SUM(estimated_value_aed * probability / 100.0), 0) AS weighted_value_aed
       FROM hg_crm_opportunities WHERE ${scope.clause}
       GROUP BY stage ORDER BY stage`,
    ).bind(...scope.bindings).all<{ stage: OpportunityStage; count: number; value_aed: number; weighted_value_aed: number }>(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
         SUM(CASE WHEN status = 'open' AND due_at <> '' AND datetime(due_at) < CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS overdue,
         SUM(CASE WHEN status = 'open' AND date(due_at) = date('now') THEN 1 ELSE 0 END) AS due_today
       FROM hg_crm_tasks WHERE ${scope.clause}`,
    ).bind(...scope.bindings).first<{ total: number; open: number; overdue: number; due_today: number }>(),
    env.DB.prepare(
      `SELECT * FROM hg_crm_activities WHERE ${scope.clause}
       ORDER BY datetime(occurred_at) DESC, created_at DESC LIMIT 20`,
    ).bind(...scope.bindings).all<ActivityRow>(),
    isAdmin(session) && teamScope(url, session)
      ? env.DB.prepare(
        `SELECT COUNT(*) AS count FROM haus_grace_leads l
         LEFT JOIN hg_crm_lead_links link ON link.website_lead_id = l.id
         WHERE l.consent = 1 AND link.website_lead_id IS NULL`,
      ).first<{ count: number }>()
      : Promise.resolve(null),
  ]);

  const pipeline = stages.results.map((row) => ({
    stage: row.stage,
    count: Number(row.count || 0),
    valueAed: Number(row.value_aed || 0),
    weightedValueAed: Math.round(Number(row.weighted_value_aed || 0)),
  }));
  return json({
    scope: teamScope(url, session) ? "team" : "mine",
    contacts: Object.fromEntries(contactStatuses.results.map((row) => [row.status, Number(row.count || 0)])),
    pipeline,
    pipelineTotals: {
      openCount: pipeline.filter((row) => !["won", "lost", "archived"].includes(row.stage)).reduce((sum, row) => sum + row.count, 0),
      openValueAed: pipeline.filter((row) => !["won", "lost", "archived"].includes(row.stage)).reduce((sum, row) => sum + row.valueAed, 0),
      weightedValueAed: pipeline.filter((row) => !["won", "lost", "archived"].includes(row.stage)).reduce((sum, row) => sum + row.weightedValueAed, 0),
    },
    tasks: {
      total: Number(tasks?.total || 0),
      open: Number(tasks?.open || 0),
      overdue: Number(tasks?.overdue || 0),
      dueToday: Number(tasks?.due_today || 0),
    },
    recentActivities: recentActivities.results.map(activityJson),
    unimportedWebsiteLeads: Number(unimportedLead?.count || 0),
  });
}

async function listContacts(request: Request, env: CrmEnv, session: CrmSession) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = pageFrom(url);
  const scope = scopeSql(url, session, "c");
  const query = clean(url.searchParams.get("q"), 120);
  const requestedStatus = clean(url.searchParams.get("status"), 40);
  const status = requestedStatus ? member(requestedStatus, CRM_CONTACT_STATUSES) : "";
  const requestedType = clean(url.searchParams.get("clientType"), 40);
  const clientType = requestedType ? member(requestedType, CRM_CONTACT_TYPES) : "";
  const source = clean(url.searchParams.get("source"), 80).toLowerCase();
  const pattern = likePattern(query);
  const where = `${scope.clause}
    AND (? = '' OR c.status = ?)
    AND (? = '' OR c.client_type = ?)
    AND (? = '' OR lower(c.source) = ?)
    AND (? = '' OR c.full_name LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR c.email LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR c.phone LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR c.tags_json LIKE ? ESCAPE '\\' COLLATE NOCASE)`;
  const bindings: DbValue[] = [
    ...scope.bindings,
    status,
    status,
    clientType,
    clientType,
    source,
    source,
    query,
    pattern,
    pattern,
    pattern,
    pattern,
  ];
  const [rows, count] = await Promise.all([
    env.DB.prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM hg_crm_opportunities o
         WHERE o.contact_id = c.id AND o.stage NOT IN ('won', 'lost', 'archived')) AS open_opportunities,
        (SELECT COALESCE(SUM(estimated_value_aed), 0) FROM hg_crm_opportunities o
         WHERE o.contact_id = c.id AND o.stage NOT IN ('won', 'lost', 'archived')) AS pipeline_value_aed,
        (SELECT COALESCE(MIN(due_at), '') FROM hg_crm_tasks t
         WHERE t.contact_id = c.id AND t.status = 'open' AND t.due_at <> '') AS next_task_at
       FROM hg_crm_contacts c WHERE ${where}
       ORDER BY CASE c.status WHEN 'new' THEN 0 WHEN 'qualified' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
                datetime(c.updated_at) DESC
       LIMIT ? OFFSET ?`,
    ).bind(...bindings, pageSize, offset).all<ContactSummaryRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM hg_crm_contacts c WHERE ${where}`)
      .bind(...bindings).first<{ count: number }>(),
  ]);
  const total = Number(count?.count || 0);
  return json({
    contacts: rows.results.map(contactJson),
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

async function contactDetail(env: CrmEnv, session: CrmSession, id: string) {
  const contact = await getContactRow(env, session, id);
  const [opportunities, tasks, activities, websiteLeads] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM hg_crm_opportunities WHERE contact_id = ? ORDER BY datetime(updated_at) DESC",
    ).bind(id).all<OpportunityRow>(),
    env.DB.prepare(
      `SELECT * FROM hg_crm_tasks WHERE contact_id = ?
       ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
                CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                datetime(NULLIF(due_at, '')) ASC`,
    ).bind(id).all<TaskRow>(),
    env.DB.prepare(
      "SELECT * FROM hg_crm_activities WHERE contact_id = ? ORDER BY datetime(occurred_at) DESC, created_at DESC LIMIT 200",
    ).bind(id).all<ActivityRow>(),
    env.DB.prepare(
      `SELECT l.id, l.source, l.property_reference, l.created_at, link.imported_at
       FROM hg_crm_lead_links link JOIN haus_grace_leads l ON l.id = link.website_lead_id
       WHERE link.contact_id = ? ORDER BY datetime(link.imported_at) DESC`,
    ).bind(id).all<{ id: number; source: string; property_reference: string; created_at: string; imported_at: string }>(),
  ]);
  return {
    contact: contactJson(contact),
    opportunities: opportunities.results.map(opportunityJson),
    tasks: tasks.results.map(taskJson),
    activities: activities.results.map(activityJson),
    websiteLeads: websiteLeads.results.map((row) => ({
      id: row.id,
      source: row.source,
      propertyReference: row.property_reference || "",
      submittedAt: row.created_at,
      importedAt: row.imported_at,
    })),
  };
}

async function createContact(request: Request, env: CrmEnv, session: CrmSession) {
  const payload = await readJson(request);
  const ownerEmail = await resolveOwner(env, session, payload.ownerEmail);
  const fullName = clean(payload.fullName, 160);
  const email = normalizedEmail(payload.email);
  const phone = normalizedPhone(payload.phone);
  if (!fullName) throw new CrmHttpError(400, "Add the client's full name.");
  if (!email && !phone) throw new CrmHttpError(400, "Add an email address or contact number.");
  const duplicate = await env.DB.prepare(
    `SELECT id FROM hg_crm_contacts
     WHERE owner_email = ? AND status <> 'archived'
       AND ((? <> '' AND email = ? COLLATE NOCASE) OR (? <> '' AND phone = ?))
     LIMIT 1`,
  ).bind(ownerEmail, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new CrmHttpError(409, "A CRM contact with this email or phone already exists for the advisor.");

  const id = crypto.randomUUID();
  const clientType = member(payload.clientType, CRM_CONTACT_TYPES, "buyer");
  const status = member(payload.status, CRM_CONTACT_STATUSES, "new");
  const consentStatus = member(payload.consentStatus, ["unknown", "granted", "withdrawn"] as const, "unknown");
  const consentRecordedAt = consentStatus === "granted" ? normalizedDate(payload.consentRecordedAt, "consent date") : "";
  const consentSource = consentStatus === "granted" ? clean(payload.consentSource, 180) : "";
  const consentDetail = consentStatus === "granted" ? clean(payload.consentDetail, 600) : "";
  if (consentStatus === "granted" && (!consentRecordedAt || !consentSource || consentDetail.length < 12)) {
    throw new CrmHttpError(400, "Record when, where and how this client granted marketing consent.");
  }
  const tags = stringList(payload.tags, 20, 48);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO hg_crm_contacts
        (id, owner_email, created_by, full_name, email, phone, nationality, preferred_language,
         client_type, source, status, consent_status, consent_recorded_at, consent_source,
         consent_detail, tags_json, notes, last_contact_at, next_follow_up_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      ownerEmail,
      session.email.toLowerCase(),
      fullName,
      email,
      phone,
      clean(payload.nationality, 80),
      clean(payload.preferredLanguage, 80),
      clientType,
      clean(payload.source, 120) || "manual",
      status,
      consentStatus,
      consentRecordedAt,
      consentSource,
      consentDetail,
      JSON.stringify(tags),
      clean(payload.notes, 8_000),
      normalizedDate(payload.lastContactAt, "last contact date"),
      normalizedDate(payload.nextFollowUpAt, "next follow-up date"),
    ),
    activityStatement(env, {
      contactId: id,
      ownerEmail,
      actorEmail: session.email,
      type: "system",
      subject: "CRM contact created",
      body: `Contact created with ${status} status.`,
    }),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail,
      action: "contact.created",
      entityType: "contact",
      entityId: id,
      changes: { status, clientType, assignedTo: ownerEmail },
    }),
  ]);
  return json(await contactDetail(env, session, id), 201);
}

async function updateContact(request: Request, env: CrmEnv, session: CrmSession, id: string) {
  const current = await getContactRow(env, session, id);
  const payload = await readJson(request);
  const assignments: string[] = [];
  const values: DbValue[] = [];
  const changed: Record<string, unknown> = {};
  const set = (column: string, value: DbValue, publicName = column) => {
    assignments.push(`${column} = ?`);
    values.push(value);
    changed[publicName] = value;
  };

  let finalEmail = current.email;
  let finalPhone = current.phone;
  let ownerEmail = current.owner_email;
  if (has(payload, "ownerEmail")) {
    ownerEmail = await resolveOwner(env, session, payload.ownerEmail);
    if (ownerEmail !== current.owner_email) set("owner_email", ownerEmail, "ownerEmail");
  }
  if (has(payload, "fullName")) {
    const value = clean(payload.fullName, 160);
    if (!value) throw new CrmHttpError(400, "Add the client's full name.");
    set("full_name", value, "fullName");
  }
  if (has(payload, "email")) {
    finalEmail = normalizedEmail(payload.email);
    set("email", finalEmail);
  }
  if (has(payload, "phone")) {
    finalPhone = normalizedPhone(payload.phone);
    set("phone", finalPhone);
  }
  if (!finalEmail && !finalPhone) throw new CrmHttpError(400, "Keep an email address or contact number on the contact.");
  if (has(payload, "nationality")) set("nationality", clean(payload.nationality, 80));
  if (has(payload, "preferredLanguage")) set("preferred_language", clean(payload.preferredLanguage, 80), "preferredLanguage");
  if (has(payload, "clientType")) set("client_type", member(payload.clientType, CRM_CONTACT_TYPES), "clientType");
  const nextStatus = has(payload, "status")
    ? member(payload.status, CRM_CONTACT_STATUSES)
    : current.status;
  if (has(payload, "status")) set("status", nextStatus);
  const nextConsentStatus = has(payload, "consentStatus")
    ? member(payload.consentStatus, ["unknown", "granted", "withdrawn"] as const)
    : current.consent_status;
  const nextConsentRecordedAt = has(payload, "consentRecordedAt")
    ? normalizedDate(payload.consentRecordedAt, "consent date")
    : current.consent_recorded_at;
  const nextConsentSource = has(payload, "consentSource") ? clean(payload.consentSource, 180) : current.consent_source;
  const nextConsentDetail = has(payload, "consentDetail") ? clean(payload.consentDetail, 600) : current.consent_detail;
  if (nextConsentStatus === "granted" && (!nextConsentRecordedAt || !nextConsentSource || nextConsentDetail.length < 12)) {
    throw new CrmHttpError(400, "Record when, where and how this client granted marketing consent.");
  }
  if (has(payload, "consentStatus")) set("consent_status", nextConsentStatus, "consentStatus");
  if (has(payload, "consentRecordedAt")) set("consent_recorded_at", nextConsentRecordedAt, "consentRecordedAt");
  if (has(payload, "consentSource")) set("consent_source", nextConsentSource, "consentSource");
  if (has(payload, "consentDetail")) set("consent_detail", nextConsentDetail, "consentDetail");
  if (has(payload, "tags")) set("tags_json", JSON.stringify(stringList(payload.tags, 20, 48)), "tags");
  if (has(payload, "notes")) set("notes", clean(payload.notes, 8_000));
  if (has(payload, "lastContactAt")) set("last_contact_at", normalizedDate(payload.lastContactAt, "last contact date"), "lastContactAt");
  if (has(payload, "nextFollowUpAt")) set("next_follow_up_at", normalizedDate(payload.nextFollowUpAt, "next follow-up date"), "nextFollowUpAt");
  if (!assignments.length) throw new CrmHttpError(400, "No CRM contact changes were supplied.");

  if (finalEmail !== current.email || finalPhone !== current.phone || ownerEmail !== current.owner_email) {
    const duplicate = await env.DB.prepare(
      `SELECT id FROM hg_crm_contacts
       WHERE id <> ? AND owner_email = ? AND status <> 'archived'
         AND ((? <> '' AND email = ? COLLATE NOCASE) OR (? <> '' AND phone = ?))
       LIMIT 1`,
    ).bind(id, ownerEmail, finalEmail, finalEmail, finalPhone, finalPhone).first<{ id: string }>();
    if (duplicate) throw new CrmHttpError(409, "Another CRM contact with this email or phone already exists for the advisor.");
  }

  if (current.email) {
    if (nextConsentStatus === "withdrawn" && current.consent_status !== "withdrawn") {
      await syncCampaignContactState(env, session, current, "withdrawn", "Marketing consent withdrawn in the advisor CRM");
    } else if (
      nextConsentStatus === "granted"
      && current.consent_status === "withdrawn"
      && finalEmail === current.email
      && !["lost", "archived"].includes(nextStatus)
    ) {
      await syncCampaignContactState(env, session, current, "active", "Fresh marketing consent recorded in the advisor CRM", {
        recordedAt: nextConsentRecordedAt,
        source: nextConsentSource,
        detail: nextConsentDetail,
      });
    } else if (
      finalEmail !== current.email
      || ownerEmail !== current.owner_email
      || (current.consent_status === "granted" && nextConsentStatus !== "granted")
      || (!["lost", "archived"].includes(current.status) && ["lost", "archived"].includes(nextStatus))
    ) {
      await syncCampaignContactState(env, session, current, "blocked", "Contact is no longer eligible for the advisor's existing CRM campaign audiences");
    }
  }

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `UPDATE hg_crm_contacts SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(...values, id),
  ];
  if (ownerEmail !== current.owner_email) {
    statements.push(
      env.DB.prepare("UPDATE hg_crm_opportunities SET owner_email = ?, updated_at = CURRENT_TIMESTAMP WHERE contact_id = ?").bind(ownerEmail, id),
      env.DB.prepare("UPDATE hg_crm_tasks SET owner_email = ?, updated_at = CURRENT_TIMESTAMP WHERE contact_id = ?").bind(ownerEmail, id),
      env.DB.prepare("UPDATE hg_crm_activities SET owner_email = ? WHERE contact_id = ?").bind(ownerEmail, id),
    );
  }
  if (changed.status && changed.status !== current.status) {
    statements.push(activityStatement(env, {
      contactId: id,
      ownerEmail,
      actorEmail: session.email,
      type: "status_change",
      subject: `Contact status changed to ${String(changed.status)}`,
      body: `Previous status: ${current.status}.`,
    }));
  }
  statements.push(auditStatement(env, {
    actorEmail: session.email,
    ownerEmail,
    action: "contact.updated",
    entityType: "contact",
    entityId: id,
    changes: changed,
  }));
  await env.DB.batch(statements);
  return json(await contactDetail(env, session, id));
}

async function sendLeadEmail(request: Request, env: CrmEnv, session: CrmSession, id: string) {
  const contact = await getContactRow(env, session, id);
  if (!env.EMAIL) throw new CrmHttpError(503, "Client email delivery is not active yet.");
  if (!contact.email) throw new CrmHttpError(409, "Add a client email address before sending an email.");
  if (["lost", "archived"].includes(contact.status)) throw new CrmHttpError(409, "Restore this lead before sending a client email.");

  const payload = await readJson(request);
  const subject = clean(payload.subject, 200);
  const message = clean(payload.message, 3_500);
  if (subject.length < 2) throw new CrmHttpError(400, "Add an email subject.");
  if (message.length < 2) throw new CrmHttpError(400, "Write a useful email message.");

  const projectSlug = clean(payload.projectSlug, 180);
  const project = projectSlug
    ? getProjectRegistry().projects.find((candidate) => candidate.slug === projectSlug && !candidate.archived)
    : undefined;
  if (projectSlug && !project) throw new CrmHttpError(400, "Choose an active PSR project before sharing it.");

  const senderEmail = session.email.toLowerCase();
  const senderName = clean(session.name, 100) || "PSR Homes";
  const projectUrl = project ? `${new URL(request.url).origin}/projects/${encodeURIComponent(project.slug)}` : "";
  const projectBlock = project
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(projectUrl)}" style="display:inline-block;border:1px solid #bda06a;padding:12px 16px;color:#f4e6c4;text-decoration:none">View ${escapeHtml(project.name)}</a></p><p style="color:#aeb4bd;font-size:13px;line-height:1.55">${escapeHtml([project.developerDisplay || project.developer, project.area, project.emirate].filter(Boolean).join(" · "))}</p>`
    : "";
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

  try {
    await env.EMAIL.send({
      to: contact.email,
      from: { email: senderEmail, name: `${senderName} | PSR` },
      replyTo: senderEmail,
      subject,
      html: `<div style="margin:0;padding:38px;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;background:#1b1e24;border-top:4px solid #bda06a;padding:42px"><p style="color:#c8cdd5;font-size:11px;letter-spacing:2px">PSR HOMES · PRIVATE CLIENT UPDATE</p><p style="font-size:16px;line-height:1.75">${safeMessage}</p>${projectBlock}<p style="margin-top:32px;color:#aeb4bd;line-height:1.6">${escapeHtml(senderName)}<br>${escapeHtml(senderEmail)}<br>PSR Homes</p></div></div>`,
      text: `${message}${project ? `\n\nView ${project.name}: ${projectUrl}` : ""}\n\n${senderName}\n${senderEmail}\nPSR Homes`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 300) : "Email delivery failed";
    throw new CrmHttpError(502, `The client email could not be sent: ${reason}`);
  }

  await env.DB.batch([
    activityStatement(env, {
      contactId: id,
      ownerEmail: contact.owner_email,
      actorEmail: session.email,
      type: "email",
      subject: `Email sent: ${subject}`,
      body: `To: ${contact.email}${project ? `\nProject shared: ${project.name} (${projectUrl})` : ""}\n\n${message}`,
    }),
    env.DB.prepare(
      "UPDATE hg_crm_contacts SET last_contact_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(id),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail: contact.owner_email,
      action: "contact.email_sent",
      entityType: "contact",
      entityId: id,
      changes: { projectSlug: project?.slug || "", recipient: contact.email },
    }),
  ]);
  return json({ ok: true, recipient: contact.email, project: project ? { slug: project.slug, name: project.name } : null });
}

async function archiveContact(env: CrmEnv, session: CrmSession, id: string) {
  const current = await getContactRow(env, session, id);
  if (current.status === "archived") return json({ ok: true, contact: contactJson(current) });
  await syncCampaignContactState(env, session, current, "blocked", "Contact archived in the advisor CRM");
  await env.DB.batch([
    env.DB.prepare("UPDATE hg_crm_contacts SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
    env.DB.prepare("UPDATE hg_crm_opportunities SET stage = 'archived', probability = 0, updated_at = CURRENT_TIMESTAMP WHERE contact_id = ? AND stage NOT IN ('won', 'lost', 'archived')").bind(id),
    env.DB.prepare("UPDATE hg_crm_tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE contact_id = ? AND status = 'open'").bind(id),
    activityStatement(env, {
      contactId: id,
      ownerEmail: current.owner_email,
      actorEmail: session.email,
      type: "status_change",
      subject: "Contact archived",
    }),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail: current.owner_email,
      action: "contact.archived",
      entityType: "contact",
      entityId: id,
      changes: { previousStatus: current.status },
    }),
  ]);
  return json({ ok: true, ...(await contactDetail(env, session, id)) });
}

async function importWebsiteLead(request: Request, env: CrmEnv, session: CrmSession) {
  if (!isAdmin(session)) throw new CrmHttpError(403, "Only an administrator can assign website leads.");
  const payload = await readJson(request);
  const leadId = boundedInteger(payload.leadId, "Lead ID", 1, 2_147_483_647);
  const lead = await env.DB.prepare(
    `SELECT id, name, email, phone, message, source, property_reference, consent, created_at
     FROM haus_grace_leads WHERE id = ?`,
  ).bind(leadId).first<LeadRow>();
  if (!lead) throw new CrmHttpError(404, "Website lead not found.");
  if (!lead.consent) throw new CrmHttpError(409, "This website lead has not provided contact consent.");

  const existingLink = await env.DB.prepare(
    `SELECT link.contact_id, c.owner_email
     FROM hg_crm_lead_links link JOIN hg_crm_contacts c ON c.id = link.contact_id
     WHERE link.website_lead_id = ?`,
  ).bind(leadId).first<{ contact_id: string; owner_email: string }>();
  if (existingLink) {
    if (!isAdmin(session) && existingLink.owner_email !== session.email.toLowerCase()) {
      throw new CrmHttpError(409, "This website lead has already been assigned.");
    }
    return json({ imported: false, alreadyImported: true, ...(await contactDetail(env, session, existingLink.contact_id)) });
  }

  const ownerEmail = await resolveOwner(env, session, payload.ownerEmail);
  const email = normalizedEmail(lead.email);
  const phone = normalizedPhone(lead.phone);
  let contact = await env.DB.prepare(
    `SELECT * FROM hg_crm_contacts
     WHERE owner_email = ? AND status <> 'archived'
       AND ((? <> '' AND email = ? COLLATE NOCASE) OR (? <> '' AND phone = ?))
     ORDER BY datetime(updated_at) DESC LIMIT 1`,
  ).bind(ownerEmail, email, email, phone, phone).first<ContactRow>();
  const contactId = contact?.id || crypto.randomUUID();
  const opportunityId = crypto.randomUUID();
  const title = clean(payload.opportunityTitle, 180)
    || (lead.property_reference ? `${lead.name} — ${lead.property_reference}` : `${lead.name} enquiry`);
  const statements: D1PreparedStatement[] = [];
  if (!contact) {
    statements.push(env.DB.prepare(
      `INSERT INTO hg_crm_contacts
        (id, owner_email, created_by, full_name, email, phone, client_type, source, status,
         consent_status, consent_recorded_at, consent_source, consent_detail, notes, next_follow_up_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', 'granted', ?, ?, ?, ?, ?)`,
    ).bind(
      contactId,
      ownerEmail,
      session.email.toLowerCase(),
      clean(lead.name, 160) || "Website lead",
      email,
      phone,
      member(payload.clientType, CRM_CONTACT_TYPES, "buyer"),
      `website:${clean(lead.source, 100) || "lead"}`,
      normalizedDate(lead.created_at, "lead submission date"),
      `website:${clean(lead.source, 100) || "lead"}`,
      `Explicit consent captured on PSR website lead #${lead.id}.`,
      clean(lead.message, 8_000),
      normalizedDate(payload.nextFollowUpAt, "next follow-up date"),
    ));
  }
  statements.push(
    env.DB.prepare(
      "INSERT INTO hg_crm_lead_links (website_lead_id, contact_id, imported_by) VALUES (?, ?, ?)",
    ).bind(leadId, contactId, session.email.toLowerCase()),
    env.DB.prepare(
      `INSERT INTO hg_crm_opportunities
        (id, contact_id, owner_email, title, kind, stage, project_slug, property_reference, notes)
       VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
    ).bind(
      opportunityId,
      contactId,
      ownerEmail,
      title,
      member(payload.kind, CRM_OPPORTUNITY_KINDS, "purchase"),
      clean(lead.property_reference, 180),
      clean(lead.property_reference, 180),
      clean(lead.message, 8_000),
    ),
    activityStatement(env, {
      contactId,
      opportunityId,
      ownerEmail,
      actorEmail: session.email,
      type: "lead_import",
      subject: `Website lead ${leadId} imported`,
      body: clean(lead.message, 4_000),
      occurredAt: normalizedDate(lead.created_at, "lead submission date"),
    }),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail,
      action: "lead.imported",
      entityType: "lead",
      entityId: String(leadId),
      changes: { contactId, opportunityId, matchedExistingContact: Boolean(contact) },
    }),
  );
  await env.DB.batch(statements);
  contact = await getContactRow(env, session, contactId);
  return json({ imported: true, matchedExistingContact: statements.length === 4, ...(await contactDetail(env, session, contact.id)) }, 201);
}

async function listOpportunities(request: Request, env: CrmEnv, session: CrmSession) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = pageFrom(url);
  const scope = scopeSql(url, session, "o");
  const stageValue = clean(url.searchParams.get("stage"), 40);
  const stage = stageValue ? member(stageValue, CRM_OPPORTUNITY_STAGES) : "";
  const contactId = clean(url.searchParams.get("contactId"), 64);
  const source = clean(url.searchParams.get("source"), 80).toLowerCase();
  const query = clean(url.searchParams.get("q"), 120);
  const pattern = likePattern(query);
  const where = `${scope.clause}
    AND (? = '' OR o.stage = ?)
    AND (? = '' OR o.contact_id = ?)
    AND (? = '' OR lower(c.source) = ?)
    AND (? = '' OR o.title LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR o.project_slug LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR o.property_reference LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR c.full_name LIKE ? ESCAPE '\\' COLLATE NOCASE)`;
  const bindings: DbValue[] = [...scope.bindings, stage, stage, contactId, contactId, source, source, query, pattern, pattern, pattern, pattern];
  const [rows, count] = await Promise.all([
    env.DB.prepare(
      `SELECT o.* FROM hg_crm_opportunities o
       JOIN hg_crm_contacts c ON c.id = o.contact_id
       WHERE ${where}
       ORDER BY CASE o.stage WHEN 'negotiation' THEN 0 WHEN 'reservation' THEN 1 WHEN 'viewing' THEN 2 ELSE 3 END,
                datetime(o.updated_at) DESC LIMIT ? OFFSET ?`,
    ).bind(...bindings, pageSize, offset).all<OpportunityRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count FROM hg_crm_opportunities o
       JOIN hg_crm_contacts c ON c.id = o.contact_id WHERE ${where}`,
    ).bind(...bindings).first<{ count: number }>(),
  ]);
  const total = Number(count?.count || 0);
  return json({ opportunities: rows.results.map(opportunityJson), page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) });
}

function opportunityInput(payload: Record<string, unknown>, partial = false) {
  const title = has(payload, "title") ? clean(payload.title, 180) : undefined;
  if (!partial && !title) throw new CrmHttpError(400, "Add an opportunity title.");
  if (partial && has(payload, "title") && !title) throw new CrmHttpError(400, "Add an opportunity title.");
  const budgetMin = has(payload, "budgetMinAed") ? boundedInteger(payload.budgetMinAed, "Minimum budget", 0, 2_000_000_000) : undefined;
  const budgetMax = has(payload, "budgetMaxAed") ? boundedInteger(payload.budgetMaxAed, "Maximum budget", 0, 2_000_000_000) : undefined;
  if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > 0 && budgetMax > 0 && budgetMax < budgetMin) {
    throw new CrmHttpError(400, "Maximum budget must not be lower than minimum budget.");
  }
  return {
    title,
    kind: has(payload, "kind") || !partial ? member(payload.kind, CRM_OPPORTUNITY_KINDS, "purchase") : undefined,
    stage: has(payload, "stage") || !partial ? member(payload.stage, CRM_OPPORTUNITY_STAGES, "new") : undefined,
    estimatedValueAed: has(payload, "estimatedValueAed") ? boundedInteger(payload.estimatedValueAed, "Estimated value", 0, 2_000_000_000) : partial ? undefined : 0,
    probability: has(payload, "probability") ? boundedInteger(payload.probability, "Probability", 0, 100) : partial ? undefined : 10,
    projectSlug: has(payload, "projectSlug") ? clean(payload.projectSlug, 180) : partial ? undefined : "",
    propertyReference: has(payload, "propertyReference") ? clean(payload.propertyReference, 180) : partial ? undefined : "",
    communities: has(payload, "communities") ? stringList(payload.communities, 12, 100) : partial ? undefined : [],
    bedrooms: has(payload, "bedrooms") ? stringList(payload.bedrooms, 12, 40) : partial ? undefined : [],
    budgetMinAed: budgetMin ?? (partial ? undefined : 0),
    budgetMaxAed: budgetMax ?? (partial ? undefined : 0),
    moveTimeline: has(payload, "moveTimeline") ? clean(payload.moveTimeline, 120) : partial ? undefined : "",
    nextStep: has(payload, "nextStep") ? clean(payload.nextStep, 1_000) : partial ? undefined : "",
    expectedCloseAt: has(payload, "expectedCloseAt") ? normalizedDate(payload.expectedCloseAt, "expected close date") : partial ? undefined : "",
    lostReason: has(payload, "lostReason") ? clean(payload.lostReason, 1_000) : partial ? undefined : "",
    notes: has(payload, "notes") ? clean(payload.notes, 8_000) : partial ? undefined : "",
  };
}

async function createOpportunity(request: Request, env: CrmEnv, session: CrmSession) {
  const payload = await readJson(request);
  const contactId = clean(payload.contactId, 64);
  if (!contactId) throw new CrmHttpError(400, "Select a CRM contact.");
  const contact = await getContactRow(env, session, contactId);
  if (contact.status === "archived") throw new CrmHttpError(409, "Restore the contact before adding an opportunity.");
  const input = opportunityInput(payload);
  const id = crypto.randomUUID();
  const stage = input.stage as OpportunityStage;
  const probability = stage === "won" ? 100 : ["lost", "archived"].includes(stage) ? 0 : input.probability as number;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO hg_crm_opportunities
        (id, contact_id, owner_email, title, kind, stage, estimated_value_aed, probability,
         project_slug, property_reference, communities_json, bedrooms_json, budget_min_aed,
         budget_max_aed, move_timeline, next_step, expected_close_at, lost_reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      contactId,
      contact.owner_email,
      input.title as string,
      input.kind as OpportunityKind,
      stage,
      input.estimatedValueAed as number,
      probability,
      input.projectSlug as string,
      input.propertyReference as string,
      JSON.stringify(input.communities),
      JSON.stringify(input.bedrooms),
      input.budgetMinAed as number,
      input.budgetMaxAed as number,
      input.moveTimeline as string,
      input.nextStep as string,
      input.expectedCloseAt as string,
      input.lostReason as string,
      input.notes as string,
    ),
    activityStatement(env, {
      contactId,
      opportunityId: id,
      ownerEmail: contact.owner_email,
      actorEmail: session.email,
      type: "status_change",
      subject: `Opportunity created at ${stage}`,
      body: input.title,
    }),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail: contact.owner_email,
      action: "opportunity.created",
      entityType: "opportunity",
      entityId: id,
      changes: { contactId, stage, kind: input.kind, estimatedValueAed: input.estimatedValueAed },
    }),
  ]);
  const created = await getOpportunityRow(env, session, id);
  return json({ opportunity: opportunityJson(created) }, 201);
}

async function updateOpportunity(request: Request, env: CrmEnv, session: CrmSession, id: string) {
  const current = await getOpportunityRow(env, session, id);
  const payload = await readJson(request);
  const input = opportunityInput(payload, true);
  const assignments: string[] = [];
  const values: DbValue[] = [];
  const changes: Record<string, unknown> = {};
  const fields: Array<[keyof typeof input, string, boolean?]> = [
    ["title", "title"], ["kind", "kind"], ["stage", "stage"],
    ["estimatedValueAed", "estimated_value_aed"], ["probability", "probability"],
    ["projectSlug", "project_slug"], ["propertyReference", "property_reference"],
    ["communities", "communities_json", true], ["bedrooms", "bedrooms_json", true],
    ["budgetMinAed", "budget_min_aed"], ["budgetMaxAed", "budget_max_aed"],
    ["moveTimeline", "move_timeline"], ["nextStep", "next_step"],
    ["expectedCloseAt", "expected_close_at"], ["lostReason", "lost_reason"], ["notes", "notes"],
  ];
  for (const [key, column, stringify] of fields) {
    let value = input[key];
    if (value === undefined) continue;
    if (key === "stage" && value === "won") input.probability = 100;
    if (key === "stage" && ["lost", "archived"].includes(String(value))) input.probability = 0;
    if (stringify) value = JSON.stringify(value);
    assignments.push(`${column} = ?`);
    values.push(value as DbValue);
    changes[key] = stringify ? JSON.parse(value as string) : value;
  }
  if (input.stage !== undefined && input.probability !== undefined && !has(payload, "probability")) {
    const probabilityIndex = assignments.indexOf("probability = ?");
    if (probabilityIndex < 0) {
      assignments.push("probability = ?");
      values.push(input.probability);
      changes.probability = input.probability;
    }
  }
  const finalMin = input.budgetMinAed ?? current.budget_min_aed;
  const finalMax = input.budgetMaxAed ?? current.budget_max_aed;
  if (finalMin > 0 && finalMax > 0 && finalMax < finalMin) throw new CrmHttpError(400, "Maximum budget must not be lower than minimum budget.");
  if (!assignments.length) throw new CrmHttpError(400, "No opportunity changes were supplied.");

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE hg_crm_opportunities SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id),
  ];
  if (input.stage && input.stage !== current.stage) {
    statements.push(activityStatement(env, {
      contactId: current.contact_id,
      opportunityId: id,
      ownerEmail: current.owner_email,
      actorEmail: session.email,
      type: "status_change",
      subject: `Opportunity moved to ${input.stage}`,
      body: `Previous stage: ${current.stage}.`,
    }));
    if (input.stage === "won") {
      statements.push(env.DB.prepare(
        "UPDATE hg_crm_contacts SET status = 'won', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(current.contact_id));
    }
  }
  statements.push(auditStatement(env, {
    actorEmail: session.email,
    ownerEmail: current.owner_email,
    action: "opportunity.updated",
    entityType: "opportunity",
    entityId: id,
    changes,
  }));
  await env.DB.batch(statements);
  return json({ opportunity: opportunityJson(await getOpportunityRow(env, session, id)) });
}

async function archiveOpportunity(env: CrmEnv, session: CrmSession, id: string) {
  const current = await getOpportunityRow(env, session, id);
  if (current.stage !== "archived") {
    await env.DB.batch([
      env.DB.prepare("UPDATE hg_crm_opportunities SET stage = 'archived', probability = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
      activityStatement(env, {
        contactId: current.contact_id,
        opportunityId: id,
        ownerEmail: current.owner_email,
        actorEmail: session.email,
        type: "status_change",
        subject: "Opportunity archived",
        body: `Previous stage: ${current.stage}.`,
      }),
      auditStatement(env, {
        actorEmail: session.email,
        ownerEmail: current.owner_email,
        action: "opportunity.archived",
        entityType: "opportunity",
        entityId: id,
        changes: { previousStage: current.stage },
      }),
    ]);
  }
  return json({ ok: true, opportunity: opportunityJson(await getOpportunityRow(env, session, id)) });
}

async function listTasks(request: Request, env: CrmEnv, session: CrmSession) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = pageFrom(url);
  const scope = scopeSql(url, session, "t");
  const statusValue = clean(url.searchParams.get("status"), 40);
  const status = statusValue ? member(statusValue, CRM_TASK_STATUSES) : "";
  const contactId = clean(url.searchParams.get("contactId"), 64);
  const due = clean(url.searchParams.get("due"), 20);
  if (due && !["overdue", "today", "upcoming"].includes(due)) throw new CrmHttpError(400, "Unsupported task due-date filter.");
  const dueClause = due === "overdue"
    ? "AND t.due_at <> '' AND datetime(t.due_at) < CURRENT_TIMESTAMP"
    : due === "today"
      ? "AND date(t.due_at) = date('now')"
      : due === "upcoming"
        ? "AND t.due_at <> '' AND datetime(t.due_at) >= CURRENT_TIMESTAMP"
        : "";
  const where = `${scope.clause} AND (? = '' OR t.status = ?) AND (? = '' OR t.contact_id = ?) ${dueClause}`;
  const bindings: DbValue[] = [...scope.bindings, status, status, contactId, contactId];
  const [rows, count] = await Promise.all([
    env.DB.prepare(
      `SELECT t.* FROM hg_crm_tasks t WHERE ${where}
       ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
                CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                CASE WHEN t.due_at = '' THEN 1 ELSE 0 END,
                datetime(t.due_at) ASC LIMIT ? OFFSET ?`,
    ).bind(...bindings, pageSize, offset).all<TaskRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM hg_crm_tasks t WHERE ${where}`).bind(...bindings).first<{ count: number }>(),
  ]);
  const total = Number(count?.count || 0);
  return json({ tasks: rows.results.map(taskJson), page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) });
}

async function createTask(request: Request, env: CrmEnv, session: CrmSession) {
  const payload = await readJson(request);
  const contactId = clean(payload.contactId, 64);
  const opportunityId = clean(payload.opportunityId, 64);
  const title = clean(payload.title, 180);
  if (!contactId) throw new CrmHttpError(400, "Select a CRM contact.");
  if (!title) throw new CrmHttpError(400, "Add a task title.");
  const contact = await getContactRow(env, session, contactId);
  if (opportunityId) {
    const opportunity = await getOpportunityRow(env, session, opportunityId);
    if (opportunity.contact_id !== contactId) throw new CrmHttpError(400, "The opportunity does not belong to this contact.");
  }
  const id = crypto.randomUUID();
  const priority = member(payload.priority, CRM_TASK_PRIORITIES, "normal");
  const dueAt = normalizedDate(payload.dueAt, "task due date");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO hg_crm_tasks
        (id, contact_id, opportunity_id, owner_email, assigned_by, title, notes, due_at, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, contactId, opportunityId || null, contact.owner_email, session.email.toLowerCase(), title, clean(payload.notes, 4_000), dueAt, priority),
    activityStatement(env, {
      contactId,
      opportunityId: opportunityId || undefined,
      taskId: id,
      ownerEmail: contact.owner_email,
      actorEmail: session.email,
      type: "system",
      subject: `Task created: ${title}`,
      body: dueAt ? `Due ${dueAt}.` : "No due date set.",
    }),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail: contact.owner_email,
      action: "task.created",
      entityType: "task",
      entityId: id,
      changes: { contactId, opportunityId, priority, dueAt },
    }),
  ]);
  return json({ task: taskJson(await getTaskRow(env, session, id)) }, 201);
}

async function updateTask(request: Request, env: CrmEnv, session: CrmSession, id: string) {
  const current = await getTaskRow(env, session, id);
  const payload = await readJson(request);
  const assignments: string[] = [];
  const values: DbValue[] = [];
  const changes: Record<string, unknown> = {};
  const set = (column: string, value: DbValue, key: string) => {
    assignments.push(`${column} = ?`);
    values.push(value);
    changes[key] = value;
  };
  if (has(payload, "title")) {
    const title = clean(payload.title, 180);
    if (!title) throw new CrmHttpError(400, "Add a task title.");
    set("title", title, "title");
  }
  if (has(payload, "notes")) set("notes", clean(payload.notes, 4_000), "notes");
  if (has(payload, "dueAt")) set("due_at", normalizedDate(payload.dueAt, "task due date"), "dueAt");
  if (has(payload, "priority")) set("priority", member(payload.priority, CRM_TASK_PRIORITIES), "priority");
  let status: TaskStatus | undefined;
  if (has(payload, "status")) {
    status = member(payload.status, CRM_TASK_STATUSES);
    set("status", status, "status");
    set("completed_at", status === "completed" ? new Date().toISOString() : "", "completedAt");
  }
  if (!assignments.length) throw new CrmHttpError(400, "No task changes were supplied.");
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE hg_crm_tasks SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id),
  ];
  if (status === "completed" && current.status !== "completed") {
    statements.push(activityStatement(env, {
      contactId: current.contact_id,
      opportunityId: current.opportunity_id || undefined,
      taskId: id,
      ownerEmail: current.owner_email,
      actorEmail: session.email,
      type: "task_completed",
      subject: `Task completed: ${current.title}`,
    }));
  }
  statements.push(auditStatement(env, {
    actorEmail: session.email,
    ownerEmail: current.owner_email,
    action: "task.updated",
    entityType: "task",
    entityId: id,
    changes,
  }));
  await env.DB.batch(statements);
  return json({ task: taskJson(await getTaskRow(env, session, id)) });
}

async function cancelTask(env: CrmEnv, session: CrmSession, id: string) {
  const current = await getTaskRow(env, session, id);
  if (current.status !== "cancelled") {
    await env.DB.batch([
      env.DB.prepare("UPDATE hg_crm_tasks SET status = 'cancelled', completed_at = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
      activityStatement(env, {
        contactId: current.contact_id,
        opportunityId: current.opportunity_id || undefined,
        taskId: id,
        ownerEmail: current.owner_email,
        actorEmail: session.email,
        type: "system",
        subject: `Task cancelled: ${current.title}`,
      }),
      auditStatement(env, {
        actorEmail: session.email,
        ownerEmail: current.owner_email,
        action: "task.cancelled",
        entityType: "task",
        entityId: id,
        changes: { previousStatus: current.status },
      }),
    ]);
  }
  return json({ ok: true, task: taskJson(await getTaskRow(env, session, id)) });
}

async function listActivities(request: Request, env: CrmEnv, session: CrmSession) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = pageFrom(url);
  const scope = scopeSql(url, session, "a");
  const contactId = clean(url.searchParams.get("contactId"), 64);
  const typeValue = clean(url.searchParams.get("type"), 40);
  const type = typeValue ? member(typeValue, CRM_ACTIVITY_TYPES) : "";
  const where = `${scope.clause} AND (? = '' OR a.contact_id = ?) AND (? = '' OR a.type = ?)`;
  const bindings: DbValue[] = [...scope.bindings, contactId, contactId, type, type];
  const [rows, count] = await Promise.all([
    env.DB.prepare(
      `SELECT a.* FROM hg_crm_activities a WHERE ${where}
       ORDER BY datetime(a.occurred_at) DESC, a.created_at DESC LIMIT ? OFFSET ?`,
    ).bind(...bindings, pageSize, offset).all<ActivityRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM hg_crm_activities a WHERE ${where}`).bind(...bindings).first<{ count: number }>(),
  ]);
  const total = Number(count?.count || 0);
  return json({ activities: rows.results.map(activityJson), page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) });
}

async function createActivity(request: Request, env: CrmEnv, session: CrmSession) {
  const payload = await readJson(request);
  const contactId = clean(payload.contactId, 64);
  const opportunityId = clean(payload.opportunityId, 64);
  const taskId = clean(payload.taskId, 64);
  const subject = clean(payload.subject, 180);
  if (!contactId) throw new CrmHttpError(400, "Select a CRM contact.");
  if (!subject) throw new CrmHttpError(400, "Add an activity subject.");
  const contact = await getContactRow(env, session, contactId);
  if (opportunityId) {
    const opportunity = await getOpportunityRow(env, session, opportunityId);
    if (opportunity.contact_id !== contactId) throw new CrmHttpError(400, "The opportunity does not belong to this contact.");
  }
  if (taskId) {
    const task = await getTaskRow(env, session, taskId);
    if (task.contact_id !== contactId) throw new CrmHttpError(400, "The task does not belong to this contact.");
  }
  const id = crypto.randomUUID();
  const type = member(payload.type, CRM_MANUAL_ACTIVITY_TYPES, "note");
  const occurredAt = normalizedDate(payload.occurredAt, "activity date");
  const updatesContact = ["call", "email", "whatsapp", "meeting", "viewing"].includes(type);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO hg_crm_activities
        (id, contact_id, opportunity_id, task_id, owner_email, actor_email, type, subject, body, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), CURRENT_TIMESTAMP))`,
    ).bind(
      id,
      contactId,
      opportunityId || null,
      taskId || null,
      contact.owner_email,
      session.email.toLowerCase(),
      type,
      subject,
      clean(payload.body, 4_000),
      occurredAt,
    ),
    auditStatement(env, {
      actorEmail: session.email,
      ownerEmail: contact.owner_email,
      action: "activity.created",
      entityType: "activity",
      entityId: id,
      changes: { contactId, opportunityId, taskId, type },
    }),
  ];
  if (updatesContact) {
    statements.push(env.DB.prepare(
      `UPDATE hg_crm_contacts
       SET last_contact_at = COALESCE(NULLIF(?, ''), CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(occurredAt, contactId));
  }
  await env.DB.batch(statements);
  const activity = await env.DB.prepare("SELECT * FROM hg_crm_activities WHERE id = ?").bind(id).first<ActivityRow>();
  return json({ activity: activity ? activityJson(activity) : null }, 201);
}

async function listTeam(env: CrmEnv, session: CrmSession) {
  if (!isAdmin(session)) {
    return json({ advisors: [{ email: session.email, name: session.name, role: session.role }] });
  }
  const advisors = await env.DB.prepare(
    `SELECT email, display_name, role, title
     FROM hg_agent_profiles WHERE active = 1 ORDER BY display_name COLLATE NOCASE`,
  ).all<{ email: string; display_name: string; role: string; title: string }>();
  return json({
    advisors: advisors.results.map((row) => ({ email: row.email, name: row.display_name, role: row.role, title: row.title })),
  });
}

export async function handleCrmRequest(
  request: Request,
  env: CrmEnv,
  session: CrmSession,
): Promise<Response | null> {
  const path = appPath(new URL(request.url).pathname);
  if (path !== CRM_PREFIX && !path.startsWith(`${CRM_PREFIX}/`)) return null;
  if (!["GET", "HEAD"].includes(request.method) && !validOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    if (path === `${CRM_PREFIX}/overview` && request.method === "GET") return await overview(request, env, session);
    if (path === `${CRM_PREFIX}/team` && request.method === "GET") return await listTeam(env, session);
    if (path === `${CRM_PREFIX}/projects` && request.method === "GET") return projectSearch(request);
    if (path === `${CRM_PREFIX}/import-lead` && request.method === "POST") return await importWebsiteLead(request, env, session);
    if (path === `${CRM_PREFIX}/campaigns`) {
      if (request.method === "GET") return await campaignWorkspace(request, env, session);
      if (request.method === "POST") return await createCampaign(request, env, session);
    }
    const campaignActionMatch = path.match(/^\/api\/agent\/crm\/campaigns\/([a-z0-9_-]{8,180})\/(test|send)$/i);
    if (campaignActionMatch && request.method === "POST") {
      return await campaignAction(
        request,
        env,
        session,
        campaignActionMatch[1],
        campaignActionMatch[2].toLowerCase() as "test" | "send",
      );
    }
    if (path === `${CRM_PREFIX}/contacts`) {
      if (request.method === "GET") return await listContacts(request, env, session);
      if (request.method === "POST") return await createContact(request, env, session);
    }
    const contactEmailMatch = path.match(/^\/api\/agent\/crm\/contacts\/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/email$/i);
    if (contactEmailMatch && request.method === "POST") {
      return await sendLeadEmail(request, env, session, contactEmailMatch[1]);
    }
    const contactMatch = path.match(/^\/api\/agent\/crm\/contacts\/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i);
    if (contactMatch) {
      const id = contactMatch[1];
      if (request.method === "GET") return json(await contactDetail(env, session, id));
      if (request.method === "PATCH") return await updateContact(request, env, session, id);
      if (request.method === "DELETE") return await archiveContact(env, session, id);
    }
    if (path === `${CRM_PREFIX}/opportunities`) {
      if (request.method === "GET") return await listOpportunities(request, env, session);
      if (request.method === "POST") return await createOpportunity(request, env, session);
    }
    const opportunityMatch = path.match(/^\/api\/agent\/crm\/opportunities\/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i);
    if (opportunityMatch) {
      const id = opportunityMatch[1];
      if (request.method === "GET") return json({ opportunity: opportunityJson(await getOpportunityRow(env, session, id)) });
      if (request.method === "PATCH") return await updateOpportunity(request, env, session, id);
      if (request.method === "DELETE") return await archiveOpportunity(env, session, id);
    }
    if (path === `${CRM_PREFIX}/tasks`) {
      if (request.method === "GET") return await listTasks(request, env, session);
      if (request.method === "POST") return await createTask(request, env, session);
    }
    const taskMatch = path.match(/^\/api\/agent\/crm\/tasks\/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i);
    if (taskMatch) {
      const id = taskMatch[1];
      if (request.method === "PATCH") return await updateTask(request, env, session, id);
      if (request.method === "DELETE") return await cancelTask(env, session, id);
    }
    if (path === `${CRM_PREFIX}/activities`) {
      if (request.method === "GET") return await listActivities(request, env, session);
      if (request.method === "POST") return await createActivity(request, env, session);
    }
    return json({ error: "CRM endpoint not found." }, 404);
  } catch (error) {
    if (error instanceof CrmHttpError) return json({ error: error.message }, error.status);
    const message = error instanceof Error ? error.message : "Unknown CRM error";
    if (/UNIQUE constraint failed: hg_crm_lead_links/i.test(message)) {
      return json({ error: "This website lead has already been imported." }, 409);
    }
    if (/uq_hg_crm_contacts_owner_(?:email|phone)_active|UNIQUE constraint failed: hg_crm_contacts/i.test(message)) {
      return json({ error: "A CRM contact with this email or phone already exists for the advisor." }, 409);
    }
    console.error(JSON.stringify({
      event: "crm_api_error",
      path,
      agent: session.email,
      message: message.slice(0, 400),
    }));
    return json({ error: "The CRM could not complete this request." }, 500);
  }
}
