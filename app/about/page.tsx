import Link from "@/components/SiteLink";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { AboutMetrics } from "@/components/AboutMetrics";
import { TeamCarousel, type TeamMember } from "@/components/TeamCarousel";
import { withBasePath } from "@/lib/base-path";
import { pageMetadata } from "@/lib/seo";
import { cbaTeam } from "@/data/cba-team";
import { cbaCompany } from "@/data/cba-company";

export const metadata = pageMetadata("About PSR", "The PSR story: an independent Dubai brokerage shaped by long-term relationships, market knowledge and client value.", "/about");

const team: TeamMember[] = cbaTeam.map((member) => ({
  name: member.name,
  role: member.role,
  email: member.email,
  image: member.image,
  copy: member.copy,
  facts: member.facts,
  portfolioSlug: member.slug,
  profileKind: member.profileKind,
  badge: member.slug === "parv-sondhi" ? "Private clients" : undefined,
}));

export default function AboutPage() {
  return <main>
    <InternalHeader />
    <PageIntro kicker="About PSR" title={<>Dubai property decisions,<br /><em>made with clarity.</em></>} copy={cbaCompany.summary} />
    <section className="about-image">
      <img src={withBasePath("/about/psr-about-banner.webp")} alt="PSR Homes advisory team photographed in a Dubai office" width="1920" height="1280" fetchPriority="high" />
      <div className="about-image-caption"><span>PSR leadership</span><p>Clear advice. Accountable service.</p></div>
    </section>
    <section className="about-origin section-pad">
      <div><p className="kicker">Who we are</p><h2>Local knowledge.<br /><em>Clear guidance.</em></h2></div>
      <div className="about-origin-copy">
        <p>PSR Homes Real Estate LLC is a Dubai-based brokerage focused on premium residential, luxury and investment opportunities. The team supports buyers, sellers, landlords, tenants and investors across the Dubai market.</p>
        <p>Advice combines pricing intelligence, developer and community context, clear communication and professional support through property search, listing strategy, viewings, negotiation, documentation and closing.</p>
        <AboutMetrics />
      </div>
    </section>
    <section className="about-journey section-pad">
      <p className="kicker">How PSR works</p>
      <div className="about-journey-grid">
        <article><span>01</span><h3>Start with the objective</h3><p>Every brief begins with budget, property type, timing and the client&apos;s reason for moving—whether that is a home, rental, sale or investment.</p></article>
        <article><span>02</span><h3>Read the market</h3><p>The team compares real value, location potential, rental demand, developer reputation and resale strength before recommending a course of action.</p></article>
        <article><span>03</span><h3>Stay through completion</h3><p>PSR coordinates viewings, negotiation, documents and closing so clients can move from search to signature with one accountable team.</p></article>
      </div>
    </section>
    <section className="statement section-pad"><p className="kicker">What the work means</p><div><h2>More than a listing.<br />A decision made <em>with confidence.</em></h2><p>PSR helps clients understand the market, protect their interests and move with clarity. The work is grounded in current pricing, local knowledge, strong negotiation and straightforward communication.</p><p>From luxury apartments and family villas to off-plan investment and high-demand rental property, the focus remains real value and long-term relationships.</p></div></section>
    <section className="values section-pad"><p className="kicker">What guides us</p><div className="value-grid">{[["01","Intent","Every search begins with the outcome the asset must deliver."],["02","Evidence","Direct advice grounded in verified information and current market context."],["03","Stewardship","Capital, time and trust are treated with equal responsibility."],["04","Perspective","Market knowledge matters only when it improves the decision."]].map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="about-team section-pad">
      <header className="about-team-heading">
        <div><p className="kicker">The PSR team</p><h2>Experience made<br /><em>personal.</em></h2></div>
        <p>Meet the PSR team shown in the refreshed company imagery. Individual credentials remain editable for company approval.</p>
      </header>
      <TeamCarousel members={team} />
    </section>
    <section className="about-access">
      <div><p className="kicker">PSR team</p><h2>Private tools for<br /><em>better client work.</em></h2></div>
      <div><p>Authorised advisors can enter the private workspace for research, proposals, project comparisons and client-ready documents.</p><Link href="/agent" className="button-light">Agent login</Link></div>
    </section>
    <section className="detail-next"><p>Meet the people behind the advice.</p><h2>Serious about property.<br /><em>Focused on your outcome.</em></h2><Link href="/advisors" className="button-light">Meet the PSR team</Link></section>
    <Footer />
  </main>;
}
