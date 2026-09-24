import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { PsrPageShell } from "@/components/PsrPageShell";
import { uaeMarketOverview } from "@/data/emirate-market-overviews";
import { uaeHostedEvents } from "@/data/uae-events";
import { getEmirateProfiles } from "@/lib/emirates";
import { getInsightForInitiative } from "@/lib/insights";
import { SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  title: "UAE Market Atlas: Seven Emirates, Future Projects and Events",
  description: "Read the UAE through all seven emirates: economy, infrastructure, culture, tourism, energy, nature, future initiatives, events and property-market context.",
  keywords: ["UAE market overview", "seven emirates market overview", "UAE future projects", "UAE economy", "UAE infrastructure", "UAE tourism", "UAE events calendar", "UAE property market", "PSR Homes"],
  alternates: { canonical: `${SITE_ORIGIN}/emirate` },
  openGraph: {
    type: "website",
    url: `${SITE_ORIGIN}/emirate`,
    title: "UAE Market Atlas: Seven Emirates, Future Projects and Events",
    description: "A country-first view of the economic, cultural, natural and investment assets shaping all seven emirates.",
    images: [{ url: `${SITE_ORIGIN}${uaeMarketOverview.cover.src}`, alt: uaeMarketOverview.cover.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UAE Market Atlas: Seven Emirates, Future Projects and Events",
    description: "A country-first view of the economic, cultural, natural and investment assets shaping all seven emirates.",
    images: [`${SITE_ORIGIN}${uaeMarketOverview.cover.src}`],
  },
};

function monthId(monthLabel: string) {
  return `events-${monthLabel.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function EmirateIndexPage() {
  const emirates = getEmirateProfiles();
  const activeRecords = emirates.reduce((total, emirate) => total + emirate.activeProjects, 0);
  const eventMonths = [...new Set(uaeHostedEvents.map((event) => event.monthLabel))];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "UAE Market Atlas",
        url: `${SITE_ORIGIN}/emirate`,
        description: uaeMarketOverview.summary,
        image: `${SITE_ORIGIN}${uaeMarketOverview.cover.src}`,
        about: { "@type": "Country", name: "United Arab Emirates" },
      },
      {
        "@type": "ItemList",
        name: "Seven UAE emirate market overviews",
        itemListElement: emirates.map((emirate, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: emirate.name,
          url: `${SITE_ORIGIN}/emirate/${emirate.slug}`,
        })),
      },
      ...uaeHostedEvents.map((event) => ({
        "@type": "Event",
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: event.venue,
          address: { "@type": "PostalAddress", addressLocality: event.emirate, addressCountry: "AE" },
        },
        description: event.relevance,
        url: event.sourceUrl,
      })),
    ],
  };

  return <PsrPageShell className="emirate-index-page" insightsSection="emirates" structuredData={structuredData}>
    <section className="page-intro emirate-index-hero">
      <p className="kicker">UAE market atlas</p>
      <h1>The UAE is more than<br /><em>a property market.</em></h1>
      <p className="emirate-index-hero-summary">It is seven connected but distinct economies. Read each emirate through its jobs, infrastructure, institutions, culture, tourism, energy, natural assets, future pipeline and—only then—its property market.</p>
      <nav className="emirate-index-actions" aria-label="UAE Market Atlas sections">
        <a href="#emirate-directory" className="psr-action psr-action-primary">Explore the seven market overviews <span aria-hidden="true">&#8595;</span></a>
        <a href="#uae-future-pipeline" className="psr-action">Track the UAE future pipeline <span aria-hidden="true">&#8595;</span></a>
        <a href="#uae-events" className="psr-action">Open the UAE calendar <span aria-hidden="true">&#8595;</span></a>
      </nav>
    </section>

    <figure className="uae-atlas-cover">
      <img src={uaeMarketOverview.cover.src} alt={uaeMarketOverview.cover.alt} fetchPriority="high" />
      <figcaption>
        <span>UAE / Market Atlas 01</span>
        <p>{uaeMarketOverview.cover.caption}</p>
        <small>{uaeMarketOverview.cover.credit}</small>
      </figcaption>
    </figure>

    <section className="section-pad uae-country-overview" aria-labelledby="uae-country-title">
      <div className="uae-country-copy">
        <p className="kicker">United Arab Emirates</p>
        <h2 id="uae-country-title">{uaeMarketOverview.headline}</h2>
        <p>{uaeMarketOverview.summary}</p>
        <dl className="uae-country-stats">
          <div><dt>Emirates</dt><dd>7</dd></div>
          <div><dt>Market lenses</dt><dd>{uaeMarketOverview.forces.length}</dd></div>
          <div><dt>Federal / cross-emirate initiatives</dt><dd>{uaeMarketOverview.futureInitiatives.length}</dd></div>
          <div><dt>Curated future events</dt><dd>{uaeHostedEvents.length}</dd></div>
        </dl>
        <div className="uae-country-pipeline" aria-label="UAE strategic future pipeline navigation">
          <div>
            <p><span>Emirates</span><b aria-hidden="true">›</b><strong>UAE</strong></p>
            <a href="#uae-future-pipeline">Open all {uaeMarketOverview.futureInitiatives.length} national initiatives <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <nav className="uae-emirate-jumps" aria-label="Jump to an emirate market overview">
          {emirates.map((emirate, index) => <a href={`#${emirate.slug}`} key={emirate.slug}><span>{String(index + 1).padStart(2, "0")}</span>{emirate.name}</a>)}
        </nav>
      </div>
      <div className="uae-market-forces" aria-label="Six lenses used across the UAE Market Atlas">
        {uaeMarketOverview.forces.map((force, index) => <article key={force.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><h3>{force.title}</h3><p>{force.detail}</p></div>
        </article>)}
      </div>
    </section>

    <section className="section-pad emirate-directory" id="emirate-directory" aria-labelledby="emirate-directory-title">
      <header className="emirate-section-heading">
        <div><p className="kicker">The seven emirates</p><h2 id="emirate-directory-title">Different assets.<br /><em>Different market roles.</em></h2></div>
        <p>Each cover is a PSR editorial composite of the defining assets in that emirate—not a project advertisement or official masterplan. Property coverage remains available inside every market overview.</p>
      </header>
      <div className="emirate-index-grid">
        {emirates.map((emirate, index) => {
          const catalysts = emirate.futureInitiatives.filter(({ status }) => status !== "Strategy").slice(0, 3);
          return <article className="emirate-index-card" id={emirate.slug} key={emirate.slug}>
            <figure className="emirate-index-media">
              <img src={emirate.cover.src} alt={emirate.cover.alt} loading="lazy" />
              <figcaption>{emirate.cover.caption}</figcaption>
              <span>{emirate.cover.provenance}</span>
            </figure>
            <div className="emirate-index-card-copy">
              <p className="emirate-card-number">{String(index + 1).padStart(2, "0")} / 07</p>
              <p className="emirate-card-descriptor">{emirate.descriptor}</p>
              <h3><Link href={`/emirate/${emirate.slug}`}>{emirate.name}</Link></h3>
              <dl className="emirate-market-facts">
                <div><dt>Economic anchor</dt><dd>{emirate.comparison.economicAnchor}</dd></div>
                <div><dt>Defining asset</dt><dd>{emirate.comparison.definingAsset}</dd></div>
                <div><dt>Energy / nature</dt><dd>{emirate.comparison.naturalAsset}</dd></div>
              </dl>
              <div className="emirate-card-pipeline" aria-label={`Strategic economic catalysts for ${emirate.name}`}>
                <div>
                  <p><span>Emirates</span><b aria-hidden="true">›</b><span>UAE</span><b aria-hidden="true">›</b><strong>{emirate.name}</strong></p>
                  <Link href={`/emirate/${emirate.slug}#future-pipeline`}>Open pipeline <span aria-hidden="true">→</span></Link>
                </div>
                <ol>
                  {catalysts.map((initiative, catalystIndex) => {
                    const briefing = getInsightForInitiative(initiative.id);
                    return <li key={initiative.id}>
                      <span>{String(catalystIndex + 1).padStart(2, "0")}</span>
                      <div>{briefing ? <Link href={`/insights/${briefing.slug}`}><strong>{initiative.name}</strong><small>{initiative.category} / {initiative.status}</small></Link> : <><strong>{initiative.name}</strong><small>{initiative.category} / {initiative.status}</small></>}</div>
                    </li>;
                  })}
                </ol>
              </div>
              <dl className="emirate-card-stats" aria-label={`PSR coverage for ${emirate.name}`}>
                <div><dt>PSR property records</dt><dd>{emirate.activeProjects}</dd></div>
                <div><dt>Official sources</dt><dd>{emirate.sources.length}</dd></div>
                <div><dt>Future initiatives</dt><dd>{emirate.futureInitiatives.length}</dd></div>
              </dl>
              <Link href={`/emirate/${emirate.slug}`} className="psr-action emirate-guide-link">Open the {emirate.name} market overview <span aria-hidden="true">→</span></Link>
            </div>
          </article>;
        })}
      </div>
      <p className="emirate-property-coverage-note">Property remains part of the atlas: {activeRecords.toLocaleString("en-AE")} active records in the current PSR catalogue are connected to these wider market overviews.</p>
    </section>

    <section className="section-pad uae-pipeline-section" id="uae-future-pipeline" aria-labelledby="uae-pipeline-title">
      <header className="emirate-section-heading">
        <div><p className="kicker">Strategic future pipeline</p><h2 id="uae-pipeline-title">What may change<br /><em>the national map.</em></h2></div>
        <p>Transport, science, digital government, water, energy, industry, culture and tourism initiatives are tracked independently from property launches. Every status and target remains linked to a primary source.</p>
      </header>
      <div className="uae-pipeline-scope-heading">
        <p><span>Emirates</span><b aria-hidden="true">›</b><strong>UAE</strong></p>
        <div><h3>Federal and cross-emirate initiatives</h3><small>National scope only / {uaeMarketOverview.futureInitiatives.length} initiatives</small></div>
      </div>
      <div className="emirate-pipeline-grid">
        {uaeMarketOverview.futureInitiatives.map((initiative, index) => {
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

    <section className="section-pad uae-events-section" id="uae-events" aria-labelledby="uae-events-title">
      <header className="emirate-section-heading uae-events-heading">
        <div><p className="kicker">UAE host calendar</p><h2 id="uae-events-title">The calendar.<br /><em>And why it matters.</em></h2></div>
        <div><p>The current edition tracks {uaeHostedEvents.length} source-checked future events across capital, government, culture, technology, design, energy, tourism, hospitality, infrastructure and real estate.</p><small>Curated coverage, not an exhaustive national listing. Dates and venues checked 2 September 2026; reconfirm with the organiser before travel.</small></div>
      </header>
      <nav className="uae-events-month-nav" aria-label="Jump to an event month">
        {eventMonths.map((month) => <a href={`#${monthId(month)}`} key={month}>{month}</a>)}
      </nav>
      <div className="uae-events-calendar">
        {eventMonths.map((month) => {
          const events = uaeHostedEvents.filter((event) => event.monthLabel === month);
          return <section className="uae-event-month" id={monthId(month)} key={month} aria-labelledby={`${monthId(month)}-title`}>
            <header><h3 id={`${monthId(month)}-title`}>{month}</h3><span>{events.length} {events.length === 1 ? "event" : "events"}</span></header>
            <div className="uae-event-month-grid">
              {events.map((event) => <article className="uae-event-card" key={event.id}>
                <div className="uae-event-date"><time dateTime={event.startDate}>{event.dateLabel}</time><span>{event.emirate}</span></div>
                <div className="uae-event-copy">
                  <p className="uae-event-category">{event.category}</p>
                  <h4>{event.name}</h4>
                  <p className="uae-event-venue">{event.venue}</p>
                  <p>{event.relevance}</p>
                  {event.relationship ? <p className="uae-event-relationship">{event.relationship}</p> : null}
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="psr-action">Official dates / {event.sourceLabel} <span aria-hidden="true">→</span></a>
                </div>
              </article>)}
            </div>
          </section>;
        })}
      </div>
    </section>

    <section className="section-pad emirate-methodology" aria-labelledby="emirate-methodology-title">
      <header><p className="kicker">Method and visual policy</p><h2 id="emirate-methodology-title">Market overview,<br /><em>not a sales brochure.</em></h2></header>
      <div className="emirate-methodology-grid">
        <article><span>01</span><h3>Whole-market lens</h3><p>Economy, movement, institutions, culture, tourism, energy, nature and property are read together.</p></article>
        <article><span>02</span><h3>Status before spectacle</h3><p>Operating assets, active programmes, phased delivery, construction, procurement, development, announcements and strategies remain visibly different.</p></article>
        <article><span>03</span><h3>Editorial covers</h3><p>Generated composites are labelled and never presented as official maps, attraction designs or masterplans.</p></article>
      </div>
      <div className="emirate-methodology-sources">
        {uaeMarketOverview.sources.map((source, index) => <a href={source.href} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{source.label}</strong><small>{source.publisher} / checked {source.verifiedAt} →</small></a>)}
      </div>
    </section>
  </PsrPageShell>;
}
