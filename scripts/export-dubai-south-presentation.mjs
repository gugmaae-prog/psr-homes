import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const runtimeRequire=createRequire('/Users/keifferjapeth/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const pptxgen=runtimeRequire('pptxgenjs');
const sharp=runtimeRequire('sharp');
const ROOT=path.resolve(import.meta.dirname,'..');
const data=JSON.parse(await fs.readFile(path.join(ROOT,'data/dubai-south-review-slides.json'),'utf8'));
const out=path.join(ROOT,'output/presentation');
const cache=path.join(ROOT,'tmp/dubai-south-three-reports/pptx-assets');
await fs.mkdir(out,{recursive:true});await fs.mkdir(cache,{recursive:true});
function sourcePath(src){
  if(src.startsWith('/projects/jumanah-dubai-south-report/site/'))return path.join(ROOT,'public/projects',src.split('/site/')[1]);
  if(src.startsWith('/projects/jumanah-dubai-south-report/'))return path.join(ROOT,'tmp/dubai-south-jumanah/assets',src.split('/jumanah-dubai-south-report/')[1]);
  return path.join(ROOT,'public',src.replace(/^\//,''));
}
const mediaCache=new Map();
async function media(src){
  if(mediaCache.has(src))return mediaCache.get(src);
  const lossless=/brand\/|floorplan|-plan/.test(src);
  const target=path.join(cache,`image-${mediaCache.size}.${lossless?'png':'jpg'}`);
  const pipeline=sharp(sourcePath(src)).resize({width:2000,height:1500,fit:'inside',withoutEnlargement:true});
  if(lossless)await pipeline.png({compressionLevel:9}).toFile(target);
  else await pipeline.jpeg({quality:88,mozjpeg:true}).toFile(target);
  mediaCache.set(src,target);return target;
}
const pptx=new pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='PSR Homes | Jumanah';pptx.subject='Dubai South | Mr. Arul | Three budget routes';pptx.title='Dubai South - Private Client Collection';pptx.company='PSR Homes Real Estate LLC';pptx.lang='en-GB';pptx.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:'en-GB'};
// The editable deck carries the full property schedules and finance pages. Common
// context is shown once; each budget route keeps its own closing recommendations.
const common=new Set(['company','context','community','amenities','location','process']);
const seen=new Set();
const slides=data.slides.filter(s=>{if(common.has(s.kind)){if(seen.has(s.kind))return false;seen.add(s.kind);}return s.kind!=='sources';});
for(const page of slides){
 const s=pptx.addSlide();s.background={color:page.background};
 for(const e of page.elements){
  const box={x:e.x/72,y:e.y/72,w:e.w/72,h:e.h/72};
  if(e.type==='rect')s.addShape(pptx.ShapeType.rect,{...box,line:{transparency:100},fill:{color:e.fill,transparency:Math.round((1-(e.opacity??1))*100)}});
  else if(e.type==='text')s.addText(e.lines.join('\n'),{...box,h:(e.h+4)/72,fontFace:'Arial',fontSize:e.size,color:e.color,bold:e.bold,margin:0,breakLine:false,paraSpaceAfter:0,lineSpacingMultiple:1.05,valign:'top',hyperlink:e.link?{url:e.link}:undefined,transparency:0});
  else if(e.type==='image'){
   const file=await media(e.src);
   const meta=await sharp(file).metadata();
   s.addImage({path:file,x:box.x,y:box.y,w:meta.width/72,h:meta.height/72,sizing:{type:e.fit==='contain'?'contain':'cover',w:box.w,h:box.h},altText:e.alt||page.title});
  }
 }
 s.addNotes(`Prepared for Mr. Arul, Singapore. Advisor: Jumanah, PSR Homes. Evidence reviewed 12 September 2026.\n${page.sources.map(v=>v.label+'\n'+v.url).join('\n\n')}\nPrices, inventory, incentives and fees may vary; obtain current unit-specific written confirmation.`);
 if(page.kind!=='cover')s.addText(`PSR HOMES  /  ${page.group.toUpperCase()}  /  ${slides.indexOf(page)+1} of ${slides.length}`,{x:42/72,y:519/72,w:876/72,h:12/72,fontSize:8,color:'60675F',margin:0});
}
const output=path.join(out,'PSR_Dubai_South_Mr_Arul_Jumanah_Investor_Presentation_2026-09-12.pptx');
await pptx.writeFile({fileName:output,compression:true});
console.log(JSON.stringify({output,slides:slides.length,bytes:(await fs.stat(output)).size}));
