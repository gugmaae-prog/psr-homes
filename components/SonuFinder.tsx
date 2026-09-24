"use client";

import { FormEvent, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import { sonuPropertyBedroomCombinationIsValid } from "@/lib/sonu-chat";
import type { SonuFinderPreferences, SonuRecommendation } from "@/lib/sonu-finder";

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Mansion"];
const BEDROOMS = ["Studio", "1 bedroom", "2 bedrooms", "3 bedrooms", "4 bedrooms", "5+ bedrooms", "Not sure"];
const EMIRATES = ["Any emirate", "Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman"];
const TIMELINES = ["Immediately", "Within 3 months", "Within 6 months", "This year", "Exploring"];
const FINANCING = [
  ["cash", "Cash purchase"],
  ["mortgage", "UAE mortgage"],
  ["mixed", "Cash and finance"],
  ["not-sure", "Not decided"],
] as const;
const BUDGETS = [
  ["under-1m", "Under AED 1m"],
  ["1m-2m", "AED 1–2m"],
  ["2m-5m", "AED 2–5m"],
  ["5m-10m", "AED 5–10m"],
  ["10m-plus", "AED 10m+"],
] as const;

const INITIAL: SonuFinderPreferences = {
  goal: "unsure",
  propertyTypes: [],
  bedrooms: "",
  household: "not-sure",
  lifestyle: "full-community",
  priorities: [],
  budget: "1m-2m",
  emirate: "Any emirate",
  timeline: "Exploring",
  financing: "not-sure",
  investmentStrategy: "balanced",
  goldenVisaInterest: false,
};

type FinderResponse = {
  error?: string;
  recommendations?: SonuRecommendation[];
  briefDownloadUrl?: string;
  briefSent?: boolean;
};

function finderResponse(value: unknown): FinderResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    error: typeof record.error === "string" ? record.error : undefined,
    briefDownloadUrl: typeof record.briefDownloadUrl === "string" ? record.briefDownloadUrl : undefined,
    briefSent: typeof record.briefSent === "boolean" ? record.briefSent : undefined,
    recommendations: Array.isArray(record.recommendations)
      ? record.recommendations.filter((item): item is SonuRecommendation => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return false;
        const candidate = item as Record<string, unknown>;
        return typeof candidate.slug === "string"
          && typeof candidate.title === "string"
          && typeof candidate.reason === "string";
      })
      : undefined,
  };
}

function choiceClass(active: boolean) {
  return active ? "sonu-choice is-active" : "sonu-choice";
}

export function SonuFinder({ initialOpen = false }: { initialOpen?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SonuFinderPreferences>(INITIAL);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState<SonuRecommendation[]>([]);
  const [briefDownloadUrl, setBriefDownloadUrl] = useState("");
  const [briefSent, setBriefSent] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const anotherOverlayOpen = useRef(false);
  const activeBrowsingMs = useRef(0);
  const activeTimer = useRef<number | null>(null);

  const announceOverlay = useCallback((isOpen: boolean) => {
    window.dispatchEvent(new CustomEvent("hg:overlay-change", {
      detail: { source: "sonu-finder", open: isOpen },
    }));
  }, []);

  const openFinder = useCallback(() => {
    if (anotherOverlayOpen.current) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    announceOverlay(true);
  }, [announceOverlay]);

  const closeFinder = useCallback(() => {
    setOpen(false);
    announceOverlay(false);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, [announceOverlay]);

  useEffect(() => {
    if (initialOpen) openFinder();
  }, [initialOpen, openFinder]);

  useEffect(() => {
    const path = window.location.pathname;
    if (/\/(?:agent|leads|privacy|terms)(?:\/|$)/.test(path)) return;

    const tick = () => {
      if (
        anotherOverlayOpen.current
        || document.visibilityState !== "visible"
        || !document.hasFocus()
      ) return;
      activeBrowsingMs.current += 1_000;
    };
    activeTimer.current = window.setInterval(tick, 1_000);

    const handleOverlay = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { source?: unknown; open?: unknown } : null;
      if (detail?.source === "sonu-finder") return;
      anotherOverlayOpen.current = detail?.open === true;
    };
    const handleProjectBriefClosed = () => {
      anotherOverlayOpen.current = false;
    };
    const handleOpenRequest = () => openFinder();
    window.addEventListener("hg:overlay-change", handleOverlay);
    window.addEventListener("hg:project-brief-closed", handleProjectBriefClosed);
    window.addEventListener("hg:open-sonu-finder", handleOpenRequest);
    return () => {
      if (activeTimer.current !== null) window.clearInterval(activeTimer.current);
      window.removeEventListener("hg:overlay-change", handleOverlay);
      window.removeEventListener("hg:project-brief-closed", handleProjectBriefClosed);
      window.removeEventListener("hg:open-sonu-finder", handleOpenRequest);
    };
  }, [openFinder]);

  useEffect(() => {
    if (!open) return;
    const releaseScrollLock = lockDocumentScroll();
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFinder();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])',
      )).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      releaseScrollLock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFinder, open]);

  useEffect(() => () => {
    if (open) announceOverlay(false);
  }, [announceOverlay, open]);

  function toggleType(value: string) {
    setAnswers((current) => {
      const propertyTypes = current.propertyTypes.includes(value)
        ? current.propertyTypes.filter((item) => item !== value)
        : [...current.propertyTypes, value];
      return {
        ...current,
        propertyTypes,
        bedrooms: sonuPropertyBedroomCombinationIsValid(propertyTypes, current.bedrooms)
          ? current.bedrooms
          : "",
      };
    });
  }

  function togglePriority(value: string) {
    setAnswers((current) => ({
      ...current,
      priorities: current.priorities.includes(value)
        ? current.priorities.filter((item) => item !== value)
        : [...current.priorities, value].slice(-5),
    }));
  }

  function nextAllowed() {
    if (step === 1) return answers.propertyTypes.length > 0;
    if (step === 2) return Boolean(answers.bedrooms && answers.household);
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(withBasePath("/api/leads"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          consent: data.consent,
          website: data.website,
          source: "sonu-finder",
          deliveryType: "sonu_finder",
          preferences: answers,
          sonuSessionId: (() => {
            try {
              const key = "psr:sonu-chat-session:v2";
              const existing = window.localStorage.getItem(key);
              if (existing) return existing;
              const created = crypto.randomUUID();
              window.localStorage.setItem(key, created);
              return created;
            } catch {
              return crypto.randomUUID();
            }
          })(),
          behaviorSignals: {
            activeSeconds: Math.round(activeBrowsingMs.current / 1_000),
            landingPath: window.location.pathname,
            projectContext: window.location.pathname.startsWith("/projects/")
              ? window.location.pathname.split("/").filter(Boolean).at(-1)
              : "",
          },
        }),
      });
      const result = finderResponse(await response.json().catch(() => null));
      if (!response.ok) throw new Error(result.error || "The shortlist could not be delivered.");
      setRecommendations(result.recommendations || []);
      setBriefDownloadUrl(result.briefDownloadUrl || "");
      setBriefSent(Boolean(result.briefSent));
      setStatus("success");
      setStep(7);
      try { window.sessionStorage.setItem("psr:sonu-finder:completed", "yes"); } catch { /* device storage is optional */ }
      window.dispatchEvent(new CustomEvent("hg:lead-submitted", {
        detail: { source: "sonu-finder", deliveryType: "sonu_finder" },
      }));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "The shortlist could not be delivered.");
      setStatus("error");
    }
  }

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeFinder();
  }

  const familyFocused = answers.household === "children" || answers.household === "planning-family";
  const investorFocused = answers.goal === "investment";
  const priorityOptions = investorFocused
    ? ["High rental yield", "Capital appreciation", "Low service costs", "Short-term rental potential", "Resale liquidity"]
    : familyFocused
      ? ["Schools", "Parks and family space", "Healthcare", "Larger layouts", "Commute"]
      : ["Beach access", "Walkability", "Privacy", "Capital appreciation", "Commute"];

  return <>
    <div className="sonu-finder-modal" hidden={!open} onMouseDown={handleBackdrop}>
      <section
        ref={dialogRef}
        className="sonu-finder-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sonu-finder-title"
      >
        <button ref={closeRef} className="sonu-finder-close" type="button" onClick={closeFinder} aria-label="Close PSR Property Finder"><span aria-hidden="true" /></button>
        <aside className="sonu-finder-aside">
          <p>PSR Property Finder</p>
          <h2 id="sonu-finder-title">Don&rsquo;t know what you are looking for?</h2>
          <strong>Let PSR narrow the right unit for you.</strong>
          <p>One considered question at a time. Your answers shape the projects, locations and evidence an advisor reviews.</p>
          <div className="sonu-finder-progress" aria-label={`Step ${Math.min(step + 1, 7)} of 7`}>
            <span style={{ width: `${Math.min(100, ((step + 1) / 7) * 100)}%` }} />
          </div>
        </aside>
        <div className="sonu-finder-content">
          {step === 0 && <div className="sonu-finder-step">
            <p className="sonu-step-number">01 · Your goal</p>
            <h3>What should this property do for you?</h3>
            <div className="sonu-choice-grid">
              {([
                ["home", "A home", "Daily life, space, schools and access matter most."],
                ["investment", "An investment", "Prioritise transaction evidence, rent, service costs and net yield."],
                ["holiday", "A holiday residence", "Lifestyle, beach access and flexible use lead the search."],
                ["unsure", "I am still deciding", "Keep the search balanced while we learn what matters."],
              ] as const).map(([value, label, note]) => <button key={value} type="button" className={choiceClass(answers.goal === value)} aria-pressed={answers.goal === value} onClick={() => setAnswers((current) => ({ ...current, goal: value }))}><strong>{label}</strong><span>{note}</span></button>)}
            </div>
          </div>}

          {step === 1 && <div className="sonu-finder-step">
            <p className="sonu-step-number">02 · Residence</p>
            <h3>Which property types feel right?</h3>
            <p className="sonu-step-note">Choose one or more. The shortlist can compare different formats.</p>
            <div className="sonu-choice-grid sonu-choice-grid-compact">
              {PROPERTY_TYPES.map((value) => <button key={value} type="button" className={choiceClass(answers.propertyTypes.includes(value))} aria-pressed={answers.propertyTypes.includes(value)} onClick={() => toggleType(value)}><strong>{value}</strong></button>)}
            </div>
          </div>}

          {step === 2 && <div className="sonu-finder-step">
            <p className="sonu-step-number">03 · Space and household</p>
            <h3>How much space should the unit support?</h3>
            <div className="sonu-pill-grid">
              {BEDROOMS.filter((value) => sonuPropertyBedroomCombinationIsValid(answers.propertyTypes, value)).map((value) => <button key={value} type="button" className={choiceClass(answers.bedrooms === value)} aria-pressed={answers.bedrooms === value} onClick={() => setAnswers((current) => ({ ...current, bedrooms: value }))}>{value}</button>)}
            </div>
            <h4>Who should the location work for?</h4>
            <div className="sonu-choice-grid sonu-choice-grid-compact">
              {([
                ["children", "Family with children"],
                ["planning-family", "Planning for a family"],
                ["adults", "Adults only"],
                ["not-sure", "Not decided"],
              ] as const).map(([value, label]) => <button key={value} type="button" className={choiceClass(answers.household === value)} aria-pressed={answers.household === value} onClick={() => setAnswers((current) => ({ ...current, household: value }))}><strong>{label}</strong></button>)}
            </div>
          </div>}

          {step === 3 && <div className="sonu-finder-step">
            <p className="sonu-step-number">04 · Setting</p>
            <h3>What should be outside your door?</h3>
            <div className="sonu-choice-grid">
              {([
                ["beachfront", "Beachfront", "Water, promenade and resort-led living."],
                ["full-community", "A full community", "Schools, parks, shops and daily needs within the wider plan."],
                ["central", "Central city", "Business districts, dining and efficient urban access."],
                ["golf-wellness", "Golf and wellness", "Green outlooks, leisure and quieter resort infrastructure."],
                ["quiet-family", "Quiet family setting", "Space, parks and lower-density surroundings."],
              ] as const).map(([value, label, note]) => <button key={value} type="button" className={choiceClass(answers.lifestyle === value)} aria-pressed={answers.lifestyle === value} onClick={() => setAnswers((current) => ({ ...current, lifestyle: value }))}><strong>{label}</strong><span>{note}</span></button>)}
            </div>
          </div>}

          {step === 4 && <div className="sonu-finder-step">
            <p className="sonu-step-number">05 · Priorities</p>
            <h3>{investorFocused ? "What should the investment analysis emphasise?" : familyFocused ? "What should everyday family life protect?" : "What matters most after the front door?"}</h3>
            <p className="sonu-step-note">Select up to five priorities. These will shape the advisor&rsquo;s validation work.</p>
            <div className="sonu-choice-grid sonu-choice-grid-compact">
              {priorityOptions.map((value) => <button key={value} type="button" className={choiceClass(answers.priorities.includes(value))} aria-pressed={answers.priorities.includes(value)} onClick={() => togglePriority(value)}><strong>{value}</strong></button>)}
            </div>
            <div className="sonu-logic-note">
              {investorFocused
                ? "Your shortlist will favour credible entry pricing and investment-led locations. The advisor must still validate current rent, service costs, vacancy, fees and resale evidence."
                : familyFocused
                  ? "Your shortlist will favour community-led options. The advisor must still check real school routes, healthcare, parks and commute times from the exact building or villa."
                  : "Your shortlist will balance lifestyle, access and long-term value, then identify the facts that still need confirmation."}
            </div>
          </div>}

          {step === 5 && <div className="sonu-finder-step">
            <p className="sonu-step-number">06 · Budget and timing</p>
            <h3>Define a realistic search range.</h3>
            <h4>Purchase budget</h4>
            <div className="sonu-pill-grid">
              {BUDGETS.map(([value, label]) => <button key={value} type="button" className={choiceClass(answers.budget === value)} aria-pressed={answers.budget === value} onClick={() => setAnswers((current) => ({ ...current, budget: value }))}>{label}</button>)}
            </div>
            <div className="sonu-select-grid">
              <label><span>Preferred emirate</span><select value={answers.emirate} onChange={(event) => setAnswers((current) => ({ ...current, emirate: event.target.value }))}>{EMIRATES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>Purchase timeline</span><select value={answers.timeline} onChange={(event) => setAnswers((current) => ({ ...current, timeline: event.target.value }))}>{TIMELINES.map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            <h4>How are you planning to purchase?</h4>
            <div className="sonu-pill-grid">
              {FINANCING.map(([value, label]) => <button key={value} type="button" className={choiceClass(answers.financing === value)} aria-pressed={answers.financing === value} onClick={() => setAnswers((current) => ({ ...current, financing: value }))}>{label}</button>)}
            </div>
            {investorFocused ? <>
              <h4>Primary investment objective</h4>
              <div className="sonu-pill-grid">
                {([["income", "Rental income"], ["growth", "Capital growth"], ["balanced", "Balanced"]] as const).map(([value, label]) => <button key={value} type="button" className={choiceClass(answers.investmentStrategy === value)} aria-pressed={answers.investmentStrategy === value} onClick={() => setAnswers((current) => ({ ...current, investmentStrategy: value }))}>{label}</button>)}
              </div>
            </> : null}
            <label className="sonu-consent sonu-visa-interest"><input type="checkbox" checked={Boolean(answers.goldenVisaInterest)} onChange={(event) => setAnswers((current) => ({ ...current, goldenVisaInterest: event.target.checked }))} /><span>Include the UAE Golden Visa property pathway in my brief.</span></label>
          </div>}

          {step === 6 && <form className="sonu-finder-step sonu-contact" onSubmit={submit}>
            <p className="sonu-step-number">07 · Your shortlist</p>
            <h3>Where should we send your private client brief?</h3>
            <p className="sonu-step-note">Sonu will create a private PDF after you submit this form. You will receive a time-limited download; email delivery follows when the company mailbox is active.</p>
            <label><span>Name</span><input name="name" required autoComplete="name" placeholder="Your full name" /></label>
            <label><span>Email</span><input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" placeholder="+971" /></label>
            <label className="honey" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
            <label className="sonu-consent"><input name="consent" type="checkbox" value="yes" required /><span>I agree to be contacted about this property search and accept the privacy policy.</span></label>
            <button className="sonu-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? "Preparing your private brief..." : "Create my private PDF"}</button>
            <p className="sonu-error" aria-live="polite">{status === "error" ? error : ""}</p>
          </form>}

          {step === 7 && <div className="sonu-finder-step sonu-results">
            <p className="sonu-step-number">Your considered matches</p>
            <h3>Your private brief is ready.</h3>
            <p className="sonu-step-note">{briefSent ? "The PDF has also been sent to your email. " : "Email delivery will become available when the PSR company mailbox is activated. "}These matches are a considered starting point; an advisor will verify live units, exact pricing and current evidence.</p>
            {briefDownloadUrl ? <a className="sonu-download-brief" href={withBasePath(briefDownloadUrl)} download>Download private PDF <span>Available for 24 hours</span></a> : null}
            <div className="sonu-result-list">
              {recommendations.map((project) => <a key={project.slug} href={withBasePath(`/projects/${project.slug}`)}>
                {project.image && <div className="sonu-result-image" style={{ backgroundImage: `url("${project.image.replaceAll('"', "%22")}")` }} aria-hidden="true" />}
                <div><span>{project.area} · {project.price}</span><strong>{project.title}</strong><p>{project.reason}</p></div>
              </a>)}
            </div>
            <button className="sonu-submit" type="button" onClick={closeFinder}>Continue browsing</button>
          </div>}

          {step < 6 && <div className="sonu-step-actions">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
            <button type="button" onClick={() => setStep((current) => Math.min(6, current + 1))} disabled={!nextAllowed()}>Continue</button>
          </div>}
        </div>
      </section>
    </div>
  </>;
}
