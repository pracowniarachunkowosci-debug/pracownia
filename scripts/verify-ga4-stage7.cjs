const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {QA_ID,PARAMS,mapEvent,validateCollect,oneShot,CSP,WRAPPER_CSP,start,STAGE7_CLOSED}=require('./qa-ga4-stage7.cjs');
const event={event:'web3forms_success',form_id:'leadForm',inquiry_source:'zewnetrzny-dzial-finansowy'};
const cid='111111111.1111111111',sid='1111111111'; // Fictional fixture identifiers, never real user data.
function payload(){return new URLSearchParams({v:'2',tid:QA_ID,en:'generate_lead',cid,sid,gcs:'G101',gcd:'13p1r1p1p1',npa:'1',_dbg:'1',...Object.fromEntries(Object.entries(PARAMS).map(([k,v])=>['ep.'+k,v]))});}
test('tag14 local equivalent: exact four parameters, consent required',()=>{
  assert.deepEqual(mapEvent(event,'granted'),{name:'generate_lead',params:PARAMS});
  for(const consent of ['denied',undefined,'all'])assert.equal(mapEvent(event,consent),null);
  for(const bad of [{...event,event:'form_submit'},{...event,inquiry_source:'strona-glowna'},{...event,email:'qa@example.invalid'}])assert.equal(mapEvent(bad,'granted'),null);
});
test('collector permits only fixed QA event + four params and strips device metadata',()=>{
  const q=payload();q.set('uafvl','SYNTHETIC');q.set('dl','https://untrusted.invalid/?email=fixture');
  const out=new URLSearchParams(validateCollect('/g/collect',q.toString(),cid,sid));
  assert.equal(out.get('tid'),QA_ID);assert.equal(out.get('dl'),'https://qa-pr19.invalid/');assert.equal(out.has('uafvl'),false);
  assert.equal([...out.keys()].filter(k=>k.startsWith('ep.')).length,4);
});
for(const [name,key,value] of [['production','tid','G-H210DZ34Y8'],['Ads','tid','AW-17646661298'],['other event','en','page_view'],['denied analytics','gcs','G100'],['ad granted','gcs','G111'],['no debug','_dbg','0'],['PII','ep.email','qa@example.invalid'],['UPD','user_data','fixture'],['User-ID','uid','fixture'],['advertising click','gclid','fixture'],['wrong pair','ep.inquiry_source','wrong'],['foreign client','cid','other']])test('reject '+name,()=>{const q=payload();q.set(key,value);assert.throws(()=>validateCollect('/g/collect',q.toString(),cid,sid));});
test('deny alternate hosts/routes, batch bodies and duplicates',()=>{
  for(const url of ['https://www.google-analytics.com/g/collect','/ccm/form-data','/pagead/form-data','/submit','/g/collect?tid=G-H210DZ34Y8'])assert.throws(()=>validateCollect(url,payload().toString(),cid,sid));
  for(const body of [payload()+'\n'+payload(),payload()+'&tid='+QA_ID])assert.throws(()=>validateCollect('/g/collect',body,cid,sid));
});
test('durable fuse allows one send, survives a failure and restart',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pr19-fuse-'));const file=path.join(dir,'ledger.json');let count=0;
  const send=oneShot(file,async()=>{assert.ok(fs.existsSync(file));count++;throw Error('ambiguous fixture timeout');});
  await assert.rejects(send('fixture'));await assert.rejects(send('fixture'));
  await assert.rejects(oneShot(file,async()=>{count++;})('fixture'));assert.equal(count,1);
  fs.rmSync(file);fs.rmdirSync(dir);
});
test('CSP blocks third parties, workers, forms, frames and image fallback',()=>{
  for(const rule of ["default-src 'none'","img-src 'none'","frame-src 'none'","worker-src 'none'","form-action 'none'"])assert.ok(CSP.includes(rule));
  assert.ok(WRAPPER_CSP.includes('frame-src http://127.0.0.1:8770'));
  assert.equal(CSP.includes('https:'),false);
});
test('completed stage cannot be armed again, even with a fresh state directory',()=>{
  assert.equal(STAGE7_CLOSED,true);
  assert.throws(()=>start({arm:true,stateDir:'unused'}),/No retry authorized/);
});
