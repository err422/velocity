// 4-Archetype articulated first-person hands & glove rig + shared animation math & contact grip solver.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { getProceduralTexSize, paintGloveToCanvases, normalizeGeometryUVs } = VI;
  // ---------- 4-Archetype CS:S-Faceted Articulated First-Person Hands Rig ----------
  // Supports live switching between Standard, Sport, Specialist, and Hand Wraps
  // with procedural PBR albedo/roughness/bump maps and zero geometry rebuilds.
  function buildHandsRig() {
    const rootRig = new THREE.Group();

    const gloveMaterials = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xc59374,
        roughness: 0.70,
        metalness: 0.02
      }),
      nail: new THREE.MeshStandardMaterial({
        color: 0xd9b39c,
        roughness: 0.42,
        metalness: 0.04
      }),
      gloveBase: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.74,
        metalness: 0.14,
        bumpScale: 0.0045
      }),
      palmLeather: new THREE.MeshStandardMaterial({
        color: 0x121820,
        roughness: 0.84,
        metalness: 0.08
      }),
      knuckleCarbon: new THREE.MeshStandardMaterial({
        color: 0x263444,
        roughness: 0.30,
        metalness: 0.68
      }),
      cuffTrim: new THREE.MeshStandardMaterial({
        color: 0x45c8e6,
        emissive: 0x0b4b5c,
        emissiveIntensity: 0.40,
        roughness: 0.34,
        metalness: 0.48
      }),
      sleeve: new THREE.MeshStandardMaterial({
        color: 0x101720,
        roughness: 0.86,
        metalness: 0.10
      })
    };

    const archetypeGroups = {
      standard: [],
      sport: [],
      specialist: [],
      wraps: []
    };
    const fingerProxMeshes = [];
    const fingerMidMeshes = [];
    const fingerDistMeshes = [];
    const thumbProxMeshes = [];
    const thumbMidMeshes = [];
    const thumbDistMeshes = [];
    const fingerHemMeshes = [];
    const nailMeshes = [];
    const palmBaseMeshes = [];
    const palmPadMeshes = [];

    function createArticulatedHand(side) {
      const handGroup = new THREE.Group();

      // 1) Slimmed CS:S faceted athletic forearm sleeve + folded cuff seam
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.050, 0.48, 10), gloveMaterials.sleeve);
      forearm.rotation.x = Math.PI / 2;
      forearm.scale.set(1.06, 1.0, 0.84);
      forearm.position.set(side * 0.007, -0.011, 0.308);
      handGroup.add(forearm);

      const sleeveHem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.039, 0.022, 10), gloveMaterials.palmLeather);
      sleeveHem.rotation.x = Math.PI / 2;
      sleeveHem.scale.set(1.08, 1.0, 0.85);
      sleeveHem.position.set(side * 0.005, -0.009, 0.095);
      handGroup.add(sleeveHem);

      // 2) Core crisp-beveled anatomically tapered palm (UV normalized for clean pattern mapping)
      const palmShape = new THREE.Shape();
      palmShape.moveTo(-0.029, -0.041);
      palmShape.lineTo(0.029, -0.041);
      palmShape.quadraticCurveTo(0.037, -0.005, 0.035, 0.043);
      palmShape.quadraticCurveTo(0.0, 0.048, -0.036, 0.043);
      palmShape.quadraticCurveTo(-0.037, -0.005, -0.029, -0.041);
      palmShape.closePath();

      const palmGeo = new THREE.ExtrudeGeometry(palmShape, {
        depth: 0.0165,
        bevelEnabled: true,
        bevelThickness: 0.0046,
        bevelSize: 0.0038,
        bevelSegments: 1
      });
      normalizeGeometryUVs(palmGeo);
      palmGeo.rotateX(-Math.PI / 2);
      palmGeo.translate(0, -0.0095, 0.0);
      const palmMesh = new THREE.Mesh(palmGeo, gloveMaterials.gloveBase);
      handGroup.add(palmMesh);
      palmBaseMeshes.push(palmMesh);

      // Crisp faceted dorsal metacarpal plane (catches directional highlights cleanly)
      const dorsalGeo = new THREE.CylinderGeometry(0.031, 0.035, 0.010, 8);
      normalizeGeometryUVs(dorsalGeo);
      const dorsalArch = new THREE.Mesh(dorsalGeo, gloveMaterials.gloveBase);
      dorsalArch.scale.set(1.02, 0.85, 1.16);
      dorsalArch.position.set(0, 0.0085, -0.002);
      handGroup.add(dorsalArch);
      palmBaseMeshes.push(dorsalArch);

      const wristBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.042, 8), gloveMaterials.gloveBase);
      wristBridge.rotation.x = Math.PI / 2;
      wristBridge.scale.set(1.04, 1.0, 0.68);
      wristBridge.position.set(side * 0.003, -0.004, 0.038);
      handGroup.add(wristBridge);
      palmBaseMeshes.push(wristBridge);

      // Palm grip pad + faceted thenar / hypothenar muscle pads
      const palmPad = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.0075, 0.058), gloveMaterials.palmLeather);
      palmPad.position.set(0, -0.0115, -0.008);
      handGroup.add(palmPad);
      palmPadMeshes.push(palmPad);

      const thenar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.038, 8), gloveMaterials.palmLeather);
      thenar.rotation.x = Math.PI / 2;
      thenar.scale.set(1.05, 1.0, 0.65);
      thenar.position.set(-side * 0.022, -0.011, 0.006);
      handGroup.add(thenar);
      palmPadMeshes.push(thenar);

      const hypothenar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.040, 8), gloveMaterials.palmLeather);
      hypothenar.rotation.x = Math.PI / 2;
      hypothenar.scale.set(0.90, 1.0, 0.64);
      hypothenar.position.set(side * 0.025, -0.0095, 0.011);
      handGroup.add(hypothenar);
      palmPadMeshes.push(hypothenar);

      // ============================================================
      // ARCHETYPE LAYER 1: STANDARD (CS:S Fingerless Tactical)
      // ============================================================
      const stdGrp = new THREE.Group();
      const stdCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.039, 0.056, 10), gloveMaterials.gloveBase);
      stdCuff.rotation.x = Math.PI / 2;
      stdCuff.scale.set(1.10, 1.0, 0.80);
      stdCuff.position.set(side * 0.004, -0.006, 0.070);
      stdGrp.add(stdCuff);

      const stdStrap = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.012, 0.020), gloveMaterials.knuckleCarbon);
      stdStrap.position.set(0, 0.020, 0.067);
      stdGrp.add(stdStrap);

      const stdPiping = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.007, 10), gloveMaterials.cuffTrim);
      stdPiping.rotation.x = Math.PI / 2;
      stdPiping.scale.set(1.12, 1.0, 0.82);
      stdPiping.position.set(side * 0.004, -0.006, 0.047);
      stdGrp.add(stdPiping);

      const stdKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.0085, 0.020), gloveMaterials.knuckleCarbon);
      stdKnuckle.position.set(0, 0.012, -0.035);
      stdGrp.add(stdKnuckle);

      handGroup.add(stdGrp);
      archetypeGroups.standard.push(stdGrp);

      // ============================================================
      // ARCHETYPE LAYER 2: SPORT GLOVES (CS2 Sleek Athletic Full-Finger)
      // ============================================================
      const sportGrp = new THREE.Group();
      const sportCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.062, 10), gloveMaterials.gloveBase);
      sportCuff.rotation.x = Math.PI / 2;
      sportCuff.scale.set(1.08, 1.0, 0.82);
      sportCuff.position.set(side * 0.004, -0.006, 0.070);
      sportGrp.add(sportCuff);

      const sportBand = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 10), gloveMaterials.cuffTrim);
      sportBand.rotation.x = Math.PI / 2;
      sportBand.scale.set(1.10, 1.0, 0.84);
      sportBand.position.set(side * 0.004, -0.005, 0.050);
      sportGrp.add(sportBand);

      const sportTab = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.007, 0.020), gloveMaterials.knuckleCarbon);
      sportTab.position.set(0, 0.022, 0.072);
      sportGrp.add(sportTab);

      // Molded faceted dorsal aero-ribs
      for (const rx of [-0.024, -0.008, 0.008, 0.024]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.0055, 0.046), gloveMaterials.knuckleCarbon);
        rib.position.set(rx * side, 0.0165, -0.006);
        sportGrp.add(rib);
      }
      // Sculpted low-profile knuckle crest bar
      const sportCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.062, 8), gloveMaterials.cuffTrim);
      sportCrest.rotation.z = Math.PI / 2;
      sportCrest.scale.set(1.0, 0.68, 1.0);
      sportCrest.position.set(0, 0.0155, -0.035);
      sportGrp.add(sportCrest);

      sportGrp.visible = false;
      handGroup.add(sportGrp);
      archetypeGroups.sport.push(sportGrp);

      // ============================================================
      // ARCHETYPE LAYER 3: SPECIALIST GLOVES (CS2 Armored Tactical)
      // ============================================================
      const specGrp = new THREE.Group();
      const specGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.043, 0.076, 10), gloveMaterials.gloveBase);
      specGauntlet.rotation.x = Math.PI / 2;
      specGauntlet.scale.set(1.12, 1.0, 0.84);
      specGauntlet.position.set(side * 0.004, -0.006, 0.076);
      specGrp.add(specGauntlet);

      for (const sz of [0.054, 0.086]) {
        const sBand = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.015), gloveMaterials.knuckleCarbon);
        sBand.position.set(0, 0.020, sz);
        specGrp.add(sBand);
      }
      const specTrim = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.0065, 0.011), gloveMaterials.cuffTrim);
      specTrim.position.set(0, 0.026, 0.070);
      specGrp.add(specTrim);

      // Faceted hexagonal-bevel knuckle bumper shield
      const armorMain = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.026), gloveMaterials.knuckleCarbon);
      armorMain.position.set(0, 0.016, -0.036);
      specGrp.add(armorMain);

      const armorRidge = new THREE.Mesh(new THREE.BoxGeometry(0.070, 0.0055, 0.009), gloveMaterials.cuffTrim);
      armorRidge.position.set(0, 0.0235, -0.035);
      specGrp.add(armorRidge);

      // Dorsal rubberized metacarpal shield plate
      const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0095, 0.042), gloveMaterials.knuckleCarbon);
      backPlate.position.set(0, 0.016, 0.004);
      specGrp.add(backPlate);

      specGrp.visible = false;
      handGroup.add(specGrp);
      archetypeGroups.specialist.push(specGrp);

      // ============================================================
      // ARCHETYPE LAYER 4: HAND WRAPS (CS2 Layered Diagonal Cloth Bandages)
      // ============================================================
      const wrapsGrp = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.033 + i * 0.0008, 0.0066, 6, 14), gloveMaterials.gloveBase);
        coil.scale.set(1.10, 0.78, 0.90);
        coil.position.set(side * 0.003, -0.005, 0.042 + i * 0.0132);
        coil.rotation.y = (i % 2 === 0 ? 0.14 : -0.14) * side;
        coil.rotation.x = 0.06;
        wrapsGrp.add(coil);
      }
      for (let i = 0; i < 4; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0062, 6, 14), gloveMaterials.gloveBase);
        band.scale.set(1.04, 0.54, 0.94);
        band.position.set(0, -0.0005 + (i % 2) * 0.0012, -0.028 + i * 0.0175);
        band.rotation.y = (i % 2 === 0 ? 0.16 : -0.16) * side;
        band.rotation.x = 0.05;
        wrapsGrp.add(band);
      }
      const xStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0050, 0.0125), gloveMaterials.gloveBase);
      xStrip1.position.set(-side * 0.002, 0.0135, -0.011);
      xStrip1.rotation.y = 0.50 * side;
      wrapsGrp.add(xStrip1);

      const xStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0050, 0.0125), gloveMaterials.gloveBase);
      xStrip2.position.set(side * 0.002, 0.0145, -0.009);
      xStrip2.rotation.y = -0.48 * side;
      wrapsGrp.add(xStrip2);

      const wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.028, 10), gloveMaterials.skin);
      wristSkin.rotation.x = Math.PI / 2;
      wristSkin.scale.set(1.06, 1.0, 0.80);
      wristSkin.position.set(side * 0.004, -0.007, 0.097);
      wrapsGrp.add(wristSkin);

      const wrapTab = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.0055, 0.0115), gloveMaterials.cuffTrim);
      wrapTab.position.set(0, 0.021, 0.068);
      wrapsGrp.add(wrapTab);

      wrapsGrp.visible = false;
      handGroup.add(wrapsGrp);
      archetypeGroups.wraps.push(wrapsGrp);

      // ============================================================
      // 3-JOINT TAPERED OCTAGONAL FINGERS + KNUCKLE CAPS & NAILS
      // ============================================================
      const fingerSpecs = [
        { name: 'index',  x: -0.0270, y:  0.001, z: -0.043, lens: [0.032, 0.022, 0.018], rads: [0.0076, 0.0068, 0.0058] },
        { name: 'middle', x: -0.0090, y:  0.003, z: -0.046, lens: [0.035, 0.024, 0.019], rads: [0.0078, 0.0070, 0.0060] },
        { name: 'ring',   x:  0.0090, y:  0.001, z: -0.044, lens: [0.033, 0.022, 0.018], rads: [0.0074, 0.0066, 0.0056] },
        { name: 'pinky',  x:  0.0260, y: -0.003, z: -0.040, lens: [0.026, 0.018, 0.015], rads: [0.0065, 0.0058, 0.0049] }
      ];

      const fingers = {};

      for (const spec of fingerSpecs) {
        // Standard carbon knuckle dome (faceted low-poly)
        const dome = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[0] * 1.10, 8, 6), gloveMaterials.knuckleCarbon);
        dome.scale.set(1.0, 0.70, 1.0);
        dome.position.set(spec.x * side, spec.y + 0.0085, spec.z + 0.007);
        stdGrp.add(dome);

        // Specialist bulky knuckle armor stud
        const specStud = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 2.15, 0.011, 0.015), gloveMaterials.knuckleCarbon);
        specStud.position.set(spec.x * side, spec.y + 0.013, spec.z + 0.006);
        specGrp.add(specStud);

        const mcp = new THREE.Group();
        mcp.position.set(spec.x * side, spec.y, spec.z);
        handGroup.add(mcp);

        // Proximal phalanx: tapered 8-sided octagonal cylinder + knuckle joint cap
        const s0 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[1] * 0.98, spec.rads[0] * 1.04, spec.lens[0], 8),
          gloveMaterials.gloveBase
        );
        s0.rotation.x = Math.PI / 2;
        s0.position.set(0, 0, -spec.lens[0] * 0.5);
        mcp.add(s0);
        fingerProxMeshes.push(s0);

        const j0 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[0] * 0.98, 8, 6), gloveMaterials.gloveBase);
        mcp.add(j0);
        fingerProxMeshes.push(j0);

        // Specialist proximal finger guard plate
        const fGuard = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 1.65, 0.0055, spec.lens[0] * 0.65), gloveMaterials.knuckleCarbon);
        fGuard.position.set(0, spec.rads[0] * 0.92, -spec.lens[0] * 0.45);
        fGuard.visible = false;
        mcp.add(fGuard);
        archetypeGroups.specialist.push(fGuard);

        const hem = new THREE.Mesh(new THREE.TorusGeometry(spec.rads[1] * 1.02, 0.0014, 6, 10), gloveMaterials.knuckleCarbon);
        hem.position.set(0, 0, -spec.lens[0] * 0.90);
        mcp.add(hem);
        fingerHemMeshes.push(hem);

        const pip = new THREE.Group();
        pip.position.set(0, 0, -spec.lens[0]);
        mcp.add(pip);

        // Middle phalanx: tapered 8-sided cylinder + PIP knuckle joint
        const j1 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[1] * 0.98, 8, 6), gloveMaterials.skin);
        pip.add(j1);
        fingerMidMeshes.push(j1);

        const s1 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[2] * 1.02, spec.rads[1] * 0.98, spec.lens[1], 8),
          gloveMaterials.skin
        );
        s1.rotation.x = Math.PI / 2;
        s1.position.set(0, 0, -spec.lens[1] * 0.5);
        pip.add(s1);
        fingerMidMeshes.push(s1);

        const dip = new THREE.Group();
        dip.position.set(0, 0, -spec.lens[1]);
        pip.add(dip);

        // Distal phalanx: tapered 8-sided tip + rounded fingertip dome + fingernail plate
        const j2 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[2] * 0.96, 8, 6), gloveMaterials.skin);
        dip.add(j2);
        fingerDistMeshes.push(j2);

        const s2 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[2] * 0.74, spec.rads[2] * 0.98, spec.lens[2], 8),
          gloveMaterials.skin
        );
        s2.rotation.x = Math.PI / 2;
        s2.position.set(0, 0, -spec.lens[2] * 0.48);
        dip.add(s2);
        fingerDistMeshes.push(s2);

        const tipCap = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[2] * 0.74, 8, 6), gloveMaterials.skin);
        tipCap.position.set(0, 0, -spec.lens[2] * 0.94);
        dip.add(tipCap);
        fingerDistMeshes.push(tipCap);

        const nail = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[2] * 1.05, 0.0014, spec.lens[2] * 0.46), gloveMaterials.nail);
        nail.position.set(0, spec.rads[2] * 0.78, -spec.lens[2] * 0.68);
        dip.add(nail);
        nailMeshes.push(nail);

        fingers[spec.name] = { mcp, pip, dip };
      }

      // 4) Opposable 3-Joint Tapered Octagonal Thumb
      const thumbCmc = new THREE.Group();
      thumbCmc.position.set(-side * 0.034, -0.008, 0.004);
      handGroup.add(thumbCmc);

      const t0 = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0108, 0.028, 8), gloveMaterials.gloveBase);
      t0.rotation.x = Math.PI / 2;
      t0.position.set(0, 0, -0.014);
      thumbCmc.add(t0);
      thumbProxMeshes.push(t0);

      const thumbWrap = new THREE.Mesh(new THREE.TorusGeometry(0.0118, 0.0038, 6, 12), gloveMaterials.gloveBase);
      thumbWrap.position.set(0, 0, -0.012);
      thumbWrap.visible = false;
      thumbCmc.add(thumbWrap);
      archetypeGroups.wraps.push(thumbWrap);

      const thumbArmor = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.0055, 0.019), gloveMaterials.knuckleCarbon);
      thumbArmor.position.set(0, 0.0095, -0.015);
      thumbArmor.visible = false;
      thumbCmc.add(thumbArmor);
      archetypeGroups.specialist.push(thumbArmor);

      const thumbMcp = new THREE.Group();
      thumbMcp.position.set(0, 0, -0.027);
      thumbCmc.add(thumbMcp);

      const tj1 = new THREE.Mesh(new THREE.SphereGeometry(0.0088, 8, 6), gloveMaterials.skin);
      thumbMcp.add(tj1);
      thumbMidMeshes.push(tj1);

      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0080, 0.0090, 0.025, 8), gloveMaterials.skin);
      t1.rotation.x = Math.PI / 2;
      t1.position.set(0, 0, -0.0125);
      thumbMcp.add(t1);
      thumbMidMeshes.push(t1);

      const thumbIp = new THREE.Group();
      thumbIp.position.set(0, 0, -0.024);
      thumbMcp.add(thumbIp);

      const tj2 = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 8, 6), gloveMaterials.skin);
      thumbIp.add(tj2);
      thumbDistMeshes.push(tj2);

      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0078, 0.020, 8), gloveMaterials.skin);
      t2.rotation.x = Math.PI / 2;
      t2.position.set(0, 0, -0.010);
      thumbIp.add(t2);
      thumbDistMeshes.push(t2);

      const tTip = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 8, 6), gloveMaterials.skin);
      tTip.position.set(0, 0, -0.0195);
      thumbIp.add(tTip);
      thumbDistMeshes.push(tTip);

      const tNail = new THREE.Mesh(new THREE.BoxGeometry(0.0082, 0.0014, 0.0095), gloveMaterials.nail);
      tNail.position.set(0, 0.0062, -0.013);
      thumbIp.add(tNail);
      nailMeshes.push(tNail);

      fingers.thumb = { cmc: thumbCmc, mcp: thumbMcp, ip: thumbIp };
      handGroup.userData.fingers = fingers;
      handGroup.userData.side = side;

      return handGroup;
    }

    function setHandPose(handGroup, pose) {
      const f = handGroup.userData.fingers;
      const side = handGroup.userData.side;
      const names = ['index', 'middle', 'ring', 'pinky'];
      const wrapW = pose.wrapGrip || 0;
      for (const nm of names) {
        const c = pose[nm] !== undefined ? pose[nm] : 0.85;
        const j = f[nm];
        const spread = nm === 'index' ? -0.06 : nm === 'ring' ? 0.05 : nm === 'pinky' ? 0.12 : 0.0;
        let mcpX = -0.08 - c * 1.06;
        let pipX = -0.06 - c * 1.28;
        let dipX = -0.04 - c * 0.82;
        if (wrapW > 0 && nm !== 'index') {
          // Surface-accurate C-wrap around knife handle seated in fist pocket (y=-0.0325, z=-0.0453):
          // proximal stays ABOVE handle, middle passes cleanly IN FRONT of handle (clearing finger radius),
          // distal curls cleanly BENEATH/OUTSIDE the handle with zero mesh penetration!
          const w = wrapW * c;
          const wrapMcp = nm === 'pinky' ? -0.04 : nm === 'ring' ? -0.30 : -0.36;
          const wrapPip = nm === 'pinky' ? -1.26 : nm === 'ring' ? -1.26 : -1.24;
          const wrapDip = nm === 'pinky' ? -0.26 : nm === 'ring' ? -0.54 : -0.62;
          mcpX = THREE.MathUtils.lerp(mcpX, wrapMcp, w);
          pipX = THREE.MathUtils.lerp(pipX, wrapPip, w);
          dipX = THREE.MathUtils.lerp(dipX, wrapDip, w);
        }
        j.mcp.rotation.x = mcpX;
        j.mcp.rotation.y = side * spread * (1 - c * 0.7);
        j.pip.rotation.x = pipX;
        j.dip.rotation.x = dipX;
      }
      if (pose.indexRingHook) {
        const h = pose.indexRingHook;
        // Exact fist-pocket spindle lock: at h=1, mcp(-1.50) + pip(-0.0708) = -PI/2 so
        // the index middle phalanx runs dead-vertical along -Y at (-0.0270, -0.0309..-0.0529, -0.0453),
        // threading squarely through the Karambit ring & Skeleton hole while middle/ring/pinky
        // wrap cleanly AROUND the outside of the handle with zero clipping!
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, -1.50, h);
        f.index.mcp.rotation.y = THREE.MathUtils.lerp(f.index.mcp.rotation.y, 0.0, h);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, -0.0708, h);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, -0.32, h);
      }
      if (pose.indexPoint) {
        const p = pose.indexPoint;
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, 0.14, p);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, 0.02, p);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, 0.02, p);
      }
      const tc = pose.thumb !== undefined ? pose.thumb : 0.8;
      if (wrapW > 0) {
        // CS2 Karambit / Skeleton thumb sits cleanly along the outside left flank of the fist
        // (resting beside the index knuckle/ring, never stabbing inside the knife handle)
        const baseCmcX = -0.18 - tc * 0.34;
        const baseCmcY = -side * (0.28 + tc * 0.42);
        const baseCmcZ = side * (0.35 + tc * 0.48);
        f.thumb.cmc.rotation.set(
          THREE.MathUtils.lerp(baseCmcX, -0.20, wrapW),
          THREE.MathUtils.lerp(baseCmcY, -side * 0.04, wrapW),
          THREE.MathUtils.lerp(baseCmcZ, side * 0.22, wrapW)
        );
        f.thumb.mcp.rotation.set(
          THREE.MathUtils.lerp(-0.08 - tc * 0.56, -0.16, wrapW),
          THREE.MathUtils.lerp(-side * tc * 0.18, -side * 0.04, wrapW),
          0
        );
        f.thumb.ip.rotation.set(THREE.MathUtils.lerp(-0.06 - tc * 0.58, -0.22, wrapW), 0, 0);
      } else {
        f.thumb.cmc.rotation.set(
          -0.18 - tc * 0.34,
          -side * (0.28 + tc * 0.42),
          side * (0.35 + tc * 0.48)
        );
        f.thumb.mcp.rotation.set(-0.08 - tc * 0.56, -side * tc * 0.18, 0);
        f.thumb.ip.rotation.set(-0.06 - tc * 0.58, 0, 0);
      }
    }

    let activeGloveMap = null;
    let activeGloveRough = null;
    let activeGloveBump = null;
    let currentGloveItem = KS.createStarterGlove();

    function applyGlove(gloveItem, targetRenderer) {
      const clean = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
      currentGloveItem = clean;
      const gt = clean.gloveType;
      const { albedoCanvas, roughCanvas, bumpCanvas, palette } = paintGloveToCanvases(clean, getProceduralTexSize());

      if (activeGloveMap) activeGloveMap.dispose();
      if (activeGloveRough) activeGloveRough.dispose();
      if (activeGloveBump) activeGloveBump.dispose();

      activeGloveMap = new THREE.CanvasTexture(albedoCanvas);
      activeGloveMap.colorSpace = THREE.SRGBColorSpace;
      activeGloveMap.wrapS = THREE.RepeatWrapping;
      activeGloveMap.wrapT = THREE.RepeatWrapping;
      const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
      activeGloveMap.anisotropy = Math.min(8, maxAniso);

      activeGloveRough = new THREE.CanvasTexture(roughCanvas);
      activeGloveRough.wrapS = THREE.RepeatWrapping;
      activeGloveRough.wrapT = THREE.RepeatWrapping;

      activeGloveBump = new THREE.CanvasTexture(bumpCanvas);
      activeGloveBump.wrapS = THREE.RepeatWrapping;
      activeGloveBump.wrapT = THREE.RepeatWrapping;

      gloveMaterials.gloveBase.color.setHex(0xffffff);
      gloveMaterials.gloveBase.map = activeGloveMap;
      gloveMaterials.gloveBase.roughnessMap = activeGloveRough;
      gloveMaterials.gloveBase.bumpMap = activeGloveBump;
      gloveMaterials.gloveBase.bumpScale = gt === 'wraps' ? 0.0062 : gt === 'specialist' ? 0.0052 : 0.0044;
      gloveMaterials.gloveBase.roughness = palette.rough;
      gloveMaterials.gloveBase.metalness = palette.metal;
      gloveMaterials.gloveBase.needsUpdate = true;

      gloveMaterials.palmLeather.color.setHex(palette.palm);
      gloveMaterials.knuckleCarbon.color.setHex(palette.knuckle);
      gloveMaterials.cuffTrim.color.setHex(palette.cuff);
      gloveMaterials.cuffTrim.emissive.setHex(palette.cuffEmissive);
      gloveMaterials.sleeve.color.setHex(palette.sleeve);

      // Toggle 4 archetype geometry layers
      for (const arch of Object.keys(archetypeGroups)) {
        const show = arch === gt;
        for (const obj of archetypeGroups[arch]) {
          obj.visible = show;
        }
      }

      // Assign finger & palm materials according to archetype cut
      const isFullFinger = gt === 'sport' || gt === 'specialist';
      const isWraps = gt === 'wraps';
      const isStandard = gt === 'standard';

      for (const m of palmBaseMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of palmPadMeshes) {
        m.visible = !isWraps;
      }
      for (const m of fingerProxMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of fingerMidMeshes) {
        m.material = isFullFinger ? gloveMaterials.gloveBase : gloveMaterials.skin;
      }
      for (const m of fingerDistMeshes) {
        m.material = isFullFinger ? (gt === 'sport' ? gloveMaterials.palmLeather : gloveMaterials.gloveBase) : gloveMaterials.skin;
      }
      for (const m of thumbProxMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of thumbMidMeshes) {
        m.material = isFullFinger ? gloveMaterials.gloveBase : gloveMaterials.skin;
      }
      for (const m of thumbDistMeshes) {
        m.material = isFullFinger ? (gt === 'sport' ? gloveMaterials.palmLeather : gloveMaterials.gloveBase) : gloveMaterials.skin;
      }
      for (const m of fingerHemMeshes) {
        m.visible = isStandard;
      }
      for (const m of nailMeshes) {
        m.visible = !isFullFinger;
      }
    }

    const rightHandPivot = new THREE.Group();
    rightHandPivot.rotation.order = 'YXZ';
    const rightHand = createArticulatedHand(1);
    rightHandPivot.add(rightHand);

    const knifeSocket = new THREE.Group();
    rightHand.add(knifeSocket);

    const leftHandPivot = new THREE.Group();
    leftHandPivot.rotation.order = 'YXZ';
    const leftHand = createArticulatedHand(-1);
    leftHandPivot.add(leftHand);

    // Twin 12-gauge shotgun shells gripped in left fingers during fast M870 quad-load reload
    const reloadShellsGroup = new THREE.Group();
    reloadShellsGroup.position.set(0.008, -0.022, -0.056);
    reloadShellsGroup.rotation.set(0.18, 0.12, -0.15);
    const shellHullMat = new THREE.MeshStandardMaterial({ color: 0xc82532, roughness: 0.42, metalness: 0.14 });
    const shellBrassMat = new THREE.MeshStandardMaterial({ color: 0xd8b154, roughness: 0.28, metalness: 0.88 });
    for (const sx of [-0.011, 0.011]) {
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.044, 10), shellHullMat);
      hull.rotation.x = Math.PI / 2;
      hull.position.set(sx, 0, -0.006);
      const brass = new THREE.Mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.014, 10), shellBrassMat);
      brass.rotation.x = Math.PI / 2;
      brass.position.set(sx, 0, 0.022);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0108, 0.003, 10), shellBrassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(sx, 0, 0.029);
      reloadShellsGroup.add(hull, brass, rim);
    }
    reloadShellsGroup.visible = false;
    leftHand.add(reloadShellsGroup);

    // Single gleaming .500 magnum brass cartridge gripped in left fingers during R-88 shell-by-shell reload
    const reloadBulletGroup = new THREE.Group();
    reloadBulletGroup.position.set(0.010, -0.020, -0.052);
    reloadBulletGroup.rotation.set(0.12, 0.08, -0.10);
    const revCaseMat = new THREE.MeshStandardMaterial({ color: 0xe2bc5c, roughness: 0.24, metalness: 0.90 });
    const revTipMat = new THREE.MeshStandardMaterial({ color: 0xc97b42, roughness: 0.30, metalness: 0.84 });
    const rRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.0028, 12), revCaseMat);
    rRim.rotation.x = Math.PI / 2;
    rRim.position.set(0, 0, 0.021);
    const rCase = new THREE.Mesh(new THREE.CylinderGeometry(0.0064, 0.0064, 0.036, 12), revCaseMat);
    rCase.rotation.x = Math.PI / 2;
    rCase.position.set(0, 0, 0.002);
    const rNose = new THREE.Mesh(new THREE.ConeGeometry(0.0062, 0.014, 12), revTipMat);
    rNose.rotation.x = -Math.PI / 2;
    rNose.position.set(0, 0, -0.023);
    reloadBulletGroup.add(rRim, rCase, rNose);
    reloadBulletGroup.visible = false;
    leftHand.add(reloadBulletGroup);

    setHandPose(leftHand, { index: 0.64, middle: 0.74, ring: 0.82, pinky: 0.88, thumb: 0.56 });

    rootRig.add(rightHandPivot);
    rootRig.add(leftHandPivot);

    // Initialize default starter Standard Gloves look immediately
    applyGlove(currentGloveItem, null);

    return {
      rootRig,
      rightHandPivot,
      rightHand,
      leftHandPivot,
      leftHand,
      knifeSocket,
      reloadShellsGroup,
      reloadBulletGroup,
      shellHullMat,
      gloveMaterials,
      setHandPose,
      applyGlove,
      getCurrentGlove: () => currentGloveItem
    };
  }

  // ---------- Shared Animation Math & Contact Grip Solver ----------
  function easeOutCubic(t) {
    const u = Math.max(0, Math.min(1, t));
    return 1 - (1 - u) * (1 - u) * (1 - u);
  }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function bell(t, a, b) {
    if (t <= a || t >= b) return 0;
    const u = (t - a) / (b - a);
    return Math.sin(u * Math.PI);
  }

  function applyContactGripSocket(knifeMesh, kt) {
    knifeMesh.rotation.order = 'XYZ';
    if (kt === 'karambit') {
      // Exact CS2 Karambit fist-pocket ring-spindle socket:
      // Ring center (0,0,0) locks dead-center onto the right index finger at (-0.0270, -0.0325, -0.0453)
      // with local +Z hole/spin axis collinear with -Y; handle runs underneath the pronated palm
      // toward pinky (+X) and the curved hawkbill blade sweeps boldly OUT TO THE RIGHT & UP!
      knifeMesh.position.set(-0.0270, -0.0325, -0.0453);
      knifeMesh.rotation.set(Math.PI * 0.5, 0.0, 0.0);
      knifeMesh.scale.setScalar(1.04);
    } else if (kt === 'skeleton') {
      // Exact CS2 Skeleton center-hole spindle socket inside the fist pocket:
      // Center hole (0,0,0) locks dead-center onto the right index finger (-0.0270, -0.0325, -0.0453);
      // paracord handle (-X -> rightHand +X) sits cleanly inside the curled middle/ring/pinky wrap
      // with zero finger-through-handle clipping, and local +Z spin axis aligns dead-vertical (-Y)!
      knifeMesh.position.set(-0.0270, -0.0325, -0.0453);
      knifeMesh.rotation.set(-Math.PI * 0.5, Math.PI, 0.0);
      knifeMesh.scale.setScalar(1.03);
    } else if (kt === 'butterfly') {
      knifeMesh.position.set(-0.004, -0.0240, -0.056);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.08, Math.PI - 0.14, 0.04);
      knifeMesh.scale.setScalar(1.04);
    } else if (kt === 'm9') {
      knifeMesh.position.set(0.002, -0.0215, -0.037);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.12, Math.PI - 0.24, 0.05);
      knifeMesh.scale.setScalar(0.94);
    } else {
      knifeMesh.position.set(0.002, -0.0215, -0.037);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.12, Math.PI - 0.24, 0.05);
      knifeMesh.scale.setScalar(1.0);
    }
  }

  Object.assign(VI, {
    buildHandsRig,
    easeOutCubic,
    smoothstep,
    bell,
    applyContactGripSocket
  });
})(typeof self !== "undefined" ? self : globalThis);
