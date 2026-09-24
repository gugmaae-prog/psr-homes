"""Build PSR's three investor reports and a shared, editable presentation scene model.

The source record preserves market evidence separately from planning assumptions.
All monetary totals and payment reconciliation are calculated here, never typed twice.
"""
from pathlib import Path
from io import BytesIO
import json, math, re, argparse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image
from functools import lru_cache

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/dubai-south-investor-review-2026-09-08.json"
OUT = ROOT / "output/pdf"
SCENES = ROOT / "data/dubai-south-review-slides.json"
W, H = 960, 540
INK, MUTED, GOLD, PAPER, LINE, DARK = "262925", "60675F", "9C8356", "F8F7F2", "DADDD3", "18251F"
FONTROOT = Path("/Users/keifferjapeth/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts")
pdfmetrics.registerFont(TTFont("PSR", str(FONTROOT / "LiberationSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont("PSRBold", str(FONTROOT / "LiberationSans-Bold.ttf")))

def clean(s):
    return str(s).replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-").replace("\u00a0", " ")

def number(v): return f"{v:,.0f}" if abs(v-round(v))<.001 else f"{v:,.2f}"
def aed(v): return "AED " + number(v)
def pct(v): return f"{v:.2f}%"

def lines_for(text, size, width, bold=False):
    font = "PSRBold" if bold else "PSR"
    result = []
    for para in clean(text).split("\n"):
        line = ""
        for word in para.split():
            candidate = f"{line} {word}".strip()
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                line = candidate
            else:
                if line: result.append(line)
                if pdfmetrics.stringWidth(word, font, size) > width:
                    chunk = ""
                    for ch in word:
                        if pdfmetrics.stringWidth(chunk+ch, font, size)>width:
                            result.append(chunk); chunk=ch
                        else: chunk+=ch
                    line=chunk
                else: line=word
        result.append(line)
    return result

class Page:
    def __init__(self, title, group, kind="content", dark=False, project=None):
        self.d={"title":title,"group":group,"kind":kind,"background":DARK if dark else PAPER,"elements":[],"sources":[],"project":project}
        self.dark=dark
    def rect(self,x,y,w,h,fill,line=None,opacity=1):
        self.d["elements"].append(dict(type="rect",x=x,y=y,w=w,h=h,fill=fill,line=line,opacity=opacity))
    def line(self,x,y,w,color=LINE): self.rect(x,y,w,.7,color)
    def text(self,text,x,y,w,size=13,bold=False,color=None,leading=None,maxh=None,link=None):
        text=clean(text); leading=leading or size*1.28
        lines=lines_for(text,size,w,bold)
        h=len(lines)*leading
        if maxh is not None and h>maxh+.1: raise ValueError(f"Text overflow in {self.d['title']}: {text[:75]} ({h}>{maxh})")
        if y+h>H-18: raise ValueError(f"Page overflow in {self.d['title']}: {text[:60]}")
        self.d["elements"].append(dict(type="text",text=text,x=x,y=y,w=w,h=h,size=size,bold=bold,color=color or (PAPER if self.dark else INK),leading=leading,lines=lines,link=link))
        return y+h
    def img(self,src,x,y,w,h,fit="cover",alt=""):
        self.d["elements"].append(dict(type="image",src=src,x=x,y=y,w=w,h=h,fit=fit,alt=alt))
    def head(self,eyebrow,title=None,subtitle=None):
        self.text("PSR HOMES",42,26,250,10,True,color=GOLD)
        self.text("PRIVATE CLIENT REVIEW  /  SEPTEMBER 2026",610,28,308,8,color=MUTED if not self.dark else "C5C9BC")
        self.line(42,52,876,LINE if not self.dark else "435147")
        self.text(eyebrow.upper(),42,74,870,9,True,color=GOLD)
        y=self.text(title or self.d["title"],42,95,875,29,False,maxh=78)
        if subtitle: self.text(subtitle,43,y+10,865,11.5,color=MUTED if not self.dark else "D0D4CA",maxh=50)
    def sources(self,items):
        seen=set()
        for s in items:
            if s and s.get("url") and s["url"] not in seen:
                seen.add(s["url"]); self.d["sources"].append(s)
        for i,s in enumerate(self.d["sources"][:3]):
            self.text("Source: "+s["label"],42,465+i*11,874,7.5,color=MUTED if not self.dark else "C5C9BC",link=s["url"],maxh=11)
    def table(self,headers,rows,x=42,y=175,widths=None,rowh=29,size=10.5):
        widths=widths or [876/len(headers)]*len(headers)
        table_id=f"table-{len(self.d['elements'])}"
        self.d["elements"].append(dict(type="table",id=table_id,headers=headers,rows=rows,x=x,y=y,w=sum(widths),h=28+rowh*len(rows)))
        start=len(self.d["elements"])
        self.rect(x,y,sum(widths),28,DARK)
        xx=x
        for h,w in zip(headers,widths): self.text(h,xx+10,y+7,w-20,8.8,True,color=PAPER,maxh=20); xx+=w
        yy=y+28
        for j,row in enumerate(rows):
            if j%2==0: self.rect(x,yy,sum(widths),rowh,"EFEEE7")
            xx=x
            for cell,w in zip(row,widths):
                self.text(cell,xx+10,yy+max(3,min(7,(rowh-size*1.28)/2)),w-20,size,maxh=rowh-4)
                xx+=w
            self.line(x,yy+rowh,sum(widths))
            yy+=rowh
        for e in self.d["elements"][start:]:e["tableId"]=table_id
        return yy

def source(label,url): return {"label":label,"url":url}
def bullet(page,title,body,x,y,w=402):
    page.rect(x,y+5,4,4,GOLD)
    end=page.text(title,x+17,y,w-17,13.5,True)
    return page.text(body,x+17,end+6,w-17,11.5,color=MUTED,maxh=82)+18

def resolve_img(src):
    if src.startswith("/projects/jumanah-dubai-south-report/site/"): return ROOT / "public/projects" / src.split("/site/",1)[1]
    if src.startswith("/projects/jumanah-dubai-south-report/"): return ROOT / "tmp/dubai-south-jumanah/assets" / src.split("/jumanah-dubai-south-report/",1)[1]
    if src.startswith("/"): return ROOT / "public" / src.lstrip("/")
    return ROOT / src

@lru_cache(maxsize=100)
def embedded_image(src):
    image_path=resolve_img(src)
    if not image_path.exists():raise FileNotFoundError(image_path)
    im=Image.open(image_path)
    im.thumbnail((2100,1600),Image.Resampling.LANCZOS)
    buf=BytesIO()
    if 'brand/' in src or 'floorplan' in src or '-plan' in src:
        im.save(buf,format='PNG',optimize=True)
    else:im.convert('RGB').save(buf,format='JPEG',quality=88,optimize=True)
    buf.seek(0)
    return ImageReader(buf),im.size

def project_math(p):
    p["pricePerSqft"]=p["price"]/p["area"] if p.get("area") else None
    p["feeTotal"]=round(sum(f["amount"] for f in p["fees"]),2)
    p["allIn"]=round(p["price"]+p["feeTotal"],2)
    p["allowanceTotal"]=sum(f["amount"] for f in p["fees"] if f.get("estimate"))
    cumulative=0
    for r in p["schedule"]:
        r["amount"]=r.get("amount",round(p["price"]*r["percent"]/100,2))
        cumulative+=r["amount"]; r["cumulative"]=round(cumulative,2)
    assert abs(sum(r["percent"] for r in p["schedule"])-100)<.001,p["name"]
    assert abs(cumulative-p["price"])<1,p["name"]
    p["before"]=sum(r["amount"] for r in p["schedule"] if r["stage"]=="before")
    p["handoverAmount"]=sum(r["amount"] for r in p["schedule"] if r["stage"]=="handover")
    p["after"]=sum(r["amount"] for r in p["schedule"] if r["stage"]=="after")
    p["unallocated"]=sum(r["amount"] for r in p["schedule"] if r["stage"]=="unallocated")
    if p["category"]=="ready":
        p["annualService"]=round(p["area"]*p["serviceRate"],2)
        p["firstYearTotal"]=p["allIn"]+p["annualService"]
        assert p["firstYearTotal"]<=1_200_000,(p["name"],"first-year budget exceeded")
        p["grossLow"]=p["rentLow"]/p["price"]*100
        p["grossHigh"]=p["rentHigh"]/p["price"]*100
        p["netLow"]=(p["rentLow"]*.95-p["annualService"]-p["annualOther"]-p["rentLow"]*.05)/p["allIn"]*100
        p["netHigh"]=(p["rentHigh"]*.95-p["annualService"]-p["annualOther"]-p["rentHigh"]*.05)/p["allIn"]*100
    return p

def make_cover(report,data):
    p=Page("Dubai South",report["id"],"cover",True)
    p.img(data["coverImage"],380,0,580,H,alt="Al Wasl Plaza at Expo City Dubai")
    p.rect(0,0,425,H,DARK)
    p.img("/brand/psr-logo-light.png",42,30,64,70,fit="contain",alt="PSR Homes")
    p.text("PRIVATE CLIENT COLLECTION",43,135,330,9,True,color="C2AB7B")
    p.text("Dubai\nSouth",39,165,377,59,leading=59)
    p.text(report["label"],43,308,332,19,maxh=56)
    p.text(report["budgetLabel"],43,359,332,12,color="DACCAA")
    p.line(43,390,332,"435147")
    p.text("PREPARED FOR",43,410,250,8,True,color="B4BCAF")
    p.text("Mr. Arul  |  Singapore",43,427,280,16)
    p.img(data["advisor"]["avatarUrl"],298,416,77,77,fit="contain",alt="Jumanah - head and shoulders portrait")
    p.text("Jumanah",43,466,230,13,True)
    p.text("Managing Partner  |  PSR Homes",43,486,247,9,color="C5C9BC")
    p.text("08 SEPTEMBER 2026",743,508,180,9,True,color="FFFFFF")
    return p

def common_pages(report,data,projects):
    gid=report["id"]; pages=[make_cover(report,data)]
    p=Page("Executive Summary",gid,"mandate");p.head("Your Dubai South collection",subtitle=report["intro"])
    p.text(report["budgetLabel"],42,185,855,34,color=GOLD)
    cols=[("CLIENT","Mr. Arul\nSingapore"),("ADVISOR","Jumanah\nManaging Partner"),("SHORTLIST",f"{len(projects)} properties\nAscending total budget")]
    for i,(label,value) in enumerate(cols):
        x=42+i*299;p.line(x,248,278);p.text(label,x,264,278,9,True,color=GOLD);p.text(value,x,286,270,18,leading=24)
    p.text("How to read the figures",42,365,850,14,True)
    p.text("Each total combines the illustrated property price, applicable transaction charges and explicit planning allowances. An allowance is a budget provision, not a supplier quotation. Written unit-specific confirmation is required before the property is treated as fully within budget.",42,392,860,12,color=MUTED,maxh=68)
    pages.append(p)
    p=Page("Considered property advice",gid,"company");p.head("PSR Homes / Jumanah")
    p.text("Local expertise.\nA clear decision.",42,170,365,36,leading=40)
    y=175
    for title,copy in [("Property selection","We compare suitable homes, location, developer standing, usable area and the complete financial commitment."),("Transaction coordination","We verify the unit documentation and coordinate reservation, registration, transfer and handover."),("Continuing support","We arrange viewings, inspections and property management introductions, with leasing analysis for completed homes.")]: y=bullet(p,title,copy,482,y,436)
    p.text("Jumanah | Managing Partner",42,343,392,15,True)
    p.text("English and Arabic\njumanah@psrhomes.ae\n+971 58 680 1148",42,374,389,13,color=MUTED,leading=22)
    p.text("PSR Homes Real Estate LLC | ORN 54275\nOffice 1504 A, DAMAC Smart Heights, Barsha Heights, Dubai",42,464,870,9,color=MUTED)
    pages.append(p)
    p=Page("Dubai's southern growth corridor",gid,"context");p.head("UAE / Dubai / Dubai South",subtitle="A location shaped by aviation, trade, residential communities and Expo City.")
    p.img("/insights/initiatives/dubai-al-maktoum-passenger-terminal-market-briefing-v1.webp",42,173,420,264,alt="Al Maktoum Airport planned terminal rendering")
    y=174
    for title,copy in [("Al Maktoum International Airport","Dubai's June 2026 update reports major construction packages underway and an operations target of 2032. The airport is a long-term employment and connectivity catalyst."),("Expo City and exhibition activity","An operating destination for business, events, dining and attractions, with phased exhibition-centre expansion supporting the wider corridor."),("Residential growth","Different districts offer different entry costs and daily services. Compare the exact building, access route and surrounding phase.")]:y=bullet(p,title,copy,495,y,421)
    p.sources([data["sources"]["airport"],data["sources"]["expo"]]);pages.append(p)
    p=Page("Community context",gid,"community");p.head("Dubai South / Three location frames",subtitle="The established community and the planned development should both support the selection.")
    communities=[("Residential District","Established homes, retail, parks and schools. MAG 5, South Living, South Square and the Windsor House releases are assessed in this location frame.","/presentations/dubai-south-investor-brief/projects/south-square-s1/hero.webp"),("Emaar South","Emaar's golf-oriented master community. Golf Views provides a completed comparison; Golf Fields and Golf Trails extend the apartment offering.","/presentations/dubai-south-investor-brief/projects/golf-fields/hero.webp"),("Expo Living / Expo City","An adjacent but distinct location around the Expo City destination and Metro connection. Terra Woods and Expo Valley Views are labelled separately.","/presentations/dubai-south-investor-brief/projects/terra-woods/hero.webp")]
    for i,(name,copy,img) in enumerate(communities):
        x=42+i*298;p.img(img,x,169,276,155,alt=name);p.text(name,x,339,276,17);p.text(copy,x,370,273,11.5,color=MUTED,maxh=85)
    p.sources([data["sources"]["residential"],data["sources"]["emaarSouth"],data["sources"]["expo"]]);pages.append(p)
    p=Page("Everyday living and connectivity",gid,"amenities");p.head("Schools / Healthcare / Retail / Transport")
    rows=[
      ["Education","GEMS Founders School Dubai South","Operating; Expo Road / Residential District"],
      ["Healthcare","Saudi German Clinic / NMC Royal Hospital DIP","Verify the driving route from the exact building"],
      ["Retail","District shops and hypermarket","Operating daily-life amenities; specific catchment varies"],
      ["Expo City","Al Wasl Plaza, dining, events, Metro","Operating destination; station access varies by building"],
      ["South Bay Mall","Retail and lifestyle destination","Announced; opening and tenant mix require confirmation"],
      ["MAF / Dubai South","AED 62bn mixed-use community","Announced programme; 22 million sq ft"],
    ]
    p.table(["CATEGORY","ESTABLISHMENT / PROGRAMME","STATUS / LOCATION"],rows,y=166,widths=[128,315,433],rowh=39,size=11)
    p.text("Road travel times in project marketing are indicative. Confirm the exact phase, traffic conditions and route before viewing; proximity does not imply walking access.",42,440,871,10.5,color=MUTED,maxh=28)
    p.sources([data["sources"]["school"],data["sources"]["maf"],data["sources"]["health"]]);pages.append(p)
    p=Page("Dubai South at a glance",gid,"location");p.head("Location reference",subtitle="The original PSR location research is retained as a planning reference, with each submarket identified.")
    pairs=data.get("distances",[])
    aliases={"Emaar Golf Views A":"Emaar Golf Views","MAG 540 / MAG 5 Boulevard":"MAG 5 Boulevard","Azizi Venice 15":"Azizi Venice","Altura 2 at Waada":"Waada Altura"}
    names={aliases.get(v["name"],v["name"]) for v in projects}
    relevant=[r for r in pairs if r["fromName"] in names and r["toName"] in names][:5]
    if len(relevant)<2:relevant=[r for r in pairs if r["fromName"] in names or r["toName"] in names][:5]
    p.table(["FROM","TO","APPROXIMATE SEPARATION"],[[r["fromName"],r["toName"],str(r["distanceKm"])+" km - straight line"] for r in relevant],y=174,widths=[280,310,286],rowh=38,size=11)
    p.text("Location basis",42,417,320,13,True)
    p.text("Derived from stored PSR coordinates: approximate site references, not surveyed locations or road distances. Use the PSR map to review the wider corridor.",42,438,760,10.5,color=MUTED,maxh=28)
    p.sources([source("PSR UAE Portfolio Map", "https://psrhomes.ae/map")]);pages.append(p)
    if gid=="ready":
        p=Page("Who may rent in Dubai South?",gid,"demand");p.head("Ready properties / Occupier context",subtitle="Likely demand segments based on the area's employment and services; not measured demographic shares.")
        entries=[("Aviation and logistics professionals","Employment around the airport, aerospace hub, freight and distribution businesses can support practical one- and two-bedroom demand."),("Expo and business professionals","Expo City, exhibitions, business services and offices create a professional occupier base, subject to commute and building quality."),("Families seeking usable space","School access, parking, storage and daily retail can influence longer-term occupier choices, especially in two-bedroom apartments."),("Value-conscious households","The relationship between total rent, transport cost and apartment condition remains central to leasing decisions.")]
        for i,(title,copy) in enumerate(entries):bullet(p,title,copy,42+(i%2)*449,181+(i//2)*132,418)
        p.sources([data["sources"]["residential"],data["sources"]["airport"],data["sources"]["school"]]);pages.append(p)
    return pages

def comparison_pages(report,projects):
    pages=[]
    for start in range(0,len(projects),8):
        p=Page("The property comparison",report["id"],"comparison");p.head("Ascending total acquisition budget",subtitle="Totals include the stated provisions. Asking prices and allowances require unit-specific written confirmation.")
        rows=[]
        for v in projects[start:start+8]: rows.append([v["name"],v["bedroom"],aed(v["price"]),number(v["area"]),number(v["pricePerSqft"]),aed(v["allIn"])])
        p.table(["PROJECT","TYPE","UNIT PRICE","SQ FT","AED / SQ FT","TOTAL BUDGET"],rows,y=174,widths=[207,58,154,91,112,254],rowh=30,size=10.5)
        p.text("All-in planning totals include the full unit price and listed one-time fees or provisions. Annual service charges remain a separate recurring ownership obligation. No marketed DLD waiver is deducted without written confirmation.",42,449,865,10,color=MUTED,maxh=40)
        pages.append(p)
    return pages

def project_pages(report,p):
    gid=report["id"];name=p["name"];pages=[]
    page=Page(name,gid,"project",project=name);page.head(p["developer"]+" / "+p["status"],subtitle=p["location"])
    page.img(p["media"]["hero"],42,175,480,270,alt=name+" exterior")
    page.text(aed(p["allIn"]),553,177,365,32,color=GOLD)
    page.text("TOTAL ACQUISITION BUDGET",555,222,360,8.5,True,color=MUTED)
    page.text(f"{p['bedroom']}  /  {number(p['area'])} sq ft  /  {number(p['pricePerSqft'])} AED per sq ft",554,252,362,12,maxh=38)
    page.text(p["summary"],554,296,355,12,color=MUTED,maxh=100)
    page.text("Handover: "+p["handover"],554,410,357,11.5,True,maxh=42)
    page.sources(p["sources"][:2]);pages.append(page)
    page=Page(name+" | Payment plan",gid,"payment",project=name);page.head("Payment schedule / "+p["status"],name,subtitle=p["scheduleBasis"])
    rows=[]
    for r in p["schedule"]:
        rows.append([r["label"],r["due"],f"{r['percent']:g}%",aed(r["amount"]),aed(r["cumulative"])])
    rowh=min(30,205/max(1,len(rows)))
    yy=page.table(["PAYMENT MILESTONE","WHEN DUE","% OF PRICE","AED AMOUNT","CUMULATIVE PRICE"],rows,y=179,widths=[210,243,95,164,164],rowh=rowh,size=10.2 if len(rows)>8 else 11)
    yy+=14;page.text("UNIT PRICE TOTAL",42,yy,480,10,True);page.text(aed(p["price"])+"  |  100%",635,yy-3,283,18,True,color=GOLD)
    page.text(p.get("paymentFootnote","The instalments reconcile to the property price. DLD, administration and other charges are itemised next and added once. Booking payments form part of the price, not an additional fee."),42,yy+32,870,10.5,color=MUTED,maxh=40)
    page.d["sources"].append(p["planSource"])
    page.text("Source: "+p["planSource"]["label"],42,496,874,7.5,color=MUTED,link=p["planSource"]["url"],maxh=11)
    pages.append(page)
    page=Page(name+" | Complete cost",gid,"fees",project=name);page.head("Complete acquisition breakdown",name,subtitle="All amounts in AED. Fee allowances are explicit provisions pending the exact supplier or developer invoice.")
    fees=p["fees"]
    rows=[["Agreed / illustrated property price",number(p["price"]),"100% across the payment schedule"]]+[[f["label"],number(f["amount"]),f["basis"]] for f in fees]
    rowh=min(27,215/len(rows))
    yy=page.table(["COST ITEM","AMOUNT (AED)","BASIS / PAYMENT TIMING"],rows,y=170,widths=[319,160,397],rowh=rowh,size=10.3)
    page.rect(42,yy+11,876,42,DARK)
    page.text("TOTAL ACQUISITION BUDGET",57,yy+25,530,10.5,True,color=PAPER)
    page.text(aed(p["allIn"]),686,yy+20,219,21,True,color=PAPER)
    cap=1_200_000 if gid=="ready" else (1_700_000 if gid=="under" else 1_850_000)
    page.text(f"Budget remaining: {aed(cap-p['allIn'])}  |  Included planning allowances: {aed(p['allowanceTotal'])}",42,yy+63,874,10.5,color=MUTED,maxh=25)
    pages.append(page)
    page=Page(name+" | Funding summary",gid,"funding",project=name);page.head("The full payment commitment",name,subtitle="A clear view of the complete price and additional charges, including any post-handover balance.")
    stages=[("BEFORE HANDOVER",p["before"]),("AT HANDOVER / TRANSFER",p["handoverAmount"]),("AFTER HANDOVER",p["after"])]
    if p["unallocated"]:stages=[("TIMING TO BE RECONCILED",p["unallocated"]),("CONFIRMED ALLOCATION",None),("SELLER LEDGER",None)]
    for i,(label,value) in enumerate(stages):
        x=42+i*299;page.line(x,182,276);page.text(label,x,202,278,8.5,True,color=GOLD);page.text(aed(value) if value is not None else "Pending",x,229,278,26);page.text("Property-price allocation" if value is not None else "Written statement required",x,269,278,10.5,color=MUTED)
    page.text("Plus additional fees and provisions",42,319,562,16)
    page.text(aed(p["feeTotal"]),661,318,256,20,True)
    page.line(42,354,876)
    page.text("TOTAL AMOUNT TO FUND",42,374,560,13,True)
    page.text(aed(p["allIn"]),660,365,258,28,True,color=GOLD)
    service=f"{aed(p['annualService'])} per year at {p['serviceRate']:g} AED/sq ft (planning assumption; obtain Mollak statement)." if gid=="ready" else p["serviceNote"]
    page.text("Annual service charges: "+service,42,418,870,10.5,color=MUTED,maxh=28)
    page.text(p["feeNote"],42,452,870,9.5,color=MUTED,maxh=39)
    if gid=="ready":page.text(f"INCLUDING FIRST-YEAR SERVICE CHARGES: {aed(p['firstYearTotal'])}  |  Within AED 1,200,000",42,492,870,10,True,color=GOLD)
    pages.append(page)
    page=Page(name+" | DLD and terms",gid,"terms",project=name);page.head("DLD / Incentives / Unit confirmation",name)
    y=175
    y=bullet(page,"DLD treatment",p["waiverNote"],42,y,425)
    y=bullet(page,"Price and inventory",p["inventoryNote"],42,y+12,425)
    y=175
    y=bullet(page,"Payment schedule",p["planNote"],492,y,425)
    y=bullet(page,"Parking and handover",p["parkingNote"],492,y+12,425)
    page.sources(([p["waiverSource"]] if p.get("waiverSource") else [])+p["sources"][:2]);pages.append(page)
    page=Page(name+" | Architecture and interiors",gid,"gallery",project=name);page.head("Project gallery",name,subtitle="Project imagery retained from the original PSR brief. Renderings illustrate the development; the exact unit may differ.")
    exterior=(p["media"].get("exteriors") or [p["media"]["hero"]])[0]
    interiors=p["media"].get("interiors") or []
    page.img(exterior,42,176,423,263,alt=name+" exterior")
    if interiors: page.img(interiors[0],494,176,424,263,alt=name+" interior")
    else:
        page.rect(494,176,424,263,"EFEEE7");page.text("Interior specification",518,210,367,23);page.text("The original brief does not contain a verified project-specific interior image. Request the latest official finishes schedule and interior gallery for the selected residence.",518,266,365,13,color=MUTED,maxh=115)
    page.text("EXTERIOR / DEVELOPMENT REFERENCE",42,450,423,9,True,color=GOLD)
    page.text("INTERIOR / FINISHES REFERENCE" if interiors else "PROJECT-SPECIFIC MEDIA CONFIRMATION",494,450,424,9,True,color=GOLD)
    page.sources(p["sources"][:2]);pages.append(page)
    plans=p["media"].get("floorplans") or []
    layout_label="Building floorplate reference" if "floorplate" in p["floorplanNote"].lower() else "Residence layout"
    page=Page(name+" | Floorplan",gid,"floorplan",project=name);page.head(layout_label,name,subtitle=p["floorplanNote"])
    for i,img in enumerate(plans[:2]):
        x=42+i*445 if len(plans)>1 else 140;ww=431 if len(plans)>1 else 680
        page.rect(x,180,ww,269,"FFFFFF");page.img(img,x+7,187,ww-14,255,fit="contain",alt=name+" floorplan reference")
    if not plans:page.text("Exact unit floorplan pending developer confirmation.",42,249,850,20)
    page.sources(p["sources"][:2]);pages.append(page)
    if gid=="ready":
        page=Page(name+" | Rental returns",gid,"income",project=name);page.head("Ready property / Rental evidence",name,subtitle="Planning range informed by the linked asking rents and registered-lease comparables. It is not a guaranteed letting outcome.")
        values=[("ANNUAL RENT RANGE",aed(p["rentLow"])+" - "+number(p["rentHigh"])),("GROSS RENTAL ROI",pct(p["grossLow"])+" - "+pct(p["grossHigh"])),("ESTIMATED NET ROI",pct(p["netLow"])+" - "+pct(p["netHigh"]))]
        for i,(label,value) in enumerate(values):
            x=42+i*299;page.text(label,x,181,278,9,True,color=GOLD);page.text(value,x,207,278,24,maxh=62)
        rows=[["Occupancy assumption","95%","Planning assumption"],["Annual service charges",aed(p["annualService"]),f"{p['serviceRate']:g} AED/sq ft - planning provision"],["Management allowance","5% of gross rent","Planning assumption"],["Other annual maintenance / insurance",aed(p["annualOther"]),"Planning assumption"],["Net ROI denominator",aed(p["allIn"]),"Complete acquisition budget, including provisions"]]
        page.table(["CALCULATION INPUT","VALUE","BASIS"],rows,y=287,widths=[337,219,320],rowh=27,size=10.5)
        page.text("Gross ROI = rent / price. Net ROI = (95% of rent - service charges - management - other costs) / acquisition budget. Excludes borrowing, tax and disposal costs.",42,455,870,9.5,color=MUTED,maxh=28)
        page.text("Rental evidence: "+p["rentSources"][0]["label"],42,490,870,8.5,color=GOLD,link=p["rentSources"][0]["url"]);page.d["sources"]+=p["rentSources"];pages.append(page)
    return pages

def closing_pages(report,data,projects):
    gid=report["id"];pages=[]
    p=Page("The purchase process",gid,"process");p.head("International client / Ownership and execution")
    entries=[("01  Select and verify","Confirm the unit number, agreed price, registered area, parking allocation and current title or project registration."),("02  Document the commitment","Reconcile the SPA or resale agreement, DLD treatment, agency terms, developer statements and the complete payment timetable."),("03  Transfer or register","Coordinate the required identity documents, registration, developer NOC where applicable, and receipts for each payment."),("04  Inspect and take possession","Review the completed property, snagging, service-charge statement, handover invoices and utility requirements.")]
    for i,(title,body) in enumerate(entries):bullet(p,title,body,42+(i%2)*449,172+(i//2)*129,418)
    p.text("Dubai residency context",42,430,850,13,True)
    p.text("DLD describes a renewable 10-year property-investor route from AED 2 million in qualifying ownership. The individual prices here fall below that threshold. Eligibility depends on the applicant and qualifying holdings.",42,453,868,10,color=MUTED,maxh=28)
    p.text("Source: Dubai Land Department / Golden Visa investor",42,492,870,8,color=GOLD,link=data["sources"]["visa"]["url"]);pages.append(p)
    all_sources=[];seen=set()
    for s in list(data["sources"].values())+[s for v in projects for s in v["sources"]+[v["planSource"]]+v.get("rentSources",[])+([v["waiverSource"]] if v.get("waiverSource") else [])]:
        if s["url"] not in seen:seen.add(s["url"]);all_sources.append(s)
    for k in range(0,len(all_sources),10):
        p=Page("Sources and evidence",gid,"sources");p.head("Research record / 08 September 2026",subtitle="Official sources support regulation and project context. Listing evidence supports asking prices and advertised terms; inventory can change.")
        y=170
        for s in all_sources[k:k+10]:
            p.text(s["label"],42,y,870,10.8,True,link=s["url"],maxh=28)
            p.text(re.sub(r"^https?://", "",s["url"]).split("/")[0]+"  |  Open source",42,y+17,870,8.5,color=GOLD,link=s["url"]); y+=31
        pages.append(p)
    p=Page("Recommendations",gid,"recommendations");p.head("Recommendations",title="Curated properties for appreciation",subtitle="Selected properties with the strongest appreciation case within this PSR comparison. Assessment is qualitative; no return or market-wide ranking is guaranteed.")
    y=181
    for rec in report["recommendations"]:
        y=bullet(p,rec["title"],rec["body"],42,y,871)+3
    disclaimer="The final choice is yours. PSR Homes will support Mr. Arul's preferred property with clear comparisons and careful transaction coordination. Our recommendations reflect the available evidence and your priorities. Prices, inventory, incentives, fees and completion schedules may change and remain subject to written confirmation."
    p.line(42,411,876)
    p.text(disclaimer,42,428,867,11,color=MUTED,maxh=56)
    p.text("Jumanah  |  jumanah@psrhomes.ae  |  +971 58 680 1148",42,493,870,10,True,color=GOLD)
    pages.append(p)
    return pages

def archive_pages(report,data):
    pages=[]
    for v in data.get("archive",[]):
        if v["category"]!=report["id"]:continue
        p=Page(v["name"],report["id"],"reference",project=v["name"])
        p.head("Original collection / Follow-up reference",subtitle="Retained project context - not included in the priced shortlist or budget ranking.")
        p.img(v["media"]["hero"],42,178,423,260,alt=v["name"]+" development reference")
        p.text(v["developer"],496,180,420,17,True)
        p.text(v["note"],496,218,415,13,color=MUTED,maxh=145)
        p.text("Exact unit price, payment schedule and final fees must be established before a recommendation is made.",496,386,415,11,color=MUTED,maxh=49)
        p.sources([v["archiveSource"]]);pages.append(p)
        p=Page(v["name"]+" | Reference gallery",report["id"],"reference-gallery",project=v["name"])
        p.head("Original collection / Project imagery",v["name"],subtitle="Original project imagery and indicative layout; not a verified available-unit pack.")
        imgs=v["media"].get("interiors",[])
        if imgs:p.img(imgs[0],42,175,423,270,alt=v["name"]+" interior reference")
        plans=v["media"].get("floorplans",[])
        if plans:
            p.rect(495,175,423,270,"FFFFFF");p.img(plans[0],501,181,411,258,fit="contain",alt=v["name"]+" indicative plan")
        p.sources([v["archiveSource"]]);pages.append(p)
    return pages

def write_pdf(pages,path,label):
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    c.setTitle("Dubai South | "+label+" | Mr. Arul | Jumanah | PSR Homes")
    c.setAuthor("PSR Homes Real Estate LLC | Jumanah")
    for i,p in enumerate(pages):
        c.setFillColor(HexColor("#"+p.d["background"]));c.rect(0,0,W,H,fill=1,stroke=0)
        c.bookmarkPage(f"page{i}");c.addOutlineEntry(p.d["title"],f"page{i}",0,False)
        for el in p.d["elements"]:
            x,y,w,h=el["x"],el["y"],el["w"],el["h"]
            if el["type"]=="rect":
                c.saveState();c.setFillAlpha(el.get("opacity",1));c.setFillColor(HexColor("#"+el["fill"]));c.rect(x,H-y-h,w,h,stroke=0,fill=1);c.restoreState()
            elif el["type"]=="text":
                c.setFont("PSRBold" if el["bold"] else "PSR",el["size"]);c.setFillColor(HexColor("#"+el["color"]))
                for n,line in enumerate(el["lines"]):c.drawString(x,H-y-el["size"]-n*el["leading"],line)
                if el.get("link"):c.linkURL(el["link"],(x,H-y-h,x+w,H-y),relative=0)
            elif el["type"]=="image":
                reader,(iw,ih)=embedded_image(el["src"])
                factor=min(w/iw,h/ih) if el["fit"]=="contain" else max(w/iw,h/ih)
                dw,dh=iw*factor,ih*factor
                c.saveState();clip=c.beginPath();clip.rect(x,H-y-h,w,h);c.clipPath(clip,stroke=0)
                c.drawImage(reader,x+(w-dw)/2,H-y-h+(h-dh)/2,dw,dh,mask="auto");c.restoreState()
        if p.d["kind"]!="cover":
            c.setStrokeColor(HexColor("#"+LINE));c.line(42,27,918,27)
            c.setFont("PSR",8);c.setFillColor(HexColor("#"+MUTED));c.drawString(42,14,"PSR HOMES  /  MR. ARUL  /  "+label.upper())
            c.drawRightString(918,14,f"{i+1:02} / {len(pages):02}")
        c.showPage()
    c.save()

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--report",choices=["ready","under","above"],help="Regenerate only this PDF while rebuilding the complete shared scene model.")
    args=parser.parse_args()
    data=json.loads(SOURCE.read_text())
    OUT.mkdir(parents=True,exist_ok=True)
    allslides=[];reports=[]
    for report in data["reports"]:
        projects=sorted([project_math(dict(v)) for v in data["projects"] if v["category"]==report["id"]],key=lambda v:v["allIn"])
        for p in projects:
            assert (p["allIn"]<=1_200_000 if report["id"]=="ready" else p["allIn"]<1_700_000 if report["id"]=="under" else 1_700_000<p["allIn"]<=1_850_000),(p["name"],p["allIn"])
        pages=common_pages(report,data,projects)+comparison_pages(report,projects)
        for p in projects:pages+=project_pages(report,p)
        pages+=archive_pages(report,data)
        pages+=closing_pages(report,data,projects)
        fname=f"PSR_Dubai_South_{report['filename']}_Mr_Arul_Jumanah_2026-09-08.pdf"
        if args.report is None or args.report==report["id"]:
            write_pdf(pages,OUT/fname,report["label"])
        for page in pages:page.d["number"]=len(allslides)+1;allslides.append(page.d)
        reports.append({**report,"file":fname,"pageCount":len(pages),"projects":[{"name":p["name"],"allIn":p["allIn"],"price":p["price"],"area":p["area"],"pricePerSqft":p["pricePerSqft"]} for p in projects]})
        print(json.dumps({"file":str(OUT/fname),"pages":len(pages),"projects":len(projects),"written":args.report is None or args.report==report["id"]}))
    SCENES.write_text(json.dumps({"width":W,"height":H,"title":"Dubai South","client":"Mr. Arul","advisor":"Jumanah","date":"2026-09-08","reports":reports,"slides":allslides},indent=2)+"\n")
