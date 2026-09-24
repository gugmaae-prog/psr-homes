import { ClientReviews } from "@/components/ClientReviews";
import { Footer, InternalHeader } from "@/components/Chrome";
import { HeroVideo } from "@/components/HeroVideo";
import { LeadForm } from "@/components/LeadForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("List Your Property", "Sell or lease your UAE property with valuation, premium media, portal distribution, qualified demand and accountable reporting from PSR.", "/list-your-property");

const marketingServices = [
  ["01", "Price and position", "A comparable-led appraisal, competing-inventory review and launch recommendation shaped around your timing and required outcome."],
  ["02", "Editorial media", "Professional photography, vertical video, walkthrough direction, measured floor-plan presentation and copy built around the asset’s strongest details."],
  ["03", "Launch governance", "Listing permits, document readiness, portal standards and a coordinated release across the channels appropriate to the property."],
  ["04", "Qualified distribution", "PSR channels, major UAE portals, private buyer and tenant networks, agent-to-agent circulation and direct database matching."],
  ["05", "Campaign amplification", "Property-specific social content, paid campaign options, retargeting audiences and advisor-led follow-up designed to turn attention into qualified viewings."],
  ["06", "Reporting and decisions", "Enquiry quality, viewing feedback, competing-stock changes and price-position recommendations delivered in a clear owner update."],
];

const ownerCommitments = [
  ["One accountable lead", "A named advisor owns the pricing, launch, enquiry response, viewings, negotiation and transaction handover."],
  ["Presentation before promotion", "We prepare the story, media and information buyers need before campaign activity begins."],
  ["Lead qualification", "Budget, timing, finance position and intent are checked before a viewing is treated as meaningful demand."],
  ["Negotiation to completion", "Offers, counteroffers, documentation, conveyancing coordination and key milestones stay connected."],
];

export default function ListPropertyPage() {
  return <main>
    <InternalHeader />
    <section className="list-hero"><div><p className="kicker light">List your unit with PSR</p><h1>A complete route<br /><em>from asset to outcome.</em></h1><p>Valuation, premium presentation, qualified distribution, campaign management and negotiation—run as one accountable owner strategy.</p><a href="#owner-appraisal">Request a private appraisal</a></div><div className="list-hero-media" aria-label="UAE property and city film"><HeroVideo /></div></section>

    <section className="owner-intro section-pad"><div><p className="kicker">Full-service owner representation</p><h2>More than a listing.<br /><em>A managed campaign.</em></h2></div><div><p>Putting a unit online is not the strategy. We establish its strongest defendable position, build the material that supports it, place it in front of relevant demand and use every response to improve the next decision.</p><dl><div><dt>Sell</dt><dd>Positioning, buyer qualification, negotiation and transaction coordination.</dd></div><div><dt>Lease</dt><dd>Tenant targeting, viewing control, offer review and tenancy progression.</dd></div><div><dt>Appraise</dt><dd>A confidential value and competition review before you commit to market.</dd></div></dl></div></section>

    <section className="owner-marketing section-pad"><div className="section-heading"><div><p className="kicker">The marketing system</p><h2>Every part of the launch<br /><em>working together.</em></h2></div><p className="heading-note">The exact campaign is matched to the property, audience, exclusivity and owner objective.</p></div><div className="owner-marketing-grid">{marketingServices.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="owner-process section-pad"><div><p className="kicker">From instruction to completion</p><h2>One plan.<br /><em>Clear ownership.</em></h2></div><ol><li><span>01</span><div><h3>Appraise and define</h3><p>We agree the objective, evidence, recommended position, service scope and launch timing.</p></div></li><li><span>02</span><div><h3>Prepare and approve</h3><p>Media, copy, documentation, permits and distribution material are reviewed before release.</p></div></li><li><span>03</span><div><h3>Launch and qualify</h3><p>Campaigns go live, enquiries are responded to quickly and relevant prospects progress to viewings.</p></div></li><li><span>04</span><div><h3>Report and refine</h3><p>Owner updates connect activity, feedback and competing supply to practical decisions.</p></div></li><li><span>05</span><div><h3>Negotiate and complete</h3><p>Commercial terms and transaction milestones are managed through signing, transfer or tenancy.</p></div></li></ol></section>

    <section className="owner-commitments section-pad"><div><p className="kicker light">What owners can expect</p><h2>Marketing reach<br /><em>with operational discipline.</em></h2></div><div>{ownerCommitments.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <ClientReviews compact />

    <section id="owner-appraisal" className="owner-form section-pad"><div><p className="kicker light">Private owner brief</p><h2>Tell us about<br /><em>the unit.</em></h2><p>Share the community, building, residence type and timing. An advisor will review the asset and contact you to arrange a confidential appraisal.</p><p className="owner-form-note">Your property is not published from this form. Nothing goes to market until the scope, positioning and materials are approved with you.</p></div><LeadForm source="list-property" listing /></section>
    <Footer />
  </main>;
}
