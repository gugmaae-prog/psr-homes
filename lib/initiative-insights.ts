import { EMIRATE_IDENTITIES, type EmirateSlug } from "@/data/emirates";
import {
  emirateMarketOverviews,
  uaeMarketOverview,
  type EditorialCover,
  type MarketSource,
  type StrategicInitiative,
} from "@/data/emirate-market-overviews";
import type { Insight, InsightCategory, InsightInitiative } from "@/lib/insights";

const PUBLISHED = "2 September 2026";

const existingArticleByInitiativeId: Record<string, string> = {
  "uae-passenger-rail": "etihad-rail-passenger-network-uae-property-impact-2026",
  "wynn-rak": "wynn-al-marjan-island-2027-resort-property-briefing",
  "guggenheim-ad": "guggenheim-abu-dhabi-opening-saadiyat-property-lens",
  "harry-potter-ad": "harry-potter-land-yas-island-confirmed-facts",
};

type InitiativeContext = {
  initiative: StrategicInitiative;
  sources: MarketSource[];
  jurisdiction: string;
  emirateSlug?: EmirateSlug;
  cover: EditorialCover;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoryFor(value: string): InsightCategory {
  if (/culture|museum|creative|tourism|resort|hospitality|theme|art|wellness/i.test(value)) return "Culture & tourism";
  if (/energy|solar|hydrogen|water|biofuel|waste|sustain|environment|reef|mangrove|resources/i.test(value)) return "Energy & industry";
  if (/rail|metro|transport|mobility|airport|road|port|logistics|terminal|aviation/i.test(value)) return "Infrastructure & mobility";
  return "UAE economy";
}

function widerLens(category: string, jurisdiction: string) {
  if (/culture|museum|creative|tourism|resort|hospitality|theme|art|wellness/i.test(category)) {
    return `Culture and visitor infrastructure can strengthen ${jurisdiction}'s identity, international reach, hospitality demand and resident experience. The useful measure is sustained visitation, programming and local economic participation after launch—not the announcement alone.`;
  }
  if (/energy|solar|hydrogen|water|biofuel|waste|sustain|environment|reef|mangrove|resources/i.test(category)) {
    return `Energy, water and environmental capacity shape how ${jurisdiction} can support population, industry and future development. Delivery quality, operating economics and resilience matter more than headline capacity in isolation.`;
  }
  if (/rail|metro|transport|mobility|airport|road|port|logistics|terminal|aviation/i.test(category)) {
    return `Transport and logistics investment can change journey times, labour catchments, trade capacity and the relationship between districts across ${jurisdiction}. The economic effect depends on the delivered network, access and service pattern rather than proximity on a map.`;
  }
  return `The initiative belongs within ${jurisdiction}'s wider economic platform: employment, enterprise formation, institutional capacity and quality of place. Its contribution should be measured through delivered activity rather than treated as an automatic property-price signal.`;
}

function deliveryLens(status: StrategicInitiative["status"]) {
  if (status === "Operating") return "Because the initiative is operating, the next evidence is usage, service quality, capacity and the distribution of measurable benefits.";
  if (status === "Under construction") return "Construction is stronger evidence than an announcement, but completion, commissioning and operational performance remain separate milestones.";
  if (status === "Procurement") return "Procurement establishes intent and market engagement; award, financing, construction and operation must still be verified separately.";
  if (status === "Active programme" || status === "Phased / mixed") return "A phased programme should be assessed component by component because delivered, funded and proposed elements can sit under the same headline.";
  if (status === "In development") return "Development-stage scope, financing and timing can change before construction and operation, so dated official updates remain essential.";
  if (status === "Announced") return "An announcement is an early signal, not proof of funding, construction or an opening date. Later official milestones should replace assumptions as they become available.";
  return "A strategy sets direction and priorities rather than guaranteeing that every component will be funded or delivered on the same timetable.";
}

function sourceList(sourceIds: string[], sources: MarketSource[]) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return sourceIds.flatMap((id) => {
    const source = sourceById.get(id);
    return source ? [{ title: source.label, url: source.href, publisher: source.publisher, checkedAt: source.verifiedAt }] : [];
  });
}

function initiativeMeta(context: InitiativeContext): InsightInitiative {
  const primarySource = context.sources.find((source) => context.initiative.sourceIds.includes(source.id));
  return {
    id: context.initiative.id,
    name: context.initiative.name,
    jurisdiction: context.jurisdiction,
    emirateSlug: context.emirateSlug,
    status: context.initiative.status,
    timing: context.initiative.timing,
    verifiedAt: primarySource?.verifiedAt || "2026-09-02",
    atlasHref: context.emirateSlug ? `/emirate/${context.emirateSlug}#future-pipeline` : "/emirate#uae-future-pipeline",
  };
}

function generatedSlug(context: InitiativeContext) {
  const scope = context.emirateSlug || "uae";
  return `${scope}-${slugify(context.initiative.name)}-market-briefing`;
}

function buildInsight(context: InitiativeContext): Insight {
  const { initiative, jurisdiction } = context;
  const category = categoryFor(initiative.category);
  const checkedAt = context.sources.find((source) => initiative.sourceIds.includes(source.id))?.verifiedAt || "2026-09-02";
  const slug = generatedSlug(context);
  return {
    slug,
    category,
    title: `${initiative.name}: ${jurisdiction} market briefing`,
    dek: `${initiative.summary} PSR places the confirmed status, timing and wider economic significance in one source-linked ${jurisdiction} briefing.`,
    readTime: "4 min",
    image: `/insights/initiatives/${slug}-v1.webp`,
    imageAlt: `PSR Homes editorial visualization of ${initiative.name} in ${jurisdiction}`,
    imageCaption: `AI-assisted editorial visualization produced for PSR Homes to illustrate ${initiative.name}. It is not an official project rendering or masterplan.`,
    published: PUBLISHED,
    updated: PUBLISHED,
    tags: [jurisdiction, initiative.category, initiative.status, "UAE Market Atlas"],
    initiative: initiativeMeta(context),
    takeaways: [
      `${initiative.name} is recorded as ${initiative.status.toLowerCase()}, with timing stated as ${initiative.timing}.`,
      initiative.summary,
      initiative.marketImpact,
    ],
    sections: [
      {
        heading: "What is confirmed",
        body: [
          `${initiative.summary} The current PSR record classifies the initiative as ${initiative.status.toLowerCase()} and records its timing as ${initiative.timing}.`,
          `${deliveryLens(initiative.status)} This briefing therefore keeps the status and evidence date visible instead of presenting a target as a completed outcome.`,
        ],
      },
      {
        heading: `Why it matters to ${jurisdiction}`,
        body: [
          initiative.marketImpact,
          widerLens(initiative.category, jurisdiction),
        ],
      },
      {
        heading: "What to watch next",
        body: [
          `Track the responsible authority or operator for changes to scope, award, construction, opening and operating performance. The source register below is the verification baseline checked on ${checkedAt}.`,
          `For any property decision, test the actual connection between the initiative and the selected asset: access, employment or visitor demand, competing supply, delivery timing and recurring costs. PSR treats the initiative as market context, not a promise of capital growth or rental returns.`,
        ],
      },
    ],
    sources: sourceList(initiative.sourceIds, context.sources),
  };
}

export const initiativeContexts: InitiativeContext[] = [
  ...uaeMarketOverview.futureInitiatives.map((initiative) => ({
    initiative,
    sources: uaeMarketOverview.sources,
    jurisdiction: "United Arab Emirates",
    cover: uaeMarketOverview.cover,
  })),
  ...EMIRATE_IDENTITIES.flatMap(({ slug, name }) => {
    const overview = emirateMarketOverviews[slug];
    return overview.futureInitiatives.map((initiative) => ({
      initiative,
      sources: overview.sources,
      jurisdiction: name,
      emirateSlug: slug,
      cover: overview.cover,
    }));
  }),
];

const contextByInitiativeId = new Map(initiativeContexts.map((context) => [context.initiative.id, context]));

export const initiativeArticleSlugById = Object.fromEntries(
  initiativeContexts.map((context) => [context.initiative.id, existingArticleByInitiativeId[context.initiative.id] || generatedSlug(context)]),
) as Record<string, string>;

export const generatedInitiativeInsights = initiativeContexts
  .filter((context) => !existingArticleByInitiativeId[context.initiative.id])
  .map(buildInsight);

export function initiativeMetadataForArticle(slug: string) {
  const entry = Object.entries(initiativeArticleSlugById).find(([, articleSlug]) => articleSlug === slug);
  return entry ? initiativeMeta(contextByInitiativeId.get(entry[0]) as InitiativeContext) : undefined;
}
