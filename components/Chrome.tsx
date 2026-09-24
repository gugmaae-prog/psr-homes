import Link from "@/components/SiteLink";
import { LanguageSelector } from "@/components/LanguageExperience";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PsrThemeLogo } from "@/components/PsrThemeLogo";
import { cbaCompany } from "@/data/cba-company";

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`wordmark${inverse ? " inverse" : ""}`} data-no-translate>
    <PsrThemeLogo className="wordmark-primary" alt="PSR Homes Real Estate LLC" />
  </span>;
}

export function InternalHeader() {
  return <header className="site-header internal-header">
      <Link href="/" aria-label="PSR home" data-no-translate><Wordmark /></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <Link href="/projects">Projects</Link>
        <Link href="/developers">Developers</Link>
        <Link href="/communities">Communities</Link>
        <Link href="/insights">Insights</Link>
        <div className="nav-about">
          <Link href="/about">About</Link>
          <div className="nav-about-menu" aria-label="About links">
            <Link href="/about">About us</Link>
            <Link href="/advisors">Our people</Link>
            <Link href="/services">Services</Link>
            <Link href="/agent" className="nav-about-agent">Agent login</Link>
          </div>
        </div>
      </nav>
      <div className="header-actions"><Link href="/list-your-property" className="text-link">List your property</Link><Link href="/contact" className="header-cta">Speak with an advisor</Link><ThemeToggle className="header-theme-toggle" /><LanguageSelector /></div>
      <div className="mobile-language"><ThemeToggle className="header-theme-toggle" /><LanguageSelector /></div>
      <details className="mobile-menu"><summary aria-label="Open navigation"><span /><span /></summary><nav><Link href="/projects">Projects</Link><Link href="/developers">Developers</Link><Link href="/communities">Communities</Link><Link href="/insights">Insights</Link><Link href="/emirate" className="mobile-sub-link">Emirates</Link><Link href="/about">About</Link><Link href="/advisors" className="mobile-sub-link">Our people</Link><Link href="/services" className="mobile-sub-link">Services</Link><Link href="/agent" className="mobile-sub-link">Agent login</Link><Link href="/list-your-property">List your property</Link></nav></details>
    </header>;
}

function SocialMark({ network }: { network: string }) {
  if (network === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.7" cy="6.5" r="1" className="fill" /></svg>;
  if (network === "youtube") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.2c-.2-1.5-1.3-2.6-2.8-2.8C16.5 5.1 14.5 5 12 5s-4.5.1-6.2.4C4.3 5.6 3.2 6.7 3 8.2a22.4 22.4 0 0 0 0 7.6c.2 1.5 1.3 2.6 2.8 2.8 1.7.3 3.7.4 6.2.4s4.5-.1 6.2-.4c1.5-.2 2.6-1.3 2.8-2.8a22.4 22.4 0 0 0 0-7.6Z" /><path d="m10 9 5 3-5 3V9Z" className="fill" /></svg>;
  if (network === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3" /><path d="M7.2 10.1v7M7.2 7v.1M10.6 17.1v-7m0 3.1c.7-2 5.4-2.4 5.4 1.5v2.4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M13.5 20.8v-7h2.4l.4-2.8h-2.8V9.2c0-.8.3-1.4 1.5-1.4h1.5V5.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H7.8v2.8h2.5v7" /></svg>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-brand">
      <div className="footer-brand-row">
        <Wordmark inverse />
        <nav className="footer-socials" aria-label="PSR social media">{Object.entries(cbaCompany.social).map(([label, href]) => href ? <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`PSR Homes on ${label}`} title={label.charAt(0).toUpperCase() + label.slice(1)}><SocialMark network={label} /></a> : null)}</nav>
      </div>
      <p>{cbaCompany.footerDescription}</p>
    </div>
    <div><p className="footer-label">Quick links</p><Link href="/about">About us</Link><Link href="/projects">Off-plan projects</Link><Link href="/properties">Our listings</Link><Link href="/contact">Contact us</Link><Link href="/agent">Agent workspace</Link></div>
    <div><p className="footer-label">Explore</p><Link href="/developers">Developers</Link><Link href="/communities">Communities</Link><Link href="/advisors">Our people</Link><Link href="/insights">Market insights</Link><Link href="/emirate">UAE Market Atlas</Link><Link href="/list-your-property">List your property</Link></div>
    <div><p className="footer-label">Contact</p><p>Contact us to discuss your property requirements.</p><p>{cbaCompany.addressLines.map((line) => <span key={line}>{line}<br /></span>)}{cbaCompany.orn && <span>ORN {cbaCompany.orn}<br /></span>}</p>{cbaCompany.phone && <a href={cbaCompany.phoneHref}>{cbaCompany.phone}</a>}{cbaCompany.landline && <a href={cbaCompany.landlineHref}>{cbaCompany.landline}</a>}{cbaCompany.email && <a href={`mailto:${cbaCompany.email}`}>{cbaCompany.emailDisplay}</a>}{cbaCompany.adminEmail && <a href={`mailto:${cbaCompany.adminEmail}`}>{cbaCompany.adminEmailDisplay}</a>}</div>
    <div className="footer-bottom"><span>Copyright 2026 PSR Homes</span><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms &amp; Conditions</Link></div>
  </footer>;
}

export function PageIntro({ kicker, title, copy }: { kicker: string; title: React.ReactNode; copy?: string }) {
  return <section className="page-intro"><p className="kicker">{kicker}</p><h1>{title}</h1>{copy && <p>{copy}</p>}</section>;
}
