// First-person combat engine: weapon firing/recoil/reload/scope, hitscan occlusion,
// pooled tracers & shatter bursts, holographic targets (Sandbox Range + Gauntlet courses),
// Solo Arena Warmup hologram bots, and interpolated remote WebRTC player avatars.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CombatSystem = factory(root);
  }
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  const MISSED_TARGET_PENALTY_SEC = 1.0;
  const DUEL_WIN_ROUNDS = 5;
  const FFA_WIN_KILLS = 15;
  const SLOTS = Object.freeze(['primary', 'secondary', 'melee']);

  // ---------- Pure Testable Helpers ----------
  function advanceAdsProgress(progress, adsTarget, dt, duration) {
    const current = Math.max(0, Math.min(1, Number(progress) || 0));
    const deltaTime = Math.max(0, Number(dt) || 0);
    const transitionTime = Math.max(0.08, Number(duration) || 0.20);
    const step = deltaTime / transitionTime;
    return adsTarget
      ? Math.min(1, current + step)
      : Math.max(0, current - step * 1.25);
  }

  function advanceChronoState(weight, targetActive, dt, rampIn, rampOut) {
    const current = Math.max(0, Math.min(1, Number(weight) || 0));
    const deltaTime = Math.max(0, Number(dt) || 0);
    const inDur = Math.max(0.04, Number(rampIn) || 0.14);
    const outDur = Math.max(0.04, Number(rampOut) || 0.14);
    return targetActive
      ? Math.min(1, current + deltaTime / inDur)
      : Math.max(0, current - deltaTime / outDur);
  }

  function computeGauntletSummary(rawTime, targetsHit, targetsTotal) {
    const cleanRaw = Math.max(0, Number(rawTime) || 0);
    const total = Math.max(0, Math.floor(Number(targetsTotal) || 0));
    const hit = Math.max(0, Math.min(total, Math.floor(Number(targetsHit) || 0)));
    const missed = total - hit;
    const penaltySec = missed * MISSED_TARGET_PENALTY_SEC;
    const finalTime = Math.round((cleanRaw + penaltySec) * 1000) / 1000;
    return {
      rawTime: Math.round(cleanRaw * 1000) / 1000,
      targetsHit: hit,
      targetsTotal: total,
      missed,
      penaltySec,
      finalTime,
      cleanRun: total > 0 && missed === 0
    };
  }

  function evaluateDuelRoundResult(scores, winnerUid, winRounds) {
    const target = winRounds || DUEL_WIN_ROUNDS;
    const next = { ...(scores || {}) };
    if (winnerUid) {
      next[winnerUid] = (next[winnerUid] || 0) + 1;
    }
    let matchWinner = null;
    for (const uid of Object.keys(next)) {
      if (next[uid] >= target) {
        matchWinner = uid;
        break;
      }
    }
    return { scores: next, matchWinner, isMatchOver: matchWinner !== null };
  }

  function evaluateFfaScoreboard(playersMap, winKills) {
    const target = winKills || FFA_WIN_KILLS;
    const list = Object.values(playersMap || {}).map((p) => ({
      uid: p.uid,
      name: p.name || 'Runner',
      kills: Number(p.kills) || 0,
      deaths: Number(p.deaths) || 0
    }));
    list.sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths) || a.name.localeCompare(b.name));
    const leader = list[0] || null;
    const matchWinner = leader && leader.kills >= target ? leader.uid : null;
    return { scoreboard: list, matchWinner, isMatchOver: matchWinner !== null };
  }

  function chooseBotMovementIntent(distance, preferredRange, lowAmmo, roll) {
    if (root.BotAISystem && typeof root.BotAISystem.chooseBotMovementIntent === 'function') {
      return root.BotAISystem.chooseBotMovementIntent(distance, preferredRange, lowAmmo, roll);
    }
    const d = Math.max(0, Number(distance) || 0);
    const preferred = Math.max(1, Number(preferredRange) || 1);
    const r = Math.max(0, Math.min(0.999999, Number(roll) || 0));
    if (lowAmmo) return 'reload';
    if (d > preferred * 1.25) return 'advance';
    if (d < preferred * 0.62) return 'disengage';
    if (r < 0.14) return 'hold';
    if (r < 0.62) return 'strafe';
    if (r < 0.84) return 'reposition';
    return 'advance';
  }

  // If running in Node unit tests without THREE, return pure helpers
  if (!root.THREE || typeof document === 'undefined') {
    return {
      MISSED_TARGET_PENALTY_SEC,
      DUEL_WIN_ROUNDS,
      FFA_WIN_KILLS,
      SLOTS,
      advanceAdsProgress,
      advanceChronoState,
      computeGauntletSummary,
      evaluateDuelRoundResult,
      evaluateFfaScoreboard,
      chooseBotMovementIntent
    };
  }

  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const LS = root.LoadoutsSystem;

  // ---------- Runtime State ----------
  let worldScene = null;
  let fxGroup = null;
  let targetGroup = null;
  let avatarGroup = null;

  function makeFallbackBuild(weaponId) {
    if (LS && typeof LS.resolveWeaponBuild === 'function') {
      return LS.resolveWeaponBuild(weaponId, {});
    }
    const base = (KS && KS.WEAPON_TYPES && KS.WEAPON_TYPES[weaponId]) || {
      id: weaponId, name: weaponId.toUpperCase(), shortName: weaponId.toUpperCase(),
      magSize: 30, rpm: 600, fireInterval: 0.1, damageBody: 34, damageHead: 100,
      reloadTime: 1.75, auto: weaponId === 'rifle' || weaponId === 'smg', range: 240,
      spreadHip: 0.011, spreadAds: 0.002, spreadMove: 0.011, recoilPitch: 0.014, recoilYaw: 0.007
    };
    return {
      weaponId: base.id || weaponId,
      name: base.name,
      shortName: base.shortName || base.name,
      auto: !!base.auto,
      attachments: {},
      damageBody: base.damageBody || 34,
      damageHead: base.damageHead || 100,
      pellets: 1,
      pelletSpread: 0,
      falloffStart: 50,
      falloffEnd: 160,
      minFalloffMul: 0.72,
      armorPen: 1.0,
      rpm: base.rpm || 600,
      fireInterval: base.fireInterval || 0.1,
      magSize: base.magSize || 30,
      reloadTime: base.reloadTime || 1.75,
      range: base.range || 240,
      spreadHip: base.spreadHip || 0.011,
      spreadAds: base.spreadBase || 0.002,
      spreadMove: base.spreadMove || 0.011,
      recoilPitch: base.recoilPitch || 0.014,
      recoilYaw: base.recoilYaw || 0.007,
      adsTimeSec: 0.20,
      weightKg: 3.0,
      mobilityMult: 0.94,
      surfAirMult: 0.96,
      adsMoveMult: 0.65,
      opticType: weaponId === 'awp' ? 'sniper_var' : 'iron',
      adsZoom: weaponId === 'awp' ? 4.0 : 1.15,
      adsZoomAlt: weaponId === 'awp' ? 8.0 : 0,
      adsFovMul: weaponId === 'awp' ? 0.32 : 0.86,
      adsFovMulAlt: weaponId === 'awp' ? 0.17 : 0,
      adsSensMul: weaponId === 'awp' ? 0.40 : 0.88,
      adsSensMulAlt: weaponId === 'awp' ? 0.22 : 0,
      suppressed: false,
      tracerStyle: 'standard',
      ammoType: 'standard',
      isScopedOptic: weaponId === 'awp',
      hasChronoKit: false,
      chronoTimeScale: 1.0,
      chronoTier: 0,
      chronoRampIn: 0.14,
      chronoRampOut: 0.14,
      chronoAirSpreadMul: 1.0,
      chronoLabel: ''
    };
  }

  const state = {
    activeSlot: 'melee', // 'primary' | 'secondary' | 'melee'
    lastSlot: 'primary',
    loadoutName: 'Assault Runner',
    builds: {
      primary: makeFallbackBuild('rifle'),
      secondary: makeFallbackBuild('deagle')
    },
    ammo: { primary: 30, secondary: 7 },
    fireCooldown: 0,
    reloading: false,
    reloadTimer: 0,
    reloadDuration: 0,
    adsHeld: false,
    adsProgress: 0,
    scopeAltZoom: false,
    scopeStage: 0, // 0 = hip, 1 = ADS/Scope primary, 2 = Variable 8x zoom
    chronoWeight: 0,
    chronoTimeScale: 1.0,
    chronoTier: 0,
    chronoActive: false,
    chronoLabel: '',
    spreadBloom: 0,
    hitmarkerTimer: 0,
    hitmarkerHeadshot: false,
    hitmarkerKill: false,
    damageFlashTimer: 0
  };
  let onWeaponXpCb = null;

  // Reusable scratch vectors (zero per-frame allocations)
  const _rayOrigin = new THREE.Vector3();
  const _rayDir = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _tmpA = new THREE.Vector3();
  const _tmpB = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _combatRay = new THREE.Raycaster();

  // Dedicated scratch state for local warmup bot navigation, sight and firing.
  const _botOrigin = new THREE.Vector3();
  const _botDirection = new THREE.Vector3();
  const _botTargetPos = new THREE.Vector3();
  const _botPredictedTarget = new THREE.Vector3();
  const _botToTarget = new THREE.Vector3();
  const _botForward = new THREE.Vector3();
  const _botRight = new THREE.Vector3();
  const _botUp = new THREE.Vector3();
  const _botAimRight = new THREE.Vector3();
  const _botAimUp = new THREE.Vector3();
  const _botAimTarget = new THREE.Vector3();
  const _botVelocityEstimate = new THREE.Vector3();
  const _botDesiredDir = new THREE.Vector3();
  const _botCandidateDir = new THREE.Vector3();
  const _botSteerBest = new THREE.Vector3();
  const _botEndPoint = new THREE.Vector3();
  const BOT_STEER_ANGLES = [0, 0.42, -0.42, 0.86, -0.86, 1.32, -1.32, Math.PI];
  function getBotArchetypes() {
    if (root.BotAISystem && Array.isArray(root.BotAISystem.BOT_ARCHETYPES) && root.BotAISystem.BOT_ARCHETYPES.length) {
      return root.BotAISystem.BOT_ARCHETYPES;
    }
    return [{ role: 'ENTRY', name: 'AI · VEX', weapon: 'rifle', color: 0xff6b55 }];
  }

  // Pooled bullet tracers
  const TRACER_POOL_SIZE = 28;
  const tracers = [];
  let tracerCursor = 0;

  // Pooled impact / shatter sparks
  const SPARK_POOL_SIZE = 72;
  const sparks = [];
  let sparkCursor = 0;

  // Holographic Targets (Range or Gauntlet)
  let targets = [];
  let targetMode = 'none'; // 'none' | 'range' | 'gauntlet'
  let rangeStats = { hits: 0, headshots: 0, total: 0, startTime: 0, clearTime: 0, active: false };
  let rangeResetMesh = null;
  let rangeBoardCanvas = null;
  let rangeBoardTex = null;
  let rangeBoardMesh = null;
  let gauntletHits = 0;
  let gauntletTotal = 0;
  let onTargetProgressCb = null;

  // Solo Warmup Hologram Bots
  let warmupBots = [];
  let warmupSpawns = [];
  let warmupEnabled = false;
  let warmupKills = 0;
  let onWarmupKillCb = null;

  // Remote WebRTC Player Avatars and host-authoritative arena AI.
  const remoteAvatars = new Map();
  const arenaBotAi = new Map();

  function ensureInit(targetScene) {
    if (worldScene === targetScene && fxGroup) return;
    worldScene = targetScene;

    fxGroup = new THREE.Group();
    fxGroup.name = 'combat_fx';
    worldScene.add(fxGroup);

    targetGroup = new THREE.Group();
    targetGroup.name = 'combat_targets';
    worldScene.add(targetGroup);

    avatarGroup = new THREE.Group();
    avatarGroup.name = 'combat_avatars';
    worldScene.add(avatarGroup);

    // Pre-allocate tracer beams
    if (tracers.length === 0) {
      const geo = new THREE.BoxGeometry(0.028, 0.028, 1);
      for (let i = 0; i < TRACER_POOL_SIZE; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.9, depthWrite: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.frustumCulled = false;
        fxGroup.add(mesh);
        tracers.push({ mesh, life: 0, maxLife: 0.09 });
      }
    }

    // Pre-allocate impact / shatter sparks
    if (sparks.length === 0) {
      const sGeo = new THREE.OctahedronGeometry(0.09, 0);
      for (let i = 0; i < SPARK_POOL_SIZE; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x65e7ff, transparent: true, opacity: 0.95, depthWrite: false });
        const mesh = new THREE.Mesh(sGeo, mat);
        mesh.visible = false;
        fxGroup.add(mesh);
        sparks.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.35 });
      }
    }
  }

  function spawnTracer(startPos, endPos, colorHex) {
    if (!tracers.length) return;
    const t = tracers[tracerCursor];
    tracerCursor = (tracerCursor + 1) % TRACER_POOL_SIZE;
    _tmpA.copy(endPos).sub(startPos);
    const len = _tmpA.length();
    if (len < 0.05) return;
    t.mesh.position.copy(startPos).addScaledVector(_tmpA, 0.5);
    t.mesh.scale.set(1, 1, len);
    t.mesh.lookAt(endPos);
    t.mesh.material.color.setHex(colorHex || 0xffe49c);
    t.mesh.material.opacity = 0.92;
    t.mesh.visible = true;
    t.life = 0.095;
    t.maxLife = 0.095;
  }

  function spawnBurst(pos, colorHex, count = 8, speed = 6.5) {
    if (!sparks.length) return;
    for (let i = 0; i < count; i++) {
      const s = sparks[sparkCursor];
      sparkCursor = (sparkCursor + 1) % SPARK_POOL_SIZE;
      s.mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.25) * Math.PI;
      const spd = speed * (0.45 + Math.random() * 0.75);
      s.vel.set(Math.cos(a) * Math.cos(elev) * spd, Math.sin(elev) * spd + 1.8, Math.sin(a) * Math.cos(elev) * spd);
      s.mesh.material.color.setHex(colorHex || 0x65e7ff);
      s.mesh.material.opacity = 0.95;
      s.mesh.scale.setScalar(0.65 + Math.random() * 0.8);
      s.mesh.visible = true;
      s.life = 0.26 + Math.random() * 0.16;
      s.maxLife = s.life;
    }
  }

  // ---------- Loadout, Weapon Slot, True ADS & Full Mobility Management ----------
  function normalizeSlotName(slot) {
    if (slot === 'primary' || slot === 'secondary' || slot === 'melee') return slot;
    if (slot === 'knife') return 'melee';
    if (slot === 'deagle' || slot === 'pistol' || slot === 'revolver') return 'secondary';
    if (slot === 'rifle' || slot === 'smg' || slot === 'shotgun' || slot === 'awp') return 'primary';
    return 'melee';
  }

  function getActiveBuild(slot) {
    const s = normalizeSlotName(slot || state.activeSlot);
    if (s === 'primary') return state.builds.primary;
    if (s === 'secondary') return state.builds.secondary;
    return null;
  }

  function getActiveWeaponType(slot) {
    const s = normalizeSlotName(slot || state.activeSlot);
    if (s === 'melee') return 'knife';
    const b = getActiveBuild(s);
    return b ? b.weaponId : 'rifle';
  }

  function applyLoadout(loadout, inventory, equippedWeaponSkins) {
    const lo = loadout && typeof loadout === 'object' ? loadout : null;
    const pWid = (lo && lo.primary && lo.primary.weaponId) || 'rifle';
    const sWid = (lo && lo.secondary && lo.secondary.weaponId) || 'deagle';
    const pAtts = (lo && lo.primary && lo.primary.attachments) || {};
    const sAtts = (lo && lo.secondary && lo.secondary.attachments) || {};

    state.loadoutName = (lo && lo.name) || 'Custom Loadout';
    state.builds.primary = LS ? LS.resolveWeaponBuild(pWid, pAtts) : makeFallbackBuild(pWid);
    state.builds.secondary = LS ? LS.resolveWeaponBuild(sWid, sAtts) : makeFallbackBuild(sWid);
    state.ammo.primary = state.builds.primary.magSize;
    state.ammo.secondary = state.builds.secondary.magSize;
    state.reloading = false;
    state.reloadTimer = 0;
    state.fireCooldown = 0;
    clearScope();

    if (root.ViewmodelSystem && KS) {
      const resolveSkin = (wt, slotSkinId) => {
        const inv = inventory || KS.createStarterInventory();
        const prefId = slotSkinId || (equippedWeaponSkins && equippedWeaponSkins[wt]) || '';
        if (prefId) {
          const match = (inv.weapons || []).find((w) => w.id === prefId && w.weaponType === wt);
          if (match) return match;
        }
        return KS.getEquippedWeapon(inv, wt);
      };
      root.ViewmodelSystem.equipWeaponBuild(resolveSkin(pWid, lo && lo.primary && lo.primary.skinItemId), state.builds.primary.attachments);
      root.ViewmodelSystem.equipWeaponBuild(resolveSkin(sWid, lo && lo.secondary && lo.secondary.skinItemId), state.builds.secondary.attachments);
      if (lo && lo.melee && lo.melee.knifeItemId && inventory && Array.isArray(inventory.knives)) {
        const km = inventory.knives.find((k) => k.id === lo.melee.knifeItemId);
        if (km) root.ViewmodelSystem.equipKnife(km, false);
      }
      root.ViewmodelSystem.setActiveSlot(getActiveWeaponType(), false);
    }
    return { primary: state.builds.primary, secondary: state.builds.secondary };
  }

  function clearScope() {
    const wasChrono = state.chronoActive;
    state.adsHeld = false;
    state.adsProgress = 0;
    state.scopeAltZoom = false;
    state.scopeStage = 0;
    state.chronoWeight = 0;
    state.chronoTimeScale = 1.0;
    state.chronoTier = 0;
    state.chronoActive = false;
    state.chronoLabel = '';
    if (wasChrono && root.WeaponAudio && typeof root.WeaponAudio.chronoExit === 'function') {
      root.WeaponAudio.chronoExit();
    }
    if (root.ViewmodelSystem) {
      root.ViewmodelSystem.setAdsState(false, 0.16, false);
      root.ViewmodelSystem.setScoped(false);
    }
  }

  function getChronoState() {
    return {
      active: state.chronoActive,
      weight: state.chronoWeight,
      scale: state.chronoTimeScale,
      tier: state.chronoTier,
      label: state.chronoLabel
    };
  }

  function switchSlot(slot, playDraw = true) {
    const valid = normalizeSlotName(slot);
    const vmType = getActiveWeaponType(valid);
    if (state.activeSlot === valid) {
      if (root.ViewmodelSystem) root.ViewmodelSystem.setActiveSlot(vmType, playDraw);
      return false;
    }
    state.lastSlot = state.activeSlot;
    state.activeSlot = valid;
    state.reloading = false;
    state.reloadTimer = 0;
    state.fireCooldown = Math.min(state.fireCooldown, 0.16);
    clearScope();
    if (root.ViewmodelSystem) {
      root.ViewmodelSystem.setActiveSlot(vmType, playDraw);
    }
    return true;
  }

  function quickSwitch() {
    const target = state.lastSlot && state.lastSlot !== state.activeSlot ? state.lastSlot : (state.activeSlot === 'melee' ? 'primary' : 'melee');
    return switchSlot(target, true);
  }

  function cycleSlot(dir) {
    const idx = SLOTS.indexOf(state.activeSlot);
    const nextIdx = (idx + (dir > 0 ? 1 : -1) + SLOTS.length) % SLOTS.length;
    return switchSlot(SLOTS[nextIdx], true);
  }

  function resetAmmo() {
    state.ammo.primary = state.builds.primary.magSize;
    state.ammo.secondary = state.builds.secondary.magSize;
    state.reloading = false;
    state.reloadTimer = 0;
    state.fireCooldown = 0;
    state.spreadBloom = 0;
    clearScope();
  }

  function startReload() {
    const build = getActiveBuild(state.activeSlot);
    if (!build || state.reloading) return false;
    if (state.ammo[state.activeSlot] >= build.magSize) return false;
    clearScope();
    state.reloading = true;
    state.reloadDuration = build.reloadTime;
    state.reloadTimer = build.reloadTime;
    if (root.ViewmodelSystem) root.ViewmodelSystem.triggerReload(build.reloadTime);
    return true;
  }

  function setAdsHeld(held) {
    const build = getActiveBuild(state.activeSlot);
    if (!build || state.reloading) {
      if (state.adsHeld) clearScope();
      return false;
    }
    const next = Boolean(held);
    if (next === state.adsHeld) return state.adsHeld;
    state.adsHeld = next;
    if (!next) {
      state.scopeAltZoom = false;
      state.scopeStage = 0;
    } else {
      state.scopeStage = state.scopeAltZoom && build.adsZoomAlt ? 2 : 1;
      if (root.WeaponAudio && build.isScopedOptic) root.WeaponAudio.scopeZoom(1);
    }
    if (root.ViewmodelSystem) {
      root.ViewmodelSystem.setAdsState(next, build.adsTimeSec, build.isScopedOptic);
    }
    return next;
  }

  function cycleScopeZoom() {
    const build = getActiveBuild(state.activeSlot);
    if (!build || !state.adsHeld || !build.adsZoomAlt) return false;
    state.scopeAltZoom = !state.scopeAltZoom;
    state.scopeStage = state.scopeAltZoom ? 2 : 1;
    if (root.WeaponAudio) root.WeaponAudio.scopeZoom(state.scopeStage);
    return true;
  }

  function toggleScope() {
    const build = getActiveBuild(state.activeSlot);
    if (!build || state.reloading) return 0;
    if (!state.adsHeld) {
      setAdsHeld(true);
      return state.scopeStage;
    }
    if (build.adsZoomAlt && !state.scopeAltZoom) {
      cycleScopeZoom();
      return state.scopeStage;
    }
    setAdsHeld(false);
    return 0;
  }

  function getScopeFovMultiplier() {
    const build = getActiveBuild(state.activeSlot);
    if (!build || state.adsProgress <= 0.001) return 1.0;
    const target = state.scopeAltZoom && build.adsFovMulAlt ? build.adsFovMulAlt : build.adsFovMul;
    return 1.0 + (target - 1.0) * state.adsProgress;
  }

  function getScopeSensMultiplier() {
    const build = getActiveBuild(state.activeSlot);
    if (!build || state.adsProgress <= 0.001) return 1.0;
    const target = state.scopeAltZoom && build.adsSensMulAlt ? build.adsSensMulAlt : build.adsSensMul;
    return 1.0 + (target - 1.0) * state.adsProgress;
  }

  function getScopeOverlayState() {
    const build = getActiveBuild(state.activeSlot);
    if (!build) {
      return { active: false, type: 'none', zoomLabel: '', adsProgress: 0, opticType: 'none', hideCrosshair: false };
    }
    const scopedActive = build.isScopedOptic && state.adsHeld && state.adsProgress >= 0.72;
    const zoomNum = state.scopeAltZoom && build.adsZoomAlt ? build.adsZoomAlt : build.adsZoom;
    const zoomLabel = zoomNum ? `${Number.isInteger(zoomNum) ? zoomNum : zoomNum.toFixed(1)}×` : '';
    return {
      active: scopedActive,
      type: scopedActive ? (build.opticType === 'acog' ? 'acog' : 'sniper') : 'none',
      zoomLabel,
      adsProgress: state.adsProgress,
      opticType: build.opticType,
      hideCrosshair: state.adsProgress > 0.35
    };
  }

  function getActiveMobilityProfile() {
    if (state.activeSlot === 'melee') {
      const m = LS ? LS.getMeleeMobilityProfile() : { weaponId: 'knife', weightKg: 0.35, mobilityMult: 1.0, surfAirMult: 1.0, adsMoveMult: 1.0 };
      return { ...m, adsProgress: 0 };
    }
    const build = getActiveBuild(state.activeSlot);
    if (!build) return { weaponId: 'knife', weightKg: 0.35, mobilityMult: 1.0, surfAirMult: 1.0, adsMoveMult: 1.0, adsProgress: 0 };
    return {
      weaponId: build.weaponId,
      weightKg: build.weightKg,
      mobilityMult: build.mobilityMult,
      surfAirMult: build.surfAirMult,
      adsMoveMult: build.adsMoveMult,
      adsProgress: state.adsProgress
    };
  }

  // ---------- Holographic Targets & Sandbox Range ----------
  function clearTargets() {
    if (targetGroup) {
      while (targetGroup.children.length > 0) {
        const ch = targetGroup.children[0];
        targetGroup.remove(ch);
      }
    }
    targets = [];
    targetMode = 'none';
    rangeResetMesh = null;
    rangeBoardMesh = null;
    rangeBoardCanvas = null;
    rangeBoardTex = null;
    gauntletHits = 0;
    gauntletTotal = 0;
    rangeStats = { hits: 0, headshots: 0, total: 0, startTime: 0, clearTime: 0, active: false };
  }

  function createHoloTargetMesh(spec) {
    const g = new THREE.Group();
    const scale = spec.scale || 1.0;

    // Ground/air projector base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x162432, roughness: 0.45, metalness: 0.72 });
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 0.42 * scale, 8), baseMat);
    pylon.position.y = -1.05 * scale;
    g.add(pylon);

    // Outer holographic target body (clickable/shootable hitbox)
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x3ee8ff,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.76 * scale, 0.76 * scale, 0.14 * scale, 6), bodyMat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.userData.targetRole = 'body';
    g.add(bodyMesh);

    // Outer tactical wireframe ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbef7ff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82 * scale, 0.045 * scale, 8, 6), ringMat);
    g.add(ring);

    // Distinct glowing gold/amber headshot core bullseye
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.20 * scale, 16), headMat);
    headMesh.rotation.x = Math.PI / 2;
    headMesh.position.y = 0.26 * scale;
    headMesh.userData.targetRole = 'head';
    g.add(headMesh);

    g.position.set(spec.x, spec.y, spec.z);
    if (typeof spec.yaw === 'number') g.rotation.y = spec.yaw;

    return {
      id: spec.id || ('tgt_' + targets.length),
      group: g,
      bodyMesh,
      headMesh,
      baseX: spec.x,
      baseY: spec.y,
      baseZ: spec.z,
      patrolAxis: spec.patrolAxis || 'x',
      patrolRange: spec.patrolRange || 0,
      patrolSpeed: spec.patrolSpeed || 1.6,
      phase: spec.phase || 0,
      alive: true,
      respawnTimer: 0
    };
  }

  function updateRangeScoreboard() {
    if (!rangeBoardCanvas || !rangeBoardTex) return;
    const ctx = rangeBoardCanvas.getContext('2d');
    const W = rangeBoardCanvas.width, H = rangeBoardCanvas.height;
    ctx.fillStyle = '#091420';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#65e7ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    ctx.fillStyle = '#65e7ff';
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VELOCITY SHOOTING RANGE', 26, 44);

    ctx.fillStyle = '#e7f7ff';
    ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`TARGETS ${rangeStats.hits}/${rangeStats.total}`, 26, 108);

    const hsPct = rangeStats.hits > 0 ? Math.round((rangeStats.headshots / rangeStats.hits) * 100) : 0;
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`HEADSHOT ${hsPct}%`, 26, 158);

    const timeStr = rangeStats.clearTime > 0
      ? rangeStats.clearTime.toFixed(2) + 's'
      : rangeStats.active
        ? ((performance.now() - rangeStats.startTime) / 1000).toFixed(2) + 's'
        : 'READY';
    ctx.textAlign = 'right';
    ctx.fillStyle = rangeStats.clearTime > 0 ? '#7dff8b' : '#b4d6e8';
    ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
    ctx.fillText(timeStr, W - 26, 114);
    ctx.fillStyle = '#8aaec2';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText('SHOOT GREEN RESET TO RESTART', W - 26, 158);

    rangeBoardTex.needsUpdate = true;
  }

  function setupTargets(mode, specs, rangeMeta) {
    clearTargets();
    if (!targetGroup || !Array.isArray(specs) || specs.length === 0) return;
    targetMode = mode || 'gauntlet';
    for (let i = 0; i < specs.length; i++) {
      const t = createHoloTargetMesh(specs[i]);
      t.bodyMesh.userData.targetIndex = i;
      t.headMesh.userData.targetIndex = i;
      targetGroup.add(t.group);
      targets.push(t);
    }
    if (targetMode === 'range') {
      rangeStats = { hits: 0, headshots: 0, total: targets.length, startTime: 0, clearTime: 0, active: false };
      if (rangeMeta && rangeMeta.resetPos) {
        const rp = rangeMeta.resetPos;
        const resetGroup = new THREE.Group();
        const btn = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.9, 0.25),
          new THREE.MeshBasicMaterial({ color: 0x35e67d })
        );
        btn.userData.isRangeReset = true;
        resetGroup.add(btn);
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.78, 1.08, 0.16),
          new THREE.MeshStandardMaterial({ color: 0x162432, roughness: 0.4, metalness: 0.7 })
        );
        frame.position.z = -0.06;
        resetGroup.add(frame);

        // Crisp RESET canvas label
        const lc = document.createElement('canvas');
        lc.width = 256; lc.height = 128;
        const lctx = lc.getContext('2d');
        lctx.fillStyle = '#071a10';
        lctx.fillRect(0, 0, 256, 128);
        lctx.fillStyle = '#7dff9e';
        lctx.font = 'bold 54px Arial';
        lctx.textAlign = 'center';
        lctx.fillText('RESET', 128, 82);
        const labelPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(1.48, 0.76),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc) })
        );
        labelPlane.position.z = 0.135;
        labelPlane.userData.isRangeReset = true;
        resetGroup.add(labelPlane);

        resetGroup.position.set(rp[0], rp[1], rp[2]);
        if (typeof rangeMeta.resetYaw === 'number') resetGroup.rotation.y = rangeMeta.resetYaw;
        targetGroup.add(resetGroup);
        rangeResetMesh = labelPlane;
        btn.userData.resetGroup = resetGroup;
      }

      if (rangeMeta && rangeMeta.boardPos) {
        rangeBoardCanvas = document.createElement('canvas');
        rangeBoardCanvas.width = 768;
        rangeBoardCanvas.height = 192;
        rangeBoardTex = new THREE.CanvasTexture(rangeBoardCanvas);
        rangeBoardMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(11.5, 2.9),
          new THREE.MeshBasicMaterial({ map: rangeBoardTex, side: THREE.DoubleSide })
        );
        rangeBoardMesh.position.set(rangeMeta.boardPos[0], rangeMeta.boardPos[1], rangeMeta.boardPos[2]);
        if (typeof rangeMeta.boardYaw === 'number') rangeBoardMesh.rotation.y = rangeMeta.boardYaw;
        targetGroup.add(rangeBoardMesh);
        updateRangeScoreboard();
      }
    } else if (targetMode === 'gauntlet') {
      gauntletHits = 0;
      gauntletTotal = targets.length;
      if (onTargetProgressCb) onTargetProgressCb(getTargetProgress());
    }
  }

  function resetTargets() {
    for (const t of targets) {
      t.alive = true;
      t.respawnTimer = 0;
      t.group.visible = true;
    }
    if (targetMode === 'range') {
      rangeStats = { hits: 0, headshots: 0, total: targets.length, startTime: 0, clearTime: 0, active: false };
      updateRangeScoreboard();
    } else if (targetMode === 'gauntlet') {
      gauntletHits = 0;
      gauntletTotal = targets.length;
      if (onTargetProgressCb) onTargetProgressCb(getTargetProgress());
    }
  }

  function getTargetProgress() {
    if (targetMode === 'gauntlet') {
      return { mode: 'gauntlet', hits: gauntletHits, total: gauntletTotal };
    }
    if (targetMode === 'range') {
      return { mode: 'range', hits: rangeStats.hits, total: rangeStats.total, headshots: rangeStats.headshots, clearTime: rangeStats.clearTime };
    }
    return { mode: 'none', hits: 0, total: 0 };
  }

  // ---------- Composite Player / Bot 3D Avatar Builder ----------
  function makeCallsignSprite(text, colorHex) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(7, 16, 26, 0.78)';
    ctx.fillRect(18, 12, 220, 40);
    ctx.strokeStyle = colorHex || '#65e7ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 12, 220, 40);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(text || 'RUNNER').slice(0, 14), 128, 40);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(2.1, 0.52, 1);
    return sp;
  }

  function createAvatarMesh(opts) {
    const g = new THREE.Group();
    const accentColor = opts.accentColor || 0xff6b55;
    const isBot = Boolean(opts.isBot);

    const armorMat = new THREE.MeshStandardMaterial({
      color: isBot ? 0x1a2c3d : 0x1e2632,
      roughness: 0.48,
      metalness: 0.52,
      emissive: isBot ? 0x0b2a3e : 0x12090c,
      emissiveIntensity: isBot ? 0.55 : 0.25
    });
    const accentMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f151d, roughness: 0.7, metalness: 0.25 });

    // Torso (primary body hitbox)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.36), armorMat);
    torso.position.y = 1.06;
    g.add(torso);

    // Glowing chest chevron strip for instant high-contrast combat silhouette readability
    const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.10, 0.39), accentMat);
    chestStrip.position.y = 1.24;
    g.add(chestStrip);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.24), darkMat);
    legL.position.set(-0.16, 0.32, 0);
    const legR = legL.clone();
    legR.position.x = 0.16;
    g.add(legL, legR);

    // Arms + held weapon silhouette
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), armorMat);
    armR.position.set(0.40, 1.10, -0.14);
    armR.rotation.x = 0.85;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.18), armorMat);
    armL.position.set(-0.34, 1.06, -0.16);
    armL.rotation.x = 0.75;
    const gunBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.66), darkMat);
    gunBar.position.set(0.26, 1.18, -0.42);
    g.add(armR, armL, gunBar);

    // Head helmet + glowing visor (headshot hitbox)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), armorMat);
    head.position.y = 1.72;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.40), accentMat);
    visor.position.y = 1.74;
    g.add(head, visor);

    // Floating HP bar & callsign
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.10),
      new THREE.MeshBasicMaterial({ color: 0x0a131c, side: THREE.DoubleSide })
    );
    hpBg.position.y = 2.16;
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.91, 0.065),
      new THREE.MeshBasicMaterial({ color: 0x62f58a, side: THREE.DoubleSide })
    );
    hpFill.position.set(0, 2.16, 0.005);
    g.add(hpBg, hpFill);

    const label = makeCallsignSprite(opts.name || 'BOT', '#' + accentColor.toString(16).padStart(6, '0'));
    label.position.y = 2.46;
    g.add(label);

    // Pre-allocated Chrono Stasis Shell (hidden unless player is hanging in Apex Chrono ADS)
    const noopRaycast = () => {};
    const chronoGroup = new THREE.Group();
    chronoGroup.visible = false;
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x4eeeff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const shellMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.54, 2.04, 16, 1, true), shellMat);
    shellMesh.position.y = 1.04;
    shellMesh.raycast = noopRaycast;
    chronoGroup.add(shellMesh);

    const ringAMat = new THREE.MeshBasicMaterial({
      color: 0x9df7ff,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.026, 8, 28), ringAMat);
    ringA.position.y = 1.12;
    ringA.rotation.x = Math.PI * 0.34;
    ringA.raycast = noopRaycast;
    chronoGroup.add(ringA);

    const ringBMat = new THREE.MeshBasicMaterial({
      color: 0x4eeeff,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.020, 8, 24), ringBMat);
    ringB.position.y = 1.12;
    ringB.rotation.x = -Math.PI * 0.38;
    ringB.rotation.y = Math.PI * 0.28;
    ringB.raycast = noopRaycast;
    chronoGroup.add(ringB);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x9df7ff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 8, 20), haloMat);
    haloMesh.position.y = 1.98;
    haloMesh.rotation.x = Math.PI * 0.5;
    haloMesh.raycast = noopRaycast;
    chronoGroup.add(haloMesh);
    g.add(chronoGroup);

    const chronoShell = {
      group: chronoGroup,
      shellMat,
      ringAMat,
      ringBMat,
      haloMat,
      ringA,
      ringB,
      haloMesh,
      clock: 0,
      tier: 0
    };

    // Pre-allocated world-space 3D Grapple Tether line (zero per-frame GC allocations)
    const grapplePositions = new Float32Array(6);
    const grappleGeo = new THREE.BufferGeometry();
    grappleGeo.setAttribute('position', new THREE.BufferAttribute(grapplePositions, 3));
    const grappleMat = new THREE.LineBasicMaterial({
      color: 0x5ef0ff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    const grappleLine = new THREE.Line(grappleGeo, grappleMat);
    grappleLine.visible = false;
    grappleLine.frustumCulled = false;
    grappleLine.raycast = noopRaycast;
    if (fxGroup) fxGroup.add(grappleLine);

    return {
      group: g,
      headMesh: head,
      bodyMesh: torso,
      hpFill,
      hpBg,
      label,
      legL,
      legR,
      gunBar,
      chronoShell,
      grappleLine,
      grapplePositions
    };
  }

  function updateAvatarGrappleVisual(visual, originPos, grapplePoint) {
    if (!visual || !visual.grappleLine || !visual.grapplePositions) return;
    const line = visual.grappleLine;
    if (!originPos || !grapplePoint) {
      if (line.visible) line.visible = false;
      return;
    }
    if (!line.parent && fxGroup) fxGroup.add(line);
    const pos = visual.grapplePositions;
    pos[0] = originPos.x;
    pos[1] = originPos.y + 1.24;
    pos[2] = originPos.z;
    pos[3] = grapplePoint.x;
    pos[4] = grapplePoint.y;
    pos[5] = grapplePoint.z;
    line.geometry.attributes.position.needsUpdate = true;
    line.visible = true;
  }

  function disposeAvatarAuxVisuals(visual) {
    if (!visual) return;
    if (visual.grappleLine) {
      if (visual.grappleLine.parent) visual.grappleLine.parent.remove(visual.grappleLine);
      if (visual.grappleLine.geometry) visual.grappleLine.geometry.dispose();
      if (visual.grappleLine.material) visual.grappleLine.material.dispose();
    }
  }

  function updateAvatarChronoVisual(visual, tier, dt) {
    if (!visual || !visual.chronoShell) return;
    const cs = visual.chronoShell;
    const cleanTier = Number(tier) || 0;
    if (cleanTier <= 0) {
      if (cs.group.visible) cs.group.visible = false;
      cs.tier = 0;
      return;
    }
    cs.group.visible = true;
    if (cs.tier !== cleanTier) {
      const isPhase = cleanTier >= 2;
      cs.shellMat.color.setHex(isPhase ? 0xffa838 : 0x48ecff);
      cs.ringAMat.color.setHex(isPhase ? 0xffe08a : 0xaef9ff);
      cs.ringBMat.color.setHex(isPhase ? 0xff9d36 : 0x3de4ff);
      cs.haloMat.color.setHex(isPhase ? 0xffe08a : 0xaef9ff);
      cs.tier = cleanTier;
    }
    const stepDt = Math.max(0, Number(dt) || 0);
    cs.clock += stepDt;
    const spinMul = cleanTier >= 2 ? 1.55 : 1.0;
    cs.ringA.rotation.z += stepDt * 3.1 * spinMul;
    cs.ringB.rotation.z -= stepDt * 2.4 * spinMul;
    cs.ringB.rotation.y += stepDt * 1.4 * spinMul;
    const pulse = 0.5 + 0.5 * Math.sin(cs.clock * (cleanTier >= 2 ? 9.5 : 6.5));
    cs.shellMat.opacity = (cleanTier >= 2 ? 0.20 : 0.16) + pulse * 0.11;
    cs.haloMesh.scale.setScalar(0.95 + pulse * 0.10);
  }

  // ---------- Solo Warmup & Sandbox Adaptive Player-Grade AI Bots ----------
  function clearWarmupBots() {
    for (const bot of warmupBots) {
      if (bot.visual) {
        if (bot.visual.group.parent) bot.visual.group.parent.remove(bot.visual.group);
        disposeAvatarAuxVisuals(bot.visual);
      }
    }
    warmupBots = [];
    warmupEnabled = false;
  }

  function hasActiveWarmupBots() {
    return warmupEnabled && warmupBots.length > 0;
  }

  function setupWarmupBots(spawns, count = 3) {
    clearWarmupBots();
    if (!avatarGroup || !Array.isArray(spawns) || spawns.length === 0) return;
    const BAI = root.BotAISystem;
    warmupSpawns = spawns.slice();
    warmupEnabled = true;
    warmupKills = 0;
    const archetypes = getBotArchetypes();
    const playerSpawn = spawns[0];
    const n = Math.min(count, spawns.length);
    for (let i = 0; i < n; i++) {
      const sp = spawns[(i + 1) % spawns.length];
      const profile = archetypes[i % archetypes.length];
      const visual = createAvatarMesh({ name: profile.name || `AI · ${profile.role}`, accentColor: profile.color, isBot: true });
      visual.headMesh.userData.botIndex = i;
      visual.headMesh.userData.hitbox = 'head';
      visual.bodyMesh.userData.botIndex = i;
      visual.bodyMesh.userData.hitbox = 'body';
      const yaw = Math.atan2(-(playerSpawn.x - sp.x), -(playerSpawn.z - sp.z));
      visual.group.position.set(sp.x, sp.y, sp.z);
      visual.group.rotation.y = yaw;
      avatarGroup.add(visual.group);

      const bot = BAI && typeof BAI.createBotState === 'function'
        ? BAI.createBotState({
            index: i,
            uid: `warmup_bot_${i}`,
            name: profile.name || `AI · ${profile.role}`,
            profile,
            profileIndex: i,
            visual,
            pos: sp,
            yaw
          })
        : { index: i, name: profile.name, profile, visual, hp: 100, alive: true, respawnTimer: 0, pos: new THREE.Vector3(sp.x, sp.y, sp.z), yaw };
      warmupBots.push(bot);
    }
  }

  function setWarmupBotsVisible(visible) {
    warmupEnabled = Boolean(visible);
    for (const bot of warmupBots) {
      bot.visual.group.visible = warmupEnabled && bot.alive;
      if (!warmupEnabled || !bot.alive) {
        updateAvatarChronoVisual(bot.visual, 0, 0);
        updateAvatarGrappleVisual(bot.visual, null, null);
      }
    }
  }

  // ---------- Remote WebRTC Player Avatars ----------
  function clearRemoteAvatars() {
    for (const [, av] of remoteAvatars) {
      if (av.visual) {
        if (av.visual.group.parent) av.visual.group.parent.remove(av.visual.group);
        disposeAvatarAuxVisuals(av.visual);
      }
    }
    remoteAvatars.clear();
    arenaBotAi.clear();
  }

  function resetArenaBotBrain(bot) {
    if (!bot) return;
    const BAI = root.BotAISystem;
    const pos = bot.visual ? bot.visual.group.position : bot.pos;
    if (BAI && typeof BAI.resetBotState === 'function') {
      BAI.resetBotState(bot, pos, bot.yaw);
    }
    if (bot.visual) {
      updateAvatarChronoVisual(bot.visual, 0, 0);
      updateAvatarGrappleVisual(bot.visual, null, null);
    }
    bot.poseTimer = 0;
  }

  function syncArenaBots(players, resetBrains) {
    const wanted = new Set();
    if (!Array.isArray(players)) players = [];
    const BAI = root.BotAISystem;
    const archetypes = getBotArchetypes();

    for (const player of players) {
      if (!player || !player.uid || !player.isBot) continue;
      wanted.add(player.uid);
      const profileIndex = Math.max(0, Number(player.botType) || 0) % archetypes.length;
      const profile = archetypes[profileIndex];
      const spawn = warmupSpawns[player.spawnIdx] || warmupSpawns[0] || { x: 0, y: 0.05, z: 0, yaw: 0 };
      const existed = remoteAvatars.has(player.uid);
      const snap = !existed || Boolean(resetBrains);
      const avatar = upsertRemoteAvatar(player.uid, {
        name: player.name || profile.name || `AI · ${profile.role}`,
        isBot: true,
        botType: profileIndex,
        ...(snap ? {
          x: Number.isFinite(player.x) ? player.x : spawn.x,
          y: Number.isFinite(player.y) ? player.y : spawn.y,
          z: Number.isFinite(player.z) ? player.z : spawn.z,
          yaw: Number.isFinite(player.yaw) ? player.yaw : (spawn.yaw || 0),
          snap: true
        } : {}),
        hp: Number.isFinite(player.hp) ? player.hp : 100,
        alive: player.alive !== false,
        slot: player.slot || profile.weapon
      });
      if (!avatar) continue;
      if (snap) {
        avatar.visual.group.position.copy(avatar.pos);
        avatar.visual.group.rotation.y = avatar.yaw;
      }

      let bot = arenaBotAi.get(player.uid);
      if (!bot) {
        bot = BAI && typeof BAI.createBotState === 'function'
          ? BAI.createBotState({
              index: profileIndex,
              uid: player.uid,
              name: player.name || profile.name || `AI · ${profile.role}`,
              profile,
              profileIndex,
              visual: avatar.visual,
              pos: avatar.pos,
              yaw: avatar.yaw,
              hp: avatar.hp,
              alive: avatar.alive
            })
          : { uid: player.uid, name: player.name, profile, visual: avatar.visual, pos: avatar.pos.clone(), yaw: avatar.yaw, hp: avatar.hp, alive: avatar.alive, poseTimer: 0 };
        arenaBotAi.set(player.uid, bot);
      } else {
        const wasAlive = bot.alive;
        bot.name = player.name || bot.name;
        bot.profile = profile;
        bot.visual = avatar.visual;
        bot.hp = avatar.hp;
        bot.alive = avatar.alive;
        if (!bot.alive) {
          bot.chronoTier = 0;
          bot.grapplePoint = null;
          updateAvatarChronoVisual(avatar.visual, 0, 0);
          updateAvatarGrappleVisual(avatar.visual, null, null);
        }
        if (resetBrains || (!wasAlive && bot.alive)) {
          bot.yaw = avatar.yaw;
          resetArenaBotBrain(bot);
        }
      }
    }

    for (const uid of Array.from(arenaBotAi.keys())) {
      if (!wanted.has(uid)) {
        arenaBotAi.delete(uid);
        removeRemoteAvatar(uid);
      }
    }
  }

  function updateArenaBots(dt, playerState, solidList, movementContext) {
    if (!playerState || !playerState.isHost || playerState.phase !== 'live' || arenaBotAi.size === 0) return;
    const BAI = root.BotAISystem;
    if (!BAI || typeof BAI.stepBot !== 'function') return;

    const roster = Array.isArray(playerState.players) ? playerState.players : [];
    const rosterByUid = new Map(roster.map((p) => [p.uid, p]));

    for (const bot of arenaBotAi.values()) {
      if (!bot.alive) continue;
      let target = null;
      let targetScore = Infinity;

      const consider = (uid, position, velocity, hp, eye, isAlive, isBot, chronoTier) => {
        if (!uid || uid === bot.uid || !position || !isAlive) return;
        const dx = position.x - bot.pos.x;
        const dy = position.y - bot.pos.y;
        const dz = position.z - bot.pos.z;
        const distance = Math.hypot(dx, dy * 0.65, dz);
        const finishBonus = Number.isFinite(hp) && hp <= 40 ? Math.min(16, (41 - hp) * 0.42) : 0;
        const chronoBonus = chronoTier > 0 ? 11.0 : 0;
        const currentTargetBonus = bot.targetUid === uid ? 2.5 : 0;
        const score = distance - finishBonus - chronoBonus - currentTargetBonus;
        if (score < targetScore) {
          targetScore = score;
          target = {
            uid,
            position,
            velocity: velocity || null,
            hp: Number.isFinite(hp) ? hp : 100,
            eye: eye || 1.6,
            alive: true,
            isBot: Boolean(isBot),
            chronoTier: Number(chronoTier) || 0
          };
        }
      };

      if (playerState.position && playerState.uid) {
        consider(
          playerState.uid,
          playerState.position,
          playerState.velocity || null,
          playerState.hp,
          playerState.eye,
          playerState.alive !== false,
          false,
          state.chronoTier || 0
        );
      }

      for (const [uid, avatar] of remoteAvatars) {
        if (!avatar || !avatar.alive || uid === bot.uid) continue;
        const record = rosterByUid.get(uid);
        const otherBrain = arenaBotAi.get(uid);
        consider(
          uid,
          avatar.pos,
          otherBrain ? otherBrain.vel : null,
          record && Number.isFinite(record.hp) ? record.hp : avatar.hp,
          1.6,
          true,
          avatar.isBot,
          avatar.chronoTier || 0
        );
      }

      bot.targetUid = target ? target.uid : '';

      BAI.stepBot(bot, dt, {
        config: movementContext && movementContext.config,
        solids: movementContext && movementContext.solids,
        solidMeshes: solidList,
        pads: movementContext && movementContext.pads,
        boosters: movementContext && movementContext.boosters,
        teleporters: movementContext && movementContext.teleporters,
        abilitiesAllowed: !movementContext || movementContext.abilitiesAllowed !== false,
        viewerPos: playerState.position,
        target,
        callbacks: {
          spawnTracer,
          spawnBurst,
          updateChronoVisual: updateAvatarChronoVisual,
          updateGrappleVisual: updateAvatarGrappleVisual,
          onDamage: (damage, weapon, isHeadshot) => {
            if (target && root.NetcodeSystem && typeof root.NetcodeSystem.applyBotDamage === 'function') {
              root.NetcodeSystem.applyBotDamage(bot.uid, target.uid, damage, weapon, Boolean(isHeadshot));
            }
          },
          onShot: (firingBot, origin, endPoint, weapon) => {
            if (root.NetcodeSystem && typeof root.NetcodeSystem.reportBotShot === 'function') {
              root.NetcodeSystem.reportBotShot(firingBot.uid, origin, endPoint, weapon);
            }
          }
        }
      });

      const avatar = remoteAvatars.get(bot.uid);
      if (avatar) {
        avatar.pos.copy(bot.pos);
        avatar.targetPos.copy(bot.pos);
        avatar.yaw = bot.yaw;
        avatar.targetYaw = bot.yaw;
        avatar.chronoTier = bot.chronoTier || 0;
        avatar.grapplePoint = bot.grapplePoint ? bot.grapplePoint : null;
      }

      bot.poseTimer -= dt;
      if (bot.poseTimer <= 0) {
        bot.poseTimer = 1 / 15;
        if (root.NetcodeSystem && typeof root.NetcodeSystem.reportBotPose === 'function') {
          const activeSlotWep = bot.activeWeaponSlot === 'secondary' && bot.secondaryBuild
            ? bot.secondaryBuild.weaponId
            : bot.profile.weapon;
          const posePayload = {
            x: bot.pos.x,
            y: bot.pos.y,
            z: bot.pos.z,
            yaw: bot.yaw,
            slot: activeSlotWep,
            ct: bot.chronoTier || 0
          };
          if (bot.grapplePoint) {
            posePayload.gx = bot.grapplePoint.x;
            posePayload.gy = bot.grapplePoint.y;
            posePayload.gz = bot.grapplePoint.z;
          }
          root.NetcodeSystem.reportBotPose(bot.uid, posePayload);
        }
      }
    }
  }

  function upsertRemoteAvatar(uid, info) {
    if (!avatarGroup || !uid) return null;
    let entry = remoteAvatars.get(uid);
    if (!entry) {
      const palette = [0xff5277, 0x56e8ff, 0xffbd42, 0x9b6bff];
      const botPalette = getBotArchetypes().map((p) => p.color);
      const isBot = Boolean(info && info.isBot);
      const botType = info && Number.isFinite(info.botType) ? info.botType : 0;
      const color = isBot ? botPalette[botType % botPalette.length] : palette[remoteAvatars.size % palette.length];
      const visual = createAvatarMesh({ name: (info && info.name) || 'PLAYER', accentColor: color, isBot });
      visual.headMesh.userData.remoteUid = uid;
      visual.headMesh.userData.hitbox = 'head';
      visual.bodyMesh.userData.remoteUid = uid;
      visual.bodyMesh.userData.hitbox = 'body';
      avatarGroup.add(visual.group);
      entry = {
        uid,
        name: (info && info.name) || 'PLAYER',
        visual,
        pos: new THREE.Vector3(0, 2, 0),
        targetPos: new THREE.Vector3(0, 2, 0),
        yaw: 0,
        targetYaw: 0,
        hp: 100,
        alive: true,
        isBot: Boolean(info && info.isBot),
        botType: info && Number.isFinite(info.botType) ? info.botType : null,
        activeSlot: 'rifle',
        chronoTier: Number(info && info.ct) || 0,
        grapplePoint: null
      };
      remoteAvatars.set(uid, entry);
    }
    if (info) {
      if (typeof info.isBot === 'boolean') entry.isBot = info.isBot;
      if (Number.isFinite(info.botType)) entry.botType = info.botType;
      if (typeof info.x === 'number' && typeof info.y === 'number' && typeof info.z === 'number') {
        entry.targetPos.set(info.x, info.y, info.z);
        if (info.snap) entry.pos.copy(entry.targetPos);
      }
      if (typeof info.yaw === 'number') {
        entry.targetYaw = info.yaw;
        if (info.snap) entry.yaw = info.yaw;
      }
      if (typeof info.hp === 'number') {
        entry.hp = Math.max(0, Math.min(100, info.hp));
        const ratio = entry.hp / 100;
        entry.visual.hpFill.scale.x = Math.max(0.001, ratio);
        entry.visual.hpFill.position.x = -(1 - ratio) * 0.455;
        entry.visual.hpFill.material.color.setHex(ratio > 0.5 ? 0x62f58a : ratio > 0.25 ? 0xffc857 : 0xff4d6d);
      }
      if (typeof info.alive === 'boolean') {
        entry.alive = info.alive;
        entry.visual.group.visible = entry.alive;
        if (!entry.alive) {
          entry.chronoTier = 0;
          entry.grapplePoint = null;
          updateAvatarChronoVisual(entry.visual, 0, 0);
          updateAvatarGrappleVisual(entry.visual, null, null);
        }
      }
      if (typeof info.slot === 'string') {
        entry.activeSlot = info.slot;
        entry.visual.gunBar.visible = info.slot !== 'knife' && info.slot !== 'melee';
      }
      if (typeof info.ct === 'number') {
        entry.chronoTier = info.ct;
      }
      if (typeof info.gx === 'number' && typeof info.gy === 'number' && typeof info.gz === 'number') {
        if (!entry.grapplePoint) entry.grapplePoint = new THREE.Vector3();
        entry.grapplePoint.set(info.gx, info.gy, info.gz);
      } else if ('gx' in info || info.clearGrapple) {
        entry.grapplePoint = null;
      }
    }
    const botBrain = arenaBotAi.get(uid);
    if (botBrain) {
      const wasAlive = botBrain.alive;
      botBrain.hp = entry.hp;
      botBrain.alive = entry.alive;
      if (!wasAlive && botBrain.alive && info && info.snap) {
        botBrain.visual.group.position.copy(entry.pos);
        botBrain.visual.group.rotation.y = entry.yaw;
        botBrain.yaw = entry.yaw;
        resetArenaBotBrain(botBrain);
      }
    }
    return entry;
  }

  function removeRemoteAvatar(uid) {
    const entry = remoteAvatars.get(uid);
    if (!entry) return;
    if (entry.visual) {
      if (entry.visual.group.parent) entry.visual.group.parent.remove(entry.visual.group);
      disposeAvatarAuxVisuals(entry.visual);
    }
    remoteAvatars.delete(uid);
    arenaBotAi.delete(uid);
  }

  // ---------- Firing, Hitscan & Damage Resolution ----------
  function triggerHitmarker(isHeadshot, isKill) {
    state.hitmarkerTimer = isKill ? 0.24 : 0.16;
    state.hitmarkerHeadshot = Boolean(isHeadshot);
    state.hitmarkerKill = Boolean(isKill);
    if (root.WeaponAudio) {
      if (isKill) root.WeaponAudio.killConfirm();
      else root.WeaponAudio.hitmarker(isHeadshot);
    }
  }

  function tryFire(origin, forwardDir, opts) {
    const o = opts || {};
    if (state.fireCooldown > 0 || state.reloading) return { fired: false };

    const slot = state.activeSlot;
    const isKnife = slot === 'melee';
    const build = getActiveBuild(slot);
    const weaponId = isKnife ? 'knife' : (build ? build.weaponId : 'rifle');

    if (!isKnife) {
      if (!build) return { fired: false };
      if (state.ammo[slot] <= 0) {
        if (root.WeaponAudio) root.WeaponAudio.dryFire();
        startReload();
        return { fired: false, empty: true };
      }
      state.ammo[slot] -= 1;
      state.fireCooldown = build.fireInterval;
      if (root.WeaponAudio) root.WeaponAudio.fireWeapon(weaponId, { suppressed: build.suppressed });
      if (root.ViewmodelSystem) root.ViewmodelSystem.triggerFireRecoil(weaponId);
    } else {
      state.fireCooldown = o.heavy ? 0.65 : 0.42;
      if (root.ViewmodelSystem) root.ViewmodelSystem.triggerFireRecoil('knife');
    }

    const maxRange = isKnife ? 3.2 : (weaponId === 'revolver' ? 999999 : build.range);
    const solidList = o.solidMeshes || (typeof root.solidMeshes !== 'undefined' ? root.solidMeshes : []);
    const pellets = isKnife ? 1 : Math.max(1, build.pellets || 1);

    // Base spread interpolated cleanly between hipfire and True ADS
    let baseSpread = 0;
    if (!isKnife) {
      const moveSpeed = Number(o.moveSpeed) || 0;
      const airborne = Boolean(o.airborne);
      const adsT = state.adsProgress;
      const chronoW = state.chronoActive ? state.chronoWeight : 0;
      const chronoAirMul = chronoW > 0 && build.chronoAirSpreadMul
        ? (1 + (build.chronoAirSpreadMul - 1) * chronoW)
        : 1;
      baseSpread = weaponId === 'revolver' ? 0 : build.spreadHip + (build.spreadAds - build.spreadHip) * adsT;
      if (weaponId !== 'revolver') {
        if (moveSpeed > 3.5) baseSpread += Math.min(build.spreadMove, (moveSpeed - 3.5) * 0.00075) * (1 - adsT * 0.35) * (1 - chronoW * 0.25);
        if (airborne) baseSpread += ((weaponId === 'awp' && adsT < 0.6) ? 0.018 : (0.0042 * (1 - adsT * 0.35))) * chronoAirMul;
        baseSpread += state.spreadBloom;
        state.spreadBloom = Math.min(0.026, state.spreadBloom + (build.auto ? 0.0028 : 0.0052));
      }
    }

    // Collect shootable meshes once for all pellets
    const shootables = [];
    if (rangeResetMesh) shootables.push(rangeResetMesh);
    for (const t of targets) {
      if (t.alive) shootables.push(t.headMesh, t.bodyMesh);
    }
    if (warmupEnabled) {
      for (const b of warmupBots) {
        if (b.alive) shootables.push(b.visual.headMesh, b.visual.bodyMesh);
      }
    }
    for (const [, av] of remoteAvatars) {
      if (av.alive) shootables.push(av.visual.headMesh, av.visual.bodyMesh);
    }

    const tracerColors = {
      standard: weaponId === 'awp' ? 0x7ef2ff : weaponId === 'deagle' ? 0xffcf70 : 0xffe8a6,
      brass: 0xffd15c,
      crimson: 0xff5e78,
      cyan: 0x4ef2ff,
      stealth: 0
    };
    const tracerCol = isKnife ? 0 : (tracerColors[build.tracerStyle] ?? 0xffe8a6);

    const result = {
      fired: true,
      slot: weaponId,
      loadoutSlot: slot,
      weaponId,
      weaponName: isKnife ? 'Knife' : build.name,
      origin: origin.clone(),
      dir: forwardDir.clone().normalize(),
      endPoint: origin.clone().addScaledVector(forwardDir, maxRange),
      hitKind: 'world',
      hitId: null,
      isHeadshot: false,
      damage: 0,
      killed: false,
      distance: maxRange,
      recoilPitch: isKnife ? 0 : build.recoilPitch * (1 - state.adsProgress * 0.18),
      recoilYaw: isKnife ? 0 : (Math.random() - 0.5) * 2 * build.recoilYaw * (1 - state.adsProgress * 0.22)
    };

    const playerDmgMap = new Map();
    const botDmgMap = new Map();

    for (let pIdx = 0; pIdx < pellets; pIdx++) {
      _rayOrigin.copy(origin);
      _rayDir.copy(forwardDir).normalize();

      const pelletCone = !isKnife ? (baseSpread + (pellets > 1 ? build.pelletSpread : 0)) : 0;
      if (pelletCone > 0.0001) {
        _right.crossVectors(_rayDir, _worldUp).normalize();
        if (_right.lengthSq() < 0.001) _right.set(1, 0, 0);
        _up.crossVectors(_right, _rayDir).normalize();
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * pelletCone;
        _rayDir.addScaledVector(_right, Math.cos(angle) * rad).addScaledVector(_up, Math.sin(angle) * rad).normalize();
      }

      _combatRay.set(_rayOrigin, _rayDir);
      _combatRay.near = 0.08;
      _combatRay.far = maxRange;

      let closestWorldDist = maxRange;
      if (solidList && solidList.length > 0) {
        const worldHits = _combatRay.intersectObjects(solidList, false);
        if (worldHits.length > 0) closestWorldDist = worldHits[0].distance;
      }

      let bestHit = null;
      if (shootables.length > 0) {
        const dynHits = _combatRay.intersectObjects(shootables, false);
        for (const h of dynHits) {
          if (h.distance <= closestWorldDist + 0.05) {
            bestHit = h;
            break;
          }
        }
      }

      const hitDist = bestHit ? bestHit.distance : closestWorldDist;
      const endPoint = _tmpB.copy(_rayOrigin).addScaledVector(_rayDir, hitDist).clone();
      if (pIdx === 0) {
        result.dir.copy(_rayDir);
        result.endPoint.copy(endPoint);
        result.distance = hitDist;
      }

      // Draw tracer unless suppressed Subsonic stealth round
      if (!isKnife && tracerCol && (pellets === 1 || pIdx < 4)) {
        _right.crossVectors(_rayDir, _worldUp).normalize();
        const muzzleStart = _rayOrigin.clone()
          .addScaledVector(_rayDir, 0.55)
          .addScaledVector(_right, state.adsProgress > 0.45 ? 0.0 : 0.14)
          .addScaledVector(_worldUp, state.adsProgress > 0.45 ? -0.03 : -0.10);
        spawnTracer(muzzleStart, endPoint, tracerCol);
      }

      if (!bestHit) {
        if (!isKnife && closestWorldDist < maxRange && pIdx < 3) {
          spawnBurst(endPoint, 0xffe2a0, pellets > 1 ? 2 : 5, 4.2);
        }
        continue;
      }

      const ud = bestHit.object.userData || {};

      // Case A: Sandbox Range Reset Switch
      if (ud.isRangeReset) {
        result.hitKind = 'range_reset';
        resetTargets();
        spawnBurst(endPoint, 0x7dff9e, 12, 6.0);
        if (root.WeaponAudio) root.WeaponAudio.targetShatter(true);
        break;
      }

      // Case B: Holographic Target (Range or Gauntlet)
      if (typeof ud.targetIndex === 'number') {
        const tgt = targets[ud.targetIndex];
        if (tgt && tgt.alive) {
          const isHead = ud.targetRole === 'head';
          tgt.alive = false;
          tgt.group.visible = false;
          result.hitKind = 'target';
          result.hitId = tgt.id;
          result.isHeadshot = result.isHeadshot || isHead;
          result.killed = true;
          spawnBurst(bestHit.point, isHead ? 0xffb347 : 0x56eeff, isHead ? 14 : 10, 7.2);
          triggerHitmarker(isHead, false);
          if (root.WeaponAudio) root.WeaponAudio.targetShatter(isHead);

          if (!isKnife && onWeaponXpCb && LS) {
            onWeaponXpCb({
              weaponId,
              source: isHead ? 'bullseye' : 'target',
              amount: isHead ? LS.XP_REWARDS.bullseyeHit : LS.XP_REWARDS.targetHit,
              isHeadshot: isHead
            });
          }

          if (targetMode === 'range') {
            if (!rangeStats.active && rangeStats.hits === 0) {
              rangeStats.active = true;
              rangeStats.startTime = performance.now();
            }
            rangeStats.hits += 1;
            if (isHead) rangeStats.headshots += 1;
            if (rangeStats.hits >= rangeStats.total) {
              rangeStats.active = false;
              rangeStats.clearTime = (performance.now() - rangeStats.startTime) / 1000;
              if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
            }
            updateRangeScoreboard();
          } else if (targetMode === 'gauntlet') {
            gauntletHits += 1;
            if (onTargetProgressCb) onTargetProgressCb(getTargetProgress());
          }
        }
        continue;
      }

      // Case C: Solo Arena / Sandbox Adaptive Bot (aggregate pellet damage cleanly!)
      if (typeof ud.botIndex === 'number') {
        const bot = warmupBots[ud.botIndex];
        if (bot && bot.alive) {
          const isHead = ud.hitbox === 'head';
          const dmg = isKnife
            ? (o.heavy ? 100 : 55)
            : (LS ? LS.computeDistanceDamage(build, hitDist, isHead, true) : (isHead ? build.damageHead : build.damageBody));
          if (root.BotAISystem && typeof root.BotAISystem.alertBotDamage === 'function') {
            root.BotAISystem.alertBotDamage(bot, origin);
          }
          const prev = botDmgMap.get(ud.botIndex) || { bot, dmg: 0, isHead: false, point: bestHit.point };
          prev.dmg += dmg;
          prev.isHead = prev.isHead || isHead;
          prev.point = bestHit.point;
          botDmgMap.set(ud.botIndex, prev);
        }
        continue;
      }

      // Case D: Remote WebRTC Player Avatar (aggregate pellet damage cleanly!)
      if (ud.remoteUid) {
        const av = remoteAvatars.get(ud.remoteUid);
        if (av && av.alive) {
          const isHead = ud.hitbox === 'head';
          const dmg = isKnife
            ? (o.heavy ? 100 : 55)
            : (LS ? LS.computeDistanceDamage(build, hitDist, isHead, false) : (isHead ? build.damageHead : build.damageBody));
          const hostBot = arenaBotAi.get(ud.remoteUid);
          if (hostBot && root.BotAISystem && typeof root.BotAISystem.alertBotDamage === 'function') {
            root.BotAISystem.alertBotDamage(hostBot, origin);
          }
          const prev = playerDmgMap.get(ud.remoteUid) || { uid: ud.remoteUid, dmg: 0, isHead: false, point: bestHit.point };
          prev.dmg += dmg;
          prev.isHead = prev.isHead || isHead;
          prev.point = bestHit.point;
          playerDmgMap.set(ud.remoteUid, prev);
        }
      }
    }

    // Resolve aggregated Warmup Bot hits
    for (const entry of botDmgMap.values()) {
      const { bot, dmg, isHead, point } = entry;
      bot.hp = Math.max(0, bot.hp - dmg);
      const ratio = bot.hp / 100;
      bot.visual.hpFill.scale.x = Math.max(0.001, ratio);
      bot.visual.hpFill.position.x = -(1 - ratio) * 0.455;
      bot.visual.hpFill.material.color.setHex(ratio > 0.5 ? 0x62f58a : ratio > 0.25 ? 0xffc857 : 0xff4d6d);
      result.hitKind = 'bot';
      result.hitId = bot.name;
      result.isHeadshot = result.isHeadshot || isHead;
      result.damage += dmg;
      spawnBurst(point, isHead ? 0xffb347 : 0xff5e78, isHead ? 12 : 7, 6.2);

      if (bot.hp <= 0) {
        bot.alive = false;
        bot.respawnTimer = 2.4;
        bot.chronoTier = 0;
        bot.grapplePoint = null;
        bot.visual.group.visible = false;
        updateAvatarChronoVisual(bot.visual, 0, 0);
        updateAvatarGrappleVisual(bot.visual, null, null);
        result.killed = true;
        warmupKills += 1;
        if (root.BotAISystem && typeof root.BotAISystem.recordPlayerKill === 'function') {
          root.BotAISystem.recordPlayerKill();
        }
        triggerHitmarker(isHead, true);
        if (!isKnife && onWeaponXpCb && LS) {
          const baseXp = isHead ? LS.XP_REWARDS.botHeadshot : LS.XP_REWARDS.botKill;
          const amount = (root.BotAISystem && typeof root.BotAISystem.computeBotXpReward === 'function')
            ? root.BotAISystem.computeBotXpReward(baseXp)
            : baseXp;
          onWeaponXpCb({
            weaponId,
            source: isHead ? 'bot_headshot' : 'bot_kill',
            amount,
            isHeadshot: isHead
          });
        }
        if (onWarmupKillCb) onWarmupKillCb({ botName: bot.name, slot: weaponId, weaponId, isHeadshot: isHead, totalKills: warmupKills });
      } else {
        triggerHitmarker(isHead, false);
      }
    }

    // Resolve aggregated Remote Player hits (pick highest-damage hit target for netcode event)
    if (playerDmgMap.size > 0) {
      let top = null;
      for (const entry of playerDmgMap.values()) {
        if (!top || entry.dmg > top.dmg) top = entry;
      }
      if (top) {
        result.hitKind = 'player';
        result.hitId = top.uid;
        result.isHeadshot = top.isHead;
        result.damage = top.dmg;
        spawnBurst(top.point, top.isHead ? 0xffb347 : 0xff4d6d, top.isHead ? 12 : 7, 6.5);
        triggerHitmarker(top.isHead, false);
      }
    }

    // Bolt-action AWP unscopes cleanly on shot so player sees bolt cycle
    if (weaponId === 'awp' && state.adsHeld) {
      clearScope();
    }

    // Auto-reload when magazine hits 0
    if (!isKnife && state.ammo[slot] === 0) {
      setTimeout(() => {
        if (state.activeSlot === slot && state.ammo[slot] === 0 && !state.reloading) {
          startReload();
        }
      }, weaponId === 'awp' ? 480 : 180);
    }

    return result;
  }

  function triggerDamageFlash() {
    state.damageFlashTimer = 0.26;
  }

  // ---------- Per-Frame Update (Zero Allocations) ----------
  let animClock = 0;
  function update(dt, playerState, solidMeshes, movementContext) {
    const playerPos = playerState && (playerState.position || playerState.pos || playerState);
    const playerAlive = !playerState || playerState.alive !== false;
    const playerEye = playerState && Number(playerState.eye) > 0 ? Number(playerState.eye) : 1.6;
    const botTargetPos = playerPos
      ? _botTargetPos.set(playerPos.x, playerPos.y + Math.min(1.2, playerEye * 0.72), playerPos.z)
      : null;
    const botSolids = Array.isArray(solidMeshes) ? solidMeshes : [];
    const botPlayerState = { alive: playerAlive, eye: playerEye, uid: 'local' };
    animClock += dt;
    if (state.fireCooldown > 0) state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    if (state.spreadBloom > 0) state.spreadBloom = Math.max(0, state.spreadBloom - dt * 0.055);
    if (state.hitmarkerTimer > 0) state.hitmarkerTimer = Math.max(0, state.hitmarkerTimer - dt);
    if (state.damageFlashTimer > 0) state.damageFlashTimer = Math.max(0, state.damageFlashTimer - dt);

    // ADS follows only the input/reload state. Viewmodel draw readiness must
    // never reverse the transition while the player is still holding aim.
    const activeBuild = getActiveBuild(state.activeSlot);
    const adsTarget = Boolean(activeBuild && state.adsHeld && !state.reloading);
    const adsDur = activeBuild ? activeBuild.adsTimeSec : 0.18;
    state.adsProgress = advanceAdsProgress(state.adsProgress, adsTarget, dt, adsDur);

    // Apex Chrono Hangtime personal temporal dilation (meter-free, activates on ADS when equipped)
    const wasChronoActive = state.chronoActive;
    const chronoTarget = Boolean(activeBuild && activeBuild.hasChronoKit && adsTarget && state.adsProgress >= 0.18);
    const rampIn = activeBuild && activeBuild.chronoRampIn ? activeBuild.chronoRampIn : 0.14;
    const rampOut = activeBuild && activeBuild.chronoRampOut ? activeBuild.chronoRampOut : 0.14;
    state.chronoWeight = advanceChronoState(state.chronoWeight, chronoTarget, dt, rampIn, rampOut);
    const targetChronoScale = activeBuild && activeBuild.hasChronoKit ? activeBuild.chronoTimeScale : 1.0;
    state.chronoTimeScale = 1.0 + (targetChronoScale - 1.0) * state.chronoWeight;
    state.chronoActive = state.chronoWeight > 0.08;
    state.chronoTier = state.chronoActive && activeBuild ? (activeBuild.chronoTier || 1) : 0;
    state.chronoLabel = state.chronoActive && activeBuild ? (activeBuild.chronoLabel || 'CHRONO HANG') : '';
    if (!wasChronoActive && state.chronoActive && root.WeaponAudio && typeof root.WeaponAudio.chronoEnter === 'function') {
      root.WeaponAudio.chronoEnter(state.chronoTier);
    } else if (wasChronoActive && !state.chronoActive && root.WeaponAudio && typeof root.WeaponAudio.chronoExit === 'function') {
      root.WeaponAudio.chronoExit();
    }

    if (state.reloading) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        state.reloading = false;
        const build = getActiveBuild(state.activeSlot);
        if (build) state.ammo[state.activeSlot] = build.magSize;
        if (root.WeaponAudio) root.WeaponAudio.reloadFinish();
      }
    }

    // Update pooled tracers
    for (let i = 0; i < tracers.length; i++) {
      const t = tracers[i];
      if (t.life > 0) {
        t.life -= dt;
        if (t.life <= 0) {
          t.mesh.visible = false;
        } else {
          t.mesh.material.opacity = (t.life / t.maxLife) * 0.92;
        }
      }
    }

    // Update pooled sparks
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      if (s.life > 0) {
        s.life -= dt;
        if (s.life <= 0) {
          s.mesh.visible = false;
        } else {
          s.vel.y -= 16 * dt;
          s.mesh.position.addScaledVector(s.vel, dt);
          s.mesh.material.opacity = s.life / s.maxLife;
        }
      }
    }

    // Update patrolling holographic targets
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive) continue;
      if (t.patrolRange > 0.01) {
        const off = Math.sin(animClock * t.patrolSpeed + t.phase) * t.patrolRange;
        if (t.patrolAxis === 'z') t.group.position.z = t.baseZ + off;
        else t.group.position.x = t.baseX + off;
      }
      t.group.position.y = t.baseY + Math.sin(animClock * 2.6 + t.phase) * 0.08;
    }

    // Refresh Sandbox Range live timer on scoreboard while active
    if (targetMode === 'range' && rangeStats.active) {
      updateRangeScoreboard();
    }

    // Update Solo Warmup & Sandbox Adaptive AI Bots via BotAISystem
    if (warmupEnabled && root.BotAISystem && typeof root.BotAISystem.stepBot === 'function') {
      const BAI = root.BotAISystem;
      const localTarget = playerPos ? {
        uid: 'local',
        position: playerPos,
        velocity: (playerState && playerState.velocity) || null,
        eye: playerEye,
        hp: playerState && Number.isFinite(playerState.hp) ? playerState.hp : 100,
        alive: playerAlive,
        chronoTier: state.chronoTier || 0
      } : null;

      for (let i = 0; i < warmupBots.length; i++) {
        const bot = warmupBots[i];
        if (!bot.alive) {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0 && warmupSpawns.length > 0) {
            let spawn = warmupSpawns[Math.floor(Math.random() * warmupSpawns.length)];
            if (playerPos) {
              let farthest = -1;
              for (const candidate of warmupSpawns) {
                const dx = candidate.x - playerPos.x;
                const dz = candidate.z - playerPos.z;
                const score = dx * dx + dz * dz + Math.random() * 18;
                if (score > farthest) {
                  farthest = score;
                  spawn = candidate;
                }
              }
            }
            const spawnYaw = playerPos
              ? Math.atan2(-(playerPos.x - spawn.x), -(playerPos.z - spawn.z))
              : (spawn.yaw || 0);
            BAI.resetBotState(bot, spawn, spawnYaw);
            bot.hp = 100;
            bot.alive = true;
            bot.visual.hpFill.scale.x = 1;
            bot.visual.hpFill.position.x = 0;
            bot.visual.hpFill.material.color.setHex(0x62f58a);
            bot.visual.group.visible = true;
          }
          continue;
        }
        BAI.stepBot(bot, dt, {
          config: movementContext && movementContext.config,
          solids: movementContext && movementContext.solids,
          solidMeshes: botSolids,
          pads: movementContext && movementContext.pads,
          boosters: movementContext && movementContext.boosters,
          teleporters: movementContext && movementContext.teleporters,
          abilitiesAllowed: !movementContext || movementContext.abilitiesAllowed !== false,
          viewerPos: playerPos,
          target: localTarget,
          callbacks: {
            spawnTracer,
            spawnBurst,
            updateChronoVisual: updateAvatarChronoVisual,
            updateGrappleVisual: updateAvatarGrappleVisual,
            onDamage: (damage, weapon, isHeadshot) => {
              if (root.NetcodeSystem && typeof root.NetcodeSystem.applyWarmupDamage === 'function') {
                root.NetcodeSystem.applyWarmupDamage(damage, bot.name, weapon, Boolean(isHeadshot));
              }
            }
          }
        });
      }
    }

    // Only the host simulates live AI; all clients receive the bots as regular
    // replicated player avatars and use normal hitscan hitboxes.
    updateArenaBots(dt, {
      uid: playerState && playerState.uid,
      position: playerPos,
      velocity: playerState && playerState.velocity,
      eye: playerEye,
      alive: playerAlive,
      isHost: Boolean(playerState && playerState.isHost),
      phase: playerState && playerState.phase,
      players: playerState && playerState.players,
      hp: playerState && playerState.hp,
      mode: playerState && playerState.mode
    }, botSolids, movementContext);

    // Smoothly interpolate Remote WebRTC Player Avatars
    const lerpK = Math.min(1, dt * 16);
    for (const [, av] of remoteAvatars) {
      if (!av.alive) continue;
      av.pos.lerp(av.targetPos, lerpK);
      av.visual.group.position.copy(av.pos);
      let dyaw = av.targetYaw - av.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      av.yaw += dyaw * lerpK;
      av.visual.group.rotation.y = av.yaw;
      if (playerPos) {
        av.visual.hpBg.lookAt(playerPos.x, av.pos.y + 2.16, playerPos.z);
        av.visual.hpFill.lookAt(playerPos.x, av.pos.y + 2.16, playerPos.z);
      }
      updateAvatarChronoVisual(av.visual, av.alive ? av.chronoTier : 0, dt);
      updateAvatarGrappleVisual(av.visual, av.pos, av.alive ? av.grapplePoint : null);
    }
  }

  return {
    MISSED_TARGET_PENALTY_SEC,
    DUEL_WIN_ROUNDS,
    FFA_WIN_KILLS,
    SLOTS,
    advanceAdsProgress,
    advanceChronoState,
    computeGauntletSummary,
    evaluateDuelRoundResult,
    evaluateFfaScoreboard,
    ensureInit,
    applyLoadout,
    switchSlot,
    quickSwitch,
    cycleSlot,
    resetAmmo,
    startReload,
    setAdsHeld,
    cycleScopeZoom,
    toggleScope,
    clearScope,
    getScopeFovMultiplier,
    getScopeSensMultiplier,
    getScopeOverlayState,
    getChronoState,
    getActiveMobilityProfile,
    getActiveBuild,
    getActiveWeaponType,
    tryFire,
    spawnTracer,
    spawnBurst,
    triggerHitmarker,
    triggerDamageFlash,
    setupTargets,
    clearTargets,
    resetTargets,
    getTargetProgress,
    setOnTargetProgress: (cb) => { onTargetProgressCb = cb; },
    setOnWeaponXp: (cb) => { onWeaponXpCb = cb; },
    setupWarmupBots,
    clearWarmupBots,
    hasActiveWarmupBots,
    chooseBotMovementIntent,
    setWarmupBotsVisible,
    setOnWarmupKill: (cb) => { onWarmupKillCb = cb; },
    upsertRemoteAvatar,
    updateAvatarChronoVisual,
    updateAvatarGrappleVisual,
    createPauseAvatar: () => createAvatarMesh({ name: 'RUNNER', accentColor: 0x65e7ff, isBot: false }),
    syncArenaBots,
    removeRemoteAvatar,
    clearRemoteAvatars,
    update,
    getState: () => {
      const b = getActiveBuild(state.activeSlot);
      return {
        activeSlot: state.activeSlot,
        weaponId: getActiveWeaponType(state.activeSlot),
        weaponName: b ? b.name : 'Melee',
        weaponShortName: b ? b.shortName : 'Knife',
        primaryBuild: state.builds.primary,
        secondaryBuild: state.builds.secondary,
        activeBuild: b,
        auto: Boolean(b && b.auto),
        loadoutName: state.loadoutName,
        ammo: state.activeSlot === 'melee' ? null : (state.ammo[state.activeSlot] ?? null),
        magSize: b ? b.magSize : null,
        reloading: state.reloading,
        reloadPct: state.reloading && state.reloadDuration > 0 ? 1 - Math.max(0, state.reloadTimer / state.reloadDuration) : 1,
        adsHeld: state.adsHeld,
        adsProgress: state.adsProgress,
        scopeStage: state.scopeStage,
        scopeOverlay: getScopeOverlayState(),
        chronoWeight: state.chronoWeight,
        chronoTimeScale: state.chronoTimeScale,
        chronoTier: state.chronoTier,
        chronoActive: state.chronoActive,
        chronoLabel: state.chronoLabel,
        mobility: getActiveMobilityProfile(),
        hitmarkerTimer: state.hitmarkerTimer,
        hitmarkerHeadshot: state.hitmarkerHeadshot,
        hitmarkerKill: state.hitmarkerKill,
        damageFlashTimer: state.damageFlashTimer,
        warmupKills
      };
    }
  };
});
