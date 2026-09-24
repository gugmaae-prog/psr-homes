import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { Footer, InternalHeader } from "@/components/Chrome";
import { RegistryProjectGrid } from "@/components/RegistryProjectGrid";
import { metaDescription, pageMetadata, placeList, seoKeywords, SITE_ORIGIN } from "@/lib/seo";
import { getDeveloperDirectory, getDeveloperProfile } from "@/lib/taxonomy";

export function generateStaticParams() { return getDeveloperDirectory().map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const developer = getDeveloperProfile((await params).slug);
  if (!developer) return { title: "Developer" };
  const url = `${SITE_ORIGIN}/developers/${developer.slug}`;
  const title = `${developer.name} UAE Projects and Developer Profile`;
  const emirates = placeList(developer.emirates, 3) || "the UAE";
  const communities = placeList(developer.communities, 3) || "key UAE communities";
  const fallback = `${developer.name} UAE developer profile with ${developer.activeProjects} active projects across ${emirates}. Compare off-plan projects, communities including ${communities}, property types, delivery context and live PSR records.`;
  const description = metaDescription(developer.overview || "", fallback, 165);
  return {
    ...pageMetadata(title, description, `/developers/${developer.slug}`, developer.image || undefined),
    keywords: seoKeywords(developer.name, `${developer.name} projects`, `${developer.name} Dubai projects`, `${developer.name} UAE property developer`, ...developer.emirates, ...developer.communities.slice(0, 8), ...developer.propertyTypes),
  };
}

export default async function DeveloperPage({ params }: { params: Promise<{ slug: string }> }) {
  const developer = getDeveloperProfile((await params).slug);
  if (!developer) notFound();
  const developerUrl = `${SITE_ORIGIN}/developers/${developer.slug}`;
  const structuredData = [{ "@context": "https://schema.org", "@type": "Organization", "@id": `${developerUrl}#organization`, url: developerUrl, name: developer.name, description: developer.overview || `${developer.name} UAE project and developer profile by PSR Homes.`, areaServed: developer.emirates, knowsAbout: developer.propertyTypes, ...(developer.website ? { sameAs: [developer.website] } : {}), subjectOf: { "@type": "ItemList", numberOfItems: developer.projects.length, name: `${developer.name} UAE project index`, itemListElement: developer.projects.slice(0, 12).map((project, index) => ({ "@type": "ListItem", position: index + 1, name: project.name, url: `${SITE_ORIGIN}/projects/${project.slug}` })) } }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Developers", item: `${SITE_ORIGIN}/developers` }, { "@type": "ListItem", position: 2, name: developer.name, item: developerUrl }] }];
  return <main><InternalHeader />
    <section className="taxonomy-hero developer-hero">{developer.image && <img src={developer.image} alt={`${developer.flagship}, a signature development by ${developer.name}`} />}<div className="taxonomy-hero-shade" /><div><p>{developer.descriptor || "UAE developer profile"}</p><h1>{developer.name}</h1><span>{developer.activeProjects} active projects · Signature: {developer.flagship}</span></div></section>
    <section className="taxonomy-overview section-pad"><div><p className="kicker">Developer profile</p><h2>Read the pipeline,<br /><em>not only the brand.</em></h2></div><div><p className="taxonomy-lead">{developer.overview || `${developer.name} is represented by ${developer.projects.length} indexed UAE project records across ${developer.emirates.join(", ")}.`}</p><p>This profile organises market records into a consistent view. It is designed for project discovery and comparison, not as a substitute for legal, financial or technical due diligence on a specific purchase.</p><div className="taxonomy-actions"><Link href={`/projects?developer=${encodeURIComponent(developer.name)}`} className="underlined">Filter the live catalogue</Link>{developer.website && <Link href={developer.website} target="_blank" rel="noreferrer" className="underlined">Developer website</Link>}</div></div></section>
    <section className="taxonomy-stats"><div><span>Active projects</span><strong>{developer.activeProjects}</strong></div><div><span>Total indexed</span><strong>{developer.projects.length}</strong></div><div><span>Emirates</span><strong>{developer.emirates.length}</strong></div><div><span>Communities</span><strong>{developer.communities.length}</strong></div></section>
    <section className="taxonomy-detail section-pad"><div><p className="kicker">Pipeline composition</p><h2>Where and what<br />they are building.</h2></div><div><article><span>Emirates</span><p>{developer.emirates.join(" · ")}</p></article><article><span>Key communities</span><p>{developer.communities.slice(0, 16).join(" · ")}</p></article><article><span>Residence types</span><p>{developer.propertyTypes.join(" · ") || "Available on request"}</p></article>{developer.focus && <article><span>Development focus</span><p>{developer.focus.join(" · ")}</p></article>}<article><span>Due-diligence lens</span><p>Review delivery record, specification consistency, current workload, operating partners, service structure and the individual escrow and sale documentation.</p></article></div></section>
    <section className="section-pad taxonomy-listing taxonomy-project-listing"><div className="section-heading"><div><p className="kicker">Indexed portfolio</p><h2>Projects by<br /><em>{developer.name}.</em></h2></div></div><RegistryProjectGrid projects={developer.projects} /><Link href={`/projects?developer=${encodeURIComponent(developer.name)}`} className="outline-action">View every matching project</Link></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><Footer />
  </main>;
}
