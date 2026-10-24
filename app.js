/* Knaggen (arbeidsnavn Ukeshandel) v0.17.0 — ukeplan for middager + handleliste, delt i husstanden via Firebase.
 * Uten Firebase-oppsett (eller før husstand er opprettet) lagres alt lokalt i nettleseren som før.
 */
(function () {
  'use strict';
  // v0.16: var appen brukt før denne versjonen? Leses før noe skrives til localStorage («Nytt i Knaggen» ved aller første åpning: nei).
  var USED_BEFORE = (function () { try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k !== 'knaggen:sett-versjon' && /^(ukeshandel|knaggen)[:_-]/.test(k)) return true; } } catch (e) { /* ignorer */ } return false; })();

  var STORAGE_KEY = 'ukeshandel:v1';
  var HH_KEY = 'ukeshandel:household';            // { hid, secret, core_done, migrated }
  var ONBOARD_KEY = 'ukeshandel:onboarding';      // 'dismissed' = delingstilbudet er avvist («Ikke nå»), vises ikke igjen
  var MIRROR_PREFIX = 'ukeshandel:hh-mirror:';    // siste kjente husstandsdata (rask oppstart)
  var WELCOME_KEY = 'ukeshandel:welcomeDone';     // v0.6.2: '1' = velkomstkortet er lukket / første middag er valgt (per telefon)
  var DATA_VERSION = 1;   // holdes på 1 så eldre app-versjoner ikke nullstiller data
  var SCHEMA = 4;         // intern skjemaversjon for lokale data (migreres ved lasting). v0.10: 4 = felles handleliste
  var AISLES = ['Frukt/grønt', 'Kjøl', 'Meieri', 'Frys', 'Tørrvare', 'Hus'];   // v0.10: Meieri som egen avdeling
  // v0.10 (spec punkt 2): én felles handleliste. Den lagres under en fast «uke»-nøkkel (lists/0000-00-00 og extras med
  // week = 0000-00-00), så reglene for lists/extras (isDate) ikke må endres og eldre versjoner (som bare leser uker fra og
  // med 8 uker tilbake) aldri ser den. Avkrysningstidspunktet lagres som checked[vare + '#tid'] (ms).
  var LIST_KEY = '0000-00-00';
  var TID_SUFFIX = '#tid';
  var DONE_TTL = 3 * 864e5;                       // avkryssede varer slettes for godt 3 dager etter avkryssing
  var MIGRATED_MARK = 'v010:migrert';             // adjust[MIGRATED_MARK] = 1 når de gamle ukelistene er flyttet inn
  var LEFT_KEY = 'ukeshandel:left';               // v0.10: [{ hid, at }] husstander denne telefonen har forlatt (Start på nytt)
  // v0.10 (spec punkt 6): meierivarer. Lagret avdeling er fortsatt «Kjøl» for disse (eldre versjoner kjenner ikke Meieri),
  // men de vises under Meieri – også varer som allerede ligger i lista og i rettene.
  var DAIRY_RE = /^(melk|helmelk|lettmelk|lett melk|ekstra lett melk|skummet melk|skummetmelk|kulturmelk|kefir|cultura|biola|syrnet melk|sjokolademelk|yoghurt|yogurt|yoghurt naturell|gresk yoghurt|vaniljeyoghurt|rømme|lettrømme|seterrømme|crème fraîche|creme fraiche|smør|meierismør|fløte|matfløte|kremfløte|kaffefløte|lettfløte|kesam|skyr|kvarg|cottage cheese|ost|revet ost|hvitost|gulost|norvegia|jarlsberg|brunost|geitost|smøreost|kremost|fetaost|feta|mozzarella|parmesan|cheddar|cheddar i skiver|ost i skiver|halloumi|ricotta|mascarpone)$/;
  var AISLE_LABELS = { 'Hus': 'Husholdning' };
  var UNITS = ['stk', 'g', 'kg', 'ml', 'dl', 'l', 'ss', 'ts', 'pk', 'boks', 'glass', 'beger', 'flaske', 'fedd', 'bunt', 'kartong', 'rull', 'pose'];   // v0.7: kartong/rull/pose sist
  var DAY_NAMES = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
  var DAY_SHORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
  // v0.4.3b: filtervelgeren (Alle / Middag / Faste varer) er fjernet og erstattet av sorteringsvelgeren.
  // v0.4.3c: vises som «Matrett / Plassering» (i den rekkefølgen). De interne verdiene og localStorage-nøkkelen er de
  // samme som i v0.4.3b ('kilde' = Matrett, 'butikk' = Plassering), så lagrede valg beholdes uten migrering.
  // Standard er fortsatt 'butikk' (Plassering), som før.
  var SORTS = [['kilde', 'Matrett', 'Sorter etter matrett'], ['butikk', 'Plassering', 'Sorter etter plassering i butikken']];
  var SORT_KEY = 'ukeshandel:sort';               // 'butikk' | 'kilde' – huskes per telefon, synkes ikke
  var FAST_PREFIX = 'fast:';                      // v0.4.3b: adjust["fast:<fast vare-id>"] = 1 på lista / -1 ikke
  // v0.4.3b: faste varer er med bare når de er valgt for uka. Uker FØR denne datoen (til og med uke 40 2026, uka
  // v0.4.3b ble tatt i bruk) beholder den gamle oppførselen til noen velger: alle aktive faste varer er med, så ingenting
  // forsvinner midt i en handletur. Fra uke 41 er ingen faste varer med før de velges.
  var STAPLES_OPTIN_FROM = '2026-10-05';
  var SUNDAY_EVENING_HOUR = 17;  // fra søndag kl. 17 regnes inneværende uke som «over for i dag»
  // v0.11 testkrok (som KNAGGEN_SHOW_DONE): eldre testsuiter kjører med v0.10-oppsettet av Uke (dagens velger, Bytt og
  // Hvem spiser rett i raden; Fyll/Tøm uka synlige), den synlige sorteringsvelgeren og åpne Husstand-seksjoner.
  var V010_LAYOUT = !!window.KNAGGEN_V010_LAYOUT;
  var UNDO_MS = 8000;             // hvor lenge «Angre» vises etter «Fjern avkrysning»
  // I Firestore lagres avkrysning som checked[vare] = true (som før, så eldre versjoner forstår den),
  // og mengden varen hadde da den ble krysset av i checked[vare + QTY_SUFFIX] (tall, ellers false).
  var QTY_SUFFIX = '#mengde';

  var U = window.UkeshandelUnits;
  var BASIS_PREFIX = 'basis:';                 // enheter og pakninger (units.js)
  var main = document.getElementById('main');
  var state = null;
  var memoryOnly = false;
  var hadLocalData = false;
  var ui = { weekOffset: 0, weekTouched: false, staplesOpen: false, addOpen: false, welcomeClosed: false, welcomeShown: false, sort: lsGet(SORT_KEY) === 'kilde' ? 'kilde' : 'butikk', notice: '', justCreated: false, busy: false, error: '', fvOpenId: null, fvOpenAisle: null, fvQ: '', hsDayDate: null, hsSheet: null };   // v0.7 fv* / v0.8 hs*
  var Sync = window.UkeshandelSync || null;
  var hh = null;             // husstandsinfo når vi er i husstandsmodus
  var syncReady = null;      // promise: SDK lastet, innlogget, medlemskap sjekket
  var syncStatus = { pending: false, fromCache: true, failed: false, connecting: false };
  // v0.6.1 (spec v0.6.1 punkt 5): mens husstanden kobler til første gang (ingen svar fra serveren ennå) vises
  // «Kobler til …», ikke «Frakoblet». Kommer det ikke svar innen CONNECT_GRACE_MS, vises «Frakoblet» som før.
  var CONNECT_GRACE_MS = 10000, connectTimer = null;

  /* ---------- Hjelpere ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // v0.11: tid i to deler. minutes = aktiv tid (ved benken), passiveMinutes/passiveKind = passiv tid (ovn/koking/heving).
  var PASSIVE_LABEL = { ovn: 'i ovnen', koking: 'koketid', heving: 'heving' };
  function passiveOf(r) { var p = r && typeof r.passiveMinutes === 'number' && r.passiveMinutes > 0 ? Math.round(r.passiveMinutes) : 0; return p && PASSIVE_LABEL[r.passiveKind] ? p : 0; }
  // «15 min (+30 min i ovnen)»; passiv tid på 0 vises ikke. parts = { a, p } for egen typografi.
  function timeText(r, parts) {
    if (!r || !r.minutes) return '';
    var a = r.minutes + ' min', p = passiveOf(r) ? '(+' + passiveOf(r) + ' min ' + PASSIVE_LABEL[r.passiveKind] + ')' : '';
    if (parts) return { a: a, p: p };
    return a + (p ? ' ' + p : '');
  }
  function timeHtml(r) { var t = timeText(r, true); return t ? '<b>' + esc(t.a) + '</b>' + (t.p ? ' <span class="tp">' + esc(t.p) + '</span>' : '') : ''; }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function normName(s) {
    return String(s || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function cap(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function aisleLabel(a) { return AISLE_LABELS[a] || a; }
  function normAisle(a) {
    var n = normName(a);
    if (n === 'hus' || n === 'husholdning' || n === 'hus (ikke mat)') return 'Hus';
    if (n === 'meieri') return 'Meieri';
    for (var i = 0; i < AISLES.length; i++) if (normName(AISLES[i]) === n) return AISLES[i];
    return 'Tørrvare';
  }
  function isDairy(name) { return DAIRY_RE.test(normName(name)); }
  // v0.10: avdelingen en vare VISES i (Kjøl + meierinavn → Meieri).
  function itemAisle(name, aisle) {
    var a = normAisle(aisle);
    return a === 'Kjøl' && isDairy(name) ? 'Meieri' : a;
  }
  // v0.10: avdelingen som LAGRES: Meieri for en meierivare lagres som Kjøl (eldre versjoner viser den da under Kjøl).
  function storeAisle(name, aisle) {
    var a = normAisle(aisle);
    return a === 'Meieri' && isDairy(name) ? 'Kjøl' : a;
  }
  function parseQty(v) {
    if (v == null) return null;
    v = String(v).trim().replace(',', '.');
    if (v === '') return null;
    var n = Number(v);
    return isFinite(n) && n >= 0 ? n : null;
  }
  function round3(n) { return Math.round(n * 1000) / 1000; }
  function formatQty(q) {
    if (q == null || !isFinite(q)) return '';
    var r = Math.round(q * 100) / 100;
    return String(r).replace('.', ',');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mondayOf(d) {
    var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m;
  }
  function weekDates(offset) {
    var m = mondayOf(new Date());
    m.setDate(m.getDate() + offset * 7);
    var out = [];
    for (var i = 0; i < 7; i++) out.push(isoDate(new Date(m.getFullYear(), m.getMonth(), m.getDate() + i)));
    return out;
  }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function shortDate(iso) { var d = parseIso(iso); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function weekLabel(dates) {
    return 'Uke ' + isoWeek(parseIso(dates[0])) + ' · ' + shortDate(dates[0]) + '–' + shortDate(dates[6]);
  }
  function weekHasDinner(offset) {
    return weekDates(offset).some(function (d) { return !!state.oneoffs[d] || !!(state.week_plan[d] && recipeById(state.week_plan[d])); });
  }
  // Ved åpning: inneværende uke, eller neste uke hvis den er planlagt og det er søndag kveld.
  function defaultWeekOffset() {
    var n = new Date();
    return n.getDay() === 0 && n.getHours() >= SUNDAY_EVENING_HOUR && weekHasDinner(1) ? 1 : 0;
  }
  // v0.6.2: stats (Liste: «5 middager · 29 igjen») står i undertittelen, etter «Denne uka»/«Neste uke»/«Til denne uka».
  function weekNav(dates, stats) {
    var tail = stats ? ' · ' + stats : '';
    return '<div class="week-nav">' +
      '<button type="button" class="icon-btn" data-action="week-prev" aria-label="Forrige uke">‹</button>' +
      '<div class="week-title"><h2>' + esc(weekLabel(dates)) + '</h2>' +
      // v0.4.2: «Til denne uka» bare når man er på en annen uke enn denne og neste (neste uke får en rolig etikett).
      (ui.weekOffset === 0 ? '<span class="sub">' + (stats ? '<span>Denne uka</span>' + tail : 'Denne uka') + '</span>'
        : ui.weekOffset === 1 ? '<span class="sub">' + '<span data-testid="neste-uke">Neste uke</span>' + tail + '</span>'
        : '<button type="button" class="linkbtn" data-action="week-now">Til denne uka</button>' + (stats ? '<span class="sub">' + stats + '</span>' : '')) + '</div>' +
      '<button type="button" class="icon-btn" data-action="week-next" aria-label="Neste uke">›</button></div>';
  }
  function dayName(iso) { return DAY_NAMES[(parseIso(iso).getDay() + 6) % 7]; }
  function optionList(values, selected, emptyLabel, labels) {
    var h = emptyLabel != null ? '<option value="">' + esc(emptyLabel) + '</option>' : '';
    var found = false;
    values.forEach(function (v) {
      if (v === selected) found = true;
      h += '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' +
        esc(labels && labels[v] ? labels[v] : v) + '</option>';
    });
    if (selected && !found) h += '<option value="' + esc(selected) + '" selected>' + esc(selected) + '</option>';
    return h;
  }
  function aisleOptions(selected) { return optionList(AISLES, selected, null, AISLE_LABELS); }
  function unitOptions(selected) { return optionList(UNITS, selected, '–'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  // v0.6.1: toasten ligger rett OVER fanelinja (ikke oppå den), så trykk på fanene alltid bytter fane.
  // action: { label, run } gir en knapp (f.eks. «Angre»). Bare den knappen fanger trykk (CSS pointer-events).
  //
  // v0.6.3 (spec v0.6.3 punkt 1) – generell løsning: toasten ligger aldri oppå noe trykkbart, på noen skjerm.
  //  - Mens toasten vises, ligger den i et eget bånd (#toast-dock): en ugjennomsiktig stripe i full bredde mellom
  //    innholdet og fanelinja (eller en fast lagre-/byttelinje). Båndet er en midlertidig forlengelse av bunnlinja: det
  //    som rulles inn bak det er skjult og kan ikke trykkes (båndet tar trykket og gjør ingenting). Det er dette som gjør
  //    løsningen generell: det finnes ingen skjerm eller rulleposisjon der innhold kan ligge synlig under toasten.
  //  - Siden rulles ikke når båndet kommer (det som var der står stille). Bare hvis elementet brukeren nettopp brukte
  //    (fokus) ville havnet bak båndet, rulles akkurat nok til at det står over det.
  //  - Bunnpolstring (--dock-extra) og scroll-padding (--dock-h/--dock-lift på <html>) gjør at alt kan rulles fram over
  //    båndet, også siste dag/vare/knapp, og at fokus aldri havner bak det.
  //  - «Angre» fanger trykk først når toasten er helt fremme og har stått et øyeblikk (ANGRE_ARM_MS). Et trykk som var på
  //    vei mot noe annet idet toasten dukket opp, treffer båndet – ingenting skjer.
  //  - Mens et ark/vindu (.overlay) er åpent, skjules toast og bånd, og nedtellingen står stille til det lukkes.
  var TOAST_GAP = 8, ANGRE_ARM_MS = 450, TOAST_RESUME_MIN = 3000;
  var toastTimer = null, toastAction = null, armTimer = null, dockOffTimer = null, toastDeadline = 0, toastLeft = null;
  function toastEl() { return document.getElementById('toast'); }
  function dockEl() { return document.getElementById('toast-dock'); }
  function toast(msg, ms, action) {
    if (typeof action === 'function') action = { label: 'Angre', run: action };   // v0.9: v0.8-kall sendte funksjonen direkte
    var t = toastEl(), dock = dockEl();
    t.textContent = '';
    var m = document.createElement('span');
    m.className = 'toast-msg';
    m.textContent = msg;
    t.appendChild(m);
    toastAction = action || null;
    if (action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-act';
      b.setAttribute('data-testid', 'toast-angre');
      b.textContent = action.label;
      t.appendChild(b);
    }
    t.classList.remove('armed');
    t.classList.toggle('has-action', !!action);
    clearTimeout(dockOffTimer); clearTimeout(armTimer);
    if (dock) dock.classList.add('show');
    placeToast();
    t.classList.add('show');
    keepFocusClear();
    if (action) armTimer = setTimeout(function () { if (toastAction === action) t.classList.add('armed'); }, ANGRE_ARM_MS);
    // En ny toast starter alltid synlig; modalCheck() skjuler den igjen hvis et ark faktisk er åpent nå. (Uten dette kunne en
    // toast som ble vist mens arket lukket seg i samme øyeblikk – f.eks. «Mer» › «Fjern avkrysning» – arve under-modal og bli usynlig.)
    t.classList.remove('under-modal'); if (dock) dock.classList.remove('under-modal');
    toastLeft = null;
    startToastTimer(ms || 2500);
    modalCheck();
  }
  function startToastTimer(ms) {
    clearTimeout(toastTimer);
    toastDeadline = Date.now() + ms;
    toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() {
    var t = toastEl(), dock = dockEl();
    clearTimeout(toastTimer); clearTimeout(armTimer);
    toastAction = null; toastLeft = null;
    t.classList.remove('show', 'has-action', 'armed', 'under-modal');
    // Båndet blir stående mens toasten glir ut (0,2 s), så ingenting dukker opp under en halvsynlig toast.
    clearTimeout(dockOffTimer);
    dockOffTimer = setTimeout(function () {
      if (t.classList.contains('show')) return;
      if (dock) dock.classList.remove('show', 'under-modal');
      document.documentElement.style.setProperty('--dock-h', '0px');
      document.documentElement.style.setProperty('--dock-extra', '0px');
    }, 220);
  }
  function toastShowing() { return toastEl().classList.contains('show'); }
  // Båndets plass: rett over fanelinja, eller over den høyeste faste bunnlinja (lagre-linja i skjemaene, byttelinja på
  // Uke) som står der båndet ellers ville ligget. --dock-lift = hvor mye over fanelinja båndet starter.
  function placeToast() {
    var t = toastEl(), nav = document.querySelector('.tabs'), root = document.documentElement;
    if (!nav) return;
    var dockH = Math.max(t.offsetHeight || 0, 48) + 2 * TOAST_GAP;
    var nt = nav.getBoundingClientRect().top, base = nt;
    var bars = main.querySelectorAll('.form-actions:not(.plain), .swap-bar');
    for (var pass = 0; pass < 3; pass++) {
      for (var i = 0; i < bars.length; i++) {
        if (bars[i].offsetParent === null) continue;
        var br = bars[i].getBoundingClientRect();
        if (br.height && br.bottom > base - dockH && br.top < base) base = Math.floor(br.top);
      }
    }
    var lift = Math.max(0, Math.ceil(nt - base));
    root.style.setProperty('--dock-lift', lift + 'px');
    root.style.setProperty('--dock-h', dockH + 'px');
    root.style.setProperty('--dock-extra', Math.max(0, dockH - 72) + 'px');
  }
  // Står elementet brukeren nettopp brukte (fokus) bak båndet, rulles det akkurat fram over det. Ellers står siden stille.
  function keepFocusClear() {
    var a = document.activeElement;
    if (!a || a === document.body || a === main || !main.contains(a)) return;
    var dock = dockEl(); if (!dock) return;
    var top = dock.getBoundingClientRect().top, r = a.getBoundingClientRect();
    // Bare synlige elementer – ellers kan et fokusert felt langt under folden gi stort hopp (v0.8 høyere dagrader)
    if (!r.height || r.bottom <= 0 || r.top >= window.innerHeight) return;
    var dy = Math.ceil(r.bottom - top + TOAST_GAP);
    // maks én skjermhøyde – unngå hopp når fokus er på et stort/feil element
    if (dy > 0 && dy < window.innerHeight * 0.5) window.scrollBy(0, dy);
  }
  var placeQueued = false;
  function queuePlaceToast() {
    if (placeQueued || !toastShowing()) return;
    placeQueued = true;
    requestAnimationFrame(function () { placeQueued = false; if (toastShowing()) placeToast(); });
  }
  window.addEventListener('scroll', queuePlaceToast, { passive: true });
  window.addEventListener('resize', queuePlaceToast);
  // Ark og vinduer (.overlay i <body>): skjul toast + bånd og stopp nedtellingen; fortsett (minst 3 s) når de lukkes.
  function modalCheck() {
    var t = toastEl(), dock = dockEl();
    var open = !!document.querySelector('body > .overlay:not([hidden])');
    if (!toastShowing()) return;
    if (open && toastLeft === null) {
      toastLeft = Math.max(0, toastDeadline - Date.now());
      clearTimeout(toastTimer);
      t.classList.add('under-modal'); if (dock) dock.classList.add('under-modal');
    } else if (!open && toastLeft !== null) {
      var left = Math.max(toastLeft, TOAST_RESUME_MIN);
      toastLeft = null;
      t.classList.remove('under-modal'); if (dock) dock.classList.remove('under-modal');
      placeToast();
      startToastTimer(left);
    }
  }
  if (window.MutationObserver) {
    new MutationObserver(modalCheck).observe(document.body, { childList: true });
    // Ny tegning (f.eks. byttelinja eller lagre-linja dukker opp) → båndet plasseres på nytt i neste bilde.
    new MutationObserver(queuePlaceToast).observe(main, { childList: true, subtree: true });
  }
  toastEl().addEventListener('click', function (e) {
    // Bare et trykk på selve «Angre»-knappen i en synlig, helt fremme toast angrer (spec v0.6.1 punkt 1, v0.6.3 punkt 1).
    var a = toastAction, t = toastEl();
    if (!a || !t.classList.contains('show') || !t.classList.contains('armed') || t.classList.contains('under-modal') ||
        !e.target.closest || !e.target.closest('.toast-act')) return;
    hideToast();
    a.run();
  });

  /* ---------- Lokal lagring og migrering ---------- */

  function freshState() {
    var seed = window.UKESHANDEL_SEED();
    return {
      version: DATA_VERSION,
      schema: SCHEMA,
      household: { id: 'h1', name: 'Husstanden' },
      // v0.11: en ny husstand starter med 0 retter (Matrett-byggeren). Testkrok for de eldre suitene: KNAGGEN_SEED_RECIPES.
      recipes: window.KNAGGEN_SEED_RECIPES ? seed.recipes : [],
      week_plan: {},        // 'YYYY-MM-DD' -> recipe_id | null (tom)
      oneoffs: {},          // 'YYYY-MM-DD' -> engangsmiddag { id, name, ingredients[] }
      marks: {},            // v0.16: 'YYYY-MM-DD' -> 'handlet' | 'rester' (ingrediensene holdes utenfor lista)
      staples: seed.staples,
      checks: {},           // week -> { varenøkkel: true }
      list_items: [],       // generert handleliste (week = mandag), beholdt for eldre versjoner
      list_adjust: {},      // week -> { varenøkkel -> endring i mengde (+/-) }
      list_extras: [],      // engangsvarer lagt til i lista { id, week, name, qty, unit, aisle }
      check_at: {},         // v0.10: varenøkkel -> når den ble krysset av (ms), felles liste
      household_size: { people: null, scale: true, asked: false },  // v0.8
      day_people: {}   // v0.8: date -> { voksen, barn, smabarn } avvik
    };
  }
  function emptyState() {
    var s = freshState();
    s.recipes = []; s.staples = [];
    return s;
  }

  // Oppgraderer lagrede data til gjeldende skjema uten å miste noe.
  function migrate(s, raw) {
    var from = s.schema || 1;
    if (from < SCHEMA && raw) {
      var bk = STORAGE_KEY + ':backup-schema' + from;
      if (!lsGet(bk)) lsSet(bk, raw);
    }
    s.version = DATA_VERSION;
    s.household = s.household || { id: 'h1', name: 'Husstanden' };
    s.recipes = Array.isArray(s.recipes) ? s.recipes : [];
    s.week_plan = s.week_plan && typeof s.week_plan === 'object' ? s.week_plan : {};
    s.oneoffs = s.oneoffs && typeof s.oneoffs === 'object' ? s.oneoffs : {};
    s.marks = s.marks && typeof s.marks === 'object' ? s.marks : {};
    s.staples = Array.isArray(s.staples) ? s.staples : [];
    s.list_items = Array.isArray(s.list_items) ? s.list_items : [];
    s.list_adjust = s.list_adjust && typeof s.list_adjust === 'object' ? s.list_adjust : {};
    s.list_extras = Array.isArray(s.list_extras) ? s.list_extras : [];
    s.household_size = s.household_size && typeof s.household_size === 'object'
      ? { people: s.household_size.people || null, scale: s.household_size.scale !== false, asked: !!s.household_size.asked }
      : { people: null, scale: true, asked: false };
    s.day_people = s.day_people && typeof s.day_people === 'object' ? s.day_people : {};
    s.check_at = s.check_at && typeof s.check_at === 'object' ? s.check_at : {};
    // Eldste v0-format: avkrysning lå i list_items + list_week uten week per vare.
    if (s.list_week) {
      s.list_items.forEach(function (it) { if (!it.week) it.week = s.list_week; });
      delete s.list_week;
    }
    // Skjema 3: avkrysning lagres per uke og vare (checks), avledet fra list_items første gang.
    if (from < 3 || !s.checks || typeof s.checks !== 'object') {
      var checks = s.checks && typeof s.checks === 'object' ? s.checks : {};
      s.list_items.forEach(function (it) {
        if (it && it.week && it.key && it.checked) { (checks[it.week] = checks[it.week] || {})[it.key] = true; }
      });
      s.checks = checks;
    }
    // Avdelinger normaliseres (f.eks. «hus» -> «Hus», som vises som «Husholdning»).
    s.recipes.forEach(function (r) {
      r.ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
      r.ingredients.forEach(function (i) { i.aisle = normAisle(i.aisle); });
    });
    s.staples.forEach(function (x) { x.aisle = normAisle(x.aisle); });
    s.list_extras.forEach(function (x) { x.aisle = normAisle(x.aisle); });
    Object.keys(s.oneoffs).forEach(function (d) {
      var o = s.oneoffs[d];
      if (!o || !o.name) { delete s.oneoffs[d]; return; }
      o.ingredients = Array.isArray(o.ingredients) ? o.ingredients : [];
      o.ingredients.forEach(function (i) { i.aisle = normAisle(i.aisle); });
    });
    s.list_items.forEach(function (i) { i.aisle = normAisle(i.aisle); });
    s.schema = SCHEMA;
    return s;
  }

  function loadLocal() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { memoryOnly = true; }
    if (raw) {
      var s = null;
      try { s = JSON.parse(raw); } catch (e) { s = null; }
      if (s && typeof s === 'object' && Array.isArray(s.recipes)) {
        hadLocalData = true;
        var fromSchema = s.schema;
        state = migrate(s, raw);
        // v0.9: lagre igjen når skjemaet faktisk ble migrert (v0.8 sluttet å lagre her, så migreringen ble først skrevet ved neste endring)
        if (fromSchema !== SCHEMA) save();
        // v0.8: merk Knaggen-retter i minnet; ikke skriv localStorage på nytt bare for origin/servings
        // (oppgraderingstester og «egne data»-sjekk skal ikke se en omskrivning ved første last)
        tagKnaggenRecipes();
        // v0.10: skjema 4 – de gamle ukelistene flyttes én gang inn i den felles lista
        if ((fromSchema || 1) < 4 && !sharedMigrated()) { try { applySharedMigration(sharedMigration()); } catch (e) { /* ignorer */ } }
        return state;
      }
      // Uleselige data: ta vare på dem før vi starter på nytt.
      lsSet(STORAGE_KEY + ':corrupt-' + Date.now(), raw);
    }
    state = freshState();
    tagKnaggenRecipes();
    save();
    return state;
  }
  // v0.4.6: appen åpner rett med startdata. «Egne data» = noe som avviker fra startdataene (retter, faste varer, uker,
  // engangsmiddager, avkrysning, +/-, egne varer). Brukes i tekstene om hva som flyttes inn / tas vare på.
  function meaningful(st) {
    // v0.10: interne merker (v010:migrert, v010:slettes) er ikke egne data
    var clean = function (o) { var r = {}; Object.keys(o || {}).sort().forEach(function (k) { if (k.indexOf('v010:') !== 0 && o[k] && !(typeof o[k] === 'object' && !Object.keys(o[k]).length)) r[k] = o[k]; }); return r; };
    var byWeek = function (o) { var r = {}; Object.keys(o || {}).sort().forEach(function (w) { var c = clean(o[w]); if (Object.keys(c).length) r[w] = c; }); return r; };
    // v0.8: origin/servings/scale er merking – teller ikke som «egne data» (ellers forsvinner velkomstkortet)
    var recipes = (st.recipes || []).map(function (r) {
      return { id: r.id, name: r.name, minutes: r.minutes, note: r.note, ingredients: r.ingredients };
    });
    return JSON.stringify([recipes, st.staples, clean(st.week_plan), clean(st.oneoffs), byWeek(st.checks), byWeek(st.list_adjust), st.list_extras || []]);
  }
  function hasOwnData() {
    if (hh) return false;
    try {
      var m = meaningful(state), f = freshState();
      if (m === meaningful(f)) return false;
      // v0.11: en telefon fra før v0.11 som bare har de gamle startrettene, regnes fortsatt som ny
      f.recipes = window.UKESHANDEL_SEED().recipes;
      return m !== meaningful(f);
    } catch (e) { return true; }
  }
  // v0.4.6: «etter første plan» = minst én middag (rett eller engangsmiddag) i en uke.
  function hasPlan() {
    if (Object.keys(state.oneoffs || {}).some(function (d) { return state.oneoffs[d]; })) return true;
    return Object.keys(state.week_plan || {}).some(function (d) { return state.week_plan[d] && recipeById(state.week_plan[d]); });
  }
  // v0.6.2 (spec v0.6.2 punkt 1): velkomstkortet vises bare for en ny bruker – ingen middag i noen uke, ingen egne data
  // (alt er som startdataene), ikke i husstand, og ikke lukket før. Eksisterende brukere med data ser det aldri, og for
  // dem skrives ingenting nytt i localStorage. Velger en ny bruker sin første middag (kortet har vært vist, eller appen ble
  // installert nå), lagres det at kortet er ferdig, så det aldri kommer tilbake (heller ikke om uka tømmes senere).
  function showWelcome() {
    if (hh || ui.welcomeClosed || lsGet(WELCOME_KEY) === '1') return false;
    if (hasPlan()) {
      if (ui.welcomeShown || !hadLocalData) lsSet(WELCOME_KEY, '1');
      return false;
    }
    if (hasOwnData()) return false;
    ui.welcomeShown = true;
    return true;
  }
  function showShareCard() {
    return !hh && !!syncMode() && lsGet(ONBOARD_KEY) !== 'dismissed' && hasPlan();
  }
  // Lagrer lokalt (bare i lokal modus – i husstandsmodus ligger dataene i Firestore).
  function save() {
    if (memoryOnly || hh) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state, function (k, v) { return k === "marks" && this === state && v && !Object.keys(v).length ? undefined : v; })); }
    catch (e) { memoryOnly = true; toast('Klarte ikke å lagre i nettleseren'); }
  }
  function recipeById(id) {
    for (var i = 0; i < state.recipes.length; i++) if (state.recipes[i].id === id) return state.recipes[i];
    return null;
  }
  function sortedRecipes() {
    return state.recipes.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'nb'); });
  }
  // wide: også varer lagt til i lista og rettbiblioteket (brukes bare for å gjette avdeling i «Legg til vare»).
  function knownIngredient(name, wide) {
    var n = normName(name);
    if (!n) return null;
    for (var i = 0; i < state.recipes.length; i++) {
      var ings = state.recipes[i].ingredients;
      for (var j = 0; j < ings.length; j++) if (normName(ings[j].name) === n) return ings[j];
    }
    for (var k = 0; k < state.staples.length; k++) if (normName(state.staples[k].name) === n) return state.staples[k];
    if (!wide) return null;
    for (var x = 0; x < state.list_extras.length; x++) if (normName(state.list_extras[x].name) === n) return state.list_extras[x];
    var lib = window.UKESHANDEL_LIBRARY || [];
    for (var l = 0; l < lib.length; l++) {
      var li = lib[l].ingredients || [];
      for (var q = 0; q < li.length; q++) if (normName(li[q].name) === n) return li[q];
    }
    return null;
  }
  // v0.6.1 (spec v0.6.1 punkt 4): innebygd gjetteliste for vanlige varer som ikke står i egne retter, faste varer
  // eller rettbiblioteket. Brukes etter knownIngredient (egne data vinner), før standarden Tørrvare.
  // v0.10: meierivarer går i «Meieri» (regelen øverst); pålegg går i «Kjøl»; ikke-mat går i «Hus» (vises som «Husholdning»).
  var AISLE_GUESS = [
    ['Meieri', DAIRY_RE],   // v0.10
    // v0.7.1: eksakte treff først (Trude: agurk/paprika/skinke/kaviar/rundstykker/matpakkepapir)
    ['Frukt/grønt', /^(agurk|agurker|paprika|paprikaer)$/],
    ['Kjøl', /^(skinke|kokt skinke|kaviar|macks kaviar|påleggskaviar)$/],
    ['Frys', /^(rundstykker|rundstykke)$/],
    ['Hus', /^(matpakkepapir|matpakke papir|smørbrødpapir|vokspapir)$/],
    ['Hus', /^(tannkrem|tannbørste|tanntråd|munnskyll|bleie|bleier|våtserviett|serviett|tørkerull|kjøkkenrull|dopapir|toalettpapir|papirhåndkle|sjampo|shampo|balsam|såpe|håndsåpe|dusjsåpe|dusjgel|deodorant|deo|bodylotion|solkrem|barberblad|barberhøvel|bind|tampong|truseinnlegg|plaster|vatt|bomullspinner|q-tips|oppvaskmiddel|oppvasktabletter|maskinoppvask|vaskemiddel|tøyvask|tøymykner|flekkfjerner|klut|svamp|grillkull|tennvæske|søppelpose|bæreposer|fryseposer|plastfolie|aluminiumsfolie|bakepapir|matpapir|matpakkepapir|smørbrødpapir|vokspapir|lyspærer|lyspære|batteri|batterier|stearinlys|telys|fyrstikker|kattesand|kattemat|hundemat)$/],
    ['Hus', /(tannkrem|bleier|bleie|såpe|sjampo|vaskemiddel|oppvask|søppelpose|serviett|tørkerull|dopapir|batteri)/],
    // v0.6.3 (spec v0.6.3 punkt 3): frysevarer før Kjøl-reglene, så «frossen …»/«frosne …» og frysepizza alltid går i Frys.
    // (Frys har vært en avdeling siden v0, så eldre versjoner viser disse varene under Frys som før.)
    ['Frys', /^(rundstykker|rundstykke|grandiosa|grandiosa .*|.* grandiosa|big one|big one .*|frysepizza|frossenpizza|frossen pizza|pizza|dypfryst pizza|fiskepinner|fiskepinne|fiskeburger|fiskeburgere|fiskegrateng|fiskeboller frosne|pommes frites|pommes|potetbåter|rösti|frosne bær|frosne grønnsaker|grønnsaksblanding|wokgrønnsaker|wokblanding|frosne erter|erter|maiskorn frosne|frossen spinat|is|iskrem|isbiter|ispinner|ispinne|saftis|kroneis|sorbet|softis|nuggets|kyllingnuggets|vårruller|kyllingvinger frosne)$/],
    ['Frys', /(^|\s)(frossen|frosne|frosset|fryst|dypfryst)(\s|$)|grandiosa|frysepizza|frossenpizza|fiskepinne|iskrem|(vanilje|sjokolade|jordbær|familie|pinne|saft|mango|kokos|nøtte|krone)-?is$/],
    ['Kjøl', /^(yoghurt|yogurt|kefir|kulturmelk|cultura|skyr|kesam|kvarg|crème fraîche|creme fraiche|smøreost|kremost|brunost|geitost|gulost|norvegia|jarlsberg|ost|mozzarella|fetaost|feta|pålegg|leverpostei|servelat|salami|skinke|kaviar|juice|appelsinjuice|eplejuice|smoothie|syrnet melk|sjokolademelk|iskaffe)$/],
    ['Kjøl', /(yoghurt|kefir|skyr|kesam|kvarg|ost$|melk$|pålegg|postei)/],
    ['Frys', /^(is|iskrem|isbiter|frossenpizza|frossen pizza|frosne bær|frosne grønnsaker|fiskegrateng|pommes frites)$/],
    ['Frukt/grønt', /^(eple|epler|pære|pærer|appelsin|appelsiner|klementin|klementiner|mandarin|mandariner|druer|banan|kiwi|mango|melon|vannmelon|ananas|jordbær|bringebær|blåbær|plommer|nektarin|fersken|lime|salat|tomater|tomat|agurk|agurker|paprika|grønnkål|reddik|bønnespirer|urter|gulrot|gulrøtter|løk|rødløk)$/],
    // v0.7.1 (Trude): flere vanlige gjettebommer
    ['Kjøl', /^(skinke|kokt skinke|skinke i skiver|kaviar|macks kaviar|påleggskaviar|leverpostei|servelat|salami|bacon)$/],
    ['Frys', /^(rundstykker|rundstykke|baguetter|ciabatta)$/],   // v0.7.1: pizzabunn forblir Tørrvare (v0.6.3)
    ['Hus', /^(matpakkepapir|matpakke papir|smørbrødpapir|smørbrødpapir|vokspapir)$/],
    // v0.12.1: vanlige oppskriftsvarer fra «Hent oppskrift» (friske urter, egg, kjøtt, frukt/grønt) – sist, så alt over vinner
    ['Frukt/grønt', /^(estragon|kjørvel|koriander|mynte|gressløk|rosmarin|salvie|timian|oregano|basilikum|persille|dill|sitron|sitroner|lime|limer|ingefær|chili|rød chili|sjalottløk|vårløk|purre|hvitløk|bakepotet|bakepoteter|potet|poteter|sopp|sjampinjong|champignon|squash|aubergine|brokkoli|blomkål|spinat|ruccola|selleri|stangselleri|asparges|aspargesbønner|avokado|fennikel|rødbete|rødbeter|søtpotet|mais|kål|hodekål|rosenkål)$/],
    ['Kjøl', /^(egg|eggeplomme|eggeplommer|eggehvite|eggehviter|tomahawk|entrecote|indrefilet|ytrefilet|biff|kjøttdeig|karbonadedeig|kyllingfilet|kylling|kyllinglår|svinekotelett|koteletter|svinefilet|lammekoteletter|laks|laksefilet|torsk|torskefilet|reker|pølser|kjøttpølse|chorizo|pancetta)$/]
  ];
  function guessAisle(name) {
    var n = normName(name);
    if (!n) return null;
    for (var i = 0; i < AISLE_GUESS.length; i++) if (AISLE_GUESS[i][1].test(n)) return AISLE_GUESS[i][0];
    return null;
  }
  // v0.7 (spec v0.7 / Merkevare 4.1): duplikatnøkkel – enkelt flertall, så tomat/tomater og bleie/bleier er samme vare.
  function singularStem(s) {
    s = String(s || '');
    if (/ene$/.test(s) && s.length >= 6) return s.slice(0, -3);
    if (/er$/.test(s) && s.length >= 5) return s.slice(0, -2);
    if (/e$/.test(s) && s.length >= 4) return s.slice(0, -1);
    return s;
  }
  function stapleKey(name) { return singularStem(normName(name)); }
  function findStapleByKey(name, exceptId) {
    var k = stapleKey(name);
    if (!k) return null;
    for (var i = 0; i < state.staples.length; i++) {
      var s = state.staples[i];
      if (exceptId && s.id === exceptId) continue;
      if (stapleKey(s.name) === k) return s;
    }
    return null;
  }
  // v0.7 (Merkevare 4.5): enhetsgjetting for nye faste varer / «Legg til vare». Første treff vinner.
  var UNIT_GUESS = [
    ['l', /^(melk|helmelk|lettmelk|skummet melk|skummetmelk)$/],
    ['kartong', /^(juice|appelsinjuice|eplejuice|fløte|matfløte|matflote)$/],
    ['beger', /^(yoghurt|yogurt|rømme|romme|kesam|skyr|kremost|cottage cheese|cottage)$/],
    ['flaske', /^(oppvaskmiddel|vaskemiddel|tøymykner|toymykner|sjampo|balsam|håndsåpe|handsape|dusjsåpe|dusjsape|såpe|sape|olje|olivenolje|saft|ketchup)$/],
    ['rull', /^(søppelposer|soppelposer|bakepapir|plastfolie|aluminiumsfolie|matpapir)$/],
    ['pose', /^(poteter|gulrøtter|gulrotter|løk|lok|klementiner|mandariner|frosne bær|frosne grønnsaker|rundstykker|boller|chips|nøtter|notter)$/],
    ['boks', /^(hermetiske tomater|tomatbokser|mais|tunfisk|makrell i tomat|kidneybønner|kidneybonner)$/],
    ['pk', /^(dopapir|tørkerull|torkerull|bleier|bleie|våtservietter|vatservietter|kaffe|te|havregryn|pasta|ris|knekkebrød|knekkebrod|smør|smor|pålegg|palegg)$/]
  ];
  function guessUnit(name, aisle) {
    var n = normName(name);
    if (!n) return 'stk';
    for (var i = 0; i < UNIT_GUESS.length; i++) if (UNIT_GUESS[i][1].test(n)) return UNIT_GUESS[i][0];
    var a = aisle || guessAisle(name) || 'Tørrvare';
    return (a === 'Tørrvare' || a === 'Hus') ? 'pk' : 'stk';
  }
  function unitWord(qty, unit) {
    // v0.7.1: «2 bokser», «1 glass»
    if (!unit) return '';
    var n = Number(qty);
    if (!(n > 1)) return unit;
    var plur = { boks: 'bokser', glass: 'glass', pk: 'pk', pose: 'poser', rull: 'ruller', kartong: 'kartonger',
      flaske: 'flasker', beger: 'beger', fedd: 'fedd', bunt: 'bunter', stk: 'stk' };
    return plur[unit] || unit;
  }
  function stapleAmt(s) {
    var q = s.qty != null && s.qty !== '' ? formatQty(s.qty) : '';
    if (!s.unit) return q;
    return q ? (q + ' ' + unitWord(s.qty, s.unit)) : s.unit;
  }
  // v0.7 (Sigurd 2026-10-05): «Som forrige uke» ser tilbake til siste uke som hadde faste varer (f.eks. etter ferie).
  function lastWeekWithFaste(weekKey) {
    // v0.7.1: bare uker der noen faktisk har valgt (eksplisitt fast:<id>), ikke overgangsuker der alle er «på» via legacy.
    var d = parseIso(weekKey);
    for (var i = 1; i <= 52; i++) {
      var prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7 * i);
      var pk = isoDate(mondayOf(prev));
      var adj = state.list_adjust[pk] || {};
      var explicit = false, anyOn = false;
      for (var j = 0; j < state.staples.length; j++) {
        var v = adj[FAST_PREFIX + state.staples[j].id];
        if (v > 0 || v < 0) explicit = true;
        if (v > 0) anyOn = true;
      }
      if (explicit && anyOn) return pk;
    }
    return null;
  }
  function staplesGrouped(list, aisleOf) {
    aisleOf = aisleOf || function (s) { return itemAisle(s.name, s.aisle); };
    return AISLES.map(function (a) {
      var items = list.filter(function (s) { return aisleOf(s) === a; })
        .sort(function (x, y) { return String(x.name).localeCompare(y.name, 'nb'); });
      return { aisle: a, items: items };
    }).filter(function (g) { return g.items.length; });
  }
  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>';
  var ICON_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
  var ICON_REPEAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';

  function knownNamesDatalist() {
    var names = {};
    state.recipes.forEach(function (x) { x.ingredients.forEach(function (i) { names[normName(i.name)] = 1; }); });
    state.staples.forEach(function (s) { names[normName(s.name)] = 1; });
    return '<datalist id="known-ings">' + Object.keys(names).sort(function (a, b) { return a.localeCompare(b, 'nb'); })
      .map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
  }

  /* ---------- Husstand (Firebase) ---------- */

  function syncMode() { return Sync ? Sync.mode() : null; }
  function readHH() {
    try { var v = JSON.parse(lsGet(HH_KEY) || 'null'); return v && v.hid && v.secret ? v : null; } catch (e) { return null; }
  }
  function writeHH(v) { lsSet(HH_KEY, JSON.stringify(v)); }
  function shareLink() {
    var base = location.href.split('#')[0].split('?')[0];
    return base + '#join=' + hh.hid + '.' + hh.secret;
  }
  function oldestWeek() { return weekDates(-8)[0]; }

  function saveMirror() {
    if (!hh) return;
    clearTimeout(saveMirror.t);
    saveMirror.t = setTimeout(function () {
      if (!hh) return;   // v0.17: husstanden ble sluppet i mellomtiden
      var m = {
        recipes: state.recipes, staples: state.staples, week_plan: state.week_plan, oneoffs: state.oneoffs,
        checks: state.checks, list_adjust: state.list_adjust, list_extras: state.list_extras, check_at: state.check_at,
        household_size: state.household_size, day_people: state.day_people
      };
      if (Object.keys(marksOf()).length) m.marks = state.marks;   // v0.16
      if (state.weekday_limit) m.weekday_limit = state.weekday_limit;   // v0.11: bare når grensen er satt (speilet er ellers som før)
      lsSet(MIRROR_PREFIX + hh.hid, JSON.stringify(m));
    }, 300);
  }
  function loadMirror(hid) {
    var s = emptyState();
    try {
      var m = JSON.parse(lsGet(MIRROR_PREFIX + hid) || 'null');
      if (m) Object.keys(m).forEach(function (k) { if (m[k]) s[k] = m[k]; });
    } catch (e) { /* ignorer */ }
    return s;
  }

  // Bytter til husstandsmodus: viser speilet med én gang, kobler til Firestore i bakgrunnen.
  function enterHousehold(info, initialState) {
    hh = info;
    state = initialState || loadMirror(info.hid);
    swapBusy = false; lastDays = [];
    loadSwaps(info.hid);   // v0.4.4
    syncStatus.fromCache = true; syncStatus.failed = false; syncStatus.connecting = true;
    clearTimeout(connectTimer);
    connectTimer = setTimeout(function () { syncStatus.connecting = false; renderSyncStatus(); }, CONNECT_GRACE_MS);
    renderSyncStatus();
    syncReady = Sync.init().then(function () {
      return Sync.isMember(hh.hid).then(function (m) {
        // v0.17: enheten var registrert i husstanden og er ikke lenger medlem = fjernet. Ikke koble til på nytt.
        if (!hh) return;
        if (m === false && lsGet(K17_REG_KEY) === hh.hid) { var e17 = new Error('removed'); e17.k17removed = true; throw e17; }
        if (m === false) return Sync.joinHousehold(hh.hid, hh.secret);
      });
    }).then(function () {
      // Flyttingen ble avbrutt etter at husstanden ble opprettet (f.eks. appen ble lukket): fullfør (idempotent).
      if (!hh.migrated && !hh.joined) return createFromLocal(true);
    }).then(function () {
      subscribeHousehold();
      return Sync;
    });
    syncReady.catch(function (e) {
      syncStatus.failed = true; syncStatus.connecting = false;
      renderSyncStatus();
      if (e && e.k17removed) { if (hh && hh.hid === info.hid) checkRemoved(); return; }
      if (e && e.code === 'permission-denied') {
        if (hh && hh.hid === info.hid) { householdGone(); return; }   // v0.10: slettet av en annen telefon
        toast('Ingen tilgang til husstanden. Åpne invitasjonslenka på nytt.', 5000);
      }
    });
  }

  // Lokalt: checks[uke][vare] = mengde da den ble krysset av (tall) eller true. Se QTY_SUFFIX.
  // v0.10: at = { vare: ms } gir checked[vare + '#tid'] (bare den felles lista). false = feltet slettes (sync.js).
  function toRemoteChecks(map, at) {
    var o = {};
    Object.keys(map).forEach(function (k) {
      var v = map[k];
      o[k] = !!v;
      o[k + QTY_SUFFIX] = typeof v === 'number' && v > 0 ? v : false;
      if (at) o[k + TID_SUFFIX] = v && at[k] ? at[k] : false;
    });
    return o;
  }
  function remoteChecksByWeek(checks, at) {
    var o = {};
    Object.keys(checks || {}).forEach(function (w) {
      var a = null;
      if (w === LIST_KEY) { a = {}; Object.keys(checks[w] || {}).forEach(function (k) { a[k] = (at && at[k]) || Date.now(); }); }
      o[w] = toRemoteChecks(checks[w] || {}, a);
    });
    return o;
  }
  function fromRemoteChecks(m, times) {
    var c = {};
    Object.keys(m).forEach(function (k) {
      if (k.slice(-QTY_SUFFIX.length) === QTY_SUFFIX) return;
      if (k.slice(-TID_SUFFIX.length) === TID_SUFFIX) return;
      if (times && typeof m[k + TID_SUFFIX] === 'number') times[k] = m[k + TID_SUFFIX];
      var v = m[k];
      if (v !== true && !(typeof v === 'number' && v > 0)) return;
      var q = m[k + QTY_SUFFIX];
      c[k] = typeof q === 'number' && q > 0 ? q : (typeof v === 'number' ? v : true);
    });
    return c;
  }

  var unsubscribe = null, weeklyExtras = [], sharedExtras = [], migratingHid = null;
  function extraFromDoc(d) { return { id: d.id, week: d.week, name: d.name, qty: d.qty, unit: d.unit || '', aisle: normAisle(d.aisle), created: d.created }; }
  function maybeMigrateShared() {
    if (!hh || migratingHid === hh.hid || sharedMigrated()) return;
    migratingHid = hh.hid;
    applySharedMigration(sharedMigration());
    remoteChanged();
  }
  function subscribeHousehold() {
    if (unsubscribe) unsubscribe();
    unsubscribe = Sync.subscribe(hh.hid, oldestWeek(), {
      recipes: function (docs, meta) {
        state.recipes = docs.map(function (d) {
          var rr = { id: d.id, name: d.name, minutes: d.minutes == null ? null : d.minutes, note: d.note || '',
            ingredients: (d.ingredients || []).map(function (i) {
              var o = { name: i.name, qty: i.qty == null ? null : i.qty, unit: i.unit || '', aisle: normAisle(i.aisle) };
              if (typeof i.basis === 'boolean') o.basis = i.basis;   // v0.4.3
              return o;
            }) };
          if (d.origin) rr.origin = d.origin;
          if (Array.isArray(d.steps) && d.steps.length) rr.steps = d.steps.filter(function (x) { return typeof x === 'string'; });   // v0.10
          if (d.servings != null) rr.servings = d.servings;
          if (d.scale === false) rr.scale = false;
          // v0.11: passiv tid og merke fra Matrett-byggeren
          if (typeof d.passiveMinutes === 'number') rr.passiveMinutes = d.passiveMinutes;
          if (d.passiveKind) rr.passiveKind = d.passiveKind;
          if (d.lib) rr.lib = d.lib;
          if (d.variant) rr.variant = d.variant;
          if (d.fromLib && typeof d.fromLib === 'object') rr.fromLib = { id: String(d.fromLib.id || ''), variant: String(d.fromLib.variant || '') };
          if (validSource(d.source)) rr.source = d.source;   // v0.12: kildeoppskrift
          return rr;
        });
        if (ui.bring && meta && !meta.fromCache) bringRecipesIn();   // v0.10: «Ta med rettene dine inn?» = Ja
        remoteChanged();
      },
      staples: function (docs) {
        state.staples = docs.sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(b.name, 'nb'); })
          .map(function (d) { return { id: d.id, name: d.name, qty: d.qty == null ? null : d.qty, unit: d.unit || '', aisle: normAisle(d.aisle), active: d.active !== false, order: d.order }; });
        remoteChanged();
      },
      days: function (docs) {
        lastDays = docs;
        applyDays();
        if (!ui.weekTouched && !subscribeHousehold.daysSeen) ui.weekOffset = defaultWeekOffset();
        subscribeHousehold.daysSeen = true;
        remoteChanged();
      },
      lists: function (docs) {
        // Ukelistene (eldre versjoner / engangsflyttingen). Den felles lista kommer i slists.
        var ch = {}, adj = {};
        docs.forEach(function (d) {
          if (d.week === LIST_KEY) return;
          var c = {}, a = {};
          c = fromRemoteChecks(d.checked || {});
          Object.keys(d.adjust || {}).forEach(function (k) { if (typeof d.adjust[k] === 'number' && d.adjust[k]) a[k] = round3(d.adjust[k]); });
          ch[d.week] = c; adj[d.week] = a;
        });
        if (state.checks[LIST_KEY]) ch[LIST_KEY] = state.checks[LIST_KEY];
        if (state.list_adjust[LIST_KEY]) adj[LIST_KEY] = state.list_adjust[LIST_KEY];
        state.checks = ch; state.list_adjust = adj;
        remoteChanged();
      },
      // v0.10: den felles lista (lists/0000-00-00)
      slists: function (docs) {
        var d = docs[0] || {}, times = {}, a = {};
        if (d.adjust && d.adjust['v010:slettes'] && !ui.deleting) watchGone();   // v0.10: en annen telefon sletter husstanden
        state.checks[LIST_KEY] = fromRemoteChecks(d.checked || {}, times);
        state.check_at = times;
        Object.keys(d.adjust || {}).forEach(function (k) { if (typeof d.adjust[k] === 'number' && d.adjust[k]) a[k] = round3(d.adjust[k]); });
        state.list_adjust[LIST_KEY] = a;
        remoteChanged();
      },
      extras: function (docs) {
        weeklyExtras = docs.filter(function (d) { return d.week !== LIST_KEY; }).map(extraFromDoc);
        state.list_extras = weeklyExtras.concat(sharedExtras);
        remoteChanged();
      },
      sextras: function (docs) {
        sharedExtras = docs.map(extraFromDoc);
        state.list_extras = weeklyExtras.concat(sharedExtras);
        remoteChanged();
      },
      settings: function (docs, meta) {
        settingsK17(docs, meta);   // v0.17: navn og felles kjøkkenoppsett
        var hv = docs.filter(function (d) { return d.id === 'hverdag'; })[0];   // v0.11
        state.weekday_limit = hv && [20, 30, 45].indexOf(hv.limit) >= 0 ? hv.limit : null;
        var doc = docs.filter(function (d) { return d.id === 'household'; })[0];
        if (doc) {
          state.household_size = {
            people: doc.people || null,
            scale: doc.scale !== false,
            asked: !!doc.asked
          };
          if (doc.asked) lsSet(HS_ASKED_KEY, '1');
        }
        remoteChanged();
      },
      daypeople: function (docs) {
        var m = {};
        docs.forEach(function (d) {
          if (d.delta && (d.delta.voksen || d.delta.barn || d.delta.smabarn))
            m[d.date || d.id] = { voksen: d.delta.voksen | 0, barn: d.delta.barn | 0, smabarn: d.delta.smabarn | 0 };
        });
        state.day_people = m;
        remoteChanged();
      },
      // v0.9: antall tilkoblinger og aktiv kode (feil her – f.eks. eldre regler – ignoreres)
      members: function (docs, meta) {
        if (!docs) return;
        // v0.10: ingen medlemmer igjen = husstanden er slettet av en annen telefon (sjekkes mot serveren først)
        if (!docs.length && meta && !meta.fromCache && hh && !ui.deleting) { checkGone(); return; }
        ui.members = docs.length;
        K17.memberDocs = docs;   // v0.17: enhetslista (ukjente enheter og «koblet til»)
        membersChanged();
        k17Refresh();
      },
      devices: devicesSnapshot,   // v0.17
      invite: function (docs) {
        if (!docs) return;
        var d = docs.filter(function (x) { return x.id === 'current'; })[0];
        var inv = d && d.code ? { code: d.code, expires_at: d.expires_at && d.expires_at.toMillis ? d.expires_at.toMillis() : 0 } : null;
        var before = JSON.stringify(ui.invite);
        setInvite(inv, false);
        if (JSON.stringify(inv) !== before) refreshDeling();
      },
      status: function (st) {
        syncStatus.pending = st.pending; syncStatus.fromCache = st.fromCache; syncStatus.failed = false;
        if (!st.fromCache) maybeMigrateShared();   // v0.10: alle samlinger er lest fra serveren
        if (!st.fromCache) syncStatus.connecting = false;
        renderSyncStatus();
        processSwaps();   // v0.4.4: bytter gjort frakoblet kjøres når telefonen er tilkoblet igjen
      },
      error: function (err) {
        // v0.10: nytt forsøk høyst hvert 5. sekund (før: bare ett forsøk per økt, så en slettet husstand ble ikke oppdaget)
        // v0.17: enheten var registrert og har mistet tilgangen = fjernet (eller husstanden slettet). Ikke koble til på nytt.
        if (err && err.code === 'permission-denied' && (K17.selfSeen || (hh && lsGet(K17_REG_KEY) === hh.hid))) { checkRemoved(); return; }
        if (err && err.code === 'permission-denied' && !(Date.now() - (subscribeHousehold.retriedAt || 0) < 5000)) {
          subscribeHousehold.retriedAt = Date.now();
          Sync.joinHousehold(hh.hid, hh.secret).then(subscribeHousehold, function (e2) {
            // v0.10: husstanden er slettet (medlemskap og hemmelighet er borte) → «Husstanden er slettet.» og introen
            if (e2 && e2.code === 'permission-denied') { householdGone(); return; }
            toast('Ingen tilgang til husstanden. Åpne invitasjonslenka på nytt.', 5000);
          });
        }
      }
    });
  }

  function renderSyncStatus() {
    var el = document.getElementById('sync-status');
    if (!el) return;
    var link = document.getElementById('sync-link');   // v0.16.1: «● Delt» er en lenke til Husstand → Del
    if (link) link.hidden = !hh;
    if (!hh) { el.hidden = true; return; }
    el.hidden = false;
    var offline = !navigator.onLine || syncStatus.fromCache || syncStatus.failed;
    var pending = syncStatus.pending || swapOverlays.length > 0;   // v0.4.4: bytter i køen
    var txt, cls;
    if (offline && navigator.onLine && !syncStatus.failed && syncStatus.connecting) { txt = 'Kobler til …'; cls = 'connecting'; }
    else if (offline) { txt = pending ? 'Frakoblet · lagres senere' : 'Frakoblet'; cls = 'off'; }
    else if (pending) { txt = 'Lagrer …'; cls = 'pending'; }
    else { txt = 'Delt'; cls = 'ok'; }
    el.textContent = txt;
    el.className = 'sync-status ' + cls;
    el.setAttribute('data-state', cls);
    if (link) link.setAttribute('aria-label', txt + ' – åpne Husstand og delingslenken');
  }
  window.addEventListener('online', renderSyncStatus);
  window.addEventListener('online', function () { processSwaps(); });   // v0.4.4
  window.addEventListener('offline', renderSyncStatus);

  // Skriver til Firestore i rekkefølge når synkroniseringen er klar. Venter ikke på serveren (virker frakoblet).
  function remote(fn) {
    if (!hh || !syncReady) return;
    syncReady.then(function (S) {
      var p = fn(S.write, hh.hid);
      if (p && p.catch) p.catch(function (e) {
        toast(e && e.code === 'permission-denied' ? 'Kunne ikke lagre: ingen tilgang til husstanden' : 'Kunne ikke lagre endringen', 4000);
      });
    }, function () { /* feilen vises i statuslinja */ });
  }

  // Oppdatering fra den andre telefonen: tegn på nytt, men ikke mens noen skriver i et felt.
  var remoteTimer = null, pendingRender = false;
  function remoteChanged() {
    saveMirror();
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(function () {
      if (isFormRoute()) return;                 // skjemaer tegnes på nytt når man går ut av dem
      if (isTyping()) { pendingRender = true; return; }
      pendingRender = false;
      route();
    }, 60);
  }
  function isFormRoute() {
    var h = location.hash || '';
    return /^#retter\/.+/.test(h) || /^#liste\/faste/.test(h) || /^#uke\/engang\//.test(h) || /^#(husstand|join=|inn=|flytt=|koble)/.test(h) || !!NEW_HOME;
  }
  function isTyping() {
    if (swipe) return true;                       // ikke tegn på nytt midt i et sveip
    var a = document.activeElement;
    if (!a || !main.contains(a)) return false;
    var tag = a.tagName;
    return tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && a.type !== 'checkbox');
  }
  main.addEventListener('focusout', function () {
    if (!pendingRender) return;
    setTimeout(function () { if (pendingRender && !isTyping() && !isFormRoute()) { pendingRender = false; route(); } }, 0);
  });

  function createFromLocal(resume) {
    var local = resume ? loadLocalCopy() : state;
    var info = resume ? hh : null;
    return Sync.createHousehold({
      recipes: local.recipes, staples: local.staples, week_plan: local.week_plan, oneoffs: local.oneoffs, marks: local.marks || {},
      checks: remoteChecksByWeek(local.checks, local.check_at), list_adjust: local.list_adjust, list_extras: local.list_extras,
      household_size: local.household_size, day_people: local.day_people,   // v0.9: husstandens størrelse og avvik per dag blir med
      onCore: function (v) {
        if (!resume) writeHH({ hid: v.hid, secret: v.secret, core_done: false, migrated: false });
      },
      onCoreDone: function (v) {
        var cur = readHH() || { hid: v.hid, secret: v.secret };
        cur.core_done = true; writeHH(cur);
        if (hh && hh.hid === v.hid) hh.core_done = true;
      }
    }, info).then(function (v) {
      var cur = readHH() || v;
      cur.core_done = true; cur.migrated = true; writeHH(cur);
      if (hh && hh.hid === v.hid) { hh.core_done = true; hh.migrated = true; }
      return v;
    });
  }
  function loadLocalCopy() {
    try { return migrate(JSON.parse(lsGet(STORAGE_KEY) || 'null') || freshState(), null); } catch (e) { return freshState(); }
  }

  function startCreate() {
    if (ui.busy) return;
    ui.busy = true; ui.error = '';
    renderHousehold();
    // Sikkerhetskopi av lokale data før flytting (originalen i ukeshandel:v1 blir også liggende).
    var raw = lsGet(STORAGE_KEY);
    if (raw && !lsGet(STORAGE_KEY + ':backup-before-household')) lsSet(STORAGE_KEY + ':backup-before-household', raw);
    var snapshot = JSON.parse(JSON.stringify(state));
    ui.movedOwn = hasOwnData();
    Sync.init().then(function () { return createFromLocal(false); }).then(function (v) {
      ui.busy = false; ui.justCreated = true;
      enterHousehold(readHH() || { hid: v.hid, secret: v.secret, core_done: true, migrated: true }, snapshot);
      location.hash = '#husstand';
      renderHousehold();
      // v0.9: koden lages med en gang, så Husstand viser den (delingsmenyen åpnes på et nytt, ferskt trykk)
      ui.inviteBusy = true; refreshDeling();
      ensureInvite(false).then(function () { ui.inviteBusy = false; refreshDeling(); }, function (e2) { ui.inviteBusy = false; ui.inviteErr = inviteErrText(e2); refreshDeling(); });
    }, function (e) {
      ui.busy = false;
      ui.error = errorText(e);
      // Kom vi ikke så langt som å opprette husstanden, fortsetter telefonen lokalt som før.
      var cur = readHH();
      if (cur && !cur.core_done) { try { localStorage.removeItem(HH_KEY); } catch (x) { /* ignorer */ } }
      renderHousehold();
    });
  }

  function startJoin(hid, secret, asked) {
    if (ui.busy) return;
    if (!asked) { askBring(function () { startJoin(hid, secret, true); }); return; }
    ui.busy = true; ui.error = '';
    renderJoin(hid, secret);
    Sync.init().then(function () { return Sync.joinHousehold(hid, secret); }).then(function () {
      ui.busy = false;
      var raw = lsGet(STORAGE_KEY);
      if (raw && !lsGet(STORAGE_KEY + ':backup-before-household')) lsSet(STORAGE_KEY + ':backup-before-household', raw);
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      var info = { hid: hid, secret: secret, core_done: true, migrated: false, joined: true };
      writeHH(info);
      removeLeft(hid);
      ui.invite = null; ui.members = null;
      if (ui.bring) ui.bring.hid = hid;
      enterHousehold(info);
      ui.installMoment = 'B';   // v0.9: hjemskjerm-kortet etter Bli med
      if (!window.KNAGGEN_V016_HUSSTAND) lsSet(KIND_ASK_KEY, hid);   // v0.17: «Hva er denne enheten?»
      history.replaceState(null, '', location.pathname + location.search + '#uke');
      setTabsHidden(false);
      route();
      toast('Du er med i husstanden. Uka og lista er felles.', 4000);
      showKindBanner();
    }, function (e) {
      ui.busy = false; ui.bring = null;
      ui.error = e && e.code === 'permission-denied' ? 'Lenka virker ikke. Be om en ny lenke fra den som delte den.' : errorText(e);
      renderJoin(hid, secret);
    });
  }
  function errorText(e) {
    var m = (e && (e.code || e.message)) || '';
    if (/no-server|unavailable|network|timeout/.test(m)) return 'Får ikke kontakt. Sjekk at du har nett og prøv igjen.';
    if (/not-configured/.test(m)) return 'Deling er ikke satt opp ennå.';
    return 'Noe gikk galt (' + m + '). Prøv igjen.';
  }
  function parseJoin(h) {
    var m = /^#join=([A-Za-z0-9]{22,64})\.([A-Za-z0-9]{22,64})$/.exec(h || '');
    return m ? { hid: m[1], secret: m[2] } : null;
  }

  // v0.11 (spec 2, merkevare/v011 husstand-etter/-apen/-del): fem lukkede <details>-seksjoner med én oppsummeringslinje
  // hver. Innholdet er det samme som i v0.10, bare flyttet. #husstand/hverdag åpner «Middag i hverdagen».
  var HS_OPEN = {};
  function renderHousehold() {
    if (V010_LAYOUT) return renderHouseholdV010();
    if (hh && !window.KNAGGEN_V016_HUSSTAND) return renderHouseholdV017();   // v0.17 (testkrok for den gamle siden)
    var prev = main.querySelectorAll('[data-page="husstand"] details.hs-sec');
    if (prev.length) { HS_OPEN = {}; prev.forEach(function (d) { if (d.open) HS_OPEN[d.getAttribute('data-sec')] = true; }); }
    if (/^#husstand\/hverdag/.test(location.hash)) HS_OPEN.hverdag = true;
    if (/^#husstand\/del/.test(location.hash)) HS_OPEN.del = true;   // v0.16.1: fra «● Delt»
    if (ui.justCreated) HS_OPEN.del = true;
    var hp = hsPeople() || { voksen: 2, barn: 2, smabarn: 0 };
    var hasP = !!hsPeople();
    function sec(key, title, sum, body, testid) {
      return '<details class="hs-sec" data-sec="' + key + '" data-testid="hs-sek-' + testid + '"' + (HS_OPEN[key] ? ' open' : '') + '>' +
        '<summary><span class="t"><b>' + title + '</b><span class="hs-sum-line" data-testid="hs-sum-' + testid + '">' + esc(sum) + '</span></span><span class="go" aria-hidden="true">›</span></summary>' +
        '<div class="hs-sec-body">' + body + '</div></details>';
    }
    var h = '<section class="page" data-page="husstand">';
    h += '<div class="page-head"><h2>Husstand</h2><a class="btn" href="#uke" data-testid="husstand-tilbake">Tilbake</a></div>';
    // 1. Husstanden
    var scalePref = hsState().scale !== false;
    var b1 = '<p class="hs-h">Hvem spiser middag</p>' + peopleCountersHtml('hsh', hasP ? hsPeople() : hp, { testid: 'hs-innstillinger' }) +
      '<button type="button" class="hs-switch" role="switch" data-action="hs-scale-toggle" aria-checked="' + (scalePref ? 'true' : 'false') + '" data-testid="hs-tilpass-bryter">' +
      '<div class="t"><b>Tilpass retter fra Knaggen</b><span>Egne retter endres ikke</span></div>' +
      '<span class="sw' + (scalePref ? ' on' : '') + '" aria-hidden="true"></span></button>' +
      '<p class="hs-note">Vektene følger Helsedirektoratets energibehov (omtrent). Under 1 år telles ikke.</p>' +
      '<div class="form-actions plain"><button type="button" class="btn primary" data-action="hs-lagre-innstillinger" data-testid="hs-lagre">Lagre</button></div>' +
      (hh ? '<div class="hs-danger"><button type="button" class="btn danger" data-action="hs-slett" data-testid="hs-slett">Slett husstanden</button></div>' : '');
    var sum1 = hasP ? SC.peopleText(hsPeople(), true) + ' · ' + fmtPor(SC.porsjoner(hsPeople())) + ' porsjoner' : 'Ikke satt – regnes som 4';
    h += sec('husstanden', 'Husstanden', sum1, b1, 'husstanden');
    // 2. Middag i hverdagen
    var lim = weekdayLimit();
    var b2 = '<fieldset class="hv-limit"><legend class="sr-only">Middag i hverdagen</legend>' + [[0, 'Ingen grense'], [20, 'Helst under 20 min'], [30, 'Helst under 30 min'], [45, 'Helst under 45 min']].map(function (x) {
      var on = (lim || 0) === x[0];
      return '<label class="hv-opt"><input type="radio" name="hv-limit" value="' + x[0] + '" data-testid="hv-grense-' + x[0] + '"' + (on ? ' checked' : '') + '> ' + x[1] + '</label>';
    }).join('') + '</fieldset><p class="hs-note">Gjelder aktiv tid ved benken. Matrett-byggeren forhåndsvelger tidsfilteret, og «Fyll man–fre» velger helst retter innenfor grensen.</p>';
    h += sec('hverdag', 'Middag i hverdagen', lim ? 'Helst under ' + lim + ' min' : 'Ingen grense', b2, 'hverdag');
    // 3. Faste varer (åpner siden)
    var nS = state.staples.length;
    h += '<a class="hs-sec hs-sec-link" href="#liste/faste" data-testid="hs-sek-faste"><span class="t"><b>Faste varer</b><span class="hs-sum-line">' +
      (nS ? nS + (nS === 1 ? ' vare' : ' varer') : 'Ingen ennå') + '</span></span><span class="go" aria-hidden="true">›</span></a>';
    // 4. Del
    var b4 = '', sum4;
    if (hh) {
      sum4 = ui.members ? ui.members + ' koblet til' : 'Delt husstand';
      if (ui.justCreated) b4 += '<p class="notice" data-testid="opprettet">Husstanden er opprettet' + (ui.movedOwn ? ', og rettene, uka og lista fra denne telefonen er flyttet inn.' : '.') + '</p>';
      b4 += '<div id="hs-deling">' + delingHtml() + '</div>';
      if (ui.justCreated) b4 += '<div class="form-actions plain"><a class="btn" href="#uke">Ferdig</a></div>';
    } else if (!syncMode()) {
      sum4 = 'Ikke satt opp'; b4 = '<p class="empty">Deling er ikke satt opp ennå.</p>';
    } else {
      sum4 = 'Ikke delt ennå';
      b4 = '<p>Handler dere sammen? Send en invitasjon på melding, så ser dere samme uke og liste. Ingen konto.</p>' +
        '<p class="hint">' + (hasOwnData() ? 'Rettene, ukeplanen og lista på denne telefonen flyttes inn i husstanden.' : 'Husstanden starter med det som er her nå.') + '</p>' +
        (ui.error ? '<p class="form-error" data-testid="feil">' + esc(ui.error) + '</p>' : '') +
        '<div class="inv-acts"><button type="button" class="btn primary" data-action="create-household" data-testid="opprett"' + (ui.busy ? ' disabled' : '') + '>' +
        IC.msg + (ui.busy ? 'Lager husstanden …' : 'Inviter med melding') + '</button></div>' +
        '<p class="hint">Har noen i husstanden allerede en? Åpne lenka de sendte deg, eller koble til med koden under.</p>';
    }
    if (ui.error && !hh) HS_OPEN.del = true;
    h += '<span id="deling"></span>' + sec('del', 'Del', sum4, b4, 'del');
    // 5. Denne telefonen
    if (syncMode()) h += sec('telefon', 'Denne telefonen', hh ? 'Koblet til husstanden' : 'Ikke koblet', phoneRowsHtml(), 'telefon');
    h += '</section>';
    main.innerHTML = h;
  }

  function renderHouseholdV010() {   // testkroken: v0.10-siden, kopiert uendret fra 0.10.0
    var h = '<section class="page" data-page="husstand">';
    var hp = hsPeople() || { voksen: 2, barn: 2, smabarn: 0 };
    var hasP = !!hsPeople();
    h += '<div class="page-head"><h2>Husstand</h2><a class="btn" href="#uke" data-testid="husstand-tilbake">Tilbake</a></div>';
    h += '<p class="hs-h">Hvem spiser middag</p>';
    h += peopleCountersHtml('hsh', hasP ? hsPeople() : hp, { testid: 'hs-innstillinger' });
    var scalePref = hsState().scale !== false;
    h += '<button type="button" class="hs-switch" role="switch" data-action="hs-scale-toggle" aria-checked="' + (scalePref ? 'true' : 'false') + '" data-testid="hs-tilpass-bryter">' +
      '<div class="t"><b>Tilpass retter fra Knaggen</b><span>Egne retter endres ikke</span></div>' +
      '<span class="sw' + (scalePref ? ' on' : '') + '" aria-hidden="true"></span></button>';
    h += '<p class="hs-note">Vektene følger Helsedirektoratets energibehov (omtrent). Under 1 år telles ikke.</p>';
    h += '<div class="form-actions plain"><button type="button" class="btn primary" data-action="hs-lagre-innstillinger" data-testid="hs-lagre">Lagre</button></div>';
    // v0.9 (merkevare/forste-mote, skjerm 11): «Deling» med antall tilkoblinger, kode, Inviter / Kopier lenke / Lag ny kode,
    // og «Denne telefonen». Husstanden lages i trykket «Inviter med melding» (ingen egen «Opprett»-side).
    h += '<h3 class="hs-h" id="deling">Deling</h3>';
    if (hh) {
      if (ui.justCreated) {
        h += '<p class="notice" data-testid="opprettet">Husstanden er opprettet' + (ui.movedOwn ? ', og rettene, uka og lista fra denne telefonen er flyttet inn.' : '.') + '</p>';
      }
      h += '<div id="hs-deling">' + delingHtml() + '</div>';
      if (ui.justCreated) h += '<div class="form-actions plain"><a class="btn" href="#uke">Ferdig</a></div>';
    } else if (!syncMode()) {
      h += '<p class="empty">Deling er ikke satt opp ennå.</p>';
    } else {
      h += '<p>Handler dere sammen? Send en invitasjon på melding, så ser dere samme uke og liste. Ingen konto.</p>' +
        '<p class="hint">' + (hasOwnData() ? 'Rettene, ukeplanen og lista på denne telefonen flyttes inn i husstanden.' : 'Husstanden starter med startdataene (retter og faste varer) som er her nå.') + '</p>' +
        (ui.error ? '<p class="form-error" data-testid="feil">' + esc(ui.error) + '</p>' : '') +
        '<div class="inv-acts"><button type="button" class="btn primary" data-action="create-household" data-testid="opprett"' + (ui.busy ? ' disabled' : '') + '>' +
        IC.msg + (ui.busy ? 'Lager husstanden …' : 'Inviter med melding') + '</button></div>' +
        '<p class="hint">Har noen i husstanden allerede en? Åpne lenka de sendte deg, eller koble til med koden under.</p>';
    }
    if (syncMode()) h += '<h3 class="hs-h">Denne telefonen</h3>' + phoneRowsHtml();
    // v0.10: rød knapp nederst – sletter husstanden for alle (krever at man skriver SLETT)
    if (hh) h += '<div class="hs-danger"><button type="button" class="btn danger" data-action="hs-slett" data-testid="hs-slett">Slett husstanden</button></div>';
    h += '</section>';
    main.innerHTML = h;
  }

  function renderJoin(hid, secret) {
    // v0.9: gamle #join=-lenker får den nye siden «Du er invitert til husstanden» (6a/6b), uten utløpsdato.
    setTabsHidden(true);
    if (!syncMode()) {
      main.innerHTML = '<section class="page" data-page="join"><div class="join"><h2>Du er invitert til husstanden</h2><p class="empty">Deling er ikke satt opp ennå.</p><a class="btn" href="#uke">Tilbake</a></div></section>';
      return;
    }
    main.innerHTML = joinPageHtml(hid, secret, null);
  }

  /* ---------- Endringer (lokalt eller i husstanden) ---------- */

  /* ---------- v0.4.4: bytte kvelder ---------- */

  // Innholdet på en dag slik denne telefonen har det, med signatur ('r:<id>' / 'o:<id>' / '') som sync.js sammenligner med.
  // v0.16: merket («handlet»/«rester») følger middagen (også ved bytte), men er ikke med i signaturen.
  function marksOf() { if (!state.marks || typeof state.marks !== 'object') state.marks = {}; return state.marks; }
  function markOf(d) { var m = marksOf()[d]; return m === 'handlet' || m === 'rester' ? m : null; }
  function dayEntry(d) {
    var o = state.oneoffs[d], mk = markOf(d);
    if (o) return { date: d, recipe_id: null, oneoff: o, mark: mk, sig: 'o:' + (o.id || o.name) };
    var id = state.week_plan[d] || null;
    return { date: d, recipe_id: id, oneoff: null, mark: id ? mk : null, sig: id ? 'r:' + id : '' };
  }
  function putDay(d, e) {
    if (e.oneoff) { state.oneoffs[d] = e.oneoff; state.week_plan[d] = null; }
    else { delete state.oneoffs[d]; state.week_plan[d] = e.recipe_id || null; }
    if (e.mark && (e.oneoff || e.recipe_id)) marksOf()[d] = e.mark; else delete marksOf()[d];
  }
  // Husstand: siste dager fra Firestore + bytter som ennå ikke er bekreftet av serveren (vises med en gang, også etter
  // omstart frakoblet). Køen lagres per husstand i localStorage.
  var SWAPQ_PREFIX = 'ukeshandel:swaps:';
  var lastDays = [], swapOverlays = [], swapBusy = false;
  function applyDays() {
    var wp = {}, oo = {}, mk = {};
    lastDays.forEach(function (d) {
      if (d.oneoff && d.oneoff.name) { oo[d.date] = { id: d.oneoff.id, name: d.oneoff.name, ingredients: d.oneoff.ingredients || [] }; if (validSource(d.oneoff.source)) oo[d.date].source = d.oneoff.source; }
      else wp[d.date] = d.recipe_id || null;
      if ((d.mark === 'handlet' || d.mark === 'rester') && ((d.oneoff && d.oneoff.name) || d.recipe_id)) mk[d.date] = d.mark;
    });
    state.week_plan = wp; state.oneoffs = oo; state.marks = mk;
    swapOverlays.forEach(function (ov) { putDay(ov.a, ov.ea); putDay(ov.b, ov.eb); });
  }
  function saveSwaps() { if (hh) lsSet(SWAPQ_PREFIX + hh.hid, JSON.stringify(swapOverlays)); }
  function loadSwaps(hid) {
    try { var q = JSON.parse(lsGet(SWAPQ_PREFIX + hid) || '[]'); swapOverlays = Array.isArray(q) ? q : []; } catch (e) { swapOverlays = []; }
    swapOverlays.forEach(function (ov) { putDay(ov.a, ov.ea); putDay(ov.b, ov.eb); });
  }
  function dropOverlay(ov) { swapOverlays = swapOverlays.filter(function (x) { return x !== ov; }); saveSwaps(); }
  function isOffline() { return !navigator.onLine || syncStatus.fromCache || syncStatus.failed; }
  // Et bytte i husstanden lagres som en transaksjon som leser begge dagene på serveren og bare bytter hvis de fortsatt er
  // slik denne telefonen så dem. Frakoblet venter byttet i køen og kjøres (med samme sjekk) når telefonen er tilkoblet
  // igjen, så et bytte aldri overskriver det en annen telefon har gjort i mellomtiden. Køen kjøres i rekkefølge.
  function remoteSwap(a, b, ca, cb) {
    swapOverlays.push({ a: a, b: b, ea: cb, eb: ca, sa: ca.sig, sb: cb.sig, offline: isOffline() || undefined });
    saveSwaps(); saveMirror(); renderSyncStatus();
    processSwaps();
  }
  function processSwaps() {
    if (swapBusy || !hh || !syncReady || !swapOverlays.length || isOffline()) { renderSyncStatus(); return; }
    swapBusy = true;
    var ov = swapOverlays[0], hid = hh.hid;
    renderSyncStatus();
    syncReady.then(function (S) {
      return S.write.settled().then(function () {
        return S.write.swapDays(hid, { date: ov.a, sig: ov.sa }, { date: ov.b, sig: ov.sb });
      });
    }).then(function () {
      swapBusy = false;
      dropOverlay(ov);
      renderSyncStatus();
      processSwaps();
    }, function (e) {
      swapBusy = false;
      var code = e && e.code;
      if (!hh || hh.hid !== hid || swapOverlays.indexOf(ov) < 0) return;
      if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'failed-precondition' && isOffline()) {
        renderSyncStatus();       // prøver igjen når telefonen er tilkoblet (status-/online-hendelse)
        return;
      }
      dropOverlay(ov);
      applyDays(); saveMirror();
      ui.swap = null;
      toast(code === 'swap-conflict' ? (ov.offline ? 'Byttet du gjorde frakoblet ble ikke lagret – uka ble endret på en annen telefon'
        : 'Uka ble endret på en annen telefon – se over og prøv igjen')
        : code === 'permission-denied' ? 'Kunne ikke lagre: ingen tilgang til husstanden' : 'Kunne ikke bytte kveldene', 5000);
      if (!isFormRoute()) route();
      renderSyncStatus();
      processSwaps();
    });
  }
  // Vanlige endringer av en dag som har et bytte i køen: byttet lagres først som vanlige skrivinger (i rekkefølge),
  // så den nye endringen ikke skjules av byttet eller får byttet til å feile.
  function takeSwapsFor(dates) {
    var hit = swapOverlays.filter(function (ov) { return dates.indexOf(ov.a) >= 0 || dates.indexOf(ov.b) >= 0; });
    if (hit.length) {
      swapOverlays = swapOverlays.filter(function (ov) { return hit.indexOf(ov) < 0; });
      saveSwaps(); renderSyncStatus();
    }
    return hit;
  }
  function writeSwapsPlain(hit, W, hid) {
    hit.forEach(function (ov) {
      W.setDays(hid, [{ date: ov.a, recipe_id: ov.ea.recipe_id, oneoff: ov.ea.oneoff }, { date: ov.b, recipe_id: ov.eb.recipe_id, oneoff: ov.eb.oneoff }]).catch(function () { /* vises som vanlig lagringsfeil */ });
    });
  }

  // v0.15 «Kjøkkenskjerm» (#kjokken, kjokken.js): appen gir bare data; skjermen tegner selv.
  function kitchenMeal(d) {
    var o = state.oneoffs[d];
    var r = o ? { name: o.name, ingredients: o.ingredients || [], _oneoff: true, id: o.id } : (state.week_plan[d] ? recipeById(state.week_plan[d]) : null);
    if (!r) return null;
    var f = r._oneoff ? 1 : dayFactor(d, r);
    var tom = f === 'Tom';
    var por = r._oneoff ? null : (tom ? 0 : SC.servingsOf(r) * f);
    return {
      date: d, name: r.name, id: r.id || null, time: r._oneoff ? '' : timeText(r), oneoff: !!r._oneoff, mark: markOf(d),
      portions: por == null ? '' : fmtPor(por) + (por === 1 ? ' porsjon' : ' porsjoner'),
      ingredients: (r.ingredients || []).filter(function (i) { return i && String(i.name || '').trim(); }).map(function (i) {
        var q = (tom || f === 1) ? i.qty : scaleQty(i.qty, i.unit, f, normName(i.name));
        var a = q == null || !isFinite(q) ? '' : formatQty(q) + (i.unit ? ' ' + i.unit : '');
        return { amount: a, name: String(i.name).trim() };
      }),
      steps: r._oneoff ? [] : stepsFor(r)
    };
  }
  window.KnaggenKitchenApi = {
    meal: function (d) { return kitchenMeal(d); },
    // v0.18 «Nå»: varene til dagens middag (Kjøp på vei hjem), avkrysning og tallene til snarveiene
    naBuy: function () {
      var b = buildList(true), today = isoDate(new Date()), out = [];
      b.source.forEach(function (g) {
        if (g.date !== today) return;
        g.rows.forEach(function (r) { if (r.item && !(r.item.qty === 0) && !out.some(function (x) { return x.key === r.item.key; })) out.push({ key: r.item.key, name: cap(r.item.name), amount: r.amount, checked: !!r.item.checked }); });
      });
      return { items: out, open: b.items.filter(isOpen).length };
    },
    naCheck: function (key, on) {
      var cur = currentItems(), week = cur.length ? cur[0].week : LIST_KEY, m = {}, wchecks = state.checks[week] || {};
      cur.forEach(function (i) {
        if (i.key !== key) return;
        i.checked = on; m[key] = on ? tickValue(i) : false;
        (i.legacyKeys || []).forEach(function (x) { if (wchecks[x.k]) m[x.k] = false; });
      });
      if (!m.hasOwnProperty(key)) m[key] = on;
      ops.setChecks(week, m);
    },
    naCounts: function () { var b = buildList(true); return { list: b.items.filter(isOpen).length, week: isoWeek(new Date()), recipes: state.recipes.length }; },
    isoDate: isoDate, isoWeek: isoWeek,
    hid: function () { return hh ? hh.hid : null; },
    // v0.17: felles kjøkkenoppsett (null = ikke lest / finnes ikke / eldre regler)
    sharedKitchen: function () { return hh && K17.kitchen ? K17.kitchen : null; },
    setSharedKitchen: function (k) {
      if (!hh || !Sync) return;
      K17.kitchen = { stops: (k.stops || []).slice(0, 3), lat: k.lat, lon: k.lon };
      Sync.write.setKitchenShared(hh.hid, K17.kitchen).catch(function () { /* eldre regler: lokalt som før */ });
    },
    weather: function (lat, lon) {
      var S = window.UkeshandelSync;
      if (!hh || !S || !S.fetchWeather) return Promise.reject(new Error('no-household'));
      return S.fetchWeather(hh.hid, lat, lon);
    },
    calendar: function (op, data) {   // v0.16
      var S = window.UkeshandelSync;
      if (!hh || !S || !S.calendar) return Promise.reject(new Error('no-household'));
      return S.calendar(hh.hid, op, data);
    },
    weekDates: function (off) { return weekDates(off || 0); },
    dinnerName: function (d) { return dinnerName(d); },
    online: function () { return navigator.onLine; },
    toApp: function (h) { location.hash = h === '#liste' ? '#liste' : '#uke'; }
  };

  function dinnerName(d) {
    var o = state.oneoffs[d];
    if (o) return o.name;
    var r = state.week_plan[d] ? recipeById(state.week_plan[d]) : null;
    return r ? r.name : '';
  }
  // Selve byttet fra UI-et: flytter/bytter, viser hva som skjedde med «Angre», og setter fokus på der retten havnet.
  function swapNow(from, to, focusSel) {
    var nf = dinnerName(from), nt = dinnerName(to);
    if (!nf && !nt) return;
    ops.swapDays(from, to);
    ui.swap = null;
    var sameWeek = weekDates(ui.weekOffset).indexOf(from) >= 0 && weekDates(ui.weekOffset).indexOf(to) >= 0;
    var lf = dayName(from).toLowerCase() + (sameWeek ? '' : ' ' + shortDate(from)), lt = dayName(to).toLowerCase() + (sameWeek ? '' : ' ' + shortDate(to));
    var msg = nf && nt ? nf + ' til ' + lt + ', ' + nt + ' til ' + lf
      : nf ? nf + ' flyttet til ' + lt : nt + ' flyttet til ' + lf;
    var after = { f: dayEntry(from).sig, t: dayEntry(to).sig };
    renderUke();
    focusEl(focusSel || '[data-action="swap-start"][data-date="' + to + '"]', '#day-' + to);
    toast(msg, UNDO_MS, { label: 'Angre', run: function () {
      if (dayEntry(from).sig !== after.f || dayEntry(to).sig !== after.t) { toast('Kan ikke angre – uka er endret siden'); return; }
      ops.swapDays(to, from);
      toast('Byttet tilbake');
      if (main.querySelector('[data-page="uke"]')) {
        renderUke();
        focusEl('[data-action="swap-start"][data-date="' + from + '"]', '#day-' + from);
      } else if (!isFormRoute()) route();
    } });
  }
  function focusEl() {
    for (var i = 0; i < arguments.length; i++) {
      var el = arguments[i] && main.querySelector(arguments[i]);
      if (el) { try { el.focus({ preventScroll: false }); } catch (x) { el.focus(); } return el; }
    }
    return null;
  }
  function startSwap(d) {
    ui.swap = { from: d, sig: dayEntry(d).sig };
    renderUke();
    focusEl('[data-action="swap-to"]');
  }
  function cancelSwap(focusBack) {
    if (!ui.swap) return;
    var d = ui.swap.from;
    ui.swap = null;
    renderUke();
    if (focusBack) focusEl('[data-action="swap-start"][data-date="' + d + '"]', '#day-' + d);
  }

  // v0.11: «Middag i hverdagen» – null (Ingen grense, standard) | 20 | 30 | 45 min aktiv tid
  function weekdayLimit() { var l = state && state.weekday_limit; return [20, 30, 45].indexOf(l) >= 0 ? l : null; }
  var ops = {
    setWeekdayLimit: function (limit) {
      if (limit) state.weekday_limit = limit; else delete state.weekday_limit;
      save();
      remote(function (W, hid) { return W.setWeekdayLimit(hid, limit || null); });
    },
    saveRecipe: function (r, isNew) {
      if (isNew) state.recipes.push(r);
      save();
      remote(function (W, hid) { return W.setRecipe(hid, r); });
    },
    deleteRecipe: function (id, usedDates) {
      state.recipes = state.recipes.filter(function (x) { return x.id !== id; });
      usedDates.forEach(function (d) { state.week_plan[d] = null; delete marksOf()[d]; });
      save();
      var hit = takeSwapsFor(usedDates);
      remote(function (W, hid) {
        writeSwapsPlain(hit, W, hid);   // v0.4.4
        var ps = [W.deleteRecipe(hid, id)];
        if (usedDates.length) ps.push(W.setDays(hid, usedDates.map(function (d) { return { date: d, recipe_id: null, oneoff: null }; })));
        return Promise.all(ps);
      });
    },
    // v0.4.4: bytt innholdet (rett / engangsmiddag / tom) mellom to dager. Lokalt straks; i husstanden som en
    // transaksjon som bare bytter hvis dagene fortsatt er som denne telefonen så (se remoteSwap).
    swapDays: function (a, b) {
      var ca = dayEntry(a), cb = dayEntry(b);
      putDay(a, cb); putDay(b, ca);
      save();
      if (hh && syncReady) remoteSwap(a, b, ca, cb);
    },
    // entries: [{ date, recipe_id, oneoff }]
    // v0.16: e.mark gitt → settes; ellers beholdes merket bare hvis samme rett blir stående på samme dag (ny rett nullstiller).
    setDays: function (entries) {
      entries.forEach(function (e) {
        var before = dayEntry(e.date);
        var sig = e.oneoff ? 'o:' + (e.oneoff.id || e.oneoff.name) : (e.recipe_id ? 'r:' + e.recipe_id : '');
        if (!('mark' in e) || e.mark === undefined) e.mark = before.mark && before.sig === sig ? before.mark : null;
        if (!sig) e.mark = null;
        putDay(e.date, e);
      });
      save();
      var hit = takeSwapsFor(entries.map(function (e) { return e.date; }));   // v0.4.4
      remote(function (W, hid) {
        writeSwapsPlain(hit, W, hid);
        return W.setDays(hid, entries);
      });
    },
    // v0.10: atMap = avkrysningstid per vare (bare den felles lista); uten atMap brukes nå.
    setChecks: function (week, map, atMap) {
      var c = state.checks[week] = state.checks[week] || {};
      var at = null;
      if (week === LIST_KEY) {
        at = {};
        state.check_at = state.check_at || {};
        Object.keys(map).forEach(function (k) {
          if (map[k]) at[k] = state.check_at[k] = (atMap && atMap[k]) || Date.now();
          else delete state.check_at[k];
        });
      }
      Object.keys(map).forEach(function (k) { if (map[k]) c[k] = map[k]; else delete c[k]; });
      state.list_items.forEach(function (i) { if (i.week === week && map.hasOwnProperty(i.key)) i.checked = !!map[i.key]; });
      save();
      remote(function (W, hid) { return W.setChecks(hid, week, toRemoteChecks(map, at)); });
    },
    setAdjustRaw: function (week, map) {
      var m = state.list_adjust[week] = state.list_adjust[week] || {};
      Object.keys(map).forEach(function (k) { m[k] = map[k]; });
      save();
      remote(function (W, hid) { return W.setAdjust(hid, week, map); });
    },
    adjust: function (week, key, newDelta, change) {
      var m = state.list_adjust[week] = state.list_adjust[week] || {};
      if (newDelta) m[key] = newDelta; else delete m[key];
      save();
      remote(function (W, hid) { return change ? W.incAdjust(hid, week, key, change) : null; });
    },
    // v0.4.3: basisvalg per uke, lagret feltvis i samme lists-dokument som +/- («basis:<vare>» = 1 lagt til, -1 ikke nå).
    setBasis: function (week, map) {
      var m = state.list_adjust[week] = state.list_adjust[week] || {}, r = {};
      Object.keys(map).forEach(function (nn) { m[BASIS_PREFIX + nn] = map[nn]; r[BASIS_PREFIX + nn] = map[nn]; });
      save();
      remote(function (W, hid) { return W.setAdjust(hid, week, r); });
    },
    // v0.4.3b: faste varer valgt for uka, feltvis i samme adjust-kart («fast:<id>» = 1 på lista / -1 ikke).
    setFast: function (week, map) {
      var m = state.list_adjust[week] = state.list_adjust[week] || {}, r = {};
      Object.keys(map).forEach(function (id) { m[FAST_PREFIX + id] = map[id]; r[FAST_PREFIX + id] = map[id]; });
      save();
      remote(function (W, hid) { return W.setAdjust(hid, week, r); });
    },
    clearAdjust: function (week, key) {
      if (state.list_adjust[week]) delete state.list_adjust[week][key];
      save();
      remote(function (W, hid) { return W.clearAdjust(hid, week, key); });
    },
    addExtra: function (x) {
      x.aisle = storeAisle(x.name, x.aisle);
      state.list_extras.push(x);
      save();
      remote(function (W, hid) { return W.addExtra(hid, x); });
    },
    removeExtras: function (ids) {
      state.list_extras = state.list_extras.filter(function (x) { return ids.indexOf(x.id) < 0; });
      save();
      remote(function (W, hid) { return W.deleteExtras(hid, ids); });
    },
    addStaple: function (s) {
      s.aisle = storeAisle(s.name, s.aisle);
      s.order = Date.now();
      state.staples.push(s);
      save();
      remote(function (W, hid) { return W.setStaple(hid, s); });
    },
    updateStaple: function (s, fields) {
      Object.keys(fields).forEach(function (k) { s[k] = fields[k]; });
      save();
      remote(function (W, hid) { return W.updateStaple(hid, s.id, fields); });
    },
    deleteStaple: function (id) {
      state.staples = state.staples.filter(function (s) { return s.id !== id; });
      save();
      remote(function (W, hid) { return W.deleteStaple(hid, id); });
    }
  };

  /* ---------- Router ---------- */

  function route() {
    var raw = location.hash || '';
    if (NEW_HOME) return renderMovePage();   // v0.9: den gamle adressen viser bare flyttesiden
    var h = raw.replace(/^#\/?/, '');
    var parts = h.split('/');
    var tab = parts[0];
    var K = window.KnaggenKjokken;
    if (tab === 'kjokken' && K && K.narrow && K.narrow() && !parts[1]) { setTabsHidden(false); document.body.classList.add('k-open'); document.body.classList.add('k-na-open'); main.innerHTML = ''; K.show(''); return; }   // v0.18: «Nå» – fanelinja blir stående
    document.body.classList.remove('k-na-open');
    if (tab === 'kjokken' && K) { setTabsHidden(true); document.body.classList.add('k-open'); main.innerHTML = ''; K.show(parts.slice(1).join('/')); return; }
    if (K) { K.hide(); document.body.classList.remove('k-open'); }
    var join = parseJoin(raw);
    var inn = parseInn(raw), flytt = parseFlytt(raw);
    var connectFirst = !raw.replace(/^#/, '') || tab === 'uke' && !parts[1] ? showConnectFirst() : false;
    var intro = !join && !inn && !flytt && !connectFirst && (!raw.replace(/^#/, '') || tab === 'uke' && !parts[1]) && showIntro();
    var introConnect = tab === 'koble' && parts[1] === 'intro';
    var special = join || inn || flytt || connectFirst || intro || tab === 'husstand' || tab === 'koble';
    if (!intro) document.body.classList.remove('v9-intro');
    setTabsHidden(!!(join || inn || flytt || connectFirst || intro || introConnect));
    if (!special && ['retter', 'uke', 'liste'].indexOf(tab) < 0) tab = 'uke';
    var links = document.querySelectorAll('.tabs a');
    for (var i = 0; i < links.length; i++) {
      var on = !special && links[i].getAttribute('data-tab') === tab;
      links[i].classList.toggle('active', on);
      if (on) links[i].setAttribute('aria-current', 'page'); else links[i].removeAttribute('aria-current');
    }
    if (join) {
      if (hh && hh.hid === join.hid) {
        history.replaceState(null, '', location.pathname + location.search + '#uke');
        toast('Du er allerede med i denne husstanden');
        return route();
      }
      if (leftBlocks(join.hid, null)) {
        main.innerHTML = '<section class="page" data-page="join"><div class="join"><h2>Lenka virker ikke lenger</h2><p class="lead" data-testid="lenke-forlatt">' + esc(LEFT_MSG) + '</p>' +
          '<div class="acts"><a class="btn primary" href="#uke" data-action="join-later" data-testid="til-knaggen">Til Knaggen</a></div></div></section>';
        return;
      }
      return renderJoin(join.hid, join.secret);
    }
    if (inn) return renderInvitePage(inn);
    if (flytt) return renderFlytt(flytt);
    if (connectFirst) return renderConnect(false);
    if (intro) return renderIntro();
    if (introConnect) return renderConnect('intro');
    if (tab === 'koble') return renderConnect(true);
    if (tab === 'husstand') return renderHousehold();
    if (tab === 'retter') {
      if (parts[1] === 'ny') renderRecipeForm(null);
      else if (parts[1] === 'finn') renderFinn();   // v0.11
      else if (parts[1] === 'hent') { if (parts[2] === 'sjekk' && imp.result) renderHentForm(); else renderHent(); }   // v0.12
      else if (parts[1] === 'tilpass' && parts[2]) renderTilpass(decodeURIComponent(parts[2]), parts[3] || '');
      else if (parts[1] && recipeById(decodeURIComponent(parts[1]))) renderRecipeForm(decodeURIComponent(parts[1]));
      else renderRetter();
    } else if (tab === 'uke') {
      if (parts[1] === 'engang' && /^\d{4}-\d\d-\d\d$/.test(parts[2] || '')) renderOneoffForm(parts[2]);
      else renderUke();
    } else if (tab === 'liste') {
      if (parts[1] === 'faste') renderFastePage();
      else renderListe();
    } else renderListe();
  }

  /* ---------- Felles: ingrediensrader ---------- */

  function ingredientRow(ing) {
    ing = ing || { name: '', qty: null, unit: 'stk', aisle: 'Tørrvare' };
    var isB = U.isBasis(ing);
    return '<div class="ing-row" data-new="' + (ing.name ? '0' : '1') + '">' +
      '<div class="ing-top"><input class="ing-name" type="text" placeholder="Ingrediens" aria-label="Ingrediens" value="' + esc(ing.name) + '" autocomplete="off" list="known-ings">' +
      // v0.4.3: basisvare (krydder, mel, olje o.l.) legges ikke rett på lista. Standard fra tabellen, kan endres her.
      '<label class="ing-basis" title="Basisvare: legges ikke rett på lista, men i basisvare-meldingen på Handleliste">' +
      '<input type="checkbox" class="ing-basis-cb"' + (isB ? ' checked' : '') + (typeof ing.basis === 'boolean' ? ' data-touched="1"' : '') + '> Basis</label></div>' +
      '<div class="ing-sub">' +
      '<input class="ing-qty" type="text" inputmode="decimal" placeholder="Mengde" aria-label="Mengde" value="' + esc(formatQty(ing.qty)) + '">' +
      '<select class="ing-unit" aria-label="Enhet">' + unitOptions(ing.unit) + '</select>' +
      '<select class="ing-aisle" aria-label="Avdeling">' + aisleOptions(ing.name ? itemAisle(ing.name, ing.aisle) : ing.aisle) + '</select>' +
      '<button type="button" class="icon-btn" data-action="remove-ing" aria-label="Fjern ingrediens">✕</button>' +
      '</div></div>';
  }
  function ingredientsFieldset(ings) {
    var h = '<fieldset class="ings"><legend>Ingredienser</legend><div id="ing-list">';
    (ings || []).forEach(function (i) { h += ingredientRow(i); });
    if (!ings || !ings.length) h += ingredientRow(null);
    h += '</div><button type="button" class="btn" data-action="add-ing">+ Ingrediens</button></fieldset>';
    return h + knownNamesDatalist();
  }
  function readIngredients(form) {
    var out = [];
    var rows = form.querySelectorAll('.ing-row');
    for (var i = 0; i < rows.length; i++) {
      var n = rows[i].querySelector('.ing-name').value.trim();
      if (!n) continue;
      var ing = {
        name: n,
        qty: parseQty(rows[i].querySelector('.ing-qty').value),
        unit: rows[i].querySelector('.ing-unit').value,
        aisle: storeAisle(n, rows[i].querySelector('.ing-aisle').value)
      };
      var bcb = rows[i].querySelector('.ing-basis-cb');
      if (bcb && bcb.checked !== U.isBasisName(n)) ing.basis = bcb.checked;   // lagres bare når det avviker fra tabellen
      out.push(ing);
    }
    return out;
  }
  function formError(msg, focusId) {
    var err = document.getElementById('form-error');
    err.textContent = msg;
    err.hidden = false;
    if (focusId) document.getElementById(focusId).focus();
  }

  /* ---------- Retter ---------- */

  /* ---------- Bakgrunnsbibliotek (v0.3) ---------- */

  var LIBRARY = window.UKESHANDEL_LIBRARY || [];
  function libById(id) {
    for (var i = 0; i < LIBRARY.length; i++) if (LIBRARY[i].id === id) return LIBRARY[i];
    return null;
  }
  // Bibliotekretter som ikke allerede er blant våre retter (samme id «lib-<id>» eller samme navn).
  function libCandidates() {
    var names = {};
    state.recipes.forEach(function (r) { names[normName(r.name)] = true; });
    return LIBRARY.filter(function (x) { return !recipeById('lib-' + x.id) && !names[normName(x.name)]; })
      .map(function (x) { return x.id; });
  }
  // Én tilfeldig rekkefølge per økt, så «forrige» faktisk går tilbake. lib.idx = plass i rekkefølgen for kortet som vises.
  var lib = { order: null, idx: 0, anim: '', lastSwipe: 0 };
  function libOrder() {
    if (!lib.order) {
      var a = LIBRARY.map(function (x) { return x.id; });
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      lib.order = a;
    }
    return lib.order;
  }
  // Kortet som vises: første aktuelle rett fra lib.idx og utover (rundt). Er den lagt til, vises neste.
  function libView() {
    var order = libOrder(), ok = {};
    libCandidates().forEach(function (id) { ok[id] = true; });
    var cands = order.filter(function (id) { return ok[id]; });
    if (!cands.length) return { cands: cands, pos: -1, id: null };
    var n = order.length, cur = null;
    for (var k = 0; k < n; k++) {
      var id = order[(lib.idx + k) % n];
      if (ok[id]) { cur = id; lib.idx = (lib.idx + k) % n; break; }
    }
    return { cands: cands, pos: cands.indexOf(cur), id: cur };
  }
  function stepSuggestion(dir) {
    var v = libView();
    if (v.cands.length < 2) return false;
    var id = v.cands[(v.pos + dir + v.cands.length) % v.cands.length];
    lib.idx = libOrder().indexOf(id);
    lib.anim = dir > 0 ? ' from-right' : ' from-left';
    refreshSuggestCard();
    return true;
  }
  function renderSuggestions() {
    if (!LIBRARY.length) return '';
    var v = libView();
    var h = '<section class="suggest" data-testid="forslag" aria-label="Forslag til nye retter">';
    if (!v.id) {
      return h + '<div class="suggest-head"><h3>Forslag til nye retter</h3></div>' +
        '<p class="hint" data-testid="forslag-tomt">Dere har alle ' + LIBRARY.length + ' rettene fra biblioteket.</p></section>';
    }
    var x = libById(v.id), many = v.cands.length > 1;
    var meta = (x.minutes ? x.minutes + ' min · ' : '') + x.ingredients.map(function (i) { return i.name; }).join(', ');
    h += '<div class="suggest-head"><h3>Forslag til nye retter</h3><div class="suggest-nav">' +
      (many ? '<button type="button" class="nav-arrow" data-action="lib-prev" data-testid="forrige-forslag" aria-label="Forrige forslag">‹</button>' : '') +
      '<span class="suggest-pos" data-testid="forslag-pos" role="status" aria-label="Forslag ' + (v.pos + 1) + ' av ' + v.cands.length + '">' + (v.pos + 1) + ' / ' + v.cands.length + '</span>' +
      (many ? '<button type="button" class="nav-arrow" data-action="lib-next" data-testid="neste-forslag" aria-label="Neste forslag">›</button>' : '') +
      '</div></div>';
    h += '<div class="card suggest-card' + lib.anim + '" data-lib-id="' + esc(x.id) + '" tabindex="0" role="group" aria-roledescription="forslag"' +
      ' aria-label="' + esc(x.name) + (many ? '. Sveip eller bruk piltastene for neste og forrige forslag.' : '') + '">' +
      '<div class="suggest-main"><span class="suggest-title">' + esc(x.name) + '</span>' +
      '<span class="suggest-meta">' + esc(meta) + '</span></div>' +
      '<button type="button" class="btn small primary" data-action="lib-add" data-lib-id="' + esc(x.id) + '" data-testid="legg-til" aria-label="Legg til ' + esc(x.name) + ' i våre retter">Legg til</button>' +
      '</div></section>';
    lib.anim = '';
    return h;
  }
  // Tegn bare forslagsdelen på nytt (siden og rullingen står i ro); behold fokus på samme knapp/kort.
  function refreshSuggestCard() {
    var el = main.querySelector('.suggest');
    if (!el) { renderRetter(); return; }
    var a = document.activeElement, keep = null;
    if (a && el.contains(a)) keep = a.getAttribute('data-action') ? '[data-action="' + a.getAttribute('data-action') + '"]' : (a.classList.contains('suggest-card') ? '.suggest-card' : null);
    el.outerHTML = renderSuggestions();
    if (keep) { var n = main.querySelector('.suggest ' + keep) || main.querySelector('.suggest-card'); if (n) n.focus(); }
  }

  // Sveip på forslagskortet: retningen avgjøres etter 10 px; loddrett bevegelse er vanlig rulling og endrer ikke kortet.
  var swipe = null;
  main.addEventListener('touchstart', function (e) {
    var card = e.target.closest && e.target.closest('.suggest-card');
    if (!card || e.touches.length !== 1) { swipe = null; return; }
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null, dx: 0, card: card, onBtn: !!e.target.closest('[data-action="lib-add"]') };
  }, { passive: true });
  main.addEventListener('touchmove', function (e) {
    if (!swipe || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - swipe.x, dy = e.touches[0].clientY - swipe.y;
    if (!swipe.dir) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      swipe.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v';
    }
    if (swipe.dir !== 'h') return;
    if (e.cancelable) e.preventDefault();
    swipe.dx = dx;
    swipe.card.style.transition = 'none';
    swipe.card.style.transform = 'translateX(' + Math.round(dx * 0.9) + 'px)';
    swipe.card.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 300));
  }, { passive: false });
  function endSwipe() {
    var s = swipe;
    swipe = null;
    if (s && s.dir === 'h') {
      lib.lastSwipe = s.onBtn ? Date.now() : 0;   // et sveip som startet på «Legg til» skal aldri legge til
      var done = Math.abs(s.dx) >= 50 && stepSuggestion(s.dx < 0 ? 1 : -1);
      if (!done) { s.card.style.transition = ''; s.card.style.transform = ''; s.card.style.opacity = ''; }
    }
    if (pendingRender && !isTyping() && !isFormRoute()) { pendingRender = false; route(); }
  }
  main.addEventListener('touchend', endSwipe);
  main.addEventListener('touchcancel', endSwipe);
  main.addEventListener('keydown', function (e) {
    if (!e.target.classList || !e.target.classList.contains('suggest-card')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepSuggestion(e.key === 'ArrowRight' ? 1 : -1); }
  });
  function addFromLibrary(id) {
    var x = libById(id);
    if (!x) return;
    if (recipeById('lib-' + id) || libCandidates().indexOf(id) < 0) { toast('«' + x.name + '» finnes allerede i rettene'); renderRetter(); return; }
    ops.saveRecipe({
      id: 'lib-' + x.id, name: x.name, minutes: x.minutes || null, note: x.note || '',
      origin: 'knaggen', servings: x.servings || 4,
      ingredients: x.ingredients.map(function (i) { return { name: i.name, qty: i.qty, unit: i.unit, aisle: normAisle(i.aisle) }; })
    }, true);
    lib.anim = ' from-right';
    toast('«' + x.name + '» er lagt til i rettene');
    renderRetter();
  }

  // v0.10 (spec punkt 3): fremgangsmåte. Egne steg (r.steps) vinner; ellers bibliotekrettens steg (lib-<id>) eller
  // startrettens steg (samme id/navn som i seed.js). Bare egne/endrede steg lagres på retten.
  var SEED_STEPS = window.UKESHANDEL_SEED_STEPS || {};
  function defaultSteps(r) {
    if (!r) return [];
    var x = /^lib-/.test(r.id || '') ? libById(String(r.id).replace(/^lib-/, '')) : null;
    if (x && x.steps && x.steps.length) return x.steps.slice();
    var seed = window.UKESHANDEL_SEED ? window.UKESHANDEL_SEED() : null;
    var isSeed = seed && seed.recipes.some(function (s) { return s.id === r.id && normName(s.name) === normName(r.name); });
    if (isSeed || r.origin === 'knaggen') {
      var k = Object.keys(SEED_STEPS).filter(function (n) { return normName(n) === normName(r.name); })[0];
      if (k) return SEED_STEPS[k].slice();
      if (r.origin === 'knaggen') {
        var byName = LIBRARY.filter(function (l) { return normName(l.name) === normName(r.name); })[0];
        if (byName && byName.steps) return byName.steps.slice();
      }
    }
    return [];
  }
  function stepsFor(r) {
    if (r && Array.isArray(r.steps) && r.steps.length) return r.steps.slice();
    return defaultSteps(r);
  }
  function parseSteps(text) {
    return String(text || '').split(/\n+/).map(function (l) { return l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim(); })
      .filter(Boolean).slice(0, 12).map(function (l) { return l.slice(0, 300); });
  }
  function stepsHtml(r) {
    var st = stepsFor(r);
    var h = '<section class="steps" aria-labelledby="steps-h"><h3 class="section-title" id="steps-h">Fremgangsmåte</h3>';
    if (st.length) h += '<ol class="steps-list" data-testid="fremgangsmate">' + st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    h += '<details class="steps-edit"' + (st.length ? '' : ' open') + '><summary>' + (st.length ? 'Endre fremgangsmåte' : 'Legg til fremgangsmåte (valgfritt)') + '</summary>' +
      '<label class="field"><span>Fremgangsmåte (valgfri) · ett steg per linje</span><textarea id="f-steps" rows="6" data-testid="fremgangsmate-felt" placeholder="F.eks. Brun kjøttdeigen.">' +
      esc(st.join('\n')) + '</textarea></label></details></section>';
    return h;
  }

  // v0.11 (spec 2, Retter): én flate med rader – navn, tid og «›». Forslagsboksen er erstattet av «Finn flere retter».
  function variantLabel(r) {
    var key = r.variant || (r.fromLib && r.fromLib.variant), d = (r.lib || (r.fromLib && r.fromLib.id)) ? dishById(r.lib || r.fromLib.id) : null;
    var v = d && key ? variantOf(d, key) : null;
    if (!v) return '';
    return r.fromLib ? 'Tilpasset · ' + v.name : v.name;
  }
  function renderRetter() {
    var rs = sortedRecipes();
    var h = '<section class="page" data-page="retter">';
    h += '<div class="page-head"><h2>Retter <span class="count">' + rs.length + '</span></h2>' +
      '<a class="btn primary" href="#retter/ny" data-testid="ny-rett">+ Ny rett</a></div>';
    if (V010_LAYOUT) {   // testkroken: v0.10-lista med forslagsboksen (eldre testsuiter), kopiert uendret fra 0.10.0
      h += renderSuggestions();
      if (rs.length) h += '<h3 class="section-title">Våre retter</h3>';
      if (!rs.length) h += '<p class="empty">Ingen retter ennå. Legg til rettene dere faktisk lager.</p>';
      h += '<ul class="cards">';
      rs.forEach(function (r) {
        var meta = [];
        if (r.minutes) meta.push(r.minutes + ' min');
        meta.push(r.ingredients.length + (r.ingredients.length === 1 ? ' ingrediens' : ' ingredienser'));
        h += '<li><a class="card recipe-card" href="#retter/' + encodeURIComponent(r.id) + '">' +
          '<span class="card-title">' + esc(r.name) + (/^tm-/.test(r.id) ? ' <span class="badge" data-testid="tatt-med">Tatt med</span>' : '') + '</span>' +
          '<span class="card-meta">' + esc(meta.join(' · ')) + '</span>' +
          (r.note ? '<span class="card-note">' + esc(r.note) + '</span>' : '') +
          '</a></li>';
      });
      h += '</ul>';
    } else if (!rs.length) {
      h += '<div class="v11-empty" data-testid="retter-tom"><p>Ingen retter ennå. Velg rettene familien liker fra en lang liste – ett trykk per rett.</p>' +
        '<a class="btn primary" href="#retter/finn" data-testid="finn-retter">Finn retter</a>' +
        '<a class="linkbtn" href="#retter/hent" data-testid="hent-inngang">Hent oppskrift fra nettet</a></div>';
    } else {
      h += '<ul class="v11-rows" data-testid="finn-inngang"><li><a class="v11-row" href="#retter/finn" data-testid="finn-flere"><span class="t"><b>Finn flere retter</b></span><span class="go" aria-hidden="true">›</span></a></li>' +
        '<li><a class="v11-row" href="#retter/hent" data-testid="hent-inngang"><span class="t"><b>Hent oppskrift fra nettet</b><span class="s">Lim inn eller del en lenke</span></span><span class="go" aria-hidden="true">›</span></a></li></ul>';
      h += '<ul class="v11-rows cards" data-testid="retter-liste">';
      rs.forEach(function (r) {
        var vl = variantLabel(r);
        h += '<li><a class="v11-row recipe-card" href="#retter/' + encodeURIComponent(r.id) + '">' +
          '<span class="t"><b class="card-title">' + esc(r.name) + (/^tm-/.test(r.id) ? ' <span class="badge" data-testid="tatt-med">Tatt med</span>' : '') + '</b>' +
          (vl ? '<span class="s recipe-variant" data-testid="variantnavn">' + esc(vl) + '</span>' : '') + '</span>' +
          '<span class="tid card-meta">' + esc(r.minutes ? r.minutes + ' min' : '') + '</span><span class="go" aria-hidden="true">›</span></a></li>';
      });
      h += '</ul>';
    }
    h += '<div class="footer-tools">';
    if (hh) h += '<a class="linkbtn" href="#husstand" data-testid="husstand-lenke">Husstand og delingslenke</a>';
    else {
      if (syncMode()) h += '<a class="linkbtn" href="#husstand" data-testid="husstand-lenke">Del med husstanden</a><br>';
      h += '<button type="button" class="linkbtn" data-action="reset-seed">Tilbakestill testdata</button>';
    }
    if (memoryOnly && !hh) h += '<p class="warn">Nettleseren tillater ikke lagring – endringer forsvinner når du lukker siden.</p>';
    h += '</div></section>';
    main.innerHTML = h;
  }

  function renderRecipeForm(id) {
    var r = id ? recipeById(id) : null;
    var h = '<section class="page" data-page="rett-skjema">';
    h += '<div class="page-head"><a class="back" href="#retter">‹ Retter</a><h2>' + (r ? 'Rediger rett' : 'Ny rett') + '</h2></div>';
    h += '<form id="recipe-form" data-id="' + esc(r ? r.id : '') + '" novalidate>';
    h += '<label class="field"><span>Navn</span><input id="f-name" type="text" required value="' + esc(r ? r.name : '') + '" placeholder="F.eks. Fiskesuppe"></label>';
    h += timeFieldsHtml(r);   // v0.11: tid i to deler, hjelpetekst bak (i)
    h += '<label class="field"><span>Merknad (valgfri)</span><input id="f-note" type="text" value="' + esc(r ? r.note || '' : '') + '" placeholder="F.eks. unger spiser dette"></label>';
    h += ingredientsFieldset(r ? r.ingredients : []);
    h += stepsHtml(r);   // v0.10: under ingrediensene
    if (r) h += sourceHtml(r.source);   // v0.12: lenke til kildeoppskriften
    h += '<p class="form-error" id="form-error" hidden></p>';
    h += '<div class="form-actions"><button type="submit" class="btn primary" data-testid="lagre">Lagre</button>' +
      '<a class="btn" href="#retter">Avbryt</a>' +
      (r ? '<button type="button" class="btn danger" data-action="delete-recipe">Slett</button>' : '') + '</div>';
    h += '</form></section>';
    main.innerHTML = h;
    if (!r) document.getElementById('f-name').focus();
  }

  // v0.11: «Tid (i)» – [min ved benken] og [min av seg selv] med [i ovnen | koketid | heving]
  function timeFieldsHtml(r) {
    var pm = passiveOf(r), pk = r && PASSIVE_LABEL[r.passiveKind] ? r.passiveKind : 'ovn';
    return '<div class="field v11-timefield"><div class="v11-lab"><span id="f-time-l">Tid</span>' +
      '<button type="button" class="v11-i" data-action="time-info" aria-expanded="false" aria-controls="f-minutes-hint" aria-label="Om tid" data-testid="tid-info"><span aria-hidden="true">i</span></button></div>' +
      '<p class="field-hint" id="f-minutes-hint" hidden>Bare tiden ved benken teller. «Fyll man–fre» velger helst retter på ' + fillLimit() + ' min eller mindre ved benken. Tid i ovnen, koketid og heving teller ikke.</p>' +
      '<div class="v11-time"><label><input id="f-minutes" type="number" inputmode="numeric" min="0" step="1" value="' + esc(r && r.minutes != null ? r.minutes : '') + '" placeholder="30" aria-label="Minutter ved benken" aria-describedby="f-minutes-hint">' +
      '<span class="unit">min ved benken</span></label>' +
      '<div><div class="pass"><input id="f-passive" type="number" inputmode="numeric" min="0" step="1" value="' + (pm ? pm : '') + '" placeholder="0" aria-label="Minutter av seg selv">' +
      '<select id="f-passive-kind" aria-label="Hva som går av seg selv">' + ['ovn', 'koking', 'heving'].map(function (k) { return '<option value="' + k + '"' + (k === pk ? ' selected' : '') + '>' + PASSIVE_LABEL[k] + '</option>'; }).join('') + '</select></div>' +
      '<span class="unit">min av seg selv</span></div></div></div>';
  }
  function readTimeFields(r) {
    var pr = (document.getElementById('f-passive') || {}).value || '';
    var pm = pr.trim() === '' ? 0 : Math.max(0, Math.min(1440, Math.round(Number(pr.replace(',', '.')) || 0)));
    var kind = (document.getElementById('f-passive-kind') || {}).value || 'ovn';
    if (pm) { r.passiveMinutes = pm; r.passiveKind = PASSIVE_LABEL[kind] ? kind : 'ovn'; }
    else { delete r.passiveMinutes; delete r.passiveKind; }
  }
  function saveRecipeForm(form) {
    var name = document.getElementById('f-name').value.trim();
    if (!name) return formError('Retten må ha et navn.', 'f-name');
    var minutesRaw = document.getElementById('f-minutes').value.trim();
    var minutes = minutesRaw === '' ? null : Math.max(0, Math.round(Number(minutesRaw.replace(',', '.')) || 0));
    var ingredients = readIngredients(form);
    var id = form.getAttribute('data-id');
    var note = document.getElementById('f-note').value.trim();
    var r = id ? recipeById(id) : null;
    var stEl = document.getElementById('f-steps');
    var steps = stEl ? parseSteps(stEl.value) : null;
    if (r) {
      r.name = name; r.minutes = minutes; r.note = note; r.ingredients = ingredients;
      readTimeFields(r);
      // v0.10: steg lagres bare når de avviker fra bibliotekets/startrettens steg
      if (steps) { if (steps.length && JSON.stringify(steps) !== JSON.stringify(defaultSteps(r))) r.steps = steps; else delete r.steps; }
      ops.saveRecipe(r, false);
    } else {
      var nr = { id: uid('r'), name: name, minutes: minutes, note: note, ingredients: ingredients };
      readTimeFields(nr);
      var fl = form.getAttribute('data-from-lib');   // v0.11: tilpasset rett fra Matrett-byggeren
      if (fl) { nr.fromLib = { id: fl, variant: form.getAttribute('data-from-variant') || '' }; var fd = dishById(fl); if (fd) finn.open = null; }
      if (steps && steps.length) nr.steps = steps;
      ops.saveRecipe(nr, true);
    }
    var fromLib = !r && form.getAttribute('data-from-lib');
    toast(r ? 'Lagret' : fromLib ? '«' + name + '» er lagt til i våre retter' : 'Rett lagt til');
    location.hash = fromLib ? '#retter/finn' : '#retter';
  }

  function deleteRecipe(id) {
    var r = recipeById(id);
    if (!r) return;
    var used = Object.keys(state.week_plan).filter(function (d) { return state.week_plan[d] === id; });
    ask({ id: 'slett-rett', title: 'Slette «' + r.name + '»?', text: used.length ? 'Den fjernes også fra ukeplanen.' : 'Retten slettes for hele husstanden.', ok: 'Slett', cancel: 'Avbryt' }).then(function (ok) {
      if (!ok) return;
      ops.deleteRecipe(id, used);
      toast('Rett slettet');
      location.hash = '#retter';
    });
  }


  /* ---------- v0.11: Matrett-byggeren (#retter/finn) ---------- */
  var DISHES = window.UKESHANDEL_DISHES || [];
  var finn = { q: '', time: undefined, kids: false, cat: null, open: null, sel: {} };
  function dishById(id) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i]; return null; }
  function variantOf(d, key) { return d && (d.variants.filter(function (v) { return v.key === key; })[0] || null); }
  // Hvilke retter/varianter husstanden har: lagt rett (lib + variant), tilpasset (fromLib), v0.3-bibliotek (lib-<id>) eller samme navn.
  function ownedDish(d) {
    var hit = { any: false, variants: {} };
    state.recipes.forEach(function (r) {
      var lid = r.lib || (r.fromLib && r.fromLib.id) || null;
      if (lid === d.id) { hit.any = true; var vk = r.variant || (r.fromLib && r.fromLib.variant); if (vk) hit.variants[vk] = true; return; }
      if (!lid && (r.id === 'lib-' + d.id || normName(r.name) === normName(d.name))) hit.any = true;
    });
    return hit;
  }
  // Forhåndsvalgt variant: den første som passer grensen (eller tidsfilteret), ellers den første.
  function defaultVariant(d, limit) {
    if (limit) { var fit = d.variants.filter(function (v) { return v.minutes <= limit; })[0]; if (fit) return fit; }
    return d.variants[0];
  }
  function finnTime() { return finn.time === undefined ? weekdayLimit() : finn.time; }
  function finnMatches(d) {
    var T = finnTime();
    if (T && !d.variants.some(function (v) { return v.minutes <= T; })) return false;
    if (finn.kids && !d.kids) return false;
    if (finn.cat && d.category !== finn.cat) return false;
    if (finn.q) { var q = normName(finn.q); if (normName(d.name).indexOf(q) < 0 && !d.variants.some(function (v) { return v.ingredients.some(function (i) { return normName(i[0]).indexOf(q) === 0; }); })) return false; }
    return true;
  }
  function dishRecipe(d, v) {
    var id = 'lib-' + d.id + '-' + v.key, n = 2;
    while (recipeById(id)) id = 'lib-' + d.id + '-' + v.key + '-' + (n++);
    var r = { id: id, name: d.name, minutes: v.minutes, note: '', origin: 'knaggen', servings: v.servings || 4, lib: d.id, variant: v.key,
      ingredients: v.ingredients.map(function (i) { return { name: i[0], qty: i[1], unit: i[2], aisle: normAisle(i[3]) }; }),
      steps: (v.steps || []).slice() };
    if (v.passiveMinutes) { r.passiveMinutes = v.passiveMinutes; r.passiveKind = v.passiveKind; }
    return r;
  }
  function addDish(dishId, vkey) {
    var d = dishById(dishId); if (!d) return;
    var v = vkey ? variantOf(d, vkey) : (variantOf(d, finn.sel[d.id]) || defaultVariant(d, finnTime()));
    if (!v) return;
    if (ownedDish(d).variants[v.key]) { toast(d.name + ' · ' + v.name + ' finnes allerede i rettene'); return; }
    var r = dishRecipe(d, v);
    ops.saveRecipe(r, true);
    renderFinnList();
    toast(d.name + ' · ' + v.name + ' lagt til', UNDO_MS, { label: 'Angre', run: function () {
      if (!recipeById(r.id)) return;
      var used = Object.keys(state.week_plan).filter(function (x) { return state.week_plan[x] === r.id; });
      ops.deleteRecipe(r.id, used);
      toast(d.name + ' er fjernet igjen');
      if (main.querySelector('[data-page="finn"]')) renderFinnList(); else if (!isFormRoute()) route();
    } });
  }
  function finnVariantsHtml(d, owned) {
    var selKey = finn.sel[d.id] || defaultVariant(d, finnTime()).key;
    var h = '<div class="v11-vars" role="radiogroup" aria-label="Varianter av ' + esc(d.name) + '">';
    d.variants.forEach(function (v) {
      var on = v.key === selKey, t = timeText(v, true);
      h += '<label class="v11-var' + (on ? ' sel' : '') + '" data-testid="variant" data-variant="' + v.key + '">' +
        '<input type="radio" name="var-' + esc(d.id) + '" value="' + v.key + '"' + (on ? ' checked' : '') + ' data-finn-var="' + esc(d.id) + '">' +
        '<span class="vn">' + esc(v.name) + (owned.variants[v.key] ? ' <span class="vname">· lagt til</span>' : '') + '</span>' +
        '<span class="vt"><b>' + esc(t.a) + '</b>' + (t.p ? ' ' + esc(t.p) : '') + '</span>' +
        '<span class="vi">' + esc(v.ingredients.map(function (i) { return i[0] + ' ' + formatQty(i[1]) + ' ' + i[2]; }).join(', ')) + '</span></label>';
    });
    h += '<div class="v11-acts"><button type="button" class="btn primary" data-action="finn-add-var" data-dish="' + esc(d.id) + '" data-testid="finn-legg-til">Legg til</button>' +
      '<a class="btn" href="#retter/tilpass/' + encodeURIComponent(d.id) + '/' + selKey + '" data-testid="finn-tilpass">Tilpass</a></div></div>';
    return h;
  }
  function finnListHtml() {
    var list = DISHES.filter(finnMatches), cats = {};
    list.forEach(function (d) { (cats[d.category] = cats[d.category] || []).push(d); });
    var names = Object.keys(cats).sort(function (a, b) { return a.localeCompare(b, 'nb'); });
    if (!list.length) return '<p class="empty" data-testid="finn-tomt">Ingen retter passer. Prøv et annet filter.</p>';
    var T = finnTime(), h = '';
    names.forEach(function (c) {
      var ds = cats[c].sort(function (a, b) { return a.name.localeCompare(b.name, 'nb'); });
      h += '<h3 class="v11-cat"><span>' + esc(c) + ' · ' + ds.length + '</span></h3><ul class="v11-rows" data-testid="finn-gruppe">';
      ds.forEach(function (d) {
        var own = ownedDish(d), v = variantOf(d, finn.sel[d.id]) || defaultVariant(d, T), open = finn.open === d.id;
        var done = own.any;   // hake når husstanden har retten (en variant, tilpasset eller fra før); ✓ åpner variantene
        h += '<li class="' + (open ? 'v11-open' : '') + '" data-dish="' + esc(d.id) + '" data-testid="finn-rett">' +
          '<div class="v11-row"><button type="button" class="t" data-action="finn-open" data-dish="' + esc(d.id) + '" aria-expanded="' + open + '" style="background:none;border:0;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-height:44px;justify-content:center">' +
          '<b>' + esc(d.name) + '</b></button><span class="tid">' + v.minutes + ' min</span>' +
          '<button type="button" class="v11-add' + (done ? ' on' : '') + '" data-action="finn-add" data-dish="' + esc(d.id) + '" data-testid="finn-pluss" aria-label="' + (done ? 'Lagt til: ' + esc(d.name) + ' – vis varianter' : 'Legg til ' + esc(d.name)) + '">' + (done ? '✓' : '+') + '</button></div>' +
          (open ? finnVariantsHtml(d, own) : '') + '</li>';
      });
      h += '</ul>';
    });
    return h;
  }
  function renderFinnList() {
    var el = main.querySelector('[data-testid="finn-liste"]');
    if (!el) return renderFinn();
    var ae = document.activeElement, keep = ae && el.contains(ae) && ae.getAttribute('data-action') ? '[data-action="' + ae.getAttribute('data-action') + '"][data-dish="' + ae.getAttribute('data-dish') + '"]' : null;
    el.innerHTML = finnListHtml();
    if (keep) { var k = el.querySelector(keep); if (k) k.focus({ preventScroll: true }); }
    var c = main.querySelector('[data-testid="finn-antall"]'); if (c) c.textContent = finnCount();
  }
  function finnCount() { var n = state.recipes.length; return n + (n === 1 ? ' rett' : ' retter') + ' i våre retter'; }
  function renderFinn() {
    var lim = weekdayLimit(), T = finnTime();
    var h = '<section class="page" data-page="finn">';
    h += '<div class="page-head"><a class="back" href="#retter">‹ Retter</a><h2>Finn retter</h2><a class="btn" href="#retter" data-testid="finn-ferdig">Ferdig</a></div>';
    if (lim) h += '<p class="v11-limit" data-testid="finn-grense">Hverdag: <b>under ' + lim + ' min</b> · <a href="#husstand/hverdag" data-testid="finn-grense-endre">endre</a></p>';
    h += '<label class="v11-search"><span class="sr">Søk etter rett</span><input id="finn-q" type="search" placeholder="Søk etter rett eller ingrediens" value="' + esc(finn.q) + '" autocomplete="off" data-testid="finn-sok"></label>';
    var chip = function (on, act, val, label, extra) { return '<button type="button" class="fv-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-action="' + act + '" data-val="' + esc(val) + '"' + (extra || '') + '>' + (on ? '✓ ' : '') + esc(label) + '</button>'; };
    h += '<div class="v11-chips" role="group" aria-label="Tid og barn">';
    if (lim && lim !== 15 && lim !== 30) h += chip(T === lim, 'finn-time', lim, 'Under ' + lim + ' min', ' data-testid="finn-tid-grense"');
    h += chip(T === 15, 'finn-time', 15, 'Rask', ' data-testid="finn-tid-rask"') + chip(T === 30, 'finn-time', 30, 'Hverdag', ' data-testid="finn-tid-hverdag"') +
      chip(!T, 'finn-time', 0, 'Alle', ' data-testid="finn-tid-alle"') + '<span class="sep" aria-hidden="true"></span>' +
      chip(finn.kids, 'finn-kids', 1, 'Barna spiser', ' data-testid="finn-barn"') + '</div>';
    h += '<div class="v11-chips" role="group" aria-label="Kategori">' + (window.UKESHANDEL_DISH_CATEGORIES || []).map(function (c) {
      return chip(finn.cat === c, 'finn-cat', c, c, ' data-testid="finn-kat"'); }).join('') + '</div>';
    h += '<div data-testid="finn-liste">' + finnListHtml() + '</div>';
    h += '<div class="v11-foot"><span data-testid="finn-antall">' + finnCount() + '</span><a class="btn primary" href="#retter">Ferdig</a></div>';
    h += '</section>';
    main.innerHTML = h;
  }
  // «Tilpass»: vanlig skjema, ferdig utfylt; lagres som egen rett med fromLib (uten Knaggen-merke og skalering).
  function renderTilpass(dishId, vkey) {
    var d = dishById(dishId), v = variantOf(d, vkey) || (d && d.variants[0]);
    if (!d || !v) { location.hash = '#retter/finn'; return; }
    var r = dishRecipe(d, v);
    var h = '<section class="page" data-page="rett-skjema" data-mode="tilpass">';
    h += '<div class="page-head"><a class="back" href="#retter/finn">‹ Finn retter</a><h2>Tilpass rett</h2></div>';
    h += '<p class="v11-note" data-testid="tilpass-info">Blir deres egen rett: endre det dere vil. Mengdene tilpasses ikke husstanden automatisk.</p>';
    h += '<form id="recipe-form" data-id="" data-from-lib="' + esc(d.id) + '" data-from-variant="' + esc(v.key) + '" novalidate>';
    h += '<label class="field"><span>Navn</span><input id="f-name" type="text" required value="' + esc(d.name) + '"></label>';
    h += timeFieldsHtml(r);
    h += '<label class="field"><span>Merknad (valgfri)</span><input id="f-note" type="text" value="" placeholder="F.eks. unger spiser dette"></label>';
    h += ingredientsFieldset(r.ingredients);
    h += stepsHtml(r);
    h += '<p class="form-error" id="form-error" hidden></p>';
    h += '<div class="form-actions"><button type="submit" class="btn primary" data-testid="lagre">Legg til i våre retter</button>' +
      '<a class="btn" href="#retter/finn" data-testid="tilpass-avbryt">Avbryt</a></div>';
    h += '</form></section>';
    main.innerHTML = h;
  }

  /* ---------- v0.12: Hent oppskrift fra nettet (#retter/hent) ----------
   * Android: «Del» fra Chrome til den installerte appen (Web Share Target i manifestet → ?url=/&text=).
   * iOS og andre: lim inn lenka. Arket spør om dag (eller ingen) og «Legg i Retter» ja/nei, så henter Firebase-funksjonen
   * hentOppskrift siden og leser schema.org Recipe (ingen AI). Resultatet vises i det vanlige skjemaet før lagring. */
  var imp = { url: '', date: null, retter: true, busy: false, error: '', result: null, auto: false };
  function validSource(u) { return typeof u === 'string' && u.length <= 2000 && /^https?:\/\/[^\s]+$/i.test(u); }
  function findLink(text) {
    var m = String(text || '').match(/https?:\/\/[^\s<>"]+/i);
    if (!m) return '';
    var u = m[0].replace(/[).,;:!?»”']+$/, '');
    try { var p = new URL(u); return (p.protocol === 'http:' || p.protocol === 'https:') && u.length <= 2000 ? p.href : ''; } catch (e) { return ''; }
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function sourceHtml(u) {
    return validSource(u) ? '<p class="v12-src" data-testid="kilde">Kilde: <a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow" data-testid="kilde-lenke">' +
      esc(hostOf(u)) + ' <span aria-hidden="true">↗</span></a></p>' : '';
  }
  function renderHent() {
    var h = '<section class="page" data-page="hent">';
    h += '<div class="page-head"><a class="back" href="#retter">‹ Retter</a><h2>Hent oppskrift</h2></div>';
    h += '<form id="hent-form" novalidate>';
    h += '<label class="field"><span>Lenke til oppskriften</span><input id="h-url" type="text" inputmode="url" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" required value="' +
      esc(imp.url) + '" placeholder="https://…" data-testid="hent-lenke" aria-describedby="h-url-hint"></label>';
    h += '<p class="field-hint" id="h-url-hint">På Android: trykk Del i Chrome og velg Knaggen. På iPhone: kopier lenka i Safari og lim den inn her.</p>';
    h += '<p class="form-error" id="form-error"' + (imp.error ? '' : ' hidden') + '>' + esc(imp.error) + '</p>';
    h += '<div class="form-actions"><button type="submit" class="btn primary" data-testid="hent-videre">Fortsett</button><a class="btn" href="#retter">Avbryt</a></div>';
    h += '</form></section>';
    main.innerHTML = h;
    imp.error = '';
    if (imp.auto && imp.url) { imp.auto = false; openHentSheet(); }
    else if (!imp.url) document.getElementById('h-url').focus();
  }
  function hentSheetHtml() {
    var dates = weekDates(ui.weekOffset);
    var chip = function (on, act, val, label, tid) { return '<button type="button" class="fv-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-hent="' + act + '" data-val="' + esc(val) + '" data-testid="' + tid + '">' + esc(label) + '</button>'; };
    var h = '<div class="sheet-head"><h3 id="hent-ark-h">Legg til oppskrift</h3><button type="button" class="icon-btn" data-hent="lukk" aria-label="Lukk">✕</button></div>';
    h += '<p class="sub" data-testid="hent-vert">' + esc(hostOf(imp.url)) + '</p>';
    h += '<p class="m v12-lab" id="hent-dag-l">Hvilken dag?</p><div class="fv-chips" role="group" aria-labelledby="hent-dag-l">' +
      chip(!imp.date, 'dag', '', 'Ingen dag', 'hent-dag-ingen') +
      dates.map(function (d, i) { return chip(imp.date === d, 'dag', d, cap(DAY_SHORT[i]) + ' ' + shortDate(d), 'hent-dag-' + i); }).join('') + '</div>';
    h += '<p class="m v12-lab" id="hent-retter-l">Legg i Retter?</p><div class="fv-chips" role="group" aria-labelledby="hent-retter-l">' +
      chip(imp.retter, 'retter', '1', 'Ja', 'hent-retter-ja') + chip(!imp.retter, 'retter', '0', 'Nei, bare denne gangen', 'hent-retter-nei') + '</div>';
    var none = !imp.date && !imp.retter;
    if (none) h += '<p class="m" data-testid="hent-velg">Velg en dag, eller legg den i Retter.</p>';
    else if (!imp.retter) h += '<p class="m">Blir en engangsmiddag ' + esc(dayName(imp.date).toLowerCase()) + ' – lagres ikke under Retter.</p>';
    if (imp.error) h += '<p class="form-error" role="alert" data-testid="hent-feil">' + esc(imp.error) + '</p>';
    h += '<div class="ask-acts"><button type="button" class="btn" data-hent="' + (imp.error ? 'bare-lenke' : 'lukk') + '" data-testid="' + (imp.error ? 'hent-bare-lenke' : 'hent-avbryt') + '"' + (imp.busy ? ' disabled' : '') + '>' +
      (imp.error ? 'Lagre bare lenka' : 'Avbryt') + '</button>' +
      '<button type="button" class="btn primary" data-hent="hent" data-testid="hent-ok"' + (none || imp.busy ? ' disabled' : '') + (imp.busy ? ' aria-busy="true"' : '') + '>' +
      (imp.busy ? 'Henter …' : imp.error ? 'Prøv igjen' : 'Hent oppskrift') + '</button></div>';
    return h;
  }
  function updateHentSheet() {
    var ov = document.getElementById('hent-ark');
    if (!ov) return;
    var sh = ov.querySelector('.sheet'), act = document.activeElement, key = act && act.getAttribute && (act.getAttribute('data-testid') || '');
    sh.innerHTML = hentSheetHtml();
    var back = key && sh.querySelector('[data-testid="' + key + '"]:not([disabled])');
    var f = back || sh.querySelector('.btn.primary:not([disabled])') || sh.querySelector('.fv-chip');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }
  function openHentSheet() {
    imp.busy = false; imp.error = '';
    var ov = openV9Sheet('hent-ark', hentSheetHtml());
    ov.querySelector('.sheet').setAttribute('data-testid', 'hent-ark');
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('[data-hent]');
      if (!b || b.disabled) return;
      var a = b.getAttribute('data-hent');
      if (a === 'lukk') { closeV9Sheet(true); return; }
      if (a === 'dag') { imp.date = b.getAttribute('data-val') || null; updateHentSheet(); return; }
      if (a === 'retter') { imp.retter = b.getAttribute('data-val') === '1'; updateHentSheet(); return; }
      if (a === 'bare-lenke') { imp.result = { found: false, reason: imp.failReason || 'net', name: '', url: imp.url }; closeV9Sheet(false); location.hash = '#retter/hent/sjekk'; return; }
      if (a === 'hent') runHent();
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapTab(ov, e); });
  }
  var HENT_ERR = {
    'resource-exhausted': 'Dere har hentet mange oppskrifter den siste timen. Vent litt og prøv igjen.',
    'permission-denied': 'Denne telefonen er ikke med i husstanden lenger.',
    'invalid-argument': 'Lenka ser ikke riktig ut. Bruk en vanlig nettadresse (https://…).',
    'no-server': 'Fikk ikke kontakt med Knaggen. Sjekk nettet og prøv igjen.'
  };
  function runHent() {
    if (!hh || !Sync || !Sync.fetchRecipe) {   // uten husstand kan ikke funksjonen brukes (krever medlemskap)
      imp.result = { found: false, reason: 'local', name: '', url: imp.url };
      closeV9Sheet(false); location.hash = '#retter/hent/sjekk'; return;
    }
    imp.busy = true; imp.error = ''; updateHentSheet();
    var url = imp.url;
    Sync.fetchRecipe(hh.hid, url).then(function (res) {
      imp.busy = false;
      if (!document.getElementById('hent-ark') || imp.url !== url) return;
      imp.result = res && typeof res === 'object' ? res : { found: false, reason: 'net' };
      if (!validSource(imp.result.url)) imp.result.url = url;
      closeV9Sheet(false); location.hash = '#retter/hent/sjekk';
    }, function (e) {
      imp.busy = false;
      imp.failReason = e && e.code;
      imp.error = HENT_ERR[e && e.code] || 'Noe gikk galt under hentingen. Prøv igjen, eller lagre bare lenka.';
      updateHentSheet();
    });
  }
  var HENT_WHY = { 'timeout': 'siden svarte ikke i tide', 'too-large': 'siden er for stor', 'blocked': 'adressen er ikke tillatt',
    'redirects': 'for mange omdirigeringer', 'http': 'siden svarte med en feil', 'dns': 'fant ikke nettstedet', 'not-html': 'lenka er ikke en nettside',
    'local': 'henting krever at Knaggen er delt med husstanden', 'resource-exhausted': 'for mange hentinger den siste timen', 'no-server': 'ingen kontakt med Knaggen' };
  // v0.12.1: siste forsøk for hentede ingredienser – siste ord («nøytral olje» → olje, «tørr hvitvin» → hvitvin). Ellers Tørrvare
  // (appen har ingen «Annet»-avdeling; ukjente avdelinger vises som Tørrvare også i eldre versjoner).
  function importAisleFallback(name) {
    var w = normName(name).split(' ');
    if (w.length < 2) return null;
    var last = w[w.length - 1], k = knownIngredient(last, true);
    return (k && k.aisle) || guessAisle(last) || null;
  }
  function renderHentForm() {
    var res = imp.result || {}, ok = !!res.found, url = validSource(res.url) ? res.url : imp.url;
    var r = { name: res.name || '', minutes: ok && res.minutes != null ? res.minutes : null, note: '',
      ingredients: (ok && Array.isArray(res.ingredients) ? res.ingredients : []).map(function (i) {
        var unit = UNITS.indexOf(i.unit) >= 0 ? i.unit : '', name = String(i.name || '').slice(0, 200);
        var k = knownIngredient(name, true), a = itemAisle(name, (k && k.aisle) || guessAisle(name) || importAisleFallback(name) || 'Tørrvare');
        return { name: name, qty: typeof i.qty === 'number' ? i.qty : null, unit: unit, aisle: AISLES.indexOf(a) >= 0 ? a : 'Tørrvare' };
      }).filter(function (i) { return i.name; }),
      steps: ok && Array.isArray(res.steps) ? res.steps.slice(0, 12) : [] };
    // v0.12.1: antall personer – forhåndsutfylt med oppskriftens porsjoner (recipeYield), ellers husstanden (som v0.8-skaleringen).
    var yld = ok && typeof res.servings === 'number' && res.servings >= 1 && res.servings <= 50 ? Math.round(res.servings) : null;
    var defN = hentDefaultPeople();
    imp.base = { yield: yld, from: yld || defN, ings: r.ingredients.map(function (i) { return Object.assign({}, i); }) };
    imp.people = yld || defN;
    if (ok && res.passiveMinutes && PASSIVE_LABEL[res.passiveKind]) { r.passiveMinutes = res.passiveMinutes; r.passiveKind = res.passiveKind; }
    var h = '<section class="page" data-page="rett-skjema" data-mode="hent">';
    h += '<div class="page-head"><a class="back" href="#retter/hent">‹ Tilbake</a><h2>Sjekk oppskriften</h2></div>';
    if (ok) h += '<p class="v11-note" data-testid="hent-funnet">Hentet fra ' + esc(hostOf(url)) + '. Mengder og enheter er tolket automatisk – sjekk dem før du lagrer.</p>';
    else h += '<p class="v11-note v12-warn" role="status" data-testid="hent-ingen">' + (res.reason === 'no-recipe' || !res.reason
      ? 'Fant ingen oppskrift med ingredienser på siden. Navnet og lenka lagres – legg inn ingrediensene selv om dere vil.'
      : 'Klarte ikke å hente oppskriften (' + esc(HENT_WHY[res.reason] || 'ukjent feil') + '). Navnet og lenka kan lagres likevel.') + '</p>';
    h += '<p class="hint" data-testid="hent-mal">' + (imp.retter ? 'Legges i Retter' : 'Engangsmiddag') + (imp.date ? ' · ' + esc(dayName(imp.date) + ' ' + shortDate(imp.date)) : ' · ingen dag') + '</p>';
    h += '<form id="hent-lagre" novalidate>';
    h += '<label class="field"><span>Navn</span><input id="f-name" type="text" required value="' + esc(r.name) + '" placeholder="F.eks. Fiskegrateng"></label>';
    if (imp.retter) {
      h += timeFieldsHtml(r);
      h += '<label class="field"><span>Merknad (valgfri)</span><input id="f-note" type="text" value="" placeholder="F.eks. unger spiser dette"></label>';
    }
    h += '<label class="field"><span>Antall personer</span><input id="f-people" type="number" inputmode="numeric" min="1" max="50" step="1" value="' + imp.people + '" data-testid="hent-personer"></label>';
    h += '<p class="field-hint" data-testid="hent-personer-hint">' + (yld ? 'Oppskriften er for ' + yld + ' ' + (yld === 1 ? 'porsjon' : 'porsjoner') + '. Endrer du tallet, regnes mengdene om.'
      : 'Fant ikke antall porsjoner i oppskriften – satt til ' + (hsPeople() ? 'husstanden' : 'standarden') + ' (' + defN + '). Endrer du tallet, regnes mengdene om.') + '</p>';
    h += ingredientsFieldset(r.ingredients);
    if (imp.retter) h += stepsHtml(r);
    h += sourceHtml(url);
    h += '<p class="form-error" id="form-error" hidden></p>';
    h += '<div class="form-actions"><button type="submit" class="btn primary" data-testid="lagre">' + (imp.retter ? 'Legg til i våre retter' : 'Lagre engangsmiddag') + '</button>' +
      '<a class="btn" href="#retter" data-testid="hent-avbryt-skjema">Avbryt</a></div>';
    h += '</form></section>';
    main.innerHTML = h;
    imp.source = url;
    var rowsEl = main.querySelectorAll('.ing-row');
    for (var ri = 0; ri < rowsEl.length && ri < imp.base.ings.length; ri++) rowsEl[ri].querySelector('.ing-qty').setAttribute('data-auto', rowsEl[ri].querySelector('.ing-qty').value);
    document.getElementById('f-people').addEventListener('input', function () { applyHentPeople(this.value); });
    if (!r.name) document.getElementById('f-name').focus();
  }
  // v0.12.1: husstandens porsjoner (samme vekting som v0.8: voksen 1, barn ¾, småbarn ½), avrundet; uten husstand 4.
  function hentDefaultPeople() {
    var p = hsPeople();
    var n = p ? Math.round(SC.porsjoner(p)) : SC.BASE;
    return Math.max(1, Math.min(50, n || SC.BASE));
  }
  // Faktor = personer / oppskriftens porsjoner (eksakt: v0.8-gulvet ½ og ¼-avrundingen er laget for retter for 4 og ville gitt
  // f.eks. 3 porsjoner når 2 av 6 er valgt). Hver mengde skaleres med samme regel som handlelista (scaleQty: telleenheter rundes).
  function hentFactor(n) {
    return n / imp.base.from;
  }
  function applyHentPeople(v) {
    var n = Math.round(Number(String(v).replace(',', '.')));
    if (!imp.base || !(n >= 1 && n <= 50)) return;
    imp.people = n;
    var f = hentFactor(n), rows = document.querySelectorAll('#ing-list .ing-row');
    for (var i = 0; i < rows.length && i < imp.base.ings.length; i++) {
      var q = rows[i].querySelector('.ing-qty'), b = imp.base.ings[i];
      if (q.value !== q.getAttribute('data-auto')) continue;   // brukeren har rettet mengden selv – la den stå
      var nv = formatQty(b.qty == null ? null : scaleQty(b.qty, b.unit, f, normName(b.name)));
      q.value = nv; q.setAttribute('data-auto', nv);
    }
  }
  function saveHentForm(form) {
    var name = document.getElementById('f-name').value.trim();
    if (!name) return formError('Retten må ha et navn.', 'f-name');
    var ingredients = readIngredients(form), date = imp.date, src = validSource(imp.source) ? imp.source : null, msg;
    if (imp.retter) {
      var minutesRaw = document.getElementById('f-minutes').value.trim();
      var nr = { id: uid('r'), name: name, minutes: minutesRaw === '' ? null : Math.max(0, Math.round(Number(minutesRaw.replace(',', '.')) || 0)),
        note: document.getElementById('f-note').value.trim(), ingredients: ingredients };
      readTimeFields(nr);
      var stEl = document.getElementById('f-steps'), steps = stEl ? parseSteps(stEl.value) : [];
      if (steps.length) nr.steps = steps;
      if (src) nr.source = src;
      if (imp.people) nr.servings = imp.people;   // v0.12.1: mengdene gjelder for så mange (egen rett: skaleres ikke videre med husstanden, som før)
      ops.saveRecipe(nr, true);
      if (date) ops.setDays([{ date: date, recipe_id: nr.id, oneoff: null }]);
      msg = '«' + name + '» er lagt til i våre retter' + (date ? ' og på ' + dayName(date).toLowerCase() : '');
    } else {
      var o = { id: uid('o'), name: name, ingredients: ingredients };
      if (src) o.source = src;
      ops.setDays([{ date: date, recipe_id: null, oneoff: o }]);
      msg = 'Engangsmiddag lagret på ' + dayName(date).toLowerCase();
    }
    imp = { url: '', date: null, retter: true, busy: false, error: '', result: null, auto: false };
    toast(msg);
    location.hash = date ? '#uke' : '#retter';
  }
  function submitHentLink() {
    var raw = document.getElementById('h-url').value.trim();
    var u = findLink(raw);
    if (!u) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return formError('Bare vanlige nettadresser (http:// eller https://) kan hentes.', 'h-url');
      if (raw && !/\s/.test(raw) && /\.[a-z]{2,}/i.test(raw)) u = findLink('https://' + raw);
      if (!u) return formError('Lim inn en lenke til en oppskrift, f.eks. https://…', 'h-url');
    }
    if (u !== imp.url) { imp.date = null; imp.retter = true; }
    imp.url = u; imp.result = null;
    document.getElementById('h-url').value = u;
    openHentSheet();
  }

  /* ---------- Uke ---------- */

  function renderUke() {
    var dates = weekDates(ui.weekOffset);
    var today = isoDate(new Date());
    var rs = sortedRecipes();
    var usedBy = {}; // recipe_id -> dagindeks
    var count = 0;
    dates.forEach(function (d, i) {
      var id = state.week_plan[d];
      if (state.oneoffs[d]) count++;
      else if (id && recipeById(id)) { usedBy[id] = i; count++; }
    });
    var emptyWeekdays = dates.slice(0, 5).filter(function (d) {
      return !state.oneoffs[d] && !(state.week_plan[d] && recipeById(state.week_plan[d]));
    }).length;
    // v0.4.4: byttemodus gjelder bare mens kilde-dagen er i uka som vises og fortsatt har middag.
    // v0.16: byttemodus overlever ukeskifte, så en middag kan flyttes til en annen uke (merket følger med).
    if (ui.swap && !dinnerName(ui.swap.from)) ui.swap = null;
    // Endret en annen telefon kilde-dagen mens vi valgte? Avbryt heller enn å bytte noe annet enn det som ble valgt.
    if (ui.swap && dayEntry(ui.swap.from).sig !== ui.swap.sig) {
      toast(dayName(ui.swap.from) + ' ble endret på en annen telefon – byttet er avbrutt', 4000);
      ui.swap = null;
    }
    var swapFrom = ui.swap ? ui.swap.from : null;
    var swapName = swapFrom ? dinnerName(swapFrom) : '';
    var swapOther = swapFrom && dates.indexOf(swapFrom) < 0;
    var swapDay = swapFrom ? dayName(swapFrom).toLowerCase() + (swapOther ? ' ' + shortDate(swapFrom) : '') : '';
    // Knappen til høyre på hver dag: «Bytt» (dag med middag), i byttemodus «Bytt hit» / «Flytt hit» / «Avbryt».
    function swapBtn(d, name) {
      var dn = dayName(d).toLowerCase();
      if (swapFrom === d) return '<button type="button" class="btn small swap-btn is-from" data-action="swap-cancel" data-date="' + d + '" aria-pressed="true" aria-label="Avbryt bytting av ' + esc(name) + '">Avbryt</button>';
      if (swapFrom) return '<button type="button" class="btn small swap-btn swap-to" data-action="swap-to" data-date="' + d + '" data-testid="bytt-hit" aria-describedby="swap-hint" aria-label="' +
        esc(name ? 'Bytt ' + swapName + ' (' + swapDay + ') med ' + name + ' (' + dn + ')' : 'Flytt ' + swapName + ' til ' + dn) + '">' + (name ? '⇅ Bytt hit' : '→ Flytt hit') + '</button>';
      return name ? '<button type="button" class="btn small swap-btn" data-action="swap-start" data-date="' + d + '" data-testid="bytt" aria-label="Bytt ' + esc(name) + ' (' + dn + ') med en annen dag">⇅ Bytt</button>' : '';
    }

    var h = '<section class="page' + (swapFrom ? ' swapping' : '') + '" data-page="uke">';
    // v0.9: ett kort om gangen – Kom i gang (velkomst + husstand + deling), ellers v0.8-kortet, ellers hjemskjerm-kortet.
    var startOn = !swapFrom && showStart(), startStep = startOn ? startSteps(dates).active : 0;   // byttemodus: kortet viker
    if (startOn) {
      h += startCardHtml(dates);
    } else if (showHsCard()) {
      h += '<section class="hs-card" data-testid="hs-forste" aria-label="Husstandens størrelse">' +
        '<h3>Hvor mange spiser middag hos dere?</h3>' +
        '<p class="lead">Da passer mengdene i rettene fra Knaggen. Retter dere har lagt inn selv, endres ikke.</p>' +
        peopleCountersHtml('hs0', { voksen: 2, barn: 2, smabarn: 0 }) +
        '<div class="hs-acts">' +
        '<button type="button" class="btn primary" data-action="hs-bruk" data-testid="hs-bruk">Bruk</button>' +
        '<button type="button" class="btn ghost" data-action="hs-hopp" data-testid="hs-hopp">Hopp over</button></div></section>';
    } else if (!swapFrom && showInstallCard(dates)) {
      h += installCardHtml();
    }
    h += weekNav(dates);
    var hasRecipes = state.recipes.length > 0;
    if (V010_LAYOUT) {   // testkroken: v0.10-oppsettet av dagene (eldre testsuiter), kopiert uendret fra 0.10.0
      h += '<div class="week-tools"><p class="summary" data-testid="uke-oppsummering">' + count + ' av 7 kvelder har middag</p>' +
        (startStep === 1 ? '' : '<button type="button" class="btn small" data-action="fill-weekdays" data-testid="fyll"' + (emptyWeekdays ? '' : ' disabled') + '>Fyll man–fre</button>') + '</div>';   // v0.9: ikke to like knapper
      if (ui.notice) { h += '<p class="notice" role="status" data-testid="uke-notis">' + esc(ui.notice) + '</p>'; ui.notice = ''; }
      h += '<ol class="days">';
      dates.forEach(function (d, i) {
        var o = state.oneoffs[d];
        var sel = state.week_plan[d];
        var r = !o && sel ? recipeById(sel) : null;
        var dn = o ? o.name : r ? r.name : '';
        var devCls = '';
        if (r && !o && dayDelta(d)) {
          var _dd = dayDelta(d), _net = SC.netPeople(_dd);
          var _up = _net > 0 && (_dd.voksen||0) >= 0 && (_dd.barn||0) >= 0 && (_dd.smabarn||0) >= 0;
          var _dn = _net < 0 && (_dd.voksen||0) <= 0 && (_dd.barn||0) <= 0 && (_dd.smabarn||0) <= 0;
          devCls = _up ? ' dev-pluss' : _dn ? ' dev-minus' : ' dev-endret';
        }
        h += '<li class="day' + (d === today ? ' today' : '') + (r || o ? '' : ' is-empty') + (o ? ' has-oneoff' : '') + devCls +
          (swapFrom === d ? ' swap-from' : swapFrom ? ' swap-target' : '') + '" data-date="' + d + '">' +
          '<label for="day-' + d + '" class="day-label"><span class="dname">' + DAY_NAMES[i] + '</span>' +
          '<span class="ddate">' + shortDate(d) + (d === today ? ' · i dag' : '') + '</span></label>';
        if (o) {
          h += '<div class="oneoff"><span class="badge">Engangsmiddag</span>' +
            '<span class="oneoff-name">' + esc(o.name) + '</span>' +
            '<span class="day-meta">' + o.ingredients.length + (o.ingredients.length === 1 ? ' ingrediens' : ' ingredienser') + '</span></div>' +
            '<div class="oneoff-actions">' + (swapFrom ? swapBtn(d, dn) : '<a class="btn small" href="#uke/engang/' + d + '">Rediger</a>' +
            '<button type="button" class="btn small" data-action="remove-oneoff" data-date="' + d + '">Fjern</button>' + swapBtn(d, dn)) + '</div>';
        } else {
          // v0.4.4: retter som er brukt en annen dag er ikke lenger sperret. Å velge en flytter den hit, og det som
          // sto her (eller tomt) går til dagen den kom fra.
          h += '<div class="day-row"><select id="day-' + d + '" class="day-select" data-date="' + d + '">' +
            '<option value="">Tom</option>';
          rs.forEach(function (x) {
            var usedIdx = usedBy[x.id];
            var takenElsewhere = usedIdx != null && usedIdx !== i;
            h += '<option value="' + esc(x.id) + '"' + (r && r.id === x.id ? ' selected' : '') + '>' + esc(x.name) +
              (takenElsewhere ? (r ? ' (bytt med ' : ' (flytt fra ') + DAY_SHORT[usedIdx] + ')' : '') + '</option>';
          });
          h += '<option value="__oneoff__">＋ Engangsmiddag …</option></select>' + swapBtn(d, dn) + '</div>';
          var meta = [];
          if (r) {
            if (r.minutes) meta.push(r.minutes + ' min');
            if (r.note) meta.push(r.note);
          }
          var fTag = '';
          if (r && !o) {
            var ff = dayFactor(d, r);
            if (hsPeople() && ff !== 1 && ff !== 'Tom' && SC.isKnaggen(r) && hsScaleOn())
              fTag = ' <span class="hs-tag" data-testid="hs-tilpasset">Tilpasset ' + SC.fmt(ff) + '</span>';
          }
          var chip = (!o && r) ? chipHtml(d, r) : '';
          var endre = (!o && r && !dayDelta(d)) ? '<button type="button" class="linkbtn" data-action="hs-day" data-date="' + d + '" data-testid="hs-endre">Endre hvem som spiser</button>' : '';
          h += '<div class="day-foot"><span class="day-meta">' + esc(meta.join(' · ')) + fTag + '</span>' +
            (r ? endre : '<a class="linkbtn" href="#uke/engang/' + d + '">+ Engangsmiddag</a>') + '</div>' + chip;

        }
        h += '</li>';
      });
      h += '</ol>';
    } else {
      // v0.11 (spec 2, Uke): «Fyll man–fre» og «Tøm uka» i ⋯-menyen; Fyll som egen knapp bare når uka er tom (og det finnes retter).
      h += '<div class="week-tools v11-head"><p class="summary grow" data-testid="uke-oppsummering">' + count + ' av 7 kvelder har middag</p>' +
        '<button type="button" class="btn v11-more" data-action="week-menu" data-testid="uke-meny" aria-haspopup="dialog" aria-label="Mer for uka">⋯</button></div>';
      if (!count && hasRecipes && startStep !== 1 && !swapFrom) h += '<div class="row-actions v11-fill"><button type="button" class="btn primary" data-action="fill-weekdays" data-testid="fyll">Fyll man–fre</button></div>';
      if (ui.notice) { h += '<p class="notice" role="status" data-testid="uke-notis">' + esc(ui.notice) + '</p>'; ui.notice = ''; }
      h += '<ol class="days v11-rows">';
      dates.forEach(function (d, i) {
        var o = state.oneoffs[d];
        var sel = state.week_plan[d];
        var r = !o && sel ? recipeById(sel) : null;
        var dn = o ? o.name : r ? r.name : '';
        var mk = dn ? markOf(d) : null;   // v0.16
        // Merke bare ved avvik: hvem som spiser (+2 til middag …), eller tid over det vanlige
        var tag = '';
        if (r && dayDelta(d)) tag = dayTagText(d);
        else if (r && r.minutes && r.minutes > fillLimit()) tag = r.minutes + ' min';
        h += '<li class="day v11-day' + (d === today ? ' today' : '') + (r || o ? '' : ' is-empty') + (o ? ' has-oneoff' : '') +
          (swapFrom === d ? ' swap-from' : swapFrom ? ' swap-target' : '') + '" data-date="' + d + '">' +
          '<div class="v11-row">' +
          '<button type="button" class="day-open" data-action="day-open" data-date="' + d + '" data-testid="dag" aria-haspopup="dialog" aria-label="' + esc(dayLabel(d) + ': ' + (dn || 'ingen middag') + (tag ? ', ' + tag : '') + (mk ? (mk === 'rester' ? ', rester' : ', allerede handlet') + ', ikke på handlelista' : '')) + '">' +
          '<span class="dl"><b class="dname">' + DAY_SHORT[i].charAt(0).toUpperCase() + DAY_SHORT[i].slice(1) + '</b><span class="ddate">' + shortDate(d) + '</span></span>' +
          '<span class="t"><b class="' + (dn ? 'day-name' : 'none') + '">' + esc(dn || 'Tom') + '</b>' + (o ? '<span class="s">Engangsmiddag</span>' : '') + '</span>' +
          (tag ? '<span class="v11-tag" data-testid="dag-merke">' + esc(tag) + '</span>' : '') +
          (mk ? '<span class="v16-mark" data-testid="dag-handlet" data-mark="' + mk + '" aria-hidden="true">' + (mk === 'rester' ? ICON_BOWL + 'Rester' : '✓ Handlet') + '</span>' : '') +
          (swapFrom ? '' : '<span class="go" aria-hidden="true">›</span>') + '</button>' +
          (swapFrom ? swapBtn(d, dn) : '') + '</div></li>';
      });
      h += '</ol>';
    }
    if (swapFrom) {
      // v0.6.1 (spec v0.6.1 punkt 5): enklere tekst. Dagen som byttes er markert i lista.
      h += '<div class="swap-bar" data-testid="bytte-linje"><p id="swap-hint" class="swap-hint">' + (swapOther ? esc(swapName + ' (' + swapDay + ')') + ': trykk på dagen du vil bytte med' : 'Trykk på dagen du vil bytte med') + '</p><button type="button" class="btn small" data-action="swap-cancel" data-testid="bytt-avbryt">Avbryt</button></div>';
    }
    if (V010_LAYOUT) h += '<div class="row-actions"><a class="btn primary" href="#liste">Til handlelista →</a>' +
      (count ? '<button type="button" class="btn" data-action="clear-week" data-testid="tom-uka">Tøm uka</button>' : '') + '</div>';
    if (ui.dayOpen && dates.indexOf(ui.dayOpen) >= 0 && !swapFrom) h += daySheetHtml(ui.dayOpen, dates, rs, usedBy, swapBtn);
    else ui.dayOpen = null;
    if (ui.weekMenu && !swapFrom) h += weekMenuHtml(dates, count, emptyWeekdays, hasRecipes);
    if (ui.markMenu && dinnerName(ui.markMenu) && !swapFrom && !ui.dayOpen) h += markMenuHtml(ui.markMenu); else ui.markMenu = null;   // v0.16
    h += '</section>';
    // Ny tegning (f.eks. endring fra en annen telefon) skal ikke miste tastaturfokus.
    var ae = document.activeElement, keep = null;
    if (ae && ae !== main && main.contains(ae)) {
      keep = ae.id ? '#' + ae.id : ae.getAttribute('data-action') ? '[data-action="' + ae.getAttribute('data-action') + '"]' +
        (ae.getAttribute('data-date') ? '[data-date="' + ae.getAttribute('data-date') + '"]' : '') : null;
    }
    main.innerHTML = h;
    if (keep) { var ke = main.querySelector(keep); if (ke) try { ke.focus({ preventScroll: true }); } catch (x) { ke.focus(); } }
  }


  // v0.11: kort merke for avvik i hvem som spiser («+2 til middag», «−1 til middag», «Endret»)
  function dayTagText(d) {
    var dd = dayDelta(d); if (!dd) return '';
    var net = SC.netPeople(dd);
    var up = net > 0 && (dd.voksen || 0) >= 0 && (dd.barn || 0) >= 0 && (dd.smabarn || 0) >= 0;
    var dn = net < 0 && (dd.voksen || 0) <= 0 && (dd.barn || 0) <= 0 && (dd.smabarn || 0) <= 0;
    return up ? '+' + net + ' til middag' : dn ? '−' + Math.abs(net) + ' til middag' : 'Endret';
  }
  // v0.11: arket for én dag – rettvelger, ⇅ Bytt, tid og merknad, «Hvem spiser»
  function daySheetHtml(d, dates, rs, usedBy, swapBtn) {
    var i = dates.indexOf(d), today = isoDate(new Date());
    return '<div class="overlay day-overlay" id="day-sheet" data-action="day-close-bg"><div class="sheet day-sheet" role="dialog" aria-modal="true" aria-labelledby="day-sheet-h" data-testid="dag-ark" data-date="' + d + '">' +
      '<div class="sheet-head"><h3 id="day-sheet-h">' + esc(DAY_NAMES[i] + ' ' + shortDate(d) + (d === today ? ' · i dag' : '')) + '</h3></div>' +
      dayBodyHtml(d, dates, rs, usedBy, swapBtn) +
      '<button type="button" class="btn block" data-action="day-close" data-testid="dag-ferdig">Ferdig</button></div></div>';
  }
  function dayBodyHtml(d, dates, rs, usedBy, swapBtn) {
    var i = dates.indexOf(d), h = '';
    var o = state.oneoffs[d], sel = state.week_plan[d], r = !o && sel ? recipeById(sel) : null, dn = o ? o.name : r ? r.name : '';
    if (o) {
      h += '<div class="oneoff"><span class="badge">Engangsmiddag</span><span class="oneoff-name">' + esc(o.name) + '</span>' +
        '<span class="day-meta">' + o.ingredients.length + (o.ingredients.length === 1 ? ' ingrediens' : ' ingredienser') + '</span></div>' +
        '<div class="oneoff-actions">' + (ui.swap ? '' : '<a class="btn small" href="#uke/engang/' + d + '">Rediger</a>' +
        '<button type="button" class="btn small" data-action="remove-oneoff" data-date="' + d + '">Fjern</button>') + swapBtn(d, dn) + '</div>';
      h += markSegHtml(d);
    } else {
      // Navn med variant når husstanden har flere varianter av samme rett
      var nameCount = {}; rs.forEach(function (x) { nameCount[normName(x.name)] = (nameCount[normName(x.name)] || 0) + 1; });
      h += '<div class="day-row"><select id="day-' + d + '" class="day-select" data-date="' + d + '" aria-label="Middag ' + esc(dayLabel(d).toLowerCase()) + '">' +
        '<option value="">Tom</option>';
      rs.forEach(function (x) {
        var usedIdx = usedBy[x.id], takenElsewhere = usedIdx != null && usedIdx !== i;
        var vl = nameCount[normName(x.name)] > 1 ? variantLabel(x) : '';
        h += '<option value="' + esc(x.id) + '"' + (r && r.id === x.id ? ' selected' : '') + '>' + esc(x.name + (vl ? ' · ' + vl : '')) +
          (takenElsewhere ? (r ? ' (bytt med ' : ' (flytt fra ') + DAY_SHORT[usedIdx] + ')' : '') + '</option>';
      });
      h += '<option value="__oneoff__">＋ Engangsmiddag …</option></select>' + swapBtn(d, dn) + '</div>';
      var meta = [];
      if (r) { if (r.minutes) meta.push(timeText(r)); if (r.note) meta.push(r.note); }
      var fTag = '';
      if (r) {
        var ff = dayFactor(d, r);
        if (hsPeople() && ff !== 1 && ff !== 'Tom' && SC.isKnaggen(r) && hsScaleOn())
          fTag = ' <span class="hs-tag" data-testid="hs-tilpasset">Tilpasset ' + SC.fmt(ff) + '</span>';
      }
      h += '<div class="day-foot"><span class="day-meta">' + esc(meta.join(' · ')) + fTag + '</span>' +
        (r ? '' : '<a class="linkbtn" href="#uke/engang/' + d + '">+ Engangsmiddag</a>') + '</div>';
      if (r) h += markSegHtml(d);
      if (r) h += chipHtml(d, r) || ('<button type="button" class="v11-row v11-who" data-action="hs-day" data-date="' + d + '" data-testid="hs-endre"><span class="t"><b>Hvem spiser: ' +
        esc(hsPeople() ? SC.peopleText(hsPeople(), true) : 'som vanlig') + '</b></span><span class="tid">Endre ›</span></button>');
    }
    return h;
  }
  /* ---------- v0.16: «Allerede handlet» / «Rester» ---------- */
  var ICON_BOWL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/></svg>';
  var MARKS = [['', 'Kjøp inn'], ['handlet', 'Handlet'], ['rester', 'Rester']];
  function markSegHtml(d) {
    var cur = markOf(d) || '';
    return '<div class="v16-ingr" data-testid="ingredienser"><span class="v16-ingr-h" id="ingr-h-' + d + '">Ingredienser</span>' +
      '<div class="seg" role="group" aria-labelledby="ingr-h-' + d + '">' + MARKS.map(function (m) {
        return '<button type="button" data-action="day-mark" data-date="' + d + '" data-mark="' + m[0] + '" aria-pressed="' + (cur === m[0]) + '"' + (cur === m[0] ? ' class="on"' : '') +
          ' data-testid="merke-' + (m[0] || 'kjop') + '">' + m[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="v16-ingr-s">' + (cur ? 'Ingrediensene kommer ikke på handlelista. Merket følger middagen hvis du flytter den.' : 'Ingrediensene kommer på handlelista.') + '</p></div>';
  }
  function markMenuHtml(d) {
    var cur = markOf(d);
    return '<div class="overlay" id="mark-menu" data-action="mark-menu-close"><div class="sheet menu-sheet" role="dialog" aria-modal="true" aria-labelledby="mm-h" data-testid="merke-meny">' +
      '<div class="sheet-head"><h3 id="mm-h">' + esc(dayName(d) + ': ' + dinnerName(d)) + '</h3></div><ul class="v11-menu">' +
      '<li><button type="button" data-action="mark-set" data-date="' + d + '" data-mark="' + (cur === 'handlet' ? '' : 'handlet') + '" data-testid="mm-handlet">' + (cur === 'handlet' ? 'Kjøp inn likevel' : 'Allerede handlet') + '</button></li>' +
      '<li><button type="button" data-action="mark-set" data-date="' + d + '" data-mark="' + (cur === 'rester' ? '' : 'rester') + '" data-testid="mm-rester">' + (cur === 'rester' ? 'Ikke rester likevel' : 'Rester') + '</button></li>' +
      '<li><button type="button" class="danger" data-action="mark-clear-day" data-date="' + d + '" data-testid="mm-fjern">Fjern middagen</button></li>' +
      '</ul><button type="button" class="btn block" data-action="mark-menu-close" data-testid="mm-lukk">Lukk</button></div></div>';
  }
  function setMark(d, mark, from) {
    var e = dayEntry(d);
    if (!e.sig) return;
    var prev = e.mark || null;
    mark = mark === 'handlet' || mark === 'rester' ? mark : null;
    if (prev === mark) return;
    ops.setDays([{ date: d, recipe_id: e.recipe_id, oneoff: e.oneoff, mark: mark }]);
    var sig = dayEntry(d).sig;
    var msg = dayName(d) + ': ' + (mark === 'handlet' ? 'allerede handlet. Ikke på lista.' : mark === 'rester' ? 'rester. Ikke på lista.' : 'på lista igjen.');
    if (from !== 'sheet') renderUke(); else rerenderDaySheet(d);
    toast(msg, UNDO_MS, { label: 'Angre', run: function () {
      var now = dayEntry(d);
      if (now.sig !== sig) { toast('Kan ikke angre – uka er endret siden'); return; }
      ops.setDays([{ date: d, recipe_id: now.recipe_id, oneoff: now.oneoff, mark: prev }]);
      if (main.querySelector('[data-page="uke"]')) renderUke(); else if (!isFormRoute()) route();
    } });
  }
  function rerenderDaySheet(d) {
    renderUke();
    focusEl('#day-sheet [data-action="day-mark"][aria-pressed="true"]');
  }
  // Langt trykk (500 ms) eller høyreklikk på en dag i Uke åpner menyen. Klikket etter et langt trykk svelges.
  var lp = { t: 0, fired: false, x: 0, y: 0 };
  function lpStart(e) {
    var b = e.target.closest && e.target.closest('[data-action="day-open"]');
    if (!b || ui.swap || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var d = b.getAttribute('data-date');
    if (!dinnerName(d)) return;
    clearTimeout(lp.t); lp.fired = false; lp.x = e.clientX; lp.y = e.clientY;
    lp.t = setTimeout(function () { lp.fired = true; openMarkMenu(d); }, 500);
  }
  function lpCancel(e) {
    if (e && e.type === 'pointermove' && Math.abs(e.clientX - lp.x) + Math.abs(e.clientY - lp.y) < 10) return;
    clearTimeout(lp.t);
  }
  function openMarkMenu(d) {
    ui.markMenu = d; ui.dayOpen = null; ui.weekMenu = false; renderUke();
    if (navigator.vibrate) try { navigator.vibrate(10); } catch (x) {}
    focusEl('#mark-menu button');
  }
  // v0.11: ⋯-menyen på Uke – Fyll man–fre (grå med forklaring når det ikke er noe å fylle) og Tøm uka…
  function weekMenuHtml(dates, count, emptyWeekdays, hasRecipes) {
    var fillOff = !hasRecipes || !emptyWeekdays;
    var why = !hasRecipes ? 'ingen retter ennå' : 'alle hverdager har middag';
    return '<div class="overlay" id="week-menu" data-action="week-menu-close"><div class="sheet menu-sheet" role="dialog" aria-modal="true" aria-labelledby="wm-h" data-testid="uke-meny-ark">' +
      '<div class="sheet-head"><h3 id="wm-h">' + esc('Uke ' + isoWeek(parseIso(dates[0]))) + '</h3></div><ul class="v11-menu">' +
      '<li><button type="button" data-action="fill-weekdays" data-testid="fyll"' + (fillOff ? ' disabled' : '') + '>Fyll man–fre' + (fillOff ? '<span class="s">· ' + why + '</span>' : '') + '</button></li>' +
      (count ? '<li><button type="button" class="danger" data-action="clear-week" data-testid="tom-uka">Tøm uka…</button></li>' : '') +
      '</ul><button type="button" class="btn block" data-action="week-menu-close" data-testid="uke-meny-lukk">Lukk</button></div></div>';
  }
  function setDay(date, recipeId) {
    ui.swap = null;
    if (recipeId === '__oneoff__') { location.hash = '#uke/engang/' + date; return; }
    if (!recipeId) {
      if (state.day_people[date]) {
        delete state.day_people[date]; save();
        remote(function (w, hid) { return w.deleteDayPeople(hid, date); });
      }
    }
    if (recipeId) {
      // v0.4.4: retten er brukt en annen dag i uka -> flytt den hit (bytt med det som står her).
      var dates = weekDates(ui.weekOffset);
      var clash = dates.filter(function (d) { return d !== date && state.week_plan[d] === recipeId && !state.oneoffs[d]; });
      if (clash.length) { swapNow(clash[0], date, '#day-' + date); return; }
    }
    var before = dayEntry(date), oldName = dinnerName(date);
    ops.setDays([{ date: date, recipe_id: recipeId || null, oneoff: null }]);
    renderUke();
    // v0.6.1 (spec v0.6.1 punkt 2): en rett som erstatter en planlagt rett gir toast med «Angre» (8 s), som ved bytte.
    if (recipeId && oldName && before.sig && before.sig !== dayEntry(date).sig) replacedToast(date, before, oldName);
  }
  function replacedToast(date, before, oldName) {
    var after = dayEntry(date).sig;
    // v0.16: et merke («handlet»/«rester») nullstilles når en ny rett velges; Angre gir merket tilbake
    toast(oldName + ' på ' + dayName(date).toLowerCase() + ' er byttet ut' + (before.mark ? '. Merket fjernet, ny rett' : ''), UNDO_MS, { label: 'Angre', run: function () {
      if (dayEntry(date).sig !== after) { toast('Kan ikke angre – uka er endret siden'); return; }
      ops.setDays([{ date: date, recipe_id: before.recipe_id, oneoff: before.oneoff, mark: before.mark || null }]);
      toast(oldName + ' er tilbake');
      if (main.querySelector('[data-page="uke"]')) { renderUke(); focusEl('#day-' + date); }
      else if (!isFormRoute()) route();
    } });
  }

  // v0.4.5 (spec v0.4 punkt 5): smartere «Fyll man–fre». Ren funksjon (tilfeldigheten sendes inn), brukt av
  // fillWeekdays og av testene via window.UkeshandelFill.
  //   recipes: [{ id, minutes }], used: { id: true } (allerede i uka), last: { id: true } (i forrige uke),
  //   n: antall tomme hverdager, rng: () => [0, 1).
  // Rekkefølge for valg: 1) ikke i forrige uke og rask (≤ RASK_MIN min), tilfeldig; 2) ikke i forrige uke, ikke rask,
  // lavest minutter først (tilfeldig ved likt, ukjent tid sist); 3) og 4) det samme blant forrige ukes retter, bare
  // hvis det ikke er nok andre. Plassering: raske retter tilfeldig på de første tomme dagene, tregere (hvis de måtte
  // med) til slutt i uka, raskest først – så fredag får den tregeste.
  var RASK_MIN = 30;
  // v0.11: «Middag i hverdagen» – grensen (aktiv tid) erstatter RASK_MIN når den er satt; ellers som før.
  var raskMin = RASK_MIN;
  function fillLimit() { return weekdayLimit() || RASK_MIN; }
  function isRask(r) { return typeof r.minutes === 'number' && r.minutes > 0 && r.minutes <= raskMin; }
  function minutesKey(r) { return typeof r.minutes === 'number' && r.minutes > 0 ? r.minutes : Infinity; }
  function planFill(recipes, used, last, n, rng, limit) {
    rng = rng || Math.random;
    raskMin = limit || RASK_MIN;
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function bySpeed(a) { return shuffle(a).sort(function (x, y) { return minutesKey(x) - minutesKey(y); }); }   // stabil sortering
    function tier(list) {
      return shuffle(list.filter(isRask)).concat(bySpeed(list.filter(function (r) { return !isRask(r); })));
    }
    var cand = recipes.filter(function (r) { return !used[r.id]; });
    var fresh = tier(cand.filter(function (r) { return !last[r.id]; }));
    var old = tier(cand.filter(function (r) { return !!last[r.id]; }));
    var picks = fresh.concat(old).slice(0, Math.max(0, n));
    var order = shuffle(picks.filter(isRask)).concat(bySpeed(picks.filter(function (r) { return !isRask(r); })));
    return {
      ids: order.map(function (r) { return r.id; }),
      fromLastWeek: picks.filter(function (r) { return !!last[r.id]; }).length,
      slow: picks.filter(function (r) { return !isRask(r); }).length,
      freshAvailable: fresh.length
    };
  }
  window.UkeshandelFill = { plan: planFill, RASK_MIN: RASK_MIN };

  // Tomme dager man–fre fylles (planFill). Ingen rett to ganger i uka; satte dager røres ikke.
  function fillWeekdays() {
    var dates = weekDates(ui.weekOffset);
    var fromCard = showStart() && startSteps(dates).active === 1;   // v0.9: Fyll fra Kom i gang-kortet (steg 1)
    var used = {}, last = {};
    dates.forEach(function (d) {
      var id = state.week_plan[d];
      if (!state.oneoffs[d] && id && recipeById(id)) used[id] = true;
    });
    weekDates(ui.weekOffset - 1).forEach(function (d) {
      var id = state.week_plan[d];
      if (!state.oneoffs[d] && id) last[id] = true;
    });
    var empty = dates.slice(0, 5).filter(function (d) {
      return !state.oneoffs[d] && !(state.week_plan[d] && recipeById(state.week_plan[d]));
    });
    if (!empty.length) { ui.notice = 'Man–fre er allerede fylt.'; renderUke(); return; }
    var plan = planFill(state.recipes, used, last, empty.length, null, weekdayLimit());
    var LIM = raskMin;
    var entries = plan.ids.map(function (id, k) { return { date: empty[k], recipe_id: id, oneoff: null }; });
    var filled = entries.length;
    if (filled) ops.setDays(entries);
    // Melding: hva som ble valgt og hvorfor (kort, én linje i vanlig tilfelle).
    var hasLast = Object.keys(last).length > 0;
    var what = !filled ? '' : (plan.slow ? '' : ' med raske retter (' + LIM + ' min eller mindre)') +
      (hasLast && !plan.fromLastWeek ? (plan.slow ? ' med retter' : '') + ' som ikke var med forrige uke' : '');
    var why = (plan.fromLastWeek ? ' ' + (plan.fromLastWeek === filled ? (filled === 1 ? 'Den' : 'Alle') : plan.fromLastWeek + ' av dem') + ' var med forrige uke – det var ikke nok andre retter.' : '') +
      (plan.slow ? ' ' + (plan.slow === filled ? (filled === 1 ? 'Den' : 'Alle') : plan.slow + ' av dem') + ' tar over ' + LIM + ' min – det var ikke nok raske retter' + (plan.slow < filled ? (plan.slow === 1 ? '; den står sist i uka.' : '; de står sist i uka.') : '.') : '');
    if (filled === empty.length) ui.notice = 'Fylte ' + filled + (filled === 1 ? ' dag' : ' dager') + what + '.' + why + ' Bytt gjerne en kveld.';
    else if (!filled) ui.notice = 'Ingen ledige retter – alle rettene er allerede brukt denne uka.';
    else ui.notice = 'Fylte ' + filled + ' av ' + empty.length + ' tomme dager' + what + ' – det er ikke flere ledige retter.' + why + ' Legg til flere under Retter.';
    if (filled && fromCard) ui.notice = '';   // v0.9: Kom i gang-kortet sier det samme
    renderUke();
  }

  function renderOneoffForm(date) {
    var o = state.oneoffs[date];
    var rid = state.week_plan[date];
    var replaced = !o && rid ? recipeById(rid) : null;
    var h = '<section class="page" data-page="engang-skjema">';
    h += '<div class="page-head"><a class="back" href="#uke">‹ Uke</a><h2>Engangsmiddag</h2></div>';
    h += '<p class="hint">' + esc(dayName(date) + ' ' + shortDate(date)) + ' Kommer med i handlelista, men lagres ikke under Retter.' +
      (replaced ? ' Erstatter «' + esc(replaced.name) + '» denne dagen.' : '') + '</p>';
    h += '<form id="oneoff-form" data-date="' + date + '" novalidate>';
    h += '<label class="field"><span>Navn</span><input id="o-name" type="text" required value="' + esc(o ? o.name : '') + '" placeholder="F.eks. Gjester: fårikål"></label>';
    h += ingredientsFieldset(o ? o.ingredients : []);
    if (o) h += sourceHtml(o.source);   // v0.12
    h += '<p class="form-error" id="form-error" hidden></p>';
    h += '<div class="form-actions"><button type="submit" class="btn primary" data-testid="lagre-engang">Lagre</button>' +
      '<a class="btn" href="#uke">Avbryt</a>' +
      (o ? '<button type="button" class="btn danger" data-action="remove-oneoff" data-date="' + date + '">Fjern</button>' : '') + '</div>';
    h += '</form></section>';
    main.innerHTML = h;
    if (!o) document.getElementById('o-name').focus();
  }

  function saveOneoffForm(form) {
    var name = document.getElementById('o-name').value.trim();
    if (!name) return formError('Engangsmiddagen må ha et navn.', 'o-name');
    var date = form.getAttribute('data-date');
    var prev = state.oneoffs[date];
    var no = { id: prev ? prev.id : uid('o'), name: name, ingredients: readIngredients(form) };
    if (prev && validSource(prev.source)) no.source = prev.source;   // v0.12: kilden følger med
    ops.setDays([{ date: date, recipe_id: null, oneoff: no }]);
    toast('Engangsmiddag lagret');
    location.hash = '#uke';
  }

  // v0.10 (spec punkt 5): «Tøm uka» med egen dialog. Alle sju dagene settes til tom (også engangsmiddager og hvem som
  // spiser). Egne varer, faste varer, avkrysning og +/- røres ikke.
  function clearWeekAsk() {
    var wk = weekDates(ui.weekOffset);
    var wn = isoWeek(parseIso(wk[0]));
    ask({ id: 'tom-uka-ark', title: 'Tømme uke ' + wn + '?',
      text: hh ? 'Alle kvelder tømmes, også engangsmiddager og hvem som spiser. Det gjelder hele husstanden. Egne varer og faste varer blir stående.'
        : 'Alle kvelder tømmes, også engangsmiddager og hvem som spiser. Egne varer og faste varer blir stående.',
      ok: 'Tøm uka', cancel: 'Avbryt', danger: true }).then(function (ok) {
      if (!ok) return;
      var prevPeople = {};
      wk.forEach(function (d) { if (state.day_people[d]) prevPeople[d] = state.day_people[d]; delete state.day_people[d]; });
      save();
      wk.forEach(function (d) { remote(function (w, hid) { return w.deleteDayPeople(hid, d); }); });
      ops.setDays(wk.map(function (d) { return { date: d, recipe_id: null, oneoff: null }; }));
      toast('Uke ' + wn + ' er tømt', 8000, function () {
        Object.keys(prevPeople).forEach(function (d) {
          state.day_people[d] = prevPeople[d];
          remote(function (w, hid) { return w.setDayPeople(hid, d, prevPeople[d]); });
        });
        save(); route();
      });
      if (main.querySelector('[data-page="uke"]')) renderUke(); else route();
    });
  }
  function removeOneoff(date) {
    var o = state.oneoffs[date];
    if (!o) return;
    ask({ id: 'fjern-engang', title: 'Fjerne engangsmiddagen «' + o.name + '»?', ok: 'Fjern', cancel: 'Avbryt' }).then(function (ok) {
      if (!ok) return;
      ops.setDays([{ date: date, recipe_id: null, oneoff: null }]);
      toast('Engangsmiddag fjernet');
      if (location.hash !== '#uke') location.hash = '#uke'; else renderUke();
    });
  }

  /* ---------- Liste ---------- */

  // peek = bare tell/les (Kom i gang); ingen lagring eller opprydding i state
  // v0.10 (spec punkt 2): én felles liste – middager fra og med mandag denne uka og alle planlagte uker framover.
  function listDates() {
    var mon = weekDates(0)[0], seen = {};
    Object.keys(state.week_plan || {}).forEach(function (d) { if (d >= mon && state.week_plan[d] && recipeById(state.week_plan[d])) seen[d] = 1; });
    Object.keys(state.oneoffs || {}).forEach(function (d) { if (d >= mon && state.oneoffs[d]) seen[d] = 1; });
    return Object.keys(seen).filter(function (d) { return /^\d{4}-\d\d-\d\d$/.test(d) && !markOf(d); }).sort();   // v0.16: merkede middager er ikke med
  }
  // v0.16: middager fra og med mandag som er merket «Allerede handlet» / «Rester» (vises i linja «Ikke med: …»)
  function markedDates() {
    var mon = weekDates(0)[0];
    return Object.keys(marksOf()).filter(function (d) { return d >= mon && markOf(d) && dinnerName(d); }).sort();
  }
  function markedLine() {
    var ds = markedDates();
    if (!ds.length) return '';
    var parts = ds.map(function (d) { return '<b>' + esc(dinnerName(d)) + '</b> (' + (markOf(d) === 'rester' ? 'rester' : 'handlet') + ')'; });
    return '<p class="ikke-med" data-testid="ikke-med"><span>Ikke med: ' + parts.join(', ') + '</span>' +
      '<a href="#uke" class="ikke-med-vis" data-testid="ikke-med-vis">Vis ›</a></p>';
  }
  function buildList(peek) { return buildFor(listDates(), LIST_KEY, peek); }
  function buildFor(dates, weekKey, peek) {
    var thisWeek = weekDates(0);
    var map = {};
    var order = [];
    var RANK = { dinner: 0, staple: 1, extra: 2 };
    var mergeTo = {};
    // v0.4.1: samme vare i omregnbare enheter (dl/l/ml/ss/ts, g/kg, + pakningstabellen) blir én linje.
    function add(src, from, name, qty, unit, aisle, extraId, stapleId) {
      var nn = normName(name);
      if (!nn) return null;
      unit = U.normUnit(unit);             // v0.4.2: «L», " dl", «liter» … → l/dl
      // v0.4.2: en kjent pakningsvare uten enhet og uten mengde (f.eks. fast vare der mengden er tømt) = én pakning.
      if ((qty == null || qty === '') && /^(|pk|stk|kartong|beger)$/.test(unit) && U.packFor(nn) && U.conversion(nn, unit)) qty = 1;
      var conv = U.conversion(nn, unit);
      var base = conv ? conv.base : unit;
      // v0.9 (Trude): «Tomat»/«Tomater» og «Melk»/«Lettmelk» blir én linje. Linja beholder nøkkelen til navnet som kom
      // først, så en uke med bare ett av navnene får samme nøkkel som før (eldre telefoner ser samme avkrysning).
      var mk = listMergeName(nn) + '|' + base;
      var key = mergeTo[mk] || (nn + '|' + base);
      if (!mergeTo[mk]) mergeTo[mk] = key;
      var it = map[key];
      if (!it) {
        it = map[key] = { key: key, nn: nn, name: String(name).trim(), qty: null, unit: base, parts: {}, units: [],
          aisle: itemAisle(name, aisle), checked: false, source: src, sources: [], recipes: [], extra_ids: [], staple_ids: [], aliases: [] };
        order.push(key);
      }
      if (nn !== it.nn && it.aliases.indexOf(nn) < 0) it.aliases.push(nn);
      if (it.units.indexOf(unit) < 0) it.units.push(unit);
      if (qty != null && isFinite(qty)) it.parts[unit] = round3((it.parts[unit] || 0) + Number(qty));
      if (it.sources.indexOf(src) < 0) it.sources.push(src);
      if (RANK[src] < RANK[it.source]) it.source = src;
      if (from && it.recipes.indexOf(from) < 0) it.recipes.push(from);
      if (extraId) it.extra_ids.push(extraId);
      if (stapleId) it.staple_ids.push(stapleId);
      return key;
    }
    // v0.4.3b: «Kilde»-visningen: én gruppe per middag (dagens rekkefølge) + «Lagt til selv». Hver rad har rettens
    // EGEN mengde (ingen pakningsavrunding) og peker på den sammenslåtte linja (key), så avkrysningen er felles.
    var srcGroups = [], selv = { id: 'selv', title: 'Lagt til selv', rows: [], rmap: {}, skipped: 0 };
    function srcRow(g, kind, key, name, qty, unit, extraId) {
      if (!key) return;
      var rk = kind + '/' + key, r = g.rmap[rk];
      if (!r) { r = g.rmap[rk] = { row: g.id + '/' + rk, kind: kind, key: key, name: String(name).trim(), parts: {}, units: [], extra_ids: [] }; g.rows.push(r); }
      var u = U.normUnit(unit);
      if (qty != null && qty !== '' && isFinite(qty)) {
        if (r.units.indexOf(u) < 0) r.units.push(u);
        r.parts[u] = round3((r.parts[u] || 0) + Number(qty));
      }
      if (extraId) r.extra_ids.push(extraId);
    }
    var dinners = 0;
    // v0.4.3: basisvarer. Et navn er basisvare denne uka når ALLE middagsforekomstene er basis (tabell eller merket i
    // oppskriften). Da legges middagsmengden bare på lista hvis den er valgt («basis:<vare>» = 1) i basisvare-vinduet.
    var adjW = state.list_adjust[weekKey] || {};
    var dinnerIngs = [], occ = {};
    dates.forEach(function (d) {
      var o = state.oneoffs[d];
      var r = o || (state.week_plan[d] ? recipeById(state.week_plan[d]) : null);
      if (!r) return;
      dinners++;
      if (o) r = { name: o.name, ingredients: o.ingredients, _oneoff: true, id: o.id };
      var f0 = o ? 1 : dayFactor(d, r);
      var fMark = (f0 && f0 !== 1 && f0 !== 'Tom') ? SC.fmt(f0) : '';
      // v0.10: dager etter denne uka får dato i tittelen («Mandag 19.10. · Taco»)
      var dl = dayName(d) + (thisWeek.indexOf(d) < 0 ? ' ' + shortDate(d) : '');
      var g = { id: d, date: d, title: dl + ' · ' + r.name + (fMark ? ' ' + fMark : ''), rows: [], rmap: {}, skipped: 0, factor: f0 };
      srcGroups.push(g);
      r.ingredients.forEach(function (i) {
        var nn = normName(i.name);
        if (!nn) return;
        dinnerIngs.push({ r: r, i: i, nn: nn, g: g });
        var c = occ[nn] = occ[nn] || { n: 0, b: 0 };
        c.n++; if (U.isBasis(i)) c.b++;
      });
    });
    var basisMap = {}, basisAdded = {};
    dinnerIngs.forEach(function (x) {
      var c = occ[x.nn];
      // v0.8: skaler middagsmengder (ikke engangsmiddag)
      var f = 1;
      if (!x.r._oneoff) {
        f = dayFactor(x.g.date || x.g.id, x.r);
        if (f === 'Tom') f = 0;
      }
      var sq = (f && f !== 1) ? scaleQty(x.i.qty, x.i.unit, f, x.nn) : x.i.qty;
      if (f && f !== 1) x.g.factor = f;
      if (c.b === c.n) {
        var b = basisMap[x.nn];
        if (!b) b = basisMap[x.nn] = { nn: x.nn, name: String(x.i.name).trim(), recipes: [], entries: [], choice: adjW[BASIS_PREFIX + x.nn] || 0 };
        if (b.recipes.indexOf(x.r.name) < 0) b.recipes.push(x.r.name);
        b.entries.push({ qty: sq, unit: x.i.unit });
        if (b.choice !== 1) { x.g.skipped++; return; }
        basisAdded[x.nn] = true;
      }
      // v0.8: «×1¼» bak rettenavnet i kildelinja (Merkevare husstand §)
      var fromLab = x.r.name;
      if (f && f !== 1 && f !== 'Tom') fromLab += ' ' + SC.fmt(f);
      srcRow(x.g, 'dinner', add('dinner', fromLab, x.i.name, sq, x.i.unit, x.i.aisle), x.i.name, sq, x.i.unit);
    });
    var basis = Object.keys(basisMap).map(function (nn) { var b = basisMap[nn]; b.amount = basisAmount(nn, b.entries); return b; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'nb'); });
    // v0.4.3b: faste varer bare når de er valgt for uka (se STAPLES_OPTIN_FROM for eldre uker).
    var staples = state.staples.map(function (s) {
      var v = adjW[FAST_PREFIX + s.id];
      return { s: s, on: stapleChosen(s, weekKey, adjW), explicit: v > 0 ? 1 : v < 0 ? -1 : 0 };
    });
    staples.forEach(function (x) {
      if (!x.on) return;
      srcRow(selv, 'staple', add('staple', null, x.s.name, x.s.qty, x.s.unit, x.s.aisle, null, x.s.id), x.s.name, x.s.qty, x.s.unit);
    });
    state.list_extras.forEach(function (x) {
      if (x.week === weekKey) srcRow(selv, 'extra', add('extra', null, x.name, x.qty, x.unit, x.aisle, x.id), x.name, x.qty, x.unit, x.id);
    });
    var adj = state.list_adjust[weekKey] || {};
    var checks = state.checks[weekKey] || {};
    var atMap = weekKey === LIST_KEY ? (state.check_at || {}) : {};
    var items = order.map(function (k) {
      var it = map[k];
      it.week = weekKey;
      // Nøkler fra før v0.4.1 (navn|enhet per enhet), f.eks. «melk|dl» som nå er en del av «melk|ml».
      var srcKeys = it.units.map(function (u) { return { k: it.nn + '|' + u, f: U.factorFor(it.nn, u) }; });
      it.legacyKeys = srcKeys.filter(function (x) { return x.k !== k; });
      var unitLegacy = it.legacyKeys.slice();
      // v0.9: avkrysning og +/- som ble gjort på det andre navnet (før linjene ble slått sammen) følger med.
      var aliasKeys = [];
      it.aliases.forEach(function (a) {
        it.units.concat([it.unit]).forEach(function (u) {
          var ak = a + '|' + u;
          if (ak !== k && !aliasKeys.some(function (x) { return x.k === ak; })) aliasKeys.push({ k: ak, f: U.factorFor(a, u) });
        });
      });
      it.legacyKeys = it.legacyKeys.concat(aliasKeys);
      var legacyAdj = 0;
      it.legacyKeys.forEach(function (x) { if (adj[x.k]) legacyAdj += adj[x.k] * x.f; });
      it.adjust_own = adj[k] || 0;
      it.adjust_legacy = round3(legacyAdj);
      it.adjust = round3(it.adjust_own + it.adjust_legacy);
      var hasQty = Object.keys(it.parts).length > 0;
      it.base_qty = null;
      it.plan = null;
      if (hasQty || it.adjust) {
        it.plan = U.plan(it.nn, it.unit, it.parts, it.adjust);
        it.base_qty = U.plan(it.nn, it.unit, it.parts, 0).need;
        it.qty = it.plan.need;           // behovet (grunnenhet)
        it.buy = it.plan.buy;            // det som kjøpes (hele pakninger / rundet opp)
      }
      // Avkrysning lagrer mengden som ble kjøpt (tall, grunnenhet) eller true (uten mengde / eldre versjoner).
      // Blir BEHOVET større enn det som ble krysset av, vises varen som ukrysset igjen. Økning innenfor samme
      // pakning (7 dl → 9 dl når 1 l er krysset av) lar avkrysningen stå.
      var c = checks[k];
      if (!c && unitLegacy.length && !srcKeys.some(function (x) { return x.k === k; }) &&
          unitLegacy.every(function (x) { return checks[x.k]; })) {
        c = unitLegacy.some(function (x) { return checks[x.k] === true; }) ? true
          : round3(unitLegacy.reduce(function (a, x) { return a + checks[x.k] * x.f; }, 0));
      }
      if (!c && aliasKeys.length) {
        var ac = aliasKeys.filter(function (x) { return checks[x.k]; });
        if (ac.length) c = ac.some(function (x) { return checks[x.k] === true; }) ? true : round3(ac.reduce(function (a, x) { return a + checks[x.k] * x.f; }, 0));
      }
      it.tick = c || false;
      it.checked = !!c && !(typeof c === 'number' && it.qty != null && it.qty > c + 1e-9);
      // v0.10: når varen ble krysset av (ms); eldre/aliasnøkler uten tid regnes som nå
      it.doneAt = atMap[k] || it.legacyKeys.reduce(function (a, x) { return a || atMap[x.k] || 0; }, 0) || 0;
      it.basisvare = !!basisAdded[it.nn] && it.sources.indexOf('dinner') >= 0;
      return it;
    });
    if (!hh && !peek) {
      // Lokal modus: behold generert liste (for eldre versjoner) og rydd bort gamle uker (v0.10: aldri den felles lista).
      var oldest = weekDates(Math.min(0, ui.weekOffset) - 8)[0];
      var otherWeeks = state.list_items.filter(function (it) { return it.week !== weekKey && it.week && it.week >= oldest && it.week !== LIST_KEY; });
      Object.keys(state.list_adjust).forEach(function (w) { if (w < oldest && w !== LIST_KEY) delete state.list_adjust[w]; });
      Object.keys(state.checks).forEach(function (w) { if (w < oldest && w !== LIST_KEY) delete state.checks[w]; });
      state.list_extras = state.list_extras.filter(function (x) { return x.week >= oldest || x.week === LIST_KEY; });
      state.list_items = otherWeeks.concat(items.map(function (it) {
        return { key: it.key, week: it.week, name: it.name, qty: it.qty, unit: it.unit, aisle: it.aisle, checked: it.checked, source: it.source };
      }));
      save();
    }
    currentList = items;
    var byKey = {}, rowCount = {};
    items.forEach(function (it) { byKey[it.key] = it; });
    srcGroups.concat([selv]).forEach(function (g) { g.rows.forEach(function (r) { rowCount[r.key] = (rowCount[r.key] || 0) + 1; }); });
    srcGroups.concat([selv]).forEach(function (g) {
      g.rows.forEach(function (r) {
        r.shared = rowCount[r.key] > 1;
        r.item = byKey[r.key];
        r.amount = r.units.map(function (u) { return formatQty(r.parts[u]) + (u ? ' ' + u : ''); }).join(' + ');
      });
    });
    return { items: items, dates: dates, dinners: dinners, weekKey: weekKey, basis: basis,
      source: srcGroups, selv: selv, staples: staples, legacyStaples: weekKey !== LIST_KEY && weekKey < STAPLES_OPTIN_FROM };
  }
  function stapleChosen(s, weekKey, adjW) {
    var v = adjW[FAST_PREFIX + s.id];
    if (v > 0) return true;
    if (v < 0) return false;
    return weekKey !== LIST_KEY && weekKey < STAPLES_OPTIN_FROM && s.active !== false;
  }
  // v0.10: «handlet» = krysset av for under 3 dager siden (vises med «Vis N handlet»).
  function doneRecent(it) { return it.checked && (!it.doneAt || Date.now() - it.doneAt < DONE_TTL); }
  // Testkrok (som KNAGGEN_SKIP_INTRO): eldre suiter tester lista med handlede varer synlige nederst, som før v0.10.
  var SHOW_DONE = !!window.KNAGGEN_SHOW_DONE;
  function visibleItem(it) { return !it.checked || ((ui.showDone || SHOW_DONE) && doneRecent(it)); }
  // v0.10: avkryssede varer slettes for godt 3 dager etter avkryssing. Egne varer slettes, faste varer tas av lista.
  // En vare fra en middag som fortsatt er planlagt beholder avkrysningen (den er handlet), men vises ikke lenger under
  // «Vis N handlet». Avkrysning for varer som ikke lenger er på lista ryddes bort når de er eldre enn 3 dager.
  function purgeDone(built) {
    var now = Date.now(), at = state.check_at || {}, checks = state.checks[LIST_KEY] || {};
    var rm = [], fast = {}, clear = {}, adjClear = [], any = false;
    built.items.forEach(function (it) {
      if (!it.checked || !it.doneAt || now - it.doneAt < DONE_TTL) return;
      if (it.extra_ids.length) { rm = rm.concat(it.extra_ids); any = true; }
      it.staple_ids.forEach(function (id) { fast[id] = -1; any = true; });
      if (it.sources.indexOf('dinner') < 0) {
        clear[it.key] = false; any = true;
        it.legacyKeys.forEach(function (x) { if (checks[x.k]) clear[x.k] = false; });
        if (it.adjust_own) adjClear.push(it.key);
      }
    });
    var keys = {};
    built.items.forEach(function (it) { keys[it.key] = 1; it.legacyKeys.forEach(function (x) { keys[x.k] = 1; }); });
    Object.keys(checks).forEach(function (k) {
      if (!keys[k] && (!at[k] || now - at[k] >= DONE_TTL)) { clear[k] = false; any = true; }
    });
    if (!any) return false;
    if (rm.length) ops.removeExtras(rm);
    if (Object.keys(fast).length) ops.setFast(LIST_KEY, fast);
    adjClear.forEach(function (k) { ops.clearAdjust(LIST_KEY, k); });
    if (Object.keys(clear).length) ops.setChecks(LIST_KEY, clear);
    return true;
  }
  // v0.10: engangsflytting av de gamle ukelistene inn i den felles lista (spec, åpne spørsmål 1).
  // Ikke avkryssede varer fra inneværende og kommende uker blir med (egne varer, faste varer, basisvalg og +/−); eldre uker
  // forkastes. Det som allerede er kjøpt for ukene (avkrysning), følger med som kjøpt mengde, så resten av behovet vises.
  // De gamle ukedokumentene røres ikke (eldre versjoner i husstanden ser dem som før).
  function sharedMigration() {
    var mon = weekDates(0)[0], now = Date.now(), weeks = {};
    Object.keys(state.list_adjust || {}).concat(Object.keys(state.checks || {})).forEach(function (w) { if (w >= mon && w !== LIST_KEY) weeks[w] = 1; });
    (state.list_extras || []).forEach(function (x) { if (x.week >= mon && x.week !== LIST_KEY) weeks[x.week] = 1; });
    var adj = {}, checks = {}, at = {}, extras = [];
    Object.keys(weeks).sort().forEach(function (w) {
      var a = state.list_adjust[w] || {};
      Object.keys(a).forEach(function (k) {
        if (typeof a[k] !== 'number' || !a[k] || k === MIGRATED_MARK) return;
        if (k.indexOf(FAST_PREFIX) === 0 || k.indexOf(BASIS_PREFIX) === 0) { if (adj[k] === undefined) adj[k] = a[k]; }
        else adj[k] = round3((adj[k] || 0) + a[k]);
      });
      var off = Math.round((parseIso(w) - parseIso(mon)) / (7 * 864e5));
      var b = buildFor(weekDates(off), w, true);
      b.items.forEach(function (it) {
        if (it.tick) {
          var v = it.checked && it.tick === true && it.buy > 0 ? it.buy : it.tick;
          var prev = checks[it.key];
          checks[it.key] = prev === true || v === true ? true : round3((prev || 0) + v);
          at[it.key] = now;
        }
      });
      // Avkrysninger for varer som ikke er på lista akkurat nå (f.eks. en fast vare som ikke er valgt) tas også med,
      // så de ikke mistes om varen kommer på lista igjen.
      var cw = (state.checks || {})[w] || {};
      Object.keys(cw).forEach(function (k) { if (cw[k] === true && checks[k] === undefined) { checks[k] = true; at[k] = now; } });
      (state.list_extras || []).forEach(function (x) {
        if (x.week !== w) return;
        var it = b.items.filter(function (i) { return i.extra_ids.indexOf(x.id) >= 0; })[0];
        if (it && it.checked) return;
        extras.push({ id: 'm' + x.id, week: LIST_KEY, name: x.name, qty: x.qty, unit: x.unit || '', aisle: x.aisle, created: x.created || now });
      });
    });
    adj[MIGRATED_MARK] = 1;
    return { adj: adj, checks: checks, at: at, extras: extras };
  }
  function applySharedMigration(m) {
    var have = {};
    (state.list_extras || []).forEach(function (x) { have[x.id] = 1; });
    m.extras.forEach(function (x) { if (!have[x.id]) ops.addExtra(x); });
    ops.setAdjustRaw(LIST_KEY, m.adj);
    if (Object.keys(m.checks).length) ops.setChecks(LIST_KEY, m.checks, m.at);
  }
  function sharedMigrated() { return !!((state.list_adjust[LIST_KEY] || {})[MIGRATED_MARK]); }
  var currentList = [];
  /* ---------- v0.8 Husstandens størrelse ---------- */
  var SC = window.UKESHANDEL_SCALE;
  var HS_ASKED_KEY = 'ukeshandel:hsAsked'; // lokal-only backup; husstand synker asked i settings

  function hsState() {
    return state.household_size || { people: null, scale: true, asked: false };
  }
  function hsPeople() {
    var h = hsState();
    return h.people || null;
  }
  function hsScaleOn() {
    var h = hsState();
    return !!(h.people && h.scale !== false);
  }
  function hsAsked() {
    return !!(hsState().asked || lsGet(HS_ASKED_KEY) === '1');
  }
  function dayDelta(date) {
    var d = state.day_people && state.day_people[date];
    return d && SC.hasDelta(d) ? d : null;
  }
  function dayFactor(date, recipe) {
    var people = hsPeople();
    var delta = dayDelta(date);
    var kn = recipe && !recipe._oneoff && SC.isKnaggen(recipe);
    var B = SC.servingsOf(recipe || {});
    try {
      return SC.faktor(!!kn, hsScaleOn(), people, delta, B);
    } catch (e) {
      return 1;
    }
  }
  function scaleQty(qty, unit, f, nn) {
    if (f == null || f === 1 || f === 'Tom' || qty == null || !isFinite(qty)) return qty;
    var pack = !!(U.packFor && U.packFor(nn));
    return SC.skalerIngrediens(qty, U.normUnit(unit) || unit || '', f, pack);
  }
  function ingKey(i) {
    return normName(i.name) + '|' + (i.qty == null ? '' : String(i.qty)) + '|' + (i.unit || '');
  }
  function seedIngSig(r) {
    return (r.ingredients || []).map(ingKey).sort().join(';');
  }
  // Merk startretter som Knaggen hvis ingrediensene fortsatt matcher seed (Sigurd).

  function openDayPeopleSheet(date) {
    ui.hsDayDate = date;
    var usual = hsPeople();
    var delta = dayDelta(date) || { voksen: 0, barn: 0, smabarn: 0 };
    var cur = usual
      ? { voksen: Math.max(0, (usual.voksen||0)+delta.voksen), barn: Math.max(0, (usual.barn||0)+delta.barn), smabarn: Math.max(0, (usual.smabarn||0)+delta.smabarn) }
      : { voksen: Math.max(0, delta.voksen), barn: Math.max(0, delta.barn), smabarn: Math.max(0, delta.smabarn) };
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="sheet hs-sheet" role="dialog" aria-modal="true" data-testid="hs-dag-ark">' +
      '<div class="sheet-head"><h3>Hvem spiser ' + esc(dayLabel(date).toLowerCase()) + '?</h3>' +
      '<button type="button" class="icon-btn" data-action="hs-ark-lukk" aria-label="Lukk">✕</button></div>' +
      (usual ? '' : '<p class="hint">Husstanden er ikke satt – regnet som 4. <a href="#husstand">Sett husstanden</a> for å kunne velge færre.</p>') +
      peopleCountersHtml('hsd', cur, { usual: usual || { voksen: 0, barn: 0, smabarn: 0 }, dayMode: true, noFewer: !usual, testid: 'hs-dag-folk' }) +
      '<div class="hs-result" data-testid="hs-dag-resultat"><span>Oppdateres mens du teller</span></div>' +
      '<div class="hs-sheet-acts">' +
      '<button type="button" class="btn primary" data-action="hs-dag-lagre" data-date="' + date + '" data-testid="hs-dag-lagre">Lagre</button>' +
      '<button type="button" class="btn" data-action="hs-ark-lukk">Avbryt</button></div>' +
      (dayDelta(date) ? '<button type="button" class="btn hs-reset" data-action="hs-dag-reset" data-date="' + date + '" data-testid="hs-tilbakestill">Tilbakestill til husstanden</button>' : '') +
      '</div>';
    document.body.appendChild(ov);
    updateDaySheetResult(date);
    var focusBtn = ov.querySelector('[data-hs-step="1"]');
    if (focusBtn) try { focusBtn.focus(); } catch (e) {}
  }
  function updateDaySheetResult(date) {
    var box = document.querySelector('[data-testid="hs-dag-resultat"]');
    if (!box) return;
    var cur = readCounters('hsd');
    var usual = hsPeople();
    var delta = usual
      ? { voksen: cur.voksen - (usual.voksen||0), barn: cur.barn - (usual.barn||0), smabarn: cur.smabarn - (usual.smabarn||0) }
      : cur;
    var r = state.week_plan[date] ? recipeById(state.week_plan[date]) : null;
    var f = 'Tom';
    try { f = SC.faktor(!!(r && SC.isKnaggen(r)), hsScaleOn(), usual, delta, SC.servingsOf(r || {})); } catch (e) { f = 1; }
    var dn = dayLabel(date);
    if (SC.porsjoner(cur) === 0 && usual) {
      box.innerHTML = '<b>Ingen spiser hjemme ' + esc(dn.toLowerCase()) + '</b><span class="m">Retten tas av, og varene går av lista.</span>';
      var btn = document.querySelector('[data-testid="hs-dag-lagre"]');
      if (btn) { btn.textContent = 'Sett ' + dn.toLowerCase() + ' til Tom'; btn.setAttribute('data-action', 'hs-dag-tom'); }
      return;
    }
    var btn = document.querySelector('[data-testid="hs-dag-lagre"]');
    if (btn) { btn.textContent = 'Lagre'; btn.setAttribute('data-action', 'hs-dag-lagre'); }
    var usualF = r ? dayFactor(date, Object.assign({}, r, {})) : 1;
    // usual factor without delta
    var uf = 1;
    try { uf = SC.faktor(!!(r && SC.isKnaggen(r)), hsScaleOn(), usual, null, SC.servingsOf(r || {})); } catch (e) {}
    box.innerHTML = '<span>' + esc(dn) + ' lages for <b>' + esc(SC.peopleText(cur, true)) + '</b> · <b>' + (f === 'Tom' ? 'Tom' : SC.fmt(f)) + '</b>' +
      (uf !== 1 && uf !== 'Tom' ? ' (vanlig ' + SC.fmt(uf) + ')' : '') + '</span>' +
      '<span class="m">Gjelder bare ' + esc(dn.toLowerCase()) + '.</span>';
  }

  function closeOverlay() {
    var ov = document.querySelector('.overlay:not([hidden])');
    if (ov) { ov.hidden = true; if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ui.hsDayDate = null; ui.hsSheet = null;
  }
  function tagKnaggenRecipes() {
    var seed = window.UKESHANDEL_SEED && window.UKESHANDEL_SEED();
    if (!seed || !seed.recipes) return;
    var byId = {};
    seed.recipes.forEach(function (r) { byId[r.id] = r; });
    var libByName = {};
    if (window.UKESHANDEL_LIBRARY) {
      ((window.UKESHANDEL_LIBRARY || []) || []).forEach(function (r) { libByName[normName(r.name)] = r; });
    }
    state.recipes.forEach(function (r) {
      if (r.origin === 'knaggen' || r.scale === false) {
        if (r.servings == null && libByName[normName(r.name)]) r.servings = libByName[normName(r.name)].servings || 4;
        return;
      }
      if (/^lib-/.test(r.id)) {
        r.origin = 'knaggen';
        var lib = null;
        if (window.UKESHANDEL_LIBRARY) {
          var lid = r.id.replace(/^lib-/, '');
          ((window.UKESHANDEL_LIBRARY || []) || []).some(function (x) { if (x.id === lid) { lib = x; return true; } });
        }
        if (lib && lib.servings) r.servings = lib.servings;
        else if (r.servings == null) r.servings = 4;
        return;
      }
      var s = byId[r.id];
      if (s && seedIngSig(s) === seedIngSig(r)) {
        r.origin = 'knaggen';
        // Seed-Lasagne: «dobbel porsjon» → 8; ellers 4
        r.servings = /lasagne/i.test(r.name) && /dobbel/i.test(s.note || '') ? 8 : 4;
      }
    });
  }
  function saveHouseholdSize(next, opts) {
    opts = opts || {};
    var prev = JSON.parse(JSON.stringify(hsState()));
    state.household_size = {
      people: next.people ? { voksen: next.people.voksen | 0, barn: next.people.barn | 0, smabarn: next.people.smabarn | 0 } : null,
      scale: next.scale !== false,
      asked: next.asked !== false
    };
    if (state.household_size.asked) lsSet(HS_ASKED_KEY, '1');
    save();
    remote(function (w, hid) { return w.setHouseholdSettings(hid, state.household_size); });
    if (opts.toast !== false) {
      var p = state.household_size.people;
      if (p) toast('Retter fra Knaggen er tilpasset ' + SC.peopleText(p, true), 8000, function () {
        state.household_size = prev;
        save();
        remote(function (w, hid) { return w.setHouseholdSettings(hid, state.household_size); });
        route();
      });
    }
    route();
  }
  function saveDayPeople(date, delta, opts) {
    opts = opts || {};
    var prev = state.day_people[date] ? JSON.parse(JSON.stringify(state.day_people[date])) : null;
    var clean = {
      voksen: (delta && delta.voksen) | 0,
      barn: (delta && delta.barn) | 0,
      smabarn: (delta && delta.smabarn) | 0
    };
    if (!SC.hasDelta(clean)) {
      delete state.day_people[date];
      save();
      remote(function (w, hid) { return w.deleteDayPeople(hid, date); });
    } else {
      // 0 personer → sett Tom, ikke lagre avvik
      var eff = SC.effectivePeople(hsPeople() || { voksen: 0, barn: 0, smabarn: 0 }, clean);
      if (hsPeople() && SC.porsjoner(eff) === 0) {
        return clearDayToEmpty(date, prev, clean);
      }
      state.day_people[date] = clean;
      save();
      remote(function (w, hid) { return w.setDayPeople(hid, date, clean); });
    }
    if (opts.toast !== false) {
      var msg = opts.toastMsg || (dayLabel(date) + ' er oppdatert');
      toast(msg, 8000, function () {
        if (prev) state.day_people[date] = prev;
        else delete state.day_people[date];
        save();
        remote(function (w, hid) {
          return prev ? w.setDayPeople(hid, date, prev) : w.deleteDayPeople(hid, date);
        });
        route();
      });
    }
    closeOverlay();
    route();
  }
  function clearDayToEmpty(date, prevDelta, attempted) {
    var prevPlan = state.week_plan[date] || null, prevMark = markOf(date);
    var prevOne = state.oneoffs[date] ? JSON.parse(JSON.stringify(state.oneoffs[date])) : null;
    ops.setDays([{ date: date, recipe_id: null, oneoff: null }]);
    delete state.day_people[date];
    save();
    remote(function (w, hid) { return w.deleteDayPeople(hid, date); });
    toast(dayLabel(date) + ' er satt til Tom', 8000, function () {
      ops.setDays([{ date: date, recipe_id: prevPlan, oneoff: prevOne, mark: prevMark }]);
      if (prevDelta || attempted) {
        state.day_people[date] = prevDelta || attempted;
        save();
        remote(function (w, hid) { return w.setDayPeople(hid, date, state.day_people[date]); });
      }
      route();
    });
    closeOverlay();
    route();
  }
  function dayLabel(date) {
    try {
      var i = weekDates(ui.weekOffset).indexOf(date);
      if (i >= 0) return ['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'][i];
    } catch (e) {}
    return 'Dagen';
  }
  function showHsCard() {
    // Etter velkomst; én gang; ikke samtidig med velkomst/del
    if (showStart()) return false;   // v0.9: steg 2 i Kom i gang
    if (hsAsked()) return false;
    if (ui.shareDismissed) { /* ok */ }
    return true;
  }
  function peopleCountersHtml(idPrefix, people, opts) {
    opts = opts || {};
    var p = people || { voksen: 2, barn: 2, smabarn: 0 };
    var rows = [
      ['voksen', 'Voksne og ungdom', '13 år og eldre'],
      ['barn', 'Barn 6–12 år', 'Teller som ¾'],
      ['smabarn', 'Småbarn 1–5 år', 'Teller som ½']
    ];
    var h = '<ul class="hs-people" data-testid="' + (opts.testid || 'hs-folk') + '">';
    rows.forEach(function (row) {
      var k = row[0], n = p[k] | 0;
      var usual = opts.usual && (opts.usual[k] | 0);
      var dl = '';
      if (opts.usual) {
        var d = n - usual;
        if (d) dl = '<span class="dl ' + (d > 0 ? 'up' : 'down') + '">Vanlig: ' + usual + ' · <b>' + (d > 0 ? '+' : '−') + Math.abs(d) + '</b></span>';
        else dl = '<span class="m">Vanlig: ' + usual + '</span>';
      }
      h += '<li data-k="' + k + '"><div class="who"><b>' + row[1] + '</b><span>' + row[2] + (dl ? ' · ' + dl : '') + '</span></div>' +
        '<div class="hs-step">' +
        '<button type="button" class="qbtn" data-hs-step="-1" data-hs-k="' + k + '" data-hs-prefix="' + idPrefix + '" aria-label="Færre ' + row[1] + '"' + (n <= 0 || (opts.noFewer && n <= (opts.usual ? opts.usual[k] : 0) && !hsPeople() && opts.dayMode) ? ' disabled' : '') + '>−</button>' +
        '<span class="val' + (n ? '' : ' zero') + '" id="' + idPrefix + '-' + k + '" aria-live="polite">' + n + '</span>' +
        '<button type="button" class="qbtn" data-hs-step="1" data-hs-k="' + k + '" data-hs-prefix="' + idPrefix + '" aria-label="Flere ' + row[1] + '"' + (n >= 12 ? ' disabled' : '') + '>+</button>' +
        '</div></li>';
    });
    h += '</ul>';
    var por = SC.porsjoner(p);
    h += '<p class="hs-sum" data-testid="' + idPrefix + '-sum">Regnes som <b>' + fmtPor(por) + ' porsjoner</b>' +
      (opts.factorHtml || '') + '</p>';
    return h;
  }
  function fmtPor(p) {
    var n = Math.floor(p), r = Math.round((p - n) * 4);
    if (r === 4) { n++; r = 0; }
    var s = { 0: '', 1: '¼', 2: '½', 3: '¾' }[r];
    return (n || !s ? String(n) : '') + (s || '') || '0';
  }
  function readCounters(prefix) {
    return {
      voksen: parseInt((document.getElementById(prefix + '-voksen') || {}).textContent, 10) || 0,
      barn: parseInt((document.getElementById(prefix + '-barn') || {}).textContent, 10) || 0,
      smabarn: parseInt((document.getElementById(prefix + '-smabarn') || {}).textContent, 10) || 0
    };
  }
  function chipHtml(date, recipe) {
    var delta = dayDelta(date);
    if (!delta || !recipe) return '';
    var people = hsPeople();
    var eff = SC.effectivePeople(people || { voksen: 0, barn: 0, smabarn: 0 }, delta);
    var net = SC.netPeople(delta);
    var onlyUp = net > 0 && (delta.voksen || 0) >= 0 && (delta.barn || 0) >= 0 && (delta.smabarn || 0) >= 0;
    var onlyDown = net < 0 && (delta.voksen || 0) <= 0 && (delta.barn || 0) <= 0 && (delta.smabarn || 0) <= 0;
    var cls = onlyUp ? '' : onlyDown ? ' minus' : ' endret';
    var label, aria;
    if (onlyUp) {
      label = '+' + net + ' til middag · ' + SC.deltaText(delta);
      aria = dayLabel(date) + ': ' + net + ' flere til middag. Endre';
    } else if (onlyDown) {
      label = '−' + Math.abs(net) + ' til middag · ' + SC.deltaText(delta).replace(/^[−+]/, '').replace(/, [−+]/g, ', ');
      aria = dayLabel(date) + ': ' + Math.abs(net) + ' færre til middag. Endre';
    } else {
      label = 'Endret: ' + SC.peopleText(eff, true) + ' · ' + SC.deltaText(delta);
      aria = dayLabel(date) + ': endret. Endre';
    }
    return '<button type="button" class="hs-chip' + cls + '" data-action="hs-day" data-date="' + date + '" data-testid="hs-brikke" aria-label="' + esc(aria) + '">' +
      '<span class="who">' + esc(label) + '</span></button>';
  }

  // Samlet middagsmengde for en basisvare (til visning i vinduet), f.eks. «1 ss + 2 ts» eller «1 dl».
  function basisAmount(nn, entries) {
    var byBase = {}, order = [];
    entries.forEach(function (e) {
      if (e.qty == null || !isFinite(e.qty)) return;
      var u = U.normUnit(e.unit), c = U.conversion(nn, u), base = c ? c.base : u;
      if (!byBase[base]) { byBase[base] = {}; order.push(base); }
      byBase[base][u] = round3((byBase[base][u] || 0) + Number(e.qty));
    });
    // v0.6.1: kjøkkenmål i basisvinduet («3 dl»), ikke pakninger.
    return order.map(function (base) { return U.plan(nn, base, byBase[base], 0, true).text; }).join(' + ');
  }

  // v0.4.3: én samlet melding øverst på Liste. v0.6.2 (spec v0.6.2 punkt 2): bare når noe ikke er avgjort for uka, som én
  // slank linje (44 px). Når alle er avgjort, ligger basisvarene bare i «Mer».
  function basisStrip(bs) {
    if (!bs || !bs.length) return '';
    var und = bs.filter(function (b) { return !b.choice; });
    if (!und.length) return '';
    function names(arr) { var n = arr.map(function (b) { return b.name.charAt(0).toLowerCase() + b.name.slice(1); }); return n.slice(0, 3).join(', ') + (n.length > 3 ? ' …' : ''); }
    var title = und.length === bs.length
      ? bs.length + (bs.length === 1 ? ' basisvare' : ' basisvarer') + ' i middagene: ' + names(bs)
      : und.length + (und.length === 1 ? ' ny basisvare: ' : ' nye basisvarer: ') + names(und);
    return '<button type="button" class="basis-strip" data-action="basis-open" data-testid="basis" aria-haspopup="dialog">' +
      '<span class="bs-t">' + esc(title) + '</span><span class="bs-go" aria-hidden="true">Velg ›</span></button>';
  }

  function openBasisDialog() {
    var built = buildList(), bs = built.basis;
    if (!bs.length) return;
    closeBasisDialog(false);
    var week = built.weekKey, anyDecided = bs.some(function (b) { return b.choice; });
    var d = document.createElement('div');
    d.id = 'basis-dialog';
    d.className = 'overlay';
    var rows = bs.map(function (b) {
      return '<li><label class="basis-row"><input type="checkbox" data-nn="' + esc(b.nn) + '"' + (b.choice === 1 ? ' checked' : '') + '>' +
        '<span class="basis-name">' + esc(cap(b.name)) + '</span>' + (b.amount ? ' <span class="basis-amt">' + esc(b.amount) + '</span>' : '') +
        (anyDecided && !b.choice ? ' <span class="badge">ny</span>' : '') +
        '<span class="basis-src">' + esc(b.recipes.join(', ')) + '</span></label></li>';
    }).join('');
    d.innerHTML = '<div class="sheet basis-sheet" role="dialog" aria-modal="true" aria-labelledby="basis-h" aria-describedby="basis-hint" data-week="' + week + '">' +
      '<div class="sheet-head"><h3 id="basis-h">Basisvarer</h3>' +
      '<button type="button" class="icon-btn" data-basis="close" aria-label="Lukk">✕</button></div>' +
      '<p class="hint" id="basis-hint">Brukes i middagene på lista. Kryss av det dere må kjøpe – resten legges ikke på lista.</p>' +
      '<ul class="basis-rows">' + rows + '</ul>' +
      '<div class="basis-actions"><button type="button" class="btn primary" data-basis="save" data-testid="basis-lagre"></button>' +
      '<button type="button" class="btn" data-basis="ignore" data-testid="basis-ignorer">Ignorer</button></div></div>';
    document.body.appendChild(d);
    function label() {
      var n = d.querySelectorAll('.basis-rows input:checked').length;
      d.querySelector('[data-basis="save"]').textContent = n ? 'Legg ' + n + ' på lista' : 'Lagre – ingen på lista';
    }
    label();
    d.addEventListener('change', label);
    d.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-basis]');
      var a = e.target === d ? 'close' : btn ? btn.getAttribute('data-basis') : null;
      if (!a) return;
      if (a === 'close') { closeBasisDialog(true); return; }
      var map = {}, n = 0;
      [].forEach.call(d.querySelectorAll('.basis-rows input'), function (cb) {
        var on = a === 'save' && cb.checked;
        map[cb.getAttribute('data-nn')] = on ? 1 : -1;
        if (on) n++;
      });
      ops.setBasis(week, map);
      closeBasisDialog(false);
      flipRender();
      closeBasisDialog.refocus();   // v0.6.2: fokus tilbake etter ny tegning (basislinja, ellers «Mer»)
      toast(a === 'ignore' ? 'Basisvarer ignorert'
        : n ? n + (n === 1 ? ' basisvare' : ' basisvarer') + ' lagt på lista' : 'Ingen basisvarer lagt på lista');
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeBasisDialog(true); return; }
      if (e.key !== 'Tab') return;
      var f = [].filter.call(d.querySelectorAll('button, input'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var firstCb = d.querySelector('.basis-rows input');
    if (firstCb) firstCb.focus();
  }
  // v0.4.3b: «Legg til fra faste varer» – alle faste husvarer med avkrysning for valgt uke.
  function trapTab(d, e) {
    var f = [].filter.call(d.querySelectorAll('button, input'), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  // v0.7: ukevalget – bunnark med søk, grupper etter avdeling, «Som forrige uke» og festet «Legg N på lista».
  function openFastDialog() {
    var built = buildList(), week = built.weekKey, list = built.staples;
    closeSheet('fast-dialog', false);
    closeBasisDialog(false);
    closeListMenu(false);
    var prevKey = week === LIST_KEY ? null : lastWeekWithFaste(week);   // v0.10: felles liste – ingen «Som forrige uke»
    var prevAdj = prevKey ? (state.list_adjust[prevKey] || {}) : {};
    // v0.7.1: når forrige uke hadde eksplisitt valg, kopiér bare de som faktisk var krysset (v>0) – ikke legacy «alle på».
    function prevExplicitOn(s) { return (prevAdj[FAST_PREFIX + s.id] || 0) > 0; }
    var prevN = prevKey ? state.staples.filter(prevExplicitOn).length : 0;
    var prevWn = prevKey ? isoWeek(parseIso(prevKey)) : null;
    var checked = {};
    list.forEach(function (x) { checked[x.s.id] = !!x.on; });
    var beforeCopy = null;   // for Angre etter «Som forrige uke»
    var q = '';
    var d = document.createElement('div');
    d.id = 'fast-dialog';
    d.className = 'overlay';
    function nChecked() { var n = 0; Object.keys(checked).forEach(function (id) { if (checked[id]) n++; }); return n; }
    function paint(opts) {
      opts = opts || {};
      var keepScroll = !!opts.keepScroll;
      var focusSearch = opts.focusSearch !== false && !keepScroll;   // default: focus on first paint / search; never when keepScroll
      var bodyEl = d.querySelector('.uv-body');
      var scrollTop = keepScroll && bodyEl ? bodyEl.scrollTop : 0;
      var n = nChecked(), total = state.staples.length;
      var qn = normName(q), qk = stapleKey(q);
      var rows = state.staples.filter(function (s) {
        if (!qn) return true;
        return normName(s.name).indexOf(qn) >= 0 || stapleKey(s.name).indexOf(qk) >= 0 || stapleKey(s.name) === qk;
      });
      var groups = staplesGrouped(rows);
      var body = '<div class="uv-head"><h3 id="fast-h">Faste varer på lista</h3>' +
        '<button type="button" class="btn small" data-fast="edit" data-testid="faste-rediger-alle">Rediger</button>' +
        '<button type="button" class="icon-btn" data-fast="close" data-testid="faste-avbryt" aria-label="Lukk">✕</button></div>';
      if (!total) {
        body += '<p class="hint" id="fast-hint">Ingen faste varer ennå.</p>' +
          '<button type="button" class="btn" data-fast="edit" data-testid="faste-tom-legg-inn">Legg inn faste varer ›</button>';
      } else {
        var anyExplicit = list.some(function (x) { return x.explicit; });
        // v0.7: hint for eldre uker (før OPTIN) også når varene er forhåndskrysset; ellers bare når ingen er krysset.
        if (!n || (built.legacyStaples && !anyExplicit)) {
          body += '<p class="hint" id="fast-hint">' + (built.legacyStaples && !anyExplicit
            ? 'Denne uka var de faste varene med fra før. Fjern haken for det dere ikke trenger.'
            : 'Kryss av det dere trenger. Ingenting kommer på lista før dere trykker på knappen nederst.') + '</p>';
        }
        body += '<div class="fv-search">' + ICON_SEARCH +
          '<input type="search" id="uv-q" placeholder="Søk …" aria-label="Søk i faste varer" value="' + esc(q) + '" autocomplete="off" data-testid="faste-uke-sok"></div>';
        if (beforeCopy) {
          // v0.7.1: status oppdateres/forsvinner når valget endres (ikke «som uke X» etter manuell endring)
          var matchesPrev = prevKey && state.staples.every(function (s) {
            return !!checked[s.id] === prevExplicitOn(s);
          });
          if (matchesPrev) {
            body += '<div class="uv-status" data-testid="faste-forrige-status"><span class="ok" aria-hidden="true">✓</span>' +
              '<span class="t"><b>' + n + ' krysset av som uke ' + prevWn + '.</b> Ta bort det dere har.</span>' +
              '<button type="button" class="uv-undo" data-fast="undo-prev" data-testid="faste-forrige-angre">Angre</button></div>';
          } else {
            body += '<div class="uv-status" data-testid="faste-forrige-status"><span class="t"><b>' + n + ' krysset av.</b></span>' +
              '<button type="button" class="uv-undo" data-fast="undo-prev" data-testid="faste-forrige-angre">Angre</button></div>';
          }
        } else if (prevKey && prevN) {
          // Vis knappen bare når forrige valg er forskjellig fra nåværende
          var same = state.staples.every(function (s) { return !!checked[s.id] === prevExplicitOn(s); });
          if (!same) {
            body += '<button type="button" class="uv-prev" data-fast="prev" data-testid="faste-forrige">' + ICON_REPEAT +
              '<span class="t"><b>Som forrige uke</b><span>Kryss av de ' + prevN + ' dere valgte i uke ' + prevWn + '</span></span></button>';
          }
        } else if (week !== LIST_KEY && (prevKey === null || prevN === 0)) {
          var lookWn = prevWn || isoWeek(parseIso(isoDate(new Date(parseIso(week).getFullYear(), parseIso(week).getMonth(), parseIso(week).getDate() - 7))));
          body += '<p class="uv-none" data-testid="faste-forrige-tom">Ingen faste varer valgt i uke ' + lookWn + '</p>';
        }
        if (qn && !rows.length) {
          body += '<button type="button" class="uv-addnew" data-fast="add-q" data-testid="faste-uke-ny">+ Legg til «' + esc(q) + '» som fast vare</button>';
        }
        groups.forEach(function (g) {
          var onIn = g.items.filter(function (s) { return checked[s.id]; }).length;
          body += '<h4 class="fv-group-h">' + esc(aisleLabel(g.aisle)) + '<span>' +
            (onIn ? onIn + ' av ' + g.items.length : g.items.length) + '</span></h4><ul class="uv-rows">';
          g.items.forEach(function (s) {
            body += '<li><label class="uv-row"><input type="checkbox" data-sid="' + esc(s.id) + '"' + (checked[s.id] ? ' checked' : '') + '>' +
              '<span class="tx"><span class="nm">' + esc(cap(s.name)) + '</span>' +
              (stapleAmt(s) ? ' <span class="q">' + esc(stapleAmt(s)) + '</span>' : '') + '</span></label></li>';
          });
          body += '</ul>';
        });
      }
      var foot = total ? ('<div class="fv-foot"><span class="sub" data-testid="faste-teller">' + n + ' av ' + total + '</span>' +
        '<button type="button" class="btn primary" data-fast="save" data-testid="faste-lagre">' +
        (n ? 'Legg ' + n + ' på lista' : 'Lagre – ingen på lista') + '</button></div>') : '';
      d.innerHTML = '<div class="sheet basis-sheet uv-sheet" role="dialog" aria-modal="true" aria-labelledby="fast-h" data-week="' + week + '">' +
        '<div class="uv-body">' + body + '</div>' + foot + '</div>';
      if (keepScroll) {
        var nb = d.querySelector('.uv-body');
        if (nb) nb.scrollTop = scrollTop;
      }
      var sq = d.querySelector('#uv-q');
      if (sq && focusSearch) { sq.focus(); sq.setSelectionRange(sq.value.length, sq.value.length); }
    }
    paint({ focusSearch: false });   // første fokus settes under (første checkbox / søk)
    document.body.appendChild(d);
    d.addEventListener('input', function (e) {
      if (e.target.id === 'uv-q') { q = e.target.value; paint({ focusSearch: true }); return; }
      var cb = e.target.closest('input[data-sid]');
      if (cb) {
        checked[cb.getAttribute('data-sid')] = cb.checked;
        // v0.7.1: ikke hopp til toppen / ikke fokus i søk (Trude: 15/16 kryss)
        paint({ keepScroll: true, focusSearch: false });
      }
    });
    d.addEventListener('click', function (e) {
      if (e.target === d) { dismissFast(true); return; }
      var btn = e.target.closest('[data-fast]');
      if (!btn) return;
      var a = btn.getAttribute('data-fast');
      if (a === 'close') { dismissFast(true); return; }
      if (a === 'edit') { dismissFast(false); location.hash = '#liste/faste'; return; }
      if (a === 'prev' && prevKey) {
        beforeCopy = JSON.parse(JSON.stringify(checked));
        state.staples.forEach(function (s) { checked[s.id] = prevExplicitOn(s); });
        paint({ focusSearch: false, keepScroll: true }); return;
      }
      if (a === 'undo-prev' && beforeCopy) { checked = beforeCopy; beforeCopy = null; paint({ focusSearch: false, keepScroll: true }); return; }
      if (a === 'add-q' && q.trim()) {
        var ga = guessAisle(q) || 'Tørrvare', gu = guessUnit(q, ga);
        var id = uid('s');
        ops.addStaple({ id: id, name: q.trim(), qty: 1, unit: gu, aisle: ga, active: true });
        checked[id] = true;
        paint({ focusSearch: false }); return;
      }
      if (a === 'save') {
        var map = {}, n = 0;
        state.staples.forEach(function (s) { map[s.id] = checked[s.id] ? 1 : -1; if (checked[s.id]) n++; });
        ops.setFast(week, map);
        dismissFast(false);
        flipRender();
        closeSheet.refocus();
        toast(n ? n + (n === 1 ? ' fast vare' : ' faste varer') + ' på lista' : 'Ingen faste varer på lista');
      }
    });
    function dismissFast(restore) {
      document.removeEventListener('keydown', onFastKey, true);
      closeSheet('fast-dialog', restore);
    }
    function onFastKey(e) {
      if (!document.getElementById('fast-dialog')) return;
      if (e.key === 'Escape') { e.preventDefault(); dismissFast(true); return; }
      if (e.key === 'Tab') trapTab(d, e);
    }
    document.addEventListener('keydown', onFastKey, true);
    d.addEventListener('keydown', onFastKey);
    // v0.7.1: fokus på første avkrysning (ikke søk) – Esc virker via document-capture, tastatur åpnes ikke
    var first = d.querySelector('.uv-row input') || d.querySelector('[data-fast="close"]');
    if (first) try { first.focus({ preventScroll: true }); } catch (err) { first.focus(); }
  }

  function closeSheet(id, restoreFocus) {
    if (id === 'basis-dialog') { closeBasisDialog(restoreFocus); return; }
    var d = document.getElementById(id);
    if (!d) return;
    d.parentNode.removeChild(d);
    if (restoreFocus) {
      var b = main.querySelector('[data-action="fast-open"]') || main.querySelector('[data-action="list-menu"]');   // v0.6.2: «Mer»
      if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    }
  }
  closeSheet.refocus = function () {
    var b = main.querySelector('[data-action="fast-open"]') || main.querySelector('[data-action="list-menu"]');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  };
  closeBasisDialog.refocus = function () {
    var b = main.querySelector('[data-action="basis-open"]') || main.querySelector('[data-action="list-menu"]');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  };
  function closeBasisDialog(restoreFocus) {
    var d = document.getElementById('basis-dialog');
    if (!d) return;
    d.parentNode.removeChild(d);
    if (restoreFocus) {
      var b = main.querySelector('[data-action="basis-open"]') || main.querySelector('[data-action="list-menu"]');   // v0.6.2: «Mer»
      if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    }
  }

  function isOpen(it) { return !it.checked && !(it.qty === 0); }

  function groupItems(items) {
    return AISLES.map(function (a) {
      return {
        aisle: a,
        // v0.4.2: avkryssede varer (og varer satt til 0) nederst i sin avdeling; alfabetisk innenfor hver del.
        items: items.filter(function (i) { return i.aisle === a; })
          .sort(function (x, y) { return (isOpen(x) ? 0 : 1) - (isOpen(y) ? 0 : 1) || x.name.localeCompare(y.name, 'nb'); })
      };
    }).filter(function (g) { return g.items.length; });
  }
  function currentItems() { return currentList; }
  // v0.4.3b: grupper og rader i «Kilde»: middager i dagens rekkefølge, så «Lagt til selv». Avkryssede rader nederst
  // i sin gruppe (samme regel som avdelingene i «Butikk»).
  function sourceGroups(built) {
    return built.source.concat(built.selv.rows.length ? [built.selv] : []).map(function (g) {
      return { g: g, rows: g.rows.filter(function (r) { return r.item; })
        .sort(function (x, y) { return (isOpen(x.item) ? 0 : 1) - (isOpen(y.item) ? 0 : 1) || x.name.localeCompare(y.name, 'nb'); }) };
    });
  }

  function listAsText() {
    var built = buildList();
    var kilde = ui.sort === 'kilde';
    var lines = ['Handleliste' + (kilde ? ' (etter matrett)' : '')];   // v0.10: én felles liste, ingen uke
    var any = false;
    if (kilde) {
      // Som på skjermen: per rett med rettens egen mengde, bare ukryssede.
      sourceGroups(built).forEach(function (x) {
        var open = x.rows.filter(function (r) { return isOpen(r.item); });
        if (!open.length) return;
        any = true;
        lines.push('');
        lines.push(x.g.title);
        open.forEach(function (r) { lines.push('- ' + cap(r.name) + (r.amount ? ', ' + r.amount : '')); });
      });
      return any ? lines.join('\n') + '\n' : '';
    }
    groupItems(built.items).forEach(function (g) {
      var open = g.items.filter(isOpen);
      if (!open.length) return;
      any = true;
      lines.push('');
      lines.push(aisleLabel(g.aisle));
      open.forEach(function (i) {
        var qu = i.plan ? i.plan.text : '';
        lines.push('- ' + cap(i.name) + (qu ? ', ' + qu : '') + (i.plan && i.plan.showNeed ? ' (behov ' + i.plan.needText + ')' : ''));
      });
    });
    return any ? lines.join('\n') + '\n' : '';
  }

  function renderListe() {
    // v0.7: «Faste husvarer»-regnearket nederst er erstattet av siden #liste/faste.
    main.innerHTML = '<section class="page" data-page="liste"><div id="list-section"></div></section>';
    renderListSection();
  }

  // v0.6.2: skjemaet åpnes med «＋» i verktøylinja (ingen <details> lenger) og står rett under den.
  function addItemForm() {
    return '<div class="add-panel" id="add-panel">' +
      '<form id="item-add" class="item-add-form" novalidate aria-label="Legg til vare">' +
      '<input type="text" id="ai-name" placeholder="Vare, f.eks. tannkrem" aria-label="Vare" autocomplete="off" list="known-ings">' +
      '<div class="ai-row"><input type="text" id="ai-qty" inputmode="decimal" placeholder="1" aria-label="Mengde">' +
      '<select id="ai-unit" aria-label="Enhet">' + unitOptions('') + '</select>' +
      '<select id="ai-aisle" aria-label="Avdeling">' + aisleOptions('Tørrvare') + '</select></div>' +
      '<label class="check"><input type="checkbox" id="ai-staple"> Legg til i faste husvarer</label>' +
      '<button type="submit" class="btn primary">Legg til</button></form>' + knownNamesDatalist() + '</div>';
  }
  // Merkevares ikoner (＋ og ⋯) i K-knagg-stil, inline så de arver farge.
  var ICON_ADD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5V19M5 12H19"/></svg>';
  var ICON_SORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7H20M7 12H17M10 17H14"/></svg>';
  var ICON_MORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="2.1" fill="currentColor" stroke="none"/></svg>';

  // v0.6.2 (spec v0.6.2 punkt 2): «⋯ Mer» – de sjeldne handlingene i et bunnark (samme .overlay/.sheet som basisvinduet).
  // Arket lukkes før handlingen kjøres. Testidene er de samme som før (kopier, fra-faste, fjern-avkrysning); basisvarer
  // har fått basis-meny, fordi basis brukes av basislinja.
  function openListMenu() {
    closeListMenu(false);
    var built = buildList();
    var nFast = built.staples.filter(function (x) { return x.on; }).length;
    var bs = built.basis, und = bs.filter(function (b) { return !b.choice; }).length, added = bs.filter(function (b) { return b.choice === 1; }).length;
    var nChecked = built.items.filter(doneRecent).length;
    function row(action, testid, label, meta, extra) {
      return '<li><button type="button" class="menu-row" data-action="' + action + '" data-testid="' + testid + '"' + (extra || '') + '>' +
        '<span>' + esc(label) + '</span>' + (meta ? '<span class="mr-meta"' + (testid === 'fra-faste' ? ' data-testid="faste-antall"' : '') + '>' + esc(meta) + '</span>' : '') + '</button></li>';
    }
    // v0.14: «Del lista til Oda» – eneste Oda-inngang; bare med husstand (funksjonen krever medlemskap) og noe som ikke er krysset av
    var nOda = hh ? delLines(delItems()).length : 0;
    var rows = row('copy-text', 'kopier', 'Kopier som tekst', '') +
      (nOda ? row('del-open', 'del-inngang', 'Del lista til Oda', nOda + (nOda === 1 ? ' vare' : ' varer'), ' aria-haspopup="dialog"') : '') +
      row('fast-open', 'fra-faste', 'Faste varer på lista', nFast ? nFast + ' på lista' : 'ingen valgt', ' aria-haspopup="dialog"') +
      row('faste-page', 'alle-faste', 'Alle faste varer', state.staples.length ? state.staples.length + (state.staples.length === 1 ? ' vare' : ' varer') : 'ingen ennå') +
      (bs.length ? row('basis-open', 'basis-meny', 'Basisvarer', und ? und + ' ikke valgt' : added + ' av ' + bs.length + ' lagt til', ' aria-haspopup="dialog"') : '') +
      (nChecked ? row('uncheck-all', 'fjern-avkrysning', 'Fjern avkrysning …', nChecked + ' krysset av') : '');
    var d = document.createElement('div');
    d.id = 'list-menu';
    d.className = 'overlay';
    d.innerHTML = '<div class="sheet menu-sheet" role="dialog" aria-modal="true" aria-labelledby="mer-h">' +
      '<div class="sheet-head"><h3 id="mer-h">Lista</h3><button type="button" class="btn small" data-menu="close" data-testid="mer-lukk">Lukk</button></div>' +
      '<ul class="menu-rows">' + rows + '</ul></div>';
    document.body.appendChild(d);
    var mer = main.querySelector('[data-action="list-menu"]');
    if (mer) mer.setAttribute('aria-expanded', 'true');
    d.addEventListener('click', function (e) {
      if (e.target === d) { closeListMenu(true); return; }
      var b = e.target.closest('[data-menu], [data-action]');
      if (!b) return;
      if (b.getAttribute('data-menu') === 'close') { closeListMenu(true); return; }
      var a = b.getAttribute('data-action');
      closeListMenu(a === 'copy-text' || a === 'uncheck-all');
      if (a === 'copy-text') copyList();
      else if (a === 'del-open') openDel();
      else if (a === 'fast-open') openFastDialog();
      else if (a === 'faste-page') { location.hash = '#liste/faste'; }
      else if (a === 'basis-open') openBasisDialog();
      else if (a === 'uncheck-all') uncheckAll();
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeListMenu(true); return; }
      if (e.key === 'Tab') trapTab(d, e);
    });
    var first = d.querySelector('.menu-row');
    if (first) first.focus();
  }
  function closeListMenu(restoreFocus) {
    var d = document.getElementById('list-menu');
    if (!d) return;
    d.parentNode.removeChild(d);
    var mer = main.querySelector('[data-action="list-menu"]');
    if (mer) {
      mer.setAttribute('aria-expanded', 'false');
      if (restoreFocus) try { mer.focus({ preventScroll: true }); } catch (e) { mer.focus(); }
    }
  }
  // v0.14 «Del lista til Oda» (spec v0.14, merkevare/v014-oda-del): lista blir en side som ser ut som en oppskrift
  // (funksjonen visDeleliste), og lenken deles til Oda-appen med telefonens delingsmeny. Linjeformatet: delelinje.js.
  // Ingenting krysses av uten trykk; «Kryss av alt som ble sendt» gir den vanlige «Angre».
  var DL = window.KnaggenDeleLinje;
  function delItems() {
    // samme utvalg og rekkefølge som lista (avdelinger, så alfabetisk), bare det som ikke er krysset av
    var out = [];
    groupItems(buildList().items).forEach(function (g) { g.items.filter(isOpen).forEach(function (i) { out.push(i); }); });
    return out;
  }
  function delLines(items) {
    var seen = {}, rows = [];
    items.forEach(function (i) {
      var l = DL.line({ name: i.name, text: i.plan ? i.plan.text : '', unit: i.unit });
      if (!l) return;
      if (seen[l]) { seen[l].items.push(i); return; }
      seen[l] = { line: l, items: [i] }; rows.push(seen[l]);
    });
    return rows.slice(0, DL.MAX_LINES);
  }
  function delTitle() {
    var ds = listDates(), w = ds.length ? ds.map(function (d) { return isoWeek(parseIso(d)); }) : [isoWeek(new Date())];
    var lo = w[0], hi = w[w.length - 1];
    return 'Handleliste uke ' + lo + (hi !== lo ? '–' + hi : '');
  }
  function delCanCopyOnly() { return !(navigator.share && envInfo.phone); }
  var delState = null;
  window.addEventListener('hashchange', function () { if (delState) closeDel(); });   // arket hører til lista
  function openDel() {
    closeDel();
    var items = delItems(), rows = delLines(items);
    if (!rows.length) { toast('Alt er krysset av'); return; }
    delState = { rows: rows, mode: 'confirm', url: '', busy: false, err: '' };
    var d = document.createElement('div');
    d.id = 'del-sheet'; d.className = 'overlay';
    d.addEventListener('click', delClick);
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDel(); return; }
      if (e.key === 'Tab') trapTab(d, e);
    });
    document.body.appendChild(d);
    delRender();
  }
  function closeDel() {
    var d = document.getElementById('del-sheet'); if (d) d.parentNode.removeChild(d);
    delState = null;
  }
  function delRender() {
    var d = document.getElementById('del-sheet'); if (!d || !delState) return;
    var s = delState, n = s.rows.length, h, focus;
    var head = function (t) { return '<h3 class="del-h" id="del-h" tabindex="-1" data-testid="del-overskrift">' + esc(t) + '</h3>'; };
    if (s.mode === 'sent' || s.mode === 'copied' || s.mode === 'ready') {
      h = (s.mode === 'sent' ? head('Sendt.')
        : s.mode === 'copied' ? head('Lenke kopiert') + '<p class="del-txt">Åpne den på telefonen eller lim den inn i Oda.</p>'
        : head('Lenken er klar') + '<p class="del-txt">Trykk «Del til Oda» og velg Oda i delingsmenyen.</p>') +
        (s.mode === 'copied' ? '<input class="del-url" type="text" readonly value="' + esc(s.url) + '" aria-label="Lenken" data-testid="del-lenke">' : '') +
        '<div class="del-acts">' + (s.mode === 'ready' ? '<button type="button" class="btn primary" data-del="share-again" data-testid="del-del">Del til Oda</button>' : '') +
        '<button type="button" class="btn' + (s.mode === 'ready' ? '' : ' primary') + '" data-del="tick" data-testid="del-kryss">Kryss av alt som ble sendt</button>' +
        '<button type="button" class="btn" data-del="close" data-testid="del-lukk">Lukk</button></div>';
      focus = '#del-h';
    } else {
      h = head(n + (n === 1 ? ' vare sendes til Oda' : ' varer sendes til Oda')) +
        '<details class="del-vis" data-testid="del-vis"><summary>Vis varene</summary><ul class="del-lines" data-testid="del-linjer">' +
        s.rows.map(function (r) { return '<li>' + esc(r.line) + '</li>'; }).join('') + '</ul></details>' +
        '<p class="del-txt" data-testid="del-tekst">Knaggen lager en lenke som virker i ' + esc(DL.daysText()) + '. Velg Oda i delingsmenyen.</p>' +
        (s.err ? '<p class="del-txt del-err" role="alert" data-testid="del-feil">' + esc(s.err) + '</p>' : '') +
        '<div class="del-acts"><button type="button" class="btn primary" data-del="share" data-testid="del-del"' + (s.busy ? ' disabled aria-busy="true"' : '') + '>' + (s.busy ? 'Lager lenken …' : 'Del til Oda') + '</button>' +
        (envInfo.ios ? '<div class="row"><button type="button" class="btn" data-del="copy" data-testid="del-kopier"' + (s.busy ? ' disabled' : '') + '>Kopier lenke</button>' +
          '<button type="button" class="btn" data-del="close" data-testid="del-avbryt">Avbryt</button></div>'
          : '<button type="button" class="btn" data-del="close" data-testid="del-avbryt">Avbryt</button>') + '</div>';
      focus = s.busy ? null : '[data-del="share"]';
    }
    d.innerHTML = '<div class="sheet del-sheet" role="dialog" aria-modal="true" aria-labelledby="del-h" data-testid="del-ark" data-mode="' + s.mode + '">' + h + '</div>';
    if (focus) { var f = d.querySelector(focus); if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  var DEL_ERR = {
    'resource-exhausted': 'Dere har laget mange lenker den siste timen. Vent litt og prøv igjen.',
    'permission-denied': 'Denne telefonen er ikke med i husstanden lenger.',
    'no-server': 'Fikk ikke kontakt med Knaggen. Sjekk nettet og prøv igjen.'
  };
  function delMake(then) {
    var s = delState;
    if (!s || s.busy) return;
    if (s.url) return then(s.url);
    if (!hh || !Sync || !Sync.makeShareList) { s.err = 'Del lista til Oda krever at telefonen er med i en husstand.'; delRender(); return; }
    s.busy = true; s.err = ''; delRender();
    Sync.makeShareList(hh.hid, s.rows.map(function (r) { return r.line; }), delTitle(), hentDefaultPeople()).then(function (r) {
      if (delState !== s) return;
      s.busy = false; s.url = r.url; then(r.url);
    }, function (e) {
      if (delState !== s) return;
      s.busy = false; s.err = DEL_ERR[e && e.code] || 'Fikk ikke laget lenken. Prøv igjen.'; delRender();
    });
  }
  function delShare(url) {
    var s = delState;
    if (delCanCopyOnly()) return delCopy(url);
    navigator.share({ url: url, title: delTitle() }).then(function () {
      if (delState !== s) return;
      s.mode = 'sent'; delRender();
    }, function (e) {
      if (delState !== s) return;
      if (e && e.name === 'AbortError') { s.mode = 'confirm'; delRender(); return; }
      if (e && e.name === 'NotAllowedError') { s.mode = 'ready'; delRender(); return; }   // trykket «gikk ut» mens lenken ble laget
      delCopy(url);
    });
  }
  function delCopy(url) {
    var s = delState;
    copyQuiet(url, function () { if (delState !== s) return; s.mode = 'copied'; delRender(); });
  }
  function delTick() {
    var s = delState; if (!s) return;
    var items = [];
    s.rows.forEach(function (r) { r.items.forEach(function (i) { items.push(i); }); });
    var cur = {}; currentItems().forEach(function (i) { cur[i.key] = i; });
    items = items.map(function (i) { return cur[i.key] || i; }).filter(isOpen);
    closeDel();
    if (!items.length) return;
    var byWeek = {};
    items.forEach(function (it) {
      var wk = it.week || LIST_KEY, m = byWeek[wk] || (byWeek[wk] = {}), wchecks = state.checks[wk] || {};
      m[it.key] = tickValue(it);
      (it.legacyKeys || []).forEach(function (x) { if (wchecks[x.k]) m[x.k] = false; });
    });
    Object.keys(byWeek).forEach(function (wk) { ops.setChecks(wk, byWeek[wk]); });
    flipRender();
    var n = items.length;
    toast(n + (n === 1 ? ' vare krysset av' : ' varer krysset av'), UNDO_MS, { label: 'Angre', run: function () {
      var back = {};
      items.forEach(function (it) { var wk = it.week || LIST_KEY; (back[wk] = back[wk] || {})[it.key] = false; });
      Object.keys(back).forEach(function (wk) { ops.setChecks(wk, back[wk]); });
      flipRender();
    } });
  }
  function delClick(e) {
    var d = document.getElementById('del-sheet');
    if (e.target === d) { if (!(delState && delState.busy)) closeDel(); return; }
    var b = e.target.closest('[data-del]'); if (!b) return;
    var a = b.getAttribute('data-del');
    if (a === 'close') return closeDel();
    if (a === 'share') return delMake(delShare);
    if (a === 'share-again') return delShare(delState.url);
    if (a === 'copy') return delMake(delCopy);
    if (a === 'tick') return delTick();
  }

  function copyList() {
    var text = listAsText();
    if (!text) { toast('Alt er krysset av'); return; }
    copyText(text);
  }

  // v0.11: rett(er) og behov står ikke lenger under varen; de vises i boblen når man holder inne (infoBits).
  function infoBits(i) {
    var src = [];
    if (i.recipes.length) src.push(i.recipes.join(', '));
    if (i.plan && i.plan.showNeed) src.push('behov ' + i.plan.needText);
    return src;
  }
  function srcBits(i, extra) {
    var src = V010_LAYOUT ? infoBits(i).reverse() : [];   // testkroken: v0.10-linja (behov, rett(er)) under varen
    if (i.basisvare) src.push('basisvare');
    if (i.sources.indexOf('staple') >= 0) src.push('fast vare');
    if (i.sources.indexOf('extra') >= 0) src.push('lagt til');
    if (i.adjust && i.plan) src.push('justert ' + i.plan.adjText(i.adjust));
    return src.concat(extra || []);
  }
  function itemLi(i, o) {
    if (V010_LAYOUT) return itemLiV010(i, o);   // testkroken: hele raden krysser av, som i 0.10
    // Trengs mer enn det som ble krysset av: egen linje som brytes og aldri kuttes (v0.4.2).
    var note = !i.checked && typeof i.tick === 'number' ? U.sizeText(i.tick, i.unit) + ' krysset av' : '';
    return '<li class="item' + (i.checked ? ' checked' : '') + (i.qty === 0 ? ' zero' : '') + ' src-' + o.kind + '" data-key="' + esc(i.key) + '" data-row="' + esc(o.row) + '">' +
      '<label class="cb-hit"><input type="checkbox" data-key="' + esc(i.key) + '"' + (i.checked ? ' checked' : '') + ' aria-label="' + esc(cap(o.name)) + (o.qu ? ' ' + esc(o.qu) : '') + '"></label>' +
      '<span class="item-text"' + (o.info && o.info.length ? ' data-info="' + esc(o.info.join(' · ')) + '"' : '') + '><span class="item-name">' + esc(cap(o.name)) + '</span>' +
      (o.qu ? ' <span class="item-qty">' + esc(o.qu) + '</span>' : '') +
      '<span class="item-src">' + (o.src.length ? '<span class="src-line">' + esc(o.src.join(' · ')) + '</span>' : '') +
      (note ? '<span class="src-note" data-testid="krysset-av">' + esc(note) + '</span>' : '') + '</span></span>' +
      (o.ctl ? '<div class="qty-ctl">' + o.ctl + '</div>' : '') + '</li>';
  }
  function itemLiV010(i, o) {
    // Trengs mer enn det som ble krysset av: egen linje som brytes og aldri kuttes (v0.4.2).
    var note = !i.checked && typeof i.tick === 'number' ? U.sizeText(i.tick, i.unit) + ' krysset av' : '';
    return '<li class="item' + (i.checked ? ' checked' : '') + (i.qty === 0 ? ' zero' : '') + ' src-' + o.kind + '" data-key="' + esc(i.key) + '" data-row="' + esc(o.row) + '">' +
      '<label><input type="checkbox" data-key="' + esc(i.key) + '"' + (i.checked ? ' checked' : '') + '>' +
      '<span class="item-text"><span class="item-name">' + esc(cap(o.name)) + '</span>' +
      (o.qu ? ' <span class="item-qty">' + esc(o.qu) + '</span>' : '') +
      '<span class="item-src">' + (o.src.length ? '<span class="src-line">' + esc(o.src.join(' · ')) + '</span>' : '') +
      (note ? '<span class="src-note" data-testid="krysset-av">' + esc(note) + '</span>' : '') + '</span></span></label>' +
      (o.ctl ? '<div class="qty-ctl">' + o.ctl + '</div>' : '') + '</li>';
  }
  function butikkLi(i) {
    var pureExtra = i.sources.length === 1 && i.sources[0] === 'extra';
    return itemLi(i, { kind: i.source, row: i.key, name: i.name, qu: i.plan ? i.plan.text : '', src: srcBits(i), info: infoBits(i),
      ctl: (pureExtra ? '<button type="button" class="qbtn" data-action="remove-extra" aria-label="Fjern ' + esc(i.name) + '">✕</button>' : '') +
        '<button type="button" class="qbtn" data-action="qty-dec" aria-label="Mindre ' + esc(i.name) + '"' + (i.qty ? '' : ' disabled') + '>−</button>' +
        '<button type="button" class="qbtn" data-action="qty-inc" aria-label="Mer ' + esc(i.name) + '">+</button>' });
  }
  // «Kilde»-rad: rettens egen mengde; hva som faktisk kjøpes (sammenslått + pakninger) står i liten tekst.
  // +/- finnes bare i «Butikk» (de endrer den sammenslåtte linja); egne varer kan fjernes med ✕ her også.
  function kildeLi(r) {
    var i = r.item, src = [];
    var tot = i.plan ? i.plan.text : '';
    // Bare når den sammenslåtte linja avviker: flere kilder, pakningsavrunding eller +/- (ikke «1 beger» vs «3 dl»).
    if (tot && tot !== r.amount && (r.shared || i.plan.showNeed || i.adjust)) src.push('i butikken: ' + tot);
    if (r.kind === 'dinner' && i.basisvare) src.push('basisvare');
    if (r.kind === 'staple') src.push('fast vare');
    return itemLi(i, { kind: r.kind === 'dinner' ? 'dinner' : r.kind, row: r.row, name: r.name, qu: r.amount, src: src, info: infoBits(i),
      ctl: r.kind === 'extra' ? '<button type="button" class="qbtn" data-action="remove-extra" data-extras="' + esc(r.extra_ids.join(',')) + '" aria-label="Fjern ' + esc(r.name) + '">✕</button>' : '' });
  }

  function renderListSection() { renderListSection0(); }
  function renderListSection0() {
    var el = document.getElementById('list-section');
    if (!el) return;
    var built = buildList();
    if (purgeDone(built)) built = buildList();   // v0.10: avkryssede varer eldre enn 3 dager slettes for godt
    var kilde = ui.sort === 'kilde';
    var left = built.items.filter(isOpen).length;
    var nDone = built.items.filter(doneRecent).length;
    if (!nDone) ui.showDone = false;
    // v0.6.2 (spec v0.6.2 punkt 2): kompakt topp – ukevelger (med «N middager · N igjen» i undertittelen), overskriften
    // «Sortering» (beholdt etter Sjefens valg, v0.4.3c), verktøylinje (sortering + ＋ + ⋯), basislinje bare når noe ikke er
    // avgjort, og skjemaet når ＋ er trykket. Kopier, faste varer, basisvarer og Fjern avkrysning ligger i «⋯ Mer».
    var stats = '<span data-testid="middager">' + built.dinners + ' middag' + (built.dinners === 1 ? '' : 'er') + '</span> · ' +
      '<span class="left" data-testid="igjen">' + left + ' igjen</span>';
    var h = '';
    if (V010_LAYOUT) {   // testkroken: v0.10-toppen (Mengder-linja, «Sortering» og verktøylinja), kopiert uendret fra 0.10.0
      // v0.10: ingen ukevelger – én felles liste som følger ukesmenyen
      h = '<div class="week-nav list-nav"><div class="week-title"><h2>Handleliste</h2><span class="sub">' + stats + '</span></div></div>';
      // v0.8: mengdelinje når husstand er satt (eller det finnes avvik)
      if (hsPeople() || Object.keys(state.day_people || {}).some(function (d) { return built.dates.indexOf(d) >= 0 && dayDelta(d); })) {
        var p = hsPeople();
        var devs = [];
        built.dates.forEach(function (d, i) {
          var dd = dayDelta(d); if (!dd) return;
          var net = SC.netPeople(dd);
          var short = DAY_SHORT[(parseIso(d).getDay() + 6) % 7] + (weekDates(0).indexOf(d) < 0 ? ' ' + shortDate(d) : '');
          var onlyUp = net > 0 && (dd.voksen||0)>=0 && (dd.barn||0)>=0 && (dd.smabarn||0)>=0;
          var onlyDn = net < 0 && (dd.voksen||0)<=0 && (dd.barn||0)<=0 && (dd.smabarn||0)<=0;
          devs.push(short + ' ' + (onlyUp ? '+' + net : onlyDn ? '−' + Math.abs(net) : 'endret'));
        });
        var two = devs.length > 0;
        h += '<button type="button" class="hs-line' + (two ? ' two' : '') + '" data-action="hs-slik" data-testid="hs-mengder">' +
          '<span class="t"><b>Mengder for ' + (p ? SC.peopleText(p, true) : '4 (husstand ikke satt)') + '</b>' +
          (two ? '<span class="dev">Avvik: ' + esc(devs.join(' · ')) + '</span>' : '') + '</span>' +
          '<span class="go">Se ›</span></button>';
      }
      h += '<div class="sort-h" id="sort-h">Sortering</div>';
      h += '<div class="list-tools"><div class="seg sort" role="group" aria-labelledby="sort-h" data-testid="sortering">' + SORTS.map(function (x) {
        var on = ui.sort === x[0];
        return '<button type="button" data-action="sort" data-sort="' + x[0] + '" aria-pressed="' + on + '" title="' + x[2] + '"' +
          (on ? ' class="on"' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>' +
        '<button type="button" class="tool-btn" data-action="add-toggle" aria-label="Legg til vare" aria-expanded="' + (ui.addOpen ? 'true' : 'false') + '" data-testid="legg-til">' + ICON_ADD + '</button>' +
        '<button type="button" class="tool-btn more" data-action="list-menu" aria-haspopup="dialog" aria-expanded="false" aria-label="Mer: kopier, faste varer, basisvarer, fjern avkrysning" data-testid="mer">' + ICON_MORE + '<span>Mer</span></button></div>';   // v0.6.3 (spec v0.6.3 punkt 2): synlig tekst «Mer»
    } else {
      // v0.11 (spec 2): «Mengder for …»-linja er borte. Overskriftsraden har ＋, sortering og Mer; avvik vises som små
      // merkelapper («Fredag +2») bare når de finnes, og åpner det samme husstandsarket som «Se ›» gjorde.
      var sortName = SORTS.filter(function (x) { return x[0] === ui.sort; })[0] || SORTS[1];
      h = '<div class="week-nav list-nav v11-list-head"><div class="week-title"><h2>Handleliste</h2><span class="sub">' + stats + '</span></div>' +
        '<div class="list-tools v11-tools">' +
        '<button type="button" class="tool-btn" data-action="add-toggle" aria-label="Legg til vare" aria-expanded="' + (ui.addOpen ? 'true' : 'false') + '" data-testid="legg-til">' + ICON_ADD + '</button>' +
        '<button type="button" class="tool-btn" data-action="sort-open" aria-haspopup="dialog" aria-expanded="' + (ui.sortOpen ? 'true' : 'false') + '" aria-label="Sortering: ' + sortName[1] + '" data-testid="sortering">' + ICON_SORT + '</button>' +
        '<button type="button" class="tool-btn more" data-action="list-menu" aria-haspopup="dialog" aria-expanded="false" aria-label="Mer: kopier, faste varer, basisvarer, fjern avkrysning" data-testid="mer">' + ICON_MORE + '<span>Mer</span></button></div></div>';
      var devs = [];
      built.dates.forEach(function (d) {
        var dd = dayDelta(d); if (!dd) return;
        var net = SC.netPeople(dd);
        var nm = dayName(d) + (weekDates(0).indexOf(d) < 0 ? ' ' + shortDate(d) : '');
        var onlyUp = net > 0 && (dd.voksen||0)>=0 && (dd.barn||0)>=0 && (dd.smabarn||0)>=0;
        var onlyDn = net < 0 && (dd.voksen||0)<=0 && (dd.barn||0)<=0 && (dd.smabarn||0)<=0;
        devs.push(nm + ' ' + (onlyUp ? '+' + net : onlyDn ? '−' + Math.abs(net) : 'endret'));
      });
      if (devs.length) h += '<div class="v11-devs">' + devs.map(function (t) {
        return '<button type="button" class="v11-tag dev-tag" data-action="hs-slik" data-testid="hs-avvik" aria-label="' + esc(t) + ' – se husstanden">' + esc(t) + '</button>';
      }).join('') + '</div>';
      if (ui.sortOpen) h += '<div class="overlay v11-sort-bg" data-action="sort-close-bg"><div class="sheet menu-sheet" role="dialog" aria-modal="true" aria-labelledby="sort-h" data-testid="sort-ark">' +
        '<div class="sheet-head"><h3 id="sort-h">Sortering</h3><button type="button" class="btn small" data-action="sort-close">Lukk</button></div>' +
        '<ul class="menu-rows" role="radiogroup" aria-labelledby="sort-h">' + SORTS.map(function (x) {
          var on = ui.sort === x[0];
          return '<li><button type="button" class="menu-row' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-action="sort" data-sort="' + x[0] + '" aria-pressed="' + on + '"><span>' + x[1] + '</span><span class="mr-meta">' + x[2] + '</span></button></li>';
        }).join('') + '</ul></div></div>';
    }
    h += markedLine();   // v0.16
    h += basisStrip(built.basis);
    if (ui.addOpen) h += addItemForm();
    var shown = built.items.filter(visibleItem);
    var doneBtn = nDone ? '<button type="button" class="linkbtn show-done" data-action="show-done" aria-expanded="' + (ui.showDone ? 'true' : 'false') + '" data-testid="vis-handlet">' +
      (ui.showDone ? 'Skjul handlet' : 'Vis ' + nDone + ' handlet') + '</button>' : '';
    if (!built.items.length || (!shown.length && !nDone)) {
      h += '<p class="empty">Lista er tom. Velg middager under <a href="#uke">Uke</a>, eller legg til varer.</p>';
      el.innerHTML = h;
      return;
    }
    if (!built.dinners) h += '<p class="hint">Ingen middager valgt ennå. <a href="#uke">Velg middager</a>.</p>';
    if (!shown.length) h += '<p class="empty" data-testid="alt-handlet">Alt er handlet.</p>';
    if (kilde) {
      sourceGroups(built).forEach(function (x) {
        var rows = x.rows.filter(function (r) { return visibleItem(r.item); });
        if (!rows.length && x.rows.length) return;   // alt i gruppa er handlet (skjult)
        h += '<h3 class="aisle src-head" data-group="' + esc(x.g.id) + '">' + esc(x.g.title) + '</h3>';
        if (!rows.length) {
          h += '<p class="src-empty">' + (x.g.skipped ? 'Bare basisvarer – ingen på lista' : 'Ingen varer') + '</p>';
          return;
        }
        h += '<ul class="items">' + rows.map(kildeLi).join('') + '</ul>';
      });
    } else {
      groupItems(shown).forEach(function (g) {
        h += '<h3 class="aisle">' + esc(aisleLabel(g.aisle)) + '</h3><ul class="items">' + g.items.map(butikkLi).join('') + '</ul>';
      });
    }
    if (doneBtn) h += '<div class="done-row">' + doneBtn + '</div>';
    el.innerHTML = h;
  }

  // Lagrer det som kjøpes (hele pakninger), så en økning innenfor samme pakning ikke fjerner avkrysningen.
  function tickValue(it) { return it.buy != null && it.buy > 0 ? it.buy : true; }

  function uncheckAll() {
    // v0.10: gjelder de som er handlet de siste 3 dagene (de som vises med «Vis N handlet»)
    var wk = LIST_KEY;
    var items = currentItems().filter(function (i) { return i.week === wk && doneRecent(i); });
    var n = items.length;
    if (!n) return;
    var stored = state.checks[wk] || {}, at0 = state.check_at || {};
    var prev = {}, prevAt = {}, m = {};
    items.forEach(function (i) {
      [i.key].concat((i.legacyKeys || []).map(function (x) { return x.k; })).forEach(function (k) {
        if (stored[k]) { prev[k] = stored[k]; prevAt[k] = at0[k] || Date.now(); m[k] = false; }
      });
    });
    ask({ id: 'fjern-avkrysning', title: 'Fjerne avkrysningen på ' + n + (n === 1 ? ' vare' : ' varer') + '?',
      text: hh ? 'Dette gjelder hele husstanden.' : '', ok: 'Fjern avkrysning', cancel: 'Avbryt' }).then(function (ok) {
      if (!ok) return;
      ops.setChecks(wk, m);
      flipRender();
      toast('Avkrysning fjernet (' + n + (n === 1 ? ' vare)' : ' varer)'), UNDO_MS, { label: 'Angre', run: function () {
        ops.setChecks(wk, prev, prevAt);   // gjenoppretter nøyaktig de samme avkrysningene (også hos den andre telefonen)
        flipRender();
        toast('Avkrysningen er tilbake');
      } });
    });
  }

  function adjustItem(key, dir) {
    var it = currentItems().filter(function (i) { return i.key === key; })[0];
    if (!it) return;
    // +/- tar utgangspunkt i det som kjøpes: neste mulige kjøp for kjente varer (v0.6.1: 7 dl melk → 1 l → «+» → 1,75 l → «+» → 2 l),
    // ellers ett steg i visningsenheten (100 g, 0,5 kg, 1 dl, 0,5 l, 1 ss, 1 stk …).
    var pl = it.plan;
    var step = pl ? pl.step : 1;
    var cur = pl ? pl.buy : 0;
    var next = dir > 0 ? cur + step : Math.max(0, cur - step);
    if (pl && pl.sizes) next = U.nextBuy(pl, dir);   // v0.6.1: neste mulige kjøp (én pakningsstørrelse)
    // Runder til nærmeste steg når vi går fra et «skjevt» tall (f.eks. 0,5 dl -> 1 dl).
    var ratio = round3(cur / step);
    if (!(pl && pl.packs) && ratio !== Math.round(ratio)) next = round3((dir > 0 ? Math.ceil(ratio) : Math.floor(ratio)) * step);
    var own = round3(next - (it.base_qty || 0) - (it.adjust_legacy || 0));
    ops.adjust(it.week, key, own, round3(own - (it.adjust_own || 0)));
    flipRender();                 // auto-ukrysset vare glir opp igjen
  }

  // v0.4.2: tegn lista på nytt og la radene gli til ny plass (FLIP). Siden ruller ikke: varen flyttes innenfor
  // sin avdeling, så alt over avdelingen står stille, og rulleposisjonen settes tilbake om nettleseren flytter den.
  var FLIP_MS = 220;
  function flipRender(fn) {
    var before = {};
    // v0.4.3b: radene identifiseres med data-row (i «Kilde» kan samme vare stå under flere retter).
    main.querySelectorAll('.item[data-row]').forEach(function (el) { before[el.getAttribute('data-row')] = el.getBoundingClientRect().top; });
    var active = document.activeElement, focusKey = active && active.matches && active.matches('.item input[type=checkbox]') ? active.closest('.item').getAttribute('data-row') : null;
    var sx = window.scrollX, sy = window.scrollY;
    (fn || renderListSection)();
    if (window.scrollY !== sy) window.scrollTo(sx, sy);
    if (focusKey && document.activeElement !== active) {
      var fk = main.querySelector('.item[data-row="' + (window.CSS && CSS.escape ? CSS.escape(focusKey) : focusKey) + '"] input[type=checkbox]');
      if (fk) try { fk.focus({ preventScroll: true }); } catch (e) { /* ignorer */ }
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var moved = [];
    main.querySelectorAll('.item[data-row]').forEach(function (el) {
      var b = before[el.getAttribute('data-row')];
      if (b == null) return;
      var d = b - el.getBoundingClientRect().top;
      if (Math.abs(d) < 1) return;
      el.style.transition = 'none';
      el.style.transform = 'translateY(' + d + 'px)';
      el.classList.add('moving');
      moved.push(el);
    });
    if (!moved.length) return;
    void document.body.offsetHeight;
    moved.forEach(function (el) { el.style.transition = 'transform ' + FLIP_MS + 'ms ease'; el.style.transform = ''; });
    setTimeout(function () { moved.forEach(function (el) { el.style.transition = ''; el.classList.remove('moving'); }); }, FLIP_MS + 40);
  }
  // Avkrysning: flytt de eksisterende radene (samme elementer, så fokus og avkrysningsboksen beholdes) i stedet for å
  // tegne alt på nytt. Faller tilbake til full tegning hvis noe ikke stemmer.
  function reorderInPlace() {
    var built = buildList();
    if (ui.sort === 'kilde') { renderListSection(); return; }
    var shown = built.items.filter(visibleItem);
    var groups = groupItems(shown), ok = true, plan = [];
    groups.forEach(function (g) {
      var h = [].filter.call(main.querySelectorAll('h3.aisle'), function (e) { return e.textContent === aisleLabel(g.aisle); })[0];
      var ul = h && h.nextElementSibling;
      if (!ul || ul.children.length !== g.items.length) { ok = false; return; }
      var lis = g.items.map(function (i) {
        return [].filter.call(ul.children, function (li) { return li.getAttribute('data-key') === i.key; })[0];
      });
      if (lis.some(function (li) { return !li; })) { ok = false; return; }
      plan.push([ul, lis, g.items]);
    });
    if (!ok) { renderListSection(); return; }
    plan.forEach(function (p) {
      p[1].forEach(function (li, n) {
        var i = p[2][n];
        li.classList.toggle('checked', i.checked);
        var cb = li.querySelector('input[type=checkbox]');
        if (cb && cb.checked !== i.checked) cb.checked = i.checked;
        var note = li.querySelector('.src-note');
        if (note && i.checked) note.parentNode.removeChild(note);
        if (p[0].children[n] !== li) p[0].insertBefore(li, p[0].children[n] || null);
      });
    });
    var l = main.querySelector('[data-testid="igjen"]');
    if (l) l.textContent = shown.filter(isOpen).length + ' igjen';
    var ub = main.querySelector('[data-action="uncheck-all"]');
    if (ub) ub.hidden = !built.items.some(function (i) { return i.checked; });
  }
  // Dobbelttrykk: mens raden glir bort (og neste vare glir inn under fingeren) ignoreres et nytt trykk på nøyaktig
  // samme sted, så et utilsiktet dobbelttrykk verken krysser av feil vare eller fjerner avkrysningen igjen.
  // Alle andre trykk (andre steder, eller etter animasjonen) virker som normalt.
  var lastTick = null;

  // v0.11: hold inne på en vare = liten boble med rett(er) og behov, plassert over fingeren; borte når man slipper.
  var lp = { t: null, bubble: null };
  function lpClear() {
    if (lp.t) { clearTimeout(lp.t); lp.t = null; }
    if (lp.bubble) { lp.bubble.parentNode && lp.bubble.parentNode.removeChild(lp.bubble); lp.bubble = null; }
  }
  main.addEventListener('pointerdown', function (e) {
    var li = e.target.closest && e.target.closest('.item[data-key]');
    if (!li || e.target.closest('button, input, label.cb-hit')) return;
    var txt = li.querySelector('.item-text'), info = txt && txt.getAttribute('data-info');
    if (!info) return;
    lpClear();
    var x = e.clientX, y = e.clientY;
    lp.t = setTimeout(function () {
      lp.t = null;
      var bb = document.createElement('div');
      bb.className = 'lp-bubble'; bb.setAttribute('role', 'tooltip'); bb.setAttribute('data-testid', 'vare-boble');
      bb.textContent = info;
      document.body.appendChild(bb);
      var w = bb.offsetWidth, hgt = bb.offsetHeight;
      var left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2));
      bb.style.left = left + 'px'; bb.style.top = Math.max(8, y - hgt - 28) + 'px';   // over fingeren
      lp.bubble = bb;
    }, 450);
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'scroll'].forEach(function (ev) { (ev === 'scroll' ? window : main).addEventListener(ev, lpClear, ev === 'scroll' ? { passive: true } : undefined); });
  main.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.item .item-text')) e.preventDefault(); });

  // v0.11: Esc lukker dagsarket og ⋯-menyen på Uke
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !(ui.dayOpen || ui.weekMenu) || !main.querySelector('[data-page="uke"]')) return;
    var od = ui.dayOpen; ui.dayOpen = null; ui.weekMenu = false; renderUke();
    focusEl(od ? '[data-action="day-open"][data-date="' + od + '"]' : '[data-action="week-menu"]');
  });
  main.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'finn-q') { finn.q = t.value; renderFinnList(); return; }   // v0.11
    if (t.id === 'fv-q') {
      ui.fvQ = t.value;
      // Debounce-ish: tegn på nytt med en gang (liste er liten)
      var pos = t.selectionStart;
      renderFastePage();
      var n = document.getElementById('fv-q');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
    } else if (t.id === 'ai-name') {
      updateAddItemMatch();
    } else if (t.id === 'fv-new-qty') {
      var cq = main.querySelector('.fv-new'), vq = parseQty(t.value);
      if (cq && vq > 0) { cq.setAttribute('data-qty', String(round3(vq))); fvNewSync(cq); }
    }
  });
  main.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.fvOpenId && /^#liste\/faste/.test(location.hash || '')) {
      e.preventDefault();
      var id = ui.fvOpenId; fvCloseOpen(); renderFastePage();
      var rb = main.querySelector('.fv-item[data-id="' + id + '"]');
      if (rb) try { rb.focus({ preventScroll: true }); } catch (x) { rb.focus(); }
      return;
    }
    if (e.key === 'Enter' && e.target.id === 'fv-q') {
      e.preventDefault();
      var exact = findStapleByKey(e.target.value);
      if (exact) {
        ui.fvOpenId = exact.id; ui.fvOpenAisle = itemAisle(exact.name, exact.aisle); renderFastePage();
      } else if ((ui.fvQ || '').trim() && !exact) {
        var add = main.querySelector('[data-action="fv-add"]');
        if (add) add.click();
      }
    }
  });

  document.addEventListener('click', function (e) {
    var step = e.target.closest('[data-hs-step]');
    if (step && !main.contains(step)) {
      // samme logikk som i main – for ark på body
      e.preventDefault();
      var k = step.getAttribute('data-hs-k');
      var prefix = step.getAttribute('data-hs-prefix');
      var el = document.getElementById(prefix + '-' + k);
      if (!el) return;
      var n = parseInt(el.textContent, 10) || 0;
      n = Math.max(0, Math.min(12, n + parseInt(step.getAttribute('data-hs-step'), 10)));
      el.textContent = n; el.classList.toggle('zero', !n);
      if (prefix === 'hsd' && ui.hsDayDate) updateDaySheetResult(ui.hsDayDate);
      return;
    }
    var b2 = e.target.closest('[data-action]');
    if (b2 && !main.contains(b2) && /^(hs-ark-lukk|hs-dag-lagre|hs-dag-tom|hs-dag-reset)$/.test(b2.getAttribute('data-action') || '')) {
      // la main-handleren ikke treffe – kall samme via syntetisk
      e.preventDefault();
      var a2 = b2.getAttribute('data-action');
      if (a2 === 'hs-ark-lukk') closeOverlay();
      else if (a2 === 'hs-dag-lagre' || a2 === 'hs-dag-tom' || a2 === 'hs-dag-reset') {
        // trigger by dispatching on a temp path: reuse by setting btn context via click simulation on cloned logic
        var fake = b2;
        // inline minimal
        if (a2 === 'hs-ark-lukk') closeOverlay();
        else if (a2 === 'hs-dag-reset') {
          var dateR = fake.getAttribute('data-date');
          saveDayPeople(dateR, { voksen: 0, barn: 0, smabarn: 0 }, { toastMsg: dayLabel(dateR) + ' er tilbake til husstanden' });
        } else if (a2 === 'hs-dag-tom') {
          var dateT = fake.getAttribute('data-date');
          var curT = readCounters('hsd');
          var usualT = hsPeople();
          var deltaT = usualT ? { voksen: curT.voksen - (usualT.voksen||0), barn: curT.barn - (usualT.barn||0), smabarn: curT.smabarn - (usualT.smabarn||0) } : curT;
          clearDayToEmpty(dateT, dayDelta(dateT), deltaT);
        } else {
          var date = fake.getAttribute('data-date');
          var cur3 = readCounters('hsd');
          var usual = hsPeople();
          var delta = usual ? { voksen: cur3.voksen - (usual.voksen||0), barn: cur3.barn - (usual.barn||0), smabarn: cur3.smabarn - (usual.smabarn||0) } : cur3;
          var net = SC.netPeople(delta);
          var msg = dayLabel(date) + (net > 0 ? ': +' + net + ' til middag. Lista er oppdatert.' : net < 0 ? ': −' + Math.abs(net) + ' til middag. Lista er oppdatert.' : ' er endret. Lista er oppdatert.');
          saveDayPeople(date, delta, { toastMsg: msg });
        }
      }
      return;
    }
  });
  main.addEventListener('click', function (e) {
    var lab = e.target.closest && e.target.closest('.item label');
    if (!lab) return;
    var row = lab.closest('.item'), key = row.getAttribute('data-key');
    var now = Date.now();
    if (lastTick && row.classList.contains('moving') && now - lastTick.t < FLIP_MS && e.clientX && Math.abs(e.clientX - lastTick.x) < 12 && Math.abs(e.clientY - lastTick.y) < 12) {
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (e.clientX || e.clientY) lastTick = { t: now, x: e.clientX, y: e.clientY, key: key };   // ikke tastatur/syntetiske klikk
  }, true);

  // ---------- v0.7: siden «Faste varer» (#liste/faste) ----------
  function renderFastePage() {
    var week = LIST_KEY;   // v0.10: felles liste
    var adj = state.list_adjust[week] || {};
    var nOn = state.staples.filter(function (s) { return stapleChosen(s, week, adj); }).length;
    var q = ui.fvQ || '';
    var qn = normName(q), qk = stapleKey(q);
    var exact = qk ? findStapleByKey(q) : null;
    var filtered = !qn ? state.staples.slice() : state.staples.filter(function (s) {
      return normName(s.name).indexOf(qn) >= 0 || stapleKey(s.name).indexOf(qk) >= 0 || stapleKey(s.name) === qk;
    });
    // Mens en rad er åpen: hold den i avdelingen den ble åpnet i (selv om avdeling er byttet).
    function aisleOf(s) {
      if (ui.fvOpenId && s.id === ui.fvOpenId && ui.fvOpenAisle) return ui.fvOpenAisle;
      return itemAisle(s.name, s.aisle);
    }
    var groups = staplesGrouped(filtered, aisleOf);
    var h = '<section class="page fv-page" data-page="liste" data-testid="faste-side">';
    h += '<div class="fv-top"><a class="icon-btn" href="#liste" aria-label="Tilbake til lista" data-testid="faste-tilbake">‹</a>';
    h += '<div class="t"><h2>Faste varer</h2><span class="sub">' +
      (state.staples.length ? state.staples.length + (state.staples.length === 1 ? ' vare' : ' varer') + ' · i butikkens rekkefølge' : 'Ingen faste varer ennå') +
      '</span></div></div>';
    h += '<div class="fv-search">' + ICON_SEARCH +
      '<input type="search" id="fv-q" placeholder="Søk eller legg til …" aria-label="Søk eller legg til fast vare" value="' + esc(q) + '" autocomplete="off" data-testid="faste-sok"></div>';
    if (!state.staples.length && !qn) {
      h += '<div class="fv-empty" data-testid="faste-tom"><p class="lead">Her samler dere det huset kjøper igjen og igjen. Skriv det inn én gang.</p>' +
        '<p class="hint" style="margin:0">Avdeling og enhet gjettes fra navnet, for eksempel:</p>' +
        '<ul class="fv-ex" aria-label="Eksempler"><li><span>melk</span><span class="g">→ 1 l · Kjøl</span></li>' +
        '<li><span>bananer</span><span class="g">→ 1 stk · Frukt/grønt</span></li>' +
        '<li><span>dopapir</span><span class="g">→ 1 pk · Husholdning</span></li></ul>' +
        '<p class="hint" style="margin:2px 0 0">Dere velger selv hva som skal på lista. Ingenting kommer på av seg selv.</p></div>';
    } else {
      if (!qn) {
        var bridge = nOn
          ? (nOn + ' faste varer på lista')
          : ('Ingen faste varer på lista ennå');
        h += '<button type="button" class="fv-bridge" data-action="fast-open" data-testid="faste-bro">' +
          '<span class="t">' + esc(bridge) + '</span><span class="go" aria-hidden="true">' + (nOn ? 'Endre ›' : 'Velg ›') + '</span></button>';
      }
      if (qn && exact) {
        h += '<p class="fv-msg" data-testid="faste-finnes">«' + esc(cap(q)) + '» finnes allerede' +
          (normName(q) === normName(exact.name) ? '' : ' («' + esc(cap(exact.name)) + '» er samme vare)') +
          ', så det blir ingen ny. Trykk på den for å endre.</p>';
      } else if (qn && !exact) {
        var ga = guessAisle(q) || 'Tørrvare', gu = guessUnit(q, ga);
        h += '<p class="fv-hit">Ingen faste varer heter «' + esc(q) + '».</p>';
        h += '<div class="fv-new" data-testid="faste-ny" data-aisle="' + esc(ga) + '" data-unit="' + esc(gu) + '" data-qty="1">' +
          '<span class="nm">' + esc(cap(q)) + '</span>' +
          '<div class="guess">' +
          '<button type="button" class="g" data-action="fv-edit-guess" data-field="amt" data-testid="faste-ny-mengde"><span class="k">Mengde</span>1 ' + esc(gu) + '</button>' +
          '<button type="button" class="g" data-action="fv-edit-guess" data-field="aisle" data-testid="faste-ny-avdeling"><span class="k">Avdeling</span>' + esc(aisleLabel(ga)) + '</button>' +
          '</div><div class="fv-new-ed" id="fv-new-ed" hidden></div><span class="small">Gjettet fra navnet. Trykk for å endre.</span>' +
          '<div class="acts"><label class="check"><input type="checkbox" id="fv-on-list" data-testid="faste-ny-pa-lista">På lista</label>' +
          '<button type="button" class="btn primary" data-action="fv-add" data-testid="faste-legg-til">Legg til</button></div></div>';
        if (filtered.length) h += '<p class="fv-hit" style="margin-top:14px">' + filtered.length + ' faste varer passer.</p>';
      } else if (qn && filtered.length) {
        h += '<p class="fv-hit">' + filtered.length + ' faste varer passer.</p>';
      }
      groups.forEach(function (g) {
        h += '<h4 class="fv-group-h">' + esc(aisleLabel(g.aisle)) + '<span>' + g.items.length + '</span></h4><ul class="fv-rows">';
        g.items.forEach(function (s) {
          var open = ui.fvOpenId === s.id;
          var isExact = exact && exact.id === s.id;
          h += '<li class="' + (open ? 'open' : '') + (isExact ? ' dup' : '') + '" data-id="' + esc(s.id) + '">';
          h += '<button type="button" class="fv-item" data-action="fv-toggle" data-id="' + esc(s.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '" data-testid="faste-rad">' +
            '<span class="tx"><span class="nm">' + esc(cap(s.name)) + '</span> <span class="q">' + esc(stapleAmt(s)) + '</span>' +
            (isExact ? '<span class="fv-same">Finnes</span>' : '') + '</span>' +
            '<span class="pen" aria-hidden="true">' + ICON_PEN + '</span></button>';
          if (open) h += fvEditorHtml(s);
          h += '</li>';
        });
        h += '</ul>';
      });
    }
    h += '</section>';
    main.innerHTML = h;
    var inp = document.getElementById('fv-q');
    if (inp) {
      if (!state.staples.length && !qn) try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
      else if (ui.fvOpenId) {
        var ed = main.querySelector('.fv-editor .st-name');
        if (ed) try { ed.focus({ preventScroll: true }); } catch (e2) { ed.focus(); }
      }
    }
  }
  function fvEditorHtml(s) {
    var h = '<div class="fv-editor" data-testid="faste-rediger">' +
      '<p class="note">Lagres med en gang og gjelder alle uker.</p>' +
      '<div><label class="lbl" for="fv-name-' + esc(s.id) + '">Navn</label>' +
      '<input type="text" class="st-name" id="fv-name-' + esc(s.id) + '" value="' + esc(s.name) + '" aria-label="Navn" autocomplete="off" data-testid="faste-navn">' +
      '<p class="err" hidden data-testid="faste-navn-feil"></p></div>' +
      '<div><span class="lbl">Mengde</span><div class="fv-amt">' +
      '<button type="button" class="qbtn" data-action="fv-qty" data-dir="-1" aria-label="Mindre">−</button>' +
      '<input type="text" class="st-qty" inputmode="decimal" value="' + esc(formatQty(s.qty == null ? 1 : s.qty)) + '" aria-label="Mengde" data-testid="faste-mengde">' +
      '<button type="button" class="qbtn" data-action="fv-qty" data-dir="1" aria-label="Mer">+</button>' +
      '<select class="st-unit" aria-label="Enhet" data-testid="faste-enhet">' + unitOptions(s.unit || 'stk') + '</select></div></div>' +
      '<div><span class="lbl">Avdeling</span><div class="fv-chips" role="group" aria-label="Avdeling">';
    AISLES.forEach(function (a) {
      var on = itemAisle(s.name, s.aisle) === a;
      h += '<button type="button" class="fv-chip' + (on ? ' on' : '') + '" data-action="fv-aisle" data-aisle="' + esc(a) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(aisleLabel(a)) + '</button>';
    });
    h += '</div></div><div class="fv-ed-acts">' +
      '<button type="button" class="fv-del" data-action="fv-delete" data-testid="faste-slett">Slett vare</button>' +
      '<button type="button" class="btn primary" data-action="fv-done" data-testid="faste-ferdig">Ferdig</button></div></div>';
    return h;
  }
  function fvCloseOpen() {
    ui.fvOpenId = null; ui.fvOpenAisle = null;
  }
  function fvSaveField(id, fields) {
    var s = state.staples.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    if (fields.name != null) {
      var nm = String(fields.name).trim();
      if (!nm) { fields.name = s.name; }
      else {
        var dup = findStapleByKey(nm, id);
        if (dup) {
          var err = main.querySelector('.fv-editor .err');
          if (err) { err.hidden = false; err.textContent = cap(dup.name) + ' finnes allerede'; }
          var inp = main.querySelector('.fv-editor .st-name');
          if (inp) inp.value = s.name;
          return false;
        }
        fields.name = nm;
      }
    }
    if (fields.qty != null) fields.qty = parseQty(fields.qty);
    if (fields.aisle != null) fields.aisle = storeAisle(fields.name != null ? fields.name : s.name, fields.aisle);
    ops.updateStaple(s, fields);
    var err2 = main.querySelector('.fv-editor .err');
    if (err2) { err2.hidden = true; err2.textContent = ''; }
    return true;
  }

  function renderStaplesSection() { /* v0.7: fjernet – se renderFastePage */ }

  function copyText(text, okMsg) {
    okMsg = okMsg || 'Lista er kopiert';
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* ignorer */ }
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) toast(okMsg); else showCopyDialog(text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else {
      fallback();
    }
  }

  function showCopyDialog(text) {
    var old = document.getElementById('copy-dialog');
    if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div');
    d.id = 'copy-dialog';
    d.className = 'overlay';
    d.innerHTML = '<div class="sheet" role="dialog" aria-label="Kopier"><h3>Kopier</h3>' +
      '<p class="hint">Kopiering virket ikke automatisk. Merk teksten og kopier.</p>' +
      '<textarea readonly rows="12"></textarea><button type="button" class="btn primary" data-close>Lukk</button></div>';
    d.querySelector('textarea').value = text;
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.hasAttribute('data-close')) d.parentNode.removeChild(d);
    });
    document.body.appendChild(d);
    var ta = d.querySelector('textarea');
    ta.focus(); ta.select();
  }


  // v0.7 (Merkevare 3.4 / skjerm 4b): «＋ Legg til vare» gjenkjenner eksisterende fast vare.
  function updateAddItemMatch() {
    var form = document.getElementById('item-add'); if (!form) return;
    var nameEl = document.getElementById('ai-name'); if (!nameEl) return;
    var hit = findStapleByKey(nameEl.value);
    var old = form.querySelector('.ai-match'); if (old) old.parentNode.removeChild(old);
    var sub = form.querySelector('[type=submit]');
    if (hit) {
      form.classList.add('staple-match');
      var box = document.createElement('div');
      box.className = 'ai-match'; box.setAttribute('role', 'status'); box.setAttribute('data-testid', 'ai-fast-treff');
      box.innerHTML = '<span class="ok" aria-hidden="true">✓</span><span><b>' + esc(cap(hit.name)) + '</b> er en fast vare. Den legges på lista som fast vare.' +
        '<span class="m">' + esc(stapleAmt(hit) || '1') + ' · ' + esc(aisleLabel(itemAisle(hit.name, hit.aisle))) + '</span></span>';
      nameEl.insertAdjacentElement('afterend', box);
      if (sub) sub.textContent = 'Legg på lista';
    } else {
      form.classList.remove('staple-match');
      if (sub) sub.textContent = 'Legg til';
    }
  }

  /* ---------- v0.9: Første møte og eget hjem (merkevare/forste-mote) ---------- */
  var START_KEY = 'ukeshandel:startCard';   // 'open' = Kom i gang vises · 'closed' = × / Ikke nå · 'done' = invitasjonen er sendt
  var INSTALL_KEY = 'ukeshandel:install';   // { shown, last, done, seen, connectSkip } – hjemskjerm-kortet (§6)
  var MOVED_KEY = 'ukeshandel:moved';       // bare på den gamle adressen: '1' = flyttet, send rett videre (§7)
  // Den gamle adressen (mariuskfoss.github.io/handleliste) viser flyttesiden. KNAGGEN_NEW_HOME kan settes for test.
  // Testkrok (som KNAGGEN_NEW_HOME): eldre testsuiter kjører uten introsiden, se tests/v09compat.js
  var SKIP_INTRO = !!window.KNAGGEN_SKIP_INTRO;
  var NEW_HOME = window.KNAGGEN_NEW_HOME || (location.hostname === 'mariuskfoss.github.io' ? 'https://app.knaggen.no/' : null);
  var PUBLIC_HOST = 'app.knaggen.no';
  var INVITE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
  var DAY_MS = 864e5;
  var SVG0 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var IC = {
    check: SVG0 + '><path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="3"/></svg>',
    msg: SVG0 + ' class="ico-in"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/></svg>',
    copy: SVG0 + ' class="ico-in"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/></svg>',
    paste: SVG0 + ' class="ico-in"><rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75v.75M9 11h6M9 15h4"/></svg>',
    uke: SVG0 + '><rect x="3.75" y="5.25" width="16.5" height="15" rx="3.5"/><path d="M3.75 10.25H20.25M8.5 3.25V6.75M15.5 3.25V6.75"/><circle class="ball" fill="currentColor" cx="15.25" cy="15.25" r="2.1" stroke="none"/></svg>',
    liste: SVG0 + '><path d="M10 6.5H20M10 12H20M10 17.5H16.5"/><circle class="ball" fill="currentColor" cx="5" cy="6.5" r="2.1" stroke="none"/><circle cx="5" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="5" cy="17.5" r="1.9" fill="currentColor" stroke="none"/></svg>',
    felles: SVG0 + '><circle cx="9" cy="8" r="3.25"/><path d="M3 20c0-3.4 2.7-5.75 6-5.75s6 2.35 6 5.75"/><circle class="ball" cx="17.5" cy="9" r="2.1" fill="currentColor" stroke="none"/><path d="M16.5 14.4c2.6.3 4.5 2.4 4.5 5.6"/></svg>',
    del: SVG0 + '><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>',
    plus: SVG0 + '><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    meny: SVG0 + '><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
    phone: SVG0 + '><rect x="6.5" y="2.75" width="11" height="18.5" rx="2.75"/><path d="M10.5 17.75h3"/></svg>'
  };
  var ICON_IMG = '<picture><source srcset="icons/favicon.svg" media="(prefers-color-scheme: light)"><img src="icons/icon-192-mork.png" alt="" width="48" height="48"></picture>';

  // Plattform (§6). Ingen sniffing brukes til noe sikkerhetsmessig – bare til hvilken veiledning som vises.
  var envInfo = (function () {
    var ua = navigator.userAgent || '';
    var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var ios = ipad || /iPhone|iPod/.test(ua);
    var android = /Android/.test(ua);
    var inapp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Snapchat|musical_ly|BytedanceWebview|Line\/|MicroMessenger|; wv\)/.test(ua);
    var app = /Messenger|Orca-Android|MESSENGER/.test(ua) ? 'Messenger' : /Instagram/.test(ua) ? 'Instagram' : /Snapchat/.test(ua) ? 'Snapchat'
      : /FBAN|FBAV|FB_IAB|FBIOS/.test(ua) ? 'Facebook' : /musical_ly|Bytedance/.test(ua) ? 'TikTok' : '';
    var iosOther = ios && /CriOS|EdgiOS|FxiOS|OPiOS/.test(ua);
    return { ios: ios, ipad: ipad, android: android, inapp: inapp, app: app, iosOther: iosOther, phone: ios || android };
  })();
  function isStandalone() {
    try {
      return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
    } catch (e) { return false; }
  }
  function canShareText() { return !!(navigator.share && envInfo.phone); }
  function fmtCode(c) { return c ? c.slice(0, 4) + '-' + c.slice(4) : ''; }
  // Innskriving: små bokstaver, mellomrom og bindestrek godtas (§5)
  function normCode(s) {
    var c = String(s || '').toUpperCase().replace(/[\s\-\u2010-\u2015_.·]/g, '');
    return INVITE_RE.test(c) ? c : null;
  }
  function dm(ms) { var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function homeBase() { return NEW_HOME || location.href.split('#')[0].split('?')[0]; }
  function inviteLink(inv) { return inv && inv.code ? homeBase() + '#inn=' + inv.code : shareLink(); }
  function inviteMessage(inv) {
    if (!inv || !inv.code) return 'Bli med i husstanden vår på Knaggen, så har vi felles middager og handleliste: ' + shareLink();
    return 'Bli med i husstanden vår på Knaggen, så har vi felles middager og handleliste: ' + inviteLink(inv) +
      ' Koden er ' + fmtCode(inv.code) + ' og gjelder til ' + dm(inv.expires_at);
  }
  function validInvite() {
    var inv = ui.invite || (hh && hh.invite) || null;
    return inv && inv.code && inv.expires_at > Date.now() + 60000 ? inv : null;
  }
  function setInvite(inv, mine) {
    ui.invite = inv;
    if (!hh) return;
    var cur = readHH() || {};
    if (cur.hid !== hh.hid) return;
    hh.invite = inv;
    var changed = JSON.stringify(cur.invite || null) !== JSON.stringify(inv || null);
    if (changed) { if (inv) cur.invite = inv; else delete cur.invite; }   // ingen ny nøkkel for husstander uten kode
    if (mine && !cur.invited) { cur.invited = hh.invited = true; cur.inviteBase = hh.inviteBase = Math.max(1, ui.members || 1); changed = true; }
    if (changed) writeHH(cur);
  }
  function inviteErrText(e) {
    var m = (e && (e.code || e.message)) || '';
    if (/no-server|unavailable|network|timeout|deadline|dynamically imported module|Importing a module script failed/i.test(m) || !navigator.onLine) return 'Får ikke kontakt. Invitasjonen lages når du har nett.';
    return errorText(e);
  }

  /* --- Husstand og kode (lages først ved Inviter, iPhone-installasjon og flytting – aldri for alle besøkende) --- */
  var ensureHHp = null;
  function ensureHousehold() {
    if (hh) return (syncReady || Promise.resolve()).then(function () { return hh; });
    if (ensureHHp) return ensureHHp;
    if (!syncMode()) return Promise.reject(new Error('not-configured'));
    var raw = lsGet(STORAGE_KEY);
    if (raw && !lsGet(STORAGE_KEY + ':backup-before-household')) lsSet(STORAGE_KEY + ':backup-before-household', raw);
    var snapshot = JSON.parse(JSON.stringify(state));
    ui.movedOwn = hasOwnData();
    ensureHHp = Sync.init().then(function () { return createFromLocal(false); }).then(function (v) {
      ensureHHp = null;
      enterHousehold(readHH() || { hid: v.hid, secret: v.secret, core_done: true, migrated: true }, snapshot);
      return syncReady.then(function () { return hh; });
    }, function (e) {
      ensureHHp = null;
      var cur = readHH();
      if (cur && !cur.core_done) { try { localStorage.removeItem(HH_KEY); } catch (x) { /* ignorer */ } }
      throw e;
    });
    return ensureHHp;
  }
  // Én aktiv kode per husstand. Finnes det en som gjelder minst et døgn til, brukes den. Ellers lages en ny (den gamle
  // slettes i samme batch). Mangler reglene for koder (eldre regler), brukes den varige lenka i stedet.
  function ensureInvite(forceNew) {
    return ensureHousehold().then(function () {
      var cur = validInvite();
      if (!forceNew && cur && cur.expires_at - Date.now() > DAY_MS) return cur;
      var old = ui.invite || (hh && hh.invite);
      return Sync.createInvite(hh.hid, hh.secret, old && old.code).then(function (inv) {
        setInvite(inv, true);
        return inv;
      }, function (e) {
        if (e && e.code === 'permission-denied') { setInvite(ui.invite || null, true); return { code: null }; }
        throw e;
      });
    });
  }

  /* --- Kom i gang (§4): velkomst v0.6.2 + husstandskort v0.8 + delingskort v0.4.6 i ett kort --- */
  function showStart() {
    var s = lsGet(START_KEY);
    if (s === 'closed' || s === 'done') return false;
    if (s === 'open') {
      if (hh && (ui.members || 0) > 1) { lsSet(START_KEY, 'done'); return false; }
      return true;
    }
    if (NEW_HOME || hh || ui.welcomeClosed || lsGet(WELCOME_KEY) === '1') return false;
    // Som velkomstkortet i v0.6.2: bare for en ny telefon uten middager og uten egne data
    if (hasPlan() || hasOwnData()) return false;
    if (hsAsked() && hadLocalData) return false;
    lsSet(START_KEY, 'open');
    ui.welcomeShown = true;
    return true;
  }
  function weekCount(dates) {
    return dates.filter(function (d) { return !!state.oneoffs[d] || !!(state.week_plan[d] && recipeById(state.week_plan[d])); }).length;
  }
  // v0.11: steg 0 «Velg 5–10 retter familien liker» når husstanden har 0 retter (kan hoppes over)
  var FINN_SKIP_KEY = 'ukeshandel:finnHoppet';
  function needRecipesStep() { return !state.recipes.length && lsGet(FINN_SKIP_KEY) !== '1'; }
  function startSteps(dates) {
    var n = weekCount(dates);
    var s0 = !needRecipesStep(), s1 = n > 0, s2 = hsAsked(), s3 = lsGet(START_KEY) === 'done' || (hh && (ui.members || 0) > 1);
    var active = !s0 ? 4 : !s1 ? 1 : !s2 ? 2 : !s3 ? 3 : 0;
    return { n: n, s0: s0, s1: s1, s2: s2, s3: s3, active: active };
  }
  function recipesStepBody() {
    var lim = weekdayLimit();
    return '<p>Scroll gjennom lista og trykk + på det dere spiser. Ett trykk per rett.</p>' +
      '<p class="m" id="km-lim-q">Hvor lang tid har dere på hverdager? (valgfritt)</p>' +
      '<div class="v11-chips km-lim" role="group" aria-labelledby="km-lim-q">' + [[0, 'Ingen grense'], [20, 'Under 20 min'], [30, 'Under 30 min'], [45, 'Under 45 min']].map(function (x) {
        var on = (lim || 0) === x[0];
        return '<button type="button" class="fv-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-action="km-limit" data-val="' + x[0] + '" data-testid="km-grense">' + (on ? '✓ ' : '') + x[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="km-acts"><a class="btn primary" href="#retter/finn" data-testid="km-finn">Finn retter</a>' +
      '<button type="button" class="btn ghost" data-action="km-finn-hopp" data-testid="km-finn-hopp">Hopp over</button></div>';
  }
  function listCount() {
    try { return buildList(true).items.length; } catch (e) { return 0; }
  }
  function startCardHtml(dates) {
    var st = startSteps(dates);
    if (!SKIP_INTRO) return startCardCompact(st);
    var h = '<section class="km" aria-labelledby="km-t" data-testid="kom-i-gang">' +
      '<p class="km-t" id="km-t">Velg middager for uka, så lager handlelista seg selv.</p>' +
      '<p class="km-tag">Husets felles huskeliste</p>' +
      '<button type="button" class="km-x" data-action="km-close" data-testid="kom-i-gang-lukk" aria-label="Lukk Kom i gang">×</button>' +
      '<ol class="km-steps" aria-label="Kom i gang, tre steg">';
    var done = '<span class="n">' + IC.check + '</span>';
    if (!st.s0) h += '<li class="on" data-step="0"><span class="n">0</span><span class="h">Velg 5–10 retter familien liker</span><div class="km-body">' + recipesStepBody() + '</div></li>';
    // 1 Velg middager
    if (st.s1) {
      h += '<li class="done" data-step="1">' + done + '<span class="h"><span class="sr">ferdig: </span>' +
        (st.n === 1 ? '1 middag valgt' : st.n + ' middager valgt <span class="s">· bytt gjerne en kveld</span>') + '</span></li>';
    } else if (!st.s0) {
      h += '<li class="todo" data-step="1"><span class="n">1</span><span class="h">Velg middager</span></li>';
    } else {
      h += '<li class="on" data-step="1"><span class="n">1</span><span class="h">Velg middager</span><div class="km-body">' +
        '<p>Trykk på en dag under, eller fyll hverdagene med raske retter. Du kan bytte etterpå.</p>' +
        '<div class="km-acts"><button type="button" class="btn primary" data-action="fill-weekdays" data-testid="fyll">Fyll man–fre</button></div></div></li>';
    }
    // 2 Lista lager seg selv
    if (st.s2) {
      var p = hsPeople(), nItems = listCount();
      h += '<li class="done" data-step="2">' + done + '<span class="h"><span class="sr">ferdig: </span>Lista: ' + nItems + (nItems === 1 ? ' vare' : ' varer') +
        (p && hsScaleOn() ? ' for ' + esc(SC.peopleText(p, true)) : ' <span class="s">· mengder som i oppskriftene</span>') +
        ' <a href="#liste" data-testid="km-se-lista">Se lista ›</a></span></li>';
    } else if (st.active === 2) {
      var ni = listCount();
      h += '<li class="on" data-step="2"><span class="n">2</span><span class="h">Lista lager seg selv</span><div class="km-body">' +
        '<p>' + ni + (ni === 1 ? ' vare ligger klar.' : ' varer ligger klare.') + ' <b>Hvor mange spiser middag hos dere?</b></p>' +
        '<p class="m">Da passer mengdene i rettene fra Knaggen. Egne retter endres ikke.</p>' +
        peopleCountersHtml('hs0', { voksen: 2, barn: 2, smabarn: 0 }) +
        '<div class="km-acts"><button type="button" class="btn primary" data-action="hs-bruk" data-testid="hs-bruk">Bruk</button>' +
        '<button type="button" class="btn ghost" data-action="hs-hopp" data-testid="hs-hopp">Hopp over</button></div></div></li>';
    } else {
      h += '<li class="todo" data-step="2"><span class="n">2</span><span class="h">Lista lager seg selv</span></li>';
    }
    // 3 Del med den andre
    if (st.active === 3) {
      h += '<li class="on" data-step="3"><span class="n">3</span><span class="h">Del med den andre</span><div class="km-body">' +
        '<p>Handler dere sammen? Send en invitasjon på melding, så ser dere samme uke og liste. Ingen konto.</p>' +
        (ui.kmError ? '<p class="form-error" data-testid="km-feil">' + esc(ui.kmError) + '</p>' : '') +
        '<div class="km-acts"><button type="button" class="btn primary" data-action="km-invite" data-testid="km-inviter">' + (ui.kmError ? 'Prøv igjen' : 'Inviter med melding') + '</button>' +
        '<button type="button" class="btn ghost" data-action="km-later" data-testid="km-ikke-na">Ikke nå</button></div></div></li>';
    } else {
      h += '<li class="todo" data-step="3"><span class="n">3</span><span class="h">Del med den andre</span></li>';
    }
    return h + '</ol></section>';
  }
  // v0.9 endring (spec linje ~193): introsiden har allerede vist taglinen og spurt om husstanden, så kortet i Uke
  // viser bare det som gjenstår: «Velg middager» (til en middag er valgt) og «Del med den andre». Nummereres 1, 2 …
  function startCardCompact(st) {
    var steps = [];
    if (!st.s0) steps.push(['0', 'on', 'Velg 5–10 retter familien liker', recipesStepBody()]);
    if (!st.s1) steps.push(['1', st.s0 ? 'on' : 'todo', 'Velg middager', '<p>Trykk på en dag under' + (state.recipes.length ? ', eller fyll hverdagene med raske retter' : '') + '. Du kan bytte etterpå.</p>' +
      (state.recipes.length ? '<div class="km-acts"><button type="button" class="btn primary" data-action="fill-weekdays" data-testid="fyll">Fyll man–fre</button></div>' : '')]);
    if (!st.s2) {
      // reserve: husstanden er ikke besvart (introsiden ble ikke vist) – samme steg som før
      var ni = listCount();
      steps.push(['2', st.active === 2 ? 'on' : 'todo', 'Lista lager seg selv', '<p>' + ni + (ni === 1 ? ' vare ligger klar.' : ' varer ligger klare.') + ' <b>Hvor mange spiser middag hos dere?</b></p>' +
        '<p class="m">Da passer mengdene i rettene fra Knaggen. Egne retter endres ikke.</p>' +
        peopleCountersHtml('hs0', { voksen: 2, barn: 2, smabarn: 0 }) +
        '<div class="km-acts"><button type="button" class="btn primary" data-action="hs-bruk" data-testid="hs-bruk">Bruk</button>' +
        '<button type="button" class="btn ghost" data-action="hs-hopp" data-testid="hs-hopp">Hopp over</button></div>']);
    }
    steps.push(['3', st.active === 3 ? 'on' : 'todo', 'Del med den andre', '<p>Handler dere sammen? Send en invitasjon på melding, så ser dere samme uke og liste. Ingen konto.</p>' +
      (ui.kmError ? '<p class="form-error" data-testid="km-feil">' + esc(ui.kmError) + '</p>' : '') +
      '<div class="km-acts"><button type="button" class="btn primary" data-action="km-invite" data-testid="km-inviter">' + (ui.kmError ? 'Prøv igjen' : 'Inviter med melding') + '</button>' +
      '<button type="button" class="btn ghost" data-action="km-later" data-testid="km-ikke-na">Ikke nå</button></div>']);
    var words = ['', 'ett steg', 'to steg', 'tre steg', 'fire steg'];
    var h = '<section class="km km-compact" aria-labelledby="km-t" data-testid="kom-i-gang">' +
      '<p class="km-t" id="km-t">' + (!st.s0 ? 'Først: finn rettene familien liker.' : st.s1 ? 'Neste: del uka og lista.' : 'Velg middager for uka, så lager handlelista seg selv.') + '</p>' +
      '<button type="button" class="km-x" data-action="km-close" data-testid="kom-i-gang-lukk" aria-label="Lukk Kom i gang">×</button>' +
      '<ol class="km-steps" aria-label="Kom i gang, ' + words[steps.length] + ' igjen">';
    steps.forEach(function (s, i) {
      h += '<li class="' + s[1] + '" data-step="' + s[0] + '"><span class="n">' + (i + 1) + '</span><span class="h">' + s[2] + '</span>' +
        (s[1] === 'on' ? '<div class="km-body">' + s[3] + '</div>' : '') + '</li>';
    });
    return h + '</ol></section>';
  }

  /* --- Introsiden (v0.9 endring): én skjerm for nye besøkende før Uke --- */
  function showIntro() {
    if (SKIP_INTRO || NEW_HOME || hh || hsAsked()) return false;
    if (envInfo.ios && isStandalone()) return false;   // iPhone fra Hjem-skjerm: Koble til først, ingen intro (spec)
    return showStart();
  }
  function renderIntro() {
    setTabsHidden(true);
    document.body.classList.add('v9-intro');
    var h = '<section class="page intro" data-page="intro" aria-labelledby="intro-h">' +
      '<div class="intro-top"><button type="button" class="linkbtn intro-skip" data-action="intro-hopp" data-testid="intro-hopp">Hopp over</button></div>' +
      '<h1 class="intro-lockup" id="intro-h"><picture><source srcset="icons/knaggen-lockup-lys.svg" media="(prefers-color-scheme: light)">' +
        '<img src="icons/knaggen-lockup-mork.svg" alt="Knaggen" width="176" height="48"></picture></h1>' +
      '<p class="intro-tag">Husets felles huskeliste</p>' +
      (ui.introNotice ? '<p class="notice" role="status" data-testid="intro-melding">' + esc(ui.introNotice) + '</p>' : '') +
      '<ol class="intro-lines" data-testid="intro-linjer">' +
        '<li><span class="n">1</span>Velg middager for uka.</li>' +
        '<li><span class="n">2</span>Handlelista lager seg selv.</li>' +
        '<li><span class="n">3</span>Del med den andre. Ingen konto.</li></ol>' +
      '<div class="intro-hs" role="group" aria-labelledby="intro-q">' +
        '<h2 class="intro-q" id="intro-q">Hvor mange spiser middag hos dere?</h2>' +
        '<p class="m">Da passer mengdene i rettene fra Knaggen.</p>' +
        peopleCountersHtml('in0', { voksen: 2, barn: 2, smabarn: 0 }, { testid: 'intro-folk' }) +
      '</div>' +
      '<div class="intro-acts">' +
        '<button type="button" class="btn primary wide" data-action="intro-start" data-testid="intro-kom-i-gang">Kom i gang</button>' +
        '<a class="btn wide" href="#koble/intro" data-testid="intro-invitasjon">Jeg har en invitasjon</a>' +
      '</div></section>';
    main.innerHTML = h;
  }
  function introDone(people) {
    ui.introNotice = '';
    if (people) saveHouseholdSize({ people: people, scale: true, asked: true });
    else saveHouseholdSize({ people: null, scale: true, asked: true }, { toast: false });
    document.body.classList.remove('v9-intro');
    if ((location.hash || '').replace(/^#/, '') === 'uke') route(); else location.hash = '#uke';
    focusEl('[data-testid="kom-i-gang"] [data-testid="fyll"]', '#main');
  }

  function closeStart() {
    var prevHs = JSON.parse(JSON.stringify(hsState())), prevAskedLs = lsGet(HS_ASKED_KEY), skipped = false;
    if (!hsAsked()) {
      // × før steg 2 er besvart = Hopp over (v0.8: asked = true, people = null)
      skipped = true;
      state.household_size = { people: null, scale: prevHs.scale !== false, asked: true };
      lsSet(HS_ASKED_KEY, '1'); save();
      remote(function (w, hid) { return w.setHouseholdSettings(hid, state.household_size); });
    }
    lsSet(START_KEY, 'closed');
    renderUke();
    focusEl(".week-tools [data-testid=\"fyll\"]:not([disabled])", ".week-nav [data-action=\"week-next\"]");
    toast('Husstand og invitasjon finner du under Retter → Husstand', UNDO_MS, { label: 'Angre', run: function () {
      lsSet(START_KEY, 'open');
      if (skipped) {
        state.household_size = prevHs;
        if (prevAskedLs == null) { try { localStorage.removeItem(HS_ASKED_KEY); } catch (e) { /* ignorer */ } }
        save();
        remote(function (w, hid) { return w.setHouseholdSettings(hid, state.household_size); });
      }
      if (main.querySelector('[data-page="uke"]')) renderUke(); else route();
    } });
  }

  /* --- Ark (Inviter, iPhone, Android) – samme mønster som v0.8-arket: role=dialog, fokus på første knapp, Esc lukker --- */
  function openV9Sheet(id, inner, onClose) {
    closeV9Sheet(false);
    var ov = document.createElement('div');
    ov.className = 'overlay v9-overlay';
    ov.id = id;
    ov.innerHTML = '<div class="sheet v9-sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '-h">' + inner + '</div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) { closeV9Sheet(true); return; }
      var b = e.target.closest('[data-v9]');
      if (b) v9SheetAction(b.getAttribute('data-v9'), b);
    });
    ov._onClose = onClose || null;
    ov._back = document.activeElement;
    document.body.appendChild(ov);
    var f = ov.querySelector('.btn.primary:not([disabled])') || ov.querySelector('button');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    return ov;
  }
  function v9Sheet() { return document.querySelector('body > .v9-overlay'); }
  function closeV9Sheet(user) {
    var ov = v9Sheet();
    if (!ov) return;
    var cb = ov._onClose, back = ov._back;
    ov.parentNode.removeChild(ov);
    if (cb) cb(!!user);
    if (back && document.body.contains(back)) try { back.focus({ preventScroll: true }); } catch (e) { /* ignorer */ }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && v9Sheet()) { e.preventDefault(); closeV9Sheet(true); }
  }, true);

  /* --- v0.10 (spec punkt 5): egen bekreftelsesdialog i Knaggen-stil (erstatter nettleserens bekreftelsesboks overalt) ---
   * o: { id, title, text, ok, cancel, danger, typeWord, choices:[{ v, label, sub, primary }] }. Løses med true/false
   * (eller valgt choice.v / null). Lukkes med Avbryt, ✕, Esc, trykk utenfor eller telefonens tilbake-knapp (historikk). */
  var askOpen = null;
  function ask(o) {
    if (askOpen) askOpen.finish(null, true);
    return new Promise(function (resolve) {
      var id = o.id || 'bekreft';
      var h = '<div class="sheet-head"><h3 id="' + id + '-h">' + esc(o.title) + '</h3>' +
        '<button type="button" class="icon-btn" data-ask="cancel" aria-label="Lukk">✕</button></div>';
      if (o.text) h += '<p class="ask-text" id="' + id + '-t">' + esc(o.text) + '</p>';
      if (o.typeWord) h += '<label class="field ask-type"><span>Skriv ' + esc(o.typeWord) + ' for å bekrefte</span>' +
        '<input type="text" id="' + id + '-in" autocomplete="off" autocapitalize="characters" spellcheck="false" data-testid="' + id + '-felt"></label>';
      if (o.choices) {
        h += '<ul class="hs-group ask-choices">' + o.choices.map(function (c) {
          return '<li><button type="button" class="hs-row" data-ask="choice" data-v="' + esc(c.v) + '" data-testid="' + id + '-' + esc(c.v) + '">' +
            '<span class="t"><b>' + esc(c.label) + '</b>' + (c.sub ? '<span>' + esc(c.sub) + '</span>' : '') + '</span><span class="go" aria-hidden="true">›</span></button></li>';
        }).join('') + '</ul>';
        h += '<div class="ask-acts"><button type="button" class="btn" data-ask="cancel" data-testid="' + id + '-avbryt">' + esc(o.cancel || 'Avbryt') + '</button></div>';
      } else {
        h += '<div class="ask-acts"><button type="button" class="btn" data-ask="cancel" data-testid="' + id + '-avbryt">' + esc(o.cancel || 'Avbryt') + '</button>' +
          '<button type="button" class="btn ' + (o.danger ? 'danger-solid' : 'primary') + '" data-ask="ok" data-testid="' + id + '-ok"' + (o.typeWord ? ' disabled' : '') + '>' + esc(o.ok || 'OK') + '</button></div>';
      }
      var ov = document.createElement('div');
      ov.className = 'overlay ask-overlay';
      ov.id = id;
      ov.innerHTML = '<div class="sheet ask-sheet" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '-h"' + (o.text ? ' aria-describedby="' + id + '-t"' : '') + ' data-testid="' + id + '">' + h + '</div>';
      var back = document.activeElement, pushed = false, done = false;
      function finish(v, viaHistory) {
        if (done) return;
        done = true; askOpen = null;
        window.removeEventListener('popstate', onPop);
        document.removeEventListener('keydown', onKey, true);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        if (pushed && !viaHistory) { ignorePop = true; history.back(); }
        if (back && document.body.contains(back)) try { back.focus({ preventScroll: true }); } catch (e) { /* ignorer */ }
        resolve(v);
      }
      function onPop() { finish(o.choices ? null : false, true); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(o.choices ? null : false); return; }
        if (e.key === 'Tab') trapTab(ov, e);
        if (e.key === 'Enter' && o.typeWord && e.target.id === id + '-in') { e.preventDefault(); var b = ov.querySelector('[data-ask="ok"]'); if (b && !b.disabled) b.click(); }
      }
      ov.addEventListener('click', function (e) {
        if (e.target === ov) { finish(o.choices ? null : false); return; }
        var b = e.target.closest('[data-ask]');
        if (!b || b.disabled) return;
        var a = b.getAttribute('data-ask');
        if (a === 'cancel') finish(o.choices ? null : false);
        else if (a === 'ok') finish(true);
        else if (a === 'choice') finish(b.getAttribute('data-v'));
      });
      ov.addEventListener('input', function (e) {
        if (!o.typeWord || e.target.id !== id + '-in') return;
        ov.querySelector('[data-ask="ok"]').disabled = e.target.value.trim().toUpperCase() !== o.typeWord;
      });
      document.body.appendChild(ov);
      try { history.pushState({ knaggenAsk: 1 }, '', location.href); pushed = true; } catch (e) { pushed = false; }
      window.addEventListener('popstate', onPop);
      document.addEventListener('keydown', onKey, true);
      askOpen = { finish: finish };
      var f = o.typeWord ? ov.querySelector('#' + id + '-in') : (ov.querySelector('[data-ask="choice"]') || ov.querySelector('[data-ask="cancel"].btn'));
      if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    });
  }
  var ignorePop = false;
  window.addEventListener('popstate', function () { if (ignorePop) { ignorePop = false; } });

  /* --- Inviter-arket (4) --- */
  var invSheet = { shared: false, inv: null, error: '' };
  function openInviteSheet() {
    invSheet = { shared: false, inv: null, error: '', creating: !hh };
    openV9Sheet('inv', inviteSheetHtml(), function () {
      // Lukket med ✕ / Esc / utenfor: steg 3 regnes som gjort bare hvis meldingen eller lenka faktisk er sendt/kopiert
      if (invSheet.shared) finishInvite();
      else if (main.querySelector('[data-page="uke"]')) renderUke();   // f.eks. «Prøv igjen» i steg 3 etter feil
    });
    runInvite();
  }
  function runInvite() {
    invSheet.error = '';
    updateInviteSheet();
    ensureInvite(false).then(function (inv) {
      invSheet.inv = inv; invSheet.creating = false;
      ui.kmError = '';
      updateInviteSheet();
    }, function (e) {
      // En nettleser husker at Firebase-filene ikke kunne lastes (uten nett første gang). Da må siden lastes på nytt.
      invSheet.reload = /dynamically imported module|Importing a module script failed|error loading dynamically/i.test((e && e.message) || '');
      invSheet.error = inviteErrText(e); invSheet.creating = false;
      ui.kmError = invSheet.error;
      updateInviteSheet();
    });
  }
  function inviteSheetHtml() {
    var s = invSheet, inv = s.inv;
    var h = '<div class="sheet-head"><div><h3 id="inv-h">Inviter den andre voksne</h3>' +
      (inv ? '<span class="sub">Husstanden er laget · ingen konto</span>' : '') + '</div>' +
      '<button type="button" class="icon-btn" data-v9="close" aria-label="Lukk">✕</button></div>';
    if (s.error) {
      return h + '<p class="form-error" role="alert" data-testid="inv-feil">' + esc(s.error) + '</p>' +
        '<div class="inv-acts"><button type="button" class="btn primary" data-v9="retry" data-testid="inv-prov-igjen">Prøv igjen</button></div>';
    }
    if (!inv) return h + '<p class="inv-wait" role="status" data-testid="inv-venter">' + (s.creating ? 'Lager husstanden …' : 'Lager koden …') + '</p>';
    h += '<p class="inv-lab">Meldingen</p><p class="inv-msg" data-testid="inv-melding">' + esc(inviteMessage(inv)).replace(esc(inviteLink(inv)), '<span class="l">' + esc(inviteLink(inv)) + '</span>') + '</p>';
    if (inv.code) h += '<div class="code"><span><b data-testid="inv-kode">' + fmtCode(inv.code) + '</b><br><span class="sub">Koden kan skrives inn på ' + PUBLIC_HOST + '</span></span></div>';
    h += '<div class="inv-acts"><button type="button" class="btn primary" data-v9="share" data-testid="inv-send">' + IC.msg + (canShareText() ? 'Send med melding' : 'Kopier meldingen') + '</button>' +
      '<div class="row"><button type="button" class="btn" data-v9="copylink" data-testid="inv-kopier-lenke">' + IC.copy + 'Kopier lenke</button>' +
      '<button type="button" class="btn" data-v9="done" data-testid="inv-ferdig">Ferdig</button></div></div>' +
      (s.ok ? '<p class="copied inv-ok" role="status" data-testid="inv-ok">' + IC.check + '<span>' + esc(s.ok) + '</span></p>' : '') +
      '<p class="inv-note">Alle med lenka eller koden kan bli med mens den gjelder. Send den bare til den du handler med.</p>';
    return h;
  }
  function updateInviteSheet() {
    var ov = document.getElementById('inv');
    if (!ov) return;
    var sh = ov.querySelector('.sheet');
    var hadFocus = sh.contains(document.activeElement) ? document.activeElement.getAttribute('data-v9') : null;
    sh.innerHTML = inviteSheetHtml();
    var f = (hadFocus && sh.querySelector('[data-v9="' + hadFocus + '"]')) || sh.querySelector('.btn.primary') || sh.querySelector('button');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }
  function finishInvite() {
    if (lsGet(START_KEY) === 'open') lsSet(START_KEY, 'done');
    ui.installMoment = ui.installMoment || 'A';
    if (main.querySelector('[data-page="uke"]')) renderUke(); else if (!isFormRoute()) route();
  }
  // Delingsmenyen åpnes på et eget trykk (Safari/Chrome krever et ferskt trykk). Lenka står i teksten, ikke som url.
  function shareInvite(inv, after) {
    var text = inviteMessage(inv);
    function copied() { copyQuiet(text, function (ok) { toast(ok ? 'Meldingen er kopiert. Lim den inn i en melding.' : 'Kunne ikke kopiere'); if (ok && after) after('Meldingen er kopiert. Lim den inn i en melding.'); }); }
    if (canShareText()) {
      navigator.share({ text: text }).then(function () { if (after) after(''); }, function (e) {
        if (e && e.name === 'AbortError') return;
        copied();
      });
    } else copied();
  }
  function copyQuiet(text, cb) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      cb(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { cb(true); }, fallback);
    else fallback();
  }
  function v9SheetAction(a, btn) {
    if (a === 'nytt-lukk') { closeV9Sheet(true); return; }   // v0.16
    if (a === 'close') { closeV9Sheet(true); return; }
    if (a === 'retry') { if (invSheet.reload) { location.reload(); return; } runInvite(); return; }
    if (a === 'share' && invSheet.inv) {
      shareInvite(invSheet.inv, function (msg) { invSheet.shared = true; if (msg) { invSheet.ok = msg; updateInviteSheet(); } });
      return;
    }
    if (a === 'copylink' && invSheet.inv) {
      copyQuiet(inviteLink(invSheet.inv), function (ok) {
        if (ok) { invSheet.shared = true; invSheet.ok = 'Lenka er kopiert'; toast('Lenka er kopiert'); } else invSheet.ok = 'Kunne ikke kopiere';
        updateInviteSheet();
      });
      return;
    }
    if (a === 'done') {
      var ov = v9Sheet(); if (ov) ov._onClose = null;
      closeV9Sheet(false);
      finishInvite();
      return;
    }
    if (a === 'ios-copy') { iosCopy(true); return; }
    if (a === 'inst-ok') {
      var s = instState(); s.done = true; s.open = false; instSave(s);
      ui.installVisible = false;
      closeV9Sheet(false);
      if (main.querySelector('[data-page="uke"]')) renderUke();
      return;
    }
  }

  /* --- Bli med (6a/6b), Koble til (9), flytting (§7) --- */
  function parseInn(raw) {
    var m = /^#inn=([A-Za-z0-9\-]{8,12})$/.exec(raw || '');
    return m ? normCode(m[1]) || 'INVALID' : null;
  }
  function parseFlytt(raw) {
    var m = /^#flytt=([A-Za-z0-9]{22,64})\.([A-Za-z0-9]{22,64})$/.exec(raw || '');
    return m ? { hid: m[1], secret: m[2] } : null;
  }
  // Det brukeren limer inn: en Knaggen-lenke (#join=, #flytt=, #inn=, ?inn=) eller bare koden.
  function parseAnyLink(text) {
    text = String(text || '').trim();
    var m = /#(?:join|flytt)=([A-Za-z0-9]{22,64})\.([A-Za-z0-9]{22,64})/.exec(text);
    if (m) return { hid: m[1], secret: m[2] };
    m = /[#?&]inn=([A-Za-z0-9\-]{8,12})/.exec(text);
    if (m && normCode(m[1])) return { code: normCode(m[1]) };
    var c = normCode(text);
    return c ? { code: c } : null;
  }
  function setTabsHidden(on) { document.body.classList.toggle('v9-notabs', !!on); }
  // Kobler til (samme joinHousehold som før) og lander i Uke. opts: { toast, moment, onError }
  function joinWith(hid, secret, opts) {
    opts = opts || {};
    if (hh && hh.hid === hid) {
      history.replaceState(null, '', location.pathname + location.search + '#uke');
      if (opts.moment) ui.installMoment = opts.moment;
      setTabsHidden(false); route();
      toast(opts.already || 'Du er allerede med i denne husstanden');
      return Promise.resolve();
    }
    if (leftBlocks(hid, opts.inviteExpires, opts.inviteCreated)) {
      var le = new Error('left-link'); le.code = 'left-link';
      if (opts.onError) opts.onError(le);
      return Promise.resolve();
    }
    if (!opts.asked && opts.moment !== 'C') {
      return new Promise(function (res) { askBring(function () { opts.asked = true; res(joinWith(hid, secret, opts)); }); });
    }
    ui.busy = true;
    return Sync.init().then(function () { return Sync.joinHousehold(hid, secret); }).then(function () {
      ui.busy = false;
      removeLeft(hid);
      var raw = lsGet(STORAGE_KEY);
      if (raw && !lsGet(STORAGE_KEY + ':backup-before-household')) lsSet(STORAGE_KEY + ':backup-before-household', raw);
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      var info = { hid: hid, secret: secret, core_done: true, migrated: false, joined: true };
      writeHH(info);
      ui.invite = null; ui.members = null;
      enterHousehold(info);
      if (opts.moment) ui.installMoment = opts.moment;
      history.replaceState(null, '', location.pathname + location.search + '#uke');
      setTabsHidden(false);
      route();
      toast(opts.toast || 'Du er med i husstanden. Uka og lista er felles.', 4000);
    }, function (e) {
      ui.busy = false; ui.bring = null;
      if (opts.onError) opts.onError(e);
    });
  }
  var invPage = null;   // { code, status: 'loading'|'ok'|'gone'|'net', data }
  function renderInvitePage(code) {
    setTabsHidden(true);
    if (code === 'INVALID') invPage = { code: code, status: 'gone' };
    if (!invPage || invPage.code !== code) {
      invPage = { code: code, status: 'loading' };
      fetchInvite(code);
    }
    var p = invPage, h = '<section class="page" data-page="join"><div class="join">';
    if (p.status === 'ok' && p.data && leftBlocks(p.data.hid, p.data.expires_at, p.data.created_at)) p.status = 'left';   // v0.10: forlatt siden sist
    if (!syncMode()) { main.innerHTML = h + '<p class="empty">Deling er ikke satt opp ennå.</p><a class="btn" href="#uke">Til Knaggen</a></div></section>'; return; }
    if (p.status === 'loading') { main.innerHTML = h + '<p class="inv-wait" role="status">Henter invitasjonen …</p></div></section>'; return; }
    if (p.status === 'gone') {
      main.innerHTML = h + '<h2>Invitasjonen gjelder ikke lenger</h2><p class="lead" data-testid="inv-utlopt">Invitasjonen gjelder ikke lenger. Be den som sendte den om en ny (Retter → Husstand → Inviter).</p>' +
        '<div class="acts"><a class="btn primary" href="#uke" data-testid="til-knaggen">Til Knaggen</a></div></div></section>';
      return;
    }
    if (p.status === 'left') {
      main.innerHTML = h + '<h2>Lenka virker ikke lenger</h2><p class="lead" data-testid="lenke-forlatt">' + esc(LEFT_MSG) + '</p>' +
        '<div class="acts"><a class="btn primary" href="#uke" data-testid="til-knaggen">Til Knaggen</a></div></div></section>';
      return;
    }
    if (p.status === 'net') {
      main.innerHTML = h + '<h2>Du er invitert til husstanden</h2><p class="form-error" data-testid="feil">Får ikke kontakt. Sjekk at du har nett og prøv igjen.</p>' +
        '<div class="acts"><button type="button" class="btn primary" data-action="inv-refetch">Prøv igjen</button><a class="btn" href="#uke">Ikke nå</a></div></div></section>';
      return;
    }
    main.innerHTML = joinPageHtml(p.data.hid, p.data.secret, p.data.expires_at);
  }
  function fetchInvite(code) {
    Sync.init().then(function () { return Sync.getInvite(code); }).then(function (d) {
      if (!invPage || invPage.code !== code) return;
      invPage.status = leftBlocks(d.hid, d.expires_at, d.created_at) ? 'left' : 'ok'; invPage.data = d;
      if (hh && hh.hid === d.hid) { joinWith(d.hid, d.secret, {}); return; }
      if (parseInn(location.hash) === code) renderInvitePage(code);
    }, function (e) {
      if (!invPage || invPage.code !== code) return;
      invPage.status = e && e.code === 'invite-gone' ? 'gone' : 'net';
      if (parseInn(location.hash) === code) renderInvitePage(code);
    });
  }
  // 6a / 6b. Brukes for #inn=KODE og for gamle #join=-lenker (da uten utløpsdato).
  function joinPageHtml(hid, secret, expires) {
    var h = '<section class="page" data-page="join"><div class="join">';
    if (envInfo.inapp) {
      var where = envInfo.app ? 'inne i ' + envInfo.app : 'i en app';
      var br = envInfo.ios ? 'Safari' : 'Chrome';
      h += '<div class="inapp-box" role="note" data-testid="inapp"><b>Du er i nettleseren ' + esc(where) + '</b>' +
        '<p>Her kan ikke Knaggen legges på hjemskjermen, og den blir borte når du lukker. Åpne lenka i ' + br + ' først.' +
        (envInfo.ios ? ' Trykk på ⋯ og velg å åpne i Safari.' : '') + '</p>' +
        (envInfo.ios ? '<button type="button" class="btn" data-action="inapp-copy" data-testid="inapp-kopier">' + IC.copy + 'Kopier lenke</button>'
          : '<button type="button" class="btn primary" data-action="inapp-chrome" data-testid="inapp-chrome">Åpne i Chrome</button>') + '</div>';
    }
    h += '<h2>Du er invitert til husstanden</h2><p class="lead">Knaggen er husets felles huskeliste.</p>' +
      '<ul class="join-what"><li>' + IC.uke + '<div><b>Uka</b><span>Middagene dere velger, dag for dag</span></div></li>' +
      '<li>' + IC.liste + '<div><b>Lista lager seg selv</b><span>Av middagene, med riktige mengder</span></div></li>' +
      '<li>' + IC.felles + '<div><b>Felles</b><span>Det den ene legger inn, ser den andre med en gang</span></div></li></ul>';
    if (hh && hh.hid !== hid) h += '<p class="hint">Denne telefonen er allerede med i en annen husstand. Blir du med her, byttes husstanden på denne telefonen.</p>';
    else if (!hh && hasOwnData()) h += '<p class="hint">Det som ligger på denne telefonen nå blir ikke slått sammen, men tas vare på som sikkerhetskopi.</p>';
    if (ui.error) h += '<p class="form-error" data-testid="feil">' + esc(ui.error) + '</p>';
    var inapp = envInfo.inapp && !envInfo.ios ? ' ' : '';
    h += '<div class="acts"><button type="button" class="btn' + (envInfo.inapp && !envInfo.ios ? '' : ' primary') + '" data-action="join" data-hid="' + esc(hid) + '" data-secret="' + esc(secret) + '" data-testid="bli-med"' + (ui.busy ? ' disabled' : '') + '>' +
      (ui.busy ? 'Kobler til …' : envInfo.inapp ? 'Bli med her likevel' : 'Bli med') + '</button>' +
      (envInfo.inapp ? '' : '<a class="btn" href="#uke" data-action="join-later" data-testid="ikke-na">Ikke nå</a>') + '</div>' + inapp;
    h += '<p class="hint">Ingen konto.' + (expires ? ' Invitasjonen gjelder til ' + dm(expires) : '') + '</p></div></section>';
    return h;
  }
  function inappChrome() {
    // Android intent-URL kan ikke ha #, så koden sendes som ?inn= og fjernes igjen etter lasting (§9).
    var code = invPage && invPage.code && invPage.code !== 'INVALID' ? invPage.code : null;
    var u = new URL(location.href);
    u.hash = '';
    if (code) u.search = '?inn=' + code;
    else { var j = parseJoin(location.hash); if (j) u.hash = '#join=' + j.hid + '.' + j.secret; }
    location.href = 'intent://' + u.host + u.pathname + u.search + u.hash + '#Intent;scheme=' + u.protocol.replace(':', '') + ';package=com.android.chrome;end';
  }

  var connect = { error: '', busy: false };
  var LEFT_MSG = 'Lenka virker ikke lenger på denne telefonen, fordi du har forlatt husstanden. Be om en ny invitasjon.';
  function showConnectFirst() {
    // iPhone fra Hjem-skjerm: egen lagring som starter tom → Koble til først (§4, skjerm 9)
    return envInfo.ios && isStandalone() && !hh && !hasOwnData() && !instState().connectSkip && !NEW_HOME;
  }
  // fromHusstand: true = fra Retter → Husstand, 'intro' = «Jeg har en invitasjon» på introsiden, false = iPhone Hjem-skjerm
  function connectMode() { var h = location.hash || ''; return /^#koble\/intro/.test(h) ? 'intro' : /^#koble/.test(h); }
  function renderConnect(fromHusstand) {
    var fromIntro = fromHusstand === 'intro';
    if (fromIntro) fromHusstand = false;
    setTabsHidden(!fromHusstand);
    var h = '<section class="page" data-page="koble"><div class="connect">' +
      (fromHusstand ? '<div class="page-head"><a class="back" href="#husstand">‹ Husstand</a></div>' : '') +
      (fromIntro ? '<div class="page-head"><a class="back" href="#uke" data-testid="koble-tilbake">‹ Tilbake</a></div>' : '') +
      '<h2>Koble til husstanden</h2>' +
      '<p class="lead">' + (fromHusstand || fromIntro ? 'Lim inn lenka til husstanden, eller skriv koden fra invitasjonen.' + (hh ? ' Husstanden byttes på denne telefonen.' : '')
        : 'Knaggen på Hjem-skjermen starter tom på iPhone. Lim inn lenka du kopierte, så er uka og lista her.') + '</p>' +
      '<button type="button" class="btn primary wide" data-action="koble-lim" data-testid="koble-lim"' + (connect.busy ? ' disabled' : '') + '>' + IC.paste + (connect.busy ? 'Kobler til …' : 'Lim inn lenka') + '</button>' +
      '<p class="or">eller skriv koden</p>' +
      '<form class="code-in" id="koble-form" novalidate><input type="text" id="koble-kode" inputmode="text" autocapitalize="characters" autocomplete="one-time-code" spellcheck="false" placeholder="XXXX-XXXX" aria-label="Kode fra invitasjonen" data-testid="koble-kode" maxlength="14">' +
      '<button type="submit" class="btn" data-testid="koble-til"' + (connect.busy ? ' disabled' : '') + '>Koble til</button></form>' +
      (connect.error ? '<p class="form-error" role="alert" data-testid="koble-feil">' + esc(connect.error) + '</p>' : '') +
      '<p class="hint">Koden står i invitasjonen, eller under Retter → Husstand på en telefon som er med.</p>' +
      (fromHusstand || fromIntro ? '' : '<button type="button" class="linkbtn new" data-action="koble-ny" data-testid="koble-ny">Ny her? Start uten husstand</button>') +
      '</div></section>';
    var keep = document.activeElement && document.activeElement.id === 'koble-kode' ? document.getElementById('koble-kode').value : null;
    main.innerHTML = h;
    if (keep != null) { var ki = document.getElementById('koble-kode'); ki.value = keep; ki.focus(); }
  }
  function connectWith(parsed) {
    var from = connectMode();
    function fail(msg) { connect.busy = false; connect.error = msg; renderConnect(from); }
    function netOr(e, msg) { var m = (e && (e.code || e.message)) || ''; return /no-server|unavailable|network|timeout/.test(m) || !navigator.onLine ? 'Får ikke kontakt. Sjekk at du har nett og prøv igjen.' : msg; }
    if (!parsed) return fail('Fant ingen Knaggen-lenke. Skriv koden i stedet.');
    connect.busy = true; connect.error = ''; renderConnect(from);
    var p = parsed.code ? Sync.init().then(function () { return Sync.getInvite(parsed.code); }) : Promise.resolve(parsed);
    p.then(function (d) {
      return joinWith(d.hid, d.secret, { inviteExpires: d.expires_at || null, inviteCreated: d.created_at || null, toast: 'Koblet til husstanden. Alt er her.', already: 'Koblet til husstanden. Alt er her.', onError: function (e) {
        fail(e && e.code === 'left-link' ? LEFT_MSG : netOr(e, 'Lenka virker ikke. Be om en ny lenke fra den som delte den.'));
      } }).then(function () { connect.busy = false; });
    }, function (e) {
      fail(e && e.code === 'invite-gone' ? 'Finner ingen invitasjon med den koden. Sjekk tegnene.' : netOr(e, 'Finner ingen invitasjon med den koden. Sjekk tegnene.'));
    });
  }
  function pasteConnect() {
    if (!(navigator.clipboard && navigator.clipboard.readText)) { connect.error = 'Fant ingen Knaggen-lenke. Skriv koden i stedet.'; renderConnect(connectMode()); return; }
    navigator.clipboard.readText().then(function (t) { connectWith(parseAnyLink(t)); }, function () {
      connect.error = 'Fant ingen Knaggen-lenke. Skriv koden i stedet.'; renderConnect(connectMode());
    });
  }

  var flyttState = null;
  function renderFlytt(f) {
    setTabsHidden(true);
    if (!flyttState || flyttState.hid !== f.hid) {
      flyttState = { hid: f.hid, error: '' };
      joinWith(f.hid, f.secret, { toast: 'Knaggen er flyttet hit. Alt er med.', already: 'Knaggen er flyttet hit. Alt er med.', moment: 'C', onError: function (e) {
        flyttState.error = errorText(e);
        if (parseFlytt(location.hash)) renderFlytt(f);
      } });
    }
    main.innerHTML = '<section class="page" data-page="flytt"><div class="moved"><h2>Flytter Knaggen hit …</h2>' +
      (flyttState.error ? '<p class="form-error" data-testid="feil">' + esc(flyttState.error) + '</p><button type="button" class="btn primary" data-action="flytt-igjen">Prøv igjen</button>'
        : '<p class="inv-wait" role="status">Henter rettene, uka og lista …</p>') + '</div></section>';
  }

  /* --- Den gamle adressen: flyttesiden (10) --- */
  function oldHasData() {
    return !!readHH() || hasOwnData() || hsState().asked || Object.keys(state.day_people || {}).length > 0;
  }
  function runOldAddress() {
    var h = location.hash || '';
    var target = NEW_HOME;
    var q = /[?&]inn=([A-Za-z0-9\-]+)/.exec(location.search || '');
    if (/^#(join|inn)=/.test(h)) { location.replace(target + h); return; }
    if (q) { location.replace(target + '#inn=' + q[1]); return; }
    if (lsGet(MOVED_KEY) === '1' || !oldHasData()) { location.replace(target); return; }
    renderMovePage();
  }
  var moveState = { busy: false, error: '' };
  function renderMovePage() {
    setTabsHidden(true);
    var host = NEW_HOME.replace(/^https?:\/\//, '').replace(/\/$/, '');
    main.innerHTML = '<section class="page" data-page="flyttet"><div class="moved"><h2>Knaggen har flyttet</h2>' +
      '<span class="addr">' + esc(host) + '</span>' +
      '<p>Den nye adressen er bare for Knaggen. Alt blir med:</p>' +
      '<ul><li>Rettene, uka og lista</li><li>Faste varer og husstandens størrelse</li><li>Husstanden, hvis dere deler</li></ul>' +
      (moveState.error ? '<p class="form-error" role="alert" data-testid="feil">' + esc(moveState.error) + '</p>' : '') +
      '<button type="button" class="btn primary" data-action="flytt" data-testid="flytt"' + (moveState.busy ? ' disabled' : '') + '>' +
      (moveState.busy ? 'Flytter …' : 'Flytt til ' + esc(host)) + '</button>' +
      '<p class="hint">Hver telefon flytter selv, når det passer. Ingenting slettes her.</p>' +
      '<p class="hint">Har du Knaggen på hjemskjermen? Legg den nye dit etterpå, og slett den gamle snarveien.</p></div></section>';
  }
  function doMove() {
    if (moveState.busy) return;
    moveState.busy = true; moveState.error = '';
    renderMovePage();
    var info = readHH();
    var p;
    if (info && info.core_done && syncMode()) {
      // I husstand: sørg for at en avbrutt flytting av lokale data inn i husstanden er fullført før vi går.
      if (!hh) enterHousehold(info);
      p = syncReady.then(function () { return hh; });
    } else {
      p = ensureHousehold();   // bare lokale data: husstanden lages her først (createHousehold flytter alt inn)
    }
    p.then(function (x) {
      lsSet(MOVED_KEY, '1');
      location.href = NEW_HOME + '#flytt=' + x.hid + '.' + x.secret;
    }, function (e) {
      moveState.busy = false;
      moveState.error = errorText(e);
      renderMovePage();
    });
  }

  /* --- Hjemskjerm-kortet (7, 8) --- */
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    if (ui.installVisible && main.querySelector('[data-page="uke"]')) renderUke();
  });
  window.addEventListener('appinstalled', function () {
    var s = instState(); s.done = true; s.open = false; instSave(s);
    deferredInstall = null;
    if (ui.installVisible) { ui.installVisible = false; if (main.querySelector('[data-page="uke"]')) renderUke(); }
  });
  function instState() { try { var v = JSON.parse(lsGet(INSTALL_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function instSave(v) { lsSet(INSTALL_KEY, JSON.stringify(v)); }
  function showInstallCard(dates) {
    if (!envInfo.phone || isStandalone() || envInfo.inapp || NEW_HOME) return false;
    var s = instState();
    if (s.done) return false;
    if (!weekCount(weekDates(0))) return false;
    if (showStart() || showHsCard() || ui.swap || document.querySelector('body > .overlay')) return false;
    // Et kort som er vist, står til det er besvart (Ikke nå / Legg til), også etter omlasting – det telles én gang.
    if (ui.installVisible || s.open) { ui.installVisible = true; return true; }
    if ((s.shown | 0) >= 2) return false;
    var today = isoDate(new Date());
    if (!s.seen) { s.seen = today; instSave(s); }
    var momentD = s.seen < today;
    var m = ui.installMoment;
    var ok = (s.shown | 0) === 0 ? !!(m || momentD) : (momentD && !m && (!s.last || Date.now() - s.last >= 14 * DAY_MS));
    if (!ok) return false;
    s.shown = (s.shown | 0) + 1; s.last = Date.now(); s.open = true; instSave(s);
    ui.installVisible = true; ui.installMoved = m === 'C';
    return true;
  }
  function installCardHtml() {
    var primary = deferredInstall ? '<button type="button" class="btn primary" data-action="inst-add" data-testid="inst-legg-til">Legg til</button>'
      : '<button type="button" class="btn primary" data-action="inst-how" data-testid="inst-vis">Vis meg hvordan</button>';
    return '<section class="inst" aria-labelledby="inst-h" data-testid="hjemskjerm-kort">' + ICON_IMG +
      '<div><h3 id="inst-h">' + (ui.installMoved ? 'Legg den nye Knaggen på hjemskjermen' : 'Legg Knaggen på hjemskjermen') + '</h3>' +
      '<p>' + (ui.installMoved ? 'Den gamle snarveien kan du slette etterpå.' : 'Så finner du lista igjen i butikken, uten å lete etter lenka.') + '</p></div>' +
      '<div class="km-acts">' + primary + '<button type="button" class="btn ghost" data-action="inst-later" data-testid="inst-ikke-na">Ikke nå</button></div></section>';
  }
  function installLater() {
    var s = instState(); s.last = Date.now(); s.open = false; instSave(s);
    ui.installVisible = false; ui.installMoment = null;
    renderUke();
    focusEl('.week-nav [data-action="week-next"]');
  }
  function installAdd() {
    var ev = deferredInstall;
    if (!ev) { installHow(); return; }
    deferredInstall = null;
    try { ev.prompt(); } catch (e) { installHow(); return; }
    Promise.resolve(ev.userChoice).then(function (c) {
      if (c && c.outcome === 'accepted') {
        var s = instState(); s.done = true; s.open = false; instSave(s);
        ui.installVisible = false;
        toast('Knaggen ligger nå på hjemskjermen');
      } else {
        installLater();
        return;
      }
      if (main.querySelector('[data-page="uke"]')) renderUke();
    }, function () { /* ignorer */ });
  }
  function installHow() {
    if (envInfo.ios) return iosHow();
    openV9Sheet('andr', '<div class="sheet-head"><div><h3 id="andr-h">Legg Knaggen på startskjermen</h3><span class="sub">Android</span></div>' +
      '<button type="button" class="icon-btn" data-v9="close" aria-label="Lukk">✕</button></div>' +
      '<ol class="steps-ios"><li><span class="n">1</span><p>Trykk på <b>⋮</b> øverst til høyre</p><span class="g">' + IC.meny + '</span></li>' +
      '<li><span class="n">2</span><p>Velg «Legg til på startskjermen» (eller «Installer app»)</p><span class="g">' + IC.plus + '</span></li>' +
      '<li><span class="n">3</span><p>Trykk «Installer» eller «Legg til»</p><span class="g tg"><span></span></span></li></ol>' +
      '<div class="km-acts"><button type="button" class="btn primary" data-v9="inst-ok" data-testid="inst-skjonner">Skjønner</button></div>');
  }
  // iPhone: Hjem-skjerm-appen har egen lagring. Sørg for husstand først, og kopier den varige lenka i samme trykk.
  var iosState = { copied: null, creating: false, error: '' };
  function iosHow() {
    iosState = { copied: null, creating: !hh, error: '' };
    iosCopy(false);
    openV9Sheet('ios', iosSheetHtml());
    if (!hh) ensureHousehold().then(function () { iosState.creating = false; updateIosSheet(); }, function (e) {
      iosState.creating = false; iosState.error = inviteErrText(e).replace('Invitasjonen lages', 'Lenka lages'); updateIosSheet();
    });
  }
  function iosCopy(manual) {
    function done(ok) { iosState.copied = ok; updateIosSheet(); }
    try {
      if (hh) {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareLink()).then(function () { done(true); }, function () { if (manual) copyQuiet(shareLink(), done); else done(false); });
        else copyQuiet(shareLink(), done);
      } else if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        var blob = ensureHousehold().then(function () { return new Blob([shareLink()], { type: 'text/plain' }); });
        navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]).then(function () { done(true); }, function () { done(false); });
      } else {
        ensureHousehold().then(function () { done(false); }, function () { done(false); });
      }
    } catch (e) { done(false); }
  }
  function iosSheetHtml() {
    var s = iosState;
    var step1 = envInfo.ipad ? 'Trykk på <b>Del</b> øverst.' : envInfo.iosOther ? 'Trykk på <b>Del</b> i adressefeltet eller i menyen.'
      : 'Trykk på <b>Del</b>.<span class="m">Ser du den ikke? Trykk først på ⋯ eller på knappen til venstre i adressefeltet.</span>';
    var h = '<div class="sheet-head"><div><h3 id="ios-h">Legg Knaggen på Hjem-skjerm</h3><span class="sub">' + (envInfo.ipad ? 'iPad' : 'iPhone') + ' · ' +
      (envInfo.iosOther ? 'nettleser' : 'Safari') + '</span></div>' +
      '<button type="button" class="icon-btn" data-v9="close" aria-label="Lukk">✕</button></div>';
    if (s.creating) h += '<p class="inv-wait" role="status" data-testid="ios-lager">Uka og lista lagres i husstanden først, så de blir med</p>';
    if (s.error) h += '<p class="form-error" role="alert">' + esc(s.error) + '</p>';
    h += '<ol class="steps-ios"><li><span class="n">1</span><p>' + step1 + '</p><span class="g">' + IC.del + '</span></li>' +
      '<li><span class="n">2</span><p>Velg <b>Legg til på Hjem-skjerm</b>.<span class="m">Rull litt ned i lista hvis du ikke ser den.</span></p><span class="g">' + IC.plus + '</span></li>' +
      '<li><span class="n">3</span><p>La <b>Åpne som nettapp</b> stå på, og trykk <b>Legg til</b>.</p><span class="g tg"><span></span></span></li></ol>';
    if (s.copied === true) h += '<p class="copied" data-testid="ios-kopiert">' + IC.check + '<span><b>Lenka til husstanden er kopiert.</b> Første gang du åpner Knaggen fra Hjem-skjermen, trykker du «Lim inn lenka». Da er alt med.</span></p>';
    else if (s.copied === false && !s.creating && hh) h += '<p class="m">Første gang du åpner Knaggen fra Hjem-skjermen, trykker du «Lim inn lenka». Kopier lenka først:</p>' +
      '<button type="button" class="btn" data-v9="ios-copy" data-testid="ios-kopier">' + IC.copy + 'Kopier lenka</button>';
    h += '<div class="km-acts"><button type="button" class="btn primary" data-v9="inst-ok" data-testid="inst-skjonner">Skjønner</button></div>';
    return h;
  }
  function updateIosSheet() {
    var ov = document.getElementById('ios');
    if (!ov) return;
    var sh = ov.querySelector('.sheet'), had = sh.contains(document.activeElement) ? document.activeElement.getAttribute('data-v9') : null;
    sh.innerHTML = iosSheetHtml();
    var f = (had && sh.querySelector('[data-v9="' + had + '"]')) || sh.querySelector('.btn.primary');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }

  /* ---------- v0.17: husstandsnavn, enheter, Legg til, «Delt»-status og felles kjøkkenoppsett ----------
   * Spec: spec-v017-husstand.md, design: merkevare/v017-husstand. Alt nytt er nye dokumenter (settings/profil,
   * settings/kjokken, devices/{uid}); ingenting eksisterende flyttes eller slettes. */
  var K17_REG_KEY = 'knaggen:enhet-registrert';   // v0.17: hid der denne enheten har en enhetsoppføring
  var K17 = { name: '', devices: null, memberDocs: null, selfSeen: false, creating: false, kitchen: null, kitchenSeen: false, sheet: null, removing: false };
  var DEV_TOUCH_KEY = 'knaggen:enhet-sett', NAME_LATER_KEY = 'knaggen:navn-senere', KIND_ASK_KEY = 'knaggen:enhet-spor';
  var PLAT = { android: 'Android-telefon', iphone: 'iPhone', ipad: 'iPad', nettbrett: 'Nettbrett', windows: 'PC med Windows', mac: 'Mac', linux: 'PC med Linux', annet: 'Nettleser' };
  function devPlatform() {
    var ua = navigator.userAgent || '';
    if (envInfo.ipad) return 'ipad';
    if (/iPhone|iPod/.test(ua)) return 'iphone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'android' : 'nettbrett';
    if (/Windows/.test(ua)) return 'windows';
    if (/Macintosh/.test(ua)) return 'mac';
    if (/Linux|CrOS/.test(ua)) return 'linux';
    return 'annet';
  }
  // Bare grov type lagres; nettlesernavnet brukes bare i navneforslaget (aldri hele user agent-strengen).
  function devSuggestion(p) {
    var ua = navigator.userAgent || '';
    if (p === 'windows' || p === 'mac' || p === 'linux') {
      var b = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
      return b ? b + ' på ' + (p === 'windows' ? 'Windows' : p === 'mac' ? 'Mac' : 'Linux') : PLAT[p];
    }
    return PLAT[p] || 'Nettleser';
  }
  function dayNum(ms) { var t = ms == null ? Date.now() : ms; return Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 864e5); }
  function agoText(day) {
    var n = dayNum() - day;
    if (n <= 0) return 'i dag';
    if (n === 1) return 'i går';
    if (n < 14) return 'for ' + n + ' dager siden';
    if (n < 60) return 'for ' + Math.round(n / 7) + ' uker siden';
    var m = Math.round(n / 30); return 'for ' + m + (m === 1 ? ' måned' : ' måneder') + ' siden';
  }
  function hhName() { return K17.name || ''; }
  function myUid() { return Sync && Sync.uid ? Sync.uid() : null; }
  // v0.18: posisjon i «Nå» – bare et av/på-valg på denne enheten. Selve posisjonen lagres aldri.
  function naPosOn() { try { return localStorage.getItem('knaggen:na-posisjon') === 'true'; } catch (e) { return false; } }
  function startKitchenOn() { try { return localStorage.getItem('knaggen:start-kjokken') === 'true'; } catch (e) { return false; } }
  // Enhetslista: medlemmene er sannheten for hvem som har tilgang; devices gir navn, type og sist aktiv.
  function deviceList() {
    var devs = {}, out = [], me = myUid();
    (K17.devices || []).forEach(function (d) { devs[d.id] = d; });
    var ids = K17.memberDocs ? K17.memberDocs.map(function (m) { return m.id; }) : Object.keys(devs);
    var joined = {};
    (K17.memberDocs || []).forEach(function (m) { joined[m.id] = m.joined_at && m.joined_at.toMillis ? m.joined_at.toMillis() : 0; });
    ids.forEach(function (id) {
      var d = devs[id];
      var last = d ? d.last_seen : (joined[id] ? dayNum(joined[id]) : null);
      out.push({ id: id, known: !!d, me: id === me, name: d ? d.name : 'Ukjent enhet', type: d ? d.type : 'person', owner: d ? d.owner_label || '' : '',
        platform: d ? d.platform : '', last: last, joined: joined[id] || (d && d.created_at) || 0, nameSet: !!(d && d.name_set), old: last != null && dayNum() - last > 90 });
    });
    out.sort(function (a, b) { return (b.me - a.me) || (b.known - a.known) || ((b.last || 0) - (a.last || 0)); });
    return out;
  }
  var DEV_IC = {
    phone: IC.phone,
    tablet: SVG0 + '><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M10.5 18h3"/></svg>',
    pc: SVG0 + '><rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/></svg>',
    kjokken: SVG0 + '><rect x="2.75" y="4.5" width="18.5" height="12.5" rx="2"/><path d="M12 17v3M8 20h8"/></svg>',
    ukjent: SVG0 + '><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none"/></svg>'
  };
  function devIcon(d) {
    if (!d.known) return '<span class="k17-ic q">' + DEV_IC.ukjent + '</span>';
    var k = d.type === 'kjokken' ? 'kjokken' : (d.platform === 'ipad' || d.platform === 'nettbrett') ? 'tablet' : (d.platform === 'windows' || d.platform === 'mac' || d.platform === 'linux') ? 'pc' : 'phone';
    return '<span class="k17-ic">' + DEV_IC[k] + '</span>';
  }
  function devSub(d) {
    if (!d.known) return 'koblet til ' + (d.joined ? dm(d.joined) : 'tidligere') + (d.last != null ? ' · ' + agoText(d.last) : '');
    return [d.owner, d.last != null ? agoText(d.last) : ''].filter(Boolean).join(' · ');
  }
  function devRow(d) {
    return '<button type="button" class="k17-row" data-action="k17-enhet" data-uid="' + esc(d.id) + '" data-testid="k17-enhet' + (d.me ? '-denne' : '') + '">' + devIcon(d) +
      '<span class="t"><b>' + esc(d.name) + (d.me ? '<span class="k17-tag">denne</span>' : '') + '</b><span>' + esc(devSub(d)) + '</span></span><span class="go" aria-hidden="true">›</span></button>';
  }
  function devicesHtml() {
    var l = deviceList(), cur = l.filter(function (d) { return !d.old || d.me; }), old = l.filter(function (d) { return d.old && !d.me; });
    var h = '<div class="k17-grp" data-testid="k17-enheter">' + cur.map(devRow).join('');
    if (old.length) h += '<details class="k17-old" data-testid="k17-gamle"' + (K17.oldOpen ? ' open' : '') + '><summary class="k17-row"><span class="t"><b>Ikke brukt på lenge</b></span><span class="end">' + old.length + ' ›</span></summary>' +
      '<p class="k17-note">Fjern den hvis den er borte.</p>' + old.map(devRow).join('') + '</details>';
    h += '<button type="button" class="k17-row k17-add" data-action="k17-legg-til" data-testid="k17-legg-til"><span class="k17-ic">' + IC.plus + '</span><span class="t"><b>Legg til enhet eller person</b></span></button></div>';
    h += '<p class="k17-note">Navn, «tilhører» og sist aktiv (bare dag) er synlige for alle i husstanden.</p>';
    return h;
  }
  function countText() {
    var n = K17.memberDocs ? K17.memberDocs.length : ui.members;
    return n ? n + (n === 1 ? ' enhet' : ' enheter') : 'Delt husstand';
  }
  // Egen enhet: opprettes første gang v0.17 åpnes, last_seen høyst én gang i timen (og bare når dagen er ny).
  function devicesSnapshot(docs, meta) {
    if (!docs) return;   // eldre regler: ingen enhetsliste
    K17.devices = docs;
    var me = myUid(), mine = docs.filter(function (d) { return d.id === me; })[0];
    if (meta && !meta.fromCache && hh && me) {
      if (mine) { K17.selfSeen = true; if (lsGet(K17_REG_KEY) !== hh.hid) lsSet(K17_REG_KEY, hh.hid); }
      else if (K17.selfSeen && !ui.deleting) { checkRemoved(); return; }
      else if (!K17.creating) {
        K17.creating = true;
        var p = devPlatform(), pend = null;
        try { pend = JSON.parse(localStorage.getItem(KIND_ASK_KEY + ':valg') || 'null'); } catch (e) { pend = null; }
        var kitchen = pend ? pend.type === 'kjokken' : startKitchenOn();
        var d = { name: kitchen ? 'Kjøkkenskjerm' : devSuggestion(p), type: kitchen ? 'kjokken' : 'person', owner_label: kitchen ? 'Kjøkkenet' : null, platform: p, last_seen: dayNum(), created_at: Date.now(), name_set: false };
        Sync.write.createDevice(hh.hid, d).then(function () { lsDel(KIND_ASK_KEY + ':valg'); lsSet(DEV_TOUCH_KEY, JSON.stringify({ hid: hh && hh.hid, at: Date.now() })); }, function () { K17.creating = false; });
      }
      if (mine && mine.last_seen < dayNum()) {
        var t = null; try { t = JSON.parse(lsGet(DEV_TOUCH_KEY) || 'null'); } catch (e) { t = null; }
        if (!t || t.hid !== hh.hid || Date.now() - t.at > 3600e3) {
          lsSet(DEV_TOUCH_KEY, JSON.stringify({ hid: hh.hid, at: Date.now() }));
          Sync.write.updateDevice(hh.hid, me, { last_seen: dayNum() }).catch(function () { /* frakoblet */ });
        }
      }
    }
    k17Refresh();
  }
  // Fjernet fra en annen enhet: ikke koble til på nytt automatisk (det ville gjort «Fjern» virkningsløs).
  function checkRemoved() {
    if (!hh || checkRemoved.busy) return;
    var cur = hh; checkRemoved.busy = true;
    Sync.stillMember(cur.hid).then(function (m) {
      if (hh !== cur || m !== false) { checkRemoved.busy = false; return; }
      // Fjernet eller slettet? Bare den slettede husstanden avviser hemmeligheten. Ved fjerning meldes enheten straks ut igjen.
      return Sync.joinHousehold(cur.hid, cur.secret).then(function () {
        return Sync.leaveHousehold(cur.hid).catch(function () { /* ignorer */ }).then(function () {
          checkRemoved.busy = false;
          if (hh === cur) deviceRemoved();
        });
      }, function (e) {
        checkRemoved.busy = false;
        if (hh !== cur) return;
        if (e && e.code === 'permission-denied') householdGone(); else deviceRemoved();
      });
    }, function () { checkRemoved.busy = false; });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && hh && K17.selfSeen) checkRemoved(); });
  function deviceRemoved() {
    if (!hh || ui.deleting) return;
    K17.selfSeen = false;
    dropHousehold();
    resetToIntro('Denne enheten er ikke lenger med i husstanden.');
    toast('Denne enheten er ikke lenger med i husstanden. Be om en ny kode for å bli med igjen.', 7000);
  }
  function settingsK17(docs, meta) {
    var p = docs.filter(function (d) { return d.id === 'profil'; })[0];
    K17.name = p && typeof p.name === 'string' ? p.name : '';
    var k = docs.filter(function (d) { return d.id === 'kjokken'; })[0];
    K17.kitchen = k && Array.isArray(k.stops) ? { stops: k.stops, lat: k.lat, lon: k.lon } : null;
    // Migrering (spec §9): første skjerm med lokalt oppsett kopierer holdeplassene til husstanden hvis feltet er tomt.
    if (meta && !meta.fromCache && hh && !K17.kitchenSeen) {
      K17.kitchenSeen = true;
      var loc = null; try { loc = JSON.parse(localStorage.getItem('knaggen:kjokken-avganger') || 'null'); } catch (e) { loc = null; }
      if ((!K17.kitchen || !K17.kitchen.stops.length) && loc && Array.isArray(loc.stops) && loc.stops.length && !loc.own) {
        K17.kitchen = { stops: loc.stops.slice(0, 3), lat: loc.lat == null ? null : loc.lat, lon: loc.lon == null ? null : loc.lon };
        Sync.write.setKitchenShared(hh.hid, K17.kitchen).catch(function () { /* eldre regler: blir lokalt */ });
      }
    }
    if (window.KnaggenKjokken && window.KnaggenKjokken.sharedChanged) window.KnaggenKjokken.sharedChanged();
    k17Refresh();
  }
  function k17Refresh() {
    if (main.querySelector('[data-page="husstand"][data-v17]') && !main.querySelector('[data-page="husstand"] input:focus')) renderHousehold();
    if (K17.sheet && K17.sheet.refresh) K17.sheet.refresh();
  }

  /* --- ark (felles for v0.17) --- */
  function k17Open(id, html, opts) {
    k17Close();
    var ov = document.createElement('div');
    ov.className = 'k17-ov' + (opts && opts.mid ? ' mid' : '');
    ov.id = id;
    ov.innerHTML = '<div class="k17-sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '-h" data-testid="' + id + '">' + html + '</div>';
    var back = document.activeElement;
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); k17Close(); } else if (e.key === 'Tab') trapTab(ov, e); }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-k17="close"]')) k17Close(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', onKey, true);
    K17.sheet = { id: id, ov: ov, refresh: opts && opts.refresh, close: function () { document.removeEventListener('keydown', onKey, true); if (ov.parentNode) ov.parentNode.removeChild(ov); if (back && document.body.contains(back)) try { back.focus({ preventScroll: true }); } catch (e) { } } };
    var f = ov.querySelector('[autofocus]') || ov.querySelector('input, button:not([data-k17="close"])');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    return ov;
  }
  function k17Close() { var s = K17.sheet; K17.sheet = null; if (s) s.close(); }
  function k17Head(id, title) { return '<div class="k17-grab"></div><div class="k17-sh"><h3 id="' + id + '-h">' + esc(title) + '</h3><button type="button" class="k17-x" data-k17="close" aria-label="Lukk">✕</button></div>'; }

  // Husstandens navn
  function openNameSheet() {
    var ov = k17Open('k17-navn', k17Head('k17-navn', 'Husstandens navn') +
      '<form data-k17="navn"><div class="k17-field"><label for="k17-navn-in">Navn</label><input class="k17-in" id="k17-navn-in" maxlength="40" required value="' + esc(hhName() || 'Hjemme') + '" data-testid="k17-navn-felt" autofocus>' +
      '<p class="hint">Alle i husstanden ser navnet.</p></div><div class="k17-acts"><button type="button" class="k17-btn" data-k17="close">Avbryt</button><button type="submit" class="k17-btn pri" data-testid="k17-navn-lagre">Lagre</button></div></form>');
    ov.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); saveName(ov.querySelector('input').value); k17Close(); });
  }
  function saveName(v) {
    v = String(v || '').trim().slice(0, 40);
    if (!v || !hh) return;
    K17.name = v;
    Sync.write.setProfile(hh.hid, v).catch(function () { toast('Fikk ikke lagret navnet. Prøv igjen.'); });
    renderHousehold();
  }

  // Enhetsarket: navn, type, tilhører; «Fjern fra husstanden» (andre) eller «Forlat» (egen)
  function openDeviceSheet(uid) {
    var d = deviceList().filter(function (x) { return x.id === uid; })[0];
    if (!d) return;
    var type = d.type;
    var sug = d.known && !d.nameSet && d.platform ? devSuggestion(d.platform) : '';
    var h = k17Head('k17-enhet-ark', d.me ? 'Denne enheten' : d.name) +
      (d.known ? '<form data-k17="enhet">' +
        '<div class="k17-field"><label for="k17-en-navn">Navn</label><input class="k17-in" id="k17-en-navn" name="name" maxlength="40" required value="' + esc(d.name) + '" data-testid="k17-enhet-navn">' +
        '<p class="hint">' + (sug ? 'Forslag fra enheten var «' + esc(sug) + '». ' : '') + 'Alle i husstanden ser navnet.</p></div>' +
        '<div class="k17-field"><label>Type</label><div class="k17-seg" role="radiogroup">' +
          [['person', 'Person'], ['kjokken', 'Kjøkkenskjerm']].map(function (x) { return '<button type="button" role="radio" data-k17t="' + x[0] + '" aria-checked="' + (type === x[0]) + '" class="' + (type === x[0] ? 'on' : '') + '" data-testid="k17-type-' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="k17-field"><label for="k17-en-eier">Tilhører</label><input class="k17-in" id="k17-en-eier" name="owner" maxlength="40" value="' + esc(d.owner) + '" placeholder="F.eks. Lena, Alle eller Kjøkkenet" data-testid="k17-enhet-eier"></div>' +
        '<p class="k17-note">' + (d.last != null ? 'Sist aktiv ' + esc(agoText(d.last)) : '') + (d.joined ? ' · koblet til ' + dm(d.joined) : '') + '</p>' +
        '<div class="k17-acts"><button type="submit" class="k17-btn pri" data-testid="k17-enhet-lagre">Lagre</button></div></form>'
        : '<p class="k17-note">Denne enheten har ikke åpnet Knaggen 0.17 ennå, så vi vet ikke hva den er. Koblet til ' + (d.joined ? dm(d.joined) : 'tidligere') + '.</p>') +
      '<div class="k17-acts">' + (d.me ? '<button type="button" class="k17-btn txt full" data-k17="forlat" data-testid="k17-forlat">Forlat ' + esc(hhName() || 'husstanden') + '</button>'
        : '<button type="button" class="k17-btn txt full" data-k17="fjern" data-testid="k17-fjern">Fjern fra husstanden</button>') + '</div>';
    var ov = k17Open('k17-enhet-ark', h);
    ov.addEventListener('click', function (e) {
      var t = e.target.closest('[data-k17t]');
      if (t) { type = t.getAttribute('data-k17t'); ov.querySelectorAll('[data-k17t]').forEach(function (b) { var on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); return; }
      var a = e.target.closest('[data-k17]');
      if (!a) return;
      var k = a.getAttribute('data-k17');
      if (k === 'forlat') { k17Close(); openLeave(); }
      else if (k === 'fjern') { k17Close(); confirmRemove(d); }
    });
    var f = ov.querySelector('form');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim().slice(0, 40), owner = f.owner.value.trim().slice(0, 40);
      if (!name || !hh) return;
      var fields = { name: name, type: type, owner_label: owner || null, name_set: true };
      Sync.write.updateDevice(hh.hid, d.id, fields).catch(function () { toast('Fikk ikke lagret. Prøv igjen.'); });
      if (d.me) { if (type === 'kjokken') lsSet('knaggen:start-kjokken', 'true'); }
      k17Close();
    });
  }
  function confirmRemove(d) {
    var hn = hhName() || 'husstanden';
    ask({ id: 'k17-fjern-bekreft', title: 'Fjerne ' + d.name + '?', text: 'Den mister tilgang til ' + hn + '. Uka, lista og de andre enhetene påvirkes ikke.', ok: 'Fjern', cancel: 'Avbryt', danger: true }).then(function (ok) {
      if (!ok || !hh) return;
      Sync.write.removeDevice(hh.hid, d.id).then(function () { toast(d.name + ' er fjernet'); }, function (e) {
        toast(e && e.code === 'permission-denied' ? 'Fikk ikke fjerne enheten (reglene er ikke oppdatert ennå).' : 'Fikk ikke kontakt. Prøv igjen.', 5000);
      });
    });
  }

  // Legg til enhet eller person: ett ark med tre valg, så koden (samme invitasjon for alle tre)
  function openAddSheet(kind) {
    if (!kind) {
      var ch = [['person', 'En person', 'Send en melding med lenke eller kode'], ['min', 'En av mine enheter', 'Vis koden her og skriv den inn på den andre'], ['kjokken', 'Nettbrett som kjøkkenskjerm', 'Henter kalendere og avganger selv']];
      k17Open('k17-legg-til-ark', k17Head('k17-legg-til-ark', 'Legg til enhet eller person') +
        '<div class="k17-grp">' + ch.map(function (c) { return '<button type="button" class="k17-row" data-k17v="' + c[0] + '" data-testid="k17-valg-' + c[0] + '"><span class="t"><b>' + c[1] + '</b><span>' + c[2] + '</span></span><span class="go" aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
        '<p class="k17-note">Alle tre bruker samme invitasjon. Koden gjelder i 7 dager.</p>').addEventListener('click', function (e) {
        var b = e.target.closest('[data-k17v]'); if (b) openAddSheet(b.getAttribute('data-k17v'));
      });
      return;
    }
    var title = kind === 'person' ? 'Inviter en person' : kind === 'min' ? 'Legg til en av mine enheter' : 'Nettbrett som kjøkkenskjerm';
    function body() {
      var inv = validInvite(), h = k17Head('k17-kode-ark', title);
      h += inv ? '<div class="k17-code" data-testid="k17-kode">' + esc(fmtCode(inv.code)) + '</div><p class="k17-note" style="text-align:center">Gyldig til ' + dm(inv.expires_at) + '</p>'
        : ui.inviteErr ? '<p class="form-error" role="alert">' + esc(ui.inviteErr) + '</p>' : '<p class="inv-wait" role="status">Lager koden …</p>';
      if (kind === 'person') h += '<div class="k17-acts"><button type="button" class="k17-btn pri" data-action="hs-inviter" data-testid="k17-inviter">Inviter med melding</button><button type="button" class="k17-btn" data-action="copy-link">Kopier lenke</button></div>';
      else h += '<ol class="k17-steps"><li>Åpne <b>app.knaggen.no</b> på ' + (kind === 'kjokken' ? 'nettbrettet' : 'den andre enheten') + '.</li><li>Velg «Koble til med lenke eller kode» under Husstand, og skriv inn koden.</li>' +
        (kind === 'kjokken' ? '<li>Velg «Kjøkkenskjerm» når den spør hva enheten er. Kalendere og avganger hentes fra husstanden, så du trenger ikke sette opp noe mer.</li>' : '') + '</ol>' +
        '<div class="k17-acts"><button type="button" class="k17-btn" data-action="copy-link">Kopier lenke</button></div>';
      return h;
    }
    var ov = k17Open('k17-kode-ark', body(), { refresh: function () { var s = ov.querySelector('.k17-sheet'); if (s) s.innerHTML = body(); } });
    if (!validInvite()) {
      ui.inviteErr = '';
      ensureInvite(false).then(function () { if (K17.sheet && K17.sheet.refresh) K17.sheet.refresh(); }, function (e) { ui.inviteErr = inviteErrText(e); if (K17.sheet && K17.sheet.refresh) K17.sheet.refresh(); });
    }
    // knappene med data-action håndteres av hovedlytteren på main; arket ligger utenfor main
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('[data-action]'); if (!b) return;
      var a = b.getAttribute('data-action');
      if (a === 'copy-link') copyInviteLink(); else if (a === 'hs-inviter') { var x = main.querySelector('[data-action="hs-inviter"]'); if (x) x.click(); else copyInviteLink(); }
    });
  }

  // «Delt» er bare status (spec §4): et lite ark med hvem vi er i synk med
  function openSyncSheet() {
    var st = document.getElementById('sync-status'), txt = st ? st.textContent : 'Delt';
    var h = k17Head('k17-delt', txt === 'Delt' ? 'Synkronisert' : txt) +
      '<p data-testid="k17-delt-tekst">' + (txt === 'Delt' ? 'Synkronisert med <b>' + esc(hhName() || 'husstanden') + '</b>' : esc(txt) + ' · <b>' + esc(hhName() || 'husstanden') + '</b>') + '</p>' +
      '<p class="k17-note">' + esc(countText()) + '</p>' +
      '<div class="k17-grp" style="margin-top:12px"><a class="k17-row" href="#husstand" data-k17="close" data-testid="k17-apne-husstand"><span class="t"><b>Åpne Husstand</b></span><span class="go" aria-hidden="true">›</span></a></div>' +
      '<p class="k17-note">Uten nett kan du fortsatt bruke lista. Endringene sendes når enheten er på nett igjen.</p>';
    k17Open('k17-delt', h);
  }
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('#sync-link');
    if (!l || !hh || V010_LAYOUT) return;
    e.preventDefault();
    openSyncSheet();
  }, true);

  // «Hva er denne enheten?» etter tilkobling (ikke modalt, så ingenting blokkeres)
  function kindBannerHtml() {
    if (!hh || lsGet(KIND_ASK_KEY) !== hh.hid) return '';
    return '<div class="k17-banner" data-testid="k17-hva"><b>Hva er denne enheten?</b><p>Velg Kjøkkenskjerm for et nettbrett på kjøkkenet. Den starter da rett på kjøkkenskjermen.</p>' +
      '<div class="row"><button type="button" class="k17-btn pri" data-action="k17-hva" data-v="kjokken" data-testid="k17-hva-kjokken">Kjøkkenskjerm</button>' +
      '<button type="button" class="k17-btn" data-action="k17-hva" data-v="person" data-testid="k17-hva-person">Min enhet</button></div></div>';
  }
  function showKindBanner() {
    var pg = main.querySelector('.page');
    if (pg && !pg.querySelector('[data-testid="k17-hva"]')) pg.insertAdjacentHTML('afterbegin', kindBannerHtml());
  }
  function answerKind(v) {
    lsDel(KIND_ASK_KEY);
    var me = myUid(), mine = (K17.devices || []).filter(function (d) { return d.id === me; })[0];
    if (v === 'kjokken') lsSet('knaggen:start-kjokken', 'true');
    if (hh && mine) Sync.write.updateDevice(hh.hid, me, v === 'kjokken' ? { type: 'kjokken', name: mine.name_set ? mine.name : 'Kjøkkenskjerm', owner_label: mine.owner_label || 'Kjøkkenet' } : { type: 'person' }).catch(function () { });
    else lsSet(KIND_ASK_KEY + ':valg', JSON.stringify({ type: v }));
    var b = document.querySelector('[data-testid="k17-hva"]'); if (b) b.parentNode.removeChild(b);
    if (v === 'kjokken') { location.hash = '#kjokken'; toast('Kjøkkenskjermen starter her neste gang. Legg Knaggen på hjem-skjermen for å åpne den raskt.', 6000); }
  }

  // Husstand-siden (v0.17, spec §4 / skissen husstand). Uten husstand vises v0.16-siden (opprett / koble til).
  function renderHouseholdV017() {
    var prev = main.querySelectorAll('[data-page="husstand"] details');
    if (prev.length) { HS_OPEN = {}; prev.forEach(function (d) { if (d.open) HS_OPEN[d.getAttribute('data-sec')] = true; }); }
    if (/^#husstand\/hverdag/.test(location.hash)) HS_OPEN.hverdag = true;
    if (/^#husstand\/del/.test(location.hash) || ui.justCreated) HS_OPEN.del = true;
    var hp = hsPeople() || { voksen: 2, barn: 2, smabarn: 0 }, hasP = !!hsPeople(), name = hhName();
    function sec(key, title, sum, body, testid) {
      return '<details class="hs-sec k17-dsec" data-sec="' + key + '" data-testid="hs-sek-' + testid + '"' + (HS_OPEN[key] ? ' open' : '') + '>' +
        '<summary><span class="t"><b>' + title + '</b><span class="hs-sum-line" data-testid="hs-sum-' + testid + '">' + esc(sum) + '</span></span><span class="go" aria-hidden="true">›</span></summary>' +
        '<div class="hs-sec-body">' + body + '</div></details>';
    }
    function lbl(t) { return '<p class="k17-lbl">' + t + '</p>'; }
    var off = !navigator.onLine || syncStatus.fromCache || syncStatus.failed;
    var h = '<section class="page k17" data-page="husstand" data-v17="1">';
    h += '<div class="k17-head"><div class="t"><button type="button" class="k17-name" data-action="k17-navn" data-testid="k17-hh-navn">' + esc(name || 'Husstand') + (name ? ' <span class="pen">Endre</span>' : '') + '</button>' +
      '<div class="k17-sub" data-testid="k17-hh-sub"><span class="dot">●</span> ' + esc(countText()) + ' · ' + (off ? 'frakoblet' : 'synkronisert') + '</div></div>' +
      '<a class="btn" href="#uke" data-testid="husstand-tilbake">Tilbake</a></div>';
    if (!name && lsGet(NAME_LATER_KEY) !== hh.hid) h += '<div class="k17-banner" data-testid="k17-navn-banner"><b>Gi husstanden et navn</b><p>Så ser alle enhetene hvilken husstand de er med i.</p>' +
      '<div class="row"><input class="k17-in" id="k17-banner-in" maxlength="40" value="Hjemme" aria-label="Navn på husstanden" data-testid="k17-banner-felt"></div><div class="row" style="margin-top:8px"><button type="button" class="k17-btn pri" data-action="k17-banner-lagre" data-testid="k17-banner-lagre">Lagre</button><button type="button" class="k17-btn" data-action="k17-banner-senere" data-testid="k17-banner-senere">Senere</button></div></div>';
    h += kindBannerHtml();
    if (ui.justCreated) h += '<p class="notice" data-testid="opprettet">Husstanden er opprettet' + (ui.movedOwn ? ', og rettene, uka og lista fra denne telefonen er flyttet inn.' : '.') + ' Legg til de andre under Enheter.</p>';
    // 1. Enheter
    h += lbl('Enheter') + devicesHtml();
    // 2. Middag
    var scalePref = hsState().scale !== false, lim = weekdayLimit();
    var b1 = peopleCountersHtml('hsh', hasP ? hsPeople() : hp, { testid: 'hs-innstillinger' }) +
      '<button type="button" class="hs-switch" role="switch" data-action="hs-scale-toggle" aria-checked="' + (scalePref ? 'true' : 'false') + '" data-testid="hs-tilpass-bryter">' +
      '<div class="t"><b>Tilpass retter fra Knaggen</b><span>Egne retter endres ikke</span></div><span class="sw' + (scalePref ? ' on' : '') + '" aria-hidden="true"></span></button>' +
      '<p class="hs-note">Vektene følger Helsedirektoratets energibehov (omtrent). Under 1 år telles ikke.</p>' +
      '<div class="form-actions plain"><button type="button" class="btn primary" data-action="hs-lagre-innstillinger" data-testid="hs-lagre">Lagre</button></div>';
    var b2 = '<fieldset class="hv-limit"><legend class="sr-only">Middag i hverdagen</legend>' + [[0, 'Ingen grense'], [20, 'Helst under 20 min'], [30, 'Helst under 30 min'], [45, 'Helst under 45 min']].map(function (x) {
      return '<label class="hv-opt"><input type="radio" name="hv-limit" value="' + x[0] + '" data-testid="hv-grense-' + x[0] + '"' + ((lim || 0) === x[0] ? ' checked' : '') + '> ' + x[1] + '</label>';
    }).join('') + '</fieldset><p class="hs-note">Gjelder aktiv tid ved benken. Matrett-byggeren forhåndsvelger tidsfilteret, og «Fyll man–fre» velger helst retter innenfor grensen.</p>';
    h += lbl('Middag') + '<div class="k17-dgrp">' + sec('husstanden', 'Hvem spiser middag', hasP ? SC.peopleText(hsPeople(), true) + ' · ' + fmtPor(SC.porsjoner(hsPeople())) + ' porsjoner' : 'Ikke satt – regnes som 4', b1, 'husstanden') +
      sec('hverdag', 'Middag i hverdagen', lim ? 'Helst under ' + lim + ' min' : 'Ingen grense', b2, 'hverdag') + '</div>';
    // 3. Faste varer
    var nS = state.staples.length;
    h += lbl('Handleliste') + '<div class="k17-grp"><a class="k17-row" href="#liste/faste" data-testid="hs-sek-faste"><span class="t"><b>Faste varer</b><span>' + (nS ? nS + (nS === 1 ? ' vare' : ' varer') : 'Ingen ennå') + '</span></span><span class="go" aria-hidden="true">›</span></a></div>';
    // 4. Kjøkkenskjerm · felles
    var ks = K17.kitchen && K17.kitchen.stops.length ? K17.kitchen.stops.map(function (s) { return s.name; }).join(' + ') : 'Ingen holdeplasser ennå';
    h += lbl('Kjøkkenskjerm · felles') + '<div class="k17-grp"><a class="k17-row" href="#kjokken/innstillinger/avg" data-testid="hs-kjokken"><span class="t"><b>Kalendere og avganger</b><span>' + esc(ks) + '</span></span><span class="go" aria-hidden="true">›</span></a></div>' +
      '<p class="k17-note">Felles for alle skjermer i husstanden. Leggetid og sted for vær stilles på hver skjerm.</p>';
    // 5. Denne enheten
    var me = deviceList().filter(function (d) { return d.me; })[0];
    h += lbl('Denne enheten') + '<div class="k17-grp">' +
      (me ? '<button type="button" class="k17-row" data-action="k17-enhet" data-uid="' + esc(me.id) + '" data-testid="k17-denne-navn"><span class="t"><b>Navn</b><span>' + esc(me.name) + '</span></span><span class="go" aria-hidden="true">›</span></button>' : '') +
      '<a class="k17-row" href="#kjokken/innstillinger" data-testid="k17-start-kjokken"><span class="t"><b>Start som kjøkkenskjerm</b><span>' + (startKitchenOn() ? 'På' : 'Av') + '</span></span><span class="go" aria-hidden="true">›</span></a>' +
      '<button type="button" class="k17-row" role="switch" aria-checked="' + naPosOn() + '" data-action="na-posisjon" data-testid="hs-posisjon"><span class="t"><b>Bruk posisjon i «Nå»</b><span>' + (naPosOn() ? 'På · bytter Hjemme/Borte og finner holdeplasser nær deg' : 'Av') + '</span></span><span class="go" aria-hidden="true">' + (naPosOn() ? 'På' : 'Av') + '</span></button>' +
      (envInfo.phone && !isStandalone() ? '<button type="button" class="k17-row" data-action="inst-open" data-testid="hs-hjemskjerm"><span class="t"><b>Legg på hjemskjermen</b><span>Slik gjør du det</span></span><span class="go" aria-hidden="true">›</span></button>' : '') +
      '<a class="k17-row" href="#koble" data-testid="hs-koble"><span class="t"><b>Bytt husstand</b><span>Koble til med lenke eller kode</span></span><span class="go" aria-hidden="true">›</span></a>' +
      '<button type="button" class="k17-row k17-danger" data-action="hs-forlat" data-testid="hs-forlat"><span class="t"><b>Forlat ' + esc(name || 'husstanden') + '</b></span></button></div>';
    // 6. Avansert (lukket)
    var inv = validInvite();
    var b6 = '<div id="hs-deling"><ul class="hs-group">' +
      '<li class="hs-code">' + (inv ? '<div class="code small"><span><b data-testid="hs-kode">' + fmtCode(inv.code) + '</b><br><span class="sub">Kode til invitasjonen · gjelder til ' + dm(inv.expires_at) + '</span></span></div>' : ui.inviteBusy ? '<p class="inv-wait" role="status">Lager koden …</p>' : '') +
      (ui.inviteErr ? '<p class="form-error" role="alert" data-testid="hs-kode-feil">' + esc(ui.inviteErr) + '</p>' : '') +
      '<div class="inv-acts"><div class="row"><button type="button" class="btn" data-action="hs-inviter" data-testid="hs-inviter">' + IC.msg + 'Inviter med melding</button>' +
      '<button type="button" class="btn" data-action="copy-link" data-testid="kopier-lenke">' + IC.copy + 'Kopier lenke</button>' +
      '<button type="button" class="btn" data-action="hs-ny-kode" data-testid="hs-ny-kode">Lag ny kode</button></div></div></li></ul>' +
      '<label class="field"><span>Varig lenke</span><input type="text" id="share-link" readonly value="' + esc(shareLink()) + '"></label>' +
      '<button type="button" class="btn small" data-action="copy-long" data-testid="kopier-varig">Kopier varig lenke</button>' +
      '<p class="hint">Virker også etter 7 dager. Alle som har lenka kan se og endre dataene. Å fjerne en enhet gjør ikke lenka ugyldig.</p></div>' +
      '<ul class="hs-group"><li><button type="button" class="hs-row" data-action="hs-slett-lenker" data-testid="hs-slett-lenker"><span class="t"><b>Slett Oda-lenker</b><span>Lenker fra «Del lista til Oda» slutter å virke.</span></span><span class="go" aria-hidden="true">›</span></button></li>' +
      '<li><button type="button" class="hs-row k17-danger" data-action="hs-slett" data-testid="hs-slett"><span class="t"><b>Slett husstanden</b><span>For alle enheter. Kan ikke angres.</span></span></button></li></ul>';
    h += '<div style="height:16px"></div><span id="deling"></span>' + sec('del', 'Avansert', 'Varig lenke, ny kode, Oda-lenker, slett', b6, 'avansert');
    if (ui.justCreated) h += '<div class="form-actions plain"><a class="btn" href="#uke">Ferdig</a></div>';
    h += '</section>';
    main.innerHTML = h;
  }

  /* --- Husstand: Deling (11) og Denne telefonen --- */
  function delingHtml() {
    var h = '';
    if (hh) {
      var n = ui.members, inv = validInvite();
      var phones = ''; for (var i = 0; i < Math.min(3, Math.max(1, n || 1)); i++) phones += IC.phone;
      h += '<ul class="hs-group"><li><span class="phones">' + phones + '</span><span class="t"><b data-testid="hs-koblet">' +
        (n ? n + ' koblet til husstanden' : 'Delt husstand') + '</b><span>Hver telefon eller nettleser teller én</span></span></li>' +
        '<li class="hs-code">' +
        (inv ? '<div class="code small"><span><b data-testid="hs-kode">' + fmtCode(inv.code) + '</b><br><span class="sub">Kode til invitasjonen · gjelder til ' + dm(inv.expires_at) + '</span></span></div>'
          : ui.inviteBusy ? '<p class="inv-wait" role="status">Lager koden …</p>' : '') +
        (ui.inviteErr ? '<p class="form-error" role="alert" data-testid="hs-kode-feil">' + esc(ui.inviteErr) + '</p>' : '') +
        '<div class="inv-acts"><button type="button" class="btn primary" data-action="hs-inviter" data-testid="hs-inviter">' + IC.msg + 'Inviter med melding</button>' +
        '<div class="row"><button type="button" class="btn" data-action="copy-link" data-testid="kopier-lenke">' + IC.copy + 'Kopier lenke</button>' +
        '<button type="button" class="btn" data-action="hs-ny-kode" data-testid="hs-ny-kode">Lag ny kode</button></div></div></li></ul>' +
        '<details class="hs-long"' + (ui.justCreated || ui.longOpen ? ' open' : '') + '><summary data-testid="les-mer">' + (V010_LAYOUT ? 'Varig lenke til husstanden' : 'Les mer om lenka og koden') + '</summary>' +
        '<label class="field"><span>Delingslenke</span><input type="text" id="share-link" readonly value="' + esc(shareLink()) + '"></label>' +
        '<button type="button" class="btn small" data-action="copy-long" data-testid="kopier-varig">Kopier varig lenke</button>' +
        '<p class="hint">Virker også etter 7 dager. Alle som har lenka kan se og endre dataene. Del den bare med husstanden.</p></details>';
    }
    return h;
  }
  function refreshDeling() {
    var box = document.getElementById('hs-deling');
    if (!box) return;
    var d = box.querySelector('details.hs-long');
    ui.longOpen = !!(d && d.open);
    box.innerHTML = delingHtml();
    ui.longOpen = false;
  }
  function phoneRowsHtml() {
    var h = '<ul class="hs-group">';
    if (envInfo.phone && !isStandalone()) h += '<li><button type="button" class="hs-row" data-action="inst-open" data-testid="hs-hjemskjerm"><img class="mini" src="icons/icon-192-mork.png" alt=""><span class="t"><b>Legg Knaggen på hjemskjermen</b><span>Så finner du lista igjen</span></span><span class="go" aria-hidden="true">›</span></button></li>';
    h += '<li><a class="hs-row" href="#koble" data-testid="hs-koble"><span class="ic">' + IC.paste + '</span><span class="t"><b>Koble til med lenke eller kode</b><span>' + (hh ? 'Bytter husstand på denne telefonen' : 'Hvis den andre allerede har en husstand') + '</span></span><span class="go" aria-hidden="true">›</span></a></li>';
    // v0.16: ⚙ for kjøkkenskjermen nås herfra (ikke fra hvileskjermen)
    h += '<li><a class="hs-row" href="#kjokken/innstillinger" data-testid="hs-kjokken"><span class="t"><b>Kjøkkenskjerm</b><span>Avganger, kalendere og leggetid på denne enheten</span></span><span class="go" aria-hidden="true">›</span></a></li>';
    // v0.10: Forlat husstanden (bare når telefonen er med i en)
    // v0.14: «Slett delte lenker» – lenkene fra «Del lista til Oda» slutter å virke med en gang
    if (hh) h += '<li><button type="button" class="hs-row" data-action="hs-slett-lenker" data-testid="hs-slett-lenker"><span class="t"><b>Slett delte lenker</b><span>Lenker fra «Del lista til Oda» slutter å virke.</span></span><span class="go" aria-hidden="true">›</span></button></li>';
    if (hh) h += '<li><button type="button" class="hs-row" data-action="hs-forlat" data-testid="hs-forlat"><span class="t"><b>Forlat husstanden</b><span>De andre beholder husstanden.</span></span><span class="go" aria-hidden="true">›</span></button></li>';
    return h + '</ul>';
  }
  function deleteShareLinks() {
    if (!hh || !Sync || !Sync.deleteShareLists) return;
    ask({ id: 'slett-lenker', title: 'Slette delte lenker?', text: 'Lenkene fra «Del lista til Oda» slutter å virke for hele husstanden.', ok: 'Slett lenkene', cancel: 'Avbryt' }).then(function (ok) {
      if (!ok || !hh) return;
      Sync.deleteShareLists(hh.hid).then(function (r) {
        var n = r && r.deleted || 0;
        toast(n ? (n === 1 ? '1 lenke er slettet' : n + ' lenker er slettet') : 'Det var ingen delte lenker');
      }, function () { toast('Fikk ikke kontakt med Knaggen. Prøv igjen.'); });
    });
  }
  /* --- v0.10 (spec punkt 4): Forlat og Slett husstanden --- */
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorer */ } }
  function readLeft() { try { var v = JSON.parse(lsGet(LEFT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function leftAt(hid) { var x = readLeft().filter(function (l) { return l && l.hid === hid; })[0]; return x ? x.at : 0; }
  function addLeft(hid) { var l = readLeft().filter(function (x) { return x && x.hid !== hid; }); l.push({ hid: hid, at: Date.now() }); lsSet(LEFT_KEY, JSON.stringify(l.slice(-20))); }
  function removeLeft(hid) { lsSet(LEFT_KEY, JSON.stringify(readLeft().filter(function (x) { return x && x.hid !== hid; }))); }
  // Den gamle lenka (og koder laget før telefonen forlot) virker ikke på denne telefonen; en ny invitasjon virker.
  function leftBlocks(hid, inviteExpires, inviteCreated) {
    var at = leftAt(hid);
    if (!at) return false;
    if (inviteCreated) return inviteCreated < at;
    if (!inviteExpires) return true;
    return inviteExpires - 7 * 864e5 < at;
  }
  // Stopper husstanden på denne telefonen (lytter, lokal husstand, speil og byttekø).
  function dropHousehold() {
    var hid = hh && hh.hid;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    hh = null; syncReady = null; swapOverlays = []; lastDays = []; weeklyExtras = []; sharedExtras = []; migratingHid = null;
    ui.members = null; ui.invite = null; ui.justCreated = false; ui.busy = false;
    K17.name = ''; K17.devices = null; K17.memberDocs = null; K17.selfSeen = false; K17.creating = false; K17.kitchen = null; K17.kitchenSeen = false; k17Close(); lsDel(K17_REG_KEY);
    clearTimeout(connectTimer); syncStatus.connecting = false;
    lsDel(HH_KEY);
    if (hid) { lsDel(MIRROR_PREFIX + hid); lsDel(SWAPQ_PREFIX + hid); }
    renderSyncStatus();
    return hid;
  }
  // Tilbake til introen med blankt ark (porsjoner og hele første runde på nytt).
  function resetToIntro(notice) {
    state = freshState();
    tagKnaggenRecipes();
    save();
    [HS_ASKED_KEY, WELCOME_KEY, START_KEY, ONBOARD_KEY].forEach(lsDel);
    ui.welcomeClosed = false; ui.welcomeShown = false; ui.showDone = false; ui.weekOffset = 0; ui.weekTouched = false;
    ui.introNotice = notice || '';
    history.replaceState(null, '', location.pathname + location.search + '#uke');
    setTabsHidden(false);
    route();
    window.scrollTo(0, 0);
  }
  // Husstanden slettes fra en annen telefon: spør serveren til medlemskapet er borte (høyst ett minutt).
  function watchGone() {
    if (!hh || watchGone.hid === hh.hid) return;
    var cur = hh, t0 = Date.now();
    watchGone.hid = cur.hid;
    (function tick() {
      if (hh !== cur) { watchGone.hid = null; return; }
      Sync.stillMember(cur.hid).then(function (m) {
        if (hh !== cur) { watchGone.hid = null; return; }
        if (m === false) { watchGone.hid = null; householdGone(); return; }
        if (Date.now() - t0 > 60000) { watchGone.hid = null; return; }
        setTimeout(tick, 1500);
      });
    })();
  }
  function checkGone() {
    if (!hh || checkGone.busy) return;
    if (lsGet(K17_REG_KEY) === hh.hid) { checkRemoved(); return; }
    var cur = hh;
    checkGone.busy = true;
    Sync.joinHousehold(cur.hid, cur.secret).then(function () {
      checkGone.busy = false;
      if (hh === cur) subscribeHousehold();
    }, function (e) {
      checkGone.busy = false;
      if (hh === cur && e && e.code === 'permission-denied') householdGone();
    });
  }
  function householdGone() {
    if (!hh || ui.deleting) return;
    dropHousehold();
    resetToIntro('Husstanden er slettet.');
    toast('Husstanden er slettet.', 6000);
  }
  function openLeave() {
    if (!hh) return;
    ask({ id: 'forlat', title: 'Forlat husstanden', text: 'De andre beholder husstanden.', cancel: 'Avbryt', choices: [
      { v: 'ny', label: 'Start på nytt', sub: 'Tilbake til starten med tom liste. Ingenting fra husstanden følger med.' },
      { v: 'ta-med', label: 'Ta med til ny husstand', sub: 'Rettene, uka, lista og porsjonene kopieres til en ny husstand bare for denne telefonen.' }
    ] }).then(function (v) {
      if (v === 'ny') leaveStartOver();
      else if (v === 'ta-med') leaveTakeAlong();
    });
  }
  // A. Start på nytt: medlemskapet slettes (tallet går ned), alt lokalt om husstanden slettes, og telefonen går til introen.
  function leaveStartOver() {
    var hid = hh.hid, ready = syncReady;
    if (ready) ready.then(function (S) { return S.leaveHousehold(hid); }).catch(function () { /* frakoblet: sendes senere */ });
    dropHousehold();
    addLeft(hid);
    resetToIntro('');
    toast('Du har forlatt husstanden', 4000);
  }
  // B. Ta med til ny husstand: kopi av retter, uke, liste (bare det som ikke er handlet) og porsjoner til en ny husstand.
  // Den gamle røres ikke; denne telefonen slettes fra medlemmene der.
  function takeAlongCopy() {
    var c = JSON.parse(JSON.stringify(state));
    var built = buildList(true), now = Date.now();
    var adj = JSON.parse(JSON.stringify(state.list_adjust[LIST_KEY] || {}));
    var checks = {}, at = {}, dropExtra = {};
    built.items.forEach(function (it) {
      if (!it.checked) return;
      it.extra_ids.forEach(function (id) { dropExtra[id] = 1; });
      it.staple_ids.forEach(function (id) { adj[FAST_PREFIX + id] = -1; });
      // Middagsvarer som er handlet, holdes utenfor den nye lista til de utløper som vanlig
      if (it.sources.indexOf('dinner') >= 0) { checks[it.key] = it.tick; at[it.key] = it.doneAt || now; }
    });
    adj[MIGRATED_MARK] = 1;
    c.checks = {}; c.checks[LIST_KEY] = checks;
    c.check_at = at;
    c.list_adjust = {}; c.list_adjust[LIST_KEY] = adj;
    c.list_extras = (state.list_extras || []).filter(function (x) { return x.week === LIST_KEY && !dropExtra[x.id]; });
    c.list_items = [];
    return c;
  }
  function leaveTakeAlong() {
    if (ui.busy || !hh) return;
    var oldHid = hh.hid, ready = syncReady, copy = takeAlongCopy();
    ui.busy = true;
    toast('Lager ny husstand …', 20000);
    Sync.init().then(function () {
      return Sync.createHousehold({
        recipes: copy.recipes, staples: copy.staples, week_plan: copy.week_plan, oneoffs: copy.oneoffs, marks: copy.marks || {},
        checks: remoteChecksByWeek(copy.checks, copy.check_at), list_adjust: copy.list_adjust, list_extras: copy.list_extras,
        household_size: copy.household_size, day_people: copy.day_people
      }, null);
    }).then(function (v) {
      ui.busy = false;
      if (ready) ready.then(function (S) { return S.leaveHousehold(oldHid); }).catch(function () { /* ignorer */ });
      dropHousehold();
      var info = { hid: v.hid, secret: v.secret, core_done: true, migrated: true };
      writeHH(info);
      enterHousehold(info, copy);
      saveMirror();
      location.hash = '#husstand';
      route();
      toast('Ny husstand er laget, bare med denne telefonen. Den gamle er urørt.', 5000);
    }, function (e) {
      ui.busy = false;
      toast(errorText(e), 5000);
    });
  }
  function openDeleteHousehold() {
    if (!hh) return;
    ask({ id: 'slett-hus', title: 'Slette husstanden?', text: 'Dette sletter uka, lista og rettene for alle som er med. Det kan ikke angres.',
      typeWord: 'SLETT', ok: 'Slett husstanden', cancel: 'Avbryt', danger: true }).then(function (ok) {
      if (!ok || !hh) return;
      var hid = hh.hid, snapshot = JSON.parse(JSON.stringify(state)), ready = syncReady || Promise.reject(new Error('no-server'));
      ui.deleting = true;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }   // ellers får lytterne «ingen tilgang» midt i slettingen
      toast('Sletter husstanden …', 30000);
      ready.then(function (S) { return S.deleteHousehold(hid); }).then(function () {
        dropHousehold();
        ui.deleting = false;
        toast('Husstanden er slettet.', 4000);
        return ask({ id: 'behold-kopi', title: 'Beholde en kopi på denne telefonen?', text: 'Da ligger rettene, uka og lista bare her, uten husstand.',
          ok: 'Ja, behold', cancel: 'Nei' }).then(function (keep) {
          if (keep) {
            state = snapshot; state.list_items = []; save();
            history.replaceState(null, '', location.pathname + location.search + '#uke');
            route();
            toast('Kopien ligger på denne telefonen', 4000);
          } else resetToIntro('');
        });
      }, function (e) {
        ui.deleting = false;
        if (hh && hh.hid === hid) subscribeHousehold();
        toast(/no-server|unavailable|network|timeout/.test((e && (e.code || e.message)) || '') ? 'Får ikke kontakt. Sjekk at du har nett og prøv igjen.' : 'Kunne ikke slette husstanden (' + ((e && (e.code || e.message)) || '') + ')', 6000);
      });
    });
  }
  // «Ta med rettene dine inn?» – retter som ikke er urørte startretter
  function ownRecipes() {
    var seed = window.UKESHANDEL_SEED ? window.UKESHANDEL_SEED().recipes : [];
    return state.recipes.filter(function (r) {
      return !seed.some(function (s) { return s.id === r.id && normName(s.name) === normName(r.name) && seedIngSig(s) === seedIngSig(r); });
    });
  }
  function askBring(cb) {
    if (hh) { ui.bring = null; cb(); return; }
    var own = ownRecipes();
    if (!own.length) { ui.bring = null; cb(); return; }
    ask({ id: 'ta-med-retter', title: 'Ta med rettene dine inn?', text: own.length + (own.length === 1 ? ' rett' : ' retter') +
      ' på denne telefonen kan legges oppå husstandens. Uka og lista blir husstandens.', ok: 'Ja, ta med', cancel: 'Nei' }).then(function (yes) {
      ui.bring = yes ? { list: JSON.parse(JSON.stringify(own)) } : null;
      cb();
    });
  }
  // Etter Bli med: rettene legges oppå husstandens. Samme navn beholdes begge, med merket «Tatt med» på den som kom inn.
  function bringRecipesIn() {
    var b = ui.bring;
    ui.bring = null;
    if (!b || !hh) return;
    var n = 0;
    b.list.forEach(function (r) {
      if (/^lib-/.test(r.id)) {
        if (recipeById(r.id)) return;
        ops.saveRecipe(r, true); n++; return;
      }
      var same = state.recipes.filter(function (x) { return normName(x.name) === normName(r.name); });
      if (same.some(function (x) { return seedIngSig(x) === seedIngSig(r) && (x.minutes || null) === (r.minutes || null); })) return;   // helt lik: ikke dobbelt
      var c = JSON.parse(JSON.stringify(r));
      c.id = (same.length ? 'tm-' : 'r') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      ops.saveRecipe(c, true); n++;
    });
    if (n) toast(n + (n === 1 ? ' rett er tatt med inn' : ' retter er tatt med inn'), 4000);
  }

  // Kopiert eller delt fra Husstand teller også som «invitasjonen er sendt» (steg 3 ✓)
  function markInvited() { if (lsGet(START_KEY) === 'open') lsSet(START_KEY, 'done'); }
  function hsInvite() {
    var inv = validInvite();
    if (inv) { shareInvite(inv, markInvited); return; }
    openInviteSheet();
  }
  function hsNewCode() {
    ui.inviteBusy = true; ui.inviteErr = ''; refreshDeling();
    ensureInvite(true).then(function (inv) {
      ui.inviteBusy = false; refreshDeling();
      toast(inv.code ? 'Ny kode: ' + fmtCode(inv.code) + '. Den gamle virker ikke lenger.' : 'Koder er ikke slått på ennå. Bruk den varige lenka.', 5000);
    }, function (e) { ui.inviteBusy = false; ui.inviteErr = inviteErrText(e); refreshDeling(); });
  }
  function copyInviteLink() {
    var inv = validInvite();
    if (inv) { copyText(inviteLink(inv), 'Lenka er kopiert'); markInvited(); return; }
    ui.inviteBusy = true; refreshDeling();
    ensureInvite(false).then(function (x) {
      ui.inviteBusy = false; refreshDeling();
      copyText(inviteLink(x), 'Lenka er kopiert'); markInvited();
    }, function (e) { ui.inviteBusy = false; ui.inviteErr = inviteErrText(e); refreshDeling(); });
  }
  // «Den andre er med i husstanden nå» – én gang hos den som inviterte (§4)
  function membersChanged() {
    if (!hh) return;
    var n = ui.members || 0;
    if (n > 1 && lsGet(START_KEY) === 'open') { lsSet(START_KEY, 'done'); if (main.querySelector('[data-page="uke"]')) renderUke(); }
    var cur = readHH();
    if (cur && cur.hid === hh.hid && cur.invited && !cur.othersSeen && n > (cur.inviteBase || 1)) {
      cur.othersSeen = true; writeHH(cur); hh.othersSeen = true;
      toast('Den andre er med i husstanden nå', 4000);
    }
    var el = document.querySelector('[data-testid="hs-koblet"]');
    if (el) refreshDeling();
  }

  /* --- Trude (spec v0.9 punkt 5): samme vare med ulike navn blir én linje på lista --- */
  // Nøkkelen bruker enkel entall (tomat/tomater) og noen faste synonymer (lettmelk → melk). Visningsnavnet er det
  // første som kom inn (middagen først). Eldre avkrysning/+/- på det gamle navnet følger med (legacyKeys).
  var LIST_SYNONYMS = { 'lettmelk': 'melk', 'lett melk': 'melk', 'gulrøtter': 'gulrot', 'hvitløksfedd': 'hvitløk' };
  var LIST_NOT_PLURAL = /(sukker|pepper|krydder|pulver|filter|cider|liter|meter|vann|smør)$/;
  function listMergeName(nn) {
    if (LIST_SYNONYMS[nn]) return LIST_SYNONYMS[nn];
    if (LIST_NOT_PLURAL.test(nn)) return nn;
    // Enkle flertall og entall møtes i samme stamme: tomat/tomater → tomat, bleie/bleier → blei, eple/epler → epl.
    if (nn.length >= 5 && /[^e]er$/.test(nn)) return nn.slice(0, -2);
    if (nn.length >= 4 && /[^e]e$/.test(nn)) return nn.slice(0, -1);
    return nn;
  }

  // v0.9 (Trude): kortet for ny fast vare – brikkene viser valget, redigeringen åpnes under dem
  var FV_NEW_UNITS = ['stk', 'pk', 'l', 'kg', 'boks', 'glass', 'flaske', 'beger', 'pose', 'rull', 'kartong'];
  function fvNewSync(card) {
    var ga = card.getAttribute('data-aisle'), gu = card.getAttribute('data-unit'), gq = parseQty(card.getAttribute('data-qty')) || 1;
    var ed = card.getAttribute('data-ed') || '';
    var bAmt = card.querySelector('[data-field="amt"]'), bAisle = card.querySelector('[data-field="aisle"]');
    if (bAmt) { bAmt.innerHTML = '<span class="k">Mengde</span>' + esc(formatQty(gq) + ' ' + unitWord(gq, gu)); bAmt.setAttribute('aria-expanded', ed === 'amt' ? 'true' : 'false'); }
    if (bAisle) { bAisle.innerHTML = '<span class="k">Avdeling</span>' + esc(aisleLabel(ga)); bAisle.setAttribute('aria-expanded', ed === 'aisle' ? 'true' : 'false'); }
    var box = card.querySelector('#fv-new-ed');
    if (!box) return;
    var h = '';
    if (ed === 'amt') {
      h = '<div class="fv-new-qty"><button type="button" class="step" data-action="fv-new-step" data-dir="-1" aria-label="Mindre"' + (gq <= 1 ? ' disabled' : '') + '>−</button>' +
        '<input type="text" id="fv-new-qty" inputmode="decimal" value="' + esc(formatQty(gq)) + '" aria-label="Mengde" data-testid="faste-ny-antall">' +
        '<button type="button" class="step" data-action="fv-new-step" data-dir="1" aria-label="Mer">+</button></div>' +
        '<div class="fv-new-chips" role="group" aria-label="Enhet">' + FV_NEW_UNITS.map(function (u) {
          return '<button type="button" class="chip' + (u === gu ? ' on' : '') + '" aria-pressed="' + (u === gu) + '" data-action="fv-new-unit" data-unit="' + u + '" data-testid="faste-ny-enhet-' + u + '">' + u + '</button>';
        }).join('') + '</div>';
    } else if (ed === 'aisle') {
      h = '<div class="fv-new-chips" role="group" aria-label="Avdeling">' + AISLES.map(function (x) {
        return '<button type="button" class="chip' + (x === ga ? ' on' : '') + '" aria-pressed="' + (x === ga) + '" data-action="fv-new-aisle" data-aisle="' + esc(x) + '">' + esc(aisleLabel(x)) + '</button>';
      }).join('') + '</div>';
    }
    if (ed === 'amt' && document.activeElement && document.activeElement.id === 'fv-new-qty') {
      // Ikke tegn om feltet mens det skrives i; oppdater bare enhetsbrikkene
      var chips = box.querySelector('.fv-new-chips'); var tmp = document.createElement('div'); tmp.innerHTML = h;
      if (chips) chips.innerHTML = tmp.querySelector('.fv-new-chips').innerHTML;
      var minus = box.querySelector('[data-dir="-1"]'); if (minus) minus.disabled = gq <= 1;
    } else box.innerHTML = h;
    box.hidden = !h;
  }

  /* ---------- Hendelser ---------- */

  main.addEventListener('click', function (e) {
    var step = e.target.closest('[data-hs-step]');
    if (step) {
      e.preventDefault();
      var k = step.getAttribute('data-hs-k');
      var prefix = step.getAttribute('data-hs-prefix');
      var el = document.getElementById(prefix + '-' + k);
      if (!el) return;
      var n = parseInt(el.textContent, 10) || 0;
      n = Math.max(0, Math.min(12, n + parseInt(step.getAttribute('data-hs-step'), 10)));
      el.textContent = n;
      el.classList.toggle('zero', !n);
      // refresh +/− disabled
      var row = step.closest('li');
      if (row) {
        var minus = row.querySelector('[data-hs-step="-1"]');
        var plus = row.querySelector('[data-hs-step="1"]');
        if (minus) minus.disabled = n <= 0;
        if (plus) plus.disabled = n >= 12;
      }
      var sum = document.querySelector('[data-testid="' + prefix + '-sum"]');
      if (sum) {
        var p = readCounters(prefix);
        sum.innerHTML = 'Regnes som <b>' + fmtPor(SC.porsjoner(p)) + ' porsjoner</b>';
      }
      if (prefix === 'hsd' && ui.hsDayDate) updateDaySheetResult(ui.hsDayDate);
      return;
    }
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var a = btn.getAttribute('data-action');
    if (a === 'add-ing') {
      var list = document.getElementById('ing-list');
      list.insertAdjacentHTML('beforeend', ingredientRow(null));
      list.lastElementChild.querySelector('.ing-name').focus();
    } else if (a === 'remove-ing') {
      var row = btn.closest('.ing-row');
      row.parentNode.removeChild(row);
    } else if (a === 'finn-open') {
      var od = btn.getAttribute('data-dish'); finn.open = finn.open === od ? null : od; renderFinnList();
    } else if (a === 'finn-add') {
      var fd = dishById(btn.getAttribute('data-dish'));
      if (fd && ownedDish(fd).any) { finn.open = finn.open === fd.id ? null : fd.id; renderFinnList(); }   // har den: vis variantene
      else addDish(btn.getAttribute('data-dish'));
    } else if (a === 'finn-add-var') {
      var ad = dishById(btn.getAttribute('data-dish'));
      if (ad) addDish(ad.id, finn.sel[ad.id] || defaultVariant(ad, finnTime()).key);
    } else if (a === 'finn-time') {
      var tv = Number(btn.getAttribute('data-val')) || 0; finn.time = finnTime() === tv ? 0 : tv; if (!tv) finn.time = 0; renderFinn();
    } else if (a === 'finn-kids') {
      finn.kids = !finn.kids; renderFinn();
    } else if (a === 'finn-cat') {
      var cv = btn.getAttribute('data-val'); finn.cat = finn.cat === cv ? null : cv; renderFinn();
    } else if (a === 'time-info') {
      var hint = document.getElementById('f-minutes-hint');
      if (hint) { hint.hidden = !hint.hidden; btn.setAttribute('aria-expanded', hint.hidden ? 'false' : 'true'); }
    } else if (a === 'delete-recipe') {
      deleteRecipe(document.getElementById('recipe-form').getAttribute('data-id'));
    } else if (a === 'reset-seed') {
      if (hh) return;
      ask({ id: 'tilbakestill', title: 'Tilbakestille til testdata?', text: 'Alle retter, ukeplaner og faste varer erstattes.', ok: 'Tilbakestill', cancel: 'Avbryt' }).then(function (ok) {
        if (!ok || hh) return;
        state = freshState();
        save();
        toast('Testdata er tilbakestilt');
        renderRetter();
      });
    } else if (a === 'day-mark') {   // v0.16
      setMark(btn.getAttribute('data-date'), btn.getAttribute('data-mark'), 'sheet');
    } else if (a === 'mark-set') {
      var mdt = btn.getAttribute('data-date'); ui.markMenu = null;
      setMark(mdt, btn.getAttribute('data-mark'));
      focusEl('[data-action="day-open"][data-date="' + mdt + '"]');
    } else if (a === 'mark-clear-day') {
      var mcd = btn.getAttribute('data-date'); ui.markMenu = null;
      clearDayToEmpty(mcd, dayDelta(mcd), null);
      renderUke(); focusEl('[data-action="day-open"][data-date="' + mcd + '"]');
    } else if (a === 'mark-menu-close' && (btn.tagName === 'BUTTON' || e.target === btn)) {
      var mmd = ui.markMenu; ui.markMenu = null; renderUke(); focusEl('[data-action="day-open"][data-date="' + mmd + '"]');
    } else if (a === 'mark-menu-close') {
      return;
    } else if (a === 'day-open') {   // v0.11
      if (lp.fired) { lp.fired = false; return; }   // v0.16: klikket etter et langt trykk
      ui.dayOpen = btn.getAttribute('data-date'); ui.weekMenu = false; renderUke();
      var dsel = main.querySelector('#day-sheet select, #day-sheet .btn'); if (dsel) try { dsel.focus({ preventScroll: true }); } catch (x) { dsel.focus(); }
    } else if (a === 'day-close' || (a === 'day-close-bg' && e.target === btn)) {
      var od2 = ui.dayOpen; ui.dayOpen = null; renderUke(); focusEl('[data-action="day-open"][data-date="' + od2 + '"]');
    } else if (a === 'day-close-bg') {
      return;
    } else if (a === 'week-menu') {
      ui.weekMenu = true; ui.dayOpen = null; renderUke();
      var wm = main.querySelector('#week-menu button:not([disabled])'); if (wm) try { wm.focus({ preventScroll: true }); } catch (x) { wm.focus(); }
    } else if (a === 'week-menu-close' && (btn.tagName === 'BUTTON' || e.target === btn)) {
      ui.weekMenu = false; renderUke(); focusEl('[data-action="week-menu"]');
    } else if (a === 'week-menu-close') {
      return;
    } else if (a === 'swap-start') {
      ui.dayOpen = null;
      startSwap(btn.getAttribute('data-date'));
    } else if (a === 'swap-cancel') {
      cancelSwap(true);
    } else if (a === 'swap-to') {
      if (ui.swap) swapNow(ui.swap.from, btn.getAttribute('data-date'));
    } else if (a === 'week-prev' || a === 'week-next' || a === 'week-now') {
      // Én felles uke for Uke og Liste. v0.16: byttemodus beholdes, så middagen kan flyttes til en annen uke.
      ui.weekOffset = a === 'week-now' ? 0 : ui.weekOffset + (a === 'week-next' ? 1 : -1);
      ui.weekTouched = true;
      route();
    }
    else if (a === 'fill-weekdays') { ui.weekMenu = false; fillWeekdays(); }
    else if (a === 'remove-oneoff') { removeOneoff(btn.getAttribute('data-date')); }
    else if (a === 'lib-add') { if (Date.now() - lib.lastSwipe > 300) addFromLibrary(btn.getAttribute('data-lib-id')); }
    else if (a === 'lib-next' || a === 'lib-prev') { stepSuggestion(a === 'lib-next' ? 1 : -1); }
    else if (a === 'clear-week') {
      ui.weekMenu = false; if (main.querySelector('#week-menu')) renderUke();
      // Alle sju dagene settes til tom (også engangsmiddager). Handlelistas egne varer, faste varer, avkrysning og +/- røres ikke.
      clearWeekAsk();
    } else if (a === 'copy-text') {
      copyList();
    } else if (a === 'welcome-close') {
      // v0.6.2: lukket for godt (per telefon). Fokus til «Fyll man–fre», neste naturlige handling.
      ui.welcomeClosed = true;
      lsSet(WELCOME_KEY, '1');
      renderUke();
      focusEl('[data-testid="fyll"]', '.week-nav [data-action="week-next"]');
    } else if (a === 'intro-start') {
      introDone(readCounters('in0'));
    } else if (a === 'intro-hopp') {
      introDone(null);
    } else if (a === 'hs-bruk') {
      var p = readCounters('hs0');
      saveHouseholdSize({ people: p, scale: true, asked: true });
    } else if (a === 'hs-hopp') {
      saveHouseholdSize({ people: null, scale: true, asked: true }, { toast: false });
    } else if (a === 'hs-lagre-innstillinger') {
      var p2 = readCounters('hsh');
      // v0.8: lagre preferanse (scale-flagget), ikke hsScaleOn() som krever people allerede satt
      var on = hsState().scale !== false;
      var bryter = document.querySelector('[data-testid="hs-tilpass-bryter"]');
      if (bryter) on = bryter.getAttribute('aria-checked') === 'true';
      saveHouseholdSize({ people: p2, scale: on, asked: true });
    } else if (a === 'hs-scale-toggle') {
      var cur = hsState();
      var next = !(cur.scale !== false);
      btn.setAttribute('aria-checked', next ? 'true' : 'false');
      var sw = btn.querySelector('.sw'); if (sw) sw.classList.toggle('on', next);
      state.household_size = { people: cur.people, scale: next, asked: true };
      save();
      remote(function (w, hid) { return w.setHouseholdSettings(hid, state.household_size); });
      toast(next ? 'Retter fra Knaggen tilpasses husstanden' : 'Retter fra Knaggen bruker oppskriftens mengder', 8000);
      route();
    } else if (a === 'hs-day') {
      if (ui.dayOpen) { ui.dayOpen = null; renderUke(); }   // v0.11: fra dagsarket
      openDayPeopleSheet(btn.getAttribute('data-date'));
    } else if (a === 'hs-ark-lukk') {
      closeOverlay();
    } else if (a === 'hs-dag-lagre') {
      var date = btn.getAttribute('data-date');
      var cur3 = readCounters('hsd');
      var usual = hsPeople();
      var delta = usual
        ? { voksen: cur3.voksen - (usual.voksen||0), barn: cur3.barn - (usual.barn||0), smabarn: cur3.smabarn - (usual.smabarn||0) }
        : cur3;
      var net = SC.netPeople(delta);
      var msg = dayLabel(date) + (net > 0 ? ': +' + net + ' til middag. Lista er oppdatert.' : net < 0 ? ': −' + Math.abs(net) + ' til middag. Lista er oppdatert.' : ' er endret. Lista er oppdatert.');
      saveDayPeople(date, delta, { toastMsg: msg });
    } else if (a === 'hs-dag-tom') {
      var dateT = btn.getAttribute('data-date');
      var curT = readCounters('hsd');
      var usualT = hsPeople();
      var deltaT = usualT
        ? { voksen: curT.voksen - (usualT.voksen||0), barn: curT.barn - (usualT.barn||0), smabarn: curT.smabarn - (usualT.smabarn||0) }
        : curT;
      clearDayToEmpty(dateT, dayDelta(dateT), deltaT);
    } else if (a === 'hs-dag-reset') {
      var dateR = btn.getAttribute('data-date');
      saveDayPeople(dateR, { voksen: 0, barn: 0, smabarn: 0 }, { toastMsg: dayLabel(dateR) + ' er tilbake til husstanden' });
    } else if (a === 'hs-slik') {
      // enkel: åpne husstand-siden
      location.hash = '#husstand';
    } else if (a === 'add-toggle') {
      ui.addOpen = !ui.addOpen;
      renderListSection();
      var af = ui.addOpen ? document.getElementById('ai-name') : main.querySelector('[data-action="add-toggle"]');
      if (af) try { af.focus({ preventScroll: true }); } catch (x) { af.focus(); }
    } else if (a === 'list-menu') {
      openListMenu();
    } else if (a === 'show-done') {
      ui.showDone = !ui.showDone;
      flipRender();
      var sdb = main.querySelector('[data-action="show-done"]');
      if (sdb) try { sdb.focus({ preventScroll: true }); } catch (x) { sdb.focus(); }
    } else if (a === 'uncheck-all') {
      uncheckAll();
    } else if (a === 'basis-open') {
      openBasisDialog();
    } else if (a === 'fast-open') {
      openFastDialog();
    } else if (a === 'sort-open') {
      ui.sortOpen = true; renderListSection(); focusEl('[data-testid="sort-ark"] .menu-row.on');
    } else if (a === 'sort-close' || (a === 'sort-close-bg' && e.target === btn)) {
      ui.sortOpen = false; renderListSection(); focusEl('[data-action="sort-open"]');
    } else if (a === 'sort') {
      ui.sortOpen = false;
      // v0.4.3b/c: Matrett ('kilde') / Plassering ('butikk'), huskes per telefon (localStorage), synkes ikke.
      ui.sort = btn.getAttribute('data-sort') === 'kilde' ? 'kilde' : 'butikk';
      lsSet(SORT_KEY, ui.sort);
      renderListSection();
      var sb = main.querySelector('[data-action="sort-open"]');
      if (sb) try { sb.focus({ preventScroll: true }); } catch (x) { sb.focus(); }
    } else if (a === 'qty-inc' || a === 'qty-dec') {
      adjustItem(btn.closest('.item').getAttribute('data-key'), a === 'qty-inc' ? 1 : -1);
    } else if (a === 'remove-extra') {
      var key = btn.closest('.item').getAttribute('data-key');
      var it = currentItems().filter(function (i) { return i.key === key; })[0];
      if (!it) return;
      // «Kilde»: ✕ fjerner bare egne varer på denne raden (data-extras); «Butikk»: hele den rene egen-linja.
      var ids = btn.hasAttribute('data-extras') ? btn.getAttribute('data-extras').split(',').filter(Boolean) : it.extra_ids.slice();
      ops.removeExtras(ids);
      var pure = it.sources.length === 1 && it.sources[0] === 'extra';
      if (it.adjust && pure && it.extra_ids.every(function (x) { return ids.indexOf(x) >= 0; })) ops.clearAdjust(it.week, key);
      renderListSection();
    } else if (a === 'fv-toggle') {
      var id = btn.getAttribute('data-id');
      if (ui.fvOpenId === id) fvCloseOpen();
      else {
        var s0 = state.staples.filter(function (x) { return x.id === id; })[0];
        ui.fvOpenId = id; ui.fvOpenAisle = s0 ? itemAisle(s0.name, s0.aisle) : null;
      }
      renderFastePage();
    } else if (a === 'fv-done') {
      var doneId = ui.fvOpenId; fvCloseOpen(); renderFastePage();
      var rb = main.querySelector('.fv-item[data-id="' + doneId + '"]');
      if (rb) try { rb.focus({ preventScroll: true }); } catch (x) { rb.focus(); }
    } else if (a === 'fv-delete') {
      var ds = state.staples.filter(function (x) { return x.id === ui.fvOpenId; })[0];
      if (!ds) return;
      var copy = { id: ds.id, name: ds.name, qty: ds.qty, unit: ds.unit, aisle: ds.aisle, active: ds.active !== false };
      ops.deleteStaple(ds.id); fvCloseOpen();
      toast(cap(copy.name) + ' er slettet', UNDO_MS, { label: 'Angre', run: function () {
        ops.addStaple(copy);
        toast(cap(copy.name) + ' er tilbake');
        if (/^#liste\/faste/.test(location.hash || '')) renderFastePage();
      }});
      renderFastePage();
    } else if (a === 'fv-aisle') {
      if (!ui.fvOpenId) return;
      fvSaveField(ui.fvOpenId, { aisle: btn.getAttribute('data-aisle') });
      renderFastePage();
    } else if (a === 'fv-qty') {
      if (!ui.fvOpenId) return;
      var qi = main.querySelector('.fv-editor .st-qty');
      var qv = (parseQty(qi && qi.value) || 0) + (+btn.getAttribute('data-dir') || 0);
      if (qv < 0) qv = 0;
      fvSaveField(ui.fvOpenId, { qty: qv });
      renderFastePage();
    } else if (a === 'fv-add') {
      var card = main.querySelector('.fv-new'); if (!card) return;
      var nm = (ui.fvQ || '').trim(); if (!nm) return;
      if (findStapleByKey(nm)) { renderFastePage(); return; }
      var nid = uid('s');
      var aisle = card.getAttribute('data-aisle') || 'Tørrvare';
      var unit = card.getAttribute('data-unit') || 'stk';
      var qty = parseQty(card.getAttribute('data-qty')) || 1;
      ops.addStaple({ id: nid, name: nm, qty: qty, unit: unit, aisle: aisle, active: true });
      var onList = document.getElementById('fv-on-list');
      if (onList && onList.checked) {
        var fm = {}; fm[nid] = 1; ops.setFast(LIST_KEY, fm);
      }
      toast(cap(nm) + ' er lagt til (' + aisleLabel(aisle) + ')');
      ui.fvQ = ''; fvCloseOpen(); renderFastePage();
      var sq = document.getElementById('fv-q'); if (sq) sq.focus();
    } else if (a === 'fv-edit-guess') {
      // v0.9 (Trude): mengde −/+ og enhet/avdeling som brikker med ett trykk, i stedet for en fast ring
      var card2 = main.querySelector('.fv-new'); if (!card2) return;
      var field = btn.getAttribute('data-field');
      card2.setAttribute('data-ed', card2.getAttribute('data-ed') === field ? '' : field);
      fvNewSync(card2);
      var f1 = card2.querySelector('#fv-new-ed button.on, #fv-new-ed input');
      if (f1) try { f1.focus({ preventScroll: true }); } catch (x) { /* ignorer */ }
    } else if (a === 'fv-new-step' || a === 'fv-new-unit' || a === 'fv-new-aisle') {
      var card3 = main.querySelector('.fv-new'); if (!card3) return;
      if (a === 'fv-new-step') {
        var q3 = (parseQty(card3.getAttribute('data-qty')) || 0) + (+btn.getAttribute('data-dir') || 0);
        card3.setAttribute('data-qty', String(Math.max(1, round3(q3))));
      } else if (a === 'fv-new-unit') card3.setAttribute('data-unit', btn.getAttribute('data-unit'));
      else { card3.setAttribute('data-aisle', btn.getAttribute('data-aisle')); card3.setAttribute('data-ed', ''); }
      var keepA = btn.getAttribute('data-unit') || btn.getAttribute('data-dir');
      fvNewSync(card3);
      var back3 = card3.querySelector(a === 'fv-new-aisle' ? '[data-field="aisle"]' : a === 'fv-new-unit' ? '[data-action="fv-new-unit"][data-unit="' + keepA + '"]' : '[data-action="fv-new-step"][data-dir="' + keepA + '"]');
      if (back3) try { back3.focus({ preventScroll: true }); } catch (x) { /* ignorer */ }
    } else if (a === 'km-finn-hopp') {   // v0.11
      lsSet(FINN_SKIP_KEY, '1'); renderUke();
    } else if (a === 'km-limit') {
      ops.setWeekdayLimit(Number(btn.getAttribute('data-val')) || null); renderUke();
    } else if (a === 'km-close') {
      closeStart();
    } else if (a === 'km-invite' || a === 'hs-inviter') {
      if (a === 'km-invite') { ui.kmError = ''; openInviteSheet(); } else hsInvite();
    } else if (a === 'km-later') {
      lsSet(START_KEY, 'closed');
      renderUke();
      focusEl(".week-tools [data-testid=\"fyll\"]:not([disabled])", ".week-nav [data-action=\"week-next\"]");
    } else if (a === 'hs-ny-kode') {
      hsNewCode();
    } else if (a === 'copy-long') {
      copyText(shareLink(), 'Lenka er kopiert');
    } else if (a === 'inst-add') {
      installAdd();
    } else if (a === 'inst-how' || a === 'inst-open') {
      if (deferredInstall) installAdd(); else installHow();
    } else if (a === 'inst-later') {
      installLater();
    } else if (a === 'koble-lim') {
      pasteConnect();
    } else if (a === 'koble-ny') {
      var cs = instState(); cs.connectSkip = true; instSave(cs);
      connect.error = '';
      history.replaceState(null, '', location.pathname + location.search + '#uke');
      setTabsHidden(false);
      route();
    } else if (a === 'inapp-chrome') {
      inappChrome();
    } else if (a === 'inapp-copy') {
      copyText(location.href, 'Lenka er kopiert');
    } else if (a === 'inv-refetch') {
      invPage = null; route();
    } else if (a === 'flytt') {
      doMove();
    } else if (a === 'flytt-igjen') {
      flyttState = null; route();
    } else if (a === 'join-later') {
      e.preventDefault();
      invPage = null;
      history.replaceState(null, '', location.pathname + location.search + '#uke');
      setTabsHidden(false);
      route();
    } else if (a === 'create-household') {
      startCreate();
    } else if (a === 'hs-slett-lenker') {
      deleteShareLinks();
    } else if (a === 'k17-enhet') {
      openDeviceSheet(btn.getAttribute('data-uid'));
    } else if (a === 'k17-legg-til') {
      openAddSheet();
    } else if (a === 'k17-navn') {
      openNameSheet();
    } else if (a === 'k17-banner-lagre') {
      var bi = document.getElementById('k17-banner-in'); saveName(bi ? bi.value : 'Hjemme');
    } else if (a === 'k17-banner-senere') {
      if (hh) lsSet(NAME_LATER_KEY, hh.hid); renderHousehold();
    } else if (a === 'k17-hva') {
      answerKind(btn.getAttribute('data-v'));
    } else if (a === 'na-posisjon') {   // v0.18
      var onP = !naPosOn();
      if (onP) lsSet('knaggen:na-posisjon', true); else { try { localStorage.removeItem('knaggen:na-posisjon'); } catch (e) {} }
      try { window.dispatchEvent(new Event('knaggen-na-pos')); } catch (e) {}
      renderHousehold(); toast(onP ? 'Posisjon i «Nå» er på – den lagres aldri' : 'Posisjon i «Nå» er av');
    } else if (a === 'hs-forlat') {
      openLeave();
    } else if (a === 'hs-slett') {
      openDeleteHousehold();
    } else if (a === 'dismiss-share') {
      // v0.4.6: «Ikke nå» på delingskortet – vises ikke igjen (ingen ekstra beskjed); deling finnes fortsatt under Retter.
      lsSet(ONBOARD_KEY, 'dismissed');
      renderUke();
      focusEl('.row-actions a');
    } else if (a === 'join') {
      startJoin(btn.getAttribute('data-hid'), btn.getAttribute('data-secret'));
    } else if (a === 'copy-link') {
      copyInviteLink();   // v0.9: invitasjonslenka (#inn=KODE); den varige lenka ligger under «Varig lenke»
    }
  });

  // v0.16: langt trykk / høyreklikk på en dag i Uke
  main.addEventListener('pointerdown', lpStart);
  ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(function (t) { main.addEventListener(t, lpCancel); });
  main.addEventListener('scroll', lpCancel, true);
  main.addEventListener('contextmenu', function (e) {
    var b = e.target.closest && e.target.closest('[data-action="day-open"]');
    if (!b || ui.swap || !dinnerName(b.getAttribute('data-date'))) return;
    e.preventDefault(); clearTimeout(lp.t);
    if (!lp.fired) openMarkMenu(b.getAttribute('data-date'));
    lp.fired = e.pointerType !== 'mouse' && !!('ontouchstart' in window);
  });
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-finn-var')) {   // v0.11: valgt variant i Matrett-byggeren
      finn.sel[t.getAttribute('data-finn-var')] = t.value; renderFinnList(); return;
    }
    if (t.name === 'hv-limit') {   // v0.11: Middag i hverdagen
      ops.setWeekdayLimit(Number(t.value) || null);
      var sl = main.querySelector('[data-testid="hs-sum-hverdag"]'); if (sl) sl.textContent = Number(t.value) ? 'Helst under ' + t.value + ' min' : 'Ingen grense';
      toast(Number(t.value) ? 'Hverdag: helst under ' + t.value + ' min' : 'Ingen grense på hverdager'); return;
    }
    if (t.classList.contains('day-select')) {
      setDay(t.getAttribute('data-date'), t.value);
    } else if (t.type === 'checkbox' && t.hasAttribute('data-key')) {
      var key = t.getAttribute('data-key');
      var cur = currentItems();
      var week = cur.length ? cur[0].week : LIST_KEY;
      var m = {};
      var wchecks = state.checks[week] || {};
      cur.forEach(function (i) {
        if (i.key !== key) return;
        i.checked = t.checked; i.tick = m[key] = t.checked ? tickValue(i) : false;
        (i.legacyKeys || []).forEach(function (x) { if (wchecks[x.k]) m[x.k] = false; });   // gamle nøkler ryddes
      });
      if (!m.hasOwnProperty(key)) m[key] = t.checked;
      ops.setChecks(week, m);
      // v0.10: avkrysset vare forsvinner (med «Vis N handlet» glir den ned nederst i avdelingen som før).
      flipRender(ui.showDone || SHOW_DONE ? reorderInPlace : null);
      if (t.checked) {   // v0.11: liten, diskret «Angre» nederst
        var undoM = {}; Object.keys(m).forEach(function (k) { undoM[k] = false; });
        var nmT = (cur.filter(function (i) { return i.key === key; })[0] || {}).name || '';
        toast(cap(nmT) + ' krysset av', 4000, { label: 'Angre', run: function () { ops.setChecks(week, undoM); flipRender(); } });
      }
    } else if (t.classList.contains('ing-basis-cb')) {
      t.setAttribute('data-touched', '1');
    } else if (t.classList.contains('ing-name') || t.id === 'ai-name') {
      var row = t.classList.contains('ing-name') ? t.closest('.ing-row') : null;
      var bcb = row && row.querySelector('.ing-basis-cb');
      if (bcb && !bcb.hasAttribute('data-touched')) {
        var kb = knownIngredient(t.value, false);
        bcb.checked = kb && typeof kb.basis === 'boolean' ? kb.basis : U.isBasisName(t.value);
      }
      if (row && row.getAttribute('data-new') !== '1') return;
      var k = knownIngredient(t.value, !row);
      if (k) {
        if (row) {
          row.querySelector('.ing-unit').value = k.unit || '';
          row.querySelector('.ing-aisle').value = itemAisle(t.value, k.aisle);
        } else {
          document.getElementById('ai-aisle').value = itemAisle(t.value, k.aisle);
        }
      } else if (!row && !document.getElementById('ai-aisle').hasAttribute('data-picked')) {
        document.getElementById('ai-aisle').value = guessAisle(t.value) || 'Tørrvare';   // v0.6.1
      }
      if (row) row.setAttribute('data-new', '0');
      if (!row) updateAddItemMatch();   // v0.7: gjenkjenn fast vare i «Legg til vare»
    } else if (t.id === 'ai-aisle') {
      t.setAttribute('data-picked', '1');
    } else if (t.closest('.fv-editor')) {
      // v0.7: live-lagring i redigering på stedet
      if (!ui.fvOpenId) return;
      if (t.classList.contains('st-name')) {
        if (!fvSaveField(ui.fvOpenId, { name: t.value })) return;
      } else if (t.classList.contains('st-qty')) {
        fvSaveField(ui.fvOpenId, { qty: t.value });
        t.value = formatQty(parseQty(t.value));
      } else if (t.classList.contains('st-unit')) {
        fvSaveField(ui.fvOpenId, { unit: t.value });
      }
      // Ikke tegn hele siden på nytt for navn/mengde (behold fokus); avdeling tegnes via klikk.
    }
  });

  main.addEventListener('toggle', function (e) {
    if (!e.target.classList) return;
    if (e.target.classList.contains('staples')) ui.staplesOpen = e.target.open;
  }, true);

  main.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === 'koble-form') {
      var kv = parseAnyLink(document.getElementById('koble-kode').value);
      if (kv) connectWith(kv);
      else { connect.error = 'Finner ingen invitasjon med den koden. Sjekk tegnene.'; renderConnect(connectMode()); }
      return;
    }
    if (id === 'hent-form') return submitHentLink();   // v0.12
    if (id === 'hent-lagre') return saveHentForm(e.target);
    if (id === 'recipe-form') saveRecipeForm(e.target);
    else if (id === 'oneoff-form') saveOneoffForm(e.target);
    else if (id === 'item-add') {
      var name = document.getElementById('ai-name').value.trim();
      if (!name) { document.getElementById('ai-name').focus(); return; }
      var wkDates = [LIST_KEY];   // v0.10: felles liste
      var hit = findStapleByKey(name);
      var msg;
      if (hit) {
        // v0.7: treff på fast vare → legg på som fast vare (ingen list_extras, ingen ny fast vare)
        var adj = state.list_adjust[wkDates[0]] || {};
        if (stapleChosen(hit, wkDates[0], adj)) {
          toast(cap(hit.name) + ' står allerede på lista');
        } else {
          var fm2 = {}; fm2[hit.id] = 1; ops.setFast(wkDates[0], fm2);
          toast(cap(hit.name) + ' (fast vare) er på lista');
        }
      } else if (document.getElementById('ai-staple') && document.getElementById('ai-staple').checked) {
        // Duplikatsjekk også når «Legg til i faste husvarer» er krysset av
        if (findStapleByKey(name)) { toast(cap(name) + ' finnes allerede som fast vare'); return; }
        var q = parseQty(document.getElementById('ai-qty').value);
        var item = { id: uid('s'), name: name, qty: q == null ? 1 : q, unit: document.getElementById('ai-unit').value || guessUnit(name),
          aisle: document.getElementById('ai-aisle').value || guessAisle(name) || 'Tørrvare', active: true };
        ops.addStaple(item);
        var fm3 = {}; fm3[item.id] = 1; ops.setFast(wkDates[0], fm3);
        msg = 'Lagt til i lista og i faste husvarer';
        toast(msg);
      } else {
        var q2 = parseQty(document.getElementById('ai-qty').value);
        var item2 = { id: uid('x'), name: name, qty: q2 == null ? 1 : q2, unit: document.getElementById('ai-unit').value,
          aisle: document.getElementById('ai-aisle').value, week: wkDates[0], created: Date.now() };
        ops.addExtra(item2);
        toast('Lagt til i lista');
      }
      ui.addOpen = true;
      renderListSection();
      var an = document.getElementById('ai-name'); if (an) { an.value = ''; an.focus(); updateAddItemMatch(); }
    }
  });

  // v0.4.4: Esc avbryter byttemodus (fokus tilbake til «Bytt» på dagen).
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.swap && !document.querySelector('.overlay:not([hidden])')) { e.preventDefault(); cancelSwap(true); }
  });

  window.addEventListener('hashchange', function () {
    ui.swap = null;
    if (!/^#liste\/faste/.test(location.hash || '')) { ui.fvOpenId = null; ui.fvOpenAisle = null; ui.fvQ = ''; }
    closeBasisDialog(false);
    closeSheet('fast-dialog', false);
    closeListMenu(false);
    closeV9Sheet(false);
    connect.error = '';
    ui.error = '';
    if (!/^#husstand/.test(location.hash)) ui.justCreated = false;
    route(); window.scrollTo(0, 0);
    if (toastShowing()) placeToast();   // v0.6.2/v0.6.3: båndet over lagre-linja i skjemaene, ellers rett over fanelinja
  });

  /* ---------- Oppstart ---------- */

  // v0.9: ?inn=KODE kommer bare fra «Åpne i Chrome» (intent-URL kan ikke ha #). Gjøres om til #inn= og fjernes fra adressen.
  (function () {
    var q = /[?&]inn=([A-Za-z0-9\-]{8,12})/.exec(location.search || '');
    if (q && !NEW_HOME) history.replaceState(null, '', location.pathname + '#inn=' + q[1]);
  })();
  // v0.12: Web Share Target (Android): «Del» fra Chrome åpner ./?title=…&text=…&url=…  → #retter/hent med lenka.
  (function () {
    if (NEW_HOME || !/[?&](url|text|title)=/.test(location.search || '')) return;
    var q = new URLSearchParams(location.search);
    var u = findLink(q.get('url')) || findLink(q.get('text')) || findLink(q.get('title'));
    history.replaceState(null, '', location.pathname + '#retter/hent');
    if (u) { imp.url = u; imp.auto = true; }
    else imp.error = 'Fant ingen lenke i det som ble delt. Lim inn lenka til oppskriften.';
  })();
  loadLocal();
  if (isStandalone()) { var ist = instState(); if (!ist.done) { ist.done = true; instSave(ist); } }
  var info = readHH();
  if (info && syncMode() && info.core_done) {
    enterHousehold(info);
  } else if (info && syncMode()) {
    // Oppretting ble avbrutt før husstanden var bekreftet: bli lokal, og sjekk i bakgrunnen om den faktisk ble opprettet.
    Sync.init().then(function () { return Sync.isMember(info.hid); }).then(function (m) {
      if (m) { info.core_done = true; writeHH(info); enterHousehold(info); route(); }
      else if (m === false) { try { localStorage.removeItem(HH_KEY); } catch (x) { /* ignorer */ } }
    }, function () { /* prøver igjen neste gang */ });
  }
  // v0.4.6 (spec v0.4 punkt 6): første åpning viser appen med startdata. Deling tilbys ikke som første skjerm, men som
  // et lite kort i Uke etter første plan (showShareCard). Firebase (SDK, anonym innlogging) startes først når man
  // oppretter/blir med i en husstand, eller hvis telefonen allerede er med i en.
  ui.weekOffset = defaultWeekOffset();
  // v0.14.1: etter første åpning (introen/ukeplanen er uendret) starter appen alltid på Handleliste. Gjelder bare
  // åpning uten adresse (#…): lenker, invitasjoner og delt innhold går dit de peker.
  // Testkrok KNAGGEN_START_UKE: eldre testsuiter forventer Uke ved ny åpning.
  if (!NEW_HOME && !window.KNAGGEN_START_UKE && !(location.hash || '').replace(/^#\/?/, '') && (hh || hsAsked()) && !showIntro() && !showConnectFirst()) {
    // v0.16.1: «Start som kjøkkenskjerm på denne enheten» (knaggen:start-kjokken, satt i #kjokken/innstillinger)
    var startK = false; try { startK = JSON.parse(localStorage.getItem('knaggen:start-kjokken') || 'null') === true; } catch (e) {}
    history.replaceState(null, '', location.pathname + location.search + (startK ? '#kjokken' : '#liste'));
  }
  if (NEW_HOME) runOldAddress(); else route();

  /* ---------- v0.16: versjonsnummeret ved logoen og «Nytt i Knaggen» ----------
   * Trykk på «0.16» åpner arket. Etter en oppdatering åpnes det av seg selv én gang (ikke ved aller første åpning,
   * ikke på kjøkkenskjermen og ikke i automatiserte tester uten testkroken KNAGGEN_TEST_NYTT). */
  var APP_VERSION = '0.18.0', SEEN_VER_KEY = 'knaggen:sett-versjon';
  var NEWS = [
    ['0.18.0', ['Ny «Nå»-side på telefonen (Kjøkken-lenken på smale skjermer): Hjemme viser klokke, vær, dagens middag, kvelden og neste avganger. Borte viser avganger, det du må kjøpe til middagen i dag og familiens ettermiddag. Du kan la telefonen bytte selv med posisjon (Husstand → Denne enheten). Posisjonen lagres aldri.']],
    ['0.17.0', ['Husstanden kan få et navn, og under Husstand ser du nå hver enhet med navn, hvem den tilhører og når den sist ble brukt. Du kan gi enheter nytt navn og fjerne dem du ikke bruker.', 'Holdeplassene på kjøkkenskjermen er felles for husstanden, så et nytt nettbrett får dem med en gang. ⚙ ligger nå øverst til høyre.', 'Ny rett i biblioteket: Flygande Jacob – svensk ovnsrett med kylling, fløte, chilisaus, banan, bacon og peanøtter, servert med ris.']],
    ['0.16.2', ['Innstillingene på kjøkkenskjermen følger nå samme lyse eller mørke tema som resten av appen (etter innstillingen på enheten), og er lette å lese i begge.']],
    ['0.16.1', ['Nettbrettet kan starte rett på kjøkkenskjermen: slå på «Start som kjøkkenskjerm på denne enheten» under Husstand → Kjøkkenskjerm. «Til appen» nederst tar deg til lista.',
      '⚙ Innstillinger er tilbake nederst på kjøkkenskjermen.',
      'Trykk på «● Delt» øverst til høyre for å åpne Husstand og delingslenken.',
      'Store familiekalendere fra Google kan legges til (rettet: «Fikk ikke lagt til kalenderen»), og feilmeldingene sier nå hva som gikk galt.',
      'Innstillingene på kjøkkenskjermen er alltid lyse og lette å lese, også om kvelden og natta.',
      'Etter leggetid står det «Etter leggetid» på avgangstavla i stedet for «Ingen avganger».']],
    ['0.16', ['Kjøkkenskjermen viser avganger fra holdeplassene i nærheten, med tid til å gå dit.',
      'Kjøkkenskjermen kan vise opptil fire kalendere (Google, Outlook, iCloud). Bare den som la inn adressen ser den.',
      'Merk en middag «Allerede handlet» eller «Rester», så kommer ingrediensene ikke på handlelista. Hold fingeren på dagen i Uke, eller åpne dagen.',
      'Du kan flytte en middag til en annen uke: trykk ⇅ Bytt og bla til uka du vil.',
      'Versjonsnummeret står ved logoen. Trykk på det for å se hva som er nytt.']],
    ['0.15', ['Kjøkkenskjerm for nettbrettet på kjøkkenet: klokke, dagens middag, været og oppskriften med stor skrift når dere lager mat.']],
    ['0.14', ['Del lista til Oda: send handlelista som en lenke og legg alt i Oda-handlekurven på én gang.',
      'Appen åpner på handlelista, der du oftest skal.']],
    ['0.13', ['Første kobling til Oda: varene kunne søkes opp én om gangen (erstattet av «Del lista til Oda» i 0.14).']]
  ];
  function newsHtml() {
    return '<div class="sheet-head"><h3 id="nytt-h">Nytt i Knaggen</h3><span class="nytt-ver">Versjon ' + APP_VERSION + '</span></div>' +
      '<div class="nytt-body">' + NEWS.map(function (n, i) {
        return '<section class="nytt-v"><h4>' + (i === 0 ? 'Nå i ' : '') + n[0] + '</h4><ul>' + n[1].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>';
      }).join('') + '</div>' +
      '<button type="button" class="btn primary block" data-v9="nytt-lukk" data-testid="nytt-lukk">Fint</button>';
  }
  function openNews() {
    lsSet(SEEN_VER_KEY, APP_VERSION);
    var ov = openV9Sheet('nytt', newsHtml());
    ov.querySelector('.sheet').setAttribute('data-testid', 'nytt-ark');
    ov.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapTab(ov, e); });
  }
  (function versionBadge() {
    var h1 = document.querySelector('.topbar h1');
    if (h1 && !document.getElementById('ver-badge')) {
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'ver-badge'; b.className = 'ver-badge'; b.setAttribute('data-testid', 'versjon');
      b.setAttribute('aria-label', 'Versjon ' + APP_VERSION + ' – se hva som er nytt');
      b.textContent = APP_VERSION.replace(/\.0$/, '');
      h1.insertAdjacentElement('afterend', b);
      b.addEventListener('click', openNews);
    }
    var seen = lsGet(SEEN_VER_KEY);
    if (seen === APP_VERSION) return;
    var used = USED_BEFORE;
    var auto = navigator.webdriver ? !!window.KNAGGEN_TEST_NYTT : true;
    if (!seen && !used) { lsSet(SEEN_VER_KEY, APP_VERSION); return; }   // aller første åpning: ikke vis
    if (!auto) return;
    function tryOpen() {
      if (/^#kjokken/.test(location.hash) || v9Sheet() || askOpen || document.querySelector('.overlay')) return false;
      openNews(); return true;
    }
    setTimeout(function () {
      if (tryOpen()) return;
      var onHash = function () { setTimeout(function () { if (lsGet(SEEN_VER_KEY) === APP_VERSION || tryOpen()) window.removeEventListener('hashchange', onHash); }, 400); };
      window.addEventListener('hashchange', onHash);
    }, 600);
  })();

  // Åpnes appen igjen etter en stund (f.eks. søndag kveld → mandag), velges riktig uke på nytt.
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!hiddenAt || Date.now() - hiddenAt < 30 * 60000) return;
    hiddenAt = 0;
    var d = defaultWeekOffset();
    if (d === ui.weekOffset && !ui.weekTouched) return;
    ui.weekOffset = d; ui.weekTouched = false;
    if (!isTyping() && !isFormRoute()) route();
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* frakoblet-støtte er valgfri */ });
    });
  }
})();
