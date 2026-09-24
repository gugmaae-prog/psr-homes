import {
  recommendGraceProjectsStrict,
  type GraceFinderPreferences,
  type GraceRecommendation,
} from "../lib/grace-finder";
import {
  gracePropertyBedroomCombinationIsValid,
  type GraceDiscoveryProfile,
} from "../lib/grace-chat";
import {
  graceClientBriefFilename,
  renderGraceClientBriefPdf,
  type GraceClientNarrative,
  type GraceMarketEvidence,
} from "./grace-client-brief";
import { cbaCompany } from "../data/cba-company";
import { deleteMediaObject, putMediaObject, type MediaStorageEnv } from "./media-storage";

const AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const EMAIL_SENDER = "admin@psrhomes.ae";
const EMAIL_REPLY_TO = "sales@psrhomes.ae";

type GraceBriefEnv = Env & MediaStorageEnv & {
  AI?: Ai;
  EMAIL?: SendEmail;
  IMAGES?: ImagesBinding;
  ASSETS?: Fetcher;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replaceAll("\0", "").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

function budgetFromAmount(value: string): GraceFinderPreferences["budget"] | "" {
  const amount = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount < 250_000) return "";
  if (amount < 1_000_000) return "under-1m";
  if (amount <= 2_000_000) return "1m-2m";
  if (amount <= 5_000_000) return "2m-5m";
  if (amount <= 10_000_000) return "5m-10m";
  return "10m-plus";
}

function emirateFromLocation(location: string) {
  const value = location.toLowerCase();
  const exact = ["Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman", "Fujairah", "Umm Al Quwain"]
    .find((emirate) => value === emirate.toLowerCase());
  if (exact) return exact;
  if (/dubai|marina|palm jumeirah|business bay|jvc|meydan|creek harbour|dubai hills|dubai islands|dubai south/.test(value)) return "Dubai";
  if (/abu dhabi|yas island|saadiyat island/.test(value)) return "Abu Dhabi";
  if (/ras al khaimah|al marjan island/.test(value)) return "Ras Al Khaimah";
  return "Any emirate";
}

function timelineFromProfile(value: string): GraceFinderPreferences["timeline"] {
  const normalized = value.toLowerCase();
  if (/immediately|asap|as soon as possible|ready|move-?in/.test(normalized)) return "Immediately";
  const months = Number(normalized.match(/within\s+(\d+)\s+months?/)?.[1] || 0);
  if (months > 0 && months <= 3) return "Within 3 months";
  if (months > 0 && months <= 6) return "Within 6 months";
  if (/this year|q[1-4]\s*20\d{2}|20\d{2}/.test(normalized)) return "This year";
  return "Exploring";
}

export function graceFinderPreferencesFromDiscovery(profile: GraceDiscoveryProfile): GraceFinderPreferences | null {
  const budget = budgetFromAmount(profile.budget);
  const allowedTypes = new Set(["Apartment", "Villa", "Townhouse", "Penthouse", "Mansion", "Duplex"]);
  if (
    !profile.purpose
    || !allowedTypes.has(profile.propertyType)
    || !profile.bedrooms
    || !gracePropertyBedroomCombinationIsValid(profile.propertyType, profile.bedrooms)
    || !budget
    || !profile.location
    || !profile.timeline
  ) return null;
  const lifestyle: GraceFinderPreferences["lifestyle"] = /beach|waterfront|marina|palm|island/i.test(profile.location)
    ? "beachfront"
    : /golf|wellness/i.test(profile.location)
      ? "golf-wellness"
      : profile.purpose === "home"
        ? "quiet-family"
        : /downtown|business bay|difc|central/i.test(profile.location)
          ? "central"
          : "full-community";
  const investmentStrategy: GraceFinderPreferences["investmentStrategy"] = /rental income/i.test(profile.investmentPriority)
    ? "income"
    : /capital growth/i.test(profile.investmentPriority)
      ? "growth"
      : "balanced";
  const priorities = profile.purpose === "investment"
    ? [investmentStrategy === "income" ? "High rental yield" : investmentStrategy === "growth" ? "Capital appreciation" : "Resale liquidity"]
    : [];
  const emirate = emirateFromLocation(profile.location);
  const exactEmirates = new Set(["Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman", "Fujairah", "Umm Al Quwain"]);
  return {
    goal: profile.purpose,
    propertyTypes: [profile.propertyType],
    bedrooms: profile.bedrooms,
    household: "not-sure",
    lifestyle,
    priorities,
    budget,
    emirate,
    ...(!exactEmirates.has(profile.location) ? { community: profile.location } : {}),
    timeline: timelineFromProfile(profile.timeline),
    financing: "not-sure",
    investmentStrategy,
    goldenVisaInterest: false,
  };
}

function fallbackNarrative(name: string, preferences: GraceFinderPreferences): GraceClientNarrative {
  const purpose = preferences.goal === "investment"
    ? "an investment acquisition"
    : preferences.goal === "home"
      ? "a future home"
      : "a holiday residence";
  return {
    headline: `A considered shortlist for ${name}`,
    executiveSummary: `This private brief translates your search for ${purpose} into a focused first shortlist. It compares only recorded project facts and keeps indicative development pricing separate from live unit evidence.`,
    advisorPerspective: preferences.goal === "investment"
      ? "Treat this shortlist as an acquisition screen, not a return promise. Compare current registered transactions, achievable rent, service charges, vacancy, acquisition costs, competing supply and the intended holding period on the same basis."
      : "Use this shortlist to identify the right locations and formats, then validate the exact unit, orientation, layout, daily routes, service costs and current availability before deciding.",
    validationPriorities: [
      "Confirm the exact unit, net area, view, orientation, current price and dated payment schedule.",
      "Validate recent like-for-like transactions and competing live inventory before reservation.",
      preferences.goal === "investment"
        ? "Model achievable rent, service charges, vacancy, management, financing and acquisition costs before quoting net yield."
        : "Check school, healthcare, retail and commute routes from the exact property where relevant.",
      "Reconfirm developer or seller instructions, fees, contract milestones and cancellation terms before paying.",
    ],
  };
}

export function validatedGraceNarrativePriorities(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const priorities = value.map((item) => clean(item, 320)).filter(Boolean).slice(0, 6);
  const readsAsAction = (item: string) => item.length >= 36 && item.split(/\s+/).length >= 6;
  return priorities.length >= 4 && priorities.every(readsAsAction) ? priorities : fallback;
}

async function createNarrative(
  env: GraceBriefEnv,
  name: string,
  preferences: GraceFinderPreferences,
  recommendations: GraceRecommendation[],
) {
  const fallback = fallbackNarrative(name, preferences);
  if (!env.AI) return fallback;
  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        {
          role: "system",
          content: "Write a concise private UAE property brief using only the supplied preferences and project facts. Never invent availability, unit prices, rent, ROI, yield, service charges, distances, facilities, legal eligibility or finance approval. Keep development-level facts separate from unit-level evidence. Return strict JSON. Use measured, non-promotional English and four to six specific validation actions.",
        },
        {
          role: "user",
          content: JSON.stringify({
            clientFirstName: name.split(/\s+/)[0],
            preferences,
            projects: recommendations.map((project) => ({
              title: project.title,
              developer: project.developer,
              area: project.area,
              emirate: project.emirate,
              price: project.price,
              bedrooms: project.bedrooms,
              propertyTypes: project.propertyTypes,
              reason: project.reason,
              paymentPlan: project.paymentPlan,
              handover: project.handover,
              statusLabel: project.statusLabel,
              sourceLabel: project.sourceLabel,
              sourceUpdatedAt: project.sourceUpdatedAt,
              evidenceStatus: project.evidenceStatus,
            })),
          }),
        },
      ],
      max_tokens: 650,
      temperature: 0.15,
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            headline: { type: "string" },
            executiveSummary: { type: "string" },
            advisorPerspective: { type: "string" },
            validationPriorities: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
          },
          required: ["headline", "executiveSummary", "advisorPerspective", "validationPriorities"],
        },
      },
    }) as { response?: unknown };
    const parsed = typeof result.response === "string"
      ? JSON.parse(result.response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as Partial<GraceClientNarrative>
      : result.response as Partial<GraceClientNarrative> | undefined;
    return {
      headline: clean(parsed?.headline, 140) || fallback.headline,
      executiveSummary: clean(parsed?.executiveSummary, 1_200) || fallback.executiveSummary,
      advisorPerspective: clean(parsed?.advisorPerspective, 1_200) || fallback.advisorPerspective,
      validationPriorities: validatedGraceNarrativePriorities(
        parsed?.validationPriorities,
        fallback.validationPriorities,
      ),
    };
  } catch (error) {
    console.error({ event: "sonu_brief_narrative_fallback", message: error instanceof Error ? error.message.slice(0, 240) : "Narrative generation failed" });
    return fallback;
  }
}

async function latestMarketEvidence(env: GraceBriefEnv, preferences: GraceFinderPreferences): Promise<GraceMarketEvidence | null> {
  if (preferences.emirate !== "Dubai") return null;
  try {
    const row = await env.DB.prepare(
      `SELECT title, dek, market_date, source_label, source_url, source_published_at
       FROM hg_daily_insights
       WHERE status = 'published'
       ORDER BY market_date DESC
       LIMIT 1`,
    ).first<{ title: string; dek: string; market_date: string; source_label: string; source_url: string; source_published_at: string }>();
    return row ? {
      title: clean(row.title, 180),
      summary: clean(row.dek, 600),
      marketDate: clean(row.market_date, 40),
      sourceLabel: clean(row.source_label, 120),
      sourceUrl: clean(row.source_url, 500),
      sourcePublishedAt: clean(row.source_published_at, 40),
    } : null;
  } catch (error) {
    console.error({ event: "sonu_brief_market_evidence_unavailable", message: error instanceof Error ? error.message.slice(0, 240) : "Market evidence query failed" });
    return null;
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function storePrivateBrief(env: GraceBriefEnv, leadId: number, clientName: string, pdf: Uint8Array) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...tokenBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const tokenHash = await sha256Hex(token);
  const filename = graceClientBriefFilename(clientName);
  const objectKey = `private-briefs/${leadId}/${crypto.randomUUID()}.pdf`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
  await putMediaObject(env, objectKey, pdf, {
    httpMetadata: { contentType: "application/pdf", contentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "_")}"` },
    customMetadata: { scope: "private-client-brief", leadId: String(leadId), expiresAt },
  });
  await env.DB.prepare(
    `INSERT INTO psr_public_brief_downloads (token_hash, lead_id, object_key, filename, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(tokenHash, leadId, objectKey, filename, expiresAt).run();
  return { url: `/api/client-briefs/${token}`, filename, expiresAt };
}

function clientEmail(name: string, recommendations: GraceRecommendation[]) {
  const projectList = recommendations.map((project, index) => `${index + 1}. ${project.title} - ${project.area}, ${project.emirate} - ${project.price}`).join("\n");
  return {
    subject: "Your private PSR property brief",
    html: `<!doctype html><html><body style="margin:0;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:640px;background:#1b1e24;border-top:3px solid #967036"><tr><td style="padding:40px"><p style="font-size:11px;letter-spacing:2px;color:#c9a76b">PSR HOMES · PRIVATE BRIEF</p><h1 style="font-family:Georgia,serif;font-weight:400">Your considered UAE shortlist</h1><p style="line-height:1.7;color:#d8d4ca">Hello ${escapeHtml(name)}. Sonu has prepared the attached private PDF from the criteria you confirmed. Each project fact carries its source status and date; exact units, prices and availability still require advisor confirmation.</p><p style="line-height:1.7;color:#d8d4ca">${recommendations.map((project) => escapeHtml(project.title)).join(" · ")}</p><p style="font-size:12px;color:#aaa59b">Reply to this email if you would like a PSR advisor to verify live units.</p></td></tr></table></td></tr></table></body></html>`,
    text: [`PSR private property brief for ${name}`, "", "Your PDF is attached.", "", projectList, "", "Exact units, prices and availability require advisor confirmation."].join("\n"),
  };
}

export async function generateGraceClientBrief({
  env,
  leadId,
  clientName,
  email,
  preferences,
}: {
  env: GraceBriefEnv;
  leadId: number;
  clientName: string;
  email: string;
  preferences: GraceFinderPreferences;
}) {
  const recommendations = recommendGraceProjectsStrict(preferences, 4);
  if (!recommendations.length) throw new Error("No active catalogue records satisfy every confirmed criterion.");
  const [narrative, marketEvidence] = await Promise.all([
    createNarrative(env, clientName, preferences, recommendations),
    latestMarketEvidence(env, preferences),
  ]);
  const generatedAt = new Date();
  const pdf = await renderGraceClientBriefPdf({
    id: `PSR-SONU-${leadId}`,
    clientName,
    preparedAt: generatedAt.toLocaleDateString("en-AE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Dubai" }),
    preferences,
    recommendations,
    narrative,
    marketEvidence,
    env,
  });
  const download = await storePrivateBrief(env, leadId, clientName, pdf);
  let sent = false;
  let sendError = "";
  if (env.EMAIL) {
    try {
      const content = clientEmail(clientName, recommendations);
      await env.EMAIL.send({
        to: email,
        from: { email: EMAIL_SENDER, name: cbaCompany.displayName },
        replyTo: { email: EMAIL_REPLY_TO, name: "PSR Advisory" },
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments: [{ content: pdf, filename: download.filename, type: "application/pdf", disposition: "attachment" }],
      });
      sent = true;
    } catch (error) {
      sendError = error instanceof Error ? error.message.slice(0, 300) : "Client email delivery failed";
      console.error({ event: "sonu_brief_email_failed", leadId, message: sendError });
    }
  } else {
    sendError = "Company mailbox activation pending";
  }
  const briefId = `SONU-${leadId}-${crypto.randomUUID()}`;
  try {
    await env.DB.prepare(
      `INSERT INTO hg_client_briefs
       (id, lead_id, email, brief_type, status, project_slugs_json, generated_at, sent_at, error_message)
       VALUES (?, ?, ?, 'sonu_concierge', ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    ).bind(
      briefId,
      leadId,
      email,
      sent ? "sent" : "generated",
      JSON.stringify(recommendations.map((project) => project.slug)),
      sent ? generatedAt.toISOString() : "",
      sendError,
    ).run();
  } catch (error) {
    console.error({ event: "sonu_brief_log_failed", leadId, message: error instanceof Error ? error.message.slice(0, 240) : "Brief log failed" });
  }
  console.log({ event: "sonu_brief_generated", leadId, sent, projectCount: recommendations.length, marketEvidenceDate: marketEvidence?.marketDate || null });
  return { downloadUrl: download.url, expiresAt: download.expiresAt, sent, recommendations, marketEvidence };
}

export async function pruneExpiredGraceClientBriefs(env: GraceBriefEnv) {
  const rows = await env.DB.prepare(
    `SELECT token_hash, object_key
     FROM psr_public_brief_downloads
     WHERE datetime(expires_at) <= datetime('now')
     ORDER BY expires_at ASC
     LIMIT 100`,
  ).all<{ token_hash: string; object_key: string }>();
  if (!rows.results.length) return 0;
  await Promise.all(rows.results.map((row) => deleteMediaObject(env, row.object_key)));
  await env.DB.batch(rows.results.map((row) => env.DB.prepare(
    "DELETE FROM psr_public_brief_downloads WHERE token_hash = ? AND datetime(expires_at) <= datetime('now')",
  ).bind(row.token_hash)));
  console.log({ event: "expired_client_briefs_pruned", count: rows.results.length });
  return rows.results.length;
}
