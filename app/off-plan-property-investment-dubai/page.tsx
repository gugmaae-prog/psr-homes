import { SeoLandingPageView } from "@/components/SeoLandingPage";
import { getSeoLandingPage } from "@/data/seo-landing-pages";
import { getProjectRegistry } from "@/lib/imported-projects";
import { pageMetadata, seoKeywords } from "@/lib/seo";

const page = getSeoLandingPage("off-plan-property-investment-dubai")!;

export const metadata = {
  ...pageMetadata(page.title, page.description, `/${page.slug}`),
  keywords: seoKeywords(...page.keywords, page.title),
};

export default function OffPlanPropertyInvestmentDubaiPage() {
  return <SeoLandingPageView page={page} projects={getProjectRegistry().projects} />;
}
