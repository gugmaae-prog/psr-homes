import assert from "node:assert/strict";
import test from "node:test";
import { mediaRouteForSource, rewriteExternalMediaUrls, sourceFromMediaPath } from "../worker/media-edge";

test("known migrated sources resolve to their existing short R2 route", () => {
  const source = "https://i.1.creatium.io/22/92/ee/1be3cd6949890131c270c664a412207de4/header.jpg";
  assert.equal(mediaRouteForSource(source), "/media/external/0004e0b73d9f479b");
  assert.equal(sourceFromMediaPath("/media/external/0004e0b73d9f479b"), source);
});

test("unmigrated trusted images receive a reversible write-through route", () => {
  const source = "https://www.modon.com/images/example/home.webp?sfvrsn=one";
  const route = mediaRouteForSource(source);
  assert.match(route, /^\/media\/external\/source\/[A-Za-z0-9_-]+$/);
  assert.equal(sourceFromMediaPath(route), source);
});

test("response rewriting changes approved image sources and leaves unrelated links alone", () => {
  const known = "https://i.1.creatium.io/22/92/ee/1be3cd6949890131c270c664a412207de4/header.jpg";
  const missing = "https://reportagegroup.com/wp-content/uploads/project.webp";
  const pdf = "https://cdn.opr.ae/upload/brochure/project.pdf";
  const untrusted = "https://example.com/photo.jpg";
  const result = rewriteExternalMediaUrls(`<img src="${known}"><img src="${missing}"><a href="${pdf}">PDF</a><img src="${untrusted}">`);
  assert.match(result, /src="\/media\/external\/0004e0b73d9f479b"/);
  assert.match(result, /src="\/media\/external\/source\/[A-Za-z0-9_-]+"/);
  assert.match(result, new RegExp(pdf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(result, new RegExp(untrusted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("the established insight URLs keep their dedicated R2 routes", () => {
  assert.equal(
    mediaRouteForSource("https://cdn.opr.ae/upload/photo/10.jpeg"),
    "/media/insights/price-per-square-foot-uae-property-guide-2026",
  );
});

test("the roadshow CDN image resolves to its existing R2 object", () => {
  assert.equal(
    mediaRouteForSource("https://cdn.opr.ae/upload/photo/Palm%20Jebl%20Ali%20Apartments%206.jpg"),
    "/media/external/c3455c4dc268b979",
  );
});

test("escaped response URLs are normalized before they are rewritten", () => {
  const source = "https:\\/\\/i.1.creatium.io\\/22\\/92\\/ee\\/1be3cd6949890131c270c664a412207de4\\/header.jpg";
  assert.equal(rewriteExternalMediaUrls(`{\"image\":\"${source}\"}`), '{"image":"/media/external/0004e0b73d9f479b"}');
});

test("unrelated JSON escapes remain byte-for-byte unchanged", () => {
  const source = '{"internal":"https:\\/\\/psrhomes.ae\\/brand\\/psr-logo-light.png","label":"A\\u0026B"}';
  assert.equal(rewriteExternalMediaUrls(source), source);
});

test("untrusted hosts and malformed source tokens never become proxy targets", () => {
  assert.equal(mediaRouteForSource("https://example.com/photo.webp"), "");
  assert.equal(sourceFromMediaPath("/media/external/source/not-a-valid-source"), "");
});
