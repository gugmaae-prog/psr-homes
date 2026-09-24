import assert from "node:assert/strict";
import test from "node:test";
import {
  handleProjectSearchIntent,
  interpretProjectSearchDeterministically,
} from "../worker/project-search";
import { handleContentRequest, mergeProjectCatalogueResponse, syncLatestProjectLaunches } from "../worker/content-sync";
import { curatedProjectFeedAliases } from "../lib/project-feed-aliases";
import { developerSlugFor, getProjectCatalogue } from "../lib/project-catalogue";
import { buildDeveloperAliasMap, canonicalDeveloperOptions, rawDeveloperSlug } from "../lib/developer-identity";
import { getImportedProject, getProjectRecord, getProjectRegistry, getUniqueActiveProjectRecords, projectIdentityKey } from "../lib/imported-projects";
import { communitySlugFor, getCommunityDirectory, getCommunityProfile, getCommunityRouteSlugs, getDeveloperProfile } from "../lib/taxonomy";

test("keeps directory slugs intact while normalising the Imtiaz exception", () => {
  assert.equal(developerSlugFor("Peace Homes Development"), "peace-homes-development");
  assert.equal(developerSlugFor("WestF5 Development"), "westf5-development");
  assert.equal(developerSlugFor("Alef Group"), "alef-group");
  assert.equal(developerSlugFor("Mantra Developments"), "mantra-developments");
  assert.equal(developerSlugFor("Imtiaz Developments"), "imtiaz");
});

test("merges verified developer brand aliases without collapsing unrelated names", () => {
  const names = [
    "Emaar",
    "Emaar Properties",
    "DAMAC",
    "DAMAC Properties",
    "Binghatti",
    "Binghatti Developers",
    "Binghatti by Binghatti Developers",
    "Sobha",
    "Sobha Realty",
    "Dubai Properties",
  ];
  const aliases = buildDeveloperAliasMap(names);
  assert.equal(aliases.get(rawDeveloperSlug("Emaar Properties")), "emaar");
  assert.equal(aliases.get(rawDeveloperSlug("Binghatti by Binghatti Developers")), "binghatti");
  assert.equal(aliases.get(rawDeveloperSlug("Sobha Realty")), "sobha");
  assert.equal(aliases.get(rawDeveloperSlug("Dubai Properties")), "dubai-properties");
  assert.deepEqual(canonicalDeveloperOptions(names), ["Binghatti", "DAMAC", "Dubai Properties", "Emaar", "Sobha"]);
});

test("streamlines verified project, developer and community duplicates while preserving old routes", async () => {
  const registry = getProjectRegistry();
  assert.equal(registry.projects.some((project) => project.slug === "seaside-hills-residences-al-zorah-ajman-for-sale-in-uae"), false);
  assert.equal(
    getProjectRecord("seaside-hills-residences-al-zorah-ajman-for-sale-in-uae")?.slug,
    "seaside-hills-residence-by-al-zorah-development-company-in-al-zorah-ajman",
  );
  for (const alias of ["linar-alef-group-al-mamzar-sharjah", "new-beachfront-destination-alef-group-al-mamzar-sharjah"]) {
    assert.equal(registry.projects.some((project) => project.slug === alias), false);
    assert.equal(getProjectRecord(alias)?.slug, "linar-towers-d-e-al-mamzar-sharjah");
  }
  assert.equal(getProjectRecord("linar-towers-d-e-al-mamzar-sharjah")?.name, "LINAR by Alef");
  assert.equal((await getImportedProject("linar-alef-group-al-mamzar-sharjah"))?.title, "LINAR by Alef");
  assert.equal(registry.projects.some((project) => project.slug === "select-group-peninsula-apartments-for-sale-in-business-bay-dubai"), false);
  assert.equal(
    getProjectRecord("select-group-peninsula-apartments-for-sale-in-business-bay-dubai")?.slug,
    "peninsula-four-the-plaza-select-group-business-bay-dubai",
  );

  assert.equal(getDeveloperProfile("tiger-properties-ajman-uae")?.slug, "tiger");
  assert.equal(getDeveloperProfile("al-zorah-development-company")?.slug, "al-zorah-development");

  assert.equal(communitySlugFor("Dubai, Business Bay"), "business-bay");
  assert.equal(communitySlugFor("Business Bay, Dubai"), "business-bay");
  assert.equal(communitySlugFor("Dubai, Al Barari Community"), "al-barari");
  assert.equal(communitySlugFor("Reem Island, Abu Dhabi"), "al-reem-island");
  assert.equal(getCommunityProfile("dubai-business-bay")?.slug, "business-bay");
  assert.ok(getCommunityRouteSlugs().includes("dubai-business-bay"));

  const communities = getCommunityDirectory();
  assert.equal(new Set(communities.map((community) => `${community.emirate}|${community.slug}`)).size, communities.length);
  assert.equal(new Set(communities.map((community) => community.slug)).size, communities.length);
  assert.ok(communities.length >= 213, `expected the expanded community directory, received ${communities.length}`);
  communities.forEach((community) => {
    assert.doesNotMatch(community.name, /^(?:Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain)\s*,|,\s*(?:Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain)$|\sCommunity$/i);
  });

  const jubail = getCommunityProfile("jubail-island");
  assert.equal(jubail?.name, "Jubail Island");
  assert.equal(jubail?.projects.length, 0);
  assert.match(jubail?.source?.url || "", /jubailisland\.ae/);
  assert.equal(getCommunityProfile("mistral")?.slug, "umm-al-quwain-marina");
  assert.equal(getCommunityProfile("al-jurf")?.slug, "aljurf");
  assert.ok(getCommunityRouteSlugs().includes("sustainable-city-dubai"));
});

test("keeps every public project card active and unique while preserving real phases", () => {
  const registry = getProjectRegistry();
  const active = registry.projects.filter((project) => !project.archived);
  const publicProjects = getUniqueActiveProjectRecords(registry.projects);
  assert.equal(new Set(registry.projects.map(({ slug }) => slug)).size, registry.projects.length);
  assert.equal(new Set(active.map(projectIdentityKey)).size, active.length, "active project identities must remain unique");
  assert.equal(publicProjects.length, active.length, "no active project should need silent presentation-time removal");
  assert.ok(publicProjects.every((project) => !project.archived));
  assert.ok(publicProjects.every((project) => !/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\ufeff\uffa0]/.test(project.name)));

  const firstPage = getProjectCatalogue();
  const catalogueProjects = Array.from({ length: firstPage.pages }, (_, index) => getProjectCatalogue({ page: index + 1 }).projects).flat();
  assert.equal(catalogueProjects.length, firstPage.total);
  assert.equal(new Set(catalogueProjects.map(({ slug }) => slug)).size, catalogueProjects.length);
  assert.ok(catalogueProjects.every(({ slug }) => getProjectRecord(slug)?.archived === false));

  assert.equal(getProjectRecord("bay-villas-dubai-islands-nakheel")?.name, "Bay Villas");
  assert.equal(getProjectRecord("bay-villas-phase-3-dubai-islands-nakheel")?.name, "Bay Villas Phase 3");
  assert.equal(getProjectRecord("villas-sharjah-garden-city-al-belaida-sharjah")?.name, "Sharjah Garden City Phase 4");
  assert.equal(getProjectRecord("sharjah-garden-city-villas-by-shomous-properties-for-sale")?.name, "Sharjah Garden City Villas");
  assert.ok(getProjectRecord("park-views-residences-tower-b-by-wasl-in-zaabeel-dubai"));
  assert.ok(getProjectRecord("park-views-residences-tower-a-by-wasl-in-zaabeel-dubai"));
  assert.ok(getProjectRecord("terra-golf-collection-phase-2-jumeirah-golf-estates"));
  assert.ok(getProjectRecord("terra-golf-collection-phase-2-townhouses"));
});

test("paginates live and static projects as one lossless, duplicate-free catalogue", async () => {
  const staticProjects = Array.from({ length: 55 }, (_, index) => ({
    slug: `static-project-${index + 1}`,
    title: `Static Project ${index + 1}`,
    developer: "Static Developer",
    emirate: "Dubai",
    area: `District ${index + 1}`,
  }));
  const liveRows = Array.from({ length: 7 }, (_, index) => ({
    slug: `live-project-${index + 1}`,
    name: `Live Project ${index + 1}`,
    developer: "Live Developer",
    emirate: "Abu Dhabi",
    area: `Live District ${index + 1}`,
    starting_price: 1_500_000 + index,
    payment_plan: "60/40",
    handover: "Q4 2028",
    image_url: "/projects/placeholder.webp",
    media_json: "{}",
    bedrooms_json: "[\"1BR\",\"2BR\"]",
    property_types_json: "[\"Apartments\"]",
    summary: `Live project ${index + 1}`,
    discovered_at: `2026-09-${String(7 - index).padStart(2, "0")}T00:00:00.000Z`,
  }));
  const staticResponse = (page: number) => Response.json({
    projects: staticProjects.slice((page - 1) * 24, page * 24),
    total: staticProjects.length,
    page,
    pages: Math.ceil(staticProjects.length / 24),
    filters: { emirates: { Dubai: staticProjects.length }, developers: ["Static Developer"], propertyTypes: [] },
    registry: { total: staticProjects.length, updatedAt: "2026-09-06T00:00:00.000Z" },
  });
  const env = {
    DB: {
      prepare: () => ({
        all: async () => ({ results: liveRows }),
      }),
    },
  } as never;

  const first = await mergeProjectCatalogueResponse(
    new Request("https://psr.espacios.me/api/projects?page=1"),
    env,
    staticResponse(1),
    async (page) => staticResponse(page),
  );
  const firstPayload = await first.json() as { total: number; pages: number; projects?: Array<{ slug: string }> };
  const mergedProjects: Array<{ slug: string }> = [...(firstPayload.projects || [])];
  for (let page = 1; page <= firstPayload.pages; page += 1) {
    if (page === 1) continue;
    const response = await mergeProjectCatalogueResponse(
      new Request(`https://psr.espacios.me/api/projects?page=${page}`),
      env,
      staticResponse(page),
      async (staticPage) => staticResponse(staticPage),
    );
    const payload = await response.json() as { projects?: Array<{ slug: string }> };
    mergedProjects.push(...(payload.projects || []));
  }

  const expectedSlugs = [...liveRows.map(({ slug }) => slug), ...staticProjects.map(({ slug }) => slug)];
  assert.equal(firstPayload.total, expectedSlugs.length);
  assert.deepEqual(mergedProjects.map(({ slug }) => slug), expectedSlugs);
  assert.equal(new Set(mergedProjects.map(({ slug }) => slug)).size, mergedProjects.length);
});

test("replaces the verified Radisson feed duplicate with its curated dossier while retaining unrelated feeds", async () => {
  const oldSlug = "radisson-residences-al-reem-island-rdh-abu-dhabi";
  const curatedSlug = "radisson-residences-al-reem-island-abu-dhabi";
  assert.equal(curatedProjectFeedAliases.get(oldSlug), curatedSlug);
  assert.equal(getProjectRecord(curatedSlug)?.name, "Radisson Residences Al Reem Island");
  assert.equal(curatedProjectFeedAliases.has("radisson-blu-hotel-residences-rak-central-bnw"), false);
  const staleRow = {
    slug: oldSlug,
    name: "Radisson Residences Al Reem Island by RDH",
    developer: "RDH",
    emirate: "Abu Dhabi",
    area: "AED18persq",
    starting_price: 950_000,
    payment_plan: "40/60",
    handover: "Q3 2029",
    image_url: "/projects/placeholder.webp",
    media_json: "{}",
    bedrooms_json: "[]",
    property_types_json: "[]",
    summary: "Monitored source record",
    discovered_at: "2026-09-12T00:00:00.000Z",
  };
  const unrelatedRow = { ...staleRow, slug: "unrelated-live-project", name: "Unrelated live project", developer: "Other developer", area: "Other district" };
  const env = { DB: { prepare: () => ({ all: async () => ({ results: [staleRow, unrelatedRow] }) }) } } as never;
  const catalogue = getProjectCatalogue();
  const response = await mergeProjectCatalogueResponse(
    new Request("https://psrhomes.ae/api/projects"),
    env,
    Response.json(catalogue),
    async (page) => Response.json(getProjectCatalogue({ page })),
  );
  const payload = await response.json() as { total: number; projects: Array<{ slug: string; area: string }> };
  assert.equal(payload.total, catalogue.total + 1);
  assert.equal(payload.projects[0].slug, unrelatedRow.slug);
  assert.equal(payload.projects[1].slug, curatedSlug);
  assert.equal(payload.projects.filter(({ slug }) => slug === curatedSlug).length, 1);
  assert.ok(payload.projects.every(({ slug, area }) => slug !== oldSlug && area !== "AED18persq"));

  const updates = await handleContentRequest(new Request("https://psrhomes.ae/api/project-updates"), env, {} as never);
  const updatesPayload = await updates!.json() as { projects: Array<{ slug: string }> };
  assert.deepEqual(updatesPayload.projects.map(({ slug }) => slug), [unrelatedRow.slug]);
});

test("does not sync a monitored slug already replaced by a curated dossier", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response('<urlset><url><loc>https://opr.ae/projects/radisson-residences-al-reem-island-rdh-abu-dhabi</loc></url></urlset>');
  };
  try {
    const result = await syncLatestProjectLaunches({ DB: { prepare: () => { throw new Error("Superseded launch must not reach D1 sync"); } } } as never);
    assert.deepEqual(result, { checked: 0, published: 0 });
    assert.deepEqual(requested, ["https://opr.ae/sitemap.xml"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maps a natural-language property request onto the existing filters", () => {
  const intent = interpretProjectSearchDeterministically(
    "Please find me 2 bedroom apartments by DAMAC in Dubai under AED 3m",
  );
  assert.equal(intent.emirate, "Dubai");
  assert.equal(intent.developer, "DAMAC");
  assert.equal(intent.propertyType, "Apartments");
  assert.equal(intent.bedrooms, "2BR");
  assert.equal(intent.maxPriceAed, 3_000_000);
  assert.equal(intent.query, "");
});

test("keeps meaningful lifestyle terms while understanding UAE shorthand", () => {
  const intent = interpretProjectSearchDeterministically(
    "waterfront villas in RAK below 8 million",
  );
  assert.equal(intent.emirate, "Ras Al Khaimah");
  assert.equal(intent.propertyType, "Villas");
  assert.equal(intent.maxPriceAed, 8_000_000);
  assert.equal(intent.query, "waterfront");
});

test("does not confuse Dubai Marina with a catalogue developer", () => {
  const intent = interpretProjectSearchDeterministically(
    "2 bedroom apartment under AED 3M in Dubai Marina",
  );
  assert.equal(intent.emirate, "Dubai");
  assert.equal(intent.developer, "");
  assert.equal(intent.propertyType, "Apartments");
  assert.equal(intent.bedrooms, "2BR");
  assert.equal(intent.maxPriceAed, 3_000_000);
  assert.equal(intent.query, "marina");
});

test("uses Workers AI as an interpretation layer and validates its output", async () => {
  const response = await handleProjectSearchIntent(
    new Request("https://psr.espacios.me/api/projects/interpret-search", {
      method: "POST",
      headers: { origin: "https://psr.espacios.me", "content-type": "application/json" },
      body: JSON.stringify({ query: "quiet family home close to schools" }),
    }),
    {
      AI: {
        run: async () => ({
          response: {
            query: "quiet family schools",
            emirate: "Dubai",
            developer: "Invented Developer",
            propertyType: "Villas",
            bedrooms: "4BR",
            maxPriceAed: 7_500_000,
          },
        }),
      },
    } as never,
  );
  assert.ok(response);
  assert.equal(response?.status, 200);
  const payload = await response?.json() as { intent: ReturnType<typeof interpretProjectSearchDeterministically> };
  assert.equal(payload.intent.interpretedByAi, true);
  assert.equal(payload.intent.emirate, "Dubai");
  assert.equal(payload.intent.propertyType, "Villas");
  assert.equal(payload.intent.bedrooms, "4BR");
  assert.equal(payload.intent.maxPriceAed, 7_500_000);
  assert.equal(payload.intent.developer, "");
});

test("rejects an AI developer guess derived from a community name", async () => {
  const response = await handleProjectSearchIntent(
    new Request("https://psr.espacios.me/api/projects/interpret-search", {
      method: "POST",
      headers: { origin: "https://psr.espacios.me", "content-type": "application/json" },
      body: JSON.stringify({ query: "2 bedroom apartment under AED 3M in Dubai Marina" }),
    }),
    {
      AI: {
        run: async () => ({ response: { query: "dubai marina", emirate: "Dubai", developer: "marina", propertyType: "Apartments", bedrooms: "2BR", maxPriceAed: 3_000_000 } }),
      },
    } as never,
  );
  assert.ok(response);
  const payload = await response?.json() as { intent: ReturnType<typeof interpretProjectSearchDeterministically> };
  assert.equal(payload.intent.developer, "");
  assert.equal(payload.intent.emirate, "Dubai");
  assert.equal(payload.intent.propertyType, "Apartments");
  assert.equal(payload.intent.bedrooms, "2BR");
  assert.equal(payload.intent.maxPriceAed, 3_000_000);
});
