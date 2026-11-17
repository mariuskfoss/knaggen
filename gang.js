/* 0.26.0 (Sigurd 17.11): gangen skalert etter husstanden – merkevare/retning-v3/gang-lag/README.md (Mons), fulgt nøyaktig.
 * Ren funksjon uten DOM (testes i node): KnaggenGang.plan(hs) → variant, knagger og lag; KnaggenGang.lag(hs) → lagene til
 * komponenten i hjemme5.js (gangHtml), øverste sist. hs = { people: {voksen, barn, smabarn}, persons: [{name, age, kind}] | null
 * (null = bare antall → standardlagene), pets: [{type: hund|katt|annet}] }.
 * Regler (README): behov = personer + 1 hvis hund (katt/annet teller ikke). Variant S (behov 1–2, 3 knagger tegnet), M (3–4, 5),
 * L (5+, 6). Produktregelen for antall knagger er min(behov + 1, 6); bakgrunnene er tegnet med maks i båndet, så S/M kan vise én
 * ledig knagg mer. Full liste (behov ≥ 6): den ledige knaggen faller bort; med hund er siste knagg båndet og bare de første 5 personene
 * får knagg, uten hund de første 6. Båndet henger alltid på siste knagg i lista. Personer fra venstre: voksne først, så barn fra eldst
 * til yngst. Katt og annet dyr ligger på gulvet. hjemmekos (matta) og felles-sko står alltid på; sko-barn-4-8 følger laget barn-4-8.
 * Hengende lag ligger på knagg 1 og flyttes dx = spacing × (k − 1) (lerretspiksler, 1280 bredt); spacing er ulik i lys og mørk. */
(function (global) {
  'use strict';
  var BASE = 'bilder/gang/';
  var PEGS = { s: 3, m: 5, l: 6 };
  var SPACING = { lys: { s: 133.12, m: 126.88, l: 104 }, mork: { s: 128.96, m: 124.80, l: 104 } };
  function cleanAge(v) { if (v == null || v === '') return null; var n = +v; return isFinite(n) && n >= 0 && n <= 120 && n === Math.floor(n) ? n : null; }
  // én person → gruppe og sorteringsalder (ukjent alder: «barn» regnes som 9, «småbarn» som 3, så eldst → yngst holder)
  function group(p) {
    var a = cleanAge(p && p.age), k = p && p.kind;
    if (a == null) {
      if (k === 'barn') return { g: 'std-barn', sort: 9 };
      if (k === 'smabarn') return { g: 'std-smabarn', sort: 3 };
      return { g: 'voksen', sort: 999 };
    }
    if (a >= 16) return { g: 'voksen', sort: 999 };
    if (a >= 9) return { g: 'b915', sort: a };
    if (a >= 4) return { g: 'b48', sort: a };
    return { g: 'b03', sort: a };
  }
  // personer i fast rekkefølge → lagnavn. To like barnelag ved siden av hverandre unngås som i README-eksemplet «Stor familie»
  // (14 og 11 år: barn-9-15, så standard-barn): annen gang i samme gruppe brukes standardlaget for gruppen.
  function personLayers(hs) {
    var out = [];
    if (hs && Array.isArray(hs.persons)) {
      var ps = hs.persons.map(function (p, i) { var g = group(p); return { g: g.g, sort: g.sort, i: i }; });
      ps.sort(function (a, b) { return (b.sort - a.sort) || (a.i - b.i); });   // voksne (999) først i oppgitt rekkefølge, så eldst → yngst
      var nV = 0, seen = {};
      ps.forEach(function (p) {
        if (p.g === 'voksen') { out.push('voksen-' + ((nV++ % 3) + 1)); return; }
        if (p.g === 'std-barn') { out.push('standard-barn'); return; }
        if (p.g === 'std-smabarn') { out.push('standard-smabarn'); return; }
        var first = !seen[p.g]; seen[p.g] = true;
        if (p.g === 'b915') out.push(first ? 'barn-9-15' : 'standard-barn');
        else if (p.g === 'b48') out.push(first ? 'barn-4-8' : 'standard-barn');
        else out.push(first ? 'barn-0-3' : 'standard-smabarn');
      });
    } else {
      var pe = (hs && hs.people) || { voksen: 2, barn: 2, smabarn: 0 };
      var add = function (n, l) { for (var i = 0; i < Math.max(0, n | 0); i++) out.push(l); };
      add(pe.voksen, 'standard-voksen'); add(pe.barn, 'standard-barn'); add(pe.smabarn, 'standard-smabarn');
    }
    return out;
  }
  function plan(hs) {
    hs = hs || {};
    var pets = Array.isArray(hs.pets) ? hs.pets : [];
    var dog = pets.some(function (d) { return d && d.type === 'hund'; });
    var people = personLayers(hs);
    var behov = people.length + (dog ? 1 : 0);
    var v = behov <= 2 ? 's' : behov <= 4 ? 'm' : 'l';
    var pegs = PEGS[v], cap = pegs - (dog ? 1 : 0);
    var hung = people.slice(0, cap);
    var knagger = [];
    for (var k = 0; k < pegs; k++) knagger.push(hung[k] || null);
    if (dog) knagger[pegs - 1] = 'hund';
    var gulv = ['hjemmekos', 'felles-sko'];
    if (hung.indexOf('barn-4-8') >= 0) gulv.push('sko-barn-4-8');
    if (pets.some(function (d) { return d && d.type === 'katt'; })) gulv.push('katt');
    if (pets.some(function (d) { return d && d.type === 'annet'; })) gulv.push('annet');
    return { variant: v, behov: behov, knaggerProdukt: Math.min(behov + 1, 6), knaggerTegnet: pegs, knagger: knagger, gulv: gulv,
      utenKnagg: people.length - hung.length };
  }
  function lag(hs) {
    var p = plan(hs), v = p.variant;
    var L = function (name, k) {
      var o = { navn: name, lys: BASE + 'lys/' + v + '/' + name + '.webp', mork: BASE + 'mork/' + v + '/' + name + '.webp' };
      if (k != null) { o.dxLys = Math.round(SPACING.lys[v] * k * 100) / 100; o.dxMork = Math.round(SPACING.mork[v] * k * 100) / 100; }
      return o;
    };
    var out = [L('bakgrunn')];
    p.gulv.forEach(function (n) { out.push(L(n)); });
    p.knagger.forEach(function (n, k) { if (n) out.push(L(n, k)); });
    out.variant = v; out.plan = p;
    return out;
  }
  var api = { plan: plan, lag: lag, PEGS: PEGS, SPACING: SPACING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.KnaggenGang = global.KnaggenGang || api;
})(typeof window !== 'undefined' ? window : this);
