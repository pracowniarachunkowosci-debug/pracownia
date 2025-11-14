/* === KSeF Quiz – wersja 2 (UI poprawione) === */
(function(){
  // ————— 1) Minimalny CSS wstrzykiwany z JS (nie trzeba ruszać plików CSS) —————
  const css = `
  .ksef-quiz{padding:22px;border-radius:16px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.06)}
  .ksef-quiz h2{margin:0 0 8px;font-size:24px}
  .ksef-quiz .muted{color:#6b7280;font-size:14px}
  .ksef-quiz .header{margin-bottom:10px}
  .ksef-quiz .progress{display:flex;align-items:center;gap:10px;margin:12px 0 18px}
  .ksef-quiz .progress .bar{flex:1;height:8px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .ksef-quiz .progress .bar>i{display:block;height:100%;width:0;background:#0D1B2A;border-radius:999px;transition:width .25s}
  .ksef-quiz .progress .count{font-size:13px;color:#374151;min-width:88px;text-align:right}
  .ksef-quiz .grid-q{display:grid;gap:12px}
  @media (min-width:900px){ .ksef-quiz .grid-q{grid-template-columns:1fr 1fr} }
  .ksef-quiz .q{border:1px solid #e5e7eb;border-radius:12px;padding:12px}
  .ksef-quiz .q.unanswered{border-color:#f59e0b; box-shadow:0 0 0 2px rgba(245,158,11,.15)}
  .ksef-quiz .q legend{font-weight:600;margin-bottom:8px}
  .ksef-quiz .opts{display:flex;gap:10px;flex-wrap:wrap}
  .ksef-quiz .chip{position:relative;display:inline-flex;align-items:center}
  .ksef-quiz .chip input{position:absolute;opacity:0;inset:0;cursor:pointer}
  .ksef-quiz .chip span{display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;font-weight:500}
  .ksef-quiz .chip.yes input:checked + span{background:#ECFDF5;border-color:#10B981;color:#065F46}
  .ksef-quiz .chip.no  input:checked + span{background:#F3F4F6;border-color:#9CA3AF;color:#111827}
  .ksef-quiz .error{display:none;background:#FEF2F2;border:1px solid #EF4444;color:#991B1B;padding:10px 12px;border-radius:8px;margin:0 0 12px}
  .ksef-quiz .actionbar{position:sticky;bottom:0;background:rgba(255,255,255,.92);backdrop-filter:blur(4px);border-top:1px solid #e5e7eb;margin-top:12px;padding:12px 0;display:flex;gap:10px;flex-wrap:wrap}
  .ksef-quiz .btn{display:inline-block;padding:10px 16px;border-radius:10px;text-decoration:none;border:1px solid #0D1B2A}
  .ksef-quiz .btn-primary{background:#0D1B2A;color:#fff}
  .ksef-quiz .btn-outline{background:#fff;color:#0D1B2A}
  .ksef-quiz .res{margin-top:18px;padding:16px;border-radius:12px}
  .ksef-quiz .res.green{background:#ECFDF5;border:1px solid #10B981}
  .ksef-quiz .res.yellow{background:#FFFBEB;border:1px solid #F59E0B}
  .ksef-quiz .res.red{background:#FEF2F2;border:1px solid #EF4444}
  .ksef-quiz .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#111;color:#fff;font-size:12px;margin-left:8px}
  /* Tryb kompaktowy (mniejsze odstępy) */
.ksef-quiz.compact{padding:16px}
.ksef-quiz.compact h2{margin-bottom:4px}
.ksef-quiz.compact .progress{margin:6px 0 10px}
.ksef-quiz.compact .progress .bar{height:6px}
.ksef-quiz.compact .grid-q{gap:8px}
.ksef-quiz.compact .q{padding:10px}
.ksef-quiz.compact .q legend{margin-bottom:6px}
.ksef-quiz.compact .opts{gap:8px}
.ksef-quiz.compact .chip span{padding:6px 12px}
.ksef-quiz.compact .actionbar{padding:8px 0}
.ksef-quiz.compact .res{margin-top:12px;padding:12px}

  `;
  function injectCSS(){
    if(!document.getElementById('ksef-quiz-style')){
      const s=document.createElement('style'); s.id='ksef-quiz-style'; s.textContent=css; document.head.appendChild(s);
    }
  }

  // ————— 2) Pytania i CTA —————
  const QUESTIONS = [
    "Masz listę użytkowników z dostępem do KSeF (role/uprawnienia)?",
    "Potrafisz w 2 kliknięcia odebrać dostęp odchodzącemu pracownikowi?",
    "Biuro rachunkowe ma dostęp tylko w niezbędnym zakresie (zasada minimalnych uprawnień)?",
    "Masz opisane: kto wystawia, kto akceptuje i kto wysyła faktury do KSeF?",
    "Masz procedurę korekt (faktury korygujące / noty / uzgodnienia)?",
    "Masz monitoring błędów (kolejka dokumentów, które nie przeszły do KSeF)?",
    "Masz procedurę na tryb awaryjny i offline/offline24 (co, kto, kiedy dosyła)?",
    "Systemy ERP/handel/magazyn łączą się z KSeF bez ręcznych mostów?",
    "Raporty księgowe zawierają numer KSeF i status (nie tylko PDF)?",
    "Masz politykę archiwizacji i backup e-faktur?",
    "Zarząd dostaje miesięczny dashboard KPI (sprzedaż, VAT/CIT, należności)?",
    "Przećwiczyliście wystawienie i odbiór w Aplikacji Podatnika KSeF 2.0 / sandboxie?"
  ];
  const CTAS = {
    primaryHref: "/umow-konsultacje?utm_source=blog&utm_medium=cta&utm_campaign=ksef_ready",
    secondaryHref: "/files/checklista-ksef.pdf?utm_source=blog&utm_medium=download&utm_campaign=ksef_ready"
  };
  function withCurrentUTM(href){
    try{
      const url=new URL(href, location.origin);
      const src=new URL(location.href);
      ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(k=>{
        if(src.searchParams.get(k) && !url.searchParams.get(k)){ url.searchParams.set(k, src.searchParams.get(k)); }
      });
      return url.pathname + (url.search||"") + (url.hash||"");
    }catch(e){ return href; }
  }

  // ————— 3) Render + logika —————
  function render(host){
    injectCSS();
    const sec=document.createElement('section'); sec.className='ksef-quiz card';
    if (host.hasAttribute('data-compact')) sec.classList.add('compact');

    sec.innerHTML = `
      <div class="header">
        <h2>Czy Twoje biuro jest gotowe na KSeF? Zrób test w 15 minut</h2>
        <p class="muted">Odpowiedz <b>TAK/NIE</b> na 12 pytań. Po kliknięciu „Pokaż wynik” zobaczysz rekomendację.</p>
        <div class="progress">
          <div class="bar" aria-hidden="true"><i></i></div>
          <div class="count" aria-live="polite">0/12</div>
        </div>
        <div class="error" id="ksef-err">Zaznacz odpowiedź w każdym pytaniu.</div>
      </div>
      <form id="ksef-form" class="grid-q" novalidate></form>
      <div class="actionbar">
        <button type="button" class="btn btn-primary" id="ksef-submit">Pokaż wynik</button>
        <button type="button" class="btn btn-outline" id="ksef-reset">Wyczyść odpowiedzi</button>
      </div>
      <div id="ksef-result"></div>
      <p class="muted" style="margin-top:8px"><small>Uwaga: wpis ma charakter informacyjny (nie stanowi porady podatkowej/rachunkowej).</small></p>
    `;

    const form=sec.querySelector('#ksef-form');
    QUESTIONS.forEach((q,i)=>{
      const fid=`q${i+1}`;
      const fs=document.createElement('fieldset'); fs.className='q'; fs.innerHTML = `
        <legend>${i+1}. ${q}</legend>
        <div class="opts" role="group" aria-label="${q}">
          <label class="chip yes"><input type="radio" name="${fid}" value="yes"><span>Tak</span></label>
          <label class="chip no"><input type="radio" name="${fid}" value="no"><span>Nie</span></label>
        </div>
      `;
      form.appendChild(fs);
    });

    const bar = sec.querySelector('.progress .bar > i');
    const count = sec.querySelector('.progress .count');
    function answeredCount(){
      return QUESTIONS.filter((_,i)=> form.querySelector(`input[name="q${i+1}"]:checked`) ).length;
    }
    function updateProgress(){
      const n = answeredCount();
      const pct = Math.round((n/QUESTIONS.length)*100);
      bar.style.width = pct + '%';
      count.textContent = `${n}/${QUESTIONS.length}`;
    }
    form.addEventListener('change', (e)=>{
      if(e.target && e.target.name){ 
        e.target.closest('.q')?.classList.remove('unanswered');
        updateProgress();
      }
    });

    function compute(){
      const answers = QUESTIONS.map((_,i)=>{
        const sel=form.querySelector(`input[name="q${i+1}"]:checked`);
        return sel ? sel.value : null;
      });
      if(answers.some(a=>a===null)){
        sec.querySelector('#ksef-err').style.display='block';
        // podświetl pierwsze brakujące i przewiń
        const idx = answers.findIndex(a=>a===null);
        const miss = form.querySelectorAll('.q')[idx];
        miss.classList.add('unanswered');
        miss.scrollIntoView({behavior:'smooth', block:'center'});
        return null;
      }
      const yes=answers.filter(a=>a==='yes').length;
      const band = yes>=10 ? 'green' : (yes>=7 ? 'yellow' : 'red');
      return {yes,no:answers.length-yes,band,score:yes};
    }

    function drawResult(r){
      const box=sec.querySelector('#ksef-result');
      const meta = {
        green:{t:'Wynik: Zielony', d:'Jesteście gotowi — dopinamy szczegóły i szkolimy zespół.', c:'green'},
        yellow:{t:'Wynik: Żółty',  d:'Dobry kierunek — zróbmy sprint wdrożeniowy 2–3 tygodnie.', c:'yellow'},
        red:{t:'Wynik: Czerwony', d:'Ryzyko zatoru — zaczynamy od procedur offline/awaria i ról.', c:'red'}
      }[r.band];
      box.innerHTML = `
        <div class="res ${meta.c}">
          <h3>${meta.t} <span class="badge">${r.score}/12 TAK</span></h3>
          <p>${meta.d}</p>
          <div class="grid">
            <a class="btn btn-primary" href="${withCurrentUTM(CTAS.primaryHref)}">Umów 20-min przegląd KSeF</a>
            <a class="btn btn-outline" href="${withCurrentUTM(CTAS.secondaryHref)}">Pobierz checklistę (PDF)</a>
          </div>
        </div>`;
      try{ if(typeof gtag==='function') gtag('event','ksef_quiz_submit',{score:r.score,band:r.band,yes:r.yes,no:r.no}); }catch(e){}
      try{ localStorage.setItem('ksef_quiz_result', JSON.stringify(r)); }catch(e){}
      box.scrollIntoView({behavior:'smooth', block:'start'});
    }

    sec.querySelector('#ksef-submit').addEventListener('click', ()=>{
      sec.querySelector('#ksef-err').style.display='none';
      const r=compute(); if(r) drawResult(r);
    });
    sec.querySelector('#ksef-reset').addEventListener('click', ()=>{
      form.reset(); updateProgress();
      sec.querySelector('#ksef-result').innerHTML=''; sec.querySelector('#ksef-err').style.display='none';
      form.querySelectorAll('.q.unanswered').forEach(q=>q.classList.remove('unanswered'));
      try{ localStorage.removeItem('ksef_quiz_result'); }catch(e){}
    });

    host.replaceWith(sec);
    updateProgress();
  }

  function boot(){
    const host=document.getElementById('ksef-quiz');
    if(host) render(host);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
