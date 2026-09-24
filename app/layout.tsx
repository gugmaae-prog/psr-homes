import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DeferredConcierge } from "@/components/DeferredConcierge";
import { SiteMotion } from "@/components/SiteMotion";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { LanguageExperience } from "@/components/LanguageExperience";
import { withBasePath } from "@/lib/base-path";
import { PSR_SEO_TOPICS, PSR_SERVICE_AREAS, SITE_ORIGIN, seoKeywords } from "@/lib/seo";
import { cbaCompany } from "@/data/cba-company";
import { ThemeToggle, themeBootScript } from "@/components/ThemeToggle";
import "./globals.css";
import "./psr-public-neutral.css";
import "./psr-theme.css";

const inter = Inter({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "PSR | UAE Real Estate & Investment", template: "%s | PSR" },
  description: "Dubai and UAE real estate advisory for off-plan property investment, high-ROI opportunities, villas, communities, developers and market research.",
  applicationName: cbaCompany.displayName,
  category: "real estate",
  keywords: seoKeywords("private-client real estate advisory", "Dubai off-plan investment advisor"),
  authors: [{ name: cbaCompany.displayName }],
  creator: cbaCompany.displayName,
  publisher: cbaCompany.displayName,
  icons: {
    icon: [
      { url: withBasePath("/favicon-light-32.png?v=psr-theme-20260822"), type: "image/png", sizes: "32x32" },
      { url: withBasePath("/favicon-light-512.png?v=psr-theme-20260822"), type: "image/png", sizes: "512x512" },
    ],
    shortcut: withBasePath("/favicon-light-32.png?v=psr-theme-20260822"),
    apple: [{ url: withBasePath("/apple-touch-icon-light.png?v=psr-theme-20260822"), type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: SITE_ORIGIN,
    siteName: "PSR",
    title: "PSR | UAE Real Estate & Investment",
    description: "Dubai and UAE real estate advisory for off-plan property investment, high-ROI opportunities, villas, communities, developers and market research.",
    images: [{ url: `${SITE_ORIGIN}/og.jpg`, width: 1733, height: 909, alt: "PSR Homes — Dubai Real Estate Advisory" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PSR | UAE Real Estate & Investment",
    description: "Dubai and UAE real estate advisory for off-plan property investment, high-ROI opportunities, villas, communities, developers and market research.",
    images: [`${SITE_ORIGIN}/og.jpg`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const areaServed = PSR_SERVICE_AREAS.map((area) => ({
    "@type": area === "MENA" ? "Place" : area === "United Arab Emirates" ? "Country" : "City",
    name: area,
  }));
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: cbaCompany.legalName,
    alternateName: cbaCompany.shortName,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/brand/psr-logo.png`,
    description: cbaCompany.summary,
    ...(cbaCompany.phone ? { telephone: cbaCompany.phone } : {}),
    ...(cbaCompany.email ? { email: cbaCompany.email } : {}),
    ...(cbaCompany.orn ? { identifier: { "@type": "PropertyValue", name: "Dubai RERA ORN", value: cbaCompany.orn } } : {}),
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
    areaServed,
    knowsAbout: PSR_SEO_TOPICS,
    slogan: "Evidence-led UAE property advisory for private clients and investors.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "PSR UAE real estate advisory services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Off-plan property investment advisory", areaServed } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Dubai and UAE project shortlisting", areaServed } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Community and developer due diligence", areaServed } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "High-yield and high-ROI property research", areaServed } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "UAE property market reporting", areaServed } },
      ],
    },
    sameAs: [cbaCompany.sourceUrl, cbaCompany.propertyFinderUrl, ...Object.values(cbaCompany.social)].filter(Boolean),
  }, {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    url: SITE_ORIGIN,
    name: "PSR Homes",
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "en",
    about: PSR_SEO_TOPICS.map((name) => ({ "@type": "Thing", name })),
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/projects?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }];
  return <html lang="en" dir="ltr" data-theme="dark" className={inter.variable} suppressHydrationWarning><head><script id="psr-theme-boot" dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head><body><ThemeToggle className="global-theme-toggle" /><LanguageExperience /><SiteMotion /><SiteAnalytics />{children}<DeferredConcierge /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
