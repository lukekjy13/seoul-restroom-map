import json,re,math,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]
public=json.loads((root/'data/seoul-public-original.json').read_text())['DATA']
metro=json.loads((root/'data/metro-original.json').read_text())
def clean(s):return ' · '.join(t.strip() for t in str(s or '').split('|') if t.strip())
def phone(s):return re.sub(r'\D','',s)
def name(s):return re.sub(r'역$','',re.sub(r'\([^)]*\)|\d+호선|공중화장실|화장실|공중|\s','',s))
def dist(a,b):
 r=math.pi/180;v=math.sin((a['lat']-b['lat'])*r/2)**2+math.cos(a['lat']*r)*math.cos(b['lat']*r)*math.sin((a['lng']-b['lng'])*r/2)**2
 return 12742000*math.asin(min(1,math.sqrt(v)))
out=[];seen={};audit=[]
for r in public:
 try:lat=float(r['coord_y']);lng=float(r['coord_x'])
 except (TypeError,ValueError):continue
 if not(37.4<lat<37.72 and 126.7<lng<127.2):continue
 p=dict(id='seoul-'+str(r['objectid']),name=clean(r['conts_name']),line='',category='subway' if '지하철' in r['value_08'] else 'public',address=clean(r['addr_new']) or clean(r['addr_old']),lat=lat,lng=lng,gate='',exit='',detail='',phone=clean(r['tel_no']),hours=clean(r['value_02']) or '개방시간 미기재',baby=True if '기저귀' in r['value_06'] else None,child=None,accessible=True if clean(r['value_05']) else None,date='',retrieved='2026-09-06',source='seoul',sourceIds=[str(r['objectid'])],facility=clean(r['value_08']) or '공중화장실',access=clean(r['value_01']) or '개방 유형 미기재',amenities=clean(r['value_06']))
 # Only exact, same-name/address/coordinate duplicates; floor-specific names stay separate.
 key=(p['name'],p['address'],p['lat'],p['lng'],p['hours'])
 if key in seen:
  target=seen[key];target['sourceIds']+=p['sourceIds'];target['baby']=target['baby'] or p['baby'];target['accessible']=target['accessible'] or p['accessible'];audit.append({'type':'exact_duplicate','id':p['id'],'target':target['id']});continue
 seen[key]=p;out.append(p)
for m in metro:
 m=dict(m,id='metro-'+m['id'],category='subway',accessible=True,retrieved='2026-09-06',source='metro',sourceIds=[m['id']],facility='지하철',access='공공개방',amenities='')
 # Preserve ambiguity, distinct floors and separate rail operators. Require same station,
 # non-generic phone and proximity, with only one candidate on both sides.
 candidates=[p for p in out if p['source']=='seoul' and p['category']=='subway' and name(p['name'])==name(m['name']) and len(phone(m['phone']))>=9 and phone(m['phone'])==phone(p['phone']) and dist(m,p)<100]
 candidate=candidates[0] if len(candidates)==1 else None
 if candidate:
  competing=[x for x in metro if name(x['name'])==name(m['name']) and phone(x['phone'])==phone(m['phone']) and dist(x,candidate)<100]
  if len(competing)!=1:candidate=None
 if candidate:
  m['source']='merged';m['sourceIds']+=candidate['sourceIds'];m['access']=candidate['access'];m['amenities']=candidate['amenities'];m['publicHours']=candidate['hours'];m['publicName']=candidate['name'];out.remove(candidate)
  audit.append({'type':'metro_enrichment','metro':m['id'],'public':candidate['id'],'distanceMeters':round(dist(m,candidate)), 'name':m['name']})
 out.append(m)
(root/'app/toilets.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
meta={'publicRows':len(public),'metroRows':len(metro),'count':len(out),'categories':dict(collections.Counter(p['category'] for p in out)),'merged':sum(x['type']=='metro_enrichment' for x in audit),'exactDuplicates':sum(x['type']=='exact_duplicate' for x in audit),'retrieved':'2026-09-06'}
(root/'data/merge-audit.json').write_text(json.dumps({'summary':meta,'matches':audit},ensure_ascii=False,indent=2))
print(json.dumps(meta,ensure_ascii=False))
