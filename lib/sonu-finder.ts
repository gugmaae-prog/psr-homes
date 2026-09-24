import { getProjectRegistry, type RegistryProject } from "@/lib/imported-projects";
import { sonuPropertyBedroomCombinationIsValid } from "@/lib/sonu-chat";
import { parseMoney } from "@/lib/market-pricing";

export type SonuGoal = "home" | "investment" | "holiday" | "unsure";
export type SonuLifestyle = "beachfront" | "full-community" | "central" | "golf-wellness" | "quiet-family";
export type SonuHousehold = "children" | "planning-family" | "adults" | "not-sure";
export type SonuBudget = "under-1m" | "1m-2m" | "2m-5m" | "5m-10m" | "10m-plus";
export type SonuFinancing = "cash" | "mortgage" | "mixed" | "not-sure";
export type SonuInvestmentStrategy = "income" | "growth" | "balanced";

export type SonuFinderPreferences = {
  goal: SonuGoal;
  propertyTypes: string[];
  bedrooms: string;
  household: SonuHousehold;
  lifestyle: SonuLifestyle;
  priorities: string[];
  budget: SonuBudget;
  emirate: string;
  community?: string;
  timeline: string;
  financing?: SonuFinancing;
  investmentStrategy?: SonuInvestmentStrategy;
  goldenVisaInterest?: boolean;
};

export type SonuRecommendation = {
  slug: string;
  title: string;
  developer: string;
  area: string;
  emirate: string;
  price: string;
  image: string;
  bedrooms: string[];
  propertyTypes: string[];
  reason: string;
  paymentPlan: string;
  handover: string;
  statusLabel: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  evidenceStatus: "official-source" | "catalogue-verification-required";
};

const GOALS = new Set<SonuGoal>(["home", "investment", "holiday", "unsure"]);
const LIFESTYLES = new Set<SonuLifestyle>(["beachfront", "full-community", "central", "golf-wellness", "quiet-family"]);
const HOUSEHOLDS = new Set<SonuHousehold>(["children", "planning-family", "adults", "not-sure"]);
const BUDGETS = new Set<SonuBudget>(["under-1m", "1m-2m", "2m-5m", "5m-10m", "10m-plus"]);
const VALID_EMIRATES = new Set(["Any emirate", "Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman", "Fujairah", "Umm Al Quwain"]);
const VALID_TIMELINES = new Set(["Immediately", "Within 3 months", "Within 6 months", "This year", "Exploring"]);
const VALID_TYPES = new Set(["Apartment", "Villa", "Townhouse", "Penthouse", "Mansion", "Duplex"]);
const VALID_FINANCING = new Set<SonuFinancing>(["cash", "mortgage", "mixed", "not-sure"]);
const VALID_STRATEGIES = new Set<SonuInvestmentStrategy>(["income", "growth", "balanced"]);
const VALID_PRIORITIES = new Set([
  "Schools",
  "Parks and family space",
  "Healthcare",
  "Larger layouts",
  "Commute",
  "High rental yield",
  "Capital appreciation",
  "Low service costs",
  "Short-term rental potential",
  "Resale liquidity",
  "Beach access",
  "Walkability",
  "Privacy",
]);

const BUDGET_LIMITS: Record<SonuBudget, { min: number; max: number }> = {
  "under-1m": { min: 0, max: 1_000_000 },
  "1m-2m": { min: 1_000_000, max: 2_000_000 },
  "2m-5m": { min: 2_000_000, max: 5_000_000 },
  "5m-10m": { min: 5_000_000, max: 10_000_000 },
  "10m-plus": { min: 10_000_000, max: Number.POSITIVE_INFINITY },
};

function text(value: unknown, max = 80) {
  return typeof value === "string" ? value.replaceAll("\0", "").trim().slice(0, max) : "";
}

function stringList(value: unknown, allowed: Set<string>, limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item)).filter((item) => allowed.has(item)))].slice(0, limit);
}

export function normalizeSonuPreferences(value: unknown): SonuFinderPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const goal = text(record.goal) as SonuGoal;
  const lifestyle = text(record.lifestyle) as SonuLifestyle;
  const household = text(record.household) as SonuHousehold;
  const budget = text(record.budget) as SonuBudget;
  const bedrooms = text(record.bedrooms, 24);
  const emirate = text(record.emirate, 40);
  const community = text(record.community, 80);
  const timeline = text(record.timeline, 40);
  const requestedFinancing = text(record.financing, 20) as SonuFinancing;
  const requestedStrategy = text(record.investmentStrategy, 20) as SonuInvestmentStrategy;
  const financing = VALID_FINANCING.has(requestedFinancing) ? requestedFinancing : "not-sure";
  const investmentStrategy = VALID_STRATEGIES.has(requestedStrategy) ? requestedStrategy : "balanced";
  const goldenVisaInterest = record.goldenVisaInterest === true;
  const propertyTypes = stringList(record.propertyTypes, VALID_TYPES, 5);
  const priorities = stringList(record.priorities, VALID_PRIORITIES, 5);
  if (
    !GOALS.has(goal)
    || !LIFESTYLES.has(lifestyle)
    || !HOUSEHOLDS.has(household)
    || !BUDGETS.has(budget)
    || !bedrooms
    || !VALID_EMIRATES.has(emirate)
    || !VALID_TIMELINES.has(timeline)
    || propertyTypes.length === 0
    || !sonuPropertyBedroomCombinationIsValid(propertyTypes, bedrooms)
    || (propertyTypes.includes("Mansion") && (budget === "under-1m" || budget === "1m-2m" || budget === "2m-5m"))
  ) return null;
  return {
    goal,
    propertyTypes,
    bedrooms,
    household,
    lifestyle,
    priorities,
    budget,
    emirate,
    ...(community ? { community } : {}),
    timeline,
    financing,
    investmentStrategy,
    goldenVisaInterest,
  };
}

function reliableStartingPrice(project: RegistryProject) {
  const amount = parseMoney(project.startingPrice);
  if (!Number.isFinite(amount) || amount < 250_000 || amount > 100_000_000) return 0;
  return amount;
}

function displayStartingPrice(project: RegistryProject, amount: number) {
  if (!amount) return "Price on request";
  return `From AED ${Math.round(amount).toLocaleString("en-AE")}`;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function projectText(project: RegistryProject) {
  return normalized([
    project.name,
    project.area,
    project.emirate,
    project.description,
    ...project.propertyTypes,
    ...project.bedrooms,
    ...project.lifestyles,
  ].join(" "));
}

function typeMatches(project: RegistryProject, requested: string) {
  const corpus = projectText(project);
  const type = normalized(requested);
  if (type === "mansion") return /\bmansions?\b/.test(corpus);
  if (type === "duplex") return /\bduplex(?:es)?\b/.test(corpus);
  return new RegExp(`\\b${type}(?:s)?\\b`).test(corpus);
}

function bedroomMatches(project: RegistryProject, requested: string) {
  const corpus = normalized(project.bedrooms.join(" "));
  const value = normalized(requested);
  if (value.includes("not sure")) return true;
  if (value.includes("studio")) return /\bstudio\b/.test(corpus);
  const count = value.match(/\d+/)?.[0];
  return count ? new RegExp(`\\b${count}(?:br|bed|beds|bedroom|bedrooms)?\\b`).test(corpus) : false;
}

function lifestylePattern(lifestyle: SonuLifestyle) {
  if (lifestyle === "beachfront") return /\b(?:beach|beachfront|island|waterfront|marina|sea|palm|coastal)\b/;
  if (lifestyle === "full-community") return /\b(?:community|masterplan|estate|ranches|hills|village|gardens|town square|yas)\b/;
  if (lifestyle === "central") return /\b(?:downtown|business bay|difc|city walk|marina|jlt|central)\b/;
  if (lifestyle === "golf-wellness") return /\b(?:golf|wellness|spa|resort)\b/;
  return /\b(?:family|school|park|community|villa|townhouse|garden)\b/;
}

function preferenceSummary(preferences: SonuFinderPreferences, project: RegistryProject, price: number) {
  const reasons: string[] = [];
  const type = preferences.propertyTypes.find((item) => typeMatches(project, item));
  if (type) reasons.push(`${type} format`);
  if (bedroomMatches(project, preferences.bedrooms) && !/not sure/i.test(preferences.bedrooms)) {
    reasons.push(`${preferences.bedrooms.toLowerCase()} preference`);
  }
  if (lifestylePattern(preferences.lifestyle).test(projectText(project))) {
    const labels: Record<SonuLifestyle, string> = {
      beachfront: "waterfront lifestyle",
      "full-community": "integrated community setting",
      central: "central-city access",
      "golf-wellness": "golf and wellness setting",
      "quiet-family": "family-oriented setting",
    };
    reasons.push(labels[preferences.lifestyle]);
  }
  if (price > 0) reasons.push("within the selected planning budget");
  const lead = reasons.length
    ? `Matched for its ${reasons.slice(0, 3).join(", ")}.`
    : `Selected as a strong ${project.emirate} candidate for the stated brief.`;
  if (preferences.goal === "investment") {
    return `${lead} The advisory review will validate recent transactions, achievable rent, service costs and net yield before a decision.`;
  }
  if (preferences.household === "children" || preferences.household === "planning-family") {
    return `${lead} School routes, parks, healthcare and everyday travel should be confirmed against the selected unit.`;
  }
  return `${lead} Live availability, exact orientation and final pricing remain subject to advisor confirmation.`;
}

function scoreProject(project: RegistryProject, preferences: SonuFinderPreferences) {
  const corpus = projectText(project);
  const price = reliableStartingPrice(project);
  const budget = BUDGET_LIMITS[preferences.budget];
  let score = 1;

  if (preferences.emirate !== "Any emirate") score += project.emirate === preferences.emirate ? 24 : -28;

  if (price > 0) {
    if (price >= budget.min * 0.72 && price <= budget.max) score += 22;
    else if (price < budget.min && price >= budget.min * 0.45) score += 8;
    else if (Number.isFinite(budget.max) && price <= budget.max * 1.12) score += 4;
    else score -= 34;
  } else {
    score -= 4;
  }

  const matchedTypes = preferences.propertyTypes.filter((type) => typeMatches(project, type)).length;
  score += matchedTypes * 18;
  if (!matchedTypes) score -= 16;
  score += bedroomMatches(project, preferences.bedrooms) ? 15 : -7;
  score += lifestylePattern(preferences.lifestyle).test(corpus) ? 18 : -3;

  if (preferences.household === "children" || preferences.household === "planning-family") {
    if (/\b(?:school|academy|nursery|park|family|community|garden)\b/.test(corpus)) score += 13;
    if (/\b(?:villa|townhouse)\b/.test(corpus)) score += 6;
  }

  if (preferences.goal === "investment") {
    if (/\b(?:investment|yield|rental|roi|capital growth|short term|holiday home|off plan|new launch)\b/.test(corpus)) score += 13;
    if (price > 0) score += 4;
  } else if (preferences.goal === "holiday") {
    if (/\b(?:resort|beach|waterfront|island|marina|branded)\b/.test(corpus)) score += 12;
  } else if (preferences.goal === "home") {
    if (/\b(?:community|family|school|park|garden|villa|townhouse)\b/.test(corpus)) score += 10;
  }

  for (const priority of preferences.priorities) {
    if (priority === "Schools" && /\b(?:school|academy|nursery)\b/.test(corpus)) score += 7;
    if (priority === "Parks and family space" && /\b(?:park|garden|green|family|community)\b/.test(corpus)) score += 7;
    if (priority === "High rental yield" && /\b(?:yield|rental|short term|holiday|marina|jvc|business bay)\b/.test(corpus)) score += 7;
    if (priority === "Capital appreciation" && /\b(?:growth|off plan|new launch|future|masterplan|island)\b/.test(corpus)) score += 7;
    if (priority === "Beach access" && /\b(?:beach|waterfront|island|sea|coastal)\b/.test(corpus)) score += 7;
    if (priority === "Privacy" && /\b(?:villa|mansion|private|gated)\b/.test(corpus)) score += 7;
  }

  return { project, price, score };
}

export function recommendSonuProjects(preferences: SonuFinderPreferences, limit = 4): SonuRecommendation[] {
  return getProjectRegistry().projects
    .filter((project) =>
      !project.archived
      && project.image
      && reliableStartingPrice(project) > 0
      && preferences.propertyTypes.some((type) => typeMatches(project, type))
      && bedroomMatches(project, preferences.bedrooms),
    )
    .map((project) => scoreProject(project, preferences))
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name))
    .slice(0, Math.max(1, Math.min(limit, 6)))
    .map(({ project, price }) => ({
      slug: project.slug,
      title: project.name,
      developer: project.developerDisplay || project.developer,
      area: project.area,
      emirate: project.emirate,
      price: displayStartingPrice(project, price),
      image: project.image,
      bedrooms: project.bedrooms,
      propertyTypes: project.propertyTypes,
      reason: preferenceSummary(preferences, project, price),
      paymentPlan: project.paymentPlan || "To be confirmed",
      handover: project.handover || "To be confirmed",
      statusLabel: project.statusLabel || "Catalogue record",
      sourceLabel: project.sourceLabel || "PSR catalogue snapshot",
      sourceUrl: project.sourceUrl || "",
      sourceUpdatedAt: project.sourceUpdatedAt || "",
      evidenceStatus: project.sourceUrl ? "official-source" : "catalogue-verification-required",
    }));
}

export function recommendSonuProjectsStrict(preferences: SonuFinderPreferences, limit = 4): SonuRecommendation[] {
  const budget = BUDGET_LIMITS[preferences.budget];
  const community = normalized(preferences.community || "");
  return getProjectRegistry().projects
    .filter((project) => {
      if (project.archived || !project.image) return false;
      const price = reliableStartingPrice(project);
      if (!price || (Number.isFinite(budget.max) && price > budget.max)) return false;
      if (preferences.emirate !== "Any emirate" && project.emirate !== preferences.emirate) return false;
      if (community && !projectText(project).includes(community)) return false;
      if (!preferences.propertyTypes.some((type) => typeMatches(project, type))) return false;
      if (!bedroomMatches(project, preferences.bedrooms)) return false;
      return true;
    })
    .map((project) => scoreProject(project, preferences))
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name))
    .slice(0, Math.max(1, Math.min(limit, 6)))
    .map(({ project, price }) => ({
      slug: project.slug,
      title: project.name,
      developer: project.developerDisplay || project.developer,
      area: project.area,
      emirate: project.emirate,
      price: displayStartingPrice(project, price),
      image: project.image,
      bedrooms: project.bedrooms,
      propertyTypes: project.propertyTypes,
      reason: preferenceSummary(preferences, project, price),
      paymentPlan: project.paymentPlan || "To be confirmed",
      handover: project.handover || "To be confirmed",
      statusLabel: project.statusLabel || "Catalogue record",
      sourceLabel: project.sourceLabel || "PSR catalogue snapshot",
      sourceUrl: project.sourceUrl || "",
      sourceUpdatedAt: project.sourceUpdatedAt || "",
      evidenceStatus: project.sourceUrl ? "official-source" : "catalogue-verification-required",
    }));
}

export function sonuPreferenceMessage(preferences: SonuFinderPreferences) {
  return [
    `Purpose: ${preferences.goal}`,
    `Property types: ${preferences.propertyTypes.join(", ")}`,
    `Bedrooms: ${preferences.bedrooms}`,
    `Household: ${preferences.household}`,
    `Setting: ${preferences.lifestyle}`,
    `Priorities: ${preferences.priorities.join(", ") || "Open"}`,
    `Budget: ${preferences.budget}`,
    `Emirate: ${preferences.emirate}`,
    `Community: ${preferences.community || "Open"}`,
    `Timeline: ${preferences.timeline}`,
    `Purchase route: ${preferences.financing || "not-sure"}`,
    `Investment objective: ${preferences.goal === "investment" ? preferences.investmentStrategy || "balanced" : "Not applicable"}`,
    `Golden Visa guidance: ${preferences.goldenVisaInterest ? "Requested" : "Not requested"}`,
  ].join("\n");
}
