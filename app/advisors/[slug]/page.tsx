import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Footer, InternalHeader } from "@/components/Chrome";
import { PublicAdvisorPortfolio } from "@/components/PublicAdvisorPortfolio";
import { SITE_ORIGIN } from "@/lib/seo";
import { canonicalCbaTeamSlug, cbaTeam, cbaTeamMember } from "@/data/cba-team";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = canonicalCbaTeamSlug(slug);
  const advisor = cbaTeamMember(canonicalSlug);
  const title = advisor ? `${advisor.name}, ${advisor.role}` : "PSR Advisor Portfolio";
  const description = advisor ? `Meet ${advisor.name} of PSR Homes Real Estate. ${advisor.specialty}; languages: ${advisor.languages.join(", ")}.` : "Meet a PSR property advisor and explore their selected UAE real estate focus.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE_ORIGIN}/advisors/${canonicalSlug}` },
    robots: { index: Boolean(advisor), follow: true },
  };
}

export function generateStaticParams() {
  return cbaTeam.map(({ slug }) => ({ slug }));
}

export default async function AdvisorPortfolioPage({ params }: Props) {
  const { slug } = await params;
  const canonicalSlug = canonicalCbaTeamSlug(slug);
  if (slug === "jummanah") permanentRedirect(`/advisors/${canonicalSlug}`);
  const advisor = cbaTeamMember(canonicalSlug);
  const url = `${SITE_ORIGIN}/advisors/${canonicalSlug}`;
  const structuredData = advisor ? [{ "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", "@id": `${url}#person`, name: advisor.name, jobTitle: advisor.role, image: `${SITE_ORIGIN}${advisor.image}`, url, email: advisor.email, telephone: advisor.phone, knowsLanguage: advisor.languages, knowsAbout: advisor.specialty, worksFor: { "@id": `${SITE_ORIGIN}/#organization` }, sameAs: [advisor.sourceUrl] } }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Advisors", item: `${SITE_ORIGIN}/advisors` }, { "@type": "ListItem", position: 2, name: advisor.name, item: url }] }] : null;
  return <main><InternalHeader /><PublicAdvisorPortfolio slug={canonicalSlug} />{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />}<Footer /></main>;
}
