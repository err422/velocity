// Procedural 3D firearm models and modular 3D Gunsmith attachments.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { createWeaponMaterial, projectWeaponMeshUVs } = VI;
  // ---------- CS:S-Faceted x CS2-Silhouette 3D Firearm Models + Modular 3D Gunsmith Attachments ----------
  const SCORESTREAK_WEAPON_TYPES = { rpg: true, minigun: true, railcannon: true, grenadelauncher: true };

  function buildWeaponModel(weaponItem, targetRenderer, attachments) {
    const rawWt = weaponItem && weaponItem.weaponType;
    const isScorestreak = Boolean(rawWt && SCORESTREAK_WEAPON_TYPES[rawWt]);
    const item = KS.sanitizeWeaponItem(
      isScorestreak ? Object.assign({}, weaponItem, { weaponType: 'rifle' }) : (weaponItem || KS.createStarterWeapon('rifle'))
    );
    const wt = isScorestreak ? rawWt : item.weaponType;
    const atts = (isScorestreak || wt === 'katana' || wt === 'akimbo')
      ? {}
      : (attachments && typeof attachments === 'object' ? attachments : {});
    const g = new THREE.Group();

    const skinMat = createWeaponMaterial(item, targetRenderer);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a212a, roughness: 0.40, metalness: 0.80 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2f3b49, roughness: 0.32, metalness: 0.88 });
    const brightSteel = new THREE.MeshStandardMaterial({ color: 0x7a8fa3, roughness: 0.24, metalness: 0.92 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc59b45, roughness: 0.28, metalness: 0.86 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x12171e, roughness: 0.84, metalness: 0.10 });
    const scopeLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f82c8,
      emissive: 0x0b3658,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    const accentGlow = new THREE.MeshBasicMaterial({ color: 0x65e7ff });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.92, depthWrite: false });

    // Helper: extrudes a 2D side-profile (shapeX -> +Z rear / -Z front, shapeY -> +Y) symmetrically across X
    function makeSideExtrude(shape, thickness, bevel, mat, uvBounds) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel * 0.85,
        bevelSegments: 1
      });
      geo.translate(0, 0, -thickness * 0.5);
      geo.rotateY(-Math.PI / 2);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      if (uvBounds) projectWeaponMeshUVs(mesh, uvBounds);
      return mesh;
    }

    function makeSkinned(mesh, uvBounds) {
      if (uvBounds) projectWeaponMeshUVs(mesh, uvBounds);
      return mesh;
    }

    const addFlash = (parentGrp, yPos, zPos, scale) => {
      const fg = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.036 * scale, 0), flashMat);
      s1.scale.set(1.2, 1.2, 2.2);
      const s2 = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.028 * scale, 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })
      );
      s2.rotation.z = Math.PI / 4;
      s2.scale.set(1.6, 0.35, 1.4);
      fg.add(s1, s2);
      fg.position.set(0, yPos, zPos);
      fg.visible = false;
      parentGrp.add(fg);
      g.userData.muzzleFlash = fg;
    };

    // Per-weapon descriptor populated by each firearm branch so every attachment mounts flush
    const wpn = {
      uvBounds: { minZ: -0.52, maxZ: 0.34, minY: -0.15, maxY: 0.11 },
      attachParent: g,
      opticRail: null,
      barrelRoot: null,
      underRail: null,
      magWell: null,
      stockMount: null,
      gripSpec: null,
      ironEyePoint: [0, 0.060, -0.02],
      defaultStockGroup: null,
      defaultBarrelGroup: null,
      defaultMuzzleGroup: null,
      defaultMagMeshGroup: null,
      defaultGripGroup: null,
      defaultIronsGroup: null,
      defaultScopeGroup: null,
      defaultBipodGroup: null
    };

    if (wt === 'awp') {
      const uvBounds = { minZ: -0.68, maxZ: 0.35, minY: -0.11, maxY: 0.12 };
      wpn.uvBounds = uvBounds;

      // 1) Arctic Warfare forward polymer chassis (stops cleanly at z = 0.092 so rear stock swaps without clipping)
      const chassisShape = new THREE.Shape();
      chassisShape.moveTo(0.092, 0.038);
      chassisShape.lineTo(0.068, 0.044);
      chassisShape.lineTo(-0.425, 0.042);
      chassisShape.lineTo(-0.445, 0.024);
      chassisShape.lineTo(-0.420, -0.008);
      chassisShape.lineTo(-0.125, -0.012);
      chassisShape.lineTo(-0.115, -0.022);
      chassisShape.lineTo(-0.028, -0.022);
      chassisShape.lineTo(0.018, -0.014);
      chassisShape.lineTo(0.038, -0.088);
      chassisShape.lineTo(0.082, -0.094);
      chassisShape.lineTo(0.096, -0.056);
      chassisShape.lineTo(0.092, 0.038);
      chassisShape.closePath();
      g.add(makeSideExtrude(chassisShape, 0.040, 0.0034, skinMat, uvBounds));

      // 2) Swappable default thumbhole buttstock + buttpad + cheek-riser
      const defaultStockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.086, 0.038);
      stockShape.lineTo(0.325, 0.036);
      stockShape.lineTo(0.325, -0.072);
      stockShape.lineTo(0.300, -0.038);
      stockShape.lineTo(0.260, -0.038);
      stockShape.lineTo(0.240, -0.054);
      stockShape.lineTo(0.122, -0.058);
      stockShape.lineTo(0.086, -0.068);
      stockShape.closePath();

      const thumbhole = new THREE.Path();
      thumbhole.moveTo(0.104, 0.010);
      thumbhole.lineTo(0.228, 0.008);
      thumbhole.lineTo(0.236, -0.032);
      thumbhole.lineTo(0.108, -0.038);
      thumbhole.lineTo(0.096, -0.018);
      thumbhole.closePath();
      stockShape.holes.push(thumbhole);

      defaultStockGroup.add(makeSideExtrude(stockShape, 0.040, 0.0034, skinMat, uvBounds));
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.110, 0.022), gripMat);
      buttpad.position.set(0, -0.017, 0.336);
      const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.019, 0.118), gripMat);
      cheekRiser.position.set(0, 0.046, 0.198);
      defaultStockGroup.add(buttpad, cheekRiser);
      g.add(defaultStockGroup);
      g.userData.defaultStockGroup = defaultStockGroup;
      wpn.defaultStockGroup = defaultStockGroup;

      // 3) Swappable recessed rubber grip panels on pistol grip
      const defaultGripGroup = new THREE.Group();
      const gripPanel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.068, 0.034), gripMat);
      gripPanel.position.set(0, -0.052, 0.058);
      gripPanel.rotation.x = 0.24;
      defaultGripGroup.add(gripPanel);
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      // 4) Upper steel receiver housing + right-side (+X) ejection port cutout & chamber
      const upperRec = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.215), darkMetal);
      upperRec.position.set(0, 0.048, -0.045);
      g.add(upperRec);
      const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.066), gripMat);
      ejectPort.position.set(0.0185, 0.049, -0.032);
      const ejectChamber = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.010, 0.042), brightSteel);
      ejectChamber.position.set(0.0165, 0.049, -0.032);
      g.add(ejectPort, ejectChamber);

      // Removable .338 Lapua box magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.072, 0.074), darkMetal);
      magBody.position.set(0, -0.048, -0.072);
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.010, 0.080), gunmetal);
      magPlate.position.set(0, -0.084, -0.072);
      defaultMagMeshGroup.add(magBody, magPlate);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // Open-loop trigger guard + curved trigger
      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.052), darkMetal);
      tgBottom.position.set(0, -0.032, 0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), darkMetal);
      tgFront.position.set(0, -0.021, -0.021);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.020, 0.010);
      trigger.rotation.x = 0.25;
      g.add(tgBottom, tgFront, trigger);

      // Swappable heavy fluted free-floating barrel (y = 0.046, z = -0.155..-0.735)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0148, 0.58, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.046, -0.445);
      defaultBarrelGroup.add(barrel);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Swappable multi-baffle rectangular muzzle brake (aligned on y = 0.046)
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.026, 0.068), darkMetal);
      brake.position.set(0, 0.046, -0.766);
      defaultMuzzleGroup.add(brake);
      for (const bz of [-0.747, -0.769, -0.789]) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.010), gripMat);
        baffle.position.set(0, 0.046, bz);
        defaultMuzzleGroup.add(baffle);
      }
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // Swappable folded under-forend tactical bipod (hidden if underbarrel grip equipped)
      const defaultBipodGroup = new THREE.Group();
      const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.030), darkMetal);
      bipodMount.position.set(0, -0.014, -0.405);
      defaultBipodGroup.add(bipodMount);
      for (const bx of [-0.017, 0.017]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0062, 0.195, 6), darkMetal);
        leg.rotation.x = Math.PI / 2 - 0.05;
        leg.position.set(bx, -0.021, -0.305);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0072, 0.018, 6), gripMat);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(bx, -0.025, -0.205);
        defaultBipodGroup.add(leg, foot);
      }
      g.add(defaultBipodGroup);
      wpn.defaultBipodGroup = defaultBipodGroup;

      // Full top Picatinny rail (always present, top surface y = 0.069)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.215), darkMetal);
      rail.position.set(0, 0.064, -0.052);
      g.add(rail);

      // Swappable iconic dual-ring elevated faceted sniper scope (skin-mapped outer housing + tactical clamps/lenses)
      const defaultScopeGroup = new THREE.Group();
      for (const rz of [0.015, -0.115]) {
        const ringBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.020, 0.020), darkMetal);
        ringBase.position.set(0, 0.077, rz);
        const ringClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.020, 10), gunmetal);
        ringClamp.rotation.x = Math.PI / 2;
        ringClamp.position.set(0, 0.094, rz);
        defaultScopeGroup.add(ringBase, ringClamp);
      }
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.25, 10), skinMat);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.094, -0.055);
      makeSkinned(scopeTube, uvBounds);
      const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.016, 0.088, 10), skinMat);
      scopeBell.rotation.x = Math.PI / 2;
      scopeBell.position.set(0, 0.094, -0.218);
      makeSkinned(scopeBell, uvBounds);
      const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.016, 0.064, 10), darkMetal);
      scopeEye.rotation.x = Math.PI / 2;
      scopeEye.position.set(0, 0.094, 0.095);
      const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 8), gunmetal);
      turretTop.position.set(0, 0.114, -0.052);
      const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.014, 8), gunmetal);
      turretSide.rotation.z = Math.PI / 2;
      turretSide.position.set(0.020, 0.094, -0.052);
      const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 10), scopeLensMat);
      rearLens.position.set(0, 0.094, 0.128);
      const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), scopeLensMat);
      frontLens.rotation.y = Math.PI;
      frontLens.position.set(0, 0.094, -0.263);
      defaultScopeGroup.add(scopeTube, scopeBell, scopeEye, turretTop, turretSide, rearLens, frontLens);
      g.add(defaultScopeGroup);
      wpn.defaultScopeGroup = defaultScopeGroup;

      // Animated right-side (+X) bolt-action receiver cylinder + bent bolt stem + oversized tactical knob
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.022, 0.048, 0.036);
      const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.062, 8), brightSteel);
      boltBody.rotation.x = Math.PI / 2;
      boltBody.position.set(-0.012, 0, -0.022);
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.040, 8), gunmetal);
      boltStem.rotation.z = -Math.PI / 2.25;
      boltStem.position.set(0.016, -0.005, 0);
      const boltKnob = new THREE.Mesh(new THREE.OctahedronGeometry(0.0115, 1), darkMetal);
      boltKnob.position.set(0.036, -0.011, 0);
      boltGroup.add(boltBody, boltStem, boltKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.022, 0.048, 0.036);

      addFlash(g, 0.046, -0.82, 1.48);

      wpn.opticRail = { x: 0, y: 0.069, z: -0.045, parent: g, width: 0.024, rearIronZ: 0.038 };
      wpn.barrelRoot = { y: 0.046, rootZ: -0.155, shroudEndZ: -0.432, defaultTipZ: -0.735, radius: 0.0125, isSniper: true };
      wpn.underRail = { x: 0, y: -0.010, z: -0.285, parent: g, laserPos: [0.025, 0.022, -0.375] };
      wpn.magWell = { x: 0, y: -0.022, z: -0.072, rotX: 0, width: 0.030, depth: 0.074, bottomY: -0.084, bottomZ: -0.072 };
      wpn.stockMount = { x: 0, y: 0.006, z: 0.092, faceW: 0.038, faceH: 0.074 };
      wpn.gripSpec = { isPanel: true, pos: [0, -0.052, 0.058], size: [0.046, 0.068, 0.035], rotX: 0.24 };
      wpn.apexMount = { x: -0.022, y: 0.028, z: -0.205, parent: g, scale: 1.0 };
      wpn.ironEyePoint = [0, 0.094, 0.128];

    } else if (wt === 'deagle') {
      const uvBounds = { minZ: -0.30, maxZ: 0.085, minY: -0.135, maxY: 0.085 };
      wpn.uvBounds = uvBounds;

      // Wrap entire Deagle around spinPivot centered INSIDE the open trigger guard loop!
      const spinPivotPos = new THREE.Vector3(0, -0.016, -0.026);
      const spinGroup = new THREE.Group();
      spinGroup.position.copy(spinPivotPos);
      g.add(spinGroup);

      const modelRoot = new THREE.Group();
      modelRoot.position.copy(spinPivotPos).negate();
      spinGroup.add(modelRoot);

      g.userData.spinGroup = spinGroup;
      g.userData.spinPivot = spinPivotPos;
      wpn.attachParent = modelRoot;

      // 1) Iconic heavy triangular-beveled Desert Eagle fixed front barrel shroud
      const shroudSec = new THREE.Shape();
      shroudSec.moveTo(-0.0175, 0.016);
      shroudSec.lineTo(0.0175, 0.016);
      shroudSec.lineTo(0.0195, 0.036);
      shroudSec.lineTo(0.0110, 0.064);
      shroudSec.lineTo(-0.0110, 0.064);
      shroudSec.lineTo(-0.0195, 0.036);
      shroudSec.closePath();

      const shroudGeo = new THREE.ExtrudeGeometry(shroudSec, {
        depth: 0.172,
        bevelEnabled: true,
        bevelThickness: 0.0025,
        bevelSize: 0.0018,
        bevelSegments: 1
      });
      shroudGeo.translate(0, 0, -0.204);
      shroudGeo.computeVertexNormals();
      const shroudMesh = makeSkinned(new THREE.Mesh(shroudGeo, skinMat), uvBounds);
      modelRoot.add(shroudMesh);

      // Top Weaver rail cross-slots along fixed barrel shroud (top y = 0.0665)
      for (const rz of [-0.176, -0.146, -0.116, -0.086]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.009), darkMetal);
        slot.position.set(0, 0.065, rz);
        modelRoot.add(slot);
      }

      // Swappable default .50 AE muzzle crown + dark bore (aligned on true bore y = 0.042, z = -0.208)
      const defaultBarrelGroup = new THREE.Group();
      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.010, 10), gunmetal);
      muzzleRing.rotation.x = Math.PI / 2;
      muzzleRing.position.set(0, 0.042, -0.208);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0076, 0.0076, 0.012, 8), gripMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(0, 0.042, -0.209);
      defaultBarrelGroup.add(muzzleRing, bore);
      modelRoot.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Front dovetail ramped iron sight + glowing tritium dot
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.012, 0.016), darkMetal);
      frontSight.position.set(0, 0.070, -0.188);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0035, 0.003), accentGlow);
      frontDot.position.set(0, 0.072, -0.179);
      modelRoot.add(frontSight, frontDot);

      // 2) Reciprocating rear slide (authentic Desert Eagle rear-slide split)
      const slideGroup = new THREE.Group();
      const slideSec = new THREE.Shape();
      slideSec.moveTo(-0.0185, 0.018);
      slideSec.lineTo(0.0185, 0.018);
      slideSec.lineTo(0.0195, 0.040);
      slideSec.lineTo(0.0125, 0.064);
      slideSec.lineTo(-0.0125, 0.064);
      slideSec.lineTo(-0.0195, 0.040);
      slideSec.closePath();

      const slideGeo = new THREE.ExtrudeGeometry(slideSec, {
        depth: 0.088,
        bevelEnabled: true,
        bevelThickness: 0.0022,
        bevelSize: 0.0015,
        bevelSegments: 1
      });
      slideGeo.translate(0, 0, -0.032);
      slideGeo.computeVertexNormals();
      const slideMesh = makeSkinned(new THREE.Mesh(slideGeo, skinMat), uvBounds);
      slideGroup.add(slideMesh);

      // Right-side (+X) ejection port cutout & exposed brass chamber
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.034), gripMat);
      ejCut.position.set(0.0175, 0.048, -0.014);
      const chamberBrass = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 0.028, 8), brassMat);
      chamberBrass.rotation.x = Math.PI / 2;
      chamberBrass.position.set(0.012, 0.046, -0.014);
      slideGroup.add(ejCut, chamberBrass);

      // Rear slide cocking serrations + ambidextrous safety levers
      for (let i = 0; i < 6; i++) {
        const ser = new THREE.Mesh(new THREE.BoxGeometry(0.041, 0.022, 0.0035), darkMetal);
        ser.position.set(0, 0.036, 0.010 + i * 0.0075);
        ser.rotation.x = 0.20;
        slideGroup.add(ser);
      }
      const safety = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.0075, 0.016), gunmetal);
      safety.position.set(0, 0.052, 0.042);
      slideGroup.add(safety);

      // Rear combat sights with twin glowing tritium dots
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.0065, 0.010, 0.010), darkMetal);
      rearL.position.set(-0.0095, 0.069, 0.044);
      const rearR = rearL.clone();
      rearR.position.x = 0.0095;
      const dotL = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0032, 0.003), accentGlow);
      dotL.position.set(-0.0095, 0.070, 0.050);
      const dotR = dotL.clone();
      dotR.position.x = 0.0095;
      slideGroup.add(rearL, rearR, dotL, dotR);

      modelRoot.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // 3) Exposed animated hammer at rear beavertail
      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.024, 0.054);
      const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.0085, 0.022, 0.012), gunmetal);
      hammerSpur.position.set(0, 0.010, 0.006);
      hammerSpur.rotation.x = -0.35;
      hammerGroup.add(hammerSpur);
      modelRoot.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      // 4) Sculpted lower frame + pronounced beavertail + genuine OPEN-LOOP squared combat trigger guard
      const frameShape = new THREE.Shape();
      frameShape.moveTo(0.074, 0.020);
      frameShape.lineTo(-0.184, 0.020);
      frameShape.lineTo(-0.172, -0.001);
      frameShape.lineTo(-0.056, -0.001);
      frameShape.lineTo(-0.054, -0.036);
      frameShape.lineTo(-0.004, -0.036);
      frameShape.lineTo(0.002, -0.012);
      frameShape.lineTo(0.018, -0.104);
      frameShape.lineTo(0.068, -0.098);
      frameShape.lineTo(0.052, 0.005);
      frameShape.closePath();

      const tgHole = new THREE.Path();
      tgHole.moveTo(-0.046, -0.006);
      tgHole.lineTo(-0.006, -0.006);
      tgHole.lineTo(-0.008, -0.028);
      tgHole.lineTo(-0.046, -0.028);
      tgHole.closePath();
      frameShape.holes.push(tgHole);

      const frameMesh = makeSideExtrude(frameShape, 0.030, 0.0024, darkMetal, null);
      modelRoot.add(frameMesh);

      // Left-side (-X) slide-release lever for right-hand thumb
      const slideRelease = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.028), gunmetal);
      slideRelease.position.set(-0.018, 0.015, -0.012);
      modelRoot.add(slideRelease);

      // Curved Deagle trigger inside open loop
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.019, 0.006), brightSteel);
      trigger.position.set(0, -0.014, -0.016);
      trigger.rotation.x = 0.28;
      modelRoot.add(trigger);

      // Swappable wrap-around ergonomic rubber grip panels
      const defaultGripGroup = new THREE.Group();
      const gripWrap = new THREE.Mesh(new THREE.BoxGeometry(0.0355, 0.086, 0.044), gripMat);
      gripWrap.position.set(0, -0.052, 0.032);
      gripWrap.rotation.x = 0.24;
      defaultGripGroup.add(gripWrap);
      modelRoot.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      // Removable .50 AE magazine & chamfered baseplate (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.013, 0.047), gunmetal);
      magBase.position.set(0, -0.102, 0.044);
      magBase.rotation.x = 0.24;
      const magShaft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.072, 0.036), darkMetal);
      magShaft.position.set(0, -0.062, 0.035);
      magShaft.rotation.x = 0.24;
      defaultMagMeshGroup.add(magShaft, magBase);
      magGroup.add(defaultMagMeshGroup);
      modelRoot.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      addFlash(modelRoot, 0.042, -0.238, 1.22);

      // Fixed front Weaver rail optic mount (does not ride reciprocating slide!), true bore y = 0.042
      wpn.opticRail = { x: 0, y: 0.066, z: -0.126, parent: modelRoot, width: 0.020, isCompact: true };
      wpn.barrelRoot = { y: 0.042, rootZ: -0.203, shroudEndZ: -0.203, defaultTipZ: -0.212, radius: 0.0115, isPistol: true };
      wpn.underRail = { x: 0, y: -0.002, z: -0.122, parent: modelRoot, isPistolRail: true, laserPos: [0, -0.012, -0.122] };
      wpn.magWell = { x: 0, y: -0.098, z: 0.042, rotX: 0.24, width: 0.027, depth: 0.040, bottomY: -0.104, bottomZ: 0.045, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = { isPanel: true, pos: [0, -0.052, 0.032], size: [0.037, 0.086, 0.045], rotX: 0.24 };
      wpn.apexMount = { x: -0.017, y: 0.012, z: -0.105, parent: modelRoot, scale: 0.72 };
      wpn.ironEyePoint = [0, 0.071, 0.044];

    } else if (wt === 'revolver') {
      const uvBounds = { minZ: -0.32, maxZ: 0.095, minY: -0.140, maxY: 0.090 };
      wpn.uvBounds = uvBounds;

      // Wrap entire R-88 Magnum around spinPivot centered INSIDE the open trigger guard loop for authentic CS twirls!
      const spinPivotPos = new THREE.Vector3(0, -0.015, -0.024);
      const spinGroup = new THREE.Group();
      spinGroup.position.copy(spinPivotPos);
      g.add(spinGroup);

      const modelRoot = new THREE.Group();
      modelRoot.position.copy(spinPivotPos).negate();
      spinGroup.add(modelRoot);

      g.userData.spinGroup = spinGroup;
      g.userData.spinPivot = spinPivotPos;
      wpn.attachParent = modelRoot;

      // 1) Sculpted heavy magnum frame with genuine HOLLOW cylinder window & open trigger guard loop
      const frameShape = new THREE.Shape();
      frameShape.moveTo(0.056, 0.046);     // Rear recoil shield top
      frameShape.lineTo(0.020, 0.070);     // Rear top strap
      frameShape.lineTo(-0.096, 0.070);    // Front top strap meeting barrel
      frameShape.lineTo(-0.096, 0.002);    // Front underlug frame base
      frameShape.lineTo(-0.056, 0.002);
      frameShape.lineTo(-0.052, -0.036);   // Front trigger guard corner
      frameShape.lineTo(0.000, -0.036);    // Rear trigger guard corner
      frameShape.lineTo(0.008, -0.012);
      frameShape.lineTo(0.026, -0.106);    // Front grip heel
      frameShape.lineTo(0.076, -0.094);    // Swept magnum grip butt
      frameShape.lineTo(0.058, 0.004);     // Backstrap curve
      frameShape.lineTo(0.068, 0.028);     // Beavertail spur
      frameShape.closePath();

      // Genuine hollow cylinder window cutout (z: -0.088 .. -0.014, y: 0.010 .. 0.061)
      const cylHole = new THREE.Path();
      cylHole.moveTo(-0.088, 0.010);
      cylHole.lineTo(-0.014, 0.010);
      cylHole.lineTo(-0.014, 0.061);
      cylHole.lineTo(-0.088, 0.061);
      cylHole.closePath();
      frameShape.holes.push(cylHole);

      // Genuine open trigger guard loop (so trigger finger hooks inside cleanly during spins!)
      const tgHole = new THREE.Path();
      tgHole.moveTo(-0.044, -0.004);
      tgHole.lineTo(-0.004, -0.004);
      tgHole.lineTo(-0.006, -0.028);
      tgHole.lineTo(-0.044, -0.028);
      tgHole.closePath();
      frameShape.holes.push(tgHole);

      const frameMesh = makeSideExtrude(frameShape, 0.030, 0.0024, skinMat, uvBounds);
      modelRoot.add(frameMesh);

      // Recoil shield & sideplate machined accents
      const recoilShield = new THREE.Mesh(new THREE.CylinderGeometry(0.0255, 0.0255, 0.014, 16), darkMetal);
      recoilShield.rotation.x = Math.PI / 2;
      recoilShield.position.set(0, 0.036, -0.006);
      modelRoot.add(recoilShield);

      // Left-side thumb cylinder release latch (animates forward when popping cylinder!)
      const latchGroup = new THREE.Group();
      latchGroup.position.set(-0.0185, 0.032, 0.006);
      const latchBtn = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.011, 0.020), gunmetal);
      const latchRib = new THREE.Mesh(new THREE.BoxGeometry(0.0065, 0.008, 0.004), brightSteel);
      latchRib.position.z = 0.004;
      latchGroup.add(latchBtn, latchRib);
      modelRoot.add(latchGroup);
      g.userData.latchGroup = latchGroup;
      g.userData.latchRestZ = 0.006;

      // 2) Heavy Vented .500 Magnum Barrel + Full Underlug Ejector Shroud (z: -0.095 .. -0.258, bore y = 0.050)
      const barrelBody = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.034, 0.162), skinMat);
      barrelBody.position.set(0, 0.048, -0.176);
      makeSkinned(barrelBody, uvBounds);
      const underLug = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.022, 0.156), darkMetal);
      underLug.position.set(0, 0.024, -0.172);
      const topRib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.168), gunmetal);
      topRib.position.set(0, 0.068, -0.174);
      modelRoot.add(barrelBody, underLug, topRib);

      // 4 machined cooling vent slots along the heavy barrel rib (iconic Python / R8 silhouette!)
      for (const vz of [-0.118, -0.152, -0.186, -0.220]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.0265, 0.007, 0.020), gripMat);
        vent.position.set(0, 0.062, vz);
        modelRoot.add(vent);
      }

      // Integrated top tactical Picatinny rail across top strap (y = 0.0725) + bottom accessory rail
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.005, 0.118), darkMetal);
      topRail.position.set(0, 0.0725, -0.072);
      for (const rz of [-0.116, -0.092, -0.068, -0.044, -0.020]) {
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.003, 0.008), gunmetal);
        lug.position.set(0, 0.075, rz);
        modelRoot.add(lug);
      }
      const underRailBar = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.005, 0.102), darkMetal);
      underRailBar.position.set(0, 0.011, -0.168);
      modelRoot.add(topRail, underRailBar);

      // Swappable default .500 magnum crown + recessed dark bore (y = 0.050, z = -0.258)
      const defaultBarrelGroup = new THREE.Group();
      const muzzleCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.0122, 0.0132, 0.012, 12), brightSteel);
      muzzleCrown.rotation.x = Math.PI / 2;
      muzzleCrown.position.set(0, 0.050, -0.260);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 0.014, 10), gripMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(0, 0.050, -0.262);
      defaultBarrelGroup.add(muzzleCrown, bore);
      modelRoot.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Ramped front target blade + tritium amber/cyan post + adjustable rear notch irons
      const defaultIronsGroup = new THREE.Group();
      const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(0.0052, 0.014, 0.022), darkMetal);
      frontBlade.position.set(0, 0.078, -0.244);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0046, 0.004), accentGlow);
      frontDot.position.set(0, 0.080, -0.233);
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.012), darkMetal);
      rearL.position.set(-0.009, 0.077, 0.014);
      const rearR = rearL.clone();
      rearR.position.x = 0.009;
      const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0032, 0.003), accentGlow);
      rearDotL.position.set(-0.009, 0.078, 0.020);
      const rearDotR = rearDotL.clone();
      rearDotR.position.x = 0.009;
      defaultIronsGroup.add(frontBlade, frontDot, rearL, rearR, rearDotL, rearDotR);
      modelRoot.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;

      // 3) HINGED CRANE / YOKE + ROTATING 6-FLUTE CYLINDER + 6 INDIVIDUAL .500 BRASS CARTRIDGES
      // Hinge axis sits at lower-left (-0.0155, 0.008, -0.051); rotating cranePivot.rotation.z > 0 swings cylinder cleanly OUT to the left!
      const cranePivot = new THREE.Group();
      cranePivot.position.set(-0.0155, 0.008, -0.051);
      modelRoot.add(cranePivot);
      g.userData.cranePivot = cranePivot;

      // Machined crane yoke arm connecting lower-left hinge up to cylinder axis
      const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.030, 0.018), gunmetal);
      craneArm.position.set(0.006, 0.014, -0.022);
      craneArm.rotation.z = -0.44;
      const cranePin = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.068, 8), darkMetal);
      cranePin.rotation.x = Math.PI / 2;
      cranePin.position.set(0, 0, 0);
      cranePivot.add(craneArm, cranePin);

      // Rotating 6-chamber cylinder centered at (0, 0.036, -0.051) in modelRoot space => (0.0155, 0.028, 0) in cranePivot space
      const cylinderGroup = new THREE.Group();
      cylinderGroup.position.set(0.0155, 0.028, 0);
      cranePivot.add(cylinderGroup);
      g.userData.cylinderGroup = cylinderGroup;

      const isTiCyl = atts.magazine === 'titanium_cylinder';
      const isChamferCyl = atts.magazine === 'chamfered_cylinder';
      const cylDrumMat = isTiCyl
        ? new THREE.MeshStandardMaterial({ color: 0xb7a682, roughness: 0.24, metalness: 0.90 })
        : skinMat;

      const cylDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.0242, 0.0242, 0.066, 18), cylDrumMat);
      cylDrum.rotation.x = Math.PI / 2;
      if (!isTiCyl) makeSkinned(cylDrum, uvBounds);
      cylinderGroup.add(cylDrum);

      // Chamfered / ported accent bands on cylinder front & rear rims
      const bandMat = isTiCyl ? brassMat : (isChamferCyl ? brightSteel : gunmetal);
      for (const bz of [-0.031, 0.031]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0234, 0.0246, 0.005, 18), bandMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.z = bz;
        cylinderGroup.add(ring);
      }

      // 6 deep radial flutes + 6 recessed chamber bores + 6 live toggleable .500 brass cartridges!
      const shellMeshes = [];
      const copperTipMat = new THREE.MeshStandardMaterial({ color: 0xc97b42, roughness: 0.30, metalness: 0.84 });
      const primerMat = new THREE.MeshStandardMaterial({ color: 0xd8e0ea, roughness: 0.20, metalness: 0.92 });
      const chamberDist = 0.0142;

      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const fluteAng = ang + Math.PI / 6;

        // Sculpted outer flute recess between chambers
        const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.044, 8), darkMetal);
        flute.rotation.x = Math.PI / 2;
        flute.position.set(Math.sin(fluteAng) * 0.0226, Math.cos(fluteAng) * 0.0226, -0.002);
        cylinderGroup.add(flute);

        // Dark chamber bore hole (visible when empty!)
        const cx = Math.sin(ang) * chamberDist;
        const cy = Math.cos(ang) * chamberDist;
        const chHole = new THREE.Mesh(new THREE.CylinderGeometry(0.0061, 0.0061, 0.068, 10), gripMat);
        chHole.rotation.x = Math.PI / 2;
        chHole.position.set(cx, cy, 0);
        cylinderGroup.add(chHole);

        // Individual .500 brass cartridge mesh (shown/hidden live by ammo count!)
        const shellGrp = new THREE.Group();
        shellGrp.position.set(cx, cy, 0);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0067, 0.0067, 0.0032, 10), brassMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.z = 0.0342;
        const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.0014, 8), primerMat);
        primer.rotation.x = Math.PI / 2;
        primer.position.z = 0.0360;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0052, 0.010, 8), copperTipMat);
        tip.rotation.x = -Math.PI / 2;
        tip.position.z = -0.032;
        shellGrp.add(rim, primer, tip);
        cylinderGroup.add(shellGrp);
        shellMeshes.push(shellGrp);
      }
      g.userData.shellMeshes = shellMeshes;

      // Center ejector rod + star extractor (plunges rearward when dumping brass!)
      const ejectorRodGroup = new THREE.Group();
      const starHub = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 6), brightSteel);
      starHub.rotation.x = Math.PI / 2;
      starHub.position.z = 0.0355;
      const rodShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.132, 8), brightSteel);
      rodShaft.rotation.x = Math.PI / 2;
      rodShaft.position.z = -0.056;
      const rodKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0046, 0.012, 8), gunmetal);
      rodKnob.rotation.x = Math.PI / 2;
      rodKnob.position.z = -0.122;
      ejectorRodGroup.add(starHub, rodShaft, rodKnob);
      cylinderGroup.add(ejectorRodGroup);
      g.userData.ejectorRodGroup = ejectorRodGroup;

      // 4) Articulated Checkered Magnum Hammer Spur (rotates smoothly back during 0.20s charge!)
      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.042, 0.018);
      const hammerBody = new THREE.Mesh(new THREE.BoxGeometry(0.0095, 0.026, 0.014), brightSteel);
      hammerBody.position.set(0, 0.012, 0.004);
      hammerBody.rotation.x = -0.26;
      const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.0115, 0.0075, 0.016), gunmetal);
      hammerSpur.position.set(0, 0.026, 0.013);
      hammerSpur.rotation.x = -0.52;
      hammerGroup.add(hammerBody, hammerSpur);
      modelRoot.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      // 5) Articulated Curved Double-Action Trigger inside open trigger guard loop
      const triggerGroup = new THREE.Group();
      triggerGroup.position.set(0, -0.003, -0.012);
      const triggerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.0052, 0.022, 0.0065), brightSteel);
      triggerBlade.position.set(0, -0.011, -0.004);
      triggerBlade.rotation.x = 0.26;
      triggerGroup.add(triggerBlade);
      modelRoot.add(triggerGroup);
      g.userData.triggerGroup = triggerGroup;

      // 6) Sculpted ergonomic revolver grip panels
      const defaultGripGroup = new THREE.Group();
      const gripWrap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.088, 0.044), gripMat);
      gripWrap.position.set(0, -0.052, 0.042);
      gripWrap.rotation.x = 0.28;
      // Subtle grip medallion accent
      const medL = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.038, 10), brassMat);
      medL.rotation.z = Math.PI / 2;
      medL.position.set(0, -0.038, 0.040);
      defaultGripGroup.add(gripWrap, medL);
      modelRoot.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      addFlash(modelRoot, 0.050, -0.292, 1.42);

      // Precision Gunsmith attachment mounts (Apex Chrono mounted cleanly on forward underlug flank so crane swings freely!)
      wpn.opticRail = { x: 0, y: 0.0755, z: -0.070, parent: modelRoot, width: 0.019, isCompact: true };
      wpn.barrelRoot = { y: 0.050, rootZ: -0.256, shroudEndZ: -0.256, defaultTipZ: -0.265, radius: 0.0122, isPistol: true };
      wpn.underRail = { x: 0, y: 0.008, z: -0.168, parent: modelRoot, isPistolRail: true, laserPos: [0, -0.004, -0.168] };
      wpn.magWell = { isRevolverCylinder: true, cylinderGroup };
      wpn.stockMount = null;
      wpn.gripSpec = { isPanel: true, pos: [0, -0.052, 0.042], size: [0.037, 0.088, 0.045], rotX: 0.28 };
      wpn.apexMount = { x: -0.014, y: 0.025, z: -0.174, parent: modelRoot, scale: 0.72 };
      wpn.ironEyePoint = [0, 0.080, 0.014];

    } else if (wt === 'smg') {
      const uvBounds = { minZ: -0.44, maxZ: 0.28, minY: -0.18, maxY: 0.09 };
      wpn.uvBounds = uvBounds;

      // 1) Iconic KRISS Vector deep angular upper & lower receiver shroud with flat under-rail forend
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(0.085, 0.044);
      bodyShape.lineTo(-0.265, 0.044);
      bodyShape.lineTo(-0.285, 0.024);
      bodyShape.lineTo(-0.262, -0.032);
      bodyShape.lineTo(-0.168, -0.032);
      bodyShape.lineTo(-0.146, -0.055);
      bodyShape.lineTo(-0.088, -0.055);
      bodyShape.lineTo(-0.068, -0.008);
      bodyShape.lineTo(0.078, -0.008);
      bodyShape.closePath();
      g.add(makeSideExtrude(bodyShape, 0.042, 0.0028, skinMat, uvBounds));

      // Right-side (+X) ejection port cutout + recessed steel breech
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.017, 0.054), gripMat);
      ejCut.position.set(0.021, 0.022, -0.058);
      const ejBreech = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.013, 0.044), brightSteel);
      ejBreech.position.set(0.019, 0.022, -0.058);
      g.add(ejCut, ejBreech);

      // Top full-length Picatinny rail (top y = 0.053) + under-forend Picatinny rail (bottom y = -0.036)
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.34), darkMetal);
      topRail.position.set(0, 0.049, -0.090);
      const lowRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.090), darkMetal);
      lowRail.position.set(0, -0.034, -0.214);
      g.add(topRail, lowRail);

      // Swappable flip-up iron sights (folded/hidden when optic is equipped)
      const defaultIronsGroup = new THREE.Group();
      const rearIron = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.014), gunmetal);
      rearIron.position.set(0, 0.058, 0.055);
      const frontIron = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.012), gunmetal);
      frontIron.position.set(0, 0.058, -0.245);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.004), accentGlow);
      frontDot.position.set(0, 0.062, -0.245);
      defaultIronsGroup.add(rearIron, frontIron, frontDot);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;

      // Swappable compact barrel + flash hider (aligned on bore y = 0.006)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.120, 10), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.006, -0.312);
      defaultBarrelGroup.add(barrel);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      const defaultMuzzleGroup = new THREE.Group();
      const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.032, 8), darkMetal);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.006, -0.386);
      defaultMuzzleGroup.add(muzzleTip);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // Swappable contoured pistol grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.018, -0.006);
      gripShape.lineTo(0.056, -0.006);
      gripShape.lineTo(0.072, -0.088);
      gripShape.lineTo(0.034, -0.092);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.028, 0.0024, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.044), darkMetal);
      tg.position.set(0, -0.028, -0.010);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.017, 0.005), brightSteel);
      trigger.position.set(0, -0.017, 0.000);
      trigger.rotation.x = 0.25;
      g.add(tg, trigger);

      // Swappable folding skeleton buttstock
      const stockGroup = new THREE.Group();
      const sTop = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.18), darkMetal);
      sTop.position.set(0, 0.024, 0.172);
      const sBot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.010, 0.17), darkMetal);
      sBot.position.set(0, -0.022, 0.168);
      sBot.rotation.x = 0.18;
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.082, 0.018), gripMat);
      butt.position.set(0, -0.008, 0.260);
      stockGroup.add(sTop, sBot, butt);
      g.add(stockGroup);
      g.userData.defaultStockGroup = stockGroup;
      wpn.defaultStockGroup = stockGroup;

      // Iconic forward-cant vertical Vector stick magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.135, 0.032), darkMetal);
      magMesh.position.set(0, -0.102, -0.132);
      magMesh.rotation.x = 0.24;
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.038), gunmetal);
      magBase.position.set(0, -0.165, -0.148);
      magBase.rotation.x = 0.24;
      defaultMagMeshGroup.add(magMesh, magBase);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // Authentic KRISS Vector left-side (-X) folding charging handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(-0.025, 0.026, -0.165);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 0.026), brightSteel);
      const chKnob = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.010), darkMetal);
      chKnob.position.set(-0.009, 0, 0.008);
      boltGroup.add(ch, chKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(-0.025, 0.026, -0.165);

      addFlash(g, 0.006, -0.42, 0.78);

      wpn.opticRail = { x: 0, y: 0.053, z: -0.068, parent: g, width: 0.022 };
      wpn.barrelRoot = { y: 0.006, rootZ: -0.252, shroudEndZ: -0.268, defaultTipZ: -0.372, radius: 0.011 };
      wpn.underRail = { x: 0, y: -0.036, z: -0.214, parent: g, laserPos: [0.024, 0.016, -0.222] };
      wpn.magWell = { x: 0, y: -0.054, z: -0.118, rotX: 0.24, width: 0.024, depth: 0.032, bottomY: -0.165, bottomZ: -0.148, isCantMag: true };
      wpn.stockMount = { x: 0, y: 0.014, z: 0.085, faceW: 0.036, faceH: 0.048 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.029 };
      wpn.apexMount = { x: -0.021, y: 0.022, z: -0.068, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.062, 0.055];

    } else if (wt === 'shotgun') {
      const uvBounds = { minZ: -0.66, maxZ: 0.34, minY: -0.11, maxY: 0.08 };
      wpn.uvBounds = uvBounds;

      // Shell color tied to equipped ammo type (used for side-saddle shells AND animated twin-shell reload!)
      const shotgunShellColors = {
        flechette: 0x2ec8eb,
        slug: 0xe68829,
        magnum: 0x8c1226
      };
      g.userData.shellColor = shotgunShellColors[atts.ammo] || 0xc82532;

      // 1) Classic M870 steel receiver
      const recShape = new THREE.Shape();
      recShape.moveTo(0.085, 0.040);
      recShape.lineTo(-0.155, 0.040);
      recShape.lineTo(-0.165, -0.014);
      recShape.lineTo(0.075, -0.014);
      recShape.closePath();
      g.add(makeSideExtrude(recShape, 0.042, 0.0032, skinMat, uvBounds));

      // Right-side (+X) ejection port pocket + reciprocating steel breech bolt
      const ejPocket = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.020, 0.076), gripMat);
      ejPocket.position.set(0.0215, 0.018, -0.042);
      const breechBoltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.066), brightSteel);
      breechBoltMesh.position.set(0.022, 0.018, -0.042);
      g.add(ejPocket, breechBoltMesh);
      g.userData.breechBoltMesh = breechBoltMesh;
      g.userData.breechBoltRestZ = -0.042;

      // Recessed bottom loading gate + metallic shell carrier lifter (visible during bottom twin-shell reload!)
      const loadPortRecess = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.006, 0.078), gripMat);
      loadPortRecess.position.set(0, -0.014, -0.062);
      const loadGateLifter = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.004, 0.064), brightSteel);
      loadGateLifter.position.set(0, -0.012, -0.062);
      g.add(loadPortRecess, loadGateLifter);
      g.userData.loadGateLifter = loadGateLifter;

      // Top receiver Picatinny rail (top y = 0.049)
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.007, 0.19), darkMetal);
      topRail.position.set(0, 0.045, -0.035);
      g.add(topRail);

      // Swappable 12-gauge upper barrel + front bead sight (y = 0.026, z = -0.15..-0.63)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.48, 12), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.026, -0.39);
      const frontBead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
      frontBead.position.set(0, 0.043, -0.618);
      defaultBarrelGroup.add(barrel, frontBead);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Lower tubular magazine (base tube + clamp ring; extended_mag attaches flush onto front endcap!)
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.41, 10), darkMetal);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.002, -0.36);
      const tubeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0138, 0.0138, 0.018, 10), gunmetal);
      tubeCap.rotation.x = Math.PI / 2;
      tubeCap.position.set(0, -0.002, -0.568);
      const clampRing = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.042, 0.018), darkMetal);
      clampRing.position.set(0, 0.012, -0.525);
      g.add(magTube, tubeCap, clampRing);

      // Ribbed sliding pump forend (pumpGroup animates back/forward on shots & reload finish!)
      const pumpGroup = new THREE.Group();
      const pumpBody = makeSkinned(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.023, 0.18, 10), skinMat), uvBounds);
      pumpBody.rotation.x = Math.PI / 2;
      pumpBody.position.set(0, -0.002, -0.30);
      projectWeaponMeshUVs(pumpBody, uvBounds);
      pumpGroup.add(pumpBody);
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.010, 10), gripMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(0, -0.002, -0.23 - i * 0.026);
        pumpGroup.add(rib);
      }
      // Under-pump tactical rail strip so foregrips mount flush onto pumpGroup and slide with it!
      const pumpRail = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.125), darkMetal);
      pumpRail.position.set(0, -0.024, -0.30);
      pumpGroup.add(pumpRail);
      g.add(pumpGroup);
      g.userData.pumpGroup = pumpGroup;
      g.userData.pumpRestZ = 0;

      // Swappable contoured pistol grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.042, -0.004);
      gripShape.lineTo(0.088, -0.004);
      gripShape.lineTo(0.106, -0.082);
      gripShape.lineTo(0.068, -0.088);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.030, 0.0026, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0045, 0.046), darkMetal);
      tgBottom.position.set(0, -0.030, 0.024);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.018, 0.005), darkMetal);
      tgFront.position.set(0, -0.021, 0.002);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.016, 0.005), brightSteel);
      trigger.position.set(0, -0.020, 0.028);
      trigger.rotation.x = 0.28;
      g.add(tgBottom, tgFront, trigger);

      // Swappable buttstock
      const stockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.075, 0.028);
      stockShape.lineTo(0.305, 0.012);
      stockShape.lineTo(0.312, -0.082);
      stockShape.lineTo(0.082, -0.022);
      stockShape.closePath();
      stockGroup.add(makeSideExtrude(stockShape, 0.034, 0.003, skinMat, uvBounds));
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.096, 0.016), gripMat);
      pad.position.set(0, -0.036, 0.316);
      stockGroup.add(pad);
      g.add(stockGroup);
      g.userData.defaultStockGroup = stockGroup;
      wpn.defaultStockGroup = stockGroup;

      addFlash(g, 0.026, -0.66, 1.35);

      wpn.opticRail = { x: 0, y: 0.049, z: -0.035, parent: g, width: 0.020 };
      wpn.barrelRoot = { y: 0.026, rootZ: -0.155, shroudEndZ: -0.405, defaultTipZ: -0.630, radius: 0.0145, isShotgun: true };
      wpn.underRail = { x: 0, y: -0.026, z: -0.300, parent: pumpGroup, isPump: true, laserPos: [0.022, 0.012, -0.525], laserParent: g };
      wpn.magWell = { isShotgun: true, tubeY: -0.002, tubeStartZ: -0.155, tubeTipZ: -0.568, sideSaddlePos: [-0.024, 0.013, -0.044], drumPos: [0, -0.068, -0.060] };
      wpn.stockMount = { x: 0, y: 0.004, z: 0.078, faceW: 0.036, faceH: 0.052 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.031 };
      wpn.apexMount = { x: -0.021, y: 0.026, z: -0.105, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.050, -0.035];

    } else if (wt === 'pistol') {
      const uvBounds = { minZ: -0.26, maxZ: 0.09, minY: -0.12, maxY: 0.065 };
      wpn.uvBounds = uvBounds;

      const spinGroup = new THREE.Group();
      spinGroup.position.set(0, -0.020, -0.002);
      const inner = new THREE.Group();
      inner.position.set(0, 0.020, 0.002);
      spinGroup.add(inner);
      g.add(spinGroup);
      g.userData.spinGroup = spinGroup;
      wpn.attachParent = inner;

      // 1) Crisp boxy USP-9 Tactical slide (reciprocating slideGroup)
      const slideGroup = new THREE.Group();
      const slideShape = new THREE.Shape();
      slideShape.moveTo(0.072, 0.040);
      slideShape.lineTo(-0.188, 0.040);
      slideShape.lineTo(-0.194, 0.010);
      slideShape.lineTo(0.070, 0.010);
      slideShape.closePath();
      slideGroup.add(makeSideExtrude(slideShape, 0.028, 0.0022, skinMat, uvBounds));

      // Right-side (+X) ejection port cutout & brass barrel hood + rear cocking serrations
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.036), gripMat);
      ejCut.position.set(0.0145, 0.030, -0.066);
      const hoodBrass = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.028), brassMat);
      hoodBrass.position.set(0.0125, 0.030, -0.066);
      slideGroup.add(ejCut, hoodBrass);
      for (let i = 0; i < 5; i++) {
        const ser = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.018, 0.003), darkMetal);
        ser.position.set(0, 0.025, 0.028 + i * 0.007);
        slideGroup.add(ser);
      }

      // Swappable rear suppressor-height tritium sights (hidden when slide-mounted optic is equipped)
      const defaultIronsGroup = new THREE.Group();
      const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.010), darkMetal);
      rSightL.position.set(-0.006, 0.045, 0.054);
      const rSightR = rSightL.clone();
      rSightR.position.x = 0.006;
      const rDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0026, 0.0026), accentGlow);
      rDotL.position.set(-0.006, 0.046, 0.059);
      const rDotR = rDotL.clone();
      rDotR.position.x = 0.006;
      defaultIronsGroup.add(rSightL, rSightR, rDotL, rDotR);
      slideGroup.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;

      const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.010), darkMetal);
      fSight.position.set(0, 0.046, -0.175);
      const fDot = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), accentGlow);
      fDot.position.set(0, 0.048, -0.172);
      slideGroup.add(fSight, fDot);
      inner.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // Swappable threaded tactical barrel tip (aligned on true bore y = 0.024)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.036, 10), brightSteel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.024, -0.205);
      defaultBarrelGroup.add(barrel);
      inner.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Polymer tactical lower frame + under-barrel accessory rail + left-side (-X) slide release & decocker
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.24), darkMetal);
      frame.position.set(0, 0.002, -0.056);
      const slideRel = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.007, 0.028), gunmetal);
      slideRel.position.set(-0.015, 0.009, -0.008);
      const decocker = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.014), gunmetal);
      decocker.position.set(-0.015, 0.005, 0.042);
      inner.add(frame, slideRel, decocker);

      // Swappable contoured grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.008, -0.004);
      gripShape.lineTo(0.052, -0.004);
      gripShape.lineTo(0.068, -0.092);
      gripShape.lineTo(0.022, -0.095);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.025, 0.0022, gripMat, null));
      inner.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.004, 0.042), darkMetal);
      tg.position.set(0, -0.028, -0.016);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.020, 0.005), darkMetal);
      tgFront.position.set(0, -0.018, -0.036);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.005), brightSteel);
      trigger.position.set(0, -0.016, -0.010);
      trigger.rotation.x = 0.26;
      inner.add(tg, tgFront, trigger);

      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.020, 0.072);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.010), brightSteel);
      hm.position.set(0, 0.004, 0.004);
      hammerGroup.add(hm);
      inner.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magShaft = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.068, 0.032), darkMetal);
      magShaft.position.set(0, -0.062, 0.038);
      magShaft.rotation.x = 0.16;
      const magPad = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.013, 0.042), gunmetal);
      magPad.position.set(0, -0.098, 0.044);
      magPad.rotation.x = 0.16;
      defaultMagMeshGroup.add(magShaft, magPad);
      magGroup.add(defaultMagMeshGroup);
      inner.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      addFlash(inner, 0.024, -0.24, 0.65);

      wpn.opticRail = { x: 0, y: 0.041, z: 0.018, parent: slideGroup, width: 0.020, isCompact: true, isSlideMounted: true };
      wpn.barrelRoot = { y: 0.024, rootZ: -0.190, shroudEndZ: -0.190, defaultTipZ: -0.222, radius: 0.008, isPistol: true };
      wpn.underRail = { x: 0, y: -0.010, z: -0.122, parent: inner, isPistolRail: true, laserPos: [0, -0.018, -0.124] };
      wpn.magWell = { x: 0, y: -0.092, z: 0.043, rotX: 0.16, width: 0.022, depth: 0.036, bottomY: -0.100, bottomZ: 0.046, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = { shape: gripShape, thickness: 0.026 };
      wpn.apexMount = { x: -0.014, y: 0.003, z: -0.092, parent: inner, scale: 0.65 };
      wpn.ironEyePoint = [0, 0.049, 0.054];

    } else {
      // V-47 Precision Rifle (Iconic CS:S/CS2 AK-47 Faceted Silhouette)
      const uvBounds = { minZ: -0.62, maxZ: 0.32, minY: -0.17, maxY: 0.095 };
      wpn.uvBounds = uvBounds;

      // 1) Sculpted stamped AK receiver + angled lower magwell
      const recShape = new THREE.Shape();
      recShape.moveTo(0.095, 0.034);
      recShape.lineTo(-0.150, 0.036);
      recShape.lineTo(-0.150, -0.008);
      recShape.lineTo(-0.045, -0.010);
      recShape.lineTo(0.015, -0.008);
      recShape.lineTo(0.095, -0.004);
      recShape.closePath();
      g.add(makeSideExtrude(recShape, 0.042, 0.0028, skinMat, uvBounds));

      // Right-side (+X) ejection recess + iconic AK fire selector lever; left-side (-X) dovetail optic rail pad
      const ejRecess = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.088), gripMat);
      ejRecess.position.set(0.021, 0.024, -0.046);
      const selector = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.068), gunmetal);
      selector.position.set(0.023, 0.010, 0.020);
      selector.rotation.x = 0.08;
      const sideDovetail = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.082), darkMetal);
      sideDovetail.position.set(-0.023, 0.016, -0.022);
      g.add(ejRecess, selector, sideDovetail);

      // Curved ribbed AK top dust cover (faceted half-arch along Z)
      const dustGeo = new THREE.CylinderGeometry(0.019, 0.020, 0.228, 8, 1, false, 0, Math.PI);
      dustGeo.rotateZ(Math.PI / 2);
      dustGeo.rotateY(Math.PI / 2);
      const dustMesh = new THREE.Mesh(dustGeo, skinMat);
      dustMesh.scale.set(1.05, 0.85, 1.0);
      dustMesh.position.set(0, 0.035, -0.024);
      projectWeaponMeshUVs(dustMesh, uvBounds);
      g.add(dustMesh);

      const dustButton = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.012), gunmetal);
      dustButton.position.set(0, 0.036, 0.096);
      g.add(dustButton);

      // 2) Swappable classic angled drop-comb AK buttstock + steel recoil buttpad
      const defaultStockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.090, 0.030);
      stockShape.lineTo(0.282, 0.018);
      stockShape.lineTo(0.288, -0.068);
      stockShape.lineTo(0.240, -0.062);
      stockShape.lineTo(0.090, -0.006);
      stockShape.closePath();
      defaultStockGroup.add(makeSideExtrude(stockShape, 0.034, 0.0032, skinMat, uvBounds));

      const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.090, 0.014), gripMat);
      buttplate.position.set(0, -0.025, 0.290);
      buttplate.rotation.x = -0.07;
      defaultStockGroup.add(buttplate);
      g.add(defaultStockGroup);
      g.userData.defaultStockGroup = defaultStockGroup;
      wpn.defaultStockGroup = defaultStockGroup;

      // 3) Sculpted lower handguard + upper gas-tube handguard shroud + under-handguard rail strip
      const lowerHgShape = new THREE.Shape();
      lowerHgShape.moveTo(-0.146, 0.026);
      lowerHgShape.lineTo(-0.348, 0.024);
      lowerHgShape.lineTo(-0.340, -0.008);
      lowerHgShape.lineTo(-0.240, -0.011);
      lowerHgShape.lineTo(-0.146, -0.008);
      lowerHgShape.closePath();
      g.add(makeSideExtrude(lowerHgShape, 0.038, 0.0030, skinMat, uvBounds));

      const upperHg = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0155, 0.165, 8), skinMat);
      upperHg.rotation.x = Math.PI / 2;
      upperHg.position.set(0, 0.042, -0.240);
      projectWeaponMeshUVs(upperHg, uvBounds);
      g.add(upperHg);

      const lowRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.005, 0.120), darkMetal);
      lowRail.position.set(0, -0.012, -0.252);
      g.add(lowRail);

      for (const vz of [-0.205, -0.255, -0.305]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.043, 0.007, 0.024), gripMat);
        vent.position.set(0, 0.012, vz);
        g.add(vent);
      }
      const hgCap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.014), darkMetal);
      hgCap.position.set(0, 0.014, -0.348);
      g.add(hgCap);

      // 4) Rear tangent leaf sight block
      const rearSightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.056), darkMetal);
      rearSightBlock.position.set(0, 0.048, -0.155);
      const rearNotchL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.010), gunmetal);
      rearNotchL.position.set(-0.006, 0.062, -0.132);
      const rearNotchR = rearNotchL.clone();
      rearNotchR.position.x = 0.006;
      const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0026, 0.0026), accentGlow);
      rearDotL.position.set(-0.006, 0.063, -0.126);
      const rearDotR = rearDotL.clone();
      rearDotR.position.x = 0.006;
      g.add(rearSightBlock, rearNotchL, rearNotchR, rearDotL, rearDotR);

      // 5) Swappable barrel assembly (gas tube, 45-deg gas block, steel barrel, cleaning rod, hooded front sight)
      const defaultBarrelGroup = new THREE.Group();
      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.010, 0.120, 8), darkMetal);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 0.044, -0.365);
      const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.028), darkMetal);
      gasBlock.position.set(0, 0.034, -0.422);
      gasBlock.rotation.x = 0.42;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.012, 0.240, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.020, -0.460);
      const cleanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0030, 0.0030, 0.205, 6), brightSteel);
      cleanRod.rotation.x = Math.PI / 2;
      cleanRod.position.set(0, 0.005, -0.445);
      const fsBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.034, 0.024), darkMetal);
      fsBase.position.set(0, 0.034, -0.532);
      const fsHoodL = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.022, 0.014), darkMetal);
      fsHoodL.position.set(-0.009, 0.056, -0.532);
      const fsHoodR = fsHoodL.clone();
      fsHoodR.position.x = 0.009;
      const fsHoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.0035, 0.014), darkMetal);
      fsHoodTop.position.set(0, 0.067, -0.532);
      const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.004), accentGlow);
      fsPost.position.set(0, 0.057, -0.532);
      defaultBarrelGroup.add(gasTube, gasBlock, barrel, cleanRod, fsBase, fsHoodL, fsHoodR, fsHoodTop, fsPost);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Swappable slanted AKM muzzle compensator
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.044, 8), darkMetal);
      brake.rotation.x = Math.PI / 2;
      brake.position.set(0, 0.020, -0.598);
      defaultMuzzleGroup.add(brake);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // 6) Swappable sculpted ergonomic AK pistol grip + open trigger guard + curved trigger
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.024, -0.004);
      gripShape.lineTo(0.064, -0.004);
      gripShape.lineTo(0.078, -0.088);
      gripShape.lineTo(0.042, -0.095);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.028, 0.0026, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0045, 0.048), darkMetal);
      tgBottom.position.set(0, -0.028, -0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.022, 0.005), darkMetal);
      tgFront.position.set(0, -0.018, -0.027);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.017, 0.002);
      trigger.rotation.x = 0.28;
      g.add(tgBottom, tgFront, trigger);

      // 7) Curved 30-round banana magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magShape = new THREE.Shape();
      magShape.moveTo(-0.062, -0.004);
      magShape.lineTo(-0.122, -0.004);
      magShape.quadraticCurveTo(-0.138, -0.076, -0.172, -0.136);
      magShape.lineTo(-0.118, -0.152);
      magShape.quadraticCurveTo(-0.086, -0.082, -0.062, -0.004);
      magShape.closePath();
      const magMesh = makeSideExtrude(magShape, 0.026, 0.0022, skinMat, uvBounds);
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.008, 0.060), darkMetal);
      magPlate.position.set(0, -0.146, -0.146);
      magPlate.rotation.x = -0.34;
      defaultMagMeshGroup.add(magMesh, magPlate);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // 8) Right-side (+X) reciprocating bolt carrier & upturned AK charging handle (boltGroup)
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.022, 0.024, -0.042);
      const carrier = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.082), brightSteel);
      const chStem = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.007, 0.011), gunmetal);
      chStem.position.set(0.012, 0.002, -0.022);
      const chKnob = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.014, 0.013), darkMetal);
      chKnob.position.set(0.022, 0.007, -0.022);
      chKnob.rotation.z = -0.25;
      boltGroup.add(carrier, chStem, chKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.022, 0.024, -0.042);

      addFlash(g, 0.020, -0.635, 1.05);

      wpn.opticRail = { x: 0, y: 0.059, z: -0.022, parent: g, width: 0.022, needsAkMount: true };
      wpn.barrelRoot = { y: 0.020, rootZ: -0.345, shroudEndZ: -0.352, defaultTipZ: -0.578, radius: 0.011, isAk: true };
      wpn.underRail = { x: 0, y: -0.014, z: -0.252, parent: g, laserPos: [0.025, 0.018, -0.285] };
      wpn.magWell = { x: 0, y: -0.010, z: -0.095, rotX: -0.32, width: 0.026, depth: 0.058, bottomY: -0.146, bottomZ: -0.146, isAkCurve: true };
      wpn.stockMount = { x: 0, y: 0.012, z: 0.095, faceW: 0.036, faceH: 0.038 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.029 };
      wpn.apexMount = { x: -0.021, y: 0.020, z: -0.175, parent: g, scale: 0.92 };
      wpn.ironEyePoint = [0, 0.063, -0.126];
    }

    // ---------- 12 New Arsenal Weapons + 4 Scorestreak Special Weapons ----------
    if (wt === 'famas') {
      // Clear default rifle children and build FAMAS Bullpup 3-Round Burst Rifle
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.52, maxZ: 0.30, minY: -0.13, maxY: 0.13 };
      wpn.uvBounds = uvBounds;
      // Bullpup body extending straight back into integrated buttstock
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(0.28, 0.052);
      bodyShape.lineTo(-0.34, 0.052);
      bodyShape.lineTo(-0.36, 0.010);
      bodyShape.lineTo(-0.18, 0.002);
      bodyShape.lineTo(0.28, -0.026);
      bodyShape.lineTo(0.29, -0.072);
      bodyShape.lineTo(0.24, -0.076);
      bodyShape.lineTo(0.08, -0.024);
      bodyShape.lineTo(0.04, -0.024);
      bodyShape.lineTo(0.06, -0.094);
      bodyShape.lineTo(0.018, -0.098);
      bodyShape.lineTo(-0.008, -0.014);
      bodyShape.lineTo(-0.34, -0.004);
      bodyShape.lineTo(0.28, 0.052);
      bodyShape.closePath();
      g.add(makeSideExtrude(bodyShape, 0.042, 0.003, skinMat, uvBounds));
      // Signature FAMAS carry handle arch
      const chFront = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.054, 0.026), darkMetal);
      chFront.position.set(0, 0.078, -0.25);
      chFront.rotation.x = 0.28;
      const chRear = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.054, 0.026), darkMetal);
      chRear.position.set(0, 0.078, 0.12);
      chRear.rotation.x = -0.28;
      const chTop = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.014, 0.39), skinMat);
      chTop.position.set(0, 0.104, -0.065);
      makeSkinned(chTop, uvBounds);
      g.add(chFront, chRear, chTop);
      // Bullpup rear magazine well behind grip
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.125, 0.056), skinMat);
      magMesh.position.set(0, -0.078, 0.145);
      makeSkinned(magMesh, uvBounds);
      defaultMagMeshGroup.add(magMesh);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Default barrel & flash hider
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.011, 0.18, 10), gunmetal);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.028, -0.43);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      const defaultMuzzleGroup = new THREE.Group();
      const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.036, 10), darkMetal);
      fh.rotation.x = Math.PI / 2;
      fh.position.set(0, 0.028, -0.53);
      defaultMuzzleGroup.add(fh);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;
      // Top charging handle inside carry handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0, 0.074, -0.10);
      boltGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.044), brightSteel));
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0, 0.074, -0.10);
      addFlash(g, 0.028, -0.57, 0.95);
      wpn.defaultStockGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = { x: 0, y: 0.111, z: -0.06, parent: g, width: 0.022 };
      wpn.barrelRoot = { y: 0.028, rootZ: -0.34, shroudEndZ: -0.35, defaultTipZ: -0.52, radius: 0.010 };
      wpn.underRail = { x: 0, y: -0.006, z: -0.24, parent: g, laserPos: [0.026, 0.024, -0.26] };
      wpn.magWell = { x: 0, y: -0.024, z: 0.145, rotX: 0, width: 0.026, depth: 0.056, bottomY: -0.140, bottomZ: 0.145 };
      wpn.stockMount = null;
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.022, y: 0.026, z: -0.16, parent: g, scale: 0.9 };
      wpn.ironEyePoint = [0, 0.118, -0.02];
    } else if (wt === 'scar') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.64, maxZ: 0.34, minY: -0.14, maxY: 0.10 };
      wpn.uvBounds = uvBounds;
      // Chunky monolithic SC-20 Heavy upper receiver
      const upper = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.056, 0.46), skinMat), uvBounds);
      upper.position.set(0, 0.034, -0.13);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.036, 0.22), darkMetal);
      lower.position.set(0, -0.008, -0.02);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.007, 0.44), gunmetal);
      topRail.position.set(0, 0.065, -0.13);
      const sideRailL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.18), gunmetal);
      sideRailL.position.set(-0.025, 0.028, -0.24);
      const sideRailR = sideRailL.clone();
      sideRailR.position.x = 0.025;
      g.add(upper, lower, topRail, sideRailL, sideRailR);
      // Signature SCAR boot stock (swappable)
      const defaultStockGroup = new THREE.Group();
      const sShape = new THREE.Shape();
      sShape.moveTo(0.095, 0.052);
      sShape.lineTo(0.305, 0.046);
      sShape.lineTo(0.315, -0.068);
      sShape.lineTo(0.245, -0.064);
      sShape.lineTo(0.185, -0.004);
      sShape.lineTo(0.095, -0.006);
      sShape.closePath();
      defaultStockGroup.add(makeSideExtrude(sShape, 0.038, 0.003, skinMat, uvBounds));
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.112, 0.018), gripMat);
      pad.position.set(0, -0.012, 0.318);
      defaultStockGroup.add(pad);
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      // Pistol grip
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.028, -0.018);
      gripShape.lineTo(0.068, -0.018);
      gripShape.lineTo(0.082, -0.096);
      gripShape.lineTo(0.044, -0.102);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.030, 0.0024, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;
      // Heavy 7.62 straight box mag
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const mag = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.128, 0.072), skinMat), uvBounds);
      mag.position.set(0, -0.078, -0.082);
      defaultMagMeshGroup.add(mag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Heavy barrel + compensator
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0135, 0.24, 10), gunmetal);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.028, -0.47);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.048), brightSteel);
      brake.position.set(0, 0.028, -0.60);
      defaultMuzzleGroup.add(brake);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;
      // Reciprocating side charging handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.028, 0.038, -0.06);
      boltGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.018), brightSteel));
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.028, 0.038, -0.06);
      // Open hooded tactical diopter rear sight + slender tritium front post (clear center sight picture!)
      const defaultIronsGroup = new THREE.Group();
      const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.014), darkMetal);
      rearBase.position.set(0, 0.071, 0.05);
      const rearWallL = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.017, 0.012), darkMetal);
      rearWallL.position.set(-0.0095, 0.081, 0.05);
      const rearWallR = rearWallL.clone();
      rearWallR.position.x = 0.0095;
      const rearArch = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0026, 0.010), darkMetal);
      rearArch.position.set(0, 0.090, 0.05);
      const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0022, 0.002), accentGlow);
      rearDotL.position.set(-0.0082, 0.081, 0.0565);
      const rearDotR = rearDotL.clone();
      rearDotR.position.x = 0.0082;
      const frontBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.014), darkMetal);
      frontBase.position.set(0, 0.071, -0.34);
      const frontEarL = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.016, 0.010), darkMetal);
      frontEarL.position.set(-0.0075, 0.080, -0.34);
      const frontEarR = frontEarL.clone();
      frontEarR.position.x = 0.0075;
      const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.011, 0.004), darkMetal);
      frontPost.position.set(0, 0.077, -0.34);
      const frontTip = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0026, 0.0045), accentGlow);
      frontTip.position.set(0, 0.083, -0.34);
      defaultIronsGroup.add(rearBase, rearWallL, rearWallR, rearArch, rearDotL, rearDotR, frontBase, frontEarL, frontEarR, frontPost, frontTip);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;
      addFlash(g, 0.028, -0.64, 1.2);
      wpn.opticRail = { x: 0, y: 0.069, z: -0.04, parent: g, width: 0.024 };
      wpn.barrelRoot = { y: 0.028, rootZ: -0.35, shroudEndZ: -0.36, defaultTipZ: -0.59, radius: 0.0125 };
      wpn.underRail = { x: 0, y: 0.004, z: -0.25, parent: g, laserPos: [0.028, 0.028, -0.27] };
      wpn.magWell = { x: 0, y: -0.018, z: -0.082, rotX: 0, width: 0.028, depth: 0.072, bottomY: -0.142, bottomZ: -0.082 };
      wpn.stockMount = { x: 0, y: 0.022, z: 0.095, faceW: 0.042, faceH: 0.048 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.030 };
      wpn.apexMount = { x: -0.025, y: 0.028, z: -0.16, parent: g, scale: 0.94 };
      wpn.ironEyePoint = [0, 0.083, 0.05];
    } else if (wt === 'honeybadger') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.58, maxZ: 0.28, minY: -0.13, maxY: 0.09 };
      wpn.uvBounds = uvBounds;
      // Sleek AR-15/Honey Badger receiver + vented M-LOK handguard over recessed integral suppressor
      const rec = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.050, 0.24), skinMat), uvBounds);
      rec.position.set(0, 0.026, -0.02);
      const hg = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.040, 0.26), skinMat), uvBounds);
      hg.position.set(0, 0.028, -0.26);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.006, 0.46), darkMetal);
      topRail.position.set(0, 0.054, -0.14);
      g.add(rec, hg, topRail);
      // Integrated fat cylindrical suppressor emerging seamlessly from handguard
      const defaultBarrelGroup = new THREE.Group();
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.22, 14), darkMetal);
      sup.rotation.x = Math.PI / 2;
      sup.position.set(0, 0.028, -0.44);
      const supRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.014, 14), accentGlow);
      supRing.rotation.x = Math.PI / 2;
      supRing.position.set(0, 0.028, -0.39);
      defaultBarrelGroup.add(sup, supRing);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      wpn.defaultMuzzleGroup = null;
      // Collapsible twin-wire PDW stock
      const defaultStockGroup = new THREE.Group();
      for (const sx of [-0.017, 0.017]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8), brightSteel);
        rod.rotation.x = Math.PI / 2;
        rod.position.set(sx, 0.026, 0.18);
        defaultStockGroup.add(rod);
      }
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.082, 0.018), gripMat);
      butt.position.set(0, 0.006, 0.27);
      defaultStockGroup.add(butt);
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      // Ergonomic grip
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.032, -0.004);
      gripShape.lineTo(0.068, -0.004);
      gripShape.lineTo(0.082, -0.086);
      gripShape.lineTo(0.044, -0.092);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.027, 0.0022, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;
      // 30-rd polymer mag
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const mag = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.120, 0.056), skinMat), uvBounds);
      mag.position.set(0, -0.068, -0.092);
      mag.rotation.x = -0.14;
      defaultMagMeshGroup.add(mag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      const defaultIronsGroup = new THREE.Group();
      const hbRBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0035, 0.012), darkMetal);
      hbRBase.position.set(0, 0.059, 0.04);
      const hbRL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.013, 0.010), darkMetal);
      hbRL.position.set(-0.0075, 0.067, 0.04);
      const hbRR = hbRL.clone();
      hbRR.position.x = 0.0075;
      const hbFL = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.013, 0.009), darkMetal);
      hbFL.position.set(-0.0065, 0.067, -0.35);
      const hbFR = hbFL.clone();
      hbFR.position.x = 0.0065;
      const hbFP = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.011, 0.0035), darkMetal);
      hbFP.position.set(0, 0.065, -0.35);
      const hbFT = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0024, 0.004), accentGlow);
      hbFT.position.set(0, 0.0705, -0.35);
      defaultIronsGroup.add(hbRBase, hbRL, hbRR, hbFL, hbFR, hbFP, hbFT);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;
      addFlash(g, 0.028, -0.56, 0.35);
      wpn.opticRail = { x: 0, y: 0.057, z: -0.03, parent: g, width: 0.020 };
      wpn.barrelRoot = { y: 0.028, rootZ: -0.35, shroudEndZ: -0.36, defaultTipZ: -0.55, radius: 0.015 };
      wpn.underRail = { x: 0, y: 0.007, z: -0.24, parent: g, laserPos: [0.022, 0.028, -0.26] };
      wpn.magWell = { x: 0, y: -0.010, z: -0.092, rotX: -0.14, width: 0.024, depth: 0.056, bottomY: -0.128, bottomZ: -0.106 };
      wpn.stockMount = { x: 0, y: 0.022, z: 0.098, faceW: 0.036, faceH: 0.042 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.028 };
      wpn.apexMount = { x: -0.020, y: 0.026, z: -0.16, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.0705, 0.04];
    } else if (wt === 'mp7') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.36, maxZ: 0.22, minY: -0.14, maxY: 0.09 };
      wpn.uvBounds = uvBounds;
      // Ultra-compact MP-7 Viper PDW chassis
      const chassis = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.056, 0.32), skinMat), uvBounds);
      chassis.position.set(0, 0.026, -0.07);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.006, 0.29), darkMetal);
      topRail.position.set(0, 0.057, -0.07);
      // Folding front foregrip integral stub
      const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.068, 0.024), gripMat);
      foregrip.position.set(0, -0.034, -0.185);
      foregrip.rotation.x = 0.14;
      g.add(chassis, topRail, foregrip);
      // Grip + in-grip extended 40-rd stick mag
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.092, 0.038), gripMat);
      grip.position.set(0, -0.042, 0.032);
      grip.rotation.x = 0.16;
      g.add(grip);
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const mag = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.132, 0.028), skinMat), uvBounds);
      mag.position.set(0, -0.096, 0.042);
      mag.rotation.x = 0.16;
      defaultMagMeshGroup.add(mag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Stubby barrel
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.010, 0.09, 10), gunmetal);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.026, -0.27);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      // Compact low-slung retractable wire stock tucked cleanly below sightline (never blocks ADS!)
      const defaultStockGroup = new THREE.Group();
      for (const sx of [-0.015, 0.015]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0065, 0.125), gunmetal);
        w.position.set(sx, 0.004, 0.145);
        defaultStockGroup.add(w);
      }
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.044, 0.012), gripMat);
      sp.position.set(0, -0.014, 0.205);
      defaultStockGroup.add(sp);
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      // Clean open-notch low-profile MP-7 flip sights + tritium dots
      const defaultIronsGroup = new THREE.Group();
      const mpRBase = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.0035, 0.010), darkMetal);
      mpRBase.position.set(0, 0.062, 0.04);
      const mpRL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.009), darkMetal);
      mpRL.position.set(-0.007, 0.069, 0.04);
      const mpRR = mpRL.clone();
      mpRR.position.x = 0.007;
      const mpRDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.002, 0.0018), accentGlow);
      mpRDotL.position.set(-0.006, 0.071, 0.045);
      const mpRDotR = mpRDotL.clone();
      mpRDotR.position.x = 0.006;
      const mpFBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0035, 0.010), darkMetal);
      mpFBase.position.set(0, 0.062, -0.20);
      const mpFL = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.012, 0.008), darkMetal);
      mpFL.position.set(-0.006, 0.069, -0.20);
      const mpFR = mpFL.clone();
      mpFR.position.x = 0.006;
      const mpFP = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.009, 0.0035), darkMetal);
      mpFP.position.set(0, 0.0675, -0.20);
      const mpFT = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0024, 0.004), accentGlow);
      mpFT.position.set(0, 0.0725, -0.20);
      defaultIronsGroup.add(mpRBase, mpRL, mpRR, mpRDotL, mpRDotR, mpFBase, mpFL, mpFR, mpFP, mpFT);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;
      addFlash(g, 0.026, -0.34, 0.72);
      wpn.defaultMuzzleGroup = null;
      wpn.defaultGripGroup = null;
      wpn.opticRail = { x: 0, y: 0.060, z: -0.04, parent: g, width: 0.020, isCompact: true };
      wpn.barrelRoot = { y: 0.026, rootZ: -0.23, shroudEndZ: -0.23, defaultTipZ: -0.315, radius: 0.009 };
      wpn.underRail = { x: 0, y: -0.004, z: -0.175, parent: g, laserPos: [0.021, 0.024, -0.18] };
      wpn.magWell = { x: 0, y: -0.060, z: 0.036, rotX: 0.16, width: 0.022, depth: 0.028, bottomY: -0.162, bottomZ: 0.052, isPistolMag: true };
      wpn.stockMount = { x: 0, y: 0.012, z: 0.088, faceW: 0.032, faceH: 0.038 };
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.019, y: 0.026, z: -0.09, parent: g, scale: 0.80 };
      wpn.ironEyePoint = [0, 0.0725, 0.04];
    } else if (wt === 'sawedoff') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.44, maxZ: 0.22, minY: -0.12, maxY: 0.08 };
      wpn.uvBounds = uvBounds;
      // Break-action receiver + sawed wooden/polymer grip + twin side-by-side 12-gauge barrels!
      const rec = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.046, 0.13), skinMat), uvBounds);
      rec.position.set(0, 0.018, -0.01);
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.048, 0.036);
      gripShape.lineTo(0.145, 0.008);
      gripShape.lineTo(0.175, -0.068);
      gripShape.lineTo(0.118, -0.082);
      gripShape.lineTo(0.048, -0.006);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.034, 0.004, gripMat, null));
      g.add(rec, defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;
      // Hinged break-action twin side-by-side barrels + forend + chambered 12-gauge shells!
      const breechPivot = new THREE.Group();
      breechPivot.position.set(0, 0.012, -0.072);
      const defaultBarrelGroup = new THREE.Group();
      const shellHullMat = new THREE.MeshStandardMaterial({ color: 0xc82532, roughness: 0.45, metalness: 0.08 });
      const breechShells = [];
      for (const bx of [-0.0145, 0.0145]) {
        const b = makeSkinned(new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0142, 0.34, 12), skinMat), uvBounds);
        b.rotation.x = Math.PI / 2;
        b.position.set(bx, 0.016, -0.168);
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.01, 10), gripMat);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(bx, 0.016, -0.340);
        // Rear chamber ring & visible 12-gauge shell seated inside breech
        const chamberRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0138, 0.0138, 0.010, 12), brightSteel);
        chamberRim.rotation.x = Math.PI / 2;
        chamberRim.position.set(bx, 0.016, 0.002);
        const shellGrp = new THREE.Group();
        shellGrp.position.set(bx, 0.016, -0.012);
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.046, 10), shellHullMat);
        hull.rotation.x = Math.PI / 2;
        hull.position.set(0, 0, -0.008);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0104, 0.0096, 0.014, 10), brassMat);
        head.rotation.x = Math.PI / 2;
        head.position.set(0, 0, 0.018);
        shellGrp.add(hull, head);
        breechShells.push(shellGrp);
        defaultBarrelGroup.add(b, bore, chamberRim, shellGrp);
      }
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.33), darkMetal);
      rib.position.set(0, 0.029, -0.168);
      const forend = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.024, 0.14), gripMat);
      forend.position.set(0, -0.004, -0.088);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), accentGlow);
      bead.position.set(0, 0.035, -0.318);
      defaultBarrelGroup.add(rib, forend, bead);
      breechPivot.add(defaultBarrelGroup);
      g.add(breechPivot);
      g.userData.breechPivot = breechPivot;
      g.userData.breechShells = breechShells;
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      // Top break-action latch lever + hinge pin
      const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.056, 10), brightSteel);
      hingePin.rotation.z = Math.PI / 2;
      hingePin.position.set(0, 0.012, -0.072);
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.036), brightSteel);
      latch.position.set(0, 0.044, 0.046);
      g.add(hingePin, latch);
      g.userData.breechLatch = latch;
      addFlash(g, 0.028, -0.46, 1.55);
      wpn.defaultStockGroup = null;
      wpn.defaultMuzzleGroup = null;
      wpn.defaultMagMeshGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = { x: 0, y: 0.045, z: -0.02, parent: g, width: 0.022, isCompact: true };
      wpn.barrelRoot = { y: 0.028, rootZ: -0.08, shroudEndZ: -0.22, defaultTipZ: -0.41, radius: 0.015, isShotgun: true };
      wpn.underRail = { x: 0, y: -0.006, z: -0.17, parent: g, laserPos: [0.028, 0.020, -0.18] };
      wpn.magWell = null;
      wpn.stockMount = { x: 0, y: 0.016, z: 0.055, faceW: 0.038, faceH: 0.038 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.035 };
      wpn.apexMount = { x: -0.027, y: 0.020, z: -0.02, parent: g, scale: 0.85 };
      wpn.ironEyePoint = [0, 0.050, -0.02];
    } else if (wt === 'leverslug') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.68, maxZ: 0.34, minY: -0.12, maxY: 0.09 };
      wpn.uvBounds = uvBounds;
      // Sleek tactical lever-action slug gun receiver + octagonal barrel + tubular mag + iconic finger lever loop!
      const rec = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.052, 0.19), skinMat), uvBounds);
      rec.position.set(0, 0.022, -0.02);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.006, 0.17), darkMetal);
      topRail.position.set(0, 0.051, -0.02);
      // Lever loop underneath receiver/grip (animated on bolt cycle!)
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0, -0.014, 0.035);
      const loopTop = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.006, 0.095), brightSteel);
      loopTop.position.set(0, -0.022, 0.020);
      const loopFront = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.008), brightSteel);
      loopFront.position.set(0, -0.010, -0.024);
      const loopRear = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.008), brightSteel);
      loopRear.position.set(0, -0.010, 0.064);
      boltGroup.add(loopTop, loopFront, loopRear);
      g.add(rec, topRail, boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0, -0.014, 0.035);
      // Forend + octagonal barrel + under-barrel magazine tube
      const forend = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.24), skinMat), uvBounds);
      forend.position.set(0, 0.014, -0.24);
      const defaultBarrelGroup = new THREE.Group();
      const bOct = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.54, 8), gunmetal);
      bOct.rotation.x = Math.PI / 2;
      bOct.position.set(0, 0.032, -0.38);
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.48, 10), darkMetal);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, 0.008, -0.35);
      const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.010), accentGlow);
      fSight.position.set(0, 0.048, -0.62);
      defaultBarrelGroup.add(bOct, magTube, fSight);
      g.add(forend, defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      // Classic contoured straight-grip tactical stock
      const defaultStockGroup = new THREE.Group();
      const stShape = new THREE.Shape();
      stShape.moveTo(0.072, 0.038);
      stShape.lineTo(0.325, 0.018);
      stShape.lineTo(0.332, -0.088);
      stShape.lineTo(0.140, -0.032);
      stShape.lineTo(0.072, -0.008);
      stShape.closePath();
      defaultStockGroup.add(makeSideExtrude(stShape, 0.032, 0.003, gripMat, null));
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      addFlash(g, 0.032, -0.68, 1.25);
      wpn.defaultMuzzleGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultMagMeshGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = { x: 0, y: 0.054, z: -0.02, parent: g, width: 0.020 };
      wpn.barrelRoot = { y: 0.032, rootZ: -0.12, shroudEndZ: -0.36, defaultTipZ: -0.65, radius: 0.012, isShotgun: true };
      wpn.underRail = { x: 0, y: -0.004, z: -0.26, parent: g, laserPos: [0.022, 0.018, -0.28] };
      wpn.magWell = { isShotgun: true, tubeY: 0.008, tubeTipZ: -0.59, sideSaddlePos: [-0.022, 0.022, -0.02], drumPos: [0, -0.068, -0.02] };
      wpn.stockMount = { x: 0, y: 0.016, z: 0.074, faceW: 0.034, faceH: 0.040 };
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.020, y: 0.022, z: -0.05, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.056, -0.02];
    } else if (wt === 'dmr') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.72, maxZ: 0.34, minY: -0.14, maxY: 0.12 };
      wpn.uvBounds = uvBounds;
      // MK-14 EBR Semi-Auto Marksman Sniper: skeletonized chassis, long vented rail, heavy DMR barrel, 20-rd mag & default 2.5x optic
      const rec = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.28), skinMat), uvBounds);
      rec.position.set(0, 0.026, -0.04);
      const hg = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.040, 0.30), skinMat), uvBounds);
      hg.position.set(0, 0.026, -0.32);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.007, 0.54), darkMetal);
      topRail.position.set(0, 0.055, -0.19);
      g.add(rec, hg, topRail);
      // Long match barrel + muzzle brake
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.013, 0.26, 10), gunmetal);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.030, -0.58);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.020, 0.044), brightSteel);
      brake.position.set(0, 0.030, -0.72);
      defaultMuzzleGroup.add(brake);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;
      // Precision adjustable DMR stock
      const defaultStockGroup = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.21, 10), darkMetal);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.028, 0.20);
      const cheek = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.13), skinMat), uvBounds);
      cheek.position.set(0, 0.046, 0.21);
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.108, 0.020), gripMat);
      butt.position.set(0, 0.002, 0.31);
      defaultStockGroup.add(tube, cheek, butt);
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      // Grip + 15-rd 7.62 box mag
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.030, -0.002);
      gripShape.lineTo(0.068, -0.002);
      gripShape.lineTo(0.084, -0.088);
      gripShape.lineTo(0.046, -0.094);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.028, 0.0024, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const mag = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.104, 0.070), skinMat), uvBounds);
      mag.position.set(0, -0.060, -0.095);
      defaultMagMeshGroup.add(mag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Built-in MK-14 2.5x ACOG tactical scope with glowing glass lenses (hidden when another optic is attached)
      const defaultIronsGroup = new THREE.Group();
      const scTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.17, 14), darkMetal);
      scTube.rotation.x = Math.PI / 2;
      scTube.position.set(0, 0.084, -0.06);
      const scBell = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0145, 0.042, 14), gunmetal);
      scBell.rotation.x = Math.PI / 2;
      scBell.position.set(0, 0.084, -0.16);
      const scEye = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0145, 0.028, 14), gunmetal);
      scEye.rotation.x = Math.PI / 2;
      scEye.position.set(0, 0.084, 0.032);
      const scLensMat = new THREE.MeshStandardMaterial({ color: 0x38d8ff, emissive: 0x16688a, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.85 });
      const scLensF = new THREE.Mesh(new THREE.CircleGeometry(0.0185, 14), scLensMat);
      scLensF.position.set(0, 0.084, -0.182);
      scLensF.rotation.y = Math.PI;
      const scLensR = new THREE.Mesh(new THREE.CircleGeometry(0.0145, 14), scLensMat);
      scLensR.position.set(0, 0.084, 0.047);
      const scMount = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.08), darkMetal);
      scMount.position.set(0, 0.068, -0.05);
      const scTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 10), brightSteel);
      scTurret.position.set(0, 0.100, -0.06);
      defaultIronsGroup.add(scTube, scBell, scEye, scLensF, scLensR, scMount, scTurret);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;
      addFlash(g, 0.030, -0.76, 1.15);
      wpn.opticRail = { x: 0, y: 0.058, z: -0.05, parent: g, width: 0.022 };
      wpn.barrelRoot = { y: 0.030, rootZ: -0.46, shroudEndZ: -0.47, defaultTipZ: -0.71, radius: 0.0115, isSniper: true };
      wpn.underRail = { x: 0, y: 0.005, z: -0.34, parent: g, laserPos: [0.022, 0.026, -0.36] };
      wpn.magWell = { x: 0, y: -0.010, z: -0.095, rotX: 0, width: 0.028, depth: 0.070, bottomY: -0.112, bottomZ: -0.095 };
      wpn.stockMount = { x: 0, y: 0.024, z: 0.098, faceW: 0.038, faceH: 0.044 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.029 };
      wpn.apexMount = { x: -0.022, y: 0.026, z: -0.18, parent: g, scale: 0.92 };
      wpn.ironEyePoint = [0, 0.084, 0.03];
    } else if (wt === 'scout') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.74, maxZ: 0.34, minY: -0.11, maxY: 0.12 };
      wpn.uvBounds = uvBounds;
      // Sleek lightweight SSG-08 Scout quickscope bolt-action rifle
      const chShape = new THREE.Shape();
      chShape.moveTo(0.09, 0.032);
      chShape.lineTo(-0.40, 0.030);
      chShape.lineTo(-0.42, 0.010);
      chShape.lineTo(-0.38, -0.006);
      chShape.lineTo(0.01, -0.010);
      chShape.lineTo(0.04, -0.082);
      chShape.lineTo(0.08, -0.086);
      chShape.lineTo(0.09, 0.032);
      chShape.closePath();
      g.add(makeSideExtrude(chShape, 0.032, 0.003, skinMat, uvBounds));
      // Skeletonized lightweight rear stock
      const defaultStockGroup = new THREE.Group();
      const sTop = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.020, 0.23), skinMat), uvBounds);
      sTop.position.set(0, 0.022, 0.205);
      const sLow = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.22), darkMetal);
      sLow.position.set(0, -0.026, 0.20);
      sLow.rotation.x = 0.20;
      const sPad = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.092, 0.016), gripMat);
      sPad.position.set(0, -0.008, 0.322);
      defaultStockGroup.add(sTop, sLow, sPad);
      g.add(defaultStockGroup);
      wpn.defaultStockGroup = defaultStockGroup;
      // Slim fluted sniper barrel
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0115, 0.56, 6), brightSteel);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.036, -0.44);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      // Bolt handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.018, 0.036, 0.012);
      const bStem = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.006, 0.008), brightSteel);
      bStem.position.set(0.012, -0.004, 0);
      const bKnob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), darkMetal);
      bKnob.position.set(0.026, -0.008, 0);
      boltGroup.add(bStem, bKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.018, 0.036, 0.012);
      // Slim 10-rd magazine
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.068, 0.056), darkMetal);
      mag.position.set(0, -0.038, -0.088);
      defaultMagMeshGroup.add(mag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Default Scout 4x slim optic
      const defaultIronsGroup = new THREE.Group();
      const scTube = makeSkinned(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.21, 12), skinMat), uvBounds);
      scTube.rotation.x = Math.PI / 2;
      scTube.position.set(0, 0.082, -0.06);
      const scBell = makeSkinned(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.013, 0.044, 12), skinMat), uvBounds);
      scBell.rotation.x = Math.PI / 2;
      scBell.position.set(0, 0.082, -0.18);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.024, 0.014), darkMetal);
      r1.position.set(0, 0.062, -0.01);
      const r2 = r1.clone();
      r2.position.z = -0.11;
      defaultIronsGroup.add(scTube, scBell, r1, r2);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;
      addFlash(g, 0.036, -0.75, 1.0);
      wpn.defaultMuzzleGroup = null;
      wpn.defaultGripGroup = null;
      wpn.opticRail = { x: 0, y: 0.050, z: -0.05, parent: g, width: 0.020 };
      wpn.barrelRoot = { y: 0.036, rootZ: -0.16, shroudEndZ: -0.41, defaultTipZ: -0.72, radius: 0.010, isSniper: true };
      wpn.underRail = { x: 0, y: -0.008, z: -0.28, parent: g, laserPos: [0.020, 0.020, -0.30] };
      wpn.magWell = { x: 0, y: -0.008, z: -0.088, rotX: 0, width: 0.022, depth: 0.056, bottomY: -0.072, bottomZ: -0.088 };
      wpn.stockMount = { x: 0, y: 0.018, z: 0.090, faceW: 0.030, faceH: 0.036 };
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.018, y: 0.020, z: -0.16, parent: g, scale: 0.86 };
      wpn.ironEyePoint = [0, 0.082, 0.048];
    } else if (wt === 'g18') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.22, maxZ: 0.09, minY: -0.15, maxY: 0.06 };
      wpn.uvBounds = uvBounds;
      // Compact G-18 full-auto machine pistol with vented top slide & extended 33-rd stick magazine
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.175), gripMat);
      frame.position.set(0, 0.008, -0.045);
      const slideGroup = new THREE.Group();
      const slide = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.026, 0.190), skinMat), uvBounds);
      slide.position.set(0, 0.028, -0.048);
      const selector = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.012), accentGlow);
      selector.position.set(-0.016, 0.028, 0.022);
      slideGroup.add(slide, selector);
      g.add(frame, slideGroup);
      g.userData.slideGroup = slideGroup;
      // Grip + extended stick mag protruding below grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.092, 0.040), gripMat);
      grip.position.set(0, -0.046, 0.028);
      grip.rotation.x = 0.24;
      g.add(grip);
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const extMag = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.135, 0.028), skinMat), uvBounds);
      extMag.position.set(0, -0.082, 0.036);
      extMag.rotation.x = 0.24;
      defaultMagMeshGroup.add(extMag);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      // Barrel tip
      const defaultBarrelGroup = new THREE.Group();
      const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.0075, 0.05, 10), brightSteel);
      bCyl.rotation.x = Math.PI / 2;
      bCyl.position.set(0, 0.028, -0.155);
      defaultBarrelGroup.add(bCyl);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;
      addFlash(g, 0.028, -0.20, 0.65);
      wpn.defaultStockGroup = null;
      wpn.defaultMuzzleGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = { x: 0, y: 0.042, z: -0.01, parent: slideGroup, width: 0.020, isCompact: true };
      wpn.barrelRoot = { y: 0.028, rootZ: -0.14, shroudEndZ: -0.14, defaultTipZ: -0.18, radius: 0.007, isPistol: true };
      wpn.underRail = { x: 0, y: -0.006, z: -0.105, parent: g, isPistolRail: true, laserPos: [0, -0.012, -0.105] };
      wpn.magWell = { x: 0, y: -0.052, z: 0.030, rotX: 0.24, width: 0.020, depth: 0.028, bottomY: -0.146, bottomZ: 0.052, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.015, y: 0.008, z: -0.08, parent: g, scale: 0.65 };
      wpn.ironEyePoint = [0, 0.046, 0.035];
    } else if (wt === 'usps') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.35, maxZ: 0.10, minY: -0.12, maxY: 0.06 };
      wpn.uvBounds = uvBounds;
      // USP-S Ghost Spec-Ops Silenced Tactical Pistol (sculpted polymer frame, open trigger guard, beveled serrated slide, thick tactical suppressor)
      const frameShape = new THREE.Shape();
      frameShape.moveTo(-0.128, 0.018);
      frameShape.lineTo(0.055, 0.018);
      frameShape.lineTo(0.078, 0.010); // beaver-tail tang
      frameShape.lineTo(0.062, -0.006);
      frameShape.lineTo(0.076, -0.094); // ergonomic rear grip spine
      frameShape.lineTo(0.030, -0.100); // grip heel
      frameShape.lineTo(0.014, -0.026); // front strap into guard
      frameShape.lineTo(-0.042, -0.026); // under trigger guard
      frameShape.lineTo(-0.050, 0.001); // dust cover front step
      frameShape.lineTo(-0.124, 0.001);
      frameShape.closePath();
      const frameExtrude = makeSideExtrude(frameShape, 0.025, 0.0022, gripMat, null);
      // Hollow trigger-guard window accent + metallic curved trigger + exposed hammer
      const trigGuardBot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.048), darkMetal);
      trigGuardBot.position.set(0, -0.024, -0.016);
      const trigGuardFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.024, 0.006), darkMetal);
      trigGuardFront.position.set(0, -0.012, -0.039);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.019, 0.006), brightSteel);
      trigger.position.set(0, -0.009, -0.010);
      trigger.rotation.x = 0.24;
      const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.012), brightSteel);
      hammer.position.set(0, 0.025, 0.052);
      hammer.rotation.x = -0.35;
      const gripPanelsL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.068, 0.030), darkMetal);
      gripPanelsL.position.set(-0.0135, -0.055, 0.044);
      gripPanelsL.rotation.x = 0.16;
      const gripPanelsR = gripPanelsL.clone();
      gripPanelsR.position.x = 0.0135;
      const underRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.005, 0.062), darkMetal);
      underRail.position.set(0, -0.002, -0.088);
      g.add(frameExtrude, trigGuardBot, trigGuardFront, trigger, hammer, gripPanelsL, gripPanelsR, underRail);

      // Sculpted beveled slide with rear & front cocking serrations, ejection port, and open suppressor-height 3-dot tritium sights
      const slideGroup = new THREE.Group();
      const slideLower = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.020, 0.184), skinMat), uvBounds);
      slideLower.position.set(0, 0.028, -0.040);
      const slideCrown = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.007, 0.182), skinMat), uvBounds);
      slideCrown.position.set(0, 0.040, -0.040);
      const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.011, 0.034), brightSteel);
      ejectPort.position.set(0.007, 0.036, -0.032);
      slideGroup.add(slideLower, slideCrown, ejectPort);
      for (let i = 0; i < 6; i++) {
        const ser = new THREE.Mesh(new THREE.BoxGeometry(0.0285, 0.013, 0.0022), darkMetal);
        ser.position.set(0, 0.028, 0.020 + i * 0.0046);
        slideGroup.add(ser);
      }
      // Open-notch suppressor-height rear sight (left & right ears with glowing tritium dots) + glowing front post
      const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.0048, 0.010, 0.008), darkMetal);
      rSightL.position.set(-0.0068, 0.048, 0.042);
      const rSightR = rSightL.clone();
      rSightR.position.x = 0.0068;
      const rDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0022, 0.002), accentGlow);
      rDotL.position.set(-0.0068, 0.049, 0.0465);
      const rDotR = rDotL.clone();
      rDotR.position.x = 0.0068;
      const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.011, 0.008), darkMetal);
      fSight.position.set(0, 0.0485, -0.124);
      const fDot = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0024, 0.0022), accentGlow);
      fDot.position.set(0, 0.050, -0.1195);
      slideGroup.add(rSightL, rSightR, rDotL, rDotR, fSight, fDot);
      g.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // Thick matte tactical Osprey/KAC cylindrical suppressor aligned cleanly on bore axis
      const defaultBarrelGroup = new THREE.Group();
      const threadCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 12), brightSteel);
      threadCollar.rotation.x = Math.PI / 2;
      threadCollar.position.set(0, 0.031, -0.136);
      const supBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0162, 0.0162, 0.165, 16), darkMetal);
      supBody.rotation.x = Math.PI / 2;
      supBody.position.set(0, 0.031, -0.224);
      const supRing1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0170, 0.0170, 0.010, 16), gunmetal);
      supRing1.rotation.x = Math.PI / 2;
      supRing1.position.set(0, 0.031, -0.155);
      const supRing2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0168, 0.0168, 0.006, 16), accentGlow);
      supRing2.rotation.x = Math.PI / 2;
      supRing2.position.set(0, 0.031, -0.285);
      const supBore = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.008, 12), gripMat);
      supBore.rotation.x = Math.PI / 2;
      supBore.position.set(0, 0.031, -0.308);
      defaultBarrelGroup.add(threadCollar, supBody, supRing1, supRing2, supBore);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Flush-fit tactical magazine floorplate
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.080, 0.030), darkMetal);
      magBody.position.set(0, -0.056, 0.044);
      magBody.rotation.x = 0.16;
      const magPad = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.010, 0.042), gunmetal);
      magPad.position.set(0, -0.098, 0.052);
      magPad.rotation.x = 0.16;
      defaultMagMeshGroup.add(magBody, magPad);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;
      addFlash(g, 0.031, -0.32, 0.22);
      wpn.defaultStockGroup = null;
      wpn.defaultMuzzleGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = { x: 0, y: 0.044, z: -0.006, parent: slideGroup, width: 0.020, isCompact: true };
      wpn.barrelRoot = { y: 0.031, rootZ: -0.132, shroudEndZ: -0.132, defaultTipZ: -0.308, radius: 0.015, isPistol: true };
      wpn.underRail = { x: 0, y: -0.005, z: -0.090, parent: g, isPistolRail: true, laserPos: [0, -0.011, -0.090] };
      wpn.magWell = { x: 0, y: -0.054, z: 0.044, rotX: 0.16, width: 0.019, depth: 0.030, bottomY: -0.099, bottomZ: 0.052, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = null;
      wpn.apexMount = { x: -0.014, y: 0.008, z: -0.072, parent: g, scale: 0.62 };
      wpn.ironEyePoint = [0, 0.050, 0.042];
    } else if (wt === 'akimbo') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.22, maxZ: 0.08, minY: -0.11, maxY: 0.06 };
      wpn.uvBounds = uvBounds;
      // Dual-Wield Akimbo VX-Pistols (Right pistol at origin in right hand, Left mirrored pistol offset to -X for left hand!)
      const makeSinglePistol = (sideSign) => {
        const pg = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.021, 0.175), gripMat);
        frame.position.set(0, 0.008, -0.045);
        const slide = makeSkinned(new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.025, 0.188), skinMat), uvBounds);
        slide.position.set(0, 0.027, -0.048);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.0075, 0.04, 10), brightSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.027, -0.150);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.090, 0.040), gripMat);
        grip.position.set(0, -0.046, 0.026);
        grip.rotation.x = 0.22;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.029, 0.004, 0.12), accentGlow);
        stripe.position.set(0, 0.022, -0.05);
        const fg = new THREE.Group();
        const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), flashMat);
        s1.scale.set(1.2, 1.2, 2.0);
        fg.add(s1);
        fg.position.set(0, 0.027, -0.195);
        fg.visible = false;
        pg.add(frame, slide, barrel, grip, stripe, fg);
        pg.userData.slide = slide;
        pg.userData.flash = fg;
        pg.userData.side = sideSign;
        return pg;
      };
      const rightGun = makeSinglePistol(1);
      const leftGun = makeSinglePistol(-1);
      leftGun.position.set(-0.27, 0.0, 0.0);
      g.add(rightGun, leftGun);
      g.userData.akimboRight = rightGun;
      g.userData.akimboLeft = leftGun;
      g.userData.muzzleFlash = rightGun.userData.flash;
      g.userData.muzzleFlashLeft = leftGun.userData.flash;
      wpn.defaultStockGroup = null;
      wpn.defaultBarrelGroup = null;
      wpn.defaultMuzzleGroup = null;
      wpn.defaultMagMeshGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.opticRail = null;
      wpn.barrelRoot = { y: 0.027, rootZ: -0.14, shroudEndZ: -0.14, defaultTipZ: -0.17, radius: 0.007, isPistol: true };
      wpn.ironEyePoint = [-0.135, 0.048, 0.02];
    } else if (wt === 'katana') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.82, maxZ: 0.24, minY: -0.05, maxY: 0.07 };
      wpn.uvBounds = uvBounds;
      // Primary Ronin Katana: Refined authentic proportions (sleek ornate tsuba, tight diamond-wrapped tsuka, razor curved shinogi-zukuri blade + glowing deflect edge!)
      const tsuka = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.026, 0.23), gripMat);
      tsuka.position.set(0, 0, 0.112);
      g.add(tsuka);
      for (let i = 0; i < 8; i++) {
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.0215, 0.0285, 0.012), darkMetal);
        wrap.position.set(0, 0, 0.020 + i * 0.026);
        wrap.rotation.x = i % 2 === 0 ? 0.24 : -0.24;
        g.add(wrap);
      }
      const kashira = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.030, 0.018), brassMat);
      kashira.position.set(0, 0, 0.232);
      const fuchi = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.030, 0.014), brassMat);
      fuchi.position.set(0, 0, -0.006);
      // Refined sleek oval/round Tsuba handguard (not oversized!)
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.0055, 20), brassMat);
      tsuba.rotation.x = Math.PI / 2;
      tsuba.scale.set(0.86, 1.0, 1.08);
      tsuba.position.set(0, 0, -0.016);
      const tsubaCore = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.007, 16), darkMetal);
      tsubaCore.rotation.x = Math.PI / 2;
      tsubaCore.scale.set(0.86, 1.0, 1.08);
      tsubaCore.position.set(0, 0, -0.016);
      const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.026, 0.026), brassMat);
      habaki.position.set(0, 0.001, -0.032);
      g.add(kashira, fuchi, tsuba, tsubaCore, habaki);

      // Gently curved forged Katana blade with skinMat for full camo coverage
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.040, -0.011);
      bladeShape.quadraticCurveTo(-0.42, -0.004, -0.78, 0.024);
      bladeShape.lineTo(-0.835, 0.042);
      bladeShape.quadraticCurveTo(-0.42, 0.020, -0.040, 0.014);
      bladeShape.closePath();
      const bladeMesh = makeSideExtrude(bladeShape, 0.0048, 0.0010, skinMat, uvBounds);
      // Razor hamon edge highlight
      const edgeShape = new THREE.Shape();
      edgeShape.moveTo(-0.046, -0.012);
      edgeShape.quadraticCurveTo(-0.42, -0.006, -0.782, 0.022);
      edgeShape.lineTo(-0.836, 0.042);
      edgeShape.quadraticCurveTo(-0.42, 0.001, -0.046, -0.005);
      edgeShape.closePath();
      const edgeMesh = makeSideExtrude(edgeShape, 0.0022, 0.0005, brightSteel, null);
      g.add(bladeMesh, edgeMesh);

      // Sleek blade-aligned cyan energy sheath for RMB Deflect (no giant goofy sideways ring!)
      const deflectMat = new THREE.MeshBasicMaterial({
        color: 0x4ef4ff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const deflectAura = makeSideExtrude(bladeShape, 0.011, 0.002, deflectMat, null);
      deflectAura.scale.set(1.04, 1.32, 1.01);
      g.add(deflectAura);

      g.userData.deflectAura = deflectAura;
      g.userData.isKatana = true;
      wpn.defaultStockGroup = null;
      wpn.defaultBarrelGroup = null;
      wpn.defaultMuzzleGroup = null;
      wpn.defaultMagMeshGroup = null;
      wpn.defaultGripGroup = null;
      wpn.defaultIronsGroup = null;
      wpn.ironEyePoint = [0, 0.036, -0.10];
    } else if (wt === 'rpg') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.78, maxZ: 0.42, minY: -0.14, maxY: 0.14 };
      wpn.uvBounds = uvBounds;
      // RPG-7 Rocket Launcher: olive/gunmetal tube, flared venturi exhaust, wood/polymer heatshield, conical PG-7 warhead!
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.92, 16), gunmetal);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.036, -0.06);
      const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.34, 14), new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.72, metalness: 0.10 }));
      heatShield.rotation.x = Math.PI / 2;
      heatShield.position.set(0, 0.036, -0.04);
      const coneRear = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.048, 0.16, 14), darkMetal);
      coneRear.rotation.x = Math.PI / 2;
      coneRear.position.set(0, 0.036, 0.44);
      // PG-7 Warhead loaded in front muzzle!
      const warheadMat = new THREE.MeshStandardMaterial({ color: 0x3b4d35, roughness: 0.45, metalness: 0.38 });
      const whStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 12), darkMetal);
      whStem.rotation.x = Math.PI / 2;
      whStem.position.set(0, 0.036, -0.56);
      const whConeBack = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.024, 0.11, 16), warheadMat);
      whConeBack.rotation.x = Math.PI / 2;
      whConeBack.position.set(0, 0.036, -0.66);
      const whConeTip = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.15, 16), warheadMat);
      whConeTip.rotation.x = -Math.PI / 2;
      whConeTip.position.set(0, 0.036, -0.79);
      const whCap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.035, 10), new THREE.MeshBasicMaterial({ color: 0xff5a36 }));
      whCap.rotation.x = Math.PI / 2;
      whCap.position.set(0, 0.036, -0.87);
      // Front & rear grips + ladder sight
      const gripR = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.092, 0.036), gripMat);
      gripR.position.set(0, -0.040, 0.032);
      gripR.rotation.x = 0.18;
      const gripF = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.082, 0.032), gripMat);
      gripF.position.set(0, -0.038, -0.22);
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.055, 0.010), darkMetal);
      sight.position.set(0, 0.088, -0.28);
      g.add(tube, heatShield, coneRear, whStem, whConeBack, whConeTip, whCap, gripR, gripF, sight);
      addFlash(g, 0.036, -0.90, 1.9);
      wpn.ironEyePoint = [0, 0.095, -0.10];
    } else if (wt === 'minigun') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.78, maxZ: 0.24, minY: -0.18, maxY: 0.14 };
      wpn.uvBounds = uvBounds;
      // M-134 Rotary Minigun: Sleek low-slung heavy Gatling — ribbed motor housing, ventilated shroud, angled brass feed chute, 6-barrel cluster & LOW-LEFT side support bar (keeps left arm completely below center sightline!)
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.060, 0.26, 12), darkMetal);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(0, -0.015, -0.03);
      const housingCap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.045, 12), gunmetal);
      housingCap.rotation.x = Math.PI / 2;
      housingCap.position.set(0, -0.015, 0.115);
      // Cooling fins & cyan power strips along housing
      for (const rz of [-0.11, -0.04, 0.03]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.014, 12), gunmetal);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, -0.015, rz);
        g.add(ring);
      }
      const pwrStripL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.18), accentGlow);
      pwrStripL.position.set(-0.059, 0.008, -0.03);
      const pwrStripR = pwrStripL.clone();
      pwrStripR.position.x = 0.059;
      // Compact underside cylindrical ammo drum + brass feed chute (tucked cleanly underneath!)
      const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.11, 14), darkMetal);
      ammoDrum.rotation.z = Math.PI / 2;
      ammoDrum.position.set(-0.042, -0.088, -0.04);
      const feedChute = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.046, 0.064), gunmetal);
      feedChute.position.set(-0.044, -0.046, -0.04);
      feedChute.rotation.z = 0.35;
      for (let b = 0; b < 4; b++) {
        const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.030, 6), brassMat);
        bullet.rotation.z = Math.PI / 2;
        bullet.position.set(-0.048, -0.064 + b * 0.012, -0.04);
        g.add(bullet);
      }
      // LOW-LEFT side support grip bar (below barrel centerline so left arm enters cleanly from bottom-left!)
      const sideBarMountF = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.012, 0.014), gunmetal);
      sideBarMountF.position.set(-0.054, -0.024, -0.22);
      const sideBarMountR = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.012, 0.014), gunmetal);
      sideBarMountR.position.set(-0.054, -0.024, -0.09);
      const sideGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.145, 10), gripMat);
      sideGrip.rotation.x = Math.PI / 2;
      sideGrip.position.set(-0.074, -0.024, -0.155);
      // Rear spade/pistol trigger grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.086, 0.036), gripMat);
      grip.position.set(0, -0.048, 0.140);
      grip.rotation.x = 0.22;
      g.add(housing, housingCap, pwrStripL, pwrStripR, ammoDrum, feedChute, sideBarMountF, sideBarMountR, sideGrip, grip);
      // Rotating 6-barrel cluster with ventilated muzzle clamps
      const rotaryBarrels = new THREE.Group();
      rotaryBarrels.position.set(0, -0.015, -0.42);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0082, 0.54, 8), brightSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(Math.cos(a) * 0.030, Math.sin(a) * 0.030, 0);
        rotaryBarrels.add(barrel);
      }
      for (const cz of [-0.24, -0.06, 0.14]) {
        const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.020, 16), gunmetal);
        clamp.rotation.x = Math.PI / 2;
        clamp.position.set(0, 0, cz);
        rotaryBarrels.add(clamp);
      }
      const muzzleGlow = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.0032, 8, 18), accentGlow);
      muzzleGlow.position.set(0, 0, -0.25);
      rotaryBarrels.add(muzzleGlow);
      g.add(rotaryBarrels);
      g.userData.rotaryBarrels = rotaryBarrels;
      addFlash(g, -0.015, -0.72, 1.45);
      wpn.ironEyePoint = [0, 0.048, -0.08];
    } else if (wt === 'railcannon') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.78, maxZ: 0.28, minY: -0.14, maxY: 0.12 };
      wpn.uvBounds = uvBounds;
      // Hyper-Rail Plasma Cannon: split electromagnetic twin rails + pulsing cyan/violet plasma accelerator coils!
      const coreBody = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.072, 0.34), darkMetal);
      coreBody.position.set(0, 0.022, -0.04);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.086, 0.18), gunmetal);
      stock.position.set(0, 0.010, 0.20);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.092, 0.038), gripMat);
      grip.position.set(0, -0.048, 0.05);
      grip.rotation.x = 0.18;
      // Twin split parallel electromagnetic rails
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.56), gunmetal);
      railTop.position.set(0, 0.054, -0.46);
      const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.56), gunmetal);
      railBot.position.set(0, 0.002, -0.46);
      const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x54f0ff });
      const plasmaCore = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.52, 10), plasmaMat);
      plasmaCore.rotation.x = Math.PI / 2;
      plasmaCore.position.set(0, 0.028, -0.44);
      g.add(coreBody, stock, grip, railTop, railBot, plasmaCore);
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 8, 16), new THREE.MeshBasicMaterial({ color: 0xb066ff }));
        coil.position.set(0, 0.028, -0.25 - i * 0.13);
        g.add(coil);
      }
      addFlash(g, 0.028, -0.78, 1.8);
      wpn.ironEyePoint = [0, 0.078, -0.04];
    } else if (wt === 'grenadelauncher') {
      while (g.children.length) g.remove(g.children[0]);
      const uvBounds = { minZ: -0.58, maxZ: 0.28, minY: -0.14, maxY: 0.12 };
      wpn.uvBounds = uvBounds;
      // MGL-6 Ricochet 40mm Rotary Grenade Launcher
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.34), darkMetal);
      frameTop.position.set(0, 0.068, -0.08);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.029, 0.30, 14), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.028, -0.36);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.012, 12), gripMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(0, 0.028, -0.512);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.092, 0.038), gripMat);
      grip.position.set(0, -0.048, 0.055);
      grip.rotation.x = 0.20;
      const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.088, 10), gripMat);
      foregrip.position.set(0, -0.040, -0.30);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.082, 0.20), gripMat);
      stock.position.set(0, 0.012, 0.18);
      // 6-chamber revolving 40mm drum
      const drumGroup = new THREE.Group();
      drumGroup.position.set(0, 0.010, -0.10);
      const drumHub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.125, 16), darkMetal);
      drumHub.rotation.x = Math.PI / 2;
      drumGroup.add(drumHub);
      const goldShell = new THREE.MeshStandardMaterial({ color: 0xffb84d, roughness: 0.32, metalness: 0.72 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.130, 10), gunmetal);
        ch.rotation.x = Math.PI / 2;
        ch.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), goldShell);
        nose.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, -0.064);
        drumGroup.add(ch, nose);
      }
      g.add(frameTop, barrel, bore, grip, foregrip, stock, drumGroup);
      g.userData.drumGroup = drumGroup;
      addFlash(g, 0.028, -0.54, 1.45);
      wpn.ironEyePoint = [0, 0.088, -0.02];
    }

    // ---------- Modular Exact-Fit 3D Gunsmith Attachments (All Firearms × 8 Slots) ----------
    const uvBounds = wpn.uvBounds;
    const attGroup = new THREE.Group();
    attGroup.name = 'gunsmithAttachments';
    wpn.attachParent.add(attGroup);

    const br = wpn.barrelRoot || { y: 0.020, rootZ: -0.34, shroudEndZ: -0.35, defaultTipZ: -0.58, radius: 0.011 };
    let barrelTipZ = br.defaultTipZ;

    // 1) Barrel replacement (swaps default barrel cleanly — zero clipping or floating!)
    if (atts.barrel && wpn.defaultBarrelGroup) {
      wpn.defaultBarrelGroup.visible = false;
      if (wpn.defaultMuzzleGroup) wpn.defaultMuzzleGroup.visible = false;

      if (atts.barrel === 'short_cqb') {
        const len = br.isPistol ? 0.022 : br.isShotgun ? 0.340 : br.isSniper ? 0.420 : br.isAk ? 0.145 : 0.078;
        barrelTipZ = br.rootZ - len;
        const cqbCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.96, br.radius * 1.06, len, 10),
          gunmetal
        );
        cqbCyl.rotation.x = Math.PI / 2;
        cqbCyl.position.set(0, br.y, br.rootZ - len * 0.5);
        const crown = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.25, br.radius * 1.25, 0.016, 10),
          darkMetal
        );
        crown.rotation.x = Math.PI / 2;
        crown.position.set(0, br.y, barrelTipZ + 0.006);
        attGroup.add(cqbCyl, crown);

        if (br.isAk) {
          // Compact Krinkov gas block + hooded front sight flush on short barrel
          const gTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.068, 8), darkMetal);
          gTube.rotation.x = Math.PI / 2;
          gTube.position.set(0, 0.044, br.rootZ - 0.034);
          const gSight = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.044, 0.024), darkMetal);
          gSight.position.set(0, 0.042, barrelTipZ + 0.036);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.036);
          attGroup.add(gTube, gSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.017, barrelTipZ + 0.014);
          attGroup.add(bead);
        }
      } else if (atts.barrel === 'fluted_light') {
        barrelTipZ = br.defaultTipZ - (br.isPistol ? 0.022 : 0.032);
        const len = Math.abs(barrelTipZ - br.rootZ);
        const flutedCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.94, br.radius * 1.04, len, 6),
          brightSteel
        );
        flutedCyl.rotation.x = Math.PI / 2;
        flutedCyl.position.set(0, br.y, (br.rootZ + barrelTipZ) * 0.5);
        attGroup.add(flutedCyl);

        // Tactical barrel stabilizer rings along fluted barrel
        const ringCount = br.isPistol ? 1 : 2;
        for (let i = 1; i <= ringCount; i++) {
          const rz = THREE.MathUtils.lerp(br.shroudEndZ, barrelTipZ, i / (ringCount + 0.5));
          const ring = new THREE.Mesh(
            new THREE.CylinderGeometry(br.radius * 1.18, br.radius * 1.18, 0.014, 8),
            darkMetal
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, br.y, rz);
          attGroup.add(ring);
        }
        if (br.isAk) {
          const gTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.115, 8), darkMetal);
          gTube.rotation.x = Math.PI / 2;
          gTube.position.set(0, 0.044, -0.365);
          const gBlk = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.034, 0.024), darkMetal);
          gBlk.position.set(0, 0.034, -0.422);
          gBlk.rotation.x = 0.35;
          const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.018), darkMetal);
          fSight.position.set(0, 0.042, barrelTipZ + 0.035);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.035);
          attGroup.add(gTube, gBlk, fSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.017, barrelTipZ + 0.016);
          attGroup.add(bead);
        }
      } else if (atts.barrel === 'heavy_long') {
        barrelTipZ = br.defaultTipZ - (br.isPistol ? 0.056 : 0.105);
        const len = Math.abs(barrelTipZ - br.rootZ);
        const heavyCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.12, br.radius * 1.18, len, 10),
          gunmetal
        );
        heavyCyl.rotation.x = Math.PI / 2;
        heavyCyl.position.set(0, br.y, (br.rootZ + barrelTipZ) * 0.5);
        attGroup.add(heavyCyl);

        // Skin-mapped heavy vented barrel shroud extending flush from receiver/handguard nose!
        const shroudLen = br.isPistol ? 0.042 : br.isSniper ? 0.165 : br.isShotgun ? 0.175 : 0.135;
        const shroudW = br.isPistol ? 0.026 : 0.034;
        const shroudH = br.isPistol ? 0.028 : 0.034;
        const shroudZ = br.shroudEndZ - shroudLen * 0.5 + 0.004;
        const shroudMesh = makeSkinned(
          new THREE.Mesh(new THREE.BoxGeometry(shroudW, shroudH, shroudLen), skinMat),
          uvBounds
        );
        shroudMesh.position.set(0, br.y, shroudZ);
        makeSkinned(shroudMesh, uvBounds);
        attGroup.add(shroudMesh);

        // Tactical dark cooling vents along shroud sides
        const ventCount = br.isPistol ? 2 : 4;
        for (let i = 0; i < ventCount; i++) {
          const vz = shroudZ + shroudLen * 0.34 - (i / Math.max(1, ventCount - 1)) * shroudLen * 0.68;
          const v = new THREE.Mesh(new THREE.BoxGeometry(shroudW + 0.003, 0.006, 0.012), gripMat);
          v.position.set(0, br.y, vz);
          attGroup.add(v);
        }
        if (br.isAk) {
          const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.018), darkMetal);
          fSight.position.set(0, 0.042, barrelTipZ + 0.035);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.035);
          attGroup.add(fSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.018, barrelTipZ + 0.016);
          attGroup.add(bead);
        }
      }

      // If barrel was swapped and NO muzzle attachment is equipped, add clean threaded muzzle cap
      if (!atts.muzzle) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.14, br.radius * 1.14, 0.018, 10),
          darkMetal
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.set(0, br.y, barrelTipZ - 0.006);
        const bore = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.68, br.radius * 0.68, 0.006, 8),
          gripMat
        );
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, barrelTipZ - 0.015);
        attGroup.add(cap, bore);
      }
    }

    // 2) Muzzle attachment (always seats flush onto exact barrelTipZ & true bore br.y; tactical hardware)
    let flashZ = barrelTipZ - 0.045;
    let flashScaleMul = 1.0;
    if (atts.muzzle) {
      if (wpn.defaultMuzzleGroup) wpn.defaultMuzzleGroup.visible = false;
      const mzZ = barrelTipZ;
      if (atts.muzzle === 'suppressor') {
        const supLen = br.isPistol ? 0.145 : br.isSniper ? 0.215 : 0.180;
        const supRad = br.isShotgun ? 0.0195 : br.isPistol ? 0.0135 : 0.0165;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(supRad * 1.06, supRad * 1.06, 0.022, 12), gunmetal);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, br.y, mzZ - 0.003);
        const sup = new THREE.Mesh(new THREE.CylinderGeometry(supRad, supRad, supLen, 12), darkMetal);
        sup.rotation.x = Math.PI / 2;
        sup.position.set(0, br.y, mzZ - supLen * 0.5 + 0.008);
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(supRad * 0.55, supRad * 0.55, 0.006, 10), gripMat);
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(0, br.y, mzZ - supLen + 0.007);
        attGroup.add(collar, sup, endCap);
        flashZ = mzZ - supLen - 0.012;
        flashScaleMul = 0.28;
      } else if (atts.muzzle === 'compensator') {
        const compLen = br.isPistol ? 0.044 : 0.056;
        const compW = br.isPistol ? 0.020 : 0.024;
        const comp = new THREE.Mesh(new THREE.BoxGeometry(compW, compW, compLen), gunmetal);
        comp.position.set(0, br.y, mzZ - compLen * 0.45);
        const port1 = new THREE.Mesh(new THREE.BoxGeometry(compW + 0.002, 0.007, 0.012), darkMetal);
        port1.position.set(0, br.y + compW * 0.34, mzZ - compLen * 0.36);
        const port2 = port1.clone();
        port2.position.z = mzZ - compLen * 0.68;
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(br.radius * 0.72, br.radius * 0.72, 0.008, 8), gripMat);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, mzZ - compLen * 0.94);
        attGroup.add(comp, port1, port2, bore);
        flashZ = mzZ - compLen - 0.018;
      } else if (atts.muzzle === 'muzzle_brake') {
        const mbLen = br.isPistol ? 0.048 : 0.064;
        const mbW = br.isPistol ? 0.026 : 0.034;
        const mbH = br.isPistol ? 0.020 : 0.024;
        const mb = new THREE.Mesh(new THREE.BoxGeometry(mbW, mbH, mbLen), brightSteel);
        mb.position.set(0, br.y, mzZ - mbLen * 0.46);
        for (const frac of [0.28, 0.64]) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(mbW + 0.003, mbH * 0.46, 0.011), darkMetal);
          slot.position.set(0, br.y, mzZ - mbLen * frac);
          attGroup.add(slot);
        }
        attGroup.add(mb);
        flashZ = mzZ - mbLen - 0.020;
      } else if (atts.muzzle === 'choke_tight') {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.0175, 0.072, 10), brightSteel);
        ch.rotation.x = Math.PI / 2;
        ch.position.set(0, br.y, mzZ - 0.030);
        const teeth = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.017, 0.018, 8), darkMetal);
        teeth.rotation.x = Math.PI / 2;
        teeth.position.set(0, br.y, mzZ - 0.066);
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10), gripMat);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, mzZ - 0.074);
        attGroup.add(ch, teeth, bore);
        flashZ = mzZ - 0.088;
      }
    }
    if (g.userData.muzzleFlash) {
      g.userData.muzzleFlash.position.set(0, br.y, flashZ);
      g.userData.muzzleFlash.scale.setScalar(flashScaleMul);
    }

    // 3) Optics (skin-mapped outer hoods/tubes + tactical rails, clamps & lenses; handles AWP iron_snipe!)
    const opticRedMat = new THREE.MeshBasicMaterial({ color: 0xff3b52 });
    const opticHoloMat = new THREE.MeshBasicMaterial({ color: 0x38f2ff });
    const opticGlassMat = new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
    const or = wpn.opticRail || { x: 0, y: 0.055, z: -0.03, parent: attGroup, width: 0.022 };
    const opticParent = or.parent === g ? attGroup : (or.parent || attGroup);
    const ox = or.x, oy = or.y, oz = or.z;
    let opticEyePoint = new THREE.Vector3(wpn.ironEyePoint[0], wpn.ironEyePoint[1], wpn.ironEyePoint[2]);

    if (atts.optic) {
      // Hide default irons when mounting a non-iron optic so sights never clip through optic glass
      if (wpn.defaultIronsGroup && atts.optic !== 'iron_snipe') {
        wpn.defaultIronsGroup.visible = false;
      }
      // On AWP, hide built-in sniper scope unless using default/sniper_4x/sniper_var
      if (wt === 'awp' && wpn.defaultScopeGroup && atts.optic !== 'sniper_4x' && atts.optic !== 'sniper_var') {
        wpn.defaultScopeGroup.visible = false;
      }
      // On V-47 AK-47, build authentic left-side dovetail cantilever Picatinny mount so optics never float above curved dust cover!
      if (or.needsAkMount) {
        const sideArm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.044, 0.072), darkMetal);
        sideArm.position.set(-0.025, 0.036, oz);
        const topBridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.006, 0.108), darkMetal);
        topBridge.position.set(-0.010, oy - 0.003, oz);
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.112), gunmetal);
        topRail.position.set(0, oy - 0.001, oz);
        attGroup.add(sideArm, topBridge, topRail);
      }

      if (atts.optic === 'iron_snipe') {
        // Low-profile folding tactical peep irons for AWP CQB quickscoping
        const rz = or.rearIronZ || 0.038;
        const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.018), darkMetal);
        rearBase.position.set(0, oy + 0.003, rz);
        const rearRingL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.015, 0.008), gunmetal);
        rearRingL.position.set(-0.007, oy + 0.012, rz);
        const rearRingR = rearRingL.clone();
        rearRingR.position.x = 0.007;
        const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0024, 0.002), accentGlow);
        rearDotL.position.set(-0.007, oy + 0.013, rz + 0.005);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.007;

        const fz = Math.max(barrelTipZ + 0.045, -0.58);
        const fClamp = new THREE.Mesh(new THREE.CylinderGeometry(br.radius * 1.25, br.radius * 1.25, 0.022, 10), darkMetal);
        fClamp.rotation.x = Math.PI / 2;
        fClamp.position.set(0, br.y, fz);
        const fTower = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.014), darkMetal);
        fTower.position.set(0, br.y + 0.020, fz);
        const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.011, 0.003), accentGlow);
        fPost.position.set(0, br.y + 0.036, fz);
        attGroup.add(rearBase, rearRingL, rearRingR, rearDotL, rearDotR, fClamp, fTower, fPost);
        opticEyePoint.set(0, oy + 0.012, rz);
      } else if (atts.optic === 'reflex_dot') {
        const s = or.isCompact ? 0.78 : 1.0;
        const baseH = 0.007 * s;
        const winH = 0.022 * s;
        const winW = 0.024 * s;
        const base = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.003, baseH, 0.044 * s), darkMetal);
        base.position.set(ox, oy + baseH * 0.5, oz);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.0036 * s, winH, 0.016 * s), skinMat);
        postL.position.set(ox - winW * 0.5, oy + baseH + winH * 0.5, oz);
        makeSkinned(postL, uvBounds);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.0036 * s, winH, 0.016 * s), skinMat);
        postR.position.set(ox + winW * 0.5, oy + baseH + winH * 0.5, oz);
        makeSkinned(postR, uvBounds);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.0036 * s, 0.0036 * s, 0.016 * s), skinMat);
        topBar.position.set(ox, oy + baseH + winH + 0.0014 * s, oz);
        makeSkinned(topBar, uvBounds);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.002, winH - 0.002), opticGlassMat);
        glass.position.set(ox, oy + baseH + winH * 0.5, oz);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0016 * s, 6, 6), opticRedMat);
        dot.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        opticParent.add(base, postL, postR, topBar, glass, dot);
        opticEyePoint.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
      } else if (atts.optic === 'holo_eotech') {
        const s = or.isCompact ? 0.82 : 1.0;
        const baseH = 0.010 * s;
        const winH = 0.026 * s;
        const winW = 0.030 * s;
        const base = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.004, baseH, 0.062 * s), darkMetal);
        base.position.set(ox, oy + baseH * 0.5, oz);
        // Signature skin-mapped EOTech outer protective hood
        const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.0045 * s, winH + 0.003, 0.046 * s), skinMat);
        hoodL.position.set(ox - winW * 0.52, oy + baseH + winH * 0.5, oz);
        makeSkinned(hoodL, uvBounds);
        const hoodR = new THREE.Mesh(new THREE.BoxGeometry(0.0045 * s, winH + 0.003, 0.046 * s), skinMat);
        hoodR.position.set(ox + winW * 0.52, oy + baseH + winH * 0.5, oz);
        makeSkinned(hoodR, uvBounds);
        const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.006, 0.0045 * s, 0.046 * s), skinMat);
        hoodTop.position.set(ox, oy + baseH + winH + 0.002, oz);
        makeSkinned(hoodTop, uvBounds);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.004, winH - 0.003), opticGlassMat);
        glass.position.set(ox, oy + baseH + winH * 0.5, oz);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.0044 * s, 0.0056 * s, 16), opticHoloMat);
        ring.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        const cDot = new THREE.Mesh(new THREE.SphereGeometry(0.0012 * s, 6, 6), opticHoloMat);
        cDot.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        opticParent.add(base, hoodL, hoodR, hoodTop, glass, ring, cDot);
        opticEyePoint.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
      } else if (atts.optic === 'acog_25') {
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.013, 0.068), darkMetal);
        mount.position.set(ox, oy + 0.0065, oz);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.014, 0.112, 12), skinMat);
        body.rotation.x = Math.PI / 2;
        body.position.set(ox, oy + 0.026, oz - 0.008);
        makeSkinned(body, uvBounds);
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.0165, 0.032, 12), skinMat);
        bell.rotation.x = Math.PI / 2;
        bell.position.set(ox, oy + 0.026, oz - 0.072);
        makeSkinned(bell, uvBounds);
        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0145, 0.018, 12), darkMetal);
        eyeCup.rotation.x = Math.PI / 2;
        eyeCup.position.set(ox, oy + 0.026, oz + 0.052);
        const fiber = new THREE.Mesh(new THREE.BoxGeometry(0.0036, 0.0036, 0.042), opticRedMat);
        fiber.position.set(ox, oy + 0.044, oz - 0.012);
        const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), scopeLensMat);
        frontLens.position.set(ox, oy + 0.026, oz - 0.089);
        frontLens.rotation.y = Math.PI;
        const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), scopeLensMat);
        rearLens.position.set(ox, oy + 0.026, oz + 0.062);
        opticParent.add(mount, body, bell, eyeCup, fiber, frontLens, rearLens);
        opticEyePoint.set(ox, oy + 0.026, oz + 0.062);
      } else if (atts.optic === 'sniper_4x' || atts.optic === 'sniper_var') {
        if (wt !== 'awp') {
          for (const rz of [oz + 0.042, oz - 0.058]) {
            const rBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.016), darkMetal);
            rBase.position.set(ox, oy + 0.009, rz);
            const rClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.016, 10), gunmetal);
            rClamp.rotation.x = Math.PI / 2;
            rClamp.position.set(ox, oy + 0.028, rz);
            opticParent.add(rBase, rClamp);
          }
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.21, 12), skinMat);
          tube.rotation.x = Math.PI / 2;
          tube.position.set(ox, oy + 0.028, oz - 0.015);
          makeSkinned(tube, uvBounds);
          const objBell = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.052, 12), skinMat);
          objBell.rotation.x = Math.PI / 2;
          objBell.position.set(ox, oy + 0.028, oz - 0.140);
          makeSkinned(objBell, uvBounds);
          const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 10), scopeLensMat);
          rearLens.position.set(ox, oy + 0.028, oz + 0.091);
          const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 10), scopeLensMat);
          frontLens.rotation.y = Math.PI;
          frontLens.position.set(ox, oy + 0.028, oz - 0.167);
          opticParent.add(tube, objBell, rearLens, frontLens);
          opticEyePoint.set(ox, oy + 0.028, oz + 0.091);
        } else if (atts.optic === 'sniper_var') {
          // Exact coaxial sunshade extension + magnification throw lever on AWP scope (true center y = 0.094!)
          const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.052, 10), skinMat);
          shade.rotation.x = Math.PI / 2;
          shade.position.set(0, 0.094, -0.286);
          makeSkinned(shade, uvBounds);
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.014, 10), darkMetal);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, 0.094, 0.056);
          const lever = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.007), accentGlow);
          lever.position.set(0.018, 0.104, 0.056);
          lever.rotation.z = -0.35;
          attGroup.add(shade, ring, lever);
          opticEyePoint.set(0, 0.094, 0.128);
        } else {
          opticEyePoint.set(0, 0.094, 0.128);
        }
      }
    }

    // 4) Underbarrel foregrips & tactical laser (tactical dark/metallic; M870 foregrips mount onto pumpGroup!)
    if (atts.underbarrel && wpn.underRail) {
      const ur = wpn.underRail;
      const uParent = ur.parent === g ? attGroup : (ur.parent || attGroup);
      const ux = ur.x, uy = ur.y, uz = ur.z;

      if (atts.underbarrel !== 'laser_tac' && wpn.defaultBipodGroup) {
        wpn.defaultBipodGroup.visible = false;
      }

      if (atts.underbarrel === 'vertical_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.032), darkMetal);
        clamp.position.set(ux, uy - 0.004, uz);
        const vg = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.011, 0.082, 8), gripMat);
        vg.position.set(ux, uy - 0.048, uz);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8), gunmetal);
        cap.position.set(ux, uy - 0.090, uz);
        uParent.add(clamp, vg, cap);
        g.userData.supportAnchorOverride = [ux, uy - 0.050, uz];
      } else if (atts.underbarrel === 'angled_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.096), darkMetal);
        clamp.position.set(ux, uy - 0.003, uz);
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.088), gripMat);
        ag.position.set(ux, uy - 0.016, uz);
        ag.rotation.x = -0.22;
        uParent.add(clamp, ag);
        g.userData.supportAnchorOverride = [ux, uy - 0.024, uz + 0.005];
      } else if (atts.underbarrel === 'stubby_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.030), darkMetal);
        clamp.position.set(ux, uy - 0.004, uz);
        const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.0125, 0.048, 8), gripMat);
        sg.position.set(ux, uy - 0.031, uz);
        uParent.add(clamp, sg);
        g.userData.supportAnchorOverride = [ux, uy - 0.034, uz];
      } else if (atts.underbarrel === 'laser_tac') {
        const lParent = ur.laserParent === g ? attGroup : (ur.laserParent || uParent);
        const lp = ur.laserPos || [ux + 0.024, uy + 0.016, uz];
        const lScale = ur.isPistolRail ? 0.72 : 1.0;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.022 * lScale, 0.018 * lScale, 0.058 * lScale), darkMetal);
        box.position.set(lp[0], lp[1], lp[2]);
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0055 * lScale, 0.006 * lScale, 0.008, 8), gunmetal);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(lp[0], lp[1], lp[2] - 0.031 * lScale);
        const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.0032 * lScale, 6, 6), new THREE.MeshBasicMaterial({ color: 0x39ff88 }));
        emitter.position.set(lp[0], lp[1], lp[2] - 0.035 * lScale);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0010, 0.0010, 0.34, 6),
          new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.24, depthWrite: false })
        );
        beam.rotation.x = Math.PI / 2;
        beam.position.set(lp[0], lp[1], lp[2] - 0.205);
        lParent.add(box, bezel, emitter, beam);
      }
    }

    // 5) Magazine upgrades (shotgun gets tube ext / 6-shell side-saddle / receiver drum; others get exact-fit mag swaps!)
    const mw = wpn.magWell;
    const ammoColorMap = {
      fmj: 0xf4c44e,
      hollow_point: 0xff4c65,
      high_velocity: 0x38e8ff,
      subsonic: 0xa96bff,
      flechette: 0x2ec8eb,
      slug: 0xe68829,
      magnum: 0xc81e36
    };
    const ammoBandCol = atts.ammo ? (ammoColorMap[atts.ammo] || 0x38e8ff) : null;

    if (mw && mw.isShotgun) {
      const shellCol = g.userData.shellColor || 0xc82532;
      const hullMat = new THREE.MeshStandardMaterial({ color: shellCol, roughness: 0.45, metalness: 0.08 });

      if (atts.magazine === 'extended_mag') {
        // Extended skin-mapped tubular magazine sleeve extending seamlessly from tubeTipZ
        const extLen = 0.135;
        const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.0148, 0.0148, 0.022, 10), gunmetal);
        coupler.rotation.x = Math.PI / 2;
        coupler.position.set(0, mw.tubeY, mw.tubeTipZ - 0.004);
        const extTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, extLen, 10), skinMat);
        extTube.rotation.x = Math.PI / 2;
        extTube.position.set(0, mw.tubeY, mw.tubeTipZ - extLen * 0.5 - 0.008);
        makeSkinned(extTube, uvBounds);
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.013, 0.018, 10), darkMetal);
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(0, mw.tubeY, mw.tubeTipZ - extLen - 0.012);
        attGroup.add(coupler, extTube, endCap);
      } else if (atts.magazine === 'fast_mag') {
        // Left-receiver tactical 6-shell side-saddle carrier with colored 12-gauge shells!
        const [sx, sy, sz] = mw.sideSaddlePos;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.034, 0.118), darkMetal);
        plate.position.set(sx, sy, sz);
        attGroup.add(plate);
        for (let i = 0; i < 6; i++) {
          const zShell = sz - 0.045 + i * 0.018;
          const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.042, 8), hullMat);
          hull.position.set(sx - 0.005, sy + 0.003, zShell);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.011, 8), brassMat);
          rim.position.set(sx - 0.005, sy + 0.026, zShell);
          attGroup.add(hull, rim);
        }
      } else if (atts.magazine === 'drum_mag') {
        // Receiver-bottom 12-gauge rotary drum positioned behind the pump stroke
        const [dx, dy, dz] = mw.drumPos;
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.036, 0.042), darkMetal);
        neck.position.set(dx, dy + 0.044, dz);
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.046, 16), skinMat);
        drum.rotation.x = Math.PI / 2;
        drum.position.set(dx, dy, dz);
        makeSkinned(drum, uvBounds);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.052, 10), gunmetal);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(dx, dy, dz);
        attGroup.add(neck, drum, hub);
      }

      if (ammoBandCol) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0142, 0.0142, 0.010, 10),
          new THREE.MeshBasicMaterial({ color: ammoBandCol })
        );
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, mw.tubeY, -0.455);
        attGroup.add(stripe);
      }
    } else if (mw && mw.isRevolverCylinder) {
      // Revolver cylinder visual upgrades (ammo ring stripe + speed-chamfered crown)
      if (ammoBandCol && mw.cylinderGroup) {
        const cylBand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0249, 0.0249, 0.0042, 18),
          new THREE.MeshBasicMaterial({ color: ammoBandCol })
        );
        cylBand.rotation.x = Math.PI / 2;
        cylBand.position.set(0, 0, -0.024);
        mw.cylinderGroup.add(cylBand);
      }
    } else if (mw) {
      const magParent = g.userData.magGroup || attGroup;
      if (atts.magazine === 'fast_mag') {
        // Snug tactical tape band + bottom Ranger pull loop aligned with magazine floorplate
        const pull = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0036, 6, 12), gripMat);
        pull.position.set(mw.x, mw.bottomY - 0.016, mw.bottomZ);
        pull.rotation.y = Math.PI / 2;
        const tape = new THREE.Mesh(
          new THREE.BoxGeometry(mw.width + 0.004, 0.018, mw.depth + 0.004),
          new THREE.MeshStandardMaterial({ color: 0x2a7fff, roughness: 0.72 })
        );
        tape.position.set(mw.x, mw.bottomY + 0.028, mw.bottomZ - Math.sin(mw.rotX) * 0.028);
        tape.rotation.x = mw.rotX;
        magParent.add(pull, tape);
      } else if (atts.magazine === 'extended_mag') {
        if (wpn.defaultMagMeshGroup) wpn.defaultMagMeshGroup.visible = false;
        if (mw.isAkCurve) {
          // Extended 45-round curved RPK banana mag (skin-mapped!)
          const extShape = new THREE.Shape();
          extShape.moveTo(-0.062, -0.004);
          extShape.lineTo(-0.122, -0.004);
          extShape.quadraticCurveTo(-0.145, -0.102, -0.205, -0.194);
          extShape.lineTo(-0.152, -0.214);
          extShape.quadraticCurveTo(-0.094, -0.108, -0.062, -0.004);
          extShape.closePath();
          const extMesh = makeSideExtrude(extShape, 0.026, 0.0022, skinMat, uvBounds);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.010, 0.060), darkMetal);
          plate.position.set(0, -0.206, -0.178);
          plate.rotation.x = -0.44;
          magParent.add(extMesh, plate);
        } else if (mw.isCantMag) {
          // Extended 45-round forward-cant Vector stick mag (skin-mapped!)
          const extStick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.215, 0.033), skinMat);
          extStick.position.set(0, -0.140, -0.142);
          extStick.rotation.x = mw.rotX;
          makeSkinned(extStick, uvBounds);
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.029, 0.014, 0.039), darkMetal);
          base.position.set(0, -0.246, -0.168);
          base.rotation.x = mw.rotX;
          magParent.add(extStick, base);
        } else if (mw.isPistolMag) {
          // Extended pistol stick magazine matching exact grip angle!
          const extLen = 0.125;
          const dy = -0.026;
          const extMag = new THREE.Mesh(new THREE.BoxGeometry(mw.width, extLen, mw.depth), skinMat);
          extMag.position.set(mw.x, mw.y + dy, mw.z + Math.sin(mw.rotX) * 0.030);
          extMag.rotation.x = mw.rotX;
          makeSkinned(extMag, uvBounds);
          const bumper = new THREE.Mesh(new THREE.BoxGeometry(mw.width + 0.005, 0.014, mw.depth + 0.006), darkMetal);
          bumper.position.set(mw.x, mw.y + dy - extLen * 0.5, mw.z + Math.sin(mw.rotX) * (0.030 + extLen * 0.5));
          bumper.rotation.x = mw.rotX;
          magParent.add(extMag, bumper);
        } else {
          // Extended .338 Lapua box magazine for AWP
          const extBox = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.118, 0.074), skinMat);
          extBox.position.set(mw.x, -0.070, mw.z);
          makeSkinned(extBox, uvBounds);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.080), darkMetal);
          plate.position.set(mw.x, -0.130, mw.z);
          magParent.add(extBox, plate);
        }
      } else if (atts.magazine === 'drum_mag') {
        if (wpn.defaultMagMeshGroup) wpn.defaultMagMeshGroup.visible = false;
        const drumRad = mw.isPistolMag ? 0.044 : 0.056;
        const drumY = mw.isPistolMag ? mw.bottomY - 0.044 : mw.y - 0.082;
        const drumZ = mw.isPistolMag ? mw.bottomZ + 0.008 : mw.z - (mw.isCantMag ? 0.018 : 0.004);
        const towerH = Math.abs(mw.y - drumY);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(mw.width, towerH, mw.depth), darkMetal);
        tower.position.set(mw.x, (mw.y + drumY) * 0.5, (mw.z + drumZ) * 0.5);
        tower.rotation.x = mw.rotX * 0.5;
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(drumRad, drumRad, 0.044, 16), skinMat);
        drum.rotation.x = Math.PI / 2;
        drum.position.set(mw.x, drumY, drumZ);
        makeSkinned(drum, uvBounds);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(drumRad * 0.38, drumRad * 0.38, 0.050, 10), gunmetal);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(mw.x, drumY, drumZ);
        magParent.add(tower, drum, hub);
      }

      if (ammoBandCol) {
        const bandY = mw.isPistolMag ? mw.bottomY + 0.006 : (mw.isAkCurve ? -0.055 : mw.y - 0.032);
        const bandZ = mw.isPistolMag ? mw.bottomZ - 0.002 : (mw.isAkCurve ? -0.106 : mw.z - Math.sin(mw.rotX) * 0.012);
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(mw.width + 0.005, 0.008, mw.depth + 0.005),
          new THREE.MeshBasicMaterial({ color: ammoBandCol })
        );
        band.position.set(mw.x, bandY, bandZ);
        band.rotation.x = mw.isAkCurve ? -0.22 : mw.rotX;
        magParent.add(band);
      }
    }

    // 6) Contoured Rear Grip replacement (tactical matte/rubber/granulated — hides default grip so zero clipping!)
    if (atts.rearGrip && wpn.gripSpec) {
      if (wpn.defaultGripGroup) wpn.defaultGripGroup.visible = false;
      const gs = wpn.gripSpec;
      const gMat = atts.rearGrip === 'stippled_grip'
        ? new THREE.MeshStandardMaterial({ color: 0x202730, roughness: 0.96, metalness: 0.05 })
        : atts.rearGrip === 'rubberized_grip'
          ? new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.72, metalness: 0.14 })
          : new THREE.MeshStandardMaterial({ color: 0x303b48, roughness: 0.90, metalness: 0.12 });

      if (gs.shape) {
        const customGrip = makeSideExtrude(gs.shape, gs.thickness, 0.0028, gMat, null);
        attGroup.add(customGrip);
        if (atts.rearGrip === 'rubberized_grip') {
          // Subtle molded palm-swell & tactical grip bands
          const bb = new THREE.Box3().setFromObject(customGrip);
          const cy = (bb.min.y + bb.max.y) * 0.5;
          const cz = (bb.min.z + bb.max.z) * 0.5;
          for (const dy of [-0.018, 0, 0.018]) {
            const band = new THREE.Mesh(new THREE.BoxGeometry(gs.thickness + 0.005, 0.006, 0.036), darkMetal);
            band.position.set(0, cy + dy, cz + dy * -0.18);
            attGroup.add(band);
          }
        }
      } else if (gs.isPanel) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(gs.size[0], gs.size[1], gs.size[2]), gMat);
        panel.position.set(gs.pos[0], gs.pos[1], gs.pos[2]);
        panel.rotation.x = gs.rotX;
        attGroup.add(panel);
      }
    }

    // 7) Flush Stock replacement (hides default stock, mounts solid trunnion plate, skins main stock bodies!)
    if (atts.stock && wpn.stockMount) {
      if (wpn.defaultStockGroup) wpn.defaultStockGroup.visible = false;
      const sm = wpn.stockMount;
      const sx = sm.x, sy = sm.y, sz = sm.z;

      // Solid machined receiver trunnion adapter plate flush at receiver rear face
      const adapter = new THREE.Mesh(new THREE.BoxGeometry(sm.faceW, sm.faceH, 0.014), darkMetal);
      adapter.position.set(sx, sy, sz + 0.004);
      attGroup.add(adapter);

      if (atts.stock === 'no_stock') {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.018, 10), gunmetal);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(sx, sy + 0.004, sz + 0.014);
        const sling = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 6, 10), brightSteel);
        sling.position.set(sx, sy + 0.002, sz + 0.026);
        attGroup.add(cap, sling);
      } else if (atts.stock === 'skeleton_stock') {
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.018), gunmetal);
        hinge.position.set(sx, sy, sz + 0.016);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.195), skinMat);
        topBar.position.set(sx, sy + 0.016, sz + 0.112);
        makeSkinned(topBar, uvBounds);
        const lowStrut = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.011, 0.192), skinMat);
        lowStrut.position.set(sx, sy - 0.022, sz + 0.110);
        lowStrut.rotation.x = 0.17;
        makeSkinned(lowStrut, uvBounds);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.088, 0.018), gripMat);
        pad.position.set(sx, sy - 0.012, sz + 0.214);
        attGroup.add(hinge, topBar, lowStrut, pad);
      } else if (atts.stock === 'heavy_stock') {
        const hShape = new THREE.Shape();
        hShape.moveTo(sz + 0.004, sy + sm.faceH * 0.48);
        hShape.lineTo(sz + 0.215, sy + 0.022);
        hShape.lineTo(sz + 0.220, sy - 0.068);
        hShape.lineTo(sz + 0.145, sy - 0.056);
        hShape.lineTo(sz + 0.004, sy - sm.faceH * 0.44);
        hShape.closePath();
        const heavyBody = makeSideExtrude(hShape, 0.034, 0.003, skinMat, uvBounds);
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.118), gripMat);
        cheek.position.set(sx, sy + 0.034, sz + 0.105);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.098, 0.020), gripMat);
        pad.position.set(sx, sy - 0.022, sz + 0.228);
        attGroup.add(heavyBody, cheek, pad);
      }
    }

    // 8) APEX Kit: Side-rail Chrono Gyro Stabilizer / Phase Anchor (mounts flush to left receiver flank!)
    if (atts.apex && wpn.apexMount) {
      const am = wpn.apexMount;
      const isPhase = atts.apex === 'chrono_overclock';
      const glowHex = isPhase ? 0xffb020 : 0x38e8ff;
      const apexGrp = new THREE.Group();
      apexGrp.position.set(am.x, am.y, am.z);
      apexGrp.scale.setScalar(am.scale || 1.0);

      // Flush Picatinny side-clamp seated 2.5mm into receiver wall (zero air gap!)
      const clampBlock = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.018, 0.056), darkMetal);
      clampBlock.position.set(0.001, 0, 0);
      apexGrp.add(clampBlock);

      // Machined CNC Chrono Gyro housing
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.025, 0.068), gunmetal);
      chassis.position.set(-0.009, 0, 0);
      apexGrp.add(chassis);

      // Skin-matched top accent cap on the Apex housing
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.054), skinMat);
      topCap.position.set(-0.009, 0.0135, 0);
      makeSkinned(topCap, uvBounds);
      apexGrp.add(topCap);

      // Precision recessed gyro chamber bezel facing camera (-X)
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0114, 0.005, 16), darkMetal);
      bezel.rotation.z = Math.PI / 2;
      bezel.position.set(-0.016, 0, 0);
      apexGrp.add(bezel);

      // Glowing dual-ring precision temporal gyroscope + energy core
      const ringMat = new THREE.MeshStandardMaterial({
        color: glowHex,
        emissive: glowHex,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.7
      });
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.0086, 0.0013, 8, 20), ringMat);
      outerRing.rotation.y = Math.PI / 2;
      outerRing.position.set(-0.0185, 0, 0);
      apexGrp.add(outerRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.0052, 0.0011, 8, 16), ringMat);
      innerRing.position.set(-0.0185, 0, 0);
      apexGrp.add(innerRing);

      const coreMat = new THREE.MeshBasicMaterial({ color: glowHex });
      const coreOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.0026, 0), coreMat);
      coreOrb.position.set(-0.0185, 0, 0);
      apexGrp.add(coreOrb);

      // Twin status indicator pips fore & aft
      for (const dz of [-0.024, 0.024]) {
        const pip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.0036, 0.007), coreMat);
        pip.position.set(-0.0162, 0.004, dz);
        apexGrp.add(pip);
      }

      if (isPhase) {
        // Phase Anchor extra heat-sink cooling fins on fore/aft collar
        for (const dz of [-0.018, 0.018]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.029, 0.004), brightSteel);
          fin.position.set(-0.0095, 0, dz);
          apexGrp.add(fin);
        }
      }

      const targetParent = am.parent || g;
      targetParent.add(apexGrp);
      g.userData.chronoGyro = {
        group: apexGrp,
        outerRing,
        innerRing,
        coreOrb,
        ringMat,
        tier: isPhase ? 2 : 1
      };
    }

    g.userData.opticEyePoint = opticEyePoint;
    g.userData.opticEyeY = opticEyePoint.y;
    g.userData.weaponType = wt;
    g.userData.attachments = Object.assign({}, atts);
    return g;
  }

  // Exact anatomical grip constants & pre-allocated scratch math (zero GC per frame)
  VI.buildWeaponModel = buildWeaponModel;
})(typeof self !== "undefined" ? self : globalThis);
