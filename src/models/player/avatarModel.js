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

    const armorMat = new THREE.MeshStandardMaterial({
      color: isBot ? 0x1a2c3d : 0x1e2632,
      roughness: 0.48,
      metalness: 0.52,
      emissive: isBot ? 0x0b2a3e : 0x12090c,
      emissiveIntensity: isBot ? 0.55 : 0.25
    });
    const accentMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f151d, roughness: 0.7, metalness: 0.25 });

    const noopRaycast = () => {};

    // Torso (visual mesh)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.36), armorMat);
    torso.position.y = 1.06;
    torso.raycast = noopRaycast;
    g.add(torso);

    // Glowing chest chevron strip for instant high-contrast combat silhouette readability
    const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.10, 0.39), accentMat);
    chestStrip.position.y = 1.24;
    chestStrip.raycast = noopRaycast;
    g.add(chestStrip);

    // Legs (visual)
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.24), darkMat);
    legL.position.set(-0.16, 0.32, 0);
    legL.raycast = noopRaycast;
    const legR = legL.clone();
    legR.position.x = 0.16;
    legR.raycast = noopRaycast;
    g.add(legL, legR);

    // Arms + held weapon silhouette (visual)
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), armorMat);
    armR.position.set(0.40, 1.10, -0.14);
    armR.rotation.x = 0.85;
    armR.raycast = noopRaycast;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.18), armorMat);
    armL.position.set(-0.34, 1.06, -0.16);
    armL.rotation.x = 0.75;
    armL.raycast = noopRaycast;
    const gunBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.66), darkMat);
    gunBar.position.set(0.26, 1.18, -0.42);
    gunBar.raycast = noopRaycast;
    g.add(armR, armL, gunBar);

    // Head helmet + glowing visor (visual)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), armorMat);
    head.position.y = 1.72;
    head.raycast = noopRaycast;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.40), accentMat);
    visor.position.y = 1.74;
    visor.raycast = noopRaycast;
    g.add(head, visor);

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

  VI.makeCallsignSprite = makeCallsignSprite;
  VI.createAvatarMesh = createAvatarMesh;
  VI.updateAvatarGrappleVisual = updateAvatarGrappleVisual;
  VI.disposeAvatarAuxVisuals = disposeAvatarAuxVisuals;
  VI.updateAvatarChronoVisual = updateAvatarChronoVisual;
})(typeof self !== 'undefined' ? self : globalThis);
