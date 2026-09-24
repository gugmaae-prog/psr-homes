"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { reviewedPresentationPhoto } from "@/lib/reviewed-presentation-media";
import styles from "./DubaiSouthReviewPresentation.module.css";

type ReportProject = {
  name: string;
  allIn: number;
  price: number;
  area: number;
  pricePerSqft: number;
};

type ReviewReport = {
  id: string;
  label: string;
  budgetLabel: string;
  file: string;
  pageCount: number;
  projects: ReportProject[];
};

type SceneBase = {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tableId?: string;
};

type RectScene = SceneBase & {
  type: "rect";
  fill: string;
  line?: string | null;
  opacity?: number;
};

type TextScene = SceneBase & {
  type: "text";
  text: string;
  size: number;
  bold: boolean;
  color: string;
  leading: number;
  lines: string[];
  link?: string | null;
};

type ImageScene = SceneBase & {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  alt?: string;
};

type TableScene = SceneBase & {
  type: "table";
  id: string;
  headers: string[];
  rows: string[][];
};

type SceneElement = RectScene | TextScene | ImageScene | TableScene;

type ReviewSource = { label: string; url: string };

type ReviewSlide = {
  title: string;
  group: string;
  kind: string;
  background: string;
  elements: SceneElement[];
  sources: ReviewSource[];
  project?: string | null;
  number: number;
};

export type DubaiSouthReviewData = {
  width: number;
  height: number;
  title: string;
  client: string;
  advisor: string;
  date: string;
  reports: ReviewReport[];
  slides: ReviewSlide[];
};

const portraitPattern = /\b(?:jumanah|portrait|head and shoulders)\b/i;
const localAsset = (value: string) => withBasePath(reviewedPresentationPhoto(value));
const paint = (value?: string | null) => value ? (value.startsWith("#") ? value : `#${value}`) : "none";

function isPortrait(element: SceneElement) {
  return element.type === "image" && portraitPattern.test(element.alt || "");
}

function SvgElement({ element, slide, index }: { element: SceneElement; slide: ReviewSlide; index: number }) {
  if (element.type === "table") return null;
  if (slide.kind !== "cover" && isPortrait(element)) return null;

  if (element.type === "rect") {
    return <rect
      x={element.x}
      y={element.y}
      width={element.w}
      height={element.h}
      fill={paint(element.fill)}
      fillOpacity={element.opacity ?? 1}
      stroke={paint(element.line)}
      vectorEffect="non-scaling-stroke"
    />;
  }

  if (element.type === "image") {
    return <image
      href={localAsset(element.src)}
      x={element.x}
      y={element.y}
      width={element.w}
      height={element.h}
      preserveAspectRatio={element.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
      role={element.alt ? "img" : undefined}
      aria-label={element.alt || undefined}
    />;
  }

  const text = <text
    x={element.x}
    y={element.y + element.size}
    fill={paint(element.color)}
    fontSize={element.size}
    fontWeight={element.bold ? 700 : 400}
  >
    {element.lines.map((line, lineIndex) => <tspan
      key={`${index}-${lineIndex}`}
      x={element.x}
      dy={lineIndex === 0 ? 0 : element.leading}
    >{line || " "}</tspan>)}
  </text>;

  return element.link
    ? <a href={element.link} target="_blank" rel="noreferrer" aria-label={`${element.text} (opens source in a new tab)`}>{text}</a>
    : text;
}

function DesktopSlide({ data, slide }: { data: DubaiSouthReviewData; slide: ReviewSlide }) {
  return <svg
    className={styles.slideCanvas}
    viewBox={`0 0 ${data.width} ${data.height}`}
    role="group"
    aria-roledescription="presentation slide"
    aria-labelledby={`review-slide-title-${slide.number}`}
  >
    <title id={`review-slide-title-${slide.number}`}>{slide.title}</title>
    <rect width={data.width} height={data.height} fill={paint(slide.background)} />
    {slide.elements.map((element, index) => <SvgElement key={`${element.type}-${index}`} element={element} slide={slide} index={index} />)}
  </svg>;
}

function SemanticTable({ table, slideTitle }: { table: TableScene; slideTitle: string }) {
  return <div className={styles.mobileTableWrap}>
    <table>
      <caption>{slideTitle}</caption>
      <thead><tr>{table.headers.map((header, index) => <th key={`${header}-${index}`} scope="col">{header}</th>)}</tr></thead>
      <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function SemanticText({ element }: { element: TextScene }) {
  const className = [
    styles.mobileText,
    element.bold ? styles.mobileTextStrong : "",
    element.size >= 24 ? styles.mobileHeadline : "",
    element.size <= 10 ? styles.mobileEyebrow : "",
  ].filter(Boolean).join(" ");
  const content = element.link
    ? <a href={element.link} target="_blank" rel="noreferrer">{element.text}</a>
    : element.text;

  if (element.size >= 24) return <h2 className={className}>{content}</h2>;
  if (element.bold && element.size >= 13) return <h3 className={className}>{content}</h3>;
  return <p className={className}>{content}</p>;
}

function MobileSlide({ slide }: { slide: ReviewSlide }) {
  const semanticElements = useMemo(() => slide.elements
    .filter((element) => !element.tableId)
    .filter((element) => element.type !== "rect")
    .filter((element) => slide.kind === "cover" || !isPortrait(element))
    .sort((left, right) => left.y - right.y || left.x - right.x), [slide]);
  const sourceUrls = new Set(slide.sources.map((source) => source.url));

  return <article className={`${styles.mobileSlide} ${slide.kind === "cover" ? styles.mobileCover : ""}`}>
    <header className={styles.mobileSlideHeader}>
      <span>{slide.project || slide.group}</span>
      <strong>{slide.title}</strong>
    </header>
    <div className={styles.mobileSlideBody}>
      {semanticElements.map((element, index) => {
        if (element.type === "table") return <SemanticTable key={`table-${element.id}`} table={element} slideTitle={slide.title} />;
        if (element.type === "image") {
          const compact = /PSR Homes/i.test(element.alt || "") || element.w < 120 || element.h < 120;
          return <figure className={`${styles.mobileFigure} ${element.fit === "contain" ? styles.mobileFigureContain : ""} ${compact ? styles.mobileFigureCompact : ""}`} key={`image-${index}`}>
            <img src={localAsset(element.src)} alt={element.alt || ""} loading={slide.kind === "cover" ? "eager" : "lazy"} />
          </figure>;
        }
        if (element.type === "text" && (!element.link || !sourceUrls.has(element.link))) {
          return <SemanticText key={`text-${index}`} element={element} />;
        }
        return null;
      })}
    </div>
    {slide.sources.length ? <footer className={styles.mobileSources}>
      <strong>Sources</strong>
      <ul>{slide.sources.map((source) => <li key={`${source.label}-${source.url}`}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
    </footer> : null}
  </article>;
}

function Icon({ name }: { name: "back" | "download" | "expand" | "collapse" | "previous" | "next" }) {
  if (name === "back") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h11" /></svg>;
  if (name === "download") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" /></svg>;
  if (name === "expand") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg>;
  if (name === "collapse") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5" /></svg>;
  if (name === "previous") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>;
}

export function DubaiSouthReviewPresentation({ presentation }: { presentation: DubaiSouthReviewData }) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeReportId, setActiveReportId] = useState(presentation.reports[0]?.id || "ready");
  const [activeSlideNumber, setActiveSlideNumber] = useState(() => presentation.slides.find((slide) => slide.group === (presentation.reports[0]?.id || "ready"))?.number || presentation.slides[0]?.number || 1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const report = presentation.reports.find((entry) => entry.id === activeReportId) || presentation.reports[0];
  const reportSlides = useMemo(() => presentation.slides.filter((slide) => slide.group === activeReportId), [activeReportId, presentation.slides]);
  const activeIndex = Math.max(0, reportSlides.findIndex((slide) => slide.number === activeSlideNumber));
  const activeSlide = reportSlides[activeIndex] || reportSlides[0] || presentation.slides[0];

  const showSlide = useCallback((index: number) => {
    if (!reportSlides.length) return;
    const bounded = Math.min(Math.max(index, 0), reportSlides.length - 1);
    const next = reportSlides[bounded];
    setActiveSlideNumber(next.number);
    window.history.replaceState(null, "", `#slide-${next.number}`);
  }, [reportSlides]);

  const selectReport = useCallback((id: string) => {
    const first = presentation.slides.find((slide) => slide.group === id);
    if (!first) return;
    setActiveReportId(id);
    setActiveSlideNumber(first.number);
    window.history.replaceState(null, "", `#slide-${first.number}`);
  }, [presentation.slides]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be disabled by browser policy; the viewer remains usable.
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("psr-review-presentation-open");
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    const syncHash = () => {
      const match = /^#slide-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const requested = presentation.slides.find((slide) => slide.number === Number(match[1]));
      if (!requested) return;
      setActiveReportId(requested.group);
      setActiveSlideNumber(requested.number);
    };
    syncHash();
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("hashchange", syncHash);
    return () => {
      document.body.classList.remove("psr-review-presentation-open");
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("hashchange", syncHash);
    };
  }, [presentation.slides]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, select, textarea, button, a")) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        showSlide(activeIndex + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        showSlide(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        showSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        showSlide(reportSlides.length - 1);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, reportSlides.length, showSlide, toggleFullscreen]);

  if (!report || !activeSlide) return null;

  const pdfHref = withBasePath(`/advisors/jumanah/dubai-south/files/${report.id}.pdf`);
  const pptHref = withBasePath("/advisors/jumanah/dubai-south/files/presentation.pptx");

  return <main className={styles.viewer} ref={rootRef} data-no-translate>
    <header className={styles.topbar}>
      <a className={styles.backLink} href={withBasePath("/advisors/jumanah")} aria-label="Return to Jumanah's profile">
        <Icon name="back" />
        <img src={withBasePath("/brand/psr-logo-light.png")} alt="PSR Homes" width="1254" height="1254" />
      </a>
      <div className={styles.identity}>
        <small>Private client review</small>
        <strong>{presentation.title}</strong>
        <span>{presentation.client} · {presentation.advisor}</span>
      </div>
      <nav className={styles.downloads} aria-label="Presentation downloads">
        <a href={pdfHref} download aria-label={`Download ${report.label}, ${report.budgetLabel}, PDF`}><Icon name="download" /><span>PDF</span></a>
        <a href={pptHref} download aria-label="Download the complete Dubai South PowerPoint presentation"><Icon name="download" /><span>PowerPoint</span></a>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : "Open full screen"}>
          <Icon name={isFullscreen ? "collapse" : "expand"} />
        </button>
      </nav>
    </header>

    <section className={styles.reportBar} aria-label="Report collection">
      <div className={styles.reportTabs} role="tablist" aria-label="Dubai South reports">
        {presentation.reports.map((entry) => <button
          type="button"
          key={entry.id}
          role="tab"
          aria-selected={entry.id === activeReportId}
          aria-label={`${entry.label}. ${entry.budgetLabel}`}
          className={entry.id === activeReportId ? styles.activeReport : ""}
          onClick={() => selectReport(entry.id)}
        >
          <span className={styles.reportLabel}>{entry.label}</span>
          <span className={styles.reportMobileLabel} aria-hidden="true">
            {entry.id === "ready" ? "Ready · up to AED 1.2M" : entry.id === "under" ? "Off-plan (Under Construction) · below AED 1.7M" : "Off-plan (Under Construction) · above AED 1.7M"}
          </span>
          <small>{entry.budgetLabel}</small>
        </button>)}
      </div>
      <label className={styles.jumpSelect}>
        <span>Jump to slide</span>
        <select
          value={activeSlide.number}
          onChange={(event) => {
            const selected = reportSlides.findIndex((slide) => slide.number === Number(event.target.value));
            if (selected >= 0) showSlide(selected);
          }}
        >
          {reportSlides.map((slide, index) => <option key={slide.number} value={slide.number}>{String(index + 1).padStart(2, "0")} · {slide.title}{slide.project ? ` — ${slide.project}` : ""}</option>)}
        </select>
      </label>
    </section>

    <section className={styles.stage} aria-live="polite">
      <div className={styles.slideFrame}>
        <DesktopSlide data={presentation} slide={activeSlide} />
      </div>
      <MobileSlide slide={activeSlide} />
    </section>

    <footer className={styles.controls}>
      <button type="button" onClick={() => showSlide(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous slide"><Icon name="previous" /><span>Previous</span></button>
      <div className={styles.progress}>
        <div><span style={{ width: `${((activeIndex + 1) / reportSlides.length) * 100}%` }} /></div>
        <p><strong>{String(activeIndex + 1).padStart(2, "0")}</strong> / {String(reportSlides.length).padStart(2, "0")}<span>{activeSlide.title}</span></p>
      </div>
      <p className={styles.variability}>Prices, inventory, incentives, charges and completion dates may change. Confirm the exact unit and written terms before purchase.</p>
      <button type="button" onClick={() => showSlide(activeIndex + 1)} disabled={activeIndex === reportSlides.length - 1} aria-label="Next slide"><span>Next</span><Icon name="next" /></button>
    </footer>
  </main>;
}
