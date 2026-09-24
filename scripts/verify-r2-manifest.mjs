import { readFile, mkdir, writeFile } from "node:fs/promises";

const BASE_URL=(process.env.PSR_MEDIA_BASE_URL||"https://psrhomes.ae").replace(/\/$/,"");
const CONCURRENCY=Math.max(1,Math.min(32,Number(process.env.PSR_MEDIA_CONCURRENCY||16)));
const TIMEOUT_MS=Math.max(3000,Number(process.env.PSR_MEDIA_TIMEOUT_MS||12000));
const manifest=JSON.parse(await readFile("data/r2-external-media-map.json","utf8"));
const entries=Object.entries(manifest.sources||{});
const ids=[...new Set(entries.map(([,id])=>id))].sort();
const problems=[];
if(manifest.bucket!=="psr-property-media") problems.push(`unexpected bucket ${manifest.bucket}`);
if(manifest.prefix!=="external/") problems.push(`unexpected prefix ${manifest.prefix}`);
if(manifest.sourceCount!==entries.length) problems.push(`sourceCount ${manifest.sourceCount} != ${entries.length}`);
if(ids.length!==entries.length) problems.push(`duplicate R2 object IDs: ${ids.length} ids for ${entries.length} sources`);
if(manifest.objectCount<ids.length) problems.push(`objectCount ${manifest.objectCount} < referenced ids ${ids.length}`);

async function probe(id){
  const url=`${BASE_URL}/media/external/${id}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    let response=await fetch(url,{method:"HEAD",redirect:"follow",headers:{"user-agent":"PSR-R2-Manifest-Audit/1.0"},signal:controller.signal});
    if([403,405].includes(response.status)){
      response=await fetch(url,{method:"GET",redirect:"follow",headers:{range:"bytes=0-0","user-agent":"PSR-R2-Manifest-Audit/1.0"},signal:controller.signal});
    }
    const type=(response.headers.get("content-type")||"").toLowerCase();
    const mode=response.headers.get("x-psr-media")||"";
    await response.body?.cancel();
    return {id,url,ok:response.ok&&type.startsWith("image/")&&!mode.startsWith("fallback"),status:response.status,contentType:type,mode};
  }catch(error){
    return {id,url,ok:false,status:0,error:error instanceof Error?error.message:String(error)};
  }finally{clearTimeout(timer);}
}
async function mapLimit(items,limit,mapper){
  const results=new Array(items.length);let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=items.length)return;results[i]=await mapper(items[i],i);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},()=>worker()));
  return results;
}
console.log(`Auditing ${ids.length} R2 external-media routes against ${BASE_URL}`);
const results=await mapLimit(ids,CONCURRENCY,probe);
const failures=results.filter(x=>!x.ok);
const report={
  checkedAt:new Date().toISOString(),
  baseUrl:BASE_URL,
  manifest:{generatedAt:manifest.generatedAt,objectCount:manifest.objectCount,sourceCount:manifest.sourceCount,uniqueIds:ids.length,problems},
  checked:results.length,
  passed:results.length-failures.length,
  failed:failures.length,
  failures
};
await mkdir("outputs",{recursive:true});
await writeFile("outputs/r2-manifest-acceptance.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({manifest:report.manifest,checked:report.checked,passed:report.passed,failed:report.failed},null,2));
for(const failure of failures.slice(0,100)) console.error(JSON.stringify(failure));
if(failures.length>100) console.error(`... ${failures.length-100} additional failures omitted`);
if(problems.length||failures.length) process.exitCode=1;
