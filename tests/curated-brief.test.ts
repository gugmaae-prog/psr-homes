import assert from "node:assert/strict";
import test from "node:test";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { curatedLaunches } from "../data/curated-launches";
import { emirateProfiles } from "../data/emirates";
import { emirateMarketOverviews, uaeMarketOverview } from "../data/emirate-market-overviews";
import registryData from "../data/projects.json";
import { getCommunityDirectory } from "../lib/taxonomy";
import {
  buildCuratedBriefContent,
  buildProjectResearch,
  buildReportProjects,
  buildSelectedProjectDistances,
  renderCuratedBriefPdf,
  type EmirateReportContext,
  type ReportProjectRecord,
} from "../worker/curated-brief";
import { PSR_REPORT_COMPANY, PSR_REPORT_LOGO_PATH } from "../worker/report-branding";
import { institutionalReportCopy, PSR_REPORT_VARIABILITY_NOTICE } from "../worker/psr-report-standards";

const registry = registryData as { projects: ReportProjectRecord[] };
const project = registry.projects.find((item) => item.slug === "arancia-yards-2-beyond-city-of-arabia-dubai");
if (!project) throw new Error("Valuation test project is missing.");
const richCuratedProject = curatedLaunches.find((item) => item.slug === "113-residences-iman-developers-al-sufouh-dubai") as ReportProjectRecord | undefined;
const typedMediaProject = curatedLaunches.find((item) => item.slug === "binghatti-wraith-al-jaddaf-dubai") as ReportProjectRecord | undefined;
const abuDhabiLivingProject = curatedLaunches.find((item) => item.slug === "marlin-ii-reportage-al-reem-island-abu-dhabi") as ReportProjectRecord | undefined;
const registryOnlyMediaProject = registry.projects.find((item) => item.slug === "marea-residences-sharafi-dubai-islands");
const reportAdvisor = {
  name: "Test Advisor",
  email: "test@psrhomes.ae",
  phone: "+971 50 000 0000",
  title: "Property Advisor",
  avatarUrl: "/team/test-advisor.webp",
  profileSummary: "Evidence-led cross-emirate investment advice for private clients.",
  specialties: ["Investment advisory", "Off-plan property"],
  languages: ["English", "Arabic"],
};

test('new Dubai South report snapshots use reviewed plans and retain source qualification', () => {
  const fixture = {...project, slug: 'golf-vale-emaar-south-dubai', name: 'Golf Vale'} as ReportProjectRecord;
  const [oneBedroom] = buildReportProjects([fixture], [{slug:fixture.slug,bedroom:'1BR',unitPrice:1_200_000,unitAreaSqft:672}]);
  assert.equal(oneBedroom.floorplanReferences?.length,2);
  assert.deepEqual(oneBedroom.mediaSections.floorplans,oneBedroom.floorplanReferences?.map(reference=>reference.url));
  assert(oneBedroom.floorplanReferences?.every(reference=>reference.sourceUrl.includes('propertyfinder.ae')&&reference.matchStatus!=='exact-unit'));
  const [twoBedroom] = buildReportProjects([fixture], [{slug:fixture.slug,bedroom:'2BR',unitPrice:1_600_000,unitAreaSqft:1000}]);
  assert.deepEqual(twoBedroom.mediaSections.floorplans,[]);
  assert.deepEqual(twoBedroom.floorplanReferences,[]);
});

function projectInput(item: ReportProjectRecord, index: number) {
  return {
    slug: item.slug,
    bedroom: item.bedrooms[0] || "Selected configuration",
    unitReference: `Emirate context fixture ${index + 1}`,
    unitPrice: 2_000_000 + index * 100_000,
    unitAreaSqft: 1_000 + index * 25,
    annualRent: 130_000 + index * 5_000,
    annualRentLow: 120_000 + index * 5_000,
    annualRentHigh: 140_000 + index * 5_000,
    occupancyRate: 95,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 100_000 + index * 5_000,
    rentalEvidenceNotes: "Dated emirate-level context fixture.",
    confirmationNotes: "Automated emirate context fixture.",
  };
}

function contentForProjects(items: ReportProjectRecord[]) {
  return buildCuratedBriefContent({
    projects: buildReportProjects(items, items.map(projectInput)),
    brief: "Compare each selected emirate using current signals and future catalysts.",
    narrative: {},
    advisor: reportAdvisor,
    confirmedAt: "2026-09-06T00:00:00.000Z",
  });
}

function contextsFrom(content: ReturnType<typeof buildCuratedBriefContent>) {
  return content.emirateContexts satisfies EmirateReportContext[];
}

function extractGeneratedPdfText(pdf: PDFDocument) {
  const fragments: string[] = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    let stream = "";
    try {
      stream = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    } catch {
      continue;
    }
    for (const match of stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      fragments.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
  }
  return fragments.join(" ").replace(/\s+/g, " ");
}

function extractGeneratedPdfPageText(pdf: PDFDocument, pageIndex: number) {
  const contents = pdf.getPage(pageIndex).node.Contents();
  if (!contents) return "";
  const fragments: string[] = [];
  const contentObjects = contents instanceof PDFArray
    ? contents.asArray().map((reference) => pdf.context.lookup(reference))
    : [contents];
  for (const object of contentObjects) {
    if (!(object instanceof PDFRawStream)) continue;
    let stream = "";
    try {
      stream = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    } catch {
      continue;
    }
    for (const match of stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      fragments.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
  }
  return fragments.join(" ").replace(/\s+/g, " ");
}

test("recalculates unit, rent, occupancy and payment figures from advisor inputs", () => {
  const [result] = buildReportProjects([project], [{
    slug: project.slug,
    bedroom: "2BR",
    unitReference: "2BR scenario",
    unitPrice: 2_250_000,
    unitAreaSqft: 1_180,
    annualRent: 155_000,
    annualRentLow: 140_000,
    annualRentHigh: 170_000,
    occupancyRate: 95,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 101_000,
    rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
    confirmationNotes: "Test scenario.",
  }]);

  assert.equal(result.unitPrice, 2_250_000);
  assert.equal(Math.round(result.unitPricePerSqft), 1_907);
  assert.equal(result.annualServiceCharge, 21_240);
  assert.equal(result.effectiveAnnualRent, 147_250);
  assert.equal(result.effectiveNetAnnualIncome, 123_510);
  assert.equal(result.paymentSchedule.length, 2);
  assert.deepEqual(result.paymentSchedule.map((item) => item.amount), [900_000, 1_350_000]);
  assert.equal(result.advisoryScreen.factors.reduce((sum, factor) => sum + factor.weight, 0), 100);
  assert.match(result.rentalEvidence.indexUrl, /dubailand\.gov\.ae/);
  assert.equal(result.demographicContext?.scope, "Dubai emirate-wide context, not a community estimate");
});

test("adds rental evidence and the transparent advisory screen to client content", () => {
  const projects = buildReportProjects([project], [{
    slug: project.slug,
    bedroom: "2BR",
    unitReference: "2BR scenario",
    unitPrice: 2_250_000,
    unitAreaSqft: 1_180,
    annualRent: 155_000,
    annualRentLow: 140_000,
    annualRentHigh: 170_000,
    occupancyRate: 95,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 101_000,
    rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
    confirmationNotes: "Test scenario.",
  }]);
  const content = buildCuratedBriefContent({
    projects,
    brief: "Rental and community review.",
    narrative: {},
    advisor: {
      name: "Test Advisor",
      email: "test@psr.espacios.me",
      phone: "+971 50 000 0000",
      title: "Property Advisor",
    },
    confirmedAt: "2026-07-25T12:00:00.000Z",
  });

  assert.ok(content.marketContext.headline.some((item) => item.label === "Q1 2026 rental contracts"));
  assert.ok(content.marketContext.sources.some((source) => source.label === "Dubai Land Department Rental Index"));
  assert.deepEqual(content.marketContext.researchCoverage.emirates, ["Dubai"]);
  assert.equal(content.marketContext.researchCoverage.selectedProjects, 1);
  assert.equal(content.marketContext.researchCoverage.areas, 1);
  assert.ok(content.marketContext.researchCoverage.pipelineRecords >= 0);
  assert.match(content.confirmation.statement, /sensitivity range/);
  assert.match(content.recommendation, /exact unit price/);
  assert.ok(projects[0].mediaGallery.length >= 1);
  assert.equal(projects[0].mediaGallery[0], project.image);
});

test("enforces institutional report voice and the current-data disclosure", () => {
  const content = buildCuratedBriefContent({
    projects: buildReportProjects([project], [projectInput(project, 0)]),
    brief: "Institutional voice fixture.",
    narrative: {
      executiveSummary: "I have prepared this review and I will verify the unit.",
      recommendation: "I would run two routes for the client.",
      marketPosition: "I am reviewing the available evidence.",
    },
    advisor: { ...reportAdvisor, profileSummary: "I lead this review for PSR Homes." },
    confirmedAt: "2026-09-07T00:00:00.000Z",
  });

  assert.equal(institutionalReportCopy("I would test my assumptions before I proceed."), "We would test our assumptions before We proceed.");
  assert.doesNotMatch(`${content.executiveSummary} ${content.recommendation} ${content.marketPosition} ${content.advisor.profileSummary}`, /\bI\b/);
  assert.match(content.executiveSummary, /^We have/);
  assert.match(content.recommendation, /^We would/);
  assert.equal(content.disclosure, PSR_REPORT_VARIABILITY_NOTICE);
  assert.match(content.confirmation.statement, /Prices, availability, inventory/);
});

test("snapshots the company, UAE platform and complete advisor profile at generation", () => {
  const content = contentForProjects([project]);

  assert.equal(content.companyProfile.legalName, PSR_REPORT_COMPANY.legalName);
  assert.equal(content.companyProfile.displayName, PSR_REPORT_COMPANY.displayName);
  assert.equal(content.companyProfile.orn, PSR_REPORT_COMPANY.orn);
  assert.equal(content.companyProfile.sourceUrl, "https://www.psrhomes.ae/");
  assert.match(content.companyProfile.summary, /project comparison/i);
  assert.ok(content.companyProfile.services.length >= 8);

  assert.equal(content.uaeContext.headline, uaeMarketOverview.headline);
  assert.equal(content.uaeContext.summary, uaeMarketOverview.summary);
  assert.equal(content.uaeContext.imageUrl, uaeMarketOverview.cover.src);
  assert.equal(content.uaeContext.imageCredit, uaeMarketOverview.cover.credit);
  assert.deepEqual(content.uaeContext.forces, uaeMarketOverview.forces);
  assert.deepEqual(
    content.uaeContext.initiatives.map((item) => item.id),
    uaeMarketOverview.futureInitiatives.slice(0, 6).map((item) => item.id),
  );
  assert.ok(content.uaeContext.sources.every((source) => source.url && source.verifiedAt));
  assert.match(content.uaeContext.timeline.future, /targets remain separate from delivered outcomes/i);

  assert.equal(content.advisor.avatarUrl, reportAdvisor.avatarUrl);
  assert.equal(content.advisor.profileSummary, reportAdvisor.profileSummary);
  assert.deepEqual(content.advisor.specialties, reportAdvisor.specialties);
  assert.deepEqual(content.advisor.languages, reportAdvisor.languages);
});

test("keeps Dubai-wide headline metrics and charts out of a mixed-emirate shortlist", () => {
  const dubai = registry.projects.find((item) => item.emirate === "Dubai" && !item.archived);
  const abuDhabi = registry.projects.find((item) => item.emirate === "Abu Dhabi" && !item.archived);
  if (!dubai) throw new Error("Dubai mixed-market fixture is missing.");
  if (!abuDhabi) throw new Error("Abu Dhabi mixed-market fixture is missing.");

  const market = contentForProjects([dubai, abuDhabi]).marketContext;
  const headlineLabels = market.headline.map((item) => item.label);
  const chartTitles = market.charts.map((item) => item.title);

  assert.deepEqual(market.researchCoverage.emirates, ["Dubai", "Abu Dhabi"]);
  assert.ok(headlineLabels.includes("Selected projects"), "expected neutral shortlist coverage metrics");
  assert.ok(!headlineLabels.includes("H1 2026 residential sales"));
  assert.ok(!headlineLabels.includes("H1 2026 sales value"));
  assert.ok(!headlineLabels.includes("Average gross rental yield"));
  assert.ok(!headlineLabels.includes("Q1 2026 rental contracts"));
  assert.ok(!chartTitles.includes("Residential sales value"));
  assert.ok(!chartTitles.includes("Monthly transaction momentum"));
});

test("adds deduplicated emirate investment cases with current signals, future catalysts and preserved sources", () => {
  const dubaiProjects = registry.projects.filter((item) => item.emirate === "Dubai" && !item.archived).slice(0, 2);
  const abuDhabi = registry.projects.find((item) => item.emirate === "Abu Dhabi" && !item.archived);
  const rasAlKhaimah = registry.projects.find((item) => item.emirate === "Ras Al Khaimah" && !item.archived);
  assert.equal(dubaiProjects.length, 2, "Dubai context fixtures are missing");
  if (!abuDhabi) throw new Error("Abu Dhabi context fixture is missing.");
  if (!rasAlKhaimah) throw new Error("Ras Al Khaimah context fixture is missing.");

  const content = contentForProjects([abuDhabi, dubaiProjects[0], rasAlKhaimah, dubaiProjects[1]]);
  const contexts = contextsFrom(content);
  assert.ok(contexts, "expected selected-emirate report contexts");
  assert.deepEqual(
    contexts.map((context) => [context.slug, context.name]),
    [
      ["abu-dhabi", "Abu Dhabi"],
      ["dubai", "Dubai"],
      ["ras-al-khaimah", "Ras Al Khaimah"],
    ],
    "contexts should deduplicate by emirate while retaining first-selection order",
  );

  const dubai = contexts.find((context) => context.slug === "dubai");
  const ad = contexts.find((context) => context.slug === "abu-dhabi");
  const rak = contexts.find((context) => context.slug === "ras-al-khaimah");
  assert.ok(dubai && ad && rak);

  assert.equal(dubai.descriptor, emirateMarketOverviews.dubai.descriptor);
  assert.deepEqual(dubai.anchors, [
    { label: "Economic anchor", value: emirateMarketOverviews.dubai.comparison.economicAnchor },
    { label: "Defining asset", value: emirateMarketOverviews.dubai.comparison.definingAsset },
    { label: "Natural advantage", value: emirateMarketOverviews.dubai.comparison.naturalAsset },
    { label: "Next catalyst", value: emirateMarketOverviews.dubai.comparison.nextCatalyst },
  ]);
  assert.deepEqual(dubai.timeline, {
    past: emirateMarketOverviews.dubai.timeline.past,
    present: emirateMarketOverviews.dubai.timeline.present,
    future: emirateMarketOverviews.dubai.timeline.outlook,
  });
  assert.deepEqual(
    dubai.knowledgePillars.map((pillar) => [pillar.id, pillar.label, pillar.signals.map((signal) => signal.sourceIds)]),
    emirateMarketOverviews.dubai.pillars.map((pillar) => [pillar.id, pillar.label, pillar.signals.map((signal) => signal.sourceIds)]),
  );
  const dubaiProfile = emirateProfiles.find((profile) => profile.slug === "dubai");
  assert.ok(dubaiProfile);
  assert.deepEqual(
    dubai.gallery.map((image) => image.src),
    dubaiProfile.gallery.filter((image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index).slice(0, 3).map((image) => image.src),
  );
  assert.ok(dubai.gallery.every((image) => image.credit === "PSR public website media library"));
  assert.match(dubai.investmentCase, /global gateway/i);
  const dubaiCatalyst = dubai.catalysts.find((item) => item.id === "dubai-blue-line");
  const dubaiSource = emirateMarketOverviews.dubai.sources.find((item) => item.id === "metro-blue-line");
  assert.ok(dubaiCatalyst && dubaiSource);
  assert.equal(dubaiCatalyst.status, "Under construction");
  assert.equal(dubaiCatalyst.sourceLabel, dubaiSource.label);
  assert.equal(dubaiCatalyst.sourceUrl, dubaiSource.href);
  assert.equal(
    dubaiCatalyst.sourceUrl,
    "https://rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/10percent-progress-achieved-on-the-metro-blue-line-within-five-months-of-project-commencement",
  );
  assert.deepEqual(
    dubai.sources.find((item) => item.id === dubaiSource.id),
    { id: dubaiSource.id, label: dubaiSource.label, publisher: dubaiSource.publisher, url: dubaiSource.href, verifiedAt: dubaiSource.verifiedAt },
  );

  const yasSignal = ad.signals.find((item) => item.title === "Yas Island entertainment");
  assert.ok(yasSignal);
  assert.match(yasSignal.detail, /Ferrari World operates today/);
  assert.match(yasSignal.detail, /announced future additions/);
  assert.match(yasSignal.detail, /must not be presented as open/);
  assert.deepEqual(yasSignal.sourceIds, ["ferrari-world", "disney-ad", "harry-potter-ad"]);
  const disneyCatalyst = ad.catalysts.find((item) => item.id === "disney-ad");
  const disneySource = emirateMarketOverviews["abu-dhabi"].sources.find((item) => item.id === "disney-ad");
  assert.ok(disneyCatalyst && disneySource);
  assert.equal(disneyCatalyst.status, "Announced");
  assert.equal(disneyCatalyst.timing, "Opening date not announced");
  assert.equal(disneyCatalyst.sourceLabel, disneySource.label);
  assert.equal(disneyCatalyst.sourceUrl, disneySource.href);
  assert.equal(disneyCatalyst.sourceUrl, "https://thewaltdisneycompany.com/news/disney-announces-abu-dhabi-theme-park/");
  assert.deepEqual(
    ad.sources.find((item) => item.id === disneySource.id),
    { id: disneySource.id, label: disneySource.label, publisher: disneySource.publisher, url: disneySource.href, verifiedAt: disneySource.verifiedAt },
  );

  const alMarjanSignal = rak.signals.find((item) => item.title === "Al Marjan Island");
  assert.ok(alMarjanSignal);
  assert.match(alMarjanSignal.detail, /operating destination/i);
  assert.match(alMarjanSignal.detail, /future plots and launches/i);
  const wynnCatalyst = rak.catalysts.find((item) => item.id === "wynn-rak");
  const wynnSource = emirateMarketOverviews["ras-al-khaimah"].sources.find((item) => item.id === "wynn-rak");
  assert.ok(wynnCatalyst && wynnSource);
  assert.equal(wynnCatalyst.status, "Under construction");
  assert.match(wynnCatalyst.timing, /Spring 2027/);
  assert.equal(wynnCatalyst.sourceLabel, wynnSource.label);
  assert.equal(wynnCatalyst.sourceUrl, wynnSource.href);
  assert.equal(
    wynnCatalyst.sourceUrl,
    "https://www.newsroom.wynnresorts.com/en/wynnalmarjan/wynn-al-marjan-island-unveils-beach--lagoon--and-reef--offering-first-glimpse-of-future-shoreline-ex/s/c7506377-c4e6-48c9-ac9e-c324f33f9695",
  );
  assert.deepEqual(
    rak.sources.find((item) => item.id === wynnSource.id),
    { id: wynnSource.id, label: wynnSource.label, publisher: wynnSource.publisher, url: wynnSource.href, verifiedAt: wynnSource.verifiedAt },
  );
});

test("preserves the Market Atlas cover credit and disclaimer in each emirate context", () => {
  const dubai = registry.projects.find((item) => item.emirate === "Dubai" && !item.archived);
  const abuDhabi = registry.projects.find((item) => item.emirate === "Abu Dhabi" && !item.archived);
  if (!dubai) throw new Error("Dubai cover-credit fixture is missing.");
  if (!abuDhabi) throw new Error("Abu Dhabi cover-credit fixture is missing.");

  const contexts = contextsFrom(contentForProjects([dubai, abuDhabi]));
  for (const context of contexts) {
    assert.equal(context.imageCredit, emirateMarketOverviews[context.slug].cover.credit);
    assert.match(context.imageCredit, /editorial composite/i);
    assert.match(context.imageCredit, /not an official map/i);
  }
  assert.match(
    contexts.find((context) => context.slug === "abu-dhabi")?.imageCredit || "",
    /not an official map, attraction design or masterplan/i,
  );
});

test("pulls selected communities and daily-life establishments from the website evidence layer", () => {
  if (!abuDhabiLivingProject) throw new Error("Abu Dhabi community-and-establishment fixture is missing.");
  const projects = buildReportProjects([abuDhabiLivingProject], [projectInput(abuDhabiLivingProject, 0)]);
  const [snapshot] = projects;
  const [context] = contextsFrom(contentForProjects([abuDhabiLivingProject]));
  assert.ok(snapshot.communityContext, "expected the selected project to resolve through the public community directory");
  const canonicalCommunity = getCommunityDirectory().find((community) => community.slug === snapshot.communityContext?.slug && community.emirate === "Abu Dhabi");
  assert.ok(canonicalCommunity);
  assert.equal(snapshot.communityContext.name, canonicalCommunity.name);
  assert.equal(snapshot.communityContext.imageUrl, canonicalCommunity.image);
  assert.match(snapshot.communityContext.timeline.past, /recorded by|verified development-history record is not stored/i);
  assert.match(snapshot.communityContext.timeline.present, new RegExp(`${canonicalCommunity.activeProjects} active project`, "i"));
  assert.match(snapshot.communityContext.timeline.future, new RegExp(snapshot.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.deepEqual(snapshot.communityContext.selectedProjects, [{
    name: snapshot.name,
    developer: snapshot.developer,
    handover: snapshot.handover,
  }]);
  assert.deepEqual(context.communities, [snapshot.communityContext]);
  assert.ok(snapshot.publishedTravelTimes.some((place) => place.destination === "Reem Mall"));
  assert.ok(snapshot.publishedTravelTimes.some((place) => place.destination === "Cleveland Clinic Abu Dhabi"));
  assert.ok(context.establishments.some((place) => place.name === "Reem Mall" && place.category === "Retail and leisure"));
  assert.ok(context.establishments.some((place) => place.name === "Cleveland Clinic Abu Dhabi" && place.category === "Healthcare"));
  assert.ok(new Set(context.establishments.map((place) => place.category)).size >= 4, "expected a category-diverse living-infrastructure screen");
});

test("renders selected-emirate investment and evidence sections with preserved status", async () => {
  const abuDhabi = abuDhabiLivingProject;
  if (!abuDhabi) throw new Error("Abu Dhabi PDF context fixture is missing.");
  const content = contentForProjects([abuDhabi]);
  const contexts = contextsFrom(content);
  assert.equal(contexts?.length, 1);

  const document = {
    id: "emirate-context-pdf-test",
    type: "proposal" as const,
    title: "Abu Dhabi investment context",
    client_name: "Test Client",
    created_at: "2026-09-06T00:00:00.000Z",
    content,
  };
  const withoutEmirateContext = {
    ...document,
    content: {
      ...content,
      emirateContexts: [],
      projects: content.projects.map((project) => ({ ...project, emirate: "Unmapped test emirate" })),
    },
  };
  const [baselineBytes, enrichedBytes] = await Promise.all([
    renderCuratedBriefPdf(withoutEmirateContext, {}),
    renderCuratedBriefPdf(document, {}),
  ]);
  const baselinePdf = await PDFDocument.load(baselineBytes);
  const enrichedPdf = await PDFDocument.load(enrichedBytes);
  const renderedText = extractGeneratedPdfText(enrichedPdf);
  const selectedCommunityKeys = new Set(contexts.flatMap((context) => context.communities.map((community) => `${community.slug}|${community.name}`)));

  assert.equal(
    enrichedPdf.getPageCount(),
    baselinePdf.getPageCount() + contexts.length * 4 + selectedCommunityKeys.size,
    "expected four dedicated pages per selected emirate plus one page per deduplicated selected community",
  );
  assert.match(renderedText, /PSR COMPANY AND ADVISOR/);
  assert.match(renderedText, /Evidence-led cross-emirate investment advice for private clients/);
  assert.match(renderedText, /Languages: English, Arabic/);
  assert.match(renderedText, /NATIONAL INVESTMENT PLATFORM/);
  assert.match(renderedText, /INVESTMENT PLATFORM TIMELINE/);
  assert.match(renderedText, /EMIRATE INVESTMENT CASE/);
  assert.match(renderedText, /PLACE AND DEMAND DRIVERS/);
  assert.match(renderedText, /TRACKED INITIATIVES/);
  assert.match(renderedText, /Abu Dhabi: communities and establishments/);
  assert.match(renderedText, /LOCAL PLACES, SERVICES AND DESTINATION NETWORK/);
  assert.match(renderedText, /EMIRATE KNOWLEDGE ATLAS/);
  assert.match(renderedText, /MARKET EVOLUTION/);
  assert.match(renderedText, /FOUR-PILLAR INVESTMENT KNOWLEDGE/);
  assert.match(renderedText, /EMIRATE VISUAL CONTEXT/);
  assert.match(renderedText, /SELECTED COMMUNITY/);
  assert.match(renderedText, /COMMUNITY TIMELINE/);
  assert.match(renderedText, /Reem Mall/);
  assert.match(renderedText, /Cleveland Clinic Abu Dhabi/);
  assert.match(renderedText, /Abu Dhabi/);
  assert.match(renderedText, /Ferrari World operates today/);
  assert.match(renderedText, /Disney theme park resort, Yas Island/);
  assert.match(renderedText, /OPENING DATE NOT ANNOUNCED/);
  assert.match(renderedText, /ANNOUNCED/);
});

test("renders one deduplicated community page when selected projects share a community", async () => {
  const sharedCommunityProjects = [
    curatedLaunches.find((item) => item.slug === "perla-heights-reportage-yas-island-abu-dhabi"),
    curatedLaunches.find((item) => item.slug === "perla-waves-reportage-yas-island-abu-dhabi"),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  assert.equal(sharedCommunityProjects.length, 2, "shared-community fixtures are missing");
  const content = contentForProjects(sharedCommunityProjects);
  assert.equal(content.emirateContexts.length, 1);
  assert.equal(content.emirateContexts[0].communities.length, 1);
  assert.equal(content.emirateContexts[0].communities[0].selectedProjects.length, 2);

  const document = {
    id: "deduplicated-community-page-test",
    type: "comparison" as const,
    title: "Shared-community comparison",
    client_name: "Test Client",
    created_at: "2026-09-06T00:00:00.000Z",
    content,
  };
  const [baselineBytes, enrichedBytes] = await Promise.all([
    renderCuratedBriefPdf({ ...document, content: { ...content, emirateContexts: [] } }, {}),
    renderCuratedBriefPdf(document, {}),
  ]);
  const baselinePdf = await PDFDocument.load(baselineBytes);
  const enrichedPdf = await PDFDocument.load(enrichedBytes);
  const communityPages = enrichedPdf.getPages()
    .map((_, index) => extractGeneratedPdfPageText(enrichedPdf, index))
    .filter((text) => /SELECTED COMMUNITY(?! CONTEXT)/.test(text));

  assert.equal(enrichedPdf.getPageCount(), baselinePdf.getPageCount() + 5, "expected four emirate pages and one shared community page");
  assert.equal(communityPages.length, 1);
  assert.match(communityPages[0], /Yas Island/);
  assert.match(communityPages[0], /Perla Heights/);
  assert.match(communityPages[0], /Perla Waves/);
});

test("does not infer the expanded hierarchy when legacy content omits its saved snapshots", async () => {
  const dubai = registry.projects.find((item) => item.emirate === "Dubai" && !item.archived);
  if (!dubai) throw new Error("Dubai legacy-content fixture is missing.");
  const content = contentForProjects([dubai]);
  const legacyContent: Partial<typeof content> = { ...content };
  delete legacyContent.emirateContexts;
  delete legacyContent.companyProfile;
  delete legacyContent.uaeContext;
  assert.equal("emirateContexts" in legacyContent, false);
  assert.equal("companyProfile" in legacyContent, false);
  assert.equal("uaeContext" in legacyContent, false);

  const explicitEmptyContent: Partial<typeof content> = { ...content, emirateContexts: [] };
  delete explicitEmptyContent.companyProfile;
  delete explicitEmptyContent.uaeContext;

  const baseDocument = {
    id: "legacy-emirate-context-pdf-test",
    type: "proposal" as const,
    title: "Legacy Dubai investment context",
    client_name: "Test Client",
    created_at: "2026-09-06T00:00:00.000Z",
  };
  const [explicitEmptyBytes, legacyBytes] = await Promise.all([
    renderCuratedBriefPdf({ ...baseDocument, content: explicitEmptyContent as typeof content }, {}),
    renderCuratedBriefPdf({ ...baseDocument, content: legacyContent as typeof content }, {}),
  ]);
  const explicitEmptyPdf = await PDFDocument.load(explicitEmptyBytes);
  const legacyPdf = await PDFDocument.load(legacyBytes);
  const legacyText = extractGeneratedPdfText(legacyPdf);

  assert.equal(legacyPdf.getPageCount(), explicitEmptyPdf.getPageCount());
  assert.doesNotMatch(legacyText, /PSR COMPANY AND ADVISOR/);
  assert.doesNotMatch(legacyText, /NATIONAL INVESTMENT PLATFORM/);
  assert.doesNotMatch(legacyText, /EMIRATE INVESTMENT CASE/);
  assert.doesNotMatch(legacyText, /PLACE AND DEMAND DRIVERS/);
  assert.doesNotMatch(legacyText, /TRACKED INITIATIVES/);
  assert.doesNotMatch(legacyText, /EMIRATE KNOWLEDGE ATLAS/);
  assert.doesNotMatch(legacyText, /SELECTED COMMUNITY/);
  assert.doesNotMatch(legacyText, /PROJECT PROPOSITION/);
});

test("carries curated project gallery, interiors, exteriors and floorplans into report snapshots", () => {
  const richProject = richCuratedProject;
  if (!richProject) throw new Error("Media-rich curated fixture is missing.");
  const curatedSource = curatedLaunches.find((item) => item.slug === richProject.slug);
  assert.ok(curatedSource);
  const [result] = buildReportProjects([richProject], [{
    slug: richProject.slug,
    bedroom: "2BR",
    unitReference: "2BR media fixture",
    unitPrice: 2_650_000,
    unitAreaSqft: 1_120,
    annualRent: 170_000,
    annualRentLow: 150_000,
    annualRentHigh: 190_000,
    occupancyRate: 94,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 120_000,
    rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
    confirmationNotes: "Automated media fixture.",
  }]);

  assert.ok(result.mediaGallery.length > 10);
  assert.ok(result.mediaGallery.some((image) => /1b_773_sqft\.jpg/.test(image)));
  assert.equal(new Set(result.mediaGallery).size, result.mediaGallery.length);
  assert.ok(result.mediaSections.exteriors.length > 0);
  assert.ok(result.mediaSections.interiors.length > 0);
  assert.ok(result.mediaSections.floorplans.length > 0);
  assert.ok(result.projectKnowledge);
  assert.equal(result.projectKnowledge.sourceUrl, curatedSource.sourceUrl);
  assert.equal(result.projectKnowledge.verifiedAt, curatedSource.sourceUpdatedAt);
  assert.deepEqual(result.projectKnowledge.overview, curatedSource.overview.slice(0, 4));
  assert.deepEqual(result.projectKnowledge.amenities, curatedSource.amenities.slice(0, 12));
  assert.deepEqual(result.projectKnowledge.investmentPoints, curatedSource.investmentPoints.slice(0, 8));
  assert.match(result.lifecycle.past, /checked on/i);
  assert.match(result.lifecycle.present, new RegExp(result.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(result.lifecycle.future, new RegExp(result.handover.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("screens a broader, category-diverse set of access and pipeline evidence", () => {
  const research = buildProjectResearch(project);
  assert.ok(research.nearby.length <= 8);
  assert.ok(research.upcoming.length <= 8);
  assert.equal(new Set(research.nearby.map((place) => `${place.name}|${place.category}`)).size, research.nearby.length);
  assert.ok(research.rentalEvidence.indexUrl.startsWith("https://"));
  assert.ok(research.rentalEvidence.datasetUrl.startsWith("https://"));
});

test("adds Dubai South renter-demand evidence and a complete selected-project distance matrix", () => {
  const dubaiSouthFixtures: ReportProjectRecord[] = [
    {
      ...project,
      slug: "distance-south-living",
      name: "South Living",
      developer: "Dubai South Properties",
      emirate: "Dubai",
      area: "Dubai South Residential District",
      coordinates: "24.928000,55.158000",
    },
    {
      ...project,
      slug: "distance-mag-5",
      name: "MAG 5 Boulevard",
      developer: "MAG",
      emirate: "Dubai",
      area: "Dubai South Residential District",
      coordinates: "24.906000,55.168000",
    },
    {
      ...project,
      slug: "distance-expo-valley",
      name: "Expo Valley Views",
      developer: "Expo City Dubai",
      emirate: "Dubai",
      area: "Expo Living at Expo City Dubai",
      coordinates: "24.9583519,55.1496137",
    },
  ];
  const reportProjects = buildReportProjects(dubaiSouthFixtures, dubaiSouthFixtures.map(projectInput));
  const content = buildCuratedBriefContent({
    projects: reportProjects,
    brief: "Compare Dubai South tenant demand and proximity.",
    narrative: {},
    advisor: reportAdvisor,
    confirmedAt: "2026-09-06T12:00:00.000Z",
  });
  const distances = buildSelectedProjectDistances(reportProjects);

  assert.ok(content.areaDemandResearch);
  assert.equal(content.areaDemandResearch.area, "Dubai South");
  assert.equal(content.areaDemandResearch.projectDistances.length, 3);
  assert.equal(distances.length, 3);
  assert.ok(content.areaDemandResearch.tenantSegments.some((segment) => /aviation/i.test(segment.label)));
  assert.ok(content.areaDemandResearch.tenantSegments.some((segment) => /famil/i.test(segment.label)));
  assert.ok(content.areaDemandResearch.listingSignals.some((signal) => /Property Finder/.test(signal.observed)));
  assert.ok(content.areaDemandResearch.listingSignals.some((signal) => /Bayut/.test(signal.observed)));
  assert.ok(content.areaDemandResearch.priceBenchmarks.some((benchmark) => benchmark.market === "Emaar South" && benchmark.value > 0));
  assert.ok(content.areaDemandResearch.investorDemographics.some((signal) => signal.label === "Resident investor share" && /Dubai-wide/.test(signal.scope)));
  assert.ok(content.areaDemandResearch.limitations.some((limitation) => /selected-project investors/i.test(limitation)));
  assert.ok(content.areaDemandResearch.sources.some((source) => source.publisher === "Dubizzle"));
  assert.ok(content.areaDemandResearch.sources.some((source) => source.publisher === "Dubai Land Department"));
  assert.ok(content.marketContext.sources.some((source) => /listing-portal/.test(source.label)));
  assert.ok(reportProjects.every((item) => item.demandSegments.some((segment) => /aviation/i.test(segment))));
  assert.equal(distances[0].basis, "straight-line");
  assert.match(distances[0].note, /verify/i);
});

test("keeps ROI out of an all-off-plan report while preserving sourced demand context", async () => {
  const fixtures: ReportProjectRecord[] = [
    { ...project, slug: "sensitivity-mag-5", name: "MAG 5 Boulevard", developer: "MAG", emirate: "Dubai", area: "Dubai South Residential District", coordinates: "24.906000,55.168000" },
    { ...project, slug: "sensitivity-golf", name: "Golf Fields", developer: "Emaar", emirate: "Dubai", area: "Emaar South", coordinates: "25.0147022,55.222232" },
    { ...project, slug: "sensitivity-expo", name: "Expo Valley Views", developer: "Expo City Dubai", emirate: "Dubai", area: "Expo City Dubai", coordinates: "24.9583519,55.1496137" },
  ];
  const content = buildCuratedBriefContent({
    projects: buildReportProjects(fixtures, fixtures.map(projectInput)),
    brief: "Dubai South sensitivity fixture.",
    narrative: {},
    advisor: reportAdvisor,
    confirmedAt: "2026-09-07T00:00:00.000Z",
  });
  Object.assign(content, { presentation: { includeTimelinePanels: false, compactProjectModules: true } });
  const bytes = await renderCuratedBriefPdf({
    id: "dubai-south-sensitivity-test",
    type: "proposal",
    title: "Dubai South",
    client_name: "Test Client",
    created_at: "2026-09-07T00:00:00.000Z",
    content,
  }, {});
  const text = extractGeneratedPdfText(await PDFDocument.load(bytes));

  assert.doesNotMatch(text, /READY-PROPERTY RETURN SENSITIVITY/i);
  assert.doesNotMatch(text, /GROSS RENTAL ROI/i);
  assert.doesNotMatch(text, /OCCUPANCY-ADJUSTED NET ROI/i);
  assert.match(text, /Dubai-wide investment participation/i);
  assert.doesNotMatch(text, /NOT AVAILABLE FROM A RELIABLE PUBLIC DATASET/);
});

test("renders every project in a shortlist beyond the former six-project limit", async () => {
  const sourcedProject = richCuratedProject;
  if (!sourcedProject) throw new Error("Source-dated comparison fixture is missing.");
  const shortlist = [sourcedProject, ...registry.projects.filter((item) => !item.archived && item.slug !== sourcedProject.slug)].slice(0, 8);
  assert.equal(shortlist.length, 8);
  const snapshots = buildReportProjects(shortlist, shortlist.map((item, index) => ({
    slug: item.slug,
    bedroom: item.bedrooms[0] || "Selected configuration",
    unitReference: `Test unit ${index + 1}`,
    unitPrice: 1_800_000 + index * 125_000,
    unitAreaSqft: 900 + index * 25,
    annualRent: 120_000 + index * 7_500,
    annualRentLow: 108_000 + index * 7_000,
    annualRentHigh: 132_000 + index * 8_000,
    occupancyRate: 95,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 90_000 + index * 6_250,
    rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
    confirmationNotes: "Automated large-shortlist pagination fixture.",
  })));
  const reportProjects = snapshots.map((item, index) => index === snapshots.length - 1 ? {
    ...item,
    areaBenchmark: null,
    priceVsAreaPercent: null,
    projectKnowledge: null,
    annualServiceCharge: 0,
    catalogueUpdatedAt: "",
  } : item);
  const content = buildCuratedBriefContent({
    projects: reportProjects,
    brief: "Compare the complete shortlist without dropping selected projects.",
    narrative: {},
    advisor: {
      name: "Test Advisor",
      email: "test@psrhomes.ae",
      phone: "+971 50 000 0000",
      title: "Property Advisor",
    },
    confirmedAt: "2026-08-23T08:00:00.000Z",
  });
  const bytes = await renderCuratedBriefPdf({
    id: "large-shortlist-test",
    type: "comparison",
    title: "Eight-project investment comparison",
    client_name: "Test Client",
    created_at: "2026-08-23T08:00:00.000Z",
    content,
  }, {});
  const pdf = await PDFDocument.load(bytes);
  const matrixPages = pdf.getPages()
    .map((_, index) => extractGeneratedPdfPageText(pdf, index))
    .filter((text) => /INVESTOR DECISION MATRIX/.test(text));
  const matrixText = matrixPages.join(" ");

  assert.equal(content.projects.length, 8);
  assert.equal(content.marketContext.researchCoverage.selectedProjects, 8);
  assert.equal(matrixPages.length, Math.ceil(reportProjects.length / 3), "expected a mandatory matrix covering projects 1 through N");
  reportProjects.forEach((item, index) => {
    assert.ok(matrixText.includes(item.name.slice(0, 24)), `expected project ${index + 1} in the decision matrix`);
  });
  assert.match(matrixText, /COMPARABLE VARIABLE/);
  assert.match(matrixText, /Not available/i);
  assert.match(matrixText, /SOURCE \/ VERIFICATION DATE/);
  assert.match(matrixText, /Date not available/);
  assert.ok(matrixText.includes(reportProjects[0].projectKnowledge?.verifiedAt.slice(0, 10) || "missing-source-date"));
  assert.ok(pdf.getPageCount() >= 32, `expected a paginated 8-project report, received ${pdf.getPageCount()} pages`);
  assert.equal(pdf.getTitle(), "Eight-project investment comparison | PSR Homes");
});

test("renders typed project media and the expanded project proposition", async () => {
  const richProject = typedMediaProject;
  if (!richProject) throw new Error("Typed-media curated fixture is missing.");
  const reportProjects = buildReportProjects([richProject], [{
    slug: richProject.slug,
    bedroom: "2BR",
    unitReference: "2BR media fixture",
    unitPrice: 2_650_000,
    unitAreaSqft: 1_120,
    annualRent: 170_000,
    annualRentLow: 150_000,
    annualRentHigh: 190_000,
    occupancyRate: 94,
    serviceChargePerSqft: 18,
    otherAnnualCosts: 2_500,
    acquisitionCosts: 120_000,
    rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
    confirmationNotes: "Automated media fixture.",
  }]);
  const content = buildCuratedBriefContent({
    projects: reportProjects,
    brief: "Include the complete project media set.",
    narrative: {},
    advisor: {
      name: "Test Advisor",
      email: "test@psrhomes.ae",
      phone: "+971 50 000 0000",
      title: "Property Advisor",
    },
    confirmedAt: "2026-08-23T08:00:00.000Z",
  });
  const bytes = await renderCuratedBriefPdf({
    id: "media-gallery-test",
    type: "proposal",
    title: "Media-rich project brief",
    client_name: "Test Client",
    created_at: "2026-08-23T08:00:00.000Z",
    content,
  }, {});
  const pdf = await PDFDocument.load(bytes);
  const renderedText = extractGeneratedPdfText(pdf);

  assert.ok(reportProjects[0].mediaGallery.length > 10);
  assert.ok(reportProjects[0].mediaSections.exteriors.length > 0);
  assert.ok(reportProjects[0].mediaSections.interiors.length > 0);
  assert.ok(reportProjects[0].mediaSections.floorplans.length > 0);
  assert.ok(reportProjects[0].mediaSections.gallery.length > 0);
  assert.match(renderedText, /Exterior architecture/);
  assert.match(renderedText, /Interior design/);
  assert.match(renderedText, /Floor plans/);
  assert.match(renderedText, /Additional gallery/);
  assert.match(renderedText, /PROJECT PROPOSITION/);
  assert.match(renderedText, /PUBLISHED PROJECT POSITION/);
  assert.match(renderedText, /PROJECT LIFECYCLE/);
  assert.match(renderedText, /PROJECT KNOWLEDGE/);
  assert.match(renderedText, /INVESTMENT POINTS TO TEST/);
  assert.match(renderedText, /AMENITIES AND PRODUCT/);
  assert.match(renderedText, /PUBLISHED UNIT RANGE/);
  assert.ok(pdf.getPageCount() >= 12, `expected gallery pages in the report, received ${pdf.getPageCount()} pages`);
});

test("enriches generated PDFs from the same project-detail gallery used by the website", async () => {
  const marea = registryOnlyMediaProject;
  if (!marea) throw new Error("Registry-only media fixture is missing.");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`
    <html><head>
      <meta property="og:title" content="MAREA Residences">
      <meta property="og:image" content="https://cdn.opr.ae/upload/photo/MAREA%20RESIDENCES%2012.jpg">
    </head><body>
      <img src="https://img1.creatium.ru/disk2/f4/28/f3/3c79ae4925daaa49ddd2a696362fb21379/marea_residences_1.jpg">
      <img src="https://img1.creatium.ru/disk2/8a/97/25/48ea8dfec305407da37225de687805b8f7/marea_residences_2.jpg">
      <img src="https://img1.creatium.ru/disk2/6c/d7/85/9de74ec95f61d376479937e7678876fffd/marea_residences_3.jpg">
      <img src="https://img1.creatium.ru/disk2/17/16/8a/95a31c920635ca2780ee4f08488d26014b/marea_residences_5.jpg">
      <img src="https://img1.creatium.ru/disk2/55/32/b3/ecc2e83806e48ba68fcc106d6fa581dd55/marea_residences_6.jpg">
    </body></html>
  `, { headers: { "content-type": "text/html" } });
  try {
    const reportProjects = buildReportProjects([marea], [{
      slug: marea.slug,
      bedroom: "1BR",
      unitReference: "Website media fixture",
      unitPrice: 1_950_000,
      unitAreaSqft: 780,
      annualRent: 135_000,
      annualRentLow: 120_000,
      annualRentHigh: 150_000,
      occupancyRate: 95,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 2_500,
      acquisitionCosts: 95_000,
      rentalEvidenceNotes: "Dated rental index and comparable schedule to be attached.",
      confirmationNotes: "Automated website-media fixture.",
    }]);
    const content = buildCuratedBriefContent({
      projects: reportProjects,
      brief: "Include the project-detail website image set.",
      narrative: {},
      advisor: {
        name: "Test Advisor",
        email: "test@psrhomes.ae",
        phone: "+971 50 000 0000",
        title: "Property Advisor",
      },
      confirmedAt: "2026-08-23T08:00:00.000Z",
    });
    const bytes = await renderCuratedBriefPdf({
      id: "website-gallery-test",
      type: "proposal",
      title: "Website gallery enriched brief",
      client_name: "Test Client",
      created_at: "2026-08-23T08:00:00.000Z",
      content,
    }, { ASSETS: { fetch: async () => new Response("", { status: 404 }) } as unknown as Fetcher });
    const pdf = await PDFDocument.load(bytes);

    assert.equal(reportProjects[0].mediaGallery.length, 1);
    assert.ok(pdf.getPageCount() >= 11, `expected website gallery pages in the report, received ${pdf.getPageCount()} pages`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the canonical PSR identity for generated reports", () => {
  assert.equal(PSR_REPORT_LOGO_PATH, "/brand/psr-logo.png");
  assert.equal(PSR_REPORT_COMPANY.legalName, "PSR Homes Real Estate LLC");
  assert.equal(PSR_REPORT_COMPANY.website, "www.psrhomes.ae");
  assert.equal(PSR_REPORT_COMPANY.orn, "54275");
});
