/* 0.25.0 Startpakke v2 (merkevare/startpakke/v2): første oppsett er bare to steg – #oppsett/husstand (navn og hvem som spiser)
 * og #oppsett/retter (velg blant ti klassikere) – og «Fyll uka» lander rett på den fylte handlelista (ingen «Uka er klar»).
 * Åpnes av seg selv bare når husstanden har 0 retter (KnaggenStartpakke.eligible() i app.js) og telefonen ikke er ferdig.
 * Kalenderforslaget («Se avtalene i uka?») kommer på Nå først neste gang appen åpnes. De gamle v5-stegene (ark fra Husstand,
 * påminnelser for hoppede steg på eldre telefoner) virker som før.
 * Hjemme-oppsett v5. 0.18.12: PÅ som standard. Slås av bare med localStorage 'knaggen:hjemme-v5' = '0' (nødbryter per telefon).
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
  try { if (localStorage.getItem('knaggen:sp:kal') === '"neste"') localStorage.setItem('knaggen:sp:kal', '"vis"'); } catch (e1) { }   // 0.25.0: ny oppstart = «neste gang»
  var SPK = { kal: 'knaggen:sp:kal', hopp: 'knaggen:sp:hoppet', vist: 'knaggen:sp:vist' };   // vist: oppsettet er åpnet av seg selv én gang   // 0.25.0: kalenderforslaget (neste → vis → nei/koble) og «Hopp over»
  var K = { fn: 'knaggen:v5:funksjoner', done: 'knaggen:v5:ferdig', skip: 'knaggen:v5:hoppet', rem: 'knaggen:v5:minnet', notnow: 'knaggen:v5:ikke-na', resume: 'knaggen:v5:fortsett', remOff: 'knaggen:v5:minn-ikke-na' };
  var get = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } if (k === K.done) spHdr(); };
  // 0.25.0 (Sigurd): «Koble til» i toppen skjules til første oppsett er ferdig (fullført eller «Hopp over»). Gjelder bare telefoner som
  // fortsatt skal gjennom oppsettet (0 retter); før app.js er lastet skjules den også, så den ikke blinker.
  function spHdr() {
    var sp = SP(), el = sp && sp.eligible ? sp.eligible() : null;
    document.documentElement.classList.toggle('sp-uferdig', !get(K.done, false) && el !== false);
  }
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
    // 0.26.0 (Trude v0260 #1): «Nå» finnes bare på telefon. På nettbrett/PC lyser «Uke» – siden som ligger bak oppsettet (route() viser Uke)
    var t = document.body.classList.contains('k-phone') ? 'na' : 'uke';
    [].forEach.call(document.querySelectorAll('nav.tabs [data-tab]'), function (a) {
      var o = a.getAttribute('data-tab') === t; a.classList.toggle('active', o); if (o) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function close() { if (ov) { ov.remove(); ov = null; } document.body.classList.remove('v5-open'); document.body.classList.remove('v5-ark-open'); }
  function screen(n, body, acts, dotsHtml) {
    if (!ov) { ov = document.createElement('section'); document.body.appendChild(ov); document.body.classList.add('v5-open'); }
    ov.className = 'v5' + (sheet ? ' v5-ark' : ''); ov.setAttribute('data-testid', 'v5'); ov.setAttribute('role', sheet ? 'dialog' : 'region'); ov.setAttribute('aria-label', 'Sett opp hjemmet');
    ov.setAttribute('data-steg', n);
    document.body.classList.toggle('v5-ark-open', !!sheet);   // 0.26.0: toasten over arket
    ov.innerHTML = '<div class="v5-in">' + (sheet ? '<a class="v5-x" href="#husstand" aria-label="Lukk" data-testid="v5-lukk">×</a>' : dotsHtml != null ? dotsHtml : dots(n)) + body + '</div><div class="v5-acts">' + acts + '</div>';
    var f = ov.querySelector('h2'); if (f) { f.tabIndex = -1; f.focus(); }
    if (!sheet) { tabsNa(); setTimeout(tabsNa, 50); }
  }
  var B = function (cls, href, t, id, extra) { return '<a class="btn ' + cls + '" href="' + href + '" data-testid="' + id + '"' + (extra || '') + '>' + t + '</a>'; };
  function stops() {
    var sk = api().sharedKitchen ? api().sharedKitchen() : null, loc = get('knaggen:kjokken-avganger', {});
    return ((sk && !loc.own ? sk.stops : loc.stops) || []).slice(0, 3);
  }
  /* ---- 0.25.0 Startpakke v2 ---- */
  function SP() { return window.KnaggenStartpakke || null; }
  function spEligible() { var a = SP(); return a ? a.eligible() : null; }
  var spSel = {};   // valgte retter i steg 2 (alle starter uvalgt)
  function spDots(i) {   // 0.26.0: tre steg – husstand, faste varer, velg retter
    var h = '<div class="v5-dots" role="img" aria-label="Steg ' + (i + 1) + ' av 3" data-testid="v5-steg">';
    for (var k = 0; k < 3; k++) h += '<span class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></span>';
    return h + '</div>';
  }
  function spCount() { return Object.keys(spSel).filter(function (k) { return spSel[k]; }).length; }
  function spFyllBtn() { var n = spCount(); return '<button type="button" class="btn primary" data-sp="fyll" data-testid="sp-fyll"' + (n ? '' : ' disabled aria-disabled="true"') + '>Fyll uka</button>'; }

  /* ---- 0.26.0 (retning-v3): «Hvem bor i husstanden?» i to nivåer ----
   * Enkelt (standard): tellerne, som før. «Legg til navn» → én rad per person (navn og valgfri alder; voksne uten alder = «Voksen»).
   * «Vis bare antall» → tilbake til tellerne. «Legg til kjæledyr» spør først Hund / Katt / Annet. Neste virker med bare tall.
   * Tellerne lagres i husstanden (som før); navn, alder og kjæledyr på telefonen og i husstanden (settings/folk, KnaggenStartpakke.detail;
   * krever regelforslaget regler-0260.diff – med reglene som er publisert nå blir de på telefonen). */
  function HH() { return window.KnaggenHusstand; }
  var H3 = null;   // skjermens tilstand: { mode, persons, pets, name, people, petAsk }
  function h3Load() {
    var a = SP(), d = a.detail ? a.detail() : { mode: 'enkel', persons: [], pets: [] }, hs = a.household();
    var people = hs.people || { voksen: 2, barn: 2, smabarn: 0 };
    return { mode: d.mode, persons: d.mode === 'navn' ? HH().reconcile(d.persons, people) : d.persons, pets: d.pets || [], name: hs.name || 'Familien', people: people, petAsk: false };
  }
  function h3Sync() {   // tellerne (enkelt nivå) og feltene (navn-nivå) inn i tilstanden før en ny tegning
    if (!H3) return;
    if (H3.mode === 'enkel' && document.getElementById('sp-voksen')) H3.people = SP().readCounters();
    var inp = document.getElementById('sp-navn'); if (inp) H3.name = inp.value;
  }
  function h3People() { return H3.mode === 'navn' ? HH().peopleOf(H3.persons) : H3.people; }
  function h3Sum() { return 'Regnes som <b>' + SP().porsjoner(h3People()) + ' porsjoner</b>'; }
  var PET = { hund: 'Hund', katt: 'Katt', annet: 'Annet dyr' };
  var KIND_PH = { voksen: 'Voksen', barn: '6–12', smabarn: '1–5' };
  // 0.26.0 punkt 5: gang-illustrasjonen. window.KnaggenGang.lag(husstand) (gang.js: gangen skalert etter husstanden, Sigurd 17.11)
  // returnerer lag [{ lys: url, mork: url, dx | dxLys/dxMork: px i 1280-lerretet }] (øverste sist). Kroken kan byttes; uten krok,
  // med null eller ved feil vises den faste gangen (bilder/gang-lys|mork.webp).
  function gangHtml() {
    var lag = null, hs = H3 ? { people: h3People(), persons: H3.mode === 'navn' ? H3.persons : null, pets: H3.pets } : null;
    try { if (window.KnaggenGang && typeof window.KnaggenGang.lag === 'function') lag = window.KnaggenGang.lag(hs); } catch (e) { lag = null; }
    var css = function (u) { return 'url(&quot;' + esc(String(u).replace(/["()\\]/g, '')) + '&quot;)'; };
    var inner = Array.isArray(lag) && lag.length ? lag.map(function (l, i) {
      var dx = l.dxLys != null || l.dxMork != null ? ';--dx-lys:' + ((+l.dxLys || 0) / 12.8) + '%;--dx-mork:' + ((+l.dxMork || 0) / 12.8) + '%' : ';--dx:' + ((+l.dx || 0) / 12.8) + '%';
      return '<i class="gang-lag" data-lag="' + i + '"' + (l.navn ? ' data-navn="' + esc(String(l.navn)) + '"' : '') + ' style="--gang-lys:' + css(l.lys) + ';--gang-mork:' + css(l.mork || l.lys) + dx + '"></i>';
    }).join('') : '<i class="gang-lag" data-lag="0"></i>';
    var pl = Array.isArray(lag) && lag.plan ? lag.plan : null;
    var meta = pl ? ' data-variant="' + pl.variant + '" data-behov="' + pl.behov + '" data-knagger="' + pl.knaggerProdukt + '"' : '';
    return '<div class="gang' + (H3 && H3.mode === 'navn' ? ' liten' : '') + '" data-testid="gang" data-gang="' + (Array.isArray(lag) && lag.length ? 'tilpasset' : 'standard') + '"' + meta + ' role="img" aria-label="Gang med knagger, jakker og sko">' + inner + '</div>';
  }
  // gangen følger husstanden mens man skriver alder eller trykker på tellerne (uten å tegne skjermen på nytt)
  function gangRefresh() {
    var g = ov && ov.querySelector('[data-testid="gang"]'); if (!g || !H3) return;
    h3Sync();
    var tmp = document.createElement('div'); tmp.innerHTML = gangHtml();
    if (tmp.firstChild && tmp.firstChild.outerHTML !== g.outerHTML) g.parentNode.replaceChild(tmp.firstChild, g);
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.v5 [data-hs-prefix="sp"][data-hs-step]')) setTimeout(gangRefresh, 0);
  });
  function h3Rows() {
    return '<ul class="hs3-folk" data-testid="hs3-personer">' + H3.persons.map(function (p, i) {
      var k = HH().personKind(p), age = p.age == null ? '' : String(p.age), lbl = p.name ? p.name : 'person ' + (i + 1);
      return '<li class="hs3-p' + (age === '' && k === 'voksen' ? ' voksen' : '') + '" data-i="' + i + '" data-testid="hs3-person">' +
        '<input type="text" class="hs3-navn" data-h3i="' + i + '" maxlength="30" autocomplete="off" placeholder="Navn" aria-label="Navn, person ' + (i + 1) + '" value="' + esc(p.name) + '" data-testid="hs3-navn">' +
        '<label class="hs3-alder"><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" data-h3a="' + i + '" placeholder="' + (KIND_PH[p.kind] || 'Voksen') + '" aria-label="Alder, ' + esc(lbl) + ' (valgfritt)" value="' + age + '" data-testid="hs3-alder"><span aria-hidden="true">år</span></label>' +
        '<button type="button" class="icon-btn hs3-x" data-h3="fjern-person" data-i="' + i + '" aria-label="Fjern ' + esc(lbl) + '" data-testid="hs3-fjern-person">×</button></li>';
    }).join('') + '</ul>';
  }
  function h3Pets() {
    if (!H3.pets.length) return '';
    return '<ul class="hs3-dyr" data-testid="hs3-dyr">' + H3.pets.map(function (d, i) {
      return '<li data-type="' + d.type + '" data-testid="hs3-dyr-rad"><b>' + PET[d.type] + '</b><button type="button" class="icon-btn hs3-x" data-h3="fjern-dyr" data-i="' + i + '" aria-label="Fjern ' + PET[d.type].toLowerCase() + '" data-testid="hs3-fjern-dyr">×</button></li>';
    }).join('') + '</ul>';
  }
  function h3PetAsk() {
    return '<div class="hs3-sporr" role="group" aria-labelledby="hs3-sporr-t" data-testid="hs3-dyr-valg"><p id="hs3-sporr-t" class="hint">Hva slags kjæledyr?</p><div class="hs3-sporr-b">' +
      ['hund', 'katt', 'annet'].map(function (t) { return '<button type="button" class="btn" data-h3="dyr" data-type="' + t + '" data-testid="hs3-dyr-' + t + '">' + (t === 'annet' ? 'Annet' : PET[t]) + '</button>'; }).join('') +
      '</div><a href="#" class="hs3-lenke" data-h3="dyr-avbryt" data-testid="hs3-dyr-avbryt">Avbryt</a></div>';
  }
  function spHusstand(focusSel) {
    var a = SP();
    if (!H3) H3 = h3Load();
    var body = gangHtml() + '<h2>Hvem bor i husstanden?</h2><p class="hint">Da passer mengdene i lista. Alt kan endres senere.</p>';
    var petLink = '<a href="#" class="hs3-lenke" data-h3="dyr-sporr" data-testid="hs3-legg-dyr">Legg til kjæledyr</a>';
    if (H3.mode === 'enkel') {
      if (!sheet) body += '<label class="v5-field"><span>Navn på husstanden</span><input type="text" id="sp-navn" maxlength="40" autocomplete="off" value="' + esc(H3.name) + '" placeholder="F.eks. Hansen" data-testid="sp-navn"></label>';
      body += '<div class="sp-folk">' + a.countersHtml(H3.people) + '</div>' + h3Pets() +
        '<p class="hs3-lenker"><a href="#" class="hs3-lenke" data-h3="navn-pa" data-testid="hs3-legg-navn">Legg til navn</a>' + (H3.petAsk ? '' : petLink) + '</p>';
    } else {
      body += h3Rows() + h3Pets() + '<p class="hs-sum" data-testid="sp-sum">' + h3Sum() + '</p>' +
        '<p class="hs3-lenker"><a href="#" class="hs3-lenke" data-h3="person-pluss" data-testid="hs3-legg-person">Legg til person</a>' + (H3.petAsk ? '' : petLink) + '</p>' +
        '<p class="hs3-lenker"><a href="#" class="hs3-lenke" data-h3="bare-antall" data-testid="hs3-bare-antall">Vis bare antall</a></p>';
    }
    if (H3.petAsk) body += h3PetAsk();
    // 0.26.0 (Sigurd 17.11): «Fjern navn» i arket fra Husstand når noe er lagret (også når navnene er skjult med «Vis bare antall»)
    var lagret = a.detail ? a.detail() : null;
    if (sheet && a.removeDetail && lagret && (lagret.pets.length || lagret.persons.some(function (p) { return (p && p.name) || (p && p.age != null); })))
      body += '<p class="hs3-lenker hs3-fjern"><a href="#" class="hs3-lenke hs3-fjern-navn" data-h3="fjern-navn" data-testid="hs3-fjern-navn">Fjern navn</a></p>';
    var act = sheet ? '<button type="button" class="btn primary block" data-sp="lagre-hs" data-testid="sp-lagre">Lagre</button>'
      : '<button type="button" class="btn primary block" data-sp="neste" data-testid="sp-neste">Neste</button>';
    screen('husstand', body, act, spDots(0));
    if (ov) ov.setAttribute('data-nivaa', H3.mode);
    if (focusSel) { var f = ov && ov.querySelector(focusSel); if (f) try { f.focus(); } catch (e) { } }
  }
  function h3Save() {
    var a = SP(); h3Sync();
    var people = h3People();
    a.saveHousehold(people, sheet ? '' : H3.name);
    if (a.saveDetail) a.saveDetail({ mode: H3.mode, persons: H3.persons, pets: H3.pets });
  }
  /* ---- 0.26.0: steg 2 «Faste varer», fylt fra husstanden ---- */
  var FV = null;   // { lines, removed }
  function spFaste() {
    var a = SP();
    if (!FV) FV = { lines: a.faste ? a.faste() : [], removed: [] };
    var rows = FV.lines.map(function (l) {
      return '<li data-k="' + esc(l.key) + '" data-testid="fv3-vare"><span class="t"><b>' + esc(l.name) + '</b> <span class="m" data-testid="fv3-mengde">' + esc(l.qty + ' ' + l.unit) + '</span></span>' +
        '<button type="button" class="icon-btn hs3-x" data-h3="fjern-vare" data-k="' + esc(l.key) + '" aria-label="Fjern ' + esc(l.name) + '" data-testid="fv3-fjern">×</button></li>';
    }).join('');
    screen('faste', '<div class="fv3-head"><h2>Faste varer</h2>' + spDots(1) + '</div><p class="hint">Vi har lagt til noen faste varer som passer dere. Fjern det dere ikke trenger.</p>' +
      (rows ? '<ul class="fv3-liste" data-testid="fv3-liste">' + rows + '</ul>' : '<p class="hint" data-testid="fv3-tom">Ingen faste varer nå. Dere kan legge dem til senere under Husstand.</p>'),
      '<button type="button" class="btn primary block" data-sp="faste-neste" data-testid="sp-faste-neste">Neste</button>', '');
  }
  function spRetter() {
    var a = SP();
    var rows = a.dishes().map(function (x) {
      var on = !!spSel[x.id];
      return '<li><button type="button" class="sp-rett' + (on ? ' on' : '') + '" data-sp-id="' + esc(x.id) + '" aria-pressed="' + on + '" data-testid="sp-rett">' +
        '<span class="t"><b>' + esc(x.name) + '</b>' + (x.minutes ? '<small>' + x.minutes + ' min</small>' : '') + '</span><span class="sp-merke" aria-hidden="true">' + (on ? '✓' : '') + '</span></button></li>';
    }).join('');
    screen('retter', '<h2>Velg retter</h2><p class="hint">Trykk på dem dere liker. Vi fyller uka og handlelista. Alt kan endres senere.</p>' +
      '<p class="sp-antall" data-testid="sp-antall" aria-live="polite">' + spCount() + ' valgt</p><ul class="sp-retter" data-testid="sp-retter">' + rows + '</ul>',
      '<button type="button" class="btn" data-sp="hopp" data-testid="sp-hopp">Hopp over</button>' + spFyllBtn(), spDots(2));
  }
  function spFinish(filled) {
    set(K.done, true);
    if (filled) del(SPK.hopp); else set(SPK.hopp, true);
    // kalenderforslaget: bare når startpakken er fullført («Fyll uka», ikke «Hopp over»), tidligst neste gang appen åpnes,
    // og bare på en telefon som er med i en husstand (spKalShow)
    if (filled && get(SPK.kal, null) == null) set(SPK.kal, 'neste');
    close();
    location.replace(filled ? '#liste' : '#kjokken');
  }
  // Åpnes av seg selv én gang per telefon (0.25.0: aldri igjen av seg selv), bare fra standardsiden og bare når husstanden har 0 retter.
  // Lukkes det uten «Fyll uka» / «Hopp over», står kortet «Sett opp hjemmet» på Nå (med «Ikke nå»).
  var spAutoDone = false;
  function spAuto() {
    if (spAutoDone) return;
    if (get(K.done, false) || get(SPK.vist, false)) { spAutoDone = true; return; }   // aldri av seg selv igjen (da står «Sett opp hjemmet» på Nå)
    if (!/^(#|#kjokken|#uke)?$/.test(location.hash)) { spAutoDone = true; return; }   // invitasjon, lenke eller brukeren har gått videre
    var el = spEligible();
    if (el == null) return;   // husstand: venter på at rettene er lest fra serveren
    spAutoDone = true;
    if (el === false) { set(K.done, true); return; }   // husstanden har retter: ingenting å sette opp
    set(SPK.vist, true);
    location.replace('#oppsett/husstand');
  }

  function render() {
    var h0 = location.hash;
    // «Velg retter» i steg 4 går til Finn retter; når den er ferdig (tilbake til Uke) fortsetter oppsettet
    var res = get(K.resume, null);
    if (res && /^#uke$/.test(h0)) { del(K.resume); location.replace(res); return; }
    var m = /^#oppsett\/(ark-)?(\w+)/.exec(h0);
    if (!m) { close(); sheet = false; return; }
    sheet = !!m[1];
    if (sheet && m[2] === 'husstand') {   // 0.26.0: «Navn, alder og kjæledyr» fra Husstand – samme skjerm som ark, «Lagre» går tilbake
      if (!SP()) { location.replace('#husstand'); return; }
      H3 = h3Load(); spHusstand(); return;
    }
    if (!sheet && (m[2] === '1' || m[2] === 'husstand' || m[2] === 'faste' || m[2] === 'retter')) {   // 0.25.0/0.26.0: første oppsett i tre steg
      var elg = spEligible();
      if (!SP() || elg === false) { if (elg === false) set(K.done, true); close(); location.replace('#kjokken'); return; }   // husstanden har retter
      if (m[2] === '1') { location.replace('#oppsett/husstand'); return; }
      if (m[2] === 'husstand') { H3 = h3Load(); spHusstand(); }
      else if (m[2] === 'faste') spFaste();
      else spRetter();
      return;
    }
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
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.v5 [data-sp], .v5 [data-sp-id], [data-spk]'); if (!t) return;
    e.preventDefault();
    var a = SP(); if (!a) return;
    if (t.dataset.spId) {
      var id = t.dataset.spId, on = !spSel[id]; spSel[id] = on;
      t.classList.toggle('on', on); t.setAttribute('aria-pressed', String(on));
      var mk = t.querySelector('.sp-merke'); if (mk) mk.textContent = on ? '✓' : '';
      var an = document.querySelector('[data-testid="sp-antall"]'); if (an) an.textContent = spCount() + ' valgt';
      var fb = document.querySelector('[data-testid="sp-fyll"]'); if (fb) fb.outerHTML = spFyllBtn();
      return;
    }
    var k = t.dataset.sp || t.dataset.spk;
    if (k === 'neste') {   // 0.26.0: husstand → faste varer (forslaget lages på nytt fra husstanden)
      if (!H3) H3 = h3Load();
      h3Save(); FV = null;
      location.hash = '#oppsett/faste';
    } else if (k === 'lagre-hs') {   // arket fra Husstand
      if (!H3) H3 = h3Load();
      h3Save(); H3 = null;
      location.hash = '#husstand';
    } else if (k === 'faste-neste') {
      if (!FV) FV = { lines: a.faste ? a.faste() : [], removed: [] };
      if (a.saveFaste) a.saveFaste(FV.lines, FV.removed);
      location.hash = '#oppsett/retter';
    } else if (k === 'hopp') spFinish(false);
    else if (k === 'fyll') {
      var ids = a.ids().filter(function (x) { return spSel[x]; });
      if (!ids.length) return;
      a.apply(ids);
      spFinish(true);
    } else if (k === 'kal-ikke') { set(SPK.kal, 'nei'); naApply(); }
    else if (k === 'kal-koble') { set(SPK.kal, 'koble'); location.hash = '#kjokken/innstillinger/kal'; }
  }, true);
  // 0.26.0: husstandens tellere kom fra serveren (eller telefonen ble kjent med husstanden) mens husstand-skjermen står åpen og
  // ingenting er endret her ennå: vis husstandens verdier, så «Neste» ikke skriver over det en annen telefon har lagret.
  document.addEventListener('knaggen-husstand', function () {
    if (!H3 || H3.touched || !ov || ov.getAttribute('data-steg') !== 'husstand') return;
    if (document.activeElement && ov.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName)) return;
    var nxt = h3Load();
    if (JSON.stringify([nxt.mode, nxt.persons, nxt.pets, nxt.people]) === JSON.stringify([H3.mode, H3.persons, H3.pets, H3.people])) return;
    H3 = nxt; spHusstand();
  });
  document.addEventListener('click', function (e) { if (H3 && e.target.closest && e.target.closest('.v5 [data-hs-step], .v5 [data-h3]')) H3.touched = true; }, true);
  document.addEventListener('input', function (e) { if (H3 && e.target && e.target.closest && e.target.closest('.v5')) H3.touched = true; }, true);
  // 0.26.0: husstand (personer, kjæledyr) og faste varer
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.v5 [data-h3]'); if (!t) return;
    e.preventDefault();
    var k = t.dataset.h3, i = +t.dataset.i, focus = null;
    if (k === 'fjern-vare') {
      if (!FV) return;
      var key = t.dataset.k, idx = -1;
      FV.lines.forEach(function (l, n) { if (l.key === key) idx = n; });
      if (idx < 0) return;
      FV.removed.push(FV.lines[idx]); FV.lines.splice(idx, 1);
      spFaste();
      var li = ov && ov.querySelectorAll('[data-testid="fv3-fjern"]');
      if (li && li.length) try { li[Math.min(idx, li.length - 1)].focus(); } catch (x) { }
      return;
    }
    if (!H3) return;
    if (k === 'fjern-navn') {
      SP().removeDetail().then(function (ok) { if (ok && ov) { H3 = h3Load(); spHusstand('[data-testid="hs3-legg-navn"]'); } });
      return;
    }
    h3Sync();
    if (k === 'navn-pa') { H3.persons = HH().reconcile(H3.persons, H3.people); H3.mode = 'navn'; focus = '[data-testid="hs3-navn"]'; }
    else if (k === 'bare-antall') { H3.people = HH().peopleOf(H3.persons); H3.mode = 'enkel'; focus = '[data-testid="hs3-legg-navn"]'; }
    else if (k === 'person-pluss') { if (H3.persons.length < 36) H3.persons.push({ name: '', age: null, kind: 'voksen' }); focus = '[data-testid="hs3-person"]:last-of-type [data-testid="hs3-navn"]'; }
    else if (k === 'fjern-person') { H3.persons.splice(i, 1); focus = '[data-testid="hs3-legg-person"]'; }
    else if (k === 'dyr-sporr') { H3.petAsk = true; focus = '[data-testid="hs3-dyr-hund"]'; }
    else if (k === 'dyr') { if (H3.pets.length < 12) H3.pets.push({ type: t.dataset.type }); H3.petAsk = false; focus = '[data-testid="hs3-legg-dyr"]'; }
    else if (k === 'dyr-avbryt') { H3.petAsk = false; focus = '[data-testid="hs3-legg-dyr"]'; }
    else if (k === 'fjern-dyr') { H3.pets.splice(i, 1); focus = '[data-testid="hs3-legg-dyr"]'; }
    else return;
    var sc = ov ? ov.querySelector('.v5-in') : null, top = sc ? sc.scrollTop : 0;
    spHusstand(focus);
    if (k !== 'person-pluss' && k !== 'dyr-sporr') { var sc2 = ov && ov.querySelector('.v5-in'); if (sc2) sc2.scrollTop = top; }
  }, true);
  document.addEventListener('input', function (e) {
    var t = e.target; if (!H3 || !t || !t.closest || !t.closest('.v5')) return;
    if (t.dataset.h3i != null) { var p = H3.persons[+t.dataset.h3i]; if (p) p.name = t.value; return; }
    if (t.dataset.h3a != null) {
      var q = H3.persons[+t.dataset.h3a]; if (!q) return;
      var v = t.value.replace(/[^0-9]/g, ''); if (v !== t.value) t.value = v;
      q.age = HH().cleanAge(v);
      if (q.age != null && q.age >= 1) q.kind = HH().kindOf(q.age);   // gruppen huskes også om alderen viskes ut igjen
      var row = t.closest('.hs3-p'); if (row) row.classList.toggle('voksen', q.age == null && HH().personKind(q) === 'voksen');
      t.placeholder = KIND_PH[q.kind] || 'Voksen';
      var sum = ov && ov.querySelector('[data-testid="sp-sum"]'); if (sum) sum.innerHTML = h3Sum();
      gangRefresh();
    }
  });
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
  var NAMES = { sp: ['Velg retter', '#oppsett/retter'], 4: ['Legg inn noen retter', '#oppsett/4'], 5: ['Velg holdeplasser', '#oppsett/5'], 6: ['Legg inn jobbadresse', '#oppsett/6'], 7: ['Koble til kalenderen', '#oppsett/7'] };
  function naApply() {
    var na = document.querySelector('[data-testid="na"]'); if (!na) return;
    var done = get(K.done, false), nn = get(K.notnow, { day: '', n: 0 });
    var card = !done && spEligible() === true && nn.day !== today() && (nn.n || 0) < 3;   // 0.25.0: bare når det er noe å sette opp
    document.body.classList.toggle('v5-pre', card);
    var el = na.querySelector('.v5-na'), html = '';
    if (card) html = '<div class="v5-card" data-testid="v5-na-tom"><h3>Sett opp hjemmet</h3><p class="hint">Velg noen retter, så fyller vi uka og handlelista.</p>' +
      B('primary block', '#oppsett/husstand', 'Kom i gang', 'v5-kom-i-gang') + '<a href="#" class="btn ghost block" data-v5="ikke-na" data-testid="v5-ikke-na">Ikke nå</a></div>';
    else if (done) {
      var sk = firstSkipped();   // bare første hoppede steg, én gang
      var spH = get(SPK.hopp, false) && spEligible() === true;   // 0.25.0: «Hopp over» i oppsettet → «Velg retter» til husstanden har retter
      if (spH) sk = 'sp';
      if (spKalShow()) sk = null;   // én ting av gangen: kalenderforslaget først
      // 0.18.12: påminnelsen har «Ikke nå». Avvist → borte resten av dagen (lagres på telefonen); etter tre avvisninger kommer den ikke igjen.
      var ro = get(K.remOff, { day: '', n: 0 });
      if (sk && ro.day !== today() && (ro.n || 0) < 3) html = '<div class="v5-minn-rad" data-testid="v5-minn-rad"><a class="na-fortsett" href="' + NAMES[sk][1] + '" data-testid="v5-minn">' + NAMES[sk][0] + '\u00a0<i aria-hidden="true">›</i></a>' +
        '<a href="#" class="btn ghost v5-minn-x" data-v5="minn-ikke-na" data-testid="v5-minn-ikke-na">Ikke nå</a></div>';
    }
    na.classList.toggle('v5-retter-minn', /data-testid="v5-minn"/.test(html) && /#oppsett\/(4|retter)/.test(html));   // 0.18.13: påminnelsen «Legg inn noen retter» og «Legg inn første rett» står ikke samtidig – påminnelsen vinner
    if (!html) { if (el) el.remove(); }
    else if (!el || el.getAttribute('data-h') !== html) { if (!el) { el = document.createElement('div'); el.className = 'v5-na'; } el.innerHTML = html; el.setAttribute('data-h', html); if (el.parentNode !== na || na.firstChild !== el) na.insertBefore(el, na.firstChild); }
    var tom = na.querySelector('[data-testid="na-avg-tom"]');
    if (tom && done && !(api().homeAddress && api().homeAddress()) && chosen().indexOf('buss') >= 0 && !tom.getAttribute('data-v5')) {
      tom.setAttribute('data-v5', '1'); tom.innerHTML = '<a href="#oppsett/ark-2" data-testid="v5-legg-adresse">Legg inn adressen for å se avganger\u00a0›</a>';
    }
    var lb = na.querySelector('.na-lbl'); if (lb && !lb.classList.contains('v5-mid') && /Middag i dag/.test(lb.textContent)) lb.classList.add('v5-mid');
    spKalApply(na);
  }
  // 0.25.0: «Se avtalene i uka?» på Nå – bare i en husstand, tidligst neste gang appen åpnes etter at startpakken er fullført, til det er avklart («Koble til kalender» / «Ikke nå»).
  // Ikke når husstanden allerede har en kalender. Under datoen, over dagens middag (som i na-kalenderforslag.png).
  var spKindSeen = false;   // enhetsspørsmålet har vært ubesvart i denne økten
  document.addEventListener('knaggen-enhet-spor', function () {
    spKindSeen = true;
    var el = document.querySelector('.sp-kal-wrap'); if (el) el.remove();
  });
  function spKalShow() {
    if (!get(K.done, false) || get(SPK.kal, null) !== 'vis') return false;
    if (!(SP() && SP().inHousehold && SP().inHousehold())) return false;   // aldri i lokal modus
    // 0.25.0 (Trude/Sigurd): én ting av gangen. Står «Hvem sin enhet er dette?» ubesvart, venter forslaget; og har enhetsspørsmålet
    // vært der i denne økten (besvart eller «Senere»), kommer forslaget først neste gang appen åpnes.
    if (SP().kindPending && SP().kindPending()) spKindSeen = true;
    if (spKindSeen) return false;
    var c = SP() && SP().calCount ? SP().calCount() : null;
    return !(c > 0);
  }
  var SP_KAL = '<div class="sp-kal" data-testid="sp-kal-forslag" role="region" aria-label="Forslag: kalender"><p class="sp-kal-t">Se avtalene i uka?</p>' +
    '<p class="sp-kal-m">Koble til kalenderen, så vises de her og i ukeplanen. Du kan gjøre det senere også.</p><div class="sp-kal-acts">' +
    '<button type="button" class="btn" data-spk="kal-ikke" data-testid="sp-kal-ikke-na">Ikke nå</button>' +
    '<button type="button" class="btn primary" data-spk="kal-koble" data-testid="sp-kal-koble">Koble til kalender</button></div></div>';
  function spKalApply(na) {
    var el = na.querySelector('.sp-kal-wrap');
    if (!spKalShow()) { if (el) el.remove(); return; }
    var dato = na.querySelector('[data-testid="na-dato"]');
    if (el && (dato ? el.previousElementSibling === dato : true)) return;
    if (!el) { el = document.createElement('div'); el.className = 'sp-kal-wrap'; el.innerHTML = SP_KAL; }
    if (dato && dato.parentNode) dato.parentNode.insertBefore(el, dato.nextSibling); else na.insertBefore(el, na.firstChild);
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
  var mo = new MutationObserver(function () { spHdr(); naApply(); hsApply(); if (!spAutoDone) spAuto(); });
  function start() { mo.observe(document.body, { childList: true, subtree: true }); spHdr(); naApply(); hsApply(); render(); spAuto(); }
  document.addEventListener('knaggen-startpakke', function () { spHdr(); naApply(); if (!spAutoDone) spAuto(); });   // 0.25.0: husstandens retter er lest fra serveren
  if (!get(K.done, false) && (!location.hash || location.hash === '#' || location.hash === '#uke')) location.replace('#kjokken');
  window.addEventListener('hashchange', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
