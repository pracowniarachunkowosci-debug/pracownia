// Read only provider exports; no network. Ignore only export time and generated
// containerVersion fingerprint, never object fingerprints or tag configuration.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [beforeFile,afterFile,outFile]=process.argv.slice(2);
assert(beforeFile&&afterFile&&outFile,'Usage: node scripts/verify-ga4-stage7-workspace.cjs before.json after.json report.json');
const before=JSON.parse(fs.readFileSync(beforeFile)),after=JSON.parse(fs.readFileSync(afterFile));
const strip=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='fingerprint'));
const a=strip(before.containerVersion),b=strip(after.containerVersion);
assert.deepEqual(a,b,'Workspace configuration changed');
assert.equal(b.container.publicId,'GTM-WC88L2GJ');
const tag=id=>b.tag.find(t=>t.tagId===id),p=(t,k)=>t.parameter.find(v=>v.key===k)?.value;
assert.equal(p(tag('14'),'eventName'),'generate_lead');
assert(JSON.stringify(tag('14')).includes('G-H210DZ34Y8'));
assert(!JSON.stringify(b).includes('G-CRJHZ0T8X9'));
assert.equal(tag('9').paused,true);
assert(!JSON.stringify(tag('5').parameter).includes('user_data'));
assert.deepEqual(tag('14').firingTriggerId,['13']);
assert.deepEqual(tag('5').firingTriggerId,['13']);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const report={status:'PASS',workspace:6,container:'GTM-WC88L2GJ',beforeExportTime:before.exportTime,afterExportTime:after.exportTime,rawSha256:{before:hash(fs.readFileSync(beforeFile)),after:hash(fs.readFileSync(afterFile))},normalizedSha256:hash(JSON.stringify(a)),ignoredMetadata:['exportTime','containerVersion.fingerprint'],configurationDeepEqual:true,objectFingerprintsCompared:true,productionMeasurementIdPreserved:true,qaMeasurementIdAbsent:true,updTagPaused:true,adsUserDataAbsent:true,successTriggerPreserved:true,tags:b.tag.length,triggers:b.trigger.length,customVariables:b.variable.length,builtinVariables:b.builtInVariable.length,published:false};
fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
