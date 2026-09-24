export type SeoLandingPage = {
  slug: string;
  title: string;
  kicker: string;
  heading: string;
  emphasis: string;
  description: string;
  keywords: string[];
  projectFilter: {
    emirate?: string;
    type?: string;
    query?: string;
  };
  sections: Array<{
    title: string;
    body: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "off-plan-property-investment-dubai",
    title: "Off-Plan Property Investment Dubai",
    kicker: "Dubai off-plan investment",
    heading: "Compare off-plan property",
    emphasis: "before reservation.",
    description:
      "Compare Dubai off-plan property investment opportunities by developer, payment plan, handover, community, fees and live availability with PSR Homes.",
    keywords: ["off-plan property investment Dubai", "Dubai off-plan projects", "Dubai payment plan property", "Dubai new launch property"],
    projectFilter: { emirate: "Dubai", query: "Dubai off-plan" },
    sections: [
      {
        title: "What PSR checks first",
        body:
          "A strong off-plan decision starts with the developer, escrow and payment schedule, then tests the specific community, unit stack, handover timing, service-charge exposure and exit market.",
      },
      {
        title: "How to compare payment plans",
        body:
          "A lower booking amount can still require heavy liquidity during construction or handover. PSR compares the full cash path, including DLD, Oqood, agency, conveyancing and reasonable contingency assumptions.",
      },
      {
        title: "Where the value is usually proven",
        body:
          "The best opportunities tend to combine credible delivery, durable end-user demand, practical layouts, clear transport or employment links and supply that can still be absorbed by the market.",
      },
    ],
    faqs: [
      {
        question: "Is off-plan property in Dubai a good investment?",
        answer:
          "It can be, but only when the developer, payment structure, handover timing, community demand and unit-level pricing are reviewed together. PSR treats advertised ROI as a hypothesis, not a guarantee.",
      },
      {
        question: "What costs should I model before buying off-plan in Dubai?",
        answer:
          "Model the reservation amount, DLD or Oqood, agency and conveyancing costs, construction instalments, handover payment, furnishing or fit-out if relevant and a contingency reserve.",
      },
      {
        question: "Can foreign buyers invest in Dubai off-plan property?",
        answer:
          "Foreign buyers can purchase in designated freehold areas, but eligibility, payment method, documentation and mortgage availability should be confirmed before reservation.",
      },
    ],
  },
  {
    slug: "high-roi-dubai-property",
    title: "High ROI Dubai Property",
    kicker: "Yield and growth lens",
    heading: "Search for return",
    emphasis: "without chasing hype.",
    description:
      "Review high ROI Dubai property opportunities using PSR's evidence-led lens across rentability, service charges, resale depth, payment terms and community demand.",
    keywords: ["high ROI Dubai property", "Dubai rental yield property", "best ROI areas Dubai", "Dubai investment apartments"],
    projectFilter: { emirate: "Dubai", query: "ROI investment" },
    sections: [
      {
        title: "ROI is net, not just rent",
        body:
          "Headline rent only tells part of the story. PSR separates gross rent from service charges, vacancy, management costs, furnishing, financing and realistic resale liquidity.",
      },
      {
        title: "Demand must match the unit",
        body:
          "A high-yield studio, family townhouse and waterfront branded residence are different products. The right comparison set depends on the tenant, buyer pool and holding period.",
      },
      {
        title: "Evidence beats promises",
        body:
          "PSR prioritises comparable transactions, active supply, developer record, building quality and community fundamentals before treating any ROI claim as reliable.",
      },
    ],
    faqs: [
      {
        question: "Which Dubai areas have strong property ROI?",
        answer:
          "The answer changes by budget, unit type and holding period. Strong candidates often have transport access, tenant depth, efficient layouts and limited competing supply at the same price point.",
      },
      {
        question: "Should I choose the cheapest Dubai property for ROI?",
        answer:
          "Not automatically. A low entry price can be offset by weak demand, poor maintenance, high service charges, oversupply or limited resale liquidity.",
      },
      {
        question: "How does PSR calculate property ROI?",
        answer:
          "PSR compares expected rent against acquisition cost, fees, service charges, vacancy assumptions and operating costs, then reviews whether the result is supported by market evidence.",
      },
    ],
  },
  {
    slug: "dubai-property-investment",
    title: "Dubai Property Investment",
    kicker: "Dubai investment advisory",
    heading: "Invest in Dubai property",
    emphasis: "with evidence.",
    description:
      "Dubai property investment guidance from PSR across communities, developers, off-plan launches, completed assets, villas, apartments, fees and market timing.",
    keywords: ["Dubai property investment", "invest in Dubai real estate", "Dubai real estate investment advisory", "Dubai property broker"],
    projectFilter: { emirate: "Dubai" },
    sections: [
      {
        title: "Start with the objective",
        body:
          "A buyer seeking rental income, lifestyle use, capital growth or Golden Visa eligibility needs a different shortlist. PSR structures the brief before selecting projects.",
      },
      {
        title: "Community quality matters",
        body:
          "Schools, hospitals, business districts, beaches, transport, retail, green space and future infrastructure all change demand. A good project in the wrong micro-market can underperform.",
      },
      {
        title: "Developer and document review",
        body:
          "The investment case is not complete until delivery record, title structure, payment schedule, service charges, unit statement and purchase documentation have been reviewed.",
      },
    ],
    faqs: [
      {
        question: "What is the best property investment in Dubai?",
        answer:
          "There is no single best asset. The right Dubai property depends on budget, timeline, desired income, financing, risk tolerance and whether the buyer needs lifestyle use or pure investment.",
      },
      {
        question: "Are Dubai villas or apartments better for investment?",
        answer:
          "Apartments often provide broader rental liquidity at lower ticket sizes, while villas can benefit from family demand and scarcity. The decision depends on community, budget and exit strategy.",
      },
      {
        question: "Why use a Dubai property advisor?",
        answer:
          "A good advisor narrows the market, validates live availability, compares hidden costs, checks documentation and challenges assumptions before a buyer commits capital.",
      },
    ],
  },
  {
    slug: "uae-property-investment",
    title: "UAE Property Investment",
    kicker: "UAE and MENA investor lens",
    heading: "Compare the UAE",
    emphasis: "emirate by emirate.",
    description:
      "UAE property investment research for Dubai, Abu Dhabi, Ras Al Khaimah, Sharjah and the wider Emirates with PSR's project, community and market intelligence.",
    keywords: ["UAE property investment", "MENA real estate investment", "UAE real estate market", "UAE property broker"],
    projectFilter: {},
    sections: [
      {
        title: "One country, different markets",
        body:
          "Dubai, Abu Dhabi, Ras Al Khaimah, Sharjah and the Northern Emirates have different demand engines, legal contexts, tourism drivers and investment time horizons.",
      },
      {
        title: "Infrastructure drives demand",
        body:
          "Airports, rail, ports, business districts, cultural assets, universities, hospitals and hospitality projects can shift long-term demand, but timing and delivery status must be verified.",
      },
      {
        title: "Use the UAE Market Atlas",
        body:
          "PSR connects national strategy, emirate-level market context and individual project records so investors can avoid treating a single headline as the full investment case.",
      },
    ],
    faqs: [
      {
        question: "Which UAE emirate is best for property investment?",
        answer:
          "It depends on budget, risk tolerance, holding period and product type. Dubai is deep and liquid, Abu Dhabi is institutionally anchored, and Ras Al Khaimah has tourism-led growth themes.",
      },
      {
        question: "Can overseas buyers invest in UAE property?",
        answer:
          "Overseas buyers can purchase in many designated areas, but rules differ by emirate and project. Documentation, payment transfer, mortgage eligibility and ownership structure should be checked.",
      },
      {
        question: "Does PSR cover more than Dubai?",
        answer:
          "Yes. PSR covers Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, Ajman, Umm Al Quwain and Fujairah through its UAE project index and market atlas.",
      },
    ],
  },
  {
    slug: "dubai-villas",
    title: "Dubai Villas for Investment and Family Living",
    kicker: "Dubai villa search",
    heading: "Find Dubai villas",
    emphasis: "that make sense.",
    description:
      "Compare Dubai villas and family-led communities by bedrooms, budget, schools, hospitals, commute routes, developer quality, handover timing and investment logic.",
    keywords: ["Dubai villas", "Dubai villa investment", "family communities Dubai", "Dubai townhouses and villas"],
    projectFilter: { emirate: "Dubai", type: "Villa" },
    sections: [
      {
        title: "Villa logic is different",
        body:
          "A villa buyer usually needs bedrooms, parking, privacy, schools, healthcare, green space and commute logic. PSR avoids mismatching villa briefs with apartment-style inventory.",
      },
      {
        title: "Family demand supports liquidity",
        body:
          "Established family communities can offer durable end-user demand, but service charges, plot size, layout efficiency, handover phase and competing supply still matter.",
      },
      {
        title: "Budget realism matters",
        body:
          "Villa recommendations should stay realistic. A mansion-level request requires a mansion-level budget, while lower budgets may fit townhouses or emerging master communities instead.",
      },
    ],
    faqs: [
      {
        question: "Where should families look for villas in Dubai?",
        answer:
          "Families often compare school access, commute time, parks, healthcare, retail and community maturity before choosing between established and emerging villa districts.",
      },
      {
        question: "Are two-bedroom villas common in Dubai?",
        answer:
          "Two-bedroom villa-style homes exist in some townhouse formats, but true villas and mansions usually carry more bedrooms and higher budgets.",
      },
      {
        question: "What should I check before buying a Dubai villa?",
        answer:
          "Check title, plot and built-up area, service charges, maintenance condition, handover timing, developer record, community fees, commute and comparable resale evidence.",
      },
    ],
  },
];

export function getSeoLandingPage(slug: string) {
  return seoLandingPages.find((page) => page.slug === slug) || null;
}
