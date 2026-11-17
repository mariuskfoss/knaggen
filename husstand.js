/* 0.26.0 (retning-v3, byggeordre Sigurd 12.11): «Hvem bor i husstanden?» i to nivåer og faste varer fra husstanden.
 * Rene hjelpere uten DOM (kan testes i node): alder → aldersgruppe, personer → tellere, avstemming mot tellerne,
 * og regeltabellen for faste varer (merkevare/retning-v3/README.md, «Regel til Anders»).
 * Tellerne (voksen/barn/smabarn) lagres i husstanden (settings/household, som før); navn, alder og kjæledyr i settings/folk
 * (0.26.0, Sigurd 17.11; krever regelforslaget regler-0260.diff – ellers bare på telefonen). */
(function (global) {
  'use strict';
  var KINDS = ['voksen', 'barn', 'smabarn'];
  var MAX = 12;   // reglene: 0–12 per gruppe
  // alder → gruppe (samme grenser som tellerne): 13+ voksne og ungdom, 6–12 barn, 1–5 småbarn. Under 1 år telles ikke (Husstand: «Under 1 år telles ikke»).
  function kindOf(age, fallback) {
    if (age == null || age === '' || !isFinite(age)) return fallback || 'voksen';
    age = +age;
    if (age >= 13) return 'voksen';
    if (age >= 6) return 'barn';
    if (age >= 1) return 'smabarn';
    return 'baby';
  }
  function cleanAge(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!/^\d{1,3}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 0 && n <= 120 ? n : null;
  }
  function personKind(p) { return kindOf(p.age, p.kind); }
  function peopleOf(persons) {
    var o = { voksen: 0, barn: 0, smabarn: 0 };
    (persons || []).forEach(function (p) { var k = personKind(p); if (o[k] != null) o[k] = Math.min(MAX, o[k] + 1); });
    return o;
  }
  // Personradene følger tellerne (fra en annen telefon, Husstand-siden eller «Vis bare antall»): mangler det rader i en gruppe,
  // legges tomme rader til; er det for mange, fjernes rader uten navn først (bakfra), så de siste med navn.
  function reconcile(persons, people) {
    var out = (persons || []).map(function (p) { return { name: String(p.name || ''), age: cleanAge(p.age), kind: KINDS.indexOf(p.kind) >= 0 ? p.kind : 'voksen' }; });
    people = people || {};
    KINDS.forEach(function (k) {
      var want = Math.max(0, Math.min(MAX, people[k] | 0));
      var idx = []; out.forEach(function (p, i) { if (personKind(p) === k) idx.push(i); });
      var have = idx.length;
      while (have < want) { out.push({ name: '', age: null, kind: k }); have++; }
      if (have > want) {
        var drop = have - want, rm = {};
        for (var i = idx.length - 1; i >= 0 && drop; i--) if (!out[idx[i]].name.trim()) { rm[idx[i]] = 1; drop--; }
        for (var j = idx.length - 1; j >= 0 && drop; j--) if (!rm[idx[j]]) { rm[idx[j]] = 1; drop--; }
        out = out.filter(function (p, n) { return !rm[n]; });
      }
    });
    return out;
  }
  function samePeople(a, b) { a = a || {}; b = b || {}; return KINDS.every(function (k) { return (a[k] | 0) === (b[k] | 0); }); }

  /* ---- Faste varer fra husstanden ----
   * P = porsjonene husstanden regnes som (samme tall som «Regnes som N porsjoner»: alltid opp, minst 2).
   * hs = { people: {voksen, barn, smabarn}, persons: [{name, age, kind}] | null (bare antall), pets: [{type: hund|katt|annet}] }.
   * Én linje per vare (aldri to «Melk»), mengde etter husstanden. Rekkefølge som i skissen (faste-varer.png). */
  var KJ = 'Kjøl', FG = 'Frukt/grønt', TV = 'Tørrvare', HU = 'Hus';
  function fasteVarer(hs, P) {
    hs = hs || {};
    var people = hs.people || { voksen: 0, barn: 0, smabarn: 0 };
    var persons = Array.isArray(hs.persons) && hs.persons.length ? hs.persons : null;
    var pets = hs.pets || [];
    P = Math.max(2, Math.ceil(+P || 0));
    var voksen, skolebarn, smabarn, bleier;
    if (persons) {
      voksen = persons.some(function (p) { return p.age == null ? personKind(p) === 'voksen' : p.age >= 18; });
      // skolebarn 6–15 når alderen er kjent; barn uten alder (fra telleren «Barn 6–12») teller som skolebarn
      skolebarn = persons.some(function (p) { return p.age == null ? personKind(p) === 'barn' : p.age >= 6 && p.age <= 15; });
      smabarn = persons.some(function (p) { return p.age == null ? personKind(p) === 'smabarn' : p.age <= 5; });
      // bleier 1–3 år (og under 1); uten alder (småbarn 1–5) tas de med, så huset kan fjerne dem
      bleier = persons.some(function (p) { return p.age == null ? personKind(p) === 'smabarn' : p.age <= 3; });
    } else {
      voksen = (people.voksen | 0) > 0;
      skolebarn = (people.barn | 0) > 0;     // bare telleren «Barn 6–12» (13–15 ligger i «Voksne og ungdom»)
      smabarn = (people.smabarn | 0) > 0;
      bleier = smabarn;
    }
    var hund = pets.filter(function (d) { return d && d.type === 'hund'; }).length;
    var katt = pets.filter(function (d) { return d && d.type === 'katt'; }).length;
    var L = [];
    var add = function (name, qty, unit, aisle, why) { L.push({ key: name.toLowerCase(), name: name, qty: qty, unit: unit, aisle: aisle, why: why }); };
    add('Bananer', 2 * P, 'stk', FG, 'basis');
    add('Melk', Math.ceil(0.75 * P - 1e-9), 'l', KJ, 'basis');
    add('Smør', 1, 'pk', KJ, 'basis');
    add('Egg', Math.max(6, Math.ceil(3 * P / 6 - 1e-9) * 6), 'stk', KJ, 'basis');
    add('Gulost', 1, 'pk', KJ, 'basis');
    add('Brød', Math.max(1, Math.ceil(P / 2 - 1e-9)), 'stk', TV, 'basis');
    if (voksen) add('Kaffe', 1, 'pk', TV, 'voksen');
    if (skolebarn) { add('Leverpostei', 1, 'pk', KJ, 'skolebarn'); add('Brunost', 1, 'pk', KJ, 'skolebarn'); add('Matpakkepapir', 1, 'pk', HU, 'skolebarn'); }
    if (hund) add('Hundemat', hund, 'pk', TV, 'hund');
    if (katt) { add('Kattemat', katt, 'pk', TV, 'katt'); add('Kattesand', katt, 'pk', HU, 'katt'); }
    if (smabarn) add('Våtservietter', 1, 'pk', HU, 'smabarn');
    if (bleier) add('Bleier', 1, 'pk', HU, 'bleier');
    return L;
  }
  var api = { KINDS: KINDS, kindOf: kindOf, cleanAge: cleanAge, personKind: personKind, peopleOf: peopleOf, reconcile: reconcile, samePeople: samePeople, fasteVarer: fasteVarer };
  global.KnaggenHusstand = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
