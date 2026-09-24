"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";
import { SG26_SESSIONS, SG26_SOURCE } from "@/lib/sg26";
import styles from "./sg26.module.css";

type RegistrationResponse = {
  error?: string;
};

export function SingaporeRegistration() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState<number | null>(null);
  const displayCountRef = useRef<number | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch(withBasePath("/api/sg26/registrations"), {
        headers: { accept: "application/json" },
      });
      const result = await response.json() as { count?: unknown };
      if (response.ok && typeof result.count === "number" && Number.isFinite(result.count)) {
        setRegistrationCount(Math.max(0, Math.floor(result.count)));
      }
    } catch {
      // The invitation form remains usable if the public aggregate is unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const interval = window.setInterval(() => void refreshCount(), 45_000);
    return () => window.clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (registrationCount === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayCountRef.current = registrationCount;
      setDisplayCount(registrationCount);
      return;
    }
    const start = displayCountRef.current ?? 0;
    const difference = registrationCount - start;
    if (difference === 0) {
      setDisplayCount(registrationCount);
      return;
    }
    const startedAt = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 650);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + difference * eased);
      displayCountRef.current = next;
      setDisplayCount(next);
      if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [registrationCount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const search = new URLSearchParams(window.location.search);
    const firstLandingPath = window.sessionStorage.getItem("cba_first_landing_path")
      || `${window.location.pathname}${window.location.search}`;
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
      const response = await fetch(withBasePath("/api/sg26/registrations"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          website: data.website,
          consent: data.consent,
          session: data.session,
          interest: data.interest,
          budget: data.budget,
          company: data.company,
          notes: data.notes,
          attribution,
        }),
      });
      const result = await response.json().catch(() => null) as RegistrationResponse | null;
      if (!response.ok) throw new Error(result?.error || "Your request could not be submitted.");
      form.reset();
      setStatus("success");
      await refreshCount();
      window.dispatchEvent(new CustomEvent("hg:lead-submitted", {
        detail: { source: SG26_SOURCE, deliveryType: "enquiry" },
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your request could not be submitted.");
      setStatus("error");
    }
  }

  return <div className={styles.registrationPanel}>
    <div className={styles.registrationHeading}>
      <p className={styles.eyebrow}>Private attendance</p>
      <h2>Request your invitation.</h2>
      <p>Share your preferred session and area of interest. The PSR team will confirm attendance directly.</p>
    </div>

    <div className={styles.liveCount}>
      <span className={styles.liveDot} aria-hidden="true" />
      <span aria-hidden="true">{displayCount === null
        ? <span>Registration is now open</span>
        : <span><strong>{displayCount.toLocaleString("en-SG")}</strong> invitation {displayCount === 1 ? "request" : "requests"} received</span>}</span>
      <span className={styles.srOnly} aria-live="polite">{registrationCount === null
        ? "Registration is now open"
        : `${registrationCount.toLocaleString("en-SG")} invitation ${registrationCount === 1 ? "request" : "requests"} received`}</span>
    </div>

    {status === "success" ? <div className={styles.successCard} role="status">
      <span>Request received</span>
      <h3>Thank you. Your invitation is under review.</h3>
      <p>A PSR advisor will contact you through the details provided to confirm your session and share the final event details.</p>
      <button type="button" onClick={() => setStatus("idle")}>Register another guest</button>
    </div> : <form className={styles.form} onSubmit={submit}>
      <label className={styles.honey} aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className={styles.formSplit}>
        <label><span>Full name</span><input name="name" required autoComplete="name" placeholder="Your full name" /></label>
        <label><span>Mobile number</span><input name="phone" required type="tel" autoComplete="tel" inputMode="tel" placeholder="+65" /></label>
      </div>
      <label><span>Email address</span><input name="email" required type="email" autoComplete="email" placeholder="you@example.com" /></label>
      <label><span>Preferred session</span><select name="session" required defaultValue=""><option value="" disabled>Select a date</option>{SG26_SESSIONS.map((session) => <option key={session.id} value={session.id}>{session.day}, {session.date} · {session.time}</option>)}</select></label>
      <div className={styles.formSplit}>
        <label><span>Primary interest</span><select name="interest" required defaultValue=""><option value="" disabled>Select one</option><option>UAE property opportunities</option><option>Business setup</option><option>Family office migration</option><option>A combined UAE strategy</option></select></label>
        <label><span>Property budget</span><select name="budget" defaultValue=""><option value="">Prefer to discuss</option><option>AED 1M–2M</option><option>AED 2M–5M</option><option>AED 5M–10M</option><option>AED 10M+</option><option>Not applicable</option></select></label>
      </div>
      <label><span>Company or family office <small>Optional</small></span><input name="company" autoComplete="organization" placeholder="Organisation name" /></label>
      <label><span>Anything we should prepare? <small>Optional</small></span><textarea name="notes" rows={3} placeholder="Your objectives, preferred property type or UAE plans" /></label>
      <label className={styles.consent}><input name="consent" type="checkbox" value="yes" required /><span>I agree to be contacted about this event and accept the <Link href="/privacy">privacy policy</Link>.</span></label>
      <button className={styles.submitButton} type="submit" disabled={status === "sending"}>{status === "sending" ? "Submitting request…" : "Request my invitation"}<span aria-hidden="true">↗</span></button>
      <p className={`${styles.formStatus} ${status === "error" ? styles.formError : ""}`} aria-live="polite">{status === "error" ? errorMessage : "Attendance is reviewed and confirmed individually."}</p>
    </form>}
  </div>;
}
