// Firebase Firestore & Google Auth integration for VELOCITY Daily Courses & Shared Leaderboards.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const OperationType = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
});

let app = null;
let db = null;
let auth = null;
let currentUser = null;
let isOnline = false;
let initError = null;
const authListeners = new Set();

function handleFirestoreError(error, operationType, path) {
  const user = auth ? auth.currentUser : null;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid ?? null,
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
      tenantId: user?.tenantId ?? null,
      providerInfo:
        user?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeDisplayName(user) {
  if (window.VelocitySettings && typeof window.VelocitySettings.resolveEffectiveDisplayName === 'function') {
    const resolved = window.VelocitySettings.resolveEffectiveDisplayName(window.activeSettings, user);
    return String(resolved).trim().slice(0, 40) || 'Runner';
  }
  const raw = (user && (user.displayName || (user.email ? user.email.split('@')[0] : ''))) || 'Runner';
  const cleaned = String(raw).trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : 'Runner';
}

function sanitizeSplits(splits, fallbackTime) {
  const arr = [];
  if (Array.isArray(splits)) {
    for (let i = 0; i < splits.length && arr.length < 32; i++) {
      const v = splits[i];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 3600) {
        arr.push(Math.round(v * 1000) / 1000);
      }
    }
  }
  if (arr.length === 0) {
    arr.push(Math.round(Math.max(1.01, Math.min(3600, fallbackTime)) * 1000) / 1000);
  }
  return arr;
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isOnline = true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      isOnline = false;
    } else {
      // Online permission-denied on test/connection confirms live Firestore reachability
      isOnline = true;
    }
  }
}

async function initFirebase() {
  try {
    const configUrl = new URL('../firebase-applet-config.json', import.meta.url).href;
    const res = await fetch(configUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load firebase-applet-config.json (${res.status})`);
    const firebaseConfig = await res.json();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
      currentUser = user || null;
      authListeners.forEach((cb) => {
        try {
          cb(currentUser);
        } catch (err) {
          console.error(err);
        }
      });
    });

    await testConnection();
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    isOnline = false;
    console.warn('Firebase initialization unavailable; using local deterministic daily mode:', initError);
  } finally {
    window.dispatchEvent(new Event('daily-backend-ready'));
  }
}

const ready = initFirebase();

async function ensureDailyCourseRegistered(dateKey) {
  await ready;
  const Gen = window.DailyCourseGen;
  if (!Gen || !Gen.isValidDateKey(dateKey)) return null;
  const canonicalSeed = Gen.canonicalDailySeed(dateKey);
  const preview = Gen.previewSeedCourse(canonicalSeed, dateKey);

  if (!db) return preview;
  const user = auth ? auth.currentUser : null;
  if (!user || !user.emailVerified) {
    return preview;
  }

  const docPath = `dailyCourses/${dateKey}`;
  const ref = doc(db, 'dailyCourses', dateKey);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  if (snap && snap.exists()) {
    const data = snap.data();
    return Gen.previewSeedCourse(data.seed || canonicalSeed, dateKey);
  }

  // Only verified authenticated users may register a new daily course doc in Firestore
  if (currentUser && currentUser.emailVerified) {
    const payload = {
      dateKey,
      seed: preview.seed,
      lengthTier: preview.lengthTier,
      segmentCount: preview.segmentCount,
      mechanics: preview.mechanics.slice(0, 8),
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(ref, payload);
    } catch (error) {
      // If another player registered concurrently, re-read gracefully
      try {
        const retry = await getDoc(ref);
        if (retry.exists()) {
          return Gen.previewSeedCourse(retry.data().seed || canonicalSeed, dateKey);
        }
      } catch (_) {
        // Fall through to structured handler
      }
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  return preview;
}

async function fetchDailyArchive(recentDays = 14) {
  await ready;
  const Gen = window.DailyCourseGen;
  const map = new Map();

  // Always seed the recent calendar window deterministically so past dailies are playable offline or before first DB write
  const recentKeys = Gen.getRecentDateKeys(recentDays);
  for (const dk of recentKeys) {
    const seed = Gen.canonicalDailySeed(dk);
    map.set(dk, { ...Gen.previewSeedCourse(seed, dk), storedInDb: false });
  }

  let cloudSynced = false;
  if (db) {
    const colPath = 'dailyCourses';
    try {
      const q = query(collection(db, colPath), where('isPublic', '==', true), limit(60));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const dk = d.dateKey || docSnap.id;
        if (!Gen.isValidDateKey(dk)) return;
        const seed = typeof d.seed === 'string' && d.seed.length >= 4 ? d.seed : Gen.canonicalDailySeed(dk);
        map.set(dk, { ...Gen.previewSeedCourse(seed, dk), storedInDb: true });
      });
      cloudSynced = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  }

  const list = Array.from(map.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
  return { courses: list, cloudSynced };
}

async function fetchLeaderboard(dateKey) {
  await ready;
  const Gen = window.DailyCourseGen;
  if (!Gen.isValidDateKey(dateKey)) return { entries: [], cloudSynced: false };
  if (!db) return { entries: [], cloudSynced: false };

  const path = `dailyCourses/${dateKey}/runs`;
  try {
    const q = query(
      collection(db, 'dailyCourses', dateKey, 'runs'),
      where('bestTime', '>', 0),
      orderBy('bestTime', 'asc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const entries = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      entries.push({
        uid: d.uid || docSnap.id,
        displayName: d.displayName || 'Runner',
        bestTime: d.bestTime,
        splits: Array.isArray(d.splits) ? d.splits : []
      });
    });
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });
    return { entries, cloudSynced: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

async function submitDailyRun(dateKey, runTime, splits) {
  await ready;
  const Gen = window.DailyCourseGen;
  if (!Gen.isValidDateKey(dateKey)) return { submitted: false, reason: 'invalid-date' };
  if (!db || !auth) return { submitted: false, reason: 'offline' };
  if (!currentUser) return { submitted: false, reason: 'signed-out' };
  if (!currentUser.emailVerified) return { submitted: false, reason: 'unverified' };

  const cleanTime = Math.round(Number(runTime) * 1000) / 1000;
  if (!Number.isFinite(cleanTime) || cleanTime <= 1.0 || cleanTime > 3600.0) {
    return { submitted: false, reason: 'invalid-time' };
  }

  // Ensure parent daily course document exists before writing subcollection run (Master Gate)
  await ensureDailyCourseRegistered(dateKey);

  const uid = currentUser.uid;
  const runPath = `dailyCourses/${dateKey}/runs/${uid}`;
  const runRef = doc(db, 'dailyCourses', dateKey, 'runs', uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(runRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, runPath);
  }

  const displayName = sanitizeDisplayName(currentUser);
  const cleanSplits = sanitizeSplits(splits, cleanTime);

  if (existingSnap && existingSnap.exists()) {
    const prevBest = existingSnap.data().bestTime;
    if (typeof prevBest === 'number' && cleanTime >= prevBest) {
      const lb = await fetchLeaderboard(dateKey);
      const found = lb.entries.find((e) => e.uid === uid);
      return { submitted: false, improved: false, rank: found ? found.rank : null, total: lb.entries.length, reason: 'not-faster' };
    }
    try {
      await updateDoc(runRef, {
        displayName,
        bestTime: cleanTime,
        splits: cleanSplits,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, runPath);
    }
  } else {
    try {
      await setDoc(runRef, {
        uid,
        dateKey,
        displayName,
        bestTime: cleanTime,
        splits: cleanSplits,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, runPath);
    }
  }

  const lb = await fetchLeaderboard(dateKey);
  const found = lb.entries.find((e) => e.uid === uid);
  return { submitted: true, improved: true, rank: found ? found.rank : null, total: lb.entries.length };
}

async function loadUserSettings() {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) {
    return { settings: null, exists: false, cloudSynced: false };
  }
  const uid = currentUser.uid;
  const path = `userSettings/${uid}`;
  const ref = doc(db, 'userSettings', uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { settings: null, exists: false, cloudSynced: true };
    }
    const raw = snap.data();
    const clean = window.VelocitySettings ? window.VelocitySettings.sanitizeSettings(raw) : raw;
    return { settings: clean, exists: true, cloudSynced: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function saveUserSettings(settings) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) {
    return { saved: false, reason: !currentUser ? 'signed-out' : 'offline' };
  }
  if (!window.VelocitySettings) {
    return { saved: false, reason: 'no-settings-module' };
  }
  const uid = currentUser.uid;
  const path = `userSettings/${uid}`;
  const ref = doc(db, 'userSettings', uid);
  const payload = window.VelocitySettings.toCloudPayload(settings, uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existingSnap && existingSnap.exists()) {
    try {
      await updateDoc(ref, {
        displayName: payload.displayName,
        sensitivity: payload.sensitivity,
        invertY: payload.invertY,
        baseFov: payload.baseFov,
        crosshair: payload.crosshair,
        viewmodel: payload.viewmodel,
        keybinds: payload.keybinds,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
  return { saved: true };
}

async function syncDisplayNameToRun(dateKey, customDisplayName) {
  await ready;
  const Gen = window.DailyCourseGen;
  if (!Gen || !Gen.isValidDateKey(dateKey)) return { updated: false };
  if (!db || !currentUser || !currentUser.emailVerified) return { updated: false };

  const uid = currentUser.uid;
  const runPath = `dailyCourses/${dateKey}/runs/${uid}`;
  const runRef = doc(db, 'dailyCourses', dateKey, 'runs', uid);

  let snap;
  try {
    snap = await getDoc(runRef);
  } catch (_) {
    return { updated: false };
  }
  if (!snap || !snap.exists()) return { updated: false };

  const resolved = window.VelocitySettings
    ? window.VelocitySettings.resolveEffectiveDisplayName({ displayName: customDisplayName }, currentUser)
    : sanitizeDisplayName(currentUser);
  const cleanName = String(resolved).trim().slice(0, 40) || 'Runner';
  if (snap.data().displayName === cleanName) return { updated: false };

  try {
    await updateDoc(runRef, {
      displayName: cleanName,
      updatedAt: serverTimestamp()
    });
    return { updated: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, runPath);
  }
}

async function loadUserInventory() {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !window.KnivesSystem) {
    return { inventory: null, exists: false, cloudSynced: false };
  }
  const uid = currentUser.uid;
  const invPath = `userInventory/${uid}`;
  const invRef = doc(db, 'userInventory', uid);
  let snap;
  try {
    snap = await getDoc(invRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invPath);
  }
  if (!snap || !snap.exists()) {
    return { inventory: null, exists: false, cloudSynced: true };
  }

  const knivesPath = `userInventory/${uid}/knives`;
  let knivesSnap;
  try {
    const q = query(collection(db, 'userInventory', uid, 'knives'), where('uid', '==', uid), limit(200));
    knivesSnap = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, knivesPath);
  }

  const glovesPath = `userInventory/${uid}/gloves`;
  let glovesSnap;
  try {
    const gq = query(collection(db, 'userInventory', uid, 'gloves'), where('uid', '==', uid), limit(200));
    glovesSnap = await getDocs(gq);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, glovesPath);
  }

  const knives = [];
  if (knivesSnap) {
    knivesSnap.forEach((docSnap) => {
      knives.push(window.KnivesSystem.sanitizeKnifeItem(docSnap.data()));
    });
  }
  const gloves = [];
  if (glovesSnap) {
    glovesSnap.forEach((docSnap) => {
      gloves.push(window.KnivesSystem.sanitizeGloveItem(docSnap.data()));
    });
  }
  const data = snap.data();
  const clean = window.KnivesSystem.sanitizeInventory({
    equippedKnifeId: data.equippedKnifeId,
    equippedGloveId: data.equippedGloveId,
    caseCounts: data.caseCounts,
    totalOpened: data.totalOpened,
    lastDailyDropDate: data.lastDailyDropDate,
    knives,
    gloves
  });
  return { inventory: clean, exists: true, cloudSynced: true };
}

async function saveUserInventorySummary(inventory) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !window.KnivesSystem) {
    return { saved: false, reason: !currentUser ? 'signed-out' : 'offline' };
  }
  const uid = currentUser.uid;
  const invPath = `userInventory/${uid}`;
  const invRef = doc(db, 'userInventory', uid);
  const payload = window.KnivesSystem.toCloudInventoryPayload(inventory, uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(invRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invPath);
  }

  if (existingSnap && existingSnap.exists()) {
    try {
      await updateDoc(invRef, {
        equippedKnifeId: payload.equippedKnifeId,
        equippedGloveId: payload.equippedGloveId,
        caseCounts: payload.caseCounts,
        totalOpened: Math.max(payload.totalOpened, existingSnap.data().totalOpened || 0),
        lastDailyDropDate: payload.lastDailyDropDate,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, invPath);
    }
  } else {
    try {
      await setDoc(invRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, invPath);
    }
  }
  return { saved: true };
}

async function saveCloudKnife(knifeItem, fullInventory) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !window.KnivesSystem) {
    return { saved: false };
  }
  // Ensure parent userInventory/{uid} exists first (Master Gate)
  await saveUserInventorySummary(fullInventory);
  const uid = currentUser.uid;
  const payload = window.KnivesSystem.toCloudKnifePayload(knifeItem, uid);
  const knifePath = `userInventory/${uid}/knives/${payload.id}`;
  const knifeRef = doc(db, 'userInventory', uid, 'knives', payload.id);

  try {
    const existingSnap = await getDoc(knifeRef);
    if (existingSnap.exists()) return { saved: true };
    await setDoc(knifeRef, {
      ...payload,
      createdAt: serverTimestamp()
    });
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, knifePath);
  }
}

async function deleteCloudKnife(knifeId) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) return { deleted: false };
  const uid = currentUser.uid;
  const knifePath = `userInventory/${uid}/knives/${knifeId}`;
  const knifeRef = doc(db, 'userInventory', uid, 'knives', knifeId);
  try {
    await deleteDoc(knifeRef);
    return { deleted: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, knifePath);
  }
}

async function saveCloudGlove(gloveItem, fullInventory) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !window.KnivesSystem) {
    return { saved: false };
  }
  // Ensure parent userInventory/{uid} exists first (Master Gate)
  await saveUserInventorySummary(fullInventory);
  const uid = currentUser.uid;
  const payload = window.KnivesSystem.toCloudGlovePayload(gloveItem, uid);
  const glovePath = `userInventory/${uid}/gloves/${payload.id}`;
  const gloveRef = doc(db, 'userInventory', uid, 'gloves', payload.id);

  try {
    const existingSnap = await getDoc(gloveRef);
    if (existingSnap.exists()) return { saved: true };
    await setDoc(gloveRef, {
      ...payload,
      createdAt: serverTimestamp()
    });
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, glovePath);
  }
}

async function deleteCloudGlove(gloveId) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) return { deleted: false };
  const uid = currentUser.uid;
  const glovePath = `userInventory/${uid}/gloves/${gloveId}`;
  const gloveRef = doc(db, 'userInventory', uid, 'gloves', gloveId);
  try {
    await deleteDoc(gloveRef);
    return { deleted: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, glovePath);
  }
}

async function signInWithGoogle() {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  currentUser = result.user;
  return currentUser;
}

async function signOutUser() {
  await ready;
  if (!auth) return;
  await signOut(auth);
  currentUser = null;
}

window.DailyBackend = {
  ready,
  getState: () => ({ online: isOnline, configured: !!db, user: currentUser, error: initError }),
  onAuthChange: (cb) => {
    authListeners.add(cb);
    cb(currentUser);
    return () => authListeners.delete(cb);
  },
  signInWithGoogle,
  signOutUser,
  ensureDailyCourseRegistered,
  fetchDailyArchive,
  fetchLeaderboard,
  submitDailyRun,
  loadUserSettings,
  saveUserSettings,
  syncDisplayNameToRun,
  loadUserInventory,
  saveUserInventorySummary,
  saveCloudKnife,
  deleteCloudKnife,
  saveCloudGlove,
  deleteCloudGlove
};
window.dispatchEvent(new Event('daily-backend-ready'));
