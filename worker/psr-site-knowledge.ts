import registryData from "../data/projects.json";
import { curatedLaunches } from "../data/curated-launches";
import { curatedCommunityGuides } from "../data/curated-communities";
import { cbaCompany, cbaServices } from "../data/cba-company";
import { buildDeveloperAliasMap, canonicalDeveloperOptions, rawDeveloperSlug } from "../lib/developer-identity";
import { insights } from "../lib/insights";

type RegistryProject = {
  slug: string;
  name: string;
  developer: string;
  emirate: string;
  area: string;
  startingPrice: string;
  paymentPlan: string;
  handover: string;
  bedrooms: string[];
  propertyTypes: string[];
  lifestyles: string[];
  description: string;
  sourceUpdatedAt: string;
  archived: boolean;
};

export type PsrKnowledgeItem = {
  id: string;
  kind: "company" | "service" | "developer" | "community" | "project" | "insight";
  title: string;
  route: string;
  summary: string;
  facts: string[];
  evidenceLabel: string;
  updatedAt: string;
};

const registry = registryData as { projects: RegistryProject[]; generatedAt: string };
const curatedBySlug = new Map(curatedLaunches.map((project) => [project.slug, project]));

function reliablePrice(raw: string) {
  const amount = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount >= 250_000 && amount <= 100_000_000
    ? `Development entry price: AED ${Math.round(amount).toLocaleString("en-AE")}`
    : "";
}

function clean(value: string, max = 700) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function communityName(value: string) {
  return value
    .replace(/\s*\((?:Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain) Emirate\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactList(values: string[], limit = 6) {
  const unique = [...new Set(values.map((value) => clean(value, 120)).filter(Boolean))].sort();
  if (unique.length <= limit) return unique.join(", ");
  return `${unique.slice(0, limit).join(", ")} and ${unique.length - limit} more`;
}

function latestSourceDate(projects: RegistryProject[]) {
  return projects.map((project) => project.sourceUpdatedAt).filter(Boolean).sort().at(-1)?.slice(0, 10)
    || registry.generatedAt.slice(0, 10);
}

function terms(value: string) {
  const ignored = new Set(["about", "after", "before", "could", "from", "have", "into", "more", "project", "property", "show", "tell", "that", "their", "this", "what", "when", "where", "which", "with", "would"]);
  return normalized(value).split(" ").filter((term) => term.length >= 3 && !ignored.has(term));
}

const companyItem: PsrKnowledgeItem = {
  id: "company-psr",
  kind: "company",
  title: cbaCompany.displayName,
  route: "/about",
  summary: cbaCompany.summary,
  facts: [
    `Dubai RERA ORN ${cbaCompany.orn}`,
    `Office: ${cbaCompany.addressLines.join(", ")}`,
    `Contact: ${cbaCompany.phone} or ${cbaCompany.email}`,
  ],
  evidenceLabel: "PSR company profile",
  updatedAt: "2026-08-20",
};

const serviceItems: PsrKnowledgeItem[] = cbaServices.map((service) => ({
  id: `service-${normalized(service.title).replaceAll(" ", "-")}`,
  kind: "service",
  title: `${service.title} with PSR`,
  route: "/services",
  summary: service.copy,
  facts: ["Service scope is advisory and transaction-specific; exact third-party terms require confirmation."],
  evidenceLabel: "PSR service guide",
  updatedAt: "2026-08-20",
}));

const projectItems: PsrKnowledgeItem[] = registry.projects
  .filter((project) => !project.archived)
  .map((project) => {
    const curated = curatedBySlug.get(project.slug);
    const description = clean(curated?.description || project.description || `${project.name} is a ${project.propertyTypes.join(" and ") || "residential"} development in ${project.area}, ${project.emirate}.`);
    const facts = [
      `Developer: ${curated?.developerDisplay || project.developer}`,
      `Location: ${curated?.area || project.area}, ${curated?.emirate || project.emirate}`,
      reliablePrice(curated?.startingPrice || project.startingPrice),
      (curated?.bedrooms || project.bedrooms).length ? `Residence mix recorded: ${(curated?.bedrooms || project.bedrooms).join(", ")}` : "",
      (curated?.propertyTypes || project.propertyTypes).length ? `Property types: ${(curated?.propertyTypes || project.propertyTypes).join(", ")}` : "",
      curated?.paymentPlan || project.paymentPlan ? `Payment plan recorded: ${curated?.paymentPlan || project.paymentPlan}` : "",
      curated?.handover || project.handover ? `Handover recorded: ${curated?.handover || project.handover}` : "",
      curated?.statusLabel ? `Published status: ${curated.statusLabel}` : "",
      curated?.releaseNote || "",
    ].filter(Boolean);
    return {
      id: `project-${project.slug}`,
      kind: "project" as const,
      title: curated?.name || project.name,
      route: `/projects/${project.slug}`,
      summary: description,
      facts,
      evidenceLabel: curated?.sourceLabel || "PSR catalogue snapshot; live facts require advisor verification",
      updatedAt: (curated?.sourceUpdatedAt || project.sourceUpdatedAt || registry.generatedAt).slice(0, 10),
    };
  });

const registrySlugs = new Set(registry.projects.map((project) => project.slug));
projectItems.push(...curatedLaunches
  .filter((project) => !project.archived && !registrySlugs.has(project.slug))
  .map((project) => ({
    id: `project-${project.slug}`,
    kind: "project" as const,
    title: project.name,
    route: `/projects/${project.slug}`,
    summary: clean(project.description),
    facts: [
      `Developer: ${project.developerDisplay || project.developer}`,
      `Location: ${project.area}, ${project.emirate}`,
      reliablePrice(project.startingPrice),
      project.bedrooms.length ? `Residence mix recorded: ${project.bedrooms.join(", ")}` : "",
      project.paymentPlan ? `Payment plan recorded: ${project.paymentPlan}` : "",
      project.handover ? `Handover recorded: ${project.handover}` : "",
      project.statusLabel ? `Published status: ${project.statusLabel}` : "",
      project.releaseNote,
    ].filter(Boolean),
    evidenceLabel: project.sourceLabel,
    updatedAt: project.sourceUpdatedAt.slice(0, 10),
  })));

const activeRegistryProjects = registry.projects.filter((project) => !project.archived);
const developerNames = registry.projects.map((project) => curatedBySlug.get(project.slug)?.developerDisplay || project.developer).filter(Boolean);
const developerAliases = buildDeveloperAliasMap(developerNames);
const developerGroups = new Map<string, { names: string[]; projects: RegistryProject[] }>();
for (const project of activeRegistryProjects) {
  const displayName = curatedBySlug.get(project.slug)?.developerDisplay || project.developer;
  const rawSlug = rawDeveloperSlug(displayName);
  const slug = developerAliases.get(rawSlug) || rawSlug;
  if (!slug) continue;
  const group = developerGroups.get(slug) || { names: [], projects: [] };
  group.names.push(displayName);
  group.projects.push(project);
  developerGroups.set(slug, group);
}

const developerItems: PsrKnowledgeItem[] = [...developerGroups.entries()].map(([slug, group]) => {
  const name = canonicalDeveloperOptions(group.names)[0] || group.names[0];
  const emirates = compactList(group.projects.map((project) => project.emirate), 7);
  const communities = compactList(group.projects.map((project) => communityName(project.area)), 8);
  const propertyTypes = compactList(group.projects.flatMap((project) => project.propertyTypes), 8);
  const projects = compactList(group.projects.map((project) => project.name), 5);
  return {
    id: `developer-${slug}`,
    kind: "developer",
    title: name,
    route: `/developers/${slug}`,
    summary: `${name} is represented by ${group.projects.length} active project record${group.projects.length === 1 ? "" : "s"} in the current PSR catalogue${emirates ? ` across ${emirates}` : ""}.`,
    facts: [
      `Active PSR catalogue records: ${group.projects.length}`,
      communities ? `Communities represented: ${communities}` : "",
      propertyTypes ? `Residence types recorded: ${propertyTypes}` : "",
      projects ? `Current records include: ${projects}` : "",
    ].filter(Boolean),
    evidenceLabel: "PSR developer index derived from active catalogue records",
    updatedAt: latestSourceDate(group.projects),
  };
});

const communityGroups = new Map<string, { name: string; projects: RegistryProject[] }>();
for (const project of activeRegistryProjects) {
  const name = communityName(project.area);
  const slug = slugify(name);
  if (!slug) continue;
  const group = communityGroups.get(slug) || { name, projects: [] };
  group.projects.push(project);
  communityGroups.set(slug, group);
}

const communityItems: PsrKnowledgeItem[] = [...communityGroups.entries()].map(([slug, group]) => {
  const emirates = compactList(group.projects.map((project) => project.emirate), 3);
  const developers = compactList(group.projects.map((project) => curatedBySlug.get(project.slug)?.developerDisplay || project.developer), 8);
  const propertyTypes = compactList(group.projects.flatMap((project) => project.propertyTypes), 8);
  const projects = compactList(group.projects.map((project) => project.name), 5);
  return {
    id: `community-${slug}`,
    kind: "community",
    title: group.name,
    route: `/communities/${slug}`,
    summary: `${group.name} is represented by ${group.projects.length} active project record${group.projects.length === 1 ? "" : "s"} in the current PSR catalogue${emirates ? ` in ${emirates}` : ""}.`,
    facts: [
      `Active PSR catalogue records: ${group.projects.length}`,
      developers ? `Developers represented: ${developers}` : "",
      propertyTypes ? `Residence types recorded: ${propertyTypes}` : "",
      projects ? `Current records include: ${projects}` : "",
    ].filter(Boolean),
    evidenceLabel: "PSR community index derived from active catalogue records",
    updatedAt: latestSourceDate(group.projects),
  };
});

const indexedCommunitySlugs = new Set(communityItems.map((item) => item.route.replace("/communities/", "")));
communityItems.push(...curatedCommunityGuides
  .filter((community) => !indexedCommunitySlugs.has(community.slug))
  .map((community) => ({
    id: `community-${community.slug}`,
    kind: "community" as const,
    title: community.name,
    route: `/communities/${community.slug}`,
    summary: community.overview,
    facts: [
      `Emirate: ${community.emirate}`,
      community.propertyTypes.length ? `Community residence types: ${community.propertyTypes.join(", ")}` : "",
      community.aliases.length ? `Also known as: ${community.aliases.join(", ")}` : "",
      "No current PSR catalogue records are indexed for this community.",
    ].filter(Boolean),
    evidenceLabel: `${community.sourceLabel}; PSR guide verified ${community.verifiedAt}`,
    updatedAt: community.verifiedAt,
  })));

const insightItems: PsrKnowledgeItem[] = insights.map((insight) => ({
  id: `insight-${insight.slug}`,
  kind: "insight",
  title: insight.title,
  route: `/insights/${insight.slug}`,
  summary: insight.dek,
  facts: insight.takeaways.slice(0, 4),
  evidenceLabel: insight.sources?.length
    ? `PSR research synthesis using ${insight.sources.length} cited source${insight.sources.length === 1 ? "" : "s"}`
    : "PSR advisory guide",
  updatedAt: insight.published,
}));

const knowledgeItems = [companyItem, ...serviceItems, ...projectItems, ...developerItems, ...communityItems, ...insightItems];

export function psrCatalogueContext() {
  return {
    generatedAt: registry.generatedAt,
    activeProjectRecords: projectItems.length,
    developers: developerItems.length,
    communities: communityItems.length,
    emirates: [...new Set(activeRegistryProjects.map((project) => project.emirate).filter(Boolean))].sort(),
  };
}

function itemScore(item: PsrKnowledgeItem, query: string) {
  const normalizedQuery = normalized(query);
  const queryTerms = terms(query);
  const title = normalized(item.title);
  const route = normalized(item.route);
  const body = normalized(`${item.title} ${item.summary} ${item.facts.join(" ")}`);
  let score = title.length > 3 && normalizedQuery.includes(title) ? 120 : 0;
  score += queryTerms.reduce((total, term) => total + (title.includes(term) ? 16 : body.includes(term) ? 4 : route.includes(term) ? 3 : 0), 0);
  if (/\b(?:news|latest|market|research|trend|yield|mortgage|service charge|due diligence)\b/i.test(query) && item.kind === "insight") score += 22;
  if (/\b(?:buy|sell|rent|mortgage|conveyancing|snagging|management|commercial)\b/i.test(query) && item.kind === "service") score += 18;
  if (/\b(?:who|company|office|contact|phone|email|orn|psr)\b/i.test(query) && item.kind === "company") score += 16;
  if (/\b(?:developer|builder|pipeline|portfolio|projects)\b/i.test(query) && item.kind === "developer") score += 24;
  if (/\b(?:community|area|district|neighbourhood|neighborhood|location|projects)\b/i.test(query) && item.kind === "community") score += 20;
  if (/\b(?:project|development|apartment|villa|townhouse|penthouse|handover|payment plan|price)\b/i.test(query) && item.kind === "project") score += 12;
  return score;
}

export function rankPsrSiteKnowledge(query: string, limit = 5) {
  const scored = knowledgeItems
    .map((item) => ({ item, score: itemScore(item, query) }))
    .filter(({ score }) => score >= 8)
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title));
  const selected: PsrKnowledgeItem[] = [];
  for (const { item } of scored) {
    if (selected.some((candidate) => candidate.route === item.route)) continue;
    selected.push(item);
    if (selected.length >= Math.max(1, Math.min(limit, 8))) break;
  }
  return selected;
}

export function psrKnowledgeFallback(query: string, items = rankPsrSiteKnowledge(query, 3)) {
  const lead = items[0];
  if (!lead) return "I can help you use the PSR project catalogue, developer and community pages, market research, services and acquisition tools. Give me a project, community or decision and I’ll ground the answer in the relevant PSR page.";
  const meaningfulFacts = lead.facts.filter(Boolean);
  const priorityFacts = meaningfulFacts.filter((fact) =>
    /published status|sold out|availability|on request|historical/i.test(fact),
  );
  const supportingFacts = meaningfulFacts.filter((fact) => !priorityFacts.includes(fact));
  const facts = [...priorityFacts, ...supportingFacts].slice(0, 4).join(" ");
  if (lead.kind === "project") {
    return `${lead.summary} ${facts} These are development-level facts from the dated source record, not proof of live unit availability or a bedroom-level quote. I can compare it with another project or help you prepare a verification list.`;
  }
  if (lead.kind === "insight") {
    return `${lead.summary} ${facts} The linked PSR research page keeps the definitions, period and source notes together so unlike datasets are not treated as directly comparable.`;
  }
  if (lead.kind === "developer") {
    return `${lead.summary} ${facts} This is catalogue coverage, not a blanket endorsement of every project. I can compare the recorded projects on delivery timing, residence mix and entry terms, then flag what still needs live verification.`;
  }
  if (lead.kind === "community") {
    return `${lead.summary} ${facts} This describes the indexed project mix, not live inventory. I can narrow the community records around your home or investment priorities without stretching your criteria.`;
  }
  return `${lead.summary} ${facts}`;
}

export function psrKnowledgeLinks(items: PsrKnowledgeItem[]) {
  return items.slice(0, 3).map((item) => ({
    title: item.title,
    category: item.kind === "project" ? "Project record" : item.kind === "developer" ? "Developer profile" : item.kind === "community" ? "Community guide" : item.kind === "insight" ? "PSR research" : item.kind === "service" ? "PSR service" : "About PSR",
    href: item.route,
  }));
}
