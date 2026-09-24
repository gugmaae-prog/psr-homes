from pathlib import Path
import json
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]
register=json.loads((root/'data/dubai-south-floorplan-register.json').read_text())
tiles=[]
for project in register['projects']:
    for plan in project.get('reviewPlans',[]):
        image=Image.open(root/'public'/plan['localUrl'].lstrip('/')).convert('RGB')
        if min(image.size)<200: raise ValueError(f"Low resolution: {project['name']}")
        tile=Image.new('RGB',(420,390),'#f3f0e9')
        tile.paste(ImageOps.contain(image,(400,330)),(10,10))
        ImageDraw.Draw(tile).text((10,345),project['name']+'\n'+str(plan.get('areaSqft'))+' sqft / '+str(plan.get('layout'))[:48],fill='#191919')
        tiles.append(tile)
out=root/'tmp/floorplans-20260912'
for start in range(0,len(tiles),6):
    sheet=Image.new('RGB',(1260,780),'white')
    for i,tile in enumerate(tiles[start:start+6]):sheet.paste(tile,((i%3)*420,(i//3)*390))
    file=out/f'contact-{start//6+1}.jpg'
    sheet.save(file)
    print(file)
