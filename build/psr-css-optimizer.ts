import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

type Range = readonly [start: string, end: string];

const PUBLIC_LEGACY_RANGES: readonly Range[] = [
  ["/* PSR Obsidian", "/* Site-wide language selection"],
  ["/* PSR Midnight Atelier", "/* PSR nocturne identity"],
  ["/* PSR nocturne identity", "/* Complete developments catalogue"],
  ["/* Geometric typography", "/* Metallic private-client finish"],
  ["/* Metallic private-client finish", "/* Curated project album"],
  ["/* Refined gold editorial system", "/* Research observatory"],
  ["/* Insights — evidence-led editorial surface */", "/* Insights aligned to the PSR 2026 design system */"],
  ["/* About navigation and the original PSR story", "/* Private agent workspace"],
  ["/* Final audited public-team presentation", "/* Faithful high-density PSR mark"],
  ["/* Production hero:", "/* Advisor profile system"],
  ["/* Light management surfaces", "/* PSR GRAPHITE LUXE"],
];

const AGENT_RANGES: readonly Range[] = [
  ["/* Private agent workspace", "/* About: location-led banner"],
  ["/* Advisor contact links and agent-owned secondary inventory", "/* Final responsive navigation and team-carousel polish"],
];

const LEADS_RANGES: readonly Range[] = [
  [".leads-page {", "/* Keep long project names composed inside the timed brief. */"],
];

const ANALYTICS_RANGES: readonly Range[] = [
  ["/* Protected first-party website intelligence", "/* Light management surfaces"],
];

const ALL_ROUTE_RANGES: readonly Range[] = [...AGENT_RANGES, ...LEADS_RANGES, ...ANALYTICS_RANGES];

const LEGACY_CARD_GRID_SELECTORS = [
  ".project-index-grid", ".project-preview-grid", ".developer-directory-grid",
  ".community-directory-grid", ".community-grid", ".advisor-grid",
  ".cba-team-home-grid", ".insight-home-grid", ".insights-index",
  ".service-index", ".taxonomy-project-grid", ".public-advisor-projects",
] as const;

const CANONICAL_PUBLIC_SELECTORS = [
  ".home-hero", ".home-hero-copy", ".home-hero-actions", ".interactive-hero", ".hero-video-backdrop", ".museum-frame",
  ".property-search", ".project-search", ".directory-toolbar", ".compact-search", ".project-preview-card",
  ".project-preview-grid", ".project-preview-image", ".project-preview-facts", ".market-ticker",
] as const;

const PALETTE_REPLACEMENTS: readonly [RegExp, string][] = [
  [/#(?:d8b66a|e0bc63|f0d889|ffd66e|caa75e|b8924f|98783f|87692f|8d6d34|caa64f)/gi, "#cbd2dc"],
  [/#(?:cba355|cfaa5e|d7b666|e5c779|cba64f)/gi, "#cbd2dc"],
  [/#(?:9b6f25|8a6a33|8c745f|8d745e|b8974f|bf9748)/gi, "#9aa3af"],
  [/rgba?\(\s*216\s*,\s*182\s*,\s*106/gi, "rgba(205, 212, 222"],
  [/rgba?\(\s*224\s*,\s*188\s*,\s*99/gi, "rgba(205, 212, 222"],
  [/rgba?\(\s*202\s*,\s*167\s*,\s*94/gi, "rgba(196, 204, 215"],
  [/rgba?\(\s*204\s*,\s*166\s*,\s*79/gi, "rgba(196, 204, 215"],
  [/rgba?\(\s*191\s*,\s*151\s*,\s*72/gi, "rgba(184, 193, 205"],
  [/rgba?\(\s*138\s*,\s*106\s*,\s*51/gi, "rgba(154, 163, 175"],
  [/var\(--(?:brand-)?olive(?:\s*,[^)]*)?\)/gi, "var(--psr-silver)"],
  [/var\(--sand(?:\s*,[^)]*)?\)/gi, "var(--psr-silver)"],
  [/var\(--brand-gold(?:\s*,[^)]*)?\)/gi, "var(--psr-silver)"],
  [/var\(--agent-gold(?:\s*,[^)]*)?\)/gi, "var(--psr-silver)"],
  [/var\(--gold(?:-bright|-soft|-pale|-deep|-rich)?(?:\s*,[^)]*)?\)/gi, "var(--psr-silver)"],
];

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation: saturation * 100 };
}

function neutralFor(r: number, g: number, b: number) {
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  if (luminance >= 242) return [245, 247, 250] as const;
  if (luminance >= 218) return [228, 233, 240] as const;
  if (luminance >= 184) return [199, 208, 219] as const;
  if (luminance >= 132) return [146, 157, 170] as const;
  if (luminance >= 78) return [90, 100, 112] as const;
  if (luminance >= 36) return [43, 49, 56] as const;
  return [12, 15, 19] as const;
}

function isWarmInterfaceColour(r: number, g: number, b: number) {
  const { hue, saturation } = rgbToHsl(r, g, b);
  return hue >= 24 && hue <= 100 && saturation >= 4;
}

/**
 * The historical sheet contains many one-off beige, olive, bronze and gold
 * literals. Neutralise their hue while preserving luminance so structural
 * legacy rules cannot leak warm interface chrome beneath the canonical theme.
 */
export function neutralizeWarmLiterals(source: string) {
  const hexNeutral = source.replace(/#([0-9a-f]{6})([0-9a-f]{2})?\b/gi, (match, rgbHex: string, alpha = "") => {
    const r = Number.parseInt(rgbHex.slice(0, 2), 16);
    const g = Number.parseInt(rgbHex.slice(2, 4), 16);
    const b = Number.parseInt(rgbHex.slice(4, 6), 16);
    if (!isWarmInterfaceColour(r, g, b)) return match;
    const neutral = neutralFor(r, g, b);
    return `#${neutral.map((value) => value.toString(16).padStart(2, "0")).join("")}${alpha}`;
  });
  return hexNeutral.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*,\s*(?:0|1|0?\.\d+))?\s*\)/gi, (match, red: string, green: string, blue: string, alpha = "") => {
    const r = Number(red);
    const g = Number(green);
    const b = Number(blue);
    if (!isWarmInterfaceColour(r, g, b)) return match;
    const [nr, ng, nb] = neutralFor(r, g, b);
    return alpha ? `rgba(${nr}, ${ng}, ${nb}${alpha})` : `rgb(${nr}, ${ng}, ${nb})`;
  });
}

export function normalizePsrTypography(source: string) {
  return source
    .replace(/font-style\s*:\s*(?:italic|oblique)/gi, "font-style: normal")
    .replace(/font-weight\s*:\s*(?:600|700|800|900)/gi, "font-weight: 500");
}

/** The shared .psr-card-grid component owns these layouts now. Dropping only
 * legacy declarations that set columns avoids shipping competing breakpoints. */
export function pruneLegacyCardGridDeclarations(source: string) {
  const cardGridsPruned = source.replace(/([^{}@]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => (
    /grid-template-columns/.test(body)
    && LEGACY_CARD_GRID_SELECTORS.some((className) => selector.includes(className))
      ? ""
      : rule
  ));
  return cardGridsPruned
    .replace(/\.market-ticker\s*\{[^{}]*\}/g, "")
    .replace(/\.market-ticker\s*>\s*div\s*\{[^{}]*\}/g, "");
}

/** The canonical public layer fully owns these homepage components. Remove
 * their earlier single-purpose rules so an old visual system cannot repaint
 * the hero, compound search field or property preview cards underneath it. */
export function pruneCanonicalPublicDeclarations(source: string) {
  return source.replace(/([^{}@]+)\{([^{}]*)\}/g, (rule, selector: string) => {
    const selectors = selector.split(",").map((entry) => entry.trim()).filter(Boolean);
    const isCanonicalOnly = selectors.length > 0 && selectors.every((entry) => (
      CANONICAL_PUBLIC_SELECTORS.some((className) => entry.includes(className))
    ));
    return isCanonicalOnly ? "" : rule;
  });
}

export function sliceRanges(source: string, ranges: readonly Range[]) {
  return ranges.map(([start, end]) => {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    if (startIndex < 0 || endIndex < 0) throw new Error(`PSR CSS range is missing: ${start} -> ${end}`);
    return source.slice(startIndex, endIndex);
  }).join("\n");
}

export function stripRanges(source: string, ranges: readonly Range[]) {
  const resolved = ranges.map(([start, end]) => {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    if (startIndex < 0 || endIndex < 0) throw new Error(`PSR CSS range is missing: ${start} -> ${end}`);
    return { startIndex, endIndex };
  }).sort((left, right) => right.startIndex - left.startIndex);
  let output = source;
  for (const range of resolved) {
    output = output.slice(0, range.startIndex) + output.slice(range.endIndex);
  }
  return output;
}

export function neutralizePsrPalette(source: string) {
  const replaced = PALETTE_REPLACEMENTS.reduce((output, [pattern, replacement]) => output.replace(pattern, replacement), source);
  return normalizePsrTypography(neutralizeWarmLiterals(replaced));
}

export function compilePublicPsrCss(source: string) {
  const stripped = stripRanges(source, [...PUBLIC_LEGACY_RANGES, ...ALL_ROUTE_RANGES]);
  const obsoleteGraphiteLayer = stripped.indexOf("/* PSR GRAPHITE LUXE");
  if (obsoleteGraphiteLayer < 0) throw new Error("PSR graphite legacy boundary is missing.");
  return neutralizePsrPalette(pruneCanonicalPublicDeclarations(pruneLegacyCardGridDeclarations(stripped.slice(0, obsoleteGraphiteLayer))));
}

export function compileAgentPsrCss(source: string) {
  return neutralizePsrPalette(sliceRanges(source, AGENT_RANGES));
}

export function compileLeadsPsrCss(source: string) {
  return neutralizePsrPalette(sliceRanges(source, LEADS_RANGES));
}

export function compileAnalyticsPsrCss(source: string) {
  return neutralizePsrPalette(sliceRanges(source, ANALYTICS_RANGES));
}

export function psrCssOptimizer(): Plugin {
  const globalsPath = path.resolve(process.cwd(), "app/globals.css");
  const virtualModules = new Map<string, (source: string) => string>([
    ["virtual:psr-agent-theme.css", compileAgentPsrCss],
    ["virtual:psr-leads-theme.css", compileLeadsPsrCss],
    ["virtual:psr-analytics-theme.css", compileAnalyticsPsrCss],
  ]);

  return {
    name: "psr-css-optimizer",
    enforce: "pre",
    resolveId(id) {
      if (virtualModules.has(id)) return `\0${id}`;
    },
    load(id) {
      const publicId = id.startsWith("\0") ? id.slice(1) : id;
      const compile = virtualModules.get(publicId);
      if (!compile) return null;
      return compile(fs.readFileSync(globalsPath, "utf8"));
    },
    transform(code, id) {
      if (path.resolve(id.split("?")[0]) !== globalsPath) return null;
      return { code: compilePublicPsrCss(code), map: null };
    },
  };
}
