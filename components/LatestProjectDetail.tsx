"use client";

import { useEffect, useState } from "react";
import Link from "@/components/SiteLink";
import { LeadForm } from "@/components/LeadForm";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { PaymentPlan } from "@/components/PaymentPlan";
import { ProjectGallery } from "@/components/ProjectGallery";
import { ProjectLeadExperience } from "@/components/ProjectLeadExperience";
import { withBasePath } from "@/lib/base-path";
import { filterPhotographyAssets, organizeProjectMedia, selectPhotographyAsset } from "@/lib/media-policy";
import { projectFinanceStatus } from "@/lib/project-finance-status";

type LatestProject = {
  slug: string;
  title: string;
  developer: string;
  emirate: string;
  area: string;
  image: string;
  price: string;
  startingPrice: number;
  paymentPlan: string;
  handover: string;
  bedrooms: string[];
  propertyTypes: string[];
  summary: string;
  gallery?: string[];
  exteriors?: string[];
  interiors?: string[];
  floorplans?: string[];
};

function paymentMilestones(plan: string) {
  const parts = plan.split("/").map(Number).filter((part) => Number.isFinite(part) && part > 0 && part <= 100);
  return parts.length >= 2 && parts.reduce((sum, part) => sum + part, 0) === 100 ? parts : [];
}

export default function LatestProjectDetail({ slug }: { slug: string }) {
  const [project, setProject] = useState<LatestProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${withBasePath("/api/project-updates")}?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Project not found");
        return response.json() as Promise<{ project: LatestProject }>;
      })
      .then((payload) => setProject(payload.project))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  if (!project) {
    return <section className="latest-project-empty section-pad">
      <p className="kicker">Latest launch monitor</p>
      <h1>{loading ? "Verifying the latest project release." : "This release is awaiting verification."}</h1>
      <p>Return to the complete UAE catalogue or ask an advisor for current launch availability.</p>
      <div><Link href="/projects">View all projects</Link><Link href="/contact">Speak with an advisor</Link></div>
    </section>;
  }

  const bedroomOptions = project.bedrooms.length
    ? project.bedrooms
    : ["Studio", "1 bedroom", "2 bedrooms", "3 bedrooms", "4+ bedrooms"];
  const milestones = paymentMilestones(project.paymentPlan);
  const projectStatus = projectFinanceStatus(project.handover, "Latest UAE launch");
  const { gallery, exteriors, interiors, floorplans } = organizeProjectMedia({
    ...project, gallery: project.gallery || (project.image ? [project.image] : []),
  });
  const hero = selectPhotographyAsset(project.image, [...gallery, ...exteriors, ...interiors]);
  return <>
    <section className="project-hero">
      <img src={hero} alt={`${project.title} in ${project.area}`} />
      <div className="project-hero-shade" />
      <div className="project-hero-copy">
        <span className="project-release-status">Latest UAE launch</span>
        <div className="project-taxonomy"><span>{project.area}</span><span>·</span><span>{project.developer}</span></div>
        <h1>{project.title}</h1>
        <div className="project-hero-actions"><a href="#enquire">Check live availability</a></div>
      </div>
    </section>
    <section className="project-facts">
      <div><span>Starting price</span><strong>{project.price}</strong></div>
      <div className="gold-fact"><span>Payment plan</span><strong>{project.paymentPlan || "On request"}</strong></div>
      <div><span>Anticipated handover</span><strong>{project.handover || "To be confirmed"}</strong></div>
      <div><span>Development by</span><strong>{project.developer}</strong></div>
    </section>
    <section className="project-overview section-pad">
      <div><p className="kicker">The investment case</p><h2>A new benchmark in<br /><em>{project.emirate} real estate.</em></h2><div className="project-detail-tags">{[...project.propertyTypes, ...project.bedrooms].map((item) => <span key={item}>{item}</span>)}</div></div>
      <div><p className="project-lead">{project.summary}</p><p>Launch data can change between releases. PSR will confirm the available unit, price, payment schedule, floor plan and reservation terms before any decision is made.</p><dl className="project-spec-list"><div><dt>Location</dt><dd>{project.area}</dd></div><div><dt>Residence mix</dt><dd>{project.propertyTypes.join(" · ") || "On request"}</dd></div></dl></div>
    </section>
    <ProjectGallery
      title={project.title}
      gallery={filterPhotographyAssets([hero, ...gallery])}
      exteriors={exteriors}
      interiors={interiors}
      floorplans={floorplans}
    />
    <section className="project-literature section-pad">
      <div><p className="kicker">Project literature</p><h2>Every detail,<br /><em>kept together.</em></h2><p>Pair the project narrative and organised gallery with the current unit, plan and reservation documents.</p></div>
      <article className="brochure-card"><div className="brochure-cover" aria-hidden="true"><img className="brochure-cover-logo" src={withBasePath("/brand/psr-logo-light.png")} alt="" width="1254" height="1254" /><b>{project.title}</b><small>Project brief</small></div><div className="brochure-card-copy"><span>Project document pack</span><h3>Request the current brochure and unit pack.</h3><p>A project advisor will provide the latest brochure, plans and availability documents privately when the public release is still being assembled.</p><div><a href="#enquire">Request document pack</a></div></div></article>
    </section>
    <section className="payment-section section-pad"><div><p className="kicker light">Capital structure</p><h2>Capital,<br /><em>deployed clearly.</em></h2><p>Terms are shown as supplied for the development and remain subject to unit selection and final developer confirmation.</p></div><PaymentPlan milestones={milestones} handover={project.handover} /></section>
    <section className="floorplan-section section-pad"><div><p className="kicker">Residence intelligence</p><h2>Space,<br /><em>measured intelligently.</em></h2><p>Compare layouts, orientation and usable space with an advisor, not simply the headline square footage.</p></div><div className="floorplan-library">{floorplans.length ? <><span>Floor-plan collection</span><strong>{floorplans.length} {floorplans.length === 1 ? "layout" : "layouts"} available</strong><p>Every available plan is included in the organised media library above.</p><a href="#project-media">Review the media library</a></> : <><span>Floor-plan collection</span><strong>Available privately</strong><p>Ask the project desk for the current layout pack and matching unit availability.</p><a href="#enquire">Request floor plans</a></>}</div></section>
    <section className="travel-section section-pad"><div><p className="kicker light">Location advantage</p><h2>Connected to place.<br /><em>Connected to value.</em></h2></div><div className="travel-list"><div><strong>UAE</strong><span>{project.area}</span></div><div><strong>Prime</strong><span>{project.emirate} location</span></div></div></section>
    <section className="mortgage-section section-pad"><div><p className="kicker">{projectStatus === "off-plan" ? "Off-plan liquidity calculator" : "UAE mortgage calculator and unit schedule"}</p><h2>Model the unit<br /><em>before reservation.</em></h2><p>{projectStatus === "off-plan" ? "See the cash required at booking, during construction and at handover, including editable registration, transaction and contingency assumptions." : "Test the purchase against UAE lending limits, then replace the advertised entry point with the selected unit's live price."}</p></div><MortgageCalculator initialPrice={project.startingPrice} context={project.title} emirate={project.emirate} propertyStatus={projectStatus} unitOptions={bedroomOptions} residenceTypes={project.propertyTypes} paymentMilestones={milestones} handover={project.handover} /></section>
    <section id="enquire" className="project-enquire project-enquire-compact section-pad">
      <div><p className="kicker">Project enquiry</p><h2>Ask about<br /><em>{project.title}.</em></h2><p>Share your details for current availability, verified pricing and the matching project documents.</p></div>
      <LeadForm
        compact
        source={`project:${project.slug}`}
        propertyReference={project.slug}
        propertyTitle={project.title}
      />
    </section>
    <ProjectLeadExperience projectTitle={project.title} source={`project:${project.slug}`} propertyReference={project.slug} bedroomOptions={bedroomOptions} />
  </>;
}
