// RepLog — Firebase connection for the GitHub Pages version.
//
// Inside Claude, the app stores data through `window.claude.use('db' | 'user')`.
// Here we provide the same interface backed by Firebase (Google sign-in + Firestore),
// so the rest of the app works unchanged: private per-person data at
// data/users/<uid>/..., and the shared leaderboard at board/<uid>.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const DEVICE_ONLY = 'replog.deviceOnly';

export async function install(){
  let cfg;
  try { cfg = (await import('./firebase-config.js')).default; } catch(e){ return false; }
  if (!cfg || !cfg.apiKey || String(cfg.apiKey).startsWith('PASTE')) return false;   // not set up yet

  window.replogSignIn = () => { try { localStorage.removeItem(DEVICE_ONLY); } catch(e){} location.reload(); };
  let deviceOnly = false;
  try { deviceOnly = localStorage.getItem(DEVICE_ONLY) === '1'; } catch(e){}

  const [{initializeApp}, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  let fs;
  try { fs = F.initializeFirestore(app, {localCache: F.persistentLocalCache({tabManager: F.persistentMultipleTabManager()})}); }
  catch(e){ fs = F.getFirestore(app); }          // offline cache unavailable (e.g. private browsing)

  let u = await new Promise(res => { const off = A.onAuthStateChanged(auth, x => { off(); res(x); }); });
  if (!u){ try { const r = await A.getRedirectResult(auth); if (r) u = r.user; } catch(e){} }
  if (!u && deviceOnly) return false;
  if (!u) u = await signInScreen(auth, A);
  if (!u) return false;

  const code = e => {        // translate Firebase errors to the codes the app understands
    const c = e && e.code || '';
    return {code: c === 'permission-denied' ? 'invalid_argument' : c === 'resource-exhausted' ? 'quota_exceeded' : 'unavailable', message: e && e.message || String(e)};
  };
  const meta = m => ({fromCache: m.fromCache, hasPendingWrites: m.hasPendingWrites});
  const docRef = path => {
    const r = F.doc(fs, path);
    return {
      id: r.id, path,
      set: d => F.setDoc(r, d).catch(e => { throw code(e); }),
      delete: () => F.deleteDoc(r).catch(e => { throw code(e); }),
      get: async () => { const s = await F.getDoc(r); return {id: r.id, exists: s.exists(), data: () => s.data(), metadata: meta(s.metadata)}; },
    };
  };
  const db = {
    doc: docRef,
    collection: p => ({
      path: p,
      doc: id => docRef(p + '/' + id),
      onSnapshot(next, error){
        return F.onSnapshot(F.collection(fs, p), {includeMetadataChanges: true}, qs => next({
          docs: qs.docs.map(d => ({id: d.id, exists: true, data: () => d.data(), metadata: meta(d.metadata)})),
          size: qs.size, empty: qs.empty, metadata: meta(qs.metadata), docChanges: () => [],
        }), e => error && error(code(e)));
      },
    }),
  };

  const name = u.displayName || (u.email || '').split('@')[0] || '';
  const initialsAvatar = s => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" rx="30" fill="#2a78d6"/><text x="30" y="39" font-family="system-ui,sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#fff">${(s || '?').trim().charAt(0).toUpperCase().replace(/[<&>"]/g, '')}</text></svg>`);
  const me = {id: u.uid, name, avatarUrl: u.photoURL || initialsAvatar(name), color: '#2a78d6', email: u.email || null, isOwner: false, canEdit: false};
  const user = {
    id: async () => u.uid,
    me: async () => me,
    isOwner: async () => false, canEdit: async () => false, can: async () => null,
    name: async () => name,
    // Other people's names come from the nickname they choose on the leaderboard.
    profiles: async ids => Object.fromEntries([].concat(ids).map(id => [id, id === u.uid
      ? {...me, isMe: true, guest: false}
      : {id, name: '', avatarUrl: '', color: '#888', email: null, isMe: false, guest: false}])),
  };

  window.claude = {use: async n => n === 'db' ? db : n === 'user' ? user : null};
  window.replogAccount = {
    name, email: u.email || '',
    signOut: async () => { await A.signOut(auth); try { localStorage.removeItem('replog.v1'); } catch(e){} location.reload(); },
    shareUrl: location.origin + location.pathname,
  };
  return true;
}

function signInScreen(auth, A){
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'dlg'; wrap.style.zIndex = 60;
    wrap.innerHTML = `<div class="dlg-box" style="text-align:center">
      <div class="brand" style="font-size:28px;margin-bottom:6px">Rep<span>Log</span></div>
      <p class="sec">Sign in to sync your workouts between your phone and laptop, and to join the friends leaderboard.</p>
      <button class="btn primary big" id="gSign" style="margin-top:8px">Sign in with Google</button>
      <p id="gErr" class="small" style="color:var(--danger-text);min-height:1em"></p>
      <button class="btn ghost" id="gLocal" style="width:100%">Use without an account (this device only)</button>
    </div>`;
    document.body.appendChild(wrap);
    const provider = new A.GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    wrap.querySelector('#gSign').onclick = async () => {
      wrap.querySelector('#gErr').textContent = '';
      try { const r = await A.signInWithPopup(auth, provider); wrap.remove(); resolve(r.user); }
      catch(e){
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment'){ A.signInWithRedirect(auth, provider); return; }
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        wrap.querySelector('#gErr').textContent = e.code === 'auth/unauthorized-domain'
          ? 'This web address isn’t allowed yet — add it under Authentication → Settings → Authorized domains in Firebase.'
          : 'Sign-in failed (' + (e.code || e.message) + '). Try again.';
      }
    };
    wrap.querySelector('#gLocal').onclick = () => {
      try { localStorage.setItem(DEVICE_ONLY, '1'); } catch(e){}
      wrap.remove(); resolve(null);
    };
  });
}
