import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'data/jumanah-dubai-south-presentation.json'),'utf8'));
const S=(label,url)=>({label,url});
const F=(label,amount,basis,estimate=false)=>({label,amount:Math.round(amount*100)/100,basis,estimate});
const R=(label,due,percent,stage='before',amount)=>({label,due,percent,stage,...(amount===undefined?{}:{amount})});
const source={
 dld:S('Dubai Land Department / property sale registration','https://dubailand.gov.ae/en/eservices/property-sale-registration/'),
 initial:S('Dubai Land Department / initial sale registration','https://dubailand.gov.ae/en/eservices/request-to-register-the-initial-sale/'),
 dewa:S('DEWA / move-in deposit and activation','https://www.dewa.gov.ae/en/about-us/service-guide/consumer-services/move-in'),
 airport:S('Dubai Media Office / airport construction update, 15 June 2026','https://www.mediaoffice.ae/en/news/2026/june/15-06/hamdan-bin-mohammed-approves-al-maktoum-airport'),
 expo:S('Expo City Dubai / Al Wasl Plaza','https://www.expocitydubai.com/en/things-to-do/attractions/al-wasl-plaza/'),
 exhibition:S('Dubai Exhibition Centre / expansion','https://www.dubaiexhibitioncentre.com/en/expansion'),
 residential:S('Dubai South / Residential District and South Living','https://www.dubaisouth.ae/en/newsroom/dubai-south-properties-unveils-south-living-an-exclusive-luxury-apartment-project-in-the-residential-district'),
 emaarSouth:S('Emaar / Emaar South community and current inventory','https://www.emaar.com/en/our-communities/emaar-south'),
 expoLiving:S('Emaar / Expo Living community and current inventory','https://www.emaar.com/en/our-communities/expo-living'),
 school:S('GEMS Founders School Dubai South / school location','https://www.gemsfoundersschool-dubaisouth.com/en/About-Us/Our-Location'),
 maf:S('Dubai South / Majid Al Futtaim announcement, 19 May 2026','https://www.dubaisouth.ae/en/newsroom/dubai-south-and-majid-al-futtaim-partner-to-develop-aed-62-billion-mixed-use-master-community'),
 health:S('NMC Royal Hospital, Dubai Investments Park','https://nmc.ae/en/locations/dubai/nmc-royal-hospital-dip-dubai'),
 visa:S('Dubai Land Department / Golden Visa investor service','https://dubailand.gov.ae/en/eservices/request-for-golden-visa-investor/'),
 ellington:S('Ellington / resale NOC and service-charge guidance','https://ellingtonproperties.ae/en/faq'),
};
const readyFees=price=>[
 F('DLD registration provision - full 4%',price*.04,'Buyer assumption; Form F controls the final split',true),
 F('Brokerage - 2% plus VAT',price*.021,'Planning allowance; agreed agency terms control',true),
 F('Registration trustee incl. VAT',4200,'AED 4,000 + 5% VAT; at transfer'),
 F('Title deed, unit map and micro-fees',520,'Published DLD schedule; at registration'),
 F('Developer NOC / administration',2500,'Planning allowance; obtain exact invoice',true),
 F('Parking allocation provision',2500,'Not a quoted charge; verify title and allocation',true),
 F('Handover / closing provision',2500,'Not a quoted charge; reconcile any closing invoice',true),
 F('Other closing provision',2500,'Cooling / adjustments / transaction contingency',true),
 F('DEWA refundable apartment deposit',2000,'Refundable, included in initial funding'),
 F('DEWA activation and micro-fees',155,'Current published activation components'),
];
function offFees(price,{admin=5000,adminKnown=false,adminLabel='Administration / NOC provision',assignment=false,oqood=3020}={}){
 const dld=assignment
  ? F('DLD registration provision - full 4%',price*.04,'Buyer assumption; assignment terms control the split',true)
  : F('DLD registration - full 4%',price*.04,'No unconfirmed promotional waiver deducted');
 const rows=[dld,F('Oqood / interim registration provision',oqood,'Confirm exact registration invoice',true),F('Future title deed and unit map',520,'DLD schedule; confirm charges not already absorbed'),F(adminLabel,admin,adminKnown?'Published charge; confirm unit applicability':'Planning allowance; obtain exact invoice',!adminKnown),F('Parking allocation provision',5000,'Not a quoted charge; confirm SPA allocation',true),F('Handover provision',5000,'Not a quoted charge; confirm handover statement',true),F('DEWA refundable apartment deposit',2000,'Included in funding; refundable'),F('DEWA activation and micro-fees',155,'Current published activation components')];
 if(assignment)rows.splice(1,0,F('Resale brokerage - 2% plus VAT',price*.021,'Planning allowance; agreed agency terms control',true),F('Registration service-partner provision',4200,'Conservative provision; confirm correct transfer route',true));
 return rows;
}
function base(oldName,overrides){
 const o=original.projects.find(p=>p.name===oldName);
 if(!o)throw new Error('Missing original project '+oldName);
 return {
  name:o.name,developer:o.developer,category:'under',status:'Off-Plan (Under Construction)',location:o.location,
  summary:(o.overview||[])[0]||o.positioning,media:structuredClone(o.media),
  handover:o.handover,sources:[S(o.sourceLabel,o.sourceUrl)],
  scheduleBasis:'Published project framework, illustrated at the selected asking price. Exact unit terms require confirmation.',
  planNote:'The SPA and current developer statement control the instalment dates, milestones and any amounts already paid.',
  waiverNote:'No current unit-specific developer DLD waiver was verified. The full 4% is retained in the budget.',
  inventoryNote:'Current public asking-price evidence is not a reserved unit. Confirm availability, registered area and the agreed price in writing.',
  parkingNote:'Parking is shown in project or listing information. A separate one-time charge has not been verified; the budget includes an explicit provision, plus a separate handover provision.',
  feeNote:'Planning provisions may differ from actual invoices. No borrowing costs are assumed. Refundable utility deposits are included in initial funding.',
  serviceNote:'The current unit-specific annual service charge is not confirmed. Obtain the approved budget; recurring charges are separate from acquisition.',
  floorplanNote:'Project brochure layout reference, not a verified plan for the listed unit. Confirm the unit type, area and orientation before reservation.',
  ...overrides,
 };
}
const projects=[];
const golfSale=S('Property Finder / Golf Views A, 1BR, 645 sq ft','https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-emaar-south-golf-views-golf-views-a-70290683.html');
const golfRent=S('Property Finder / Golf Views A registered rent comparables','https://www.propertyfinder.ae/en/transactions/rent/dubai/dubai-south-dubai-world-central-emaar-south-golf-views-golf-views-a');
const golfSC=S('Dubizzle / matching Golf Views offer and service-charge indication','https://uae.dubizzle.com/property-for-sale/residential/apartment/2026/3/30/investor-deal-exclusive-motivated-selle-2-970909/');
projects.push(base('Emaar Golf Views',{
 name:'Emaar Golf Views A',category:'ready',status:'Ready',price:1000000,area:645,bedroom:'1BR',handover:'Completed; advertised vacant',
 summary:'A completed one-bedroom home in Emaar South, with covered parking and access to the established golf-oriented community. The selected advertisement is marked vacant.',
 fees:readyFees(1000000),schedule:[R('Full purchase price','At transfer; less any credited deposit',100,'handover')],
 scheduleBasis:'Completed resale: 100% of the agreed price is settled through the transfer process. No developer instalment plan is advertised.',
 planSource:golfSale,planNote:'Any reservation deposit is part of the price. Its amount and release conditions must be recorded in Form F; no extra deposit is added to this budget.',
 paymentFootnote:'The agreement will state any reservation deposit. It reduces the transfer balance AED-for-AED and is not added to the total; the illustrated price remains AED 1,000,000.',
 sources:[golfSale,golfSC],rentSources:[golfRent,golfSC],serviceRate:17.66,rentLow:52000,rentHigh:62000,annualOther:1140,
 inventoryNote:'PF listing 70290683; corroborating Dubizzle record updated 5 September 2026. Asking price AED 1,000,000; advertised vacant. Obtain written unit availability and title confirmation.',
}));
const magSale=S('Bayut / MAG 540 exact 2BR offer, ref AP-S-29302','https://www.bayut.com/property/details-16294534.html');
const magRent=S('Property Finder / MAG 540 registered rental comparables','https://www.propertyfinder.ae/en/transactions/rent/dubai/dubai-south-dubai-world-central-residential-district-mag-5-boulevard-mag-540');
const magSC=S('Bayut / MAG 540 service-charge reference','https://www.bayut.com/buildings/mag-540/');
projects.push(base('MAG 5 Boulevard',{
 name:'MAG 540 / MAG 5 Boulevard',category:'ready',status:'Ready',price:1100000,area:1007,bedroom:'2BR',handover:'Completed; possession date to confirm',
 summary:'A furnished two-bedroom apartment in the Residential District, with covered parking and community facilities. Its larger layout offers a family-oriented alternative within the strict budget.',
 fees:readyFees(1100000),schedule:[R('Full purchase price','At transfer, less any credited deposit',100,'handover')],
 scheduleBasis:'Completed resale. The seller agreement determines any credited deposit and the transfer-date balance.',planSource:magSale,
 planNote:'Any reservation payment reduces the final price balance. Obtain the tenancy or vacant-possession position before signing.',
 sources:[magSale,S('Dubizzle / matching MAG 540 offer, updated 7 September','https://dubai.dubizzle.com/property-for-sale/residential/apartment/2026/8/26/2-bedroom-family-community-high-rental--2-289875/'),magSC],rentSources:[magRent,magSC],serviceRate:13.65,rentLow:70000,rentHigh:75000,annualOther:1450,
 inventoryNote:'Exact advertisement: 1,007 sq ft, AED 1,100,000, permit 7127213772. The first-year budget is close to the cap; confirm every invoice and negotiate if any provision is insufficient.',
}));
const pulseSale=S('Property Finder / Pulse Plaza B8, 2BR, 1,054 sq ft','https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-the-pulse-the-pulse-residence-plaza-the-pulse-residence-plaza-b8-136991959.html');
const pulseBase='/presentations/dubai-south-investor-brief/projects/pulse-ready/';
projects.push(base('MAG 5 Boulevard',{
 name:'The Pulse Residence Plaza B8',developer:'Dubai South Properties',location:'The Pulse, Residential District, Dubai South',category:'ready',status:'Ready',price:1059999,area:1054,bedroom:'2BR',handover:'Completed; possession date to confirm',
 summary:'A two-bedroom, garden-view apartment in an operating residential community. The selected offer includes covered parking, a balcony and access to shared leisure facilities.',
 media:{hero:pulseBase+'pulse-hero.jpg',exteriors:[pulseBase+'pulse-exterior.jpg'],interiors:[pulseBase+'pulse-interior.jpg'],floorplans:[pulseBase+'pulse-2br-plan-presentation.jpg']},
 fees:readyFees(1059999),schedule:[R('Full purchase price','At transfer, less any credited deposit',100,'handover')],
 scheduleBasis:'Completed resale. Any deposit is credited toward the price; the seller agreement confirms the transfer balance.',planSource:pulseSale,
 sources:[pulseSale,S('fäm / Pulse B8-B9 service-charge reference','https://famproperties.com/service-charges-dubai/dubai-south/the-pulse-residence-plaza-b8-b9')],
 rentSources:[S('Property Finder / Pulse Plaza B8 registered rents','https://www.propertyfinder.ae/en/transactions/rent/dubai/dubai-south-dubai-world-central-the-pulse-the-pulse-residence-plaza-the-pulse-residence-plaza-b8'),S('Property Finder / current Pulse B8 asking rents','https://www.propertyfinder.ae/en/rent/dubai/properties-for-rent-dubai-south-dubai-world-central-the-pulse-the-pulse-residence-plaza-the-pulse-residence-plaza-b8.html')],
 serviceRate:15,rentLow:70000,rentHigh:78000,annualOther:1480,
 inventoryNote:'Verified PF advertisement 136991959: AED 1,059,999, 1,054 sq ft, unfurnished. The listing shows availability from 28 August 2026; vacant possession still requires written confirmation.',
}));

const premiumPath=path.join(root,'data/dubai-south-premium-research-2026-09-08.json');
const aziziSale=S('Dubizzle / Venice 15 initial-sale offer, 736 sq ft','https://dubai.dubizzle.com/property-for-sale/residential/apartment/2026/8/13/prime-location-7-discount-freehold-high-2-488701/');
const aziziPlan=S('Property Finder / Venice 15 project payment framework','https://www.propertyfinder.ae/en/new-projects/azizi-developments/azizi-venice-15');
projects.push(base('Azizi Venice',{
 name:'Azizi Venice 15',price:1107000,area:736,bedroom:'1BR',handover:'May / Q2 2027 - confirm exact building SPA',
 summary:'A one-bedroom option within the Venice master development. The current screen uses Building 15, not the older Building 14 reference, with a lower illustrated entry cost.',
 fees:offFees(1107000,{oqood:1020}),schedule:[R('Before handover','Booking split and instalment dates to confirm',50),R('Completion balance','At handover',50,'handover')],
 planSource:aziziSale,sources:[aziziSale,aziziPlan,S('Property Finder / Venice 15 transaction reference','https://www.propertyfinder.ae/en/transactions/buy/dubai/dubai-south-dubai-world-central-azizi-venice-azizi-venice-15')],
 scheduleBasis:'Current initial-sale offer shows 50/50, illustrated at AED 1,107,000. The project page publishes a standard 10/40/50 framework, so the unit reservation must resolve the promotion.',
 waiverSource:S('Dubizzle / separate Venice 15 DLD-waiver advertisement','https://dubai.dubizzle.com/property-for-sale/residential/apartment/2026/7/28/distress-deal-dld-waiver-lagoon-view-hi-2-232491/'),
 waiverNote:'A separate initial-sale broker advertisement claims a full DLD waiver. It is not a confirmed offer for this unit; the full 4% remains included until Azizi issues written terms.',
 inventoryNote:'Verified initial-sale advertisement updated 5 September 2026: AED 1,107,000 and 736 sq ft. Confirm a current Building 15 developer allocation, fees and completion date.',
 planNote:'The selected offer states 50% before handover and 50% at handover; the project page shows a standard 10% booking, 40% construction and 50% handover framework. Do not combine them. Obtain the promotional unit schedule and any amount due immediately on entry.',
 floorplanNote:'Azizi Venice project-family 1BR reference from the original brief. Not verified against the selected Building 15, 736-sq-ft offer; request the exact unit plan.',
}));
const enreSale=S('Bayut / Enre initial-sale 1BR offer','https://www.bayut.com/property/details-16196659.html');
const enreOfficial=S('Imtiaz / Enre Residence official project','https://imtiaz.ae/property/enre-residence-by-imtiaz');
projects.push(base('Enre Residence',{
 price:1199000,area:733,bedroom:'1BR',handover:'Official Q1 2028; portal Q3 2028 - SPA controls',
 summary:'A one-bedroom initial-sale comparison from Imtiaz in the Residential District. The selected discounted offer advertises 40% during construction and 60% at handover.',
 fees:offFees(1199000,{oqood:1020}),schedule:[R('During construction','Booking split and instalment dates to confirm',40),R('Completion balance','At handover',60,'handover')],
 planSource:enreSale,sources:[enreSale,enreOfficial],
 scheduleBasis:'Selected offer: 40/60 at AED 1,199,000. Imtiaz publishes 60/40; obtain written confirmation of the promotional unit schedule.',
 waiverNote:'A waiver was marketed on a different resale advertisement, not on an official Imtiaz offer for this residence. No discount is deducted from DLD.',
 inventoryNote:'Initial-sale advertisement added 17 August 2026: AED 1,199,000 and 733 sq ft. Obtain a current unit number and developer reservation form.',
 planNote:'The selected offer states 40% during construction and 60% at handover; Imtiaz publishes 20% booking plus 40% construction and 40% handover as its standard framework. Do not combine them. Obtain the promotional unit schedule and let the SPA resolve both payment and completion timing.',
 floorplanNote:'Building floorplate references only, not a one-bedroom unit plan. No official 733-sq-ft unit plan was located on the Imtiaz project page; request the exact unit plan before reservation.',
}));
const fieldsSale=S('Bayut / Golf Fields initial-sale 1BR offer','https://www.bayut.com/property/details-15426101.html');
const fieldsPlan=S('Mira / published Golf Fields instalment schedule','https://www.mira-international.com/properties/golf-fields');
projects.push(base('Golf Fields',{
 price:1270888,area:809,bedroom:'1BR',handover:'2020s construction; marketed 2030 - SPA controls',
 summary:'An Emaar South apartment comparison with golf-oriented amenities and a staged 80/20 overall commitment. The illustrated one-bedroom asking price remains subject to developer allocation.',
 fees:offFees(1270888),
 schedule:[R('Booking','At reservation',10),R('2nd instalment','October 2026',10),R('3rd instalment','June 2027',10),R('4th instalment','October 2027',10),R('20% construction','March 2028',10),R('40% construction','September 2028',10),R('60% construction','February 2029',10),R('80% construction','July 2029',10),R('Completion balance','September 2030; confirm SPA',20,'handover')],
 planSource:fieldsPlan,sources:[fieldsSale,S('Emaar / Golf Fields official project','https://www.emaar.com/en/properties/golf-fields-at-emaar-south'),fieldsPlan],
 scheduleBasis:'Published 10/70/20 schedule, illustrated at AED 1,270,888. Dates are a project reference, not an issued unit payment notice.',
 planNote:'Broker schedule indicates September 2030 while a current listing shows Q1 2030. Confirm the actual dates and milestones in the Emaar reservation and SPA.',
 inventoryNote:'Current initial-sale listing: AED 1,270,888 for approximately 809 sq ft. This is broker-marketed evidence, not an Emaar reservation confirmation.',
}));
projects.at(-1).handover='2030 - published quarters differ; confirm SPA';
const trailsSale=S('Property Finder / Golf Trails initial-sale 1BR offer','https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-emaar-south-golf-trails-137443645.html');
projects.push(base('Golf Trails',{
 price:1278888,area:755,bedroom:'1BR',handover:'Q4 2030 - confirm SPA',
 summary:'A conditional one-bedroom Emaar South comparison. Broker-marketed pricing fits the budget model, but it must be reconciled with Emaar current inventory before selection.',
 fees:offFees(1278888),schedule:[R('Booking','Illustrative split; reservation controls',10),R('Construction instalments','Subtotal; unit dates to confirm',70),R('Completion balance','Q4 2030; confirm SPA',20,'handover')],
 planSource:trailsSale,sources:[trailsSale,source.emaarSouth,S('Emaar / Golf Trails official project','https://www.emaar.com/en/properties/golf-trails-at-emaar-south')],
 scheduleBasis:'Marketed 80/20 framework; 10% booking and 70% construction shown as an illustration until the unit schedule is issued.',
 inventoryNote:'The current broker 1BR asks AED 1,278,888; Emaar live community stock starts at AED 1,819,888. This lower-priced unit is conditional on a current Emaar reservation.',
 planNote:'Do not infer reservable one-bedroom stock from a historical launch price. Confirm the exact Emaar unit and each instalment before relying on this schedule.',
}));
const alturaSale=S('Property Finder / Altura 2 initial-sale 2BR offer','https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-waada-by-bahria-town-altura-2-90908883.html');
const alturaProject=S('Property Finder / Altura 2 project and construction record','https://www.propertyfinder.ae/en/new-projects/bt-holdings/altura-2');
projects.push(base('Waada Altura',{
 name:'Altura 2 at Waada',price:1415000,area:1251.74,bedroom:'2BR',handover:'March 2029 project record - confirm SPA',
 summary:'A larger two-bedroom comparison within the Waada master development. Its illustrated area and entry price offer a space-led alternative to the one-bedroom options.',
 fees:offFees(1415000,{oqood:1020}),schedule:[R('Booking','At reservation',10),R('Construction instalments','Subtotal; unit dates to confirm',60),R('Final balance - provision','At handover in conservative model',30,'handover')],
 planSource:alturaProject,sources:[alturaSale,alturaProject,S('BT Properties / Waada construction announcement','https://btproperties.ae/bt-properties-breaks-ground-on-phase-1-of-waada-in-dubai-south/')],
 scheduleBasis:'Published 10/60/30 structure. The full final 30% is provisionally funded at handover; any later schedule needs written confirmation.',
 planNote:'BT marketing describes post-handover payments, while the portal places the final 30% at handover. No later funding benefit is assumed without the SPA schedule.',
 floorplanNote:'Waada / Altura design-family reference from the original brief; not an exact Altura 2, 1,251.74-sq-ft unit plan.',
}));
const avenewPlan=S('AVENEW / official dated 888 payment schedule','https://avenewdevelopment.ae/landing/avenew-888');
const avenewFeeSource=S('AVENEW / official MODO phase payment-plan document','https://avenewdevelopment.ae/assets/landing-pages/avenew-888/avenew888-modo_payment-plan.pdf');
const avenewMedia=structuredClone(original.projects.find(p=>p.name==='AVENEW 888').media);
avenewMedia.floorplans=[
 '/presentations/dubai-south-investor-brief/projects/avenew-888/floorplan-1-unit-crop-20260908.webp',
 '/presentations/dubai-south-investor-brief/projects/avenew-888/floorplan-2-unit-crop-20260908.webp',
];
projects.push(base('AVENEW 888',{
 media:avenewMedia,
 price:1600000,area:710,bedroom:'1BR',handover:'Q1 2028 - confirm live schedule',
 summary:'A design-led one-bedroom comparison at the upper edge of the core budget. The dated developer schedule requires a refreshed allocation of any already-due instalments.',
 fees:offFees(1600000,{admin:3500,adminKnown:true,adminLabel:'Booking administration fee',oqood:1020}),schedule:[R('Booking','At reservation',10),R('2nd instalment','1 Sep 2026 - already elapsed',10),R('3rd instalment','1 Mar 2027',5),R('4th instalment','1 Jun 2027',10),R('5th instalment','1 Sep 2027',5),R('6th instalment','1 Dec 2027',10),R('Completion balance','Q1 2028',50,'handover')],
 planSource:avenewPlan,sources:[avenewPlan,avenewFeeSource,S('Property Finder / current AVENEW developer-unit record','https://www.propertyfinder.ae/en/new-projects/avenew-properties/avenew-888'),S('AVENEW / official project overview','https://avenewdevelopment.ae/projects/avenew-888')],
 scheduleBasis:'Official dated 50/50 schedule, illustrated at AED 1.6M. The 1 September 2026 milestone has passed and may be payable on entry.',
 paymentFootnote:'The 10% booking instalment is credited toward the property price and is not added twice. The separately itemised AED 3,500 booking administration fee is a published additional charge; confirm its applicability to the selected unit and obtain the developer invoice.',
 planNote:'A second developer page describes 60/40. Obtain a current reservation schedule and resolve the inconsistency before proceeding. The dated 50/50 plan is used transparently here.',
 inventoryNote:'Developer-unit record: 1BR from AED 1.6M and 710 sq ft. Limited budget headroom makes a complete current fee quotation essential.',
}));
for(const [name,price,area,url] of [
 ['Windsor House',1200000,781,'https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-dubai-south-dubai-world-central-residential-district-windsor-house-windsor-house-building-1-132951599.html'],
 ['Windsor House II',1425000,781,'https://www.bayut.com/for-sale/property/dubai/dubai-south/residential-district/windsor-house-ii/'],
]){
 const sale=S(name+' / current resale asking-price evidence',url);
 projects.push(base(name,{
  price,area,bedroom:'1BR',status:'Off-Plan (Under Construction) / Resale',handover:'Q3 2029 used conservatively; SPA to confirm',
  summary:'An Ellington design-led comparison available through the resale market. The developer release is sold out; the incoming buyer obligation depends on the original price and seller ledger.',
  fees:offFees(price,{assignment:true,admin:5250,adminKnown:true,oqood:1020}),schedule:[R('Total purchase consideration','Timing unallocated - seller ledger needed',100,'unallocated')],
  scheduleBasis:'Resale / assignment: timing is unallocated. The original developer percentages must not be applied to the resale asking price.',
  planSource:sale,sources:[sale,source.ellington,S('Ellington / '+name+' official project','https://ellingtonproperties.ae/en/property-for-sale/'+(name==='Windsor House'?'windsor-house':'windsor-house-ii')+'-dubai-south')],
  planNote:'Obtain original SPA price, seller equity paid, premium or discount, remaining developer balance and NOC. These establish the amount due at transfer and all future instalments.',
  paymentFootnote:'The 100% row reconciles the consideration only; it is not a claim that the full price is due today. The seller statement must split transfer-day payment and future developer instalments.',
  inventoryNote:'Conditional resale comparison. Public asking price and area are shown, but exact unit availability, paid-to-date amount and seller ledger are not independently confirmed.',
 }));
}

const archive=[
 ['South Square S1','The developer release is sold out. A current secondary-market ask of AED 1.1M / 760 sq ft is a research lead only; obtain the seller payment ledger and all transfer terms.','https://www.dubaisouth.ae/en/newsroom/dubai-south-concludes-a-strong-2025-attracts-653-new-companies'],
 ['South Living','The original project context and media are retained for reference. The release is sold out and close to completion, so it is not part of the main under-construction shortlist.','https://www.dubaisouth.ae/en/newsroom/dubai-south-sells-out-south-living-project-confirms-huge-demand-for-spacious-units-in-the-area'],
 ['Divine Elements','A marketed AED 1.275M / 933 sq ft offer conflicts with sold-out developer inventory. Obtain a direct allocation and a matching floorplan before including it in the priced shortlist.','https://www.propertyfinder.ae/en/new-projects/takmeel-real-estate-development/divine-elements'],
 ['Expo Valley Views','The original Expo City project context and gallery are retained. A current unit-specific price and complete fee schedule were not established; the earlier starting price is not reused as live availability.','https://www.expocitydubai.com/en/live/expo-valley-views/'],
].map(([name,note,url])=>({...base(name,{}),note,archiveSource:S(name+' / current status reference',url),category:name==='Expo Valley Views'?'above':'under'}));

for(const v of [
 {name:'Terra Gardens',price:1642888,area:760,unit:'EX Terra Gardens Building 1-2-207',handover:'31 October 2029',instalment:164289,final:328576,dates:['8 Sep 2026','20 Oct 2026','20 Feb 2027','20 Jun 2027','20 Oct 2027','20 Feb 2028','20 Jun 2028','20 Oct 2028'],floorplanId:'a0ZNM00000186Q62AI'},
 {name:'Terra Woods',price:1704888,area:765,unit:'EX Terra Woods Building 1-4-415',handover:'31 March 2030',instalment:170489,final:340976,dates:['8 Sep 2026','20 Oct 2026','20 Feb 2027','20 Jun 2027','20 Oct 2027','24 Feb 2028 / 50% construction','9 Aug 2028 / 70% construction','8 Mar 2029 / 90% construction'],floorplanId:'a0ZNM000003nZtk2AE'},
]){
 const unitSource=S('Emaar / available unit '+v.unit,'https://www.emaar.com/en/unit-details/'+encodeURIComponent(v.unit));
 const plan= v.dates.map((date,i)=>R((i+1)+' - Instalment',date,10,'before',v.instalment));
 plan.push(R('Completion / handover',v.handover,20,'handover',v.final));
 const p=base('Terra Woods',{
  name:v.name,developer:'Emaar Properties',category:'above',status:'Off-Plan (Under Construction)',price:v.price,area:v.area,bedroom:'1BR',location:'Expo Living / Expo City, Dubai South',handover:v.handover,
  summary:'An available Emaar one-bedroom residence at Expo Living. The comparison uses a specific unit record, its published floorplan and a dated developer payment schedule.',
  fees:offFees(v.price),schedule:plan,planSource:unitSource,sources:[unitSource,source.expoLiving,S('Emaar / exact unit floorplan','https://emaarsales.my.salesforce-sites.com/api/FloorPlanToSiteUsers?id='+v.floorplanId)],
  scheduleBasis:'Current Emaar unit payment record, including developer rounding. Unit: '+v.unit+'.',
  paymentFootnote:'The AED 37,000 booking deposit is credited toward the first instalment, not added again. The remaining first-instalment amount is AED '+(v.instalment-37000).toLocaleString('en-US')+'. Confirm this credit on the booking form.',
  planNote:'All eight pre-handover instalments and the final 20% are shown from the current Emaar record. The booking date and any later changes must be confirmed on reservation.',
  inventoryNote:'Emaar showed this exact unit as available on 8 September 2026: '+v.unit+'. It is not held or reserved for Mr. Arul and can be allocated at any time.',
  floorplanNote:'Official floorplan linked to the exact Emaar unit record: '+v.unit+'. Verify the executed SPA attachment and final registered area.',
  waiverNote:v.name==='Terra Gardens'?'A broker markets a 2% waiver on another Terra Gardens offer. This exact Emaar unit still displays full 4% DLD; no waiver is deducted.':'This exact Emaar unit displays the full 4% land-registration charge. No unit-specific official waiver was located.',
 });
 p.fees[0].basis='Exact Emaar unit charge: 4% land registration';p.fees[1]=F('Emaar Oqood plus micro-fee provision',3020,'AED 3,000 published + AED 20 provisional');
 p.officialUnit=v.unit;
 projects.push(p);
}
for(const project of projects.filter(project=>project.category!=='ready'&&!project.status.includes('/ Resale'))){
 project.feeNote+=' No buyer-side brokerage is assumed for this initial-sale option; confirm the agency terms in writing.';
}
const reports=[
 {id:'ready',filename:'Ready_Up_to_AED_1_2M',label:'Ready properties',budgetLabel:'Up to AED 1.2 million, including fees',intro:'Completed homes selected around a strict total budget, with rental evidence, annual ownership costs and a transparent comparison.',recommendations:[
 {title:'Emaar Golf Views A - the primary Emaar option',body:'The completed community, vacant listing and lower overall commitment provide room within the budget. Its one-bedroom format offers a focused entry into Emaar South.'},
 {title:'The Pulse Plaza B8 - a two-bedroom alternative',body:'The illustrated total leaves more budget flexibility than MAG 540, while the larger layout and operating amenities support a broader household use case.'},
 {title:'MAG 540 - prioritise space and budget discipline',body:'The furnished two-bedroom offering merits consideration, provided the final price and every fee keep the first-year commitment within AED 1.2 million.'},
 ]},
 {id:'under',filename:'Offplan_Below_AED_1_7M',label:'Off-Plan (Under Construction)',budgetLabel:'Below AED 1.7 million, including fees',intro:'Under-construction homes screened for a total acquisition budget below AED 1.7 million, with payment obligations and fee treatment shown separately.',recommendations:[
 {title:'Emaar Golf Fields - prioritise the master community',body:'The Emaar South setting, golf-oriented amenities and staged payment structure support its inclusion. Confirm the exact residence and current developer offer.'},
 {title:'Ellington Windsor House - consider design and specification',body:'Ellington provides a design-led alternative in the Residential District. Any resale selection should follow a full reconciliation of the seller payment ledger and total transfer obligation.'},
 {title:'Golf Trails - consider only a confirmed within-budget unit',body:'Current one-bedroom broker evidence fits the modelled cap, while Emaar live inventory starts higher. Proceed only if Emaar confirms the exact price, unit and payment schedule.'},
 ]},
 {id:'above',filename:'Offplan_AED_1_7M_to_1_85M',label:'Off-Plan (Under Construction)',budgetLabel:'AED 1.7-1.85 million, including fees',intro:'A measured budget extension for Expo Living opportunities, supported by current Emaar unit records and complete payment schedules.',recommendations:[
 {title:'Terra Woods - the priority premium comparison',body:'The selected Emaar unit has a published price, floorplan and dated 80/20 schedule. Expo Living provides a distinct proposition around the established Expo City destination.'},
 {title:'Terra Gardens - the lower total commitment',body:'The selected available unit offers an earlier published handover and a lower all-in planning total. It should be compared directly with Terra Woods on layout and payment timing.'},
 {title:'Extend the budget for a clear preference',body:'The additional commitment should be justified by the preferred residence, developer terms and location. Airport and Expo development support the long-term location case, not a promised appreciation rate.'},
 ]},
];
export {root,original,projects,reports,source,S,F,R,base,offFees,premiumPath};

if(process.argv[1]===path.join(root,'scripts/assemble-dubai-south-review.mjs')){
 if(!fs.existsSync(premiumPath))throw new Error('Premium media evidence record is required before export');
 const premium=JSON.parse(fs.readFileSync(premiumPath,'utf8'));
 const records=Array.isArray(premium)?premium:premium.projects||premium.units;
 for(const p of projects.filter(p=>p.category==='above')){
  const rec=records.find(r=>(r.name||r.project).startsWith(p.name));
  if(!rec?.media)throw new Error('Missing authenticated media for '+p.name);
  if(Array.isArray(rec.media)){
   const get=role=>rec.media.filter(m=>m.role===role).map(m=>m.publicPath);
   p.media={hero:get('hero')[0]||p.media.hero,exteriors:get('exterior').length?get('exterior'):p.media.exteriors,interiors:get('interior'),floorplans:get('exact-unit-floorplan-presentation')};
   if(p.name==='Terra Woods')p.media.interiors=['/projects/terra-woods/interior-official-20260908.jpg'];
  }else p.media=rec.media;
  if(rec.sources)p.sources.push(...rec.sources);
 }
 const data={title:'Dubai South',clientName:'Mr. Arul',clientLocation:'Singapore',preparedAt:'2026-09-08',coverImage:original.coverImage,advisor:{name:'Jumanah',email:'jumanah@psrhomes.ae',phone:'+971 58 680 1148',avatarUrl:original.advisor.avatarUrl},reports,projects,archive,sources:source,distances:original.areaDemandResearch.projectDistances};
 const out=path.join(root,'data/dubai-south-investor-review-2026-09-08.json');
 fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({out,projects:projects.length,reports:reports.length,archive:archive.length}));
}
