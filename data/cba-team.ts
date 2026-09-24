import { cbaCompany } from "@/data/cba-company";

export type CbaTeamMember = {
  slug: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  image: string;
  fallbackImage: string;
  specialty: string;
  copy: string;
  facts: string[];
  languages: string[];
  saleProperties: number;
  rentProperties: number;
  sourceUrl: string;
  profileKind: "advisor" | "operations";
};

const sourceProfileUrl = "https://www.psrhomes.ae/about-us";
const generalBio = "A PSR property consultant focused on clear briefs, practical market context and steady transaction support for UAE property clients.";
const leadershipBio = "A PSR leader focused on accountable advice, clear client briefs and coordinated transaction support across the UAE property market.";
const accountingBio = "PSR's Head Accountant, supporting accurate financial records, transaction accounting and dependable operational controls across the business.";
const officeCoordinationBio = "PSR's Office Coordinator, supporting day-to-day administration, team coordination and dependable operational follow-through across the business.";
const placeholderImage = "/team/psr-advisors/placeholder.svg";

type ProfileOptions = {
  copy?: string;
  email?: string;
  facts?: string[];
  languages?: string[];
  profileKind?: CbaTeamMember["profileKind"];
};

function profile(
  slug: string,
  name: string,
  role: string,
  fallbackImage: string,
  specialty: string,
  options: ProfileOptions = {},
): CbaTeamMember {
  return {
    slug,
    name,
    role,
    email: options.email || `${slug.split("-")[0]}@psrhomes.ae`,
    phone: cbaCompany.phone,
    image: `/api/agent/avatar/${slug}`,
    fallbackImage,
    specialty,
    copy: options.copy || generalBio,
    facts: options.facts || (role.includes("Managing") ? ["PSR leadership", "Private client advisory"] : ["Property consultation", "Client coordination"]),
    languages: options.languages || ["English", "Hindi"],
    saleProperties: 0,
    rentProperties: 0,
    sourceUrl: sourceProfileUrl,
    profileKind: options.profileKind || "advisor",
  };
}

const cbaTeamProfiles: CbaTeamMember[] = [
  profile("sourabh-das", "Sourabh Das", "Property Consultant", "/team/psr-advisors/sourabh-das.webp", "Residential property consultation"),
  profile("majhar-khan", "Mazhar Khan", "Property Consultant", "/team/psr-advisors/mazhar-khan.webp", "Buyer and investor property consultation"),
  profile("louay-betengane", "Louay Betengane", "Property Consultant", "/team/psr-advisors/louay-betengane.webp", "Residential and investment property consultation", { languages: ["English", "Arabic"] }),
  profile("rohit-kumar-sinha", "Rohit Kumar Sinha", "Property Consultant", "/team/psr-advisors/rohit-kumar-sinha.webp", "Residential property consultation"),
  profile("parv-sondhi", "Parv Sondhi", "Managing Partner", "/team/psr-advisors/adhiyaman-aathimulam.webp", "Private client advisory and brokerage leadership", { copy: leadershipBio }),
  profile("adhiyaman-aathimulam", "Adhiyaman Aathimulam", "Property Consultant", "/team/psr-advisors/parv-sondhi.webp", "Dubai property search and client service"),
  profile("sonu-sharma", "Sonu Sharma", "Managing Director", "/team/psr-advisors/sonu-sharma.webp", "Company direction and private client advisory", { copy: leadershipBio }),
  profile("prateek-rawal", "Prateek Rawal", "Managing Partner", "/team/psr-advisors/prateek-rawal.webp", "Private client advisory and brokerage leadership", { copy: leadershipBio }),
  profile("reegan-negi", "Reegan Negi", "Managing Partner", "/team/psr-advisors/reegan-negi.webp", "Brokerage leadership and residential advisory", { copy: leadershipBio }),
  profile("jumanah", "Jumanah", "Managing Partner", "/team/psr-advisors/jummanah.webp", "Dubai South investment briefs and private client advisory", {
    email: "jumanah@psrhomes.ae",
    copy: "PSR Homes provides evidence-led private client advisory under Jumanah's leadership. We structure Dubai South and wider UAE project comparisons around unit economics, current documentation, acquisition costs, completed-property rental analysis and transaction execution. Off-plan reviews focus on price, fees, payment timing and delivery evidence. Prices, inventory, incentives, fees, service charges, completion dates and commercial terms may change and require current written confirmation.",
    facts: ["PSR leadership", "Dubai South investment briefs", "Ready and off-plan comparison", "Transaction coordination"],
    languages: ["English", "Arabic"],
  }),
  profile("neshva-chundayil", "Neshva Chundayil", "Head Accountant", "/team/psr-advisors/neshva-chundayil.webp", "Finance operations and transaction accounting", {
    copy: accountingBio,
    email: cbaCompany.email,
    facts: ["Finance operations", "Transaction accounting"],
    profileKind: "operations",
  }),
  profile("janet-genabio", "Janet Genabio", "Office Coordinator", "/team/psr-advisors/janet-genabio.webp", "Office coordination and administrative operations", {
    copy: officeCoordinationBio,
    facts: ["Office coordination", "Team administration"],
    languages: ["English", "Filipino"],
    profileKind: "operations",
  }),
  profile("pratham-raval", "Pratham Raval", "Property Consultant", "/team/psr-advisors/pratham-raval.webp", "Residential property consultation"),
  profile("ujwal-kumar", "Ujwal Kumar", "Property Consultant", "/team/psr-advisors/ujwal-kumar.webp", "Buyer and investor property consultation"),
  profile("harna-raval", "Harna Raval", "Property Consultant", placeholderImage, "Residential property consultation"),
];

// Public and authenticated surfaces share this single roster and order.
const publicTeamOrder = [
  "sonu-sharma",
  "prateek-rawal",
  "reegan-negi",
  "parv-sondhi",
  "jumanah",
  "neshva-chundayil",
  "janet-genabio",
  "sourabh-das",
  "majhar-khan",
  "louay-betengane",
  "rohit-kumar-sinha",
  "adhiyaman-aathimulam",
  "pratham-raval",
  "ujwal-kumar",
  "harna-raval",
];

export const cbaTeam: CbaTeamMember[] = publicTeamOrder
  .map((slug) => cbaTeamProfiles.find((member) => member.slug === slug))
  .filter((member): member is CbaTeamMember => Boolean(member));

const legacyTeamSlugs: Record<string, string> = {
  jummanah: "jumanah",
  pratheek: "prateek-rawal",
  "pratheek-rawal": "prateek-rawal",
  prateek: "prateek-rawal",
};

export function canonicalCbaTeamSlug(slug: string) {
  return legacyTeamSlugs[slug] || slug;
}

export function cbaTeamMember(slug: string) {
  const canonicalSlug = canonicalCbaTeamSlug(slug);
  return cbaTeam.find((member) => member.slug === canonicalSlug);
}
