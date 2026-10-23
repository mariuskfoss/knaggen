/* Knaggen v0.15 «Kjøkkenskjerm» (#kjokken). Design: merkevare/v015-kjokken (README, kjokken.css).
 * Hvile: klokke, dato + uke, middag i dag, de neste dagene, vær (MET via hentVaer). Døgnrytme Dag/Kveld/Natt med myke
 * overganger (OKLab), innbrenningsvern, matlaging med ett steg om gangen og Wake Lock. Innstillinger per enhet i localStorage. */
(function () {
  'use strict';
  var LS_KEY = 'knaggen:kjokken';           // { bed, wake, lat, lon, place } per enhet
  var WX_KEY = 'knaggen:kjokken-vaer';      // siste værsvar { at, lat, lon, d }
  var SS_FROM = 'knaggen:fra-kjokken';      // «⌂ Kjøkkenskjerm» vises bare når appen ble åpnet herfra
  var DEFAULTS = { bed: '22:30', wake: '06:00', lat: 59.91, lon: 10.75, place: 'Oslo' };
  var IDLE_MS = function () { return window.KNAGGEN_KJOKKEN_IDLE_MS || 120000; };
  var COOK_IDLE_MS = 30 * 60000, WAKE_MS = 30000, WX_EVERY = 30 * 60000;
  // Testkrok: window.KNAGGEN_NOW = ms → klokka går videre derfra (skisser og tester av Dag/Kveld/Natt).
  var nowBase = null, nowAt = 0;
  function now() {
    var N = window.KNAGGEN_NOW;
    if (!N) return Date.now();
    if (N !== nowBase) { nowBase = N; nowAt = Date.now(); }
    return +N + (Date.now() - nowAt);
  }
  function api() { return window.KnaggenKitchenApi; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function round2(x) { return Math.round(x * 100) / 100; }
  function settings() {
    var s = lsGet(LS_KEY) || {}, o = {};
    for (var k in DEFAULTS) o[k] = s[k] != null && s[k] !== '' ? s[k] : DEFAULTS[k];
    if (!/^\d\d:\d\d$/.test(o.bed)) o.bed = DEFAULTS.bed;
    if (!/^\d\d:\d\d$/.test(o.wake)) o.wake = DEFAULTS.wake;
    o.lat = round2(+o.lat); o.lon = round2(+o.lon);
    if (!(o.lat >= -90 && o.lat <= 90) || !(o.lon >= -180 && o.lon <= 180)) { o.lat = DEFAULTS.lat; o.lon = DEFAULTS.lon; }
    return o;
  }
  function hm(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }

  /* ---------- Sola (SunCalc/NOAA, lokalt, ingen nettkall) ---------- */
  var RAD = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, OBL = RAD * 23.4397;
  function sunTimes(dateMs, lat, lon) {
    var lw = RAD * -lon, phi = RAD * lat, d = dateMs / DAY - 0.5 + J1970 - J2000;
    var n = Math.round(d - J0 - lw / (2 * Math.PI));
    var ds = J0 + lw / (2 * Math.PI) + n;
    var M = RAD * (357.5291 + 0.98560028 * ds);
    var C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    var L = M + C + RAD * 102.9372 + Math.PI;
    var dec = Math.asin(Math.sin(OBL) * Math.sin(L));
    var Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    var cosW = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (cosW < -1) return { polar: 'day' };
    if (cosW > 1) return { polar: 'night' };
    var w = Math.acos(cosW), a = J0 + (w + lw) / (2 * Math.PI) + n;
    var Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L), Jrise = Jnoon - (Jset - Jnoon);
    var ms = function (j) { return (j + 0.5 - J1970) * DAY; };
    return { rise: ms(Jrise), set: ms(Jset) };
  }
  function minOfDay(ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }

  /* ---------- Døgnrytme ---------- */
  function bez(x1, y1, x2, y2) {
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 30; i++) { t = (lo + hi) / 2; var bx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t; if (bx < x) lo = t; else hi = t; }
      return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    };
  }
  var EASE_IO = bez(0.45, 0, 0.55, 1), EASE_OUT = bez(0, 0, 0.58, 1);
  // Tidene (minutter etter midnatt) for dagen som inneholder ms.
  function schedule(ms, s) {
    var d = new Date(ms), noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    var st = sunTimes(noon, s.lat, s.lon), wake = hm(s.wake), bed = hm(s.bed);
    if (bed < 12 * 60) bed += 1440;
    var rise = st.rise ? minOfDay(st.rise) : (st.polar === 'day' ? 0 : wake);
    var dayStart = Math.max(rise, wake);
    var kv;
    if (st.polar === 'day') kv = 21 * 60;
    else if (st.polar === 'night') kv = 16 * 60;
    else {
      var set = minOfDay(st.set);
      kv = Math.max(16 * 60, set - 30);
      if (set >= bed) kv = Math.min(kv, 21 * 60);
    }
    kv = Math.min(kv, bed - 45);
    return { dayStart: dayStart, kveld: kv, bed: bed, sun: st };
  }
  // → { a, b, t (lett), raw (lineær), layout }
  function phaseAt(ms, s) {
    var sc = schedule(ms, s), m = minOfDay(ms);
    if (m < sc.dayStart && sc.bed >= 1440 && m + 1440 < sc.bed + 20) m += 1440;   // leggetid etter midnatt
    function mix(a, b, start, len, ease) { var raw = Math.max(0, Math.min(1, (m - start) / len)); return { a: a, b: b, raw: raw, t: ease(raw) }; }
    if (m < sc.dayStart) return { a: 'natt', b: 'natt', t: 0, raw: 0 };
    if (m < sc.dayStart + 30) return mix('natt', 'dag', sc.dayStart, 30, EASE_OUT);
    if (m < sc.kveld) return { a: 'dag', b: 'dag', t: 0, raw: 0 };
    if (m < sc.kveld + 45) return mix('dag', 'kveld', sc.kveld, 45, EASE_IO);
    if (m < sc.bed) return { a: 'kveld', b: 'kveld', t: 0, raw: 0 };
    if (m < sc.bed + 20) return mix('kveld', 'natt', sc.bed, 20, EASE_IO);
    return { a: 'natt', b: 'natt', t: 0, raw: 0 };
  }
  function phaseName(p) { return p.t >= 0.5 ? p.b : p.a; }

  /* ---------- Tokens i OKLab ---------- */
  var TOK = {
    dag:   { bg: '#f4f2ed', surface: '#ebe8e1', line: '#dcd7cd', ink: '#252a28', muted: '#596260', clock: '#252a28', brand: '#3f6e5a', 'on-brand': '#ffffff', mark: '#252a28', brass: '#a5813f' },
    kveld: { bg: '#120c06', surface: '#1c140b', line: '#2a1e11', ink: '#d8a868', muted: '#a9804c', clock: '#e2b373', brand: '#b88a52', 'on-brand': '#120c06', mark: '#a9804c', brass: '#a9804c' },
    natt:  { bg: '#000000', surface: '#000000', line: '#000000', ink: '#3a2814', muted: '#3a2814', clock: '#7a542c', brand: '#3a2814', 'on-brand': '#000000', mark: '#2a1d0f', brass: '#2a1d0f' }
  };
  function hex2lin(h) { return [1, 3, 5].map(function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); }
  function lin2hex(c) { return '#' + c.map(function (x) { x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055; var v = Math.max(0, Math.min(255, Math.round(x * 255))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function toLab(h) {
    var c = hex2lin(h), r = c[0], g = c[1], b = c[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromLab(L) {
    var l = Math.pow(L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2], 3), m = Math.pow(L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2], 3), s = Math.pow(L[0] - 0.0894841775 * L[1] - 1.2914855480 * L[2], 3);
    return lin2hex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]);
  }
  function mixHex(a, b, t) { if (t <= 0 || a === b) return a; if (t >= 1) return b; var A = toLab(a), B = toLab(b); return fromLab([0, 1, 2].map(function (i) { return A[i] + (B[i] - A[i]) * t; })); }

  /* ---------- Tilstand ---------- */
  var root = null, open = false, view = 'idle', woke = 0, cook = null, lastTap = 0, timers = [], wakeLock = null, swipeX = null;
  var wx = lsGet(WX_KEY), wxBusy = false, wxErr = '';

  function effPhase() {
    var p = phaseAt(now(), settings());
    var nattIn = p.a === 'natt' || p.b === 'natt';
    if (nattIn && (view === 'cook' || now() - woke < WAKE_MS)) {
      // Matlaging og «vekket» natt: aldri Natt – Kveld-fargene brukes.
      return { a: p.a === 'natt' ? 'kveld' : p.a, b: p.b === 'natt' ? 'kveld' : p.b, t: p.t, raw: p.raw, forced: true };
    }
    return p;
  }
  function applyPhase() {
    if (!root) return;
    var p = effPhase(), A = TOK[p.a], B = TOK[p.b];
    for (var k in A) root.style.setProperty('--k-' + k, mixHex(A[k], B[k], p.t));
    var name = phaseName(p), full = p.a === 'natt' && p.b === 'natt';
    // Mot Natt: alt utenom klokka tones ut de siste 10 minuttene; fra Natt: inn i første halvdel.
    var fade = 1;
    if (p.b === 'natt' && p.a !== 'natt') fade = p.raw < 0.5 ? 1 : Math.max(0, 1 - (p.raw - 0.5) * 2);
    if (p.a === 'natt' && p.b !== 'natt') fade = Math.min(1, p.raw * 2);
    root.style.setProperty('--k-fade', String(Math.round(fade * 100) / 100));
    root.classList.toggle('k-natt', full);
    root.setAttribute('data-fase', full ? 'natt' : name);
    // Innbrenning: sakte Lissajous-bane. Dag/Kveld ±8 px, 1 px i minuttet; Natt ±40 px, hvert 5. minutt.
    var amp = full ? 40 : 8, step = full ? Math.floor(now() / 300000) : Math.floor(now() / 60000);
    var x = Math.round(amp * Math.sin(step * 2 * Math.PI / (full ? 37 : 97))), y = Math.round(amp * Math.sin(step * 2 * Math.PI / (full ? 23 : 71) + 1));
    root.style.setProperty('--k-shift-x', x + 'px'); root.style.setProperty('--k-shift-y', y + 'px');
    var th = document.querySelector('meta[name="theme-color"][data-k]');
    if (th) th.content = root.style.getPropertyValue('--k-bg');
  }

  /* ---------- Vær ---------- */
  var WX_TXT = { clearsky: 'Klarvær', fair: 'Lettskyet', partlycloudy: 'Delvis skyet', cloudy: 'Skyet', fog: 'Tåke',
    lightrain: 'Lett regn', rain: 'Regn', heavyrain: 'Kraftig regn', lightrainshowers: 'Lette regnbyger', rainshowers: 'Regnbyger', heavyrainshowers: 'Kraftige regnbyger',
    lightsleet: 'Lett sludd', sleet: 'Sludd', heavysleet: 'Kraftig sludd', lightsleetshowers: 'Lette sluddbyger', sleetshowers: 'Sluddbyger', heavysleetshowers: 'Kraftige sluddbyger',
    lightsnow: 'Lett snø', snow: 'Snø', heavysnow: 'Kraftig snø', lightsnowshowers: 'Lette snøbyger', snowshowers: 'Snøbyger', heavysnowshowers: 'Kraftige snøbyger' };
  function wxText(sym) {
    var b = String(sym || '').replace(/_(day|night|polartwilight)$/, '');
    if (/thunder/.test(b)) return 'Torden';
    return WX_TXT[b] || WX_TXT[b.replace(/andthunder$/, '')] || '';
  }
  // Egne, enkle ikoner tegnet med tokens (samme symbolkoder som MET).
  function wxIcon(sym) {
    var s = String(sym || ''), night = /_night$/.test(s), b = s.replace(/_(day|night|polartwilight)$/, '');
    var sun = '<circle cx="34" cy="34" r="13" fill="var(--k-brass)"/><g stroke="var(--k-brass)" stroke-width="4" stroke-linecap="round"><path d="M34 9v6M34 53v6M9 34h6M53 34h6M16.3 16.3l4.2 4.2M47.5 47.5l4.2 4.2M16.3 51.7l4.2-4.2M47.5 20.5l4.2-4.2"/></g>';
    var moon = '<path d="M44 14a20 20 0 1 0 14 30 16 16 0 1 1-14-30z" fill="var(--k-brass)"/>';
    var cloud = '<path d="M30 76h44a15 15 0 0 0 0-30 21 21 0 0 0-40 4 13 13 0 0 0-4 26z" fill="var(--k-muted)"/>';
    var bigCloud = '<path d="M24 66h50a17 17 0 0 0 0-34 24 24 0 0 0-46 5 15 15 0 0 0-4 29z" fill="var(--k-muted)"/>';
    var drops = '<g stroke="var(--k-ink)" stroke-width="4" stroke-linecap="round"><path d="M36 74l-4 10M52 74l-4 10M68 74l-4 10"/></g>';
    var flakes = '<g fill="var(--k-ink)"><circle cx="34" cy="80" r="3.5"/><circle cx="50" cy="84" r="3.5"/><circle cx="66" cy="80" r="3.5"/></g>';
    var bolt = '<path d="M52 66l-10 14h8l-6 12 14-17h-8l6-9z" fill="var(--k-brass)"/>';
    var fog = '<g stroke="var(--k-muted)" stroke-width="5" stroke-linecap="round"><path d="M18 40h60M24 54h52M18 68h60"/></g>';
    var celestial = night ? moon : sun, inner;
    if (b === 'clearsky') inner = '<g transform="translate(14 14)">' + celestial + '</g>';
    else if (b === 'fair' || b === 'partlycloudy') inner = celestial + cloud;
    else if (b === 'fog') inner = fog;
    else if (b === 'cloudy') inner = bigCloud;
    else {
      inner = (/showers/.test(b) ? celestial.replace(/<(circle|path|g)/, '<$1') : '') + bigCloud;
      inner += /thunder/.test(b) ? bolt : /snow/.test(b) ? flakes : /sleet/.test(b) ? drops.replace('M68 74l-4 10', '') + '<circle cx="66" cy="80" r="3.5" fill="var(--k-ink)"/>' : drops;
    }
    return '<svg viewBox="0 0 96 96" role="img" aria-label="' + esc(wxText(s) || 'Vær') + '" data-sym="' + esc(s) + '">' + inner + '</svg>';
  }
  function loadWeather(force) {
    var s = settings(), A = api();
    if (!A || !A.hid()) { wxErr = 'no-hh'; return; }
    if (wxBusy) return;
    var fresh = wx && wx.lat === s.lat && wx.lon === s.lon && Date.now() - wx.at < WX_EVERY;
    if (fresh && !force) return;
    wxBusy = true;
    A.weather(s.lat, s.lon).then(function (d) {
      wx = { at: Date.now(), lat: s.lat, lon: s.lon, d: d }; wxErr = ''; lsSet(WX_KEY, wx);
    }, function (e) { wxErr = (e && e.code) || 'feil'; }).then(function () { wxBusy = false; if (open && view === 'idle') render(); });
  }
  function weatherHtml(s) {
    var ok = wx && wx.lat === s.lat && wx.lon === s.lon && Date.now() - wx.at < 3 * 3600e3 && wx.d;
    if (!ok) {
      var msg = wxErr === 'no-hh' ? 'Været vises når denne enheten er med i en husstand.' : wxBusy || !wxErr ? 'Henter været …' : 'Fikk ikke hentet været nå.';
      return '<div class="k-wx k-fadeable" data-testid="k-vaer"><p class="k-wxt" data-testid="k-vaer-melding">' + esc(msg) + '</p></div>';
    }
    var d = wx.d;
    return '<div class="k-wx k-fadeable" data-testid="k-vaer">' + wxIcon(d.sym) + '<span class="k-temp" data-testid="k-temp">' + (d.temp == null ? '–' : d.temp + '°') + '</span>' +
      '<span class="k-wxt">' + esc(wxText(d.sym)) + (s.place ? ' · ' + esc(s.place) : '') + '</span>' +
      (d.hi != null ? '<p class="k-hl" data-testid="k-hoylav">I dag <b>' + d.hi + '°</b> <span>/ ' + d.lo + '°</span></p>' : '') + '</div>';
  }

  /* ---------- Tegning ---------- */
  var DAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  var MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function dayIso(ms, add) { var d = new Date(ms); return api().isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (add || 0))); }
  var MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><g transform="translate(7.5,7) scale(0.0625)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="80"><path d="M0 0V276M12 144L156 0" stroke="var(--k-mark)"/><path d="M37.5 166.5L156 276" stroke="var(--k-brass)"/></g></svg>';
  function idleHtml() {
    var t = now(), d = new Date(t), s = settings(), A = api();
    var clock = two(d.getHours()) + ':' + two(d.getMinutes());
    var date = DAYS[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' · uke ' + A.isoWeek(d);
    var m = A.meal(dayIso(t));
    var dinner = m
      ? '<button type="button" class="k-dinbtn" data-k="cook" data-testid="k-middag"><p class="k-lbl">Middag i dag</p><p class="k-dinner">' + esc(m.name) + '</p>' +
        '<p class="k-dmeta">' + esc([m.time, 'trykk for oppskrift'].filter(Boolean).join(' · ')) + '</p></button>'
      : '<div data-testid="k-middag-tom"><p class="k-lbl">Middag i dag</p><p class="k-dinner k-none">Ingen middag valgt</p></div>';
    var next = [];
    for (var i = 1; i <= 3; i++) {
      var di = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), mi = A.meal(A.isoDate(di));
      next.push('<li><b>' + (i === 1 ? 'I morgen' : DAYS[di.getDay()]) + '</b> · ' + esc(mi ? mi.name : 'ingen middag valgt') + '</li>');
    }
    return '<div class="k-stage"><div class="k-grid"><div class="k-left">' +
      '<div class="k-timeblock"><p class="k-clock" data-testid="k-klokke" aria-label="Klokka er ' + clock + '">' + clock + '</p><p class="k-date k-fadeable" data-testid="k-dato">' + esc(date) + '</p></div>' +
      '<div class="k-fadeable">' + dinner + '</div>' +
      '</div><div class="k-right">' + weatherHtml(s) +
      '<div class="k-fadeable"><p class="k-lbl">De neste dagene</p><ul class="k-next" data-testid="k-neste">' + next.join('') + '</ul></div>' +
      '</div></div>' +
      '<div class="k-foot k-fadeable"><span class="k-mark">' + MARK + 'Knaggen</span>' +
      '<button type="button" class="k-set" data-k="settings" data-testid="k-innstillinger">Innstillinger</button>' +
      '<span class="k-credit" data-testid="k-kreditering">Værdata fra MET Norway</span></div></div>';
  }
  function cookHtml() {
    var m = cook.meal, steps = m.steps.length ? m.steps : ['Ingen fremgangsmåte er lagt inn for denne retten. Ingrediensene står til venstre.'];
    cook.step = Math.max(0, Math.min(steps.length - 1, cook.step));
    var meta = [m.time, m.portions].filter(Boolean).join(' · ');
    return '<div class="k-stage"><div class="k-ctop"><div><h1 data-testid="k-kok-tittel">' + esc(m.name) + '</h1>' + (meta ? '<span class="m" data-testid="k-kok-meta">' + esc(meta) + '</span>' : '') + '</div>' +
      '<span class="k-awake" data-testid="k-vaaken"' + (wakeLock ? '' : ' hidden') + '>☀ Skjermen holdes våken</span>' +
      '<button type="button" class="k-x" data-k="close" aria-label="Lukk oppskriften" data-testid="k-lukk">×</button></div>' +
      '<div class="k-cgrid"><ul class="k-ing" aria-label="Ingredienser" data-testid="k-ingredienser">' +
      m.ingredients.map(function (x, i) {
        return '<li><button type="button" data-k="ing" data-i="' + i + '" aria-pressed="' + (cook.done[i] ? 'true' : 'false') + '"' + (cook.done[i] ? ' class="done"' : '') + '>' +
          (x.amount ? '<b>' + esc(x.amount) + '</b> ' : '') + esc(x.name) + '</button></li>';
      }).join('') + '</ul>' +
      '<section class="k-step" aria-live="polite"><span class="n" data-testid="k-steg-nr">Steg ' + (cook.step + 1) + ' av ' + steps.length + '</span>' +
      '<p class="t" data-testid="k-steg">' + esc(steps[cook.step]) + '</p>' +
      '<div class="k-steps"><button type="button" class="k-btn" data-k="prev" data-testid="k-forrige"' + (cook.step === 0 ? ' disabled' : '') + '>‹ Forrige</button>' +
      '<button type="button" class="k-btn pri" data-k="next" data-testid="k-neste-steg"' + (cook.step >= steps.length - 1 ? ' disabled' : '') + '>Neste ›</button></div></section></div></div>';
  }
  function settingsHtml() {
    var s = settings();
    return '<div class="k-sheet" role="dialog" aria-modal="true" aria-labelledby="k-set-h" data-testid="k-innstillinger-ark"><form class="k-form" data-k="form">' +
      '<h2 id="k-set-h">Kjøkkenskjerm på denne enheten</h2>' +
      '<p class="k-help">Lagres bare på denne enheten.</p>' +
      '<div class="k-row"><label>Leggetid<input type="time" name="bed" value="' + esc(s.bed) + '" required data-testid="k-leggetid"></label>' +
      '<label>Stå opp<input type="time" name="wake" value="' + esc(s.wake) + '" required data-testid="k-staopp"></label></div>' +
      '<p class="k-help">Sted for vær og sol (avrundes til 2 desimaler, omtrent 1 km).</p>' +
      '<div class="k-row"><label>Stedsnavn<input name="place" maxlength="40" value="' + esc(s.place) + '" data-testid="k-sted"></label></div>' +
      '<div class="k-row"><label>Breddegrad<input name="lat" inputmode="decimal" value="' + s.lat + '" required data-testid="k-lat"></label>' +
      '<label>Lengdegrad<input name="lon" inputmode="decimal" value="' + s.lon + '" required data-testid="k-lon"></label></div>' +
      (navigator.geolocation ? '<button type="button" class="k-btn" data-k="geo" data-testid="k-geo">Bruk posisjonen min</button>' : '') +
      '<p class="k-help k-err" data-testid="k-set-feil" hidden></p>' +
      '<div class="k-row k-acts"><button type="button" class="k-btn" data-k="cancel">Avbryt</button><button type="submit" class="k-btn pri" data-testid="k-lagre">Lagre</button></div>' +
      '</form></div>';
  }
  function render() {
    if (!root) return;
    var sheet = root.querySelector('.k-sheet');
    if (sheet) return;   // ikke tegn over innstillingene mens de er åpne
    root.classList.toggle('k-cook', view === 'cook');
    root.innerHTML = view === 'cook' && cook ? cookHtml() : idleHtml();
    applyPhase();
  }

  /* ---------- Wake Lock (med reserve) ---------- */
  function takeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l; showAwake();
      l.addEventListener('release', function () { if (wakeLock === l) { wakeLock = null; showAwake(); } });
    }, function () { wakeLock = null; showAwake(); });
  }
  function dropLock() { var l = wakeLock; wakeLock = null; if (l) l.release().catch(function () {}); showAwake(); }
  function showAwake() { var e = root && root.querySelector('[data-testid="k-vaaken"]'); if (e) e.hidden = !wakeLock; }
  document.addEventListener('visibilitychange', function () { if (open && view === 'cook' && document.visibilityState === 'visible' && !wakeLock) takeLock(); });

  /* ---------- Handlinger ---------- */
  function openCook() {
    var m = api().meal(dayIso(now()));
    if (!m) return;
    var same = cook && cook.meal.date === m.date && cook.meal.name === m.name;
    cook = { meal: m, step: same ? cook.step : 0, done: same ? cook.done : {} };
    view = 'cook'; lastTap = Date.now(); render(); takeLock();
  }
  function closeCook() { view = 'idle'; cook = null; dropLock(); render(); }   // strykingene nullstilles ved lukking
  function toApp() {
    try { sessionStorage.setItem(SS_FROM, '1'); } catch (e) {}
    fadeOut(function () { api().toApp(); });
  }
  function fadeOut(cb) {
    var el = open && root ? root : document.body;
    el.classList.add('k-fading');
    setTimeout(function () { el.classList.remove('k-fading'); cb(); }, window.KNAGGEN_KJOKKEN_FADE_MS != null ? window.KNAGGEN_KJOKKEN_FADE_MS : 600);
  }
  function isNight() { var p = effPhase(); return p.a === 'natt' && p.b === 'natt'; }
  function onTap(e) {
    lastTap = Date.now();
    var t = e.target.closest ? e.target.closest('[data-k]') : null, k = t && t.getAttribute('data-k');
    if (root.querySelector('.k-sheet')) return sheetTap(k, e);
    if (view === 'idle' && isNight()) { woke = now(); render(); return; }   // natt: første trykk bare vekker
    if (view === 'cook') {
      if (k === 'close') closeCook();
      else if (k === 'next') { cook.step++; render(); }
      else if (k === 'prev') { cook.step--; render(); }
      else if (k === 'ing') { var i = +t.getAttribute('data-i'); cook.done[i] = !cook.done[i]; render(); }
      if (wakeLock == null) takeLock();
      return;
    }
    if (k === 'cook') return openCook();
    if (k === 'settings') { root.insertAdjacentHTML('beforeend', settingsHtml()); var f = root.querySelector('.k-sheet input'); if (f) f.focus(); return; }
    toApp();
  }
  function sheetErr(msg) { var e = root.querySelector('.k-err'); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function sheetTap(k) {
    if (k === 'cancel') { root.querySelector('.k-sheet').remove(); render(); }
    else if (k === 'geo') {
      sheetErr('');
      navigator.geolocation.getCurrentPosition(function (p) {
        var f = root.querySelector('.k-form'); if (!f) return;
        f.lat.value = round2(p.coords.latitude); f.lon.value = round2(p.coords.longitude);
        if (f.place.value === DEFAULTS.place) f.place.value = '';
      }, function () { sheetErr('Fikk ikke posisjonen. Skriv inn breddegrad og lengdegrad selv.'); }, { maximumAge: 3600e3, timeout: 15000, enableHighAccuracy: false });
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    var f = e.target, num = function (v) { return Number(String(v).replace(',', '.').trim()); };
    var lat = num(f.lat.value), lon = num(f.lon.value);
    if (!(String(f.lat.value).trim() && lat >= -90 && lat <= 90) || !(String(f.lon.value).trim() && lon >= -180 && lon <= 180)) return sheetErr('Breddegrad må være mellom −90 og 90, lengdegrad mellom −180 og 180.');
    if (!/^\d\d:\d\d$/.test(f.bed.value) || !/^\d\d:\d\d$/.test(f.wake.value)) return sheetErr('Skriv klokkeslett som tt:mm.');
    lsSet(LS_KEY, { bed: f.bed.value, wake: f.wake.value, lat: round2(lat), lon: round2(lon), place: String(f.place.value || '').trim().slice(0, 40) });
    root.querySelector('.k-sheet').remove(); render(); loadWeather(true);
  }
  function onSwipeStart(e) { if (view === 'cook' && e.touches && e.touches.length === 1) swipeX = [e.touches[0].clientX, e.touches[0].clientY]; }
  function onSwipeEnd(e) {
    if (view !== 'cook' || !swipeX || !e.changedTouches) return;
    var dx = e.changedTouches[0].clientX - swipeX[0], dy = e.changedTouches[0].clientY - swipeX[1]; swipeX = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { cook.step += dx < 0 ? 1 : -1; lastTap = Date.now(); render(); e.preventDefault(); }
  }

  /* ---------- Tidtakere ---------- */
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function minuteTick() {
    var ms = 60000 - (now() % 60000) + 50;
    timers.push(setTimeout(function () { if (!open) return; if (view === 'idle') render(); else applyPhase(); minuteTick(); }, ms));
  }
  function startTimers() {
    clearTimers();
    minuteTick();
    timers.push(setInterval(function () {
      if (!open) return;
      if (view === 'cook' && Date.now() - lastTap > COOK_IDLE_MS) closeCook();
      if (woke && now() - woke >= WAKE_MS && now() - woke < WAKE_MS + 31000) { woke = 0; render(); }
      applyPhase();
    }, 30000));
    timers.push(setInterval(function () { if (open) loadWeather(false); }, 5 * 60000));
  }

  function ensureRoot() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'kjokken'; root.className = 'kj'; root.setAttribute('data-testid', 'kjokken');
    root.addEventListener('click', onTap);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('touchstart', onSwipeStart, { passive: true });
    root.addEventListener('touchend', onSwipeEnd);
    document.body.appendChild(root);
  }
  function show() {
    ensureRoot();
    var was = open;
    open = true; root.hidden = false;
    document.documentElement.classList.add('k-html');
    homeBtn(false);
    if (!was) { view = cook ? 'cook' : 'idle'; startTimers(); root.classList.add('k-in'); setTimeout(function () { root && root.classList.remove('k-in'); }, 650); }
    loadWeather(false); render();
    if (view === 'cook' && !wakeLock) takeLock();
  }
  function hide() {
    if (!open) { homeBtn(fromKitchen()); return; }
    open = false; clearTimers(); dropLock();
    if (root) { root.hidden = true; root.innerHTML = ''; }
    document.documentElement.classList.remove('k-html');
    homeBtn(fromKitchen());
  }

  /* ---------- Vanlig Knaggen åpnet herfra: «⌂ Kjøkkenskjerm» og tilbake etter 2 min ---------- */
  function fromKitchen() { try { return sessionStorage.getItem(SS_FROM) === '1'; } catch (e) { return false; } }
  var btn = null, backTimer = null, dirty = false;
  function homeBtn(on) {
    if (on && !btn) {
      btn = document.createElement('a');
      btn.href = '#kjokken'; btn.className = 'k-home'; btn.setAttribute('data-testid', 'kjokken-knapp');
      btn.innerHTML = '<span aria-hidden="true">⌂</span> Kjøkkenskjerm';
      document.body.appendChild(btn);
    }
    if (btn) btn.hidden = !on;
    if (on) armBack(); else { clearTimeout(backTimer); backTimer = null; }
  }
  function busy() {
    if (dirty) return true;
    return !!document.querySelector('.overlay:not([hidden]), .ask-sheet, dialog[open], [role="dialog"]:not([hidden]):not(.k-sheet)');
  }
  function armBack() {
    clearTimeout(backTimer);
    backTimer = setTimeout(function () {
      if (open || !fromKitchen()) return;
      if (busy()) return armBack();   // åpne ark og skjemaer med ulagrede endringer stopper tidtakeren
      fadeOut(function () { location.hash = '#kjokken'; });
    }, IDLE_MS());
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!open && backTimer) armBack(); }, { passive: true, capture: true });
  });
  document.addEventListener('input', function (e) { if (!open && !(root && root.contains(e.target))) dirty = true; }, true);
  document.addEventListener('submit', function () { if (!open) dirty = false; }, true);
  window.addEventListener('hashchange', function () { dirty = false; });

  window.KnaggenKjokken = { show: show, hide: hide, isOpen: function () { return open; },
    _test: { refresh: function () { render(); }, phaseAt: phaseAt, schedule: schedule, sunTimes: sunTimes, settings: settings, mixHex: mixHex, wxIcon: wxIcon, wxText: wxText } };
})();
