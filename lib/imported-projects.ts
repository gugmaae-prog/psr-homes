import registryData from "@/data/projects.json";
import projectMediaData from "@/data/project-media-overrides.json";
import { curatedLaunches, type LaunchUnit, type LaunchPayment, type LaunchDetail } from "@/data/curated-launches";
import { extractProjectPricePerSqft, extractSizeText, formatAedPerSqft, getAreaPricePerSqft, type PricePerSqft } from "@/lib/market-pricing";
import { DEFAULT_PROPERTY_PHOTO, filterPhotographyAssets, isPhotographyAsset, selectPhotographyAsset } from "@/lib/media-policy";
import { developerRootSlug } from "@/lib/developer-identity";
import { resolveProjectBrochure } from "@/lib/brochure-access";
import { reviewProjectPhotos } from "@/lib/reviewed-project-media";

export type TravelTime = { minutes: string; destination: string };
export type RegistryProject = {
  slug: string; name: string; developer: string; emirate: string; area: string; startingPrice: string; paymentPlan: string; handover: string; image: string; brochure: string;
  bedrooms: string[]; propertyTypes: string[]; lifestyles: string[]; coordinates: string; description: string; archived: boolean; sourceUpdatedAt: string;
  areaFrom?: string; pricePerSqft?: number; pricePerSqftUpdatedAt?: string; startingPriceLabel?: string; developerDisplay?: string; statusLabel?: string;
  sourceUrl?: string; sourceLabel?: string;
};
export type ImportedProject = {
  slug: string; title: string; location: string; emirate: string; developer: string; description: string; overview: string[]; hero: string;
  gallery: string[]; interiors: string[]; exteriors: string[]; floorplans: string[]; price: string; paymentPlan: string; handover: string;
  travelTimes: TravelTime[]; propertyTypes: string[]; bedrooms: string[]; lifestyles: string[]; amenities: string[]; investmentPoints: string[];
  averageSize: string; pricePerSqft: PricePerSqft | null; areaPricePerSqft: PricePerSqft | null; brochure: string; coordinates: string;
  developerDisplay?: string; statusLabel?: string; releaseNote?: string; unitPricing?: LaunchUnit[]; sourceUrl?: string; sourceLabel?: string;
  paymentSchedule?: LaunchPayment[]; launchDetails?: LaunchDetail[];
};
export type ProjectIndexTier = "A" | "B" | "C";

type Registry = { generatedAt: string; sourceProjectPages: number; totalUaeProjects: number; currentUaeProjects: number; archivedUaeProjects: number; emirates: Record<string, number>; developers: string[]; projects: RegistryProject[] };
type ProjectMediaOverride = { hero: string; gallery: string[]; interiors: string[]; exteriors: string[]; floorplans: string[]; sourceUrl: string; sourceLabel: string };
const rawRegistry = registryData as Registry;
const projectMediaOverrides = Object.fromEntries(Object.entries(projectMediaData as Record<string, ProjectMediaOverride>)
  .map(([slug, media]) => [slug, reviewProjectPhotos({ slug, ...media })]));
const reviewedCuratedLaunches = curatedLaunches.map(reviewProjectPhotos);
const SOURCE = "https://opr.ae";
const imagePattern = /https:\/\/(?:img1\.creatium\.ru|img2\.creatium\.ru|img3\.creatium\.ru|i\.1\.creatium\.io|cdn\.opr\.ae)[^\"'\s)<\\]+/gi;
const trustedMediaHosts = new Set(["cdn.opr.ae", "img1.creatium.ru", "img2.creatium.ru", "img3.creatium.ru", "i.1.creatium.io", "new-projects-media.propertyfinder.com", "szr2.crimsoncapedigital.com", "uae-cms.emaar.com", "asset.aldar.com", "www.rakproperties.ae", "rakproperties.ae", "reportagegroup.com", "www.reportagegroup.com", "reportageuae.com", "www.reportageuae.com", "ellingtonproperties.ae", "belgravia-square.ellingtonproperties.ae", "mirabellaproperties.com", "creekharbourproperties.com", "binghattiweb.imgix.net", "mira.static.bigapp.ae", "d8j0ntlcm91z4.cloudfront.net", "haus-grace-assets.thekeifferjapeth.workers.dev", "www.modon.com", "modon.com", "beyonddevelopments.ae", "www.beyonddevelopments.ae"]);

function normalizeProjectSlug(slug: string) {
  const candidate = slug.trim().replaceAll(" ", "%20");
  return /^[a-z0-9-]+(?:%20[a-z0-9-]+)*$/i.test(candidate) ? candidate : "";
}

function decode(value = "") { return value.replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&nbsp;|&#160;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—"); }
function cleanBrand(value = "") { return decode(value).replace(/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufeff\uffa0]/g, " ").replace(/\s*[|–-]\s*OPR(?:\.AE)?[^|–-]*/gi, "").replace(/Metropolitan Premium Properties/gi, "PSR").replace(/OPR(?:\.AE)?/gi, "PSR").replace(/\s+/g, " ").trim(); }
function meta(html: string, key: string) { const tags = html.match(/<meta\b[^>]*>/gi) || []; const tag = tags.find((item) => new RegExp(`(?:property|name)=["']${key}["']`, "i").test(item)); return tag?.match(/content=["']([^"']*)["']/i)?.[1] || ""; }
function stripHtml(html: string) { return cleanBrand(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")); }
function unique<T>(items: T[]) { return [...new Set(items)]; }
function normalizeImage(url: string) { return decode(url).split("#")[0].replace(/\\u0026/g, "&"); }
function usableImage(url: string) {
  if (!url) return false;
  if (url.startsWith("/")) return isPhotographyAsset(url);
  let parsed: URL;
  try { parsed = new URL(normalizeImage(url)); } catch { return false; }
  const lower = decodeURIComponent(parsed.pathname).toLowerCase();
  return parsed.protocol === "https:" && trustedMediaHosts.has(parsed.hostname) && /\.(?:jpe?g|png|webp|avif)$/.test(lower) && !/(?:^|[/_.-])(logo|favicon|icon|icn\d*|pattern|whatsapp|telegram|agent|quiz|flag|mockup|qr(?:code)?|barcode|scan[-_]?me|arrow|avatar|phone|blur|mobile?|map_?pin)(?:[/_.-]|$)|dubai_neighborhood/.test(lower);
}
function usablePhotographyImage(url: string) { return usableImage(url) && isPhotographyAsset(url); }
function usableDocumentImage(url: string) {
  if (!url) return false;
  if (url.startsWith("/")) return /\.(?:jpe?g|png|webp|avif)$/i.test(url.split(/[?#]/)[0]);
  let parsed: URL;
  try { parsed = new URL(normalizeImage(url)); } catch { return false; }
  const lower = decodeURIComponent(parsed.pathname).toLowerCase();
  return parsed.protocol === "https:" && trustedMediaHosts.has(parsed.hostname) && /\.(?:jpe?g|png|webp|avif)$/.test(lower);
}
function selectUsablePhotography(primary: string, alternatives: string[] = [], fallback = DEFAULT_PROPERTY_PHOTO) {
  return selectPhotographyAsset("", [primary, ...alternatives].filter(usableImage), fallback);
}
function unsafeImageContext(fragment: string, index: number, length: number) {
  const context = fragment.slice(Math.max(0, index - 420), Math.min(fragment.length, index + length + 520)).toLowerCase();
  return /(?:qr[-_ ]?code|quick response code|scan(?:\s|&nbsp;|-|_){0,3}(?:this|the)?(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|whatsapp(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|telegram(?:\s|&nbsp;|-|_){0,3}(?:qr|code)|download(?:\s|&nbsp;|-|_){0,3}(?:via|with)(?:\s|&nbsp;|-|_){0,3}qr|open(?:\s|&nbsp;|-|_){0,3}(?:in|with)(?:\s|&nbsp;|-|_){0,3}(?:whatsapp|telegram)|(?:other|similar|related)(?:\s|&nbsp;|-|_){0,3}(?:projects?|properties|developments?))/i.test(context);
}
function imagesIn(fragment: string) {
  return unique([...fragment.matchAll(imagePattern)]
    .filter((match) => !unsafeImageContext(fragment, match.index ?? 0, match[0].length))
    .map((match) => normalizeImage(match[0]))
    .filter(usableImage));
}

const curatedRecords: RegistryProject[] = reviewedCuratedLaunches.map((launch) => ({
  slug: launch.slug,
  name: launch.name,
  developer: launch.developer,
  developerDisplay: launch.developerDisplay,
  emirate: launch.emirate,
  area: launch.area,
  startingPrice: launch.startingPrice,
  startingPriceLabel: launch.startingPriceLabel,
  pricePerSqft: launch.pricePerSqft,
  pricePerSqftUpdatedAt: launch.pricePerSqft ? launch.sourceUpdatedAt : undefined,
  paymentPlan: launch.paymentPlan,
  handover: launch.handover,
  image: selectUsablePhotography(launch.image, [...launch.exteriors, ...launch.gallery, ...launch.interiors]),
  brochure: launch.brochure,
  bedrooms: launch.bedrooms,
  propertyTypes: launch.propertyTypes,
  lifestyles: launch.lifestyles,
  coordinates: launch.coordinates,
  description: launch.description,
  archived: launch.archived,
  sourceUpdatedAt: launch.sourceUpdatedAt,
  areaFrom: launch.areaFrom,
  statusLabel: launch.statusLabel,
  sourceUrl: launch.sourceUrl,
  sourceLabel: launch.sourceLabel,
}));
const curatedSlugs = new Set(curatedRecords.map((project) => project.slug));
/* One archived source page duplicated the same Peninsula Four release under a
 * second slug. The public registry keeps the current, richer record while the
 * old slug remains resolvable below. */
const verifiedProjectAliases: Record<string, string> = {
  "linar-alef-group-al-mamzar-sharjah": "linar-towers-d-e-al-mamzar-sharjah",
  "new-beachfront-destination-alef-group-al-mamzar-sharjah": "linar-towers-d-e-al-mamzar-sharjah",
  "seaside-hills-residences-al-zorah-ajman-for-sale-in-uae": "seaside-hills-residence-by-al-zorah-development-company-in-al-zorah-ajman",
  "select-group-peninsula-apartments-for-sale-in-business-bay-dubai": "peninsula-four-the-plaza-select-group-business-bay-dubai",
};
/* Source titles sometimes omit the phase even when its slug and supporting
 * material identify a separate release. Keep that distinction visible so two
 * legitimate phases never look like duplicate cards. */
const verifiedProjectDisplayNames: Record<string, string> = {
  "bay-villas-phase-3-dubai-islands-nakheel": "Bay Villas Phase 3",
  "linar-towers-d-e-al-mamzar-sharjah": "LINAR by Alef",
  "villas-sharjah-garden-city-al-belaida-sharjah": "Sharjah Garden City Phase 4",
};
const recoveredRegistryProjects = rawRegistry.projects
  .map(reviewProjectPhotos)
  .filter((project) => !curatedSlugs.has(project.slug) && !verifiedProjectAliases[project.slug])
  .map((project) => {
    const mediaOverride = projectMediaOverrides[project.slug];
    const recoveredHero = mediaOverride?.hero || "";
    return {
      ...project,
      image: selectUsablePhotography(project.image, [recoveredHero]),
      sourceUrl: mediaOverride?.sourceUrl || project.sourceUrl,
      sourceLabel: mediaOverride?.sourceLabel || project.sourceLabel,
    };
  });
const mergedProjects = [...curatedRecords, ...recoveredRegistryProjects].map((project) => ({
  ...project,
  name: verifiedProjectDisplayNames[project.slug] || cleanBrand(project.name),
  image: selectUsablePhotography(project.image),
  brochure: resolveProjectBrochure(project)?.href || "",
}));
const registry: Registry = {
  ...rawRegistry,
  totalUaeProjects: mergedProjects.length,
  currentUaeProjects: mergedProjects.filter((project) => !project.archived).length,
  archivedUaeProjects: mergedProjects.filter((project) => project.archived).length,
  emirates: mergedProjects.reduce<Record<string, number>>((counts, project) => {
    counts[project.emirate] = (counts[project.emirate] || 0) + 1;
    return counts;
  }, {}),
  developers: [...new Set(mergedProjects.map((project) => project.developer).filter(Boolean))].sort(),
  projects: mergedProjects,
};
const projectMap = new Map(registry.projects.map((project) => [project.slug, project]));
Object.entries(verifiedProjectAliases).forEach(([alias, canonical]) => {
  const project = projectMap.get(canonical);
  if (project) projectMap.set(alias, project);
});
const curatedMap = new Map(reviewedCuratedLaunches.map((project) => [project.slug, project]));

function normalizedProjectIdentityText(value: string) {
  return cleanBrand(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*emirate\)/g, " ")
    .replace(/\b(?:emirate of|emirate)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizedProjectIdentityLocation(area: string, emirate: string) {
  const emirateTokens = new Set(normalizedProjectIdentityText(emirate).split("-").filter(Boolean));
  return normalizedProjectIdentityText(area)
    .split("-")
    .filter((token) => token && token !== "emirate" && !emirateTokens.has(token))
    .join("-");
}

/** Conservative identity for public cards. Location remains part of the key
 * because the same branded project name can legitimately be reused in two
 * different UAE markets. Phase, tower and collection labels remain intact. */
export function projectIdentityKey(project: RegistryProject) {
  return [
    normalizedProjectIdentityText(project.name),
    developerRootSlug(project.developerDisplay || project.developer),
    normalizedProjectIdentityText(project.emirate),
    normalizedProjectIdentityLocation(project.area, project.emirate),
  ].join("|");
}

export function getUniqueActiveProjectRecords(projects: RegistryProject[] = registry.projects) {
  const identities = new Set<string>();
  const slugs = new Set<string>();
  return projects.filter((project) => {
    if (project.archived || slugs.has(project.slug)) return false;
    const identity = projectIdentityKey(project);
    if (identities.has(identity)) return false;
    slugs.add(project.slug);
    identities.add(identity);
    return true;
  });
}

function looksLikeFloorplan(url: string) { let decoded = url; try { decoded = decodeURIComponent(url); } catch { /* retain the normalized URL */ } return /(floor|floorplan|floor_plan|unit[_-]?plan|layout|(?:^|[/_-])\d{1,2}br[_-]|bed(?:room)?.*(?:sqft|area)|indoor.*balcony)/i.test(decoded); }
function groupedImages(fragment: string) {
  const matches = [...fragment.matchAll(/data-group=["']([^"']+)["']/gi)];
  const groups = new Map<string, string[]>();
  matches.forEach((match, index) => {
    const end = matches[index + 1]?.index ?? Math.min(fragment.length, (match.index ?? 0) + 1800);
    const images = imagesIn(fragment.slice(match.index ?? 0, end));
    if (!images.length) return;
    groups.set(match[1], unique([...(groups.get(match[1]) || []), ...images]));
  });
  return [...groups.values()];
}
function floorplanImages(html: string, allImages: string[]) {
  const filenamePlans = allImages.filter(looksLikeFloorplan);
  if (filenamePlans.length) return unique(filenamePlans);
  const galleryStart = html.search(/cr-slider-page_label[^>]*>[\s\S]{0,220}>\s*(?:<[^>]+>)*\s*Exteriors?\s*</i);
  const floorLabels = [...html.matchAll(/>\s*Floor\s*Plans?\s*</gi)].map((match) => match.index ?? -1).filter((index) => index >= 0 && (galleryStart < 0 || index < galleryStart));
  const idMarkers = [...html.matchAll(/<[^>]+(?:\bid|data-id)=["'](?:fp|floor)["'][^>]*>/gi)].map((match) => match.index ?? -1);
  const start = [...floorLabels, ...idMarkers].sort((a, b) => b - a)[0] ?? -1;
  if (start < 0) return unique(filenamePlans);

  const end = galleryStart > start ? galleryStart : Math.min(html.length, start + 180000);
  const section = html.slice(start, end);
  const groupedPlans = groupedImages(section).flat();
  const sectionPlans = groupedPlans.length ? groupedPlans : imagesIn(section).filter(looksLikeFloorplan);
  return unique(sectionPlans);
}
function formatPrice(raw = "") {
  if (!raw) return "On request"; if (/AED/i.test(raw)) return raw.replace(/(AED)\s*/i, "$1 ").replace(/,(?=\dM)/i, ".");
  const amount = Number(raw.replace(/[^\d.]/g, "")); return Number.isFinite(amount) && amount > 0 ? `AED ${amount.toLocaleString("en-AE")}` : raw;
}

function registryProjectPricePerSqft(record: RegistryProject): PricePerSqft | null {
  const value = Number(record.pricePerSqft || 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    basis: "project",
    value,
    display: formatAedPerSqft(value),
    label: record.statusLabel ? "Indicative AED/sqft" : "Project AED/sqft",
    period: record.pricePerSqftUpdatedAt ? `Updated ${new Date(record.pricePerSqftUpdatedAt).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}` : "Current project data",
    sourceLabel: "Project pricing text",
    sourceUrl: "",
    note: record.statusLabel ? "Indicative pre-launch price per square foot; reconfirm the selected unit area and live price before reservation." : "Published project price per square foot; reconfirm against the selected unit before reservation.",
  };
}

function labelledGallery(html: string) {
  const start = html.search(/cr-slider-page_label[^>]*>[\s\S]{0,180}>\s*(?:<[^>]+>)*\s*Exteriors?\s*</i);
  if (start < 0) return { exteriors: [] as string[], interiors: [] as string[] };
  const endOffset = html.slice(start).search(/>\s*(?:<[^>]+>)*\s*(?:Photo Gallery|Location &|Payment Plan|Amenities)\s*</i);
  const region = html.slice(start, endOffset > 0 ? start + endOffset : start + 220000);
  const labels = [...region.matchAll(/cr-slider-page_label[^>]*>([\s\S]*?)<\/div>/gi)].map((match) => stripHtml(match[1]).toLowerCase());
  const groups = groupedImages(region);
  const exteriorIndex = labels.findIndex((label) => /exterior/.test(label));
  const interiorIndex = labels.findIndex((label) => /interior/.test(label));
  return { exteriors: groups[exteriorIndex] || [], interiors: groups[interiorIndex] || [] };
}

function extractParagraphs(html: string, title: string) {
  const blocks = [...html.matchAll(/<(?:p|div)\b[^>]*(?:class=["'][^"']*(?:textable|cr-text)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:p|div)>/gi)].map((match) => stripHtml(match[1])).filter((text) => text.length >= 120 && text.length <= 1200 && !/(subscribe|privacy|cookie|mortgage|other property websites|complete a quiz|all developers)/i.test(text));
  const titleWords = title.toLowerCase().split(/\s+/).filter((word) => word.length > 3).slice(0, 3); return unique(blocks).sort((a, b) => Number(titleWords.some((word) => b.toLowerCase().includes(word))) - Number(titleWords.some((word) => a.toLowerCase().includes(word)))).slice(0, 3);
}

function investmentPoints(html: string) {
  const marker = html.search(/Investment Potential/i); if (marker < 0) return [];
  const fragment = html.slice(marker, marker + 14000); return unique([...fragment.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => stripHtml(match[1])).filter((text) => text.length > 15 && text.length < 260)).slice(0, 6);
}

export function getProjectRegistry() { return registry; }
export function getProjectRecord(slug: string) { const normalized = normalizeProjectSlug(slug); return normalized ? projectMap.get(normalized) || null : null; }
export async function getProjectSlugs(): Promise<string[]> { return registry.projects.map((project) => project.slug); }
export function getProjectIndexTier(slug: string): ProjectIndexTier {
  const record = getProjectRecord(slug);
  if (!record || record.archived) return "C";
  const curated = curatedMap.get(record.slug);
  if (!curated) return "C";
  const originalDepth = curated.description.trim().length >= 150
    && curated.overview.filter((paragraph) => paragraph.trim().length >= 100).length >= 2
    && curated.investmentPoints.length >= 2;
  const verifiedMedia = filterPhotographyAssets(curated.gallery.filter(usableImage)).length >= 3 && usablePhotographyImage(curated.image);
  const datedSource = Boolean(curated.sourceUrl && curated.sourceLabel && curated.sourceUpdatedAt);
  return originalDepth && verifiedMedia && datedSource ? "A" : "B";
}
export function isProjectIndexable(slug: string) { return getProjectIndexTier(slug) !== "C"; }
export function getIndexableProjectRecords() { return registry.projects.filter((project) => isProjectIndexable(project.slug)); }
export function projectNameFromSlug(slug: string) { return getProjectRecord(slug)?.name || slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
export function getRelatedProjectRecords(project: ImportedProject, limit = 3): RegistryProject[] {
  const propertyTypes = new Set(project.propertyTypes);
  const bedrooms = new Set(project.bedrooms);
  const lifestyles = new Set(project.lifestyles);
  return registry.projects
    .filter((candidate) => candidate.slug !== project.slug && !candidate.archived && isPhotographyAsset(candidate.image))
    .map((candidate) => {
      let score = 0;
      if (candidate.area === project.location) score += 18;
      if (candidate.developer === project.developer) score += 11;
      if (candidate.emirate === project.emirate) score += 7;
      score += candidate.propertyTypes.filter((type) => propertyTypes.has(type)).length * 4;
      score += candidate.bedrooms.filter((bedroom) => bedrooms.has(bedroom)).length * 2;
      score += candidate.lifestyles.filter((lifestyle) => lifestyles.has(lifestyle)).length * 2;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, Math.max(0, limit))
    .map(({ candidate }) => candidate);
}

async function readLimitedHtml(response: Response, maxBytes = 2_500_000) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) { await response.body?.cancel(); return ""; }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); return ""; }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

async function getImportedProjectSource(slug: string): Promise<ImportedProject | null> {
  const normalizedSlug = normalizeProjectSlug(slug); const sourceSlug = verifiedProjectAliases[normalizedSlug] || normalizedSlug; const record = getProjectRecord(sourceSlug); if (!record) return null;
  const curated = curatedMap.get(sourceSlug);
  if (curated) {
    const gallery = filterPhotographyAssets(curated.gallery.filter(usableImage));
    const interiors = filterPhotographyAssets(curated.interiors.filter(usableImage));
    const exteriors = filterPhotographyAssets(curated.exteriors.filter(usableImage));
    const hero = selectUsablePhotography(curated.image, [...exteriors, ...gallery, ...interiors]);
    return {
      slug: sourceSlug,
      title: record.name || curated.name,
      location: curated.area,
      emirate: curated.emirate,
      developer: curated.developer,
      developerDisplay: curated.developerDisplay,
      description: curated.description,
      overview: curated.overview,
      hero,
      gallery: filterPhotographyAssets([hero, ...gallery]),
      interiors,
      exteriors,
      floorplans: curated.floorplans.filter(usableDocumentImage),
      price: curated.startingPriceLabel || formatPrice(curated.startingPrice),
      paymentPlan: curated.paymentPlan,
      handover: curated.handover,
      travelTimes: curated.travelTimes,
      propertyTypes: curated.propertyTypes,
      bedrooms: curated.bedrooms,
      lifestyles: curated.lifestyles,
      amenities: curated.amenities,
      investmentPoints: curated.investmentPoints,
      averageSize: curated.areaFrom || "Available on request",
      pricePerSqft: registryProjectPricePerSqft(record),
      areaPricePerSqft: getAreaPricePerSqft(curated.area, curated.propertyTypes, curated.emirate),
      brochure: resolveProjectBrochure(curated)?.href || "",
      coordinates: curated.coordinates,
      statusLabel: curated.statusLabel,
      releaseNote: curated.releaseNote,
      unitPricing: curated.unitPricing,
      paymentSchedule: curated.paymentSchedule,
      launchDetails: curated.launchDetails,
      sourceUrl: curated.sourceUrl,
      sourceLabel: curated.sourceLabel,
    };
  }
  // External enrichment is optional; a slow source must not hold up a property page.
  let html = ""; try { const response = await fetch(`${SOURCE}/projects/${sourceSlug}`, { next: { revalidate: 21600 }, headers: { "user-agent": "PSR-Catalogue/2.0" }, signal: AbortSignal.timeout(1_200) }); if (response.ok) html = await readLimitedHtml(response); } catch { /* registry remains a complete fallback */ }
  const storedMedia = projectMediaOverrides[sourceSlug];
  const storedGallery = filterPhotographyAssets(storedMedia?.gallery.filter(usableImage) || []);
  const storedExteriors = filterPhotographyAssets(storedMedia?.exteriors.filter(usableImage) || []);
  const storedInteriors = filterPhotographyAssets(storedMedia?.interiors.filter(usableImage) || []);
  const storedFloorplans = storedMedia?.floorplans.filter(usableDocumentImage) || [];
  const plain = stripHtml(html); const rawTitle = cleanBrand(meta(html, "og:title") || record.name); const title = record.name || rawTitle.replace(/\s+(?:Apartments?|Villas?|Townhouses?)\s+(?:in|at)\s+Dubai.*$/i, "").trim();
  const description = cleanBrand((storedMedia ? record.description : "") || meta(html, "description") || meta(html, "og:description") || record.description || `Discover ${title}, a considered new address in ${record.emirate}.`);
  const allImages = imagesIn(html); const allPhotos = filterPhotographyAssets(allImages); const sourceHero = normalizeImage(meta(html, "og:image")); const hero = selectUsablePhotography(storedGallery[0] || record.image, [sourceHero, ...allPhotos]);
  const labelled = labelledGallery(html); const floorplans = unique([...storedFloorplans, ...floorplanImages(html, allImages)]);
  const labelledMediaAvailable = labelled.interiors.length > 0 || labelled.exteriors.length > 0;
  let interiors = storedMedia ? storedInteriors : labelled.interiors.length ? filterPhotographyAssets(labelled.interiors) : allPhotos.filter((url) => /(interior|living|bedroom|kitchen|lobby|bathroom|dining|lounge|reception|amenit)/i.test(url));
  let exteriors = storedMedia ? storedExteriors : labelled.exteriors.length ? filterPhotographyAssets(labelled.exteriors) : allPhotos.filter((url) => /(exterior|facade|fa[cç]ade|elevation|tower|villa|aerial|building|residence|waterfront|landscape)/i.test(url));
  interiors = interiors.filter((url) => !floorplans.includes(url));
  exteriors = exteriors.filter((url) => !floorplans.includes(url));
  exteriors = exteriors.filter((url) => !interiors.includes(url));
  const unclassified = storedMedia ? storedGallery.filter((url) => !floorplans.includes(url) && !interiors.includes(url) && !exteriors.includes(url)) : labelledMediaAvailable ? [] : allPhotos.filter((url) => !floorplans.includes(url) && !interiors.includes(url) && !exteriors.includes(url));
  if (!exteriors.length) exteriors = unclassified.slice(0, Math.min(12, Math.ceil(unclassified.length / 2)));
  if (!interiors.length) interiors = unclassified.filter((url) => !exteriors.includes(url)).slice(0, 12);
  if (!exteriors.length && hero) exteriors = [hero];
  const gallery = filterPhotographyAssets(storedMedia ? [hero, ...storedGallery] : [hero, ...exteriors, ...interiors]);
  const priceMatch = plain.match(/(?:Starting Price|Price From|From)\s*[:–-]?\s*(AED\s*[\d,.]+\s*[MK]?)/i) || plain.match(/(AED\s*[\d,.]+\s*[MK]?)\s*(?:Starting Price|Price From)/i);
  const registryPaymentMatch = record.paymentPlan.match(/\b\d{1,3}(?:\s*\/\s*\d{1,3}){1,5}\b/);
  const sourcePaymentMatch = plain.match(/\b\d{1,3}(?:\s*\/\s*\d{1,3}){1,5}\b\s*(?:Payment Plan)?/i);
  const paymentParts = (registryPaymentMatch?.[0] || sourcePaymentMatch?.[0] || "").match(/\d{1,3}/g)?.map(Number) || [];
  const paymentPlan = paymentParts.length >= 2 && paymentParts.every((part) => part > 0 && part <= 100) && paymentParts.reduce((sum, part) => sum + part, 0) === 100 ? paymentParts.join("/") : "On request";
  const handoverMatch = plain.match(/(?:Handover|Completion(?: Due Date)?)\s*[:–-]?\s*(Q[1-4]\s*20\d{2}|20\d{2})/i) || plain.match(/(Q[1-4]\s*20\d{2})\s*(?:Handover|Completion)/i);
  const travelTimes = unique([...plain.matchAll(/(\d{1,2})\s*Minutes?\s*to\s*([A-Za-z0-9 .&'’-]{2,45}?)(?=\s+\d{1,2}\s*Minutes?|\s+(?:About|Amenities|Gallery|Payment|Location|Floor|Investment)|$)/gi)].map((m) => `${m[1]}|${m[2].trim()}`)).slice(0, 8).map((item) => { const [minutes, destination] = item.split("|"); return { minutes, destination }; });
  const amenitiesVocabulary = ["Swimming Pool", "Infinity Pool", "Gym", "Fitness Centre", "Kids’ Play Area", "Children’s Play Area", "Basketball Court", "Tennis Court", "Paddle Court", "Beach Access", "Private Beach", "Clubhouse", "Retail", "Restaurants", "Cinema", "Spa", "Sauna", "Jogging Track", "Cycling Track", "BBQ Area", "Concierge", "Coworking Space", "Landscaped Gardens", "Water Lagoons", "Golf Course", "Marina"];
  const amenities = amenitiesVocabulary.filter((amenity) => new RegExp(amenity.replace(/[’']/g, "[’']"), "i").test(plain)).slice(0, 12);
  const sourceSizeText = extractSizeText(plain);
  const averageSize = plain.match(/Average size\s*:\s*([^.;]{3,80}(?:sq\.?\s*ft\.?|sqft|sq ft|m²|sqm))/i)?.[1]?.trim() || record.areaFrom || sourceSizeText || "Available on request";
  const pricePerSqft = registryProjectPricePerSqft(record) || extractProjectPricePerSqft(plain, record.startingPrice || priceMatch?.[1] || "", averageSize);
  const areaPricePerSqft = getAreaPricePerSqft(record.area, record.propertyTypes, record.emirate);
  return { slug: sourceSlug, title, location: record.area, emirate: record.emirate, developer: record.developer, developerDisplay: record.developerDisplay, description, overview: extractParagraphs(html, title), hero, gallery, interiors, exteriors, floorplans,
    price: formatPrice(record.startingPrice || priceMatch?.[1] || ""), paymentPlan, handover: record.handover || handoverMatch?.[1] || "To be confirmed", travelTimes,
    propertyTypes: record.propertyTypes, bedrooms: record.bedrooms, lifestyles: record.lifestyles, amenities, investmentPoints: investmentPoints(html), averageSize, pricePerSqft, areaPricePerSqft, brochure: record.brochure, coordinates: record.coordinates,
    sourceUrl: storedMedia?.sourceUrl || `${SOURCE}/projects/${sourceSlug}`, sourceLabel: storedMedia?.sourceLabel || "OPR catalogue project page" };
}

export async function getImportedProject(slug: string): Promise<ImportedProject | null> {
  const project = await getImportedProjectSource(slug);
  return project ? reviewProjectPhotos(project) : null;
}
