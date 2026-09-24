import registryData from "../data/projects.json";
import {
  extractGraceDiscoveryProfile,
  extractGraceLeadDetails,
  graceFilterIntent,
  graceDiscoveryCompleteness,
  graceDiscoveryNextQuestion,
  graceLeadIsQualified,
  graceLeadNextQuestion,
  gracePropertyBudgetCombinationIsValid,
  gracePropertyBedroomCombinationIsValid,
  graceQuickReplies,
  type GraceChatMessage,
  type GraceDiscoveryProfile,
  type GraceDiscoveryQuestion,
} from "../lib/grace-chat";
import {
  readSupabaseAgentMemory,
  rememberSupabaseAgentTurn,
} from "./supabase-memory";
import {
  psrCatalogueContext,
  psrKnowledgeFallback,
  psrKnowledgeLinks,
  rankPsrSiteKnowledge,
} from "./psr-site-knowledge";
import {
  generateGraceClientBrief,
  graceFinderPreferencesFromDiscovery,
} from "./grace-brief-service";
import type { AgentEnv } from "./agent-backend";
import { pushWebsiteLeadToLeadRat } from "./leadrat-backend";
import {
  extractSonuDecisionContext,
  sonuAdvisoryEvidence,
  sonuAdvisoryFollowUp,
  sonuAdvisoryKnowledgeReply,
  sonuAdvisoryScore,
  sonuDeveloperMatches,
  type SonuDecisionContext,
} from "./sonu-advisory-intelligence";

const AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const INTERNAL_LEAD_RECIPIENTS = ["sales@psrhomes.ae", "admin@psrhomes.ae"];
const MAX_MESSAGE_LENGTH = 800;
const MAX_MESSAGES = 18;
const MAX_REQUESTS_PER_TWO_MINUTES = 14;

export const SONU_SALES_CHARTER = [
  "Bring the judgement and manners of an excellent human property advisor while remaining transparent as PSR Homes' AI concierge.",
  "Listen before recommending. Acknowledge the visitor's motive, concern or uncertainty naturally, without scripted flattery or fake familiarity.",
  "Be consultative rather than persuasive: clarify the decision, explain trade-offs and let the visitor set the pace.",
  "Never manufacture urgency, scarcity or fear of missing out. Never pressure a visitor to share contact details, book a viewing, reserve or buy.",
  "Do not favour the highest-priced project. Rank only by the visitor's stated fit and the supplied PSR evidence.",
  "When recommending, state why the option fits, one material trade-off or evidence gap, and the practical verification step before a commitment.",
  "If there is no strong match, say so plainly and ask which single criterion the visitor would consider broadening. Never stretch the brief to force a result.",
] as const;

const SONU_PRESSURE_LANGUAGE = /\b(?:act|buy|book|reserve|secure)\s+(?:now|today|immediately)\b|\b(?:last chance|do not miss out|don't miss out|once[- ]in[- ]a[- ]lifetime|units? (?:are|is) (?:selling|going) fast|prices? will (?:only )?(?:rise|increase)|cannot lose|can't lose|risk[- ]free)\b|\bguaranteed?\s+(?:return|roi|yield|profit|growth|appreciation|approval|availability)\b|\bperfect\s+(?:investment|property|opportunity)\b/i;
const SONU_CONTACT_REQUEST = /\b(?:share|send|give|provide|leave)\b.{0,28}\b(?:email|e-mail|phone|mobile|whatsapp|contact details?|number)\b|\bwhat(?:'s| is) your\b.{0,18}\b(?:email|phone|mobile|whatsapp|number)\b/i;
const SONU_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function sonuReplyPassesSalesGuardrails(
  reply: string,
  options: { allowContactRequest?: boolean } = {},
) {
  const value = clean(reply, 1_200);
  const pressureCandidate = value
    .replace(/\b(?:no need to|do not need to|don't need to|should not|would not)\s+(?:act|buy|book|reserve|secure)\s+(?:now|today|immediately)\b/gi, "")
    .replace(/\b(?:returns?|roi|yield|profit|growth|appreciation|approval|availability)\s+(?:is|are)\s+not guaranteed\b/gi, "")
    .replace(/\bnot guaranteed?\s+(?:return|roi|yield|profit|growth|appreciation|approval|availability)\b/gi, "");
  const contactCandidate = value.replace(
    /\b(?:do not|don't|no need to|will not|won't)\b.{0,35}\b(?:share|send|give|provide|leave)\b.{0,28}\b(?:email|e-mail|phone|mobile|whatsapp|contact details?|number)\b/gi,
    "",
  );
  if (!value || SONU_EMOJI.test(value) || SONU_PRESSURE_LANGUAGE.test(pressureCandidate)) return false;
  return Boolean(options.allowContactRequest || !SONU_CONTACT_REQUEST.test(contactCandidate));
}

export type ProjectRecord = {
  slug: string;
  name: string;
  image: string;
  developer: string;
  emirate: string;
  area: string;
  startingPrice: string;
  paymentPlan: string;
  handover: string;
  bedrooms: string[];
  propertyTypes: string[];
  lifestyles: string[];
  archived: boolean;
  brochure?: string;
  sourceUpdatedAt?: string;
};

type GraceState = {
  messages: GraceChatMessage[];
  briefMessages: GraceChatMessage[];
  intentDetected: boolean;
  leadCaptured: boolean;
  leadId: number | null;
  requestTimestamps: number[];
  lastQuestionKey: string;
  suggestions: ProjectSuggestion[];
  processedRequestIds: string[];
  reportRequested: boolean;
  briefDownloadUrl: string;
  briefSent: boolean;
  briefGeneratedAt: string;
  briefSignature: string;
};

export type ProjectSuggestion = {
  slug: string;
  name: string;
  image: string;
  developer: string;
  location: string;
  startingPrice: string;
  priceScope: "project";
  paymentPlan: string;
  handover: string;
  bedrooms: string[];
  propertyTypes: string[];
  lifestyles: string[];
};

type AiChatResult = {
  response?: unknown;
};

type GraceAiResponse = {
  reply: string;
  leadIntent: boolean;
  knowledgeRoutes?: string[];
};

const registry = registryData as { generatedAt?: string; projects: ProjectRecord[] };
const registryDeveloperNames = registry.projects.map((project) => project.developer).filter(Boolean);
const EMPTY_SONU_DECISION_CONTEXT: SonuDecisionContext = {
  priorities: [],
  preferredDevelopers: [],
  developerStrict: false,
  destinations: [],
  compareEmirates: false,
  household: "",
  financing: "",
  riskTolerance: "",
  holdPeriod: "",
};
const registryGeneratedAt = new Date(registry.generatedAt || "");
const catalogueReferenceDate = Number.isFinite(registryGeneratedAt.getTime())
  ? registryGeneratedAt
  : new Date();
const catalogueQuarter = catalogueReferenceDate.getUTCFullYear() * 4
  + Math.floor(catalogueReferenceDate.getUTCMonth() / 3);

export function sonuReplyPassesGrounding(
  reply: string,
  projects: ProjectSuggestion[],
  siteKnowledge: ReturnType<typeof rankPsrSiteKnowledge>,
  options: { allowContactRequest?: boolean; allowSiteKnowledgeProjects?: boolean } = {},
) {
  if (!sonuReplyPassesSalesGuardrails(reply, options)) return false;
  const normalizeEvidence = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const suppliedEvidence = normalizeEvidence([
    ...projects.flatMap((project) => [project.name, project.developer, project.location]),
    ...(options.allowSiteKnowledgeProjects
      ? siteKnowledge.flatMap((item) => [item.title, item.summary, ...item.facts])
      : []),
  ].join(" "));
  const normalizedReply = normalizeEvidence(reply);

  return !registry.projects.some((project) => {
    const projectName = normalizeEvidence(project.name);
    if (projectName.length < 8 || !normalizedReply.includes(projectName)) return false;
    return !suppliedEvidence.includes(projectName);
  });
}

const INITIAL_STATE: GraceState = {
  messages: [],
  briefMessages: [],
  intentDetected: false,
  leadCaptured: false,
  leadId: null,
  requestTimestamps: [],
  lastQuestionKey: "",
  suggestions: [],
  processedRequestIds: [],
  reportRequested: false,
  briefDownloadUrl: "",
  briefSent: false,
  briefGeneratedAt: "",
  briefSignature: "",
};

const RESEARCH_ARTICLES = [
  {
    title: "Etihad Rail passenger services and UAE property",
    category: "Market research",
    href: "/insights/etihad-rail-passenger-network-uae-property-impact-2026",
  },
  {
    title: "Wynn Al Marjan Island 2027 resort briefing",
    category: "Community intelligence",
    href: "/insights/wynn-al-marjan-island-2027-resort-property-briefing",
  },
  {
    title: "Monthly UAE market tracking dashboard",
    category: "Market research",
    href: "/insights/monthly-uae-market-tracking-dashboard",
  },
  {
    title: "Benefits of investing in UAE real estate",
    category: "Investor guide",
    href: "/insights/benefits-of-investing-in-uae-real-estate",
  },
  {
    title: "How to evaluate new UAE property launches",
    category: "New launches",
    href: "/insights/how-to-evaluate-new-property-launches-uae",
  },
  {
    title: "Service charges and net yield in UAE property",
    category: "Investor guide",
    href: "/insights/service-charges-net-yield-uae-property",
  },
];

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function formatPrice(raw: string) {
  if (!raw) return "Available on request";
  const amount = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount >= 250_000 && amount <= 100_000_000
    ? `From AED ${Math.round(amount).toLocaleString("en-AE")}`
    : "Available on request";
}

function reliablePrice(raw: string) {
  const amount = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount >= 250_000 && amount <= 100_000_000 ? amount : 0;
}

function numericProfileBudget(value: string) {
  const amount = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) && amount >= 250_000 && amount <= 250_000_000 ? amount : 0;
}

function projectHasBedroom(project: Pick<ProjectRecord, "bedrooms">, preference: string) {
  if (!preference) return true;
  if (preference === "Studio") {
    return project.bedrooms.some((value) => /\bstudios?\b/i.test(value));
  }
  const bedrooms = preference.match(/\d+/)?.[0] || "";
  return Boolean(bedrooms) && project.bedrooms.some((value) =>
    new RegExp(`(?:^|\\b)${bedrooms}\\s*(?:br|bed|bedroom)s?(?:\\b|$)`, "i").test(value),
  );
}

function projectMeetsRecordedRequirements(
  project: ProjectRecord,
  profile: ReturnType<typeof extractGraceDiscoveryProfile>,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  if (!gracePropertyBedroomCombinationIsValid(profile.propertyType, profile.bedrooms)) return false;
  if (!gracePropertyBudgetCombinationIsValid(profile.propertyType, profile.budget)) return false;
  if (profile.location) {
    const location = profile.location.toLowerCase();
    const locality = `${project.name} ${project.area} ${project.emirate}`.toLowerCase();
    if (!locality.includes(location)) return false;
  }
  if (profile.propertyType) {
    const requestedType = profile.propertyType.toLowerCase();
    if (!project.propertyTypes.some((value) => value.toLowerCase().includes(requestedType))) return false;
  }
  if (profile.bedrooms && !projectHasBedroom(project, profile.bedrooms)) return false;
  const budget = numericProfileBudget(profile.budget);
  const entryPrice = reliablePrice(project.startingPrice);
  if (budget && entryPrice > budget) return false;
  if (profile.timeline && !sonuProjectMeetsTimelinePreference(project, profile.timeline)) return false;
  if (
    decisionContext.developerStrict
    && !sonuDeveloperMatches(project.developer, decisionContext.preferredDevelopers)
  ) return false;
  return true;
}

function projectSuggestion(project: ProjectRecord): ProjectSuggestion {
  return {
    slug: project.slug,
    name: project.name,
    image: project.image,
    developer: project.developer,
    location: `${project.area}, ${project.emirate}`,
    startingPrice: formatPrice(project.startingPrice),
    priceScope: "project",
    paymentPlan: project.paymentPlan ? conversationalPlan(project.paymentPlan) : "Available on request",
    handover: project.handover || "To be confirmed",
    bedrooms: project.bedrooms,
    propertyTypes: project.propertyTypes,
    lifestyles: project.lifestyles,
  };
}

function handoverQuarter(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (/^completed$/i.test(normalized)) return catalogueQuarter - 1;
  const quarter = normalized.match(/\bQ([1-4])\s*(20\d{2})\b/i);
  if (quarter) return Number(quarter[2]) * 4 + Number(quarter[1]) - 1;
  const years = [...normalized.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  return years.length ? Math.max(...years) * 4 + 3 : null;
}

export function sonuProjectEvidenceScore(project: ProjectRecord) {
  return [
    reliablePrice(project.startingPrice) > 0 ? 2 : 0,
    project.paymentPlan ? 2 : 0,
    project.handover ? 2 : 0,
    project.bedrooms.length ? 2 : 0,
    project.propertyTypes.length ? 1 : 0,
    project.lifestyles.length ? 1 : 0,
    project.brochure ? 1 : 0,
    project.sourceUpdatedAt ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

export function sonuTimelineFitScore(project: ProjectRecord, timeline: string) {
  const requested = timeline.toLowerCase().trim();
  if (!requested || /\b(?:exploring|flexible)\b/.test(requested)) return 0;
  const recordedHandover = handoverQuarter(project.handover);
  if (recordedHandover === null) return -5;
  const delta = recordedHandover - catalogueQuarter;
  const completed = /^completed$/i.test(project.handover) || delta < 0;

  if (/\boff[- ]?plan\b/.test(requested)) {
    if (completed) return -5;
    return delta >= 2 ? 8 : 3;
  }
  if (/\b(?:immediately|as soon as possible|asap|ready|move[- ]?in)\b/.test(requested)) {
    if (completed) return 20;
    if (delta <= 0) return 14;
    if (delta === 1) return 6;
    return -Math.min(18, delta * 3);
  }

  const yearWindow = /\bwithin\s+(?:a|one|1)\s+year\b/.test(requested);
  const months = yearWindow ? 12 : Number(requested.match(/\bwithin\s+(\d+)\s+months?\b/)?.[1] || 0);
  if (months) {
    const window = Math.max(1, Math.ceil(months / 3));
    if (completed) return 14;
    if (delta <= window) return 12;
    if (delta === window + 1) return 4;
    return -Math.min(16, (delta - window) * 3);
  }

  const referenceYear = catalogueReferenceDate.getUTCFullYear();
  if (/\bthis year\b/.test(requested)) {
    const yearEnd = referenceYear * 4 + 3;
    if (completed) return 12;
    if (recordedHandover <= yearEnd) return 10;
    if (recordedHandover <= yearEnd + 2) return 2;
    return -Math.min(14, (recordedHandover - yearEnd) * 2);
  }
  if (/\bnext year\b/.test(requested)) {
    const nextYearEnd = (referenceYear + 1) * 4 + 3;
    if (completed) return 4;
    if (recordedHandover <= nextYearEnd) return 10;
    return -Math.min(12, (recordedHandover - nextYearEnd) * 2);
  }

  const requestedQuarter = handoverQuarter(requested);
  if (requestedQuarter !== null) {
    if (completed) return 4;
    if (recordedHandover <= requestedQuarter) return 10;
    return -Math.min(14, (recordedHandover - requestedQuarter) * 3);
  }
  return 0;
}

export function sonuProjectMeetsTimelinePreference(project: ProjectRecord, timeline: string) {
  const requested = timeline.toLowerCase().trim();
  if (!requested || /\b(?:exploring|flexible)\b/.test(requested)) return true;
  const recordedHandover = handoverQuarter(project.handover);
  if (recordedHandover === null) return false;
  const delta = recordedHandover - catalogueQuarter;
  const completed = /^completed$/i.test(project.handover) || delta < 0;

  if (/\boff[- ]?plan\b/.test(requested)) return !completed && delta > 0;
  if (/\b(?:immediately|as soon as possible|asap|ready|move[- ]?in)\b/.test(requested)) {
    return completed || delta <= 0;
  }
  const yearWindow = /\bwithin\s+(?:a|one|1)\s+year\b/.test(requested);
  const months = yearWindow ? 12 : Number(requested.match(/\bwithin\s+(\d+)\s+months?\b/)?.[1] || 0);
  if (months) return completed || delta <= Math.max(1, Math.ceil(months / 3));

  const referenceYear = catalogueReferenceDate.getUTCFullYear();
  if (/\bthis year\b/.test(requested)) return completed || recordedHandover <= referenceYear * 4 + 3;
  if (/\bnext year\b/.test(requested)) return completed || recordedHandover <= (referenceYear + 1) * 4 + 3;
  const requestedQuarter = handoverQuarter(requested);
  return requestedQuarter === null || completed || recordedHandover <= requestedQuarter;
}

function sonuPurposeFitScore(project: ProjectRecord, profile: GraceDiscoveryProfile, query: string) {
  const lifestyles = project.lifestyles.join(" ").toLowerCase();
  const types = project.propertyTypes.join(" ").toLowerCase();
  const handover = handoverQuarter(project.handover);
  const delta = handover === null ? null : handover - catalogueQuarter;
  let score = 0;

  if (profile.purpose === "home") {
    if (/\b(?:family|children|kids|school)\b/i.test(query) && /green nature/.test(lifestyles)) score += 6;
    if (/\b(?:family|children|kids)\b/i.test(query) && /villa|townhouse/.test(types)) score += 3;
  } else if (profile.purpose === "holiday") {
    if (/beachfront/.test(lifestyles)) score += 7;
    else if (/waterfront/.test(lifestyles)) score += 5;
    if (/branded residences/.test(lifestyles)) score += 2;
  } else if (profile.purpose === "investment") {
    score += Math.min(6, sonuProjectEvidenceScore(project));
    if (profile.investmentPriority === "Rental income") {
      if (delta !== null && delta < 0) score += 9;
      else if (delta !== null && delta <= 4) score += 4;
      else if (delta !== null && delta > 8) score -= 4;
    } else if (profile.investmentPriority === "Capital growth") {
      if (project.paymentPlan) score += 3;
      if (delta !== null && delta >= 2 && delta <= 16) score += 2;
    } else if (profile.investmentPriority === "Balanced") {
      if (project.paymentPlan) score += 2;
      if (delta !== null && delta <= 6) score += 2;
    }
  }
  return score;
}

export function sonuProjectFitScore(
  project: ProjectRecord,
  profile: GraceDiscoveryProfile,
  query: string,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const name = project.name.toLowerCase();
  const haystack = [
    project.name,
    project.developer,
    project.emirate,
    project.area,
    ...project.bedrooms,
    ...project.propertyTypes,
    ...project.lifestyles,
  ].join(" ").toLowerCase();
  let score = terms.reduce((total, term) => total + (haystack.includes(term) ? 2 : 0), 0);
  if (query.toLowerCase().includes(name) && name.length > 3) score += 20;
  if (/\b(?:beach|beachfront|waterfront|sea)\b/i.test(query) && /beach|waterfront/i.test(haystack)) score += 8;
  if (/\b(?:family|children|kids|school)\b/i.test(query) && /villa|townhouse|green|community/i.test(haystack)) score += 6;
  if (/\b(?:villa|townhouse|penthouse|mansion|apartment|studio)\b/i.test(query)) {
    const requestedType = query.match(/\b(?:villa|townhouse|penthouse|mansion|apartment|studio)s?\b/i)?.[0] || "";
    if (requestedType && haystack.includes(requestedType.toLowerCase().replace(/s$/, ""))) score += 10;
  }
  if (profile.location) {
    score += haystack.includes(profile.location.toLowerCase()) ? 24 : -7;
  }
  if (profile.propertyType) {
    const requestedType = profile.propertyType.toLowerCase();
    score += haystack.includes(requestedType) ? 18 : -12;
  }
  if (profile.bedrooms) {
    const requestedBedrooms = profile.bedrooms.match(/\d+/)?.[0] || (profile.bedrooms === "Studio" ? "studio" : "");
    score += requestedBedrooms && haystack.includes(requestedBedrooms) ? 14 : -6;
  }
  const budget = numericProfileBudget(profile.budget);
  if (budget) {
    const price = reliablePrice(project.startingPrice);
    if (price > 0) {
      if (price > budget) score -= 30;
      else {
        score += 6;
        if (price <= budget * .9) score += 2;
      }
    }
  }
  return score
    + sonuTimelineFitScore(project, profile.timeline)
    + sonuPurposeFitScore(project, profile, query)
    + sonuAdvisoryScore(project, decisionContext, profile.propertyType)
    + sonuProjectEvidenceScore(project);
}

export function sonuRankedProjectSuggestions(messages: GraceChatMessage[]) {
  const query = messages.filter((message) => message.role === "user").map((message) => message.content).join(" ");
  const profile = extractGraceDiscoveryProfile(messages);
  const decisionContext = extractSonuDecisionContext(messages, registryDeveloperNames);
  if (graceDiscoveryCompleteness(profile) < 4 && requirementSpecificity(messages) < 3) return [];
  const ranked = registry.projects
    .filter((project) =>
      !project.archived
      && reliablePrice(project.startingPrice) > 0
      && projectMeetsRecordedRequirements(project, profile, decisionContext),
    )
    .map((project) => ({
      project,
      score: sonuProjectFitScore(project, profile, query, decisionContext),
      evidence: sonuProjectEvidenceScore(project),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) =>
      right.score - left.score
      || right.evidence - left.evidence
      || left.project.name.localeCompare(right.project.name),
    );
  const diversified = decisionContext.compareEmirates && !profile.location
    ? [
      ...ranked.filter(({ project }, index, values) =>
        values.findIndex(({ project: candidate }) => candidate.emirate === project.emirate) === index,
      ),
      ...ranked,
    ].filter(({ project }, index, values) =>
      values.findIndex(({ project: candidate }) => candidate.slug === project.slug) === index,
    )
    : ranked;
  return diversified.slice(0, 5)
    .map(({ project }) => projectSuggestion(project));
}

const SONU_RELAXABLE_CRITERIA: Array<{
  key: keyof Pick<GraceDiscoveryProfile, "location" | "propertyType" | "bedrooms" | "budget" | "timeline">;
  label: string;
}> = [
  { key: "timeline", label: "handover window" },
  { key: "budget", label: "budget" },
  { key: "bedrooms", label: "bedroom requirement" },
  { key: "location", label: "location" },
  { key: "propertyType", label: "residence type" },
];

export function sonuNoMatchRelaxations(
  profile: GraceDiscoveryProfile,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  const profileRelaxations = SONU_RELAXABLE_CRITERIA.filter(({ key }) => {
    if (!profile[key]) return false;
    const relaxedProfile = { ...profile, [key]: "" };
    return registry.projects.some((project) =>
      !project.archived
      && reliablePrice(project.startingPrice) > 0
      && projectMeetsRecordedRequirements(project, relaxedProfile, decisionContext),
    );
  }).map(({ key, label }) => ({ key, label }));
  const developerRelaxation = decisionContext.developerStrict && registry.projects.some((project) =>
    !project.archived
    && reliablePrice(project.startingPrice) > 0
    && projectMeetsRecordedRequirements(project, profile, {
      ...decisionContext,
      developerStrict: false,
    }),
  ) ? [{ key: "developer" as const, label: "developer" }] : [];
  return [...profileRelaxations, ...developerRelaxation];
}

function naturalList(values: string[], conjunction: "and" | "or" = "or") {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} ${conjunction} ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, ${conjunction} ${values.at(-1)}`;
}

export function sonuNoMatchReply(
  profile: GraceDiscoveryProfile,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  const confirmedCriteria = [
    profile.location,
    profile.propertyType,
    profile.bedrooms,
    profile.budget ? `a development entry price within ${profile.budget}` : "",
    profile.timeline ? `delivery ${profile.timeline}` : "",
    decisionContext.developerStrict && decisionContext.preferredDevelopers.length
      ? `a project by ${naturalList(decisionContext.preferredDevelopers)}`
      : "",
  ].filter(Boolean);
  const relaxations = sonuNoMatchRelaxations(profile, decisionContext).map(({ label }) => label);
  const criteria = naturalList(confirmedCriteria, "and");
  const diagnosis = relaxations.length
    ? `The current records produce possible alternatives only if the ${naturalList(relaxations)} is broadened.`
    : "The current records do not produce a credible alternative by relaxing only one confirmed criterion.";
  return `I do not have a current PSR catalogue record that satisfies ${criteria || "all of those requirements"} together, and I would rather show no card than force a weaker match. ${diagnosis} Which single criterion would you like to broaden first?`;
}

const projectContext = sonuRankedProjectSuggestions;

function compactConversation(messages: GraceChatMessage[]) {
  const recentAssistantReplies: string[] = [];
  return messages.filter((message) => {
    if (message.role !== "assistant") return true;
    const normalized = message.content.toLowerCase().replace(/\s+/g, " ").trim();
    if (recentAssistantReplies.includes(normalized)) return false;
    recentAssistantReplies.push(normalized);
    if (recentAssistantReplies.length > 6) recentAssistantReplies.shift();
    return true;
  });
}

function explicitAdvisorContinuation(messages: GraceChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  if (/\b(?:do not|don't|not ready to|no need to|without)\b.{0,36}\b(?:contact|call|email|whatsapp|advisor|agent|viewing|book|reserve|speak)\b/i.test(latest)) {
    return false;
  }
  return /\b(?:contact|call|email|whatsapp|advisor|agent|viewing|book|reserve|send me|speak to)\b/i.test(latest);
}

function latestUserMessage(messages: GraceChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function conversationalPlan(value: string) {
  return value
    .replace(/Payment\s*Plan/gi, "payment plan")
    .replace(/Years?\s+Post-Handover/gi, (match) => match.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

export function isUnitPriceChallenge(message: string) {
  const hasPrice = /\b(?:price|cost|aed|million|mn|starting|from)\b|(?:^|\s)\d+(?:\.\d+)?\s*m\b/i.test(message)
    || /\b\d+(?:\.\d+)?\b[\s\S]{0,24}\b\d+[\s-]*(?:bed|bedroom|br)s?\b/i.test(message);
  const challengesClaim = /\b(?:really|correct|accurate|verify|does that mean|is that|are you saying|are you sure|you sure)\b/i.test(message)
    && !/\b(?:not sure|unsure)\b/i.test(message);
  const attachesAmountToLayout =
    /\b\d+(?:\.\d+)?\s*(?:m|mn|million)?\s*(?:is\s+that\s+)?for\s+(?:a\s+)?(?:studio|\d+[\s-]*(?:bed|bedroom|br)s?)\b/i.test(message);
  return hasPrice && (challengesClaim || attachesAmountToLayout);
}

function normalizedProjectTokens(value: string) {
  const ignored = new Set([
    "apartments", "residences", "residence", "project", "properties", "property",
    "dubai", "estate", "tower", "hills", "marina", "island", "harbour", "creek",
    "city", "palm", "beach", "the", "and", "for",
  ]);
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !ignored.has(token));
}

function mentionedProject(
  message: string,
  profile?: ReturnType<typeof extractGraceDiscoveryProfile>,
) {
  const normalized = message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const requestedLocation = profile?.location.toLowerCase() || "";
  const candidates = registry.projects
    .filter((project) => !project.archived)
    .map((project) => {
      const name = project.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const tokens = normalizedProjectTokens(project.name);
      const matchedTokens = tokens.filter((token) => normalized.split(" ").includes(token));
      const locationMatch = requestedLocation
        && `${project.name} ${project.area} ${project.emirate}`.toLowerCase().includes(requestedLocation);
      return {
        project,
        score: name.length > 4 && normalized.includes(name)
          ? 100 + name.length
          : matchedTokens.length * 12
            + matchedTokens.join("").length
            + (matchedTokens.length > 0 && locationMatch ? 40 : 0),
      };
    })
    .filter(({ score }) => score >= 12)
    .sort((left, right) => right.score - left.score);
  return candidates[0]?.project || null;
}

export function unitPriceChallengeReply(
  message: string,
  profile: ReturnType<typeof extractGraceDiscoveryProfile>,
  projects: ProjectSuggestion[],
) {
  if (!isUnitPriceChallenge(message)) return "";
  const target = mentionedProject(message, profile);
  const bedroomLabel = profile.bedrooms
    ? profile.bedrooms.replace(/\s+bedrooms?$/i, "-bedroom")
    : "selected";
  const targetPrice = target ? formatPrice(target.startingPrice).replace(/^From /, "") : "";
  const targetBedroomRecorded = target ? projectHasBedroom(target, profile.bedrooms) : false;
  const comparable = projects
    .filter((project) => project.slug !== target?.slug)
    .slice(0, 2)
    .map((project) => project.name);
  const nextStep = comparable.length
    ? `${comparable.join(" and ")} have the requested bedroom mix recorded, but their displayed figures are also project entry prices; their live ${bedroomLabel} prices still need confirmation.`
    : `I should only present a ${bedroomLabel} price after the matching unit schedule or live availability has been verified.`;

  if (!target) {
    return `You’re right to challenge that. The figures on these cards are project-level entry prices, not verified ${bedroomLabel} unit prices. ${nextStep}`;
  }
  const bedroomFact = targetBedroomRecorded
    ? `The project record confirms that ${profile.bedrooms || "that residence type"} is part of the mix, but it does not attach ${targetPrice} to that layout.`
    : `The current record does not contain a verified ${bedroomLabel} layout or a bedroom-level price schedule for ${target.name}.`;
  const removal = targetBedroomRecorded
    ? ""
    : " I’ve removed it from the bedroom-qualified shortlist.";
  return `You’re right to question ${target.name}. ${targetPrice} is its recorded project entry price, not a verified ${bedroomLabel} quote. ${bedroomFact}${removal} ${nextStep}`;
}

function unitPriceQuickReplies(profile: ReturnType<typeof extractGraceDiscoveryProfile>) {
  const bedrooms = profile.bedrooms || "2 bedrooms";
  const budget = profile.budget || "my current budget";
  return [
    { label: "Verify live units", value: `Ask an advisor to verify live ${bedrooms} units within ${budget}` },
    { label: "Keep strict budget", value: `Keep ${budget} strict and show only projects with recorded ${bedrooms}` },
    { label: "Compare nearby", value: `Compare nearby communities for ${bedrooms} within ${budget}` },
  ];
}

function projectFacts(project: ProjectSuggestion) {
  return [
    project.startingPrice,
    project.paymentPlan && project.paymentPlan !== "Available on request"
      ? conversationalPlan(project.paymentPlan)
      : "",
    project.handover && project.handover !== "To be confirmed"
      ? project.handover.toLowerCase() === "completed" ? "completed" : `handover ${project.handover}`
      : "",
  ].filter(Boolean).join(", ").replace(/^From\b/, "from");
}

function asSentenceReason(value: string) {
  return /^(?:ADGM|AED|Bayut|DIFC|PSR)\b/.test(value)
    ? value
    : value.charAt(0).toLowerCase() + value.slice(1);
}

function advisoryStatement(value: string) {
  return /^(?:Bayut\b.*\bprojects\b|Developer matches\b|The project\b)/.test(value)
    ? value
    : `It also reflects ${asSentenceReason(value)}`;
}

export function sonuRecommendationBasis(
  project: ProjectSuggestion,
  profile: GraceDiscoveryProfile,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  const advisory = sonuAdvisoryEvidence(project, decisionContext, profile.propertyType);
  const fitSignals = [
    profile.location ? `Recorded in ${profile.location}` : "",
    profile.propertyType ? `Includes ${profile.propertyType.toLowerCase()} residences` : "",
    profile.bedrooms ? `Includes ${profile.bedrooms} in the recorded mix` : "",
    profile.budget ? `Development entry price is within the ${profile.budget} planning ceiling` : "",
    profile.timeline && project.handover !== "To be confirmed"
      ? `Recorded handover is ${project.handover}; compare it with the requested ${profile.timeline} timing`
      : "",
    ...advisory.fitSignals,
  ].filter(Boolean);
  const evidenceGaps = [
    "Live availability is not supplied by the catalogue",
    profile.bedrooms ? `The displayed entry price is not a verified ${profile.bedrooms} unit price` : "",
    profile.investmentPriority === "Rental income"
      ? "Verified rent, occupancy, service charges and net yield are not supplied"
      : "",
    profile.investmentPriority === "Capital growth"
      ? "Comparable transactions, competing supply and exit pricing are not supplied"
      : "",
    ...advisory.evidenceGaps,
  ].filter(Boolean);
  return {
    fitSignals,
    evidenceGaps,
    verificationStep: profile.purpose === "investment"
      ? "Verify the selected unit economics and comparable evidence before ranking expected returns"
      : "Verify the selected unit, total acquisition cost and practical suitability before a commitment",
  };
}

export function contextualProjectReply(
  projects: ProjectSuggestion[],
  messages: GraceChatMessage[],
  question: GraceDiscoveryQuestion | null,
  decisionContext: SonuDecisionContext,
) {
  const latest = latestUserMessage(messages);
  const profile = extractGraceDiscoveryProfile(messages);
  if (!projects.length) return "";

  if (/\b(?:payment plan|flexible|instalments?|installments?)\b/i.test(latest)) {
    const withPlans = projects.filter((project) =>
      project.paymentPlan && project.paymentPlan !== "Available on request",
    );
    if (!withPlans.length) {
      return `The unit-specific payment schedules for these options still need live confirmation, so I would not rank one as more flexible yet. ${question?.text || "Would you like me to narrow the shortlist another way?"}`;
    }
    const staged = withPlans
      .map((project) => ({
        project,
        firstStage: Number(project.paymentPlan.match(/\b(\d{1,3})\s*\/\s*\d{1,3}\b/)?.[1] || NaN),
      }))
      .filter(({ firstStage }) => Number.isFinite(firstStage))
      .sort((left, right) => left.firstStage - right.firstStage);
    const lowestFirstStage = staged[0]?.firstStage;
    const matches = lowestFirstStage === undefined
      ? [withPlans[0]]
      : staged.filter(({ firstStage }) => firstStage === lowestFirstStage).map(({ project }) => project);
    const plan = conversationalPlan(matches[0].paymentPlan);
    const names = matches.map((project) => project.name);
    const named = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    const otherPlans = withPlans
      .filter((project) => !matches.includes(project))
      .map((project) => `${project.name} shows ${conversationalPlan(project.paymentPlan)}`);
    const unconfirmed = projects.filter((project) => !withPlans.includes(project)).map((project) => project.name);
    const comparison = otherPlans.length ? ` ${otherPlans.join("; ")}.` : "";
    const caveat = unconfirmed.length
      ? ` ${unconfirmed.join(" and ")} still ${unconfirmed.length === 1 ? "needs" : "need"} a unit-specific schedule before I would call ${unconfirmed.length === 1 ? "it" : "them"} more flexible.`
      : "";
    const rationale = lowestFirstStage === undefined
      ? ""
      : ` That is the lowest recorded first-stage share among these options.`;
    return `${named} ${names.length === 1 ? "currently shows" : "currently show"} ${plan}.${rationale}${comparison}${caveat} I would still have an advisor reconfirm the exact instalment dates against the chosen unit.`;
  }

  if (/\b(?:recommend|recommendation|which project|best fit)\b|\bwhat would you (?:genuinely )?(?:pick|choose|recommend)\b|\b(?:which|best|choose|choice|fits?).*(?:best|why|recommend|choose|fit)\b/i.test(latest)) {
    const project = projects[0];
    const advisory = sonuAdvisoryEvidence(project, decisionContext, profile.propertyType);
    const fitSignals = [
      ...advisory.fitSignals.slice(0, 2).map(asSentenceReason),
      profile.location ? `it stays within your ${profile.location} search` : "",
      profile.bedrooms ? `the catalogue records ${profile.bedrooms} in its residence mix` : "",
      profile.budget ? `its development entry point sits within your ${profile.budget} planning limit` : "",
      profile.timeline && project.handover !== "To be confirmed"
        ? `the recorded ${project.handover} handover is compatible with your ${profile.timeline} timing`
        : "",
    ].filter(Boolean);
    const fit = naturalList(fitSignals.slice(0, 3), "and") || "it best matches the criteria you have confirmed";
    const terms = [
      project.startingPrice.replace(/^From\b/, "from"),
      project.paymentPlan && project.paymentPlan !== "Available on request"
        ? conversationalPlan(project.paymentPlan)
        : "",
      project.handover && project.handover !== "To be confirmed"
        ? project.handover.toLowerCase() === "completed" ? "completed" : `handover ${project.handover}`
        : "",
    ].filter(Boolean).join(", ");
    const advisoryQuestion = sonuAdvisoryFollowUp(decisionContext);
    const nextStep = question
      ? `One detail would sharpen that view: ${question.text.charAt(0).toLowerCase()}${question.text.slice(1)}`
      : advisoryQuestion || "Would you like me to compare it with the next strongest recorded option?";
    const materialGap = advisory.evidenceGaps[0] || (profile.investmentPriority === "Rental income"
      ? "live availability, bedroom-specific pricing, verified rent, occupancy, service charges and net yield"
      : profile.investmentPriority === "Capital growth"
        ? "live availability, bedroom-specific pricing, comparable transactions, competing supply and exit pricing"
        : "live availability, service charges and the bedroom-specific unit price");
    const tradeOffLead = /\b(?:catch|downside|trade[- ]?off|concern|risk)\b/i.test(latest)
      ? "The catch is"
      : "What stops me calling it a final recommendation is";
    return `Based on what you have told me, I would start with ${project.name}. It earns that place because ${fit}. The recorded terms are ${terms || "still subject to live confirmation"}. ${tradeOffLead} ${materialGap.charAt(0).toLowerCase()}${materialGap.slice(1)}; I would verify that before you rely on the comparison. ${nextStep}`;
  }

  if (/\bcompare\b/i.test(latest) && projects.length > 1) {
    const [first, second] = projects;
    return `${first.name} currently shows ${projectFacts(first)}, while ${second.name} shows ${projectFacts(second)}. The better choice depends on whether you value the lower entry price, payment structure or delivery timing most.`;
  }

  if (/\b(?:price|cost|how much)\b/i.test(latest)) {
    const priced = projects.slice(0, 3).map((project) => `${project.name} ${project.startingPrice.toLowerCase()}`);
    return `${priced.join("; ")}. These are indicative starting prices, so the selected unit and live availability still need advisor confirmation.`;
  }

  if (/\b(?:handover|ready|move)\b/i.test(latest)) {
    const dated = projects
      .filter((project) => project.handover && project.handover !== "To be confirmed")
      .slice(0, 3)
      .map((project) => `${project.name}: ${project.handover}`);
    if (dated.length) return `For delivery timing, the current records show ${dated.join("; ")}. I would verify the exact building and unit status before treating those dates as final.`;
  }

  return "";
}

function resultReply(
  projects: ProjectSuggestion[],
  messages: GraceChatMessage[],
  question: ReturnType<typeof graceDiscoveryNextQuestion>,
  contactQuestion: string,
  previousSuggestions: ProjectSuggestion[] = [],
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  const profile = extractGraceDiscoveryProfile(messages);
  const names = projects.slice(0, 3).map((project) => project.name);
  const [leadingName, ...alternativeNames] = names;
  const bedroomType = [profile.bedrooms.replace(/\s+bedrooms?$/i, "-bedroom"), profile.propertyType.toLowerCase()]
    .filter(Boolean)
    .join(" ");
  const criteria = [
    bedroomType ? `your ${bedroomType} search` : "your property search",
    profile.location ? `in ${profile.location}` : "",
    profile.budget ? `with a target budget of ${profile.budget}` : "",
  ].filter(Boolean).join(" ");
  const sameShortlist = previousSuggestions.length > 0
    && projects.slice(0, 3).map((project) => project.slug).join("|")
      === previousSuggestions.slice(0, 3).map((project) => project.slug).join("|");
  if (sameShortlist && question) {
    const priority = decisionContext.priorities.includes("rental-income")
      ? "income"
      : decisionContext.priorities.includes("resale-liquidity")
        ? "resale flexibility"
        : decisionContext.household
          ? "daily family practicality"
          : "fit";
    return `That changes how I would weigh the options, even though the strongest recorded shortlist is unchanged. I’ll give more weight to ${priority}. ${question.text}`;
  }
  const priceScope = profile.bedrooms
    ? ` Each project record includes ${profile.bedrooms}, but the displayed figure is the project entry price—not a confirmed price for that bedroom type.`
    : " The displayed figures are project entry prices and still require unit-level confirmation.";
  const advisory = sonuAdvisoryEvidence(projects[0], decisionContext, profile.propertyType);
  const advisorySignal = advisory.fitSignals[0]
    ? ` ${advisoryStatement(advisory.fitSignals[0])}.`
    : "";
  const alternatives = alternativeNames.length
    ? ` ${naturalList(alternativeNames, "and")} ${alternativeNames.length === 1 ? "is" : "are"} worth keeping as ${alternativeNames.length === 1 ? "an alternative" : "alternatives"}, rather than treating the first card as an automatic winner.`
    : "";
  const opening = `For ${criteria}, ${leadingName} is the strongest recorded starting point.${alternatives}${priceScope}${advisorySignal}`;
  if (contactQuestion) return `${opening} ${contactQuestion}`;
  if (question) return `${opening} ${question.text}`;
  return `${opening} ${sonuAdvisoryFollowUp(decisionContext) || "Which option would you like me to analyse or compare first?"}`;
}

function normalizedReply(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isFreshReply(candidate: string, messages: GraceChatMessage[]) {
  const normalized = normalizedReply(candidate);
  if (!normalized) return false;
  return !messages
    .filter((message) => message.role === "assistant")
    .slice(-6)
    .some((message) => normalizedReply(message.content) === normalized);
}

function mentionsDiscoveryTopic(candidate: string, question: GraceDiscoveryQuestion) {
  const patterns: Record<GraceDiscoveryQuestion["key"], RegExp> = {
    purpose: /\b(home|holiday|investment|purpose|live)\b/i,
    propertyType: /\b(property type|apartment|villa|townhouse|penthouse|residence)\b/i,
    bedrooms: /\b(bed|bedroom|studio)\b/i,
    budget: /\b(budget|spend|price range|aed)\b/i,
    location: /\b(emirate|community|location|area|dubai|abu dhabi|ras al khaimah)\b/i,
    timeline: /\b(when|timeline|move|reserve|ready|handover)\b/i,
    investmentPriority: /\b(rental|income|yield|capital|growth|balance|priority)\b/i,
  };
  return patterns[question.key].test(candidate);
}

function conversationalDiscoveryReply(
  candidate: string | undefined,
  messages: GraceChatMessage[],
  question: GraceDiscoveryQuestion,
) {
  const reply = clean(candidate, 1_200);
  if (!reply || !reply.includes("?") || !isFreshReply(reply, messages)) return "";
  if (/\b(?:good place to start|clear starting point|budget ceiling|how many bedrooms should i work with|understood)\b/i.test(reply)) return "";
  return mentionsDiscoveryTopic(reply, question) ? reply : "";
}

function conversationalTurnReply(
  message: string,
  question: GraceDiscoveryQuestion | null,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  if (!question) {
    if (/^\s*(?:thanks|thank you|cheers)\b[.! ]*$/i.test(message)) {
      return "You’re welcome. Tell me what you’d like to compare next.";
    }
    return "";
  }
  const unsure = /\b(?:not sure|don't know|do not know|unsure|no idea|still thinking)\b/i.test(message);
  const priceObjection = /\b(?:too expensive|too much|lower budget|cheaper|can't afford|cannot afford|bring (?:it|the price) down)\b/i.test(message);
  if (question.key === "budget" && priceObjection) {
    return "Absolutely—we can bring the price down. Which range feels more comfortable?";
  }
  if (question.key === "budget" && unsure) {
    return "No problem. We can start with a comfortable range and adjust it later—which band feels closest for now?";
  }
  if (question.key === "location" && unsure) {
    return "No problem. I can compare the strongest locations for you—should I keep the search across the UAE or begin with Dubai?";
  }
  if (question.key === "timeline" && unsure) {
    return "That’s completely fine. Shall I treat the timing as flexible while we compare the best options?";
  }
  if (question.key === "investmentPriority" && unsure) {
    return "No problem. A balanced approach is a sensible starting point—shall I weigh rental income and capital growth equally?";
  }
  if (unsure) {
    return `That’s fine—we can keep it simple. ${naturalDiscoveryReply({
      purpose: "",
      propertyType: "",
      bedrooms: "",
      budget: "",
      location: "",
      timeline: "",
      investmentPriority: "",
    }, question, decisionContext)}`;
  }
  if (/^\s*(?:thanks|thank you|cheers)\b[.! ]*$/i.test(message)) {
    return `You’re welcome. ${question.text}`;
  }
  return "";
}

export function naturalDiscoveryReply(
  profile: ReturnType<typeof extractGraceDiscoveryProfile>,
  question: GraceDiscoveryQuestion,
  decisionContext: SonuDecisionContext = EMPTY_SONU_DECISION_CONTEXT,
) {
  switch (question.key) {
    case "purpose":
      return "Let’s begin with what the property needs to do for you. Is this your own home, a holiday residence or an investment?";
    case "propertyType":
      if (decisionContext.household === "children" || decisionContext.household === "family") {
        return "For your family, would you rather prioritise the convenience of an apartment or the space and privacy of a villa or townhouse?";
      }
      return profile.purpose === "investment"
        ? "For the investment, should I focus on apartments, villas or townhouses? The income pattern and exit market differ between them."
        : "Would an apartment, villa, townhouse or penthouse suit the way you plan to live?";
    case "bedrooms":
      return profile.propertyType
        ? `I’ll keep the search to ${profile.propertyType.toLowerCase()} options. How many bedrooms do you genuinely need?`
        : "How many bedrooms do you need?";
    case "budget":
      return profile.bedrooms
        ? `${profile.bedrooms.replace(/^1\b/, "One").replace(/^2\b/, "Two").replace(/^3\b/, "Three").replace(/^4\b/, "Four").replace(/^5\b/, "Five").replace(/^6\b/, "Six")} gives me a useful brief. What total purchase budget feels comfortable without stretching you?`
        : "What price range feels comfortable?";
    case "location":
      if (decisionContext.destinations.length) {
        return `Since ${naturalList(decisionContext.destinations)} is part of your routine, should I keep the search in the same district or compare communities with practical access to it?`;
      }
      if (decisionContext.priorities.includes("schools") || decisionContext.priorities.includes("healthcare")) {
        return "The location needs to work for daily family life, not just look good on a map. Do you have an emirate or community in mind, or should I compare suitable areas?";
      }
      return "Do you have an emirate or community in mind, or should I compare the strongest locations for this brief?";
    case "timeline":
      return profile.purpose === "investment"
        ? "When should the investment begin working for you: ready soon, within the year or after a longer off-plan hold?"
        : "When would the home realistically need to be ready: soon, within the year or are you flexible?";
    case "investmentPriority":
      return "What should drive the decision: income soon, longer-term growth or a measured balance of both?";
    default:
      return question.text;
  }
}

function marketComparisonReply(message: string) {
  if (!/\b(?:why|rather than|versus|vs\.?|compare)\b/i.test(message)) return "";
  if (!/\b(?:london|new york|singapore|miami|paris|uk|united kingdom)\b/i.test(message)) return "";
  return "Neither market is automatically better. I would compare total acquisition cost, net rental income after service charges, financing, currency exposure and exit liquidity on the same basis: the UAE may suit an investor seeking newer stock and a growth-oriented market, while London offers a longer-established resale and rental ecosystem. Is your priority income, capital growth or a balance of both?";
}

function knowledgeFallback(message: string, siteKnowledge = rankPsrSiteKnowledge(message, 3)) {
  if (siteKnowledge.length) return psrKnowledgeFallback(message, siteKnowledge);
  if (/\b(?:news|latest|market update|market trend|research|article)\b/i.test(message)) {
    return "I can surface PSR market research and the source material behind it. Start with the monthly market dashboard for transaction momentum, then compare it with the investor and new-launch guides below. Which emirate or community should I focus the research on?";
  }
  if (/\b(?:mortgage|finance|loan|interest rate|down payment)\b/i.test(message)) {
    return "For a UAE mortgage decision, compare the total cash needed at reservation and transfer, the bank valuation, loan-to-value eligibility, monthly payment sensitivity and any developer instalments that fall before completion. Approval and exact terms depend on the buyer, bank and selected unit. Are you buying as a UAE resident or non-resident?";
  }
  if (/\b(?:service charge|net yield|gross yield|roi|rental return)\b/i.test(message)) {
    if (/\bdubai marina\b/i.test(message) && /\bbusiness bay\b/i.test(message)) {
      return "Compare like-for-like completed apartments using achieved annual rent, not advertised rent. In Dubai Marina, weigh the waterfront or view premium against building age and service cost; in Business Bay, separate canal-side and walkable stock from inland buildings and account for the active handover pipeline. Use net yield as annual rent minus service charge, vacancy, management and maintenance, divided by the full acquisition cost. Which bedroom size should I model?";
    }
    return "A headline yield is not enough: start with evidence-led annual rent, then deduct service charges, vacancy, management, maintenance and recurring operating costs before comparing net return against the full acquisition cost. The same assumptions must be used across every option. Which project or community should I calculate around?";
  }
  if (/\b(?:off[- ]plan|ready property|ready home|secondary market)\b/i.test(message)) {
    return "Off-plan can offer staged payments and earlier entry into a developing location, while a ready property provides visible condition and current rental evidence. The better choice depends on cash-flow timing, delivery risk, holding period and the depth of the resale or leasing market. Is your priority income now or longer-term growth?";
  }
  if (/\b(?:developer|due diligence|safe project|reliable)\b/i.test(message)) {
    return "Developer due diligence should cover delivery history, construction progress, escrow and project registration, specification consistency, current workload, service-charge expectations and the exact sale documentation. A strong brand does not replace unit-level verification. Which developer would you like me to examine?";
  }
  if (/\b(?:school|family|children|community|commute|accessibility)\b/i.test(message)) {
    return "For a family search, I would weigh the exact school journey, healthcare access, parks, daily retail, commute patterns, unit layout and the community’s completed infrastructure—not just the district name. Share the household size and main daily destination, and I can narrow the location logic.";
  }
  if (/\b(?:price per square foot|price\/sqft|aed\/sqft|psf)\b/i.test(message)) {
    return "Price per square foot is useful only when the comparison controls for property type, building age, view, floor, condition, service structure and transaction date. I would compare the selected unit with recent like-for-like evidence and its own community benchmark. Which project or area should I review?";
  }
  return "I can help with UAE project selection, community trade-offs, payment structures, mortgage planning, rental analysis, developer due diligence and client research. Give me the project, community or decision you are working through, and I’ll answer it directly.";
}

function knowledgeQuickReplies(message: string) {
  if (/\b(?:service charge|net yield|gross yield|roi|rental return)\b/i.test(message)) {
    return [
      { label: "1 bedroom", value: "Compare 1-bedroom apartments" },
      { label: "2 bedrooms", value: "Compare 2-bedroom apartments" },
      { label: "Show the formula", value: "Show me the net-yield calculation method" },
    ];
  }
  if (/\b(?:mortgage|finance|loan|interest rate|down payment)\b/i.test(message)) {
    return [
      { label: "UAE resident", value: "I am buying as a UAE resident" },
      { label: "Non-resident", value: "I am buying as a non-resident" },
      { label: "Estimate costs", value: "Show me the costs I should model" },
    ];
  }
  if (/\b(?:news|latest|market update|market trend|research|article|quarter|monthly)\b/i.test(message)) {
    return [
      { label: "Dubai", value: "Focus the research on Dubai" },
      { label: "Abu Dhabi", value: "Focus the research on Abu Dhabi" },
      { label: "Compare UAE", value: "Compare the main UAE markets" },
    ];
  }
  return [];
}

function wantsResearchArticles(message: string) {
  return /\b(?:news|latest|market update|market trend|research|article|quarter|monthly)\b/i.test(message);
}

export function wantsKnowledgeAnswer(message: string) {
  const hasKnowledgeTopic = /\b(?:news|latest|market update|market trend|research|article|quarter|monthly|mortgage|finance|loan|interest rate|down payment|service charge|net yield|gross yield|roi|rental return|off[- ]plan|ready property|ready home|secondary market|developer|development|project|due diligence|safe project|reliable|school|family|children|community|commute|accessibility|price per square foot|price\/sqft|aed\/sqft|psf|handover|payment plan)\b/i.test(message);
  if (!hasKnowledgeTopic) return false;
  const asksDirectly = /\?|^\s*(?:what|why|how|which|where|when|who|can|could|would|should|is|are|do|does|tell me|explain|compare|research|review|check|calculate|evaluate|assess|show me|give me|help me understand)\b/i.test(message);
  const compactTopic = message.trim().split(/\s+/).length <= 7
    && /^(?:mortgage|finance|service charges?|net yield|gross yield|roi|payment plan|handover|market (?:news|update|research)|developer due diligence)\b/i.test(message.trim());
  return asksDirectly || compactTopic;
}

export function wantsProjectSelection(message: string) {
  if (/\b(?:recommend(?:ation)?|shortlist|show me|find me|most sensible|best (?:fit|match|option|project)|which (?:project|development|property|option))\b/i.test(message)) {
    return true;
  }
  const profile = extractGraceDiscoveryProfile([{ role: "user", content: message }]);
  const discoverySignal = Boolean(
    profile.purpose
    || profile.propertyType
    || profile.bedrooms
    || profile.budget
    || profile.location,
  );
  return discoverySignal && /\b(?:i (?:want|need)|i(?:'m| am) looking for|looking for)\b/i.test(message);
}

export function wantsClientReport(message: string) {
  const documentRequested = /\b(?:report|pdf|brief|proposal|comparison|sales offer)\b/i.test(message);
  const actionRequested = /\b(?:generate|create|prepare|build|draft|make|send|email|want|need|give|receive|get|have)\b/i.test(message);
  return documentRequested && actionRequested;
}

export function graceSocialReply(message: string, agentName = "") {
  const normalized = clean(message, MAX_MESSAGE_LENGTH)
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
  const addressed = normalized
    .replace(/^(?:(?:sonu|grace)[\s,:-]+)+/i, "")
    .replace(/(?:[\s,:-]+(?:sonu|grace))$/i, "")
    .trim();
  const firstName = clean(agentName, 100).split(" ")[0];

  if (/^(?:thanks|thank you|thank you very much|many thanks|cheers)$/.test(addressed)) {
    return "You’re very welcome. I’m here whenever you need me.";
  }
  if (/^(?:bye|goodbye|see you|speak soon|talk soon)$/.test(addressed)) {
    return "Goodbye for now. I’ll be here when you’re ready to continue.";
  }
  if (/^(?:how are you|how are you doing|how is it going|how's it going|what's up|whats up)$/.test(addressed)) {
    return "I’m well, thank you. What are you hoping to find or work through today?";
  }
  if (/^(?:(?:i am|i'm)\s+)?(?:good|great|well|fine|okay|ok|doing well|doing great|not bad)(?:[, ]+(?:thanks|thank you))?(?:[, ]+(?:and you|how about you))?$/.test(addressed)) {
    return /\b(?:and you|how about you)\b/.test(addressed)
      ? "I’m well too, thank you. What are you hoping to find?"
      : "Glad to hear it. What are you hoping to find?";
  }
  if (/^(?:(?:i am|i'm)\s+)?(?:not great|not good|having a difficult day|having a bad day)$/.test(addressed)) {
    return "I’m sorry to hear that. We can take this at your pace—what would you like help with today?";
  }
  if (/^(?:hi|hello|hey|hiya|hello there|good morning|good afternoon|good evening|salaam|salam|marhaba)$/.test(addressed)) {
    return firstName
      ? `Hello, ${firstName}. Good to see you. What are you working through today?`
      : "Hello. Good to meet you. What are you hoping to find?";
  }
  return "";
}

function conciseQuestionPrompt(question: GraceDiscoveryQuestion) {
  switch (question.key) {
    case "purpose":
      return "should this purchase behave like a home, a holiday place or an investment?";
    case "propertyType":
      return "should I compare apartments, villas, townhouses or penthouses?";
    case "bedrooms":
      return "how many bedrooms should I use for the search?";
    case "budget":
      return "what maximum purchase budget should I keep the shortlist within?";
    case "location":
      return "which emirate or community should I prioritise?";
    case "timeline":
      return "when does the property need to be ready or reserved?";
    case "investmentPriority":
      return "should I weight income, capital growth or a balanced case?";
    default:
      return question.text.charAt(0).toLowerCase() + question.text.slice(1);
  }
}

export function sonuHarmlessDetourReply(
  message: string,
  question: GraceDiscoveryQuestion | null,
) {
  const value = clean(message, MAX_MESSAGE_LENGTH);
  if (!question) return "";
  if (/\b(?:hamburger|burger|cheeseburger)\b/i.test(value)) {
    return `Tiny detour: toast the bun, sear a seasoned patty until browned, melt the cheese at the end, then stack lettuce, tomato, sauce and pickles. Now before lunch wins the negotiation, ${conciseQuestionPrompt(question)}`;
  }
  if (/\b(?:coffee|karak|tea)\b/i.test(value) && /\b(?:make|order|get|drink)\b/i.test(value)) {
    return `A quick coffee or karak break is absolutely allowed; property decisions are better when nobody is hungry or under-caffeinated. When you are ready, ${conciseQuestionPrompt(question)}`;
  }
  if (/\b(?:tell me a joke|make me laugh|joke)\b/i.test(value)) {
    return `Light one: a great property shortlist is like a good joke; if you have to explain too much, something probably needs checking. Back to the brief, ${conciseQuestionPrompt(question)}`;
  }
  return "";
}

function graceStartsFreshConversation(message: string) {
  const normalized = clean(message, MAX_MESSAGE_LENGTH)
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim()
    .replace(/^(?:grace[\s,:-]+)+/i, "")
    .replace(/(?:[\s,:-]+grace)$/i, "")
    .trim();
  return /^(?:hi|hello|hey|hiya|hello there|good morning|good afternoon|good evening|salaam|salam|marhaba)$/.test(normalized);
}

export function shouldStartNewGraceBrief(previousBrief: GraceChatMessage[], message: string) {
  if (!previousBrief.length) return true;
  if (/\b(?:start over|start again|new search|fresh search|forget (?:that|those|the old)|different search)\b/i.test(message)) return true;

  const previous = extractGraceDiscoveryProfile(previousBrief);
  const incoming = extractGraceDiscoveryProfile([{ role: "user", content: message }]);
  const conflicts = ([
    ["purpose", previous.purpose, incoming.purpose],
    ["propertyType", previous.propertyType, incoming.propertyType],
    ["bedrooms", previous.bedrooms, incoming.bedrooms],
    ["budget", previous.budget, incoming.budget],
    ["location", previous.location, incoming.location],
  ] as const).filter(([, before, after]) => before && after && before !== after);
  const explicitCorrection = /\b(?:instead|actually|change|switch|rather|now looking|this time)\b/i.test(message);
  return conflicts.length >= 2 || (explicitCorrection && conflicts.length >= 1);
}

export function parseAiResponse(value: unknown): GraceAiResponse | null {
  const parsedRoutes = (candidate: unknown) => Array.isArray(candidate)
    ? [...new Set(candidate.map((route) => clean(route, 240)).filter((route) => route.startsWith("/") && !route.startsWith("//")))].slice(0, 5)
    : [];
  try {
    if (value && typeof value === "object") {
      const parsed = value as Partial<GraceAiResponse>;
      const reply = clean(parsed.reply, 1_200);
      const knowledgeRoutes = parsedRoutes(parsed.knowledgeRoutes);
      return reply ? { reply, leadIntent: Boolean(parsed.leadIntent), ...(knowledgeRoutes.length ? { knowledgeRoutes } : {}) } : null;
    }
    if (typeof value !== "string") return null;
    const withoutFence = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? withoutFence.slice(start, end + 1) : withoutFence) as Partial<GraceAiResponse>;
    const reply = clean(parsed.reply, 1_200);
    const knowledgeRoutes = parsedRoutes(parsed.knowledgeRoutes);
    return reply ? { reply, leadIntent: Boolean(parsed.leadIntent), ...(knowledgeRoutes.length ? { knowledgeRoutes } : {}) } : null;
  } catch {
    return null;
  }
}

function requirementSpecificity(messages: GraceChatMessage[]) {
  const text = messages.filter((message) => message.role === "user").map((message) => message.content).join(" ");
  return [
    /\b(?:studio|apartment|villa|townhouse|penthouse|mansion|duplex)\b/i.test(text),
    /\b(?:studio|\d+\s*(?:bed|bedroom|br)s?)\b/i.test(text),
    /\b(?:aed|budget|million|\d+(?:\.\d+)?\s*m)\b/i.test(text),
    /\b(?:dubai|abu dhabi|ras al khaimah|sharjah|ajman|fujairah|umm al quwain|island|marina|downtown|jumeirah|meydan|creek|community)\b/i.test(text),
    /\b(?:ready|off[- ]plan|handover|move|month|quarter|year|immediately)\b/i.test(text),
  ].filter(Boolean).length;
}

function leadNotificationHtml({
  id,
  name,
  email,
  phone,
  message,
  project,
}: {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  project: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#111318;color:#f4f6f8;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#1b1e24;border-top:4px solid #aab1bc">
      <tr><td style="padding:40px">
        <p style="margin:0 0 22px;color:#c8cdd5;font-size:11px;font-weight:700;letter-spacing:2.4px">PSR · SONU LEAD</p>
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:30px;font-weight:400">${escapeHtml(project || "Property search")}</h1>
        <p style="margin:0 0 26px;color:#aeb4bd">Lead #${id} · Captured by Sonu</p>
        <p style="line-height:1.7"><strong>${escapeHtml(name)}</strong><br>${escapeHtml(email || "Email not provided")}<br>${escapeHtml(phone || "Phone not provided")}</p>
        <p style="margin:26px 0 8px;color:#c8cdd5;font-size:11px;font-weight:700;letter-spacing:1.5px">CONVERSATION SUMMARY</p>
        <p style="margin:0;line-height:1.75;white-space:pre-line">${escapeHtml(message)}</p>
        <a href="https://psrhomes.ae/leads" style="display:inline-block;margin-top:28px;padding:14px 20px;background:#f4f6f8;color:#08090b;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:1.2px">OPEN LEADS</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export class GracePublicAgent {
  private ctx: DurableObjectState;
  private env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  private async readState() {
    const stored = await this.ctx.storage.get<Partial<GraceState>>("state");
    const generatedAt = Date.parse(stored?.briefGeneratedAt || "");
    const briefIsFresh = Number.isFinite(generatedAt) && Date.now() - generatedAt < 23 * 60 * 60 * 1_000;
    return {
      ...INITIAL_STATE,
      ...stored,
      messages: compactConversation(stored?.messages || []),
      briefMessages: compactConversation(stored?.briefMessages || []),
      requestTimestamps: stored?.requestTimestamps || [],
      suggestions: (stored?.suggestions || []).map((project) => ({
        ...project,
        priceScope: "project" as const,
        paymentPlan: project.paymentPlan ? conversationalPlan(project.paymentPlan) : "Available on request",
      })),
      processedRequestIds: stored?.processedRequestIds || [],
      briefDownloadUrl: briefIsFresh ? stored?.briefDownloadUrl || "" : "",
      briefSent: briefIsFresh && Boolean(stored?.briefSent),
      briefGeneratedAt: briefIsFresh ? stored?.briefGeneratedAt || "" : "",
      briefSignature: briefIsFresh ? stored?.briefSignature || "" : "",
    };
  }

  private response(
    state: GraceState,
    extra: Record<string, unknown> = {},
    status = 200,
    agent: { name: string; title: string } | null = null,
  ) {
    const profile = extractGraceDiscoveryProfile(state.briefMessages);
    const nextQuestion = graceDiscoveryNextQuestion(profile, state.lastQuestionKey);
    return Response.json({
      messages: state.messages,
      leadCaptured: state.leadCaptured,
      leadId: state.leadId,
      suggestions: state.suggestions,
      quickReplies: state.messages.length ? graceQuickReplies(nextQuestion, profile) : [],
      filterIntent: graceFilterIntent(profile),
      agent,
      briefAction: state.briefDownloadUrl ? {
        type: "download_pdf",
        label: "Download private PDF",
        href: state.briefDownloadUrl,
      } : null,
      ...extra,
    }, {
      status,
      headers: { "cache-control": "private, no-store" },
    });
  }

  private async saveLead(messages: GraceChatMessage[], projectReference: string) {
    const details = extractGraceLeadDetails(messages);
    const name = details.name || (details.email ? details.email.split("@")[0].replace(/[._-]+/g, " ") : "Website visitor");
    const transcript = messages
      .filter((message) => message.role === "user")
      .map((message) => `Visitor: ${message.content}`)
      .join("\n")
      .slice(0, 5_000);
    const inserted = await this.env.DB.prepare(
      `INSERT INTO haus_grace_leads
       (name, email, phone, message, source, property_reference, consent, status)
       VALUES (?, ?, ?, ?, 'grace-ai-chat', ?, 1, 'new')
       RETURNING id`,
    ).bind(name, details.email, details.phone, transcript, projectReference || null).first<{ id: number }>();
    if (!inserted?.id) throw new Error("lead_insert_failed");
    const leadRatSync = pushWebsiteLeadToLeadRat(this.env as AgentEnv, {
      websiteLeadId: inserted.id,
      name,
      email: details.email,
      phone: details.phone,
      message: transcript,
      source: "grace-ai-chat",
      propertyReference: projectReference,
      propertyTitle: projectReference,
    });

    let notified = false;
    if (this.env.EMAIL) {
      const notification = {
        from: { email: "admin@psrhomes.ae", name: "Sonu at PSR Homes" },
        ...(details.email ? { replyTo: { email: details.email, name } } : {}),
        subject: `Sonu lead — ${projectReference || "property search"}`.slice(0, 160),
        html: leadNotificationHtml({
          id: inserted.id,
          name,
          email: details.email,
          phone: details.phone,
          message: transcript,
          project: projectReference,
        }),
        text: [
          `Sonu lead #${inserted.id}`,
          `Name: ${name}`,
          `Email: ${details.email || "Not provided"}`,
          `Phone: ${details.phone || "Not provided"}`,
          `Project: ${projectReference || "General property search"}`,
          "",
          transcript,
          "",
          "Open: https://psrhomes.ae/leads",
        ].join("\n"),
      } satisfies Omit<EmailMessageBuilder, "to">;
      const deliveries = await Promise.allSettled(INTERNAL_LEAD_RECIPIENTS.map((to) =>
        this.env.EMAIL.send({
          to,
          ...notification,
        }),
      ));
      notified = deliveries.some((delivery) => delivery.status === "fulfilled");
      deliveries.forEach((delivery, index) => {
        if (delivery.status === "fulfilled") return;
        console.error(JSON.stringify({
          event: "grace_lead_notification_failed",
          leadId: inserted.id,
          recipient: INTERNAL_LEAD_RECIPIENTS[index],
          message: delivery.reason instanceof Error ? delivery.reason.message.slice(0, 300) : "Email delivery failed",
        }));
      });
    }
    const leadRatResult = await leadRatSync;
    await this.env.DB.prepare(
      "UPDATE haus_grace_leads SET status = ? WHERE id = ?",
    ).bind(notified ? "notified" : "notification_failed", inserted.id).run();
    console.log(JSON.stringify({
      event: "grace_lead_captured",
      leadId: inserted.id,
      projectReference: projectReference || null,
      notified,
      leadRatSynced: leadRatResult.ok,
    }));
    return inserted.id;
  }

  async fetch(request: Request): Promise<Response> {
    const state = await this.readState();
    const agentEmail = clean(request.headers.get("x-grace-agent-email"), 180).toLowerCase();
    const agentName = clean(request.headers.get("x-grace-agent-name"), 100);
    const agentTitle = clean(request.headers.get("x-grace-agent-title"), 100);
    const agent = agentEmail ? { name: agentName || "PSR advisor", title: agentTitle || "Property Advisor" } : null;
    if (request.method === "GET") return this.response(state, {}, 200, agent);
    if (request.method !== "POST") return this.response(state, { error: "Method not allowed." }, 405, agent);

    const now = Date.now();
    const recent = state.requestTimestamps.filter((timestamp) => now - timestamp < 120_000);
    if (recent.length >= MAX_REQUESTS_PER_TWO_MINUTES) {
      return this.response(state, { error: "Please wait a moment before sending another message." }, 429, agent);
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 12_000) return this.response(state, { error: "Message is too large." }, 413, agent);
    let payload: { message?: unknown; requestId?: unknown };
    try {
      payload = await request.json() as { message?: unknown; requestId?: unknown };
    } catch {
      return this.response(state, { error: "Invalid request." }, 400, agent);
    }
    const message = clean(payload.message, MAX_MESSAGE_LENGTH);
    if (!message) return this.response(state, { error: "Write a message for Sonu." }, 400, agent);
    const reportRequested = wantsClientReport(message);
    const requestId = clean(payload.requestId, 80);
    if (requestId && state.processedRequestIds.includes(requestId)) {
      return this.response(state, {}, 200, agent);
    }

    const userMessage: GraceChatMessage = { role: "user", content: message, createdAt: new Date(now).toISOString() };
    const messages = compactConversation([...state.messages, userMessage]).slice(-MAX_MESSAGES);
    const socialReply = graceSocialReply(message, agent?.name);
    const freshConversation = Boolean(socialReply && graceStartsFreshConversation(message));
    const startsNewBrief = !socialReply && shouldStartNewGraceBrief(state.briefMessages, message);
    const activeReportRequest = !socialReply && (reportRequested || (!startsNewBrief && state.reportRequested));
    const briefMessages = socialReply
      ? freshConversation ? [] : state.briefMessages
      : startsNewBrief
        ? [userMessage]
        : [...state.briefMessages, userMessage].slice(-12);
    const rankedProjects = socialReply ? [] : projectContext(briefMessages);
    const profile = extractGraceDiscoveryProfile(briefMessages);
    const decisionContext = extractSonuDecisionContext(briefMessages, registryDeveloperNames);
    const invalidPropertyBedrooms = !gracePropertyBedroomCombinationIsValid(profile.propertyType, profile.bedrooms);
    const invalidPropertyBudget = !gracePropertyBudgetCombinationIsValid(profile.propertyType, profile.budget);
    const invalidPropertyRequest = invalidPropertyBedrooms || invalidPropertyBudget;
    const projects = invalidPropertyRequest ? [] : rankedProjects;
    const longTermMemory = agentEmail
      ? await readSupabaseAgentMemory(this.env as Env & { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string }, agentEmail)
      : null;
    const completeness = graceDiscoveryCompleteness(profile);
    const primaryDiscoveryQuestion = graceDiscoveryNextQuestion(profile);
    const discoveryQuestion = graceDiscoveryNextQuestion(profile, startsNewBrief ? "" : state.lastQuestionKey);
    const harmlessDetourReply = sonuHarmlessDetourReply(message, primaryDiscoveryQuestion || discoveryQuestion);
    const details = extractGraceLeadDetails(briefMessages);
    const finderPreferences = graceFinderPreferencesFromDiscovery(profile);
    const criteriaReady = completeness === 6 && !discoveryQuestion && Boolean(finderPreferences);
    const knownIntent = (!startsNewBrief && !freshConversation && state.intentDetected) || details.intent;
    const needsOpenAnswer = /\b(?:why|explain|rather than|versus|vs\.?|compare\s+(?:the\s+)?(?:uae|dubai|abu dhabi).*(?:london|new york|singapore|miami|paris)|what do you think)\b/i.test(message);
    const marketReply = marketComparisonReply(message);
    const projectSelectionRequested = wantsProjectSelection(message);
    const strictNoMatch = !invalidPropertyRequest
      && !socialReply
      && projectSelectionRequested
      && !projects.length
      && requirementSpecificity(briefMessages) >= 4;
    const knowledgeQuestion = !invalidPropertyRequest
      && wantsKnowledgeAnswer(message)
      && !projectSelectionRequested;
    const siteKnowledge = knowledgeQuestion ? rankPsrSiteKnowledge(message, 5) : [];
    const advisoryKnowledgeReply = knowledgeQuestion
      ? sonuAdvisoryKnowledgeReply(message, decisionContext)
      : "";
    const priceChallenge = isUnitPriceChallenge(message);
    const wantsAdvisor = explicitAdvisorContinuation(messages);
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        reply: { type: "string" },
        leadIntent: { type: "boolean" },
        knowledgeRoutes: { type: "array", items: { type: "string" }, maxItems: 5 },
      },
      required: ["reply", "leadIntent", "knowledgeRoutes"],
    };
    let aiResponse: GraceAiResponse | null = null;
    if (
      this.env.AI
      && !socialReply
      && !harmlessDetourReply
      && !marketReply
      && !activeReportRequest
      && !priceChallenge
      && !invalidPropertyRequest
      && !advisoryKnowledgeReply
      && !projectSelectionRequested
      && !strictNoMatch
    ) {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error("Sonu response timed out")), 10_000);
        });
        const result = await Promise.race([
          this.env.AI.run(AI_MODEL, {
            messages: [
              {
                role: "system",
                content: [
                  "You are Sonu, the warm, concise AI property concierge for PSR Homes in the UAE.",
                  ...SONU_SALES_CHARTER,
                  "Have a natural conversation, not a questionnaire. Acknowledge what the visitor just said in a few genuine words, answer any direct question first, then ask at most one useful next question.",
                  "Respond to the meaning behind the visitor's words, not by echoing their sentence. Connect a family concern to daily practicality, an investment concern to timing and evidence, and uncertainty to a simple decision path.",
                  "Carry earlier answers forward. Resolve a genuine contradiction gently, but never restart the brief merely because the visitor asks which option is best or refers to a card as 'this one' or 'which one'.",
                  "When asked for a judgement, give a clear provisional view before asking for more information. Explain why it leads for this visitor, not why it is universally best, and name the most important trade-off in plain language.",
                  "Use contractions and varied sentence structure. Do not repeat the full brief every turn or reuse stock phrases such as 'that is a good place to start', 'understood' or 'I can help'.",
                  "If the visitor is unsure, reassure them and offer a simple choice. If they object to a price or option, respond to the objection before moving on.",
                  "For an own-home search, prioritise household fit, daily practicality and timing. For an investment search, prioritise comparable economics, evidence quality, cash-flow timing and exit assumptions without promising a return.",
                  "Treat budget, location, residence type, bedroom count, handover timing and an explicitly constrained developer as hard requirements. Treat family life, school or healthcare access, commute, parks, privacy, lifestyle and investment strategy as weighted priorities unless the visitor explicitly makes one non-negotiable.",
                  "When schools, hospitals or a daily destination matter, distinguish a community-level signal from a verified building-level journey. Ask for the exact destination when that would materially change the ranking.",
                  "A dated area ROI is a third-party projected gross community signal only. It is never the selected unit's achieved rent, occupancy or net yield, and it must not be presented as guaranteed or current beyond its supplied validity date.",
                  "If the visitor asks to compare emirates, explain the trade-off instead of assuming Dubai is automatically best. Consider entry price, family practicality, income timing, employment and infrastructure context, and exit liquidity using only supplied evidence.",
                  "Help visitors narrow a home or investment search using only the supplied project records and the visitor's own information.",
                  "Never invent availability, unit prices, ROI, rental yield, service charges, distances, regulatory status, launch dates or finance approval.",
                  "Every supplied startingPrice is the entry price for the development as a whole. It never proves that the visitor's requested bedroom type is available at that price.",
                  "Never use apartment bedroom inventory to satisfy a villa, townhouse or mansion request. Villa and townhouse requests start at two bedrooms. Mansion searches start at four bedrooms and use AED 5 million as a planning floor before live unit verification. Correct an implausible bedroom or budget combination before suggesting projects.",
                  "If a visitor questions a price, explicitly distinguish project entry price from bedroom-level unit price and acknowledge any earlier overstatement.",
                  "Use polished plain English, no emojis and no markdown headings. Use up to five concise sentences and 130 words when a careful explanation is needed.",
                  "Never repeat a question that the visitor has already answered.",
                  "If a nextBestQuestion is supplied, ask about that topic and no other missing field.",
                  "Ask for contact information only when allowContactRequest is true. Otherwise let the visitor continue privately at their own pace.",
                  "When project records are supplied, name one to three of those exact projects and explain the fit using only their supplied facts.",
                  "For recommendations, matchingPsrProjects is the complete visible shortlist. Never recommend a project outside it. A site-knowledge answer may mention a project only when its name appears in siteKnowledge.",
                  "Use each recommendationBasis to explain why an option entered the shortlist and what remains unverified. An evidence gap is not proof that a project performs badly; it means you must not claim that outcome yet.",
                  "For a site, project, service or market-research question, answer only from siteKnowledge. Cite the supporting PSR route in knowledgeRoutes. Do not quote a statistic, price, date, availability claim, tax rate or legal conclusion unless it appears in the supplied facts.",
                  "Use psrCatalogueSnapshot only to understand the breadth and date of the PSR catalogue. Its counts are catalogue coverage, not proof of live inventory.",
                  "A project status such as sold out, archived, upcoming or on request must be stated exactly and must never be rewritten as available.",
                  "When contact details or permission are missing, do not claim an enquiry was submitted. Never mention another brokerage or source website.",
                  agent
                    ? `The visitor is a signed-in PSR advisor: ${agent.name}, ${agent.title}. Speak as a capable colleague, address them by first name only when natural, and use the remembered conversation. ${longTermMemory?.summary ? `Their private long-term working memory says: ${longTermMemory.summary}` : ""}`
                    : "",
                  "Set leadIntent true only when the visitor expresses plausible buying, investing, viewing, availability, finance or property-selection intent.",
                ].filter(Boolean).join(" "),
              },
              {
                role: "user",
                content: JSON.stringify({
                  conversation: messages.map(({ role, content }) => ({ role, content })),
                  visitorBrief: profile,
                  advisoryBrief: decisionContext,
                  nextBestQuestion: discoveryQuestion?.text || null,
                  allowContactRequest: wantsAdvisor,
                  psrCatalogueSnapshot: psrCatalogueContext(),
                  matchingPsrProjects: projects.slice(0, 3).map((project) => ({
                    ...project,
                    startingPriceScope: "Development-wide entry price; not a bedroom-level quote.",
                    recommendationBasis: sonuRecommendationBasis(project, profile, decisionContext),
                  })),
                  siteKnowledge: siteKnowledge.map((item) => ({
                    kind: item.kind,
                    title: item.title,
                    psrRoute: item.route,
                    summary: item.summary,
                    facts: item.facts,
                    evidenceLabel: item.evidenceLabel,
                    updatedAt: item.updatedAt,
                  })),
                }),
              },
            ],
            max_tokens: 420,
            temperature: 0.35,
            repetition_penalty: 1.12,
            response_format: { type: "json_schema", json_schema: schema },
          }) as Promise<AiChatResult>,
          timeout,
        ]);
        const candidate = parseAiResponse(result?.response);
        aiResponse = candidate && sonuReplyPassesGrounding(
          candidate.reply,
          projects,
          siteKnowledge,
          {
            allowContactRequest: wantsAdvisor,
            allowSiteKnowledgeProjects: knowledgeQuestion,
          },
        ) ? candidate : null;
        if (candidate && !aiResponse) {
          console.warn(JSON.stringify({ event: "grace_ai_response_rejected", reason: "sales_or_grounding_guardrail" }));
        }
      } catch (error) {
        console.error(JSON.stringify({
          event: "grace_ai_response_failed",
          message: error instanceof Error ? error.message.slice(0, 300) : "AI response failed",
        }));
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    }

    const intentDetected = knownIntent || Boolean(aiResponse?.leadIntent);
    const contactQuestion = wantsAdvisor && completeness >= 3
      ? graceLeadNextQuestion(details, intentDetected)
      : "";
    let leadId = state.leadId;
    let leadCaptured = state.leadCaptured;
    const matchedProject = projects.find((project) => {
      const content = briefMessages.map((item) => item.content).join(" ").toLowerCase();
      return content.includes(project.name.toLowerCase()) || content.includes(project.slug.replaceAll("-", " "));
    });

    if (!socialReply && !leadCaptured && graceLeadIsQualified(details, intentDetected)) {
      try {
        leadId = await this.saveLead(briefMessages, matchedProject?.slug || "");
        leadCaptured = true;
      } catch (error) {
        console.error(JSON.stringify({
          event: "grace_lead_capture_failed",
          message: error instanceof Error ? error.message.slice(0, 300) : "Lead capture failed",
        }));
      }
    }

    let briefDownloadUrl = startsNewBrief ? "" : state.briefDownloadUrl;
    let briefSent = startsNewBrief ? false : state.briefSent;
    let briefGeneratedAt = startsNewBrief ? "" : state.briefGeneratedAt;
    let briefSignature = startsNewBrief ? "" : state.briefSignature;
    let reportGenerationError = "";
    const nextBriefSignature = finderPreferences
      ? JSON.stringify({ email: details.email, preferences: finderPreferences })
      : "";
    if (
      activeReportRequest
      && !agent
      && criteriaReady
      && details.name
      && details.email
      && details.consent
      && leadCaptured
      && leadId
      && finderPreferences
      && (!briefDownloadUrl || briefSignature !== nextBriefSignature)
    ) {
      try {
        const generated = await generateGraceClientBrief({
          env: this.env,
          leadId,
          clientName: details.name,
          email: details.email,
          preferences: finderPreferences,
        });
        briefDownloadUrl = generated.downloadUrl;
        briefSent = generated.sent;
        briefGeneratedAt = new Date().toISOString();
        briefSignature = nextBriefSignature;
      } catch (error) {
        reportGenerationError = error instanceof Error ? error.message : "The report could not be generated.";
        console.error({ event: "sonu_brief_generation_failed", leadId, message: reportGenerationError.slice(0, 300) });
      }
    }

    const naturalTurnReply = conversationalTurnReply(message, discoveryQuestion, decisionContext);
    const priceReply = unitPriceChallengeReply(message, profile, projects);
    const allowedKnowledgeRoutes = new Set(siteKnowledge.map((item) => item.route));
    const groundedKnowledgeRoutes = (aiResponse?.knowledgeRoutes || []).filter((route) => allowedKnowledgeRoutes.has(route));
    let reply = aiResponse?.reply || knowledgeFallback(message, siteKnowledge);
    if (socialReply) {
      reply = socialReply;
    } else if (activeReportRequest) {
      if (agent) {
        reply = "I’ll carry this into the PSR report studio with the relevant projects prefilled. Confirm the client and unit-level evidence there, then the workspace will generate the PDF for review, download or approved email delivery.";
      } else if (briefDownloadUrl) {
        reply = briefSent
          ? `Your private PSR report is ready and has been emailed to ${details.email}. The secure download below remains available for 24 hours.`
          : "Your private PSR report is ready. The secure download below remains available for 24 hours; email delivery is pending, so I have kept the document available here.";
      } else if (reportGenerationError) {
        reply = reportGenerationError.startsWith("No active catalogue records")
          ? "I couldn’t find an active PSR catalogue record that satisfies every confirmed criterion, so I won’t pad the report with weaker matches. Tell me which requirement you would consider broadening, or I can arrange an advisor review."
          : "I have your confirmed brief, but the report could not be completed just now. I have kept your requirements securely and you can ask me to try again in a moment.";
      } else if (!criteriaReady && discoveryQuestion) {
        reply = naturalDiscoveryReply(profile, discoveryQuestion, decisionContext);
      } else if (!details.name || !details.email) {
        reply = "I have enough property detail to prepare the report. What full name and email address should I place on the private brief?";
      } else if (!details.consent) {
        reply = `May I use ${details.email} to send your private PSR report and let the advisory team follow up on this search?`;
      } else if (!leadCaptured || !leadId) {
        reply = "I have the complete brief, but I could not secure the report request just now. Please try again in a moment.";
      } else {
        reply = "I’m preparing the private report from the criteria and catalogue records you confirmed, with each source date and evidence gap shown explicitly.";
      }
    } else if (invalidPropertyBedrooms) {
      reply = /^mansion$/i.test(profile.propertyType)
        ? "A one-bedroom mansion would not be a credible property match. PSR mansion searches start at four bedrooms, and I won’t substitute an apartment or ordinary villa. Should I search for four bedrooms or five-plus bedrooms?"
        : "Villas and townhouses in the PSR catalogue begin at two bedrooms. I won’t substitute a one-bedroom apartment for a landed-home request. Would 2, 3, 4 or 5+ bedrooms suit you?";
    } else if (invalidPropertyBudget) {
      reply = `${profile.budget || "That budget"} is not a credible mansion acquisition budget in current PSR records. I use AED 5 million as a planning floor, not a live unit quote. Should I search within AED 5–10 million or above AED 10 million?`;
    } else if (marketReply) {
      reply = marketReply;
    } else if (harmlessDetourReply) {
      reply = harmlessDetourReply;
    } else if (knowledgeQuestion) {
      reply = advisoryKnowledgeReply || (
        aiResponse?.reply && (!siteKnowledge.length || groundedKnowledgeRoutes.length)
          ? aiResponse.reply
          : knowledgeFallback(message, siteKnowledge)
      );
    } else if (priceReply) {
      reply = priceReply;
    } else if (strictNoMatch) {
      reply = sonuNoMatchReply(profile, decisionContext);
    } else if (naturalTurnReply) {
      reply = naturalTurnReply;
    } else if (intentDetected && projects.length) {
      reply = contextualProjectReply(projects, briefMessages, discoveryQuestion, decisionContext)
        || resultReply(
          projects,
          briefMessages,
          discoveryQuestion,
          !leadCaptured ? contactQuestion : "",
          state.suggestions,
          decisionContext,
        );
    } else if (intentDetected && discoveryQuestion) {
      reply = needsOpenAnswer && aiResponse?.reply
        ? aiResponse.reply
        : conversationalDiscoveryReply(aiResponse?.reply, messages, discoveryQuestion)
          || naturalDiscoveryReply(profile, discoveryQuestion, decisionContext);
    } else if (intentDetected && !projects.length) {
      reply = sonuNoMatchReply(profile, decisionContext);
    } else if (!leadCaptured && contactQuestion) {
      reply = contactQuestion;
    }
    if (leadCaptured && !state.leadCaptured && !activeReportRequest) {
      reply = projects.length
        ? `I have saved your requirements and sent them to the PSR advisory desk. Your strongest matching project cards remain below for review.`
        : "I have saved your requirements and sent them to the PSR advisory desk.";
    }
    if (!socialReply && !activeReportRequest && graceLeadIsQualified(details, intentDetected) && !leadCaptured) {
      reply = "I have your requirements, but I could not submit them just now. Please use the enquiry form on this page or try again in a moment.";
    }

    const assistantMessage: GraceChatMessage = {
      role: "assistant",
      content: clean(reply, 1_200),
      createdAt: new Date().toISOString(),
    };
    const updatedMessages = [...messages, assistantMessage].slice(-MAX_MESSAGES);
    const updatedState: GraceState = {
      messages: updatedMessages,
      briefMessages,
      intentDetected,
      leadCaptured,
      leadId,
      requestTimestamps: [...recent, now],
      lastQuestionKey: harmlessDetourReply
        ? ""
        : needsOpenAnswer && !projects.length
        ? state.lastQuestionKey
        : discoveryQuestion?.key || "",
      suggestions: projects.slice(0, 3),
      processedRequestIds: requestId
        ? [...state.processedRequestIds, requestId].slice(-24)
        : state.processedRequestIds,
      reportRequested: !agent && activeReportRequest && !briefDownloadUrl,
      briefDownloadUrl,
      briefSent,
      briefGeneratedAt,
      briefSignature,
    };
    try {
      await this.ctx.storage.put("state", updatedState);
    } catch (error) {
      console.error(JSON.stringify({
        event: "grace_state_save_failed",
        message: error instanceof Error ? error.message.slice(0, 300) : "State persistence failed",
      }));
    }
    if (agentEmail) {
      this.ctx.waitUntil(rememberSupabaseAgentTurn(
        this.env as Env & { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string },
        {
          email: agentEmail,
          displayName: agent?.name || agentEmail,
          conversationId: this.ctx.id.toString(),
          userMessage: message,
          assistantMessage: assistantMessage.content,
          projectSlugs: projects.slice(0, 12).map((project) => project.slug),
          preferences: {
            channel: "website-sonu",
            advisorTitle: agent?.title || "Property Advisor",
            currentDiscoveryProfile: profile,
          },
          previousSummary: longTermMemory?.summary,
          previousPreferences: longTermMemory?.preferences,
        },
      ));
    }

    return this.response(updatedState, {
      suggestions: updatedState.suggestions,
      articles: invalidPropertyRequest
        ? []
        : siteKnowledge.length
        ? psrKnowledgeLinks(siteKnowledge)
        : wantsResearchArticles(message) ? RESEARCH_ARTICLES.slice(0, 3) : [],
      quickReplies: socialReply
        ? []
        : priceChallenge
          ? unitPriceQuickReplies(profile)
          : knowledgeQuestion
          ? knowledgeQuickReplies(message)
          : graceQuickReplies(harmlessDetourReply ? primaryDiscoveryQuestion || discoveryQuestion : discoveryQuestion, profile),
      filterIntent: socialReply
        ? { query: "", emirate: "", propertyType: "", bedrooms: "", budget: "" }
        : graceFilterIntent(profile),
      agentAction: agent && activeReportRequest
        ? {
          type: "prepare_report",
          label: projects.length > 1 ? "Prepare project comparison" : "Prepare client report",
          href: `/agent?tool=${projects.length > 1 ? "comparison" : "proposal"}&projects=${encodeURIComponent(projects.map((project) => project.slug).join(","))}&brief=${encodeURIComponent(message.slice(0, 500))}`,
        }
        : null,
      briefAction: !agent && briefDownloadUrl
        ? {
          type: "download_pdf",
          label: "Download private PDF",
          href: briefDownloadUrl,
        }
        : null,
    }, 200, agent);
  }
}
