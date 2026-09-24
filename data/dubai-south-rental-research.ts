export type DubaiSouthEvidenceSource = {
  id: string;
  label: string;
  publisher: string;
  url: string;
  evidenceType: "official" | "listing-portal" | "psr-map";
  checkedAt: string;
};

export type DubaiSouthTenantSegment = {
  label: string;
  likelyUnitFit: string;
  rationale: string;
  evidenceBasis: string[];
  confidence: "high" | "medium";
};

export type DubaiSouthListingSignal = {
  market: string;
  observed: string;
  interpretation: string;
  sourceId: string;
};

export type DubaiSouthPriceBenchmark = {
  market: string;
  segment: string;
  value: number;
  display: string;
  period: string;
  evidenceBasis: string;
  sourceId: string;
  note: string;
};

export type DubaiSouthInvestorDemographicSignal = {
  scope: string;
  label: string;
  display: string;
  period: string;
  sourceId: string;
  note: string;
};

export const DUBAI_SOUTH_RESEARCH_DATE = "2026-09-06";

export const dubaiSouthEvidenceSources: DubaiSouthEvidenceSource[] = [
  {
    id: "dubai-south-residents",
    label: "South Square launch and Residential District operating context",
    publisher: "Dubai South",
    url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-launches-south-square-sells-out-first-tower-within-three-hours",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dubai-south-business",
    label: "Dubai South 2024 district operating results",
    publisher: "Dubai South",
    url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-concludes-a-successful-2024-across-its-different-districts",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "al-maktoum-airport",
    label: "Al Maktoum International Airport passenger-terminal programme",
    publisher: "Government of Dubai Media Office",
    url: "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dubai-exhibition-centre",
    label: "Dubai Exhibition Centre AED 10 billion expansion plan",
    publisher: "Government of Dubai Media Office",
    url: "https://www.mediaoffice.ae/en/news/2024/september/23-09/dubai-exhibition-centre",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "expo-city-businesses",
    label: "Expo City Dubai business directory",
    publisher: "Expo City Dubai",
    url: "https://www.expocitydubai.com/en/business-at-expo-city-dubai/business-directory/",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dubai-south-school",
    label: "GEMS Founders School Dubai South",
    publisher: "Dubai South",
    url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-signs-agreement-with-gems-education-to-operate-the-first-world-class-british-school-at-the-residential-district",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "property-finder-emaar-south",
    label: "Emaar South rental listings",
    publisher: "Property Finder UAE",
    url: "https://www.propertyfinder.ae/en/rent/dubai/properties-for-rent-dubai-south-dubai-world-central-emaar-south.html",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "property-finder-residential-district",
    label: "Dubai South Residential District rental listings",
    publisher: "Property Finder UAE",
    url: "https://www.propertyfinder.ae/en/rent/dubai/properties-for-rent-dubai-south-dubai-world-central-residential-district.html",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dubizzle-dubai-south",
    label: "Dubai South apartment rental listings",
    publisher: "Dubizzle",
    url: "https://dubai.dubizzle.com/en/property-for-rent/residential/apartmentflat/in/dubai-south/62267/",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "bayut-golf-views",
    label: "Golf Views rental listings and portal-reported DLD rental summary",
    publisher: "Bayut",
    url: "https://www.bayut.com/to-rent/apartments/dubai/dubai-south/emaar-south/golf-views/",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "bayut-mag-5",
    label: "MAG 5 Boulevard apartment rental listings",
    publisher: "Bayut",
    url: "https://www.bayut.com/to-rent/apartments/dubai/dubai-south/residential-district/mag-5-boulevard/",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "psr-map",
    label: "PSR UAE Portfolio Map and amenity index",
    publisher: "PSR Homes",
    url: "/map",
    evidenceType: "psr-map",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dld-investors-2025",
    label: "Dubai real-estate investor profile and 2025 participation",
    publisher: "Dubai Land Department via Government of Dubai Media Office",
    url: "https://www.mediaoffice.ae/en/news/2026/january/12-01/dubais-real-estate-market-records-new-historic-milestone",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dld-investors-q1-2026",
    label: "Dubai real-estate investor participation in Q1 2026",
    publisher: "Dubai Land Department via Government of Dubai Media Office",
    url: "https://www.mediaoffice.ae/en/news/2026/april/09-04/dubai-real-estate-transactions-surge-31-to-reach-aed252-billion-in-q1-2026",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "dld-annual-report-2024",
    label: "Dubai Land Department Annual Report 2024",
    publisher: "Dubai Land Department",
    url: "https://dubailand.gov.ae/media/c5ejvvoe/annual_report_2024_english.pdf",
    evidenceType: "official",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "property-finder-dubai-south-sale-index",
    label: "Dubai South apartment sale price and rental-yield indicators",
    publisher: "Property Finder UAE",
    url: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-14223908.html",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "property-finder-emaar-south-sale-index",
    label: "Emaar South apartment sale price and rental-yield indicators",
    publisher: "Property Finder UAE",
    url: "https://www.propertyfinder.ae/en/buy/dubai/apartments-for-sale-dubai-south-dubai-world-central-emaar-south.html",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "bayut-residential-district-sale-index",
    label: "Dubai South Residential District apartment price index",
    publisher: "Bayut",
    url: "https://www.bayut.com/property-market-analysis/index/sale/apartments/dubai/dubai-south/residential-district/",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
  {
    id: "property-finder-expo-city-sale-index",
    label: "Expo City apartment sale price indicator",
    publisher: "Property Finder UAE",
    url: "https://www.propertyfinder.ae/en/buy/dubai/apartments-for-sale-expo-city.html",
    evidenceType: "listing-portal",
    checkedAt: DUBAI_SOUTH_RESEARCH_DATE,
  },
];

export const dubaiSouthPriceBenchmarks: DubaiSouthPriceBenchmark[] = [
  {
    market: "Dubai South",
    segment: "Apartments",
    value: 1447,
    display: "AED 1,447 / sqft",
    period: "Latest 12 months displayed on 6 September 2026",
    evidenceBasis: "Property Finder listing-market indicator",
    sourceId: "property-finder-dubai-south-sale-index",
    note: "Portal indicator for the wider area; it is not an achieved-price valuation for a selected unit.",
  },
  {
    market: "Residential District",
    segment: "Apartments",
    value: 1305,
    display: "AED 1,305 / sqft",
    period: "August 2026 portal index",
    evidenceBasis: "Bayut sale-price index",
    sourceId: "bayut-residential-district-sale-index",
    note: "Portal-derived area benchmark; bedroom mix, building age and listing quality can change the comparison.",
  },
  {
    market: "Emaar South",
    segment: "Apartments",
    value: 1637,
    display: "AED 1,637 / sqft",
    period: "Latest 12 months displayed on 6 September 2026",
    evidenceBasis: "Property Finder listing-market indicator",
    sourceId: "property-finder-emaar-south-sale-index",
    note: "Area-wide portal indicator; exact building, view, floor, condition and completion status still require matching.",
  },
  {
    market: "Expo City",
    segment: "Apartments",
    value: 2114,
    display: "AED 2,114 / sqft",
    period: "Latest 12 months displayed on 6 September 2026",
    evidenceBasis: "Property Finder listing-market indicator",
    sourceId: "property-finder-expo-city-sale-index",
    note: "Expo City carries a visible portal price premium; it should not be used as the benchmark for core Residential District stock.",
  },
];

export const dubaiSouthInvestorDemographicSignals: DubaiSouthInvestorDemographicSignal[] = [
  {
    scope: "Dubai-wide",
    label: "Active investor base",
    display: "193,100 investors",
    period: "Full year 2025",
    sourceId: "dld-investors-2025",
    note: "Dubai-wide participation, not a Dubai South or project-level buyer count.",
  },
  {
    scope: "Dubai-wide",
    label: "New investors",
    display: "129,600",
    period: "Full year 2025",
    sourceId: "dld-investors-2025",
    note: "New-to-market investor count reported by DLD for Dubai as a whole.",
  },
  {
    scope: "Dubai-wide",
    label: "Resident investor share",
    display: "56.6%",
    period: "Full year 2025",
    sourceId: "dld-investors-2025",
    note: "Share of Dubai real-estate investors identified as residents; nationality and Dubai South allocation were not published.",
  },
  {
    scope: "Dubai-wide",
    label: "Women investor activity",
    display: "AED 154bn | 76,700 deals",
    period: "Full year 2025",
    sourceId: "dld-investors-2025",
    note: "Transaction activity, not a share of Dubai South buyers.",
  },
  {
    scope: "Dubai-wide",
    label: "Q1 investor participation",
    display: "48,448 investors | 29,312 new",
    period: "Q1 2026",
    sourceId: "dld-investors-q1-2026",
    note: "Recent Dubai-wide participation signal; it does not identify buyer age, income or occupation.",
  },
  {
    scope: "Dubai-wide capital origin",
    label: "Asia",
    display: "58.0% of investment value",
    period: "Full year 2024",
    sourceId: "dld-annual-report-2024",
    note: "PSR calculation from DLD's regional investment values; value share, not investor headcount or nationality.",
  },
  {
    scope: "Dubai-wide capital origin",
    label: "Europe",
    display: "25.5% of investment value",
    period: "Full year 2024",
    sourceId: "dld-annual-report-2024",
    note: "PSR calculation from DLD's regional investment values; value share, not investor headcount or nationality.",
  },
  {
    scope: "Dubai-wide capital origin",
    label: "Other regions",
    display: "16.5% of investment value",
    period: "Full year 2024",
    sourceId: "dld-annual-report-2024",
    note: "North America, Africa, Oceania, South America and Central America combined; value share, not investor headcount.",
  },
];

export const dubaiSouthTenantSegments: DubaiSouthTenantSegment[] = [
  {
    label: "Aviation, aerospace and airport-services professionals",
    likelyUnitFit: "Studios and 1BRs for individuals or couples; 2BRs for established households",
    rationale: "Al Maktoum International Airport, the Aviation District and Mohammed Bin Rashid Aerospace Hub create a location-specific employment base. The long-term airport programme can broaden that base, but future jobs must not be treated as current tenants.",
    evidenceBasis: ["al-maktoum-airport", "dubai-south-business"],
    confidence: "high",
  },
  {
    label: "Logistics, freight, e-commerce and trade employees",
    likelyUnitFit: "Value-led studios and 1BRs; shared or family 2BRs where employer access is practical",
    rationale: "Dubai South's operating logistics ecosystem includes freight, distribution and e-commerce activity, with FedEx, dnata and healthcare-logistics facilities cited in the master developer's operating update.",
    evidenceBasis: ["dubai-south-business"],
    confidence: "high",
  },
  {
    label: "Expo City, exhibitions and event-economy professionals",
    likelyUnitFit: "Furnished studios and 1BRs for mobile professionals; 2BRs for longer assignments",
    rationale: "Expo City has an operating business and visitor ecosystem. Dubai Exhibition Centre's phased expansion can increase recurring event and business demand as capacity is delivered.",
    evidenceBasis: ["expo-city-businesses", "dubai-exhibition-centre"],
    confidence: "high",
  },
  {
    label: "SME founders, consultants and business-park employees",
    likelyUnitFit: "Studios and 1BRs, with selected 2BR demand from founder families",
    rationale: "Dubai South reported 4,044 operating companies after adding 415 in 2024, while Business Park office leasing reached 500,000 sqft. These figures support a professional-occupier pool but do not reveal its residential tenure mix.",
    evidenceBasis: ["dubai-south-business"],
    confidence: "medium",
  },
  {
    label: "Families anchored by schools and daily-life services",
    likelyUnitFit: "Larger 1BRs, 2BRs and 3BRs with storage, parking and child-oriented amenities",
    rationale: "The Residential District reports more than 30,000 residents, operating parks, sports courts, retail, a hypermarket and GEMS Founders School. Family demand is an evidence-based inference, not a measured tenant-demographic share.",
    evidenceBasis: ["dubai-south-residents", "dubai-south-school"],
    confidence: "high",
  },
  {
    label: "Value-conscious commuters and frequent travellers",
    likelyUnitFit: "Efficient studios and 1BRs near road, bus or Expo Metro connections",
    rationale: "The Residential District has a public-bus connection to Expo Metro and the corridor is positioned for airport and road access. Suitability depends on the exact building, shift pattern and verified peak-hour drive time.",
    evidenceBasis: ["dubai-south-residents", "al-maktoum-airport"],
    confidence: "medium",
  },
];

export const dubaiSouthListingSignals: DubaiSouthListingSignal[] = [
  {
    market: "Emaar South",
    observed: "Property Finder displayed 780 rental listings; Bayut displayed 650 properties.",
    interpretation: "A broad active rental market is visible, but portal counts can include duplicates, multiple property types and stale advertisements.",
    sourceId: "property-finder-emaar-south",
  },
  {
    market: "Residential District",
    observed: "Property Finder displayed 594 rental listings; Dubizzle displayed 1,143 Dubai South apartment advertisements.",
    interpretation: "Use the portals to source fresh comparables, never as a count of unique occupied or available homes.",
    sourceId: "property-finder-residential-district",
  },
  {
    market: "Golf Views",
    observed: "Bayut displayed 45 apartment listings, an asking range of AED 54,999-125,000 yearly and an average asking rent of AED 85,780. Its DLD-derived section reported 93 new apartment contracts and AED 77,376 average rent over the latest 12 months.",
    interpretation: "This is the strongest ready-building rental reference in the shortlist, but unit type, furnishing, size, condition and contract date still require matching.",
    sourceId: "bayut-golf-views",
  },
  {
    market: "MAG 5 Boulevard",
    observed: "Bayut displayed an asking range of AED 34,000-85,000 yearly and average asking rents of AED 41,822 for studios, AED 56,109 for 1BRs and AED 72,228 for 2BRs.",
    interpretation: "Treat these as volatile asking-price signals; underwriting should replace them with same-building registered or executed leases.",
    sourceId: "bayut-mag-5",
  },
];

export const dubaiSouthDemandDrivers = [
  "The Residential District reports more than 30,000 residents and an operating base of parks, sports courts, retail, a 50,000 sqft hypermarket, a mosque, a petrol station, GEMS Founders School and bus access to Expo Metro.",
  "Dubai South reported 4,044 operating companies after adding 415 in 2024; Business Park office leasing reached 500,000 sqft, three times the 2023 figure.",
  "The AED 128 billion Al Maktoum passenger-terminal programme targets ultimate capacity of 260 million passengers, 400 gates and five parallel runways; that is a phased future catalyst, not today's throughput.",
  "Dubai Exhibition Centre's AED 10 billion expansion targets 180,000 sqm by 2031 and a larger recurring business-events calendar as each phase opens.",
];

export const dubaiSouthResearchLimitations = [
  "No official public dataset identifies the nationality, household income, occupation or bedroom preference of Dubai South tenants at building level.",
  "No official public dataset located identifies Dubai South or selected-project investors by nationality, age, income or occupation. Dubai-wide investor statistics are context only.",
  "Tenant segments are reasoned demand hypotheses from operating employers, schools, transport and listing evidence; they are not measured demographic shares.",
  "Property Finder, Dubizzle and Bayut counts and asking rents are volatile listing evidence, may contain duplicates and do not prove a unit is still available.",
  "PSR map distances are straight-line calculations from stored coordinates, not driving distances. Approximate or community-centroid coordinates must be verified before client use.",
  "Off-plan rental income begins only after actual completion, handover, furnishing and leasing; today's ready-building rents are planning comparables, not guaranteed future rents.",
];
