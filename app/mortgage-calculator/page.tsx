import { Footer, InternalHeader, PageIntro } from "@/components/Chrome";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("UAE Mortgage Calculator", "Estimate UAE mortgage payments, deposit, loan amount and upfront purchase costs before selecting a property.", "/mortgage-calculator");

export default function MortgageCalculatorPage() {
  return <main><InternalHeader />
    <PageIntro kicker="Finance modelling" title={<>Mortgage<br /><em>calculator.</em></>} copy="Estimate monthly exposure, deposit, registration fees and borrowing scale before moving from shortlist to reservation." />
    <section className="mortgage-page section-pad"><div><p className="kicker">Private client tool</p><h2>Price, deposit,<br /><em>rate and term.</em></h2><p>Use the calculator as an early affordability model. Final borrowing capacity, valuation, fees and documentation must be confirmed directly with the lender and registration authority.</p></div><MortgageCalculator context="UAE mortgage model" /></section>
    <Footer />
  </main>;
}
