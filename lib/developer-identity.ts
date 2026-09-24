const TRAILING_DEVELOPER_TERMS = /-(?:properties|property|developers?|developments?|development|realty|holdings?|limited|group|pjsc|llc|asset-management)$/;

/* Verified source labels that describe the same developer but cannot be
 * reduced safely by generic suffix stripping. Keep this list deliberately
 * small: catalogue identity must never merge two brands just because their
 * names look similar. */
const VERIFIED_DEVELOPER_ALIASES: Record<string, string> = {
  "al-barari-dubai": "al-barari",
  "al-barari-only-8-exclusive-villas": "al-barari",
  "al-zorah-development-company": "al-zorah-development",
  "peace-homes-development-natuzzi-italia": "peace-homes-development",
  "tiger-properties-ajman-uae": "tiger-group",
};

export function rawDeveloperSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function developerRootSlug(value: string) {
  const original = rawDeveloperSlug(value);
  let root = original;
  let previous = "";
  while (root && root !== previous) {
    previous = root;
    root = root.replace(TRAILING_DEVELOPER_TERMS, "").replace(/-real-estate$/, "");
  }
  return root || original;
}

export function buildDeveloperAliasMap(values: string[]) {
  const slugs = [...new Set(values.map(rawDeveloperSlug).filter(Boolean))];
  const availableRoots = new Set(slugs.map(developerRootSlug));
  const groups = new Map<string, string[]>();
  slugs.forEach((slug) => {
    const stripped = developerRootSlug(slug);
    const byBrand = stripped.match(/(?:^|-)by-(.+)$/)?.[1] || "";
    const withoutArticle = stripped.replace(/^al-/, "");
    const root = byBrand && availableRoots.has(byBrand)
      ? byBrand
      : withoutArticle !== stripped && availableRoots.has(withoutArticle)
        ? withoutArticle
        : stripped;
    groups.set(root, [...(groups.get(root) || []), slug]);
  });

  const aliases = new Map<string, string>();
  groups.forEach((group, root) => {
    const canonical = group.length > 1
      ? (group.includes(root) ? root : [...group].sort((left, right) => left.length - right.length || left.localeCompare(right))[0])
      : group[0];
    group.forEach((slug) => aliases.set(slug, canonical));
  });
  Object.entries(VERIFIED_DEVELOPER_ALIASES).forEach(([alias, target]) => {
    if (!slugs.includes(alias)) return;
    aliases.set(alias, aliases.get(target) || developerRootSlug(target));
  });
  return aliases;
}

function displayScore(name: string, canonical: string) {
  const trimmed = name.trim();
  const hasIntentionalCase = trimmed !== trimmed.toLowerCase();
  const exactBrand = rawDeveloperSlug(trimmed) === canonical;
  const acronym = /^[A-Z0-9& ]+$/.test(trimmed);
  return Number(hasIntentionalCase) * 100 + Number(exactBrand) * 40 + Number(acronym) * 6 - trimmed.length / 100;
}

export function canonicalDeveloperOptions(values: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  const aliases = buildDeveloperAliasMap(cleaned);
  const grouped = new Map<string, string[]>();
  cleaned.forEach((name) => {
    const raw = rawDeveloperSlug(name);
    const canonical = aliases.get(raw) || raw;
    grouped.set(canonical, [...(grouped.get(canonical) || []), name]);
  });
  return [...grouped.entries()]
    .map(([canonical, names]) => [...new Set(names)].sort((left, right) => displayScore(right, canonical) - displayScore(left, canonical) || left.localeCompare(right))[0])
    .sort((left, right) => left.localeCompare(right));
}
