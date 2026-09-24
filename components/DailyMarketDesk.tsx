"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { preferredScrollBehavior } from "@/lib/scroll-behavior";

type DailyInsight = {
  slug: string;
  title: string;
  dek: string;
  paragraphs: string[];
  category: string;
  sourceLabel: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  image: string;
  marketDate: string;
  publishedAt: string;
};

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00+04:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DailyMarketDesk() {
  const [articles, setArticles] = useState<DailyInsight[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const requested = new URLSearchParams(window.location.search).get("article") || "";
    fetch(withBasePath("/api/market-daily"), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily feed unavailable");
        return response.json() as Promise<{ articles?: DailyInsight[] }>;
      })
      .then((payload) => {
        const next = payload.articles || [];
        setArticles(next);
        setSelectedSlug(next.some((article) => article.slug === requested) ? requested : next[0]?.slug || "");
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => articles.find((article) => article.slug === selectedSlug) || articles[0],
    [articles, selectedSlug],
  );

  function select(slug: string) {
    setSelectedSlug(slug);
    const url = new URL(window.location.href);
    url.searchParams.set("article", slug);
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 110, behavior: preferredScrollBehavior() });
  }

  if (!selected) {
    return <section className="daily-desk-empty section-pad">
      <p className="kicker">Daily market desk</p>
      <h1>{loading ? "Checking today’s market releases." : "Today’s note is being verified."}</h1>
      <p>Daily notes publish only after the underlying market evidence has been checked. Explore the established research library in the meantime.</p>
      <a href={withBasePath("/insights")}>Return to insights</a>
    </section>;
  }

  return <div className="daily-market-desk">
    <article className="daily-market-article">
      <header>
        <p>{selected.category} · {displayDate(selected.marketDate)}</p>
        <h1>{selected.title}</h1>
        <span>{selected.dek}</span>
      </header>
      {selected.image && <figure><img src={selected.image} alt={`Dubai real estate market context for ${selected.title}`} /><figcaption>Market context image selected from the verified release or the PSR editorial library.</figcaption></figure>}
      <section>
        {selected.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="daily-source-note">
          <span>Evidence base</span>
          <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel}</a>
          <p>General market information only. Live price, availability, fees, finance and projected return require unit-level verification.</p>
        </div>
      </section>
    </article>
    <aside className="daily-market-archive">
      <p className="kicker">Daily archive</p>
      {articles.map((article) => <button type="button" className={article.slug === selected.slug ? "active" : ""} onClick={() => select(article.slug)} key={article.slug}>
        <span>{displayDate(article.marketDate)}</span>
        <strong>{article.title}</strong>
      </button>)}
    </aside>
  </div>;
}
