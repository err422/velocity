// Secret Dev Sandbox Mode: non-destructive unlock-all progression, scorestreak tester, and solo combat cheats.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DevMode = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  const SNAPSHOT_STORAGE_KEY = 'velocity_dev_profile_snapshot_v1';
  const SESSION_ACTIVE_KEY = 'velocity_dev_mode_active_v1';
  const DEV_COINS = 9999999;
  const DEV_MAX_XP = 99999;

  function resolveStorage(storage) {
    if (storage && typeof storage.getItem === 'function') return storage;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (_) {}
    return null;
  }

  function isDevUrl(search) {
    const s = typeof search === 'string'
      ? search
      : (root.location && typeof root.location.search === 'string' ? root.location.search : '');
    if (!s) return false;
    try {
      const sp = new URLSearchParams(s);
      const v = sp.get('dev');
      return v === '1' || v === 'true' || v === 'on';
    } catch (_) {
      return false;
    }
  }

  function canUseCombatCheats(netState) {
    if (!netState) return true;
    return !Boolean(netState.isOnline);
  }

  function getSnapshotKeys(KS, LS) {
    const keys = [];
    if (KS) {
      for (const k of [KS.STORAGE_KEY, KS.BACKUP_STORAGE_KEY, KS.SOLD_IDS_STORAGE_KEY, KS.DIRTY_STORAGE_KEY]) {
        if (k) keys.push(k);
      }
    }
    if (LS) {
      for (const k of [LS.STORAGE_KEY, LS.BACKUP_STORAGE_KEY]) {
        if (k) keys.push(k);
      }
    }
    return keys;
  }

  function createProfileSnapshot(storage, keys) {
    const store = resolveStorage(storage);
    const snap = {};
    if (!store || !Array.isArray(keys)) return snap;
    for (const k of keys) {
      try { snap[k] = store.getItem(k); } catch (_) { snap[k] = null; }
    }
    return snap;
  }

  function restoreProfileSnapshot(storage, snapshot) {
    const store = resolveStorage(storage);
    if (!store || !snapshot || typeof snapshot !== 'object') return false;
    for (const k of Object.keys(snapshot)) {
      try {
        if (snapshot[k] === null || snapshot[k] === undefined) store.removeItem(k);
        else store.setItem(k, String(snapshot[k]));
      } catch (_) {}
    }
    return true;
  }

  /**
   * Pure builder: maxes all 19 weapons to Lv. 12 (all attachments + Apex mods unlocked)
   * and optionally maxes all camo challenges (Base + Gold + Diamond + Dark Matter).
   */
  function buildMaxedLoadoutsState(baseState, LS, opts) {
    const options = opts || {};
    const maxXp = options.maxXp !== false;
    const maxCamos = options.maxCamos !== false;
    const clean = LS.sanitizeLoadoutState(baseState);
    const next = JSON.parse(JSON.stringify(clean));

    if (maxXp) {
      for (const wid of LS.WEAPON_IDS) {
        next.weaponXp[wid] = Math.max(next.weaponXp[wid] || 0, DEV_MAX_XP);
      }
    }
    if (maxCamos) {
      for (const wid of LS.WEAPON_IDS) {
        if (!next.camoProgress[wid]) next.camoProgress[wid] = {};
        for (const ch of LS.CAMO_CHALLENGES) {
          const cur = Number(next.camoProgress[wid][ch.id]) || 0;
          next.camoProgress[wid][ch.id] = Math.max(cur, ch.target);
        }
      }
    }
    return LS.sanitizeLoadoutState(next);
  }

  /**
   * Pure builder: grants Factory New copies of every knife type x skin, every glove type x skin,
   * and every non-camo weapon skin across all 19 weapons, plus max coins.
   */
  function buildUnlockedInventory(baseInv, KS, opts) {
    const options = opts || {};
    const grantItems = options.grantItems !== false;
    const grantCoins = options.grantCoins !== false;
    const clean = KS.sanitizeInventory(baseInv);
    const next = JSON.parse(JSON.stringify(clean));

    if (grantCoins) {
      next.coins = DEV_COINS;
    }

    if (grantItems) {
      const now = Date.now();
      const haveKnife = new Set((next.knives || []).map((k) => `${k.knifeType}:${k.skinId}`));
      const haveGlove = new Set((next.gloves || []).map((g) => `${g.gloveType}:${g.skinId}`));
      const haveWeapon = new Set((next.weapons || []).map((w) => `${w.weaponType}:${w.skinId}`));

      // All knife types x all knife skins (Factory New, clean Blue Gem / Fade seed)
      let seq = 1;
      for (const kt of KS.KNIFE_TYPE_IDS) {
        for (const sid of Object.keys(KS.SKINS)) {
          if (sid === 'default_steel') continue;
          const key = `${kt}:${sid}`;
          if (haveKnife.has(key)) continue;
          haveKnife.add(key);
          next.knives.push({
            id: `dev_k_${kt}_${sid}`,
            itemKind: 'knife',
            knifeType: kt,
            skinId: sid,
            floatValue: 0.004,
            patternSeed: sid === 'case_hardened' ? 661 : (seq * 37) % 1000,
            unboxedAt: now - seq
          });
          seq++;
        }
      }

      // All glove types x all glove skins
      for (const gt of KS.GLOVE_TYPE_IDS) {
        for (const sid of KS.GLOVE_SKIN_IDS) {
          if (sid === 'tactical_slate') continue;
          const key = `${gt}:${sid}`;
          if (haveGlove.has(key)) continue;
          haveGlove.add(key);
          next.gloves.push({
            id: `dev_g_${gt}_${sid}`,
            itemKind: 'glove',
            gloveType: gt,
            skinId: sid,
            floatValue: 0.006,
            patternSeed: (seq * 53) % 1000,
            unboxedAt: now - seq
          });
          seq++;
        }
      }

      // All 19 weapons x all non-camo weapon skins (camos live in Gunsmith Camo Challenges)
      const caseWeaponSkins = KS.WEAPON_SKIN_IDS.filter((sid) => sid !== 'factory_slate' && !sid.startsWith('camo_'));
      for (const wt of KS.WEAPON_TYPE_IDS) {
        for (const sid of caseWeaponSkins) {
          const key = `${wt}:${sid}`;
          if (haveWeapon.has(key)) continue;
          haveWeapon.add(key);
          next.weapons.push({
            id: `dev_w_${wt}_${sid}`,
            itemKind: 'weapon',
            weaponType: wt,
            skinId: sid,
            floatValue: 0.005,
            patternSeed: (seq * 41) % 1000,
            unboxedAt: now - seq
          });
          seq++;
        }
      }
    }

    return KS.sanitizeInventory(next);
  }

  // ---------- Browser Runtime Controller ----------
  let initialized = false;
  let active = false;
  let panelOpen = false;
  const cheats = {
    godMode: false,
    infiniteAmmo: false,
    zeroCooldowns: false
  };

  let logoTapCount = 0;
  let logoTapLastMs = 0;
  let keyBuffer = '';
  let els = null;

  function queryElements() {
    if (typeof document === 'undefined') return null;
    return {
      toggleBtn: document.getElementById('devFloatingToggle'),
      drawer: document.getElementById('devDrawer'),
      closeBtn: document.getElementById('devCloseBtn'),
      statusBadge: document.getElementById('devStatusBadge'),
      unlockAllBtn: document.getElementById('devUnlockAllBtn'),
      maxXpBtn: document.getElementById('devMaxXpBtn'),
      allCamosBtn: document.getElementById('devAllCamosBtn'),
      allSkinsBtn: document.getElementById('devAllSkinsBtn'),
      addCoinsBtn: document.getElementById('devAddCoinsBtn'),
      chargeStreakBtn: document.getElementById('devChargeStreakBtn'),
      streakBtns: document.querySelectorAll('[data-dev-streak]'),
      godToggle: document.getElementById('devGodToggle'),
      ammoToggle: document.getElementById('devAmmoToggle'),
      cdToggle: document.getElementById('devCdToggle'),
      healBtn: document.getElementById('devHealBtn'),
      boostBtn: document.getElementById('devBoostBtn'),
      reactiveBtns: document.querySelectorAll('[data-dev-reactive]'),
      exitBtn: document.getElementById('devExitBtn')
    };
  }

  function toast(msg) {
    if (typeof root.showToast === 'function') root.showToast(msg);
  }

  function refreshAllGameUi() {
    try {
      if (typeof root.updateArmoryBadges === 'function') root.updateArmoryBadges();
      if (typeof root.updateArmorySyncLabel === 'function') {
        root.updateArmorySyncLabel(active ? 'DEV SANDBOX · LOCAL ONLY' : undefined);
      }
      if (typeof root.updateLoadoutsSyncLabel === 'function') {
        root.updateLoadoutsSyncLabel(active ? 'DEV SANDBOX · LOCAL ONLY' : undefined);
      }
      if (typeof root.renderQuickLoadoutStrips === 'function') root.renderQuickLoadoutStrips();
      if (typeof root.applyActiveLoadoutToRuntime === 'function') {
        root.applyActiveLoadoutToRuntime({ keepSlot: true });
      }
      const armEl = document.getElementById('armoryPanel');
      if (armEl && armEl.style.display !== 'none') {
        if (typeof root.renderArmoryCases === 'function') root.renderArmoryCases();
        if (typeof root.renderArmoryInventory === 'function') root.renderArmoryInventory();
      }
      const ldEl = document.getElementById('loadoutsPanel');
      if (ldEl && ldEl.style.display !== 'none') {
        const gsEl = document.getElementById('gunsmithView');
        if (gsEl && gsEl.style.display !== 'none' && typeof root.renderGunsmith === 'function') {
          root.renderGunsmith();
        } else if (typeof root.renderLoadoutsOverview === 'function') {
          root.renderLoadoutsOverview();
        }
      }
    } catch (err) {
      console.warn('DevMode UI refresh warning:', err);
    }
  }

  function ensureSnapshotSaved() {
    const store = resolveStorage();
    if (!store) return;
    try {
      if (!store.getItem(SNAPSHOT_STORAGE_KEY)) {
        const keys = getSnapshotKeys(root.KnivesSystem, root.LoadoutsSystem);
        const snap = createProfileSnapshot(store, keys);
        store.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snap));
      }
    } catch (err) {
      console.warn('DevMode snapshot error:', err);
    }
  }

  function syncDrawerUi() {
    if (!els) return;
    if (els.toggleBtn) {
      els.toggleBtn.style.display = active ? 'inline-flex' : 'none';
      els.toggleBtn.classList.toggle('open', panelOpen);
    }
    if (els.drawer) {
      els.drawer.style.display = active && panelOpen ? 'flex' : 'none';
      els.drawer.setAttribute('aria-hidden', active && panelOpen ? 'false' : 'true');
    }
    if (els.statusBadge) {
      const online = root.NetcodeSystem && root.NetcodeSystem.getState().isOnline;
      els.statusBadge.textContent = online ? 'SANDBOX · CHEATS LOCKED IN ONLINE PVP' : 'SANDBOX ACTIVE · CLOUD SYNC PAUSED';
    }
    if (els.godToggle) {
      els.godToggle.classList.toggle('active', cheats.godMode);
      els.godToggle.setAttribute('aria-pressed', cheats.godMode ? 'true' : 'false');
    }
    if (els.ammoToggle) {
      els.ammoToggle.classList.toggle('active', cheats.infiniteAmmo);
      els.ammoToggle.setAttribute('aria-pressed', cheats.infiniteAmmo ? 'true' : 'false');
    }
    if (els.cdToggle) {
      els.cdToggle.classList.toggle('active', cheats.zeroCooldowns);
      els.cdToggle.setAttribute('aria-pressed', cheats.zeroCooldowns ? 'true' : 'false');
    }
  }

  function activate(openDrawerNow) {
    ensureSnapshotSaved();
    active = true;
    root.VELOCITY_TEST_MODE = true;
    try { sessionStorage.setItem(SESSION_ACTIVE_KEY, '1'); } catch (_) {}
    if (openDrawerNow !== false) panelOpen = true;
    // Exit pointer lock cleanly so mouse can click Dev buttons on desktop
    if (panelOpen && typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    syncDrawerUi();
    refreshAllGameUi();
    toast('SECRET DEV SANDBOX ENABLED · PROFILE SNAPSHOTTED');
  }

  function deactivate() {
    active = false;
    panelOpen = false;
    cheats.godMode = false;
    cheats.infiniteAmmo = false;
    cheats.zeroCooldowns = false;
    root.VELOCITY_TEST_MODE = false;
    try { sessionStorage.removeItem(SESSION_ACTIVE_KEY); } catch (_) {}

    const store = resolveStorage();
    if (store) {
      try {
        const raw = store.getItem(SNAPSHOT_STORAGE_KEY);
        if (raw) {
          restoreProfileSnapshot(store, JSON.parse(raw));
          store.removeItem(SNAPSHOT_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('DevMode restore error:', err);
      }
    }
    if (root.KnivesSystem) root.activeInventory = root.KnivesSystem.loadLocal();
    if (root.LoadoutsSystem) root.activeLoadouts = root.LoadoutsSystem.loadLocal();
    if (root.CombatSystem && typeof root.CombatSystem.devSetReactiveStreak === 'function') {
      root.CombatSystem.devSetReactiveStreak(0);
    }
    syncDrawerUi();
    refreshAllGameUi();
    toast('DEV MODE OFF · ORIGINAL PROFILE RESTORED');
  }

  function togglePanel(forceOpen) {
    if (!active) {
      activate(true);
      return;
    }
    panelOpen = typeof forceOpen === 'boolean' ? forceOpen : !panelOpen;
    if (panelOpen && typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    syncDrawerUi();
  }

  function maxAllWeapons() {
    if (!active) activate(true);
    if (!root.LoadoutsSystem) return;
    const next = buildMaxedLoadoutsState(root.activeLoadouts, root.LoadoutsSystem, { maxXp: true, maxCamos: false });
    root.activeLoadouts = root.LoadoutsSystem.saveLocal(next);
    refreshAllGameUi();
    toast('DEV: ALL 19 WEAPONS MAXED TO LV. 12 (ALL ATTACHMENTS)');
  }

  function unlockAllCamos() {
    if (!active) activate(true);
    if (!root.LoadoutsSystem) return;
    const next = buildMaxedLoadoutsState(root.activeLoadouts, root.LoadoutsSystem, { maxXp: false, maxCamos: true });
    root.activeLoadouts = root.LoadoutsSystem.saveLocal(next);
    refreshAllGameUi();
    toast('DEV: ALL BASE, GOLD, DIAMOND & DARK MATTER CAMOS UNLOCKED');
  }

  function grantAllArmoryItems() {
    if (!active) activate(true);
    if (!root.KnivesSystem) return;
    const next = buildUnlockedInventory(root.activeInventory, root.KnivesSystem, { grantItems: true, grantCoins: true });
    root.activeInventory = root.KnivesSystem.saveLocal(next);
    root.KnivesSystem.setLocalDirty(false);
    refreshAllGameUi();
    toast('DEV: ALL KNIVES, GLOVES, WEAPON SKINS & 9.9M COINS GRANTED');
  }

  function grantCoins(amount) {
    if (!active) activate(true);
    if (!root.KnivesSystem || !root.activeInventory) return;
    const add = Number(amount) || 100000;
    root.activeInventory.coins = Math.min(DEV_COINS, (root.activeInventory.coins || 0) + add);
    root.activeInventory = root.KnivesSystem.saveLocal(root.activeInventory);
    root.KnivesSystem.setLocalDirty(false);
    refreshAllGameUi();
    toast(`DEV: +${add.toLocaleString()} COINS`);
  }

  function unlockEverything() {
    if (!active) activate(true);
    if (root.LoadoutsSystem) {
      const nextLd = buildMaxedLoadoutsState(root.activeLoadouts, root.LoadoutsSystem, { maxXp: true, maxCamos: true });
      root.activeLoadouts = root.LoadoutsSystem.saveLocal(nextLd);
    }
    if (root.KnivesSystem) {
      const nextInv = buildUnlockedInventory(root.activeInventory, root.KnivesSystem, { grantItems: true, grantCoins: true });
      root.activeInventory = root.KnivesSystem.saveLocal(nextInv);
      root.KnivesSystem.setLocalDirty(false);
    }
    refreshAllGameUi();
    toast('DEV: EVERYTHING UNLOCKED (LV.12 + DARK MATTER + ALL SKINS + 9.9M C)');
  }

  function ensureSoloCheatsAllowed() {
    const ns = root.NetcodeSystem ? root.NetcodeSystem.getState() : null;
    if (!canUseCombatCheats(ns)) {
      toast('COMBAT CHEATS DISABLED IN ONLINE PVP');
      return false;
    }
    return true;
  }

  function chargeScorestreak(streakId) {
    if (!active) activate(true);
    if (!ensureSoloCheatsAllowed()) return;
    if (!root.CombatSystem || typeof root.CombatSystem.devChargeScorestreak !== 'function') return;
    const info = root.CombatSystem.devChargeScorestreak(streakId);
    if (info) {
      toast(`DEV: ${String(info.name || 'SCORESTREAK').toUpperCase()} 100% READY (PRESS 5 / STREAK)`);
    }
  }

  function setCheat(name, val) {
    if (!Object.prototype.hasOwnProperty.call(cheats, name)) return false;
    if (val && !ensureSoloCheatsAllowed()) {
      cheats[name] = false;
      syncDrawerUi();
      return false;
    }
    cheats[name] = Boolean(val);
    if (name === 'infiniteAmmo' && cheats.infiniteAmmo && root.CombatSystem && typeof root.CombatSystem.devFullAmmo === 'function') {
      root.CombatSystem.devFullAmmo();
    }
    syncDrawerUi();
    const labelMap = { godMode: 'GOD MODE', infiniteAmmo: 'INFINITE AMMO', zeroCooldowns: 'ZERO COOLDOWNS' };
    toast(`DEV: ${labelMap[name]} ${cheats[name] ? 'ON' : 'OFF'}`);
    return cheats[name];
  }

  function isCombatCheatActive(name) {
    if (!active || !cheats[name]) return false;
    const ns = root.NetcodeSystem ? root.NetcodeSystem.getState() : null;
    return canUseCombatCheats(ns);
  }

  function setReactiveStreak(kills) {
    if (!active) activate(true);
    if (root.CombatSystem && typeof root.CombatSystem.devSetReactiveStreak === 'function') {
      root.CombatSystem.devSetReactiveStreak(Number(kills) || 0);
      toast(`DEV: REACTIVE SKIN STREAK SET TO ${Number(kills) || 0} KILLS`);
    }
  }

  function healLocal() {
    if (!active) activate(true);
    if (!ensureSoloCheatsAllowed()) return;
    if (root.NetcodeSystem && typeof root.NetcodeSystem.devHealLocal === 'function') {
      root.NetcodeSystem.devHealLocal();
      toast('DEV: HEALTH RESTORED TO 100');
    }
  }

  function boostVelocity() {
    if (!active) activate(true);
    if (!ensureSoloCheatsAllowed()) return;
    if (typeof root.devBoostPlayerVelocity === 'function') {
      root.devBoostPlayerVelocity(18);
      toast('DEV: VELOCITY BOOST +18 U/S');
    }
  }

  function handleLogoTap() {
    const now = performance.now();
    if (now - logoTapLastMs > 2500) logoTapCount = 0;
    logoTapLastMs = now;
    logoTapCount += 1;
    if (logoTapCount >= 5) {
      logoTapCount = 0;
      togglePanel(true);
    }
  }

  function bindEvents() {
    if (typeof document === 'undefined') return;

    // Secret trigger 1: Ctrl+Shift+D anywhere, or typing "veldev" when not in a text field
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.code === 'KeyD' || e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        togglePanel();
        return;
      }
      if (e.code === 'Backquote' && active) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          togglePanel();
          return;
        }
      }
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (typeof e.key === 'string' && e.key.length === 1 && /[a-z]/i.test(e.key)) {
        keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-8);
        if (keyBuffer.endsWith('veldev')) {
          keyBuffer = '';
          togglePanel(true);
        }
      }
    });

    // Secret trigger 2: Tap/click the VELOCITY brand logo 5 times rapidly (works on Phone, iPad & Desktop!)
    document.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (!target || !target.closest) return;
      if (target.closest('.menu-brand, .menu-brand-mark, .menu-brand-name, .spatial-brand, .spatial-brand-mark, .logo')) {
        handleLogoTap();
      }
    }, true);

    if (!els) return;
    if (els.toggleBtn) els.toggleBtn.addEventListener('click', () => togglePanel());
    if (els.closeBtn) els.closeBtn.addEventListener('click', () => togglePanel(false));
    if (els.unlockAllBtn) els.unlockAllBtn.addEventListener('click', () => unlockEverything());
    if (els.maxXpBtn) els.maxXpBtn.addEventListener('click', () => maxAllWeapons());
    if (els.allCamosBtn) els.allCamosBtn.addEventListener('click', () => unlockAllCamos());
    if (els.allSkinsBtn) els.allSkinsBtn.addEventListener('click', () => grantAllArmoryItems());
    if (els.addCoinsBtn) els.addCoinsBtn.addEventListener('click', () => grantCoins(100000));
    if (els.chargeStreakBtn) els.chargeStreakBtn.addEventListener('click', () => chargeScorestreak());
    if (els.streakBtns) {
      els.streakBtns.forEach((btn) => {
        btn.addEventListener('click', () => chargeScorestreak(btn.dataset.devStreak));
      });
    }
    if (els.godToggle) els.godToggle.addEventListener('click', () => setCheat('godMode', !cheats.godMode));
    if (els.ammoToggle) els.ammoToggle.addEventListener('click', () => setCheat('infiniteAmmo', !cheats.infiniteAmmo));
    if (els.cdToggle) els.cdToggle.addEventListener('click', () => setCheat('zeroCooldowns', !cheats.zeroCooldowns));
    if (els.healBtn) els.healBtn.addEventListener('click', () => healLocal());
    if (els.boostBtn) els.boostBtn.addEventListener('click', () => boostVelocity());
    if (els.reactiveBtns) {
      els.reactiveBtns.forEach((btn) => {
        btn.addEventListener('click', () => setReactiveStreak(Number(btn.dataset.devReactive) || 0));
      });
    }
    if (els.exitBtn) els.exitBtn.addEventListener('click', () => deactivate());
  }

  function init() {
    if (initialized) return;
    initialized = true;
    els = queryElements();
    bindEvents();

    let restoredSession = false;
    try { restoredSession = sessionStorage.getItem(SESSION_ACTIVE_KEY) === '1'; } catch (_) {}
    if (isDevUrl() || restoredSession) {
      activate(isDevUrl());
    } else {
      syncDrawerUi();
    }
  }

  return {
    SNAPSHOT_STORAGE_KEY,
    DEV_COINS,
    DEV_MAX_XP,
    isDevUrl,
    canUseCombatCheats,
    getSnapshotKeys,
    createProfileSnapshot,
    restoreProfileSnapshot,
    buildMaxedLoadoutsState,
    buildUnlockedInventory,
    init,
    activate,
    deactivate,
    togglePanel,
    unlockEverything,
    maxAllWeapons,
    unlockAllCamos,
    grantAllArmoryItems,
    grantCoins,
    chargeScorestreak,
    setCheat,
    getCheat: (name) => Boolean(cheats[name]),
    isCombatCheatActive,
    setReactiveStreak,
    healLocal,
    boostVelocity,
    isActive: () => active,
    isPanelOpen: () => panelOpen
  };
});
