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
  const SLOTS = Object.freeze(['rifle', 'awp', 'deagle', 'knife']);

  // ---------- Pure Testable Gauntlet & Match Helpers ----------
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
      computeGauntletSummary,
      evaluateDuelRoundResult,
      evaluateFfaScoreboard
    };
  }

  const THREE = root.THREE;
  const KS = root.KnivesSystem;

  // ---------- Runtime State ----------
  let worldScene = null;
  let fxGroup = null;
  let targetGroup = null;
  let avatarGroup = null;

  const state = {
    activeSlot: 'knife',
    ammo: { rifle: 30, awp: 5, deagle: 7 },
    fireCooldown: 0,
    reloading: false,
    reloadTimer: 0,
    reloadDuration: 0,
    scopeStage: 0, // 0 = hip, 1 = 1.8x, 2 = 3.2x
    spreadBloom: 0,
    hitmarkerTimer: 0,
    hitmarkerHeadshot: false,
    hitmarkerKill: false,
    damageFlashTimer: 0
  };

  // Reusable scratch vectors (zero per-frame allocations)
  const _rayOrigin = new THREE.Vector3();
  const _rayDir = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _tmpA = new THREE.Vector3();
  const _tmpB = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _combatRay = new THREE.Raycaster();

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

  // Remote WebRTC Player Avatars
  const remoteAvatars = new Map(); // uid -> { group, headMesh, bodyMesh, labelSprite, hpBarMesh, targetPos, targetYaw, targetPitch, hp, alive, name, activeSlot }

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

  // ---------- Weapon Slot & Ammo Management ----------
  function getWeaponDef(slot) {
    const s = slot || state.activeSlot;
    return KS && KS.WEAPON_TYPES ? KS.WEAPON_TYPES[s] || null : null;
  }

  function clearScope() {
    if (state.scopeStage !== 0) {
      state.scopeStage = 0;
      if (root.ViewmodelSystem) root.ViewmodelSystem.setScoped(false);
    }
  }

  function switchSlot(slot, playDraw = true) {
    const valid = SLOTS.includes(slot) ? slot : 'knife';
    if (state.activeSlot === valid) return false;
    state.activeSlot = valid;
    state.reloading = false;
    state.reloadTimer = 0;
    state.fireCooldown = Math.min(state.fireCooldown, 0.18);
    clearScope();
    if (root.ViewmodelSystem) {
      root.ViewmodelSystem.setActiveSlot(valid, playDraw);
    }
    return true;
  }

  function cycleSlot(dir) {
    const idx = SLOTS.indexOf(state.activeSlot);
    const nextIdx = (idx + (dir > 0 ? 1 : -1) + SLOTS.length) % SLOTS.length;
    return switchSlot(SLOTS[nextIdx], true);
  }

  function resetAmmo() {
    state.ammo.rifle = KS.WEAPON_TYPES.rifle.magSize;
    state.ammo.awp = KS.WEAPON_TYPES.awp.magSize;
    state.ammo.deagle = KS.WEAPON_TYPES.deagle.magSize;
    state.reloading = false;
    state.reloadTimer = 0;
    state.fireCooldown = 0;
    state.spreadBloom = 0;
    clearScope();
  }

  function startReload() {
    const def = getWeaponDef(state.activeSlot);
    if (!def || state.reloading) return false;
    if (state.ammo[state.activeSlot] >= def.magSize) return false;
    clearScope();
    state.reloading = true;
    state.reloadDuration = def.reloadTime;
    state.reloadTimer = def.reloadTime;
    if (root.ViewmodelSystem) root.ViewmodelSystem.triggerReload(def.reloadTime);
    return true;
  }

  function toggleScope() {
    if (state.activeSlot !== 'awp' || state.reloading) return 0;
    state.scopeStage = (state.scopeStage + 1) % 3;
    if (root.ViewmodelSystem) root.ViewmodelSystem.setScoped(state.scopeStage > 0);
    if (root.WeaponAudio) root.WeaponAudio.scopeZoom(state.scopeStage);
    return state.scopeStage;
  }

  function getScopeFovMultiplier() {
    if (state.activeSlot !== 'awp') return 1.0;
    if (state.scopeStage === 2) return 0.28;
    if (state.scopeStage === 1) return 0.48;
    return 1.0;
  }

  function getScopeSensMultiplier() {
    if (state.activeSlot !== 'awp') return 1.0;
    if (state.scopeStage === 2) return 0.34;
    if (state.scopeStage === 1) return 0.54;
    return 1.0;
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
    warmupSpawns = spawns;
    warmupEnabled = true;
    warmupKills = 0;
    const names = ['HOLO-ALPHA', 'HOLO-BRAVO', 'HOLO-CHARLIE', 'HOLO-DELTA'];
    const n = Math.min(count, spawns.length);
    for (let i = 0; i < n; i++) {
      const sp = spawns[(i + 1) % spawns.length];
      const visual = createAvatarMesh({ name: names[i % names.length], accentColor: 0xff8b47, isBot: true });
      visual.headMesh.userData.botIndex = i;
      visual.headMesh.userData.hitbox = 'head';
      visual.bodyMesh.userData.botIndex = i;
      visual.bodyMesh.userData.hitbox = 'body';
      visual.group.position.set(sp.x, sp.y, sp.z);
      avatarGroup.add(visual.group);
      warmupBots.push({
        index: i,
        name: names[i % names.length],
        visual,
        hp: 100,
        alive: true,
        respawnTimer: 0,
        anchor: new THREE.Vector3(sp.x, sp.y, sp.z),
        strafeDir: i % 2 === 0 ? 1 : -1,
        strafePhase: i * 1.9,
        strafeRange: 5.5 + (i % 2) * 2.5,
        strafeSpeed: 1.45 + i * 0.22
      });
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
  }

  function upsertRemoteAvatar(uid, info) {
    if (!avatarGroup || !uid) return null;
    let entry = remoteAvatars.get(uid);
    if (!entry) {
      const palette = [0xff5277, 0x56e8ff, 0xffbd42, 0x9b6bff];
      const color = palette[remoteAvatars.size % palette.length];
      const visual = createAvatarMesh({ name: (info && info.name) || 'PLAYER', accentColor: color, isBot: false });
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
        activeSlot: 'rifle'
      };
      remoteAvatars.set(uid, entry);
    }
    if (info) {
      if (typeof info.x === 'number' && typeof info.y === 'number' && typeof info.z === 'number') {
        entry.targetPos.set(info.x, info.y, info.z);
        if (info.snap) entry.pos.copy(entry.targetPos);
      }
      if (typeof info.yaw === 'number') entry.targetYaw = info.yaw;
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
        entry.visual.gunBar.visible = info.slot !== 'knife';
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
    const isKnife = slot === 'knife';
    const def = getWeaponDef(slot);

    if (!isKnife) {
      if (!def) return { fired: false };
      if (state.ammo[slot] <= 0) {
        if (root.WeaponAudio) root.WeaponAudio.dryFire();
        startReload();
        return { fired: false, empty: true };
      }
      state.ammo[slot] -= 1;
      state.fireCooldown = def.fireInterval;
      if (root.WeaponAudio) root.WeaponAudio.fireWeapon(slot);
      if (root.ViewmodelSystem) root.ViewmodelSystem.triggerFireRecoil(slot);
    } else {
      state.fireCooldown = o.heavy ? 0.65 : 0.42;
      if (root.ViewmodelSystem) root.ViewmodelSystem.triggerFireRecoil('knife');
    }

    // Compute shot direction with crisp movement / hip-fire spread
    _rayOrigin.copy(origin);
    _rayDir.copy(forwardDir).normalize();

    if (!isKnife) {
      const moveSpeed = Number(o.moveSpeed) || 0;
      const airborne = Boolean(o.airborne);
      let spread = (slot === 'awp' && state.scopeStage === 0) ? def.spreadHip : def.spreadBase;
      if (moveSpeed > 3.5) spread += Math.min(def.spreadMove, (moveSpeed - 3.5) * 0.0008);
      if (airborne) spread += (slot === 'awp' && state.scopeStage === 0) ? 0.018 : 0.004;
      spread += state.spreadBloom;
      state.spreadBloom = Math.min(0.024, state.spreadBloom + (slot === 'rifle' ? 0.0032 : 0.006));

      if (spread > 0.0001) {
        _right.crossVectors(_rayDir, _worldUp).normalize();
        if (_right.lengthSq() < 0.001) _right.set(1, 0, 0);
        _up.crossVectors(_right, _rayDir).normalize();
        const rx = (Math.random() - 0.5) * 2 * spread;
        const ry = (Math.random() - 0.5) * 2 * spread;
        _rayDir.addScaledVector(_right, rx).addScaledVector(_up, ry).normalize();
      }
    }

    const maxRange = isKnife ? 3.2 : def.range;
    _combatRay.set(_rayOrigin, _rayDir);
    _combatRay.near = 0.08;
    _combatRay.far = maxRange;

    // 1. Solid world occlusion distance
    let closestWorldDist = maxRange;
    const solidList = o.solidMeshes || (typeof root.solidMeshes !== 'undefined' ? root.solidMeshes : []);
    if (solidList && solidList.length > 0) {
      const worldHits = _combatRay.intersectObjects(solidList, false);
      if (worldHits.length > 0) {
        closestWorldDist = worldHits[0].distance;
      }
    }

    // 2. Collect dynamic shootable meshes (targets, reset switch, warmup bots, remote avatars)
    const shootables = [];
    if (rangeResetMesh) shootables.push(rangeResetMesh);
    for (const t of targets) {
      if (t.alive) {
        shootables.push(t.headMesh, t.bodyMesh);
      }
    }
    if (warmupEnabled) {
      for (const b of warmupBots) {
        if (b.alive) {
          shootables.push(b.visual.headMesh, b.visual.bodyMesh);
        }
      }
    }
    for (const [, av] of remoteAvatars) {
      if (av.alive) {
        shootables.push(av.visual.headMesh, av.visual.bodyMesh);
      }
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

    // Tracer visual from right-lower muzzle offset so player sees clean streak
    if (!isKnife) {
      _right.crossVectors(_rayDir, _worldUp).normalize();
      const muzzleStart = _rayOrigin.clone()
        .addScaledVector(_rayDir, 0.55)
        .addScaledVector(_right, state.scopeStage > 0 ? 0.0 : 0.14)
        .addScaledVector(_worldUp, state.scopeStage > 0 ? -0.04 : -0.10);
      const tracerCol = slot === 'awp' ? 0x7ef2ff : slot === 'deagle' ? 0xffcf70 : 0xffe8a6;
      spawnTracer(muzzleStart, endPoint, tracerCol);
    }

    // Auto-unscope AWP right after firing (classic CS bolt re-cock feel)
    if (slot === 'awp' && state.scopeStage > 0) {
      clearScope();
    }

    // Auto-reload if magazine hit 0
    if (!isKnife && state.ammo[slot] === 0) {
      setTimeout(() => {
        if (state.activeSlot === slot && state.ammo[slot] === 0 && !state.reloading) {
          startReload();
        }
      }, slot === 'awp' ? 500 : 180);
    }

    const result = {
      fired: true,
      slot,
      origin: _rayOrigin.clone(),
      dir: _rayDir.clone(),
      endPoint,
      hitKind: 'world',
      hitId: null,
      isHeadshot: false,
      damage: 0,
      killed: false,
      distance: hitDist,
      recoilPitch: isKnife ? 0 : def.recoilPitch,
      recoilYaw: isKnife ? 0 : (Math.random() - 0.5) * 2 * def.recoilYaw
    };

    if (!bestHit) {
      if (!isKnife && closestWorldDist < maxRange) {
        spawnBurst(endPoint, 0xffe2a0, 5, 4.2);
      }
      return result;
    }

    const ud = bestHit.object.userData || {};

    // Case A: Sandbox Range Reset Switch
    if (ud.isRangeReset) {
      result.hitKind = 'range_reset';
      resetTargets();
      spawnBurst(endPoint, 0x7dff9e, 12, 6.0);
      if (root.WeaponAudio) root.WeaponAudio.targetShatter(true);
      return result;
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
        result.isHeadshot = isHead;
        result.killed = true;
        spawnBurst(bestHit.point, isHead ? 0xffb347 : 0x56eeff, isHead ? 14 : 10, 7.2);
        triggerHitmarker(isHead, false);
        if (root.WeaponAudio) root.WeaponAudio.targetShatter(isHead);

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
      return result;
    }

    // Case C: Solo Arena Warmup Bot
    if (typeof ud.botIndex === 'number') {
      const bot = warmupBots[ud.botIndex];
      if (bot && bot.alive) {
        const isHead = ud.hitbox === 'head';
        const dmg = isKnife ? (o.heavy ? 100 : 55) : (isHead ? def.damageHead : def.damageBody);
        bot.hp = Math.max(0, bot.hp - dmg);
        const ratio = bot.hp / 100;
        bot.visual.hpFill.scale.x = Math.max(0.001, ratio);
        bot.visual.hpFill.position.x = -(1 - ratio) * 0.455;
        bot.visual.hpFill.material.color.setHex(ratio > 0.5 ? 0x62f58a : ratio > 0.25 ? 0xffc857 : 0xff4d6d);
        result.hitKind = 'bot';
        result.hitId = bot.name;
        result.isHeadshot = isHead;
        result.damage = dmg;
        spawnBurst(bestHit.point, isHead ? 0xffb347 : 0xff5e78, isHead ? 12 : 7, 6.2);

        if (bot.hp <= 0) {
          bot.alive = false;
          bot.respawnTimer = 2.4;
          bot.visual.group.visible = false;
          result.killed = true;
          warmupKills += 1;
          triggerHitmarker(isHead, true);
          if (onWarmupKillCb) onWarmupKillCb({ botName: bot.name, slot, isHeadshot: isHead, totalKills: warmupKills });
        } else {
          triggerHitmarker(isHead, false);
        }
      }
      return result;
    }

    // Case D: Remote WebRTC Player Avatar
    if (ud.remoteUid) {
      const av = remoteAvatars.get(ud.remoteUid);
      if (av && av.alive) {
        const isHead = ud.hitbox === 'head';
        const dmg = isKnife ? (o.heavy ? 100 : 55) : (isHead ? def.damageHead : def.damageBody);
        result.hitKind = 'player';
        result.hitId = ud.remoteUid;
        result.isHeadshot = isHead;
        result.damage = dmg;
        spawnBurst(bestHit.point, isHead ? 0xffb347 : 0xff4d6d, isHead ? 12 : 7, 6.5);
        triggerHitmarker(isHead, false);
      }
      return result;
    }

    return result;
  }

  function triggerDamageFlash() {
    state.damageFlashTimer = 0.26;
  }

  // ---------- Per-Frame Update (Zero Allocations) ----------
  let animClock = 0;
  function update(dt, playerPos) {
    animClock += dt;
    if (state.fireCooldown > 0) state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    if (state.spreadBloom > 0) state.spreadBloom = Math.max(0, state.spreadBloom - dt * 0.055);
    if (state.hitmarkerTimer > 0) state.hitmarkerTimer = Math.max(0, state.hitmarkerTimer - dt);
    if (state.damageFlashTimer > 0) state.damageFlashTimer = Math.max(0, state.damageFlashTimer - dt);

    if (state.reloading) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        state.reloading = false;
        const def = getWeaponDef(state.activeSlot);
        if (def) state.ammo[state.activeSlot] = def.magSize;
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

    // Update Solo Warmup Hologram Bots
    if (warmupEnabled) {
      for (let i = 0; i < warmupBots.length; i++) {
        const bot = warmupBots[i];
        if (!bot.alive) {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0 && warmupSpawns.length > 0) {
            const sp = warmupSpawns[Math.floor(Math.random() * warmupSpawns.length)];
            bot.anchor.set(sp.x, sp.y, sp.z);
            bot.hp = 100;
            bot.alive = true;
            bot.visual.hpFill.scale.x = 1;
            bot.visual.hpFill.position.x = 0;
            bot.visual.hpFill.material.color.setHex(0x62f58a);
            bot.visual.group.visible = true;
          }
          continue;
        }
        const strafe = Math.sin(animClock * bot.strafeSpeed + bot.strafePhase) * bot.strafeRange;
        bot.visual.group.position.set(bot.anchor.x + strafe * bot.strafeDir, bot.anchor.y, bot.anchor.z);
        if (playerPos) {
          const dx = playerPos.x - bot.visual.group.position.x;
          const dz = playerPos.z - bot.visual.group.position.z;
          bot.visual.group.rotation.y = Math.atan2(dx, dz) + Math.PI;
        }
        // Subtle stride leg bob
        const stride = Math.sin(animClock * 7.5 + bot.strafePhase) * 0.35;
        bot.visual.legL.rotation.x = stride;
        bot.visual.legR.rotation.x = -stride;
      }
    }

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
    computeGauntletSummary,
    evaluateDuelRoundResult,
    evaluateFfaScoreboard,
    ensureInit,
    switchSlot,
    cycleSlot,
    resetAmmo,
    startReload,
    toggleScope,
    clearScope,
    getScopeFovMultiplier,
    getScopeSensMultiplier,
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
    setupWarmupBots,
    clearWarmupBots,
    setWarmupBotsVisible,
    setOnWarmupKill: (cb) => { onWarmupKillCb = cb; },
    upsertRemoteAvatar,
    removeRemoteAvatar,
    clearRemoteAvatars,
    update,
    getState: () => ({
      activeSlot: state.activeSlot,
      ammo: state.ammo[state.activeSlot] ?? null,
      magSize: getWeaponDef(state.activeSlot)?.magSize ?? null,
      reloading: state.reloading,
      reloadPct: state.reloading && state.reloadDuration > 0 ? 1 - Math.max(0, state.reloadTimer / state.reloadDuration) : 1,
      scopeStage: state.scopeStage,
      hitmarkerTimer: state.hitmarkerTimer,
      hitmarkerHeadshot: state.hitmarkerHeadshot,
      hitmarkerKill: state.hitmarkerKill,
      damageFlashTimer: state.damageFlashTimer,
      warmupKills
    })
  };
});
