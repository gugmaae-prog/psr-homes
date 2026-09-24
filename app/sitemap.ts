import type { MetadataRoute } from "next";
import { getIndexableProjectRecords } from "@/lib/imported-projects";
import { insights } from "@/lib/insights";
import { getCommunityDirectory, getDeveloperDirectory } from "@/lib/taxonomy";
import { getEmirateProfiles } from "@/lib/emirates";
import { SITE_ORIGIN } from "@/lib/seo";
import { cbaTeam } from "@/data/cba-team";
import { seoLandingPages } from "@/data/seo-landing-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projectRecords = getIndexableProjectRecords();
  const staticRoutes = ["", "/projects", "/off-plan", "/developers", "/communities", "/emirate", "/insights", "/insights/daily", "/journal", "/services", "/about", "/advisors", "/contact", "/sg26", "/list-your-property", "/mortgage-calculator", "/privacy", "/terms"];
  const staticUpdatedAt = new Date("2026-08-31T00:00:00.000Z");
  return [
    ...staticRoutes.map((route, index) => ({ url: `${SITE_ORIGIN}${route}`, lastModified: staticUpdatedAt, changeFrequency: (index < 4 ? "weekly" : "monthly") as "weekly" | "monthly", priority: route === "" ? 1 : .8 })),
    ...seoLandingPages.map((page) => ({ url: `${SITE_ORIGIN}/${page.slug}`, lastModified: staticUpdatedAt, changeFrequency: "weekly" as const, priority: .9 })),
    ...getCommunityDirectory().map((community) => ({ url: `${SITE_ORIGIN}/communities/${community.slug}`, lastModified: staticUpdatedAt, changeFrequency: "weekly" as const, priority: .7 })),
    ...getDeveloperDirectory().map((developer) => ({ url: `${SITE_ORIGIN}/developers/${developer.slug}`, lastModified: staticUpdatedAt, changeFrequency: "weekly" as const, priority: .7 })),
    ...getEmirateProfiles().map((emirate) => ({ url: `${SITE_ORIGIN}/emirate/${emirate.slug}`, lastModified: staticUpdatedAt, changeFrequency: "weekly" as const, priority: .82 })),
    ...insights.map((insight) => ({ url: `${SITE_ORIGIN}/insights/${insight.slug}`, lastModified: new Date(`${insight.updated || insight.published} 12:00:00 UTC`), changeFrequency: "monthly" as const, priority: insight.initiative ? .74 : .7 })),
    ...cbaTeam.map((advisor) => ({ url: `${SITE_ORIGIN}/advisors/${advisor.slug}`, lastModified: staticUpdatedAt, changeFrequency: "monthly" as const, priority: .7 })),
    ...projectRecords.map((project) => ({ url: `${SITE_ORIGIN}/projects/${project.slug}`, lastModified: new Date(project.sourceUpdatedAt), changeFrequency: "weekly" as const, priority: .85 })),
  ];
}
