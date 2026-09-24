"use client";

import { FormEvent, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { cbaCompany } from "@/data/cba-company";

type LeadFormProps = {
  source?: string;
  propertyReference?: string;
  propertyTitle?: string;
  listing?: boolean;
  compact?: boolean;
  deliveryType?: "project_brief";
  bedroomOptions?: string[];
  phoneRequired?: boolean;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: () => void;
};

export function LeadForm({
  source = "general",
  propertyReference,
  propertyTitle,
  listing = false,
  compact = false,
  deliveryType,
  bedroomOptions = [],
  phoneRequired = true,
  submitLabel,
  successMessage,
  onSuccess,
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const listingDetails = listing ? [
      data.intent ? `Objective: ${data.intent}` : "",
      data.community ? `Community / building: ${data.community}` : "",
      data.propertyType ? `Property type: ${data.propertyType}` : "",
      data.timing ? `Preferred timing: ${data.timing}` : "",
    ].filter(Boolean).join("\n") : "";
    const message = [listingDetails, data.message].filter(Boolean).join("\n\n");
    const search = new URLSearchParams(window.location.search);
    const firstLandingPath = window.sessionStorage.getItem("cba_first_landing_path") || `${window.location.pathname}${window.location.search}`;
    window.sessionStorage.setItem("cba_first_landing_path", firstLandingPath);
    const attribution = {
      firstLandingPath,
      landingPath: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      utmSource: search.get("utm_source") || "",
      utmMedium: search.get("utm_medium") || "",
      utmCampaign: search.get("utm_campaign") || "",
      utmTerm: search.get("utm_term") || "",
      utmContent: search.get("utm_content") || "",
    };
    try {
      const response = await fetch(withBasePath("/api/leads"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, message, source, propertyReference, propertyTitle, deliveryType, attribution }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Request failed");
      form.reset();
      setStatus("success");
      window.dispatchEvent(new CustomEvent("hg:lead-submitted", {
        detail: { source, propertyReference, deliveryType: deliveryType || "enquiry" },
      }));
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "");
      setStatus("error");
    }
  }
  return <form className={`lead-form${compact ? " lead-form-compact" : ""}`} onSubmit={submit}>
    <label className="honey" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
    {compact ? <div className="lead-form-compact-fields">
      <label><span>Name</span><input name="name" required autoComplete="name" placeholder="Your full name" /></label>
      <label><span>Email</span><input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
      <label><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" placeholder="+971" /></label>
      <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending..." : "Send enquiry"}</button>
    </div> : <>
      <label><span>Name</span><input name="name" required autoComplete="name" placeholder="Your full name" /></label>
      <div className="form-split"><label><span>Email</span><input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label><span>Phone{phoneRequired ? "" : " (optional)"}</span><input name="phone" type="tel" required={phoneRequired} autoComplete="tel" placeholder="+971" /></label></div>
    </>}
    {deliveryType === "project_brief" && <label><span>Preferred number of bedrooms</span><select name="bedroomPreference" required defaultValue=""><option value="" disabled>Select a residence</option>{bedroomOptions.map((option) => <option key={option} value={option}>{option}</option>)}<option value="Not sure — advise me">Not sure — advise me</option></select></label>}
    {listing && <><div className="form-split"><label><span>Objective</span><select name="intent" required defaultValue=""><option value="" disabled>Select one</option><option value="Sell">Sell</option><option value="Lease">Lease</option><option value="Appraisal first">Appraisal first</option></select></label><label><span>Property type</span><select name="propertyType" required defaultValue=""><option value="" disabled>Select one</option><option>Apartment</option><option>Villa</option><option>Townhouse</option><option>Penthouse</option><option>Commercial</option></select></label></div><label><span>Community and building</span><input name="community" required placeholder="e.g. Dubai Marina, building name" /></label><label><span>Preferred timing</span><select name="timing" defaultValue="Within 30 days"><option>Immediately</option><option>Within 30 days</option><option>Within 3 months</option><option>Exploring options</option></select></label></>}
    {!compact && <label><span>{listing ? "Property notes" : "How can we help?"}</span><textarea name="message" rows={4} placeholder={listing ? "Bedrooms, condition, occupancy and any timing considerations" : "Tell us what you are looking for"} /></label>}
    <label className="consent"><input name="consent" type="checkbox" value="yes" required /><span>I agree to be contacted about my enquiry and accept the privacy policy.</span></label>
    {!compact && <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending..." : submitLabel || (listing ? "Request a private appraisal" : "Send enquiry")}</button>}
    <p className={`form-status ${status}`} aria-live="polite">{status === "success" ? successMessage || "Your enquiry has been delivered to our advisory desk." : status === "error" ? errorMessage || `We couldn't deliver your enquiry. Please call ${cbaCompany.phone}.` : ""}</p>
  </form>;
}
