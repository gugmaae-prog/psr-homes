import photoReview from "@/data/photo-quality-review.json";

export const DEFAULT_PROPERTY_PHOTO = "/about-jumeirah-burj-banner.webp";

const confirmedTextHeavyPhotos = new Set([
  ...photoReview.rejectedPhotos,
  // Project and hospitality wordmarks are burned into these exterior renders.
  "https://img3.creatium.ru/disk2/bb/e9/5a/0ade44b2d081260e297e405d7dcbd67960/natuzzi_harmony_homes_by_phd_exterior_3.jpg",
  "https://img1.creatium.ru/disk2/7c/16/7b/88f593a8de104825ff2a7840d70dd886ba/doubletree.jpg",
  "https://img1.creatium.ru/disk2/43/c7/e6/5867dfcb39fa7d0f7368ffc223ae05fac1/doubletree_jgc_factsheet_v5_250508_140305_0_upscayl_2x_reale.jpg",
  "https://img1.creatium.ru/disk2/ae/3c/3a/4708dece13b622e7be910198e508579394/doubletree_jgc_factsheet_v5_250508_140305_1_upscayl_2x_reale.jpg",
  // This room render uses multiple large shop and room labels as wall graphics.
  "https://img3.creatium.ru/disk2/96/db/cd/024acc973cac543d5c4281cbad04ca519d/34.jpg",
  // Conservative OCR review: these frames contain branding, signage or enough
  // text-like artwork to make them unsuitable for an editorial photo slot.
  "https://img3.creatium.ru/disk2/1d/1e/9b/db503a93c9e6aae316d38ffb36504a5491/peace_lagoons_roof_top_7.jpg",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ECcGtzNwgS4M89qiK1xeZ8PoGw/hf_20260730_172204_0d40bff0-3441-4125-8e0f-6f85a39f2688.png",
  "https://img3.creatium.ru/disk2/dd/a3/14/19d25feb549f263fd8e9363cdf12bb85c4/azizi.jpg",
  "https://binghattiweb.imgix.net/binghatti-wraith-amenities-3.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-exterior-2.webp",
  "https://img1.creatium.ru/disk2/d3/82/22/f78052a14f1e0979305ad28973c4b34a60/jacob_co_residences_8.jpg",
  "https://img3.creatium.ru/disk2/50/0a/7b/ed2123b9e741c2f39aecb28dc685422e14/12.jpg",
  "https://img3.creatium.ru/disk2/af/a0/3a/bdb81f0a41cc28ba38d69f5b285f225f27/golf_trails_brochure_03_pdf_image_021.jpg",
  "https://new-projects-media.propertyfinder.com/project/db8e847b-cc0c-4f2d-a981-593df806b2db/gallery/image/kbP1yNXuC3QJJ4azQvBquoomh_xXTSUVNpj451hdXzc=/original.webp",
]);

const documentOrArtworkPattern = /(?:^|[/_.-])(?:qr(?:code)?|barcode|scan[-_]?me|watermark|logo|logotype|brand[-_]?mark|favicon|icon|poster|flyer|leaflet|social[-_]?post|instagram|whatsapp|telegram|brochure[-_]?(?:cover|title)|factsheet[-_]?(?:cover|title)|presentation[-_]?(?:cover|title)|price[-_]?list|payment[-_]?plan|unit[-_]?(?:schedule|availability)|availability[-_]?list|location[-_]?map|amenit(?:y|ies)[-_]?map|community[-_]?map|master[-_]?plan|masterplan|site[-_]?plan|siteplan|floor[-_]?plan|floorplan|unit[-_]?plan|youtube|video[-_]?thumbnail|maxresdefault)(?:[/_.-]|$)/i;

function normalizedMediaUrl(value: string) {
  const trimmed = value.trim().replace(/\\\//g, "/");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed, "https://psrhomes.ae");
    parsed.hash = "";
    parsed.search = "";
    return parsed.origin === "https://psrhomes.ae" || parsed.origin === "https://psr.espacios.me" ? parsed.pathname : parsed.href;
  } catch {
    return "";
  }
}

/**
 * Returns true only for media that is suitable in a photographic placement.
 * Floor plans and other labelled documents deliberately bypass this function
 * and remain available in their dedicated, clearly labelled collection.
 */
export function isPhotographyAsset(value: string) {
  const normalized = normalizedMediaUrl(value);
  if (!normalized) return false;
  if (confirmedTextHeavyPhotos.has(normalized)) return false;
  if (isFloorplanAsset(normalized)) return false;
  let path = normalized;
  try { path = decodeURIComponent(new URL(normalized, "https://psrhomes.ae").pathname); } catch { /* use normalized value */ }
  return /\.(?:avif|jpe?g|png|webp)$/i.test(path) && !documentOrArtworkPattern.test(path);
}

export function filterPhotographyAssets(values: string[]) {
  return [...new Set(values.filter(isPhotographyAsset))];
}

export function selectPhotographyAsset(primary: string, alternatives: string[] = [], fallback = DEFAULT_PROPERTY_PHOTO) {
  return [primary, ...alternatives].find(isPhotographyAsset) || fallback;
}

export function isConfirmedTextHeavyPhoto(value: string) {
  return confirmedTextHeavyPhotos.has(normalizedMediaUrl(value));
}

const reviewedFloorplans = new Set(photoReview.floorplanPhotos.map(normalizedMediaUrl));

export function isFloorplanAsset(value: string) {
  const normalized = normalizedMediaUrl(value);
  if (reviewedFloorplans.has(normalized)) return true;
  return /(?:^|[/_.-])(?:floor[-_]?plans?|unit[-_]?plans?|layout)(?:[/_.-]|$)/i.test(normalized);
}

type MediaCollections = { gallery?: string[]; exteriors?: string[]; interiors?: string[]; floorplans?: string[] };

/** Retain labelled plans in their own collection, including previously misfiled feed images. */
export function organizeProjectMedia(media: MediaCollections) {
  const sourcePhotos = [...(media.gallery || []), ...(media.exteriors || []), ...(media.interiors || [])];
  const floorplans = [...new Set([...(media.floorplans || []), ...sourcePhotos.filter(isFloorplanAsset)])];
  const planKeys = new Set(floorplans.map(normalizedMediaUrl));
  const photos = (values: string[] = []) => filterPhotographyAssets(values).filter((url) => !planKeys.has(normalizedMediaUrl(url)));
  return { gallery: photos(media.gallery), exteriors: photos(media.exteriors), interiors: photos(media.interiors), floorplans };
}
