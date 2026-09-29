import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { WORLD_TOUR_PAGE_COUNT, worldTourPdfSheets, type PdfSheet } from "@/lib/world-tour/edition";

const PAGE_WIDTH = 960;
const PAGE_HEIGHT = 540;
const MARGIN_X = 48;
const MARGIN_TOP = 46;
const MARGIN_BOTTOM = 40;

const paper = rgb(0.969, 0.957, 0.933);
const ink = rgb(0.11, 0.106, 0.098);
const stone = rgb(0.435, 0.416, 0.384);

function pdfText(value: string) {
  return value
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("·", "|");
}

function wrapLine(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number) {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function renderWorldTourPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const sheets = worldTourPdfSheets();
  const maxWidth = PAGE_WIDTH - MARGIN_X * 2;

  const drawSheet = (sheet: PdfSheet, lines: string[], continued: boolean) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: paper });
    const folio = pdfText(`${sheet.section}    ${sheet.folio} / ${WORLD_TOUR_PAGE_COUNT}${continued ? "  continued" : ""}`);
    page.drawText(folio, { x: MARGIN_X, y: PAGE_HEIGHT - 28, size: 9, font, color: stone });
    page.drawText("PSR", { x: PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize("PSR", 9), y: PAGE_HEIGHT - 28, size: 9, font, color: stone });

    let y = PAGE_HEIGHT - MARGIN_TOP - 8;
    const title = pdfText(sheet.title);
    wrapLine(title, font, 22, maxWidth).forEach((line) => {
      page.drawText(line, { x: MARGIN_X, y, size: 22, font, color: ink });
      y -= 28;
    });
    y -= 6;

    const bodySize = 10;
    const leading = 13.5;
    const drawn: string[] = [];
    const remaining: string[] = [];
    let overflow = false;
    lines.forEach((line) => {
      wrapLine(line, font, bodySize, maxWidth).forEach((wrapped) => {
        if (overflow || y < MARGIN_BOTTOM) {
          overflow = true;
          remaining.push(wrapped);
          return;
        }
        page.drawText(wrapped, { x: MARGIN_X, y, size: bodySize, font, color: ink });
        drawn.push(wrapped);
        y -= leading;
      });
      if (!overflow) y -= 4;
    });
    return remaining;
  };

  sheets.forEach((sheet) => {
    let pending = sheet.lines;
    let continued = false;
    do {
      pending = drawSheet(sheet, pending, continued);
      continued = true;
    } while (pending.length);
  });

  pdf.setTitle("PSR World Tour, Singapore 2026");
  pdf.setAuthor("PSR Homes");
  pdf.setSubject("Checkpoint edition: cover, Singapore comparison and South Dubai.");
  return pdf.save();
}
