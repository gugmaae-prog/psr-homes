import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import review from "../data/photo-quality-review.json";
import { DeveloperImage } from "../components/DeveloperImage";
import { getDeveloperDirectory } from "../lib/taxonomy";
import { getImportedProject, getProjectRecord } from "../lib/imported-projects";
import { isPhotographyAsset, organizeProjectMedia } from "../lib/media-policy";
import { handleContentRequest } from "../worker/content-sync";
import { reviewedPresentationPhoto } from "../lib/reviewed-presentation-media";

test("homepage developer cards render eight distinct reviewed project photos", () => {
  const developers = getDeveloperDirectory().slice(0, 8);
  const hashes = developers.map((developer) => {
    assert.match(developer.image, /^\/media-reviewed\//);
    const file = new URL(`../public${developer.image}`, import.meta.url);
    const markup = renderToStaticMarkup(createElement(DeveloperImage, { src: developer.image, alt: developer.name }));
    assert.ok(markup.includes(`src="${developer.image}"`), developer.name);
    return createHash("sha256").update(readFileSync(file)).digest("hex");
  });
  assert.equal(new Set(hashes).size, 8);
});

test("reviewed developer replacements are clean local assets on both directory and detail data", () => {
  const developers = getDeveloperDirectory();
  for (const [slug, image] of Object.entries(review.developers)) {
    const developer = developers.find((entry) => entry.slug === slug);
    assert.ok(developer, slug);
    assert.equal(developer.image, image, slug);
    assert.equal(developer.thumbnail, image, slug);
    assert.equal(isPhotographyAsset(image), true, image);
    assert.equal(existsSync(new URL(`../public${image}`, import.meta.url)), true, image);
  }
  for (const old of review.rejectedPhotos) {
    assert.equal(isPhotographyAsset(old), false, old);
    assert.ok(developers.every((entry) => entry.image !== old && entry.thumbnail !== old), old);
  }
});

test("project replacements survive source timeouts and leave no reviewed old photos in galleries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 503 });
  try {
    for (const [slug, replacements] of Object.entries(review.projects)) {
      const project = await getImportedProject(slug);
      assert.ok(project, slug);
      const photos = [project.hero, ...project.gallery, ...project.exteriors, ...project.interiors];
      const source = getProjectRecord(slug);
      assert.ok(source, slug);
      for (const [old, replacement] of Object.entries(replacements)) {
        assert.ok(!photos.includes(old), `${slug}: ${old}`);
        assert.notEqual(source.image, old, `${slug}: catalogue hero`);
        if (replacement) {
          assert.equal(isPhotographyAsset(replacement), true, replacement);
          assert.equal(existsSync(new URL(`../public${replacement}`, import.meta.url)), true, replacement);
        }
      }
      assert.ok(photos.every(isPhotographyAsset), slug);
      assert.equal(new Set(project.gallery).size, project.gallery.length, slug);
      const roles = (review.projectPhotoRoles as Record<string, Record<string, string>>)[slug] || {};
      for (const [url, role] of Object.entries(roles)) {
        assert.ok(project[role as "interiors" | "exteriors"].includes(url), `${slug}: ${role}`);
        assert.ok(!project[role === "interiors" ? "exteriors" : "interiors"].includes(url), `${slug}: incorrect photo category`);
      }
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("presentation photos resolve to the approved assets while layouts remain intact", () => {
  for (const [old, replacement] of Object.entries(review.presentationPhotos)) {
    assert.equal(reviewedPresentationPhoto(old), replacement);
    assert.ok(existsSync(new URL(`../public${replacement}`, import.meta.url)));
  }
  const plan = "/presentations/dubai-south/floorplan.jpg";
  assert.equal(reviewedPresentationPhoto(plan), plan);
});

test("misfiled floorplans remain available in the floorplan collection and are excluded from all photo tabs", () => {
  const clean = "/projects/radisson-residences-al-reem/hero.jpg";
  const media = organizeProjectMedia({ gallery: [clean, ...review.floorplanPhotos], interiors: review.floorplanPhotos, exteriors: review.floorplanPhotos, floorplans: [] });
  assert.deepEqual(media.gallery, [clean]);
  assert.deepEqual(media.interiors, []);
  assert.deepEqual(media.exteriors, []);
  assert.deepEqual(media.floorplans, review.floorplanPhotos);
});

test("the public project-update API repairs saved misfiled media before returning it", async () => {
  const clean = "https://cdn.opr.ae/upload/photo/Al-Ghadeer-Parks.jpg";
  const plans = review.floorplanPhotos.slice(0, 3);
  const row = { slug: "al-ghadeer-parks-aldar-seih-al-sedeirah", name: "Al Ghadeer Parks", developer: "Aldar", emirate: "Abu Dhabi", area: "Seih Al Sedeirah", starting_price: 1_000_000, payment_plan: "40/60", handover: "Q4 2029", image_url: clean, media_json: JSON.stringify({ gallery: [clean, ...plans], floorplans: [] }), bedrooms_json: "[]", property_types_json: "[]", summary: "Project", discovered_at: "2026-09-12" };
  const env = { DB: { prepare: () => ({ all: async () => ({ results: [row] }) }) } } as never;
  const response = await handleContentRequest(new Request("https://psrhomes.ae/api/project-updates"), env, {} as never);
  const payload = await response!.json() as { projects: Array<{ gallery: string[]; floorplans: string[] }> };
  assert.deepEqual(payload.projects[0].gallery, [clean]);
  assert.deepEqual(payload.projects[0].floorplans, plans);
});
