#!/usr/bin/env node
// Complete community release acceptance. No uploads or changes to production.
// Input receipt must come from the IDrive ingest script, and routes must be
// the actual production community-to-image mapping. No fallback is accepted.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
function validateReleasePlan(ledger,receipt,routes){
  const fail=(m)=>{throw new Error(m)};
  const req=(ok,m)=>{if(!ok)fail(m)};
  const goodText=v=>typeof v==="string"&&v.trim().length>0;
  const hex64=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
  const dhash=v=>typeof v==="string"&&/^[a-f0-9]{16}$/.test(v);
  const hd=(a,b)=>{let n=BigInt("0x"+a)^BigInt("0x"+b),c=0;while(n){c+=Number(n&1n);n>>=1n}return c};
  req(Array.isArray(ledger?.records)&&ledger.records.length>0,"Missing community identity ledger");
  req(receipt?.schema==="psr-community-idrive-receipt-v1"&&receipt.complete===true&&Array.isArray(receipt.records),"No complete IDrive readback receipt");
  req(Array.isArray(routes?.records),"Missing delivery route census");
  const makeMap=(rows,label)=>{const m=new Map();for(const row of rows){req(goodText(row?.id)&&!m.has(row.id),"Invalid or duplicate "+label+" identity");m.set(row.id,row)}return m};
  const expected=makeMap(ledger.records,"ledger");
  const stored=makeMap(receipt.records,"receipt");
  const routeMap=makeMap(routes.records,"route");
  req(stored.size===expected.size&&routeMap.size===expected.size,"Incomplete identity coverage");
  const hashes=new Map(),sources=new Map(),urls=new Map(),fingerprints=[],output=[];
  function checkedPublicPath(input){
    req(typeof input==="string"&&input.startsWith("https://psrhomes.ae/"),"Delivery URL must use PSR canonical origin");
    const path=input.slice("https://psrhomes.ae".length);
    req(/^\/[A-Za-z0-9._%/-]+$/.test(path)&&!path.startsWith("//")&&!path.includes(".."),"Unsafe or noncanonical delivery URL");
    return input;
  }
  for(const [id,e] of expected){
    const x=stored.get(id), route=routeMap.get(id);
    req(!!x&&!!route,"Missing receipt or route for "+id);
    req(x.slug===e.slug&&x.name===e.name&&x.emirate===e.emirate,"Community identity mismatch: "+id);
    req(goodText(x.caption)&&goodText(x.credit)&&goodText(x.rightsEvidence)&&goodText(x.sourcePage)&&goodText(x.imageUrl),"Missing source, credit, license or caption evidence: "+id);
    req(["community_photo","local_landmark_photo","masterplan_render","project_render","community_render"].includes(x.kind),"Unclassified image: "+id);
    req(!sources.has(x.imageUrl),"Repeated source image URL: "+id);sources.set(x.imageUrl,id);
    const assetRoot="psrhomes/community-media/v1/"+e.emirate.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")+"/"+e.slug+"/";
    for(const role of ["original","card"]){
      const a=x[role];
      req(a?.storageProvider==="idrive_e2"&&a.bucket==="espacios-store-j"&&a.verified===true&&goodText(a.verifiedAt)&&Number.isFinite(Date.parse(a.verifiedAt)),"IDrive readback not verified: "+id+" "+role);
      req(hex64(a.sha256)&&dhash(a.dHash)&&Number.isSafeInteger(a.bytes)&&a.bytes>0&&a.bytes<=30*1024*1024,"Invalid asset integrity fields: "+id+" "+role);
      req(Number.isSafeInteger(a.width)&&Number.isSafeInteger(a.height)&&a.width>=1200&&a.height>=750&&a.width>a.height,"Invalid image dimensions: "+id+" "+role);
      const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"}[a.contentType];
      req(!!ext&&a.key===assetRoot+role+"/"+a.sha256+"."+ext,"Asset path or content type mismatch: "+id+" "+role);
      if(role==="card")req(a.contentType==="image/webp"&&a.width*5===a.height*8,"Card must be 16:10 WebP: "+id);
      const prior=hashes.get(a.sha256);req(!prior||prior===id,"Duplicate bytes: "+id+" / "+prior);hashes.set(a.sha256,id);
      for(const prev of fingerprints)if(prev.id!==id)req(hd(prev.hash,a.dHash)>5,"Perceptual duplicate candidate: "+id+" / "+prev.id);
      fingerprints.push({id,hash:a.dHash});
    }
    const cardUrl=checkedPublicPath(route.cardUrl);
    req(cardUrl===checkedPublicPath(route.detailImageUrl),"Directory and detail image differ: "+id);
    req(!urls.has(cardUrl),"Repeated public image route: "+id);urls.set(cardUrl,id);
    output.push({id,slug:e.slug,name:e.name,emirate:e.emirate,imageUrl:cardUrl,caption:x.caption,credit:x.credit,kind:x.kind,sourcePage:x.sourcePage,rightsEvidence:x.rightsEvidence,expectedSHA256:x.card.sha256,expectedBytes:x.card.bytes,contentType:x.card.contentType});
  }
  return output;
}
export {validateReleasePlan};
async function verifyDelivery(row) {
  const r=await fetch(row.imageUrl,{cache:'no-store',redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(25000)});
  if(r.status!==200 || r.headers.get('x-image-source')!=='idrive-primary' || r.headers.get('content-type')?.split(';')[0]!==row.contentType || !r.body) {
    await r.body?.cancel();throw Error('Not IDrive-primary image: '+row.id+' HTTP '+r.status);
  }
  const reader=r.body.getReader();const digest=createHash('sha256');let total=0;
  try { while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>row.expectedBytes){await reader.cancel();throw Error('Excess bytes: '+row.id)}digest.update(value)} } finally {reader.releaseLock()}
  if(total!==row.expectedBytes||digest.digest('hex')!==row.expectedSHA256)throw Error('Public byte mismatch: '+row.id);
  return {...row,deliveryProvider:'idrive-primary',verifiedAt:new Date().toISOString()};
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==4)throw Error('Usage: node scripts/idrive/verify-community-media-release.mjs LEDGER RECEIPT ROUTES ACCEPTANCE_OUTPUT');
  const [ledger,receipt,routes]=await Promise.all(args.slice(0,3).map(async p=>JSON.parse(await readFile(p,'utf8'))));
  const rows=validateReleasePlan(ledger,receipt,routes);
  const verified=[];
  for(let i=0;i<rows.length;i+=4)verified.push(...await Promise.all(rows.slice(i,i+4).map(verifyDelivery)));
  await writeFile(args[3],JSON.stringify({schema:'psr-community-idrive-live-acceptance-v1',complete:true,records:verified},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({complete:true,verifiedCommunities:verified.length,provider:'idrive-primary'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
