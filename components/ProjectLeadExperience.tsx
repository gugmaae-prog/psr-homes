"use client";

import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { LeadForm } from "@/components/LeadForm";
import { lockDocumentScroll } from "@/lib/document-scroll-lock";

type ProjectLeadExperienceProps = {
  projectTitle: string;
  source: string;
  propertyReference: string;
  bedroomOptions: string[];
};

export function ProjectLeadExperience({
  projectTitle,
  source,
  propertyReference,
  bedroomOptions,
}: ProjectLeadExperienceProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const anotherOverlayOpenRef = useRef(false);

  const announceOverlay = useCallback((isOpen: boolean) => {
    window.dispatchEvent(new CustomEvent("hg:overlay-change", {
      detail: { source: "project-brief", open: isOpen },
    }));
  }, []);

  const openForm = useCallback((automatic = false) => {
    if (automatic && anotherOverlayOpenRef.current) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try { window.sessionStorage.setItem(`hg:project-brief:${propertyReference}`, "shown"); } catch { /* device storage is optional */ }
    setOpen(true);
    announceOverlay(true);
  }, [announceOverlay, propertyReference]);

  const closeForm = useCallback(() => {
    setOpen(false);
    announceOverlay(false);
    window.dispatchEvent(new CustomEvent("hg:project-brief-closed", {
      detail: { propertyReference },
    }));
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, [announceOverlay, propertyReference]);

  useEffect(() => {
    const enquiryLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="#enquire"]'));
    const handleEnquiryClick = (event: Event) => {
      event.preventDefault();
      openForm();
    };
    enquiryLinks.forEach((link) => link.addEventListener("click", handleEnquiryClick));

    const params = new URLSearchParams(window.location.search);
    const openFrame = params.get("enquire") === "1"
      ? window.requestAnimationFrame(() => openForm(false))
      : null;
    let timedOpen: number | null = null;
    let alreadyShown = false;
    try { alreadyShown = window.sessionStorage.getItem(`hg:project-brief:${propertyReference}`) === "shown"; } catch { /* device storage is optional */ }
    if (!alreadyShown && params.get("enquire") !== "1") {
      timedOpen = window.setTimeout(() => openForm(true), 30_000);
    }
    const handleLeadSubmitted = () => {
      if (timedOpen !== null) window.clearTimeout(timedOpen);
      try { window.sessionStorage.setItem(`hg:project-brief:${propertyReference}`, "shown"); } catch { /* device storage is optional */ }
    };
    window.addEventListener("hg:lead-submitted", handleLeadSubmitted);

    return () => {
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      if (timedOpen !== null) window.clearTimeout(timedOpen);
      window.removeEventListener("hg:lead-submitted", handleLeadSubmitted);
      enquiryLinks.forEach((link) => link.removeEventListener("click", handleEnquiryClick));
    };
  }, [openForm, propertyReference]);

  useEffect(() => {
    if (!open) return;
    const releaseScrollLock = lockDocumentScroll();
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeForm();
      if (event.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      releaseScrollLock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeForm, open]);

  useEffect(() => {
    const handleOverlayChange = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; open?: boolean }>).detail;
      if (detail?.source === "project-brief") return;
      anotherOverlayOpenRef.current = detail?.open === true;
      if (!open || !detail?.open) return;
      closeForm();
    };
    window.addEventListener("hg:overlay-change", handleOverlayChange);
    return () => window.removeEventListener("hg:overlay-change", handleOverlayChange);
  }, [closeForm, open]);

  useEffect(() => () => {
    if (open) announceOverlay(false);
  }, [announceOverlay, open]);

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeForm();
  }

  return <>
    <button className="project-enquiry-float" type="button" onClick={() => openForm(false)}>
      <span>Project brief</span>
      Receive it by email
    </button>
    <div className="project-lead-modal" hidden={!open} onMouseDown={handleBackdrop}>
      <section
        ref={dialogRef}
        className="project-lead-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-lead-title"
      >
        <button
          ref={closeButtonRef}
          className="project-lead-close"
          type="button"
          onClick={closeForm}
          aria-label="Close enquiry form"
        >
          <span aria-hidden="true" />
        </button>
        <div className="project-lead-intro">
          <p className="kicker light">Prepared around your unit search</p>
          <h2 id="project-lead-title">Receive a Private Brief about<br /><em>{projectTitle}.</em></h2>
          <p>{projectTitle}</p>
          <ul>
            <li>Residence types and your bedroom preference</li>
            <li>Starting price, payment plan and handover</li>
            <li>Area benchmark and available brochure</li>
          </ul>
        </div>
        <div className="project-lead-form-shell">
          <p>Select the residence you are considering. Your project brief will be emailed immediately.</p>
          <LeadForm
            source={source}
            propertyReference={propertyReference}
            propertyTitle={projectTitle}
            deliveryType="project_brief"
            bedroomOptions={bedroomOptions}
            phoneRequired={false}
            submitLabel="Email my project brief"
            successMessage="Your private project brief has been sent to your email."
          />
        </div>
      </section>
    </div>
  </>;
}
