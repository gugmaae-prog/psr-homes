import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { termsContent } from "@/data/legal-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  termsContent.title,
  "Terms and conditions for using the PSR Homes website, property information, advisory services and AI Sonu.",
  "/terms",
);

export default function TermsPage() {
  return (
    <main className="legal-page">
      <InternalHeader />
      <PageIntro kicker="Legal" title={termsContent.title} copy={termsContent.updated} />
      <article className="legal legal-content section-pad" aria-label={termsContent.title}>
        {termsContent.sections.map((section, index) => (
          <section key={section.heading} aria-labelledby={`terms-section-${index + 1}`} style={index ? { marginTop: "3rem" } : undefined}>
            <h2 id={`terms-section-${index + 1}`}>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>
      <Footer />
    </main>
  );
}
