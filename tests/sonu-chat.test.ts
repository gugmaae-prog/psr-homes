import assert from "node:assert/strict";
import test from "node:test";
import {
  detectSonuContactConsent,
  detectSonuLeadIntent,
  extractSonuDiscoveryProfile,
  extractSonuLeadDetails,
  sonuDiscoveryCompleteness,
  sonuDiscoveryNextQuestion,
  sonuFilterIntent,
  sonuLeadIsQualified,
  sonuLeadNextQuestion,
  sonuQuickReplies,
} from "../lib/sonu-chat";
import {
  SonuPublicAgent,
  SONU_SALES_CHARTER,
  contextualProjectReply,
  sonuSocialReply,
  isUnitPriceChallenge,
  naturalDiscoveryReply,
  parseAiResponse,
  sonuNoMatchRelaxations,
  sonuNoMatchReply,
  sonuProjectEvidenceScore,
  sonuProjectFitScore,
  sonuHarmlessDetourReply,
  sonuProjectMeetsTimelinePreference,
  sonuRankedProjectSuggestions,
  sonuRecommendationBasis,
  sonuReplyPassesGrounding,
  sonuReplyPassesSalesGuardrails,
  shouldStartNewSonuBrief,
  unitPriceChallengeReply,
  wantsClientReport,
  wantsKnowledgeAnswer,
  wantsProjectSelection,
  type ProjectRecord,
} from "../worker/sonu-public-agent";
import { sonuFinderPreferencesFromDiscovery } from "../worker/sonu-brief-service";
import {
  psrCatalogueContext,
  psrKnowledgeFallback,
  rankPsrSiteKnowledge,
} from "../worker/psr-site-knowledge";
import {
  extractSonuDecisionContext,
  sonuAdvisoryEvidence,
  sonuAdvisoryFollowUp,
  sonuAdvisoryKnowledgeReply,
  sonuAdvisoryScore,
  sonuDeveloperMatches,
  sonuMarketSignalForProject,
} from "../worker/sonu-advisory-intelligence";

test("detects UAE property buying and investment intent", () => {
  assert.equal(detectSonuLeadIntent("I am looking for a two bedroom apartment in Dubai"), true);
  assert.equal(detectSonuLeadIntent("Find a family home"), true);
  assert.equal(detectSonuLeadIntent("What are your office hours?"), false);
});

test("extracts contact details without treating an AED budget as a phone", () => {
  const details = extractSonuLeadDetails([
    { role: "user", content: "I need a villa with a budget of AED 2500000." },
    { role: "assistant", content: "How can an advisor reach you?" },
    { role: "user", content: "My name is Samira, call me on +971 50 123 4567 please." },
  ]);
  assert.equal(details.name, "Samira");
  assert.equal(details.phone, "+971 50 123 4567");
  assert.equal(details.email, "");
  assert.equal(details.consent, true);
  assert.equal(sonuLeadIsQualified(details), true);
});

test("requires explicit permission before a detected lead is uploaded", () => {
  const details = extractSonuLeadDetails([
    { role: "user", content: "I want to invest. My email is investor@example.com." },
  ]);
  assert.equal(details.intent, true);
  assert.equal(details.consent, false);
  assert.equal(sonuLeadIsQualified(details), false);
  assert.match(sonuLeadNextQuestion(details), /May a PSR advisor contact you/);
});

test("accepts clear contact consent", () => {
  assert.equal(detectSonuContactConsent("Yes, an advisor may contact me."), true);
  assert.equal(detectSonuContactConsent("I am only browsing."), false);
});

test("recognises a prompted name and contextual consent for a private report", () => {
  const details = extractSonuLeadDetails([
    { role: "user", content: "Please create a PDF for my investment search." },
    { role: "assistant", content: "What full name and email address should I place on the private brief?" },
    { role: "user", content: "Keiffer Japeth, keiffer@example.com" },
    { role: "assistant", content: "May I use that email to send your private PSR report?" },
    { role: "user", content: "Yes please" },
  ]);
  assert.equal(details.name, "Keiffer Japeth");
  assert.equal(details.email, "keiffer@example.com");
  assert.equal(details.consent, true);
});

test("recognises a full-name introduction from the persisted user brief", () => {
  const details = extractSonuLeadDetails([
    { role: "user", content: "Please create a PDF for my investment search." },
    { role: "user", content: "My full name is PSR Release QA and my email is admin@psrhomes.ae." },
    { role: "user", content: "Yes, I explicitly consent to use that email to send the private report." },
  ]);
  assert.equal(details.name, "Psr Release Qa");
  assert.equal(details.email, "admin@psrhomes.ae");
  assert.equal(details.consent, true);
});

test("builds a progressive property brief without repeating answered questions", () => {
  const messages = [
    { role: "user" as const, content: "I want an investment apartment." },
    { role: "assistant" as const, content: "How many bedrooms should the property have?" },
    { role: "user" as const, content: "Two bedrooms, budget AED 4 million in Dubai Marina." },
  ];
  const profile = extractSonuDiscoveryProfile(messages);
  assert.equal(profile.purpose, "investment");
  assert.equal(profile.propertyType, "Apartment");
  assert.equal(profile.bedrooms, "2 bedrooms");
  assert.equal(profile.budget, "AED 4,000,000");
  assert.equal(profile.location, "Dubai Marina");
  assert.equal(sonuDiscoveryCompleteness(profile), 5);
  assert.equal(sonuDiscoveryNextQuestion(profile, "bedrooms")?.key, "timeline");
});

test("maps a complete Sonu discovery brief into strict report preferences", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I want an investment apartment with 2 bedrooms in Dubai Marina, budget AED 4 million, within 3 months, prioritising rental income." },
  ]);
  const preferences = sonuFinderPreferencesFromDiscovery(profile);
  assert.ok(preferences);
  assert.equal(preferences.emirate, "Dubai");
  assert.equal(preferences.community, "Dubai Marina");
  assert.equal(preferences.budget, "2m-5m");
  assert.equal(preferences.timeline, "Within 3 months");
  assert.equal(preferences.investmentStrategy, "income");
});

test("moves to another missing field instead of repeating the previous question", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I want to invest in a villa." },
  ]);
  const question = sonuDiscoveryNextQuestion(profile, "bedrooms");
  assert.equal(question?.key, "budget");
});

test("corrects impossible one-bedroom landed-home requests before matching projects", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I want a one-bedroom villa in Dubai for my home, budget AED 3 million, within 3 months." },
  ]);
  const question = sonuDiscoveryNextQuestion(profile);
  assert.equal(profile.propertyType, "Villa");
  assert.equal(profile.bedrooms, "1 bedroom");
  assert.equal(question?.key, "bedrooms");
  assert.match(question?.text || "", /landed homes starting from two bedrooms/i);
  assert.deepEqual(sonuQuickReplies(question, profile).map((reply) => reply.label), [
    "2 bedrooms",
    "3 bedrooms",
    "4 bedrooms",
    "5+ bedrooms",
  ]);
  assert.equal(sonuFinderPreferencesFromDiscovery(profile), null);
});

test("corrects implausible mansion bedroom and budget combinations deterministically", () => {
  const initial = extractSonuDiscoveryProfile([
    { role: "user", content: "I want a one-bedroom mansion in Dubai for AED 500,000." },
  ]);
  const bedroomQuestion = sonuDiscoveryNextQuestion(initial);
  assert.equal(initial.propertyType, "Mansion");
  assert.equal(bedroomQuestion?.key, "bedrooms");
  assert.match(bedroomQuestion?.text || "", /four-bedroom-plus/i);
  assert.deepEqual(sonuQuickReplies(bedroomQuestion, initial).map((reply) => reply.label), [
    "4 bedrooms",
    "5+ bedrooms",
  ]);

  const correctedBedrooms = extractSonuDiscoveryProfile([
    { role: "user", content: "I want a one-bedroom mansion in Dubai for AED 500,000." },
    { role: "user", content: "Make that four bedrooms." },
  ]);
  const budgetQuestion = sonuDiscoveryNextQuestion(correctedBedrooms);
  assert.equal(correctedBedrooms.bedrooms, "4 bedrooms");
  assert.equal(budgetQuestion?.key, "budget");
  assert.match(budgetQuestion?.text || "", /AED 5 million as a planning floor/i);
  assert.deepEqual(sonuQuickReplies(budgetQuestion, correctedBedrooms).map((reply) => reply.label), [
    "AED 5–10m",
    "AED 10m+",
  ]);
  assert.deepEqual(sonuFilterIntent(correctedBedrooms), {
    query: "4 bedrooms",
    emirate: "Dubai",
    propertyType: "Mansions",
    bedrooms: "4 bedrooms",
    budget: "",
  });
  assert.equal(sonuFinderPreferencesFromDiscovery(correctedBedrooms), null);
});

test("uses the latest explicit search correction instead of stale earlier criteria", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I want a one-bedroom mansion in Dubai for AED 500,000." },
    { role: "user", content: "Actually choose a four-bedroom villa in Dubai Hills for AED 10 million." },
  ]);
  assert.equal(profile.propertyType, "Villa");
  assert.equal(profile.bedrooms, "4 bedrooms");
  assert.equal(profile.budget, "AED 10,000,000");
  assert.equal(profile.location, "Dubai Hills");
});

test("accepts Workers AI structured replies returned as objects or JSON strings", () => {
  const expected = {
    reply: "That gives me a clear starting point. Which Dubai community do you prefer?",
    leadIntent: true,
  };
  assert.deepEqual(parseAiResponse(expected), expected);
  assert.deepEqual(parseAiResponse(JSON.stringify(expected)), expected);
  assert.deepEqual(parseAiResponse({ ...expected, knowledgeRoutes: ["/projects/arancia-yards-beyond-city-of-arabia-dubai", "https://untrusted.example"] }), {
    ...expected,
    knowledgeRoutes: ["/projects/arancia-yards-beyond-city-of-arabia-dubai"],
  });
});

test("grounds Sonu site answers in the matching PSR route and dated facts", () => {
  const arancia = rankPsrSiteKnowledge("Tell me about the Arancia Yards project and handover", 3);
  assert.equal(arancia[0]?.title, "Arancia Yards");
  assert.equal(arancia[0]?.route, "/projects/arancia-yards-beyond-city-of-arabia-dubai");
  assert.ok(arancia[0]?.facts.some((fact) => /Q4 2029/i.test(fact)));
  const fallback = psrKnowledgeFallback("Is Tara Park available?", rankPsrSiteKnowledge("Is Tara Park available?", 2));
  assert.match(fallback, /sold out/i);
  assert.match(fallback, /not proof of live unit availability/i);
});

test("connects service and research questions to live PSR pages", () => {
  const mortgage = rankPsrSiteKnowledge("How does PSR help with mortgages?", 3);
  assert.ok(mortgage.some((item) => item.route === "/services"));
  const research = rankPsrSiteKnowledge("Show me the latest UAE market research", 3);
  assert.ok(research.some((item) => item.route.startsWith("/insights/")));
});

test("defines Sonu as an empathetic, evidence-led and non-pushy advisor", () => {
  const charter = SONU_SALES_CHARTER.join(" ");
  assert.match(charter, /listen before recommending/i);
  assert.match(charter, /consultative rather than persuasive/i);
  assert.match(charter, /never manufacture urgency/i);
  assert.match(charter, /do not favour the highest-priced project/i);
  assert.match(charter, /trade-off or evidence gap/i);
  assert.match(charter, /never stretch the brief/i);
});

test("rejects pressure tactics, guarantees, emojis and premature contact capture", () => {
  assert.equal(sonuReplyPassesSalesGuardrails(
    "There is no need to act now. Returns are not guaranteed, so I would verify the live unit and total costs first.",
  ), true);
  assert.equal(sonuReplyPassesSalesGuardrails("Act now and secure this unit today."), false);
  assert.equal(sonuReplyPassesSalesGuardrails("This is a guaranteed ROI opportunity."), false);
  assert.equal(sonuReplyPassesSalesGuardrails(`A sensible shortlist ${String.fromCodePoint(0x1f44d)}`), false);
  assert.equal(sonuReplyPassesSalesGuardrails("Please share your email so an advisor can call you."), false);
  assert.equal(sonuReplyPassesSalesGuardrails(
    "Please share your email so an advisor can call you.",
    { allowContactRequest: true },
  ), true);
});

test("rejects a model reply that introduces a project outside the supplied PSR evidence", () => {
  const projects = [{
    slug: "arancia-yards-beyond-city-of-arabia-dubai",
    name: "Arancia Yards",
    image: "",
    developer: "BEYOND",
    location: "City of Arabia, Dubai",
    startingPrice: "From AED 1,250,000",
    priceScope: "project" as const,
    paymentPlan: "50/50 payment plan",
    handover: "Q4 2029",
    bedrooms: ["1BR", "2BR", "3BR"],
    propertyTypes: ["Apartments"],
    lifestyles: [],
  }];
  assert.equal(sonuReplyPassesGrounding(
    "Arancia Yards is the first recorded comparison, but its live unit terms still need verification.",
    projects,
    [],
  ), true);
  assert.equal(sonuReplyPassesGrounding(
    "Greencrest is a better alternative.",
    projects,
    [],
  ), false);
  const siteKnowledge = rankPsrSiteKnowledge("Tell me about Sobha Hartland Forest Villas", 3);
  assert.ok(siteKnowledge.some((item) => item.title === "Sobha Hartland Forest Villas"));
  assert.equal(sonuReplyPassesGrounding(
    "Sobha Hartland Forest Villas is the better recommendation.",
    projects,
    siteKnowledge,
  ), false);
  assert.equal(sonuReplyPassesGrounding(
    "Sobha Hartland Forest Villas is a PSR project record with terms that still need live verification.",
    projects,
    siteKnowledge,
    { allowSiteKnowledgeProjects: true },
  ), true);
});

test("grounds developer and community knowledge in the current PSR catalogue", () => {
  const developer = rankPsrSiteKnowledge("What does the PSR catalogue know about Emaar as a developer?", 8)
    .find((item) => item.kind === "developer" && item.route === "/developers/emaar");
  assert.ok(developer);
  assert.match(developer.summary, /active project records? in the current PSR catalogue/i);

  const community = rankPsrSiteKnowledge("Which projects and developers are represented in Palm Jumeirah?", 8)
    .find((item) => item.kind === "community" && item.route === "/communities/palm-jumeirah");
  assert.ok(community);
  assert.ok(community.facts.some((fact) => /developers represented/i.test(fact)));

  const curatedCommunity = rankPsrSiteKnowledge("What does PSR know about Jubail Island?", 8)
    .find((item) => item.kind === "community" && item.route === "/communities/jubail-island");
  assert.ok(curatedCommunity);
  assert.match(curatedCommunity.evidenceLabel, /Jubail Island Investment Company/i);
  assert.ok(curatedCommunity.facts.some((fact) => /no current PSR catalogue records/i.test(fact)));

  const snapshot = psrCatalogueContext();
  assert.ok(snapshot.activeProjectRecords > 1_000);
  assert.ok(snapshot.developers > 100);
  assert.ok(snapshot.communities > 100);
  assert.ok(snapshot.emirates.includes("Dubai"));
});

test("provides selectable answers and a page-filter intent from the conversation", () => {
  const messages = [
    { role: "user" as const, content: "I need an investment apartment in Dubai with 2 bedrooms and a budget of AED 3 million." },
  ];
  const profile = extractSonuDiscoveryProfile(messages);
  const question = sonuDiscoveryNextQuestion(profile);
  assert.equal(question?.key, "timeline");
  assert.deepEqual(sonuQuickReplies(question).map((reply) => reply.label), [
    "Immediately",
    "Within 3 months",
    "Within 6 months",
    "This year",
    "Still exploring",
  ]);
  assert.deepEqual(sonuFilterIntent(profile), {
    query: "2 bedrooms",
    emirate: "Dubai",
    propertyType: "Apartments",
    bedrooms: "2 bedrooms",
    budget: "AED 3,000,000",
  });
});

test("prioritises direct research and advisory questions over the next discovery prompt", () => {
  assert.equal(wantsKnowledgeAnswer("Show me UAE property market news and research"), true);
  assert.equal(wantsKnowledgeAnswer("How should I calculate net yield after service charges?"), true);
  assert.equal(wantsKnowledgeAnswer("What budget ceiling should I use?"), false);
  assert.equal(wantsProjectSelection("Recommend a 4-bedroom family villa in Dubai under AED 10 million."), true);
  assert.equal(wantsProjectSelection("What does the current PSR catalogue know about Emaar?"), false);
});

test("keeps buyer priorities in discovery instead of misrouting them as catalogue questions", () => {
  assert.equal(wantsKnowledgeAnswer(
    "We have two children, need four bedrooms, good schools and healthcare, and I work in DIFC.",
  ), false);
  assert.equal(wantsKnowledgeAnswer("Which family areas have good school and healthcare access?"), true);
  assert.equal(wantsKnowledgeAnswer("How should I compare mortgage costs and the payment plan?"), true);
});

test("uses conversational discovery language rather than form-like prompts", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I want an investment apartment with 2 bedrooms." },
  ]);
  const question = sonuDiscoveryNextQuestion(profile);
  assert.equal(question?.key, "budget");
  const reply = naturalDiscoveryReply(profile, question!);
  assert.match(reply, /Two bedrooms gives me a useful brief/i);
  assert.match(reply, /without stretching you\?/i);
  assert.doesNotMatch(reply, /understood|budget ceiling/i);
});

test("recognises direct PDF and report requests without misclassifying ordinary mentions", () => {
  assert.equal(wantsClientReport("Please generate a PDF for these projects"), true);
  assert.equal(wantsClientReport("I need a client comparison report"), true);
  assert.equal(wantsClientReport("Can you email me the brief?"), true);
  assert.equal(wantsClientReport("What information belongs in a report?"), false);
});

test("keeps greetings conversational without treating property requests as small talk", () => {
  assert.equal(sonuSocialReply("hi"), "Hello. Good to meet you. What are you hoping to find?");
  assert.equal(sonuSocialReply("Hi Sonu!"), "Hello. Good to meet you. What are you hoping to find?");
  assert.equal(sonuSocialReply("hello", "Mehul Kumar"), "Hello, Mehul. Good to see you. What are you working through today?");
  assert.equal(sonuSocialReply("how are you?"), "I’m well, thank you. What are you hoping to find or work through today?");
  assert.equal(sonuSocialReply("I'm good, thanks"), "Glad to hear it. What are you hoping to find?");
  assert.equal(sonuSocialReply("Good, and you?"), "I’m well too, thank you. What are you hoping to find?");
  assert.equal(sonuSocialReply("Hi, I need a two-bedroom apartment"), "");
});

test("starts a fresh property brief when the visitor changes direction", () => {
  const previous = [
    { role: "user" as const, content: "I want a 2-bedroom apartment in Dubai Marina with a budget of AED 3 million." },
  ];
  assert.equal(shouldStartNewSonuBrief(previous, "Actually, show me 4-bedroom villas in Abu Dhabi instead."), true);
  assert.equal(shouldStartNewSonuBrief(previous, "What is the payment plan for those options?"), false);
  assert.equal(shouldStartNewSonuBrief(previous, "Start over with a new search"), true);
});

test("understands plural property types and hyphenated bedroom counts", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "Actually show me 4-bedroom villas in Abu Dhabi around AED 8 million." },
  ]);
  assert.equal(profile.propertyType, "Villa");
  assert.equal(profile.bedrooms, "4 bedrooms");
  assert.equal(profile.location, "Abu Dhabi");
  assert.deepEqual(sonuFilterIntent(profile), {
    query: "4 bedrooms",
    emirate: "Abu Dhabi",
    propertyType: "Villas",
    bedrooms: "4 bedrooms",
    budget: "AED 8,000,000",
  });
});

test("corrects a challenged project entry price instead of claiming it is a two-bedroom quote", () => {
  const profile = extractSonuDiscoveryProfile([
    { role: "user", content: "I need a 2-bedroom apartment." },
    { role: "user", content: "My budget is AED 2 million." },
    { role: "user", content: "Anything in Dubai Hills?" },
    { role: "user", content: "Really? Collective is 1.4 for 2 beds?" },
  ]);
  assert.equal(
    isUnitPriceChallenge("I need a 2-bedroom apartment in Dubai Hills with a budget of AED 2 million."),
    false,
  );
  assert.equal(
    isUnitPriceChallenge("Actually, show me a 4-bedroom villa in Dubai up to AED 10 million."),
    false,
  );
  assert.equal(isUnitPriceChallenge("Really? Collective is 1.4 for 2 beds?"), true);
  assert.equal(isUnitPriceChallenge("Collective is 1.4 for 2 beds?"), true);
  assert.equal(
    isUnitPriceChallenge("I want a 2-bedroom apartment under AED 3 million but I am not sure which area"),
    false,
  );

  const reply = unitPriceChallengeReply("Really? Collective is 1.4 for 2 beds?", profile, [
    {
      slug: "the-golf-residences-in-dubai-hills-for-sale-by-fortimo",
      name: "Fortimo The Golf Residences",
      image: "",
      developer: "Fortimo",
      location: "Dubai Hills Estate, Dubai",
      startingPrice: "From AED 1,700,000",
      priceScope: "project",
      paymentPlan: "50/50 payment plan",
      handover: "Q3 2026",
      bedrooms: ["1BR", "2BR", "3BR"],
      propertyTypes: ["Apartments"],
      lifestyles: [],
    },
    {
      slug: "greencrest-dubai-hills-estate-emaar",
      name: "Greencrest",
      image: "",
      developer: "Emaar",
      location: "Dubai Hills Estate, Dubai",
      startingPrice: "From AED 1,570,000",
      priceScope: "project",
      paymentPlan: "80/20 payment plan",
      handover: "Q2 2029",
      bedrooms: ["1BR", "2BR", "3BR"],
      propertyTypes: ["Apartments"],
      lifestyles: [],
    },
  ]);

  assert.match(reply, /Emaar Collective 2\.0/i);
  assert.match(reply, /project entry price/i);
  assert.match(reply, /not a verified 2-bedroom quote/i);
  assert.match(reply, /removed it from the bedroom-qualified shortlist/i);
  assert.match(reply, /live 2-bedroom prices still need confirmation/i);
});

const sonuProjectFixture = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  slug: "test-residences-dubai",
  name: "Test Residences",
  image: "https://example.com/test.jpg",
  developer: "PSR Test Developer",
  emirate: "Dubai",
  area: "Dubai Hills Estate, Dubai",
  startingPrice: "4000000",
  paymentPlan: "50/50 Payment Plan",
  handover: "Q4 2026",
  bedrooms: ["4BR"],
  propertyTypes: ["Villas"],
  lifestyles: ["Green Nature Living"],
  archived: false,
  brochure: "https://example.com/test.pdf",
  sourceUpdatedAt: "2026-07-22T00:00:00.000Z",
  ...overrides,
});

test("ranks recorded ready homes ahead of long-dated projects for an immediate family move", () => {
  const query = "I need a 4-bedroom villa in Dubai for my family, budget AED 10 million, ready immediately.";
  const profile = extractSonuDiscoveryProfile([{ role: "user", content: query }]);
  const ready = sonuProjectFixture({ name: "Ready Family Villa", handover: "Completed" });
  const longDated = sonuProjectFixture({ name: "Future Family Villa", handover: "Q4 2030" });
  assert.ok(
    sonuProjectFitScore(ready, profile, query) > sonuProjectFitScore(longDated, profile, query),
  );
  assert.equal(sonuProjectMeetsTimelinePreference(ready, profile.timeline), true);
  assert.equal(sonuProjectMeetsTimelinePreference(longDated, profile.timeline), false);
});

test("treats ready within a year as a twelve-month constraint rather than generic ready stock", () => {
  const profile = extractSonuDiscoveryProfile([{
    role: "user",
    content: "I need a home that is ready within a year.",
  }]);
  assert.equal(profile.timeline, "within a year");
  assert.equal(sonuProjectMeetsTimelinePreference(sonuProjectFixture({ handover: "Q2 2027" }), profile.timeline), true);
  assert.equal(sonuProjectMeetsTimelinePreference(sonuProjectFixture({ handover: "Q4 2027" }), profile.timeline), false);
});

test("uses an explicit delivery date instead of confusing browsing stage with handover timing", () => {
  const profile = extractSonuDiscoveryProfile([{
    role: "user",
    content: "I am only exploring, but I need the home ready this year.",
  }]);
  assert.equal(profile.timeline, "this year");
  assert.equal(sonuProjectMeetsTimelinePreference(sonuProjectFixture({ handover: "Q2 2026" }), profile.timeline), true);
  assert.equal(sonuProjectMeetsTimelinePreference(sonuProjectFixture({ handover: "Q2 2028" }), profile.timeline), false);
});

test("ranks earlier cash-flow timing ahead of a distant handover for rental-income searches", () => {
  const query = "I want a 2-bedroom investment apartment in Dubai under AED 5 million within 6 months, prioritise rental income.";
  const profile = extractSonuDiscoveryProfile([{ role: "user", content: query }]);
  const ready = sonuProjectFixture({
    name: "Ready Income Residence",
    startingPrice: "2500000",
    handover: "Completed",
    bedrooms: ["2BR"],
    propertyTypes: ["Apartments"],
  });
  const longDated = sonuProjectFixture({
    name: "Future Income Residence",
    startingPrice: "2500000",
    handover: "Q4 2030",
    bedrooms: ["2BR"],
    propertyTypes: ["Apartments"],
  });
  assert.ok(
    sonuProjectFitScore(ready, profile, query) > sonuProjectFitScore(longDated, profile, query),
  );
});

test("does not reward the highest project entry price when both options fit the budget", () => {
  const query = "I want a 2-bedroom investment apartment in Dubai under AED 5 million and I am still exploring.";
  const profile = extractSonuDiscoveryProfile([{ role: "user", content: query }]);
  const lowerEntry = sonuProjectFixture({
    name: "Lower Entry Residence",
    startingPrice: "2500000",
    bedrooms: ["2BR"],
    propertyTypes: ["Apartments"],
  });
  const nearCeiling = sonuProjectFixture({
    name: "Near Ceiling Residence",
    startingPrice: "4900000",
    bedrooms: ["2BR"],
    propertyTypes: ["Apartments"],
  });
  assert.ok(
    sonuProjectFitScore(lowerEntry, profile, query) >= sonuProjectFitScore(nearCeiling, profile, query),
  );
});

test("extracts a human buyer brief beyond the basic property fields", () => {
  const context = extractSonuDecisionContext([{
    role: "user",
    content: "Find me a family home by Emaar near schools and healthcare with a practical commute to DIFC. I will use a mortgage.",
  }], ["Emaar", "Emaar Properties", "Aldar"]);

  assert.deepEqual(context.preferredDevelopers, ["Emaar"]);
  assert.equal(context.developerStrict, true);
  assert.equal(context.household, "family");
  assert.equal(context.financing, "mortgage");
  assert.ok(context.priorities.includes("family"));
  assert.ok(context.priorities.includes("schools"));
  assert.ok(context.priorities.includes("healthcare"));
  assert.ok(context.priorities.includes("business-access"));
  assert.deepEqual(context.destinations, ["DIFC"]);
});

test("preserves a shortlist when the visitor says which one and recognises net-income intent", () => {
  const messages = [
    {
      role: "user" as const,
      content: "I want a 2-bedroom investment apartment in Dubai under AED 3 million but I am not sure which area.",
    },
    {
      role: "user" as const,
      content: "I care about high net income but I also want reasonable resale liquidity.",
    },
    {
      role: "user" as const,
      content: "Which one would you recommend, and what is the catch?",
    },
  ];
  const profile = extractSonuDiscoveryProfile(messages);
  const context = extractSonuDecisionContext(messages, ["The", "ONE", "Emaar"]);
  const projects = sonuRankedProjectSuggestions(messages);

  assert.equal(profile.investmentPriority, "Rental income");
  assert.ok(context.priorities.includes("rental-income"));
  assert.ok(context.priorities.includes("resale-liquidity"));
  assert.deepEqual(context.preferredDevelopers, []);
  assert.equal(context.developerStrict, false);
  assert.ok(projects.length > 0);

  const reply = contextualProjectReply(
    projects,
    messages,
    sonuDiscoveryNextQuestion(profile),
    context,
  );
  assert.match(reply, new RegExp(projects[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(reply, /Based on what you have told me/i);
  assert.match(reply, /The catch is/i);
  assert.match(reply, /One detail would sharpen that view/i);
  assert.doesNotMatch(reply, /Got it|preliminary shortlist/i);
});

test("does not reinterpret a bare emirate name as a developer preference", () => {
  const context = extractSonuDecisionContext([{
    role: "user",
    content: "Recommend a 2-bedroom apartment by Emaar in Dubai.",
  }], ["Emaar", "Dubai", "Dubai Properties"]);

  assert.deepEqual(context.preferredDevelopers, ["Emaar"]);
  assert.equal(context.developerStrict, true);
});

test("distinguishes workplace destinations and pronouns from explicit developer requests", () => {
  const destinationContext = extractSonuDecisionContext([{
    role: "user",
    content: "We have children, need good schools, and I work in DIFC. Which one would you recommend?",
  }], ["DIFC", "ONE", "The", "Emaar"]);
  assert.deepEqual(destinationContext.destinations, ["DIFC"]);
  assert.deepEqual(destinationContext.preferredDevelopers, []);

  const explicitDeveloper = extractSonuDecisionContext([{
    role: "user",
    content: "Show me a project by ONE only.",
  }], ["ONE", "Emaar"]);
  assert.deepEqual(explicitDeveloper.preferredDevelopers, ["ONE"]);
  assert.equal(explicitDeveloper.developerStrict, true);
});

test("uses family and daily-life priorities to rank community fit without changing hard criteria", () => {
  const context = extractSonuDecisionContext([{
    role: "user",
    content: "This is for my children. Schools, parks and healthcare matter, with a practical commute to DIFC.",
  }]);
  const familyCommunity = sonuProjectFixture({
    name: "Dubai Hills Family Residence",
    area: "Dubai Hills Estate",
    propertyTypes: ["Apartments"],
    lifestyles: [],
  });
  const visitorCommunity = sonuProjectFixture({
    name: "Palm Visitor Residence",
    area: "Palm Jumeirah",
    propertyTypes: ["Apartments"],
    lifestyles: ["Beachfront"],
  });

  assert.ok(
    sonuAdvisoryScore(familyCommunity, context, "Apartment")
      > sonuAdvisoryScore(visitorCommunity, context, "Apartment"),
  );
});

test("keeps area ROI dated, property-type specific and separate from unit net yield", () => {
  const apartment = sonuProjectFixture({
    area: "Jumeirah Village Circle (JVC)",
    propertyTypes: ["Apartments"],
  });
  const townhouse = sonuProjectFixture({
    area: "Jumeirah Village Circle (JVC)",
    propertyTypes: ["Townhouses"],
  });
  const signal = sonuMarketSignalForProject(apartment, "Apartment", new Date("2026-08-27T00:00:00Z"));

  assert.equal(signal?.projectedGrossRoi, 7.15);
  assert.match(signal?.scope || "", /not unit-level net yield/i);
  assert.equal(sonuMarketSignalForProject(townhouse, "Townhouse", new Date("2026-08-27T00:00:00Z")), null);
  assert.equal(sonuMarketSignalForProject(apartment, "Apartment", new Date("2027-03-01T00:00:00Z")), null);
});

test("turns school, healthcare and commute priorities into verification questions", () => {
  const context = extractSonuDecisionContext([{
    role: "user",
    content: "I need a family apartment near a British school and hospital, and I work in Business Bay.",
  }]);
  const project = sonuProjectFixture({
    area: "Dubai Hills Estate",
    propertyTypes: ["Apartments"],
  });
  const evidence = sonuAdvisoryEvidence(project, context, "Apartment");

  assert.ok(evidence.fitSignals.some((signal) => /family living/i.test(signal)));
  assert.ok(evidence.evidenceGaps.some((gap) => /exact school/i.test(gap)));
  assert.ok(evidence.evidenceGaps.some((gap) => /clinic or hospital/i.test(gap)));
  assert.match(sonuAdvisoryFollowUp(context), /Which school or curriculum/i);
});

test("answers direct ROI-area questions with dated gross signals and an explicit net-yield caveat", () => {
  const query = "Which family-oriented apartment areas near schools have high ROI and access to Downtown Dubai?";
  const context = extractSonuDecisionContext([{ role: "user", content: query }]);
  const reply = sonuAdvisoryKnowledgeReply(query, context, new Date("2026-08-27T00:00:00Z"));

  assert.match(reply, /H1 2026 area signals/i);
  assert.match(reply, /projected gross returns/i);
  assert.match(reply, /not achieved unit rent or net yield/i);
  assert.match(reply, /school or curriculum/i);
  assert.doesNotMatch(reply, /guaranteed/i);
});

test("handles harmless human detours without losing the active property brief", () => {
  const messages = [
    { role: "user" as const, content: "Find an investment" },
    { role: "assistant" as const, content: "For the investment, should I focus on apartments, villas or townhouses?" },
    { role: "user" as const, content: "I want a villa" },
    { role: "assistant" as const, content: "I’ll keep the search to villa options. How many bedrooms do you genuinely need?" },
    { role: "user" as const, content: "2 bedrooms" },
    { role: "assistant" as const, content: "Two bedrooms gives me a useful brief. What total purchase budget feels comfortable without stretching you?" },
    { role: "user" as const, content: "I will buy, but tell me first how to make a hamburger" },
  ];
  const profile = extractSonuDiscoveryProfile(messages);
  const question = sonuDiscoveryNextQuestion(profile);
  const reply = sonuHarmlessDetourReply(messages.at(-1)?.content || "", question);

  assert.equal(question?.key, "budget");
  assert.match(reply, /toast the bun/i);
  assert.match(reply, /lunch wins the negotiation/i);
  assert.match(reply, /maximum purchase budget/i);
  assert.equal(sonuReplyPassesSalesGuardrails(reply), true);
});

test("keeps quick replies aligned after a harmless Sonu detour", async () => {
  const storageMap = new Map<string, unknown>();
  const agent = new SonuPublicAgent({
    storage: {
      async get(key: string) { return storageMap.get(key); },
      async put(key: string, value: unknown) { storageMap.set(key, value); },
    },
  } as unknown as ConstructorParameters<typeof SonuPublicAgent>[0], { DB: null, AI: null } as unknown as ConstructorParameters<typeof SonuPublicAgent>[1]);
  async function send(message: string) {
    const response = await agent.fetch(new Request("https://psrhomes.ae/api/sonu-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, requestId: crypto.randomUUID() }),
    }));
    return await response.json() as { messages: Array<{ content: string }>; quickReplies: Array<{ label: string }> };
  }

  await send("Find an investment");
  await send("I want a villa");
  await send("2 bedrooms");
  const detour = await send("I will buy, but tell me first how to make a hamburger");

  assert.match(detour.messages.at(-1)?.content || "", /before lunch wins the negotiation/i);
  assert.deepEqual(detour.quickReplies.map((reply) => reply.label), [
    "Under AED 1m",
    "AED 1–2m",
    "AED 2–5m",
    "AED 5–10m",
    "AED 10m+",
  ]);
});

test("asks for property type instead of mixing apartment and villa ROI signals", () => {
  const query = "Which family area has the best ROI?";
  const context = extractSonuDecisionContext([{ role: "user", content: query }]);
  const reply = sonuAdvisoryKnowledgeReply(query, context, new Date("2026-08-27T00:00:00Z"));

  assert.match(reply, /not interchangeable/i);
  assert.match(reply, /apartments or villas/i);
});

test("honours an explicit developer constraint in the live PSR shortlist", () => {
  const messages = [{
    role: "user" as const,
    content: "Recommend a 2-bedroom investment apartment by Emaar in Dubai, budget AED 5 million, still exploring, balanced income and growth.",
  }];
  const projects = sonuRankedProjectSuggestions(messages);

  assert.ok(projects.length > 0);
  assert.ok(projects.every((project) => sonuDeveloperMatches(project.developer, ["Emaar"])));
});

test("diversifies the leading cards when the visitor asks to compare emirates", () => {
  const projects = sonuRankedProjectSuggestions([{
    role: "user",
    content: "Compare the strongest UAE locations for a 2-bedroom investment apartment under AED 3 million, still exploring, with balanced income and growth.",
  }]);
  const emirates = projects.slice(0, 3).map((project) => project.location.split(",").at(-1)?.trim());

  assert.ok(projects.length >= 3);
  assert.equal(new Set(emirates).size, 3);
});

test("favours better-documented records and exposes investment evidence gaps", () => {
  const complete = sonuProjectFixture();
  const incomplete = sonuProjectFixture({
    paymentPlan: "",
    handover: "",
    lifestyles: [],
    brochure: "",
    sourceUpdatedAt: "",
  });
  assert.ok(sonuProjectEvidenceScore(complete) > sonuProjectEvidenceScore(incomplete));

  const profile = extractSonuDiscoveryProfile([{
    role: "user",
    content: "I want a 4-bedroom investment villa in Dubai under AED 10 million, prioritise rental income this year.",
  }]);
  const basis = sonuRecommendationBasis({
    slug: complete.slug,
    name: complete.name,
    image: complete.image,
    developer: complete.developer,
    location: `${complete.area}, ${complete.emirate}`,
    startingPrice: "From AED 4,000,000",
    priceScope: "project",
    paymentPlan: complete.paymentPlan,
    handover: complete.handover,
    bedrooms: complete.bedrooms,
    propertyTypes: complete.propertyTypes,
    lifestyles: complete.lifestyles,
  }, profile);
  assert.ok(basis.evidenceGaps.some((gap) => /rent, occupancy, service charges and net yield/i.test(gap)));
  assert.match(basis.verificationStep, /unit economics and comparable evidence/i);
});

test("returns only strict catalogue matches for a complete family-villa brief", () => {
  const projects = sonuRankedProjectSuggestions([{
    role: "user",
    content: "I need a 4-bedroom villa in Dubai for my family, budget AED 10 million, ready immediately.",
  }]);
  assert.ok(projects.length > 0);
  assert.ok(projects.every((project) => /Dubai/i.test(project.location)));
  assert.ok(projects.every((project) => project.propertyTypes.some((type) => /villa/i.test(type))));
  assert.ok(projects.every((project) => project.bedrooms.includes("4BR")));
  assert.ok(projects.every((project) => Number(project.startingPrice.replace(/[^\d]/g, "")) <= 10_000_000));
  assert.notEqual(projects[0].handover, "Q4 2030");
});

test("diagnoses a strict catalogue no-match instead of asking a generic discovery question", () => {
  const profile = extractSonuDiscoveryProfile([{
    role: "user",
    content: "I want a 2 bedroom investment on Palm Jumeirah under AED 5 million for rental income, ready within a year. Recommend the strongest matches.",
  }]);
  const relaxations = sonuNoMatchRelaxations(profile).map(({ key }) => key);
  const reply = sonuNoMatchReply(profile);

  assert.deepEqual(relaxations.slice(0, 3), ["timeline", "budget", "bedrooms"]);
  assert.match(reply, /do not have a current PSR catalogue record/i);
  assert.match(reply, /Palm Jumeirah/i);
  assert.match(reply, /handover window, budget, bedroom requirement, or location/i);
  assert.match(reply, /Which single criterion/i);
  assert.doesNotMatch(reply, /Would you like me to focus on apartments/i);
});
