import photoQualityReview from "@/data/photo-quality-review.json";

const presentationPhotos: Readonly<Record<string, string>> = photoQualityReview.presentationPhotos;

/** Replace only the reviewed presentation photos; keep plans and documents intact. */
export function reviewedPresentationPhoto(source: string): string {
  return presentationPhotos[source] ?? source;
}
