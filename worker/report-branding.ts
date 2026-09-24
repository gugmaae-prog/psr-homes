import { type PDFDocument, type PDFImage } from "pdf-lib";
import { cbaCompany } from "../data/cba-company";

export const PSR_REPORT_LOGO_PATH = "/brand/psr-logo.png";
export const PSR_REPORT_COMPANY = {
  legalName: cbaCompany.legalName,
  displayName: cbaCompany.displayName,
  website: "www.psrhomes.ae",
  email: cbaCompany.email,
  phone: cbaCompany.phone,
  address: cbaCompany.addressLines.join(", "),
  orn: cbaCompany.orn,
} as const;

type ReportBrandEnv = {
  ASSETS?: Fetcher;
};

/** Embed the canonical transparent PSR lockup from the Worker asset binding. */
export async function embedPsrReportLogo(pdf: PDFDocument, env: ReportBrandEnv): Promise<PDFImage | null> {
  if (!env.ASSETS) return null;
  try {
    const response = await env.ASSETS.fetch(new Request(`https://psrhomes.ae${PSR_REPORT_LOGO_PATH}`));
    if (!response.ok) return null;
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > 4_000_000) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > 4_000_000) return null;
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}
