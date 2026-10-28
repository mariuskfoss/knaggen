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
      // v0.20: innloggingen ligger varig på enheten (IndexedDB, reserve localStorage): man logger inn ÉN gang per ny enhet
      // og blir stående innlogget – aldri innlogging ved hver åpning. Anonym innlogging (uten spørsmål) som før.
      let auth;
      try {
        auth = au.initializeAuth(app, { persistence: [au.indexedDBLocalPersistence, au.browserLocalPersistence], popupRedirectResolver: au.browserPopupRedirectResolver });
      } catch (e) { auth = au.getAuth(app); }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* ignorer */ }
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
// v0.18.4: finnes egen enhet på serveren? true/false, null = vet ikke (frakoblet)
async function myDeviceExists(hid) {
  const c = await init();
  try {
    const s = await withTimeout(c.fs.getDocFromServer(c.fs.doc(...hh(hid, 'devices', c.uid))), 10000, 'no-server');
    return s.exists();
  } catch (e) { return null; }
}
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

let closing = false;   // 0.20: under kontosletting skal ingenting melde enheten inn i husstanden igjen
async function joinHousehold(hid, secret) {
  if (closing) { const e = new Error('closing'); e.code = 'konto/sletter'; throw e; }
  const c = await init();
  const m = await isMember(hid);
  if (m) return true;
  try { await withTimeout(c.fs.setDoc(c.fs.doc(...hh(hid, 'members', c.uid)), { secret, joined_at: c.fs.serverTimestamp() }), 20000, 'no-server'); }
  catch (e) {
    // to faner kan melde inn samme uid samtidig (andre gang er et «update», som reglene nekter): da er jeg allerede medlem
    if (e && e.code === 'permission-denied' && await isMember(hid)) return true;
    throw e;
  }
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
    let first = true, wasCache = true;
    if (!quiet) expected++;
    unsubs.push(fs.onSnapshot(q, { includeMetadataChanges: true }, snap => {
      if (!quiet) metas[name] = snap.metadata;
      // 0.18.13: «serveren har svart» (cache → server uten endringer) gir også beskjed for settings: appen må vite at hjemmeadressen sikkert mangler
      const changed = first || snap.docChanges().length > 0 || (name === 'settings' && wasCache && !snap.metadata.fromCache);
      first = false; if (!snap.metadata.fromCache) wasCache = false;
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
  // v0.18.1: hjemmeadresse (felles i husstanden), lat/lon avrundet til 4 desimaler
  setHome: (hid, h) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'hjem')), { adresse: String(h.adresse).slice(0, 200), lat: Math.round(h.lat * 1e4) / 1e4, lon: Math.round(h.lon * 1e4) / 1e4, updated_at: Date.now() }),
  // 0.18.12: personfarger (ett felt, { kalender-id: aksent }); tom map = alle automatisk
  setPersonColors: (hid, m) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'settings', 'personer')), { farger: m || {} }),
  removeHome: (hid) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'settings', 'hjem'))),
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
  // v0.20: kontoens peker slettes bare hvis den peker på husstanden man forlater (aldri ved bytte til kontoens husstand)
  const uref = ctx.fs.doc(ctx.db, 'users', ctx.uid);
  ctx.fs.getDoc(uref).then(s => { if (s.exists() && s.data().hid === hid) return ctx.fs.deleteDoc(uref); }).catch(() => {});
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
  // v0.20: gjøremål og egne lister med varer ryddes bort (andres private lister kan ikke leses og blir uleselige rester)
  try { await gjDeleteAll(hid); } catch (e) { /* ignorer */ }
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
  b.delete(fs.doc(db, 'users', c.uid));   // v0.20: kontoens peker til husstanden (finnes ikke for anonyme – sletting av ikke-eksisterende er greit)
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

/* ---------- v0.20: personlig innlogging (oppgradering av den anonyme innloggingen) ----------
 * Appen logger fortsatt inn anonymt i bakgrunnen. Oppgradering = linkWithCredential på SAMME uid (Google, Apple, e-postlenke), så
 * medlemskap og alt som er lagret under uid-en består. Sesjonen er varig (IndexedDB, se init). På en ny enhet logger man inn én gang
 * med samme konto: da får enheten den kjente uid-en, og users/{uid} sier hvilken husstand den hører til.
 */
const EMAIL_KEY = 'knaggen:epost-for-lenke';
function isPersonalUser(u) { return !!u && (!u.isAnonymous || (u.providerData || []).length > 0); }
function accountInfo() {
  const u = ctx && ctx.auth && ctx.auth.currentUser;
  if (!u) return null;
  const pd = (u.providerData || []);
  const kinds = pd.map(p => p.providerId === 'google.com' ? 'google' : p.providerId === 'apple.com' ? 'apple' : p.providerId === 'password' || p.providerId === 'emailLink' ? 'epost' : p.providerId);
  const email = u.email || (pd.find(p => p.email) || {}).email || null;
  return { uid: u.uid, personal: isPersonalUser(u), kinds, email, name: u.displayName || (pd.find(p => p.displayName) || {}).displayName || null };
}
// Nytt tokenet så reglene ser personlig innlogging (sign_in_provider/identities) – før noe skrives som krever det.
async function refreshToken() {
  const u = ctx.auth.currentUser;
  if (u) {
    try {
      await withTimeout(u.getIdToken(true), 15000, 'no-server');
      // Åpne Firestore-strømmene på nytt: en strøm som allerede er åpen har det gamle (anonyme) tokenet, og reglene ville avvist
      // skriving som krever personlig innlogging helt til strømmen lukkes av seg selv.
      await ctx.fs.disableNetwork(ctx.db); await ctx.fs.enableNetwork(ctx.db);
    } catch (e) { /* frakoblet: reglene ser det neste gang */ }
  }
}
function authErr(e) {
  const code = (e && e.code) || '';
  const m = /popup-closed|cancelled-popup|user-cancelled|popup-blocked|operation-not-supported|network|unauthorized|invalid-action-code|expired-action-code|invalid-email|too-many|account-exists|provider-already-linked|operation-not-allowed|requires-recent-login/.exec(code);
  const er = new Error(code || (e && e.message) || 'auth-failed');
  er.code = m ? 'auth/' + m[0] : (code || 'auth-failed');
  er.original = e;
  return er;
}
// Etter linkWithPopup/linkWithCredential: samme uid (switched:false), eller – hvis kontoen allerede finnes (ny enhet / ny telefon) –
// innlogging som den kjente uid-en (switched:true). Da må appen laste på nytt (uid-en byttet).
async function linkOrSwitch(doLink, credFromError, cred, direct) {
  const c = await init();
  const { au, auth } = c;
  const before = auth.currentUser && auth.currentUser.uid;
  try {
    await doLink();   // direct: e-postlenke = innlogging (engangslenke), aldri linkWithCredential
  } catch (e) {
    const code = e && e.code;
    if (!direct && (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use')) {
      const k = cred || (credFromError ? credFromError(e) : null);
      if (!k) throw authErr(e);
      try { await au.signInWithCredential(auth, k); } catch (e2) { throw authErr(e2); }
    } else throw authErr(e);
  }
  const u = auth.currentUser;
  const switched = !!u && u.uid !== before;
  if (switched) { ctx = null; initPromise = null; }   // uid-en byttet: ny init leser den nye (appen laster på nytt)
  else await refreshToken();
  return { switched, uid: u && u.uid };
}
// kind: 'google' | 'apple'. Popup via Firebase (authDomain handleliste-8f568.firebaseapp.com).
async function linkProvider(kind) {
  const c = await init();
  const { au, auth } = c;
  // Bare emulator og tester: falske token (emulatoren godtar usignerte JSON-token) i stedet for popup. Aldri i produksjon.
  if (mode() === 'emulator' && window.KNAGGEN_TEST_LOGIN) {
    const t = JSON.stringify(Object.assign({ email_verified: true }, window.KNAGGEN_TEST_LOGIN));
    const cred = kind === 'apple' ? new au.OAuthProvider('apple.com').credential({ idToken: t, rawNonce: 'test' }) : au.GoogleAuthProvider.credential(t);
    return linkCredential(cred);
  }
  let prov, fromErr;
  if (kind === 'apple') { prov = new au.OAuthProvider('apple.com'); prov.addScope('email'); prov.addScope('name'); fromErr = e => au.OAuthProvider.credentialFromError(e); }
  else { prov = new au.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' }); fromErr = e => au.GoogleAuthProvider.credentialFromError(e); }
  return linkOrSwitch(() => au.linkWithPopup(auth.currentUser, prov), fromErr, null);
}
// Samme, men med ferdig legitimasjon (e-postlenke; i emulatoren også falske Google-/Apple-token i testene).
async function linkCredential(cred) {
  const c = await init();
  return linkOrSwitch(() => c.au.linkWithCredential(c.auth.currentUser, cred), null, cred);
}
// E-postlenke (reserve): lenka åpnes i nettleseren som ba om den. continueUrl må være et godkjent domene i Firebase.
async function sendEmailLink(email) {
  const c = await init();
  try {
    await c.au.sendSignInLinkToEmail(c.auth, email, { url: location.origin + location.pathname + '?konto=epost', handleCodeInApp: true });
  } catch (e) { throw authErr(e); }
  try { localStorage.setItem(EMAIL_KEY, email); } catch (e) { /* ignorer */ }
}
async function isEmailLink(href) { const c = await init(); return c.au.isSignInWithEmailLink(c.auth, href); }
function savedEmail() { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch (e) { return ''; } }
async function completeEmailLink(href, email) {
  const c = await init();
  const cred = c.au.EmailAuthProvider.credentialWithLink(email, href);
  // Alltid innlogging med lenka (den kan bare brukes én gang, og med e-post-enumereringsvern kan vi ikke vite om kontoen finnes).
  // Ny konto → ny uid, og kjent konto → kontoens uid: appen tar med seg husstand, enhet og gjøremål (adoptHousehold).
  const r = await linkOrSwitch(() => c.au.signInWithCredential(c.auth, cred), null, null, true);
  try { localStorage.removeItem(EMAIL_KEY); } catch (e) { /* ignorer */ }
  return r;
}
// Etter et uid-bytte (ny uid = kontoen): meld den nye uid-en inn i enhetens husstand med den lokale hemmeligheten, ta over enheten
// (navn/eier) og gjøremål tildelt den gamle uid-en, og fjern den gamle anonyme uid-ens medlemskap og enhet.
// opts.pointer: skriv users/{uid}-pekeren (kontoen hadde ingen). Alt unntatt innmeldingen er «best effort».
async function adoptHousehold(hid, secret, oldUid, opts) {
  const c = await init(); const { fs, db } = c;
  // rett etter innlogging kan Firestore et øyeblikk fortsatt bruke den gamle brukerens token (permission-denied): hent ferskt token og prøv igjen
  try { await c.auth.currentUser.getIdToken(true); } catch (e) { /* ignorer */ }
  for (let i = 0; ; i++) {
    try { await joinHousehold(hid, secret); break; }
    catch (e) { if (i >= 3 || !e || e.code !== 'permission-denied') throw e; await new Promise(r => setTimeout(r, 500)); }
  }
  const old = oldUid;
  if (old && old !== c.uid) {
    try {
      const od = await withTimeout(fs.getDocFromServer(fs.doc(...hh(hid, 'devices', old))), 15000, 'no-server');
      const nd = await withTimeout(fs.getDocFromServer(fs.doc(...hh(hid, 'devices', c.uid))), 15000, 'no-server');
      if (od.exists() && !nd.exists()) await fs.setDoc(fs.doc(...hh(hid, 'devices', c.uid)), od.data());
    } catch (e) { /* ignorer */ }
    try {
      const t = await withTimeout(fs.getDocsFromServer(fs.query(fs.collection(...hh(hid, 'tasks')), fs.where('tildelt', '==', old))), 15000, 'no-server');
      for (let i = 0; i < t.docs.length; i += 400) { const b = fs.writeBatch(db); t.docs.slice(i, i + 400).forEach(d => b.update(d.ref, { tildelt: c.uid })); await b.commit(); }
    } catch (e) { /* ignorer */ }
  }
  if (opts && opts.pointer) { try { await saveAccountHousehold(hid); } catch (e) { /* ignorer */ } }
  if (old && old !== c.uid) { try { await W.removeDevice(hid, old); } catch (e) { /* ignorer */ } }
}
// users/{uid}: hvilken husstand kontoen hører til (skrives når kontoen er personlig og telefonen er med i husstanden)
async function saveAccountHousehold(hid) {
  const c = await init();
  if (!isPersonalUser(c.auth.currentUser)) return false;
  await c.fs.setDoc(c.fs.doc(c.db, 'users', c.uid), { hid, updated_at: c.fs.serverTimestamp() });
  return true;
}
// Ny enhet etter innlogging: { hid, secret } hvis kontoen er medlem av en husstand, ellers null. Leser bare egne dokumenter.
async function accountHousehold() {
  const c = await init();
  try {
    const u = await withTimeout(c.fs.getDocFromServer(c.fs.doc(c.db, 'users', c.uid)), 15000, 'no-server');
    if (!u.exists() || !u.data().hid) return null;
    const hid = u.data().hid;
    const m = await withTimeout(c.fs.getDocFromServer(c.fs.doc(...hh(hid, 'members', c.uid))), 15000, 'no-server');
    if (!m.exists() || !m.data().secret) return null;
    return { hid, secret: m.data().secret };
  } catch (e) {
    if (e && e.code === 'permission-denied') return null;
    throw e;
  }
}
async function forgetAccountHousehold() {
  const c = await init();
  try { await c.fs.deleteDoc(c.fs.doc(c.db, 'users', c.uid)); } catch (e) { /* ignorer */ }
}
// Logg ut av denne enheten (kontoen og husstanden berøres ikke). Etterpå lager neste oppstart en ny anonym bruker.
async function signOutAccount() {
  const c = await init();
  await c.au.signOut(c.auth);
  ctx = null; initPromise = null;
}
// 0.20.0: «Slett kontoen min». Egne private lister (+ varer) og users-pekeren slettes, enheten forlater husstanden, så slettes Auth-brukeren.
// Delte «hele husstanden»-lister og gjøremål blir i husstanden. Krever nylig innlogging: Google/Apple spør på nytt (popup),
// e-post må logge ut og inn igjen (feilkode 'konto/ny-innlogging'). Reautentiseringen skjer FØR noe slettes.
async function reauthIfNeeded(force) {
  const c = await init(); const { au, auth } = c; const u = auth.currentUser;
  if (!u) throw new Error('no-user');
  let fresh = false;
  if (force || (mode() === 'emulator' && window.KNAGGEN_TEST_REAUTH)) { /* gammel innlogging */ } else try { const t = await u.getIdTokenResult(); fresh = Date.now() - (Number(t.claims.auth_time) * 1000) < 4 * 60 * 1000; } catch (e) { /* regn som gammel */ }
  if (fresh) return;
  const pd = u.providerData || [];
  const g = pd.find(p => p.providerId === 'google.com'), ap = pd.find(p => p.providerId === 'apple.com');
  if (mode() === 'emulator' && window.KNAGGEN_TEST_LOGIN && (g || ap)) {
    const t = JSON.stringify(Object.assign({ email_verified: true }, window.KNAGGEN_TEST_LOGIN));
    const cred = ap ? new au.OAuthProvider('apple.com').credential({ idToken: t, rawNonce: 'test' }) : au.GoogleAuthProvider.credential(t);
    try { await au.reauthenticateWithCredential(u, cred); } catch (e) { throw authErr(e); }
    return;
  }
  if (g || ap) {
    let prov;
    if (ap) { prov = new au.OAuthProvider('apple.com'); prov.addScope('email'); }
    else { prov = new au.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' }); }
    try { await au.reauthenticateWithPopup(u, prov); } catch (e) { throw authErr(e); }
    return;
  }
  const er = new Error('konto/ny-innlogging'); er.code = 'konto/ny-innlogging'; throw er;
}
// Bare PRIVATE lister (deling 'valgte' og eieren er eneste i synligFor) med varer. Lister delt med andre blir igjen hos dem.
async function deleteMyLists(hid) {
  const c = await init(); const { fs } = c;
  const refs = [];
  const snap = await withTimeout(fs.getDocsFromServer(fs.query(fs.collection(...hh(hid, 'flister')), fs.where('synligFor', 'array-contains', c.uid))), 20000, 'no-server');
  for (const d of snap.docs) {
    const x = d.data(), sf = x.synligFor || [];
    if (x.eier !== c.uid || x.deling !== 'valgte' || sf.length !== 1 || sf[0] !== c.uid) continue;
    (await withTimeout(fs.getDocsFromServer(fs.collection(...hh(hid, 'flister', d.id, 'varer'))), 20000, 'no-server')).forEach(v => refs.push(v.ref));
    refs.push(d.ref);
  }
  for (let i = 0; i < refs.length; i += 400) { const b = fs.writeBatch(c.db); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); }
}
// Gjøremål tildelt meg blir ufordelt (en slettet person kan ikke stå som tildelt: reglene krever at tildelt er medlem)
async function unassignMyTasks(hid) {
  const c = await init(); const { fs } = c;
  const snap = await withTimeout(fs.getDocsFromServer(fs.query(fs.collection(...hh(hid, 'tasks')), fs.where('tildelt', '==', c.uid))), 20000, 'no-server');
  for (let i = 0; i < snap.docs.length; i += 400) { const b = fs.writeBatch(c.db); snap.docs.slice(i, i + 400).forEach(d => b.update(d.ref, { tildelt: null })); await b.commit(); }
}
// Slett kontoen: reautentisering først (før noe er slettet). Er jeg siste medlem, slettes hele husstanden (ellers ville data blitt
// liggende uten at noen kan lese dem). Ellers: private lister bort, mine gjøremål ufordelt, enhet og medlemskap bort.
// Hele tiden er joinHousehold stengt, så ingenting kan melde meg inn igjen (ingen spøkelsesmedlemmer).
async function deleteAccount(hid) {
  await reauthIfNeeded();
  const c = await init();
  closing = true;
  try {
    if (hid) {
      let solo = false;
      try { const m = await withTimeout(c.fs.getDocsFromServer(c.fs.collection(...hh(hid, 'members'))), 20000, 'no-server'); solo = m.size === 1 && m.docs[0].id === c.uid; } catch (e) { if (!(e && e.code === 'permission-denied')) throw e; }
      if (solo) await deleteHousehold(hid);
      else {
        try { await deleteMyLists(hid); await unassignMyTasks(hid); } catch (e) { if (!(e && e.code === 'permission-denied')) throw e; }   // reglene ikke publisert: ingenting å rydde
        try { await c.fs.deleteDoc(c.fs.doc(...hh(hid, 'devices', c.uid))); } catch (e) { /* ignorer */ }
        await c.fs.deleteDoc(c.fs.doc(...hh(hid, 'members', c.uid)));
      }
    }
    try { await c.fs.deleteDoc(c.fs.doc(c.db, 'users', c.uid)); } catch (e) { /* ignorer */ }
    await c.fs.waitForPendingWrites(c.db).catch(() => {});
    try { await c.au.deleteUser(c.auth.currentUser); } catch (e) {
      if (e && e.code === 'auth/requires-recent-login') {   // innloggingen ble for gammel underveis: spør på nytt og prøv én gang til
        await reauthIfNeeded(true);
        try { await c.au.deleteUser(c.auth.currentUser); } catch (e2) { throw authErr(e2); }
      } else throw authErr(e);
    }
  } catch (e) { closing = false; throw e; }
  closing = false; ctx = null; initPromise = null;   // neste init lager en ny anonym bruker
}
function onAuthChange(cb) { return ctx ? ctx.au.onAuthStateChanged(ctx.auth, cb) : () => {}; }

/* ---------- v0.20: delte gjøremål (tasks) og private/delte lister (flister + varer) ---------- */
// Lytter på gjøremål, listene jeg ser (egne + utvalgte: array-contains uid, hele husstanden: deling == 'alle') og varene i dem.
// handlers: tasks(docs), lists(docs), varer(lid, docs|null), error(err, navn)
function subscribeGj(hid, handlers) {
  const { fs, db, uid } = ctx;
  const unsubs = [], vUn = {}, lists = { mine: [], alle: [] };
  const onErr = name => err => { handlers.error && handlers.error(err, name); };
  function merged() {
    const m = {};
    lists.alle.concat(lists.mine).forEach(d => { m[d.id] = d; });
    return Object.keys(m).map(k => m[k]);
  }
  const tries = {};
  function pushLists() {
    const all = merged(), ids = {};
    all.forEach(d => { ids[d.id] = true; });
    all.forEach(d => {
      // En liste som ennå ikke er bekreftet av serveren kan ikke leses av varer-regelen (get() på forelderen): vent til den er lagret.
      if (vUn[d.id] || d._pending) return;
      vUn[d.id] = fs.onSnapshot(fs.collection(...hh(hid, 'flister', d.id, 'varer')), snap => {
        handlers.varer && handlers.varer(d.id, snap.docs.map(x => Object.assign({ id: x.id }, x.data())), snap.metadata);
      }, err => {
        delete vUn[d.id];
        tries[d.id] = (tries[d.id] || 0) + 1;
        if (tries[d.id] <= 3) setTimeout(pushLists, 1200 * tries[d.id]);   // forbigående (lista nettopp laget/delt): prøv igjen
        else handlers.error && handlers.error(err, 'varer');
      });
    });
    Object.keys(vUn).forEach(k => { if (!ids[k]) { vUn[k](); delete vUn[k]; handlers.varer && handlers.varer(k, null); } });
    handlers.lists && handlers.lists(all);
  }
  unsubs.push(fs.onSnapshot(fs.collection(...hh(hid, 'tasks')), { includeMetadataChanges: true }, snap => {   // metadata: «fra serveren» må komme (persistent cache gir først en cache-visning)
    handlers.tasks && handlers.tasks(snap.docs.map(d => Object.assign({ id: d.id }, d.data())), snap.metadata);
  }, onErr('tasks')));
  unsubs.push(fs.onSnapshot(fs.query(fs.collection(...hh(hid, 'flister')), fs.where('synligFor', 'array-contains', uid)), { includeMetadataChanges: true }, snap => {
    lists.mine = snap.docs.map(d => Object.assign({ id: d.id, _pending: d.metadata.hasPendingWrites }, d.data())); pushLists();
  }, onErr('flister')));
  unsubs.push(fs.onSnapshot(fs.query(fs.collection(...hh(hid, 'flister')), fs.where('deling', '==', 'alle')), { includeMetadataChanges: true }, snap => {
    lists.alle = snap.docs.map(d => Object.assign({ id: d.id, _pending: d.metadata.hasPendingWrites }, d.data())); pushLists();
  }, onErr('flister')));
  return () => { unsubs.forEach(u => u()); Object.keys(vUn).forEach(k => vUn[k]()); };
}
const taskDoc = (t, uid) => {
  const o = { tittel: String(t.tittel).slice(0, 200), ferdig: !!t.ferdig, tildelt: t.tildelt || null, skapt_av: t.skapt_av || uid, endret: Date.now() };
  o.opprettet = t.opprettet || Date.now();
  return o;
};
const listDoc = (l, uid) => {
  const o = { navn: String(l.navn).slice(0, 60), eier: l.eier || uid, deling: l.deling === 'alle' ? 'alle' : 'valgte', opprettet: l.opprettet || Date.now(), endret: Date.now() };
  if (o.deling === 'valgte') {
    const set = []; (l.synligFor || []).concat([o.eier]).forEach(x => { if (x && set.indexOf(x) < 0) set.push(x); });
    o.synligFor = set.slice(0, 9);
    if (o.synligFor.indexOf(o.eier) < 0) o.synligFor[0] = o.eier;
  }
  return o;
};
const vareDoc = (v) => {
  const o = { tekst: String(v.tekst).slice(0, 200), ferdig: !!v.ferdig, endret: Date.now(), opprettet: v.opprettet || Date.now() };
  if (v.merknad) o.merknad = String(v.merknad).slice(0, 500);
  if (typeof v.rekkefolge === 'number') o.rekkefolge = v.rekkefolge;
  return o;
};
const G = {
  setTask: (hid, t) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'tasks', t.id)), taskDoc(t, ctx.uid)),
  setTasks: (hid, arr) => { const b = ctx.fs.writeBatch(ctx.db); arr.forEach(t => b.set(ctx.fs.doc(...hh(hid, 'tasks', t.id)), taskDoc(t, ctx.uid))); return b.commit(); },
  deleteTask: (hid, id) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'tasks', id))),
  deleteTasks: (hid, ids) => { const b = ctx.fs.writeBatch(ctx.db); ids.forEach(id => b.delete(ctx.fs.doc(...hh(hid, 'tasks', id)))); return b.commit(); },
  setList: (hid, l) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'flister', l.id)), listDoc(l, ctx.uid)),
  // Eierens endring av navn og deling. deleField på synligFor når den blir «hele husstanden».
  updateList: (hid, id, f) => {
    const o = { endret: Date.now() };
    if (f.navn != null) o.navn = String(f.navn).slice(0, 60);
    if (f.deling === 'alle') { o.deling = 'alle'; o.synligFor = ctx.fs.deleteField(); }
    else if (f.deling === 'valgte') { o.deling = 'valgte'; o.synligFor = listDoc({ navn: 'x', eier: ctx.uid, deling: 'valgte', synligFor: f.synligFor }, ctx.uid).synligFor; }
    return ctx.fs.updateDoc(ctx.fs.doc(...hh(hid, 'flister', id)), o);
  },
  // «Forlat lista»: bare egen uid fjernes fra synligFor (reglene tillater ingenting annet)
  leaveList: (hid, id, current) => ctx.fs.updateDoc(ctx.fs.doc(...hh(hid, 'flister', id)), { synligFor: (current || []).filter(x => x !== ctx.uid) }),
  // Slett lista: varene og lista i samme batch (reglene slår opp lista mens den fortsatt finnes)
  deleteList: (hid, id, vareIds) => {
    const b = ctx.fs.writeBatch(ctx.db);
    (vareIds || []).forEach(v => b.delete(ctx.fs.doc(...hh(hid, 'flister', id, 'varer', v))));
    b.delete(ctx.fs.doc(...hh(hid, 'flister', id)));
    return b.commit();
  },
  setVare: (hid, lid, v) => ctx.fs.setDoc(ctx.fs.doc(...hh(hid, 'flister', lid, 'varer', v.id)), vareDoc(v)),
  deleteVare: (hid, lid, vid) => ctx.fs.deleteDoc(ctx.fs.doc(...hh(hid, 'flister', lid, 'varer', vid))),
  deleteVarer: (hid, lid, ids) => { const b = ctx.fs.writeBatch(ctx.db); ids.forEach(id => b.delete(ctx.fs.doc(...hh(hid, 'flister', lid, 'varer', id)))); return b.commit(); }
};
// «Slett husstanden»: egne lister (med varer) og alle gjøremål ryddes bort. Andres private lister kan ikke leses her og blir liggende (uleselige).
async function gjDeleteAll(hid) {
  const c = await init();
  const { fs, db } = c;
  const refs = [];
  try { (await withTimeout(fs.getDocsFromServer(fs.collection(...hh(hid, 'tasks'))), 20000, 'no-server')).forEach(d => refs.push(d.ref)); } catch (e) { if (!(e && e.code === 'permission-denied')) throw e; }
  for (const q of [fs.query(fs.collection(...hh(hid, 'flister')), fs.where('synligFor', 'array-contains', c.uid)), fs.query(fs.collection(...hh(hid, 'flister')), fs.where('deling', '==', 'alle'))]) {
    let snap; try { snap = await withTimeout(fs.getDocsFromServer(q), 20000, 'no-server'); } catch (e) { if (e && e.code === 'permission-denied') continue; throw e; }
    for (const d of snap.docs) {
      if (d.data().eier !== c.uid) continue;   // bare eieren kan slette lista
      try { (await withTimeout(fs.getDocsFromServer(fs.collection(...hh(hid, 'flister', d.id, 'varer'))), 20000, 'no-server')).forEach(v => refs.push(v.ref)); } catch (e) { /* ignorer */ }
      refs.push(d.ref);
    }
  }
  for (let i = 0; i < refs.length; i += 450) {
    const b = fs.writeBatch(db);
    refs.slice(i, i + 450).forEach(r => b.delete(r));
    await withTimeout(b.commit(), 30000, 'no-server');
  }
}

window.UkeshandelSync = { fetchRecipe, makeShareList, deleteShareLists, fetchWeather, calendar, mode, init, randomCode, createHousehold, joinHousehold, isMember, subscribe, write: W, uid: () => ctx && ctx.uid,
  inviteCode, createInvite, getInvite, leaveHousehold, deleteHousehold, stillMember, myDeviceExists,
  // v0.20
  accountInfo, linkProvider, linkCredential, sendEmailLink, isEmailLink, savedEmail, completeEmailLink, adoptHousehold, saveAccountHousehold, accountHousehold,
  forgetAccountHousehold, signOutAccount, deleteAccount, onAuthChange, subscribeGj, gj: G, gjDeleteAll };
window.dispatchEvent(new Event('ukeshandel-sync-ready'));
