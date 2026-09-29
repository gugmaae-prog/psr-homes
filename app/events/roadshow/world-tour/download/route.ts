import { renderWorldTourPdf } from "@/lib/world-tour/pdf";

export const dynamic = "force-dynamic";

export async function GET() {
  const pdf = await renderWorldTourPdf();
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="PSR-World-Tour-Singapore-2026.pdf"',
      "cache-control": "no-store",
    },
  });
}
