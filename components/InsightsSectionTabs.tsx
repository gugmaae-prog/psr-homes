import Link from "@/components/SiteLink";

export type InsightsSection = "research" | "daily" | "emirates";

const sections: Array<{ id: InsightsSection; href: string; label: string }> = [
  { id: "research", href: "/insights", label: "Research" },
  { id: "daily", href: "/insights/daily", label: "Daily market lens" },
  { id: "emirates", href: "/emirate", label: "Emirates" },
];

export function InsightsSectionTabs({ active }: { active: InsightsSection }) {
  return <nav className="insights-section-tabs" aria-label="Insights sections">
    {sections.map((section) => <Link
      href={section.href}
      aria-current={section.id === active ? "page" : undefined}
      key={section.id}
    >{section.label}</Link>)}
  </nav>;
}
