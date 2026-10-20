/* Knaggen v0.14 «Del lista til Oda»: felles fil for appen og funksjonen (functions/delelinje.js er en byte-lik kopi,
 * sjekket av e2e-v014). Her ligger linjeformatet (oda-format-regler-v014.md), utløpstiden og rensingen av linjer.
 *   TTL_DAYS          – hvor lenge en delt lenke virker. Både expiresAt (funksjonen) og teksten i arket bruker denne.
 *   line(item)        – én vare { name, text, unit } → «250 g usaltet smør» (text = mengden slik lista viser den)
 *   lines(items)      – én linje per vare, like linjer slått sammen, samme rekkefølge
 *   cleanName(name)   – varenavnet i små bokstaver uten tilberedningsord, parenteser, tekst etter komma og etterstilte adjektiver
 *   sanitize(s)       – funksjonens vern: uten kontrolltegn og HTML, maks 120 tegn
 *   expiryText(ms)    – «27.10.» (Europe/Oslo) */
(function (root) {
  'use strict';
  var TTL_DAYS = 7, TTL_MS = TTL_DAYS * 86400000, MAX_LINES = 150, MAX_LEN = 120;
  // Tilberedningsord foran navnet (smalere enn PREP_RE i prep.js: «kokt skinke» og «revet ost» er produktnavn).
  var LEAD_RE = /^(hakket|hakkede|finhakket|finhakkede|grovhakket|grovhakkede|frisk|friske|fersk|ferske|kvernet|nykvernet|grovkvernet|finrevet|skivet|skivede|strimlet|presset|smeltet|myk|romtemperert|romtempererte|litt|ca\.?|evt\.?)\s+/i;
  // Etterstilte adjektiver som flyttes foran («smør usaltet» → «usaltet smør»), og presiseringer som tas bort («hvetemel siktet»).
  var POST_MOVE = ['usaltet', 'saltet', 'lettsaltet', 'usøtet', 'rød', 'røde', 'grønn', 'grønne', 'gul', 'gule', 'naturell'];
  var POST_DROP = ['siktet', 'fin', 'grov'];
  // Hermetikk: «2 bokser hermetiske knuste tomater (400 g)» (regel 3). Parentesen finnes bare i dette formatet.
  var CAN_G = 400;
  var CANNED = ['knuste tomater', 'hakkede tomater', 'hele tomater', 'kikerter', 'kidneybønner', 'hvite bønner', 'svarte bønner', 'mais', 'linser'];
  var COUNT = { stk: ['stk', 'stk'], pk: ['pakke', 'pakker'], pakke: ['pakke', 'pakker'], boks: ['boks', 'bokser'], glass: ['glass', 'glass'],
    beger: ['beger', 'beger'], pose: ['pose', 'poser'], flaske: ['flaske', 'flasker'], fedd: ['fedd', 'fedd'], bunt: ['bunt', 'bunter'],
    ss: ['spiseskje', 'spiseskjeer'], ts: ['teskje', 'teskjeer'] };
  var ML = { l: 1000, liter: 1000, dl: 100, cl: 10, ml: 1, ss: 15, ts: 5 }, G = { kg: 1000, g: 1, hg: 100 };

  function num(s) { return parseFloat(String(s).replace(',', '.')); }
  function fmt(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function sanitize(s) {
    s = String(s == null ? '' : s).replace(/<\/?[a-zA-Z!][^>]*>?/g, ' ').replace(/[<>]/g, ' ')
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length > MAX_LEN ? s.slice(0, MAX_LEN).trim() : s;
  }
  function cleanName(name) {
    var s = String(name == null ? '' : name).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
    s = s.replace(/\([^)]*\)?/g, ' ').split(/,(?!\d)|;/)[0].replace(/\s+/g, ' ').trim().toLocaleLowerCase('nb');
    var prev; do { prev = s; s = s.replace(LEAD_RE, ''); } while (s !== prev && s);
    var w = s.split(' ');
    while (w.length > 1 && POST_DROP.indexOf(w[w.length - 1]) >= 0) w.pop();
    if (w.length > 1 && POST_MOVE.indexOf(w[w.length - 1]) >= 0) w.unshift(w.pop());
    return sanitize(w.join(' ').replace(/[.\s:-]+$/, ''));
  }
  // «2 × 400 g», «1 l + 2 × 0,5 l», «3 stk», «2 ss + 1 ts» → [{ n, size, unit }]
  function parts(text) {
    return String(text || '').split(/\s*\+\s*/).map(function (p) {
      var m = /^(\d+)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*([a-zæøå]+)\.?$/i.exec(p.trim());
      if (m) return { n: +m[1], size: num(m[2]), unit: m[3].toLowerCase() };
      m = /^(\d+(?:[.,]\d+)?)\s*([a-zæøå]*)\.?$/i.exec(p.trim());
      return m ? { n: 1, size: num(m[1]), unit: m[2].toLowerCase() } : null;
    });
  }
  function volText(ml) {
    if (ml >= 1000 || ml % 500 === 0) return fmt(ml / 1000) + ' liter';
    if (ml % 100 === 0 || ml >= 100) return fmt(ml / 100) + ' dl';
    return fmt(ml) + ' ml';
  }
  function amount(text, name) {
    var ps = parts(text);
    if (!ps.length || ps.some(function (p) { return !p; })) return null;
    var units = ps.map(function (p) { return p.unit; });
    if (units.every(function (u) { return G[u]; })) {
      var g = ps.reduce(function (a, p) { return a + p.n * p.size * G[p.unit]; }, 0);
      if (CANNED.indexOf(name) >= 0 && ps.length === 1) {
        // «2 × 400 g» eller «800 g»: antall bokser med boksstørrelsen (vanlig boks 400 g)
        var sz = ps[0].n > 1 ? ps[0].size * G[ps[0].unit] : (g % CAN_G === 0 ? CAN_G : g), n = Math.round(g / sz);
        if (sz < 1000 && n >= 1 && n * sz === g) return { pre: n + ' ' + (n === 1 ? 'boks' : 'bokser') + ' hermetiske', post: ' (' + fmt(sz) + ' g)' };
      }
      return { pre: g >= 1000 ? fmt(g / 1000) + ' kg' : fmt(g) + ' g' };
    }
    if (units.every(function (u) { return ML[u]; }) && units.some(function (u) { return u !== 'ss' && u !== 'ts'; })) {
      return { pre: volText(ps.reduce(function (a, p) { return a + p.n * p.size * ML[p.unit]; }, 0)) };
    }
    if (ps.length === 1 && COUNT[units[0]]) {
      var c = ps[0].n * ps[0].size, f = COUNT[units[0]];
      return { pre: fmt(c) + ' ' + (c === 1 ? f[0] : f[1]) };
    }
    if (ps.length === 1 && units[0] === '') return { pre: fmt(ps[0].n * ps[0].size) + ' stk' };
    return null;
  }
  function line(it) {
    var name = cleanName(it && it.name);
    if (!name) return '';
    var t = String((it && it.text) || '').trim(), a = t ? amount(t, name) : null;
    if (a) return sanitize(a.pre + ' ' + name + (a.post || ''));
    if (!t && it && it.unit === 'stk') return sanitize('1 stk ' + name);
    if (t && /hermetisk/.test(name) === false && /^\d/.test(t)) return sanitize(t + ' ' + name);   // ukjent form: mengden som i lista
    return name;
  }
  function lines(items) {
    var out = [], seen = {};
    (items || []).forEach(function (it) { var l = line(it); if (l && !seen[l]) { seen[l] = 1; out.push(l); } });
    return out.slice(0, MAX_LINES);
  }
  function expiryText(ms) {
    var p = new Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'numeric' }).formatToParts(new Date(ms));
    var d = p.filter(function (x) { return x.type === 'day'; })[0], m = p.filter(function (x) { return x.type === 'month'; })[0];
    return (+d.value) + '.' + (+m.value) + '.';
  }
  function daysText() { return TTL_DAYS + (TTL_DAYS === 1 ? ' dag' : ' dager'); }
  var api = { TTL_DAYS: TTL_DAYS, TTL_MS: TTL_MS, MAX_LINES: MAX_LINES, MAX_LEN: MAX_LEN, line: line, lines: lines, cleanName: cleanName,
    sanitize: sanitize, expiryText: expiryText, daysText: daysText };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.KnaggenDeleLinje = api;
})(typeof self !== 'undefined' ? self : this);
