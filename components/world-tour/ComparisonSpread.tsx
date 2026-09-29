import { WORLD_TOUR_PAGE_COUNT, worldTourEdition, type EditionFigure } from "@/lib/world-tour/edition";
import styles from "@/app/events/roadshow/world-tour/world-tour.module.css";

function FigureList({ figures }: { figures: EditionFigure[] }) {
  return <div className={styles.figures}>
    {figures.map((figure) => <article className={styles.figure} key={figure.id}>
      <p className={styles.figureLabel}>{figure.label}</p>
      <p className={styles.figureValue}>{figure.value}</p>
      <p className={styles.meta}>{figure.geography}. {figure.period}. {figure.unit}.</p>
      <p className={styles.kind}>{figure.kind}</p>
      <p className={styles.note}>{figure.note}</p>
      <a href={figure.sourceUrl}>{figure.source}</a>
    </article>)}
  </div>;
}

function Folio({ section, folio }: { section: string; folio: string }) {
  return <header className={styles.folio}>
    <span>{section}</span>
    <span>{folio} / {WORLD_TOUR_PAGE_COUNT}</span>
  </header>;
}

export function ComparisonSpread() {
  const comparison = worldTourEdition.comparison;
  return <>
    <article className={styles.sheet} id="p07" data-folio="07" data-treatment="evidence-led">
      <Folio section={comparison.section} folio={comparison.spaceFolio} />
      <div className={styles.sheetBody}>
        <h2 className={styles.title}>{comparison.spaceHeadline}</h2>
        <p className={styles.lede}>{comparison.spaceLede}</p>
        <FigureList figures={comparison.spaceFigures} />
      </div>
      <p className={styles.printInvite}>{worldTourEdition.invitationAction}. {worldTourEdition.invitationNote}</p>
    </article>
    <article className={styles.sheet} id="p08" data-folio="08" data-treatment="evidence-led">
      <Folio section={comparison.section} folio={comparison.termsFolio} />
      <div className={styles.sheetBody}>
        <h2 className={styles.title}>{comparison.termsHeadline}</h2>
        <p className={styles.lede}>{comparison.termsLede}</p>
        <FigureList figures={comparison.acquisitionFigures} />
        <div className={styles.termsNotes}>
          <p><span>Ownership. </span>{comparison.ownership.join(" ")}</p>
          <p><span>Income. </span>{comparison.income}</p>
          <p><span>Diversification. </span>{comparison.diversification}</p>
        </div>
      </div>
      <p className={styles.printInvite}>{worldTourEdition.invitationAction}. {worldTourEdition.invitationNote}</p>
    </article>
  </>;
}
