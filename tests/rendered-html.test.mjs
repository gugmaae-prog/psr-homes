import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("renders production PSR metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>UAE Real Estate and Property Investment \| PSR<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/psrhomes\.ae"\/>/i);
  assert.match(html, /UAE real estate/i);
  assert.match(html, /off-plan property investment Dubai/i);
  assert.match(html, /MENA real estate investment/i);
  assert.match(html, /SearchAction/i);
  assert.match(html, /PSR UAE real estate advisory services/i);
  assert.match(html, /PSR Homes/i);
  assert.match(html, /favicon-light-32\.png/i);
  assert.match(html, /brand\/psr-logo-light\.png/i);
  assert.match(html, /brand\/psr-logo-dark\.png/i);
  assert.match(html, /brand\/psr-logo\.png/i);
  assert.match(html, /Real Estate/i);
  assert.match(html, /Clear market intelligence/i);
  assert.doesNotMatch(html, /museum-sequence-light\/01-stage\.jpg/i);
  assert.match(html, /hero\/psr-uae-hero-poster\.webp/i);
  assert.match(html, /<img[^>]*home-hero-poster[^>]*fetchpriority="high"/i);
  assert.doesNotMatch(html, /hero\/psr-uae-hero\.mp4|<video\b/i);
  assert.doesNotMatch(html, /<video[^>]*controls/i);
  assert.doesNotMatch(html, /youtube-nocookie\.com\/embed\/Ptj456hc_jQ/i);
  assert.match(html, /api\/agent\/avatar\/parv-sondhi/i);
  assert.doesNotMatch(html, /Dubai, drawn into being|Move or touch to reveal the completed skyline/i);
  assert.match(html, /Explore properties/i);
  assert.match(html, /DeferredConcierge/i);
  assert.match(html, /Open chat with Sonu, your AI broker/i);
  assert.doesNotMatch(html, /class="grace-finder-modal"/i);
  assert.doesNotMatch(html, /Ask GRACE|GRACE Finder|Chat with GRACE/i);
  assert.doesNotMatch(html, /Sonul|sonul-emoji/i);
  assert.doesNotMatch(html, /grace-head-blank\.png/i);
  assert.doesNotMatch(html, /images\/grace\/grace-mascot\.png/i);
  assert.doesNotMatch(html, /\b1,312\b|\b1312\b/i);
  assert.match(html, /Developers/i);
  assert.equal((html.match(/class="developer-directory-card developer-home-card"/g) || []).length, 8);
  assert.equal((html.match(/class="developer-flagship"/g) || []).length, 8);
  assert.match(html, /Burj Khalifa, a signature Emaar development/i);
  assert.match(html, /Cavalli Tower, a signature DAMAC development/i);
  assert.match(html, /Binghatti Wraith, a signature Binghatti development/i);
  assert.match(html, /Communities/i);
  assert.match(html, /Insights/i);
  assert.match(html, /Agent login/i);
  const desktopNavigation = html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/i)?.[0] || "";
  assert.doesNotMatch(desktopNavigation, /class="nav-agent-login"/i);
  assert.match(desktopNavigation, /class="nav-about"[\s\S]*?class="nav-about-menu" aria-label="About links"[\s\S]*?class="nav-about-agent"[^>]*>Agent login</i);
  assert.match(html, /\+971 58 103 5777/i);
  assert.match(html, /Copyright 2026 PSR Homes/i);
  assert.doesNotMatch(html, /<nav[^>]*>[\s\S]*?href="[^"]*mortgage-calculator"[\s\S]*?<\/nav>/i);
  assert.match(html, /Service standards/i);
  assert.match(html, /Parv Sondhi/i);
  assert.match(html, /Louay Betengane/i);
  assert.doesNotMatch(html, /with poise|preview property|preview selection|PRIVATE CLIENT REAL ESTATE · INVESTMENT ADVISORY/i);
  assert.doesNotMatch(html, /Source project imagery|OPR UAE|OPR-linked|Correct imagery/i);
  assert.doesNotMatch(html, /[↗↘↑→←▶Ⅱ×©]|\p{Extended_Pictographic}/u);
  assert.doesNotMatch(html, /images\.unsplash\.com|images\.pexels\.com/i);
  assert.doesNotMatch(html, /codex-preview/i);
});

test("renders the PSR Singapore Property Show registration experience", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("sg26-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const response = await worker.fetch(
    new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sg26`, {
      headers: { accept: "text/html" },
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Singapore Property Show 2026 \| PSR<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/psrhomes\.ae\/sg26"\/>/i);
  assert.match(html, /id="world-tour-heading"[^>]*>PSR Global Property Roadshow 2026[\s\S]*?Singapore<\/h1>/i);
  assert.match(html, /sg26\/destinations\/singapore-night-v1\.webp/i);
  assert.match(html, /data-artwork-tone="night"/i);
  assert.doesNotMatch(html, /world-tour-city-dubai/i);
  assert.doesNotMatch(html, /Home base/i);
  assert.doesNotMatch(html, /Dubai to Singapore/i);
  assert.doesNotMatch(html, /24 Jan/i);
  assert.match(html, /Friday[\s\S]*13 November[\s\S]*5:30 PM/i);
  assert.match(html, /Saturday[\s\S]*14 November[\s\S]*3:30 PM/i);
  assert.match(html, /Eastlink Gateway/i);
  assert.match(html, /Business setup/i);
  assert.match(html, /Family office migration/i);
  assert.match(html, /Request your invitation/i);
  assert.match(html, /Preferred session/i);
  assert.match(html, /Primary interest/i);
  assert.match(html, /property budget/i);
  assert.match(html, /OfflineEventAttendanceMode/i);
  assert.equal((html.match(/"@type":"Event"/g) || []).length, 2);
  assert.match(html, /2026-11-13T17:30:00\+08:00/i);
  assert.match(html, /2026-11-14T15:30:00\+08:00/i);
  assert.match(html, /hero\/psr-global-roadshow-singapore-cover\.png/i);
  assert.match(html, /projects\/al-yalayis\/hero\.webp/i);
  assert.equal((html.match(/<small[^>]*>Concept imagery<\/small>/g) || []).length, 2);
  assert.doesNotMatch(html, /venue to be announced/i);
  assert.doesNotMatch(html, /guaranteed return|guaranteed yield/i);

  const sitemapResponse = await worker.fetch(
    new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sitemap.xml`, {
      headers: { accept: "application/xml" },
    }),
    env,
    context,
  );
  assert.equal(sitemapResponse.status, 200);
  assert.match(await sitemapResponse.text(), /https:\/\/psrhomes\.ae\/sg26/i);
});

test("UAE project registry is complete and internally consistent", async () => {
  const registry = JSON.parse(await readFile(new URL("../data/projects.json", import.meta.url), "utf8"));
  const slugs = registry.projects.map((project) => project.slug);
  assert.equal(registry.totalUaeProjects, registry.projects.length);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(registry.currentUaeProjects + registry.archivedUaeProjects, registry.totalUaeProjects);
  assert.ok(registry.totalUaeProjects >= 1300);
  assert.ok(registry.projects.every((project) => project.slug && project.name && project.developer && project.emirate && project.area));
  assert.ok(registry.projects.every((project) => !project.image || /^https:\/\/(?:cdn\.opr\.ae|img[123]\.creatium\.ru|i\.1\.creatium\.io)\//.test(project.image)));
  assert.ok(registry.projects.every((project) => !/(?:^|[/_.-])(logo|favicon|whatsapp|telegram|qr(?:code)?|barcode|scan[-_]?me)(?:[/_.-]|$)/i.test(project.image)));
  const brochures = registry.projects.filter((project) => project.brochure);
  assert.ok(brochures.length >= 850);
  assert.ok(brochures.every((project) => /^https:\/\/cdn\.opr\.ae\/.+\.pdf(?:[?#].*)?$/i.test(project.brochure)));
  const visibleText = registry.projects.map((project) => `${project.name} ${project.developer} ${project.area} ${project.description}`).join(" ");
  assert.equal(visibleText.match(/Metropolitan Premium Properties|\bOPR(?:\.AE)?\b/gi), null);
  assert.deepEqual(Object.keys(registry.emirates).sort(), ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"]);
});

test("renders every valid payment milestone without empty circles", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("payment-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/projects/marea-residences-sharafi-dubai-islands`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal((html.match(/class="payment-milestone"/g) || []).length, 3);
  assert.match(html, /<strong>40\/30\/30<\/strong>/i);
  assert.match(html, /On booking/i);
  assert.match(html, /During construction/i);
  assert.match(html, /On handover/i);
  assert.match(html, /(?:Project|Dubai-wide average) AED\/sqft/i);
  assert.match(html, /AED 1,\d{3}\/sqft/i);
  assert.match(html, /Off-plan liquidity calculator/i);
  assert.match(html, /Off-plan liquidity model/i);
  assert.match(html, /Cash before handover/i);
  assert.match(html, /Fees and reserve/i);
  assert.match(html, /Hide calculator/i);
  assert.match(html, /Configuration changes use a planning estimate derived from the advertised starting price/i);
  assert.match(html, /Editable unit price/i);
  assert.match(html, /Replace it with the selected unit price/i);
  assert.match(html, /Editable developer payment structure/i);
  assert.match(html, /Booking payment/i);
  assert.match(html, /Booking payment percentage/i);
  assert.match(html, /During construction/i);
  assert.match(html, /At handover/i);
  assert.match(html, /Plan total/i);
  assert.match(html, /linked balance adjusts automatically/i);
  assert.match(html, /Automatically balanced/i);
  assert.match(html, /Registration fee percentage/i);
  assert.match(html, /Liquidity contingency percentage/i);
  assert.doesNotMatch(html, /CBUAE maximum LTV/i);
  assert.match(html, /Project literature/i);
  assert.match(html, /data-brochure-status="verified"/i);
  assert.match(html, /Get brochure/i);
  assert.doesNotMatch(html, /api\/brochures\/marea-residences-sharafi-dubai-islands/i);
  assert.doesNotMatch(html, /cdn\.opr\.ae\/upload\/brochures/i);
  assert.match(html, /Display results in/i);
  assert.match(html, /Inputs and calculations remain in AED/i);
  assert.match(html, /<span class="payment-divider" aria-hidden="true"><\/span>/i);
  assert.doesNotMatch(html, /<div class="payment-divider"/i);
  assert.match(html, /Continue the shortlist/i);
  assert.match(html, /lead-form-compact/i);
  assert.match(html, /Project enquiry/i);
  assert.match(html, /Receive a Private Brief about/i);
  assert.match(html, /Preferred number of bedrooms/i);
  assert.match(html, /Email my project brief/i);
  assert.match(html, /Your project brief will be emailed immediately/i);
  assert.equal((html.match(/class="project-preview-card"/g) || []).length, 3);
  assert.doesNotMatch(html, /qr[-_ ]?code|scan[-_]?me|whatsapp[-_ ]?qr/i);
});

test("renders the curated upcoming releases and Imtiaz DLRC launch", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("launch-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
  };
  const context = { waitUntil() {}, passThroughOnException() {} };
  async function render(path) {
    const response = await worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200);
    return response.text();
  }

  const [residences113, linar, ellington, avenuePark, imtiaz, imtiazDeveloper, searchResponse, residencesSearchResponse, avenueSearchResponse, normalizedFilterResponse] = await Promise.all([
    render("/projects/113-residences-iman-developers-al-sufouh-dubai"),
    render("/projects/linar-towers-d-e-al-mamzar-sharjah"),
    render("/projects/ellington-villa-townhouse-community-al-yalayis-dubai"),
    render("/projects/avenue-park-towers-ii-wasl-1-al-kifaf-dubai"),
    render("/projects/imtiaz-dlrc-tower"),
    render("/developers/imtiaz"),
    worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/projects?q=Linar`, { headers: { accept: "application/json" } }), env, context),
    worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/projects?q=113%20Residences`, { headers: { accept: "application/json" } }), env, context),
    worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/projects?q=Avenue%20Park%20Towers%20II`, { headers: { accept: "application/json" } }), env, context),
    worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/projects?developer=Modon&bedrooms=2BR&maxPrice=3000000`, { headers: { accept: "application/json" } }), env, context),
  ]);

  assert.match(residences113, /113 Residences/i);
  assert.match(residences113, /IMAN Developers/i);
  assert.match(residences113, /Al Sufouh/i);
  assert.match(residences113, /AED 1,800,000/i);
  assert.match(residences113, /AED 2,560,000/i);
  assert.match(residences113, /AED 3,650,000/i);
  assert.match(residences113, /AED 5,440,000/i);
  assert.match(residences113, /20\/30\/50/i);
  assert.match(residences113, /Q2 2029/i);
  assert.match(residences113, /4(?:<!-- -->|\s)*layouts(?:<!-- -->|\s)*available/i);
  assert.match(residences113, /Exteriors<span>8<\/span>/i);
  assert.match(residences113, /Interiors<span>11<\/span>/i);
  assert.match(residences113, /Floor plans<span>4<\/span>/i);
  assert.doesNotMatch(residences113, /qr[-_ ]?code|scan[-_]?me|whatsapp[-_ ]?qr/i);
  assert.doesNotMatch(residences113, /024acc973cac543d5c4281cbad04ca519d\/34\.jpg/i);

  assert.match(linar, /Upcoming release/i);
  assert.match(linar, /AED 945,000/i);
  assert.match(linar, /AED 1,450,000/i);
  assert.match(linar, /AED 2,450,000/i);
  assert.match(linar, /AED 20,000/i);
  assert.match(linar, /AED 30,000/i);
  assert.match(linar, /AED 40,000/i);
  assert.match(linar, /Published configuration prices are used where available/i);
  assert.match(linar, /Get brochure/i);
  assert.doesNotMatch(linar, /api\/brochures\/linar-towers-d-e-al-mamzar-sharjah/i);
  assert.match(linar, /project-enquiry-float/i);
  assert.match(linar, /Check live availability/i);
  assert.match(linar, /project-lead-modal/i);
  assert.match(linar, /Close enquiry form/i);
  assert.match(linar, /Receive a Private Brief about/i);
  assert.doesNotMatch(linar, /qr[-_ ]?code|scan[-_]?me|whatsapp[-_ ]?qr/i);

  assert.match(ellington, /Upcoming Ellington Community/i);
  assert.match(ellington, /Pre-launch tracking/i);
  assert.match(ellington, /Price on request/i);
  assert.match(ellington, /To be confirmed/i);
  assert.match(ellington, /Al Yalayis/i);
  assert.match(ellington, /projects\/al-yalayis\/hero\.webp/i);
  assert.match(ellington, /visuals are PSR-owned indicative concepts/i);
  assert.doesNotMatch(ellington, /Approx\. AED 2,500,000|AED 1,600\/sqft|Exterior-1-scaled\.jpg|PALISADES GATE/i);
  assert.match(ellington, /project-enquiry-float/i);
  assert.match(ellington, /project-lead-modal/i);
  assert.match(ellington, /Receive a Private Brief about/i);

  assert.match(avenuePark, /Avenue Park Towers II/i);
  assert.match(avenuePark, /Launching soon/i);
  assert.match(avenuePark, /Price on request/i);
  assert.match(avenuePark, /6 March 2030/i);
  assert.match(avenuePark, /DLD project 4496/i);
  assert.match(avenuePark, /1 Bedroom apartment/i);
  assert.match(avenuePark, /4 Bedroom duplex/i);
  assert.match(avenuePark, /Swimming pools/i);
  assert.match(avenuePark, /projects\/avenue-park-towers-ii\/official-hero\.webp/i);
  assert.match(avenuePark, /imagery is sourced from Wasl/i);
  assert.doesNotMatch(avenuePark, /AED 1,500,000|5\/55\/40|Q4 2028/i);
  assert.doesNotMatch(avenuePark, /Prefilled from the project|class="mortgage-calculator/i);

  assert.match(imtiaz, /Imtiaz DLRC Tower/i);
  assert.match(imtiaz, /AED 625,000/i);
  assert.match(imtiaz, /20\/40\/40/i);
  assert.match(imtiaz, /Q2 2027/i);
  assert.match(imtiazDeveloper, /Imtiaz Developments/i);
  assert.match(imtiazDeveloper, /DLRC pipeline/i);
  assert.match(imtiazDeveloper, /Imtiaz DLRC Tower/i);

  assert.equal(searchResponse.status, 200);
  const search = await searchResponse.json();
  assert.ok(search.projects.some((project) => project.slug === "linar-towers-d-e-al-mamzar-sharjah"));
  assert.equal(residencesSearchResponse.status, 200);
  const residencesSearch = await residencesSearchResponse.json();
  assert.equal(residencesSearch.projects.filter((project) => project.slug === "113-residences-iman-developers-al-sufouh-dubai").length, 1);
  assert.equal(avenueSearchResponse.status, 200);
  const avenueSearch = await avenueSearchResponse.json();
  assert.equal(avenueSearch.projects.filter((project) => project.slug === "avenue-park-towers-ii-wasl-1-al-kifaf-dubai").length, 1);
  assert.equal(normalizedFilterResponse.status, 200);
  const normalizedFilters = await normalizedFilterResponse.json();
  assert.ok(normalizedFilters.projects.length >= 3);
  assert.ok(normalizedFilters.projects.every((project) => /^Modon(?: Properties)?$/i.test(project.developer)));
  assert.ok(normalizedFilters.projects.every((project) => project.bedrooms.some((bedroom) => /^(?:2BR|2 Bedroom)$/i.test(bedroom))));
});

test("renders every recent and additional launch through the full project-detail system", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("recent-launch-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
  };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const launches = [
    // One Archive interior is deliberately excluded by the photographic-media
    // policy because OCR review found embedded text in the source image.
    ["the-archive-by-imtiaz", "The Archive by Imtiaz", "AED 666,000", "Album<span>4</span>"],
    ["mira-coral-bay-al-mairid-ras-al-khaimah", "Mira Coral Bay", "Expected from AED 580,000", "Album<span>5</span>"],
    ["apartments-muheira-maysan-abu-dhabi", "Muheira", "AED 2,000,000", "Interiors<span>8</span>"],
    ["oceana-by-reportage-fujairah-uae", "Oceana", "AED 530,000", "Interiors<span>4</span>"],
    ["brabus-island-reportage-al-raha-beach-abu-dhabi", "Brabus Island", "AED 2,800,000", "Interiors<span>3</span>"],
    ["sensi-reportage-saadiyat-island-abu-dhabi", "Sensi", "AED 2,800,000", "Interiors<span>4</span>"],
    ["sila-reportage-masdar-city-abu-dhabi", "Sila", "AED 2,800,000", "Exteriors<span>8</span>"],
    ["marlin-ii-reportage-al-reem-island-abu-dhabi", "Marlin II", "AED 1,600,000", "Interiors<span>4</span>"],
    ["perla-heights-reportage-yas-island-abu-dhabi", "Perla Heights", "AED 700,000", "Interiors<span>4</span>"],
    ["perla-waves-reportage-yas-island-abu-dhabi", "Perla Waves", "AED 1,900,000", "Interiors<span>4</span>"],
    ["golf-trails-emaar-emaar-south-dubai", "Golf Trails at Emaar South", "AED 1,250,000", "Exteriors<span>3</span>"],
    ["the-canopies-yas-point-aldar-yas-island-abu-dhabi", "The Canopies at Yas Point", "AED 1,650,000", "Floor plans<span>4</span>"],
    ["binghatti-wraith-al-jaddaf-dubai", "Binghatti Wraith", "AED 799,999", "Floor plans<span>3</span>"],
    ["valia-dubai-creek-harbour-emaar-dubai", "Valia at Dubai Creek Harbour", "AED 2,140,000", "Album<span>6</span>"],
    ["natuzzi-harmony-residences-peace-homes-dubai-islands-dubai", "Natuzzi Harmony Residences", "Current guidance from AED 2,380,000", "Floor plans<span>3</span>"],
    ["peace-lagoons-1-2-peace-homes-dlrc-dubai", "Peace Lagoons", "Phase II / resale guidance from AED 680,000", "Floor plans<span>4</span>"],
    ["azizi-florence-um-fanain-sharjah", "Azizi Florence", "Indicative from AED 2,000,000", "Album<span>3</span>"],
    ["valencia-apartments-damac-lagoons-dubai", "Valencia Apartments", "Latest release from AED 725,000", "Floor plans<span>3</span>"],
    ["ramhan-island-villas-phase-4-eagle-hills-abu-dhabi", "Ramhan Island Villas", "Current developer stock from AED 6,900,000", "Floor plans<span>4</span>"],
    ["doubletree-hilton-residences-jumeirah-garden-city-dubai", "DoubleTree by Hilton Residences", "Current release from AED 1,640,000", "Album<span>9</span>"],
    ["jacob-and-co-residences-mantra-developments-al-marjan-island-rak", "Jacob", "Current developer stock from AED 1,022,888", "Floor plans<span>3</span>"],
    ["edge-rak-properties-raha-island-mina-ras-al-khaimah", "EDGE", "AED 750,000", "Exteriors<span>6</span>"],
  ];

  for (const [slug, title, price, galleryMarker] of launches) {
    const response = await worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/projects/${slug}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(html, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(html, /class="project-hero"/i);
    assert.match(html, /The investment case/i);
    assert.match(html, /Residence pricing/i);
    assert.match(html, /Project media library/i);
    assert.match(html, new RegExp(galleryMarker, "i"));
    assert.match(html, /Lifestyle and performance/i);
    assert.match(html, /Capital structure/i);
    assert.match(html, /Residence intelligence/i);
    assert.match(html, /Off-plan liquidity calculator/i);
    assert.match(html, /project-enquiry-float/i);
    if (slug === "valia-dubai-creek-harbour-emaar-dubai") {
      assert.match(html, /Document page preview/i);
      assert.match(html, /project-document-previews\/valia-01\.webp/i);
      assert.match(html, /project-document-previews\/valia-03\.webp/i);
      assert.match(html, /Get brochure/i);
      assert.doesNotMatch(html, /new-projects-media\.propertyfinder\.com\/project\/d1294890/i);
      assert.doesNotMatch(html, /api\/brochures\/valia-dubai-creek-harbour-emaar-dubai/i);
    }
  }

  for (const slug of [
    "the-archive-by-imtiaz",
    "natuzzi-harmony-residences-peace-homes-dubai-islands-dubai",
    "peace-lagoons-1-2-peace-homes-dlrc-dubai",
    "azizi-florence-um-fanain-sharjah",
  ]) {
    const legacy = await worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}/projects/latest/${slug}`, { headers: { accept: "text/html" }, redirect: "manual" }), env, context);
    assert.ok([307, 308].includes(legacy.status), slug);
    assert.match(legacy.headers.get("location") || "", new RegExp(`/projects/${slug}$`));
  }
});

test("renders visible directories, legal copy and the complete research observatory", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("surface-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  async function render(path) {
    const response = await worker.fetch(new Request(`http://localhost${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200);
    return response.text();
  }

  const [developers, communities, insightIndex, privacy, researchArticle, priceGuideArticle, mortgage, listing, about, advisors, parv, contact, services, jubail] = await Promise.all([
    render("/developers"),
    render("/communities"),
    render("/insights"),
    render("/privacy"),
    render("/insights/dubai-market-pulse-monthly-quarterly-historical-2026"),
    render("/insights/price-per-square-foot-uae-property-guide-2026"),
    render("/mortgage-calculator"),
    render("/list-your-property"),
    render("/about"),
    render("/advisors"),
    render("/advisors/parv-sondhi"),
    render("/contact"),
    render("/services"),
    render("/communities/jubail-island"),
  ]);

  assert.match(developers, /developer profiles/i);
  assert.match(developers, /Burj Khalifa/i);
  assert.match(developers, /Palm Jumeirah/i);
  assert.match(communities, /community guides/i);
  assert.match(communities, /Explore 215 community markets/i);
  assert.match(communities, /Jubail Island/i);
  assert.match(jubail, /Mangrove-led island living/i);
  assert.match(jubail, /No current PSR project records/i);
  assert.match(jubail, /Jubail Island Investment Company/i);
  assert.match(insightIndex, /Market observatory/i);
  assert.match(insightIndex, /Research for better/i);
  assert.match(insightIndex, /UAE decisions/i);
  assert.match(insightIndex, /Read latest briefing/i);
  assert.match(insightIndex, /Browse all research/i);
  assert.match(insightIndex, /Open the UAE Market Atlas/i);
  assert.match(insightIndex, /href="\/emirate"/i);
  assert.match(insightIndex, /DWTN%20Residences\.jpg/i);
  assert.match(insightIndex, /31%20Above%201\.jpg/i);
  assert.match(insightIndex, /Monthly pulse/i);
  assert.match(insightIndex, /Quarterly comparison/i);
  assert.match(insightIndex, /Historical depth/i);
  assert.match(insightIndex, /Global hotspot comparison/i);
  assert.match(insightIndex, /Real estate resilience after conflict/i);
  assert.match(insightIndex, /Price per square foot in UAE property/i);
  assert.match(insightIndex, /Mortgage planning before reservation/i);
  assert.match(insightIndex, /Service charges and net yield/i);
  assert.match(researchArticle, /Evidence dashboard/i);
  assert.match(researchArticle, /Sources and verification/i);
  assert.match(researchArticle, /16\.1k/i);
  assert.match(priceGuideArticle, /AED 1,916\/sq\.ft/i);
  assert.match(priceGuideArticle, /AED 3,011\/sq\.ft/i);
  assert.match(priceGuideArticle, /AED 1,783\/sq\.ft/i);
  assert.match(mortgage, /Mortgage calculator/i);
  assert.match(mortgage, /Estimated monthly payment/i);
  assert.match(mortgage, /CBUAE maximum LTV/i);
  assert.match(mortgage, /Hide calculator/i);
  assert.match(listing, /List your unit with PSR/i);
  assert.match(listing, /The marketing system/i);
  assert.match(listing, /Request a private appraisal/i);
  assert.match(listing, /Service standards/i);
  assert.match(about, /Who we are/i);
  assert.match(about, /Local knowledge/i);
  assert.match(about, /AED 2\.5B/i);
  assert.match(about, /Agent login/i);
  assert.match(about, /about\/psr-about-banner\.webp/i);
  assert.doesNotMatch(about, /team\/groups\//i);
  assert.doesNotMatch(advisors, /team\/groups\/|advisor-ensemble/i);
  for (const name of ["Parv Sondhi", "Louay Betengane", "Reegan Negi", "Sonu Sharma", "Adhiyaman Aathimulam", "Prateek Rawal", "Mazhar Khan", "Neshva Chundayil", "Janet Genabio", "Pratham Raval"]) {
    assert.match(about, new RegExp(name, "i"));
    assert.match(advisors, new RegExp(name, "i"));
  }
  for (const role of ["Managing Director", "Managing Partner", "Property Consultant", "Head Accountant", "Office Coordinator"]) {
    assert.match(advisors, new RegExp(role, "i"));
  }
  assert.match(parv, /Parv Sondhi/i);
  assert.match(parv, /Managing Partner/i);
  assert.match(parv, /English/i);
  assert.match(parv, /api\/agent\/avatar\/parv-sondhi/i);
  assert.match(parv, /public-advisor-tabs/i);
  assert.match(parv, /href="#advisor-overview"/i);
  assert.match(parv, /href="#advisor-expertise"/i);
  assert.match(parv, /href="#advisor-contact"/i);
  const advisorProfiles = await Promise.all([
    ["sourabh-das", "Sourabh Das"],
    ["majhar-khan", "Mazhar Khan"],
    ["adhiyaman-aathimulam", "Adhiyaman Aathimulam"],
    ["reegan-negi", "Reegan Negi"],
    ["louay-betengane", "Louay Betengane"],
    ["rohit-kumar-sinha", "Rohit Kumar Sinha"],
    ["parv-sondhi", "Parv Sondhi"],
    ["sonu-sharma", "Sonu Sharma"],
    ["prateek-rawal", "Prateek Rawal"],
    ["jumanah", "Jumanah"],
    ["neshva-chundayil", "Neshva Chundayil"],
    ["janet-genabio", "Janet Genabio"],
    ["pratham-raval", "Pratham Raval"],
    ["ujwal-kumar", "Ujwal Kumar"],
    ["harna-raval", "Harna Raval"],
  ].map(async ([slug, name]) => ({ name, html: await render(`/advisors/${slug}`) })));
  for (const { name, html } of advisorProfiles) {
    assert.match(html, new RegExp(name, "i"));
    assert.match(html, /class="public-advisor-hero"/i);
    assert.match(html, /class="public-advisor-portrait"/i);
    assert.match(html, /class="public-advisor-intro"/i);
    assert.match(html, /class="public-advisor-tabs"/i);
    assert.match(html, /class="public-advisor-expertise-heading"/i);
    assert.match(html, /class="public-advisor-expertise-surface"/i);
    assert.match(html, /class="public-advisor-focus-list"/i);
    assert.match(html, /class="public-advisor-facts"/i);
    assert.match(html, /href="#advisor-contact"/i);
  }
  assert.match(advisors, /api\/agent\/avatar\/louay-betengane/i);
  assert.match(parv, /\+971 58 680 1148/i);
  assert.match(contact, /DAMAC Smart Heights/i);
  assert.match(contact, /A PSR advisor will reply/i);
  assert.match(services, /Property management/i);
  assert.match(services, /Property snagging/i);
  assert.doesNotMatch(about + advisors + contact, /Aria Sloane|Office 1142|ORN 1182853|Sameer Muhammad|Nadiia Tymoshenko|cbaestate/i);
  assert.match(privacy, /class="legal-page"/i);
  assert.match(privacy, /Information we collect/i);
  assert.match(about, /favicon-light-32\.png\?v=psr-theme-20260822/i);
  assert.match(about, /favicon-light-512\.png\?v=psr-theme-20260822/i);
  assert.doesNotMatch(about, /cba-favicon-master/i);
});

test("serves complete public advisor data even before a portal profile is published", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("advisor-fallback-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const statement = {
    bind() { return this; },
    first: async () => null,
  };
  const response = await worker.fetch(
    new Request("http://localhost/api/agent/portfolio/parv-sondhi", { headers: { accept: "application/json" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: { prepare: () => statement },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.advisor.name, "Parv Sondhi");
  assert.equal(payload.advisor.title, "Managing Partner");
  assert.equal(payload.advisor.portfolioSlug, "parv-sondhi");
  assert.match(payload.advisor.avatarUrl, /api\/agent\/avatar\/parv-sondhi/i);
  assert.equal(payload.advisor.topProjects.length, 3);
  assert.ok(payload.advisor.topProjects.every((project) => project.slug && project.name && project.imageUrl));
});

test("serves Neshva as operations staff without fabricating an advisor portfolio", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("operations-profile-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const statement = {
    bind() { return this; },
    first: async () => null,
  };
  const response = await worker.fetch(
    new Request("http://localhost/api/agent/portfolio/neshva-chundayil", { headers: { accept: "application/json" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: { prepare: () => statement },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.advisor.name, "Neshva Chundayil");
  assert.equal(payload.advisor.title, "Head Accountant");
  assert.equal(payload.advisor.profileKind, "operations");
  assert.deepEqual(payload.advisor.topDevelopers, []);
  assert.deepEqual(payload.advisor.topProjects, []);
  assert.equal(payload.advisor.propertyFinder, null);
  assert.deepEqual(payload.advisor.secondaryUnits, []);
});

test("serves Janet as operations staff without fabricating an advisor portfolio", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("office-coordinator-profile-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const statement = {
    bind() { return this; },
    first: async () => null,
  };
  const response = await worker.fetch(
    new Request("http://localhost/api/agent/portfolio/janet-genabio", { headers: { accept: "application/json" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: { prepare: () => statement },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.advisor.name, "Janet Genabio");
  assert.equal(payload.advisor.title, "Office Coordinator");
  assert.equal(payload.advisor.email, "janet@psrhomes.ae");
  assert.equal(payload.advisor.profileKind, "operations");
  assert.deepEqual(payload.advisor.topDevelopers, []);
  assert.deepEqual(payload.advisor.topProjects, []);
  assert.equal(payload.advisor.propertyFinder, null);
  assert.deepEqual(payload.advisor.secondaryUnits, []);
});

test("applies the PSR SEO index-quality gate and removes duplicate catalogue intent", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("seo-gate-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const request = (path, init = {}) => worker.fetch(new Request(`http://localhost${basePath}${path}`, { headers: { accept: "text/html" }, redirect: "manual", ...init }), env, context);

  const duplicate = await request("/properties?q=marina&emirate=Dubai");
  assert.ok([307, 308].includes(duplicate.status));
  assert.match(duplicate.headers.get("location") || "", /\/projects\?q=marina&emirate=Dubai$/i);

  const filtered = await request("/projects?q=marina");
  assert.equal(filtered.status, 200);
  const filteredHtml = await filtered.text();
  assert.match(filteredHtml, /name="robots" content="noindex, follow"/i);
  assert.match(filteredHtml, /rel="canonical" href="https:\/\/psrhomes\.ae\/projects"/i);

  const curated = await request("/projects/113-residences-iman-developers-al-sufouh-dubai");
  assert.equal(curated.status, 200);
  const curatedHtml = await curated.text();
  assert.doesNotMatch(curatedHtml, /name="robots" content="noindex/i);
  assert.match(curatedHtml, /ApartmentComplex/i);
  assert.match(curatedHtml, /BreadcrumbList/i);

  const developer = await request("/developers/emaar");
  assert.equal(developer.status, 200);
  const developerHtml = await developer.text();
  assert.doesNotMatch(developerHtml, /<meta name="description" content="Explore Emaar"/i);
  assert.match(developerHtml, /Emaar UAE developer profile/i);
  assert.match(developerHtml, /Dubai off-plan investment advisor|off-plan property investment Dubai/i);

  const investmentLanding = await request("/off-plan-property-investment-dubai");
  assert.equal(investmentLanding.status, 200);
  const investmentLandingHtml = await investmentLanding.text();
  assert.match(investmentLandingHtml, /Off-Plan Property Investment Dubai \| PSR/i);
  assert.match(investmentLandingHtml, /FAQPage/i);
  assert.match(investmentLandingHtml, /Open the full PSR project index/i);
  assert.match(investmentLandingHtml, /Dubai off-plan projects/i);

  const registryOnly = await request("/projects/wyndham-residences-al-marjan-island-rak-uae");
  assert.equal(registryOnly.status, 200);
  assert.match(await registryOnly.text(), /name="robots" content="noindex, follow"/i);

  const sitemap = await request("/sitemap.xml", { headers: { accept: "application/xml" } });
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.doesNotMatch(sitemapXml, /<loc>https:\/\/psr\.espacios\.me\/admin<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/emirate<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/emirate\/dubai<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/emirate\/abu-dhabi<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/emirate\/ras-al-khaimah<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/off-plan-property-investment-dubai<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/high-roi-dubai-property<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/dubai-property-investment<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/uae-property-investment<\/loc>/i);
  assert.match(sitemapXml, /<loc>https:\/\/psrhomes\.ae\/dubai-villas<\/loc>/i);
  assert.match(sitemapXml, /113-residences-iman-developers-al-sufouh-dubai/i);
  assert.doesNotMatch(sitemapXml, /wyndham-residences-al-marjan-island-rak-uae/i);
  assert.doesNotMatch(sitemapXml, /<loc>https:\/\/psr\.espacios\.me\/properties<\/loc>/i);

  const robots = await request("/robots.txt", { headers: { accept: "text/plain" } });
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Disallow: \/admin/i);
  assert.match(robotsText, /Disallow: \/analytics/i);
  assert.match(robotsText, /Disallow: \/leads/i);

  const llms = await request("/llms.txt", { headers: { accept: "text/plain" } });
  assert.equal(llms.status, 200);
  const llmsText = await llms.text();
  assert.match(llmsText, /PSR Homes Real Estate LLC/i);
  assert.match(llmsText, /UAE project index: https:\/\/psrhomes\.ae\/projects/i);
  assert.match(llmsText, /Investment Search Pages/i);
  assert.match(llmsText, /High ROI Dubai Property: https:\/\/psrhomes\.ae\/high-roi-dubai-property/i);
  assert.match(llmsText, /off-plan property investment Dubai/i);
  assert.match(llmsText, /UAE Market Atlas: https:\/\/psrhomes\.ae\/emirate/i);
  assert.match(llmsText, /Daily market lens: https:\/\/psrhomes\.ae\/insights\/daily/i);
  assert.match(llmsText, /UAE Market Atlas Initiative Briefings/i);
  assert.match(llmsText, /https:\/\/psrhomes\.ae\/insights\/etihad-rail-passenger-network-uae-property-impact-2026/i);
  assert.doesNotMatch(llmsText, /\/admin|\/agent|\/analytics|\/leads/i);
});

test("renders the source-backed UAE Market Atlas with subordinate PSR property coverage", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("emirate-market-atlas-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const request = (path) => worker.fetch(new Request(`http://localhost${basePath}${path}`, { headers: { accept: "text/html" } }), env, context);
  const initiativeArticlePaths = new Set();
  const collectInitiativeArticlePaths = (html) => {
    for (const match of html.matchAll(/href="(\/insights\/[a-z0-9-]+)"/gi)) {
      if (match[1] !== "/insights/daily") initiativeArticlePaths.add(match[1]);
    }
  };

  const index = await request("/emirate");
  assert.equal(index.status, 200);
  const indexHtml = await index.text();
  collectInitiativeArticlePaths(indexHtml);
  assert.match(indexHtml, /data-psr-page-shell="public"/i);
  assert.match(indexHtml, /data-psr-section="emirates"/i);
  assert.equal((indexHtml.match(/class="site-header internal-header"/g) || []).length, 1);
  assert.equal((indexHtml.match(/class="site-footer"/g) || []).length, 1);
  assert.match(indexHtml, /UAE Market Atlas: Seven Emirates, Future Projects and Events/i);
  assert.match(indexHtml, /name="twitter:card" content="summary_large_image"/i);
  assert.match(indexHtml, /name="twitter:title" content="UAE Market Atlas: Seven Emirates, Future Projects and Events"/i);
  assert.match(indexHtml, /rel="canonical" href="https:\/\/psrhomes\.ae\/emirate"/i);
  assert.match(indexHtml, /The UAE is more than[\s\S]*a property market/i);
  assert.match(indexHtml, /aria-label="UAE Market Atlas sections"/i);
  assert.match(indexHtml, /href="#emirate-directory"[^>]*class="psr-action psr-action-primary"[^>]*>Explore the seven market overviews/i);
  assert.match(indexHtml, /href="#uae-future-pipeline"[^>]*class="psr-action"[^>]*>Track the UAE future pipeline/i);
  assert.match(indexHtml, /href="#uae-events"[^>]*class="psr-action"[^>]*>Open the UAE calendar/i);
  assert.match(indexHtml, /One federation[\s\S]*Seven economic identities/i);
  assert.match(indexHtml, /class="uae-atlas-cover"/i);
  assert.match(indexHtml, /src="\/emirates\/editorial\/uae-market-atlas-v1\.webp"[^>]*fetchpriority="high"/i);
  assert.match(indexHtml, /AI-assisted image generated for PSR Homes/i);
  assert.match(indexHtml, /CollectionPage/i);
  assert.match(indexHtml, /Seven UAE emirate market overviews/i);
  assert.match(indexHtml, /aria-label="Insights sections"/i);
  assert.match(indexHtml, /aria-current="page"[^>]*>Emirates/i);
  assert.equal((indexHtml.match(/class="emirate-index-card"/g) || []).length, 7);
  const emirateIndexCards = [...indexHtml.matchAll(/<article class="emirate-index-card"[\s\S]*?<\/article>/g)];
  assert.equal(emirateIndexCards.length, 7);
  const indexEditorialCovers = [
    ...indexHtml.matchAll(/<img [^>]*src="(\/emirates\/editorial\/[a-z0-9-]+\.webp)"[^>]*>/gi),
  ].map((match) => match[1]);
  assert.equal(indexEditorialCovers.length, 8);
  assert.ok(indexEditorialCovers.every((cover) => cover.startsWith("/emirates/editorial/")), "jurisdiction covers may be reused but must remain approved local media");
  for (const [card] of emirateIndexCards) {
    const images = [...card.matchAll(/<img [^>]*>/g)].map(([image]) => image);
    assert.equal(images.length, 1, "each market-overview card should use one bounded editorial cover");
    assert.match(images[0], /src="\/emirates\/editorial\/[a-z0-9-]+-market-overview-v1\.webp"/i);
    assert.match(images[0], /loading="lazy"/i, "below-fold emirate card imagery should remain lazy");
    assert.match(card, /<figure class="emirate-index-media">[\s\S]*?<figcaption>/i);
    assert.match(card, /PSR editorial composite/i);
    assert.match(card, /class="emirate-card-pipeline"/i, "each existing emirate card should contain its own catalyst preview");
    assert.match(card, /href="\/emirate\/[a-z-]+#future-pipeline"[^>]*>Open pipeline/i);
    assert.match(card, /class="psr-action emirate-guide-link"[^>]*>Open the (?:<!-- -->)?[^<]+(?:<!-- -->)? market overview/i);
    assert.doesNotMatch(card, /class="emirate-(?:upcoming-list|project-showcase|project-card)"/i);
    assert.doesNotMatch(card, /href="\/projects\//i, "directory cards must not preview individual property projects");
  }
  assert.match(indexHtml, /aria-label="Six lenses used across the UAE Market Atlas"/i);
  assert.match(indexHtml, /aria-label="UAE strategic future pipeline navigation"/i);
  assert.match(indexHtml, /href="#uae-future-pipeline"[^>]*>Open all (?:<!-- -->)?12(?:<!-- -->)? national initiatives/i);
  assert.equal((indexHtml.match(/class="emirate-card-pipeline"/g) || []).length, 7);
  const catalystPreviews = [...indexHtml.matchAll(/<div class="emirate-card-pipeline"[\s\S]*?<\/ol><\/div>/gi)].map(([preview]) => preview);
  assert.equal(catalystPreviews.length, 7);
  for (const preview of catalystPreviews) assert.equal((preview.match(/<li>/g) || []).length, 3, "each existing emirate card should preview three economic catalysts");
  assert.doesNotMatch(indexHtml, /uae-pipeline-(?:scope-map|jurisdiction)/i, "the page must not repeat the existing emirate cards in the national pipeline");
  const nationalPipelineCards = [...indexHtml.matchAll(/<article class="emirate-pipeline-card"[\s\S]*?<\/article>/g)].map(([card]) => card);
  assert.equal(nationalPipelineCards.length, 12);
  for (const card of nationalPipelineCards) {
    assert.match(card, /<a[^>]*href="\/insights\/[a-z0-9-]+"[^>]*>Read PSR briefing/i);
    assert.doesNotMatch(card, /Official source|<a[^>]*href="https:\/\//i, "pipeline cards must route readers to PSR analysis rather than an external-source CTA");
  }
  assert.match(indexHtml, /id="uae-future-pipeline"/i);
  assert.match(indexHtml, /href="\/emirate\/ras-al-khaimah#future-pipeline"/i);
  const rakIndexCard = emirateIndexCards.find(([card]) => /id="ras-al-khaimah"/i.test(card))?.[0] || "";
  assert.match(rakIndexCard, /Wynn Al Marjan Island/i);
  assert.match(indexHtml, /Federal and cross-emirate initiatives/i);
  const nationalPipeline = indexHtml.match(/<section class="section-pad uae-pipeline-section"[\s\S]*?<\/section>/i)?.[0] || "";
  assert.doesNotMatch(nationalPipeline, /Wynn Al Marjan Island/i, "local RAK initiatives must not be duplicated into the federal pipeline");
  assert.match(indexHtml, /data-status="(?:Operating|Active programme|Phased \/ mixed|Under construction|Procurement|In development|Announced|Strategy)"/i);
  assert.match(indexHtml, /MBR Explorer asteroid-belt mission/i);
  assert.match(indexHtml, /UAE Water Security Strategy 2036/i);
  assert.match(indexHtml, /<time>[^<]+<\/time>/i);
  assert.match(indexHtml, /Market overview,[\s\S]*not a sales brochure/i);
  assert.match(indexHtml, /class="emirate-methodology-sources"/i);
  assert.equal((indexHtml.match(/class="uae-event-card"/g) || []).length, 23);
  assert.match(indexHtml, /href="\/emirate\/dubai"/i);
  assert.match(indexHtml, /href="\/emirate\/abu-dhabi"/i);
  assert.match(indexHtml, /International Property Show 2026/i);
  assert.match(indexHtml, /Abu Dhabi Finance Week 2026/i);
  assert.match(indexHtml, /International Government Communication Forum 2026/i);
  assert.match(indexHtml, /RAK Energy Summit 2026/i);
  assert.match(indexHtml, /Ajman Media Forum/i);
  assert.match(indexHtml, /First Fujairah Scientific Forum 2026/i);
  assert.match(indexHtml, /World Governments Summit 2027/i);
  assert.match(indexHtml, /https:\/\/www\.ipscongress\.com\//i);
  assert.match(indexHtml, /https:\/\/www\.adfw\.com\//i);
  assert.equal((indexHtml.match(/"@type":"Event"/g) || []).length, 23);
  assert.doesNotMatch(indexHtml, /\p{Extended_Pictographic}/u);

  for (const [path, name, descriptorPattern, projectPattern, expectedPipelineCards] of [
    ["/emirate/dubai", "Dubai", /Trade, aviation, finance, tourism and a multi-centre urban economy/i, /href="\/projects\/[^"]+"/i, 11],
    ["/emirate/abu-dhabi", "Abu Dhabi", /Capital institutions, sovereign investment, energy, culture and island destinations/i, /href="\/projects\/the-canopies-yas-point-aldar-yas-island-abu-dhabi"/i, 12],
    ["/emirate/sharjah", "Sharjah", /Industry, education, research, heritage and two-coast geography/i, /href="\/projects\/[^"]+"/i, 7],
    ["/emirate/ras-al-khaimah", "Ras Al Khaimah", /Mountains, manufacturing, ports, heritage and a fast-scaling resort economy/i, /href="\/projects\/jacob-and-co-residences-mantra-developments-al-marjan-island-rak"/i, 9],
    ["/emirate/ajman", "Ajman", /SME enterprise, port trade, maritime heritage and a compact mangrove coast/i, /href="\/projects\/[^"]+"/i, 7],
    ["/emirate/fujairah", "Fujairah", /East-coast ports, energy logistics, mountains, rail and marine tourism/i, /href="\/projects\/oceana-by-reportage-fujairah-uae"/i, 6],
    ["/emirate/umm-al-quwain", "Umm Al Quwain", /Mangroves, islands, fisheries, archaeology and a patient blue economy/i, /href="\/projects\/[^"]+"/i, 8],
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    collectInitiativeArticlePaths(html);
    assert.match(html, /data-psr-page-shell="public"/i);
    assert.match(html, /data-psr-section="emirates"/i);
    assert.equal((html.match(/class="site-header internal-header"/g) || []).length, 1);
    assert.equal((html.match(/class="site-footer"/g) || []).length, 1);
    assert.match(html, new RegExp(`${name} Market Overview: Economy, Assets and Property`, "i"));
    assert.match(html, descriptorPattern);
    assert.match(html, /What shaped it/i);
    assert.match(html, /Past/i);
    assert.match(html, /Present/i);
    assert.match(html, /Outlook/i);
    assert.match(html, /Sources before/i);
    assert.match(html, new RegExp(`aria-label="${name} market overview sections"`, "i"));
    const overviewNav = html.match(/<nav class="emirate-guide-nav"[\s\S]*?<\/nav>/i)?.[0] || "";
    const sectionIds = ["overview", "economy", "infrastructure", "culture-tourism", "energy-nature", "future-pipeline", "property", "events", "evidence"];
    const sectionLabels = ["Overview", "Economy", "Infrastructure", "Culture & tourism", "Energy & nature", "Future pipeline", "Property", "Events", "Evidence"];
    let navCursor = -1;
    let documentCursor = -1;
    for (const [index, sectionId] of sectionIds.entries()) {
      const navPosition = overviewNav.indexOf(`href="#${sectionId}"`);
      assert.ok(navPosition > navCursor, `${path} navigation must place ${sectionLabels[index]} in the shared chapter order`);
      navCursor = navPosition;
      const sectionPosition = html.indexOf(`id="${sectionId}"`);
      assert.ok(sectionPosition > documentCursor, `${path} must render ${sectionLabels[index]} in the shared chapter order`);
      documentCursor = sectionPosition;
    }
    assert.doesNotMatch(html, /Property Investment and Emirate Guide|What it was|href="#market"|href="#projects"/i);
    assert.match(html, /Place/i);
    assert.match(html, /BreadcrumbList/i);
    assert.match(html, /ItemList/i);
    assert.match(html, /Strategic future pipeline/i);
    assert.match(html, new RegExp(`aria-label="Initiative scope"[\\s\\S]*Emirates[\\s\\S]*UAE[\\s\\S]*${name}`, "i"));
    const pipelineCards = [...html.matchAll(/<article class="emirate-pipeline-card"[\s\S]*?<\/article>/g)];
    assert.equal(pipelineCards.length, expectedPipelineCards, `${path} must render every tracked strategic initiative`);
    for (const [card] of pipelineCards) {
      assert.match(card, /data-status="(?:Operating|Active programme|Phased \/ mixed|Under construction|Procurement|In development|Announced|Strategy)"/i);
      assert.match(card, /<time>[^<]+<\/time>/i);
      assert.match(card, /<a[^>]*href="\/insights\/[a-z0-9-]+"[^>]*>Read PSR briefing/i);
      assert.doesNotMatch(card, /Official source|<a[^>]*href="https:\/\//i, `${path} pipeline cards must not contain an external-source CTA`);
    }
    assert.match(html, /Property is one[\s\S]*chapter of the market/i);
    assert.match(html, new RegExp(`PSR catalogue coverage, not the total (?:<!-- -->)?${name}(?:<!-- -->)? market`, "i"));
    assert.match(html, /class="emirate-project-showcase"/i);
    assert.match(html, /class="emirate-project-card"/i);
    assert.match(html, /class="emirate-project-media"/i);
    assert.match(html, projectPattern);
    const cards = [...html.matchAll(/<article class="emirate-project-card"[\s\S]*?<\/article>/g)];
    assert.ok(cards.length >= 1, `${path} should render at least one project card`);
    for (const [card] of cards) assert.equal((card.match(/<img /g) || []).length, 1, `${path} project cards should use one bounded cover`);
    assert.doesNotMatch(html, /then emirate context images/i);
    assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
  }

  assert.equal(initiativeArticlePaths.size, 72, "73 initiative IDs must resolve to 72 internal articles, with passenger rail intentionally shared");
  for (const establishedSlug of [
    "etihad-rail-passenger-network-uae-property-impact-2026",
    "wynn-al-marjan-island-2027-resort-property-briefing",
    "guggenheim-abu-dhabi-opening-saadiyat-property-lens",
    "harry-potter-land-yas-island-confirmed-facts",
  ]) {
    assert.ok(initiativeArticlePaths.has("/insights/" + establishedSlug), establishedSlug + " must retain its established route");
  }

  for (const articlePath of initiativeArticlePaths) {
    const response = await request(articlePath);
    assert.equal(response.status, 200, articlePath + " must render");
    const html = await response.text();
    assert.ok(html.includes('rel="canonical" href="https://psrhomes.ae' + articlePath + '"'), articlePath + " must keep an exact canonical");
    assert.match(html, /class="insight-at-a-glance"/i);
    assert.match(html, /Evidence checked/i);
    assert.match(html, /<a(?=[^>]*class="insight-atlas-backlink")(?=[^>]*href="\/emirate(?:\/[a-z-]+)?#(?:uae-)?future-pipeline")[^>]*>/i, articlePath + " must link back to its Atlas pipeline");
    const sourceRegister = html.match(/<section class="article-sources"[\s\S]*?<\/section>/i)?.[0] || "";
    assert.match(sourceRegister, /Sources and verification/i);
    assert.match(sourceRegister, /<a[^>]*href="https:\/\//i, articlePath + " must expose its cited source");
    assert.match(sourceRegister, /<small>[^<]+(?:<!-- -->)?[^<]*Checked[^<]+<\/small>/i, articlePath + " must expose source publisher and checked date");
    assert.match(html, /"citation":\["https:\/\//i, articlePath + " must include citations in Article JSON-LD");
    assert.match(html, /"isPartOf":\{"@type":"CollectionPage","name":"UAE Market Atlas"/i, articlePath + " must identify its Atlas parent in JSON-LD");
  }

  const sitemapResponse = await request("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemapXml = await sitemapResponse.text();
  for (const articlePath of initiativeArticlePaths) {
    assert.ok(sitemapXml.includes("<loc>https://psrhomes.ae" + articlePath + "</loc>"), articlePath + " must appear in the sitemap");
  }

  const llmsResponse = await request("/llms.txt");
  assert.equal(llmsResponse.status, 200);
  const llmsText = await llmsResponse.text();
  const initiativeLlmsSection = llmsText.match(/## UAE Market Atlas Initiative Briefings[\s\S]*?(?=\n## Entity Notes)/i)?.[0] || "";
  const llmsInitiativePaths = [...initiativeLlmsSection.matchAll(/https:\/\/psrhomes\.ae(\/insights\/[a-z0-9-]+)/gi)].map((match) => match[1]);
  assert.equal(llmsInitiativePaths.length, 72);
  assert.equal(new Set(llmsInitiativePaths).size, 72, "llms.txt must list every initiative article once");
  for (const articlePath of initiativeArticlePaths) assert.ok(llmsInitiativePaths.includes(articlePath), articlePath + " must be discoverable in llms.txt");
});

test("renders the private administrator entry without embedding credentials", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("admin-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const page = await worker.fetch(
    new Request(`http://localhost${basePath}/admin`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Private Administration/i);
  assert.match(html, /Protected PSR administration for staff identities, access, credentials and profile records/i);
  assert.match(html, /Opening private workspace/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(html, /psr042395/i);
  assert.equal(page.headers.get("cache-control"), "private, no-store");
  assert.equal(page.headers.get("pragma"), "no-cache");
});

test("protects and renders the branded private agent workspace", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("agent-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const page = await worker.fetch(
    new Request(`http://localhost${basePath}/agent`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Private Agent Workspace/i);
  assert.match(html, /Secure PSR workspace for property research, client proposals, sales offers and project comparisons/i);
  assert.match(html, /Opening private workspace/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);

  const session = await worker.fetch(
    new Request(`http://localhost${basePath}/api/agent/session`, { headers: { accept: "application/json" } }),
    env,
    context,
  );
  assert.equal(session.status, 401);
  assert.deepEqual(await session.json(), { error: "Staff sign-in required." });

  const crm = await worker.fetch(
    new Request(`http://localhost${basePath}/api/agent/crm/overview`, { headers: { accept: "application/json" } }),
    env,
    context,
  );
  assert.equal(crm.status, 401);
  assert.deepEqual(await crm.json(), { error: "Staff sign-in required." });
});

test("renders and protects the website lead inbox", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("leads-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const page = await worker.fetch(
    new Request(`http://localhost${basePath}/leads`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Website Lead Inbox/i);
  assert.match(html, /Opening the lead inbox/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(html, /042395/i);

  const dashboard = await worker.fetch(
    new Request(`http://localhost${basePath}/api/leads/dashboard`, { headers: { accept: "application/json" } }),
    env,
    context,
  );
  assert.equal(dashboard.status, 401);
  assert.deepEqual(await dashboard.json(), { error: "Lead access code required." });
});

test("renders and protects the website analytics dashboard", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("analytics-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const page = await worker.fetch(
    new Request(`http://localhost${basePath}/analytics`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Website Analytics/i);
  assert.match(html, /Opening website intelligence/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(html, /042395/i);

  const dashboard = await worker.fetch(
    new Request(`http://localhost${basePath}/api/analytics/dashboard`, { headers: { accept: "application/json" } }),
    env,
    context,
  );
  assert.equal(dashboard.status, 401);
  assert.deepEqual(await dashboard.json(), { error: "Analytics access code required." });
});

test("serves the PSR social calendar as an isolated no-index document", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("social-calendar-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const response = await worker.fetch(
    new Request(`http://localhost${basePath}/social`, { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/html\b/i);
  assert.match(response.headers.get("x-robots-tag") || "", /noindex/i);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/i);

  const html = await response.text();
  assert.match(html, /<title>PSR Social Media Calendar \| PSR Homes<\/title>/i);
  assert.match(html, /PROPERTY\. PERSPECTIVE\. PEOPLE\./i);
  assert.match(html, /Behind Every Decision/i);
  assert.match(html, /Dubai, Built Forward/i);
  assert.equal((html.match(/class="psr-tile"/g) || []).length, 30);
  assert.equal((html.match(/<button\b[^>]*data-generated="true"[^>]*>/g) || []).length, 3);
  assert.match(html, /AI EDITORIAL CONCEPT · NOT A PROPERTY/i);
  assert.match(html, /\/social\/assets\/social-[a-f0-9]+\.(?:jpg|png)/i);
  assert.doesNotMatch(html, /data:image\/(?:jpeg|png);base64,/i);
});
