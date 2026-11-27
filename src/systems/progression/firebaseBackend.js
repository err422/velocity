// Firebase Firestore & Multi-Provider Auth (Email/Password, Private Guest, Google) for VELOCITY.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  linkWithCredential,
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
  onSnapshot,
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
let inventorySummaryChain = Promise.resolve();
let knownParentInventoryUid = null;
let loadoutsSaveChain = Promise.resolve();
let knownLoadoutsUid = null;
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

function isCloudAuthenticated(user = currentUser) {
  return Boolean(user && typeof user.uid === 'string' && user.uid.length > 0);
}

function notifyAuthListeners() {
  authListeners.forEach((cb) => {
    try {
      cb(currentUser);
    } catch (err) {
      console.error(err);
    }
  });
}

function sanitizeDisplayName(user) {
  if (window.VelocitySettings && typeof window.VelocitySettings.resolveEffectiveDisplayName === 'function') {
    const resolved = window.VelocitySettings.resolveEffectiveDisplayName(window.activeSettings, user);
    return String(resolved).trim().slice(0, 40) || 'Runner';
  }
  if (user && user.isAnonymous && !user.displayName && !user.email) {
    const tail = String(user.uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    return tail.length === 4 ? `Guest-${tail}` : 'Guest';
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
    const configUrl = new URL('../../../firebase-applet-config.json', import.meta.url).href;
    const res = await fetch(configUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load firebase-applet-config.json (${res.status})`);
    const firebaseConfig = await res.json();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
      if (!user || user.uid !== knownParentInventoryUid) {
        knownParentInventoryUid = null;
      }
      if (!user || user.uid !== knownLoadoutsUid) {
        knownLoadoutsUid = null;
      }
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
  if (!isCloudAuthenticated(user)) {
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

  // Authenticated players (Email, Private Guest, or Google) may register a new daily course doc
  if (isCloudAuthenticated(currentUser)) {
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
  if (!isCloudAuthenticated(currentUser)) return { submitted: false, reason: 'signed-out' };

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
  if (!db || !isCloudAuthenticated(currentUser)) {
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
  if (!db || !isCloudAuthenticated(currentUser)) {
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
  if (!db || !isCloudAuthenticated(currentUser)) return { updated: false };

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
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return {
      inventory: null,
      exists: false,
      cloudSynced: false,
      knivesLoaded: false,
      glovesLoaded: false,
      weaponsLoaded: false,
      partial: false
    };
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
    return {
      inventory: null,
      exists: false,
      cloudSynced: true,
      knivesLoaded: true,
      glovesLoaded: true,
      weaponsLoaded: true,
      partial: false
    };
  }
  knownParentInventoryUid = uid;

  let knivesSnap = null;
  let knivesLoaded = false;
  try {
    const q = query(collection(db, 'userInventory', uid, 'knives'), where('uid', '==', uid), limit(500));
    knivesSnap = await getDocs(q);
    knivesLoaded = true;
  } catch (error) {
    console.warn('Cloud knives inventory could not be loaded; preserving local knives:', error);
  }

  let glovesSnap = null;
  let glovesLoaded = false;
  try {
    const gq = query(collection(db, 'userInventory', uid, 'gloves'), where('uid', '==', uid), limit(500));
    glovesSnap = await getDocs(gq);
    glovesLoaded = true;
  } catch (error) {
    console.warn('Cloud gloves inventory could not be loaded; preserving local gloves:', error);
  }

  let weaponsSnap = null;
  let weaponsLoaded = false;
  try {
    const wq = query(collection(db, 'userInventory', uid, 'weapons'), where('uid', '==', uid), limit(500));
    weaponsSnap = await getDocs(wq);
    weaponsLoaded = true;
  } catch (error) {
    console.warn('Cloud weapons inventory could not be loaded; preserving local weapons:', error);
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
  const weapons = [];
  if (weaponsSnap) {
    weaponsSnap.forEach((docSnap) => {
      weapons.push(window.KnivesSystem.sanitizeWeaponItem(docSnap.data()));
    });
  }
  const data = snap.data();
  const clean = window.KnivesSystem.sanitizeInventory({
    coins: data.coins,
    equippedKnifeId: data.equippedKnifeId,
    equippedGloveId: data.equippedGloveId,
    equippedRifleId: data.equippedRifleId,
    equippedAwpId: data.equippedAwpId,
    equippedDeagleId: data.equippedDeagleId,
    caseCounts: data.caseCounts,
    totalOpened: data.totalOpened,
    lastDailyDropDate: data.lastDailyDropDate,
    knives,
    gloves,
    weapons
  });
  return {
    inventory: clean,
    exists: true,
    cloudSynced: true,
    knivesLoaded,
    glovesLoaded,
    weaponsLoaded,
    partial: !(knivesLoaded && glovesLoaded && weaponsLoaded)
  };
}

async function writeUserInventorySummaryLocked(inventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
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
      const existingData = existingSnap.data() || {};
      const existingOpened = Number.isFinite(Number(existingData.totalOpened))
        ? Math.max(0, Math.min(99999, Math.floor(Number(existingData.totalOpened))))
        : 0;
      await updateDoc(invRef, {
        coins: payload.coins,
        equippedKnifeId: payload.equippedKnifeId,
        equippedGloveId: payload.equippedGloveId,
        equippedRifleId: payload.equippedRifleId,
        equippedAwpId: payload.equippedAwpId,
        equippedDeagleId: payload.equippedDeagleId,
        caseCounts: payload.caseCounts,
        totalOpened: Math.max(payload.totalOpened, existingOpened),
        lastDailyDropDate: payload.lastDailyDropDate,
        updatedAt: serverTimestamp()
      });
      knownParentInventoryUid = uid;
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
      knownParentInventoryUid = uid;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, invPath);
    }
  }
  return { saved: true };
}

function saveUserInventorySummary(inventory) {
  const run = inventorySummaryChain.then(
    () => writeUserInventorySummaryLocked(inventory),
    () => writeUserInventorySummaryLocked(inventory)
  );
  inventorySummaryChain = run.catch(() => {});
  return run;
}

async function ensureParentInventoryDoc(fullInventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return false;
  }
  if (knownParentInventoryUid === currentUser.uid) {
    return true;
  }
  const res = await saveUserInventorySummary(fullInventory);
  return Boolean(res && res.saved);
}

async function saveCloudSubcollectionItem(subcollection, itemPayload, fullInventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return { saved: false };
  }
  const parentReady = await ensureParentInventoryDoc(fullInventory);
  if (!parentReady) return { saved: false };

  const uid = currentUser.uid;
  const itemPath = `userInventory/${uid}/${subcollection}/${itemPayload.id}`;
  const itemRef = doc(db, 'userInventory', uid, subcollection, itemPayload.id);

  try {
    const existingSnap = await getDoc(itemRef);
    if (existingSnap.exists()) return { saved: true };
  } catch (_) {
    // Proceed directly to create; allow update:false protects existing immutable docs.
  }

  try {
    await setDoc(itemRef, {
      ...itemPayload,
      createdAt: serverTimestamp()
    });
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, itemPath);
  }
}

async function deleteCloudSubcollectionItem(subcollection, itemId) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) return { deleted: false };
  const uid = currentUser.uid;
  const itemPath = `userInventory/${uid}/${subcollection}/${itemId}`;
  const itemRef = doc(db, 'userInventory', uid, subcollection, itemId);
  try {
    const existingSnap = await getDoc(itemRef);
    if (!existingSnap.exists()) return { deleted: true };
  } catch (_) {
    // Continue to deleteDoc attempt
  }
  try {
    await deleteDoc(itemRef);
    return { deleted: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, itemPath);
  }
}

async function saveCloudKnife(knifeItem, fullInventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return { saved: false };
  }
  const payload = window.KnivesSystem.toCloudKnifePayload(knifeItem, currentUser.uid);
  return saveCloudSubcollectionItem('knives', payload, fullInventory);
}

async function deleteCloudKnife(knifeId) {
  return deleteCloudSubcollectionItem('knives', knifeId);
}

async function saveCloudGlove(gloveItem, fullInventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return { saved: false };
  }
  const payload = window.KnivesSystem.toCloudGlovePayload(gloveItem, currentUser.uid);
  return saveCloudSubcollectionItem('gloves', payload, fullInventory);
}

async function deleteCloudGlove(gloveId) {
  return deleteCloudSubcollectionItem('gloves', gloveId);
}

async function saveCloudWeapon(weaponItem, fullInventory) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.KnivesSystem) {
    return { saved: false };
  }
  const payload = window.KnivesSystem.toCloudWeaponPayload(weaponItem, currentUser.uid);
  return saveCloudSubcollectionItem('weapons', payload, fullInventory);
}

async function deleteCloudWeapon(weaponId) {
  return deleteCloudSubcollectionItem('weapons', weaponId);
}

async function updateCloudStatTrakKills(subcollection, itemId, kills) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) return { updated: false };
  if ((subcollection !== 'weapons' && subcollection !== 'knives') || !itemId) return { updated: false };
  const uid = currentUser.uid;
  const cleanKills = Math.max(0, Math.min(999999, Math.floor(Number(kills) || 0)));
  const itemRef = doc(db, 'userInventory', uid, subcollection, itemId);
  try {
    await updateDoc(itemRef, { statTrakKills: cleanKills });
    return { updated: true };
  } catch (error) {
    console.warn('StatTrak cloud sync skipped:', error && error.message ? error.message : error);
    return { updated: false };
  }
}

// ---------- Serverless WebRTC Lobby Directory & Signaling ----------
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length) % chars.length];
  }
  return out;
}

function generateLobbyId(isPrivate, joinCode) {
  if (isPrivate && joinCode) {
    return 'code_' + joinCode;
  }
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let tail = '';
  for (let i = 0; i < 8; i++) {
    tail += chars[Math.floor(Math.random() * chars.length) % chars.length];
  }
  return 'lob_' + Date.now().toString(36) + '_' + tail;
}

function normalizeLobbyDoc(docSnap) {
  const d = docSnap.data();
  const hb = d.heartbeatAt && typeof d.heartbeatAt.toMillis === 'function' ? d.heartbeatAt.toMillis() : Date.now();
  return {
    lobbyId: d.lobbyId || docSnap.id,
    hostUid: d.hostUid,
    hostName: d.hostName || 'Host',
    roomName: d.roomName || 'Velocity Arena',
    mapId: d.mapId || 'arena_aim',
    mode: d.mode || 'duel_1v1',
    maxPlayers: d.maxPlayers || 2,
    playerCount: d.playerCount || 1,
    status: d.status || 'open',
    isPrivate: Boolean(d.isPrivate),
    joinCode: d.joinCode || '',
    heartbeatMs: hb
  };
}

function subscribePublicLobbies(onUpdate, onError) {
  if (!db || !isCloudAuthenticated(currentUser)) {
    if (typeof onUpdate === 'function') onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, 'lobbies'),
    where('isPrivate', '==', false),
    where('status', 'in', ['open', 'in_progress']),
    limit(30)
  );
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const lobbies = [];
      snap.forEach((docSnap) => {
        const item = normalizeLobbyDoc(docSnap);
        // Filter out stale rooms whose host stopped heartbeating > 35s ago
        if (now - item.heartbeatMs <= 35000) {
          lobbies.push(item);
        }
      });
      lobbies.sort((a, b) => b.heartbeatMs - a.heartbeatMs);
      if (typeof onUpdate === 'function') onUpdate(lobbies);
    },
    (error) => {
      if (typeof onError === 'function') onError(error);
      else console.warn('Public lobby subscription error:', error);
    }
  );
}

const VALID_ARENA_IDS = new Set([
  'arena_surf',
  'arena_aim',
  'arena_spire',
  'arena_cargo',
  'arena_skyline',
  'arena_canyon'
]);

async function createLobby(opts) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) {
    throw new Error('Sign in with Email, Google, or Private Guest to host a server.');
  }
  const mode = opts && opts.mode === 'ffa_4p' ? 'ffa_4p' : 'duel_1v1';
  const rawMapId = opts && typeof opts.mapId === 'string' ? opts.mapId : 'arena_surf';
  const mapId = VALID_ARENA_IDS.has(rawMapId) ? rawMapId : 'arena_surf';
  const maxPlayers = mode === 'ffa_4p' ? 4 : 2;
  const isPrivate = Boolean(opts && opts.isPrivate);
  const hostName = sanitizeDisplayName(currentUser).slice(0, 32) || 'Host';
  const rawRoom = String((opts && opts.roomName) || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 32);
  const roomName = rawRoom || `${hostName}'s ${mode === 'ffa_4p' ? 'FFA' : '1v1'}`;

  let joinCode = isPrivate ? generateRoomCode() : '';
  let lobbyId = generateLobbyId(isPrivate, joinCode);

  // If private code collides with an active room, retry a few times
  if (isPrivate) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const checkRef = doc(db, 'lobbies', lobbyId);
      try {
        const existing = await getDoc(checkRef);
        if (!existing.exists()) break;
        joinCode = generateRoomCode();
        lobbyId = generateLobbyId(true, joinCode);
      } catch (_) {
        break;
      }
    }
  }

  const ref = doc(db, 'lobbies', lobbyId);
  const payload = {
    lobbyId,
    hostUid: currentUser.uid,
    hostName,
    roomName,
    mapId,
    mode,
    maxPlayers,
    playerCount: 1,
    status: 'open',
    isPrivate,
    joinCode,
    createdAt: serverTimestamp(),
    heartbeatAt: serverTimestamp()
  };

  try {
    await setDoc(ref, payload);
    return {
      lobbyId,
      hostUid: currentUser.uid,
      hostName,
      roomName,
      mapId,
      mode,
      maxPlayers,
      playerCount: 1,
      status: 'open',
      isPrivate,
      joinCode
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `lobbies/${lobbyId}`);
  }
}

async function updateLobby(lobbyId, patch) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId) return;
  const ref = doc(db, 'lobbies', lobbyId);
  const body = { heartbeatAt: serverTimestamp() };
  if (patch && typeof patch.playerCount === 'number') body.playerCount = Math.max(1, Math.min(4, Math.floor(patch.playerCount)));
  if (patch && typeof patch.status === 'string') body.status = patch.status;
  if (patch && typeof patch.mapId === 'string' && VALID_ARENA_IDS.has(patch.mapId)) body.mapId = patch.mapId;
  if (patch && typeof patch.mode === 'string') {
    body.mode = patch.mode;
    body.maxPlayers = patch.mode === 'ffa_4p' ? 4 : 2;
  }
  try {
    await updateDoc(ref, body);
  } catch (error) {
    console.warn('Lobby update failed:', error);
  }
}

async function closeLobby(lobbyId) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId) return;
  try {
    // Clean up peer docs owned by this lobby first
    const peersQ = query(collection(db, 'lobbies', lobbyId, 'peers'), where('hostUid', '==', currentUser.uid), limit(20));
    const peersSnap = await getDocs(peersQ);
    const deletes = [];
    peersSnap.forEach((pSnap) => deletes.push(deleteDoc(pSnap.ref).catch(() => {})));
    await Promise.all(deletes);
  } catch (_) {}
  try {
    await deleteDoc(doc(db, 'lobbies', lobbyId));
  } catch (_) {}
}

async function getLobbyById(lobbyId) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId) return null;
  try {
    const snap = await getDoc(doc(db, 'lobbies', lobbyId));
    if (!snap.exists()) return null;
    const item = normalizeLobbyDoc(snap);
    if (item.status === 'closed' || Date.now() - item.heartbeatMs > 40000) return null;
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `lobbies/${lobbyId}`);
  }
}

async function findLobbyByCode(rawCode) {
  const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length !== 4) return null;
  return getLobbyById('code_' + code);
}

function subscribeLobbyPeers(lobbyId, onPeers) {
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId) return () => {};
  const q = query(
    collection(db, 'lobbies', lobbyId, 'peers'),
    where('hostUid', '==', currentUser.uid),
    limit(16)
  );
  return onSnapshot(
    q,
    (snap) => {
      const peers = [];
      snap.forEach((pSnap) => peers.push(pSnap.data()));
      if (typeof onPeers === 'function') onPeers(peers);
    },
    (error) => console.warn('Lobby peers snapshot error:', error)
  );
}

function subscribePeerDoc(lobbyId, peerUid, onPeer) {
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId || !peerUid) return () => {};
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  return onSnapshot(
    ref,
    (snap) => {
      if (typeof onPeer === 'function') onPeer(snap.exists() ? snap.data() : null);
    },
    (error) => console.warn('Peer doc snapshot error:', error)
  );
}

async function writePeerOffer(lobbyId, hostUid, offerSdp, offerCandidates) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) {
    throw new Error('Sign in with Email, Google, or Private Guest to join a server.');
  }
  const peerUid = currentUser.uid;
  const displayName = sanitizeDisplayName(currentUser).slice(0, 32) || 'Runner';
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  const cands = Array.isArray(offerCandidates) ? offerCandidates.slice(0, 30) : [];
  try {
    await setDoc(ref, {
      peerUid,
      hostUid,
      displayName,
      offerSdp: String(offerSdp || '').slice(0, 16384),
      answerSdp: '',
      offerCandidates: cands,
      answerCandidates: [],
      state: 'offering',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `lobbies/${lobbyId}/peers/${peerUid}`);
  }
}

async function updatePeerOfferCandidates(lobbyId, offerCandidates) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) return;
  const peerUid = currentUser.uid;
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  try {
    await updateDoc(ref, {
      offerCandidates: Array.isArray(offerCandidates) ? offerCandidates.slice(0, 30) : [],
      state: 'offering',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('updatePeerOfferCandidates failed:', error);
    throw error;
  }
}

async function writePeerAnswer(lobbyId, peerUid, answerSdp, answerCandidates) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) return;
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  try {
    await updateDoc(ref, {
      answerSdp: String(answerSdp || '').slice(0, 16384),
      answerCandidates: Array.isArray(answerCandidates) ? answerCandidates.slice(0, 30) : [],
      state: 'answered',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('writePeerAnswer failed:', error);
    throw error;
  }
}

async function deletePeerDoc(lobbyId, peerUid) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !lobbyId || !peerUid) return;
  try {
    await deleteDoc(doc(db, 'lobbies', lobbyId, 'peers', peerUid));
  } catch (_) {}
}

async function loadUserLoadouts() {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser)) return null;
  const uid = currentUser.uid;
  const ref = doc(db, 'userLoadouts', uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    return {
      activeIndex: data.activeIndex,
      loadouts: data.loadouts,
      weaponXp: data.weaponXp,
      equippedWeaponSkins: data.equippedWeaponSkins,
      camoProgress: data.camoProgress,
      equippedWeaponCamos: data.equippedWeaponCamos
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userLoadouts/${uid}`);
  }
}

async function writeUserLoadoutsLocked(loadoutState) {
  await ready;
  if (!db || !isCloudAuthenticated(currentUser) || !window.LoadoutsSystem) return false;
  const uid = currentUser.uid;
  const loadoutsPath = `userLoadouts/${uid}`;
  const payload = window.LoadoutsSystem.toCloudLoadoutsPayload(loadoutState, uid);
  const ref = doc(db, 'userLoadouts', uid);

  let existing = null;
  try {
    existing = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, loadoutsPath);
  }

  if (existing && existing.exists()) {
    const existingData = existing.data() || {};
    const hasCanonicalMeta = existingData.uid === uid && Boolean(existingData.createdAt);
    const allowedKeys = new Set(['uid', 'activeIndex', 'loadouts', 'weaponXp', 'equippedWeaponSkins', 'camoProgress', 'equippedWeaponCamos', 'createdAt', 'updatedAt']);
    const hasUnexpectedKey = Object.keys(existingData).some((k) => !allowedKeys.has(k));
    if (hasCanonicalMeta && !hasUnexpectedKey) {
      try {
        await updateDoc(ref, {
          activeIndex: payload.activeIndex,
          loadouts: payload.loadouts,
          weaponXp: payload.weaponXp,
          equippedWeaponSkins: payload.equippedWeaponSkins,
          camoProgress: payload.camoProgress,
          equippedWeaponCamos: payload.equippedWeaponCamos,
          updatedAt: serverTimestamp()
        });
        knownLoadoutsUid = uid;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, loadoutsPath);
      }
    } else {
      try {
        await setDoc(ref, {
          ...payload,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        knownLoadoutsUid = uid;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, loadoutsPath);
      }
    }
  } else {
    try {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      knownLoadoutsUid = uid;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, loadoutsPath);
    }
  }
  return true;
}

function saveUserLoadouts(loadoutState) {
  const run = loadoutsSaveChain.then(
    () => writeUserLoadoutsLocked(loadoutState),
    () => writeUserLoadoutsLocked(loadoutState)
  );
  loadoutsSaveChain = run.catch(() => {});
  return run;
}

function makeValidationError(message) {
  const err = new Error(message);
  err.isValidationError = true;
  return err;
}

function validateEmailAndPasswordInput(email, password, isSignUp) {
  const helpers = window.VelocityAuthHelpers;
  if (helpers) {
    const emailRes = helpers.validateEmail(email);
    if (!emailRes.valid) throw makeValidationError(emailRes.error);
    const pwRes = helpers.validatePassword(password, { isSignUp });
    if (!pwRes.valid) throw makeValidationError(pwRes.error);
    return { email: emailRes.email, password: String(password) };
  }
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    throw makeValidationError('Please enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw makeValidationError('Please enter a password.');
  }
  if (isSignUp && password.length < 8) {
    throw makeValidationError('Password must be at least 8 characters.');
  }
  return { email: cleanEmail, password };
}

async function signInWithGoogle() {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  currentUser = result.user;
  notifyAuthListeners();
  return currentUser;
}

async function signUpWithEmail({ email, password, displayName } = {}) {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const creds = validateEmailAndPasswordInput(email, password, true);
  const result = await createUserWithEmailAndPassword(auth, creds.email, creds.password);
  const cleanCallsign = window.VelocityAuthHelpers
    ? window.VelocityAuthHelpers.sanitizeCallsign(displayName || '')
    : String(displayName || '').trim().slice(0, 32);
  if (cleanCallsign) {
    try {
      await updateProfile(result.user, { displayName: cleanCallsign });
    } catch (_) {}
  }
  // Send a non-blocking verification email so users can confirm their address without blocking play
  sendEmailVerification(result.user).catch(() => {});
  currentUser = auth.currentUser || result.user;
  notifyAuthListeners();
  return currentUser;
}

async function signInWithEmail({ email, password } = {}) {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const creds = validateEmailAndPasswordInput(email, password, false);
  const result = await signInWithEmailAndPassword(auth, creds.email, creds.password);
  currentUser = auth.currentUser || result.user;
  notifyAuthListeners();
  return currentUser;
}

async function signInAsGuest(displayName = '') {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const result = await signInAnonymously(auth);
  const guestName = window.VelocityAuthHelpers
    ? window.VelocityAuthHelpers.buildGuestCallsign(displayName, result.user.uid)
    : (String(displayName || '').trim().slice(0, 32) || 'Guest');
  if (guestName) {
    try {
      await updateProfile(result.user, { displayName: guestName });
    } catch (_) {}
  }
  currentUser = auth.currentUser || result.user;
  notifyAuthListeners();
  return currentUser;
}

async function upgradeGuestWithEmail({ email, password, displayName } = {}) {
  await ready;
  if (!auth || !auth.currentUser || !auth.currentUser.isAnonymous) {
    throw makeValidationError('Only Private Guest sessions can be upgraded to an email account.');
  }
  const creds = validateEmailAndPasswordInput(email, password, true);
  const credential = EmailAuthProvider.credential(creds.email, creds.password);
  const result = await linkWithCredential(auth.currentUser, credential);
  const cleanCallsign = window.VelocityAuthHelpers
    ? window.VelocityAuthHelpers.sanitizeCallsign(displayName || '')
    : String(displayName || '').trim().slice(0, 32);
  if (cleanCallsign) {
    try {
      await updateProfile(result.user, { displayName: cleanCallsign });
    } catch (_) {}
  }
  sendEmailVerification(result.user).catch(() => {});
  currentUser = auth.currentUser || result.user;
  notifyAuthListeners();
  return currentUser;
}

async function sendPasswordReset(email) {
  await ready;
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const helpers = window.VelocityAuthHelpers;
  const emailRes = helpers
    ? helpers.validateEmail(email)
    : { valid: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim()), email: String(email || '').trim().toLowerCase(), error: 'Please enter a valid email address.' };
  if (!emailRes.valid) throw makeValidationError(emailRes.error);
  await sendPasswordResetEmail(auth, emailRes.email);
  return { sent: true };
}

async function signOutUser() {
  await ready;
  if (!auth) return;
  await signOut(auth);
  currentUser = null;
  notifyAuthListeners();
}

window.DailyBackend = {
  ready,
  getState: () => ({ online: isOnline, configured: !!db, user: currentUser, error: initError }),
  isSignedIn: () => isCloudAuthenticated(currentUser),
  onAuthChange: (cb) => {
    authListeners.add(cb);
    cb(currentUser);
    return () => authListeners.delete(cb);
  },
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  signInAsGuest,
  upgradeGuestWithEmail,
  sendPasswordReset,
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
  loadUserLoadouts,
  saveUserLoadouts,
  saveCloudKnife,
  deleteCloudKnife,
  saveCloudGlove,
  deleteCloudGlove,
  saveCloudWeapon,
  deleteCloudWeapon,
  updateCloudStatTrakKills,
  subscribePublicLobbies,
  createLobby,
  updateLobby,
  closeLobby,
  getLobbyById,
  findLobbyByCode,
  subscribeLobbyPeers,
  subscribePeerDoc,
  writePeerOffer,
  updatePeerOfferCandidates,
  writePeerAnswer,
  deletePeerDoc
};
window.dispatchEvent(new Event('daily-backend-ready'));
