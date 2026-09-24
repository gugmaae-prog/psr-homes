"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, FormEvent, MouseEvent } from "react";
import { withBasePath } from "@/lib/base-path";
import { useSemanticSearch } from "@/components/useSemanticSearch";
import { matchesSemanticIntent } from "@/lib/semantic-search";

type AgentUser = { email: string; name: string; role: string };
type CrmView = "botspace" | "dashboard" | "contacts" | "pipeline" | "tasks" | "campaigns";
type ContactStatus = "new" | "qualified" | "nurturing" | "active" | "won" | "lost" | "archived";
type OpportunityStage = "new" | "contacted" | "qualified" | "viewing" | "negotiation" | "reservation" | "won" | "lost" | "archived";

type CrmContact = {
  id: string;
  ownerEmail: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  preferredLanguage: string;
  clientType: string;
  source: string;
  status: ContactStatus;
  consentStatus: "unknown" | "granted" | "withdrawn";
  consentRecordedAt: string;
  consentSource: string;
  consentDetail: string;
  tags: string[];
  notes: string;
  lastContactAt: string;
  nextFollowUpAt: string;
  createdAt: string;
  updatedAt: string;
  openOpportunities?: number;
  pipelineValueAed?: number;
  nextTaskAt?: string;
};

type CrmOpportunity = {
  id: string;
  contactId: string;
  ownerEmail: string;
  title: string;
  kind: string;
  stage: OpportunityStage;
  estimatedValueAed: number;
  probability: number;
  projectSlug: string;
  propertyReference: string;
  bedrooms: string[];
  nextStep: string;
  expectedCloseAt: string;
  notes: string;
  updatedAt: string;
};

type CrmTask = {
  id: string;
  contactId: string;
  opportunityId: string;
  ownerEmail: string;
  title: string;
  notes: string;
  dueAt: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "completed" | "cancelled";
  completedAt: string;
  createdAt: string;
};

type CrmActivity = {
  id: string;
  contactId: string;
  opportunityId: string;
  taskId: string;
  ownerEmail: string;
  actorEmail: string;
  type: string;
  subject: string;
  body: string;
  occurredAt: string;
};

type CrmOverview = {
  scope: "mine" | "team";
  contacts: Record<string, number>;
  pipeline: Array<{ stage: OpportunityStage; count: number; valueAed: number; weightedValueAed: number }>;
  pipelineTotals: { openCount: number; openValueAed: number; weightedValueAed: number };
  tasks: { total: number; open: number; overdue: number; dueToday: number };
  recentActivities: CrmActivity[];
  unimportedWebsiteLeads: number;
};

type ContactDetail = {
  contact: CrmContact;
  opportunities: CrmOpportunity[];
  tasks: CrmTask[];
  activities: CrmActivity[];
  websiteLeads: Array<{ id: number; source: string; propertyReference: string; submittedAt: string; importedAt: string }>;
};

type Advisor = { email: string; name: string; role: string; title?: string };

type CrmCampaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  lastTestStatus: string;
  createdAt: string;
  sentAt: string;
  total: number;
  eligible: number;
  pendingValidation: number;
  suppressed: number;
  unavailable: number;
  cooldown: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
};

type CampaignWorkspace = {
  ownerEmail: string;
  audience: { total: number; consented: number; missingEmail: number; missingConsent: number };
  campaigns: CrmCampaign[];
  studioUrl: string;
};

type CrmContactResult = {
  contacts: CrmContact[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type CrmOpportunityResult = {
  opportunities: CrmOpportunity[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type CrmProjectOption = {
  slug: string;
  name: string;
  developer: string;
  area: string;
  emirate: string;
};

type CrmProjectSearchResult = { projects: CrmProjectOption[] };

const contactStatuses: ContactStatus[] = ["new", "qualified", "nurturing", "active", "won", "lost", "archived"];
const opportunityStages: OpportunityStage[] = ["new", "contacted", "qualified", "viewing", "negotiation", "reservation", "won", "lost", "archived"];
const openOpportunityStages = opportunityStages.filter((stage) => !["won", "lost", "archived"].includes(stage));
const botSpacePipelineStages: Array<{ stage: OpportunityStage; label: string }> = [
  { stage: "new", label: "New inquiry" },
  { stage: "contacted", label: "Contacted" },
  { stage: "qualified", label: "Qualified" },
  { stage: "viewing", label: "Viewing" },
  { stage: "negotiation", label: "Negotiation" },
  { stage: "reservation", label: "Reservation" },
  { stage: "won", label: "Closed won" },
  { stage: "lost", label: "Closed lost" },
];
const waslParkGateProject: CrmProjectOption = {
  slug: "wasl1-park-gate-residences-dubai",
  name: "Wasl 1 Park Gate Residences",
  developer: "wasl",
  area: "Zabeel",
  emirate: "Dubai",
};
const legacyMetaLeadProjectSlug = "avenue-park-towers-ii";

async function crmApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(path), {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The CRM could not complete this request.");
  return payload;
}

function money(value: number) {
  return `AED ${Math.round(value || 0).toLocaleString("en-AE")}`;
}

function dateLabel(value: string, includeTime = false) {
  if (!value) return "Not set";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) return "Not set";
  return date.toLocaleString("en-AE", includeTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

function metaLeadCopy(value: string) {
  return value
    .replace(/botspace sheet import/gi, "Meta Leads import")
    .replace(/botspace lead/gi, "Meta Lead")
    .replace(/botspace/gi, "Meta Lead");
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function projectNameFromSlug(slug: string) {
  return slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function projectForOpportunity(opportunity?: CrmOpportunity): CrmProjectOption {
  if (!opportunity || !opportunity.projectSlug || opportunity.projectSlug === legacyMetaLeadProjectSlug || opportunity.projectSlug === waslParkGateProject.slug) {
    return waslParkGateProject;
  }
  return {
    slug: opportunity.projectSlug,
    name: opportunity.propertyReference || projectNameFromSlug(opportunity.projectSlug),
    developer: "",
    area: "",
    emirate: "",
  };
}

function ProjectPicker({
  selected,
  onChange,
  allowAll = false,
  compact = false,
}: {
  selected: CrmProjectOption | null;
  onChange: (project: CrmProjectOption | null) => void;
  allowAll?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<CrmProjectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const hasSearch = query.trim().length >= 2;

  useEffect(() => {
    if (!hasSearch) {
      setProjects([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      void crmApi<CrmProjectSearchResult>(`/api/agent/crm/projects?q=${encodeURIComponent(query.trim())}`)
        .then((response) => { if (!controller.signal.aborted) setProjects(response.projects); })
        .catch(() => { if (!controller.signal.aborted) setProjects([]); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hasSearch, query]);

  function choose(project: CrmProjectOption | null) {
    setQuery("");
    setProjects([]);
    onChange(project);
  }

  return <div className={`agent-crm-project-picker${compact ? " agent-crm-project-picker-compact" : ""}`}>
    <label><span>Project</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selected ? "Search another PSR project" : "Search all PSR projects"} autoComplete="off" aria-label="Search PSR projects" /></label>
    <div className="agent-crm-project-picker-current" aria-live="polite"><span>Showing</span><strong>{selected?.name || "All PSR projects"}</strong></div>
    {hasSearch && <div className="agent-crm-project-picker-results" role="listbox" aria-label="Matching PSR projects">
      {allowAll && <button type="button" role="option" aria-selected={!selected} onClick={() => choose(null)}><strong>All PSR projects</strong><small>Remove the project filter</small></button>}
      {projects.map((project) => <button type="button" key={project.slug} role="option" aria-selected={selected?.slug === project.slug} onClick={() => choose(project)}><strong>{project.name}</strong><small>{[project.developer, project.area, project.emirate].filter(Boolean).join(" · ")}</small></button>)}
      {!searching && !projects.length && <p>No active PSR projects match that search.</p>}
      {searching && <p>Searching projects…</p>}
    </div>}
  </div>;
}

function ContactEditor({
  detail,
  advisors,
  isAdmin,
  busy,
  onClose,
  onRefresh,
  onCreateCampaignForContact,
}: {
  detail: ContactDetail;
  advisors: Advisor[];
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onRefresh: (contactId?: string) => Promise<void>;
  onCreateCampaignForContact: (contact: CrmContact) => void;
}) {
  const { contact } = detail;
  const isMetaLead = contact.source.trim().toLowerCase() === "botspace";
  const [status, setStatus] = useState(contact.status);
  const [ownerEmail, setOwnerEmail] = useState(contact.ownerEmail);
  const [notes, setNotes] = useState(contact.notes);
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityStage, setOpportunityStage] = useState<OpportunityStage>("new");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [projectReference, setProjectReference] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState<CrmTask["priority"]>("normal");
  const [activityType, setActivityType] = useState("note");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityBody, setActivityBody] = useState("");
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailProject, setEmailProject] = useState<CrmProjectOption | null>(() => detail.opportunities[0] ? projectForOpportunity(detail.opportunities[0]) : null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function mutate(path: string, init: RequestInit, success: string) {
    setWorking(true); setError(""); setMessage("");
    try {
      await crmApi(path, init);
      setMessage(success);
      await onRefresh(contact.id);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update this client record.");
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function saveAssignment() {
    const changes: Record<string, string> = {};
    if (status !== contact.status) changes.status = status;
    if (isAdmin && ownerEmail !== contact.ownerEmail) changes.ownerEmail = ownerEmail;
    if (!Object.keys(changes).length) return;
    await mutate(`/api/agent/crm/contacts/${contact.id}`, { method: "PATCH", body: JSON.stringify(changes) }, "Client record updated.");
  }

  async function saveNotes() {
    if (notes === contact.notes) return;
    await mutate(
      `/api/agent/crm/contacts/${contact.id}`,
      { method: "PATCH", body: JSON.stringify({ notes }) },
      "Private notes updated.",
    );
  }

  async function saveLeadDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(`/api/agent/crm/contacts/${contact.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        clientType: form.get("clientType"),
        nationality: form.get("nationality"),
        preferredLanguage: form.get("preferredLanguage"),
        nextFollowUpAt: form.get("nextFollowUpAt"),
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    }, "Lead details updated.");
  }

  function composeProjectEmail(project: CrmProjectOption) {
    const firstName = contact.fullName.split(/\s+/).filter(Boolean)[0] || "there";
    setEmailProject(project);
    setEmailSubject(`${project.name} | PSR Homes`);
    setEmailMessage(`Hi ${firstName},\n\nAs discussed, I’m sharing ${project.name}. You can review the project details and let me know which availability you would like to explore.\n\nBest,\nPSR Homes`);
    setEmailComposerOpen(true);
  }

  async function sendLeadEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(`Send this one-to-one email to ${contact.email}?`)) return;
    const sent = await mutate(`/api/agent/crm/contacts/${contact.id}/email`, {
      method: "POST",
      body: JSON.stringify({ subject: emailSubject, message: emailMessage, projectSlug: emailProject?.slug || "" }),
    }, "Client email sent and recorded on the timeline.");
    if (sent) {
      setEmailSubject("");
      setEmailMessage("");
      setEmailProject(null);
      setEmailComposerOpen(false);
    }
  }

  async function updateOpportunityProject(opportunity: CrmOpportunity, project: CrmProjectOption | null) {
    if (!project || project.slug === opportunity.projectSlug) return;
    await mutate(`/api/agent/crm/opportunities/${opportunity.id}`, {
      method: "PATCH",
      body: JSON.stringify({ projectSlug: project.slug, propertyReference: project.name }),
    }, `Project updated to ${project.name}.`);
  }

  async function createOpportunity(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/agent/crm/opportunities", {
      method: "POST",
      body: JSON.stringify({
        contactId: contact.id,
        title: opportunityTitle,
        stage: opportunityStage,
        estimatedValueAed: opportunityValue ? Number(opportunityValue) : 0,
        probability: opportunityStage === "qualified" ? 40 : opportunityStage === "viewing" ? 55 : 10,
        projectSlug: projectReference,
        propertyReference: projectReference,
      }),
    }, "Opportunity added to the pipeline.");
    setOpportunityTitle(""); setOpportunityValue(""); setProjectReference(""); setOpportunityStage("new");
  }

  async function createTask(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/agent/crm/tasks", {
      method: "POST",
      body: JSON.stringify({ contactId: contact.id, title: taskTitle, dueAt: taskDue, priority: taskPriority }),
    }, "Follow-up task created.");
    setTaskTitle(""); setTaskDue(""); setTaskPriority("normal");
  }

  async function createActivity(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/agent/crm/activities", {
      method: "POST",
      body: JSON.stringify({ contactId: contact.id, type: activityType, subject: activitySubject, body: activityBody }),
    }, "Activity recorded on the timeline.");
    setActivitySubject(""); setActivityBody(""); setActivityType("note");
  }

  async function archiveContact() {
    if (!window.confirm(`Archive ${contact.fullName}? Open opportunities will be archived and open tasks cancelled.`)) return;
    await mutate(`/api/agent/crm/contacts/${contact.id}`, { method: "DELETE" }, "Client record archived.");
  }

  return <aside className="agent-crm-record" aria-label={`${contact.fullName} CRM record`}>
    <header>
      <div><span>{isMetaLead ? "Meta Lead record" : "Client record"}</span><h2>{contact.fullName}</h2><p>{contact.email || "No email"}{contact.phone ? ` · ${contact.phone}` : ""}</p></div>
      <button type="button" onClick={onClose} aria-label="Close client record">Close</button>
    </header>
    <div className="agent-crm-record-meta">
      <label><span>Relationship status</span><select value={status} onChange={(event) => setStatus(event.target.value as ContactStatus)}>{contactStatuses.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label>
      {isAdmin
        ? <label><span>Assigned advisor</span><select value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)}>{advisors.map((advisor) => <option key={advisor.email} value={advisor.email}>{advisor.name}</option>)}</select></label>
        : <p className="agent-crm-lead-owner"><span>Lead owner</span><strong>{advisors.find((advisor) => advisor.email === contact.ownerEmail)?.name || contact.ownerEmail}</strong></p>}
      <button type="button" onClick={() => void saveAssignment()} disabled={working || busy || (status === contact.status && ownerEmail === contact.ownerEmail)}>{isAdmin ? "Save assignment" : "Save lead stage"}</button>
    </div>
    <dl className="agent-crm-client-facts">
      <div><dt>Client type</dt><dd>{titleCase(contact.clientType)}</dd></div>
      <div><dt>Source</dt><dd>{metaLeadCopy(contact.source || "Manual")}</dd></div>
      <div><dt>Consent</dt><dd>{titleCase(contact.consentStatus)}</dd></div>
      <div><dt>Next follow-up</dt><dd>{dateLabel(contact.nextFollowUpAt, true)}</dd></div>
    </dl>
    {contact.consentStatus === "granted" && contact.consentDetail && <p className="agent-crm-consent-proof"><strong>Marketing consent recorded {dateLabel(contact.consentRecordedAt, true)}</strong>{contact.consentDetail}<small>{contact.consentSource}</small></p>}
    {contact.tags.length > 0 && <div className="agent-crm-tags">{contact.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
    <details className="agent-crm-lead-details">
      <summary><span>Lead properties</span><strong>Edit details</strong></summary>
      <form onSubmit={saveLeadDetails}>
        <label><span>Full name</span><input name="fullName" defaultValue={contact.fullName} maxLength={160} required /></label>
        <label><span>Email</span><input name="email" type="email" defaultValue={contact.email} maxLength={180} /></label>
        <label><span>Phone</span><input name="phone" type="tel" defaultValue={contact.phone} maxLength={32} /></label>
        <label><span>Lead type</span><select name="clientType" defaultValue={contact.clientType}>{["buyer", "seller", "investor", "tenant", "landlord", "other"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label>
        <label><span>Nationality</span><input name="nationality" defaultValue={contact.nationality} maxLength={80} /></label>
        <label><span>Preferred language</span><input name="preferredLanguage" defaultValue={contact.preferredLanguage} maxLength={80} /></label>
        <label><span>Next follow-up</span><input name="nextFollowUpAt" type="datetime-local" defaultValue={contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toISOString().slice(0, 16) : ""} /></label>
        <label><span>Tags</span><input name="tags" defaultValue={contact.tags.join(", ")} maxLength={1_000} placeholder="Investor, 2 bedroom, hot lead" /></label>
        <p className="agent-crm-lead-property-source"><span>Source</span><strong>{metaLeadCopy(contact.source || "Manual")}</strong><small>Source stays protected for attribution and reporting.</small></p>
        <button disabled={working || busy}>Save lead details</button>
      </form>
    </details>
    <section className="agent-crm-lead-actions" aria-label="Lead actions">
      <div><span>Client communication</span><p>Send a one-to-one update, or create a controlled campaign draft for this exact client.</p></div>
      <div><button type="button" onClick={() => setEmailComposerOpen((open) => !open)} disabled={!contact.email}>{emailComposerOpen ? "Close email" : "Send email"}</button><button type="button" onClick={() => onCreateCampaignForContact(contact)} disabled={!contact.email || contact.consentStatus !== "granted"}>Campaign draft</button></div>
      {!contact.email && <small>Add an email address to send a client update.</small>}
      {contact.email && contact.consentStatus !== "granted" && <small>One-to-one project email is available; a campaign draft needs recorded marketing consent.</small>}
    </section>
    {emailComposerOpen && <section className="agent-crm-lead-email" aria-label="Compose client email">
      <header><div><span>One-to-one email</span><p>Send directly to {contact.email}. This is recorded in the lead timeline.</p></div><button type="button" onClick={() => setEmailComposerOpen(false)}>Close</button></header>
      <form onSubmit={sendLeadEmail}>
        <ProjectPicker selected={emailProject} compact onChange={(project) => setEmailProject(project)} />
        <label><span>Subject</span><input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} maxLength={200} placeholder="A personal PSR update" required /></label>
        <label><span>Message</span><textarea value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} rows={6} maxLength={3_500} placeholder="Write the personal message for this client…" required /></label>
        <button disabled={working || busy}>Send client email</button>
      </form>
    </section>}
    <section className="agent-crm-record-notes" aria-labelledby={`contact-notes-${contact.id}`}>
      <header><div><span id={`contact-notes-${contact.id}`}>Private notes</span><p>{isMetaLead ? "Capture qualification, context and the next step for this Meta Lead." : "Keep the relationship context and next step current."}</p></div><button type="button" onClick={() => void saveNotes()} disabled={working || busy || notes === contact.notes}>{working ? "Saving…" : "Save notes"}</button></header>
      <textarea aria-label={`Private notes for ${contact.fullName}`} rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add the latest qualification details, call outcome or next step…" />
    </section>
    {message && <p className="agent-action-status" role="status">{message}</p>}
    {error && <p className="agent-form-error" role="alert">{error}</p>}

    <div className="agent-crm-record-sections">
      <section>
        <header><span>Pipeline</span><strong>{detail.opportunities.length}</strong></header>
        <div className="agent-crm-mini-list">{detail.opportunities.map((opportunity) => {
          const assignedProject = opportunity.projectSlug ? projectForOpportunity(opportunity) : null;
          return <article key={opportunity.id} className="agent-crm-opportunity-card"><div><b>{metaLeadCopy(opportunity.title)}</b><small>{titleCase(opportunity.stage)} · {opportunity.probability}% probability</small></div><strong>{money(opportunity.estimatedValueAed)}</strong><div className="agent-crm-opportunity-project"><ProjectPicker selected={assignedProject} compact onChange={(project) => void updateOpportunityProject(opportunity, project)} /><button type="button" onClick={() => assignedProject && composeProjectEmail(assignedProject)} disabled={!assignedProject}>Send project</button></div></article>;
        })}</div>
        <form onSubmit={createOpportunity}>
          <label><span>Opportunity title</span><input value={opportunityTitle} onChange={(event) => setOpportunityTitle(event.target.value)} placeholder="Client objective or property" required /></label>
          <div><label><span>Stage</span><select value={opportunityStage} onChange={(event) => setOpportunityStage(event.target.value as OpportunityStage)}>{openOpportunityStages.map((stage) => <option key={stage} value={stage}>{titleCase(stage)}</option>)}</select></label><label><span>Value (AED)</span><input type="number" min="0" step="1000" value={opportunityValue} onChange={(event) => setOpportunityValue(event.target.value)} placeholder="0" /></label></div>
          <label><span>Project or property reference</span><input value={projectReference} onChange={(event) => setProjectReference(event.target.value)} placeholder="Optional" /></label>
          <button disabled={working || busy}>Add opportunity</button>
        </form>
      </section>

      <section>
        <header><span>Follow-ups</span><strong>{detail.tasks.filter((task) => task.status === "open").length} open</strong></header>
        <div className="agent-crm-mini-list">{detail.tasks.slice(0, 8).map((task) => <article key={task.id} data-state={task.status}><div><b>{task.title}</b><small>{titleCase(task.priority)} · {dateLabel(task.dueAt, true)}</small></div><strong>{titleCase(task.status)}</strong></article>)}</div>
        <form onSubmit={createTask}>
          <label><span>Task</span><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Call, viewing, documents…" required /></label>
          <div><label><span>Due</span><input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} /></label><label><span>Priority</span><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as CrmTask["priority"])}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div>
          <button disabled={working || busy}>Create follow-up</button>
        </form>
      </section>

      <section className="agent-crm-timeline-section">
        <header><span>Comments & activity</span><strong>{detail.activities.length}</strong></header>
        <form onSubmit={createActivity}>
          <div><label><span>Type</span><select value={activityType} onChange={(event) => setActivityType(event.target.value)}><option value="note">Comment</option><option value="call">Call</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="meeting">Meeting</option><option value="viewing">Viewing</option></select></label><label><span>Subject</span><input value={activitySubject} onChange={(event) => setActivitySubject(event.target.value)} placeholder="What happened?" required /></label></div>
          <label><span>Details</span><textarea rows={3} value={activityBody} onChange={(event) => setActivityBody(event.target.value)} placeholder="Comment, outcome and next action" /></label>
          <button disabled={working || busy}>{activityType === "note" ? "Add comment" : "Log activity"}</button>
        </form>
        <ol className="agent-crm-timeline">{detail.activities.map((activity) => <li key={activity.id}><span>{titleCase(activity.type)}</span><div><strong>{metaLeadCopy(activity.subject)}</strong>{activity.body && <p>{metaLeadCopy(activity.body)}</p>}<small>{dateLabel(activity.occurredAt, true)} · {activity.actorEmail}</small></div></li>)}</ol>
      </section>
    </div>
    {contact.status !== "archived" && <button type="button" className="agent-crm-archive" onClick={() => void archiveContact()} disabled={working || busy}>Archive client record</button>}
  </aside>;
}

function MetaLeadDrawer({
  detail,
  advisors,
  isAdmin,
  busy,
  onClose,
  onRefresh,
  onCreateCampaignForContact,
}: {
  detail: ContactDetail;
  advisors: Advisor[];
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onRefresh: (contactId?: string) => Promise<void>;
  onCreateCampaignForContact: (contact: CrmContact) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="agent-crm-meta-lead-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="agent-crm-meta-lead-drawer" role="dialog" aria-modal="true" aria-label={`${detail.contact.fullName} Meta Lead record`}>
      <ContactEditor key={`${detail.contact.id}:${detail.contact.updatedAt}`} detail={detail} advisors={advisors} isAdmin={isAdmin} busy={busy} onClose={onClose} onRefresh={onRefresh} onCreateCampaignForContact={onCreateCampaignForContact} />
    </div>
  </div>;
}

function BotSpaceDesk({
  teamScope,
  onOpenContact,
  refreshVersion,
}: {
  teamScope: boolean;
  onOpenContact: (contactId: string) => void;
  refreshVersion: number;
}) {
  const [presentation, setPresentation] = useState<"list" | "kanban">("list");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ contacts: CrmContactResult; opportunities: CrmOpportunity[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movingContactId, setMovingContactId] = useState("");
  const [dropTarget, setDropTarget] = useState<OpportunityStage | "">("");
  const [projectFilter, setProjectFilter] = useState<CrmProjectOption | null>(waslParkGateProject);
  const [editingProjectId, setEditingProjectId] = useState("");
  const [canDrag, setCanDrag] = useState(false);
  const lastDraggedLead = useRef<{ contactId: string; endedAt: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const scope = teamScope ? "&scope=team" : "";
      const [contacts, opportunities] = await Promise.all([
        crmApi<CrmContactResult>(`/api/agent/crm/contacts?source=botspace&page=${page}&pageSize=100${scope}`),
        crmApi<CrmOpportunityResult>(`/api/agent/crm/opportunities?source=botspace&page=1&pageSize=100${scope}`),
      ]);
      setResult({ contacts, opportunities: opportunities.opportunities });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load Meta Leads.");
    } finally { setLoading(false); }
  }, [page, teamScope]);

  useEffect(() => { void load(); }, [load, refreshVersion]);
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanDrag(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const opportunitiesByContact = useMemo(() => new Map((result?.opportunities || []).map((opportunity) => [opportunity.contactId, opportunity])), [result?.opportunities]);
  const pipelineFor = (contact: CrmContact) => opportunitiesByContact.get(contact.id);
  const stageFor = (contact: CrmContact): OpportunityStage => pipelineFor(contact)?.stage || (contact.status === "lost" ? "lost" : contact.status === "won" ? "won" : "new");
  const projectFor = (contact: CrmContact) => projectForOpportunity(pipelineFor(contact));
  const visibleContacts = useMemo(() => (result?.contacts.contacts || []).filter((contact) => !projectFilter || projectFor(contact).slug === projectFilter.slug), [projectFilter, result?.contacts.contacts, opportunitiesByContact]);
  const groupedContacts = useMemo(() => botSpacePipelineStages.reduce<Record<OpportunityStage, CrmContact[]>>((groups, { stage }) => {
    groups[stage] = visibleContacts.filter((contact) => stageFor(contact) === stage);
    return groups;
  }, {} as Record<OpportunityStage, CrmContact[]>), [opportunitiesByContact, projectFilter, visibleContacts]);

  async function moveDeal(contact: CrmContact, stage: OpportunityStage, selectedProject = projectFor(contact)) {
    const opportunity = pipelineFor(contact);
    const projectChanged = Boolean(opportunity && projectFor(contact).slug !== selectedProject.slug);
    if (opportunity?.stage === stage && !projectChanged) return;
    setMovingContactId(contact.id); setError("");
    try {
      if (opportunity) {
        await crmApi(`/api/agent/crm/opportunities/${opportunity.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...(opportunity.stage === stage ? {} : { stage }),
            ...(projectChanged ? { projectSlug: selectedProject.slug, propertyReference: selectedProject.name } : {}),
          }),
        });
      } else {
        await crmApi("/api/agent/crm/opportunities", {
          method: "POST",
          body: JSON.stringify({
            contactId: contact.id,
            title: `${contact.fullName} — Meta Lead enquiry`,
            kind: "purchase",
            stage,
            projectSlug: selectedProject.slug,
            propertyReference: selectedProject.name,
            bedrooms: contact.tags.filter((tag) => tag.startsWith("bedroom-")).map((tag) => tag.slice("bedroom-".length).replaceAll("-", " ")),
            notes: contact.notes,
          }),
        });
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The deal stage could not be updated.");
    } finally { setMovingContactId(""); setDropTarget(""); }
  }

  function beginDrag(event: DragEvent<HTMLElement>, contact: CrmContact) {
    if (!canDrag) return;
    setMovingContactId(contact.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", contact.id);
  }

  function openLeadCard(event: MouseEvent<HTMLElement>, contact: CrmContact, now: number) {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, label, a")) return;
    const lastDrag = lastDraggedLead.current;
    if (lastDrag?.contactId === contact.id && now - lastDrag.endedAt < 450) {
      lastDraggedLead.current = null;
      return;
    }
    onOpenContact(contact.id);
  }

  function leadCard(contact: CrmContact) {
    const opportunity = pipelineFor(contact);
    const stage = stageFor(contact);
    const moving = movingContactId === contact.id;
    const project = projectFor(contact);
    const tags = contact.tags.filter((tag) => !["botspace", legacyMetaLeadProjectSlug, waslParkGateProject.slug].includes(tag));
    return <article key={contact.id} draggable={canDrag && !loading} data-moving={moving ? "" : undefined} onClick={(event) => openLeadCard(event, contact, Date.now())} onDragStart={(event) => beginDrag(event, contact)} onDragEnd={() => { lastDraggedLead.current = { contactId: contact.id, endedAt: Date.now() }; setMovingContactId(""); setDropTarget(""); }}>
      <button type="button" className="agent-crm-meta-lead-open" onClick={() => onOpenContact(contact.id)} aria-label={`Open ${contact.fullName} and update private notes`}><span>{opportunity ? botSpacePipelineStages.find((item) => item.stage === stage)?.label : "New Meta Lead"}</span><strong>{contact.fullName}</strong><small>{contact.email || contact.phone || "No contact details"}</small><small className="agent-crm-meta-lead-open-hint">Open lead · update notes</small></button>
      <div><small>{tags.join(" · ") || "Meta"}</small><small>{contact.updatedAt ? `Updated ${dateLabel(contact.updatedAt, true)}` : ""}</small></div>
      {contact.notes && <p>{metaLeadCopy(contact.notes)}</p>}
      {editingProjectId === contact.id
        ? <div className="agent-crm-meta-lead-project-edit"><ProjectPicker selected={project} compact onChange={(nextProject) => { if (!nextProject) return; setEditingProjectId(""); void moveDeal(contact, stage, nextProject); }} /><button type="button" onClick={() => setEditingProjectId("")}>Cancel</button></div>
        : <button type="button" className="agent-crm-meta-lead-project" onClick={() => setEditingProjectId(contact.id)}><span>Project</span><strong>{project.name}</strong><small>Change</small></button>}
      <label className="agent-crm-botspace-stage-select"><span>Deal stage</span><select aria-label={`Move ${contact.fullName} to deal stage`} value={stage} disabled={Boolean(movingContactId)} onChange={(event) => void moveDeal(contact, event.target.value as OpportunityStage)}>{botSpacePipelineStages.map((item) => <option key={item.stage} value={item.stage}>{item.label}</option>)}</select></label>
    </article>;
  }
  return <section className="agent-crm-botspace" aria-label="Meta Leads">
    <header><div><span>Meta Lead qualification</span><h2>{teamScope ? "Team Meta Leads" : "My Meta Leads"}</h2><p>Meta Leads and their recorded outcomes appear here. The Kanban uses real CRM deal stages—drag a card with a mouse, or use its stage control on touch devices.</p></div><div className="agent-crm-meta-leads-project-context"><ProjectPicker selected={projectFilter} allowAll onChange={(project) => { setPage(1); setProjectFilter(project); }} /><p>These leads are linked to Wasl 1 Park Gate Residences. Search to switch to any active PSR project.</p></div></header>
    <div className="agent-crm-botspace-tools">
      <div><button type="button" data-active={presentation === "list" ? "" : undefined} onClick={() => setPresentation("list")}>List</button><button type="button" data-active={presentation === "kanban" ? "" : undefined} onClick={() => setPresentation("kanban")}>Kanban</button><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    </div>
    {error && <p className="agent-form-error" role="alert">{error}</p>}
    {loading && !result && <div className="agent-crm-loading">Opening Meta Leads…</div>}
    {result && <>
      <p className="agent-crm-botspace-count">{visibleContacts.length.toLocaleString("en-AE")} Meta Lead{visibleContacts.length === 1 ? "" : "s"}{projectFilter ? ` for ${projectFilter.name}` : " across all PSR projects"} · page {result.contacts.page} of {result.contacts.pages}</p>
      {presentation === "list" ? <div className="agent-crm-botspace-list">{visibleContacts.map(leadCard)}</div> : <div className="agent-crm-botspace-kanban">{botSpacePipelineStages.map(({ stage, label }) => <section key={stage} data-drop-target={dropTarget === stage ? "" : undefined} onDragOver={(event) => { if (!canDrag) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(stage); }} onDragLeave={() => setDropTarget("")} onDrop={(event) => { if (!canDrag) return; event.preventDefault(); const contact = visibleContacts.find((item) => item.id === event.dataTransfer.getData("text/plain")); if (contact) void moveDeal(contact, stage); }}><header><span>{label}</span><strong>{groupedContacts[stage].length}</strong></header><div>{groupedContacts[stage].map(leadCard)}</div></section>)}</div>}
      {!visibleContacts.length && <p className="agent-crm-botspace-notice">No Meta Leads are in this project view.</p>}
      {result.contacts.pages > 1 && <div className="agent-crm-botspace-pages"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" disabled={loading || page >= result.contacts.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </>}
  </section>;
}

export function AgentCrm({ user }: { user: AgentUser }) {
  const isAdmin = user.role.toLowerCase() === "admin";
  const [view, setView] = useState<CrmView>("botspace");
  const [teamScope, setTeamScope] = useState(isAdmin);
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selected, setSelected] = useState<ContactDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [leadOwner, setLeadOwner] = useState(user.email);
  const [campaignOwner, setCampaignOwner] = useState(user.email);
  const [campaignTarget, setCampaignTarget] = useState<CrmContact | null>(null);
  const [campaignWorkspace, setCampaignWorkspace] = useState<CampaignWorkspace | null>(null);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [metaLeadsRefreshVersion, setMetaLeadsRefreshVersion] = useState(0);

  const loadWorkspace = useCallback(async (contactId?: string) => {
    setBusy(true); setError("");
    try {
      const scope = isAdmin && teamScope ? "?scope=team" : "";
      const scopeJoin = isAdmin && teamScope ? "&scope=team" : "";
      const [overviewResult, contactsResult, opportunitiesResult, tasksResult, teamResult] = await Promise.all([
        crmApi<CrmOverview>(`/api/agent/crm/overview${scope}`),
        crmApi<{ contacts: CrmContact[] }>(`/api/agent/crm/contacts?pageSize=100${scopeJoin}`),
        crmApi<{ opportunities: CrmOpportunity[] }>(`/api/agent/crm/opportunities?pageSize=100${scopeJoin}`),
        crmApi<{ tasks: CrmTask[] }>(`/api/agent/crm/tasks?pageSize=100${scopeJoin}`),
        crmApi<{ advisors: Advisor[] }>("/api/agent/crm/team"),
      ]);
      setOverview(overviewResult);
      setContacts(contactsResult.contacts);
      setOpportunities(opportunitiesResult.opportunities);
      setTasks(tasksResult.tasks);
      setAdvisors(teamResult.advisors);
      if (contactId) {
        const stillVisible = contactsResult.contacts.some((contact) => contact.id === contactId) || isAdmin;
        setSelected(stillVisible ? await crmApi<ContactDetail>(`/api/agent/crm/contacts/${contactId}`) : null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load the CRM workspace.");
    } finally {
      setBusy(false);
    }
  }, [isAdmin, teamScope]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadWorkspace());
    return () => window.cancelAnimationFrame(frame);
  }, [loadWorkspace]);

  const loadCampaignWorkspace = useCallback(async () => {
    setCampaignBusy(true); setCampaignError("");
    try {
      setCampaignWorkspace(await crmApi<CampaignWorkspace>(`/api/agent/crm/campaigns?ownerEmail=${encodeURIComponent(campaignOwner)}`));
    } catch (reason) {
      setCampaignError(reason instanceof Error ? reason.message : "Unable to open the campaign desk.");
    } finally {
      setCampaignBusy(false);
    }
  }, [campaignOwner]);

  useEffect(() => {
    if (view !== "campaigns") return;
    const frame = window.requestAnimationFrame(() => void loadCampaignWorkspace());
    return () => window.cancelAnimationFrame(frame);
  }, [view, loadCampaignWorkspace]);

  const contactsById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const searchIntent = useSemanticSearch(search, "crm");
  const filteredContacts = useMemo(() => {
    const effectiveStatus = statusFilter || searchIntent.status;
    return contacts.filter((contact) => (!effectiveStatus || contact.status === effectiveStatus) && matchesSemanticIntent(searchIntent, [contact.fullName, contact.email, contact.phone, contact.source, contact.clientType, contact.nationality, contact.preferredLanguage, contact.notes, ...contact.tags]));
  }, [contacts, searchIntent, statusFilter]);

  async function openContact(contactId: string, preserveCurrentView = false) {
    setBusy(true); setError("");
    try {
      setSelected(await crmApi<ContactDetail>(`/api/agent/crm/contacts/${contactId}`));
      if (!preserveCurrentView) setView("contacts");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this client record.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshSelectedContact(contactId?: string) {
    await loadWorkspace(contactId);
    setMetaLeadsRefreshVersion((version) => version + 1);
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError("");
    try {
      const result = await crmApi<ContactDetail>("/api/agent/crm/contacts", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          clientType: form.get("clientType"),
          source: form.get("source"),
          consentStatus: form.get("consentStatus"),
          consentRecordedAt: form.get("consentRecordedAt"),
          consentSource: form.get("consentSource"),
          consentDetail: form.get("consentDetail"),
          notes: form.get("notes"),
          tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
          ownerEmail: form.get("ownerEmail"),
        }),
      });
      setShowNewContact(false);
      setSelected(result);
      await loadWorkspace(result.contact.id);
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the contact.");
      setBusy(false);
    }
  }

  async function updateTask(task: CrmTask, status: "completed" | "cancelled") {
    setBusy(true); setError("");
    try {
      if (status === "cancelled") await crmApi(`/api/agent/crm/tasks/${task.id}`, { method: "DELETE" });
      else await crmApi(`/api/agent/crm/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the follow-up.");
      setBusy(false);
    }
  }

  async function importLead(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await crmApi<ContactDetail & { imported: boolean }>("/api/agent/crm/import-lead", {
        method: "POST",
        body: JSON.stringify({ leadId: Number(leadId), ownerEmail: leadOwner }),
      });
      setLeadId(""); setSelected(result); setView("contacts");
      await loadWorkspace(result.contact.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to import the website lead.");
      setBusy(false);
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCampaignBusy(true); setCampaignError(""); setCampaignMessage("");
    try {
      const result = await crmApi<{ campaign: CrmCampaign; imported: number; validationQueued: number }>("/api/agent/crm/campaigns", {
        method: "POST",
        body: JSON.stringify({
          ownerEmail: campaignOwner,
          campaignName: form.get("campaignName"),
          subject: form.get("subject"),
          previewText: form.get("previewText"),
          message: form.get("message"),
          ctaLabel: form.get("ctaLabel"),
          ctaUrl: form.get("ctaUrl"),
          status: form.get("status"),
          tag: form.get("tag"),
          contactId: campaignTarget?.id || "",
        }),
      });
      setCampaignMessage(campaignTarget
        ? `Draft created for ${campaignTarget.fullName}. ${result.validationQueued ? "Their address is being validated." : "The draft is ready for a test."}`
        : `Draft created for ${result.imported} consented leads. ${result.validationQueued ? `${result.validationQueued} addresses are being validated.` : "The audience is ready for a test."}`);
      formElement.reset();
      setCampaignTarget(null);
      await loadCampaignWorkspace();
    } catch (reason) {
      setCampaignError(reason instanceof Error ? reason.message : "Unable to create this campaign.");
    } finally {
      setCampaignBusy(false);
    }
  }

  async function testCampaign(campaign: CrmCampaign) {
    if (!window.confirm(`Send a private test of “${campaign.name}” to your approved test inbox?`)) return;
    setCampaignBusy(true); setCampaignError(""); setCampaignMessage("");
    try {
      const result = await crmApi<{ testRecipient: string }>(`/api/agent/crm/campaigns/${campaign.id}/test`, {
        method: "POST",
        body: JSON.stringify({ ownerEmail: campaignOwner }),
      });
      setCampaignMessage(`Test sent to ${result.testRecipient}. Review it before launching.`);
      await loadCampaignWorkspace();
    } catch (reason) {
      setCampaignError(reason instanceof Error ? reason.message : "Unable to send the campaign test.");
    } finally {
      setCampaignBusy(false);
    }
  }

  async function sendCampaign(campaign: CrmCampaign) {
    const confirmation = window.prompt(`This will queue ${campaign.eligible} eligible recipients and cannot be undone. Type SEND NOW to continue.`);
    if (confirmation !== "SEND NOW") return;
    setCampaignBusy(true); setCampaignError(""); setCampaignMessage("");
    try {
      const result = await crmApi<{ eligibleRecipients: number }>(`/api/agent/crm/campaigns/${campaign.id}/send`, {
        method: "POST",
        body: JSON.stringify({ ownerEmail: campaignOwner, confirmation }),
      });
      setCampaignMessage(`${result.eligibleRecipients} recipients were accepted into the controlled delivery queue.`);
      await loadCampaignWorkspace();
    } catch (reason) {
      setCampaignError(reason instanceof Error ? reason.message : "Unable to launch this campaign.");
    } finally {
      setCampaignBusy(false);
    }
  }

  function createCampaignForContact(contact: CrmContact) {
    setCampaignTarget(contact);
    setCampaignOwner(contact.ownerEmail);
    setSelected(null);
    setView("campaigns");
  }

  const openTasks = tasks.filter((task) => task.status === "open");
  const totalContacts = overview ? Object.values(overview.contacts).reduce((sum, value) => sum + value, 0) : contacts.length;

  return <section className="agent-crm">
    <div className="agent-tool-intro">
      <div><p className="kicker">Private relationship desk</p><h1>Every client,<br /><em>clearly owned.</em></h1></div>
      <p>Your contacts, opportunities, follow-ups and conversations stay attached to your agent account. Administrators can oversee and reassign the team pipeline.</p>
    </div>

    <div className="agent-crm-toolbar" data-tour="crm-navigation">
      <nav aria-label="CRM sections">{(["botspace", "dashboard", "contacts", "pipeline", "tasks", "campaigns"] as CrmView[]).map((item) => <button type="button" key={item} data-active={view === item ? "" : undefined} onClick={() => setView(item)}>{item === "botspace" ? "Meta Leads" : titleCase(item)}</button>)}</nav>
      {isAdmin && <label><input type="checkbox" checked={teamScope} onChange={(event) => { setSelected(null); setTeamScope(event.target.checked); }} /><span>{teamScope ? "Team CRM" : "My records"}</span></label>}
      {view !== "botspace" && <button type="button" className="agent-crm-primary" onClick={() => { setView("contacts"); setShowNewContact(true); }}>Add client</button>}
    </div>

    {error && <p className="agent-form-error" role="alert">{error}</p>}
    {busy && !overview && <div className="agent-crm-loading">Opening your CRM…</div>}

    {view === "dashboard" && overview && <>
      <div className="agent-crm-metrics" data-tour="crm-overview">
        <article><span>Owned contacts</span><strong>{totalContacts}</strong><small>{overview.contacts.qualified || 0} qualified · {overview.contacts.active || 0} active</small></article>
        <article><span>Open pipeline</span><strong>{money(overview.pipelineTotals.openValueAed)}</strong><small>{overview.pipelineTotals.openCount} opportunities</small></article>
        <article><span>Weighted pipeline</span><strong>{money(overview.pipelineTotals.weightedValueAed)}</strong><small>Probability-adjusted value</small></article>
        <article data-alert={overview.tasks.overdue ? "" : undefined}><span>Follow-ups</span><strong>{overview.tasks.open}</strong><small>{overview.tasks.overdue} overdue · {overview.tasks.dueToday} due today</small></article>
      </div>
      <div className="agent-crm-dashboard-grid">
        <section className="agent-crm-stage-summary" data-tour="crm-pipeline">
          <header><div><span>Opportunity pipeline</span><h2>Where every conversation stands.</h2></div><button type="button" onClick={() => setView("pipeline")}>Open pipeline</button></header>
          <div>{openOpportunityStages.map((stage) => {
            const row = overview.pipeline.find((item) => item.stage === stage);
            const max = Math.max(1, ...overview.pipeline.map((item) => item.valueAed));
            return <article key={stage}><span>{titleCase(stage)}</span><i style={{ "--crm-stage-width": `${Math.max(2, ((row?.valueAed || 0) / max) * 100)}%` } as CSSProperties} /><strong>{money(row?.valueAed || 0)}</strong><small>{row?.count || 0}</small></article>;
          })}</div>
        </section>
        <section className="agent-crm-next-actions" data-tour="crm-tasks">
          <header><span>Next actions</span><button type="button" onClick={() => setView("tasks")}>All tasks</button></header>
          {openTasks.slice(0, 6).map((task) => <article key={task.id}><button type="button" onClick={() => void openContact(task.contactId)}><strong>{task.title}</strong><small>{contactsById.get(task.contactId)?.fullName || "Client"} · {dateLabel(task.dueAt, true)}</small></button><button type="button" onClick={() => void updateTask(task, "completed")}>Done</button></article>)}
          {!openTasks.length && <p>No open follow-ups. Add the next action from a client record.</p>}
        </section>
      </div>
      <section className="agent-crm-recent">
        <header><span>Recent relationship activity</span><small>{overview.scope === "team" ? "Across the active team" : "Your account only"}</small></header>
        {overview.recentActivities.slice(0, 10).map((activity) => <button type="button" key={activity.id} onClick={() => void openContact(activity.contactId)}><span>{titleCase(activity.type)}</span><strong>{activity.subject}</strong><small>{dateLabel(activity.occurredAt, true)}</small></button>)}
      </section>
      {isAdmin && teamScope && <form className="agent-crm-import" onSubmit={importLead}><div><span>Website lead intake</span><strong>{overview.unimportedWebsiteLeads} consented leads waiting</strong><small>Assign a known website lead ID to an active advisor.</small></div><input type="number" min="1" value={leadId} onChange={(event) => setLeadId(event.target.value)} placeholder="Lead ID" required /><select value={leadOwner} onChange={(event) => setLeadOwner(event.target.value)}>{advisors.map((advisor) => <option key={advisor.email} value={advisor.email}>{advisor.name}</option>)}</select><button disabled={busy}>Import lead</button></form>}
    </>}

    {view === "botspace" && <BotSpaceDesk teamScope={isAdmin && teamScope} refreshVersion={metaLeadsRefreshVersion} onOpenContact={(contactId) => void openContact(contactId, true)} />}

    {view === "contacts" && <div className="agent-crm-contacts-layout">
      <section className="agent-crm-contacts" data-tour="crm-contacts">
        <header><div><span>Client directory</span><strong>{filteredContacts.length} records</strong></div><button type="button" onClick={() => setShowNewContact((current) => !current)}>{showNewContact ? "Close form" : "New client"}</button></header>
        {showNewContact && <form className="agent-crm-new-contact" onSubmit={createContact}>
          <label><span>Full name</span><input name="fullName" maxLength={160} required /></label><label><span>Email</span><input name="email" type="email" /></label><label><span>Phone</span><input name="phone" type="tel" /></label>
          <label><span>Client type</span><select name="clientType" defaultValue="buyer"><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="investor">Investor</option><option value="tenant">Tenant</option><option value="landlord">Landlord</option><option value="other">Other</option></select></label>
          <label><span>Source</span><input name="source" defaultValue="manual" /></label><label><span>Consent</span><select name="consentStatus" defaultValue="unknown"><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="withdrawn">Withdrawn</option></select></label>
          <label><span>Consent date</span><input name="consentRecordedAt" type="datetime-local" /></label><label><span>Consent source</span><input name="consentSource" placeholder="Website form, event, signed form…" /></label>
          <label className="wide"><span>Consent evidence</span><textarea name="consentDetail" rows={2} placeholder="Required when consent is granted: what the client agreed to and how it was captured." /></label>
          {isAdmin && <label><span>Advisor</span><select name="ownerEmail" defaultValue={user.email}>{advisors.map((advisor) => <option key={advisor.email} value={advisor.email}>{advisor.name}</option>)}</select></label>}
          <label className="wide"><span>Tags</span><input name="tags" placeholder="Dubai Islands, investor, 2 bedroom" /></label><label className="wide"><span>Private notes</span><textarea name="notes" rows={3} /></label>
          <button disabled={busy}>Create client record</button>
        </form>}
        <div className="agent-crm-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone or tag" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{contactStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></div>
        <div className="agent-crm-contact-list">{filteredContacts.map((contact) => <button type="button" key={contact.id} data-active={selected?.contact.id === contact.id ? "" : undefined} onClick={() => void openContact(contact.id)}><span data-status={contact.status}>{titleCase(contact.status)}</span><strong>{contact.fullName}</strong><small>{contact.email || contact.phone} · {titleCase(contact.clientType)}</small><b>{money(contact.pipelineValueAed || 0)}</b>{isAdmin && teamScope && <em>{advisors.find((advisor) => advisor.email === contact.ownerEmail)?.name || contact.ownerEmail}</em>}</button>)}</div>
        {!filteredContacts.length && <div className="agent-crm-empty"><span>No matching clients</span><p>Create the first client record or change the filters.</p></div>}
      </section>
      {selected && <ContactEditor key={`${selected.contact.id}:${selected.contact.updatedAt}`} detail={selected} advisors={advisors} isAdmin={isAdmin} busy={busy} onClose={() => setSelected(null)} onRefresh={refreshSelectedContact} onCreateCampaignForContact={createCampaignForContact} />}
    </div>}

    {view === "pipeline" && <section className="agent-crm-pipeline-board" data-tour="crm-pipeline">
      <header><div><span>Sales pipeline</span><strong>{opportunities.length} opportunities</strong></div><small>Open a card to update the full client record.</small></header>
      <div>{openOpportunityStages.map((stage) => {
        const rows = opportunities.filter((opportunity) => opportunity.stage === stage);
          return <section key={stage}><header><span>{titleCase(stage)}</span><strong>{money(rows.reduce((sum, item) => sum + item.estimatedValueAed, 0))}</strong><small>{rows.length}</small></header>{rows.map((opportunity) => <button type="button" key={opportunity.id} onClick={() => void openContact(opportunity.contactId)}><strong>{metaLeadCopy(opportunity.title)}</strong><span>{contactsById.get(opportunity.contactId)?.fullName || "Client"}</span><b>{money(opportunity.estimatedValueAed)}</b><small>{opportunity.probability}% · {opportunity.nextStep || "Next step not set"}</small></button>)}</section>;
      })}</div>
    </section>}

    {view === "tasks" && <section className="agent-crm-tasks" data-tour="crm-tasks">
      <header><div><span>Follow-up desk</span><strong>{openTasks.length} open actions</strong></div><small>Every task remains tied to its client owner.</small></header>
      <div>{tasks.map((task) => <article key={task.id} data-state={task.status} data-priority={task.priority}><button type="button" onClick={() => void openContact(task.contactId)}><span>{titleCase(task.priority)}</span><strong>{task.title}</strong><small>{contactsById.get(task.contactId)?.fullName || "Client"} · {dateLabel(task.dueAt, true)}</small></button><div><b>{titleCase(task.status)}</b>{task.status === "open" && <><button type="button" onClick={() => void updateTask(task, "completed")}>Complete</button><button type="button" onClick={() => void updateTask(task, "cancelled")}>Cancel</button></>}</div></article>)}</div>
      {!tasks.length && <div className="agent-crm-empty"><span>No follow-ups yet</span><p>Open a client record to create a call, viewing or document task.</p></div>}
    </section>}

    {view === "campaigns" && <section className="agent-crm-campaigns" data-tour="crm-campaigns">
      <header className="agent-crm-campaigns-head"><div><span>Agent campaign desk</span><h2>Email your owned leads—with delivery controls intact.</h2><p>Build the audience from your CRM, send yourself a test, then launch through Espacios Mail. Unsubscribes, complaints, invalid addresses, suppressions and the two-day contact cooldown are always excluded.</p></div>{isAdmin && <label><span>Advisor audience</span><select value={campaignOwner} disabled={Boolean(campaignTarget)} onChange={(event) => setCampaignOwner(event.target.value)}>{advisors.map((advisor) => <option key={advisor.email} value={advisor.email}>{advisor.name}</option>)}</select></label>}</header>
      {campaignError && <p className="agent-form-error" role="alert">{campaignError}</p>}
      {campaignMessage && <p className="agent-action-status" role="status">{campaignMessage}</p>}
      {campaignTarget && <div className="agent-crm-campaign-target"><div><span>Single-client campaign draft</span><strong>{campaignTarget.fullName}</strong><small>{campaignTarget.email} · {advisors.find((advisor) => advisor.email === campaignTarget.ownerEmail)?.name || campaignTarget.ownerEmail}</small></div><button type="button" onClick={() => setCampaignTarget(null)}>Use an audience instead</button></div>}
      {campaignWorkspace && <div className="agent-crm-campaign-audience">
        <article><span>CRM records</span><strong>{campaignWorkspace.audience.total}</strong><small>Owned by this advisor</small></article>
        <article><span>Consent-ready</span><strong>{campaignWorkspace.audience.consented}</strong><small>Email + recorded proof</small></article>
        <article><span>Missing consent</span><strong>{campaignWorkspace.audience.missingConsent}</strong><small>Never included automatically</small></article>
        <article><span>Missing email</span><strong>{campaignWorkspace.audience.missingEmail}</strong><small>Follow up another way</small></article>
      </div>}
      <div className="agent-crm-campaign-grid">
        <form className="agent-crm-campaign-form" onSubmit={createCampaign}>
          <header><span>New campaign</span><strong>Create a controlled draft</strong></header>
          <label><span>Internal campaign name</span><input name="campaignName" maxLength={150} placeholder="Dubai Islands investor update" required /></label>
          <label><span>Email subject</span><input name="subject" maxLength={200} placeholder="A private Dubai Islands update for you" required /></label>
          <label><span>Preview line</span><input name="previewText" maxLength={250} placeholder="New launch details, payment plan and availability." /></label>
          <label><span>Message</span><textarea name="message" rows={8} maxLength={8000} placeholder="Write the personal update your leads should receive…" required /></label>
          <div><label><span>Button label</span><input name="ctaLabel" maxLength={80} placeholder="View the project" /></label><label><span>Button link</span><input name="ctaUrl" type="url" placeholder="https://your-domain/projects/..." /></label></div>
          <div><label><span>Relationship status</span><select name="status" defaultValue="" disabled={Boolean(campaignTarget)}><option value="">All active CRM statuses</option>{contactStatuses.filter((item) => !["lost", "archived"].includes(item)).map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label><label><span>Exact tag</span><input name="tag" maxLength={80} disabled={Boolean(campaignTarget)} placeholder="Optional, e.g. investor" /></label></div>
          <button disabled={campaignBusy || (campaignTarget ? (!campaignTarget.email || campaignTarget.consentStatus !== "granted") : !campaignWorkspace?.audience.consented)}>{campaignBusy ? "Preparing…" : campaignTarget ? "Create client campaign draft" : "Create campaign draft"}</button>
          <small>{campaignTarget ? "This draft is limited to the selected client. It must still pass validation, a test send and administrator approval before delivery." : "Creating a draft does not send email. New addresses are validated first."}</small>
        </form>
        <section className="agent-crm-campaign-history">
          <header><span>Campaigns</span><button type="button" onClick={() => void loadCampaignWorkspace()} disabled={campaignBusy}>Refresh</button></header>
          {campaignBusy && !campaignWorkspace && <p>Opening the campaign desk…</p>}
          {campaignWorkspace?.campaigns.map((campaign) => <article key={campaign.id} data-state={campaign.status}>
            <header><div><span>{titleCase(campaign.status)}</span><strong>{campaign.name}</strong><small>{campaign.subject}</small></div><time>{dateLabel(campaign.sentAt || campaign.createdAt, true)}</time></header>
            <div className="agent-crm-campaign-stats"><span><b>{campaign.total}</b> audience</span><span><b>{campaign.eligible}</b> eligible</span><span><b>{campaign.pendingValidation}</b> validating</span><span><b>{campaign.suppressed + campaign.unavailable}</b> excluded</span>{["sending", "sent"].includes(campaign.status) && <><span><b>{campaign.delivered}</b> delivered</span><span><b>{campaign.opened}</b> opened</span><span><b>{campaign.clicked}</b> clicked</span></>}</div>
            <footer><button type="button" onClick={() => void testCampaign(campaign)} disabled={campaignBusy || !["draft", "tested"].includes(campaign.status)}>Send test</button><button type="button" className="agent-crm-campaign-send" onClick={() => void sendCampaign(campaign)} disabled={campaignBusy || campaign.lastTestStatus !== "success" || campaign.pendingValidation > 0 || campaign.eligible < 1 || !["draft", "tested"].includes(campaign.status)}>Send to {campaign.eligible}</button></footer>
            {campaign.pendingValidation > 0 && <p>Email validation is still running. Refresh before sending.</p>}
            {campaign.lastTestStatus !== "success" && ["draft", "tested"].includes(campaign.status) && <p>A successful test is required before the send button unlocks.</p>}
          </article>)}
          {campaignWorkspace && !campaignWorkspace.campaigns.length && <div className="agent-crm-empty"><span>No campaigns yet</span><p>Create the first controlled draft from this advisor’s consented CRM leads.</p></div>}
          {campaignWorkspace?.studioUrl && <a className="agent-crm-campaign-studio" href={campaignWorkspace.studioUrl} target="_blank" rel="noreferrer">Open advanced reporting in Espacios Mail</a>}
        </section>
      </div>
    </section>}
    {selected && view === "botspace" && <MetaLeadDrawer detail={selected} advisors={advisors} isAdmin={isAdmin} busy={busy} onClose={() => setSelected(null)} onRefresh={refreshSelectedContact} onCreateCampaignForContact={createCampaignForContact} />}
  </section>;
}
