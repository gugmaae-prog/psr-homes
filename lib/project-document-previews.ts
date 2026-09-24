import { withBasePath } from "@/lib/base-path";

const DOCUMENT_PREVIEWS: Record<string, string[]> = {
  "valia-dubai-creek-harbour-emaar-dubai": [
    "/project-document-previews/valia-01.webp",
    "/project-document-previews/valia-02.webp",
    "/project-document-previews/valia-03.webp",
  ],
};

export function projectDocumentPreviews(slug: string) {
  return (DOCUMENT_PREVIEWS[slug] || []).map(withBasePath);
}
