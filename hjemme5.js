/* Hjemme-oppsett v5. 0.18.12: PÅ som standard. Slås av bare med localStorage 'knaggen:hjemme-v5' = '0' (nødbryter per telefon).
 * Telefoner som allerede har data/husstand (fra før v5) regnes som ferdige: de tvinges ikke gjennom oppsettet.
 * Funksjonsvalget gjelder PER TELEFON og lagres lokalt ('knaggen:v5:funksjoner'). Del posisjon: per telefon ('knaggen:na-posisjon').
 * Adressen er felles for husstanden (settings/hjem). Uten husstand lagres den på telefonen og deles når den blir med (app.js).
 * Jobb og kalender: bare «Kommer snart». Ingen regelendringer. */
(function () {
  'use strict';
  var on = function () { try { return !!window.KNAGGEN_HJEMME_V5 || localStorage.getItem('knaggen:hjemme-v5') !== '0'; } catch (e) { return true; } };
  if (!on()) return;
  // Eksisterende telefon (har Knaggen-data fra før) → oppsettet regnes som ferdig, én gang. Testkroken KNAGGEN_HJEMME_V5 hopper over dette.
  try {
    if (!window.KNAGGEN_HJEMME_V5 && !localStorage.getItem('knaggen:v5:sjekket')) {
      localStorage.setItem('knaggen:v5:sjekket', '1');
      var old = false;
      for (var i0 = 0; i0 < localStorage.length; i0++) { var k0 = localStorage.key(i0); if (/^ukeshandel:/.test(k0)) { old = true; break; } }
      if (old && localStorage.getItem('knaggen:v5:ferdig') == null) localStorage.setItem('knaggen:v5:ferdig', 'true');
    }
  } catch (e0) { }
  document.documentElement.classList.add('v5-on');
  var K = { fn: 'knaggen:v5:funksjoner', done: 'knaggen:v5:ferdig', skip: 'knaggen:v5:hoppet', rem: 'knaggen:v5:minnet', notnow: 'knaggen:v5:ikke-na', resume: 'knaggen:v5:fortsett', remOff: 'knaggen:v5:minn-ikke-na' };
  var get = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var del = function (k) { try { localStorage.removeItem(k); } catch (e) { } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // 0.18.12: «Kjøretid til jobb» er skjult (steg 6 har ikke innhold ennå) – verken som valg i steg 3, under Husstand eller i flyten.
  var FN = [['middag', 'Middag og handleliste', 'Planlegg uka, handlelista lager seg selv'], ['buss', 'Buss og tog', 'Neste avgang hjemmefra'],
    ['kalender', 'Kalender', 'Familiens avtaler i uka']];
  var HIDDEN_STEPS = { 6: true };
  var STEP_OF = { middag: 4, buss: 5, jobb: 6, kalender: 7 };
  var FN_OF = { 4: 'middag', 5: 'buss', 6: 'jobb', 7: 'kalender' };
  function chosen() { return get(K.fn, ['middag', 'buss', 'jobb', 'kalender']); }
  // Bare steg med innhold: 6 (jobb) aldri; 5 (holdeplasser) bare når det finnes holdeplasser å vise
  function hasStep(n) { return !HIDDEN_STEPS[n] && (n !== 5 || stops().length > 0); }
  function seq() { return [1, 2, 3].concat(chosen().map(function (f) { return STEP_OF[f]; }).filter(hasStep).sort()); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  // Stegindikator: steg 1–2 viser 3; fra steg 3 er tallet 3 + antall valgte (samme tall videre)
  function dots(n) {
    var s = seq(), total = s.length, i = s.indexOf(n);   // 0.18.12: telleren teller bare synlige steg, hele veien
    var h = '<div class="v5-dots" role="img" aria-label="Steg ' + (i + 1) + ' av ' + total + '" data-testid="v5-steg">';
    for (var k = 0; k < total; k++) h += '<span class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></span>';
    return h + '</div>';
  }
  var sheet = false;   // steget åpnet som ark fra Husstand → Hjemme
  function next3(n) { var s = seq(); for (var j = 0; j < s.length; j++) if (s[j] > n) return '#oppsett/' + s[j]; return '#oppsett/ferdig'; }
  function next(n) { if (sheet) return '#husstand'; var s = seq(), i = s.indexOf(n); return i >= 0 && i + 1 < s.length ? '#oppsett/' + s[i + 1] : '#oppsett/ferdig'; }
  function skip(n) { var l = get(K.skip, []); if (l.indexOf(n) < 0) l.push(n); set(K.skip, l); }
  function unskip(n) { set(K.skip, get(K.skip, []).filter(function (x) { return x !== n; })); }
  function api() { return window.KnaggenKitchenApi || {}; }
  var ov = null;
  function tabsNa() {   // under oppsettet er «Nå» aktiv fane
    [].forEach.call(document.querySelectorAll('nav.tabs [data-tab]'), function (a) {
      var o = a.getAttribute('data-tab') === 'na'; a.classList.toggle('active', o); if (o) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function close() { if (ov) { ov.remove(); ov = null; } document.body.classList.remove('v5-open'); }
  function screen(n, body, acts) {
    if (!ov) { ov = document.createElement('section'); document.body.appendChild(ov); document.body.classList.add('v5-open'); }
    ov.className = 'v5' + (sheet ? ' v5-ark' : ''); ov.setAttribute('data-testid', 'v5'); ov.setAttribute('role', sheet ? 'dialog' : 'region'); ov.setAttribute('aria-label', 'Sett opp hjemmet');
    ov.setAttribute('data-steg', n);
    ov.innerHTML = '<div class="v5-in">' + (sheet ? '<a class="v5-x" href="#husstand" aria-label="Lukk" data-testid="v5-lukk">×</a>' : dots(n)) + body + '</div><div class="v5-acts">' + acts + '</div>';
    var f = ov.querySelector('h2'); if (f) { f.tabIndex = -1; f.focus(); }
    if (!sheet) { tabsNa(); setTimeout(tabsNa, 50); }
  }
  var B = function (cls, href, t, id, extra) { return '<a class="btn ' + cls + '" href="' + href + '" data-testid="' + id + '"' + (extra || '') + '>' + t + '</a>'; };
  function stops() {
    var sk = api().sharedKitchen ? api().sharedKitchen() : null, loc = get('knaggen:kjokken-avganger', {});
    return ((sk && !loc.own ? sk.stops : loc.stops) || []).slice(0, 3);
  }
  function render() {
    var h0 = location.hash;
    // «Velg retter» i steg 4 går til Finn retter; når den er ferdig (tilbake til Uke) fortsetter oppsettet
    var res = get(K.resume, null);
    if (res && /^#uke$/.test(h0)) { del(K.resume); location.replace(res); return; }
    var m = /^#oppsett\/(ark-)?(\w+)/.exec(h0);
    if (!m) { close(); sheet = false; return; }
    sheet = !!m[1];
    var n = m[2] === 'ferdig' ? 'ferdig' : m[2] === 'neste3' ? 'neste3' : +m[2];
    if (n === 'ferdig') { set(K.done, true); close(); location.replace('#kjokken'); return; }
    if (n === 'neste3') { location.replace(next(3)); return; }
    if (typeof n === 'number' && n > 3 && !sheet && !hasStep(n)) { location.replace(next3(n)); return; }
    if (n === 1) screen(1, '<h2>Del posisjon?</h2><ul class="v5-ticks"><li>Fyller inn adressen din</li><li>Viser riktige avganger der du er</li><li>Bare du ser hvor du er</li></ul>',
      B('', next(1), 'Skriv inn selv', 'v5-selv', ' data-pos="0"') + B('primary', next(1), 'Ja', 'v5-ja', ' data-pos="1"'));
    else if (n === 2) {
      var adr = api().homeAddress ? api().homeAddress() : '';
      screen(2, '<h2>Hvor bor dere?</h2><p class="hint">Brukes til avganger og kjøretid. Deles med husstanden.</p>' +
        '<label class="v5-field"><span>Adresse</span><input type="search" id="v5-adr" autocomplete="off" enterkeyhint="search" value="' + esc(adr) + '" placeholder="Gate og nummer, sted" data-testid="v5-adresse"></label>' +
        '<ul class="v5-hits" role="listbox" aria-label="Forslag" data-testid="v5-forslag"></ul><p class="v5-ok" data-testid="v5-adresse-lagret" role="status">' + (adr ? 'Lagret' : '') + '</p>',
        B('primary block', next(2), 'Neste', 'v5-neste'));
    } else if (n === 3) {
      var c = chosen();
      screen(3, '<h2>Hva vil du se?</h2><p class="hint">Alt kan endres senere.</p><ul class="v5-fn">' + FN.map(function (f) {
        return '<li><label><input type="checkbox" data-fn="' + f[0] + '" data-testid="v5-fn-' + f[0] + '"' + (c.indexOf(f[0]) >= 0 ? ' checked' : '') + '><span><b>' + f[1] + '</b><small>' + f[2] + '</small></span></label></li>';
      }).join('') + '</ul>', B('primary block', '#oppsett/neste3', 'Neste', 'v5-neste'));
    } else if (n === 4) screen(4, '<h2>Legg inn noen retter?</h2><p class="hint">Velg noen dere liker. Dere kan legge til flere når som helst.</p>',
      B('', next(4), 'Senere', 'v5-hopp', ' data-skip="4"') + B('primary', '#retter/finn/uke', 'Velg retter', 'v5-retter', ' data-resume="' + next(4) + '"'));
    else if (n === 5) {
      var st = stops(), fromPos = st.length && localStorage.getItem('knaggen:na-posisjon') === 'true' && !get('knaggen:kjokken-avganger', {}).manual;
      if (fromPos) screen(5, '<h2>Vi fant ' + st.length + ' holdeplass' + (st.length > 1 ? 'er' : '') + ' i nærheten</h2><p class="hint" data-testid="v5-holdeplasser">' + esc(st.map(function (x) { return x.name; }).join(' og ')) + '</p>',
        B('', '#kjokken/innstillinger/avg', 'Endre', 'v5-endre') + B('primary', next(5), 'Neste', 'v5-neste'));
      else screen(5, '<h2>Velg holdeplasser</h2><p class="hint">Så ser du neste avgang hjemmefra.</p>' + (st.length ? '<p class="hint" data-testid="v5-holdeplasser">' + esc(st.map(function (x) { return x.name; }).join(' og ')) + '</p>' : ''),
        B('', next(5), 'Hopp over', 'v5-hopp', ' data-skip="5"') + B('primary', '#kjokken/innstillinger/avg', 'Velg', 'v5-endre', ' data-skip="5"'));
    } else if (n === 6) screen(6, '<h2>Hvor jobber du?</h2><p class="hint">Bare du ser denne.</p><p class="v5-snart" data-testid="v5-snart">Kommer snart</p>',
      B('', next(6), 'Hopp over', 'v5-hopp', ' data-skip="6"') + B('primary', next(6), 'Neste', 'v5-neste', ' data-skip="6"'));
    else if (n === 7) screen(7, '<h2>Koble til Google Kalender?</h2><p class="hint">Da ser dere avtalene i uka.</p><p class="v5-snart" data-testid="v5-snart" hidden>Kommer snart</p>',
      B('', next(7), 'Senere', 'v5-hopp', ' data-skip="7"') + '<button type="button" class="btn primary" data-testid="v5-koble" data-k7="1">Koble til</button>');
    else { close(); }
  }
  // adressefelt i steg 2: samme oppslag som Husstand → Hjem
  var adrT = null, adrSeq = 0, hits = [];
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'v5-adr') return;
    var q = e.target.value, ul = document.querySelector('[data-testid="v5-forslag"]'), my = ++adrSeq;
    var okEl = document.querySelector('[data-testid="v5-adresse-lagret"]'); if (okEl) okEl.textContent = '';
    clearTimeout(adrT);
    if (q.trim().length < 3) { hits = []; if (ul) ul.innerHTML = ''; return; }
    adrT = setTimeout(function () {
      if (!api().geoLookup) return;
      api().geoLookup(q).then(function (h) {
        if (my !== adrSeq) return; hits = h; var u = document.querySelector('[data-testid="v5-forslag"]'); if (!u) return;
        u.innerHTML = h.length ? h.map(function (x, i) { return '<li><button type="button" class="v5-hit" role="option" data-hit="' + i + '" data-testid="v5-treff">' + esc(x.adresse) + '</button></li>'; }).join('') : '<li class="hint">Fant ingen adresse. Prøv med sted.</li>';
      }, function () { var u = document.querySelector('[data-testid="v5-forslag"]'); if (u && my === adrSeq) u.innerHTML = '<li class="hint">Fikk ikke slått opp adressen nå.</li>'; });
    }, 300);
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.v5 [data-pos], .v5 [data-skip], .v5 [data-hit], .v5 [data-k7], .v5 [data-resume], .v5-na [data-v5]'); if (!t) return;
    if (t.dataset.hit != null) {
      var x = hits[+t.dataset.hit]; if (!x || !api().setHome) return;
      var inp = document.getElementById('v5-adr'); if (inp) inp.value = x.adresse;
      document.querySelector('[data-testid="v5-forslag"]').innerHTML = '';
      api().setHome(x).then(function () { var o = document.querySelector('[data-testid="v5-adresse-lagret"]'); if (o) o.textContent = 'Lagret'; }, function () { var o = document.querySelector('[data-testid="v5-adresse-lagret"]'); if (o) o.textContent = 'Fikk ikke lagret adressen. Prøv igjen.'; });
      return;
    }
    if (t.dataset.k7) {   // kalender: plassholder til koblingen finnes
      e.preventDefault(); skip(7);
      var sn = document.querySelector('[data-testid="v5-snart"]'); if (sn) sn.hidden = false;
      t.outerHTML = B('primary', next(7), 'Neste', 'v5-neste'); return;
    }
    if (t.dataset.v5 === 'minn-ikke-na') {
      e.preventDefault(); var ro = get(K.remOff, { day: '', n: 0 }); set(K.remOff, { day: today(), n: (ro.n || 0) + 1 }); naApply(); return;
    }
    if (t.dataset.v5 === 'ikke-na') {
      e.preventDefault(); var nn = get(K.notnow, { day: '', n: 0 }); set(K.notnow, { day: today(), n: (nn.n || 0) + 1 }); naApply(); return;
    }
    if (t.dataset.resume) { set(K.resume, t.dataset.resume); unskip(4); }
    if (t.dataset.pos) try { localStorage.setItem('knaggen:na-posisjon', t.dataset.pos === '1' ? 'true' : 'false'); } catch (x2) { }   // per telefon
    if (t.dataset.pos === '1' && navigator.geolocation) navigator.geolocation.getCurrentPosition(function () { }, function () { });
    if (t.dataset.skip) skip(+t.dataset.skip);
  }, true);
  document.addEventListener('change', function (e) {
    var d = e.target.dataset || {};
    if (d.fn) {   // steg 3: indikatoren følger valget
      set(K.fn, [].slice.call(document.querySelectorAll('.v5 [data-fn]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.fn; }));
      var dd = document.querySelector('.v5 [data-testid="v5-steg"]'); if (dd) dd.outerHTML = dots(3);
    } else if (d.v5hs) {   // Husstand → Hjemme: kryss av → åpne steget som ark
      var l = chosen().filter(function (f) { return f !== d.v5hs; }); if (e.target.checked) l.push(d.v5hs);
      set(K.fn, FN.map(function (f) { return f[0]; }).filter(function (f) { return l.indexOf(f) >= 0; }));
      if (e.target.checked) location.hash = '#oppsett/ark-' + STEP_OF[d.v5hs];
    }
  });
  // ---- «Nå»
  var remShown = false;
  function firstSkipped() {
    var c = chosen(); return get(K.skip, []).filter(function (n) { return c.indexOf(FN_OF[n]) >= 0 && !HIDDEN_STEPS[n]; }).sort()[0];
  }
  var NAMES = { 4: ['Legg inn noen retter', '#oppsett/4'], 5: ['Velg holdeplasser', '#oppsett/5'], 6: ['Legg inn jobbadresse', '#oppsett/6'], 7: ['Koble til kalenderen', '#oppsett/7'] };
  function naApply() {
    var na = document.querySelector('[data-testid="na"]'); if (!na) return;
    var done = get(K.done, false), nn = get(K.notnow, { day: '', n: 0 });
    var card = !done && nn.day !== today() && (nn.n || 0) < 3;
    document.body.classList.toggle('v5-pre', card);
    var el = na.querySelector('.v5-na'), html = '';
    if (card) html = '<div class="v5-card" data-testid="v5-na-tom"><h3>Sett opp hjemmet</h3><p class="hint">Få middag, avganger og dagen samlet her.</p>' +
      B('primary block', '#oppsett/1', 'Kom i gang', 'v5-kom-i-gang') + '<a href="#" class="btn ghost block" data-v5="ikke-na" data-testid="v5-ikke-na">Ikke nå</a></div>';
    else if (done) {
      var sk = firstSkipped();   // bare første hoppede steg, én gang
      // 0.18.12: påminnelsen har «Ikke nå». Avvist → borte resten av dagen (lagres på telefonen); etter tre avvisninger kommer den ikke igjen.
      var ro = get(K.remOff, { day: '', n: 0 });
      if (sk && ro.day !== today() && (ro.n || 0) < 3) html = '<div class="v5-minn-rad" data-testid="v5-minn-rad"><a class="na-fortsett" href="' + NAMES[sk][1] + '" data-testid="v5-minn">' + NAMES[sk][0] + '\u00a0<i aria-hidden="true">›</i></a>' +
        '<a href="#" class="btn ghost v5-minn-x" data-v5="minn-ikke-na" data-testid="v5-minn-ikke-na">Ikke nå</a></div>';
    }
    if (!html) { if (el) el.remove(); }
    else if (!el || el.getAttribute('data-h') !== html) { if (!el) { el = document.createElement('div'); el.className = 'v5-na'; } el.innerHTML = html; el.setAttribute('data-h', html); if (el.parentNode !== na || na.firstChild !== el) na.insertBefore(el, na.firstChild); }
    var tom = na.querySelector('[data-testid="na-avg-tom"]');
    if (tom && done && !(api().homeAddress && api().homeAddress()) && chosen().indexOf('buss') >= 0 && !tom.getAttribute('data-v5')) {
      tom.setAttribute('data-v5', '1'); tom.innerHTML = '<a href="#oppsett/ark-2" data-testid="v5-legg-adresse">Legg inn adressen for å se avganger\u00a0›</a>';
    }
    var lb = na.querySelector('.na-lbl'); if (lb && !lb.classList.contains('v5-mid') && /Middag i dag/.test(lb.textContent)) lb.classList.add('v5-mid');
  }
  // ---- Husstand → Hjemme: avkrysning per telefon
  function hsApply() {
    var pg = document.querySelector('#main [data-page="husstand"]:not([data-sub])'); if (!pg || pg.querySelector('[data-testid="v5-hs"]')) return;
    var c = chosen(), sec = document.createElement('div'); sec.className = 'v5-hs'; sec.setAttribute('data-testid', 'v5-hs');
    sec.innerHTML = '<h3 class="v5-hs-t">Hjemme</h3><p class="hint">Hva du ser på denne telefonen.</p><ul class="v5-fn">' + FN.map(function (f) {
      return '<li><label><input type="checkbox" data-v5hs="' + f[0] + '" data-testid="v5-hs-' + f[0] + '"' + (c.indexOf(f[0]) >= 0 ? ' checked' : '') + '><span><b>' + f[1] + '</b><small>' + f[2] + '</small></span></label></li>';
    }).join('') + '</ul>';
    var h = pg.querySelector('.k17-head, .page-head'); if (h && h.nextSibling) pg.insertBefore(sec, h.nextSibling); else pg.appendChild(sec);
  }
  var mo = new MutationObserver(function () { naApply(); hsApply(); });
  function start() { mo.observe(document.body, { childList: true, subtree: true }); naApply(); hsApply(); render(); }
  if (!get(K.done, false) && (!location.hash || location.hash === '#' || location.hash === '#uke')) location.replace('#kjokken');
  window.addEventListener('hashchange', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
