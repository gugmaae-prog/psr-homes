import { redirect } from "next/navigation";
import { Footer, InternalHeader } from "@/components/Chrome";
import LatestProjectDetail from "@/components/LatestProjectDetail";
import { getProjectRecord } from "@/lib/imported-projects";
import { curatedProjectFeedAliases } from "@/lib/project-feed-aliases";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const metadata = pageMetadata(
  "Latest UAE Property Launch",
  "Review a newly monitored UAE property launch and request verified live availability from PSR.",
  "/projects/latest",
);

export default async function LatestProjectPage({ params }: Props) {
  const { slug } = await params;
  const curatedSlug = curatedProjectFeedAliases.get(slug);
  if (curatedSlug) redirect(`/projects/${curatedSlug}`);
  if (getProjectRecord(slug)) redirect(`/projects/${slug}`);
  return <main className="project-detail">
    <InternalHeader />
    <LatestProjectDetail slug={slug} />
    <Footer />
  </main>;
}
