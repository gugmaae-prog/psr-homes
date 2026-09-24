import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { brochurePdfIsReachable, createBrochureAccessToken, isBrochureAccessToken, resolveProjectBrochure, resolveProjectDocument, sha256Hex } from "../lib/brochure-access";
import { getProjectRecord, getProjectRegistry, getUniqueActiveProjectRecords, projectIdentityKey } from "../lib/imported-projects";
import { buildProjectDossierContent, PROJECT_DOSSIER_DISCLAIMER, renderProjectDossierPdf } from "../worker/project-dossier";
import rawRegistry from "../data/projects.json";

const route = fs.readFileSync(new URL("../app/api/brochures/[slug]/route.ts", import.meta.url), "utf8");
const leadsRoute = fs.readFileSync(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");
const accessComponent = fs.readFileSync(new URL("../components/ProjectDocumentAccess.tsx", import.meta.url), "utf8");
const accessCss = fs.readFileSync(new URL("../components/project-document-access.css", import.meta.url), "utf8");
const projectPage = fs.readFileSync(new URL("../app/projects/[slug]/page.tsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle-agent/0029_brochure_download_gate.sql", import.meta.url), "utf8");
const valiaData = fs.readFileSync(new URL("../data/recent-curated-launches.ts", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");

test("brochure grants use 256-bit opaque tokens and store only their hash", async () => {
  const access = await createBrochureAccessToken(Date.UTC(2026, 7, 25, 12));
  assert.match(access.token, /^[a-f0-9]{64}$/);
  assert.equal(access.tokenHash, await sha256Hex(access.token));
  assert.notEqual(access.tokenHash, access.token);
  assert.equal(access.expiresAt, "2026-08-25T12:15:00.000Z");
  assert.equal(isBrochureAccessToken(access.token), true);
  assert.equal(isBrochureAccessToken("short"), false);
});

test("full brochure delivery is project-bound, private and server-gated", () => {
  assert.match(route, /resolveProjectDocument/);
  assert.match(route, /renderProjectDossierPdf/);
  assert.doesNotMatch(route, /TRUSTED_BROCHURE_HOSTS|function brochureUrlFor/);
  assert.doesNotMatch(route, /getImportedProject/);
  assert.match(route, /searchParams\.get\("access"\)/);
  assert.match(route, /token_hash = \? AND project_slug = \?/);
  assert.match(route, /bind\(tokenHash, record\.slug\)/);
  assert.match(route, /datetime\(expires_at\) > datetime\('now'\)/);
  assert.match(route, /redirect: "manual"/);
  assert.match(route, /application\\\/pdf/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /content-disposition": `attachment/);
  assert.match(route, /referrer-policy": "no-referrer"/);
  assert.match(worker, /if \(!headers\.has\("referrer-policy"\)\) headers\.set\("referrer-policy", "strict-origin-when-cross-origin"\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `psr_brochure_downloads`/);
  assert.doesNotMatch(projectPage, /brochurePath/);
});

test("the brochure lead requires contact fields and returns only a short-lived gate URL", () => {
  assert.match(leadsRoute, /"brochure_download"/);
  assert.match(leadsRoute, /requestedDelivery === "enquiry" \|\| requestedDelivery === "brochure_download"/);
  assert.match(leadsRoute, /digits\.length >= 7 && digits\.length <= 15/);
  assert.match(leadsRoute, /brochureDownloads/);
  assert.match(leadsRoute, /resolveProjectDocument\(brochureProject\)/);
  assert.match(leadsRoute, /brochureDocument\?\.kind === "verified_brochure"/);
  assert.match(leadsRoute, /await brochurePdfIsReachable\(brochureDocument\)/);
  assert.match(leadsRoute, /brochureDownloadUrl = `\/api\/brochures\//);
  assert.ok(
    leadsRoute.indexOf("resolveProjectDocument(brochureProject)") < leadsRoute.indexOf("await db.insert(leads)"),
    "project-document eligibility must be checked before a lead is saved",
  );
  assert.match(leadsRoute, /await db\.delete\(leads\)\.where\(eq\(leads\.id, lead\.id\)\)/);
  assert.match(accessComponent, /name="email" type="email" required/);
  assert.match(accessComponent, /name="phone" type="tel" required/);
  assert.match(accessComponent, /name="consent" type="checkbox"[\s\S]*?required/);
  assert.match(accessComponent, /not a developer-issued brochure/);
  assert.match(accessComponent, /data-brochure-status=\{isDossier \? "psr-sourced" : "verified"\}/);
});

test("brochure preflight requires both a PDF response type and signature", async () => {
  const brochure = resolveProjectBrochure({ slug: "preflight-test", brochure: "https://cdn.opr.ae/brochures/example.pdf" });
  assert.ok(brochure);
  const response = (body: string, contentType: string, status = 206) => async () => new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
  assert.equal(await brochurePdfIsReachable(brochure, response("%PDF-1.7", "application/pdf")), true);
  assert.equal(await brochurePdfIsReachable(brochure, response("<html", "text/html")), false);
  assert.equal(await brochurePdfIsReachable(brochure, response("<html", "application/pdf")), false);
  assert.equal(await brochurePdfIsReachable(brochure, async () => { throw new Error("offline"); }), false);
});

test("Valia exposes reduced real page previews without exposing the 17MB PDF", () => {
  assert.match(valiaData, /valia-dubai-creek-harbour-emaar-dubai[\s\S]*?new-projects-media\.propertyfinder\.com[\s\S]*?original\.pdf/);
  for (const page of ["01", "02", "03"]) {
    const bytes = fs.readFileSync(new URL(`../public/project-document-previews/valia-${page}.webp`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(bytes.length < 100_000);
  }
  assert.match(accessComponent, /data-document-pages/);
  assert.match(accessComponent, /reduced previews of the protected project document/);
  assert.match(accessComponent, /Project photography elsewhere on this page is not presented as a brochure page/);
  assert.doesNotMatch(accessComponent, /previewImages|Project preview|Project brochure<\/small>/);
  assert.match(accessCss, /@media \(max-width: 900px\)[\s\S]*?\.brochure-access-card \{ grid-template-columns: 1fr; \}/);
});

test("brochure resolver rejects unsafe, stale and misassigned documents", () => {
  for (const brochure of [
    "https://cdn.opr.ae/brochures/example.pdf",
    "https://new-projects-media.propertyfinder.com/example.pdf",
    "https://reportagegroup.com/example.pdf",
    "https://www.rakproperties.ae/example.pdf",
  ]) {
    assert.ok(resolveProjectBrochure({ slug: "resolver-test", brochure }), brochure);
  }

  for (const brochure of [
    "http://cdn.opr.ae/brochures/example.pdf",
    "https://cdn.opr.ae.evil.example/brochures/example.pdf",
    "https://cdn.opr.ae/brochures/example.html",
    "https://user:secret@cdn.opr.ae/brochures/example.pdf",
    "https://cdn.opr.ae:444/brochures/example.pdf",
    "https://cdn.opr.ae/brochures/example.pdf?download=1",
    "not a URL",
  ]) {
    assert.equal(resolveProjectBrochure({ slug: "resolver-test", brochure }), null, brochure);
  }

  assert.equal(resolveProjectBrochure({
    slug: "oceano-al-marjan-island-in-ras-al-khaimah-uae-for-sale",
    brochure: "https://cdn.opr.ae/brochures/oceana.pdf",
  }), null);
  assert.ok(resolveProjectBrochure({
    slug: "nshama-the-mayfair-town-square-dubai-apartments-for-sale",
    brochure: "https://cdn.opr.ae/brochures/nshama-the-mayfair.pdf",
  }));
  assert.equal(resolveProjectBrochure({
    slug: "binghatti-billionaire-residences-for-sale-in-business-bay-dubai",
    brochure: "https://cdn.opr.ae/brochures/nshama-the-mayfair.pdf",
  }), null);
});

test("every advertised active brochure is resolved centrally and shared PDFs are explicit", () => {
  const active = getUniqueActiveProjectRecords(getProjectRegistry().projects);
  const ready = active.flatMap((project) => {
    const brochure = resolveProjectBrochure(project);
    return brochure ? [{ project, brochure }] : [];
  });
  assert.ok(ready.length >= 884, `expected at least 884 ready brochures, received ${ready.length}`);
  assert.equal(new Set(ready.map(({ project }) => project.slug)).size, ready.length);
  assert.deepEqual(active.filter((project) => project.brochure && !resolveProjectBrochure(project)), []);

  const byUrl = new Map<string, typeof ready>();
  for (const row of ready) byUrl.set(row.brochure.href, [...(byUrl.get(row.brochure.href) || []), row]);
  for (const [href, rows] of byUrl) {
    if (rows.length < 2) continue;
    const ids = new Set(rows.map(({ brochure }) => brochure.sharedDocumentId));
    const scopes = new Set(rows.map(({ brochure }) => brochure.scope));
    assert.equal(ids.size, 1, `${href} must use one shared document id`);
    assert.ok(rows[0].brochure.sharedDocumentId, `${href} must be explicitly declared as shared`);
    assert.equal(scopes.size, 1, `${href} must use one document scope`);
  }

  const bySharedId = new Map<string, typeof ready>();
  for (const row of ready) {
    if (!row.brochure.sharedDocumentId) continue;
    bySharedId.set(row.brochure.sharedDocumentId, [...(bySharedId.get(row.brochure.sharedDocumentId) || []), row]);
  }
  for (const [id, rows] of bySharedId) {
    assert.ok(rows.length > 1, `${id} must represent more than one project`);
    assert.equal(new Set(rows.map(({ brochure }) => brochure.href)).size, 1, `${id} must represent one PDF`);
  }
});

test("every unique active project has one honest downloadable document", () => {
  const active = getUniqueActiveProjectRecords(getProjectRegistry().projects);
  const documents = active.map((project) => ({ project, document: resolveProjectDocument(project) }));
  assert.equal(active.length, 1_073);
  assert.ok(documents.every(({ document }) => document));
  assert.equal(new Set(active.map(projectIdentityKey)).size, active.length, "public project identities must not repeat");
  assert.equal(new Set(active.map((project) => project.slug)).size, active.length, "public project slugs must not repeat");

  const verifiedBrochures = documents.filter(({ document }) => document?.kind === "verified_brochure");
  const sourcedDossiers = documents.filter(({ document }) => document?.kind === "psr_dossier");
  assert.ok(verifiedBrochures.length >= 884, `expected at least 884 verified brochure assignments, received ${verifiedBrochures.length}`);
  assert.equal(sourcedDossiers.length, active.length - verifiedBrochures.length);
  for (const { project } of sourcedDossiers) {
    const content = buildProjectDossierContent(project, new Date("2026-09-06T00:00:00.000Z"));
    const source = new URL(content.source.url);
    assert.equal(source.protocol, "https:", project.slug);
    assert.notEqual(content.source.recordDate, "Date not supplied by the source record", project.slug);
    assert.equal(content.disclaimer, PROJECT_DOSSIER_DISCLAIMER);
  }
});

test("archived projects do not receive generated dossiers", () => {
  const archived = getProjectRegistry().projects.find((project) => project.archived && !resolveProjectBrochure(project));
  assert.ok(archived);
  assert.equal(resolveProjectDocument(archived), null);
});

test("PSR dossier PDF is a two-page sourced document with explicit metadata", async () => {
  const project = getProjectRecord("nawayef-village-modon-hudayriyat-island-abu-dhabi");
  assert.ok(project);
  assert.equal(resolveProjectDocument(project)?.kind, "psr_dossier");
  const bytes = await renderProjectDossierPdf(project, new Date("2026-09-06T00:00:00.000Z"));
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.equal(pdf.getTitle(), `${project.name} | PSR sourced project dossier`);
  assert.equal(pdf.getAuthor(), "PSR Homes Real Estate LLC");
});

test("PSR dossiers keep source provenance honest and date stale commercial values", () => {
  const preparedAt = new Date("2026-09-06T00:00:00.000Z");
  const unsafeSources = new Map([
    ["sofitel-downtown-refine-downtown-dubai-uae", "upstream_unpublished"],
    ["treppan-living-by-fakhruddin-properties-on-dubai-islands", "identity_mismatch"],
    ["passo-beyond-palm-jumeirah-dubai", "scope_mismatch"],
  ]);
  for (const [slug, status] of unsafeSources) {
    const project = getProjectRecord(slug);
    assert.ok(project, slug);
    const content = buildProjectDossierContent(project, preparedAt);
    assert.equal(content.source.type, "psr_catalogue_snapshot", slug);
    assert.equal(content.source.status, status, slug);
    assert.match(content.source.url, new RegExp(`^https://psrhomes\\.ae/projects/${slug}$`), slug);
    assert.doesNotMatch(content.source.label, /original source/i, slug);
  }

  const arya = getProjectRecord("arya-residences-citi-developers-dubai-islands");
  assert.ok(arya);
  const aryaSource = buildProjectDossierContent(arya, preparedAt).source;
  assert.equal(aryaSource.status, "verified_redirect");
  assert.equal(aryaSource.url, "https://opr.ae/projects/arya-residences-dubai-islands");

  const officialOverride = getProjectRecord("emaar-elie-saab-villas-in-dubai-hills-estate");
  assert.ok(officialOverride);
  const officialSource = buildProjectDossierContent(officialOverride, preparedAt).source;
  assert.equal(officialSource.type, "stored_project_source");
  assert.equal(officialSource.url, "https://www.emaar.com/en/properties/palm-hills");

  for (const slug of [
    "ellington-villa-townhouse-community-al-yalayis-dubai",
    "avenue-park-towers-ii-wasl-1-al-kifaf-dubai",
    "ifa-group-townhouses-by-ifa-group-in-sharjah",
    "binghatti-laquatique-by-binghatti-developers-in-business-bay",
  ]) {
    const project = getProjectRecord(slug);
    assert.ok(project, slug);
    assert.equal(buildProjectDossierContent(project, preparedAt).startingPrice, "Available on request", slug);
  }

  const stale = getProjectRecord("arya-residences-citi-developers-dubai-islands");
  assert.ok(stale);
  const staleContent = buildProjectDossierContent(stale, preparedAt);
  assert.match(staleContent.startingPrice, /recorded 07 Nov 2025; reconfirm/);
  assert.match(staleContent.paymentPlan, /recorded 07 Nov 2025; reconfirm/);
  assert.match(staleContent.handover, /recorded 07 Nov 2025; reconfirm/);
});

test("stale and unrelated source assignments are removed from the public project registry", () => {
  const rejectedSlugs = [
    "azizi-aura-downtown-jebel-ali-apartments-for-sale-in-dubai",
    "bali-damac-islands-dubailand-dubai",
    "binghatti-billionaire-residences-for-sale-in-business-bay-dubai",
    "binghatti-canal-apartments-for-sale-in-business-bay-dubai",
    "binghatti-platinum-in-dubai-silicon-oasis-apartments-for-sale",
    "bora-bora-damac-islands-dubailand-dubai",
    "city-walk-crest-lane-2-downtown-dubai",
    "damac-cavalli-tower-apartments-for-sale-in-dubai-marina",
    "ellington-belgravia-3-apartments-dubai",
    "ellington-eaton-place-dubai",
    "emaar-anya-2-townhouses-in-arabian-ranches-3-dubai",
    "emaar-anya-townhouses-in-arabian-ranches-3-dubai-for-sale",
    "emaar-dubai-hills-views-villas-and-plots",
    "emaar-golf-grand-apartments-in-dubai-hills-estate-for-sale",
    "emaar-golfville-apartments-in-dubai-hills-estate",
    "emaar-palace-residences-dubai-creek-harbour",
    "fiji-damac-islands-dubailand-dubai",
    "granada-villas-mina-by-rak-properties-ras-al-khaimah-uae",
    "nshama-noor-townhouses-for-sale-in-town-square-dubai",
    "oceano-al-marjan-island-in-ras-al-khaimah-uae-for-sale",
    "rak-properties-flamingo-villas-in-mina-for-sale-ras-al-khaimah-uae",
    "terra-golf-collection-phase-2-jumeirah-golf-estates",
    "tilal-binghatti-dunes-villas-academic-city-dubai",
    "villa-plots-for-sale-in-sobha-hartland-dubai",
  ];
  for (const slug of rejectedSlugs) {
    const source = rawRegistry.projects.find((project) => project.slug === slug);
    assert.ok(source?.brochure, `${slug} should retain its audited source assignment`);
    assert.equal(resolveProjectBrochure(source), null, `${slug} source assignment must remain blocked`);
    assert.equal(getProjectRecord(slug)?.brochure, "", `${slug} must not advertise a brochure publicly`);
  }
});

test("restored and official-host brochures are ready with honest document scope", () => {
  const expectations = new Map([
    ["arancia-yards-beyond-city-of-arabia-dubai", "project"],
    ["nawayef-park-views-modon-properties-hudayriyat-island-abu-dhabi", "project"],
    ["jacob-and-co-residences-mantra-developments-al-marjan-island-rak", "project"],
    ["bashayer-final-phase-modon-hudayriyat-island-abu-dhabi", "community"],
    ["valencia-apartments-damac-lagoons-dubai", "collection"],
    ["oceana-by-reportage-fujairah-uae", "project"],
    ["edge-rak-properties-raha-island-mina-ras-al-khaimah", "project"],
    ["113-residences-iman-developers-al-sufouh-dubai", "project"],
    ["binghatti-wraith-al-jaddaf-dubai", "project"],
    ["golf-trails-emaar-emaar-south-dubai", "project"],
    ["the-canopies-yas-point-aldar-yas-island-abu-dhabi", "project"],
    ["oceano-al-marjan-island-in-ras-al-khaimah-uae-for-sale", "project"],
    ["emaar-anya-townhouses-in-arabian-ranches-3-dubai-for-sale", "project"],
    ["emaar-anya-2-townhouses-in-arabian-ranches-3-dubai", "project"],
    ["emaar-golf-grand-apartments-in-dubai-hills-estate-for-sale", "project"],
    ["nawayef-east-modon-hudayriyat-island-abu-dhabi", "collection"],
  ]);
  for (const [slug, scope] of expectations) {
    const project = getProjectRecord(slug);
    assert.ok(project, slug);
    const brochure = resolveProjectBrochure(project);
    assert.ok(brochure, `${slug} should have a ready brochure`);
    assert.equal(brochure.scope, scope, slug);
  }
  assert.match(projectPage, /resolveProjectDocument\(projectRecord\)/);
  assert.doesNotMatch(projectPage, /project\.brochure && <a href="#project-documents"/);
});
