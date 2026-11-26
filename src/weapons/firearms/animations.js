// First-person firearm recoil, ADS, reload, cylinder/bolt action, inspect, and support-hand IK choreography.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { WeaponAudio, CaseAudio, smoothstep, bell, easeOutCubic } = VI;
  const RIGHT_HAND_GRIP_ROLL = -1.42; // Rolls right hand so back faces +X, palm faces -X, thumb/index at +Y, fingers wrap grip front
  const _wAnchorLocal = new THREE.Vector3();
  const _wLeftPocketLocal = new THREE.Vector3();
  const _wWorldPos = new THREE.Vector3();
  const _wWorldQuat = new THREE.Quaternion();
  const _wLeftRelQuat = new THREE.Quaternion();
  const _wLeftEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _wOffsetVec = new THREE.Vector3();
  const _wInvRootMat = new THREE.Matrix4();
  const _wRootQuat = new THREE.Quaternion();
  const _wInvRootQuat = new THREE.Quaternion();
  const _wFreePos = new THREE.Vector3();
  const _wFreeQuat = new THREE.Quaternion();
  const _wFreeEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  const WEAPON_GRIP_SPECS = {
    rifle: {
      gripCenter: [0.0, -0.048, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.012, -0.245],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    smg: {
      gripCenter: [0.0, -0.048, 0.046],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.030, -0.175],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.14, -0.42, 1.96],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.72, middle: 0.78, ring: 0.82, pinky: 0.80, thumb: 0.40, indexRingHook: 0, indexPoint: 0 }
    },
    shotgun: {
      gripCenter: [0.0, -0.046, 0.072],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.018, -0.295],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.12],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.70, middle: 0.76, ring: 0.80, pinky: 0.78, thumb: 0.38, indexRingHook: 0, indexPoint: 0 }
    },
    awp: {
      gripCenter: [0.0, -0.048, 0.058],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.014, -0.280],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    deagle: {
      gripCenter: [0.0, -0.050, 0.030],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.015, -0.048, 0.022],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    revolver: {
      gripCenter: [0.0, -0.050, 0.040],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.015, -0.048, 0.030],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    pistol: {
      gripCenter: [0.0, -0.048, 0.036],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.046, 0.028],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    famas: {
      gripCenter: [0.0, -0.052, 0.032],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.008, -0.235],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.06],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    scar: {
      gripCenter: [0.0, -0.054, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.002, -0.245],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    honeybadger: {
      gripCenter: [0.0, -0.048, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.004, -0.240],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.06],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    mp7: {
      gripCenter: [0.0, -0.044, 0.032],
      rightPocket: [0.003, -0.027, -0.038],
      supportAnchor: [0.0, -0.034, -0.185],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.14, -0.40, 1.88],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.74, middle: 0.80, ring: 0.84, pinky: 0.82, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    sawedoff: {
      gripCenter: [0.0, -0.034, 0.118],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.004, -0.165],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.70, middle: 0.76, ring: 0.80, pinky: 0.78, thumb: 0.38, indexRingHook: 0, indexPoint: 0 }
    },
    leverslug: {
      gripCenter: [0.0, -0.022, 0.095],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.002, -0.255],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.10],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    dmr: {
      gripCenter: [0.0, -0.048, 0.054],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.002, -0.320],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    scout: {
      gripCenter: [0.0, -0.044, 0.056],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.006, -0.275],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    g18: {
      gripCenter: [0.0, -0.046, 0.028],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.046, 0.024],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    usps: {
      gripCenter: [0.0, -0.052, 0.048],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.052, 0.044],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    akimbo: {
      gripCenter: [0.0, -0.046, 0.026],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.27, -0.046, 0.026],
      leftPocket: [-0.003, -0.027, -0.035],
      leftRelEuler: [0.0, 0.0, 1.42],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 }
    },
    katana: {
      gripCenter: [0.0, 0.0, 0.062],
      rightPocket: [0.004, -0.026, -0.036],
      supportAnchor: [0.0, -0.002, 0.168],
      leftPocket: [0.002, -0.024, -0.034],
      leftRelEuler: [0.08, -0.22, 1.56],
      rightPose: { index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.95, thumb: 0.76, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.90, middle: 0.92, ring: 0.94, pinky: 0.94, thumb: 0.72, indexRingHook: 0, indexPoint: 0 }
    },
    rpg: {
      gripCenter: [0.0, -0.040, 0.032],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.038, -0.220],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.10, -0.35, 1.80],
      rightPose: { index: 0.48, middle: 0.92, ring: 0.94, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.80, middle: 0.86, ring: 0.88, pinky: 0.88, thumb: 0.50, indexRingHook: 0, indexPoint: 0 }
    },
    minigun: {
      gripCenter: [0.0, -0.048, 0.140],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [-0.074, -0.024, -0.155],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.18, -0.42, 1.92],
      rightPose: { index: 0.60, middle: 0.92, ring: 0.94, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.82, middle: 0.86, ring: 0.88, pinky: 0.88, thumb: 0.52, indexRingHook: 0, indexPoint: 0 }
    },
    railcannon: {
      gripCenter: [0.0, -0.048, 0.050],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.006, -0.280],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    grenadelauncher: {
      gripCenter: [0.0, -0.048, 0.055],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.040, -0.300],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.12, -0.38, 1.85],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.76, middle: 0.82, ring: 0.84, pinky: 0.84, thumb: 0.46, indexRingHook: 0, indexPoint: 0 }
    }
  };

  function createWeaponAnimOut() {
    return {
      rx: 0, ry: 0, rz: 0,
      rRotX: 0, rRotY: 0, rRotZ: 0,
      wPosX: 0, wPosY: 0, wPosZ: 0,
      wRotX: 0, wRotY: 0, wRotZ: 0,
      spinAngle: 0,
      leftLock: 1,
      leftUseRawReload: false,
      leftAnchorOffX: 0, leftAnchorOffY: 0, leftAnchorOffZ: 0,
      leftRelOffX: 0, leftRelOffY: 0, leftRelOffZ: 0,
      leftFreeX: -0.24, leftFreeY: -0.28, leftFreeZ: -0.34,
      leftFreeRotX: 0.18, leftFreeRotY: -0.42, leftFreeRotZ: 0.24,
      boltLift: 0, boltPull: 0,
      pumpPull: 0,
      lifterPush: 0,
      showReloadShells: false,
      showReloadBullet: false,
      craneOpen: 0,
      cylinderSpin: 0,
      ejectorPush: 0,
      latchSlide: 0,
      triggerPull: 0,
      ammoVisibleCount: -1,
      cylinderIndex: 0,
      slideBack: 0, hammerBack: 0,
      magDropY: 0, magTiltX: 0,
      breechAngle: 0, breechShellMode: 'seated', breechShellEject: 0, breechShellInsert0: 1, breechShellInsert1: 1,
      akimboTossT: 0, akimboHide: false,
      rPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      lPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    };
  }

  function weaponInspectDuration(wt, tier) {
    if (wt === 'katana') return 3.05;
    if (wt === 'revolver') return tier === 'mythic' ? 3.65 : tier === 'uncommon' ? 2.65 : 2.85;
    if (wt === 'deagle') return tier === 'uncommon' ? 2.55 : 2.15;
    if (wt === 'awp') return tier === 'uncommon' ? 2.70 : 2.55;
    return tier === 'uncommon' ? 2.65 : 2.35;
  }

  // Exact inverse-compensated right-hand shift for AWP right-side bolt cycling so rifle stays braced in left hand
  function applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull) {
    if (handOff <= 0.0001 && boltLift <= 0.0001 && boltPull <= 0.0001) return;
    const dx = handOff * 0.048 + boltLift * 0.008;
    const dy = handOff * 0.082 + boltLift * 0.016;
    const dz = -handOff * 0.018 + boltPull * 0.056;
    const cosC = Math.cos(-RIGHT_HAND_GRIP_ROLL);
    const sinC = Math.sin(-RIGHT_HAND_GRIP_ROLL);

    out.rx += dx;
    out.ry += dy;
    out.rz += dz;
    // Counter-translate weapon inside rightHandPivot so the AWP stays steady in the left support hand
    out.wPosX -= (dx * cosC - dy * sinC);
    out.wPosY -= (dx * sinC + dy * cosC);
    out.wPosZ -= dz;
    // Subtle physical bolt-impulse roll & right-hand bolt-knob pinch
    out.rRotZ -= boltPull * 0.07;
    out.boltLift = Math.max(out.boltLift, boltLift);
    out.boltPull = Math.max(out.boltPull, boltPull * 0.058);

    out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.74, handOff);
    out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.56, handOff);
    out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.42, handOff);
    out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.36, handOff);
    out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.76, handOff);
  }

  // Exact inverse-compensated right-hand shift for V-47 right-side AK charging handle rack
  // so the left hand braces the handguard steadily and NEVER reaches through the receiver!
  function applyV47RightHandRack(out, spec, handOff, rackPull) {
    if (handOff <= 0.0001 && rackPull <= 0.0001) return;
    const dx = handOff * 0.044;
    const dy = handOff * 0.072;
    const dz = -handOff * 0.062 + rackPull * 0.058;
    const cosC = Math.cos(-RIGHT_HAND_GRIP_ROLL);
    const sinC = Math.sin(-RIGHT_HAND_GRIP_ROLL);

    out.rx += dx;
    out.ry += dy;
    out.rz += dz;
    // Counter-translate V-47 inside rightHandPivot so the rifle stays braced steady in the left hand
    out.wPosX -= (dx * cosC - dy * sinC);
    out.wPosY -= (dx * sinC + dy * cosC);
    out.wPosZ -= dz;
    out.rRotZ -= rackPull * 0.06;
    out.boltPull = Math.max(out.boltPull, rackPull * 0.058);

    // Hooked index/middle fingers pulling the upturned AK charging handle straight back
    out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.84, handOff);
    out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.68, handOff);
    out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.48, handOff);
    out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.40, handOff);
    out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.62, handOff);
  }

  // Authentic real-world firearm reloads, hand-racking, M870 twin-shell bottom loading, and AWP bolt cycling
  function evaluateWeaponReloadAndAction(wt, state, out, playAudio) {
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    out.leftUseRawReload = false;
    out.pumpPull = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;
    out.showReloadBullet = false;

    // -1) Primary Ronin Katana combat choreography: crisp samurai ready guard, fluid 3-hit slash combo, directional dash-lunge, and compact RMB deflect guard!
    if (wt === 'katana') {
      const inspectW = state.inspectT < 1 ? bell(state.inspectT, 0.0, 1.0) : 0;
      const idleW = 1 - inspectW;
      // Clean high-ready samurai diagonal poise (yielding smoothly during inspect)
      out.rx += 0.032 * idleW;
      out.ry += -0.014 * idleW;
      out.rz += -0.028 * idleW;
      out.rRotX += 0.28 * idleW;
      out.rRotY += -0.34 * idleW;
      out.rRotZ += -0.26 * idleW;

      const slashT = Number.isFinite(state.katanaSlashT) ? state.katanaSlashT : 1;
      const combo = Number.isFinite(state.katanaSlashCombo) ? (state.katanaSlashCombo % 3) : 0;
      if (slashT < 1) {
        // Smooth cubic-eased windup -> fast arc strike -> clean follow-through settle (zero snappy jumps)
        const wind = smoothstep(0.0, 0.22, slashT) * (1 - smoothstep(0.22, 0.44, slashT));
        const strike = smoothstep(0.16, 0.48, slashT) * (1 - smoothstep(0.56, 1.0, slashT));
        const follow = smoothstep(0.44, 0.72, slashT) * (1 - smoothstep(0.76, 1.0, slashT));
        if (combo === 0) {
          // Fluid diagonal slash: upper-right -> lower-left
          out.rx += 0.062 * wind - 0.24 * strike;
          out.ry += 0.072 * wind - 0.10 * strike;
          out.rz += -0.065 * strike;
          out.rRotX += 0.26 * wind - 0.78 * strike - 0.14 * follow;
          out.rRotY += -0.30 * wind + 1.02 * strike + 0.16 * follow;
          out.rRotZ += -0.22 * wind + 0.74 * strike;
        } else if (combo === 1) {
          // Fluid reverse upward slash: lower-left -> upper-right
          out.rx += -0.18 * wind + 0.13 * strike;
          out.ry += -0.08 * wind + 0.10 * strike;
          out.rz += -0.072 * strike;
          out.rRotX += -0.36 * wind + 0.68 * strike;
          out.rRotY += 0.70 * wind - 0.94 * strike;
          out.rRotZ += 0.60 * wind - 0.76 * strike;
        } else {
          // Crisp horizontal iaido cleave
          out.rx += 0.095 * wind - 0.28 * strike;
          out.ry += -0.022 * strike;
          out.rz += -0.095 * strike;
          out.rRotX += -0.22 * strike;
          out.rRotY += -0.40 * wind + 1.32 * strike;
          out.rRotZ += 0.90 * strike;
        }
      }

      const dashT = Number.isFinite(state.katanaDashT) ? state.katanaDashT : 1;
      if (dashT < 1) {
        const thrust = smoothstep(0.0, 0.26, dashT) * (1 - smoothstep(0.54, 1.0, dashT));
        out.rx += -0.105 * thrust;
        out.ry += 0.016 * thrust;
        out.rz += -0.165 * thrust;
        out.rRotX += -0.24 * thrust;
        out.rRotY += 0.42 * thrust;
        out.rRotZ += 0.88 * thrust;
      }

      const defP = Number.isFinite(state.katanaDeflectProgress) ? state.katanaDeflectProgress : 0;
      if (defP > 0.001) {
        const dp = smoothstep(0, 1, defP);
        // Tight diagonal samurai parry stance in front of chest — keeps both arms compact & natural!
        out.rx = THREE.MathUtils.lerp(out.rx, -0.074, dp);
        out.ry = THREE.MathUtils.lerp(out.ry, 0.028, dp);
        out.rz = THREE.MathUtils.lerp(out.rz, -0.068, dp);
        out.rRotX = THREE.MathUtils.lerp(out.rRotX, 0.34, dp);
        out.rRotY = THREE.MathUtils.lerp(out.rRotY, 0.48, dp);
        out.rRotZ = THREE.MathUtils.lerp(out.rRotZ, 0.52, dp);
        out.leftAnchorOffZ -= 0.028 * dp;
        out.leftRelOffZ -= 0.18 * dp;
      }
      return;
    }

    // 0) R-88 Revolver bespoke draw twirl, 0.20s double-action charge, Fan-the-Hammer palm-slap & live shell-by-shell reload!
    if (wt === 'revolver') {
      out.ammoVisibleCount = Number.isFinite(state.revolverAmmo) ? state.revolverAmmo : 6;
      out.cylinderIndex = Number.isFinite(state.revolverCylinderIndex) ? state.revolverCylinderIndex : 0;

      // 0a) CS-Style Draw Forward Trigger-Finger Twirl (360° spin into crisp catch!)
      if (state.drawT < 1) {
        const dtNorm = state.drawT;
        const spinPhase = smoothstep(0.06, 0.78, dtNorm);
        const openGrip = smoothstep(0.0, 0.14, dtNorm) * (1 - smoothstep(0.68, 0.84, dtNorm));
        const catchSnap = bell(dtNorm, 0.72, 0.96);
        const dropLeft = 1 - smoothstep(0.64, 0.94, dtNorm);

        out.leftLock = Math.min(out.leftLock, 1 - dropLeft);
        out.leftFreeX = -0.26;
        out.leftFreeY = -0.34;
        out.leftFreeZ = -0.34;
        out.spinAngle += (1 - spinPhase) * Math.PI * 2;
        out.ry += catchSnap * 0.015;
        out.rRotX += -catchSnap * 0.14;
        out.rRotY += openGrip * 0.24;
        out.rRotZ += openGrip * 0.16;

        out.rPose.indexRingHook = Math.max(out.rPose.indexRingHook, openGrip * 0.95);
        out.rPose.index = THREE.MathUtils.lerp(out.rPose.index, 0.56, openGrip);
        out.rPose.middle = THREE.MathUtils.lerp(out.rPose.middle, 0.14, openGrip);
        out.rPose.ring = THREE.MathUtils.lerp(out.rPose.ring, 0.16, openGrip);
        out.rPose.pinky = THREE.MathUtils.lerp(out.rPose.pinky, 0.20, openGrip);
        out.rPose.thumb = THREE.MathUtils.lerp(out.rPose.thumb, 0.18, openGrip);

        if (playAudio && dtNorm > 0.74 && !(state.drawCueMask & 1)) {
          state.drawCueMask |= 1;
          CaseAudio.balisongClack(1.04);
        }
      }

      // 0b) 0.20s Double-Action Trigger Charge (hammer pulls back, trigger squeezes, cylinder indexes 60°, subtle tension tremor)
      const ch = Math.max(0, Math.min(1, Number(state.revolverCharge) || 0));
      if (ch > 0.002) {
        const chEase = smoothstep(0, 1, ch);
        out.hammerBack = Math.max(out.hammerBack, chEase * 0.94);
        out.triggerPull = Math.max(out.triggerPull, chEase);
        out.cylinderSpin += chEase * (Math.PI / 3);
        const tremor = Math.sin(performance.now() * 0.092) * 0.00085 * chEase;
        out.rx += tremor;
        out.ry += tremor * 0.7 - chEase * 0.004;
        out.rz += -chEase * 0.012;
        out.rRotX += chEase * 0.028;
        out.rPose.index = THREE.MathUtils.lerp(out.rPose.index, 0.86, chEase);
      }

      // 0c) CS R8 RMB Fan-the-Hammer: left hand sweeps rapidly across the top of the hammer spur in a crisp palm-slap!
      if (state.fanT < 1) {
        const ft = state.fanT;
        const env = bell(ft, 0.0, 1.0);
        const slapSweep = smoothstep(0.06, 0.42, ft) * (1 - smoothstep(0.56, 0.98, ft));
        const slapArc = Math.sin(ft * Math.PI);
        out.rRotZ += env * 0.26;
        out.rRotY += env * 0.15;
        out.rRotX += env * 0.06;
        // Left hand sweeps from support grip up over the hammer (weapon-local [0, 0.064, 0.020])
        // Relative to supportAnchor [-0.015, -0.048, 0.030] => dx ~ +0.02, dy ~ +0.115, dz ~ -0.01
        out.leftAnchorOffX += slapSweep * (0.018 + (ft - 0.35) * 0.09);
        out.leftAnchorOffY += slapSweep * (0.105 + slapArc * 0.028);
        out.leftAnchorOffZ += slapSweep * (-0.012);
        out.leftRelOffX += slapSweep * -0.45;
        out.leftRelOffY += slapSweep * 0.55;
        out.leftRelOffZ += slapSweep * -0.95;
        // Flat open palm for cowboy hammer slap
        out.lPose.index = THREE.MathUtils.lerp(out.lPose.index, 0.14, slapSweep);
        out.lPose.middle = THREE.MathUtils.lerp(out.lPose.middle, 0.14, slapSweep);
        out.lPose.ring = THREE.MathUtils.lerp(out.lPose.ring, 0.18, slapSweep);
        out.lPose.pinky = THREE.MathUtils.lerp(out.lPose.pinky, 0.22, slapSweep);
        out.lPose.thumb = THREE.MathUtils.lerp(out.lPose.thumb, 0.20, slapSweep);
      }

      // 0d) Interruptible 6-Round Shell-by-Shell Reload ('open' -> 'insert' x N -> 'close')
      const rPhase = state.revolverReloadPhase || 'none';
      if (rPhase !== 'none') {
        const p = Math.max(0, Math.min(1, Number(state.revolverReloadPhaseProgress) || 0));
        out.leftUseRawReload = true;

        if (rPhase === 'open') {
          const lift = smoothstep(0.0, 0.45, p);
          const dumpTilt = bell(p, 0.44, 0.94);
          out.rx += -lift * 0.036;
          out.ry += lift * 0.038;
          out.rz += lift * 0.016;
          out.rRotX += lift * 0.18 + dumpTilt * 0.38;
          out.rRotY += lift * 0.38;
          out.rRotZ += lift * 0.50;
          out.latchSlide = bell(p, 0.04, 0.36);
          out.craneOpen = smoothstep(0.14, 0.66, p);
          out.ejectorPush = bell(p, 0.46, 0.90);

          // Right thumb presses cylinder release latch
          out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.34, bell(p, 0.04, 0.38));

          // Left hand swings off grip down to belt pouch to grab first .500 cartridge
          const toPouch = smoothstep(0.18, 0.85, p);
          out.leftAnchorOffX += -toPouch * 0.065;
          out.leftAnchorOffY += -toPouch * 0.145;
          out.leftAnchorOffZ += -toPouch * 0.025;
          out.leftRelOffX += -toPouch * 0.25;
          out.leftRelOffY += toPouch * 0.22;
          out.leftRelOffZ += -toPouch * 0.35;
          return;
        }

        if (rPhase === 'insert') {
          // Revolver stays steadily canted to present the open rear face of the swung-out cylinder!
          const feed = bell(p, 0.14, 0.82);
          const seatBump = bell(p, 0.58, 0.86);
          out.rx += -0.036;
          out.ry += 0.038 - seatBump * 0.008;
          out.rz += 0.016 + seatBump * 0.009;
          out.rRotX += 0.18 - seatBump * 0.04;
          out.rRotY += 0.38;
          out.rRotZ += 0.50 + seatBump * 0.03;
          out.craneOpen = 1.0;
          // Smoothly index cylinder 60° as each shell slides home!
          out.cylinderSpin += smoothstep(0.60, 0.96, p) * (Math.PI / 3);

          // Left hand carries gleaming .500 cartridge from pouch up into open cylinder chamber (swung left to ~[-0.048, 0.024, -0.022])
          // Relative to supportAnchor [-0.015, -0.048, 0.030] => target delta ~ [-0.042, +0.070, -0.035]
          const pouchY = -0.145;
          const chamberY = 0.068;
          out.leftAnchorOffX += THREE.MathUtils.lerp(-0.068, -0.042, feed);
          out.leftAnchorOffY += THREE.MathUtils.lerp(pouchY, chamberY, feed);
          out.leftAnchorOffZ += THREE.MathUtils.lerp(-0.020, -0.036 - seatBump * 0.014, feed);
          out.leftRelOffX += THREE.MathUtils.lerp(-0.24, 0.16, feed);
          out.leftRelOffY += THREE.MathUtils.lerp(0.22, 0.38, feed);
          out.leftRelOffZ += THREE.MathUtils.lerp(-0.32, -0.18, feed);

          out.showReloadBullet = p > 0.08 && p < 0.72;
          out.lPose.index = 0.42;
          out.lPose.middle = 0.62;
          out.lPose.ring = 0.76;
          out.lPose.pinky = 0.84;
          out.lPose.thumb = 0.66;
          return;
        }

        if (rPhase === 'close') {
          // Crisp outward-to-inward wrist flick snapping hinged crane & cylinder shut!
          const holdOut = 1 - smoothstep(0.0, 0.58, p);
          const whipSnap = bell(p, 0.18, 0.66);
          const settle = 1 - smoothstep(0.45, 1.0, p);
          out.rx += -0.036 * settle + whipSnap * 0.024;
          out.ry += 0.038 * settle;
          out.rz += 0.016 * settle;
          out.rRotX += 0.18 * settle;
          out.rRotY += 0.38 * settle - whipSnap * 0.24;
          out.rRotZ += 0.50 * holdOut - whipSnap * 0.56;
          out.craneOpen = 1 - smoothstep(0.08, 0.56, p);

          // Left hand rises cleanly back from pouch to grip
          const backW = 1 - smoothstep(0.32, 0.94, p);
          out.leftAnchorOffX += -0.060 * backW;
          out.leftAnchorOffY += -0.120 * backW;
          out.leftAnchorOffZ += -0.018 * backW;
          return;
        }
      }
      return;
    }

    // 1) Post-shot mechanical actions (AWP right-hand bolt cycle & M870 left-hand pump rack)
    if (state.boltT < 1 && state.reloadT >= 1) {
      const bt = state.boltT;
      if (wt === 'awp') {
        const handOff = smoothstep(0.05, 0.20, bt) * (1 - smoothstep(0.78, 0.96, bt));
        const boltLift = smoothstep(0.14, 0.28, bt) * (1 - smoothstep(0.70, 0.84, bt));
        const boltPull = smoothstep(0.28, 0.48, bt) * (1 - smoothstep(0.54, 0.72, bt));
        applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);
        if (playAudio && bt > 0.24 && !(state.boltCueMask & 1)) {
          state.boltCueMask |= 1;
          WeaponAudio.boltRack();
        }
      } else if (wt === 'shotgun') {
        const pumpArc = bell(bt, 0.12, 0.88);
        out.pumpPull = pumpArc * 0.086;
        out.rRotX += pumpArc * 0.05;
        out.rRotZ -= pumpArc * 0.06;
        if (playAudio && bt > 0.18 && !(state.boltCueMask & 1)) {
          state.boltCueMask |= 1;
          WeaponAudio.pumpRack();
        }
      }
    }

    // 2) Full reload choreography (per-firearm authentic reload + real-world side racking!)
    if (state.reloadT >= 1) return;
    const t = state.reloadT;
    out.leftUseRawReload = true;

    if (wt === 'sawedoff') {
      // DB-12 SAWED-OFF BREAK-ACTION (BREACH-ACTION) RELOAD:
      // 1) Thumb cracks top latch & barrels hinge open (0.04..0.22)
      // 2) Spring ejectors launch spent hulls cleanly backward/downward off-screen (0.18..0.44)
      // 3) Left hand brings 2 fresh shells up from below and seats them straight into twin chambers (0.44..0.72)
      // 4) Left hand returns to forend & right wrist snaps breech shut (0.74..0.94)
      const openEnv = smoothstep(0.05, 0.21, t) * (1 - smoothstep(0.76, 0.92, t));
      const snapFlick = bell(t, 0.78, 0.96);
      out.rx -= openEnv * 0.042;
      out.ry += openEnv * 0.028 - snapFlick * 0.012;
      out.rz += openEnv * 0.022;
      out.rRotX += -openEnv * 0.14 + snapFlick * 0.26;
      out.rRotY += openEnv * 0.16;
      out.rRotZ += openEnv * 0.28 - snapFlick * 0.12;

      out.breechAngle = -0.92 * smoothstep(0.10, 0.24, t) * (1 - smoothstep(0.76, 0.89, t));

      if (t < 0.18) {
        out.breechShellMode = 'seated';
        out.breechShellEject = 0;
        out.breechShellInsert0 = 1;
        out.breechShellInsert1 = 1;
      } else if (t < 0.44) {
        out.breechShellMode = 'eject';
        out.breechShellEject = smoothstep(0.18, 0.44, t);
      } else if (t < 0.52) {
        out.breechShellMode = 'hidden';
        out.breechShellEject = 1;
        out.breechShellInsert0 = 0;
        out.breechShellInsert1 = 0;
      } else if (t < 0.72) {
        out.breechShellMode = 'insert';
        out.breechShellEject = 0;
        out.breechShellInsert0 = smoothstep(0.52, 0.64, t);
        out.breechShellInsert1 = smoothstep(0.58, 0.70, t);
      } else {
        out.breechShellMode = 'seated';
        out.breechShellEject = 0;
        out.breechShellInsert0 = 1;
        out.breechShellInsert1 = 1;
      }

      // Right thumb nudges top break-latch
      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.32, bell(t, 0.04, 0.20));

      // Left hand leaves forend -> dips below frame to grab 2 fresh shells -> rises to breech mouth & pushes them flush -> returns to forend
      const offForend = smoothstep(0.12, 0.26, t) * (1 - smoothstep(0.73, 0.85, t));
      const reachPouch = bell(t, 0.22, 0.48);
      const seatPush1 = bell(t, 0.48, 0.64);
      const seatPush2 = bell(t, 0.56, 0.72);
      const feedPeak = Math.max(seatPush1, seatPush2);

      // Relative to sawedoff supportAnchor [0, -0.004, -0.165], open breech mouth sits near [0, 0.020, -0.068]
      out.leftAnchorOffX += offForend * (-0.016 + seatPush2 * 0.018);
      out.leftAnchorOffY += offForend * (-0.065 - reachPouch * 0.145 + feedPeak * 0.118);
      out.leftAnchorOffZ += offForend * (0.102 - feedPeak * 0.022);
      out.leftRelOffX += offForend * (-0.28 + feedPeak * 0.26);
      out.leftRelOffY += offForend * 0.30;
      out.leftRelOffZ += offForend * -0.42;

      // Hand holds twin shells as it rises from pouch up to the open chambers, then hands off seamlessly to chamber insertion!
      out.showReloadShells = t > 0.34 && t < 0.56;
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.46, offForend);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.54, offForend);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.64, offForend);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.70, offForend);
      out.lPose.thumb = THREE.MathUtils.lerp(spec.leftPose.thumb, 0.74, offForend);

      if (playAudio) {
        if (t > 0.16 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          CaseAudio.balisongClack(0.86);
        }
        if (t > 0.45 && !(state.reloadCueMask & 2)) {
          state.reloadCueMask |= 2;
          WeaponAudio.shellInsert();
        }
        if (t > 0.62 && !(state.reloadCueMask & 4)) {
          state.reloadCueMask |= 4;
          WeaponAudio.shellInsert();
        }
        if (t > 0.82 && !(state.reloadCueMask & 8)) {
          state.reloadCueMask |= 8;
          WeaponAudio.pumpRack();
        }
      }
      return;
    }

    if (wt === 'akimbo') {
      // DUAL AKIMBO REAPER-STYLE THROW-AND-DRAW RELOAD:
      // Toss both spent pistols forward & away -> both hands dip below view -> draw 2 fresh pistols with crisp flourish!
      const tossFlick = bell(t, 0.0, 0.32);
      const dipEnv = smoothstep(0.24, 0.42, t) * (1 - smoothstep(0.56, 0.80, t));
      const drawPop = bell(t, 0.68, 0.96);

      out.akimboTossT = t < 0.36 ? smoothstep(0.05, 0.35, t) : 0;
      out.akimboHide = t >= 0.34 && t < 0.56;

      // Right hand tosses forward, dips below frame to grab fresh pistol, sweeps cleanly back up
      out.rx += tossFlick * 0.035;
      out.ry += tossFlick * 0.045 - dipEnv * 0.28 + drawPop * 0.022;
      out.rz += -tossFlick * 0.075 + dipEnv * 0.04;
      out.rRotX += tossFlick * 0.42 - dipEnv * 0.52 - drawPop * 0.14;
      out.rRotY += tossFlick * 0.16;
      out.rRotZ += tossFlick * 0.22 + drawPop * 0.18;

      // Open fingers during release, re-grip fresh pistols on draw
      const releaseOpen = smoothstep(0.08, 0.22, t) * (1 - smoothstep(0.46, 0.60, t));
      out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.14, releaseOpen);
      out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.18, releaseOpen);
      out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.22, releaseOpen);
      out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.26, releaseOpen);
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.14, releaseOpen);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.18, releaseOpen);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.22, releaseOpen);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.26, releaseOpen);

      // Left hand mirrors toss & dip freely, then locks cleanly back onto fresh left pistol
      const leftFreeW = smoothstep(0.02, 0.12, t) * (1 - smoothstep(0.68, 0.90, t));
      out.leftLock = 1 - leftFreeW;
      out.leftFreeX = -0.145 - tossFlick * 0.035;
      out.leftFreeY = -0.145 + tossFlick * 0.045 - dipEnv * 0.30 + drawPop * 0.022;
      out.leftFreeZ = -0.320 - tossFlick * 0.075;
      out.leftFreeRotX = 0.04 + tossFlick * 0.42 - dipEnv * 0.52;
      out.leftFreeRotY = -0.05 - tossFlick * 0.16;
      out.leftFreeRotZ = 1.42 - tossFlick * 0.22;

      if (playAudio) {
        if (t > 0.08 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          CaseAudio.spinWhoosh(1.16);
        }
        if (t > 0.58 && !(state.reloadCueMask & 2)) {
          state.reloadCueMask |= 2;
          WeaponAudio.weaponDraw();
        }
        if (t > 0.80 && !(state.reloadCueMask & 4)) {
          state.reloadCueMask |= 4;
          CaseAudio.balisongClack(1.08);
        }
      }
      return;
    }

    if (wt === 'shotgun') {
      // M870 FAST TWIN-SHELL BOTTOM LOADING (quad-load style) + FINAL PUMP RACK — never drops a mag!
      const cantEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.70, 0.82, t));
      out.rx -= cantEnv * 0.044;
      out.ry += cantEnv * 0.032;
      out.rz += cantEnv * 0.014;
      out.rRotX += cantEnv * 0.22;
      out.rRotY -= cantEnv * 0.20;
      out.rRotZ += cantEnv * 0.72; // Cants shotgun counter-clockwise to expose bottom loading gate!

      // Left hand leaves pump -> grabs twin shells -> pushes pair 1 into bottom gate -> dips -> pushes pair 2 -> returns to pump
      const offPump = smoothstep(0.04, 0.15, t) * (1 - smoothstep(0.68, 0.78, t));
      // Pair 1 insertion sweep (0.16..0.41) & Pair 2 insertion sweep (0.43..0.68)
      const sweep1 = bell(t, 0.17, 0.40);
      const sweep2 = bell(t, 0.44, 0.67);
      const pushPeak = Math.max(sweep1, sweep2);
      const dipBetween = bell(t, 0.36, 0.48);

      // Anchor in weapon-local space relative to shotgun pump supportAnchor [0, -0.018, -0.295]:
      // Bottom loading gate sits at [0, -0.014, -0.062] => deltaZ = +0.233, deltaY = -0.025 (approaching from below)
      const gateOffX = -0.010;
      const gateOffY = -0.095 + pushPeak * 0.072 - dipBetween * 0.045;
      const gateOffZ = 0.232;

      out.leftAnchorOffX += offPump * gateOffX;
      out.leftAnchorOffY += offPump * gateOffY;
      out.leftAnchorOffZ += offPump * gateOffZ;
      out.leftRelOffX += offPump * (-0.34 + pushPeak * 0.18);
      out.leftRelOffY += offPump * 0.28;
      out.leftRelOffZ += offPump * -0.42;

      // Visible twin 12-gauge shells held in left hand during insertion sweeps
      out.showReloadShells = t > 0.15 && t < 0.66;
      out.lifterPush = pushPeak * 0.008;

      // Cupped fingers holding twin shells with thumb pushing upward into loading gate
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.46, offPump);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.54, offPump);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.62, offPump);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.68, offPump);
      out.lPose.thumb = THREE.MathUtils.lerp(spec.leftPose.thumb, 0.72, offPump);

      // Final crisp pump rack once left hand locks back onto forend (0.78..0.96)
      const rackArc = bell(t, 0.78, 0.96);
      out.pumpPull = rackArc * 0.088;
      out.rRotX += rackArc * 0.06;
      out.rRotZ -= rackArc * 0.08;

      if (playAudio) {
        if (t > 0.27 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          WeaponAudio.shellInsert();
        }
        if (t > 0.54 && !(state.reloadCueMask & 2)) {
          state.reloadCueMask |= 2;
          WeaponAudio.shellInsert();
        }
        if (t > 0.79 && !(state.reloadCueMask & 4)) {
          state.reloadCueMask |= 4;
          WeaponAudio.pumpRack();
        }
      }
      return;
    }

    if (wt === 'awp') {
      // AWP: Drop/insert .338 box mag (0.0..0.64) -> Right hand cycles right-side bolt (0.68..0.97)
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.68, t));
      const magPull = bell(t, 0.12, 0.58);
      out.ry -= magEnv * 0.045;
      out.rRotX -= magEnv * 0.20;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.30;

      // Left hand reaches from forend (z=-0.28) to magwell (z=-0.072 => dz=+0.208)
      out.leftAnchorOffY += magEnv * (-0.065 - magPull * 0.095);
      out.leftAnchorOffZ += magEnv * 0.205;
      out.leftRelOffX -= magEnv * 0.28;
      out.leftRelOffY += magEnv * 0.18;
      out.leftRelOffZ -= magEnv * 0.30;
      out.magDropY = -magPull * 0.115;
      out.magTiltX = -magPull * 0.10;

      // Right-hand bolt cycle on reload finish (0.68..0.97)
      const handOff = smoothstep(0.68, 0.76, t) * (1 - smoothstep(0.90, 0.98, t));
      const boltLift = smoothstep(0.72, 0.79, t) * (1 - smoothstep(0.88, 0.94, t));
      const boltPull = smoothstep(0.78, 0.85, t) * (1 - smoothstep(0.86, 0.92, t));
      applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    if (wt === 'rifle') {
      // V-47 AK-47: Left hand rocks out/in curved banana mag (0.0..0.60), returns to brace handguard,
      // then RIGHT firing hand cleanly racks the right-side (+X) AK charging handle (0.68..0.97) — zero clipping!
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.54, 0.65, t));
      const magPull = bell(t, 0.12, 0.55);

      out.ry -= magEnv * 0.048;
      out.rRotX -= magEnv * 0.22;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.34;

      // Left hand ONLY reaches straight down to the curved mag (stays cleanly on -X/center underside!)
      out.leftAnchorOffX += -magEnv * 0.008;
      out.leftAnchorOffY += magEnv * (-0.075 - magPull * 0.085);
      out.leftAnchorOffZ += magEnv * 0.138;
      out.leftRelOffX -= magEnv * 0.24;
      out.leftRelOffY += magEnv * 0.16;
      out.leftRelOffZ -= magEnv * 0.32;

      out.magDropY = -magPull * 0.108;
      out.magTiltX = -magPull * 0.34;

      // Right hand lifts off pistol grip on the +X side to rack the right-side charging handle
      const handOff = smoothstep(0.67, 0.76, t) * (1 - smoothstep(0.89, 0.98, t));
      const rackPull = bell(t, 0.74, 0.91);
      applyV47RightHandRack(out, spec, handOff, rackPull);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    if (wt === 'smg') {
      // VX-9 Vector: Swap forward-cant stick mag (0.0..0.64) -> Left hand racks left-side (-X) folding charging handle (0.66..0.96)
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.66, t));
      const magPull = bell(t, 0.12, 0.56);
      const rackEnv = smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t));
      const rackPull = bell(t, 0.73, 0.90);

      out.ry -= magEnv * 0.045 - rackEnv * 0.015;
      out.rRotX -= magEnv * 0.20 - rackEnv * 0.08;
      out.rRotY -= magEnv * 0.16 - rackEnv * 0.16;
      out.rRotZ += magEnv * 0.28 + rackEnv * 0.26; // Cant slightly right to present left-side Vector charging handle!

      // Mag reach (from z=-0.175 to -0.135) + left-side charging handle (-0.025, 0.026, -0.165)
      out.leftAnchorOffX += -rackEnv * 0.036;
      out.leftAnchorOffY += magEnv * (-0.072 - magPull * 0.088) + rackEnv * 0.054;
      out.leftAnchorOffZ += magEnv * 0.042 + rackEnv * (0.012 + rackPull * 0.048);
      out.leftRelOffX += -magEnv * 0.22 + rackEnv * 0.16;
      out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.18;
      out.leftRelOffZ += -magEnv * 0.28 + rackEnv * 0.24;

      out.magDropY = -magPull * 0.112;
      out.magTiltX = magPull * 0.14;
      out.boltPull = Math.max(out.boltPull, rackPull * 0.048);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    // DEAGLE & USP-9 PISTOLS: Swap grip magazine (0.0..0.64) -> Left hand overhand slide rack (0.66..0.96)
    const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.66, t));
    const magPull = bell(t, 0.12, 0.56);
    const rackEnv = smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t));
    const rackPull = bell(t, 0.73, 0.90);

    out.ry -= magEnv * 0.040 - rackEnv * 0.022;
    out.rRotX -= magEnv * 0.16 - rackEnv * 0.10;
    out.rRotY -= magEnv * 0.14 - rackEnv * 0.24;
    out.rRotZ += magEnv * 0.34 + rackEnv * 0.28;

    // Left hand drops to magazine baseplate, then hugs left side of rear slide serrations to rack back cleanly!
    out.leftAnchorOffX += -rackEnv * 0.022;
    out.leftAnchorOffY += magEnv * (-0.068 - magPull * 0.072) + rackEnv * 0.094;
    out.leftAnchorOffZ += magEnv * 0.022 + rackEnv * (-0.008 + rackPull * 0.038);
    out.leftRelOffX += -magEnv * 0.24 + rackEnv * 0.22;
    out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.26;
    out.leftRelOffZ += -magEnv * 0.26 - rackEnv * 0.56;

    out.magDropY = -magPull * 0.098;
    out.magTiltX = -magPull * 0.10;
    out.slideBack = Math.max(out.slideBack, rackPull * 0.038);

    if (playAudio && t > 0.73 && !(state.reloadCueMask & 1)) {
      state.reloadCueMask |= 1;
      WeaponAudio.boltRack();
    }
  }

  // Authentic CS2 Hand-Synchronized Firearm Choreography (zero GC allocations)
  function evaluateWeaponChoreography(wt, state, out, playAudio) {
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    out.rx = 0; out.ry = 0; out.rz = 0;
    out.rRotX = 0; out.rRotY = 0; out.rRotZ = 0;
    out.wPosX = 0; out.wPosY = 0; out.wPosZ = 0;
    out.wRotX = 0; out.wRotY = 0; out.wRotZ = 0;
    out.spinAngle = 0;
    out.leftLock = 1;
    out.leftUseRawReload = false;
    out.leftAnchorOffX = 0; out.leftAnchorOffY = 0; out.leftAnchorOffZ = 0;
    out.leftRelOffX = 0; out.leftRelOffY = 0; out.leftRelOffZ = 0;
    out.leftFreeX = -0.24; out.leftFreeY = -0.29; out.leftFreeZ = -0.34;
    out.leftFreeRotX = 0.22; out.leftFreeRotY = -0.42; out.leftFreeRotZ = 0.28;
    out.boltLift = 0; out.boltPull = 0;
    out.pumpPull = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;
    out.showReloadBullet = false;
    out.craneOpen = 0;
    out.cylinderSpin = 0;
    out.ejectorPush = 0;
    out.latchSlide = 0;
    out.triggerPull = 0;
    out.ammoVisibleCount = -1;
    out.cylinderIndex = 0;
    out.slideBack = 0; out.hammerBack = 0;
    out.magDropY = 0; out.magTiltX = 0;
    out.breechAngle = 0; out.breechShellMode = 'seated'; out.breechShellEject = 0; out.breechShellInsert0 = 1; out.breechShellInsert1 = 1;
    out.akimboTossT = 0; out.akimboHide = false;

    Object.assign(out.rPose, spec.rightPose);
    Object.assign(out.lPose, spec.leftPose);

    const t = state.inspectT;
    if (t >= 1) return;

    const isMythic = state.inspectTier === 'mythic';
    const isRare = state.inspectTier === 'uncommon' || isMythic;

    if (wt === 'katana') {
      // SMOOTH SAMURAI BLADE INSPECT: Raise blade cleanly across chest -> admire edge & camo -> roll to back side -> crisp flourish return!
      const env = bell(t, 0.0, 1.0);
      const stage1 = smoothstep(0.04, 0.24, t) * (1 - smoothstep(0.42, 0.54, t));
      const stage2 = smoothstep(0.46, 0.62, t) * (1 - smoothstep(0.76, 0.88, t));
      const flourish = bell(t, 0.74, 0.98);
      const sway = Math.sin(smoothstep(0.10, 0.84, t) * Math.PI * 2) * 0.06;

      out.rx = -0.062 * env + sway * 0.15;
      out.ry = 0.048 * env + flourish * 0.022;
      out.rz = -0.025 * env;
      out.rRotX = 0.18 * stage1 + 0.22 * stage2 - flourish * 0.18;
      out.rRotY = 0.62 * stage1 - 0.56 * stage2 + flourish * 0.28 + sway;
      out.rRotZ = 0.44 * stage1 - 0.52 * stage2 + flourish * 0.48;
      out.leftAnchorOffZ = -0.018 * env;

      if (playAudio) {
        if (t > 0.10 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          CaseAudio.bladeShing();
        }
        if (t > 0.46 && !(state.inspectCueMask & 2)) {
          state.inspectCueMask |= 2;
          CaseAudio.spinWhoosh(0.96);
        }
        if (t > 0.76 && !(state.inspectCueMask & 4)) {
          state.inspectCueMask |= 4;
          CaseAudio.spinWhoosh(1.14);
        }
      }
      return;
    }

    if (wt === 'revolver') {
      if (isMythic) {
        // 1-IN-100 MYTHIC "HIGH NOON SHOWSTOPPER":
        // Cylinder pops out -> blazing free-spin -> wrist-whip shut -> double forward/reverse trigger-finger twirl -> thumb-cock hammer!
        const env = bell(t, 0.0, 1.0);
        const dropLeft = smoothstep(0.0, 0.10, t) * (1 - smoothstep(0.88, 1.0, t));
        const flickHand = bell(t, 0.14, 0.30);
        out.leftLock = 1 - dropLeft * (1 - flickHand);
        out.leftFreeX = -0.26;
        out.leftFreeY = -0.35;
        out.leftFreeZ = -0.34;
        out.leftFreeRotX = 0.24;
        out.leftFreeRotY = -0.38;
        out.leftFreeRotZ = 0.32;

        // Left hand sweeps quickly across swung-out cylinder to flick it into high-speed spin (0.14..0.30)
        if (flickHand > 0.01) {
          out.leftAnchorOffX = -0.034 * flickHand;
          out.leftAnchorOffY = 0.088 * flickHand;
          out.leftAnchorOffZ = -0.056 * flickHand;
          out.leftRelOffZ = -0.45 * flickHand;
        }

        const cylPhase = smoothstep(0.04, 0.14, t) * (1 - smoothstep(0.45, 0.54, t));
        const snapWhip = bell(t, 0.44, 0.58);
        const twirlEnv = smoothstep(0.54, 0.62, t) * (1 - smoothstep(0.84, 0.90, t));
        const catchBounce = bell(t, 0.84, 0.95);
        const hammerFlex = bell(t, 0.88, 0.99);

        out.craneOpen = smoothstep(0.08, 0.18, t) * (1 - smoothstep(0.44, 0.52, t));
        out.latchSlide = bell(t, 0.04, 0.16);
        out.cylinderSpin = smoothstep(0.18, 0.50, t) * Math.PI * 12;

        // Double forward (+4π) then reverse (-2π) trigger-finger twirl!
        const fwdSpin = smoothstep(0.55, 0.74, t) * Math.PI * 4;
        const revSpin = smoothstep(0.74, 0.87, t) * Math.PI * 2;
        out.spinAngle = -fwdSpin + revSpin;

        out.rx = -0.052 * env + snapWhip * 0.022;
        out.ry = 0.054 * env + catchBounce * 0.018;
        out.rz = 0.024 * env;
        out.rRotX = 0.16 * cylPhase + 0.14 * twirlEnv - catchBounce * 0.15;
        out.rRotY = 0.56 * cylPhase - snapWhip * 0.28 + 0.42 * twirlEnv;
        out.rRotZ = 0.46 * cylPhase - snapWhip * 0.58 + 0.16 * twirlEnv;
        out.hammerBack = hammerFlex * 0.82;

        out.rPose.indexRingHook = twirlEnv * 0.96;
        out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, twirlEnv);
        out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.12, twirlEnv);
        out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.14, twirlEnv);
        out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.18, twirlEnv);
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, twirlEnv + hammerFlex * 0.5);

        if (playAudio) {
          if (t > 0.08 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            WeaponAudio.revolverCraneOpen();
          }
          if (t > 0.20 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            WeaponAudio.revolverCylinderSpin(1.35);
          }
          if (t > 0.46 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            WeaponAudio.revolverCraneClose();
          }
          if (t > 0.57 && !(state.inspectCueMask & 8)) {
            state.inspectCueMask |= 8;
            CaseAudio.spinWhoosh(1.28);
          }
          if (t > 0.74 && !(state.inspectCueMask & 16)) {
            state.inspectCueMask |= 16;
            CaseAudio.spinWhoosh(1.12);
          }
          if (t > 0.86 && !(state.inspectCueMask & 32)) {
            state.inspectCueMask |= 32;
            CaseAudio.balisongClack(1.06);
          }
          if (t > 0.90 && !(state.inspectCueMask & 64)) {
            state.inspectCueMask |= 64;
            WeaponAudio.revolverRatchet(2);
          }
        }
      } else if (isRare) {
        // CS-STYLE CONTINUOUS TRIGGER-FINGER REVOLVER SPIN (F-spam chainable with spinBonus!)
        const env = bell(t, 0.0, 1.0);
        const dropLeft = smoothstep(0.0, 0.13, t) * (1 - smoothstep(0.86, 1.0, t));
        out.leftLock = 1 - dropLeft;
        out.leftFreeX = -0.25;
        out.leftFreeY = -0.34;
        out.leftFreeZ = -0.34;
        out.leftFreeRotX = 0.26;
        out.leftFreeRotY = -0.36;
        out.leftFreeRotZ = 0.34;
        out.lPose.index = 0.45; out.lPose.middle = 0.56; out.lPose.ring = 0.64; out.lPose.pinky = 0.72; out.lPose.thumb = 0.38;

        const spinPhase = smoothstep(0.12, 0.80, t);
        const openGrip = smoothstep(0.05, 0.16, t) * (1 - smoothstep(0.76, 0.86, t));
        const catchBounce = bell(t, 0.78, 0.94);

        out.rx = -0.054 * env;
        out.ry = 0.054 * env + catchBounce * 0.018;
        out.rz = 0.025 * env;
        out.rRotX = 0.16 * env - catchBounce * 0.15;
        out.rRotY = 0.46 * env;
        out.rRotZ = 0.18 * env - Math.sin(spinPhase * Math.PI * 3) * 0.12;

        const totalSpins = Math.PI * 6 + (state.spinBonus || 0);
        out.spinAngle = -spinPhase * totalSpins;

        out.rPose.indexRingHook = openGrip * 0.96;
        out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, openGrip);
        out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.12, openGrip);
        out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.14, openGrip);
        out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.18, openGrip);
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, openGrip);

        if (playAudio) {
          if (t > 0.14 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.spinWhoosh(1.26);
          }
          if (t > 0.40 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.spinWhoosh(1.16);
          }
          if (t > 0.62 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            CaseAudio.spinWhoosh(1.06);
          }
          if (t > 0.80 && !(state.inspectCueMask & 8)) {
            state.inspectCueMask |= 8;
            CaseAudio.balisongClack(0.98);
          }
        }
      } else {
        // SIGNATURE NORMAL REVOLVER INSPECT:
        // Thumb pops latch -> crane swings 6-round cylinder OUT -> left fingers flick cylinder into high-speed free-spin -> admire brass & flutes -> wrist-flick snap SHUT!
        const env = bell(t, 0.0, 1.0);
        const holdPose = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.84, 1.0, t));
        const flickHand = bell(t, 0.28, 0.48);
        const admireSway = Math.sin(smoothstep(0.42, 0.78, t) * Math.PI * 1.5) * 0.16;
        const closeWhip = bell(t, 0.75, 0.90);

        const dropLeft = smoothstep(0.04, 0.16, t) * (1 - smoothstep(0.86, 1.0, t));
        out.leftLock = 1 - dropLeft * (1 - flickHand);
        out.leftFreeX = -0.25;
        out.leftFreeY = -0.34;
        out.leftFreeZ = -0.35;
        out.leftFreeRotX = 0.24;
        out.leftFreeRotY = -0.38;
        out.leftFreeRotZ = 0.30;

        // Left hand reaches across to flick the exposed fluted cylinder into a fast free-spin!
        if (flickHand > 0.01) {
          const sweepX = -0.040 + (t - 0.36) * 0.14;
          out.leftAnchorOffX = sweepX * flickHand;
          out.leftAnchorOffY = 0.082 * flickHand;
          out.leftAnchorOffZ = -0.056 * flickHand;
          out.leftRelOffX = -0.22 * flickHand;
          out.leftRelOffY = 0.32 * flickHand;
          out.leftRelOffZ = -0.44 * flickHand;
          out.lPose.index = 0.22;
          out.lPose.middle = 0.26;
        }

        out.latchSlide = bell(t, 0.10, 0.26);
        out.craneOpen = smoothstep(0.16, 0.30, t) * (1 - smoothstep(0.75, 0.85, t));
        out.cylinderSpin = smoothstep(0.32, 0.76, t) * Math.PI * 10;

        out.rx = -0.048 * env + closeWhip * 0.022;
        out.ry = 0.046 * env;
        out.rz = 0.022 * env;
        out.rRotX = 0.15 * holdPose + admireSway * 0.4;
        out.rRotY = 0.62 * holdPose - closeWhip * 0.26 + admireSway;
        out.rRotZ = 0.46 * holdPose - closeWhip * 0.62 + admireSway * 0.65;
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.32, out.latchSlide);

        if (playAudio) {
          if (t > 0.16 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            WeaponAudio.revolverCraneOpen();
          }
          if (t > 0.34 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            WeaponAudio.revolverCylinderSpin(1.0);
          }
          if (t > 0.77 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            WeaponAudio.revolverCraneClose();
          }
        }
      }
    } else if (wt === 'deagle' || wt === 'pistol') {
      if (isRare) {
        // CS2 RARE DEAGLE TRIGGER-FINGER SPIN (with F-chain spinBonus support!)
        const env = bell(t, 0.0, 1.0);
        const dropLeft = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.86, 1.0, t));
        out.leftLock = 1 - dropLeft;
        out.leftFreeX = -0.25;
        out.leftFreeY = -0.34;
        out.leftFreeZ = -0.34;
        out.leftFreeRotX = 0.26;
        out.leftFreeRotY = -0.36;
        out.leftFreeRotZ = 0.34;
        out.lPose.index = 0.45; out.lPose.middle = 0.56; out.lPose.ring = 0.64; out.lPose.pinky = 0.72; out.lPose.thumb = 0.38;

        const spinPhase = smoothstep(0.14, 0.80, t);
        const openGrip = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.86, t));
        const catchBounce = bell(t, 0.78, 0.94);

        out.rx = -0.055 * env;
        out.ry = 0.052 * env + catchBounce * 0.016;
        out.rz = 0.025 * env;
        out.rRotX = 0.16 * env - catchBounce * 0.14;
        out.rRotY = 0.44 * env;
        out.rRotZ = 0.18 * env - Math.sin(spinPhase * Math.PI * 2) * 0.14;

        const totalSpins = Math.PI * 4 + (state.spinBonus || 0);
        out.spinAngle = -spinPhase * totalSpins;

        out.rPose.indexRingHook = openGrip * 0.95;
        out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, openGrip);
        out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.14, openGrip);
        out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.16, openGrip);
        out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.20, openGrip);
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, openGrip);

        if (playAudio) {
          if (t > 0.16 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.spinWhoosh(1.25);
          }
          if (t > 0.46 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.spinWhoosh(1.12);
          }
          if (t > 0.80 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            CaseAudio.balisongClack(0.95);
          }
        }
      } else {
        // CS2 NORMAL PISTOL INSPECT: Left hand drops away -> 1-handed Play-Side admire -> Back-Side twist -> snap back
        const dropLeft = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
        out.leftLock = 1 - dropLeft;
        out.leftFreeX = -0.24;
        out.leftFreeY = -0.32;
        out.leftFreeZ = -0.35;
        out.leftFreeRotX = 0.24;
        out.leftFreeRotY = -0.38;
        out.leftFreeRotZ = 0.28;

        const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
        const backSide = smoothstep(0.48, 0.68, t) * (1 - smoothstep(0.82, 0.98, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.052 * env;
        out.ry = 0.044 * env;
        out.rz = 0.022 * env;
        out.rRotX = 0.15 * playSide + 0.10 * backSide;
        out.rRotY = 0.78 * playSide - 0.58 * backSide;
        out.rRotZ = 0.48 * playSide - 0.66 * backSide;

        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.36, backSide);
        if (playAudio && t > 0.50 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          CaseAudio.spinWhoosh(0.86);
        }
      }
    } else if (wt === 'awp') {
      if (isRare) {
        // CS2 RARE AWP BOLT-LIFT BRASS CHECK: Left braces forend, right hand lifts & cycles bolt handle
        const env = bell(t, 0.0, 1.0);
        const holdTilt = smoothstep(0.0, 0.20, t) * (1 - smoothstep(0.82, 1.0, t));
        const handOff = smoothstep(0.16, 0.28, t) * (1 - smoothstep(0.74, 0.86, t));
        const boltLift = smoothstep(0.20, 0.34, t) * (1 - smoothstep(0.68, 0.80, t));
        const boltPull = smoothstep(0.32, 0.48, t) * (1 - smoothstep(0.56, 0.70, t));

        out.rx = -0.045 * env;
        out.ry = 0.032 * env;
        out.rz = 0.015 * env;
        out.rRotX = 0.14 * holdTilt;
        out.rRotY = 0.52 * holdTilt;
        out.rRotZ = -0.34 * holdTilt - boltLift * 0.08;

        applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);

        if (playAudio) {
          if (t > 0.28 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.balisongClack(0.84);
          }
          if (t > 0.66 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.balisongClack(1.06);
          }
        }
      } else {
        const playSide = smoothstep(0.0, 0.24, t) * (1 - smoothstep(0.48, 0.64, t));
        const boltSide = smoothstep(0.50, 0.68, t) * (1 - smoothstep(0.82, 1.0, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.058 * env;
        out.ry = 0.036 * env;
        out.rz = 0.020 * env;
        out.rRotX = 0.12 * playSide + 0.08 * boltSide;
        out.rRotY = 0.76 * playSide - 0.36 * boltSide;
        out.rRotZ = 0.32 * playSide - 0.52 * boltSide;
        out.leftRelOffZ = 0.14 * playSide - 0.18 * boltSide;
      }
    } else if (wt === 'shotgun') {
      // M870 SHOTGUN INSPECT: Play-side receiver & barrel showcase -> chamber peek pump half-check!
      const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
      const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
      const env = bell(t, 0.0, 1.0);

      out.rx = -0.054 * env;
      out.ry = 0.036 * env;
      out.rz = 0.018 * env;
      out.rRotX = 0.12 * playSide + 0.09 * rightSide;
      out.rRotY = 0.76 * playSide - 0.42 * rightSide;
      out.rRotZ = 0.34 * playSide - 0.56 * rightSide;
      if (isRare) {
        const checkPump = bell(t, 0.54, 0.80);
        out.pumpPull = checkPump * 0.054;
        if (playAudio && t > 0.56 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          WeaponAudio.pumpRack();
        }
      }
    } else if (wt === 'smg') {
      // VX-9 VECTOR INSPECT: Play-side display -> left-side charging handle check on rare!
      const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
      const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
      const env = bell(t, 0.0, 1.0);

      out.rx = -0.052 * env;
      out.ry = 0.034 * env;
      out.rz = 0.020 * env;
      out.rRotX = 0.12 * playSide + 0.08 * rightSide;
      out.rRotY = 0.76 * playSide - 0.44 * rightSide;
      out.rRotZ = 0.36 * playSide - 0.54 * rightSide;
      if (isRare) {
        const boltPeek = bell(t, 0.22, 0.46);
        out.leftAnchorOffX = -boltPeek * 0.030;
        out.leftAnchorOffY = boltPeek * 0.050;
        out.leftAnchorOffZ = boltPeek * 0.044;
        out.boltPull = boltPeek * 0.042;
        if (playAudio && t > 0.26 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          WeaponAudio.boltRack();
        }
      }
    } else {
      // V-47 RIFLE (AK-47)
      if (isRare) {
        // CS2 RARE V-47 MAG-CHECK & RIGHT-SIDE CHARGING-HANDLE PEEK
        const env = bell(t, 0.0, 1.0);
        const tilt = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.84, 1.0, t));
        const magPhase = smoothstep(0.16, 0.32, t) * (1 - smoothstep(0.42, 0.52, t));
        const boltPhase = smoothstep(0.54, 0.68, t) * (1 - smoothstep(0.74, 0.84, t));

        out.rx = -0.048 * env;
        out.ry = 0.038 * env;
        out.rz = 0.018 * env;
        out.rRotX = 0.14 * tilt;
        out.rRotY = 0.58 * tilt - boltPhase * 0.26;
        out.rRotZ = 0.28 * magPhase - 0.44 * tilt;

        const toMag = smoothstep(0.10, 0.22, t) * (1 - smoothstep(0.48, 0.56, t));
        const toBolt = smoothstep(0.50, 0.62, t) * (1 - smoothstep(0.78, 0.90, t));

        out.leftAnchorOffX = 0.014 * toMag + 0.055 * toBolt;
        out.leftAnchorOffY = -0.105 * toMag + 0.042 * toBolt - magPhase * 0.045;
        out.leftAnchorOffZ = 0.135 * toMag + (0.205 + boltPhase * 0.058) * toBolt;
        out.leftRelOffX = -0.22 * toMag + 0.28 * toBolt;
        out.leftRelOffY = 0.18 * toMag - 0.34 * toBolt;
        out.leftRelOffZ = -0.35 * toMag - 0.72 * toBolt;

        out.magDropY = -magPhase * 0.046;
        out.magTiltX = -magPhase * 0.22;
        out.boltPull = boltPhase * 0.058;

        if (playAudio) {
          if (t > 0.24 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.balisongClack(0.86);
          }
          if (t > 0.48 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.balisongClack(1.12);
          }
          if (t > 0.64 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            CaseAudio.balisongClack(0.96);
          }
          if (t > 0.80 && !(state.inspectCueMask & 8)) {
            state.inspectCueMask |= 8;
            CaseAudio.balisongClack(1.22);
          }
        }
      } else {
        const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
        const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.056 * env;
        out.ry = 0.036 * env;
        out.rz = 0.022 * env;
        out.rRotX = 0.13 * playSide + 0.09 * rightSide;
        out.rRotY = 0.78 * playSide - 0.42 * rightSide;
        out.rRotZ = 0.36 * playSide - 0.58 * rightSide;
        out.leftRelOffZ = 0.16 * playSide - 0.20 * rightSide;
      }
    }
  }

  function applyWeaponSocketTransform(mesh, wt, wOut) {
    if (!mesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    const counterRoll = -RIGHT_HAND_GRIP_ROLL;
    mesh.rotation.order = 'XYZ';
    mesh.rotation.set(
      wOut ? wOut.wRotX : 0,
      wOut ? wOut.wRotY : 0,
      counterRoll + (wOut ? wOut.wRotZ : 0)
    );

    const cosR = Math.cos(counterRoll);
    const sinR = Math.sin(counterRoll);
    const gx = spec.gripCenter[0];
    const gy = spec.gripCenter[1];
    const gz = spec.gripCenter[2];
    const rotGx = gx * cosR - gy * sinR;
    const rotGy = gx * sinR + gy * cosR;

    mesh.position.set(
      spec.rightPocket[0] - rotGx + (wOut ? wOut.wPosX : 0),
      spec.rightPocket[1] - rotGy + (wOut ? wOut.wPosY : 0),
      spec.rightPocket[2] - gz + (wOut ? wOut.wPosZ : 0)
    );

    if (mesh.userData.spinGroup) {
      mesh.userData.spinGroup.rotation.x = wOut ? wOut.spinAngle : 0;
    }
  }

  function applyWeaponMechanicalParts(mesh, wt, wOut, reloadArc, boltCycleArc, slideKick, hammerKick) {
    if (!mesh) return;
    const rawMode = Boolean(wOut && wOut.leftUseRawReload);
    const boltPull = (wOut ? wOut.boltPull : 0) + (wt === 'awp' ? (wOut && wOut.boltPull > 0 ? 0 : boltCycleArc * 0.056) : slideKick * 0.048);
    const boltLift = (wOut ? wOut.boltLift : 0) + (wt === 'awp' ? (wOut && wOut.boltLift > 0 ? 0 : boltCycleArc) : 0);

    if (mesh.userData.boltGroup && mesh.userData.boltRestPos) {
      const rp = mesh.userData.boltRestPos;
      mesh.userData.boltGroup.position.set(rp.x, rp.y, rp.z + boltPull);
      mesh.userData.boltGroup.rotation.z = wt === 'awp' ? boltLift * 0.92 : 0;
    }
    if (mesh.userData.slideGroup) {
      mesh.userData.slideGroup.position.z = (wOut ? wOut.slideBack : 0) + slideKick * 0.036;
    }
    if (mesh.userData.hammerGroup) {
      mesh.userData.hammerGroup.rotation.x = -((wOut ? wOut.hammerBack : 0) + hammerKick * 0.95);
    }
    if (mesh.userData.pumpGroup) {
      const pumpZ = wt === 'shotgun'
        ? Math.max(wOut ? wOut.pumpPull : 0, (!rawMode && boltCycleArc > 0 ? boltCycleArc * 0.086 : 0))
        : 0;
      mesh.userData.pumpGroup.position.z = pumpZ;
      if (mesh.userData.breechBoltMesh && Number.isFinite(mesh.userData.breechBoltRestZ)) {
        mesh.userData.breechBoltMesh.position.z = mesh.userData.breechBoltRestZ + pumpZ * 0.72;
      }
    }
    if (mesh.userData.loadGateLifter) {
      mesh.userData.loadGateLifter.position.y = -0.012 + (wOut ? wOut.lifterPush : 0);
    }
    if (mesh.userData.magGroup) {
      let dropY = wOut ? wOut.magDropY : 0;
      let tiltX = wOut ? wOut.magTiltX : 0;
      if (!rawMode && reloadArc > 0.15) {
        const relDrop = Math.sin(Math.min(1, (reloadArc - 0.15) / 0.85) * Math.PI);
        dropY -= relDrop * 0.105;
        tiltX -= relDrop * (wt === 'rifle' ? 0.34 : 0.12);
      }
      mesh.userData.magGroup.position.y = dropY;
      mesh.userData.magGroup.rotation.x = tiltX;
    }
    // R-88 Revolver articulated crane/yoke, rotating 6-flute cylinder, ejector rod, thumb latch, trigger & live 6-shell visibility
    if (mesh.userData.cranePivot) {
      mesh.userData.cranePivot.rotation.z = (wOut ? wOut.craneOpen : 0) * 1.18;
    }
    if (mesh.userData.cylinderGroup) {
      const baseIdxAngle = ((wOut ? wOut.cylinderIndex : 0) * Math.PI) / 3;
      mesh.userData.cylinderGroup.rotation.z = -(baseIdxAngle + (wOut ? wOut.cylinderSpin : 0));
    }
    if (mesh.userData.ejectorRodGroup) {
      mesh.userData.ejectorRodGroup.position.z = (wOut ? wOut.ejectorPush : 0) * 0.026;
    }
    if (mesh.userData.latchGroup && Number.isFinite(mesh.userData.latchRestZ)) {
      mesh.userData.latchGroup.position.z = mesh.userData.latchRestZ - (wOut ? wOut.latchSlide : 0) * 0.007;
    }
    if (mesh.userData.triggerGroup) {
      mesh.userData.triggerGroup.rotation.x = -(wOut ? wOut.triggerPull : 0) * 0.42;
    }
    if (Array.isArray(mesh.userData.shellMeshes)) {
      const visCount = wOut && Number.isFinite(wOut.ammoVisibleCount) ? wOut.ammoVisibleCount : -1;
      for (let i = 0; i < mesh.userData.shellMeshes.length; i++) {
        mesh.userData.shellMeshes[i].visible = visCount < 0 ? true : i < visCount;
      }
    }
    // Katana glowing slash trail & RMB Deflect energy aura feedback
    if (mesh.userData.bladeTrail && mesh.userData.bladeTrail.material) {
      const trailOp = wOut && Number.isFinite(wOut.katanaTrailOpacity) ? wOut.katanaTrailOpacity : 0;
      mesh.userData.bladeTrail.material.opacity = trailOp;
    }
    if (mesh.userData.deflectAura && mesh.userData.deflectAura.material) {
      const defOp = wOut && Number.isFinite(wOut.katanaDeflectAura) ? wOut.katanaDeflectAura : 0;
      mesh.userData.deflectAura.material.opacity = defOp;
      const radial = 0.92 + defOp * 0.42;
      mesh.userData.deflectAura.scale.set(radial, 1.0, radial);
    }
    // DB-12 Sawed-Off break-action hinge, breech latch & ejecting twin 12-gauge shells
    if (mesh.userData.breechPivot) {
      mesh.userData.breechPivot.rotation.x = wOut && Number.isFinite(wOut.breechAngle) ? wOut.breechAngle : 0;
    }
    if (mesh.userData.breechLatch) {
      mesh.userData.breechLatch.rotation.y = wOut && wOut.breechAngle < -0.05 ? 0.52 : 0;
    }
    if (Array.isArray(mesh.userData.breechShells)) {
      const mode = (wOut && wOut.breechShellMode) || 'seated';
      const eject = wOut && Number.isFinite(wOut.breechShellEject) ? wOut.breechShellEject : 0;
      const ins0 = wOut && Number.isFinite(wOut.breechShellInsert0) ? wOut.breechShellInsert0 : 1;
      const ins1 = wOut && Number.isFinite(wOut.breechShellInsert1) ? wOut.breechShellInsert1 : 1;
      for (let i = 0; i < mesh.userData.breechShells.length; i++) {
        const sh = mesh.userData.breechShells[i];
        if (!Number.isFinite(sh.userData.restZ)) {
          sh.userData.restX = sh.position.x;
          sh.userData.restY = sh.position.y;
          sh.userData.restZ = sh.position.z;
        }
        const rx0 = sh.userData.restX;
        const ry0 = sh.userData.restY;
        const rz0 = sh.userData.restZ;
        if (mode === 'hidden') {
          sh.visible = false;
        } else if (mode === 'eject') {
          sh.visible = eject < 0.98;
          const splay = i === 0 ? -1 : 1;
          // Parabolic backward & downward ballistic arc that clears the screen completely before hiding
          sh.position.set(
            rx0 + splay * eject * 0.075,
            ry0 + eject * 0.065 - eject * eject * 0.68,
            rz0 + eject * 0.52
          );
          sh.rotation.set(-eject * 4.2, splay * eject * 0.9, splay * eject * 1.5);
        } else if (mode === 'insert') {
          const ins = i === 0 ? ins0 : ins1;
          if (ins <= 0.01) {
            sh.visible = false;
          } else {
            sh.visible = true;
            // Shell slides straight along chamber axis directly from the left hand into the breech (no floating!)
            sh.position.set(rx0, ry0, rz0 + (1 - ins) * 0.048);
            sh.rotation.set(0, 0, 0);
          }
        } else {
          sh.visible = true;
          sh.position.set(rx0, ry0, rz0);
          sh.rotation.set(0, 0, 0);
        }
      }
    }
    // Dual Akimbo alternating recoil kicks & Reaper throw-and-draw reload toss
    if (mesh.userData.akimboRight && mesh.userData.akimboLeft) {
      const hideAkimbo = Boolean(wOut && wOut.akimboHide);
      const tossT = wOut && Number.isFinite(wOut.akimboTossT) ? wOut.akimboTossT : 0;
      mesh.userData.akimboRight.visible = !hideAkimbo;
      mesh.userData.akimboLeft.visible = !hideAkimbo;
      if (tossT > 0.001) {
        const arcY = tossT * 0.13 - tossT * tossT * 0.44;
        mesh.userData.akimboRight.position.set(tossT * 0.22, arcY, -tossT * 0.54);
        mesh.userData.akimboRight.rotation.set(-tossT * 4.4, 0, -tossT * 1.4);
        mesh.userData.akimboLeft.position.set(-0.27 - tossT * 0.22, arcY, -tossT * 0.54);
        mesh.userData.akimboLeft.rotation.set(-tossT * 4.4, 0, tossT * 1.4);
      } else {
        const rKick = wOut && Number.isFinite(wOut.akimboRightKick) ? wOut.akimboRightKick : 0;
        const lKick = wOut && Number.isFinite(wOut.akimboLeftKick) ? wOut.akimboLeftKick : 0;
        mesh.userData.akimboRight.position.set(0, 0, rKick * 0.048);
        mesh.userData.akimboRight.rotation.set(rKick * 0.24, 0, 0);
        mesh.userData.akimboLeft.position.set(-0.27, 0, lKick * 0.048);
        mesh.userData.akimboLeft.rotation.set(lKick * 0.24, 0, 0);
      }
    }
    // M-134 Rotary Minigun barrel spin & MGL-6 drum index
    if (mesh.userData.rotaryBarrels && wOut && Number.isFinite(wOut.minigunSpinAngle)) {
      mesh.userData.rotaryBarrels.rotation.z = wOut.minigunSpinAngle;
    }
    if (mesh.userData.drumGroup && wOut && Number.isFinite(wOut.drumAngle)) {
      mesh.userData.drumGroup.rotation.z = wOut.drumAngle;
    }
  }

  /**
   * Solves exact left-hand position & orientation in rig.rootRig space, smoothly blending
   * between locked forend/foregrip/pump grip (leftLock = 1) and free counterbalance posture (leftLock = 0).
   */
  function lockSupportHandToWeapon(rigObj, weaponMesh, wt, reloadArc, wOut) {
    if (!rigObj || !weaponMesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    const lockW = wOut ? wOut.leftLock : 1;
    const rawReload = Boolean(wOut && wOut.leftUseRawReload);
    const legacyRel = rawReload ? 0 : reloadArc;

    rigObj.rootRig.updateMatrixWorld(true);
    _wInvRootMat.copy(rigObj.rootRig.matrixWorld).invert();
    rigObj.rootRig.getWorldQuaternion(_wRootQuat);
    _wInvRootQuat.copy(_wRootQuat).invert();

    const baseAnchor = weaponMesh.userData.supportAnchorOverride || spec.supportAnchor;
    // On M870 shotgun, slide left hand 1:1 with the reciprocating pump forend (and any pump-mounted foregrip!)
    const pumpZ = wt === 'shotgun' && weaponMesh.userData.pumpGroup
      ? weaponMesh.userData.pumpGroup.position.z
      : 0;

    _wAnchorLocal.set(
      baseAnchor[0] + (wOut ? wOut.leftAnchorOffX : 0),
      baseAnchor[1] - legacyRel * 0.115 + (wOut ? wOut.leftAnchorOffY : 0),
      baseAnchor[2] + pumpZ + legacyRel * (wt === 'deagle' || wt === 'pistol' ? 0.04 : 0.14) + (wOut ? wOut.leftAnchorOffZ : 0)
    );
    _wWorldPos.copy(_wAnchorLocal).applyMatrix4(weaponMesh.matrixWorld).applyMatrix4(_wInvRootMat);

    weaponMesh.getWorldQuaternion(_wWorldQuat);
    _wWorldQuat.premultiply(_wInvRootQuat);

    _wLeftEuler.set(
      spec.leftRelEuler[0] - legacyRel * 0.35 + (wOut ? wOut.leftRelOffX : 0),
      spec.leftRelEuler[1] + legacyRel * 0.18 + (wOut ? wOut.leftRelOffY : 0),
      spec.leftRelEuler[2] - legacyRel * 0.28 + (wOut ? wOut.leftRelOffZ : 0),
      'YXZ'
    );
    _wLeftRelQuat.setFromEuler(_wLeftEuler);
    _wWorldQuat.multiply(_wLeftRelQuat);

    _wLeftPocketLocal.set(spec.leftPocket[0], spec.leftPocket[1], spec.leftPocket[2]);
    _wOffsetVec.copy(_wLeftPocketLocal).applyQuaternion(_wWorldQuat);
    _wWorldPos.sub(_wOffsetVec);

    if (lockW < 0.999 && wOut) {
      _wFreePos.set(wOut.leftFreeX, wOut.leftFreeY, wOut.leftFreeZ);
      _wFreeEuler.set(wOut.leftFreeRotX, wOut.leftFreeRotY, wOut.leftFreeRotZ, 'YXZ');
      _wFreeQuat.setFromEuler(_wFreeEuler);
      _wWorldPos.lerp(_wFreePos, 1 - lockW);
      _wWorldQuat.slerp(_wFreeQuat, 1 - lockW);
    }

    rigObj.leftHandPivot.position.copy(_wWorldPos);
    rigObj.leftHandPivot.quaternion.copy(_wWorldQuat);

    rigObj.setHandPose(rigObj.rightHand, wOut ? wOut.rPose : spec.rightPose);
    rigObj.setHandPose(rigObj.leftHand, wOut ? wOut.lPose : spec.leftPose);
  }

  Object.assign(VI, {
    RIGHT_HAND_GRIP_ROLL,
    WEAPON_GRIP_SPECS,
    createWeaponAnimOut,
    weaponInspectDuration,
    applyAwpRightHandBoltCycle,
    applyV47RightHandRack,
    evaluateWeaponReloadAndAction,
    evaluateWeaponChoreography,
    applyWeaponSocketTransform,
    applyWeaponMechanicalParts,
    lockSupportHandToWeapon
  });
})(typeof self !== "undefined" ? self : globalThis);
