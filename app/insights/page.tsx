import Link from "@/components/SiteLink";
import { MarketCharts } from "@/components/MarketCharts";
import { DailyMarketFeed } from "@/components/DailyMarketFeed";
import { MarketObservatoryStatus } from "@/components/MarketObservatoryStatus";
import { PsrPageShell } from "@/components/PsrPageShell";
import { insights, marketResearchCharts } from "@/lib/insights";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "UAE Market Intelligence & Research",
  "Evidence-led UAE intelligence across the economy, infrastructure, mobility, culture, tourism, energy, technology, strategic initiatives and property markets from PSR.",
  "/insights",
);

export default function InsightsPage() {
  const orderedInsights = [...insights].sort(
    (left, right) => Date.parse(`${right.published} 12:00:00 UTC`) - Date.parse(`${left.published} 12:00:00 UTC`),
  );
  const lead = orderedInsights[0];
  return <PsrPageShell className="insights-page" insightsSection="research">
    <section className="insights-editorial-hero">
      <div className="insights-editorial-copy">
        <p className="kicker">PSR Intelligence · UAE</p>
        <h1>Research for better<br /><em>UAE decisions.</em></h1>
        <p>Evidence on the forces shaping the Emirates—from infrastructure, culture and technology to tourism, energy and property—edited to clarify what is operating, what is planned and why it matters.</p>
        <div className="insights-editorial-actions">
          <Link href={`/insights/${lead.slug}`}>Read latest briefing</Link>
          <a href="#research-library">Browse all research</a>
          <Link href="/emirate">Open the UAE Market Atlas</Link>
        </div>
      </div>
      <Link href={`/insights/${lead.slug}`} className="insights-editorial-feature">
        <img src={lead.image} alt={lead.imageAlt || `UAE market context related to ${lead.title}`} fetchPriority="high" />
        <div>
          <span>Latest · {lead.category} · {lead.readTime}</span>
          <strong>{lead.title}</strong>
          <p>{lead.published}</p>
        </div>
      </Link>
    </section>

    <section className="insights-research-strip" aria-label="Research coverage">
      <div><strong>{orderedInsights.length}</strong><span>Evidence-led briefings</span></div>
      <div><strong>{marketResearchCharts.length}</strong><span>Comparable data lenses</span></div>
      <div><strong>7</strong><span>UAE emirates in scope</span></div>
      <div><strong>Daily</strong><span>Current market lens</span></div>
    </section>

    <DailyMarketFeed />

    <section className="insights-method section-pad">
      <div className="insights-method-heading"><p className="kicker">Research discipline</p><h2>More than headlines.<br /><em>A decision framework.</em></h2></div>
      <div className="insights-method-grid">
        <article><span>01</span><h3>Keep definitions visible</h3><p>Operating assets, construction, procurement, announcements and strategies are not interchangeable. Every briefing keeps status, timing and evidence explicit.</p></article>
        <article><span>02</span><h3>Move from country to asset</h3><p>Federal ambition is the context. Emirate-level institutions, infrastructure, employment, culture and natural assets explain how opportunity takes shape locally.</p></article>
        <article><span>03</span><h3>Separate evidence from promise</h3><p>Official targets inform judgement; they do not guarantee delivery or returns. Dates, status and live commercial information still require verification.</p></article>
      </div>
    </section>

    <section className="market-observatory section-pad">
      <div className="market-observatory-heading"><div><MarketObservatoryStatus /><h2>One market.<br /><em>Four analytical lenses.</em></h2></div><p>Daily reports are retained in the PSR research archive. Monthly and quarterly charts keep their own source periods visible so unlike datasets are never blended into a false headline.</p></div>
      <MarketCharts charts={marketResearchCharts} />
    </section>

    <section className="insights-library section-pad" id="research-library">
      <header><div><p className="kicker">Research library</p><h2>Analysis for the<br /><em>whole UAE picture.</em></h2></div><p>National strategy, infrastructure, culture, tourism, technology, energy and property intelligence—connected so a single headline is never mistaken for the whole market.</p></header>
      <nav aria-label="Insight categories">
        <span>Strategic initiatives</span><span>Market research</span><span>Infrastructure</span><span>Culture & tourism</span><span>Investor guides</span>
      </nav>
      <div className="psr-card-grid insights-index">{orderedInsights.map((insight, index) => <Link href={`/insights/${insight.slug}`} className={index === 0 ? "lead" : ""} key={insight.slug}><div><img src={insight.image} alt={insight.imageAlt || `UAE market context related to ${insight.title}`} loading={index > 3 ? "lazy" : "eager"} />{insight.category === "Video briefing" && <b>Visual briefing</b>}<i>{String(index + 1).padStart(2, "0")}</i></div><p>{insight.category} · {insight.published} · {insight.readTime}</p><h2>{insight.title}</h2><span>{insight.dek}</span><strong>Read briefing</strong></Link>)}</div>
    </section>
  </PsrPageShell>;
}
