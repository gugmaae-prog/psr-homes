import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'tmp/sheet-presentations');
const file=path.join(folder,'projects.json');const data=JSON.parse(await fs.readFile(file,'utf8'));
const celestia=data.find(p=>p.id==='celestia-b');
const images=[
 ['https://graph-images.propertyfinder.ae/ae/building/12261/bba0caa925eb4ddc5f5968dcd6e00c3a/thumb.jpeg','Celestia B building reference'],
 ['https://static.shared.propertyfinder.ae/media/images/listing/B8Q17TKYJSKB3WTGEZ6SGF0WA8/cc725630-d882-43f3-aae1-dc02cf23d5b7/668x452.jpg?v=0485dc01b1eb0ff9ef34763351f29e58','Celestia B: other 946 sqft rental unit; not the selected 727 sqft unit'],
];
for(const [i,[url,label]]of images.entries()){try{let r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)continue;let target=path.join(folder,`celestia-${i}.jpg`);await fs.writeFile(target,Buffer.from(await r.arrayBuffer()));celestia.gallery.push({path:target,source:'https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-dubai-dubai-south-dubai-world-central-residential-district-celestia-celestia-b-131559865.html',label})}catch(e){console.log(e.message)}}
await fs.writeFile(file,JSON.stringify(data,null,2));console.log(celestia.gallery);
