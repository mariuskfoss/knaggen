/* Knaggen dashbord (0.21.0). Leser BARE anonyme tellere: stats/husstander (husstander totalt og per dag) og statsdag/{dato} (aktive husstander og
 * fylke, én liten teller per dag). Aldri husstandsdokumenter. Reglene slipper bare statistikkadmin til (bekreftet Google-e-post som har et
 * dokument statsadmin/{e-post}, laget for hånd i Firebase-konsollen). Ingen tredjepart, ingen Analytics. */
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const $ = id => document.getElementById(id);
const EMU = ['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let per = 30, data = null, dager = [], stedPer = 30;
const FYLKE = { '03': 'Oslo', '11': 'Rogaland', '15': 'Møre og Romsdal', '18': 'Nordland', '31': 'Østfold', '32': 'Akershus', '33': 'Buskerud', '34': 'Innlandet', '39': 'Vestfold', '40': 'Telemark', '42': 'Agder', '46': 'Vestland', '50': 'Trøndelag', '55': 'Troms', '56': 'Finnmark', 'ut': 'Utenfor Norge', '00': 'Ukjent' };

function feil(t) { const e = $('dash-feil'); e.textContent = t; e.hidden = !t; }
const nb = n => Number(n || 0).toLocaleString('nb-NO');
const iso = d => d.toISOString().slice(0, 10);

function rader(per_dag) {
  const keys = Object.keys(per_dag || {}).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)).sort();
  if (!keys.length) return [];
  const start = new Date(keys[0] + 'T00:00:00Z'), slutt = new Date(iso(new Date()) + 'T00:00:00Z');
  const ut = []; let sum = 0;
  for (let d = new Date(start); d <= slutt; d = new Date(d.getTime() + 864e5)) {
    const k = iso(d), n = Number(per_dag[k] || 0); sum += n; ut.push({ k, n, sum });
  }
  return ut;
}
function graf() {
  const el = $('dash-graf');
  let r = rader(data.per_dag);
  if (!r.length) { el.innerHTML = '<p class="dash-note">Ingen husstander er telt ennå.</p>'; return; }
  if (per) r = r.slice(-per);
  const W = 640, H = 220, L = 34, R = 40, T = 12, B = 26, iw = W - L - R, ih = H - T - B;
  const maxN = Math.max(1, ...r.map(x => x.n)), maxS = Math.max(1, ...r.map(x => x.sum));
  const bw = iw / r.length;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
  [0, .5, 1].forEach(f => { const y = T + ih * (1 - f); s += '<line class="rutenett" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>'; });
  s += '<text x="' + (L - 4) + '" y="' + (T + 8) + '" text-anchor="end">' + maxN + '</text><text x="' + (L - 4) + '" y="' + (T + ih) + '" text-anchor="end">0</text>';
  s += '<text x="' + (W - R + 4) + '" y="' + (T + 8) + '">' + nb(maxS) + '</text>';
  r.forEach((x, i) => { const h = ih * x.n / maxN; s += '<rect class="sk" data-k="' + x.k + '" data-n="' + x.n + '" x="' + (L + i * bw + 1) + '" y="' + (T + ih - h) + '" width="' + Math.max(1, bw - 2) + '" height="' + h + '"><title>' + x.k + ': ' + x.n + ' nye</title></rect>'; });
  s += '<polyline class="lin" points="' + r.map((x, i) => (L + i * bw + bw / 2).toFixed(1) + ',' + (T + ih * (1 - x.sum / maxS)).toFixed(1)).join(' ') + '"/>';
  s += '<text x="' + L + '" y="' + (H - 6) + '">' + r[0].k + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + r[r.length - 1].k + '</text></svg>';
  el.innerHTML = s;
}
function vis(d) {
  data = d || { antall: 0, per_dag: {} };
  $('dash-total').textContent = nb(data.antall);
  const r = rader(data.per_dag), idag = r.length ? r[r.length - 1].n : 0, uke = r.slice(-7).reduce((a, x) => a + x.n, 0);
  $('dash-under').textContent = d ? 'I dag: ' + nb(idag) + ' · siste 7 dager: ' + nb(uke) + (data.oppdatert && data.oppdatert.toDate ? ' · sist oppdatert ' + data.oppdatert.toDate().toLocaleString('nb-NO') : '') : 'Ingen husstander er telt ennå.';
  graf();
}
// Tellerne for de siste 30 dagene (UTC), eldst først, med dager uten dokument som 0. Dagens «idag» er også dagens «sist».
function lagDager(docs) {
  const m = {}; docs.forEach(d => { m[d.id] = d.data; });
  const ut = [], i0 = new Date(iso(new Date()) + 'T00:00:00Z').getTime();
  for (let i = 29; i >= 0; i--) { const k = iso(new Date(i0 - i * 864e5)), d = m[k] || {}; ut.push({ k, idag: Number(d.idag || 0), sist: Number(d.sist || 0), sted: d.sted && typeof d.sted === 'object' ? d.sted : {} }); }
  return ut;
}
// Sjekker om tallene henger sammen. Tallene kan manipuleres (reglene sjekker bare formen), så avvik vises som en advarsel øverst.
function sjekkTall() {
  const w = [], m = [], total = data && data.antall !== undefined ? Number(data.antall) : null, a30 = sum(dager, x => x.sist);
  const tall = [total, ...Object.values((data && data.per_dag) || {}).map(Number), ...dager.map(x => x.idag), ...dager.map(x => x.sist), ...dager.flatMap(x => Object.values(x.sted).map(Number))];
  if (tall.some(n => !isFinite(n) || n < 0)) w.push('Negative eller ugyldige tall. Noen har skrevet i tellerne, eller noe er galt.');
  if (dager.some(x => x.sist > x.idag)) w.push('En dag har flere «sist sett» enn aktive den dagen. Det skal ikke skje.');
  if (dager.some(x => sum(Object.keys(x.sted), k => Number(x.sted[k] || 0)) !== x.sist)) w.push('Fylkestallene for en dag summerer ikke til «sist sett». Det skal ikke skje.');
  if (total !== null && a30 > total) m.push('Flere aktive husstander siste 30 dager (' + nb(a30) + ') enn husstander laget (' + nb(total) + '). Det kan være helt normalt de første ukene: husstander laget før telleren ble slått på er ikke med i «laget». Ser det fortsatt slik ut senere, kan tallene være skrudd på.');
  const rest = dager.map(x => x.idag).filter(n => n > 0), snitt = rest.length > 1 ? (sum(rest, n => n) - Math.max(...rest)) / (rest.length - 1) : 0;
  if (dager.some(x => x.idag >= 50 && snitt > 0 && x.idag >= 5 * snitt)) w.push('En dag har mange ganger flere aktive enn de andre (' + nb(Math.max(...rest)) + '). Det kan være en feil eller at noen har skrudd på tallene.');
  const el = $('dash-advarsel');
  el.hidden = !(w.length || m.length);
  // «Obs» bare for det som ikke skal kunne skje; det som kan ha en vanlig forklaring står som nøytral «Til info»
  el.innerHTML = (w.length ? '<div class="dash-obs" data-testid="dash-obs" role="alert"><b>Obs: tallene ser rare ut.</b><ul>' + w.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>' : '') +
    (m.length ? '<div class="dash-merk" data-testid="dash-merk" role="note"><b>Til info:</b><ul>' + m.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>' : '');
}
const sum = (r, f) => r.reduce((a, x) => a + f(x), 0);
function visAktive() {
  const siste = n => dager.slice(-n);
  $('dash-akt-1').textContent = nb(sum(siste(1), x => x.sist));
  $('dash-akt-7').textContent = nb(sum(siste(7), x => x.sist));
  $('dash-akt-30').textContent = nb(sum(siste(30), x => x.sist));
  const har = dager.some(x => x.idag || x.sist);
  $('dash-akt-under').textContent = har ? '' : 'Ingen aktive husstander er telt ennå.';
  const el = $('dash-akt-graf');
  if (!har) { el.innerHTML = ''; } else {
    const W = 640, H = 160, L = 34, R = 10, T = 12, B = 26, iw = W - L - R, ih = H - T - B, mx = Math.max(1, ...dager.map(x => x.idag)), bw = iw / dager.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><line class="rutenett" x1="' + L + '" x2="' + (W - R) + '" y1="' + T + '" y2="' + T + '"/><line class="rutenett" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ih) + '" y2="' + (T + ih) + '"/>';
    s += '<text x="' + (L - 4) + '" y="' + (T + 8) + '" text-anchor="end">' + mx + '</text><text x="' + (L - 4) + '" y="' + (T + ih) + '" text-anchor="end">0</text>';
    dager.forEach((x, i) => { const h = ih * x.idag / mx; s += '<rect class="sk" data-k="' + x.k + '" data-n="' + x.idag + '" x="' + (L + i * bw + 1) + '" y="' + (T + ih - h) + '" width="' + Math.max(1, bw - 2) + '" height="' + h + '"><title>' + x.k + ': ' + x.idag + ' aktive</title></rect>'; });
    s += '<text x="' + L + '" y="' + (H - 6) + '">' + dager[0].k + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + dager[dager.length - 1].k + '</text></svg>';
    el.innerHTML = s;
  }
  visSted();
  sjekkTall();
}
function visSted() {
  const t = {}; dager.slice(-stedPer).forEach(x => Object.keys(x.sted).forEach(k => { const n = Number(x.sted[k] || 0); if (n > 0) t[k] = (t[k] || 0) + n; }));
  const ks = Object.keys(t).sort((a, b) => t[b] - t[a] || a.localeCompare(b)), tot = sum(ks, k => t[k]), mx = ks.length ? t[ks[0]] : 1;
  $('dash-sted').innerHTML = ks.length ? ks.map(k => '<div class="fylkerad" data-kode="' + esc(k) + '" data-n="' + t[k] + '" data-testid="dash-sted-' + esc(k) + '"><span>' + esc(FYLKE[k] || 'Ukjent') + '</span><span class="stolpe"><i style="width:' + Math.max(2, Math.round(100 * t[k] / mx)) + '%"></i></span><span class="tall">' + nb(t[k]) + ' · ' + Math.round(100 * t[k] / tot) + ' %</span></div>').join('') : '<p class="dash-note">Ingen aktive husstander i denne perioden.</p>';
}

(async () => {
  const [appMod, au, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const cfg = EMU ? { apiKey: 'demo-key', authDomain: 'demo-ukeshandel.firebaseapp.com', projectId: 'demo-ukeshandel', appId: 'demo-app' } : window.UKESHANDEL_FIREBASE_CONFIG;
  const app = appMod.initializeApp(cfg, 'dashbord');
  const auth = au.getAuth(app), db = fs.getFirestore(app);
  if (EMU) { au.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); fs.connectFirestoreEmulator(db, '127.0.0.1', 8080); }

  async function les(user) {
    feil('');
    $('dash-logginn').hidden = true; $('dash-innhold').hidden = false; $('dash-ut').hidden = false;
    $('dash-hvem').textContent = 'Innlogget som ' + (user.email || 'ukjent');
    try {
      const s = await fs.getDoc(fs.doc(db, 'stats', 'husstander'));
      vis(s.exists() ? s.data() : null);
      try {
        const start = iso(new Date(Date.now() - 29 * 864e5));
        const q = await fs.getDocs(fs.query(fs.collection(db, 'statsdag'), fs.where(fs.documentId(), '>=', start), fs.orderBy(fs.documentId())));
        dager = lagDager(q.docs.map(d => ({ id: d.id, data: d.data() })));
        visAktive();
      } catch (e2) {
        $('dash-akt-under').textContent = e2 && e2.code === 'permission-denied' ? 'Aktivitetstallene er ikke åpnet for denne kontoen ennå (reglene for statsdag er ikke publisert).' : 'Fikk ikke hentet aktivitetstallene. Prøv igjen senere.';
      }
    } catch (e) {
      $('dash-total').textContent = '–'; $('dash-graf').innerHTML = ''; ['dash-akt-1', 'dash-akt-7', 'dash-akt-30'].forEach(i => { $(i).textContent = '–'; }); $('dash-sted').innerHTML = ''; $('dash-akt-graf').innerHTML = '';
      $('dash-under').textContent = e && e.code === 'permission-denied' ? 'Denne kontoen har ikke tilgang til tallene. Be Marius legge deg til som statistikkadmin.' : 'Fikk ikke hentet tallene. Prøv igjen senere.';
    }
  }
  au.onAuthStateChanged(auth, u => {
    if (u && !u.isAnonymous) les(u);
    else { $('dash-logginn').hidden = false; $('dash-innhold').hidden = true; $('dash-ut').hidden = true; }
  });
  $('dash-google').onclick = async () => {
    feil('');
    try {
      if (EMU && window.KNAGGEN_TEST_LOGIN) {
        const t = JSON.stringify(Object.assign({ email_verified: true }, window.KNAGGEN_TEST_LOGIN));
        await au.signInWithCredential(auth, au.GoogleAuthProvider.credential(t));
      } else {
        const p = new au.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
        await au.signInWithPopup(auth, p);
      }
    } catch (e) { feil(e && e.code === 'auth/popup-closed-by-user' ? 'Innloggingen ble avbrutt.' : 'Innloggingen mislyktes. Prøv igjen.'); }
  };
  $('dash-ut').onclick = () => au.signOut(auth);
  document.querySelectorAll('[data-dager]').forEach(b => b.onclick = () => {
    per = Number(b.getAttribute('data-dager'));
    document.querySelectorAll('[data-dager]').forEach(x => x.classList.toggle('on', x === b));
    if (data) graf();
  });
  document.querySelectorAll('[data-sted-dager]').forEach(b => b.onclick = () => {
    stedPer = Number(b.getAttribute('data-sted-dager'));
    document.querySelectorAll('[data-sted-dager]').forEach(x => x.classList.toggle('on', x === b));
    visSted();
  });
  document.documentElement.setAttribute('data-klar', '1');
})().catch(() => feil('Fikk ikke lastet siden. Sjekk nettet og prøv igjen.'));
