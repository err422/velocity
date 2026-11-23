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

  const weaponsPath = `userInventory/${uid}/weapons`;
  let weaponsSnap;
  try {
    const wq = query(collection(db, 'userInventory', uid, 'weapons'), where('uid', '==', uid), limit(250));
    weaponsSnap = await getDocs(wq);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, weaponsPath);
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
        equippedRifleId: payload.equippedRifleId,
        equippedAwpId: payload.equippedAwpId,
        equippedDeagleId: payload.equippedDeagleId,
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

async function saveCloudWeapon(weaponItem, fullInventory) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !window.KnivesSystem) {
    return { saved: false };
  }
  await saveUserInventorySummary(fullInventory);
  const uid = currentUser.uid;
  const payload = window.KnivesSystem.toCloudWeaponPayload(weaponItem, uid);
  const weaponPath = `userInventory/${uid}/weapons/${payload.id}`;
  const weaponRef = doc(db, 'userInventory', uid, 'weapons', payload.id);

  try {
    const existingSnap = await getDoc(weaponRef);
    if (existingSnap.exists()) return { saved: true };
    await setDoc(weaponRef, {
      ...payload,
      createdAt: serverTimestamp()
    });
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, weaponPath);
  }
}

async function deleteCloudWeapon(weaponId) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) return { deleted: false };
  const uid = currentUser.uid;
  const weaponPath = `userInventory/${uid}/weapons/${weaponId}`;
  const weaponRef = doc(db, 'userInventory', uid, 'weapons', weaponId);
  try {
    await deleteDoc(weaponRef);
    return { deleted: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, weaponPath);
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
  if (!db || !currentUser || !currentUser.emailVerified) {
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

async function createLobby(opts) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) {
    throw new Error('Sign in with a verified Google account to host a server.');
  }
  const mode = opts && opts.mode === 'ffa_4p' ? 'ffa_4p' : 'duel_1v1';
  const mapId = opts && opts.mapId === 'arena_surf' ? 'arena_surf' : 'arena_aim';
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
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId) return;
  const ref = doc(db, 'lobbies', lobbyId);
  const body = { heartbeatAt: serverTimestamp() };
  if (patch && typeof patch.playerCount === 'number') body.playerCount = Math.max(1, Math.min(4, Math.floor(patch.playerCount)));
  if (patch && typeof patch.status === 'string') body.status = patch.status;
  if (patch && typeof patch.mapId === 'string') body.mapId = patch.mapId;
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
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId) return;
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
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId) return null;
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
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId) return () => {};
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
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId || !peerUid) return () => {};
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
  if (!db || !currentUser || !currentUser.emailVerified) {
    throw new Error('Sign in with a verified Google account to join a server.');
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
  if (!db || !currentUser || !currentUser.emailVerified) return;
  const peerUid = currentUser.uid;
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  try {
    await updateDoc(ref, {
      offerCandidates: Array.isArray(offerCandidates) ? offerCandidates.slice(0, 30) : [],
      state: 'offering',
      updatedAt: serverTimestamp()
    });
  } catch (_) {}
}

async function writePeerAnswer(lobbyId, peerUid, answerSdp, answerCandidates) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified) return;
  const ref = doc(db, 'lobbies', lobbyId, 'peers', peerUid);
  try {
    await updateDoc(ref, {
      answerSdp: String(answerSdp || '').slice(0, 16384),
      answerCandidates: Array.isArray(answerCandidates) ? answerCandidates.slice(0, 30) : [],
      state: 'answered',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('writePeerAnswer failed:', error);
  }
}

async function deletePeerDoc(lobbyId, peerUid) {
  await ready;
  if (!db || !currentUser || !currentUser.emailVerified || !lobbyId || !peerUid) return;
  try {
    await deleteDoc(doc(db, 'lobbies', lobbyId, 'peers', peerUid));
  } catch (_) {}
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
  deleteCloudGlove,
  saveCloudWeapon,
  deleteCloudWeapon,
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
