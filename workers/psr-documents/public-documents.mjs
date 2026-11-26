import { CONTENT } from './document-content.mjs';
import { HEADER, FOOTER, FONT_STYLES, STYLESHEET } from './document-chrome.mjs';

// These two documents are stateless and do not read or write object storage.
const ORIGIN = 'https://psrhomes.ae';
const RELEASE = '2026-11-26-pdf-complete-v1';
const HOSTS = new Set(['psrhomes.ae', 'www.psrhomes.ae']);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const jsonScript = value => JSON.stringify(value).replace(/</g, '\\u003c');

const css = `
.psr-document-intro{max-width:1280px;margin:0 auto;padding:130px 6vw 42px}
.psr-document-intro h1{max-width:920px;font-size:clamp(38px,5.3vw,74px);line-height:1.08;letter-spacing:-.045em;margin:18px 0 24px;font-weight:400}
.psr-document-intro .kicker{text-transform:uppercase;font-size:12px;letter-spacing:.2em;color:#c2a78a}
.psr-document-intro .document-updated{font-size:14px;opacity:.8}
.psr-document-links{display:flex;gap:24px;flex-wrap:wrap;font-size:14px}
.psr-document-links a,.psr-document-toc a,.psr-document-copy a{text-decoration:underline;text-underline-offset:4px}
.psr-document-layout{max-width:1280px;padding:0 6vw 90px;margin:0 auto;display:grid;grid-template-columns:minmax(180px,245px) minmax(0,1fr);gap:clamp(32px,6vw,90px)}
.psr-document-toc{align-self:start;border-top:1px solid #a28e764d;padding-top:22px;font-size:14px;line-height:1.55}
.psr-document-toc p{font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;opacity:.75}
.psr-document-toc ol{list-style:none;padding:0;margin:0;display:grid;gap:13px}
.psr-document-toc a{display:block;padding:4px 0;text-decoration:none}
.psr-document-copy{min-width:0;max-width:780px}
.psr-document-section{border-top:1px solid #a28e764d;padding:26px 0 28px;scroll-margin-top:110px}
.psr-document-section h2{font-size:clamp(22px,2.3vw,29px);font-weight:500;letter-spacing:-.025em;line-height:1.3;margin:0 0 22px}
.psr-document-section p{font-size:16px;line-height:1.85;margin:0 0 18px;overflow-wrap:anywhere}
.psr-faq-answer{margin:0 0 27px}
.psr-faq-answer:last-child{margin-bottom:0}
.psr-faq-answer h3{font-size:17px;font-weight:600;line-height:1.5;margin:0 0 8px}
.psr-faq-answer p{opacity:.86}
.psr-document-skip{position:absolute;top:-100px;left:20px;z-index:10000;background:#fff;color:#111;padding:14px}
.psr-document-skip:focus{top:10px}
.psr-document-page :focus-visible{outline:2px solid #b8996b;outline-offset:5px}
.psr-document-page .footer-bottom{flex-wrap:wrap;gap:18px}
.psr-document-page .nav-about-menu{opacity:0;visibility:hidden;pointer-events:none}
.psr-document-page .nav-about:hover .nav-about-menu,.psr-document-page .nav-about:focus-within .nav-about-menu{opacity:1;visibility:visible;pointer-events:auto}
.psr-document-page .psr-logo-dark-surface{filter:brightness(0) invert(1)}
.psr-document-page .psr-logo-light-surface{filter:brightness(0)}
html[data-theme="light"] .psr-document-intro .kicker{color:#745d42}
@media(max-width:820px){.psr-document-intro{padding:112px 6vw 30px}.psr-document-layout{display:block;padding-bottom:54px}.psr-document-toc{margin-bottom:34px}.psr-document-toc ol{gap:6px}.psr-document-section{scroll-margin-top:85px}.psr-document-section p{font-size:16px;line-height:1.8}.psr-document-intro h1{font-size:42px}.psr-document-page .mobile-language{display:flex}}
@media print{.site-header,.site-footer,.psr-document-toc,.psr-document-links{display:none!important}.psr-document-page{color:#000!important;background:#fff!important}.psr-document-layout{display:block;padding:0}.psr-document-intro{padding:0 0 25px}.psr-document-section{break-inside:avoid}.psr-document-section h2,.psr-faq-answer h3{break-after:avoid}.psr-faq-answer p{opacity:1}}
`;

const themeScript = `(function(){function setTheme(theme){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem('psr-color-theme',theme)}catch(_){}document.querySelectorAll('.psr-theme-toggle').forEach(function(button){button.setAttribute('aria-checked',String(theme==='light'));button.setAttribute('aria-label',theme==='light'?'Use dark theme':'Use warm limestone theme')})}var saved;try{saved=localStorage.getItem('psr-color-theme')}catch(_){}setTheme(saved==='light'?'light':'dark');document.addEventListener('DOMContentLoaded',function(){setTheme(document.documentElement.dataset.theme)});document.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('.psr-theme-toggle');if(button){event.preventDefault();setTheme(document.documentElement.dataset.theme==='light'?'dark':'light')}});})();`;

function documentBody(kind) {
  const document = CONTENT[kind];
  const toc = document.sections.map(section => `<li><a href="#${slug(section.heading)}">${escapeHtml(section.heading)}</a></li>`).join('');
  const sections = document.sections.map(section => {
    const body = kind === 'terms'
      ? section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')
      : section.questions.map(entry => `<div class="psr-faq-answer"><h3>${escapeHtml(entry.question)}</h3><p>${escapeHtml(entry.answer)}</p></div>`).join('');
    return `<section class="psr-document-section" id="${slug(section.heading)}"><h2>${escapeHtml(section.heading)}</h2>${body}</section>`;
  }).join('');
  return `<section class="psr-document-intro"><p class="kicker">${kind === 'terms' ? 'Legal' : 'PSR Homes'}</p><h1>${escapeHtml(document.title)}</h1>${kind === 'terms' ? `<p class="document-updated">${escapeHtml(document.updated)}</p>` : ''}<nav class="psr-document-links" aria-label="Related pages"><a href="/${kind === 'terms' ? 'faq' : 'terms'}">${kind === 'terms' ? 'Frequently Asked Questions' : 'Terms &amp; Conditions'}</a><a href="/privacy">Privacy Policy</a><a href="/contact">Contact us</a></nav></section><div class="psr-document-layout"><nav class="psr-document-toc" aria-label="On this page"><p>On this page</p><ol>${toc}</ol></nav><article class="psr-document-copy" aria-label="${escapeHtml(document.title)}">${sections}</article></div>`;
}

function renderDocument(kind) {
  const document = CONTENT[kind];
  const path = kind === 'terms' ? '/terms' : '/faq';
  const description = kind === 'terms'
    ? 'Terms & Conditions for using the PSR Homes website and property services. Last updated: November 2026.'
    : 'Frequently asked questions about PSR Homes and 113 Residences, Wyndham Residences, Arancia Yards 2, Bashayer, Fleurs de Jardin and Dawn at O1NE District.';
  const structured = kind === 'faq' ? {'@context':'https://schema.org','@type':'FAQPage','@id':ORIGIN+path+'#faq',url:ORIGIN+path,name:document.title,mainEntity:document.sections.flatMap(section => section.questions.map(entry => ({'@type':'Question',name:entry.question,acceptedAnswer:{'@type':'Answer',text:entry.answer}})))} : {'@context':'https://schema.org','@type':'WebPage',url:ORIGIN+path,name:document.title};
  return `<!DOCTYPE html><html lang="en" dir="ltr" data-theme="dark" class="__variable_inter_1xwyqo7"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${escapeHtml(document.title)} | PSR Homes</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${ORIGIN+path}"><meta property="og:title" content="${escapeHtml(document.title)} | PSR Homes"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${ORIGIN+path}"><meta property="og:type" content="website"><meta property="og:site_name" content="PSR Homes"><link rel="icon" href="/favicon-light-32.png"><script>${themeScript}</script>${STYLESHEET}${FONT_STYLES}<style>${css}</style><script type="application/ld+json">${jsonScript(structured)}</script></head><body class="psr-document-page"><a class="psr-document-skip" href="#document-main">Skip to content</a>${HEADER}<main id="document-main">${documentBody(kind)}</main>${FOOTER}</body></html>`;
}

const documents = {terms:renderDocument('terms'),faq:renderDocument('faq')};

export function psrDocumentResponse(request) {
  const url = new URL(request.url);
  if (!HOSTS.has(url.hostname)) return null;
  const path = url.pathname.replace(/\/+$/, '');
  if (!['/terms','/faq','/faqs'].includes(path)) return null;
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const canonicalPath = path === '/faqs' ? '/faq' : path;
  if (url.hostname !== 'psrhomes.ae' || url.protocol !== 'https:' || url.pathname !== canonicalPath) {
    const target = new URL(canonicalPath, ORIGIN);
    // Keep attribution parameters, but remove stale framework transport parameters.
    for (const [key,value] of url.searchParams) if (!['_rsc','__rsc','__flight__'].includes(key)) target.searchParams.append(key,value);
    return new Response(null,{status:308,headers:{location:target.href,'cache-control':'no-store'}});
  }
  const kind = canonicalPath === '/terms' ? 'terms' : 'faq';
  return new Response(request.method === 'HEAD' ? null : documents[kind],{status:200,headers:{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store, must-revalidate',
    'content-language':'en',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'strict-transport-security':'max-age=31536000; includeSubDomains',
    'permissions-policy':'camera=(), microphone=(), geolocation=()',
    'content-security-policy':"frame-ancestors https://espacios.me http://localhost:4187;",
    'x-psr-document-release':RELEASE,
    'x-psr-source-sha256':CONTENT[kind].sourceSha256
  }});
}

