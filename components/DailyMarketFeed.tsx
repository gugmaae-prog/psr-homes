"use client";

import { useEffect, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";

type DailyInsight = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  sourceLabel: string;
  image: string;
  marketDate: string;
  href: string;
};

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00+04:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" });
}

export function DailyMarketFeed() {
  const [articles, setArticles] = useState<DailyInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(withBasePath("/api/market-daily"), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily feed unavailable");
        return response.json() as Promise<{ articles?: DailyInsight[] }>;
      })
      .then((payload) => setArticles((payload.articles || []).slice(0, 3)))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return <section className="daily-market-feed section-pad">
    <header>
      <div><p className="kicker">Daily market intelligence</p><h2>Dubai, read<br /><em>with context.</em></h2></div>
      <div><p>A fresh evidence-led note built from verified market releases, edited for the decisions buyers and investors are making now.</p><Link href="/insights/daily">Open the daily desk</Link></div>
    </header>
    {articles.length > 0 ? <div className="daily-market-grid">
      {articles.map((article, index) => <Link href={article.href} className={index === 0 ? "daily-market-card lead" : "daily-market-card"} key={article.slug}>
        <div>{article.image ? <img src={article.image} alt={`Dubai market context for ${article.title}`} loading={index === 0 ? "eager" : "lazy"} /> : <span>PSR</span>}<b>{article.category}</b></div>
        <p>{displayDate(article.marketDate)} · {article.sourceLabel}</p>
        <h3>{article.title}</h3>
        <span>{article.dek}</span>
        <strong>Read today&rsquo;s lens</strong>
      </Link>)}
    </div> : <div className="daily-market-preparing" aria-live="polite">
      <span>{loading ? "Checking today’s verified releases" : "Today’s market note is being prepared"}</span>
      <p>The research library remains available while the current daily lens is verified and published.</p>
      <a href="#research-library">Browse the research library</a>
    </div>}
  </section>;
}
