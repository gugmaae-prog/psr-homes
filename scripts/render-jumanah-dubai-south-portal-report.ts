import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import sharp from "sharp";
import {
  buildCuratedBriefContent,
  buildReportProjects,
  renderCuratedBriefPdf,
  type AcquisitionCostLine,
  type ConfirmedProjectInput,
  type CuratedBriefContent,
  type CuratedBriefDocument,
  type CuratedProjectSnapshot,
  type ProjectMediaSections,
  type ReportCommunityContext,
  type ReportProjectRecord,
} from "../worker/curated-brief";
import registryData from "../data/projects.json";

const ROOT = resolve(import.meta.dirname, "..");
const ASSET_ROOT = resolve(ROOT, "tmp/dubai-south-jumanah/assets");
const OUTPUT = resolve(ROOT, "output/pdf/PSR_Jumanah_Dubai_South_Curated_Client_Brief_2026-09-07.pdf");
const PORTAL_SQL = resolve(ROOT, "tmp/dubai-south-jumanah/portal-document.sql");
const PRESENTATION_DATA = resolve(ROOT, "data/jumanah-dubai-south-presentation.json");
const PRESENTATION_PUBLIC_ROOT = resolve(ROOT, "public/presentations/dubai-south-investor-brief");
const PRESENTATION_PUBLIC_URL = "/presentations/dubai-south-investor-brief";
const PREPARED_AT = "2026-09-07T16:00:00.000Z";
const SOURCE_DATE = "2026-09-07";
const VIRTUAL_ROOT = "/projects/jumanah-dubai-south-report";

const registry = registryData as { projects: ReportProjectRecord[] };
const virtualFiles = new Map<string, string>();

function localMedia(relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "");
  const source = `${VIRTUAL_ROOT}/${normalized}`;
  virtualFiles.set(source, resolve(ASSET_ROOT, normalized));
  return source;
}

function siteMedia(relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "").replace(/^projects\//, "");
  const source = `${VIRTUAL_ROOT}/site/${normalized}`;
  virtualFiles.set(source, resolve(ROOT, "public/projects", normalized));
  return source;
}

const advisorCoverCropPath = resolve(ASSET_ROOT, "advisor/jumanah-cover-headshot.jpg");
const advisorProfileCropPath = resolve(ASSET_ROOT, "advisor/jumanah-headshot.jpg");
await mkdir(dirname(advisorCoverCropPath), { recursive: true });
await sharp(resolve(ROOT, "public/team/psr-advisors/jummanah.webp"))
  .extract({ left: 145, top: 0, width: 790, height: 790 })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(advisorCoverCropPath);
await sharp(resolve(ROOT, "public/team/psr-advisors/jummanah.webp"))
  .extract({ left: 100, top: 0, width: 880, height: 760 })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(advisorProfileCropPath);
const advisorCoverCropUrl = localMedia("advisor/jumanah-cover-headshot.jpg");
const advisorProfileCropUrl = localMedia("advisor/jumanah-headshot.jpg");

type ProjectDefinition = {
  slug: string;
  name: string;
  developer: string;
  area: string;
  startingPrice: number;
  paymentPlan: string;
  handover: string;
  coordinates: string;
  propertyTypes: string[];
  lifestyles: string[];
  description: string;
  dldOffer?: {
    marketedWaiver: string;
    status: "marketed-unit-specific" | "not-publicly-verified";
    note: string;
    sourceLabel: string;
    sourceUrl: string;
    checkedAt: string;
  };
  unit: Omit<ConfirmedProjectInput, "slug">;
  media: ProjectMediaSections & { hero: string };
  sourceScore?: number;
  knowledge: {
    statusLabel: string;
    releaseNote: string;
    overview: string[];
    amenities: string[];
    investmentPoints: string[];
    unitPricing: Array<{ residence: string; startingPrice: string; size: string }>;
    sourceLabel: string;
    sourceUrl: string;
  };
  lifecycle: { past: string; present: string; future: string };
};

const definitions: ProjectDefinition[] = [
  {
    slug: "jumanah-dubai-south-south-square-s1",
    name: "South Square S1",
    developer: "Dubai South Properties",
    area: "Dubai South Residential District",
    startingPrice: 1_100_000,
    paymentPlan: "5/55/20/20 Payment Plan",
    handover: "Q4 2028 target",
    coordinates: "24.917236,55.106128",
    propertyTypes: ["Apartments"],
    lifestyles: ["Family living", "Investment", "Landscaped community"],
    description: "Government master-developer apartment proposition with a staged post-handover balance in Dubai South's Residential District.",
    dldOffer: {
      marketedWaiver: "2% DLD waiver",
      status: "marketed-unit-specific",
      note: "A 2% DLD waiver is currently marketed on project listings, but it is not published on the Dubai South official project page. The model retains the full 4% until the exact unit booking form confirms eligibility.",
      sourceLabel: "Current South Square listing offer check",
      sourceUrl: "https://www.bayut.com/property/details-15143575.html",
      checkedAt: "2026-09-07",
    },
    unit: {
      bedroom: "1BR",
      unitReference: "Balanced off-plan screening case",
      unitPrice: 1_200_000,
      unitAreaSqft: 849,
      annualRent: 60_000,
      annualRentLow: 58_000,
      annualRentHigh: 70_000,
      occupancyRate: 95,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 52_000,
      rentalEvidenceNotes: "Post-handover planning case using the attached research range of AED 58,000-70,000 for Dubai South/Emaar South 1BR leases. Replace with current, configuration-matched Ejari evidence before reservation.",
      confirmationNotes: "Client-supplied research score: 82/100. Confirm exact tower, view, internal versus balcony area, construction milestones and the 20% post-handover wording.",
    },
    media: {
      hero: localMedia("south-square/south-square-hero.jpg"),
      exteriors: [localMedia("south-square/south-square-exterior.jpg")],
      interiors: [localMedia("gallery/south-square-lobby-crop.jpg"), localMedia("south-square/south-square-interior.jpg")],
      floorplans: [localMedia("south-square/south-square-1br-plan.jpg"), localMedia("south-square/south-square-2br-plan.jpg")],
      gallery: [localMedia("gallery/south-square-pool-crop.jpg"), localMedia("gallery/south-square-location-map-crop.jpg")],
    },
    sourceScore: 82,
    knowledge: {
      statusLabel: "Off-plan | live unit sheet required",
      releaseNote: "The first tower reportedly sold out within three hours. That is a launch-demand signal, not proof of present availability or future resale liquidity.",
      overview: [
        "The supplied analysis identifies South Square as the best-balanced off-plan route within the AED 1.0M-1.7M mandate.",
        "The 5/55/20/20 structure leaves 20% after handover, reducing the completion-date cash concentration relative to several peers.",
      ],
      amenities: ["Landscaped arrival", "Pool and wellness deck", "Resident lounge", "Family amenity areas", "Balcony-led apartment layouts"],
      investmentPoints: [
        "Lower entry point within the shortlist.",
        "Dubai South Properties master-developer context.",
        "Post-handover tail supports cash-flow flexibility.",
        "Price balcony area separately from internal usable area.",
      ],
      unitPricing: [{ residence: "1BR target", startingPrice: "AED 1.15M-1.35M", size: "755-1,032 sqft" }],
      sourceLabel: "Dubai South official launch and client-supplied research dossier",
      sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-launches-south-square-sells-out-first-tower-within-three-hours",
    },
    lifecycle: {
      past: "Dubai South Properties launched South Square within the Residential District; the first tower was reported sold out within three hours.",
      present: "The client case models a 1BR at AED 1.20M and 849 sqft. Availability, price, view and payment dates require a current reservation form.",
      future: "Target completion is Q4 2028, followed by a 20% post-handover balance. Leasing, service charges and competing handovers must be refreshed before completion.",
    },
  },
  {
    slug: "jumanah-dubai-south-south-living",
    name: "South Living",
    developer: "Dubai South Properties",
    area: "Dubai South Residential District",
    startingPrice: 1_210_000,
    paymentPlan: "Assignment resale | seller ledger required",
    handover: "Q1 2027 target",
    coordinates: "24.928000,55.158000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Near-term income", "Family living", "Investment"],
    description: "A sold-out 209-unit apartment tower approaching handover, available only through assignment, resale or separately allocated inventory.",
    dldOffer: {
      marketedWaiver: "2% DLD waiver",
      status: "marketed-unit-specific",
      note: "A 2% DLD waiver is marketed on current South Living listings. Because Dubai South has reported the project sold out, the benefit must be reconciled to the exact assignment or developer-held unit and written closing statement.",
      sourceLabel: "Current South Living verified listing offer check",
      sourceUrl: "https://sharjah.dubizzle.com/property-for-sale/residential/apartment/2026/5/7/2-dld-fee-waiver-i-q4-2026-i-flexible-p-2-172801/",
      checkedAt: "2026-09-07",
    },
    unit: {
      bedroom: "2BR",
      unitReference: "Near-term assignment screening case",
      unitPrice: 1_550_000,
      unitAreaSqft: 1_244,
      annualRent: 82_000,
      annualRentLow: 80_000,
      annualRentHigh: 90_000,
      occupancyRate: 95,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 4_500,
      acquisitionCosts: 105_000,
      rentalEvidenceNotes: "Near-term planning case using the attached research range of AED 80,000-90,000 for a standard 2BR. Replace with completed-building and configuration-matched rent evidence before leasing.",
      confirmationNotes: "Client-supplied research score: 84/100. Reconcile seller paid-to-date, outstanding instalments, premium, assignment rights, NOC and handover cash before comparing the all-in price.",
    },
    media: {
      hero: localMedia("south-living/south-living-hero.jpg"),
      exteriors: [localMedia("south-living/south-living-exterior.jpg")],
      interiors: [localMedia("gallery/south-living-dining-crop.jpg"), localMedia("south-living/south-living-interior.jpg")],
      floorplans: [localMedia("south-living/south-living-1br-plan.jpg"), localMedia("south-living/south-living-2br-plan.jpg")],
      gallery: [localMedia("gallery/south-living-amenity-crop.jpg")],
    },
    sourceScore: 84,
    knowledge: {
      statusLabel: "Sold out | assignment or resale route",
      releaseNote: "Dubai South reported South Living sold out and targeted Q1 2027 completion. The deal economics now depend on the seller ledger and assignment terms, not the original launch schedule alone.",
      overview: [
        "Large one- and two-bedroom layouts create a stronger end-user and family proposition than many lower-entry alternatives.",
        "Nearer delivery shortens the no-income period, subject to construction and handover confirmation.",
      ],
      amenities: ["Pool and deck", "Gym", "Sauna", "Yoga deck", "Kids' library", "BBQ area", "Landscaped elevated gardens"],
      investmentPoints: ["Best near-term/value route in the supplied analysis.", "Large layouts.", "Earlier leasing window than 2028-2030 projects.", "Assignment-led diligence is mandatory."],
      unitPricing: [
        { residence: "1BR evidence", startingPrice: "AED 1.21M-1.28M", size: "851-902 sqft" },
        { residence: "2BR target", startingPrice: "AED 1.55M-1.65M", size: "1,244-1,336 sqft" },
      ],
      sourceLabel: "Dubai South South Living sell-out release",
      sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-sells-out-south-living-project-confirms-huge-demand-for-spacious-units-in-the-area",
    },
    lifecycle: {
      past: "Dubai South launched the 209-unit South Living tower and later announced that it had sold out.",
      present: "The buyer route is assignment or resale. The scenario uses AED 1.55M for a 1,244 sqft 2BR, subject to an exact seller statement and SPA review.",
      future: "The published target is Q1 2027. Handover, snagging, final service charges and a current leasing set will determine actual income readiness.",
    },
  },
  {
    slug: "jumanah-dubai-south-golf-fields",
    name: "Golf Fields",
    developer: "Emaar",
    area: "Emaar South",
    startingPrice: 1_260_000,
    paymentPlan: "10/70/20 Payment Plan",
    handover: "September 2030 target",
    coordinates: "24.887000,55.153000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Golf living", "Long-hold investment", "Family living"],
    description: "A limited Emaar apartment release positioned around the Emaar South golf landscape and long-duration airport growth corridor.",
    unit: {
      bedroom: "1BR",
      unitReference: "Long-hold Emaar screening case",
      unitPrice: 1_260_000,
      unitAreaSqft: 850,
      annualRent: 60_000,
      annualRentLow: 58_000,
      annualRentHigh: 70_000,
      occupancyRate: 95,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 55_000,
      rentalEvidenceNotes: "Post-handover planning case using current district rent evidence only. The project produces no rent before delivery; re-underwrite the leasing case near handover.",
      confirmationNotes: "Client-supplied research score: 80/100. Confirm a genuinely bookable 1BR at or below AED 1.35M, the golf orientation, dated instalments and resale restrictions.",
    },
    media: {
      hero: localMedia("golf-fields/golf-fields-hero.jpg"),
      exteriors: [localMedia("golf-fields/golf-fields-exterior.jpg")],
      interiors: [localMedia("golf-fields/golf-fields-interior.jpg"), localMedia("golf-fields/golf-fields-terrace.jpg")],
      floorplans: [localMedia("golf-fields/golf-fields-1br-plan.jpg"), localMedia("golf-fields/golf-fields-2br-plan.jpg")],
      gallery: [localMedia("gallery/golf-fields-pool-p10.jpg")],
    },
    sourceScore: 80,
    knowledge: {
      statusLabel: "Off-plan | no rent before 2030 target",
      releaseNote: "The Emaar and golf-community case supports exit quality, while the long construction period creates the largest time-to-income cost in the core shortlist.",
      overview: ["Golf-frontage differentiation and an established Emaar master-community brand are the principal investment arguments.", "Old online launch prices must not be treated as live stock."],
      amenities: ["Golf frontage", "Pool", "Landscaped grounds", "Fitness and wellness", "Emaar South community services"],
      investmentPoints: ["Emaar developer track record.", "Golf-view differentiation.", "Limited building scale.", "Long funding and no-income period to 2030."],
      unitPricing: [{ residence: "1BR target", startingPrice: "At or below AED 1.35M", size: "791-961 sqft" }],
      sourceLabel: "Emaar official Golf Fields page",
      sourceUrl: "https://www.emaar.com/en/properties/golf-fields-at-emaar-south",
    },
    lifecycle: {
      past: "Emaar South has moved through completed and off-plan apartment, townhouse and villa phases around its golf-course master plan.",
      present: "The model tests a 1BR at AED 1.26M. Current inventory and golf orientation must be confirmed directly against the reservation form.",
      future: "The published target is September 2030. The airport and Expo corridor are upside drivers, but they do not create rental income before completion.",
    },
  },
  {
    slug: "jumanah-dubai-south-golf-views-ready",
    name: "Emaar Golf Views",
    developer: "Emaar",
    area: "Emaar South",
    startingPrice: 1_000_000,
    paymentPlan: "Ready resale | cash or finance",
    handover: "Completed",
    coordinates: "24.862102,55.143258",
    propertyTypes: ["Apartments"],
    lifestyles: ["Ready income", "Golf living", "Investment"],
    description: "A completed Emaar South apartment route for investors prioritising immediate leasing and a mature golf-community address.",
    unit: {
      bedroom: "1BR",
      unitReference: "Ready 1BR screening case",
      unitPrice: 1_100_000,
      unitAreaSqft: 648,
      annualRent: 65_000,
      annualRentLow: 58_000,
      annualRentHigh: 70_000,
      occupancyRate: 95,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 70_000,
      rentalEvidenceNotes: "Ready-income screen using the attached district rent range. Confirm three same-building leases, vacancy, service-charge statement and any existing tenancy before relying on the yield.",
      confirmationNotes: "Current asking evidence is indicative. Only shortlist an exact unit if the seller's signed closing statement, including DLD, agency, trustee, NOC, parking/allocation and handover-related charges, remains at or below AED 1.20M. This AED 1.17M model leaves AED 30K contingency.",
    },
    media: {
      hero: localMedia("golf-views-ready/golf-views-hero.jpg"),
      exteriors: [localMedia("golf-views-ready/golf-views-exterior.jpg"), localMedia("golf-views-ready/golf-views-exterior-brochure-p03.jpg")],
      interiors: [localMedia("gallery/golf-views-bedroom-p07.jpg"), localMedia("gallery/golf-views-dining-p08.jpg")],
      floorplans: [localMedia("golf-views-ready/golf-views-1br-plan.png")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Completed | exact resale unit required",
      releaseNote: "This is the Emaar-branded ready-income route. Unit condition, tenancy and the real service-charge record matter more than launch marketing.",
      overview: ["Completed one-bedroom units offer an immediate leasing or owner-occupier path.", "The compact area makes view, storage, layout efficiency and condition important."],
      amenities: ["Emaar South golf setting", "Community pool", "Landscaped areas", "Retail and daily services nearby"],
      investmentPoints: ["Income can begin after transfer and leasing.", "Emaar master-community positioning.", "Secondary acquisition costs apply.", "Inspect the exact unit, not only brochure imagery."],
      unitPricing: [{ residence: "Ready 1BR all-in screen", startingPrice: "Target unit at AED 1.10M or below", size: "645-650 sqft" }],
      sourceLabel: "Emaar Golf Views and current resale asking evidence",
      sourceUrl: "https://properties.emaar.com/en/properties/golf-views/",
    },
    lifecycle: {
      past: "Golf Views was delivered as an Emaar South apartment phase within the wider golf-community master plan.",
      present: "The scenario tests a ready 1BR at AED 1.10M with AED 70K modelled closing costs. The signed all-in statement must remain at or below AED 1.20M.",
      future: "Immediate income is possible, while future airport and community growth remain upside scenarios rather than substitutes for current net-yield underwriting.",
    },
  },
  {
    slug: "jumanah-dubai-south-mag-5-boulevard-ready",
    name: "MAG 5 Boulevard",
    developer: "MAG Lifestyle Development",
    area: "Dubai South Residential District",
    startingPrice: 1_100_000,
    paymentPlan: "Ready resale | cash or finance",
    handover: "Completed",
    coordinates: "24.906000,55.168000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Ready income", "Value", "Family living"],
    description: "Completed, value-led apartments offering more ready two-bedroom space per dirham within the Residential District.",
    unit: {
      bedroom: "2BR",
      unitReference: "Ready 2BR screening case",
      unitPrice: 1_100_000,
      unitAreaSqft: 1_000,
      annualRent: 82_000,
      annualRentLow: 78_000,
      annualRentHigh: 88_000,
      occupancyRate: 94,
      serviceChargePerSqft: 15,
      otherAnnualCosts: 4_500,
      acquisitionCosts: 73_000,
      rentalEvidenceNotes: "Ready 2BR planning case. Replace the range with recent same-block leases and reconcile vacancy, leasing fee, maintenance and furnishing before presenting a net yield.",
      confirmationNotes: "Verify block, title, tenancy, balcony, measured area, fit-out condition, maintenance, parking, annual service charges and finance. Only proceed if the signed closing statement stays within AED 1.20M; this AED 1.173M model leaves AED 27K contingency.",
    },
    media: {
      hero: localMedia("mag5-ready/mag5-hero.jpg"),
      exteriors: [localMedia("gallery/mag5-pool-crop.jpg")],
      interiors: [localMedia("gallery/mag5-bedroom-p20.jpg"), localMedia("gallery/mag5-bathroom-p23.jpg"), localMedia("mag5-ready/mag5-interior.jpg")],
      floorplans: [localMedia("mag5-ready/mag5-2br-plan.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Completed | building-condition screen",
      releaseNote: "MAG 5 is the ready space-per-dirham route. Block quality, common-area upkeep and the exact unit fit-out drive the investment outcome.",
      overview: ["The 2BR range is materially larger than many new-build 1BR options at a similar headline price.", "The decision must be based on actual condition and net rent after ownership costs."],
      amenities: ["Pool courtyard", "Landscaped walkways", "Retail access", "Community recreation"],
      investmentPoints: ["Ready two-bedroom space inside budget.", "Immediate leasing route.", "Condition and maintenance variation between blocks.", "Current rent and charges require unit-specific evidence."],
      unitPricing: [{ residence: "Ready 2BR all-in screen", startingPrice: "Target unit at AED 1.10M or below", size: "965-1,036 sqft" }],
      sourceLabel: "Current MAG 5 Boulevard asking evidence and project brochure",
      sourceUrl: "https://www.bayut.com/for-sale/2-bedroom-apartments/dubai/dubai-south/residential-district/mag-5-boulevard/",
    },
    lifecycle: {
      past: "MAG 5 Boulevard was delivered as a value-focused apartment cluster in Dubai South's Residential District.",
      present: "The model tests a ready 2BR at AED 1.10M with AED 73K modelled closing costs. The signed all-in statement must remain at or below AED 1.20M.",
      future: "Income can begin after transfer and leasing; future district growth helps only if maintenance, service charges and tenant demand remain competitive.",
    },
  },
  {
    slug: "jumanah-dubai-south-pulse-boulevard-c3-ready",
    name: "The Pulse Boulevard C3",
    developer: "Dubai South Properties",
    area: "Dubai South Residential District",
    startingPrice: 1_500_000,
    paymentPlan: "Ready resale | cash or finance",
    handover: "Completed",
    coordinates: "24.918000,55.179000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Ready income", "Family living", "Investment"],
    description: "A completed family-size apartment route with a tenanted three-bedroom asking example used as an income benchmark.",
    unit: {
      bedroom: "3BR + maid",
      unitReference: "Tenanted ready-income benchmark",
      unitPrice: 1_575_000,
      unitAreaSqft: 1_523,
      annualRent: 110_000,
      annualRentLow: 100_000,
      annualRentHigh: 115_000,
      occupancyRate: 95,
      serviceChargePerSqft: 15,
      otherAnnualCosts: 5_000,
      acquisitionCosts: 104_000,
      rentalEvidenceNotes: "The asking example stated AED 110,000 annual rent, equivalent to about 6.98% gross on AED 1.575M before service charges, vacancy, maintenance and acquisition costs. Inspect the executed lease and payment history.",
      confirmationNotes: "Confirm lease, rent payments, renewal terms, notice status, deposit, title deed, service-charge statement, unit condition and the exact title-deed floor plan.",
    },
    media: {
      hero: localMedia("pulse-ready/pulse-hero.jpg"),
      exteriors: [localMedia("pulse-ready/pulse-exterior.jpg")],
      interiors: [localMedia("pulse-ready/pulse-interior.jpg")],
      floorplans: [localMedia("pulse-ready/pulse-2br-plan.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Completed | tenanted case to verify",
      releaseNote: "The C3 listing is retained as an income benchmark, not confirmed inventory. The displayed plan is from the wider Pulse Boulevard collection and must be replaced by the title-deed plan.",
      overview: ["Family-size ready stock can generate current income where the lease is genuine and transferable.", "The reported gross yield must be reduced for service charges, vacancy, maintenance and acquisition costs."],
      amenities: ["Community recreation", "Pool", "Gym", "Retail and public-space access"],
      investmentPoints: ["Current tenanted-income benchmark.", "Large family-size area.", "Lease and notice diligence required.", "Floor-plan reference is not unit-specific."],
      unitPricing: [{ residence: "3BR + maid asking example", startingPrice: "AED 1.575M", size: "1,523 sqft" }],
      sourceLabel: "Current Pulse Boulevard C3 asking evidence",
      sourceUrl: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-the-pulse-the-pulse-boulevard-apartments-c3-67917720.html",
    },
    lifecycle: {
      past: "The Pulse apartment phases helped establish the Residential District's current resident and leasing base.",
      present: "The scenario uses a reported tenanted 3BR + maid at AED 1.575M and AED 110,000 rent. The underlying lease has not been independently verified for this report.",
      future: "The ready asset participates in district growth immediately, but the investor should value the existing lease and building quality before assigning any airport-growth premium.",
    },
  },
  {
    slug: "jumanah-dubai-south-windsor-house",
    name: "Windsor House",
    developer: "Ellington Properties",
    area: "Dubai South Residential District",
    startingPrice: 1_110_000,
    paymentPlan: "20/50/30 Payment Plan",
    handover: "Q3 2028 marketed | July 2029 filed reference",
    coordinates: "24.949230,55.207268",
    propertyTypes: ["Apartments"],
    lifestyles: ["Design-led living", "Investment", "End-user appeal"],
    description: "A design-led Ellington apartment proposition with a material discrepancy between marketed and DLD-derived completion references.",
    unit: {
      bedroom: "1BR",
      unitReference: "Design-led off-plan screening case",
      unitPrice: 1_350_000,
      unitAreaSqft: 800,
      annualRent: 65_000,
      annualRentLow: 58_000,
      annualRentHigh: 70_000,
      occupancyRate: 95,
      serviceChargePerSqft: 20,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 58_000,
      rentalEvidenceNotes: "Post-handover scenario using the district 1BR range. Re-underwrite against same-building rent and final service charges when the project completes.",
      confirmationNotes: "Client-supplied research score: 78/100. Reconcile the Q3 2028 marketed target with the reported 31 July 2029 filed date and read the SPA completion and extension clauses.",
    },
    media: {
      hero: localMedia("windsor-house/windsor-house-hero.webp"),
      exteriors: [localMedia("windsor-house/windsor-house-exterior.webp")],
      interiors: [localMedia("windsor-house/windsor-house-interior.webp")],
      floorplans: [localMedia("windsor-house/windsor-house-1br-plan.webp"), localMedia("windsor-house/windsor-house-2br-plan.webp")],
      gallery: [],
    },
    sourceScore: 78,
    knowledge: {
      statusLabel: "Off-plan | completion-date conflict",
      releaseNote: "Ellington's design and amenity positioning can support end-user appeal. The completion-date conflict is a contract and DLD-status diligence point, not a footnote.",
      overview: ["Interior design and amenities are stronger differentiators than pure entry price.", "A 20% booking creates a larger initial cash requirement than several peers."],
      amenities: ["Design-led lobby", "Pool and wellness", "Fitness", "Resident social spaces", "Landscaped arrival"],
      investmentPoints: ["Higher design and end-user appeal.", "Potential finish premium.", "Large booking amount.", "Handover discrepancy must be resolved before signing."],
      unitPricing: [{ residence: "1BR evidence", startingPrice: "AED 1.11M-1.50M", size: "779+ sqft" }],
      sourceLabel: "Ellington official Windsor House page",
      sourceUrl: "https://windsor-house.ellingtonproperties.ae/",
    },
    lifecycle: {
      past: "Ellington introduced Windsor House as a design-led Dubai South apartment project.",
      present: "The scenario models an 800 sqft 1BR at AED 1.35M. Exact tower, plan, view, service-charge estimate and reservation form remain required.",
      future: "The marketed Q3 2028 target conflicts with a July 2029 DLD-derived reference. The SPA date, grace period and official project status control the decision.",
    },
  },
  {
    slug: "jumanah-dubai-south-terra-woods",
    name: "Terra Woods",
    developer: "Emaar",
    area: "Expo Living / Expo City Dubai",
    startingPrice: 1_600_000,
    paymentPlan: "10/70/20 Payment Plan",
    handover: "March 2030 target",
    coordinates: "24.957000,55.150000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Metro access", "Expo living", "Long-hold investment"],
    description: "An Emaar Expo Living proposition with the strongest Metro and Expo position in the shortlist and the highest price density.",
    unit: {
      bedroom: "1BR",
      unitReference: "Expo and Metro premium case",
      unitPrice: 1_640_000,
      unitAreaSqft: 753,
      annualRent: 65_000,
      annualRentLow: 58_000,
      annualRentHigh: 70_000,
      occupancyRate: 95,
      serviceChargePerSqft: 20,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 70_000,
      rentalEvidenceNotes: "Post-handover planning case. Existing Expo/Metro access does not justify using a higher rent without comparable completed stock; re-underwrite near handover.",
      confirmationNotes: "Client-supplied research score: 74/100. The modelled AED 1.64M unit price remains within the AED 1.7M unit-price mandate, while the AED 1.710M all-in scenario exceeds an AED 1.7M all-in ceiling and trades at a material price-per-square-foot premium.",
    },
    media: {
      hero: localMedia("terra-woods/terra-woods-hero.jpg"),
      exteriors: [localMedia("terra-woods/terra-woods-exterior-aerial.jpg")],
      interiors: [],
      floorplans: [localMedia("terra-woods/terra-woods-1br-plan.jpg"), localMedia("terra-woods/terra-woods-2br-plan.jpg")],
      gallery: [],
    },
    sourceScore: 74,
    knowledge: {
      statusLabel: "Off-plan | Expo premium | no verified interior set",
      releaseNote: "This is the best Expo/Metro position but the weakest value-per-square-foot case. No verified interior imagery was available in the supplied asset pack, so none is invented.",
      overview: ["Expo City and Metro access support end-user convenience.", "The price density is materially higher than the Residential District and Emaar South alternatives."],
      amenities: ["Expo City access", "Metro-linked urban context", "Landscaped residential setting", "Emaar-managed community proposition"],
      investmentPoints: ["Strongest transport position in the shortlist.", "Emaar development platform.", "High AED/sqft and limited fee headroom.", "No rental income before the 2030 target."],
      unitPricing: [{ residence: "1BR evidence", startingPrice: "AED 1.60M-1.68M", size: "742-765 sqft" }],
      sourceLabel: "Emaar official Terra Woods page",
      sourceUrl: "https://www.emaar.com/en/properties/terra-woods-at-expo-living",
    },
    lifecycle: {
      past: "The Expo 2020 site transitioned into Expo City, with residential, business, event and visitor uses continuing to expand around the existing Metro terminus.",
      present: "The scenario models a 753 sqft 1BR at AED 1.64M. The exact walking route, unit orientation, view and payment dates require confirmation.",
      future: "The published target is March 2030. Expo City and Dubai Exhibition Centre expansion support the location case, while the long no-income period and premium entry price remain the trade-offs.",
    },
  },
  {
    slug: "jumanah-dubai-south-azizi-venice",
    name: "Azizi Venice",
    developer: "Azizi Developments",
    area: "Dubai South",
    startingPrice: 1_000_000,
    paymentPlan: "20/20/60 typical | building-specific",
    handover: "Varies by building",
    coordinates: "24.887000,55.145000",
    propertyTypes: ["Apartments"],
    lifestyles: ["Waterfront concept", "Investment", "Value entry"],
    description: "A large lagoon-led master development whose investment case must be underwritten building by building rather than as one delivery schedule.",
    dldOffer: {
      marketedWaiver: "Up to 4% DLD waiver",
      status: "marketed-unit-specific",
      note: "Current DLD-validated listings market full or partial DLD waivers for selected Azizi Venice buildings and cash structures. The benefit is phase-, unit- and time-specific, so the model retains 4% until the booking form confirms it.",
      sourceLabel: "Current Azizi Venice DLD-validated listing offer check",
      sourceUrl: "https://uae.dubizzle.com/property-for-sale/residential/apartment/2026/7/10/lagoon-view-full-dld-waiver-cash-offer--2-317476/",
      checkedAt: "2026-09-07",
    },
    unit: {
      bedroom: "1BR",
      unitReference: "Building-specific speculative case",
      unitPrice: 1_100_000,
      unitAreaSqft: 700,
      annualRent: 60_000,
      annualRentLow: 55_000,
      annualRentHigh: 65_000,
      occupancyRate: 92,
      serviceChargePerSqft: 20,
      otherAnnualCosts: 4_500,
      acquisitionCosts: 48_000,
      rentalEvidenceNotes: "Future leasing case only. Confirm the exact building's completion, amenity delivery, comparable stock, service-charge estimate and achieved rents before using this scenario.",
      confirmationNotes: "Client-supplied research score: 68/100. A Venice 14 status snapshot cited in the research showed a material progress/date conflict; obtain a new building-specific DLD status check.",
    },
    media: {
      hero: siteMedia("azizi-venice/hero-clean.webp"),
      exteriors: [localMedia("azizi-venice/azizi-venice-exterior-brochure-p18.jpg")],
      interiors: [localMedia("azizi-venice/azizi-venice-interior-brochure-p27.jpg")],
      floorplans: [localMedia("azizi-venice/azizi-venice-1br-floorplan.png")],
      gallery: [],
    },
    sourceScore: 68,
    knowledge: {
      statusLabel: "Off-plan | building-specific progress required",
      releaseNote: "The lagoon concept and lower entry point are attractive, but one master-development label must not conceal different building schedules and construction progress.",
      overview: ["The entry range can fit the mandate with fee headroom.", "Building identity, status and handover balance are the decisive variables."],
      amenities: ["Lagoon concept", "Promenade", "Retail and leisure vision", "Residential amenities by building"],
      investmentPoints: ["Lower entry point.", "Waterfront and destination concept.", "Large phased supply.", "Execution and handover evidence must be building-specific."],
      unitPricing: [{ residence: "Selected 1BR evidence", startingPrice: "AED 1.00M-1.20M", size: "621-753 sqft" }],
      sourceLabel: "Client-supplied DLD-derived Venice 14 status and project material",
      sourceUrl: "https://continentalclub.ae/project/azizi-venice-14-azizi-venice/",
    },
    lifecycle: {
      past: "Azizi Venice was launched as a multi-building lagoon-led destination in Dubai South.",
      present: "The scenario models a 700 sqft 1BR at AED 1.10M. Exact building, floor, plan, escrow, progress and completion date are not interchangeable across phases.",
      future: "Value depends on building delivery, lagoon and retail execution, service charges and the scale of competing handovers. Apply a building-specific discount until evidence strengthens.",
    },
  },
  {
    slug: "jumanah-dubai-south-waada-altura",
    name: "Waada Altura",
    developer: "BT Properties",
    area: "Dubai South",
    startingPrice: 1_465_000,
    paymentPlan: "10/55/5/30 Payment Plan",
    handover: "Q4 2028-Q2 2029 by phase",
    coordinates: "24.831656,55.133801",
    propertyTypes: ["Apartments"],
    lifestyles: ["Space-led value", "Family living", "Early off-plan"],
    description: "A space-per-dirham proposition within a large early-stage master plan, with a longer execution record still to be established in Dubai.",
    unit: {
      bedroom: "2BR",
      unitReference: "Space-led early off-plan case",
      unitPrice: 1_465_000,
      unitAreaSqft: 1_281,
      annualRent: 82_000,
      annualRentLow: 80_000,
      annualRentHigh: 90_000,
      occupancyRate: 92,
      serviceChargePerSqft: 16,
      otherAnnualCosts: 4_500,
      acquisitionCosts: 62_000,
      rentalEvidenceNotes: "Future 2BR planning case. Rebuild the rent and service-charge model as the phase approaches handover and competing stock becomes observable.",
      confirmationNotes: "Client-supplied research score: 65/100. Confirm developer entity, phase, escrow, 2BR plan, post-handover terms and construction evidence; resist a price above AED 1,200/sqft until execution advances.",
    },
    media: {
      hero: localMedia("altura-waada/altura-hero.webp"),
      exteriors: [localMedia("waada/waada-exterior.jpg")],
      interiors: [localMedia("altura-waada/altura-interior.webp"), localMedia("waada/waada-interior.jpg")],
      floorplans: [localMedia("altura-waada/altura-1br-plan.webp")],
      gallery: [localMedia("altura-waada/altura-pool-amenity.webp")],
    },
    sourceScore: 65,
    knowledge: {
      statusLabel: "Early off-plan | execution review",
      releaseNote: "The research identifies Waada Altura as the maximum-space route, but the value case requires a stronger execution discount than projects from established Dubai delivery platforms.",
      overview: ["A registered example around 1,281 sqft creates a strong size-per-dirham proposition.", "The post-handover component can help cash flow but extends developer exposure."],
      amenities: ["Pool and leisure deck", "Landscaped master plan", "Family amenities", "Retail and community vision"],
      investmentPoints: ["Largest modelled area for the price.", "Post-handover balance.", "Early-stage master-plan delivery requires verification.", "Developer and phase evidence require close monitoring."],
      unitPricing: [{ residence: "2BR research example", startingPrice: "About AED 1.465M", size: "About 1,281 sqft" }],
      sourceLabel: "BT Properties official Waada construction update",
      sourceUrl: "https://btproperties.ae/bt-properties-breaks-ground-on-phase-1-of-waada-in-dubai-south/",
    },
    lifecycle: {
      past: "BT Properties announced and commenced early works for phases of the Waada master development.",
      present: "The scenario models a 1,281 sqft 2BR at AED 1.465M. Phase, building, exact plan, escrow and construction status require documentary confirmation.",
      future: "The published range spans late 2028 to 2029 by phase, with 30% modelled after handover. Delivery quality and infrastructure execution will determine whether the space discount persists.",
    },
  },
  {
    slug: "jumanah-dubai-south-expo-valley-views",
    name: "Expo Valley Views",
    developer: "Expo City Dubai",
    area: "Expo Living - Expo City",
    startingPrice: 1_670_000,
    paymentPlan: "75/25 Payment Plan",
    handover: "31 October 2029",
    coordinates: "24.9583519,55.1496137",
    propertyTypes: ["Apartments"],
    lifestyles: ["Sustainable living", "Expo City", "Long-hold investment"],
    description: "An Expo City master-developer apartment route at the upper edge of the mandate, with official interiors, exteriors and floor plans.",
    unit: {
      bedroom: "1BR",
      unitReference: "Expo City premium screening case",
      unitPrice: 1_670_000,
      unitAreaSqft: 750,
      annualRent: 75_000,
      annualRentLow: 70_000,
      annualRentHigh: 82_000,
      occupancyRate: 94,
      serviceChargePerSqft: 20,
      otherAnnualCosts: 4_000,
      acquisitionCosts: 72_000,
      rentalEvidenceNotes: "Future rent sensitivity only. Replace the range with current Expo Living evidence and an exact unit/service-charge schedule before reservation.",
      confirmationNotes: "Confirm the live Ghadeer or building release, exact net area, balcony, view, price, 75/25 milestones and whether the unit remains within the AED 1.7M cap before fees.",
    },
    media: {
      hero: siteMedia("expo-valley-views/hero.png"),
      exteriors: [siteMedia("expo-valley-views/exterior-01.jpg"), siteMedia("expo-valley-views/exterior-02.jpg")],
      interiors: [siteMedia("expo-valley-views/interior-01.jpg"), siteMedia("expo-valley-views/interior-02.jpg")],
      floorplans: [siteMedia("expo-valley-views/floorplan-1br.jpg"), siteMedia("expo-valley-views/floorplan-2br.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Off-plan | current release confirmation required",
      releaseNote: "Expo City publishes a 31 October 2029 handover. The AED 1.67M and 75/25 references require a current unit sheet before client issue.",
      overview: ["Expo Valley Views is integrated with Expo City's public realm, Metro-linked destination and business districts.", "The premium entry must be justified by a specific view, plan and usable area rather than the Expo brand alone."],
      amenities: ["Landscaped valley setting", "Community pool", "Fitness and wellness", "Children's play", "Walking and cycling routes", "Expo City retail and dining"],
      investmentPoints: ["Master-developer Expo City address.", "At the budget ceiling before fees.", "Metro, events and employment ecosystem.", "No rent before the 2029 completion target."],
      unitPricing: [{ residence: "1BR reference", startingPrice: "About AED 1.67M", size: "Exact unit plan required" }],
      sourceLabel: "Expo City Dubai official Expo Valley Views page",
      sourceUrl: "https://www.expocitydubai.com/en/expo-living/expo-valley/expo-valley-views/",
    },
    lifecycle: {
      past: "Expo City evolved from the Expo 2020 site into a mixed residential, business, events and visitor district.",
      present: "The model tests a 1BR at AED 1.67M. Building, unit and commercial terms require live confirmation.",
      future: "Published handover is 31 October 2029; the investment case relies on long-hold district maturity rather than immediate income.",
    },
  },
  {
    slug: "jumanah-dubai-south-avenew-888",
    name: "AVENEW 888",
    developer: "AVENEW Development",
    area: "Dubai South Residential District",
    startingPrice: 1_450_000,
    paymentPlan: "60/40 Payment Plan",
    handover: "Q1 2028",
    coordinates: "24.9451743,55.2191641",
    propertyTypes: ["Apartments", "Duplexes"],
    lifestyles: ["Community living", "Wellness", "Investment"],
    description: "A five-building, amenity-led Dubai South community with current Phase 2 entry guidance inside the client's target range.",
    unit: {
      bedroom: "1BR",
      unitReference: "Current Phase 2 screening case",
      unitPrice: 1_450_000,
      unitAreaSqft: 676,
      annualRent: 65_000,
      annualRentLow: 60_000,
      annualRentHigh: 72_000,
      occupancyRate: 94,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 62_000,
      rentalEvidenceNotes: "Future rent sensitivity based on the wider Dubai South one-bedroom range. Refresh against comparable completed buildings and the final service charge near handover.",
      confirmationNotes: "AVENEW's page advertises Phase 2 from AED 1.45M while older collection references start lower. Confirm phase, building, exact unit, net area, price, incentives and milestone dates.",
    },
    media: {
      hero: siteMedia("avenew-888/hero.webp"),
      exteriors: [siteMedia("avenew-888/exterior-01.webp"), siteMedia("avenew-888/exterior-02.webp")],
      interiors: [siteMedia("avenew-888/interior-01.webp"), siteMedia("avenew-888/interior-02.webp")],
      floorplans: [siteMedia("avenew-888/floorplan-1br.jpg"), siteMedia("avenew-888/floorplan-2br.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Phase 2 selling | live inventory required",
      releaseNote: "Current public material lists one- to three-bedroom homes from AED 1.45M, a 60/40 plan and Q1 2028 handover; earlier phases carry different references.",
      overview: ["Five contemporary buildings share landscape, pools, fitness, co-working and family amenities.", "The current entry is inside budget but the compact plan makes usable area and service charge important comparison points."],
      amenities: ["Adult and children's pools", "Indoor and outdoor gyms", "Pilates and yoga", "Co-working atelier and library", "Garden paths", "Amphitheatre", "Dog park"],
      investmentPoints: ["Current published phase inside budget.", "Five-building community infrastructure.", "Five-minute airport and 12-15-minute Expo claims.", "Phase-specific availability and terms can differ materially."],
      unitPricing: [{ residence: "1BR Phase 2 reference", startingPrice: "From AED 1.45M", size: "Selected plan about 676 sqft" }, { residence: "2BR published plan", startingPrice: "On request", size: "Selected plan about 981 sqft" }],
      sourceLabel: "AVENEW Development official project page",
      sourceUrl: "https://avenewdevelopment.ae/projects/avenew-888",
    },
    lifecycle: {
      past: "AVENEW 888 launched through multiple phases including LOOM.",
      present: "The scenario uses the current Phase 2 starting reference and a published 1BR plan.",
      future: "Q1 2028 is the current published handover; completed-building rent and service-charge evidence will need to replace the planning case.",
    },
  },
  {
    slug: "jumanah-dubai-south-enre-residence",
    name: "Enre Residence",
    developer: "Imtiaz Developments",
    area: "Dubai South Residential District",
    startingPrice: 673_000,
    paymentPlan: "60/40 Payment Plan",
    handover: "Q1 2028",
    coordinates: "24.9425262,55.2154156",
    propertyTypes: ["Apartments"],
    lifestyles: ["Furnished living", "Investment", "Value entry"],
    description: "An Imtiaz apartment project with studios to two-bedroom homes, furnished interiors and a published Q1 2028 delivery target.",
    dldOffer: {
      marketedWaiver: "Up to 4% DLD waiver",
      status: "marketed-unit-specific",
      note: "Current broker listings market a 4% DLD waiver on selected Enre Residence units, while other live listings still cost the standard 4%. No official public Imtiaz offer was located, so the report retains the full 4% until written unit confirmation.",
      sourceLabel: "Current Enre Residence verified listing offer check",
      sourceUrl: "https://uae.dubizzle.com/property-for-sale/residential/apartment/2026/4/17/exclusive-deal-dld-waiver-premium-unit-2-168549/",
      checkedAt: "2026-09-07",
    },
    unit: {
      bedroom: "2BR",
      unitReference: "Larger-layout budget screening case",
      unitPrice: 1_600_000,
      unitAreaSqft: 1_111,
      annualRent: 82_000,
      annualRentLow: 76_000,
      annualRentHigh: 90_000,
      occupancyRate: 94,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 4_500,
      acquisitionCosts: 68_000,
      rentalEvidenceNotes: "Future two-bedroom planning case. Confirm the furnished specification, service charge and comparable rents from completed Dubai South buildings before relying on the yield.",
      confirmationNotes: "Confirm a live 2BR at or below AED 1.7M, the exact plan and area, furnishing schedule, view, payment milestones, construction status and completion documents.",
    },
    media: {
      hero: siteMedia("enre-residence/hero.jpg"),
      exteriors: [siteMedia("enre-residence/exterior-01.jpg"), siteMedia("enre-residence/exterior-02.jpg")],
      interiors: [siteMedia("enre-residence/interior-01.jpg"), siteMedia("enre-residence/interior-02.jpg")],
      floorplans: [siteMedia("enre-residence/floorplan-level-01.jpg"), siteMedia("enre-residence/floorplan-typical.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Under construction | exact 2BR price required",
      releaseNote: "Imtiaz publishes studios, 1BR and 2BR homes, a 60/40 structure and Q1 2028 handover. AED 673K is the collection entry, not the selected 2BR price.",
      overview: ["The two-bedroom planning case tests whether a larger furnished layout can remain within budget.", "Published floor plates provide configuration evidence, but the exact unit plan and current stock sheet control the comparison."],
      amenities: ["Pool", "Fitness", "Clubhouse", "Children's play", "Landscaped spaces", "Furnished residences"],
      investmentPoints: ["Broad configuration ladder.", "Potential larger-area route inside the mandate.", "60/40 funding profile.", "Live 2BR price and service charge remain unconfirmed."],
      unitPricing: [{ residence: "2BR screening ceiling", startingPrice: "At or below AED 1.70M", size: "Published reference from about 1,111 sqft" }],
      sourceLabel: "Imtiaz Developments official project page and published plan pack",
      sourceUrl: "https://imtiaz.ae/property/enre-residence-by-imtiaz",
    },
    lifecycle: {
      past: "Imtiaz launched Enre Residence in the Dubai South Residential District.",
      present: "The scenario tests a 1,111 sqft 2BR at AED 1.60M, conditional on a live stock sheet.",
      future: "Q1 2028 is the published handover target; the eventual rental case depends on delivered specification and competing supply.",
    },
  },
  {
    slug: "jumanah-dubai-south-golf-trails",
    name: "Golf Trails",
    developer: "Emaar",
    area: "Emaar South",
    startingPrice: 1_250_000,
    paymentPlan: "80/20 Payment Plan",
    handover: "October 2030",
    coordinates: "24.8627389,55.1414705",
    propertyTypes: ["Apartments", "Townhouses"],
    lifestyles: ["Golf living", "Family living", "Long-hold investment"],
    description: "A 161-home Emaar release around the Emaar South golf landscape, with one- to three-bedroom apartments and a small townhouse component.",
    unit: {
      bedroom: "1BR",
      unitReference: "Entry-level Emaar screening case",
      unitPrice: 1_250_000,
      unitAreaSqft: 738,
      annualRent: 65_000,
      annualRentLow: 60_000,
      annualRentHigh: 72_000,
      occupancyRate: 94,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 54_000,
      rentalEvidenceNotes: "Future one-bedroom planning case only. No rental income is available before completion; refresh rents, vacancy and service charges close to handover.",
      confirmationNotes: "Confirm live one-bedroom inventory, golf orientation, exact size, 80/20 milestones, resale rules and the October 2030 date in the booking form.",
    },
    media: {
      hero: siteMedia("golf-trails/hero.jpg"),
      exteriors: [siteMedia("golf-trails/exterior-01.jpg"), siteMedia("golf-trails/exterior-02.jpg")],
      interiors: [siteMedia("golf-trails/interior-01.jpg"), siteMedia("golf-trails/interior-02.jpg")],
      floorplans: [siteMedia("golf-trails/floorplan-1br.jpg"), siteMedia("golf-trails/floorplan-2br.jpg")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Off-plan | no income before October 2030",
      releaseNote: "Emaar publishes 161 homes, AED 1.25M entry, 80/20 payment and October 2030 handover. Exact unit availability remains the deciding evidence.",
      overview: ["The small release combines apartments and six townhouses around the golf setting.", "The Emaar and golf proposition supports exit quality, offset by a long construction and no-income period."],
      amenities: ["18-hole championship golf course", "Infinity pool", "Fitness", "Sports and padel courts", "Yoga", "Children's play", "Community retail"],
      investmentPoints: ["Transparent AED 1.25M entry.", "Limited 161-home release.", "Emaar and golf positioning.", "Long duration to 2030."],
      unitPricing: [{ residence: "1BR", startingPrice: "From AED 1.25M", size: "719-755 sqft" }, { residence: "2BR", startingPrice: "From AED 1.81M", size: "1,096-1,484 sqft" }],
      sourceLabel: "Emaar official Golf Trails project page",
      sourceUrl: "https://www.emaar.com/en/properties/golf-trails-at-emaar-south",
    },
    lifecycle: {
      past: "Emaar South established a multi-phase golf-led master community.",
      present: "The scenario tests the published one-bedroom entry point and a 738 sqft plan.",
      future: "October 2030 is the published target; rent and liquidity need to be re-underwritten close to delivery.",
    },
  },
  {
    slug: "jumanah-dubai-south-divine-elements",
    name: "Divine Elements",
    developer: "Takmeel Development",
    area: "Dubai South Residential District",
    startingPrice: 1_350_000,
    paymentPlan: "40/60 option | confirm current terms",
    handover: "To be confirmed",
    coordinates: "24.946215,55.215588",
    propertyTypes: ["Apartments"],
    lifestyles: ["Contemporary living", "Wellness", "Investment"],
    description: "A studio-to-two-bedroom apartment project with official imagery and a published 40/60 option, but incomplete public pricing and timing.",
    unit: {
      bedroom: "2BR",
      unitReference: "Price-on-request screening case",
      unitPrice: 1_350_000,
      unitAreaSqft: 950,
      annualRent: 75_000,
      annualRentLow: 68_000,
      annualRentHigh: 84_000,
      occupancyRate: 93,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 4_000,
      acquisitionCosts: 58_000,
      rentalEvidenceNotes: "Illustrative future case only because public unit pricing, exact area and completion timing remain incomplete. Replace every input with the current developer unit sheet.",
      confirmationNotes: "The public brochure link points to another Takmeel project. Require the correct Divine Elements brochure, exact 2BR plan, price, escrow, payment dates and completion evidence before shortlisting.",
    },
    media: {
      hero: siteMedia("divine-elements/hero.jpg"),
      exteriors: [siteMedia("divine-elements/exterior-01.jpg"), siteMedia("divine-elements/exterior-02.jpg")],
      interiors: [siteMedia("divine-elements/interior-01.jpg")],
      floorplans: [siteMedia("divine-elements/floorplan-studio.png")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Price and handover to be confirmed",
      releaseNote: "Takmeel publishes the configuration, imagery, location guidance and a 40/60 option, but the public brochure link does not match Divine Elements. The AED 1.35M 2BR is only a screening case.",
      overview: ["The official page confirms studios, 1BR and 2BR homes and shows one studio plan.", "Incomplete public commercial documentation keeps this as a verification-stage option rather than a recommendation."],
      amenities: ["Pool", "Fitness", "Landscaped recreation", "Children's play", "Resident social areas"],
      investmentPoints: ["Potential two-bedroom route inside budget.", "Published airport and Expo proximity.", "40/60 option.", "Price, handover and full plan pack remain unverified."],
      unitPricing: [{ residence: "2BR screening case", startingPrice: "AED 1.35M model only", size: "950 sqft model only" }],
      sourceLabel: "Takmeel Development official project page",
      sourceUrl: "https://www.takmeeldevelopment.com/divine-elements-page",
    },
    lifecycle: {
      past: "Takmeel announced Divine Elements in Dubai South.",
      present: "The model uses explicit placeholders pending a current price sheet and correct project pack.",
      future: "No completion timing should be relied upon until it is documented in the current booking and regulatory records.",
    },
  },
  {
    slug: "jumanah-dubai-south-windsor-house-ii",
    name: "Windsor House II",
    developer: "Ellington Properties",
    area: "Dubai South Residential District",
    startingPrice: 1_200_000,
    paymentPlan: "70/30 Payment Plan",
    handover: "Q3 2028 marketed | timing check",
    coordinates: "24.944791,55.218476",
    propertyTypes: ["Apartments"],
    lifestyles: ["Design-led living", "Family living", "Investment"],
    description: "Ellington's second Windsor House release, offering studios to three-bedroom apartments in Dubai South.",
    unit: {
      bedroom: "1BR",
      unitReference: "Design-led one-bedroom screen",
      unitPrice: 1_200_000,
      unitAreaSqft: 750,
      annualRent: 65_000,
      annualRentLow: 60_000,
      annualRentHigh: 72_000,
      occupancyRate: 94,
      serviceChargePerSqft: 18,
      otherAnnualCosts: 3_500,
      acquisitionCosts: 52_000,
      rentalEvidenceNotes: "Future one-bedroom planning case. Refresh against completed Ellington and Dubai South comparables and the final service charge near handover.",
      confirmationNotes: "Reconcile the marketed Q3 2028 reference with the filed timing, then confirm unit-specific plan, net area, price, 70/30 milestones and view. Displayed plans are design-family references only.",
    },
    media: {
      hero: siteMedia("windsor-house-ii/hero.jpg"),
      exteriors: [siteMedia("windsor-house-ii/exterior-01.jpg"), siteMedia("windsor-house-ii/exterior-02.jpg")],
      interiors: [siteMedia("windsor-house-ii/interior-01.jpg"), siteMedia("windsor-house-ii/interior-02.jpg")],
      floorplans: [siteMedia("windsor-house-ii/floorplan-1br-reference.webp"), siteMedia("windsor-house-ii/floorplan-2br-reference.webp")],
      gallery: [],
    },
    knowledge: {
      statusLabel: "Off-plan | handover timing reconciliation required",
      releaseNote: "Official project imagery and residence mix are confirmed. Marketed and filed timing references differ, and the shown plans are Windsor House design-family references pending the exact unit drawing.",
      overview: ["The project provides an Ellington design-led alternative to value-led Dubai South buildings.", "The one-bedroom entry is inside budget, but timing, usable area and service charges must justify the premium."],
      amenities: ["Pool", "Fitness studio", "Landscaped courtyard", "Children's play", "Residents' lounge", "Outdoor social areas"],
      investmentPoints: ["Ellington design positioning.", "One-bedroom entry inside budget.", "Airport and Expo corridor.", "Timing and exact plan require reconciliation."],
      unitPricing: [{ residence: "1BR reference", startingPrice: "About AED 1.20M", size: "Exact Windsor House II plan required" }],
      sourceLabel: "Ellington Properties official Windsor House II page",
      sourceUrl: "https://ellingtonproperties.ae/en/property-for-sale/windsor-house-ii-dubai-south",
    },
    lifecycle: {
      past: "Ellington introduced Windsor House and a second release in Dubai South.",
      present: "The scenario tests a one-bedroom at AED 1.20M pending the exact unit and timing documents.",
      future: "The client should not rely on the marketed date until it matches the booking form and regulatory record.",
    },
  },
];

function projectRecord(definition: ProjectDefinition): ReportProjectRecord {
  return {
    slug: definition.slug,
    name: definition.name,
    developer: definition.developer,
    emirate: "Dubai",
    area: definition.area,
    startingPrice: String(definition.startingPrice),
    paymentPlan: definition.paymentPlan,
    handover: definition.handover,
    image: definition.media.hero,
    bedrooms: [definition.unit.bedroom],
    propertyTypes: definition.propertyTypes,
    lifestyles: definition.lifestyles,
    coordinates: definition.coordinates,
    description: definition.description,
    archived: false,
    sourceUpdatedAt: SOURCE_DATE,
  };
}

function selectedProjectEntry(project: CuratedProjectSnapshot) {
  return { name: project.name, developer: project.developer, handover: project.handover };
}

function communityFor(
  project: CuratedProjectSnapshot,
  base: Omit<ReportCommunityContext, "selectedProjects">,
): ReportCommunityContext {
  return { ...base, selectedProjects: [selectedProjectEntry(project)] };
}

function acquisitionCostBreakdown(definition: ProjectDefinition): AcquisitionCostLine[] {
  const price = definition.unit.unitPrice;
  const total = definition.unit.acquisitionCosts;
  const isSecondary = /assignment|resale/i.test(definition.paymentPlan) || /completed/i.test(definition.handover);
  const registration = Math.round(price * 0.04);
  const agency = isSecondary ? Math.round(price * 0.021) : 0;
  const trusteeOrAdmin = isSecondary
    ? Math.min(4_200, Math.max(0, total - registration - agency))
    : Math.max(0, total - registration);
  const closingBalance = Math.max(0, total - registration - agency - trusteeOrAdmin);
  const dldDisplay = definition.dldOffer
    ? `4% COSTED · ${definition.dldOffer.marketedWaiver.toUpperCase()} CHECK`
    : "4% COSTED";
  const dldNote = definition.dldOffer?.note
    || "No current project-specific DLD waiver was verified in public developer material during the 07 September 2026 check. The standard 4% remains modelled until the exact booking form confirms otherwise.";
  return [
    { label: "DLD / Oqood", amount: registration, display: dldDisplay, note: dldNote },
    { label: isSecondary ? "Agency, trustee, NOC and admin" : "Developer admin / legal allowance", amount: agency + trusteeOrAdmin + closingBalance, note: isSecondary ? "Includes the modelled agency fee plus remaining trustee, NOC and legal allowance." : "Confirm the project-specific admin, registration and legal invoices." },
    { label: "Parking / bay allocation", amount: 0, display: "NOT PUBLISHED", note: "Confirm whether parking is included, allocated or separately charged for the exact unit." },
    { label: "Handover / connection charges", amount: 0, display: "NOT PUBLISHED", note: "Obtain the final handover statement, utility deposits and connection invoices before commitment." },
  ];
}

const eligibleDefinitions = definitions.filter((definition) => !/completed/i.test(definition.handover) || definition.unit.unitPrice + definition.unit.acquisitionCosts <= 1_200_000);

const reportProjects = buildReportProjects(
  eligibleDefinitions.map(projectRecord),
  eligibleDefinitions.map((definition) => ({ slug: definition.slug, ...definition.unit, acquisitionCostBreakdown: acquisitionCostBreakdown(definition) })),
);

eligibleDefinitions.forEach((definition, index) => {
  const project = reportProjects[index];
  project.imageUrl = definition.media.hero;
  project.mediaSections = definition.media;
  project.mediaGallery = [
    definition.media.hero,
    ...definition.media.exteriors,
    ...definition.media.interiors,
    ...definition.media.floorplans,
    ...definition.media.gallery,
  ];
  project.projectKnowledge = {
    ...definition.knowledge,
    verifiedAt: SOURCE_DATE,
  };
  project.lifecycle = definition.lifecycle;
  project.areaBenchmark = null;
  project.priceVsAreaPercent = null;
  project.confirmationNotes = project.confirmationNotes.replace(/^Client-supplied research score:\s*\d+\/100\.\s*/i, "");
  project.upcoming = project.upcoming.filter((item) => item.name.toLowerCase() !== project.name.toLowerCase());
});

const residentialProjects = reportProjects.filter((project) => project.location.includes("Residential District"));
const emaarSouthProjects = reportProjects.filter((project) => project.location === "Emaar South");
const expoProjects = reportProjects.filter((project) => project.location.startsWith("Expo Living"));
const widerDubaiSouthProjects = reportProjects.filter((project) => project.location === "Dubai South");
const activeDubaiSouth = registry.projects.filter((project) => !project.archived && /dubai south/i.test(project.area)).length;
const activeEmaarSouth = registry.projects.filter((project) => !project.archived && /emaar south/i.test(project.area)).length;
const activeExpo = registry.projects.filter((project) => !project.archived && /expo city|expo living/i.test(project.area)).length;

const residentialCommunityBase: Omit<ReportCommunityContext, "selectedProjects"> = {
  slug: "dubai-south-residential-district",
  name: "Dubai South Residential District",
  route: "/communities/dubai-south",
  imageUrl: localMedia("south-square/south-square-hero.jpg"),
  descriptor: "Established residential base beside the aviation, logistics and Expo corridor",
  overview: "Dubai South reports more than 25,000 residents, public parks, sports courts, retail, a 50,000 sqft hypermarket, a mosque, a petrol station, GEMS Founders School and an RTA bus connection to Expo Metro.",
  activeProjects: activeDubaiSouth,
  developers: ["Dubai South Properties", "MAG Lifestyle Development", "Ellington Properties", "Azizi Developments", "BT Properties"],
  propertyTypes: ["Apartments", "Townhouses", "Villas"],
  timeline: {
    past: "Dubai South was launched in 2006 as a 145 sq km government master-planned city integrating aviation, logistics, business and residential districts.",
    present: "The Residential District has an established resident base and daily services; ready apartments, near-term assignments and new off-plan towers create different income and execution profiles.",
    future: "The AED 128bn Al Maktoum terminal programme, an AED 62bn Majid Al Futtaim mixed-use community, Dubai Exhibition Centre expansion and the announced South Bay Mall can deepen jobs and amenities, subject to phased delivery.",
  },
  sourceLabel: "Dubai South official Residential District and South Living releases",
  sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-living-an-exclusive-luxury-apartment-project-in-the-residential-district",
  verifiedAt: "2026-09-06",
};

const emaarSouthCommunityBase: Omit<ReportCommunityContext, "selectedProjects"> = {
  slug: "emaar-south",
  name: "Emaar South",
  route: "/communities/emaar-south",
  imageUrl: localMedia("golf-fields/golf-fields-hero.jpg"),
  descriptor: "Golf-led Emaar master community with a global gateway position",
  overview: "Emaar describes a golf-led residential community with 15,360 apartment units, 53,000 sqm of retail and dining space, an 18-hole championship course, 25 neighbourhood parks, schools, clinics and daily retail.",
  activeProjects: activeEmaarSouth,
  developers: ["Emaar"],
  propertyTypes: ["Apartments", "Townhouses", "Villas"],
  timeline: {
    past: "Emaar South has delivered and launched multiple apartment, townhouse and villa phases around a championship golf course.",
    present: "Completed Golf Views offers a ready route, while Golf Fields represents a longer-duration off-plan route within the same master community.",
    future: "Emaar publishes 5 minutes to Al Maktoum Airport and 15 minutes to Expo City for the community. Airport, Expo and retail growth are catalysts, not substitutes for unit-level pricing and rent evidence.",
  },
  sourceLabel: "Emaar official Emaar South community page",
  sourceUrl: "https://www.emaar.com/en/our-communities/emaar-south",
  verifiedAt: "2026-09-06",
};

const expoCommunityBase: Omit<ReportCommunityContext, "selectedProjects"> = {
  slug: "expo-living-expo-city",
  name: "Expo Living and Expo City Dubai",
  route: "/communities/expo-city-dubai",
  imageUrl: localMedia("terra-woods/terra-woods-exterior-aerial.jpg"),
  descriptor: "Metro-linked residential, business, events and visitor-economy district",
  overview: "Expo City combines homes, offices, events, attractions, parks, dining, retail and the existing Metro terminus. The Expo Living submarket carries a location premium relative to core Dubai South alternatives.",
  activeProjects: activeExpo,
  developers: ["Emaar", "Expo City Dubai"],
  propertyTypes: ["Apartments", "Townhouses", "Villas"],
  timeline: {
    past: "The Expo 2020 site transitioned into Expo City Dubai, retaining major assets and the Metro connection.",
    present: "Expo City operates attractions, parks, events, dining and retail while residential and business districts continue to expand.",
    future: "The Dubai Exhibition Centre is planned to expand in phases to 180,000 sqm by 2031. Residential and office growth can deepen demand, but delivery dates remain programme milestones rather than guaranteed property returns.",
  },
  sourceLabel: "Expo City Dubai and Dubai Media Office official sources",
  sourceUrl: "https://www.expocitydubai.com/en/",
  verifiedAt: "2026-09-06",
};

const widerDubaiSouthCommunityBase: Omit<ReportCommunityContext, "selectedProjects"> = {
  slug: "dubai-south-wider-corridor",
  name: "Wider Dubai South corridor",
  route: "/projects?area=Dubai%20South",
  imageUrl: siteMedia("azizi-venice/hero-clean.webp"),
  descriptor: "Master-development exposure with exact subdistrict confirmation required",
  overview: "Azizi Venice and Waada Altura are screened at the wider Dubai South level. Their exact phase, access route and relationship to Residential District amenities must be verified; this report does not transfer the school, hypermarket or South Bay Mall claims to either project.",
  activeProjects: activeDubaiSouth,
  developers: ["Azizi Developments", "BT Properties", "Dubai South Properties"],
  propertyTypes: ["Apartments", "Townhouses", "Villas"],
  timeline: {
    past: "Dubai South is a government-led aviation, logistics, business and residential master-development corridor.",
    present: "The wider area contains multiple separately phased projects whose access, infrastructure and delivery evidence must be checked building by building.",
    future: "Airport, exhibition and mixed-use programmes can support the corridor, while exact phase delivery and large competing supply remain the material project-level tests.",
  },
  sourceLabel: "Dubai South official master-development overview",
  sourceUrl: "https://www.dubaisouth.ae/en/",
  verifiedAt: "2026-09-06",
};

reportProjects.forEach((project) => {
  if (emaarSouthProjects.includes(project)) {
    project.communityContext = communityFor(project, emaarSouthCommunityBase);
    project.publishedTravelTimes = [
      { destination: "Al Maktoum International Airport", minutes: "5", category: "Airport", sourceLabel: "Emaar South official community page", sourceUrl: emaarSouthCommunityBase.sourceUrl, verifiedAt: "2026-09-06" },
      { destination: "Expo City Dubai", minutes: "15", category: "Business and events", sourceLabel: "Emaar South official community page", sourceUrl: emaarSouthCommunityBase.sourceUrl, verifiedAt: "2026-09-06" },
      { destination: "Dubai Marina", minutes: "25", category: "Retail and leisure", sourceLabel: "Emaar South official community page", sourceUrl: emaarSouthCommunityBase.sourceUrl, verifiedAt: "2026-09-06" },
      { destination: "Downtown Dubai", minutes: "35", category: "Business district", sourceLabel: "Emaar South official community page", sourceUrl: emaarSouthCommunityBase.sourceUrl, verifiedAt: "2026-09-06" },
    ];
  } else if (expoProjects.includes(project)) {
    project.communityContext = communityFor(project, expoCommunityBase);
    project.publishedTravelTimes = [
      { destination: "Al Maktoum International Airport", minutes: "10", category: "Airport", sourceLabel: "Emaar Expo Living official brochure", sourceUrl: "https://properties.emaar.com/wp-content/uploads/2025/12/TERRA_GARDENS_EXPO_LIVING_BROCHURE.pdf", verifiedAt: "2026-09-06" },
      { destination: "Expo City Dubai", minutes: "5", category: "Business and events", sourceLabel: "Emaar Expo Living official brochure", sourceUrl: "https://properties.emaar.com/wp-content/uploads/2025/12/TERRA_GARDENS_EXPO_LIVING_BROCHURE.pdf", verifiedAt: "2026-09-06" },
    ];
  } else if (widerDubaiSouthProjects.includes(project)) {
    project.communityContext = communityFor(project, widerDubaiSouthCommunityBase);
    project.publishedTravelTimes = [];
  } else if (residentialProjects.includes(project)) {
    project.communityContext = communityFor(project, residentialCommunityBase);
    project.publishedTravelTimes = project.name === "South Square S1" ? [
      { destination: "Expo City Dubai", minutes: "7", category: "Business and events", sourceLabel: "South Square project brochure", sourceUrl: "https://cdn.opr.ae/upload/brochures/South%20Square%20Brochure.pdf", verifiedAt: "2026-09-06" },
    ] : [];
  }
});

const content: CuratedBriefContent = buildCuratedBriefContent({
  projects: reportProjects,
  brief: "Dubai South investor decision brief for an AED 1.0M-1.7M all-inclusive mandate. Compare completed and off-plan routes; include fees, cash flow, completed-property rental analysis, airport and Expo proximity, daily-life infrastructure, project images and floor plans.",
  narrative: {
    executiveSummary: "Dubai South combines an established residential base with long-term growth linked to Expo City and Al Maktoum International Airport. For Mr. Arul, the review separates two decision routes within the stated all-inclusive budget: completed properties capped at AED 1.20M and selected off-plan properties capped at AED 1.70M. Completed options are assessed on acquisition cost and current rental evidence. Off-plan options are assessed on unit value, payment timing, developer documentation, delivery evidence, community quality and connectivity. Final pricing, availability, incentives and charges will be confirmed for the exact unit.",
    recommendation: "Recommendations: Screen MAG 5 Boulevard and Emaar Golf Views for the completed-property route only where the verified all-in acquisition remains within AED 1.20M. For off-plan, prioritise South Square S1, Golf Trails and Windsor House II for an exact-unit comparison of purchase price, usable area, DLD treatment, payment schedule and handover documentation. Retain Azizi Venice and Enre Residence as secondary checks where a live unit and written incentive keep the total commitment within AED 1.70M. All remaining projects require stronger current inventory or commercial evidence before advancing.",
    marketPosition: "Dubai South is a long-duration employment and population-growth corridor built around aviation, logistics, Expo City, business events and expanding residential services. The future supply response is also material. A defensible selection requires price, usable area, payment timing, delivery evidence and exit-market depth to remain supportable without assuming the airport programme immediately increases rent.",
    locationStory: "The review separates four location frames: Dubai South Residential District, Emaar South, Expo Living, and the wider Dubai South corridor used only where the exact subdistrict still needs confirmation. Emaar publishes 5 minutes from Emaar South to Al Maktoum Airport and 15 minutes to Expo City; South Square marketing cites 7 minutes to Expo City. Published times are marketing references, and neither Residential District amenities nor travel claims are transferred to Azizi Venice or Waada Altura without an exact phase and route check.",
    riskNotes: [],
  },
  advisor: {
    name: "Jumanah",
    email: "jumanah@psrhomes.ae",
    phone: "+971 58 680 1148",
    title: "Managing Partner",
    avatarUrl: advisorCoverCropUrl,
    profileAvatarUrl: advisorProfileCropUrl,
    portraitPlacement: "cover-and-profile",
    profileSummary: "PSR Homes leads this private-client review through Jumanah's advisory desk. We narrow the shortlist, verify the exact unit and its supporting documents, test the full cash requirement, and coordinate the transaction through reservation, transfer, handover and leasing.",
    specialties: ["Dubai South", "Private client advisory", "Ready and off-plan comparison", "Transaction coordination"],
    languages: ["English", "Arabic"],
  },
  confirmedAt: PREPARED_AT,
});

content.presentation = {
  includeTimelinePanels: false,
  compactProjectModules: true,
  maxEnrichedImages: 128,
  coverImageUrl: localMedia("context/al-wasl-dome.png"),
};
content.confirmation = {
  ...content.confirmation,
  confirmedBy: "PSR Homes research and advisory workflow",
  statement: "Before a property is selected, PSR will confirm the exact unit, current price and availability, total acquisition cost, payment schedule, service charges and comparable rental evidence. This ensures the final recommendation reflects the latest inventory and documented commercial terms. Prices, availability and incentives may change.",
  title: "Preparation and review record",
  byline: "Prepared by",
  statusLabel: "CURRENT UNIT AND INVENTORY CONFIRMATION REQUIRED",
};

const dubaiContext = content.emirateContexts.find((context) => context.slug === "dubai");
if (dubaiContext) {
  dubaiContext.descriptor = "Trade, aviation, logistics, Expo City and a growing southern residential corridor";
  dubaiContext.investmentCase = "For this mandate, we focus on Dubai's southern growth corridor: operating logistics and aerospace clusters, Expo City and its Metro connection, an established Residential District, and a major pipeline around Al Maktoum International Airport. The investment case is strongest when the selected unit works on current price, usable area and realistic rent before any future-infrastructure uplift is assumed.";
  dubaiContext.viabilityChecks = [
    "Separate current achieved rent from future airport, exhibition and retail upside.",
    "Compare the Residential District, Emaar South and Expo Living as different submarkets rather than one Dubai South price.",
    "Stress-test cash calls, no-income duration, completion evidence and competing handovers for the exact unit.",
  ];
  dubaiContext.anchors = [
    { label: "New airport proximity", value: "Emaar publishes 5 min from Emaar South" },
    { label: "Expo access", value: "7-15 min published references by submarket" },
    { label: "Current living base", value: "25,000+ Residential District residents reported" },
    { label: "Future mixed-use scale", value: "AED 62bn MAF-Dubai South community announced" },
  ];
  dubaiContext.timeline.future = "The forward case includes the AED 128bn Al Maktoum passenger-terminal programme, an AED 62bn Majid Al Futtaim mixed-use community across 22 million sqft, Dubai Exhibition Centre expansion to 180,000 sqm by 2031 and the announced South Bay Mall. Each remains tied to its own delivery stage.";
  dubaiContext.signals = [
    { title: "Al Maktoum airport corridor", detail: "AED 128bn passenger-terminal programme with ultimate capacity above 260 million passengers; Emaar publishes 5 minutes from Emaar South. Ultimate capacity is not current throughput.", sourceIds: ["al-maktoum-terminal"] },
    { title: "Expo City and business events", detail: "Expo City operates today with Metro, parks, attractions, offices, dining and retail; Dubai Exhibition Centre is planned to expand in phases to 180,000 sqm by 2031.", sourceIds: ["dubai-exhibition-centre"] },
    { title: "AED 62bn mixed-use pipeline", detail: "Dubai South and Majid Al Futtaim announced a 22 million sqft community with residential, retail, lifestyle and a major mall anchor. It is an announced programme, not current amenity delivery.", sourceIds: ["dubai-south-maf"] },
    { title: "Established daily-life base", detail: "Dubai South reports more than 25,000 Residential District residents, parks, sports courts, a 50,000 sqft hypermarket, GEMS Founders School and RTA bus access to Expo Metro.", sourceIds: ["dubai-south-residential"] },
  ];
  dubaiContext.catalysts = [
    { id: "dubai-airport", name: "Al Maktoum passenger terminal", category: "Aviation", status: "Under construction", timing: "Ten-year first-phase horizon from 2024 announcement", summary: "AED 128bn terminal programme with five runways, two terminals and ultimate capacity above 260 million passengers.", marketImpact: "Can deepen aviation, logistics, hospitality, employment and residential demand; ultimate capacity must not be treated as present traffic.", sourceLabel: "Dubai Media Office airport programme", sourceUrl: "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport" },
    { id: "dubai-south-maf", name: "Dubai South-Majid Al Futtaim community", category: "Mixed use", status: "Announced", timing: "Announced May 2026", summary: "AED 62bn, 22 million sqft mixed-use community with residential, retail and lifestyle uses anchored by a large mall.", marketImpact: "Adds a major future daily-life and destination layer, subject to master-plan phasing and delivery.", sourceLabel: "Dubai South official announcement", sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-and-majid-al-futtaim-partner-to-develop-aed-62-billion-mixed-use-master-community" },
    { id: "dubai-exhibition-centre", name: "Dubai Exhibition Centre expansion", category: "Business events", status: "Phased / mixed", timing: "Phase 2 target 2028 | final phase target 2031", summary: "AED 10bn programme intended to expand the venue to 180,000 sqm by 2031.", marketImpact: "Can deepen event, hospitality and business demand around Expo City and Dubai South as operating capacity is delivered.", sourceLabel: "Dubai Media Office exhibition-centre plan", sourceUrl: "https://prod.mediaoffice.ae/en/news/2024/september/23-09/dubai-exhibition-centre" },
    { id: "south-bay-mall", name: "South Bay Mall", category: "Retail and leisure", status: "Announced", timing: "Construction announced; opening date not yet published", summary: "Dubai South's first announced retail and lifestyle destination for the Residential District.", marketImpact: "Can improve everyday retail depth, but tenant mix and opening timing remain to be confirmed.", sourceLabel: "Dubai South official South Bay Mall announcement", sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-bay-mall-its-first-retail-and-lifestyle-destination-at-the-residential-district" },
  ];
  dubaiContext.establishments = [
    { name: "Al Maktoum International Airport", category: "Airport", proximity: "5 min published from Emaar South; the airport forms the southern boundary of the Residential District planning area", community: "Dubai South corridor", sourceLabel: "Emaar and Dubai South official sources", sourceUrl: "https://www.emaar.com/en/our-communities/emaar-south", verifiedAt: "2026-09-06" },
    { name: "Expo City Dubai", category: "Business and events", proximity: "7 min published from South Square; 15 min published from Emaar South; directly beside Expo Living", community: "Dubai South corridor", sourceLabel: "Project and master-community published travel references", sourceUrl: "https://www.expocitydubai.com/en/", verifiedAt: "2026-09-06" },
    { name: "Dubai Exhibition Centre", category: "Business and events", proximity: "Operating at Expo City with phased expansion planned to 180,000 sqm by 2031", community: "Expo City Dubai", sourceLabel: "Dubai Media Office", sourceUrl: "https://prod.mediaoffice.ae/en/news/2024/september/23-09/dubai-exhibition-centre", verifiedAt: "2026-09-06" },
    { name: "GEMS Founders School Dubai South", category: "Education", proximity: "Within the Residential District along Expo Road", community: "Dubai South Residential District", sourceLabel: "Dubai South official school announcement and district update", sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-signs-agreement-with-gems-education-to-operate-the-first-world-class-british-school-at-the-residential-district", verifiedAt: "2026-09-06" },
    { name: "Saudi German Clinic Dubai South Village", category: "Healthcare", proximity: "Emaar identifies the clinic among Emaar South community services", community: "Emaar South", sourceLabel: "Emaar South official community page", sourceUrl: "https://www.emaar.com/en/our-communities/emaar-south", verifiedAt: "2026-09-06" },
    { name: "NMC Royal Hospital DIP", category: "Healthcare", proximity: "Full-service hospital with 24/7 emergency care in Dubai Investments Park; verify the exact driving route and time from the selected unit", community: "Dubai South corridor", sourceLabel: "NMC Healthcare official hospital page", sourceUrl: "https://nmc.ae/en/locations/dubai/nmc-royal-hospital-dip-dubai", verifiedAt: "2026-09-06" },
    { name: "Residential District hypermarket and retail", category: "Retail and leisure", proximity: "50,000 sqft hypermarket plus operating retail shops reported within the district", community: "Dubai South Residential District", sourceLabel: "Dubai South official district update", sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-awards-aed-150-million-construction-contract-for-its-south-living-project", verifiedAt: "2026-09-06" },
    { name: "South Bay Mall", category: "Retail and leisure", proximity: "Announced future retail and lifestyle hub; opening date and tenant mix not yet published", community: "Dubai South Residential District", sourceLabel: "Dubai South official announcement", sourceUrl: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-bay-mall-its-first-retail-and-lifestyle-destination-at-the-residential-district", verifiedAt: "2026-09-06" },
  ];
  dubaiContext.sources = [
    ...dubaiContext.sources,
    { id: "dubai-south-maf", label: "AED 62bn Dubai South-Majid Al Futtaim mixed-use community", publisher: "Dubai South", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-and-majid-al-futtaim-partner-to-develop-aed-62-billion-mixed-use-master-community", verifiedAt: "2026-09-06" },
    { id: "dubai-south-residential", label: "Dubai South Residential District population and amenities", publisher: "Dubai South", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-living-an-exclusive-luxury-apartment-project-in-the-residential-district", verifiedAt: "2026-09-06" },
    { id: "south-bay-mall", label: "South Bay Mall announcement", publisher: "Dubai South", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-bay-mall-its-first-retail-and-lifestyle-destination-at-the-residential-district", verifiedAt: "2026-09-06" },
  ];
}

const additionalSources = [
  { label: "Client-supplied Dubai South deep research dossier, dated 5 September 2026", url: "" },
  { label: "Expo City Dubai: Al Wasl Plaza official cover image and attraction profile", url: "https://www.expocitydubai.com/en/things-to-do/attractions/al-wasl-plaza/" },
  { label: "Dubai Media Office: Al Maktoum International Airport terminal programme", url: "https://mediaoffice.ae/en/news/2024/april/28-04/al-maktoum-international-airport" },
  { label: "Dubai Media Office: Al Maktoum airport development approval update", url: "https://www.mediaoffice.ae/en/news/2026/june/15-06/hamdan-bin-mohammed-approves-al-maktoum-airport" },
  { label: "Dubai Media Office: Dubai Exhibition Centre expansion", url: "https://prod.mediaoffice.ae/en/news/2024/september/23-09/dubai-exhibition-centre" },
  { label: "Dubai South: AED 62bn Majid Al Futtaim mixed-use community", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-and-majid-al-futtaim-partner-to-develop-aed-62-billion-mixed-use-master-community" },
  { label: "Dubai South: South Living launch and Residential District amenities", url: residentialCommunityBase.sourceUrl },
  { label: "Dubai South: South Living sell-out and Q1 2027 target", url: definitions.find((item) => item.name === "South Living")?.knowledge.sourceUrl || "" },
  { label: "Dubai South: GEMS Founders School Dubai South", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-signs-agreement-with-gems-education-to-operate-the-first-world-class-british-school-at-the-residential-district" },
  { label: "Dubai South: South Bay Mall announcement", url: "https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-bay-mall-its-first-retail-and-lifestyle-destination-at-the-residential-district" },
  { label: "NMC Healthcare: NMC Royal Hospital DIP full-service and emergency-care profile", url: "https://nmc.ae/en/locations/dubai/nmc-royal-hospital-dip-dubai" },
  { label: "Emaar: Emaar South community, amenities and published travel times", url: emaarSouthCommunityBase.sourceUrl },
  { label: "Expo City Dubai: current attractions, events, dining, retail and city programme", url: "https://www.expocitydubai.com/en/" },
  ...eligibleDefinitions.map((item) => ({ label: `${item.name}: ${item.knowledge.sourceLabel}`, url: item.knowledge.sourceUrl })),
  ...eligibleDefinitions.flatMap((item) => item.dldOffer ? [{ label: `${item.name}: ${item.dldOffer.sourceLabel} (${item.dldOffer.checkedAt})`, url: item.dldOffer.sourceUrl }] : []),
].filter((item, index, items) => items.findIndex((candidate) => (candidate.url || candidate.label) === (item.url || item.label)) === index);

content.marketContext.sources = [...content.marketContext.sources, ...additionalSources]
  .filter((item, index, items) => items.findIndex((candidate) => (candidate.url || candidate.label) === (item.url || item.label)) === index);

const document: CuratedBriefDocument = {
  id: "83ac3cc3-2182-458a-8cc2-51920e89de9a",
  type: "proposal",
  title: "Dubai South",
  client_name: "Mr. Arul | Singapore | South Dubai | AED 1.0M-1.7M",
  created_at: PREPARED_AT,
  content,
};

type PresentationAssetRole = "cover" | "portrait" | "photo" | "floorplan";

async function exportPresentationAsset(sourceUrl: string, relativeTarget: string, role: PresentationAssetRole) {
  const sourceFile = virtualFiles.get(sourceUrl);
  if (!sourceFile) throw new Error(`Presentation media is not registered: ${sourceUrl}`);
  const outputFile = resolve(PRESENTATION_PUBLIC_ROOT, relativeTarget);
  await mkdir(dirname(outputFile), { recursive: true });
  let image = sharp(sourceFile).rotate();
  if (role === "floorplan") image = image.flatten({ background: "#f4f1e9" });
  const width = role === "cover" ? 2200 : role === "portrait" ? 1100 : role === "floorplan" ? 1400 : 1600;
  await image
    .resize({ width, height: role === "floorplan" ? 1200 : undefined, fit: "inside", withoutEnlargement: true })
    .webp({ quality: role === "floorplan" ? 90 : 82, effort: 5 })
    .toFile(outputFile);
  return `${PRESENTATION_PUBLIC_URL}/${relativeTarget}`;
}

async function exportPresentationMedia(project: CuratedProjectSnapshot) {
  const webSlug = project.slug.replace(/^jumanah-dubai-south-/, "");
  const exportList = async (sources: string[], role: "photo" | "floorplan", label: string) => Promise.all(
    sources.slice(0, role === "floorplan" ? 2 : 1).map((source, index) => exportPresentationAsset(source, `projects/${webSlug}/${label}-${index + 1}.webp`, role)),
  );
  return {
    hero: await exportPresentationAsset(project.imageUrl, `projects/${webSlug}/hero.webp`, "photo"),
    exteriors: await exportList(project.mediaSections.exteriors || [], "photo", "exterior"),
    interiors: await exportList(project.mediaSections.interiors || [], "photo", "interior"),
    floorplans: await exportList(project.mediaSections.floorplans || [], "floorplan", "floorplan"),
    gallery: await exportList(project.mediaSections.gallery || [], "photo", "gallery"),
  };
}

const [presentationCover, presentationAdvisorCover, presentationAdvisorProfile] = await Promise.all([
  exportPresentationAsset(content.presentation?.coverImageUrl || "", "cover/wasl-dome.webp", "cover"),
  exportPresentationAsset(content.advisor.avatarUrl || "", "advisor/jumanah-cover.webp", "portrait"),
  exportPresentationAsset(content.advisor.profileAvatarUrl || "", "advisor/jumanah-profile.webp", "portrait"),
]);
const presentationProjects = await Promise.all(content.projects.map(async (project) => ({
  slug: project.slug,
  name: project.name,
  developer: project.developer,
  location: project.location,
  positioning: project.positioning,
  startingPrice: project.startingPrice,
  paymentPlan: project.paymentPlan,
  paymentSchedule: project.paymentSchedule,
  handover: project.handover,
  coordinates: project.coordinates,
  statusLabel: project.projectKnowledge?.statusLabel || "Current unit confirmation required",
  releaseNote: project.projectKnowledge?.releaseNote || "",
  overview: project.projectKnowledge?.overview || [],
  amenities: project.projectKnowledge?.amenities || [],
  investmentPoints: project.projectKnowledge?.investmentPoints || [],
  sourceLabel: project.projectKnowledge?.sourceLabel || "PSR project research",
  sourceUrl: project.projectKnowledge?.sourceUrl || "",
  unitReference: project.unitReference,
  bedroom: project.bedroom,
  unitPrice: project.unitPrice,
  unitAreaSqft: project.unitAreaSqft,
  unitPricePerSqft: project.unitPricePerSqft,
  annualRent: project.annualRent,
  annualRentLow: project.annualRentLow,
  annualRentHigh: project.annualRentHigh,
  occupancyRate: project.occupancyRate,
  serviceChargePerSqft: project.serviceChargePerSqft,
  annualServiceCharge: project.annualServiceCharge,
  otherAnnualCosts: project.otherAnnualCosts,
  acquisitionCosts: project.acquisitionCosts,
  acquisitionCostBreakdown: project.acquisitionCostBreakdown,
  allInCost: project.allInCost,
  grossYield: project.grossYield,
  netYield: project.netYield,
  effectiveNetYield: project.effectiveNetYield,
  incomeAnalysisEligible: project.incomeAnalysisEligible,
  dldOffer: (() => {
    const definition = eligibleDefinitions.find((item) => item.slug === project.slug);
    return definition?.dldOffer || {
      marketedWaiver: "No current public offer verified",
      status: "not-publicly-verified" as const,
      note: "No current project-specific DLD waiver was verified in public developer material during the 07 September 2026 check. The standard 4% remains modelled until the exact booking form confirms otherwise.",
      sourceLabel: definition?.knowledge.sourceLabel || "Project source review",
      sourceUrl: definition?.knowledge.sourceUrl || "",
      checkedAt: "2026-09-07",
    };
  })(),
  priceVsAreaPercent: project.priceVsAreaPercent,
  advisoryScreen: project.advisoryScreen,
  rentalEvidenceNotes: project.rentalEvidenceNotes,
  confirmationNotes: project.confirmationNotes,
  travelTimes: project.publishedTravelTimes,
  community: project.communityContext ? {
    name: project.communityContext.name,
    descriptor: project.communityContext.descriptor,
    overview: project.communityContext.overview,
    sourceLabel: project.communityContext.sourceLabel,
    sourceUrl: project.communityContext.sourceUrl,
  } : null,
  media: await exportPresentationMedia(project),
})));
const presentationData = {
  id: document.id,
  title: document.title,
  clientName: "Mr. Arul",
  clientLocation: "Singapore",
  mandate: "Dubai South only | AED 1.0M-1.7M",
  preparedAt: document.created_at,
  coverImage: presentationCover,
  executiveSummary: content.executiveSummary,
  recommendation: content.recommendation,
  marketPosition: content.marketPosition,
  locationStory: content.locationStory,
  riskNotes: content.riskNotes,
  companyProfile: content.companyProfile,
  advisor: {
    ...content.advisor,
    avatarUrl: presentationAdvisorCover,
    profileAvatarUrl: presentationAdvisorProfile,
  },
  dubaiContext: content.emirateContexts.find((context) => context.slug === "dubai") || null,
  marketContext: content.marketContext,
  areaDemandResearch: content.areaDemandResearch,
  residencyGuidance: content.residencyGuidance,
  confirmation: content.confirmation,
  dldOfferChecks: {
    checkedAt: "2026-09-07",
    method: "Current developer pages were checked first. Time-sensitive listing and developer-representative signals are labelled as marketed offers and are not treated as contractual until confirmed in the exact booking form.",
    marketedProjects: eligibleDefinitions.flatMap((item) => item.dldOffer ? [{
      project: item.name,
      marketedWaiver: item.dldOffer.marketedWaiver,
      status: item.dldOffer.status,
      note: item.dldOffer.note,
      sourceLabel: item.dldOffer.sourceLabel,
      sourceUrl: item.dldOffer.sourceUrl,
    }] : []),
    standardCostProjects: eligibleDefinitions.filter((item) => !item.dldOffer).map((item) => item.name),
  },
  projects: presentationProjects,
};
await mkdir(dirname(PRESENTATION_DATA), { recursive: true });
await writeFile(PRESENTATION_DATA, `${JSON.stringify(presentationData, null, 2)}\n`);

function mimeType(file: string) {
  const extension = extname(file).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

const imageBinding = {
  input(stream: ReadableStream) {
    let resizeOptions: { width?: number; height?: number; fit?: string } = {};
    const transformer = {
      transform(options: { width?: number; height?: number; fit?: string }) {
        resizeOptions = options;
        return transformer;
      },
      async output(options: { quality?: number }) {
        const source = Buffer.from(await new Response(stream).arrayBuffer());
        const resize = resizeOptions.width || resizeOptions.height
          ? {
              width: resizeOptions.width,
              height: resizeOptions.height,
              fit: (resizeOptions.fit || (resizeOptions.height ? "cover" : "inside")) as keyof sharp.FitEnum,
              withoutEnlargement: false,
            }
          : undefined;
        const bytes = await sharp(source).rotate().resize(resize).jpeg({ quality: options.quality || 82, mozjpeg: true }).toBuffer();
        return {
          response: () => new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, {
            status: 200,
            headers: { "content-type": "image/jpeg", "content-length": String(bytes.byteLength) },
          }),
        };
      },
    };
    return transformer;
  },
};

const assetsBinding = {
  async fetch(input: Request | string) {
    const requestUrl = typeof input === "string" ? input : input.url;
    const url = new URL(requestUrl);
    let file = virtualFiles.get(decodeURIComponent(url.pathname));
    if (!file && /^\/(?:brand|team|emirates|insights|hero|project-document-previews)\//.test(url.pathname)) {
      file = resolve(ROOT, "public", decodeURIComponent(url.pathname).replace(/^\//, ""));
    }
    if (!file) return new Response("Not found", { status: 404 });
    try {
      const body = await readFile(file);
      return new Response(body, {
        status: 200,
        headers: { "content-type": mimeType(file), "content-length": String(body.byteLength) },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};

for (const file of virtualFiles.values()) await stat(file);
const pdf = await renderCuratedBriefPdf(document, { IMAGES: imageBinding, ASSETS: assetsBinding } as never);
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, Buffer.from(pdf));
const sqlValue = (value: string) => `'${value.replaceAll("'", "''")}'`;
const contentJson = JSON.stringify(document.content);
const contentChunks = Array.from({ length: Math.ceil(contentJson.length / 24_000) }, (_, index) => contentJson.slice(index * 24_000, (index + 1) * 24_000));
const portalSql = [
  `INSERT INTO hg_agent_documents (id, agent_email, library, type, title, client_name, content_json, status, created_at, updated_at) VALUES (${sqlValue(document.id)}, ${sqlValue(content.advisor.email)}, 'office', ${sqlValue(document.type)}, ${sqlValue(document.title)}, ${sqlValue(document.client_name)}, '', 'draft', ${sqlValue(document.created_at)}, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET agent_email = excluded.agent_email, library = excluded.library, type = excluded.type, title = excluded.title, client_name = excluded.client_name, content_json = '', status = excluded.status, updated_at = CURRENT_TIMESTAMP;`,
  ...contentChunks.map((chunk) => `UPDATE hg_agent_documents SET content_json = content_json || ${sqlValue(chunk)} WHERE id = ${sqlValue(document.id)};`),
].join("\n") + "\n";
await mkdir(dirname(PORTAL_SQL), { recursive: true });
await writeFile(PORTAL_SQL, portalSql);
console.log(JSON.stringify({ output: OUTPUT, portalSql: PORTAL_SQL, portalDocumentId: document.id, portalChunks: contentChunks.length, projects: reportProjects.length, bytes: pdf.byteLength }));
