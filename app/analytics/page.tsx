import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Website Analytics",
  description: "Protected PSR website analytics dashboard.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AnalyticsPage() {
  return <main className="analytics-page"><AnalyticsDashboard /></main>;
}
