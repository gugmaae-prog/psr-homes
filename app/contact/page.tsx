import { Footer, InternalHeader } from "@/components/Chrome";
import { LeadForm } from "@/components/LeadForm";
import { pageMetadata } from "@/lib/seo";
import { cbaCompany } from "@/data/cba-company";

export const metadata = pageMetadata("Contact PSR", "Start a UAE property acquisition, investment, sale or leasing conversation with PSR in Dubai.", "/contact");

export default function ContactPage() {
  return <main><InternalHeader /><section className="contact-layout"><div className="contact-copy"><p className="kicker light">Start with the objective</p><h1>Tell us what<br /><em>you want to achieve.</em></h1><p>Buy, sell, rent, invest or list a property in Dubai—share the brief and the PSR team will bring the market into focus.</p><div className="contact-details"><div><span>Call</span><a href={cbaCompany.phoneHref}>{cbaCompany.phone}</a></div><div><span>Response</span><p>A PSR advisor will reply through the contact details you provide.</p></div><div><span>Visit</span><p>{cbaCompany.addressLines.join(", ")}</p></div></div></div><div className="contact-form-panel"><p className="kicker">Your brief</p><h2>What should the asset deliver?</h2><LeadForm source="contact-page" /></div></section><Footer /></main>;
}
