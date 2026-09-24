import {
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { curatedLaunches } from "../data/curated-launches";
import { dubaiSouthFloorplanSnapshot, type FloorplanReference } from "../lib/dubai-south-floorplans";
import { cbaCompany, cbaServices } from "../data/cba-company";
import { cbaTeam } from "../data/cba-team";
import {
  emirateMarketOverviews,
  uaeMarketOverview,
  type StrategicStatus,
} from "../data/emirate-market-overviews";
import {
  DUBAI_SOUTH_RESEARCH_DATE,
  dubaiSouthDemandDrivers,
  dubaiSouthEvidenceSources,
  dubaiSouthInvestorDemographicSignals,
  dubaiSouthListingSignals,
  dubaiSouthPriceBenchmarks,
  dubaiSouthResearchLimitations,
  dubaiSouthTenantSegments,
  type DubaiSouthEvidenceSource,
  type DubaiSouthInvestorDemographicSignal,
  type DubaiSouthListingSignal,
  type DubaiSouthPriceBenchmark,
  type DubaiSouthTenantSegment,
} from "../data/dubai-south-rental-research";
import {
  EMIRATE_IDENTITIES,
  emirateProfiles,
  type EmirateName,
  type EmirateSlug,
} from "../data/emirates";
import projectMediaData from "../data/project-media-overrides.json";
import registryData from "../data/projects.json";
import { getImportedProject } from "../lib/imported-projects";
import { getAreaPricePerSqft } from "../lib/market-pricing";
import { communitySlugFor, getCommunityDirectory } from "../lib/taxonomy";
import { embedPsrReportLogo, PSR_REPORT_COMPANY } from "./report-branding";
import type { LatestMarketObservation } from "./live-market-data";
import {
  dubaiSouthCatalystLabel,
  institutionalReportCopy,
  PSR_REPORT_VARIABILITY_NOTICE,
} from "./psr-report-standards";

const MAX_IMAGE_BYTES = 6_000_000;
const MAX_ENRICHED_REPORT_IMAGES = 72;
const MAX_PROJECT_REPORT_IMAGES = 30;
const IMAGE_HOSTS = /^(?:cdn\.opr\.ae|img[123]\.creatium\.ru|i\.1\.creatium\.io|new-projects-media\.propertyfinder\.com|szr2\.crimsoncapedigital\.com|uae-cms\.emaar\.com|ellingtonproperties\.ae|belgravia-square\.ellingtonproperties\.ae|mirabellaproperties\.com|creekharbourproperties\.com|binghattiweb\.imgix\.net|mira\.static\.bigapp\.ae|d8j0ntlcm91z4\.cloudfront\.net|haus-grace-assets\.thekeifferjapeth\.workers\.dev|(?:www\.)?modon\.com|(?:www\.)?beyonddevelopments\.ae|(?:www\.)?reportagegroup\.com)$/i;

export type ReportProjectRecord = {
  slug: string;
  name: string;
  developer: string;
  emirate: string;
  area: string;
  startingPrice: string;
  paymentPlan: string;
  handover: string;
  image?: string;
  brochure?: string;
  bedrooms: string[];
  propertyTypes: string[];
  lifestyles: string[];
  coordinates?: string;
  description?: string;
  archived?: boolean;
  pricePerSqft?: number;
  sourceUpdatedAt?: string;
};

type ProjectMediaOverride = {
  hero?: string;
  gallery?: string[];
  interiors?: string[];
  exteriors?: string[];
  floorplans?: string[];
};

export type ProjectMediaSections = {
  gallery: string[];
  exteriors: string[];
  interiors: string[];
  floorplans: string[];
};

export type AcquisitionCostLine = {
  label: string;
  amount: number;
  display?: string;
  note?: string;
};

export type ConfirmedProjectInput = {
  slug: string;
  bedroom: string;
  unitReference: string;
  unitPrice: number;
  unitAreaSqft: number;
  annualRent: number;
  annualRentLow: number;
  annualRentHigh: number;
  occupancyRate: number;
  serviceChargePerSqft: number;
  otherAnnualCosts: number;
  acquisitionCosts: number;
  acquisitionCostBreakdown?: AcquisitionCostLine[];
  rentalEvidenceNotes: string;
  confirmationNotes: string;
};

export type AdvisorSnapshot = {
  name: string;
  email: string;
  phone: string;
  title: string;
  avatarUrl?: string;
  profileAvatarUrl?: string;
  portraitPlacement?: "all" | "profile-only" | "cover-only" | "cover-and-profile" | "cover-profile-and-closing" | "none";
  profileSummary?: string;
  specialties?: string[];
  languages?: string[];
};

export type NearbyPlace = {
  name: string;
  category: string;
  distanceKm: number;
};

export type ReportCommunityContext = {
  slug: string;
  name: string;
  route: string;
  imageUrl: string;
  descriptor: string;
  overview: string;
  activeProjects: number;
  developers: string[];
  propertyTypes: string[];
  timeline: {
    past: string;
    present: string;
    future: string;
  };
  selectedProjects: Array<{
    name: string;
    developer: string;
    handover: string;
  }>;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

export type PublishedTravelTime = {
  destination: string;
  minutes: string;
  category: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

export type ReportEstablishmentContext = {
  name: string;
  category: string;
  proximity: string;
  community: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

export type UpcomingProject = {
  name: string;
  developer: string;
  handover: string;
  distanceKm: number | null;
};

export type CommunityResearch = {
  areaBenchmark: {
    value: number;
    display: string;
    label: string;
    period: string;
    sourceLabel: string;
    sourceUrl: string;
    note: string;
  } | null;
  nearby: NearbyPlace[];
  upcoming: UpcomingProject[];
  demandSegments: string[];
  demographicContext: {
    scope: string;
    display: string;
    note: string;
    sourceLabel: string;
    sourceUrl: string;
  } | null;
  rentalEvidence: {
    status: string;
    note: string;
    indexLabel: string;
    indexUrl: string;
    datasetLabel: string;
    datasetUrl: string;
  };
};

export type SelectedProjectDistance = {
  fromSlug: string;
  fromName: string;
  toSlug: string;
  toName: string;
  distanceKm: number;
  basis: "straight-line";
  note: string;
};

export type AreaDemandResearch = {
  area: string;
  evidenceDate: string;
  evidenceScope: string;
  demandDrivers: string[];
  tenantSegments: DubaiSouthTenantSegment[];
  listingSignals: DubaiSouthListingSignal[];
  priceBenchmarks: DubaiSouthPriceBenchmark[];
  investorDemographics: DubaiSouthInvestorDemographicSignal[];
  projectDistances: SelectedProjectDistance[];
  limitations: string[];
  sources: DubaiSouthEvidenceSource[];
};

export type AdvisoryScoreFactor = {
  label: string;
  weight: number;
  score: number;
  rationale: string;
};

export type AdvisoryScreen = {
  total: number;
  label: string;
  statement: string;
  factors: AdvisoryScoreFactor[];
};

export type ReportChart = {
  title: string;
  subtitle: string;
  unit: string;
  kind: "columns" | "bars";
  data: Array<{ label: string; value: number; display: string }>;
  sourceLabel: string;
  sourceUrl: string;
};

export type CuratedProjectSnapshot = {
  slug: string;
  name: string;
  developer: string;
  location: string;
  emirate: string;
  startingPrice: string;
  paymentPlan: string;
  handover: string;
  pricePerSqft: string;
  residences: string;
  bedrooms: string;
  positioning: string;
  imageUrl: string;
  mediaGallery: string[];
  mediaSections: ProjectMediaSections;
  floorplanReferences?: FloorplanReference[];
  floorplanQualification?: string;
  projectKnowledge: {
    statusLabel: string;
    releaseNote: string;
    overview: string[];
    amenities: string[];
    investmentPoints: string[];
    unitPricing: Array<{ residence: string; startingPrice: string; size: string }>;
    sourceLabel: string;
    sourceUrl: string;
    verifiedAt: string;
  } | null;
  lifecycle: {
    past: string;
    present: string;
    future: string;
  };
  coordinates: string;
  paymentSchedule: Array<{ label: string; percentage: number; amount: number }>;
  unitReference: string;
  bedroom: string;
  unitPrice: number;
  unitAreaSqft: number;
  annualRent: number;
  annualRentLow: number;
  annualRentHigh: number;
  occupancyRate: number;
  effectiveAnnualRent: number;
  serviceChargePerSqft: number;
  annualServiceCharge: number;
  otherAnnualCosts: number;
  acquisitionCosts: number;
  acquisitionCostBreakdown: AcquisitionCostLine[];
  allInCost: number;
  netAnnualIncome: number;
  effectiveNetAnnualIncome: number;
  unitPricePerSqft: number;
  annualRentPerSqft: number;
  grossYield: number;
  netYield: number;
  effectiveNetYield: number;
  incomeAnalysisEligible: boolean;
  areaBenchmark: {
    value: number;
    display: string;
    label: string;
    period: string;
    sourceLabel: string;
    sourceUrl: string;
    note: string;
  } | null;
  priceVsAreaPercent: number | null;
  communityContext: ReportCommunityContext | null;
  nearby: NearbyPlace[];
  publishedTravelTimes: PublishedTravelTime[];
  upcoming: UpcomingProject[];
  demandSegments: string[];
  demographicContext: CommunityResearch["demographicContext"];
  rentalEvidence: CommunityResearch["rentalEvidence"];
  rentalEvidenceNotes: string;
  advisoryScreen: AdvisoryScreen;
  confirmationNotes: string;
  catalogueUpdatedAt: string;
};

export type AiBriefNarrative = {
  executiveSummary: string;
  recommendation: string;
  marketPosition: string;
  locationStory: string;
  riskNotes: string[];
};

export type CompanyReportProfile = {
  legalName: string;
  displayName: string;
  summary: string;
  tagline: string;
  orn: string;
  phone: string;
  email: string;
  address: string;
  sourceUrl: string;
  services: Array<{ title: string; copy: string }>;
};

export type UaeReportContext = {
  headline: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  timeline: {
    past: string;
    present: string;
    future: string;
  };
  forces: Array<{ title: string; detail: string }>;
  initiatives: Array<{
    id: string;
    name: string;
    category: string;
    status: StrategicStatus;
    timing: string;
    summary: string;
    marketImpact: string;
    sourceLabel: string;
    sourceUrl: string;
  }>;
  sources: Array<{
    id: string;
    label: string;
    publisher: string;
    url: string;
    verifiedAt: string;
  }>;
};

export type EmirateReportContext = {
  slug: EmirateSlug;
  name: EmirateName;
  descriptor: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  investmentCase: string;
  viabilityChecks: string[];
  anchors: Array<{ label: string; value: string }>;
  timeline: {
    past: string;
    present: string;
    future: string;
  };
  knowledgePillars: Array<{
    id: string;
    label: string;
    summary: string;
    signals: Array<{ title: string; detail: string; sourceIds: string[] }>;
  }>;
  gallery: Array<{ src: string; alt: string; credit: string }>;
  signals: Array<{ title: string; detail: string; sourceIds: string[] }>;
  catalysts: Array<{
    id: string;
    name: string;
    category: string;
    status: StrategicStatus;
    timing: string;
    summary: string;
    marketImpact: string;
    sourceLabel: string;
    sourceUrl: string;
  }>;
  communities: ReportCommunityContext[];
  establishments: ReportEstablishmentContext[];
  sources: Array<{
    id: string;
    label: string;
    publisher: string;
    url: string;
    verifiedAt: string;
  }>;
};

export type CuratedBriefContent = {
  executiveSummary: string;
  recommendation: string;
  marketPosition: string;
  locationStory: string;
  riskNotes: string[];
  advisoryScope: string[];
  nextSteps: string[];
  projects: CuratedProjectSnapshot[];
  companyProfile: CompanyReportProfile;
  uaeContext: UaeReportContext;
  emirateContexts: EmirateReportContext[];
  liveMarketData: {
    capturedAt: string;
    status: "stored-observations" | "live-data-available" | "reference-only";
    observations: LatestMarketObservation[];
  };
  notes: string;
  disclosure?: string;
  preparedAt: string;
  advisor: AdvisorSnapshot;
  presentation?: {
    includeTimelinePanels?: boolean;
    compactProjectModules?: boolean;
    maxEnrichedImages?: number;
    coverImageUrl?: string;
  };
  confirmation: {
    confirmedAt: string;
    confirmedBy: string;
    statement: string;
    title?: string;
    byline?: string;
    statusLabel?: string;
  };
  marketContext: {
    scope: string;
    period: string;
    headline: Array<{ label: string; display: string; note: string }>;
    charts: ReportChart[];
    sources: Array<{ label: string; url: string }>;
    researchCoverage: {
      selectedProjects: number;
      emirates: string[];
      areas: number;
      benchmarks: number;
      coordinates: number;
      rentalEvidence: number;
      pipelineRecords: number;
    };
  };
  areaDemandResearch: AreaDemandResearch | null;
  residencyGuidance: {
    title: string;
    threshold: string;
    status: string;
    summary: string;
    sourceLabel: string;
    sourceUrl: string;
  };
};

export type CuratedBriefDocument = {
  id: string;
  type: "sales_offer" | "proposal" | "comparison";
  title: string;
  client_name: string;
  created_at: string;
  content: CuratedBriefContent;
};

type ReportEnv = {
  IMAGES?: ImagesBinding;
  ASSETS?: Fetcher;
  DB?: D1Database;
  MEDIA?: R2Bucket;
};

const registry = registryData as {
  projects: ReportProjectRecord[];
  generatedAt: string;
  totalUaeProjects: number;
};
const curatedMediaBySlug = new Map(curatedLaunches.map((project) => [project.slug, project]));
const projectMediaOverrides = projectMediaData as Record<string, ProjectMediaOverride>;

const REPORT_SIGNAL_PRIORITY: Record<EmirateSlug, readonly string[]> = {
  dubai: ["Dubai Economic Agenda D33", "Free zones and global access", "A multi-centre visitor economy", "Al Maktoum International Airport"],
  "abu-dhabi": ["Institutional capital", "Yas Island entertainment", "Louvre + Guggenheim Abu Dhabi", "Etihad Rail passenger network"],
  sharjah: ["SRTIP innovation ecosystem", "Knowledge economy", "Heart of Sharjah", "Sharjah Sustainable City"],
  "ras-al-khaimah": ["RAKEZ", "Al Marjan Island", "Visitor-economy diversification", "Mountain economy"],
  ajman: ["Ajman Free Zone", "Ajman Port", "Al Zorah destination", "Compact city logic"],
  fujairah: ["Port of Fujairah", "Operating Abu Dhabi–Fujairah passenger rail", "Mountain-and-marine destination", "Energy-storage corridor"],
  "umm-al-quwain": ["Port and free-zone platform", "Blue-economy direction", "Nature-led tourism", "Mangroves as economic infrastructure"],
};

const REPORT_CATALYST_PRIORITY: Record<EmirateSlug, readonly string[]> = {
  dubai: ["dubai-airport", "dubai-blue-line", "therme-dubai", "duma"],
  "abu-dhabi": ["disney-ad", "guggenheim-ad", "harry-potter-ad", "sphere-ad"],
  sharjah: ["sharjah-airport-expansion", "sharjah-sustainable-city-amenities", "sharjah-exhibition-centre", "sharjah-creative-quarter"],
  "ras-al-khaimah": ["wynn-rak", "al-marjan-pipeline", "rak-tourism-vision", "saqr-port-2"],
  ajman: ["ajman-vision-2030", "al-zorah-growth", "ajman-port-expansion", "ajman-city-centre-roads"],
  fujairah: ["fujairah-west-east-pipeline", "fujairah-new-terminals", "fujairah-2040-programme", "project-hajar"],
  "umm-al-quwain": ["siniya-island", "uaq-emirates-road", "uaq-blue-2031", "uaq-logistics-city"],
};

function buildCompanyReportProfile(): CompanyReportProfile {
  return {
    legalName: cbaCompany.legalName,
    displayName: cbaCompany.displayName,
    summary: cbaCompany.summary,
    tagline: cbaCompany.tagline,
    orn: cbaCompany.orn,
    phone: cbaCompany.phone,
    email: cbaCompany.email,
    address: cbaCompany.addressLines.join(", "),
    sourceUrl: cbaCompany.sourceUrl,
    services: cbaServices.slice(0, 8).map((service) => ({ title: service.title, copy: service.copy })),
  };
}

function buildUaeReportContext(): UaeReportContext {
  const initiatives = uaeMarketOverview.futureInitiatives.slice(0, 6).map((initiative) => {
    const primarySource = uaeMarketOverview.sources.find((source) => initiative.sourceIds.includes(source.id));
    return {
      id: initiative.id,
      name: initiative.name,
      category: initiative.category,
      status: initiative.status,
      timing: initiative.timing,
      summary: initiative.summary,
      marketImpact: initiative.marketImpact,
      sourceLabel: primarySource?.label || "PSR UAE Market Atlas source",
      sourceUrl: primarySource?.href || "",
    };
  });
  const sourceIds = new Set(uaeMarketOverview.futureInitiatives.slice(0, 6).flatMap((initiative) => initiative.sourceIds));
  return {
    headline: uaeMarketOverview.headline,
    summary: uaeMarketOverview.summary,
    imageUrl: uaeMarketOverview.cover.src,
    imageAlt: uaeMarketOverview.cover.alt,
    imageCredit: uaeMarketOverview.cover.credit,
    timeline: {
      past: "The report reads UAE property through the federation's longer trade, settlement, port, industry, energy and institution-building story rather than treating real estate as the starting point.",
      present: uaeMarketOverview.summary,
      future: `The forward view tracks ${initiatives.slice(0, 4).map((initiative) => `${initiative.name} (${initiative.status.toLowerCase()})`).join(", ")}; targets remain separate from delivered outcomes.`,
    },
    forces: uaeMarketOverview.forces.map((force) => ({ ...force })),
    initiatives,
    sources: uaeMarketOverview.sources
      .filter((source) => sourceIds.has(source.id))
      .map((source) => ({ id: source.id, label: source.label, publisher: source.publisher, url: source.href, verifiedAt: source.verifiedAt })),
  };
}

function emirateSlugForName(name: string) {
  const normalized = cleanText(name, 80).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return EMIRATE_IDENTITIES.find((emirate) => emirate.slug === normalized || emirate.name.toLowerCase() === name.toLowerCase())?.slug;
}

const ESTABLISHMENT_CATEGORY_ORDER = [
  "Healthcare",
  "Education",
  "Retail and leisure",
  "Airport",
  "Transport and connectivity",
  "Business district",
  "Business and events",
  "Culture",
  "Leisure and entertainment",
  "Waterfront and leisure",
  "Community and district",
  "Establishment",
];

function selectReportEstablishments(projects: CuratedProjectSnapshot[], emirate: EmirateName) {
  const candidates: ReportEstablishmentContext[] = projects.flatMap((project) => [
    ...project.publishedTravelTimes.map((place) => ({
      name: place.destination,
      category: place.category,
      proximity: `${place.minutes} min published travel time from ${project.name}`,
      community: project.communityContext?.name || project.location,
      sourceLabel: place.sourceLabel,
      sourceUrl: place.sourceUrl,
      verifiedAt: place.verifiedAt,
    })),
    ...project.nearby.map((place) => ({
      name: place.name,
      category: place.category,
      proximity: `Approx. ${place.distanceKm.toFixed(1)} km straight-line from ${project.name}`,
      community: project.communityContext?.name || project.location,
      sourceLabel: "PSR coordinate-based location screen",
      sourceUrl: "",
      verifiedAt: project.catalogueUpdatedAt,
    })),
  ]);

  // Supplement project-linked evidence with clearly labelled emirate-wide
  // reference points. These do not feed the project accessibility score.
  DESTINATIONS.filter((place) => place.emirate === emirate).forEach((place) => {
    candidates.push({
      name: place.name,
      category: place.category,
      proximity: "Emirate-wide reference point; confirm project-specific travel time",
      community: `${emirate} reference network`,
      sourceLabel: place.sourceLabel || "PSR location index",
      sourceUrl: place.sourceUrl || "",
      verifiedAt: place.verifiedAt || "",
    });
  });

  const unique = candidates.filter((item, index, items) => items.findIndex((candidate) => normalizePlaceName(candidate.name) === normalizePlaceName(item.name)) === index);
  const selected: ReportEstablishmentContext[] = [];
  ESTABLISHMENT_CATEGORY_ORDER.forEach((category) => {
    const match = unique.find((item) => item.category === category && !selected.includes(item));
    if (match) selected.push(match);
  });
  unique.forEach((item) => {
    if (!selected.includes(item)) selected.push(item);
  });
  return selected.slice(0, 8);
}

export function buildEmirateReportContexts(projects: CuratedProjectSnapshot[]): EmirateReportContext[] {
  const selectedSlugs = [...new Set(projects.map((project) => emirateSlugForName(project.emirate)).filter((slug): slug is EmirateSlug => Boolean(slug)))];

  return selectedSlugs.flatMap((slug) => {
    const overview = emirateMarketOverviews[slug];
    const profile = emirateProfiles.find((candidate) => candidate.slug === slug);
    if (!overview || !profile) return [];
    const contextProjects = projects.filter((project) => emirateSlugForName(project.emirate) === slug);
    const communities = contextProjects
      .flatMap((project) => project.communityContext || [])
      .reduce<ReportCommunityContext[]>((items, community) => {
        const existing = items.find((candidate) => candidate.slug === community.slug);
        if (!existing) {
          items.push({ ...community, selectedProjects: [...community.selectedProjects] });
          return items;
        }
        existing.selectedProjects = [...existing.selectedProjects, ...community.selectedProjects]
          .filter((item, index, projects) => projects.findIndex((candidate) => candidate.name === item.name) === index);
        existing.timeline.future = `Selected pipeline: ${existing.selectedProjects.map((item) => `${item.name} (${item.handover || "date to be confirmed"})`).join("; ")}. Future phases, amenities and completion dates must be checked against the latest master-developer and project documents.`;
        return items;
      }, [])
      .slice(0, 6);
    const establishments = selectReportEstablishments(contextProjects, profile.name);

    const allSignals = overview.pillars.flatMap((pillar) => pillar.signals);
    const prioritizedSignals = REPORT_SIGNAL_PRIORITY[slug]
      .flatMap((title) => allSignals.find((signal) => signal.title === title) || [])
      .concat(allSignals)
      .filter((signal, index, items) => items.findIndex((candidate) => candidate.title === signal.title) === index)
      .slice(0, 4);
    const prioritizedCatalysts = REPORT_CATALYST_PRIORITY[slug]
      .flatMap((id) => overview.futureInitiatives.find((initiative) => initiative.id === id) || [])
      .concat(overview.futureInitiatives)
      .filter((initiative, index, items) => items.findIndex((candidate) => candidate.id === initiative.id) === index)
      .slice(0, 4);
    const referencedSourceIds = new Set([
      ...overview.sources.slice(0, 2).map((item) => item.id),
      ...overview.pillars.flatMap((pillar) => pillar.signals.flatMap((signal) => signal.sourceIds)),
      ...prioritizedSignals.flatMap((signal) => signal.sourceIds),
      ...prioritizedCatalysts.flatMap((initiative) => initiative.sourceIds),
    ]);
    const marketSources = overview.sources
      .filter((item) => referencedSourceIds.has(item.id))
      .map((item) => ({
        id: item.id,
        label: item.label,
        publisher: item.publisher,
        url: item.href,
        verifiedAt: item.verifiedAt,
      }));
    const contextualSources = [
      ...communities.filter((community) => community.sourceUrl).map((community) => ({
        id: `community-${community.slug}`,
        label: community.sourceLabel,
        publisher: "Community source",
        url: community.sourceUrl,
        verifiedAt: community.verifiedAt,
      })),
      ...establishments.filter((place) => place.sourceUrl).map((place) => ({
        id: `access-${normalizePlaceName(place.name).replace(/\s+/g, "-")}`,
        label: place.sourceLabel,
        publisher: "Project location source",
        url: place.sourceUrl,
        verifiedAt: place.verifiedAt,
      })),
    ];
    const sources = [...marketSources, ...contextualSources]
      .filter((item, index, items) => items.findIndex((candidate) => (candidate.url || candidate.id) === (item.url || item.id)) === index);

    return [{
      slug,
      name: profile.name,
      descriptor: overview.descriptor,
      imageUrl: overview.cover.src,
      imageAlt: overview.cover.alt,
      imageCredit: overview.cover.credit,
      investmentCase: `${overview.executiveSummary} ${overview.timeline.outlook}`,
      viabilityChecks: profile.investmentLens.slice(0, 3),
      anchors: [
        { label: "Economic anchor", value: overview.comparison.economicAnchor },
        { label: "Defining asset", value: overview.comparison.definingAsset },
        { label: "Natural advantage", value: overview.comparison.naturalAsset },
        { label: "Next catalyst", value: overview.comparison.nextCatalyst },
      ],
      timeline: {
        past: overview.timeline.past,
        present: overview.timeline.present,
        future: overview.timeline.outlook,
      },
      knowledgePillars: overview.pillars.map((pillar) => ({
        id: pillar.id,
        label: pillar.label,
        summary: pillar.summary,
        signals: pillar.signals.map((signal) => ({ title: signal.title, detail: signal.detail, sourceIds: [...signal.sourceIds] })),
      })),
      gallery: profile.gallery
        .filter((image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index)
        .slice(0, 3)
        .map((image) => ({ ...image, credit: "PSR public website media library" })),
      signals: prioritizedSignals.map((signal) => ({
        title: signal.title,
        detail: signal.detail,
        sourceIds: [...signal.sourceIds],
      })),
      catalysts: prioritizedCatalysts.map((initiative) => {
        const primarySource = overview.sources.find((item) => initiative.sourceIds.includes(item.id));
        return {
          id: initiative.id,
          name: initiative.name,
          category: initiative.category,
          status: initiative.status,
          timing: initiative.timing,
          summary: initiative.summary,
          marketImpact: initiative.marketImpact,
          sourceLabel: primarySource?.label || "PSR Market Atlas source",
          sourceUrl: primarySource?.href || "",
        };
      }),
      communities,
      establishments,
      sources,
    }];
  });
}

function uniqueMedia(items: string[]) {
  const seen = new Set<string>();
  const media: string[] = [];
  for (const item of items) {
    const source = cleanText(item, 1_000);
    if (!isReportImageSource(source)) continue;
    const key = source.startsWith("/") ? source : source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    media.push(source);
  }
  return media;
}

function isReportImageSource(source: string) {
  if (!source) return false;
  if (source.startsWith("/")) {
    return /^\/(?:projects|project-document-previews|insights|emirates|hero|brand|team)\//.test(source)
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

function mediaSectionsFromCandidates(candidates: ProjectMediaSections, hero = ""): ProjectMediaSections {
  const seen = new Set<string>();
  const heroKey = hero.startsWith("/") ? hero : hero.toLowerCase();
  if (heroKey) seen.add(heroKey);
  const take = (items: string[]) => uniqueMedia(items).filter((source) => {
    const key = source.startsWith("/") ? source : source.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Specific, client-meaningful media classes own an image before the generic
  // gallery so one asset is never repeated under conflicting labels.
  const floorplans = take(candidates.floorplans);
  const interiors = take(candidates.interiors);
  const exteriors = take(candidates.exteriors);
  const gallery = take(candidates.gallery);
  return { gallery, exteriors, interiors, floorplans };
}

function projectReportMediaSections(project: ReportProjectRecord) {
  const curated = curatedMediaBySlug.get(project.slug);
  const override = projectMediaOverrides[project.slug];
  return mediaSectionsFromCandidates({
    gallery: [curated?.image || "", override?.hero || "", ...(curated?.gallery || []), ...(override?.gallery || [])],
    exteriors: [...(curated?.exteriors || []), ...(override?.exteriors || [])],
    interiors: [...(curated?.interiors || []), ...(override?.interiors || [])],
    floorplans: [...(curated?.floorplans || []), ...(override?.floorplans || [])],
  }, project.image || "");
}

async function enrichedProjectReportMedia(project: CuratedProjectSnapshot, env: ReportEnv) {
  let imported: Awaited<ReturnType<typeof getImportedProject>> = null;
  if (env.ASSETS || env.IMAGES) {
    try {
      imported = await getImportedProject(project.slug);
    } catch {
      imported = null;
    }
  }
  const stored = project.mediaSections || { gallery: project.mediaGallery || [], exteriors: [], interiors: [], floorplans: [] };
  const sections = mediaSectionsFromCandidates({
    gallery: [...stored.gallery, imported?.hero || "", ...(imported?.gallery || [])],
    exteriors: [...stored.exteriors, ...(imported?.exteriors || [])],
    interiors: [...stored.interiors, ...(imported?.interiors || [])],
    floorplans: project.floorplanReferences !== undefined
      ? project.floorplanReferences.map(reference => reference.url)
      : [...stored.floorplans, ...(imported?.floorplans || [])],
  }, project.imageUrl || "");
  let remaining = MAX_PROJECT_REPORT_IMAGES;
  const bounded = (items: string[]) => {
    const selected = items.slice(0, remaining);
    remaining -= selected.length;
    return selected;
  };
  return {
    floorplans: bounded(sections.floorplans),
    interiors: bounded(sections.interiors),
    exteriors: bounded(sections.exteriors),
    gallery: bounded(sections.gallery),
  } satisfies ProjectMediaSections;
}

const DESTINATIONS: Array<{
  emirate: string;
  name: string;
  category: string;
  lat?: number;
  lon?: number;
  sourceLabel?: string;
  sourceUrl?: string;
  verifiedAt?: string;
}> = [
  { emirate: "Dubai", name: "Dubai International Airport", category: "Airport", lat: 25.2532, lon: 55.3657 },
  { emirate: "Dubai", name: "Al Maktoum International Airport", category: "Airport", lat: 24.8964, lon: 55.1614 },
  { emirate: "Dubai", name: "Dubai Mall and Downtown", category: "Retail and leisure", lat: 25.1972, lon: 55.2796 },
  { emirate: "Dubai", name: "Dubai International Financial Centre", category: "Business district", lat: 25.2114, lon: 55.2797 },
  { emirate: "Dubai", name: "Mall of the Emirates", category: "Retail and leisure", lat: 25.1181, lon: 55.2006 },
  { emirate: "Dubai", name: "Dubai Marina Mall", category: "Retail and leisure", lat: 25.0768, lon: 55.1398 },
  { emirate: "Dubai", name: "Expo City Dubai", category: "Business and events", lat: 24.9615, lon: 55.1503 },
  { emirate: "Dubai", name: "Dubai Hills Mall", category: "Retail and leisure", lat: 25.1004, lon: 55.2391 },
  { emirate: "Dubai", name: "King's College Hospital Dubai", category: "Healthcare", lat: 25.1001, lon: 55.2472 },
  { emirate: "Dubai", name: "Dubai Knowledge Park", category: "Education", sourceLabel: "Dubai Knowledge Park", sourceUrl: "https://dkp.ae/", verifiedAt: "2026-09-06" },
  { emirate: "Dubai", name: "Meydan Racecourse", category: "Leisure", lat: 25.1578, lon: 55.3002 },
  { emirate: "Abu Dhabi", name: "Zayed International Airport", category: "Airport", lat: 24.4331, lon: 54.6511 },
  { emirate: "Abu Dhabi", name: "Yas Mall", category: "Retail and leisure", lat: 24.4886, lon: 54.6077 },
  { emirate: "Abu Dhabi", name: "The Galleria Al Maryah Island", category: "Retail and business", lat: 24.5018, lon: 54.3872 },
  { emirate: "Abu Dhabi", name: "Cleveland Clinic Abu Dhabi", category: "Healthcare", lat: 24.4991, lon: 54.3881 },
  { emirate: "Abu Dhabi", name: "New York University Abu Dhabi", category: "Education", lat: 24.5233, lon: 54.4345 },
  { emirate: "Abu Dhabi", name: "Louvre Abu Dhabi", category: "Culture", lat: 24.5337, lon: 54.3985 },
  { emirate: "Ras Al Khaimah", name: "Ras Al Khaimah International Airport", category: "Airport", lat: 25.6135, lon: 55.9388 },
  { emirate: "Ras Al Khaimah", name: "Al Hamra Mall", category: "Retail and leisure", lat: 25.7021, lon: 55.7805 },
  { emirate: "Ras Al Khaimah", name: "Al Hamra Golf Club", category: "Leisure", lat: 25.6939, lon: 55.7822 },
  { emirate: "Ras Al Khaimah", name: "RAK Hospital", category: "Healthcare", lat: 25.7905, lon: 55.968 },
  { emirate: "Ras Al Khaimah", name: "American University of Ras Al Khaimah", category: "Education", sourceLabel: "American University of Ras Al Khaimah", sourceUrl: "https://aurak.ac.ae/home", verifiedAt: "2026-09-06" },
  { emirate: "Sharjah", name: "Sharjah International Airport", category: "Airport", lat: 25.3286, lon: 55.5172 },
  { emirate: "Sharjah", name: "City Centre Al Zahia", category: "Retail and leisure", lat: 25.318, lon: 55.537 },
  { emirate: "Sharjah", name: "University City of Sharjah", category: "Education", lat: 25.297, lon: 55.488 },
  { emirate: "Sharjah", name: "University Hospital Sharjah", category: "Healthcare", sourceLabel: "University Hospital Sharjah", sourceUrl: "https://www.uhs.ae/about-us", verifiedAt: "2026-09-06" },
  { emirate: "Sharjah", name: "Al Majaz Waterfront", category: "Leisure", lat: 25.3288, lon: 55.3869 },
  { emirate: "Ajman", name: "Ajman City Centre", category: "Retail and leisure", lat: 25.399, lon: 55.4796 },
  { emirate: "Ajman", name: "Ajman University", category: "Education", lat: 25.4019, lon: 55.5066 },
  { emirate: "Ajman", name: "Sheikh Khalifa Medical City Ajman", category: "Healthcare", lat: 25.4058, lon: 55.513 },
  { emirate: "Fujairah", name: "Fujairah International Airport", category: "Airport", lat: 25.1122, lon: 56.3239 },
  { emirate: "Fujairah", name: "Fujairah City Centre", category: "Retail and leisure", lat: 25.1287, lon: 56.3102 },
  { emirate: "Fujairah", name: "University of Fujairah", category: "Education", sourceLabel: "University of Fujairah", sourceUrl: "https://www.uof.ac.ae/", verifiedAt: "2026-09-06" },
  { emirate: "Fujairah", name: "Fujairah Hospital", category: "Healthcare", sourceLabel: "Emirates Health Services - Fujairah Hospital", sourceUrl: "https://www.ehs.gov.ae/Handlers/DownloadPDF.ashx?id=32261", verifiedAt: "2026-09-06" },
  { emirate: "Umm Al Quwain", name: "Mall of UAQ", category: "Retail and leisure", lat: 25.5446, lon: 55.5853 },
  { emirate: "Umm Al Quwain", name: "Umm Al Quwain Hospital", category: "Healthcare", lat: 25.5686, lon: 55.5627 },
  { emirate: "Umm Al Quwain", name: "Umm Al Quwain University", category: "Education", sourceLabel: "Umm Al Quwain University", sourceUrl: "https://uaqu.ac.ae/", verifiedAt: "2026-09-06" },
];

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return value > 0 ? `AED ${Math.round(value).toLocaleString("en-AE")}` : "Not confirmed";
}

function percent(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "Not modelled";
}

function marketObservationDisplay(observation: LatestMarketObservation) {
  if (observation.value.text) return observation.value.text;
  if (observation.value.numeric === null) return "Not available";
  const value = observation.value.numeric.toLocaleString("en-AE", { maximumFractionDigits: 2 });
  const currency = observation.value.currencyCode && !observation.value.unit.toUpperCase().includes(observation.value.currencyCode.toUpperCase())
    ? `${observation.value.currencyCode} `
    : "";
  return `${currency}${value}${observation.value.unit ? ` ${observation.value.unit}` : ""}`.trim();
}

function marketMetricLabel(metricKey: string) {
  return cleanText(metricKey, 96).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeArea(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*emirate\)/gi, "")
    .replace(/\b(?:dubai|abu dhabi|sharjah|ajman|fujairah|ras al khaimah|umm al quwain)\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePlaceName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function projectCommunityContext(project: ReportProjectRecord): ReportCommunityContext | null {
  const slug = communitySlugFor(project.area);
  if (!slug) return null;
  const directory = getCommunityDirectory();
  const community = directory.find((candidate) => candidate.emirate === project.emirate && candidate.projects.some((item) => item.slug === project.slug))
    || directory.find((candidate) => candidate.emirate === project.emirate && candidate.slug === slug);
  if (!community) return null;
  return {
    slug: community.slug,
    name: community.name,
    route: `/communities/${community.slug}`,
    imageUrl: community.image,
    descriptor: community.descriptor,
    overview: community.overview,
    activeProjects: community.activeProjects,
    developers: community.developers.slice(0, 5),
    propertyTypes: community.propertyTypes.slice(0, 6),
    timeline: {
      past: community.source
        ? `Established context recorded by ${community.source.label}: ${community.overview}`
        : `The current PSR catalogue identifies ${community.name} as ${community.descriptor.toLowerCase()}. A separate verified development-history record is not stored.`,
      present: `PSR currently indexes ${community.activeProjects} active project${community.activeProjects === 1 ? "" : "s"} in this community${community.developers.length ? ` across ${community.developers.slice(0, 4).join(", ")}` : ""}.`,
      future: `${project.name} carries a ${project.handover || "handover date to be confirmed"} planning reference. Future phases, amenities and completion dates must be checked against the latest master-developer and project documents.`,
    },
    selectedProjects: [{ name: project.name, developer: project.developer, handover: project.handover }],
    sourceLabel: community.source?.label || "PSR live project catalogue",
    sourceUrl: community.source?.url || "",
    verifiedAt: community.source?.verifiedAt || cleanText(project.sourceUpdatedAt || "", 80),
  };
}

function establishmentCategory(value: string) {
  const name = value.toLowerCase();
  if (/hospital|clinic|medical|health/.test(name)) return "Healthcare";
  if (/school|university|college|academy|academic|nursery|education/.test(name)) return "Education";
  if (/airport|aviation/.test(name)) return "Airport";
  if (/louvre|guggenheim|museum|library|gallery|cultural|palace/.test(name)) return "Culture";
  if (/mall|retail|outlet|shopping/.test(name)) return "Retail and leisure";
  if (/metro|rail|station|road|highway/.test(name)) return "Transport and connectivity";
  if (/world trade centre|expo city|difc|adgm|global market|financial|business|downtown/.test(name)) return "Business district";
  if (/wynn|ferrari world|theme park|global village|arena|racecourse|golf|sports|resort|amusement/.test(name)) return "Leisure and entertainment";
  if (/beach|waterfront|marina|harbour|harbor/.test(name)) return "Waterfront and leisure";
  if (/island|city|village|oasis|palm/.test(name)) return "Community and district";
  if (/park/.test(name)) return "Leisure and entertainment";
  return "Establishment";
}

function projectPublishedTravelTimes(project: ReportProjectRecord): PublishedTravelTime[] {
  const curated = curatedMediaBySlug.get(project.slug);
  if (!curated?.travelTimes?.length) return [];
  return curated.travelTimes
    .map((item) => ({
      destination: cleanText(item.destination, 120),
      minutes: cleanText(item.minutes, 24),
      category: establishmentCategory(item.destination),
      sourceLabel: cleanText(curated.sourceLabel, 180) || `${project.name} project source`,
      sourceUrl: cleanText(curated.sourceUrl, 1_000),
      verifiedAt: cleanText(curated.sourceUpdatedAt, 80),
    }))
    .filter((item) => item.destination && item.minutes && !/^on request$/i.test(item.minutes))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.destination.toLowerCase() === item.destination.toLowerCase()) === index)
    .slice(0, 8);
}

function parseCoordinates(value = "") {
  const [lat, lon] = value.split(",").map((part) => Number(part.trim()));
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? { lat, lon }
    : null;
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earth = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earth * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isDubaiSouthProject(project: Pick<CuratedProjectSnapshot, "location" | "emirate" | "name">) {
  if (project.emirate !== "Dubai") return false;
  return /dubai south|emaar south|expo living|expo valley|azizi venice|waada/i.test(`${project.location} ${project.name}`);
}

export function buildSelectedProjectDistances(
  projects: Array<Pick<CuratedProjectSnapshot, "slug" | "name" | "coordinates">>,
): SelectedProjectDistance[] {
  const located = projects.flatMap((project) => {
    const coordinates = parseCoordinates(project.coordinates);
    return coordinates ? [{ ...project, coordinates }] : [];
  });
  const distances: SelectedProjectDistance[] = [];
  for (let fromIndex = 0; fromIndex < located.length; fromIndex += 1) {
    for (let toIndex = fromIndex + 1; toIndex < located.length; toIndex += 1) {
      const from = located[fromIndex];
      const to = located[toIndex];
      distances.push({
        fromSlug: from.slug,
        fromName: from.name,
        toSlug: to.slug,
        toName: to.name,
        distanceKm: Math.round(distanceKm(from.coordinates, to.coordinates) * 10) / 10,
        basis: "straight-line",
        note: "Approximate straight-line distance from the stored PSR coordinates; verify the exact site pin and driving route.",
      });
    }
  }
  return distances.sort((left, right) => left.distanceKm - right.distanceKm || left.fromName.localeCompare(right.fromName));
}

export function buildAreaDemandResearch(projects: CuratedProjectSnapshot[]): AreaDemandResearch | null {
  const dubaiSouthProjects = projects.filter(isDubaiSouthProject);
  if (!dubaiSouthProjects.length) return null;
  return {
    area: "Dubai South",
    evidenceDate: DUBAI_SOUTH_RESEARCH_DATE,
    evidenceScope: dubaiSouthProjects.length === projects.length
      ? "All selected projects are within the Dubai South, Emaar South or Expo City southern-corridor screen."
      : `${dubaiSouthProjects.length} of ${projects.length} selected projects fall within the Dubai South southern-corridor screen.`,
    demandDrivers: [...dubaiSouthDemandDrivers],
    tenantSegments: dubaiSouthTenantSegments.map((segment) => ({ ...segment, evidenceBasis: [...segment.evidenceBasis] })),
    listingSignals: dubaiSouthListingSignals.map((signal) => ({ ...signal })),
    priceBenchmarks: dubaiSouthPriceBenchmarks.map((benchmark) => ({ ...benchmark })),
    investorDemographics: dubaiSouthInvestorDemographicSignals.map((signal) => ({ ...signal })),
    projectDistances: buildSelectedProjectDistances(dubaiSouthProjects),
    limitations: [...dubaiSouthResearchLimitations],
    sources: dubaiSouthEvidenceSources.map((source) => ({ ...source })),
  };
}

function nearbyPlaces(project: ReportProjectRecord) {
  const origin = parseCoordinates(project.coordinates);
  if (!origin) return [];
  const ranked = DESTINATIONS
    .filter((place) => place.emirate === project.emirate && Number.isFinite(place.lat) && Number.isFinite(place.lon))
    .map((place) => ({
      name: place.name,
      category: place.category,
      distanceKm: distanceKm(origin, { lat: place.lat as number, lon: place.lon as number }),
    }))
    .filter((place) => place.distanceKm <= (place.category === "Airport" ? 40 : 15))
    .sort((left, right) => left.distanceKm - right.distanceKm);
  const selected: typeof ranked = [];
  const categories = new Set<string>();
  for (const place of ranked) {
    if (categories.has(place.category)) continue;
    selected.push(place);
    categories.add(place.category);
    if (selected.length === 8) break;
  }
  for (const place of ranked) {
    if (selected.includes(place)) continue;
    selected.push(place);
    if (selected.length === 8) break;
  }
  return selected.map((place) => ({ ...place, distanceKm: Math.round(place.distanceKm * 10) / 10 }));
}

function upcomingProjects(project: ReportProjectRecord, selectedSlugs: Set<string>) {
  const areaKey = normalizeArea(project.area);
  const origin = parseCoordinates(project.coordinates);
  return registry.projects
    .filter((candidate) =>
      !candidate.archived
      && candidate.slug !== project.slug
      && !selectedSlugs.has(candidate.slug)
      && candidate.emirate === project.emirate
      && Boolean(candidate.handover),
    )
    .map((candidate) => {
      const target = parseCoordinates(candidate.coordinates);
      const distance = origin && target ? distanceKm(origin, target) : null;
      const sameArea = areaKey && normalizeArea(candidate.area) === areaKey;
      return { candidate, distance, sameArea };
    })
    .filter(({ distance, sameArea }) => sameArea || (distance !== null && distance <= 10))
    .sort((left, right) => {
      if (left.sameArea !== right.sameArea) return left.sameArea ? -1 : 1;
      return (left.distance ?? 999) - (right.distance ?? 999);
    })
    .slice(0, 8)
    .map(({ candidate, distance }) => ({
      name: candidate.name,
      developer: candidate.developer,
      handover: candidate.handover || "To be confirmed",
      distanceKm: distance === null ? null : Math.round(distance * 10) / 10,
    }));
}

function demandSegments(project: ReportProjectRecord, nearby: NearbyPlace[]) {
  if (isDubaiSouthProject({ name: project.name, location: project.area, emirate: project.emirate })) {
    return dubaiSouthTenantSegments.map((segment) => segment.label).slice(0, 6);
  }
  const categories = new Set(nearby.map((place) => place.category.toLowerCase()));
  const context = `${project.propertyTypes.join(" ")} ${project.lifestyles.join(" ")} ${project.description || ""}`.toLowerCase();
  const segments = new Set<string>();
  if ([...categories].some((category) => category.includes("business"))) segments.add("Professional occupiers");
  if ([...categories].some((category) => category.includes("education") || category.includes("healthcare"))) segments.add("Family and long-stay households");
  if ([...categories].some((category) => category.includes("airport"))) segments.add("International and frequent travellers");
  if ([...categories].some((category) => category.includes("retail") || category.includes("leisure") || category.includes("culture"))) segments.add("Lifestyle-led residents");
  if (/\b(?:villa|townhouse|family|golf|school)\b/.test(context)) segments.add("Owner-occupier and family demand");
  if (/\b(?:waterfront|beach|marina|resort|branded|luxury)\b/.test(context)) segments.add("Premium and second-home demand");
  if (!segments.size) segments.add("UAE residential occupiers");
  return [...segments].slice(0, 6);
}

function demographicContext(project: ReportProjectRecord): CommunityResearch["demographicContext"] {
  if (project.emirate !== "Dubai") return null;
  return {
    scope: "Dubai emirate-wide context, not a community estimate",
    display: "4,248,200 residents at end-2024",
    note: "Dubai Statistics Center reports 68.53% male and 31.47% female at emirate level. A building or community tenant profile requires a separate, current comparable-leasing sample.",
    sourceLabel: "Dubai Statistics Center, Population Bulletin 2024",
    sourceUrl: "https://www.dsc.gov.ae/Publication/Population%20Bulletin%20Emirate%20of%20Dubai%20-%202024.pdf",
  };
}

function rentalEvidence(project: ReportProjectRecord): CommunityResearch["rentalEvidence"] {
  if (project.emirate === "Dubai") {
    return {
      status: "Advisor input required before client use",
      note: "Validate the selected configuration against the Dubai Land Department Rental Index and recent registered Ejari contracts. The prefill is a planning scenario, not an achieved-rent claim.",
      indexLabel: "Dubai Land Department Rental Index",
      indexUrl: "https://dubailand.gov.ae/en/eservices/rental-index/",
      datasetLabel: "Dubai Pulse DLD rent contracts open data",
      datasetUrl: "https://gslb.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open",
    };
  }
  return {
    status: "Current comparable schedule required",
    note: `No live ${project.emirate} rent-contract series is embedded. Replace the planning scenario with dated, configuration-matched leasing evidence before presentation.`,
    indexLabel: "Advisor-reviewed rental evidence",
    indexUrl: "",
    datasetLabel: "Current leasing comparable schedule",
    datasetUrl: "",
  };
}

function paymentSchedule(plan: string, unitPrice: number) {
  const match = plan.match(/\b\d{1,3}(?:\s*\/\s*\d{1,3}){1,5}\b/);
  const percentages = match ? match[0].split("/").map((part) => Number(part.trim())) : [];
  if (percentages.length < 2 || percentages.some((value) => value <= 0 || value > 100) || percentages.reduce((sum, value) => sum + value, 0) !== 100) return [];
  return percentages.map((percentage, index) => ({
    label: percentages.length === 2
      ? (index === 0 ? "During construction" : "On handover")
      : index === 0
        ? "On booking"
        : index === percentages.length - 1
          ? "On handover"
          : `Construction stage ${index}`,
    percentage,
    amount: unitPrice * percentage / 100,
  }));
}

export function buildProjectResearch(project: ReportProjectRecord, selectedSlugs = new Set([project.slug])): CommunityResearch {
  const nearby = nearbyPlaces(project);
  const benchmark = getAreaPricePerSqft(project.area, project.propertyTypes, project.emirate);
  return {
    areaBenchmark: benchmark ? {
      value: benchmark.value,
      display: benchmark.display,
      label: benchmark.label,
      period: benchmark.period,
      sourceLabel: benchmark.sourceLabel,
      sourceUrl: benchmark.sourceUrl,
      note: benchmark.note,
    } : null,
    nearby,
    upcoming: upcomingProjects(project, selectedSlugs),
    demandSegments: demandSegments(project, nearby),
    demographicContext: demographicContext(project),
    rentalEvidence: rentalEvidence(project),
  };
}

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function advisoryScreen(args: {
  priceVsAreaPercent: number | null;
  grossYield: number;
  effectiveNetYield: number;
  incomeAnalysisEligible: boolean;
  research: CommunityResearch;
  rentalEvidenceNotes: string;
}) {
  const { priceVsAreaPercent, grossYield, effectiveNetYield, incomeAnalysisEligible, research } = args;
  const valueScore = priceVsAreaPercent === null
    ? 50
    : boundedScore(80 - priceVsAreaPercent * 2);
  const incomeScore = incomeAnalysisEligible
    ? boundedScore(25 + grossYield * 6 + effectiveNetYield * 4)
    : 55;
  const categoryCoverage = new Set(research.nearby.map((place) => place.category)).size;
  const averageDistance = research.nearby.length
    ? research.nearby.reduce((sum, place) => sum + place.distanceKm, 0) / research.nearby.length
    : 40;
  const accessScore = research.nearby.length
    ? boundedScore(48 + categoryCoverage * 10 + Math.max(0, 22 - averageDistance))
    : 25;
  const demandScore = boundedScore(45 + research.demandSegments.length * 11);
  const supplyScore = boundedScore(82 - research.upcoming.length * 7);
  const evidenceScore = boundedScore(
    (research.areaBenchmark ? 30 : 0)
    + (research.nearby.length ? 25 : 0)
    + (research.demographicContext ? 15 : 0)
    + (args.rentalEvidenceNotes.trim() ? 30 : 0),
  );
  const factors: AdvisoryScoreFactor[] = [
    {
      label: "Value versus area",
      weight: 25,
      score: valueScore,
      rationale: priceVsAreaPercent === null
        ? "No dated area AED/sqft benchmark is stored; neutral score applied."
        : `${Math.abs(priceVsAreaPercent).toFixed(1)}% ${priceVsAreaPercent <= 0 ? "below" : "above"} the stored area benchmark.`,
    },
    {
      label: incomeAnalysisEligible ? "Rental return" : "Acquisition structure",
      weight: 25,
      score: incomeScore,
      rationale: incomeAnalysisEligible
        ? `${percent(grossYield)} gross and ${percent(effectiveNetYield)} occupancy-adjusted net scenario.`
        : "Off-plan screening focuses on unit price, fees, payment timing and documented handover terms.",
    },
    {
      label: "Accessibility",
      weight: 20,
      score: accessScore,
      rationale: research.nearby.length
        ? `${categoryCoverage} establishment categories across ${research.nearby.length} coordinate-based proximity checks.`
        : "Project coordinates or destination coverage are not available.",
    },
    {
      label: "Demand depth",
      weight: 15,
      score: demandScore,
      rationale: `${research.demandSegments.length} potential demand segments identified from location and property context.`,
    },
    {
      label: "Supply balance",
      weight: 10,
      score: supplyScore,
      rationale: `${research.upcoming.length} indexed same-area or approximately 10 km pipeline records screened.`,
    },
    {
      label: "Evidence quality",
      weight: 5,
      score: evidenceScore,
      rationale: args.rentalEvidenceNotes.trim()
        ? "Advisor rental note, area pricing and location evidence included where available."
        : "Current rental comparable notes are still required.",
    },
  ];
  const total = Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight / 100, 0));
  return {
    total,
    label: total >= 80 ? "Strong screen" : total >= 65 ? "Balanced screen" : total >= 50 ? "Selective review" : "Evidence or pricing review",
    statement: "Transparent advisory screen only. It is not a RERA valuation, lender valuation or return forecast.",
    factors,
  } satisfies AdvisoryScreen;
}

export function buildReportProjects(projects: ReportProjectRecord[], inputs: ConfirmedProjectInput[]) {
  const inputsBySlug = new Map(inputs.map((input) => [input.slug, input]));
  const selectedSlugs = new Set(projects.map((project) => project.slug));
  return projects.map((project): CuratedProjectSnapshot => {
    const input = inputsBySlug.get(project.slug);
    if (!input) throw new Error(`Confirmed unit facts are missing for ${project.name}.`);
    const unitPrice = number(input.unitPrice);
    const unitAreaSqft = number(input.unitAreaSqft);
    const annualRent = number(input.annualRent);
    const annualRentLow = number(input.annualRentLow);
    const annualRentHigh = number(input.annualRentHigh);
    const occupancyRate = Math.max(0, Math.min(100, number(input.occupancyRate)));
    const effectiveAnnualRent = annualRent * occupancyRate / 100;
    const serviceChargePerSqft = number(input.serviceChargePerSqft);
    const annualServiceCharge = unitAreaSqft * serviceChargePerSqft;
    const otherAnnualCosts = number(input.otherAnnualCosts);
    const acquisitionCosts = number(input.acquisitionCosts);
    const acquisitionCostBreakdown = (input.acquisitionCostBreakdown || [])
      .map((item) => ({
        label: cleanText(item.label, 80),
        amount: number(item.amount),
        display: cleanText(item.display || "", 40) || undefined,
        note: cleanText(item.note || "", 180) || undefined,
      }))
      .filter((item) => item.label)
      .slice(0, 4);
    const allInCost = unitPrice + acquisitionCosts;
    const netAnnualIncome = annualRent - annualServiceCharge - otherAnnualCosts;
    const effectiveNetAnnualIncome = effectiveAnnualRent - annualServiceCharge - otherAnnualCosts;
    const unitPricePerSqft = unitAreaSqft > 0 ? unitPrice / unitAreaSqft : 0;
    const annualRentPerSqft = unitAreaSqft > 0 ? annualRent / unitAreaSqft : 0;
    const grossYield = unitPrice > 0 ? annualRent / unitPrice * 100 : 0;
    const netYield = allInCost > 0 ? netAnnualIncome / allInCost * 100 : 0;
    const effectiveNetYield = allInCost > 0 ? effectiveNetAnnualIncome / allInCost * 100 : 0;
    const incomeAnalysisEligible = /completed/i.test(project.handover || "");
    const research = buildProjectResearch(project, selectedSlugs);
    const communityContext = projectCommunityContext(project);
    const publishedTravelTimes = projectPublishedTravelTimes(project);
    const benchmark = research.areaBenchmark;
    const priceVsAreaPercent = benchmark?.value && unitPricePerSqft
      ? (unitPricePerSqft - benchmark.value) / benchmark.value * 100
      : null;
    const rawStartingPrice = number(project.startingPrice.replace(/[^\d.]/g, ""));
    const rentalEvidenceNotes = cleanText(input.rentalEvidenceNotes, 600);
    const mediaSections = projectReportMediaSections(project);
    const floorplanSnapshot = dubaiSouthFloorplanSnapshot(project, cleanText(input.bedroom, 100));
    if (floorplanSnapshot) mediaSections.floorplans = floorplanSnapshot.references.map(reference => reference.url);
    const curatedProject = curatedMediaBySlug.get(project.slug);
    return {
      slug: project.slug,
      name: project.name,
      developer: project.developer,
      location: project.area,
      emirate: project.emirate,
      startingPrice: rawStartingPrice > 0 ? money(rawStartingPrice) : "On request",
      paymentPlan: project.paymentPlan || "On request",
      handover: project.handover || "To be confirmed",
      pricePerSqft: unitPricePerSqft > 0 ? `AED ${Math.round(unitPricePerSqft).toLocaleString("en-AE")}/sqft` : "Not confirmed",
      residences: project.propertyTypes.join(", ") || "Residential",
      bedrooms: project.bedrooms.join(", ") || "Confirm configuration",
      positioning: project.lifestyles.join(", ") || `${project.emirate} real estate`,
      imageUrl: project.image || "",
      mediaGallery: uniqueMedia([
        project.image || "",
        ...mediaSections.exteriors,
        ...mediaSections.interiors,
        ...mediaSections.floorplans,
        ...mediaSections.gallery,
      ]),
      mediaSections,
      ...(floorplanSnapshot ? { floorplanReferences: floorplanSnapshot.references, floorplanQualification: floorplanSnapshot.qualification } : {}),
      projectKnowledge: curatedProject ? {
        statusLabel: cleanText(curatedProject.statusLabel, 120),
        releaseNote: cleanText(curatedProject.releaseNote, 900),
        overview: curatedProject.overview.map((item) => cleanText(item, 900)).filter(Boolean).slice(0, 4),
        amenities: curatedProject.amenities.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 12),
        investmentPoints: curatedProject.investmentPoints.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, 8),
        unitPricing: curatedProject.unitPricing.map((item) => ({
          residence: cleanText(item.residence, 100),
          startingPrice: cleanText(item.startingPrice, 100),
          size: cleanText(item.size || "", 100),
        })).filter((item) => item.residence && item.startingPrice).slice(0, 8),
        sourceLabel: cleanText(curatedProject.sourceLabel, 180),
        sourceUrl: cleanText(curatedProject.sourceUrl, 1_000),
        verifiedAt: cleanText(curatedProject.sourceUpdatedAt, 80),
      } : null,
      lifecycle: {
        past: project.sourceUpdatedAt
          ? `The PSR project record and its source material were checked on ${project.sourceUpdatedAt}. A separate verified launch-history chronology is not stored in the report data.`
          : "The PSR catalogue does not store a separate verified launch-history chronology for this project; confirm earlier release phases and historic pricing before presenting them.",
        present: `${project.name} is currently presented as ${project.propertyTypes.join(", ") || "residential property"} in ${project.area}, with the selected ${cleanText(input.unitReference, 80) || "unit"} modelled at ${money(unitPrice)} and ${Math.round(unitAreaSqft).toLocaleString("en-AE")} sqft.`,
        future: `The stored handover reference is ${project.handover || "to be confirmed"}. Delivery, future supply, operating costs, achieved rent and resale depth must be rechecked at reservation and before exit.`,
      },
      coordinates: project.coordinates || "",
      paymentSchedule: paymentSchedule(project.paymentPlan || "", unitPrice),
      unitReference: cleanText(input.unitReference, 80) || "Selected unit",
      bedroom: cleanText(input.bedroom, 40) || "Selected configuration",
      unitPrice,
      unitAreaSqft,
      annualRent,
      annualRentLow,
      annualRentHigh,
      occupancyRate,
      effectiveAnnualRent,
      serviceChargePerSqft,
      annualServiceCharge,
      otherAnnualCosts,
      acquisitionCosts,
      acquisitionCostBreakdown,
      allInCost,
      netAnnualIncome,
      effectiveNetAnnualIncome,
      unitPricePerSqft,
      annualRentPerSqft,
      grossYield,
      netYield,
      effectiveNetYield,
      incomeAnalysisEligible,
      areaBenchmark: benchmark ? {
        value: benchmark.value,
        display: benchmark.display,
        label: benchmark.label,
        period: benchmark.period,
        sourceLabel: benchmark.sourceLabel,
        sourceUrl: benchmark.sourceUrl,
        note: benchmark.note,
      } : null,
      priceVsAreaPercent,
      communityContext,
      nearby: research.nearby,
      publishedTravelTimes,
      upcoming: research.upcoming,
      demandSegments: research.demandSegments,
      demographicContext: research.demographicContext,
      rentalEvidence: research.rentalEvidence,
      rentalEvidenceNotes,
      advisoryScreen: advisoryScreen({
        priceVsAreaPercent,
        grossYield,
        effectiveNetYield,
        incomeAnalysisEligible,
        research,
        rentalEvidenceNotes,
      }),
      confirmationNotes: cleanText(input.confirmationNotes, 600),
      catalogueUpdatedAt: cleanText(project.sourceUpdatedAt || "", 80),
    };
  });
}

function marketContext(
  projects: CuratedProjectSnapshot[],
  emirateContexts: EmirateReportContext[],
  uaeContext: UaeReportContext,
  companyProfile: CompanyReportProfile,
) {
  const lead = projects[0];
  const emirates = [...new Set(projects.map((project) => project.emirate).filter(Boolean))];
  const areas = new Set(projects.map((project) => project.location).filter(Boolean));
  const isDubaiOnly = projects.length > 0 && projects.every((project) => project.emirate === "Dubai");
  const localPipeline = new Set(projects.flatMap((project) => project.upcoming.map((item) => `${item.name}|${item.developer}`))).size;
  const benchmarkCount = projects.filter((project) => project.areaBenchmark).length;
  const coordinateCount = projects.filter((project) => parseCoordinates(project.coordinates)).length;
  const rentalEvidenceCount = projects.filter((project) => project.rentalEvidenceNotes.trim()).length;
  const benchmark = lead?.areaBenchmark;
  const priceChart: ReportChart | null = lead && benchmark && lead.unitPricePerSqft > 0 ? {
    title: "Selected unit versus area benchmark",
    subtitle: `${lead.location} - ${benchmark.period}`,
    unit: "AED per sqft",
    kind: "bars",
    data: [
      { label: "Selected unit", value: Math.round(lead.unitPricePerSqft), display: Math.round(lead.unitPricePerSqft).toLocaleString("en-AE") },
      { label: benchmark.label, value: benchmark.value, display: benchmark.value.toLocaleString("en-AE") },
    ],
    sourceLabel: `${benchmark.sourceLabel}; agent-confirmed unit price and area`,
    sourceUrl: benchmark.sourceUrl,
  } : null;
  const charts: ReportChart[] = [];
  if (isDubaiOnly) {
    charts.push(
      {
        title: "Residential sales value",
        subtitle: "Q1 year-on-year comparison",
        unit: "AED billions",
        kind: "columns",
        data: [
          { label: "Q1 2025", value: 117.1, display: "117.1bn" },
          { label: "Q1 2026", value: 143.1, display: "143.1bn" },
        ],
        sourceLabel: "Dubai residential market research, Q1 2026",
        sourceUrl: "https://www.engelvoelkers.com/ae/en/research/residential-market-report-q1-2026",
      },
      {
        title: "Monthly transaction momentum",
        subtitle: "Q1 2026 residential sales",
        unit: "Transactions",
        kind: "columns",
        data: [
          { label: "Jan-Feb avg.", value: 16100, display: "16.1k" },
          { label: "March", value: 12900, display: "12.9k" },
        ],
        sourceLabel: "Emirates NBD Research",
        sourceUrl: "https://www.emiratesnbdresearch.com/en/articles/dubai-residential-review-q1-2026?category=fx-forecasts",
      },
    );
  }
  if (priceChart) charts.push(priceChart);
  const sources = [
    ...(isDubaiOnly ? [
      { label: "Dubai Land Department Rental Index", url: "https://dubailand.gov.ae/en/eservices/rental-index/" },
      { label: "Dubai Land Department Q1 2026 rental-market release", url: "https://dubailand.gov.ae/en/news-media/dubai-s-rental-market-charts-stable-trajectory-reflecting-integrated-regulatory-environment-and-sustained-public-confidence/" },
      { label: "Dubai Pulse DLD rent contracts open data", url: "https://gslb.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open" },
      { label: "Dubai Statistics Center Population Bulletin 2024", url: "https://www.dsc.gov.ae/Publication/Population%20Bulletin%20Emirate%20of%20Dubai%20-%202024.pdf" },
      { label: "Dubai housing market H1 2026", url: "https://www.engelvoelkers.com/ae/en/resources/dubai-housing-market" },
      { label: "Emirates NBD Dubai Residential Review Q1 2026", url: "https://www.emiratesnbdresearch.com/en/articles/dubai-residential-review-q1-2026?category=fx-forecasts" },
    ] : []),
    ...projects.flatMap((project) => [
      ...(project.areaBenchmark?.sourceUrl ? [{ label: `${project.areaBenchmark.sourceLabel} - ${project.areaBenchmark.period}`, url: project.areaBenchmark.sourceUrl }] : []),
      ...(project.rentalEvidence.indexUrl ? [{ label: project.rentalEvidence.indexLabel, url: project.rentalEvidence.indexUrl }] : []),
      ...(project.rentalEvidence.datasetUrl ? [{ label: project.rentalEvidence.datasetLabel, url: project.rentalEvidence.datasetUrl }] : []),
      ...(project.demographicContext?.sourceUrl ? [{ label: project.demographicContext.sourceLabel, url: project.demographicContext.sourceUrl }] : []),
    ]),
    ...emirateContexts.flatMap((context) => context.sources.map((item) => ({
      label: `${context.name}: ${item.label}`,
      url: item.url,
    }))),
    ...uaeContext.sources.map((source) => ({ label: `UAE: ${source.label}`, url: source.url })),
    { label: `${companyProfile.displayName} company profile`, url: companyProfile.sourceUrl },
    { label: "UAE Government Golden Visa guidance", url: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa" },
    { label: `PSR UAE project index - ${registry.totalUaeProjects.toLocaleString("en-AE")} records`, url: "" },
  ].filter((source, index, all) => all.findIndex((candidate) => (candidate.url || candidate.label) === (source.url || source.label)) === index);
  return {
    scope: isDubaiOnly
      ? "Dubai residential market with project-level area pricing"
      : `${emirates.join(", ") || "UAE"} with selected-area pricing`,
    period: isDubaiOnly ? "Latest confirmed research through H1 2026" : benchmark?.period || "Current confirmed project index",
    headline: isDubaiOnly ? [
      { label: "H1 2026 residential sales", display: "79,281", note: "Dubai-wide completed and off-plan sales" },
      { label: "H1 2026 sales value", display: "AED 221.4bn", note: "Dubai-wide residential value" },
      { label: "Average gross rental yield", display: "6.58%", note: "Dubai residential market average" },
      { label: "Q1 2026 rental contracts", display: "AED 32.2bn", note: "Dubai-wide rental-contract value" },
    ] : [
      { label: "Selected projects", display: String(projects.length), note: `${emirates.length} emirate${emirates.length === 1 ? "" : "s"} represented` },
      { label: "Dated area benchmarks", display: `${benchmarkCount}/${projects.length}`, note: "Selected units with stored AED/sqft context" },
      { label: "Coordinate coverage", display: `${coordinateCount}/${projects.length}`, note: "Selected projects with proximity analysis" },
      { label: "Nearby indexed pipeline", display: String(localPipeline), note: "Distinct nearby or same-area project records reviewed" },
    ],
    charts,
    sources,
    researchCoverage: {
      selectedProjects: projects.length,
      emirates,
      areas: areas.size,
      benchmarks: benchmarkCount,
      coordinates: coordinateCount,
      rentalEvidence: rentalEvidenceCount,
      pipelineRecords: localPipeline,
    },
  };
}

export function buildCuratedBriefContent(args: {
  projects: CuratedProjectSnapshot[];
  brief: string;
  narrative: Partial<AiBriefNarrative>;
  advisor: AdvisorSnapshot;
  confirmedAt: string;
  marketObservations?: LatestMarketObservation[];
}) {
  const lead = args.projects[0];
  const companyProfile = buildCompanyReportProfile();
  const uaeContext = buildUaeReportContext();
  const emirateContexts = buildEmirateReportContexts(args.projects);
  const areaDemandResearch = buildAreaDemandResearch(args.projects);
  const fallbackSummary = `This curated brief reviews ${args.projects.length} selected ${args.projects.length === 1 ? "opportunity" : "opportunities"} against the client's stated objective. Saved pricing, area, payment, fee and completed-property rental inputs are planning scenarios that require named-advisor review before client issue; projected returns are not guarantees.`;
  const fallbackRecommendation = lead
    ? lead.incomeAnalysisEligible
      ? `${lead.name} should be evaluated against the client's holding period and cash-flow plan. The completed-property scenario models a gross yield of ${percent(lead.grossYield)}, an occupancy-adjusted net scenario of ${percent(lead.effectiveNetYield)} and a transparent investment-fit screen of ${lead.advisoryScreen.total}/100.`
      : `${lead.name} should be evaluated on the exact unit price, usable area, full acquisition cost, payment timing, developer documentation and handover evidence.`
    : "Proceed only after unit-level pricing, area, costs and availability have been reconfirmed.";
  const reportMarketContext = marketContext(args.projects, emirateContexts, uaeContext, companyProfile);
  reportMarketContext.sources = [
    ...reportMarketContext.sources,
    ...(areaDemandResearch?.sources || []).map((source) => ({
      label: `${source.publisher}: ${source.label} (${source.evidenceType}; checked ${source.checkedAt})`,
      url: source.url,
    })),
    ...(args.marketObservations || []).map((observation) => ({
      label: `${observation.source.publisher}: ${observation.source.label} (${observation.metricKey}, observed ${observation.observedAt})`,
      url: observation.provenance.evidenceUrl || observation.source.canonicalUrl,
    })),
  ].filter((source, index, sources) => sources.findIndex((candidate) => (candidate.url || candidate.label) === (source.url || source.label)) === index);
  return {
    executiveSummary: institutionalReportCopy(cleanText(args.narrative.executiveSummary, 5_000) || fallbackSummary),
    recommendation: institutionalReportCopy(cleanText(args.narrative.recommendation, 5_000) || fallbackRecommendation),
    marketPosition: institutionalReportCopy(cleanText(args.narrative.marketPosition, 4_000) || "The selected unit should be read against its area AED/sqft benchmark, current competing pipeline and the depth of the eventual rental and resale market."),
    locationStory: institutionalReportCopy(cleanText(args.narrative.locationStory, 4_000) || "Accessibility is presented as approximate distance from the published project coordinates. Driving time and route quality should be checked at the intended travel time."),
    riskNotes: Array.isArray(args.narrative.riskNotes)
      ? args.narrative.riskNotes.map((item) => institutionalReportCopy(cleanText(item, 500))).filter(Boolean).slice(0, 6)
      : [
          "Returns depend on achieved rent, occupancy, operating costs and the selected exit date.",
          "Future supply can affect leasing velocity and resale competition.",
          "Developer statements, unit availability and payment dates require final documentary verification.",
        ],
    advisoryScope: [
      "Confirm live inventory, exact unit price, net saleable area, layout and orientation.",
      "Review the dated payment schedule, registration charges, finance timing and full acquisition cost.",
      "Benchmark achieved rents, current Rental Index output, recent registered leasing evidence, comparable sales, service charges and directly competing handovers.",
      "Coordinate reservation, documentation, snagging, handover and leasing strategy.",
    ],
    nextSteps: [
      "Request the current unit statement, floor plan and payment schedule.",
      "Recheck comparable sales and rent evidence immediately before reservation.",
      "Review the SPA, escrow and project-registration position with the appropriate specialists.",
      "Confirm the ownership-cost and exit scenario against the client's full portfolio.",
    ],
    projects: args.projects,
    companyProfile,
    uaeContext,
    emirateContexts,
    liveMarketData: {
      capturedAt: args.confirmedAt,
      status: args.marketObservations?.length ? "stored-observations" : "reference-only",
      observations: args.marketObservations || [],
    },
    notes: cleanText(args.brief, 3_000),
    disclosure: PSR_REPORT_VARIABILITY_NOTICE,
    preparedAt: args.confirmedAt,
    advisor: {
      ...args.advisor,
      profileSummary: institutionalReportCopy(args.advisor.profileSummary || "Evidence-led private client property advisory across the UAE."),
    },
    confirmation: {
      confirmedAt: args.confirmedAt,
      confirmedBy: args.advisor.email,
      statement: `We confirm that the entered unit price, area, expected rent and sensitivity range, occupancy assumption, rental-evidence note, service-charge input, other annual costs and acquisition-cost estimate were reviewed before generation. ${PSR_REPORT_VARIABILITY_NOTICE}`,
    },
    marketContext: reportMarketContext,
    areaDemandResearch,
    residencyGuidance: {
      title: "UAE Golden Visa property pathway",
      threshold: "Published property-investment threshold: AED 2 million",
      status: args.projects.some((project) => project.unitPrice >= 2_000_000)
        ? "At least one selected unit price meets the published value threshold."
        : `The highest selected unit price is ${money(Math.max(0, ...args.projects.map((project) => project.unitPrice)))}; additional qualifying property value may be required.`,
      summary: "Official UAE guidance describes a five-year renewable Golden Visa route for qualifying real-estate investors at a minimum property investment of AED 2 million. Eligibility is not automatic: ownership, valuation, financing and documentary requirements must be checked with ICP or the relevant emirate authority before reservation.",
      sourceLabel: "The Official Platform of the UAE Government, updated 26 February 2026",
      sourceUrl: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa",
    },
  } satisfies CuratedBriefContent;
}

function ascii(value: string) {
  return String(value || "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of ascii(text).split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        let fragment = "";
        for (const character of word) {
          const candidate = `${fragment}${character}`;
          if (font.widthOfTextAtSize(candidate, size) <= width || !fragment) {
            fragment = candidate;
          } else {
            lines.push(fragment);
            fragment = character;
          }
        }
        line = fragment;
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (!words.length) lines.push("");
  }
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  width: number,
  color = rgb(0.18, 0.18, 0.16),
  lineHeight = size * 1.4,
  maxLines = 100,
) {
  const lines = wrapText(text, font, size, width).slice(0, maxLines);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function fitSingleLine(text: string, font: PDFFont, size: number, width: number) {
  const value = ascii(text).replace(/\s+/g, " ").trim();
  if (!value || font.widthOfTextAtSize(value, size) <= width) return value;
  const suffix = "...";
  const words = value.split(" ");
  while (words.length > 1 && font.widthOfTextAtSize(`${words.join(" ")}${suffix}`, size) > width) words.pop();
  let candidate = `${words.join(" ")}${suffix}`;
  if (font.widthOfTextAtSize(candidate, size) <= width) return candidate;
  let fragment = words[0] || value;
  while (fragment.length > 1 && font.widthOfTextAtSize(`${fragment}${suffix}`, size) > width) fragment = fragment.slice(0, -1);
  return `${fragment}${suffix}`;
}

async function readBounded(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes || !response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return bytes;
}

async function reportImageResponse(env: ReportEnv, sourceUrl: string) {
  if (!sourceUrl || !isReportImageSource(sourceUrl)) return null;
  let host = "local";
  try {
    if (sourceUrl.startsWith("/")) {
      if (!env.ASSETS) return null;
      return { source: await env.ASSETS.fetch(new Request(`https://psrhomes.ae${sourceUrl}`)), host };
    } else {
      const parsed = new URL(sourceUrl);
      host = parsed.hostname;
      return { source: await fetch(parsed.toString(), {
        headers: { accept: "image/avif,image/webp,image/jpeg,image/png" },
        redirect: "follow",
      }), host };
    }
  } catch {
    return null;
  }
}

async function transformReportImage(
  env: ReportEnv,
  source: Response,
  host: string,
  shape: "landscape" | "portrait" | "preserve" = "landscape",
) {
  if (!env.IMAGES) return null;
  try {
    if (!source.ok || !source.body) return null;
    const declared = Number(source.headers.get("content-length") || 0);
    if (declared > 20_000_000) return null;
    const input = env.IMAGES.input(source.body);
    const transformed = shape === "portrait"
      ? input.transform({ width: 720, height: 900, fit: "cover" })
      : shape === "preserve"
        ? input.transform({ width: 1400 })
        : input.transform({ width: 1400, height: 840, fit: "cover" });
    const result = await transformed
      .output({ format: "image/jpeg", quality: 82, anim: false });
    const response = result.response();
    if (!response.ok) return null;
    return await readBounded(response, MAX_IMAGE_BYTES);
  } catch (error) {
    console.error(JSON.stringify({
      event: "curated_brief_image_failed",
      host,
      message: error instanceof Error ? error.message.slice(0, 240) : "image transformation failed",
    }));
    return null;
  }
}

async function fetchProjectJpeg(env: ReportEnv, sourceUrl: string, preserveAspect = false) {
  const resolved = await reportImageResponse(env, sourceUrl);
  return resolved ? transformReportImage(env, resolved.source, resolved.host, preserveAspect ? "preserve" : "landscape") : null;
}

async function fetchAdvisorJpeg(env: ReportEnv, advisor: AdvisorSnapshot) {
  if (!env.IMAGES) return null;
  let source: Response | null = null;
  let host = "advisor-profile";
  if (env.DB && env.MEDIA && advisor.email) {
    try {
      const row = await env.DB.prepare(
        "SELECT avatar_r2_key FROM hg_agent_profiles WHERE lower(email) = lower(?) AND active = 1 LIMIT 1",
      ).bind(advisor.email).first<{ avatar_r2_key: string | null }>();
      if (row?.avatar_r2_key) {
        const object = await env.MEDIA.get(row.avatar_r2_key);
        if (object) source = new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "image/jpeg" } });
      }
    } catch {
      source = null;
    }
  }
  if (!source) {
    const dynamicSlug = advisor.avatarUrl?.match(/^\/api\/agent\/avatar\/([a-z0-9-]+)$/)?.[1];
    const member = cbaTeam.find((candidate) => candidate.email.toLowerCase() === advisor.email.toLowerCase())
      || cbaTeam.find((candidate) => candidate.slug === dynamicSlug);
    const fallbackUrl = advisor.avatarUrl && isReportImageSource(advisor.avatarUrl)
      ? advisor.avatarUrl
      : member?.fallbackImage || "";
    const resolved = await reportImageResponse(env, fallbackUrl);
    if (resolved) {
      source = resolved.source;
      host = resolved.host;
    }
  }
  return source ? transformReportImage(env, source, host, "portrait") : null;
}

function drawImageOrGraphic(
  page: PDFPage,
  image: PDFImage | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  ink: ReturnType<typeof rgb>,
  gold: ReturnType<typeof rgb>,
) {
  if (image) {
    page.drawImage(image, { x, y, width, height });
    return;
  }
  page.drawRectangle({ x, y, width, height, color: ink });
  page.drawCircle({ x: x + width * .79, y: y + height * .48, size: height * .31, borderColor: gold, borderWidth: .55, opacity: .8 });
  page.drawCircle({ x: x + width * .79, y: y + height * .48, size: height * .12, borderColor: gold, borderWidth: .35, opacity: .7 });
  for (let index = 0; index < 5; index += 1) {
    const lineX = x + width * .12 + index * width * .075;
    page.drawLine({ start: { x: lineX, y: y + height * .17 }, end: { x: lineX + width * .035, y: y + height * .76 }, thickness: .3, color: gold, opacity: .5 });
  }
}

function drawCoverImage(
  page: PDFPage,
  image: PDFImage | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  ink: ReturnType<typeof rgb>,
  gold: ReturnType<typeof rgb>,
) {
  if (!image) {
    drawImageOrGraphic(page, undefined, x, y, width, height, ink, gold);
    return;
  }
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  page.pushOperators(
    pushGraphicsState(),
    rectangle(x, y, width, height),
    clip(),
    endPath(),
  );
  page.drawImage(image, {
    x: x + (width - drawnWidth) / 2,
    y: y + (height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  });
  page.pushOperators(popGraphicsState());
}

function drawCircularImage(
  page: PDFPage,
  image: PDFImage,
  centerX: number,
  centerY: number,
  radius: number,
  borderColor: ReturnType<typeof rgb>,
) {
  const curve = radius * .5522847498;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(centerX + radius, centerY),
    appendBezierCurve(centerX + radius, centerY + curve, centerX + curve, centerY + radius, centerX, centerY + radius),
    appendBezierCurve(centerX - curve, centerY + radius, centerX - radius, centerY + curve, centerX - radius, centerY),
    appendBezierCurve(centerX - radius, centerY - curve, centerX - curve, centerY - radius, centerX, centerY - radius),
    appendBezierCurve(centerX + curve, centerY - radius, centerX + radius, centerY - curve, centerX + radius, centerY),
    closePath(),
    clip(),
    endPath(),
  );
  page.drawImage(image, {
    x: centerX - radius,
    y: centerY - radius,
    width: radius * 2,
    height: radius * 2,
  });
  page.pushOperators(popGraphicsState());
  page.drawCircle({ x: centerX, y: centerY, size: radius, borderColor, borderWidth: .65 });
}

function drawContainedImage(
  page: PDFPage,
  image: PDFImage | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  paper: ReturnType<typeof rgb>,
  ink: ReturnType<typeof rgb>,
  gold: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width, height, color: paper, borderColor: gold, borderWidth: .45 });
  if (!image) {
    drawImageOrGraphic(page, undefined, x + 8, y + 8, width - 16, height - 16, ink, gold);
    return;
  }
  const scale = Math.min((width - 16) / image.width, (height - 16) / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  page.drawImage(image, {
    x: x + (width - drawnWidth) / 2,
    y: y + (height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  });
}

function drawMetricCard(
  page: PDFPage,
  label: string,
  value: string,
  note: string,
  x: number,
  y: number,
  width: number,
  height: number,
  regular: PDFFont,
  bold: PDFFont,
  colors: { ink: ReturnType<typeof rgb>; gold: ReturnType<typeof rgb>; muted: ReturnType<typeof rgb>; shell: ReturnType<typeof rgb> },
) {
  page.drawRectangle({ x, y, width, height, color: colors.shell });
  page.drawLine({ start: { x, y: y + height }, end: { x: x + width, y: y + height }, thickness: .65, color: colors.gold });
  page.drawText(ascii(label).toUpperCase(), { x: x + 13, y: y + height - 19, size: 6.2, font: bold, color: colors.gold });
  const normalizedValue = ascii(value);
  const valueWidth = bold.widthOfTextAtSize(normalizedValue, 14);
  const valueSize = Math.max(8.5, Math.min(14, valueWidth > width - 26 ? (14 * (width - 26)) / valueWidth : 14));
  page.drawText(fitSingleLine(normalizedValue, bold, valueSize, width - 26), { x: x + 13, y: y + height - 42, size: valueSize, font: bold, color: colors.ink });
  drawWrapped(page, note, regular, 6.7, x + 13, y + 17, width - 26, colors.muted, 8.5, 2);
}

function drawChart(
  page: PDFPage,
  chart: ReportChart,
  x: number,
  y: number,
  width: number,
  height: number,
  regular: PDFFont,
  bold: PDFFont,
  colors: { ink: ReturnType<typeof rgb>; gold: ReturnType<typeof rgb>; muted: ReturnType<typeof rgb>; shell: ReturnType<typeof rgb> },
) {
  page.drawRectangle({ x, y, width, height, color: colors.shell });
  page.drawLine({ start: { x, y: y + height }, end: { x: x + width, y: y + height }, thickness: .65, color: colors.gold });
  page.drawText(ascii(chart.title).slice(0, 52), { x: x + 16, y: y + height - 25, size: 10, font: bold, color: colors.ink });
  page.drawText(ascii(chart.subtitle).slice(0, 70), { x: x + 16, y: y + height - 39, size: 6.5, font: regular, color: colors.muted });
  const chartX = x + 18;
  const chartY = y + 48;
  const chartWidth = width - 36;
  const chartHeight = height - 104;
  const max = Math.max(...chart.data.map((item) => Math.max(0, item.value)), 1);
  if (chart.kind === "columns") {
    const gap = 12;
    const barWidth = Math.min(58, (chartWidth - gap * (chart.data.length - 1)) / chart.data.length);
    const totalWidth = barWidth * chart.data.length + gap * (chart.data.length - 1);
    const startX = chartX + (chartWidth - totalWidth) / 2;
    chart.data.forEach((item, index) => {
      const barHeight = Math.max(3, Math.max(0, item.value) / max * chartHeight);
      const barX = startX + index * (barWidth + gap);
      page.drawRectangle({ x: barX, y: chartY, width: barWidth, height: barHeight, color: index === chart.data.length - 1 ? colors.gold : colors.ink });
      page.drawText(ascii(item.display), { x: barX, y: chartY + barHeight + 7, size: 7, font: bold, color: colors.ink });
      drawWrapped(page, item.label, regular, 5.8, barX, chartY - 12, barWidth + 5, colors.muted, 7, 2);
    });
  } else {
    const rowHeight = chartHeight / Math.max(1, chart.data.length);
    chart.data.forEach((item, index) => {
      const rowY = chartY + chartHeight - (index + 1) * rowHeight + 7;
      const labelWidth = 82;
      const barWidth = Math.max(3, Math.max(0, item.value) / max * (chartWidth - labelWidth - 10));
      drawWrapped(page, item.label, regular, 5.8, chartX, rowY + 4, labelWidth - 5, colors.muted, 7, 2);
      page.drawRectangle({ x: chartX + labelWidth, y: rowY, width: barWidth, height: 12, color: index === 0 ? colors.gold : colors.ink });
      page.drawText(ascii(item.display), { x: chartX + labelWidth + 5, y: rowY + 3, size: 5.8, font: bold, color: rgb(1, 1, 1) });
    });
  }
  page.drawText(ascii(chart.sourceLabel).slice(0, 90), { x: x + 16, y: y + 17, size: 5.7, font: regular, color: colors.muted });
}

export async function renderCuratedBriefPdf(document: CuratedBriefDocument, env: ReportEnv) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const display = regular;
  const displayBold = bold;
  const colors = {
    gold: rgb(0.55, 0.47, 0.35),
    ink: rgb(0.055, 0.058, 0.055),
    muted: rgb(0.34, 0.325, 0.3),
    paper: rgb(0.988, 0.982, 0.965),
    shell: rgb(0.955, 0.946, 0.925),
    white: rgb(1, 1, 1),
    green: rgb(0.25, 0.42, 0.29),
  };
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 46;
  const content = document.content;
  const portraitPlacement = content.advisor?.portraitPlacement || "all";
  const psrLogo = await embedPsrReportLogo(pdf, env);
  const projects = content.projects || [];
  const isIncomeAnalysisEligible = (project: CuratedProjectSnapshot) => project.incomeAnalysisEligible === true
    || (project.incomeAnalysisEligible !== false && /completed/i.test(project.handover || ""));
  const readyIncomeProjects = projects.filter(isIncomeAnalysisEligible);
  const storedContent = content as CuratedBriefContent & {
    companyProfile?: CompanyReportProfile;
    uaeContext?: UaeReportContext;
    emirateContexts?: EmirateReportContext[];
  };
  const companyProfile = storedContent.companyProfile || null;
  const uaeContext = storedContent.uaeContext || null;
  const liveMarketData = (content as unknown as { liveMarketData?: CuratedBriefContent["liveMarketData"] }).liveMarketData;
  const liveObservations = Array.isArray(liveMarketData?.observations) ? liveMarketData.observations : [];
  const storedEmirateContexts = storedContent.emirateContexts;
  // New reports snapshot Market Atlas evidence at generation time. Legacy saved
  // reports remain unchanged instead of silently inheriting later site edits.
  const emirateContexts = Array.isArray(storedEmirateContexts) ? storedEmirateContexts : [];
  const areaDemandResearch = storedContent.areaDemandResearch || null;
  const expandedHierarchy = Boolean(companyProfile && uaeContext);
  const includeTimelinePanels = storedContent.presentation?.includeTimelinePanels !== false;
  const compactProjectModules = storedContent.presentation?.compactProjectModules === true;
  const maxEnrichedImages = Math.max(24, Math.min(140, Math.round(storedContent.presentation?.maxEnrichedImages || MAX_ENRICHED_REPORT_IMAGES)));
  const communityContexts = expandedHierarchy
    ? emirateContexts.flatMap((context) => context.communities || [])
      .filter((community, index, communities) => communities.findIndex((candidate) => `${candidate.slug}|${candidate.name}` === `${community.slug}|${community.name}`) === index)
    : [];
  const images = new Map<string, PDFImage>();
  let advisorPortrait: PDFImage | undefined;
  // Project selection is unbounded; image enrichment is bounded so large reports
  // remain reliable inside the Worker subrequest and memory budgets.
  const projectMediaEntries = await Promise.all(projects.map(async (project) => [
    project.slug,
    await enrichedProjectReportMedia(project, env),
  ] as const));
  const projectMedia = new Map(projectMediaEntries);
  const projectMediaSources = [...projectMedia.values()].flatMap((sections) => [
    ...sections.exteriors,
    ...sections.interiors,
    ...sections.floorplans,
    ...sections.gallery,
  ]);
  const floorplanSources = new Set([...projectMedia.values()].flatMap((sections) => sections.floorplans));
  const mediaSources = uniqueMedia([
    storedContent.presentation?.coverImageUrl || "",
    uaeContext?.imageUrl || "",
    ...emirateContexts.map((context) => context.imageUrl),
    ...emirateContexts.flatMap((context) => (context.gallery || []).map((item) => item.src)),
    ...communityContexts.map((community) => community.imageUrl || ""),
    ...projects.map((project) => project.imageUrl || ""),
    ...projectMediaSources,
  ]).slice(0, maxEnrichedImages);
  const fetched = await Promise.all(mediaSources.map(async (source) => ({
    source,
    bytes: await fetchProjectJpeg(env, source, floorplanSources.has(source)),
  })));
  for (const item of fetched) {
    if (!item.bytes) continue;
    try {
      images.set(item.source, await pdf.embedJpg(item.bytes));
    } catch {
      // Keep the geometric fallback if an origin returned invalid image bytes.
    }
  }
  const advisorBytes = await fetchAdvisorJpeg(env, content.advisor);
  if (advisorBytes) {
    try {
      advisorPortrait = await pdf.embedJpg(advisorBytes);
    } catch {
      advisorPortrait = undefined;
    }
  }
  let advisorProfilePortrait = advisorPortrait;
  if (content.advisor.profileAvatarUrl) {
    const resolvedProfilePortrait = await reportImageResponse(env, content.advisor.profileAvatarUrl);
    if (resolvedProfilePortrait) {
      const profileBytes = await transformReportImage(env, resolvedProfilePortrait.source, resolvedProfilePortrait.host, "preserve");
      if (profileBytes) {
        try {
          advisorProfilePortrait = await pdf.embedJpg(profileBytes);
        } catch {
          advisorProfilePortrait = advisorPortrait;
        }
      }
    }
  }

  const contentsRowsPerPage = 13;
  const comparisonPageCount = projects.length > 1 ? Math.ceil(projects.length / 3) : 0;
  const hasRentalSensitivity = readyIncomeProjects.some((project) => project.annualRentHigh > project.annualRent && project.unitPrice > 0);
  const areaResearchPageCount = areaDemandResearch
    ? 2 + Number(Boolean(areaDemandResearch.priceBenchmarks?.length)) + Number(hasRentalSensitivity) + Number(Boolean(areaDemandResearch.investorDemographics?.length))
    : 0;
  const representedReportEmirates = [...new Set(projects.map((project) => project.emirate).filter(Boolean))];
  const comparisonContentsLabel = representedReportEmirates.length > 1
    ? "Cross-emirate project decision matrix"
    : `${representedReportEmirates[0] || "Project"} decision matrix`;
  const liveDataPageCount = Math.ceil(liveObservations.length / 11);
  // The evidence-depth page is a deliberate part of every newly generated
  // brief. It makes the report's project, place and investor coverage visible
  // before the reader reaches the detailed modules, rather than hiding that
  // depth inside the appendix.
  const fixedHierarchyItems = 5 + Number(Boolean(companyProfile)) + Number(Boolean(uaeContext)) + Number(Boolean(areaDemandResearch)) + Number(liveDataPageCount > 0);
  const contentsItemCount = projects.length + emirateContexts.length + communityContexts.length + fixedHierarchyItems + (comparisonPageCount ? 1 : 0);
  const contentsPageCount = Math.max(1, Math.ceil(contentsItemCount / contentsRowsPerPage));
  const companyPage = companyProfile ? 2 + contentsPageCount : 0;
  const uaePage = uaeContext ? 2 + contentsPageCount + Number(Boolean(companyProfile)) : 0;
  const overviewPage = 2 + contentsPageCount + Number(Boolean(companyProfile)) + Number(Boolean(uaeContext));
  const evidencePage = overviewPage + 1;
  const areaResearchStart = evidencePage + 1;
  const comparisonStart = areaResearchStart + areaResearchPageCount;
  const marketPage = comparisonStart + comparisonPageCount;
  const liveDataStart = marketPage + 1;
  const emirateStart = liveDataStart + liveDataPageCount;
  const emiratePageCount = expandedHierarchy ? (includeTimelinePanels ? 4 : 3) : 3;
  const emiratePageStart = (index: number) => emirateStart + index * emiratePageCount;
  const communityStart = emirateStart + emirateContexts.length * emiratePageCount;
  const projectStart = communityStart + communityContexts.length;
  const projectMediaPages = projects.map((project) => {
    const sections = projectMedia.get(project.slug) || { gallery: [], exteriors: [], interiors: [], floorplans: [] };
    if (compactProjectModules) {
      const visualSources = uniqueMedia([...sections.exteriors, ...sections.interiors, ...sections.gallery]).slice(0, 4);
      return [
        ...Array.from({ length: Math.ceil(visualSources.length / 4) }, (_, index) => ({
          label: "Architecture, interiors and amenities",
          sources: visualSources.slice(index * 4, (index + 1) * 4),
          contain: false,
          part: index + 1,
        })),
        ...Array.from({ length: Math.ceil(sections.floorplans.length / 2) }, (_, index) => ({
          label: "Floor plans and cost frame",
          sources: sections.floorplans.slice(index * 2, (index + 1) * 2),
          contain: true,
          part: index + 1,
        })),
      ];
    }
    return ([
      ["Exterior architecture", sections.exteriors, false],
      ["Interior design", sections.interiors, false],
      ["Floor plans", sections.floorplans, true],
      ["Additional gallery", sections.gallery, false],
    ] as Array<[string, string[], boolean]>).flatMap(([label, sources, contain]) =>
      Array.from({ length: Math.ceil(sources.length / 4) }, (_, index) => ({ label, sources: sources.slice(index * 4, (index + 1) * 4), contain, part: index + 1 })),
    );
  });
  const projectBasePageCount = compactProjectModules ? 1 : expandedHierarchy ? 4 : 3;
  const projectPageCounts = projectMediaPages.map((pages) => projectBasePageCount + pages.length);
  const projectPageStart = (index: number) => projectStart + projectPageCounts.slice(0, index).reduce((sum, count) => sum + count, 0);
  const recommendationPage = projectStart + projectPageCounts.reduce((sum, count) => sum + count, 0);
  const appendixPage = recommendationPage + 1;
  const sourceItems = content.marketContext?.sources || [];
  const appendixContinuationItems = Math.max(0, projects.length - 6) + Math.max(0, sourceItems.length - 6);
  const appendixContinuationCount = Math.ceil(appendixContinuationItems / 12);
  const totalPages = appendixPage + appendixContinuationCount;
  let pageNumber = 0;

  const addPage = (eyebrow: string, title: string) => {
    const page = pdf.addPage(pageSize);
    pageNumber += 1;
    page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.paper });
    page.drawRectangle({ x: margin, y: 777, width: 40, height: 40, color: colors.ink });
    if (psrLogo) page.drawImage(psrLogo, { x: margin + 2, y: 779, width: 36, height: 36 });
    else page.drawText("PSR", { x: margin + 8, y: 792, size: 11, font: bold, color: colors.white });
    page.drawText("CURATED CLIENT BRIEF", { x: pageSize[0] - margin - 112, y: 790, size: 6.2, font: bold, color: colors.muted });
    page.drawLine({ start: { x: margin, y: 766 }, end: { x: pageSize[0] - margin, y: 766 }, thickness: .8, color: colors.gold });
    page.drawText(ascii(eyebrow).toUpperCase(), { x: margin, y: 734, size: 6.7, font: bold, color: colors.gold });
    drawWrapped(page, title, display, 24, margin, 707, pageSize[0] - margin * 2, colors.ink, 28, 2);
    return page;
  };

  const addFooter = (page: PDFPage) => {
    page.drawLine({ start: { x: margin, y: 44 }, end: { x: pageSize[0] - margin, y: 44 }, thickness: .45, color: rgb(.75, .7, .6) });
    const advisorLine = `${content.advisor?.name || "PSR Advisor"} | ${content.advisor?.phone || content.advisor?.email || ""}`;
    page.drawText(ascii(advisorLine).slice(0, 82), { x: margin, y: 27, size: 6.2, font: regular, color: colors.muted });
    page.drawText(`${PSR_REPORT_COMPANY.website} | ORN ${PSR_REPORT_COMPANY.orn}`, { x: margin + 205, y: 27, size: 5.5, font: regular, color: colors.muted });
    page.drawText(`${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`, { x: pageSize[0] - margin - 34, y: 27, size: 6.2, font: bold, color: colors.gold });
  };

  // Cover
  let page = pdf.addPage(pageSize);
  pageNumber += 1;
  const comparisonCover = document.type === "comparison";
  const coverImage = storedContent.presentation?.coverImageUrl
    ? images.get(storedContent.presentation.coverImageUrl)
    : images.get(projects[0]?.imageUrl || "");
  page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.ink });
  drawCoverImage(page, comparisonCover ? undefined : coverImage, 0, 356, pageSize[0], 486, colors.ink, colors.gold);
  page.drawRectangle({ x: 0, y: 356, width: pageSize[0], height: 486, color: colors.ink, opacity: comparisonCover ? .08 : .26 });
  if (comparisonCover) {
    page.drawText(`${projects.length} PROJECT${projects.length === 1 ? "" : "S"} REVIEWED`, { x: margin, y: 703, size: 7, font: bold, color: colors.gold });
    projects.slice(0, 4).forEach((project, index) => {
      const projectY = 653 - index * 48;
      page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: projectY, size: 6.2, font: bold, color: colors.gold });
      page.drawText(ascii(project.name).slice(0, 54), { x: margin + 30, y: projectY, size: 12, font: display, color: colors.white });
      page.drawText(`${ascii(project.developer)} | ${ascii(project.location)}`.slice(0, 72), { x: margin + 30, y: projectY - 13, size: 5.8, font: regular, color: rgb(.68, .67, .63) });
    });
    if (projects.length > 4) page.drawText(`PLUS ${projects.length - 4} MORE IN THE FULL DECISION MATRIX`, { x: margin + 30, y: 445, size: 6, font: bold, color: colors.gold });
  }
  page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: 362, color: colors.ink });
  if (psrLogo) {
    page.drawImage(psrLogo, { x: margin, y: 763, width: 54, height: 54 });
    page.drawText(PSR_REPORT_COMPANY.legalName.toUpperCase(), { x: margin + 68, y: 793, size: 6.2, font: bold, color: colors.white });
    page.drawText(`${PSR_REPORT_COMPANY.website} | ORN ${PSR_REPORT_COMPANY.orn}`, { x: margin + 68, y: 781, size: 5.7, font: regular, color: colors.gold });
  } else {
    page.drawText("PSR HOMES", { x: margin, y: 790, size: 16, font: bold, color: colors.white });
    page.drawText("REAL ESTATE LLC", { x: margin, y: 776, size: 6.2, font: bold, color: colors.white });
    page.drawText(`${PSR_REPORT_COMPANY.website} | ORN ${PSR_REPORT_COMPANY.orn}`, { x: margin, y: 763, size: 5.7, font: regular, color: colors.gold });
  }
  page.drawLine({ start: { x: margin, y: 326 }, end: { x: margin + 58, y: 326 }, thickness: 1.2, color: colors.gold });
  page.drawText(comparisonCover ? "CURATED PROJECT COMPARISON" : "CURATED CLIENT BRIEF", { x: margin, y: 306, size: 7.2, font: bold, color: colors.gold });
  const coverBottom = drawWrapped(page, document.title, displayBold, 32, margin, 272, pageSize[0] - margin * 2, colors.white, 35, 3);
  page.drawText(`Prepared for ${ascii(document.client_name)}`, { x: margin, y: coverBottom - 8, size: 11, font: regular, color: rgb(.84, .82, .77) });
  page.drawText(`Prepared by ${ascii(content.advisor?.name || "PSR Advisor")}`, { x: margin, y: 94, size: 8, font: bold, color: colors.white });
  page.drawText(ascii(content.advisor?.title || "Property Advisor"), { x: margin, y: 79, size: 7, font: regular, color: colors.gold });
  page.drawText(ascii(content.advisor?.phone || ""), { x: margin, y: 64, size: 7, font: regular, color: rgb(.82, .8, .75) });
  page.drawText(ascii(content.advisor?.email || ""), { x: margin, y: 51, size: 7, font: regular, color: rgb(.82, .8, .75) });
  if (advisorPortrait && (portraitPlacement === "all" || portraitPlacement === "cover-only" || portraitPlacement === "cover-and-profile" || portraitPlacement === "cover-profile-and-closing")) {
    page.drawRectangle({ x: pageSize[0] - margin - 82, y: 72, width: 82, height: 103, color: colors.shell, borderColor: colors.gold, borderWidth: .7 });
    page.drawImage(advisorPortrait, { x: pageSize[0] - margin - 78, y: 76, width: 74, height: 95 });
  } else {
    const initials = (content.advisor?.name || "PSR Advisor").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    page.drawCircle({ x: pageSize[0] - margin - 41, y: 123, size: 38, color: colors.shell, borderColor: colors.gold, borderWidth: .7 });
    page.drawText(initials, { x: pageSize[0] - margin - 53, y: 115, size: 18, font: displayBold, color: colors.ink });
  }
  page.drawText(new Date(content.preparedAt || document.created_at).toLocaleDateString("en-AE", { day: "2-digit", month: "long", year: "numeric" }), { x: pageSize[0] - margin - 117, y: 51, size: 7, font: regular, color: colors.gold });

  // Contents paginate so large shortlists remain readable without limiting selection.
  const contents = [
    ...(companyProfile ? [["PSR Homes and your advisor", companyPage] as [string, string | number]] : []),
    ...(uaeContext ? [[includeTimelinePanels ? "United Arab Emirates - past, present and future" : "United Arab Emirates - investment platform", uaePage] as [string, string | number]] : []),
    ["Investment overview", overviewPage],
    ...(areaDemandResearch ? [[
      `${areaDemandResearch.area} demand, ${readyIncomeProjects.length ? "ready-property ROI, " : ""}AED/sqft and participation context`,
      `${String(areaResearchStart).padStart(2, "0")}-${String(areaResearchStart + areaResearchPageCount - 1).padStart(2, "0")}`,
    ] as [string, string | number]] : []),
    ["Evidence depth: projects, place and investor case", evidencePage],
    ...(comparisonPageCount ? [[
      comparisonContentsLabel,
      comparisonPageCount === 1
        ? comparisonStart
        : `${String(comparisonStart).padStart(2, "0")}-${String(comparisonStart + comparisonPageCount - 1).padStart(2, "0")}`,
    ] as [string, string | number]] : []),
    ["Market transaction and research context", marketPage],
    ...(liveDataPageCount ? [[
      "Latest stored market observations and freshness",
      liveDataPageCount === 1
        ? liveDataStart
        : `${String(liveDataStart).padStart(2, "0")}-${String(liveDataStart + liveDataPageCount - 1).padStart(2, "0")}`,
    ] as [string, string | number]] : []),
    ...emirateContexts.map((context, index) => {
      const start = emiratePageStart(index);
      return [
        `${context.name} - investment case, catalysts and living infrastructure`,
        `${String(start).padStart(2, "0")}-${String(start + emiratePageCount - 1).padStart(2, "0")}`,
      ];
    }),
    ...communityContexts.map((community, index) => [
      `${community.name} - daily life, investment relevance and pipeline`,
      communityStart + index,
    ] as [string, string | number]),
    ...projects.map((project, index) => {
      const start = projectPageStart(index);
      const end = start + projectPageCounts[index] - 1;
      return [
        `${project.name} - proposition, unit economics, evidence and typed gallery`,
        `${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}`,
      ];
    }),
    ["Recommendations", recommendationPage],
    [
      `${content.confirmation?.title || "Confirmation record"}, methodology and sources`,
      appendixContinuationCount
        ? `${String(appendixPage).padStart(2, "0")}-${String(totalPages).padStart(2, "0")}`
        : appendixPage,
    ],
  ] as Array<[string, string | number]>;
  for (let contentsPageIndex = 0; contentsPageIndex < contentsPageCount; contentsPageIndex += 1) {
    page = addPage("Document map", contentsPageIndex ? `Contents ${contentsPageIndex + 1}` : "Contents");
    let contentsY = 650;
    contents
      .slice(contentsPageIndex * contentsRowsPerPage, (contentsPageIndex + 1) * contentsRowsPerPage)
      .forEach(([label, numberLabel], rowIndex) => {
        const absoluteIndex = contentsPageIndex * contentsRowsPerPage + rowIndex;
        page.drawText(String(absoluteIndex + 1).padStart(2, "0"), { x: margin, y: contentsY, size: 7, font: bold, color: colors.gold });
        page.drawText(fitSingleLine(label, regular, 8.7, pageSize[0] - margin * 2 - 82), { x: margin + 34, y: contentsY, size: 8.7, font: regular, color: colors.ink });
        page.drawLine({ start: { x: margin + 34, y: contentsY - 8 }, end: { x: pageSize[0] - margin - 30, y: contentsY - 8 }, thickness: .3, color: rgb(.78, .74, .66) });
        page.drawText(typeof numberLabel === "number" ? String(numberLabel).padStart(2, "0") : numberLabel, { x: pageSize[0] - margin - 28, y: contentsY, size: 7, font: bold, color: colors.gold });
        contentsY -= 37;
      });
    if (contentsPageIndex === contentsPageCount - 1) {
      page.drawRectangle({ x: margin, y: 92, width: pageSize[0] - margin * 2, height: 86, color: colors.ink });
      page.drawText(fitSingleLine((content.confirmation?.statusLabel || "CONFIRMED BEFORE GENERATION").toUpperCase(), bold, 6.5, pageSize[0] - margin * 2 - 36), { x: margin + 18, y: 151, size: 6.5, font: bold, color: colors.gold });
      drawWrapped(page, content.confirmation?.statement || "Unit inputs were confirmed by the advisor before generation.", regular, 8, margin + 18, 131, pageSize[0] - margin * 2 - 36, colors.white, 11, 4);
    }
    addFooter(page);
  }

  if (companyProfile) {
    page = addPage("PSR company and advisor", "The people and platform behind this brief");
    page.drawRectangle({ x: margin, y: 455, width: pageSize[0] - margin * 2, height: 205, color: colors.ink });
    if (advisorProfilePortrait && (portraitPlacement === "all" || portraitPlacement === "profile-only" || portraitPlacement === "cover-and-profile" || portraitPlacement === "cover-profile-and-closing")) {
      page.drawRectangle({ x: margin + 16, y: 492, width: 132, height: 132, color: colors.shell, borderColor: colors.gold, borderWidth: .7 });
      page.drawImage(advisorProfilePortrait, { x: margin + 20, y: 496, width: 124, height: 124 });
    } else {
      const initials = (content.advisor?.name || "PSR Advisor").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      page.drawCircle({ x: margin + 82, y: 558, size: 54, color: colors.shell, borderColor: colors.gold, borderWidth: .7 });
      page.drawText(initials, { x: margin + 61, y: 546, size: 26, font: displayBold, color: colors.ink });
    }
    const advisorX = margin + 170;
    page.drawText(companyProfile.displayName.toUpperCase(), { x: advisorX, y: 631, size: 6.2, font: bold, color: colors.gold });
    page.drawText(ascii(content.advisor?.name || "PSR Advisor"), { x: advisorX, y: 604, size: 18, font: displayBold, color: colors.white });
    page.drawText(ascii(content.advisor?.title || "Property Advisor"), { x: advisorX, y: 587, size: 7.2, font: bold, color: colors.gold });
    let advisorCopyY = drawWrapped(page, content.advisor?.profileSummary || "Evidence-led private client property advisory across the UAE.", regular, 7.3, advisorX, 566, pageSize[0] - margin - advisorX - 16, rgb(.82, .81, .76), 10, 6);
    advisorCopyY -= 8;
    const advisorDetails = [
      content.advisor?.languages?.length ? `Languages: ${content.advisor.languages.join(", ")}` : "",
      content.advisor?.specialties?.length ? `Focus: ${content.advisor.specialties.slice(0, 4).join(" | ")}` : "",
    ].filter(Boolean);
    advisorDetails.forEach((detail) => {
      advisorCopyY = drawWrapped(page, detail, regular, 5.8, advisorX, advisorCopyY, pageSize[0] - margin - advisorX - 16, rgb(.7, .69, .65), 7, 2) - 4;
    });

    page.drawRectangle({ x: margin, y: 390, width: pageSize[0] - margin * 2, height: 48, color: colors.shell });
    page.drawText(`ORN ${ascii(companyProfile.orn)}`, { x: margin + 14, y: 416, size: 6.3, font: bold, color: colors.gold });
    page.drawText(ascii(companyProfile.phone), { x: margin + 101, y: 416, size: 6.3, font: bold, color: colors.ink });
    page.drawText(ascii(companyProfile.email), { x: margin + 221, y: 416, size: 6.3, font: bold, color: colors.ink });
    page.drawText(ascii(companyProfile.address).slice(0, 110), { x: margin + 14, y: 400, size: 5.7, font: regular, color: colors.muted });

    page.drawText(ascii(companyProfile.tagline).toUpperCase().slice(0, 100), { x: margin, y: 363, size: 6.4, font: bold, color: colors.gold });
    drawWrapped(page, companyProfile.summary, regular, 7, margin, 345, pageSize[0] - margin * 2, colors.ink, 9.2, 3);
    page.drawText("ADVISORY CAPABILITIES", { x: margin, y: 305, size: 6.4, font: bold, color: colors.gold });
    companyProfile.services.slice(0, 6).forEach((service, index) => {
      const cardWidth = 239;
      const cardHeight = 63;
      const x = margin + (index % 2) * 251;
      const cardY = 227 - Math.floor(index / 2) * 73;
      page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 4 < 2 ? colors.paper : colors.shell });
      page.drawLine({ start: { x, y: cardY + cardHeight }, end: { x: x + cardWidth, y: cardY + cardHeight }, thickness: .55, color: colors.gold });
      page.drawText(ascii(service.title).slice(0, 46), { x: x + 12, y: cardY + 43, size: 7.3, font: bold, color: colors.ink });
      drawWrapped(page, service.copy, regular, 5.6, x + 12, cardY + 27, cardWidth - 24, colors.muted, 6.8, 3);
    });
    addFooter(page);
  }

  if (uaeContext) {
    page = addPage("National investment platform", includeTimelinePanels ? "United Arab Emirates: past, present and future" : "United Arab Emirates: investment platform");
    drawImageOrGraphic(page, images.get(uaeContext.imageUrl), margin, 480, pageSize[0] - margin * 2, 180, colors.ink, colors.gold);
    page.drawRectangle({ x: margin, y: 480, width: pageSize[0] - margin * 2, height: 68, color: colors.ink, opacity: .88 });
    page.drawText(ascii(uaeContext.headline).toUpperCase().slice(0, 100), { x: margin + 14, y: 527, size: 6.3, font: bold, color: colors.gold });
    drawWrapped(page, uaeContext.summary, regular, 6.8, margin + 14, 509, pageSize[0] - margin * 2 - 28, colors.white, 8.3, 3);
    page.drawText(ascii(uaeContext.imageCredit).slice(0, 120), { x: margin + 14, y: 487, size: 4.6, font: regular, color: rgb(.78, .77, .73) });

    const nationalItems = [
      ...uaeContext.forces.slice(0, 3).map((item) => ({ title: item.title, detail: item.detail, tag: "ESTABLISHED FORCE" })),
      ...uaeContext.initiatives.slice(0, 3).map((item) => ({ title: item.name, detail: item.marketImpact, tag: `${item.status} | ${item.timing}` })),
    ];
    if (includeTimelinePanels) {
      page.drawText("INVESTMENT PLATFORM TIMELINE", { x: margin, y: 452, size: 6.4, font: bold, color: colors.gold });
      (["past", "present", "future"] as const).forEach((period, index) => {
        const gap = 11;
        const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
        const x = margin + index * (cardWidth + gap);
        page.drawRectangle({ x, y: 305, width: cardWidth, height: 127, color: index === 1 ? colors.ink : colors.shell });
        page.drawText(period.toUpperCase(), { x: x + 12, y: 408, size: 6.2, font: bold, color: colors.gold });
        drawWrapped(page, uaeContext.timeline[period], regular, 5.8, x + 12, 389, cardWidth - 24, index === 1 ? colors.white : colors.ink, 7.1, 12);
      });
      page.drawText("NATIONAL FORCES AND TRACKED INITIATIVES", { x: margin, y: 278, size: 6.4, font: bold, color: colors.gold });
      nationalItems.forEach((item, index) => {
        const cardWidth = 239;
        const cardHeight = 55;
        const x = margin + (index % 2) * 251;
        const cardY = 207 - Math.floor(index / 2) * 64;
        page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 4 < 2 ? colors.paper : colors.shell });
        page.drawText(fitSingleLine(item.title, bold, 7, cardWidth - 22), { x: x + 11, y: cardY + 37, size: 7, font: bold, color: colors.ink });
        page.drawText(fitSingleLine(item.tag.toUpperCase(), bold, 4.8, cardWidth - 22), { x: x + 11, y: cardY + 25, size: 4.8, font: bold, color: colors.gold });
        drawWrapped(page, item.detail, regular, 5.1, x + 11, cardY + 13, cardWidth - 22, colors.muted, 6, 2);
      });
    } else {
      page.drawText("INVESTMENT FOUNDATIONS AND DATED INITIATIVES", { x: margin, y: 452, size: 6.4, font: bold, color: colors.gold });
      nationalItems.forEach((item, index) => {
        const cardWidth = 239;
        const cardHeight = 102;
        const x = margin + (index % 2) * 251;
        const cardY = 324 - Math.floor(index / 2) * 115;
        page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 4 < 2 ? colors.paper : colors.shell });
        page.drawLine({ start: { x, y: cardY + cardHeight }, end: { x: x + cardWidth, y: cardY + cardHeight }, thickness: .6, color: colors.gold });
        page.drawText(fitSingleLine(item.title, bold, 8, cardWidth - 24), { x: x + 12, y: cardY + 76, size: 8, font: bold, color: colors.ink });
        page.drawText(fitSingleLine(item.tag.toUpperCase(), bold, 5, cardWidth - 24), { x: x + 12, y: cardY + 61, size: 5, font: bold, color: colors.gold });
        drawWrapped(page, item.detail, regular, 6.1, x + 12, cardY + 43, cardWidth - 24, colors.muted, 7.6, 5);
      });
    }
    addFooter(page);
  }

  // Executive overview
  page = addPage("Client decision frame", "Investment overview");
  let y = drawWrapped(page, content.executiveSummary, regular, 10.2, margin, 655, pageSize[0] - margin * 2, colors.ink, 15, 9);
  y -= 22;
  const lead = projects[0];
  const overviewMetrics = lead ? [
    ["Planning unit price", money(lead.unitPrice), lead.unitReference],
    ["Unit AED per sqft", `AED ${Math.round(lead.unitPricePerSqft).toLocaleString("en-AE")}`, `${Math.round(lead.unitAreaSqft).toLocaleString("en-AE")} sqft`],
    ...(isIncomeAnalysisEligible(lead) ? [
      ["Gross yield scenario", percent(lead.grossYield), `${money(lead.annualRent)} expected annual rent`],
      ["Occupancy-adjusted net ROI", percent(lead.effectiveNetYield), "Completed-property scenario after occupancy, recurring and acquisition-cost assumptions"],
    ] : [
      ["All-in acquisition basis", money(lead.allInCost), `${money(lead.acquisitionCosts)} modelled acquisition allowance`],
      ["Handover reference", lead.handover, lead.paymentPlan],
    ]),
  ] : [];
  overviewMetrics.forEach(([label, value, note], index) => {
    const cardWidth = 239;
    const x = margin + (index % 2) * 251;
    const cardY = y - Math.floor(index / 2) * 102 - 84;
    drawMetricCard(page, label, value, note, x, cardY, cardWidth, 84, regular, bold, colors);
  });
  y -= 220;
  const coverage = content.marketContext?.researchCoverage;
  if (coverage) {
    page.drawText("RESEARCH COVERAGE", { x: margin, y, size: 6.3, font: bold, color: colors.gold });
    y = drawWrapped(
      page,
      `${coverage.selectedProjects} selected project${coverage.selectedProjects === 1 ? "" : "s"} across ${coverage.areas} location label${coverage.areas === 1 ? "" : "s"}; ${coverage.benchmarks} sufficiently specific AED/sqft benchmark${coverage.benchmarks === 1 ? "" : "s"}, ${coverage.coordinates} coordinate-based access screen${coverage.coordinates === 1 ? "" : "s"}, ${readyIncomeProjects.length} completed-property rental analysis record${readyIncomeProjects.length === 1 ? "" : "s"} and ${coverage.pipelineRecords} distinct nearby pipeline record${coverage.pipelineRecords === 1 ? "" : "s"}.`,
      regular,
      7.4,
      margin,
      y - 17,
      pageSize[0] - margin * 2,
      colors.muted,
      10,
      3,
    ) - 15;
  }
  page.drawText("SHORTLIST AT A GLANCE", { x: margin, y, size: 6.5, font: bold, color: colors.gold });
  y -= 22;
  const shortlistRows = projects.slice(0, 5);
  shortlistRows.forEach((project, index) => {
    const rowHeight = 42;
    page.drawRectangle({ x: margin, y: y - rowHeight + 7, width: pageSize[0] - margin * 2, height: rowHeight, color: index % 2 ? colors.paper : colors.shell });
    page.drawText(String(index + 1).padStart(2, "0"), { x: margin + 10, y: y - 12, size: 7, font: bold, color: colors.gold });
    page.drawText(ascii(project.name).slice(0, 42), { x: margin + 38, y: y - 9, size: 9, font: bold, color: colors.ink });
    page.drawText(`${ascii(project.location)} | ${ascii(project.handover)}`.slice(0, 62), { x: margin + 38, y: y - 23, size: 6.3, font: regular, color: colors.muted });
    const incomeEligible = isIncomeAnalysisEligible(project);
    page.drawText(incomeEligible ? percent(project.effectiveNetYield) : `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}`, { x: pageSize[0] - margin - 105, y: y - 11, size: incomeEligible ? 8.5 : 7, font: bold, color: incomeEligible ? colors.green : colors.ink });
    page.drawText(compactProjectModules ? money(project.allInCost) : `${project.advisoryScreen.total}/100`, { x: pageSize[0] - margin - (compactProjectModules ? 61 : 45), y: y - 11, size: compactProjectModules ? 7.2 : 8.5, font: bold, color: colors.gold });
    page.drawText(`${incomeEligible ? "READY NET ROI" : "AED / SQFT"} / ${compactProjectModules ? "ALL-IN" : "SCREEN"}`, { x: pageSize[0] - margin - 105, y: y - 24, size: 5.2, font: bold, color: colors.muted });
    y -= rowHeight;
  });
  if (projects.length > shortlistRows.length) page.drawText(`${projects.length - shortlistRows.length} additional project${projects.length - shortlistRows.length === 1 ? "" : "s"} continue in the full decision matrix.`, { x: margin, y: y - 4, size: 6.5, font: regular, color: colors.gold });
  addFooter(page);

  // Give every newly generated report a visible evidence-depth dashboard. This
  // is intentionally data-derived: it tells the reader how much project,
  // place and investor evidence is actually present before the detailed pages.
  page = addPage("Evidence depth", "Project, place and investor coverage");
  drawWrapped(
    page,
    "This report is built from three connected evidence layers. Project records explain the selected units and their documents; place records explain the surrounding community, access and establishments; investor records explain pricing, income eligibility, market context and the limits of the available data.",
    regular,
    8.2,
    margin,
    664,
    pageSize[0] - margin * 2,
    colors.muted,
    11,
    5,
  );
  const totalMedia = [...projectMedia.values()].reduce((sum, sections) => sum + sections.exteriors.length + sections.interiors.length + sections.floorplans.length + sections.gallery.length, 0);
  const mappedEstablishments = emirateContexts.reduce((sum, context) => sum + context.establishments.length, 0);
  const trackedCatalysts = emirateContexts.reduce((sum, context) => sum + context.catalysts.length, 0);
  const evidenceCards = [
    {
      eyebrow: "PROJECT DETAIL",
      title: `${projects.length} selected project${projects.length === 1 ? "" : "s"}`,
      body: `${projects.filter((project) => project.paymentSchedule.length).length} payment schedule${projects.filter((project) => project.paymentSchedule.length) .length === 1 ? "" : "s"}, ${floorplanSources.size} floorplan asset${floorplanSources.size === 1 ? "" : "s"}, ${totalMedia} project image${totalMedia === 1 ? "" : "s"} and ${projects.filter((project) => project.projectKnowledge).length} expanded knowledge record${projects.filter((project) => project.projectKnowledge).length === 1 ? "" : "s"}.`,
    },
    {
      eyebrow: "COMMUNITY AND PLACE",
      title: `${communityContexts.length} mapped communit${communityContexts.length === 1 ? "y" : "ies"}`,
      body: `${representedReportEmirates.length} emirate${representedReportEmirates.length === 1 ? "" : "s"}, ${mappedEstablishments} indexed establishment${mappedEstablishments === 1 ? "" : "s"}, ${trackedCatalysts} tracked catalyst${trackedCatalysts === 1 ? "" : "s"} and coordinate-based access where stored.`,
    },
    {
      eyebrow: "INVESTOR ANALYSIS",
      title: `${content.marketContext?.researchCoverage?.benchmarks || 0} AED/sqft benchmark${(content.marketContext?.researchCoverage?.benchmarks || 0) === 1 ? "" : "s"}`,
      body: `${readyIncomeProjects.length} ready-property rental case${readyIncomeProjects.length === 1 ? "" : "s"}, ${liveObservations.length} stored market observation${liveObservations.length === 1 ? "" : "s"} and ${content.marketContext?.researchCoverage?.pipelineRecords || 0} nearby pipeline record${(content.marketContext?.researchCoverage?.pipelineRecords || 0) === 1 ? "" : "s"}. Off-plan reports do not present ROI or rent projections.`,
    },
  ];
  evidenceCards.forEach((card, index) => {
    const gap = 11;
    const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
    const x = margin + index * (cardWidth + gap);
    page.drawRectangle({ x, y: 408, width: cardWidth, height: 170, color: index === 1 ? colors.ink : colors.shell });
    page.drawText(card.eyebrow, { x: x + 14, y: 550, size: 5.8, font: bold, color: colors.gold });
    drawWrapped(page, card.title, bold, 12, x + 14, 523, cardWidth - 28, index === 1 ? colors.white : colors.ink, 14, 3);
    drawWrapped(page, card.body, regular, 6.5, x + 14, 475, cardWidth - 28, index === 1 ? rgb(.84, .83, .78) : colors.muted, 8.2, 8);
  });
  page.drawText("HOW TO READ THE DETAIL", { x: margin, y: 365, size: 6.4, font: bold, color: colors.gold });
  const evidenceRules = [
    "Unit-level facts, availability, payment ledgers and final charges remain subject to current written confirmation.",
    "Project and community imagery is evidence-led visual context; it does not replace the latest developer-stamped documents.",
    "Rental ROI appears only where the selected property is treated as ready/completed and configuration-matched rental evidence is stored.",
    "Missing demographic or amenity data is shown as a boundary rather than inferred from broad market assumptions.",
  ];
  evidenceRules.forEach((rule, index) => {
    const rowY = 334 - index * 38;
    page.drawCircle({ x: margin + 3, y: rowY + 3, size: 1.8, color: colors.gold });
    drawWrapped(page, rule, regular, 7.2, margin + 14, rowY + 6, pageSize[0] - margin * 2 - 22, colors.ink, 9, 3);
  });
  page.drawRectangle({ x: margin, y: 86, width: pageSize[0] - margin * 2, height: 76, color: colors.ink });
  page.drawText("EVIDENCE SNAPSHOT", { x: margin + 16, y: 139, size: 6, font: bold, color: colors.gold });
  drawWrapped(page, `Prepared ${content.preparedAt || document.created_at}. ${content.disclosure || PSR_REPORT_VARIABILITY_NOTICE}`, regular, 6.6, margin + 16, 121, pageSize[0] - margin * 2 - 32, colors.white, 8.4, 4);
  addFooter(page);

  if (areaDemandResearch) {
    page = addPage("Area demand intelligence", `${areaDemandResearch.area}: who may rent and why`);
    drawWrapped(
      page,
      `${areaDemandResearch.evidenceScope} Tenant groups below are evidence-based demand hypotheses, not measured demographic shares. Official operating facts and announced programmes are separated from listing-portal signals.`,
      regular,
      7.2,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      9.2,
      4,
    );
    page.drawText("OPERATING BASE AND DATED CATALYSTS", { x: margin, y: 615, size: 6.4, font: bold, color: colors.gold });
    areaDemandResearch.demandDrivers.slice(0, 4).forEach((driver, index) => {
      const cardWidth = 239;
      const cardHeight = 82;
      const x = margin + (index % 2) * 251;
      const cardY = 511 - Math.floor(index / 2) * 93;
      page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 3 === 0 ? colors.ink : colors.shell });
      page.drawText(`0${index + 1}`, { x: x + 12, y: cardY + 58, size: 6.2, font: bold, color: colors.gold });
      drawWrapped(page, driver, regular, 5.8, x + 35, cardY + 61, cardWidth - 47, index % 3 === 0 ? colors.white : colors.ink, 7.2, 7);
    });
    page.drawText("LIKELY TENANT SEGMENTS AND UNIT FIT", { x: margin, y: 391, size: 6.4, font: bold, color: colors.gold });
    areaDemandResearch.tenantSegments.slice(0, 6).forEach((segment, index) => {
      const rowY = 353 - index * 47;
      page.drawRectangle({ x: margin, y: rowY - 28, width: pageSize[0] - margin * 2, height: 40, color: index % 2 ? colors.paper : colors.shell });
      page.drawText(fitSingleLine(segment.label, bold, 7.1, 218), { x: margin + 11, y: rowY, size: 7.1, font: bold, color: colors.ink });
      page.drawText(`${segment.confidence.toUpperCase()} CONFIDENCE`, { x: margin + 11, y: rowY - 13, size: 4.9, font: bold, color: colors.gold });
      drawWrapped(page, segment.likelyUnitFit, regular, 5.6, margin + 238, rowY + 1, pageSize[0] - margin * 2 - 249, colors.muted, 6.8, 3);
    });
    page.drawText(`Evidence checked ${ascii(areaDemandResearch.evidenceDate)}. Segment confidence describes the evidence for a demand channel, not the probability of leasing a particular unit.`, { x: margin, y: 61, size: 5.5, font: regular, color: colors.muted });
    addFooter(page);

    page = addPage("Rental and map evidence", `${areaDemandResearch.area}: live signals and selected-project proximity`);
    page.drawRectangle({ x: margin, y: 624, width: pageSize[0] - margin * 2, height: 47, color: colors.ink });
    page.drawText("EVIDENCE HIERARCHY", { x: margin + 14, y: 651, size: 5.8, font: bold, color: colors.gold });
    drawWrapped(page, "Official sources establish operating context and programmes. DLD or executed leases establish achieved rent. Property Finder, Dubizzle and Bayut show volatile asking-market signals. PSR map distances are straight-line only.", regular, 6.2, margin + 124, 654, pageSize[0] - margin * 2 - 138, colors.white, 7.5, 3);
    page.drawText("CURRENT LISTING-PORTAL SNAPSHOT", { x: margin, y: 596, size: 6.4, font: bold, color: colors.gold });
    areaDemandResearch.listingSignals.slice(0, 4).forEach((signal, index) => {
      const cardWidth = 239;
      const cardHeight = 86;
      const x = margin + (index % 2) * 251;
      const cardY = 491 - Math.floor(index / 2) * 98;
      page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 2 ? colors.paper : colors.shell });
      page.drawText(fitSingleLine(signal.market, bold, 7.5, cardWidth - 24), { x: x + 12, y: cardY + 64, size: 7.5, font: bold, color: colors.ink });
      drawWrapped(page, signal.observed, regular, 5.7, x + 12, cardY + 48, cardWidth - 24, colors.muted, 6.8, 5);
      page.drawText("LISTING EVIDENCE", { x: x + 12, y: cardY + 9, size: 4.7, font: bold, color: colors.gold });
    });

    page.drawText("NEAREST SELECTED PROJECT FOR EACH OPTION", { x: margin, y: 369, size: 6.4, font: bold, color: colors.gold });
    const nearestRows = projects.flatMap((project) => {
      const nearest = areaDemandResearch.projectDistances
        .filter((distance) => distance.fromSlug === project.slug || distance.toSlug === project.slug)
        .sort((left, right) => left.distanceKm - right.distanceKm)[0];
      if (!nearest) return [];
      const peerName = nearest.fromSlug === project.slug ? nearest.toName : nearest.fromName;
      return [{ projectName: project.name, peerName, distanceKm: nearest.distanceKm }];
    });
    nearestRows.slice(0, 16).forEach((row, index) => {
      const column = index < 8 ? 0 : 1;
      const rowIndex = index % 8;
      const x = margin + column * 251;
      const rowY = 341 - rowIndex * 31;
      page.drawLine({ start: { x, y: rowY - 12 }, end: { x: x + 239, y: rowY - 12 }, thickness: .3, color: rgb(.78, .74, .66) });
      page.drawText(fitSingleLine(row.projectName, bold, 6.3, 101), { x, y: rowY, size: 6.3, font: bold, color: colors.ink });
      page.drawText(fitSingleLine(row.peerName, regular, 5.5, 94), { x: x + 108, y: rowY, size: 5.5, font: regular, color: colors.muted });
      page.drawText(`${row.distanceKm.toFixed(1)} KM`, { x: x + 203, y: rowY, size: 5.6, font: bold, color: colors.gold });
    });
    const distanceCount = areaDemandResearch.projectDistances.length;
    drawWrapped(page, `${distanceCount} pairwise project distances are stored in the report record. Values above show each project's nearest selected peer. They are approximate straight-line measurements from PSR coordinates, not road distance or travel time; pins below project-site precision must be corrected before client routing decisions.`, regular, 5.7, margin, 82, pageSize[0] - margin * 2, colors.muted, 7.2, 4);
    addFooter(page);

    if (areaDemandResearch.priceBenchmarks?.length) {
    page = addPage("Cost and price evidence", `${areaDemandResearch.area}: DLD offer checks and unit AED per sqft`);
    drawWrapped(
      page,
      "Every unit remains costed with the standard 4% DLD / Oqood allowance unless the current booking form confirms a project, phase and unit-specific waiver. Marketed incentives are shown as offer checks and are not deducted from the all-in acquisition basis.",
      regular,
      6.5,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      8.2,
      5,
    );
    page.drawText("AREA PRICE BENCHMARKS", { x: margin, y: 610, size: 6.4, font: bold, color: colors.gold });
    areaDemandResearch.priceBenchmarks.slice(0, 4).forEach((benchmark, index) => {
      const gap = 8;
      const cardWidth = (pageSize[0] - margin * 2 - gap * 3) / 4;
      const x = margin + index * (cardWidth + gap);
      page.drawRectangle({ x, y: 534, width: cardWidth, height: 61, color: index === 2 ? colors.ink : colors.shell });
      page.drawText(fitSingleLine(benchmark.market.toUpperCase(), bold, 4.8, cardWidth - 16), { x: x + 8, y: 577, size: 4.8, font: bold, color: colors.gold });
      page.drawText(benchmark.display.replace("AED ", ""), { x: x + 8, y: 557, size: 9.2, font: bold, color: index === 2 ? colors.white : colors.ink });
      page.drawText("PORTAL AREA INDICATOR", { x: x + 8, y: 543, size: 4.2, font: bold, color: index === 2 ? rgb(.73, .72, .68) : colors.muted });
    });

    const roiColumns = [148, 91, 72, 58, 87, 47];
    const roiHeaders = ["PROJECT / UNIT", "SUBMARKET", "UNIT PRICE", "AED / SQFT", "DLD TREATMENT", "ALL-IN"];
    let roiX = margin;
    page.drawRectangle({ x: margin, y: 500, width: pageSize[0] - margin * 2, height: 25, color: colors.ink });
    roiHeaders.forEach((header, index) => {
      page.drawText(header, { x: roiX + 6, y: 510, size: 4.5, font: bold, color: colors.gold });
      roiX += roiColumns[index];
    });
    projects.slice(0, 16).forEach((project, index) => {
      const rowHeight = 23;
      const rowY = 500 - (index + 1) * rowHeight;
      page.drawRectangle({ x: margin, y: rowY, width: pageSize[0] - margin * 2, height: rowHeight, color: index % 2 ? colors.paper : colors.shell });
      let x = margin;
      const values = [
        `${project.name} | ${project.bedroom}`,
        project.communityContext?.name || project.location || "Not available",
        money(project.unitPrice),
        project.unitPricePerSqft > 0 ? `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}` : "Not available",
        project.acquisitionCostBreakdown.find((item) => /DLD|Oqood/i.test(item.label))?.display || "4% costed",
        project.allInCost > 0 ? money(project.allInCost) : "Not available",
      ];
      values.forEach((value, columnIndex) => {
        if (columnIndex) page.drawLine({ start: { x, y: rowY }, end: { x, y: rowY + rowHeight }, thickness: .25, color: rgb(.78, .74, .66) });
        page.drawText(fitSingleLine(value, columnIndex >= 4 ? bold : regular, columnIndex === 0 ? 5.35 : 5.05, roiColumns[columnIndex] - 12), {
          x: x + 6,
          y: rowY + 8.5,
          size: columnIndex === 0 ? 5.35 : 5.05,
          font: columnIndex >= 4 ? bold : regular,
          color: columnIndex === 4 ? colors.gold : colors.ink,
        });
        x += roiColumns[columnIndex];
      });
    });
    drawWrapped(page, "Marketed DLD offer checks found on 07 September 2026: South Square S1 - 2%; South Living - 2%; Azizi Venice - up to 4%; Enre Residence - up to 4%. These are listing or developer-representative signals, not an official undertaking. All remain costed at 4% until the exact unit booking form confirms eligibility; no current project-specific public offer was verified for the remaining projects.", regular, 5.6, margin, 92, pageSize[0] - margin * 2, colors.muted, 7.2, 5);
    addFooter(page);
    }

    if (hasRentalSensitivity) {
    page = addPage("Ready-property return sensitivity", "Completed assets only");
    drawWrapped(
      page,
      "Rental ROI is presented only for completed properties. The upper case applies each ready project's stored high-rent input to the same unit price, occupancy and cost basis. It is an illustrative sensitivity, not an expected forecast, and assumes no capital appreciation.",
      regular,
      6.6,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      8.4,
      6,
    );
    const catalystCards = [
      ["AL MAKTOUM INTERNATIONAL AIRPORT", "AED 128bn terminal programme", "Phased infrastructure catalyst"],
      ["EXPO CITY + DUBAI EXHIBITION CENTRE", "Metro, events and business ecosystem", "Operating base plus phased expansion"],
      ["DUBAI SOUTH MIXED-USE PIPELINE", "AED 62bn MAF partnership announced", "Future residential, retail and services"],
    ];
    catalystCards.forEach(([label, value, note], index) => {
      const gap = 9;
      const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
      const x = margin + index * (cardWidth + gap);
      page.drawRectangle({ x, y: 548, width: cardWidth, height: 70, color: index === 1 ? colors.ink : colors.shell });
      page.drawText(fitSingleLine(label, bold, 4.5, cardWidth - 16), { x: x + 8, y: 600, size: 4.5, font: bold, color: colors.gold });
      drawWrapped(page, value, bold, 7.2, x + 8, 582, cardWidth - 16, index === 1 ? colors.white : colors.ink, 8.4, 2);
      page.drawText(fitSingleLine(note, regular, 4.4, cardWidth - 16), { x: x + 8, y: 557, size: 4.4, font: regular, color: index === 1 ? rgb(.73, .72, .68) : colors.muted });
    });

    const sensitivityColumns = [137, 91, 62, 62, 49, 49, 53];
    const sensitivityHeaders = ["PROJECT / UNIT", "CATALYST FRAME", "BASE RENT", "UPPER RENT", "BASE", "UPPER", "UPPER NET"];
    let sensitivityX = margin;
    page.drawRectangle({ x: margin, y: 510, width: pageSize[0] - margin * 2, height: 25, color: colors.ink });
    sensitivityHeaders.forEach((header, index) => {
      page.drawText(header, { x: sensitivityX + 5, y: 520, size: 4.2, font: bold, color: colors.gold });
      sensitivityX += sensitivityColumns[index];
    });
    readyIncomeProjects.slice(0, 16).forEach((project, index) => {
      const rowHeight = 23;
      const rowY = 510 - (index + 1) * rowHeight;
      const upperGrossYield = project.unitPrice > 0 ? project.annualRentHigh / project.unitPrice * 100 : 0;
      const upperEffectiveNetIncome = project.annualRentHigh * project.occupancyRate / 100 - project.annualServiceCharge - project.otherAnnualCosts;
      const upperEffectiveNetYield = project.allInCost > 0 ? upperEffectiveNetIncome / project.allInCost * 100 : 0;
      page.drawRectangle({ x: margin, y: rowY, width: pageSize[0] - margin * 2, height: rowHeight, color: index % 2 ? colors.paper : colors.shell });
      let x = margin;
      const values = [
        `${project.name} | ${project.bedroom}`,
        dubaiSouthCatalystLabel(project.location, project.name),
        money(project.annualRent),
        money(project.annualRentHigh),
        percent(project.grossYield),
        percent(upperGrossYield),
        percent(upperEffectiveNetYield),
      ];
      values.forEach((value, columnIndex) => {
        if (columnIndex) page.drawLine({ start: { x, y: rowY }, end: { x, y: rowY + rowHeight }, thickness: .25, color: rgb(.78, .74, .66) });
        page.drawText(fitSingleLine(value, columnIndex >= 4 ? bold : regular, columnIndex < 2 ? 4.85 : 4.65, sensitivityColumns[columnIndex] - 10), {
          x: x + 5,
          y: rowY + 8.5,
          size: columnIndex < 2 ? 4.85 : 4.65,
          font: columnIndex >= 4 ? bold : regular,
          color: columnIndex === 6 ? colors.gold : colors.ink,
        });
        x += sensitivityColumns[columnIndex];
      });
    });
    drawWrapped(page, `${PSR_REPORT_VARIABILITY_NOTICE} Upper rental sensitivities must be refreshed with configuration-matched leasing evidence near handover; future catalysts are not a substitute for current unit economics.`, regular, 5.3, margin, 92, pageSize[0] - margin * 2, colors.muted, 6.8, 5);
    addFooter(page);
    }

    if (areaDemandResearch.investorDemographics?.length) {
    page = addPage("Investor participation", "Dubai-wide investment participation");
    drawWrapped(
      page,
      "Official Dubai Land Department figures below provide citywide context on investor participation and regional capital origin. They describe Dubai as a whole and are not used to infer the profile or suitability of a buyer for any selected Dubai South project.",
      regular,
      7.2,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      9.2,
      4,
    );
    const headlineInvestorSignals = areaDemandResearch.investorDemographics.slice(0, 4);
    headlineInvestorSignals.forEach((signal, index) => {
      const gap = 8;
      const cardWidth = (pageSize[0] - margin * 2 - gap * 3) / 4;
      const x = margin + index * (cardWidth + gap);
      page.drawRectangle({ x, y: 535, width: cardWidth, height: 84, color: index === 2 ? colors.ink : colors.shell });
      page.drawText(fitSingleLine(signal.label.toUpperCase(), bold, 4.6, cardWidth - 16), { x: x + 8, y: 600, size: 4.6, font: bold, color: colors.gold });
      drawWrapped(page, signal.display, bold, 8.3, x + 8, 579, cardWidth - 16, index === 2 ? colors.white : colors.ink, 9.6, 2);
      page.drawText(signal.period.toUpperCase(), { x: x + 8, y: 545, size: 4.2, font: bold, color: index === 2 ? rgb(.73, .72, .68) : colors.muted });
    });
    const q1Signal = areaDemandResearch.investorDemographics[4];
    if (q1Signal) {
      page.drawRectangle({ x: margin, y: 464, width: pageSize[0] - margin * 2, height: 52, color: colors.paper, borderColor: colors.gold, borderWidth: .5 });
      page.drawText("RECENT PARTICIPATION", { x: margin + 12, y: 495, size: 5, font: bold, color: colors.gold });
      page.drawText(`${q1Signal.display} | ${q1Signal.period}`, { x: margin + 132, y: 493, size: 8, font: bold, color: colors.ink });
      page.drawText("Dubai-wide participation context", { x: margin + 132, y: 478, size: 5.3, font: regular, color: colors.muted });
    }

    page.drawText("REGIONAL ORIGIN OF DUBAI INVESTMENT VALUE", { x: margin, y: 430, size: 6.4, font: bold, color: colors.gold });
    page.drawText("DLD 2024 values; share of capital, not people", { x: margin + 262, y: 430, size: 5.3, font: regular, color: colors.muted });
    const originSignals = areaDemandResearch.investorDemographics.slice(5, 8);
    originSignals.forEach((signal, index) => {
      const shares = [58, 25.5, 16.5];
      const y = 390 - index * 57;
      page.drawText(signal.label.toUpperCase(), { x: margin, y: y + 13, size: 5.5, font: bold, color: colors.ink });
      page.drawRectangle({ x: margin + 82, y: y + 4, width: 310, height: 17, color: colors.shell });
      page.drawRectangle({ x: margin + 82, y: y + 4, width: 310 * shares[index] / 60, height: 17, color: index === 0 ? colors.ink : colors.gold, opacity: index === 2 ? .55 : 1 });
      page.drawText(signal.display, { x: margin + 405, y: y + 10, size: 5.7, font: bold, color: colors.ink });
    });

    page.drawRectangle({ x: margin, y: 150, width: pageSize[0] - margin * 2, height: 82, color: colors.shell, borderColor: colors.gold, borderWidth: .5 });
    page.drawText("INTERPRETATION", { x: margin + 15, y: 211, size: 5.8, font: bold, color: colors.gold });
    drawWrapped(page, "Investor counts and resident share are official DLD-reported statistics. Regional capital-origin percentages are PSR calculations from the DLD Annual Report 2024 investment values. They provide market-participation context and do not determine the suitability, rent or return of any selected unit.", regular, 6.1, margin + 15, 190, pageSize[0] - margin * 2 - 30, colors.ink, 7.7, 5);
    drawWrapped(page, PSR_REPORT_VARIABILITY_NOTICE, regular, 5.5, margin, 120, pageSize[0] - margin * 2, colors.muted, 7.1, 4);
    addFooter(page);
    }
  }

  for (let matrixPageIndex = 0; matrixPageIndex < comparisonPageCount; matrixPageIndex += 1) {
    const matrixProjects = projects.slice(matrixPageIndex * 3, (matrixPageIndex + 1) * 3);
    const representedEmirates = new Set(matrixProjects.map((project) => project.emirate));
    page = addPage("Investor decision matrix", representedEmirates.size > 1 ? `Cross-emirate comparison ${matrixPageIndex + 1}` : `Project comparison ${matrixPageIndex + 1}`);
    drawWrapped(
      page,
      "Each column uses the facts available for that exact selected unit and project. Missing evidence is shown as not available; values are never borrowed from another emirate, community or configuration.",
      regular,
      6.8,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      8.5,
      3,
    );
    const labelWidth = 99;
    const dataWidth = (pageSize[0] - margin * 2 - labelWidth) / matrixProjects.length;
    page.drawRectangle({ x: margin, y: 581, width: pageSize[0] - margin * 2, height: 63, color: colors.ink });
    page.drawText("COMPARABLE VARIABLE", { x: margin + 9, y: 611, size: 5.2, font: bold, color: colors.gold });
    matrixProjects.forEach((project, index) => {
      const x = margin + labelWidth + index * dataWidth;
      if (index) page.drawLine({ start: { x, y: 581 }, end: { x, y: 644 }, thickness: .35, color: colors.gold, opacity: .7 });
      drawWrapped(page, project.name, bold, 7.3, x + 8, 625, dataWidth - 16, colors.white, 8.7, 2);
      page.drawText(`${ascii(project.emirate)} | ${ascii(project.location)}`.slice(0, 42), { x: x + 8, y: 590, size: 4.9, font: regular, color: colors.gold });
    });

    const evidenceSet = (project: CuratedProjectSnapshot) => {
      const available = [
        project.areaBenchmark ? "area benchmark" : "",
        project.coordinates ? "coordinates" : "",
        project.communityContext?.sourceUrl ? "community source" : "",
        project.publishedTravelTimes.length ? "travel claims" : "",
        isIncomeAnalysisEligible(project) && project.rentalEvidenceNotes ? "rent note" : "",
      ].filter(Boolean);
      return available.length ? available.join(", ") : "Unit inputs only";
    };
    const latestSignals = (project: CuratedProjectSnapshot) => {
      const emirateSlug = emirateSlugForName(project.emirate);
      const priorities = new Map<string, number>([
        [`project\0${project.slug}`, 0],
        ...(project.communityContext ? [[`community\0${project.communityContext.slug}`, 1] as const] : []),
        ...(emirateSlug ? [[`emirate\0${emirateSlug}`, 2] as const] : []),
        ["uae\0uae", 3],
      ]);
      const applicable = liveObservations
        .filter((observation) => priorities.has(`${observation.scope.type}\0${observation.scope.key}`))
        .sort((left, right) => (priorities.get(`${left.scope.type}\0${left.scope.key}`) || 0) - (priorities.get(`${right.scope.type}\0${right.scope.key}`) || 0))
        .slice(0, 2);
      return applicable.length
        ? applicable.map((item) => `${marketMetricLabel(item.metricKey)}: ${marketObservationDisplay(item)} (${item.freshness})`).join(" | ")
        : "No live observation stored";
    };
    const matrixRows: Array<[string, (project: CuratedProjectSnapshot) => string]> = [
      ["Emirate", (project) => project.emirate || "Not available"],
      ["Community", (project) => project.communityContext?.name || project.location || "Not available"],
      ["Developer", (project) => project.developer || "Not available"],
      ["Selected unit", (project) => `${project.unitReference} | ${project.bedroom}`],
      ["Planning unit price", (project) => money(project.unitPrice)],
      ["Unit area", (project) => project.unitAreaSqft > 0 ? `${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft` : "Not available"],
      ["Unit AED / sqft", (project) => project.unitPricePerSqft > 0 ? `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}` : "Not available"],
      ["Area benchmark", (project) => project.areaBenchmark ? `AED ${project.areaBenchmark.value.toLocaleString("en-AE")} | ${project.areaBenchmark.period}` : "Not available"],
      ["Vs area benchmark", (project) => project.priceVsAreaPercent === null ? "Not available" : `${project.priceVsAreaPercent >= 0 ? "+" : ""}${project.priceVsAreaPercent.toFixed(1)}%`],
      ["Annual service charge", (project) => project.annualServiceCharge > 0 ? money(project.annualServiceCharge) : "Not available"],
      ["All-in acquisition basis", (project) => project.allInCost > 0 ? money(project.allInCost) : "Not available"],
      ["Payment plan", (project) => project.paymentPlan || "Not available"],
      ["Handover", (project) => project.handover || "Not available"],
      ["Published status", (project) => project.projectKnowledge?.statusLabel || "Not available"],
      ["Evidence available", evidenceSet],
      ["Latest stored signals", latestSignals],
      ["Source / verification date", (project) => project.projectKnowledge?.verifiedAt || project.catalogueUpdatedAt || "Date not available"],
    ];
    const rowHeight = 24;
    matrixRows.forEach(([label, getValue], rowIndex) => {
      const rowY = 581 - (rowIndex + 1) * rowHeight;
      page.drawRectangle({ x: margin, y: rowY, width: pageSize[0] - margin * 2, height: rowHeight, color: rowIndex % 2 ? colors.paper : colors.shell });
      page.drawText(ascii(label).toUpperCase().slice(0, 30), { x: margin + 9, y: rowY + 9, size: 4.9, font: bold, color: rowIndex < 3 ? colors.gold : colors.muted });
      matrixProjects.forEach((project, projectIndex) => {
        const x = margin + labelWidth + projectIndex * dataWidth;
        page.drawLine({ start: { x, y: rowY }, end: { x, y: rowY + rowHeight }, thickness: .25, color: rgb(.78, .74, .66) });
        drawWrapped(page, getValue(project), rowIndex === 8 ? bold : regular, 5.25, x + 8, rowY + 14, dataWidth - 16, rowIndex === 8 ? colors.gold : colors.ink, 6.1, 2);
      });
    });
    drawWrapped(page, "Decision support, not a valuation or promise of return. Planning assumptions are frozen at generation; market observations retain their source and verification date and require advisor review before client issue.", regular, 5.8, margin, 84, pageSize[0] - margin * 2, colors.muted, 7.5, 3);
    addFooter(page);
  }

  // Market context
  page = addPage("Evidence layer", "Market and research context");
  drawWrapped(page, content.locationStory, regular, 8.1, margin, 664, pageSize[0] - margin * 2, colors.muted, 11.5, 3);
  const headline = content.marketContext?.headline || [];
  const headlineWidth = (pageSize[0] - margin * 2 - 18) / Math.max(1, Math.min(4, headline.length));
  headline.slice(0, 4).forEach((item, index) => {
    drawMetricCard(page, item.label, item.display, item.note, margin + index * (headlineWidth + 6), 530, headlineWidth, 82, regular, bold, colors);
  });
  const charts = content.marketContext?.charts || [];
  if (charts[0]) drawChart(page, charts[0], margin, 286, 239, 218, regular, bold, colors);
  if (charts[1]) drawChart(page, charts[1], margin + 251, 286, 239, 218, regular, bold, colors);
  if (charts[2]) drawChart(page, charts[2], margin, 72, 490, 190, regular, bold, colors);
  if (!charts.length) {
    page.drawRectangle({ x: margin, y: 160, width: pageSize[0] - margin * 2, height: 330, color: colors.shell });
    page.drawText("NO VERIFIED TRANSACTION SERIES STORED FOR THIS EMIRATE", { x: margin + 24, y: 445, size: 7, font: bold, color: colors.gold });
    drawWrapped(page, "The brief therefore uses saved unit planning scenarios, sufficiently specific AED/sqft benchmarks where available, coordinate-based accessibility, rental evidence notes and the indexed nearby project pipeline. Attach a current comparable-transactions schedule before reservation.", regular, 10, margin + 24, 415, pageSize[0] - margin * 2 - 48, colors.ink, 15, 8);
  }
  addFooter(page);

  for (let livePageIndex = 0; livePageIndex < liveDataPageCount; livePageIndex += 1) {
    const pageObservations = liveObservations.slice(livePageIndex * 11, (livePageIndex + 1) * 11);
    page = addPage("Live evidence snapshot", `Latest stored market observations${liveDataPageCount > 1 ? ` ${livePageIndex + 1}` : ""}`);
    drawWrapped(
      page,
      `Captured at ${liveMarketData?.capturedAt || content.preparedAt}. “Live” means the observation is within its source-specific freshness window; it does not mean a streaming price. Every saved report freezes this evidence for reproducibility.`,
      regular,
      6.8,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      8.4,
      3,
    );
    const columns = [margin, margin + 78, margin + 190, margin + 310, margin + 384, margin + 438];
    ["Scope", "Data point", "Value", "Observed", "Freshness", "Source"].forEach((label, index) => {
      page.drawText(label.toUpperCase(), { x: columns[index] + 6, y: 621, size: 4.9, font: bold, color: colors.gold });
    });
    pageObservations.forEach((observation, index) => {
      const rowHeight = 47;
      const rowY = 596 - index * rowHeight;
      page.drawRectangle({ x: margin, y: rowY - 28, width: pageSize[0] - margin * 2, height: 40, color: index % 2 ? colors.paper : colors.shell });
      drawWrapped(page, `${observation.scope.type}\n${observation.scope.label || observation.scope.key}`, regular, 4.9, columns[0] + 6, rowY, 66, colors.ink, 6, 3);
      drawWrapped(page, marketMetricLabel(observation.metricKey), bold, 5.4, columns[1] + 6, rowY, 100, colors.ink, 6.4, 3);
      drawWrapped(page, marketObservationDisplay(observation), bold, 5.4, columns[2] + 6, rowY, 108, colors.ink, 6.4, 3);
      drawWrapped(page, observation.observedAt.slice(0, 10), regular, 5, columns[3] + 6, rowY, 62, colors.muted, 6, 2);
      const freshnessColor = observation.freshness === "live" || observation.freshness === "recent" ? colors.green : observation.freshness === "stale" ? rgb(.62, .23, .18) : colors.gold;
      page.drawText(observation.freshness.toUpperCase(), { x: columns[4] + 6, y: rowY, size: 5, font: bold, color: freshnessColor });
      drawWrapped(page, observation.source.publisher, regular, 4.8, columns[5] + 6, rowY, pageSize[0] - margin - columns[5] - 8, colors.ink, 5.8, 3);
    });
    page.drawText("LIVE / RECENT / REFERENCE / STALE ARE SOURCE-SPECIFIC AGE LABELS. FULL URLS AND METHODOLOGY APPEAR IN THE APPENDIX.", { x: margin, y: 62, size: 4.8, font: bold, color: colors.muted });
    addFooter(page);
  }

  // Three evidence-led pages for each represented emirate: investment case,
  // destinations/catalysts, then communities and daily-life infrastructure.
  // Content is snapshotted from the public Market Atlas and community layers.
  emirateContexts.forEach((context) => {
    page = addPage("Emirate investment case", `Why ${context.name}`);
    page.drawText(ascii(context.descriptor).toUpperCase().slice(0, 92), { x: margin, y: 664, size: 6.4, font: bold, color: colors.gold });
    drawImageOrGraphic(page, images.get(context.imageUrl), margin, 418, pageSize[0] - margin * 2, 218, colors.ink, colors.gold);
    page.drawRectangle({ x: margin, y: 418, width: pageSize[0] - margin * 2, height: 55, color: colors.ink, opacity: .88 });
    page.drawText("PSR UAE MARKET ATLAS", { x: margin + 14, y: 454, size: 6.2, font: bold, color: colors.gold });
    page.drawText(`${context.name.toUpperCase()} | SOURCE-LINKED MARKET CONTEXT`, { x: margin + 14, y: 440, size: 6.8, font: bold, color: colors.white });
    page.drawText(ascii(context.imageCredit).slice(0, 125), { x: margin + 14, y: 426, size: 4.7, font: regular, color: rgb(.78, .77, .73) });

    page.drawText("INVESTMENT VIABILITY", { x: margin, y: 391, size: 6.5, font: bold, color: colors.gold });
    drawWrapped(page, context.investmentCase, regular, 7.8, margin, 371, pageSize[0] - margin * 2, colors.ink, 10.5, 6);
    page.drawText("WHAT INVESTORS SHOULD TEST", { x: margin, y: 296, size: 6.5, font: bold, color: colors.gold });
    let checkY = 275;
    context.viabilityChecks.slice(0, 3).forEach((item, index) => {
      page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: checkY, size: 6.2, font: bold, color: colors.gold });
      checkY = drawWrapped(page, item, regular, 7, margin + 25, checkY + 2, pageSize[0] - margin * 2 - 25, colors.ink, 9.2, 2) - 8;
    });

    const anchorGap = 12;
    const anchorWidth = (pageSize[0] - margin * 2 - anchorGap) / 2;
    context.anchors.slice(0, 4).forEach((anchor, index) => {
      const x = margin + (index % 2) * (anchorWidth + anchorGap);
      const cardY = 128 - Math.floor(index / 2) * 62;
      page.drawRectangle({ x, y: cardY, width: anchorWidth, height: 54, color: colors.shell });
      page.drawLine({ start: { x, y: cardY + 54 }, end: { x: x + anchorWidth, y: cardY + 54 }, thickness: .6, color: colors.gold });
      page.drawText(ascii(anchor.label).toUpperCase().slice(0, 42), { x: x + 12, y: cardY + 37, size: 5.4, font: bold, color: colors.gold });
      drawWrapped(page, anchor.value, bold, 8, x + 12, cardY + 22, anchorWidth - 24, colors.ink, 9.2, 2);
    });
    addFooter(page);

    page = addPage("Emirate evidence", `${context.name}: demand and growth drivers`);
    drawWrapped(
      page,
      "This page separates operating assets, under-construction programmes and announced initiatives. Status, evidence date and delivery wording are preserved so an announcement is never presented as an operating asset.",
      regular,
      7.4,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      10,
      3,
    );
    page.drawText("PLACE AND DEMAND DRIVERS", { x: margin, y: 619, size: 6.5, font: bold, color: colors.gold });
    context.signals.slice(0, 4).forEach((signal, index) => {
      const cardWidth = 239;
      const cardHeight = 88;
      const x = margin + (index % 2) * 251;
      const cardY = 509 - Math.floor(index / 2) * 101;
      page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: colors.shell });
      page.drawLine({ start: { x, y: cardY + cardHeight }, end: { x: x + cardWidth, y: cardY + cardHeight }, thickness: .6, color: colors.gold });
      page.drawText(ascii(signal.title).slice(0, 46), { x: x + 13, y: cardY + 64, size: 8.4, font: bold, color: colors.ink });
      drawWrapped(page, signal.detail, regular, 6.2, x + 13, cardY + 47, cardWidth - 26, colors.muted, 8, 5);
    });

    page.drawText("TRACKED INITIATIVES", { x: margin, y: 385, size: 6.5, font: bold, color: colors.gold });
    context.catalysts.slice(0, 4).forEach((initiative, index) => {
      const rowY = 352 - index * 70;
      page.drawRectangle({ x: margin, y: rowY - 50, width: pageSize[0] - margin * 2, height: 61, color: index % 2 ? colors.paper : colors.shell });
      page.drawText(ascii(initiative.name).slice(0, 52), { x: margin + 12, y: rowY - 4, size: 8.2, font: bold, color: colors.ink });
      page.drawText(`${ascii(initiative.category).toUpperCase()} | ${ascii(initiative.timing).toUpperCase()}`.slice(0, 74), { x: margin + 12, y: rowY - 17, size: 5.5, font: regular, color: colors.muted });
      page.drawText(fitSingleLine(initiative.status.toUpperCase(), bold, 5.8, 82), { x: pageSize[0] - margin - 82, y: rowY - 4, size: 5.8, font: bold, color: initiative.status === "Operating" || initiative.status === "Active programme" ? colors.green : colors.gold });
      drawWrapped(page, `${initiative.summary} Market read: ${initiative.marketImpact}`, regular, 5.7, margin + 12, rowY - 30, pageSize[0] - margin * 2 - 24, colors.muted, 7.2, 3);
    });
    const checkedAt = context.sources[0]?.verifiedAt;
    if (checkedAt) page.drawText(`MARKET ATLAS EVIDENCE CHECKED ${checkedAt} | FULL SOURCE LINKS IN APPENDIX`, { x: margin, y: 60, size: 5.6, font: bold, color: colors.gold });
    addFooter(page);

    page = addPage("Living infrastructure", `${context.name}: communities and establishments`);
    drawWrapped(
      page,
      "The selected community profiles come from the same PSR website directory used by clients. Establishments combine project-published travel times with approximate straight-line coordinate checks; neither should be presented as a guaranteed drive time.",
      regular,
      7.4,
      margin,
      664,
      pageSize[0] - margin * 2,
      colors.muted,
      10,
      3,
    );
    const communities = Array.isArray(context.communities) ? context.communities.slice(0, 4) : [];
    page.drawText("SELECTED COMMUNITY CONTEXT", { x: margin, y: 620, size: 6.5, font: bold, color: colors.gold });
    if (communities.length) {
      communities.forEach((community, index) => {
        const cardWidth = 239;
        const cardHeight = 100;
        const x = margin + (index % 2) * 251;
        const cardY = 497 - Math.floor(index / 2) * 112;
        page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: colors.shell });
        page.drawLine({ start: { x, y: cardY + cardHeight }, end: { x: x + cardWidth, y: cardY + cardHeight }, thickness: .6, color: colors.gold });
        page.drawText(ascii(community.name).slice(0, 38), { x: x + 13, y: cardY + 76, size: 8.5, font: bold, color: colors.ink });
        drawWrapped(page, community.descriptor.toUpperCase(), bold, 5, x + 13, cardY + 62, cardWidth - 26, colors.gold, 6, 2);
        drawWrapped(page, community.overview, regular, 5.8, x + 13, cardY + 43, cardWidth - 26, colors.muted, 7.3, 4);
        page.drawText(`${community.activeProjects} ACTIVE PSR PROJECT${community.activeProjects === 1 ? "" : "S"}`.toUpperCase(), { x: x + 13, y: cardY + 9, size: 4.9, font: bold, color: colors.muted });
      });
    } else {
      drawWrapped(page, "No mapped PSR community profile was stored for the selected project location. Confirm the district, master-community boundary and daily services before client delivery.", regular, 8, margin, 592, pageSize[0] - margin * 2, colors.muted, 11, 4);
    }

    page.drawText("LOCAL PLACES, SERVICES AND DESTINATION NETWORK", { x: margin, y: 350, size: 6.5, font: bold, color: colors.gold });
    const establishments = Array.isArray(context.establishments) ? context.establishments.slice(0, 8) : [];
    establishments.forEach((place, index) => {
      const cardWidth = 239;
      const cardHeight = 56;
      const x = margin + (index % 2) * 251;
      const cardY = 276 - Math.floor(index / 2) * 68;
      page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 4 < 2 ? colors.paper : colors.shell });
      page.drawLine({ start: { x, y: cardY }, end: { x: x + 3, y: cardY + cardHeight }, thickness: 2, color: colors.gold });
      page.drawText(ascii(place.name).slice(0, 42), { x: x + 12, y: cardY + 38, size: 7.4, font: bold, color: colors.ink });
      page.drawText(ascii(place.category).toUpperCase().slice(0, 36), { x: x + 12, y: cardY + 25, size: 5, font: bold, color: colors.gold });
      drawWrapped(page, place.proximity, regular, 5.2, x + 12, cardY + 13, cardWidth - 24, colors.muted, 6.2, 2);
    });
    if (!establishments.length) {
      drawWrapped(page, "No project-linked establishment screen is stored. Add confirmed schools, malls, hospitals and daily services before sending the report.", regular, 8, margin, 320, pageSize[0] - margin * 2, colors.muted, 11, 4);
    }
    if (!establishments.some((place) => /\b(?:school|academy|nursery)\b/i.test(place.name))) {
      page.drawText("SCHOOL CHECK: NO SOURCE-BACKED SCHOOL RECORD IS STORED FOR THIS SELECTION", { x: margin, y: 55, size: 5.1, font: bold, color: colors.muted });
    }
    addFooter(page);

    if (expandedHierarchy && includeTimelinePanels) {
      page = addPage("Emirate knowledge atlas", `${context.name}: past, present and future`);
      page.drawText("MARKET EVOLUTION", { x: margin, y: 664, size: 6.4, font: bold, color: colors.gold });
      (["past", "present", "future"] as const).forEach((period, index) => {
        const gap = 11;
        const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
        const x = margin + index * (cardWidth + gap);
        page.drawRectangle({ x, y: 492, width: cardWidth, height: 148, color: index === 1 ? colors.ink : colors.shell });
        page.drawText(period.toUpperCase(), { x: x + 12, y: 616, size: 6.2, font: bold, color: colors.gold });
        drawWrapped(page, context.timeline[period], regular, 5.8, x + 12, 597, cardWidth - 24, index === 1 ? colors.white : colors.ink, 7.1, 14);
      });

      page.drawText("FOUR-PILLAR INVESTMENT KNOWLEDGE", { x: margin, y: 464, size: 6.4, font: bold, color: colors.gold });
      context.knowledgePillars.slice(0, 4).forEach((pillar, index) => {
        const cardWidth = 239;
        const cardHeight = 112;
        const x = margin + (index % 2) * 251;
        const cardY = 329 - Math.floor(index / 2) * 123;
        page.drawRectangle({ x, y: cardY, width: cardWidth, height: cardHeight, color: index % 4 < 2 ? colors.paper : colors.shell });
        page.drawLine({ start: { x, y: cardY + cardHeight }, end: { x: x + cardWidth, y: cardY + cardHeight }, thickness: .55, color: colors.gold });
        page.drawText(ascii(pillar.label).toUpperCase().slice(0, 48), { x: x + 12, y: cardY + 88, size: 5.8, font: bold, color: colors.gold });
        drawWrapped(page, pillar.summary, regular, 5.7, x + 12, cardY + 72, cardWidth - 24, colors.ink, 7, 6);
        const signal = pillar.signals[0];
        if (signal) {
          page.drawText("EVIDENCE SIGNAL", { x: x + 12, y: cardY + 25, size: 4.6, font: bold, color: colors.muted });
          drawWrapped(page, signal.title, bold, 5.6, x + 12, cardY + 13, cardWidth - 24, colors.ink, 6.5, 2);
        }
      });

      page.drawText("EMIRATE VISUAL CONTEXT", { x: margin, y: 181, size: 6.2, font: bold, color: colors.gold });
      const galleryGap = 9;
      const galleryWidth = (pageSize[0] - margin * 2 - galleryGap * 2) / 3;
      context.gallery.slice(0, 3).forEach((item, index) => {
        const x = margin + index * (galleryWidth + galleryGap);
        drawImageOrGraphic(page, images.get(item.src), x, 76, galleryWidth, 88, colors.ink, colors.gold);
        page.drawRectangle({ x, y: 76, width: galleryWidth, height: 23, color: colors.ink, opacity: .84 });
        page.drawText(ascii(item.alt).slice(0, 31), { x: x + 7, y: 87, size: 4.8, font: regular, color: colors.white });
      });
      addFooter(page);
    }
  });

  if (expandedHierarchy) {
    communityContexts.forEach((community) => {
      const parentContext = emirateContexts.find((context) => context.communities.some((candidate) => candidate.slug === community.slug));
      page = addPage("Selected community", includeTimelinePanels ? `${community.name}: history, daily life and pipeline` : `${community.name}: daily life, evidence and catalysts`);
      drawImageOrGraphic(page, images.get(community.imageUrl), margin, 475, pageSize[0] - margin * 2, 185, colors.ink, colors.gold);
      page.drawRectangle({ x: margin, y: 475, width: pageSize[0] - margin * 2, height: 64, color: colors.ink, opacity: .88 });
      page.drawText(ascii(community.descriptor).toUpperCase().slice(0, 90), { x: margin + 14, y: 516, size: 6, font: bold, color: colors.gold });
      drawWrapped(page, community.overview, regular, 6.4, margin + 14, 500, pageSize[0] - margin * 2 - 28, colors.white, 7.6, 3);
      page.drawText(`${ascii(community.sourceLabel)} | ${ascii(community.verifiedAt || "verification date not stored")}`.slice(0, 110), { x: margin + 14, y: 483, size: 4.7, font: regular, color: rgb(.78, .77, .73) });

      page.drawText(includeTimelinePanels ? "COMMUNITY TIMELINE" : "INVESTMENT RELEVANCE AND CURRENT EVIDENCE", { x: margin, y: 448, size: 6.3, font: bold, color: colors.gold });
      if (includeTimelinePanels) {
        (["past", "present", "future"] as const).forEach((period, index) => {
          const gap = 11;
          const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
          const x = margin + index * (cardWidth + gap);
          page.drawRectangle({ x, y: 304, width: cardWidth, height: 123, color: index === 1 ? colors.ink : colors.shell });
          page.drawText(period.toUpperCase(), { x: x + 11, y: 404, size: 5.8, font: bold, color: colors.gold });
          drawWrapped(page, community.timeline[period], regular, 5.4, x + 11, 387, cardWidth - 22, index === 1 ? colors.white : colors.ink, 6.5, 13);
        });
      } else {
        const evidenceCards = [
          { label: "LIVING BASE", copy: community.timeline.present },
          { label: "SELECTED POSITION", copy: community.selectedProjects.length ? `${community.selectedProjects.length} selected project${community.selectedProjects.length === 1 ? "" : "s"}: ${community.selectedProjects.map((item) => item.name).join(", ")}.` : "No selected project is mapped to this community." },
          { label: "CATALYSTS TO MONITOR", copy: community.timeline.future },
        ];
        evidenceCards.forEach((item, index) => {
          const gap = 11;
          const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
          const x = margin + index * (cardWidth + gap);
          page.drawRectangle({ x, y: 304, width: cardWidth, height: 123, color: index === 1 ? colors.ink : colors.shell });
          page.drawText(item.label, { x: x + 11, y: 404, size: 5.8, font: bold, color: colors.gold });
          drawWrapped(page, item.copy, regular, 5.4, x + 11, 387, cardWidth - 22, index === 1 ? colors.white : colors.ink, 6.5, 13);
        });
      }

      page.drawText("CURRENT PSR COVERAGE", { x: margin, y: 278, size: 6.3, font: bold, color: colors.gold });
      const coverageCards = [
        ["Active projects", String(community.activeProjects)],
        ["Developers", community.developers.length ? community.developers.join(", ") : "Not available"],
        ["Property types", community.propertyTypes.length ? community.propertyTypes.join(", ") : "Not available"],
      ];
      coverageCards.forEach(([label, value], index) => {
        const gap = 11;
        const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
        const x = margin + index * (cardWidth + gap);
        page.drawRectangle({ x, y: 209, width: cardWidth, height: 52, color: colors.shell });
        page.drawText(label.toUpperCase(), { x: x + 11, y: 243, size: 4.8, font: bold, color: colors.gold });
        drawWrapped(page, value, bold, 6.3, x + 11, 227, cardWidth - 22, colors.ink, 7.2, 2);
      });

      page.drawText("SELECTED PROJECT PIPELINE", { x: margin, y: 184, size: 6.3, font: bold, color: colors.gold });
      community.selectedProjects.slice(0, 3).forEach((selectedProject, index) => {
        const rowY = 157 - index * 30;
        page.drawRectangle({ x: margin, y: rowY - 12, width: pageSize[0] - margin * 2, height: 25, color: index % 2 ? colors.paper : colors.shell });
        page.drawText(ascii(selectedProject.name).slice(0, 48), { x: margin + 10, y: rowY, size: 6.3, font: bold, color: colors.ink });
        page.drawText(ascii(selectedProject.developer).slice(0, 30), { x: 330, y: rowY, size: 5.4, font: regular, color: colors.muted });
        page.drawText(ascii(selectedProject.handover || "To be confirmed").slice(0, 22), { x: pageSize[0] - margin - 84, y: rowY, size: 5.4, font: bold, color: colors.gold });
      });
      if (!community.selectedProjects.length) {
        drawWrapped(page, "No selected project was linked to this community in the saved report snapshot.", regular, 6.5, margin, 157, pageSize[0] - margin * 2, colors.muted, 8, 2);
      }
      const linkedPlaces = parentContext?.establishments.filter((place) => place.community === community.name).slice(0, 3) || [];
      if (linkedPlaces.length) {
        page.drawText(fitSingleLine(`LOCAL EVIDENCE: ${linkedPlaces.map((place) => `${place.name} - ${place.proximity}`).join(" | ")}`, regular, 4.8, pageSize[0] - margin * 2), { x: margin, y: 58, size: 4.8, font: regular, color: colors.muted });
      }
      addFooter(page);
    });
  }

  // Three legacy pages per project plus the expanded project proposition page for
  // reports that snapshot the complete company-to-project hierarchy.
  projects.forEach((project, projectIndex) => {
    if (compactProjectModules) {
      const knowledge = project.projectKnowledge;
      const incomeEligible = isIncomeAnalysisEligible(project);
      const dldLine = project.acquisitionCostBreakdown.find((item) => /DLD|Oqood/i.test(item.label));
      page = addPage(`Opportunity ${String(projectIndex + 1).padStart(2, "0")}`, project.name);
      drawImageOrGraphic(page, images.get(project.imageUrl), margin, 470, pageSize[0] - margin * 2, 198, colors.ink, colors.gold);
      page.drawRectangle({ x: margin, y: 470, width: pageSize[0] - margin * 2, height: 49, color: colors.ink, opacity: .86 });
      page.drawText(fitSingleLine(`${project.developer} | ${project.location}`, bold, 7.4, pageSize[0] - margin * 2 - 30), { x: margin + 15, y: 497, size: 7.4, font: bold, color: colors.white });
      page.drawText(fitSingleLine(`${project.unitReference} | ${project.handover}`, regular, 6.2, pageSize[0] - margin * 2 - 30), { x: margin + 15, y: 482, size: 6.2, font: regular, color: colors.gold });

      const metricGap = 6;
      const metricWidth = (pageSize[0] - margin * 2 - metricGap * 3) / 4;
      const compactMetrics = incomeEligible ? [
        ["Planning unit price", money(project.unitPrice), `${project.bedroom} | ${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft`],
        ["All-in scenario", money(project.allInCost), `${money(project.acquisitionCosts)} fee allowance`],
        ["Gross rental ROI", percent(project.grossYield), `${money(project.annualRent)} rent case`],
        ["Occupancy-adjusted net ROI", percent(project.effectiveNetYield), `${project.occupancyRate.toFixed(0)}% occupancy case`],
      ] : [
        ["Planning unit price", money(project.unitPrice), `${project.bedroom} | ${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft`],
        ["All-in scenario", money(project.allInCost), `${money(project.acquisitionCosts)} fee allowance`],
        ["Unit AED per sqft", `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}`, "Based on stated saleable area"],
        ["DLD treatment", dldLine?.display || "4% costed", "Apply an incentive only when the booking form confirms it"],
      ];
      compactMetrics.forEach(([label, value, note], index) => {
        drawMetricCard(page, label, value, note, margin + index * (metricWidth + metricGap), 383, metricWidth, 70, regular, bold, colors);
      });

      page.drawRectangle({ x: margin, y: 286, width: pageSize[0] - margin * 2, height: 78, color: colors.ink });
      page.drawText("CURRENT PROJECT POSITION", { x: margin + 15, y: 341, size: 5.8, font: bold, color: colors.gold });
      drawWrapped(page, knowledge?.statusLabel || "Status requires current confirmation", bold, 9, margin + 15, 321, 132, colors.white, 10.5, 3);
      drawWrapped(
        page,
        knowledge?.releaseNote || "Current inventory, unit status and sale terms require documentary confirmation before client issue.",
        regular,
        5.8,
        margin + 164,
        341,
        pageSize[0] - margin * 2 - 179,
        rgb(.8, .79, .74),
        7.1,
        7,
      );

      page.drawText("WHY IT IS IN THE REVIEW", { x: margin, y: 261, size: 6.1, font: bold, color: colors.gold });
      (knowledge?.investmentPoints || []).slice(0, 4).forEach((item, index) => {
        const itemY = 238 - index * 29;
        page.drawCircle({ x: margin + 3, y: itemY + 3, size: 1.8, color: colors.gold });
        drawWrapped(page, item, regular, 5.7, margin + 12, itemY + 5, 224, colors.ink, 6.8, 3);
      });

      page.drawText("UNIT, ACCESS AND DELIVERY", { x: margin + 251, y: 261, size: 6.1, font: bold, color: colors.gold });
      const accessRows = [
        ["Configuration", `${project.bedroom} | ${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft`],
        ["Payment", project.paymentPlan],
        ["Handover", project.handover],
        ["Published access", project.publishedTravelTimes[0] ? `${project.publishedTravelTimes[0].minutes} min to ${project.publishedTravelTimes[0].destination}` : project.nearby[0] ? `Approx. ${project.nearby[0].distanceKm.toFixed(1)} km to ${project.nearby[0].name}` : "Not available"],
      ];
      accessRows.forEach(([label, value], index) => {
        const rowY = 238 - index * 29;
        page.drawLine({ start: { x: margin + 251, y: rowY - 8 }, end: { x: pageSize[0] - margin, y: rowY - 8 }, thickness: .35, color: rgb(.78, .74, .66) });
        page.drawText(label.toUpperCase(), { x: margin + 251, y: rowY, size: 5.2, font: bold, color: colors.muted });
        page.drawText(fitSingleLine(value, bold, 5.8, 137), { x: pageSize[0] - margin - 137, y: rowY, size: 5.8, font: bold, color: colors.ink });
      });

      page.drawRectangle({ x: margin, y: 61, width: pageSize[0] - margin * 2, height: 70, color: colors.shell, borderColor: colors.gold, borderWidth: .55 });
      page.drawText("DILIGENCE BEFORE CLIENT ISSUE", { x: margin + 14, y: 114, size: 5.8, font: bold, color: colors.gold });
      drawWrapped(page, project.confirmationNotes || "Confirm the exact unit, current availability, payment ledger and transaction documents.", regular, 5.6, margin + 14, 98, pageSize[0] - margin * 2 - 28, colors.ink, 6.7, 3);
      page.drawText(incomeEligible ? "RENTAL BASIS" : "DLD OFFER CHECK", { x: margin + 14, y: 71, size: 5.2, font: bold, color: colors.gold });
      drawWrapped(page, incomeEligible ? (project.rentalEvidenceNotes || project.rentalEvidence.note) : (dldLine?.note || "The standard 4% allowance is retained until current developer paperwork confirms otherwise."), regular, 5.2, margin + 78, 72, pageSize[0] - margin * 2 - 100, colors.muted, 6, 2);
      addFooter(page);
    } else {
    page = addPage(`Opportunity ${String(projectIndex + 1).padStart(2, "0")}`, project.name);
    drawImageOrGraphic(page, images.get(project.imageUrl), margin, 424, pageSize[0] - margin * 2, 250, colors.ink, colors.gold);
    page.drawRectangle({ x: margin, y: 424, width: pageSize[0] - margin * 2, height: 55, color: colors.ink, opacity: .84 });
    page.drawText(`${ascii(project.developer)} | ${ascii(project.location)}`.slice(0, 82), { x: margin + 15, y: 448, size: 7.5, font: bold, color: colors.white });
    page.drawText(`${ascii(project.unitReference)} | ${ascii(project.handover)}`.slice(0, 72), { x: margin + 15, y: 433, size: 6.3, font: regular, color: colors.gold });
    const incomeEligible = isIncomeAnalysisEligible(project);
    const dldLine = project.acquisitionCostBreakdown.find((item) => /DLD|Oqood/i.test(item.label));
    const cards = incomeEligible ? [
      ["Unit price", money(project.unitPrice), project.paymentPlan],
      ["Price per sqft", `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}`, `${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft`],
      ["Gross rental ROI", percent(project.grossYield), `${money(project.annualRent)} annual rent scenario`],
      ["Occupancy-adjusted net ROI", percent(project.effectiveNetYield), `${money(project.effectiveNetAnnualIncome)} effective net income scenario`],
    ] : [
      ["Unit price", money(project.unitPrice), project.paymentPlan],
      ["Price per sqft", `AED ${Math.round(project.unitPricePerSqft).toLocaleString("en-AE")}`, `${Math.round(project.unitAreaSqft).toLocaleString("en-AE")} sqft`],
      ["All-in scenario", money(project.allInCost), `${money(project.acquisitionCosts)} acquisition allowance`],
      ["DLD treatment", dldLine?.display || "4% costed", "Written unit confirmation required"],
    ];
    cards.forEach(([label, value, note], index) => {
      drawMetricCard(page, label, value, note, margin + (index % 2) * 251, 312 - Math.floor(index / 2) * 96, 239, 80, regular, bold, colors);
    });
    page.drawText("PAYMENT SCHEDULE", { x: margin, y: 197, size: 6.5, font: bold, color: colors.gold });
    if (project.paymentSchedule.length) {
      project.paymentSchedule.slice(0, 5).forEach((item, index) => {
        const rowY = 174 - index * 25;
        page.drawLine({ start: { x: margin, y: rowY - 7 }, end: { x: margin + 232, y: rowY - 7 }, thickness: .35, color: rgb(.78, .74, .66) });
        page.drawText(`${item.percentage}% ${ascii(item.label).toUpperCase()}`.slice(0, 32), { x: margin, y: rowY, size: 5.5, font: bold, color: colors.muted });
        page.drawText(money(item.amount), { x: margin + 142, y: rowY, size: 6.8, font: bold, color: colors.ink });
      });
    } else {
      drawWrapped(page, "The published payment split is not structured enough to calculate. Confirm the current developer schedule.", regular, 7, margin, 174, 225, colors.muted, 10, 5);
    }
    page.drawText("OWNERSHIP COST MODEL", { x: margin + 251, y: 197, size: 6.5, font: bold, color: colors.gold });
    const costRows = [
      ["Annual service charge", money(project.annualServiceCharge)],
      ["Other annual costs", money(project.otherAnnualCosts)],
      ["One-time acquisition costs", money(project.acquisitionCosts)],
      ["All-in acquisition basis", money(project.allInCost)],
    ];
    costRows.forEach(([label, value], index) => {
      const rowY = 174 - index * 25;
      page.drawLine({ start: { x: margin + 251, y: rowY - 7 }, end: { x: pageSize[0] - margin, y: rowY - 7 }, thickness: .35, color: rgb(.78, .74, .66) });
      page.drawText(label.toUpperCase(), { x: margin + 251, y: rowY, size: 5.5, font: bold, color: colors.muted });
      page.drawText(value, { x: pageSize[0] - margin - 92, y: rowY, size: 6.8, font: bold, color: colors.ink });
    });
    addFooter(page);

    page = addPage("Location intelligence", `${project.location}: access and pipeline`);
    page.drawText(`ACCESSIBILITY - ${project.nearby.length} COORDINATE CHECK${project.nearby.length === 1 ? "" : "S"}`, { x: margin, y: 658, size: 6.5, font: bold, color: colors.gold });
    if (project.nearby.length) {
      project.nearby.slice(0, 6).forEach((place, index) => {
        const rowY = 628 - index * 35;
        page.drawCircle({ x: margin + 9, y: rowY + 3, size: 8, color: index === 0 ? colors.gold : colors.ink });
        page.drawText(String(index + 1), { x: margin + 7, y: rowY, size: 5.5, font: bold, color: colors.white });
        page.drawText(ascii(place.name).slice(0, 48), { x: margin + 30, y: rowY + 5, size: 8.5, font: bold, color: colors.ink });
        page.drawText(`${ascii(place.category)} | approx. ${place.distanceKm.toFixed(1)} km`, { x: margin + 30, y: rowY - 9, size: 6.2, font: regular, color: colors.muted });
        const barWidth = Math.max(18, Math.min(205, 205 * (1 - Math.min(place.distanceKm, 40) / 45)));
        page.drawRectangle({ x: 330, y: rowY - 3, width: barWidth, height: 5, color: index === 0 ? colors.gold : rgb(.3, .31, .28) });
      });
    } else {
      drawWrapped(page, "Published coordinates are not available for this project. Drive times and nearby establishments must be confirmed manually before the brief is sent.", regular, 9.5, margin, 625, pageSize[0] - margin * 2, colors.muted, 14, 5);
    }
    page.drawText(`UPCOMING SUPPLY SCREEN - ${project.upcoming.length} INDEXED MATCH${project.upcoming.length === 1 ? "" : "ES"}`, { x: margin, y: 393, size: 6.5, font: bold, color: colors.gold });
    if (project.upcoming.length) {
      project.upcoming.slice(0, 3).forEach((item, index) => {
        const rowY = 361 - index * 42;
        page.drawRectangle({ x: margin, y: rowY - 24, width: pageSize[0] - margin * 2, height: 37, color: index % 2 ? colors.paper : colors.shell });
        page.drawText(ascii(item.name).slice(0, 43), { x: margin + 12, y: rowY, size: 8, font: bold, color: colors.ink });
        page.drawText(`${ascii(item.developer)} | ${ascii(item.handover)}`.slice(0, 50), { x: margin + 12, y: rowY - 12, size: 6, font: regular, color: colors.muted });
        page.drawText(item.distanceKm === null ? "SAME AREA" : `APPROX. ${item.distanceKm.toFixed(1)} KM`, { x: pageSize[0] - margin - 78, y: rowY - 4, size: 5.8, font: bold, color: colors.gold });
      });
    } else {
      drawWrapped(page, "No distinct upcoming project record matched the same-area or 10 km screen in the current PSR index. This does not prove that no other supply exists.", regular, 9.5, margin, 350, pageSize[0] - margin * 2, colors.muted, 14, 5);
    }
    const comparisonChart: ReportChart = {
      title: "Unit pricing position",
      subtitle: project.areaBenchmark ? `${project.areaBenchmark.label} - ${project.areaBenchmark.period}` : "No published area benchmark stored",
      unit: "AED per sqft",
      kind: "bars",
      data: project.areaBenchmark ? [
        { label: "Selected unit", value: Math.round(project.unitPricePerSqft), display: Math.round(project.unitPricePerSqft).toLocaleString("en-AE") },
        { label: project.areaBenchmark.label, value: project.areaBenchmark.value, display: project.areaBenchmark.value.toLocaleString("en-AE") },
      ] : [{ label: "Selected unit", value: Math.round(project.unitPricePerSqft), display: Math.round(project.unitPricePerSqft).toLocaleString("en-AE") }],
      sourceLabel: project.areaBenchmark?.sourceLabel || "Saved unit scenario inputs",
      sourceUrl: project.areaBenchmark?.sourceUrl || "",
    };
    drawChart(page, comparisonChart, margin, 72, pageSize[0] - margin * 2, 160, regular, bold, colors);
    addFooter(page);

    page = addPage("Advisory valuation frame", `${project.location}: community and ${incomeEligible ? "rental" : "acquisition"} evidence`);
    page.drawRectangle({ x: margin, y: 590, width: pageSize[0] - margin * 2, height: 84, color: colors.ink });
    page.drawText("INVESTMENT-FIT SCREEN", { x: margin + 18, y: 648, size: 6.5, font: bold, color: colors.gold });
    page.drawText(`${project.advisoryScreen.total}/100`, { x: margin + 18, y: 614, size: 26, font: bold, color: colors.white });
    page.drawText(ascii(project.advisoryScreen.label).toUpperCase(), { x: margin + 145, y: 638, size: 9, font: bold, color: colors.gold });
    drawWrapped(page, project.advisoryScreen.statement, regular, 7, margin + 145, 619, pageSize[0] - margin * 2 - 165, rgb(.8, .79, .74), 10, 3);

    page.drawText("WEIGHTED FACTORS", { x: margin, y: 564, size: 6.5, font: bold, color: colors.gold });
    project.advisoryScreen.factors.forEach((factor, index) => {
      const factorY = 540 - index * 36;
      page.drawText(ascii(factor.label).slice(0, 28), { x: margin, y: factorY, size: 7.2, font: bold, color: colors.ink });
      page.drawText(`${factor.weight}% weight`, { x: margin + 120, y: factorY, size: 5.6, font: regular, color: colors.muted });
      page.drawRectangle({ x: margin + 190, y: factorY - 1, width: 205, height: 6, color: rgb(.84, .82, .76) });
      page.drawRectangle({ x: margin + 190, y: factorY - 1, width: 205 * factor.score / 100, height: 6, color: colors.gold });
      page.drawText(String(factor.score), { x: pageSize[0] - margin - 25, y: factorY, size: 6.5, font: bold, color: colors.ink });
      drawWrapped(page, factor.rationale, regular, 5.4, margin, factorY - 12, pageSize[0] - margin * 2, colors.muted, 6.6, 2);
    });

    const evidenceChart: ReportChart = incomeEligible ? {
      title: "Annual rent sensitivity",
      subtitle: `${project.bedroom} | advisor-editable cases`,
      unit: "AED",
      kind: "columns",
      data: [
        { label: "Low", value: project.annualRentLow, display: Math.round(project.annualRentLow).toLocaleString("en-AE") },
        { label: "Expected", value: project.annualRent, display: Math.round(project.annualRent).toLocaleString("en-AE") },
        { label: "High", value: project.annualRentHigh, display: Math.round(project.annualRentHigh).toLocaleString("en-AE") },
      ],
      sourceLabel: "Saved scenario sensitivity inputs",
      sourceUrl: "",
    } : {
      title: "Acquisition cost frame",
      subtitle: `${project.bedroom} | current unit confirmation required`,
      unit: "AED",
      kind: "columns",
      data: [
        { label: "Unit price", value: project.unitPrice, display: Math.round(project.unitPrice).toLocaleString("en-AE") },
        { label: "Fees", value: project.acquisitionCosts, display: Math.round(project.acquisitionCosts).toLocaleString("en-AE") },
        { label: "All-in", value: project.allInCost, display: Math.round(project.allInCost).toLocaleString("en-AE") },
      ],
      sourceLabel: "Saved acquisition-cost scenario",
      sourceUrl: "",
    };
    drawChart(page, evidenceChart, margin, 78, 239, 245, regular, bold, colors);

    page.drawText(incomeEligible ? "RENTAL OPERATING CASE" : "ACQUISITION AND DELIVERY", { x: margin + 263, y: 321, size: 6.5, font: bold, color: colors.gold });
    const rentalRows = incomeEligible ? [
      ["Planning occupancy", `${project.occupancyRate.toFixed(1)}%`],
      ["Effective annual rent", money(project.effectiveAnnualRent)],
      ["Rent per sqft / year", `AED ${project.annualRentPerSqft.toFixed(0)}`],
      ["Occupancy-adjusted net ROI", percent(project.effectiveNetYield)],
    ] : [
      ["Payment plan", project.paymentPlan],
      ["Handover", project.handover],
      ["DLD treatment", dldLine?.display || "4% costed"],
      ["All-in acquisition basis", money(project.allInCost)],
    ];
    rentalRows.forEach(([label, value], index) => {
      const rowY = 295 - index * 28;
      page.drawLine({ start: { x: margin + 263, y: rowY - 7 }, end: { x: pageSize[0] - margin, y: rowY - 7 }, thickness: .35, color: rgb(.78, .74, .66) });
      page.drawText(label.toUpperCase(), { x: margin + 263, y: rowY, size: 5.8, font: bold, color: colors.muted });
      page.drawText(value, { x: pageSize[0] - margin - 92, y: rowY, size: 7.2, font: bold, color: colors.ink });
    });
    page.drawText("DEMAND AND DEMOGRAPHIC CONTEXT", { x: margin + 263, y: 172, size: 6.2, font: bold, color: colors.gold });
    drawWrapped(
      page,
      `${project.demandSegments.join(" | ")}. ${project.demographicContext
        ? `${project.demographicContext.display}; ${project.demographicContext.scope}.`
        : "No official community-level demographic series is embedded."}`,
      regular,
      6.4,
      margin + 263,
      154,
      pageSize[0] - margin * 2 - 263,
      colors.muted,
      8.5,
      5,
    );
    page.drawText(incomeEligible ? "RENTAL EVIDENCE NOTE" : "UNIT VERIFICATION NOTE", { x: margin + 263, y: 100, size: 6.2, font: bold, color: colors.gold });
    drawWrapped(
      page,
      incomeEligible ? (project.rentalEvidenceNotes || project.rentalEvidence.note) : project.confirmationNotes,
      regular,
      5.2,
      margin + 263,
      88,
      pageSize[0] - margin * 2 - 263,
      colors.muted,
      6.4,
      7,
    );
    addFooter(page);

    if (expandedHierarchy) {
      const knowledge = project.projectKnowledge;
      page = addPage("Project proposition", `${project.name}: past, present and future`);
      page.drawRectangle({ x: margin, y: 610, width: pageSize[0] - margin * 2, height: 54, color: colors.ink });
      page.drawText("PUBLISHED PROJECT POSITION", { x: margin + 14, y: 644, size: 5.8, font: bold, color: colors.gold });
      page.drawText(ascii(knowledge?.statusLabel || "Status not available"), { x: margin + 14, y: 625, size: 8.5, font: bold, color: colors.white });
      drawWrapped(page, knowledge?.releaseNote || "No separate release note is stored. Confirm current sales status, inventory and availability directly with the developer before reservation.", regular, 5.7, margin + 175, 644, pageSize[0] - margin * 2 - 190, rgb(.8, .79, .74), 6.7, 5);

      page.drawText("PROJECT LIFECYCLE", { x: margin, y: 590, size: 6.2, font: bold, color: colors.gold });
      (["past", "present", "future"] as const).forEach((period, index) => {
        const gap = 11;
        const cardWidth = (pageSize[0] - margin * 2 - gap * 2) / 3;
        const x = margin + index * (cardWidth + gap);
        page.drawRectangle({ x, y: 448, width: cardWidth, height: 122, color: index === 1 ? colors.ink : colors.shell });
        page.drawText(period.toUpperCase(), { x: x + 11, y: 547, size: 5.8, font: bold, color: colors.gold });
        drawWrapped(page, project.lifecycle[period], regular, 5.3, x + 11, 530, cardWidth - 22, index === 1 ? colors.white : colors.ink, 6.3, 13);
      });

      page.drawText("PROJECT KNOWLEDGE", { x: margin, y: 423, size: 6.2, font: bold, color: colors.gold });
      drawWrapped(page, knowledge?.overview.join(" ") || "The current catalogue does not include an expanded source-backed project overview. Use the unit facts and request the latest developer documents.", regular, 6.5, margin, 405, pageSize[0] - margin * 2, colors.ink, 8.3, 5);

      const listTop = 344;
      page.drawText("INVESTMENT POINTS TO TEST", { x: margin, y: listTop, size: 5.8, font: bold, color: colors.gold });
      (knowledge?.investmentPoints || []).slice(0, 4).forEach((item, index) => {
        const itemY = listTop - 23 - index * 34;
        page.drawCircle({ x: margin + 3, y: itemY + 3, size: 1.8, color: colors.gold });
        drawWrapped(page, item, regular, 5.5, margin + 12, itemY + 6, 226, colors.ink, 6.7, 4);
      });
      if (!knowledge?.investmentPoints.length) {
        drawWrapped(page, "No source-backed investment-point list is stored.", regular, 5.7, margin, listTop - 23, 226, colors.muted, 7, 2);
      }

      page.drawText("AMENITIES AND PRODUCT", { x: margin + 251, y: listTop, size: 5.8, font: bold, color: colors.gold });
      (knowledge?.amenities || []).slice(0, 7).forEach((item, index) => {
        const x = margin + 251 + (index % 2) * 116;
        const itemY = listTop - 24 - Math.floor(index / 2) * 29;
        page.drawRectangle({ x, y: itemY - 5, width: 108, height: 21, color: colors.shell });
        drawWrapped(page, item, bold, 5.1, x + 8, itemY + 7, 92, colors.ink, 5.8, 2);
      });
      if (!knowledge?.amenities.length) {
        drawWrapped(page, "No source-backed amenity list is stored.", regular, 5.7, margin + 251, listTop - 23, 239, colors.muted, 7, 2);
      }

      page.drawText("PUBLISHED UNIT RANGE", { x: margin, y: 187, size: 5.8, font: bold, color: colors.gold });
      const pricingRows = knowledge?.unitPricing.slice(0, 4) || [];
      pricingRows.forEach((item, index) => {
        const rowY = 161 - index * 25;
        page.drawRectangle({ x: margin, y: rowY - 8, width: pageSize[0] - margin * 2, height: 21, color: index % 2 ? colors.paper : colors.shell });
        page.drawText(ascii(item.residence).slice(0, 48), { x: margin + 9, y: rowY, size: 5.8, font: bold, color: colors.ink });
        page.drawText(ascii(item.size || "Size not available").slice(0, 28), { x: 330, y: rowY, size: 5.2, font: regular, color: colors.muted });
        page.drawText(ascii(item.startingPrice).slice(0, 22), { x: pageSize[0] - margin - 93, y: rowY, size: 5.6, font: bold, color: colors.gold });
      });
      if (!pricingRows.length) {
        drawWrapped(page, "No published unit-range table is stored. The selected unit assumptions above remain planning scenarios and require advisor review before use.", regular, 5.7, margin, 161, pageSize[0] - margin * 2, colors.muted, 7, 3);
      }
      page.drawText(`${ascii(knowledge?.sourceLabel || "PSR project catalogue")} | ${ascii(knowledge?.verifiedAt || project.catalogueUpdatedAt || "verification date not stored")}`.slice(0, 120), { x: margin, y: 57, size: 5, font: regular, color: colors.muted });
      addFooter(page);
    }
    }

    const mediaPages = projectMediaPages[projectIndex] || [];
    for (const mediaPage of mediaPages) {
      page = addPage("Project media", `${project.name}: ${mediaPage.label}${mediaPage.part > 1 ? ` ${mediaPage.part}` : ""}`);
      drawWrapped(
        page,
        mediaPage.contain
          ? project.floorplanQualification || (compactProjectModules
            ? "Floor plans are shown contain-fit so the stored layout remains visible. The lower panel separates the unit-price cap from estimated acquisition and annual ownership costs. Confirm dimensions, charges and the developer-stamped plan."
            : "Floor plans are shown in contain-fit so the full stored layout remains visible. Dimensions, scale, orientation, unit code and final specifications must be confirmed against the latest developer-stamped document.")
          : `${mediaPage.label} imagery is grouped by its stored project-media role. Images support visual review only; final specifications, finishes, views and delivered condition must be confirmed against current developer documents.`,
        regular,
        7.2,
        margin,
        664,
        pageSize[0] - margin * 2,
        colors.muted,
        10,
        3,
      );
      mediaPage.sources.forEach((source, index) => {
        const cellWidth = 239;
        const cellHeight = 178;
        const x = margin + (index % 2) * 251;
        const y = 438 - Math.floor(index / 2) * 230;
        if (mediaPage.contain) drawContainedImage(page, images.get(source), x, y, cellWidth, cellHeight, colors.white, colors.ink, colors.gold);
        else drawImageOrGraphic(page, images.get(source), x, y, cellWidth, cellHeight, colors.ink, colors.gold);
        page.drawRectangle({ x, y: y - 34, width: cellWidth, height: 34, color: colors.shell });
        page.drawText(fitSingleLine(`${mediaPage.label.toUpperCase()} ${String((mediaPage.part - 1) * (compactProjectModules && mediaPage.contain ? 2 : 4) + index + 1).padStart(2, "0")}`, bold, 5.4, cellWidth - 22), { x: x + 11, y: y - 15, size: 5.4, font: bold, color: colors.gold });
        let sourceType = "PSR catalogue project asset";
        if (!source.startsWith("/")) {
          try {
            sourceType = new URL(source).hostname.replace(/^www\./, "");
          } catch {
            sourceType = "Approved project media source";
          }
        }
        const reference = project.floorplanReferences?.find(item => item.url === source);
        const referenceCaption = reference
          ? `${reference.layout} | ${reference.areaSqft ? `${reference.areaSqft} sqft | ` : ""}${new URL(reference.sourceUrl).hostname.replace(/^www\./, "")}`
          : sourceType;
        page.drawText(fitSingleLine(ascii(referenceCaption), regular, 5.4, cellWidth - 22), { x: x + 11, y: y - 27, size: 5.4, font: regular, color: colors.muted });
      });
      if (compactProjectModules && mediaPage.contain) {
        page.drawText("PAYMENT SCHEDULE", { x: margin, y: 369, size: 6.1, font: bold, color: colors.gold });
        if (project.paymentSchedule.length) {
          project.paymentSchedule.slice(0, 5).forEach((item, index) => {
            const rowY = 346 - index * 24;
            page.drawLine({ start: { x: margin, y: rowY - 7 }, end: { x: margin + 232, y: rowY - 7 }, thickness: .35, color: rgb(.78, .74, .66) });
            page.drawText(fitSingleLine(`${item.percentage}% ${item.label.toUpperCase()}`, bold, 5.2, 128), { x: margin, y: rowY, size: 5.2, font: bold, color: colors.muted });
            page.drawText(money(item.amount), { x: margin + 142, y: rowY, size: 6.4, font: bold, color: colors.ink });
          });
        } else {
          drawWrapped(page, "A structured payment split is not stored for this resale or assignment case. Reconcile the seller or developer ledger before comparison.", regular, 6.2, margin, 344, 226, colors.muted, 8.2, 6);
        }

        page.drawText("FEES AND OWNERSHIP COSTS", { x: margin + 251, y: 369, size: 6.1, font: bold, color: colors.gold });
        const feeRows = [
          ...project.acquisitionCostBreakdown.map((item) => [item.label, item.display || money(item.amount)] as [string, string]),
          ["Acquisition-cost allowance", money(project.acquisitionCosts)] as [string, string],
          ["Modelled acquisition basis", money(project.allInCost)] as [string, string],
          ["Annual service charge", money(project.annualServiceCharge)] as [string, string],
          ["Other annual costs", money(project.otherAnnualCosts)] as [string, string],
        ].slice(0, 8);
        feeRows.forEach(([label, value], index) => {
          const rowY = 346 - index * 18;
          page.drawLine({ start: { x: margin + 251, y: rowY - 5 }, end: { x: pageSize[0] - margin, y: rowY - 5 }, thickness: .3, color: rgb(.78, .74, .66) });
          page.drawText(fitSingleLine(label.toUpperCase(), bold, 4.8, 132), { x: margin + 251, y: rowY, size: 4.8, font: bold, color: colors.muted });
          page.drawText(value, { x: pageSize[0] - margin - 86, y: rowY, size: 5.9, font: bold, color: colors.ink });
        });
        drawWrapped(page, "DLD / Oqood is modelled at 4%; credit a developer discount only when it is written into the booking form. Parking and handover / connection charges remain NOT PUBLISHED where no project invoice is stored. Mortgage, financing and furnishing remain excluded unless stated.", regular, 5.2, margin + 251, 188, 239, colors.muted, 6.4, 7);
      }
      addFooter(page);
    }
  });

  // Recommendation and action page.
  page = addPage("Client decision", "Recommendations");
  let recommendationY = drawWrapped(page, content.recommendation, regular, 10, margin, 655, pageSize[0] - margin * 2, colors.ink, 15, 10) - 20;
  page.drawText("MARKET POSITION", { x: margin, y: recommendationY, size: 6.5, font: bold, color: colors.gold });
  recommendationY = drawWrapped(page, content.marketPosition, regular, 9.2, margin, recommendationY - 24, pageSize[0] - margin * 2, colors.ink, 14, 7) - 18;
  page.drawText("NEXT ACTIONS", { x: margin, y: recommendationY - 3, size: 6.5, font: bold, color: colors.gold });
  recommendationY -= 31;
  content.nextSteps.slice(0, 4).forEach((item, index) => {
    page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: recommendationY, size: 7, font: bold, color: colors.gold });
    recommendationY = drawWrapped(page, item, regular, 8.5, margin + 28, recommendationY + 3, pageSize[0] - margin * 2 - 28, colors.ink, 12, 3) - 8;
  });
  const residency = content.residencyGuidance;
  if (residency) {
    page.drawRectangle({ x: margin, y: 176, width: pageSize[0] - margin * 2, height: 104, color: colors.shell, borderColor: colors.gold, borderWidth: .6 });
    page.drawText("RESIDENCY PLANNING", { x: margin + 16, y: 258, size: 6.2, font: bold, color: colors.gold });
    page.drawText(ascii(residency.title), { x: margin + 16, y: 239, size: 10, font: bold, color: colors.ink });
    page.drawText(ascii(residency.threshold), { x: margin + 16, y: 224, size: 6.5, font: bold, color: colors.gold });
    page.drawText(ascii(residency.status).slice(0, 108), { x: margin + 16, y: 209, size: 6.7, font: regular, color: colors.ink });
    drawWrapped(page, residency.summary, regular, 6.2, margin + 16, 192, pageSize[0] - margin * 2 - 32, colors.muted, 8, 2);
  }
  page.drawRectangle({ x: margin, y: 62, width: pageSize[0] - margin * 2, height: 100, color: colors.ink });
  if (advisorProfilePortrait && (portraitPlacement === "all" || portraitPlacement === "cover-profile-and-closing")) {
    drawCircularImage(page, advisorProfilePortrait, margin + 43, 112, 29, colors.gold);
  } else {
    const initials = (content.advisor?.name || "PSR Advisor").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    page.drawCircle({ x: margin + 43, y: 112, size: 29, color: colors.shell, borderColor: colors.gold, borderWidth: .5 });
    page.drawText(initials, { x: margin + 32, y: 105, size: 14, font: displayBold, color: colors.ink });
  }
  const closingAdvisorX = margin + 91;
  page.drawText(ascii(content.advisor?.name || "PSR Advisor"), { x: closingAdvisorX, y: 136, size: 11, font: bold, color: colors.white });
  page.drawText(ascii(content.advisor?.title || "Property Advisor"), { x: closingAdvisorX, y: 120, size: 6.5, font: regular, color: colors.gold });
  const closingProfile = content.advisor?.languages?.length
    ? `${content.advisor.languages.join(" | ")} | ${content.advisor.specialties?.slice(0, 2).join(" | ") || "UAE property advisory"}`
    : content.advisor?.specialties?.slice(0, 3).join(" | ") || "Evidence-led UAE property advisory";
  drawWrapped(page, closingProfile, regular, 5.4, closingAdvisorX, 104, 188, rgb(.78, .77, .72), 6.4, 2);
  page.drawText("Reply directly to continue the unit review.", { x: closingAdvisorX, y: 78, size: 5.8, font: regular, color: rgb(.78, .77, .72) });
  page.drawText(ascii(content.advisor?.phone || ""), { x: margin + 330, y: 132, size: 6.8, font: bold, color: colors.white });
  page.drawText(ascii(content.advisor?.email || ""), { x: margin + 330, y: 115, size: 6.2, font: regular, color: colors.gold });
  page.drawText(`${PSR_REPORT_COMPANY.website} | ORN ${PSR_REPORT_COMPANY.orn}`, { x: margin + 330, y: 87, size: 5.4, font: regular, color: rgb(.78, .77, .72) });
  addFooter(page);

  // Confirmation, methodology and sources.
  const confirmationTitle = content.confirmation?.title || "Confirmation record";
  page = addPage("Appendix", `${confirmationTitle}, methodology and sources`);
  page.drawText(ascii(confirmationTitle).toUpperCase(), { x: margin, y: 660, size: 6.5, font: bold, color: colors.gold });
  page.drawRectangle({ x: margin, y: 555, width: pageSize[0] - margin * 2, height: 84, color: colors.shell });
  drawWrapped(page, content.confirmation?.statement || "", regular, 8.2, margin + 17, 613, pageSize[0] - margin * 2 - 34, colors.ink, 12, 5);
  page.drawText(`${ascii(content.confirmation?.byline || "Confirmed by")} ${ascii(content.confirmation?.confirmedBy || content.advisor?.email || "")}`, { x: margin + 17, y: 570, size: 6.2, font: bold, color: colors.gold });
  page.drawText("METHODOLOGY", { x: margin, y: 522, size: 6.5, font: bold, color: colors.gold });
  const methodology = [
    "Yield calculations use the inputs saved with this report. Gross yield equals expected annual rent divided by unit price. Net yield deducts entered recurring costs from rent and divides by the all-in acquisition basis. The occupancy-adjusted case applies the entered occupancy percentage before recurring costs.",
    "The investment-fit screen weights value versus area 25%, rental return 25%, accessibility 20%, demand depth 15%, supply balance 10% and evidence quality 5%. It is a transparent advisory screen, not a formal, lender or RERA valuation.",
    "Distances use published project and destination coordinates. The supply screen uses active index records in the same area or approximately 10 km. Confirm routes, traffic, access gates and the complete planning-authority pipeline.",
    "Market charts retain their original period and definition. Stored observations retain scope, source, observation date and freshness window. 'Live' means inside that source-specific window, not a streaming price; citywide activity is never presented as a selected-building transaction.",
  ];
  let methodY = 496;
  methodology.forEach((item, index) => {
    page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: methodY, size: 6.2, font: bold, color: colors.gold });
    methodY = drawWrapped(page, item, regular, 7.1, margin + 25, methodY + 2, pageSize[0] - margin * 2 - 25, colors.ink, 10, 5) - 9;
  });
  page.drawText("PROJECT DATA CURRENCY", { x: margin, y: methodY - 1, size: 6.5, font: bold, color: colors.gold });
  let currencyY = methodY - 24;
  content.projects.slice(0, 6).forEach((project, index) => {
    const date = project.catalogueUpdatedAt
      ? new Date(project.catalogueUpdatedAt).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" })
      : "date not recorded";
    page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: currencyY, size: 5.8, font: bold, color: colors.gold });
    currencyY = drawWrapped(page, `${project.name}: catalogue checked ${date}; unit facts and scenarios are saved planning inputs and require named-advisor review before client issue.`, regular, 6.2, margin + 24, currencyY + 1, pageSize[0] - margin * 2 - 24, colors.muted, 8.2, 2) - 5;
  });
  page.drawText("SOURCES", { x: margin, y: currencyY - 1, size: 6.5, font: bold, color: colors.gold });
  let sourceY = currencyY - 24;
  sourceItems.slice(0, 6).forEach((source, index) => {
    page.drawText(String(index + 1).padStart(2, "0"), { x: margin, y: sourceY, size: 5.8, font: bold, color: colors.gold });
    sourceY = drawWrapped(page, source.url ? `${source.label}: ${source.url}` : source.label, regular, 6.2, margin + 24, sourceY + 1, pageSize[0] - margin * 2 - 24, colors.muted, 8.2, 3) - 6;
  });
  page.drawRectangle({ x: margin, y: 67, width: pageSize[0] - margin * 2, height: 61, borderColor: colors.gold, borderWidth: .7 });
  drawWrapped(page, "Important: This curated brief is an advisory presentation, not a binding offer, valuation, legal opinion or return guarantee. Reconfirm availability, price, area, fees, finance terms, rent evidence and completion dates against current transaction documents before commitment.", regular, 6.6, margin + 14, 109, pageSize[0] - margin * 2 - 28, colors.muted, 9, 5);
  addFooter(page);

  const continuationEntries = [
    ...content.projects.slice(6).map((project, index) => {
      const date = project.catalogueUpdatedAt
        ? new Date(project.catalogueUpdatedAt).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" })
        : "date not recorded";
      return {
        label: `PROJECT ${String(index + 7).padStart(2, "0")}`,
        text: `${project.name}: catalogue checked ${date}; unit facts and scenarios are saved planning inputs and require named-advisor review before client issue.`,
      };
    }),
    ...sourceItems.slice(6).map((source, index) => ({
      label: `SOURCE ${String(index + 7).padStart(2, "0")}`,
      text: source.url ? `${source.label}: ${source.url}` : source.label,
    })),
  ];
  for (let appendixIndex = 0; appendixIndex < appendixContinuationCount; appendixIndex += 1) {
    page = addPage("Evidence register", `Project currency and sources ${appendixIndex + 2}`);
    let entryY = 650;
    continuationEntries.slice(appendixIndex * 12, (appendixIndex + 1) * 12).forEach((entry) => {
      page.drawText(entry.label, { x: margin, y: entryY, size: 5.8, font: bold, color: colors.gold });
      drawWrapped(page, entry.text, regular, 6.4, margin + 66, entryY + 1, pageSize[0] - margin * 2 - 66, colors.ink, 8.5, 3);
      page.drawLine({ start: { x: margin + 66, y: entryY - 31 }, end: { x: pageSize[0] - margin, y: entryY - 31 }, thickness: .3, color: rgb(.78, .74, .66) });
      entryY -= 47;
    });
    drawWrapped(page, "Source links identify the dated evidence used by the report. Project availability, exact unit documents, current transactions and comparable leasing evidence still require advisor verification at the time of presentation.", regular, 6.6, margin, 82, pageSize[0] - margin * 2, colors.muted, 9, 3);
    addFooter(page);
  }

  pdf.setTitle(`${document.title} | PSR Homes`);
  pdf.setAuthor(PSR_REPORT_COMPANY.legalName);
  pdf.setSubject("PSR curated UAE property advisory brief");
  pdf.setCreator(PSR_REPORT_COMPANY.legalName);
  pdf.setProducer(PSR_REPORT_COMPANY.legalName);
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function curatedBriefFilename(document: { title: string }) {
  const stem = document.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "psr-homes-curated-brief";
  return `psr-homes-${stem}.pdf`;
}
