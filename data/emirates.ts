export const EMIRATE_IDENTITIES = [
  { slug: "dubai", name: "Dubai" },
  { slug: "abu-dhabi", name: "Abu Dhabi" },
  { slug: "sharjah", name: "Sharjah" },
  { slug: "ras-al-khaimah", name: "Ras Al Khaimah" },
  { slug: "ajman", name: "Ajman" },
  { slug: "fujairah", name: "Fujairah" },
  { slug: "umm-al-quwain", name: "Umm Al Quwain" },
] as const;

export type EmirateSlug = (typeof EMIRATE_IDENTITIES)[number]["slug"];
export type EmirateName = (typeof EMIRATE_IDENTITIES)[number]["name"];

export type EmirateProfile = {
  slug: EmirateSlug;
  name: EmirateName;
  descriptor: string;
  heroImage: string;
  gallery: { src: string; alt: string }[];
  thesis: string;
  past: string;
  present: string;
  future: string;
  marketRole: string[];
  investmentLens: string[];
  infrastructureSignals: { title: string; detail: string }[];
  sourceLinks: { label: string; href: string }[];
};

const nationalSources = [
  { label: "UAE Government - the seven emirates", href: "https://u.ae/en/about-the-uae/the-seven-emirates" },
  { label: "We the UAE 2031", href: "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/innovation-and-future-shaping/we-the-uae-2031-vision" },
];

export const emirateProfiles = [
  {
    slug: "dubai",
    name: "Dubai",
    descriptor: "Global gateway, trade city and branded-living laboratory",
    heroImage: "/hero/psr-cinematic-dubai.webp",
    gallery: [
      { src: "/insights/dubai-marina-residences.webp", alt: "Dubai Marina waterfront residences" },
      { src: "/insights/business-bay-waterfront.jpg", alt: "Business Bay waterfront skyline" },
      { src: "/insights/dubai-hills-residences.jpg", alt: "Dubai Hills residential community" },
      { src: "/insights/dubai-zabeel-skyline.jpg", alt: "Zabeel and Downtown Dubai skyline" },
    ],
    thesis: "Dubai moved from creek-side trade and regional logistics into a high-trust global city where aviation, tourism, finance, free zones and real estate reinforce each other.",
    past: "The city was built on trade, port activity and rapid infrastructure delivery. That commercial base gave Dubai the confidence to scale freehold property, hospitality districts and globally recognised landmarks.",
    present: "Today the market is broad rather than single-theme: waterfront apartments, villa communities, branded residences, serviced living, family masterplans and business-centre addresses all operate at different price and risk points.",
    future: "Dubai 2040 and the D33 economic agenda point toward a larger, more connected, higher-productivity city. The investment question is less 'is Dubai growing?' and more 'which corridor has infrastructure, demand depth and disciplined supply?'",
    marketRole: [
      "Highest PSR indexed project depth across the UAE catalogue.",
      "Most liquid off-plan and ready-market comparison set for buyers who need exit optionality.",
      "Strongest mix of family, investor, branded, waterfront and business-centre demand.",
    ],
    investmentLens: [
      "Use Downtown, Business Bay, DIFC-adjacent, Marina and Creek positions for liquidity and rental depth.",
      "Use Dubai Hills, Emaar South, Arabian Ranches corridors and school-led communities for family durability.",
      "Check payment plan quality, handover density and developer workload before comparing price alone.",
    ],
    infrastructureSignals: [
      { title: "Dubai 2040", detail: "Urban growth is being directed around connected centres, mobility, public spaces and higher-quality residential districts." },
      { title: "D33", detail: "The economic agenda keeps Dubai positioned around trade, finance, talent, logistics and global business formation." },
      { title: "Airport, port and metro logic", detail: "Residential value is increasingly tied to commute, airport access, business clusters and daily-life infrastructure." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Dubai 2040 Urban Master Plan", href: "https://dubai2040.ae/" },
      { label: "Dubai Economic Agenda D33", href: "https://www.dubaided.gov.ae/dubai-economic-agenda-d33/" },
    ],
  },
  {
    slug: "abu-dhabi",
    name: "Abu Dhabi",
    descriptor: "Capital city, sovereign economy and cultural waterfront",
    heroImage: "/insights/abu-dhabi-community.jpg",
    gallery: [
      { src: "/insights/abu-dhabi-community.jpg", alt: "Abu Dhabi waterfront community" },
      { src: "/insights/guggenheim-abu-dhabi.webp", alt: "Guggenheim Abu Dhabi cultural district" },
      { src: "/insights/harry-potter-yas-island.jpg", alt: "Yas Island entertainment expansion" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
    ],
    thesis: "Abu Dhabi is the UAE's capital anchor: institutionally planned, energy-backed, culture-led and increasingly diversified through tourism, finance, industry, technology and island masterplans.",
    past: "Its modern growth came from government-led planning, energy wealth and national institutions, with residential demand shaped by ministries, sovereign entities, universities and corporate headquarters.",
    present: "The emirate now combines established end-user districts with Saadiyat, Yas, Reem, Hudayriyat and coastal masterplans that target culture, wellness, sports, tourism and long-hold residential demand.",
    future: "The next cycle is defined by cultural capital, island infrastructure, hospitality growth and diversified non-oil activity. That favours projects with clear public-realm delivery and durable daily-life demand.",
    marketRole: [
      "Capital-led stability with fewer but often larger and more masterplanned residential releases.",
      "Strong cultural, education, healthcare and government-employment demand anchors.",
      "High relevance for family villas, waterfront apartments and institutional-quality masterplans.",
    ],
    investmentLens: [
      "Separate lifestyle waterfront premiums from commute-led daily-use demand.",
      "Review service charges, community governance and staged infrastructure delivery in island projects.",
      "Compare Saadiyat/Yas/Hudayriyat positioning against Reem, Al Raha and established mainland alternatives.",
    ],
    infrastructureSignals: [
      { title: "Saadiyat cultural district", detail: "Major museums and cultural institutions strengthen destination value and international visibility." },
      { title: "Yas Island entertainment", detail: "Theme parks, leisure, hospitality and events create a family-tourism and short-stay demand base." },
      { title: "Etihad Rail", detail: "Passenger rail plans support the long-term UAE-wide connectivity story and inter-emirate access." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Abu Dhabi Economic Vision 2030", href: "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/economy/abu-dhabi-economic-vision-2030" },
      { label: "Guggenheim Abu Dhabi", href: "https://guggenheimabudhabi.ae/" },
      { label: "Etihad Rail", href: "https://www.etihadrail.ae/" },
    ],
  },
  {
    slug: "sharjah",
    name: "Sharjah",
    descriptor: "Culture, education and family-led value",
    heroImage: "/insights/green-community.jpg",
    gallery: [
      { src: "/insights/green-community.jpg", alt: "Green family community in Sharjah" },
      { src: "/insights/abu-dhabi-community.jpg", alt: "Regional waterfront residential planning" },
      { src: "/insights/dubai-hills-residences.jpg", alt: "Family community planning reference" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
    ],
    thesis: "Sharjah's real estate role is not only affordability. It is an education, culture, family and industrial-services emirate that benefits from proximity to Dubai while retaining its own civic identity.",
    past: "Sharjah developed around trade, culture, museums, universities, ports and family neighbourhoods, creating a value alternative to Dubai with a distinct social and educational centre of gravity.",
    present: "The current market is led by master communities, sustainable neighbourhoods, mid-market apartments, family townhouses and locations that serve both Sharjah-based and cross-emirate workers.",
    future: "The opportunity is in planned communities that improve walkability, amenities, schools access and commute logic while keeping entry prices below comparable Dubai family districts.",
    marketRole: [
      "Family and value-led alternative for end users priced out of central Dubai.",
      "Education and culture provide non-speculative demand anchors.",
      "Growing master-community pipeline across Aljada, Al Mamsha and emerging residential corridors.",
    ],
    investmentLens: [
      "Prioritise commute friction, school access and completed amenities.",
      "Compare service charges and delivery quality because affordability alone is not a strategy.",
      "Look for communities where retail, parks and schools mature before competing supply peaks.",
    ],
    infrastructureSignals: [
      { title: "Education and culture", detail: "Universities, museums and civic assets create steady resident demand beyond investor cycles." },
      { title: "Family masterplans", detail: "New communities are competing on public realm, retail, walkability and school proximity." },
      { title: "Dubai adjacency", detail: "Value depends heavily on realistic commute routes and cross-emirate working patterns." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Invest in Sharjah", href: "https://investinsharjah.ae/" },
      { label: "Visit Sharjah", href: "https://www.visitsharjah.com/" },
    ],
  },
  {
    slug: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    descriptor: "Mountains, resorts and the northern waterfront growth story",
    heroImage: "/insights/rak-resort-residence.webp",
    gallery: [
      { src: "/insights/rak-resort-residence.webp", alt: "Ras Al Khaimah resort residence" },
      { src: "/insights/wynn-al-marjan-island.jpg", alt: "Wynn Al Marjan Island development" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
      { src: "/insights/green-community.jpg", alt: "Northern emirates community context" },
    ],
    thesis: "Ras Al Khaimah has moved from industrial, quarrying, ports and nature tourism into a globally watched resort-residential market led by Al Marjan Island and hospitality expansion.",
    past: "The emirate's base was practical and physical: mountains, ceramics, industry, ports, heritage and nature-led tourism rather than dense urban speculation.",
    present: "Today's investor attention is concentrated around branded hospitality, beachfront supply, serviced residences and resort-linked communities, especially where operating demand can be evidenced.",
    future: "The next phase depends on tourism execution, airport and transport accessibility, branded-hotel delivery and how quickly rental demand matures beyond launch excitement.",
    marketRole: [
      "UAE's highest-profile emerging resort-residential story.",
      "Lower entry points than prime Dubai waterfront with higher execution risk.",
      "Strong lifestyle appeal for beachfront, branded and hospitality-backed inventory.",
    ],
    investmentLens: [
      "Do not price RAK like Dubai; model occupancy, seasonality, service fees and exit depth separately.",
      "Favour projects with credible hospitality operators, beach access and clear handover phasing.",
      "Check whether demand is end-user, holiday-home, investor-resale or hotel-residence driven.",
    ],
    infrastructureSignals: [
      { title: "Al Marjan Island", detail: "The island is becoming the centre of the emirate's international resort-residential narrative." },
      { title: "Wynn resort catalyst", detail: "The integrated resort is a visibility catalyst, but each nearby project still needs project-level due diligence." },
      { title: "Nature tourism", detail: "Mountains, beaches and adventure tourism create a different demand profile from dense city living." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Visit Ras Al Khaimah", href: "https://visitrasalkhaimah.com/" },
      { label: "Wynn Al Marjan Island", href: "https://www.wynnalmarjanisland.com/" },
    ],
  },
  {
    slug: "ajman",
    name: "Ajman",
    descriptor: "Accessible coastal living and northern-emirates value",
    heroImage: "/insights/green-community.jpg",
    gallery: [
      { src: "/insights/green-community.jpg", alt: "Ajman value-led community context" },
      { src: "/insights/rak-resort-residence.webp", alt: "Northern emirates coastal development reference" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
      { src: "/insights/dubai-maritime-residences.webp", alt: "Waterfront residence context" },
    ],
    thesis: "Ajman is a compact, value-led emirate where affordability, coastal living, free-zone activity and access to Sharjah and Dubai shape the residential decision.",
    past: "Its growth has been tied to trade, port activity, local enterprise and residential affordability for households connected to the wider northern-emirates economy.",
    present: "The market is practical: entry pricing, rental affordability, commute tolerance, building quality and completed community services matter more than landmark storytelling.",
    future: "Ajman's upside sits in better connectivity, waterfront improvement, business formation and high-quality mid-market housing that serves genuine occupier demand.",
    marketRole: [
      "Affordable entry into UAE freehold and rental housing.",
      "Relevant for budget-led buyers, yield seekers and cross-emirate workers.",
      "Smaller PSR indexed supply base, so live availability checks are especially important.",
    ],
    investmentLens: [
      "Check building age, maintenance, parking, service charges and tenant depth.",
      "Use conservative resale assumptions because liquidity is thinner than Dubai.",
      "Prioritise completed infrastructure and realistic commute routes over headline price.",
    ],
    infrastructureSignals: [
      { title: "Compact urban footprint", detail: "Shorter local distances can work well for value-led residents when daily services are nearby." },
      { title: "Free-zone and SME base", detail: "Business formation supports rental demand, but price sensitivity remains high." },
      { title: "Northern-emirates corridor", detail: "Ajman is assessed with Sharjah, UAQ and Dubai commute patterns rather than as an isolated market." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Ajman Government", href: "https://www.ajman.ae/" },
      { label: "Ajman Free Zone", href: "https://www.afz.ae/" },
    ],
  },
  {
    slug: "fujairah",
    name: "Fujairah",
    descriptor: "East-coast logistics, mountains and selective resort demand",
    heroImage: "/insights/rak-resort-residence.webp",
    gallery: [
      { src: "/insights/rak-resort-residence.webp", alt: "East-coast resort residence context" },
      { src: "/insights/green-community.jpg", alt: "Low-density community context" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
      { src: "/about-jumeirah-burj-banner.webp", alt: "UAE skyline context" },
    ],
    thesis: "Fujairah is the UAE's east-coast counterweight: ports, logistics, mountains, beaches and selective hospitality rather than a mass off-plan residential market.",
    past: "The emirate's identity grew around the Hajar Mountains, Gulf of Oman coastline, trade routes and the strategic advantage of east-coast port access.",
    present: "Real estate demand is more selective than Dubai or Abu Dhabi, with hospitality, weekend homes, family housing and logistics-linked demand shaping the market.",
    future: "The opportunity is tied to connectivity, port economics, nature tourism and disciplined resort or residential delivery that fits the east-coast demand base.",
    marketRole: [
      "Specialised rather than broad off-plan market.",
      "Important for hospitality, nature, logistics and lifestyle-led briefs.",
      "Project-by-project diligence matters because comparable sales depth is limited.",
    ],
    investmentLens: [
      "Do not apply Dubai-style liquidity assumptions.",
      "Model end-user use, holiday demand and long-hold income separately.",
      "Check operator quality, transport access, views, beach access and maintenance structure.",
    ],
    infrastructureSignals: [
      { title: "East-coast port economy", detail: "Logistics and maritime activity are structural demand anchors for Fujairah." },
      { title: "Mountain and beach tourism", detail: "The lifestyle proposition is nature-led and weekend-oriented." },
      { title: "Selective supply", detail: "Lower catalogue depth requires deeper manual verification before reservation." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Port of Fujairah", href: "https://www.fujairahport.ae/" },
      { label: "Fujairah Government", href: "https://fujairah.ae/" },
    ],
  },
  {
    slug: "umm-al-quwain",
    name: "Umm Al Quwain",
    descriptor: "Blue-economy, mangroves and patient waterfront value",
    heroImage: "/insights/green-community.jpg",
    gallery: [
      { src: "/insights/green-community.jpg", alt: "Umm Al Quwain low-density waterfront context" },
      { src: "/insights/rak-resort-residence.webp", alt: "Northern emirates resort context" },
      { src: "/insights/etihad-rail-passenger-network.png", alt: "Etihad Rail passenger-service announcement event" },
      { src: "/insights/dubai-maritime-residences.webp", alt: "Waterfront residential context" },
    ],
    thesis: "Umm Al Quwain is a patient, lower-density waterfront market where mangroves, marine assets, value pricing and blue-economy planning matter more than fast turnover.",
    past: "The emirate's story is rooted in fishing, seafaring, mangroves, coastal settlement and a smaller urban scale than Dubai, Abu Dhabi or Sharjah.",
    present: "Current residential demand is value-led and lifestyle-led, with buyers focused on space, waterfront access, lower density and longer hold periods.",
    future: "The emirate's blue-economy and sustainability direction can make selected waterfront projects more relevant, but the market should be assessed with conservative liquidity assumptions.",
    marketRole: [
      "Low-density northern-emirates alternative for long-hold waterfront buyers.",
      "Smaller supply base with value pricing and lower transaction depth.",
      "Potential beneficiary of UAE-wide connectivity and nature-led tourism demand.",
    ],
    investmentLens: [
      "Prioritise waterfront quality, infrastructure delivery and actual occupancy demand.",
      "Use patient exit assumptions and verify comparable transactions carefully.",
      "Avoid relying only on low entry price; check service, access and community completion.",
    ],
    infrastructureSignals: [
      { title: "Blue-economy direction", detail: "Sustainability and marine assets are central to the emirate's long-term positioning." },
      { title: "Mangrove and coastal identity", detail: "Nature-led living differentiates UAQ from denser urban markets." },
      { title: "Inter-emirate connectivity", detail: "Future demand is linked to better regional access and realistic commute patterns." },
    ],
    sourceLinks: [
      ...nationalSources,
      { label: "Umm Al Quwain Government", href: "https://uaq.ae/" },
      { label: "Umm Al Quwain Sustainable Blue Economy Strategy 2031", href: "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/umm-al-quwain-sustainable-blue-economy-strategy-2031" },
    ],
  },
] satisfies EmirateProfile[];
