/* Firebase-oppsett for Ukeshandel (offentlig – dette er ikke hemmelig; tilgang styres av firestore.rules).
 * Prosjekt: handleliste-8f568. Verdiene kommer fra Firebase-konsollen (Prosjektinnstillinger → Dine apper → SDK-oppsett → Config).
 * Når appen serveres fra localhost/127.0.0.1 brukes Firebase-emulatorene automatisk i stedet (se sync.js).
 * Settes verdiene tilbake til plassholdere (LIM_INN…), kjører appen bare lokalt på telefonen, uten deling.
 */
window.UKESHANDEL_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyADfTSwHBXA1S_NQK5jy1e1Zz8CcsmwVhc',
  // Innloggingsdomene: auth.knaggen.no (Firebase Hosting, samme site som del.knaggen.no). Connected 2026-11-05 (se merkevare/nettside/HOSTING-OG-DNS.md, del 2).
  authDomain: 'auth.knaggen.no',
  projectId: 'handleliste-8f568',
  storageBucket: 'handleliste-8f568.firebasestorage.app',
  messagingSenderId: '68176897923',
  appId: '1:68176897923:web:368c5164414e6fea0e38b6'
};
