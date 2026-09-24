import type { Metadata } from "next";
import { AgentWorkspace } from "@/components/AgentWorkspace";
import { SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Private Administration",
  description: "Protected PSR administration for staff identities, access, credentials and profile records.",
  alternates: { canonical: `${SITE_ORIGIN}/admin` },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AdminPage() {
  return <main className="agent-page"><AgentWorkspace entry="admin" /></main>;
}
