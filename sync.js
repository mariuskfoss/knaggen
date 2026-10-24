/* Ukeshandel v0.2 (v0.9: invitasjonskoder) – synkronisering av husstandens data via Firebase (Firestore + anonym innlogging).
 * Firebase-SDK lastes først når den trengs (dynamisk import fra gstatic), så appen virker som før uten oppsett.
 */
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const EMULATOR_HOSTS = ['localhost', '127.0.0.1'];
const EMULATOR_CONFIG = { apiKey: 'demo-key', authDomain: 'demo-ukeshandel.firebaseapp.com', projectId: 'demo-ukeshandel', appId: 'demo-app' };

let ctx = null;        // { fs, au, db, auth, uid }
let initPromise = null;

function isEmulator() {
  return EMULATOR_HOSTS.indexOf(location.hostname) >= 0;
}
function prodConfig() {
  const c = window.UKESHANDEL_FIREBASE_CONFIG;
  if (!c || !c.apiKey || !c.projectId || /LIM_INN/.test(c.apiKey + c.projectId + (c.appId || ''))) return null;
  return c;
}
function mode() {
  if (isEmulator()) return 'emulator';
  return prodConfig() ? 'prod' : null;
}

// Tilfeldig kode, 24 tegn base62 ≈ 143 bit.
function randomCode(len = 24) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const out = [];
  while (out.length < len) {
    const buf = crypto.getRandomValues(new Uint8Array(len * 2));
    for (const b of buf) { if (b < 248 && out.length < len) out.push(abc[b % 62]); }
  }
  return out.join('');
}

// v0.4.6: SDK-oppsettet (app/auth/db) gjøres bare én gang. Feiler innloggingen (f.eks. frakoblet), kan man prøve igjen
// uten å kalle initializeFirestore på nytt (det ga «failed-precondition» ved nytt forsøk).
let base = null;
async function init() {
  if (ctx) return ctx;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const m = mode();
    if (!m) throw new Error('not-configured');
    if (!base) {
      const [appMod, au, fs] = await Promise.all([
        import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')
      ]);
      const app = appMod.initializeApp(m === 'emulator' ? EMULATOR_CONFIG : prodConfig(), 'ukeshandel');
      const auth = au.getAuth(app);
      let db;
      try {
        db = fs.initializeFirestore(app, {
          localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
          ignoreUndefinedProperties: true
        });
      } catch (e) {
        db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });
      }
      if (m === 'emulator') {
        au.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }
      base = { au, fs, db, auth };
    }
    const { au, fs, db, auth } = base;
    await auth.authStateReady();
    if (!auth.currentUser) await au.signInAnonymously(auth);
    ctx = { fs, au, db, auth, uid: auth.currentUser.uid };
    return ctx;
  })();
  try { return await initPromise; } catch (e) { initPromise = null; throw e; }
}

function withTimeout(p, ms, msg) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg || 'timeout')), ms))]);
}

const hh = (hid, ...rest) => [ctx.db, 'households', hid, ...rest];
// v0.10: den felles handlelista ligger under en fast «uke» (se app.js LIST_KEY)
const LIST_KEY = '0000-00-00';
const DELETING_MARK = 'v010:slettes';   // se app.js

function recipeDoc(r) {
  const o = {
    name: r.name, minutes: r.minutes == null ? null : r.minutes, note: r.note || '',
    // v0.4.3: basis (true/false) bare når ingrediensen er merket annerledes enn standardtabellen.
    ingredients: (r.ingredients || []).map(i => Object.assign({ name: i.name, qty: i.qty == null ? null : i.qty, unit: i.unit || '', aisle: i.aisle },
      typeof i.basis === 'boolean' ? { basis: i.basis } : {})),
    updated_at: Date.now()
  };
  // v0.8: valgfrie felt – bare når satt, så eldre regler/klienter ikke brytes unødig ved lesing
  if (r.origin) o.origin = String(r.origin).slice(0, 40);
  // v0.10: valgfri fremgangsmåte (liste med korte steg)
  if (Array.isArray(r.steps) && r.steps.length) o.steps = r.steps.slice(0, 12).map(x => String(x).slice(0, 300));
  if (r.servings != null && isFinite(r.servings)) o.servings = Number(r.servings);
  if (r.scale === false) o.scale = false;
  // v0.11: passiv tid (minutes = aktiv tid) og merke fra Matrett-byggeren – bare når satt
  if (typeof r.passiveMinutes === 'number' && r.passiveMinutes > 0 && ['ovn', 'koking', 'heving'].indexOf(r.passiveKind) >= 0) {
    o.passiveMinutes = Math.min(1440, Math.round(r.passiveMinutes)); o.passiveKind = r.passiveKind;
  }
  if (r.lib) o.lib = String(r.lib).slice(0, 100);
  if (r.variant) o.variant = String(r.variant).slice(0, 40);
  if (r.fromLib && r.fromLib.id) o.fromLib = { id: String(r.fromLib.id).slice(0, 100), variant: String(r.fromLib.variant || '').slice(0, 40) };
  // v0.12: lenke til kildeoppskriften (bare http/https) – bare når satt
  if (validSource(r.source)) o.source = r.source;
  return o;
}
function householdSettingsDoc(h) {
  return {
    people: h && h.people ? {
      voksen: h.people.voksen | 0, barn: h.people.barn | 0, smabarn: h.people.smabarn | 0
    } : null,
    scale: !!(h && h.scale),
    asked: !!(h && h.asked),
    updated_at: Date.now()
  };
}
function dayPeopleDoc(date, delta) {
  return {
    date,
    delta: {
      voksen: (delta && delta.voksen) | 0,
      barn: (delta && delta.barn) | 0,
      smabarn: (delta && delta.smabarn) | 0
    },
    updated_at: Date.now()
  };
}
function stapleDoc(s, order) {
  return { name: s.name, qty: s.qty == null ? null : s.qty, unit: s.unit || '', aisle: s.aisle, active: s.active !== false,
    order: s.order != null ? s.order : (order != null ? order : Date.now()) };
}
function validSource(u) { return typeof u === 'string' && u.length <= 2000 && /^https?:\/\/[^\s]+$/i.test(u); }
function oneoffDoc(o) {
  return o ? Object.assign({ id: o.id, name: o.name, ingredients: recipeDoc(o).ingredients }, validSource(o.source) ? { source: o.source } : {}) : null;
}
// v0.4.4: kort signatur for en dag slik den ligger i Firestore (samme som app.js bruker for det telefonen viser).
function daySig(d) {
  if (!d) return '';
  if (d.oneoff && d.oneoff.name) return 'o:' + (d.oneoff.id || d.oneoff.name);
  return d.recipe_id ? 'r:' + d.recipe_id : '';
}
// v0.16: «mark» ('handlet' | 'rester') skrives bare når den er satt, så dager uten merke har samme form som før.
function markOf(d) { return d && (d.mark === 'handlet' || d.mark === 'rester') ? d.mark : null; }
function withMark(body, mark) { if (mark === 'handlet' || mark === 'rester') body.mark = mark; return body; }
function dayBody(date, d) {
  const o = d && d.oneoff && d.oneoff.name ? d.oneoff : null;
  return withMark({ date, recipe_id: o ? null : ((d && d.recipe_id) || null),
    oneoff: o ? Object.assign({ id: o.id || null, name: o.name, ingredients: o.ingredients || [] }, validSource(o.source) ? { source: o.source } : {}) : null }, markOf(d));
}
function extraDoc(x) {
  return { week: x.week, name: x.name, qty: x.qty == null ? null : x.qty, unit: x.unit || '', aisle: x.aisle, created: x.created || Date.now() };
}

// Oppretter husstand + hemmelighet + eget medlemskap i én batch, og flytter lokale data inn (idempotent).
async function createHousehold(local, existing) {
  const c = await init();
  const { fs } = c;
  const hid = existing ? existing.hid : randomCode();
  const secret = existing ? existing.secret : randomCode();
  if (!existing || !existing.core_done) {
    const b = fs.writeBatch(c.db);
    b.set(fs.doc(...hh(hid)), { created_by: c.uid, created_at: fs.serverTimestamp(), schema: 2, app_version: '0.2.0' });
    b.set(fs.doc(...hh(hid, 'private', 'join')), { secret });
    b.set(fs.doc(...hh(hid, 'members', c.uid)), { secret, joined_at: fs.serverTimestamp() });
    if (local.onCore) local.onCore({ hid, secret });
    await withTimeout(b.commit(), 20000, 'no-server');
  }
  if (local.onCoreDone) local.onCoreDone({ hid, secret });
  // Data i biter (maks 500 skriv per batch)
  const writes = [];
  (local.recipes || []).forEach(r => writes.push(['set', hh(hid, 'recipes', r.id), recipeDoc(r)]));
  (local.staples || []).forEach((s, i) => writes.push(['set', hh(hid, 'staples', s.id), stapleDoc(s, i + 1)]));
  const dates = {};
  Object.keys(local.week_plan || {}).forEach(d => { if (local.week_plan[d]) dates[d] = true; });
  Object.keys(local.oneoffs || {}).forEach(d => { dates[d] = true; });
  Object.keys(dates).forEach(d => {
    if (!/^\d{4}-\d\d-\d\d$/.test(d)) return;
    const o = (local.oneoffs || {})[d];
    writes.push(['set', hh(hid, 'days', d), withMark({ date: d, recipe_id: o ? null : (local.week_plan[d] || null), oneoff: oneoffDoc(o) }, (local.marks || {})[d])]);
  });
  const weeks = {};
  Object.keys(local.checks || {}).forEach(w => { weeks[w] = weeks[w] || {}; weeks[w].checked = local.checks[w]; });
  Object.keys(local.list_adjust || {}).forEach(w => { weeks[w] = weeks[w] || {}; weeks[w].adjust = local.list_adjust[w]; });
  Object.keys(weeks).forEach(w => {
    if (!/^\d{4}-\d\d-\d\d$/.test(w)) return;
    writes.push(['set', hh(hid, 'lists', w), { week: w, checked: weeks[w].checked || {}, adjust: weeks[w].adjust || {} }]);
  });
  (local.list_extras || []).forEach(x => writes.push(['set', hh(hid, 'extras', x.id), extraDoc(x)]));
  if (local.household_size && local.household_size.asked)
    writes.push(['set', hh(hid, 'settings', 'household'), householdSettingsDoc(local.household_size)]);
    // v0.11: tidsgrensen for hverdagsmiddag (bare når den er satt; 0.10 leser den ikke)
    if (local.weekday_limit) writes.push(['set', hh(hid, 'settings', 'hverdag'), { limit: local.weekday_limit, updated_at: Date.now() }]);
  Object.keys(local.day_people || {}).forEach(d => {
    const delta = local.day_people[d];
    if (delta && (delta.voksen || delta.barn || delta.smabarn))
      writes.push(['set', hh(hid, 'daypeople', d), dayPeopleDoc(d, delta)]);
  });
  for (let i = 0; i < writes.length; i += 400) {
    const b = fs.writeBatch(c.db);
    writes.slice(i, i + 400).forEach(w => b.set(fs.doc(...w[1]), w[2]));
    await withTimeout(b.commit(), 30000, 'no-server');
  }
  return { hid, secret };
}

// v0.10: fortsatt medlem ifølge serveren? (false også når husstanden er slettet og lesingen nektes)
async function stillMember(hid) {
  const c = await init();
  try {
    const s = await withTimeout(c.fs.getDocFromServer(c.fs.doc(...hh(hid, 'members', c.uid))), 10000, 'no-server');
    return s.exists();
  } catch (e) {
    if (e && e.code === 'permission-denied') return false;
    return null;
  }
}
async function isMember(hid) {
  const c = await init();
  try {
    const s = await c.fs.getDoc(c.fs.doc(...hh(hid, 'members', c.uid)));
    return s.exists();
  } catch (e) {
    if (e && e.code === 'unavailable') return null; // frakoblet: ukjent
    throw e;
  }
}

async function joinHousehold(hid, secret) {
  const c = await init();
  const m = await isMember(hid);
  if (m) return true;
  await withTimeout(c.fs.setDoc(c.fs.doc(...hh(hid, 'members', c.uid)), { secret, joined_at: c.fs.serverTimestamp() }), 20000, 'no-server');
  return true;
}

// Sanntid: lytter på husstandens samlinger. handlers.<navn>(docs, meta), handlers.status({pending, fromCache}), handlers.error(e)
function subscribe(hid, oldest, handlers) {
  const { fs, db } = ctx;
  const metas = {};
  const unsubs = [];
  let expected = 0;
  function status() {
    const vals = Object.values(metas);
    handlers.status && handlers.status({
      pending: vals.some(m => m.hasPendingWrites),
      // v0.10: «fra serveren» først når alle samlingene har svart (engangsflyttingen av lista venter på det)
      fromCache: vals.length < expected || vals.some(m => m.fromCache)
    });
  }
  function listen(name, q, quiet) {
    let first = true;
    if (!quiet) expected++;
    unsubs.push(fs.onSnapshot(q, { includeMetadataChanges: true }, snap => {
      if (!quiet) metas[name] = snap.metadata;
      const changed = first || snap.docChanges().length > 0;
      first = false;
      if (changed && handlers[name]) handlers[name](snap.docs.map(d => Object.assign({ id: d.id }, d.data())), snap.metadata);
      if (!quiet) status();
    }, err => {
      // v0.9: members/invite er tillegg – feil der (f.eks. eldre regler) skal ikke påvirke resten
      if (quiet) { if (handlers[name]) handlers[name](null, null, err); return; }
      handlers.error && handlers.error(err, name);
    }));
  }
  listen('recipes', fs.collection(...hh(hid, 'recipes')));
  listen('staples', fs.collection(...hh(hid, 'staples')));
  listen('days', fs.query(fs.collection(...hh(hid, 'days')), fs.where('date', '>=', oldest)));
  listen('lists', fs.query(fs.collection(...hh(hid, 'lists')), fs.where('week', '>=', oldest)));
  listen('extras', fs.query(fs.collection(...hh(hid, 'extras')), fs.where('week', '>=', oldest)));
  // v0.10: den felles lista (eget dokument og egne varer med week = 0000-00-00)
  listen('slists', fs.query(fs.collection(...hh(hid, 'lists')), fs.where('week', '==', LIST_KEY)));
  listen('sextras', fs.query(fs.collection(...hh(hid, 'extras')), fs.where('week', '==', LIST_KEY)));
  listen('settings', fs.collection(...hh(hid, 'settings')));
  listen('daypeople', fs.query(fs.collection(...hh(hid, 'daypeople')), fs.where('date', '>=', oldest)));
  // v0.9: antall tilkoblinger («2 koblet til») og aktiv invitasjonskode (uten secret)
  listen('members', fs.collection(...hh(hid, 'members')), true);
  listen('invite', fs.collection(...hh(hid, 'invite')), true);
  // v0.17: enhetslista (tillegg – med eldre regler gir den bare en feil som ignoreres)
  listen('devices', fs.collection(...hh(hid, 'devices')), true);
  return () => unsubs.forEach(u => u());
}

// Skriving. Returnerer promise som løses når serveren har bekreftet (kan ta tid frakoblet – ikke vent på den i UI).
const W = {
  setRecipe: (hid, r) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'recipes', r.id)), recipeDoc(r)),
  deleteRecipe: (hid, id) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'recipes', id))),
  setDays: (hid, entries) => {
    const b = ctx.fs.writeBatch(ctx.db);
    entries.forEach(e => b.set(ctx.fs.doc(...hh(hid, 'days', e.date)), withMark({ date: e.date, recipe_id: e.oneoff ? null : (e.recipe_id || null), oneoff: oneoffDoc(e.oneoff) }, e.mark)));
    return b.commit();
  },
  // v0.4.4: bytt to kvelder atomisk. a/b = { date, sig } der sig er det telefonen så ('r:<id>' / 'o:<id>' / '').
  // Transaksjonen leser begge dagene på serveren og bytter bare hvis de fortsatt er som telefonen så; ellers kastes
  // en feil med code 'swap-conflict' (ingenting skrives). Innholdet som flyttes er serverens, så en engangsmiddag som
  // nettopp ble redigert på en annen telefon følger med uendret. Krever nett (se app.js for frakoblet).
  swapDays: async (hid, a, b) => {
    const { fs, db } = ctx;
    const ra = fs.doc(...hh(hid, 'days', a.date)), rb = fs.doc(...hh(hid, 'days', b.date));
    return fs.runTransaction(db, async tx => {
      const [sa, sb] = [await tx.get(ra), await tx.get(rb)];
      const da = sa.exists() ? sa.data() : null, dbb = sb.exists() ? sb.data() : null;
      if (daySig(da) !== a.sig || daySig(dbb) !== b.sig) {
        const e = new Error('swap-conflict'); e.code = 'swap-conflict'; throw e;
      }
      tx.set(ra, dayBody(a.date, dbb));
      tx.set(rb, dayBody(b.date, da));
      return true;
    });
  },
  // v0.10: i den felles lista slettes feltene for en vare som ikke lenger er krysset av (lista vokser ikke over tid)
  setChecks: (hid, week, map) => {
    const m = {};
    Object.keys(map).forEach(k => { m[k] = week === LIST_KEY && map[k] === false ? ctx.fs.deleteField() : map[k]; });
    return ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'lists', week)), { week, checked: m }, { merge: true });
  },
  incAdjust: (hid, week, key, change) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'lists', week)), { week, adjust: { [key]: ctx.fs.increment(change) } }, { merge: true }),
  // v0.4.3: basisvalg per uke som felt i adjust-kartet («basis:<vare>» = 1 lagt til / -1 ikke nå), feltvis flettet.
  setAdjust: (hid, week, map) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'lists', week)), { week, adjust: map }, { merge: true }),
  clearAdjust: (hid, week, key) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'lists', week)), { week, adjust: { [key]: ctx.fs.deleteField() } }, { merge: true }),
  addExtra: (hid, x) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'extras', x.id)), extraDoc(x)),
  deleteExtras: (hid, ids) => {
    const b = ctx.fs.writeBatch(ctx.db);
    ids.forEach(id => b.delete(ctx.fs.doc(...hh(hid, 'extras', id))));
    return b.commit();
  },
  setStaple: (hid, s) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'staples', s.id)), stapleDoc(s)),
  updateStaple: (hid, id, fields) => ctx.fs.updateDoc(ctx.fs.doc(...hh(hid, 'staples', id)), fields),
  deleteStaple: (hid, id) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'staples', id))),
  // v0.11: «Middag i hverdagen» (null = Ingen grense)
  setWeekdayLimit: (hid, limit) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'hverdag')), { limit: limit || null, updated_at: Date.now() }),
  setHouseholdSettings: (hid, h) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'household')), householdSettingsDoc(h)),
  setDayPeople: (hid, date, delta) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'daypeople', date)), dayPeopleDoc(date, delta)),
  deleteDayPeople: (hid, date) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'daypeople', date))),
  // v0.17: husstandens navn, egen enhet, andres navn/type/tilhører og felles kjøkkenoppsett
  setProfile: (hid, name) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'profil')), { name, updated_at: Date.now() }),
  createDevice: (hid, d) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'devices', ctx.uid)), d),
  updateDevice: (hid, uid, fields) => ctx.fs.updateDoc(ctx.fs.doc(...hh(hid, 'devices', uid)), fields),
  setKitchenShared: (hid, k) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'kjokken')), { stops: k.stops || [], lat: k.lat == null ? null : k.lat, lon: k.lon == null ? null : k.lon, updated_at: Date.now() }),
  // v0.17: fjern en annen enhet – medlemskapet og enhetsdokumentet i samme batch
  removeDevice: (hid, uid) => {
    const b = ctx.fs.writeBatch(ctx.db);
    b.delete(ctx.fs.doc(...hh(hid, 'members', uid)));
    b.delete(ctx.fs.doc(...hh(hid, 'devices', uid)));
    return b.commit();
  },
  // v0.4.4: venter til telefonens egne ventende skrivinger er bekreftet (før en bytte-transaksjon).
  settled: () => ctx.fs.waitForPendingWrites(ctx.db)
};

/* ---------- v0.10: Forlat og Slett husstanden ---------- */
// Forlat: sletter bare eget medlemskap (tillatt også med v0.9-reglene). Køes frakoblet.
function leaveHousehold(hid) {
  // v0.17: eget enhetsdokument først (egen uid er alltid lov); feiler det (eldre regler), går Forlat videre
  ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'devices', ctx.uid))).catch(() => {});
  return ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'members', ctx.uid)));
}
// Slett: alt innhold i biter, så til slutt kjernen i én batch: invitasjonskodene, invite/current, de andre medlemmene,
// private/join, husstandsdokumentet og eget medlemskap (reglene krever at husstanden forsvinner i samme batch).
// Krever nett (leser fra serveren). Lytterne må være stoppet først.
async function deleteHousehold(hid) {
  const c = await init();
  const { fs, db } = c;
  const fromServer = q => withTimeout(fs.getDocsFromServer(q), 20000, 'no-server');
  // v0.14: de delte listene slettes av funksjonen (krever medlemskap, så før kjernen slettes). Feiler det, går slettingen
  // videre: lenkene utløper uansett etter 7 døgn og ryddes av TTL.
  try { await deleteShareLists(hid); } catch (e) { /* ignorer */ }
  // v0.16: kjøkkenskjermens kalenderadresser slettes også (krever medlemskap)
  try { await calendar(hid, 'slettAlle'); } catch (e) { /* ignorer */ }
  // Varsel til de andre 0.10-telefonene (de lytter på den felles lista); dokumentet slettes selv sammen med resten.
  await withTimeout(fs.setDoc(fs.doc(...hh(hid, 'lists', LIST_KEY)), { week: LIST_KEY, adjust: { [DELETING_MARK]: Date.now() } }, { merge: true }), 20000, 'no-server');
  const refs = [];
  for (const col of ['recipes', 'staples', 'days', 'lists', 'extras', 'settings', 'daypeople']) {
    (await fromServer(fs.collection(...hh(hid, col)))).forEach(d => refs.push(d.ref));
  }
  // v0.17: enhetslista (eldre regler nekter lesing – da finnes den heller ikke)
  try { (await fromServer(fs.collection(...hh(hid, 'devices')))).forEach(d => refs.push(d.ref)); } catch (e) { if (!(e && e.code === 'permission-denied')) throw e; }
  const inv = await fromServer(fs.collection(...hh(hid, 'invite')));
  const codes = new Set();
  let listed = false;
  try {
    (await fromServer(fs.query(fs.collection(db, 'invites'), fs.where('hid', '==', hid)))).forEach(d => codes.add(d.id));
    listed = true;
  } catch (e) {
    if (!(e && e.code === 'permission-denied')) throw e;
  }
  if (!listed) inv.forEach(d => { const k = d.data().code; if (k) codes.add(k); });   // eldre regler: bare den aktive koden
  const mem = await fromServer(fs.collection(...hh(hid, 'members')));
  for (let i = 0; i < refs.length; i += 450) {
    const b = fs.writeBatch(db);
    refs.slice(i, i + 450).forEach(r => b.delete(r));
    await withTimeout(b.commit(), 30000, 'no-server');
  }
  const b = fs.writeBatch(db);
  codes.forEach(k => b.delete(fs.doc(db, 'invites', k)));
  inv.forEach(d => b.delete(d.ref));
  mem.forEach(d => { if (d.id !== c.uid) b.delete(d.ref); });
  b.delete(fs.doc(...hh(hid, 'private', 'join')));
  b.delete(fs.doc(...hh(hid)));
  b.delete(fs.doc(...hh(hid, 'members', c.uid)));
  await withTimeout(b.commit(), 30000, 'no-server');
  return true;
}

/* ---------- v0.9: invitasjonskoder (invites/{kode}) ---------- */
// 8 tegn uten 0/O/1/I/L (31 tegn). 248 = 31 · 8, så forkastingen gir jevn fordeling.
const INVITE_ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function inviteCode() {
  const out = [];
  while (out.length < 8) {
    const buf = crypto.getRandomValues(new Uint8Array(16));
    for (const b of buf) { if (b < 248 && out.length < 8) out.push(INVITE_ABC[b % 31]); }
  }
  return out.join('');
}
const DAY_MS = 864e5;
// Lager ny kode for husstanden i én batch: sletter den gamle (hvis kjent), lager invites/{ny} og peker invite/current dit.
// Reglene sjekker at secret er husstandens. Kollisjon (koden finnes) eller klokke for langt fram gir permission-denied:
// da prøves en ny kode, og til slutt med 6 dagers utløp (tåler at telefonens klokke går opptil et døgn for fort).
async function createInvite(hid, secret, oldCode) {
  const c = await init();
  const { fs } = c;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = inviteCode();
    const exp = Date.now() + (attempt < 2 ? 7 : 6) * DAY_MS - 60000;
    const b = fs.writeBatch(c.db);
    if (oldCode && /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(oldCode) && oldCode !== code) b.delete(fs.doc(c.db, 'invites', oldCode));
    b.set(fs.doc(c.db, 'invites', code), { hid, secret, created_by: c.uid, created_at: fs.serverTimestamp(), expires_at: fs.Timestamp.fromMillis(exp) });
    b.set(fs.doc(...hh(hid, 'invite', 'current')), { code, expires_at: fs.Timestamp.fromMillis(exp), created_by: c.uid, updated_at: fs.serverTimestamp() });
    try {
      await withTimeout(b.commit(), 20000, 'no-server');
      return { code, expires_at: exp };
    } catch (e) {
      lastErr = e;
      if (!(e && e.code === 'permission-denied')) throw e;
      // Den gamle koden kan allerede være slettet (av en annen telefon): prøv uten å slette den.
      oldCode = null;
    }
  }
  throw lastErr;
}
// Leser en kode. Utløpt eller ukjent kode → { code: 'invite-gone' } (reglene skiller ikke på de to).
async function getInvite(code) {
  const c = await init();
  try {
    const s = await withTimeout(c.fs.getDocFromServer(c.fs.doc(c.db, 'invites', code)), 15000, 'no-server');
    if (!s.exists()) { const e = new Error('invite-gone'); e.code = 'invite-gone'; throw e; }
    const d = s.data();
    return { hid: d.hid, secret: d.secret, expires_at: d.expires_at && d.expires_at.toMillis ? d.expires_at.toMillis() : null,
      created_at: d.created_at && d.created_at.toMillis ? d.created_at.toMillis() : null };   // v0.10: laget før telefonen forlot?
  } catch (e) {
    if (e && e.code === 'permission-denied') { const g = new Error('invite-gone'); g.code = 'invite-gone'; throw g; }
    throw e;
  }
}

// v0.12: «Hent oppskrift» – kaller Firebase-funksjonen hentOppskrift (europe-west1) med innloggingstokenet.
// Samme protokoll som httpsCallable (POST {data}), uten å laste functions-SDK-en. Emulator: port 5181.
const FN_REGION = 'europe-west1';
const FN_EMULATOR_PORT = 5181;
async function callFn(name, data, ms) {
  const c = await init();
  const pid = mode() === 'emulator' ? EMULATOR_CONFIG.projectId : prodConfig().projectId;
  const endpoint = fnBase(pid) + '/' + name;
  const token = await c.auth.currentUser.getIdToken();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 25000);
  let res, body;
  try {
    res = await fetch(endpoint, { method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ data }) });
    body = await res.json().catch(() => null);
  } catch (e) { const er = new Error('no-server'); er.code = 'no-server'; throw er; } finally { clearTimeout(t); }
  if (!body || body.error || !res.ok) {
    const er = new Error((body && body.error && body.error.message) || 'fn-failed');
    er.code = String((body && body.error && body.error.status) || 'fn-failed').toLowerCase().replace(/_/g, '-');   // INVALID_ARGUMENT → invalid-argument
    if (body && body.error && body.error.details) er.details = body.error.details;
    throw er;
  }
  return body.result;
}
function fnBase(pid) {
  return mode() === 'emulator' ? 'http://127.0.0.1:' + FN_EMULATOR_PORT + '/' + pid + '/' + FN_REGION : 'https://' + FN_REGION + '-' + pid + '.cloudfunctions.net';
}
function fetchRecipe(hid, url) { return callFn('hentOppskrift', { hid, url }); }
// v0.14 «Del lista til Oda»: funksjonen lager øyeblikksbildet (delelister/{id}); appen har ingen tilgang til samlingen.
// Lenken er funksjonens egen adresse (app.knaggen.no ligger på GitHub Pages, så det finnes ingen Hosting-omskriving).
async function makeShareList(hid, lines, title, people) {
  const r = await callFn('lagDeleliste', { hid, lines, title, people });
  const pid = mode() === 'emulator' ? EMULATOR_CONFIG.projectId : prodConfig().projectId;
  return { url: fnBase(pid) + '/visDeleliste/' + r.id, expiresAt: r.expiresAt };
}
function deleteShareLists(hid) { return callFn('slettDelelister', { hid }); }
// v0.15: vær til kjøkkenskjermen via hentVaer (MET-proxy; nettleseren kan ikke sette User-Agent).
function fetchWeather(hid, lat, lon) { return callFn('hentVaer', { hid, lat, lon }, 15000); }
// v0.16: kjøkkenskjermens kalendere (liste | legg | fjern | hendelser | slettAlle) – adressene ligger kryptert på serveren
function calendar(hid, op, data) { return callFn('kalender', Object.assign({}, data || {}, { op, hid }), op === 'legg' || op === 'hendelser' ? 40000 : 15000); }

window.UkeshandelSync = { fetchRecipe, makeShareList, deleteShareLists, fetchWeather, calendar, mode, init, randomCode, createHousehold, joinHousehold, isMember, subscribe, write: W, uid: () => ctx && ctx.uid,
  inviteCode, createInvite, getInvite, leaveHousehold, deleteHousehold, stillMember };
window.dispatchEvent(new Event('ukeshandel-sync-ready'));
