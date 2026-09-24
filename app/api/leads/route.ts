import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brochureDownloads, leads } from "@/db/schema";
import { brochurePdfIsReachable, createBrochureAccessToken, resolveProjectDocument } from "@/lib/brochure-access";
import {
  sonuPreferenceMessage,
  normalizeSonuPreferences,
  recommendSonuProjects,
  type SonuFinderPreferences,
  type SonuRecommendation,
} from "@/lib/sonu-finder";
import { getProjectRecord, type RegistryProject } from "@/lib/imported-projects";
import { getAreaPricePerSqft } from "@/lib/market-pricing";
import {
  sonuClientBriefFilename,
  renderSonuClientBriefPdf,
  type SonuClientNarrative,
} from "@/worker/sonu-client-brief";
import type { AgentEnv } from "@/worker/agent-backend";
import { pushWebsiteLeadToLeadRat } from "@/worker/leadrat-backend";
import { cbaCompany } from "@/data/cba-company";
import { SG26_SOURCE } from "@/lib/sg26";

// This is an operational inbox, not public brand copy. Keep it configurable while
// PSR provisions its official company-domain mailbox.
const LEAD_NOTIFICATION_RECIPIENT = process.env.LEAD_NOTIFICATION_RECIPIENT || "sales@psrhomes.ae";
const LEAD_NOTIFICATION_SENDER = "admin@psrhomes.ae";
const RATE_LIMIT_MAX = 5;
const MAX_BODY_BYTES = 20_000;

type LeadPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  source?: unknown;
  propertyReference?: unknown;
  propertyTitle?: unknown;
  consent?: unknown;
  website?: unknown;
  deliveryType?: unknown;
  bedroomPreference?: unknown;
  preferences?: unknown;
  sonuSessionId?: unknown;
  behaviorSignals?: unknown;
  attribution?: unknown;
};

type DeliveryType = "enquiry" | "project_brief" | "brochure_download" | "sonu_finder";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replaceAll("\0", "").trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^\+?[\d\s().-]{7,40}$/.test(phone) && digits.length >= 7 && digits.length <= 15;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function storePrivateBrief(leadId: number, clientName: string, pdf: Uint8Array) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...tokenBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const tokenHash = await sha256Hex(token);
  const filename = sonuClientBriefFilename(clientName);
  const objectKey = `private-briefs/${leadId}/${crypto.randomUUID()}.pdf`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
  await env.MEDIA.put(objectKey, pdf, {
    httpMetadata: {
      contentType: "application/pdf",
      contentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "_")}"`,
    },
    customMetadata: { scope: "private-client-brief", leadId: String(leadId), expiresAt },
  });
  await env.DB.prepare(
    `INSERT INTO psr_public_brief_downloads
     (token_hash, lead_id, object_key, filename, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(tokenHash, leadId, objectKey, filename, expiresAt).run();
  return `/api/client-briefs/${token}`;
}

function leadPayload(value: unknown): LeadPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    name: record.name,
    email: record.email,
    phone: record.phone,
    message: record.message,
    source: record.source,
    propertyReference: record.propertyReference,
    propertyTitle: record.propertyTitle,
    consent: record.consent,
    website: record.website,
    deliveryType: record.deliveryType,
    bedroomPreference: record.bedroomPreference,
    preferences: record.preferences,
    sonuSessionId: record.sonuSessionId,
    behaviorSignals: record.behaviorSignals,
    attribution: record.attribution,
  };
}

function deliveryType(value: unknown): DeliveryType {
  return value === "project_brief" || value === "brochure_download" || value === "sonu_finder" ? value : "enquiry";
}

function formatBudget(value: string) {
  const labels: Record<string, string> = {
    "under-1m": "Under AED 1 million",
    "1m-2m": "AED 1–2 million",
    "2m-5m": "AED 2–5 million",
    "5m-10m": "AED 5–10 million",
    "10m-plus": "AED 10 million and above",
  };
  return labels[value] || value;
}

function behaviorSignals(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const activeSeconds = Math.min(7_200, Math.max(0, Math.round(Number(record.activeSeconds) || 0)));
  const landingPath = clean(record.landingPath, 180);
  const projectContext = clean(record.projectContext, 100);
  return { activeSeconds, landingPath, projectContext };
}

function leadAttribution(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const safePath = (candidate: unknown) => {
    const path = clean(candidate, 300);
    return path.startsWith("/") && !path.startsWith("//") ? path : "";
  };
  const safeUrl = (candidate: unknown) => {
    const url = clean(candidate, 500);
    if (!url) return "";
    try { return ["http:", "https:"].includes(new URL(url).protocol) ? url : ""; } catch { return ""; }
  };
  const dimension = (candidate: unknown) => clean(candidate, 120).replace(/[^a-zA-Z0-9 ._~:/+-]/g, "");
  return {
    firstLandingPath: safePath(record.firstLandingPath),
    landingPath: safePath(record.landingPath),
    referrer: safeUrl(record.referrer),
    utmSource: dimension(record.utmSource),
    utmMedium: dimension(record.utmMedium),
    utmCampaign: dimension(record.utmCampaign),
    utmTerm: dimension(record.utmTerm),
    utmContent: dimension(record.utmContent),
  };
}

function fallbackNarrative(name: string, preferences: SonuFinderPreferences): SonuClientNarrative {
  const purpose = preferences.goal === "investment"
    ? "an investment acquisition"
    : preferences.goal === "home"
      ? "a future home"
      : preferences.goal === "holiday"
        ? "a holiday residence"
        : "a balanced UAE property search";
  return {
    headline: `A considered shortlist for ${name}`,
    executiveSummary: `This private brief translates your search for ${purpose} into a focused first shortlist. It weighs the selected residence type, bedroom requirement, setting, budget, location and timing without treating indicative prices or projected returns as confirmed facts.`,
    advisorPerspective: preferences.goal === "investment"
      ? "The shortlist is an acquisition screen, not a yield promise. The next decision should be supported by current registered comparables, achievable rent, service charges, vacancy, acquisition costs, competing supply and a realistic holding period."
      : "The shortlist balances the stated lifestyle with practical everyday access. The exact building or villa still needs a unit-level review of orientation, layout, school or workplace routes, facilities, service costs and current availability.",
    validationPriorities: [
      "Confirm the exact unit, net area, view, orientation, current price and dated payment schedule.",
      "Validate recent comparable transactions and competing live inventory before reservation.",
      preferences.goal === "investment"
        ? "Model achievable rent, service charges, vacancy, financing and acquisition costs before quoting net yield."
        : "Check real school, healthcare, retail and commute routes from the exact property.",
      preferences.financing === "mortgage" || preferences.financing === "mixed"
        ? "Confirm UAE mortgage eligibility, valuation, loan-to-value and payment timing with a regulated lender."
        : "Align reservation and payment timing with the intended cash-flow plan.",
      preferences.goldenVisaInterest
        ? "Review current UAE Golden Visa eligibility against the final ownership structure and qualifying property value."
        : "Review residency implications only if they form part of the acquisition objective.",
    ],
  };
}

async function createSonuNarrative(
  name: string,
  preferences: SonuFinderPreferences,
  recommendations: SonuRecommendation[],
) {
  const fallback = fallbackNarrative(name, preferences);
  if (!env.AI) return fallback;
  try {
    const response = await env.AI.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
      messages: [
        {
          role: "system",
          content: [
            `You write concise private property discovery briefs for ${cbaCompany.displayName} in the UAE.`,
            "Use only the supplied preferences and shortlisted project facts.",
            "Do not invent prices, ROI, rent, yield, service charges, distances, availability, facilities or legal eligibility.",
            "Write polished plain English without hype. Return strict JSON with headline, executiveSummary, advisorPerspective and validationPriorities.",
            "validationPriorities must contain four to six specific due-diligence actions.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            clientFirstName: name.split(/\s+/)[0],
            preferences,
            shortlistedProjects: recommendations.map(({ title, developer, area, emirate, price, bedrooms, propertyTypes, reason, paymentPlan, handover, statusLabel, evidenceStatus, sourceUpdatedAt }) => ({
              title,
              developer,
              area,
              emirate,
              price,
              bedrooms,
              propertyTypes,
              reason,
              paymentPlan,
              handover,
              statusLabel,
              evidenceStatus,
              sourceUpdatedAt,
            })),
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            headline: { type: "string" },
            executiveSummary: { type: "string" },
            advisorPerspective: { type: "string" },
            validationPriorities: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "executiveSummary", "advisorPerspective", "validationPriorities"],
        },
      },
    }) as { response?: string };
    const raw = clean(response.response, 8_000).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(raw) as Partial<SonuClientNarrative>;
    return {
      headline: clean(parsed.headline, 140) || fallback.headline,
      executiveSummary: clean(parsed.executiveSummary, 1_200) || fallback.executiveSummary,
      advisorPerspective: clean(parsed.advisorPerspective, 1_200) || fallback.advisorPerspective,
      validationPriorities: Array.isArray(parsed.validationPriorities)
        ? parsed.validationPriorities.map((item) => clean(item, 300)).filter(Boolean).slice(0, 6)
        : fallback.validationPriorities,
    };
  } catch (error) {
    console.error(JSON.stringify({
      event: "sonu_client_narrative_fallback",
      message: error instanceof Error ? error.message.slice(0, 240) : "AI narrative failed",
    }));
    return fallback;
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(request: Request) {
  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `website-lead:${await sha256(clientIp)}`;
  const row = await env.DB.prepare(
    `INSERT INTO hg_agent_rate_limits ("key", window_started_at, "count")
     VALUES (?, CURRENT_TIMESTAMP, 1)
     ON CONFLICT("key") DO UPDATE SET
       "count" = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN 1
         ELSE "count" + 1
       END,
       window_started_at = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
         ELSE window_started_at
       END
     RETURNING "count"`,
  ).bind(key).first<{ count: number }>();
  if ((row?.count ?? RATE_LIMIT_MAX + 1) > RATE_LIMIT_MAX) {
    throw new Error("rate_limited");
  }
}

function leadNotification({
  id,
  createdAt,
  name,
  email,
  phone,
  message,
  source,
  propertyReference,
  propertyTitle,
}: {
  id: number;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  propertyReference: string | null;
  propertyTitle: string;
}) {
  const projectUrl = propertyReference
    ? `https://psrhomes.ae/projects/${encodeURIComponent(propertyReference)}`
    : "https://psrhomes.ae";
  const subjectContext = propertyTitle || propertyReference || "website";
  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: escapeHtml(phone || "Not provided"),
    message: escapeHtml(message || "No additional message").replaceAll("\n", "<br>"),
    source: escapeHtml(source),
    property: escapeHtml(propertyTitle || propertyReference || "General enquiry"),
    projectUrl: escapeHtml(projectUrl),
    createdAt: escapeHtml(createdAt),
  };
  return {
    subject: `New website enquiry — ${subjectContext.slice(0, 80)}`,
    html: `<!doctype html>
<html><body style="margin:0;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111318">
    <tr><td align="center" style="padding:36px 18px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#1b1e24;border-top:4px solid #aab1bc">
        <tr><td style="padding:42px 42px 18px">
          <p style="margin:0 0 24px;color:#c8cdd5;font-size:11px;font-weight:700;letter-spacing:2.5px">PSR · WEBSITE ENQUIRY</p>
          <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.15">${safe.property}</h1>
          <p style="margin:0;color:#777269;font-size:13px">Lead #${id} · ${safe.createdAt}</p>
        </td></tr>
        <tr><td style="padding:18px 42px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Name</td><td style="padding:12px 0;border-bottom:1px solid #353941;text-align:right">${safe.name}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Email</td><td style="padding:12px 0;border-bottom:1px solid #353941;text-align:right"><a href="mailto:${safe.email}" style="color:#f4f6f8">${safe.email}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Phone</td><td style="padding:12px 0;border-bottom:1px solid #353941;text-align:right">${phone ? `<a href="tel:${safe.phone}" style="color:#f4f6f8">${safe.phone}</a>` : safe.phone}</td></tr>
            <tr><td style="padding:12px 0;color:#c8cdd5;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Source</td><td style="padding:12px 0;text-align:right">${safe.source}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 42px 28px">
          <p style="margin:0 0 8px;color:#c8cdd5;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Client message</p>
          <p style="margin:0;line-height:1.7">${safe.message}</p>
        </td></tr>
        <tr><td style="padding:0 42px 42px">
          <a href="${safe.projectUrl}" style="display:inline-block;padding:15px 22px;background:#f4f6f8;color:#08090b;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Open project page</a>
          <p style="margin:18px 0 0;color:#777269;font-size:12px">Reply to this email to contact ${safe.name} directly.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    text: [
      "PSR website enquiry",
      `Lead #${id}`,
      `Received: ${createdAt}`,
      `Project: ${propertyTitle || propertyReference || "General enquiry"}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || "Not provided"}`,
      `Source: ${source}`,
      `Message: ${message || "No additional message"}`,
      `Project page: ${projectUrl}`,
    ].join("\n"),
  };
}

function projectBriefEmail(project: RegistryProject, bedroomPreference: string) {
  const title = escapeHtml(project.name);
  const developer = escapeHtml(project.developerDisplay || project.developer);
  const area = escapeHtml(`${project.area}, ${project.emirate}`);
  const bedrooms = escapeHtml(bedroomPreference || project.bedrooms.join(", ") || "To be selected");
  const residenceTypes = escapeHtml(project.propertyTypes.join(", ") || "Residence");
  const price = escapeHtml(project.startingPrice || "Available on request");
  const paymentPlan = escapeHtml(project.paymentPlan || "Available on request");
  const handover = escapeHtml(project.handover || "To be confirmed");
  const benchmark = getAreaPricePerSqft(project.area, project.propertyTypes, project.emirate);
  const projectUrl = `https://psrhomes.ae/projects/${encodeURIComponent(project.slug)}`;
  const documentUrl = resolveProjectDocument(project) ? `${projectUrl}#project-documents` : "";
  const benchmarkRow = benchmark
    ? `<tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Area benchmark</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${escapeHtml(benchmark.display)}<br><small style="color:#aeb4bd">${escapeHtml(benchmark.period)}</small></td></tr>`
    : "";
  return {
    subject: `Your private brief: ${project.name}`.slice(0, 160),
    html: `<!doctype html>
<html><body style="margin:0;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111318">
    <tr><td align="center" style="padding:30px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#1b1e24;border-top:4px solid #aab1bc">
        <tr><td style="padding:42px 42px 24px;background:#08090b;color:#f4f6f8">
          <p style="margin:0 0 24px;color:#c8cdd5;font-size:11px;font-weight:700;letter-spacing:2.6px">PSR · PRIVATE PROJECT BRIEF</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:400;line-height:1.1">${title}</h1>
          <p style="margin:15px 0 0;color:#c8cdd5;font-size:15px">${area}</p>
        </td></tr>
        <tr><td style="padding:34px 42px 12px">
          <p style="margin:0;color:#777269;font-size:14px;line-height:1.75">Prepared around your preference for <strong style="color:#191a18">${bedrooms}</strong>. This is a concise planning brief; the advisory desk will reconfirm the exact unit, view, price and reservation terms.</p>
        </td></tr>
        <tr><td style="padding:18px 42px 26px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Developer</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${developer}</td></tr>
            <tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Residence mix</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${residenceTypes}</td></tr>
            <tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Starting price</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${price}</td></tr>
            <tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Payment plan</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${paymentPlan}</td></tr>
            <tr><td style="padding:14px 0;border-bottom:1px solid #353941;color:#c8cdd5;font-size:10px;text-transform:uppercase;letter-spacing:1.4px">Handover</td><td style="padding:14px 0;border-bottom:1px solid #353941;text-align:right">${handover}</td></tr>
            ${benchmarkRow}
          </table>
        </td></tr>
        <tr><td style="padding:0 42px 42px">
          <a href="${projectUrl}" style="display:inline-block;padding:15px 20px;background:#f4f6f8;color:#08090b;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Review the project</a>
          ${documentUrl ? `<a href="${documentUrl}" style="display:inline-block;margin-left:10px;padding:14px 20px;border:1px solid #aab1bc;color:#f4f6f8;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Open project document</a>` : ""}
          <p style="margin:26px 0 0;color:#777269;font-size:12px;line-height:1.6">Reply to this email to request live availability. Pricing, finance and availability are subject to final developer, seller and lender confirmation.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    text: [
      `PSR private project brief: ${project.name}`,
      `${project.area}, ${project.emirate}`,
      `Bedroom preference: ${bedroomPreference || "To be selected"}`,
      `Developer: ${project.developerDisplay || project.developer}`,
      `Residence mix: ${project.propertyTypes.join(", ") || "Residence"}`,
      `Starting price: ${project.startingPrice || "Available on request"}`,
      `Payment plan: ${project.paymentPlan || "Available on request"}`,
      `Handover: ${project.handover || "To be confirmed"}`,
      ...(benchmark ? [`Area benchmark: ${benchmark.display} (${benchmark.period})`] : []),
      `Project: ${projectUrl}`,
      ...(documentUrl ? [`Project document: ${documentUrl}`] : []),
      "",
      "Live availability, unit pricing, finance and reservation terms require final confirmation.",
    ].join("\n"),
  };
}

function sonuFinderEmail(name: string, preferences: SonuFinderPreferences, recommendations: SonuRecommendation[]) {
  const safeName = escapeHtml(name);
  const rows = recommendations.map((project, index) => {
    const projectUrl = `https://psrhomes.ae/projects/${encodeURIComponent(project.slug)}`;
    return `<tr><td style="padding:24px 0;border-bottom:1px solid #ded8cc">
      <p style="margin:0 0 8px;color:#c8cdd5;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Match ${String(index + 1).padStart(2, "0")} · ${escapeHtml(project.area)}</p>
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:25px;font-weight:400">${escapeHtml(project.title)}</h2>
      <p style="margin:0 0 10px;color:#777269;font-size:13px">${escapeHtml(project.developer)} · ${escapeHtml(project.price)}</p>
      <p style="margin:0 0 14px;color:#44423d;font-size:13px;line-height:1.7">${escapeHtml(project.reason)}</p>
      <a href="${projectUrl}" style="color:#c8cdd5;font-size:11px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:1.1px">Review project</a>
    </td></tr>`;
  }).join("");
  const purpose = preferences.goal === "investment" ? "investment acquisition" : preferences.goal === "home" ? "future home" : preferences.goal === "holiday" ? "holiday residence" : "property search";
  return {
    subject: "Your private PSR property brief",
    html: `<!doctype html>
<html><body style="margin:0;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111318">
    <tr><td align="center" style="padding:30px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#1b1e24;border-top:4px solid #aab1bc">
        <tr><td style="padding:42px;background:#08090b;color:#f4f6f8">
          <p style="margin:0 0 24px;color:#c8cdd5;font-size:11px;font-weight:700;letter-spacing:2.6px">PSR · PRIVATE CLIENT BRIEF</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:400;line-height:1.12">Your considered property brief</h1>
          <p style="margin:16px 0 0;color:#c8cdd5;font-size:14px">Built around your ${escapeHtml(purpose)} brief and ${escapeHtml(formatBudget(preferences.budget))} budget.</p>
        </td></tr>
        <tr><td style="padding:34px 42px 8px">
          <p style="margin:0;color:#777269;font-size:14px;line-height:1.75">Hello ${safeName}. Your private PDF is attached to this email. These initial matches balance property type, bedrooms, setting, household needs, budget and timing. An advisor will refine them against live inventory and current transaction evidence.</p>
        </td></tr>
        <tr><td style="padding:6px 42px 26px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr>
        <tr><td style="padding:0 42px 42px">
          <a href="https://psrhomes.ae/projects" style="display:inline-block;padding:15px 20px;background:#f4f6f8;color:#08090b;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Explore all projects</a>
          <p style="margin:26px 0 0;color:#777269;font-size:12px;line-height:1.6">For investors, the next review should confirm comparable transactions, achievable rent, service costs, vacancy assumptions and net yield. For families, the next review should confirm school routes, healthcare, parks and daily travel from the exact unit.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    text: [
      `PSR — private client brief for ${name}`,
      "Your PDF brief is attached to this email.",
      `Purpose: ${purpose}`,
      `Budget: ${formatBudget(preferences.budget)}`,
      "",
      ...recommendations.flatMap((project, index) => [
        `${index + 1}. ${project.title}`,
        `${project.area}, ${project.emirate} · ${project.developer} · ${project.price}`,
        project.reason,
        `https://psrhomes.ae/projects/${encodeURIComponent(project.slug)}`,
        "",
      ]),
      "Live availability, exact unit pricing and investment assumptions require final confirmation.",
    ].join("\n"),
  };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Enquiry is too large." }, { status: 413 });
    }

    const payload = leadPayload(await request.json());
    if (!payload) return Response.json({ error: "Invalid enquiry." }, { status: 400 });
    if (clean(payload.website, 200)) return Response.json({ ok: true }, { status: 201 });
    const requestedSource = clean(payload.source, 80) || "website";
    const isBotSpaceImport = requestedSource === "botspace";
    const botSpaceImportSecret = request.headers.get("x-botspace-import-secret") || "";
    const configuredBotSpaceImportSecret = (env as AgentEnv).BOTSPACE_IMPORT_SECRET || "";
    if (isBotSpaceImport && (!configuredBotSpaceImportSecret || botSpaceImportSecret !== configuredBotSpaceImportSecret)) {
      return Response.json({ error: "Unauthorized BotSpace import." }, { status: 403 });
    }
    if (requestedSource === SG26_SOURCE && !new URL(request.url).pathname.endsWith("/api/sg26/registrations")) {
      return Response.json({ error: "Use the event registration form." }, { status: 400 });
    }

    if (!isBotSpaceImport) {
      try {
        await enforceRateLimit(request);
      } catch {
        return Response.json({ error: "Please wait before sending another enquiry." }, { status: 429 });
      }
    }

    const name = clean(payload.name, 100);
    const email = clean(payload.email, 160).toLowerCase();
    const phone = clean(payload.phone, 40);
    const submittedMessage = clean(payload.message, 2000);
    const source = requestedSource;
    const propertyReference = clean(payload.propertyReference, 100) || null;
    const requestedPropertyTitle = clean(payload.propertyTitle, 160);
    const requestedDelivery = deliveryType(payload.deliveryType);
    const bedroomPreference = clean(payload.bedroomPreference, 40);
    const sonuSessionId = clean(payload.sonuSessionId, 64);
    const visitSignals = behaviorSignals(payload.behaviorSignals);
    const attribution = leadAttribution(payload.attribution);
    const consent = payload.consent === "yes" || payload.consent === true;
    const phoneIsRequired = requestedDelivery === "enquiry" || requestedDelivery === "brochure_download";
    const emailIsValid = Boolean(email) ? isValidEmail(email) : isBotSpaceImport;
    if (name.length < 2 || !emailIsValid || (phoneIsRequired ? !isValidPhone(phone) : Boolean(phone) && !isValidPhone(phone)) || !consent) {
      return Response.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    const referencedProject = (requestedDelivery === "project_brief" || requestedDelivery === "brochure_download") && propertyReference
      ? getProjectRecord(propertyReference)
      : null;
    const project = requestedDelivery === "project_brief" ? referencedProject : null;
    const brochureProject = requestedDelivery === "brochure_download" ? referencedProject : null;
    const brochureDocument = brochureProject ? resolveProjectDocument(brochureProject) : null;
    if (requestedDelivery === "project_brief" && (!project || !bedroomPreference)) {
      return Response.json({ error: "Select a bedroom preference for this project." }, { status: 400 });
    }
    if (requestedDelivery === "brochure_download" && (!brochureProject || !brochureDocument)) {
      return Response.json({ error: "This project document is not available." }, { status: 404 });
    }
    if (brochureDocument?.kind === "verified_brochure" && !(await brochurePdfIsReachable(brochureDocument))) {
      return Response.json({ error: "This brochure is temporarily unavailable. Please request the current document pack instead." }, {
        status: 503,
        headers: { "cache-control": "private, no-store" },
      });
    }

    const preferences = requestedDelivery === "sonu_finder"
      ? normalizeSonuPreferences(payload.preferences)
      : null;
    if (requestedDelivery === "sonu_finder" && !preferences) {
      return Response.json({ error: "Complete the property finder questions." }, { status: 400 });
    }

    const recommendations = preferences ? recommendSonuProjects(preferences, 4) : [];
    const propertyTitle = referencedProject?.name || requestedPropertyTitle;
    const contextualMessage = requestedDelivery === "project_brief"
      ? `Private brief requested\nBedroom preference: ${bedroomPreference}`
      : requestedDelivery === "brochure_download"
        ? `${brochureDocument?.label || "Project document"} download requested after contact validation`
      : preferences
        ? `PSR Property Finder request\n${sonuPreferenceMessage(preferences)}`
        : "";
    const attributionMessage = attribution ? [
      attribution.firstLandingPath && `First landing: ${attribution.firstLandingPath}`,
      attribution.landingPath && `Lead landing: ${attribution.landingPath}`,
      attribution.referrer && `Referrer: ${attribution.referrer}`,
      attribution.utmSource && `UTM source: ${attribution.utmSource}`,
      attribution.utmMedium && `UTM medium: ${attribution.utmMedium}`,
      attribution.utmCampaign && `UTM campaign: ${attribution.utmCampaign}`,
      attribution.utmTerm && `UTM term: ${attribution.utmTerm}`,
      attribution.utmContent && `UTM content: ${attribution.utmContent}`,
    ].filter(Boolean).join("\n") : "";
    const message = [contextualMessage, submittedMessage, attributionMessage].filter(Boolean).join("\n\n");

    const db = await getDb();
    const [lead] = await db.insert(leads).values({
      name,
      email,
      phone,
      message,
      source,
      propertyReference,
      consent,
    }).returning({ id: leads.id, createdAt: leads.createdAt });

    let brochureDownloadUrl = "";
    if (brochureProject && brochureDocument) {
      const access = await createBrochureAccessToken();
      try {
        await db.insert(brochureDownloads).values({
          tokenHash: access.tokenHash,
          leadId: lead.id,
          projectSlug: brochureProject.slug,
          expiresAt: access.expiresAt,
        });
      } catch (error) {
        await db.delete(leads).where(eq(leads.id, lead.id));
        throw error;
      }
      brochureDownloadUrl = `/api/brochures/${encodeURIComponent(brochureProject.slug)}?access=${access.token}`;
    }

    if (preferences && /^[a-f0-9-]{36}$/i.test(sonuSessionId)) {
      try {
        await env.DB.prepare(
          `INSERT INTO hg_sonu_memories
           (session_id, lead_id, email, preferences_json, behavior_json, summary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(session_id) DO UPDATE SET
             lead_id = excluded.lead_id,
             email = excluded.email,
             preferences_json = excluded.preferences_json,
             behavior_json = excluded.behavior_json,
             summary = excluded.summary,
             updated_at = CURRENT_TIMESTAMP`,
        ).bind(
          sonuSessionId,
          lead.id,
          email,
          JSON.stringify(preferences),
          JSON.stringify(visitSignals || {}),
          sonuPreferenceMessage(preferences),
        ).run();
      } catch (memoryError) {
        console.error(JSON.stringify({
          event: "sonu_memory_write_failed",
          leadId: lead.id,
          message: memoryError instanceof Error ? memoryError.message.slice(0, 240) : "Memory write failed",
        }));
      }
    }

    const notification = leadNotification({
      ...lead,
      name,
      email,
      phone,
      message,
      source,
      propertyReference,
      propertyTitle,
    });
    const leadRatSync = pushWebsiteLeadToLeadRat(env as AgentEnv, {
      websiteLeadId: lead.id,
      name,
      email,
      phone,
      message,
      source,
      propertyReference,
      propertyTitle,
    });
    const internalDelivery = env.EMAIL ? env.EMAIL.send({
      to: LEAD_NOTIFICATION_RECIPIENT,
      from: { email: LEAD_NOTIFICATION_SENDER, name: "PSR Website" },
      ...(email ? { replyTo: { email, name } } : {}),
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
    }) : Promise.reject(new Error("PSR company email is pending activation."));

    const clientEmail = project
      ? projectBriefEmail(project, bedroomPreference)
      : preferences
        ? sonuFinderEmail(name, preferences, recommendations)
        : null;
    const briefNarrative = preferences
      ? await createSonuNarrative(name, preferences, recommendations)
      : null;
    const clientPdf = preferences && briefNarrative
      ? await renderSonuClientBriefPdf({
        id: `PSR-${lead.id}`,
        clientName: name,
        preparedAt: new Date().toLocaleDateString("en-AE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Dubai",
        }),
        preferences,
        recommendations,
        narrative: briefNarrative,
        env,
      })
      : null;
    const briefDownloadUrl = clientPdf
      ? await storePrivateBrief(lead.id, name, clientPdf)
      : "";
    const clientDelivery = clientEmail && env.EMAIL
      ? env.EMAIL.send({
        to: email,
        from: { email: LEAD_NOTIFICATION_SENDER, name: cbaCompany.displayName },
        replyTo: { email: LEAD_NOTIFICATION_RECIPIENT, name: "PSR Advisory" },
        subject: clientEmail.subject,
        html: clientEmail.html,
        text: clientEmail.text,
        ...(clientPdf ? {
          attachments: [{
            content: clientPdf,
            filename: sonuClientBriefFilename(name),
            type: "application/pdf",
            disposition: "attachment",
          }],
        } : {}),
      })
      : null;

    const [internalResult, clientResult, leadRatResult] = await Promise.allSettled([
      internalDelivery,
      clientDelivery ?? Promise.resolve(null),
      leadRatSync,
    ] as const);
    const internalSent = internalResult.status === "fulfilled";
    const briefSent = !clientEmail || (Boolean(env.EMAIL) && clientResult.status === "fulfilled");
    const leadRatSynced = leadRatResult.status === "fulfilled" && leadRatResult.value.ok;
    if (preferences) {
      try {
        await env.DB.prepare(
          `INSERT INTO hg_client_briefs
           (id, lead_id, email, brief_type, status, project_slugs_json, generated_at, sent_at, error_message)
           VALUES (?, ?, ?, 'sonu_finder', ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        ).bind(
          `SONU-${lead.id}`,
          lead.id,
          email,
          briefSent ? "sent" : briefDownloadUrl ? "generated" : "failed",
          JSON.stringify(recommendations.map((item) => item.slug)),
          briefSent ? new Date().toISOString() : "",
          briefSent ? "" : briefDownloadUrl ? "Company mailbox activation pending" : "Email delivery failed",
        ).run();
      } catch (briefLogError) {
        console.error(JSON.stringify({
          event: "sonu_brief_log_failed",
          leadId: lead.id,
          message: briefLogError instanceof Error ? briefLogError.message.slice(0, 240) : "Brief log failed",
        }));
      }
    }
    await db.update(leads).set({ status: internalSent ? "notified" : "notification_failed" }).where(eq(leads.id, lead.id));

    if (internalSent) {
      console.log(JSON.stringify({
        event: "lead_notification_sent",
        leadId: lead.id,
        messageId: internalResult.value.messageId,
        deliveryType: requestedDelivery,
        clientBriefSent: briefSent,
        leadRatSynced,
      }));
    } else {
      console.error(JSON.stringify({
        event: "lead_notification_failed",
        leadId: lead.id,
        message: internalResult.reason instanceof Error ? internalResult.reason.message.slice(0, 300) : "Email delivery failed",
      }));
    }
    if (clientEmail && !briefSent && !briefDownloadUrl) {
      const reason = clientResult.status === "rejected" && clientResult.reason instanceof Error
        ? clientResult.reason.message.slice(0, 300)
        : "Client email delivery failed";
      console.error(JSON.stringify({ event: "client_brief_failed", leadId: lead.id, deliveryType: requestedDelivery, message: reason }));
      return Response.json({
        error: "Your request was saved, but the brief could not be delivered to that email address.",
        lead: { id: lead.id, createdAt: lead.createdAt },
        leadRatSynced,
      }, { status: 502 });
    }
    if (!internalSent && !briefDownloadUrl && !brochureDownloadUrl) {
      return Response.json({
        error: "Your request was saved, but the advisory desk could not be notified.",
        lead: { id: lead.id, createdAt: lead.createdAt },
        briefSent,
        leadRatSynced,
        briefDownloadUrl,
        brochureDownloadUrl,
        recommendations,
      }, { status: 502 });
    }
    return Response.json({
      ok: true,
      lead: { id: lead.id, createdAt: lead.createdAt },
      briefSent,
      leadRatSynced,
      briefDownloadUrl,
      brochureDownloadUrl,
      recommendations,
    }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({
      event: "lead_submission_failed",
      message: error instanceof Error ? error.message.slice(0, 300) : "Unable to save enquiry",
    }));
    return Response.json({ error: "Unable to process enquiry." }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
