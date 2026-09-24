import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BriefingPlayer } from "@/components/BriefingPlayer";
import Link from "@/components/SiteLink";
import { MarketCharts } from "@/components/MarketCharts";
import { PsrPageShell } from "@/components/PsrPageShell";
import { getInsight, insights } from "@/lib/insights";
import { absoluteSiteUrl, articleMetadata, SITE_ORIGIN } from "@/lib/seo";

function isoDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : `${value} 12:00:00 UTC`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function displayDate(value: string) {
  const parsed = isoDate(value);
  return parsed
    ? new Date(parsed).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" })
    : value;
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Official source";
  }
}

export function generateStaticParams() {
  return insights.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const insight = getInsight((await params).slug);
  if (!insight) return { title: "Insight" };
  return articleMetadata({
    title: insight.title,
    description: insight.dek,
    path: `/insights/${insight.slug}`,
    published: insight.published,
    updated: insight.updated,
    image: insight.image,
    imageAlt: insight.imageAlt,
    category: insight.category,
    tags: insight.tags,
  });
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const insight = getInsight((await params).slug);
  if (!insight) notFound();

  const initiative = insight.initiative;
  const url = `${SITE_ORIGIN}/insights/${insight.slug}`;
  const absoluteImage = absoluteSiteUrl(insight.image);
  const atlasPage = initiative?.atlasHref.split("#")[0] || "/emirate";
  const articleBreadcrumbs = initiative
    ? [
      { name: "Home", item: SITE_ORIGIN },
      { name: "Insights", item: `${SITE_ORIGIN}/insights` },
      { name: "UAE Market Atlas", item: `${SITE_ORIGIN}/emirate` },
      ...(initiative.emirateSlug ? [{ name: initiative.jurisdiction, item: absoluteSiteUrl(atlasPage) }] : []),
      { name: insight.title, item: url },
    ]
    : [
      { name: "Home", item: SITE_ORIGIN },
      { name: "Insights", item: `${SITE_ORIGIN}/insights` },
      { name: insight.title, item: url },
    ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: insight.title,
      description: insight.dek,
      image: absoluteImage,
      datePublished: isoDate(insight.published),
      dateModified: isoDate(insight.updated || insight.published),
      mainEntityOfPage: url,
      articleSection: insight.category,
      keywords: insight.tags?.join(", "),
      citation: insight.sources?.map((source) => source.url),
      author: { "@id": `${SITE_ORIGIN}/#organization` },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      ...(initiative ? {
        isPartOf: { "@type": "CollectionPage", name: "UAE Market Atlas", url: absoluteSiteUrl(atlasPage) },
        about: { "@type": "Thing", name: initiative.name, description: `${initiative.jurisdiction} · ${initiative.status} · ${initiative.timing}` },
      } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: articleBreadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.item,
      })),
    },
  ];
  const facts = initiative
    ? [
      ["Jurisdiction", initiative.jurisdiction],
      ["Status", initiative.status],
      ["Timing", initiative.timing],
      ["Evidence checked", displayDate(initiative.verifiedAt)],
    ]
    : [
      ["Research lens", insight.category],
      ["Published", displayDate(insight.published)],
      ["Reading time", insight.readTime],
      ...(insight.updated ? [["Updated", displayDate(insight.updated)]] : []),
    ];
  const atlasBackLabel = initiative?.emirateSlug
    ? `Return to the ${initiative.jurisdiction} future pipeline`
    : "Return to the UAE future pipeline";

  return <PsrPageShell
    className="insight-detail-page"
    insightsSection="research"
    structuredData={structuredData}
  >
    <article className="insight-article">
      <header>
        <nav className="insight-breadcrumb" aria-label="Breadcrumb">
          {initiative ? <>
            <Link href="/insights">Insights</Link><span aria-hidden="true">/</span><Link href="/emirate">UAE Market Atlas</Link><span aria-hidden="true">/</span>
            {initiative.emirateSlug ? <><Link href={atlasPage}>{initiative.jurisdiction}</Link><span aria-hidden="true">/</span></> : null}
            <span aria-current="page">Initiative briefing</span>
          </> : <>
            <Link href="/insights">Insights</Link><span aria-hidden="true">/</span><span aria-current="page">{insight.category}</span>
          </>}
        </nav>
        <p>{insight.category} · {insight.published} · {insight.readTime}{insight.updated && insight.updated !== insight.published ? ` · Updated ${insight.updated}` : ""}</p>
        <h1>{insight.title}</h1>
        <span>{insight.dek}</span>
        {initiative ? <Link href={initiative.atlasHref} className="insight-atlas-backlink">{atlasBackLabel} <span aria-hidden="true">→</span></Link> : null}
      </header>

      <section className="insight-at-a-glance" aria-labelledby="insight-facts-title">
        <p className="kicker" id="insight-facts-title">At a glance</p>
        <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      {insight.category === "Video briefing"
        ? <BriefingPlayer title={insight.title} image={insight.image} slides={insight.takeaways} />
        : <figure><img src={insight.image} alt={insight.imageAlt || `UAE market context related to ${insight.title}`} /><figcaption>{insight.imageCaption || "PSR editorial imagery selected to reflect the subject of this briefing."}</figcaption></figure>}

      {insight.charts?.length ? <section className="article-chart-suite section-pad"><div><p className="kicker">Evidence dashboard</p><h2>Read the signal.<br /><em>Keep the definition.</em></h2></div><MarketCharts charts={insight.charts} compact /></section> : null}

      <section className="insight-body section-pad">
        <aside><p className="kicker">Key takeaways</p>{insight.takeaways.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>)}</aside>
        <div>
          {insight.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
          <div className="research-note"><strong>Important</strong><p>This is general UAE market intelligence, not a promise of delivery, returns or personal financial advice. Reconfirm project status, dates, contracts, live availability, fees and eligibility before making a decision.</p></div>
          {initiative ? <Link href={initiative.atlasHref} className="insight-atlas-return">{atlasBackLabel} <span aria-hidden="true">→</span></Link> : null}
          {insight.sources?.length ? <section className="article-sources" aria-labelledby="article-sources-title">
            <header><p className="kicker">Evidence register</p><h2 id="article-sources-title">Sources and verification</h2></header>
            <ol>{insight.sources.map((source, index) => {
              const checkedAt = source.checkedAt || initiative?.verifiedAt;
              return <li key={source.url}><span>{String(index + 1).padStart(2, "0")}</span><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><small>{source.publisher || sourceHost(source.url)}{checkedAt ? ` · Checked ${displayDate(checkedAt)}` : ""}</small></a></li>;
            })}</ol>
          </section> : null}
        </div>
      </section>
    </article>
  </PsrPageShell>;
}
