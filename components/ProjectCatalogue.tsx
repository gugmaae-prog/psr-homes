"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";
import { selectPhotographyAsset } from "@/lib/media-policy";
import { preferredScrollBehavior } from "@/lib/scroll-behavior";
import type { CatalogueFilters as Filters, CatalogueProject as Project, CatalogueResult } from "@/lib/project-catalogue";
import { CardCurrencyPrice } from "@/components/CardCurrencyPrice";
type Initial = { query?: string; emirate?: string; developer?: string; propertyType?: string };
type SearchIntent = { query: string; emirate: string; developer: string; propertyType: string; bedrooms: string; maxPriceAed: number };

const emptyIntent: SearchIntent = { query: "", emirate: "", developer: "", propertyType: "", bedrooms: "", maxPriceAed: 0 };

async function interpretProjectSearch(value: string) {
  const response = await fetch(withBasePath("/api/projects/interpret-search"), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query: value }),
  });
  if (!response.ok) throw new Error("interpretation unavailable");
  const result = await response.json() as { intent?: SearchIntent };
  if (!result.intent) throw new Error("interpretation unavailable");
  return result.intent;
}

export default function ProjectCatalogue({ initial = {}, initialData }: { initial?: Initial; initialData?: CatalogueResult }) {
  const [projects, setProjects] = useState<Project[]>(initialData?.projects || []); const [query, setQuery] = useState(initial.query || ""); const [activeQuery, setActiveQuery] = useState("");
  const [emirate, setEmirate] = useState(initial.emirate || ""); const [developer, setDeveloper] = useState(initial.developer || ""); const [propertyType, setPropertyType] = useState(initial.propertyType || "");
  const [filters, setFilters] = useState<Filters>(initialData?.filters || { emirates: {}, developers: [], propertyTypes: [] }); const [page, setPage] = useState(initialData?.page || 1); const [pages, setPages] = useState(initialData?.pages || 1); const [total, setTotal] = useState(initialData?.total || 0); const [loading, setLoading] = useState(!initialData); const [intent, setIntent] = useState<SearchIntent>(emptyIntent); const [interpreting, setInterpreting] = useState(Boolean(initial.query)); const [searchReady, setSearchReady] = useState(!initial.query);
  useEffect(() => { if (!searchReady) return; const controller = new AbortController(); const params = new URLSearchParams({ page: String(page) }); if (activeQuery) params.set("q", activeQuery); if (emirate) params.set("emirate", emirate); if (developer) params.set("developer", developer); if (propertyType) params.set("type", propertyType); if (intent.bedrooms) params.set("bedrooms", intent.bedrooms); if (intent.maxPriceAed) params.set("maxPrice", String(intent.maxPriceAed));
    fetch(`${withBasePath("/api/projects")}?${params}`, { signal: controller.signal }).then(async (response) => (await response.json()) as CatalogueResult).then(data => { setProjects(data.projects); setPages(data.pages || 1); setTotal(data.total); setFilters(data.filters); }).finally(() => setLoading(false)); return () => controller.abort();
  }, [searchReady, activeQuery, page, emirate, developer, propertyType, intent.bedrooms, intent.maxPriceAed]);
  useEffect(() => {
    const value = initial.query?.trim();
    if (!value) return;
    let cancelled = false;
    setLoading(true); setInterpreting(true); setSearchReady(false); setPage(1);
    interpretProjectSearch(value).then((nextIntent) => {
      if (cancelled) return;
      setIntent(nextIntent); setActiveQuery(nextIntent.query);
      if (nextIntent.emirate) setEmirate(nextIntent.emirate);
      if (nextIntent.developer) setDeveloper(nextIntent.developer);
      if (nextIntent.propertyType) setPropertyType(nextIntent.propertyType);
    }).catch(() => {
      if (!cancelled) { setIntent(emptyIntent); setActiveQuery(value); }
    }).finally(() => {
      if (!cancelled) { setInterpreting(false); setSearchReady(true); }
    });
    return () => { cancelled = true; };
  }, [initial.query]);
  useEffect(() => {
    const applyGraceFilter = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { query?: unknown; emirate?: unknown; propertyType?: unknown } : null;
      if (!detail) return;
      const nextQuery = typeof detail.query === "string" ? detail.query : "";
      const nextEmirate = typeof detail.emirate === "string" ? detail.emirate : "";
      const nextType = typeof detail.propertyType === "string" ? detail.propertyType : "";
      setLoading(true); setPage(1); setQuery(nextQuery); setActiveQuery(nextQuery); setEmirate(nextEmirate); setPropertyType(nextType); setIntent(emptyIntent);
    };
    window.addEventListener("hg:grace-filter", applyGraceFilter);
    return () => window.removeEventListener("hg:grace-filter", applyGraceFilter);
  }, []);
  async function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    setLoading(true); setInterpreting(true); setPage(1);
    if (!value) { setIntent(emptyIntent); setActiveQuery(""); setLoading(false); setInterpreting(false); return; }
    try {
      const nextIntent = await interpretProjectSearch(value);
      setIntent(nextIntent);
      setActiveQuery(nextIntent.query);
      if (nextIntent.emirate) setEmirate(nextIntent.emirate);
      if (nextIntent.developer) setDeveloper(nextIntent.developer);
      if (nextIntent.propertyType) setPropertyType(nextIntent.propertyType);
    } catch {
      setIntent(emptyIntent);
      setActiveQuery(value);
    } finally {
      setInterpreting(false);
    }
  }
  function changeFilter(setter: (value: string) => void, value: string) { setLoading(true); setPage(1); setter(value); }
  function reset() { setLoading(true); setQuery(""); setActiveQuery(""); setEmirate(""); setDeveloper(""); setPropertyType(""); setIntent(emptyIntent); setPage(1); }
  return <section className="project-catalogue section-pad">
    <form className="project-search" onSubmit={search} aria-busy={interpreting}>
      <label className="project-query"><span className="sr-only">AI-powered project search</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Describe what you want — e.g. 2 bedrooms under AED 3M in Dubai Marina" aria-label="AI-powered project search" /></label>
      <label><span className="sr-only">Emirate</span><select aria-label="Emirate" value={emirate} onChange={e => changeFilter(setEmirate, e.target.value)}><option value="">All emirates</option>{Object.entries(filters.emirates).map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}</select></label>
      <label><span className="sr-only">Developer</span><select aria-label="Developer" value={developer} onChange={e => changeFilter(setDeveloper, e.target.value)}><option value="">All developers</option>{filters.developers.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label><span className="sr-only">Property type</span><select aria-label="Property type" value={propertyType} onChange={e => changeFilter(setPropertyType, e.target.value)}><option value="">All residences</option>{filters.propertyTypes.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <button disabled={interpreting}>{interpreting ? "Understanding…" : "Find matches"}</button>
      <span className="sr-only" aria-live="polite">{interpreting ? "Interpreting your property search" : ""}</span>
    </form>
    <div className="project-count"><span>{loading ? "Loading the live collection..." : `${total.toLocaleString()} matching developments`}</span><button type="button" onClick={reset}>Reset filters</button></div>
    <div className={`psr-card-grid project-index-grid${loading ? " loading" : ""}`}>{projects.map((project, index) => {
      const href = project.href || `/projects/${project.slug}`;
      const image = selectPhotographyAsset(project.image);
      return <article key={project.slug} className="project-index-card"><Link href={href} className="project-index-image"><img src={image} loading={index > 7 ? "lazy" : "eager"} alt={`${project.title} in ${project.area}`} /><span>View project</span></Link><div className="project-card-content"><p>{project.emirate} · {project.developer}</p><h2><Link href={href}>{project.title}</Link></h2><div className="project-card-meta"><CardCurrencyPrice amountAed={project.priceAed} aedLabel={project.price} projectName={project.title} /><span className="project-card-market-fact">{project.pricePerSqft ? `${project.pricePerSqftLabel} ${project.pricePerSqft}` : project.area}</span></div></div></article>;
    })}</div>
    {!loading && !projects.length && <div className="project-empty"><span>0 results</span><h2>Broaden the search.</h2><p>Reset the filters or ask an advisor to build a private shortlist around your target return, budget and timing.</p><button onClick={reset}>View all projects</button></div>}
    {!loading && projects.length > 0 && <div className="pagination" role="navigation" aria-label="Project catalogue pages"><button type="button" aria-label="Previous project page" disabled={page === 1} onClick={() => { setLoading(true); setPage(v => v - 1); window.scrollTo({ top: 500, behavior: preferredScrollBehavior() }); }}>Previous</button><span aria-live="polite">{page} / {pages}</span><button type="button" aria-label="Next project page" disabled={page === pages} onClick={() => { setLoading(true); setPage(v => v + 1); window.scrollTo({ top: 500, behavior: preferredScrollBehavior() }); }}>Next</button></div>}
  </section>;
}
