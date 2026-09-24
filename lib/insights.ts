import { getProjectRecord } from "@/lib/imported-projects";
import type { EmirateSlug } from "@/data/emirates";
import {
  generatedInitiativeInsights,
  initiativeArticleSlugById,
  initiativeMetadataForArticle,
} from "@/lib/initiative-insights";

export type InsightCategory =
  | "Market research"
  | "Video briefing"
  | "Investor guide"
  | "Community intelligence"
  | "New launches"
  | "Developer analysis"
  | "UAE economy"
  | "Infrastructure & mobility"
  | "Culture & tourism"
  | "Energy & industry";

export type InsightInitiative = {
  id: string;
  name: string;
  jurisdiction: string;
  emirateSlug?: EmirateSlug;
  status: string;
  timing: string;
  verifiedAt: string;
  atlasHref: string;
};

export type Insight = {
  slug: string;
  category: InsightCategory;
  title: string;
  dek: string;
  readTime: string;
  image: string;
  imageAlt?: string;
  imageCaption?: string;
  published: string;
  updated?: string;
  tags?: string[];
  initiative?: InsightInitiative;
  takeaways: string[];
  sections: { heading: string; body: string[] }[];
  sources?: { title: string; url: string; publisher?: string; checkedAt?: string }[];
  charts?: InsightChart[];
};

export type InsightChart = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  period: string;
  unit: string;
  kind: "bars" | "columns";
  data: { label: string; value: number; display: string }[];
  sourceLabel: string;
  sourceUrl: string;
};

const editorialImages: Record<string, string> = {
  "difc-zabeel-district-dubai": "/insights/dubai-zabeel-skyline.jpg",
  "emaar-marina-shores-at-dubai-marina-apartments-for-sale": "/insights/dubai-marina-residences.webp",
  "peninsula-four-the-plaza-select-group-business-bay-dubai": "/insights/business-bay-waterfront.jpg",
  "greencrest-dubai-hills-estate-emaar": "/insights/dubai-hills-residences.jpg",
  "maison-margiela-residences-palm-jumeirah-dubai": "/insights/palm-branded-residence.webp",
  "wyndham-residences-al-marjan-island-rak-uae": "/insights/rak-resort-residence.webp",
  "chelsea-residences-damac-properties-dubai-maritime-city": "/insights/dubai-maritime-residences.webp",
  "bashayer-final-phase-modon-hudayriyat-island-abu-dhabi": "/insights/abu-dhabi-community.jpg",
  "arancia-yards-2-beyond-city-of-arabia-dubai": "/insights/green-community.jpg",
};

function projectImage(slug: string) {
  return editorialImages[slug] || getProjectRecord(slug)?.image || "/insights/dubai-marina-residences.webp";
}

export const marketResearchCharts: InsightChart[] = [
  {
    id: "dubai-monthly-transition-q1-2026",
    eyebrow: "Monthly pulse",
    title: "Activity slowed sharply in March, without erasing Q1 growth",
    description: "The first two months averaged 16,100 residential sales. March recorded 12,900 as the regional conflict interrupted momentum; the quarter still finished 4% above Q1 2025 by volume.",
    period: "Q1 2026",
    unit: "Residential sales",
    kind: "columns",
    data: [
      { label: "Jan–Feb monthly average", value: 16100, display: "16.1k" },
      { label: "March", value: 12900, display: "12.9k" },
    ],
    sourceLabel: "Emirates NBD Research",
    sourceUrl: "https://www.emiratesnbdresearch.com/en/articles/dubai-residential-review-q1-2026?category=fx-forecasts",
  },
  {
    id: "dubai-quarterly-sales-value",
    eyebrow: "Quarterly comparison",
    title: "Residential sales value remained above the prior-year quarter",
    description: "Q1 2026 residential sales reached AED 143.1 billion, a reported 22.2% increase from Q1 2025 despite a more selective finish to the quarter.",
    period: "Q1 2025–Q1 2026",
    unit: "AED billions",
    kind: "bars",
    data: [
      { label: "Q1 2025", value: 117.1, display: "AED 117.1bn" },
      { label: "Q1 2026", value: 143.1, display: "AED 143.1bn" },
    ],
    sourceLabel: "Engel & Völkers Research",
    sourceUrl: "https://www.engelvoelkers.com/ae/en/research/residential-market-report-q1-2026",
  },
  {
    id: "dubai-historical-transaction-value",
    eyebrow: "Historical depth",
    title: "Registered real-estate transaction value expanded across four years",
    description: "Dubai Land Department’s all-market series includes sales, mortgages and other registered real-estate transactions. It should not be compared directly with residential-sales-only charts.",
    period: "2021–2024",
    unit: "AED billions · all real-estate transactions",
    kind: "columns",
    data: [
      { label: "2021", value: 300, display: "300" },
      { label: "2022", value: 528, display: "528" },
      { label: "2023", value: 634, display: "634" },
      { label: "2024", value: 761, display: "761" },
    ],
    sourceLabel: "Dubai Land Department",
    sourceUrl: "https://dubailand.gov.ae/en/open-data/research/annual-report-real-estate-sector-performance-2024/",
  },
  {
    id: "global-prime-city-five-year-change",
    eyebrow: "Global hotspot comparison",
    title: "Five-year prime residential price performance is highly uneven",
    description: "The comparison provides context, not a forecast. Each city has different taxes, financing conditions, supply constraints and currency exposure.",
    period: "Five years to Q2 2025",
    unit: "Prime residential price change",
    kind: "bars",
    data: [
      { label: "Tokyo", value: 120, display: "+120.0%" },
      { label: "Dubai", value: 107, display: "+107.0%" },
      { label: "Seoul", value: 80.9, display: "+80.9%" },
      { label: "Miami", value: 80.3, display: "+80.3%" },
      { label: "Manila", value: 77.5, display: "+77.5%" },
      { label: "London", value: -2.3, display: "−2.3%" },
      { label: "New York", value: -1.4, display: "−1.4%" },
    ],
    sourceLabel: "Knight Frank Research",
    sourceUrl: "https://www.knightfrank.com/research/reports/global/the-residence-report-3041/contentassets/the-residence-report-202526-12403.pdf",
  },
];

const editorialInsights: Insight[] = [
  {
    slug: "etihad-rail-passenger-network-uae-property-impact-2026",
    category: "Market research",
    title: "Etihad Rail passenger services: the property lens beyond the headline",
    dek: "A dated view of the UAE passenger network now in phased operation, the next confirmed station openings and how to assess accessibility without pricing speculation into an asset.",
    readTime: "8 min",
    image: "/insights/etihad-rail-passenger-network.png",
    published: "25 August 2026",
    takeaways: ["Passenger services are operating between Fujairah and Abu Dhabi, with the network expanding in phases.", "Dubai and Al Dhaid stations are scheduled for 30 September 2026; Sharjah is scheduled for 30 March 2027.", "A station announcement is context, not proof that every nearby property will outperform."],
    sections: [
      { heading: "The network is moving from announcement to operation", body: ["Etihad Rail welcomed its first paying passengers on 30 June 2026 on a scheduled Fujairah-to-Abu Dhabi service. By 3 August, the operator reported more than 70,000 tickets sold and an average booking lead time of 12 days.", "That evidence is stronger than a future map alone: it indicates real early use. It remains an introductory operating phase, so frequency, capacity, interchange quality and station access should continue to be monitored as the network scales."] },
      { heading: "Keep the confirmed opening sequence visible", body: ["Etihad Rail says Dubai and Al Dhaid stations are scheduled to open on 30 September 2026, Liwa and Madinat Zayed on 30 November, and the remaining Al Dhafra stations on 30 December. Sharjah is scheduled for 30 March 2027.", "Dates can change on infrastructure programmes. A property decision should therefore record the source date and retain a fallback case that does not depend on a future station opening exactly on schedule."] },
      { heading: "Translate rail access into a door-to-door test", body: ["The useful question is not simply whether a property is near the railway. Measure the actual route to the station, parking and feeder transport, service frequency, final destination, and whether the journey competes with the car for the resident profile likely to occupy the property.", "Rail can widen access to employment, education and leisure, but the effect will vary by community and product. Existing amenities, layout, building quality and live comparable evidence remain more immediate valuation inputs."] },
    ],
    sources: [
      { title: "Etihad Rail: first national passenger service begins", url: "https://corporate.etihadrail.ae/en/newsroom/press/the-uaes-first-national-passenger-rail-service-begins-as-etihad-rail-welcomes-first-paying-passengers" },
      { title: "Etihad Rail: 70,000 tickets and confirmed station sequence", url: "https://corporate.etihadrail.ae/en/newsroom/press/etihad-rail-passes-70000-tickets-sold-as-passengers-begin-planning-their-lives-around-rail" },
    ],
  },
  {
    slug: "wynn-al-marjan-island-2027-resort-property-briefing",
    category: "Community intelligence",
    title: "Wynn Al Marjan Island: what is confirmed for the 2027 resort",
    dek: "An official-source briefing on the resort programme, completed shoreline works and the questions property investors around Al Marjan Island should still keep open.",
    readTime: "8 min",
    image: "/insights/wynn-al-marjan-island.jpg",
    published: "24 August 2026",
    takeaways: ["Wynn continues to state a 2027 opening for its Ras Al Khaimah integrated resort.", "The latest official release confirms a completed 550-metre beachfront, lagoon and offshore reef.", "Destination investment can support demand, but it does not replace project-level occupancy, service-cost and supply analysis."],
    sections: [
      { heading: "Separate confirmed delivery from the wider destination story", body: ["Wynn’s 11 August 2026 update states that the resort remains set to open in 2027 and confirms completion of a 550-metre beachfront, sheltered lagoon and 319-metre offshore reef. The published programme includes 1,530 rooms and suites, 22 restaurants, lounges and bars, a theatre, spa, retail, event spaces, pools and a private beach.", "Wynn’s investor disclosures describe the project as the UAE’s first integrated resort and identify a gaming component. Those are operator statements about the resort; they are not a guarantee of pricing, rental returns or absorption for surrounding residential projects."] },
      { heading: "Connectivity is part of the operating case", body: ["A separate February 2026 update describes a 548-metre Wynn Bridge linking the resort through Wynn Boulevard to the E311 and E611 corridors, with completion targeted for late 2026 at the time of that release.", "Investors should verify the eventual journey time, public access, traffic management and relationship between each residence and the resort rather than using island-level proximity as a substitute for site-specific access."] },
      { heading: "Model the destination and the asset separately", body: ["A major resort can deepen tourism demand, employment, hospitality infrastructure and global recognition. It can also attract a large competing pipeline of hotel rooms, branded residences and investor-owned units.", "For each property, test beach relationship, operator agreement, short-term rental rules, service charges, completion cluster, conservative occupancy and an exit case that does not require continuous launch-price growth."] },
    ],
    sources: [
      { title: "Wynn Resorts: August 2026 shoreline and resort update", url: "https://www.newsroom.wynnresorts.com/en/wynnalmarjan/wynn-al-marjan-island-unveils-beach--lagoon--and-reef--offering-first-glimpse-of-future-shoreline-ex/s/c7506377-c4e6-48c9-ac9e-c324f33f9695" },
      { title: "Wynn Resorts: February 2026 bridge construction update", url: "https://www.newsroom.wynnresorts.com/en/en/wynnalmarjan/wynn-al-marjan-island-advances-landmark-infrastructure-with-the-construction-of-wynn-bridge/s/2f78302c-a04d-4e23-9566-e1d1e89b23fc" },
      { title: "Wynn Resorts: future development disclosure", url: "https://investors.wynnresorts.com/static-files/6e3d3053-83e7-4992-9b3b-79f2820c5014" },
    ],
  },
  {
    slug: "guggenheim-abu-dhabi-opening-saadiyat-property-lens",
    category: "Community intelligence",
    title: "Guggenheim Abu Dhabi: a confirmed opening and the Saadiyat property lens",
    dek: "What the official 11 December 2026 opening means for Saadiyat Cultural District, and why cultural infrastructure should be assessed as a long-term demand layer rather than a price promise.",
    readTime: "7 min",
    image: "/insights/guggenheim-abu-dhabi.webp",
    published: "23 August 2026",
    takeaways: ["Guggenheim Abu Dhabi is officially scheduled to open on 11 December 2026.", "The museum will contain 30 galleries, with 11,600 square metres of interior gallery space.", "Cultural depth can strengthen destination quality, but each residence still requires its own access, view, service-cost and comparable-sales review."],
    sections: [
      { heading: "The opening date is now official", body: ["The Department of Culture and Tourism – Abu Dhabi announced on 28 July 2026 that Guggenheim Abu Dhabi will open on 11 December 2026. The Frank Gehry-designed museum joins Louvre Abu Dhabi, Zayed National Museum, Natural History Museum Abu Dhabi and teamLab Phenomena in Saadiyat Cultural District.", "The government release describes 30 galleries, ten sculptural cones, 11,600 square metres of interior gallery space, 23,000 square metres of outdoor exhibition areas and a total built-up area of 80,000 square metres."] },
      { heading: "Cultural infrastructure works through several demand channels", body: ["A concentrated museum district can support tourism, hospitality, education, employment and global destination recognition. For residential property, the effect may appear through owner appeal, visitor demand and the maturity of the wider public realm rather than through one immediate price movement.", "The strongest cases are assets that also work without the event premium: practical access, enduring views, credible management, efficient layouts and a resident proposition aligned with the island’s long-term character."] },
      { heading: "Do not price the announcement twice", body: ["Public infrastructure can be reflected in land and launch pricing before it opens. Compare the selected property with recent achieved transactions and competing supply, not only with older prices from before the cultural district matured.", "Record walking or driving access to the museums, construction exposure, service cost and the buyer or tenant audience. A landmark nearby is a demand signal, not a unit-level valuation."] },
    ],
    sources: [
      { title: "Abu Dhabi Media Office: Guggenheim Abu Dhabi opening announcement", url: "https://www.mediaoffice.abudhabi/en/arts-culture/department-of-culture-and-tourism-abu-dhabi-announces-opening-of-guggenheim-abu-dhabi-on-11-december-2026/" },
      { title: "Department of Culture and Tourism – Abu Dhabi: Guggenheim profile", url: "https://dct.gov.ae/en/what.we.do/culture/museums/guggenheim.aspx" },
    ],
  },
  {
    slug: "harry-potter-land-yas-island-confirmed-facts",
    category: "Community intelligence",
    title: "Harry Potter land on Yas Island: the confirmed facts and the open questions",
    dek: "A location-correct briefing on the planned Warner Bros. World Abu Dhabi expansion, with a clear line between the official announcement and unconfirmed opening-date speculation.",
    readTime: "6 min",
    image: "/insights/harry-potter-yas-island.jpg",
    published: "22 August 2026",
    takeaways: ["The planned Harry Potter land is on Yas Island in Abu Dhabi, not Ras Al Khaimah.", "It will be part of Warner Bros. World Abu Dhabi and is officially described as significant in scale.", "Miral’s official announcement did not publish a groundbreaking or opening date."],
    sections: [
      { heading: "Start with the correct location", body: ["Miral and Warner Bros. Discovery announced that a Harry Potter-themed land will be added inside Warner Bros. World Abu Dhabi on Yas Island. The official release says it will join the park’s six existing immersive lands and will be significant in scale.", "This is an Abu Dhabi tourism and entertainment project. It should not be used as evidence for a Ras Al Khaimah property case, where Wynn Al Marjan Island and the wider resort pipeline are separate demand drivers."] },
      { heading: "The date remains an evidence gap", body: ["Miral’s announcement states that the groundbreaking date was yet to be revealed and does not provide an opening date. PSR therefore treats online completion-date claims as unconfirmed until Miral or Warner Bros. World publishes a dated update.", "That distinction matters for property analysis. A long-term attraction can support destination depth, but a purchase should not rely on a guessed opening year or assumed visitor numbers."] },
      { heading: "Assess the whole Yas Island proposition", body: ["Yas Island already combines theme parks, events, hospitality, retail, waterfront development and residential communities. A new themed land would add to an established tourism platform rather than create one from zero.", "For a residence, compare practical road access, noise, event traffic, community amenities, current rents, service charges and future residential supply. The attraction is context; the property must still succeed on its own fundamentals."] },
    ],
    sources: [
      { title: "Miral and Warner Bros. Discovery: official Harry Potter land announcement", url: "https://miral.ae/news-item/miral-and-warner-bros-discovery-announce-harry-potter-themed-land-coming-to-abu-dhabis-yas-island/" },
      { title: "Warner Bros. World Abu Dhabi: Harry Potter land page", url: "https://www.wbworldabudhabi.com/en/explore-the-lands/harry-potter" },
    ],
  },
  {
    slug: "dubai-market-pulse-monthly-quarterly-historical-2026",
    category: "Market research",
    title: "Dubai market pulse: monthly, quarterly and historical signals",
    dek: "A research dashboard separating monthly momentum, quarterly residential activity and the longer registered-transaction cycle—without mixing unlike definitions.",
    readTime: "12 min",
    image: projectImage("difc-zabeel-district-dubai"),
    published: "23 July 2026",
    takeaways: ["March recorded a material activity slowdown after a strong January and February.", "Q1 2026 still exceeded Q1 2025 in both residential sales volume and value.", "Long-run transaction expansion does not remove community-level supply and pricing risk."],
    charts: marketResearchCharts.slice(0, 3),
    sections: [
      { heading: "Start by defining the dataset", body: ["Market totals differ because Dubai Land Department’s broad real-estate transaction series includes categories beyond residential sales, while residential research reports isolate a narrower set of transfers. DXB Interact also separates sales from mortgage registrations and excludes gift transfers from its sales measures. A credible trend begins by keeping those definitions visible.", "The monthly, quarterly and annual charts in this briefing are therefore presented as separate analytical lenses. Their direction can be compared; their absolute totals should not be combined into one series."] },
      { heading: "Monthly momentum changed inside the quarter", body: ["Emirates NBD Research reported an average of 16,100 residential transactions in each of January and February 2026, followed by 12,900 in March. That is a clear interruption to momentum, consistent with buyers taking more time during conflict-related uncertainty.", "The same report records more than 45,200 transfers across Q1, 4% above the prior-year quarter. This combination matters: a market can slow sharply at the margin while the full quarter remains positive. Investors should watch subsequent monthly registrations before declaring either a permanent reversal or an immediate recovery."] },
      { heading: "Quarterly value was supported by mix as well as volume", body: ["Engel & Völkers reported AED 143.1 billion of Q1 2026 residential sales across 44,743 transactions, with value up 22.2% and volume up 4.6% year on year. Off-plan represented 67.3% of transactions, keeping project selection, developer execution and completion supply central to the risk assessment.", "Higher transaction value with slower volume growth can reflect price movement, larger-ticket sales or a changing product mix. It is not sufficient evidence that every segment appreciated at the same rate."] },
      { heading: "The historical curve shows scale—and the need for discipline", body: ["Dubai Land Department reported all-market registered transaction value of about AED 300 billion in 2021, AED 528 billion in 2022, AED 634 billion in 2023 and AED 761 billion in 2024. The expansion demonstrates market depth, capital formation and a larger institutional framework.", "Scale can improve liquidity and data visibility, but it can also coexist with local oversupply. The practical investment test remains asset-level: achieved price per square foot, comparable rent, handover concentration, service cost, financing exposure and exit depth in the exact community."] },
      { heading: "A monthly research routine", body: ["Track completed and off-plan sales separately; compare registrations with launches and handovers; watch the spread between asking and achieved prices; and review new versus renewed tenancy contracts. Record both volume and value because one can rise while the other weakens.", "At quarter-end, rebuild the view by community and ticket size. Citywide averages are a context layer, not a substitute for a comparable-sales set around the property being considered."] },
    ],
    sources: [
      { title: "DXB Interact: transaction-data methodology", url: "https://dxbinteract.com/news/dubai-property-transaction-data-structure" },
      { title: "Emirates NBD Research: Dubai Residential Review Q1 2026", url: "https://www.emiratesnbdresearch.com/en/articles/dubai-residential-review-q1-2026?category=fx-forecasts" },
      { title: "Engel & Völkers: Dubai Residential Report Q1 2026", url: "https://www.engelvoelkers.com/ae/en/research/residential-market-report-q1-2026" },
      { title: "Dubai Land Department: Real Estate Sector Performance 2024", url: "https://dubailand.gov.ae/en/open-data/research/annual-report-real-estate-sector-performance-2024/" },
    ],
  },
  {
    slug: "real-estate-resilience-after-conflict-global-hotspots",
    category: "Market research",
    title: "Real estate resilience after conflict: what the data can—and cannot—promise",
    dek: "A sober study of how Dubai and other global hotspots absorb shocks, why activity can return quickly, and why resilience must never be presented as a guaranteed rebound.",
    readTime: "13 min",
    image: projectImage("marina-cove-by-emaar-properties-in-dubai-marina"),
    published: "23 July 2026",
    takeaways: ["Conflict first affects liquidity, confidence, travel and construction timing—not every segment equally.", "Dubai entered the latest shock with strong transaction depth, fiscal buffers and high international demand.", "Recovery history is evidence of capacity, not a promise that prices always return faster or higher."],
    charts: [marketResearchCharts[0], marketResearchCharts[3]],
    sections: [
      { heading: "Resilience is a process, not a slogan", body: ["Real-estate markets do not always bounce back better, and the timing of any recovery cannot be guaranteed. A resilient market is one that can continue registering transactions, funding projects, operating buildings and attracting residents while repricing risk transparently.", "The first response to conflict is usually a widening gap between buyers and sellers. Volumes can fall before headline prices move because owners delay listing and buyers pause. Construction logistics, insurance, aviation and corporate mobility can then transmit the shock differently across off-plan, ready, prime and income-producing assets."] },
      { heading: "The Q1 2026 record shows both interruption and continuity", body: ["Emirates NBD Research recorded a fall from an average 16,100 monthly residential sales in January and February to 12,900 in March as conflict disrupted momentum. Yet Q1 volume remained 4% above the same quarter in 2025. CBRE likewise described a transition toward recalibration while recording more than 45,000 sales and over AED 137 billion in value.", "This is not proof that the market is immune. It shows that the shock arrived after two strong months and that registrations, product mix and price measures moved at different speeds. April and subsequent quarters are required to distinguish a pause from a deeper cycle change."] },
      { heading: "Why global hubs can absorb shocks differently", body: ["International gateways draw demand from employment, education, lifestyle, wealth migration and currency diversification. Their buyer pools can be broader than those of markets dependent on one domestic credit cycle. At the same time, global hubs are exposed to cross-border capital rules, travel disruption and shifts in risk appetite.", "Knight Frank’s five-year prime residential comparison placed Tokyo, Dubai, Seoul, Miami and Manila among the strongest performers to Q2 2025, while London and New York were slightly negative. The dispersion demonstrates that prestige alone does not determine performance; supply, taxation, financing and policy matter."] },
      { heading: "Dubai’s earlier recovery provides a useful—but limited—analogy", body: ["During the 2020 pandemic shock, Dubai Land Department recorded 1,452 sales in May, 2,404 in July, 3,849 in September and 3,751 in December. The market recovered activity rapidly as restrictions eased, and 2021 subsequently registered more than 84,000 real-estate transactions worth almost AED 300 billion.", "A pandemic is not a war, and one recovery path should not be copied onto another shock. The useful lesson is operational: policy response, safe mobility, banking liquidity, construction continuity and transparent registration can shorten the period between uncertainty and price discovery."] },
      { heading: "How an investor should navigate a conflict window", body: ["Preserve liquidity, reduce reliance on a near-term resale, verify construction and escrow status, and stress-test rent and completion timing. Prefer assets with a deep comparable set, usable layouts and an identifiable end-user base. A discount is meaningful only when the underlying cash flow and legal position remain sound.", "Watch monthly transfers, mortgage registrations, cancellations, handovers, tenancy renewals, hotel and aviation demand, and corporate occupancy. A genuine recovery is broader than a launch-week sales spike: it appears across repeat transactions, leasing, absorption and operating performance."] },
      { heading: "The correct conclusion", body: ["Dubai has repeatedly demonstrated an ability to adapt, supported by infrastructure, international connectivity, government capacity and a more mature property-data and regulatory system. Those strengths improve recovery capacity.", "They do not eliminate cycle risk. The responsible investment case is not that real estate always rebounds higher after conflict; it is that well-capitalised global hubs can navigate shocks more effectively when liquidity, governance, demand diversity and asset quality remain intact."] },
    ],
    sources: [
      { title: "Emirates NBD Research: Dubai Residential Review Q1 2026", url: "https://www.emiratesnbdresearch.com/en/articles/dubai-residential-review-q1-2026?category=fx-forecasts" },
      { title: "CBRE: UAE Real Estate Market Review Q1 2026", url: "https://www.cbre.ae/insights/figures/uae-real-estate-market-review-q1-2026" },
      { title: "Dubai Land Department: 2020 official sales-price index", url: "https://dubailand.gov.ae/en/news-media/mo-asher-2020-ends-on-high-note-robust-2021/" },
      { title: "Dubai Land Department: 2021 market results", url: "https://dubailand.gov.ae/en/news-media/dld-2021-achieved-exceptional-results-that-will-contribute-to-enabling-the-real-estate-sector-s-journey-towards-the-next-50-years/" },
      { title: "Knight Frank: The Residence Report 2025–26", url: "https://www.knightfrank.com/research/reports/global/the-residence-report-3041/contentassets/the-residence-report-202526-12403.pdf" },
    ],
  },
  {
    slug: "uae-development-index-2026",
    category: "Market research",
    title: "The UAE development index: reading supply beyond the headline",
    dek: "A disciplined way to compare a growing UAE project index across seven emirates without treating every launch as an equivalent investment.",
    readTime: "9 min",
    image: projectImage("terra-woods-emaar-expo-city-dubai"),
    published: "22 July 2026",
    takeaways: ["Separate active supply from archived project records.", "Compare by developer, micro-market and residence type.", "Treat payment structure and completion timing as part of the price."],
    sections: [
      { heading: "A catalogue is not a recommendation", body: ["A large project universe is useful only when it is structured. The first pass should remove irrelevant geography, unsuitable residence types and delivery horizons that do not match the investor’s plan.", "The second pass is qualitative: developer record, master-plan maturity, competing supply and the practical usability of each layout. A lower entry price does not automatically create a stronger investment case."] },
      { heading: "Read the completion curve", body: ["Projects completing in the same period compete for tenants, buyers and fit-out capacity. Review handover clusters at community level and understand which units have genuinely differentiated views, layouts or service propositions.", "For off-plan buyers, liquidity before completion is never guaranteed. Reservation decisions should be made with a clear hold strategy and sufficient contingency."] },
      { heading: "Use the index as a decision system", body: ["Filter the market, inspect the project media and floor plans, then verify live inventory with an advisor. The purpose of the index is to make the shortlist smaller and the final questions sharper."] },
    ],
  },
  {
    slug: "how-to-read-a-dubai-payment-plan",
    category: "Video briefing",
    title: "How to read a Dubai payment plan before reserving",
    dek: "A concise briefing on construction payments, handover exposure and the questions that should be answered before a booking form is signed.",
    readTime: "6 min video brief",
    image: projectImage("peninsula-four-the-plaza-select-group-business-bay-dubai"),
    published: "18 July 2026",
    takeaways: ["Map every instalment to a realistic cash-flow date.", "Confirm what becomes payable at handover.", "Ask whether post-handover terms change the total commercial picture."],
    sections: [
      { heading: "Start with timing, not the headline split", body: ["A 60/40 plan can behave very differently depending on when the 60 percent is collected. Build a dated cash-flow schedule and include fees, currency exposure and furnishing or fit-out costs."] },
      { heading: "Understand the handover obligation", body: ["Confirm the documents, notices and payment conditions required for handover. Investors planning finance should test affordability well before completion rather than assuming future lending terms."] },
      { heading: "Treat flexibility as a tool", body: ["A longer payment schedule can support liquidity, but it should not compensate for an unsuitable asset. Location, layout, supply and developer delivery remain the primary decision factors."] },
    ],
  },
  {
    slug: "dubai-marina-building-selection",
    category: "Community intelligence",
    title: "Dubai Marina: why the building matters more than the postcode",
    dek: "A project-by-project framework for assessing view corridors, access, service levels and long-term marketability in Dubai Marina.",
    readTime: "7 min",
    image: projectImage("rove-home-dubai-marina-irth-group-dubai-marina"),
    published: "12 July 2026",
    takeaways: ["Use actual marina imagery—not generic Dubai landmarks.", "Study traffic access and the pedestrian route.", "Compare service charge against the building’s real operating proposition."],
    sections: [
      { heading: "One district, many submarkets", body: ["A tower near the beach, a residence facing the inner marina and a building near the southern entrance serve different occupier profiles. View, noise, sunlight and access can change materially within a short distance."] },
      { heading: "Protect the exit", body: ["Efficient layouts and a credible management standard support resale and leasing. Highly individual floor plans may command attention but narrow the eventual buyer pool."] },
    ],
  },
  {
    slug: "developer-due-diligence-framework",
    category: "Investor guide",
    title: "Developer due diligence: a practical UAE framework",
    dek: "How to move beyond branding and compare delivery record, current pipeline, product consistency and after-sales realities.",
    readTime: "8 min",
    image: projectImage("residences-hillside-park-dubai-hills-estate-dubai"),
    published: "7 July 2026",
    takeaways: ["Review delivered work as well as launch material.", "Measure the current pipeline by emirate and community.", "Understand who operates the asset after completion."],
    sections: [
      { heading: "Delivery is only the first test", body: ["Completion history matters, but so do specification consistency, communication, defects management and the quality of common-area operations after handover."] },
      { heading: "Pipeline concentration creates context", body: ["A large pipeline can indicate experience and market access, while also increasing execution and supply risk. Review the specific business line, partners and project team behind the development."] },
    ],
  },
  {
    slug: "branded-residences-investment-briefing",
    category: "Video briefing",
    title: "Branded residences: what the premium should actually buy",
    dek: "A visual briefing on operator standards, owner benefits, service charges and the difference between a name and an operating proposition.",
    readTime: "5 min video brief",
    image: projectImage("bella-by-passo-palm-jumeirah-beyond"),
    published: "1 July 2026",
    takeaways: ["Identify the operator’s contractual role.", "Price the recurring service proposition.", "Compare owner benefits that are documented, not implied."],
    sections: [
      { heading: "Brand, operator and manager are not always the same", body: ["Understand which party designs, operates and manages the residence. The durability of the premium depends on the day-to-day product as much as the launch identity."] },
      { heading: "Model recurring ownership costs", body: ["Premium amenities and hospitality services require funding. Service charges should be assessed against realistic rental strategy, personal use and the long-term maintenance of the asset."] },
    ],
  },
  {
    slug: "ras-al-khaimah-resort-property-lens",
    category: "Market research",
    title: "Ras Al Khaimah resort property: a sharper investment lens",
    dek: "How to examine beach relationship, hotel operation, delivery timing and occupancy assumptions across a fast-growing resort market.",
    readTime: "8 min",
    image: projectImage("lunara-the-strand-al-marjan-rak"),
    published: "24 June 2026",
    takeaways: ["Compare projects by actual beach and resort access.", "Separate owner use from rental-pool economics.", "Stress-test occupancy and exit assumptions."],
    sections: [
      { heading: "Resort property is operational real estate", body: ["The quality of the operator, reservation system, service proposition and owner agreement can materially affect outcomes. Marketing projections should be treated as scenarios rather than guarantees."] },
      { heading: "Supply arrives in phases", body: ["Track which projects and hotel rooms complete together. A strong destination story can coexist with near-term competition, making product differentiation and holding capacity important."] },
    ],
  },
  {
    slug: "benefits-of-investing-in-uae-real-estate",
    category: "Investor guide",
    title: "Benefits of investing in UAE real estate: the disciplined case",
    dek: "A practical review of ownership access, infrastructure, market choice and residency considerations without relying on headline promises.",
    readTime: "10 min",
    image: projectImage("emaar-il-primo-the-opera-district-in-downtown-dubai"),
    published: "22 July 2026",
    takeaways: ["Match the emirate and community to a defined investment objective.", "Treat ownership structure and residency eligibility as legal checks, not sales claims.", "Compare net performance after fees, service charges and vacancy assumptions."],
    sections: [
      { heading: "A broad market creates real choice", body: ["The UAE offers mature urban districts, waterfront communities, family master plans, commercial centres and destination-led resort markets. That range allows investors to choose an asset around income, personal use, capital preservation or a longer development thesis.", "Choice is valuable only when the comparison is consistent. Entry price, usable layout, competing supply, service costs, delivery timing and expected tenant profile should be reviewed together."] },
      { heading: "Ownership access is established but emirate-specific", body: ["Foreign ownership rules differ by emirate and designated area. Dubai permits foreign freehold ownership in specified zones, while other emirates operate their own investment-area frameworks. The title structure and registration route should be confirmed for the exact property before reservation.", "Long-term residence options may be available to qualifying property investors, but thresholds, documents and eligibility conditions can change. Buyers should verify the current position with the relevant land and immigration authorities."] },
      { heading: "Infrastructure supports demand, not every asset", body: ["Transport, aviation, business formation, tourism and population growth can support a market, but they do not make every development equally investable. Building quality, accessibility, management and future competing inventory still determine how an individual property performs.", "A strong UAE allocation begins with a specific objective and a conservative cash-flow model. Market growth should be treated as context rather than a substitute for asset selection."] },
    ],
    sources: [
      { title: "UAE Government: expatriates buying property", url: "https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae" },
      { title: "UAE Government: Golden Visa", url: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa" },
      { title: "UAE Government: investment destination overview", url: "https://u.ae/en/information-and-services/business/the-uae-an-ideal-investment-destination" },
    ],
  },
  {
    slug: "how-to-evaluate-new-property-launches-uae",
    category: "New launches",
    title: "How to evaluate a new UAE property launch before reserving",
    dek: "A production-ready checklist for separating launch-day urgency from the fundamentals that shape ownership and resale.",
    readTime: "9 min",
    image: projectImage("soma-residences-origami-dubai-islands-dubai"),
    published: "21 July 2026",
    takeaways: ["Read the master plan and the specific plot together.", "Compare usable layouts before comparing price per square foot.", "Map the complete payment schedule and likely exit window."],
    sections: [
      { heading: "Begin with the plot, not the campaign", body: ["Confirm the exact building position, orientation, access route and neighbouring plots. A compelling community concept can still contain materially different micro-locations.", "Review what is complete, under construction and planned. Future infrastructure can create value, but it can also introduce construction exposure and delayed amenity access."] },
      { heading: "Interrogate the product", body: ["Examine exterior renders, interior specifications and floor plans as separate evidence. Look for structural columns, circulation, storage, balcony usability, kitchen arrangement and the relationship between gross and usable area.", "Request the specification schedule and understand which finishes, appliances and furniture are included. A premium presentation does not by itself define the delivered product."] },
      { heading: "Model the whole commitment", body: ["Convert every instalment into a dated cash-flow schedule and include registration, agency, financing, furnishing and service-cost assumptions. Stress-test the plan if completion or financing conditions change.", "Reservation should follow a documented shortlist, not launch-day scarcity. The right question is whether the specific unit still makes sense after the marketing period has passed."] },
    ],
  },
  {
    slug: "emaar-developer-profile-investor-lens",
    category: "Developer analysis",
    title: "Emaar developer profile: how investors should read the pipeline",
    dek: "A framework for assessing Emaar projects by master plan, product line, handover timing and the characteristics of the individual unit.",
    readTime: "8 min",
    image: projectImage("creek-bay-dubai-creek-harbour-emaar"),
    published: "20 July 2026",
    takeaways: ["Separate the strength of the master plan from the merits of one building.", "Compare product and payment terms within the same development phase.", "Use delivered communities to test operating quality and resale depth."],
    sections: [
      { heading: "The master plan is part of the asset", body: ["Large-scale communities can create recognisable addresses, amenities and transaction depth. Investors should still identify where the selected building sits within the development sequence and how future phases may affect view, access and supply.", "The maturity of landscaping, schools, retail and transport can influence both tenant demand and the price paid for immediate convenience."] },
      { heading: "Product lines serve different buyers", body: ["Apartment towers, branded residences, villas and suburban family communities should not be compared only by developer name. Each has a different tenant pool, service structure, maintenance profile and exit market.", "Review the exact floor plan, elevation and specification. Brand confidence should support due diligence, not replace it."] },
      { heading: "Pipeline timing matters", body: ["A broad pipeline creates choice but can place several handovers into the market at the same time. Compare completion clusters and the amount of directly competing stock in the same community.", "A conservative plan considers rental stabilisation, snagging, fit-out and the period required for a new district to reach its intended operating standard."] },
    ],
  },
  {
    slug: "damac-developer-profile-investor-lens",
    category: "Developer analysis",
    title: "DAMAC developer profile: reading brand, product and location",
    dek: "How to assess DAMAC developments across branded concepts, waterfront locations, master communities and investor-focused payment structures.",
    readTime: "8 min",
    image: projectImage("damac-islands-2-dubailand-dubai"),
    published: "19 July 2026",
    takeaways: ["Identify what the brand partnership changes in practical terms.", "Compare service costs with the operating proposition.", "Evaluate the specific phase and location, not the portfolio in aggregate."],
    sections: [
      { heading: "A branded concept needs an operating case", body: ["A recognised name can broaden international appeal, but the investor should understand the contractual role of the brand, the duration of the agreement and the services it actually influences.", "Owner benefits, hospitality services and common-area standards should be documented. Their recurring cost belongs in the return model."] },
      { heading: "Location changes the buyer pool", body: ["Waterfront towers, urban residences and large master communities attract different residents. Accessibility, surrounding construction, amenity delivery and competing stock should be assessed at project level.", "The same payment structure can support very different outcomes depending on unit scarcity, layout efficiency and the depth of the eventual resale market."] },
      { heading: "Review delivery in the relevant category", body: ["Past performance is most useful when the comparison is genuinely similar. Examine delivered projects with a related scale, product and operating model rather than relying on a portfolio-wide average.", "Snagging, service communication and building management after handover are part of the ownership experience and should inform the selection."] },
    ],
  },
  {
    slug: "dubai-vs-abu-dhabi-property-investment",
    category: "Market research",
    title: "Dubai or Abu Dhabi: choosing the right property market",
    dek: "A decision framework for comparing two major UAE markets by demand base, ownership area, product, supply and hold strategy.",
    readTime: "9 min",
    image: projectImage("bashayer-final-phase-modon-hudayriyat-island-abu-dhabi"),
    published: "18 July 2026",
    takeaways: ["Choose by strategy and submarket, not by city ranking.", "Compare designated ownership areas and title structures.", "Model future supply around the exact community."],
    sections: [
      { heading: "Demand is built differently", body: ["Dubai combines global business, tourism, migration and a large international transaction market. Abu Dhabi combines government, corporate, cultural and education demand with destination-led island communities. Each city contains multiple submarkets, so city-level averages can hide the decision that matters.", "Define whether the asset is intended for long-term leasing, short-term operation, personal use or a development-cycle hold before comparing projects."] },
      { heading: "Ownership and location must be checked together", body: ["Foreign ownership frameworks are linked to designated areas and differ by emirate. Confirm the legal interest, registration process and any restrictions for the exact property.", "Within an eligible area, assess access, employment nodes, schools, leisure, transport and the amount of competing supply completing during the planned hold."] },
      { heading: "The best market is the one that fits the plan", body: ["A liquid urban apartment can support a different strategy from a resort residence or family villa. Compare realistic net income, cash-flow timing, service charges, furnishing needs and exit liquidity.", "Diversification across emirates can be sensible for a larger portfolio, but each purchase should stand on its own asset-level case."] },
    ],
    sources: [
      { title: "UAE Government: property ownership by emirate", url: "https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae" },
    ],
  },
  {
    slug: "uae-freehold-property-ownership-guide",
    category: "Investor guide",
    title: "UAE freehold property ownership: an investor guide",
    dek: "What foreign buyers should verify about title, designated areas, registration, financing and residency before signing.",
    readTime: "8 min",
    image: projectImage("eden-house-zabeel-hh-development-difc"),
    published: "17 July 2026",
    takeaways: ["Confirm the permitted ownership structure for the exact plot.", "Use the relevant land department record as the authority.", "Keep property ownership and residency eligibility as separate checks."],
    sections: [
      { heading: "Freehold is specific to place and title", body: ["Foreign ownership is available in designated areas, with rules that vary across the Emirates. The legal description on the reservation and sale documents should match the property being presented.", "Buyers should confirm the owner, project registration, escrow arrangements where applicable and the route by which the title will be issued."] },
      { heading: "Registration is part of due diligence", body: ["The relevant land department maintains the official property record. Broker, developer and project credentials should be checked through the appropriate regulator or registration service.", "Financed purchases add lender valuation, eligibility and mortgage documentation. Model those steps early rather than treating finance as a handover-stage decision."] },
      { heading: "Residency is a separate eligibility process", body: ["Property ownership may support a residence application when current conditions are met, but ownership does not automatically guarantee approval. Value thresholds, finance rules and documents should be verified with the responsible authorities.", "Legal, tax, estate-planning and financing advice should be tailored to the buyer's nationality, residence and ownership structure."] },
    ],
    sources: [
      { title: "Dubai Land Department: ownership and registration FAQs", url: "https://dubailand.gov.ae/en/frequently-asked-questions" },
      { title: "UAE Government: expatriates buying property", url: "https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae" },
      { title: "UAE Government: Golden Visa", url: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa" },
    ],
  },
  {
    slug: "price-per-square-foot-uae-property-guide-2026",
    category: "Market research",
    title: "Price per square foot in UAE property: how to read the number properly",
    dek: "A practical guide to using AED/sqft without mistaking a market benchmark for a unit-level valuation.",
    readTime: "9 min",
    image: projectImage("q-gardens-aliya-ays-developers-jumeirah-village-circle-dubai"),
    published: "25 July 2026",
    takeaways: ["AED/sqft is a comparison tool, not a complete valuation.", "Project-level figures should be separated from area benchmarks.", "The right comparison uses property type, view, size, layout efficiency and transaction date."],
    sections: [
      { heading: "Start with the basis", body: ["A project AED/sqft figure should come from the project price and the published saleable area, or from a directly published project pricing statement. An area AED/sqft figure is a wider benchmark based on market transactions in that community or emirate.", "Those two numbers should not be blended. A new branded launch, a resale apartment and a villa plot can all sit inside one district but behave differently on price per square foot."] },
      { heading: "Current benchmark levels", body: ["Dubai's June 2026 residential benchmark sits at AED 1,916/sq.ft overall, with apartments at AED 1,969/sq.ft, townhouses at AED 1,371/sq.ft and villas at AED 2,241/sq.ft. Community context changes the reading: Downtown Dubai is tracked around AED 3,011/sq.ft, Business Bay around AED 2,547/sq.ft, Dubai Marina around AED 2,058/sq.ft and Jumeirah Village Circle around AED 1,510/sq.ft.", "Abu Dhabi's February 2026 benchmark is AED 1,783/sq.ft overall, with apartments around AED 1,924/sq.ft and villas around AED 1,367/sq.ft. These figures are useful for screening, but unit-level pricing still needs direct comparison against view, building, floor, size, layout and date of transaction."] },
      { heading: "Match the property type", body: ["Dubai data shows apartments, townhouses and villas can trade at materially different average AED/sqft levels. Comparing a townhouse launch to an apartment benchmark can make a normal price look either expensive or cheap for the wrong reason.", "The site therefore labels figures as Project AED/sqft, Area AED/sqft or emirate-wide average. The label matters as much as the number."] },
      { heading: "Use it with the floor plan", body: ["A lower AED/sqft can hide inefficient circulation, unusable balcony area or a difficult room shape. A higher AED/sqft can be justified by view, frontage, branded operation, low supply or a layout that rents and resells more easily.", "The decision should pair price per square foot with floor-plan quality, payment timing, service charge, expected rent and the number of directly competing units completing in the same window."] },
    ],
    sources: [
      { title: "Engel & Völkers: Dubai Average Property Price per Sq Ft by Area 2026", url: "https://www.engelvoelkers.com/ae/en/resources/average-price-per-square-foot-in-dubai" },
      { title: "Engel & Völkers: Abu Dhabi Property Market Analysis 2026", url: "https://www.engelvoelkers.com/ae/en/resources/abu-dhabi-property-market" },
    ],
  },
  {
    slug: "uae-mortgage-planning-before-reservation",
    category: "Investor guide",
    title: "UAE mortgage planning before reservation: what to model first",
    dek: "How to estimate monthly exposure, deposit, transfer fees and lending risk before treating a unit as affordable.",
    readTime: "8 min",
    image: projectImage("dwtwn-residences-by-deyaar-in-central-dubai"),
    published: "25 July 2026",
    takeaways: ["Monthly payment is only one part of affordability.", "Deposit, transfer fees, mortgage registration and valuation timing must be modelled early.", "Finance assumptions should be stress-tested before the booking form."],
    sections: [
      { heading: "Model the full cash requirement", body: ["A buyer should calculate deposit, transfer fees, mortgage registration, valuation, agency fee where applicable, furnishing and early service charges. A unit can look affordable on monthly payment while still requiring more upfront liquidity than planned.", "For off-plan purchases, the payment plan and the mortgage timeline must be mapped together. Some lenders assess the completed value at handover, while the buyer has already funded construction instalments."] },
      { heading: "Rate sensitivity matters", body: ["Small rate changes can materially alter monthly payments on larger loans. The calculator on the site lets buyers test deposit, rate and term before speaking to a lender, but it remains an indicative model.", "Final lending depends on income, residency, age, liabilities, valuation, property status and bank policy. Buyers should obtain a lender view before relying on resale or completion finance."] },
      { heading: "Use finance to improve selection", body: ["A property with a slightly lower price can still be weaker if the payment plan is compressed, the rent is uncertain or the service cost is high. Finance modelling should guide which unit is genuinely resilient under the buyer's hold strategy.", "The strongest acquisition is not the one with the lowest monthly estimate; it is the one where cash flow, risk and exit remain coherent under realistic stress."] },
    ],
  },
  {
    slug: "service-charges-net-yield-uae-property",
    category: "Investor guide",
    title: "Service charges and net yield: the cost line investors miss",
    dek: "Why gross yield can mislead, and how annual service costs change the real performance of apartments, villas and branded residences.",
    readTime: "7 min",
    image: projectImage("w-residences-dubai-the-palm"),
    published: "25 July 2026",
    takeaways: ["Gross yield is not net income.", "Branded and amenity-heavy buildings require a recurring cost review.", "Service charge should be tested against achieved rent, not marketing rent."],
    sections: [
      { heading: "Gross yield is the starting point", body: ["Gross yield divides annual rent by purchase price. It ignores service charges, management fees, vacancy, maintenance, furnishing, insurance, finance and transaction costs. That makes it useful for a first screen, but dangerous as a final answer.", "The more amenity-heavy or hospitality-led the building, the more important the recurring cost review becomes. A premium service proposition can support rent, but only if the tenant or guest market is willing to pay for it."] },
      { heading: "Compare cost against the product", body: ["A tower with resort pools, concierge, branded operation and high common-area standards should not be compared only to a simple apartment building. The investor should ask what service charge is buying and whether that service improves rental depth or resale appeal.", "The same cost can be acceptable in one micro-market and excessive in another. It depends on rent, building quality, tenant demand and the strength of competing supply."] },
      { heading: "Build a net model", body: ["Use conservative rent, realistic vacancy and documented service charge. Then test the return after expected operating costs, mortgage payment if any and an exit-cost allowance.", "A disciplined net model often changes the shortlist. It exposes units that rely on optimistic rent and highlights assets where layout, management and location support a stronger long-term hold."] },
    ],
  },
  {
    slug: "monthly-uae-market-tracking-dashboard",
    category: "Market research",
    title: "Monthly UAE market tracking: the dashboard serious buyers should keep",
    dek: "A repeatable monthly framework for following transactions, launches, rents, handovers and price movement without reacting to noise.",
    readTime: "8 min",
    image: projectImage("avarra-palace-emaar-business-bay"),
    published: "25 July 2026",
    takeaways: ["Track volume and value separately.", "Split ready, off-plan and mortgage registrations.", "Community-level movement is more useful than citywide averages for unit selection."],
    sections: [
      { heading: "Separate activity from pricing", body: ["A rising transaction count does not automatically mean every unit is appreciating. Volume, value, price per square foot and product mix should be tracked separately.", "Off-plan launches can lift volume while ready-market liquidity behaves differently. Mortgage registrations add another layer because they reflect financing activity, not only new buyer sentiment."] },
      { heading: "Watch the completion calendar", body: ["Handovers influence rent, vacancy, resale listings and furnishing demand. A buyer should know how many comparable units complete in the same district during the intended hold period.", "New supply is not automatically negative. It can improve amenities and district maturity, but it can also pressure rents if too many similar units arrive together."] },
      { heading: "Turn data into decisions", body: ["Each month, refresh comparable sales, asking-price spreads, rental evidence, handover timing and developer announcements. The goal is not to predict every move, but to know when a shortlist assumption has changed.", "A strong advisory process converts market data into action: hold, negotiate, wait, switch community or move faster on a genuinely scarce unit."] },
    ],
    sources: [
      { title: "DXB Interact: transaction-data methodology", url: "https://dxbinteract.com/news/dubai-property-transaction-data-structure" },
      { title: "Dubai Land Department: Real Estate Sector Performance 2024", url: "https://dubailand.gov.ae/en/open-data/research/annual-report-real-estate-sector-performance-2024/" },
    ],
  },
  {
    slug: "off-plan-handover-risk-checklist",
    category: "New launches",
    title: "Off-plan handover risk: the checklist before you buy",
    dek: "The questions that protect investors from treating handover as a formality when it is actually a major cash-flow and execution event.",
    readTime: "8 min",
    image: projectImage("31-above-by-beyond-dubai-maritime-city"),
    published: "25 July 2026",
    takeaways: ["Handover concentrates cash, finance and operational risk.", "Snagging, service charge and rental launch timing should be planned before completion.", "A resale plan before handover should be treated as uncertain, not guaranteed."],
    sections: [
      { heading: "Handover is a second purchase decision", body: ["The buyer may face a final instalment, registration steps, mortgage documentation, snagging, fit-out, furnishing and first service-charge obligations. These are not small details; they determine whether the asset can move from paper value to usable ownership.", "A project can be attractive at launch and still require a revised plan at handover if market rent, lending terms or competing supply has changed."] },
      { heading: "Plan the first ninety days", body: ["The investor should know who will inspect the unit, how defects will be logged, what furniture is required, whether short-term rental is viable and how quickly the property can be listed.", "For personal-use buyers, the same discipline applies. Building readiness, access, amenities, parking, district infrastructure and service quality all shape the actual living experience."] },
      { heading: "Do not rely on a forced exit", body: ["Selling before handover can be possible in some markets, but it is not a guaranteed liquidity plan. Transfer rules, developer consent, market depth and competing investor listings all matter.", "A responsible off-plan purchase assumes the buyer can complete and hold if the resale window is weaker than expected."] },
    ],
  },
];

function sourcePublisher(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const knownPublishers: Record<string, string> = {
      "corporate.etihadrail.ae": "Etihad Rail",
      "investors.wynnresorts.com": "Wynn Resorts",
      "newsroom.wynnresorts.com": "Wynn Resorts",
      "mediaoffice.abudhabi": "Abu Dhabi Media Office",
      "dct.gov.ae": "Department of Culture and Tourism – Abu Dhabi",
      "miral.ae": "Miral",
      "wbworldabudhabi.com": "Warner Bros. World Abu Dhabi",
    };
    return knownPublishers[host] || host;
  } catch {
    return "Official source";
  }
}

export const insights: Insight[] = [
  ...editorialInsights.map((insight) => {
    const initiative = insight.initiative || initiativeMetadataForArticle(insight.slug);
    return {
      ...insight,
      initiative,
      tags: insight.tags || (initiative ? [initiative.jurisdiction, initiative.name, initiative.status, "UAE Market Atlas"] : undefined),
      sources: insight.sources?.map((source) => ({
        ...source,
        publisher: source.publisher || sourcePublisher(source.url),
        checkedAt: source.checkedAt || initiative?.verifiedAt,
      })),
    };
  }),
  ...generatedInitiativeInsights,
];

export function getInsight(slug: string) { return insights.find((insight) => insight.slug === slug) || null; }

export function getInsightForInitiative(initiativeId: string) {
  const slug = initiativeArticleSlugById[initiativeId];
  return slug ? getInsight(slug) : null;
}
