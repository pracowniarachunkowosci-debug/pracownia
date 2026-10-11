const { chromium }=require('playwright');
const fs=require('fs'),path=require('path');
const origin=process.env.ZDF_QA_URL||'http://127.0.0.1:8765';
const out=process.env.ZDF_QA_OUTPUT||path.resolve(__dirname,'../docs/zewnetrzny-dzial-finansowy');
(async()=>{const b=await chromium.launch({channel:process.env.ZDF_BROWSER||'chrome',headless:true});const report={date:new Date().toISOString(),type:'local laboratory sample; not field Core Web Vitals',conditions:{cpuSlowdown:4,latencyMs:150,downloadBytesPerSecond:200000,uploadBytesPerSecond:93750,externalScripts:'stubbed',consent:'essential',runsPerWidth:1},samples:[]};
try{for(const width of [390,1440]){
 const ctx=await b.newContext({viewport:{width,height:900}});
 await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,body:''}));
 await ctx.addInitScript(()=>{localStorage.setItem('cookieConsent','essential');window.__perf={lcpMs:0,cls:0,longTasks:[],events:[]};new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.lcpMs=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__perf.cls+=e.value;})).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.longTasks.push(e.duration))).observe({type:'longtask',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.interactionId)window.__perf.events.push({name:e.name,duration:e.duration});})).observe({type:'event',buffered:true,durationThreshold:16});});
 const p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.goto(origin+'/zewnetrzny-dzial-finansowy.html',{waitUntil:'networkidle'});await p.waitForTimeout(1000);
 if(width===390){await p.locator('.burger').click();await p.keyboard.press('Escape');}
 await p.locator('summary').first().focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.waitForTimeout(300);
 const metrics=await p.evaluate(()=>window.__perf);
 report.samples.push({width,...metrics,maxObservedInteractionMs:metrics.events.length?Math.max(...metrics.events.map(e=>e.duration)):null,interactionNote:'Duration of scripted menu/FAQ interactions; NOT field INP. Null means no event >=16 ms was reported.'});await ctx.close();
}}finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'performance-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
