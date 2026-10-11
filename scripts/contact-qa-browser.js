// Runs against the actual form DOM and production handler, inside local CSP-isolated iframes.
document.getElementById('run').addEventListener('click', async function () {
  this.disabled = true;
  const report = {date:new Date().toISOString(), checks:[], mockedSubmissions:0, status:'RUNNING'};
  const panel = document.getElementById('result');
  const host = document.getElementById('frame');
  let frame, w, d;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const show = () => { panel.textContent = JSON.stringify(report, null, 2); };
  const pass = message => { report.checks.push(message); show(); };
  const events = () => w.dataLayer.filter(e => e.event === 'web3forms_success');
  const meta = () => w.__qa.fb.filter(e => e[0] === 'track' && e[1] === 'Lead');
  async function waitFor(fn) {
    const end = Date.now() + 4000;
    while (!fn()) { if (Date.now() > end) throw new Error('Expected state did not arrive'); await new Promise(r => setTimeout(r, 20)); }
  }
  async function setup(consent = 'all', source = 'zewnetrzny-dzial-finansowy', page = '/') {
    if (w) { assert(w.__qa.errors.length === 0, 'Unexpected page error'); report.mockedSubmissions += w.__qa.requests; }
    host.replaceChildren();
    frame = document.createElement('iframe');
    frame.title = 'Izolowany formularz QA';
    const loaded = new Promise(resolve => frame.onload = resolve);
    frame.src = page + '?service=' + encodeURIComponent(source) + '&qa_consent=' + consent + '#kontakt';
    host.append(frame); await loaded;
    w = frame.contentWindow; d = frame.contentDocument;
  }
  function fill() {
    for (const [id, value] of Object.entries({name:'TEST OFFLINE', company:'Fixture', email:'qa@example.invalid', phone:'000000000', message:'Wyłącznie lokalna atrapa API.'})) d.getElementById(id).value = value;
    d.querySelector('[name="consent"]').checked = true;
  }
  const form = () => d.getElementById('leadForm');
  const button = () => form().querySelector('button[type="submit"]');
  const submit = () => form().requestSubmit(button());
  const forceSubmit = () => form().dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true}));
  const status = state => waitFor(() => d.getElementById('lead-status').dataset.state === state);
  const noConversion = () => { assert(events().length === 0 && meta().length === 0, 'Unexpected conversion'); };
  function oneConversion(source = 'zewnetrzny-dzial-finansowy') {
    const expected = {event:'web3forms_success', event_category:'lead', event_label:'home_form', form_id:'leadForm', inquiry_source:source};
    assert(JSON.stringify(events()) === JSON.stringify([expected]), 'Wrong count or event allowlist');
    assert(meta().length === 1, 'Wrong Meta Lead count');
    assert(!w.dataLayer.some(e => e[0] === 'event' && e[1] === 'generate_lead'), 'Parallel gtag conversion');
  }
  try {
    await setup(); submit(); forceSubmit(); noConversion(); assert(w.__qa.requests === 0, 'Invalid form submitted');
    pass('Invalid form: native validation and programmatic submit produce zero requests/events');
    fill(); w.__qa.mode = 'delay'; submit(); await status('pending'); forceSubmit();
    noConversion(); assert(w.__qa.requests === 1 && button().disabled, 'Pending submit not guarded');
    w.__qa.resolve(); await status('success'); oneConversion();
    assert(w.__qa.checks.correctMethod && w.__qa.checks.testPayload && w.__qa.checks.hasKey, 'Request contract changed');
    assert(w.__qa.checks.source === 'zewnetrzny-dzial-finansowy', 'Request source mismatch');
    assert(d.activeElement.id === 'lead-status' && button().disabled && !d.getElementById('lead-next').hidden, 'Success UI mismatch');
    forceSubmit(); oneConversion(); assert(w.__qa.requests === 1, 'Completed form submitted twice');
    pass('Delayed API success + double submit: exactly one request and one PII-free success event; correct UI, source, focus and no parallel gtag');
    for (const mode of ['rejected','string','400','403','429','500','malformed','network','timeout']) {
      await setup(); fill(); w.__qa.mode = mode === 'timeout' ? 'delay' : mode;
      submit(); if (mode === 'timeout') { await status('pending'); w.__qa.expire(); }
      await status('error'); noConversion();
      assert(d.getElementById('email').value === 'qa@example.invalid' && !button().disabled && d.getElementById('lead-next').hidden, 'Error UI mismatch');
      w.__qa.mode = 'success'; submit(); await status('success'); oneConversion();
      assert(w.__qa.requests === 2, 'Unexpected retry count');
      pass(mode + ': no success/conversion; fields retained; explicit mock retry succeeds once');
    }
    await setup(); fill(); w.__qa.mode = 'delay'; submit(); w.__qa.resolve(201); await status('success'); oneConversion();
    pass('HTTP 201 + boolean success true is accepted');
    for (const consent of ['essential','none','unknown','unavailable']) {
      await setup(consent === 'unavailable' ? 'all' : consent); fill();
      if (consent === 'unavailable') Object.defineProperty(w, 'localStorage', {get() { throw new Error('Storage unavailable'); }});
      submit(); await status('success'); noConversion();
      pass(consent + ' consent: API success still works, no custom conversion');
    }
    await setup(); fill(); w.__qa.mode = 'delay'; submit();
    w.localStorage.setItem('cookieConsent', 'essential'); w.__qa.resolve(); await status('success'); noConversion();
    w.localStorage.setItem('cookieConsent','all'); forceSubmit(); noConversion();
    assert(w.__qa.requests === 1, 'Consent change resubmitted form');
    pass('Consent withdrawn during request: no conversion; later grant does not replay completed lead');
    await setup('essential'); fill(); w.__qa.mode = 'delay'; submit();
    w.localStorage.setItem('cookieConsent','all'); w.__qa.resolve(); await status('success'); oneConversion();
    pass('Consent checked at confirmed API success, not cached at submit');
    await setup('all','qa@example.invalid'); fill(); submit(); await status('success'); oneConversion('strona-glowna');
    assert(w.__qa.checks.source === 'strona-glowna', 'Unknown source escaped allowlist');
    pass('Untrusted query source cannot introduce PII into the success event');
    await setup(); fill(); w.gtag = undefined; submit(); await status('success'); oneConversion();
    pass('GTM success event does not depend on a global gtag function or default routing');
    await setup(); fill(); w.dataLayer.push = () => { throw new Error('GTM failure'); };
    submit(); await status('success'); assert(button().disabled, 'Analytics failure changed acceptance');
    pass('Throwing GTM consumer cannot change accepted API result');
    await setup(); fill(); w.fbq = () => { throw new Error('Meta failure'); };
    submit(); await status('success'); assert(events().length === 1 && button().disabled, 'Meta failure changed acceptance');
    pass('Throwing Meta consumer cannot erase the GTM success event or API success');
    await setup('all','zewnetrzny-dzial-finansowy','/thank-you.html');
    assert(!d.querySelector('script') && !w.dataLayer, 'Thank-you contains measurement code');
    pass('Direct thank-you visit contains no measurement code');
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.checks.push('FAIL: ' + error.message); }
  if (w && w.__qa) report.mockedSubmissions += w.__qa.requests;
  report.liveSubmissions = 0; report.liveAnalyticsRequests = 0;
  show();
  const response = await fetch('/__qa__/report', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(report)});
  assert(response.ok, 'Report save failed');
  host.replaceChildren();
});
