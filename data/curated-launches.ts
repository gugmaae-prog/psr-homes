import { additionalCuratedLaunches } from "@/data/additional-curated-launches";
import { dubaiSouthCuratedLaunches } from "@/data/dubai-south-curated-launches";
import { recentCuratedLaunches } from "@/data/recent-curated-launches";
import { verifiedCuratedLaunches } from "@/data/verified-curated-launches";
import { septemberCuratedLaunches } from "@/data/september-curated-launches";

export type LaunchUnit = {
  residence: string;
  startingPrice: string;
  eoi?: string;
  size?: string;
};

export type LaunchPayment = { stage: string; due: string; percentage: number };
export type LaunchDetail = { title: string; items: string[] };

export type CuratedLaunch = {
  slug: string;
  name: string;
  developer: string;
  developerDisplay: string;
  emirate: string;
  area: string;
  startingPrice: string;
  startingPriceLabel?: string;
  pricePerSqft?: number;
  paymentPlan: string;
  handover: string;
  image: string;
  brochure: string;
  bedrooms: string[];
  propertyTypes: string[];
  lifestyles: string[];
  coordinates: string;
  description: string;
  archived: boolean;
  sourceUpdatedAt: string;
  areaFrom?: string;
  statusLabel: string;
  releaseNote: string;
  unitPricing: LaunchUnit[];
  paymentSchedule?: LaunchPayment[];
  launchDetails?: LaunchDetail[];
  overview: string[];
  gallery: string[];
  interiors: string[];
  exteriors: string[];
  floorplans: string[];
  amenities: string[];
  investmentPoints: string[];
  travelTimes: { minutes: string; destination: string }[];
  sourceUrl: string;
  sourceLabel: string;
};

const AL_YALAYIS_MEDIA = [
  "/projects/al-yalayis/hero.webp",
  "/projects/al-yalayis/villa-portrait.webp",
  "/projects/al-yalayis/villa-vertical.webp",
];
const LINAR_MEDIA = "https://new-projects-media.propertyfinder.com/project/db8e847b-cc0c-4f2d-a981-593df806b2db";
const IMTIAZ_MEDIA = "https://new-projects-media.propertyfinder.com/project/eb66b831-979c-40fd-8021-5b7ba194b367";
const RESIDENCES_113_EXTERIORS = [
  "https://cdn.opr.ae/upload/photo/1137.jpg",
  "https://img3.creatium.ru/disk2/f8/82/da/8258f78b7588f7423e6b1d555d0c9fef16/23.jpg",
  "https://img3.creatium.ru/disk2/fb/80/4d/39d7769aae7f082d0292ac63be54221ba9/26.jpg",
  "https://img3.creatium.ru/disk2/74/5d/59/3a80ef4a4757da9167ad2415607eca17d1/27.jpg",
  "https://img3.creatium.ru/disk2/c0/a5/f3/ba87be4cd06e1e02a5791cad5f08fec955/29.jpg",
  "https://img3.creatium.ru/disk2/9f/3c/46/9c186a78395a233810fe091eff9dc0f433/28.jpg",
  "https://img3.creatium.ru/disk2/d2/15/ce/5a6b5ef6e8ca6b01dbbe9cc11933515c72/10.jpg",
  "https://img3.creatium.ru/disk2/fd/df/53/5068d263bf8a1e7f2dab8b893ae53e2247/24.jpg",
];
const RESIDENCES_113_INTERIORS = [
  "https://img3.creatium.ru/disk2/96/db/cd/024acc973cac543d5c4281cbad04ca519d/34.jpg",
  "https://img3.creatium.ru/disk2/44/84/73/889cf1dcaa9e382d9ef9f63c29a3a9ef3f/33.jpg",
  "https://img3.creatium.ru/disk2/72/e4/8b/923399bc1beffc436694f0d26b60735396/31.jpg",
  "https://img3.creatium.ru/disk2/e6/ba/9c/5d30d9b61ee751ac371f8db61c5a993b39/9.jpg",
  "https://img3.creatium.ru/disk2/80/2e/f5/6323870c4f4ccb494a5726166f67e23610/12.jpg",
  "https://img3.creatium.ru/disk2/57/9c/31/22c8f37b50a6093ac11ec201e5a5d9e9b4/14.jpg",
  "https://img3.creatium.ru/disk2/9b/52/04/7027e561f30c3db5f024da489b87b8e9c8/15.jpg",
  "https://img3.creatium.ru/disk2/fd/7f/d9/202745155692e463e26e3fe001dc6e2587/16.jpg",
  "https://img3.creatium.ru/disk2/74/10/14/0dfc18b18bed389aecc8f326de4487efca/17.jpg",
  "https://img3.creatium.ru/disk2/ca/f4/e1/1aeb2849c13045b487d1ddaf33e18e4179/19.jpg",
  "https://img3.creatium.ru/disk2/4e/12/96/2ec3325ddc597a6421ba581fcf66f728b5/20.jpg",
  "https://img3.creatium.ru/disk2/9d/d0/52/2bdb7971c3736783c07cfd1fad89c0b57f/32.jpg",
];
const RESIDENCES_113_FLOORPLANS = [
  "https://img3.creatium.ru/disk2/2b/42/a3/1b7e0d81966b281520d2705d2c3aa18cc3/1b_773_sqft.jpg",
  "https://img3.creatium.ru/disk2/c2/1b/55/c573f9e87cc752c5d96aacf9b153929370/2b_1121.jpg",
  "https://img3.creatium.ru/disk2/59/e0/67/d71d8b02da21f5645d02a032fd3e875436/3b_1786.jpg",
  "https://img3.creatium.ru/disk2/9f/ec/37/59fe874a2c72049f7a471f918b25cebc68/4b_duplex_2532.jpg",
];

export const curatedLaunches: CuratedLaunch[] = [
  ...septemberCuratedLaunches,
  ...dubaiSouthCuratedLaunches,
  ...verifiedCuratedLaunches,
  ...additionalCuratedLaunches,
  ...recentCuratedLaunches,
  {
    slug: "113-residences-iman-developers-al-sufouh-dubai",
    name: "113 Residences",
    developer: "Iman Developers",
    developerDisplay: "IMAN Developers",
    emirate: "Dubai",
    area: "Al Sufouh, Dubai",
    startingPrice: "1800000",
    pricePerSqft: 2612,
    paymentPlan: "20/30/50",
    handover: "Q2 2029",
    image: RESIDENCES_113_EXTERIORS[0],
    brochure: "",
    bedrooms: ["1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom duplex"],
    propertyTypes: ["Apartments", "Duplexes"],
    lifestyles: ["Coastal living", "Boutique residences", "Investment"],
    coordinates: "",
    description: "113 Residences is a boutique collection by IMAN Developers in Al Sufouh, bringing 1–3 bedroom apartments and four-bedroom duplexes with private plunge pools to one of Dubai’s most established coastal districts.",
    archived: false,
    sourceUpdatedAt: "2026-07-31T00:00:00.000Z",
    areaFrom: "689–3,250 sq ft",
    statusLabel: "New launch",
    releaseNote: "Commercial information last checked 31 July 2026. The displayed schedule comprises 20% on booking, 30% during construction and 50% on handover. Live inventory, final areas, incentives and reservation documents require developer confirmation.",
    unitPricing: [
      { residence: "1 Bedroom", startingPrice: "From AED 1,800,000", size: "689–915 sq ft" },
      { residence: "2 Bedroom", startingPrice: "From AED 2,560,000", size: "1,031–1,369 sq ft" },
      { residence: "3 Bedroom", startingPrice: "From AED 3,650,000", size: "1,588–2,059 sq ft" },
      { residence: "4 Bedroom duplex", startingPrice: "From AED 5,440,000", size: "2,509–3,250 sq ft" },
    ],
    overview: [
      "The B+G+9 development is limited to 113 homes. Floor-to-ceiling glazing, layered terraces and Versace Ceramics surfaces shape the residential specification, while selected four-bedroom duplexes include private plunge pools.",
      "Al Sufouh places the development between Palm Jumeirah, Dubai Marina and Madinat Jumeirah, with rapid access to Sheikh Zayed Road, Dubai Media City and Dubai Internet City. The boutique supply and established coastal setting support both premium end-user and long-hold investment briefs.",
    ],
    gallery: [...RESIDENCES_113_EXTERIORS, ...RESIDENCES_113_INTERIORS],
    interiors: RESIDENCES_113_INTERIORS,
    exteriors: RESIDENCES_113_EXTERIORS,
    floorplans: RESIDENCES_113_FLOORPLANS,
    amenities: [
      "Rooftop infinity pool",
      "Leisure pool and children’s pool",
      "Fitness centre by Technogym",
      "Sauna and steam room",
      "Yoga zone and zen garden",
      "Residents’ clubhouse",
      "Indoor and outdoor children’s areas",
      "Rooftop dining and barbecue area",
    ],
    investmentPoints: [
      "A limited collection of 113 homes in an established low-density coastal district.",
      "Bedroom-level entry prices and published size ranges allow the acquisition case to be compared by configuration.",
      "Al Sufouh combines proximity to the beach with direct access to Dubai’s principal employment and lifestyle corridors.",
      "The construction-linked schedule retains 50% of the purchase price for handover, subject to the final developer documents.",
    ],
    travelTimes: [
      { minutes: "1", destination: "Sheikh Zayed Road" },
      { minutes: "3", destination: "Al Sufouh Beach" },
      { minutes: "8", destination: "Palm Jumeirah" },
      { minutes: "10", destination: "Dubai Marina" },
      { minutes: "10", destination: "Mall of the Emirates" },
      { minutes: "18", destination: "Downtown Dubai" },
    ],
    sourceUrl: "https://www.imandevelopers.com/iman-properties/113-residences",
    sourceLabel: "IMAN Developers project information",
  },
  {
    slug: "ellington-villa-townhouse-community-al-yalayis-dubai",
    name: "Upcoming Ellington Community — Al Yalayis 1",
    developer: "Ellington Properties",
    developerDisplay: "Ellington Properties",
    emirate: "Dubai",
    area: "Al Yalayis 1, Dubai",
    startingPrice: "0",
    startingPriceLabel: "Price on request",
    paymentPlan: "To be confirmed",
    handover: "To be confirmed",
    image: AL_YALAYIS_MEDIA[0],
    brochure: "",
    bedrooms: ["Configurations to be announced"],
    propertyTypes: ["Apartments", "Townhouses", "Villas"],
    lifestyles: ["Family living", "Master community", "Pre-launch tracking"],
    coordinates: "",
    description: "PSR Homes is tracking a reported Ellington master-community opportunity in Al Yalayis 1. Market guidance points to apartments, townhouses and standalone villas, but Ellington has not yet published the final project name, inventory or commercial terms in its official property catalogue.",
    archived: false,
    sourceUpdatedAt: "2026-08-26T00:00:00.000Z",
    areaFrom: "To be announced",
    statusLabel: "Pre-launch tracking",
    releaseNote: "Verified 26 August 2026. Ellington does not yet list an Al Yalayis project in its official property catalogue, and no Ellington project was identified in DLD’s current Al Yelayiss 1 register. The final name, masterplan, inventory, pricing, payment schedule, amenities and completion dates remain unconfirmed. All page visuals are PSR-owned indicative concepts, not developer renders.",
    unitPricing: [
      { residence: "Apartment collection", startingPrice: "Awaiting official price list", size: "Configuration to be announced" },
      { residence: "Townhouse collection", startingPrice: "Awaiting official price list", size: "Configuration to be announced" },
      { residence: "Villa collection", startingPrice: "Awaiting official price list", size: "Configuration to be announced" },
    ],
    overview: [
      "Current market guidance describes a mixed residential master community in Al Yalayis 1 with apartments, townhouses and standalone villas. Those typologies remain indicative until Ellington releases official launch documentation, floor plans and a surveyed masterplan.",
      "PSR has removed the previously displayed AED 2.5 million entry price, AED 1,600 per square foot estimate, 70/30 payment structure and 2030–2031 schedule because none is currently confirmed in Ellington’s official catalogue or the public DLD project register.",
    ],
    gallery: AL_YALAYIS_MEDIA,
    interiors: [],
    exteriors: AL_YALAYIS_MEDIA,
    floorplans: [],
    amenities: ["Official amenity schedule to be announced", "Masterplan and public-realm programme awaiting developer release"],
    investmentPoints: [
      "Pre-launch tracking provides early access to verified updates without presenting agent estimates as developer-confirmed terms.",
      "Market guidance points to a mixed apartment, townhouse and villa community, subject to Ellington’s final release.",
      "Al Yalayis 1 forms part of Dubai’s southern residential growth corridor, while the exact project plot still requires confirmation.",
      "Pricing, payment milestones, completion timing and reservation terms should be assessed only against the final developer and regulatory documents.",
    ],
    travelTimes: [],
    sourceUrl: "https://ellingtonproperties.ae/en/property-for-sale",
    sourceLabel: "Official Ellington catalogue checked 26 August 2026; project not yet listed",
  },
  {
    slug: "linar-towers-d-e-al-mamzar-sharjah",
    name: "Linar Towers D & E",
    developer: "Alef Group",
    developerDisplay: "Alef Group",
    emirate: "Sharjah",
    area: "Al Mamzar, Sharjah",
    startingPrice: "945000",
    paymentPlan: "30/70",
    handover: "Q4 2030",
    image: `${LINAR_MEDIA}/gallery/image/kbP1yNXuC3QJJ4azQvBquoomh_xXTSUVNpj451hdXzc=/original.webp`,
    brochure: `${LINAR_MEDIA}/brochure/application/emaPmdSKpxy59RRvbz9zq-HeGsNgUB8LSJDNolVWWS0=/original.pdf`,
    bedrooms: ["1 Bedroom", "2 Bedroom", "3 Bedroom"],
    propertyTypes: ["Apartments"],
    lifestyles: ["Waterfront living", "Coastal community"],
    coordinates: "",
    description: "The Towers D & E release at Linar introduces one-, two- and three-bedroom waterfront residences in Al Mamzar, Sharjah, with a staged 30/70 payment structure.",
    archived: false,
    sourceUpdatedAt: "2026-07-27T00:00:00.000Z",
    statusLabel: "Upcoming release",
    releaseNote: "Starting prices, EOI acceptance, inventory and payment milestones remain subject to availability and final developer confirmation.",
    unitPricing: [
      { residence: "1 Bedroom", startingPrice: "AED 945,000", eoi: "AED 20,000" },
      { residence: "2 Bedroom", startingPrice: "AED 1,450,000", eoi: "AED 30,000" },
      { residence: "3 Bedroom", startingPrice: "AED 2,450,000", eoi: "AED 40,000" },
    ],
    overview: [
      "Linar is conceived as a high-rise waterfront address within Al Mamzar, with the Towers D & E release extending the project’s one-, two- and three-bedroom residence collection.",
      "The published 30/70 structure comprises a 10% down payment, 20% through quarterly construction instalments and 70% at handover. Each unit’s view, layout, floor, net area and final reservation documents should be compared before an EOI is placed.",
    ],
    gallery: [
      `${LINAR_MEDIA}/gallery/image/kbP1yNXuC3QJJ4azQvBquoomh_xXTSUVNpj451hdXzc=/original.webp`,
      `${LINAR_MEDIA}/gallery/image/iUxBvRNa66O11oElL51xSfiAUeimq93YKyAoU9CAK_U=/original.webp`,
      `${LINAR_MEDIA}/master_plan/image/3NxGTg5_ZZDDgPrmMhjAQsjitXaVct7htuSSRrr2wfI=/original.webp`,
    ],
    interiors: [],
    exteriors: [
      `${LINAR_MEDIA}/gallery/image/kbP1yNXuC3QJJ4azQvBquoomh_xXTSUVNpj451hdXzc=/original.webp`,
      `${LINAR_MEDIA}/gallery/image/iUxBvRNa66O11oElL51xSfiAUeimq93YKyAoU9CAK_U=/original.webp`,
    ],
    floorplans: [
      `${LINAR_MEDIA}/master_plan/image/3NxGTg5_ZZDDgPrmMhjAQsjitXaVct7htuSSRrr2wfI=/original.webp`,
    ],
    amenities: ["Waterfront setting", "Swimming pool", "Fitness facilities", "Landscaped gardens", "Children’s play areas", "Retail and dining"],
    investmentPoints: [
      "Waterfront positioning close to Dubai supports a cross-emirate end-user and investment brief.",
      "The release provides a clear bedroom-by-bedroom entry ladder from AED 945,000.",
      "A 70% handover balance concentrates the majority of capital at completion.",
    ],
    travelTimes: [],
    sourceUrl: "https://www.propertyfinder.ae/en/new-projects/alef-group/linar-by-alef",
    sourceLabel: "Published project information",
  },
  {
    slug: "imtiaz-dlrc-tower",
    name: "Imtiaz DLRC Tower",
    developer: "Imtiaz",
    developerDisplay: "Imtiaz Developments",
    emirate: "Dubai",
    area: "Dubai Land Residence Complex",
    startingPrice: "625000",
    paymentPlan: "20/40/40",
    handover: "Q2 2027",
    image: `${IMTIAZ_MEDIA}/gallery/image/8PVQcj5tKHQvQ0cO8EExp0XXs4pacjz3hTnvq472Tbk=/original.webp`,
    brochure: "",
    bedrooms: [],
    propertyTypes: ["Apartments"],
    lifestyles: ["Urban living", "Investment"],
    coordinates: "",
    description: "Imtiaz DLRC Tower is an upcoming freehold apartment development in Dubai Land Residence Complex, with a published AED 625,000 entry point and 20/40/40 payment plan.",
    archived: false,
    sourceUpdatedAt: "2026-07-27T00:00:00.000Z",
    statusLabel: "New launch",
    releaseNote: "The residence mix, individual unit areas, inventory and final specification are awaiting the complete official release and must be reconfirmed before reservation.",
    unitPricing: [
      { residence: "Apartment collection", startingPrice: "From AED 625,000", eoi: "On request" },
    ],
    overview: [
      "The project is positioned in Dubai Land Residence Complex as a freehold high-rise apartment address with landscaped surroundings and access to the district’s established schools, healthcare, retail and road connections.",
      "Published project information records a 20% down payment, 40% during construction and 40% at handover, with expected completion in June 2027. Unit configurations and size schedules remain to be released.",
    ],
    gallery: [
      `${IMTIAZ_MEDIA}/gallery/image/8PVQcj5tKHQvQ0cO8EExp0XXs4pacjz3hTnvq472Tbk=/original.webp`,
      `${IMTIAZ_MEDIA}/gallery/image/sbvHMIv-yBHPvz4-MHN2QkFiyChtxmgGMDbZCoJIr0g=/original.webp`,
    ],
    interiors: [],
    exteriors: [
      `${IMTIAZ_MEDIA}/gallery/image/8PVQcj5tKHQvQ0cO8EExp0XXs4pacjz3hTnvq472Tbk=/original.webp`,
      `${IMTIAZ_MEDIA}/gallery/image/sbvHMIv-yBHPvz4-MHN2QkFiyChtxmgGMDbZCoJIr0g=/original.webp`,
    ],
    floorplans: [],
    amenities: ["Community hall", "Gymnasium", "Landscaped parks", "Barbecue area", "Children’s play area", "Restaurants"],
    investmentPoints: [
      "A published AED 625,000 entry point places the launch within DLRC’s accessible apartment segment.",
      "The 20/40/40 schedule retains 40% of the purchase price for handover.",
      "DLRC combines freehold ownership with a growing residential inventory and access to Dubai’s arterial road network.",
    ],
    travelTimes: [],
    sourceUrl: "https://www.propertyfinder.ae/en/new-projects/imtiaz-developments/imtiaz-dlrc-tower",
    sourceLabel: "Published project information",
  },
];
