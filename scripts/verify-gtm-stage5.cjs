// Offline validation of exports downloaded through GTM UI. No provider requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const [beforeFile,afterFile]=process.argv.slice(2);
assert(beforeFile&&afterFile,'Pass stage-5 before and after UI exports');
const before=JSON.parse(fs.readFileSync(beforeFile)).containerVersion, after=JSON.parse(fs.readFileSync(afterFile)).containerVersion;
const p=(o,k)=>o.parameter?.find(x=>x.key===k);
const by=(c,type,id)=>c[type].find(x=>x[type+'Id']===id);
const without=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
const checks=[],check=(name,fn)=>{fn();checks.push(name);};
const trigger=by(after,'trigger','13'),ga4=by(after,'tag','14'),ads=by(after,'tag','5'),upd=by(after,'tag','9'),pair=by(after,'variable','16');
const pairs={'zewnetrzny-dzial-finansowy':'leadForm','strona-glowna':'leadForm','ksiegowosc-ecommerce':'ecommerceForm','ksiegowosc-spolka-z-oo':'spolkaForm'};
check('Same container; one native pair template added; unrelated objects unchanged',()=>{
 assert.equal(after.container.publicId,'GTM-WC88L2GJ');
 assert.equal(after.tag.length,before.tag.length);assert.equal(after.trigger.length,before.trigger.length);assert.equal(after.variable.length,before.variable.length+1);
 for(const id of ['4','7'])assert.deepEqual(by(after,'tag',id),by(before,'tag',id));
 for(const id of ['3','6'])assert.deepEqual(by(after,'trigger',id),by(before,'trigger',id));
 for(const id of ['8','11','12'])assert.deepEqual(by(after,'variable',id),by(before,'variable',id));
 assert.deepEqual(after.builtInVariable,before.builtInVariable);
});
check('Pair template and exact regex accept four pairs and deny unknown/mixed values',()=>{
 assert.equal(pair.type,'c');assert.equal(p(pair,'value').value,'{{DLV - form_id}}|{{DLV - inquiry_source}}');
 assert.equal(trigger.type,'CUSTOM_EVENT');assert.deepEqual(trigger.customEventFilter.map(f=>[f.type,p(f,'arg0').value,p(f,'arg1').value]),[['EQUALS','{{_event}}','web3forms_success']]);
 const pattern='^(leadForm\\|(strona-glowna|zewnetrzny-dzial-finansowy)|ecommerceForm\\|ksiegowosc-ecommerce|spolkaForm\\|ksiegowosc-spolka-z-oo)$';
 assert.deepEqual(trigger.filter.map(f=>[f.type,p(f,'arg0').value,p(f,'arg1').value]),[['MATCH_REGEX','{{Template - form pair}}',pattern]]);
 const accepts=(id,source)=>new RegExp(pattern).test(id+'|'+source);
 for(const [source,id] of Object.entries(pairs))assert(accepts(id,source));
 for(const source of [...Object.keys(pairs),'unknown','estonski-cit-spolka-z-oo',''])for(const id of ['leadForm','ecommerceForm','spolkaForm','otherForm','__invalid__',''])assert.equal(accepts(id,source),Object.hasOwn(pairs,source)&&pairs[source]===id);
});
check('GA4 and Ads share only success trigger, once per event and explicit consent',()=>{
 for(const tag of [ga4,ads]){assert.deepEqual(tag.firingTriggerId,['13']);assert.equal(tag.tagFiringOption,'ONCE_PER_EVENT');assert.equal(tag.consentSettings.consentStatus,'NEEDED');assert(!tag.setupTag?.length&&!tag.teardownTag?.length&&!tag.blockingTriggerId?.length);}
 const consent=t=>t.consentSettings.consentType.list.map(x=>x.value).sort();
 assert.deepEqual(consent(ga4),['analytics_storage']);assert.deepEqual(consent(ads),['ad_personalization','ad_storage','ad_user_data']);
 assert.equal(p(ga4,'measurementIdOverride').value,'G-H210DZ34Y8');assert.equal(p(ga4,'eventName').value,'generate_lead');
 assert.equal(after.tag.filter(t=>p(t,'eventName')?.value==='generate_lead').length,1);
 assert.deepEqual(p(ga4,'eventSettingsTable').list.map(r=>Object.fromEntries(r.map.map(x=>[x.key,x.value]))),[
 {parameter:'event_category',parameterValue:'lead'},{parameter:'event_label',parameterValue:'{{DLV - form_id}}'},
 {parameter:'form_id',parameterValue:'{{DLV - form_id}}'},{parameter:'inquiry_source',parameterValue:'{{DLV - inquiry_source}}'}]);
 assert(!/user_data|email|phone|debug_mode/.test(JSON.stringify(ga4)));
});
check('Variant A: UPD paused, Ads user_data removed, attribution and value unchanged',()=>{
 assert.equal(upd.paused,true);assert.deepEqual(without(upd,['paused','fingerprint']),without(by(before,'tag','9'),['paused','fingerprint']));
 assert(!JSON.stringify(ads.parameter).includes('user_data'));assert(!JSON.stringify(ads.parameter).includes('Dane przekazywane'));
 const stripParams=t=>t.parameter.filter(p=>p.key!=='eventSettingsTable');
 assert.deepEqual(stripParams(ads),stripParams(by(before,'tag','5')));
 assert.deepEqual(without(ads,['parameter','fingerprint']),without(by(before,'tag','5'),['parameter','fingerprint']));
});
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={date:new Date().toISOString(),status:'PASS',method:'Offline comparison of UI exports; no collector confirmation',checks,sha256:{before:sha(beforeFile),after:sha(afterFile)},container:'GTM-WC88L2GJ',workspaceId:'6',pairs,objects:{trigger,ga4,ads,upd,pair},unchanged:{tags:['4','7'],triggers:['3','6'],variables:['8','11','12']},unresolved:['Global Google tag automatic UPD remains enabled outside workspace; approval needed to disable','Active Ads goals unchanged','No live collector or delivery verification']};
const out=path.resolve(__dirname,'../docs/zewnetrzny-dzial-finansowy/stage5/workspace-review.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks,sha256:report.sha256},null,2));
