/* Knaggen v0.8 – husstandsskalering. Referanse: merkevare/husstand/skalering.py (må stemme bit for bit),
   unntatt 0.25.0: rett fra Knaggen med husstand rundes opp (kvartOpp), ikke til nærmeste ¼ (Sigurd 11.11.2026), og
   0.26.1: porsjoner er hele tall rundet opp, minst 2, når vi skalerer; avvik på egne retter legges til/trekkes fra rettens porsjoner (Sigurd 18.11.2026). skalering.py er ikke oppdatert. */
(function (global) {
  'use strict';
  var VEKT = { voksen: 1, barn: 0.75, smabarn: 0.5 };
  var BASE = 4;
  var GULV = 0.5;
  var TELLE = { stk: 1, pk: 1, boks: 1, glass: 1, beger: 1, flaske: 1, fedd: 1, bunt: 1 };

  function porsjoner(p) {
    p = p || {};
    return (p.voksen || 0) * VEKT.voksen + (p.barn || 0) * VEKT.barn + (p.smabarn || 0) * VEKT.smabarn;
  }
  function kvart(x) {
    // nærmeste ¼, halvveis opp — samme som math.floor(x*4 + 1/2)/4 med Fraction
    return Math.floor(x * 4 + 0.5) / 4;
  }
  function kvartOpp(x) {
    // 0.25.0 (Sigurd 11.11): porsjoner rundes ALLTID opp — 3¼ → 4, 3½ → 4 (gulvet gir minst 2 ved B = 4). −1e-9 så hele tall står.
    return Math.ceil(x * 4 - 1e-9) / 4;
  }
  function dagensFolk(husstand, avvik) {
    avvik = avvik || {};
    if (!husstand) {
      if ((avvik.voksen || 0) < 0 || (avvik.barn || 0) < 0 || (avvik.smabarn || 0) < 0)
        throw new Error('Færre krever at husstanden er satt');
      return BASE + porsjoner(avvik);
    }
    return porsjoner({
      voksen: Math.max(0, (husstand.voksen || 0) + (avvik.voksen || 0)),
      barn: Math.max(0, (husstand.barn || 0) + (avvik.barn || 0)),
      smabarn: Math.max(0, (husstand.smabarn || 0) + (avvik.smabarn || 0))
    });
  }
  // 0.26.1 (Sigurd 18.11): «alltid opp, minst 2» – hele porsjoner, rundet opp, minst MIN_POR, når vi skalerer:
  //  1) Knaggen-rett, skalering på, husstand satt: dagens folk (vektet), opp, minst 2.
  //  2) Ingen avvik (egen rett / Knaggen uten skalering): som skrevet, B porsjoner (også B = 1 – «minst 2» bare når vi skalerer).
  //  3) Avvik: B + (dagens folk − husstandens folk), opp, minst 2 (vektene over). 0 personer = Tom. Faktoren er porsjoner / B, så tallet
  // i appen (B × faktor) og handlelista (mengde × faktor) alltid er det samme hele tallet. −1e-9 så hele tall står (3 → 3, ikke 4).
  var MIN_POR = 2;
  function helePorsjoner(x) { return Math.max(MIN_POR, Math.ceil(x - 1e-9)); }
  /** Porsjonene retten lages i for dagen (helt tall ≥ 2), 'Tom' når 0 personer, eller null når retten lages som skrevet (faktor 1). */
  function porsjonerFor(rettFraKnaggen, tilpassPa, husstand, avvik, B) {
    B = B == null ? BASE : B;
    var harAvvik = !!(avvik && (avvik.voksen || avvik.barn || avvik.smabarn));
    var Pd = dagensFolk(husstand, avvik);
    if (Pd === 0) return 'Tom';
    // Knaggen-rett, skalering på og husstanden satt: porsjonene er dagens folk (vektet), rundet opp, minst 2
    if (rettFraKnaggen && tilpassPa && husstand) return helePorsjoner(Pd);
    // Egen rett (eller Knaggen-rett uten skalering) uten avvik: lages som skrevet, for B porsjoner
    if (!harAvvik) return null;
    // Avvik (Sigurd 18.11): de ekstra legges til / de som ikke spiser trekkes fra rettens egne porsjoner med samme vekter
    // (voksen 1, barn ¾, småbarn ½): B + (Pd − P), der P = husstandens folk (4 når husstanden ikke er satt). Rundet opp, minst 2.
    // Eks.: egen rett for 4, husstand 2+2 (3½), +1 voksen → 4 + 1 = 5; −1 voksen → 3; −2 barn → 2½ → 3; for 1, +1 voksen → 2.
    // Gjelder egne retter og Knaggen-retter uten husstandsskalering (samme vei).
    var P = husstand ? porsjoner(husstand) : BASE;
    return helePorsjoner(B + (Pd - P));
  }
  /** @returns {number|string} faktor (porsjoner / B), eller 'Tom' når 0 personer */
  function faktor(rettFraKnaggen, tilpassPa, husstand, avvik, B) {
    B = B == null ? BASE : B;
    var n = porsjonerFor(rettFraKnaggen, tilpassPa, husstand, avvik, B);
    if (n === 'Tom') return 'Tom';
    if (n == null || n === B) return 1;
    return n / B;
  }
  function skalerIngrediens(qty, unit, f, harPakning) {
    var q = Number(qty) * f;
    if (TELLE[unit] && !harPakning) {
      if (qty < 1) return Math.max(0.5, Math.floor(q * 2 + 0.5) / 2);
      return Math.max(1, Math.floor(q + 0.5));
    }
    return q;
  }
  // 0.26.1: faktoren er porsjoner / B. For B = 4 er det alltid hele kvarter (som før); retter for 6, 8 eller egne retter for f.eks. 3
  // gir tredjedeler, sjettedeler og åttendedeler (2 av 6 = ×⅓). Ellers desimaltall med komma (×1,17).
  var BROK = { 2: { 1: '½' }, 3: { 1: '⅓', 2: '⅔' }, 4: { 1: '¼', 3: '¾' }, 5: { 1: '⅕', 2: '⅖', 3: '⅗', 4: '⅘' }, 6: { 1: '⅙', 5: '⅚' },
    8: { 1: '⅛', 3: '⅜', 5: '⅝', 7: '⅞' } };
  function fmt(f) {
    if (f === 'Tom') return '';
    var n = Math.floor(f + 1e-9), rest = f - n;
    if (rest < 1e-9) return '×' + String(n);
    var dens = [2, 3, 4, 5, 6, 8];
    for (var i = 0; i < dens.length; i++) {
      var d = dens[i], t = Math.round(rest * d);
      if (t > 0 && t < d && Math.abs(rest * d - t) < 1e-6 && BROK[d][t]) return '×' + (n ? String(n) : '') + BROK[d][t];
    }
    return '×' + (Math.round(f * 100) / 100).toFixed(2).replace(/0$/, '').replace('.', ',');
  }
  function peopleText(p, shortNames) {
    p = p || {};
    var parts = [];
    var v = p.voksen || 0, b = (p.barn || 0) + (p.smabarn || 0), s = p.smabarn || 0, ba = p.barn || 0;
    if (v) parts.push(v + (v === 1 ? ' voksen' : ' voksne'));
    // UI: barn 6–12 + småbarn sammen som «barn» i sammensetning (merkevare §3)
    if (shortNames) {
      if (b) parts.push(b + (b === 1 ? ' barn' : ' barn'));
    } else {
      if (ba) parts.push(ba + (ba === 1 ? ' barn 6–12' : ' barn 6–12'));
      if (s) parts.push(s + (s === 1 ? ' småbarn' : ' småbarn'));
    }
    return parts.join(' + ') || '0';
  }
  function deltaText(d) {
    d = d || {};
    var parts = [];
    function add(n, one, many) {
      if (!n) return;
      var a = Math.abs(n);
      parts.push((n > 0 ? '+' : '−') + a + ' ' + (a === 1 ? one : many));
    }
    add(d.voksen || 0, 'voksen', 'voksne');
    add(d.barn || 0, 'barn', 'barn');
    add(d.smabarn || 0, 'småbarn', 'småbarn');
    return parts.join(', ');
  }
  function netPeople(d) {
    return (d.voksen || 0) + (d.barn || 0) + (d.smabarn || 0);
  }
  function hasDelta(d) {
    return !!(d && (d.voksen || d.barn || d.smabarn));
  }
  function effectivePeople(husstand, avvik) {
    if (!husstand) {
      return { voksen: Math.max(0, (avvik && avvik.voksen) || 0), barn: Math.max(0, (avvik && avvik.barn) || 0), smabarn: Math.max(0, (avvik && avvik.smabarn) || 0) };
    }
    return {
      voksen: Math.max(0, (husstand.voksen || 0) + ((avvik && avvik.voksen) || 0)),
      barn: Math.max(0, (husstand.barn || 0) + ((avvik && avvik.barn) || 0)),
      smabarn: Math.max(0, (husstand.smabarn || 0) + ((avvik && avvik.smabarn) || 0))
    };
  }
  function isKnaggen(r) {
    if (!r) return false;
    if (r.scale === false) return false;
    if (r.origin === 'knaggen') return true;
    if (/^lib-/.test(r.id || '')) return true;
    return false;
  }
  function servingsOf(r) {
    if (r && r.servings != null && isFinite(r.servings) && r.servings > 0) return Number(r.servings);
    return BASE;
  }

  global.UKESHANDEL_SCALE = {
    VEKT: VEKT, BASE: BASE, GULV: GULV, TELLE: TELLE,
    porsjoner: porsjoner, kvart: kvart, kvartOpp: kvartOpp, dagensFolk: dagensFolk, faktor: faktor,
    MIN_POR: MIN_POR, helePorsjoner: helePorsjoner, porsjonerFor: porsjonerFor,
    skalerIngrediens: skalerIngrediens, fmt: fmt, peopleText: peopleText, deltaText: deltaText,
    netPeople: netPeople, hasDelta: hasDelta, effectivePeople: effectivePeople,
    isKnaggen: isKnaggen, servingsOf: servingsOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
