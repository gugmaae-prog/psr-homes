"""Internal source review, not a replacement for the three priced client reports."""
from pathlib import Path
import json, html
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'data/dubai-south-floorplan-register.json').read_text())
OUT=ROOT/'output/pdf/PSR_Dubai_South_22_Project_Floorplan_Review_2026-09-12.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
W,H=960,640
INK='#24251f'; GOLD='#826739'; PAPER='#f6f3ed'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Dubai South | 22-project floorplan source review')
c.setAuthor('PSR Homes')
page=0
def text(value,x,y,size=11,color=INK,font='Helvetica'):
    c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,value)
def paragraph(value,x,y,width,size=11,color=INK):
    p=Paragraph(html.escape(value),ParagraphStyle('body',fontName='Helvetica',fontSize=size,leading=size*1.5,textColor=HexColor(color)))
    _,height=p.wrap(width,200)
    p.drawOn(c,x,y-height)
def new(title,kicker='DUBAI SOUTH / SOURCE REVIEW'):
    global page
    page+=1;c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
    text('PSR HOMES',40,604,11,GOLD,'Helvetica-Bold')
    text(kicker,40,561,9,GOLD)
    text(title,40,524,28)
    c.setStrokeColor(HexColor('#d7cebc'));c.line(40,50,920,50)
    text('Jumanah | Managing Partner',40,31,9)
    text('Internal floorplan review - not a priced offer',340,31,9)
    text(f'12 September 2026  /  {page:02}',755,31,9)
def finish():c.showPage()
def contain(file,x,y,width,height):
    image=Image.open(file).convert('RGB'); iw,ih=image.size
    scale=min(width/iw,height/ih)
    c.drawImage(ImageReader(image),x+(width-iw*scale)/2,y+(height-ih*scale)/2,iw*scale,ih*scale,mask='auto')

new('Dubai South','22 PROJECTS / REPLACEMENT SHORTLIST')
contain(ROOT/'public/presentations/dubai-south-investor-brief/cover/wasl-dome.webp',525,100,395,395)
text('Floorplan source review',40,450,23)
paragraph('Research for Mr. Arul, Singapore. Advisor: Jumanah. This review uses only the newly supplied 22-project shortlist.',40,405,440,14)
available=[p for p in DATA['projects'] if any(q['reviewStatus']=='reviewed-project-reference' for q in p.get('reviewPlans',[]))]
paragraph(f"{len(available)} projects have visually reviewed one-bedroom reference plans. {22-len(available)} remain pending a suitable source or building/unit match. The following pages preserve each drawing and identify its source.",40,305,440,13)
paragraph('Floorplan evidence does not confirm inventory, price, completion status or budget eligibility. The three financial reports require separately verified unit prices, fees and payment schedules.',40,190,440,11)
finish()
for start in [0,11]:
    new('The replacement shortlist',f'RESEARCH REGISTER / {start+1:02}- {min(start+11,22):02}')
    for i,project in enumerate(DATA['projects'][start:start+11]):
        y=478-i*35
        text(f'{start+i+1:02}',40,y,10,GOLD)
        text(project['name'],78,y,12)
        status='Reference available' if project in available else 'Source / match pending'
        text(status,688,y,10,GOLD)
    paragraph('Reference available means a published layout has been inspected. It does not mean the selected unit has been verified. No near-size or parent-project plan is labelled as an exact-unit match.',40,86,880,9)
    finish()
for project in available:
    for plan in project['reviewPlans']:
        if plan['reviewStatus']!='reviewed-project-reference':continue
        new(project['name'],'PUBLISHED FLOORPLAN / '+plan['matchStatus'].upper().replace('-',' '))
        label=plan['layout']
        if len(label)>90:label='Published one-bedroom layout'
        text(label+(f" | {plan['areaSqft']:,} sq ft (source label)" if plan['areaSqft'] else ''),40,495,11,GOLD)
        contain(ROOT/'public'/plan['localUrl'].lstrip('/'),40,150,880,325)
        paragraph(project['qualification'],40,136,880,10)
        text('Source: '+project['sourceLabel']+' | Open original source',40,74,9,GOLD)
        c.linkURL(project['sourceUrl'],(40,66,800,88),relative=0)
        finish()
new('Source and matching requirements')
paragraph('The following projects remain on the new shortlist. They are not replaced with properties from the previous reports. A suitable one-bedroom drawing or source confirmation is still required before floorplan insertion:',40,478,880,13)
pending=[p['name'] for p in DATA['projects'] if p not in available]
for i,name in enumerate(pending):text(f'{i+1:02}  {name}',40,402-i*28,12)
paragraph('No floorplans were generated or redrawn. Original downloaded images are retained with source URLs and SHA-256 checksums. Project-reference drawings remain subject to developer confirmation; information and inventory may change.',40,124,880,10)
finish();c.save()
print(f'{OUT}\n{page} pages; {len(available)} projects with reviewed references; {len(pending)} pending')
