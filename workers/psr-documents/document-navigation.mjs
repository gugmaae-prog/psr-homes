const HOSTS = new Set(['psrhomes.ae', 'www.psrhomes.ae']);

// The deployed app's older client router does not know /faq. Use ordinary full
// navigation for both documents so it cannot restore the superseded Terms body.
const navigationScript = `<script data-psr-document-navigation>(function(){if(window.__psrDocumentNavigation)return;window.__psrDocumentNavigation=true;function links(){document.querySelectorAll('.footer-bottom').forEach(function(footer){if(!footer.querySelector('a[href="/faq"]')){var a=document.createElement('a');a.href='/faq';a.textContent='FAQ';footer.appendChild(a)}})}document.addEventListener('click',function(event){if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;var a=event.target.closest&&event.target.closest('a[href]');if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;try{var url=new URL(a.href,location.href);if(url.origin===location.origin&&/^\\/(?:terms|faqs?)\\/?$/.test(url.pathname)){event.preventDefault();event.stopImmediatePropagation();location.assign(url.href)}}catch(_){}},true);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',links,{once:true});else links();new MutationObserver(function(records){if(records.some(function(r){return r.addedNodes.length||r.removedNodes.length}))links()}).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;

export function psrDocumentNavigation(request, response) {
  const url = new URL(request.url);
  if (!HOSTS.has(url.hostname) || request.method !== 'GET' || response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html') || /^\/(?:api|agent|admin|analytics|leads)(?:\/|$)/.test(url.pathname)) return response;
  const output = new HTMLRewriter()
    .on('.footer-bottom',{element(element){element.append('<a href="/faq" data-psr-faq-link>FAQ</a>',{html:true});}})
    .on('body',{element(element){element.append(navigationScript,{html:true});}})
    .transform(response);
  const headers = new Headers(output.headers);
  for (const name of ['content-length','content-encoding','etag']) headers.delete(name);
  return new Response(output.body,{status:output.status,statusText:output.statusText,headers});
}
