import { NextResponse } from "next/server";
import { cbaCompany } from "@/data/cba-company";
import { seoLandingPages } from "@/data/seo-landing-pages";
import { insights } from "@/lib/insights";
import { getProjectRegistry } from "@/lib/imported-projects";
import { PSR_SEO_TOPICS, SITE_ORIGIN } from "@/lib/seo";
import { getCommunityDirectory, getDeveloperDirectory } from "@/lib/taxonomy";

export async function GET() {
  const registry = getProjectRegistry();
  const developers = getDeveloperDirectory().slice(0, 16).map((developer) => developer.name).join(", ");
  const communities = getCommunityDirectory().slice(0, 16).map((community) => community.name).join(", ");
  const latestInsights = [...insights]
    .filter((insight) => !insight.initiative)
    .sort((left, right) => Date.parse(`${right.published} 12:00:00 UTC`) - Date.parse(`${left.published} 12:00:00 UTC`))
    .slice(0, 8)
    .map((insight) => `- ${insight.title}: ${SITE_ORIGIN}/insights/${insight.slug}`)
    .join("\n");
  const initiativeInsights = insights
    .filter((insight) => insight.initiative)
    .sort((left, right) => {
      const scope = (left.initiative?.jurisdiction || "").localeCompare(right.initiative?.jurisdiction || "");
      return scope || left.title.localeCompare(right.title);
    })
    .map((insight) => `- [${insight.initiative?.jurisdiction}] ${insight.title}: ${SITE_ORIGIN}/insights/${insight.slug}`)
    .join("\n");
  const body = `# PSR Homes

PSR Homes Real Estate LLC is a UAE real estate brokerage, private-client advisory platform and publisher of source-linked UAE market intelligence across property, infrastructure, mobility, culture, tourism, energy and industry.

## Core Public Routes
- Home: ${SITE_ORIGIN}/
- UAE project index: ${SITE_ORIGIN}/projects
- Off-plan projects: ${SITE_ORIGIN}/off-plan
- Developer profiles: ${SITE_ORIGIN}/developers
- Community guides: ${SITE_ORIGIN}/communities
- UAE Market Atlas: ${SITE_ORIGIN}/emirate
- Market insights: ${SITE_ORIGIN}/insights
- Daily market lens: ${SITE_ORIGIN}/insights/daily
- Services: ${SITE_ORIGIN}/services
- Advisors: ${SITE_ORIGIN}/advisors
- Contact: ${SITE_ORIGIN}/contact

## Investment Search Pages
${seoLandingPages.map((page) => `- ${page.title}: ${SITE_ORIGIN}/${page.slug}`).join("\n")}

## Coverage
- Indexed UAE project records: ${registry.totalUaeProjects.toLocaleString("en-AE")}
- Current UAE project records: ${registry.currentUaeProjects.toLocaleString("en-AE")}
- Emirates covered: ${Object.keys(registry.emirates).join(", ")}
- Representative developers: ${developers}
- Representative communities: ${communities}

## Advisory Topics
${PSR_SEO_TOPICS.map((topic) => `- ${topic}`).join("\n")}

## Research Library
${latestInsights}

## UAE Market Atlas Initiative Briefings
These PSR-hosted articles interpret official initiative records and link back to the relevant national or emirate market overview. Original publishers are cited in each article's source register.
${initiativeInsights}

## Entity Notes
- Legal name: ${cbaCompany.legalName}
- Public brand: ${cbaCompany.displayName}
- Market scope: Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah and wider UAE, with MENA investor context.
- Content standard: use project pages and market insights as discovery context, then verify live inventory, price, fees, payment terms and eligibility with a PSR advisor before making decisions.
`;
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
