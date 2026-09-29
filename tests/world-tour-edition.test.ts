import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { decodePDFRawStream, PDFDocument, PDFRawStream } from "pdf-lib";
import { SG26_INVITATION_ACTION, SG26_INVITATION_NOTE, SG26_SESSIONS } from "../lib/sg26";
import { editionFigures, worldTourEdition, worldTourPdfSheets } from "../lib/world-tour/edition";
import { renderWorldTourPdf } from "../lib/world-tour/pdf";

function extractPdfText(pdf: PDFDocument) {
  const fragments: string[] = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    let stream = "";
    try {
      stream = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    } catch {
      continue;
    }
    for (const match of stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      fragments.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
  }
  return fragments.join(" ").replace(/\s+/g, " ");
}

test("singapore sessions share one evening record and invitation wording", () => {
  assert.deepEqual(SG26_SESSIONS.map((session) => [session.date, session.time, session.iso]), [
    ["13 November 2026", "5:00 PM onwards", "2026-11-13T17:00:00+08:00"],
    ["14 November 2026", "5:00 PM onwards", "2026-11-14T17:00:00+08:00"],
  ]);
  assert.equal(SG26_INVITATION_ACTION, "Request your invitation");
  assert.equal(SG26_INVITATION_NOTE, "Attendance is limited. Registration is subject to review and does not guarantee admission. Venue details will be shared following approval.");

  const hero = fs.readFileSync(new URL("../app/sg26/WorldTourHero.tsx", import.meta.url), "utf8");
  const registration = fs.readFileSync(new URL("../app/sg26/SingaporeRegistration.tsx", import.meta.url), "utf8");
  assert.match(hero, /SG26_SESSIONS\.map/);
  assert.doesNotMatch(hero, /5:30 PM|3:30 PM|17:30:00|15:30:00/);
  assert.match(registration, /SG26_INVITATION_NOTE/);
  assert.match(registration, /under review/);
});

test("every checkpoint figure names geography, period, unit, source and kind", () => {
  const figures = editionFigures();
  assert.ok(figures.length >= 8);
  for (const figure of figures) {
    for (const field of [figure.geography, figure.period, figure.unit, figure.source, figure.sourceUrl, figure.value, figure.kind, figure.note] as const) {
      assert.equal(typeof field, "string");
      assert.ok(field.trim(), figure.id);
    }
    assert.match(figure.sourceUrl, /^https:\/\//);
  }
  const kinds = new Set(figures.map((figure) => figure.kind));
  assert.ok(kinds.has("observed"));
  assert.ok(kinds.has("statutory"));
  assert.ok(kinds.has("announced"));
  assert.ok(kinds.has("forecast"));
});

test("the checkpoint stays invitational and does not treat asking prices as transactions", () => {
  const text = JSON.stringify(worldTourEdition);
  assert.match(text, /The UAE/);
  assert.match(text, /A more connected tomorrow/);
  assert.match(text, /PSR World Tour · Singapore 2026/);
  assert.doesNotMatch(text, /guaranteed growth|unmatched opportunities|buy now/i);
  assert.equal(worldTourEdition.southDubai.examples.length, 3);
  for (const example of worldTourEdition.southDubai.examples) {
    assert.equal(example.priceKind, "Published starting reference");
    assert.match(example.reviewed, /2026/);
  }
  assert.equal(worldTourEdition.coverImage.kind, "Photograph");
  assert.match(worldTourEdition.southDubaiImage.caption, /Photograph/);
  assert.match(worldTourEdition.southDubaiImage.caption, /not the airport programme/);
  assert.ok(worldTourEdition.comparison.acquisitionFigures.some((figure) => figure.value === "0% ABSD"));
  assert.ok(worldTourEdition.comparison.acquisitionFigures.some((figure) => figure.value === "60% ABSD"));
  assert.match(worldTourEdition.comparison.income, /gross yield is not net income/i);
});

test("the 94-page brochure route is left unchanged", () => {
  const edge = fs.readFileSync(new URL("../worker/media-edge.ts", import.meta.url), "utf8");
  assert.match(edge, /if \(pathname\.startsWith\("\/events\/roadshow\/brochure"\)\) return env\.ROADSHOW_BROCHURE;/);
  assert.doesNotMatch(edge, /world-tour/);
});

test("the downloadable pdf carries the same checkpoint sheets", async () => {
  const sheets = worldTourPdfSheets();
  assert.deepEqual(sheets.map((sheet) => sheet.folio), ["01", "07", "08", "09", "10"]);
  const pdf = await PDFDocument.load(await renderWorldTourPdf());
  assert.ok(pdf.getPageCount() >= sheets.length);
  const text = extractPdfText(pdf);
  assert.match(text, /The UAE/);
  assert.match(text, /A more connected tomorrow/);
  assert.match(text, /Request your invitation/);
  assert.match(text, /does not guarantee admission/);
  assert.match(text, /62\.2 square metres/);
  assert.match(text, /28\.1 square metres/);
  assert.match(text, /0% ABSD/);
  assert.match(text, /60% ABSD/);
  assert.match(text, /South Dubai|The airport, Expo City/);
  assert.match(text, /Published starting reference/);
  assert.match(text, /94-page research master/);
});
