import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const filename=path.join(root,'data/dubai-south-floorplan-register.json');
const register=JSON.parse(await fs.readFile(filename,'utf8'));
const folder=path.join(root,'public/projects/dubai-south-floorplan-review');
await fs.mkdir(folder,{recursive:true});
for(const project of register.projects){
 if(project.sourceLabel.startsWith('JRE')) project.qualification='Published project reference only; selected building, unit, type and area have not been verified.';
 project.plans=[...new Map(project.plans.map(p=>[p.remoteUrl,p])).values()];
 const plans=project.plans.filter(p=>p.bedrooms===1 && (project.id!=='azizi-venice-14-building-g'||/Building G/i.test(p.layout))).sort((a,b)=>Math.abs((a.areaSqft||0)-(project.selectedAreaSqft||0))-Math.abs((b.areaSqft||0)-(project.selectedAreaSqft||0))).slice(0,2);
 project.reviewPlans=[];
 for(const [index,plan] of plans.entries()){
  const file=`${project.id}-${index+1}.webp`;
  try{
   const response=await fetch(plan.remoteUrl,{signal:AbortSignal.timeout(20000)});
   if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error(`Not an image: ${response.status}`);
   const bytes=Buffer.from(await response.arrayBuffer());
   await fs.writeFile(path.join(folder,file),bytes);
   project.reviewPlans.push({...plan,localUrl:`/projects/dubai-south-floorplan-review/${file}`,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),reviewStatus:'pending-visual-review',matchStatus:'project-reference'});
  }catch(error){console.log(project.name,error.message)}
 }
 console.log(project.name,project.reviewPlans.length);
}
await fs.writeFile(filename,JSON.stringify(register,null,2)+'\n');
