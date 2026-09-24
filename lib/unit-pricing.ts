const APARTMENT_AREA_BY_BEDROOM = [450, 750, 1_150, 1_600, 2_250, 3_100, 4_000, 4_800, 5_600];
const LANDED_AREA_BY_BEDROOM = [700, 1_150, 1_650, 2_300, 3_200, 4_300, 5_400, 6_400, 7_400];

export function configurationBedroomCount(label: string) {
  if (/studio/i.test(label)) return 0;
  const match = label.match(/(\d+)\s*(?:br|bed|bedroom)/i) || label.match(/^(\d+)/);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isFinite(count) ? Math.min(8, Math.max(0, count)) : null;
}

export function sortConfigurationOptions(options: string[]) {
  return [...new Set(options.filter(Boolean))].sort((left, right) => {
    const leftCount = configurationBedroomCount(left);
    const rightCount = configurationBedroomCount(right);
    if (leftCount === null && rightCount === null) return left.localeCompare(right);
    if (leftCount === null) return 1;
    if (rightCount === null) return -1;
    return leftCount - rightCount || left.localeCompare(right);
  });
}

export function usesLandedArea(residenceTypes: string[] | string) {
  const value = Array.isArray(residenceTypes) ? residenceTypes.join(" ") : residenceTypes;
  return /villa|townhouse|mansion/i.test(value);
}

export function planningConfigurationArea(configuration: string, landed = false) {
  const count = configurationBedroomCount(configuration);
  if (count === null) return landed ? 3_200 : 1_600;
  const bands = landed ? LANDED_AREA_BY_BEDROOM : APARTMENT_AREA_BY_BEDROOM;
  return bands[count] || (landed ? 3_200 : 1_600);
}

export function baselineConfiguration(options: string[]) {
  return sortConfigurationOptions(options).find((option) => configurationBedroomCount(option) !== null) || "";
}

export function configurationPlanningPrice(
  advertisedStartingPrice: number,
  options: string[],
  selected: string,
  landed = false,
) {
  if (!Number.isFinite(advertisedStartingPrice) || advertisedStartingPrice <= 0) return 0;
  const baseline = baselineConfiguration(options);
  if (!baseline || configurationBedroomCount(selected) === null) return Math.round(advertisedStartingPrice);
  const baselineArea = planningConfigurationArea(baseline, landed);
  const selectedArea = planningConfigurationArea(selected, landed);
  if (!baselineArea || selectedArea === baselineArea) return Math.round(advertisedStartingPrice);
  const estimate = advertisedStartingPrice * selectedArea / baselineArea;
  return Math.max(250_000, Math.round(estimate / 5_000) * 5_000);
}
