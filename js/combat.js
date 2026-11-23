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

  // If running in Node unit tests without THREE, return pure helpers
  if (!root.THREE || typeof document === 'undefined') {
    return {
      MISSED_TARGET_PENALTY_SEC,
      DUEL_WIN_ROUNDS,
      FFA_WIN_KILLS,
      SLOTS,
      advanceAdsProgress,
      computeGauntletSummary,
      evaluateDuelRoundResult,
      evaluateFfaScoreboard
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
      isScopedOptic: weaponId === 'awp'
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
  const _botToTarget = new THREE.Vector3();
  const _botForward = new THREE.Vector3();
  const _botRight = new THREE.Vector3();
  const _botUp = new THREE.Vector3();
  const _botDesiredDir = new THREE.Vector3();
  const _botCandidateDir = new THREE.Vector3();
  const _botEndPoint = new THREE.Vector3();
  const _botFloorOrigin = new THREE.Vector3();
  const _botDown = new THREE.Vector3(0, -1, 0);
  const _botSightRay = new THREE.Raycaster();
  const _botShotRay = new THREE.Raycaster();
  const _botNavRay = new THREE.Raycaster();
  const _botFloorRay = new THREE.Raycaster();

  const WARMUP_BOT_ARCHETYPES = [
    { role: 'RUSHER', weapon: 'smg', preferredRange: 12, sightRange: 44, moveSpeed: 8.4, damage: 5, shotInterval: 0.22, magSize: 30, reloadTime: 1.45, aimSpread: 0.040, reaction: 0.24, color: 0xff8b47, tracer: 0xff9c62 },
    { role: 'RIFLE', weapon: 'rifle', preferredRange: 19, sightRange: 54, moveSpeed: 7.0, damage: 7, shotInterval: 0.30, magSize: 24, reloadTime: 1.75, aimSpread: 0.032, reaction: 0.38, color: 0xffbd42, tracer: 0xffc36b },
    { role: 'SKIRMISHER', weapon: 'deagle', preferredRange: 24, sightRange: 58, moveSpeed: 6.4, damage: 10, shotInterval: 0.62, magSize: 10, reloadTime: 1.95, aimSpread: 0.025, reaction: 0.48, color: 0x9b78ff, tracer: 0xb79aff }
  ];

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
    if (slot === 'deagle' || slot === 'pistol') return 'secondary';
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
    state.adsHeld = false;
    state.adsProgress = 0;
    state.scopeAltZoom = false;
    state.scopeStage = 0;
    if (root.ViewmodelSystem) {
      root.ViewmodelSystem.setAdsState(false, 0.16, false);
      root.ViewmodelSystem.setScoped(false);
    }
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

    return { group: g, headMesh: head, bodyMesh: torso, hpFill, hpBg, label, legL, legR, gunBar };
  }

  // ---------- Solo Arena Warmup Hologram Bots ----------
  function clearWarmupBots() {
    for (const bot of warmupBots) {
      if (bot.visual && bot.visual.group.parent) {
        bot.visual.group.parent.remove(bot.visual.group);
      }
    }
    warmupBots = [];
    warmupEnabled = false;
  }

  function setupWarmupBots(spawns, count = 3) {
    clearWarmupBots();
    if (!avatarGroup || !Array.isArray(spawns) || spawns.length === 0) return;
    warmupSpawns = spawns.slice();
    warmupEnabled = true;
    warmupKills = 0;
    const names = ['HOLO-ALPHA', 'HOLO-BRAVO', 'HOLO-CHARLIE', 'HOLO-DELTA'];
    const playerSpawn = spawns[0];
    const n = Math.min(count, spawns.length);
    for (let i = 0; i < n; i++) {
      const sp = spawns[(i + 1) % spawns.length];
      const profile = WARMUP_BOT_ARCHETYPES[i % WARMUP_BOT_ARCHETYPES.length];
      const visual = createAvatarMesh({ name: names[i % names.length], accentColor: profile.color, isBot: true });
      visual.headMesh.userData.botIndex = i;
      visual.headMesh.userData.hitbox = 'head';
      visual.bodyMesh.userData.botIndex = i;
      visual.bodyMesh.userData.hitbox = 'body';
      const yaw = Math.atan2(-(playerSpawn.x - sp.x), -(playerSpawn.z - sp.z));
      visual.group.position.set(sp.x, sp.y, sp.z);
      visual.group.rotation.y = yaw;
      avatarGroup.add(visual.group);
      warmupBots.push({
        index: i,
        name: names[i % names.length],
        profile,
        visual,
        hp: 100,
        alive: true,
        respawnTimer: 0,
        anchor: new THREE.Vector3(sp.x, sp.y, sp.z),
        wanderPoint: new THREE.Vector3(sp.x, sp.y, sp.z),
        lastKnownPlayer: new THREE.Vector3(playerSpawn.x, playerSpawn.y, playerSpawn.z),
        velocity: new THREE.Vector3(),
        verticalVelocity: 0,
        yaw,
        orbitDir: i % 2 === 0 ? 1 : -1,
        decisionTimer: 0.8 + i * 0.35,
        wanderTimer: 0,
        aimTimer: 0,
        alertTimer: 0,
        alertOnNextUpdate: false,
        magazine: profile.magSize,
        reloadTimer: 0,
        fireCooldown: 0.45 + i * 0.17,
        strafePhase: i * 1.9
      });
    }
  }

  function warmupBotFloorAt(x, z, currentY, solidList) {
    if (!solidList || solidList.length === 0) return currentY;
    _botFloorOrigin.set(x, currentY + 2.7, z);
    _botFloorRay.set(_botFloorOrigin, _botDown);
    _botFloorRay.near = 0.05;
    // A long downward probe lets bots step off elevated platforms and continue
    // fighting on the arena floor instead of treating every drop as a wall.
    _botFloorRay.far = 24.0;
    const hits = _botFloorRay.intersectObjects(solidList, false);
    for (const hit of hits) {
      const floorY = hit.point.y;
      // Follow ramps and ledges, while allowing a controlled drop of up to 20m.
      if (floorY <= currentY + 0.9 && floorY >= currentY - 20.4) return floorY;
    }
    return null;
  }

  function warmupBotCanSeePlayer(bot, playerPos, targetPos, solidList, distance) {
    const profile = bot.profile;
    if (distance > profile.sightRange) return false;
    const dx = playerPos.x - bot.visual.group.position.x;
    const dz = playerPos.z - bot.visual.group.position.z;
    const horizontalLen = Math.max(0.001, Math.hypot(dx, dz));
    _botForward.set(-Math.sin(bot.yaw), 0, -Math.cos(bot.yaw));
    _botDirection.set(dx / horizontalLen, 0, dz / horizontalLen);
    const facingDot = _botForward.dot(_botDirection);
    if (facingDot < (bot.alertTimer > 0 ? -0.58 : -0.08)) return false;

    _botOrigin.set(
      bot.visual.group.position.x,
      bot.visual.group.position.y + 1.22,
      bot.visual.group.position.z
    );
    _botDirection.subVectors(targetPos, _botOrigin);
    const rayDistance = _botDirection.length();
    if (rayDistance < 0.1) return true;
    _botDirection.divideScalar(rayDistance);
    _botSightRay.set(_botOrigin, _botDirection);
    _botSightRay.near = 0.08;
    _botSightRay.far = Math.max(0.08, rayDistance - 0.45);
    if (!solidList || solidList.length === 0) return true;
    return _botSightRay.intersectObjects(solidList, false).length === 0;
  }

  function warmupBotClearance(origin, direction, solidList) {
    if (!solidList || solidList.length === 0) return 2.5;
    _botNavRay.set(origin, direction);
    _botNavRay.near = 0.08;
    _botNavRay.far = 2.5;
    const hits = _botNavRay.intersectObjects(solidList, false);
    return hits.length > 0 ? hits[0].distance : 2.5;
  }

  function steerWarmupBotAroundWalls(bot, direction, solidList) {
    if (direction.lengthSq() < 0.001) return;
    _botOrigin.set(
      bot.visual.group.position.x,
      bot.visual.group.position.y + 0.95,
      bot.visual.group.position.z
    );
    if (warmupBotClearance(_botOrigin, direction, solidList) > 1.35) return;

    const turn = bot.orbitDir >= 0 ? 1 : -1;
    const c = Math.cos(1.05);
    const s = Math.sin(1.05) * turn;
    _botCandidateDir.set(
      direction.x * c - direction.z * s,
      0,
      direction.x * s + direction.z * c
    ).normalize();
    const firstClearance = warmupBotClearance(_botOrigin, _botCandidateDir, solidList);

    _botCandidateDir.set(
      direction.x * c + direction.z * s,
      0,
      -direction.x * s + direction.z * c
    ).normalize();
    const secondClearance = warmupBotClearance(_botOrigin, _botCandidateDir, solidList);

    if (firstClearance > secondClearance && firstClearance > 0.75) {
      _botCandidateDir.set(
        direction.x * c - direction.z * s,
        0,
        direction.x * s + direction.z * c
      ).normalize();
      direction.copy(_botCandidateDir);
    } else if (secondClearance > 0.75) {
      direction.copy(_botCandidateDir);
    } else {
      direction.negate();
    }
  }

  function fireWarmupBot(bot, targetPos, solidList, onDamage, onShot) {
    const profile = bot.profile;
    if (bot.reloadTimer > 0 || bot.magazine <= 0) return false;
    _botOrigin.set(
      bot.visual.group.position.x,
      bot.visual.group.position.y + 1.22,
      bot.visual.group.position.z
    );
    _botToTarget.subVectors(targetPos, _botOrigin);
    const targetDistance = _botToTarget.length();
    if (targetDistance < 0.1 || targetDistance > profile.sightRange) return false;
    _botDirection.copy(_botToTarget).divideScalar(targetDistance);

    _botRight.crossVectors(_botDirection, _worldUp).normalize();
    if (_botRight.lengthSq() < 0.001) _botRight.set(1, 0, 0);
    _botUp.crossVectors(_botRight, _botDirection).normalize();

    const settle = Math.min(1, bot.aimTimer / 0.7);
    const movingPenalty = bot.velocity.length() > 3.2 ? 0.009 : 0.003;
    const spread = profile.aimSpread * (1.25 - settle * 0.48) + movingPenalty;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * spread;
    _botDirection
      .addScaledVector(_botRight, Math.cos(angle) * radius)
      .addScaledVector(_botUp, Math.sin(angle) * radius)
      .normalize();

    _botShotRay.set(_botOrigin, _botDirection);
    _botShotRay.near = 0.08;
    _botShotRay.far = profile.sightRange;
    const blockers = solidList && solidList.length
      ? _botShotRay.intersectObjects(solidList, false)
      : [];
    const wallDistance = blockers.length > 0 ? blockers[0].distance : Infinity;
    const alongRay = _botToTarget.dot(_botDirection);
    const missDistanceSq = Math.max(0, _botToTarget.lengthSq() - alongRay * alongRay);
    const hitsPlayer = alongRay > 0 &&
      alongRay <= profile.sightRange &&
      missDistanceSq <= 0.46 * 0.46 &&
      wallDistance >= alongRay - 0.28;

    let endDistance = Math.min(profile.sightRange, wallDistance);
    if (hitsPlayer) endDistance = Math.min(endDistance, alongRay);
    _botEndPoint.copy(_botOrigin).addScaledVector(_botDirection, endDistance);
    spawnTracer(_botOrigin, _botEndPoint, profile.tracer);
    if (typeof onShot === 'function') onShot(bot, _botOrigin, _botEndPoint, profile.weapon);

    bot.magazine -= 1;
    bot.fireCooldown = profile.shotInterval * (0.92 + Math.random() * 0.16);
    if (root.WeaponAudio) root.WeaponAudio.fireWeapon(profile.weapon, { suppressed: false });

    if (hitsPlayer) {
      const falloff = Math.max(0.82, 1 - (targetDistance / profile.sightRange) * 0.18);
      const damage = Math.max(3, Math.round(profile.damage * falloff));
      if (typeof onDamage === 'function') {
        onDamage(damage, profile.weapon);
      } else if (root.NetcodeSystem && typeof root.NetcodeSystem.applyWarmupDamage === 'function') {
        root.NetcodeSystem.applyWarmupDamage(damage, bot.name, profile.weapon, false);
      }
      spawnBurst(_botEndPoint, 0xff5e78, 4, 2.8);
    } else if (blockers.length > 0 && blockers[0].distance < profile.sightRange) {
      spawnBurst(_botEndPoint, 0xffb347, 2, 2.2);
    }
    return hitsPlayer;
  }

  function updateWarmupBot(bot, dt, playerState, playerPos, targetPos, solidList, onDamage, onShot) {
    const profile = bot.profile;
    const group = bot.visual.group;
    bot.alertTimer = Math.max(0, bot.alertTimer - dt);
    bot.decisionTimer -= dt;
    bot.wanderTimer -= dt;

    if (bot.alertOnNextUpdate && playerPos) {
      bot.lastKnownPlayer.copy(playerPos);
      bot.alertOnNextUpdate = false;
    }
    if (bot.decisionTimer <= 0) {
      if (Math.random() < 0.42) bot.orbitDir *= -1;
      bot.decisionTimer = 1.2 + Math.random() * 2.0;
    }

    let horizontalDistance = Infinity;
    let seesPlayer = false;
    if (playerPos && targetPos && playerState.alive !== false) {
      const dx = playerPos.x - group.position.x;
      const dz = playerPos.z - group.position.z;
      horizontalDistance = Math.hypot(dx, dz);
      const verticalDistance = targetPos.y - (group.position.y + 1.22);
      const distance3d = Math.hypot(horizontalDistance, verticalDistance);
      seesPlayer = warmupBotCanSeePlayer(bot, playerPos, targetPos, solidList, distance3d);
      if (seesPlayer) {
        bot.lastKnownPlayer.copy(playerPos);
        bot.alertTimer = 3.8;
        bot.aimTimer = Math.min(1.8, bot.aimTimer + dt);
      }
    }
    if (!seesPlayer) bot.aimTimer = Math.max(0, bot.aimTimer - dt * 1.7);

    _botDesiredDir.set(0, 0, 0);
    if (seesPlayer && horizontalDistance > 0.1) {
      const dx = playerPos.x - group.position.x;
      const dz = playerPos.z - group.position.z;
      const towardX = dx / horizontalDistance;
      const towardZ = dz / horizontalDistance;
      let radial = 0;
      if (horizontalDistance > profile.preferredRange * 1.2) radial = 1;
      else if (horizontalDistance < profile.preferredRange * 0.72) radial = -0.88;
      if (horizontalDistance < 4.4) radial = -1.1;
      const tangent = bot.orbitDir * (horizontalDistance < 5.5 ? 0.28 : 0.92);
      _botDesiredDir.set(
        towardX * radial - towardZ * tangent,
        0,
        towardZ * radial + towardX * tangent
      );
    } else if (bot.alertTimer > 0) {
      const dx = bot.lastKnownPlayer.x - group.position.x;
      const dz = bot.lastKnownPlayer.z - group.position.z;
      const len = Math.hypot(dx, dz);
      if (len > 1.25) _botDesiredDir.set(dx / len, 0, dz / len);
      else _botDesiredDir.set(-dz, 0, dx).multiplyScalar(0.35);
    } else {
      const wx = bot.wanderPoint.x - group.position.x;
      const wz = bot.wanderPoint.z - group.position.z;
      const wanderDistance = Math.hypot(wx, wz);
      if (bot.wanderTimer <= 0 || wanderDistance < 1.8) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.5 + Math.random() * 4.5;
        bot.wanderPoint.set(
          bot.anchor.x + Math.cos(angle) * radius,
          bot.anchor.y,
          bot.anchor.z + Math.sin(angle) * radius
        );
        bot.wanderTimer = 2.0 + Math.random() * 2.4;
      }
      const wx2 = bot.wanderPoint.x - group.position.x;
      const wz2 = bot.wanderPoint.z - group.position.z;
      const len = Math.hypot(wx2, wz2);
      if (len > 0.5) _botDesiredDir.set(wx2 / len, 0, wz2 / len);
    }

    // Keep bots from collapsing into the same lane or occupying the same space.
    for (const other of warmupBots) {
      if (other === bot || !other.alive) continue;
      const sx = group.position.x - other.visual.group.position.x;
      const sz = group.position.z - other.visual.group.position.z;
      const separationSq = sx * sx + sz * sz;
      if (separationSq > 0.001 && separationSq < 7.0) {
        const strength = (Math.sqrt(7.0) - Math.sqrt(separationSq)) / Math.sqrt(7.0);
        _botDesiredDir.x += (sx / Math.sqrt(separationSq)) * strength * 1.25;
        _botDesiredDir.z += (sz / Math.sqrt(separationSq)) * strength * 1.25;
      }
    }

    if (_botDesiredDir.lengthSq() > 0.001) {
      _botDesiredDir.normalize();
      steerWarmupBotAroundWalls(bot, _botDesiredDir, solidList);
    }
    const speedScale = seesPlayer && bot.aimTimer < 0.3 ? 0.78 : 1;
    const targetSpeed = profile.moveSpeed * speedScale;
    bot.velocity.x += (_botDesiredDir.x * targetSpeed - bot.velocity.x) * Math.min(1, dt * 5.2);
    bot.velocity.z += (_botDesiredDir.z * targetSpeed - bot.velocity.z) * Math.min(1, dt * 5.2);

    const nextX = group.position.x + bot.velocity.x * dt;
    const nextZ = group.position.z + bot.velocity.z * dt;
    const floorY = warmupBotFloorAt(nextX, nextZ, group.position.y, solidList);
    if (floorY == null) {
      bot.velocity.x *= 0.12;
      bot.velocity.z *= 0.12;
      bot.verticalVelocity = Math.min(0, bot.verticalVelocity);
      if (_botDesiredDir.lengthSq() > 0.01) bot.orbitDir *= -1;
    } else {
      group.position.x = nextX;
      group.position.z = nextZ;
      if (floorY < group.position.y - 0.12) {
        // Gravity-driven drops from platforms; land cleanly on the lower surface.
        bot.verticalVelocity = Math.max(-30, bot.verticalVelocity - 24 * dt);
        group.position.y = Math.max(floorY, group.position.y + bot.verticalVelocity * dt);
        if (group.position.y <= floorY + 0.001) bot.verticalVelocity = 0;
      } else {
        bot.verticalVelocity = 0;
        group.position.y += (floorY - group.position.y) * Math.min(1, dt * 12);
      }
    }

    let faceX = bot.velocity.x;
    let faceZ = bot.velocity.z;
    if (seesPlayer && playerPos) {
      faceX = playerPos.x - group.position.x;
      faceZ = playerPos.z - group.position.z;
    } else if (bot.alertTimer > 0) {
      faceX = bot.lastKnownPlayer.x - group.position.x;
      faceZ = bot.lastKnownPlayer.z - group.position.z;
    }
    if (Math.hypot(faceX, faceZ) > 0.12) {
      const targetYaw = Math.atan2(-faceX, -faceZ);
      let yawDelta = targetYaw - bot.yaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      bot.yaw += yawDelta * Math.min(1, dt * (seesPlayer ? 8.5 : 4.5));
      group.rotation.y = bot.yaw;
    }

    const strideSpeed = Math.hypot(bot.velocity.x, bot.velocity.z);
    const stride = Math.sin(animClock * (7.2 + strideSpeed * 0.35) + bot.strafePhase) *
      Math.min(0.42, strideSpeed * 0.055);
    bot.visual.legL.rotation.x = stride;
    bot.visual.legR.rotation.x = -stride;
    bot.visual.hpBg.lookAt(
      playerPos ? playerPos.x : group.position.x,
      group.position.y + 2.16,
      playerPos ? playerPos.z : group.position.z + 1
    );
    bot.visual.hpFill.lookAt(
      playerPos ? playerPos.x : group.position.x,
      group.position.y + 2.16,
      playerPos ? playerPos.z : group.position.z + 1
    );

    bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
    if (bot.reloadTimer > 0) {
      bot.reloadTimer = Math.max(0, bot.reloadTimer - dt);
      if (bot.reloadTimer === 0) bot.magazine = profile.magSize;
    } else if (bot.magazine <= 0) {
      bot.reloadTimer = profile.reloadTime;
    }
    if (seesPlayer && playerState.alive !== false && bot.fireCooldown <= 0 &&
        bot.reloadTimer <= 0 && bot.magazine > 0 && bot.aimTimer >= profile.reaction) {
      fireWarmupBot(bot, targetPos, solidList, onDamage, onShot);
    }
  }

  function setWarmupBotsVisible(visible) {
    warmupEnabled = Boolean(visible);
    for (const bot of warmupBots) {
      bot.visual.group.visible = warmupEnabled && bot.alive;
    }
  }

  // ---------- Remote WebRTC Player Avatars ----------
  function clearRemoteAvatars() {
    for (const [, av] of remoteAvatars) {
      if (av.visual && av.visual.group.parent) {
        av.visual.group.parent.remove(av.visual.group);
      }
    }
    remoteAvatars.clear();
    arenaBotAi.clear();
  }

  function resetArenaBotBrain(bot) {
    const pos = bot.visual.group.position;
    bot.anchor.copy(pos);
    bot.wanderPoint.copy(pos);
    bot.velocity.set(0, 0, 0);
    bot.verticalVelocity = 0;
    bot.aimTimer = 0;
    bot.alertTimer = 0;
    bot.alertOnNextUpdate = false;
    bot.magazine = bot.profile.magSize;
    bot.reloadTimer = 0;
    bot.fireCooldown = 0.65;
    bot.wanderTimer = 0;
    bot.decisionTimer = 0.8;
    bot.poseTimer = 0;
  }

  function syncArenaBots(players, resetBrains) {
    const wanted = new Set();
    if (!Array.isArray(players)) players = [];

    for (const player of players) {
      if (!player || !player.uid || !player.isBot) continue;
      wanted.add(player.uid);
      const profileIndex = Math.max(0, Number(player.botType) || 0) % WARMUP_BOT_ARCHETYPES.length;
      const profile = WARMUP_BOT_ARCHETYPES[profileIndex];
      const spawn = warmupSpawns[player.spawnIdx] || warmupSpawns[0] || { x: 0, y: 0.05, z: 0, yaw: 0 };
      const avatar = upsertRemoteAvatar(player.uid, {
        name: player.name || `BOT · ${profile.role}`,
        isBot: true,
        botType: profileIndex,
        x: Number.isFinite(player.x) ? player.x : spawn.x,
        y: Number.isFinite(player.y) ? player.y : spawn.y,
        z: Number.isFinite(player.z) ? player.z : spawn.z,
        yaw: Number.isFinite(player.yaw) ? player.yaw : (spawn.yaw || 0),
        hp: Number.isFinite(player.hp) ? player.hp : 100,
        alive: player.alive !== false,
        slot: player.slot || profile.weapon,
        snap: true
      });
      if (!avatar) continue;
      avatar.visual.group.position.copy(avatar.pos);
      avatar.visual.group.rotation.y = avatar.yaw;

      let bot = arenaBotAi.get(player.uid);
      if (!bot) {
        const pos = avatar.pos;
        bot = {
          uid: player.uid,
          name: player.name || `BOT · ${profile.role}`,
          profile,
          visual: avatar.visual,
          hp: avatar.hp,
          alive: avatar.alive,
          respawnTimer: 0,
          anchor: pos.clone(),
          wanderPoint: pos.clone(),
          lastKnownPlayer: pos.clone(),
          velocity: new THREE.Vector3(),
          verticalVelocity: 0,
          yaw: avatar.yaw,
          orbitDir: profileIndex % 2 === 0 ? 1 : -1,
          decisionTimer: 0.8 + profileIndex * 0.3,
          wanderTimer: 0,
          aimTimer: 0,
          alertTimer: 0,
          alertOnNextUpdate: false,
          magazine: profile.magSize,
          reloadTimer: 0,
          fireCooldown: 0.65 + profileIndex * 0.16,
          strafePhase: profileIndex * 1.9,
          targetUid: '',
          poseTimer: 0
        };
        arenaBotAi.set(player.uid, bot);
      } else {
        const wasAlive = bot.alive;
        bot.name = player.name || bot.name;
        bot.profile = profile;
        bot.visual = avatar.visual;
        bot.hp = avatar.hp;
        bot.alive = avatar.alive;
        bot.yaw = avatar.yaw;
        if (resetBrains || (!wasAlive && bot.alive)) resetArenaBotBrain(bot);
      }
    }

    for (const uid of Array.from(arenaBotAi.keys())) {
      if (!wanted.has(uid)) {
        arenaBotAi.delete(uid);
        removeRemoteAvatar(uid);
      }
    }
  }

  function updateArenaBots(dt, playerState, solidList) {
    if (!playerState || !playerState.isHost || playerState.phase !== 'live' || arenaBotAi.size === 0) return;

    for (const bot of arenaBotAi.values()) {
      if (!bot.alive) continue;
      let target = null;
      let targetDistanceSq = Infinity;

      if (playerState.position && playerState.uid && playerState.alive !== false) {
        const dx = playerState.position.x - bot.visual.group.position.x;
        const dz = playerState.position.z - bot.visual.group.position.z;
        targetDistanceSq = dx * dx + dz * dz;
        target = {
          uid: playerState.uid,
          position: playerState.position,
          eye: playerState.eye || 1.6
        };
      }

      for (const [uid, avatar] of remoteAvatars) {
        if (avatar.isBot || !avatar.alive || uid === playerState.uid) continue;
        const dx = avatar.pos.x - bot.visual.group.position.x;
        const dz = avatar.pos.z - bot.visual.group.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < targetDistanceSq) {
          targetDistanceSq = d2;
          target = { uid, position: avatar.pos, eye: 1.6 };
        }
      }

      bot.targetUid = target ? target.uid : '';
      const targetAim = target
        ? _botTargetPos.set(target.position.x, target.position.y + Math.min(1.2, target.eye * 0.72), target.position.z)
        : null;

      updateWarmupBot(
        bot,
        dt,
        { alive: Boolean(target), eye: target ? target.eye : 1.6 },
        target ? target.position : null,
        targetAim,
        solidList,
        (damage, weapon) => {
          if (target && root.NetcodeSystem && typeof root.NetcodeSystem.applyBotDamage === 'function') {
            root.NetcodeSystem.applyBotDamage(bot.uid, target.uid, damage, weapon, false);
          }
        },
        (firingBot, origin, endPoint, weapon) => {
          if (root.NetcodeSystem && typeof root.NetcodeSystem.reportBotShot === 'function') {
            root.NetcodeSystem.reportBotShot(firingBot.uid, origin, endPoint, weapon);
          }
        }
      );

      const avatar = remoteAvatars.get(bot.uid);
      if (avatar) {
        avatar.pos.copy(bot.visual.group.position);
        avatar.targetPos.copy(bot.visual.group.position);
        avatar.yaw = bot.yaw;
        avatar.targetYaw = bot.yaw;
      }
      bot.poseTimer -= dt;
      if (bot.poseTimer <= 0) {
        bot.poseTimer = 1 / 12;
        if (root.NetcodeSystem && typeof root.NetcodeSystem.reportBotPose === 'function') {
          root.NetcodeSystem.reportBotPose(bot.uid, {
            x: bot.visual.group.position.x,
            y: bot.visual.group.position.y,
            z: bot.visual.group.position.z,
            yaw: bot.yaw,
            slot: bot.profile.weapon
          });
        }
      }
    }
  }

  function upsertRemoteAvatar(uid, info) {
    if (!avatarGroup || !uid) return null;
    let entry = remoteAvatars.get(uid);
    if (!entry) {
      const palette = [0xff5277, 0x56e8ff, 0xffbd42, 0x9b6bff];
      const botPalette = WARMUP_BOT_ARCHETYPES.map((p) => p.color);
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
        activeSlot: 'rifle'
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
      }
      if (typeof info.slot === 'string') {
        entry.activeSlot = info.slot;
        entry.visual.gunBar.visible = info.slot !== 'knife' && info.slot !== 'melee';
      }
    }
    return entry;
  }

  function removeRemoteAvatar(uid) {
    const entry = remoteAvatars.get(uid);
    if (!entry) return;
    if (entry.visual && entry.visual.group.parent) {
      entry.visual.group.parent.remove(entry.visual.group);
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

    const maxRange = isKnife ? 3.2 : build.range;
    const solidList = o.solidMeshes || (typeof root.solidMeshes !== 'undefined' ? root.solidMeshes : []);
    const pellets = isKnife ? 1 : Math.max(1, build.pellets || 1);

    // Base spread interpolated cleanly between hipfire and True ADS
    let baseSpread = 0;
    if (!isKnife) {
      const moveSpeed = Number(o.moveSpeed) || 0;
      const airborne = Boolean(o.airborne);
      const adsT = state.adsProgress;
      baseSpread = build.spreadHip + (build.spreadAds - build.spreadHip) * adsT;
      if (moveSpeed > 3.5) baseSpread += Math.min(build.spreadMove, (moveSpeed - 3.5) * 0.00075) * (1 - adsT * 0.35);
      if (airborne) baseSpread += (weaponId === 'awp' && adsT < 0.6) ? 0.018 : (0.0042 * (1 - adsT * 0.35));
      baseSpread += state.spreadBloom;
      state.spreadBloom = Math.min(0.026, state.spreadBloom + (build.auto ? 0.0028 : 0.0052));
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

      // Case C: Solo Arena Warmup Bot (aggregate pellet damage cleanly!)
      if (typeof ud.botIndex === 'number') {
        const bot = warmupBots[ud.botIndex];
        if (bot && bot.alive) {
          const isHead = ud.hitbox === 'head';
          const dmg = isKnife
            ? (o.heavy ? 100 : 55)
            : (LS ? LS.computeDistanceDamage(build, hitDist, isHead, true) : (isHead ? build.damageHead : build.damageBody));
          bot.alertTimer = Math.max(bot.alertTimer, 4.2);
          bot.alertOnNextUpdate = true;
          bot.aimTimer = 0;
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
        bot.visual.group.visible = false;
        result.killed = true;
        warmupKills += 1;
        triggerHitmarker(isHead, true);
        if (!isKnife && onWeaponXpCb && LS) {
          onWeaponXpCb({
            weaponId,
            source: isHead ? 'bot_headshot' : 'bot_kill',
            amount: isHead ? LS.XP_REWARDS.botHeadshot : LS.XP_REWARDS.botKill,
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
  function update(dt, playerState, solidMeshes) {
    const playerPos = playerState && (playerState.position || playerState.pos || playerState);
    const playerAlive = !playerState || playerState.alive !== false;
    const playerEye = playerState && Number(playerState.eye) > 0 ? Number(playerState.eye) : 1.6;
    const botTargetPos = playerPos
      ? _botTargetPos.set(playerPos.x, playerPos.y + Math.min(1.2, playerEye * 0.72), playerPos.z)
      : null;
    const botSolids = Array.isArray(solidMeshes) ? solidMeshes : [];
    const botPlayerState = { alive: playerAlive, eye: playerEye };
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

    // Update Solo Warmup Hologram Bots: movement, awareness, cover steering and combat.
    if (warmupEnabled) {
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
            bot.anchor.set(spawn.x, spawn.y, spawn.z);
            bot.wanderPoint.set(spawn.x, spawn.y, spawn.z);
            bot.lastKnownPlayer.set(playerPos ? playerPos.x : spawn.x, playerPos ? playerPos.y : spawn.y, playerPos ? playerPos.z : spawn.z);
            bot.velocity.set(0, 0, 0);
            bot.verticalVelocity = 0;
            bot.yaw = playerPos
              ? Math.atan2(-(playerPos.x - spawn.x), -(playerPos.z - spawn.z))
              : (spawn.yaw || 0);
            bot.visual.group.position.set(spawn.x, spawn.y, spawn.z);
            bot.visual.group.rotation.y = bot.yaw;
            bot.hp = 100;
            bot.alive = true;
            bot.alertTimer = 0;
            bot.alertOnNextUpdate = false;
            bot.aimTimer = 0;
            bot.magazine = bot.profile.magSize;
            bot.reloadTimer = 0;
            bot.fireCooldown = 0.7;
            bot.decisionTimer = 0.8 + Math.random() * 1.2;
            bot.wanderTimer = 0;
            bot.visual.hpFill.scale.x = 1;
            bot.visual.hpFill.position.x = 0;
            bot.visual.hpFill.material.color.setHex(0x62f58a);
            bot.visual.group.visible = true;
          }
          continue;
        }
        updateWarmupBot(
          bot,
          dt,
          botPlayerState,
          playerPos,
          botTargetPos,
          botSolids
        );
      }
    }

    // Only the host simulates live AI; all clients receive the bots as regular
    // replicated player avatars and use normal hitscan hitboxes.
    updateArenaBots(dt, {
      uid: playerState && playerState.uid,
      position: playerPos,
      eye: playerEye,
      alive: playerAlive,
      isHost: Boolean(playerState && playerState.isHost),
      phase: playerState && playerState.phase
    }, botSolids);

    // Smoothly interpolate Remote WebRTC Player Avatars
    const lerpK = Math.min(1, dt * 16);
    for (const [, av] of remoteAvatars) {
      if (!av.alive) continue;
      av.pos.lerp(av.targetPos, lerpK);
      av.visual.group.position.copy(av.pos);
      // Shortest-angle yaw interpolation
      let dyaw = av.targetYaw - av.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      av.yaw += dyaw * lerpK;
      av.visual.group.rotation.y = av.yaw;
      if (playerPos) {
        av.visual.hpBg.lookAt(playerPos.x, av.pos.y + 2.16, playerPos.z);
        av.visual.hpFill.lookAt(playerPos.x, av.pos.y + 2.16, playerPos.z);
      }
    }
  }

  return {
    MISSED_TARGET_PENALTY_SEC,
    DUEL_WIN_ROUNDS,
    FFA_WIN_KILLS,
    SLOTS,
    advanceAdsProgress,
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
    setWarmupBotsVisible,
    setOnWarmupKill: (cb) => { onWarmupKillCb = cb; },
    upsertRemoteAvatar,
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
