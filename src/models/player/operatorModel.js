// Unified procedural CoD MW4 Tactical Operator model shared by Loadouts Showcase and In-Game Avatars.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});

  function buildTacticalOperatorModel(options) {
    const opts = options || {};
    const detail = opts.detail === 'arena' ? 'arena' : 'showcase';
    const isArena = detail === 'arena';
    const isBot = Boolean(opts.isBot);
    const accentHex = Number.isFinite(opts.accentColor)
      ? opts.accentColor
      : (isArena ? (isBot ? 0xff4d6d : 0x54e5ff) : 0x65e7ff);
    const secondaryHex = isArena
      ? (isBot ? 0xff9b3d : 0xffb84d)
      : 0xffb84d;

    const rootGrp = new THREE.Group();
    const pelvisGrp = new THREE.Group();
    pelvisGrp.position.set(0, 0.92, 0);
    rootGrp.add(pelvisGrp);

    const upperBody = new THREE.Group();
    upperBody.position.set(0, 0.08, 0);
    pelvisGrp.add(upperBody);

    // CoD MW4 dark obsidian / charcoal / gunmetal palette with subtle metallic trim
    const bduMat = new THREE.MeshStandardMaterial({
      color: isArena ? (isBot ? 0x1e1920 : 0x141d28) : 0x161e29,
      roughness: 0.84,
      metalness: 0.12
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: isArena ? (isBot ? 0x251e24 : 0x1b2633) : 0x1c2530,
      roughness: 0.78,
      metalness: 0.14
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: isArena ? (isBot ? 0x2a2328 : 0x212c38) : 0x232d39,
      roughness: 0.62,
      metalness: 0.28
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x111720,
      roughness: 0.46,
      metalness: 0.48
    });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: isArena ? (isBot ? 0x282128 : 0x1f2a36) : 0x222c38,
      roughness: 0.44,
      metalness: 0.42
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x0e131a,
      roughness: 0.76,
      metalness: 0.18
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x526170,
      roughness: 0.30,
      metalness: 0.82
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x091622,
      emissive: accentHex,
      emissiveIntensity: isArena ? 0.55 : 0.42,
      roughness: 0.12,
      metalness: 0.94
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: isArena ? 1.05 : 0.85,
      roughness: 0.25,
      metalness: 0.5
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      emissive: secondaryHex,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.55
    });

    // Procedural equipped glove finish in showcase (tactical matte glove in arena)
    let gloveMat = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.72, metalness: 0.18 });
    if (!isArena && opts.gloveItem && typeof VI.paintGloveToCanvases === 'function' && KS) {
      const cleanGlove = KS.sanitizeGloveItem(opts.gloveItem);
      const glovePaint = VI.paintGloveToCanvases(cleanGlove, 256);
      const gloveMap = new THREE.CanvasTexture(glovePaint.albedoCanvas);
      gloveMap.colorSpace = THREE.SRGBColorSpace;
      gloveMat = new THREE.MeshStandardMaterial({ map: gloveMap, roughness: 0.62, metalness: 0.24 });
    }

    const seg = isArena ? 10 : 14;

    const addPart = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      parent.add(m);
      return m;
    };

    // ---------- 1. Articulated Legs (Hip -> Thigh -> Seamless Knee -> Shin -> Ankle -> Sculpted Tactical Boot) ----------
    const buildLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.115, -0.02, 0);
      pelvisGrp.add(hip);

      // Hip joint ball for zero seam gaps during stride
      addPart(hip, new THREE.SphereGeometry(0.082, seg, seg - 2), bduMat, 0, -0.02, 0);

      // Sculpted cargo thigh
      addPart(hip, new THREE.CylinderGeometry(0.084, 0.068, 0.38, seg), bduMat, 0, -0.21, 0);
      // Drop-leg holster / mag rig on outer thigh
      addPart(hip, new THREE.BoxGeometry(0.042, 0.15, 0.105), plateMat, side * 0.072, -0.20, 0.005);
      addPart(hip, new THREE.CylinderGeometry(0.085, 0.082, 0.022, seg), plateMat, 0, -0.17, 0);

      // Seamless knee sphere + hard-shell tactical knee cap
      addPart(hip, new THREE.SphereGeometry(0.068, seg, seg - 2), bduMat, 0, -0.41, 0.005);
      addPart(hip, new THREE.BoxGeometry(0.092, 0.095, 0.056), plateMat, 0, -0.41, 0.054, -0.08, 0, 0);

      // Lower shin / combat greave
      addPart(hip, new THREE.CylinderGeometry(0.064, 0.052, 0.36, seg), bduMat, 0, -0.60, -0.005);

      // Ankle cuff & sculpted combat boot (sole reaches exactly y = -0.90 in hip space -> y = 0.00 in root space!)
      addPart(hip, new THREE.CylinderGeometry(0.056, 0.058, 0.11, seg), bootMat, 0, -0.78, 0.0);
      addPart(hip, new THREE.BoxGeometry(0.102, 0.066, 0.225), bootMat, 0, -0.855, 0.045);
      addPart(hip, new THREE.BoxGeometry(0.108, 0.024, 0.238), plateMat, 0, -0.888, 0.045);

      if (!isArena) {
        // Athletic grounded combat stance for Loadout showcase
        hip.rotation.x = side < 0 ? -0.06 : 0.08;
        hip.rotation.y = side * 0.12;
        hip.rotation.z = side * -0.03;
      }
      return hip;
    };

    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    // ---------- 2. Pelvis & Heavy Battle Belt ----------
    addPart(pelvisGrp, new THREE.BoxGeometry(0.32, 0.14, 0.20), bduMat, 0, 0.0, 0);
    addPart(pelvisGrp, new THREE.BoxGeometry(0.355, 0.064, 0.232), plateMat, 0, 0.048, 0);
    // Cobra tactical belt buckle + side dump pouches
    addPart(pelvisGrp, new THREE.BoxGeometry(0.056, 0.044, 0.024), steelMat, 0, 0.048, 0.122);
    addPart(pelvisGrp, new THREE.BoxGeometry(0.032, 0.016, 0.028), secondaryMat, 0, 0.048, 0.124);
    addPart(pelvisGrp, new THREE.BoxGeometry(0.052, 0.095, 0.088), vestMat, -0.185, 0.03, -0.02);
    addPart(pelvisGrp, new THREE.BoxGeometry(0.052, 0.095, 0.088), vestMat, 0.185, 0.03, -0.02);

    // ---------- 3. Athletic Upper Torso + Multi-Layered JPC Plate Carrier ----------
    // Broad tapered chest core (narrower waist -> broad athletic shoulders)
    addPart(upperBody, new THREE.CylinderGeometry(0.185, 0.150, 0.44, seg), shirtMat, 0, 0.23, 0);
    // Sculpted front/back ballistic ceramic SAPI plates
    addPart(upperBody, new THREE.BoxGeometry(0.28, 0.34, 0.068), vestMat, 0, 0.25, 0.105);
    addPart(upperBody, new THREE.BoxGeometry(0.28, 0.34, 0.068), vestMat, 0, 0.25, -0.105);
    addPart(upperBody, new THREE.BoxGeometry(0.325, 0.21, 0.225), plateMat, 0, 0.18, 0);
    // Shoulder plate carrier harness straps
    for (const sx of [-0.11, 0.11]) {
      addPart(upperBody, new THREE.BoxGeometry(0.064, 0.042, 0.24), vestMat, sx, 0.435, 0);
    }
    // 3 Front MOLLE Rifle Mag Pouches with magazine tops peeking out
    for (let i = -1; i <= 1; i++) {
      addPart(upperBody, new THREE.BoxGeometry(0.066, 0.115, 0.044), plateMat, i * 0.080, 0.165, 0.152);
      addPart(upperBody, new THREE.BoxGeometry(0.052, 0.028, 0.032), steelMat, i * 0.080, 0.232, 0.152);
    }
    // Chest admin pouch + IFF callsign bar + tactical comms radio & whip antenna
    addPart(upperBody, new THREE.BoxGeometry(0.145, 0.062, 0.030), plateMat, 0, 0.335, 0.146);
    addPart(upperBody, new THREE.BoxGeometry(0.095, 0.014, 0.012), accentMat, 0, 0.342, 0.163);
    addPart(upperBody, new THREE.BoxGeometry(0.042, 0.012, 0.012), secondaryMat, 0.088, 0.378, 0.144);
    // Tactical PRC radio whip antenna rising behind left shoulder
    addPart(upperBody, new THREE.CylinderGeometry(0.004, 0.005, 0.24, 6), steelMat, -0.135, 0.49, -0.135, -0.12, 0, 0.10);

    // Low-profile assault hydration spine pack
    addPart(upperBody, new THREE.BoxGeometry(0.23, 0.32, 0.095), plateMat, 0, 0.26, -0.172);
    addPart(upperBody, new THREE.BoxGeometry(0.18, 0.10, 0.045), vestMat, 0, 0.17, -0.222);
    addPart(upperBody, new THREE.BoxGeometry(0.020, 0.16, 0.012), accentMat, -0.068, 0.27, -0.224);
    addPart(upperBody, new THREE.BoxGeometry(0.020, 0.16, 0.012), accentMat, 0.068, 0.27, -0.224);

    // Ballistic neck collar guard
    addPart(upperBody, new THREE.CylinderGeometry(0.095, 0.128, 0.072, seg), vestMat, 0, 0.458, 0);

    // ---------- 4. Ops-Core FAST Tactical Helmet, Balaclava, Respirator & Flip-Up NVGs ----------
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 0.545, 0.008);
    if (!isArena) headGrp.rotation.y = -0.10;
    upperBody.add(headGrp);

    // Neck + dark tactical balaclava head core
    addPart(headGrp, new THREE.CylinderGeometry(0.056, 0.064, 0.09, seg), plateMat, 0, -0.028, 0);
    addPart(headGrp, new THREE.SphereGeometry(0.104, seg + 4, seg + 2), plateMat, 0, 0.068, 0.004);

    // Sculpted jawline respirator half-mask
    addPart(headGrp, new THREE.BoxGeometry(0.112, 0.074, 0.098), vestMat, 0, 0.028, 0.058, 0.16, 0, 0);
    addPart(headGrp, new THREE.BoxGeometry(0.058, 0.036, 0.024), steelMat, 0, 0.024, 0.106);

    // High-cut FAST ballistic helmet dome + rear counterweight battery pack
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, seg + 6, seg + 2, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmetMat
    );
    dome.position.set(0, 0.088, -0.004);
    headGrp.add(dome);
    addPart(headGrp, new THREE.BoxGeometry(0.086, 0.056, 0.042), plateMat, 0, 0.092, -0.122);
    addPart(headGrp, new THREE.BoxGeometry(0.046, 0.014, 0.012), accentMat, 0, 0.102, -0.144);

    // Peltor ComTac ear-pro headset + ARC rails + boom mic
    for (const side of [-1, 1]) {
      addPart(headGrp, new THREE.CylinderGeometry(0.036, 0.036, 0.026, 10), plateMat, side * 0.118, 0.064, -0.004, 0, 0, Math.PI / 2);
      addPart(headGrp, new THREE.BoxGeometry(0.016, 0.022, 0.095), steelMat, side * 0.122, 0.106, -0.002);
    }

    // Front Wilcox NVG shroud + stowed dual-tube tactical NVGs (classic MW4 silhouette!)
    addPart(headGrp, new THREE.BoxGeometry(0.048, 0.044, 0.028), steelMat, 0, 0.150, 0.112, -0.22, 0, 0);
    addPart(headGrp, new THREE.BoxGeometry(0.072, 0.022, 0.034), plateMat, 0, 0.184, 0.120, -0.35, 0, 0);
    for (const nx of [-0.024, 0.024]) {
      addPart(headGrp, new THREE.CylinderGeometry(0.015, 0.014, 0.052, 8), plateMat, nx, 0.205, 0.112, 0.45, 0, 0);
      addPart(headGrp, new THREE.CylinderGeometry(0.011, 0.011, 0.008, 8), accentMat, nx, 0.226, 0.122, 0.45, 0, 0);
    }

    // Recessed smoked ballistic visor goggles + crisp rim glow
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.108, 0.052, seg + 4, 1, true, -Math.PI * 0.34, Math.PI * 0.68),
      visorMat
    );
    visor.position.set(0, 0.084, 0.014);
    headGrp.add(visor);
    const visorRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.114, 0.114, 0.009, seg + 4, 1, true, -Math.PI * 0.32, Math.PI * 0.64),
      accentMat
    );
    visorRim.position.set(0, 0.084, 0.015);
    headGrp.add(visorRim);

    // ---------- 5. Seamless Articulated Shoulders & Arms ----------
    const weaponSocket = new THREE.Group();
    const wepType = opts.weaponItem && opts.weaponItem.weaponType ? opts.weaponItem.weaponType : 'rifle';
    const isKatana = wepType === 'katana';
    const isAkimbo = wepType === 'akimbo';

    const buildArm = (side) => {
      // side = -1 is character's right (facing +Z camera right), side = +1 is character's left
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.225, 0.40, 0);
      upperBody.add(shoulder);

      // Seamless deltoid shoulder joint + contoured ballistic pauldron
      addPart(shoulder, new THREE.SphereGeometry(0.068, seg, seg - 2), shirtMat, 0, 0, 0);
      addPart(shoulder, new THREE.BoxGeometry(0.056, 0.105, 0.118), vestMat, side * 0.032, -0.015, 0);
      addPart(shoulder, new THREE.BoxGeometry(0.014, 0.044, 0.056), side > 0 ? secondaryMat : accentMat, side * 0.062, -0.01, 0.005);

      // Upper arm
      addPart(shoulder, new THREE.CylinderGeometry(0.054, 0.047, 0.25, seg), shirtMat, 0, -0.135, 0);

      // Seamless elbow pivot
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.26, 0);
      shoulder.add(elbow);
      addPart(elbow, new THREE.SphereGeometry(0.048, seg, seg - 2), plateMat, 0, 0, 0);

      // Forearm + tactical wrist GPS / gauntlet pad
      addPart(elbow, new THREE.CylinderGeometry(0.046, 0.038, 0.24, seg), shirtMat, 0, -0.125, 0);
      if (side > 0) {
        addPart(elbow, new THREE.BoxGeometry(0.052, 0.056, 0.046), plateMat, 0.012, -0.19, 0.018);
        addPart(elbow, new THREE.BoxGeometry(0.028, 0.030, 0.010), accentMat, 0.012, -0.19, 0.042);
      }

      // Wrist + gloved hand
      addPart(elbow, new THREE.SphereGeometry(0.036, 8, 8), gloveMat, 0, -0.25, 0);
      addPart(elbow, new THREE.BoxGeometry(0.060, 0.072, 0.072), gloveMat, 0, -0.285, 0.014);

      shoulder.userData.elbow = elbow;
      return shoulder;
    };

    const armR = buildArm(-1); // Operator's Right arm (-X in model space when facing +Z)
    const armL = buildArm(1);  // Operator's Left arm (+X in model space when facing +Z)

    if (!isArena) {
      if (isKatana) {
        // Heroic Ronin samurai showcase stance: right hand firmly grips wrapped tsuka in front of chest,
        // left hand relaxed near tactical belt / scabbard line
        armR.rotation.set(-0.56, 0.20, -0.18);
        armR.userData.elbow.rotation.set(-1.12, 0.28, 0.10);
        armL.rotation.set(-0.24, -0.10, 0.14);
        armL.userData.elbow.rotation.set(-0.46, -0.14, -0.06);
        weaponSocket.position.set(0.0, 0.18, 0.28);
      } else if (isAkimbo) {
        // Dual-wield combat ready: both arms forward holding paired pistols
        armR.rotation.set(-0.72, 0.08, -0.12);
        armR.userData.elbow.rotation.set(-0.78, 0.12, 0.08);
        armL.rotation.set(-0.72, -0.08, 0.12);
        armL.userData.elbow.rotation.set(-0.78, -0.12, -0.08);
        weaponSocket.position.set(0.0, 0.22, 0.34);
      } else {
        // Classic CoD MW4 Low-Ready two-handed carbine hold across chest (hands stay glued to elbows!)
        armR.rotation.set(-0.48, 0.12, -0.16);
        armR.userData.elbow.rotation.set(-1.18, 0.42, 0.18);
        armL.rotation.set(-0.66, -0.14, 0.22);
        armL.userData.elbow.rotation.set(-1.12, -0.52, -0.24);
        weaponSocket.position.set(0.01, 0.195, 0.275);
      }
    } else {
      // In-game combat aiming posture (facing -Z in avatarModel convention -> rotate root or arms)
      armR.rotation.set(-1.12, 0.12, -0.08);
      armR.userData.elbow.rotation.set(-0.48, 0.22, 0);
      armL.rotation.set(-1.08, -0.25, 0.14);
      armL.userData.elbow.rotation.set(-0.58, -0.35, 0);
      weaponSocket.position.set(-0.14, 0.28, 0.34);
    }
    upperBody.add(weaponSocket);

    // Mount live 3D weapon in Showcase (or clean combat weapon silhouette in Arena)
    let wepModel = null;
    if (!isArena && typeof VI.buildWeaponModel === 'function' && KS) {
      const cleanWep = KS.sanitizeWeaponItem(opts.weaponItem || KS.createStarterWeapon('rifle'));
      wepModel = VI.buildWeaponModel(cleanWep, opts.targetRenderer, opts.attachments || {});
      if (isKatana) {
        // Anchor directly to right gloved palm: yaw by PI so the -Z blade rises upward (+Y) and outward
        // in world space while the +Z wrapped tsuka handle sits squarely inside the closed fist.
        const katanaHandSocket = new THREE.Group();
        katanaHandSocket.position.set(0.0, -0.285, 0.016);
        katanaHandSocket.rotation.set(0.24, Math.PI - 0.28, -0.18);
        const kScale = 1.05;
        wepModel.scale.setScalar(kScale);
        // Shift weapon along local Z so mid-tsuka (z ≈ +0.105) rests directly inside the gloved palm
        wepModel.position.set(0, 0.004, -0.105 * kScale);
        katanaHandSocket.add(wepModel);
        armR.userData.elbow.add(katanaHandSocket);
      } else {
        if (isAkimbo) {
          wepModel.rotation.set(0.06, Math.PI, 0);
        } else {
          wepModel.rotation.set(0.14, Math.PI * 0.44, -0.20);
        }
        const wBox = new THREE.Box3().setFromObject(wepModel);
        const wCenter = new THREE.Vector3();
        const wSize = new THREE.Vector3();
        wBox.getCenter(wCenter);
        wBox.getSize(wSize);
        const wMax = Math.max(wSize.x, wSize.y, wSize.z, 0.2);
        const isShort = ['smg', 'mp7', 'deagle', 'pistol', 'g18', 'usps', 'revolver', 'akimbo'].includes(cleanWep.weaponType);
        const targetLen = isShort ? 0.52 : (cleanWep.weaponType === 'awp' || cleanWep.weaponType === 'dmr' || cleanWep.weaponType === 'scout' ? 0.88 : 0.74);
        const wScale = targetLen / wMax;
        wepModel.scale.setScalar(wScale);
        wepModel.position.set(-wCenter.x * wScale, -wCenter.y * wScale, -wCenter.z * wScale);
        weaponSocket.add(wepModel);
      }
    } else if (isArena) {
      // Crisp, readable third-person arena rifle + katana toggle group
      const arenaGun = new THREE.Group();
      const gunRec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.44), plateMat);
      gunRec.position.set(0, 0, 0.14);
      const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.34, 8), steelMat);
      gunBarrel.rotation.x = Math.PI / 2;
      gunBarrel.position.set(0, 0.02, 0.48);
      const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.07), vestMat);
      gunMag.position.set(0, -0.09, 0.18);
      const gunStripe = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.016, 0.24), accentMat);
      gunStripe.position.set(0, 0.025, 0.16);
      arenaGun.add(gunRec, gunBarrel, gunMag, gunStripe);
      weaponSocket.add(arenaGun);
      wepModel = arenaGun;
    }

    // Optional Katana Bullet-Deflect Energy Barrier Ring (visible on opponents actively holding RMB Deflect!)
    const parryAura = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.032, 8, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38f2ff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      })
    );
    parryAura.position.set(0, 0.24, 0.42);
    parryAura.visible = false;
    upperBody.add(parryAura);

    rootGrp.userData.pelvisGrp = pelvisGrp;
    rootGrp.userData.upperBody = upperBody;
    rootGrp.userData.headGrp = headGrp;
    rootGrp.userData.legL = legL;
    rootGrp.userData.legR = legR;
    rootGrp.userData.armL = armL;
    rootGrp.userData.armR = armR;
    rootGrp.userData.weaponSocket = weaponSocket;
    rootGrp.userData.wepModel = wepModel;
    rootGrp.userData.parryAura = parryAura;

    return rootGrp;
  }

  VI.buildTacticalOperatorModel = buildTacticalOperatorModel;
})(typeof self !== "undefined" ? self : globalThis);
