import Link from "@/components/SiteLink";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { RegistryProjectGrid } from "@/components/RegistryProjectGrid";
import { getProjectRegistry } from "@/lib/imported-projects";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("UAE Off-Plan Projects", "Compare Dubai and UAE off-plan property investment opportunities by developer, payment plan, handover, community, fees, liquidity, lifestyle fit and long-term value.", "/off-plan");

export default function OffPlanPage() {
  const projects = getProjectRegistry().projects.filter((project) => !project.archived && project.image);
  return <main><InternalHeader /><PageIntro kicker="Current UAE pipeline" title={<>What is next,<br /><em>viewed through value.</em></>} copy="Current project records and a consistent framework for comparing location, developer, payment structure and delivery." /><section className="section-pad taxonomy-listing"><RegistryProjectGrid projects={projects} limit={18} /><Link href="/projects" className="outline-action">Explore the complete project index</Link></section><Footer /></main>;
}
