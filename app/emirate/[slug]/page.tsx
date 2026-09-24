import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/SiteLink";
import { EmirateProjectShowcase } from "@/components/EmirateProjectShowcase";
import { PsrPageShell } from "@/components/PsrPageShell";
import { uaeHostedEvents } from "@/data/uae-events";
import { getEmirateProfile, getEmirateProfiles, getEmirateProjectShowcase } from "@/lib/emirates";
import { getInsightForInitiative } from "@/lib/insights";
import { SITE_ORIGIN } from "@/lib/seo";

function absoluteImage(src: string) {
  return src.startsWith("http") ? src : `${SITE_ORIGIN}${src}`;
}

export function generateStaticParams() {
  return getEmirateProfiles().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const emirate = getEmirateProfile((await params).slug);
  if (!emirate) return { title: "UAE Emirate Market Overview" };
  const url = `${SITE_ORIGIN}/emirate/${emirate.slug}`;
  const title = `${emirate.name} Market Overview: Economy, Assets and Property`;
  const description = `${emirate.name} market overview across economy, infrastructure, culture, tourism, energy, natural assets, future initiatives, events and PSR property coverage.`;
  return {
    title,
    description,
    keywords: [
      `${emirate.name} market overview`,
      `${emirate.name} economy`,
      `${emirate.name} infrastructure projects`,
      `${emirate.name} tourism and culture`,
      `${emirate.name} property market`,
      "UAE market intelligence",
      "PSR Homes",
    ],
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, images: [{ url: absoluteImage(emirate.cover.src), alt: emirate.cover.alt }] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImage(emirate.cover.src)] },
  };
}

export default async function EmiratePage({ params }: { params: Promise<{ slug: string }> }) {
  const emirate = getEmirateProfile((await params).slug);
  if (!emirate) notFound();
  const showcase = getEmirateProjectShowcase(emirate, 6);
  const localEvents = uaeHostedEvents.filter((event) => event.emirate === emirate.name);
  const displayedLocalEvents = localEvents.slice(0, 6);
  const sourceById = new Map(emirate.sources.map((source) => [source.id, source]));
  const url = `${SITE_ORIGIN}/emirate/${emirate.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Place",
      "@id": `${url}#place`,
      name: emirate.name,
      url,
      address: { "@type": "PostalAddress", addressRegion: emirate.name, addressCountry: "AE" },
      description: emirate.executiveSummary,
      image: absoluteImage(emirate.cover.src),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${emirate.name} Market Overview`,
      url,
      description: emirate.executiveSummary,
      about: { "@id": `${url}#place` },
      mainEntity: {
        "@type": "ItemList",
        name: `${emirate.name} market pillars`,
        itemListElement: emirate.pillars.map((pillar, index) => ({ "@type": "ListItem", position: index + 1, name: pillar.label, description: pillar.summary })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        { "@type": "ListItem", position: 2, name: "UAE Market Atlas", item: `${SITE_ORIGIN}/emirate` },
        { "@type": "ListItem", position: 3, name: emirate.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${emirate.name} PSR property catalogue selection`,
      itemListElement: showcase.map(({ project }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_ORIGIN}/projects/${project.slug}`,
        name: project.name,
      })),
    },
  ];

  return <PsrPageShell className="emirate-detail-page" insightsSection="emirates" structuredData={structuredData}>
    <section className="taxonomy-hero emirate-hero">
      <img src={emirate.cover.src} alt={emirate.cover.alt} />
      <div className="taxonomy-hero-shade" />
      <div className="emirate-hero-copy">
        <nav className="emirate-breadcrumb" aria-label="Breadcrumb"><Link href="/emirate">UAE Market Atlas</Link><span aria-hidden="true">/</span><span aria-current="page">{emirate.name}</span></nav>
        <p>{emirate.descriptor}</p>
        <h1>{emirate.name}</h1>
        <span>Economy / infrastructure / culture / tourism / energy / nature / property</span>
        <small className="emirate-hero-note">{emirate.cover.credit}</small>
      </div>
    </section>

    <nav className="emirate-guide-nav" aria-label={`${emirate.name} market overview sections`}>
      <Link href="/emirate">All emirates</Link>
      <div>
        <a href="#overview">Overview</a>
        <a href="#economy">Economy</a>
        <a href="#infrastructure">Infrastructure</a>
        <a href="#culture-tourism">Culture & tourism</a>
        <a href="#energy-nature">Energy & nature</a>
        <a href="#future-pipeline">Future pipeline</a>
        <a href="#property">Property</a>
        <a href="#events">Events</a>
        <a href="#evidence">Evidence</a>
      </div>
    </nav>

    <section className="section-pad emirate-brief" id="overview" aria-labelledby="emirate-overview-title">
      <header className="emirate-chapter-heading">
        <div><p className="kicker">Emirate market overview</p><h2 id="emirate-overview-title">What shaped it.<br /><em>What changes next.</em></h2></div>
        <div><p className="emirate-lead">{emirate.executiveSummary}</p><p>This overview begins with the demand engines that make the emirate work. Property is covered later as one part of that system, using the live PSR catalogue rather than pretending catalogue totals describe the whole market.</p></div>
      </header>
      <dl className="emirate-overview-lenses">
        <div><dt>Economic anchor</dt><dd>{emirate.comparison.economicAnchor}</dd></div>
        <div><dt>Defining asset</dt><dd>{emirate.comparison.definingAsset}</dd></div>
        <div><dt>Energy / nature</dt><dd>{emirate.comparison.naturalAsset}</dd></div>
        <div><dt>Next catalyst</dt><dd>{emirate.comparison.nextCatalyst}</dd></div>
      </dl>
      <ol className="emirate-timeline">
        {[["Past", emirate.timeline.past], ["Present", emirate.timeline.present], ["Outlook", emirate.timeline.outlook]].map(([label, copy], index) => (
          <li key={label}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{label}</h3><p>{copy}</p></div></li>
        ))}
      </ol>
    </section>

    {emirate.pillars.map((pillar) => <section className="section-pad emirate-editorial-section emirate-pillar-section" id={pillar.id} aria-labelledby={`${pillar.id}-title`} key={pillar.id}>
      <header className="emirate-chapter-heading">
        <div><p className="kicker">{pillar.label}</p><h2 id={`${pillar.id}-title`}>{pillar.label}<br /><em>in {emirate.name}.</em></h2></div>
        <p>{pillar.summary}</p>
      </header>
      <div className="emirate-reading-list">
        {pillar.signals.map((signal, index) => <article key={signal.title}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>{signal.title}</h3>
            <div><p>{signal.detail}</p><div className="emirate-signal-sources">{signal.sourceIds.flatMap((id) => {
              const source = sourceById.get(id);
              return source ? [<a href={source.href} target="_blank" rel="noreferrer" key={id}>Source / {source.publisher} →</a>] : [];
            })}</div></div>
          </div>
        </article>)}
      </div>
    </section>)}

    <section className="section-pad emirate-editorial-section emirate-future-pipeline" id="future-pipeline" aria-labelledby="emirate-future-title">
      <nav className="emirate-pipeline-breadcrumb" aria-label="Initiative scope">
        <Link href="/emirate#emirate-directory">Emirates</Link><span aria-hidden="true">›</span><Link href="/emirate#uae-future-pipeline">UAE</Link><span aria-hidden="true">›</span><strong aria-current="page">{emirate.name}</strong>
      </nav>
      <header className="emirate-chapter-heading">
        <div><p className="kicker">Strategic future pipeline</p><h2 id="emirate-future-title">What may change<br /><em>{emirate.name}.</em></h2></div>
        <p>Operating assets, active programmes, phased delivery, construction, procurement, development, announcements and strategies remain visibly distinct. Target dates are shown as targets—not guarantees.</p>
      </header>
      <div className="emirate-pipeline-grid">
        {emirate.futureInitiatives.map((initiative, index) => {
          const briefing = getInsightForInitiative(initiative.id);
          return <article className="emirate-pipeline-card" key={initiative.id}>
            <div className="emirate-pipeline-meta"><span>{String(index + 1).padStart(2, "0")}</span><strong data-status={initiative.status}>{initiative.status}</strong></div>
            <p>{initiative.category}</p>
            <h3>{initiative.name}</h3>
            <time>{initiative.timing}</time>
            <p>{initiative.summary}</p>
            <p className="emirate-pipeline-impact">Market read: {initiative.marketImpact}</p>
            {briefing ? <Link className="psr-action" href={`/insights/${briefing.slug}`}>Read PSR briefing <span aria-hidden="true">→</span></Link> : null}
          </article>;
        })}
      </div>
    </section>

    <section className="section-pad taxonomy-listing emirate-project-listing emirate-editorial-section emirate-property-section" id="property" aria-labelledby="emirate-property-title">
      <header className="emirate-chapter-heading">
        <div><p className="kicker">Property market context</p><h2 id="emirate-property-title">Property is one<br /><em>chapter of the market.</em></h2></div>
        <div><p>The figures below describe PSR catalogue coverage, not the total {emirate.name} market. Unit-level pricing, legal review and technical due diligence remain separate.</p><Link href={`/projects?emirate=${encodeURIComponent(emirate.name)}`} className="psr-action">Search the {emirate.name} property catalogue <span aria-hidden="true">→</span></Link></div>
      </header>
      <dl className="emirate-brief-stats" aria-label={`PSR catalogue coverage for ${emirate.name}`}>
        <div><dt>Active PSR records</dt><dd>{emirate.activeProjects}</dd></div>
        <div><dt>Indexed PSR records</dt><dd>{emirate.indexedProjects}</dd></div>
        <div><dt>Developers represented</dt><dd>{emirate.developers.length}</dd></div>
        <div><dt>Communities represented</dt><dd>{emirate.communities.length}</dd></div>
      </dl>
      <div className="emirate-reading-list emirate-property-reading">
        {[
          ["Property-market role", emirate.marketRole.join(" ")],
          ["Investor lens", emirate.investmentLens.join(" ")],
          ["Property types in PSR", emirate.propertyTypes.join(" / ") || "Available on request"],
          ["Developers in the PSR catalogue", emirate.developers.slice(0, 14).join(" / ") || "Available on request"],
        ].map(([label, copy], index) => <article key={label}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{label}</h3><p>{copy}</p></div></article>)}
      </div>
      <div className="emirate-catalogue-heading"><p className="kicker">Selected PSR catalogue</p><h3>Projects connected to this market overview</h3></div>
      <EmirateProjectShowcase items={showcase} />
      <Link href={`/projects?emirate=${encodeURIComponent(emirate.name)}`} className="outline-action">View every {emirate.name} project</Link>
    </section>

    <section className="section-pad emirate-editorial-section emirate-local-events" id="events" aria-labelledby="emirate-events-title">
      <header className="emirate-chapter-heading">
        <div><p className="kicker">UAE host calendar</p><h2 id="emirate-events-title">Events that inform<br /><em>the market read.</em></h2></div>
        <p>Officially dated events hosted in {emirate.name}. The national calendar also includes cross-emirate capital, government, tourism, technology, energy and design signals.</p>
      </header>
      {localEvents.length ? <>
        <div className="emirate-local-event-grid">{displayedLocalEvents.map((event) => <article key={event.id}>
          <div><time dateTime={event.startDate}>{event.dateLabel}</time><span>{event.category}</span></div>
          <h3>{event.name}</h3><p>{event.relevance}</p>
          <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="psr-action">Official dates / {event.sourceLabel} <span aria-hidden="true">→</span></a>
        </article>)}</div>
        <div className="emirate-events-footer"><p>Showing {displayedLocalEvents.length} of {localEvents.length} currently tracked {emirate.name} {localEvents.length === 1 ? "event" : "events"}.</p><Link href="/emirate#uae-events" className="psr-action">Open the complete curated UAE calendar <span aria-hidden="true">→</span></Link></div>
      </> : <div className="emirate-events-empty"><p>No matching hosted event is verified in the current curated dataset. This does not mean the emirate has no events.</p><Link href="/emirate#uae-events" className="psr-action">Open the national UAE calendar <span aria-hidden="true">→</span></Link></div>}
    </section>

    <section className="emirate-sources section-pad" id="evidence" aria-labelledby="emirate-evidence-title">
      <header><p className="kicker">Evidence register</p><h2 id="emirate-evidence-title">Sources before<br /><em>market opinion.</em></h2><p>Primary government, operator and institution sources checked 2 September 2026. Official imagery is not reused unless rights permit; the cover is a labelled PSR editorial composite.</p></header>
      <div>{emirate.sources.map((source, index) => <a key={source.id} href={source.href} target="_blank" rel="noreferrer"><span>{String(index + 1).padStart(2, "0")}</span><strong>{source.label}</strong><small>{source.publisher} / checked {source.verifiedAt} →</small></a>)}</div>
    </section>
  </PsrPageShell>;
}
