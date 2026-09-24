import type { Metadata } from "next";
import { DubaiSouthReviewPresentation, type DubaiSouthReviewData } from "@/components/DubaiSouthReviewPresentation";
import presentationScene from "@/data/dubai-south-review-slides.json";
import { SITE_ORIGIN } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Dubai South | Jumanah | PSR Homes",
  description: "Jumanah's PSR Dubai South investor decision presentation covering ready and off-plan project comparisons.",
  alternates: { canonical: `${SITE_ORIGIN}/advisors/jumanah/dubai-south` },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function JumanahDubaiSouthPresentationPage() {
  // The Cloudflare presentation gate validates the signed HttpOnly session
  // before this private, no-store server route is rendered.
  return <DubaiSouthReviewPresentation presentation={presentationScene as DubaiSouthReviewData} />;
}
