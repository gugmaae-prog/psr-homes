"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "@/components/SiteLink";
import { cbaTeamMember } from "@/data/cba-team";
import { jumanahDubaiSouthPortfolio, jumanahReportMethod } from "@/data/jumanah-dubai-south-portfolio";
import { withBasePath } from "@/lib/base-path";
import { preferredScrollBehavior } from "@/lib/scroll-behavior";

type PublicProject = {
  slug: string;
  custom?: true;
  name: string;
  developer: string;
  location: string;
  emirate: string;
  startingPrice: string;
  handover: string;
  positioning: string;
  imageUrl: string;
  projectUrl?: string;
};

type PublicSecondaryUnit = {
  id: string;
  title: string;
  community: string;
  emirate: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: number;
  sizeSqft: number;
  priceAed: number;
  reference: string;
  imageUrl: string;
  photos?: Array<{
    id: string;
    url: string;
    filename: string;
    width: number;
    height: number;
    sortOrder: number;
  }>;
  description: string;
  status: "available" | "under_offer" | "sold" | "leased";
  updatedAt: string;
};

type PublicPropertyFinderListing = {
  id: string;
  url: string;
  reference: string;
  title: string;
  location: string;
  propertyType: string;
  listingType: "sale" | "rent";
  bedrooms: string;
  bathrooms: number;
  sizeSqft: number;
  priceAed: number;
  imageUrl: string;
  listedAt: string;
  featured: boolean;
  fetchedAt: string;
};

type PublicAdvisor = {
  profileKind?: "advisor" | "operations";
  name: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  linkedinUrl: string;
  instagramUrl: string;
  title: string;
  avatarUrl: string;
  headline: string;
  bio: string;
  specialties: string[];
  topDevelopers: string[];
  topProjects: PublicProject[];
  propertyFinder: {
    profileUrl: string;
    agencyUrl?: string;
    brn: string;
    experience: string;
    languages: string[];
    areas: string[];
    verifiedAt: string;
    listings: PublicPropertyFinderListing[];
    sync: {
      status: "pending" | "success" | "failed";
      cachedCount: number;
      totalCount: number;
      lastSyncedAt: string;
    } | null;
  } | null;
  secondaryUnits: PublicSecondaryUnit[];
  portfolioSlug: string;
  sourceProfileUrl?: string;
  updatedAt: string;
};

type ContactIconKind = "email" | "phone" | "whatsapp" | "linkedin" | "instagram";

function staticAdvisor(slug: string): PublicAdvisor | null {
  const member = cbaTeamMember(slug);
  if (!member) return null;
  return {
    profileKind: member.profileKind,
    name: member.name,
    email: member.email,
    phone: member.phone,
    whatsappPhone: member.phone,
    linkedinUrl: "",
    instagramUrl: "",
    title: member.role,
    avatarUrl: member.image,
    headline: member.specialty,
    bio: member.copy,
    specialties: [member.specialty, ...member.languages],
    topDevelopers: member.profileKind === "advisor" ? ["Selected UAE developers"] : [],
    topProjects: member.slug === "jumanah" ? jumanahDubaiSouthPortfolio : [],
    propertyFinder: null,
    secondaryUnits: [],
    portfolioSlug: member.slug,
    sourceProfileUrl: member.sourceUrl,
    updatedAt: "2026-08-09",
  };
}

function ContactIcon({ kind }: { kind: ContactIconKind }) {
  if (kind === "email") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17zM4 7l8 6 8-6" /></svg>;
  if (kind === "phone") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.8 10 8.3 7.9 10c1.2 2.7 3.4 4.9 6.1 6.1l1.7-2.1 4.5 2.8-.9 3.4c-.3.9-1.2 1.5-2.2 1.3C9.7 20.2 3.8 14.3 2.5 6.9c-.2-1 .4-1.9 1.3-2.2z" /></svg>;
  if (kind === "whatsapp") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a8.5 8.5 0 0 0-7.2 13L4 21l5-1.3A8.5 8.5 0 1 0 12 3Zm4.4 12.2c-.2.6-1.2 1.1-1.8 1.2-.5.1-1.2.2-3.5-.8-2.9-1.2-4.8-4.2-5-4.4-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.9-.4h.6c.2 0 .5-.1.7.5l.9 2.2c.1.4.1.6-.1.8l-.7.9c-.2.2-.3.4-.1.7.3.6 1.1 1.7 2.3 2.7 1.6 1.4 2.9 1.8 3.3 2 .3.1.5.1.7-.1l.9-1.1c.2-.3.5-.3.8-.2l2 .9c.4.2.6.3.7.5.1.1.1.7-.1 1.3Z" /></svg>;
  if (kind === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.2v10.3M5 5.3v.2M9.3 18.5v-6c0-2.4 3.2-3.2 4.4-1.2.3.5.3 1.1.3 1.7v5.5M9.3 10v8.5M18.5 18.5v-6.2c0-3.8-4.6-4.7-6.6-2.1" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.7" r=".8" /></svg>;
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatAed(value: number) {
  return `AED ${Math.round(value).toLocaleString("en-AE")}`;
}

function statusLabel(status: PublicSecondaryUnit["status"]) {
  return ({ available: "Available", under_offer: "Under offer", sold: "Sold", leased: "Leased" })[status];
}

const profileLanguageLabels = new Set([
  "arabic",
  "bengali",
  "english",
  "farsi",
  "filipino",
  "french",
  "hindi",
  "malayalam",
  "persian",
  "punjabi",
  "russian",
  "tagalog",
  "tamil",
  "urdu",
]);

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    const label = value.trim();
    const key = label.toLocaleLowerCase("en");
    if (!label || seen.has(key)) return result;
    seen.add(key);
    result.push(label);
    return result;
  }, []);
}

function splitLanguageLabel(value: string) {
  const labels = value.split(/\s*(?:,|\/|·|&|\band\b)\s*/i).filter(Boolean);
  return labels.length > 0 && labels.every((label) => profileLanguageLabels.has(label.toLocaleLowerCase("en")))
    ? labels
    : [];
}

function focusWords(value: string) {
  return new Set(value.toLocaleLowerCase("en").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && word !== "and" && word !== "the" && word !== "psr" && word !== "uae"));
}

function isRepeatedFocus(value: string, selected: string[]) {
  const words = focusWords(value);
  return selected.some((existing) => {
    const existingWords = focusWords(existing);
    if (!words.size || !existingWords.size) return value.toLocaleLowerCase("en") === existing.toLocaleLowerCase("en");
    const shared = [...words].filter((word) => existingWords.has(word)).length;
    return shared / Math.min(words.size, existingWords.size) >= .8;
  });
}

function advisorFocusAreas(advisor: PublicAdvisor) {
  return uniqueLabels([advisor.headline, ...advisor.specialties]).reduce<string[]>((result, value) => {
    if (splitLanguageLabel(value).length || isRepeatedFocus(value, result)) return result;
    result.push(value);
    return result;
  }, []);
}

function PublicSecondaryGallery({ unit }: { unit: PublicSecondaryUnit }) {
  const storedPhotos = unit.photos || [];
  const sources = storedPhotos.length
    ? storedPhotos.map((photo) => ({ id: photo.id, url: photo.url }))
    : unit.imageUrl ? [{ id: "external", url: unit.imageUrl }] : [];
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);
  const activeIndex = Math.min(selected, Math.max(0, sources.length - 1));
  const source = sources[activeIndex];
  useEffect(() => {
    setSelected(0);
    setFailed(false);
  }, [unit.id, storedPhotos.length, unit.imageUrl]);
  useEffect(() => setFailed(false), [source?.url]);

  return <div className="public-secondary-gallery">
    <div className="public-secondary-image">
      {source && !failed
        ? <img src={withBasePath(source.url)} alt={`${unit.title} in ${unit.community}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        : <span>{unit.propertyType}</span>}
      <strong data-status={unit.status}>{statusLabel(unit.status)}</strong>
      {sources.length > 1 && <small>{activeIndex + 1} / {sources.length}</small>}
    </div>
    {sources.length > 1 && <div className="public-secondary-thumbnails" aria-label={`${unit.title} photo gallery`}>
      {sources.map((photo, index) => <button key={photo.id} type="button" aria-label={`Show photo ${index + 1} of ${sources.length}`} aria-current={activeIndex === index} onClick={() => setSelected(index)}>
        <img src={withBasePath(photo.url)} alt="" loading="lazy" decoding="async" />
      </button>)}
    </div>}
  </div>;
}

export function PublicAdvisorPortfolio({ slug }: { slug: string }) {
  const [advisor, setAdvisor] = useState<PublicAdvisor | null>(() => staticAdvisor(slug));
  const [missing, setMissing] = useState(() => !staticAdvisor(slug));
  const [activeSection, setActiveSection] = useState("advisor-overview");
  useEffect(() => {
    fetch(withBasePath(`/api/agent/portfolio/${encodeURIComponent(slug)}?rev=20260907-portfolio-standard`), {
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("not-found");
        return await response.json() as { advisor: PublicAdvisor };
      })
      .then((result) => {
        setAdvisor(result.advisor);
        setMissing(false);
      })
      .catch(() => {
        const fallback = staticAdvisor(slug);
        if (fallback) { setAdvisor(fallback); setMissing(false); }
        else setMissing(true);
      });
  }, [slug]);

  const hasPortfolio = Boolean(advisor && advisor.profileKind !== "operations" && (
    advisor.topProjects.length > 0
    || advisor.propertyFinder?.listings.length
    || advisor.secondaryUnits.length > 0
  ));
  const isJumanah = Boolean(advisor && (
    advisor.portfolioSlug === "jumanah"
    || advisor.portfolioSlug === "jummanah"
    || slug === "jumanah"
    || slug === "jummanah"
  ));

  useEffect(() => {
    if (!advisor) return;
    const sectionIds = ["advisor-overview", "advisor-expertise", ...(isJumanah ? ["advisor-presentation"] : []), ...(hasPortfolio ? ["advisor-portfolio"] : []), "advisor-contact"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    let frame = 0;
    const updateActiveSection = () => {
      const marker = Math.min(window.innerHeight * 0.34, 260);
      let current = sections[0].id;
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= marker) current = section.id;
      });
      setActiveSection(current);
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveSection);
    };
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [advisor, hasPortfolio, isJumanah]);

  if (missing) return <section className="public-advisor-missing"><p className="kicker">Advisor portfolio</p><h1>This portfolio is<br /><em>being prepared.</em></h1><p>Speak with the PSR team for a curated property discussion.</p><Link href="/contact" className="button-light">Speak with an advisor</Link></section>;
  if (!advisor) return <div className="public-advisor-loading">Opening advisor portfolio</div>;
  const isAdvisor = advisor.profileKind !== "operations";
  const rosterMember = cbaTeamMember(slug);
  const focusAreas = advisorFocusAreas(advisor);
  const languages = uniqueLabels([
    ...(rosterMember?.languages || []),
    ...(advisor.propertyFinder?.languages || []),
    ...advisor.specialties.flatMap(splitLanguageLabel),
  ]);
  const contactSubject = isAdvisor ? `Property consultation with ${advisor.name}` : `Contact ${advisor.name} at PSR`;
  const contactPhone = advisor.phone || rosterMember?.phone || "";
  const callHref = contactPhone ? `tel:+${phoneDigits(contactPhone)}` : "";
  const whatsappNumber = phoneDigits(advisor.whatsappPhone || contactPhone);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(isAdvisor ? `Hello ${advisor.name}, I would like to discuss a UAE property opportunity.` : `Hello ${advisor.name}, I would like to get in touch with you at PSR.`)}`
    : "";
  const brokerageRecordUrl = advisor.propertyFinder?.profileUrl || advisor.propertyFinder?.agencyUrl || "";
  const openSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setActiveSection(id);
    window.history.replaceState(null, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
  };

  return <>
    <section className="public-advisor-hero" id="advisor-overview">
      <div className="public-advisor-portrait" data-advisor={slug}>{advisor.avatarUrl ? <img src={withBasePath(advisor.avatarUrl)} alt={`${advisor.name}, ${advisor.title} at PSR`} width="1080" height="1350" /> : <span>{advisor.name.charAt(0)}</span>}</div>
      <div className="public-advisor-intro">
        <p className="kicker">{advisor.title} · PSR</p>
        <h1>{advisor.name}</h1>
        <h2>{advisor.headline}</h2>
        <p>{advisor.bio}</p>
        <dl className="public-advisor-direct-contact" aria-label={`${advisor.name} contact details`}>
          <div><dt>Email</dt><dd><a href={`mailto:${advisor.email}?subject=${encodeURIComponent(contactSubject)}`}>{advisor.email}</a></dd></div>
          {contactPhone && <div><dt>Direct</dt><dd><a href={callHref}>{contactPhone}</a></dd></div>}
        </dl>
        <div className="public-advisor-actions">
          <a href={`mailto:${advisor.email}?subject=${encodeURIComponent(contactSubject)}`}><ContactIcon kind="email" /><span>{advisor.email}</span></a>
          {callHref && <a href={callHref}><ContactIcon kind="phone" /><span>{contactPhone}</span></a>}
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer"><ContactIcon kind="whatsapp" /><span>WhatsApp {advisor.name.split(" ")[0]}</span></a>}
          {advisor.linkedinUrl && <a href={advisor.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`${advisor.name} on LinkedIn`}><ContactIcon kind="linkedin" /><span>LinkedIn</span></a>}
          {advisor.instagramUrl && <a href={advisor.instagramUrl} target="_blank" rel="noreferrer" aria-label={`${advisor.name} on Instagram`}><ContactIcon kind="instagram" /><span>Instagram</span></a>}
        </div>
      </div>
    </section>
    <nav className="public-advisor-tabs" aria-label={`${advisor.name} profile sections`}>
      <a href="#advisor-overview" aria-current={activeSection === "advisor-overview" ? "location" : undefined} onClick={(event) => openSection(event, "advisor-overview")}><span aria-hidden="true">01</span><strong>Overview</strong></a>
      <a href="#advisor-expertise" aria-current={activeSection === "advisor-expertise" ? "location" : undefined} onClick={(event) => openSection(event, "advisor-expertise")}><span aria-hidden="true">02</span><strong>Expertise</strong></a>
      {isJumanah && <a href="#advisor-presentation" aria-current={activeSection === "advisor-presentation" ? "location" : undefined} onClick={(event) => openSection(event, "advisor-presentation")}><span aria-hidden="true">03</span><strong>Presentation</strong></a>}
      {hasPortfolio && <a href="#advisor-portfolio" aria-current={activeSection === "advisor-portfolio" ? "location" : undefined} onClick={(event) => openSection(event, "advisor-portfolio")}><span aria-hidden="true">{isJumanah ? "04" : "03"}</span><strong>Portfolio</strong></a>}
      <a href="#advisor-contact" aria-current={activeSection === "advisor-contact" ? "location" : undefined} onClick={(event) => openSection(event, "advisor-contact")}><span aria-hidden="true">{String(3 + Number(isJumanah) + Number(hasPortfolio)).padStart(2, "0")}</span><strong>Contact</strong></a>
    </nav>
    <section className="public-advisor-expertise section-pad" id="advisor-expertise">
      <header className="public-advisor-expertise-heading">
        <p className="kicker">{isAdvisor ? "Advisory focus" : "Operational focus"}</p>
        <h2>{isAdvisor ? <>UAE expertise,<br /><em>structured for decisions.</em></> : <>Operational expertise,<br /><em>structured for accuracy.</em></>}</h2>
        <p>{isAdvisor ? `A concise view of ${advisor.name}'s active advisory focus, market network and professional record.` : `A concise view of the responsibilities and professional strengths maintained by ${advisor.name}.`}</p>
      </header>
      <div className="public-advisor-expertise-surface">
        <div className="public-advisor-focus">
          <span>Core expertise</span>
          <ol className="public-advisor-focus-list">{focusAreas.map((focus, index) => <li key={focus}><small>{String(index + 1).padStart(2, "0")}</small><p>{focus}</p></li>)}</ol>
        </div>
        <dl className="public-advisor-facts">
        {languages.length > 0 && <div><dt>Languages</dt><dd><span className="public-advisor-language-list">{languages.map((language) => <span key={language}>{language}</span>)}</span></dd></div>}
        {isAdvisor && advisor.topDevelopers.length > 0 && <div><dt>Developer network</dt><dd>{advisor.topDevelopers.join(" · ")}</dd></div>}
        {isAdvisor && advisor.propertyFinder && <>
          {advisor.propertyFinder.brn && <div><dt>Broker registration</dt><dd>BRN {advisor.propertyFinder.brn}</dd></div>}
          {advisor.propertyFinder.experience && <div><dt>Experience record</dt><dd>{advisor.propertyFinder.experience}</dd></div>}
          {advisor.propertyFinder.areas.length > 0 && <div><dt>Areas of activity</dt><dd>{advisor.propertyFinder.areas.join(" · ")}</dd></div>}
          {brokerageRecordUrl && <div><dt>External brokerage record</dt><dd><a href={brokerageRecordUrl} target="_blank" rel="noreferrer">View verified Property Finder record</a></dd></div>}
        </>}
        </dl>
      </div>
    </section>
    {isAdvisor && isJumanah && <section className="public-advisor-expertise public-advisor-report-method section-pad" id="advisor-presentation" aria-labelledby="advisor-report-method-title">
      <header className="public-advisor-expertise-heading">
        <p className="kicker">Investor research framework</p>
        <h2 id="advisor-report-method-title">Dubai South briefs,<br /><em>built for decisions.</em></h2>
        <p>We combine project documentation, unit economics, completed-property rental analysis, off-plan acquisition structures, community infrastructure and source-dated district catalysts across three focused investor reports.</p>
      </header>
      <div className="public-advisor-expertise-surface">
        <div className="public-advisor-focus">
          <span>Brief coverage</span>
          <ol className="public-advisor-focus-list">{jumanahReportMethod.map((item, index) => <li key={item}><small>{String(index + 1).padStart(2, "0")}</small><p>{item}</p></li>)}</ol>
        </div>
        <div className="public-advisor-method-note">
          <p className="kicker">PSR reporting standard</p>
          <h3>Objective, sourced and unit-specific.</h3>
          <p>We present ready and off-plan routes as dated planning cases. Future infrastructure is treated as a demand catalyst, not a guaranteed return.</p>
          <p>Prices, availability, inventory, incentives, fees, service charges, completion dates, rental assumptions and commercial terms may change. We confirm the exact unit and current documents before client issue or reservation.</p>
        </div>
      </div>
      <a href={withBasePath("/advisors/jumanah/dubai-south")} className="public-advisor-presentation-card" aria-label="Open Jumanah's private Dubai South investor presentation">
        <span className="public-advisor-presentation-cover">
          <img src={withBasePath("/presentations/dubai-south-investor-brief/cover/wasl-dome.webp")} alt="Al Wasl Plaza dome at Expo City Dubai" width="1672" height="941" loading="lazy" />
          <span className="public-advisor-presentation-cover-content" aria-hidden="true">
            <img src={withBasePath("/brand/psr-logo-light.png")} alt="" width="1254" height="1254" />
            <span><small>Private client presentation</small><strong>Dubai South</strong><em>Investor decision brief</em></span>
            <b>Private access</b>
          </span>
        </span>
        <span className="public-advisor-presentation-copy"><span><small>Prepared by Jumanah · PSR Homes</small><strong>Three considered budget routes</strong><p>Ready homes up to AED 1.2M · Off-Plan (Under Construction) below AED 1.7M · Off-Plan (Under Construction) above AED 1.7M · Detailed payment schedules, fees and project galleries</p></span><em>Enter access code <i aria-hidden="true" /></em></span>
      </a>
    </section>}
    {isAdvisor && advisor.topProjects.length > 0 && <section className="public-advisor-projects section-pad" id="advisor-portfolio">
      <header><div><p className="kicker">Selected portfolio</p><h2>{isJumanah ? <>Dubai South<br /><em>project review.</em></> : <>Projects worth<br /><em>a closer look.</em></>}</h2></div><p>Availability, prices, inventory, incentives, fees, completion dates and terms may change. We confirm the selected unit and current documents before a client decision or reservation.</p></header>
      <div className="psr-card-grid">{advisor.topProjects.map((project) => {
        const image = project.imageUrl ? <img src={withBasePath(project.imageUrl)} alt={`${project.name} by ${project.developer}`} loading="lazy" /> : <span className="media-fallback" />;
        const internalHref = `/projects/${project.slug}`;
        return <article className="public-advisor-project-card" key={`${project.custom ? "custom" : "catalogue"}-${project.slug}`}>
          {project.custom
            ? project.projectUrl
              ? <a href={project.projectUrl} target="_blank" rel="noreferrer" className="public-advisor-project-image">{image}<span>View project</span></a>
              : <div className="public-advisor-project-image">{image}</div>
            : <Link href={internalHref} className="public-advisor-project-image">{image}<span>View project</span></Link>}
          <div className="public-advisor-project-content">
            <p className="public-advisor-project-eyebrow">{project.emirate} · {project.developer}</p>
            <h3>{project.custom
              ? project.projectUrl ? <a href={project.projectUrl} target="_blank" rel="noreferrer">{project.name}</a> : project.name
              : <Link href={internalHref}>{project.name}</Link>}
            </h3>
            <p className="public-advisor-project-location">{project.location}</p>
            <dl className="public-advisor-project-facts"><div><dt>Starting from</dt><dd>{project.startingPrice}</dd></div><div><dt>Handover</dt><dd>{project.handover}</dd></div></dl>
          </div>
        </article>;
      })}</div>
    </section>}
    {isAdvisor && advisor.propertyFinder && advisor.propertyFinder.listings.length > 0 && <section className="public-advisor-live-listings section-pad" id={advisor.topProjects.length ? undefined : "advisor-portfolio"}>
      <header>
        <div><p className="kicker">Current listings</p><h2>Available through<br /><em>{advisor.name}.</em></h2></div>
        <div><p>Every property shown here is matched to {advisor.email} and refreshed from the advisor&apos;s verified brokerage record. Price and availability remain subject to final confirmation.</p><a href={advisor.propertyFinder.profileUrl} target="_blank" rel="noreferrer">View all {advisor.propertyFinder.sync?.totalCount || advisor.propertyFinder.listings.length} listings</a></div>
      </header>
      <div className="public-live-listing-grid">{advisor.propertyFinder.listings.map((listing) => <article key={listing.id}>
        <a href={listing.url} target="_blank" rel="noreferrer" className="public-live-listing-image">
          {listing.imageUrl ? <img src={listing.imageUrl} alt={`${listing.propertyType} in ${listing.location}`} loading="lazy" /> : <span>{listing.propertyType}</span>}
          <strong>{listing.listingType === "rent" ? "For rent" : "For sale"}</strong>
        </a>
        <div>
          <span>{listing.location}</span>
          <h3>{listing.title}</h3>
          <p>{formatAed(listing.priceAed)}{listing.listingType === "rent" ? " / year" : ""}</p>
          <dl>
            <div><dt>Type</dt><dd>{listing.propertyType}</dd></div>
            <div><dt>Bedrooms</dt><dd>{listing.bedrooms.toLowerCase() === "studio" ? "Studio" : listing.bedrooms}</dd></div>
            <div><dt>Bathrooms</dt><dd>{listing.bathrooms || "—"}</dd></div>
            <div><dt>Area</dt><dd>{listing.sizeSqft ? `${listing.sizeSqft.toLocaleString("en-AE")} sqft` : "On request"}</dd></div>
          </dl>
          <a href={listing.url} target="_blank" rel="noreferrer">View property</a>
        </div>
      </article>)}</div>
    </section>}
    {isAdvisor && advisor.secondaryUnits.length > 0 && <section className="public-advisor-secondary section-pad" id={!advisor.topProjects.length && !advisor.propertyFinder?.listings.length ? "advisor-portfolio" : undefined}>
      <header><div><p className="kicker">Secondary market portfolio</p><h2>Ready properties,<br /><em>personally maintained.</em></h2></div><p>Unit availability and commercial terms are maintained by {advisor.name}. Confirm the current title documents, condition and transaction terms before commitment.</p></header>
      <div>{advisor.secondaryUnits.map((unit) => {
        const enquiry = `Hello ${advisor.name}, I would like to ask about ${unit.title}${unit.reference ? ` (${unit.reference})` : ""}.`;
        const enquiryHref = whatsappNumber
          ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(enquiry)}`
          : `mailto:${advisor.email}?subject=${encodeURIComponent(`Enquiry: ${unit.title}`)}&body=${encodeURIComponent(enquiry)}`;
        return <article key={unit.id}>
          <PublicSecondaryGallery unit={unit} />
          <div className="public-secondary-copy">
            <span>{unit.community} · {unit.emirate}</span>
            <h3>{unit.title}</h3>
            {unit.description && <p>{unit.description}</p>}
            <dl><div><dt>Price</dt><dd>{formatAed(unit.priceAed)}</dd></div><div><dt>Configuration</dt><dd>{unit.bedrooms} · {unit.bathrooms || "—"} bath</dd></div><div><dt>Internal area</dt><dd>{unit.sizeSqft.toLocaleString("en-AE")} sqft</dd></div><div><dt>Reference</dt><dd>{unit.reference || "On request"}</dd></div></dl>
            <a href={enquiryHref} target={whatsappNumber ? "_blank" : undefined} rel={whatsappNumber ? "noreferrer" : undefined}><ContactIcon kind={whatsappNumber ? "whatsapp" : "email"} /><span>Ask about this unit</span></a>
          </div>
        </article>;
      })}</div>
    </section>}
    <section className="public-advisor-contact" id="advisor-contact">
      <p className="kicker">Start a conversation</p><h2>{isAdvisor ? <>Build a shortlist around<br /><em>your objective.</em></> : <>Connect with the<br /><em>PSR team.</em></>}</h2><p>{isAdvisor ? `Share your budget, preferred location and intended outcome. We will coordinate the next step with ${advisor.name}.` : `Contact ${advisor.name} regarding finance operations and accounting at PSR.`}</p>
      <div className="public-advisor-actions public-advisor-actions-centered">
        <a href={`mailto:${advisor.email}?subject=${encodeURIComponent(contactSubject)}`}><ContactIcon kind="email" /><span>{advisor.email}</span></a>
        {callHref && <a href={callHref}><ContactIcon kind="phone" /><span>{contactPhone}</span></a>}
        {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer"><ContactIcon kind="whatsapp" /><span>WhatsApp {advisor.name.split(" ")[0]}</span></a>}
      </div>
    </section>
  </>;
}
