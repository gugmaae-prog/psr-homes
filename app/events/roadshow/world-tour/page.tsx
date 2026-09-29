import { pageMetadata } from "@/lib/seo";
import { WORLD_TOUR_PATH, worldTourEdition } from "@/lib/world-tour/edition";
import { WorldTourReader } from "./WorldTourReader";

const description = "A curated PSR World Tour reading for Singapore: what is changing in the UAE, where that change could matter, and how to examine it. The 94-page research master stays available separately.";

export const metadata = pageMetadata(
  "The UAE, a more connected tomorrow",
  description,
  WORLD_TOUR_PATH,
  worldTourEdition.coverImage.src,
);

export default function WorldTourEditionPage() {
  return <WorldTourReader />;
}
