import { getProjectRecord } from "@/lib/imported-projects";

export const DUBAI_SOUTH_MAP_SLUGS = [
  "expo-valley-views-expo-city-dubai",
  "ghadeer-expo-valley-views-expo-city-dubai",
  "avenew-888-apartments-dubai-south",
  "loom-at-avenew-888-dubai-south",
  "enre-residence-imtiaz-dubai-south",
  "divine-elements-takmeel-dubai-south",
  "windsor-house-ii-ellington-dubai-south",
  "cresswell-plaza-merath-dubai-south",
  "golf-trails-emaar-emaar-south-dubai",
  "mag-5-boulevard-dubai-south",
  "azizi-venice-dubai-south",
] as const;

export type DubaiSouthMapProject = {
  slug: string;
  name: string;
  developer: string;
  area: string;
  coordinates: string;
  price: string;
};

function formatPrice(value: string, label?: string) {
  if (label) return label;
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return "Price on request";
  if (amount >= 1_000_000) return `From AED ${(amount / 1_000_000).toFixed(amount % 1_000_000 ? 2 : 0).replace(/0$/, "")}M`;
  return `From AED ${Math.round(amount / 1_000)}K`;
}

export function getDubaiSouthMapProjects(): DubaiSouthMapProject[] {
  return DUBAI_SOUTH_MAP_SLUGS.flatMap((slug) => {
    const project = getProjectRecord(slug);
    if (!project || project.archived || !/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(project.coordinates)) return [];
    return [{
      slug: project.slug,
      name: project.name,
      developer: project.developerDisplay || project.developer,
      area: project.area,
      coordinates: project.coordinates,
      price: formatPrice(project.startingPrice, project.startingPriceLabel),
    }];
  });
}
