"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type presentationShape from "@/data/jumanah-dubai-south-presentation.json";
import { withBasePath } from "@/lib/base-path";
import { reviewedPresentationPhoto } from "@/lib/reviewed-presentation-media";
import "./dubai-south-investor-presentation.css";

export type DubaiSouthPresentation = typeof presentationShape;
type Project = DubaiSouthPresentation["projects"][number];
type Slide = { id: string; section: string; label: string; content: ReactNode };

const PresentationContext = createContext<DubaiSouthPresentation | null>(null);

function usePresentation() {
  const presentation = useContext(PresentationContext);
  if (!presentation) throw new Error("Dubai South presentation data is unavailable.");
  return presentation;
}

const money = (value: number) => `AED ${new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(value)}`;
const compactMoney = (value: number) => value >= 1_000_000
  ? `AED ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 1 : 2)}M`
  : `AED ${Math.round(value / 1_000)}K`;
const percent = (value: number) => `${value.toFixed(2)}%`;
const asset = (path: string) => withBasePath(reviewedPresentationPhoto(path));
const isIncomeAnalysisEligible = (project: Project) => project.incomeAnalysisEligible === true;
const dldLine = (project: Project) => project.acquisitionCostBreakdown.find((item) => /DLD|Oqood/i.test(item.label));

function SectionHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <header className="ds-deck-heading">
    <p>{eyebrow}</p>
    <h2>{title}</h2>
    {copy ? <span>{copy}</span> : null}
  </header>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note?: string; accent?: boolean }) {
  return <div className={`ds-metric${accent ? " is-accent" : ""}`}>
    <small>{label}</small>
    <strong>{value}</strong>
    {note ? <span>{note}</span> : null}
  </div>;
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href) return <span className="ds-source-link is-muted">{children}</span>;
  return <a className="ds-source-link" href={href} target="_blank" rel="noreferrer">{children}<i aria-hidden="true" /></a>;
}

function TextSlide({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return <div className={`ds-text-slide${aside ? " has-aside" : ""}`}>
    <div>
      <SectionHead eyebrow={eyebrow} title={title} />
      {children}
    </div>
    {aside ? <aside>{aside}</aside> : null}
  </div>;
}

function SimpleBars({ title, subtitle, data, sourceLabel, sourceUrl }: DubaiSouthPresentation["marketContext"]["charts"][number]) {
  const maximum = Math.max(...data.map((item) => item.value), 1);
  return <article className="ds-chart-card">
    <header><span>{subtitle}</span><h3>{title}</h3></header>
    <div className="ds-bars">
      {data.map((item) => <div className="ds-bar" key={`${title}-${item.label}`}>
        <div><i style={{ height: `${Math.max(8, (item.value / maximum) * 100)}%` }} /><b>{item.display}</b></div>
        <span>{item.label}</span>
      </div>)}
    </div>
    <SourceLink href={sourceUrl}>{sourceLabel}</SourceLink>
  </article>;
}

function MandateSlide() {
  const presentation = usePresentation();
  return <div className="ds-mandate-slide">
    <SectionHead eyebrow="Client mandate" title="A decision brief with two clearly bounded routes." copy="Every figure is a screening scenario until an exact unit, current inventory and written charges are received." />
    <div className="ds-mandate-grid">
      <article><small>Client</small><h3>{presentation.clientName}</h3><p>International buyer based in {presentation.clientLocation}.</p></article>
      <article><small>Geography</small><h3>Dubai South only</h3><p>Residential District, Emaar South, Expo Living and verified wider-corridor options.</p></article>
      <article><small>Off-plan route</small><h3>AED 1.0M-1.7M all-in</h3><p>Total acquisition budget, including confirmed purchase and handover charges.</p></article>
      <article className="is-accent"><small>Ready route</small><h3>AED 1.2M all-in</h3><p>Maximum including DLD, agency, trustee, NOC, allocation and other confirmed closing costs.</p></article>
    </div>
    <div className="ds-inline-note"><b>Required for every unit</b><span>Payment plan · DLD or written promotion · parking allocation · handover charges · annual service charges · exact net area · completed-property rental evidence where applicable</span></div>
  </div>;
}

function ExecutiveSlide() {
  const presentation = usePresentation();
  return <TextSlide eyebrow="Executive position" title="Decision frame">
    <p className="ds-lead-copy">{presentation.executiveSummary}</p>
    <div className="ds-recommendation"><small>Recommendations</small><p>{presentation.recommendation}</p></div>
  </TextSlide>;
}

function AdvisorSlide() {
  const presentation = usePresentation();
  return <div className="ds-advisor-slide">
    <div className="ds-advisor-photo"><img src={asset(presentation.advisor.profileAvatarUrl)} alt="Jumanah, Managing Partner at PSR Homes" width="880" height="760" /></div>
    <div className="ds-advisor-copy">
      <p className="ds-kicker">Private client advisory</p>
      <h2>{presentation.advisor.name}</h2>
      <h3>{presentation.advisor.title} · PSR Homes</h3>
      <p>{presentation.advisor.profileSummary}</p>
      <div className="ds-advisor-tags">{presentation.advisor.specialties.map((item) => <span key={item}>{item}</span>)}</div>
      <dl><div><dt>Languages</dt><dd>{presentation.advisor.languages.join(" · ")}</dd></div><div><dt>Direct</dt><dd>{presentation.advisor.phone}</dd></div><div><dt>Email</dt><dd>{presentation.advisor.email}</dd></div></dl>
      <p className="ds-company-note">{presentation.companyProfile.legalName} · Dubai RERA ORN {presentation.companyProfile.orn}</p>
    </div>
  </div>;
}

function InvestmentCaseSlide() {
  const presentation = usePresentation();
  return <TextSlide eyebrow="Location thesis" title="Dubai South: investable when the unit works before the upside." aside={<div className="ds-anchor-stack">{presentation.dubaiContext.anchors.map((anchor) => <div key={anchor.label}><small>{anchor.label}</small><strong>{anchor.value}</strong></div>)}</div>}>
    <p className="ds-lead-copy">{presentation.dubaiContext.investmentCase}</p>
    <div className="ds-check-list">{presentation.dubaiContext.viabilityChecks.map((check) => <p key={check}><i aria-hidden="true">&#10003;</i>{check}</p>)}</div>
  </TextSlide>;
}

function MarketSlide() {
  const presentation = usePresentation();
  return <div className="ds-market-slide">
    <SectionHead eyebrow="Dubai-wide context" title="Market depth, shown at its correct geographic scope." copy={`${presentation.marketContext.period}. These indicators support city-level liquidity context; they are not Dubai South project performance.`} />
    <div className="ds-market-headlines">{presentation.marketContext.headline.map((item) => <Metric key={item.label} label={item.label} value={item.display} note={item.note} />)}</div>
    <div className="ds-chart-grid">{presentation.marketContext.charts.slice(0, 2).map((chart) => <SimpleBars key={chart.title} {...chart} />)}</div>
  </div>;
}

function CatalystsSlide() {
  const presentation = usePresentation();
  return <div className="ds-catalyst-slide">
    <SectionHead eyebrow="Growth catalysts" title="Operating demand today; phased infrastructure upside tomorrow." copy="Catalysts strengthen a location case only as delivery, employment and resident use become observable." />
    <div className="ds-catalyst-grid">{presentation.dubaiContext.catalysts.map((item, index) => <article key={item.id}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div><p>{item.category} · {item.status}</p><h3>{item.name}</h3><b>{item.timing}</b><small>{item.summary}</small><em>{item.marketImpact}</em><SourceLink href={item.sourceUrl}>{item.sourceLabel}</SourceLink></div>
    </article>)}</div>
  </div>;
}

function EstablishmentsSlide() {
  const presentation = usePresentation();
  return <div className="ds-establishments-slide">
    <SectionHead eyebrow="Daily-life infrastructure" title="The practical ecosystem around the investment." copy="Proximity wording is retained from the cited source. Exact drive times must be checked from the selected unit." />
    <div className="ds-establishment-grid">{presentation.dubaiContext.establishments.map((place) => <article key={place.name}>
      <p>{place.category}</p><h3>{place.name}</h3><span>{place.proximity}</span><small>{place.community}</small><SourceLink href={place.sourceUrl}>{place.sourceLabel}</SourceLink>
    </article>)}</div>
  </div>;
}

function RentalDemandSlide() {
  const presentation = usePresentation();
  return <div className="ds-demand-slide">
    <SectionHead eyebrow="Rental demand" title="Likely occupier pools, tied to operating economic uses." copy={presentation.areaDemandResearch.evidenceScope} />
    <div className="ds-demand-grid">{presentation.areaDemandResearch.tenantSegments.slice(0, 6).map((segment) => <article key={segment.label}>
      <header><span>{segment.confidence} evidence</span><h3>{segment.label}</h3></header>
      <b>{segment.likelyUnitFit}</b><p>{segment.rationale}</p>
    </article>)}</div>
    <p className="ds-scope-note">These are evidence-based demand segments, not measured shares of Dubai South tenants.</p>
  </div>;
}

function InvestorSlide() {
  const presentation = usePresentation();
  return <div className="ds-investor-slide">
    <SectionHead eyebrow="Investor participation" title="Available demographics—Dubai-wide, clearly labelled." copy="No project-level nationality, age, income or occupation profile is inferred from enquiries or listing activity." />
    <div className="ds-investor-grid">{presentation.areaDemandResearch.investorDemographics.map((item) => <article key={item.label}>
      <small>{item.scope} · {item.period}</small><strong>{item.display}</strong><h3>{item.label}</h3><p>{item.note}</p>
    </article>)}</div>
  </div>;
}

function ProjectMapSlide() {
  const presentation = usePresentation();
  const points = presentation.projects.map((project, index) => {
    const [lat, lng] = project.coordinates.split(",").map(Number);
    return { project, index, lat, lng };
  }).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  const lats = points.map((item) => item.lat);
  const lngs = points.map((item) => item.lng);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  return <div className="ds-map-slide">
    <SectionHead eyebrow="Project geography" title={`${presentation.projects.length} options across distinct Dubai South submarkets.`} copy="Relative-coordinate orientation only—not a surveyed plot map. Open the PSR portfolio map for the full live catalogue." />
    <div className="ds-map-layout">
      <div className="ds-coordinate-map" aria-label="Relative map of selected projects">
        <span className="ds-map-axis is-north">N</span><span className="ds-map-axis is-south">South</span><span className="ds-map-axis is-west">West</span><span className="ds-map-axis is-east">East</span>
        {points.map(({ project, index, lat, lng }) => {
          const left = 7 + ((lng - minLng) / Math.max(maxLng - minLng, .001)) * 86;
          const top = 7 + (1 - (lat - minLat) / Math.max(maxLat - minLat, .001)) * 86;
          return <span className="ds-map-pin" style={{ left: `${left}%`, top: `${top}%` }} key={project.slug} title={project.name}><b>{index + 1}</b></span>;
        })}
      </div>
      <div className="ds-map-directory">{presentation.projects.map((project, index) => <div key={project.slug}><b>{index + 1}</b><span><strong>{project.name}</strong><small>{project.location}</small></span></div>)}</div>
    </div>
    <div className="ds-map-action"><a href={withBasePath("/map")} target="_blank" rel="noreferrer">Open the live PSR UAE portfolio map <span className="ds-open-mark" aria-hidden="true" /></a></div>
  </div>;
}

function CommunitiesSlide() {
  const presentation = usePresentation();
  const communities = new Map<string, NonNullable<Project["community"]>>();
  presentation.projects.forEach((project) => { if (project.community) communities.set(project.community.name, project.community); });
  return <div className="ds-communities-slide">
    <SectionHead eyebrow="Community overview" title="One corridor; four different investment contexts." copy="Community amenities are not transferred to a project outside that exact submarket without a route and access check." />
    <div className="ds-community-grid">{Array.from(communities.values()).map((community) => {
      const count = presentation.projects.filter((project) => project.community?.name === community.name).length;
      return <article key={community.name}><small>{count} selected {count === 1 ? "project" : "projects"}</small><h3>{community.name}</h3><b>{community.descriptor}</b><p>{community.overview}</p><SourceLink href={community.sourceUrl}>{community.sourceLabel}</SourceLink></article>;
    })}</div>
  </div>;
}

function RoiMethodSlide() {
  const presentation = usePresentation();
  const readyNames = presentation.projects.filter(isIncomeAnalysisEligible).map((project) => project.name).join(" and ");
  return <div className="ds-roi-slide">
    <SectionHead eyebrow="Completed-property return methodology" title="ROI is limited to assets that can be leased now." copy={`${readyNames} are the only projects in this brief with rental-return analysis. Off-plan projects are assessed without ROI.`} />
    <div className="ds-formula-grid">
      <article><small>Gross rental ROI</small><strong>Annual rent ÷ unit price</strong><p>Useful for a quick market comparison. It excludes vacancy, service charge, maintenance and acquisition costs.</p></article>
      <article><small>Net ROI</small><strong>Rent less recurring costs ÷ all-in cost</strong><p>A more decision-useful view after annual service charge and other modelled ownership costs.</p></article>
      <article className="is-accent"><small>Occupancy-adjusted net ROI</small><strong>Effective rent less costs ÷ all-in cost</strong><p>The base comparison applies each project&apos;s stated occupancy assumption and is the principal net sensitivity shown.</p></article>
    </div>
    <div className="ds-roi-rule"><b>Evidence rule</b><p>Ready-property scenarios still require the exact unit, current tenancy status, matched lease evidence and confirmed service charges. Infrastructure announcements do not create a rental premium by themselves.</p></div>
  </div>;
}

function CostFrameworkSlide() {
  return <div className="ds-cost-slide">
    <SectionHead eyebrow="Cash requirement" title="Price is only the first line of the decision." copy="Any waiver or DLD discount is recognised only when written into current developer paperwork." />
    <div className="ds-cost-flow">
      <div><span>01</span><small>Unit consideration</small><strong>Agreed unit price</strong></div><i>+</i>
      <div><span>02</span><small>Acquisition</small><strong>DLD / Oqood · admin · agency · trustee · NOC</strong></div><i>+</i>
      <div><span>03</span><small>Handover</small><strong>Balance · connection · deposits · snagging · parking if separate</strong></div><i>=</i>
      <div className="is-accent"><span>04</span><small>True commitment</small><strong>All-in cash requirement</strong></div>
    </div>
    <div className="ds-cap-grid"><article><small>Ready cap</small><strong>AED 1.20M all-in</strong><p>Only MAG 5 Boulevard and a documented Golf Views unit currently pass the modelled cap.</p></article><article><small>Off-plan screen</small><strong>AED 1.70M unit price</strong><p>Fees and future calls remain visible, and projects above AED 1.70M all-in are flagged before shortlisting.</p></article></div>
  </div>;
}

function DldOffersSlide() {
  const presentation = usePresentation();
  return <div className="ds-communities-slide">
    <SectionHead eyebrow="DLD incentive check" title="Marketed waivers are visible; none are assumed." copy={presentation.dldOfferChecks.method} />
    <div className="ds-community-grid">{presentation.dldOfferChecks.marketedProjects.map((offer) => <article key={offer.project}>
      <small>{offer.marketedWaiver} · verify exact unit</small><h3>{offer.project}</h3><b>Marketed offer only</b><p>{offer.note}</p><SourceLink href={offer.sourceUrl}>{offer.sourceLabel}</SourceLink>
    </article>)}</div>
    <div className="ds-inline-note"><b>Standard 4% retained</b><span>{presentation.dldOfferChecks.standardCostProjects.join(" · ")}</span></div>
  </div>;
}

function ProjectMatrix({ projects, part, mode }: { projects: Project[]; part: string; mode: "ready" | "offplan" }) {
  const ready = mode === "ready";
  return <div className="ds-matrix-slide">
    <SectionHead eyebrow={`${ready ? "Completed-property" : "Off-plan"} matrix · ${part}`} title="Comparable inputs, not interchangeable projects." copy={ready ? "Rental returns are planning sensitivities for completed assets only. Availability and commercial terms may change." : "Off-plan decisions are compared on cost, price density, DLD treatment, payment timing and delivery evidence."} />
    <div className="ds-table-wrap"><table><thead><tr><th>Project</th><th>Unit</th><th>All-in</th><th>AED / sqft</th>{ready ? <><th>Gross ROI</th><th>Net ROI</th></> : <><th>DLD treatment</th><th>Payment plan</th></>}<th>Screen</th><th>Mandate</th></tr></thead><tbody>{projects.map((project) => {
      const cap = ready ? 1_200_000 : 1_700_000;
      const dld = dldLine(project);
      return <tr key={project.slug}><td><b>{project.name}</b><small>{project.developer}</small></td><td>{project.bedroom}<small>{project.handover}</small></td><td>{compactMoney(project.allInCost)}</td><td>{money(project.unitPricePerSqft)}</td>{ready ? <><td>{percent(project.grossYield)}</td><td>{percent(project.effectiveNetYield)}</td></> : <><td>{dld?.display || "4% costed"}<small>{project.dldOffer.marketedWaiver}</small></td><td>{project.paymentPlan}</td></>}<td><b>{project.advisoryScreen.total}/100</b><small>{project.advisoryScreen.label}</small></td><td><span className={project.allInCost <= cap ? "is-pass" : "is-review"}>{project.allInCost <= cap ? "Within" : "Review"}</span></td></tr>;
    })}</tbody></table></div>
  </div>;
}

function MediaTile({ src, label, kind, project }: { src?: string; label: string; kind: "photo" | "plan"; project: string }) {
  if (!src) return <div className={`ds-media-tile is-empty is-${kind}`}><span>{label}</span><p>Verified {label.toLowerCase()} imagery is not included in the current source pack.</p></div>;
  return <a className={`ds-media-tile is-${kind}`} href={asset(src)} target="_blank" rel="noreferrer" aria-label={`Open ${project} ${label.toLowerCase()}`}>
    <img src={asset(src)} alt={`${project} — ${label}`} loading="lazy" decoding="async" />
    <span>{label}</span><i aria-hidden="true" />
  </a>;
}

function ProjectSlide({ project, index }: { project: Project; index: number }) {
  const ready = isIncomeAnalysisEligible(project);
  const cap = ready ? 1_200_000 : 1_700_000;
  const upperGross = ready ? project.annualRentHigh / project.unitPrice * 100 : 0;
  const dld = dldLine(project);
  return <div className="ds-project-slide">
    <header className="ds-project-header"><div><p>Project {String(index + 1).padStart(2, "0")} · {ready ? "Ready-income route" : "Off-plan / near-term route"}</p><h2>{project.name}</h2><span>{project.developer} · {project.location}</span></div><div className={project.allInCost <= cap ? "is-pass" : "is-review"}><small>{project.allInCost <= cap ? "Within planning cap" : "Above planning cap"}</small><strong>{project.advisoryScreen.total}/100</strong><span>{project.advisoryScreen.label}</span></div></header>
    <div className="ds-project-body">
      <div className="ds-project-media">
        <MediaTile src={project.media.hero} label="Project view" kind="photo" project={project.name} />
        <MediaTile src={project.media.exteriors[0]} label="Exterior" kind="photo" project={project.name} />
        <MediaTile src={project.media.interiors[0]} label="Interior" kind="photo" project={project.name} />
        <MediaTile src={project.media.floorplans[0]} label="Floor plan" kind="plan" project={project.name} />
      </div>
      <div className="ds-project-analysis">
        <div className="ds-project-metrics">
          <Metric label={`${project.bedroom} scenario`} value={compactMoney(project.unitPrice)} note={`${new Intl.NumberFormat("en-AE").format(project.unitAreaSqft)} sqft`} />
          <Metric label="All-in cost" value={compactMoney(project.allInCost)} note={`${compactMoney(project.acquisitionCosts)} acquisition allowance`} accent />
          <Metric label="Price density" value={`${money(project.unitPricePerSqft)} / sqft`} note={project.priceVsAreaPercent === null ? "Area benchmark unavailable" : `${Math.abs(project.priceVsAreaPercent).toFixed(1)}% ${project.priceVsAreaPercent <= 0 ? "below" : "above"} stored area benchmark`} />
          {ready ? <>
            <Metric label="Annual rent range" value={`${compactMoney(project.annualRentLow)}–${compactMoney(project.annualRentHigh)}`} note={`${project.occupancyRate}% occupancy assumption`} />
            <Metric label="Gross ROI" value={percent(project.grossYield)} note={`Upper-rent sensitivity ${percent(upperGross)}`} />
            <Metric label="Occupancy-adjusted net ROI" value={percent(project.effectiveNetYield)} note={`${money(project.annualServiceCharge)} modelled annual service charge`} accent />
          </> : <>
            <Metric label="Payment structure" value={project.paymentPlan} note="Exact dated calls require current developer paperwork" />
            <Metric label="Handover reference" value={project.handover} note="Confirm against the booking form and regulatory record" />
            <Metric label="DLD treatment" value={dld?.display || "4% costed"} note={project.dldOffer.marketedWaiver} accent />
          </>}
        </div>
        <div className="ds-project-detail-grid">
          <article><small>Payment plan</small><strong>{project.paymentPlan}</strong><p>{project.handover}</p></article>
          <article><small>Project status</small><strong>{project.statusLabel}</strong><p>{project.releaseNote}</p></article>
        </div>
        <div className="ds-project-read"><small>Investment read</small><ul>{project.investmentPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul></div>
      </div>
    </div>
    <footer className="ds-project-footer"><p><b>{ready ? "Rental evidence." : "Unit verification."}</b> {ready ? project.rentalEvidenceNotes : project.confirmationNotes}</p><SourceLink href={project.sourceUrl}>{project.sourceLabel}</SourceLink></footer>
  </div>;
}

function RecommendationsSlide() {
  return <div className="ds-final-recommendations">
    <SectionHead eyebrow="Recommendations" title="Advance the strongest routes; hold the rest to evidence." copy="The ranking supports due diligence sequencing. It does not replace exact-unit inspection, paperwork or live availability." />
    <div className="ds-route-grid">
      <article className="is-accent"><small>Route 01 · Completed property</small><h3>MAG 5 Boulevard</h3><strong>Primary income screening route</strong><p>Advance only where the exact unit, tenancy status and signed closing statement keep the complete acquisition at or below AED 1.20M.</p><span>Emaar Golf Views remains the secondary completed-property route.</span></article>
      <article><small>Route 02 · Balanced off-plan</small><h3>South Square S1</h3><strong>Cash-flow and master-developer balance</strong><p>Competitive modelled price density and a staged payment profile. Current tower, unit, net area and developer payment calls remain mandatory.</p><span>Golf Trails and Windsor House II merit parallel unit-sheet comparison.</span></article>
      <article><small>Route 03 · Written-incentive check</small><h3>Azizi Venice + Enre Residence</h3><strong>Secondary, unit-specific review</strong><p>Advance only where a live unit, confirmed DLD treatment, full payment schedule and handover evidence keep the total commitment within AED 1.70M.</p><span>Proceed only against current, written commercial terms.</span></article>
    </div>
  </div>;
}

function ClosingSlide() {
  const presentation = usePresentation();
  return <div className="ds-closing-slide">
    <div><p className="ds-kicker">PSR private client advisory</p><h2>From shortlist<br />to documented decision.</h2><p>{presentation.confirmation.statement}</p></div>
    <aside><h3>Next verification pack</h3><ol><li>Exact unit and current availability</li><li>Reservation form, SPA and DLD status</li><li>Net area and unit-specific floor plan</li><li>Payment ledger and all dated cash calls</li><li>DLD promotion, parking and handover charges</li><li>Service-charge estimate and matched rental evidence</li></ol><div><strong>{presentation.advisor.name}</strong><span>{presentation.advisor.title} · PSR Homes</span><a href={`mailto:${presentation.advisor.email}`}>{presentation.advisor.email}</a><a href={`tel:${presentation.advisor.phone.replace(/\s/g, "")}`}>{presentation.advisor.phone}</a></div></aside>
  </div>;
}

export function DubaiSouthInvestorPresentation({ presentation }: { presentation: DubaiSouthPresentation }) {
  const slides = useMemo<Slide[]>(() => {
    const readyProjects = presentation.projects.filter(isIncomeAnalysisEligible);
    const offPlanProjects = presentation.projects.filter((project) => !isIncomeAnalysisEligible(project));
    return [
    { id: "cover", section: "Brief", label: "Cover", content: <div className="ds-cover-slide" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,5,7,.92) 0%, rgba(3,5,7,.66) 48%, rgba(3,5,7,.16) 100%), url(${asset(presentation.coverImage)})` }}><div className="ds-cover-copy"><p>PSR private client advisory · 07 September 2026</p><h1>Dubai South</h1><h2>Investor decision brief</h2><div><span>Prepared for</span><strong>{presentation.clientName}</strong><small>{presentation.clientLocation} · {presentation.mandate}</small></div></div><div className="ds-cover-advisor"><img src={asset(presentation.advisor.avatarUrl)} alt="Jumanah, Managing Partner at PSR Homes" width="790" height="790" style={{ width: "clamp(68px, 8vw, 118px)", height: "clamp(68px, 8vw, 118px)" }} /><span><small>Advisor</small><strong>{presentation.advisor.name}</strong><b>{presentation.advisor.title}</b></span></div><p className="ds-cover-credit">Al Wasl Plaza · Expo City Dubai</p></div> },
    { id: "mandate", section: "Brief", label: "Client mandate", content: <MandateSlide /> },
    { id: "decision-frame", section: "Brief", label: "Decision frame", content: <ExecutiveSlide /> },
    { id: "advisor", section: "Brief", label: "Advisor and PSR", content: <AdvisorSlide /> },
    { id: "investment-case", section: "Context", label: "Investment case", content: <InvestmentCaseSlide /> },
    { id: "market", section: "Context", label: "Dubai market", content: <MarketSlide /> },
    { id: "catalysts", section: "Context", label: "Growth catalysts", content: <CatalystsSlide /> },
    { id: "establishments", section: "Context", label: "Daily-life infrastructure", content: <EstablishmentsSlide /> },
    { id: "rental-demand", section: "Context", label: "Rental demand", content: <RentalDemandSlide /> },
    { id: "investor-participation", section: "Context", label: "Investor participation", content: <InvestorSlide /> },
    { id: "project-geography", section: "Context", label: "Project geography", content: <ProjectMapSlide /> },
    { id: "communities", section: "Context", label: "Community overview", content: <CommunitiesSlide /> },
    { id: "roi-method", section: "Method", label: "ROI methodology", content: <RoiMethodSlide /> },
    { id: "cost-framework", section: "Method", label: "Cost framework", content: <CostFrameworkSlide /> },
    { id: "dld-offers", section: "Method", label: "DLD offer check", content: <DldOffersSlide /> },
    { id: "matrix-ready", section: "Comparison", label: "Completed-property matrix", content: <ProjectMatrix projects={readyProjects} part="ready" mode="ready" /> },
    { id: "matrix-offplan-a", section: "Comparison", label: "Off-plan matrix 1", content: <ProjectMatrix projects={offPlanProjects.slice(0, 7)} part="01" mode="offplan" /> },
    { id: "matrix-offplan-b", section: "Comparison", label: "Off-plan matrix 2", content: <ProjectMatrix projects={offPlanProjects.slice(7)} part="02" mode="offplan" /> },
    ...presentation.projects.map((project, index) => ({ id: `project-${project.slug.replace(/^jumanah-dubai-south-/, "")}`, section: "Projects", label: project.name, content: <ProjectSlide project={project} index={index} /> })),
    { id: "recommendations", section: "Decision", label: "Recommendations", content: <RecommendationsSlide /> },
    { id: "next-steps", section: "Decision", label: "Next steps", content: <ClosingSlide /> },
  ];
  }, [presentation]);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((value: number) => {
    const next = Math.min(Math.max(value, 0), slides.length - 1);
    setActive(next);
    setMenuOpen(false);
    window.history.replaceState(null, "", `#${slides[next].id}`);
  }, [slides]);

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const previousColorScheme = root.style.colorScheme;
    const enforcePresentationTheme = () => {
      if (root.dataset.theme !== "dark") root.dataset.theme = "dark";
      if (root.style.colorScheme !== "dark") root.style.colorScheme = "dark";
    };
    enforcePresentationTheme();
    const themeObserver = new MutationObserver(enforcePresentationTheme);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme", "style"] });
    document.body.classList.add("psr-presentation-open");
    const syncHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const found = slides.findIndex((slide) => slide.id === id);
      if (found >= 0) setActive(found);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => {
      themeObserver.disconnect();
      if (previousTheme) root.dataset.theme = previousTheme;
      else delete root.dataset.theme;
      root.style.colorScheme = previousColorScheme;
      document.body.classList.remove("psr-presentation-open");
      window.removeEventListener("hashchange", syncHash);
    };
  }, [slides]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); goTo(active + 1); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); goTo(active - 1); }
      if (event.key === "Home") { event.preventDefault(); goTo(0); }
      if (event.key === "End") { event.preventDefault(); goTo(slides.length - 1); }
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key.toLowerCase() === "m") setMenuOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, slides.length]);

  const activeSlide = slides[active];
  return <PresentationContext.Provider value={presentation}><main className="psr-investor-deck" data-no-translate onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x; const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.3) goTo(active + (dx < 0 ? 1 : -1));
  }}>
    <header className="ds-deck-chrome"><a href={withBasePath("/advisors/jumanah")} className="ds-deck-brand" aria-label="Return to Jumanah profile"><img src={withBasePath("/brand/psr-logo-light.png")} alt="PSR Homes" width="1254" height="1254" /></a><div><span>{activeSlide.section}</span><strong>{activeSlide.label}</strong></div><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="ds-deck-menu"><span>Contents</span><i aria-hidden="true" /></button></header>
    <div className="ds-deck-stage">{slides.map((slide, index) => <section className={`ds-slide${index === active ? " is-active" : ""}`} key={slide.id} id={`slide-${slide.id}`} aria-hidden={index !== active} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}>{slide.content}</section>)}</div>
    <footer className="ds-deck-footer"><button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous slide">&larr;</button><div><span style={{ width: `${((active + 1) / slides.length) * 100}%` }} /></div><p><b>{String(active + 1).padStart(2, "0")}</b> / {String(slides.length).padStart(2, "0")}</p><small>Prices, availability, incentives, charges and completion dates may change.</small><button type="button" onClick={() => goTo(active + 1)} disabled={active === slides.length - 1} aria-label="Next slide">&rarr;</button></footer>
    <aside className={`ds-deck-menu${menuOpen ? " is-open" : ""}`} id="ds-deck-menu" aria-hidden={!menuOpen}><header><p>Dubai South</p><h2>Presentation contents</h2><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close contents">&times;</button></header><nav>{slides.map((slide, index) => <button type="button" key={slide.id} className={index === active ? "is-current" : ""} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, "0")}</span><b>{slide.label}</b><small>{slide.section}</small></button>)}</nav></aside>
    <div className={`ds-deck-scrim${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
    <p className="sr-only" aria-live="polite">Slide {active + 1} of {slides.length}: {activeSlide.label}</p>
  </main></PresentationContext.Provider>;
}
