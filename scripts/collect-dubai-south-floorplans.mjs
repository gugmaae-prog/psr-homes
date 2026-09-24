import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const targets=[
 ['the-pulse-residence-park-b3','The Pulse Residence Park B3',[],640,'Building and size reference; exact selected unit requires its unit number.'],
 ['the-harmony-2','The Harmony 2',['al-mizan-property-developer/the-harmony-2'],null,'Dubai South building reference. Do not substitute Harmony II in Tilal Al Ghaf.'],
 ['celestia-b','Celestia B',[],null,'Tower B typical layout reference.'],
 ['seraya-by-zoya','Seraya by Zoya',['zoya-developments/seraya-by-zoya'],null,'Project and bedroom reference; selected size and type remain to be matched.'],
 ['vivida-residences','Vivida Residences',['namo-development/vivida-residences'],null,'Project and bedroom reference; selected size and type remain to be matched.'],
 ['azizi-venice-14-building-g','Azizi Venice 14 - Building G',['azizi-developments/azizi-venice-14'],null,'Building A published plan: project reference only. This is not a Building G floorplan.'],
 ['cresswell-views','Cresswell Views',['arady-properties/cresswell-views'],823,'1BR Type A reference; distinct from Cresswell Plaza.'],
 ['golf-point-tower-2','Golf Point Tower 2',[],null,'Tower 2 Type A3 reference; confirm the selected unit and floor.'],
 ['golf-vale','Golf Vale',['emaar-properties/golf-vale'],null,'Published project layouts; select by bedroom, area and unit type.'],
 ['golf-hills','Golf Hills',['emaar-properties/golf-hills'],null,'Published project layouts; select by bedroom, area and unit type.'],
 ['golf-trails','Golf Trails',['emaar-properties/golf-trails'],null,'Published project layouts; confirm unit code against the developer plan.'],
 ['windsor-house-ii-building-b','Windsor House II - Building B',['ellington/windsor-house-phase-2-by-ellington'],779,'Phase 2 Type 1 reference. Building B and selected unit require confirmation.'],
 ['south-square-s1','South Square S1',['dubai-south/south-square'],null,'Project reference; match S1 building, selected unit and area.'],
 ['south-living','South Living',['dubai-south/south-living'],null,'Published layout reference; confirm the unit and floor.'],
 ['divine-elements','Divine Elements',['takmeel-real-estate-development/divine-elements'],716.55,'Published unit-type reference; confirm the selected unit code.'],
 ['the-eighty-three','The Eighty Three by OKSA',['oksa-developer/the-eighty-three'],null,'Published project layouts; select by bedroom, area and unit type.'],
 ['golf-acres','Golf Acres',['emaar-properties/golf-acres'],null,'Published project layouts; select by bedroom, area and unit type.'],
 ['marquis-horizon','Marquis Horizon',['marquis/marquis-horizon','marquis-developers/marquis-horizon'],null,'Project and bedroom reference; price alone does not establish a layout match.'],
 ['golf-meadow','Golf Meadow',['emaar-properties/golf-meadow'],null,'Published project layouts; confirm the selected unit number.'],
 ['enre-residence','Enre Residence',['imtiaz-developments/enre-residence'],null,'Published layout reference; distinguish a building floorplate from an individual unit plan.'],
 ['terra-heights-building-2','Terra Heights - Building 2',[],735,'Building 2 Type B 733 sq ft is a near-size reference for a 735 sq ft selection, not an exact-area match.'],
 ['expo-valley-views','Expo Valley Views',['expo-city-dubai/expo-valley-views'],null,'Official project reference; confirm selected unit and type.'],
];
const cache=path.join(root,'tmp/floorplans-20260912');await fs.mkdir(cache,{recursive:true});
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
async function read(url){
 const file=path.join(cache,Buffer.from(url).toString('base64url')+'.html');
 try{return await fs.readFile(file,'utf8')}catch{}
 try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)return '';const s=await r.text();await fs.writeFile(file,s);return s}catch{return ''}
}
function pfPlans(html){
 const raw=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];if(!raw)return [];
 const j=JSON.parse(raw).props?.pageProps?.detailResult;if(!j)return [];
 const plans=[];
 function walk(x){if(!x||typeof x!=='object')return;if(Array.isArray(x.floorPlans))for(const url of x.floorPlans)if(typeof url==='string')plans.push({remoteUrl:url,bedrooms:x.bedrooms,areaSqft:x.area,layout:x.layoutType||'Published layout'});for(const v of Object.values(x))if(typeof v==='object')walk(v)}walk(j.units);
 return plans;
}
function jrePlans(html,url){
 const plans=[];
 for(const [tag] of html.matchAll(/<img\b[^>]+>/g)){
  const alt=decode(tag.match(/alt="([^"]*)"/)?.[1]||'');if(!/floor plan/i.test(alt))continue;
  let src=decode(tag.match(/\ssrc="([^"]*)"/)?.[1]||'');if(!src)continue;
  const parsed=new URL(src,url);if(parsed.pathname==='/_next/image')src=parsed.searchParams.get('url')||src;
  const remoteUrl=new URL(src,url).href;
  if(!plans.some(p=>p.remoteUrl===remoteUrl))plans.push({remoteUrl,bedrooms:/Studio/i.test(alt)?0:Number(alt.match(/(\d) BR/)?.[1]||0),areaSqft:null,layout:alt});
 }return plans;
}
const existingPath=path.join(root,'data/dubai-south-floorplan-register.json');
let previous=[];try{previous=JSON.parse(await fs.readFile(existingPath,'utf8')).projects}catch{}
const result=[];
for(const [id,name,pf,selectedAreaSqft,qualification] of targets){
 let entry=previous.find(p=>p.id===id);if(entry?.plans?.length){result.push(entry);continue}
 entry={id,name,aliases:[],selectedAreaSqft,qualification,checkedAt:new Date().toISOString(),sourceUrl:'',sourceLabel:'',plans:[]};
 for(const route of pf){const url='https://www.propertyfinder.ae/en/new-projects/'+route;const plans=pfPlans(await read(url));if(plans.length){Object.assign(entry,{sourceUrl:url,sourceLabel:'Property Finder project floorplan library',plans});break}}
 if(!entry.plans.length){const jreId=id.replace('-building-b','').replace('-building-g','').replace('-building-2','').replace('-tower-2','').replace('-s1','');const url='https://jre.ae/projects/'+jreId;const plans=jrePlans(await read(url),url);if(plans.length)Object.assign(entry,{sourceUrl:url,sourceLabel:'JRE published project floorplan library',plans});}
 // A parent-project library is not evidence of the requested building or type.
 if(entry.sourceLabel.startsWith('JRE'))entry.qualification='Published project reference only; selected building, unit, type and area have not been verified.';
 entry.plans=[...new Map(entry.plans.map(plan=>[plan.remoteUrl,plan])).values()];
 result.push(entry);console.log(name,entry.plans.length,entry.sourceUrl);
}
await fs.writeFile(existingPath,JSON.stringify({version:'2026-09-12',scope:'Replacement Dubai South 22-project floorplan shortlist',projects:result},null,2)+'\n');
