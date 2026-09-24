import type { ReactNode } from "react";
import { Footer, InternalHeader } from "@/components/Chrome";
import { InsightsSectionTabs, type InsightsSection } from "@/components/InsightsSectionTabs";

type PsrPageShellProps = {
  children: ReactNode;
  className?: string;
  insightsSection?: InsightsSection;
  structuredData?: unknown;
};

/**
 * The shared frame for public PSR pages.
 *
 * Route content owns its editorial sections; this component owns the pieces
 * that must never drift between pages: PSR chrome, optional section navigation,
 * structured data placement and the site footer.
 */
export function PsrPageShell({
  children,
  className,
  insightsSection,
  structuredData,
}: PsrPageShellProps) {
  const pageClassName = ["psr-page-shell", className].filter(Boolean).join(" ");

  return <main
    className={pageClassName}
    data-psr-page-shell="public"
    data-psr-section={insightsSection}
  >
    <InternalHeader />
    {insightsSection ? <section className="insights-tabs-band" aria-label="Insights navigation">
      <InsightsSectionTabs active={insightsSection} />
    </section> : null}
    {children}
    {structuredData !== undefined ? <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    /> : null}
    <Footer />
  </main>;
}
