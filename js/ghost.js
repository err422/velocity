// Ghost replay system: pure recording/interpolation/serialization logic + semi-transparent 3D holographic runner mesh.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GhostSystem = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GHOST_VERSION = 1;
  const SAMPLE_INTERVAL = 1 / 30;     // 30 Hz keyframes (~33.3 ms)
  const MAX_GHOST_DURATION = 600;     // 10-minute safety cap
  const MAX_GHOST_FRAMES = Math.ceil(MAX_GHOST_DURATION / SAMPLE_INTERVAL) + 2;

  const FLAG_LOW = 1;
  const FLAG_WALLRUN = 2;
  const FLAG_GROUNDED = 4;

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function normalizeAngle(a) {
    let r = (a + Math.PI) % (Math.PI * 2);
    if (r < 0) r += Math.PI * 2;
    return r - Math.PI;
  }

  function lerpAngle(a, b, t) {
    const diff = normalizeAngle(b - a);
    return a + diff * t;
  }

  function packFlags(state) {
    let f = 0;
    if (state && state.low) f |= FLAG_LOW;
    if (state && state.wallrun) f |= FLAG_WALLRUN;
    if (state && state.grounded) f |= FLAG_GROUNDED;
    return f;
  }

  function unpackFlags(f) {
    const bits = f | 0;
    return {
      low: (bits & FLAG_LOW) !== 0,
      wallrun: (bits & FLAG_WALLRUN) !== 0,
      grounded: (bits & FLAG_GROUNDED) !== 0
    };
  }

  function makeFrame(t, state) {
    const gx = state.grapple ? round3(state.grapple.x) : null;
    const gy = state.grapple ? round3(state.grapple.y) : null;
    const gz = state.grapple ? round3(state.grapple.z) : null;
    const frame = [
      round3(Math.max(0, t)),
      round3(state.pos.x),
      round3(state.pos.y),
      round3(state.pos.z),
      round3(normalizeAngle(state.yaw || 0)),
      packFlags(state),
      round3(state.roll || 0)
    ];
    if (gx !== null) frame.push(gx, gy, gz);
    return frame;
  }

  function createRecorder(courseId) {
    return {
      courseId: String(courseId || ''),
      frames: [],
      nextSampleTime: 0,
      active: true
    };
  }

  function recordSample(rec, t, state, force) {
    if (!rec || !rec.active || !state || !state.pos) return false;
    if (t > MAX_GHOST_DURATION || rec.frames.length >= MAX_GHOST_FRAMES) return false;
    if (!force && t + 1e-6 < rec.nextSampleTime) return false;

    const frame = makeFrame(t, state);
    const len = rec.frames.length;
    if (len > 0 && rec.frames[len - 1][0] >= frame[0]) {
      rec.frames[len - 1] = frame;
    } else {
      rec.frames.push(frame);
    }
    while (rec.nextSampleTime <= t + 1e-6) {
      rec.nextSampleTime += SAMPLE_INTERVAL;
    }
    return true;
  }

  function finalizeRecording(rec, finalTime, state) {
    if (!rec || !rec.active) return null;
    const duration = Math.max(0, finalTime || 0);
    if (state && state.pos) {
      recordSample(rec, duration, state, true);
    }
    rec.active = false;
    if (rec.frames.length < 2) return null;
    return {
      v: GHOST_VERSION,
      courseId: rec.courseId,
      duration: round3(duration),
      frames: rec.frames
    };
  }

  function frameToPose(f) {
    const flags = unpackFlags(f[5]);
    return {
      t: f[0],
      x: f[1],
      y: f[2],
      z: f[3],
      yaw: f[4],
      low: flags.low,
      wallrun: flags.wallrun,
      grounded: flags.grounded,
      roll: f[6] || 0,
      speed: 0,
      finished: false,
      grapple: f.length >= 10 ? { x: f[7], y: f[8], z: f[9] } : null
    };
  }

  function sampleGhost(ghost, t) {
    if (!ghost || !Array.isArray(ghost.frames) || ghost.frames.length === 0) return null;
    const frames = ghost.frames;
    const n = frames.length;
    if (n === 1 || t <= frames[0][0]) {
      return frameToPose(frames[0]);
    }
    const last = frames[n - 1];
    if (t >= last[0]) {
      const pose = frameToPose(last);
      pose.finished = true;
      return pose;
    }

    // Binary search for largest i where frames[i][0] <= t
    let lo = 0;
    let hi = n - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid][0] <= t) lo = mid;
      else hi = mid;
    }

    const a = frames[lo];
    const b = frames[hi];
    const span = b[0] - a[0];
    const alpha = span > 1e-6 ? clamp01((t - a[0]) / span) : 0;
    const flags = unpackFlags(alpha < 0.5 ? a[5] : b[5]);
    const dx = b[1] - a[1];
    const dz = b[3] - a[3];
    const speed = span > 1e-6 ? Math.hypot(dx, dz) / span : 0;

    return {
      t: t,
      x: a[1] + dx * alpha,
      y: a[2] + (b[2] - a[2]) * alpha,
      z: a[3] + dz * alpha,
      yaw: lerpAngle(a[4], b[4], alpha),
      low: flags.low,
      wallrun: flags.wallrun,
      grounded: flags.grounded,
      roll: (a[6] || 0) + ((b[6] || 0) - (a[6] || 0)) * alpha,
      speed: speed,
      finished: false,
      grapple: a.length >= 10 && b.length >= 10
        ? {
            x: a[7] + (b[7] - a[7]) * alpha,
            y: a[8] + (b[8] - a[8]) * alpha,
            z: a[9] + (b[9] - a[9]) * alpha
          }
        : a.length >= 10 && alpha < 0.5
          ? { x: a[7], y: a[8], z: a[9] }
          : null
    };
  }

  function isValidFrame(f) {
    if (!Array.isArray(f) || f.length < 6) return false;
    for (let i = 0; i < 6; i++) {
      if (typeof f[i] !== 'number' || !Number.isFinite(f[i])) return false;
    }
    return true;
  }

  function serializeGhost(ghost) {
    if (!ghost || !Array.isArray(ghost.frames) || ghost.frames.length === 0) return null;
    return JSON.stringify({
      v: GHOST_VERSION,
      courseId: String(ghost.courseId || ''),
      duration: round3(ghost.duration || ghost.frames[ghost.frames.length - 1][0]),
      frames: ghost.frames
    });
  }

  function deserializeGhost(raw, expectedCourseId) {
    if (!raw || typeof raw !== 'string') return null;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return null;
    }
    if (!parsed || parsed.v !== GHOST_VERSION || !Array.isArray(parsed.frames) || parsed.frames.length < 2) {
      return null;
    }
    if (expectedCourseId && parsed.courseId && parsed.courseId !== expectedCourseId) {
      return null;
    }
    for (let i = 0; i < parsed.frames.length; i++) {
      if (!isValidFrame(parsed.frames[i])) return null;
      if (i > 0 && parsed.frames[i][0] < parsed.frames[i - 1][0]) return null;
    }
    const lastT = parsed.frames[parsed.frames.length - 1][0];
    return {
      v: GHOST_VERSION,
      courseId: String(parsed.courseId || expectedCourseId || ''),
      duration: typeof parsed.duration === 'number' && Number.isFinite(parsed.duration) ? parsed.duration : lastT,
      frames: parsed.frames
    };
  }

  function nextGhostMode(mode) {
    if (mode === 'pb') return 'last';
    if (mode === 'last') return 'off';
    return 'pb';
  }

  function selectGhostEntry(mode, pbGhost, lastGhost) {
    if (mode === 'off') return { kind: 'off', ghost: null };
    if (mode === 'last') {
      if (lastGhost) return { kind: 'last', ghost: lastGhost };
      if (pbGhost) return { kind: 'pb', ghost: pbGhost };
      return { kind: 'none', ghost: null };
    }
    if (pbGhost) return { kind: 'pb', ghost: pbGhost };
    if (lastGhost) return { kind: 'last', ghost: lastGhost };
    return { kind: 'none', ghost: null };
  }

  // ---------- Three.js Semi-Transparent Composite Ghost Mesh ----------
  function createGhostMesh(THREE, scene) {
    const group = new THREE.Group();
    group.name = 'GhostRunner';
    group.visible = false;

    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x65e7ff,
      emissive: 0x1fc4e8,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.36,
      depthWrite: false
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xcff8ff,
      emissive: 0x65e7ff,
      emissiveIntensity: 1.15,
      roughness: 0.15,
      metalness: 0.35,
      transparent: true,
      opacity: 0.56,
      depthWrite: false
    });

    const accentMat = new THREE.MeshBasicMaterial({
      color: 0xeafaff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x65e7ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Body rig pivots at ground contact (0, 0, 0)
    const body = new THREE.Group();
    group.add(body);

    // 1. Pelvis / lower core
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.24), shellMat);
    pelvis.position.set(0, 0.78, 0);
    body.add(pelvis);

    // 2. Torso hull (tapered chamfered chest)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.56, 8), shellMat);
    torso.scale.set(1.1, 1, 0.72);
    torso.position.set(0, 1.16, 0);
    body.add(torso);

    // 3. Spine / kinetic core pack (rear)
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.12), coreMat);
    spine.position.set(0, 1.18, 0.18);
    body.add(spine);

    // 4 & 5. Aerodynamic shoulder fins (left & right)
    const finGeo = new THREE.BoxGeometry(0.14, 0.26, 0.3);
    const leftFin = new THREE.Mesh(finGeo, coreMat);
    leftFin.position.set(-0.31, 1.32, 0.03);
    leftFin.rotation.set(0.25, 0, 0.24);
    body.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, coreMat);
    rightFin.position.set(0.31, 1.32, 0.03);
    rightFin.rotation.set(0.25, 0, -0.24);
    body.add(rightFin);

    // 6. Head dome
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);
    body.add(headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), shellMat);
    headGroup.add(head);

    // 7. Forward visor strip (-Z is forward in player yaw space)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.075, 0.14), accentMat);
    visor.position.set(0, 0.01, -0.11);
    headGroup.add(visor);

    // 8 & 9. Stride legs (pivot from hip y = 0.74)
    const legGeo = new THREE.CapsuleGeometry(0.085, 0.5, 4, 8);
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.13, 0.74, 0);
    const leftLeg = new THREE.Mesh(legGeo, shellMat);
    leftLeg.position.set(0, -0.34, 0);
    leftLegPivot.add(leftLeg);
    body.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.13, 0.74, 0);
    const rightLeg = new THREE.Mesh(legGeo, shellMat);
    rightLeg.position.set(0, -0.34, 0);
    rightLegPivot.add(rightLeg);
    body.add(rightLegPivot);

    // 10. Ground contact ring halo (stays flush above surface at y = 0.03)
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 28), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, 0.03, 0);
    group.add(halo);

    // 11. Wireframe silhouette trim around torso for crisp depth readability
    const torsoEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.25, 0.2, 0.56, 8)),
      new THREE.LineBasicMaterial({ color: 0x9bf4ff, transparent: true, opacity: 0.45, depthWrite: false })
    );
    torsoEdges.scale.set(1.1, 1, 0.72);
    torsoEdges.position.copy(torso.position);
    body.add(torsoEdges);

    // Optional tether line when ghost grapples
    const tetherMat = new THREE.LineBasicMaterial({
      color: 0x65e7ff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    const tetherLine = new THREE.Line(tetherGeo, tetherMat);
    tetherLine.frustumCulled = false;
    tetherLine.visible = false;
    scene.add(tetherLine);

    group.traverse(function (obj) {
      if (obj.isMesh || obj.isLineSegments) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.renderOrder = 2;
      }
    });

    scene.add(group);

    return {
      group,
      body,
      headGroup,
      leftLegPivot,
      rightLegPivot,
      halo,
      tetherLine,
      materials: { shellMat, coreMat, accentMat, haloMat, edgeMat: torsoEdges.material, tetherMat },
      geometries: [pelvis.geometry, torso.geometry, spine.geometry, finGeo, head.geometry, visor.geometry, legGeo, halo.geometry, torsoEdges.geometry, tetherGeo],
      phase: 0,
      crouchLerp: 0,
      currentKind: 'pb'
    };
  }

  function setGhostPalette(visual, kind) {
    if (!visual || visual.currentKind === kind) return;
    visual.currentKind = kind;
    const m = visual.materials;
    if (kind === 'last') {
      m.shellMat.color.setHex(0xff9b55);
      m.shellMat.emissive.setHex(0xc95218);
      m.coreMat.color.setHex(0xffe1c9);
      m.coreMat.emissive.setHex(0xff9b55);
      m.accentMat.color.setHex(0xfff1e6);
      m.haloMat.color.setHex(0xff9b55);
      m.edgeMat.color.setHex(0xffb885);
      m.tetherMat.color.setHex(0xff9b55);
    } else {
      m.shellMat.color.setHex(0x65e7ff);
      m.shellMat.emissive.setHex(0x1fc4e8);
      m.coreMat.color.setHex(0xcff8ff);
      m.coreMat.emissive.setHex(0x65e7ff);
      m.accentMat.color.setHex(0xeafaff);
      m.haloMat.color.setHex(0x65e7ff);
      m.edgeMat.color.setHex(0x9bf4ff);
      m.tetherMat.color.setHex(0x65e7ff);
    }
  }

  function updateGhostMesh(visual, pose, playerPos, dt, kind) {
    if (!visual) return;
    if (!pose) {
      visual.group.visible = false;
      visual.tetherLine.visible = false;
      return;
    }

    setGhostPalette(visual, kind || 'pb');
    visual.group.visible = true;
    visual.group.position.set(pose.x, pose.y, pose.z);

    // Fade gently when player gets close so ghost never obscures first-person view
    let proximity = 1;
    if (playerPos) {
      const dist = Math.hypot(pose.x - playerPos.x, pose.y - playerPos.y, pose.z - playerPos.z);
      if (dist < 2.6) {
        proximity = Math.max(0.28, (dist - 0.5) / 2.1);
      }
    }
    const finishFade = pose.finished ? 0.55 : 1;
    const alphaScale = proximity * finishFade;
    visual.materials.shellMat.opacity = 0.36 * alphaScale;
    visual.materials.coreMat.opacity = 0.56 * alphaScale;
    visual.materials.accentMat.opacity = 0.72 * alphaScale;
    visual.materials.haloMat.opacity = 0.52 * alphaScale;
    visual.materials.edgeMat.opacity = 0.45 * alphaScale;

    // Smooth slide/crouch transition
    const targetCrouch = pose.low ? 1 : 0;
    const blend = Math.min(1, (dt || 0.016) * 14);
    visual.crouchLerp += (targetCrouch - visual.crouchLerp) * blend;

    visual.body.rotation.order = 'YXZ';
    visual.body.rotation.y = pose.yaw;
    visual.body.rotation.z = pose.roll || 0;
    // Slide leans torso back slightly and lowers body profile
    visual.body.rotation.x = visual.crouchLerp * 0.38;
    visual.body.scale.set(1 + visual.crouchLerp * 0.08, 1 - visual.crouchLerp * 0.42, 1 + visual.crouchLerp * 0.08);
    visual.body.position.y = -visual.crouchLerp * 0.04;

    // Grounded stride animation proportional to horizontal speed
    if (pose.grounded && !pose.low && pose.speed > 1.2) {
      visual.phase += (dt || 0.016) * Math.min(18, pose.speed * 0.75);
      const swing = Math.sin(visual.phase) * 0.55;
      visual.leftLegPivot.rotation.x = swing;
      visual.rightLegPivot.rotation.x = -swing;
    } else if (!pose.grounded && !pose.low) {
      visual.leftLegPivot.rotation.x = 0.32;
      visual.rightLegPivot.rotation.x = -0.22;
    } else {
      visual.leftLegPivot.rotation.x = 0;
      visual.rightLegPivot.rotation.x = 0;
    }

    // Tether line when ghost grapples
    if (pose.grapple) {
      const posAttr = visual.tetherLine.geometry.attributes.position;
      posAttr.setXYZ(0, pose.x, pose.y + 1.2, pose.z);
      posAttr.setXYZ(1, pose.grapple.x, pose.grapple.y, pose.grapple.z);
      posAttr.needsUpdate = true;
      visual.materials.tetherMat.opacity = 0.45 * alphaScale;
      visual.tetherLine.visible = true;
    } else {
      visual.tetherLine.visible = false;
    }
  }

  function disposeGhostMesh(visual, scene) {
    if (!visual) return;
    if (scene) {
      scene.remove(visual.group);
      scene.remove(visual.tetherLine);
    }
    for (let i = 0; i < visual.geometries.length; i++) {
      visual.geometries[i].dispose();
    }
    const mats = visual.materials;
    for (const k in mats) {
      if (mats[k]) mats[k].dispose();
    }
  }

  return {
    GHOST_VERSION,
    SAMPLE_INTERVAL,
    MAX_GHOST_DURATION,
    MAX_GHOST_FRAMES,
    FLAG_LOW,
    FLAG_WALLRUN,
    FLAG_GROUNDED,
    normalizeAngle,
    lerpAngle,
    packFlags,
    unpackFlags,
    createRecorder,
    recordSample,
    finalizeRecording,
    sampleGhost,
    serializeGhost,
    deserializeGhost,
    nextGhostMode,
    selectGhostEntry,
    createGhostMesh,
    updateGhostMesh,
    disposeGhostMesh
  };
});
