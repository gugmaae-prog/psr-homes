import Link from "@/components/SiteLink";
import { WORLD_TOUR_PAGE_COUNT, worldTourAsset, worldTourEdition } from "@/lib/world-tour/edition";
import styles from "@/app/events/roadshow/world-tour/world-tour.module.css";

function Folio({ section, folio }: { section: string; folio: string }) {
  return <header className={styles.folio}>
    <img className={styles.folioLogo} src={worldTourAsset("/brand/psr-logo-dark.png")} alt="" width="1254" height="1254" />
    <span>{section}</span>
    <span>{folio} / {WORLD_TOUR_PAGE_COUNT}</span>
  </header>;
}

export function DevelopmentSpread() {
  const story = worldTourEdition.southDubai;
  const image = worldTourEdition.southDubaiImage;
  return <>
    <article className={styles.sheet} id="p09" data-folio="09" data-treatment="image-led">
      <Folio section={story.section} folio={story.storyFolio} />
      <div className={styles.sheetBody}>
        <div className={styles.story}>
          <div className={styles.feature}>
            <figure className={styles.frame}>
              <img src={worldTourAsset(image.src)} alt={image.alt} width={image.width} height={image.height} />
              <figcaption className={styles.caption}>{image.caption}</figcaption>
            </figure>
            <div className={styles.featureCopy}>
              <h2 className={styles.title}>{story.storyHeadline}</h2>
              <p className={styles.lede}>{story.storyLede}</p>
              <p className={styles.meta}>{story.location}</p>
              <h3 className={styles.blockTitle}>What is changing</h3>
              <p className={styles.blockCopy}>{story.changing}</p>
              <h3 className={styles.blockTitle}>Why it could matter</h3>
              <p className={styles.blockCopy}>{story.matters}</p>
              <p className={styles.note}>{story.organisation}</p>
            </div>
          </div>
          <div className={styles.figureStrip}>
            {story.figures.map((figure) => <article className={styles.figure} key={figure.id}>
              <p className={styles.figureLabel}>{figure.label}</p>
              <p className={styles.figureValue}>{figure.value}</p>
              <p className={styles.meta}>{figure.geography}. {figure.period}. {figure.kind}.</p>
              <p className={styles.note}>{figure.note}</p>
              <a href={figure.sourceUrl}>{figure.source}</a>
            </article>)}
          </div>
        </div>
      </div>
      <p className={styles.printInvite}>{worldTourEdition.invitationAction}. {worldTourEdition.invitationNote}</p>
    </article>
    <article className={styles.sheet} id="p10" data-folio="10" data-treatment="map-led">
      <Folio section={story.section} folio={story.mapFolio} />
      <div className={styles.sheetBody}>
        <div className={styles.mapLayout}>
          <div className={styles.map}>
            <h2 className={styles.title}>{story.mapHeadline}</h2>
            <p className={styles.lede}>{story.mapLede}</p>
            <svg viewBox="0 0 520 250" role="img" aria-labelledby="south-dubai-map-title">
              <title id="south-dubai-map-title">District orientation for South Dubai</title>
              <path className={styles.mapLine} d="M36 48c78 18 150 8 250-12s150 8 198 22" />
              <path className={styles.mapLine} d="M28 188c90-36 170-20 250 8s150 18 214-6" />
              <path className={styles.mapLine} d="M118 78c40 48 70 78 150 96" />
              <circle className={styles.mapDot} cx="118" cy="72" r="3.2" />
              <circle className={styles.mapDot} cx="392" cy="92" r="3.2" />
              <circle className={styles.mapDot} cx="132" cy="176" r="3.2" />
              <circle className={styles.mapDot} cx="286" cy="168" r="3.2" />
              <text className={styles.mapLabel} x="132" y="68">Expo City Dubai</text>
              <text className={styles.mapStatus} x="132" y="84">Operating district</text>
              <text className={styles.mapLabel} x="300" y="78">Residential District</text>
              <text className={styles.mapStatus} x="300" y="94">Dubai South</text>
              <text className={styles.mapLabel} x="146" y="172">Emaar South</text>
              <text className={styles.mapStatus} x="146" y="188">Separate community</text>
              <text className={styles.mapLabel} x="300" y="164">Al Maktoum airport</text>
              <text className={styles.mapStatus} x="300" y="180">Expansion announced</text>
            </svg>
          </div>
          <div className={styles.mapCopy}>
            <ol className={styles.examples}>
              {story.examples.map((example) => <li key={example.name}>
                <p className={styles.exampleName}><Link href={example.href}>{example.name}</Link></p>
                <p className={styles.exampleMeta}>{example.developer}. {example.location}.</p>
                <p className={styles.exampleMeta}>{example.priceKind}. {example.price}.</p>
                <p className={styles.exampleMeta}>{example.handover}. {example.status}</p>
                <a href={example.sourceUrl}>{example.developer}, reviewed {example.reviewed}</a>
              </li>)}
            </ol>
            <ul className={styles.weaken}>
              {story.weaken.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className={styles.note}>
              Fuller comparisons remain in the <Link href={worldTourEdition.researchMasterHref}>{worldTourEdition.researchMasterLabel}</Link>.
              Developer names are set in type.
            </p>
          </div>
        </div>
      </div>
      <p className={styles.printInvite}>{worldTourEdition.invitationAction}. {worldTourEdition.invitationNote}</p>
    </article>
  </>;
}
