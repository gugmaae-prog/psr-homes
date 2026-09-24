import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { emirateMarketOverviews, uaeMarketOverview } from "../data/emirate-market-overviews";
import { getInsightForInitiative, insights } from "../lib/insights";

const initiativeRecords = [
  ...uaeMarketOverview.futureInitiatives,
  ...Object.values(emirateMarketOverviews).flatMap((overview) => overview.futureInitiatives),
];

const existingInitiativeArticles = new Map([
  ["uae-passenger-rail", "etihad-rail-passenger-network-uae-property-impact-2026"],
  ["wynn-rak", "wynn-al-marjan-island-2027-resort-property-briefing"],
  ["guggenheim-ad", "guggenheim-abu-dhabi-opening-saadiyat-property-lens"],
  ["harry-potter-ad", "harry-potter-land-yas-island-confirmed-facts"],
]);

const existingInitiativeSlugs = new Set(existingInitiativeArticles.values());

function normalizedHeading(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

test("every insight uses an approved editorial image", () => {
  assert.equal(insights.length, 91);
  assert.equal(new Set(insights.map((insight) => insight.slug)).size, insights.length);
  assert.ok(insights.every((insight) => (
    insight.image.startsWith("/insights/")
    || insight.image.startsWith("/emirates/editorial/")
    || /^https:\/\/(?:cdn\.opr\.ae|i\.1\.creatium\.io)\//.test(insight.image)
  )));
});

test("the Insights library can be ordered newest first", () => {
  const ordered = [...insights].sort(
    (left, right) => Date.parse(`${right.published} 12:00:00 UTC`) - Date.parse(`${left.published} 12:00:00 UTC`),
  );
  assert.ok(Date.parse(ordered[0].published) >= Date.parse(ordered.at(-1)?.published || ""));
  assert.equal(ordered[0].published, "2 September 2026");
});

test("all 72 Atlas initiatives resolve to distinct approved internal research articles", async () => {
  const initiativeIds = initiativeRecords.map(({ id }) => id);
  const initiativeNames = initiativeRecords.map(({ name }) => normalizedHeading(name));
  assert.equal(initiativeIds.length, 72);
  assert.equal(new Set(initiativeIds).size, 72, "initiative IDs must remain unique");
  assert.equal(new Set(initiativeNames).size, initiativeNames.length, "an initiative must appear in only one UAE or emirate pipeline");

  const resolved = initiativeIds.map((id) => {
    const insight = getInsightForInitiative(id);
    assert.ok(insight, `${id} must resolve to an internal /insights article`);
    return { id, insight };
  });
  const resolvedSlugs = resolved.map(({ insight }) => insight.slug);
  assert.equal(new Set(resolvedSlugs).size, 72, "each pipeline initiative must own one internal article target");

  const idsBySlug = new Map<string, string[]>();
  for (const { id, insight } of resolved) {
    idsBySlug.set(insight.slug, [...(idsBySlug.get(insight.slug) || []), id]);
  }
  const sharedArticles = [...idsBySlug.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([slug, ids]) => [slug, ids.sort()] as const);
  assert.deepEqual(sharedArticles, []);

  for (const [emirate, overview] of Object.entries(emirateMarketOverviews)) {
    const headings = [
      ...overview.pillars.flatMap((pillar) => pillar.signals.map(({ title }) => title)),
      ...overview.futureInitiatives.map(({ name }) => name),
    ].map(normalizedHeading);
    assert.equal(new Set(headings).size, headings.length, `${emirate} must not repeat a signal as a pipeline card`);
  }

  for (const [initiativeId, slug] of existingInitiativeArticles) {
    assert.equal(getInsightForInitiative(initiativeId)?.slug, slug, `${initiativeId} must reuse its established article URL`);
  }

  const initiativeArticles = [...new Map(resolved.map(({ insight }) => [insight.slug, insight])).values()];
  const generatedImagePaths = new Set<string>();
  for (const insight of initiativeArticles) {
    assert.match(insight.image, /^\/(?:insights(?:\/initiatives)?|emirates\/editorial)\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/i, `${insight.slug} must use approved local media`);
    const bytes = await readFile(new URL(`../public${insight.image}`, import.meta.url));
    assert.ok(bytes.byteLength > 0, `${insight.image} must exist and be non-empty`);
    if (existingInitiativeSlugs.has(insight.slug)) {
      assert.match(insight.image, /^\/insights\//, `${insight.slug} must retain its established editorial image`);
    } else {
      assert.equal(insight.image, `/insights/initiatives/${insight.slug}-v1.webp`, `${insight.slug} must use its own initiative image`);
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${insight.image} must be a WebP asset`);
      assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${insight.image} must be a WebP asset`);
      assert.ok(bytes.byteLength > 10_000, `${insight.image} must contain a production image rather than a placeholder`);
      generatedImagePaths.add(insight.image);
      assert.ok(insight.imageAlt?.trim(), `${insight.slug} must provide contextual image alt text`);
      assert.match(insight.imageCaption || "", /not an official project rendering or masterplan/i, `${insight.slug} must disclose the editorial image context`);
    }
  }
  assert.equal(generatedImagePaths.size, 68, "every generated initiative article must have a distinct image path");
});

test("every initiative article carries source metadata and an Atlas backlink", () => {
  const initiativeArticles = [...new Map(
    initiativeRecords.map(({ id }) => {
      const insight = getInsightForInitiative(id);
      assert.ok(insight, `${id} must resolve before metadata is checked`);
      return [insight.slug, insight] as const;
    }),
  ).values()];

  for (const insight of initiativeArticles) {
    assert.ok(insight.initiative, `${insight.slug} must carry Atlas initiative metadata`);
    assert.match(insight.initiative.atlasHref, /^\/emirate(?:\/[a-z-]+)?#(?:uae-)?future-pipeline$/, `${insight.slug} must link back to its Atlas pipeline`);
    assert.match(insight.initiative.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${insight.slug} must state when its initiative evidence was verified`);
    assert.ok(insight.initiative.status.trim(), `${insight.slug} must retain a source-linked status`);
    assert.ok(insight.initiative.timing.trim(), `${insight.slug} must retain source-linked timing`);
    assert.ok(insight.sources?.length, `${insight.slug} must cite at least one source`);
    for (const source of insight.sources || []) {
      assert.ok(source.title.trim(), `${insight.slug} source title is required`);
      assert.match(source.url, /^https:\/\//, `${insight.slug} source must be an HTTPS URL`);
      assert.ok(source.publisher?.trim(), `${insight.slug} source publisher is required`);
      assert.match(source.checkedAt || "", /^\d{4}-\d{2}-\d{2}$/, `${insight.slug} source checkedAt is required`);
    }
  }
});

test("the four established infrastructure and destination briefings retain official sources", () => {
  const expected = new Map([
    ["etihad-rail-passenger-network-uae-property-impact-2026", "corporate.etihadrail.ae"],
    ["wynn-al-marjan-island-2027-resort-property-briefing", "wynnresorts.com"],
    ["guggenheim-abu-dhabi-opening-saadiyat-property-lens", "mediaoffice.abudhabi"],
    ["harry-potter-land-yas-island-confirmed-facts", "miral.ae"],
  ]);
  expected.forEach((sourceHost, slug) => {
    const insight = insights.find((item) => item.slug === slug);
    assert.ok(insight, `${slug} must stay in the research library`);
    assert.ok(insight.image.startsWith("/insights/"));
    assert.ok(insight.sources?.some((source) => source.url.includes(sourceHost)));
  });
});
