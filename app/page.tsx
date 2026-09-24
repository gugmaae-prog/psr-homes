import Link from "@/components/SiteLink";
import { ClientReviews } from "@/components/ClientReviews";
import { Footer, InternalHeader } from "@/components/Chrome";
import { withBasePath } from "@/lib/base-path";
import { getProjectRegistry } from "@/lib/imported-projects";
import { formatAedPerSqft, getAreaPricePerSqft } from "@/lib/market-pricing";
import { getCommunityDirectory, getDeveloperDirectory } from "@/lib/taxonomy";
import { insights } from "@/lib/insights";
import { pageMetadata } from "@/lib/seo";
import { cbaCompany } from "@/data/cba-company";
import { cbaTeam } from "@/data/cba-team";
import { HeroVideo } from "@/components/HeroVideo";
import { DeveloperImage } from "@/components/DeveloperImage";
import { CardCurrencyPrice } from "@/components/CardCurrencyPrice";
import { formatAedCardPrice } from "@/lib/card-currency";

export const metadata = pageMetadata(
  "UAE Real Estate and Property Investment",
  "PSR Homes is a Dubai real estate advisory for UAE property investment, off-plan projects, high-ROI opportunities, villas, communities, developers and market research.",
);

function formatPrice(raw: string) {
  return formatAedCardPrice(raw);
}

export default function Home() {
  const registry = getProjectRegistry();
  const featuredProjectSlugs = [
    "113-residences-iman-developers-al-sufouh-dubai",
    "wyndham-residences-al-marjan-island-rak-uae",
    "arancia-yards-2-beyond-city-of-arabia-dubai",
    "bashayer-final-phase-modon-hudayriyat-island-abu-dhabi",
    "fleurs-de-jardin-amis-jacob-co-meydan-dubai",
    "dawn-o1ne-district-avenew-kora-motor-city-dubai",
  ];
  const featured = featuredProjectSlugs
    .map((slug) => registry.projects.find((project) => project.slug === slug && !project.archived && project.image))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));
  const communities = getCommunityDirectory().filter((community) => ["dubai-marina", "palm-jumeirah", "dubai-hills-estate"].includes(community.slug));
  const developers = getDeveloperDirectory().slice(0, 8);
  const editorialSlugs = ["price-per-square-foot-uae-property-guide-2026", "uae-mortgage-planning-before-reservation", "benefits-of-investing-in-uae-real-estate", "how-to-evaluate-new-property-launches-uae", "monthly-uae-market-tracking-dashboard", "service-charges-net-yield-uae-property"];
  const homepageInsights = editorialSlugs.map((slug) => insights.find((insight) => insight.slug === slug)).filter((insight): insight is NonNullable<typeof insight> => Boolean(insight));
  return <main className="site-shell">
    <InternalHeader />

    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="kicker">Dubai · Vision · Value</p>
        <h1>
          <span className="hero-light-line">Guiding your</span>
          <br />
          <span className="hero-light-line hero-silver-line">next move in UAE.</span>
        </h1>
        <p>Clear market intelligence. Curated opportunities. Trusted advice for confident property decisions.</p>
        <div className="home-hero-actions"><Link href="/projects">Explore properties</Link><Link href="/contact">Speak with an advisor</Link></div>
      </div>
      <div className="interactive-hero static-home-cover" aria-hidden="true">
        <HeroVideo />
        <div className="interactive-hero-shade" />
      </div>
      <div className="hero-transition-fade" aria-hidden="true" />
      <form className="property-search compact-search" action={withBasePath("/projects")} method="get">
        <label><span className="sr-only">AI-powered property search</span><input name="q" aria-label="AI-powered property search" placeholder="Describe your ideal property" /></label>
        <label><span className="sr-only">Emirate</span><select name="emirate" aria-label="Emirate" defaultValue=""><option value="">All emirates</option>{Object.keys(registry.emirates).map((emirate) => <option key={emirate}>{emirate}</option>)}</select></label>
        <label><span className="sr-only">Property type</span><select name="type" aria-label="Property type" defaultValue=""><option value="">All residences</option><option>Apartments</option><option>Villas</option><option>Townhouses</option><option>Penthouses</option></select></label>
        <button type="submit">Find properties</button>
      </form>
    </section>

    <section className="featured section-pad editorial-section">
      <div className="section-heading"><div><p className="kicker">Properties</p><h2>Properties worth<br /><em>a closer look.</em></h2></div><p className="heading-note">Compare pricing, payment structure, developer context and the complete media collection for each development.</p></div>
      <div className="psr-card-grid project-preview-grid">{featured.map((project) => {
        const areaPrice = getAreaPricePerSqft(project.area, project.propertyTypes, project.emirate);
        const pricePerSqft = project.pricePerSqft ? formatAedPerSqft(project.pricePerSqft) : areaPrice?.display || "";
        const priceLabel = formatPrice(project.startingPrice);
        return <article className="project-preview-card" key={project.slug}>
        <Link href={`/projects/${project.slug}`} className="project-preview-image"><img src={project.image} alt={`${project.name} in ${project.area}`} loading="lazy" /><span>View project</span></Link>
        <p>{project.emirate} · {project.developer}</p><h3><Link href={`/projects/${project.slug}`}>{project.name}</Link></h3><div className="project-preview-facts"><CardCurrencyPrice amountAed={project.startingPrice} aedLabel={priceLabel} projectName={project.name} /><span className="project-card-market-fact">{pricePerSqft ? `AED/sqft ${pricePerSqft.replace("AED ", "")}` : project.area}</span></div>
      </article>;
      })}</div>
      <Link href="/projects" className="project-index-route-link">View the complete UAE project index</Link>
    </section>

    <section className="market-ticker" aria-label="PSR Homes Real Estate company summary">{cbaCompany.metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</section>

    <section className="section-pad community-section editorial-section">
      <div className="section-heading"><div><p className="kicker">Location intelligence</p><h2>See the market<br /><em>community by community.</em></h2></div><Link href="/communities" className="underlined">All community guides</Link></div>
      <div className="psr-card-grid community-grid">{communities.map((community) => <Link href={`/communities/${community.slug}`} className="community-card" key={community.slug}>
        <img src={community.image} alt={`${community.name}, ${community.emirate}`} loading="lazy" decoding="async" /><div><p>{community.emirate} · {community.activeProjects} active projects</p><h3>{community.name}</h3></div>
      </Link>)}</div>
    </section>

    <section className="developer-home section-pad editorial-section">
      <div className="section-heading"><div><p className="kicker">Developer intelligence</p><h2>Know who is<br /><em>building the asset.</em></h2></div><p className="heading-note">Profiles organise each developer’s indexed pipeline by emirate, community, property type and current status.</p></div>
      <div className="psr-card-grid developer-home-grid">{developers.map((developer, index) => <Link href={`/developers/${developer.slug}`} className="developer-directory-card developer-home-card" key={developer.slug}>
        <div>
          <DeveloperImage src={developer.image} alt={`${developer.flagship}, a signature ${developer.name} development`} />
          <b>{String(index + 1).padStart(2, "0")} · {developer.activeProjects} active</b>
          <span className="developer-flagship">{developer.flagship}</span>
        </div>
        <p>{developer.emirates.join(" · ")}</p>
        <h2>{developer.name}</h2>
        <span>View developer profile</span>
      </Link>)}</div>
      <Link href="/developers" className="project-index-route-link">Explore all developer profiles</Link>
    </section>

    <section className="cba-team-home section-pad editorial-section">
      <div className="section-heading"><div><p className="kicker">The PSR team</p><h2>Property expertise,<br /><em>in your language.</em></h2></div><Link href="/advisors" className="underlined">Meet the full team</Link></div>
      <div className="psr-card-grid cba-team-home-grid">{cbaTeam.map((member) => <article key={member.slug}>
        <Link href={`/advisors/${member.slug}`}><img src={member.image} alt={`${member.name}, ${member.role} at PSR Homes Real Estate`} width="1080" height="1350" loading="lazy" /></Link>
        <p>{member.role} · {member.languages.join(" · ")}</p>
        <h3><Link href={`/advisors/${member.slug}`}>{member.name}</Link></h3>
        <span>{member.specialty}</span>
      </article>)}</div>
    </section>

    <section className="insights-home section-pad editorial-section">
      <div className="section-heading"><div><p className="kicker">Research &amp; video briefings</p><h2>Market context,<br /><em>without the noise.</em></h2></div><Link href="/insights" className="underlined">All insights</Link></div>
      <div className="psr-card-grid insight-home-grid">{homepageInsights.map((insight, index) => <Link href={`/insights/${insight.slug}`} className={index === 0 ? "lead" : ""} key={insight.slug}><div><img src={insight.image} alt={`${insight.title} editorial cover`} loading="lazy" decoding="async" />{insight.category === "Video briefing" && <b>Video briefing</b>}</div><p>{insight.category} · {insight.readTime}</p><h3>{insight.title}</h3><span>Read briefing</span></Link>)}</div>
    </section>

    <ClientReviews />

    <section className="final-cta"><p className="kicker light">Private client advisory</p><h2>Move from browsing<br /><em>to a defensible decision.</em></h2><div><Link href="/contact" className="button-light">Build my shortlist</Link><Link href="/projects" className="underlined light-line">Explore projects</Link></div></section>
    <Footer />
  </main>;
}
