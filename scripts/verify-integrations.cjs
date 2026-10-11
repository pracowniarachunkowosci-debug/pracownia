const fs=require('fs'), path=require('path'), assert=require('assert/strict'), vm=require('vm');
const {execFileSync}=require('child_process');
const {HtmlValidate}=require('html-validate');
const root=path.resolve(__dirname,'..');
const base=process.env.ZDF_BASE_REF||'0bc0dec2f70753f2093fca645092de1910c32395';
const out=process.env.ZDF_QA_OUTPUT||path.join(root,'docs/zewnetrzny-dzial-finansowy');
const read=name=>fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const original=name=>execFileSync('git',['show',base+':'+name],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
const report={date:new Date().toISOString(),html:[],checks:[],javascriptBlocks:0};
function counts(result){const all={};for(const r of result.results)for(const m of r.messages)all[m.ruleId]=(all[m.ruleId]||0)+1;return all;}
(async()=>{
 try {
  const validator=new HtmlValidate({extends:['html-validate:standard'],rules:{'void-style':'off'}});
  for(const name of ['index.html','oferta.html','raporty-zarzadcze-controlling.html','analizy-finansowe-raportowanie.html','thank-you.html','zewnetrzny-dzial-finansowy.html']){
   const text=read(name);
   const after=counts(await validator.validateString(text));
   const before=name==='zewnetrzny-dzial-finansowy.html'?{}:counts(await validator.validateString(original(name)));
   for(const [rule,count] of Object.entries(after))assert(count<=(before[rule]||0),`New HTML issue ${name}: ${rule}`);
   report.html.push({page:name,baseline:before,current:after,introduced:0});
   for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
    if(m[1].includes('ld+json')){JSON.parse(m[2]);continue;}
    if(m[2].trim()){new vm.Script(m[2],{filename:name});report.javascriptBlocks++;}
   }
  }
  for(const name of ['assets/js/contact-form.js','assets/js/zewnetrzny-dzial-finansowy.js'])new vm.Script(read(name),{filename:name});
  report.checks.push('No new standard HTML issues against main; all inline and changed external JS parse');
  const growth=/<script\s+async\s+src="https:\/\/growthos[^\"]+"[\s\S]*?<\/script>/;
  for(const name of ['index.html','raporty-zarzadcze-controlling.html']){
   assert(read(name).match(growth),'Missing GrowthOS script');
   assert.equal(read(name).match(growth)[0],original(name).match(growth)[0]);
   const headScripts=t=>[...t.split('</head>')[0].matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('ld+json')).map(m=>m[0]);
   assert.deepEqual(headScripts(read(name)),headScripts(original(name)),name+' changed analytics bootstrap');
  }
  assert.equal(read('zewnetrzny-dzial-finansowy.html').match(growth)[0],original('raporty-zarzadcze-controlling.html').match(growth)[0]);
  report.checks.push('GTM/GA4/Consent Mode bootstrap and GrowthOS endpoint/options unchanged; landing uses existing GrowthOS configuration');
  const landing=read('zewnetrzny-dzial-finansowy.html');
  const contact=[...landing.matchAll(/<a[^>]*js-track-contact[^>]*href="([^"]+)"/g)];
  assert.equal(contact.length,3);assert(contact.every(m=>m[1]==='/?service=zewnetrzny-dzial-finansowy#kontakt'));
  const calendly=[...landing.matchAll(/href="(https:\/\/calendly[^\"]+)"/g)];
  assert(calendly.length>=2);assert(calendly.every(m=>m[1]==='https://calendly.com/pracowniarachunkowosci/30min'));
  assert(!landing.includes('utm_'));assert(read('llms.txt').includes('https://pracowniarachunkowosci.pl/zewnetrzny-dzial-finansowy.html'));
  assert(!landing.includes('Zmiana w trakcie roku jest możliwa'));
  const graph=JSON.parse(landing.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.deepEqual(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),['https://pracowniarachunkowosci.pl/','https://pracowniarachunkowosci.pl/oferta.html','https://pracowniarachunkowosci.pl/zewnetrzny-dzial-finansowy.html']);
  report.checks.push('All three contact CTAs retain source; Calendly address unchanged; llms and breadcrumb hierarchy match landing');
  const thanks=read('thank-you.html');assert(thanks.includes('noindex,follow'));assert(!/gtag|fbq|facebook|<script/.test(thanks));
  report.checks.push('Thank-you direct/reload path has no conversion code, tracking pixel or indexing');
 }catch(error){report.failure=error.message;console.error(error);process.exitCode=1;}
 finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'technical-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})();
