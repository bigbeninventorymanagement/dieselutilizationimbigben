// Firebase backend for the Diesel Utilization app.
// Exposes window.DUS with a small Firestore wrapper (collection/doc/onSnapshot/set/update/delete)
// and the auth calls the page uses, then fires "dus-ready".
import { firebaseConfig, USERNAME_DOMAIN, SHOW_QUICK_SELECT, REMEMBER_SIGN_IN } from "./config.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword,
  setPersistence, browserSessionPersistence, browserLocalPersistence, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Local development: open http://localhost:5000/?emulator with `firebase emulators:start` running.
const emulator = ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("emulator");
const config = emulator ? { apiKey: "demo-key", authDomain: "demo-diesel.firebaseapp.com", projectId: "demo-diesel" } : firebaseConfig;
const configured = emulator || Boolean(firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("YOUR_"));
const flags = { SHOW_QUICK_SELECT, REMEMBER_SIGN_IN, USERNAME_DOMAIN, emulator };
let api = { configured: false, flags };

if (configured) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  if (emulator) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await setPersistence(auth, REMEMBER_SIGN_IN ? browserLocalPersistence : browserSessionPersistence);

  let fs;
  try {
    fs = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
  if (emulator) connectFirestoreEmulator(fs, "127.0.0.1", 8080);

  const snapDoc = (s) => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata });
  const wrapDoc = (ref) => ({
    id: ref.id,
    path: ref.path,
    get: () => getDoc(ref).then(snapDoc),
    set: (d) => setDoc(ref, d),
    update: (d) => updateDoc(ref, d),
    delete: () => deleteDoc(ref),
    onSnapshot: (next, err) => onSnapshot(ref, (s) => next(snapDoc(s)), err),
  });
  const wrapCol = (path) => ({
    path,
    doc: (id) => wrapDoc(id ? doc(fs, path, id) : doc(collection(fs, path))),
    add: (d) => addDoc(collection(fs, path), d).then(wrapDoc),
    onSnapshot: (next, err) =>
      onSnapshot(collection(fs, path), (s) => next({ docs: s.docs.map(snapDoc), size: s.size, empty: s.empty, metadata: s.metadata }), err),
  });

  const email = (u) => `${String(u).trim().toLowerCase()}@${USERNAME_DOMAIN}`;

  api = {
    configured: true,
    flags,
    db: { collection: wrapCol, doc: (p) => wrapDoc(doc(fs, p)) },
    email,
    onAuth: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
    signIn: (username, pw) => signInWithEmailAndPassword(auth, email(username), pw),
    signOut: () => signOut(auth),
    changePassword: async (current, next) => {
      const u = auth.currentUser;
      if (!u) throw Object.assign(new Error("Not signed in"), { code: "auth/no-current-user" });
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      await updatePassword(u, next);
    },
    // Creates a sign-in for a new person without signing the current user out:
    // a second, short-lived Firebase app does the sign-up.
    createUser: async (username, pw) => {
      const sec = initializeApp(config, "account-setup-" + Date.now());
      try {
        const secAuth = getAuth(sec);
        if (emulator) connectAuthEmulator(secAuth, "http://127.0.0.1:9099", { disableWarnings: true });
        const cred = await createUserWithEmailAndPassword(secAuth, email(username), pw);
        await signOut(secAuth);
        return cred.user.uid;
      } finally {
        await deleteApp(sec);
      }
    },
  };
}

window.DUS = api;
window.dispatchEvent(new Event("dus-ready"));
