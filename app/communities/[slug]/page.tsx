import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { Footer, InternalHeader } from "@/components/Chrome";
import { RegistryProjectGrid } from "@/components/RegistryProjectGrid";
import { getCommunityProfile, getCommunityRouteSlugs } from "@/lib/taxonomy";
import { getAreaPricePerSqft } from "@/lib/market-pricing";
import { metaDescription, pageMetadata, placeList, seoKeywords, SITE_ORIGIN } from "@/lib/seo";
import type { RegistryProject } from "@/lib/imported-projects";

function money(value: number) { return `AED ${Math.round(value).toLocaleString("en-AE")}`; }

/** Entry and median starting price from our own indexed records for this
 *  community. Cheap per-community work over already-loaded projects — never a
 *  registry-wide scan (that pattern caused an outage). Ours, not sourced. */
function catalogueStats(projects: RegistryProject[]) {
  const values = projects
    .map((project) => Number(String(project.startingPrice || "").replace(/[^\d.]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (!values.length) return null;
  return { entry: values[0], median: values[Math.floor(values.length / 2)], count: values.length };
}

export function generateStaticParams() { return getCommunityRouteSlugs().map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const community = getCommunityProfile((await params).slug);
  if (!community) return { title: "Community" };
  const url = `${SITE_ORIGIN}/communities/${community.slug}`;
  const title = `${community.name} Property and Community Guide`;
  const developers = placeList(community.developers, 3) || "active developers";
  const propertyTypes = placeList(community.propertyTypes, 3) || "apartments and villas";
  const fallback = `${community.name} property guide for ${community.emirate} with ${community.activeProjects} active PSR project records, ${developers}, ${propertyTypes}, pricing context and investment due-diligence notes.`;
  const description = metaDescription(community.overview, fallback, 170);
  return {
    ...pageMetadata(title, description, `/communities/${community.slug}`, community.image || undefined),
    keywords: seoKeywords(community.name, `${community.name} property`, `${community.name} off-plan`, `${community.emirate} real estate`, ...community.developers.slice(0, 8), ...community.propertyTypes),
  };
}

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const community = getCommunityProfile((await params).slug);
  if (!community) notFound();
  const stats = catalogueStats(community.projects);
  const benchmark = getAreaPricePerSqft(community.name, community.propertyTypes, community.emirate);
  const communityUrl = `${SITE_ORIGIN}/communities/${community.slug}`;
  const structuredData = [{ "@context": "https://schema.org", "@type": "Place", "@id": `${communityUrl}#place`, url: communityUrl, name: community.name, address: { "@type": "PostalAddress", addressRegion: community.emirate, addressCountry: "AE" }, description: community.overview, image: community.image, subjectOf: { "@type": "ItemList", numberOfItems: community.projects.length, name: `${community.name} PSR project index`, itemListElement: community.projects.slice(0, 12).map((project, index) => ({ "@type": "ListItem", position: index + 1, name: project.name, url: `${SITE_ORIGIN}/projects/${project.slug}` })) } }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Communities", item: `${SITE_ORIGIN}/communities` }, { "@type": "ListItem", position: 2, name: community.name, item: communityUrl }] }];
  return <main className="community-detail-page"><InternalHeader />
    <section className="taxonomy-hero">{community.image && <img src={community.image} alt={`${community.name}, ${community.emirate}`} />}<div className="taxonomy-hero-shade" /><div><p>{community.emirate} · {community.descriptor}</p><h1>{community.name}</h1><span>{community.projects.length ? `${community.activeProjects} active projects · ${community.developers.length} developers` : "Curated community guide · PSR catalogue monitoring"}</span></div></section>
    <section className="taxonomy-overview section-pad"><div><p className="kicker">Community market guide</p><h2>Understand the place<br /><em>before the project.</em></h2></div><div><p className="taxonomy-lead">{community.overview}</p><p>{community.projects.length ? "PSR structures this market from current project records. Availability, pricing, payment terms and completion dates should always be reconfirmed against the selected unit before reservation." : "This sourced guide expands PSR's community coverage without inventing project inventory. No current PSR catalogue record is mapped to this community; any available unit, pricing or completion detail requires direct verification."}</p><Link href={community.projects.length ? `/projects?q=${encodeURIComponent(community.name)}` : "/projects"} className="underlined">{community.projects.length ? "Search this community" : "Browse the project catalogue"}</Link></div></section>
    <section className="taxonomy-stats"><div><span>Active pipeline</span><strong>{community.activeProjects}</strong></div><div><span>Indexed records</span><strong>{community.projects.length}</strong></div><div><span>Developers</span><strong>{community.developers.length}</strong></div><div><span>{community.pricePerSqft ? community.pricePerSqft.label : "Residence types"}</span><strong>{community.pricePerSqft ? community.pricePerSqft.display : community.propertyTypes.length}</strong></div></section>
    <section className="taxonomy-pricing section-pad"><div><p className="kicker">Pricing signal</p><h2>Entry point and<br /><em>market benchmark.</em></h2><p className="taxonomy-lead">{community.projects.length ? `Two separate readings: our own indexed starting prices for ${community.name}, and — where a published figure exists — the market price per square foot from an external source. They are different measures and are shown apart.` : `PSR has not attached a catalogue starting price to ${community.name}. Any published community benchmark is shown separately and should not be treated as a live unit quote.`}</p></div><div className="price-panels">
      <article className="price-panel"><span className="price-tag">PSR catalogue</span>{stats ? <><strong>{money(stats.entry)}</strong><p>Lowest indexed starting price across {stats.count} {stats.count === 1 ? "development" : "developments"} in {community.name}. Median start {money(stats.median)}.</p></> : <><strong>On request</strong><p>Starting prices for {community.name} are confirmed per unit with an advisor.</p></>}</article>
      {benchmark ? <article className="price-panel price-panel-market"><span className="price-tag">Market benchmark · external</span><strong>{benchmark.display}</strong><p>{benchmark.label} · {benchmark.period}. Source: {benchmark.sourceUrl ? <a href={benchmark.sourceUrl} target="_blank" rel="noreferrer">{benchmark.sourceLabel}</a> : benchmark.sourceLabel}. This is a community-level average, not a specific unit price.</p></article> : <article className="price-panel price-panel-market price-panel-empty"><span className="price-tag">Market benchmark · external</span><strong>Not published</strong><p>No sourced price-per-square-foot benchmark is currently available for {community.name}. Ask an advisor for recent comparable transactions.</p></article>}
    </div></section>
    <section className="taxonomy-detail section-pad"><div><p className="kicker">Market composition</p><h2>What is being built.</h2></div><div><article><span>Property types</span><p>{community.propertyTypes.join(" · ") || "Available on request"}</p></article>{community.pricePerSqft && <article><span>Price per square foot</span><p>{community.pricePerSqft.display} · {community.pricePerSqft.period}. {community.pricePerSqft.note}</p></article>}<article><span>Leading developers</span><p>{community.developers.length ? community.developers.slice(0, 12).join(" · ") : "No developer is currently represented by a PSR catalogue record for this community."}</p></article>{community.source && <article><span>Community source</span><p><a href={community.source.url} target="_blank" rel="noreferrer">{community.source.label}</a> · Verified {community.source.verifiedAt}</p></article>}<article><span>Investor review</span><p>Compare delivery timing, competing inventory, micro-location, layout efficiency, service structure and the intended exit or income strategy.</p></article></div></section>
    <section className="section-pad taxonomy-listing taxonomy-project-listing community-project-listing"><div className="section-heading"><div><p className="kicker">Community project index</p><h2>Projects in<br /><em>{community.name}.</em></h2></div><p className="heading-note">{community.projects.length ? "Explore the development pipeline with project-specific architecture, interiors and residence layouts where available." : "PSR is monitoring this community, but no current project record is indexed here yet."}</p></div>{community.projects.length ? <><RegistryProjectGrid projects={community.projects} /><Link href={`/projects?q=${encodeURIComponent(community.name)}`} className="outline-action">View all matching projects</Link></> : <><div className="project-empty"><span>Catalogue monitoring</span><h2>No current PSR project records</h2><p>This guide is published for community research. Project availability will only appear here after a source-verified record is added to the PSR catalogue.</p></div><Link href="/projects" className="outline-action">Browse all projects</Link></>}</section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><Footer />
  </main>;
}
