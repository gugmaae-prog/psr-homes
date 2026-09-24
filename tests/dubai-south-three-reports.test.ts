import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const data = JSON.parse(readFileSync(resolve(root, "data/dubai-south-investor-review-2026-09-08.json"), "utf8"));
const scenes = JSON.parse(readFileSync(resolve(root, "data/dubai-south-review-slides.json"), "utf8"));

test("three independent all-inclusive routes reconcile to the client budget", () => {
  assert.deepEqual(data.reports.map((r: { id: string }) => r.id), ["ready", "under", "above"]);
  assert.equal(data.projects.length, 13);
  for (const p of data.projects) {
    const total = p.price + p.fees.reduce((sum: number, f: { amount: number }) => sum + f.amount, 0);
    if (p.category === "ready") {
      assert.ok(total + p.area * p.serviceRate <= 1_200_000, p.name);
      assert.ok(p.rentLow > 0 && p.rentHigh >= p.rentLow, p.name);
    } else {
      assert.ok(p.category === "under" ? total < 1_700_000 : total > 1_700_000 && total <= 1_850_000, p.name);
      assert.match(p.status, /^Off-Plan \(Under Construction\)/);
      assert.equal(p.rentLow, undefined);
      assert.equal(p.rentHigh, undefined);
    }
    assert.ok(Math.abs(p.schedule.reduce((sum: number, r: { percent: number }) => sum + r.percent, 0) - 100) < 0.001, p.name);
    const scheduled = p.schedule.reduce((sum: number, r: { amount?: number; percent: number }) => sum + (r.amount ?? Math.round(p.price * r.percent) / 100), 0);
    assert.ok(Math.abs(scheduled - p.price) < 1, p.name);
    assert.equal(p.fees.find((f: { label: string }) => f.label.startsWith("DLD")).amount, Math.round(p.price * 4) / 100);
  }
});

test("resale schedules stay unallocated and allowances are visible", () => {
  for (const p of data.projects.filter((p: { status: string }) => p.status.includes("Resale"))) {
    assert.equal(p.schedule.length, 1);
    assert.equal(p.schedule[0].stage, "unallocated");
    assert.match(p.planNote, /seller equity|seller.*paid/i);
    assert.ok(p.fees.some((f: { estimate: boolean }) => f.estimate));
  }
});

test("each report ends with recommendations and only the cover includes Jumanah", () => {
  for (const report of scenes.reports) {
    const pages = scenes.slides.filter((s: { group: string }) => s.group === report.id);
    assert.equal(pages.at(-1).kind, "recommendations");
    assert.equal(pages.length, report.pageCount);
    assert.ok(report.projects.every((p: { allIn: number }, i: number) => !i || p.allIn >= report.projects[i-1].allIn));
    const portraits = pages.flatMap((p: { kind: string; elements: Array<{ type: string; src?: string }> }) => p.elements.filter(e => e.type === "image" && e.src?.includes("/advisor/jumanah")).map(() => p.kind));
    assert.deepEqual(portraits, ["cover"]);
    const text = pages.flatMap((p: { elements: Array<{ type: string; text?: string }> }) => p.elements.filter(e => e.type === "text").map(e => e.text)).join(" ");
    assert.doesNotMatch(text, /\b(cash|desk|risk)\b/i);
    if (report.id !== "ready") assert.doesNotMatch(text, /\bROI\b|rental yield|annual rent range/i);
  }
});

test("project media is real, locally resolvable and floorplans are qualified", () => {
  for (const p of data.projects) {
    assert.ok(p.media.hero && p.media.exteriors.length && p.media.interiors.length && p.media.floorplans.length, p.name);
    for (const src of [p.media.hero, ...p.media.exteriors, ...p.media.interiors, ...p.media.floorplans]) assert.ok(existsSync(resolve(root, "public", src.replace(/^\//, ""))), src);
    assert.ok(p.floorplanNote.length > 20);
    assert.ok(p.sources.every((s: { url: string }) => s.url.startsWith("https://")));
  }
});
