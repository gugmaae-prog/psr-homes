import type { EmirateSlug } from "@/data/emirates";

export type MarketPillarId = "economy" | "infrastructure" | "culture-tourism" | "energy-nature";
export type StrategicStatus =
  | "Operating"
  | "Active programme"
  | "Phased / mixed"
  | "Under construction"
  | "Procurement"
  | "In development"
  | "Announced"
  | "Strategy";

export type MarketSource = {
  id: string;
  label: string;
  publisher: string;
  href: string;
  verifiedAt: string;
};

export type MarketSignal = {
  title: string;
  detail: string;
  sourceIds: string[];
};

export type MarketPillar = {
  id: MarketPillarId;
  label: string;
  summary: string;
  signals: MarketSignal[];
};

export type StrategicInitiative = {
  id: string;
  name: string;
  category: string;
  status: StrategicStatus;
  timing: string;
  summary: string;
  marketImpact: string;
  sourceIds: string[];
};

export type EditorialCover = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  provenance: "PSR editorial composite";
};

export type EmirateMarketOverview = {
  cover: EditorialCover;
  descriptor: string;
  executiveSummary: string;
  timeline: { past: string; present: string; outlook: string };
  comparison: {
    economicAnchor: string;
    definingAsset: string;
    naturalAsset: string;
    nextCatalyst: string;
  };
  pillars: MarketPillar[];
  futureInitiatives: StrategicInitiative[];
  sources: MarketSource[];
};

const VERIFIED_AT = "2026-09-02";

const source = (id: string, label: string, publisher: string, href: string): MarketSource => ({
  id,
  label,
  publisher,
  href,
  verifiedAt: VERIFIED_AT,
});

export const uaeMarketOverview = {
  cover: {
    src: "/emirates/editorial/uae-market-atlas-v1.webp",
    alt: "PSR editorial panorama of the UAE connected by passenger rail across ports, cities, mangroves, energy infrastructure and mountains",
    caption: "A visual index of the federation: mobility, trade, culture, energy, nature, tourism and place.",
    credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
    provenance: "PSR editorial composite",
  },
  headline: "One federation. Seven economic identities.",
  summary: "The UAE is best understood as a connected national platform with seven distinct local market roles. Property is one outcome of jobs, mobility, institutions, tourism, energy, industry, culture and quality of place—not the whole story.",
  forces: [
    { title: "Economy & capital", detail: "Federal ambition, free zones, finance and investment policy shape where businesses and people locate." },
    { title: "Movement & logistics", detail: "Ports, airports, roads and the staged passenger-rail network connect local economies into one national system." },
    { title: "Industry & energy", detail: "Hydrocarbons, advanced manufacturing, logistics and clean-energy investment coexist in a changing production base." },
    { title: "Culture & knowledge", detail: "Museums, universities, research districts and heritage assets create identity, talent and long-duration demand." },
    { title: "Tourism & hospitality", detail: "Theme parks, coastlines, mountains, events and cultural destinations create different visitor economies by emirate." },
    { title: "Property & place", detail: "Housing, hospitality and commercial space are read as infrastructure for those wider demand engines." },
  ],
  futureInitiatives: [
    {
      id: "uae-passenger-rail",
      name: "Staged UAE passenger-rail network",
      category: "National mobility",
      status: "Phased / mixed" as const,
      timing: "30 Jun 2026–30 Mar 2027 staged rollout",
      summary: "Introductory Abu Dhabi–Fujairah service is operating while further stations and services are scheduled in stages.",
      marketImpact: "Changes the practical relationship between employment centres, airports, ports and residential catchments.",
      sourceIds: ["etihad-rail-rollout"],
    },
    {
      id: "abu-dhabi-dubai-high-speed-rail",
      name: "Abu Dhabi–Dubai high-speed train",
      category: "Intercity mobility",
      status: "Announced" as const,
      timing: "Opening date not announced",
      summary: "Design approval and tendering were announced for a planned 30-minute intercity connection.",
      marketImpact: "A long-range productivity and commuting signal; it must remain separate from the operating passenger-rail rollout.",
      sourceIds: ["etihad-rail-high-speed"],
    },
    {
      id: "national-investment-strategy-2031",
      name: "National Investment Strategy 2031",
      category: "Capital",
      status: "Strategy" as const,
      timing: "2031 horizon",
      summary: "Cabinet-approved strategy focused on attracting capital into priority sectors and expanding the national investment base.",
      marketImpact: "Tracks where employment, enterprise formation and institutional capital may deepen demand.",
      sourceIds: ["uae-investment-2031"],
    },
    {
      id: "uae-energy-strategy-2050",
      name: "UAE Energy Strategy 2050",
      category: "Energy transition",
      status: "Strategy" as const,
      timing: "2030 phase / 2050 horizon",
      summary: "National programme to expand clean-energy capacity and investment while improving energy-system performance.",
      marketImpact: "Affects industrial location, utility resilience, development standards and long-term operating costs.",
      sourceIds: ["uae-energy-2050"],
    },
    {
      id: "operation-300bn",
      name: "Operation 300bn",
      category: "Industry",
      status: "Strategy" as const,
      timing: "2031 horizon",
      summary: "Industrial strategy aimed at expanding manufacturing and productive-sector contribution to the economy.",
      marketImpact: "Broadens the demand map beyond finance, tourism and real estate into industrial and logistics corridors.",
      sourceIds: ["operation-300bn"],
    },
    {
      id: "uae-tourism-strategy-2031",
      name: "UAE Tourism Strategy 2031",
      category: "Tourism",
      status: "Strategy" as const,
      timing: "2031 horizon",
      summary: "A national package of initiatives intended to expand tourism investment, contribution and hotel demand.",
      marketImpact: "Supports a differentiated read of city, cultural, mountain, marine and resort destinations across the federation.",
      sourceIds: ["uae-tourism-2031"],
    },
    {
      id: "mbr-explorer",
      name: "MBR Explorer asteroid-belt mission",
      category: "Space & science",
      status: "In development" as const,
      timing: "Launch window Mar 2028 / mission through 2034",
      summary: "The UAE's Emirates Mission to the Asteroid Belt plans a seven-asteroid journey, with its first encounter scheduled for February 2030.",
      marketImpact: "Builds advanced-science capability, supplier demand and a talent narrative that extends beyond terrestrial infrastructure.",
      sourceIds: ["uae-asteroid-mission"],
    },
    {
      id: "federal-agentic-ai",
      name: "Federal Agentic AI framework",
      category: "Digital government",
      status: "Active programme" as const,
      timing: "Two-year adoption target announced Apr 2026",
      summary: "A Cabinet-approved framework aims to extend agentic AI across federal sectors and services, with delivery measured over a two-year period.",
      marketImpact: "Signals public-sector demand for AI infrastructure, governance, skills and service redesign; the adoption target is not an achieved result.",
      sourceIds: ["uae-agentic-ai"],
    },
    {
      id: "national-transport-2030",
      name: "National transport and road portfolio",
      category: "Mobility & logistics",
      status: "Active programme" as const,
      timing: "More than AED170bn portfolio through 2030",
      summary: "The national congestion agenda combines roads, rail and transport programmes across a multi-year federal portfolio.",
      marketImpact: "Corridor-level delivery can reshape commute times and logistics capacity, but the portfolio value must not be read as completed or fully awarded work.",
      sourceIds: ["uae-transport-2030"],
    },
    {
      id: "water-security-2036",
      name: "UAE Water Security Strategy 2036",
      category: "Water security",
      status: "Strategy" as const,
      timing: "2036 horizon",
      summary: "A national framework for sustainable water supply, demand management, storage and emergency resilience.",
      marketImpact: "Water resilience is a long-duration constraint on population, industrial and landscape growth across every emirate.",
      sourceIds: ["uae-water-2036"],
    },
    {
      id: "circular-economy-2031",
      name: "Circular Economy Agenda 2031",
      category: "Industry & resources",
      status: "Strategy" as const,
      timing: "2031 horizon",
      summary: "The federal agenda coordinates circular production and resource use across priority sectors and government programmes.",
      marketImpact: "Creates policy demand for reuse, recycling, lower-waste industry and more efficient urban systems rather than one standalone project.",
      sourceIds: ["uae-circular-2031"],
    },
    {
      id: "national-hydrogen-2050",
      name: "National Hydrogen Strategy 2050",
      category: "Future energy",
      status: "Strategy" as const,
      timing: "2031 milestones / 2050 horizon",
      summary: "The national hydrogen framework sets phased production, market and infrastructure ambitions within the wider energy transition.",
      marketImpact: "May create new industrial clusters, export infrastructure and specialised employment, subject to project-level economics and delivery.",
      sourceIds: ["uae-hydrogen-2050"],
    },
  ],
  sources: [
    source("etihad-rail-rollout", "UAE passenger rail network and rollout", "Etihad Rail", "https://corporate.etihadrail.ae/en/newsroom/press/khaled-bin-mohamed-bin-zayed-inaugurates-mbz-city-passenger-train-station-and-witnesses-unveiling-of-uae-passenger-rail-network"),
    source("etihad-rail-high-speed", "High-speed train linking Abu Dhabi and Dubai", "Etihad Rail", "https://corporate.etihadrail.ae/en/newsroom/press/with-the-blessing-of-the-uae-president-khaled-bin-mohamed-bin-zayed-and-hamdan-bin-mohammed-bin-rashid-witness-announcement-of-high-speed-train-project-linking-abu-dhabi-and-dubai"),
    source("uae-investment-2031", "National Investment Strategy 2031", "UAE Cabinet / Dubai Media Office", "https://prod.mediaoffice.ae/en/news/2025/march/10-03/mohammed-bin-rashid-chairs-cabinet-meeting"),
    source("uae-energy-2050", "UAE Energy Strategy 2050", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/uae-energy-strategy-2050"),
    source("operation-300bn", "Operation 300bn / UAE Industrial Strategy", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/industry%20science-and-technology/the-uae-industrial-strategy"),
    source("uae-tourism-2031", "UAE Tourism Strategy 2031", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/tourism/uae-tourism-strategy-2031"),
    source("uae-asteroid-mission", "Emirates Mission to the Asteroid Belt", "UAE Space Agency", "https://www.space.gov.ae/en/projects-and-initiatives/space-exploration/emirates-mission-to-the-asteroid-belt"),
    source("uae-agentic-ai", "Federal Agentic AI framework", "UAE Cabinet / Dubai Media Office", "https://mediaoffice.ae/en/news/2026/april/23-04/mohammed-bin-rashid-chairs-uae-cabinet-meeting"),
    source("uae-transport-2030", "National transport portfolio through 2030", "Ministry of Energy and Infrastructure", "https://www.moei.gov.ae/en/media-center/news/18/1/2026/ministry-of-energy-and-infrastructure-achievements-2025"),
    source("uae-water-2036", "UAE Water Security Strategy 2036", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/the-uae-water-security-strategy-2036"),
    source("uae-circular-2031", "Circular Economy Agenda 2031", "UAE Cabinet / Dubai Media Office", "https://prod.mediaoffice.ae/en/news/2026/january/05-01/mohammed-bin-rashid-chairs-uae-cabinet"),
    source("uae-hydrogen-2050", "National Hydrogen Strategy 2050", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/national-hydrogen-strategy"),
  ],
} satisfies {
  cover: EditorialCover;
  headline: string;
  summary: string;
  forces: { title: string; detail: string }[];
  futureInitiatives: StrategicInitiative[];
  sources: MarketSource[];
};

export const emirateMarketOverviews: Record<EmirateSlug, EmirateMarketOverview> = {
  dubai: {
    cover: {
      src: "/emirates/editorial/dubai-market-overview-v1.webp",
      alt: "PSR editorial panorama of Dubai's creek, port, aviation, metro, finance, innovation and clean-energy economy",
      caption: "Trade, aviation, finance, tourism, technology, mobility and the desert-city relationship.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "Trade, aviation, finance, tourism and a multi-centre urban economy",
    executiveSummary: "Dubai is a global gateway whose market is powered by trade, aviation, finance, tourism, free zones, logistics, technology and fast infrastructure delivery. Property is an expression of that economic platform, not the platform itself.",
    timeline: {
      past: "Creek trade, ports and merchant networks established the commercial base before the city scaled aviation, free zones, tourism and global services.",
      present: "Dubai now links Jebel Ali, two airport systems, financial districts, hospitality, major events, universities and digital enterprise into a highly mobile urban economy.",
      outlook: "D33, Dubai 2040, Al Maktoum airport and the Metro Blue Line point toward a larger multi-centre city; delivery sequence and corridor-level demand matter more than skyline visibility.",
    },
    comparison: {
      economicAnchor: "Trade, aviation and global finance",
      definingAsset: "Creek-to-port commercial network",
      naturalAsset: "Desert, coast and conservation",
      nextCatalyst: "Al Maktoum airport + Metro Blue Line",
    },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "A globally connected services-and-trade economy with unusually deep links between logistics, aviation, finance, tourism and enterprise formation.", signals: [
        { title: "Dubai Economic Agenda D33", detail: "The agenda sets a 2033 growth framework around trade, investment, talent and global-city competitiveness; its figures are targets, not completed outcomes.", sourceIds: ["dubai-d33"] },
        { title: "Free zones and global access", detail: "Ports, airports, financial infrastructure and business districts allow several demand engines to operate at once rather than relying on one sector.", sourceIds: ["dubai-d33", "dubai-2040"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Dubai's value map changes when mobility, airport capacity and mixed-use centres move from announcement to daily operation.", signals: [
        { title: "Al Maktoum International Airport", detail: "The new passenger terminal is a major aviation programme with an ultimate planned capacity distinct from its first-phase delivery horizon.", sourceIds: ["al-maktoum-terminal"] },
        { title: "Eastern growth-district rail access", detail: "Construction of the Blue Line is expanding the future rail catchment across eastern residential, education and employment districts.", sourceIds: ["metro-blue-line"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Visitor demand is produced by events, beaches, hospitality, retail, heritage and global connectivity—not only landmark architecture.", signals: [
        { title: "A multi-centre visitor economy", detail: "Dubai 2040 plans around distinct urban centres, public space and improved access, broadening how residents and visitors use the city.", sourceIds: ["dubai-2040"] },
        { title: "Events and enterprise", detail: "Business travel, exhibitions and major events reinforce hotels, offices, restaurants and short-stay demand across several districts.", sourceIds: ["dubai-d33"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "The desert, coastline and utility network are planning constraints and advantages, not empty background to development.", signals: [
        { title: "Urban quality and open space", detail: "Dubai 2040 gives public space, connected centres and quality of life a formal role in long-range spatial planning.", sourceIds: ["dubai-2040"] },
        { title: "Clean-energy transition", detail: "National clean-energy targets influence infrastructure, buildings and industrial investment across Dubai's growth corridors.", sourceIds: ["uae-energy-dubai"] },
      ] },
    ],
    futureInitiatives: [
      { id: "dubai-airport", name: "Al Maktoum passenger terminal", category: "Aviation", status: "Under construction", timing: "Announced Apr 2024 with a ten-year first-phase delivery horizon", summary: "AED128bn terminal programme intended to consolidate and expand Dubai's long-run aviation capacity.", marketImpact: "Strengthens Dubai South's logistics, employment, hospitality and residential relevance, but ultimate-capacity figures should not be treated as current throughput.", sourceIds: ["al-maktoum-terminal"] },
      { id: "dubai-blue-line", name: "Dubai Metro Blue Line", category: "Urban mobility", status: "Under construction", timing: "Target opening 9 Sep 2029", summary: "New metro corridor linking major residential, education and employment districts.", marketImpact: "Station access and opening sequence matter more than broad proximity claims.", sourceIds: ["metro-blue-line"] },
      { id: "dubai-2040-programme", name: "Dubai 2040 Urban Master Plan", category: "Urban strategy", status: "Strategy", timing: "2040 horizon", summary: "The citywide spatial framework for connected centres, movement, public realm and growth.", marketImpact: "Provides the long-range frame for judging infrastructure-backed locations without presenting the plan as one construction project.", sourceIds: ["dubai-2040"] },
      { id: "dubai-gold-line", name: "Dubai Metro Gold Line", category: "Urban mobility", status: "Procurement", timing: "Tender 2026 / award target 2027 / opening target 9 Sep 2032", summary: "A planned 34.2-kilometre east-west metro corridor with its procurement and delivery milestones separately disclosed.", marketImpact: "Creates a long-range accessibility signal across established and emerging districts, but it is not yet an operating or construction-stage line.", sourceIds: ["metro-gold-line"] },
      { id: "mbr-solar-expansion", name: "Mohammed bin Rashid Al Maktoum Solar Park expansion", category: "Clean energy", status: "Phased / mixed", timing: "Phase 7 commissioning targeted in stages from 2027 to 2029", summary: "An operating solar complex with further photovoltaic and battery-storage capacity moving through procurement and phased delivery.", marketImpact: "Adds utility-scale clean power and storage to Dubai's growth platform while each phase keeps its own contract and commissioning status.", sourceIds: ["mbr-solar-park"] },
      { id: "dubai-walk", name: "Dubai Walk and Historic Al Ras programme", category: "Public realm", status: "Phased / mixed", timing: "Al Ras phase to 2027 / wider network through 2040", summary: "A citywide pedestrian programme whose first phase is upgrading Historic Al Ras while the broader network remains a long-range plan.", marketImpact: "Walkability, shade and district continuity can deepen street-level commerce and quality of place beyond transport megaprojects.", sourceIds: ["dubai-walk"] },
      { id: "dubai-reef", name: "Dubai Reef", category: "Marine environment", status: "Active programme", timing: "20,000-module deployment target by 2027", summary: "A large marine-reef programme being fabricated and deployed in stages across Dubai's waters.", marketImpact: "Makes marine resilience, fisheries and coastal stewardship part of the city's infrastructure story; the final target is not yet complete.", sourceIds: ["dubai-reef"] },
      { id: "dubai-exhibition-centre", name: "Dubai Exhibition Centre expansion", category: "Business events", status: "Phased / mixed", timing: "Phase 2 target 2028 / final phase target 2031", summary: "A multi-phase expansion at Expo City intended to increase large-format exhibition and conference capacity.", marketImpact: "Strengthens the events economy around Dubai South and Expo City, with demand effects tied to phased operating capacity.", sourceIds: ["dubai-exhibition-centre"] },
      { id: "dubai-cultural-strategy-2033", name: "Dubai Cultural Strategy 2033", category: "Culture & creative economy", status: "Active programme", timing: "2033 horizon", summary: "A 40-initiative programme spanning cultural participation, talent, creative industries and destination development.", marketImpact: "Broadens Dubai's future-asset map beyond transport and real estate into institutions, production and year-round cultural activity.", sourceIds: ["dubai-cultural-2033"] },
      { id: "duma", name: "Dubai Museum of Art (DUMA)", category: "Culture", status: "Announced", timing: "Opening date not announced", summary: "A Tadao Ando-designed museum planned on Dubai Creek through a public-private partnership with Al-Futtaim.", marketImpact: "Could add a major cultural anchor to the creek economy, but design announcement and operating delivery remain separate milestones.", sourceIds: ["duma"] },
      { id: "therme-dubai", name: "Therme Dubai", category: "Wellness & public realm", status: "Announced", timing: "Target completion 2028", summary: "A large indoor botanical, wellness and leisure destination planned for Zabeel Park.", marketImpact: "Introduces a climate-controlled social and wellness asset near the city core; the 2028 date remains a target.", sourceIds: ["therme-dubai"] },
    ],
    sources: [
      source("dubai-d33", "Dubai Economic Agenda D33", "Dubai Media Office", "https://www.mediaoffice.ae/en/news/2023/January/04-01/Mohammed-bin-Rashid-launches-Dubai-Economic-Agenda-D33"),
      source("dubai-2040", "Dubai 2040 Urban Master Plan", "Government of Dubai", "https://dubai2040.ae/en/mohammed-bin-rashid-launches-dubai-2040-urban-master-plan/"),
      source("al-maktoum-terminal", "New passenger terminal at Al Maktoum International Airport", "Dubai Media Office", "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport"),
      source("metro-blue-line", "Dubai Metro Blue Line progress and opening target", "Dubai Roads and Transport Authority", "https://rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/10percent-progress-achieved-on-the-metro-blue-line-within-five-months-of-project-commencement"),
      source("uae-energy-dubai", "UAE Energy Strategy 2050", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/uae-energy-strategy-2050"),
      source("metro-gold-line", "Dubai Metro Gold Line approval and procurement programme", "Dubai Roads and Transport Authority", "https://www.rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/mohammed-bin-rashid-approves-dubai-metro-gold-line-involving-an-investment-of-aed-34-billion"),
      source("mbr-solar-park", "Mohammed bin Rashid Al Maktoum Solar Park", "Dubai Electricity and Water Authority", "https://www.dewa.gov.ae/en/about-us/strategic-initiatives/mbr-solar-park"),
      source("dubai-walk", "Dubai Walk and Historic Al Ras phase", "Dubai Roads and Transport Authority / Dubai Media Office", "https://www.mediaoffice.ae/en/news/2026/march/22-03/rta"),
      source("dubai-reef", "Dubai Reef deployment update", "Dubai Media Office", "https://www.mediaoffice.ae/en/news/2025/july/28-07/new-dubai-reef-footage-reveals"),
      source("dubai-exhibition-centre", "Dubai Exhibition Centre expansion master plan", "Dubai Media Office", "https://prod.mediaoffice.ae/en/news/2024/september/23-09/dubai-exhibition-centre"),
      source("dubai-cultural-2033", "Dubai Cultural Strategy 2033", "Dubai Media Office", "https://mediaoffice.ae/en/news/2026/july/01-07/hamdan-bin-mohammed-chairs-executive-council-meeting"),
      source("duma", "Dubai Museum of Art announcement", "Dubai Media Office", "https://mediaoffice.ae/en/news/2025/october/26-10/the-dubai-museum-of-art-duma-the-citys-new-cultural-and-architectural-landmark"),
      source("therme-dubai", "Therme Dubai approval", "Dubai Media Office", "https://prod.mediaoffice.ae/en/news/2025/february/04-02/hamdan-bin-mohammed-approves-therme-dubai"),
    ],
  },
  "abu-dhabi": {
    cover: {
      src: "/emirates/editorial/abu-dhabi-market-overview-v1.webp",
      alt: "PSR editorial panorama of Abu Dhabi's Louvre dome, cultural district, Yas Island leisure, energy, clean technology and mangroves",
      caption: "Louvre Abu Dhabi, Guggenheim's cultural horizon, Yas Island entertainment, energy, clean technology and future destinations.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map, attraction design or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "Capital institutions, sovereign investment, energy, culture and island destinations",
    executiveSummary: "Abu Dhabi is the UAE's capital anchor: sovereign and energy-backed, institutionally planned, culturally ambitious and increasingly diversified through finance, industry, tourism, technology, education and island destinations.",
    timeline: {
      past: "Energy wealth and federal institutions financed a planned capital with national ministries, universities, infrastructure and a deep public-sector employment base.",
      present: "The market now spans ADNOC and sovereign capital, ADGM finance, Saadiyat culture, Yas entertainment, Masdar clean energy, major events and family-oriented island communities.",
      outlook: "Guggenheim Abu Dhabi, the Disney resort plan, the Harry Potter themed land, Sphere, Dar al Funoon and rail investment deepen culture and tourism alongside—not instead of—the energy economy.",
    },
    comparison: {
      economicAnchor: "Sovereign capital, energy and government",
      definingAsset: "Saadiyat culture + Yas entertainment",
      naturalAsset: "Islands, mangroves and Gulf coastline",
      nextCatalyst: "Guggenheim, Disney, Sphere + rail",
    },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "The capital combines government, sovereign investment, finance, hydrocarbons and industrial policy with a deliberate non-oil diversification programme.", signals: [
        { title: "Institutional capital", detail: "Government, national institutions and large employers create a demand base that behaves differently from a visitor-led or launch-led market.", sourceIds: ["ad-economic-vision"] },
        { title: "Energy-backed diversification", detail: "ADNOC remains a major hydrocarbon engine while Abu Dhabi simultaneously expands finance, tourism, industry, technology and clean-energy investment.", sourceIds: ["adnoc-2030", "masdar-65gw"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Air, road, port and rail infrastructure connect the capital's mainland, islands, industrial areas and the wider federation.", signals: [
        { title: "Etihad Rail passenger network", detail: "The introductory Abu Dhabi–Fujairah passenger service is operating while the wider national network continues its staged rollout.", sourceIds: ["etihad-rail-ad"] },
        { title: "Hudayriyat Island", detail: "A large long-range island masterplan centred on coast, sport, leisure and public realm, without one single official completion date.", sourceIds: ["hudayriyat"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Saadiyat and Yas form complementary cultural and entertainment districts with international institutions, events, theme parks and hospitality.", signals: [
        { title: "Louvre + Guggenheim Abu Dhabi", detail: "Louvre Abu Dhabi has operated since 2017; Guggenheim Abu Dhabi remains forthcoming with an officially announced 11 December 2026 opening date.", sourceIds: ["louvre-ad", "guggenheim-ad"] },
        { title: "Yas Island entertainment", detail: "Ferrari World operates today. Disney's resort and a Harry Potter themed land are announced future additions without official opening dates; they must not be presented as open.", sourceIds: ["ferrari-world", "disney-ad", "harry-potter-ad"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Abu Dhabi's market story includes both the scale of hydrocarbons and the capital allocated to lower-carbon systems, renewables and protected coastal landscapes.", signals: [
        { title: "ADNOC energy platform", detail: "ADNOC's active sustainability strategy targets operational emissions and carbon-intensity reductions while its oil-and-gas role continues.", sourceIds: ["adnoc-2030"] },
        { title: "Masdar clean-energy platform", detail: "Masdar reported a 65GW portfolio in January 2026, including operating, construction, committed and advanced-pipeline capacity—not 65GW already operating.", sourceIds: ["masdar-65gw"] },
      ] },
    ],
    futureInitiatives: [
      { id: "guggenheim-ad", name: "Guggenheim Abu Dhabi", category: "Culture", status: "Under construction", timing: "Announced opening 11 Dec 2026", summary: "Frank Gehry-designed museum in Saadiyat Cultural District.", marketImpact: "Extends Abu Dhabi's cultural-institution cluster and global destination profile.", sourceIds: ["guggenheim-ad"] },
      { id: "disney-ad", name: "Disney theme park resort, Yas Island", category: "Tourism", status: "Announced", timing: "Opening date not announced", summary: "Miral is expected to finance, build and operate the planned resort, with Disney Imagineering leading creative design.", marketImpact: "A major long-range family-tourism signal; commercial and delivery milestones must be tracked rather than assumed.", sourceIds: ["disney-ad", "disney-10q"] },
      { id: "harry-potter-ad", name: "Harry Potter themed land", category: "Tourism", status: "Announced", timing: "Opening date not announced", summary: "Planned themed-land expansion at Warner Bros. World Abu Dhabi.", marketImpact: "Deepens Yas Island's multi-day entertainment offer but remains a future attraction.", sourceIds: ["harry-potter-ad"] },
      { id: "sphere-ad", name: "Sphere Abu Dhabi", category: "Entertainment", status: "Announced", timing: "Target completion by end-2029", summary: "Up-to-20,000-capacity venue announced for Yas Island.", marketImpact: "Adds a new events and entertainment demand engine to Yas Island's visitor economy.", sourceIds: ["sphere-ad"] },
      { id: "dar-al-funoon", name: "Dar al Funoon Abu Dhabi", category: "Culture", status: "Announced", timing: "Target opening 2030", summary: "Performing-arts venue planned near Saadiyat Cultural District.", marketImpact: "Broadens the cultural district from museums into live performance and year-round programming.", sourceIds: ["dar-al-funoon"] },
      { id: "ad-ppp-pipeline", name: "Abu Dhabi AED55bn PPP pipeline", category: "Civic infrastructure", status: "Procurement", timing: "24 projects planned for market across 2026–2027", summary: "A cross-sector pipeline covering transport, water resilience, education, health and sport through public-private procurement.", marketImpact: "Provides a broad infrastructure and private-capital signal, but the pipeline value is neither awarded spend nor completed work.", sourceIds: ["ad-ppp-55bn"] },
      { id: "ad-round-the-clock-renewable", name: "Round-the-clock renewable energy project", category: "Clean energy", status: "Under construction", timing: "Commercial operation targeted 2027", summary: "A 5.2GW solar and 19GWh battery project designed to deliver 1GW of continuous renewable power after reaching financial close.", marketImpact: "Adds grid-scale generation and storage capacity that can support data, industry and electrification without implying all nameplate capacity is continuously delivered.", sourceIds: ["masdar-rtc"] },
      { id: "helm-cluster", name: "HELM health and life-sciences cluster", category: "Health & science", status: "Active programme", timing: "Programme launched 2025 / 2045 horizon", summary: "An emirate-wide health, endurance, longevity and medicine cluster intended to link research, clinical activity, manufacturing and investment.", marketImpact: "Creates a long-duration talent and enterprise platform beyond government and energy, with targets that still depend on programme delivery.", sourceIds: ["ad-helm"] },
      { id: "agwa-cluster", name: "AGWA food and water cluster", category: "Food & water security", status: "Active programme", timing: "Programme launched 2024 / 2045 horizon", summary: "A growth cluster for agrifood, water technologies, research, production and trade anchored in Abu Dhabi.", marketImpact: "Can deepen climate-resilient industry and specialist employment while connecting water security to food production and logistics.", sourceIds: ["ad-agwa"] },
      { id: "ruwais-lng", name: "Ruwais LNG", category: "Energy & industry", status: "In development", timing: "Commercial operations targeted 2028", summary: "A two-train, 9.6 million-tonne-per-year LNG development in Al Ruwais Industrial City, described by the operator as lower-carbon.", marketImpact: "Reinforces Al Dhafra's export, industrial and contractor economy; operator emissions framing should not be mistaken for zero-carbon production.", sourceIds: ["ruwais-lng"] },
      { id: "hafeet-rail", name: "Hafeet Rail UAE–Oman connection", category: "Cross-border logistics", status: "Under construction", timing: "Reported 40% complete on 21 Apr 2026 / opening date not announced", summary: "A 238-kilometre cross-border railway linking Abu Dhabi's network with Sohar in Oman for freight and future passenger movement.", marketImpact: "Extends the capital's industrial and logistics reach into a cross-border corridor, while the dated progress figure should not be treated as current forever.", sourceIds: ["hafeet-rail"] },
      { id: "ad-digital-strategy", name: "Abu Dhabi Government Digital Strategy 2025–2027", category: "Digital government", status: "Active programme", timing: "2025–2027 programme", summary: "An AED13bn programme aimed at an AI-native government, unified digital infrastructure and automated public services.", marketImpact: "Supports demand for data, cloud, AI, cybersecurity and specialist talent while the end-state remains a programme target.", sourceIds: ["ad-digital-2027"] },
    ],
    sources: [
      source("ad-economic-vision", "Abu Dhabi Economic Vision 2030", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/finance-and-economy/abu-dhabi-economic-vision-2030"),
      source("guggenheim-ad", "Guggenheim Abu Dhabi opening announcement", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/arts-culture/department-of-culture-and-tourism-abu-dhabi-announces-opening-of-guggenheim-abu-dhabi-on-11-december-2026/"),
      source("louvre-ad", "Louvre Abu Dhabi partners and opening record", "Louvre Abu Dhabi", "https://www.louvreabudhabi.ae/en/about-us/our-partners"),
      source("ferrari-world", "Ferrari World Yas Island history", "Ferrari World Abu Dhabi", "https://www.ferrariworldabudhabi.com/en/events/ferrari-world-15th-anniversary-guide"),
      source("disney-ad", "Disney theme park and resort planned for Abu Dhabi", "The Walt Disney Company", "https://thewaltdisneycompany.com/news/disney-announces-abu-dhabi-theme-park/"),
      source("disney-10q", "Disney FY2025 Q2 Form 10-Q", "The Walt Disney Company", "https://investors.thewaltdisneycompany.com/files/doc_financials/2025/q2/sec-show.pdf"),
      source("harry-potter-ad", "Harry Potter themed land announcement", "Miral", "https://miral.ae/news-item/miral-and-warner-bros-discovery-announce-harry-potter-themed-land-coming-to-abu-dhabis-yas-island/"),
      source("adnoc-2030", "ADNOC 2030 Sustainability Strategy", "ADNOC", "https://www.adnoc.ae/en/2030-sustainability-strategy"),
      source("masdar-65gw", "Masdar renewable-energy portfolio update", "Masdar", "https://masdar.ae/en/news/newsroom/masdar-reaches-65gw-as-it-celebrates-20-years-of-renewable-energy-leadership"),
      source("etihad-rail-ad", "First paying passengers on the UAE national rail service", "Etihad Rail", "https://corporate.etihadrail.ae/en/newsroom/press/the-uaes-first-national-passenger-rail-service-begins-as-etihad-rail-welcomes-first-paying-passengers"),
      source("hudayriyat", "Hudayriyat Island masterplan", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/infrastructure/in-line-with-the-directives-of-sheikh-mohamed-bin-zayed-modon-properties-reveals-hudayriyat-island-masterplan-spanning-51-million-square-meters-equivalent-to-538-of-abu-dhabi-island/"),
      source("sphere-ad", "Sphere Abu Dhabi announcement", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/tourism/sphere-abu-dhabi-to-open-on-yas-island-in-landmark-project/"),
      source("dar-al-funoon", "Dar al Funoon Abu Dhabi announcement", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/crown-prince-news/khaled-bin-mohamed-bin-zayed-witnesses-launch-of-dar-al-funoon-abu-dhabi-development-project-near-saadiyat-cultural-district/"),
      source("ad-ppp-55bn", "AED55bn Abu Dhabi PPP pipeline", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/economy/abu-dhabi-investment-office-and-abu-dhabi-projects-and-infrastructure-centre-launch-aed55bn-public-private-partnership-pipeline/"),
      source("masdar-rtc", "Gigascale round-the-clock renewable project financial close", "Masdar", "https://masdar.ae/en/news/newsroom/masdar-reaches-financial-close-world-first-gigascale-clean-energy-project"),
      source("ad-helm", "HELM health and life-sciences cluster", "Abu Dhabi Investment Office", "https://www.investwithabudhabi.com/en/where-to-invest/clusters/helm"),
      source("ad-agwa", "AGWA food and water cluster", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/economy/khaled-bin-mohamed-bin-zayed-approves-launch-of-agrifood-growth-and-water-abundance-agwa-cluster/"),
      source("ruwais-lng", "Ruwais LNG development and 2028 operations target", "ADNOC", "https://adnoc.ae/en/news-and-media/press-releases/2024/adnoc-signs-15"),
      source("hafeet-rail", "Hafeet Rail construction progress", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/transport/hafeet-rail-announces-40-completion-of-oman-uae-railway-connection-project/"),
      source("ad-digital-2027", "Abu Dhabi Government Digital Strategy 2025–2027", "Abu Dhabi Media Office", "https://www.mediaoffice.abudhabi/en/government-affairs/abu-dhabi-government-launches-digital-strategy-2025-2027/"),
    ],
  },
  sharjah: {
    cover: {
      src: "/emirates/editorial/sharjah-market-overview-v1.webp",
      alt: "PSR editorial panorama of Sharjah's libraries, universities, museums, family public realm, port economy, mountains and mangroves",
      caption: "Culture, education, research, industry, heritage and the east-coast landscapes of the emirate.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "Industry, education, research, heritage and two-coast geography",
    executiveSummary: "Sharjah is a culture, education, research, industrial and family emirate with its own economic identity and two-coast geography. Its relationship with Dubai matters, but it is not merely a lower-cost extension of Dubai.",
    timeline: { past: "Trade, ports, scholarship, museums and heritage conservation built a civic identity around knowledge and family life.", present: "University City, SRTIP, industrial areas, cultural institutions, airport activity and planned communities create a mixed resident-and-enterprise economy.", outlook: "Airport expansion, innovation activity and continued heritage and sustainability investment can deepen Sharjah's own employment and visitor base." },
    comparison: { economicAnchor: "Industry, education and research", definingAsset: "Museums, books and heritage", naturalAsset: "Khor Fakkan coast + Kalba mangroves", nextCatalyst: "Airport expansion + innovation economy" },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "A diversified base spanning industry, trade, education, research, free-zone enterprise and cultural production.", signals: [
        { title: "SRTIP innovation ecosystem", detail: "The operating research, technology and free-zone platform beside University City connects applied research with enterprise formation.", sourceIds: ["srtip"] },
        { title: "Industry and two-coast access", detail: "Sharjah's geography and industrial base give it roles in production, logistics and trade beyond residential spillover from Dubai.", sourceIds: ["sharjah-airport", "srtip"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Airport, roads, ports and future rail access shape both local activity and cross-emirate movement.", signals: [
        { title: "Sharjah airport expansion", detail: "The expansion programme targets capacity for 25 million passengers annually by mid-2027; this remains a target until operationally confirmed.", sourceIds: ["sharjah-airport"] },
        { title: "Cross-emirate movement", detail: "Commute time and transport capacity remain central to how Sharjah districts connect with jobs across the wider metropolitan corridor.", sourceIds: ["sharjah-airport"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Museums, publishing, universities, restored heritage and the east coast give Sharjah a distinct cultural-visitor identity.", signals: [
        { title: "Heart of Sharjah", detail: "An operating heritage destination with continuing conservation and restoration rather than one fixed completion event.", sourceIds: ["heart-of-sharjah"] },
        { title: "Knowledge economy", detail: "Universities, research facilities and cultural institutions support longer-duration resident and visitor demand.", sourceIds: ["srtip", "heart-of-sharjah"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Sharjah spans Gulf coast, Hajar mountains, Khor Fakkan and Kalba mangroves, alongside experiments in lower-impact community design.", signals: [
        { title: "Sharjah Sustainable City", detail: "Residential phases are delivered while some community amenities continue to progress; the mixed status should remain explicit.", sourceIds: ["sharjah-sustainable-city"] },
        { title: "Coasts and mangroves", detail: "Nature and east-coast geography diversify Sharjah's recreation and tourism offer beyond the core city.", sourceIds: ["heart-of-sharjah"] },
      ] },
    ],
    futureInitiatives: [
      { id: "sharjah-airport-expansion", name: "Sharjah International Airport expansion", category: "Aviation", status: "Under construction", timing: "Target capacity milestone mid-2027", summary: "Comprehensive expansion intended to raise annual passenger capacity.", marketImpact: "Supports tourism, trade and employment while changing access around the airport corridor.", sourceIds: ["sharjah-airport"] },
      { id: "sharjah-sustainable-city-amenities", name: "Sharjah Sustainable City amenity programme", category: "Sustainability", status: "Phased / mixed", timing: "Operating homes with continuing amenity works", summary: "Operating residential community with continuing amenity works.", marketImpact: "A live test of sustainable-community operations rather than only a launch concept.", sourceIds: ["sharjah-sustainable-city"] },
      { id: "hamriyah-iwp", name: "Hamriyah Independent Water Project", category: "Water security", status: "Under construction", timing: "Initial capacity target Q2 2027 / full capacity target Q2 2028", summary: "Sharjah's first independent water project is planned to reach 272,000 cubic metres per day before scaling to 410,000.", marketImpact: "Adds desalination and storage capacity for urban and industrial growth; the two disclosed capacity milestones remain delivery targets.", sourceIds: ["hamriyah-iwp"] },
      { id: "sharjah-exhibition-centre", name: "Sharjah Exhibitions and Conventions Centre", category: "Business events & culture", status: "Under construction", timing: "Target opening Nov 2027", summary: "An AED500m exhibition and conference venue planned near major inter-emirate and east-coast roads.", marketImpact: "Can deepen Sharjah's MICE, publishing and cultural calendar while the announced opening remains a target.", sourceIds: ["sharjah-exhibition-centre"] },
      { id: "sharjah-midline-drainage", name: "Midline rainwater and groundwater drainage project", category: "Climate resilience", status: "Under construction", timing: "Phase 1 target end-2026 / overall target H1 2027", summary: "An AED500m drainage system designed to protect roughly 4,000 hectares and maintain continuity across major roads and districts.", marketImpact: "Addresses a practical resilience constraint on dense urban districts; progress and dates are time-stamped targets, not guarantees.", sourceIds: ["sharjah-drainage-scope", "sharjah-drainage-progress"] },
      { id: "sharjah-creative-quarter", name: "Sharjah Creative Quarter", category: "Culture & creative economy", status: "Announced", timing: "Delivery date not announced", summary: "A University City cluster planned around creative production, prototyping, archives, museums, design education, workspace and hospitality.", marketImpact: "Could expand the knowledge economy from institutions into production and enterprise, but construction commencement is not yet confirmed.", sourceIds: ["sharjah-creative-quarter"] },
      { id: "sharjah-utility-solar", name: "Sharjah utility-scale solar programme", category: "Clean energy", status: "In development", timing: "Development agreement signed Jan 2026 / no commissioning date", summary: "BEEAH and Masdar are screening and developing potential utility-scale solar projects across the emirate.", marketImpact: "Signals a route toward larger-scale clean generation, while site, capacity and delivery dates still require project-level confirmation.", sourceIds: ["sharjah-solar"] },
    ],
    sources: [
      source("sharjah-airport", "Sharjah International Airport expansion", "Sharjah Airport Authority", "https://www.sharjahairport.ae/en/%D9%87%D9%8A%D8%A6%D8%A9-%D9%85%D8%B7%D8%A7%D8%B1-%D8%A7%D9%84%D8%B4%D8%A7%D8%B1%D9%82%D8%A9-%D8%A7%D9%84%D8%AF%D9%88%D9%84%D9%8A-%D8%AA%D8%AC%D8%AA%D9%85%D8%B9-%D9%85%D8%B9-%D8%A7%D9%84%D8%B4%D8%B1/"),
      source("sharjah-sustainable-city", "Construction updates", "Sharjah Sustainable City", "https://www.sharjahsustainablecity.ae/construction-updates/"),
      source("heart-of-sharjah", "Heart of Sharjah", "Shurooq", "https://shurooq.gov.ae/portfolio/heart-of-sharjah"),
      source("srtip", "Sharjah Research, Technology and Innovation Park", "SRTIP", "https://srtip.ae/"),
      source("hamriyah-iwp", "Hamriyah Independent Water Project", "ACWA Power and SEWA", "https://acwapower.com/en/media-center/latest-news/acwa-power-and-sewa-sign-deal-for-sharjah-s-first-independent-water-project/"),
      source("sharjah-exhibition-centre", "Sharjah Exhibitions and Conventions Centre construction", "Sharjah Government Media Bureau", "https://sharjah24.ae/en/Articles/2026/01/12/HK1"),
      source("sharjah-drainage-scope", "Midline drainage project scope and phases", "Sharjah Government Media Bureau", "https://sharjah24.ae/en/Articles/2026/04/27/aa8"),
      source("sharjah-drainage-progress", "Midline drainage progress update", "Sharjah Government Media Bureau", "https://sharjah24.ae/en/Articles/2026/07/29/Ma9"),
      source("sharjah-creative-quarter", "Sharjah Creative Quarter establishment and design", "Sharjah Government Media Bureau", "https://sharjah24.ae/en/Articles/2025/01/28/kmr8"),
      source("sharjah-solar", "Sharjah utility-scale solar development agreement", "Masdar", "https://masdar.ae/en/news/newsroom/beeah-and-masdar-to-jointly-develop-utility-scale-solar-projects-in-sharjah"),
    ],
  },
  "ras-al-khaimah": {
    cover: {
      src: "/emirates/editorial/ras-al-khaimah-market-overview-v1.webp",
      alt: "PSR editorial panorama of Ras Al Khaimah's mountains, heritage, manufacturing, port, coast and resort economy",
      caption: "Mountains, industry, ports, heritage and a fast-changing tourism and hospitality economy.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "Mountains, manufacturing, ports, heritage and a fast-scaling resort economy",
    executiveSummary: "Ras Al Khaimah combines mountains, manufacturing, ports, heritage and nature tourism with a fast-growing resort economy. Its opportunity is substantial, but it should not be priced or analysed as a smaller Dubai.",
    timeline: { past: "Maritime trade, agriculture, quarrying, ceramics, mountain settlements and local industry formed a physical, productive economy.", present: "RAKEZ, manufacturing, adventure tourism, beaches, Al Marjan Island and hotel investment now operate as connected growth engines.", outlook: "Wynn Al Marjan Island and Tourism Vision 2030 can accelerate global awareness, while seasonality, infrastructure and execution remain the key market tests." },
    comparison: { economicAnchor: "Manufacturing, trade and tourism", definingAsset: "Jebel Jais + resort coastline", naturalAsset: "Mountains, beaches and mangroves", nextCatalyst: "Wynn Al Marjan Island" },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "Manufacturing, industrial services, free-zone activity and tourism give RAK a productive base alongside its resort pipeline.", signals: [
        { title: "RAKEZ", detail: "The operating government economic zone supports industrial, logistics and commercial businesses; dynamic tenant counts should always be dated.", sourceIds: ["rakez"] },
        { title: "A productive northern economy", detail: "Industry and trade remain structural anchors even as international attention shifts toward hospitality and waterfront development.", sourceIds: ["rakez", "rak-tourism-2030"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Road, airport, port and island access determine whether visitor growth converts into durable economic activity.", signals: [
        { title: "Al Marjan Island", detail: "An operating destination and continuing development platform; completed hotels and public realm should be separated from future plots and launches.", sourceIds: ["al-marjan"] },
        { title: "Access and capacity", detail: "Tourism growth depends on airport, road and hospitality capacity arriving in step with new destinations.", sourceIds: ["rak-tourism-2030"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Mountain adventure, beaches, heritage and resort hospitality create a visitor proposition unlike the dense city markets.", signals: [
        { title: "Tourism Vision 2030", detail: "The official roadmap targets more than 3.5 million annual visitors by 2030; the number is a policy target, not guaranteed demand.", sourceIds: ["rak-tourism-2030"] },
        { title: "Visitor-economy diversification", detail: "RAK's mountain, heritage, beach and resort portfolio broadens its visitor proposition beyond any single destination.", sourceIds: ["rak-tourism-2030", "al-marjan"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Jebel Jais, wadis, beaches and mangroves are economic assets that support recreation, conservation and a distinct quality of place.", signals: [
        { title: "Mountain economy", detail: "Adventure and nature tourism diversify the emirate beyond its beachfront resorts.", sourceIds: ["rak-tourism-2030"] },
        { title: "Coast and island system", detail: "Beaches and island development carry both tourism value and environmental constraints that require careful delivery.", sourceIds: ["al-marjan", "rak-tourism-2030"] },
      ] },
    ],
    futureInitiatives: [
      { id: "wynn-rak", name: "Wynn Al Marjan Island", category: "Tourism", status: "Under construction", timing: "Official opening window Spring 2027", summary: "Large integrated resort under construction on Al Marjan Island.", marketImpact: "A global-visibility catalyst whose effect on nearby assets still depends on project quality, operations and market depth.", sourceIds: ["wynn-rak"] },
      { id: "rak-tourism-vision", name: "Ras Al Khaimah Tourism Vision 2030", category: "Tourism strategy", status: "Strategy", timing: "2030 horizon", summary: "Sustainable-tourism roadmap with a visitor target and destination-development programme.", marketImpact: "Frames the scale of hospitality and infrastructure ambition while keeping targets distinct from achieved demand.", sourceIds: ["rak-tourism-2030"] },
      { id: "al-marjan-pipeline", name: "Al Marjan Island development pipeline", category: "Waterfront destination", status: "Phased / mixed", timing: "Operating destination / no single completion date", summary: "Operating island destination with a continuing hospitality and mixed-use pipeline.", marketImpact: "Requires plot-by-plot and operator-by-operator analysis rather than one island-wide completion claim.", sourceIds: ["al-marjan"] },
      { id: "saqr-port-2", name: "Saqr Port 2.0", category: "Maritime logistics", status: "In development", timing: "Phase 1 target end-2027 / later phases not dated", summary: "A phased port expansion adding common-user quay, project-cargo, bulk, shipyard, recycling and deep-water capacity.", marketImpact: "Strengthens the emirate's productive and industrial economy beyond hospitality; only the first phase carries a published target date.", sourceIds: ["saqr-port-2"] },
      { id: "rak-wastewater-ppp", name: "Ras Al Khaimah wastewater infrastructure PPP", category: "Water & circular infrastructure", status: "In development", timing: "Commercial agreement signed Jan 2026 / completion date not announced", summary: "A planned 60,000-cubic-metre-per-day treatment plant with a recycled-water network for irrigation and cooling reuse.", marketImpact: "Adds enabling capacity for sustainable urban and industrial growth, while the commercial agreement does not prove construction commencement.", sourceIds: ["rak-wastewater-ppp"] },
      { id: "thi-industrial-park", name: "THi Smart Manufacturing Industrial Park", category: "Advanced manufacturing", status: "Under construction", timing: "Construction commenced Jan 2026 / phased completion", summary: "A 300,000-plus-square-metre cluster planned for new energy, advanced manufacturing, industrial technology and logistics.", marketImpact: "Diversifies employment and industrial space demand, while investment, tenant and jobs figures remain projections.", sourceIds: ["thi-industrial-park"] },
      { id: "rak-sustainability-2050", name: "RAK Integrated Sustainability Strategy 2050", category: "Energy & environment", status: "Strategy", timing: "2050 horizon", summary: "The emirate's umbrella strategy for renewable energy, storage, utility resilience, habitats and decarbonisation across major sectors.", marketImpact: "Provides a long-range framework for utilities, buildings and industry without turning older 2040 targets into current project commitments.", sourceIds: ["rak-sustainability-2050"] },
      { id: "rak-evtol", name: "Ras Al Khaimah eVTOL and vertiport network", category: "Advanced mobility", status: "Announced", timing: "Commercial service targeted 2027", summary: "A first-phase four-site network is planned to connect Al Marjan Island, Al Hamra and Jebel Jais by electric air taxi and helicopter.", marketImpact: "Could improve premium visitor access, but the framework still carries regulatory, commercial and execution risk.", sourceIds: ["rak-evtol"] },
      { id: "rak-vvip-terminal", name: "RAK Airport VVIP terminal and private-jet hangars", category: "Aviation", status: "Announced", timing: "Target opening Q1 2027", summary: "A planned premium terminal, hangar and apron programme at Ras Al Khaimah International Airport.", marketImpact: "Supports investor and high-value visitor access, but the source scheduled construction rather than confirming it underway.", sourceIds: ["rak-vvip-terminal"] },
    ],
    sources: [
      source("wynn-rak", "Wynn Al Marjan Island", "Wynn Resorts", "https://www.newsroom.wynnresorts.com/en/wynnalmarjan/wynn-al-marjan-island-unveils-beach--lagoon--and-reef--offering-first-glimpse-of-future-shoreline-ex/s/c7506377-c4e6-48c9-ac9e-c324f33f9695"),
      source("rak-tourism-2030", "Ras Al Khaimah Tourism Vision 2030", "Ras Al Khaimah Tourism Development Authority", "https://raktda.com/strategy/"),
      source("al-marjan", "Al Marjan Island masterplan", "Marjan", "https://marjan.ae/development/masterplans/al-marjan-island"),
      source("rakez", "About RAKEZ", "Ras Al Khaimah Economic Zone", "https://rakez.com/en/about-us/rakez"),
      source("saqr-port-2", "RAK Ports Marine Information Guide 2026", "RAK Ports", "https://rakports.ae/wp-content/uploads/2026/04/marine-information-guide.pdf"),
      source("rak-wastewater-ppp", "Ras Al Khaimah wastewater infrastructure agreement", "RAK Government Media Office", "https://www.rakmediaoffice.ae/en/media-center/press-releases/ras-al-khaimah-signs-agreement-to-develop-the-largest-wastewater-infrastructure-project-in-the-emirate-to-enable-sustainable-growth/"),
      source("thi-industrial-park", "THi Smart Manufacturing Industrial Park construction", "RAKEZ", "https://rakez.com/en/media-centre/news-detail/articleid/1666/thi-begins-construction-of-ras-al-khaimah-smart-manufacturing-industrial-park"),
      source("rak-sustainability-2050", "RAK Integrated Sustainability Strategy 2050", "Reem / RAK Municipality", "https://reem.rak.ae/strategy/"),
      source("rak-evtol", "Ras Al Khaimah electric air-mobility framework", "RAK Government Media Office", "https://www.rakmediaoffice.ae/en/media-center/press-releases/skys-the-limit-ras-al-khaimah-to-elevate-tourism-with-electric-air-mobility-across-the-emirate/"),
      source("rak-vvip-terminal", "RAK Airport VVIP terminal and hangars", "RAK Government Media Office", "https://www.rakmediaoffice.ae/en/media-center/press-releases/ras-al-khaimah-international-airport-announces-vvip-terminal-and-hangars-enhancing-emirates-appeal-as-a-global-entertainment-and-tourism-hub/"),
    ],
  },
  ajman: {
    cover: {
      src: "/emirates/editorial/ajman-market-overview-v1.webp",
      alt: "PSR editorial panorama of Ajman's fort, dhow building, port, compact coast, mangroves and local enterprise",
      caption: "A compact coastal economy built around trade, enterprise, maritime heritage and mangroves.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "SME enterprise, port trade, maritime heritage and a compact mangrove coast",
    executiveSummary: "Ajman is a compact coastal emirate whose market is shaped by SMEs, free-zone activity, the port, maritime heritage, affordability and Al Zorah's mangrove landscape. Its strength is practical access and enterprise, not landmark scale.",
    timeline: { past: "Fishing, dhow building, trade and the creek formed Ajman's maritime and commercial identity.", present: "The port, free zone, local enterprise, compact neighbourhoods, university activity and Al Zorah create a value-led resident economy.", outlook: "Ajman Vision 2030, business formation and nature-led waterfront improvements can raise quality of place if transport and services keep pace." },
    comparison: { economicAnchor: "SMEs, free zone and port trade", definingAsset: "Dhow heritage + compact coast", naturalAsset: "Al Zorah mangroves", nextCatalyst: "Ajman Vision 2030" },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "Ajman's commercial base is practical and entrepreneurial, led by smaller businesses, trade, industry and value-sensitive households.", signals: [
        { title: "Ajman Free Zone", detail: "An established operating free zone and business-formation engine; changing company counts should be dated before publication.", sourceIds: ["ajman-free-zone"] },
        { title: "Ajman Port", detail: "The operating government trade gateway supports the emirate's logistics and maritime economy without requiring unsupported throughput claims.", sourceIds: ["ajman-port"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "A small urban footprint can be an advantage, but road access and cross-emirate movement remain central to daily value.", signals: [
        { title: "Compact city logic", detail: "Short local distances and a concentrated service base support practical living when congestion and regional access are managed.", sourceIds: ["ajman-vision"] },
        { title: "Port-and-road relationship", detail: "Trade access and regional roads connect local firms with the wider northern-emirates economy.", sourceIds: ["ajman-port", "ajman-vision"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "The fort, dhow craft, creek and coast provide a human-scale visitor identity rather than a megaproject narrative.", signals: [
        { title: "Maritime heritage", detail: "Dhow building and creek-side trade remain part of Ajman's cultural and economic identity.", sourceIds: ["ajman-vision", "ajman-port"] },
        { title: "Al Zorah destination", detail: "Golf, marina, hospitality and mangroves operate alongside continuing development; not every announced component is complete.", sourceIds: ["al-zorah"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Mangroves, shallow coastal water and compact urban form are Ajman's most distinctive environmental assets.", signals: [
        { title: "Al Zorah mangroves", detail: "The city plan identifies a large protected mangrove area and extensive waterfront; conservation and access are integral to the destination proposition.", sourceIds: ["al-zorah"] },
        { title: "Coastal resilience", detail: "Future waterfront growth should be read alongside environmental quality, public access and long-term operating performance.", sourceIds: ["ajman-vision", "al-zorah"] },
      ] },
    ],
    futureInitiatives: [
      { id: "ajman-vision-2030", name: "Ajman Vision 2030", category: "Emirate strategy", status: "Strategy", timing: "2030 horizon", summary: "Emirate-wide framework for quality of life, economic development and government performance.", marketImpact: "Creates a public accountability frame for services and investment rather than a single project promise.", sourceIds: ["ajman-vision"] },
      { id: "al-zorah-growth", name: "Al Zorah City continuing development", category: "Nature-led destination", status: "Phased / mixed", timing: "Operating assets with continuing mixed-use delivery", summary: "Operating golf, marina, mangroves and hospitality alongside continuing mixed-use delivery.", marketImpact: "The value proposition depends on protecting natural assets while completing services and destination components.", sourceIds: ["al-zorah"] },
      { id: "ajman-port-expansion", name: "Ajman Port expansion and development plan", category: "Maritime logistics", status: "In development", timing: "15-year strategy initiated by Jun 2025 MoU / phase dates not announced", summary: "An AED1bn plan with Hutchison Ports spanning infrastructure, shipping links, cargo efficiency, AI, digital systems and sustainable operations.", marketImpact: "Could deepen Ajman's trade and logistics role, but the MoU and planned investment do not prove that physical construction has begun.", sourceIds: ["ajman-port-expansion"] },
      { id: "ajman-am30x30", name: "Ajman Municipality AM30x30 agenda", category: "Urban infrastructure", status: "Phased / mixed", timing: "30-project programme across 2026–2030", summary: "An AED1.8bn package covering roads, drainage, pedestrian bridges, cycle tracks, parks and community spaces at different delivery stages.", marketImpact: "Improves mobility, resilience and public realm across the compact city, while no single status or finish date applies to every component.", sourceIds: ["ajman-am30x30"] },
      { id: "ajman-city-centre-roads", name: "Ajman City Centre road development — phase two", category: "Roads & drainage", status: "Phased / mixed", timing: "Scheduled Q3 2026–Q4 2027", summary: "A detailed subproject upgrading Sheikh Rashid bin Humaid Street, intersections, pavement, parking and stormwater links around central districts.", marketImpact: "Targets day-to-day access and flood resilience around the commercial core; its budget overlaps the wider city-centre programme.", sourceIds: ["ajman-city-centre-roads"] },
      { id: "manama-museum", name: "Manama Museum development", category: "Culture & heritage", status: "Under construction", timing: "Restoration inspected Aug 2026 / opening date not announced", summary: "A historic fort is being restored as a 13-room museum covering agriculture, environment, architecture, stamps, currency and local history.", marketImpact: "Extends Ajman's visitor and education assets beyond the coast while completion percentage and opening remain unconfirmed.", sourceIds: ["manama-museum"] },
      { id: "ajman-green-public-realm", name: "Al Muntazi park and recycled-water greening programme", category: "Nature & public realm", status: "Phased / mixed", timing: "Park target end-2027 / wider park programme target end-2028", summary: "A package combining a 30,000-square-metre community park, environmental education, smart irrigation and recycled-water landscape systems.", marketImpact: "Adds climate-adapted public realm and treated-water reuse, while bundled components retain separate scopes and timelines.", sourceIds: ["ajman-green-public-realm"] },
    ],
    sources: [
      source("ajman-vision", "Ajman Vision 2030", "Government of Ajman", "https://ajman2030.ae/vision/"),
      source("ajman-free-zone", "Ajman Free Zone profile", "Ajman Free Zone", "https://afz.gov.ae/en/about-us/profile.html"),
      source("ajman-port", "Department of Port and Customs – Ajman", "Government of Ajman", "https://www.apcd.ae/en/"),
      source("al-zorah", "Al Zorah City plan", "Al Zorah City", "https://alzorahcity.com/public/index.php/city-plan"),
      source("ajman-port-expansion", "Ajman Port development MoU", "Ajman Ports and Customs Department", "https://www.apcd.ae/en/press-center/news/ammar-bin-humaid-witnesses-signing-of-mou-to-develop-ajman-port-worth-aed-1-billion/"),
      source("ajman-am30x30", "Ajman Municipality AM30x30 agenda", "Ajman Government Media Office", "https://www.ajmanmedia.ae/en/news/article-en-gqwt"),
      source("ajman-city-centre-roads", "Ajman City Centre road-development phase two", "Ajman Government Media Office", "https://ajmanmedia.ae/en/news/article-en-njgs"),
      source("manama-museum", "Manama Museum development inspection", "Ajman Government Media Office", "https://ajmanmedia.ae/en/news/article-AMO-122484"),
      source("ajman-green-public-realm", "Al Muntazi park and green-project package", "Ajman Government Media Office", "https://ajmanmedia.ae/en/news/article-en-arwr"),
    ],
  },
  fujairah: {
    cover: {
      src: "/emirates/editorial/fujairah-market-overview-v1.webp",
      alt: "PSR editorial panorama of Fujairah's Hajar Mountains, port, energy storage, passenger rail, heritage and Gulf of Oman coast",
      caption: "The UAE's east-coast gateway: mountains, ports, energy logistics, rail, heritage and marine tourism.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "East-coast ports, energy logistics, mountains, rail and marine tourism",
    executiveSummary: "Fujairah is the UAE's strategic east-coast gateway: a port, bunkering and energy-storage centre framed by the Hajar Mountains, Gulf of Oman, rail connectivity, heritage and marine tourism.",
    timeline: { past: "Mountain settlements, agriculture, fishing and east-coast trade defined the emirate before modern port and energy infrastructure scaled.", present: "Port of Fujairah, FOIZ, logistics, passenger rail, fisheries, beaches and mountain tourism now form a specialised economy.", outlook: "Fujairah 2040 and the staged national rail network can deepen access and industrial relevance, while growth should preserve coast, mountains and realistic demand depth." },
    comparison: { economicAnchor: "Port, bunkering and energy logistics", definingAsset: "East-coast maritime gateway", naturalAsset: "Hajar Mountains + Gulf of Oman", nextCatalyst: "Rail connectivity + Fujairah 2040" },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "Fujairah has a specialised maritime, logistics and energy-storage role that is strategically different from west-coast city economies.", signals: [
        { title: "Port of Fujairah", detail: "The operating multipurpose east-coast port is a major bunkering and maritime-services hub.", sourceIds: ["fujairah-port"] },
        { title: "Fujairah Oil Industry Zone", detail: "An operating specialised terminal and storage cluster; dynamic capacity figures must be dated and its media cannot be reused without permission.", sourceIds: ["foiz"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Mountain corridors, port access and national rail determine Fujairah's role in moving people and goods across the federation.", signals: [
        { title: "Operating Abu Dhabi–Fujairah passenger rail", detail: "Introductory service began on 30 June 2026 between Al Hilal City and Mohammed bin Zayed City; the rest of the national rollout remains staged.", sourceIds: ["fujairah-rail"] },
        { title: "Fujairah 2040", detail: "A long-range planning framework whose older relative deadlines should not be treated as current without project-level confirmation.", sourceIds: ["fujairah-2040"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Forts, mosques, wadis, diving, beaches and mountain landscapes create a weekend and nature-led visitor economy.", signals: [
        { title: "Mountain-and-marine destination", detail: "The Hajar Mountains and Gulf of Oman offer a different visitor proposition from urban Gulf-coast destinations.", sourceIds: ["fujairah-2040"] },
        { title: "Heritage landscape", detail: "Forts, settlements and agricultural valleys should be read as part of the emirate's place identity, not decorative background.", sourceIds: ["fujairah-2040"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Deep-water access, strategic energy logistics, mountains and marine ecosystems are central economic assets and planning constraints.", signals: [
        { title: "Energy-storage corridor", detail: "Oil terminals and bunkering provide a structural industrial role that is distinct from downstream property demand.", sourceIds: ["fujairah-port", "foiz"] },
        { title: "Mountains and coast", detail: "Natural topography limits developable land while supporting tourism, agriculture and a strong east-coast identity.", sourceIds: ["fujairah-2040"] },
      ] },
    ],
    futureInitiatives: [
      { id: "fujairah-2040-programme", name: "Fujairah 2040 Plan", category: "Infrastructure strategy", status: "Strategy", timing: "2040 horizon", summary: "Long-range framework covering urban, transport, port and public-service growth.", marketImpact: "Useful as a strategic direction; individual milestones require current confirmation before investment decisions.", sourceIds: ["fujairah-2040"] },
      { id: "fujairah-west-east-pipeline", name: "ADNOC New West–East pipeline", category: "Energy logistics", status: "Under construction", timing: "Reported 50% complete in May 2026 / operations targeted 2027", summary: "A strategic crude pipeline intended to expand export capability through Fujairah on the Gulf of Oman.", marketImpact: "Deepens the east coast's energy-security and logistics role, while the dated progress figure and 2027 milestone remain subject to delivery.", sourceIds: ["fujairah-west-east-pipeline"] },
      { id: "fujairah-new-terminals", name: "Al Rugaylat and Dibba cargo terminals", category: "Maritime logistics", status: "Announced", timing: "Proposed concession Jul 2026 / 24–30 months after construction starts", summary: "DP World and the Port of Fujairah agreed in principle to develop a container and multipurpose terminal at Al Rugaylat plus a general-cargo terminal at Dibba.", marketImpact: "Could broaden east-coast cargo capacity and trade links, but no construction start or fixed completion date has been published.", sourceIds: ["fujairah-new-terminals"] },
      { id: "fujairah-iwp", name: "Fujairah I Independent Water Producer", category: "Water security", status: "In development", timing: "EPC agreement signed May 2026 / delivery period about 30 months", summary: "A planned AED1.046bn reverse-osmosis facility at the Port of Fujairah with 60 million imperial gallons per day of capacity.", marketImpact: "Adds critical utility capacity for communities and industry, while the delivery period begins from a commencement milestone that has not been fixed publicly.", sourceIds: ["fujairah-iwp"] },
      { id: "fujairah-biofuel", name: "Fujairah biofuel facility", category: "Future energy", status: "Announced", timing: "US$300m facility announced Apr 2026 / delivery date not announced", summary: "A planned biofuel production facility highlighted by the UAE Cabinet as part of National Biofuel Policy progress.", marketImpact: "Extends Fujairah's energy role into lower-carbon fuels, but site, capacity, construction and commissioning milestones remain undisclosed.", sourceIds: ["fujairah-biofuel"] },
      { id: "project-hajar", name: "Project Hajar CO2 mineralisation pilot", category: "Climate technology", status: "Active programme", timing: "Scale-up injection reported Dec 2025 / commercial date not announced", summary: "A Fujairah pilot mineralises captured carbon dioxide in local rock formations and is progressing through scale-up testing.", marketImpact: "Adds a place-specific climate-technology experiment to the industrial landscape without implying commercial-scale deployment.", sourceIds: ["project-hajar"] },
    ],
    sources: [
      source("fujairah-port", "Port of Fujairah infrastructure and oil activities", "Port of Fujairah", "https://fujairahport.ae/port-overview/infrastructure-overview/"),
      source("foiz", "Fujairah Oil Industry Zone", "FOIZ", "https://foiz.gov.ae/?hl=en"),
      source("fujairah-2040", "Fujairah 2040 Plan", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/transport-and-infrastructure/fujairah-2040-plan"),
      source("fujairah-rail", "First UAE national passenger rail service", "Etihad Rail", "https://corporate.etihadrail.ae/en/newsroom/press/the-uaes-first-national-passenger-rail-service-begins-as-etihad-rail-welcomes-first-paying-passengers"),
      source("fujairah-west-east-pipeline", "New West–East pipeline construction progress", "ADNOC", "https://adnoc.ae/en/news-and-media/press-releases/2026/khaled-bin-mohamed-bin-zayed--chairs-meeting-of-executive"),
      source("fujairah-new-terminals", "Al Rugaylat and Dibba terminals agreement", "DP World", "https://www.dpworld.com/en/news/dp-world-to-expand-uae-gateway-network-with-new-fujairah-terminals"),
      source("fujairah-iwp", "Fujairah I Independent Water Producer EPC agreement", "Etihad Water and Electricity", "https://etihadwe.ae/en/mediacenter/pages/NewsDetails.aspx?itemId=952"),
      source("fujairah-biofuel", "National Biofuel Policy progress and Fujairah facility", "UAE Cabinet / Dubai Media Office", "https://prod.mediaoffice.ae/en/news/2026/april/23-04/mohammed-bin-rashid-chairs-uae-cabinet-meeting"),
      source("project-hajar", "Project Hajar scale-up update", "44.01", "https://www.4401.earth/blog/44-01-scales-up-its-xprize-winning-co2-mineralisation-project-in-the-uae"),
    ],
  },
  "umm-al-quwain": {
    cover: {
      src: "/emirates/editorial/umm-al-quwain-market-overview-v1.webp",
      alt: "PSR editorial panorama of Umm Al Quwain's mangroves, islands, fishing, aquaculture, archaeology and quiet coastal economy",
      caption: "Mangroves, islands, fisheries, archaeology and a patient blue-economy strategy.",
      credit: "AI-assisted image generated for PSR Homes; editorial composite, not an official map or masterplan.",
      provenance: "PSR editorial composite",
    },
    descriptor: "Mangroves, islands, fisheries, archaeology and a patient blue economy",
    executiveSummary: "Umm Al Quwain is a low-density coastal emirate defined by mangroves, islands, fisheries, archaeology, small-scale trade and a formal blue-economy strategy. Its market case is patient and nature-led rather than high-turnover.",
    timeline: { past: "Fishing, seafaring, coastal settlement and archaeological sites reflect a long relationship with lagoons and Gulf trade.", present: "Mangroves, aquaculture, recreation, the port/free-zone platform and limited mixed-use development support a smaller local economy.", outlook: "Vision 2033 and the Sustainable Blue Economy Strategy 2031 seek to grow tourism and enterprise while expanding conservation; delivery quality matters more than pace." },
    comparison: { economicAnchor: "Blue economy, port and free zone", definingAsset: "Islands, archaeology and fishing culture", naturalAsset: "Mangroves and shallow lagoons", nextCatalyst: "Blue Economy Strategy 2031" },
    pillars: [
      { id: "economy", label: "Economy & capital", summary: "A smaller economy centred on marine activity, local enterprise, industry and a government-backed port/free-zone platform.", signals: [
        { title: "Port and free-zone platform", detail: "The operating trade and industrial platform is a practical economic anchor without relying on unsupported cargo or tenant counts.", sourceIds: ["uaq-free-zone"] },
        { title: "Blue-economy direction", detail: "The 2031 strategy explicitly links economic activity to marine assets and environmental protection.", sourceIds: ["uaq-blue-economy"] },
      ] },
      { id: "infrastructure", label: "Infrastructure & connectivity", summary: "Regional roads, the port and careful island access shape what scale of growth the emirate can absorb.", signals: [
        { title: "Vision 2033", detail: "The strategic framework links quality of life, sustainable economy, tourism and digital government; its metrics remain targets.", sourceIds: ["uaq-vision-2033"] },
        { title: "Low-density access", detail: "Infrastructure must improve connectivity without erasing the ecological and low-density qualities that differentiate UAQ.", sourceIds: ["uaq-vision-2033", "uaq-blue-economy"] },
      ] },
      { id: "culture-tourism", label: "Culture & tourism", summary: "Archaeology, forts, fishing culture, islands and water recreation support a small-scale visitor proposition.", signals: [
        { title: "Coastal heritage", detail: "Historic settlements and maritime traditions are part of the emirate's identity and future tourism offer.", sourceIds: ["uaq-vision-2033"] },
        { title: "Nature-led tourism", detail: "Tourism ambition is strongest when it protects mangroves, islands and marine life instead of copying dense resort models.", sourceIds: ["uaq-blue-economy"] },
      ] },
      { id: "energy-nature", label: "Energy & natural assets", summary: "Mangrove channels, shallow lagoons, birdlife and fisheries are productive infrastructure for the emirate's blue economy.", signals: [
        { title: "Mangroves as economic infrastructure", detail: "The emirate's blue-economy direction links marine-sector growth to expanded protection and mangrove cover; these remain targets, not completed outcomes.", sourceIds: ["uaq-blue-economy"] },
        { title: "Aquaculture and fisheries", detail: "Marine production and ecosystem health should be analysed together rather than treating conservation as separate from the economy.", sourceIds: ["uaq-blue-economy"] },
      ] },
    ],
    futureInitiatives: [
      { id: "uaq-blue-2031", name: "Sustainable Blue Economy Strategy 2031", category: "Economy & environment", status: "Strategy", timing: "2031 horizon", summary: "Programme linking marine-sector growth, protected land and mangrove expansion.", marketImpact: "Gives UAQ a differentiated long-term identity while requiring visible environmental delivery.", sourceIds: ["uaq-blue-economy"] },
      { id: "uaq-vision", name: "Umm Al Quwain Vision 2033", category: "Emirate strategy", status: "Strategy", timing: "2033 horizon", summary: "Framework for quality of life, sustainable economy, tourism and digital government.", marketImpact: "Creates a wider decision frame than residential supply alone.", sourceIds: ["uaq-vision-2033"] },
      { id: "siniya-island", name: "Sobha Siniya Island", category: "Nature-led mixed use", status: "Under construction", timing: "Phased; overall completion estimated for 2032", summary: "Government/developer joint-venture island project with component handovers distinct from the overall masterplan timeline.", marketImpact: "Tests whether new waterfront supply can coexist with the natural-island identity and patient local demand.", sourceIds: ["siniya-island"] },
      { id: "uaq-logistics-city", name: "UAQ Logistics City and Cargo Airport", category: "Logistics & aviation", status: "Announced", timing: "Launched Nov 2024 / delivery date not announced", summary: "A logistics-city and cargo-airport concept announced to expand the emirate's trade, warehousing and air-freight platform.", marketImpact: "Could materially widen UAQ's economic base, but site, operator, capital programme and delivery timetable still require confirmation.", sourceIds: ["uaq-logistics-city"] },
      { id: "uaq-emirates-road", name: "Emirates Road Al Badee–UAQ upgrade", category: "Regional mobility", status: "Under construction", timing: "Two-year programme launched Sep 2025", summary: "A 25-kilometre federal road upgrade widening the corridor from three to five lanes in each direction.", marketImpact: "Improves regional access and freight movement, while the approximate 2027 finish depends on the stated two-year delivery programme.", sourceIds: ["uaq-emirates-road"] },
      { id: "uaq-ftz-warehouses", name: "UAQ Free Trade Zone warehouse expansion", category: "Industry & logistics", status: "Under construction", timing: "Phase 1 groundbreaking Jul 2025 / completion date not announced", summary: "A 129,000-square-foot first phase within a planned 387,000-square-foot warehouse expansion programme.", marketImpact: "Adds practical small-business and logistics capacity, with later phases and operating delivery still to be confirmed.", sourceIds: ["uaq-ftz-warehouses"] },
      { id: "omla-bank", name: "Omla community-bank platform", category: "Finance & technology", status: "In development", timing: "In-principle approval May 2026 / launch date not announced", summary: "An AI-led community-bank proposition received in-principle Central Bank approval to serve individuals, entrepreneurs and SMEs.", marketImpact: "Signals financial-inclusion and digital-finance capacity, but final licensing and commercial launch remain pending.", sourceIds: ["omla-bank"] },
      { id: "uaq-mangrove-centre", name: "Mangrove propagation centre", category: "Blue economy & nature", status: "Strategy", timing: "Planned under the 2031 blue-economy programme / delivery date not announced", summary: "A proposed centre for mangrove propagation sits within UAQ's wider programme for marine protection, nature tourism and blue-economy growth.", marketImpact: "Connects ecological restoration to the emirate's long-run visitor and resilience proposition without presenting strategy intent as construction.", sourceIds: ["uaq-blue-economy"] },
    ],
    sources: [
      source("uaq-vision-2033", "Umm Al Quwain Vision 2033", "UAE Government", "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/innovation-and-future-shaping/Umm-Al-Quwain-Vision-2033"),
      source("uaq-blue-economy", "Sustainable Blue Economy Strategy 2031", "UAE Media Office", "https://www.mediaoffice.ae/en/news/2022/march/29-03/mohammed-bin-rashid-attends-the-launching-of-um-aquain-strtegy"),
      source("uaq-free-zone", "Umm Al Quwain Free Trade Zone industrial platform", "UAQ Free Trade Zone", "https://promotion.uaqftz.com/industrial-land-uae/"),
      source("siniya-island", "Sobha Siniya Island partnership announcement", "Sobha Realty", "https://sobharealty.com/media-center/press-releases/rashid-bin-saud-al-mualla-witnesses-signing-partnership-agreement"),
      source("uaq-logistics-city", "Umm Al Quwain Logistics City and Cargo Airport", "Emirates News Agency", "https://www.wam.ae/en/article/b61k52l-umm-qaiwain-launches-logistics-city-cargo-airport"),
      source("uaq-emirates-road", "Emirates Road Al Badee–Umm Al Quwain upgrade", "Emirates News Agency", "https://www.wam.ae/en/article/bkogqvc-ministry-energy-and-infrastructure-launches"),
      source("uaq-ftz-warehouses", "Umm Al Quwain Free Trade Zone warehouse expansion", "UAQ Free Trade Zone", "https://uaqftz.gov.ae/events/uaq-ftz-marks-groundbreaking-ceremony-for-warehouse-expansion"),
      source("omla-bank", "In-principle approval for Omla community bank", "Emirates News Agency", "https://www.wam.ae/en/article/c06xc89-cbuae-grants-in-principle-approval-establish-omla"),
    ],
  },
};
