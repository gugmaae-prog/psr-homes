"use client";

import "virtual:psr-leads-theme.css";
import "./psr-operations-neutral.css";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  propertyReference: string;
  projectTitle: string;
  consent: boolean;
  status: string;
  createdAt: string;
};

type LeadResponse = {
  leads: Lead[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: {
    total: number;
    last24Hours: number;
    last7Days: number;
    notified: number;
    notificationFailed: number;
  };
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(path), {
    credentials: "include",
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
    ...init,
  });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to complete the request.");
  return data as T;
}

function displayDate(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "notified") return "Advisory desk notified";
  if (status === "notification_failed") return "Saved, notification pending";
  return "Saved";
}

export function LeadsDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeadResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLeads = useCallback(async (requestedPage = 1, requestedQuery = "", requestedStatus = "") => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        ...(requestedQuery ? { q: requestedQuery } : {}),
        ...(requestedStatus ? { status: requestedStatus } : {}),
      });
      const result = await requestJson<LeadResponse>(`/api/leads/dashboard?${params}`);
      setData(result);
      setPage(result.page);
      setAuthenticated(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load website leads.";
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
        void loadLeads(1, "", "");
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => { active = false; };
  }, [loadLeads]);

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
      await loadLeads(1, "", "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to unlock the lead inbox.");
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

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadLeads(1, query, status);
  }

  if (authenticated === null) {
    return <section className="leads-loading" aria-live="polite"><img className="ops-loading-logo" src={withBasePath("/brand/psr-logo-ui.png")} alt="PSR Homes" /><p>Opening the lead inbox</p></section>;
  }

  if (!authenticated) {
    return <section className="leads-access">
      <div className="leads-access-mark" aria-hidden="true"><img className="ops-brand-logo" src={withBasePath("/brand/psr-logo-ui.png")} alt="" /></div>
      <div>
        <p className="kicker">Protected access</p>
        <h1>Website<br />lead inbox.</h1>
        <p>Enter the shared six-digit code to view enquiries submitted through PSR project and contact forms.</p>
        <form onSubmit={signIn}>
          <label><span>Access code</span><input type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required autoFocus /></label>
          <button disabled={busy || code.length !== 6}>{busy ? "Checking access" : "Open lead inbox"}</button>
        </form>
        <p className="leads-error" aria-live="polite">{error}</p>
        <small>Access expires automatically after 12 hours. Form submissions remain stored in the PSR database.</small>
      </div>
    </section>;
  }

  return <section className="leads-dashboard">
    <header className="leads-dashboard-header">
      <div><img className="ops-brand-logo ops-brand-logo-small" src={withBasePath("/brand/psr-logo-ui.png")} alt="PSR Homes" /><p className="kicker light">PSR website</p><h1>Lead<br />inbox.</h1></div>
      <div><p>Project enquiries, contact requests and listing leads captured from the live website.</p><nav aria-label="Lead inbox actions"><Link href="/analytics">View analytics</Link><Link href="/">Open live site</Link><button type="button" onClick={signOut} disabled={busy}>Lock inbox</button></nav></div>
    </header>

    <div className="leads-summary" aria-label="Lead summary">
      <article><span>All leads</span><strong>{data?.summary.total ?? "—"}</strong></article>
      <article><span>Last 24 hours</span><strong>{data?.summary.last24Hours ?? "—"}</strong></article>
      <article><span>Last 7 days</span><strong>{data?.summary.last7Days ?? "—"}</strong></article>
      <article><span>Notifications sent</span><strong>{data?.summary.notified ?? "—"}</strong></article>
    </div>

    <form className="leads-toolbar" onSubmit={filter}>
      <label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, project or message" /></label>
      <label><span>Delivery status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All submissions</option><option value="notified">Advisory desk notified</option><option value="notification_failed">Notification pending</option><option value="new">New</option></select></label>
      <button disabled={busy}>{busy ? "Loading" : "Apply filters"}</button>
      <button type="button" className="leads-refresh" onClick={() => void loadLeads(page, query, status)} disabled={busy}>Refresh</button>
    </form>

    <div className={`leads-list${busy ? " is-loading" : ""}`}>
      {data?.leads.length ? data.leads.map((lead) => <article className="lead-record" key={lead.id}>
        <div className="lead-record-heading">
          <div><span>Lead {String(lead.id).padStart(4, "0")}</span><h2>{lead.name}</h2><p>{displayDate(lead.createdAt)}</p></div>
          <span data-status={lead.status}>{statusLabel(lead.status)}</span>
        </div>
        <dl>
          <div><dt>Project or enquiry</dt><dd>{lead.propertyReference ? <Link href={`/projects/${lead.propertyReference}`}>{lead.projectTitle}</Link> : lead.projectTitle}</dd></div>
          <div><dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
          <div><dt>Phone</dt><dd><a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a></dd></div>
          <div><dt>Source</dt><dd>{lead.source}</dd></div>
        </dl>
        {lead.message && <div className="lead-record-message"><span>Client message</span><p>{lead.message}</p></div>}
        <div className="lead-record-actions"><a href={`mailto:${lead.email}?subject=${encodeURIComponent(`PSR enquiry — ${lead.projectTitle}`)}`}>Email client</a><a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>Call client</a></div>
      </article>) : <div className="leads-empty"><span>No matching leads</span><p>Change the filters or refresh the inbox when a new website enquiry arrives.</p></div>}
    </div>

    {data && data.pages > 1 && <nav className="leads-pagination" aria-label="Lead pages">
      <button type="button" disabled={busy || data.page <= 1} onClick={() => void loadLeads(data.page - 1, query, status)}>Previous</button>
      <span>Page {data.page} of {data.pages} · {data.total} matching leads</span>
      <button type="button" disabled={busy || data.page >= data.pages} onClick={() => void loadLeads(data.page + 1, query, status)}>Next</button>
    </nav>}
  </section>;
}
