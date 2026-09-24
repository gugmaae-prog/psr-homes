import { PsrPageShell } from "@/components/PsrPageShell";
import { withBasePath } from "@/lib/base-path";
import { pageMetadata, SITE_ORIGIN } from "@/lib/seo";
import { SG26_EVENT_NAME, SG26_SESSIONS } from "@/lib/sg26";
import { SingaporeRegistration } from "./SingaporeRegistration";
import { WorldTourHero } from "./WorldTourHero";
import styles from "./sg26.module.css";

const description = "Join PSR in Singapore on 13 or 14 November 2026 for a private UAE property showcase, with business setup and family office migration guidance from Eastlink Gateway.";

export const metadata = pageMetadata(
  "Singapore Property Show 2026",
  description,
  "/sg26",
  "/hero/psr-global-roadshow-singapore-cover.png",
);

export default function SingaporePropertyShowPage() {
  const eventData = SG26_SESSIONS.map((session) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: SG26_EVENT_NAME,
    description,
    startDate: session.iso,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Singapore",
      address: { "@type": "PostalAddress", addressCountry: "SG", addressLocality: "Singapore" },
    },
    organizer: { "@type": "Organization", name: "PSR Homes", url: SITE_ORIGIN },
    image: `${SITE_ORIGIN}/hero/psr-global-roadshow-singapore-cover.png`,
    url: `${SITE_ORIGIN}/sg26`,
  }));

  return <PsrPageShell className={styles.page} structuredData={eventData}>

    <WorldTourHero />

    <section className={styles.introduction} id="experience">
      <div>
        <p className={styles.eyebrow}>One room. Three conversations.</p>
        <h2>A considered route into the UAE.</h2>
      </div>
      <p>Meet in Singapore with advisors who can connect the property decision to the wider move. PSR leads the property showcase, while Eastlink Gateway brings business setup and family office migration guidance into the same private conversation.</p>
    </section>

    <section className={styles.pathways} aria-label="Event advisory themes">
      <article className={`${styles.pathway} ${styles.propertyPathway}`}>
        <img src={withBasePath("/projects/al-yalayis/hero.webp")} alt="Contemporary villa in a landscaped UAE community" width="1672" height="941" loading="lazy" />
        <div className={styles.pathwayOverlay} />
        <small className={styles.conceptLabel}>Concept imagery</small>
        <div className={styles.pathwayCopy}>
          <span>01 · Presented by PSR</span>
          <h3>UAE property showcase</h3>
          <p>Review curated residences, compare locations and payment structures, and discuss the investment logic with PSR advisors.</p>
        </div>
      </article>
      <article className={styles.pathway}>
        <span>02 · Eastlink Gateway advisory</span>
        <h3>Business setup</h3>
        <p>Explore practical setup pathways for founders, operating companies and international investors establishing a UAE presence.</p>
        <div className={styles.pathwayLine} />
        <small>Advisory availability during both sessions</small>
      </article>
      <article className={styles.pathway}>
        <span>03 · Eastlink Gateway advisory</span>
        <h3>Family office migration</h3>
        <p>Start a private conversation about structuring a longer-term presence for family capital, governance and succession planning.</p>
        <div className={styles.pathwayLine} />
        <small>Individual circumstances require tailored advice</small>
      </article>
    </section>

    <section className={styles.editorialBand}>
      <div className={styles.editorialImage}>
        <img src={withBasePath("/projects/avenue-park-towers-ii/hero.webp")} alt="Contemporary UAE residential towers at sunset" width="1672" height="941" loading="lazy" />
        <small className={styles.conceptLabel}>Concept imagery</small>
      </div>
      <div className={styles.editorialCopy}>
        <p className={styles.eyebrow}>Built around your brief</p>
        <h2>Come with a question. Leave with a clearer next move.</h2>
        <ol>
          <li><span>01</span><div><strong>Set the objective</strong><p>Clarify property, residency and business priorities before recommendations begin.</p></div></li>
          <li><span>02</span><div><strong>Compare opportunities</strong><p>Review selected UAE locations, residence types and acquisition structures.</p></div></li>
          <li><span>03</span><div><strong>Meet the right advisor</strong><p>Connect with PSR for property and Eastlink Gateway for setup or family office questions.</p></div></li>
          <li><span>04</span><div><strong>Define the next step</strong><p>Leave with a focused follow-up, prepared around your own requirements.</p></div></li>
        </ol>
      </div>
    </section>

    <section className={styles.sessionsSection}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Choose your session</p>
        <h2>Two dates in Singapore.</h2>
        <p>Choose the date that best suits your schedule. Final event details will be shared with confirmed attendees.</p>
      </div>
      <div className={styles.sessionCards}>{SG26_SESSIONS.map((session, index) => <article className={styles.sessionCard} key={session.id}>
        <span>Session 0{index + 1}</span>
        <div><strong>{session.day}</strong><h3>{session.date.replace(" 2026", "")}</h3></div>
        <time dateTime={session.iso}>{session.time}</time>
        <p>Singapore</p>
        <a href="#request-invite">Request an invitation <span aria-hidden="true">↗</span></a>
      </article>)}</div>
    </section>

    <section className={styles.invitationSection} id="request-invite">
      <div className={styles.invitationCopy}>
        <p className={styles.eyebrow}>Singapore · 30–31 October 2026</p>
        <h2>Your invitation starts here.</h2>
        <p>This is a focused, appointment-led property show for investors, founders and families considering a move into the UAE.</p>
        <dl>
          <div><dt>Hosted by</dt><dd>PSR Homes</dd></div>
          <div><dt>Advisory services</dt><dd>PSR Homes &amp; Eastlink Gateway</dd></div>
        </dl>
        <p className={styles.partnerNote}>Property availability and pricing remain subject to confirmation. Business setup and family office services remain subject to applicable eligibility and regulatory requirements.</p>
      </div>
      <SingaporeRegistration />
    </section>

  </PsrPageShell>;
}
