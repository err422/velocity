// 5 Authentic CS:S-Faceted x CS2-Silhouette 3D procedural knife models.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { createBladeMaterial, normalizeGeometryUVs, buildSharpenedBladeGeometry, createStatTrakModule } = VI;
  // ---------- 5 Authentic CS:S-Faceted x CS2-Silhouette 3D Knife Models ----------
  function buildKnifeModel(item, targetRenderer) {
    const group = new THREE.Group();
    const kt = (item && item.knifeType) || 'default';
    const bladeMat = createBladeMaterial(item || KS.createStarterKnife(), targetRenderer);
    const isUV = item && item.skinId === 'ultraviolet';

    const gripMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x3b2c68 : 0x181f28,
      roughness: 0.76,
      metalness: 0.16
    });
    const tapeMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x2c204d : 0x171a20,
      roughness: 0.90,
      metalness: 0.06
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x574199 : 0x2a3440,
      roughness: 0.34,
      metalness: 0.90
    });
    const accentSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x9b7dff : 0x89a0b6,
      roughness: 0.22,
      metalness: 0.94
    });
    const recessedMat = new THREE.MeshStandardMaterial({
      color: 0x0b1219,
      roughness: 0.62,
      metalness: 0.58
    });

    if (kt === 'karambit') {
      // Faceted CS:S retention ring with chamfered tang collar
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0049, 8, 22), darkSteelMat);
      group.add(ring);

      const ringInnerRim = new THREE.Mesh(new THREE.TorusGeometry(0.0140, 0.0014, 6, 20), accentSteelMat);
      group.add(ringInnerRim);

      const ringCollar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.0086), darkSteelMat);
      ringCollar.position.set(0.022, 0.003, 0);
      group.add(ringCollar);

      // Ergonomic scalloped CS2 Karambit grip with 3 finger grooves & 1-seg chamfered G10 scales
      const handleShape = new THREE.Shape();
      handleShape.moveTo(0.018, 0.010);
      handleShape.quadraticCurveTo(0.068, 0.030, 0.119, 0.018);
      handleShape.lineTo(0.115, -0.013);
      handleShape.quadraticCurveTo(0.100, -0.023, 0.089, -0.010);
      handleShape.quadraticCurveTo(0.072, -0.022, 0.060, -0.009);
      handleShape.quadraticCurveTo(0.044, -0.020, 0.031, -0.007);
      handleShape.lineTo(0.019, -0.007);
      handleShape.closePath();

      const tangGeo = new THREE.ExtrudeGeometry(handleShape, { depth: 0.0068, bevelEnabled: false });
      tangGeo.translate(0, 0, -0.0034);
      group.add(new THREE.Mesh(tangGeo, darkSteelMat));

      const scaleGeo = new THREE.ExtrudeGeometry(handleShape, {
        depth: 0.0142,
        bevelEnabled: true,
        bevelThickness: 0.0032,
        bevelSize: 0.0022,
        bevelSegments: 1
      });
      scaleGeo.translate(0, 0, -0.0071);
      const scaleMesh = new THREE.Mesh(scaleGeo, gripMat);
      scaleMesh.scale.set(0.95, 0.90, 1.0);
      scaleMesh.position.set(0.003, 0.0005, 0);
      group.add(scaleMesh);

      // Angled machined bolster + thumb jimping notches
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.035, 0.0215), darkSteelMat);
      bolster.position.set(0.116, 0.002, 0);
      bolster.rotation.z = -0.20;
      group.add(bolster);

      for (let j = 0; j < 4; j++) {
        const jimp = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0032, 0.0062), accentSteelMat);
        jimp.position.set(0.114 + j * 0.0046, 0.0195 - j * 0.0006, 0);
        group.add(jimp);
      }

      // Recessed hex pivot + Torx scale screws
      for (const [px, py, rad] of [[0.042, 0.005, 0.0034], [0.072, 0.008, 0.0034], [0.102, 0.004, 0.0048]]) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.0222, 6), accentSteelMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(px, py, 0);
        group.add(pin);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, 0.0230, 6), recessedMat);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(px, py, 0);
        group.add(cap);
      }

      // Swept tiger-claw blade with crisp CS:S ridge facet & needle talon tip
      const stations = [];
      const cx = 0.097, cy = -0.108;
      const N = 15;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ang = THREE.MathUtils.lerp(1.43, -0.22, t);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rOuter = THREE.MathUtils.lerp(0.130, 0.139, Math.sin(t * Math.PI * 0.72)) - t * t * 0.0045;
        const width = 0.036 * Math.pow(1 - t, 0.70);
        const rInner = rOuter - width;
        const rRidge = rOuter - width * 0.30;
        const thick = 0.0048 * (1 - t * 0.86);
        if (i === N) {
          const tipX = cx + ca * rOuter;
          const tipY = cy + sa * rOuter;
          stations.push({ spine: [tipX, tipY], ridge: [tipX, tipY], edge: [tipX, tipY], spineT: 0, ridgeT: 0 });
        } else {
          stations.push({
            spine: [cx + ca * rOuter, cy + sa * rOuter],
            ridge: [cx + ca * rRidge, cy + sa * rRidge],
            edge: [cx + ca * rInner, cy + sa * rInner],
            spineT: thick * 0.74,
            ridgeT: thick
          });
        }
      }
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations), bladeMat));
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'skeleton') {
      const unifiedBounds = {
        min: new THREE.Vector3(-0.156, -0.029, -0.01),
        max: new THREE.Vector3(0.188, 0.029, 0.01)
      };

      const tangShape = new THREE.Shape();
      tangShape.moveTo(-0.154, 0.0);
      tangShape.lineTo(-0.125, 0.0145);
      tangShape.lineTo(-0.031, 0.0165);
      tangShape.quadraticCurveTo(-0.018, 0.026, 0.0, 0.026);
      tangShape.quadraticCurveTo(0.018, 0.026, 0.031, 0.0185);
      tangShape.lineTo(0.031, -0.0185);
      tangShape.quadraticCurveTo(0.018, -0.026, 0.0, -0.026);
      tangShape.quadraticCurveTo(-0.018, -0.026, -0.031, -0.0165);
      tangShape.lineTo(-0.125, -0.0145);
      tangShape.closePath();

      const centerHole = new THREE.Path();
      centerHole.absarc(0, 0, 0.0158, 0, Math.PI * 2, false);
      tangShape.holes.push(centerHole);

      const rearSlot = new THREE.Path();
      rearSlot.moveTo(-0.114, -0.0052);
      rearSlot.lineTo(-0.044, -0.0052);
      rearSlot.lineTo(-0.044, 0.0052);
      rearSlot.lineTo(-0.114, 0.0052);
      rearSlot.closePath();
      tangShape.holes.push(rearSlot);

      const tangGeo = new THREE.ExtrudeGeometry(tangShape, {
        depth: 0.0058,
        bevelEnabled: true,
        bevelThickness: 0.0018,
        bevelSize: 0.0014,
        bevelSegments: 1
      });
      tangGeo.translate(0, 0, -0.0029);
      normalizeGeometryUVs(tangGeo, unifiedBounds);
      tangGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tangGeo, bladeMat));

      // Inner metallic ring chamfer around finger hole
      const holeBevel = new THREE.Mesh(new THREE.TorusGeometry(0.0162, 0.0014, 6, 20), accentSteelMat);
      group.add(holeBevel);

      const stations = [
        { spine: [0.026, 0.0185], ridge: [0.026, 0.006], edge: [0.026, -0.0185], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.048, 0.0215], ridge: [0.048, 0.008], edge: [0.048, -0.0235], spineT: 0.0036, ridgeT: 0.0046 },
        { spine: [0.079, 0.0225], ridge: [0.079, 0.009], edge: [0.079, -0.0255], spineT: 0.0034, ridgeT: 0.0044 },
        { spine: [0.114, 0.0205], ridge: [0.114, 0.008], edge: [0.114, -0.0235], spineT: 0.0030, ridgeT: 0.0039 },
        { spine: [0.146, 0.0145], ridge: [0.146, 0.005], edge: [0.146, -0.0165], spineT: 0.0022, ridgeT: 0.0028 },
        { spine: [0.170, 0.0070], ridge: [0.170, 0.002], edge: [0.170, -0.0072], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.188, 0.0010], ridge: [0.188, 0.001], edge: [0.188, 0.0010], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations, unifiedBounds), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.0044, 0.0096), recessedMat);
      fuller.position.set(0.088, 0.0132, 0);
      fuller.rotation.z = -0.04;
      group.add(fuller);

      // Diagonal paracord / grip tape wrap with chamfered ridges
      for (let i = 0; i < 8; i++) {
        const tx = -0.112 + i * 0.0108;
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.0112, 0.0325, 0.0124), i % 2 === 0 ? tapeMat : gripMat);
        wrap.position.set(tx, 0, 0);
        wrap.rotation.z = (i % 2 === 0 ? 0.26 : -0.20);
        group.add(wrap);
      }
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'butterfly') {
      function buildUChannelHandle(isBite) {
        const hGroup = new THREE.Group();
        const sign = isBite ? -1 : 1;

        const sideShape = new THREE.Shape();
        sideShape.moveTo(0.0, -0.0078 * sign);
        sideShape.quadraticCurveTo(-0.068, -0.0112 * sign, -0.134, -0.0058 * sign);
        sideShape.quadraticCurveTo(-0.140, 0.0, -0.134, 0.0078 * sign);
        sideShape.quadraticCurveTo(-0.068, 0.0046 * sign, 0.0, 0.0078 * sign);
        sideShape.quadraticCurveTo(0.0085, 0.0, 0.0, -0.0078 * sign);
        sideShape.closePath();

        for (const hx of [-0.032, -0.068, -0.104]) {
          const cut = new THREE.Path();
          cut.absellipse(hx, -0.0005 * sign, 0.0128, 0.0038, 0, Math.PI * 2, false, 0);
          sideShape.holes.push(cut);
        }

        const slabGeo = new THREE.ExtrudeGeometry(sideShape, {
          depth: 0.0032,
          bevelEnabled: true,
          bevelThickness: 0.0009,
          bevelSize: 0.0007,
          bevelSegments: 1
        });
        const frontSlab = new THREE.Mesh(slabGeo, gripMat);
        frontSlab.position.set(0, 0, 0.0052);
        hGroup.add(frontSlab);

        const backSlab = new THREE.Mesh(slabGeo, gripMat);
        backSlab.position.set(0, 0, -0.0084);
        hGroup.add(backSlab);

        const spacer = new THREE.Mesh(new THREE.BoxGeometry(0.120, 0.0038, 0.0108), darkSteelMat);
        spacer.position.set(-0.068, -0.0070 * sign, 0);
        hGroup.add(spacer);

        const frontBolster = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0088, 0.0188, 10), darkSteelMat);
        frontBolster.rotation.x = Math.PI / 2;
        hGroup.add(frontBolster);

        const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0208, 6), accentSteelMat);
        pivotPin.rotation.x = Math.PI / 2;
        hGroup.add(pivotPin);

        const buttSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.0135, 0.0112), accentSteelMat);
        buttSpacer.position.set(-0.130, 0, 0);
        hGroup.add(buttSpacer);

        if (isBite) {
          const latchStem = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.0052, 0.0072), accentSteelMat);
          latchStem.position.set(-0.143, 0.002, 0);
          latchStem.rotation.z = 0.24;
          hGroup.add(latchStem);
          const latchHead = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.009, 0.0082), darkSteelMat);
          latchHead.position.set(-0.151, 0.004, 0);
          latchHead.rotation.z = 0.24;
          hGroup.add(latchHead);
        }

        return hGroup;
      }

      const safeHandleGroup = new THREE.Group();
      const safeVisual = buildUChannelHandle(false);
      safeVisual.position.set(0.068, 0.0095, 0);
      safeHandleGroup.add(safeVisual);
      group.add(safeHandleGroup);

      const bladePivot = new THREE.Group();
      bladePivot.position.set(0.068, 0.0095, 0);
      safeHandleGroup.add(bladePivot);

      const tangBlock = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.027, 0.0074), darkSteelMat);
      tangBlock.position.set(0.003, -0.0095, 0);
      bladePivot.add(tangBlock);

      // Tang horn / zen kicker stop pin
      const tangPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.015, 6), accentSteelMat);
      tangPin.rotation.x = Math.PI / 2;
      tangPin.position.set(0.011, -0.0095, 0);
      bladePivot.add(tangPin);

      // Authentic curved CS2 Balisong clip-point blade with bold spine hump & hollow grind ridge
      const bladeStations = [
        { spine: [0.008, 0.008], ridge: [0.008, -0.003], edge: [0.008, -0.020], spineT: 0.0032, ridgeT: 0.0040 },
        { spine: [0.028, 0.014], ridge: [0.028, -0.001], edge: [0.028, -0.018], spineT: 0.0033, ridgeT: 0.0041 },
        { spine: [0.058, 0.009], ridge: [0.058, -0.003], edge: [0.058, -0.022], spineT: 0.0031, ridgeT: 0.0038 },
        { spine: [0.095, 0.011], ridge: [0.095, -0.002], edge: [0.095, -0.024], spineT: 0.0028, ridgeT: 0.0035 },
        { spine: [0.128, 0.006], ridge: [0.128, -0.004], edge: [0.128, -0.020], spineT: 0.0021, ridgeT: 0.0027 },
        { spine: [0.153, -0.001], ridge: [0.153, -0.006], edge: [0.153, -0.012], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.172, -0.005], ridge: [0.172, -0.005], edge: [0.172, -0.005], spineT: 0.0, ridgeT: 0.0 }
      ];
      bladePivot.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.0052, 0.0084), recessedMat);
      fuller.position.set(0.070, 0.0018, 0);
      bladePivot.add(fuller);

      const biteHandlePivot = new THREE.Group();
      biteHandlePivot.position.set(0, -0.019, 0);
      biteHandlePivot.add(buildUChannelHandle(true));
      bladePivot.add(biteHandlePivot);

      group.userData.safeHandleGroup = safeHandleGroup;
      group.userData.bladePivot = bladePivot;
      group.userData.biteHandlePivot = biteHandlePivot;

    } else if (kt === 'm9') {
      // Heavy M9 Bayonet Bowie clip-point blade with fuller, wire-cutter slot & machined sawteeth
      const bladeStations = [
        { spine: [0.074, 0.0265], ridge: [0.074, 0.005], edge: [0.074, -0.0245], spineT: 0.0044, ridgeT: 0.0052 },
        { spine: [0.132, 0.0265], ridge: [0.132, 0.005], edge: [0.132, -0.0245], spineT: 0.0044, ridgeT: 0.0052 },
        { spine: [0.198, 0.0265], ridge: [0.198, 0.006], edge: [0.198, -0.0245], spineT: 0.0040, ridgeT: 0.0048 },
        { spine: [0.232, 0.0245], ridge: [0.232, 0.007], edge: [0.232, -0.0225], spineT: 0.0033, ridgeT: 0.0041 },
        { spine: [0.266, 0.0145], ridge: [0.266, 0.005], edge: [0.266, -0.0145], spineT: 0.0020, ridgeT: 0.0026 },
        { spine: [0.300, 0.0030], ridge: [0.300, 0.003], edge: [0.300, 0.0030], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      // Stepped machined trapezoidal sawteeth along dorsal spine (authentic M9 silhouette)
      const toothShape = new THREE.Shape();
      toothShape.moveTo(-0.0052, 0);
      toothShape.lineTo(-0.0012, 0.0072);
      toothShape.lineTo(0.0034, 0.0072);
      toothShape.lineTo(0.0052, 0);
      toothShape.closePath();
      const toothGeo = new THREE.ExtrudeGeometry(toothShape, { depth: 0.0052, bevelEnabled: false });
      toothGeo.translate(0, 0, -0.0026);
      normalizeGeometryUVs(toothGeo);
      for (let i = 0; i < 9; i++) {
        const tooth = new THREE.Mesh(toothGeo, bladeMat);
        tooth.position.set(0.090 + i * 0.0145, 0.0255, 0);
        group.add(tooth);
      }

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.130, 0.0088, 0.0108), recessedMat);
      fuller.position.set(0.150, 0.012, 0);
      group.add(fuller);

      // Wire-cutter oblong eye
      const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0112, 10), recessedMat);
      eyeRing.rotation.x = Math.PI / 2;
      eyeRing.scale.set(1.65, 0.70, 1);
      eyeRing.position.set(0.230, -0.001, 0);
      group.add(eyeRing);

      // Heavy crossguard + faceted rifle muzzle ring
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.088, 0.025), darkSteelMat);
      guard.position.set(0.068, 0.004, 0);
      group.add(guard);

      const barrelRing = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0038, 8, 16), darkSteelMat);
      barrelRing.rotation.y = Math.PI / 2;
      barrelRing.position.set(0.068, 0.049, 0);
      group.add(barrelRing);

      // Barrel-profile ribbed tactical handle (10-sided faceted CS:S grip)
      const gripCore = new THREE.Mesh(new THREE.CylinderGeometry(0.0160, 0.0172, 0.134, 10), gripMat);
      gripCore.rotation.z = Math.PI / 2;
      group.add(gripCore);
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.0174, 0.0026, 6, 12), darkSteelMat);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(-0.048 + i * 0.019, 0, 0);
        group.add(rib);
      }

      // Octagonal steel bayonet latch pommel
      const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0185, 0.021, 8), darkSteelMat);
      pommel.rotation.z = Math.PI / 2;
      pommel.position.set(-0.075, 0, 0);
      group.add(pommel);
      const pommelCap = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.016), accentSteelMat);
      pommelCap.position.set(-0.087, 0, 0);
      group.add(pommelCap);

    } else {
      // Default Tactical — sharp CS:S/CS2 combat drop-point with swedge, angled guard & faceted grip
      const bladeStations = [
        { spine: [0.066, 0.019], ridge: [0.066, 0.005], edge: [0.066, -0.0175], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.116, 0.021], ridge: [0.116, 0.006], edge: [0.116, -0.0185], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.178, 0.0195], ridge: [0.178, 0.006], edge: [0.178, -0.0175], spineT: 0.0031, ridgeT: 0.0039 },
        { spine: [0.226, 0.012], ridge: [0.226, 0.004], edge: [0.226, -0.0115], spineT: 0.0020, ridgeT: 0.0026 },
        { spine: [0.264, 0.001], ridge: [0.264, 0.001], edge: [0.264, 0.001], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.0048, 0.0092), recessedMat);
      fuller.position.set(0.134, 0.0112, 0);
      group.add(fuller);

      // Angled dual-wing tactical guard with dorsal jimping
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.0135, 0.058, 0.0245), darkSteelMat);
      guard.position.set(0.062, -0.002, 0);
      guard.rotation.z = -0.10;
      group.add(guard);

      const hShape = new THREE.Shape();
      hShape.moveTo(-0.065, 0.0135);
      hShape.quadraticCurveTo(0.0, 0.0195, 0.059, 0.0155);
      hShape.lineTo(0.059, -0.0155);
      hShape.quadraticCurveTo(0.024, -0.0195, -0.006, -0.0155);
      hShape.quadraticCurveTo(-0.036, -0.0125, -0.065, -0.0165);
      hShape.closePath();
      const hGeo = new THREE.ExtrudeGeometry(hShape, {
        depth: 0.0152,
        bevelEnabled: true,
        bevelThickness: 0.0038,
        bevelSize: 0.0028,
        bevelSegments: 1
      });
      hGeo.translate(0, 0, -0.0076);
      group.add(new THREE.Mesh(hGeo, gripMat));

      for (const rx of [-0.036, -0.012, 0.014, 0.038]) {
        const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.0068, 0.0255, 0.0242), darkSteelMat);
        inlay.position.set(rx, 0, 0);
        group.add(inlay);
      }

      const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.031, 0.021), accentSteelMat);
      pommel.position.set(-0.071, -0.001, 0);
      group.add(pommel);
    }

    if (item && item.statTrak && typeof createStatTrakModule === 'function') {
      const stMod = createStatTrakModule(item.statTrakKills || 0);
      stMod.scale.setScalar(0.54);
      if (kt === 'karambit') {
        stMod.position.set(0.088, 0.008, 0.011);
        stMod.rotation.y = Math.PI / 2;
      } else if (kt === 'butterfly') {
        stMod.position.set(0.024, 0.009, 0.011);
        stMod.rotation.y = Math.PI / 2;
      } else if (kt === 'skeleton') {
        stMod.position.set(0.068, 0.002, 0.006);
        stMod.rotation.y = Math.PI / 2;
      } else if (kt === 'm9') {
        stMod.position.set(0.118, 0.001, 0.007);
        stMod.rotation.y = Math.PI / 2;
      } else {
        stMod.position.set(0.105, 0.001, 0.006);
        stMod.rotation.y = Math.PI / 2;
      }
      group.add(stMod);
      group.userData.statTrakModule = stMod;
    }

    group.userData.knifeType = kt;
    return group;
  }

  VI.buildKnifeModel = buildKnifeModel;
})(typeof self !== "undefined" ? self : globalThis);
