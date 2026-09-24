"""Reconcile the three review outputs and render every PDF page for inspection."""
from pathlib import Path
import json,subprocess,concurrent.futures,html
from PIL import Image,ImageOps,ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'output/presentation/dubai-south-sheet-presentations-manifest.json').read_text())
out=ROOT/'tmp/sheet-presentations/qa';out.mkdir(exist_ok=True)
def check(m):
    scenes=json.loads(Path(m['scenes']).read_text())['slides'];pdf=PdfReader(m['pdf'])
    assert len(pdf.pages)==len(scenes)==m['pages']
    assert scenes[-1]['kind']=='recommendations'
    portraits=[i for i,p in enumerate(scenes) for e in p['elements'] if e.get('type')=='image' and 'jumanah-cover' in e.get('src','')]
    assert portraits==[0],portraits
    assert m['group']=='ready' or not any(s['kind']=='income' for s in scenes)
    alltext='\n'.join(p.extract_text() for p in pdf.pages)
    assert 'Mr. Arul' in alltext and 'Jumanah' in alltext
    for banned in ['Cresswell Plaza','South Living','South Square','Divine Elements','Expo Valley Views']:
        # Cresswell Plaza may appear only as an explicit non-substitution note.
        if banned=='Cresswell Plaza':continue
        assert banned not in alltext,banned
    for p in scenes:
        for e in p['elements']:
            if e['type']=='text':assert 0<=e['x'] and e['x']+e['w']<=960 and e['y']+e['h']<=540
    prefix=out/m['group'];subprocess.run(['pdftoppm','-jpeg','-scale-to','700',m['pdf'],str(prefix)],check=True,capture_output=True)
    images=sorted(out.glob(m['group']+'-*.jpg'))
    for start in range(0,len(images),20):
        batch=images[start:start+20];sheet=Image.new('RGB',(1400,230*((len(batch)+3)//4)),'#ddd');draw=ImageDraw.Draw(sheet)
        for i,file in enumerate(batch):
            tile=ImageOps.contain(Image.open(file),(344,201));x=(i%4)*350;y=(i//4)*230;sheet.paste(tile,(x,y));draw.text((x+8,y+205),file.stem,fill='black')
        sheet.save(out/f'{m["group"]}-contact-{start//20+1}.jpg')
    return {'group':m['group'],'pages':len(pdf.pages),'projects':len(m['projects']),'portraitPages':[1],'pdfBytes':Path(m['pdf']).stat().st_size}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:result=list(ex.map(check,manifest))
(out/'checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
cards=[]
for m in manifest:
    title={'ready':'Ready properties / up to AED 1.2M','under':'Off-plan / below AED 1.7M','above':'Off-plan / above AED 1.7M'}[m['group']]
    cards.append('<article><p>'+str(len(m['projects']))+' property comparisons · '+str(m['pages'])+' pages</p><h2>'+title+'</h2><a href="'+html.escape(Path(m['html']).name)+'">Open presentation →</a></article>')
(ROOT/'output/presentation/Dubai_South_PSR_Collection.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dubai South | PSR Private Client Collection</title><style>body{background:#f8f7f2;color:#18251f;font:18px Arial,sans-serif;max-width:1000px;margin:70px auto;padding:24px}h1{font-size:64px;font-weight:400;margin-bottom:20px}p{color:#60675f;line-height:1.6}article{padding:26px 0;border-top:1px solid #daddd3}h2{font-size:28px;font-weight:400}a{color:#826936;text-decoration:none}small{color:#60675f}</style><small>PSR HOMES · PRIVATE CLIENT COLLECTION</small><h1>Dubai South</h1><p>Mr. Arul · Singapore<br>Jumanah · Managing Partner</p><p>Three review presentations. Fee allowances, inventory and unit-document confirmations remain subject to verification. Local files only; not published to a public website.</p>'+''.join(cards)+'</html>')
