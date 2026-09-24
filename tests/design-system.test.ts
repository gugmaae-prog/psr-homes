import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { transform } from "lightningcss";
import {
  compileAgentPsrCss,
  compileAnalyticsPsrCss,
  compileLeadsPsrCss,
  compilePublicPsrCss,
} from "../build/psr-css-optimizer";
import { projectFinanceStatus } from "../lib/project-finance-status";
import {
  normalizeLiquiditySchedule,
  rebalanceLiquiditySchedule,
} from "../lib/off-plan-liquidity";
import {
  CARD_CURRENCIES,
  convertAedAmount,
  formatAedCardPrice,
  formatCardCurrencyAmount,
  formatCardCurrencyLabel,
  formatDisplayCurrencyAmount,
  parseAedAmount,
} from "../lib/card-currency";
import { preferredScrollBehavior } from "../lib/scroll-behavior";
import { getEmirateProfiles, getEmirateProjectShowcase, getEmirateUpcomingProjects } from "../lib/emirates";
import { EMIRATE_IDENTITIES } from "../data/emirates";
import { emirateMarketOverviews, uaeMarketOverview } from "../data/emirate-market-overviews";
import { uaeHostedEvents } from "../data/uae-events";
import { DEFAULT_PROPERTY_PHOTO } from "../lib/media-policy";

const source = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../app/psr-public-neutral.css", import.meta.url), "utf8");
const themeCss = fs.readFileSync(new URL("../app/psr-theme.css", import.meta.url), "utf8");
const agentCanonical = fs.readFileSync(new URL("../components/psr-agent-neutral.css", import.meta.url), "utf8");
const operationsCanonical = fs.readFileSync(new URL("../components/psr-operations-neutral.css", import.meta.url), "utf8");
const projectCatalogue = fs.readFileSync(new URL("../components/ProjectCatalogue.tsx", import.meta.url), "utf8");
const analyticsDashboard = fs.readFileSync(new URL("../components/AnalyticsDashboard.tsx", import.meta.url), "utf8");
const leadsDashboard = fs.readFileSync(new URL("../components/LeadsDashboard.tsx", import.meta.url), "utf8");
const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const themeToggle = fs.readFileSync(new URL("../components/ThemeToggle.tsx", import.meta.url), "utf8");
const projectsPage = fs.readFileSync(new URL("../app/projects/page.tsx", import.meta.url), "utf8");
const homePage = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const clientReviews = fs.readFileSync(new URL("../components/ClientReviews.tsx", import.meta.url), "utf8");
const heroVideo = fs.readFileSync(new URL("../components/HeroVideo.tsx", import.meta.url), "utf8");
const listPropertyPage = fs.readFileSync(new URL("../app/list-your-property/page.tsx", import.meta.url), "utf8");
const agentWorkspace = fs.readFileSync(new URL("../components/AgentWorkspace.tsx", import.meta.url), "utf8");
const adminPage = fs.readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const agentBackend = fs.readFileSync(new URL("../worker/agent-backend.ts", import.meta.url), "utf8");
const inboxBackend = fs.readFileSync(new URL("../worker/inbox-backend.ts", import.meta.url), "utf8");
const wranglerConfig = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const curatedBrief = fs.readFileSync(new URL("../worker/curated-brief.ts", import.meta.url), "utf8");
const siteChrome = fs.readFileSync(new URL("../components/Chrome.tsx", import.meta.url), "utf8");
const aboutPage = fs.readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const aboutMetrics = fs.readFileSync(new URL("../components/AboutMetrics.tsx", import.meta.url), "utf8");
const teamCarousel = fs.readFileSync(new URL("../components/TeamCarousel.tsx", import.meta.url), "utf8");
const psrThemeLogo = fs.readFileSync(new URL("../components/PsrThemeLogo.tsx", import.meta.url), "utf8");
const projectDetailPage = fs.readFileSync(new URL("../app/projects/[slug]/page.tsx", import.meta.url), "utf8");
const latestProjectDetail = fs.readFileSync(new URL("../components/LatestProjectDetail.tsx", import.meta.url), "utf8");
const mortgageCalculator = fs.readFileSync(new URL("../components/MortgageCalculator.tsx", import.meta.url), "utf8");
const publicAdvisorPortfolio = fs.readFileSync(new URL("../components/PublicAdvisorPortfolio.tsx", import.meta.url), "utf8");
const developerDirectory = fs.readFileSync(new URL("../components/DeveloperDirectory.tsx", import.meta.url), "utf8");
const developersPage = fs.readFileSync(new URL("../app/developers/page.tsx", import.meta.url), "utf8");
const developerDetailPage = fs.readFileSync(new URL("../app/developers/[slug]/page.tsx", import.meta.url), "utf8");
const communityDetailPage = fs.readFileSync(new URL("../app/communities/[slug]/page.tsx", import.meta.url), "utf8");
const registryProjectGrid = fs.readFileSync(new URL("../components/RegistryProjectGrid.tsx", import.meta.url), "utf8");
const taxonomySource = fs.readFileSync(new URL("../lib/taxonomy.ts", import.meta.url), "utf8");
const communityDirectory = fs.readFileSync(new URL("../components/CommunityDirectory.tsx", import.meta.url), "utf8");
const advisorsPage = fs.readFileSync(new URL("../app/advisors/page.tsx", import.meta.url), "utf8");
const teamSource = fs.readFileSync(new URL("../data/cba-team.ts", import.meta.url), "utf8");
const insightsPage = fs.readFileSync(new URL("../app/insights/page.tsx", import.meta.url), "utf8");
const emirateIndexPage = fs.readFileSync(new URL("../app/emirate/page.tsx", import.meta.url), "utf8");
const insightsSectionTabs = fs.readFileSync(new URL("../components/InsightsSectionTabs.tsx", import.meta.url), "utf8");
const psrPageShell = fs.readFileSync(new URL("../components/PsrPageShell.tsx", import.meta.url), "utf8");
const marketObservatoryStatus = fs.readFileSync(new URL("../components/MarketObservatoryStatus.tsx", import.meta.url), "utf8");
const graceFinder = fs.readFileSync(new URL("../components/GraceFinder.tsx", import.meta.url), "utf8");
const graceChat = fs.readFileSync(new URL("../components/GraceChat.tsx", import.meta.url), "utf8");
const deferredConcierge = fs.readFileSync(new URL("../components/DeferredConcierge.tsx", import.meta.url), "utf8");
const projectGallery = fs.readFileSync(new URL("../components/ProjectGallery.tsx", import.meta.url), "utf8");
const projectLeadExperience = fs.readFileSync(new URL("../components/ProjectLeadExperience.tsx", import.meta.url), "utf8");
const documentScrollLock = fs.readFileSync(new URL("../lib/document-scroll-lock.ts", import.meta.url), "utf8");
const chatSourcesMigration = fs.readFileSync(new URL("../drizzle-agent/0026_chat_sources_and_prateek_display.sql", import.meta.url), "utf8");
const publicAgent = fs.readFileSync(new URL("../worker/grace-public-agent.ts", import.meta.url), "utf8");
const workerIndex = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
const languageExperience = fs.readFileSync(new URL("../components/LanguageExperience.tsx", import.meta.url), "utf8");
const cardCurrencyPrice = fs.readFileSync(new URL("../components/CardCurrencyPrice.tsx", import.meta.url), "utf8");
const displayCurrencyHook = fs.readFileSync(new URL("../components/useDisplayCurrency.ts", import.meta.url), "utf8");

function applicationSourceFiles(relativeDirectory: string): string[] {
  const directory = new URL(`../${relativeDirectory}/`, import.meta.url);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) return applicationSourceFiles(relativePath);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

test("the dedicated admin entry reuses the protected workspace and confirms the current password", () => {
  assert.match(adminPage, /<AgentWorkspace entry="admin" \/>/);
  assert.match(adminPage, /robots:\s*\{ index: false, follow: false, noarchive: true, nocache: true \}/);
  assert.match(agentWorkspace, /entry === "admin" && user\.role !== "admin"/);
  assert.match(agentWorkspace, /Current administrator password[\s\S]*?minLength=\{8\}[\s\S]*?maxLength=\{128\}/);
  assert.doesNotMatch(agentWorkspace, /setAdminCode\(event\.target\.value\.replace\(\/\\D\/g/);
  assert.doesNotMatch(adminPage, /psr042395/i);
});

function pngDimensions(relativePath: string) {
  const buffer = fs.readFileSync(new URL(relativePath, import.meta.url));
  assert.equal(buffer.subarray(1, 4).toString(), "PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const forbiddenWarmPalette = /#(?:d8b66a|e0bc63|f0d889|ffd66e|caa75e|cba355|cfaa5e|d7b666|e5c779|b8924f|98783f|87692f|8d6d34|9b6f25|8a6a33)|rgba?\(\s*(?:216\s*,\s*182\s*,\s*106|224\s*,\s*188\s*,\s*99|202\s*,\s*167\s*,\s*94|204\s*,\s*166\s*,\s*79|191\s*,\s*151\s*,\s*72|138\s*,\s*106\s*,\s*51)/i;

function isWarmHex(hex: string) {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (!delta) return false;
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return hue >= 24 && hue <= 100 && saturation * 100 >= 4;
}

test("public PSR CSS is route-pruned and within the stylesheet budget", () => {
  const publicCss = `${compilePublicPsrCss(source)}\n${canonical}`;
  const minified = transform({ filename: "psr.css", code: Buffer.from(publicCss), minify: true }).code;
  assert.ok(minified.byteLength <= 185_000, `public PSR CSS is ${minified.byteLength} bytes`);
});

test("the shipped theme retains bounded, responsive emirate layouts", () => {
  const compiledGlobals = compilePublicPsrCss(source);
  const emiratesThemeStart = themeCss.indexOf("/* Emirates ship");
  assert.notEqual(emiratesThemeStart, -1);
  const emiratesThemeCss = themeCss.slice(emiratesThemeStart);
  assert.doesNotMatch(compiledGlobals, /\.emirate-(?:index|detail|project)/);
  assert.doesNotMatch(emiratesThemeCss, /\.(?:site-header|site-footer|global-theme-toggle|language-selector)\b/, "Emirates must not restyle the shared PSR shell");
  assert.match(themeCss, /\.emirate-detail-page,\s*\n\.emirate-index-page\s*\{/);
  assert.match(themeCss, /\.emirate-index-grid\s*\{[\s\S]*?display:\s*grid/);
  assert.match(themeCss, /\.emirate-index-media\s*\{[\s\S]*?height:\s*clamp/);
  assert.match(themeCss, /\.emirate-index-media img\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(themeCss, /\.uae-atlas-cover\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*7\.2/);
  assert.match(themeCss, /\.emirate-index-media figcaption\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(themeCss, /\.emirate-pipeline-grid\s*\{[\s\S]*?display:\s*grid/);
  assert.doesNotMatch(themeCss, /\.uae-pipeline-(?:scope-map|jurisdiction)\b/, "the index must not ship a duplicate emirate-card navigator");
  assert.match(themeCss, /\.uae-country-pipeline > div > a,[\s\S]*?\.emirate-card-pipeline > div > a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.uae-country-pipeline li,[\s\S]*?\.emirate-card-pipeline li\s*\{[\s\S]*?display:\s*grid/);
  assert.match(themeCss, /\.emirate-pipeline-breadcrumb\s*\{[\s\S]*?text-transform:\s*uppercase/);
  assert.match(themeCss, /\.emirate-overview-lenses\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(themeCss, /\.emirate-project-showcase\s*\{[\s\S]*?display:\s*grid/);
  assert.match(themeCss, /\.emirate-project-media\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*10/);
  assert.match(themeCss, /\.psr-action\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.emirate-guide-nav > a,[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.emirate-signal-sources a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.emirate-methodology-sources a\s*\{[\s\S]*?min-height:\s*58px/);
  assert.match(themeCss, /\.insights-section-tabs a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.uae-emirate-jumps a,[\s\S]*?\.uae-events-month-nav a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(themeCss, /\.emirate-index-actions a\s*\{[\s\S]*?min-height:\s*48px/);
  assert.match(themeCss, /\.emirate-guide-link\s*\{[\s\S]*?min-height:\s*48px/);
  assert.match(themeCss, /\.psr-action\.psr-action-primary\s*\{[\s\S]*?var\(--psr-metal-highlight\)[\s\S]*?color:\s*var\(--psr-on-metal\)/);
  assert.match(themeCss, /\.emirate-detail-page :is\(#overview, #economy, #infrastructure, #culture-tourism, #energy-nature, #future-pipeline, #property, #events, #evidence\)\s*\{[\s\S]*?scroll-margin-top:\s*112px/);
  assert.match(themeCss, /\.emirate-directory,[\s\S]*?\.uae-events-section\s*\{\s*scroll-margin-top:\s*110px/);
  const heroShade = themeCss.match(/\.emirate-detail-page \.emirate-hero \.taxonomy-hero-shade\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert.match(heroShade, /rgba\(5,\s*7,\s*10/);
  assert.doesNotMatch(heroShade, /var\(--psr-bg\)/);
  assert.match(themeCss, /@media \(max-width:\s*620px\)[\s\S]*?\.emirate-guide-nav\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(themeCss, /@media \(max-width:\s*620px\)[\s\S]*?\.emirate-guide-nav > div\s*\{[\s\S]*?scrollbar-width:\s*thin/);
  assert.match(themeCss, /@media \(max-width:\s*620px\)[\s\S]*?\.emirate-pipeline-grid,[\s\S]*?\.emirate-local-event-grid,[\s\S]*?\.emirate-methodology-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(themeCss, /@media \(max-width:\s*620px\)[\s\S]*?\.emirate-index-grid,[\s\S]*?\.emirate-project-showcase\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(themeCss, /@media \(max-height:\s*520px\) and \(orientation:\s*landscape\)[\s\S]*?\.emirate-detail-page \.emirate-hero/);
  assert.match(emiratesThemeCss, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.emirate-project-media img\s*\{\s*transition:\s*none/);
  const minified = transform({ filename: "emirates.css", code: Buffer.from(emiratesThemeCss), minify: true }).code;
  assert.ok(minified.byteLength <= 39_000, `Emirates theme layer is ${minified.byteLength} bytes`);
});

test("every Insights and Emirates route inherits the shared PSR public page shell", () => {
  assert.match(psrPageShell, /\["psr-page-shell", className\]/);
  assert.match(psrPageShell, /data-psr-page-shell="public"/);
  assert.match(psrPageShell, /<InternalHeader \/>/);
  assert.match(psrPageShell, /<InsightsSectionTabs active=\{insightsSection\} \/>/);
  assert.match(psrPageShell, /<Footer \/>/);
  assert.match(psrPageShell, /application\/ld\+json/);

  assert.match(themeCss, /\.psr-page-shell\s*\{[\s\S]*?min-height:\s*100svh;[\s\S]*?overflow-x:\s*clip;[\s\S]*?background:\s*var\(--psr-bg\);/);

  const editorialRoutePages = ["app/emirate", "app/insights"]
    .flatMap(applicationSourceFiles)
    .filter((path) => path.endsWith("/page.tsx"));
  assert.ok(editorialRoutePages.length >= 5);
  for (const relativePath of editorialRoutePages) {
    const page = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.match(page, /<PsrPageShell\b/, `${relativePath} must use the shared PSR page frame`);
    assert.match(page, /insightsSection="(?:research|daily|emirates)"/, `${relativePath} must retain editorial navigation`);
    assert.doesNotMatch(page, /<InternalHeader\b|<Footer\b/, `${relativePath} must not duplicate shared site chrome`);
  }

  for (const relativePath of editorialRoutePages.filter((path) => path.startsWith("app/emirate"))) {
    const page = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.match(page, /insightsSection="emirates"/, `${relativePath} must retain Emirates navigation`);
    assert.match(page, /structuredData=\{structuredData\}/, `${relativePath} must publish its route evidence`);
  }
});

test("the UAE Market Atlas owns eight unique editorial covers and resolves every source-backed claim", () => {
  const profiles = getEmirateProfiles();
  const expectedInitiativeCounts = new Map([
    ["United Arab Emirates", 12],
    ["Dubai", 11],
    ["Abu Dhabi", 12],
    ["Sharjah", 7],
    ["Ras Al Khaimah", 9],
    ["Ajman", 7],
    ["Fujairah", 6],
    ["Umm Al Quwain", 8],
  ]);
  const allowedStatuses = ["Operating", "Active programme", "Phased / mixed", "Under construction", "Procurement", "In development", "Announced", "Strategy"];
  const atlases = [
    {
      name: "United Arab Emirates",
      cover: uaeMarketOverview.cover,
      pillars: [],
      initiatives: uaeMarketOverview.futureInitiatives,
      sources: uaeMarketOverview.sources,
    },
    ...profiles.map((profile) => ({
      name: profile.name,
      cover: profile.cover,
      pillars: profile.pillars,
      initiatives: profile.futureInitiatives,
      sources: profile.sources,
    })),
  ];

  assert.equal(atlases.length, 8);
  assert.equal(new Set(atlases.map(({ cover }) => cover.src)).size, atlases.length);
  assert.doesNotMatch(emirateIndexPage, /nationalCatalysts|UAE strategic future pipeline preview/, "the index must render the national initiative list only once");

  for (const { name, cover, pillars, initiatives, sources } of atlases) {
    assert.match(cover.src, /^\/emirates\/editorial\/[a-z0-9-]+\.webp$/, `${name} cover must be a project-local editorial WebP`);
    assert.ok(cover.alt.trim().length >= 40, `${name} cover needs descriptive alternative text`);
    assert.ok(cover.caption.trim().length >= 30, `${name} cover needs an editorial caption`);
    assert.equal(cover.provenance, "PSR editorial composite");
    assert.match(cover.credit, /AI-assisted image generated for PSR Homes/i);
    assert.match(cover.credit, /not an official/i);

    const coverFile = new URL(`../public${cover.src}`, import.meta.url);
    assert.ok(fs.existsSync(coverFile), `${name} cover must exist at ${cover.src}`);
    const coverBytes = fs.readFileSync(coverFile);
    assert.ok(coverBytes.byteLength >= 10_000, `${name} cover must not be an empty placeholder`);
    assert.equal(coverBytes.subarray(0, 4).toString(), "RIFF", `${name} cover must have a WebP RIFF header`);
    assert.equal(coverBytes.subarray(8, 12).toString(), "WEBP", `${name} cover must be a WebP asset`);

    const sourceIds = new Set(sources.map(({ id }) => id));
    assert.equal(sourceIds.size, sources.length, `${name} source IDs must be unique`);
    for (const source of sources) {
      assert.ok(source.id.trim() && source.label.trim() && source.publisher.trim());
      assert.match(source.href, /^https:\/\//, `${name} sources must link to their publishers`);
      assert.match(source.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${name} sources need an ISO verification date`);
    }

    assert.equal(initiatives.length, expectedInitiativeCounts.get(name), `${name} future-pipeline coverage changed without updating the editorial contract`);
    assert.equal(new Set(initiatives.map(({ id }) => id)).size, initiatives.length, `${name} initiative IDs must be unique`);
    for (const initiative of initiatives) {
      assert.ok(initiative.name.trim() && initiative.category.trim() && initiative.timing.trim());
      assert.ok(initiative.summary.trim() && initiative.marketImpact.trim());
      assert.ok(allowedStatuses.includes(initiative.status));
      assert.ok(initiative.sourceIds.length >= 1, `${name} initiative ${initiative.id} needs a source`);
      assert.ok(initiative.sourceIds.every((id) => sourceIds.has(id)), `${name} initiative ${initiative.id} has an unresolved source ID`);
    }

    for (const pillar of pillars) {
      assert.ok(pillar.summary.trim() && pillar.signals.length >= 1);
      for (const signal of pillar.signals) {
        assert.ok(signal.title.trim() && signal.detail.trim() && signal.sourceIds.length >= 1);
        assert.ok(signal.sourceIds.every((id) => sourceIds.has(id)), `${name} signal ${signal.title} has an unresolved source ID`);
      }
    }
  }

  assert.deepEqual(Object.keys(emirateMarketOverviews), EMIRATE_IDENTITIES.map(({ slug }) => slug));
  for (const profile of profiles) {
    assert.equal(profile.heroImage, profile.cover.src);
    assert.ok(profile.descriptor.trim().length >= 45, `${profile.name} needs a substantive whole-market descriptor`);
    assert.doesNotMatch(profile.descriptor, /\b(?:property|real estate|projects?)\b/i, `${profile.name} descriptor must lead with the emirate's wider assets`);
    assert.match(profile.descriptor, /(?:capital|trade|aviation|finance|tourism|energy|industry|education|research|heritage|mountains|ports?|enterprise|maritime|mangroves|fisheries|archaeology|economy)/i, `${profile.name} descriptor must name a non-property market asset`);
    assert.deepEqual(profile.pillars.map(({ id }) => id), ["economy", "infrastructure", "culture-tourism", "energy-nature"]);
    assert.equal(profile.pillars.length, 4);
    assert.ok(profile.executiveSummary.trim());
    assert.ok(profile.timeline.past.trim() && profile.timeline.present.trim() && profile.timeline.outlook.trim());
    assert.ok(Object.values(profile.comparison).every((value) => value.trim()));
  }
});

test("every emirate retains catalogue media safety and the UAE calendar is source-backed", () => {
  const asOf = new Date("2026-09-02T00:00:00Z");
  const profiles = getEmirateProfiles();
  assert.equal(profiles.length, 7);
  assert.deepEqual(
    profiles.map(({ slug, name }) => ({ slug, name })),
    [...EMIRATE_IDENTITIES],
  );
  assert.equal(new Set(profiles.map(({ slug }) => slug)).size, profiles.length);
  assert.equal(new Set(profiles.map(({ name }) => name)).size, profiles.length);
  assert.ok(profiles.every(({ slug }) => /^[a-z]+(?:-[a-z]+)*$/.test(slug)));
  for (const profile of profiles) {
    assert.equal(profile.marketRole.length, 3);
    assert.equal(profile.investmentLens.length, 3);
    const upcoming = getEmirateUpcomingProjects(profile, 3, asOf);
    const contextMedia = new Set([profile.cover.src, profile.heroImage, ...profile.gallery.map(({ src }) => src)]);
    assert.ok(upcoming.length >= 1 && upcoming.length <= 3, `${profile.name} should have a compact upcoming watchlist`);
    assert.ok(upcoming.every(({ project, image }) => !project.archived && Boolean(image)));
    assert.ok(upcoming.every(({ image }) => image !== profile.heroImage));
    assert.ok(upcoming.every(({ image }) => image !== DEFAULT_PROPERTY_PHOTO));
    assert.ok(upcoming.every(({ project }) => !/\b(?:ready|completed|complete|handed over|sold out)\b/i.test(`${project.statusLabel || ""} ${project.handover || ""}`)));
    assert.ok(upcoming.every(({ project, image }) => !contextMedia.has(image) || image === project.image), `${profile.name} watchlist must not use unrelated context media`);

    for (const item of getEmirateProjectShowcase(profile, 6)) {
      assert.equal(item.mediaCount, item.media.length);
      assert.equal(new Set(item.media).size, item.media.length);
      assert.ok(item.media.length >= 1 && item.media.length <= 5);
      assert.ok(item.media.every((src) => src !== DEFAULT_PROPERTY_PHOTO));
      assert.ok(item.media.every((src) => !contextMedia.has(src) || src === item.project.image), `${item.project.slug} must not present emirate context as project media`);
    }
  }
  assert.equal(uaeHostedEvents.length, 23);
  assert.equal(new Set(uaeHostedEvents.map(({ id }) => id)).size, uaeHostedEvents.length);
  assert.ok(uaeHostedEvents.every((event) => event.startDate >= "2026-09-02" && event.endDate >= event.startDate));
  assert.ok(uaeHostedEvents.every((event) => event.sourceLabel.trim() && event.sourceUrl.startsWith("https://")));
  assert.deepEqual(
    [...new Set(uaeHostedEvents.map((event) => event.emirate))].sort(),
    ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah"],
  );
});

test("dark canonical surfaces remain silver while the alternate theme is intentionally gold", () => {
  const neutralCss = [
    compilePublicPsrCss(source),
    canonical,
    agentCanonical,
    operationsCanonical,
    compileAgentPsrCss(source),
    compileLeadsPsrCss(source),
    compileAnalyticsPsrCss(source),
  ].join("\n");
  assert.doesNotMatch(neutralCss, forbiddenWarmPalette);
  const warmHexes = [...new Set(neutralCss.match(/#[0-9a-f]{6}\b/gi) || [])].filter(isWarmHex);
  assert.deepEqual(warmHexes, [], `warm interface colours remain: ${warmHexes.join(", ")}`);
  assert.match(canonical, /--psr-silver:\s*#cbd2dc/);
  assert.match(canonical, /--psr-metal:\s*var\(--psr-silver\)/);
  assert.match(themeCss, /html\[data-theme="dark"\][\s\S]*?--psr-metal:\s*var\(--psr-silver\)/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-bg:\s*#f4efe6/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-gold:\s*#86642e/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-metal:\s*var\(--psr-gold\)/);
  assert.match(themeCss, /linear-gradient\(135deg, var\(--psr-metal-deep\), var\(--psr-metal-mid\) 52%, var\(--psr-metal-highlight\)\)/);
  assert.doesNotMatch(themeCss, /html\[data-theme="light"\][\s\S]{0,500}?--psr-silver:\s*#(?:86642e|6e5028)/);
  assert.doesNotMatch(neutralCss, /font-style\s*:\s*(?:italic|oblique)/i);
  assert.doesNotMatch(neutralCss, /font-weight\s*:\s*(?:700|800|900)/i);
});

test("Inter Regular is canonical everywhere, including restrained hero headlines", () => {
  assert.match(rootLayout, /import \{ Inter \} from "next\/font\/google"/);
  assert.match(rootLayout, /weight:\s*"400"/);
  assert.match(rootLayout, /className=\{inter\.variable\}/);
  assert.match(themeCss, /--font-primary:\s*var\(--font-inter\), Inter/);
  assert.match(themeCss, /html\[data-theme\] body,\s*\nhtml\[data-theme\] body \*[\s\S]*?font-weight:\s*400 !important/);
  assert.match(themeCss, /html\[lang="en"\] body :is\(h1, h2, h3[\s\S]*?font-family:\s*var\(--font-primary\) !important/);
  assert.match(themeCss, /html\[data-theme\] body \[class\*="hero"\] :is\(h1, h2\)[\s\S]*?font-family:\s*var\(--font-primary\) !important;[\s\S]*?font-weight:\s*400 !important/);
  const forbiddenBrowserSerif = /Georgia|Times New Roman|Bodoni 72|Bodoni MT|Didot|Iowan Old Style|ui-serif|(?:^|[^-\w])serif(?=[^\w-]|$)/im;
  for (const relativePath of ["app", "components"].flatMap(applicationSourceFiles).filter((path) => path.endsWith(".css"))) {
    const browserCss = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.doesNotMatch(browserCss, forbiddenBrowserSerif, `${relativePath} still contains a serif font stack`);
  }
});

test("warm limestone and dark graphite themes share one flash-free persisted contract", () => {
  assert.match(rootLayout, /data-theme="dark"/);
  assert.match(rootLayout, /themeBootScript/);
  assert.match(rootLayout, /psr-theme\.css/);
  assert.match(themeToggle, /role="switch"/);
  assert.match(themeToggle, /aria-checked=\{theme === "light"\}/);
  assert.match(themeToggle, /window\.localStorage\.setItem\(STORAGE_KEY, theme\)/);
  assert.match(themeToggle, /Use warm limestone theme/);
  assert.match(themeToggle, /Use dark graphite theme/);
  assert.doesNotMatch(themeToggle, />Light<|>Dark</);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-bg:\s*#f4efe6/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-text:\s*#211c17/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?--psr-on-metal:\s*#17120e/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?\.agent-page/);
  assert.match(themeCss, /html\[data-theme="light"\][\s\S]*?\.analytics-page/);
  assert.match(themeCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test("warm theme keeps dark editorial panels, project tags and workspace rows legible", () => {
  assert.match(themeCss, /\.project-facts>div,[\s\S]*?\.amenity-grid>div,[\s\S]*?\.travel-list>div[\s\S]*?color:\s*#fffaf2 !important/);
  assert.match(themeCss, /\.mortgage-tool \.mortgage-results :is\(strong,b,dd\)[\s\S]*?color:\s*#fffaf2 !important/);
  assert.match(themeCss, /html\[data-theme\] body \.project-detail \.mortgage-tool \.mortgage-results[\s\S]*?-webkit-text-fill-color:\s*#f5f7fa !important/);
  assert.match(themeCss, /dl > div > dt,[\s\S]*?color:\s*#b6bec9 !important;[\s\S]*?-webkit-text-fill-color:\s*#b6bec9 !important/);
  assert.match(themeCss, /dl > div > dd[\s\S]*?color:\s*#f5f7fa !important;[\s\S]*?-webkit-text-fill-color:\s*#f5f7fa !important/);
  assert.match(themeCss, /\.project-card-badges \.is-status[\s\S]*?color:\s*var\(--psr-on-metal\) !important/);
  assert.match(themeCss, /\.project-card-badges :is\(\.is-location,\.is-handover\)[\s\S]*?color:\s*#fffaf2 !important/);
  assert.match(themeCss, /\.agent-overview-hero :is\(h1,strong\)[\s\S]*?color:\s*#fffaf2 !important/);
  assert.match(themeCss, /\.agent-recent>button[\s\S]*?background:\s*rgba\(255,252,247,\.82\) !important/);
  assert.match(themeCss, /\.agent-sidebar \.agent-wordmark\.inverse \.agent-wordmark-primary[\s\S]*?brightness\(0\)/);
  assert.match(themeCss, /html\[data-theme="light"\] body :is\(\.project-detail, \.mortgage-page\) \.mortgage-tool \.mortgage-results[\s\S]*?linear-gradient\(145deg, #fffdf8, #e8ddcd\)/);
});

test("projects render immediately with compact directory details and a simple title", () => {
  assert.match(projectsPage, /getProjectCatalogue\(initial\)/);
  assert.match(projectsPage, /initialData=\{initialData\}/);
  assert.match(projectsPage, /title="Projects"/);
  assert.doesNotMatch(projectsPage, /one decision view/);
  assert.match(projectCatalogue, /initialData\?\.projects/);
  assert.match(projectCatalogue, /className="project-card-content"/);
  assert.match(projectCatalogue, /className="project-card-meta"/);
  assert.doesNotMatch(projectCatalogue, /project-card-facts|<dt>Bedrooms<\/dt>|<dt>Handover<\/dt>|<dt>Payment<\/dt>/);
  assert.doesNotMatch(projectCatalogue, /collection-signature|Growing/);
  assert.doesNotMatch(agentWorkspace, />Growing</);
});

test("homepage uses the requested UAE headline and a clean self-hosted HD hero", () => {
  assert.match(homePage, /Guiding your/);
  assert.match(homePage, /next move in UAE\./);
  assert.match(homePage, /<HeroVideo \/>/);
  assert.match(heroVideo, /<video/);
  assert.match(heroVideo, /\/hero\/psr-uae-hero\.mp4/);
  assert.match(heroVideo, /\/hero\/psr-uae-hero-poster\.webp/);
  assert.match(heroVideo, /autoPlay/);
  assert.match(heroVideo, /loop/);
  assert.match(heroVideo, /muted/);
  assert.match(heroVideo, /playsInline/);
  assert.match(heroVideo, /preload="metadata"/);
  assert.match(heroVideo, /disablePictureInPicture/);
  assert.doesNotMatch(heroVideo, /youtube|iframe|controls=/i);
  assert.ok(fs.statSync(new URL("../public/hero/psr-uae-hero.mp4", import.meta.url)).size > 5_000_000);
  assert.ok(fs.statSync(new URL("../public/hero/psr-uae-hero-poster.webp", import.meta.url)).size > 40_000);
  assert.match(homePage, /className="hero-transition-fade"/);
  assert.match(canonical, /\.hero-transition-fade[\s\S]*?var\(--psr-bg\) 100%/);
  assert.ok(homePage.indexOf('className="featured section-pad editorial-section"') < homePage.indexOf('className="market-ticker"'));
  assert.match(homePage, /<p className="kicker">Properties<\/p>/);
  assert.match(homePage, /className="project-preview-facts"/);
});

test("shared PSR link stays on the active hostname", () => {
  assert.match(clientReviews, /const PSR_HOME = "\/";/);
  assert.match(clientReviews, /<a href=\{PSR_HOME\} target="_blank" rel="noreferrer">View PSR Homes<\/a>/);
  assert.doesNotMatch(clientReviews, /https:\/\/www\.psrhomes\.ae\//);
});

test("homepage developer profiles expose catalogue flagship imagery with a resilient fallback", () => {
  const developerImage = fs.readFileSync(new URL("../components/DeveloperImage.tsx", import.meta.url), "utf8");
  assert.match(homePage, /className="psr-card-grid developer-home-grid"/);
  assert.match(homePage, /className="developer-directory-card developer-home-card"/);
  assert.match(homePage, /<DeveloperImage src=\{developer\.image\}/);
  assert.match(homePage, /developer\.flagship/);
  assert.match(homePage, /href="\/developers" className="project-index-route-link"/);
  assert.doesNotMatch(homePage, /href="\/developers" className="outline-action"/);
  assert.match(developerImage, /onError=/);
  assert.match(developerImage, /className="media-fallback developer-home-fallback"/);
  assert.match(canonical, /\.developer-home-grid > \.developer-home-card \{[\s\S]*?display:\s*block !important/);
  assert.match(canonical, /\.psr-card-grid \{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
});

test("developer and community project cards separate titles, prices and market facts", () => {
  assert.match(communityDetailPage, /return <main className="community-detail-page">/);
  assert.match(communityDetailPage, /className="section-pad taxonomy-listing taxonomy-project-listing community-project-listing"/);
  assert.match(developerDetailPage, /className="section-pad taxonomy-listing taxonomy-project-listing"/);
  assert.match(registryProjectGrid, /className="project-preview-facts"/);
  assert.match(registryProjectGrid, /<CardCurrencyPrice amountAed=\{project\.startingPrice\}/);
  assert.match(homePage, /<CardCurrencyPrice amountAed=\{project\.startingPrice\}/);
  assert.match(projectCatalogue, /<CardCurrencyPrice amountAed=\{project\.priceAed\}/);
  assert.match(registryProjectGrid, /className="project-card-market-fact"/);
  assert.match(projectCatalogue, /className="project-card-market-fact"/);
  assert.match(themeCss, /Developer and community project indexes keep the title and pricing facts in/);
  assert.match(themeCss, /\.taxonomy-project-listing \.taxonomy-project-grid \.project-preview-card \{[\s\S]*?grid-template-rows:\s*auto auto minmax\(48px, 1fr\) auto !important/);
  assert.match(themeCss, /\.taxonomy-project-listing \.taxonomy-project-grid \.project-preview-card > \.project-preview-facts \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(themeCss, /\.project-card-price-row \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto !important/);
  assert.match(themeCss, /\.project-preview-facts > \.project-card-market-fact,[\s\S]*?text-align:\s*left !important/);
  assert.match(themeCss, /\.project-card-currencies button\[aria-pressed="true"\][\s\S]*?color:\s*var\(--psr-on-metal\) !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.community-detail-page \.taxonomy-hero h1 \{[\s\S]*?color:\s*#e1c47e !important/);
  assert.match(themeCss, /\.community-detail-page \.taxonomy-stats span,[\s\S]*?color:\s*#6e5028 !important/);
  assert.match(themeCss, /\.community-detail-page \.price-panel-market > p a \{[\s\S]*?color:\s*#6e5028 !important/);
  assert.match(themeCss, /\.community-detail-page \.taxonomy-overview \.underlined \{[\s\S]*?color:\s*#6e5028 !important/);
  assert.match(themeCss, /Catalogue continuation actions use one deliberate full-width treatment/);
  assert.match(themeCss, /\.taxonomy-listing > \.outline-action \{[\s\S]*?width:\s*100% !important;[\s\S]*?display:\s*flex !important;[\s\S]*?border-radius:\s*16px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.taxonomy-listing > \.outline-action \{[\s\S]*?background:\s*linear-gradient/);
});

test("project-card currency controls expose AED, USD, GBP and INR without EUR", () => {
  assert.deepEqual(CARD_CURRENCIES, ["AED", "USD", "GBP", "INR"]);
  assert.equal(parseAedAmount("AED 1,250,000"), 1_250_000);
  assert.equal(parseAedAmount("AED 13,54M"), 13_540_000);
  assert.equal(parseAedAmount("Price on request"), null);
  assert.equal(formatAedCardPrice("AED 13,54M"), "AED 13,540,000");
  assert.equal(formatCardCurrencyAmount(1_250_000, "AED"), "AED 1,250,000");
  assert.equal(formatDisplayCurrencyAmount(1_250_000, "AED"), "AED 1,250,000");
  assert.equal(formatCardCurrencyAmount(1_250_000, "USD"), "USD 340,000");
  assert.equal(convertAedAmount(1_250_000, "INR"), 32_465_003);
  assert.equal(formatCardCurrencyAmount(1_250_000, "INR"), "INR 3,24,65,000");
  assert.equal(formatDisplayCurrencyAmount(1_250_000, "INR"), "≈ INR 3,24,65,003");
  assert.equal(formatCardCurrencyLabel("Historical launch entry from AED 4,100,000", 4_100_000, "INR"), "Historical launch entry from INR 10,64,85,000");
  assert.equal(formatCardCurrencyLabel("From AED 2,000,000", 2_000_000, "INR"), "From INR 5,19,44,000");
  assert.match(cardCurrencyPrice, /role="group"/);
  assert.match(cardCurrencyPrice, /type="button" aria-pressed=\{currency === code\}/);
  assert.match(displayCurrencyHook, /useState<CardCurrency>\("AED"\)/);
  assert.match(displayCurrencyHook, /window\.localStorage\.setItem\(currencyPreferenceKey, nextCurrency\)/);
  assert.match(displayCurrencyHook, /psr-display-currency/);
  assert.match(cardCurrencyPrice, /Indicative conversion using Central Bank of the UAE rates dated/);
  assert.doesNotMatch(cardCurrencyPrice, />EUR</);
  assert.match(mortgageCalculator, /Display results in/);
  assert.match(mortgageCalculator, /Inputs and calculations remain in AED/);
  assert.match(mortgageCalculator, /formatDisplayCurrencyAmount\(value, currency\)/);
});

test("responsive header hands desktop controls to one mobile control group", () => {
  assert.match(themeCss, /Hand the complete header over at one breakpoint/);
  assert.match(themeCss, /@media \(max-width: 1180px\)[\s\S]*?\.site-header \.desktop-nav,[\s\S]*?\.site-header \.header-actions \{ display:\s*none !important; \}/);
  assert.match(themeCss, /@media \(max-width: 1180px\)[\s\S]*?\.site-header \.mobile-language \{[\s\S]*?display:\s*flex !important;[\s\S]*?grid-column:\s*2 !important/);
  assert.match(themeCss, /@media \(max-width: 1180px\)[\s\S]*?\.site-header \.mobile-menu \{[\s\S]*?display:\s*block !important;[\s\S]*?grid-column:\s*3 !important/);
  assert.match(siteChrome, /<div className="mobile-language"><ThemeToggle className="header-theme-toggle" \/><LanguageSelector \/><\/div>/);
});

test("developer directory and detail pages render their selected photographic media", () => {
  assert.match(developersPage, /\{ slug, name, thumbnail, flagship,/);
  assert.match(developerDirectory, /<DeveloperImage src=\{developer\.thumbnail\}/);
  assert.doesNotMatch(developerDirectory, /<DeveloperImage src=\{developer\.image\}/);
  assert.match(developerDetailPage, /<img src=\{developer\.image\}/);
});

test("PSR team titles match the approved public roster", () => {
  for (const [name, role] of [
    ["Sourabh Das", "Property Consultant"],
    ["Mazhar Khan", "Property Consultant"],
    ["Louay Betengane", "Property Consultant"],
    ["Rohit Kumar Sinha", "Property Consultant"],
    ["Parv Sondhi", "Managing Partner"],
    ["Adhiyaman Aathimulam", "Property Consultant"],
    ["Sonu Sharma", "Managing Director"],
    ["Prateek Rawal", "Managing Partner"],
    ["Reegan Negi", "Managing Partner"],
    ["Neshva Chundayil", "Head Accountant"],
    ["Janet Genabio", "Office Coordinator"],
    ["Pratham Raval", "Property Consultant"],
    ["Ujwal Kumar", "Property Consultant"],
    ["Harna Raval", "Property Consultant"],
  ]) {
    assert.match(teamSource, new RegExp(`profile\\("[^"]+",\\s*"${name}",\\s*"${role}"`));
  }
  assert.match(teamSource, /"prateek-rawal"/);
  assert.match(teamSource, /prateek-rawal\.webp/);
});

test("search shells own their outline while nested fields are borderless", () => {
  assert.match(canonical, /\.property-search[\s\S]*?border:\s*1px solid var\(--psr-line-strong\)/);
  assert.match(canonical, /\.property-search :is\(input, select\)[\s\S]*?border:\s*0 !important/);
  assert.match(canonical, /\.project-card-badges :is\(b, span\)[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(canonical, /\.about-image-caption[\s\S]*?border:\s*0 !important/);
  assert.match(canonical, /\.mortgage-select-field :is\(input, select\)[\s\S]*?border:\s*0 !important/);
  assert.match(agentCanonical, /\.agent-project-search input[\s\S]*?border:\s*0 !important/);
  assert.match(canonical, /\.directory-toolbar :is\(input, select\)[\s\S]*?border:\s*0 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] :is\(\.property-search,\.project-search,\.directory-toolbar,\.catalogue-filters\) :is\(input,select\)[\s\S]*?background-color:\s*transparent !important/);
  assert.match(canonical, /html,[\s\S]*?scrollbar-width:\s*auto !important/);
  assert.doesNotMatch(canonical, /html::-webkit-scrollbar,[\s\S]*?display:\s*none !important/);
  assert.match(canonical, /\.scroll-progress \{ display:\s*none !important/);
});

test("Daily Market Lens keeps theme-aware long-form contrast on its reading surfaces", () => {
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page :is\([\s\S]*?\.daily-market-article h1,[\s\S]*?\.daily-market-archive button strong[\s\S]*?color:\s*var\(--psr-text\) !important;[\s\S]*?-webkit-text-fill-color:\s*currentColor !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page :is\([\s\S]*?\.daily-market-article > header > span,[\s\S]*?\.daily-source-note > p[\s\S]*?color:\s*var\(--psr-muted\) !important;[\s\S]*?-webkit-text-fill-color:\s*currentColor !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page :is\([\s\S]*?\.daily-market-article figcaption,[\s\S]*?\.daily-market-archive button > span[\s\S]*?color:\s*var\(--psr-faint\) !important;[\s\S]*?-webkit-text-fill-color:\s*currentColor !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page :is\([\s\S]*?\.daily-market-article > header > p,[\s\S]*?\.daily-market-archive button\.active strong[\s\S]*?color:\s*var\(--psr-metal-bright\) !important;[\s\S]*?-webkit-text-fill-color:\s*currentColor !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page \.daily-market-desk > :is\(\.daily-market-article, \.daily-market-archive\) \{[\s\S]*?border:\s*0 !important;[\s\S]*?border-radius:\s*0 !important;[\s\S]*?background:\s*var\(--psr-bg\) !important;[\s\S]*?box-shadow:\s*none !important;[\s\S]*?-webkit-backdrop-filter:\s*none !important;[\s\S]*?backdrop-filter:\s*none !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page \.daily-market-archive button \{[\s\S]*?border-bottom-color:\s*var\(--psr-line\) !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page \.daily-desk-empty > p:not\(\.kicker\)\s*\{[\s\S]*?color:\s*var\(--psr-muted\) !important;[\s\S]*?-webkit-text-fill-color:\s*currentColor !important/);
  assert.match(themeCss, /html\[data-theme\] body \.daily-insights-page \.daily-desk-empty > a\s*\{[\s\S]*?color:\s*var\(--psr-metal-bright\) !important/);
});

test("Windows document and nested chat scrolling remain usable after overlays close", () => {
  assert.match(source, /html \{[\s\S]*?overflow-y:\s*auto;[\s\S]*?scrollbar-gutter:\s*stable/);
  assert.match(agentCanonical, /\.agent-sidebar \{[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior-y:\s*contain;[\s\S]*?touch-action:\s*pan-y/);
  assert.match(agentCanonical, /\.agent-mobile-bar nav \{[\s\S]*?max-height:\s*calc\(100dvh - 74px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?touch-action:\s*pan-y/);
  assert.match(themeCss, /\.album-lightbox \{[\s\S]*?max-height:\s*100dvh;[\s\S]*?overflow-y:\s*auto;[\s\S]*?touch-action:\s*pan-y/);
  assert.match(themeCss, /\.mobile-menu nav \{[\s\S]*?overflow-y:\s*auto !important;[\s\S]*?overscroll-behavior-y:\s*contain !important;[\s\S]*?touch-action:\s*pan-y !important/);
  assert.match(documentScrollLock, /let activeLocks = 0/);
  assert.match(documentScrollLock, /activeLocks = Math\.max\(0, activeLocks - 1\)/);
  assert.match(documentScrollLock, /html\.style\.overflowY = savedState\.htmlOverflowY/);
  for (const component of [graceFinder, projectGallery, projectLeadExperience]) {
    assert.match(component, /lockDocumentScroll\(\)/);
    assert.doesNotMatch(component, /document\.body\.style\.overflow\s*=\s*"hidden"/);
  }
  assert.match(themeCss, /\.grace-chat-messages,[\s\S]*?overscroll-behavior-y:\s*auto !important/);
  assert.match(themeCss, /\.grace-chat-actions \{[\s\S]*?overflow-x:\s*hidden !important/);
  assert.match(themeCss, /\.grace-chat-quick-replies \{[\s\S]*?max-width:\s*100%/);
  assert.match(themeCss, /@media \(max-height:\s*520px\) and \(orientation:\s*landscape\) \{[\s\S]*?\.payment-section \.payment-visual \{[\s\S]*?overflow-x:\s*auto !important/);
  assert.match(agentCanonical, /\.agent-messages \{[\s\S]*?overscroll-behavior-y:\s*auto/);
  assert.match(graceChat, /window\.addEventListener\("hg:overlay-change", handleOverlayChange\)/);
  assert.match(projectLeadExperience, /window\.addEventListener\("hg:overlay-change", handleOverlayChange\)/);
  assert.match(projectLeadExperience, /if \(automatic && anotherOverlayOpenRef\.current\) return/);
  assert.match(projectLeadExperience, /window\.setTimeout\(\(\) => openForm\(true\), 30_000\)/);
  assert.match(projectGallery, /lightboxRef[\s\S]*?event\.key === "Tab"[\s\S]*?last\.focus\(\)/);
  assert.match(projectLeadExperience, /dialogRef[\s\S]*?event\.key === "Tab"[\s\S]*?first\.focus\(\)/);
});

test("scripted scrolling follows the operating system motion preference", () => {
  assert.equal(preferredScrollBehavior(true), "auto");
  assert.equal(preferredScrollBehavior(false), "smooth");
  for (const relativePath of [
    "components/GraceChat.tsx",
    "components/TeamCarousel.tsx",
    "components/ProjectCatalogue.tsx",
    "components/DailyMarketDesk.tsx",
    "components/AgentWorkspace.tsx",
  ]) {
    const component = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.match(component, /preferredScrollBehavior\(\)/, `${relativePath} should use the shared scroll behavior`);
    assert.doesNotMatch(component, /behavior:\s*"smooth"/, `${relativePath} should not force smooth motion`);
  }
});

test("Sonu and restored agent recommendations keep route-safe project record links", () => {
  assert.match(graceChat, /href=\{`\/projects\/\$\{project\.slug\}`\}/);
  assert.match(graceChat, /aria-label=\{`Open \$\{project\.name\} project record`\}/);
  assert.match(graceChat, /<a[\s\S]*?data-project-slug=\{project\.slug\}[\s\S]*?onClick=\{prepareForNativeNavigation\}/);
  assert.doesNotMatch(graceChat, /from "next\/link"/);
  assert.doesNotMatch(graceChat, /onNavigate=/);
  assert.match(themeCss, /\.grace-chat-suggestions a \{[\s\S]*?pointer-events:\s*auto/);
  assert.match(agentWorkspace, /const projectRecord = source\.href\.startsWith\("\/projects\/"\)/);
  assert.match(agentWorkspace, /target=\{internal \? undefined : "_blank"\}/);
  assert.match(agentBackend, /INSERT INTO hg_agent_messages \(id, conversation_id, role, content, sources_json\)/);
  assert.match(agentBackend, /sources:\s*storedChatSources\(message\.sources_json\)/);
  assert.match(chatSourcesMigration, /ALTER TABLE `hg_agent_messages` ADD COLUMN `sources_json`/);
});

test("agent report builder keeps form, project and generation content inset", () => {
  assert.match(agentCanonical, /--agent-section-gutter:\s*clamp\(32px, 4vw, 48px\)/);
  assert.match(agentCanonical, /\.agent-builder-fields \{[\s\S]*?padding:\s*var\(--agent-section-gutter\) !important/);
  assert.match(agentCanonical, /\.agent-project-picker \{[\s\S]*?padding:\s*var\(--agent-section-gutter\) !important/);
  assert.match(agentCanonical, /\.agent-generation-readiness \{[\s\S]*?padding:\s*var\(--agent-section-gutter\) !important/);
  assert.match(agentCanonical, /\.agent-generate-bar \{[\s\S]*?padding:\s*30px var\(--agent-section-gutter\) !important/);
  assert.match(agentCanonical, /\.agent-project-results \{[\s\S]*?max-height:\s*520px !important/);
  assert.match(agentCanonical, /\.agent-project-results > button \{[\s\S]*?min-height:\s*132px !important;[\s\S]*?padding:\s*24px !important/);
  assert.match(agentCanonical, /@media \(min-width: 1080px\) \{[\s\S]*?\.agent-project-results \{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(agentCanonical, /@media \(max-width: 560px\) \{[\s\S]*?--agent-section-gutter:\s*20px;[\s\S]*?\.agent-project-results > button \{[\s\S]*?min-width:\s*78vw !important;[\s\S]*?min-height:\s*120px !important/);
});

test("workspace modules keep one surface and measured internal spacing", () => {
  assert.match(agentCanonical, /\.agent-tool-cards > button \{[\s\S]*?min-height:\s*224px !important;[\s\S]*?display:\s*flex !important/);
  assert.match(agentCanonical, /\.agent-tool-cards h2 \{[\s\S]*?margin:\s*auto 0 10px !important/);
  assert.match(agentCanonical, /\.agent-crm-stage-summary > header,[\s\S]*?\.agent-crm-stage-summary article \{[\s\S]*?background:\s*transparent !important/);
  assert.match(agentCanonical, /\.agent-builder-fields :is\(input, textarea\) \{[\s\S]*?border-radius:\s*10px !important;[\s\S]*?box-shadow:\s*none !important/);
});

test("dark editorial and project-detail surfaces keep requested text contrast", () => {
  assert.match(themeCss, /html\[data-theme="dark"\] body \.daily-market-feed > header :is\(h2, p\) \{[\s\S]*?color:\s*var\(--psr-text\) !important/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.insights-page :is\([\s\S]*?\.insights-index[\s\S]*?\) :is\(h1, h2, h3, p, span, strong\) \{[\s\S]*?color:\s*var\(--psr-text\) !important/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.project-gallery \.gallery-tabs button:not\(\.active\) \{[\s\S]*?color:\s*var\(--psr-text\) !important/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.developer-hero > div:last-child,[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /\.project-hero-actions > a:last-child:not\(:first-child\) \{[\s\S]*?display:\s*inline-flex !important;[\s\S]*?align-items:\s*center !important/);
});

test("Gold developer heroes use dark copy on an integrated image veil", () => {
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-hero \.taxonomy-hero-shade \{[\s\S]*?linear-gradient/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-hero > div:last-child \{[\s\S]*?background:\s*transparent !important;[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-hero > div:last-child h1 \{[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-hero > div:last-child :is\(p, span\) \{[\s\S]*?color:\s*#6e5028 !important/);
});

test("Gold project heroes use a light veil with dark copy", () => {
  assert.match(themeCss, /html\[data-theme="light"\] body main\.project-detail \.project-hero-shade \{[\s\S]*?rgba\(247, 243, 235, \.96\)[\s\S]*?rgba\(247, 243, 235, \.92\)/);
  assert.match(themeCss, /html\[data-theme="light"\] body main\.project-detail \.project-hero-copy :is\(h1, p, a, span, strong\) \{[\s\S]*?color:\s*#211c17 !important;[\s\S]*?text-shadow:\s*none !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body main\.project-detail \.project-release-status \{[\s\S]*?background:\s*rgba\(255, 253, 249, \.82\) !important;[\s\S]*?color:\s*#4d3820 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body main\.project-detail \.project-taxonomy :is\(a, span\) \{[\s\S]*?color:\s*#4d3820 !important/);
});

test("homepage discovery remains visible through the cover transition", () => {
  assert.match(themeCss, /\.home-hero \.hero-transition-fade[\s\S]*?var\(--psr-bg\) 100%/);
  assert.match(themeCss, /\.home-hero \.property-search\.compact-search[\s\S]*?position:\s*absolute !important/);
  assert.match(themeCss, /\.home-hero \.property-search\.compact-search[\s\S]*?z-index:\s*7 !important/);
  assert.match(themeCss, /\.home-hero \.property-search\.compact-search :is\(input,select\)[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /\.home-hero \+ \.featured[\s\S]*?border-top:\s*0 !important/);
});

test("Insights uses calm readable cards and reports the persisted daily archive truthfully", () => {
  assert.match(insightsPage, /<PsrPageShell className="insights-page" insightsSection="research">/);
  assert.match(insightsPage, /href="\/emirate">Open the UAE Market Atlas/);
  assert.match(insightsSectionTabs, /href: "\/insights"[\s\S]*?href: "\/insights\/daily"[\s\S]*?href: "\/emirate"/);
  assert.match(themeCss, /\.insights-section-tabs \{[\s\S]*?display:\s*inline-flex;[\s\S]*?border-radius:\s*999px/);
  assert.match(themeCss, /\.insights-section-tabs a\[aria-current="page"\] \{[\s\S]*?background:\s*linear-gradient\(108deg, var\(--psr-metal-highlight\)/);
  assert.match(insightsPage, /<MarketObservatoryStatus \/>/);
  assert.doesNotMatch(insightsPage, /updated 23 July 2026/i);
  assert.match(insightsPage, /Daily reports are retained in the PSR research archive/);
  assert.match(marketObservatoryStatus, /\/api\/market-daily/);
  assert.match(marketObservatoryStatus, /Latest daily record/);
  assert.match(themeCss, /\.insights-editorial-actions a \{[\s\S]*?align-items:\s*center !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.insights-page \.insights-editorial-actions a:not\(:first-child\) \{[\s\S]*?color:\s*#3f3529 !important/);
  assert.match(themeCss, /\.insights-editorial-feature > div :is\(span,strong,p\)[\s\S]*?color:\s*#f7f8fa !important/);
  assert.match(themeCss, /\.daily-market-grid \{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(themeCss, /@media \(max-width: 760px\) \{[\s\S]*?\.daily-market-grid \{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important;[\s\S]*?overflow:\s*visible !important/);
  assert.match(themeCss, /\.daily-market-card,[\s\S]*?\.daily-market-card\.lead \{[\s\S]*?min-width:\s*0 !important/);
  assert.match(themeCss, /\.daily-market-card h3 \{[\s\S]*?-webkit-line-clamp:\s*3 !important/);
  assert.match(themeCss, /\.insights-method-grid \{[\s\S]*?gap:\s*14px !important/);
  assert.match(themeCss, /@media \(max-width: 620px\) \{[\s\S]*?\.insight-detail-page \.insight-article > header h1 \{[\s\S]*?font-size:\s*clamp\(38px, 10\.8vw, 46px\) !important/);
});

test("mortgage planner has one responsive glass hierarchy in both themes", () => {
  assert.match(themeCss, /\.mortgage-tool \{[\s\S]*?--mortgage-text:\s*#f5f7fa/);
  assert.match(themeCss, /\.mortgage-tool \.mortgage-calculator[\s\S]*?grid-template-columns:\s*minmax\(0,1\.08fr\) minmax\(320px,\.92fr\)/);
  assert.match(themeCss, /\.mortgage-tool \.mortgage-select-field :is\(input,select\),[\s\S]*?border:\s*0 !important/);
  assert.match(themeCss, /\.mortgage-tool \.mortgage-range-grid \{[\s\S]*?grid-template-columns:\s*minmax\(0,1fr\) !important/);
  assert.match(themeCss, /\.mortgage-tool \.mortgage-range-field \{[\s\S]*?display:\s*grid !important[\s\S]*?border-radius:\s*0 !important/);
  assert.match(themeCss, /\.mortgage-range-grid \.mortgage-range-field > input\[type="range"\][\s\S]*?min-height:\s*28px !important[\s\S]*?padding:\s*0 !important[\s\S]*?border-radius:\s*0 !important/);
  assert.match(themeCss, /input\[type="range"\]::-(?:webkit-slider-thumb|moz-range-thumb)[\s\S]*?border-radius:\s*4px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] \.mortgage-tool \{[\s\S]*?--mortgage-text:\s*#211c17/);
  assert.match(themeCss, /@media \(max-width: 1050px\)[\s\S]*?\.mortgage-tool \.mortgage-calculator \{ grid-template-columns:\s*minmax\(0,1fr\) !important/);
});

test("off-plan projects use an editable liquidity model and conservative handover status", () => {
  assert.match(mortgageCalculator, /Off-plan liquidity model/);
  assert.match(mortgageCalculator, /Cash before handover/);
  assert.match(mortgageCalculator, /Editable developer payment structure/);
  assert.match(mortgageCalculator, /Booking payment/);
  assert.match(mortgageCalculator, /During construction/);
  assert.match(mortgageCalculator, /linked balance adjusts automatically/);
  assert.match(mortgageCalculator, /Automatically balanced/);
  assert.match(themeCss, /\.mortgage-tool \.payment-percentage-input input \{[\s\S]*?min-height:\s*0 !important;[\s\S]*?padding:\s*0 !important;[\s\S]*?border:\s*0 !important;[\s\S]*?background:\s*transparent !important;[\s\S]*?box-shadow:\s*none !important/);
  assert.match(mortgageCalculator, /Registration fee percentage/);
  assert.match(mortgageCalculator, /Buyer agency fee percentage/);
  assert.match(mortgageCalculator, /Liquidity contingency percentage/);
  assert.match(mortgageCalculator, /Dubai Land Department/);
  assert.match(mortgageCalculator, /Abu Dhabi Real Estate Centre/);
  assert.match(mortgageCalculator, /Ras Al Khaimah Municipality/);
  assert.match(projectDetailPage, /projectFinanceStatus\(project\.handover, project\.statusLabel\)/);
  assert.match(latestProjectDetail, /projectFinanceStatus\(project\.handover, "Latest UAE launch"\)/);
  const now = new Date("2026-08-24T12:00:00+04:00");
  assert.equal(projectFinanceStatus("Q4 2026", "", now), "off-plan");
  assert.equal(projectFinanceStatus("Q3 2026", "", now), "off-plan");
  assert.equal(projectFinanceStatus("Q2 2026", "", now), "ready");
  assert.equal(projectFinanceStatus("2026", "", now), "off-plan");
  assert.equal(projectFinanceStatus("Q1 2025", "", now), "ready");
  assert.equal(projectFinanceStatus("To be confirmed", "Ready", now), "ready");
});

test("off-plan liquidity separates booking and automatically balances construction", () => {
  assert.deepEqual(normalizeLiquiditySchedule([]), [20, 40, 40]);
  assert.deepEqual(normalizeLiquiditySchedule([80, 20]), [20, 60, 20]);
  assert.deepEqual(normalizeLiquiditySchedule([50, 50]), [20, 30, 50]);
  assert.deepEqual(normalizeLiquiditySchedule([40, 30, 30]), [40, 30, 30]);
  assert.deepEqual(normalizeLiquiditySchedule([10, 10, 30, 50]), [10, 40, 50]);
  assert.deepEqual(rebalanceLiquiditySchedule([20, 40, 40], 0, 25), [25, 35, 40]);
  assert.deepEqual(rebalanceLiquiditySchedule([20, 60, 20], 0, 15), [15, 65, 20]);
  assert.deepEqual(rebalanceLiquiditySchedule([20, 60, 20], 0, 90), [80, 0, 20]);
  assert.deepEqual(rebalanceLiquiditySchedule([20, 40, 40], 1, 50), [20, 50, 30]);
  assert.deepEqual(rebalanceLiquiditySchedule([20, 40, 40], 2, 25), [20, 55, 25]);
});

test("mobile advisor cards and phone team cards use compact animated horizontal rails", () => {
  assert.match(themeCss, /@media \(max-width: 680px\)[\s\S]*?\.advisor-grid \{[^}]*display:\s*flex !important;[^}]*overflow-x:\s*auto !important;[^}]*scroll-snap-type:\s*x mandatory !important/);
  assert.match(themeCss, /@media \(max-width: 520px\)[\s\S]*?\.cba-team-home-grid \{[^}]*display:\s*flex !important;[^}]*overflow-x:\s*auto !important;[^}]*scroll-snap-type:\s*x mandatory !important/);
  assert.doesNotMatch(themeCss, /@media \(max-width: 680px\) \{[\s\S]*?\.advisor-grid,\s*\.cba-team-home-grid \{/);
  assert.match(themeCss, /\.about-team-track \{[\s\S]*?grid-auto-columns:\s*min\(76vw, 286px\) !important/);
  assert.match(themeCss, /@keyframes psr-mobile-card-enter/);
  assert.match(themeCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.cba-team-home-grid > article \{ animation:\s*none !important/);
  assert.doesNotMatch(
    themeCss,
    /\.site-header > a:first-child \.wordmark-primary\s*\{[^}]*display:\s*block !important/,
    "the narrow header must not force both theme logo variants to display",
  );
  assert.match(themeCss, /html\[data-theme="light"\] \.site-header > a:first-child \.psr-logo-dark-surface \{[\s\S]*?display:\s*none !important/);
});

test("advisor CTA and visual cards use restrained silver glass hierarchy", () => {
  assert.match(siteChrome, /<Link href="\/contact" className="header-cta">Speak with an advisor<\/Link>/);
  assert.match(canonical, /\.site-header \.header-cta \{[\s\S]*?background:\s*linear-gradient\(135deg, rgba\(31, 36, 44/);
  assert.match(canonical, /\.site-header \.header-cta \{[\s\S]*?animation:\s*none !important;[\s\S]*?transition:\s*border-color/);
  assert.match(canonical, /\.site-header \.header-cta::after \{[\s\S]*?content:\s*"";[\s\S]*?data:image\/svg\+xml[\s\S]*?background-position:\s*center,\s*100% 50%;[\s\S]*?background-size:\s*15px 15px,\s*240% 100%;[\s\S]*?pointer-events:\s*none/);
  assert.match(canonical, /\.site-header \.header-cta:hover::after,[\s\S]*?\.site-header \.header-cta:focus-visible::after,[\s\S]*?\.site-header \.header-cta:active::after \{[\s\S]*?background-position:\s*center,\s*0% 50%;/);
  assert.match(canonical, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.site-header \.header-cta,[\s\S]*?\.site-header \.header-cta::after,[\s\S]*?animation:\s*none !important;\s*transition:\s*none !important;[\s\S]*?\.site-header \.header-cta:is\(:hover, :focus-visible, :active\) \{ transform:\s*none !important; \}/);
  assert.match(canonical, /:is\(\.project-index-card,[\s\S]*?border:\s*1px solid var\(--psr-line\) !important/);
  assert.match(canonical, /:is\(\.project-index-card,[\s\S]*?\)::before \{[\s\S]*?width:\s*19px/);
  assert.doesNotMatch(canonical, /\/\* Button hierarchy[\s\S]{0,100}\.site-header \.header-cta,/);
});

test("developer heroes keep identity copy on the image without a separate card", () => {
  assert.match(themeCss, /Developer identity stays directly on the image/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-hero > div:last-child \{[\s\S]*?padding:\s*0 !important;[\s\S]*?border:\s*0 !important;[\s\S]*?background:\s*transparent !important;[\s\S]*?box-shadow:\s*none !important/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.developer-hero \.taxonomy-hero-shade \{[\s\S]*?linear-gradient/);
});

test("every public advisor profile uses one restrained responsive hero scale", () => {
  assert.match(themeCss, /Canonical public advisor profile/);
  assert.match(themeCss, /\.public-advisor-hero \{[\s\S]*?grid-template-columns:\s*minmax\(220px, 300px\) minmax\(0, 650px\) !important/);
  assert.match(themeCss, /\.public-advisor-hero \{[\s\S]*?min-height:\s*0 !important/);
  assert.match(themeCss, /\.public-advisor-portrait \{[\s\S]*?max-width:\s*300px !important;[\s\S]*?aspect-ratio:\s*4 \/ 5 !important/);
  assert.match(publicAdvisorPortfolio, /<div className="public-advisor-portrait" data-advisor=\{slug\}>/);
  assert.match(themeCss, /html\[data-theme\] body \.public-advisor-portrait\[data-advisor="jumanah"\] \{[^}]*radial-gradient\(ellipse at 50% 100%, #282828 0%, #202020 52%, #111111 100%\) !important/);
  assert.match(themeCss, /\.public-advisor-portrait\[data-advisor="jumanah"\] img \{[^}]*transform-origin:\s*50% 0% !important;[^}]*transform:\s*translate3d\(0, 12\.22%, 0\) scale\(1\.06\) !important/);
  assert.doesNotMatch(themeCss, /\.public-advisor-portrait img \{[^}]*transform:/);
  assert.doesNotMatch(themeCss, /\.public-advisor-portrait\[data-advisor="(?!jumanah")[^"]+"\] img \{[^}]*transform:/);
  assert.match(themeCss, /\.public-advisor-intro \{[\s\S]*?padding:\s*0 !important/);
  assert.match(themeCss, /\.public-advisor-intro h1 \{[\s\S]*?font-size:\s*clamp\(40px, 4\.7vw, 58px\) !important/);
  assert.match(themeCss, /@media \(max-width: 860px\) \{[\s\S]*?\.public-advisor-hero \{[\s\S]*?grid-template-columns:\s*minmax\(220px, \.9fr\) minmax\(0, 1\.1fr\) !important/);
  assert.match(themeCss, /@media \(max-width: 700px\) \{[\s\S]*?\.public-advisor-hero \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(themeCss, /@media \(max-height: 500px\) and \(min-width: 701px\) \{[\s\S]*?body:has\(\.public-advisor-tabs\) \.grace-chat \{[\s\S]*?top:\s*76px !important;[\s\S]*?bottom:\s*auto !important/);
  assert.match(themeCss, /@media \(max-width: 560px\)[\s\S]*?max-width:\s*238px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.public-advisor-hero[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /\.public-advisor-actions svg :is\(path,rect,circle\)[\s\S]*?stroke:\s*currentColor !important/);
  assert.doesNotMatch(publicAdvisorPortfolio, /Original PSR profile/);
});

test("project details keep explicit dark contrast and use the real PSR document-pack mark", () => {
  assert.match(themeCss, /PSR ecosystem convention/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.project-detail :is\([\s\S]*?\.project-overview,[\s\S]*?\.project-literature,[\s\S]*?\.project-related,[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /html\[data-theme="dark"\] body \.project-detail \.brochure-card-copy :is\(h3,strong\)[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /html\[data-theme\] body \.project-detail \.brochure-preview-placeholder > strong[\s\S]*?color:\s*#f5f7fa !important;[\s\S]*?-webkit-text-fill-color:\s*#f5f7fa !important/);
  assert.match(themeCss, /\.project-detail :is\(\.project-hero h1,\.project-hero-copy h1\)[\s\S]*?font-family:\s*var\(--font-primary\) !important/);
  assert.match(themeCss, /\.project-detail \.project-spec-list > div > dt[\s\S]*?padding-inline-start:\s*clamp\(10px, 1vw, 16px\) !important/);
  assert.match(themeCss, /\.project-detail \.travel-list > div[\s\S]*?grid-template-columns:\s*minmax\(130px, \.72fr\) minmax\(0, 1\.28fr\) !important/);
  assert.match(themeCss, /\.project-detail \.travel-list > div > span[\s\S]*?overflow-wrap:\s*anywhere !important/);
  for (const sourceFile of [projectDetailPage, latestProjectDetail]) {
    assert.match(sourceFile, /className="brochure-cover-logo"/);
    assert.match(sourceFile, /\/brand\/psr-logo-light\.png/);
    assert.doesNotMatch(sourceFile, /className="brochure-cover"[^>]*><span>PSR<\/span>/);
  }
});

test("theme identity and public card actions use one surface-aware contract", () => {
  assert.match(psrThemeLogo, /\/brand\/psr-logo-light\.png/);
  assert.match(psrThemeLogo, /\/brand\/psr-logo-dark\.png/);
  assert.match(siteChrome, /<PsrThemeLogo className="wordmark-primary"/);
  assert.match(agentWorkspace, /<PsrThemeLogo className="agent-wordmark-primary"/);
  assert.match(themeCss, /\.psr-logo-dark-surface \{ display:\s*block !important/);
  assert.match(themeCss, /html\[data-theme="light"\] \.psr-logo-light-surface \{ display:\s*block !important/);
  assert.match(themeCss, /--psr-card-action-bg:\s*rgba\(5, 7, 10, \.88\)/);
  assert.match(themeCss, /--psr-card-action-bg:\s*linear-gradient\(135deg, #6e5028, #b8924f 52%, #e2c47f\)/);
  assert.match(themeCss, /\.project-preview-image > span,[\s\S]*?\.directory-shell \.directory-card-action,[\s\S]*?\.public-advisor-project-image > span:not\(\.media-fallback\)/);
});

test("homepage research cards keep their copy inside a measured grid", () => {
  assert.match(themeCss, /\.insights-home \.insight-home-grid > a\.lead[\s\S]*?grid-template-rows:\s*auto auto minmax\(4\.8em, auto\) auto !important/);
  assert.match(themeCss, /\.insights-home \.insight-home-grid > a > h3[\s\S]*?-webkit-line-clamp:\s*3 !important/);
  assert.match(themeCss, /\.insights-home \.insight-home-grid > a > span[\s\S]*?margin:\s*auto 18px 0 !important/);
});

test("public card families share a symmetrical responsive grid", () => {
  assert.match(canonical, /\.psr-card-grid \{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(canonical, /@media \(max-width: 980px\)[\s\S]*?\.psr-card-grid \{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(canonical, /@media \(max-width: 700px\)[\s\S]*?\.psr-card-grid \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(canonical, /\.insights-index > a\.lead,[\s\S]*?grid-column:\s*auto !important/);
  assert.match(canonical, /aspect-ratio:\s*16 \/ 10 !important/);
});

test("catalogue directories use a compact four-column card contract", () => {
  assert.match(projectCatalogue, /className="project-card-meta"/);
  assert.doesNotMatch(projectCatalogue, /className="project-card-badges"/);
  assert.match(developerDirectory, /className="directory-card-content"/);
  assert.match(developerDirectory, /className="directory-card-meta"/);
  assert.match(communityDirectory, /className="directory-card-content"/);
  assert.match(communityDirectory, /className="directory-card-meta"/);
  assert.match(themeCss, /Compact four-column directory cards[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(themeCss, /\.directory-shell \.directory-card-content \{[\s\S]*?aspect-ratio:\s*auto !important;[\s\S]*?background:\s*transparent !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.directory-shell \.directory-card-content[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /\.directory-toolbar :is\(input,select\)[\s\S]*?width:\s*100% !important[\s\S]*?min-width:\s*0 !important/);
  assert.match(themeCss, /@media \(max-width: 1280px\)[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(themeCss, /\.directory-toolbar \+ :is\(\.community-directory-grid, \.developer-directory-grid\)[\s\S]*?margin-top:\s*clamp\(22px, 2vw, 30px\) !important/);
  assert.match(themeCss, /\.developer-directory-grid \.directory-card-content \{[\s\S]*?min-height:\s*132px !important/);
  assert.match(themeCss, /\.developer-directory-grid \.directory-card-content h2 \{[\s\S]*?min-height:\s*1\.21em !important/);
  assert.match(themeCss, /\.about-origin-copy dl \{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
});

test("catalogue navigation, footer copy and people cards share a measured theme-aware closeout", () => {
  assert.match(projectCatalogue, /className="pagination" role="navigation" aria-label="Project catalogue pages"/);
  assert.match(projectCatalogue, /aria-label="Previous project page"/);
  assert.match(projectCatalogue, /aria-live="polite"/);
  assert.match(themeCss, /\.project-catalogue \.pagination \{[\s\S]*?width:\s*min\(100%, 338px\) !important;[\s\S]*?border-radius:\s*999px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.project-catalogue \.pagination \{[\s\S]*?rgba\(255, 252, 247, \.82\)/);
  assert.match(themeCss, /\.site-footer \.footer-brand > p \{[\s\S]*?font-size:\s*13px !important;[\s\S]*?line-height:\s*1\.68 !important/);
  assert.match(themeCss, /\.advisor-grid > article \{[\s\S]*?border-radius:\s*18px !important;[\s\S]*?background:\s*rgba\(15, 18, 23, \.72\) !important/);
  assert.match(themeCss, /\.advisor-grid \.advisor-card-image > span \{[\s\S]*?background:\s*var\(--psr-card-action-bg\) !important/);
  assert.match(advisorsPage, /<article key=\{member\.slug\} data-advisor=\{member\.slug\}>/);
  assert.match(themeCss, /\.advisor-grid > article\[data-advisor="jumanah"\] \.advisor-card-image \{[^}]*radial-gradient\(ellipse at 50% 100%, #282828 0%, #202020 52%, #111111 100%\) !important/);
  assert.match(themeCss, /\.advisor-grid > article\[data-advisor="jumanah"\] \.advisor-card-image img \{[^}]*transform-origin:\s*50% 0% !important;[^}]*transform:\s*translate3d\(0, 12\.22%, 0\) scale\(1\.06\) !important/);
  assert.match(themeCss, /article\[data-advisor="jumanah"\] \.advisor-card-image:is\(:hover, :focus-visible\) img \{[^}]*translate3d\(0, 12\.22%, 0\) scale\(1\.06\) !important/);
  assert.match(themeCss, /@media \(max-width: 680px\) \{[\s\S]*?article\[data-advisor="jumanah"\][\s\S]*?translate3d\(0, 8\.93%, 0\) scale\(1\.06\) !important/);
  assert.doesNotMatch(themeCss, /article\[data-advisor="jumanah"\][^}]*scale\(1\.(?:2|222)\)/);
  assert.doesNotMatch(themeCss, /\.advisor-grid \.advisor-card-image img \{[^}]*scale\(/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.advisor-grid > article \{[\s\S]*?rgba\(255, 253, 249, \.97\)/);
});

test("advisor portfolios and About proof cards retain readable separated surfaces", () => {
  assert.match(publicAdvisorPortfolio, /className="public-advisor-project-card"/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-project-eyebrow"/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-project-facts"/);
  assert.match(themeCss, /Advisor portfolios use the same measured image, title and fact hierarchy as[\s\S]*?\.public-advisor-project-content \{[\s\S]*?min-height:\s*208px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.public-advisor-projects \.public-advisor-project-card \{[\s\S]*?rgba\(255, 253, 249, \.98\)[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.public-advisor-projects article h3 \{[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /\.about-origin \{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*minmax\(300px, \.72fr\) minmax\(0, 1\.28fr\) !important/);
  assert.match(themeCss, /\.about-origin-copy dl \{[\s\S]*?gap:\s*14px !important/);
  assert.match(themeCss, /\.values \.value-grid \{[\s\S]*?gap:\s*16px !important/);
  assert.match(themeCss, /\.values \.value-grid article \{[\s\S]*?margin:\s*0 !important;[\s\S]*?border-radius:\s*18px !important/);
});

test("public advisor profiles use a structured expertise surface and section rail", () => {
  assert.match(publicAdvisorPortfolio, /aria-current=\{activeSection === "advisor-overview" \? "location" : undefined\}/);
  assert.match(publicAdvisorPortfolio, /window\.requestAnimationFrame\(updateActiveSection\)/);
  assert.match(publicAdvisorPortfolio, /window\.addEventListener\("scroll", scheduleUpdate, \{ passive: true \}\)/);
  assert.match(publicAdvisorPortfolio, /<span aria-hidden="true">01<\/span><strong>Overview<\/strong>/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-expertise-heading"/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-expertise-surface"/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-focus-list"/);
  assert.match(publicAdvisorPortfolio, /className="public-advisor-facts"/);
  assert.match(publicAdvisorPortfolio, /advisorFocusAreas\(advisor\)/);
  assert.match(publicAdvisorPortfolio, /advisor\.specialties\.flatMap\(splitLanguageLabel\)/);
  assert.match(themeCss, /\.public-advisor-tabs \{[\s\S]*?width:\s*min\(720px, calc\(100% - 32px\)\) !important;[\s\S]*?grid-auto-flow:\s*column !important;[\s\S]*?border-radius:\s*16px !important/);
  assert.match(themeCss, /\.public-advisor-tabs a\[aria-current="location"\] \{[\s\S]*?color:\s*var\(--psr-metal-highlight\) !important;[\s\S]*?box-shadow:\s*inset 0 -2px var\(--psr-metal-bright\) !important/);
  assert.match(themeCss, /\.public-advisor-expertise-surface \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.04fr\) minmax\(250px, \.96fr\) !important;[\s\S]*?border-radius:\s*22px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.public-advisor-expertise-surface \{[\s\S]*?rgba\(255, 253, 249, \.96\)/);
  assert.match(themeCss, /@media \(max-width: 560px\) \{[\s\S]*?\.public-advisor-expertise-surface \{ grid-template-columns:\s*minmax\(0, 1fr\) !important/);
});

test("About metrics count on entry and the team carousel uses compact accessible controls", () => {
  assert.match(aboutPage, /<AboutMetrics \/>/);
  assert.match(aboutMetrics, /new IntersectionObserver/);
  assert.match(aboutMetrics, /prefers-reduced-motion:\s*reduce/);
  assert.match(aboutMetrics, /requestAnimationFrame\(animate\)/);
  assert.match(aboutMetrics, /data-count-target="clients">1,000\+/);
  assert.match(aboutMetrics, /data-count-target="transaction">AED 2\.5B\+/);
  assert.match(teamCarousel, /className="about-team-count" aria-live="polite"/);
  assert.match(teamCarousel, /className="about-team-pagination" aria-label="Choose a team member"/);
  assert.match(teamCarousel, /aria-label="Previous team member"/);
  assert.match(teamCarousel, /aria-label="Next team member"/);
  assert.match(teamCarousel, /window\.matchMedia\("\(pointer: coarse\)"\)\.matches/);
  assert.match(teamCarousel, /onPointerDown=\{beginPointerNavigation\}/);
  assert.match(teamCarousel, /targetRef\.current = null/);
  assert.match(teamCarousel, /window\.requestAnimationFrame/);
  assert.doesNotMatch(teamCarousel, /member\.name\.split\(" "\)\[0\]<\/span>/);
  assert.match(themeCss, /About team carousel and proof-number motion[\s\S]*?\.about-team-track \{[\s\S]*?grid-auto-columns:\s*calc\(\(100% - \(var\(--about-team-gap\) \* 2\)\) \/ 3\) !important/);
});

test("owner acquisition uses the local HD hero and explicit copy-surface contrast", () => {
  assert.match(listPropertyPage, /<div className="list-hero-media"[^>]*><HeroVideo \/><\/div>/);
  assert.doesNotMatch(listPropertyPage, /propertyImages\.interior/);
  assert.match(themeCss, /\.list-hero \.list-hero-media \{[\s\S]*?min-height:\s*690px !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.list-hero > div:first-child :is\(h1,p\)[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /\.owner-form > div:first-child :is\(\.kicker,h2,h2 em,p,\.owner-form-note\)[\s\S]*?color:\s*#f5f7fa !important/);
});

test("homepage annotations preserve readable theme badges and a calm Finder action row", () => {
  assert.match(homePage, /className="developer-flagship"/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.developer-home-grid \.developer-home-card > div > :is\(b,\.developer-flagship\)[\s\S]*?background:\s*linear-gradient\(135deg, #e1c47e, #b8924f 54%, #d8b66a\) !important;[\s\S]*?color:\s*#17120e !important/);
  assert.match(graceFinder, /<h3>What should this property do for you\?<\/h3>/);
  assert.match(graceFinder, />01 · Your goal<\/p>/);
  assert.doesNotMatch(graceFinder, />01 · Intent<\/p>/);
  assert.match(graceFinder, /className="grace-step-actions"/);
  assert.match(themeCss, /\.grace-finder-content \.grace-finder-step :is\(h3,h4,strong,label\)[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.grace-finder-content \.grace-finder-step :is\(h3,h4,strong,label\)[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /\.grace-finder-content \.grace-step-actions \{[\s\S]*?background:\s*transparent !important;[\s\S]*?justify-content:\s*space-between !important/);
  assert.match(themeCss, /\.grace-finder-content \.grace-step-actions button::before,[\s\S]*?content:\s*none !important/);
  assert.match(themeCss, /html\[data-theme\] body \.grace-finder-dialog \.grace-finder-aside[\s\S]*?linear-gradient\(145deg, #222832, #11151b 72%\) !important;[\s\S]*?-webkit-text-fill-color:\s*#f5f7fa !important/);
  assert.match(themeCss, /\.grace-finder-aside > p[\s\S]*?-webkit-text-fill-color:\s*#bec6d1 !important/);
  assert.match(themeCss, /html\[data-theme\] body main\.project-detail \.project-literature \.brochure-card > \.brochure-cover > b[\s\S]*?color:\s*#f5f7fa !important[\s\S]*?-webkit-text-fill-color:\s*#f5f7fa !important/);
  assert.match(themeCss, /html\[data-theme\] body main\.project-detail \.payment-section \.payment-visual > \.payment-private > strong[\s\S]*?font-size:\s*clamp\(31\.5px, 3\.15vw, 44\.1px\) !important;[\s\S]*?line-height:\s*1\.02 !important/);
});

test("mobile navigation stays legible through its full handoff and the Finder opens only by request", () => {
  assert.match(canonical, /@media \(max-width: 980px\)[\s\S]*?\.site-header \.mobile-menu,[\s\S]*?\.site-header \.mobile-language \{ display:\s*block !important/);
  assert.match(themeCss, /Controls retain one readable form through the complete 1180px handoff[\s\S]*?\.site-header \.mobile-menu \{[\s\S]*?position:\s*relative !important;[\s\S]*?\.site-header \.mobile-menu summary \{[\s\S]*?display:\s*block !important;[\s\S]*?position:\s*relative !important;[\s\S]*?\.site-header \.mobile-menu summary span \{[\s\S]*?position:\s*absolute !important;[\s\S]*?left:\s*50% !important;[\s\S]*?transform:\s*translate\(-50%, -50%\) !important;[\s\S]*?html\[data-theme="light"\] \.site-header \.mobile-menu summary \{[\s\S]*?background:\s*rgba\(255, 249, 239, \.94\) !important;[\s\S]*?html\[data-theme="light"\] \.site-header \.mobile-menu summary span \{[\s\S]*?background:\s*#6e5028 !important/);
  assert.match(themeCss, /Enlarge the desktop navigation hit area[\s\S]*?@media \(min-width: 981px\)[\s\S]*?\.desktop-nav > a,[\s\S]*?\.nav-about > a \{[\s\S]*?position:\s*relative !important/);
  assert.match(themeCss, /Enlarge the desktop navigation hit area[\s\S]*?@media \(min-width: 981px\)[\s\S]*?\.desktop-nav > a::before,[\s\S]*?\.nav-about > a::before \{[\s\S]*?inset:\s*-16px 0/);
  assert.match(themeCss, /@media \(max-width: 640px\)\s*\{\s*\.grace-chat-greeting\s*\{\s*display:\s*none !important/);
  assert.match(themeCss, /@media \(max-height: 560px\) and \(orientation: landscape\)[\s\S]*?\.grace-chat-greeting \{ display:\s*none !important/);
  assert.equal(deferredConcierge.match(/<GraceFinder initialOpen \/>/g)?.length, 1);
  assert.doesNotMatch(graceFinder, /openFinder\(true\)|grace-finder:auto-shown|activeBrowsingMs\.current >= 120_000/);
  assert.match(graceFinder, /const handleOpenRequest = \(\) => openFinder\(\)/);
  assert.match(graceFinder, /window\.addEventListener\("hg:open-grace-finder", handleOpenRequest\)/);
  assert.match(graceFinder, /window\.removeEventListener\("hg:open-grace-finder", handleOpenRequest\)/);
});

test("homepage closeout uses a responsive portrait grid, a dark advisory anchor and a theme-aware footer", () => {
  assert.match(themeCss, /\.cba-team-home-grid \{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(themeCss, /\.cba-team-home-grid article > a:first-child \{[^}]*display:\s*block !important;[^}]*width:\s*100% !important;[^}]*height:\s*auto !important;[^}]*aspect-ratio:\s*4 \/ 5 !important;[^}]*overflow:\s*hidden !important/);
  assert.match(themeCss, /\.cba-team-home-grid article > a:first-child > img \{[^}]*display:\s*block !important;[^}]*width:\s*100% !important;[^}]*height:\s*100% !important;[^}]*aspect-ratio:\s*auto !important;[^}]*object-fit:\s*cover !important/);
  assert.match(themeCss, /@media \(min-width:\s*1181px\) \{[\s\S]*?\.advisor-grid \{ grid-template-columns:\s*repeat\(6/);
  assert.match(themeCss, /\.final-cta,[\s\S]*?html\[data-theme="light"\] body \.final-cta \{[\s\S]*?linear-gradient\(145deg, #11151b, #06080b\) !important/);
  assert.match(themeCss, /\.site-footer \{[\s\S]*?linear-gradient\(145deg, #10141a, #06080b\) !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.site-footer \{[\s\S]*?linear-gradient\(145deg, #f7f1e7, #e8ddcd\) !important/);
  assert.match(themeCss, /\.site-footer \.psr-logo-dark-surface \{ display:\s*block !important; \}/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.site-footer \.psr-logo-dark-surface \{ display:\s*none !important; \}/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.site-footer \.psr-logo-light-surface \{ display:\s*block !important; \}/);
  assert.match(themeCss, /@media \(max-width:\s*1180px\) \{[\s\S]*?\.cba-team-home-grid \{ grid-template-columns:\s*repeat\(3/);
  assert.match(themeCss, /@media \(max-width:\s*780px\) \{[\s\S]*?\.cba-team-home-grid \{ grid-template-columns:\s*repeat\(2/);
  assert.match(themeCss, /html\[lang="ar"\] body \{[\s\S]*?Noto Sans Arabic/);
  assert.match(themeCss, /html\[dir="rtl"\] body \.grace-finder-content[\s\S]*?border-right:/);
  assert.match(themeCss, /\.honey \{[\s\S]*?clip-path:\s*inset\(50%\) !important/);
  assert.match(themeCss, /\.owner-process \{[\s\S]*?grid-template-columns:\s*minmax\(0, \.72fr\) minmax\(0, 1\.28fr\) !important/);
  assert.match(agentCanonical, /@media \(min-width: 821px\) and \(max-width: 900px\)[\s\S]*?\.agent-profile-card dl[\s\S]*?grid-column:\s*1 \/ -1 !important/);
  assert.match(languageExperience, /"\.taxonomy-hero h1", "\.public-advisor-intro h1"/);
  assert.match(languageExperience, /"Research for better": "أبحاث من أجل"/);
  assert.match(languageExperience, /"Describe what you want — e\.g\. 2 bedrooms under AED 3M in Dubai Marina": "صف ما تبحث عنه/);
  assert.match(languageExperience, /"Your full name": "اسمك الكامل"/);
  assert.match(languageExperience, /"Tell us what you are looking for": "أخبرنا بما تبحث عنه"/);
});

test("PSR identity assets and company proof use the canonical presentation", () => {
  assert.match(rootLayout, /favicon-light-32\.png\?v=psr-theme-20260822/);
  assert.match(rootLayout, /favicon-light-512\.png\?v=psr-theme-20260822/);
  assert.match(rootLayout, /apple-touch-icon-light\.png\?v=psr-theme-20260822/);
  for (const tone of ["light", "dark"]) {
    assert.deepEqual(pngDimensions(`../public/favicon-${tone}-32.png`), { width: 32, height: 32 });
    assert.deepEqual(pngDimensions(`../public/favicon-${tone}-512.png`), { width: 512, height: 512 });
    assert.deepEqual(pngDimensions(`../public/apple-touch-icon-${tone}.png`), { width: 180, height: 180 });
  }
  assert.match(canonical, /\.market-ticker \{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(canonical, /@media \(max-width: 980px\)[\s\S]*?\.market-ticker \{ grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(themeCss, /html\[data-theme="light"\] :is\(\.wordmark-primary,[\s\S]*?filter:\s*brightness\(0\) saturate\(100%\) !important/);
});

test("project discovery keeps labels accessible while presenting a placeholder-led AI search", () => {
  assert.match(projectCatalogue, /className="sr-only">AI-powered project search/);
  assert.match(projectCatalogue, /interpretProjectSearch\(value\)/);
  assert.match(projectCatalogue, /Find matches/);
  assert.doesNotMatch(projectCatalogue, />Discover</);
});

test("operations surfaces render the approved PSR logo without italic dashboard headings", () => {
  for (const sourceFile of [analyticsDashboard, leadsDashboard]) {
    assert.match(sourceFile, /\/brand\/psr-logo-ui\.png/);
    assert.doesNotMatch(sourceFile, /<em>/);
  }
  assert.match(operationsCanonical, /body:has\(:is\(\.leads-page, \.analytics-page\)\) > \.global-theme-toggle \{[\s\S]*?right:\s*78px/);
  assert.match(operationsCanonical, /body:has\(:is\(\.leads-page, \.analytics-page\)\) > \.language-floating \{[\s\S]*?right:\s*22px/);
  assert.match(operationsCanonical, /@media \(max-width: 760px\)[\s\S]*?body:has\(:is\(\.leads-page, \.analytics-page\)\) > \.global-theme-toggle \{[\s\S]*?right:\s*68px/);
});

test("directory cards and popups have final light-theme contrast ownership", () => {
  assert.match(developerDirectory, /className="psr-card-grid developer-directory-grid"/);
  assert.match(communityDirectory, /className="psr-card-grid community-directory-grid"/);
  assert.match(developerDirectory, /<DeveloperImage/);
  assert.match(themeCss, /Final light-theme contrast guard/);
  assert.match(themeCss, /html\[data-theme="light"\] body :is\(\.developer-directory-card,\.community-directory-card\)[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body :is\(\.grace-chat-panel,\.grace-finder-dialog,\.project-lead-dialog,\.agent-confirm-dialog\)[\s\S]*?color:\s*#211c17 !important/);
});

test("footer uses accessible social marks and the workspace exposes isolated mailbox states", () => {
  assert.match(siteChrome, /function SocialMark/);
  assert.match(siteChrome, /className="footer-socials" aria-label="PSR social media"/);
  assert.match(siteChrome, /aria-label=\{`PSR Homes on \$\{label\}`\}/);
  assert.doesNotMatch(siteChrome, />\{label\.charAt\(0\)\.toUpperCase\(\) \+ label\.slice\(1\)\}<\/a>/);
  assert.match(agentWorkspace, /New email/);
  assert.match(agentWorkspace, /sendingActivation/);
  assert.match(agentWorkspace, /Your agent mailbox is isolated to this signed-in PSR account/);
  assert.match(agentWorkspace, /Every mailbox, including administrator mail, is visible only to its signed-in owner/);
  assert.match(agentWorkspace, /className="inbox-attachment-zone"/);
  assert.match(agentWorkspace, /onDrop=\{\(event\) => \{ event\.preventDefault\(\); setAttachmentDragActive\(false\); addAttachments/);
  assert.match(agentWorkspace, /Drag files here or browse/);
  assert.match(agentWorkspace, /className="inbox-attachment-card"/);
  assert.match(agentWorkspace, /className="agent-context-actions"/);
  assert.match(agentCanonical, /body:has\(\.agent-page\) > \.global-theme-toggle/);
  assert.match(agentCanonical, /\.inbox-layout \{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*168px minmax\(250px, \.78fr\) minmax\(0, 1\.45fr\) !important/);
  assert.match(agentCanonical, /\.inbox-layout > :is\(\.inbox-folder-rail,\.inbox-list,\.inbox-reading-pane,\.inbox-compose\)[\s\S]*?background:\s*transparent !important/);
  assert.match(agentCanonical, /\.inbox-folder-rail > button:not\(\.inbox-new-message\):is\(:hover,\.is-active\)/);
  assert.match(agentCanonical, /\.inbox-folder-rail b \{[\s\S]*?color:\s*var\(--psr-on-metal\) !important;[\s\S]*?-webkit-text-fill-color:\s*var\(--psr-on-metal\) !important/);
  assert.match(agentCanonical, /\.inbox-message-list > button \{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important/);
  assert.match(agentCanonical, /\.inbox-compose \{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-rows:/);
  assert.match(agentCanonical, /@media \(max-width: 900px\)[\s\S]*?\.inbox-layout \{[\s\S]*?grid-template-columns:\s*minmax\(270px, \.82fr\) minmax\(0, 1\.18fr\) !important/);
});

test("the workspace uses five type roles and a compact document action system", () => {
  const typeRoles = [...agentCanonical.matchAll(/--agent-type-(hero|title|sub|body|note):/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(typeRoles)], ["hero", "title", "sub", "body", "note"]);
  assert.match(agentCanonical, /\.agent-page \.agent-overview-hero h1 \{[\s\S]*?font-size:\s*var\(--agent-type-hero\) !important/);
  assert.match(agentCanonical, /\.agent-tool-intro h1,[\s\S]*?\.agent-document-header h2,[\s\S]*?font-size:\s*var\(--agent-type-title\) !important/);
  assert.match(agentCanonical, /\.agent-mobile-bar nav button,[\s\S]*?\.agent-chat-modes button,[\s\S]*?font-size:\s*var\(--agent-type-sub\) !important/);
  assert.match(agentCanonical, /\.agent-sidebar nav button > strong \{[\s\S]*?font-size:\s*var\(--agent-type-body\) !important/);
  assert.match(agentWorkspace, /className="agent-document-actions" aria-label="Document actions"/);
  assert.match(agentWorkspace, /className="agent-primary-action"[\s\S]*?>Send to client<\/button>/);
  assert.doesNotMatch(agentWorkspace, /<nav aria-label="Agent workspace">[\s\S]*?<span>\{tool\.note\}<\/span>/);
  assert.match(agentCanonical, /\.agent-document-actions \{[\s\S]*?display:\s*inline-flex !important;[\s\S]*?border-radius:\s*14px/);
  assert.match(agentCanonical, /\.agent-document-open \{[\s\S]*?min-height:\s*64px !important/);
  assert.match(agentCanonical, /\.agent-document-preview \{[\s\S]*?width:\s*min\(100%, 560px\) !important/);
  assert.match(agentCanonical, /html\[data-theme\] body \.agent-page \.agent-context-actions > button:first-child \{[\s\S]*?height:\s*40px !important;[\s\S]*?font-size:\s*0 !important;[\s\S]*?-webkit-text-fill-color:\s*transparent !important/);
  assert.match(agentCanonical, /html\[data-theme\] body \.agent-page \.agent-context-actions > button:first-child::before \{[\s\S]*?font-size:\s*var\(--agent-type-body\) !important/);
});

test("workspace annotations keep both themes readable and split document ownership visibly", () => {
  assert.match(agentCanonical, /\.agent-overview-hero :is\(h1, h1 em, aside strong\)[\s\S]*?font-family:\s*var\(--font-primary\) !important/);
  assert.match(agentCanonical, /html\[data-theme="light"\] body \.agent-page \.agent-overview-hero :is\(h1, h1 em, aside strong\)[\s\S]*?color:\s*var\(--psr-text\) !important/);
  assert.match(agentCanonical, /html\[data-theme="light"\] body \.agent-page \.agent-context-actions \.language-selector summary[\s\S]*?background:\s*rgba\(255, 252, 247, \.9\) !important/);
  assert.match(agentCanonical, /\.agent-sidebar nav button \{[\s\S]*?padding:\s*16px 14px 14px !important/);
  assert.match(agentCanonical, /\.agent-recent \{[\s\S]*?gap:\s*8px !important/);
  assert.match(agentWorkspace, /role="tab" aria-selected=\{library === "personal"\}[\s\S]*?Personal library/);
  assert.match(agentWorkspace, /role="tab" aria-selected=\{library === "office"\}[\s\S]*?Office library/);
  assert.match(agentWorkspace, /library === "personal" \? "Share to office" : "Make personal"/);
  assert.match(agentWorkspace, /Every signed-in PSR agent will be able to open and download this document/);
  assert.match(agentWorkspace, /eyebrow="Office visibility"/);
  assert.match(agentWorkspace, /busyLabel="Sharing"/);
  assert.match(agentWorkspace, /Make personal/);
  assert.match(agentWorkspace, /readOnly=\{!isOwner\}/);
});

test("theme changes synchronize the browser icon artwork with the active surface", () => {
  assert.match(themeToggle, /const tone = theme === "light" \? "dark" : "light"/);
  assert.match(themeToggle, /favicon-" \+ tone \+ "-" \+ size/);
  assert.match(themeToggle, /apple-touch-icon-" \+ tone/);
});

test("primary navigation keeps people and agent access under About", () => {
  assert.match(siteChrome, /className="nav-about-menu" aria-label="About links">[\s\S]*?href="\/about">About us[\s\S]*?href="\/advisors">Our people[\s\S]*?href="\/services">Services[\s\S]*?href="\/agent" className="nav-about-agent">Agent login/);
  assert.doesNotMatch(siteChrome, /className="nav-agent-login"/);
  assert.match(siteChrome, /className="mobile-menu">[\s\S]*?href="\/insights">Insights<\/Link><Link href="\/emirate" className="mobile-sub-link">Emirates<\/Link>[\s\S]*?href="\/about">About<\/Link><Link href="\/advisors" className="mobile-sub-link">Our people<\/Link><Link href="\/services" className="mobile-sub-link">Services<\/Link><Link href="\/agent" className="mobile-sub-link">Agent login<\/Link><Link href="\/list-your-property">List your property<\/Link>/);
  assert.match(themeCss, /\.mobile-menu \.mobile-sub-link[\s\S]*?font-size:\s*\.66em !important/);
});

test("agent reports accept open-ended shortlists and preserve every project in the PDF", () => {
  assert.match(agentWorkspace, /else onChange\(\[\.\.\.selected, project\]\)/);
  assert.doesNotMatch(agentWorkspace, /selected\.length\s*(?:<|>=)\s*6/);
  assert.doesNotMatch(agentWorkspace, /projectSlugs[\s\S]{0,180}slice\(0,\s*6\)/);
  assert.doesNotMatch(agentWorkspace, /Two to six/);
  assert.doesNotMatch(agentBackend, /MAX_PROJECTS/);
  assert.doesNotMatch(agentBackend, /\.slice\(0,\s*6\)/);
  assert.doesNotMatch(publicAgent, /projects\.slice\(0,\s*6\)/);
  assert.match(agentBackend, /readJson<[\s\S]*?>\(request, MAX_DOCUMENT_JSON_BYTES\)/);
  assert.match(curatedBrief, /comparisonPageCount/);
  assert.match(curatedBrief, /appendixContinuationCount/);
  assert.match(curatedBrief, /contentsPageCount/);
  assert.match(curatedBrief, /projects\.slice\(matrixPageIndex \* 3/);
  assert.match(curatedBrief, /researchCoverage/);
});

test("published advisor portfolios expose a usable canonical client link", () => {
  assert.match(agentWorkspace, /import \{ SITE_ORIGIN \} from "@\/lib\/seo"/);
  assert.match(agentWorkspace, /encodeURIComponent\(payload\.profile\.portfolioSlug\)/);
  assert.match(agentWorkspace, /className="agent-portfolio-share-link"[\s\S]*?href=\{shareUrl\}[\s\S]*?target="_blank"/);
  assert.match(agentWorkspace, /const updateLoadedProfile = useCallback/);
  assert.match(agentWorkspace, /body:\s*JSON\.stringify\(portfolioPayload\(true\)\)/);
  assert.match(agentWorkspace, /fetch\(withBasePath\(`\/api\/agent\/portfolio\/\$\{encodeURIComponent\(result\.profile\.portfolioSlug\)\}`\)/);
  assert.match(agentWorkspace, /setMessage\("Portfolio saved and client link copied/);
  assert.match(agentWorkspace, /navigator\.clipboard\?\.writeText/);
  assert.match(agentWorkspace, /document\.execCommand\("copy"\)/);
  assert.match(agentWorkspace, /Automatic copy was blocked by the browser/);
  assert.match(agentBackend, /const teamMember = cbaTeam\.find\(\(member\) => member\.email\.toLowerCase\(\) === normalized\)/);
  assert.match(agentBackend, /return teamMember\.slug/);
  assert.match(agentBackend, /portfolioSlug: publicPortfolioSlug\(session\.email, row\.portfolio_slug\)/);
  assert.match(agentBackend, /portfolioSlug: publicPortfolioSlug\(row\.email, row\.portfolio_slug\)/);
  assert.match(source, /\.agent-portfolio-share-link > a \{[\s\S]*?text-overflow:\s*ellipsis[\s\S]*?white-space:\s*nowrap/);
  assert.match(agentCanonical, /\.agent-portfolio-share-link > a \{ color:\s*var\(--psr-text\) !important/);
  assert.match(themeCss, /html\[data-theme="light"\] \.agent-portfolio-share-link > a \{[\s\S]*?color:\s*#211c17 !important/);
  assert.match(publicAdvisorPortfolio, /setAdvisor\(result\.advisor\);[\s\S]*?setMissing\(false\);/);
});

test("requested project and owner sections declare explicit contrast in both themes", () => {
  assert.match(themeCss, /html\[data-theme="dark"\] body \.project-detail :is\([\s\S]*?\.project-facts > div[\s\S]*?color:\s*#f5f7fa !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body \.project-detail \{[\s\S]*?background:\s*#f4efe6 !important;[\s\S]*?color:\s*#211c17 !important/);
  assert.match(themeCss, /html\[data-theme="light"\] body :is\(\.detail-next,\.owner-commitments\)[\s\S]*?linear-gradient\(145deg, #f7f1e7, #e8ddcd\) !important/);
});

test("gold theme closeout keeps controls light, cards readable and team presentation intentional", () => {
  assert.match(themeCss, /html\[data-theme="light"\] body \.home-hero \.property-search\.compact-search[\s\S]*?rgba\(255, 253, 249, \.95\)/);
  assert.match(themeCss, /html\[data-theme="light"\] body :is\([\s\S]*?\.insights-index > a[\s\S]*?background:\s*linear-gradient\(145deg, rgba\(255,253,249,\.98\)/);
  assert.match(themeCss, /Decorative metal squares belong to the silver dark theme only[\s\S]*?content:\s*none !important/);
  assert.match(themeCss, /\.nav-about::after[\s\S]*?height:\s*20px/);
  assert.doesNotMatch(advisorsPage, /advisor-card-featured/);
  const teamOrderSource = teamSource.slice(teamSource.indexOf("const publicTeamOrder"), teamSource.indexOf("export const cbaTeam"));
  assert.ok(teamOrderSource.indexOf('"sonu-sharma"') < teamOrderSource.indexOf('"prateek-rawal"'));
  assert.ok(teamOrderSource.indexOf('"prateek-rawal"') < teamOrderSource.indexOf('"reegan-negi"'));
  assert.ok(teamOrderSource.indexOf('"reegan-negi"') < teamOrderSource.indexOf('"parv-sondhi"'));
  assert.ok(teamOrderSource.indexOf('"parv-sondhi"') < teamOrderSource.indexOf('"neshva-chundayil"'));
  assert.doesNotMatch(agentWorkspace, /<span aria-hidden="true">✦<\/span><strong>Select a message<\/strong>/);
});

test("team pages use the original About banner and individual profile portraits", () => {
  assert.match(aboutPage, /className="about-image"/);
  assert.match(aboutPage, /about\/psr-about-banner\.webp/);
  assert.doesNotMatch(aboutPage, /team\/groups\//);
  assert.doesNotMatch(advisorsPage, /team\/groups\/|advisor-ensemble/);
  assert.match(advisorsPage, /UAE expertise,/);
  assert.match(advisorsPage, /real estate needs across the UAE/);
  assert.doesNotMatch(advisorsPage, /Dubai expertise,|across Dubai/);
  assert.match(languageExperience, /"UAE expertise,": "خبرة إماراتية،"/);
});

test("advisor portraits follow the verified PSR identity mapping and Sonu has one glass greeting", () => {
  assert.match(teamSource, /image:\s*`\/api\/agent\/avatar\/\$\{slug\}`/);
  assert.match(teamSource, /profile\("parv-sondhi"[\s\S]*?"\/team\/psr-advisors\/adhiyaman-aathimulam\.webp"/);
  assert.match(teamSource, /profile\("louay-betengane"[\s\S]*?"\/team\/psr-advisors\/louay-betengane\.webp"/);
  assert.match(teamSource, /profile\("sonu-sharma"[\s\S]*?"\/team\/psr-advisors\/sonu-sharma\.webp"/);
  assert.match(teamSource, /profile\("sourabh-das"[\s\S]*?"\/team\/psr-advisors\/sourabh-das\.webp"/);
  assert.match(teamSource, /profile\("majhar-khan"[\s\S]*?"\/team\/psr-advisors\/mazhar-khan\.webp"/);
  assert.match(teamSource, /profile\("rohit-kumar-sinha"[\s\S]*?"\/team\/psr-advisors\/rohit-kumar-sinha\.webp"/);
  assert.match(teamSource, /profile\("ujwal-kumar"[\s\S]*?"\/team\/psr-advisors\/ujwal-kumar\.webp"/);
  assert.match(teamSource, /profile\("neshva-chundayil"[\s\S]*?"\/team\/psr-advisors\/neshva-chundayil\.webp"[\s\S]*?profileKind:\s*"operations"/);
  assert.match(teamSource, /profile\("janet-genabio"[\s\S]*?"\/team\/psr-advisors\/janet-genabio\.webp"[\s\S]*?profileKind:\s*"operations"/);
  assert.match(teamSource, /profile\("pratham-raval"[\s\S]*?"\/team\/psr-advisors\/pratham-raval\.webp"/);
  assert.match(teamSource, /profile\("reegan-negi"[^\n]*?"\/team\/psr-advisors\/reegan-negi\.webp"/);
  assert.doesNotMatch(teamSource, /profile\("reegan-negi"[^\n]*?"\/team\/psr-advisors\/janet-genabio\.webp"/);
  assert.match(teamSource, /profile\("adhiyaman-aathimulam"[\s\S]*?"\/team\/psr-advisors\/parv-sondhi\.webp"/);
  assert.match(graceChat, /Hi I am Sonu, Your AI Broker/);
  assert.doesNotMatch(graceChat, /className="grace-chat-label"/);
  assert.match(themeCss, /\.grace-chat-greeting\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\)/);
});

test("operations staff skip advisor onboarding and temporary passwords must actually change", () => {
  assert.match(agentBackend, /function isOperationsStaffEmail\(email:\s*string\)/);
  assert.match(agentBackend, /async function onboardingRequired[\s\S]*?if \(isOperationsStaffEmail\(email\)\) return false/);
  assert.match(agentBackend, /onboardingRequired:\s*!isOperationsStaffEmail\(row\.email\)/);
  assert.match(agentBackend, /Choose a different password from the temporary credential/);
  assert.match(agentBackend, /derivePassword\(password, base64ToBytes\(current\.password_salt\), current\.password_iterations\)/);
  const permanentPasswordValidator = agentBackend.match(/function validPermanentPassword[\s\S]*?\n\}/)?.[0] || "";
  assert.match(permanentPasswordValidator, /password\.length >= 12/);
  assert.doesNotMatch(permanentPasswordValidator, /\\d\{6\}/);
  assert.match(agentWorkspace, /New password<\/span><input type="password" minLength=\{12\}/);
});

test("admin accounts use a compact editable agent sheet and Sonu keeps responsive actions", () => {
  assert.match(agentWorkspace, />Agent sheet</);
  assert.match(agentWorkspace, /className="agent-admin-sheet-tools"/);
  assert.match(agentWorkspace, /className="agent-admin-sheet-columns"/);
  assert.match(agentWorkspace, /className="agent-admin-user-head"/);
  assert.match(agentWorkspace, /className="agent-admin-user-access"/);
  assert.match(agentWorkspace, /name="email" type="email" defaultValue=\{user\.email\}/);
  assert.match(agentWorkspace, /newEmail,/);
  assert.match(agentWorkspace, /Reset with a temporary PIN/);
  assert.match(agentWorkspace, /Current administrator password/);
  assert.match(agentWorkspace, /Private app inbox active/);
  assert.match(agentCanonical, /\.agent-admin \{[\s\S]*?--agent-type-body:\s*12px/);
  assert.match(agentCanonical, /\.agent-admin-sheet-columns,[\s\S]*?grid-template-columns:\s*minmax\(170px, 1\.1fr\) minmax\(165px, 1fr\) minmax\(130px, \.82fr\) minmax\(110px, \.68fr\) minmax\(128px, auto\)/);
  assert.match(agentCanonical, /@media \(max-width: 620px\)[\s\S]*?\.agent-admin-sheet \.agent-admin-user-head \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/);
  assert.doesNotMatch(agentBackend, /EMAIL_PROVISIONED_ADDRESSES/);
  assert.doesNotMatch(wranglerConfig, /EMAIL_PROVISIONED_ADDRESSES|allowed_sender_addresses/);
  assert.match(inboxBackend, /SELECT email FROM hg_agent_profiles WHERE lower\(email\) = \? AND active = 1 LIMIT 1/);
  assert.match(agentWorkspace, /activates the Cloudflare identity, sign-in and isolated PSR app inbox immediately/);
  assert.match(agentBackend, /'email_renamed'/);
  assert.match(graceChat, /className="grace-chat-project-image"/);
  assert.doesNotMatch(graceChat, /function openSuggestedProject/);
  assert.match(graceChat, /<a[\s\S]*?href=\{`\/projects\/\$\{project\.slug\}`\}[\s\S]*?onClick=\{prepareForNativeNavigation\}/);
  assert.match(graceChat, /Preparing your private report/);
  assert.match(graceChat, /function shouldAutofocusChat\(\)[\s\S]*?\(hover: hover\)[\s\S]*?\(pointer: fine\)[\s\S]*?\(min-width: 681px\)[\s\S]*?\(min-height: 521px\)/);
  assert.match(graceChat, /shouldAutofocusChat\(\)[\s\S]*?focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(graceChat, /inputRef\.current\?\.focus\(\);/);
  assert.match(publicAgent, /image:\s*project\.image/);
  assert.match(themeCss, /\.grace-chat-panel\s*\{[\s\S]*?height:\s*min\(568px, calc\(100svh - 184px\)\) !important/);
  assert.match(themeCss, /@media \(max-height: 520px\) and \(orientation: landscape\)[\s\S]*?\.grace-chat-panel[\s\S]*?\.grace-chat-form input \{[\s\S]*?font-size:\s*16px !important/);
});

test("application and Worker source never ships emoji characters", () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const relativePath of ["app", "components", "lib", "worker"].flatMap(applicationSourceFiles)) {
    const file = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.doesNotMatch(file, emoji, `${relativePath} contains an emoji character`);
  }
  const workerReadme = fs.readFileSync(new URL("../worker/README.md", import.meta.url), "utf8");
  assert.match(workerReadme, /Do not add emoji/);
});

test("Sonu stops implausible property requests before matching content", () => {
  assert.match(publicAgent, /const invalidPropertyBedrooms = !gracePropertyBedroomCombinationIsValid\(profile\.propertyType, profile\.bedrooms\)/);
  assert.match(publicAgent, /const invalidPropertyBudget = !gracePropertyBudgetCombinationIsValid\(profile\.propertyType, profile\.budget\)/);
  assert.match(publicAgent, /const invalidPropertyRequest = invalidPropertyBedrooms \|\| invalidPropertyBudget/);
  assert.match(publicAgent, /const projects = invalidPropertyRequest \? \[\] : rankedProjects/);
  assert.match(publicAgent, /else if \(invalidPropertyBedrooms\) \{[\s\S]*?one-bedroom mansion/);
  assert.match(publicAgent, /else if \(invalidPropertyBudget\) \{[\s\S]*?planning floor/);
  assert.match(publicAgent, /articles: invalidPropertyRequest[\s\S]*?\? \[\]/);
});

test("Sonu keeps one document conversation stable across dual-stack network changes", () => {
  assert.doesNotMatch(workerIndex, /cf-connecting-ip|x-forwarded-for|sec-ch-ua-platform/);
  assert.match(workerIndex, /psr-visitor:\$\{visitorSessionId\}/);
  assert.match(workerIndex, /psr-agent:\$\{agentSession\.email\}:\$\{visitorSessionId\}/);
  assert.match(workerIndex, /env\.GRACE_PUBLIC_AGENT\.getByName\(sessionId\)/);
});

test("Sonu starts a clean conversation after every document reload", () => {
  assert.match(graceChat, /let documentSessionId = ""/);
  assert.match(graceChat, /documentSessionId = window\.crypto\.randomUUID\(\)/);
  assert.doesNotMatch(graceChat, /localStorage\.(?:getItem|setItem)\([^\n]*grace-chat-session/);
  assert.match(workerIndex, /if \(!visitorSessionId\)/);
  assert.match(workerIndex, /`psr-agent:\$\{agentSession\.email\}:\$\{visitorSessionId\}`/);
});

test("payment breakdowns and mobile liquidity inputs remain legible", () => {
  assert.match(source, /\.payment-installments \{[\s\S]*?max-width:\s*420px/);
  assert.match(source, /\.payment-subnode \{[\s\S]*?width:\s*108px/);
  assert.match(source, /\.payment-subcircle \{[\s\S]*?width:\s*88px; height:\s*88px/);
  assert.match(source, /\.payment-visual\.many \.payment-subcircle strong,[\s\S]*?\.payment-subcircle strong \{[\s\S]*?28px\/1/);
  assert.match(themeCss, /@media \(max-width: 680px\) \{[\s\S]*?\.liquidity-tool \.liquidity-fee-grid \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(themeCss, /\.liquidity-tool \.mortgage-input-frame input \{[\s\S]*?font-size:\s*18px !important/);
});
