import fs from 'node:fs/promises';
const root='/Users/keifferjapeth/Documents/Codex/PSR/psrhomes';
const file=root+'/tmp/sheet-presentations/projects.json';
const data=JSON.parse(await fs.readFile(file,'utf8'));
const p=data.find(p=>p.name.includes('Pulse'));
p.sourceUrl='https://famproperties.com/dubai-south-dubai/the-pulse-residence-park-b3/1-bedroom-apartment-for-sale-175458';
for(const [i,suffix] of ['1786954541895.png','1783339800997.jpeg','1786954541898.png'].entries()){
 const url='https://fam-resources-mumbai.s3.ap-south-1.amazonaws.com/property/new-large/Apartment-The-Pulse-Residence-Park-B3-91703-'+suffix;
 const r=await fetch(url); if(!r.ok)continue;
 const path=root+'/tmp/sheet-presentations/pulse-'+i+'.'+suffix.split('.').at(-1);
 await fs.writeFile(path,Buffer.from(await r.arrayBuffer()));
 p.gallery.push({path,source:url,label:'Photograph from matching 640 sq ft listing; unit identity subject to confirmation'});
}
await fs.writeFile(file,JSON.stringify(data,null,2));
console.log(p.gallery);
