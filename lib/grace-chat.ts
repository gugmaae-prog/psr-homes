export type GraceChatRole = "user" | "assistant";

export type GraceChatMessage = {
  role: GraceChatRole;
  content: string;
  createdAt?: string;
};

export type GraceLeadDetails = {
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  intent: boolean;
};

export type GraceDiscoveryProfile = {
  purpose: "" | "home" | "investment" | "holiday";
  propertyType: string;
  bedrooms: string;
  budget: string;
  location: string;
  timeline: string;
  investmentPriority: string;
};

export type GraceDiscoveryQuestion = {
  key: keyof GraceDiscoveryProfile;
  text: string;
};

export type GraceQuickReply = {
  label: string;
  value: string;
};

export type GraceFilterIntent = {
  query: string;
  emirate: string;
  propertyType: string;
  bedrooms: string;
  budget: string;
};

const EMAIL_PATTERN = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /(?:\+|00)?\d[\d\s().-]{7,}\d/g;
const LEAD_INTENT_PATTERN =
  /\b(?:buy|purchase|invest|investment|book|reserve|viewing|interested|looking for|need a|want a|find a|shortlist|availability|available units?|payment plan|mortgage|finance|budget|bedrooms?|home|studio|apartment|villa|townhouse|penthouse|mansion|property|properties|off[- ]plan|ready home|move in|rental yield|roi)\b/i;
const CONSENT_PATTERN =
  /\b(?:yes[, ]+(?:please[, ]+)?(?:contact|call|email|message|send)|please (?:contact|call|email|message) me|contact me|call me|email me|message me|have (?:an?|the) (?:advisor|agent|team) (?:contact|call|email|message)|an? (?:advisor|agent) (?:may|can) contact me|i (?:explicitly )?(?:agree|consent)|send me (?:the |more )?(?:details|options|information|availability|shortlist|report|pdf|brief)|email (?:the |my )?(?:report|pdf|brief) to me|reach (?:me|out)|get in touch)\b/i;
const PROPERTY_TYPE_PATTERN = /\b(studios?|apartments?|flats?|villas?|townhouses?|penthouses?|mansions?|duplexes?|plots?|offices?|commercial)\b/i;
const LOCATION_PATTERN = /\b(dubai marina|palm jumeirah|downtown dubai|business bay|dubai hills|dubai creek harbour|dubai islands|jumeirah village circle|jvc|meydan|dubai south|abu dhabi|yas island|saadiyat island|ras al khaimah|al marjan island|sharjah|ajman|dubai)\b/i;
const TIMELINE_PATTERN = /\b(immediately|as soon as possible|asap|within \d+ months?|this year|next year|still exploring|exploring|flexible|ready|move[- ]?in|off[- ]?plan|q[1-4]\s*20\d{2}|20\d{2})\b/i;
const TIMELINE_WINDOW_PATTERN = /\b(within\s+(?:(?:\d+)\s+months?|(?:a|one|1)\s+year))\b/i;
const TIMELINE_DATE_PATTERN = /\b(this year|next year|q[1-4]\s*20\d{2}|20\d{2})\b/i;
const BUDGET_PATTERN =
  /\b(?:budget(?:\s+(?:of|around|is|up to|under|below|above|over))?\s*(?:aed\s*)?|aed\s*)([\d,.]+)\s*(million|m|k)?\b/i;
const MANSION_PLANNING_FLOOR_AED = 5_000_000;

export function isGraceLandedPropertyType(value: string) {
  return /^(?:villa|townhouse|mansion)s?$/i.test(value.trim());
}

export function gracePropertyBedroomCombinationIsValid(
  propertyTypes: string | string[],
  bedrooms: string,
) {
  const requestedTypes = (Array.isArray(propertyTypes) ? propertyTypes : [propertyTypes]).filter(Boolean);
  if (!requestedTypes.length || !bedrooms) return true;
  const count = graceBedroomCount(bedrooms);
  if (count === null) return true;
  if (requestedTypes.some((type) => /^mansions?$/i.test(type.trim()))) return count >= 4;
  if (!requestedTypes.every(isGraceLandedPropertyType)) return true;
  return count >= 2;
}

export function graceBedroomCount(value: string) {
  if (/^studio\b/i.test(value.trim())) return 0;
  const match = value.match(/\b([1-9])\s*(?:\+|br|bed|beds|bedroom|bedrooms)?\b/i);
  return match ? Number(match[1]) : null;
}

export function graceBudgetAmount(value: string) {
  const match = value.match(/\bAED\s*([\d,.]+)/i);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function gracePropertyBudgetCombinationIsValid(
  propertyTypes: string | string[],
  budget: string,
) {
  const requestedTypes = (Array.isArray(propertyTypes) ? propertyTypes : [propertyTypes]).filter(Boolean);
  if (!requestedTypes.some((type) => /^mansions?$/i.test(type.trim())) || !budget) return true;
  const amount = graceBudgetAmount(budget);
  return amount === null || amount >= MANSION_PLANNING_FLOOR_AED;
}

function clean(value: string, max: number) {
  return value.replaceAll("\0", "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function phoneFromText(value: string) {
  for (const match of value.matchAll(PHONE_PATTERN)) {
    const raw = match[0];
    const digits = raw.replace(/\D/g, "");
    const index = match.index ?? 0;
    const context = value.slice(Math.max(0, index - 20), index + raw.length + 20);
    const explicitlyPhone = /\b(?:phone|mobile|whatsapp|call|number)\b/i.test(context);
    const plausiblePrefix = raw.trim().startsWith("+") || /^(?:00|0|971)/.test(digits);
    const looksLikeMoney = /\b(?:aed|budget|price|million|m)\b/i.test(context);
    if (digits.length >= 9 && digits.length <= 15 && (explicitlyPhone || plausiblePrefix) && !looksLikeMoney) {
      return clean(raw, 40);
    }
  }
  return "";
}

function nameFromText(value: string) {
  const match = value.match(/\b(?:my (?:full )?name is|this is|i am|i'm)\s+([a-z][a-z' -]{1,50}?)(?=[,.]|\s+(?:and|my|i|you|please|looking|interested|want|need)\b|$)/i);
  const candidate = clean(match?.[1] || "", 80);
  if (!candidate || /\b(?:looking|interested|seeking|searching|ready|investing)\b/i.test(candidate)) return "";
  return candidate
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function detectGraceLeadIntent(value: string) {
  return LEAD_INTENT_PATTERN.test(value);
}

export function detectGraceContactConsent(value: string) {
  return CONSENT_PATTERN.test(value);
}

export function extractGraceLeadDetails(messages: GraceChatMessage[]): GraceLeadDetails {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const emails = userText.match(EMAIL_PATTERN) || [];
  const email = clean(emails.find(validEmail) || "", 180).toLowerCase();
  const explicitName = messages
    .filter((message) => message.role === "user")
    .map((message) => nameFromText(message.content))
    .find(Boolean) || "";
  const promptedName = messages.findLast((message, index) => {
    if (message.role !== "user" || index === 0) return false;
    const previous = messages[index - 1];
    return previous.role === "assistant" && /\b(?:what|tell me|share).{0,40}\bname\b/i.test(previous.content);
  });
  const promptedNameValue = clean(promptedName?.content.split(/[,;]|\b(?:email|phone|mobile|whatsapp)\b/i)[0] || "", 80)
    .replace(/^(?:my (?:full )?name is|this is|i am|i'm)\s+/i, "")
    .replace(EMAIL_PATTERN, "")
    .trim();
  const name = explicitName || (/^[a-z][a-z' -]{1,50}$/i.test(promptedNameValue)
    ? promptedNameValue.split(" ").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ")
    : "");
  const contextualConsent = messages.some((message, index) => {
    if (message.role !== "user" || !/^(?:yes|yes please|i agree|i consent|please do)$/i.test(clean(message.content, 40))) return false;
    const previous = messages[index - 1];
    return previous?.role === "assistant" && /\b(?:may|permission|consent|send|email).{0,80}\b(?:contact|report|pdf|brief|email)\b/i.test(previous.content);
  });

  return {
    name,
    email,
    phone: phoneFromText(userText),
    consent: detectGraceContactConsent(userText) || contextualConsent,
    intent: detectGraceLeadIntent(userText),
  };
}

export function graceLeadIsQualified(details: GraceLeadDetails, aiDetectedIntent = false) {
  return (details.intent || aiDetectedIntent) && Boolean(details.email || details.phone) && details.consent;
}

export function graceLeadNextQuestion(details: GraceLeadDetails, aiDetectedIntent = false) {
  if (!(details.intent || aiDetectedIntent)) return "";
  if (!details.email && !details.phone) {
    return "I can ask a PSR advisor to continue this search with you. What name and email address or mobile number should they use?";
  }
  if (!details.consent) {
    return "May a PSR advisor contact you about this property search?";
  }
  return "";
}

function userTextsNewestFirst(messages: GraceChatMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .reverse();
}

function latestExtracted<T extends string>(messages: GraceChatMessage[], extract: (value: string) => T) {
  for (const value of userTextsNewestFirst(messages)) {
    const extracted = extract(value);
    if (extracted) return extracted;
  }
  return "" as T;
}

function bedroomPreference(value: string) {
  if (/\bstudio\b/i.test(value)) return "Studio";
  const numeric = value.match(/\b([1-9])[\s-]*(?:bed|bedroom|br)s?\b/i)?.[1];
  if (numeric) return `${numeric} bedroom${numeric === "1" ? "" : "s"}`;
  const word = value.match(/\b(one|two|three|four|five|six)[\s-]+(?:bed|bedroom)s?\b/i)?.[1]?.toLowerCase();
  const number = ({ one: "1", two: "2", three: "3", four: "4", five: "5", six: "6" } as Record<string, string>)[word || ""];
  return number ? `${number} bedroom${number === "1" ? "" : "s"}` : "";
}

function budgetPreference(value: string) {
  const match = value.match(BUDGET_PATTERN);
  if (!match) return "";
  const amount = Number(match[1].replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const multiplier = /million|m/i.test(match[2] || "") ? 1_000_000 : /k/i.test(match[2] || "") ? 1_000 : 1;
  const total = amount * multiplier;
  if (total < 250_000 || total > 250_000_000) return "";
  return `AED ${Math.round(total).toLocaleString("en-AE")}`;
}

export function extractGraceDiscoveryProfile(messages: GraceChatMessage[]): GraceDiscoveryProfile {
  const purpose = latestExtracted<GraceDiscoveryProfile["purpose"]>(messages, (value) => (
    /\b(?:invest|investment|roi|yield|rental income|capital growth)\b/i.test(value)
      ? "investment"
      : /\b(?:holiday|vacation|second home)\b/i.test(value)
        ? "holiday"
        : /\b(?:home|live|living|move in|family)\b/i.test(value)
          ? "home"
          : ""
  ));
  const matchedType = latestExtracted(messages, (value) => value.match(PROPERTY_TYPE_PATTERN)?.[1]?.toLowerCase() || "");
  const rawType = ({
    studios: "studio",
    apartments: "apartment",
    flats: "flat",
    villas: "villa",
    townhouses: "townhouse",
    penthouses: "penthouse",
    mansions: "mansion",
    duplexes: "duplex",
    plots: "plot",
    offices: "office",
  } as Record<string, string>)[matchedType] || matchedType;
  const propertyType = rawType === "flat"
    ? "Apartment"
    : rawType
      ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
      : "";
  const rawLocation = latestExtracted(messages, (value) => value.match(LOCATION_PATTERN)?.[1] || "");
  const location = rawLocation
    ? rawLocation.split(/\s+/).map((part) => part.toUpperCase() === "JVC" ? "JVC" : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ")
    : "";
  const rawTimeline = latestExtracted(messages, (value) => (
    value.match(TIMELINE_WINDOW_PATTERN)?.[1]
    || value.match(TIMELINE_DATE_PATTERN)?.[1]
    || value.match(TIMELINE_PATTERN)?.[1]
    || ""
  ));
  const investmentPriority = latestExtracted(messages, (value) => (
    /\b(?:rental income|net income|cash flow|yield|roi)\b/i.test(value)
      ? "Rental income"
      : /\b(?:capital growth|appreciation|resale)\b/i.test(value)
        ? "Capital growth"
        : /\bbalance(?:d)?\b/i.test(value)
          ? "Balanced"
          : ""
  ));
  return {
    purpose,
    propertyType,
    bedrooms: latestExtracted(messages, bedroomPreference),
    budget: latestExtracted(messages, budgetPreference),
    location,
    timeline: clean(rawTimeline, 40),
    investmentPriority,
  };
}

export function graceDiscoveryCompleteness(profile: GraceDiscoveryProfile) {
  return [
    profile.purpose,
    profile.propertyType,
    profile.bedrooms,
    profile.budget,
    profile.location,
    profile.timeline,
  ].filter(Boolean).length;
}

export function graceDiscoveryNextQuestion(
  profile: GraceDiscoveryProfile,
  previousKey = "",
): GraceDiscoveryQuestion | null {
  if (!gracePropertyBedroomCombinationIsValid(profile.propertyType, profile.bedrooms)) {
    if (/^mansion$/i.test(profile.propertyType)) {
      return {
        key: "bedrooms",
        text: "Mansion searches in the PSR catalogue are treated as four-bedroom-plus homes. Should I search for four bedrooms or five-plus bedrooms?",
      };
    }
    return {
      key: "bedrooms",
      text: "PSR records treat villas, townhouses and mansions as landed homes starting from two bedrooms. How many bedrooms do you need?",
    };
  }
  if (!gracePropertyBudgetCombinationIsValid(profile.propertyType, profile.budget)) {
    return {
      key: "budget",
      text: `${profile.budget || "That budget"} is not a plausible mansion acquisition budget in current PSR records. I use AED 5 million as a planning floor before live unit verification. Should I search within AED 5–10 million or above AED 10 million?`,
    };
  }
  const questions: GraceDiscoveryQuestion[] = [
    { key: "purpose", text: "Is this purchase for your own home, a holiday residence or an investment?" },
    { key: "propertyType", text: "Which property type should I focus on: apartment, villa, townhouse or penthouse?" },
    { key: "bedrooms", text: "How many bedrooms should the property have?" },
    { key: "budget", text: "What purchase budget should I keep the shortlist within?" },
    { key: "location", text: "Do you have a preferred emirate or community, or should I compare the strongest UAE locations?" },
    { key: "timeline", text: "When would you like to reserve or move into the property?" },
  ];
  if (profile.purpose === "investment") {
    questions.push({
      key: "investmentPriority",
      text: "Should I prioritise rental income, capital growth or a balance of both?",
    });
  }
  const missing = questions.filter((question) => !profile[question.key]);
  return missing.find((question) => question.key !== previousKey) || missing[0] || null;
}

export function graceQuickReplies(
  question: GraceDiscoveryQuestion | null,
  profile?: GraceDiscoveryProfile,
): GraceQuickReply[] {
  if (!question) return [];
  const replies: Record<GraceDiscoveryQuestion["key"], GraceQuickReply[]> = {
    purpose: [
      { label: "My home", value: "This is for my own home" },
      { label: "Investment", value: "This is an investment" },
      { label: "Holiday home", value: "This is a holiday residence" },
    ],
    propertyType: [
      { label: "Apartment", value: "I want an apartment" },
      { label: "Villa", value: "I want a villa" },
      { label: "Townhouse", value: "I want a townhouse" },
      { label: "Penthouse", value: "I want a penthouse" },
    ],
    bedrooms: [
      { label: "Studio", value: "Studio" },
      { label: "1 bedroom", value: "1 bedroom" },
      { label: "2 bedrooms", value: "2 bedrooms" },
      { label: "3 bedrooms", value: "3 bedrooms" },
      { label: "4 bedrooms", value: "4 bedrooms" },
      { label: "5+ bedrooms", value: "5 bedrooms or more" },
    ],
    budget: [
      { label: "Under AED 1m", value: "My budget is AED 900,000" },
      { label: "AED 1–2m", value: "My budget is AED 2 million" },
      { label: "AED 2–5m", value: "My budget is AED 5 million" },
      { label: "AED 5–10m", value: "My budget is AED 10 million" },
      { label: "AED 10m+", value: "My budget is above AED 10 million" },
    ],
    location: [
      { label: "Dubai", value: "I prefer Dubai" },
      { label: "Abu Dhabi", value: "I prefer Abu Dhabi" },
      { label: "Ras Al Khaimah", value: "I prefer Ras Al Khaimah" },
      { label: "Compare the UAE", value: "Compare the strongest UAE locations" },
    ],
    timeline: [
      { label: "Immediately", value: "I want to proceed immediately" },
      { label: "Within 3 months", value: "Within 3 months" },
      { label: "Within 6 months", value: "Within 6 months" },
      { label: "This year", value: "This year" },
      { label: "Still exploring", value: "I am still exploring" },
    ],
    investmentPriority: [
      { label: "Rental income", value: "Prioritise rental income" },
      { label: "Capital growth", value: "Prioritise capital growth" },
      { label: "Balanced", value: "Balance rental income and capital growth" },
    ],
  };
  const available = replies[question.key];
  if (question.key === "bedrooms" && profile && !gracePropertyBedroomCombinationIsValid(profile.propertyType, "1 bedroom")) {
    return available.filter((reply) => {
      if (/^mansion$/i.test(profile.propertyType)) return /^(?:4 bedrooms|5\+ bedrooms)$/.test(reply.label);
      return !/^(?:Studio|1 bedroom)$/.test(reply.label);
    });
  }
  if (question.key === "budget" && profile && /^mansion$/i.test(profile.propertyType)) {
    return available.filter((reply) => /^(?:AED 5–10m|AED 10m\+)$/.test(reply.label));
  }
  return available;
}

export function graceFilterIntent(profile: GraceDiscoveryProfile): GraceFilterIntent {
  const emirates = ["Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman", "Fujairah", "Umm Al Quwain"];
  const emirate = emirates.find((candidate) => profile.location === candidate) || "";
  const community = emirate ? "" : profile.location;
  const validBedrooms = gracePropertyBedroomCombinationIsValid(profile.propertyType, profile.bedrooms)
    ? profile.bedrooms
    : "";
  const validBudget = gracePropertyBudgetCombinationIsValid(profile.propertyType, profile.budget)
    ? profile.budget
    : "";
  const bedroomQuery = validBedrooms;
  return {
    query: [community, bedroomQuery].filter(Boolean).join(" ").trim(),
    emirate,
    propertyType: profile.propertyType ? `${profile.propertyType}${profile.propertyType.endsWith("s") ? "" : "s"}` : "",
    bedrooms: validBedrooms,
    budget: validBudget,
  };
}
