import type { Metadata } from "next";
import { LeadsDashboard } from "@/components/LeadsDashboard";

export const metadata: Metadata = {
  title: "Website Lead Inbox",
  description: "Protected PSR website lead inbox.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function LeadsPage() {
  return <main className="leads-page"><LeadsDashboard /></main>;
}
