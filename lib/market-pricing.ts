export type PricePerSqftBasis = "project" | "area";

export type PricePerSqft = {
  basis: PricePerSqftBasis;
  value: number;
  display: string;
  label: string;
  period: string;
  sourceLabel: string;
  sourceUrl: string;
  note: string;
};

type Benchmark = {
  area: string;
  aliases: string[];
  emirate: string;
  propertyClass: "apartment" | "villa" | "townhouse" | "low-rise" | "overall";
  value: number;
  period: string;
  sourceLabel: string;
  sourceUrl: string;
};

const DUBAI_SOURCE = "https://www.engelvoelkers.com/ae/en/resources/average-price-per-square-foot-in-dubai";
const ABU_DHABI_SOURCE = "https://www.engelvoelkers.com/ae/en/resources/abu-dhabi-property-market";

export const pricePerSqftBenchmarks: Benchmark[] = [
  { area: "Dubai", aliases: ["Dubai"], emirate: "Dubai", propertyClass: "overall", value: 1916, period: "2026 YTD to 7 June", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai", aliases: ["Dubai"], emirate: "Dubai", propertyClass: "apartment", value: 1969, period: "2026 YTD to 7 June", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai", aliases: ["Dubai"], emirate: "Dubai", propertyClass: "townhouse", value: 1371, period: "2026 YTD to 7 June", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai", aliases: ["Dubai"], emirate: "Dubai", propertyClass: "villa", value: 2241, period: "2026 YTD to 7 June", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai Marina", aliases: ["Dubai Marina"], emirate: "Dubai", propertyClass: "apartment", value: 2058, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Business Bay", aliases: ["Business Bay"], emirate: "Dubai", propertyClass: "apartment", value: 2547, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Downtown Dubai", aliases: ["Downtown Dubai", "Downtown"], emirate: "Dubai", propertyClass: "apartment", value: 3011, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Jumeirah Village Circle", aliases: ["Jumeirah Village Circle", "JVC"], emirate: "Dubai", propertyClass: "apartment", value: 1510, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Jumeirah Lakes Towers", aliases: ["Jumeirah Lakes Towers", "JLT"], emirate: "Dubai", propertyClass: "apartment", value: 1831, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai Hills Estate", aliases: ["Dubai Hills Estate", "Dubai Hills"], emirate: "Dubai", propertyClass: "apartment", value: 2432, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai Hills Estate", aliases: ["Dubai Hills Estate", "Dubai Hills"], emirate: "Dubai", propertyClass: "low-rise", value: 2896, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai Creek Harbour", aliases: ["Dubai Creek Harbour", "Dubai Creek Harbour The Lagoons", "The Lagoons"], emirate: "Dubai", propertyClass: "apartment", value: 2600, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Palm Jumeirah", aliases: ["Palm Jumeirah"], emirate: "Dubai", propertyClass: "apartment", value: 4240, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Palm Jumeirah", aliases: ["Palm Jumeirah"], emirate: "Dubai", propertyClass: "low-rise", value: 8070, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Dubai Sports City", aliases: ["Dubai Sports City"], emirate: "Dubai", propertyClass: "apartment", value: 1332, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Arjan", aliases: ["Arjan"], emirate: "Dubai", propertyClass: "apartment", value: 1568, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Arabian Ranches 1", aliases: ["Arabian Ranches 1", "Arabian Ranches"], emirate: "Dubai", propertyClass: "low-rise", value: 2417, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Jumeirah Golf Estates", aliases: ["Jumeirah Golf Estates"], emirate: "Dubai", propertyClass: "low-rise", value: 2524, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "The Springs", aliases: ["The Springs", "Springs"], emirate: "Dubai", propertyClass: "low-rise", value: 2306, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Damac Hills", aliases: ["Damac Hills", "DAMAC Hills"], emirate: "Dubai", propertyClass: "low-rise", value: 1908, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Tilal Al Ghaf", aliases: ["Tilal Al Ghaf"], emirate: "Dubai", propertyClass: "low-rise", value: 2034, period: "1 Jan to 6 Jun 2026", sourceLabel: "Property Monitor using DLD transaction data", sourceUrl: DUBAI_SOURCE },
  { area: "Abu Dhabi", aliases: ["Abu Dhabi"], emirate: "Abu Dhabi", propertyClass: "overall", value: 1783, period: "February 2026", sourceLabel: "UAE market benchmark", sourceUrl: ABU_DHABI_SOURCE },
  { area: "Abu Dhabi", aliases: ["Abu Dhabi"], emirate: "Abu Dhabi", propertyClass: "apartment", value: 1924, period: "February 2026", sourceLabel: "UAE market benchmark", sourceUrl: ABU_DHABI_SOURCE },
  { area: "Abu Dhabi", aliases: ["Abu Dhabi"], emirate: "Abu Dhabi", propertyClass: "villa", value: 1367, period: "February 2026", sourceLabel: "UAE market benchmark", sourceUrl: ABU_DHABI_SOURCE },
  { area: "Abu Dhabi", aliases: ["Abu Dhabi"], emirate: "Abu Dhabi", propertyClass: "low-rise", value: 1367, period: "February 2026", sourceLabel: "UAE market benchmark", sourceUrl: ABU_DHABI_SOURCE },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*emirate\)/gi, "")
    .replace(/\b(?:dubai|abu dhabi|sharjah|ajman|fujairah|ras al khaimah|umm al quwain)\s*,?\s*$/gi, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Benchmarks are bundled reference data. Normalize their aliases once so every
// community and project lookup only has to normalize the requested location.
const normalizedBenchmarks = pricePerSqftBenchmarks.map((benchmark) => ({
  benchmark,
  aliases: benchmark.aliases.map(normalize),
  isEmirateWide: normalize(benchmark.area) === normalize(benchmark.emirate),
}));

function projectClass(propertyTypes: string[]) {
  const text = propertyTypes.join(" ").toLowerCase();
  if (/villa/.test(text) && !/apartment|townhouse/.test(text)) return "villa";
  if (/townhouse/.test(text) && !/apartment|villa/.test(text)) return "townhouse";
  if (/(villa|townhouse)/.test(text) && !/apartment/.test(text)) return "low-rise";
  if (/apartment|studio|penthouse|residence/.test(text)) return "apartment";
  return "overall";
}

function toPrice(value: Benchmark, label: string, scope: "area" | "emirate" = "area"): PricePerSqft {
  return {
    basis: "area",
    value: value.value,
    display: formatAedPerSqft(value.value),
    label,
    period: value.period,
    sourceLabel: value.sourceLabel,
    sourceUrl: value.sourceUrl,
    note: scope === "emirate"
      ? `${value.emirate}-wide average; no location-specific benchmark is published here.`
      : `Area benchmark for ${value.area}; confirm against recent comparable transactions before reserving a unit.`,
  };
}

/** Whole-word containment so "arjan" (Dubai) never matches "al marjan island"
 *  (Ras Al Khaimah). Raw substring matching produced exactly that false hit. */
function wordBoundedMatch(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  // Both arguments contain only normalized words separated by single spaces.
  // Padding keeps the same word boundaries without constructing two regexes.
  const paddedA = ` ${a} `;
  const paddedB = ` ${b} `;
  return paddedA.includes(paddedB) || paddedB.includes(paddedA);
}

export function formatAedPerSqft(value: number) {
  return `AED ${Math.round(value).toLocaleString("en-AE")}/sqft`;
}

export function parseMoney(raw = "") {
  const match = raw.replace(/,/g, "").match(/([\d.]+)\s*([mk])?/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const suffix = match[2]?.toLowerCase();
  if (suffix === "m") return amount * 1_000_000;
  if (suffix === "k") return amount * 1_000;
  return amount;
}

export function parseSqft(raw = "") {
  const normalized = raw.replace(/,/g, "");
  const sqft = normalized.match(/([\d.]+)\s*(?:sq\.?\s*ft\.?|sqft|sq ft)\b/i);
  if (sqft) return Number(sqft[1]) || 0;
  const sqm = normalized.match(/([\d.]+)\s*(?:m2|m²|sq\.?\s*m\.?|sqm)\b/i);
  if (!sqm) return 0;
  const value = Number(sqm[1]);
  return Number.isFinite(value) && value > 0 ? value * 10.7639 : 0;
}

export function extractSizeText(plain: string) {
  const patterns = [
    /\bArea\s*(?:From)?\s*[:\-]?\s*(?:From\s*)?([\d,]+(?:\.\d+)?\s*(?:sq\.?\s*ft\.?|sqft|sq ft|m2|m²|sq\.?\s*m\.?|sqm))/i,
    /\bAverage size\s*[:\-]?\s*([^.;]{3,90}?(?:sq\.?\s*ft\.?|sqft|sq ft|m2|m²|sq\.?\s*m\.?|sqm))/i,
    /\bfrom\s+([\d,]+(?:\.\d+)?\s*(?:sq\.?\s*ft\.?|sqft|sq ft|m2|m²|sq\.?\s*m\.?|sqm))/i,
  ];
  for (const pattern of patterns) {
    const match = plain.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function extractProjectPricePerSqft(plain: string, startingPriceRaw: string, sizeText = ""): PricePerSqft | null {
  const directPatterns = [
    /\baverage price(?:\s+of)?(?:\s+approximately|\s+around)?\s*(?:AED|AED\.)\s*([\d,]+(?:\.\d+)?)\s*(?:per|\/)\s*sq\.?\s*ft\.?/i,
    /\b(?:at|from)\s+approximately\s*(?:AED|AED\.)\s*([\d,]+(?:\.\d+)?)\s*(?:per|\/)\s*sq\.?\s*ft\.?/i,
    /\b(?:AED|AED\.)\s*([\d,]+(?:\.\d+)?)\s*(?:per|\/)\s*sq\.?\s*ft\.?/i,
  ];
  for (const pattern of directPatterns) {
    const match = plain.match(pattern);
    const value = match ? parseMoney(match[1]) : 0;
    if (value >= 300 && value <= 25000) {
      return {
        basis: "project",
        value,
        display: formatAedPerSqft(value),
        label: "Project AED/sqft",
        period: "Current project page",
        sourceLabel: "Project pricing text",
        sourceUrl: "",
        note: "Published project price per square foot; reconfirm against the selected unit before reservation.",
      };
    }
  }

  const startingPrice = parseMoney(startingPriceRaw);
  const size = parseSqft(sizeText || extractSizeText(plain));
  if (startingPrice > 0 && size > 0) {
    const value = startingPrice / size;
    if (value >= 300 && value <= 25000) {
      return {
        basis: "project",
        value,
        display: formatAedPerSqft(value),
        label: "Project AED/sqft",
        period: "Current project page",
        sourceLabel: "Derived from starting price and published from-size",
        sourceUrl: "",
        note: "Calculated from the published starting price divided by the published starting size; exact unit pricing can differ.",
      };
    }
  }

  return null;
}

export function getAreaPricePerSqft(area: string, propertyTypes: string[] = [], emirate = ""): PricePerSqft | null {
  const areaKey = normalize(area);
  if (!areaKey) return null;

  let matches = normalizedBenchmarks
    .filter(({ aliases }) => aliases.some((alias) => wordBoundedMatch(areaKey, alias)))
    .map(({ benchmark }) => benchmark);
  // When a name matches in more than one emirate, keep the ones in this emirate.
  if (emirate && matches.some((benchmark) => benchmark.emirate === emirate)) {
    matches = matches.filter((benchmark) => benchmark.emirate === emirate);
  }

  let scope: "area" | "emirate" = "area";
  if (!matches.length) {
    // No location-specific figure: fall back to the emirate-wide index, and say so.
    matches = normalizedBenchmarks
      .filter(({ benchmark, isEmirateWide }) => benchmark.emirate === emirate && isEmirateWide)
      .map(({ benchmark }) => benchmark);
    scope = "emirate";
  }
  if (!matches.length) return null;

  const preferred = projectClass(propertyTypes);
  const benchmark = matches.find((item) => item.propertyClass === preferred)
    || (preferred === "townhouse" ? matches.find((item) => item.propertyClass === "low-rise") : null)
    || (preferred === "villa" ? matches.find((item) => item.propertyClass === "low-rise") : null)
    || matches.find((item) => item.propertyClass === "overall")
    || matches[0];
  return toPrice(benchmark, scope === "emirate" ? `${benchmark.emirate}-wide average AED/sqft` : "Area AED/sqft", scope);
}
