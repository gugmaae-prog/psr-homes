"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

type Locale = "en" | "ar" | "ru" | "zh" | "hi";
type TranslationTarget =
  | { kind: "text"; node: Text; before: string; after: string }
  | { kind: "attribute"; element: Element; attribute: string };

const STORAGE_KEY = "psr-language";
const LEGACY_STORAGE_KEY = "hg-language";
const CACHE_VERSION = "psr-translation-v3";
const LANGUAGE_CHANGE_EVENT = "hg:language-change";
const TRANSLATION_STATE_EVENT = "hg:translation-state";
const ATTRIBUTE_NAMES = ["placeholder", "title", "aria-label", "alt", "data-text"] as const;
const BLOCKED_SELECTOR = [
  "script", "style", "noscript", "code", "pre", "svg", "canvas", "template",
  "[data-no-translate]", "[contenteditable='true']", ".grace-chat-message.is-user",
  ".agent-messages article[data-role='user']", ".project-hero h1", ".project-taxonomy",
  ".project-preview-card h3", ".project-index-card h2", ".community-card h3",
  ".developer-home-grid h3", ".developer-directory-card h2", ".advisor-grid h2",
  ".taxonomy-hero h1", ".public-advisor-intro h1", ".public-advisor-portrait",
].join(",");

export const LANGUAGES: ReadonlyArray<{ code: Locale; short: string; label: string; direction: "ltr" | "rtl" }> = [
  { code: "en", short: "EN", label: "English", direction: "ltr" },
  { code: "ar", short: "AR", label: "العربية", direction: "rtl" },
  { code: "ru", short: "RU", label: "Русский", direction: "ltr" },
  { code: "zh", short: "中文", label: "中文", direction: "ltr" },
  { code: "hi", short: "हिं", label: "हिन्दी", direction: "ltr" },
];

const COMMON_TRANSLATIONS: Record<Exclude<Locale, "en">, Record<string, string>> = {
  ar: {
    Projects: "المشاريع", Developers: "المطورون", Communities: "المجتمعات", Insights: "الرؤى",
    About: "من نحن", "About us": "من نحن", "Our people": "فريقنا", Services: "الخدمات",
    "Agent login": "دخول المستشار", "List your property": "اعرض عقارك", "Speak with an advisor": "تحدث مع مستشار",
    Search: "بحث", "AI-powered property search": "بحث عقاري مدعوم بالذكاء الاصطناعي",
    "Describe your ideal property": "صف العقار الذي تبحث عنه", Emirate: "الإمارة", "Property type": "نوع العقار",
    "All emirates": "جميع الإمارات", "All residences": "جميع أنواع العقارات", "Find properties": "ابحث عن عقارات",
    Explore: "استكشف", Company: "الشركة", Visit: "تفضل بزيارتنا", Contact: "اتصل بنا",
    Privacy: "الخصوصية", Terms: "الشروط", Advisors: "المستشارون", "Market insights": "رؤى السوق",
    "List with us": "اعرض عقارك معنا", "Agent workspace": "مساحة عمل المستشار",
    "Dubai · Vision · Value": "دبي · رؤية · قيمة", "Guiding your": "نرشدك في",
    "next move in UAE.": "خطوتك العقارية القادمة في الإمارات.",
    "Clear market intelligence. Curated opportunities. Trusted advice for confident property decisions.": "رؤية واضحة للسوق. فرص مختارة بعناية. ونصيحة موثوقة لاتخاذ قرار عقاري واثق.",
    "Explore properties": "استكشف العقارات", Properties: "العقارات", "Properties worth": "عقارات تستحق",
    "a closer look.": "نظرة أقرب.", "View project": "عرض المشروع", "View profile": "عرض الملف",
    "View developer profile": "عرض ملف المطور", "View community": "عرض المنطقة", "View developer": "عرض المطور",
    "Price on request": "السعر عند الطلب", "Starting from": "ابتداءً من", Handover: "موعد التسليم",
    "Location intelligence": "رؤية المناطق", "All community guides": "جميع أدلة المناطق",
    "Developer intelligence": "رؤية المطورين", "The PSR team": "فريق PSR", "Meet all advisors": "تعرّف إلى جميع المستشارين",
    "All insights": "جميع الرؤى", "Read briefing": "قراءة التقرير", "Video briefing": "تقرير مرئي",
    "Private client advisory": "استشارات خاصة للعملاء", "Move from browsing": "انتقل من التصفح",
    "to a defensible decision.": "إلى قرار مدروس ومدعوم بالأدلة.", "Build my shortlist": "أنشئ قائمتي المختصرة",
    "Explore projects": "استكشف المشاريع", "Quick links": "روابط سريعة", "Copyright 2026 PSR Homes": "حقوق النشر 2026 PSR Homes",
    "PSR property finder": "باحث PSR العقاري", "Don't know what you are looking for?": "لست متأكداً مما تبحث عنه؟",
    "Let PSR narrow the right unit for you.": "دع PSR يساعدك في تحديد العقار الأنسب لك.",
    "What should this property do for you?": "ما الهدف الذي تريد تحقيقه من هذا العقار؟",
    "A home": "منزل للسكن", "An investment": "استثمار", "A holiday residence": "منزل للعطلات",
    "I am still deciding": "ما زلت أدرس الخيارات", Back: "رجوع", Continue: "متابعة", Close: "إغلاق",
    "Selected portfolio": "محفظة مختارة", "Selected properties": "عقارات مختارة", "Request a private appraisal": "اطلب تقييماً خاصاً",
    "Tell us about": "أخبرنا عن", "the unit.": "العقار.", Name: "الاسم", Email: "البريد الإلكتروني", Phone: "الهاتف",
    Objective: "الهدف", "Community and building": "المنطقة والمبنى", "Preferred timing": "التوقيت المفضل",
    "Property notes": "ملاحظات العقار", Submit: "إرسال", Previous: "السابق", Next: "التالي",
    "The people behind": "الجهات التي تقف خلف", "the pipeline.": "المشاريع القادمة.",
    "Every place,": "كل منطقة،", "in its proper context.": "ضمن سياقها الصحيح.",
    "UAE expertise,": "خبرة إماراتية،", "made personal.": "بأسلوب شخصي.",
    "Dubai property decisions,": "قرارات عقارية في دبي،", "made with clarity.": "بوضوح وثقة.",
    "Research for better": "أبحاث من أجل", "property decisions.": "قرارات عقارية أفضل.",
    "A complete route": "مسار متكامل", "from asset to outcome.": "من العقار إلى النتيجة.",
    Mortgage: "حاسبة", "calculator.": "التمويل العقاري.",
    "Tell us what": "أخبرنا بما", "you want to achieve.": "تريد تحقيقه.",
    "Dubai property support,": "دعم عقاري في دبي،", "from search to signature.": "من البحث إلى التوقيع.",
    "policy.": "الخصوصية.", "of use.": "الاستخدام.",
    "UAE community intelligence": "رؤية مجتمعات الإمارات", "About PSR": "عن PSR",
    "PSR research · UAE": "أبحاث PSR · الإمارات", "Finance modelling": "نمذجة التمويل",
    "What we do": "ما نقدمه", Legal: "قانوني", "Search by name, emirate or community": "ابحث بالاسم أو الإمارة أو المنطقة",
    "Search community or developer": "ابحث عن منطقة أو مطور", "developer profiles": "ملفات المطورين",
    "community guides": "أدلة المناطق", "Your brief": "متطلباتك", "Full name": "الاسم الكامل",
    Message: "الرسالة", "What should the asset deliver?": "ما الهدف الذي يجب أن يحققه العقار؟",
    "Describe what you want — e.g. 2 bedrooms under AED 3M in Dubai Marina": "صف ما تبحث عنه — مثلاً غرفتا نوم بأقل من 3 ملايين درهم في دبي مارينا",
    "Your full name": "اسمك الكامل", "you@example.com": "name@example.com",
    "e.g. Dubai Marina, building name": "مثلاً دبي مارينا، اسم المبنى",
    "Bedrooms, condition, occupancy and any timing considerations": "عدد غرف النوم، حالة العقار، الإشغال وأي اعتبارات زمنية",
    "Tell us what you are looking for": "أخبرنا بما تبحث عنه",
    "Start with the objective": "ابدأ بالهدف", Call: "اتصل", Response: "الرد",
  },
  ru: {
    Projects: "Проекты", Developers: "Застройщики", Communities: "Районы", Insights: "Аналитика",
    About: "О компании", "About us": "О нас", "Agent login": "Вход для агента", "List your property": "Разместить объект",
    "Speak with an advisor": "Связаться с консультантом", Search: "Поиск", "All emirates": "Все эмираты",
    "All residences": "Все типы жилья", Explore: "Обзор", Company: "Компания", Visit: "Наш офис",
    Contact: "Контакты", Privacy: "Конфиденциальность", Terms: "Условия", Advisors: "Консультанты",
    "Market insights": "Аналитика рынка", "List with us": "Разместить у нас", "Agent workspace": "Рабочее место агента",
  },
  zh: {
    Projects: "项目", Developers: "开发商", Communities: "社区", Insights: "市场洞察",
    About: "关于我们", "About us": "关于我们", "Agent login": "顾问登录", "List your property": "委托房源",
    "Speak with an advisor": "联系顾问", Search: "搜索", "All emirates": "所有酋长国",
    "All residences": "所有住宅", Explore: "探索", Company: "公司", Visit: "到访",
    Contact: "联系我们", Privacy: "隐私", Terms: "条款", Advisors: "顾问团队",
    "Market insights": "市场洞察", "List with us": "委托我们", "Agent workspace": "顾问工作台",
  },
  hi: {
    Projects: "परियोजनाएँ", Developers: "डेवलपर्स", Communities: "समुदाय", Insights: "बाज़ार विश्लेषण",
    About: "हमारे बारे में", "About us": "हमारे बारे में", "Agent login": "एजेंट लॉगिन", "List your property": "अपनी प्रॉपर्टी सूचीबद्ध करें",
    "Speak with an advisor": "सलाहकार से बात करें", Search: "खोजें", "All emirates": "सभी अमीरात",
    "All residences": "सभी आवास", Explore: "देखें", Company: "कंपनी", Visit: "हमसे मिलें",
    Contact: "संपर्क", Privacy: "गोपनीयता", Terms: "शर्तें", Advisors: "सलाहकार",
    "Market insights": "बाज़ार विश्लेषण", "List with us": "हमारे साथ सूचीबद्ध करें", "Agent workspace": "एजेंट कार्यक्षेत्र",
  },
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const internalMutations = new WeakMap<Node, number>();
const memoryCaches = new Map<Exclude<Locale, "en">, Map<string, string>>();
let activeLocale: Locale = "en";
let translationRun = 0;
let activeController: AbortController | null = null;

function supportedLocale(value: string | null): Locale | null {
  return LANGUAGES.some((language) => language.code === value) ? value as Locale : null;
}

function selectedLanguage() {
  const query = supportedLocale(new URLSearchParams(window.location.search).get("lang"));
  if (query) return query;
  try {
    return supportedLocale(window.localStorage.getItem(STORAGE_KEY))
      || supportedLocale(window.localStorage.getItem(LEGACY_STORAGE_KEY))
      || "en";
  } catch {
    return "en";
  }
}

function cacheKey(locale: Exclude<Locale, "en">) {
  return `${CACHE_VERSION}:${locale}`;
}

function translationCache(locale: Exclude<Locale, "en">) {
  const existing = memoryCaches.get(locale);
  if (existing) return existing;
  const cache = new Map<string, string>();
  if (!/^\/(?:agent|leads|analytics)(?:\/|$)/.test(window.location.pathname)) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(cacheKey(locale)) || "[]") as unknown;
      if (Array.isArray(stored)) {
        for (const entry of stored.slice(-1_200)) {
          if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string") {
            cache.set(entry[0], entry[1]);
          }
        }
      }
    } catch {
      // A missing or stale translation cache should never block the page.
    }
  }
  // Reviewed PSR terminology is authoritative. Machine-generated cache entries
  // may fill long-form copy, but can never replace navigation, form or CTA copy.
  for (const [source, translation] of Object.entries(COMMON_TRANSLATIONS[locale])) {
    cache.set(source, translation);
  }
  memoryCaches.set(locale, cache);
  return cache;
}

function saveTranslationCache(locale: Exclude<Locale, "en">, cache: Map<string, string>) {
  if (/^\/(?:agent|leads|analytics)(?:\/|$)/.test(window.location.pathname)) return;
  try {
    window.localStorage.setItem(cacheKey(locale), JSON.stringify([...cache.entries()].slice(-1_200)));
  } catch {
    // Storage can be disabled or full; the in-memory cache remains available.
  }
}

function blocked(element: Element | null) {
  return Boolean(element?.closest(BLOCKED_SELECTOR));
}

function shouldTranslate(value: string) {
  const text = value.trim();
  if (text.length < 2 || !/\p{L}/u.test(text)) return false;
  if (/^(?:https?:\/\/|www\.|mailto:|tel:)/i.test(text)) return false;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(text)) return false;
  if (/^(?:HAUS\s*&\s*GRACE|H&G|GRACE|AED|UAE|RERA|ORN)(?:\s+Properties)?$/i.test(text)) return false;
  return true;
}

function textSpacing(value: string) {
  const trimmed = value.trim();
  const start = value.indexOf(trimmed);
  return { before: start > 0 ? value.slice(0, start) : "", after: start >= 0 ? value.slice(start + trimmed.length) : "" };
}

function collectTargets() {
  const root = document.body;
  const groups = new Map<string, TranslationTarget[]>();
  const add = (source: string, target: TranslationTarget) => {
    const text = source.trim();
    if (!shouldTranslate(text)) return;
    const entries = groups.get(text) || [];
    entries.push(target);
    groups.set(text, entries);
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const parent = node.parentElement;
    if (!blocked(parent)) {
      const source = originalText.get(node) ?? node.data;
      if (!originalText.has(node)) originalText.set(node, source);
      const spacing = textSpacing(source);
      add(source, { kind: "text", node, ...spacing });
    }
    current = walker.nextNode();
  }

  const elements = [root, ...root.querySelectorAll("*")];
  for (const element of elements) {
    if (blocked(element)) continue;
    let originals = originalAttributes.get(element);
    for (const attribute of ATTRIBUTE_NAMES) {
      if (!element.hasAttribute(attribute)) continue;
      const currentValue = element.getAttribute(attribute) || "";
      if (!originals) {
        originals = new Map<string, string>();
        originalAttributes.set(element, originals);
      }
      if (!originals.has(attribute)) originals.set(attribute, currentValue);
      add(originals.get(attribute) || currentValue, { kind: "attribute", element, attribute });
    }
  }
  return groups;
}

function applyTranslation(target: TranslationTarget, translated: string) {
  if (target.kind === "text") {
    if (!target.node.isConnected) return;
    internalMutations.set(target.node, (internalMutations.get(target.node) || 0) + 1);
    target.node.data = `${target.before}${translated}${target.after}`;
    return;
  }
  if (!target.element.isConnected) return;
  internalMutations.set(target.element, (internalMutations.get(target.element) || 0) + 1);
  target.element.setAttribute(target.attribute, translated);
}

async function requestTranslations(locale: Exclude<Locale, "en">, texts: string[], signal: AbortSignal) {
  const response = await fetch(withBasePath("/api/translate"), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-hg-language": locale },
    body: JSON.stringify({ target: locale, texts }),
    signal,
  });
  if (!response.ok) throw new Error(`Translation request failed with ${response.status}`);
  const body = await response.json() as { translations?: unknown };
  return Array.isArray(body.translations) ? body.translations : [];
}

async function translateDocument(locale: Exclude<Locale, "en">, run: number, signal: AbortSignal) {
  const cache = translationCache(locale);
  const groups = collectTargets();
  const missing: string[] = [];

  for (const [source, targets] of groups) {
    const translated = cache.get(source);
    if (translated) targets.forEach((target) => applyTranslation(target, translated));
    else missing.push(source);
  }

  const chunks: string[][] = [];
  for (let index = 0; index < missing.length; index += 20) chunks.push(missing.slice(index, index + 20));
  let cacheChanged = false;
  for (let index = 0; index < chunks.length; index += 3) {
    const batch = chunks.slice(index, index + 3);
    await Promise.all(batch.map(async (chunk) => {
      try {
        const translations = await requestTranslations(locale, chunk, signal);
        if (run !== translationRun || signal.aborted) return;
        chunk.forEach((source, itemIndex) => {
          const translated = typeof translations[itemIndex] === "string" && translations[itemIndex].trim()
            ? translations[itemIndex].trim()
            : source;
          cache.set(source, translated);
          cacheChanged = true;
          groups.get(source)?.forEach((target) => applyTranslation(target, translated));
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("PSR translation failed", error);
        }
      }
    }));
  }
  if (cacheChanged) saveTranslationCache(locale, cache);
}

function restoreEnglish() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const source = originalText.get(node);
    if (source !== undefined && node.data !== source) {
      internalMutations.set(node, (internalMutations.get(node) || 0) + 1);
      node.data = source;
    }
    current = walker.nextNode();
  }
  for (const element of document.body.querySelectorAll("*")) {
    const originals = originalAttributes.get(element);
    if (!originals) continue;
    for (const [attribute, source] of originals) {
      if (element.getAttribute(attribute) !== source) {
        internalMutations.set(element, (internalMutations.get(element) || 0) + 1);
        element.setAttribute(attribute, source);
      }
    }
  }
}

function dispatchTranslationState(locale: Locale, translating: boolean) {
  window.dispatchEvent(new CustomEvent(TRANSLATION_STATE_EVENT, { detail: { locale, translating } }));
}

async function setDocumentLanguage(locale: Locale, updateUrl = true) {
  activeLocale = locale;
  translationRun += 1;
  const run = translationRun;
  activeController?.abort();
  activeController = new AbortController();
  const language = LANGUAGES.find((item) => item.code === locale) || LANGUAGES[0];
  document.documentElement.lang = locale;
  document.documentElement.dir = language.direction;
  document.documentElement.dataset.language = locale;
  try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* Preference remains available for this page. */ }

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (locale === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", locale);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  dispatchTranslationState(locale, locale !== "en");
  if (locale === "en") {
    restoreEnglish();
    dispatchTranslationState(locale, false);
    return;
  }
  await translateDocument(locale, run, activeController.signal);
  if (run === translationRun) dispatchTranslationState(locale, false);
}

export function LanguageSelector({ floating = false }: { floating?: boolean }) {
  const [locale, setLocale] = useState<Locale>(activeLocale);
  const [translating, setTranslating] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const current = LANGUAGES.find((language) => language.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const onLanguage = (event: Event) => setLocale((event as CustomEvent<{ locale: Locale }>).detail.locale);
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ locale: Locale; translating: boolean }>).detail;
      setLocale(detail.locale);
      setTranslating(detail.translating);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
    window.addEventListener(TRANSLATION_STATE_EVENT, onState);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
      window.removeEventListener(TRANSLATION_STATE_EVENT, onState);
    };
  }, []);

  function choose(nextLocale: Locale) {
    detailsRef.current?.removeAttribute("open");
    detailsRef.current?.closest(".mobile-menu")?.removeAttribute("open");
    setLocale(nextLocale);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { locale: nextLocale } }));
  }

  return <details ref={detailsRef} className={`language-selector${floating ? " language-floating" : ""}${translating ? " is-translating" : ""}`} data-no-translate>
    <summary aria-label={`Language: ${current.label}`}><span>{current.short}</span><i aria-hidden="true" /></summary>
    <div className="language-menu" role="menu" aria-label="Choose language">
      {LANGUAGES.map((language) => <button key={language.code} type="button" role="menuitemradio" aria-checked={language.code === locale} onClick={() => choose(language.code)}>
        <span>{language.short}</span><strong>{language.label}</strong>
      </button>)}
    </div>
  </details>;
}

export function LanguageExperience() {
  useEffect(() => {
    const initial = selectedLanguage();
    const onLanguage = (event: Event) => {
      const locale = (event as CustomEvent<{ locale?: string }>).detail?.locale || "en";
      const supported = supportedLocale(locale) || "en";
      void setDocumentLanguage(supported);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
    void setDocumentLanguage(initial, false);

    let mutationTimer = 0;
    const observer = new MutationObserver((mutations) => {
      if (activeLocale === "en") return;
      let externalChange = false;
      for (const mutation of mutations) {
        const pendingInternalMutations = internalMutations.get(mutation.target) || 0;
        if (pendingInternalMutations > 0) {
          if (pendingInternalMutations === 1) internalMutations.delete(mutation.target);
          else internalMutations.set(mutation.target, pendingInternalMutations - 1);
          continue;
        }
        externalChange = true;
        if (mutation.type === "characterData") originalText.set(mutation.target as Text, mutation.target.textContent || "");
        if (mutation.type === "attributes" && mutation.target instanceof Element && mutation.attributeName) {
          const originals = originalAttributes.get(mutation.target) || new Map<string, string>();
          originals.set(mutation.attributeName, mutation.target.getAttribute(mutation.attributeName) || "");
          originalAttributes.set(mutation.target, originals);
        }
      }
      if (!externalChange) return;
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(() => {
        if (activeLocale !== "en" && activeController) {
          void translateDocument(activeLocale as Exclude<Locale, "en">, translationRun, activeController.signal);
        }
      }, 180);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTE_NAMES] });

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
      observer.disconnect();
      window.clearTimeout(mutationTimer);
      activeController?.abort();
    };
  }, []);

  return <><LanguageSelector floating /><span className="language-status" aria-live="polite" data-no-translate /></>;
}
