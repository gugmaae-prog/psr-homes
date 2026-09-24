import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

async function presentationData() {
  return JSON.parse(await readFile(resolve(root, "data/jumanah-dubai-south-presentation.json"), "utf8")) as {
    coverImage: string;
    executiveSummary: string;
    recommendation: string;
    riskNotes: string[];
    dldOfferChecks: {
      marketedProjects: Array<{ project: string; marketedWaiver: string }>;
      standardCostProjects: string[];
    };
    confirmation: { statement: string };
    advisor: { email: string; avatarUrl: string; profileAvatarUrl: string; portraitPlacement: string };
    projects: Array<{
      name: string;
      incomeAnalysisEligible: boolean;
      dldOffer: { marketedWaiver: string; status: string };
      acquisitionCostBreakdown: unknown[];
      media: { hero: string; exteriors: string[]; interiors: string[]; floorplans: string[] };
    }>;
  };
}

test("Dubai South presentation remains aligned to the revised 15-project report model", async () => {
  const data = await presentationData();
  assert.equal(data.projects.length, 15);
  assert.deepEqual(data.projects.map((project) => project.name), [
    "South Square S1", "South Living", "Golf Fields", "Emaar Golf Views", "MAG 5 Boulevard", "Windsor House", "Terra Woods", "Azizi Venice",
    "Waada Altura", "Expo Valley Views", "AVENEW 888", "Enre Residence", "Golf Trails", "Divine Elements", "Windsor House II",
  ]);
  assert.ok(data.projects.every((project) => project.acquisitionCostBreakdown.length >= 4));
  assert.equal(data.projects.some((project) => project.name === "Cresswell Plaza"), false);
});

test("DLD offer checks are explicit and only completed projects carry income analysis", async () => {
  const data = await presentationData();
  assert.deepEqual(data.dldOfferChecks.marketedProjects.map((item) => item.project), [
    "South Square S1", "South Living", "Azizi Venice", "Enre Residence",
  ]);
  assert.deepEqual(data.projects.filter((project) => project.incomeAnalysisEligible).map((project) => project.name), [
    "Emaar Golf Views", "MAG 5 Boulevard",
  ]);
  assert.ok(data.projects.filter((project) => !project.incomeAnalysisEligible).every((project) => project.dldOffer.status));
  assert.equal(data.riskNotes.length, 0);
});

test("presentation media includes project views, exteriors and floor plans without inventing missing interiors", async () => {
  const data = await presentationData();
  for (const project of data.projects) {
    assert.ok(project.media.hero.startsWith("/presentations/dubai-south-investor-brief/"), `${project.name} hero`);
    assert.ok(project.media.exteriors.length >= 1, `${project.name} exterior`);
    assert.ok(project.media.floorplans.length >= 1, `${project.name} floor plan`);
  }
  assert.equal(data.projects.find((project) => project.name === "Terra Woods")?.media.interiors.length, 0);
  const azizi = data.projects.find((project) => project.name === "Azizi Venice");
  assert.ok(azizi?.media.hero.endsWith("/hero.webp"));
  assert.ok((await stat(resolve(root, "public", azizi!.media.hero.replace(/^\//, "")))).size > 100_000);
});

test("Jumanah portrait use is limited to the cover and advisor introduction", async () => {
  const data = await presentationData();
  const component = await readFile(resolve(root, "components/DubaiSouthInvestorPresentation.tsx"), "utf8");
  assert.equal(data.advisor.portraitPlacement, "cover-and-profile");
  assert.equal((component.match(/presentation\.advisor\.(?:avatarUrl|profileAvatarUrl)/g) || []).length, 2);
  assert.match(data.advisor.avatarUrl, /jumanah-cover\.webp$/);
  assert.match(data.advisor.profileAvatarUrl, /jumanah-profile\.webp$/);
  assert.doesNotMatch(component, /NOT AVAILABLE FROM A RELIABLE PUBLIC DATASET/i);
});

test("the client brief uses investor-facing language and Jumanah's canonical email", async () => {
  const data = await presentationData();
  const component = await readFile(resolve(root, "components/DubaiSouthInvestorPresentation.tsx"), "utf8");
  assert.equal(data.advisor.email, "jumanah@psrhomes.ae");
  assert.match(data.executiveSummary, /Dubai South combines an established residential base/);
  assert.match(data.executiveSummary, /stated all-inclusive budget/);
  assert.doesNotMatch(data.executiveSummary, /We have prepared|mandate|separately itemised|remains conditional/i);
  assert.match(data.recommendation, /^Recommendations: Screen MAG 5 Boulevard/);
  assert.doesNotMatch(data.recommendation, /I would|We would|Maintain two decision routes/i);
  assert.doesNotMatch(data.confirmation.statement, /before client issue|We require/i);
  assert.match(component, /AED 1\.0M-1\.7M all-in/);
  assert.doesNotMatch(component, /phase-specific risk|DECISION RISKS/i);
});

test("the online deck is private, navigable and uses the Wasl Dome cover", async () => {
  const data = await presentationData();
  const component = await readFile(resolve(root, "components/DubaiSouthInvestorPresentation.tsx"), "utf8");
  const page = await readFile(resolve(root, "app/advisors/jumanah/dubai-south/page.tsx"), "utf8");
  const legacyPage = await readFile(resolve(root, "app/presentations/dubai-south-investor-brief/page.tsx"), "utf8");
  const advisorProfile = await readFile(resolve(root, "components/PublicAdvisorPortfolio.tsx"), "utf8");
  const teamProfiles = await readFile(resolve(root, "data/cba-team.ts"), "utf8");
  assert.match(data.coverImage, /cover\/wasl-dome\.webp$/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /onTouchStart/);
  assert.match(component, /window\.history\.replaceState/);
  assert.match(component, /withBasePath\("\/advisors\/jumanah"\)/);
  assert.match(component, /root\.dataset\.theme = "dark"/);
  assert.match(component, /new MutationObserver\(enforcePresentationTheme\)/);
  assert.match(component, /root\.dataset\.theme = previousTheme/);
  assert.match(page, /canonical: `\$\{SITE_ORIGIN\}\/advisors\/jumanah\/dubai-south`/);
  assert.match(page, /index: false, follow: false, noarchive: true/);
  assert.match(page, /import presentationScene from "@\/data\/dubai-south-review-slides\.json"/);
  assert.match(page, /presentation=\{presentationScene as DubaiSouthReviewData\}/);
  assert.doesNotMatch(component, /import presentation from "@\/data\/jumanah-dubai-south-presentation\.json"/);
  assert.match(legacyPage, /permanentRedirect\("\/advisors\/jumanah\/dubai-south"\)/);
  assert.match(advisorProfile, /href=\{withBasePath\("\/advisors\/jumanah\/dubai-south"\)\}/);
  assert.match(advisorProfile, /id="advisor-presentation"/);
  assert.match(advisorProfile, /Private client presentation/);
  assert.match(advisorProfile, /Enter access code/);
  assert.match(advisorProfile, /public-advisor-direct-contact/);
  assert.match(advisorProfile, /\{advisor\.email\}<\/a>/);
  assert.doesNotMatch(advisorProfile, /Jumanah[^\n]{0,80}\bdesk\b|\$\{advisor\.name\}'s advisory desk/i);
  assert.doesNotMatch(teamProfiles, /Jumanah's leadership desk/i);
  assert.doesNotMatch(advisorProfile, /\b15 projects\b|\b35 slides\b/i);
});

test("the three-report viewer keeps private scene data on the server boundary", async () => {
  const scene = JSON.parse(await readFile(resolve(root, "data/dubai-south-review-slides.json"), "utf8")) as {
    reports: Array<{ id: string; file: string }>;
    slides: Array<{ group: string; kind: string; elements: Array<{ type: string; id?: string; tableId?: string; alt?: string }> }>;
  };
  const page = await readFile(resolve(root, "app/advisors/jumanah/dubai-south/page.tsx"), "utf8");
  const component = await readFile(resolve(root, "components/DubaiSouthReviewPresentation.tsx"), "utf8");

  assert.deepEqual(scene.reports.map((report) => report.id), ["ready", "under", "above"]);
  assert.ok(scene.slides.length > 3);
  assert.ok(scene.slides.every((slide) => ["ready", "under", "above"].includes(slide.group)));
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /export const revalidate = 0/);
  assert.match(page, /import presentationScene from "@\/data\/dubai-south-review-slides\.json"/);
  assert.doesNotMatch(component, /@\/data\/dubai-south-review-slides\.json/);
  assert.match(component, /presentation\.reports\.map/);
  assert.match(component, /files\/\$\{report\.id\}\.pdf/);
  assert.match(component, /files\/presentation\.pptx/);
  assert.match(component, /aria-label=\{`Download \$\{report\.label\}, \$\{report\.budgetLabel\}, PDF`\}/);
  assert.match(component, /aria-label="Download the complete Dubai South PowerPoint presentation"/);
});

test("the viewer exposes semantic mobile tables and limits Jumanah portraits to covers", async () => {
  const scene = JSON.parse(await readFile(resolve(root, "data/dubai-south-review-slides.json"), "utf8")) as {
    slides: Array<{
      kind: string;
      elements: Array<{ type: string; id?: string; tableId?: string; headers?: string[]; rows?: string[][]; alt?: string }>;
    }>;
  };
  const component = await readFile(resolve(root, "components/DubaiSouthReviewPresentation.tsx"), "utf8");
  const css = await readFile(resolve(root, "components/DubaiSouthReviewPresentation.module.css"), "utf8");
  const tables = scene.slides.flatMap((slide) => slide.elements.filter((element) => element.type === "table"));
  const tableIds = new Set(tables.map((table) => table.id));
  const tablePrimitives = scene.slides.flatMap((slide) => slide.elements.filter((element) => element.tableId));
  const portraits = scene.slides.flatMap((slide) => slide.elements
    .filter((element) => element.type === "image" && /jumanah|portrait|head and shoulders/i.test(element.alt || ""))
    .map((element) => ({ kind: slide.kind, element })));

  assert.ok(tables.length > 0);
  assert.ok(tables.every((table) => (table.headers?.length || 0) > 0 && (table.rows?.length || 0) > 0));
  assert.ok(tablePrimitives.length > 0);
  assert.ok(tablePrimitives.every((element) => tableIds.has(element.tableId)));
  assert.ok(portraits.length > 0);
  assert.ok(portraits.every(({ kind }) => kind === "cover"));
  assert.match(component, /\.filter\(\(element\) => !element\.tableId\)/);
  assert.match(component, /<SemanticTable/);
  assert.match(component, /slide\.kind === "cover" \|\| !isPortrait\(element\)/);
  assert.match(component, /requestFullscreen/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /Off-plan \(Under Construction\) · below AED 1\.7M/);
  assert.match(component, /Off-plan \(Under Construction\) · above AED 1\.7M/);
  assert.match(component, /role="group"/);
  assert.match(component, /aria-roledescription="presentation slide"/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /\.slideFrame \{ display: none; \}/);
  assert.match(css, /\.mobileSlide \{[\s\S]*?display: block;/);
  assert.match(css, /:global\(html\[data-theme="light"\] body\.psr-review-presentation-open\) \.viewer \{[\s\S]*?background:[\s\S]*?!important;[\s\S]*?color: var\(--review-ink\) !important;/);
  assert.match(css, /body\.psr-review-presentation-open\) :is\(\.topbar, \.reportBar, \.controls\)/);
  assert.match(css, /\.jumpSelect select \{[\s\S]*?background: #151a17 !important;[\s\S]*?color: var\(--review-ink\) !important;/);
  assert.match(css, /\.reportTabs \.activeReport span \{[\s\S]*?color: #f3dfb5 !important;/);
  assert.match(css, /\.mobileCover :is\(\.mobileSlideHeader strong, \.mobileText, \.mobileTextStrong, \.mobileHeadline, \.mobileSources a\)/);
});
