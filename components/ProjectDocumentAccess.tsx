"use client";

import "./project-document-access.css";
import { FormEvent, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import type { BrochureDocumentScope, ReadyProjectDocument } from "@/lib/brochure-access";

type ProjectDocumentAccessProps = {
  projectSlug: string;
  projectTitle: string;
  documentLabel: string;
  documentScope?: BrochureDocumentScope;
  documentKind?: ReadyProjectDocument["kind"];
  documentPreviewImages?: string[];
};

type BrochureLeadResponse = {
  error?: string;
  brochureDownloadUrl?: string;
};

export function ProjectDocumentAccess({ projectSlug, projectTitle, documentLabel, documentScope = "project", documentKind = "verified_brochure", documentPreviewImages = [] }: ProjectDocumentAccessProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const documentPreviews = [...new Set(documentPreviewImages.filter(Boolean))].slice(0, 3);
  const hasDocumentPreviews = documentPreviews.length > 0;
  const isDossier = documentKind === "psr_dossier";

  async function requestDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const search = new URLSearchParams(window.location.search);
    let firstLandingPath = `${window.location.pathname}${window.location.search}`;
    try {
      firstLandingPath = window.sessionStorage.getItem("cba_first_landing_path") || firstLandingPath;
      window.sessionStorage.setItem("cba_first_landing_path", firstLandingPath);
    } catch {
      // Storage can be unavailable in private or hardened browser contexts.
    }

    try {
      const response = await fetch(withBasePath("/api/leads"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data,
          deliveryType: "brochure_download",
          source: `brochure:${projectSlug}`,
          propertyReference: projectSlug,
          propertyTitle: projectTitle,
          message: `Requested the ${documentLabel}.`,
          attribution: {
            firstLandingPath,
            landingPath: `${window.location.pathname}${window.location.search}`,
            referrer: document.referrer,
            utmSource: search.get("utm_source") || "",
            utmMedium: search.get("utm_medium") || "",
            utmCampaign: search.get("utm_campaign") || "",
            utmTerm: search.get("utm_term") || "",
            utmContent: search.get("utm_content") || "",
          },
        }),
      });
      const result = await response.json().catch(() => null) as BrochureLeadResponse | null;
      if (!response.ok || !result?.brochureDownloadUrl) {
        throw new Error(result?.error || "The project document could not be prepared.");
      }

      const gatedUrl = withBasePath(result.brochureDownloadUrl);
      setDownloadUrl(gatedUrl);
      setStatus("success");
      setMessage("Your download has started. The private link remains available for 15 minutes.");
      form.reset();
      window.dispatchEvent(new CustomEvent("hg:lead-submitted", {
        detail: { source: `brochure:${projectSlug}`, propertyReference: projectSlug, deliveryType: "brochure_download" },
      }));
      const link = document.createElement("a");
      link.href = gatedUrl;
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The project document could not be prepared.");
    }
  }

  return <article id="project-documents" className="brochure-card brochure-access-card" data-available="" data-brochure-status={isDossier ? "psr-sourced" : "verified"} data-document-kind={documentKind} data-document-scope={documentScope}>
    <div className="brochure-preview-panel" data-document-pages={hasDocumentPreviews ? "" : undefined}>
      <div className="brochure-preview-heading"><span>{hasDocumentPreviews ? "Document page preview" : isDossier ? "PSR sourced dossier" : "Verified brochure"}</span><small>{hasDocumentPreviews ? "Reduced page previews" : "PDF ready"}</small></div>
      <div className="brochure-preview-pages" aria-label={hasDocumentPreviews ? `Reduced page previews from the ${projectTitle} document` : `${documentLabel} ready for secure download`}>
        {hasDocumentPreviews ? documentPreviews.map((image, index) => <figure className="brochure-preview-page brochure-preview-actual-page" key={image}>
          <img src={image} alt={`${projectTitle} brochure page ${index + 1} preview`} loading="lazy" />
          <figcaption>Page {String(index + 1).padStart(2, "0")}</figcaption>
        </figure>) : <div className="brochure-preview-placeholder"><div aria-hidden="true"><span>PDF</span><i /><i /><i /></div><strong>{documentLabel}</strong><small>{projectTitle}</small></div>}
      </div>
      <p>{hasDocumentPreviews ? "These are reduced previews of the protected project document. Download the full PDF for readable pages and complete specifications." : isDossier ? "Compiled from PSR's dated catalogue record. Its catalogue provenance and record date are printed inside; this is not a developer-issued brochure." : "The PDF has been checked for delivery. Project photography elsewhere on this page is not presented as a brochure page."}</p>
    </div>
    <div className="brochure-card-copy brochure-access-copy">
      <span>{documentLabel} available</span>
      <h3>{hasDocumentPreviews ? "Preview the pages. Download the complete document." : isDossier ? "A sourced project dossier is ready to download." : "The complete PDF is ready to download."}</h3>
      <p>{hasDocumentPreviews ? "The reduced page preview stays open to everyone. " : isDossier ? "PSR prepared this dated catalogue overview because PSR has not yet verified a public developer PDF for this record. " : "The document status is public; its pages remain protected. "}To download the complete PDF, share a valid email address and phone number so the PSR project desk can support your enquiry.</p>
      {!formOpen && <div><button className="brochure-access-trigger" type="button" onClick={() => setFormOpen(true)}>{isDossier ? "Get project dossier" : "Get brochure"}</button><a href="#enquire">Check live availability</a></div>}
      {formOpen && <form className="brochure-download-gate" onSubmit={requestDownload}>
        <label className="honey" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
        <div className="brochure-gate-fields">
          <label><span>Full name</span><input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name" /></label>
          <label><span>Email</span><input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="you@example.com" /></label>
          <label><span>Phone</span><input name="phone" type="tel" required minLength={7} maxLength={40} pattern="[+0-9(). \\-]{7,40}" autoComplete="tel" placeholder="+971 50 000 0000" /></label>
        </div>
        <label className="consent brochure-gate-consent"><input name="consent" type="checkbox" value="yes" required /><span>I agree to be contacted about this project and accept the privacy policy.</span></label>
        <div className="brochure-gate-actions"><button type="submit" disabled={status === "sending"}>{status === "sending" ? "Preparing download…" : "Download full PDF"}</button><button type="button" onClick={() => setFormOpen(false)} disabled={status === "sending"}>Cancel</button></div>
        <p className={`form-status ${status}`} aria-live="polite">{message}{status === "success" && downloadUrl ? <> <a href={downloadUrl}>Download again</a></> : null}</p>
      </form>}
    </div>
  </article>;
}
