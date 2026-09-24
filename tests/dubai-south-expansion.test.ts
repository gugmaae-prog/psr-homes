import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { DUBAI_SOUTH_MAP_SLUGS, getDubaiSouthMapProjects } from "../lib/dubai-south-map";
import { getImportedProject, getProjectIndexTier, getUniqueActiveProjectRecords, projectIdentityKey } from "../lib/imported-projects";

function localAssetExists(asset: string) {
  return !asset.startsWith("/") || existsSync(resolve(process.cwd(), "public", asset.slice(1)));
}

test("publishes the researched Dubai South additions as complete project dossiers", async () => {
  const projects = await Promise.all(DUBAI_SOUTH_MAP_SLUGS.map((slug) => getImportedProject(slug)));
  projects.forEach((project, index) => {
    const slug = DUBAI_SOUTH_MAP_SLUGS[index];
    assert.ok(project, `${slug} must resolve as a project route`);
    assert.equal(getProjectIndexTier(slug), "A", `${slug} must be indexable with first-party editorial depth`);
    assert.ok(project!.gallery.length >= 3, `${slug} must have a coherent project gallery`);
    assert.ok(project!.floorplans.length >= 1, `${slug} must have a dedicated floor-plan asset`);
    assert.match(project!.coordinates, /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/);
    [...project!.gallery, ...project!.floorplans].forEach((asset) => assert.ok(localAssetExists(asset), `missing media asset ${asset}`));
  });
});

test("keeps the Dubai South map complete and the public catalogue unique", () => {
  const mapProjects = getDubaiSouthMapProjects();
  assert.deepEqual(mapProjects.map((project) => project.slug), [...DUBAI_SOUTH_MAP_SLUGS]);
  assert.equal(new Set(mapProjects.map((project) => project.slug)).size, DUBAI_SOUTH_MAP_SLUGS.length);

  const publicProjects = getUniqueActiveProjectRecords();
  assert.equal(new Set(publicProjects.map(projectIdentityKey)).size, publicProjects.length);
  DUBAI_SOUTH_MAP_SLUGS.forEach((slug) => assert.ok(publicProjects.some((project) => project.slug === slug), `${slug} must remain visible in the public catalogue`));
});
