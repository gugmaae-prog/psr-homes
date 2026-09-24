"""Compose labelled PDF QA contact sheets from previously rendered page PNGs."""
from pathlib import Path
from PIL import Image,ImageDraw
import sys
folder=Path(sys.argv[1])
files=sorted(folder.glob('page-*.png'))
for start in range(0,len(files),12):
    sheet=Image.new('RGB',(1500,4*306),'#dadbd6')
    d=ImageDraw.Draw(sheet)
    for i,f in enumerate(files[start:start+12]):
        im=Image.open(f).convert('RGB');im.thumbnail((480,270))
        x=10+(i%3)*500;y=10+(i//3)*306
        sheet.paste(im,(x,y));d.text((x,y+275),f'{folder.name} / PAGE {start+i+1}',fill='#151a16')
    sheet.save(folder/f'contact-{start+1:03}.jpg',quality=92)
print(f'{len(files)} rendered pages; contact sheets written to {folder}')
