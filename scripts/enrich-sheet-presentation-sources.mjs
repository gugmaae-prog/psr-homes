import fs from 'node:fs/promises';
const root='/Users/keifferjapeth/Documents/Codex/PSR/psrhomes',file=root+'/tmp/sheet-presentations/projects.json';
const data=JSON.parse(await fs.readFile(file,'utf8'));
const sources={
 'seraya-by-zoya':'https://jre.ae/projects/seraya-by-zoya',
 'golf-trails':'https://properties.emaar.com/en/properties/golf-trails/',
 'celestia-b':'https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-dubai-dubai-south-dubai-world-central-residential-district-celestia-celestia-b-131559865.html',
 'enre-residence':'https://imtiaz.ae/property/enre-residence-by-imtiaz',
 'windsor-house-building-b':'https://ellingtonproperties.ae/en/property-for-sale/windsor-house-dubai-south',
};
for(const p of data)if(sources[p.id])p.sourceUrl=sources[p.id];
// Acquire new references independently; do not modify live project-media mappings.
for(const [id,url,pattern] of [
 ['cresswell-views','https://jre.ae/projects/cresswell-views',/Cresswell Views (architecture|gallery [2-4])/i],
 ['the-harmony-2','https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-residential-district-the-harmony-the-harmony-2-140569479.html',/image/i]
]){
 const p=data.find(p=>p.id===id);const h=await(await fetch(url)).text();
 await fs.writeFile(root+'/tmp/sheet-presentations/'+id+'-source.html',h);
 const refs=[];
 if(id==='the-harmony-2'){
  for(const m of h.matchAll(/https:\/\/static\.shared\.propertyfinder\.ae\/media\/images\/listing\/[^"\s<>]+/g))refs.push(m[0].replaceAll('&amp;','&').replaceAll('\\',''));
 }else for(const [tag] of h.matchAll(/<img\b[^>]+>/g)){
  const alt=tag.match(/alt="([^"]*)"/)?.[1]||'';if(!pattern.test(alt))continue;
  let src=tag.match(/\ssrc="([^"]*)"/)?.[1];if(!src)continue;
  const u=new URL(src.replaceAll('&amp;','&'),url);refs.push(u.pathname==='/_next/image'?u.searchParams.get('url'):u.href);
 }
 const images=[];
 for(const ref of [...new Set(refs)].slice(0,3)){
  try{const r=await fetch(new URL(ref,url),{signal:AbortSignal.timeout(12000)});if(!r.ok)continue;const path=root+'/tmp/sheet-presentations/'+id+'-ref-'+images.length+'.jpg';await fs.writeFile(path,Buffer.from(await r.arrayBuffer()));images.push({path,source:url,label:'Published project / listing reference; not selected-unit confirmation'});}catch{}
 }
 if(images.length){p.gallery=images;p.galleryReviewedSource=true;}console.log(id,images.length);
}
await fs.writeFile(file,JSON.stringify(data,null,2));
