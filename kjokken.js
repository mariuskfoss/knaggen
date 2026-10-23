/* Knaggen v0.15 «Kjøkkenskjerm» (#kjokken). Design: merkevare/v015-kjokken (README, kjokken.css).
 * v0.16 (merkevare/v016-avganger-kalender): avganger fra Entur (direkte fra nettleseren, ET-Client-Name), opptil 4 kalendere
 * via funksjonen «kalender», vær på én linje, prioritert kutt når plassen er knapp, og ⚙ (#kjokken/innstillinger) i et ark til høyre.
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
    dag:   { bg: '#f4f2ed', surface: '#ebe8e1', line: '#dcd7cd', ink: '#252a28', muted: '#596260', clock: '#252a28', brand: '#3f6e5a', 'on-brand': '#ffffff', mark: '#252a28', brass: '#a5813f',
      'cal-1': '#3f6e5a', 'cal-2': '#44617a', 'cal-3': '#7a4f6a', 'cal-4': '#8a5232', late: '#7c5d28' },
    kveld: { bg: '#120c06', surface: '#1c140b', line: '#2a1e11', ink: '#d8a868', muted: '#a9804c', clock: '#e2b373', brand: '#b88a52', 'on-brand': '#120c06', mark: '#a9804c', brass: '#a9804c',
      'cal-1': '#d8a868', 'cal-2': '#b8ac62', 'cal-3': '#d99a7a', 'cal-4': '#e3c27a', late: '#e3c27a' },
    natt:  { bg: '#000000', surface: '#000000', line: '#000000', ink: '#3a2814', muted: '#3a2814', clock: '#7a542c', brand: '#3a2814', 'on-brand': '#000000', mark: '#2a1d0f', brass: '#2a1d0f',
      'cal-1': '#000000', 'cal-2': '#000000', 'cal-3': '#000000', 'cal-4': '#000000', late: '#000000' }
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
    var d = wx.d, compact = fit.lvl >= 5;
    // v0.16: én linje – ikon, temperatur nå, tekst og høy/lav (kuttes til ikon + temperatur når plassen er knapp)
    return '<div class="k-wx1 k-fadeable" data-testid="k-vaer">' + wxIcon(d.sym) + '<span class="t" data-testid="k-temp">' + (d.temp == null ? '–' : d.temp + '°') + '</span>' +
      (compact ? '' : '<span class="k-wxt">' + esc(wxText(d.sym)) + (s.place ? ' · ' + esc(s.place) : '') + '</span>' +
      (d.hi != null ? '<span class="s" data-testid="k-hoylav">· i dag ' + d.hi + '° / ' + d.lo + '°</span>' : '')) + '</div>';
  }

  /* ---------- v0.16: avganger (Entur Journey Planner v3, direkte fra nettleseren) ----------
   * Identifisert med ET-Client-Name. Grenser (Entur, 2026): 1000 kall/min og 200/s for identifiserte klienter
   * (uidentifiserte: 60/min). Vi spør ett kall hvert 30. sekund per skjerm, bare når skjermen vises, er på nett og
   * ikke er i Natt. Ved feil: 1, 2 og så 5 minutter. Ved 429 respekteres Rate-Limit-Expiry-Time. */
  var ENTUR = 'https://api.entur.io/journey-planner/v3/graphql', ET_CLIENT = 'mariuskfoss-knaggen';
  var AVG_KEY = 'knaggen:kjokken-avganger';     // { lat, lon, stops: [{ id, name, modes, dist, walk, all, sel: [nøkkel] }] }
  var POLL = 30000, BACKOFF = [60000, 120000, 300000], MAX_STOPS = 3, DEP_WINDOW = 3600e3;
  var Q_NEAR = 'query($lat:Float!,$lon:Float!){nearest(latitude:$lat,longitude:$lon,maximumDistance:1200,maximumResults:8,filterByPlaceTypes:[stopPlace],multiModalMode:parent){edges{node{distance place{... on StopPlace{id name transportMode quays{id publicCode lines{id publicCode transportMode name}}}}}}}}';
  var Q_DEP = 'query($ids:[String]!,$n:Int!,$range:Int!){stopPlaces(ids:$ids){id name estimatedCalls(numberOfDepartures:$n,timeRange:$range,arrivalDeparture:departures){aimedDepartureTime expectedDepartureTime realtime cancellation destinationDisplay{frontText} quay{id publicCode} serviceJourney{line{id publicCode transportMode}}}}}';
  var MODE_TXT = { bus: 'Buss', tram: 'Trikk', metro: 'T-bane', rail: 'Tog', water: 'Båt', coach: 'Buss', air: 'Fly', cableway: 'Bane', funicular: 'Bane', lift: 'Heis' };
  // Testkrok: window.KNAGGEN_KJOKKEN_SCALE (f.eks. 0.01) gjør 30 s / 1–2–5 min til 0,3 s / 0,6–1,2–3 s.
  function sc(ms) { return ms * (window.KNAGGEN_KJOKKEN_SCALE || 1); }
  function avg() {
    var a = lsGet(AVG_KEY) || {};
    if (!Array.isArray(a.stops)) a.stops = [];
    a.stops = a.stops.filter(function (x) { return x && typeof x.id === 'string'; }).slice(0, MAX_STOPS);
    a.stops.forEach(function (x) { if (!Array.isArray(x.sel)) x.sel = []; x.all = x.all !== false; x.walk = Math.max(0, Math.min(30, Math.round(+x.walk || 0))); });
    return a;
  }
  function saveAvg(a) { lsSet(AVG_KEY, a); }
  function avgPos(a) { var s = settings(); return a.lat != null && a.lon != null ? { lat: +a.lat, lon: +a.lon } : { lat: s.lat, lon: s.lon }; }
  function enturCall(query, vars) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    return fetch(ENTUR, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ET-Client-Name': ET_CLIENT }, body: JSON.stringify({ query: query, variables: vars }), signal: ctl && ctl.signal })
      .then(function (r) {
        clearTimeout(to);
        if (r.status === 429) { var e = new Error('rate'); e.code = 'rate'; e.until = Date.parse(r.headers.get('Rate-Limit-Expiry-Time') || '') || 0; throw e; }
        if (!r.ok) { var e2 = new Error('http'); e2.code = 'http-' + r.status; throw e2; }
        return r.json();
      }, function (e) { clearTimeout(to); throw e; })
      .then(function (j) { if (!j || !j.data) { var e = new Error('gql'); e.code = 'gql'; throw e; } return j.data; });
  }
  function walkDefault(dist) { return Math.max(1, Math.round((+dist || 0) / 80)); }   // 80 m i minuttet
  function distTxt(m) { return m >= 1000 ? (Math.round(m / 100) / 10).toString().replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m'; }
  function modesTxt(modes) { var o = []; (modes || []).forEach(function (m) { var t = MODE_TXT[m] || m; if (o.indexOf(t) < 0) o.push(t); }); return o.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }).replace(/(, )(.)/g, function (x, a, b) { return a + b.toLowerCase(); }); }
  function modeIcon(m) {
    var p = m === 'tram' ? '<rect x="6" y="5" width="12" height="13" rx="3"/><path d="M9 2h6M12 2v3M6 12h12M8 21l2-3M16 21l-2-3"/>'
      : m === 'metro' ? '<circle cx="12" cy="12" r="9"/><path d="M8 8h8M12 8v9"/>'
      : m === 'rail' ? '<rect x="6" y="3" width="12" height="15" rx="3"/><path d="M6 11h12M9 21l1.5-3M15 21l-1.5-3"/>'
      : m === 'water' ? '<path d="M4 15l2 4h12l2-4zM7 15V9h10v6M12 9V5"/>'
      : '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 21v-3M16 21v-3"/>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var dep = { data: null, at: 0, err: '', busy: false, fails: 0, timer: null, until: 0 };
  function bedMs(t) {
    var s = settings(), d = new Date(t), b = hm(s.bed), w = hm(s.wake), m = d.getHours() * 60 + d.getMinutes();
    var base = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (b < w && m >= w) b += 1440;          // leggetid etter midnatt (f.eks. 00:30)
    return base + b * 60000;
  }
  function depWanted() {
    if (!open || view !== 'idle' || document.visibilityState === 'hidden') return false;
    if (navigator.onLine === false || isNight()) return false;
    return avg().stops.length > 0;
  }
  function schedDep(ms) { clearTimeout(dep.timer); dep.timer = setTimeout(pollDep, ms); }
  function pollDep() {
    clearTimeout(dep.timer); dep.timer = null;
    if (!depWanted()) return schedDep(sc(POLL));   // sjekker igjen om litt (ingen nettkall)
    if (dep.until && Date.now() < dep.until) return schedDep(dep.until - Date.now() + 500);
    if (dep.busy) return;
    var a = avg(); dep.busy = true;
    enturCall(Q_DEP, { ids: a.stops.map(function (x) { return x.id; }), n: 60, range: 3600 }).then(function (d) {
      dep.data = d.stopPlaces || []; dep.at = now(); dep.err = ''; dep.fails = 0; dep.until = 0;
    }, function (e) {
      dep.err = (e && e.code) || 'nett'; dep.fails++;
      if (e && e.code === 'rate' && e.until) dep.until = e.until;
    }).then(function () {
      dep.busy = false;
      if (open && view === 'idle' && !root.querySelector('.k-sheet')) render();
      schedDep(dep.fails ? sc(BACKOFF[Math.min(dep.fails, BACKOFF.length) - 1]) : sc(POLL));
    });
  }
  function depKey(c) { return c.serviceJourney.line.id + '@' + c.quay.id; }
  function rel(ms, t) { var min = Math.floor((ms - t) / 60000); return min < 1 ? 'nå' : 'om ' + min + ' min'; }
  function depHtml(t, s) {
    var a = avg();
    if (!a.stops.length || !dep.data) {
      if (!a.stops.length) return '';
      return '<div class="k-dep k-fadeable k-o4" data-testid="k-avganger"><p class="k-lbl">Avganger</p><p class="note" data-testid="k-avg-note">' +
        (dep.err ? 'Fikk ikke hentet avgangene nå.' : 'Henter avganger …') + '</p></div>';
    }
    var per = fit.lvl >= 1 ? 2 : 3, until = Math.min(t + DEP_WINDOW, bedMs(t)), many = a.stops.length > 1, html = [];
    a.stops.forEach(function (st) {
      var sp = null; dep.data.forEach(function (x) { if (x && x.id === st.id) sp = x; });
      if (!sp) return;
      var groups = {}, order = [];
      (sp.estimatedCalls || []).forEach(function (c) {
        if (!c || !c.quay || !c.serviceJourney || !c.serviceJourney.line) return;
        var k = depKey(c); if (!st.all && st.sel.indexOf(k) < 0) return;
        var ms = Date.parse(c.expectedDepartureTime || c.aimedDepartureTime);
        if (!(ms > t - 30000) || ms > until) return;
        if (!groups[k]) { groups[k] = []; order.push(k); }
        if (groups[k].length < per) groups[k].push(c);
      });
      var rows = order.slice(0, 4).map(function (k) {
        var g = groups[k], l = g[0].serviceJourney.line, front = (g[0].destinationDisplay && g[0].destinationDisplay.frontText) || '';
        var first = true;
        var tms = g.map(function (c) {
          var ms = Date.parse(c.expectedDepartureTime || c.aimedDepartureTime), aim = Date.parse(c.aimedDepartureTime);
          var late = Math.round((ms - aim) / 60000), gone = ms - t < st.walk * 60000;
          if (c.cancellation) return '<span class="cx' + (gone ? ' gone' : '') + '" data-testid="k-avg-innstilt">' + esc(rel(ms, t)) + '</span><span class="cxl">innstilt</span>';
          var f = !gone && first; if (f) first = false;
          return '<span class="' + (late >= 2 ? 'late' : '') + (gone ? ' gone' : '') + (f ? ' first' : '') + '"' + (gone ? ' data-testid="k-avg-rekkerikke" title="Rekker du ikke"' : '') + '>' + esc(rel(ms, t)) + (late >= 2 ? '<i>+' + late + ' min</i>' : '') + '</span>';
        }).join('');
        return '<div class="ln" data-testid="k-avg-linje">' + modeIcon(l.transportMode) + '<span class="no">' + esc(l.publicCode || '') + '</span><span class="dir">' + esc(front) + '</span><span class="tms">' + tms + '</span></div>';
      });
      if (!rows.length) rows.push('<p class="note">Ingen avganger den neste timen.</p>');
      html.push('<div class="stop">' + (many ? '<p class="sn">' + esc(st.name) + '</p>' : '') + rows.join('') + '</div>');
    });
    var upd = new Date(dep.at), note = (many ? '' : esc(a.stops[0].name) + ' · ') + 'oppdatert ' + two(upd.getHours()) + ':' + two(upd.getMinutes()) +
      (dep.err ? ' · fikk ikke oppdatert' : '');
    return '<div class="k-dep k-fadeable k-o4' + (fit.lvl >= 1 ? ' compact' : '') + '" data-testid="k-avganger"><p class="k-lbl">Avganger</p>' + html.join('') +
      (fit.lvl >= 4 ? '' : '<p class="note" data-testid="k-avg-note">' + note + '</p>') + '</div>';
  }

  /* ---------- v0.16: kalender (via funksjonen «kalender», som henter ICS hvert 15. minutt) ---------- */
  var CAL_EVERY = 15 * 60000;
  var kal = { list: null, ev: null, at: 0, from: '', busy: false, err: '', timer: null };
  function loadCal(force) {
    var A = api();
    if (!A || !A.hid() || kal.busy || !A.calendar) return;
    if (!force && (Date.now() - kal.at < CAL_EVERY && kal.from === dayIso(now()))) return;
    if (!force && (navigator.onLine === false || document.visibilityState === 'hidden' || isNight())) return;
    kal.busy = true;
    var from = dayIso(now());
    A.calendar('hendelser', { from: from }).then(function (r) {
      kal.list = (r && r.kalendere) || []; kal.ev = (r && r.events) || []; kal.at = Date.now(); kal.from = from; kal.err = '';
    }, function (e) { kal.err = (e && e.code) || 'feil'; kal.at = Date.now() - CAL_EVERY + 60000; }).then(function () {
      kal.busy = false;
      if (open && view === 'idle' && !root.querySelector('.k-sheet')) render();
      if (open && root.querySelector('.k-sheet [data-testid="k-kal-liste"]')) refreshSheet();
    });
  }
  function evOn(e, iso, dayStart, dayEnd) {
    if (typeof e.s === 'string') return e.s <= iso && iso < e.e;
    return e.s < dayEnd && e.e > dayStart;
  }
  function calHtml(t) {
    if (!kal.list || !kal.list.length || !kal.ev) return '';
    var A = api(), d = new Date(t), cols = {}, names = {};
    kal.list.forEach(function (c) { cols[c.id] = c.color || 1; names[c.id] = c.name || ''; });
    function li(e, small, dayStart) {
      var tm = typeof e.s === 'string' ? 'Heldag' : (e.s < dayStart ? 'Før' : (function (x) { return two(x.getHours()) + ':' + two(x.getMinutes()); })(new Date(e.s)));
      return '<li' + (small ? ' class="small"' : '') + ' data-testid="k-kal-hendelse"><span class="dot" style="background:var(--k-cal-' + (cols[e.c] || 1) + ')"></span><span class="tm">' + tm + '</span>' +
        '<span class="tt">' + esc(e.t) + '</span><span class="who">' + esc(names[e.c] || '') + '</span></li>';
    }
    function dayEvents(i) {
      var ds = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime(), de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i + 1).getTime(), iso = A.isoDate(new Date(ds));
      var l = kal.ev.filter(function (e) { return evOn(e, iso, ds, de) && (i > 0 || typeof e.s === 'string' || e.e > t); });
      l.sort(function (a, b) { var as = typeof a.s === 'string', bs = typeof b.s === 'string'; return as !== bs ? (as ? -1 : 1) : (as ? 0 : a.s - b.s); });
      return { l: l, ds: ds, iso: iso };
    }
    var out = [], maxToday = fit.lvl >= 8 ? 1 : fit.lvl >= 2 ? 2 : 3, maxNext = fit.lvl >= 3 ? 1 : 2;
    var td = dayEvents(0);
    if (td.l.length) {
      var shown = td.l.slice(0, maxToday), rest = td.l.length - shown.length;
      out.push('<div class="k-cd" data-testid="k-kal-idag"><p class="dn">I dag</p><ul>' + shown.map(function (e) { return li(e, false, td.ds); }).join('') + '</ul>' +
        (rest > 0 ? '<p class="more" data-testid="k-kal-flere">+' + rest + ' til i dag</p>' : '') + '</div>');
    }
    var nDays = fit.lvl >= 7 ? 0 : fit.lvl >= 6 ? 1 : 2;   // etter kuttene i README: lavest rangert (de neste dagene) går først
    for (var i = 1; i <= nDays; i++) {
      var x = dayEvents(i), dd = new Date(x.ds), m = A.meal(x.iso);
      var head = DAYS[dd.getDay()] + ' · ' + (m ? (m.mark === 'rester' ? 'Rester – ' + m.name : m.name) : 'ingen middag valgt');
      var sh = x.l.slice(0, maxNext), more = x.l.length - sh.length;
      out.push('<div class="k-cd" data-testid="k-kal-dag"><p class="dn">' + esc(head) + '</p>' + (sh.length ? '<ul>' + sh.map(function (e) { return li(e, true, x.ds); }).join('') + '</ul>' : '') +
        (more > 0 ? '<p class="more">+' + more + '</p>' : '') + '</div>');
    }
    return '<div class="k-cal k-fadeable k-o5" data-testid="k-kal">' + out.join('') + '</div>';
  }

  /* ---------- v0.16: prioritert kutt når plassen ikke strekker til ----------
   * 1 færre avganger per linje · 2 færre avtaler i dag · 3 færre avtaler de neste dagene · 4 uten «oppdatert»-linje · 5 vær bare ikon + temperatur
   * Videre (utover skissene, etter rangeringen): 6 bare i morgen · 7 ingen neste dager · 8 én avtale i dag. */
  var fit = { lvl: 0 };
  function overflowing() {
    var grid = root.querySelector('.k-grid'), foot = root.querySelector('.k-foot');
    if (!grid) return false;
    var lim = foot ? foot.getBoundingClientRect().top - 8 : grid.getBoundingClientRect().bottom, over = false;
    root.querySelectorAll('.k-left > *, .k-right > *').forEach(function (el) { if (el.offsetParent && el.getBoundingClientRect().bottom > lim + 1) over = true; });
    return over;
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
    var mname = m ? (m.mark === 'rester' ? 'Rester – ' + m.name : m.name) : '';
    var dinner = m
      ? '<button type="button" class="k-dinbtn" data-k="cook" data-testid="k-middag"><p class="k-lbl">Middag i dag</p><p class="k-dinner">' + esc(mname) + '</p>' +
        '<p class="k-dmeta">' + esc([m.time, 'trykk for oppskrift'].filter(Boolean).join(' · ')) + '</p></button>'
      : '<div data-testid="k-middag-tom"><p class="k-lbl">Middag i dag</p><p class="k-dinner k-none">Ingen middag valgt</p></div>';
    var cal = calHtml(t), dep = depHtml(t, s);
    var next = '';
    if (!cal) {
      var li = [];
      for (var i = 1; i <= 3; i++) {
        var di = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), mi = A.meal(A.isoDate(di));
        li.push('<li><b>' + (i === 1 ? 'I morgen' : DAYS[di.getDay()]) + '</b> · ' + esc(mi ? mi.name : 'ingen middag valgt') + '</li>');
      }
      next = '<div class="k-fadeable k-o5"><p class="k-lbl">De neste dagene</p><ul class="k-next" data-testid="k-neste">' + li.join('') + '</ul></div>';
    }
    return '<div class="k-stage"><div class="k-grid"><div class="k-left">' +
      '<div class="k-timeblock k-o1"><p class="k-clock" data-testid="k-klokke" aria-label="Klokka er ' + clock + '">' + clock + '</p><p class="k-date k-fadeable" data-testid="k-dato">' + esc(date) + '</p></div>' +
      '<div class="k-fadeable k-o2">' + dinner + '</div>' + (cal || '') +
      '</div><div class="k-right"><div class="k-o3">' + weatherHtml(s) + '</div>' + dep + next +
      '</div></div>' +
      '<div class="k-foot k-fadeable"><span class="k-mark">' + MARK + 'Knaggen</span>' +
      '<span class="k-credit" data-testid="k-kreditering">Værdata fra MET Norway · Avganger fra Entur</span></div></div>';
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
  document.addEventListener('visibilitychange', function () { if (open && document.visibilityState === 'visible' && view === 'idle') { pollDep(); loadCal(false); } });
  window.addEventListener('online', function () { if (open) { dep.fails = 0; pollDep(); loadCal(false); } });
  window.addEventListener('resize', function () { if (open && view === 'idle') render(); });
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
    toApp();
  }
  /* ---------- ⚙ Innstillinger (v0.16: ark til høyre med tre faner) ---------- */
  var sheet = { tab: 'tid', near: null, nearErr: '', nearBusy: false, dirs: {}, adding: false, color: 1, calErr: '', calBusy: false, rmBusy: '' };
  var KAL_ERR = { 'bad-scheme': 'Adressen må begynne med https:// eller webcal://.', blocked: 'Den adressen kan ikke brukes.', 'bad-url': 'Det ser ikke ut som en nettadresse.',
    'not-ics': 'Fant ingen kalender på adressen. Bruk «Hemmelig adresse i iCal-format».', gone: 'Adressen virker ikke (finnes ikke, eller er tilbakestilt).',
    'too-large': 'Kalenderen er for stor (over 2 MB).', timeout: 'Kalenderen svarte ikke i tide. Prøv igjen.', max: 'Dere har allerede 4 kalendere.', rate: 'For mange forsøk. Vent litt og prøv igjen.',
    name: 'Gi kalenderen et navn (opptil 30 tegn).', 'no-key': 'Kalender er ikke slått på ennå.', 'no-server': 'Fikk ikke kontakt. Er enheten på nett?' };
  function tabsHtml() {
    return '<div class="k-seg" role="tablist">' + [['tid', 'Tid og sted'], ['avg', 'Avganger'], ['kal', 'Kalendere']].map(function (x) {
      return '<button type="button" role="tab" data-k="tab" data-tab="' + x[0] + '" data-testid="k-fane-' + x[0] + '" aria-selected="' + (sheet.tab === x[0]) + '" class="' + (sheet.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function tidHtml() {
    var s = settings();
    return '<form class="k-form" data-k="form">' +
      '<p class="lead">Lagres bare på denne enheten.</p>' +
      '<div class="k-row"><label>Leggetid<input type="time" name="bed" value="' + esc(s.bed) + '" required data-testid="k-leggetid"></label>' +
      '<label>Stå opp<input type="time" name="wake" value="' + esc(s.wake) + '" required data-testid="k-staopp"></label></div>' +
      '<p class="k-help">Sted for vær og sol (avrundes til 2 desimaler, omtrent 1 km).</p>' +
      '<div class="k-row"><label>Stedsnavn<input name="place" maxlength="40" value="' + esc(s.place) + '" data-testid="k-sted"></label></div>' +
      '<div class="k-row"><label>Breddegrad<input name="lat" inputmode="decimal" value="' + s.lat + '" required data-testid="k-lat"></label>' +
      '<label>Lengdegrad<input name="lon" inputmode="decimal" value="' + s.lon + '" required data-testid="k-lon"></label></div>' +
      (navigator.geolocation ? '<button type="button" class="kb" data-k="geo" data-testid="k-geo">Bruk posisjonen min</button>' : '') +
      '<p class="k-help k-err" data-testid="k-set-feil" hidden></p>' +
      '<div class="acts"><button type="submit" class="kb pri" data-testid="k-lagre">Lagre</button><button type="button" class="kb" data-k="cancel">Avbryt</button></div>' +
      '</form>';
  }
  function loadNear(force) {
    var a = avg(), pos = avgPos(a);
    if (sheet.nearBusy) return;
    if (!force && sheet.near && sheet.near.lat === pos.lat && sheet.near.lon === pos.lon) return;
    sheet.nearBusy = true; sheet.nearErr = '';
    enturCall(Q_NEAR, { lat: pos.lat, lon: pos.lon }).then(function (d) {
      var list = [];
      ((d.nearest && d.nearest.edges) || []).forEach(function (e) {
        var p = e && e.node && e.node.place; if (!p || !p.id) return;
        var modes = []; (p.quays || []).forEach(function (q) { (q.lines || []).forEach(function (l) { if (modes.indexOf(l.transportMode) < 0) modes.push(l.transportMode); }); });
        if (!modes.length && p.transportMode) modes = [].concat(p.transportMode);
        if (!list.some(function (x) { return x.id === p.id; })) list.push({ id: p.id, name: p.name, dist: Math.round(e.node.distance || 0), modes: modes });
      });
      sheet.near = { lat: pos.lat, lon: pos.lon, list: list };
    }, function () { sheet.nearErr = 'Fikk ikke hentet holdeplasser fra Entur nå.'; }).then(function () { sheet.nearBusy = false; refreshSheet(); });
  }
  function loadDirs(id) {
    if (sheet.dirs[id]) return;
    sheet.dirs[id] = { busy: true, list: [] };
    enturCall(Q_DEP, { ids: [id], n: 200, range: 4 * 3600 }).then(function (d) {
      var seen = {}, list = [];
      (((d.stopPlaces || [])[0] || {}).estimatedCalls || []).forEach(function (c) {
        if (!c || !c.quay || !c.serviceJourney || !c.serviceJourney.line) return;
        var k = depKey(c); if (seen[k]) return; seen[k] = 1;
        var l = c.serviceJourney.line;
        list.push({ key: k, code: l.publicCode || '', mode: l.transportMode, front: (c.destinationDisplay && c.destinationDisplay.frontText) || '' });
      });
      list.sort(function (a, b) { return String(a.code).localeCompare(String(b.code), 'nb', { numeric: true }) || a.front.localeCompare(b.front, 'nb'); });
      sheet.dirs[id] = { list: list };
    }, function () { sheet.dirs[id] = { err: true, list: [] }; }).then(refreshSheet);
  }
  function avgHtml() {
    var a = avg(), s = settings(), chosen = {};
    a.stops.forEach(function (x) { chosen[x.id] = x; });
    loadNear(false);
    var list = (sheet.near && sheet.near.list) || [];
    a.stops.forEach(function (x) { if (!list.some(function (y) { return y.id === x.id; })) list = [x].concat(list); });
    var rows = list.map(function (n) {
      var c = chosen[n.id], meta = [modesTxt(n.modes), n.dist != null ? distTxt(n.dist) : ''].filter(Boolean).join(' · ');
      var h = '<div class="row" data-testid="k-holdeplass"><button type="button" class="chk" data-k="stop" data-id="' + esc(n.id) + '" aria-pressed="' + !!c + '"><span class="box' + (c ? ' on' : '') + '">' + (c ? '✓' : '') + '</span><b>' + esc(n.name) + '</b><span class="meta">' + esc(meta) + '</span></button>';
      if (c) {
        h += '<div class="k-sub"><div class="k-seg"><button type="button" data-k="stopall" data-id="' + esc(n.id) + '" data-v="1" class="' + (c.all ? 'on' : '') + '" data-testid="k-alle-linjer">Alle linjer</button>' +
          '<button type="button" data-k="stopall" data-id="' + esc(n.id) + '" data-v="0" class="' + (!c.all ? 'on' : '') + '" data-testid="k-valgte-linjer">Valgte linjer</button></div>' +
          '<div class="walk"><span>Gangtid</span><button type="button" class="kb" data-k="walk" data-id="' + esc(n.id) + '" data-d="-1" aria-label="Kortere gangtid">−</button><b data-testid="k-gangtid">' + c.walk + ' min</b>' +
          '<button type="button" class="kb" data-k="walk" data-id="' + esc(n.id) + '" data-d="1" aria-label="Lengre gangtid">+</button><span class="meta">Avganger du ikke rekker, tones ned.</span></div>';
        if (!c.all) {
          loadDirs(n.id);
          var dl = sheet.dirs[n.id] || { busy: true, list: [] };
          h += '<div class="lines">' + (dl.busy ? '<p class="meta">Henter linjer …</p>' : dl.err ? '<p class="meta">Fikk ikke hentet linjene nå.</p>' : !dl.list.length ? '<p class="meta">Fant ingen avganger de neste fire timene.</p>' :
            dl.list.map(function (l) {
              var on = c.sel.indexOf(l.key) >= 0;
              return '<button type="button" class="chk" data-k="line" data-id="' + esc(n.id) + '" data-key="' + esc(l.key) + '" aria-pressed="' + on + '" data-testid="k-linje"><span class="box' + (on ? ' on' : '') + '">' + (on ? '✓' : '') + '</span>' +
                '<span class="no">' + esc(l.code) + '</span><span>' + esc((MODE_TXT[l.mode] || '') + (l.front ? ' mot ' + l.front : '')) + '</span></button>';
            }).join('')) + '</div>';
        }
        h += '</div>';
      }
      return h + '</div>';
    }).join('');
    var full = a.stops.length >= MAX_STOPS;
    return '<p class="lead">Velg holdeplassene dere bruker (opptil ' + MAX_STOPS + '). Vises på kjøkkenskjermen, ikke om natta. Lagres bare på denne enheten.</p>' +
      '<p class="lab">Nærmest ' + esc(a.lat != null ? 'posisjonen din' : s.place || 'stedet') + '</p>' +
      (sheet.nearBusy && !list.length ? '<p class="meta">Henter holdeplasser …</p>' : '') + (sheet.nearErr ? '<p class="meta" data-testid="k-avg-feil">' + esc(sheet.nearErr) + '</p>' : '') +
      (full ? '<p class="meta">Fjern en holdeplass for å velge en annen.</p>' : '') +
      '<div class="rows" data-testid="k-holdeplasser">' + rows + '</div>' +
      (navigator.geolocation ? '<button type="button" class="kb" data-k="avggeo" data-testid="k-avg-geo">Finn holdeplasser nær posisjonen min</button>' : '') +
      '<p class="meta">Avganger fra Entur. Skjermen spør Entur direkte hvert 30. sekund mens den vises.</p>';
  }
  function kalHtml() {
    var A = api();
    if (!A.hid()) return '<p class="lead" data-testid="k-kal-uten">Kalendere kan legges til når denne enheten er med i en husstand.</p>';
    if (sheet.adding) {
      return '<form class="k-calform" data-k="calform" data-testid="k-kal-ny">' +
        '<div class="guide"><b>Slik finner du adressen i Google Kalender</b><ol><li>Åpne Google Kalender i en nettleser på PC eller Mac (ikke i mobilappen).</li>' +
        '<li>Tannhjulet øverst til høyre → Innstillinger.</li><li>Til venstre, under «Innstillinger for kalenderne mine»: velg kalenderen.</li>' +
        '<li>Velg «Integrer kalenderen» og kopier «Hemmelig adresse i iCal-format».</li></ol></div>' +
        '<p class="k-warn"><b>Adressen er hemmelig, som en nøkkel.</b> Den som har den, kan lese kalenderen. Del den ikke. Lekker den: trykk «Tilbakestill» i Google og lim inn den nye.</p>' +
        '<label class="fld"><span class="lab">Navn</span><input name="name" maxlength="30" required autocomplete="off" data-testid="k-kal-navn"></label>' +
        '<label class="fld"><span class="lab">Hemmelig adresse (iCal)</span><input name="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" required data-testid="k-kal-url"></label>' +
        '<div class="fld"><span class="lab">Farge</span><div class="k-sw" role="radiogroup">' + [1, 2, 3, 4].map(function (c) {
          return '<button type="button" role="radio" aria-checked="' + (sheet.color === c) + '" aria-label="Farge ' + c + '" data-k="color" data-c="' + c + '" data-testid="k-kal-farge-' + c + '" class="' + (sheet.color === c ? 'on' : '') + '" style="background:var(--k-cal-' + c + ')">' + (sheet.color === c ? '✓' : '') + '</button>';
        }).join('') + '</div></div>' +
        '<p class="k-help k-err" data-testid="k-kal-feil"' + (sheet.calErr ? '' : ' hidden') + '>' + esc(sheet.calErr) + '</p>' +
        '<div class="acts"><button type="submit" class="kb pri" data-testid="k-kal-legg"' + (sheet.calBusy ? ' disabled' : '') + '>' + (sheet.calBusy ? 'Sjekker adressen …' : 'Legg til') + '</button>' +
        '<button type="button" class="kb" data-k="caladdx">Avbryt</button></div></form>';
    }
    if (!kal.list && !kal.busy) loadCal(true);
    var l = kal.list || [];
    var rows = l.map(function (c) {
      var bad = c.status === 'gone';
      return '<div class="row cal" data-testid="k-kal-rad"><span class="dot" style="background:var(--k-cal-' + (c.color || 1) + ')"></span>' +
        '<span><b>' + esc(c.name) + '</b>' + (c.mine && c.mask ? '<br><span class="meta" data-testid="k-kal-maske">' + esc(c.mask) + '</span>' : '') +
        (bad ? '<br><span class="warnline" data-testid="k-kal-borte">Adressen virker ikke lenger – lim inn en ny</span>' : c.status === 'feil' ? '<br><span class="meta">Fikk ikke hentet sist</span>' : '') + '</span>' +
        '<span class="meta">' + (kal.at && c.status !== 'gone' ? 'hentet ' + two(new Date(kal.at).getHours()) + ':' + two(new Date(kal.at).getMinutes()) : '') + '</span>' +
        '<button type="button" class="kb del" data-k="calrm" data-id="' + esc(c.id) + '" data-testid="k-kal-fjern"' + (sheet.rmBusy === c.id ? ' disabled' : '') + '>Fjern</button></div>';
    }).join('');
    return '<p class="lead">Avtaler fra opptil 4 kalendere vises på kjøkkenskjermen: i dag og de to neste dagene. Hentes hvert 15. minutt. Gjelder hele husstanden.</p>' +
      (kal.busy && !kal.list ? '<p class="meta">Henter kalenderne …</p>' : '') + (kal.err && !kal.list ? '<p class="meta">Fikk ikke hentet kalenderne nå.</p>' : '') +
      '<div class="rows" data-testid="k-kal-liste">' + rows + '</div>' +
      (l.length < 4 ? '<button type="button" class="kb" data-k="caladd" data-testid="k-kal-ny-knapp">+ Legg til kalender</button>' : '<p class="meta">Dere har 4 kalendere, som er det meste.</p>');
  }
  function sheetBody() {
    var title = sheet.adding && sheet.tab === 'kal' ? 'Legg til kalender' : 'Kjøkkenskjerm';
    return '<div class="k-set" data-testid="k-innstillinger-panel"><div class="top"><h2 id="k-set-h">' + title + '</h2><button type="button" data-k="cancel" aria-label="Lukk" data-testid="k-set-lukk">×</button></div>' +
      (sheet.adding && sheet.tab === 'kal' ? '' : tabsHtml()) +
      '<div class="k-setbody">' + (sheet.tab === 'avg' ? avgHtml() : sheet.tab === 'kal' ? kalHtml() : tidHtml()) + '</div></div>';
  }
  function settingsHtml() {
    return '<div class="k-sheet" role="dialog" aria-modal="true" aria-labelledby="k-set-h" data-testid="k-innstillinger-ark"><div class="k-set-ov" data-k="cancel"></div>' + sheetBody() + '</div>';
  }
  function refreshSheet() {
    var el = root && root.querySelector('.k-sheet'); if (!el) return;
    var panel = el.querySelector('.k-set'), sc = panel ? panel.querySelector('.k-setbody') : null, top = sc ? sc.scrollTop : 0;
    if (el.querySelector('.k-calform') && sheet.adding) {   // ikke tegn over skjemaet (ville tømt adressefeltet)
      var b = el.querySelector('[data-testid="k-kal-legg"]'), er = el.querySelector('[data-testid="k-kal-feil"]');
      if (b) { b.disabled = sheet.calBusy; b.textContent = sheet.calBusy ? 'Sjekker adressen …' : 'Legg til'; }
      if (er) { er.textContent = sheet.calErr; er.hidden = !sheet.calErr; }
      el.querySelectorAll('[data-k="color"]').forEach(function (x) { var on = +x.getAttribute('data-c') === sheet.color; x.className = on ? 'on' : ''; x.setAttribute('aria-checked', on); x.textContent = on ? '✓' : ''; });
      return;
    }
    if (panel) panel.outerHTML = sheetBody();
    var sc2 = el.querySelector('.k-setbody'); if (sc2) sc2.scrollTop = top;
  }
  function openSheet(tab) {
    if (root.querySelector('.k-sheet')) return;
    sheet.tab = tab || sheet.tab || 'tid'; sheet.adding = false; sheet.calErr = '';
    root.insertAdjacentHTML('beforeend', settingsHtml());
    var f = root.querySelector('.k-set button'); if (f) f.focus();
  }
  function closeSheet() {
    var el = root.querySelector('.k-sheet'); if (el) el.remove();
    if (/^#kjokken\/innstillinger/.test(location.hash)) { try { history.replaceState(null, '', '#kjokken'); } catch (e) {} }
    render(); pollDep();
  }
  function updStop(id, fn) {
    var a = avg(); a.stops.forEach(function (x) { if (x.id === id) fn(x); }); saveAvg(a); dep.data = null; refreshSheet();
  }
  function sheetErr(msg) { var e = root.querySelector('.k-err'); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function sheetTap(k, e) {
    var t = e.target.closest('[data-k]'), id = t && t.getAttribute('data-id');
    if (k === 'cancel') return closeSheet();
    if (k === 'tab') { sheet.tab = t.getAttribute('data-tab'); sheet.adding = false; sheet.calErr = ''; return refreshSheet(); }
    if (k === 'geo') {
      sheetErr('');
      navigator.geolocation.getCurrentPosition(function (p) {
        var f = root.querySelector('.k-form'); if (!f) return;
        f.lat.value = round2(p.coords.latitude); f.lon.value = round2(p.coords.longitude);
        if (f.place.value === DEFAULTS.place) f.place.value = '';
      }, function () { sheetErr('Fikk ikke posisjonen. Skriv inn breddegrad og lengdegrad selv.'); }, { maximumAge: 3600e3, timeout: 15000, enableHighAccuracy: false });
      return;
    }
    if (k === 'avggeo') {
      navigator.geolocation.getCurrentPosition(function (p) {
        var a = avg(); a.lat = Math.round(p.coords.latitude * 1e4) / 1e4; a.lon = Math.round(p.coords.longitude * 1e4) / 1e4; saveAvg(a); loadNear(true); refreshSheet();
      }, function () { sheet.nearErr = 'Fikk ikke posisjonen. Holdeplassene over er nær stedet under «Tid og sted».'; refreshSheet(); }, { maximumAge: 600e3, timeout: 15000, enableHighAccuracy: true });
      return;
    }
    if (k === 'stop') {
      var a = avg(), has = a.stops.some(function (x) { return x.id === id; });
      if (has) a.stops = a.stops.filter(function (x) { return x.id !== id; });
      else {
        if (a.stops.length >= MAX_STOPS) return;
        var n = ((sheet.near && sheet.near.list) || []).filter(function (x) { return x.id === id; })[0];
        if (!n) return;
        a.stops.push({ id: n.id, name: n.name, modes: n.modes, dist: n.dist, walk: walkDefault(n.dist), all: true, sel: [] });
      }
      saveAvg(a); dep.data = null; dep.fails = 0; refreshSheet(); return;
    }
    if (k === 'stopall') return updStop(id, function (x) { x.all = t.getAttribute('data-v') === '1'; });
    if (k === 'walk') return updStop(id, function (x) { x.walk = Math.max(0, Math.min(30, x.walk + +t.getAttribute('data-d'))); });
    if (k === 'line') { var key = t.getAttribute('data-key'); return updStop(id, function (x) { var i = x.sel.indexOf(key); if (i >= 0) x.sel.splice(i, 1); else x.sel.push(key); }); }
    if (k === 'caladd') { sheet.adding = true; sheet.calErr = ''; sheet.color = nextColor(); refreshSheet(); var f = root.querySelector('[data-testid="k-kal-navn"]'); if (f) f.focus(); return; }
    if (k === 'caladdx') { sheet.adding = false; sheet.calErr = ''; return refreshSheet(); }
    if (k === 'color') { sheet.color = +t.getAttribute('data-c'); return refreshSheet(); }
    if (k === 'calrm') {
      if (sheet.rmBusy) return;
      sheet.rmBusy = id; refreshSheet();
      api().calendar('fjern', { id: id }).then(function () {
        if (kal.list) kal.list = kal.list.filter(function (c) { return c.id !== id; });
        if (kal.ev) kal.ev = kal.ev.filter(function (x) { return x.c !== id; });
      }, function () {}).then(function () { sheet.rmBusy = ''; refreshSheet(); });
    }
  }
  function nextColor() { var used = (kal.list || []).map(function (c) { return c.color; }); for (var c = 1; c <= 4; c++) if (used.indexOf(c) < 0) return c; return 1; }
  function onCalSubmit(f) {
    if (sheet.calBusy) return;
    var name = String(f.name.value || '').trim(), url = String(f.url.value || '').trim();
    if (!name || name.length > 30) { sheet.calErr = KAL_ERR.name; return refreshSheet(); }
    if (!url) { sheet.calErr = 'Lim inn den hemmelige adressen.'; return refreshSheet(); }
    sheet.calBusy = true; sheet.calErr = ''; refreshSheet();
    api().calendar('legg', { name: name, color: sheet.color, url: url, from: dayIso(now()) }).then(function () {
      f.url.value = ''; sheet.calBusy = false; sheet.adding = false; kal.at = 0; refreshSheet(); loadCal(true);
    }, function (e) {
      sheet.calBusy = false; sheet.calErr = KAL_ERR[e && e.message] || KAL_ERR[e && e.code] || 'Fikk ikke lagt til kalenderen. Prøv igjen.'; refreshSheet();
    });
  }
  function onSubmit(e) {
    e.preventDefault();
    var f = e.target;
    if (f.getAttribute('data-k') === 'calform') return onCalSubmit(f);
    var num = function (v) { return Number(String(v).replace(',', '.').trim()); };
    var lat = num(f.lat.value), lon = num(f.lon.value);
    if (!(String(f.lat.value).trim() && lat >= -90 && lat <= 90) || !(String(f.lon.value).trim() && lon >= -180 && lon <= 180)) return sheetErr('Breddegrad må være mellom −90 og 90, lengdegrad mellom −180 og 180.');
    if (!/^\d\d:\d\d$/.test(f.bed.value) || !/^\d\d:\d\d$/.test(f.wake.value)) return sheetErr('Skriv klokkeslett som tt:mm.');
    lsSet(LS_KEY, { bed: f.bed.value, wake: f.wake.value, lat: round2(lat), lon: round2(lon), place: String(f.place.value || '').trim().slice(0, 40) });
    closeSheet(); loadWeather(true);
  }
  function render() {
    if (!root) return;
    if (root.querySelector('.k-sheet')) return;   // ikke tegn over innstillingene mens de er åpne
    root.classList.toggle('k-cook', view === 'cook');
    root.classList.add('k-v16');
    var land = window.innerWidth > window.innerHeight;
    root.classList.toggle('k-land', land); root.classList.toggle('k-port', !land);
    if (view === 'cook' && cook) { root.innerHTML = cookHtml(); applyPhase(); return; }
    fit.lvl = 0;
    root.innerHTML = idleHtml(); applyPhase();
    while (fit.lvl < 8 && !root.classList.contains('k-natt') && overflowing()) { fit.lvl++; root.innerHTML = idleHtml(); }
    root.setAttribute('data-kutt', String(fit.lvl));
  }
  function onSwipeStart(e) { if (view === 'cook' && e.touches && e.touches.length === 1) swipeX = [e.touches[0].clientX, e.touches[0].clientY]; }
  function onSwipeEnd(e) {
    if (view !== 'cook' || !swipeX || !e.changedTouches) return;
    var dx = e.changedTouches[0].clientX - swipeX[0], dy = e.changedTouches[0].clientY - swipeX[1]; swipeX = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { cook.step += dx < 0 ? 1 : -1; lastTap = Date.now(); render(); e.preventDefault(); }
  }

  /* ---------- Tidtakere ---------- */
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; clearTimeout(dep.timer); dep.timer = null; }
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
    timers.push(setInterval(function () { if (open) { loadWeather(false); loadCal(false); } }, 5 * 60000));
    timers.push(setInterval(function () { if (open) loadCal(false); }, 60000));
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
  function show(sub) {
    ensureRoot();
    var was = open;
    open = true; root.hidden = false;
    document.documentElement.classList.add('k-html');
    homeBtn(false);
    if (!was) { view = cook ? 'cook' : 'idle'; startTimers(); root.classList.add('k-in'); setTimeout(function () { root && root.classList.remove('k-in'); }, 650); }
    loadWeather(false); loadCal(false);
    if (sub !== 'innstillinger' && root.querySelector('.k-sheet')) root.querySelector('.k-sheet').remove();
    render();
    if (!was) pollDep();
    if (sub === 'innstillinger' && view === 'idle') openSheet('tid');
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
    _test: { refresh: function () { render(); }, poll: function () { dep.fails = 0; dep.until = 0; pollDep(); }, loadCal: function () { loadCal(true); }, fit: function () { return fit.lvl; }, bedMs: bedMs, phaseAt: phaseAt, schedule: schedule, sunTimes: sunTimes, settings: settings, mixHex: mixHex, wxIcon: wxIcon, wxText: wxText } };
})();
