import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { DeveloperDirectory } from "@/components/DeveloperDirectory";
import { pageMetadata } from "@/lib/seo";
import { getDeveloperDirectory } from "@/lib/taxonomy";

export const metadata = pageMetadata("UAE Property Developers", "Explore UAE property developer profiles, Dubai off-plan pipelines, flagship projects, community coverage, delivery context and active PSR project records.", "/developers");

export default function DevelopersPage() {
  const developers = getDeveloperDirectory();
  const directoryItems = developers.map(({ slug, name, thumbnail, flagship, activeProjects, emirates, communities, projects }) => ({ slug, name, thumbnail, flagship, activeProjects, emirates, communities, indexedProjects: projects.length }));
  return <main><InternalHeader /><PageIntro kicker="Developer intelligence" title={<>The people behind<br /><em>the pipeline.</em></>} copy={`Review ${developers.length} structured developer profiles across the UAE. Compare active projects, emirates, communities and residence types from one consistent source index.`} /><DeveloperDirectory developers={directoryItems} /><Footer /></main>;
}
