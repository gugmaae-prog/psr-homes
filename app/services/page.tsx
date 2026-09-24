import Link from "@/components/SiteLink";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { pageMetadata } from "@/lib/seo";
import { cbaServices } from "@/data/cba-company";

export const metadata = pageMetadata("UAE Property Services", "Buying, selling, leasing and property investment advisory in Dubai and across the UAE.", "/services");

export default function ServicesPage() {
  return <main><InternalHeader /><PageIntro kicker="What we do" title={<>Dubai property support,<br /><em>from search to signature.</em></>} copy="PSR combines brokerage, property management and transaction support around one clear client objective." /><section className="psr-card-grid service-index section-pad">{cbaServices.map(({ number, title, copy }) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p><Link href="/contact">Discuss the brief</Link></article>)}</section><Footer /></main>;
}
