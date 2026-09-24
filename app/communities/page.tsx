import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { CommunityDirectory } from "@/components/CommunityDirectory";
import { pageMetadata } from "@/lib/seo";
import { getCommunityDirectory } from "@/lib/taxonomy";

export const metadata = pageMetadata("UAE Property Communities", "Compare Dubai and UAE property communities by active projects, developer mix, residence types, price signals, schools, hospitals, lifestyle fit and investment context.", "/communities");

export default function CommunitiesPage() {
  const communities = getCommunityDirectory();
  const directoryItems = communities.map(({ slug, name, emirate, image, projects, activeProjects, developers, pricePerSqft, descriptor }) => ({ slug, name, emirate, image, indexedProjects: projects.length, activeProjects, developers, pricePerSqft, descriptor }));
  return <main><InternalHeader /><PageIntro kicker="UAE community intelligence" title={<>Every place,<br /><em>in its proper context.</em></>} copy={`Explore ${communities.length} community markets through their active pipeline, developer mix, property formats and investment position.`} /><CommunityDirectory communities={directoryItems} /><Footer /></main>;
}
