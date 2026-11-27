// Tactical Utility, Gadgets, Smoke LOS, Flashbang, Molotov, C4, Recon Dart, Breach Charge & Bomb 3D Visuals (UMD)
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.UtilitySystem = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const hasTHREE = typeof root.THREE !== 'undefined';
  const THREE = hasTHREE ? root.THREE : null;

  let fxGroup = null;
  let padsArrayRef = null;
  let utilSeq = 0;

  const projectiles = [];   // Active flying/bouncing grenades, sticky C4, recon darts
  const smokes = [];        // Active volumetric smoke clouds (block LOS for humans + bots)
  const fires = [];         // Active Molotov fire pools
  const breachCharges = []; // Armed R6 breach charges counting down on walls/hatches
  const reconPulses = [];   // Expanding sonar rings + revealed enemy timers
  const pings = [];         // Teammate 3D tactical ping markers
  const runtimeJumpPads = []; // Placed mobility-kit Jump Pads (removed on round reset)

  // Local viewer transient status effects
  let localFlashAlpha = 0;
  const revealedEnemies = new Map(); // uid -> expiry timestamp (ms)
  const blindedBots = new Map();     // uid -> remaining seconds

  // 3D Bomb world prop (planted or dropped)
  let bombPropGroup = null;
  let bombBeaconMesh = null;
  let bombLedMesh = null;
  let bombBeepAccum = 0;

  const _ray = hasTHREE ? new THREE.Raycaster() : null;
  const _vA = hasTHREE ? new THREE.Vector3() : null;
  const _vB = hasTHREE ? new THREE.Vector3() : null;

  function ensureInit(sceneOrGroup, padsArr) {
    if (padsArr) padsArrayRef = padsArr;
    if (!hasTHREE || !sceneOrGroup) return;
    if (fxGroup && fxGroup.parent === sceneOrGroup) return;
    fxGroup = new THREE.Group();
    fxGroup.name = 'tactical_utility_fx';
    sceneOrGroup.add(fxGroup);
    buildBombProp();
  }

  function buildBombProp() {
    if (!hasTHREE || !fxGroup) return;
    if (bombPropGroup && bombPropGroup.parent) bombPropGroup.parent.remove(bombPropGroup);
    bombPropGroup = new THREE.Group();
    bombPropGroup.visible = false;

    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.22, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x242a34, roughness: 0.45, metalness: 0.55 })
    );
    caseMesh.position.y = 0.12;
    bombPropGroup.add(caseMesh);

    const screenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xff5a36 })
    );
    screenMesh.position.set(0, 0.24, 0);
    bombPropGroup.add(screenMesh);
    bombLedMesh = screenMesh;

    // Vertical beacon column visible when dropped or planted
    bombBeaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.16, 4.8, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff6b35,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    bombBeaconMesh.position.y = 2.4;
    bombPropGroup.add(bombBeaconMesh);

    fxGroup.add(bombPropGroup);
  }

  function disposeObj(obj) {
    if (!obj) return;
    if (obj.parent) obj.parent.remove(obj);
    obj.traverse?.((ch) => {
      if (ch.geometry && ch.geometry.dispose) ch.geometry.dispose();
      if (ch.material) {
        if (Array.isArray(ch.material)) ch.material.forEach((m) => m && m.dispose && m.dispose());
        else if (ch.material.dispose) ch.material.dispose();
      }
    });
  }

  function clearRound() {
    for (const p of projectiles) disposeObj(p.mesh);
    projectiles.length = 0;
    for (const s of smokes) disposeObj(s.mesh);
    smokes.length = 0;
    for (const f of fires) disposeObj(f.mesh);
    fires.length = 0;
    for (const b of breachCharges) disposeObj(b.mesh);
    breachCharges.length = 0;
    for (const r of reconPulses) disposeObj(r.mesh);
    reconPulses.length = 0;
    for (const pg of pings) disposeObj(pg.mesh);
    pings.length = 0;

    if (Array.isArray(padsArrayRef)) {
      for (const jp of runtimeJumpPads) {
        const idx = padsArrayRef.indexOf(jp.padEntry);
        if (idx >= 0) padsArrayRef.splice(idx, 1);
        disposeObj(jp.mesh);
      }
    }
    runtimeJumpPads.length = 0;
    localFlashAlpha = 0;
    revealedEnemies.clear();
    blindedBots.clear();
    bombBeepAccum = 0;
    if (bombPropGroup) bombPropGroup.visible = false;
  }

  function clearAll() {
    clearRound();
    if (fxGroup && fxGroup.parent) fxGroup.parent.remove(fxGroup);
    fxGroup = null;
    bombPropGroup = null;
    bombBeaconMesh = null;
    bombLedMesh = null;
  }

  // Smoke LOS intersection check (segment A -> B against active smoke spheres)
  function isRayBlockedBySmoke(a, b) {
    if (!a || !b || smokes.length === 0) return false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dy * dy + dz * dz;
    if (lenSq < 1e-6) return false;
    for (let i = 0; i < smokes.length; i++) {
      const s = smokes[i];
      if (!s.active) continue;
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.y - a.y) * dy + (s.z - a.z) * dz) / lenSq));
      const cx = a.x + dx * t - s.x;
      const cy = a.y + dy * t - s.y;
      const cz = a.z + dz * t - s.z;
      const r = s.radius * 0.92;
      if (cx * cx + cy * cy + cz * cz <= r * r) return true;
    }
    return false;
  }

  function spawnSmokeCloud(pos) {
    const entry = {
      id: `smoke_${++utilSeq}`,
      x: pos.x,
      y: pos.y + 1.35,
      z: pos.z,
      radius: 4.3,
      life: 0,
      maxLife: 16.0,
      active: true,
      mesh: null
    };
    if (hasTHREE && fxGroup) {
      const grp = new THREE.Group();
      grp.position.set(entry.x, entry.y, entry.z);
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.86,
        depthWrite: false
      });
      const offsets = [
        [0, 0, 0, 2.35],
        [1.55, -0.25, 0.85, 1.85],
        [-1.45, -0.2, 0.9, 1.9],
        [0.45, -0.15, -1.6, 1.85],
        [-0.9, 0.65, -0.95, 1.7],
        [0.95, 0.72, 0.45, 1.6]
      ];
      for (const [ox, oy, oz, rad] of offsets) {
        const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), smokeMat);
        lobe.position.set(ox, oy, oz);
        grp.add(lobe);
      }
      grp.scale.set(0.2, 0.2, 0.2);
      fxGroup.add(grp);
      entry.mesh = grp;
    }
    smokes.push(entry);
    if (root.WeaponAudio && typeof root.WeaponAudio.playSmokeHiss === 'function') {
      root.WeaponAudio.playSmokeHiss();
    }
    return entry;
  }

  function spawnFirePool(pos, ownerUid, ownerTeam) {
    const entry = {
      id: `fire_${++utilSeq}`,
      x: pos.x,
      y: pos.y + 0.08,
      z: pos.z,
      radius: 3.3,
      ownerUid,
      ownerTeam,
      life: 0,
      maxLife: 7.0,
      tickAccum: 0,
      mesh: null
    };
    if (hasTHREE && fxGroup) {
      const grp = new THREE.Group();
      grp.position.set(entry.x, entry.y, entry.z);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(entry.radius, 18),
        new THREE.MeshBasicMaterial({
          color: 0xff5a1f,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      disc.rotation.x = -Math.PI * 0.5;
      grp.add(disc);

      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffa834,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r = i === 0 ? 0.2 : 1.15 + (i % 2) * 0.75;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.05, 6), flameMat);
        cone.position.set(Math.cos(ang) * r, 0.52, Math.sin(ang) * r);
        grp.add(cone);
      }
      fxGroup.add(grp);
      entry.mesh = grp;
    }
    fires.push(entry);
    if (root.WeaponAudio && typeof root.WeaponAudio.playMolotovIgnite === 'function') {
      root.WeaponAudio.playMolotovIgnite();
    }
    return entry;
  }

  function triggerFlashbang(pos, context) {
    const ctx = context || {};
    if (root.CombatSystem && typeof root.CombatSystem.spawnBurst === 'function') {
      root.CombatSystem.spawnBurst(pos, 0xffffff, 22, 10.5);
    }
    if (root.WeaponAudio && typeof root.WeaponAudio.playFlashbangPop === 'function') {
      root.WeaponAudio.playFlashbangPop();
    }
    // Check local viewer LOS & facing dot product
    if (ctx.localPos && ctx.localDir) {
      const dx = pos.x - ctx.localPos.x;
      const dy = pos.y - (ctx.localPos.y + 1.5);
      const dz = pos.z - ctx.localPos.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 24) {
        let occluded = false;
        if (hasTHREE && _ray && Array.isArray(ctx.solidMeshes) && ctx.solidMeshes.length) {
          _vA.set(ctx.localPos.x, ctx.localPos.y + 1.5, ctx.localPos.z);
          _vB.set(dx / Math.max(0.01, dist), dy / Math.max(0.01, dist), dz / Math.max(0.01, dist));
          _ray.set(_vA, _vB);
          _ray.near = 0.15;
          _ray.far = Math.max(0.2, dist - 0.35);
          const hits = _ray.intersectObjects(ctx.solidMeshes, false);
          for (let i = 0; i < hits.length; i++) {
            if (hits[i].object && hits[i].object.visible !== false && !(hits[i].object.userData && hits[i].object.userData.disabled)) {
              occluded = true;
              break;
            }
          }
        }
        if (!occluded) {
          const invD = 1 / Math.max(0.01, dist);
          const facing = (dx * invD) * ctx.localDir.x + (dy * invD) * ctx.localDir.y + (dz * invD) * ctx.localDir.z;
          const distFactor = Math.max(0.25, 1 - dist / 24);
          const angleFactor = facing > 0.15 ? 1.0 : (facing > -0.25 ? 0.45 : 0.18);
          localFlashAlpha = Math.min(1.0, Math.max(localFlashAlpha, distFactor * angleFactor * 1.15));
        }
      }
    }
    // Blind bots in radius
    if (Array.isArray(ctx.targets)) {
      for (const t of ctx.targets) {
        if (!t || !t.alive || !t.isBot) continue;
        const dist = Math.hypot((t.pos.x || 0) - pos.x, (t.pos.y || 0) - pos.y, (t.pos.z || 0) - pos.z);
        if (dist < 17.5) {
          blindedBots.set(t.uid, Math.max(blindedBots.get(t.uid) || 0, 2.6 * (1 - dist / 22)));
        }
      }
    }
  }

  function triggerExplosionDamage(pos, radius, maxDamage, ownerUid, ownerTeam, sourceId, onSplashDamage) {
    if (root.DestructionSystem && typeof root.DestructionSystem.applyExplosion === 'function') {
      root.DestructionSystem.applyExplosion(pos, radius * 0.72, maxDamage * 2.2, sourceId);
    }
    if (root.CombatSystem && typeof root.CombatSystem.spawnBurst === 'function') {
      root.CombatSystem.spawnBurst(pos, 0xff8b3d, 26, 11.5);
    }
    if (root.WeaponAudio && typeof root.WeaponAudio.playExplosion === 'function') {
      root.WeaponAudio.playExplosion(sourceId === 'c4' ? 1.25 : 1.0);
    }
    if (typeof onSplashDamage === 'function') {
      onSplashDamage({
        pos: { x: pos.x, y: pos.y, z: pos.z },
        radius,
        maxDamage,
        ownerUid,
        ownerTeam,
        sourceId
      });
    }
  }

  function triggerReconPulse(pos, ownerTeam, targets) {
    const pulse = {
      id: `recon_${++utilSeq}`,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      radius: 19.0,
      life: 0,
      maxLife: 0.75,
      mesh: null
    };
    if (hasTHREE && fxGroup) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.28,
          wireframe: true,
          depthWrite: false
        })
      );
      sphere.position.set(pos.x, pos.y, pos.z);
      fxGroup.add(sphere);
      pulse.mesh = sphere;
    }
    reconPulses.push(pulse);
    if (root.WeaponAudio && typeof root.WeaponAudio.playReconPing === 'function') {
      root.WeaponAudio.playReconPing();
    }
    const expires = Date.now() + 2600;
    if (Array.isArray(targets)) {
      for (const t of targets) {
        if (!t || !t.alive || (ownerTeam && t.team === ownerTeam)) continue;
        const d = Math.hypot((t.pos.x || 0) - pos.x, (t.pos.y || 0) - pos.y, (t.pos.z || 0) - pos.z);
        if (d <= pulse.radius) {
          revealedEnemies.set(t.uid, expires);
        }
      }
    }
  }

  function throwUtility(type, origin, dir, ownerUid, ownerTeam) {
    if (!origin || !dir) return null;
    const id = `util_${++utilSeq}`;
    const speed = type === 'recon' ? 36 : type === 'c4' ? 14 : type === 'molotov' ? 21 : 22.5;
    const isSticky = type === 'c4' || type === 'recon';
    const colors = {
      frag: 0x556b4e,
      smoke: 0x94a3b8,
      flash: 0xf8fafc,
      molotov: 0xff6b2b,
      c4: 0xef4444,
      recon: 0x38bdf8
    };

    let mesh = null;
    if (hasTHREE && fxGroup) {
      const geo = type === 'c4'
        ? new THREE.BoxGeometry(0.28, 0.14, 0.20)
        : type === 'recon'
          ? new THREE.CylinderGeometry(0.03, 0.05, 0.42, 6)
          : new THREE.SphereGeometry(0.11, 10, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[type] || 0x94a3b8,
        emissive: type === 'c4' ? 0x991111 : type === 'recon' ? 0x0ea5e9 : type === 'molotov' ? 0xc2410c : 0x000000,
        emissiveIntensity: 0.65,
        roughness: 0.4,
        metalness: 0.35
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(origin.x, origin.y, origin.z);
      fxGroup.add(mesh);
    }

    const proj = {
      id,
      type,
      ownerUid,
      ownerTeam,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: dir.x * speed,
      vy: dir.y * speed + (type === 'recon' ? 1.5 : 3.2),
      vz: dir.z * speed,
      sticky: isSticky,
      stuck: false,
      life: 0,
      fuse: type === 'flash' ? 1.45 : type === 'frag' ? 2.1 : type === 'smoke' ? 1.85 : type === 'molotov' ? 3.5 : 99,
      pulsesLeft: type === 'recon' ? 3 : 0,
      pulseTimer: 0.25,
      mesh
    };
    projectiles.push(proj);
    return proj;
  }

  function detonateC4(ownerUid, onSplashDamage) {
    let detonated = 0;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.type !== 'c4') continue;
      if (ownerUid && p.ownerUid !== ownerUid) continue;
      triggerExplosionDamage(
        { x: p.x, y: p.y, z: p.z },
        6.5,
        140,
        p.ownerUid,
        p.ownerTeam,
        'c4',
        onSplashDamage
      );
      disposeObj(p.mesh);
      projectiles.splice(i, 1);
      detonated += 1;
    }
    return detonated;
  }

  function hasArmedC4(ownerUid) {
    return projectiles.some((p) => p.type === 'c4' && (!ownerUid || p.ownerUid === ownerUid));
  }

  function placeBreachCharge(pos, normal, panelId, ownerUid, ownerTeam) {
    if (!pos) return null;
    let mesh = null;
    if (hasTHREE && fxGroup) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.56, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0x1f2937,
          emissive: 0xff6b35,
          emissiveIntensity: 0.85,
          roughness: 0.4,
          metalness: 0.5
        })
      );
      mesh.position.set(pos.x, pos.y, pos.z);
      if (normal) {
        mesh.lookAt(pos.x + normal.x, pos.y + normal.y, pos.z + normal.z);
      }
      fxGroup.add(mesh);
    }
    const charge = {
      id: `breach_${++utilSeq}`,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      panelId: panelId || null,
      ownerUid,
      ownerTeam,
      timer: 1.25,
      mesh
    };
    breachCharges.push(charge);
    if (root.WeaponAudio && typeof root.WeaponAudio.playBombBeep === 'function') {
      root.WeaponAudio.playBombBeep(true);
    }
    return charge;
  }

  function deployJumpPad(pos, ownerUid, ownerTeam) {
    if (!pos) return null;
    const padEntry = {
      x: pos.x,
      y: pos.y + 0.15,
      z: pos.z,
      r: 1.9,
      vy: 15.8,
      vx: 0,
      vz: 0,
      ownerUid,
      ownerTeam,
      isTacticalJumpPad: true
    };
    let mesh = null;
    if (hasTHREE && fxGroup) {
      const grp = new THREE.Group();
      grp.position.set(pos.x, pos.y + 0.08, pos.z);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.32, 0.16, 14),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 })
      );
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 1.0, 18),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI * 0.5;
      ring.position.y = 0.09;
      grp.add(base, ring);
      fxGroup.add(grp);
      mesh = grp;
    }
    if (Array.isArray(padsArrayRef)) {
      padsArrayRef.push(padEntry);
    }
    runtimeJumpPads.push({ padEntry, mesh });
    return padEntry;
  }

  function addTacticalPing(pos, label, team, senderName) {
    if (!pos) return null;
    let mesh = null;
    if (hasTHREE && fxGroup) {
      const grp = new THREE.Group();
      grp.position.set(pos.x, pos.y + 0.5, pos.z);
      const col = team === 'atk' ? 0xff6b35 : 0x38bdf8;
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshBasicMaterial({ color: col })
      );
      diamond.position.y = 1.1;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.09, 2.2, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false })
      );
      beam.position.y = 1.1;
      grp.add(diamond, beam);
      fxGroup.add(grp);
      mesh = grp;
    }
    const ping = {
      id: `ping_${++utilSeq}`,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      label: String(label || 'PING').toUpperCase(),
      team,
      senderName: senderName || 'TEAM',
      life: 0,
      maxLife: 8.0,
      mesh
    };
    pings.push(ping);
    if (pings.length > 8) {
      const old = pings.shift();
      disposeObj(old.mesh);
    }
    return ping;
  }

  function syncBombVisual(bombState, dt) {
    if (!hasTHREE || !bombPropGroup) return;
    const show = bombState && (bombState.state === 'dropped' || bombState.state === 'planted');
    bombPropGroup.visible = Boolean(show);
    if (!show) return;
    bombPropGroup.position.set(
      Number(bombState.pos && bombState.pos.x) || 0,
      Number(bombState.pos && bombState.pos.y) || 0,
      Number(bombState.pos && bombState.pos.z) || 0
    );
    const isPlanted = bombState.state === 'planted';
    if (bombBeaconMesh && bombBeaconMesh.material) {
      bombBeaconMesh.material.color.setHex(isPlanted ? 0xff3b30 : 0xffbe3d);
      bombBeaconMesh.material.opacity = isPlanted ? 0.28 : 0.42;
    }
    if (isPlanted) {
      const fuse = Math.max(0.5, Number(bombState.fuseTimer) || 40);
      const interval = fuse < 5 ? 0.16 : fuse < 12 ? 0.36 : fuse < 25 ? 0.65 : 1.0;
      bombBeepAccum += dt;
      if (bombBeepAccum >= interval) {
        bombBeepAccum = 0;
        if (bombLedMesh && bombLedMesh.material) {
          bombLedMesh.material.color.setHex(0xff2a2a);
        }
        if (root.WeaponAudio && typeof root.WeaponAudio.playBombBeep === 'function') {
          root.WeaponAudio.playBombBeep(fuse < 10);
        }
      } else if (bombBeepAccum > 0.08 && bombLedMesh && bombLedMesh.material) {
        bombLedMesh.material.color.setHex(0x661111);
      }
    }
  }

  function update(dt, ctx) {
    const c = ctx || {};
    const solidMeshes = Array.isArray(c.solidMeshes) ? c.solidMeshes : [];

    // Decay local flashbang whiteout
    if (localFlashAlpha > 0) {
      localFlashAlpha = Math.max(0, localFlashAlpha - dt * 0.42);
    }

    // Decay bot blind timers
    for (const [uid, rem] of blindedBots) {
      if (rem - dt <= 0) blindedBots.delete(uid);
      else blindedBots.set(uid, rem - dt);
    }

    // Prune expired recon reveals
    const nowMs = Date.now();
    for (const [uid, exp] of revealedEnemies) {
      if (nowMs >= exp) revealedEnemies.delete(uid);
    }

    // Step flying projectiles (Frag, Smoke, Flash, Molotov, C4, Recon Dart)
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life += dt;

      if (!p.stuck) {
        p.vy -= (p.type === 'recon' ? 7.5 : 18.5) * dt;
        const stepX = p.vx * dt;
        const stepY = p.vy * dt;
        const stepZ = p.vz * dt;
        const stepLen = Math.hypot(stepX, stepY, stepZ);

        let hitWorld = null;
        if (hasTHREE && _ray && stepLen > 0.001 && solidMeshes.length > 0) {
          _vA.set(p.x, p.y, p.z);
          _vB.set(stepX / stepLen, stepY / stepLen, stepZ / stepLen);
          _ray.set(_vA, _vB);
          _ray.near = 0.01;
          _ray.far = stepLen + 0.14;
          const hits = _ray.intersectObjects(solidMeshes, false);
          for (let h = 0; h < hits.length; h++) {
            const obj = hits[h].object;
            if (obj && obj.visible !== false && !(obj.userData && obj.userData.disabled)) {
              hitWorld = hits[h];
              break;
            }
          }
        }

        if (hitWorld) {
          p.x = hitWorld.point.x;
          p.y = hitWorld.point.y;
          p.z = hitWorld.point.z;
          const n = hitWorld.face ? hitWorld.face.normal.clone().transformDirection(hitWorld.object.matrixWorld) : { x: 0, y: 1, z: 0 };

          if (p.type === 'molotov' && n.y > 0.55) {
            spawnFirePool({ x: p.x, y: p.y, z: p.z }, p.ownerUid, p.ownerTeam);
            disposeObj(p.mesh);
            projectiles.splice(i, 1);
            continue;
          }
          if (p.sticky) {
            p.stuck = true;
            p.vx = p.vy = p.vz = 0;
            p.x += n.x * 0.06;
            p.y += n.y * 0.06;
            p.z += n.z * 0.06;
          } else {
            // Bounce with damping
            const dot = p.vx * n.x + p.vy * n.y + p.vz * n.z;
            p.vx = (p.vx - 2 * dot * n.x) * 0.48;
            p.vy = (p.vy - 2 * dot * n.y) * 0.42;
            p.vz = (p.vz - 2 * dot * n.z) * 0.48;
            p.x += n.x * 0.08;
            p.y += n.y * 0.08;
            p.z += n.z * 0.08;
          }
        } else {
          p.x += stepX;
          p.y += stepY;
          p.z += stepZ;
          if (p.y < -15) {
            disposeObj(p.mesh);
            projectiles.splice(i, 1);
            continue;
          }
        }
        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);
          if (!p.stuck) {
            p.mesh.rotation.x += dt * 7;
            p.mesh.rotation.z += dt * 5;
          }
        }
      }

      // Recon dart pulses 3x once stuck
      if (p.type === 'recon' && p.stuck) {
        p.pulseTimer -= dt;
        if (p.pulseTimer <= 0) {
          if (p.pulsesLeft > 0) {
            p.pulsesLeft -= 1;
            p.pulseTimer = 2.0;
            triggerReconPulse({ x: p.x, y: p.y, z: p.z }, p.ownerTeam, c.targets);
          } else {
            disposeObj(p.mesh);
            projectiles.splice(i, 1);
            continue;
          }
        }
      }

      // Fuse detonation for Frag, Smoke, Flash, Molotov fallback
      if (p.type !== 'c4' && p.type !== 'recon' && p.life >= p.fuse) {
        if (p.type === 'frag') {
          triggerExplosionDamage({ x: p.x, y: p.y, z: p.z }, 5.6, 108, p.ownerUid, p.ownerTeam, 'frag', c.onSplashDamage);
        } else if (p.type === 'smoke') {
          spawnSmokeCloud({ x: p.x, y: p.y, z: p.z });
        } else if (p.type === 'flash') {
          triggerFlashbang({ x: p.x, y: p.y, z: p.z }, c);
        } else if (p.type === 'molotov') {
          spawnFirePool({ x: p.x, y: p.y, z: p.z }, p.ownerUid, p.ownerTeam);
        }
        disposeObj(p.mesh);
        projectiles.splice(i, 1);
      }
    }

    // Step armed R6 Breach Charges
    for (let i = breachCharges.length - 1; i >= 0; i--) {
      const bc = breachCharges[i];
      bc.timer -= dt;
      if (bc.timer <= 0) {
        if (bc.panelId && root.DestructionSystem) {
          root.DestructionSystem.damagePanel(bc.panelId, 500, 'breach_charge');
        }
        triggerExplosionDamage({ x: bc.x, y: bc.y, z: bc.z }, 4.6, 85, bc.ownerUid, bc.ownerTeam, 'breach_charge', c.onSplashDamage);
        disposeObj(bc.mesh);
        breachCharges.splice(i, 1);
      }
    }

    // Step Smoke Clouds (expand smoothly, hold dense, fade cleanly)
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        disposeObj(s.mesh);
        smokes.splice(i, 1);
        continue;
      }
      if (s.mesh) {
        const grow = Math.min(1, s.life / 0.55);
        const fade = s.life > s.maxLife - 2.0 ? Math.max(0.05, (s.maxLife - s.life) / 2.0) : 1.0;
        const sc = 0.25 + grow * 0.75;
        s.mesh.scale.set(sc, sc, sc);
        s.mesh.rotation.y += dt * 0.14;
        s.mesh.children.forEach((ch) => {
          if (ch.material) ch.material.opacity = 0.86 * fade;
        });
      }
    }

    // Step Molotov Fire Pools (area denial DoT)
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        disposeObj(f.mesh);
        fires.splice(i, 1);
        continue;
      }
      if (f.mesh) {
        f.mesh.rotation.y += dt * 1.8;
        const flick = 0.88 + Math.sin(f.life * 22) * 0.14;
        f.mesh.scale.set(1, flick, 1);
      }
      f.tickAccum += dt;
      if (f.tickAccum >= 0.35 && typeof c.onFireTick === 'function') {
        f.tickAccum = 0;
        c.onFireTick({
          x: f.x,
          y: f.y,
          z: f.z,
          radius: f.radius,
          damage: 14,
          ownerUid: f.ownerUid,
          ownerTeam: f.ownerTeam
        });
      }
    }

    // Step Recon Sonar Rings
    for (let i = reconPulses.length - 1; i >= 0; i--) {
      const r = reconPulses[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        disposeObj(r.mesh);
        reconPulses.splice(i, 1);
        continue;
      }
      if (r.mesh) {
        const t = r.life / r.maxLife;
        const sc = 0.5 + t * r.radius;
        r.mesh.scale.set(sc, sc, sc);
        if (r.mesh.material) r.mesh.material.opacity = 0.28 * (1 - t);
      }
    }

    // Step 3D Tactical Pings
    for (let i = pings.length - 1; i >= 0; i--) {
      const pg = pings[i];
      pg.life += dt;
      if (pg.life >= pg.maxLife) {
        disposeObj(pg.mesh);
        pings.splice(i, 1);
        continue;
      }
      if (pg.mesh) {
        pg.mesh.rotation.y += dt * 2.4;
      }
    }

    if (c.bombState) {
      syncBombVisual(c.bombState, dt);
    }
  }

  return {
    ensureInit,
    clearRound,
    clearAll,
    throwUtility,
    detonateC4,
    hasArmedC4,
    placeBreachCharge,
    deployJumpPad,
    addTacticalPing,
    spawnSmokeCloud,
    spawnFirePool,
    triggerFlashbang,
    isRayBlockedBySmoke,
    isEnemyRevealed: (uid) => (revealedEnemies.get(uid) || 0) > Date.now(),
    isBotBlinded: (uid) => (blindedBots.get(uid) || 0) > 0,
    getLocalFlashAlpha: () => localFlashAlpha,
    getActiveSmokes: () => smokes.slice(),
    getActiveFires: () => fires.slice(),
    getActivePings: () => pings.slice(),
    update
  };
});
