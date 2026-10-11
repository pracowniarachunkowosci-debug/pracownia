// Offline review of UI-exported containers. Does not call GTM, GA4, Ads or Web3Forms.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const [baselineFile, draftFile] = process.argv.slice(2);
assert(baselineFile && draftFile, 'Usage: node scripts/verify-gtm-workspace.cjs baseline.json workspace.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const baseline = read(baselineFile).containerVersion;
const draft = read(draftFile).containerVersion;
const param = (object, key) => object.parameter?.find(p => p.key === key);
const byId = (list, key, id) => list.find(x => x[key] === id);
const checks = [];
const check = (label, fn) => { fn(); checks.push(label); };
const event = draft.tag.find(t => t.name === 'GA4 - generate_lead - API success');
const ads = byId(draft.tag, 'tagId', '5');
const trigger = draft.trigger.find(t => t.name === 'CE - web3forms_success - leadForm');
const consent = tag => tag.consentSettings.consentType.list.map(x => x.value).sort();
check('Only the intended objects added or modified; legacy tags and UPD untouched', () => {
  assert.equal(draft.container.publicId, 'GTM-WC88L2GJ');
  assert.equal(draft.tag.length, baseline.tag.length + 1);
  assert.equal(draft.trigger.length, baseline.trigger.length + 1);
  assert.equal(draft.variable.length, baseline.variable.length + 2);
  for (const id of ['4','7','9']) assert.deepEqual(byId(draft.tag,'tagId',id),byId(baseline.tag,'tagId',id));
  for (const id of ['3','6']) assert.deepEqual(byId(draft.trigger,'triggerId',id),byId(baseline.trigger,'triggerId',id));
  assert.deepEqual(byId(draft.variable,'variableId','8'),byId(baseline.variable,'variableId','8'));
  assert.deepEqual(draft.builtInVariable,baseline.builtInVariable);
});
check('Both DLVs use version 2 and exact keys without defaults', () => {
  for (const key of ['form_id','inquiry_source']) {
    const v = draft.variable.find(v => v.name === 'DLV - '+key);
    assert.equal(v.type,'v');
    assert.equal(param(v,'name').value,key);
    assert.equal(param(v,'dataLayerVersion').value,'2');
    assert.equal(param(v,'setDefaultValue').value,'false');
  }
});
check('Strict custom event and allowlist filters, with no additional triggers', () => {
  assert.equal(trigger.type,'CUSTOM_EVENT');
  assert.equal(trigger.customEventFilter.length,1);
  assert.equal(trigger.customEventFilter[0].type,'EQUALS');
  assert.equal(param(trigger.customEventFilter[0],'arg0').value,'{{_event}}');
  assert.equal(param(trigger.customEventFilter[0],'arg1').value,'web3forms_success');
  assert.deepEqual(trigger.filter.map(f => [f.type,param(f,'arg0').value,param(f,'arg1').value]),[
    ['EQUALS','{{DLV - form_id}}','leadForm'],
    ['MATCH_REGEX','{{DLV - inquiry_source}}','^(zewnetrzny-dzial-finansowy|strona-glowna)$']
  ]);
  for (const tag of [event,ads]) {
    assert.deepEqual(tag.firingTriggerId,[trigger.triggerId]);
    assert.equal(tag.tagFiringOption,'ONCE_PER_EVENT');
    assert(!tag.setupTag?.length && !tag.teardownTag?.length && !tag.blockingTriggerId?.length);
    assert.equal(tag.consentSettings.consentStatus,'NEEDED');
  }
});
check('GA4 has exactly four approved parameters, correct property, event and consent', () => {
  assert.equal(event.type,'gaawe');
  assert.equal(param(event,'eventName').value,'generate_lead');
  assert.equal(param(event,'measurementIdOverride').value,'G-H210DZ34Y8');
  assert.equal(draft.tag.filter(t => param(t,'eventName')?.value === 'generate_lead').length,1);
  assert.deepEqual(param(event,'eventSettingsTable').list.map(row => Object.fromEntries(row.map.map(x => [x.key,x.value]))),[
    {parameter:'event_category',parameterValue:'lead'},
    {parameter:'event_label',parameterValue:'home_form'},
    {parameter:'form_id',parameterValue:'{{DLV - form_id}}'},
    {parameter:'inquiry_source',parameterValue:'{{DLV - inquiry_source}}'}
  ]);
  assert.deepEqual(consent(event),['analytics_storage']);
  assert(!/user_data|debug_mode|email|phone/.test(JSON.stringify(event)));
});
check('Ads ID, label, valuation and UPD mapping unchanged; only trigger/firing/consent changed', () => {
  const old = byId(baseline.tag,'tagId','5');
  assert.deepEqual(ads.parameter,old.parameter);
  assert.deepEqual(consent(ads),['ad_personalization','ad_storage','ad_user_data']);
  const strip = obj => Object.fromEntries(Object.entries(obj).filter(([k]) => !['fingerprint','firingTriggerId','tagFiringOption','consentSettings'].includes(k)));
  assert.deepEqual(strip(ads),strip(old));
});
const report = {
  date:new Date().toISOString(), status:'PASS', checks,
  method:'Static validation of UI-exported JSON, not a live measurement test',
  sha256:{baseline:crypto.createHash('sha256').update(fs.readFileSync(baselineFile)).digest('hex'),workspace:crypto.createHash('sha256').update(fs.readFileSync(draftFile)).digest('hex')},
  workspaceId:'6', container:'GTM-WC88L2GJ',
  objects:{trigger,ga4:event,ads,variables:draft.variable.filter(v=>v.variableId!=='8')},
  unchanged:{tags:['4','7','9'],triggers:['3','6'],variables:['8']},
  unresolved:['Legacy forms do not emit web3forms_success','UPD tag9 and tag5 user_data remain configured','Ads account audit is separate: see ads-review.json','No collector receipt verified']
};
const out = path.resolve(process.env.ZDF_QA_OUTPUT || path.join(__dirname,'../docs/zewnetrzny-dzial-finansowy/stage4'));
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'workspace-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks,sha256:report.sha256},null,2));
