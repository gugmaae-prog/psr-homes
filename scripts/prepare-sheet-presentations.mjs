import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const records=[
 ['azizi-venice-14-building-g','Azizi Venice 14 Building G',959400,725,'under','Azizi Developments'],
 ['seraya-by-zoya','Seraya by Zoya',790000,null,'under','Zoya Developments',1400000],
 ['golf-point-tower-2','Golf Point Tower 2',1050000,679,'under','Emaar'],
 ['golf-vale','Golf Vale',1100000,null,'under','Emaar',1200000],
 ['golf-trails','Golf Trails',1060000,null,'under','Emaar'],
 ['golf-meadow','Golf Meadow',1350000,716,'under','Emaar'],
 ['golf-hills','Golf Hills',1201888,676,'under','Emaar'],
 ['golf-acres','Golf Acres',1250000,812,'under','Emaar'],
 ['celestia-b','Celestia B',880000,727,'ready','DAMAC'],
 ['the-harmony-2','The Harmony 2',860000,629,'under','Al Mizan'],
 ['enre-residence','Enre Residence by Imtiaz',1382612,734,'under','Imtiaz'],
 ['the-eighty-three','The Eighty Three by OKSA',1200000,681,'under','OKSA'],
 ['cresswell-views','Cresswell Views',1250000,823,'under','Arady Properties'],
 ['windsor-house-building-b','Windsor House Building B',1279000,782,'under','Ellington'],
 ['vivida-residences','Vivida Residences',870271,718,'under','NAMO Development'],
 ['marquis-horizon','Marquis Horizon',1338400,783,'under','Marquis'],
 ['the-pulse-residence-park-b3','The Pulse Residence Park B3',675000,640,'ready','Dubai South Properties'],
 ['terra-heights','Terra Heights',1650000,728,'above','Emaar'],
];
const registry=JSON.parse(await fs.readFile(path.join(root,'data/dubai-south-floorplan-register.json'),'utf8'));
const out=path.join(root,'tmp/sheet-presentations');await fs.mkdir(out,{recursive:true});
const data=[];
for(const [id,name,price,area,group,developer,priceMax] of records){
 const ref=registry.projects.find(p=>p.id===id || (id==='terra-heights'&&p.id==='terra-heights-building-2'));
 const item={id,name,price,area,group,developer,priceMax:priceMax||price,sourceRow:id==='terra-heights'?19:records.findIndex(r=>r[0]===id)+2,sourceUrl:ref?.sourceUrl||'',gallery:[],plans:ref?.reviewPlans?.filter(p=>p.reviewStatus==='reviewed-project-reference')||[],qualification:ref?.qualification||'Selected-unit plan not confirmed.',payment:[],handover:'Confirm current completion schedule'};
 if(item.sourceUrl.includes('propertyfinder.ae/en/new-projects')){
  const cache=path.join(root,'tmp/floorplans-20260912',Buffer.from(item.sourceUrl).toString('base64url')+'.html');
  try{
   const html=await fs.readFile(cache,'utf8');const j=JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)[1]).props.pageProps.detailResult;
   item.payment=j.paymentPlans?.[0]?.phases||[];item.handover=j.deliveryDate||item.handover;
   item.amenities=(j.amenities||[]).slice(0,6);item.sourceTitle=j.title;
   const images=j.images.filter(i=>i.type==='image').slice(0,4);
   for(const [i,img] of images.entries()){
    const file=path.join(out,`${id}-${i}.webp`);
    try{await fs.access(file)}catch{const r=await fetch(img.source,{signal:AbortSignal.timeout(15000)});if(!r.ok)continue;await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}
    item.gallery.push({path:file,source:img.source,label:'Published project imagery; not selected-unit photography'});
   }
  }catch(error){console.log(name,error.message)}
 }
 const locals={
  'golf-trails':['/projects/golf-trails/hero.jpg','/projects/golf-trails/interior-01.jpg'],
  'enre-residence':['/projects/enre-residence/hero.jpg'],
  'windsor-house-building-b':['/presentations/dubai-south-investor-brief/projects/windsor-house/hero.webp','/presentations/dubai-south-investor-brief/projects/windsor-house/interior-1.webp'],
 };
 if(!item.gallery.length)for(const p of locals[id]||[]){try{await fs.access(path.join(root,'public',p));item.gallery.push({path:path.join(root,'public',p),source:'PSR stored project library',label:'Project reference; building/unit not verified'})}catch{}}
 if(!item.gallery.length){
  const url='https://jre.ae/projects/'+id.replace('-tower-2','');
  try{
   const cache=path.join(root,'tmp/floorplans-20260912',Buffer.from(url).toString('base64url')+'.html');
   let html;try{html=await fs.readFile(cache,'utf8')}catch{html=await(await fetch(url,{signal:AbortSignal.timeout(12000)})).text()}
   const seen=new Set();
   for(const [tag] of html.matchAll(/<img\b[^>]+>/g)){
    const alt=tag.match(/alt="([^"]*)"/)?.[1]||'';
    if(/floor|logo|master.?plan|agent|qr/i.test(alt)||!alt.toLowerCase().includes(id.split('-')[0]))continue;
    let src=(tag.match(/\ssrc="([^"]*)"/)?.[1]||'').replaceAll('&amp;','&');if(!src)continue;
    const parsed=new URL(src,url);if(parsed.pathname==='/_next/image')src=parsed.searchParams.get('url')||src;
    src=new URL(src,url).href;if(seen.has(src))continue;seen.add(src);
    const r=await fetch(src,{signal:AbortSignal.timeout(12000)});if(!r.ok)continue;
    const file=path.join(out,`${id}-jre-${item.gallery.length}.webp`);await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));
    item.gallery.push({path:file,source:url,label:'Project imagery from JRE; not selected-unit photography'});
    if(item.gallery.length>=3)break;
   }
  }catch(error){console.log(name,'gallery',error.message)}
 }
 // The phase II drawing cannot be assigned to Windsor House Building B.
 if(id==='windsor-house-building-b'){item.plans=[];item.qualification='Windsor House Building B; do not substitute Windsor House II plans.';}
 data.push(item);console.log(name,item.gallery.length,item.plans.length);
}
await fs.writeFile(path.join(out,'projects.json'),JSON.stringify(data,null,2));
