"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { WORLD_TOUR_DOWNLOAD_PATH, WORLD_TOUR_PAGE_COUNT, worldTourEdition } from "@/lib/world-tour/edition";
import { ComparisonSpread } from "@/components/world-tour/ComparisonSpread";
import { CoverPage } from "@/components/world-tour/CoverPage";
import { DevelopmentSpread } from "@/components/world-tour/DevelopmentSpread";
import styles from "./world-tour.module.css";

const FOLIOS = ["01", "07", "08", "09", "10"];

export function WorldTourReader() {
  const [index, setIndex] = useState(0);
  const edition = worldTourEdition;

  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-folio]")];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!visible) return;
      const next = nodes.indexOf(visible.target as HTMLElement);
      if (next >= 0) setIndex(next);
    }, { threshold: 0.55 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function show(next: number) {
    const target = Math.max(0, Math.min(FOLIOS.length - 1, next));
    setIndex(target);
    document.getElementById(`p${FOLIOS[target]}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return <div className={`${styles.edition} wt-edition`}>
    <div className={styles.stage} id="world-tour-reader">
      <CoverPage />
      <ComparisonSpread />
      <DevelopmentSpread />
    </div>
    <nav className={styles.nav} aria-label="World Tour edition">
      <button type="button" onClick={() => show(index - 1)}>Previous</button>
      <button type="button" onClick={() => show(index + 1)}>Next</button>
      <span className={styles.counter}>{FOLIOS[index]} / {WORLD_TOUR_PAGE_COUNT}</span>
      <a href={withBasePath(WORLD_TOUR_DOWNLOAD_PATH)}>Download PDF</a>
      <a href={withBasePath(edition.researchMasterHref)}>{edition.researchMasterLabel}</a>
      <a href={withBasePath(edition.registrationHref)}>{edition.invitationAction}</a>
      <p className={styles.navNote}>{edition.invitationNote}</p>
    </nav>
  </div>;
}
