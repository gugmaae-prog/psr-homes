import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const API = "https://opr-search.mpp.agency/api/projects?populate=*&pagination[pageSize]=1500&sort=id:desc";
const SITEMAP = "https://opr.ae/sitemap.xml";
const destination = resolve(process.cwd(), "data/projects.json");

const decode = (value = "") => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
const clean = (value = "") => decode(value).replace(/\s*[|–-]\s*OPR(?:\.AE)?.*$/i, "").replace(/Metropolitan Premium Properties/gi, "PSR").replace(/OPR(?:\.AE)?/gi, "PSR").replace(/\s+/g, " ").trim();
const relationNames = (relation) => (relation?.data || []).map((item) => clean(item.attributes?.name)).filter(Boolean);
const singleName = (relation) => clean(relation?.data?.attributes?.name || "");
const slugFromLink = (link = "") => link.match(/\/projects\/([^/?#]+)/)?.[1] || "";
const trustedMediaHosts = new Set(["cdn.opr.ae", "img1.creatium.ru", "img2.creatium.ru", "img3.creatium.ru", "i.1.creatium.io"]);

function sanitizeProjectImage(value = "") {
  if (!value) return "";
  let parsed;
  try { parsed = new URL(decode(value).split("#")[0]); } catch { return ""; }
  const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
  if (parsed.protocol !== "https:" || !trustedMediaHosts.has(parsed.hostname)) return "";
  if (!/\.(?:jpe?g|png|webp|avif)$/.test(pathname)) return "";
  if (/(?:^|[/_.-])(logo|favicon|icon|icn\d*|pattern|whatsapp|telegram|agent|quiz|flag|mockup|qr(?:code)?|barcode|scan[-_]?me|arrow|avatar|phone|blur|mobile?|map_?pin)(?:[/_.-]|$)|dubai_neighborhood/.test(pathname)) return "";
  return parsed.href;
}

function emirateFor(area = "", slug = "") {
  const value = `${area} ${slug}`.toLowerCase();
  if (/abu[ -]dhabi|yas[ -]island|saadiyat|reem[ -]island|hudayriyat|zayed[ -]city|al[ -]marfah|fahid[ -]island|ramhan|jubail[ -]island/.test(value)) return "Abu Dhabi";
  if (/ras[ -]al[ -]khaimah|al[ -]marjan|mina[ -]al[ -]arab|hayat[ -]island|rak[ -]central|al[ -]hamra/.test(value)) return "Ras Al Khaimah";
  if (/sharjah|aljada|masaar|maryam[ -]island|al[ -]zahia|al[ -]mamsha|ajmal[ -]makan|al[ -]belaida/.test(value)) return "Sharjah";
  if (/umm[ -]al[ -]quwain|siniya/.test(value)) return "Umm Al Quwain";
  if (/ajman|al[ -]zorah/.test(value)) return "Ajman";
  if (/fujairah/.test(value)) return "Fujairah";
  return "Dubai";
}

function isUaeRecord(attributes) {
  const coords = String(attributes.LatLng || "").split(",").map(Number);
  if (coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) return coords[0] >= 22.5 && coords[0] <= 26.5 && coords[1] >= 51 && coords[1] <= 56.8;
  const text = `${singleName(attributes.area)} ${attributes.Link}`.toLowerCase();
  return !/(oman|muscat|salalah|jebel-sifah|jeddah|saudi|riyadh|shura|laheq|red-sea|ksa|tbilisi|batumi|georgia|cairo|egypt|makadi|bali|montenegro|chakvi|shekvetili|sodic|north-coast)/.test(text);
}

function fromApi(item) {
  const a = item.attributes; const area = singleName(a.area); const slug = slugFromLink(a.Link);
  const developerOverrides = { "luxury-apartments-address-grand-downtown": "Nshama", "w-hotel-residences-dalands-al-marjan-island": "Dalands, DarGlobal, Marjan & Marriott International" };
  return {
    slug, name: clean(a.ProjectName), developer: singleName(a.developer) || developerOverrides[slug] || "Independent developer", emirate: emirateFor(area, slug), area: area || emirateFor("", slug),
    startingPrice: a.StartingPrice || "", paymentPlan: clean(a.PaymentPlan || a.RedSticker || ""), handover: singleName(a.handover), image: a.ImageLink || "", brochure: a.PDF || "",
    bedrooms: relationNames(a.bedrooms), propertyTypes: relationNames(a.property_types), lifestyles: relationNames(a.life_styles), coordinates: a.LatLng || "", description: "", archived: false, sourceUpdatedAt: a.updatedAt || ""
  };
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || []; const tag = tags.find((item) => new RegExp(`(?:property|name)=["']${key}["']`, "i").test(item));
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] || "";
}

function textFrom(html) { return decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); }
function firstProjectImage(html) { return (html.match(/https:\/\/(?:img1\.creatium\.ru|i\.1\.creatium\.io|cdn\.opr\.ae)[^"'\s)<]+\.(?:jpe?g|png|webp)[^"'\s)<]*/i)?.[0] || "").split("#")[0]; }

async function fetchText(url, timeout = 45000, attempts = 2) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
    try { const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "PSR-Registry/1.0" } }); if (response.ok) return await response.text(); }
    catch { /* retry transient source failures */ } finally { clearTimeout(timer); }
  }
  return "";
}

function fromArchive(slug, html) {
  if (!html || !/("@type"\s*:\s*"Product"|itemtype="https?:\/\/schema\.org\/(?:Apartment|Product)")/i.test(html)) return null;
  const plain = textFrom(html); const rawTitle = clean(meta(html, "og:title") || meta(html, "twitter:title") || slug.replace(/-/g, " "));
  const name = rawTitle.replace(/\s+(?:Apartments?|Villas?|Townhouses?|Residences?)\s+(?:in|at|for).*$/i, "").replace(/\s+[|–-].*$/, "").trim();
  const locality = clean(html.match(/itemprop=["']addressLocality["'][^>]*>([^<]+)/i)?.[1] || rawTitle.match(/\b(?:in|at|on)\s+([^|–]+?)(?:\s+by\s+|$)/i)?.[1] || "Dubai");
  const country = clean(html.match(/itemprop=["']addressCountry["'][^>]*>([^<]+)/i)?.[1] || "");
  const evidence = `${country} ${locality} ${slug}`.toLowerCase();
  if (country && !/(uae|united arab emirates)/i.test(country)) return null;
  if (/(oman|muscat|salalah|jebel-sifah|jeddah|saudi|riyadh|shura|laheq|red-sea|ksa|tbilisi|batumi|georgia|cairo|egypt|makadi|bali|montenegro|chakvi|shekvetili|sodic|north-coast)/.test(evidence)) return null;
  const developer = clean(rawTitle.match(/\s+by\s+([^|–]+?)(?:\s+(?:in|at|on|for)\s+|$)/i)?.[1] || slug.split("-")[0]);
  const price = plain.match(/(?:Starting Price|Price From|From)\s*[:–-]?\s*(AED\s*[\d,.]+\s*[MK]?)/i) || plain.match(/(AED\s*[\d,.]+\s*[MK]?)\s*(?:Starting Price|Price From)/i);
  const payment = plain.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*(?:Payment Plan)?/i); const handover = plain.match(/(?:Handover|Completion(?: Due Date)?)\s*[:–-]?\s*(Q[1-4]\s*20\d{2}|20\d{2})/i);
  return { slug, name: name || slug.replace(/-/g, " "), developer: developer || "Independent developer", emirate: emirateFor(locality, slug), area: locality, startingPrice: price?.[1] || "", paymentPlan: payment ? `${payment[1]}/${payment[2]} Payment Plan` : "", handover: handover?.[1] || "", image: decode(meta(html, "og:image")).split("#")[0] || firstProjectImage(html), brochure: "", bedrooms: [], propertyTypes: [], lifestyles: [], coordinates: "", description: clean(meta(html, "description")), archived: true, sourceUpdatedAt: "" };
}

async function mapConcurrent(items, limit, mapper) {
  const results = new Array(items.length); let cursor = 0;
  async function worker() { while (cursor < items.length) { const index = cursor++; results[index] = await mapper(items[index], index); } }
  await Promise.all(Array.from({ length: limit }, worker)); return results;
}

async function main() {
  const previous = await readFile(destination, "utf8").then(JSON.parse).catch(() => ({ projects: [] }));
  const previousArchive = new Map(previous.projects.filter((project) => project.archived).map((project) => [project.slug, project]));
  const [apiResponse, sitemapXml] = await Promise.all([fetch(API).then((r) => r.json()), fetchText(SITEMAP)]);
  const current = apiResponse.data.filter((item) => isUaeRecord(item.attributes)).map(fromApi).filter((item) => item.slug);
  const known = new Set(apiResponse.data.map((item) => slugFromLink(item.attributes.Link)).filter(Boolean));
  const sitemapSlugs = [...new Set([...sitemapXml.matchAll(/<loc>https:\/\/opr\.ae\/projects\/([^<\/]+)<\/loc>/g)].map((match) => match[1]))];
  const archiveSlugs = sitemapSlugs.filter((slug) => !known.has(slug));
  console.log(`Structured UAE projects: ${current.length}. Inspecting ${archiveSlugs.length} additional sitemap routes.`);
  const archive = (await mapConcurrent(archiveSlugs, 12, async (slug, index) => {
    if ((index + 1) % 50 === 0) console.log(`Inspected ${index + 1}/${archiveSlugs.length}`);
    return fromArchive(slug, await fetchText(`https://opr.ae/projects/${slug}`)) || previousArchive.get(slug) || null;
  })).filter(Boolean);
  const projects = [...new Map([...current, ...archive].map((project) => [project.slug, { ...project, image: sanitizeProjectImage(project.image) }])).values()].sort((a, b) => b.sourceUpdatedAt.localeCompare(a.sourceUpdatedAt) || a.name.localeCompare(b.name));
  const emirates = Object.fromEntries([...new Set(projects.map((item) => item.emirate))].sort().map((emirate) => [emirate, projects.filter((item) => item.emirate === emirate).length]));
  const developers = [...new Set(projects.map((item) => item.developer))].sort();
  const registry = { generatedAt: new Date().toISOString(), sourceProjectPages: sitemapSlugs.length, totalUaeProjects: projects.length, currentUaeProjects: projects.filter((project) => !project.archived).length, archivedUaeProjects: projects.filter((project) => project.archived).length, emirates, developers, projects };
  await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, JSON.stringify(registry));
  console.log(`Saved ${projects.length} UAE project routes to ${destination}`); console.log(emirates);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
