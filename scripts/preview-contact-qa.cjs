// Local, fail-closed browser fixture. No provider or analytics request can leave it.
// Run from any directory, then open http://127.0.0.1:8768/__qa__/run.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = process.env.ZDF_QA_OUTPUT || path.join(root, 'docs/zewnetrzny-dzial-finansowy/stage3');
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'none'; frame-src 'self'; object-src 'none'; base-uri 'self'";
const fixture = `(() => {
  const consent = new URLSearchParams(location.search).get('qa_consent');
  localStorage.removeItem('cookieConsent');
  if (consent && consent !== 'none') localStorage.setItem('cookieConsent', consent);
  const q = window.__qa = { mode: 'success', requests: 0, fb: [], errors: [], checks: {} };
  if (consent === 'blocked') Object.defineProperty(window, 'localStorage', {get() { throw new Error('QA unavailable storage'); }});
  window.fbq = (...args) => q.fb.push(args);
  window.addEventListener('error', e => { if (e.message) q.errors.push(e.message); });
  const timer = window.setTimeout;
  window.setTimeout = function(fn, ms, ...args) {
    if (ms === 30000) { q.expire = fn; return timer(() => {}, 60000); }
    return timer(fn, ms, ...args);
  };
  window.fetch = (url, options) => {
    if (url !== 'https://api.web3forms.com/submit') return Promise.reject(new Error('External request blocked by QA'));
    q.requests++;
    const payload = JSON.parse(options.body);
    const expected = Object.fromEntries(new FormData(document.querySelector('form[data-contact-form]')));
    q.checks = { source: payload.inquiry_source, correctMethod: options.method === 'POST',
      testPayload: payload.email === 'qa@example.invalid', hasKey: !!payload.access_key,
      fieldsPreserved: Object.keys(expected).every(key => payload[key] === expected[key]) };
    return new Promise((resolve, reject) => {
      q.resolve = (status = 200, body = {success:true}) => resolve(new Response(JSON.stringify(body), {status}));
      options.signal.addEventListener('abort', () => reject(new DOMException('QA timeout', 'AbortError')), {once:true});
      if (q.mode === 'delay') return;
      if (q.mode === 'network') return reject(new TypeError('QA network failure'));
      if (q.mode === 'malformed') return resolve(new Response('not-json', {status:200}));
      q.resolve(Number(q.mode) || 200, {success:q.mode === 'success' || /^\\d+$/.test(q.mode) ? true : q.mode === 'string' ? 'true' : false});
    });
  };
})();`;
const page = `<!doctype html><html lang="pl"><meta charset="utf-8"><title>PR #19 — testy offline konwersji</title>
<style>body{font:16px system-ui;margin:24px;color:#15333d}button{padding:12px}pre{white-space:pre-wrap}iframe{width:390px;height:500px;border:1px solid #aaa}</style>
<h1>PR #19 — testy offline konwersji</h1><p>Web3Forms i analityka zastąpione lokalnymi atrapami. CSP blokuje połączenia zewnętrzne i natywny POST.</p>
<button id="run">Uruchom testy na atrapach</button><pre id="result">Gotowe. Zero rzeczywistych wysyłek.</pre><div id="frame"></div>
<script src="/__qa__/runner.js"></script></html>`;
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8768');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/__qa__/report' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => {
      try {
        const report = JSON.parse(raw);
        // Persist only the declared result schema, never form data or raw browser logs.
        const allowedPages = ['/', '/ksiegowosc-ecommerce.html', '/ksiegowosc-spolka-z-oo.html'];
        if (!allowedPages.includes(report.page)) throw new Error();
        const safe = {date: report.date, page:report.page, checks: report.checks, mockedSubmissions: report.mockedSubmissions,
          liveSubmissions: 0, liveAnalyticsRequests: 0, networkPolicy: csp, status: report.status};
        if (!Array.isArray(safe.checks) || safe.checks.some(x => typeof x !== 'string') || !Number.isInteger(safe.mockedSubmissions)) throw new Error();
        fs.mkdirSync(output, {recursive:true});
        const suffix = report.page === '/' ? '' : '-' + path.basename(report.page, '.html');
        const reportName = report.kind === 'extended' ? 'extended-report' : 'conversion-report' + suffix;
        fs.writeFileSync(path.join(output, reportName + '.json'), JSON.stringify(safe, null, 2) + '\n');
        res.writeHead(200, {'Content-Type':'application/json'}).end('{"saved":true}');
      } catch { res.writeHead(400).end(); }
    });
    return;
  }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (url.pathname === '/__qa__/run') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(page); return; }
  if (url.pathname === '/__qa__/extended') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(page.replace('/__qa__/runner.js','/scripts/extended-contact-qa-browser.js')); return; }
  if (url.pathname === '/__qa__/axe.js') { res.writeHead(200, {'Content-Type':'text/javascript'}).end(fs.readFileSync(path.join(root,'../zdf-qa/node_modules/axe-core/axe.min.js'))); return; }
  if (url.pathname === '/__qa__/fixture.js') { res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'}).end(fixture); return; }
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (url.pathname === '/__qa__/runner.js') filename = path.join(__dirname, 'contact-qa-browser.js');
  else if (filename === root) filename = path.join(root, 'index.html');
  const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon'};
  if (!types[path.extname(filename)] || path.relative(root, filename).split(path.sep).some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
  fs.readFile(filename, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    if (path.extname(filename) === '.html' && url.searchParams.has('qa_nojs')) data = Buffer.from(data.toString('utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
    else if (path.extname(filename) === '.html' && path.basename(filename) !== 'thank-you.html') data = Buffer.from(data.toString('utf8').replace('<head>', '<head><script src="/__qa__/fixture.js"></script>'));
    res.writeHead(200, {'Content-Type':types[path.extname(filename)] + '; charset=utf-8'}).end(data);
  });
}).listen(8768, '127.0.0.1', () => console.log('Offline-only QA: http://127.0.0.1:8768/__qa__/run'));
