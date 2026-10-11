// Browser-side integration tests for the local, CSP-isolated fixture only.
document.getElementById('run').addEventListener('click', async function () {
  this.disabled = true;
  const report = {date:new Date().toISOString(), kind:'extended', page:'/', checks:[], mockedSubmissions:0, status:'RUNNING'};
  const host = document.getElementById('frame'), panel = document.getElementById('result');
  let frame, w, d;
  const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
  const show = () => panel.textContent = JSON.stringify(report,null,2);
  const pass = msg => { report.checks.push(msg); show(); };
  const wait = async fn => { const until=Date.now()+5000; while(!fn()){if(Date.now()>until)throw new Error('State timeout');await new Promise(r=>setTimeout(r,20));} };
  async function load(page,query='qa_consent=all') {
    if(w?.__qa){report.mockedSubmissions+=w.__qa.requests;assert(w.__qa.errors.length===0,'Page JS error');}
    host.replaceChildren();frame=document.createElement('iframe');frame.title='Rozszerzona regresja';frame.style.width='390px';
    const loaded=new Promise(r=>frame.onload=r);frame.src=page+'?'+query;host.append(frame);await loaded;w=frame.contentWindow;d=frame.contentDocument;
  }
  function fill(form) {
    for(const [name,value] of Object.entries({name:'TEST OFFLINE',company:'Fixture',email:'qa@example.invalid',phone:'000000000',message:'Mock only'}))form.elements[name].value=value;
    form.elements.consent.checked=true;
  }
  const events = () => w.dataLayer.filter(e=>e.event==='web3forms_success');
  try {
    for(const page of ['/','/ksiegowosc-ecommerce.html','/ksiegowosc-spolka-z-oo.html']) {
      await load(page,'qa_consent=blocked');let form=d.querySelector('form[data-contact-form]');fill(form);form.requestSubmit();
      await wait(()=>d.querySelector('[data-form-status]').dataset.state==='success');
      assert(events().length===0&&w.__qa.requests===1,'Blocked storage leaked an event');
      pass(page+': storage unavailable before page initialization; success works, no conversion or JS error');
      await load(page);form=d.querySelector('form[data-contact-form]');
      const initialLabel=form.querySelector('button[type="submit"]').textContent;
      // The same module must tolerate a different DOM id and absent optional next-link.
      form.id='qaAlternateId';d.getElementById('lead-next')?.remove();
      const duplicate=d.createElement('script');duplicate.src='/assets/js/contact-form.js';const attached=new Promise(r=>duplicate.onload=r);d.body.append(duplicate);await attached;
      fill(form);form.requestSubmit();await wait(()=>d.querySelector('[data-form-status]').dataset.state==='success');
      assert(w.__qa.requests===1&&events().length===1,'Duplicate initialization/alternate id failed');
      assert(initialLabel&&d.activeElement===d.querySelector('[data-form-status]'),'Status focus missing');
      pass(page+': repeat script load does not duplicate handling; non-leadForm DOM id and absent optional next-link supported');
      for(const width of [320,390,768,1024,1440]) {
        frame.style.width=width+'px';await new Promise(r=>w.requestAnimationFrame(()=>w.requestAnimationFrame(r)));
        assert(d.documentElement.scrollWidth<=w.innerWidth+1,'Horizontal overflow at '+page+' '+width);
      }
      const axeScript=d.createElement('script');axeScript.src='/__qa__/axe.js';const axeLoaded=new Promise(r=>axeScript.onload=r);d.body.append(axeScript);await axeLoaded;
      // Browser password-manager decoration is external to the repository form.
      const axe=await w.axe.run({include:['#qaAlternateId'],exclude:['[id^="password-manager-field-logo-imgId-"]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      assert(axe.violations.length===0,'Form accessibility: '+axe.violations.map(v=>v.id+': '+v.nodes.map(n=>n.target.join(' ')).join('; ')).join(','));
      pass(page+': 320/390/768/1024/1440 without horizontal overflow; form axe WCAG A/AA zero violations after success');
      await load(page,'qa_nojs=1');form=d.querySelector('form');
      assert(d.querySelectorAll('script').length===0&&form.method.toLowerCase()==='post'&&form.action==='https://api.web3forms.com/submit'&&!form.target,'No-JS fallback changed');
      assert(!form.querySelector('button[type="submit"]').disabled,'Native submit disabled');
      pass(page+': script-free rendering retains visible native POST path; no real submission performed');
    }
    for(const page of ['case-study-estonski-cit-ecommerce.html','estonski-cit-ecommerce.html','estonski-cit-spolka-z-oo.html','interpretacje-estonski-cit.html','ukryte-zyski-estonski-cit.html','zmiana-biura-estonski-cit.html']) {
      await load('/'+page);
      assert(d.querySelectorAll('form').length===0,'Unexpected form added');
      assert(w.__qa.requests===0&&events().length===0,'Spurious lead on form-free page');
      assert(d.querySelector('a[href="https://calendly.com/pracowniarachunkowosci/30min"]'),'Calendly link lost');
      pass(page+': actual DOM has no form; no false lead; existing Calendly navigation retained');
    }
    report.status='PASS';
  } catch(error) {report.status='FAIL';report.checks.push('FAIL: '+error.message);}
  if(w?.__qa)report.mockedSubmissions+=w.__qa.requests;
  report.liveSubmissions=0;report.liveAnalyticsRequests=0;show();
  await fetch('/__qa__/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
  host.replaceChildren();
});
