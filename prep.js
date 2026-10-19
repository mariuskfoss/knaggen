/* Knaggen v0.13: felles fil for appen og funksjonen (functions/prep.js er en byte-lik kopi, sjekket av e2e-v013).
 * PREP_RE: tilberedningsord foran varenavnet (flyttet fra functions/parse.js, v0.12.1).
 * odaQuery/odaUrl: søkeordet og søkelenken for «Handle på Oda». Lenkeformatet ligger bare her. */
(function (root) {
  'use strict';
  var PREP_RE = /^(hakket|finhakket|finhakkede|grovhakket|grovhakkede|frisk|friske|fersk|ferske|kvernet|nykvernet|grovkvernet|revet|revne|finrevet|grovrevet|skivet|skivede|strimlet|terninger av|presset|smeltet|myk|romtemperert|romtempererte|kokt|kokte|tørket|tørkede|litt)\s+/i;
  var ODA_SEARCH = 'https://oda.com/no/search/products/?q=';
  var NUM = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?\\s*[½⅓⅔¼¾]?|[½⅓⅔¼¾⅕⅛⅙])';
  var UNITS = 'kg|g|gram|hg|mg|l|liter|dl|cl|ml|ss|spiseskjeer?|ts|teskjeer?|stk|stykk|boks|bokser|pk|pakke|pakker|pose|poser|beger|glass|flaske|flasker|fedd|båt|båter|neve|never|klype|klyper|bunt|kvast|skive|skiver|porsjon|porsjoner|dåse|dåser|kopp|kopper|blad';
  var QTY_RE = new RegExp('^[^\\d½⅓⅔¼¾⅕⅛⅙]{0,40}?' + NUM + '(?:\\s*(?:-|–|til)\\s*' + NUM + ')?\\s*(?:(?:' + UNITS + ')\\.?(?=\\s|$))?\\s*', 'i');
  var LEAD_UNIT_RE = new RegExp('^(?:' + UNITS + ')\\.?\\s+(?:av\\s+)?', 'i');
  function odaQuery(name) {
    var orig = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
    var s = orig.replace(/\([^)]*\)?/g, ' ');
    s = s.split(/,(?!\d)|;/)[0];
    s = s.replace(/\d+(?:[.,]\d+)?\s*%/g, ' ');   // «rømme 18 %» → rømme
    s = s.replace(/(^|\s)(ca|evt)\.?(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
    if (/[\d½⅓⅔¼¾⅕⅛⅙]/.test(s)) { var m = s.match(QTY_RE); if (m && m[0].length < s.length) s = s.slice(m[0].length); }
    s = s.replace(/^(av|of)\s+/i, '');
    if (LEAD_UNIT_RE.test(s) && /[\d½]/.test(orig)) s = s.replace(LEAD_UNIT_RE, '');
    s = s.split(/\s+eller\s+/i)[0];
    var prev; do { prev = s; s = s.replace(PREP_RE, '').replace(/^(av|of)\s+/i, ''); } while (s !== prev && s);
    s = s.replace(/[.\s:-]+$/, '').replace(/^[\s.,:-]+/, '').toLowerCase().trim();
    if (s.length > 40) { s = s.slice(0, 40); var sp = s.lastIndexOf(' '); if (sp > 20) s = s.slice(0, sp); s = s.trim(); }
    return s || orig.toLowerCase().slice(0, 40).trim();
  }
  function odaUrl(name) { return ODA_SEARCH + encodeURIComponent(odaQuery(name)); }
  var api = { PREP_RE: PREP_RE, ODA_SEARCH: ODA_SEARCH, odaQuery: odaQuery, odaUrl: odaUrl };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.KnaggenPrep = api;
})(typeof self !== 'undefined' ? self : this);
