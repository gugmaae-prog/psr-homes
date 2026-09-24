import review from "@/data/photo-quality-review.json";

type MediaFields = {
  slug: string;
  image?: string;
  hero?: string;
  gallery?: string[];
  exteriors?: string[];
  interiors?: string[];
};

const projectReplacements: Record<string, Record<string, string>> = review.projects;
const projectPhotoRoles: Record<string, Record<string, string>> = review.projectPhotoRoles;
export const reviewedDeveloperImages: Record<string, string> = review.developers;

function photoKey(value: string) {
  try {
    const url = new URL(value, "https://psrhomes.ae");
    url.search = "";
    url.hash = "";
    return url.origin === "https://psrhomes.ae" ? url.pathname : url.href;
  } catch { return value; }
}

/** Keep reviewed replacements authoritative when a source feed is refreshed. */
export function reviewProjectPhotos<T extends MediaFields>(project: T): T {
  const replacements = projectReplacements[project.slug];
  if (!replacements) return project;
  const replace = (url: string) => replacements[photoKey(url)] ?? url;
  const result = { ...project };
  if (project.image !== undefined) result.image = replace(project.image);
  if (project.hero !== undefined) result.hero = replace(project.hero);
  for (const field of ["gallery", "exteriors", "interiors"] as const) {
    if (project[field]) result[field] = [...new Set(project[field].map(replace).filter(Boolean))];
  }
  const roles = projectPhotoRoles[project.slug];
  if (roles && (project.exteriors || project.interiors || project.gallery)) {
    const selected = new Set([result.image, result.hero, ...(result.gallery || []), ...(result.exteriors || []), ...(result.interiors || [])]);
    for (const field of ["exteriors", "interiors"] as const) {
      result[field] = [...new Set([
        ...(result[field] || []).filter((url) => !roles[url] || roles[url] === field),
        ...Object.entries(roles).filter(([url, role]) => role === field && selected.has(url)).map(([url]) => url),
      ])];
    }
  }
  return result;
}
