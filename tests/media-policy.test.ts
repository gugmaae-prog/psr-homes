import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { curatedCommunityGuides } from "../data/curated-communities";
import { getImportedProject, getProjectIndexTier, getProjectRecord } from "../lib/imported-projects";
import {
  DEFAULT_PROPERTY_PHOTO,
  filterPhotographyAssets,
  isConfirmedTextHeavyPhoto,
  isPhotographyAsset,
  selectPhotographyAsset,
} from "../lib/media-policy";
import { getCommunityDirectory } from "../lib/taxonomy";

const natuzziWordmark = "https://img3.creatium.ru/disk2/bb/e9/5a/0ade44b2d081260e297e405d7dcbd67960/natuzzi_harmony_homes_by_phd_exterior_3.jpg";
const doubleTreeWordmark = "https://img1.creatium.ru/disk2/43/c7/e6/5867dfcb39fa7d0f7368ffc223ae05fac1/doubletree_jgc_factsheet_v5_250508_140305_0_upscayl_2x_reale.jpg";
const labelledPlayroom = "https://img3.creatium.ru/disk2/96/db/cd/024acc973cac543d5c4281cbad04ca519d/34.jpg";
const flaggedDoubleTreeExterior = "https://img1.creatium.ru/disk2/ae/3c/3a/4708dece13b622e7be910198e508579394/doubletree_jgc_factsheet_v5_250508_140305_1_upscayl_2x_reale.jpg";
const cleanDoubleTreeExterior = "https://img1.creatium.ru/disk2/eb/2a/22/4ba6a1ed668154efeb2c0189880f7991a2/doubletree_jgc_factsheet_v5_250508_140305_12_upscayl_2x_real.jpg";
const cleanBrochureFrame = "https://img3.creatium.ru/disk2/bc/50/c9/af650daa76b41102cd4b8754ea245e8a49/golf_trails_brochure_03_pdf_image_009.jpg";

test("photographic placements reject confirmed text-heavy media and document artwork", () => {
  for (const url of [natuzziWordmark, doubleTreeWordmark, flaggedDoubleTreeExterior, labelledPlayroom]) {
    assert.equal(isConfirmedTextHeavyPhoto(url), true, url);
    assert.equal(isPhotographyAsset(url), false, url);
  }
  assert.equal(isPhotographyAsset("https://cdn.opr.ae/project/payment-plan.png"), false);
  assert.equal(isPhotographyAsset("https://cdn.opr.ae/project/location-map.jpg"), false);
  assert.equal(isPhotographyAsset("https://cdn.opr.ae/project/floor_plan_1.webp"), false);
  assert.equal(isPhotographyAsset("https://cdn.opr.ae/project/qr-code.jpg"), false);
});

test("clean architectural frames remain available even when extracted from a factsheet or brochure", () => {
  assert.equal(isPhotographyAsset(cleanDoubleTreeExterior), true);
  assert.equal(isPhotographyAsset(cleanBrochureFrame), true);
  assert.deepEqual(filterPhotographyAssets([doubleTreeWordmark, cleanDoubleTreeExterior, cleanDoubleTreeExterior]), [cleanDoubleTreeExterior]);
  assert.equal(selectPhotographyAsset(doubleTreeWordmark, [cleanDoubleTreeExterior]), cleanDoubleTreeExterior);
  assert.equal(selectPhotographyAsset("https://cdn.opr.ae/project/siteplan.jpg"), DEFAULT_PROPERTY_PHOTO);
});

test("curated project output excludes pixel-embedded text while retaining floor plans separately", async () => {
  const residences = await getImportedProject("113-residences-iman-developers-al-sufouh-dubai");
  assert.ok(residences);
  assert.equal(residences.gallery.includes(labelledPlayroom), false);
  assert.equal(residences.interiors.includes(labelledPlayroom), false);
  assert.ok(residences.floorplans.length >= 1);

  const doubleTree = await getImportedProject("doubletree-hilton-residences-jumeirah-garden-city-dubai");
  assert.ok(doubleTree);
  assert.equal(doubleTree.hero, cleanDoubleTreeExterior);
  assert.equal(doubleTree.gallery.includes(doubleTreeWordmark), false);
  assert.equal(getProjectRecord(doubleTree.slug)?.image, cleanDoubleTreeExterior);
});

test("new official project records preserve availability status and source provenance", async () => {
  const arancia = await getImportedProject("arancia-yards-beyond-city-of-arabia-dubai");
  assert.ok(arancia);
  assert.equal(arancia.handover, "Q4 2029");
  assert.equal(arancia.price, "Price on request");
  assert.match(arancia.sourceUrl || "", /beyonddevelopments\.ae/);
  assert.equal(getProjectIndexTier(arancia.slug), "A");

  const tara = await getImportedProject("tara-park-modon-reem-island-abu-dhabi");
  assert.ok(tara);
  assert.match(tara.statusLabel || "", /sold out/i);
  assert.match(tara.releaseNote || "", /not current resale values/i);
  assert.equal(getProjectIndexTier(tara.slug), "A");
});

test("community directory and detail heroes reject imported brokerage-branded media", () => {
  const communities = getCommunityDirectory();
  assert.ok(communities.length > 0);
  assert.deepEqual(
    communities.filter((community) => /(?:cdn\.opr\.ae|creatium\.(?:io|ru)|metropolitan)/i.test(community.image)),
    [],
  );
  for (const slug of [
    "al-furjan",
    "al-jaddaf",
    "al-wasl",
    "bluewaters-island",
    "burj-khalifa-district",
    "dubai-marina",
    "palm-jumeirah",
  ]) {
    const community = communities.find((entry) => entry.slug === slug);
    assert.ok(community, slug);
    assert.match(community.image, /^\/(?:insights|hero)\/|^\/about-jumeirah-burj-banner\.webp$/, slug);
  }
});

test("curated community guides use local imagery and source-backed records", () => {
  assert.equal(curatedCommunityGuides.length, 20);
  assert.equal(new Set(curatedCommunityGuides.map((community) => community.slug)).size, curatedCommunityGuides.length);
  for (const community of curatedCommunityGuides) {
    assert.match(community.image, /^\/(?:insights|hero)\//, community.slug);
    assert.equal(existsSync(new URL(`../public${community.image}`, import.meta.url)), true, community.image);
    assert.match(community.sourceUrl, /^https:\/\//, community.sourceUrl);
    assert.equal(community.verifiedAt, "2026-09-05");
  }
});
