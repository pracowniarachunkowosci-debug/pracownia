// Local-only GTM Preview. Configuration scripts may load; all collectors and forms are blocked.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com/gtm.js https://www.googletagmanager.com/gtag/js https://www.googletagmanager.com/gtag/destination https://www.googletagmanager.com/debug/; connect-src 'self'; img-src 'self' data:; frame-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'none'; object-src 'none'; base-uri 'self'";
const fixture = `(() => {
  const query = new URLSearchParams(location.search);
  const consent = query.get('qa_consent') || 'all';
  localStorage.setItem('cookieConsent', consent);
  const q = { consent, scenario: query.get('qa_case') || 'success', mockedRequests:0, events:[], blocked:[], observedScriptRequests:[] };
  window.fbq = function() {};
  const nativeTimer = window.setTimeout;
  window.setTimeout = function(fn, ms, ...args) {
    return nativeTimer(fn, ms === 30000 ? 1200 : ms, ...args);
  };
  window.fetch = (url, options) => {
    if (url !== 'https://api.web3forms.com/submit') {
      q.blocked.push({directive:'fixture-fetch',url:safeUrl(url)}); render();
      return Promise.reject(new Error('QA blocks external fetch'));
    }
    q.mockedRequests++;
    render();
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('QA timeout', 'AbortError')), {once:true});
      if (q.scenario === 'timeout') return;
      nativeTimer(() => resolve(new Response(JSON.stringify({success:q.scenario !== 'error'}), {status:q.scenario === 'error' ? 500 : 200})), 350);
    });
  };
  const safeUrl = value => { try { const u=new URL(value); return u.origin+u.pathname; } catch { return String(value).slice(0,100); } };
  document.addEventListener('securitypolicyviolation', e => { q.blocked.push({directive:e.effectiveDirective,url:safeUrl(e.blockedURI)}); render(); });
  new PerformanceObserver(list => {
    for (const r of list.getEntries()) if (r.initiatorType === 'script') q.observedScriptRequests.push(safeUrl(r.name));
    render();
  }).observe({type:'resource',buffered:true});
  window.dataLayer = [];
  const originalPush = window.dataLayer.push;
  window.dataLayer.push = function(...items) {
    for (const e of items) if (e && typeof e.event === 'string' && !e.event.startsWith('gtm.')) q.events.push({event:e.event,form_id:e.form_id,inquiry_source:e.inquiry_source});
    const result=originalPush.apply(this,items); render(); return result;
  };
  function render() { const out=document.getElementById('gtm-qa-result'); if(out)out.textContent=JSON.stringify(q,null,2); }
  document.addEventListener('DOMContentLoaded', () => {
    const panel=document.createElement('aside');
    panel.style.cssText='position:relative;z-index:10001;background:#fff3bd;color:#14283d;padding:20px;font:14px system-ui';
    panel.innerHTML='<h2>GTM Preview QA — collectors blocked by CSP</h2><p>Only local mocks; no Web3Forms request. Synthetic form and event tests.</p><button id="gtm-qa-run" type="button">Run isolated scenario</button> <a href="/?qa_consent=all&qa_case=success&service=zewnetrzny-dzial-finansowy">ZDF success</a> <a href="/?qa_consent=all&qa_case=success">Home success</a> <a href="/?qa_consent=essential&qa_case=success">Essential</a> <a href="/?qa_consent=all&qa_case=error">API error</a> <a href="/?qa_consent=all&qa_case=timeout">Timeout</a> <a href="/?qa_consent=essential&qa_case=synthetic">Denied synthetic event</a> <a href="/?qa_consent=all&qa_case=negative">Invalid identifiers + old submit</a><pre id="gtm-qa-result" style="max-height:340px;overflow:auto;white-space:pre-wrap"></pre>';
    document.body.prepend(panel); render();
    document.getElementById('gtm-qa-run').onclick=function(){
      this.disabled=true;
      if(q.scenario==='synthetic') {
        dataLayer.push({event:'web3forms_success',form_id:'leadForm',inquiry_source:'strona-glowna'});
      } else if(q.scenario==='negative') {
        dataLayer.push({event:'web3forms_success',form_id:'otherForm',inquiry_source:'strona-glowna'});
        dataLayer.push({event:'web3forms_success',form_id:'leadForm',inquiry_source:'unknown'});
        dataLayer.push({event:'form_submit',form_id:'leadForm',inquiry_source:'strona-glowna'});
      } else {
        for(const [id,value] of Object.entries({name:'TEST OFFLINE',company:'Fixture',email:'qa@example.invalid',phone:'000000000',message:'Local API mock only.'}))document.getElementById(id).value=value;
        document.querySelector('[name="consent"]').checked=true;
        const form=document.getElementById('leadForm');
        form.requestSubmit(); form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        nativeTimer(()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));render();},800);
      }
      render();
    };
    // Opt-in test navigation for popup windows whose native input cannot be controlled.
    // This is local fixture behaviour, never injected into a production document.
    if(query.get('qa_autorun')==='1')nativeTimer(()=>document.getElementById('gtm-qa-run').click(),4000);
  });
})();`;
http.createServer((req,res)=>{
  res.setHeader('Content-Security-Policy',csp);
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://127.0.0.1:8769');
  if(url.pathname==='/__gtm__/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'}).end(fixture);return;}
  let filename;
  try{filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));}catch{res.writeHead(400).end();return;}
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(filename===root)filename=path.join(root,'index.html');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
  if(!types[path.extname(filename)]||path.relative(root,filename).split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    if(path.basename(filename)==='index.html')data=Buffer.from(data.toString('utf8').replace('<head>','<head><script src="/__gtm__/fixture.js"></script>'));
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]+'; charset=utf-8'}).end(data);
  });
}).listen(8769,'127.0.0.1',()=>console.log('GTM Preview with collectors blocked: http://127.0.0.1:8769/'));
