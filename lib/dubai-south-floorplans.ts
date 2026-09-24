import register from '../data/dubai-south-floorplan-register.json';

export type FloorplanReference = {
  url: string;
  layout: string;
  bedrooms: number;
  areaSqft: number | null;
  sourceUrl: string;
  sourceLabel: string;
  checkedAt: string;
  qualification: string;
  matchStatus: string;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Explicit aliases only. Parent projects and similarly named developments are not interchangeable.
const aliases: Record<string, string[]> = {
  'golf-vale': ['golf-vale-emaar-south-dubai'],
  'golf-hills': ['golf-hills-emaar-south-dubai'],
  'golf-trails': ['golf-trails-emaar-emaar-south-dubai'],
  'windsor-house-ii-building-b': ['windsor-house-ii-ellington-dubai-south'],
  'south-square-s1': ['south-square-by-dubai-south-properties'],
  'south-living': ['south-living-by-dubai-south-in-dubai-south-dubai'],
  'divine-elements': ['divine-elements-takmeel-dubai-south'],
  'golf-acres': ['golf-acres-emaar-properties-emaar-south'],
  'golf-meadow': ['apartments-and-townhouses-golf-meadow-emaar-south'],
  'enre-residence': ['enre-residence-imtiaz-dubai-south'],
  'expo-valley-views': ['expo-valley-views-expo-city-dubai'],
};

export const dubaiSouthReplacementShortlist = register.projects.map(({id, name}) => ({id, name}));

export function dubaiSouthFloorplanSnapshot(project: {slug: string; name: string}, bedroom?: string) {
  const entry = register.projects.find(item => item.id === project.slug || normalize(item.name) === normalize(project.name) || aliases[item.id]?.includes(project.slug));
  if (!entry) return undefined;
  const match = bedroom?.match(/^(\d+)\s*(?:br|bed)/i);
  const count = match ? Number(match[1]) : undefined;
  const references: FloorplanReference[] = (entry.reviewPlans || [])
    .filter(plan => plan.reviewStatus === 'reviewed-project-reference' && (count === undefined || plan.bedrooms === count))
    .map(plan => ({url: plan.localUrl, layout: plan.layout, bedrooms: plan.bedrooms,
      areaSqft: plan.areaSqft, sourceUrl: entry.sourceUrl, sourceLabel: entry.sourceLabel,
      checkedAt: entry.checkedAt, qualification: entry.qualification, matchStatus: plan.matchStatus}));
  return {id: entry.id, name: entry.name, qualification: entry.qualification, references};
}
