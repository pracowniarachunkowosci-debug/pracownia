// Safe end-to-end tests: all external requests are intercepted, including Web3Forms.
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const out = process.env.ZDF_QA_OUTPUT || fs.mkdtempSync(path.join(require('os').tmpdir(), 'zdf-form-'));
const origin = process.env.ZDF_QA_URL || 'http://127.0.0.1:8765';
const source = 'zewnetrzny-dzial-finansowy';
const target = '/?service=' + source + '#kontakt';
const api = 'https://api.web3forms.com/submit';
const report = { date: new Date().toISOString(), checks: [], errors: [], viewports: [], violations: [], mockedSubmissions: 0, liveSubmissions: 0 };
fs.mkdirSync(out, { recursive: true });
function pass(label) { report.checks.push(label); console.log('PASS ' + label); }
(async () => {
  const browser = await chromium.launch({ channel: process.env.ZDF_BROWSER || 'chrome', headless: true });
  try {
    async function setup(consent = 'all', url = target, extra = {}) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...extra });
      const state = { mode: 'success', requests: [], pending: null };
      await ctx.addInitScript(value => {
        if (value) localStorage.setItem('cookieConsent', value);
        window.__fbEvents = [];
        window.fbq = (...args) => window.__fbEvents.push(args);
      }, consent);
      await ctx.route('**/*', async route => {
        const req = route.request();
        if (req.url().startsWith(origin)) return route.continue();
        if (req.url() !== api) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        assert.equal(req.method(), 'POST');
        // Private fields stay in memory and are never written to QA reports.
        state.requests.push(req.postDataJSON()); report.mockedSubmissions++;
        if (state.mode === 'delay') { state.pending = route; return; }
        if (state.mode === 'network') return route.abort('failed');
        if (state.mode === 'malformed') return route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json' });
        const status = Number(state.mode) || 200;
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: state.mode === 'success' || status >= 400 }) });
      });
      const page = await ctx.newPage();
      page.on('pageerror', e => report.errors.push(e.message));
      await page.goto(origin + url, { waitUntil: 'networkidle' });
      return { ctx, page, state };
    }
    async function fill(page) {
      await page.locator('#name').fill('Test QA');
      await page.locator('#company').fill('Firma testowa');
      await page.locator('#email').fill('qa@example.invalid');
      await page.locator('#phone').fill('000000000');
      await page.locator('#message').fill('Wyłącznie lokalny test z atrapą API.');
      await page.locator('[name="consent"]').check();
    }
    async function leads(page) { return page.evaluate(() => ({ ga: (window.dataLayer || []).filter(x => x[0] === 'event' && x[1] === 'generate_lead').map(x => x[2]), fb: window.__fbEvents.filter(x => x[0] === 'track' && x[1] === 'Lead').length })); }
    async function status(page, value) { await page.locator(`#lead-status[data-state="${value}"]`).waitFor(); }
    const base = process.env.ZDF_BASE_REF || '0bc0dec2f70753f2093fca645092de1910c32395';
    const old = execFileSync('git', ['show', base + ':index.html'], { cwd: root, encoding: 'utf8' });
    const current = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.equal(current.match(/name="access_key" value="([^"]+)"/)[1], old.match(/name="access_key" value="([^"]+)"/)[1], 'API key must be unchanged');
    assert.equal(current.match(/<form action="([^"]+)" method="([^"]+)"/)[0], old.match(/<form action="([^"]+)" method="([^"]+)"/)[0]);
    for (const name of ['name', 'company', 'email', 'phone', 'topic', 'documents', 'message', 'consent', 'botcheck', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid']) assert(current.includes(`name="${name}"`));
    pass('Existing endpoint, POST, access key, contact fields, honeypot and campaign fields preserved');

    let t = await setup();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await t.page.setViewportSize({ width, height: 900 });
      await t.page.goto(origin + '/zewnetrzny-dzial-finansowy.html', { waitUntil: 'networkidle' });
      await t.page.locator('.hero .js-track-contact').click();
      await t.page.waitForURL(origin + target, {waitUntil: 'load'});
      assert.equal(await t.page.locator('#topic').inputValue(), 'Zewnętrzny dział finansowy');
      assert.equal(await t.page.locator('[name="inquiry_source"]').inputValue(), source);
      await t.page.waitForFunction(() => {const y=document.querySelector('.hp-form-card').getBoundingClientRect().top;return y>=80 && y<300;});
      const sizes = await t.page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, formTop: document.querySelector('.hp-form-card').getBoundingClientRect().top, sideTop: document.querySelector('.hp-contact__side').getBoundingClientRect().top }));
      assert(sizes.scroll <= width);
      if (width <= 1024) assert(sizes.formTop < sizes.sideTop, 'Mobile visitors should reach the form before general contact copy');
      const axe = await new AxeBuilder({ page: t.page }).include('#leadForm').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.violations.push(...axe.violations.map(v => ({ width, id: v.id, targets: v.nodes.map(n => n.target) })));
      report.viewports.push(sizes);
    }
    await t.page.locator('#leadForm button[type="submit"]').click();
    assert.equal(t.state.requests.length, 0);
    assert.equal((await leads(t.page)).ga.length, 0);
    await t.page.locator('#name').focus(); await t.page.keyboard.press('Tab');
    assert.equal(await t.page.locator(':focus').getAttribute('id'), 'company');
    await t.page.keyboard.press('Tab'); assert.equal(await t.page.locator(':focus').getAttribute('id'), 'email');
    pass('Five form widths: no overflow, contextual topic/source, mobile form first, keyboard order and required validation');

    await fill(t.page); t.state.mode = 'delay';
    await t.page.locator('#leadForm button[type="submit"]').click();
    await status(t.page, 'pending');
    assert(await t.page.locator('#leadForm button').isDisabled());
    await t.page.locator('#leadForm').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await t.page.waitForTimeout(1800); // Beyond the previous unconditional 1600 ms redirect.
    assert.equal(t.state.requests.length, 1);
    assert.equal(t.page.url(), origin + target);
    assert.deepEqual(await leads(t.page), { ga: [], fb: 0 });
    await t.state.pending.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    await status(t.page, 'success');
    assert(await t.page.locator('#lead-status').evaluate(el => el === document.activeElement));
    assert(await t.page.locator('#lead-next').isVisible());
    const measured = await leads(t.page);
    assert.equal(measured.ga.length, 1); assert.equal(measured.fb, 1);
    assert.deepEqual(measured.ga[0], { event_category: 'lead', event_label: 'home_form', form_id: 'leadForm', inquiry_source: source });
    assert.equal(t.state.requests[0].inquiry_source, source);
    assert.equal(t.state.requests[0].subject, 'Zewnętrzny dział finansowy - nowe zapytanie');
    assert.equal(t.state.requests[0].email, 'qa@example.invalid');
    await t.page.locator('#leadForm').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
    assert.equal(t.state.requests.length, 1);
    await t.page.setViewportSize({ width: 390, height: 900 });
    await t.page.locator('.hp-form-card').screenshot({ path: path.join(out, 'form-success.png') });
    const successAxe = await new AxeBuilder({ page: t.page }).include('#leadForm').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    report.violations.push(...successAxe.violations.map(v => ({ state: 'success', id: v.id })));
    await t.page.locator('#lead-next a').click();
    await t.page.waitForURL(origin + '/thank-you.html');
    assert.equal(await t.page.locator('script, img[src*="facebook"]').count(), 0);
    await t.page.reload(); assert.equal(await t.page.locator('script').count(), 0);
    await t.page.goBack(); assert.equal((await leads(t.page)).ga.length, 0);
    await t.ctx.close();
    pass('Pending/double submit/revisit: one request; GA4 and Meta Lead only after 2xx + success=true; no PII in event; no timer redirect or thank-you conversion');

    for (const mode of ['rejected', '400', '403', '429', '500', 'malformed', 'network', 'timeout']) {
      t = await setup(); await fill(t.page);
      t.state.mode = mode === 'timeout' ? 'delay' : mode;
      if (mode === 'timeout') await t.page.clock.install();
      await t.page.locator('#leadForm button[type="submit"]').click();
      if (mode === 'timeout') { await status(t.page, 'pending'); await t.page.clock.fastForward(31000); }
      await status(t.page, 'error');
      assert.equal(await t.page.locator('#email').inputValue(), 'qa@example.invalid');
      assert(!(await t.page.locator('#leadForm button').isDisabled()));
      assert.equal(t.page.url(), origin + target);
      assert.deepEqual(await leads(t.page), { ga: [], fb: 0 });
      assert(!(await t.page.locator('#lead-next').isVisible()));
      if (mode === 'timeout') { if(t.state.pending) await t.state.pending.abort().catch(() => {}); await t.page.clock.resume(); }
      t.state.mode = 'success'; await t.page.locator('#leadForm button[type="submit"]').click();
      await status(t.page, 'success'); assert.equal((await leads(t.page)).ga.length, 1);
      await t.ctx.close();
      pass(`Failure ${mode}: values retained, no conversion or redirect, manual retry succeeds`);
    }
    for (const consent of ['essential', null]) {
      t = await setup(consent);
      if (consent === null) await t.page.locator('#acceptEssential').click();
      await fill(t.page); await t.page.locator('#leadForm button').click(); await status(t.page, 'success');
      assert.deepEqual(await leads(t.page), { ga: [], fb: 0 });
      assert.equal(t.state.requests[0].inquiry_source, source);
      await t.ctx.close();
    }
    pass('Essential-only consent accepts the inquiry with source but emits no custom analytics/marketing conversion');
    t = await setup('all', '/?service=qa%40example.invalid#kontakt');
    await fill(t.page); await t.page.locator('#leadForm button').click(); await status(t.page, 'success');
    assert.equal(t.state.requests[0].inquiry_source, 'strona-glowna');
    assert.equal((await leads(t.page)).ga[0].inquiry_source, 'strona-glowna');
    await t.ctx.close();
    pass('Unknown service values cannot enter inquiry_source or analytics (fixed allowlist; no internal UTM or new storage)');
    t = await setup(); await fill(t.page);
    await t.page.evaluate(() => { window.gtag = window.fbq = () => { throw new Error('Simulated analytics failure'); }; });
    await t.page.locator('#leadForm button').click(); await status(t.page, 'success');
    await t.ctx.close(); pass('Analytics exception cannot turn API acceptance into a false form error');

    t = await setup();
    await t.page.evaluate(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } }); });
    await fill(t.page); await t.page.locator('#leadForm button').click(); await status(t.page, 'success');
    assert.deepEqual(await leads(t.page), { ga: [], fb: 0 }); await t.ctx.close();
    pass('Unavailable consent storage fails closed for measurement without blocking the form');
    t = await setup(null, target, { javaScriptEnabled: false });
    assert.equal(await t.page.locator('#leadForm').getAttribute('target'), null);
    assert.equal(await t.page.locator('#leadForm').getAttribute('action'), api);
    assert(await t.page.locator('noscript p').filter({ hasText: 'Web3Forms' }).isVisible());
    await t.ctx.close(); pass('No-JS fallback remains a native POST to the same provider (not submitted during test)');
    assert.equal(report.violations.length, 0, 'Form accessibility violations');
    assert.equal(report.errors.length, 0, 'Browser errors');
  } catch (error) { report.failure = error.message; console.error(error); process.exitCode = 1; }
  finally { fs.writeFileSync(path.join(out, 'contact-report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})();
