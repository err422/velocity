// Composite 3D player/bot avatar model with forgiving invisible hitboxes,
// callsign sprite, Chrono Stasis shell, and world-space grapple tether line.
(function (root) {
  'use strict';

  const VI = root.VelocityInternal || (root.VelocityInternal = {});

  const AVATAR_HITBOX = Object.freeze({
    bodyRadiusTop: 0.58,
    bodyRadiusBottom: 0.52,
    bodyHeight: 1.52,
    bodyCenterY: 0.76,
    headRadius: 0.36,
    headCenterY: 1.78
  });

  VI.AVATAR_HITBOX = AVATAR_HITBOX;

  if (!root.THREE || typeof document === 'undefined') return;
  const THREE = root.THREE;

  function makeCallsignSprite(text, colorHex) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(7, 13, 21, 0.76)';
    ctx.fillRect(8, 10, 240, 44);
    ctx.strokeStyle = colorHex || '#65e7ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 10, 240, 44);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(text || 'RUNNER').slice(0, 14), 128, 40);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(2.1, 0.52, 1);
    return sp;
  }

  function createAvatarMesh(opts, fxGroup) {
    const g = new THREE.Group();
    const accentColor = opts.accentColor || 0xff6b55;
    const isBot = Boolean(opts.isBot);

    const noopRaycast = () => {};

    let legL = null;
    let legR = null;
    let gunBar = null;
    let parryAura = null;
    let operatorRoot = null;

    if (typeof VI.buildTacticalOperatorModel === 'function') {
      operatorRoot = VI.buildTacticalOperatorModel({
        detail: 'arena',
        accentColor,
        isBot
      });
      // Operator model faces +Z in studio showcase; arena avatars face -Z
      operatorRoot.rotation.y = Math.PI;
      operatorRoot.scale.setScalar(1.06);
      operatorRoot.traverse((child) => {
        if (child && child.isMesh) child.raycast = noopRaycast;
      });
      g.add(operatorRoot);
      legL = operatorRoot.userData.legL;
      legR = operatorRoot.userData.legR;
      gunBar = operatorRoot.userData.wepModel;
      parryAura = operatorRoot.userData.parryAura;
    } else {
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x1e2632, roughness: 0.48, metalness: 0.52 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f151d, roughness: 0.7, metalness: 0.25 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.36), armorMat);
      torso.position.y = 1.06;
      torso.raycast = noopRaycast;
      legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.24), darkMat);
      legL.position.set(-0.16, 0.32, 0);
      legL.raycast = noopRaycast;
      legR = legL.clone();
      legR.position.x = 0.16;
      legR.raycast = noopRaycast;
      gunBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.66), darkMat);
      gunBar.position.set(0.26, 1.18, -0.42);
      gunBar.raycast = noopRaycast;
      g.add(torso, legL, legR, gunBar);
    }

    // Forgiving invisible combat hitboxes (full-body cylinder covering legs/torso/shoulders + spherical head)
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: THREE.DoubleSide
    });
    const bodyHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(
        AVATAR_HITBOX.bodyRadiusTop,
        AVATAR_HITBOX.bodyRadiusBottom,
        AVATAR_HITBOX.bodyHeight,
        14
      ),
      hitboxMat
    );
    bodyHitbox.position.y = AVATAR_HITBOX.bodyCenterY;
    const headHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(AVATAR_HITBOX.headRadius, 14, 10),
      hitboxMat
    );
    headHitbox.position.y = AVATAR_HITBOX.headCenterY;
    g.add(bodyHitbox, headHitbox);

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
      headMesh: headHitbox,
      bodyMesh: bodyHitbox,
      hpFill,
      hpBg,
      label,
      legL,
      legR,
      gunBar,
      parryAura,
      operatorRoot,
      chronoShell,
      grappleLine,
      grapplePositions
    };
  }

  function updateAvatarGrappleVisual(visual, originPos, grapplePoint, fxGroup) {
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

  function ensureAvatarTacticalParts(visual) {
    if (!visual || !visual.group || visual.tacticalParts) return visual && visual.tacticalParts;
    // Bomb backpack (shown only on active Attacker bomb carrier)
    const bombPack = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.36, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        emissive: 0xff5a36,
        emissiveIntensity: 0.75,
        roughness: 0.45,
        metalness: 0.5
      })
    );
    bombPack.position.set(0, 1.15, 0.25);
    bombPack.visible = false;
    visual.group.add(bombPack);

    // Lightweight through-wall silhouette & overhead chevron (depthTest: false)
    const wallSilhouette = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 1.48, 0.34),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24,
        depthTest: false,
        depthWrite: false
      })
    );
    wallSilhouette.position.set(0, 0.96, 0);
    wallSilhouette.renderOrder = 25;
    wallSilhouette.visible = false;
    visual.group.add(wallSilhouette);

    const allyChevron = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.26, 4),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        depthTest: false,
        depthWrite: false
      })
    );
    allyChevron.rotation.x = Math.PI;
    allyChevron.position.set(0, 2.48, 0);
    allyChevron.renderOrder = 26;
    allyChevron.visible = false;
    visual.group.add(allyChevron);

    visual.tacticalParts = { bombPack, wallSilhouette, allyChevron, lastTeamHex: 0 };
    return visual.tacticalParts;
  }

  function updateAvatarTacticalVisuals(visual, opts) {
    if (!visual || !visual.group) return;
    const parts = ensureAvatarTacticalParts(visual);
    if (!parts) return;
    const o = opts || {};
    const team = o.team || '';
    const isTeammate = Boolean(o.isTeammate);
    const isRevealed = Boolean(o.isRevealed);
    const hasBomb = Boolean(o.hasBomb);

    parts.bombPack.visible = hasBomb;

    if (isTeammate) {
      const colHex = team === 'atk' ? 0xff8a4c : 0x38bdf8;
      parts.wallSilhouette.visible = true;
      parts.wallSilhouette.material.color.setHex(colHex);
      parts.wallSilhouette.material.opacity = 0.22;
      parts.allyChevron.visible = true;
      parts.allyChevron.material.color.setHex(colHex);
    } else if (isRevealed) {
      parts.wallSilhouette.visible = true;
      parts.wallSilhouette.material.color.setHex(0xff3b5c);
      parts.wallSilhouette.material.opacity = 0.34;
      parts.allyChevron.visible = false;
    } else {
      parts.wallSilhouette.visible = false;
      parts.allyChevron.visible = false;
    }

    // Apply crisp faction visor/armor trim tint once per team swap
    const factionHex = team === 'atk' ? 0xff6b35 : (team === 'def' ? 0x38bdf8 : 0);
    if (factionHex && parts.lastTeamHex !== factionHex && visual.operatorRoot) {
      parts.lastTeamHex = factionHex;
      visual.operatorRoot.traverse((ch) => {
        if (ch.isMesh && ch.material && ch.material.emissive && ch.material.emissiveIntensity > 0.2) {
          ch.material.color.setHex(factionHex);
          ch.material.emissive.setHex(factionHex);
        }
      });
    }
  }

  VI.makeCallsignSprite = makeCallsignSprite;
  VI.createAvatarMesh = createAvatarMesh;
  VI.updateAvatarGrappleVisual = updateAvatarGrappleVisual;
  VI.disposeAvatarAuxVisuals = disposeAvatarAuxVisuals;
  VI.updateAvatarChronoVisual = updateAvatarChronoVisual;
  VI.updateAvatarTacticalVisuals = updateAvatarTacticalVisuals;
})(typeof self !== 'undefined' ? self : globalThis);
