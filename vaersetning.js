/* Knaggen v0.22: «Nå» – én kort værsetning under temperaturen (skisse merkevare/na-vaer/v2).
 * Regelen som kode. Serien er [{ t: ms, temp, sym }] (timer, Oslo-tid) fra hentVaer (felt `serie`: resten av dagen).
 * Rent og uten nettverk, så den kan testes i node (tests/vaersetning.test.js). Ingen andre MET-felt enn temperatur og symbolkode.
 * setning(serie, nå) → { rule: 1–4, text } eller null (da viser appen dagens tekst, f.eks. «Delvis skyet»). */
(function (root) {
  'use strict';
  var TZ = 'Europe/Oslo';
  function day(ms) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms)); }
  function hour(ms) { return +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date(ms)) % 24; }
  function base(s) { return String(s || '').replace(/_(day|night|polartwilight)$/, ''); }
  function isWet(s) { return /rain|sleet|snow|thunder/.test(base(s)); }
  function isShower(s) { return /showers/.test(base(s)); }
  function wetWord(s) {
    var b = base(s);
    if (/thunder/.test(b)) return 'torden';
    if (/snow/.test(b)) return isShower(s) ? 'snøbyger' : 'snø';
    if (/sleet/.test(b)) return isShower(s) ? 'sluddbyger' : 'sludd';
    return isShower(s) ? 'byger' : 'regn';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function deg(x) { var r = Math.round(x); return (r < 0 ? '\u2212' + Math.abs(r) : String(r)) + '\u00b0'; }   // «−3°» (ekte minustegn)
  var FINT = { clearsky: 1, fair: 1, partlycloudy: 1 };
  function nowWord(s) { var b = base(s); return FINT[b] ? 'Fint nå' : b === 'cloudy' ? 'Skyet nå' : b === 'fog' ? 'Tåke nå' : null; }

  function setning(series, now) {
    if (!Array.isArray(series)) return null;
    var rest = series.filter(function (e) { return e && isFinite(e.t) && e.t >= now - 30 * 60e3 && day(e.t) === day(now); }).sort(function (a, b) { return a.t - b.t; });
    if (rest.length < 3) return null;   // færre enn tre timer igjen: dagens tekst
    var cur = rest[0], later = rest.slice(1);
    // et nedbørløp = byger alene, ellers minst to timer på rad
    function run(from, wet) {
      for (var i = from; i < rest.length; i++) {
        var w = isWet(rest[i].sym) === wet;
        if (w && (!wet || isShower(rest[i].sym) || (rest[i + 1] && isWet(rest[i + 1].sym)))) return i;
      }
      return -1;
    }
    var i, e;
    // 1 tørt nå, nedbør senere
    if (!isWet(cur.sym) && nowWord(cur.sym)) {
      i = run(1, true);
      if (i > 0) {
        e = rest[i];
        var when = e.t - now <= 60 * 60e3 ? ' snart' : hour(e.t) >= 21 ? ' sent i kveld' : ' fra ca. kl. ' + hour(e.t);
        return { rule: 1, text: nowWord(cur.sym) + ', ' + wetWord(e.sym) + when };
      }
    }
    // 2 nedbør nå, opphold senere (eller nedbør hele dagen = 3)
    if (isWet(cur.sym)) {
      i = run(1, false);
      if (i > 0) { e = rest[i]; return { rule: 2, text: cap(wetWord(cur.sym)) + ' nå, opphold ' + (hour(e.t) >= 21 ? 'sent i kveld' : 'fra ca. kl. ' + hour(e.t)) }; }
      return { rule: 3, text: cap(wetWord(cur.sym)) + ' hele dagen' };
    }
    // 3/4 tørt hele dagen
    if (!later.some(function (x) { return isWet(x.sym); })) {
      var temps = rest.filter(function (x) { return typeof x.temp === 'number'; });
      if (temps.length && typeof cur.temp === 'number') {
        var lo = temps.reduce(function (a, x) { return x.temp < a.temp ? x : a; }, temps[0]), hi = temps.reduce(function (a, x) { return x.temp > a.temp ? x : a; }, temps[0]);
        if (cur.temp - lo.temp >= 5 && lo.t > cur.t) return { rule: 4, text: 'Kaldere utover ' + (hour(lo.t) >= 17 ? 'kvelden' : 'dagen') + ', ned mot ' + deg(lo.temp) };
        if (hi.temp - cur.temp >= 5 && hi.t > cur.t) return { rule: 4, text: 'Mildere utover dagen, opp mot ' + deg(hi.temp) };
      }
      return { rule: 3, text: 'Oppholdsvær hele dagen' };
    }
    return null;
  }
  var api = { setning: setning, deg: deg, base: base, isWet: isWet, wetWord: wetWord };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.KnaggenVaerSetning = api;
})(typeof self !== 'undefined' ? self : this);
