import { SG26_INVITATION_ACTION, SG26_INVITATION_NOTE, SG26_REGISTRATION_HREF, SG26_SESSIONS, formatSingaporeSession } from "@/lib/sg26";

export const WORLD_TOUR_PAGE_COUNT = 32;
export const WORLD_TOUR_PATH = "/events/roadshow/world-tour";
export const WORLD_TOUR_DOWNLOAD_PATH = "/events/roadshow/world-tour/download";
export const RESEARCH_MASTER_PATH = "/events/roadshow/brochure";
export const RESEARCH_MASTER_LABEL = "94-page research master";

export type FigureKind = "observed" | "asking" | "statutory" | "announced" | "forecast";
export type ImageKind = "Photograph" | "Rendering" | "Official image";

export type EditionFigure = {
  id: string;
  label: string;
  value: string;
  geography: string;
  period: string;
  unit: string;
  source: string;
  sourceUrl: string;
  kind: FigureKind;
  note: string;
};

export type EditionImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: ImageKind;
  caption: string;
};

export type PropertyExample = {
  name: string;
  developer: string;
  location: string;
  price: string;
  priceKind: "Published starting reference";
  handover: string;
  status: string;
  href: string;
  source: string;
  sourceUrl: string;
  reviewed: string;
};

export type PlaceMark = {
  name: string;
  role: string;
  status: string;
};

const knightFrankSpace: EditionFigure[] = [
  {
    id: "prime-space-dubai-2025",
    label: "Prime space in Dubai",
    value: "62.2 square metres",
    geography: "Dubai prime residential",
    period: "Q4 2025",
    unit: "Square metres of prime residential space per US$1 million",
    source: "Knight Frank, The Wealth Report 2026, PIRI price tracker",
    sourceUrl: "https://research.knightfrank.co.th/wealth-report/the-wealth-report-2026.pdf",
    kind: "observed",
    note: "Same method as the Singapore figure. This is prime space, not a typical apartment, and not a forecast.",
  },
  {
    id: "prime-space-singapore-2025",
    label: "Prime space in Singapore",
    value: "28.1 square metres",
    geography: "Singapore prime residential",
    period: "Q4 2025",
    unit: "Square metres of prime residential space per US$1 million",
    source: "Knight Frank, The Wealth Report 2026, PIRI price tracker",
    sourceUrl: "https://research.knightfrank.co.th/wealth-report/the-wealth-report-2026.pdf",
    kind: "observed",
    note: "Same method and period as the Dubai figure.",
  },
  {
    id: "prime-space-dubai-2020",
    label: "Dubai five years earlier",
    value: "182.8 square metres",
    geography: "Dubai prime residential",
    period: "Q4 2020",
    unit: "Square metres of prime residential space per US$1 million",
    source: "Knight Frank, The Wealth Report 2026, PIRI price tracker",
    sourceUrl: "https://research.knightfrank.co.th/wealth-report/the-wealth-report-2026.pdf",
    kind: "observed",
    note: "Shown so the later snapshot is not read on its own. Prime space per dollar in Dubai narrowed sharply over these five years.",
  },
  {
    id: "prime-space-singapore-2020",
    label: "Singapore five years earlier",
    value: "36.2 square metres",
    geography: "Singapore prime residential",
    period: "Q4 2020",
    unit: "Square metres of prime residential space per US$1 million",
    source: "Knight Frank, The Wealth Report 2026, PIRI price tracker",
    sourceUrl: "https://research.knightfrank.co.th/wealth-report/the-wealth-report-2026.pdf",
    kind: "observed",
    note: "Same method and period as the Dubai 2020 figure.",
  },
];

const acquisitionFigures: EditionFigure[] = [
  {
    id: "absd-citizen-first",
    label: "Singapore citizen, first residential property",
    value: "0% ABSD",
    geography: "Singapore residential property",
    period: "Rates in force from 27 April 2023",
    unit: "ABSD on the higher of price or market value",
    source: "Inland Revenue Authority of Singapore, Additional Buyer’s Stamp Duty",
    sourceUrl: "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer%27s-stamp-duty-(absd)",
    kind: "statutory",
    note: "Buyer’s Stamp Duty is extra and tiered. A second home is 20% ABSD. A third or later is 30%.",
  },
  {
    id: "absd-pr-first",
    label: "Singapore permanent resident, first residential property",
    value: "5% ABSD",
    geography: "Singapore residential property",
    period: "Rates in force from 27 April 2023",
    unit: "ABSD on the higher of price or market value",
    source: "Inland Revenue Authority of Singapore, Additional Buyer’s Stamp Duty",
    sourceUrl: "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer%27s-stamp-duty-(absd)",
    kind: "statutory",
    note: "A second home is 30% ABSD. A third or later is 35%.",
  },
  {
    id: "absd-foreigner",
    label: "Foreigner who is not a citizen or permanent resident",
    value: "60% ABSD",
    geography: "Singapore residential property",
    period: "Rates in force from 27 April 2023",
    unit: "ABSD on any residential purchase",
    source: "Inland Revenue Authority of Singapore, Additional Buyer’s Stamp Duty",
    sourceUrl: "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer%27s-stamp-duty-(absd)",
    kind: "statutory",
    note: "Not a Singapore citizen’s rate. Some nationalities differ under a free trade agreement and have to be checked.",
  },
  {
    id: "dld-registration",
    label: "Dubai sale registration",
    value: "4% of the sale contract value",
    geography: "Dubai real property sale",
    period: "Executive Council Resolution No. (30) of 2013",
    unit: "Fee on the sale contract value",
    source: "Dubai Executive Council Resolution No. (30) of 2013, Land Department fee schedule",
    sourceUrl: "https://dlp.dubai.gov.ae/Legislation%20Reference/2013/ECR%2030%20of%202013.html",
    kind: "statutory",
    note: "Who pays is a contract question. Trustee and agency costs are separate. This is not an ABSD-style surcharge.",
  },
];

const southDubaiFigures: EditionFigure[] = [
  {
    id: "residential-district-residents",
    label: "Residential District residents",
    value: "More than 30,000",
    geography: "Dubai South Residential District",
    period: "Operator report, reviewed by PSR on 6 September 2026",
    unit: "Residents, as reported by Dubai South",
    source: "Dubai South newsroom, South Square announcement",
    sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-launches-south-square-sells-out-first-tower-within-three-hours",
    kind: "observed",
    note: "An operator-reported resident count. It is not a census extract and it does not say who those residents are.",
  },
  {
    id: "airport-programme",
    label: "Passenger-terminal programme",
    value: "AED 128 billion",
    geography: "Al Maktoum International Airport, Dubai",
    period: "Announced 28 April 2024",
    unit: "Announced investment in the passenger-terminal programme",
    source: "Government of Dubai Media Office",
    sourceUrl: "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport",
    kind: "announced",
    note: "An announced programme cost. It is not observed spending to date, and it is not current passenger throughput.",
  },
  {
    id: "airport-capacity-target",
    label: "Ultimate capacity target",
    value: "260 million passengers",
    geography: "Al Maktoum International Airport, Dubai",
    period: "Announced 28 April 2024",
    unit: "Ultimate passenger-capacity target",
    source: "Government of Dubai Media Office",
    sourceUrl: "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport",
    kind: "forecast",
    note: "A target for a phased programme. It is not a current traffic result.",
  },
];

export const worldTourEdition = {
  title: "The UAE",
  deck: "A more connected tomorrow.",
  editionLine: "PSR World Tour · Singapore 2026",
  pageCount: WORLD_TOUR_PAGE_COUNT,
  invitationAction: SG26_INVITATION_ACTION,
  invitationNote: SG26_INVITATION_NOTE,
  registrationHref: SG26_REGISTRATION_HREF,
  researchMasterHref: RESEARCH_MASTER_PATH,
  researchMasterLabel: RESEARCH_MASTER_LABEL,
  sessions: SG26_SESSIONS.map(formatSingaporeSession),
  coverImage: {
    src: "/about-jumeirah-burj-banner.webp",
    alt: "Burj Al Arab and the Jumeirah shoreline in late daylight",
    width: 1915,
    height: 821,
    kind: "Photograph",
    caption: "Photograph · Jumeirah shoreline, Dubai",
  } satisfies EditionImage,
  southDubaiImage: {
    src: "/presentations/dubai-south-investor-brief/cover/wasl-dome.webp",
    alt: "Al Wasl Plaza dome at Expo City Dubai",
    width: 1440,
    height: 900,
    kind: "Photograph",
    caption: "Photograph · Al Wasl Plaza, Expo City Dubai. The operating plaza, not the airport programme.",
  } satisfies EditionImage,
  comparison: {
    section: "A Singapore investor’s perspective",
    spaceFolio: "07",
    termsFolio: "08",
    spaceHeadline: "How far the same million dollars goes",
    spaceLede: "This page is written for a reader in Singapore. The figures use one Knight Frank method. They compare prime space, not an average home, and they keep an earlier reading beside the latest one.",
    spaceFigures: knightFrankSpace,
    termsHeadline: "Cost depends on who is buying",
    termsLede: "A Singapore citizen’s first home is not the same case as a foreign buyer. A gross yield is not printed: no single primary source paired the two cities on a net-income basis.",
    acquisitionFigures,
    ownership: [
      "In designated areas of Dubai, a non-UAE national can register freehold. That does not cover every plot. The title document is the check.",
      "In Singapore, access depends on citizenship and the property type. Private condominiums, public housing and mainland landed property are not the same permission.",
    ],
    income: "A gross yield is not net income. Service charges, vacancy, furnishing and management still have to be checked for the unit. No yield figure is printed here.",
    diversification: "The dirham is pegged to the US dollar, and the two cities sit in different cycles. Holding both can reduce concentration. It does not remove currency, regulatory or asset risk.",
  },
  southDubai: {
    section: "South Dubai",
    storyFolio: "09",
    mapFolio: "10",
    storyHeadline: "The airport, Expo City and the district between them",
    storyLede: "These places belong to one corridor. They are not interchangeable photographs. Expo City is already operating. The larger passenger terminal is still a programme.",
    organisation: "Expo City Dubai operates the district. The passenger-terminal programme was announced by the Government of Dubai.",
    location: "Dubai South and Expo City, south of central Dubai",
    changing: "Expo City grew out of the Expo 2020 site and now combines homes, offices, events and a Metro terminus. Dubai has separately announced a passenger-terminal programme at Al Maktoum International Airport.",
    matters: "An operating district can support jobs, visitors and residents now. A larger airport could widen that later, if the phases are delivered. Announced airport jobs are not current tenants.",
    figures: southDubaiFigures,
    mapHeadline: "Where an effect could concentrate",
    mapLede: "The useful question is which community, not a circle drawn around a landmark. This drawing is district orientation. It is not a surveyed plot map, and proximity is only the start of the check.",
    places: [
      { name: "Expo City Dubai", role: "Homes, offices, events and a Metro terminus", status: "Operating district" },
      { name: "Dubai South Residential District", role: "Established residential community in the corridor", status: "Operating, operator-reported" },
      { name: "Emaar South", role: "Master community in the same southern corridor", status: "Separate community, not Expo City" },
      { name: "Al Maktoum International Airport", role: "Existing airport, with a larger passenger terminal announced", status: "Airport operating; expansion announced" },
    ] satisfies PlaceMark[],
    examples: [
      {
        name: "Expo Valley Views",
        developer: "Expo City Dubai",
        location: "Expo Valley, Expo City Dubai",
        price: "From about AED 1.67 million for a one-bedroom",
        priceKind: "Published starting reference",
        handover: "31 October 2029 published target",
        status: "Current release. The date is a target, not a completed building.",
        href: "/projects/expo-valley-views-expo-city-dubai",
        source: "Expo City Dubai official project page; PSR catalogue reviewed 6 September 2026",
        sourceUrl: "https://www.expocitydubai.com/en/expo-living/expo-valley/expo-valley-views/",
        reviewed: "6 September 2026",
      },
      {
        name: "AVENEW 888",
        developer: "AVENEW Development",
        location: "Dubai South Residential District",
        price: "From about AED 1.45 million",
        priceKind: "Published starting reference",
        handover: "Q1 2028 published target",
        status: "Phase 2 was selling at review. Live stock still has to be confirmed.",
        href: "/projects/avenew-888-apartments-dubai-south",
        source: "AVENEW Development official project page",
        sourceUrl: "https://avenewdevelopment.ae/projects/avenew-888",
        reviewed: "6 September 2026",
      },
      {
        name: "Windsor House II",
        developer: "Ellington Properties",
        location: "Dubai South Residential District",
        price: "From about AED 1.20 million for a one-bedroom",
        priceKind: "Published starting reference",
        handover: "Marketed Q3 2028; a filed reference may run to July 2029",
        status: "Off-plan. The two completion dates conflict and must be reconciled.",
        href: "/projects/windsor-house-ii-ellington-dubai-south",
        source: "Ellington Properties official project page",
        sourceUrl: "https://ellingtonproperties.ae/en/property-for-sale/windsor-house-ii-dubai-south",
        reviewed: "6 September 2026",
      },
    ] satisfies PropertyExample[],
    weaken: [
      "The terminal programme and its passenger target are announced. They are not current traffic, and they are not a promise of rent or price growth.",
      "Dubai South already has competing apartment supply. A district name does not protect one unit from the building next to it.",
      "The prices here are published starting references. They are not recorded transactions, and the available unit can differ.",
      "Windsor House II has two completion references. Delivery uncertainty is part of the case, not a footnote to ignore.",
    ],
  },
};

export function editionFigures(): EditionFigure[] {
  return [
    ...worldTourEdition.comparison.spaceFigures,
    ...worldTourEdition.comparison.acquisitionFigures,
    ...worldTourEdition.southDubai.figures,
  ];
}

export type PdfSheet = {
  folio: string;
  section: string;
  title: string;
  lines: string[];
};

export function worldTourPdfSheets(): PdfSheet[] {
  const edition = worldTourEdition;
  return [
    {
      folio: "01",
      section: "Cover",
      title: edition.title,
      lines: [
        edition.deck,
        edition.editionLine,
        ...edition.sessions,
        edition.coverImage.caption,
        edition.invitationAction,
        edition.invitationNote,
      ],
    },
    {
      folio: edition.comparison.spaceFolio,
      section: edition.comparison.section,
      title: edition.comparison.spaceHeadline,
      lines: [
        edition.comparison.spaceLede,
        ...edition.comparison.spaceFigures.flatMap((figure) => [
          `${figure.label}: ${figure.value}`,
          `${figure.geography}. ${figure.period}. ${figure.unit}. ${figure.kind}.`,
          `${figure.source}. ${figure.note}`,
        ]),
      ],
    },
    {
      folio: edition.comparison.termsFolio,
      section: edition.comparison.section,
      title: edition.comparison.termsHeadline,
      lines: [
        edition.comparison.termsLede,
        ...edition.comparison.acquisitionFigures.flatMap((figure) => [
          `${figure.label}: ${figure.value}`,
          `${figure.geography}. ${figure.period}. ${figure.unit}. ${figure.kind}.`,
          `${figure.source}. ${figure.note}`,
        ]),
        ...edition.comparison.ownership,
        edition.comparison.income,
        edition.comparison.diversification,
      ],
    },
    {
      folio: edition.southDubai.storyFolio,
      section: edition.southDubai.section,
      title: edition.southDubai.storyHeadline,
      lines: [
        edition.southDubai.storyLede,
        edition.southDubai.location,
        edition.southDubai.organisation,
        edition.southDubai.changing,
        edition.southDubai.matters,
        edition.southDubaiImage.caption,
        ...edition.southDubai.figures.flatMap((figure) => [
          `${figure.label}: ${figure.value}`,
          `${figure.geography}. ${figure.period}. ${figure.unit}. ${figure.kind}.`,
          `${figure.source}. ${figure.note}`,
        ]),
      ],
    },
    {
      folio: edition.southDubai.mapFolio,
      section: edition.southDubai.section,
      title: edition.southDubai.mapHeadline,
      lines: [
        edition.southDubai.mapLede,
        ...edition.southDubai.places.map((place) => `${place.name}. ${place.role}. ${place.status}.`),
        ...edition.southDubai.examples.flatMap((example) => [
          `${example.name}, ${example.developer}, ${example.location}`,
          `${example.priceKind}: ${example.price}. ${example.handover}. ${example.status}`,
          `${example.source}. Reviewed ${example.reviewed}.`,
        ]),
        ...edition.southDubai.weaken,
        `Fuller comparisons remain in the ${edition.researchMasterLabel}.`,
      ],
    },
  ];
}
