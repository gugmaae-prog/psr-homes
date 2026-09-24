"""Non-destructive, spreadsheet-only presentation edition. No site publication.

Sources, unit evidence and assumptions are deliberately separate. Unknown fees
are budget provisions, never developer quotes; no off-plan income projections.
"""
from pathlib import Path
import importlib.util, json, html, base64, datetime, hashlib, urllib.request
from PIL import Image
from io import BytesIO

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('psr_layout',ROOT/'scripts/build-dubai-south-three-reports.py')
L=importlib.util.module_from_spec(spec);spec.loader.exec_module(L)
Page=L.Page; AED=L.aed; N=L.number; GOLD=L.GOLD; MUTED=L.MUTED
DATA=json.loads((ROOT/'tmp/sheet-presentations/projects.json').read_text())
OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
WEB=ROOT/'output/presentation';WEB.mkdir(parents=True,exist_ok=True)
DLD='https://dubailand.gov.ae/en/eservices/property-sale-registration/'
DEWA='https://dewa.gov.ae/MOVEIN'
AIR='https://www.protocol.dubai.ae/en/media-listing/news-events/mohammed-bin-rashid-approves-designs-start-of-work-on-new-aed128-billion-passenger-terminal-at-al-maktoum-international-airport/'
HARMONY='https://uae.dubizzle.com/property-for-sale/residential/apartment/2026/9/1/close-to-school-brand-new-lowest-price-2-321409/'
TERRA='https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-expo-city-terra-heights-67431270.html'
PULSE_RENT='https://www.propertyfinder.ae/en/rent/dubai/properties-for-rent-dubai-south-dubai-world-central-the-pulse-the-pulse-residence-park-the-pulse-residence-park-b3.html'
CELESTIA_RENT='https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-dubai-dubai-south-dubai-world-central-residential-district-celestia-celestia-b-131559865.html'
ORIGINAL_RESOLVER=L.resolve_img
SNAPSHOT_MAP={}
L.resolve_img=lambda src: SNAPSHOT_MAP.get(src) or ORIGINAL_RESOLVER(src)

def snapshot_images(pages):
    folder=ROOT/'tmp/sheet-presentations/locked-assets';folder.mkdir(exist_ok=True)
    remote={p['localUrl']:p['remoteUrl'] for q in DATA for p in q['plans'] if p.get('remoteUrl')}
    for page in pages:
        for e in page.d['elements']:
            if e['type']!='image' or e['src'] in SNAPSHOT_MAP:continue
            src=e['src'];original=ORIGINAL_RESOLVER(src)
            dest=folder/(hashlib.sha256(src.encode()).hexdigest()[:20]+original.suffix)
            try:
                raw=(dest if dest.exists() else original).read_bytes()
                with Image.open(BytesIO(raw)) as im:im.verify()
            except Exception:
                if src not in remote:raise
                with urllib.request.urlopen(remote[src],timeout=25) as r:raw=r.read()
                with Image.open(BytesIO(raw)) as im:im.verify()
            if not dest.exists():dest.write_bytes(raw)
            SNAPSHOT_MAP[src]=dest

def rel(path):
    p=Path(path)
    return str(p.relative_to(ROOT)) if p.is_absolute() and str(p).startswith(str(ROOT)) else path
def src(p):
    refs=[{'label':'Project information / public reference, reviewed 12 Sep 2026','url':p['sourceUrl']}] if p['sourceUrl'] else []
    for g in p['gallery'][:1]:
        u=g['source']
        if u.startswith('https://jre.ae/projects/') and u!=p['sourceUrl']:refs.append({'label':'JRE / published project imagery reference','url':u})
    return refs
def pg(title,g,kind='content',p=None):
    page=Page(title,g,kind,project=p['id'] if p else None);page.head('Dubai South / '+('Ready properties' if g=='ready' else 'Off-plan (Under Construction)'))
    for e in page.d['elements']:
        if e.get('type')=='text' and e['y']==95 and len(e['lines'])>1:
            e['size']=24;e['leading']=30;e['lines']=L.lines_for(e['text'],24,e['w']);e['h']=len(e['lines'])*30
    return page
def note(page,text,y=422):page.text(text,42,y,875,10.5,color=MUTED,maxh=41)
def body(page,heading,text,x,y,w=410):
    end=page.text(heading,x,y,w,16,True,color=GOLD)
    return page.text(text,x,end+9,w,12,color=MUTED,maxh=115)+20

def prepare(p):
    p=dict(p)
    # Range-priced records use their upper price for conservative budget allocation.
    p['basis']=p['priceMax'];p['serviceArea']=p['area'] or {'seraya-by-zoya':1250,'golf-vale':679}.get(p['id'],750);p['service']=round(p['serviceArea']*20,2)
    ready=p['group']=='ready';p['limit']=1200000 if ready else 1700000
    p['fees']=[('Purchase consideration',p['basis'],'Spreadsheet; range upper bound where applicable'),
      ('DLD transfer / registration',p['basis']*.04,'4% buyer-funded assumption; no waiver deducted'),
      ('Agency fee incl. VAT',p['basis']*.021,'2% + VAT provision; contract may differ'),
      ('Trustee / registration administration',4200 if ready else 3020,'Official resale trustee rate' if ready else 'Provisional administration allowance'),
      ('Title / map / knowledge / innovation',520,'Resale basis; off-plan provision to reconcile'),
      ('NOC / developer administration',5000,'Allowance, not a confirmed quotation'),
      ('Parking / allocation',5000,'Allowance; release if included in the contract'),
      ('Handover / connection charges',5000,'Allowance; confirm itemised developer statement'),
      ('DEWA security deposit',2000,'Refundable apartment deposit'),
      ('DEWA activation',155,'Published apartment activation fee'),
      ('First-year service charges',p['service'],'Assumed AED 20 x '+N(p['serviceArea'])+' sq ft; confirm rate / area'),
      ('Unallocated budget reserve',10000,'Contingency, not a mandatory fee')]
    p['total']=round(sum(x[1] for x in p['fees']),2)
    p['psf']=p['price']/p['area'] if p['area'] else None
    if p['id']=='terra-heights':
        p['sourceUrl']=TERRA;p['fees'][0]=('Published comparison asking price',p['basis'],'Separate 728 sq ft listing; not spreadsheet confirmation')
    if p['id']=='the-harmony-2':p['sourceUrl']=HARMONY
    # One source's Cresswell gallery is clearly a different masterplan. Exclude it.
    if p['id']=='cresswell-views' and not p.get('galleryReviewedSource'):p['gallery']=[]
    if p['id']=='golf-trails':
        p['sourceUrl']='https://cdn.emaar.com/en/properties/golf-trails-at-emaar-south'
        p['plans']=[{'localUrl':'/projects/golf-trails/floorplan-1br.jpg','layout':'1-bedroom project reference','areaSqft':None}]
        p['qualification']='Existing PSR project-library drawing. Exact unit number and area have not been matched.'
    return p

def intro(g,items):
    labels={'ready':('Ready properties','Up to AED 1.2M including planned fees'), 'under':('Off-plan (Under Construction)','Below AED 1.7M including planned fees'), 'above':('Off-plan (Under Construction)','Above AED 1.7M / Terra comparison')}
    label,budget=labels[g]
    cover=L.make_cover({'id':g,'label':label,'budgetLabel':budget},{'coverImage':'/presentations/dubai-south-investor-brief/cover/wasl-dome.webp','advisor':{'avatarUrl':'/presentations/dubai-south-investor-brief/advisor/jumanah-cover.webp'}})
    for e in cover.d['elements']:
        if e.get('text')=='08 SEPTEMBER 2026':e['text']='12 SEPTEMBER 2026';e['lines']=['12 SEPTEMBER 2026']
    pages=[cover]
    p=pg('A focused property collection',g,'mandate')
    p.text(f"{len(items):02} "+('completed properties' if g=='ready' else 'project comparison' if len(items)==1 else 'project comparisons'),42,169,865,36,color=GOLD)
    body(p,'The mandate','Dubai South property options for Mr. Arul, Singapore. We compare the acquisition requirement, property specification and payment structure, with Jumanah as the PSR advisor.',42,234)
    text={'ready':'The ceiling is AED 1.2M including planned fees and first-year service charges. Pulse B3 is listed as tenanted; vacant possession is not established for either selected unit.', 'under':'The ceiling is AED 1.7M including planned fees and reserves. Original project payment plans are shown separately from the actual resale settlement, which needs a seller ledger.', 'above':'Terra Heights is included provisionally as the likely unnamed final spreadsheet entry. A separate AED 1.65M listing demonstrates the above-budget route; it does not validate the unnamed sheet price.'}[g]
    body(p,'The budget',text,508,234)
    note(p,'Research / planning edition. Prices, inventory, incentives and charges may vary. No reservation, current developer quotation or selected-unit availability is implied.',420)
    pages.append(p)
    p=pg('Why Dubai South',g,'context')
    body(p,'Airport-led connectivity','The AED 128 billion Al Maktoum terminal programme is a long-term infrastructure catalyst. Ultimate capacity is a planned outcome, not the airport\'s present passenger activity.',42,168)
    body(p,'Expo City and business activity','Expo City and the exhibition district broaden the surrounding employment and destination mix. Each property should be assessed by its actual access route, not by a generic proximity claim.',508,168)
    body(p,'Residential choice','Emaar South offers a golf-led master-community setting. The Residential District has a different building and amenity mix. Terra Heights belongs to Expo Living / Expo City, not Emaar South.',42,315)
    body(p,'Investment discipline','Infrastructure can support long-term demand, but does not establish a guaranteed appreciation rate. Entry price, unit layout, community delivery and the final funding requirement remain decisive.',508,315)
    p.sources([{'label':'Dubai Government / airport terminal approval, 28 April 2024','url':AIR},{'label':'Dubai Exhibition Centre / expansion','url':'https://www.dubaiexhibitioncentre.com/en/expansion'}]);pages.append(p)
    p=pg('Connections and everyday living',g,'community')
    body(p,'Schools and family routines','GEMS Founders School Dubai South is an education reference for the area. School places, transport routes and the daily journey require address-specific checks.',42,168)
    body(p,'Healthcare and retail','Healthcare access can include NMC Royal Hospital in Dubai Investments Park. Retail and leisure choices vary by community; a project render does not establish an operational mall or clinic.',508,168)
    body(p,'Location comparison','Compare three distinct settings: Emaar South, Dubai South Residential District and Expo City. Airport and Expo drive times depend on the exact building entrance, route and traffic.',42,315)
    body(p,'Demand considerations','Airport, logistics and business employment, together with households seeking local amenities, are potential demand drivers. These are analytical demand segments, not measured buyer demographics.',508,315)
    p.sources([{'label':'GEMS Founders Dubai South / location','url':'https://www.gemsfoundersschool-dubaisouth.com/en/About-Us/Our-Location'},{'label':'NMC Royal Hospital DIP / location','url':'https://nmc.ae/en/locations/dubai/nmc-royal-hospital-dip-dubai'}]);pages.append(p)
    p=pg('How the all-in budget is built',g,'method')
    body(p,'One comparable funding total','Purchase price + stated fee assumptions + refundable deposit + first-year service-charge provision + reserve. This is a planning envelope, not a final developer invoice.',42,170)
    body(p,'No unverified DLD discount','The model reserves 4% of the price for DLD. Official resale registration splits 2% seller / 2% buyer; assuming the buyer funds both is conservative, not a statutory allocation.',508,170)
    body(p,'Recurring charges stay visible','First-year service charges use AED 20/sq ft as a common planning assumption, not a building-specific quotation. Future annual charges continue separately after the first year.',42,316)
    body(p,'Before commitment','Replace every allowance with written fees, the current payment ledger and approved service charges. Financing, furnishing upgrades, foreign exchange and personal tax are outside this unfinanced comparison.',508,316)
    p.sources([{'label':'Dubai Land Department / property sale registration fees','url':DLD},{'label':'DEWA / apartment move-in deposit and activation','url':DEWA}]);pages.append(p)
    for start in range(0,len(items),7):
        p=pg('The shortlist / ascending planned total',g,'comparison')
        rows=[]
        for q in items[start:start+7]:rows.append([q['name'],N(q['basis']),N(q['total']),N(q['limit']-q['total']) if q['total']<=q['limit'] else '+'+N(q['total']-q['limit'])])
        p.table(['PROJECT','PRICE BASIS / AED','PLANNED TOTAL / AED','HEADROOM / EXCESS'],rows,widths=[330,176,186,184],rowh=34,size=10)
        note(p,'Range-priced projects use the upper quoted range. Totals include allowances; an available unit within the ceiling is not yet guaranteed.',448)
        pages.append(p)
    return pages

def overview(q):
    g=q['group'];p=pg(q['name'],g,'project',q)
    gallery=q['gallery'];x=520 if gallery else 42;w=396 if gallery else 876
    if gallery:p.img(rel(gallery[0]['path']),42,170,446,260,alt=q['name']+' project reference')
    p.text(q['developer'],x,170,w,12,True,color=GOLD)
    p.text(AED(q['price'])+((' - '+N(q['priceMax'])) if q['priceMax']!=q['price'] else ''),x,201,w,26)
    area=(N(q['area'])+' sq ft') if q['area'] else ('540-1,250 sq ft range' if q['id']=='seraya-by-zoya' else '671-679 sq ft range' if q['id']=='golf-vale' else 'Exact area to confirm')
    p.text('1 bedroom  |  '+area,x,244,w,12)
    p.text(('AED '+N(q['psf'])+' / sq ft') if q['psf'] else 'Unit-specific AED / sq ft not established',x,268,w,13,True,color=GOLD)
    special={
      'terra-heights':'Separate 728 sq ft published comparison, described as Building 1. The unnamed spreadsheet row has AED 1,338,400 and no area; its project identity remains provisional.',
      'the-harmony-2':'Matching AED 860,000 / 629 sq ft listing is off-plan resale. Its stated Q1 2026 handover has elapsed; completion and possession require confirmation.',
      'the-pulse-residence-park-b3':'Matching AED 675,000 / 640 sq ft listing is currently rented. Confirm the lease, income, deposit transfer and possession terms before treating this as a move-in option.',
      'celestia-b':'Completed building. The spreadsheet\'s 727 sq ft offer has not been matched to an available vacant unit. Images are building / other-unit references.',
      'windsor-house-building-b':'Windsor House Building B, phase I. No Windsor House II specification or floorplan has been substituted.',
      'azizi-venice-14-building-g':'The sheet advertises 2% DLD. No written waiver was confirmed, so the model retains 4%. The public delivery date has elapsed; confirm completion status.',
      'seraya-by-zoya':'The sheet gives a price and area range, not one matched unit. The upper price is used for budget allocation; do not pair range endpoints to infer an exact layout.',
      'golf-vale':'A range, not an exact unit selection. The AED 1.2M upper price is used for funding; confirm the selected layout and matched area.',
      'cresswell-views':'Cresswell Views only, not Cresswell Plaza or Residences. The public project record shows sold out; the sheet offer needs a current resale availability check.'}
    t=special.get(q['id'],'Spreadsheet price and area are the comparison basis, not a confirmed live offer. Published imagery and plans describe the project; exact unit, floor and availability require confirmation.')
    target='Delivery schedule to confirm'
    try:
        dt=datetime.date.fromisoformat(q['handover'][:10]);target='Indicative delivery: '+dt.strftime('%b %Y') if dt>=datetime.date(2026,9,12) else 'Completion status requires update'
    except (ValueError,TypeError):pass
    if g=='ready':target='Completed building / possession to confirm'
    if q['id']=='terra-heights':target='Indicative delivery: Mar 2029; confirm SPA'
    p.text(target,x,293,w,10.5,color=GOLD)
    p.text(t,x,323,w,11.5,color=MUTED,maxh=108)
    p.sources(src(q));return p

def fee_pages(q):
    g=q['group'];pages=[]
    for part,rows in enumerate([q['fees'][:6],q['fees'][6:]]):
        p=pg(q['name']+' / '+('acquisition costs' if not part else 'completion and total'),g,'fees',q)
        p.table(['ITEM','AMOUNT / AED','BASIS'],[[a,N(b),c] for a,b,c in rows],widths=[304,150,422],rowh=34,size=10)
        if part:
            p.rect(42,419,876,39,L.DARK);p.text('TOTAL PLANNED FUNDING',55,430,440,11,True,color=L.PAPER);p.text(AED(q['total']),610,426,295,20,True,color=L.PAPER)
        else:note(p,'All allowances are estimates. They may be replaced or released after the actual contract and statements are obtained.',430)
        p.sources([{'label':'Official fee basis: DLD registration; remaining provisions are PSR assumptions','url':DLD}]);pages.append(p)
    return pages

def schedule(q):
    id=q['id'];phases=q['payment'];rows=[]
    if q['group']=='ready':return [('Purchase price at transfer',100,'Deposit, if paid, is part of this price')], 'The reservation deposit is not an extra charge. The signed sale agreement determines deposit size, transfer timing and settlement adjustments.'
    if id=='seraya-by-zoya':return [('Booking',20,'As supplied in the spreadsheet'),('During construction',28,'Milestone dates to confirm'),('Handover',10,'On completion'),('Post-handover',42,'Duration / instalments to confirm')], 'Spreadsheet project structure. Percentages do not verify a particular seller\'s outstanding balance.'
    if id in ['golf-trails']:return [('Booking',10,'Contract date to confirm'),('During construction',70,'Individual milestones to confirm'),('Handover',20,'On completion')], 'Spreadsheet project structure; current allocation and exact instalment dates are not supplied.'
    if id=='the-harmony-2':return [('Before completion',70,'Original project structure'),('Completion',30,'Original project structure')], 'The matching listing describes 70/30. Actual settlement requires the seller\'s paid-to-date balance and any assignment premium.'
    if id=='terra-heights':return [('Before completion',80,'Original 80/20 structure'),('Completion',20,'Published March 2029 target; confirm SPA')], '80/20 is a project-level illustration. A resale premium and original contract price may change the amount payable to the seller versus developer.'
    for phase in phases:
        label={'down_payment':'Booking','during_construction':'During construction','handover':'Handover','post_handover':'Post-handover'}.get(phase['label'],phase['label'].replace('_',' ').title())
        for m in phase.get('miles',[]):rows.append((label,float(m['value']),m.get('label') or 'Exact contractual date to confirm'))
    if rows and abs(sum(x[1] for x in rows)-100)<.01:return rows,'Published original project schedule, applied illustratively to the comparison price. Historic milestones may already be paid; obtain the unit ledger to establish today\'s settlement.'
    return [('Purchase consideration - unallocated',100,'Exact payment schedule not confirmed')], 'No reliable unit-specific instalment schedule was established. We show the full amount without inventing a booking percentage or milestone dates.'

def payment_pages(q):
    rows,explain=schedule(q);pages=[];cumulative=0;amounts=[]
    for label,percent,due in rows:
        amount=round(q['basis']*percent/100,2);cumulative+=amount;amounts.append([label,N(percent)+'%',N(amount),due])
    assert abs(cumulative-q['basis'])<1
    for start in range(0,len(amounts),6):
        p=pg(q['name']+' / payment plan',q['group'],'payment',q)
        p.table(['MILESTONE','SHARE','AMOUNT / AED','TIMING / EVIDENCE'],amounts[start:start+6],widths=[243,73,153,407],rowh=35,size=9.5)
        y=max(285,175+28+len(amounts[start:start+6])*35+14)
        p.text(explain,42,y,875,11,color=MUTED,maxh=56)
        if y<400:p.text('Price allocation: '+AED(q['basis'])+'  |  Fees and provisions: '+AED(q['total']-q['basis'])+'  |  Total: '+AED(q['total']),42,418,875,11,True,color=GOLD)
        p.sources(src(q));pages.append(p)
    p=pg(q['name']+' / fees alongside instalments',q['group'],'funding',q)
    p.table(['FUNDING COMPONENT','AMOUNT / AED','WHEN TO ALLOW FOR IT'],[
      ['Purchase price',N(q['basis']),'As the confirmed contract / resale ledger requires'],
      ['DLD provision',N(q['basis']*.04),'Registration / transfer; exact invoice timing to confirm'],
      ['Other fees, deposits and reserves',N(q['total']-q['basis']*1.04),'Split between transaction, handover and first year'],
      ['Total planned funding',N(q['total']),'Not all payable on the same day'],
      [('Budget headroom' if q['total']<=q['limit'] else 'Additional budget required'),N(abs(q['limit']-q['total'])),'Against '+AED(q['limit'])+' ceiling']
    ],widths=[315,180,381],rowh=39,size=10)
    txt='No DLD waiver has been deducted. A signed incentive must specify the exact unit, percentage and validity.'
    if q['id']=='azizi-venice-14-building-g':txt='If a written 2-percentage-point DLD concession is confirmed, the saving would be AED 19,188. Until then, the full 4% provision remains in the total.'
    note(p,txt,420);p.sources([{'label':'DLD fee basis; timing and concessions require contract confirmation','url':DLD}]);pages.append(p)
    return pages

def media_pages(q):
    pages=[];gallery=q['gallery']
    if len(gallery)>1:
        p=pg(q['name']+' / gallery',q['group'],'gallery',q)
        images=gallery[1:3]
        for i,img in enumerate(images):p.img(rel(img['path']),42+i*449,168,427 if len(images)>1 else 876,239,fit='contain',alt=q['name']+' published reference')
        amenities=', '.join(a['name'] for a in q.get('amenities',[])[:4])
        if amenities:p.text('Published amenities: '+amenities,42,413,875,10,color=GOLD,maxh=16)
        note(p,'Published project / listing references. Renders are illustrative; finishes, views and the selected unit may differ.',433)
        p.sources(src(q));pages.append(p)
    for plan in q['plans'][:1]:
        p=pg(q['name']+' / floorplan reference',q['group'],'floorplan',q)
        p.img(plan['localUrl'],42,160,596,287,fit='contain',alt=q['name']+' real published floorplan')
        p.text('1-bedroom layout',672,171,245,19,True)
        size=plan.get('areaSqft');p.text((N(size)+' sq ft published plan') if size else 'Published area not established',672,210,245,12,color=GOLD)
        p.text(str(plan.get('layout','Project reference')),672,247,245,11,color=MUTED,maxh=50)
        p.text('Reference only. Confirm the selected unit number, orientation and area against its signed plan. No geometry has been generated or redrawn.',672,310,245,11,color=MUTED,maxh=115)
        p.sources(src(q));pages.append(p)
    return pages

def rental(q):
    pulse='pulse' in q['id'];rents=[54000,56000,58000] if pulse else [55000,57500,60000]
    p=pg(q['name']+' / rental return scenarios','ready','income',q)
    rows=[]
    for tag,r in zip(['Lower','Central','Upper'],rents):
        net=r*.95*.95-q['service']-2000
        rows.append([tag,N(r),f'{r/q["basis"]*100:.2f}%',N(net),f'{net/q["total"]*100:.2f}%'])
    p.table(['SCENARIO','RENT / YEAR','GROSS YIELD','NET / YEAR','NET YIELD'],rows,widths=[157,183,170,186,180],rowh=40,size=11)
    body(p,'Calculation basis','Gross yield = rent / purchase price. Net income assumes 5% vacancy, management at 5% of collected rent, service charges at AED 20/sq ft and AED 2,000 maintenance.',42,348)
    body(p,'Interpretation','Net yield uses total planned funding, including reserves, as its denominator. These are illustrative sensitivities, not a signed lease or a guaranteed return. Financing and personal tax are excluded.',508,348)
    p.sources([{'label':'Building-level rental reference, not selected-unit lease evidence','url':PULSE_RENT if pulse else CELESTIA_RENT}]);return p

def ending(g,items):
    pages=[];p=pg('Evidence and confirmations',g,'evidence')
    gaps=[]
    for q in items:
        missing=[]
        if not q['plans']:missing.append('selected-unit floorplan')
        if not q['gallery']:missing.append('project-specific imagery')
        if schedule(q)[0][0][0].endswith('unallocated'):missing.append('instalment schedule')
        if missing:gaps.append((q['name'],', '.join(missing)))
    if len(gaps)>6:
        for start in range(0,len(gaps),6):
            pp=pg('Evidence and confirmations',g,'evidence');pp.table(['PROJECT','MATERIAL STILL TO CONFIRM'],gaps[start:start+6],widths=[345,531],rowh=36,size=10);note(pp,'Missing documents are not replaced with invented floorplans or arbitrary instalments. This edition is for review, not reservation.',435);pages.append(pp)
    else:
        p.table(['PROJECT','MATERIAL STILL TO CONFIRM'],gaps or [('All projects','Exact unit, live inventory, fee invoices and signed payment ledger')],widths=[345,531],rowh=37,size=10)
        note(p,'Every property still requires current written availability, agreed fees and unit documents. Referenced layouts are not selected-unit certification.',435);pages.append(p)
    p=pg('Sources and reading notes',g,'sources')
    body(p,'Project scope','The client spreadsheet DUBAISOUTH (1).xlsx, Sheet4, is the shortlist authority. Only its 17 named entries plus the provisional unnamed Terra entry are included. Earlier project lists are superseded.',42,171)
    body(p,'Price evidence','Most prices remain client-supplied comparison inputs. Pulse and Harmony have matching public listing evidence. Terra is a separately identified above-budget listing, not confirmation of the unnamed row.',508,171)
    body(p,'Images and plans','Existing online or PSR project-library material is used. A project reference is not proof of a selected unit. No AI floorplans, invented layouts or substituted Windsor House II plans are included.',42,315)
    body(p,'Availability and fees','Reviewed 12 September 2026. Market data, inventory, incentives, delivery schedules and charges may change. Obtain the current SPA, unit ledger and written fee schedule before proceeding.',508,315)
    p.sources([{'label':'PSR Homes / Jumanah','url':'https://psrhomes.ae/advisors/jumanah'}]);pages.append(p)
    p=pg('Recommendations',g,'recommendations')
    bullets={
      'ready':[
        ('Pulse B3: prioritise the lower entry requirement','Its lower purchase price and planned total preserve more of the AED 1.2M budget. Consider it as a tenanted investment only after the existing lease and possession terms are reviewed.'),
        ('Celestia B: retain as the completed-building alternative','Compare the exact 727 sq ft unit, condition and annual charges before choosing it over Pulse. The budget margin allows room for confirmed costs, not an assumption of superior income.'),
        ('Choose on net ownership economics','The preferred ready property should combine an acceptable all-in total, verified occupancy terms and a supportable net rental return.')],
      'under':[
        ('Prioritise the Emaar South comparison','Golf Point, Golf Trails, Golf Vale, Golf Hills, Golf Acres and Golf Meadow provide a focused master-community comparison. Select the strongest exact-unit price, layout and payment profile.'),
        ('Retain Ellington Windsor House Building B','It provides a design-led alternative within the spreadsheet shortlist. Compare phase I specifications and its confirmed seller ledger, without importing phase II terms.'),
        ('Invest within the verified funding ceiling','Prefer the option with clear documentation, appropriate unit fundamentals and an agreed total below AED 1.7M. Developer identity alone is not evidence of guaranteed delivery or appreciation.')],
      'above':[
        ('Consider Terra only with an intentional budget extension','The separate AED 1.65M listing produces a planned total of '+AED(items[0]['total'])+'. The additional funding above AED 1.7M is '+AED(items[0]['total']-1700000)+'.'),
        ('Use Expo Living as the location rationale','Terra offers an Expo City setting distinct from Emaar South. Assess the value of that location against the higher total and the exact building, layout and seller terms.'),
        ('Confirm the spreadsheet identity first','Do not commit on the unnamed row or assume its AED 1,338,400 figure belongs to Terra. Obtain the project name, unit number, current offer and original developer ledger.')]
    }[g]
    y=166
    for title,text in bullets:y=L.bullet(p,title,text,42,y,876)
    p.text('Our role is to support an informed choice. We respect your priorities and final property selection, and will help evaluate the confirmed terms before commitment.',42,430,875,11,color=MUTED,maxh=34)
    pages.append(p);return pages

def online(pages,path,label):
    slides=[]
    for i,p in enumerate(pages):
        els=[]
        for e in p.d['elements']:
            css=f'left:{e["x"]}px;top:{e["y"]}px;width:{e["w"]}px;height:{e["h"]}px;'
            if e['type']=='text':
                s=f'<div style="{css}font-size:{e["size"]}px;line-height:{e["leading"]}px;color:#{e["color"]};font-weight:{700 if e["bold"] else 400}">{"<br>".join(html.escape(t) for t in e["lines"])}</div>'
                if e.get('link'):s='<a target="_blank" rel="noopener" href="'+html.escape(e['link'],quote=True)+'">'+s+'</a>'
                els.append(s)
            elif e['type']=='rect':els.append(f'<div style="{css}background:#{e["fill"]}"></div>')
            elif e['type']=='image':
                file=L.resolve_img(e['src']);mime='image/'+('jpeg' if file.suffix.lower() in ['.jpg','.jpeg'] else file.suffix[1:]);encoded=base64.b64encode(file.read_bytes()).decode()
                els.append(f'<img alt="{html.escape(e.get("alt",""),quote=True)}" style="{css}object-fit:{e["fit"]}" src="data:{mime};base64,{encoded}">')
        slides.append('<section class="slide" style="background:#'+p.d['background']+'" aria-label="'+html.escape(p.d['title'],quote=True)+'">'+''.join(els)+f'<small>{i+1} / {len(pages)}</small></section>')
    path.write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PSR | Dubai South | '+label+'</title><style>body{margin:0;background:#17241e;font-family:Arial,sans-serif}.slide{position:relative;width:960px;height:540px;margin:24px auto;box-shadow:0 10px 40px #0005}.slide div,.slide img{position:absolute}small{position:absolute;right:42px;bottom:12px;color:#9c8356}@media(max-width:980px){.slide{zoom:calc((100vw - 20px)/960px)}}@media print{body{background:white}.slide{page-break-after:always;margin:0;box-shadow:none}}</style>'+''.join(slides)+'</html>')

def main():
    allitems=[prepare(p) for p in DATA];manifest=[]
    assert len(allitems)==18 and len({p['id'] for p in allitems})==18
    for g,name in [('ready','Ready_Up_to_1_2M'),('under','Offplan_Below_1_7M'),('above','Offplan_Above_1_7M')]:
        items=sorted([p for p in allitems if p['group']==g],key=lambda p:p['total'])
        assert all(p['total']<=p['limit'] for p in items) if g!='above' else all(p['total']>p['limit'] for p in items)
        pages=intro(g,items)
        for q in items:
            pages.append(overview(q));pages+=fee_pages(q)+payment_pages(q)+media_pages(q)
            if g=='ready':pages.append(rental(q))
        pages+=ending(g,items)
        stem='PSR_Dubai_South_'+name+'_Mr_Arul_Jumanah_2026-09-12_REVIEW'
        snapshot_images(pages)
        pdf=OUT/(stem+'.pdf');L.write_pdf(pages,pdf,name.replace('_',' '))
        htmlfile=WEB/(stem+'.html');online(pages,htmlfile,name)
        scenes=WEB/(stem+'.json');scenes.write_text(json.dumps({'slides':[p.d for p in pages]},indent=2))
        manifest.append({'group':g,'pdf':str(pdf),'html':str(htmlfile),'scenes':str(scenes),'pages':len(pages),'projects':[{k:q[k] for k in ['name','sourceRow','basis','total','group']} for q in items]})
    (WEB/'dubai-south-sheet-presentations-manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
