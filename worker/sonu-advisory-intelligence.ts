import {
  canonicalDeveloperOptions,
  developerRootSlug,
} from "../lib/developer-identity";

export type SonuAdvisoryPriority =
  | "family"
  | "schools"
  | "healthcare"
  | "green-space"
  | "business-access"
  | "central-location"
  | "walkability"
  | "metro-access"
  | "waterfront"
  | "beach"
  | "privacy"
  | "rental-income"
  | "capital-growth"
  | "resale-liquidity"
  | "short-term-rental"
  | "low-running-costs"
  | "airport-access"
  | "golf-wellness"
  | "value";

export type SonuDecisionContext = {
  priorities: SonuAdvisoryPriority[];
  preferredDevelopers: string[];
  developerStrict: boolean;
  destinations: string[];
  compareEmirates: boolean;
  household: "children" | "family" | "planning-family" | "adults" | "";
  financing: "cash" | "mortgage" | "mixed" | "";
  riskTolerance: "conservative" | "balanced" | "growth" | "";
  holdPeriod: string;
};

export type SonuProjectAdvisoryFacts = {
  name: string;
  developer: string;
  area?: string;
  emirate?: string;
  location?: string;
  propertyTypes: string[];
  lifestyles: string[];
};

type CommunityProfile = {
  name: string;
  aliases: string[];
  traits: SonuAdvisoryPriority[];
  positioning: string;
  apartmentRoi?: number;
  villaRoi?: number;
};

export type SonuMarketSignal = {
  community: string;
  propertyType: "apartment" | "villa";
  projectedGrossRoi: number;
  period: "H1 2026";
  publishedAt: "2026-07-29";
  validThrough: "2027-02-28";
  sourceLabel: "Bayut Dubai Sales Market Report H1 2026";
  sourceUrl: "https://www.bayut.com/mybayut/dubai-sales-market-report-h1-2026/";
  scope: "community and property-type projected gross ROI; not unit-level net yield";
};

const COMMUNITY_PROFILES: CommunityProfile[] = [
  {
    name: "Dubai Hills Estate",
    aliases: ["Dubai Hills Estate", "Dubai Hills"],
    traits: ["family", "schools", "healthcare", "green-space", "business-access", "resale-liquidity"],
    positioning: "an established family and park-led community with broad daily infrastructure",
    apartmentRoi: 6.30,
    villaRoi: 4.30,
  },
  {
    name: "Town Square Dubai",
    aliases: ["Town Square Dubai", "Town Square"],
    traits: ["family", "schools", "green-space", "value"],
    positioning: "a suburban family community with parks and a comparatively accessible entry segment",
    apartmentRoi: 7.45,
  },
  {
    name: "Jumeirah Village Circle",
    aliases: ["Jumeirah Village Circle", "JVC"],
    traits: ["family", "schools", "healthcare", "business-access", "resale-liquidity", "value"],
    positioning: "a mid-market residential district with broad tenant and end-user demand",
    apartmentRoi: 7.15,
    villaRoi: 6.04,
  },
  {
    name: "Business Bay",
    aliases: ["Business Bay"],
    traits: ["business-access", "central-location", "walkability", "short-term-rental", "resale-liquidity"],
    positioning: "a central mixed-use employment and residential district",
    apartmentRoi: 6.29,
  },
  {
    name: "Downtown Dubai",
    aliases: ["Downtown Dubai"],
    traits: ["business-access", "central-location", "walkability", "short-term-rental", "resale-liquidity"],
    positioning: "a central lifestyle, employment and visitor district",
    apartmentRoi: 5.46,
  },
  {
    name: "Dubai Marina",
    aliases: ["Dubai Marina"],
    traits: ["waterfront", "beach", "walkability", "metro-access", "short-term-rental", "resale-liquidity"],
    positioning: "an established waterfront district with mature transport and rental demand",
    apartmentRoi: 5.88,
  },
  {
    name: "Dubai Silicon Oasis",
    aliases: ["Dubai Silicon Oasis", "DSO"],
    traits: ["family", "schools", "healthcare", "business-access", "value"],
    positioning: "an established residential and technology district with family infrastructure",
    apartmentRoi: 8.23,
  },
  {
    name: "Dubai Sports City",
    aliases: ["Dubai Sports City", "Sports City"],
    traits: ["family", "schools", "green-space", "golf-wellness", "value"],
    positioning: "a sports-led residential district with a comparatively accessible apartment segment",
    apartmentRoi: 8.12,
  },
  {
    name: "Dubai South",
    aliases: ["Dubai South", "Emaar South"],
    traits: ["family", "schools", "airport-access", "business-access", "green-space", "value", "capital-growth"],
    positioning: "an airport, logistics and Expo-linked growth corridor with expanding residential infrastructure",
    apartmentRoi: 7.24,
    villaRoi: 4.92,
  },
  {
    name: "Arjan",
    aliases: ["Arjan"],
    traits: ["family", "schools", "healthcare", "value"],
    positioning: "a developing mid-market residential district with family services in its wider catchment",
    apartmentRoi: 7.10,
  },
  {
    name: "Al Furjan",
    aliases: ["Al Furjan"],
    traits: ["family", "schools", "green-space", "metro-access", "business-access", "resale-liquidity"],
    positioning: "an established family district with road and metro connectivity",
    apartmentRoi: 7.69,
    villaRoi: 4.56,
  },
  {
    name: "Sobha Hartland",
    aliases: ["Sobha Hartland", "Sobha Hartland II"],
    traits: ["family", "schools", "green-space", "waterfront", "business-access", "central-location"],
    positioning: "a premium central catchment with education, open-space and waterfront elements",
    apartmentRoi: 6.41,
  },
  {
    name: "Al Barari",
    aliases: ["Al Barari"],
    traits: ["family", "schools", "green-space", "privacy", "golf-wellness"],
    positioning: "a low-density, nature-led premium residential community",
    apartmentRoi: 6.48,
    villaRoi: 6.37,
  },
  {
    name: "Discovery Gardens",
    aliases: ["Discovery Gardens"],
    traits: ["family", "metro-access", "value", "rental-income"],
    positioning: "an established and transport-linked affordable apartment district",
    apartmentRoi: 9.06,
  },
  {
    name: "Jumeirah Golf Estates",
    aliases: ["Jumeirah Golf Estates"],
    traits: ["family", "schools", "green-space", "privacy", "golf-wellness"],
    positioning: "an established low-density golf and family community",
    villaRoi: 6.04,
  },
  {
    name: "DAMAC Lagoons",
    aliases: ["DAMAC Lagoons"],
    traits: ["family", "green-space", "waterfront", "value"],
    positioning: "a resort-led family villa and townhouse community",
    villaRoi: 6.09,
  },
  {
    name: "DAMAC Hills 2",
    aliases: ["DAMAC Hills 2", "Akoya by DAMAC"],
    traits: ["family", "green-space", "privacy", "value"],
    positioning: "a lower-density suburban family community with an accessible villa segment",
    villaRoi: 5.97,
  },
  {
    name: "DAMAC Hills",
    aliases: ["DAMAC Hills"],
    traits: ["family", "schools", "green-space", "golf-wellness", "resale-liquidity"],
    positioning: "an established golf-oriented family community",
    villaRoi: 4.95,
  },
  {
    name: "Tilal Al Ghaf",
    aliases: ["Tilal Al Ghaf"],
    traits: ["family", "schools", "green-space", "privacy", "waterfront"],
    positioning: "a premium family villa community organised around parks and a lagoon",
    villaRoi: 5.27,
  },
  {
    name: "Palm Jumeirah",
    aliases: ["Palm Jumeirah"],
    traits: ["waterfront", "beach", "privacy", "short-term-rental", "resale-liquidity"],
    positioning: "an established ultra-prime waterfront and visitor destination",
    apartmentRoi: 4.48,
    villaRoi: 3.95,
  },
  {
    name: "Dubailand",
    aliases: ["Dubailand", "Dubai Land Residence Complex", "DLRC"],
    traits: ["family", "schools", "green-space", "value"],
    positioning: "a broad residential growth corridor with varied family and value-led submarkets",
    villaRoi: 5.23,
  },
  {
    name: "Al Jaddaf",
    aliases: ["Al Jaddaf", "Dubai Healthcare City Phase 2"],
    traits: ["business-access", "central-location", "healthcare", "waterfront"],
    positioning: "a central creek-side district in the wider healthcare and business catchment",
  },
  {
    name: "Meydan",
    aliases: ["Meydan", "District 11 Meydan"],
    traits: ["family", "green-space", "business-access", "central-location", "privacy"],
    positioning: "a central-to-suburban residential catchment with road access to core Dubai districts",
  },
  {
    name: "Yas Island",
    aliases: ["Yas Island"],
    traits: ["family", "schools", "healthcare", "waterfront", "short-term-rental", "airport-access"],
    positioning: "an established Abu Dhabi leisure, family and visitor destination",
  },
  {
    name: "Saadiyat Island",
    aliases: ["Saadiyat Island", "Saadiyat Grove"],
    traits: ["family", "schools", "waterfront", "beach", "privacy", "resale-liquidity"],
    positioning: "a premium Abu Dhabi cultural, education and beachfront district",
  },
  {
    name: "Al Maryah Island",
    aliases: ["Al Maryah Island", "Al Maryah"],
    traits: ["business-access", "central-location", "walkability", "healthcare", "resale-liquidity"],
    positioning: "Abu Dhabi's international financial and premium mixed-use district",
  },
  {
    name: "Masdar City",
    aliases: ["Masdar City", "Masdar"],
    traits: ["family", "schools", "business-access", "airport-access", "walkability", "value"],
    positioning: "an airport-adjacent sustainability, education and employment district",
  },
  {
    name: "Al Marjan Island",
    aliases: ["Al Marjan Island", "Al Marjan"],
    traits: ["waterfront", "beach", "short-term-rental", "capital-growth"],
    positioning: "a Ras Al Khaimah resort and visitor-led coastal growth corridor",
  },
];

const PRIORITY_PATTERNS: Array<[SonuAdvisoryPriority, RegExp]> = [
  ["family", /\b(?:family|children|child|kids?|planning a family|raise a family)\b/i],
  ["schools", /\b(?:schools?|nurser(?:y|ies)|education|school run)\b/i],
  ["healthcare", /\b(?:hospitals?|healthcare|clinics?|medical)\b/i],
  ["green-space", /\b(?:parks?|green(?:ery| space)|open space|outdoors?|playground|walking trails?)\b/i],
  ["business-access", /\b(?:business centres?|business centers?|office|work|commute|employment hub|financial district)\b/i],
  ["central-location", /\b(?:central|city cent(?:re|er)|close to downtown|near downtown)\b/i],
  ["walkability", /\b(?:walkable|walkability|walk to|on foot)\b/i],
  ["metro-access", /\b(?:metro|public transport|rail access)\b/i],
  ["waterfront", /\b(?:waterfront|canal|sea view|water view|creekside)\b/i],
  ["beach", /\b(?:beach|beachfront|coastal|by the sea)\b/i],
  ["privacy", /\b(?:private|privacy|quiet|low density|secluded)\b/i],
  ["rental-income", /\b(?:rental income|net income|net rental income|cash flow|cashflow|yield|roi|return on investment|tenant demand)\b/i],
  ["capital-growth", /\b(?:capital growth|appreciation|price growth|growth potential|long[- ]term growth)\b/i],
  ["resale-liquidity", /\b(?:resale|liquidity|easy to sell|exit market|exit liquidity)\b/i],
  ["short-term-rental", /\b(?:short[- ]term rental|holiday rental|airbnb|vacation rental)\b/i],
  ["low-running-costs", /\b(?:low service charge|low running cost|low maintenance|lower fees)\b/i],
  ["airport-access", /\b(?:airport|dxb|dwc|al maktoum)\b/i],
  ["golf-wellness", /\b(?:golf|wellness|sports?|fitness|active lifestyle)\b/i],
  ["value", /\b(?:value|affordable|lower entry|best price|price conscious)\b/i],
];

const DESTINATIONS: Array<[string, RegExp]> = [
  ["Downtown Dubai", /\b(?:downtown dubai|burj khalifa|dubai mall)\b/i],
  ["DIFC", /\b(?:difc|dubai international financial centre)\b/i],
  ["Business Bay", /\bbusiness bay\b/i],
  ["Dubai Marina", /\bdubai marina\b/i],
  ["Dubai Internet City", /\b(?:dubai internet city|internet city)\b/i],
  ["Dubai Media City", /\b(?:dubai media city|media city)\b/i],
  ["Expo City Dubai", /\b(?:expo city dubai|expo city)\b/i],
  ["Jebel Ali", /\bjebel ali\b/i],
  ["Dubai International Airport", /\b(?:dubai international airport|dxb)\b/i],
  ["Al Maktoum International Airport", /\b(?:al maktoum international airport|dwc)\b/i],
  ["Dubai Healthcare City", /\b(?:dubai healthcare city|dhcc)\b/i],
  ["Dubai Academic City", /\b(?:dubai academic city|academic city)\b/i],
  ["ADGM", /\b(?:adgm|abu dhabi global market|al maryah)\b/i],
  ["Abu Dhabi city centre", /\b(?:abu dhabi city cent(?:re|er)|abu dhabi cbd|corniche)\b/i],
];

const AMBIGUOUS_DEVELOPER_PLACE_NAMES = new Set([
  "uae",
  "united arab emirates",
  "dubai",
  "abu dhabi",
  "sharjah",
  "ajman",
  "ras al khaimah",
  "rak",
  "umm al quwain",
  "fujairah",
]);

function normalized(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function includesPhrase(text: string, phrase: string) {
  const haystack = ` ${normalized(text)} `;
  const needle = normalized(phrase);
  return Boolean(needle && haystack.includes(` ${needle} `));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function naturalList(values: string[]) {
  if (values.length < 2) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function userText(messages: Array<{ role: string; content: string }>) {
  return messages.filter((message) => message.role === "user").map((message) => message.content).join(" ");
}

function explicitlyReferencesDeveloper(text: string, developer: string) {
  const normalizedText = normalized(text);
  const developerPattern = normalized(developer).replace(/\s+/g, "\\s+");
  if (!developerPattern) return false;
  return [
    new RegExp(`\\b(?:by|from|prefer(?:red)?|favour|favor|developer|developed by|built by)\\s+(?:a\\s+|an\\s+)?${developerPattern}\\b`, "i"),
    new RegExp(`\\b(?:want|need|show me|find me|looking for)\\s+(?:a\\s+|an\\s+)?${developerPattern}(?:\\b|$)`, "i"),
    new RegExp(`\\b${developerPattern}\\s+(?:only|developer|project|development|property|properties|residence|residences)\\b`, "i"),
  ].some((pattern) => pattern.test(normalizedText));
}

function mentionedDevelopers(text: string, developerNames: string[]) {
  const canonical = canonicalDeveloperOptions(developerNames);
  const canonicalByRoot = new Map(canonical.map((name) => [developerRootSlug(name), name]));
  return unique(
    developerNames
      .filter((name) => {
        const normalizedName = normalized(name);
        return !AMBIGUOUS_DEVELOPER_PLACE_NAMES.has(normalizedName)
          && includesPhrase(text, name)
          && explicitlyReferencesDeveloper(text, name);
      })
      .sort((left, right) => normalized(right).length - normalized(left).length)
      .map((name) => canonicalByRoot.get(developerRootSlug(name)) || name),
  );
}

export function extractSonuDecisionContext(
  messages: Array<{ role: string; content: string }>,
  developerNames: string[] = [],
): SonuDecisionContext {
  const text = userText(messages);
  const priorities = PRIORITY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([priority]) => priority);
  const preferredDevelopers = mentionedDevelopers(text, developerNames);
  const selectionLanguage = /\b(?:i (?:want|need|prefer)|looking for|find me|show me|recommend|shortlist|only|must be)\b/i.test(text);
  const developerConstraintLanguage = /\b(?:only|exclusively|must be|has to be|built by|developed by|from|by|prefer)\b/i.test(text);
  const brandedSelection = preferredDevelopers.some((developer) => {
    const developerPattern = normalized(developer).replace(/\s+/g, "\\s+");
    return new RegExp(`\\b(?:want|need|prefer|looking for|find me|show me)\\b.{0,60}\\b${developerPattern}\\b`, "i").test(normalized(text));
  });
  const household = /\b(?:children|child|kids?|school run)\b/i.test(text)
    ? "children"
    : /\b(?:planning a family|start a family|future family)\b/i.test(text)
      ? "planning-family"
      : /\b(?:family home|for (?:my|our|the) family|family living)\b/i.test(text)
        ? "family"
      : /\b(?:couple|retired|adults? only|single professional)\b/i.test(text)
        ? "adults"
        : "";
  const financing = /\b(?:cash and mortgage|mix of cash and mortgage|part cash)\b/i.test(text)
    ? "mixed"
    : /\b(?:mortgage|finance|loan)\b/i.test(text)
      ? "mortgage"
      : /\b(?:cash buyer|buying cash|pay cash)\b/i.test(text)
        ? "cash"
        : "";
  const riskTolerance = /\b(?:low risk|conservative|capital preservation|defensive)\b/i.test(text)
    ? "conservative"
    : /\b(?:high risk|aggressive|growth[- ]oriented|higher risk)\b/i.test(text)
      ? "growth"
      : /\b(?:balanced risk|moderate risk|balanced approach)\b/i.test(text)
        ? "balanced"
        : "";
  const holdPeriod = text.match(/\b(?:hold(?:ing)?(?: period)?(?: of| for)?\s*)?(\d{1,2})\s*(?:year|yr)s?\b/i)?.[1] || "";

  return {
    priorities: unique(priorities),
    preferredDevelopers,
    developerStrict: Boolean(preferredDevelopers.length && selectionLanguage && (developerConstraintLanguage || brandedSelection)),
    destinations: unique(DESTINATIONS.filter(([, pattern]) => pattern.test(text)).map(([destination]) => destination)),
    compareEmirates: /\b(?:compare (?:the )?(?:uae|emirates)|across (?:the )?uae|which emirate|strongest uae locations?)\b/i.test(text),
    household,
    financing,
    riskTolerance,
    holdPeriod,
  };
}

export function sonuDeveloperMatches(projectDeveloper: string, preferredDevelopers: string[]) {
  if (!preferredDevelopers.length) return true;
  const projectRoot = developerRootSlug(projectDeveloper);
  return preferredDevelopers.some((developer) => developerRootSlug(developer) === projectRoot);
}

export function sonuCommunityProfile(project: SonuProjectAdvisoryFacts) {
  const location = [project.area, project.location, project.emirate].filter(Boolean).join(" ");
  return COMMUNITY_PROFILES.find((profile) =>
    profile.aliases.some((alias) => includesPhrase(location, alias)),
  ) || null;
}

function requestedPropertyCategory(project: SonuProjectAdvisoryFacts, requestedType = "") {
  if (requestedType) {
    if (/\bvilla\b/i.test(requestedType)) return "villa" as const;
    if (/\b(?:apartment|studio|flat)\b/i.test(requestedType)) return "apartment" as const;
    return null;
  }
  const value = project.propertyTypes.join(" ").toLowerCase();
  const hasVilla = /\bvilla\b/.test(value);
  const hasApartment = /\b(?:apartment|studio|flat)\b/.test(value);
  if (hasVilla !== hasApartment) return hasVilla ? "villa" as const : "apartment" as const;
  return null;
}

export function sonuMarketSignalForProject(
  project: SonuProjectAdvisoryFacts,
  requestedType = "",
  now = new Date(),
): SonuMarketSignal | null {
  const community = sonuCommunityProfile(project);
  const propertyType = requestedPropertyCategory(project, requestedType);
  if (!community || !propertyType || now > new Date("2027-02-28T23:59:59.999Z")) return null;
  const projectedGrossRoi = propertyType === "villa" ? community.villaRoi : community.apartmentRoi;
  if (!projectedGrossRoi) return null;
  return {
    community: community.name,
    propertyType,
    projectedGrossRoi,
    period: "H1 2026",
    publishedAt: "2026-07-29",
    validThrough: "2027-02-28",
    sourceLabel: "Bayut Dubai Sales Market Report H1 2026",
    sourceUrl: "https://www.bayut.com/mybayut/dubai-sales-market-report-h1-2026/",
    scope: "community and property-type projected gross ROI; not unit-level net yield",
  };
}

function exactDestinationMatch(project: SonuProjectAdvisoryFacts, destinations: string[]) {
  const location = [project.area, project.location].filter(Boolean).join(" ");
  return destinations.find((destination) => includesPhrase(location, destination)) || "";
}

export function sonuAdvisoryScore(
  project: SonuProjectAdvisoryFacts,
  context: SonuDecisionContext,
  requestedType = "",
) {
  const community = sonuCommunityProfile(project);
  const traits = new Set(community?.traits || []);
  let score = context.priorities.reduce((total, priority) => total + (traits.has(priority) ? 5 : 0), 0);
  if (context.preferredDevelopers.length && sonuDeveloperMatches(project.developer, context.preferredDevelopers)) score += 18;
  if (context.destinations.length) {
    score += exactDestinationMatch(project, context.destinations) ? 24 : 0;
    if (!exactDestinationMatch(project, context.destinations) && (traits.has("business-access") || traits.has("central-location"))) score += 2;
  }
  if (context.household && traits.has("family")) score += 5;
  const marketSignal = context.priorities.includes("rental-income")
    ? sonuMarketSignalForProject(project, requestedType)
    : null;
  if (marketSignal) score += Math.max(0, Math.min(14, Math.round((marketSignal.projectedGrossRoi - 4) * 3)));
  return score;
}

export function sonuAdvisoryEvidence(
  project: SonuProjectAdvisoryFacts,
  context: SonuDecisionContext,
  requestedType = "",
) {
  const community = sonuCommunityProfile(project);
  const traits = new Set(community?.traits || []);
  const fitSignals: string[] = [];
  const evidenceGaps: string[] = [];
  if (context.preferredDevelopers.length && sonuDeveloperMatches(project.developer, context.preferredDevelopers)) {
    fitSignals.push(`Developer matches the stated ${context.preferredDevelopers.join(" or ")} preference`);
  }
  if (community) {
    const communityReasons = unique([
      (context.household || context.priorities.includes("family")) && traits.has("family") ? "family living" : "",
      context.priorities.includes("green-space") && traits.has("green-space") ? "parks and open space" : "",
      context.priorities.includes("business-access") && (traits.has("business-access") || traits.has("central-location"))
        ? "business access"
        : "",
      context.priorities.includes("waterfront") && traits.has("waterfront") ? "waterfront living" : "",
      context.priorities.includes("beach") && traits.has("beach") ? "beach access" : "",
    ].filter(Boolean));
    if (communityReasons.length) {
      fitSignals.push(`Community-level signals for ${naturalList(communityReasons)} in ${community.name}`);
    }
  }
  const destination = exactDestinationMatch(project, context.destinations);
  if (destination) fitSignals.push(`The project is recorded in the requested ${destination} destination`);
  const marketSignal = context.priorities.includes("rental-income")
    ? sonuMarketSignalForProject(project, requestedType)
    : null;
  if (marketSignal) {
    fitSignals.push(
      `${marketSignal.sourceLabel} projects ${marketSignal.projectedGrossRoi.toFixed(2)}% gross ROI for ${marketSignal.propertyType}s in ${marketSignal.community}`,
    );
    evidenceGaps.push("The area ROI is a dated third-party gross projection, not the selected unit's achieved rent or net yield");
  }
  if (context.priorities.includes("schools")) {
    evidenceGaps.push("The exact school, admission fit and peak-time school journey are not verified at project level");
  }
  if (context.priorities.includes("healthcare")) {
    evidenceGaps.push("The required clinic or hospital and its real journey time are not verified at project level");
  }
  if (context.destinations.length && !destination) {
    evidenceGaps.push(`Peak-time travel to ${context.destinations.join(" or ")} is not verified for the selected building`);
  }
  if (context.priorities.includes("low-running-costs")) {
    evidenceGaps.push("Unit-level service charges, maintenance and operating costs are not supplied by the catalogue");
  }
  if (context.priorities.includes("capital-growth")) {
    evidenceGaps.push("Future appreciation is not guaranteed and requires comparable transactions, competing supply and an exit-period scenario");
  }
  if (context.priorities.includes("short-term-rental")) {
    evidenceGaps.push("Building rules, holiday-home eligibility, management cost and realistic occupancy need unit-level verification");
  }
  if (context.financing === "mortgage" || context.financing === "mixed") {
    evidenceGaps.push("Mortgage eligibility, bank valuation, loan-to-value and payment timing are buyer- and unit-specific");
  }
  if (context.riskTolerance === "conservative") {
    evidenceGaps.push("Construction progress, delivery exposure and downside resale assumptions require a conservative unit-level review");
  }
  return {
    fitSignals,
    evidenceGaps: unique(evidenceGaps),
    marketSignal,
    communityPositioning: community?.positioning || "",
  };
}

export function sonuAdvisoryFollowUp(context: SonuDecisionContext) {
  if (context.priorities.includes("schools")) {
    return "Which school or curriculum, and what maximum peak-time school journey, should I test against?";
  }
  if (context.priorities.includes("healthcare")) {
    return "Is routine clinic access enough, or is there a specific hospital or specialist you need to stay near?";
  }
  if ((context.priorities.includes("business-access") || context.priorities.includes("central-location")) && !context.destinations.length) {
    return "What is the main office or daily destination, and what peak-time commute would still feel practical?";
  }
  if (context.priorities.includes("rental-income")) {
    return "Should I optimise for immediate net income, or can a later handover be considered for a stronger long-term case?";
  }
  if (context.priorities.includes("capital-growth") && !context.holdPeriod) {
    return "What holding period should I use before I compare supply, exit liquidity and growth scenarios?";
  }
  if (context.compareEmirates) {
    return "Across the emirates, should I weight family practicality, income timing or entry price most heavily?";
  }
  return "";
}

export function sonuAdvisoryKnowledgeReply(
  query: string,
  context: SonuDecisionContext,
  now = new Date(),
) {
  if (!/\b(?:roi|yield|rental return|rental income|cash flow|cashflow)\b/i.test(query)) return "";
  const requestedType = /\b(?:apartments?|studios?|flats?)\b/i.test(query)
    ? "Apartment"
    : /\bvillas?\b/i.test(query)
      ? "Villa"
      : "";
  if (!requestedType) {
    return "Apartment and villa income signals are not interchangeable, and I would not use one as a proxy for the other. Should I compare apartments or villas first?";
  }
  const candidates = COMMUNITY_PROFILES.map((community) => {
    const project: SonuProjectAdvisoryFacts = {
      name: community.name,
      developer: "",
      area: community.name,
      propertyTypes: [`${requestedType}s`],
      lifestyles: [],
    };
    return {
      community,
      project,
      signal: sonuMarketSignalForProject(project, requestedType, now),
      score: sonuAdvisoryScore(project, context, requestedType),
    };
  }).filter((candidate) => candidate.signal)
    .sort((left, right) => right.score - left.score
      || (right.signal?.projectedGrossRoi || 0) - (left.signal?.projectedGrossRoi || 0)
      || left.community.name.localeCompare(right.community.name));
  if (!candidates.length) {
    return `I do not have a current dated ${requestedType.toLowerCase()} area-yield signal that I can responsibly use. I can still compare PSR projects, but the selected unit's achieved rent, vacancy, service charges and net yield would need fresh verification.`;
  }
  const leading = candidates.slice(0, 3);
  const readings = leading.map(({ community, signal }) =>
    `${community.name} at ${signal?.projectedGrossRoi.toFixed(2)}% projected gross ROI`,
  );
  const followUp = sonuAdvisoryFollowUp(context)
    || "Which community should I test against an actual unit budget and realistic operating costs?";
  return `For a first ${requestedType.toLowerCase()} comparison, the strongest combination of your priorities and the available H1 2026 area signals is ${readings.join("; ")}. These are Bayut community-level projected gross returns, not achieved unit rent or net yield, and each building still needs a current rent, vacancy, service-charge and management-cost model. ${followUp}`;
}
