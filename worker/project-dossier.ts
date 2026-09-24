import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { RegistryProject } from "../lib/imported-projects";
import { PSR_REPORT_COMPANY } from "./report-branding";

const PSR_PROJECT_ORIGIN = "https://psrhomes.ae/projects";
const ORIGINAL_CATALOGUE_ORIGIN = "https://opr.ae/projects";

export type ProjectDossierSource = {
  label: string;
  url: string;
  recordDate: string;
  usesCatalogueFallback: boolean;
  type: "stored_project_source" | "third_party_catalogue" | "psr_catalogue_snapshot";
  scope: "project" | "catalogue_snapshot";
  status: "stored" | "verified" | "verified_redirect" | "upstream_unpublished" | "identity_mismatch" | "scope_mismatch";
  verifiedAt: string;
  note: string;
};

type ProjectDossierSourcePolicy = Pick<ProjectDossierSource, "label" | "url" | "type" | "scope" | "status" | "verifiedAt" | "note">;

const PROJECT_DOSSIER_SOURCE_POLICIES = new Map<string, ProjectDossierSourcePolicy>([
  ["arya-residences-citi-developers-dubai-islands", {
    label: "OPR canonical project page",
    url: "https://opr.ae/projects/arya-residences-dubai-islands",
    type: "third_party_catalogue",
    scope: "project",
    status: "verified_redirect",
    verifiedAt: "2026-09-06",
    note: "Canonical redirect and project identity checked by PSR; live commercial terms still require developer confirmation.",
  }],
  ["sofitel-downtown-refine-downtown-dubai-uae", {
    label: "PSR catalogue snapshot",
    url: `${PSR_PROJECT_ORIGIN}/sofitel-downtown-refine-downtown-dubai-uae`,
    type: "psr_catalogue_snapshot",
    scope: "catalogue_snapshot",
    status: "upstream_unpublished",
    verifiedAt: "2026-09-06",
    note: "The former third-party project page is unpublished. This dossier cites the retained PSR catalogue snapshot and requires developer confirmation.",
  }],
  ["treppan-living-by-fakhruddin-properties-on-dubai-islands", {
    label: "PSR catalogue snapshot",
    url: `${PSR_PROJECT_ORIGIN}/treppan-living-by-fakhruddin-properties-on-dubai-islands`,
    type: "psr_catalogue_snapshot",
    scope: "catalogue_snapshot",
    status: "identity_mismatch",
    verifiedAt: "2026-09-06",
    note: "The current third-party page does not match this record's project identity. Treat this as a historic catalogue snapshot pending developer confirmation.",
  }],
  ["passo-beyond-palm-jumeirah-dubai", {
    label: "PSR catalogue snapshot",
    url: `${PSR_PROJECT_ORIGIN}/passo-beyond-palm-jumeirah-dubai`,
    type: "psr_catalogue_snapshot",
    scope: "catalogue_snapshot",
    status: "scope_mismatch",
    verifiedAt: "2026-09-06",
    note: "The current third-party route resolves to a narrower project scope. Treat this as a historic catalogue snapshot pending scope confirmation.",
  }],
]);

function ascii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function formatDate(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date not supplied by the source record";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}

export function resolveProjectDossierSource(project: RegistryProject): ProjectDossierSource {
  const policy = PROJECT_DOSSIER_SOURCE_POLICIES.get(project.slug);
  if (policy) return {
    ...policy,
    recordDate: formatDate(project.sourceUpdatedAt),
    usesCatalogueFallback: policy.type !== "stored_project_source",
  };
  const explicitUrl = safeHttpsUrl(project.sourceUrl);
  if (explicitUrl) return {
    label: ascii(project.sourceLabel || "Stored project source"),
    url: explicitUrl,
    recordDate: formatDate(project.sourceUpdatedAt),
    usesCatalogueFallback: false,
    type: "stored_project_source",
    scope: "project",
    status: "stored",
    verifiedAt: "",
    note: "Stored project source from the PSR catalogue record; a separate source-verification date is not available.",
  };
  return {
    label: "OPR catalogue project route",
    url: `${ORIGINAL_CATALOGUE_ORIGIN}/${project.slug}`,
    recordDate: formatDate(project.sourceUpdatedAt),
    usesCatalogueFallback: true,
    type: "third_party_catalogue",
    scope: "project",
    status: "verified",
    verifiedAt: "2026-09-06",
    note: "Third-party catalogue route and project identity checked by PSR; live commercial terms still require developer confirmation.",
  };
}

export function projectDossierFilename(project: Pick<RegistryProject, "slug">) {
  return `${project.slug.replace(/[^a-z0-9-]+/gi, "-")}-psr-sourced-dossier.pdf`;
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number) {
  const words = ascii(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const pushLongWord = (word: string) => {
    let fragment = "";
    for (const character of word) {
      const candidate = `${fragment}${character}`;
      if (fragment && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(fragment);
        fragment = character;
      } else {
        fragment = candidate;
      }
    }
    line = fragment;
  };

  for (const word of words) {
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      if (line) lines.push(line);
      line = "";
      pushLongWord(word);
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  value: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
  lineHeight = size * 1.38,
  maxLines = 10,
) {
  const allLines = wrap(font, value, size, maxWidth);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && lines.length) {
    let finalLine = lines[lines.length - 1];
    while (finalLine && font.widthOfTextAtSize(`${finalLine}...`, size) > maxWidth) finalLine = finalLine.slice(0, -1);
    lines[lines.length - 1] = `${finalLine}...`;
  }
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function validPaymentPlan(value: string) {
  const parts = value.match(/\d{1,3}/g)?.map(Number) || [];
  if (parts.length < 2 || parts.some((part) => part <= 0 || part > 100) || parts.reduce((sum, part) => sum + part, 0) !== 100) {
    return "Requires current developer confirmation";
  }
  return parts.join("/");
}

function factValue(value: string | null | undefined, fallback = "Available on request") {
  const cleaned = ascii(value || "");
  return cleaned && cleaned !== "," ? cleaned : fallback;
}

function publishedPrice(value: string | null | undefined) {
  const cleaned = factValue(value);
  if (!/\d/.test(cleaned)) return "Available on request";
  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    const amount = Number(cleaned);
    return amount > 0 ? `AED ${amount.toLocaleString("en-AE")}` : "Available on request";
  }
  return cleaned;
}

function publishedHandover(value: string | null | undefined) {
  const cleaned = factValue(value, "To be confirmed");
  return /(?:\bQ[1-4]\s*20\d{2}\b|\b20\d{2}\b|\bready\b|\bcompleted\b)/i.test(cleaned) ? cleaned : "To be confirmed";
}

export const PROJECT_DOSSIER_DISCLAIMER = "PSR-compiled project dossier. Not a developer-issued brochure.";

export type ProjectDossierContent = {
  slug: string;
  title: string;
  developer: string;
  location: string;
  emirate: string;
  startingPrice: string;
  paymentPlan: string;
  handover: string;
  residenceTypes: string;
  bedrooms: string;
  lifestyles: string;
  description: string;
  preparedAt: string;
  projectUrl: string;
  source: ProjectDossierSource;
  disclaimer: typeof PROJECT_DOSSIER_DISCLAIMER;
};

const COMMERCIAL_FACT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1_000;

function recordedDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function catalogueCommercialValue(value: string, sourceUpdatedAt: string | null | undefined, preparedAt: Date) {
  if (["Available on request", "To be confirmed", "Requires current developer confirmation"].includes(value)) return value;
  const sourceDate = sourceUpdatedAt ? new Date(sourceUpdatedAt) : null;
  if (!sourceDate || Number.isNaN(sourceDate.getTime()) || preparedAt.getTime() - sourceDate.getTime() <= COMMERCIAL_FACT_MAX_AGE_MS) return value;
  return `${value} - recorded ${recordedDate(sourceUpdatedAt)}; reconfirm`;
}

export function buildProjectDossierContent(project: RegistryProject, preparedAt = new Date()): ProjectDossierContent {
  const startingPrice = publishedPrice(project.startingPrice);
  const paymentPlan = validPaymentPlan(project.paymentPlan || "");
  const handover = publishedHandover(project.handover);
  return {
    slug: project.slug,
    title: factValue(project.name, "Project record"),
    developer: factValue(project.developerDisplay || project.developer),
    location: factValue(project.area, project.emirate || "United Arab Emirates"),
    emirate: factValue(project.emirate, "United Arab Emirates"),
    startingPrice: catalogueCommercialValue(startingPrice, project.sourceUpdatedAt, preparedAt),
    paymentPlan: catalogueCommercialValue(paymentPlan, project.sourceUpdatedAt, preparedAt),
    handover: catalogueCommercialValue(handover, project.sourceUpdatedAt, preparedAt),
    residenceTypes: project.propertyTypes.length ? project.propertyTypes.join(", ") : "Available on request",
    bedrooms: project.bedrooms.length ? project.bedrooms.join(", ") : "",
    lifestyles: project.lifestyles.length ? project.lifestyles.join(", ") : "",
    description: factValue(project.description, `A project address in ${factValue(project.emirate, "the United Arab Emirates")}.`),
    preparedAt: formatDate(preparedAt),
    projectUrl: `${PSR_PROJECT_ORIGIN}/${project.slug}`,
    source: resolveProjectDossierSource(project),
    disclaimer: PROJECT_DOSSIER_DISCLAIMER,
  };
}

function locationDisplay(content: Pick<ProjectDossierContent, "location" | "emirate">) {
  return content.location.toLowerCase().includes(content.emirate.toLowerCase())
    ? content.location
    : `${content.location}, ${content.emirate}`;
}

export async function renderProjectDossierPdf(
  project: RegistryProject,
  preparedAt = new Date(),
) {
  const content = buildProjectDossierContent(project, preparedAt);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const colors = {
    graphite: rgb(0.035, 0.039, 0.047),
    panel: rgb(0.075, 0.082, 0.098),
    paper: rgb(0.965, 0.957, 0.929),
    ink: rgb(0.075, 0.078, 0.073),
    muted: rgb(0.37, 0.37, 0.34),
    line: rgb(0.79, 0.75, 0.65),
    gold: rgb(0.74, 0.59, 0.32),
    white: rgb(0.98, 0.98, 0.97),
  };
  const source = content.source;

  const cover = pdf.addPage(pageSize);
  cover.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.graphite });
  cover.drawRectangle({ x: 42, y: 42, width: pageSize[0] - 84, height: pageSize[1] - 84, borderColor: colors.gold, borderWidth: 0.8 });
  cover.drawText("PSR", { x: 62, y: 752, size: 27, font: serifBold, color: colors.white });
  cover.drawText("HOMES REAL ESTATE", { x: 122, y: 762, size: 7.2, font: bold, color: colors.white });
  cover.drawText(`${PSR_REPORT_COMPANY.website}  |  ORN ${PSR_REPORT_COMPANY.orn}`, { x: 122, y: 747, size: 6.4, font: regular, color: colors.gold });
  cover.drawText("SOURCED PROJECT DOSSIER", { x: 62, y: 646, size: 7.5, font: bold, color: colors.gold });
  const titleBottom = drawWrapped(cover, content.title, serif, 36, 62, 600, 462, colors.white, 40, 5);
  drawWrapped(cover, locationDisplay(content), regular, 11, 62, titleBottom - 18, 440, colors.white, 16, 3);
  cover.drawLine({ start: { x: 62, y: 324 }, end: { x: 250, y: 324 }, thickness: 1, color: colors.gold });
  cover.drawText("DEVELOPMENT BY", { x: 62, y: 292, size: 7, font: bold, color: colors.gold });
  drawWrapped(cover, content.developer, bold, 13, 62, 272, 420, colors.white, 17, 3);
  cover.drawText(`PREPARED  ${content.preparedAt.toUpperCase()}`, { x: 62, y: 205, size: 7, font: regular, color: colors.white });
  cover.drawText(`REFERENCE  ${ascii(content.slug).toUpperCase()}`, { x: 62, y: 186, size: 6.3, font: regular, color: colors.white });
  drawWrapped(
    cover,
    `${content.disclaimer} It does not replace current developer documentation.`,
    regular,
    7.3,
    62,
    93,
    462,
    colors.white,
    11,
    4,
  );

  const details = pdf.addPage(pageSize);
  details.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.paper });
  details.drawText("01", { x: 44, y: 780, size: 8, font: bold, color: colors.gold });
  details.drawText("PROJECT RECORD SNAPSHOT", { x: 78, y: 780, size: 8, font: bold, color: colors.ink });
  details.drawText("What the catalogue record says", { x: 44, y: 727, size: 29, font: serif, color: colors.ink });
  drawWrapped(details, "A compact dated reference for first-pass comparison. Availability, final prices, areas, incentives, payment milestones and completion timing must be reconfirmed for the selected unit. Values from records older than 180 days are marked with their date.", regular, 9.2, 44, 692, 500, colors.muted, 13, 5);

  const facts: Array<[string, string]> = [
    ["Developer", content.developer],
    ["Location", locationDisplay(content)],
    ["Starting price", content.startingPrice],
    ["Payment plan", content.paymentPlan],
    ["Handover", content.handover],
    ["Residence types", content.residenceTypes],
  ];
  facts.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 44 + column * 255;
    const y = 570 - row * 82;
    details.drawRectangle({ x, y, width: 235, height: 65, color: index % 2 ? colors.paper : rgb(0.93, 0.91, 0.86), borderColor: colors.line, borderWidth: 0.35 });
    details.drawText(label.toUpperCase(), { x: x + 13, y: y + 44, size: 6.1, font: bold, color: colors.gold });
    drawWrapped(details, value, bold, 9.5, x + 13, y + 25, 208, colors.ink, 10.5, 3);
  });

  details.drawText("PROJECT POSITIONING", { x: 44, y: 361, size: 7, font: bold, color: colors.gold });
  const descriptionBottom = drawWrapped(details, content.description, regular, 9.1, 44, 340, 500, colors.ink, 13, 7);
  const profile = [
    content.bedrooms ? `Bedrooms: ${content.bedrooms}` : "",
    content.lifestyles ? `Positioning: ${content.lifestyles}` : "",
  ].filter(Boolean).join(" | ");
  if (profile) drawWrapped(details, profile, bold, 7.2, 44, Math.min(descriptionBottom - 8, 250), 500, colors.muted, 10.5, 3);

  details.drawRectangle({ x: 44, y: 64, width: 507, height: 150, color: colors.panel });
  details.drawText("SOURCE AND PROVENANCE", { x: 58, y: 193, size: 6.5, font: bold, color: colors.gold });
  details.drawText(source.label.toUpperCase(), { x: 58, y: 176, size: 7.3, font: bold, color: colors.white });
  const sourceBottom = drawWrapped(details, source.url, regular, 5.8, 58, 162, 475, colors.white, 7.4, 3);
  const noteBottom = drawWrapped(details, source.note, regular, 5.5, 58, Math.min(137, sourceBottom - 4), 475, colors.white, 6.8, 3);
  const verification = source.verifiedAt ? ` | PSR CHECK ${formatDate(source.verifiedAt).toUpperCase()}` : " | VERIFICATION DATE NOT STORED";
  details.drawText(`SOURCE RECORD DATE  ${source.recordDate.toUpperCase()}${verification}`, { x: 58, y: Math.min(91, noteBottom - 4), size: 5.1, font: regular, color: colors.gold });
  drawWrapped(details, `PSR PROJECT PAGE  ${content.projectUrl}`, regular, 5.2, 58, 76, 475, colors.white, 6.5, 2);
  details.drawText(`${PSR_REPORT_COMPANY.displayName.toUpperCase()}  |  SOURCED PROJECT DOSSIER  |  2`, { x: 44, y: 28, size: 6.2, font: bold, color: colors.muted });

  pdf.setTitle(`${ascii(content.title)} | PSR sourced project dossier`);
  pdf.setSubject("A sourced PSR project overview with catalogue provenance; not developer-issued marketing material.");
  pdf.setAuthor(PSR_REPORT_COMPANY.legalName);
  pdf.setCreator(PSR_REPORT_COMPANY.legalName);
  pdf.setProducer(PSR_REPORT_COMPANY.legalName);
  pdf.setKeywords([ascii(content.title), content.developer, content.location, content.emirate, "PSR sourced project dossier"]);
  pdf.setCreationDate(preparedAt);
  pdf.setModificationDate(preparedAt);
  return pdf.save({ useObjectStreams: false });
}
