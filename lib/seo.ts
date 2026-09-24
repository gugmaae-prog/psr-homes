import type { Metadata } from "next";
import { cbaCompany } from "@/data/cba-company";

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://psrhomes.ae").replace(/\/$/, "");
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og.jpg`;

export const PSR_SEO_TOPICS = [
  "UAE real estate",
  "Dubai real estate",
  "Dubai property investment",
  "UAE property investment",
  "off-plan property investment Dubai",
  "Dubai off-plan properties",
  "UAE off-plan projects",
  "MENA real estate investment",
  "Dubai real estate market",
  "UAE real estate market",
  "high ROI Dubai property",
  "top communities in Dubai",
  "Dubai property broker",
  "UAE property broker",
  "real estate investment advisory UAE",
  "Dubai developer projects",
  "UAE property market research",
  "Dubai villas",
  "Dubai apartments",
  "Dubai waterfront property",
  "UAE REIT and real estate market research",
];

export const PSR_COMMERCIAL_SEARCH_TOPICS = [
  "Dubai off-plan property investment",
  "off-plan property investment Dubai",
  "Dubai property investment advisory",
  "high ROI Dubai property",
  "best areas to invest in Dubai property",
  "top communities in Dubai for property investment",
  "Dubai villas for investment",
  "UAE real estate investment for MENA buyers",
  "UAE property market research",
  "Dubai real estate broker",
];

export const PSR_SERVICE_AREAS = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ras Al Khaimah",
  "Ajman",
  "Umm Al Quwain",
  "Fujairah",
  "United Arab Emirates",
  "MENA",
];

export function seoKeywords(...keywords: string[]) {
  return Array.from(new Set([...PSR_SEO_TOPICS, ...PSR_COMMERCIAL_SEARCH_TOPICS, ...keywords].filter(Boolean)));
}

export function absoluteSiteUrl(value = "") {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

export function cleanSeoText(value = "") {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

export function metaDescription(value: string, fallback: string, maxLength = 158) {
  const cleaned = cleanSeoText(value);
  const base = cleaned.length >= 70 ? cleaned : cleanSeoText(fallback);
  if (base.length <= maxLength) return base;
  const trimmed = base.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 100 ? lastSpace : trimmed.length).trim()}.`;
}

export function placeList(values: string[], max = 4) {
  const list = values.filter(Boolean).slice(0, max);
  if (list.length <= 1) return list.join("");
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export function faqStructuredData(path: string, questions: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteSiteUrl(path)}#faq`,
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: cleanSeoText(item.answer) },
    })),
  };
}

function articleDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : `${value} 12:00:00 UTC`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

type ArticleMetadataInput = {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
  image?: string;
  imageAlt?: string;
  category?: string;
  tags?: string[];
};

export function articleMetadata({
  title,
  description,
  path,
  published,
  updated,
  image = DEFAULT_IMAGE,
  imageAlt = title,
  category,
  tags = [],
}: ArticleMetadataInput): Metadata {
  const url = absoluteSiteUrl(path);
  const absoluteImage = absoluteSiteUrl(image);
  const publishedTime = articleDate(published);
  const modifiedTime = articleDate(updated || published);
  return {
    title,
    description,
    keywords: seoKeywords("PSR Homes", "UAE market intelligence", category || "", ...tags, title),
    authors: [{ name: cbaCompany.displayName }],
    creator: cbaCompany.displayName,
    publisher: cbaCompany.displayName,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      url,
      siteName: "PSR",
      title,
      description,
      images: [{ url: absoluteImage, alt: imageAlt }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(category ? { section: category } : {}),
      ...(tags.length ? { tags } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImage] },
  };
}

export function pageMetadata(title: string, description: string, path = "", image = DEFAULT_IMAGE): Metadata {
  const url = absoluteSiteUrl(path);
  const absoluteImage = absoluteSiteUrl(image);
  return {
    title,
    description,
    keywords: seoKeywords("PSR Homes", "PSR", title),
    authors: [{ name: cbaCompany.displayName }],
    creator: cbaCompany.displayName,
    publisher: cbaCompany.displayName,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: { type: "website", url, siteName: "PSR", title, description, images: [{ url: absoluteImage, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImage] },
  };
}
