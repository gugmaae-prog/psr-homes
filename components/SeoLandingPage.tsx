import Link from "@/components/SiteLink";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { RegistryProjectGrid } from "@/components/RegistryProjectGrid";
import type { SeoLandingPage } from "@/data/seo-landing-pages";
import { getUniqueActiveProjectRecords, type RegistryProject } from "@/lib/imported-projects";
import { faqStructuredData, SITE_ORIGIN } from "@/lib/seo";

function matchesProject(project: RegistryProject, page: SeoLandingPage) {
  const { emirate, type, query } = page.projectFilter;
  const searchable = `${project.name} ${project.developerDisplay || ""} ${project.developer} ${project.area} ${project.emirate} ${project.propertyTypes.join(" ")} ${project.bedrooms.join(" ")} ${project.lifestyles.join(" ")} ${project.description}`.toLowerCase();
  const queryTerms = (query || "").toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 1);
  return (!emirate || project.emirate === emirate)
    && (!type || project.propertyTypes.some((value) => value.toLowerCase().includes(type.toLowerCase())))
    && (!queryTerms.length || queryTerms.some((term) => searchable.includes(term)));
}

export function SeoLandingPageView({ page, projects }: { page: SeoLandingPage; projects: RegistryProject[] }) {
  const matchedProjects = getUniqueActiveProjectRecords(projects.filter((project) => matchesProject(project, page))).slice(0, 9);
  const path = `/${page.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_ORIGIN}${path}#webpage`,
      url: `${SITE_ORIGIN}${path}`,
      name: page.title,
      description: page.description,
      about: page.keywords.map((name) => ({ "@type": "Thing", name })),
      mainEntity: {
        "@type": "ItemList",
        name: `${page.title} PSR project shortlist`,
        itemListElement: matchedProjects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_ORIGIN}/projects/${project.slug}`,
          name: project.name,
        })),
      },
    },
    faqStructuredData(path, page.faqs),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        { "@type": "ListItem", position: 2, name: page.title, item: `${SITE_ORIGIN}${path}` },
      ],
    },
  ];
  return <main>
    <InternalHeader />
    <PageIntro
      kicker={page.kicker}
      title={<>{page.heading}<br /><em>{page.emphasis}</em></>}
      copy={page.description}
    />
    <section className="taxonomy-detail section-pad">
      <div><p className="kicker">PSR investment framework</p><h2>Search visibility,<br /><em>backed by substance.</em></h2></div>
      <div>
        {page.sections.map((section) => <article key={section.title}><span>{section.title}</span><p>{section.body}</p></article>)}
      </div>
    </section>
    <section className="section-pad taxonomy-listing taxonomy-project-listing">
      <div className="section-heading"><div><p className="kicker">Relevant PSR project records</p><h2>Current opportunities<br /><em>to compare.</em></h2></div><p className="heading-note">These records are a discovery shortlist. Live price, availability, fees, documents and payment terms must be reconfirmed before reservation.</p></div>
      {matchedProjects.length ? <RegistryProjectGrid projects={matchedProjects} limit={9} /> : <div className="project-empty"><span>Project monitoring</span><h2>No exact shortlist yet</h2><p>PSR is monitoring this brief. Browse the full catalogue or ask an advisor for a live search.</p></div>}
      <Link href="/projects" className="outline-action">Open the full PSR project index</Link>
    </section>
    <section className="taxonomy-detail section-pad">
      <div><p className="kicker">Buyer questions</p><h2>Frequently asked<br /><em>investment questions.</em></h2></div>
      <div>{page.faqs.map((faq) => <article key={faq.question}><span>{faq.question}</span><p>{faq.answer}</p></article>)}</div>
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Footer />
  </main>;
}
