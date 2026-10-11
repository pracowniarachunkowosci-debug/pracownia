// Local QA only. Never load this in the website. Default mode has no network egress.
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ORIGIN = 'http://127.0.0.1:8770';
const QA_ID = 'G-CRJHZ0T8X9';
// The owner-approved stage-7 attempt was consumed on 2026-10-11. This committed
// archive cannot be armed, even with a different state directory. Do not remove
// this guard without a new explicit owner approval and a reviewed test plan.
const STAGE7_CLOSED = true;
const PARAMS = Object.freeze({event_category:'lead',event_label:'leadForm',form_id:'leadForm',inquiry_source:'zewnetrzny-dzial-finansowy'});
const CSP = "default-src 'none'; script-src http://127.0.0.1:8770; connect-src http://127.0.0.1:8770; img-src 'none'; frame-src 'none'; worker-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; object-src 'none'";
const WRAPPER_CSP = "default-src 'none'; frame-src http://127.0.0.1:8770; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; object-src 'none'";
function mapEvent(e, consent) {
  if (consent !== 'granted' || e.event !== 'web3forms_success' || e.form_id !== PARAMS.form_id || e.inquiry_source !== PARAMS.inquiry_source) return null;
  if (Object.keys(e).sort().join(',') !== 'event,form_id,inquiry_source') return null;
  return {name:'generate_lead',params:{...PARAMS}};
}
// Reject ambiguity (duplicates/batches), foreign destination, PII/UPD and other events.
// The outbound allowlist reconstructs only fixed QA values and native consent/debug flags.
function validateCollect(rawUrl, body, clientId, sessionId) {
  if (body.includes('\n') || body.includes('\r')) throw Error('batch');
  const u = new URL(rawUrl, ORIGIN);
  if (u.origin !== ORIGIN || u.pathname !== '/g/collect') throw Error('route');
  const q = new URLSearchParams(u.search);
  for (const [k,v] of new URLSearchParams(body)) { if(q.has(k)) throw Error('duplicate'); q.append(k,v); }
  for (const k of q.keys()) {
    if(q.getAll(k).length !== 1) throw Error('duplicate');
    if(/user|email|phone|address|gclid|gbraid|wbraid|^em$|^uid$|^up\.|^upn\./i.test(k)) throw Error('personal-data-key');
    if((k.startsWith('ep.') || k.startsWith('epn.')) && !['ep.event_category','ep.event_label','ep.form_id','ep.inquiry_source','ep.debug_mode','epn.debug_mode'].includes(k)) throw Error('extra-event-param');
  }
  if(q.get('v')!=='2' || q.get('tid')!==QA_ID || q.get('en')!=='generate_lead') throw Error('destination-or-event');
  if(q.get('cid')!==clientId || q.get('sid')!==sessionId) throw Error('non-synthetic-id');
  if(q.get('gcs')!=='G101' || q.get('npa')!=='1') throw Error('consent');
  if(q.get('_dbg')!=='1' && q.get('ep.debug_mode')!=='true' && q.get('epn.debug_mode')!=='1') throw Error('debug');
  for(const [k,v] of Object.entries(PARAMS)) if(q.get('ep.'+k)!==v) throw Error('param-'+k);
  const out = new URLSearchParams({v:'2',tid:QA_ID,en:'generate_lead',cid:clientId,sid:sessionId,sct:'1',seg:'1',gcs:'G101',npa:'1',_dbg:'1',dl:'https://qa-pr19.invalid/',dt:'PR19 isolated QA',ul:'pl',sr:'800x600'});
  if(q.has('gcd')) { if(!/^[a-z0-9]{1,30}$/.test(q.get('gcd'))) throw Error('consent-format'); out.set('gcd',q.get('gcd')); }
  for(const [k,v] of Object.entries(PARAMS)) out.set('ep.'+k,v);
  return out.toString();
}
function oneShot(ledger, send) {
  return async payload => {
    // Exclusive creation is durable and happens BEFORE the first network operation.
    const fd=fs.openSync(ledger,'wx');
    fs.writeFileSync(fd,JSON.stringify({attemptConsumed:true,at:new Date().toISOString(),measurementId:QA_ID,event:'generate_lead'}));
    fs.fsyncSync(fd); fs.closeSync(fd);
    return send(payload); // No retry, including timeout / ambiguous response.
  };
}
function upstream(payload) {
  return new Promise((resolve,reject)=>{
    const req=https.request({hostname:'www.google-analytics.com',path:'/g/collect',method:'POST',headers:{'Content-Type':'text/plain','Content-Length':Buffer.byteLength(payload)},timeout:10000},res=>{
      res.resume(); res.on('end',()=>resolve({httpStatus:res.statusCode,redirectFollowed:false}));
    });
    req.on('timeout',()=>req.destroy(Error('timeout-no-retry'))); req.on('error',reject); req.end(payload);
  });
}
function start({arm=false,stateDir,library}) {
  if(arm && STAGE7_CLOSED) throw Error('Stage 7 closed: the single approved attempt is consumed. No retry authorized.');
  fs.mkdirSync(stateDir,{recursive:true});
  const ledger=path.join(stateDir,'attempt-consumed.json');
  if(arm && (fs.existsSync(ledger)||fs.existsSync(path.join(stateDir,'synthetic-consumed.json')))) throw Error('Attempt already consumed; a new run requires separate owner approval.');
  const clientId=crypto.randomInt(100000000,999999999)+'.'+Math.floor(Date.now()/1000);
  const sessionId=String(Math.floor(Date.now()/1000));
  const report={mode:arm?'armed':'offline',measurementId:QA_ID,syntheticEvents:0,upstreamAttempts:0,blocked:0,preflight:false,collector:null};
  const save=()=>fs.writeFileSync(path.join(stateDir,'network-result.json'),JSON.stringify(report,null,2)+'\n');
  const send=oneShot(ledger,async payload=>{report.upstreamAttempts++; save(); return upstream(payload);});
  let browserAuthorized=false, eventConsumed=false;
  const browserScript=`
  const S={blocked:[],preflight:false,syntheticEvents:0,consent:'denied'};
  const out=document.getElementById('result'); const render=()=>out.textContent=JSON.stringify(S,null,2);
  document.addEventListener('securitypolicyviolation',e=>{S.blocked.push(e.effectiveDirective); render();});
  window.dataLayer=[]; window.gtag=function(){dataLayer.push(arguments)};
  const mapEvent=${mapEvent.toString()}; const PARAMS=${JSON.stringify(PARAMS)};
  document.getElementById('preflight').onclick=async function(){
    this.disabled=true;
    const trap='http://127.0.0.1:8771/trap';
    fetch(trap).catch(()=>{});
    try{const x=new XMLHttpRequest();x.open('POST',trap);x.send('fixture');}catch{}
    try{navigator.sendBeacon(trap,'fixture');}catch{}
    const image=new Image();image.src=trap;
    const frame=document.createElement('iframe');frame.src=trap;document.body.append(frame);
    const form=document.createElement('form');form.method='POST';form.action=trap;document.body.append(form);form.submit();
    try{top.location.href=trap;}catch{S.topNavigationBlocked=true;}
    S.popupsBlocked=window.open(trap,'_blank')===null;
    setTimeout(async()=>{
      const types=S.blocked;
      const local=await (await fetch('/preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connect:types.filter(x=>x==='connect-src').length>=3,img:types.includes('img-src'),frame:types.includes('frame-src'),top:S.topNavigationBlocked===true,popup:S.popupsBlocked})})).json();
      S.preflight=local.pass;render(); document.getElementById('send').disabled=!S.preflight || !document.getElementById('consent').checked;
    },800);
  };
  document.getElementById('consent').onchange=function(){S.consent=this.checked?'granted':'denied';document.getElementById('send').disabled=!S.preflight||!this.checked;render();};
  document.getElementById('send').onclick=async function(){
    this.disabled=true;document.getElementById('consent').disabled=true;
    if(!S.preflight||S.consent!=='granted')return;
    const permit=await (await fetch('/consume',{method:'POST'})).json();
    if(!permit.allowed){S.stopped=permit.reason;render();return;}
    gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('set','allow_google_signals',false);gtag('set','allow_ad_personalization_signals',false);
    gtag('js',new Date());
    gtag('config','${QA_ID}',{send_page_view:false,server_container_url:'${ORIGIN}',allow_google_signals:false,allow_ad_personalization_signals:false,client_id:'${clientId}',session_id:${sessionId},page_location:'https://qa-pr19.invalid/',page_referrer:'',page_title:'PR19 isolated QA',language:'pl',screen_resolution:'800x600'});
    const event={event:'web3forms_success',form_id:PARAMS.form_id,inquiry_source:PARAMS.inquiry_source};
    dataLayer.push(event);S.syntheticEvents++;const mapped=mapEvent(event,S.consent);
    gtag('event',mapped.name,{...mapped.params,send_to:'${QA_ID}',debug_mode:true});
    const script=document.createElement('script');script.src='/gtag.js';document.head.append(script);
    S.sent=true;render();
    setTimeout(async()=>{S.network=await(await fetch('/status')).json();render();},12000);
  };render();`;
  const html='<!doctype html><meta charset="utf-8"><title>PR19 isolated GA4 QA</title><style>body{font:16px system-ui;margin:24px;color:#14283d}button{padding:12px;margin:12px 0}pre{white-space:pre-wrap}</style><h1>PR19 — isolated GA4 QA</h1><p>Only QA '+QA_ID+'. No form, GTM, Ads or customer data.</p><button id="preflight">Run offline transport preflight</button><p><label><input id="consent" type="checkbox">Grant analytics_storage only for this synthetic QA event</label></p><button id="send" disabled>Send exactly one QA attempt</button><pre id="result"></pre><script src="/fixture.js"></script>';
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',req.url==='/'?WRAPPER_CSP:CSP);
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Access-Control-Allow-Origin','null');res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.headers.host!=='127.0.0.1:8770'){res.writeHead(403).end();return;}
    if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
    const u=new URL(req.url,ORIGIN);
    const json=(status,value)=>res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(value));
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000){res.writeHead(413).end();return;}}
    if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta charset="utf-8"><title>PR19 QA sandbox</title><style>iframe{width:100%;height:95vh;border:0}</style><iframe sandbox="allow-scripts" src="/fixture" title="Isolated QA fixture"></iframe><iframe sandbox="allow-scripts" src="/navigation-probe" title="Offline navigation probe" hidden></iframe>');return;}
    if(req.method==='GET'&&req.url==='/navigation-probe'){res.writeHead(200,{'Content-Type':'text/html'}).end('<script src="/navigation-probe.js"></script>');return;}
    if(req.method==='GET'&&req.url==='/navigation-probe.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end("fetch('/navigation-probe-started',{method:'POST'}).then(()=>{location.href='http://127.0.0.1:8771/trap';});");return;}
    if(req.method==='POST'&&req.url==='/navigation-probe-started'){navigationProbeStarted=true;res.writeHead(204).end();return;}
    if(req.method==='GET'&&req.url==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
    if(req.method==='GET'&&req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(browserScript);return;}
    if(req.method==='GET'&&req.url==='/gtag.js'&&arm&&eventConsumed){res.writeHead(200,{'Content-Type':'text/javascript'}).end(fs.readFileSync(library));return;}
    if(req.method==='GET'&&req.url==='/status'){json(200,report);return;}
    if(req.method==='POST'&&req.url==='/preflight'){
      let data;try{data=JSON.parse(body);}catch{json(400,{pass:false});return;}
      report.preflight=['connect','img','frame','top','popup'].every(k=>data[k]===true)&&navigationProbeStarted&&trapCount===0;report.transportChecks={...data,navigationProbeStarted,trapRequests:trapCount};save();json(200,{pass:report.preflight,trapRequests:trapCount});return;
    }
    if(req.method==='POST'&&req.url==='/consume'){
      if(!arm||!report.preflight||eventConsumed||fs.existsSync(ledger)){json(409,{allowed:false,reason:'not-armed-or-consumed'});return;}
      // Separate fuse prevents duplicate synthetic pushes even if gtag never sends.
      try{fs.writeFileSync(path.join(stateDir,'synthetic-consumed.json'),JSON.stringify({at:new Date().toISOString(),consumed:true}),{flag:'wx'});}catch{json(409,{allowed:false,reason:'synthetic-consumed'});return;}
      eventConsumed=true;browserAuthorized=true;report.syntheticEvents=1;save();json(200,{allowed:true});return;
    }
    if(u.pathname==='/g/collect'&&['POST','GET'].includes(req.method)){
      try{
        if(!arm||!browserAuthorized||!report.preflight)throw Error('closed');
        const payload=validateCollect(req.url,body,clientId,sessionId);
        browserAuthorized=false;
        report.collector=await send(payload);save();json(200,report.collector);
      }catch(e){report.blocked++;report.lastBlockedReason=String(e.code||e.message).slice(0,70);save();json(403,{blocked:true});}
      return;
    }
    report.blocked++;save();res.writeHead(403).end();
  });
  let trapCount=0,navigationProbeStarted=false;
  const trap=http.createServer((req,res)=>{trapCount++;res.writeHead(204).end();});
  trap.listen(8771,'127.0.0.1');server.listen(8770,'127.0.0.1',()=>console.log(JSON.stringify({url:ORIGIN,mode:report.mode,measurementId:QA_ID})));
  save();return {server,trap};
}
module.exports={QA_ID,PARAMS,CSP,WRAPPER_CSP,STAGE7_CLOSED,mapEvent,validateCollect,oneShot,start};
if(require.main===module){
  const stateDir=process.env.PR19_QA_STATE_DIR;
  if(!stateDir)throw Error('PR19_QA_STATE_DIR required (outside repository)');
  const arm=process.argv.includes('--arm-one-approved-attempt');
  if(arm&&(!process.env.PR19_QA_LIBRARY||!fs.existsSync(process.env.PR19_QA_LIBRARY)))throw Error('A locally cached official QA gtag library is required');
  start({arm,stateDir,library:process.env.PR19_QA_LIBRARY});
}
