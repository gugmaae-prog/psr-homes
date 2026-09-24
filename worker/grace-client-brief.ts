import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { curatedLaunches } from "../data/curated-launches";
import projectMediaData from "../data/project-media-overrides.json";
import type { GraceFinderPreferences, GraceRecommendation } from "../lib/grace-finder";
import { getImportedProject } from "../lib/imported-projects";
import { embedPsrReportLogo, PSR_REPORT_COMPANY } from "./report-branding";

const IMAGE_HOSTS = /^(?:cdn\.opr\.ae|img[123]\.creatium\.ru|i\.1\.creatium\.io|new-projects-media\.propertyfinder\.com|szr2\.crimsoncapedigital\.com|uae-cms\.emaar\.com|ellingtonproperties\.ae|belgravia-square\.ellingtonproperties\.ae|mirabellaproperties\.com|creekharbourproperties\.com|binghattiweb\.imgix\.net|mira\.static\.bigapp\.ae|d8j0ntlcm91z4\.cloudfront\.net|haus-grace-assets\.thekeifferjapeth\.workers\.dev|(?:www\.)?modon\.com|(?:www\.)?beyonddevelopments\.ae)$/i;
const MAX_IMAGE_BYTES = 6_000_000;
const MAX_CLIENT_REPORT_IMAGES = 72;
const MAX_CLIENT_PROJECT_IMAGES = 30;

type ProjectMediaOverride = {
  hero?: string;
  gallery?: string[];
  interiors?: string[];
  exteriors?: string[];
  floorplans?: string[];
};

const curatedMediaBySlug = new Map(curatedLaunches.map((project) => [project.slug, project]));
const projectMediaOverrides = projectMediaData as Record<string, ProjectMediaOverride>;

type BriefEnv = {
  IMAGES?: ImagesBinding;
  ASSETS?: Fetcher;
};

export type GraceClientNarrative = {
  headline: string;
  executiveSummary: string;
  advisorPerspective: string;
  validationPriorities: string[];
};

export type GraceMarketEvidence = {
  title: string;
  summary: string;
  marketDate: string;
  sourceLabel: string;
  sourceUrl: string;
  sourcePublishedAt: string;
};

function ascii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = ascii(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
  lineHeight = size * 1.42,
  maxLines = 12,
) {
  const lines = wrap(font, text, size, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function budgetLabel(value: string) {
  return ({
    "under-1m": "Under AED 1m",
    "1m-2m": "AED 1-2m",
    "2m-5m": "AED 2-5m",
    "5m-10m": "AED 5-10m",
    "10m-plus": "AED 10m+",
  } as Record<string, string>)[value] || value;
}

function evidenceDate(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value.slice(0, 40)
    : date.toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
}

function evidenceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Source URL not recorded";
  }
}

function isReportImageSource(source: string) {
  if (!source) return false;
  if (source.startsWith("/")) {
    return /^\/(?:projects|project-document-previews|insights|hero|brand)\//.test(source)
      && /\.(?:jpe?g|png|webp|avif)$/i.test(source);
  }
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return false;
  }
  let pathname = parsed.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded pathname if an upstream URL contains malformed escapes.
  }
  return parsed.protocol === "https:"
    && IMAGE_HOSTS.test(parsed.hostname)
    && /\.(?:jpe?g|png|webp|avif)$/i.test(pathname);
}

function uniqueMedia(items: string[]) {
  const seen = new Set<string>();
  const media: string[] = [];
  for (const item of items) {
    const source = ascii(item).slice(0, 1_000);
    if (!isReportImageSource(source)) continue;
    const key = source.startsWith("/") ? source : source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    media.push(source);
  }
  return media;
}

function projectReportMedia(project: GraceRecommendation) {
  const curated = curatedMediaBySlug.get(project.slug);
  const override = projectMediaOverrides[project.slug];
  return uniqueMedia([
    project.image || "",
    curated?.image || "",
    override?.hero || "",
    ...(curated?.gallery || []),
    ...(curated?.exteriors || []),
    ...(curated?.interiors || []),
    ...(curated?.floorplans || []),
    ...(override?.gallery || []),
    ...(override?.exteriors || []),
    ...(override?.interiors || []),
    ...(override?.floorplans || []),
  ]).slice(0, MAX_CLIENT_PROJECT_IMAGES);
}

async function enrichedProjectReportMedia(project: GraceRecommendation, env: BriefEnv) {
  let imported: Awaited<ReturnType<typeof getImportedProject>> = null;
  if (env.ASSETS || env.IMAGES) {
    try {
      imported = await getImportedProject(project.slug);
    } catch {
      imported = null;
    }
  }
  return uniqueMedia([
    project.image || "",
    ...projectReportMedia(project),
    imported?.hero || "",
    ...(imported?.gallery || []),
    ...(imported?.exteriors || []),
    ...(imported?.interiors || []),
    ...(imported?.floorplans || []),
  ]).slice(0, MAX_CLIENT_PROJECT_IMAGES);
}

async function readBounded(response: Response) {
  const bytes = await response.arrayBuffer();
  return bytes.byteLength <= MAX_IMAGE_BYTES ? bytes : null;
}

async function projectImage(env: BriefEnv, sourceUrl: string) {
  if (!env.IMAGES || !sourceUrl) return null;
  if (!isReportImageSource(sourceUrl)) return null;
  let source: Response | null = null;
  try {
    if (sourceUrl.startsWith("/")) {
      if (!env.ASSETS) return null;
      source = await env.ASSETS.fetch(new Request(`https://psrhomes.ae${sourceUrl}`));
    } else {
      const parsed = new URL(sourceUrl);
      source = await fetch(parsed.toString(), {
        headers: { accept: "image/avif,image/webp,image/jpeg,image/png" },
        redirect: "follow",
      });
    }
  } catch {
    return null;
  }
  try {
    if (!source.ok || !source.body) return null;
    const transformed = await env.IMAGES
      .input(source.body)
      .transform({ width: 1400, height: 840, fit: "cover" })
      .output({ format: "image/jpeg", quality: 82, anim: false });
    const transformedResponse = transformed.response();
    return transformedResponse.ok ? await readBounded(transformedResponse) : null;
  } catch {
    return null;
  }
}

export async function renderGraceClientBriefPdf({
  id,
  clientName,
  preparedAt,
  preferences,
  recommendations,
  narrative,
  marketEvidence,
  env,
}: {
  id: string;
  clientName: string;
  preparedAt: string;
  preferences: GraceFinderPreferences;
  recommendations: GraceRecommendation[];
  narrative: GraceClientNarrative;
  marketEvidence?: GraceMarketEvidence | null;
  env: BriefEnv;
}) {
  const pdf = await PDFDocument.create();
  const psrLogo = await embedPsrReportLogo(pdf, env);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const pageSize: [number, number] = [595.28, 841.89];
  const colors = {
    ink: rgb(.075, .078, .07),
    paper: rgb(.985, .975, .945),
    shell: rgb(.94, .91, .85),
    gold: rgb(.57, .42, .2),
    muted: rgb(.39, .38, .35),
    white: rgb(1, 1, 1),
  };
  const projectMediaEntries = await Promise.all(recommendations.map(async (project) => [
    project.slug,
    await enrichedProjectReportMedia(project, env),
  ] as const));
  const projectMedia = new Map(projectMediaEntries);
  const mediaSources = uniqueMedia([...projectMedia.values()].flat()).slice(0, MAX_CLIENT_REPORT_IMAGES);
  const fetched = await Promise.all(mediaSources.map(async (source) => ({
    source,
    bytes: await projectImage(env, source),
  })));
  const images = new Map<string, PDFImage>();
  for (const item of fetched) {
    if (!item.bytes) continue;
    try {
      images.set(item.source, await pdf.embedJpg(item.bytes));
    } catch {
      // The geometric fallback keeps the brief complete if a remote image cannot be embedded.
    }
  }
  const projectGalleryPageCounts = recommendations.map((project) => Math.ceil(Math.max(0, (projectMedia.get(project.slug)?.length || 0) - 1) / 4));
  const projectStartPage = (index: number) => 4 + index + projectGalleryPageCounts.slice(0, index).reduce((sum, count) => sum + count, 0);

  const addPaperPage = () => {
    const page = pdf.addPage(pageSize);
    page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.paper });
    return page;
  };
  const footer = (page: PDFPage, pageNumber: number) => {
    page.drawText(`${PSR_REPORT_COMPANY.displayName.toUpperCase()}  |  PRIVATE CLIENT BRIEF  |  ${pageNumber}`, {
      x: 44,
      y: 26,
      size: 6.4,
      font: bold,
      color: colors.muted,
    });
  };

  const cover = pdf.addPage(pageSize);
  cover.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.ink });
  cover.drawRectangle({ x: 44, y: 43, width: pageSize[0] - 88, height: pageSize[1] - 86, borderColor: colors.gold, borderWidth: .7 });
  if (psrLogo) cover.drawImage(psrLogo, { x: 64, y: 716, width: 72, height: 72 });
  else cover.drawText("PSR HOMES", { x: 64, y: 752, size: 18, font: bold, color: colors.white });
  cover.drawText(PSR_REPORT_COMPANY.legalName.toUpperCase(), { x: 151, y: 756, size: 6.4, font: bold, color: colors.white });
  cover.drawText(`${PSR_REPORT_COMPANY.website} | ORN ${PSR_REPORT_COMPANY.orn}`, { x: 151, y: 742, size: 5.8, font: regular, color: colors.gold });
  cover.drawText("PRIVATE CLIENT BRIEF", { x: 64, y: 628, size: 7, font: bold, color: colors.gold });
  drawWrapped(cover, narrative.headline || "A considered UAE property shortlist", serif, 35, 64, 585, 435, colors.white, 40, 4);
  cover.drawLine({ start: { x: 64, y: 390 }, end: { x: 260, y: 390 }, thickness: 1, color: colors.gold });
  cover.drawText(`PREPARED FOR  ${ascii(clientName).toUpperCase()}`, { x: 64, y: 353, size: 8.5, font: bold, color: colors.gold });
  cover.drawText(`REFERENCE  ${ascii(id).toUpperCase()}`, { x: 64, y: 329, size: 7, font: regular, color: colors.white });
  cover.drawText(`PREPARED  ${ascii(preparedAt)}`, { x: 64, y: 310, size: 7, font: regular, color: colors.white });
  cover.drawText("Private and indicative. Live availability, exact pricing and finance require advisor confirmation.", {
    x: 64,
    y: 76,
    size: 6.3,
    font: regular,
    color: colors.white,
  });

  const briefPage = addPaperPage();
  briefPage.drawText("01", { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
  briefPage.drawText("YOUR ACQUISITION PROFILE", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
  briefPage.drawText("Your PSR search brief", { x: 44, y: 724, size: 30, font: serif, color: colors.ink });
  drawWrapped(briefPage, narrative.executiveSummary, regular, 10, 44, 682, 500, colors.muted, 15, 8);
  const metrics = [
    ["Purpose", preferences.goal],
    ["Budget", budgetLabel(preferences.budget)],
    ["Residence", preferences.propertyTypes.join(", ")],
    ["Bedrooms", preferences.bedrooms],
    ["Location", preferences.community || preferences.emirate],
    ["Purchase route", preferences.financing || "Not decided"],
  ];
  metrics.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 44 + column * 255;
    const y = 505 - row * 94;
    briefPage.drawRectangle({ x, y, width: 235, height: 72, color: colors.shell });
    briefPage.drawText(label.toUpperCase(), { x: x + 14, y: y + 50, size: 6.2, font: bold, color: colors.gold });
    drawWrapped(briefPage, value, bold, 12, x + 14, y + 29, 205, colors.ink, 13, 2);
  });
  briefPage.drawText("ADVISOR PERSPECTIVE", { x: 44, y: 208, size: 7, font: bold, color: colors.gold });
  drawWrapped(briefPage, narrative.advisorPerspective, regular, 9.2, 44, 186, 500, colors.ink, 14, 8);
  footer(briefPage, 2);

  const comparison = addPaperPage();
  comparison.drawText("02", { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
  comparison.drawText("DECISION SNAPSHOT", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
  comparison.drawText("Compare the shortlist", { x: 44, y: 724, size: 30, font: serif, color: colors.ink });
  drawWrapped(
    comparison,
    "A consistent first-pass comparison of the published project facts. Entry prices are development-wide and do not prove live availability for the requested layout.",
    regular,
    9.2,
    44,
    681,
    500,
    colors.muted,
    14,
    4,
  );
  recommendations.slice(0, 6).forEach((project, index) => {
    const y = 571 - index * 78;
    comparison.drawRectangle({ x: 44, y, width: 507, height: 64, color: index % 2 ? colors.paper : colors.shell });
    comparison.drawText(String(index + 1).padStart(2, "0"), { x: 57, y: y + 43, size: 8, font: bold, color: colors.gold });
    drawWrapped(comparison, project.title, bold, 9.1, 89, y + 44, 210, colors.ink, 11, 2);
    drawWrapped(comparison, `${project.area}, ${project.emirate}`, regular, 6.8, 89, y + 18, 210, colors.muted, 9, 1);
    drawWrapped(comparison, project.price, bold, 8.2, 320, y + 43, 105, colors.ink, 10, 2);
    drawWrapped(comparison, `${project.handover} | ${project.evidenceStatus === "official-source" ? "Dated source" : "Verify source"}`, regular, 6.5, 320, y + 18, 205, colors.muted, 9, 2);
  });
  if (marketEvidence) {
    comparison.drawText("LATEST DATED MARKET CONTEXT", { x: 44, y: 86, size: 6.4, font: bold, color: colors.gold });
    drawWrapped(comparison, `${marketEvidence.title} | Note ${evidenceDate(marketEvidence.marketDate)} | ${marketEvidence.sourceLabel}`, regular, 7, 44, 69, 500, colors.muted, 9, 3);
  }
  footer(comparison, 3);

  recommendations.forEach((project, index) => {
    const page = addPaperPage();
    page.drawText(String(projectStartPage(index) - 1).padStart(2, "0"), { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
    page.drawText("SHORTLISTED OPPORTUNITY", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
    const media = projectMedia.get(project.slug) || [];
    const image = images.get(media[0] || project.image);
    if (image) {
      page.drawImage(image, { x: 44, y: 476, width: 507, height: 260 });
    } else {
      page.drawRectangle({ x: 44, y: 476, width: 507, height: 260, color: colors.ink });
      for (let line = 0; line < 9; line += 1) {
        page.drawLine({
          start: { x: 80 + line * 48, y: 500 },
          end: { x: 138 + line * 48, y: 700 },
          thickness: .45,
          color: colors.gold,
          opacity: .55,
        });
      }
    }
    page.drawText(`${project.area.toUpperCase()}  |  ${project.emirate.toUpperCase()}`, { x: 44, y: 439, size: 7, font: bold, color: colors.gold });
    drawWrapped(page, project.title, serif, 28, 44, 405, 500, colors.ink, 31, 2);
    page.drawText(ascii(`${project.developer}  |  ${project.price}`), { x: 44, y: 330, size: 8.2, font: bold, color: colors.muted });
    page.drawLine({ start: { x: 44, y: 309 }, end: { x: 551, y: 309 }, thickness: .6, color: colors.gold });
    page.drawText("WHY IT ENTERED THE SHORTLIST", { x: 44, y: 282, size: 7, font: bold, color: colors.gold });
    drawWrapped(page, project.reason, regular, 9.2, 44, 259, 500, colors.ink, 13.5, 5);
    page.drawRectangle({ x: 44, y: 132, width: 507, height: 60, color: colors.shell });
    page.drawText("RECORDED DEVELOPMENT FACTS", { x: 58, y: 174, size: 6.2, font: bold, color: colors.gold });
    page.drawText(ascii(`${project.paymentPlan}  |  ${project.handover}  |  ${project.statusLabel}`).slice(0, 102), { x: 58, y: 156, size: 7.1, font: bold, color: colors.ink });
    page.drawText(ascii(`${project.evidenceStatus === "official-source" ? "Source-backed" : "Catalogue verification required"}  |  Checked ${evidenceDate(project.sourceUpdatedAt)}`).slice(0, 112), { x: 58, y: 141, size: 6.3, font: regular, color: colors.muted });
    page.drawText("VALIDATE BEFORE RESERVATION", { x: 44, y: 106, size: 7, font: bold, color: colors.gold });
    drawWrapped(page, "Live unit, view, net area, final price, fees, payment dates, availability and the current developer or owner instruction.", regular, 7.4, 44, 87, 500, colors.muted, 10, 2);
    footer(page, projectStartPage(index));

    const gallery = media.slice(1);
    for (let galleryPageIndex = 0; galleryPageIndex < projectGalleryPageCounts[index]; galleryPageIndex += 1) {
      const galleryPage = addPaperPage();
      const pageNo = projectStartPage(index) + galleryPageIndex + 1;
      galleryPage.drawText(String(pageNo - 1).padStart(2, "0"), { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
      galleryPage.drawText("PROJECT IMAGE SET", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
      drawWrapped(galleryPage, `${project.title}: additional project imagery`, serif, 25, 44, 724, 500, colors.ink, 29, 2);
      drawWrapped(galleryPage, "Included from the PSR project record for visual review. Reconfirm final views, finishes, floor plans and specifications against current developer documents.", regular, 8, 44, 665, 500, colors.muted, 11, 3);
      gallery.slice(galleryPageIndex * 4, (galleryPageIndex + 1) * 4).forEach((source, imageIndex) => {
        const cellWidth = 239;
        const cellHeight = 178;
        const x = 44 + (imageIndex % 2) * 268;
        const y = 420 - Math.floor(imageIndex / 2) * 230;
        const embedded = images.get(source);
        if (embedded) {
          galleryPage.drawImage(embedded, { x, y, width: cellWidth, height: cellHeight });
        } else {
          galleryPage.drawRectangle({ x, y, width: cellWidth, height: cellHeight, color: colors.ink });
          for (let line = 0; line < 5; line += 1) {
            galleryPage.drawLine({
              start: { x: x + 36 + line * 28, y: y + 20 },
              end: { x: x + 96 + line * 28, y: y + 150 },
              thickness: .35,
              color: colors.gold,
              opacity: .55,
            });
          }
        }
        galleryPage.drawRectangle({ x, y: y - 32, width: cellWidth, height: 32, color: colors.shell });
        galleryPage.drawText(`IMAGE ${String(galleryPageIndex * 4 + imageIndex + 2).padStart(2, "0")}`, { x: x + 11, y: y - 14, size: 5.8, font: bold, color: colors.gold });
        const sourceType = source.startsWith("/") ? "PSR-owned project asset" : evidenceHost(source);
        galleryPage.drawText(ascii(sourceType).slice(0, 48), { x: x + 68, y: y - 14, size: 5.8, font: regular, color: colors.muted });
      });
      footer(galleryPage, pageNo);
    }
  });

  const evidence = addPaperPage();
  const evidencePageNumber = 4 + recommendations.length + projectGalleryPageCounts.reduce((sum, count) => sum + count, 0);
  evidence.drawText(String(evidencePageNumber - 1).padStart(2, "0"), { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
  evidence.drawText("EVIDENCE AND FRESHNESS", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
  evidence.drawText("What is verified, and when", { x: 44, y: 724, size: 30, font: serif, color: colors.ink });
  drawWrapped(
    evidence,
    "Every figure in this brief is tied to a catalogue record or published source date. A dated source establishes research provenance, not live unit availability.",
    regular,
    9.2,
    44,
    681,
    500,
    colors.muted,
    14,
    4,
  );
  let evidenceY = 610;
  recommendations.slice(0, 6).forEach((project, index) => {
    evidence.drawText(String(index + 1).padStart(2, "0"), { x: 46, y: evidenceY, size: 9, font: bold, color: colors.gold });
    drawWrapped(evidence, project.title, bold, 8.7, 82, evidenceY + 1, 205, colors.ink, 11, 2);
    drawWrapped(evidence, `${project.sourceLabel} | ${evidenceHost(project.sourceUrl)} | Checked ${evidenceDate(project.sourceUpdatedAt)}`, regular, 7, 307, evidenceY + 1, 232, colors.muted, 10, 3);
    evidence.drawLine({ start: { x: 44, y: evidenceY - 31 }, end: { x: 551, y: evidenceY - 31 }, thickness: .35, color: colors.gold, opacity: .55 });
    evidenceY -= 67;
  });
  if (marketEvidence) {
    evidence.drawRectangle({ x: 44, y: 124, width: 507, height: 112, color: colors.shell });
    evidence.drawText("LATEST DATED MARKET REFERENCE", { x: 58, y: 211, size: 6.4, font: bold, color: colors.gold });
    drawWrapped(evidence, marketEvidence.title, bold, 9.2, 58, 190, 470, colors.ink, 12, 2);
    drawWrapped(evidence, marketEvidence.summary, regular, 7.2, 58, 161, 470, colors.muted, 10, 3);
    drawWrapped(evidence, `${marketEvidence.sourceLabel} | ${evidenceHost(marketEvidence.sourceUrl)} | Note ${evidenceDate(marketEvidence.marketDate)} | Source published ${evidenceDate(marketEvidence.sourcePublishedAt)}`, regular, 6.2, 58, 132, 470, colors.gold, 8, 2);
  }
  evidence.drawText("RESEARCH METHOD", { x: 44, y: 91, size: 6.4, font: bold, color: colors.gold });
  drawWrapped(evidence, "PSR matched the stated brief against its active UAE project registry, rejected unpriced or archived records, preserved each source date and separated development-level facts from unit-level facts that still require confirmation.", regular, 6.8, 44, 75, 500, colors.muted, 9, 3);
  footer(evidence, evidencePageNumber);

  const diligence = addPaperPage();
  const diligencePageNumber = evidencePageNumber + 1;
  diligence.drawText(String(diligencePageNumber - 1).padStart(2, "0"), { x: 44, y: 777, size: 8, font: bold, color: colors.gold });
  diligence.drawText("DECISION FRAMEWORK", { x: 78, y: 777, size: 8, font: bold, color: colors.ink });
  diligence.drawText("What happens next", { x: 44, y: 724, size: 30, font: serif, color: colors.ink });
  const priorities = narrative.validationPriorities.length ? narrative.validationPriorities : [
    "Confirm current availability, exact unit pricing, layout, orientation and the dated payment schedule.",
    "For investment decisions, verify registered comparables, achievable rent, service charges, vacancy and acquisition costs.",
    "For family decisions, verify school routes, healthcare, daily travel and amenities from the exact property.",
    "Review mortgage eligibility, valuation, loan-to-value and payment timing with a UAE-regulated lender where finance is required.",
  ];
  priorities.slice(0, 6).forEach((priority, index) => {
    const y = 635 - index * 86;
    diligence.drawText(String(index + 1).padStart(2, "0"), { x: 48, y, size: 13, font: bold, color: colors.gold });
    drawWrapped(diligence, priority, regular, 9.4, 92, y + 2, 442, colors.ink, 14, 4);
  });
  const sourcedCount = recommendations.filter((project) => project.evidenceStatus === "official-source").length;
  diligence.drawText("EVIDENCE COVERAGE", { x: 44, y: 184, size: 6.5, font: bold, color: colors.gold });
  drawWrapped(diligence, `${sourcedCount} of ${recommendations.length} shortlisted project records link to a dated published source. Every option still requires a current unit statement; a source-backed project page does not prove live inventory.`, regular, 7.2, 44, 167, 500, colors.muted, 10, 3);
  diligence.drawRectangle({ x: 44, y: 68, width: 507, height: 72, color: colors.ink });
  diligence.drawText("IMPORTANT", { x: 61, y: 116, size: 6.5, font: bold, color: colors.gold });
  drawWrapped(
    diligence,
    "This discovery brief is not a valuation, financial advice or a guarantee of returns. A PSR advisor will reconfirm current facts before any reservation or payment.",
    regular,
    7.6,
    61,
    96,
    470,
    colors.white,
    11,
    4,
  );
  footer(diligence, diligencePageNumber);

  pdf.setTitle(`PSR private client brief for ${clientName}`);
  pdf.setAuthor(PSR_REPORT_COMPANY.legalName);
  pdf.setSubject("Private UAE property discovery brief");
  pdf.setCreator(PSR_REPORT_COMPANY.legalName);
  pdf.setProducer(PSR_REPORT_COMPANY.legalName);
  return await pdf.save();
}

export function graceClientBriefFilename(clientName: string) {
  const safe = ascii(clientName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "client";
  return `psr-homes-private-brief-${safe}.pdf`;
}
