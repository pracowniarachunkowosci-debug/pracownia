// Review checks for issue #18; optional QA dependencies only (see docs).
const {chromium} = require('playwright');
const {default:AxeBuilder} = require('@axe-core/playwright');
const fs = require('fs');
const assert = require('assert/strict');
const path = require('path');
const {execFileSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const out = process.env.ZDF_QA_OUTPUT || fs.mkdtempSync(path.join(require('os').tmpdir(), 'zdf-qa-'));
fs.mkdirSync(out, {recursive:true});
const origin = process.env.ZDF_QA_URL || 'http://127.0.0.1:8765';
const baseline = process.env.ZDF_BASE_REF || '0bc0dec2f70753f2093fca645092de1910c32395';
const landing='/zewnetrzny-dzial-finansowy.html';
const report={date:new Date().toISOString(),viewports:[],checks:[],violations:[],errors:[],externalRequests:[],notes:['Third-party requests stubbed in functional tests; no live lead or reservation is sent.']};
function pass(text){report.checks.push(text);console.log('PASS '+text)}
(async()=>{
 const browser=await chromium.launch({channel:process.env.ZDF_BROWSER || 'chrome',headless:true});
 try {
 const {HtmlValidate}=require('html-validate');
 const htmlResult=await new HtmlValidate({extends:['html-validate:standard'],rules:{'void-style':'off'}}).validateFile(path.join(root,landing.slice(1)));
 assert(htmlResult.valid,JSON.stringify(htmlResult.results));
 pass('HTML validation: zero errors');
 const ctx=await browser.newContext();
 await ctx.route('**/*',route=>{
   const url=route.request().url();
   if(url.startsWith(origin)) return route.continue();
   report.externalRequests.push(url.split('?')[0]);
   return route.fulfill({status:200,contentType:'application/javascript',body:''});
 });
 await ctx.addInitScript(()=>{
   window.__cls=0;
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 });
 const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [320,390,768,900,1024,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+landing,{waitUntil:'networkidle'});
   if(await page.locator('#cookie-banner').isVisible())await page.locator('#acceptEssential').click();
   const dims=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,cls:window.__cls}));
   assert(dims.scroll<=width,`Overflow ${width}: ${dims.scroll}`);
   assert(dims.cls < 0.01, `Unexpected layout shift at ${width}: ${dims.cls}`);
   assert.equal(await page.locator('h1').innerText(),'Zewnętrzny dział finansowy dla rozwijających się firm');
   if(width<=900){
     await page.locator('.burger').click();
     assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'true');
     await page.keyboard.press('Escape');
     assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');
     assert(await page.locator('.burger').evaluate(el=>el===document.activeElement));
     await page.locator('.burger').click();
     await page.locator('#mainMenu a[href="#faq"]').click();
     assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');
   }
   await page.locator('details summary').first().click();
   assert(await page.locator('details').first().getAttribute('open')!==null);
   await page.locator('details summary').first().click();
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   if([320,390,1440].includes(width)) await page.screenshot({path:path.join(out,`landing-${width}.png`),fullPage:true});
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   report.violations.push(...axe.violations.map(v=>({width,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
   report.viewports.push(dims);
 }
 pass('Six viewport widths: no overflow; mobile menu/Escape/focus and FAQ work');
 // Check all local links/assets and fragments on the new page, including breadcrumbs and packages.
 await page.goto(origin+landing);
 const links=await page.locator('[href], [src]').evaluateAll(els=>els.map(e=>e.href||e.src).filter(Boolean));
 let localCount=0;
 const resourceCache=new Map();
 for(const value of new Set(links)){
   const u=new URL(value,origin);
   if(u.origin!==origin)continue;
   if(!resourceCache.has(u.pathname)){
     const response=await fetch(u.origin+u.pathname);
     assert.equal(response.status,200,`Broken resource ${u.pathname}`);
     resourceCache.set(u.pathname,await response.text());
   }
   if(u.hash){
     const body=resourceCache.get(u.pathname);
     const id=decodeURIComponent(u.hash.slice(1));
     assert(body.includes(`id="${id}"`),`Missing ${u.pathname}#${id}`);
   }
   localCount++;
 }
 pass(`${localCount} unique internal links/assets/fragments return 200 and resolve`);
 const json=await page.locator('script[type="application/ld+json"]').textContent();
 const graph=JSON.parse(json)['@graph'];
 assert.deepEqual(graph.map(g=>g['@type']),['Service','BreadcrumbList','FAQPage']);
 const visibleFaq=await page.locator('details').evaluateAll(els=>els.map(e=>({q:e.querySelector('summary').textContent,a:e.querySelector('p').textContent})));
 assert.deepEqual(graph[2].mainEntity.map(q=>({q:q.name,a:q.acceptedAnswer.text})),visibleFaq);
 pass('Service/BreadcrumbList/FAQ JSON-LD parses; all seven FAQ answers match visible content exactly');
 // Consent denied before GTM/GA4; accept essential, accept all, revisit, reset.
 await page.evaluate(()=>localStorage.clear());await page.reload();
 let dl=await page.evaluate(()=>dataLayer.map(x=>Array.from(x)));
 assert.equal(dl[0][0],'consent');assert.equal(dl[0][1],'default');
 for(const key of ['ad_storage','analytics_storage','ad_user_data','ad_personalization'])assert.equal(dl[0][2][key],'denied');
 assert(await page.locator('#cookie-banner').isVisible());
 assert.equal(await page.locator('script[src*="fbevents"]').count(),0);
 const cookieAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 report.violations.push(...cookieAxe.violations.map(v=>({state:'cookie-banner',id:v.id,nodes:v.nodes.map(n=>n.target)})));
 await page.locator('#acceptEssential').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('cookieConsent')),'essential');
 assert.equal(await page.locator('script[src*="fbevents"]').count(),0);
 await page.reload();assert(!(await page.locator('#cookie-banner').isVisible()));
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#acceptAll').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('cookieConsent')),'all');
 dl=await page.evaluate(()=>dataLayer.map(x=>Array.from(x)));
 assert(dl.some(x=>x[0]==='consent'&&x[1]==='update'&&x[2].analytics_storage==='granted'));
 assert.equal(await page.locator('script[src*="fbevents"]').count(),1);
 await page.reload();assert.equal(await page.locator('script[src*="fbevents"]').count(),1);
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>resetCookieConsent())]);
 assert(await page.locator('#cookie-banner').isVisible());
 await page.locator('#acceptEssential').click();
 pass('Consent v2: denied defaults, both choices, persistence, reset and Meta load only after consent');
 // Capture CTA dataLayer before following genuine links.
 await page.evaluate(()=>{document.querySelectorAll('.js-track-contact,.js-track-calendly').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));});
 for(const selector of ['.hero .js-track-contact','.hero .js-track-calendly','.contact-panel .js-track-contact','.contact-panel .js-track-calendly'])await page.locator(selector).click();
 const events=await page.evaluate(()=>dataLayer.map(x=>Array.from(x)).filter(x=>x[0]==='event'));
 assert.equal(events.filter(x=>x[1]==='click_contact').length,2);
 assert.equal(events.filter(x=>x[1]==='click_calendly').length,2);
 assert.deepEqual(events.map(x=>x[2].cta_location),['hero','hero','final','final']);
 assert(!events.some(x=>x[1]==='generate_lead'));
 pass('Hero/final CTAs emit one correctly labelled click each; navigation is not counted as a submitted lead');
 await page.goto(origin+landing);await page.locator('.hero .js-track-contact').click();
 await page.waitForURL(origin+'/#kontakt', {waitUntil:'domcontentloaded'});
 assert(await page.locator('#leadForm').isVisible());
 assert.equal(await page.locator('#leadForm').getAttribute('action'),'https://api.web3forms.com/submit');
 assert.equal(await page.locator('#leadForm').evaluate(f=>f.checkValidity()),false);
 pass('Primary CTA reaches the existing required-field Web3Forms form');
 // Homepage and offer preserve metadata, scripts, form and all packages byte for byte.
 for(const filename of ['index.html','oferta.html']){
   const before=execFileSync('git',['show',`${baseline}:${filename}`],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
   const after=fs.readFileSync(path.join(root,filename),'utf8').replace(/\r\n/g,'\n');
   const withoutAddition=after.replace(/    <section class="(?:hp-)?section (?:hp-)?section--dark" id="zewnetrzny-dzial-finansowy"[\s\S]*?<\/section>\n\n/,'');
   assert.equal(withoutAddition,before,`${filename} changed outside new section`);
   for(const width of [390,1440]){
     await page.setViewportSize({width,height:900});await page.goto(origin+'/'+filename,{waitUntil:'networkidle'});
     await page.locator('#zewnetrzny-dzial-finansowy').scrollIntoViewIfNeeded();
     await page.locator('#zewnetrzny-dzial-finansowy').screenshot({path:path.join(out,`${filename}-${width}.png`)});
     assert.equal(await page.locator('#zewnetrzny-dzial-finansowy a').getAttribute('href'),landing);
     await page.locator('#zewnetrzny-dzial-finansowy a').click();await page.waitForURL(origin+landing);
   }
 }
 pass('Homepage/offer additions work at mobile/desktop; all pre-existing bytes (including prices, scripts and form) preserved');
 await ctx.close();
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await noJS.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,body:''}));
 const fallback=await noJS.newPage();await fallback.goto(origin+landing);
 assert(await fallback.locator('#mainMenu a[href="/oferta.html"]').isVisible());
 await fallback.locator('summary').first().click();assert(await fallback.locator('details').first().getAttribute('open')!==null);
 await Promise.all([fallback.waitForURL(origin+'/#kontakt', {waitUntil:'domcontentloaded'}), fallback.locator('.hero .js-track-contact').click()]);
 pass('With JavaScript disabled: navigation, FAQ and contact link remain usable');
 await noJS.close();
 const deniedStorage=await browser.newContext();
 await deniedStorage.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,body:''}));
 await deniedStorage.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable');}});});
 const privatePage=await deniedStorage.newPage();await privatePage.goto(origin+landing);
 await privatePage.locator('#acceptEssential').click();assert(!(await privatePage.locator('#cookie-banner').isVisible()));
 pass('Unavailable localStorage does not break consent controls');
 await deniedStorage.close();
 console.log('Violations: '+report.violations.length);console.log('Errors: '+report.errors.length);
 assert.equal(report.violations.length,0,'Accessibility violations; see browser-report.json');
 assert.equal(report.errors.length,0,'Browser errors');
 } catch(e){report.failure=e.message;console.error(e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log('Report: '+path.join(out,'browser-report.json'));await browser.close();}
})();
