import { getProjectRegistry, getUniqueActiveProjectRecords } from "@/lib/imported-projects";
import { formatAedPerSqft, getAreaPricePerSqft } from "@/lib/market-pricing";
import { canonicalDeveloperOptions, developerRootSlug, rawDeveloperSlug } from "@/lib/developer-identity";
import { formatAedCardPrice } from "@/lib/card-currency";

export type CatalogueProject = {
  slug: string;
  title: string;
  developer: string;
  emirate: string;
  area: string;
  image: string;
  price: string;
  priceAed: string;
  pricePerSqft: string;
  pricePerSqftLabel: string;
  paymentPlan: string;
  handover: string;
  propertyTypes: string[];
  bedrooms: string[];
  href?: string;
  statusLabel?: string;
};

export type CatalogueFilters = {
  emirates: Record<string, number>;
  developers: string[];
  propertyTypes: string[];
};

export type CatalogueResult = {
  projects: CatalogueProject[];
  total: number;
  page: number;
  pages: number;
  filters: CatalogueFilters;
  registry: { total: number; updatedAt: string };
};

export type CatalogueQuery = {
  query?: string;
  emirate?: string;
  developer?: string;
  propertyType?: string;
  bedrooms?: string;
  maxPrice?: number;
  page?: number;
};

function formatPrice(raw: string) {
  return formatAedCardPrice(raw);
}

export function developerSlugFor(value: string) {
  const slug = rawDeveloperSlug(value);
  return /^imtiaz(?:-development|-developments)?$/.test(slug) ? "imtiaz" : slug;
}

function developerKey(value: string) {
  return developerRootSlug(value);
}

function bedroomKey(value: string) {
  const match = value.match(/\b([1-9])\s*(?:br|bed(?:room)?s?)\b/i);
  return match ? `${match[1]}br` : value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function safeArea(area: string) {
  return /^AED\s*[\d,.]+$/i.test(area.trim()) ? "Location to be confirmed" : area;
}

function safePaymentPlan(value: string) {
  const cleaned = value.replace(/Payment Plan/gi, "").trim();
  if (!/^\d+(?:\s*\/\s*\d+)+$/.test(cleaned)) return cleaned || "To be confirmed";
  const total = cleaned.split("/").reduce((sum, milestone) => sum + Number(milestone.trim()), 0);
  return total === 100 ? cleaned : "To be confirmed";
}

export function getProjectCatalogue(query: CatalogueQuery = {}): CatalogueResult {
  const normalizedQuery = (query.query || "").trim().toLowerCase();
  const queryTerms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length > 1);
  const emirate = query.emirate || "";
  const developer = query.developer || "";
  const propertyType = query.propertyType || "";
  const bedrooms = query.bedrooms || "";
  const maxPrice = Math.max(0, Number(query.maxPrice || 0));
  const requestedDeveloper = developerKey(developer);
  const page = Math.max(1, Number(query.page || 1));
  const perPage = 24;
  const registry = getProjectRegistry();
  const publicProjects = getUniqueActiveProjectRecords(registry.projects);
  const filtered = publicProjects.filter((project) => {
    const searchable = `${project.name} ${project.developerDisplay || ""} ${project.developer} ${project.area} ${project.emirate} ${project.statusLabel || ""} ${project.propertyTypes.join(" ")} ${project.bedrooms.join(" ")}`.toLowerCase();
    const price = Number(String(project.startingPrice || "").replace(/[^\d.]/g, ""));
    return (!queryTerms.length || queryTerms.every((term) => searchable.includes(term)))
      && (!emirate || project.emirate === emirate)
      && (!developer || developerKey(project.developerDisplay || project.developer) === requestedDeveloper || developerKey(project.developer) === requestedDeveloper)
      && (!propertyType || project.propertyTypes.includes(propertyType))
      && (!bedrooms || project.bedrooms.some((value) => bedroomKey(value) === bedroomKey(bedrooms)))
      && (!maxPrice || (Number.isFinite(price) && price > 0 && price <= maxPrice));
  });
  const projects = filtered.slice((page - 1) * perPage, page * perPage).map((project) => {
    const areaPrice = getAreaPricePerSqft(project.area, project.propertyTypes, project.emirate);
    return {
      slug: project.slug,
      title: project.name,
      developer: project.developerDisplay || project.developer,
      emirate: project.emirate,
      area: safeArea(project.area),
      image: project.image,
      price: project.startingPriceLabel || formatPrice(project.startingPrice),
      priceAed: project.startingPrice,
      paymentPlan: safePaymentPlan(project.paymentPlan),
      handover: project.handover || "To be confirmed",
      statusLabel: project.statusLabel || "",
      propertyTypes: project.propertyTypes,
      bedrooms: project.bedrooms,
      pricePerSqft: project.pricePerSqft ? formatAedPerSqft(project.pricePerSqft) : areaPrice?.display || "",
      pricePerSqftLabel: project.pricePerSqft ? (project.statusLabel ? "Indicative AED/sqft" : "Project AED/sqft") : areaPrice?.label || "",
    } satisfies CatalogueProject;
  });
  const propertyTypes = [...new Set(publicProjects.flatMap((project) => project.propertyTypes))].sort();
  const developers = canonicalDeveloperOptions(publicProjects.map((project) => project.developerDisplay || project.developer).filter(Boolean));
  const emirates = publicProjects.reduce<Record<string, number>>((counts, project) => {
    counts[project.emirate] = (counts[project.emirate] || 0) + 1;
    return counts;
  }, {});
  return {
    projects,
    total: filtered.length,
    page,
    pages: Math.max(1, Math.ceil(filtered.length / perPage)),
    filters: { emirates, developers, propertyTypes },
    registry: { total: publicProjects.length, updatedAt: registry.generatedAt },
  };
}
