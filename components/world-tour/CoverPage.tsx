import { withBasePath } from "@/lib/base-path";
import { WORLD_TOUR_PAGE_COUNT, worldTourEdition } from "@/lib/world-tour/edition";
import styles from "@/app/events/roadshow/world-tour/world-tour.module.css";

export function CoverPage() {
  const edition = worldTourEdition;
  return <article className={styles.sheet} id="p01" data-folio="01" data-treatment="cover">
    <div className={styles.cover}>
      <img
        className={styles.coverLogo}
        src={withBasePath("/brand/psr-logo-dark.png")}
        alt="PSR Homes"
        width="1254"
        height="1254"
      />
      <div className={styles.coverBody}>
        <figure className={styles.frame}>
          <img
            src={withBasePath(edition.coverImage.src)}
            alt={edition.coverImage.alt}
            width={edition.coverImage.width}
            height={edition.coverImage.height}
          />
          <figcaption className={styles.caption}>{edition.coverImage.caption}</figcaption>
        </figure>
        <div>
          <h1 className={styles.title}>{edition.title}</h1>
          <p className={styles.deck}>{edition.deck}</p>
          <p className={styles.editionLine}>{edition.editionLine}</p>
          <ul className={styles.sessionList}>
            {edition.sessions.map((session) => <li key={session}>{session}</li>)}
          </ul>
        </div>
      </div>
    </div>
    <p className={styles.printInvite}>{edition.invitationAction}. {edition.invitationNote}</p>
    <p className={styles.sheetFooter}><span>Cover</span><span>01 / {WORLD_TOUR_PAGE_COUNT}</span></p>
  </article>;
}
