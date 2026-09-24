import type { Metadata } from "next";
import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import ProjectCatalogue from "@/components/ProjectCatalogue";
import DubaiSouthProjectMap from "@/components/DubaiSouthProjectMap";
import { getProjectCatalogue } from "@/lib/project-catalogue";
import { pageMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ q?: string; emirate?: string; developer?: string; type?: string }> };
const title = "Dubai and UAE Property Developments";
const description = "Search Dubai and UAE off-plan projects, villas, apartments and investment developments by emirate, developer, community, residence type, price, payment plan and handover timing with PSR.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = await searchParams;
  const hasFilters = Boolean(filters.q || filters.emirate || filters.developer || filters.type);
  return { ...pageMetadata(title, description, "/projects"), robots: { index: !hasFilters, follow: true } };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const filters = await searchParams;
  const initial = { query: filters.q, emirate: filters.emirate, developer: filters.developer, propertyType: filters.type };
  const initialData = filters.q ? undefined : getProjectCatalogue(initial);
  return <main><InternalHeader /><PageIntro kicker="UAE projects" title="Projects" copy="Explore current and upcoming developments across the UAE, then confirm live availability with a PSR advisor." /><DubaiSouthProjectMap /><ProjectCatalogue initial={initial} initialData={initialData} /><Footer /></main>;
}
