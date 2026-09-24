import Link from "@/components/SiteLink";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { cbaTeam } from "@/data/cba-team";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Meet the PSR Team", "Meet the public PSR Homes Real Estate team and explore each person's role, expertise and professional focus.", "/advisors");

export default function AdvisorsPage() {
  return <main>
    <InternalHeader />
    <PageIntro kicker="Our people" title={<>UAE expertise,<br /><em>made personal.</em></>} copy="A multidisciplinary team supporting residential, investment, commercial and operational real estate needs across the UAE." />
    <section className="psr-card-grid advisor-grid section-pad">{cbaTeam.map((member) => <article key={member.slug} data-advisor={member.slug}><Link href={`/advisors/${member.slug}`} className="advisor-card-image"><img src={member.image} alt={`${member.name}, ${member.role} at PSR Homes Real Estate`} width="1080" height="1350" loading="lazy" /><span>View profile</span></Link><div className="advisor-card-copy"><p className="eyebrow">{member.role}</p><h2><Link href={`/advisors/${member.slug}`}>{member.name}</Link></h2><p>{member.languages.join(" · ")}</p></div></article>)}</section>
    <Footer />
  </main>;
}
