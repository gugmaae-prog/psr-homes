"use client";

import "virtual:psr-analytics-theme.css";
import "./psr-operations-neutral.css";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";

type CountItem = { label: string; count: number };
type AnalyticsResponse = {
  range: number;
  selectedPath: string;
  summary: {
    visits: number;
    visitors: number;
    pageViews: number;
    clicks: number;
    conversions: number;
    averageScroll: number;
    averageEngagement: number;
  };
  daily: Array<{ date: string; views: number; visits: number }>;
  pages: Array<{ path: string; views: number; visits: number; averageScroll: number }>;
  heatmap: Array<{ x: number; y: number; count: number }>;
  devices: CountItem[];
  referrers: CountItem[];
  countries: CountItem[];
  sections: Array<{ label: string; visits: number; averageScroll: number }>;
  recent: Array<{
    session: string;
    firstSeen: string;
    lastSeen: string;
    pages: number;
    events: number;
    maxScroll: number;
    device: string;
    country: string;
    referrer: string;
    engagementSeconds: number;
  }>;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(path), {
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
    },
    ...init,
  });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to complete the request.");
  return data as T;
}

function number(value: number) {
  return new Intl.NumberFormat("en-AE").format(value);
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function displayDate(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function Bars({ items, empty }: { items: CountItem[]; empty: string }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <p className="analytics-empty-inline">{empty}</p>;
  return <div className="analytics-bars">
    {items.map((item) => <div key={item.label}>
      <p><span>{item.label}</span><strong>{number(item.count)}</strong></p>
      <i><b style={{ width: `${(item.count / maximum) * 100}%` }} /></i>
    </div>)}
  </div>;
}

export function AnalyticsDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [range, setRange] = useState(30);
  const [selectedPath, setSelectedPath] = useState("/");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextRange: number, nextPath: string) => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ range: String(nextRange), path: nextPath });
      const result = await requestJson<AnalyticsResponse>(`/api/analytics/dashboard?${params}`);
      setData(result);
      setAuthenticated(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load website analytics.";
      setError(message);
      if (/code required/i.test(message)) setAuthenticated(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    requestJson<{ authenticated: boolean }>("/api/leads/access")
      .then(() => {
        if (!active) return;
        setAuthenticated(true);
        void load(30, "/");
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => { active = false; };
  }, [load]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJson<{ authenticated: true }>("/api/leads/access", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setCode("");
      setAuthenticated(true);
      await load(range, selectedPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to unlock website analytics.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await requestJson<{ ok: true }>("/api/leads/access", { method: "DELETE" });
    } finally {
      setData(null);
      setAuthenticated(false);
      setBusy(false);
    }
  }

  function changeRange(nextRange: number) {
    setRange(nextRange);
    void load(nextRange, selectedPath);
  }

  function changePath(nextPath: string) {
    setSelectedPath(nextPath);
    void load(range, nextPath);
  }

  const chartMax = useMemo(
    () => Math.max(1, ...(data?.daily.map((day) => day.views) || [])),
    [data],
  );
  const heatMax = useMemo(
    () => Math.max(1, ...(data?.heatmap.map((point) => point.count) || [])),
    [data],
  );

  if (authenticated === null) {
    return <section className="analytics-loading" aria-live="polite"><img className="ops-loading-logo" src={withBasePath("/brand/psr-logo-ui.png")} alt="PSR Homes" /><p>Opening website intelligence</p></section>;
  }

  if (!authenticated) {
    return <section className="analytics-access">
      <div className="analytics-access-visual" aria-hidden="true">
        <img className="ops-brand-logo" src={withBasePath("/brand/psr-logo-ui.png")} alt="" />
      </div>
      <div className="analytics-access-copy">
        <p className="kicker">Protected website intelligence</p>
        <h1>Visits.<br />Clearly seen.</h1>
        <p>Use the same six-digit management code as the lead inbox to review visits, page engagement and the interaction heatmap.</p>
        <form onSubmit={signIn}>
          <label><span>Access code</span><input type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required autoFocus /></label>
          <button disabled={busy || code.length !== 6}>{busy ? "Checking access" : "Open analytics"}</button>
        </form>
        <p className="analytics-error" aria-live="polite">{error}</p>
        <small>Anonymous first-party analytics only. Typed form and chat content is never recorded here.</small>
      </div>
    </section>;
  }

  const summary = data?.summary;
  return <section className="analytics-dashboard">
    <header className="analytics-dashboard-header">
      <div>
        <img className="ops-brand-logo ops-brand-logo-small" src={withBasePath("/brand/psr-logo-ui.png")} alt="PSR Homes" />
        <p className="kicker light">PSR website intelligence</p>
        <h1>Audience<br />signals.</h1>
      </div>
      <div>
        <p>Understand where clients arrive, what they explore, and which parts of each page earn attention.</p>
        <nav aria-label="Analytics actions">
          <Link href="/leads">View lead inbox</Link>
          <Link href="/">Open live site</Link>
          <button type="button" onClick={signOut} disabled={busy}>Lock dashboard</button>
        </nav>
      </div>
    </header>

    <div className="analytics-controls">
      <div>
        <span>Reporting window</span>
        {[7, 30, 90].map((days) => <button key={days} type="button" className={range === days ? "is-active" : ""} onClick={() => changeRange(days)} disabled={busy}>{days} days</button>)}
      </div>
      <label>
        <span>Heatmap page</span>
        <select value={selectedPath} onChange={(event) => changePath(event.target.value)} disabled={busy}>
          {!data?.pages.some((page) => page.path === selectedPath) && <option value={selectedPath}>{selectedPath}</option>}
          {data?.pages.map((page) => <option key={page.path} value={page.path}>{page.path} · {page.views} views</option>)}
        </select>
      </label>
      <button type="button" className="analytics-refresh" onClick={() => void load(range, selectedPath)} disabled={busy}>{busy ? "Refreshing" : "Refresh data"}</button>
    </div>

    <div className="analytics-kpis" aria-label="Website visit summary">
      <article><span>Visits</span><strong>{number(summary?.visits || 0)}</strong><small>Distinct browsing sessions</small></article>
      <article><span>Unique visitors</span><strong>{number(summary?.visitors || 0)}</strong><small>Anonymous browser count</small></article>
      <article><span>Page views</span><strong>{number(summary?.pageViews || 0)}</strong><small>{number(summary?.clicks || 0)} recorded interactions</small></article>
      <article><span>Average attention</span><strong>{duration(summary?.averageEngagement || 0)}</strong><small>{summary?.averageScroll || 0}% average scroll depth</small></article>
      <article><span>Enquiries</span><strong>{number(summary?.conversions || 0)}</strong><small>Completed lead submissions</small></article>
    </div>

    <div className="analytics-grid">
      <article className="analytics-panel analytics-traffic">
        <header><div><span>Traffic rhythm</span><h2>Daily website activity</h2></div><p>Page views across the selected reporting window.</p></header>
        {data?.daily.length ? <div className="analytics-chart" role="img" aria-label="Daily website page views">
          {data.daily.map((day, index) => <div key={day.date} title={`${day.date}: ${day.views} views, ${day.visits} visits`}>
            <strong>{day.views}</strong>
            <i style={{ height: `${Math.max(4, (day.views / chartMax) * 100)}%` }} />
            <span>{index === 0 || index === data.daily.length - 1 || data.daily.length <= 10 ? day.date.slice(5) : ""}</span>
          </div>)}
        </div> : <div className="analytics-empty"><strong>Collection begins now</strong><p>Daily traffic will appear as visitors browse the deployed website.</p></div>}
      </article>

      <article className="analytics-panel analytics-heat-panel">
        <header><div><span>Interaction heatmap</span><h2>{selectedPath}</h2></div><p>Brighter areas receive more clicks or taps.</p></header>
        <div className={`analytics-heatmap${data?.heatmap.length ? "" : " is-empty"}`}>
          <div className="analytics-heatmap-browser"><i /><i /><i /><span>{selectedPath}</span></div>
          <div className="analytics-heatmap-page">
            <small className="at-top">Top</small><small className="at-middle">Middle</small><small className="at-bottom">Bottom</small>
            <div className="analytics-page-ghost"><i /><b /><span /><span /><span /><strong /></div>
            {data?.heatmap.map((point) => {
              const intensity = point.count / heatMax;
              return <i
                className="analytics-heat-point"
                key={`${point.x}-${point.y}`}
                title={`${point.count} interaction${point.count === 1 ? "" : "s"}`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  opacity: 0.38 + intensity * 0.62,
                  transform: `translate(-50%, -50%) scale(${0.72 + intensity * 1.15})`,
                }}
              />;
            })}
            {!data?.heatmap.length && <p>No clicks recorded on this page yet.</p>}
          </div>
        </div>
        <div className="analytics-heat-legend"><span>Lower activity</span><i /><span>Higher activity</span></div>
      </article>

      <article className="analytics-panel analytics-pages">
        <header><div><span>Content performance</span><h2>Most visited pages</h2></div></header>
        {data?.pages.length ? <div className="analytics-table-wrap"><table><thead><tr><th>Page</th><th>Views</th><th>Visits</th><th>Scroll</th></tr></thead><tbody>
          {data.pages.map((page) => <tr key={page.path} className={page.path === selectedPath ? "is-selected" : ""} onClick={() => changePath(page.path)}>
            <td>{page.path}</td><td>{number(page.views)}</td><td>{number(page.visits)}</td><td>{page.averageScroll}%</td>
          </tr>)}
        </tbody></table></div> : <p className="analytics-empty-inline">Page performance appears after the first visit.</p>}
      </article>

      <article className="analytics-panel analytics-sections">
        <header><div><span>Page attention</span><h2>Sections reached</h2></div><p>{selectedPath}</p></header>
        <Bars items={(data?.sections || []).map((item) => ({ label: item.label, count: item.visits }))} empty="Section visibility appears after visitors scroll through this page." />
      </article>

      <article className="analytics-panel"><header><div><span>Experience</span><h2>Devices</h2></div></header><Bars items={data?.devices || []} empty="No device activity yet." /></article>
      <article className="analytics-panel"><header><div><span>Acquisition</span><h2>Referrals</h2></div></header><Bars items={data?.referrers || []} empty="No referral activity yet." /></article>
      <article className="analytics-panel"><header><div><span>Geography</span><h2>Visitor countries</h2></div></header><Bars items={data?.countries || []} empty="Country signals appear after live visits." /></article>

      <article className="analytics-panel analytics-recent">
        <header><div><span>Live trail</span><h2>Recent visits</h2></div><p>Anonymous sessions only.</p></header>
        {data?.recent.length ? <div className="analytics-table-wrap"><table><thead><tr><th>Seen</th><th>Session</th><th>Device</th><th>Pages</th><th>Scroll</th><th>Attention</th><th>Source</th></tr></thead><tbody>
          {data.recent.map((visit) => <tr key={`${visit.session}-${visit.lastSeen}`}>
            <td>{displayDate(visit.lastSeen)}</td><td>{visit.session}</td><td>{visit.device}{visit.country ? ` · ${visit.country}` : ""}</td><td>{visit.pages}</td><td>{visit.maxScroll}%</td><td>{duration(visit.engagementSeconds)}</td><td>{visit.referrer}</td>
          </tr>)}
        </tbody></table></div> : <p className="analytics-empty-inline">Recent visits will appear here after deployment.</p>}
      </article>
    </div>
    <p className="analytics-error analytics-dashboard-error" aria-live="polite">{error}</p>
    <footer className="analytics-data-note"><strong>Privacy by design</strong><span>Anonymous identifiers, navigation interactions and coarse technical context only. No names, form content, chat messages or typed text are captured by this dashboard.</span></footer>
  </section>;
}
