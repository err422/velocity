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
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    smg: {
      gripCenter: [0.0, -0.048, 0.046],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.030, -0.175],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.14, -0.42, 1.96],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.72, middle: 0.78, ring: 0.82, pinky: 0.80, thumb: 0.40, indexRingHook: 0, indexPoint: 0, gunWrap: 0.74, hiltWrap: 0, shellPinch: 0 }
    },
    shotgun: {
      gripCenter: [0.0, -0.046, 0.072],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.018, -0.295],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.12],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.70, middle: 0.76, ring: 0.80, pinky: 0.78, thumb: 0.38, indexRingHook: 0, indexPoint: 0, gunWrap: 0.72, hiltWrap: 0, shellPinch: 0 }
    },
    awp: {
      gripCenter: [0.0, -0.048, 0.058],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.014, -0.280],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.66, hiltWrap: 0, shellPinch: 0 }
    },
    deagle: {
      gripCenter: [0.0, -0.050, 0.030],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.015, -0.048, 0.022],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.86, hiltWrap: 0, shellPinch: 0 }
    },
    revolver: {
      gripCenter: [0.0, -0.050, 0.040],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.015, -0.048, 0.030],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.86, hiltWrap: 0, shellPinch: 0 }
    },
    pistol: {
      gripCenter: [0.0, -0.048, 0.036],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.046, 0.028],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.86, hiltWrap: 0, shellPinch: 0 }
    },
    famas: {
      gripCenter: [0.0, -0.052, 0.032],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.008, -0.235],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.06],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    scar: {
      gripCenter: [0.0, -0.054, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.002, -0.245],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    honeybadger: {
      gripCenter: [0.0, -0.048, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.004, -0.240],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.06],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    mp7: {
      gripCenter: [0.0, -0.044, 0.032],
      rightPocket: [0.003, -0.027, -0.038],
      supportAnchor: [0.0, -0.034, -0.185],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.14, -0.40, 1.88],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.90, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.74, middle: 0.80, ring: 0.84, pinky: 0.82, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.78, hiltWrap: 0, shellPinch: 0 }
    },
    sawedoff: {
      gripCenter: [0.0, -0.034, 0.118],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.004, -0.165],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.70, middle: 0.76, ring: 0.80, pinky: 0.78, thumb: 0.38, indexRingHook: 0, indexPoint: 0, gunWrap: 0.72, hiltWrap: 0, shellPinch: 0 }
    },
    leverslug: {
      gripCenter: [0.0, -0.022, 0.095],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.002, -0.255],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.10],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    dmr: {
      gripCenter: [0.0, -0.048, 0.054],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, 0.002, -0.320],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.66, hiltWrap: 0, shellPinch: 0 }
    },
    scout: {
      gripCenter: [0.0, -0.044, 0.056],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.006, -0.275],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.66, hiltWrap: 0, shellPinch: 0 }
    },
    g18: {
      gripCenter: [0.0, -0.046, 0.028],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.046, 0.024],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.86, hiltWrap: 0, shellPinch: 0 }
    },
    usps: {
      gripCenter: [0.0, -0.052, 0.048],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.052, 0.044],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0, gunWrap: 0.86, hiltWrap: 0, shellPinch: 0 }
    },
    akimbo: {
      gripCenter: [0.0, -0.046, 0.026],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.27, -0.046, 0.026],
      leftPocket: [-0.003, -0.027, -0.035],
      leftRelEuler: [0.0, 0.0, 1.42],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 }
    },
    katana: {
      // Extended 0.27m tsuka: right hand directly behind tsuba, left hand firmly wrapping kashira pommel
      gripCenter: [0.0, 0.0, 0.068],
      rightPocket: [0.003, -0.024, -0.034],
      supportAnchor: [0.0, -0.002, 0.192],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.06, -0.18, 1.52],
      rightPose: { index: 0.95, middle: 0.96, ring: 0.97, pinky: 0.97, thumb: 0.82, indexRingHook: 0, indexPoint: 0, gunWrap: 0, hiltWrap: 1.0, shellPinch: 0 },
      leftPose: { index: 0.95, middle: 0.96, ring: 0.97, pinky: 0.97, thumb: 0.80, indexRingHook: 0, indexPoint: 0, gunWrap: 0, hiltWrap: 1.0, shellPinch: 0 }
    },
    rpg: {
      gripCenter: [0.0, -0.040, 0.032],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.038, -0.220],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.10, -0.35, 1.80],
      rightPose: { index: 0.48, middle: 0.92, ring: 0.94, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.90, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.80, middle: 0.86, ring: 0.88, pinky: 0.88, thumb: 0.50, indexRingHook: 0, indexPoint: 0, gunWrap: 0.84, hiltWrap: 0, shellPinch: 0 }
    },
    minigun: {
      gripCenter: [0.0, -0.048, 0.140],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [-0.074, -0.024, -0.155],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.18, -0.42, 1.92],
      rightPose: { index: 0.60, middle: 0.92, ring: 0.94, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.92, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.82, middle: 0.86, ring: 0.88, pinky: 0.88, thumb: 0.52, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 }
    },
    railcannon: {
      gripCenter: [0.0, -0.048, 0.050],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.006, -0.280],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    },
    grenadelauncher: {
      gripCenter: [0.0, -0.048, 0.055],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.040, -0.300],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.12, -0.38, 1.85],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      leftPose: { index: 0.76, middle: 0.82, ring: 0.84, pinky: 0.84, thumb: 0.46, indexRingHook: 0, indexPoint: 0, gunWrap: 0.80, hiltWrap: 0, shellPinch: 0 }
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
      leverAngle: 0,
      lifterPush: 0,
      showReloadShells: false,
      showReloadSingleShell: false,
      showReloadBullet: false,
      showReloadSpeedloader: false,
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
      akimboTossT: 0, akimboHide: false, akimboSpin: 0,
      rPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0, gunWrap: 0.88, hiltWrap: 0, shellPinch: 0 },
      lPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0, gunWrap: 0.68, hiltWrap: 0, shellPinch: 0 }
    };
  }

  function weaponInspectDuration(wt, tier, layer) {
    const l = layer || (tier === 'mythic' ? 'mythic' : tier === 'uncommon' ? 'signature' : 'showcase');
    if (l === 'mythic') return wt === 'revolver' ? 3.65 : 2.95;
    if (l === 'easter') return 2.55;
    if (l === 'showcase') return wt === 'katana' ? 2.65 : 2.25;
    if (l === 'group') return wt === 'katana' ? 2.75 : 2.35;
    // Signature per-weapon tricks
    if (wt === 'katana') return 3.05;
    if (wt === 'revolver') return 2.75;
    if (wt === 'deagle' || wt === 'akimbo') return 2.55;
    if (wt === 'awp' || wt === 'leverslug') return 2.70;
    return 2.60;
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

  // Authentic & playful weapon-specific reloads: R-88 empty speedloader vs partial shells,
  // interruptible M870 & LV-45 shell-by-shell loading, F-33 rear bullpup swap, Akimbo throw & spin-draw,
  // DB-12 break-action hinge, and tactical vs empty reloads with bolt/slide racks!
  function evaluateWeaponReloadAndAction(wt, state, out, playAudio) {
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    out.leftUseRawReload = false;
    out.pumpPull = 0;
    out.leverAngle = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;
    out.showReloadSingleShell = false;
    out.showReloadBullet = false;
    out.showReloadSpeedloader = false;
    out.akimboSpin = 0;

    // -1) Primary Ronin Katana combat choreography: authentic two-handed Chudan guard, fluid 3-hit slash combo, dash-lunge & deflect!
    if (wt === 'katana') {
      const inspectW = state.inspectT < 1 ? bell(state.inspectT, 0.0, 1.0) : 0;
      const idleW = 1 - inspectW;
      out.rx += 0.030 * idleW;
      out.ry += -0.014 * idleW;
      out.rz += -0.028 * idleW;
      out.rRotX += 0.28 * idleW;
      out.rRotY += -0.34 * idleW;
      out.rRotZ += -0.24 * idleW;

      const slashT = Number.isFinite(state.katanaSlashT) ? state.katanaSlashT : 1;
      const combo = Number.isFinite(state.katanaSlashCombo) ? (state.katanaSlashCombo % 3) : 0;
      if (slashT < 1) {
        const wind = smoothstep(0.0, 0.22, slashT) * (1 - smoothstep(0.22, 0.44, slashT));
        const strike = smoothstep(0.16, 0.48, slashT) * (1 - smoothstep(0.56, 1.0, slashT));
        const follow = smoothstep(0.44, 0.72, slashT) * (1 - smoothstep(0.76, 1.0, slashT));
        if (combo === 0) {
          out.rx += 0.062 * wind - 0.24 * strike;
          out.ry += 0.072 * wind - 0.10 * strike;
          out.rz += -0.065 * strike;
          out.rRotX += 0.26 * wind - 0.78 * strike - 0.14 * follow;
          out.rRotY += -0.30 * wind + 1.02 * strike + 0.16 * follow;
          out.rRotZ += -0.22 * wind + 0.74 * strike;
        } else if (combo === 1) {
          out.rx += -0.18 * wind + 0.13 * strike;
          out.ry += -0.08 * wind + 0.10 * strike;
          out.rz += -0.072 * strike;
          out.rRotX += -0.36 * wind + 0.68 * strike;
          out.rRotY += 0.70 * wind - 0.94 * strike;
          out.rRotZ += 0.60 * wind - 0.76 * strike;
        } else {
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
        out.rx = THREE.MathUtils.lerp(out.rx, -0.072, dp);
        out.ry = THREE.MathUtils.lerp(out.ry, 0.026, dp);
        out.rz = THREE.MathUtils.lerp(out.rz, -0.068, dp);
        out.rRotX = THREE.MathUtils.lerp(out.rRotX, 0.34, dp);
        out.rRotY = THREE.MathUtils.lerp(out.rRotY, 0.46, dp);
        out.rRotZ = THREE.MathUtils.lerp(out.rRotZ, 0.50, dp);
        out.leftAnchorOffZ -= 0.024 * dp;
        out.leftRelOffZ -= 0.14 * dp;
      }
      return;
    }

    // 0) R-88 Revolver: draw twirl, double-action charge, Fan-the-Hammer, EMPTY 6-ROUND SPEEDLOADER SLAM & PARTIAL SHELL-BY-SHELL RELOAD!
    if (wt === 'revolver') {
      out.ammoVisibleCount = Number.isFinite(state.revolverAmmo) ? state.revolverAmmo : 6;
      out.cylinderIndex = Number.isFinite(state.revolverCylinderIndex) ? state.revolverCylinderIndex : 0;

      // 0a) CS-Style Draw Forward Trigger-Finger Twirl
      if (state.drawT < 1) {
        const dtNorm = state.drawT;
        const spinPhase = smoothstep(0.06, 0.78, dtNorm);
        const openGrip = smoothstep(0.0, 0.14, dtNorm) * (1 - smoothstep(0.68, 0.84, dtNorm));
        const catchSnap = bell(dtNorm, 0.72, 0.96);
        const dropLeft = 1 - smoothstep(0.64, 0.94, dtNorm);

        out.leftLock = Math.min(out.leftLock, 1 - dropLeft);
        out.leftFreeX = -0.26; out.leftFreeY = -0.34; out.leftFreeZ = -0.34;
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

      // 0b) 0.20s Double-Action Trigger Charge
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

      // 0c) Fan-the-Hammer palm-slap
      if (state.fanT < 1) {
        const ft = state.fanT;
        const env = bell(ft, 0.0, 1.0);
        const slapSweep = smoothstep(0.06, 0.42, ft) * (1 - smoothstep(0.56, 0.98, ft));
        const slapArc = Math.sin(ft * Math.PI);
        out.rRotZ += env * 0.26;
        out.rRotY += env * 0.15;
        out.rRotX += env * 0.06;
        out.leftAnchorOffX += slapSweep * (0.018 + (ft - 0.35) * 0.09);
        out.leftAnchorOffY += slapSweep * (0.105 + slapArc * 0.028);
        out.leftAnchorOffZ += slapSweep * (-0.012);
        out.leftRelOffX += slapSweep * -0.45;
        out.leftRelOffY += slapSweep * 0.55;
        out.leftRelOffZ += slapSweep * -0.95;
        out.lPose.index = THREE.MathUtils.lerp(out.lPose.index, 0.14, slapSweep);
        out.lPose.middle = THREE.MathUtils.lerp(out.lPose.middle, 0.14, slapSweep);
        out.lPose.ring = THREE.MathUtils.lerp(out.lPose.ring, 0.18, slapSweep);
        out.lPose.pinky = THREE.MathUtils.lerp(out.lPose.pinky, 0.22, slapSweep);
        out.lPose.thumb = THREE.MathUtils.lerp(out.lPose.thumb, 0.20, slapSweep);
      }

      // 0d) EMPTY CYLINDER SPEEDLOADER SLAM (when cylinder was 0/6!)
      if (state.reloadT < 1 && state.reloadVariant === 'speedloader') {
        const t = state.reloadT;
        out.leftUseRawReload = true;
        const openEnv = smoothstep(0.04, 0.18, t) * (1 - smoothstep(0.76, 0.90, t));
        const dumpTilt = bell(t, 0.16, 0.38);
        const slamBump = bell(t, 0.52, 0.68);
        const whipSnap = bell(t, 0.78, 0.94);

        out.rx += -0.036 * openEnv + whipSnap * 0.026;
        out.ry += 0.038 * openEnv - slamBump * 0.012;
        out.rz += 0.018 * openEnv + slamBump * 0.014;
        out.rRotX += 0.18 * openEnv + dumpTilt * 0.42 - slamBump * 0.08;
        out.rRotY += 0.40 * openEnv - whipSnap * 0.28;
        out.rRotZ += 0.52 * openEnv - whipSnap * 0.60;

        out.latchSlide = bell(t, 0.02, 0.14);
        out.craneOpen = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.87, t));
        out.ejectorPush = bell(t, 0.18, 0.36);
        out.cylinderSpin += smoothstep(0.56, 0.72, t) * (Math.PI * 0.66);
        // Once the 6-round speedloader seats at t >= 0.58, all 6 fresh brass rounds appear instantly!
        out.ammoVisibleCount = t < 0.58 ? 0 : 6;
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.34, out.latchSlide);

        // Left hand dives to belt pouch, sweeps UP with the 6-round speedloader, slams it straight into the open cylinder, twists & drops it!
        const offGrip = smoothstep(0.08, 0.22, t) * (1 - smoothstep(0.74, 0.94, t));
        const sweepUp = smoothstep(0.32, 0.54, t) * (1 - smoothstep(0.66, 0.78, t));
        const twistDrop = bell(t, 0.62, 0.76);
        out.leftAnchorOffX += offGrip * THREE.MathUtils.lerp(-0.072, -0.044, sweepUp);
        out.leftAnchorOffY += offGrip * THREE.MathUtils.lerp(-0.155, 0.072 - twistDrop * 0.04, sweepUp);
        out.leftAnchorOffZ += offGrip * THREE.MathUtils.lerp(-0.024, -0.040 - slamBump * 0.018, sweepUp);
        out.leftRelOffX += offGrip * THREE.MathUtils.lerp(-0.24, 0.18, sweepUp);
        out.leftRelOffY += offGrip * THREE.MathUtils.lerp(0.22, 0.42, sweepUp);
        out.leftRelOffZ += offGrip * THREE.MathUtils.lerp(-0.34, -0.16 + twistDrop * 0.65, sweepUp);

        out.showReloadSpeedloader = t > 0.26 && t < 0.72;
        out.lPose.shellPinch = sweepUp * 0.92;
        out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.44, offGrip);
        out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.58, offGrip);
        out.lPose.thumb = THREE.MathUtils.lerp(spec.leftPose.thumb, 0.74, offGrip);

        if (playAudio) {
          if (t > 0.08 && !(state.reloadCueMask & 1)) {
            state.reloadCueMask |= 1;
            WeaponAudio.revolverCraneOpen();
          }
          if (t > 0.20 && !(state.reloadCueMask & 2)) {
            state.reloadCueMask |= 2;
            WeaponAudio.revolverEjectorDump();
          }
          if (t > 0.56 && !(state.reloadCueMask & 4)) {
            state.reloadCueMask |= 4;
            WeaponAudio.shellInsert();
            CaseAudio.balisongClack(1.12);
          }
          if (t > 0.80 && !(state.reloadCueMask & 8)) {
            state.reloadCueMask |= 8;
            WeaponAudio.revolverCraneClose();
          }
        }
        return;
      }

      // 0e) PARTIAL CYLINDER INTERRUPTIBLE SHELL-BY-SHELL RELOAD ('open' -> 'insert' x N -> 'close')
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
          out.rRotX += lift * 0.18 + dumpTilt * 0.34;
          out.rRotY += lift * 0.38;
          out.rRotZ += lift * 0.50;
          out.latchSlide = bell(p, 0.04, 0.36);
          out.craneOpen = smoothstep(0.14, 0.66, p);
          out.ejectorPush = bell(p, 0.46, 0.90);
          out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.34, bell(p, 0.04, 0.38));

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
          const feed = bell(p, 0.14, 0.82);
          const seatBump = bell(p, 0.58, 0.86);
          out.rx += -0.036;
          out.ry += 0.038 - seatBump * 0.008;
          out.rz += 0.016 + seatBump * 0.009;
          out.rRotX += 0.18 - seatBump * 0.04;
          out.rRotY += 0.38;
          out.rRotZ += 0.50 + seatBump * 0.03;
          out.craneOpen = 1.0;
          out.cylinderSpin += smoothstep(0.60, 0.96, p) * (Math.PI / 3);

          out.leftAnchorOffX += THREE.MathUtils.lerp(-0.068, -0.042, feed);
          out.leftAnchorOffY += THREE.MathUtils.lerp(-0.145, 0.068, feed);
          out.leftAnchorOffZ += THREE.MathUtils.lerp(-0.020, -0.036 - seatBump * 0.014, feed);
          out.leftRelOffX += THREE.MathUtils.lerp(-0.24, 0.16, feed);
          out.leftRelOffY += THREE.MathUtils.lerp(0.22, 0.38, feed);
          out.leftRelOffZ += THREE.MathUtils.lerp(-0.32, -0.18, feed);

          out.showReloadBullet = p > 0.08 && p < 0.72;
          out.lPose.shellPinch = 0.88;
          out.lPose.index = 0.42; out.lPose.middle = 0.62; out.lPose.ring = 0.76; out.lPose.pinky = 0.84; out.lPose.thumb = 0.66;
          return;
        }

        if (rPhase === 'close') {
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

          const backW = 1 - smoothstep(0.32, 0.94, p);
          out.leftAnchorOffX += -0.060 * backW;
          out.leftAnchorOffY += -0.120 * backW;
          out.leftAnchorOffZ += -0.018 * backW;
          return;
        }
      }
      return;
    }

    // 0.5) M870 SHOTGUN & LV-45 LEVER-ACTION INTERRUPTIBLE SHELL-BY-SHELL TUBE LOADING ('open' -> 'insert' x N -> 'close')
    const sPhase = (wt === 'shotgun' || wt === 'leverslug') ? (state.shellReloadPhase || 'none') : 'none';
    if (sPhase !== 'none') {
      const p = Math.max(0, Math.min(1, Number(state.shellReloadPhaseProgress) || 0));
      const isLever = wt === 'leverslug';
      out.leftUseRawReload = true;

      if (sPhase === 'open') {
        const cant = smoothstep(0.0, 0.72, p);
        out.rx -= cant * 0.044;
        out.ry += cant * 0.032;
        out.rz += cant * 0.014;
        out.rRotX += cant * (isLever ? 0.18 : 0.22);
        out.rRotY -= cant * (isLever ? 0.26 : 0.20);
        out.rRotZ += cant * (isLever ? -0.52 : 0.72); // M870 exposes bottom gate; LV-45 tilts to expose right/side loading gate!
        const reach = smoothstep(0.18, 0.90, p);
        out.leftAnchorOffX += reach * (isLever ? 0.036 : -0.012);
        out.leftAnchorOffY += reach * -0.115;
        out.leftAnchorOffZ += reach * (isLever ? 0.185 : 0.232);
        out.leftRelOffX += reach * -0.32;
        out.leftRelOffY += reach * 0.28;
        out.leftRelOffZ += reach * -0.42;
        out.lPose.shellPinch = reach * 0.65;
        return;
      }

      if (sPhase === 'insert') {
        const push = bell(p, 0.16, 0.84);
        const seatBump = bell(p, 0.52, 0.82);
        out.rx -= 0.044;
        out.ry += 0.032 + seatBump * 0.008;
        out.rz += 0.014 - seatBump * 0.010;
        out.rRotX += (isLever ? 0.18 : 0.22) + seatBump * 0.04;
        out.rRotY -= (isLever ? 0.26 : 0.20);
        out.rRotZ += (isLever ? -0.52 : 0.72);

        out.leftAnchorOffX += isLever ? (0.036 - push * 0.018) : -0.010;
        out.leftAnchorOffY += THREE.MathUtils.lerp(-0.115, isLever ? -0.012 : -0.022, push);
        out.leftAnchorOffZ += (isLever ? 0.185 : 0.232) - seatBump * 0.012;
        out.leftRelOffX += -0.32 + push * 0.22;
        out.leftRelOffY += 0.28;
        out.leftRelOffZ += -0.42 + push * 0.16;

        out.showReloadSingleShell = p > 0.08 && p < 0.70;
        out.lifterPush = push * 0.009;
        out.lPose.shellPinch = 0.90;
        out.lPose.index = 0.44; out.lPose.middle = 0.54; out.lPose.ring = 0.64; out.lPose.pinky = 0.70; out.lPose.thumb = 0.76;
        return;
      }

      if (sPhase === 'close') {
        const hold = 1 - smoothstep(0.0, 0.45, p);
        const backL = 1 - smoothstep(0.0, 0.36, p);
        out.rx -= 0.044 * hold;
        out.ry += 0.032 * hold;
        out.rz += 0.014 * hold;
        out.rRotX += (isLever ? 0.18 : 0.22) * hold;
        out.rRotY -= (isLever ? 0.26 : 0.20) * hold;
        out.rRotZ += (isLever ? -0.52 : 0.72) * hold;

        out.leftAnchorOffX += (isLever ? 0.036 : -0.010) * backL;
        out.leftAnchorOffY += -0.105 * backL;
        out.leftAnchorOffZ += (isLever ? 0.185 : 0.232) * backL;
        out.leftRelOffX += -0.30 * backL;
        out.leftRelOffY += 0.26 * backL;
        out.leftRelOffZ += -0.38 * backL;

        // Crisp pump rack (M870) or Terminator lever flick (LV-45) at the end of close!
        const actionArc = bell(p, 0.34, 0.94);
        if (isLever) {
          out.leverAngle = actionArc * 0.98;
          out.rRotX += actionArc * 0.14;
          out.rRotZ -= actionArc * 0.10;
        } else {
          out.pumpPull = actionArc * 0.088;
          out.rRotX += actionArc * 0.06;
          out.rRotZ -= actionArc * 0.08;
        }
        return;
      }
    }

    // 1) Post-shot mechanical actions (AWP & Scout bolt cycle, M870 pump rack, LV-45 lever action!)
    if (state.boltT < 1 && state.reloadT >= 1) {
      const bt = state.boltT;
      if (wt === 'awp' || wt === 'scout') {
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
      } else if (wt === 'leverslug') {
        const levArc = bell(bt, 0.10, 0.88);
        out.leverAngle = levArc * 0.96;
        out.rRotX += levArc * 0.14;
        out.rRotZ -= levArc * 0.09;
        out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.52, levArc);
        out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.44, levArc);
        if (playAudio && bt > 0.18 && !(state.boltCueMask & 1)) {
          state.boltCueMask |= 1;
          WeaponAudio.pumpRack();
        }
      }
    }

    // 2) Full magazine / break-action / throw-and-draw reload choreography
    if (state.reloadT >= 1) return;
    const t = state.reloadT;
    const isTac = Boolean(state.reloadIsTactical);
    out.leftUseRawReload = true;

    if (wt === 'sawedoff') {
      // DB-12 BREAK-ACTION RELOAD: crack latch -> hinge barrels -> eject spent shells -> seat twin shells -> playful wrist-flick shut!
      const openEnv = smoothstep(0.05, 0.21, t) * (1 - smoothstep(0.76, 0.92, t));
      const snapFlick = bell(t, 0.76, 0.97);
      out.rx -= openEnv * 0.042;
      out.ry += openEnv * 0.028 - snapFlick * 0.015;
      out.rz += openEnv * 0.022;
      out.rRotX += -openEnv * 0.14 + snapFlick * 0.32;
      out.rRotY += openEnv * 0.16;
      out.rRotZ += openEnv * 0.28 - snapFlick * 0.16;

      out.breechAngle = -0.92 * smoothstep(0.10, 0.24, t) * (1 - smoothstep(0.76, 0.89, t));

      if (t < 0.18) {
        out.breechShellMode = 'seated';
        out.breechShellEject = 0; out.breechShellInsert0 = 1; out.breechShellInsert1 = 1;
      } else if (t < 0.44) {
        out.breechShellMode = 'eject';
        out.breechShellEject = smoothstep(0.18, 0.44, t);
      } else if (t < 0.52) {
        out.breechShellMode = 'hidden';
        out.breechShellEject = 1; out.breechShellInsert0 = 0; out.breechShellInsert1 = 0;
      } else if (t < 0.72) {
        out.breechShellMode = 'insert';
        out.breechShellEject = 0;
        out.breechShellInsert0 = smoothstep(0.52, 0.64, t);
        out.breechShellInsert1 = smoothstep(0.58, 0.70, t);
      } else {
        out.breechShellMode = 'seated';
        out.breechShellEject = 0; out.breechShellInsert0 = 1; out.breechShellInsert1 = 1;
      }

      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.32, bell(t, 0.04, 0.20));

      const offForend = smoothstep(0.12, 0.26, t) * (1 - smoothstep(0.73, 0.85, t));
      const reachPouch = bell(t, 0.22, 0.48);
      const seatPush1 = bell(t, 0.48, 0.64);
      const seatPush2 = bell(t, 0.56, 0.72);
      const feedPeak = Math.max(seatPush1, seatPush2);

      out.leftAnchorOffX += offForend * (-0.016 + seatPush2 * 0.018);
      out.leftAnchorOffY += offForend * (-0.065 - reachPouch * 0.145 + feedPeak * 0.118);
      out.leftAnchorOffZ += offForend * (0.102 - feedPeak * 0.022);
      out.leftRelOffX += offForend * (-0.28 + feedPeak * 0.26);
      out.leftRelOffY += offForend * 0.30;
      out.leftRelOffZ += offForend * -0.42;

      out.showReloadShells = t > 0.34 && t < 0.56;
      out.lPose.shellPinch = offForend * 0.80;
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.46, offForend);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.54, offForend);
      out.lPose.thumb = THREE.MathUtils.lerp(spec.leftPose.thumb, 0.74, offForend);

      if (playAudio) {
        if (t > 0.16 && !(state.reloadCueMask & 1)) { state.reloadCueMask |= 1; CaseAudio.balisongClack(0.86); }
        if (t > 0.45 && !(state.reloadCueMask & 2)) { state.reloadCueMask |= 2; WeaponAudio.shellInsert(); }
        if (t > 0.62 && !(state.reloadCueMask & 4)) { state.reloadCueMask |= 4; WeaponAudio.shellInsert(); }
        if (t > 0.82 && !(state.reloadCueMask & 8)) { state.reloadCueMask |= 8; WeaponAudio.pumpRack(); }
      }
      return;
    }

    if (wt === 'akimbo') {
      // DUAL AKIMBO REAPER-STYLE THROW-AND-SPIN-DRAW RELOAD!
      const tossFlick = bell(t, 0.0, 0.32);
      const dipEnv = smoothstep(0.24, 0.42, t) * (1 - smoothstep(0.54, 0.76, t));
      const drawPop = bell(t, 0.62, 0.96);
      const spinPhase = smoothstep(0.60, 0.92, t);

      out.akimboTossT = t < 0.36 ? smoothstep(0.05, 0.35, t) : 0;
      out.akimboHide = t >= 0.34 && t < 0.56;
      out.akimboSpin = t >= 0.56 ? (1 - spinPhase) * Math.PI * 2 : 0;

      out.rx += tossFlick * 0.038;
      out.ry += tossFlick * 0.048 - dipEnv * 0.28 + drawPop * 0.026;
      out.rz += -tossFlick * 0.080 + dipEnv * 0.04;
      out.rRotX += tossFlick * 0.44 - dipEnv * 0.52 - drawPop * 0.16;
      out.rRotY += tossFlick * 0.16;
      out.rRotZ += tossFlick * 0.22 + drawPop * 0.20;

      const releaseOpen = smoothstep(0.08, 0.22, t) * (1 - smoothstep(0.46, 0.60, t));
      out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.14, releaseOpen);
      out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.18, releaseOpen);
      out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.22, releaseOpen);
      out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.26, releaseOpen);
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.14, releaseOpen);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.18, releaseOpen);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.22, releaseOpen);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.26, releaseOpen);

      const leftFreeW = smoothstep(0.02, 0.12, t) * (1 - smoothstep(0.72, 0.92, t));
      out.leftLock = 1 - leftFreeW;
      out.leftFreeX = -0.145 - tossFlick * 0.038;
      out.leftFreeY = -0.145 + tossFlick * 0.048 - dipEnv * 0.30 + drawPop * 0.026;
      out.leftFreeZ = -0.320 - tossFlick * 0.080;
      out.leftFreeRotX = 0.04 + tossFlick * 0.44 - dipEnv * 0.52;
      out.leftFreeRotY = -0.05 - tossFlick * 0.16;
      out.leftFreeRotZ = 1.42 - tossFlick * 0.22;

      if (playAudio) {
        if (t > 0.08 && !(state.reloadCueMask & 1)) { state.reloadCueMask |= 1; CaseAudio.spinWhoosh(1.18); }
        if (t > 0.58 && !(state.reloadCueMask & 2)) { state.reloadCueMask |= 2; WeaponAudio.weaponDraw(); }
        if (t > 0.78 && !(state.reloadCueMask & 4)) { state.reloadCueMask |= 4; CaseAudio.balisongClack(1.10); }
      }
      return;
    }

    if (wt === 'shotgun') {
      // M870 Drum-Mag Reload (only runs when drum_mag attachment overrides shell-by-shell!)
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.58, 0.70, t));
      const magPull = bell(t, 0.12, 0.60);
      out.ry -= magEnv * 0.050;
      out.rRotX -= magEnv * 0.22;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.38;
      out.leftAnchorOffY += magEnv * (-0.080 - magPull * 0.095);
      out.leftAnchorOffZ += magEnv * 0.215;
      out.leftRelOffX -= magEnv * 0.28;
      out.leftRelOffZ -= magEnv * 0.32;
      out.magDropY = -magPull * 0.125;
      if (!isTac) {
        const rackArc = bell(t, 0.74, 0.96);
        out.pumpPull = rackArc * 0.088;
        out.rRotX += rackArc * 0.06;
        if (playAudio && t > 0.76 && !(state.reloadCueMask & 1)) { state.reloadCueMask |= 1; WeaponAudio.pumpRack(); }
      }
      return;
    }

    if (wt === 'famas') {
      // F-33 BULLPUP REAR MAGAZINE SWAP: Left hand reaches BEHIND the pistol grip to the rear bullpup magwell!
      // Empty reload adds a cheeky HK-style slap on the top carry-handle charging lever!
      const magEnd = isTac ? 0.88 : 0.62;
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(magEnd - 0.10, magEnd + 0.04, t));
      const magPull = bell(t, 0.12, magEnd - 0.04);
      const seatSlap = bell(t, magEnd - 0.14, magEnd);
      const slapEnv = isTac ? 0 : (smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t)));
      const slapPull = isTac ? 0 : bell(t, 0.74, 0.90);

      out.rx -= magEnv * 0.025;
      out.ry -= magEnv * 0.036 - seatSlap * 0.014 - slapEnv * 0.018;
      out.rRotX -= magEnv * 0.16 - slapEnv * 0.08;
      out.rRotY -= magEnv * 0.24 - slapEnv * 0.18;
      out.rRotZ += magEnv * 0.42 + slapEnv * 0.32;

      // Relative to famas supportAnchor [0, -0.008, -0.235]: rear bullpup mag sits at z = +0.165 => deltaZ = +0.400!
      // Top carry-handle charging lever sits near [0, +0.092, -0.040] => deltaY = +0.100, deltaZ = +0.195!
      out.leftAnchorOffX += -magEnv * 0.026 - slapEnv * 0.022;
      out.leftAnchorOffY += magEnv * (-0.092 - magPull * 0.088) + slapEnv * 0.098;
      out.leftAnchorOffZ += magEnv * 0.390 + slapEnv * (0.185 + slapPull * 0.045);
      out.leftRelOffX += -magEnv * 0.28 + slapEnv * 0.24;
      out.leftRelOffY += magEnv * 0.22 + slapEnv * 0.22;
      out.leftRelOffZ += -magEnv * 0.40 - slapEnv * 0.30;

      out.magDropY = -magPull * 0.115;
      out.magTiltX = magPull * 0.16;
      out.boltPull = Math.max(out.boltPull, slapPull * 0.052);

      if (playAudio && !isTac && t > 0.75 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    if (wt === 'awp' || wt === 'scout') {
      // AWP & SSG-08: Swap box magazine -> Tactical finishes crisp, Empty cycles right-hand bolt!
      const magEnd = isTac ? 0.88 : 0.64;
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(magEnd - 0.10, magEnd + 0.04, t));
      const magPull = bell(t, 0.12, magEnd - 0.05);
      const seatTap = isTac ? bell(t, 0.74, 0.90) : 0;
      out.ry -= magEnv * 0.045 - seatTap * 0.014;
      out.rRotX -= magEnv * 0.20;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.30;

      out.leftAnchorOffY += magEnv * (-0.065 - magPull * 0.095);
      out.leftAnchorOffZ += magEnv * 0.205;
      out.leftRelOffX -= magEnv * 0.28;
      out.leftRelOffY += magEnv * 0.18;
      out.leftRelOffZ -= magEnv * 0.30;
      out.magDropY = -magPull * 0.115;
      out.magTiltX = -magPull * 0.10;

      if (!isTac) {
        const handOff = smoothstep(0.68, 0.76, t) * (1 - smoothstep(0.90, 0.98, t));
        const boltLift = smoothstep(0.72, 0.79, t) * (1 - smoothstep(0.88, 0.94, t));
        const boltPull = smoothstep(0.78, 0.85, t) * (1 - smoothstep(0.86, 0.92, t));
        applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);
        if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          WeaponAudio.boltRack();
        }
      }
      return;
    }

    if (wt === 'rifle' || wt === 'dmr') {
      // V-47 AK & MK-14 DMR: Rock-and-lock mag swap -> Tactical snaps back; Empty racks right-side charging handle!
      const magEnd = isTac ? 0.88 : 0.62;
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(magEnd - 0.10, magEnd + 0.04, t));
      const magPull = bell(t, 0.12, magEnd - 0.06);
      const seatBump = isTac ? bell(t, 0.74, 0.90) : 0;

      out.ry -= magEnv * 0.048 - seatBump * 0.015;
      out.rRotX -= magEnv * 0.22;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.34;

      out.leftAnchorOffX += -magEnv * 0.008;
      out.leftAnchorOffY += magEnv * (-0.075 - magPull * 0.085);
      out.leftAnchorOffZ += magEnv * (wt === 'dmr' ? 0.220 : 0.138);
      out.leftRelOffX -= magEnv * 0.24;
      out.leftRelOffY += magEnv * 0.16;
      out.leftRelOffZ -= magEnv * 0.32;

      out.magDropY = -magPull * 0.108;
      out.magTiltX = -magPull * (wt === 'rifle' ? 0.34 : 0.22);

      if (!isTac) {
        const handOff = smoothstep(0.67, 0.76, t) * (1 - smoothstep(0.89, 0.98, t));
        const rackPull = bell(t, 0.74, 0.91);
        applyV47RightHandRack(out, spec, handOff, rackPull);
        if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          WeaponAudio.boltRack();
        }
      }
      return;
    }

    if (wt === 'smg' || wt === 'scar' || wt === 'honeybadger' || wt === 'mp7') {
      // VX-9, SC-20, HB-7, MP-7: Snappy mag swap -> Tactical palm-taps baseplate; Empty racks left-side/rear charging handle!
      const magEnd = isTac ? 0.88 : 0.64;
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(magEnd - 0.10, magEnd + 0.04, t));
      const magPull = bell(t, 0.12, magEnd - 0.06);
      const rackEnv = isTac ? 0 : (smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t)));
      const rackPull = isTac ? 0 : bell(t, 0.73, 0.90);
      const tapPop = isTac ? bell(t, 0.74, 0.90) : 0;

      out.ry -= magEnv * 0.045 - rackEnv * 0.015 - tapPop * 0.014;
      out.rRotX -= magEnv * 0.20 - rackEnv * 0.08;
      out.rRotY -= magEnv * 0.16 - rackEnv * 0.16;
      out.rRotZ += magEnv * 0.28 + rackEnv * 0.26;

      const magOffZ = wt === 'mp7' ? 0.215 : (wt === 'smg' ? 0.042 : 0.155);
      const rackOffZ = wt === 'honeybadger' || wt === 'mp7' ? 0.210 : (wt === 'scar' ? 0.095 : 0.012);
      out.leftAnchorOffX += -rackEnv * 0.036;
      out.leftAnchorOffY += magEnv * (-0.072 - magPull * 0.088) + rackEnv * 0.054;
      out.leftAnchorOffZ += magEnv * magOffZ + rackEnv * (rackOffZ + rackPull * 0.048);
      out.leftRelOffX += -magEnv * 0.22 + rackEnv * 0.16;
      out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.18;
      out.leftRelOffZ += -magEnv * 0.28 + rackEnv * 0.24;

      out.magDropY = -magPull * 0.112;
      out.magTiltX = magPull * (wt === 'smg' ? 0.14 : -0.10);
      out.boltPull = Math.max(out.boltPull, rackPull * 0.050);

      if (playAudio && !isTac && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    // PISTOLS (DEAGLE, USP-9, USP-S, G-18) & SCORESTREAK FALLBACKS:
    // Tactical swaps grip mag with crisp baseplate tap; Empty adds full left-hand overhand slide rack!
    const magEnd = isTac ? 0.88 : 0.64;
    const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(magEnd - 0.10, magEnd + 0.04, t));
    const magPull = bell(t, 0.12, magEnd - 0.06);
    const rackEnv = isTac ? 0 : (smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t)));
    const rackPull = isTac ? 0 : bell(t, 0.73, 0.90);
    const tapPop = isTac ? bell(t, 0.74, 0.90) : 0;

    out.ry -= magEnv * 0.040 - rackEnv * 0.022 - tapPop * 0.015;
    out.rRotX -= magEnv * 0.16 - rackEnv * 0.10 - tapPop * 0.06;
    out.rRotY -= magEnv * 0.14 - rackEnv * 0.24;
    out.rRotZ += magEnv * 0.34 + rackEnv * 0.28;

    out.leftAnchorOffX += -rackEnv * 0.022;
    out.leftAnchorOffY += magEnv * (-0.068 - magPull * 0.072) + rackEnv * 0.094;
    out.leftAnchorOffZ += magEnv * 0.022 + rackEnv * (-0.008 + rackPull * 0.038);
    out.leftRelOffX += -magEnv * 0.24 + rackEnv * 0.22;
    out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.26;
    out.leftRelOffZ += -magEnv * 0.26 - rackEnv * 0.56;

    out.magDropY = -magPull * 0.098;
    out.magTiltX = -magPull * 0.10;
    out.slideBack = Math.max(out.slideBack, rackPull * 0.038);

    if (playAudio && !isTac && t > 0.73 && !(state.reloadCueMask & 1)) {
      state.reloadCueMask |= 1;
      WeaponAudio.boltRack();
    }
  }

  // 3-Layer Bespoke Firearm & Katana Inspect Choreography:
  // Layer 1 ('showcase'): Universal skin & StatTrak™ LED showcase
  // Layer 2 ('group'): Shared weapon-class mechanical check
  // Layer 3 ('signature'): Per-weapon bespoke mechanical trick / playful personality
  // Plus rare 'easter' (~1/25) & 'mythic' (~1/100) humorous Easter eggs!
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
    out.leverAngle = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;
    out.showReloadSingleShell = false;
    out.showReloadBullet = false;
    out.showReloadSpeedloader = false;
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
    out.akimboTossT = 0; out.akimboHide = false; out.akimboSpin = 0;

    Object.assign(out.rPose, spec.rightPose);
    Object.assign(out.lPose, spec.leftPose);

    const t = state.inspectT;
    if (t >= 1) return;

    const isMythic = state.inspectTier === 'mythic' || state.inspectLayer === 'mythic';
    const layer = state.inspectLayer || (isMythic ? 'mythic' : state.inspectTier === 'uncommon' ? 'signature' : 'showcase');
    const isOneHandPistol = wt === 'deagle' || wt === 'pistol' || wt === 'usps' || wt === 'g18' || wt === 'revolver';

    // === RARE 1/100 MYTHIC EASTER EGGS ===
    if (layer === 'mythic') {
      if (wt === 'revolver') {
        // 1-IN-100 MYTHIC "HIGH NOON SHOWSTOPPER"
        const env = bell(t, 0.0, 1.0);
        const dropLeft = smoothstep(0.0, 0.10, t) * (1 - smoothstep(0.88, 1.0, t));
        const flickHand = bell(t, 0.14, 0.30);
        out.leftLock = 1 - dropLeft * (1 - flickHand);
        out.leftFreeX = -0.26; out.leftFreeY = -0.35; out.leftFreeZ = -0.34;
        out.leftFreeRotX = 0.24; out.leftFreeRotY = -0.38; out.leftFreeRotZ = 0.32;
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
        out.spinAngle = -smoothstep(0.55, 0.74, t) * Math.PI * 4 + smoothstep(0.74, 0.87, t) * Math.PI * 2;
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
          if (t > 0.08 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.revolverCraneOpen(); }
          if (t > 0.20 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; WeaponAudio.revolverCylinderSpin(1.35); }
          if (t > 0.46 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; WeaponAudio.revolverCraneClose(); }
          if (t > 0.57 && !(state.inspectCueMask & 8)) { state.inspectCueMask |= 8; CaseAudio.spinWhoosh(1.28); }
          if (t > 0.74 && !(state.inspectCueMask & 16)) { state.inspectCueMask |= 16; CaseAudio.spinWhoosh(1.12); }
          if (t > 0.86 && !(state.inspectCueMask & 32)) { state.inspectCueMask |= 32; CaseAudio.balisongClack(1.06); }
          if (t > 0.90 && !(state.inspectCueMask & 64)) { state.inspectCueMask |= 64; WeaponAudio.revolverRatchet(2); }
        }
        return;
      }

      // UNIVERSAL 1/100 MYTHIC "BUTTERFINGERS SAVE!":
      // Operator tries a fancy tilt -> slips & bobbles weapon into the air -> panicked mid-air snatch catch -> relieved pat!
      const env = bell(t, 0.0, 1.0);
      const slip = bell(t, 0.16, 0.36);
      const airBobble = bell(t, 0.30, 0.64);
      const snatch = bell(t, 0.58, 0.78);
      const pat1 = bell(t, 0.78, 0.86);
      const pat2 = bell(t, 0.86, 0.94);

      out.rx = -0.048 * env + Math.sin(t * Math.PI * 5) * 0.024 * airBobble;
      out.ry = 0.032 * env - slip * 0.055 + airBobble * 0.085 - snatch * 0.036;
      out.rz = 0.018 * env - airBobble * 0.025;
      out.rRotX = 0.18 * env - slip * 0.45 + airBobble * 0.62 - snatch * 0.24;
      out.rRotY = 0.52 * env + Math.sin(airBobble * Math.PI * 2) * 0.34;
      out.rRotZ = 0.26 * env - slip * 0.65 + airBobble * 0.88 - snatch * 0.30;
      out.wPosY = airBobble * 0.052;
      out.wRotX = airBobble * 0.38;
      out.leftAnchorOffY = (pat1 + pat2) * 0.038 - airBobble * 0.045;
      out.leftAnchorOffZ = (pat1 + pat2) * 0.05;

      const panicOpen = Math.max(slip, airBobble);
      out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.12, panicOpen);
      out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.14, panicOpen);
      out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.18, panicOpen);
      out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.20, panicOpen);
      if (playAudio) {
        if (t > 0.26 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.24); }
        if (t > 0.58 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.12); }
        if (t > 0.80 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.balisongClack(0.92); }
      }
      return;
    }

    // === RARE ~1/25 PLAYFUL EASTER EGG: "TACTICAL SHOWOFF" ===
    if (layer === 'easter') {
      const env = bell(t, 0.0, 1.0);
      const pop = bell(t, 0.18, 0.56);
      const catchSnap = bell(t, 0.54, 0.74);
      const wag = Math.sin(smoothstep(0.70, 0.96, t) * Math.PI * 4) * bell(t, 0.70, 0.96);
      out.rx = -0.050 * env;
      out.ry = 0.044 * env + pop * 0.058 - catchSnap * 0.024;
      out.rz = 0.020 * env;
      out.rRotX = 0.15 * env + pop * 0.28 - catchSnap * 0.18;
      out.rRotY = 0.58 * env + wag * 0.24;
      out.rRotZ = 0.34 * env + wag * 0.20;
      out.wPosY = pop * 0.040;
      out.wRotZ = pop * 0.26;
      if (isOneHandPistol) {
        out.leftLock = 1 - smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.84, 1.0, t));
        out.spinAngle = -smoothstep(0.16, 0.62, t) * Math.PI * 2;
      }
      if (playAudio) {
        if (t > 0.18 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.16); }
        if (t > 0.56 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.04); }
      }
      return;
    }

    // === LAYER 1: UNIVERSAL SHOWCASE (All weapons — clean skin & StatTrak™ LED showcase!) ===
    if (layer === 'showcase') {
      const env = bell(t, 0.0, 1.0);
      const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.48, 0.64, t));
      const rightSide = smoothstep(0.50, 0.68, t) * (1 - smoothstep(0.84, 1.0, t));
      if (wt === 'katana') {
        out.rx = -0.056 * env;
        out.ry = 0.046 * env;
        out.rz = -0.020 * env;
        out.rRotX = 0.20 * playSide + 0.16 * rightSide;
        out.rRotY = 0.58 * playSide - 0.52 * rightSide;
        out.rRotZ = 0.38 * playSide - 0.44 * rightSide;
        out.leftAnchorOffZ = -0.014 * env;
        if (playAudio && t > 0.12 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.bladeShing(); }
        return;
      }
      if (isOneHandPistol) {
        out.leftLock = 1 - smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
      }
      out.rx = -0.054 * env;
      out.ry = 0.042 * env;
      out.rz = 0.022 * env;
      out.rRotX = 0.13 * playSide + 0.09 * rightSide;
      out.rRotY = 0.80 * playSide - 0.48 * rightSide;
      out.rRotZ = 0.42 * playSide - 0.58 * rightSide;
      out.leftRelOffZ = 0.14 * playSide - 0.18 * rightSide;
      if (playAudio && t > 0.50 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(0.88); }
      return;
    }

    // === LAYER 2: WEAPON-GROUP MECHANICAL CHECK ===
    if (layer === 'group') {
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.82, 1.0, t));
      if (wt === 'katana') {
        // Controlled two-handed edge alignment & poise check
        const lift = smoothstep(0.08, 0.34, t) * (1 - smoothstep(0.68, 0.92, t));
        out.rx = -0.068 * env;
        out.ry = 0.056 * lift;
        out.rz = -0.036 * env;
        out.rRotX = 0.32 * lift;
        out.rRotY = 0.46 * hold;
        out.rRotZ = -0.22 * lift;
        if (playAudio && t > 0.16 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.bladeShing(); }
        return;
      }
      if (wt === 'rifle' || wt === 'famas' || wt === 'scar' || wt === 'honeybadger') {
        // AR Group Check: magazine weight-tug & chamber peek
        const magTug = bell(t, 0.24, 0.54);
        const boltPeek = bell(t, 0.56, 0.80);
        out.rx = -0.048 * env; out.ry = 0.034 * env; out.rz = 0.018 * env;
        out.rRotX = 0.14 * hold; out.rRotY = 0.54 * hold; out.rRotZ = 0.32 * hold - boltPeek * 0.40;
        out.leftAnchorOffY = -0.090 * magTug;
        out.leftAnchorOffZ = (wt === 'famas' ? 0.36 : 0.14) * magTug;
        out.magDropY = -magTug * 0.032;
        out.boltPull = boltPeek * 0.030;
        if (playAudio) {
          if (t > 0.28 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.88); }
          if (t > 0.58 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.06); }
        }
        return;
      }
      if (wt === 'smg' || wt === 'mp7') {
        // SMG Group Check: compact wrist tilt & charging-knob tap
        const tap = bell(t, 0.32, 0.64);
        out.rx = -0.050 * env; out.ry = 0.036 * env; out.rz = 0.020 * env;
        out.rRotX = 0.12 * hold; out.rRotY = 0.68 * hold; out.rRotZ = 0.40 * hold;
        out.leftAnchorOffX = -0.028 * tap;
        out.leftAnchorOffY = 0.046 * tap;
        out.boltPull = tap * 0.032;
        if (playAudio && t > 0.38 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(1.02); }
        return;
      }
      if (wt === 'shotgun' || wt === 'sawedoff' || wt === 'leverslug') {
        // Shotgun / Lever Group Check: breech / chamber port peek
        const peek = bell(t, 0.34, 0.72);
        out.rx = -0.050 * env; out.ry = 0.038 * env; out.rz = 0.018 * env;
        out.rRotX = 0.14 * hold; out.rRotY = 0.64 * hold; out.rRotZ = -0.38 * hold;
        if (wt === 'shotgun') out.pumpPull = peek * 0.042;
        else if (wt === 'sawedoff') out.breechAngle = -peek * 0.34;
        else out.leverAngle = peek * 0.42;
        if (playAudio && t > 0.38 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.92); }
        return;
      }
      if (wt === 'awp' || wt === 'dmr' || wt === 'scout') {
        // Sniper / DMR Group Check: optic turret elevation dial check
        const dial = bell(t, 0.28, 0.68);
        out.rx = -0.048 * env; out.ry = 0.030 * env; out.rz = 0.016 * env;
        out.rRotX = 0.12 * hold; out.rRotY = 0.56 * hold; out.rRotZ = 0.24 * hold;
        out.leftAnchorOffY = 0.088 * dial;
        out.leftAnchorOffZ = 0.14 * dial;
        out.leftRelOffZ = Math.sin(dial * Math.PI * 3) * 0.22;
        if (playAudio && t > 0.36 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.revolverRatchet(2); }
        return;
      }
      if (isOneHandPistol || wt === 'akimbo') {
        // Pistol Group Check: tactical brass press-check
        const press = bell(t, 0.30, 0.68);
        out.rx = -0.046 * env; out.ry = 0.042 * env; out.rz = 0.020 * env;
        out.rRotX = 0.14 * hold; out.rRotY = 0.52 * hold; out.rRotZ = -0.32 * hold;
        if (wt === 'revolver') {
          out.craneOpen = press * 0.45;
        } else {
          out.slideBack = press * 0.022;
          out.leftAnchorOffY = 0.082 * press;
          out.leftAnchorOffZ = -0.035 * press;
        }
        if (playAudio && t > 0.34 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.98); }
        return;
      }
      // Scorestreak heavy ordinance sweep
      out.rx = -0.045 * env; out.ry = 0.030 * env;
      out.rRotY = 0.48 * hold; out.rRotZ = 0.22 * hold;
      return;
    }

    // === LAYER 3: PER-WEAPON SIGNATURE BESPOKE TRICKS ===
    if (wt === 'katana') {
      // Ronin Katana: Authentic two-handed Chiburi blood-flick & blade edge wipe into Chudan guard!
      const env = bell(t, 0.0, 1.0);
      const drawArc = smoothstep(0.04, 0.26, t) * (1 - smoothstep(0.40, 0.52, t));
      const chiburiWhip = bell(t, 0.46, 0.68);
      const poiseSettle = smoothstep(0.66, 0.84, t) * (1 - smoothstep(0.88, 1.0, t));
      out.rx = -0.062 * env + chiburiWhip * 0.095;
      out.ry = 0.052 * env - chiburiWhip * 0.055;
      out.rz = -0.028 * env;
      out.rRotX = 0.22 * drawArc - chiburiWhip * 0.48 + poiseSettle * 0.22;
      out.rRotY = 0.64 * drawArc - chiburiWhip * 0.78 + poiseSettle * 0.28;
      out.rRotZ = 0.46 * drawArc + chiburiWhip * 0.92 - poiseSettle * 0.26;
      out.leftAnchorOffZ = -0.018 * env;
      if (playAudio) {
        if (t > 0.10 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.bladeShing(); }
        if (t > 0.48 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.spinWhoosh(1.26); }
        if (t > 0.76 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.bladeShing(); }
      }
      return;
    }

    if (wt === 'revolver') {
      // R-88 Signature: CS-Style continuous trigger-finger spin (F-spam chainable with spinBonus!) + cylinder glint
      const env = bell(t, 0.0, 1.0);
      const dropLeft = smoothstep(0.0, 0.13, t) * (1 - smoothstep(0.86, 1.0, t));
      out.leftLock = 1 - dropLeft;
      out.leftFreeX = -0.25; out.leftFreeY = -0.34; out.leftFreeZ = -0.34;
      out.leftFreeRotX = 0.26; out.leftFreeRotY = -0.36; out.leftFreeRotZ = 0.34;
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
      out.spinAngle = -spinPhase * (Math.PI * 6 + (state.spinBonus || 0));

      out.rPose.indexRingHook = openGrip * 0.96;
      out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, openGrip);
      out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.12, openGrip);
      out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.14, openGrip);
      out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.18, openGrip);
      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, openGrip);

      if (playAudio) {
        if (t > 0.14 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.26); }
        if (t > 0.40 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.spinWhoosh(1.16); }
        if (t > 0.62 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.spinWhoosh(1.06); }
        if (t > 0.80 && !(state.inspectCueMask & 8)) { state.inspectCueMask |= 8; CaseAudio.balisongClack(0.98); }
      }
      return;
    }

    if (wt === 'deagle') {
      // Deagle .50 Signature: CS2 continuous trigger-finger spin (F-chainable!)
      const env = bell(t, 0.0, 1.0);
      out.leftLock = 1 - smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.86, 1.0, t));
      const spinPhase = smoothstep(0.14, 0.80, t);
      const openGrip = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.86, t));
      const catchBounce = bell(t, 0.78, 0.94);

      out.rx = -0.055 * env; out.ry = 0.052 * env + catchBounce * 0.016; out.rz = 0.025 * env;
      out.rRotX = 0.16 * env - catchBounce * 0.14;
      out.rRotY = 0.44 * env;
      out.rRotZ = 0.18 * env - Math.sin(spinPhase * Math.PI * 2) * 0.14;
      out.spinAngle = -spinPhase * (Math.PI * 4 + (state.spinBonus || 0));

      out.rPose.indexRingHook = openGrip * 0.95;
      out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, openGrip);
      out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.14, openGrip);
      out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.16, openGrip);
      out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.20, openGrip);
      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, openGrip);
      if (playAudio) {
        if (t > 0.16 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.25); }
        if (t > 0.46 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.spinWhoosh(1.12); }
        if (t > 0.80 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.balisongClack(0.95); }
      }
      return;
    }

    if (wt === 'usps') {
      // USP-S Signature: Left hand reaches forward to twist-tighten the tactical suppressor with 2 crisp quarter-turns!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
      const reach = smoothstep(0.14, 0.28, t) * (1 - smoothstep(0.76, 0.88, t));
      const twist = Math.sin(smoothstep(0.28, 0.74, t) * Math.PI * 4) * reach;
      out.rx = -0.044 * env; out.ry = 0.040 * env; out.rz = 0.018 * env;
      out.rRotX = 0.12 * hold; out.rRotY = 0.58 * hold; out.rRotZ = 0.26 * hold + twist * 0.08;
      out.leftAnchorOffX = 0.012 * reach;
      out.leftAnchorOffY = 0.080 * reach;
      out.leftAnchorOffZ = -0.220 * reach;
      out.leftRelOffZ = -0.45 * reach + twist * 0.78;
      out.lPose.shellPinch = reach * 0.85;
      if (playAudio) {
        if (t > 0.34 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.revolverRatchet(1); }
        if (t > 0.58 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; WeaponAudio.revolverRatchet(1); }
      }
      return;
    }

    if (wt === 'g18') {
      // G-18 Signature: Thumb flicks the full-auto "giggle-switch" on the rear slide back & forth + playful wag!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.82, 1.0, t));
      const flick1 = bell(t, 0.24, 0.40);
      const flick2 = bell(t, 0.44, 0.60);
      const wag = Math.sin(smoothstep(0.62, 0.88, t) * Math.PI * 3) * bell(t, 0.60, 0.90);
      out.leftLock = 1 - hold;
      out.rx = -0.052 * env; out.ry = 0.046 * env; out.rz = 0.022 * env;
      out.rRotX = 0.16 * hold; out.rRotY = 0.68 * hold + wag * 0.22; out.rRotZ = -0.34 * hold + (flick1 - flick2) * 0.10 + wag * 0.24;
      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.24, Math.max(flick1, flick2));
      if (playAudio) {
        if (t > 0.28 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(1.22); }
        if (t > 0.48 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.32); }
      }
      return;
    }

    if (wt === 'akimbo') {
      // Dual VX Akimbo Signature: Synchronized twin cowboy gun twirls!
      const env = bell(t, 0.0, 1.0);
      const spinPhase = smoothstep(0.14, 0.82, t);
      const catchPop = bell(t, 0.78, 0.96);
      out.rx = 0; out.ry = 0.042 * env + catchPop * 0.018; out.rz = 0.020 * env;
      out.rRotX = 0.14 * env - catchPop * 0.14;
      out.akimboSpin = -spinPhase * Math.PI * 4;
      const openGrip = smoothstep(0.08, 0.18, t) * (1 - smoothstep(0.76, 0.86, t));
      out.rPose.indexRingHook = openGrip * 0.92;
      out.lPose.indexRingHook = openGrip * 0.92;
      if (playAudio) {
        if (t > 0.16 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.22); }
        if (t > 0.50 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.spinWhoosh(1.12); }
        if (t > 0.80 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.balisongClack(1.06); }
      }
      return;
    }

    if (wt === 'pistol') {
      // USP-9 Signature: Crisp one-handed flip-spin & slide press-check
      const env = bell(t, 0.0, 1.0);
      out.leftLock = 1 - smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.84, 1.0, t));
      const spinPhase = smoothstep(0.14, 0.54, t);
      const catchSnap = bell(t, 0.52, 0.68);
      out.rx = -0.052 * env; out.ry = 0.046 * env + catchSnap * 0.014; out.rz = 0.022 * env;
      out.rRotX = 0.14 * env - catchSnap * 0.12;
      out.rRotY = 0.54 * env; out.rRotZ = 0.24 * env;
      out.spinAngle = -spinPhase * Math.PI * 2;
      if (playAudio) {
        if (t > 0.18 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.16); }
        if (t > 0.54 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.02); }
      }
      return;
    }

    if (wt === 'leverslug') {
      // LV-45 Signature: Terminator-style lever-loop spin flip!
      const env = bell(t, 0.0, 1.0);
      const dropL = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.90, t));
      const flipSpin = smoothstep(0.18, 0.72, t);
      const catchPop = bell(t, 0.70, 0.88);
      out.leftLock = 1 - dropL;
      out.rx = -0.046 * env; out.ry = 0.048 * env + catchPop * 0.020; out.rz = 0.024 * env;
      out.rRotX = 0.16 * env - catchPop * 0.16;
      out.rRotY = 0.42 * env; out.rRotZ = 0.18 * env;
      out.spinAngle = -flipSpin * Math.PI * 2;
      out.leverAngle = bell(t, 0.16, 0.74) * 1.15;
      if (playAudio) {
        if (t > 0.20 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(1.18); }
        if (t > 0.68 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; WeaponAudio.pumpRack(); }
      }
      return;
    }

    if (wt === 'sawedoff') {
      // DB-12 Signature: One-handed break-open chamber brass peek + snappy wrist-whip shut!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
      const snap = bell(t, 0.68, 0.88);
      out.leftLock = 1 - smoothstep(0.04, 0.16, t) * (1 - smoothstep(0.80, 0.94, t));
      out.rx = -0.050 * env; out.ry = 0.040 * env; out.rz = 0.020 * env;
      out.rRotX = 0.12 * hold + snap * 0.36;
      out.rRotY = 0.62 * hold; out.rRotZ = 0.30 * hold - snap * 0.16;
      out.breechAngle = -0.74 * smoothstep(0.14, 0.30, t) * (1 - smoothstep(0.68, 0.78, t));
      if (playAudio) {
        if (t > 0.16 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.86); }
        if (t > 0.72 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; WeaponAudio.pumpRack(); }
      }
      return;
    }

    if (wt === 'shotgun') {
      // M870 Signature: Half-rack brass chamber peek & crisp pump snap!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.82, 1.0, t));
      const checkPump = bell(t, 0.30, 0.74);
      out.rx = -0.052 * env; out.ry = 0.038 * env; out.rz = 0.018 * env;
      out.rRotX = 0.14 * hold; out.rRotY = 0.62 * hold; out.rRotZ = -0.44 * hold;
      out.pumpPull = checkPump * 0.062;
      if (playAudio && t > 0.34 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.pumpRack(); }
      return;
    }

    if (wt === 'awp' || wt === 'scout') {
      // AWP: Precision bolt-lift brass check | SSG-08 Scout: Featherweight quick-balance toss + crisp bolt click!
      const env = bell(t, 0.0, 1.0);
      const holdTilt = smoothstep(0.0, 0.20, t) * (1 - smoothstep(0.82, 1.0, t));
      const toss = wt === 'scout' ? bell(t, 0.12, 0.38) : 0;
      const handOff = smoothstep(wt === 'scout' ? 0.38 : 0.16, wt === 'scout' ? 0.48 : 0.28, t) * (1 - smoothstep(0.76, 0.88, t));
      const boltLift = smoothstep(wt === 'scout' ? 0.42 : 0.20, wt === 'scout' ? 0.54 : 0.34, t) * (1 - smoothstep(0.70, 0.82, t));
      const boltPull = smoothstep(wt === 'scout' ? 0.52 : 0.32, wt === 'scout' ? 0.62 : 0.48, t) * (1 - smoothstep(0.64, 0.74, t));

      out.rx = -0.045 * env; out.ry = 0.032 * env + toss * 0.045; out.rz = 0.015 * env;
      out.rRotX = 0.14 * holdTilt + toss * 0.22;
      out.rRotY = 0.52 * holdTilt;
      out.rRotZ = -0.34 * holdTilt - boltLift * 0.08;
      out.wPosY = toss * 0.028;
      applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);
      if (playAudio) {
        if (wt === 'scout' && t > 0.14 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.spinWhoosh(1.18); }
        if (t > (wt === 'scout' ? 0.46 : 0.28) && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.84); }
        if (t > 0.68 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.06); }
      }
      return;
    }

    if (wt === 'dmr') {
      // MK-14 Signature: Precision turret twist + right-side op-rod snap check!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.82, 1.0, t));
      const handOff = smoothstep(0.38, 0.50, t) * (1 - smoothstep(0.74, 0.86, t));
      const rack = bell(t, 0.48, 0.72);
      out.rx = -0.048 * env; out.ry = 0.034 * env; out.rz = 0.018 * env;
      out.rRotX = 0.12 * hold; out.rRotY = 0.58 * hold; out.rRotZ = -0.34 * hold;
      applyV47RightHandRack(out, spec, handOff, rack * 0.78);
      if (playAudio && t > 0.50 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.boltRack(); }
      return;
    }

    if (wt === 'honeybadger') {
      // HB-7 Signature: Left hand taps the integrated suppressor -> "OUCH! HOT!" rapid hand shake-off flourish!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.82, 1.0, t));
      const touch = bell(t, 0.16, 0.38);
      const shakeEnv = smoothstep(0.36, 0.44, t) * (1 - smoothstep(0.74, 0.88, t));
      const ouchWave = Math.sin(t * Math.PI * 18) * shakeEnv;

      out.rx = -0.048 * env; out.ry = 0.036 * env; out.rz = 0.020 * env;
      out.rRotX = 0.12 * hold; out.rRotY = 0.62 * hold; out.rRotZ = 0.34 * hold;
      out.leftAnchorOffX = -0.022 * touch - 0.095 * shakeEnv + ouchWave * 0.025;
      out.leftAnchorOffY = 0.018 * touch + 0.042 * shakeEnv + Math.abs(ouchWave) * 0.022;
      out.leftAnchorOffZ = -0.145 * touch + 0.060 * shakeEnv;
      out.leftRelOffZ = ouchWave * 0.65;
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.10, shakeEnv);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.12, shakeEnv);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.14, shakeEnv);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.16, shakeEnv);
      if (playAudio) {
        if (t > 0.28 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(1.30); }
        if (t > 0.44 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.spinWhoosh(1.28); }
      }
      return;
    }

    if (wt === 'famas') {
      // F-33 Signature: Cheeky double drum-tap on the iconic top carry handle + bullpup rear mag tap!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
      const tap1 = bell(t, 0.22, 0.34);
      const tap2 = bell(t, 0.36, 0.48);
      const rearTap = bell(t, 0.54, 0.76);
      out.rx = -0.050 * env; out.ry = 0.036 * env - (tap1 + tap2) * 0.008; out.rz = 0.020 * env;
      out.rRotX = 0.12 * hold; out.rRotY = 0.64 * hold; out.rRotZ = 0.34 * hold;
      out.leftAnchorOffY = (tap1 + tap2) * 0.095 - rearTap * 0.088;
      out.leftAnchorOffZ = (tap1 + tap2) * 0.18 + rearTap * 0.38;
      if (playAudio) {
        if (t > 0.27 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(1.18); }
        if (t > 0.41 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.26); }
        if (t > 0.64 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.balisongClack(0.92); }
      }
      return;
    }

    if (wt === 'scar' || wt === 'smg' || wt === 'mp7') {
      // SC-20 / VX-9 / MP-7 Signature: Charging-handle flick / slap + snappy receiver tilt!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.82, 1.0, t));
      const boltPeek = bell(t, 0.24, 0.56);
      const wag = bell(t, 0.58, 0.84);
      out.rx = -0.052 * env; out.ry = 0.036 * env; out.rz = 0.020 * env;
      out.rRotX = 0.13 * hold; out.rRotY = 0.72 * hold - wag * 0.96; out.rRotZ = 0.36 * hold - wag * 0.72;
      out.leftAnchorOffX = -boltPeek * 0.032;
      out.leftAnchorOffY = boltPeek * 0.052;
      out.leftAnchorOffZ = boltPeek * (wt === 'mp7' ? 0.18 : 0.056);
      out.boltPull = boltPeek * 0.044;
      if (playAudio && t > 0.30 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.boltRack(); }
      return;
    }

    if (wt === 'rpg' || wt === 'minigun' || wt === 'railcannon' || wt === 'grenadelauncher') {
      // Scorestreak Signatures: RPG warhead double-tap, Minigun manual barrel crank, Railcannon coil surge, MGL-6 drum free-spin!
      const env = bell(t, 0.0, 1.0);
      const hold = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.82, 1.0, t));
      out.rx = -0.044 * env; out.ry = 0.032 * env; out.rz = 0.016 * env;
      out.rRotX = 0.10 * hold; out.rRotY = 0.52 * hold; out.rRotZ = 0.24 * hold;
      if (wt === 'rpg') {
        const tap1 = bell(t, 0.26, 0.40);
        const tap2 = bell(t, 0.44, 0.58);
        out.leftAnchorOffY = (tap1 + tap2) * 0.055;
        out.leftAnchorOffZ = -(tap1 + tap2) * 0.14;
        if (playAudio) {
          if (t > 0.32 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.76); }
          if (t > 0.50 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(0.80); }
        }
      } else if (wt === 'minigun') {
        const crank = smoothstep(0.22, 0.78, t);
        out.minigunSpinAngle = (out.minigunSpinAngle || 0) + crank * Math.PI * 6;
        if (playAudio && t > 0.26 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.revolverCylinderSpin(1.1); }
      } else if (wt === 'grenadelauncher') {
        const spin = smoothstep(0.22, 0.78, t);
        out.drumAngle = (out.drumAngle || 0) + spin * Math.PI * 4;
        if (playAudio && t > 0.26 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; WeaponAudio.revolverCylinderSpin(0.95); }
      }
      return;
    }

    // V-47 AK-47 Signature: Banana-mag rock-out peek & right-side charging-handle rack click!
    const env = bell(t, 0.0, 1.0);
    const tilt = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.84, 1.0, t));
    const magPhase = smoothstep(0.16, 0.32, t) * (1 - smoothstep(0.42, 0.52, t));
    const handOff = smoothstep(0.52, 0.62, t) * (1 - smoothstep(0.78, 0.90, t));
    const rackPull = bell(t, 0.58, 0.80);

    out.rx = -0.048 * env; out.ry = 0.038 * env; out.rz = 0.018 * env;
    out.rRotX = 0.14 * tilt;
    out.rRotY = 0.58 * tilt - rackPull * 0.22;
    out.rRotZ = 0.28 * magPhase - 0.40 * tilt;

    const toMag = smoothstep(0.10, 0.22, t) * (1 - smoothstep(0.48, 0.56, t));
    out.leftAnchorOffX = 0.014 * toMag;
    out.leftAnchorOffY = -0.105 * toMag - magPhase * 0.045;
    out.leftAnchorOffZ = 0.135 * toMag;
    out.leftRelOffX = -0.22 * toMag;
    out.leftRelOffY = 0.18 * toMag;
    out.leftRelOffZ = -0.35 * toMag;
    out.magDropY = -magPhase * 0.046;
    out.magTiltX = -magPhase * 0.22;

    applyV47RightHandRack(out, spec, handOff, rackPull * 0.88);

    if (playAudio) {
      if (t > 0.24 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.balisongClack(0.86); }
      if (t > 0.48 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; CaseAudio.balisongClack(1.12); }
      if (t > 0.64 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; WeaponAudio.boltRack(); }
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
    const isBoltRifle = wt === 'awp' || wt === 'scout';
    const boltPull = (wOut ? wOut.boltPull : 0) + (isBoltRifle ? (wOut && wOut.boltPull > 0 ? 0 : boltCycleArc * 0.056) : slideKick * 0.048);
    const boltLift = (wOut ? wOut.boltLift : 0) + (isBoltRifle ? (wOut && wOut.boltLift > 0 ? 0 : boltCycleArc) : 0);

    if (mesh.userData.boltGroup && mesh.userData.boltRestPos) {
      const rp = mesh.userData.boltRestPos;
      mesh.userData.boltGroup.position.set(rp.x, rp.y, rp.z + boltPull);
      mesh.userData.boltGroup.rotation.z = isBoltRifle ? boltLift * 0.92 : 0;
    }
    if (mesh.userData.leverGroup) {
      mesh.userData.leverGroup.rotation.x = wOut && Number.isFinite(wOut.leverAngle) ? wOut.leverAngle : 0;
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
        const aSpin = wOut && Number.isFinite(wOut.akimboSpin) ? wOut.akimboSpin : 0;
        mesh.userData.akimboRight.position.set(0, 0, rKick * 0.048);
        mesh.userData.akimboRight.rotation.set(rKick * 0.24 + aSpin, 0, 0);
        mesh.userData.akimboLeft.position.set(-0.27, 0, lKick * 0.048);
        mesh.userData.akimboLeft.rotation.set(lKick * 0.24 + aSpin, 0, 0);
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
