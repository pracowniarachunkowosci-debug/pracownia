/* Run: NODE_PATH=<installed dependencies> node docs/styczen-2027/qa.cjs
   Requires playwright and @axe-core/playwright. No request leaves the browser:
   local pages come from disk, Web3Forms is mocked, third-party scripts are empty. */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.env.JANUARY_SITE_ROOT ? path.resolve(process.env.JANUARY_SITE_ROOT) : path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'preview');
fs.mkdirSync(out, { recursive: true });
const origin = 'http://campaign.test';
const files = ['index.html', 'zmiana-biura-rachunkowego.html', 'blog/zmiana-biura.html', 'blog/audyt-ksiegowosci-przed-zmiana-biura.html', 'zmiana-biura-rachunkowego-spolka-z-oo.html', 'oferta.html', 'ksiegowosc-spolka-z-oo.html', 'zewnetrzny-dzial-finansowy.html'];
const report = { date: '2026-10-24', transport: 'All requests intercepted; no live form submissions or analytics', layouts: [], forms: [], failures: [] };
let browser;
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.origin !== origin) return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    const p = path.resolve(root, '.' + decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!p.startsWith(root + path.sep)) return route.fulfill({ status: 403, body: '' });
    let target = p;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) target = path.join(p, 'index.html');
    if (!fs.existsSync(target)) return route.fulfill({ status: 404, body: 'Not found' });
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    return route.fulfill({ status: 200, body: fs.readFileSync(target), contentType: types[path.extname(target)] || 'application/octet-stream' });
  });
  return ctx;
}
async function run(name, fn) {
  try { await fn(); report.forms.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
  catch (e) { report.failures.push({ name, error: e.message }); console.log('FAIL ' + name + ': ' + e.message); }
}
async function formScenario({ name, file = '/', service = 'zmiana-biura-2027', consent = 'all', mode = 'success', expected = 'zmiana-biura-2027', topic = 'Zmiana biura rachunkowego' }) {
  await run(name, async () => {
    const ctx = await context();
    try {
      await ctx.addInitScript(c => { if (c) localStorage.setItem('cookieConsent', c); }, consent);
      let calls = 0, payload, respond;
      await ctx.route('https://api.web3forms.com/submit', async route => {
        calls++;
        payload = route.request().postDataJSON();
        assert.equal(route.request().method(), 'POST');
        if (mode === 'network') return route.abort('failed');
        if (mode === 'pending' || mode === 'timeout') await new Promise(r => { respond = r; });
        return route.fulfill({ status: mode === 'http' ? 500 : 200, contentType: 'application/json', body: mode === 'invalid-json' ? 'invalid' : JSON.stringify({ success: mode !== 'rejected' }) }).catch(() => {});
      });
      const page = await ctx.newPage();
      await page.goto(origin + file + '?service=' + encodeURIComponent(service) + '&utm_source=controlled&utm_medium=test&utm_campaign=january&utm_term=biuro&utm_content=cta&gclid=mock-gclid&fbclid=mock-fbclid#kontakt');
      const form = page.locator('form[data-contact-form]');
      assert.equal(await form.locator('[name=inquiry_source]').inputValue(), expected);
      if (topic) assert.equal(await form.locator('[name=topic]').inputValue(), topic);
      if (service === 'zmiana-biura-2027' && file === '/') {
        assert.match(await page.locator('.hp-form-note').innerText(), /stycznia 2027/);
        assert.match(await form.locator('[name=subject]').inputValue(), /stycznia 2027/);
        assert.equal(await page.evaluate(() => document.activeElement.className), 'hp-form-note');
      }
      await form.evaluate(f => f.requestSubmit());
      assert.equal(calls, 0, 'Empty required fields must prevent submission');
      await form.locator('[name=name]').fill('QA MOCK PERSON');
      await form.locator('[name=company]').fill('QA MOCK COMPANY');
      await form.locator('[name=email]').fill('mock@example.invalid');
      await form.locator('[name=phone]').fill('000000000');
      await form.locator('[name=message]').fill('QA MOCK MESSAGE');
      await form.locator('[name=consent]').check();
      if (mode === 'timeout') await page.clock.install();
      await form.evaluate(f => f.requestSubmit());
      if (mode === 'pending' || mode === 'timeout') {
        await page.waitForFunction(() => document.querySelector('[data-form-status]').dataset.state === 'pending');
        assert.equal(await form.locator('button[type=submit]').isDisabled(), true);
        await form.evaluate(f => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        assert.equal(calls, 1, 'Duplicate pending request suppressed');
        if (mode === 'timeout') await page.clock.fastForward(31000);
        else respond();
      }
      const success = ['success', 'pending'].includes(mode);
      await page.waitForFunction(s => document.querySelector('[data-form-status]').dataset.state === s, success ? 'success' : 'error');
      assert.equal(calls, 1);
      assert.equal(payload.inquiry_source, expected);
      for (const [key, value] of Object.entries({ utm_source: 'controlled', utm_medium: 'test', utm_campaign: 'january', utm_term: 'biuro', utm_content: 'cta', gclid: 'mock-gclid', fbclid: 'mock-fbclid' })) assert.equal(payload[key], value);
      assert.equal(await form.locator('button[type=submit]').isDisabled(), success);
      assert.equal(await form.locator('[name=email]').inputValue(), success ? '' : 'mock@example.invalid');
      const events = await page.evaluate(() => (window.dataLayer || []).filter(x => x.event === 'web3forms_success'));
      assert.equal(events.length, success && consent === 'all' ? 1 : 0);
      if (events.length) {
        assert.equal(events[0].inquiry_source, expected);
        assert.deepEqual(Object.keys(events[0]).sort(), ['event', 'event_category', 'event_label', 'form_id', 'inquiry_source'].sort());
      }
      assert.doesNotMatch(await page.evaluate(() => JSON.stringify(window.dataLayer)), /QA MOCK|mock@example|000000000|mock-gclid|mock-fbclid/);
      if (success) {
        await form.evaluate(f => f.dispatchEvent(new Event('submit', { cancelable: true })));
        assert.equal(calls, 1, 'Duplicate completed request suppressed');
      }
      if (mode === 'timeout' && respond) respond();
    } finally { await ctx.close(); }
  });
}
(async () => {
  browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const width of [360, 390, 1440]) {
      const ctx = await context({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
      await ctx.addInitScript(() => localStorage.setItem('cookieConsent', 'essential'));
      const page = await ctx.newPage();
      for (const file of files) {
        const errors = []; const onError = e => errors.push(e.message); page.on('pageerror', onError);
        await page.goto(origin + '/' + file);
        const evidence = await page.evaluate(() => {
          const normalize = x => x.replace(/\s+/g, ' ').trim();
          const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
          const flatten = schemas.flatMap(s => s['@graph'] || [s]);
          const faq = flatten.find(s => s['@type'] === 'FAQPage');
          const visible = [...document.querySelectorAll('details')].map(d => ({ q: normalize(d.querySelector('summary').textContent), a: normalize(d.querySelector('p').textContent) }));
          const structured = faq ? faq.mainEntity.map(q => ({ q: normalize(q.name), a: normalize(q.acceptedAnswer.text) })) : [];
          const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
          return { h1: document.querySelectorAll('h1').length, canonical: document.querySelector('link[rel=canonical]')?.href, title: document.title, overflow: document.documentElement.scrollWidth > innerWidth, duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i), faqMatches: JSON.stringify(visible) === JSON.stringify(structured), visibleFAQ: visible, structuredFAQ: structured, badEncoding: /\uFFFD|Ã|Ä…/.test(document.body.innerText), links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) };
        });
        const broken = [];
        for (const href of evidence.links) {
          const u = new URL(href, origin + '/' + file);
          if (u.origin !== origin) continue;
          let target = path.join(root, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
          if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
          if (!fs.existsSync(target)) broken.push(href);
          else if (u.hash && !new RegExp('(?:id|name)=["\x27]' + u.hash.slice(1) + '["\x27]').test(fs.readFileSync(target, 'utf8'))) broken.push(href);
        }
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        const row = { file, width, ...evidence, brokenLinks: [...new Set(broken)], javascriptErrors: errors, accessibility: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
        delete row.links;
        report.layouts.push(row);
        if (evidence.overflow || evidence.h1 !== 1 || evidence.duplicateIds.length || evidence.badEncoding || errors.length || !evidence.faqMatches || broken.length || axe.violations.length) report.failures.push({ file, width, problem: 'layout/structure/console', row });
        const burger = page.locator('button[aria-controls=mainMenu]');
        if (width < 800 && await burger.count() && await burger.isVisible()) {
          await burger.click(); assert.equal(await burger.getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape'); assert.equal(await burger.getAttribute('aria-expanded'), 'false');
        }
        if (file === 'index.html') {
          await page.locator('#zmiana-biura-2027').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(out, 'home-' + width + '.png') });
        }
        if (file === 'zmiana-biura-rachunkowego.html') {
          await page.screenshot({ path: path.join(out, 'landing-' + width + '.png') });
          await page.locator('#plan-2027').screenshot({ path: path.join(out, 'plan-' + width + '.png'), style: 'header, .burger { display: none !important; }' });
        }
        page.removeListener('pageerror', onError);
      }
      await page.goto(origin + '/?service=zmiana-biura-2027#kontakt');
      await page.screenshot({ path: path.join(out, 'form-' + width + '.png') });
      await ctx.close();
    }
    for (const mode of ['success', 'pending', 'rejected', 'http', 'network', 'invalid-json', 'timeout']) await formScenario({ name: 'seasonal-' + mode, mode });
    await formScenario({ name: 'essential-consent', consent: 'essential' });
    await formScenario({ name: 'no-consent', consent: null });
    await formScenario({ name: 'finance-regression', service: 'zewnetrzny-dzial-finansowy', expected: 'zewnetrzny-dzial-finansowy', topic: 'Zewnętrzny dział finansowy' });
    await formScenario({ name: 'home-default', service: '', expected: 'strona-glowna', topic: 'Księgowość spółki z o.o.' });
    await formScenario({ name: 'unknown-service-allowlist', service: '<script>unknown</script>', expected: 'strona-glowna', topic: 'Księgowość spółki z o.o.' });
    await formScenario({ name: 'spolka-regression', file: '/ksiegowosc-spolka-z-oo.html', expected: 'ksiegowosc-spolka-z-oo', topic: null });
    await formScenario({ name: 'ecommerce-regression', file: '/ksiegowosc-ecommerce.html', expected: 'ksiegowosc-ecommerce', topic: null });
    await run('conversion-path-and-keyboard', async () => {
      const ctx = await context();
      await ctx.addInitScript(() => localStorage.setItem('cookieConsent', 'essential'));
      const page = await ctx.newPage();
      await page.goto(origin + '/');
      await page.locator('#zmiana-biura-2027 a').focus();
      await page.keyboard.press('Enter');
      await page.waitForURL('**/zmiana-biura-rachunkowego.html');
      assert.equal(new URL(page.url()).pathname, '/zmiana-biura-rachunkowego.html');
      await page.locator('.hero__cta a').first().click();
      await page.waitForURL('**/?service=zmiana-biura-2027#kontakt');
      assert.equal(new URL(page.url()).searchParams.get('service'), 'zmiana-biura-2027');
      assert.equal(await page.locator('[name=topic]').inputValue(), 'Zmiana biura rachunkowego');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'hp-form-note');
      await ctx.close();
    });
    await run('expanded-faq-and-form-accessibility', async () => {
      const ctx = await context();
      await ctx.addInitScript(() => localStorage.setItem('cookieConsent', 'essential'));
      const page = await ctx.newPage();
      await page.goto(origin + '/zmiana-biura-rachunkowego.html');
      await page.locator('details').evaluateAll(ds => ds.forEach(d => d.open = true));
      assert.equal((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.length, 0);
      await page.goto(origin + '/?service=zmiana-biura-2027#kontakt');
      assert.equal((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.length, 0);
      await ctx.close();
    });
    await run('no-javascript-fallback-preserved', async () => {
      const ctx = await context({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.goto(origin + '/?service=zmiana-biura-2027#kontakt');
      assert.equal(await page.locator('#leadForm').getAttribute('action'), 'https://api.web3forms.com/submit');
      assert.equal(await page.locator('#leadForm').getAttribute('method'), 'POST');
      assert.equal(await page.locator('#leadForm [name=topic] option').filter({ hasText: 'Zmiana biura rachunkowego' }).count(), 1);
      await ctx.close();
    });
  } finally {
    fs.writeFileSync(path.join(__dirname, 'qa-results.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
  }
  console.log(JSON.stringify({ layouts: report.layouts.length, forms: report.forms, failures: report.failures, faqMismatches: report.layouts.filter(r => r.width === 390 && !r.faqMatches).map(r => r.file), brokenLinks: report.layouts.filter(r => r.width === 390 && r.brokenLinks.length).map(r => ({ file: r.file, links: r.brokenLinks })), accessibility: report.layouts.filter(r => r.width === 390).map(r => ({ file: r.file, violations: r.accessibility.map(v => ({ id: v.id, nodes: v.nodes.length })) })) }, null, 2));
  if (report.failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
