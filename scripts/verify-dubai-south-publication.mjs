import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const route='/advisors/jumanah/dubai-south';
const files={
 'ready.pdf':'output/pdf/PSR_Dubai_South_Ready_Up_to_1_2M_Mr_Arul_Jumanah_2026-09-12_REVIEW.pdf',
 'under.pdf':'output/pdf/PSR_Dubai_South_Offplan_Below_1_7M_Mr_Arul_Jumanah_2026-09-12_REVIEW.pdf',
 'above.pdf':'output/pdf/PSR_Dubai_South_Offplan_Above_1_7M_Mr_Arul_Jumanah_2026-09-12_REVIEW.pdf',
 'presentation.pptx':'output/presentation/PSR_Dubai_South_Mr_Arul_Jumanah_Investor_Presentation_2026-09-12.pptx',
};
const code=process.env.PSR_REVIEW_ACCESS_CODE;
if(!code)throw new Error('PSR_REVIEW_ACCESS_CODE must be supplied for the authorized publication check.');
async function digest(stream){const hash=crypto.createHash('sha256');let bytes=0;for await(const chunk of stream){hash.update(chunk);bytes+=chunk.length;}return {sha256:hash.digest('hex'),bytes};}
async function downloadDigest(url,cookie){
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(url,{headers:{cookie},signal:AbortSignal.timeout(120000)});
   assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(response.headers.get('content-disposition'),/attachment/);
   return {response,observed:await digest(response.body)};
  }catch(error){
   if(error.code==='ERR_ASSERTION'||attempt===3)throw error;
   console.log(JSON.stringify({retryDownload:new URL(url).pathname,attempt,reason:error.cause?.code||error.name}));
  }
 }
}
const local={};for(const [name,file]of Object.entries(files))local[name]=await digest(fs.createReadStream(path.join(root,file)));
const receipt={checkedAt:new Date().toISOString(),local,domains:[]};
for(const origin of ['https://psrhomes.ae','https://psr.espacios.me']){
 const locked=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(45000)});
 assert.equal(locked.status,200);assert.match(locked.headers.get('cache-control'),/no-store/);
 const gate=await locked.text();assert.match(gate,/Private client access/);assert.doesNotMatch(gate,/Mr\. Arul/);
 const login=await fetch(origin+route,{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',origin},body:new URLSearchParams({code}),signal:AbortSignal.timeout(45000)});
 assert.equal(login.status,303,`${origin}: expected successful code exchange`);
 const setCookie=login.headers.get('set-cookie');assert.ok(setCookie);assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);
 const cookie=setCookie.split(';')[0];
 const unlocked=await fetch(origin+route,{headers:{cookie},signal:AbortSignal.timeout(45000)});
 assert.equal(unlocked.status,200);assert.match(unlocked.headers.get('cache-control'),/no-store/);
 const html=await unlocked.text();assert.match(html,/Private client review/i);assert.match(html,/Mr\. Arul/);assert.match(html,/DubaiSouthReviewPresentation|review-presentation/);assert.match(html,/2026-09-12/);
 const results=[];
 for(const [name,expected]of Object.entries(local)){
  const url=origin+route+'/files/'+name;
  const denied=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(45000)});assert.equal(denied.status,303);assert.equal(denied.headers.get('location'),route);
  const head=await fetch(url,{method:'HEAD',headers:{cookie},signal:AbortSignal.timeout(45000)});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),expected.bytes);
  const {response,observed}=await downloadDigest(url,cookie);assert.deepEqual(observed,expected,`${origin}/${name}: download differs from verified local artifact`);
  results.push({file:name,status:response.status,unauthenticatedStatus:denied.status,contentType:response.headers.get('content-type'),...observed});
 }
 receipt.domains.push({origin,locked:true,unlocked:true,privateNoStore:true,files:results});
 console.log(JSON.stringify({origin,verifiedFiles:results.length,lockedAndUnlocked:true,hashParity:true}));
}
const out=path.join(root,'output/presentation/Dubai_South_Publication_Verification_2026-09-12.json');
await fsp.writeFile(out,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({receipt:out}));
