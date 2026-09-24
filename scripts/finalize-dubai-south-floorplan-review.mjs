import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'data/dubai-south-floorplan-register.json');
const data=JSON.parse(await fs.readFile(file,'utf8'));
// These downloaded references were visually inspected on 12 September 2026.
const reviewed=new Set(['vivida-residences','azizi-venice-14-building-g','cresswell-views','golf-vale','golf-hills','windsor-house-ii-building-b','south-square-s1','divine-elements','the-eighty-three','golf-acres','marquis-horizon','golf-meadow','expo-valley-views']);
for(const project of data.projects){
 if(project.id==='azizi-venice-14-building-g'){
  project.reviewPlans=project.reviewPlans.filter(plan=>/Building G/i.test(plan.layout));
  project.qualification='Published Venice 14 Building G layout reference. Exact selected unit, area and floor remain to be confirmed.';
 }
 for(const plan of project.reviewPlans||[]){
  if(reviewed.has(project.id)) plan.reviewStatus='reviewed-project-reference';
  if(project.id==='azizi-venice-14-building-g')plan.matchStatus='building-reference';
 }
 project.status=project.reviewPlans?.some(p=>p.reviewStatus==='reviewed-project-reference')?'reference-available':'source-verification-pending';
}
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
