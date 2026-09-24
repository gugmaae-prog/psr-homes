import { emirateProfiles, type EmirateProfile, type EmirateSlug } from "@/data/emirates";
import { emirateMarketOverviews, type EmirateMarketOverview } from "@/data/emirate-market-overviews";
import projectMediaData from "@/data/project-media-overrides.json";
import { curatedLaunches } from "@/data/curated-launches";
import { getProjectRegistry, getUniqueActiveProjectRecords, type RegistryProject } from "@/lib/imported-projects";
import { DEFAULT_PROPERTY_PHOTO, filterPhotographyAssets } from "@/lib/media-policy";
import { projectFinanceStatus } from "@/lib/project-finance-status";

export type EmirateProjectShowcase = {
  project: RegistryProject;
  media: string[];
  mediaCount: number;
};

export type EmirateUpcomingProject = {
  project: RegistryProject;
  image: string;
};

export type EmiratePageModel = EmirateProfile & EmirateMarketOverview & {
  activeProjects: number;
  indexedProjects: number;
  developers: string[];
  communities: string[];
  propertyTypes: string[];
  projects: RegistryProject[];
};

type ProjectMediaOverride = {
  gallery?: string[];
  interiors?: string[];
  exteriors?: string[];
  hero?: string;
};

const mediaOverrides = projectMediaData as Record<string, ProjectMediaOverride>;
const curatedBySlug = new Map(curatedLaunches.map((project) => [project.slug, project]));

const featuredUpcomingProjectSlugs: Record<EmirateSlug, readonly string[]> = {
  dubai: [
    "arancia-yards-beyond-city-of-arabia-dubai",
    "avenue-park-towers-ii-wasl-1-al-kifaf-dubai",
    "binghatti-wraith-al-jaddaf-dubai",
  ],
  "abu-dhabi": [
    "the-canopies-yas-point-aldar-yas-island-abu-dhabi",
    "apartments-muheira-maysan-abu-dhabi",
    "nawayef-park-views-modon-properties-hudayriyat-island-abu-dhabi",
  ],
  sharjah: [
    "masaar-3-arada-sharjah-uae",
    "jenna-1-arada-aljada-sharjah",
    "the-gate-6-arada-aljada-sharjah",
  ],
  "ras-al-khaimah": [
    "edge-rak-properties-raha-island-mina-ras-al-khaimah",
    "mira-coral-bay-al-mairid-ras-al-khaimah",
  ],
  ajman: ["gateway-porto-al-zorah-by-solidere-international-in-al-zorah-ajman"],
  fujairah: ["oceana-by-reportage-fujairah-uae"],
  "umm-al-quwain": [
    "tranquil-beach-residences-sobha-siniya-island-uaq",
    "apartments-aya-deyaar-umm-al-quwain",
  ],
};

function bySlug(slug: string) {
  return emirateProfiles.find((profile) => profile.slug === slug) || null;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function priceValue(project: RegistryProject) {
  const value = Number(String(project.startingPrice || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function mediaForProject(project: RegistryProject) {
  const curated = curatedBySlug.get(project.slug);
  const override = mediaOverrides[project.slug];
  const candidates = curated
    ? [curated.image, ...curated.gallery, ...curated.exteriors, ...curated.interiors]
    : [override?.hero || "", ...(override?.gallery || []), ...(override?.exteriors || []), ...(override?.interiors || []), project.image];
  return filterPhotographyAssets(candidates)
    .filter((src) => src !== DEFAULT_PROPERTY_PHOTO)
    .slice(0, 5);
}

function projectMediaScore(project: RegistryProject) {
  const curated = curatedBySlug.get(project.slug);
  const override = mediaOverrides[project.slug];
  const curatedCount = curated ? filterPhotographyAssets([curated.image, ...curated.gallery, ...curated.exteriors, ...curated.interiors]).length : 0;
  const overrideCount = override ? filterPhotographyAssets([override.hero || "", ...(override.gallery || []), ...(override.exteriors || []), ...(override.interiors || [])]).length : 0;
  return Math.max(curatedCount, overrideCount);
}

function upcomingProjectOrder(project: RegistryProject) {
  const year = Number(project.handover.match(/20\d{2}/)?.[0] || 9999);
  const quarter = Number(project.handover.match(/\bQ([1-4])\b/i)?.[1] || 4);
  return year * 10 + quarter;
}

function isUpcomingProject(project: RegistryProject, now = new Date()) {
  if (project.archived) return false;
  const status = `${project.statusLabel || ""} ${project.handover || ""}`;
  if (/\b(?:ready|completed|complete|handed over|sold out)\b/i.test(status)) return false;
  if (/\b(?:upcoming|launch(?:ing)?|off[- ]plan|under construction|pre[- ]launch|announced)\b/i.test(project.statusLabel || "")) return true;
  if (!/20\d{2}/.test(project.handover)) return false;
  return projectFinanceStatus(project.handover, project.statusLabel, now) === "off-plan";
}

export function getEmirateProfiles() {
  const registry = getProjectRegistry();
  return emirateProfiles.map((profile) => {
    const projects = registry.projects.filter((project) => project.emirate === profile.name);
    const marketOverview = emirateMarketOverviews[profile.slug];
    return {
      ...profile,
      ...marketOverview,
      heroImage: marketOverview.cover.src,
      activeProjects: projects.filter((project) => !project.archived).length,
      indexedProjects: projects.length,
      developers: uniqueSorted(projects.map((project) => project.developerDisplay || project.developer)),
      communities: uniqueSorted(projects.map((project) => project.area)),
      propertyTypes: uniqueSorted(projects.flatMap((project) => project.propertyTypes)),
      projects,
    } satisfies EmiratePageModel;
  });
}

export function getEmirateProfile(slug: string) {
  const profile = bySlug(slug);
  if (!profile) return null;
  return getEmirateProfiles().find((candidate) => candidate.slug === profile.slug) || null;
}

export function getEmirateProjectShowcase(profile: EmiratePageModel, limit = 6): EmirateProjectShowcase[] {
  return getUniqueActiveProjectRecords(profile.projects)
    .map((project) => ({ project, score: projectMediaScore(project), media: mediaForProject(project) }))
    .filter(({ media }) => media.length)
    .sort((a, b) => b.score - a.score || priceValue(a.project) - priceValue(b.project) || a.project.name.localeCompare(b.project.name))
    .slice(0, limit)
    .map(({ project, media }) => ({ project, media, mediaCount: media.length }));
}

export function getEmirateUpcomingProjects(profile: EmiratePageModel, limit = 3, now = new Date()): EmirateUpcomingProject[] {
  const preferred = featuredUpcomingProjectSlugs[profile.slug] || [];
  const preferredOrder = new Map(preferred.map((slug, index) => [slug, index]));
  const publicProjects = getUniqueActiveProjectRecords(profile.projects);
  const eligible = publicProjects.filter((project) => isUpcomingProject(project, now));
  const preferredProjects = publicProjects
    .filter((project) => preferredOrder.has(project.slug) && isUpcomingProject(project, now))
    .sort((a, b) => (preferredOrder.get(a.slug) ?? 999) - (preferredOrder.get(b.slug) ?? 999));
  const fallbacks = eligible
    .filter((project) => !preferredOrder.has(project.slug))
    .sort((a, b) => projectMediaScore(b) - projectMediaScore(a) || upcomingProjectOrder(a) - upcomingProjectOrder(b) || a.name.localeCompare(b.name));

  return [...preferredProjects, ...fallbacks]
    .flatMap((project) => {
      const image = mediaForProject(project)[0];
      return image ? [{ project, image }] : [];
    })
    .slice(0, limit);
}
