import registryData from "../data/projects.json";
import { curatedLaunches } from "../data/curated-launches";
import { filterPhotographyAssets, isFloorplanAsset, organizeProjectMedia, selectPhotographyAsset } from "../lib/media-policy";
import { curatedProjectFeedAliases } from "../lib/project-feed-aliases";

const PROJECT_SITEMAP = "https://opr.ae/sitemap.xml";
const AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const SYNC_AGENT = "PSR-Launch-Monitor/1.0 (+https://psrhomes.ae)";
const PROJECT_FETCH_LIMIT = 6;
const registryProjects = (registryData as { projects: Array<{ slug: string; name: string; developer: string; emirate: string; area: string; archived: boolean }> }).projects;
const knownProjectSlugs = new Set([
  ...registryProjects.map((project) => project.slug),
  ...curatedLaunches.map((project) => project.slug),
  ...curatedProjectFeedAliases.keys(),
]);
const knownProjectIdentities = new Set([
  ...registryProjects.filter((project) => !project.archived),
  ...curatedLaunches.filter((project) => !project.archived),
].map((project) => projectCardIdentity(project)));

const MARKET_SOURCES = [
  {
    label: "Dubai Land Department",
    url: "https://dubailand.gov.ae/en/news-media/dubai-s-real-estate-transactions-surge-31-to-reach-aed-252-billion-in-q1-2026",
    priority: 1,
  },
  {
    label: "Dubai Media Office",
    url: "https://www.mediaoffice.ae/en/news/2026/january/12-01/dubais-real-estate-market-records-new-historic-milestone",
    priority: 2,
  },
  {
    label: "DXBinteract",
    url: "https://dxbinteract.com/market-reports/2026",
    priority: 3,
  },
] as const;

type ProjectFeedRow = {
  slug: string;
  name: string;
  developer: string;
  emirate: string;
  area: string;
  starting_price: number;
  payment_plan: string;
  handover: string;
  image_url: string;
  media_json: string;
  bedrooms_json: string;
  property_types_json: string;
  summary: string;
  discovered_at: string;
};

type DailyInsightRow = {
  slug: string;
  title: string;
  dek: string;
  body_json: string;
  category: string;
  source_label: string;
  source_url: string;
  source_published_at: string;
  image_url: string;
  market_date: string;
  published_at: string;
};

type MarketSourceDocument = {
  label: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  image: string;
  text: string;
  priority: number;
};

type AiDailyInsight = {
  title: string;
  dek: string;
  paragraphs: string[];
};

function clean(value: unknown, max = 500) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function normalizedProjectCardText(value: unknown) {
  return clean(value, 240)
    .normalize("NFKC")
    .replace(/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufeff\uffa0]/g, " ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectCardIdentity(project: { name?: unknown; title?: unknown; developer?: unknown; emirate?: unknown; area?: unknown }) {
  const emirate = normalizedProjectCardText(project.emirate);
  const emirateTokens = new Set(emirate.split("-").filter(Boolean));
  const area = normalizedProjectCardText(project.area)
    .split("-")
    .filter((token) => token && token !== "emirate" && !emirateTokens.has(token))
    .join("-");
  const developer = normalizedProjectCardText(project.developer)
    .replace(/-(?:properties|property|developers?|developments?|development|realty|holdings?|limited|group|pjsc|llc|asset-management)$/g, "");
  return [normalizedProjectCardText(project.name || project.title), developer, emirate, area].join("|");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)));
}

function stripHtml(value: string, max = 80_000) {
  return clean(decodeHtml(value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")), max);
}

function meta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((item) => new RegExp(`(?:property|name)=["']${key}["']`, "i").test(item));
  return clean(decodeHtml(tag?.match(/content=["']([^"']*)["']/i)?.[1] || ""), 2_000);
}

async function readBoundedResponse(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    await response.body?.cancel();
    return "";
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return "";
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

async function fetchText(url: string, maxBytes: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
        "user-agent": SYNC_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return "";
    return await readBoundedResponse(response, maxBytes);
  } finally {
    clearTimeout(timeout);
  }
}

function safeSourceImage(raw: string) {
  if (!raw) return "";
  try {
    const normalized = decodeHtml(raw).replace(/\\u0026/gi, "&").split("#")[0];
    const url = new URL(normalized);
    const lower = decodeURIComponent(url.pathname).toLowerCase();
    const allowedHosts = [
      "cdn.opr.ae",
      "img1.creatium.ru",
      "img2.creatium.ru",
      "img3.creatium.ru",
      "i.1.creatium.io",
      "dubailand.gov.ae",
      "www.mediaoffice.ae",
      "mediaoffice.ae",
      "dxbinteract.com",
      "binghattiweb.imgix.net",
      "mira.static.bigapp.ae",
      "d8j0ntlcm91z4.cloudfront.net",
      "haus-grace-assets.thekeifferjapeth.workers.dev",
    ];
    if (url.protocol !== "https:" || !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return "";
    if (!/\.(?:jpe?g|png|webp|avif)$/i.test(lower)) return "";
    if (/(?:^|[/_.-])(logo|favicon|icon|icn\d*|pattern|whatsapp|telegram|agent|quiz|flag|avatar|phone|blur|mobile?|map_?pin|qr(?:code)?|barcode|scan[-_]?me)(?:[/_.-]|$)|dubai_neighborhood/i.test(lower)) return "";
    return normalized;
  } catch {
    return "";
  }
}

function uniqueImages(images: string[], maxItems: number) {
  return [...new Set(images.map(safeSourceImage).filter(Boolean))].slice(0, maxItems);
}

function unsafeProjectImageContext(html: string, index: number, length: number) {
  const context = html.slice(Math.max(0, index - 420), Math.min(html.length, index + length + 520)).toLowerCase();
  return /(?:qr[-_ ]?code|quick response code|scan(?:\s|&nbsp;|-|_){0,3}(?:this|the)?(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|whatsapp(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|telegram(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|(?:other|similar|related)(?:\s|&nbsp;|-|_){0,3}(?:projects?|properties|developments?))/i.test(context);
}

function looksLikeFloorplan(url: string) {
  if (isFloorplanAsset(url)) return true;
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* retain the normalized URL */ }
  return /(floor|floorplan|floor_plan|unit[_-]?plan|layout|(?:^|[/_-])\d{1,2}br[_-]|bed(?:room)?.*(?:sqft|sq_ft|area)|indoor.*balcony)/i.test(decoded);
}

function projectMediaFromHtml(html: string, hero: string) {
  const matches = [...html.matchAll(/https:\/\/[^"' <>\\]+?\.(?:jpe?g|png|webp|avif)(?:\?[^"' <>\\]*)?/gi)];
  const allImages = uniqueImages(matches
    .filter((match) => !unsafeProjectImageContext(html, match.index ?? 0, match[0].length))
    .map((match) => match[0]), 48);
  const floorplans = uniqueImages(allImages.filter(looksLikeFloorplan), 8);
  const visualImages = allImages.filter((image) => !floorplans.includes(image));
  const exteriors = uniqueImages(visualImages.filter((image) => /(exterior|facade|fa[cç]ade|elevation|tower|aerial|masterplan|building|residence|waterfront|landscape|cgi\d*)/i.test(image)), 12);
  const interiors = uniqueImages(visualImages.filter((image) => /(interior|living|bedroom|kitchen|lobby|bathroom|dining|lounge|reception|co[_-]?working)/i.test(image)), 12)
    .filter((image) => !exteriors.includes(image));
  return {
    gallery: uniqueImages([hero, ...visualImages], 24),
    exteriors,
    interiors,
    floorplans,
  };
}

function emirateFromText(value: string) {
  const matches: Array<[RegExp, string]> = [
    [/\bAbu Dhabi\b/i, "Abu Dhabi"],
    [/\bRas Al Khaimah|\bRAK\b/i, "Ras Al Khaimah"],
    [/\bSharjah\b/i, "Sharjah"],
    [/\bAjman\b/i, "Ajman"],
    [/\bFujairah\b/i, "Fujairah"],
    [/\bUmm Al Quwain\b/i, "Umm Al Quwain"],
    [/\bDubai\b/i, "Dubai"],
  ];
  return matches.find(([pattern]) => pattern.test(value))?.[1] || "";
}

function normalizeProjectSlug(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/^\/projects\/([a-z0-9-]+)\/?$/i);
    return match?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function projectName(title: string, slug: string) {
  const cleaned = clean(title
    .split("|")[0]
    .replace(/\s*[|–]\s*(?:OPR|Metropolitan).*$/i, "")
    .replace(/\s+(?:Apartments?|Villas?|Townhouses?|Penthouses?)\s+(?:for sale\s+)?(?:in|at)\s+.*$/i, ""), 140);
  if (cleaned.length >= 3) return cleaned;
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function priceFromText(text: string) {
  const match = text.match(/(?:starting price|prices? start(?:ing)?(?:\s+from)?|from)\s*:?\s*(?:at\s+)?AED\s*([\d.,]+)\s*([mk])?/i)
    || text.match(/AED\s*([\d.,]+)\s*([mk])?\s*(?:starting price|onwards?)/i);
  if (!match) return 0;
  const suffix = (match[2] || "").toLowerCase();
  const numeric = suffix
    ? Number(match[1].replace(",", ".").replace(/[^\d.]/g, ""))
    : Number(match[1].replace(/[^\d]/g, ""));
  const amount = numeric * (suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1);
  return Number.isFinite(amount) && amount >= 250_000 && amount <= 250_000_000 ? Math.round(amount) : 0;
}

function projectTypesFromText(text: string) {
  const matches: Array<[RegExp, string]> = [
    [/\bapartments?\b/i, "Apartments"],
    [/\bvillas?\b/i, "Villas"],
    [/\btownhouses?\b/i, "Townhouses"],
    [/\bpenthouses?\b/i, "Penthouses"],
    [/\bmansions?\b/i, "Mansions"],
    [/\boffices?\b/i, "Offices"],
  ];
  return matches.filter(([pattern]) => pattern.test(text)).map(([, label]) => label).slice(0, 4);
}

function bedroomsFromText(text: string) {
  const values = new Set<string>();
  if (/\bstudios?\b/i.test(text)) values.add("Studios");
  for (const match of text.matchAll(/\b([1-6])\s*(?:-|to|–)?\s*([1-6])?\s*(?:BR|bedrooms?)\b/gi)) {
    const start = Number(match[1]);
    const end = Number(match[2] || start);
    for (let bedrooms = start; bedrooms <= Math.min(end, 6); bedrooms += 1) values.add(`${bedrooms}BR`);
  }
  return [...values].slice(0, 7);
}

function areaFromText(text: string, emirate: string) {
  const location = text.match(/\bLocation\s*:?\s*([A-Z][A-Za-z0-9 '&().-]{2,70}?)(?=\s+(?:Download|About|Project|Property|Starting|Payment|Handover|Developer)\b)/i)?.[1]
    || text.match(/\b(?:located|set|situated)\s+(?:in|at)\s+([A-Z][A-Za-z0-9 '&().-]{2,55}?)(?=[,.;]|\s+(?:in|within)\s+(?:Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah))/i)?.[1]
    || "";
  return clean(location || emirate, 100);
}

function developerFromText(text: string, title: string) {
  return clean(
    text.match(/\bDeveloper\s*:?\s*([A-Z][A-Za-z0-9 &'().-]{2,65}?)(?=\s+(?:Location|Download|About|Project|Property|Starting|Payment|Handover)\b)/i)?.[1]
      || title.match(/\bby\s+([^|–-]{2,65})(?:\s+(?:at|in)\b|$)/i)?.[1]
      || "Developer confirmation pending",
    90,
  );
}

function parseProjectPage(sourceUrl: string, html: string) {
  const slug = normalizeProjectSlug(sourceUrl);
  const plain = stripHtml(html);
  const title = meta(html, "og:title") || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const name = projectName(stripHtml(title, 220), slug);
  const description = clean(meta(html, "description") || meta(html, "og:description"), 700);
  const primaryContext = `${slug} ${stripHtml(title, 220)} ${description}`;
  if (/\b(?:egypt|cairo|ras el hekma|north coast|saudi arabia|jeddah|riyadh|qatar|doha|georgia|tbilisi|batumi|bali|indonesia|montenegro)\b/i.test(primaryContext)) return null;
  const emirate = emirateFromText(primaryContext);
  const propertyTypes = projectTypesFromText(primaryContext);
  if (!slug || !name || !emirate || !propertyTypes.length) return null;
  const payment = plain.match(/\b(?:payment plan)\s*:?\s*(?:easy\s+)?(\d{1,3}\s*\/\s*\d{1,3})\b/i)?.[1]
    || plain.match(/\b(\d{1,3}\s*\/\s*\d{1,3})\s*(?:payment plan)\b/i)?.[1]
    || "On request";
  const handover = clean(
    plain.match(/\bHandover\s*:?\s*((?:Q[1-4]\s*)?20\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}|Completed|Ready|TBA)/i)?.[1]
      || "To be confirmed",
    40,
  );
  const image = safeSourceImage(meta(html, "og:image"));
  const media = projectMediaFromHtml(html, image);
  return {
    slug,
    name,
    developer: developerFromText(plain, name),
    emirate,
    area: areaFromText(plain, emirate),
    startingPrice: priceFromText(plain),
    paymentPlan: payment === "On request" ? payment : payment.replace(/\s+/g, ""),
    handover,
    image,
    media,
    bedrooms: bedroomsFromText(primaryContext),
    propertyTypes,
    summary: description || `${name} is a newly monitored UAE development. Live unit pricing and availability require advisor confirmation.`,
    sourceUrl,
  };
}

function candidateProjectUrls(sitemap: string) {
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/opr\.ae\/projects\/[^<]+)<\/loc>/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => normalizeProjectSlug(url));
  return urls.slice(-220).reverse();
}

export async function syncLatestProjectLaunches(env: Env) {
  const sitemap = await fetchText(PROJECT_SITEMAP, 1_200_000);
  if (!sitemap) return { checked: 0, published: 0 };
  const candidates = candidateProjectUrls(sitemap)
    .filter((url) => {
      const slug = normalizeProjectSlug(url);
      return slug && !knownProjectSlugs.has(slug) && !/(?:egypt|cairo|ras-el-hekma|georgia|tbilisi|batumi|bali|jeddah|riyadh|doha|montenegro|red-sea|north-coast)/i.test(slug);
    });
  if (!candidates.length) return { checked: 0, published: 0 };
  const lookupCandidates = candidates.slice(0, 40);
  const existing = await env.DB.prepare(
    "SELECT source_url FROM hg_project_feed WHERE source_url IN (" + lookupCandidates.map(() => "?").join(",") + ")",
  ).bind(...lookupCandidates).all<{ source_url: string }>();
  const seen = new Set(existing.results.map((row) => row.source_url));
  const pending = candidates.filter((url) => !seen.has(url)).slice(0, PROJECT_FETCH_LIMIT);
  let published = 0;
  for (const sourceUrl of pending) {
    try {
      const html = await fetchText(sourceUrl, 1_800_000);
      const project = html ? parseProjectPage(sourceUrl, html) : null;
      if (!project) continue;
      await env.DB.prepare(
        `INSERT INTO hg_project_feed
         (slug, name, developer, emirate, area, starting_price, payment_plan, handover,
          image_url, media_json, bedrooms_json, property_types_json, summary, source_url, status,
          source_checked_at, discovered_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(slug) DO UPDATE SET
           name = excluded.name, developer = excluded.developer, emirate = excluded.emirate,
           area = excluded.area, starting_price = excluded.starting_price,
           payment_plan = excluded.payment_plan, handover = excluded.handover,
           image_url = excluded.image_url, media_json = excluded.media_json,
           bedrooms_json = excluded.bedrooms_json,
           property_types_json = excluded.property_types_json, summary = excluded.summary,
           source_url = excluded.source_url, status = 'published',
           source_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      ).bind(
        project.slug,
        project.name,
        project.developer,
        project.emirate,
        project.area,
        project.startingPrice,
        project.paymentPlan,
        project.handover,
        project.image,
        JSON.stringify(project.media),
        JSON.stringify(project.bedrooms),
        JSON.stringify(project.propertyTypes),
        project.summary,
        project.sourceUrl,
      ).run();
      published += 1;
    } catch (error) {
      console.error(JSON.stringify({
        event: "project_feed_sync_failed",
        sourceUrl,
        message: error instanceof Error ? error.message.slice(0, 240) : "Unknown sync error",
      }));
    }
  }
  console.log(JSON.stringify({ event: "project_feed_sync_complete", checked: pending.length, published }));
  return { checked: pending.length, published };
}

function sourcePublishedAt(html: string, plain: string) {
  const candidate = meta(html, "article:published_time")
    || meta(html, "datePublished")
    || html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]
    || plain.match(/\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/i)?.[1]
    || "";
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function marketSourceDocument(source: typeof MARKET_SOURCES[number]): Promise<MarketSourceDocument | null> {
  const html = await fetchText(source.url, 1_800_000);
  if (!html) return null;
  const text = stripHtml(html);
  const title = meta(html, "og:title") || meta(html, "twitter:title") || stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "", 220);
  const description = meta(html, "description") || meta(html, "og:description");
  if (!title || !/\b(?:real estate|property|residential|transaction|rental|investment)\b/i.test(`${title} ${description} ${text.slice(0, 8_000)}`)) return null;
  return {
    label: source.label,
    url: source.url,
    title: clean(title, 220),
    description: clean(description, 900),
    publishedAt: sourcePublishedAt(html, text),
    image: safeSourceImage(meta(html, "og:image")),
    text: text.slice(0, 18_000),
    priority: source.priority,
  };
}

function parseAiDailyInsight(value: unknown): AiDailyInsight | null {
  try {
    const source = value && typeof value === "object"
      ? value
      : typeof value === "string"
        ? JSON.parse(value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""))
        : null;
    if (!source || typeof source !== "object") return null;
    const record = source as { title?: unknown; dek?: unknown; paragraphs?: unknown };
    const paragraphs = Array.isArray(record.paragraphs)
      ? record.paragraphs.map((paragraph) => clean(paragraph, 1_200)).filter((paragraph) => paragraph.length >= 80).slice(0, 5)
      : [];
    const title = clean(record.title, 150);
    const dek = clean(record.dek, 320);
    return title && dek && paragraphs.length >= 3 ? { title, dek, paragraphs } : null;
  } catch {
    return null;
  }
}

function fallbackDailyInsight(source: MarketSourceDocument, marketDate: string): AiDailyInsight {
  const displayDate = new Date(`${marketDate}T08:00:00+04:00`).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  });
  return {
    title: `Dubai real estate: the constructive signals to watch on ${displayDate}`,
    dek: source.description || "A concise daily reading of verified Dubai market evidence, with the opportunity and the decision checks kept in view.",
    paragraphs: [
      `${source.title}. This dated release provides the current evidence reference for this note. The useful signal is not the headline alone, but how transaction depth, pricing, investor participation and delivery activity interact.`,
      "For buyers, constructive market momentum should strengthen due diligence rather than replace it. Compare like-for-like achieved evidence, service charges, payment timing, competing supply and the resale or leasing depth of the exact community.",
      "The practical opportunity is selective: stronger projects combine credible delivery, usable layouts, transparent costs and a location with durable end-user demand. Live availability, unit pricing and any projected return still require advisor confirmation.",
    ],
  };
}

function dubaiMarketDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function syncDailyMarketInsight(env: Env) {
  const marketDate = dubaiMarketDate();
  const existing = await env.DB.prepare(
    "SELECT slug FROM hg_daily_insights WHERE market_date = ? AND status = 'published' LIMIT 1",
  ).bind(marketDate).first<{ slug: string }>();
  if (existing?.slug) return { marketDate, published: false, slug: existing.slug };

  const documents = (await Promise.all(MARKET_SOURCES.map((source) => marketSourceDocument(source))))
    .filter((document): document is MarketSourceDocument => Boolean(document))
    .sort((left, right) => Date.parse(right.publishedAt || "1970-01-01") - Date.parse(left.publishedAt || "1970-01-01")
      || left.priority - right.priority);
  const source = documents[0];
  if (!source) return { marketDate, published: false, slug: "" };

  let generated: AiDailyInsight | null = null;
  try {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        dek: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      },
      required: ["title", "dek", "paragraphs"],
    };
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        {
          role: "system",
          content: "Write an original PSR daily Dubai real-estate insight from the supplied verified source only. Lead with constructive, opportunity-aware evidence, but stay balanced and analytical. Do not invent statistics, yields, forecasts, legal claims, availability or prices. Do not copy source sentences or mention another brokerage. Explain what the evidence means for a buyer or investor and include one due-diligence consideration. Use polished plain English, a concise title, a two-sentence deck, and 3–5 paragraphs of 70–110 words each.",
        },
        {
          role: "user",
          content: JSON.stringify({
            marketDate,
            sourceLabel: source.label,
            sourceTitle: source.title,
            sourcePublishedAt: source.publishedAt,
            sourceDescription: source.description,
            evidenceExtract: source.text.slice(0, 12_000),
          }),
        },
      ],
      max_tokens: 900,
      temperature: 0.35,
      response_format: { type: "json_schema", json_schema: schema },
    }) as { response?: unknown };
    generated = parseAiDailyInsight(result.response);
  } catch (error) {
    console.error(JSON.stringify({
      event: "daily_insight_ai_failed",
      message: error instanceof Error ? error.message.slice(0, 240) : "Unknown AI error",
    }));
  }
  const article = generated || fallbackDailyInsight(source, marketDate);
  const slug = `dubai-market-daily-${marketDate}`;
  const fallbackImages = [
    "/insights/dubai-zabeel-skyline.jpg",
    "/insights/business-bay-waterfront.jpg",
    "/insights/dubai-marina-residences.jpg",
  ];
  // Source pages frequently expose social cards with typography. The public
  // article deliberately uses a reviewed, local photograph with no embedded text.
  const image = fallbackImages[new Date(`${marketDate}T00:00:00Z`).getUTCDate() % fallbackImages.length];
  await env.DB.prepare(
    `INSERT INTO hg_daily_insights
     (slug, title, dek, body_json, category, source_label, source_url,
      source_published_at, image_url, market_date, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Daily market lens', ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, dek = excluded.dek, body_json = excluded.body_json,
       source_label = excluded.source_label, source_url = excluded.source_url,
       source_published_at = excluded.source_published_at, image_url = excluded.image_url,
       status = 'published', updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    slug,
    article.title,
    article.dek,
    JSON.stringify(article.paragraphs),
    source.label,
    source.url,
    source.publishedAt,
    image,
    marketDate,
  ).run();
  console.log(JSON.stringify({ event: "daily_insight_published", marketDate, slug, source: source.label }));
  return { marketDate, published: true, slug };
}

function stringArray(value: string, maxItemLength = 80, maxItems = 10) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => clean(item, maxItemLength)).filter(Boolean).slice(0, maxItems)
      : [];
  } catch {
    return [];
  }
}

function projectMedia(value: string, fallbackImage: string) {
  try {
    const parsed = JSON.parse(value) as Partial<Record<"gallery" | "exteriors" | "interiors" | "floorplans", unknown>>;
    const mediaArray = (field: keyof typeof parsed, maxItems: number) => {
      const items = parsed[field];
      return Array.isArray(items)
        ? uniqueImages(items.filter((item): item is string => typeof item === "string"), maxItems)
        : [];
    };
    return organizeProjectMedia({
      gallery: uniqueImages([fallbackImage, ...mediaArray("gallery", 24)], 24),
      exteriors: mediaArray("exteriors", 12),
      interiors: mediaArray("interiors", 12),
      floorplans: mediaArray("floorplans", 8),
    });
  } catch {
    return {
      gallery: filterPhotographyAssets(uniqueImages([fallbackImage], 1)),
      exteriors: [] as string[],
      interiors: [] as string[],
      floorplans: [] as string[],
    };
  }
}

function formatPrice(amount: number) {
  return Number.isFinite(amount) && amount >= 250_000
    ? `AED ${Math.round(amount).toLocaleString("en-AE")}`
    : "Price on request";
}

function safeCatalogueArea(value: string) {
  const area = clean(value, 100);
  return /^AED\s*[\d,.]+$/i.test(area) ? "Location to be confirmed" : area || "Location to be confirmed";
}

function safeCataloguePaymentPlan(value: string) {
  const plan = clean(value.replace(/Payment Plan/gi, ""), 40);
  if (!/^\d+(?:\s*\/\s*\d+)+$/.test(plan)) return plan || "To be confirmed";
  const total = plan.split("/").reduce((sum, milestone) => sum + Number(milestone.trim()), 0);
  return total === 100 ? plan : "To be confirmed";
}

function projectPublicRecord(row: ProjectFeedRow) {
  const media = projectMedia(row.media_json, row.image_url);
  const image = selectPhotographyAsset(row.image_url, [...media.gallery, ...media.exteriors, ...media.interiors]);
  return {
    slug: row.slug,
    title: row.name,
    name: row.name,
    developer: row.developer,
    emirate: row.emirate,
    area: safeCatalogueArea(row.area),
    image,
    price: formatPrice(row.starting_price),
    startingPrice: row.starting_price,
    paymentPlan: safeCataloguePaymentPlan(row.payment_plan),
    handover: clean(row.handover, 40) || "To be confirmed",
    bedrooms: stringArray(row.bedrooms_json),
    propertyTypes: stringArray(row.property_types_json),
    summary: row.summary,
    ...media,
    statusLabel: "Latest launch",
    href: `/projects/latest/${row.slug}`,
    updatedAt: row.discovered_at,
  };
}

function dailyInsightPublicRecord(row: DailyInsightRow) {
  return {
    slug: row.slug,
    title: row.title,
    dek: row.dek,
    paragraphs: stringArray(row.body_json, 1_200, 5),
    category: row.category,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    image: row.image_url,
    marketDate: row.market_date,
    publishedAt: row.published_at,
    href: `/insights/daily?article=${encodeURIComponent(row.slug)}`,
  };
}

function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=900",
    },
  });
}

export async function handleContentRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.pathname === "/api/project-updates") {
    const slug = clean(url.searchParams.get("slug"), 180);
    if (slug) {
      const row = await env.DB.prepare(
        `SELECT slug, name, developer, emirate, area, starting_price, payment_plan,
                handover, image_url, media_json, bedrooms_json, property_types_json, summary, discovered_at
         FROM hg_project_feed WHERE slug = ? AND status = 'published' LIMIT 1`,
      ).bind(slug).first<ProjectFeedRow>();
      return row ? jsonResponse({ project: projectPublicRecord(row) }) : jsonResponse({ error: "Project not found." }, 404);
    }
    const result = await env.DB.prepare(
      `SELECT slug, name, developer, emirate, area, starting_price, payment_plan,
              handover, image_url, media_json, bedrooms_json, property_types_json, summary, discovered_at
       FROM hg_project_feed WHERE status = 'published'
       ORDER BY discovered_at DESC LIMIT 24`,
    ).all<ProjectFeedRow>();
    if (!result.results.length) ctx.waitUntil(syncLatestProjectLaunches(env));
    return jsonResponse({
      projects: result.results.filter((row) => !curatedProjectFeedAliases.has(row.slug)).map(projectPublicRecord),
      updatedAt: new Date().toISOString(),
    });
  }
  if (url.pathname === "/api/market-daily") {
    const slug = clean(url.searchParams.get("slug"), 180);
    const where = slug ? "AND slug = ?" : "";
    const statement = env.DB.prepare(
      `SELECT slug, title, dek, body_json, category, source_label, source_url,
              source_published_at, image_url, market_date, published_at
       FROM hg_daily_insights WHERE status = 'published' ${where}
       ORDER BY market_date DESC LIMIT ${slug ? 1 : 30}`,
    );
    const result = slug
      ? await statement.bind(slug).all<DailyInsightRow>()
      : await statement.all<DailyInsightRow>();
    if (!result.results.length) ctx.waitUntil(syncDailyMarketInsight(env));
    if (slug) {
      const article = result.results[0];
      return article ? jsonResponse({ article: dailyInsightPublicRecord(article) }) : jsonResponse({ error: "Article not found." }, 404);
    }
    return jsonResponse({ articles: result.results.map(dailyInsightPublicRecord), updatedAt: new Date().toISOString() });
  }
  return null;
}

export async function mergeProjectCatalogueResponse(
  request: Request,
  env: Env,
  baseResponse: Response,
  loadStaticCataloguePage: (page: number) => Promise<Response>,
) {
  if (!baseResponse.ok) return baseResponse;
  const contentType = baseResponse.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return baseResponse;
  const payload = await baseResponse.json() as {
    projects?: Array<Record<string, unknown>>;
    total?: number;
    page?: number;
    pages?: number;
    filters?: { emirates?: Record<string, number>; developers?: string[]; propertyTypes?: string[] };
  };
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 120).toLowerCase();
  const emirate = clean(url.searchParams.get("emirate"), 80);
  const developer = clean(url.searchParams.get("developer"), 100).toLowerCase();
  const propertyType = clean(url.searchParams.get("type"), 80);
  const requestedPage = Number(url.searchParams.get("page") || 1);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const perPage = 24;
  let result: D1Result<ProjectFeedRow>;
  try {
    result = await env.DB.prepare(
      `SELECT slug, name, developer, emirate, area, starting_price, payment_plan,
              handover, image_url, media_json, bedrooms_json, property_types_json, summary, discovered_at
       FROM hg_project_feed WHERE status = 'published'
       ORDER BY discovered_at DESC LIMIT 60`,
    ).all<ProjectFeedRow>();
  } catch (error) {
    // A fresh local preview may not have the optional live-feed migration yet.
    // The versioned 1,300+ project registry remains the authoritative fallback.
    console.warn(JSON.stringify({
      event: "project_feed_merge_skipped",
      message: error instanceof Error ? error.message.slice(0, 240) : "Live project feed unavailable",
    }));
    return jsonResponse(payload);
  }
  const seenSlugs = new Set(knownProjectSlugs);
  const seenIdentities = new Set(knownProjectIdentities);
  const uniquePublishedProjects = result.results
    .map(projectPublicRecord)
    .filter((project) => {
      const identity = projectCardIdentity(project);
      if (seenSlugs.has(project.slug) || seenIdentities.has(identity)) return false;
      seenSlugs.add(project.slug);
      seenIdentities.add(identity);
      return true;
    });
  const matching = uniquePublishedProjects
    .filter((project) => {
      const searchable = `${project.name} ${project.developer} ${project.area} ${project.emirate} ${project.propertyTypes.join(" ")} ${project.bedrooms.join(" ")}`.toLowerCase();
      return (!query || query.split(/\s+/).every((term) => searchable.includes(term)))
        && (!emirate || project.emirate === emirate)
        && (!developer || project.developer.toLowerCase() === developer)
        && (!propertyType || project.propertyTypes.includes(propertyType));
    });
  const baseProjects = Array.isArray(payload.projects) ? payload.projects : [];
  const staticTotal = Math.max(0, Number(payload.total || 0));
  const unionOffset = (page - 1) * perPage;
  const liveProjects = matching.slice(unionOffset, unionOffset + perPage);
  const staticStart = Math.max(0, unionOffset - matching.length);
  const staticNeeded = perPage - liveProjects.length;
  const staticProjects: Array<Record<string, unknown>> = [];

  try {
    let staticPage = Math.floor(staticStart / perPage) + 1;
    let staticPageOffset = staticStart % perPage;
    while (staticProjects.length < staticNeeded && (staticPage - 1) * perPage < staticTotal) {
      let projects: Array<Record<string, unknown>>;
      if (staticPage === page) {
        projects = baseProjects;
      } else {
        const response = await loadStaticCataloguePage(staticPage);
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error(`Static catalogue page ${staticPage} was unavailable.`);
        }
        const staticPayload = await response.json() as { projects?: Array<Record<string, unknown>> };
        projects = Array.isArray(staticPayload.projects) ? staticPayload.projects : [];
      }
      staticProjects.push(...projects.slice(staticPageOffset, staticPageOffset + staticNeeded - staticProjects.length));
      staticPage += 1;
      staticPageOffset = 0;
    }
  } catch (error) {
    console.warn(JSON.stringify({
      event: "project_catalogue_pagination_merge_skipped",
      message: error instanceof Error ? error.message.slice(0, 240) : "Static catalogue page unavailable",
    }));
    return jsonResponse(payload);
  }

  payload.projects = [...liveProjects, ...staticProjects];
  payload.total = staticTotal + matching.length;
  payload.page = page;
  payload.pages = Math.max(1, Math.ceil(payload.total / perPage));
  const filters = payload.filters || {};
  const emirates = { ...(filters.emirates || {}) };
  for (const project of uniquePublishedProjects) {
    emirates[project.emirate] = (emirates[project.emirate] || 0) + 1;
  }
  payload.filters = {
    emirates,
    developers: [...new Set([...(filters.developers || []), ...uniquePublishedProjects.map((project) => project.developer)])].sort(),
    propertyTypes: [...new Set([...(filters.propertyTypes || []), ...uniquePublishedProjects.flatMap((project) => project.propertyTypes)])].sort(),
  };
  return jsonResponse(payload);
}
