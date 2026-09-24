import { env } from "cloudflare:workers";
import { POST as submitLead } from "@/app/api/leads/route";
import { SG26_EVENT_NAME, SG26_SESSIONS, SG26_SOURCE } from "@/lib/sg26";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 20_000;

export async function GET() {
  try {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM haus_grace_leads WHERE source = ?",
    ).bind(SG26_SOURCE).first<{ count: number | string }>();
    const count = Math.max(0, Number(row?.count || 0));
    return Response.json({ count }, {
      headers: { "cache-control": "public, max-age=30, s-maxage=60" },
    });
  } catch {
    return Response.json({ count: null }, {
      headers: { "cache-control": "no-store" },
    });
  }
}

const interests = new Set([
  "UAE property opportunities",
  "Business setup",
  "Family office migration",
  "A combined UAE strategy",
]);

const budgets = new Set([
  "",
  "Prefer to discuss",
  "AED 1M–2M",
  "AED 2M–5M",
  "AED 5M–10M",
  "AED 10M+",
  "Not applicable",
]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replaceAll("\0", "").trim().slice(0, max) : "";
}

async function boundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new RangeError("body_too_large");
  if (!request.body) throw new SyntaxError("missing_body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("body_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}

export async function POST(request: Request) {
  let record: Record<string, unknown>;
  try {
    const payload = await boundedJson(request);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid_payload");
    record = payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RangeError) {
      return Response.json({ error: "Invitation request is too large." }, { status: 413 });
    }
    return Response.json({ error: "Invalid invitation request." }, { status: 400 });
  }

  const sessionId = clean(record.session, 80);
  const session = SG26_SESSIONS.find((item) => item.id === sessionId);
  const interest = clean(record.interest, 80);
  const budget = clean(record.budget, 80);
  if (!session || !interests.has(interest) || !budgets.has(budget)) {
    return Response.json({ error: "Choose a valid session and area of interest." }, { status: 400 });
  }

  const company = clean(record.company, 140);
  const notes = clean(record.notes, 800);
  const message = [
    SG26_EVENT_NAME,
    `Preferred session: ${session.day}, ${session.date} at ${session.time} SGT`,
    `Primary interest: ${interest}`,
    `Property budget: ${budget || "Prefer to discuss"}`,
    company ? `Company / family office: ${company}` : "",
    notes ? `Additional notes: ${notes}` : "",
  ].filter(Boolean).join("\n");

  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return submitLead(new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: record.name,
      email: record.email,
      phone: record.phone,
      website: record.website,
      consent: record.consent,
      message,
      source: SG26_SOURCE,
      propertyTitle: SG26_EVENT_NAME,
      deliveryType: "enquiry",
      attribution: record.attribution,
    }),
  }));
}
