import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { Footer, InternalHeader } from "@/components/Chrome";
import { LeadForm } from "@/components/LeadForm";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { PaymentPlan } from "@/components/PaymentPlan";
import { ProjectDocumentAccess } from "@/components/ProjectDocumentAccess";
import { ProjectLeadExperience } from "@/components/ProjectLeadExperience";
import { ProjectGallery } from "@/components/ProjectGallery";
import { RegistryProjectGrid } from "@/components/RegistryProjectGrid";
import { getImportedProject, getProjectIndexTier, getProjectRecord, getRelatedProjectRecords } from "@/lib/imported-projects";
import { parseMoney } from "@/lib/market-pricing";
import { developerSlugFor } from "@/lib/project-catalogue";
import { absoluteSiteUrl, metaDescription, pageMetadata, seoKeywords, SITE_ORIGIN } from "@/lib/seo";
import { communitySlugFor } from "@/lib/taxonomy";
import { withBasePath } from "@/lib/base-path";
import { projectFinanceStatus } from "@/lib/project-finance-status";
import { projectDocumentPreviews } from "@/lib/project-document-previews";
import { resolveProjectDocument } from "@/lib/brochure-access";
import { projectPaymentMilestones, validLaunchPaymentSchedule } from "@/lib/launch-payment-schedule";
import "@/components/launch-project-details.css";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getImportedProject(slug);
  if (!project) return {};
  const url = `${SITE_ORIGIN}/projects/${project.slug}`;
  const title = `${project.title} in ${project.location}`;
  const developerName = project.developerDisplay || project.developer;
  const indexable = getProjectIndexTier(project.slug) !== "C";
  const fallback = `${project.title} in ${project.location}, ${project.emirate} by ${developerName}. Compare ${project.propertyTypes.join(", ") || "residences"}, starting price ${project.price}, payment plan ${project.paymentPlan}, handover ${project.handover} and PSR availability notes.`;
  const description = metaDescription(project.description, fallback, 160);
  return {
    ...pageMetadata(title, description, `/projects/${project.slug}`, project.hero || undefined),
    keywords: seoKeywords(project.title, developerName, project.location, project.emirate, `${project.emirate} property`, `${project.location} property`, project.statusLabel || "UAE real estate", ...project.propertyTypes, ...project.bedrooms, ...project.lifestyles),
    robots: { index: indexable, follow: true },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getImportedProject(slug);
  if (!project) notFound();
  const paymentSchedule = validLaunchPaymentSchedule(project.paymentSchedule);
  const validMilestones = projectPaymentMilestones(project.paymentPlan, paymentSchedule);
  const developerName = project.developerDisplay || project.developer;
  const projectRecord = getProjectRecord(project.slug);
  const projectDocument = projectRecord ? resolveProjectDocument(projectRecord) : null;
  const relatedProjects = getRelatedProjectRecords(project, 3);
  const visiblePricePerSqft = project.pricePerSqft || project.areaPricePerSqft;
  const mortgageStatus = projectFinanceStatus(project.handover, project.statusLabel);
  const initialPrice = parseMoney(project.price);
  const unitOptions = project.unitPricing?.length
    ? [...new Set(project.unitPricing.map((unit) => unit.residence))]
    : project.bedrooms.length ? project.bedrooms : project.propertyTypes;
  const briefBedroomOptions = project.bedrooms.length
    ? [...new Set(project.bedrooms)].slice(0, 8)
    : ["Studio", "1 bedroom", "2 bedrooms", "3 bedrooms", "4+ bedrooms"];
  const unitPrices = (project.unitPricing || []).reduce<Record<string, number>>((prices, unit) => {
    const publishedPrice = parseMoney(unit.startingPrice);
    if (publishedPrice >= 250_000) prices[unit.residence] = publishedPrice;
    return prices;
  }, {});
  const projectUrl = `${SITE_ORIGIN}/projects/${project.slug}`;
  const structuredData = [{ "@context": "https://schema.org", "@type": "ApartmentComplex", "@id": `${projectUrl}#project`, url: projectUrl, name: project.title, description: project.description, image: (project.gallery.length ? project.gallery : project.hero ? [project.hero] : []).map(absoluteSiteUrl), address: { "@type": "PostalAddress", addressLocality: project.location, addressRegion: project.emirate, addressCountry: "AE" }, developer: { "@type": "Organization", name: developerName }, additionalProperty: [{ "@type": "PropertyValue", name: "Handover", value: project.handover }, { "@type": "PropertyValue", name: "Payment plan", value: project.paymentPlan }, { "@type": "PropertyValue", name: "Starting price", value: project.price }, ...(project.statusLabel ? [{ "@type": "PropertyValue", name: "Release status", value: project.statusLabel }] : []), ...(visiblePricePerSqft ? [{ "@type": "PropertyValue", name: visiblePricePerSqft.label, value: visiblePricePerSqft.display }] : [])], ...(projectDocument ? { subjectOf: { "@type": "DigitalDocument", name: `${project.title} ${projectDocument.label.toLowerCase()}`, encodingFormat: "application/pdf", isAccessibleForFree: false, conditionsOfAccess: "Contact details are required to download the complete document." } } : {}) }, { "@context": "https://schema.org", "@type": "WebPage", "@id": `${projectUrl}#webpage`, url: projectUrl, name: `${project.title} in ${project.location}`, description: project.description, about: [{ "@id": `${projectUrl}#project` }, { "@type": "Place", name: project.location }, { "@type": "Organization", name: developerName }] }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Projects", item: `${SITE_ORIGIN}/projects` }, { "@type": "ListItem", position: 2, name: project.title, item: projectUrl }] }];
  return <main className="project-detail"><InternalHeader />
    <section className="project-hero">{project.hero && <img src={project.hero} alt={`${project.title} property view`} />}<div className="project-hero-shade" /><div className="project-hero-copy">{project.statusLabel && <span className="project-release-status">{project.statusLabel}</span>}<div className="project-taxonomy"><Link href={`/communities/${communitySlugFor(project.location)}`}>{project.location}</Link><span>·</span><Link href={`/developers/${developerSlugFor(project.developer)}`}>{developerName}</Link></div><h1>{project.title}</h1><div className="project-hero-actions"><a href="#enquire">Check live availability</a>{projectDocument && <a href="#project-documents">Preview {projectDocument.label.toLowerCase()}</a>}</div></div></section>
    <section className="project-facts"><div><span>Starting price</span><strong>{project.price}</strong></div><div className="silver-fact"><span>Payment plan</span><strong>{project.paymentPlan}</strong></div><div><span>Anticipated handover</span><strong>{project.handover}</strong></div><div><span>Development by</span><strong>{developerName}</strong></div>{visiblePricePerSqft && <div><span>{visiblePricePerSqft.label}</span><strong>{visiblePricePerSqft.display}</strong></div>}</section>
    <section className="project-overview section-pad"><div><p className="kicker">The investment case</p><h2>A new benchmark in<br /><em>{project.emirate} real estate.</em></h2><div className="project-detail-tags">{[...project.propertyTypes, ...project.bedrooms, ...project.lifestyles].map(tag => <span key={tag}>{tag}</span>)}</div></div><div><p className="project-lead">{project.description}</p>{project.overview.slice(0, 2).map(paragraph => <p key={paragraph}>{paragraph}</p>)}<dl className="project-spec-list"><div><dt>Location</dt><dd>{project.location}</dd></div><div><dt>Average size</dt><dd>{project.averageSize}</dd></div></dl></div></section>
    {project.unitPricing && project.unitPricing.length > 0 && <section className="launch-release section-pad">
      <div className="launch-release-heading"><div><p className="kicker">{project.statusLabel || "Release schedule"}</p><h2>Residence pricing,<br /><em>clearly staged.</em></h2></div><p>Compare the published entry point and release requirement for each residence before requesting the live unit statement.</p></div>
      <div className="launch-unit-matrix">
        {project.unitPricing.map((unit) => <article key={unit.residence}><div><span>Residence</span><strong>{unit.residence}</strong></div><div><span>Starting price</span><strong>{unit.startingPrice}</strong></div><div><span>{unit.eoi ? "Expression of interest" : "Indicative area"}</span><strong>{unit.eoi || unit.size || "On request"}</strong></div></article>)}
      </div>
      {project.releaseNote && <p className="launch-release-note">{project.releaseNote}</p>}
    </section>}
    {project.launchDetails && project.launchDetails.length > 0 && <section className="launch-details section-pad" aria-labelledby="launch-details-heading">
      <div className="launch-details-heading"><p className="kicker">Launch information</p><h2 id="launch-details-heading">The release details.</h2></div>
      <div className="launch-details-grid">{project.launchDetails.map((detail) => <article key={detail.title}><h3>{detail.title}</h3><ul>{detail.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
    </section>}
    <ProjectGallery title={project.title} gallery={project.gallery} exteriors={project.exteriors} interiors={project.interiors} floorplans={project.floorplans} />
    <section className="project-literature section-pad">
      <div><p className="kicker">Project literature</p><h2>Every detail,<br /><em>kept together.</em></h2><p>Review the sourced project document, then pair its published facts with live unit availability and the current payment statement.</p></div>
      {projectDocument ? <ProjectDocumentAccess projectSlug={project.slug} projectTitle={project.title} documentLabel={projectDocument.label} documentScope={projectDocument.scope} documentKind={projectDocument.kind} documentPreviewImages={projectDocument.kind === "verified_brochure" ? projectDocumentPreviews(project.slug) : []} /> : <article className="brochure-card">
        <div className="brochure-cover" aria-hidden="true"><img className="brochure-cover-logo" src={withBasePath("/brand/psr-logo-light.png")} alt="" width="1254" height="1254" /><b>{project.title}</b><small>Project brief</small></div>
        <div className="brochure-card-copy">
          <span>Project document pack</span>
          <h3>Request the current brochure and unit pack.</h3>
          <p>A project advisor will provide the latest brochure, plans and availability documents privately when the public release is not available.</p>
          <div><a href="#enquire">Request document pack</a></div>
        </div>
      </article>}
    </section>
    {(project.amenities.length > 0 || project.investmentPoints.length > 0) && <section className="project-essentials section-pad"><div><p className="kicker">Lifestyle and performance</p><h2>Designed to live well.<br /><em>Positioned to perform.</em></h2></div><div>{project.amenities.length > 0 && <div className="amenity-grid">{project.amenities.map((amenity, index) => <div key={amenity}><span>{String(index + 1).padStart(2, "0")}</span><strong>{amenity}</strong></div>)}</div>}{project.investmentPoints.length > 0 && <div className="investment-points"><p className="kicker">Investment perspective</p>{project.investmentPoints.map(point => <p key={point}>{point}</p>)}</div>}</div></section>}
    <section className="payment-section section-pad"><div><p className="kicker light">Capital structure</p><h2>Capital,<br /><em>deployed clearly.</em></h2><p>Terms are shown as supplied for the development and remain subject to unit selection and final developer confirmation.</p></div><PaymentPlan milestones={validMilestones} handover={project.handover} schedule={paymentSchedule} /></section>
    <section className="floorplan-section section-pad"><div><p className="kicker">Residence intelligence</p><h2>Space,<br /><em>measured intelligently.</em></h2><p>Compare layouts, orientation and usable space with an advisor, not simply the headline square footage.</p></div><div className="floorplan-library">{project.floorplans.length ? <><span>Floor-plan collection</span><strong>{project.floorplans.length} {project.floorplans.length === 1 ? "layout" : "layouts"} available</strong><p>Every available plan is included in the organised media library above. Select Floor plans to review each residence layout at full size.</p><a href="#project-media">Review the media library</a></> : <><span>Floor-plan collection</span><strong>Available privately</strong><p>Ask the project desk for the current layout pack and matching unit availability.</p><a href="#enquire">Request floor plans</a></>}</div></section>
    <section className="travel-section section-pad"><div><p className="kicker light">Location advantage</p><h2>Connected to place.<br /><em>Connected to value.</em></h2></div><div className="travel-list">{project.travelTimes.length ? project.travelTimes.map(item => <div key={`${item.minutes}-${item.destination}`}><strong>{item.minutes}</strong><span>minutes to<br />{item.destination}</span></div>) : <><div><strong>UAE</strong><span>{project.location}</span></div><div><strong>Prime</strong><span>{project.emirate} location</span></div></>}</div></section>
    {initialPrice > 0 ? <section className="mortgage-section section-pad"><div><p className="kicker">{mortgageStatus === "off-plan" ? "Off-plan liquidity calculator" : "UAE mortgage calculator and unit schedule"}</p><h2>Model the unit<br /><em>before reservation.</em></h2><p>{mortgageStatus === "off-plan" ? "See the cash required at booking, during construction and at handover, including editable registration, transaction and contingency assumptions." : "Choose the residence configuration, review the updated planning price and test the mortgage against UAE lending limits. Replace the estimate with the selected unit's live price before relying on the result."}</p>{visiblePricePerSqft && <small>{visiblePricePerSqft.note}</small>}</div><MortgageCalculator initialPrice={initialPrice} context={project.title} emirate={project.emirate} propertyStatus={mortgageStatus} unitOptions={unitOptions} residenceTypes={project.propertyTypes} unitPrices={unitPrices} paymentMilestones={validMilestones} handover={project.handover} /></section> : <section className="mortgage-section section-pad pricing-pending" aria-labelledby="pricing-pending-heading"><div><p className="kicker">Pricing pending</p><h2 id="pricing-pending-heading">Plan with the<br /><em>confirmed release terms.</em></h2><p>Published pricing and payment terms are not yet available. Request the official release details and selected unit price from the PSR project desk before preparing a finance plan.</p></div><div><a href="#enquire" className="button">Request pricing and payment details</a></div></section>}
    {relatedProjects.length > 0 && <section className="project-related section-pad"><div className="project-related-heading"><div><p className="kicker">Continue the shortlist</p><h2>Properties selected around this brief.</h2></div><p>Related by community, developer, residence type and investment profile—not simply by popularity.</p></div><RegistryProjectGrid projects={relatedProjects} limit={3} compact /></section>}
    <section id="enquire" className="project-enquire project-enquire-compact section-pad"><div><p className="kicker">Project enquiry</p><h2>Ask about<br /><em>{project.title}.</em></h2><p>Share your details for current availability, verified pricing and the matching project documents.</p></div><LeadForm compact source={`project:${project.slug}`} propertyReference={project.slug} propertyTitle={project.title} /></section>
    <ProjectLeadExperience projectTitle={project.title} source={`project:${project.slug}`} propertyReference={project.slug} bedroomOptions={briefBedroomOptions} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><Footer />
  </main>;
}
