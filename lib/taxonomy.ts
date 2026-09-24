import { getProjectRegistry, type RegistryProject } from "@/lib/imported-projects";
import { getAreaPricePerSqft, type PricePerSqft } from "@/lib/market-pricing";
import { buildDeveloperAliasMap, canonicalDeveloperOptions, rawDeveloperSlug } from "@/lib/developer-identity";
import { curatedCommunityGuides } from "@/data/curated-communities";
import { selectPhotographyAsset } from "@/lib/media-policy";
import { reviewedDeveloperImages } from "@/lib/reviewed-project-media";

export type CommunityProfile = {
  slug: string;
  name: string;
  emirate: string;
  image: string;
  projects: RegistryProject[];
  activeProjects: number;
  developers: string[];
  propertyTypes: string[];
  pricePerSqft: PricePerSqft | null;
  descriptor: string;
  overview: string;
  source?: {
    label: string;
    url: string;
    verifiedAt: string;
  };
};

export type DeveloperProfile = {
  slug: string;
  name: string;
  image: string;
  thumbnail: string;
  flagship: string;
  projects: RegistryProject[];
  activeProjects: number;
  emirates: string[];
  communities: string[];
  propertyTypes: string[];
  descriptor?: string;
  overview?: string;
  focus?: string[];
  website?: string;
};

const editorialCommunities: Record<string, { descriptor: string; overview: string }> = {
  "palm-jumeirah": {
    descriptor: "Island living",
    overview: "Palm Jumeirah combines private beachfront living, internationally recognised hospitality and a limited supply of waterfront addresses. Compare position, aspect, beach access and service structure before comparing price alone.",
  },
  "dubai-marina": {
    descriptor: "Waterfront energy",
    overview: "Dubai Marina is a dense, walkable waterfront market shaped by tower quality, marina aspect, access and building management. The strongest opportunities balance view protection, practical layouts and proven end-user demand.",
  },
  "dubai-hills-estate": {
    descriptor: "Green city living",
    overview: "Dubai Hills Estate brings parks, schools, golf and retail into a connected master community. Apartment and villa submarkets behave differently, making phase, proximity and future supply essential parts of any investment review.",
  },
  "business-bay": {
    descriptor: "Central city market",
    overview: "Business Bay sits between Downtown Dubai, the canal and the city’s commercial core. Building quality varies significantly, so the investment case depends on developer delivery, immediate surroundings, layout efficiency and completion timing.",
  },
  "dubai-creek-harbour": {
    descriptor: "Emerging waterfront district",
    overview: "Dubai Creek Harbour is a large-scale waterfront district with a long development horizon. Buyers should assess the specific precinct, view corridor, delivery sequence and how each residence fits the broader master plan.",
  },
  "al-marjan-island": {
    descriptor: "Resort-led island growth",
    overview: "Al Marjan Island is a resort and branded-residence market in Ras Al Khaimah. Operator quality, beach relationship, service charges and realistic occupancy assumptions are central to evaluating each project.",
  },
  difc: {
    descriptor: "Global financial district",
    overview: "DIFC combines a mature commercial centre with a tightly supplied residential and hospitality market. Premiums are driven by walkability, service, view, branded operation and access to the district’s core.",
  },
};

/* Community pages must never inherit a branded brokerage image from an
 * imported project record. These project-owned, text-free editorial assets are
 * intentionally reused across the directory and detail hero so the two views
 * cannot drift apart. */
const communityImageOverrides: Record<string, string> = {
  "al-furjan": "/insights/green-community.jpg",
  "al-jaddaf": "/insights/business-bay-waterfront.jpg",
  "al-wasl": "/about-jumeirah-burj-banner.webp",
  "bluewaters-island": "/insights/dubai-marina-residences.webp",
  "burj-khalifa-district": "/insights/dubai-zabeel-skyline.jpg",
  "dubai-creek-harbour": "/insights/business-bay-waterfront.jpg",
  "dubai-hills-estate": "/insights/dubai-hills-residences.jpg",
  "dubai-investments-park": "/insights/green-community.jpg",
  "dubai-marina": "/insights/dubai-marina-residences.webp",
  "dubai-maritime-city": "/insights/dubai-maritime-residences.webp",
  "emirates-hills": "/insights/dubai-hills-residences.jpg",
  "expo-city-dubai": "/hero/psr-cinematic-dubai.webp",
  "jebel-ali-village": "/insights/dubai-maritime-residences.webp",
  "jumeirah-golf-estates": "/insights/green-community.jpg",
  "jumeirah-lake-towers-jlt": "/insights/dubai-marina-residences.webp",
  "jumeirah-village-circle-jvc": "/insights/dubai-hills-residences.jpg",
  "mbr-city": "/insights/dubai-zabeel-skyline.jpg",
  mudon: "/insights/green-community.jpg",
  "palm-jumeirah": "/insights/palm-branded-residence.webp",
  "port-de-la-mer": "/insights/dubai-marina-residences.webp",
  "safa-park": "/insights/business-bay-waterfront.jpg",
  "tilal-al-ghaf": "/insights/green-community.jpg",
  "za-abeel": "/insights/dubai-zabeel-skyline.jpg",
};

const approvedCommunityImages = {
  coastal: [
    "/insights/dubai-marina-residences.webp",
    "/insights/dubai-maritime-residences.webp",
    "/insights/palm-branded-residence.webp",
    "/insights/rak-resort-residence.webp",
  ],
  green: ["/insights/green-community.jpg", "/insights/dubai-hills-residences.jpg"],
  city: [
    "/insights/dubai-zabeel-skyline.jpg",
    "/insights/business-bay-waterfront.jpg",
    "/about-jumeirah-burj-banner.webp",
    "/hero/psr-cinematic-dubai.webp",
  ],
  abuDhabi: ["/insights/abu-dhabi-community.jpg"],
} as const;

function stableImage(items: readonly string[], slug: string) {
  const index = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0) % items.length;
  return items[index];
}

function communityImage(slug: string, name: string, emirate: string, importedImage: string) {
  const explicit = communityImageOverrides[slug];
  if (explicit) return explicit;
  if (!/(?:cdn\.opr\.ae|creatium\.(?:io|ru)|metropolitan)/i.test(importedImage)) return importedImage;
  const context = `${slug} ${name}`.toLowerCase();
  if (/abu dhabi|yas|saadiyat|reem|hudayriyat|raha/.test(`${context} ${emirate.toLowerCase()}`)) {
    return stableImage(approvedCommunityImages.abuDhabi, slug);
  }
  if (/island|marina|maritime|creek|harbour|harbor|water|beach|palm|port|coast|mina|marjan|hamra/.test(context)) {
    return stableImage(approvedCommunityImages.coastal, slug);
  }
  if (/hill|green|golf|park|garden|mudon|ghaf|valley|ranch|woods|oasis|acres/.test(context)) {
    return stableImage(approvedCommunityImages.green, slug);
  }
  return stableImage(approvedCommunityImages.city, slug);
}

const editorialDevelopers: Record<string, { name: string; descriptor: string; overview: string; focus: string[]; website: string }> = {
  imtiaz: {
    name: "Imtiaz Developments",
    descriptor: "Design-led Dubai developer",
    overview: "Imtiaz Developments’ UAE pipeline spans furnished urban residences and amenity-led apartment concepts across established and emerging Dubai districts. Each project should be reviewed on its individual delivery programme, specification, service structure and live unit schedule.",
    focus: ["Dubai apartment developments", "Furnished residence concepts", "DLRC pipeline", "Amenity-led urban living"],
    website: "https://imtiaz.ae/",
  },
};

const developerFlagships: Record<string, { label: string; projectSlug: string }> = {
  emaar: { label: "The Residence | Burj Khalifa", projectSlug: "emaar-the-residence-burj-khalifa-for-sale-in-downtown-dubai" },
  nakheel: { label: "Palm Jumeirah", projectSlug: "nakheel-como-residences-on-palm-jumeirah-dubai" },
  damac: { label: "Cavalli Tower", projectSlug: "damac-cavalli-tower-apartments-for-sale-in-dubai-marina" },
  sobha: { label: "Sobha Hartland", projectSlug: "skyvue-altier-sobha-hartland-2-dubai" },
  "binghatti-properties": { label: "Bugatti Residences", projectSlug: "bugatti-residences-binghatti-business-bay" },
  "ellington-properties": { label: "Ellington Beach House", projectSlug: "ellington-beach-house-apartments-on-palm-jumeirah-dubai-for-sale" },
  nshama: { label: "Town Square Dubai", projectSlug: "belmont-nshama-town-square-dubai" },
  meraas: { label: "Bluewaters", projectSlug: "meraas-bluewaters-residences" },
  arada: { label: "Aljada", projectSlug: "il-teatro-residences-1-arada-aljada" },
  aldar: { label: "Yas Island", projectSlug: "the-canopies-yas-point-aldar-yas-island-abu-dhabi" },
  "majid-al-futtaim": { label: "Tilal Al Ghaf", projectSlug: "tilal-al-ghaf-serenity-mansions-for-sale-in-dubai-by-majid-al-futtaim" },
  imtiaz: { label: "Côtier House", projectSlug: "cotier-house-imtiaz-developments-dubai-islands" },
  "rak-properties": { label: "Mina Al Arab", projectSlug: "nb-collection-by-rak-properties-on-hayat-island" },
};

/* Reviewed project-specific photographs take precedence on both directory
 * cards and detail heroes. Editorial fallbacks remain for unresolved records. */
const developerThumbnailOverrides: Record<string, string> = {
  lagoon: "/insights/business-bay-waterfront.jpg",
  golf: "/insights/dubai-hills-residences.jpg",
  jasmine: "/insights/green-community.jpg",
  falcon: "/insights/rak-resort-residence.webp",
  banyan: "/insights/dubai-marina-residences.webp",
  ahad: "/insights/business-bay-waterfront.jpg",
  "seven-tides": "/insights/palm-branded-residence.webp",
  "swiss-property": "/insights/dubai-maritime-residences.webp",
  canal: "/insights/business-bay-waterfront.jpg",
  meera: "/insights/dubai-zabeel-skyline.jpg",
  mansio: "/insights/palm-branded-residence.webp",
  mangrove: "/insights/green-community.jpg",
  "emerald-palace-group": "/insights/palm-branded-residence.webp",
  condor: "/insights/dubai-hills-residences.jpg",
  society: "/insights/dubai-zabeel-skyline.jpg",
  "naseeb-group": "/insights/dubai-hills-residences.jpg",
  leos: "/insights/green-community.jpg",
  tiger: "/insights/business-bay-waterfront.jpg",
  marriott: "/insights/business-bay-waterfront.jpg",
  "shapoorji-pallonji": "/insights/dubai-zabeel-skyline.jpg",
  "srg-holding-ltd": "/insights/dubai-maritime-residences.webp",
  signature: "/insights/dubai-hills-residences.jpg",
  mama: "/insights/business-bay-waterfront.jpg",
  medore: "/insights/dubai-marina-residences.webp",
  flamingo: "/about-jumeirah-burj-banner.webp",
  marquise: "/insights/business-bay-waterfront.jpg",
  liv: "/insights/dubai-marina-residences.webp",
  vincitore: "/insights/dubai-zabeel-skyline.jpg",
  "the-devmark-group": "/insights/dubai-maritime-residences.webp",
  "mantra-developments": "/insights/rak-resort-residence.webp",
  noora: "/insights/dubai-hills-residences.jpg",
};

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function cleanCommunityName(value: string) {
  const emirates = "Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain";
  const cleaned = value
    .replace(new RegExp(`\\s*\\((?:${emirates}) Emirate\\)\\s*$`, "i"), "")
    .replace(new RegExp(`^(?:${emirates})\\s*,\\s*`, "i"), "")
    .replace(new RegExp(`\\s*,\\s*(?:${emirates})(?:\\s+Emirate)?$`, "i"), "")
    .replace(/\s+Community$/i, "")
    .replace(/^Sharjah Emirate$/i, "Sharjah")
    .replace(/\s+/g, " ")
    .trim();
  const aliases: Record<string, string> = {
    "al-reem-island": "Al Reem Island",
    "reem-island": "Al Reem Island",
    "al-warsan-first": "Al Warsan First",
    "warsan-first": "Al Warsan First",
    "dubai-motor-city": "Dubai Motor City",
    "motor-city": "Dubai Motor City",
  };
  return aliases[slugify(cleaned)] || cleaned;
}

function legacyCommunitySlugFor(value: string) {
  const name = value.replace(/\s*\((?:Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain) Emirate\)\s*$/i, "").replace(/\s+/g, " ").trim();
  return slugify(name);
}

export function communitySlugFor(value: string) { return slugify(cleanCommunityName(value)); }

function communityEditorial(name: string, emirate: string) {
  const known = editorialCommunities[slugify(name)];
  if (known) return known;
  return {
    descriptor: `${emirate} property market`,
    overview: `${name} is represented here through verified UAE development data. Review the active project mix, participating developers, residence types, delivery horizons and price positioning before selecting a specific opportunity.`,
  };
}

let communityDirectoryCache: CommunityProfile[] | null = null;
let communityBySlugCache: Map<string, CommunityProfile> | null = null;
let communityAliasCache: Map<string, string> | null = null;

export function getCommunityDirectory(): CommunityProfile[] {
  if (communityDirectoryCache) return communityDirectoryCache;
  const groups = new Map<string, { projects: RegistryProject[]; aliases: Set<string> }>();
  for (const project of getProjectRegistry().projects) {
    const name = cleanCommunityName(project.area);
    if (!name || name.length < 3) continue;
    const baseSlug = slugify(name);
    const key = `${project.emirate}|${baseSlug}`;
    const group = groups.get(key) || { projects: [], aliases: new Set<string>() };
    group.projects.push(project);
    group.aliases.add(baseSlug);
    group.aliases.add(legacyCommunitySlugFor(project.area));
    groups.set(key, group);
  }
  const result: CommunityProfile[] = [...groups.entries()].map(([key, group]) => {
    const [emirate, baseSlug] = key.split("|");
    const projects = group.projects;
    const name = cleanCommunityName(projects[0].area);
    const editorial = communityEditorial(name, emirate);
    const active = projects.filter((project) => !project.archived);
    const importedImage = (active.find((project) => project.image) || projects.find((project) => project.image))?.image || "";
    const image = communityImage(baseSlug, name, emirate, importedImage);
    const propertyTypes = [...new Set(projects.flatMap((project) => project.propertyTypes))].sort();
    return {
      slug: baseSlug,
      name,
      emirate,
      image,
      projects: [...projects].sort((a, b) => Number(a.archived) - Number(b.archived)),
      activeProjects: active.length,
      developers: [...new Set(projects.map((project) => project.developer).filter(Boolean))].sort(),
      propertyTypes,
      pricePerSqft: getAreaPricePerSqft(name, propertyTypes, emirate),
      descriptor: editorial.descriptor,
      overview: editorial.overview,
    };
  });
  communityAliasCache = new Map();
  groups.forEach((group, key) => {
    const canonical = key.split("|")[1];
    group.aliases.forEach((alias) => {
      if (alias) communityAliasCache?.set(alias, canonical);
    });
  });

  const resultByKey = new Map(result.map((community) => [`${community.emirate}|${community.slug}`, community]));
  for (const guide of curatedCommunityGuides) {
    const key = `${guide.emirate}|${guide.slug}`;
    const existing = resultByKey.get(key);
    const source = { label: guide.sourceLabel, url: guide.sourceUrl, verifiedAt: guide.verifiedAt };
    if (existing) {
      existing.name = guide.name;
      existing.image = guide.image;
      existing.descriptor = guide.descriptor;
      existing.overview = guide.overview;
      existing.propertyTypes = [...new Set([...existing.propertyTypes, ...guide.propertyTypes])].sort();
      existing.source = source;
    } else {
      const community: CommunityProfile = {
        slug: guide.slug,
        name: guide.name,
        emirate: guide.emirate,
        image: guide.image,
        projects: [],
        activeProjects: 0,
        developers: [],
        propertyTypes: [...guide.propertyTypes].sort(),
        pricePerSqft: getAreaPricePerSqft(guide.name, guide.propertyTypes, guide.emirate),
        descriptor: guide.descriptor,
        overview: guide.overview,
        source,
      };
      result.push(community);
      resultByKey.set(key, community);
    }
    for (const alias of [guide.slug, ...guide.aliases]) {
      const normalizedAlias = slugify(alias);
      if (normalizedAlias && !result.some((community) => community.slug === normalizedAlias)) {
        communityAliasCache.set(normalizedAlias, guide.slug);
      }
    }
  }

  result.sort((a, b) => b.activeProjects - a.activeProjects || a.name.localeCompare(b.name));
  communityDirectoryCache = result;
  return result;
}

export function getCommunityProfile(slug: string) {
  if (!communityBySlugCache) {
    const directory = getCommunityDirectory();
    communityBySlugCache = new Map(directory.map((community) => [community.slug, community]));
    communityAliasCache?.forEach((canonical, alias) => {
      const profile = communityBySlugCache?.get(canonical);
      if (profile && !communityBySlugCache?.has(alias)) communityBySlugCache?.set(alias, profile);
    });
  }
  return communityBySlugCache.get(slugify(slug)) ?? null;
}

export function getCommunityRouteSlugs() {
  const canonical = getCommunityDirectory().map((community) => community.slug);
  return [...new Set([...canonical, ...(communityAliasCache?.keys() || [])])];
}

const excludedDeveloperNames = new Set(["al", "g", "w", "the", "new", "dubai", "district", "one"]);

function credibleDeveloper(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized.length >= 3 && !excludedDeveloperNames.has(normalized) && /[a-z]{3}/i.test(normalized);
}

function displayDeveloperName(names: string[]) {
  return [...names].sort((a, b) => {
    const aScore = Number(a === a.toUpperCase()) + Number(/[A-Z]/.test(a.slice(1)));
    const bScore = Number(b === b.toUpperCase()) + Number(/[A-Z]/.test(b.slice(1)));
    return bScore - aScore || b.length - a.length;
  })[0];
}

let developerDirectoryCache: DeveloperProfile[] | null = null;
let developerBySlugCache: Map<string, DeveloperProfile> | null = null;
let developerAliasCache: Map<string, string> | null = null;

export function getDeveloperDirectory(): DeveloperProfile[] {
  if (developerDirectoryCache) return developerDirectoryCache;
  const credibleProjects = getProjectRegistry().projects.filter((project) => credibleDeveloper(project.developer));
  const aliases = buildDeveloperAliasMap(credibleProjects.flatMap((project) => [project.developer, project.developerDisplay || ""]));
  const groups = new Map<string, { names: string[]; projects: RegistryProject[] }>();
  for (const project of credibleProjects) {
    const rawSlug = rawDeveloperSlug(project.developerDisplay || project.developer);
    const sourceSlug = rawDeveloperSlug(project.developer);
    const slug = aliases.get(rawSlug) || aliases.get(sourceSlug) || sourceSlug;
    if (!slug) continue;
    const group = groups.get(slug) || { names: [], projects: [] };
    group.names.push((project.developerDisplay || project.developer).trim());
    group.projects.push(project);
    groups.set(slug, group);
  }
  const result = [...groups.entries()].map(([slug, group]) => {
    const projects = [...group.projects].sort((a, b) => Number(a.archived) - Number(b.archived));
    const active = projects.filter((project) => !project.archived);
    const editorial = editorialDevelopers[slug];
    const flagship = developerFlagships[slug];
    const flagshipProject = flagship ? projects.find((project) => project.slug === flagship.projectSlug && project.image) : undefined;
    const fallbackProject = active.find((project) => project.image) || projects.find((project) => project.image);
    const image = selectPhotographyAsset(reviewedDeveloperImages[slug] || flagshipProject?.image || fallbackProject?.image || "",
      projects.map((project) => project.image));
    return {
      slug,
      name: editorial?.name || canonicalDeveloperOptions(group.names)[0] || displayDeveloperName([...new Set(group.names)]),
      image,
      thumbnail: reviewedDeveloperImages[slug] || developerThumbnailOverrides[slug] || image,
      flagship: flagship?.label || fallbackProject?.name || "Selected development",
      projects,
      activeProjects: active.length,
      emirates: [...new Set(projects.map((project) => project.emirate))].sort(),
      communities: [...new Set(projects.map((project) => cleanCommunityName(project.area)).filter(Boolean))].sort(),
      propertyTypes: [...new Set(projects.flatMap((project) => project.propertyTypes))].sort(),
      descriptor: editorial?.descriptor,
      overview: editorial?.overview,
      focus: editorial?.focus,
      website: editorial?.website,
    };
  }).sort((a, b) => b.activeProjects - a.activeProjects || a.name.localeCompare(b.name));
  developerAliasCache = aliases;
  developerDirectoryCache = result;
  return result;
}

export function getDeveloperProfile(slug: string) {
  if (!developerBySlugCache) {
    const directory = getDeveloperDirectory();
    developerBySlugCache = new Map(directory.map((developer) => [developer.slug, developer]));
    developerAliasCache?.forEach((canonical, alias) => {
      const profile = developerBySlugCache?.get(canonical);
      if (profile) developerBySlugCache?.set(alias, profile);
    });
  }
  return developerBySlugCache.get(rawDeveloperSlug(slug)) ?? null;
}
