import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { faqContent } from "@/data/legal-content";
import { faqStructuredData, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  faqContent.title,
  "Frequently asked questions about PSR Homes and featured UAE property projects, including prices, payment plans, handover dates and locations.",
  "/faq",
);

export default function FaqPage() {
  const questions = faqContent.sections.flatMap((section) => section.questions);
  const structuredData = faqStructuredData("/faq", questions);

  return (
    <main className="legal-page">
      <InternalHeader />
      <PageIntro kicker="PSR Homes" title={faqContent.title} />
      <article className="legal legal-content section-pad" aria-label={faqContent.title}>
        {faqContent.sections.map((section, sectionIndex) => (
          <section key={section.heading} aria-labelledby={`faq-section-${sectionIndex + 1}`} style={sectionIndex ? { marginTop: "3rem" } : undefined}>
            <h2 id={`faq-section-${sectionIndex + 1}`}>{section.heading}</h2>
            {section.questions.map((item, questionIndex) => (
              <div key={item.question} style={{ marginTop: "1.75rem" }}>
                <h3 id={`faq-question-${sectionIndex + 1}-${questionIndex + 1}`} style={{ fontSize: "clamp(18px, 2vw, 22px)", lineHeight: 1.4 }}>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </section>
        ))}
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <Footer />
    </main>
  );
}
