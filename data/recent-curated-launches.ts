import type { CuratedLaunch } from "@/data/curated-launches";

const WRAITH_EXTERIORS = [
  "https://binghattiweb.imgix.net/binghatti-wraith-hero-banner-new.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-exterior-1.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-exterior-2.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-exterior-3.webp",
];
const WRAITH_INTERIORS = [
  "https://binghattiweb.imgix.net/binghatti-wraith-living-room.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-bedroom.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-lobby-1.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-lobby-2.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-lobby-3.webp",
];
const WRAITH_AMENITIES = [
  "https://binghattiweb.imgix.net/binghatti-wraith-amenities-1.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-amenities-2.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-amenities-3.webp",
];
const WRAITH_FLOORPLANS = [
  "https://binghattiweb.imgix.net/binghatti-wraith-studio-layout.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-one-bedroom-layout.webp",
  "https://binghattiweb.imgix.net/binghatti-wraith-two-bedroom-layout.webp",
];
const VALIA_EXTERIORS = [
  "https://img3.creatium.ru/disk2/46/f5/97/dd7063ffafa48cf27ef538f8a1b17bc340/img153.jpg",
  "https://img3.creatium.ru/disk2/72/8e/fb/c1e868548d384fd2dcb624cc09dc011c7b/img151.jpg",
  "https://img3.creatium.ru/disk2/b7/b4/b8/a014ec85a61c9d85acebb09b10c53eb478/img155.jpg",
  "https://img3.creatium.ru/disk2/29/66/42/c9ec5c28471cce292283fd7806524f2540/img65.jpg",
  "https://img3.creatium.ru/disk2/50/0a/7b/ed2123b9e741c2f39aecb28dc685422e14/12.jpg",
];
const VALIA_INTERIORS = [
  "https://img3.creatium.ru/disk2/ef/99/43/88f1407bae4e22ba913dbcb3a4409171cb/img149.jpg",
  "https://img3.creatium.ru/disk2/29/ee/fd/3eed0e77753fd1ef0a38c1d70187bb4808/img157.jpg",
];
const CANOPIES_EXTERIORS = [
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_welcome_background_desktop.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_highlights_background_desktop.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_destination_background_desktop.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_background_desktop.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_1.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_2.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_3.webp",
];
const CANOPIES_INTERIORS = [
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_4.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_5.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_6.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_7.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_8.webp",
  "https://asset.aldar.com/damascus/launch/yas-canopies/canopies_gallery_slide_9.webp",
];
const CANOPIES_FLOORPLANS = [
  "https://img3.creatium.ru/disk2/c1/5c/a0/ac044a37050006a1a68536668463691d38/studio_type_1a_dim.jpg",
  "https://img3.creatium.ru/disk2/3a/fe/e8/30302668631c8b2c246c749627c2b52036/1_bed_type_1a_dim.jpg",
  "https://img3.creatium.ru/disk2/1f/32/2c/01c54d29da5eaf3b95d40c5b13c07cae77/2_bed_m_type_2a_dim.jpg",
  "https://img3.creatium.ru/disk2/a6/bb/67/8371943ab9cab6f50eda46315f10db78e1/3_bed_m_type_1_dim.jpg",
];
const GOLF_EXTERIORS = [
  "/projects/golf-trails/hero.jpg",
  "/projects/golf-trails/exterior-01.jpg",
  "/projects/golf-trails/exterior-02.jpg",
];
const GOLF_INTERIORS = [
  "/projects/golf-trails/interior-01.jpg",
  "/projects/golf-trails/interior-02.jpg",
];
const GOLF_FLOORPLANS = [
  "/projects/golf-trails/floorplan-1br.jpg",
  "/projects/golf-trails/floorplan-2br.jpg",
];
const MIRA_MEDIA = [
  "https://mira.static.bigapp.ae/1_15e8845fbe_051aab9432.webp",
  "https://mira.static.bigapp.ae/2_2bbe91549b_98f112516f.webp",
  "https://mira.static.bigapp.ae/3_deb37e99e3_459199a85c.webp",
  "https://mira.static.bigapp.ae/5_4bb3548e53_c965cdf640.webp",
  "https://mira.static.bigapp.ae/11bg_2031910f9e_0ce5c91ed4.webp",
];
const ARCHIVE_HERO = "https://haus-grace-assets.thekeifferjapeth.workers.dev/the-archive/hero-montage-v1.jpg";
const ARCHIVE_INTERIORS = [
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ECcGtzNwgS4M89qiK1xeZ8PoGw/hf_20260730_172204_0d40bff0-3441-4125-8e0f-6f85a39f2688.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ECcGtzNwgS4M89qiK1xeZ8PoGw/hf_20260730_172212_281d2a3e-46ca-4616-849f-c08aa3911f89.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ECcGtzNwgS4M89qiK1xeZ8PoGw/hf_20260730_170948_cf28c0d4-5306-478a-87a5-b17b368a8ca3.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ECcGtzNwgS4M89qiK1xeZ8PoGw/hf_20260730_172219_d3ee4014-8dd0-4177-b838-3af8d4b9eefc.png",
];

export const recentCuratedLaunches = [
  {
    slug: "the-archive-by-imtiaz", name: "The Archive by Imtiaz", developer: "Imtiaz Developments", developerDisplay: "Imtiaz Developments", emirate: "Dubai", area: "Dubai Land Residence Complex (DLRC)", startingPrice: "666000", paymentPlan: "50/50", handover: "Q3 2028", image: ARCHIVE_HERO, brochure: "", bedrooms: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"], propertyTypes: ["Apartments"], lifestyles: ["Design-led living", "Urban living", "Freehold investment"], coordinates: "", archived: false,
    description: "The Archive by Imtiaz is a freehold DLRC residence built around a working two-storey library, with studios to three-bedroom homes and a carefully staged collection of reading, wellness and rooftop amenities.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "384–1,884 sq ft", statusLabel: "Now launched",
    releaseNote: "Commercial information checked 5 August 2026 against the project microsite, which attributes its figures to the developer brochure. The displayed 50/50 schedule is the standard plan; a 60/40 post-handover alternative is also published. Prices, unit allocation and instalment dates remain subject to developer confirmation.",
    unitPricing: [
      { residence: "Studio", startingPrice: "From AED 666,000", size: "384–426 sq ft" },
      { residence: "1 Bedroom Compact", startingPrice: "From AED 979,000", size: "546–1,053 sq ft" },
      { residence: "1 Bedroom Executive", startingPrice: "From AED 979,000", size: "605–1,234 sq ft" },
      { residence: "2 Bedroom", startingPrice: "From AED 1,550,000", size: "1,022–1,686 sq ft" },
      { residence: "3 Bedroom", startingPrice: "From AED 1,900,000", size: "1,305–1,884 sq ft" },
    ],
    overview: [
      "The building is configured as basement, ground floor, three podium levels, thirteen residential floors and a roof. Its defining arrival sequence replaces the conventional lobby with two levels of shelves, a spiral stair and a working collection of approximately ten thousand books.",
      "Five residence typologies are supported by a Reading Lounge, Writer’s Room and rooftop Reading Salon, alongside pools, fitness, landscaped gathering spaces and family amenities. The DLRC location connects to Al Ain Road, Emirates Road and Dubai’s academic and technology districts.",
    ],
    gallery: [ARCHIVE_HERO, ...ARCHIVE_INTERIORS], interiors: ARCHIVE_INTERIORS, exteriors: [], floorplans: [],
    amenities: ["Two-storey working library", "Reading Lounge", "Writer’s Room", "Rooftop Reading Salon", "Adult rooftop pool", "Children’s rooftop pool", "Fitness centre", "Outdoor cinema", "Rooftop barbecue lounge", "Floating cabanas", "Mini golf", "Children’s play and pets’ areas"],
    investmentPoints: ["A clearly differentiated library-led identity within DLRC’s expanding freehold apartment market.", "A published configuration ladder from studios through three-bedroom residences, with areas disclosed by typology.", "Two published payment options provide a standard completion balance or an extended post-handover structure, subject to the final sale documents.", "The DLRC position connects residential demand with Dubai Academic City, Silicon Oasis and the city’s arterial road network."],
    travelTimes: [{ minutes: "5", destination: "Dubai Academic City" }, { minutes: "5", destination: "Dubai Outlet Mall" }, { minutes: "10", destination: "Global Village" }, { minutes: "15", destination: "Mohammed Bin Rashid Library" }, { minutes: "20", destination: "Downtown Dubai" }, { minutes: "20", destination: "Dubai International Airport" }],
    sourceUrl: "https://thearchivedlrc.com/", sourceLabel: "Project microsite; figures attributed to the developer brochure",
  },
  {
    slug: "binghatti-wraith-al-jaddaf-dubai", name: "Binghatti Wraith", developer: "Binghatti", developerDisplay: "Binghatti", emirate: "Dubai", area: "Al Jaddaf, Dubai", startingPrice: "799999", paymentPlan: "50/50", handover: "To be confirmed", image: WRAITH_EXTERIORS[0], brochure: "", bedrooms: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"], propertyTypes: ["Apartments"], lifestyles: ["Urban living", "High-rise living", "Investment"], coordinates: "", archived: false,
    description: "Binghatti Wraith is an Al Jaddaf residential tower with studios and one- to three-bedroom apartments, a crystalline glass façade, skyline-facing residences and an extensive wellness and recreation programme.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "Configuration dependent", statusLabel: "New launch",
    releaseNote: "Pricing and residence information checked 5 August 2026 against Binghatti’s official project page. The published entry price is AED 799,999 and the displayed payment split is 50/50. Handover timing and live inventory require direct developer confirmation.",
    unitPricing: [{ residence: "Studio", startingPrice: "From AED 799,999", size: "On request" }, { residence: "1 Bedroom", startingPrice: "From AED 1,299,999", size: "From 662 sq ft" }, { residence: "2 Bedroom", startingPrice: "From AED 2,099,999", size: "From 1,112 sq ft" }, { residence: "3 Bedroom", startingPrice: "On request", size: "On request" }],
    overview: ["The tower is arranged across a ground floor, four podium levels, fourteen residential floors and a roof. Its faceted glazing and framed balconies are designed around broad views toward Burj Khalifa, Dubai Frame and the wider city skyline.", "Al Jaddaf places the project between Downtown Dubai, Dubai Healthcare City and the cultural corridor around Mohammed Bin Rashid Library and Dubai Design District, with direct access to Sheikh Zayed Road and Al Khail Road."],
    gallery: [...WRAITH_EXTERIORS, ...WRAITH_INTERIORS, ...WRAITH_AMENITIES], interiors: WRAITH_INTERIORS, exteriors: WRAITH_EXTERIORS, floorplans: WRAITH_FLOORPLANS,
    amenities: ["Infinity pool and private cabanas", "Jacuzzi and spa area", "Gym and fitness centre", "Yoga deck", "Padel court", "Half basketball court", "Landscaped palm promenade", "Family barbecue area", "Children’s play areas", "EV charging stations"],
    investmentPoints: ["An accessible published entry point within an established central Dubai district.", "A studio-to-three-bedroom mix broadens the potential end-user and leasing audience.", "Al Jaddaf combines road, metro and airport connectivity with proximity to Downtown and Dubai Healthcare City.", "The 50/50 structure retains half of the purchase price for completion, subject to the final developer schedule."],
    travelTimes: [{ minutes: "6", destination: "Downtown Dubai" }, { minutes: "8", destination: "Dubai International Airport" }, { minutes: "8", destination: "Zabeel Palace" }, { minutes: "10", destination: "DIFC" }],
    sourceUrl: "https://www.binghatti.com/en/projects/binghatti-wraith", sourceLabel: "Binghatti official project page",
  },
  {
    slug: "valia-dubai-creek-harbour-emaar-dubai", name: "Valia at Dubai Creek Harbour", developer: "Emaar Properties", developerDisplay: "Emaar Properties", emirate: "Dubai", area: "Dubai Creek Harbour, Dubai", startingPrice: "2140000", paymentPlan: "80/20", handover: "December 2030", image: VALIA_EXTERIORS[0], brochure: "https://new-projects-media.propertyfinder.com/project/d1294890-1250-48b7-99e3-4f34a371b967/brochure/application/yO6sog2GsPh8CuQgU-evJ7oC0En8BaBOHPmPGdDy78Q%3D/original.pdf", bedrooms: ["1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom"], propertyTypes: ["Apartments"], lifestyles: ["Waterfront living", "High-rise living", "Investment"], coordinates: "", archived: false,
    description: "Valia is an Emaar residential tower at Dubai Creek Harbour with 491 one- to four-bedroom apartments, positioned beside Dubai Square and the creek-front promenade, marina and park network.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "821–2,561 sq ft", statusLabel: "New launch",
    releaseNote: "Launch information checked 5 August 2026. Published guidance records an AED 2.14 million entry point, an 80/20 construction-linked schedule and December 2030 completion. Live inventory, exact unit pricing and reservation terms require confirmation.",
    unitPricing: [{ residence: "1 Bedroom", startingPrice: "From AED 2,140,000", size: "From 821 sq ft" }, { residence: "2 Bedroom", startingPrice: "On request", size: "Within the published residence range" }, { residence: "3 Bedroom", startingPrice: "On request", size: "Within the published residence range" }, { residence: "4 Bedroom", startingPrice: "Up to approximately AED 7,050,000", size: "Up to 2,561 sq ft" }],
    overview: ["The announced tower comprises 491 residences across a 56-storey composition, with layouts extending from approximately 821 to 2,561 square feet. The one- to four-bedroom range is supported by landscaped podium and family amenities.", "Its Dubai Creek Harbour position places Dubai Square beside the tower and connects residents to the creek promenade, marina and central park. Downtown Dubai and Dubai International Airport remain within the project’s wider urban catchment."],
    gallery: [VALIA_EXTERIORS[0], VALIA_INTERIORS[0], ...VALIA_EXTERIORS.slice(1, 4), VALIA_INTERIORS[1], ...VALIA_EXTERIORS.slice(4)], interiors: VALIA_INTERIORS, exteriors: VALIA_EXTERIORS, floorplans: [],
    amenities: ["Swimming pool", "Fitness centre", "Landscaped parks", "Children’s play areas", "Barbecue areas", "Retail and dining", "Creek promenade", "Marina access"],
    investmentPoints: ["A one- to four-bedroom collection by the master developer of Dubai Creek Harbour.", "Direct adjacency to Dubai Square adds a major retail and entertainment component to the location brief.", "The wider community combines established waterfront public realm with continuing transport and destination investment.", "The 80/20 schedule retains 20% of the purchase price for handover in December 2030."],
    travelTimes: [{ minutes: "10–15", destination: "Downtown Dubai" }, { minutes: "15", destination: "Dubai International Airport" }],
    sourceUrl: "https://opr.ae/projects/valia-dubai-creek-harbour-emaar-dubai", sourceLabel: "Published launch information; community details cross-checked with Emaar",
  },
  {
    slug: "the-canopies-yas-point-aldar-yas-island-abu-dhabi", name: "The Canopies at Yas Point", developer: "Aldar", developerDisplay: "Aldar", emirate: "Abu Dhabi", area: "Yas Point, Yas Island", startingPrice: "1650000", paymentPlan: "55/45", handover: "Q3 2030", image: CANOPIES_EXTERIORS[0], brochure: "", bedrooms: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"], propertyTypes: ["Apartments"], lifestyles: ["Waterfront living", "Resort living", "Family living"], coordinates: "", archived: false,
    description: "The Canopies is the first residential address at Yas Point, bringing 592 studio to three-bedroom apartments across six mid-rise buildings within a park-centred waterfront setting on northern Yas Island.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "46–184 sq m", statusLabel: "New launch",
    releaseNote: "Information checked 5 August 2026 against Aldar’s official release. Aldar publishes an AED 1.65 million entry point, 55/45 payment plan, 5% down payment and 2030 handover. Q3 timing is current launch guidance and should be reconfirmed in the reservation documents.",
    unitPricing: [{ residence: "Studio", startingPrice: "From AED 1,650,000", size: "Within the 46–184 sq m collection" }, { residence: "1 Bedroom", startingPrice: "On request", size: "Within the 46–184 sq m collection" }, { residence: "2 Bedroom", startingPrice: "On request", size: "Within the 46–184 sq m collection" }, { residence: "3 Bedroom + maid’s room", startingPrice: "On request", size: "Within the 46–184 sq m collection" }],
    overview: ["The development comprises 592 apartments across six mid-rise buildings and more than 20,000 square metres of landscaped open space. Homes are arranged around a central park with views across the community and waterfront setting.", "Yas Point is planned around a beach, marina, promenade, dining, retail and connected walking and cycling routes. The Canopies places residents near Yas Island’s established attractions while introducing a more residential northern waterfront address."],
    gallery: [...CANOPIES_EXTERIORS, ...CANOPIES_INTERIORS], interiors: CANOPIES_INTERIORS, exteriors: CANOPIES_EXTERIORS, floorplans: CANOPIES_FLOORPLANS,
    amenities: ["Two resort-style swimming pools", "Two fitness centres", "Residents’ social lounge", "Co-working lounges", "Outdoor yoga pavilion", "Outdoor kitchen and dining", "Digital detox room", "Treatment and wellness space", "Children’s splash pool", "Retail and dining"],
    investmentPoints: ["The first residential release within Aldar’s new Yas Point waterfront destination.", "A finite collection of 592 apartments set across six mid-rise buildings rather than a single high-rise tower.", "The park, beach, marina and promenade programme broadens the address beyond a standalone residential development.", "A 55/45 schedule with a published 5% down payment stages acquisition capital through the construction period."],
    travelTimes: [], sourceUrl: "https://www.aldar.com/properties/en/yascanopies", sourceLabel: "Aldar official project page",
  },
  {
    slug: "golf-trails-emaar-emaar-south-dubai", name: "Golf Trails at Emaar South", developer: "Emaar Properties", developerDisplay: "Emaar Properties", emirate: "Dubai", area: "Emaar South, Dubai", startingPrice: "1250000", paymentPlan: "80/20", handover: "October 2030", image: GOLF_EXTERIORS[0], brochure: "", bedrooms: ["1 Bedroom", "2 Bedroom", "3 Bedroom"], propertyTypes: ["Apartments", "Townhouses"], lifestyles: ["Golf living", "Family living", "Investment"], coordinates: "24.8627389,55.1414705", archived: false,
    description: "Golf Trails is an Emaar South collection of 161 one- to three-bedroom apartments and three-bedroom townhouses positioned around the community’s 18-hole championship golf course.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "719–2,610 sq ft", statusLabel: "New launch",
    releaseNote: "Project information checked 5 August 2026 against Emaar’s official project page and published launch material. Prices begin at AED 1.25 million, with an 80/20 plan and October 2030 handover. Unit-specific availability and final areas require confirmation.",
    unitPricing: [{ residence: "1 Bedroom apartment", startingPrice: "From AED 1,250,000", size: "719–755 sq ft" }, { residence: "2 Bedroom apartment", startingPrice: "From AED 1,810,000", size: "1,096–1,484 sq ft" }, { residence: "3 Bedroom apartment", startingPrice: "From AED 2,710,000", size: "1,605–1,969 sq ft" }, { residence: "3 Bedroom townhouse", startingPrice: "From AED 5,250,000", size: "2,603–2,610 sq ft" }],
    overview: ["The residence mix comprises 55 one-bedroom apartments, 83 two-bedroom apartments, 17 three-bedroom apartments and six three-bedroom townhouses. Open-plan interiors, full-height glazing and a restrained material palette are oriented toward the golf landscape.", "Emaar South is positioned beside Expo City Dubai and Al Maktoum International Airport. Its established master plan combines the championship course with parks, education, healthcare, retail and everyday community infrastructure."],
    gallery: [...GOLF_EXTERIORS.slice(0, 6), ...GOLF_INTERIORS, ...GOLF_EXTERIORS.slice(6)], interiors: GOLF_INTERIORS, exteriors: GOLF_EXTERIORS, floorplans: GOLF_FLOORPLANS,
    amenities: ["18-hole championship golf course", "Golf clubhouse and driving range", "Infinity pool", "Adult and children’s pools", "Fitness centre", "Sports and padel courts", "Yoga areas", "Children’s play area", "Barbecue zones", "Multipurpose room", "Open lawns", "Community retail and services"],
    investmentPoints: ["A limited 161-home release with direct golf-course positioning.", "Bedroom-level prices and size ranges make the acquisition ladder transparent across apartments and townhouses.", "Emaar South’s proximity to Expo City and Al Maktoum International Airport supports a long-term employment and infrastructure brief.", "The 80/20 plan retains 20% of the purchase price for handover in October 2030."],
    travelTimes: [{ minutes: "5", destination: "Al Maktoum International Airport" }, { minutes: "10", destination: "Expo City Dubai" }, { minutes: "30", destination: "Dubai Marina" }, { minutes: "35", destination: "Downtown Dubai" }, { minutes: "45", destination: "Dubai International Airport" }],
    sourceUrl: "https://www.emaar.com/en/properties/golf-trails-at-emaar-south", sourceLabel: "Emaar official project page and published launch material",
  },
  {
    slug: "mira-coral-bay-al-mairid-ras-al-khaimah", name: "Mira Coral Bay", developer: "Mira Developments & Marjan", developerDisplay: "Mira Developments & Marjan", emirate: "Ras Al Khaimah", area: "Al Mairid, Ras Al Khaimah", startingPrice: "580000", startingPriceLabel: "Expected from AED 580,000", paymentPlan: "On request", handover: "To be confirmed", image: MIRA_MEDIA[0], brochure: "", bedrooms: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"], propertyTypes: ["Apartments", "Townhouses", "Villas"], lifestyles: ["Waterfront living", "Branded residences", "Resort living"], coordinates: "", archived: false,
    description: "Mira Coral Bay is a 220,000 square metre branded waterfront community in Al Mairid, bringing apartments, townhouses and villas together with five-star hospitality, beach clubs, dining and a yacht-club lifestyle.",
    sourceUpdatedAt: "2026-08-05T00:00:00.000Z", areaFrom: "Configuration dependent", statusLabel: "Announced community",
    releaseNote: "The community programme was checked 5 August 2026 against Mira Developments’ official page. Mira currently presents pricing on request; the displayed AED 580,000 figure is expected launch guidance and is not a confirmed live price. Payment plan, handover and individual unit schedules remain unannounced.",
    unitPricing: [{ residence: "Studio apartment", startingPrice: "Expected from AED 580,000", size: "On request" }, { residence: "Larger apartments", startingPrice: "On request", size: "On request" }, { residence: "Townhouses", startingPrice: "On request", size: "On request" }, { residence: "Villas", startingPrice: "On request", size: "On request" }],
    overview: ["The current master plan brings together 400 apartments, 100 townhouses and 124 villas associated with fourteen international brands. Residences are planned as fully furnished homes with branded interiors and hotel-style services.", "The coastal programme combines five-star hotels, two branded beach clubs, fine dining, parking and public art within a connected waterfront setting. Al Mairid places the community approximately ten minutes from central Ras Al Khaimah."],
    gallery: MIRA_MEDIA, interiors: [], exteriors: MIRA_MEDIA, floorplans: [],
    amenities: ["Two branded beach clubs", "Five-star hotels", "Fine-dining restaurants", "Yacht club", "Fully furnished branded interiors", "Hotel-style resident services", "Art gallery", "Shared waterfront podium", "Underground parking", "Landscaped coastal walkways"],
    investmentPoints: ["A large-scale joint-venture waterfront destination rather than a single-building release.", "A mixed residence programme spanning apartments, townhouses and villas broadens the project’s end-user profile.", "Fourteen branded concepts, hospitality and beach-club infrastructure create a distinct furnished-residence proposition.", "Commercial terms remain early-stage; price, payment schedule and handover should be treated as unconfirmed until the developer issues final documents."],
    travelTimes: [{ minutes: "10", destination: "Downtown Ras Al Khaimah" }], sourceUrl: "https://miradevelopments.ae/communities/mira-coral-bay", sourceLabel: "Mira Developments official community page",
  },
] satisfies CuratedLaunch[];
