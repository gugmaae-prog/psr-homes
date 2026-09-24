import type { Metadata } from "next";
import { AgentWorkspace } from "@/components/AgentWorkspace";
import { SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Private Agent Workspace",
  description: "Secure PSR workspace for property research, client proposals, sales offers and project comparisons.",
  alternates: { canonical: `${SITE_ORIGIN}/agent` },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AgentPage() {
  return <main className="agent-page"><AgentWorkspace /></main>;
}
