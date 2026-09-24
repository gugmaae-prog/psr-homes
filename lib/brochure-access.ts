export const BROCHURE_ACCESS_TTL_MS = 15 * 60 * 1_000;

export type BrochureDocumentScope = "project" | "collection" | "community";

type BrochureProject = {
  slug: string;
  brochure?: string | null;
  sourceUpdatedAt?: string | null;
  archived?: boolean;
};

type BrochureDocumentPolicy = {
  id: string;
  scope: BrochureDocumentScope;
  label: string;
  projectSlugs: readonly string[];
};

export type ReadyProjectBrochure = {
  href: string;
  url: URL;
  scope: BrochureDocumentScope;
  label: string;
  sharedDocumentId?: string;
  verifiedOn: string;
};

export type ReadyProjectDocument =
  | (ReadyProjectBrochure & { kind: "verified_brochure" })
  | {
    kind: "psr_dossier";
    scope: "project";
    label: "PSR sourced project dossier";
    sourceRecordUpdatedAt: string;
  };

export const BROCHURE_CATALOGUE_VERIFIED_ON = "2026-09-06";

const TRUSTED_BROCHURE_HOSTS = new Set([
  "cdn.opr.ae",
  "new-projects-media.propertyfinder.com",
  "reportagegroup.com",
  "www.reportagegroup.com",
  "rakproperties.ae",
  "www.rakproperties.ae",
  "binghatti-frankfurt-public.s3.eu-central-1.amazonaws.com",
  "uae-cms.emaar.com",
  "api.imandevelopers.com",
  "vazeno.files.cmp.optimizely.com",
  "theluxedevelopers.com",
  "www.theluxedevelopers.com",
  "modon.com",
  "www.modon.com",
]);

/* These legacy links returned an HTML placeholder rather than a PDF during the
 * full catalogue verification on 6 September 2026. Keep them quarantined until
 * a replacement developer document has been checked. */
const QUARANTINED_BROCHURE_URLS = new Set([
  "https://cdn.opr.ae/brochures/oceana.pdf",
  "https://cdn.opr.ae/icons/binghatti-canal.pdf",
  "https://cdn.opr.ae/brochures/belgravia-3.pdf",
  "https://cdn.opr.ae/brochures/emaar-golf-grande.pdf",
  "https://cdn.opr.ae/brochures/emaar-anya-2.pdf",
  "https://cdn.opr.ae/brochures/emaar-anya.pdf",
  "https://cdn.opr.ae/brochures/cavalli-tower.pdf",
  "https://cdn.opr.ae/brochures/nshama-noor.pdf",
  "https://cdn.opr.ae/brochures/emaar-golfville.pdf",
  "https://cdn.opr.ae/brochures/sobha-hartland-Land%20Plots.pdf",
  "https://cdn.opr.ae/brochures/hills-views.pdf",
  "https://cdn.opr.ae/brochures/eaton-place.pdf",
  "https://cdn.opr.ae/banners/rak-flamingo.pdf",
  "https://cdn.opr.ae/banners/rak-granada.pdf",
  "https://cdn.opr.ae/brochures/binghatti-platinum.pdf",
  "https://cdn.opr.ae/brochures/azizi-aura.pdf",
]);

/* Repeated files are accepted only when the document is intentionally shared
 * by the named phases or projects. This prevents an unrelated project from
 * silently inheriting another development's brochure. */
const BROCHURE_DOCUMENT_POLICIES = new Map<string, BrochureDocumentPolicy>([
  ["https://binghatti-frankfurt-public.s3.eu-central-1.amazonaws.com/project-assets/binghatti-wraith-assets-6345467/binghatti-wraith-brochure.pdf", {
    id: "binghatti-wraith-official",
    scope: "project",
    label: "Binghatti Wraith official brochure",
    projectSlugs: ["binghatti-wraith-al-jaddaf-dubai"],
  }],
  ["https://uae-cms.emaar.com/uploads/GOLF_TRAILS_Brochure_dbc4ced831.pdf", {
    id: "emaar-golf-trails-official",
    scope: "project",
    label: "Golf Trails official brochure",
    projectSlugs: ["golf-trails-emaar-emaar-south-dubai"],
  }],
  ["https://uae-cms.emaar.com/uploads/296071_brochure_File_daef7603c8.pdf", {
    id: "emaar-anya-official",
    scope: "project",
    label: "Anya official brochure",
    projectSlugs: ["emaar-anya-townhouses-in-arabian-ranches-3-dubai-for-sale"],
  }],
  ["https://uae-cms.emaar.com/uploads/326048_brochure_File_82b09439e1.pdf", {
    id: "emaar-anya-2-official",
    scope: "project",
    label: "Anya 2 official brochure",
    projectSlugs: ["emaar-anya-2-townhouses-in-arabian-ranches-3-dubai"],
  }],
  ["https://uae-cms.emaar.com/uploads/332345_brochure_File_3f0003f8e5.pdf", {
    id: "emaar-golf-grand-official",
    scope: "project",
    label: "Golf Grand official brochure",
    projectSlugs: ["emaar-golf-grand-apartments-in-dubai-hills-estate-for-sale"],
  }],
  ["https://api.imandevelopers.com/wp-content/uploads/2026/07/113-Residences-Project-Brief_compressed.pdf", {
    id: "iman-113-residences-official",
    scope: "project",
    label: "113 Residences official project brief",
    projectSlugs: ["113-residences-iman-developers-al-sufouh-dubai"],
  }],
  ["https://vazeno.files.cmp.optimizely.com/download/assets/The+Canopies+at+Yas+Point+-+Brochure+1.pdf/f8e6140289a111f1b26992cc7dabea24", {
    id: "aldar-yas-canopies-official",
    scope: "project",
    label: "The Canopies at Yas Point official brochure",
    projectSlugs: ["the-canopies-yas-point-aldar-yas-island-abu-dhabi"],
  }],
  ["https://theluxedevelopers.com/wp-content/uploads/2023/06/DIGITAL-OCEANO_BROCHURE_V11.pdf", {
    id: "luxe-oceano-official",
    scope: "project",
    label: "Oceano official brochure",
    projectSlugs: ["oceano-al-marjan-island-in-ras-al-khaimah-uae-for-sale"],
  }],
  ["https://www.modon.com/docs/modoncorporatelibraries/property-brochures/nawayef-east-by-modon-homes.pdf", {
    id: "modon-nawayef-east-homes",
    scope: "collection",
    label: "Nawayef East Homes collection brochure",
    projectSlugs: ["nawayef-east-modon-hudayriyat-island-abu-dhabi"],
  }],
  ["https://cdn.opr.ae/upload/brochures/Tilal%20Binghatti%20-%20Oasis%20Villa(Digital).pdf", {
    id: "tilal-binghatti-oasis-4br",
    scope: "collection",
    label: "Tilal Oasis 4-bedroom release brochure",
    projectSlugs: [
      "tilal-binghatti-academic-city",
      "tilal-binghatti-oasis-villas-academic-city-dubai",
    ],
  }],
  ["https://cdn.opr.ae/upload/brochures/THE_HEIGHTS_BROCHURE.pdf", {
    id: "the-heights-community",
    scope: "community",
    label: "The Heights masterplan and collections brochure",
    projectSlugs: [
      "salva-the-heights-emaar-al-yalayis-dubai",
      "serro-2-the-heights-country-club-and-wellness-emaar-dubai",
      "serro-the-heights-country-club-and-wellness-emaar-dubai",
    ],
  }],
  ["https://cdn.opr.ae/upload/brochures/DAMAC%20ISLANDS%202%20Brochure_DIGITAL_ENG_NOV12_.pdf", {
    id: "damac-islands-2-community",
    scope: "community",
    label: "DAMAC Islands 2 master-community brochure",
    projectSlugs: [
      "damac-islands-2-dubailand-dubai",
      "maui-damac-islands-dubailand-dubai",
      "bahamas-damac-islands-2-dubailand-dubai",
      "tahiti-damac-islands-2-dubailand-dubai",
      "cuba-damac-islands-2-dubailand-dubai",
      "bermuda-damac-islands-2-dubailand-dubai",
    ],
  }],
  ["https://cdn.opr.ae/brochures/Niki&Rosso_Brochure.pdf", {
    id: "nikki-rosso-collection",
    scope: "collection",
    label: "Nikki Beach and Rosso Bay joint collection brochure",
    projectSlugs: [
      "nikki-beach-by-aldar-properties-on-al-marjan-island",
      "rosso-bay-by-aldar-properties-on-al-marjan-island",
    ],
  }],
  ["https://cdn.opr.ae/upload/brochures/300425_Waada%20Main%20Brochure.pdf", {
    id: "waada-community",
    scope: "community",
    label: "WAADA master-community brochure",
    projectSlugs: [
      "waada-bt-properties-dubai-south",
      "rayhan-1-waada-dubai-south",
      "cascada-1-dubai-south-waada",
    ],
  }],
  ["https://cdn.opr.ae/upload/brochures/Terra%20Phase%202_Mini%20Brochure.pdf", {
    id: "terra-golf-townhouses-phase-2",
    scope: "collection",
    label: "TERRA Phase II townhouses brochure",
    projectSlugs: ["terra-golf-collection-phase-2-townhouses"],
  }],
  ["https://cdn.opr.ae/upload/brochures/City%20Walk%20Crestlane%20Brochure.pdf", {
    id: "city-walk-crestlane-collection",
    scope: "collection",
    label: "City Walk Crestlane 4 and 5 brochure",
    projectSlugs: [
      "city-walk-crestlane-4-meraas-dubai",
      "city-walk-crestlane-5-meraas-dubai",
    ],
  }],
  ["https://cdn.opr.ae/upload/brochures/Sobha%20Aquamont_Downtown%20UAQ%20Brochure.pdf", {
    id: "sobha-downtown-uaq-community",
    scope: "community",
    label: "Downtown UAQ masterplan and Sobha Aquamont brochure",
    projectSlugs: [
      "sobha-aquamont-apartments-umm-al-quwain",
      "residences-downtown-umm-al-quwai-sobha-realty",
    ],
  }],
  ["https://cdn.opr.ae/brochures/creek-palace.pdf", {
    id: "emaar-creek-palace",
    scope: "project",
    label: "Creek Palace brochure",
    projectSlugs: ["emaar-creek-palace-dubai-creek-harbour"],
  }],
  ["https://cdn.opr.ae/upload/brochures/Bashayer%20Brochure.pdf", {
    id: "bashayer-community",
    scope: "community",
    label: "Bashayer community brochure",
    projectSlugs: ["bashayer-final-phase-modon-hudayriyat-island-abu-dhabi"],
  }],
  ["https://cdn.opr.ae/upload/brochures/BROCHURE_Lagoons_District_CONCEPT_DIGITAL.pdf", {
    id: "damac-lagoons-valencia-collection",
    scope: "collection",
    label: "DAMAC Lagoons Valencia collection brochure",
    projectSlugs: ["valencia-apartments-damac-lagoons-dubai"],
  }],
  ["https://cdn.opr.ae/brochures/nshama-the-mayfair.pdf", {
    id: "nshama-the-mayfair",
    scope: "project",
    label: "NSHAMA The Mayfair brochure",
    projectSlugs: ["nshama-the-mayfair-town-square-dubai-apartments-for-sale"],
  }],
]);

/* First-party replacements discovered on official project pages after the
 * imported catalogue snapshot was created. They remain bound to one audited
 * slug through the policies above. */
const VERIFIED_BROCHURE_SOURCE_OVERRIDES = new Map<string, string>([
  ["binghatti-wraith-al-jaddaf-dubai", "https://binghatti-frankfurt-public.s3.eu-central-1.amazonaws.com/project-assets/binghatti-wraith-assets-6345467/binghatti-wraith-brochure.pdf"],
  ["golf-trails-emaar-emaar-south-dubai", "https://uae-cms.emaar.com/uploads/GOLF_TRAILS_Brochure_dbc4ced831.pdf"],
  ["emaar-anya-townhouses-in-arabian-ranches-3-dubai-for-sale", "https://uae-cms.emaar.com/uploads/296071_brochure_File_daef7603c8.pdf"],
  ["emaar-anya-2-townhouses-in-arabian-ranches-3-dubai", "https://uae-cms.emaar.com/uploads/326048_brochure_File_82b09439e1.pdf"],
  ["emaar-golf-grand-apartments-in-dubai-hills-estate-for-sale", "https://uae-cms.emaar.com/uploads/332345_brochure_File_3f0003f8e5.pdf"],
  ["113-residences-iman-developers-al-sufouh-dubai", "https://api.imandevelopers.com/wp-content/uploads/2026/07/113-Residences-Project-Brief_compressed.pdf"],
  ["the-canopies-yas-point-aldar-yas-island-abu-dhabi", "https://vazeno.files.cmp.optimizely.com/download/assets/The+Canopies+at+Yas+Point+-+Brochure+1.pdf/f8e6140289a111f1b26992cc7dabea24"],
  ["oceano-al-marjan-island-in-ras-al-khaimah-uae-for-sale", "https://theluxedevelopers.com/wp-content/uploads/2023/06/DIGITAL-OCEANO_BROCHURE_V11.pdf"],
  ["nawayef-east-modon-hudayriyat-island-abu-dhabi", "https://www.modon.com/docs/modoncorporatelibraries/property-brochures/nawayef-east-by-modon-homes.pdf"],
]);

function brochureUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const decodedPath = decodeURIComponent(url.pathname);
    const isPdf = /\.pdf$/i.test(decodedPath)
      || (/\.pdf\//i.test(decodedPath) && BROCHURE_DOCUMENT_POLICIES.has(url.href));
    if (
      url.protocol !== "https:"
      || !TRUSTED_BROCHURE_HOSTS.has(url.hostname)
      || !isPdf
      || url.username
      || url.password
      || url.port
      || url.search
      || url.hash
    ) return null;
    return url;
  } catch {
    return null;
  }
}

export function brochureScopeLabel(scope: BrochureDocumentScope) {
  if (scope === "community") return "Community brochure";
  if (scope === "collection") return "Project collection brochure";
  return "Project brochure";
}

export function resolveProjectBrochure(project: BrochureProject): ReadyProjectBrochure | null {
  const url = brochureUrl(project.brochure || VERIFIED_BROCHURE_SOURCE_OVERRIDES.get(project.slug));
  if (!url || QUARANTINED_BROCHURE_URLS.has(url.href)) return null;

  const policy = BROCHURE_DOCUMENT_POLICIES.get(url.href);
  if (policy && !policy.projectSlugs.includes(project.slug)) return null;
  const scope = policy?.scope || "project";
  return {
    href: url.href,
    url,
    scope,
    label: policy?.label || brochureScopeLabel(scope),
    sharedDocumentId: policy && policy.projectSlugs.length > 1 ? policy.id : undefined,
    verifiedOn: BROCHURE_CATALOGUE_VERIFIED_ON,
  };
}

/** Every valid project has a downloadable document. A verified upstream PDF
 * remains a brochure; otherwise PSR generates a sourced project dossier and
 * labels it plainly so it cannot be mistaken for developer-issued material. */
export function resolveProjectDocument(project: BrochureProject): ReadyProjectDocument | null {
  if (project.archived || !/^[a-z0-9-]+(?:%20[a-z0-9-]+)*$/i.test(project.slug)) return null;
  const brochure = resolveProjectBrochure(project);
  if (brochure) return { ...brochure, kind: "verified_brochure" };
  return {
    kind: "psr_dossier",
    scope: "project",
    label: "PSR sourced project dossier",
    sourceRecordUpdatedAt: project.sourceUpdatedAt || "",
  };
}

export async function brochurePdfIsReachable(
  brochure: ReadyProjectBrochure,
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
) {
  let response: Response | null = null;
  try {
    response = await fetcher(brochure.url, {
      headers: {
        accept: "application/pdf",
        range: "bytes=0-4",
        "user-agent": "PSR-Brochure-Preflight/1.0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !response.body || !/^application\/pdf(?:;|$)/i.test(contentType)) {
      await response.body?.cancel();
      return false;
    }

    const reader = response.body.getReader();
    const signature = new Uint8Array(5);
    let offset = 0;
    while (offset < signature.length) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.byteLength, signature.length - offset);
      signature.set(value.subarray(0, take), offset);
      offset += take;
    }
    await reader.cancel();
    return offset === signature.length && new TextDecoder().decode(signature) === "%PDF-";
  } catch {
    try { await response?.body?.cancel(); } catch { /* the stream may already be closed */ }
    return false;
  }
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isBrochureAccessToken(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

export async function createBrochureAccessToken(now = Date.now()) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...tokenBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    token,
    tokenHash: await sha256Hex(token),
    expiresAt: new Date(now + BROCHURE_ACCESS_TTL_MS).toISOString(),
  };
}
