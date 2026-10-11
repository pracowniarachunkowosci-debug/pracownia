import json, re, subprocess, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
base='0bc0dec2f70753f2093fca645092de1910c32395'
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.refs=[];self.ids=[];self.canonical=[];self.metas={};self.schemas=[];self.json_text=None;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag in ['a','link','script','img','source']:
   value=a.get('href') or a.get('src')
   if value:self.refs.append(value)
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if tag=='meta':
   key=a.get('name') or a.get('property');self.metas[key]=a.get('content')
   if key in ('og:image','twitter:image') and a.get('content'):self.refs.append(a['content'])
  if tag=='script' and a.get('type')=='application/ld+json':self.json_text=''
 def handle_data(self,data):
  if self.json_text is not None:self.json_text+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.json_text is not None:
   try:self.schemas.append(json.loads(self.json_text))
   except ValueError:self.schemas.append({'ERROR':'invalid JSON'})
   self.json_text=None
files=list(root.glob('*.html'))+list((root/'blog').rglob('*.html'))+list((root/'autor').rglob('*.html'))
docs={p.relative_to(root).as_posix():Document(p.read_text(encoding='utf-8-sig')) for p in files}
def broken(name,doc):
 problems=[]
 for ref in doc.refs:
  u=urlsplit(ref)
  if u.scheme and u.scheme not in ('https','http'):continue
  if u.netloc and u.netloc!='pracowniarachunkowosci.pl':continue
  target=(root/unquote(u.path.lstrip('/'))) if (u.path.startswith('/') or u.netloc) else (root/name).parent/unquote(u.path)
  if not u.path:target=root/name
  if target.is_dir():target=target/'index.html'
  if not target.exists():problems.append({'ref':ref,'reason':'missing file'});continue
  if u.fragment and target.suffix=='.html':
   key=target.relative_to(root).as_posix();d=docs.get(key)
   if d and unquote(u.fragment) not in d.ids:problems.append({'ref':ref,'reason':'missing fragment'})
 return problems
report={'baseline':base,'scope':{},'sitewideExistingIssues':{},'newBrokenLinks':[]}
scope=['index.html','oferta.html','zewnetrzny-dzial-finansowy.html','raporty-zarzadcze-controlling.html','analizy-finansowe-raportowanie.html','ksiegowosc-spolka-z-oo.html']
for name,d in docs.items():
 problems=broken(name,d)
 try:old=Document(subprocess.check_output(['git','show',base+':'+name],cwd=root,stderr=subprocess.DEVNULL).decode('utf-8-sig'));oldproblems=broken(name,old)
 except subprocess.CalledProcessError:old=None;oldproblems=[]
 introduced=[p for p in problems if p not in oldproblems]
 report['newBrokenLinks'] += [{'page':name,**p} for p in introduced]
 if problems:report['sitewideExistingIssues'][name]=problems
 if name in scope:
  text=(root/name).read_text(encoding='utf-8-sig')
  entry={'brokenLinks':problems,'canonical':d.canonical,'title':re.findall(r'<title>(.*?)</title>',text,re.S),'h1Count':len(re.findall(r'<h1\b',text)),'duplicateIds':sorted({i for i in d.ids if d.ids.count(i)>1}),'jsonValid':all('ERROR' not in s for s in d.schemas),'schemaBlocks':len(d.schemas),'description':d.metas.get('description')}
  assert len(entry['canonical'])==1 and entry['h1Count']==1 and entry['jsonValid'] and not entry['duplicateIds']
  assert len(entry['title'])==1 and entry['description']
  expected='https://pracowniarachunkowosci.pl/'+('' if name=='index.html' else name)
  assert entry['canonical'][0]==expected
  assert d.metas.get('og:url')==expected
  assert 'noindex' not in d.metas.get('robots','')
  if old:
   oldtext=subprocess.check_output(['git','show',base+':'+name],cwd=root).decode('utf-8-sig')
   for pattern in [r'<title>.*?</title>',r'<h1\b[^>]*>.*?</h1>',r'<link rel="canonical"[^>]*>']:
    assert re.findall(pattern,text,re.S)==re.findall(pattern,oldtext,re.S),name+' changed protected SEO'
  report['scope'][name]=entry
assert not report['newBrokenLinks'], report['newBrokenLinks']
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap=ET.fromstring((root/'sitemap.xml').read_bytes());urls=[e.find('s:loc',ns).text for e in sitemap]
assert len(urls)==len(set(urls))
assert urls.count('https://pracowniarachunkowosci.pl/zewnetrzny-dzial-finansowy.html')==1
for u in urls:
 target=root/urlsplit(u).path.lstrip('/')
 if target.is_dir():target=target/'index.html'
 assert target.exists(),u
report['sitemap']={'urls':len(urls),'allTargetsExist':True,'duplicates':0}
report['htmlFilesAudited']=len(docs)
report['sitewideInvalidJsonLd']=[name for name,d in docs.items() if any('ERROR' in schema for schema in d.schemas)]
llms_urls=re.findall(r'\]\((https://pracowniarachunkowosci.pl/[^)]*)\)',(root/'llms.txt').read_text(encoding='utf-8-sig'))
for u in llms_urls:
 target=root/urlsplit(u).path.lstrip('/')
 if target.is_dir():target=target/'index.html'
 assert target.exists(),u
report['llms']={'linksChecked':len(llms_urls),'allTargetsExist':True}
old_sitemap=ET.fromstring(subprocess.check_output(['git','show',base+':sitemap.xml'],cwd=root))
old_dates={e.find('s:loc',ns).text:e.find('s:lastmod',ns).text for e in old_sitemap}
changed_dates=[]
for e in sitemap:
 url=e.find('s:loc',ns).text;date=e.find('s:lastmod',ns).text
 if old_dates.get(url)!=date:changed_dates.append(url)
allowed=['https://pracowniarachunkowosci.pl/'+name for name in ['', 'oferta.html','raporty-zarzadcze-controlling.html','analizy-finansowe-raportowanie.html','zewnetrzny-dzial-finansowy.html']]
assert set(changed_dates)==set(allowed)
report['sitemap']['changedLastmodOnlyEditedPages']=True
output=root/'docs/zewnetrzny-dzial-finansowy/seo-audit.json';output.write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps({'pages':len(docs),'introducedBrokenLinks':len(report['newBrokenLinks']),'existingBrokenLinks':sum(len(v) for v in report['sitewideExistingIssues'].values()),'scope':{n:d['brokenLinks'] for n,d in report['scope'].items()},'sitemap':report['sitemap']},ensure_ascii=False))
