// =====================================================================
// VELOCITY COURSE CATALOG & HANDCRAFTED LEVEL BUILDERS
// 14 Counter-Strike inspired Surf Maps (Tiers 1-4, Linear & Staged)
// + 4 Movement & Gauntlet Time Trials
// =====================================================================
(function (root) {
  'use strict';

  const TIER_INFO = {
    1: { code: 'T1', label: 'Tier 1 — Beginner', short: 'Beginner', coinBonus: 0, color: '#7ee7ff' },
    2: { code: 'T2', label: 'Tier 2 — Intermediate', short: 'Intermediate', coinBonus: 10, color: '#5ef2a5' },
    3: { code: 'T3', label: 'Tier 3 — Advanced', short: 'Advanced', coinBonus: 20, color: '#f5c542' },
    4: { code: 'T4', label: 'Tier 4 — Expert', short: 'Expert', coinBonus: 35, color: '#ff6f61' }
  };

  // Backward-compatible global helpers for sandbox.js / daily.js / arenas.js
  function slab(x, top, z0, z1, w, mat) {
    return addBox(x, top - 1, (z0 + z1) / 2, w, 2, z1 - z0, mat || concrete);
  }
  function gateText(text, x, y, z, color) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 82);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    s.position.set(x, y, z); s.scale.set(15, 3.75, 1); levelGroup.add(s);
    return s;
  }
  function buildGates(list) {
    const gates = list.map(([x, y, z, r, sx, sy, sz, nx, nz]) => {
      const n = nx !== undefined && nz !== undefined ? V3(nx, 0, nz).normalize() : V3(0, 0, 1);
      return { p: V3(x, y, z), n, r, spawn: sx === undefined ? null : V3(sx, sy, sz) };
    });
    for (const g of gates) {
      g.mesh = new THREE.Mesh(new THREE.TorusGeometry(g.r, .14, 8, 64), new THREE.MeshBasicMaterial({ color: 0x2b4a5e }));
      g.mesh.position.copy(g.p);
      g.mesh.rotation.y = Math.atan2(g.n.x, g.n.z);
      levelGroup.add(g.mesh);
    }
    return gates;
  }

  function makeBuilder(themeId, bOpts) {
    if (bOpts && bOpts.builder) return bOpts.builder;
    return createWorldBuilder({
      group: (bOpts && bOpts.group) || levelGroup,
      collide: bOpts ? bOpts.collide !== false : true,
      theme: themeId,
      isPreview: Boolean(bOpts && bOpts.isPreview)
    });
  }

  // Helper to build a sleek bordered start/checkpoint deck with accent edge strip
  function buildSurfDeck(b, x, topY, z0, z1, w, edgeEnd) {
    b.slab(x, topY, z0, z1, w);
    const edgeZ = edgeEnd === 'start' ? z0 + 0.35 : z1 - 0.35;
    b.addBox(x, topY + 0.12, edgeZ, w, 0.24, 0.45, b.mats.accent, false);
    b.addBox(x - w * 0.5, topY + 1.2, (z0 + z1) * 0.5, 0.9, 2.4, z1 - z0, b.mats.dark, false);
    b.addBox(x + w * 0.5, topY + 1.2, (z0 + z1) * 0.5, 0.9, 2.4, z1 - z0, b.mats.dark, false);
  }

  // ===================================================================
  // SURF 01 — SKYLINE DRIFT (T1 · Linear · Slate) [Preserves id='surf1']
  // ===================================================================
  function buildSurfSkyline(bOpts) {
    const b = makeBuilder('slate', bOpts);
    const slope = 50, fw = 14.5;
    const startY = 60;
    buildSurfDeck(b, 0, startY, -24, 16, 30, 'end');
    b.addPylon(-20, startY, -10, 22); b.addPylon(20, startY, -10, 22);
    b.addSurfWedge([0, 59.5, 18], [0, 52, 120], { faceWidth: fw, slopeDeg: slope, side: 'left', lipStart: true, lipEnd: true });

    const deckAY = 40.5;
    buildSurfDeck(b, 0, deckAY, 126, 158, 34, 'end');
    b.addPylon(-22, deckAY, 142, 17); b.addPylon(22, deckAY, 142, 17);

    const curveA = b.addSurfCurve({ start: [0, 40, 160], yawStart: 0, yawDelta: Math.PI / 3, radius: 62, pitchDrop: -4, segments: 14, faceWidth: fw, slopeDeg: slope, side: 'left', lipStart: true, lipEnd: true });
    const cAE = curveA.curve.end, cAF = curveA.curve.endTangent;
    const curveB = b.addSurfCurve({ start: [cAE[0] + cAF[0] * 8, cAE[1] - 0.4, cAE[2] + cAF[2] * 8], yawStart: Math.PI / 3, yawDelta: -Math.PI / 3, radius: 62, pitchDrop: -4, segments: 14, faceWidth: fw, slopeDeg: slope, side: 'left', lipStart: true, lipEnd: true });
    const cBE = curveB.curve.end;
    const deckBX = cBE[0], deckBY = cBE[1] - 11.6, deckBZ0 = Math.round(cBE[2]) + 6, deckBZ1 = deckBZ0 + 34;
    buildSurfDeck(b, deckBX, deckBY, deckBZ0, deckBZ1, 36, 'end');
    b.addPylon(deckBX - 24, deckBY, deckBZ0 + 17, 18); b.addPylon(deckBX + 24, deckBY, deckBZ0 + 17, 18);

    const wallBStart = deckBZ1 + 6, wallBEnd = wallBStart + 100;
    b.addSurfWedge([deckBX, deckBY - 0.5, wallBStart], [deckBX, deckBY - 8, wallBEnd], { faceWidth: fw, slopeDeg: slope, side: 'right', lipStart: true, lipEnd: true });

    const deckCY = 1.2, deckCZ0 = wallBEnd + 6, deckCZ1 = deckCZ0 + 32;
    buildSurfDeck(b, deckBX, deckCY, deckCZ0, deckCZ1, 36, 'end');
    b.addPylon(deckBX - 24, deckCY, deckCZ0 + 16, 17); b.addPylon(deckBX + 24, deckCY, deckCZ0 + 16, 17);

    const curveC = b.addSurfCurve({ start: [deckBX, deckCY - 0.4, deckCZ1 + 2], yawStart: 0, yawDelta: -Math.PI / 3, radius: 54, pitchDrop: -4, segments: 14, faceWidth: fw, slopeDeg: slope, side: 'right', lipStart: true, lipEnd: true });
    const cCE = curveC.curve.end, cCF = curveC.curve.endTangent;
    const curveD = b.addSurfCurve({ start: [cCE[0] + cCF[0] * 8, cCE[1] - 0.4, cCE[2] + cCF[2] * 8], yawStart: -Math.PI / 3, yawDelta: Math.PI / 3, radius: 54, pitchDrop: -4, segments: 14, faceWidth: fw, slopeDeg: slope, side: 'right', lipStart: true, lipEnd: true });
    const cDE = curveD.curve.end;
    const deckDX = cDE[0], deckDY = cDE[1] - 11.6, deckDZ0 = Math.round(cDE[2]) + 6, deckDZ1 = deckDZ0 + 34;
    buildSurfDeck(b, deckDX, deckDY, deckDZ0, deckDZ1, 36, 'end');

    const finalStart = deckDZ1 + 6, finalEnd = finalStart + 100;
    b.addSurfWedge([deckDX, deckDY - 0.5, finalStart], [deckDX, deckDY - 7, finalEnd], { faceWidth: fw, slopeDeg: slope, side: 'left', lipStart: true, lipEnd: true });
    const finishY = deckDY - 18.1, finishZ0 = finalEnd + 6, finishZ1 = finishZ0 + 60;
    buildSurfDeck(b, deckDX, finishY, finishZ0, finishZ1, 36, 'start');
    b.addPylon(deckDX - 24, finishY, finishZ0 + 30, 23); b.addPylon(deckDX + 24, finishY, finishZ0 + 30, 23);
    b.addBox(deckDX, finishY + 23, finishZ0 + 30, 46, .7, 1.2, b.mats.lip, false);

    const gates = b.buildGates([
      [0, 63, 5, 8],
      [0, 42, 142, 12, 0, deckAY + 0.05, 132],
      [deckBX, deckBY + 2, deckBZ0 + 17, 13, deckBX, deckBY + 0.05, deckBZ0 + 7],
      [deckBX, deckCY + 2, deckCZ0 + 16, 13, deckBX, deckCY + 0.05, deckCZ0 + 6],
      [deckDX, deckDY + 2, deckDZ0 + 17, 13, deckDX, deckDY + 0.05, deckDZ0 + 7],
      [deckDX, finishY + 2, finishZ0 + 30, 12]
    ]);
    b.gateText('START', 0, 68, 5, '#65e7ff');
    b.gateText('FINISH', deckDX, finishY + 12, finishZ0 + 30, '#ff9b55');
    return {
      id: 'surf1', theme: 'slate', format: 'linear', tier: 1,
      spawn: V3(0, startY, -8), yaw: Math.PI, course: gates, bound: 0, killY: finishY - 26, surfHint: true,
      previewWaypoints: [
        [-22, 74, 8], [-18, 62, 100], [18, 46, 215], [deckBX + 22, 22, wallBStart + 50],
        [deckDX - 18, finishY + 26, finalStart + 50], [deckDX, finishY + 16, finishZ0 + 10]
      ]
    };
  }

  // ===================================================================
  // SURF 02 — UTOPIA FLOW (T1 · Linear · Sandstone)
  // Iconic sunlit surf_utopia downhill A-frame marathon with wide curves
  // ===================================================================
  function buildSurfUtopia(bOpts) {
    const b = makeBuilder('sandstone', bOpts);
    const slope = 48, fw = 15.5;
    buildSurfDeck(b, 0, 96, -24, 14, 34, 'end');
    b.addCanyonMesa(-46, 56, 30, 28, 72, 46);
    b.addCanyonMesa(46, 54, 70, 30, 74, 52);

    // Long downhill A-frame highway 1
    b.addSurfWedge([0, 95, 16], [0, 81, 132], { faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 72, 142, 174, 36, 'end');
    b.addCanyonMesa(-48, 34, 155, 32, 68, 44);

    // Downhill A-frame 2 -> sweeping wide Utopia turn
    b.addSurfWedge([0, 71, 176], [0, 58, 282], { faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true });
    const sweep1 = b.addSurfCurve({
      start: [0, 57, 290], yawStart: 0, yawDelta: Math.PI / 2.6, radius: 74, pitchDrop: -12,
      segments: 16, faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true
    });
    const s1e = sweep1.curve.end, s1t = sweep1.curve.endTangent;
    const cp2 = [s1e[0] + s1t[0] * 22, s1e[1] - 7, s1e[2] + s1t[2] * 22];
    b.addDeck(cp2[0], cp2[1], cp2[2], 38, 36);
    b.addCanyonMesa(cp2[0] + 46, cp2[1] - 32, cp2[2] + 10, 30, 70, 48);

    // Counter-sweep downhill curve returning toward +Z
    const sweep2 = b.addSurfCurve({
      start: [cp2[0] + s1t[0] * 20, cp2[1] - 0.5, cp2[2] + s1t[2] * 20],
      yawStart: sweep1.curve.endYaw, yawDelta: -sweep1.curve.endYaw, radius: 72, pitchDrop: -12,
      segments: 16, faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true
    });
    const s2e = sweep2.curve.end;
    const cp3X = s2e[0], cp3Y = s2e[1] - 7, cp3Z0 = s2e[2] + 10, cp3Z1 = cp3Z0 + 34;
    buildSurfDeck(b, cp3X, cp3Y, cp3Z0, cp3Z1, 38, 'end');

    // Dual-A-frame high-speed valley + boost ring jump
    b.addSurfWedge([cp3X, cp3Y - 0.6, cp3Z1 + 3], [cp3X, cp3Y - 12, cp3Z1 + 115], { faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true });
    b.addBoostRing([cp3X, cp3Y - 11, cp3Z1 + 128], [0, 0.14, 1], { radius: 7.5, minSpeed: 46, upBoost: 7 });
    b.addSurfWedge([cp3X, cp3Y - 14, cp3Z1 + 144], [cp3X, cp3Y - 26, cp3Z1 + 266], { faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true });

    const finY = cp3Y - 34, finZ0 = cp3Z1 + 276, finZ1 = finZ0 + 62;
    buildSurfDeck(b, cp3X, finY, finZ0, finZ1, 40, 'start');
    b.addPylon(cp3X - 24, finY, finZ0 + 28, 24); b.addPylon(cp3X + 24, finY, finZ0 + 28, 24);
    b.addBox(cp3X, finY + 24, finZ0 + 28, 48, 1.2, 2.2, b.mats.accent, false);

    const gates = b.buildGates([
      [0, 99, 6, 8],
      [0, 75, 158, 12, 0, 72.1, 148],
      [cp2[0], cp2[1] + 4, cp2[2], 13, cp2[0], cp2[1] + 0.1, cp2[2], s1t[0], s1t[2]],
      [cp3X, cp3Y + 4, cp3Z0 + 17, 13, cp3X, cp3Y + 0.1, cp3Z0 + 8],
      [cp3X, cp3Y - 10, cp3Z1 + 128, 13, cp3X, cp3Y + 0.1, cp3Z0 + 8],
      [cp3X, finY + 4, finZ0 + 28, 14]
    ]);
    b.gateText('UTOPIA START', 0, 105, 6, '#ffb35c');
    b.gateText('FINISH', cp3X, finY + 14, finZ0 + 28, '#4be3ff');
    return {
      id: 'surf_utopia', theme: 'sandstone', format: 'linear', tier: 1,
      spawn: V3(0, 96, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 28, surfHint: true,
      previewWaypoints: [
        [-26, 112, 10], [-20, 92, 130], [28, 74, 285], [cp2[0] + 24, cp2[1] + 26, cp2[2] + 30],
        [cp3X - 24, cp3Y + 14, cp3Z1 + 95], [cp3X + 18, finY + 24, finZ0 - 15]
      ]
    };
  }

  // ===================================================================
  // SURF 03 — KITSUNE NEON (T1 · Staged · 5 Stages · Kitsune Obsidian)
  // Iconic neon-lit staged learning rooms with instant stage portals
  // ===================================================================
  function buildSurfKitsune(bOpts) {
    const b = makeBuilder('kitsune', bOpts);
    const stages = [];
    const registerRoom = (idx, sx, sy, sz, failY) => {
      stages.push({ idx, sx, sy, sz, failY });
      b.addFailZone({
        minY: failY, minX: sx - 66, maxX: sx + 66, minZ: sz - 50, maxZ: sz + 340,
        respawn: [sx, sy + 0.1, sz], respawnYaw: Math.PI, label: `STAGE ${idx + 1} RETRY`
      });
    };

    // STAGE 1 (X=0): Wide neon A-frame -> straight transfer into portal
    const s1 = [0, 40, 0];
    registerRoom(0, s1[0], s1[1], s1[2], 6);
    buildSurfDeck(b, 0, 40, -18, 14, 28, 'end');
    b.addNeonFrame(0, 44, 58, 30, 22, 0);
    b.addSurfWedge([0, 39.2, 16], [0, 31, 108], { faceWidth: 14, slopeDeg: 49, side: 'both', lipStart: true, lipEnd: true });
    b.addNeonFrame(0, 33, 126, 30, 22, 0);
    b.addSurfWedge([0, 29.5, 118], [0, 23, 200], { faceWidth: 14, slopeDeg: 49, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 17, 208, 240, 30, 'start');

    // STAGE 2 (X=160): Twin-wall neon V-channel tunnel
    const s2 = [160, 44, 0];
    registerRoom(1, s2[0], s2[1], s2[2], 6);
    buildSurfDeck(b, 160, 44, -18, 14, 28, 'end');
    b.addSurfChannel([160, 43, 18], [160, 32, 140], { halfGap: 14, faceWidth: 14, slopeDeg: 50, ribs: 5, lipStart: true, lipEnd: true });
    b.addBoostRing([160, 31, 152], [0, 0.14, 1], { radius: 7.2, minSpeed: 42, upBoost: 7 });
    b.addSurfWedge([160, 29, 166], [160, 22, 236], { faceWidth: 14, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 160, 16, 244, 274, 30, 'start');

    // STAGE 3 (X=320): Alternating left/right banks teaching crisp crossover air-strafe
    const s3 = [320, 48, 0];
    registerRoom(2, s3[0], s3[1], s3[2], 6);
    buildSurfDeck(b, 320, 48, -18, 14, 28, 'end');
    b.addSurfWedge([320, 47, 16], [320, 39, 102], { faceWidth: 14, slopeDeg: 50, side: 'left', lipStart: true, lipEnd: true });
    b.addNeonFrame(320, 39, 114, 28, 20, 0);
    b.addSurfWedge([320, 36.5, 116], [320, 28.5, 202], { faceWidth: 14, slopeDeg: 50, side: 'right', lipStart: true, lipEnd: true });
    b.addSurfWedge([320, 26.5, 214], [320, 20, 284], { faceWidth: 14, slopeDeg: 50, side: 'left', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 320, 14, 292, 322, 30, 'start');

    // STAGE 4 (X=480): Smooth curved sweep + launch flick into portal
    const s4 = [480, 50, 0];
    registerRoom(3, s4[0], s4[1], s4[2], 4);
    buildSurfDeck(b, 480, 50, -18, 14, 28, 'end');
    const kCurve = b.addSurfCurve({
      start: [480, 49, 16], yawStart: 0, yawDelta: Math.PI / 2.2, radius: 56, pitchDrop: -12,
      segments: 16, faceWidth: 13.5, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true
    });
    const kce = kCurve.curve.end, kct = kCurve.curve.endTangent;
    const kFlick = b.addSurfFlick({
      start: [kce[0] + kct[0] * 10, kce[1] - 2.5, kce[2] + kct[2] * 10],
      yaw: kCurve.curve.endYaw, length: 42, rise: 7, faceWidth: 13.5, slopeDeg: 50, side: 'both'
    });
    const s4End = [kFlick.spec.b[0] + kct[0] * 26, kFlick.spec.b[1] - 5, kFlick.spec.b[2] + kct[2] * 26];
    b.addDeck(s4End[0], s4End[1], s4End[2], 32, 32);

    // STAGE 5 (X=660): 270-degree neon corkscrew finale into Finish Shrine
    const s5 = [660, 68, 0];
    registerRoom(4, s5[0], s5[1], s5[2], 4);
    buildSurfDeck(b, 660, 68, -18, 14, 28, 'end');
    const kSpiral = b.addSurfSpiral({
      start: [660, 67, 16], yawStart: 0, yawDelta: Math.PI * 1.5, radiusStart: 40, radiusEnd: 36,
      pitchDrop: -26, segments: 24, faceWidth: 13.5, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true
    });
    const kse = kSpiral.spiral.end, kst = kSpiral.spiral.endTangent;
    const finPos = [kse[0] + kst[0] * 28, kse[1] - 8, kse[2] + kst[2] * 28];
    b.addDeck(finPos[0], finPos[1], finPos[2], 36, 36);
    b.addNeonFrame(finPos[0], finPos[1] + 10, finPos[2], 28, 18, kSpiral.spiral.endYaw);

    // Wire Stage Teleporters & Gates (gate 0 = start, gates 1..4 = stage portals, gate 5 = finish)
    const gates = b.buildGates([
      [0, 43, 6, 8],
      [0, 21, 224, 11, s2[0], s2[1] + 0.1, s2[2]],
      [160, 20, 260, 11, s3[0], s3[1] + 0.1, s3[2]],
      [320, 18, 308, 11, s4[0], s4[1] + 0.1, s4[2]],
      [s4End[0], s4End[1] + 4, s4End[2], 12, s5[0], s5[1] + 0.1, s5[2]],
      [finPos[0], finPos[1] + 4, finPos[2], 12, undefined, undefined, undefined, kst[0], kst[2]]
    ]);
    b.addStageTeleporter([0, 17, 232], [16, 12, 6], [s2[0], s2[1] + 0.1, s2[2] - 8], Math.PI, { gateIndex: 1, label: 'STAGE 2 / 5' });
    b.addStageTeleporter([160, 16, 266], [16, 12, 6], [s3[0], s3[1] + 0.1, s3[2] - 8], Math.PI, { gateIndex: 2, label: 'STAGE 3 / 5' });
    b.addStageTeleporter([320, 14, 314], [16, 12, 6], [s4[0], s4[1] + 0.1, s4[2] - 8], Math.PI, { gateIndex: 3, label: 'STAGE 4 / 5' });
    b.addStageTeleporter([s4End[0], s4End[1], s4End[2]], [18, 12, 12], [s5[0], s5[1] + 0.1, s5[2] - 8], Math.PI, { yaw: kCurve.curve.endYaw, gateIndex: 4, label: 'STAGE 5 / 5' });

    b.gateText('STAGE 1 / 5', 0, 49, 6, '#45f0ff');
    b.gateText('STAGE 2 / 5', 160, 53, 6, '#ff3b7a');
    b.gateText('STAGE 3 / 5', 320, 57, 6, '#45f0ff');
    b.gateText('STAGE 4 / 5', 480, 59, 6, '#ff3b7a');
    b.gateText('STAGE 5 / 5', 660, 77, 6, '#45f0ff');
    b.gateText('FINISH', finPos[0], finPos[1] + 14, finPos[2], '#ff9b55');

    return {
      id: 'surf_kitsune', theme: 'kitsune', format: 'staged', tier: 1,
      spawn: V3(0, 40, -10), yaw: Math.PI, course: gates, bound: 0, killY: -12, surfHint: true,
      previewWaypoints: [
        [-20, 52, 20], [160, 54, 65], [320 + 26, 50, 120],
        [495, 58, 60], [690, 72, 35], [645, 50, 70]
      ]
    };
  }

  // ===================================================================
  // SURF 04 — MESA CANYON (T1 · Linear · Sandstone)
  // Wide canyon half-pipe V-channels & sweeping mesa bridges
  // ===================================================================
  function buildSurfMesa(bOpts) {
    const b = makeBuilder('sandstone', bOpts);
    buildSurfDeck(b, 0, 78, -22, 14, 32, 'end');
    for (let z = 30; z <= 320; z += 75) {
      b.addCanyonMesa(-42, 20, z, 24, 68, 38);
      b.addCanyonMesa(42, 20, z + 20, 24, 68, 38);
    }

    // Canyon V-channel entry
    b.addSurfChannel([0, 77, 18], [0, 64, 152], { halfGap: 14.5, faceWidth: 14.5, slopeDeg: 49, lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 55, 160, 192, 34, 'end');

    // Flowing S-curve through canyon arch
    const sc = b.addSurfSCurve({
      start: [0, 54, 196], yawStart: 0, yawDelta: Math.PI / 3.2, radius: 58, pitchDrop: -14,
      segmentsPerArc: 12, gap: 6, faceWidth: 14, slopeDeg: 49, bothSides: true, lipStart: true, lipEnd: true
    });
    const sce = sc.scurve.end;
    const d2X = sce[0], d2Y = sce[1] - 8, d2Z0 = sce[2] + 10, d2Z1 = d2Z0 + 34;
    buildSurfDeck(b, d2X, d2Y, d2Z0, d2Z1, 36, 'end');

    // Second V-channel -> flick launch over bridge -> final A-frame
    b.addSurfChannel([d2X, d2Y - 0.6, d2Z1 + 4], [d2X, d2Y - 12, d2Z1 + 124], { halfGap: 13.5, faceWidth: 14, slopeDeg: 50, ribs: 4, lipStart: true, lipEnd: true });
    b.addSurfFlick({ start: [d2X, d2Y - 13, d2Z1 + 132], yaw: 0, length: 34, rise: 6.5, faceWidth: 14, slopeDeg: 50, side: 'both' });
    buildSurfDeck(b, d2X, d2Y - 11, d2Z1 + 180, d2Z1 + 214, 36, 'end');

    b.addSurfWedge([d2X, d2Y - 11.6, d2Z1 + 218], [d2X, d2Y - 22, d2Z1 + 320], { faceWidth: 14.5, slopeDeg: 49, side: 'both', lipStart: true, lipEnd: true });
    const finY = d2Y - 29, finZ0 = d2Z1 + 328, finZ1 = finZ0 + 56;
    buildSurfDeck(b, d2X, finY, finZ0, finZ1, 38, 'start');

    const gates = b.buildGates([
      [0, 81, 6, 8],
      [0, 58, 176, 12, 0, 55.1, 166],
      [d2X, d2Y + 3, d2Z0 + 17, 13, d2X, d2Y + 0.1, d2Z0 + 8],
      [d2X, d2Y - 8, d2Z1 + 196, 13, d2X, d2Y - 10.9, d2Z1 + 186],
      [d2X, finY + 4, finZ0 + 26, 13]
    ]);
    b.gateText('MESA START', 0, 87, 6, '#ffb35c');
    b.gateText('FINISH', d2X, finY + 12, finZ0 + 26, '#4be3ff');

    return {
      id: 'surf_mesa', theme: 'sandstone', format: 'linear', tier: 1,
      spawn: V3(0, 78, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 26, surfHint: true,
      previewWaypoints: [
        [0, 92, 10], [14, 78, 120], [32, 62, 240], [d2X - 24, d2Y + 14, d2Z1 + 70],
        [d2X + 20, d2Y + 4, d2Z1 + 230], [d2X, finY + 16, finZ0 - 10]
      ]
    };
  }

  // ===================================================================
  // SURF 05 — BOREAS RIDGE (T2 · Linear · Boreas Glacial Glass)
  // Snowy alpine ravines, frosted glass ramps & boost-ring flights
  // ===================================================================
  function buildSurfBoreas(bOpts) {
    const b = makeBuilder('boreas', bOpts);
    buildSurfDeck(b, 0, 104, -22, 14, 30, 'end');
    const snowMat = b.mats.deck;
    for (let i = 0; i < 10; i++) {
      const z = 40 + i * 76;
      b.addBackdropPeak(-54 - (i % 2) * 18, 24 - i * 4, z, 32, 84, snowMat);
      b.addBackdropPeak(54 + ((i + 1) % 2) * 18, 22 - i * 4, z + 26, 34, 88, snowMat);
    }

    // Long frosted-glass ravine bank -> boost ring transfer
    b.addSurfWedge([0, 103, 18], [0, 89, 134], { faceWidth: 13, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });
    b.addBoostRing([0, 89, 148], [0, 0.16, 1], { radius: 6.8, minSpeed: 48, upBoost: 8 });
    const c1 = b.addSurfCurve({
      start: [0, 87, 166], yawStart: 0, yawDelta: -Math.PI / 2.4, radius: 66, pitchDrop: -14,
      segments: 16, faceWidth: 12.8, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const c1e = c1.curve.end, c1t = c1.curve.endTangent;
    const cp1 = [c1e[0] + c1t[0] * 24, c1e[1] - 7, c1e[2] + c1t[2] * 24];
    b.addDeck(cp1[0], cp1[1], cp1[2], 32, 32);

    // Second alpine curve swinging back + glass V-gorge
    const c2 = b.addSurfCurve({
      start: [cp1[0] + c1t[0] * 18, cp1[1] - 0.5, cp1[2] + c1t[2] * 18],
      yawStart: c1.curve.endYaw, yawDelta: -c1.curve.endYaw, radius: 62, pitchDrop: -12,
      segments: 16, faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const c2e = c2.curve.end;
    const d2X = c2e[0], d2Y = c2e[1] - 7, d2Z0 = c2e[2] + 10, d2Z1 = d2Z0 + 30;
    buildSurfDeck(b, d2X, d2Y, d2Z0, d2Z1, 32, 'end');

    b.addSurfChannel([d2X, d2Y - 0.6, d2Z1 + 4], [d2X, d2Y - 14, d2Z1 + 132], { halfGap: 13, faceWidth: 13, slopeDeg: 52, lipStart: true, lipEnd: true });
    b.addBoostRing([d2X, d2Y - 13, d2Z1 + 148], [0, 0.2, 1], { radius: 6.5, minSpeed: 50, upBoost: 9 });
    b.addSurfWedge([d2X, d2Y - 12, d2Z1 + 168], [d2X, d2Y - 24, d2Z1 + 276], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });

    const finY = d2Y - 32, finZ0 = d2Z1 + 286, finZ1 = finZ0 + 54;
    buildSurfDeck(b, d2X, finY, finZ0, finZ1, 36, 'start');

    const gates = b.buildGates([
      [0, 107, 6, 8],
      [0, 89, 148, 12, 0, 104.1, -8],
      [cp1[0], cp1[1] + 4, cp1[2], 12, cp1[0], cp1[1] + 0.1, cp1[2], c1t[0], c1t[2]],
      [d2X, d2Y + 4, d2Z0 + 15, 12, d2X, d2Y + 0.1, d2Z0 + 6],
      [d2X, finY + 4, finZ0 + 26, 13]
    ]);
    b.gateText('BOREAS RIDGE', 0, 113, 6, '#7ef2ff');
    b.gateText('FINISH', d2X, finY + 13, finZ0 + 26, '#ffad60');

    return {
      id: 'surf_boreas', theme: 'boreas', format: 'linear', tier: 2,
      spawn: V3(0, 104, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 28, surfHint: true,
      previewWaypoints: [
        [-24, 116, 14], [18, 98, 140], [c1e[0] + 22, c1e[1] + 24, c1e[2] - 10],
        [d2X - 24, d2Y + 16, d2Z1 + 50], [d2X + 18, d2Y + 6, d2Z1 + 180], [d2X, finY + 16, finZ0 - 8]
      ]
    };
  }

  // ===================================================================
  // SURF 06 — AIRCONTROL (T2 · Linear · Slate)
  // Mid-air 90-135 degree strafe turns around floating sky-islands
  // ===================================================================
  function buildSurfAircontrol(bOpts) {
    const b = makeBuilder('slate', bOpts);
    buildSurfDeck(b, 0, 88, -20, 14, 28, 'end');
    // Ramp 1 (+Z) -> 90 deg left air-strafe around tower onto Ramp 2 (+X)
    b.addSurfWedge([0, 87, 16], [0, 77, 106], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });
    b.addPylon(-10, 62, 128, 36); // landmark pillar to wrap around
    b.addSurfWedge([18, 71, 126], [108, 61, 126], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });

    b.addDeck(130, 54, 126, 30, 30);

    // Ramp 3 (+X) -> 90 deg right air-strafe back toward +Z
    b.addSurfWedge([148, 53.5, 126], [234, 44, 126], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });
    b.addPylon(254, 28, 116, 36);
    b.addSurfWedge([254, 38, 146], [254, 28, 238], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 254, 21, 248, 278, 30, 'end');

    // Flick -> 90 deg left wrap around monolith -> final ramp (-X -> finish)
    b.addSurfFlick({ start: [254, 20.5, 280], yaw: 0, length: 34, rise: 7.5, faceWidth: 12, slopeDeg: 52, side: 'both' });
    b.addPylon(238, 12, 336, 34);
    b.addSurfWedge([232, 22, 336], [134, 12, 336], { faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true });

    // Final 90 deg curve into +Z finish
    const endCurve = b.addSurfCurve({
      start: [122, 10.5, 336], yawStart: -Math.PI / 2, yawDelta: Math.PI / 2, radius: 46, pitchDrop: -8,
      segments: 14, faceWidth: 12.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const ece = endCurve.curve.end;
    const finY = ece[1] - 7, finZ0 = ece[2] + 10, finZ1 = finZ0 + 52;
    buildSurfDeck(b, ece[0], finY, finZ0, finZ1, 34, 'start');

    const gates = b.buildGates([
      [0, 91, 6, 8],
      [130, 58, 126, 12, 122, 54.1, 126, 1, 0],
      [254, 25, 262, 12, 254, 21.1, 254, 0, 1],
      [176, 18, 336, 12, 254, 21.1, 254, -1, 0],
      [ece[0], finY + 4, finZ0 + 24, 13, undefined, undefined, undefined, 0, 1]
    ]);
    b.gateText('AIRCONTROL', 0, 97, 6, '#65e7ff');
    b.gateText('FINISH', ece[0], finY + 12, finZ0 + 24, '#ff9b55');

    return {
      id: 'surf_aircontrol', theme: 'slate', format: 'linear', tier: 2,
      spawn: V3(0, 88, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 26, surfHint: true,
      previewWaypoints: [
        [-22, 100, 10], [22, 86, 118], [130, 74, 104], [268, 52, 160],
        [218, 36, 318], [ece[0] + 18, finY + 20, finZ0 - 8]
      ]
    };
  }

  // ===================================================================
  // SURF 07 — ROOKIE ASCENT (T2 · Staged · 5 Stages · Slate)
  // Escalating multi-room stages: boosters, tubes, S-curves, 270 spiral
  // ===================================================================
  function buildSurfRookie(bOpts) {
    const b = makeBuilder('slate', bOpts);
    const addStageFail = (idx, x, y, z, minY) => {
      b.addFailZone({
        minY, minX: x - 75, maxX: x + 75, minZ: z - 50, maxZ: z + 360,
        respawn: [x, y + 0.1, z - 8], respawnYaw: Math.PI, label: `STAGE ${idx + 1} RETRY`
      });
    };

    // Stage 1: Downhill wedge -> boost ring -> catch wedge
    addStageFail(0, 0, 50, 0, 8);
    buildSurfDeck(b, 0, 50, -18, 14, 28, 'end');
    b.addSurfWedge([0, 49, 16], [0, 40, 104], { faceWidth: 13, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true });
    b.addBoostRing([0, 40, 118], [0, 0.18, 1], { radius: 6.5, minSpeed: 45, upBoost: 7.5 });
    b.addSurfWedge([0, 38, 136], [0, 30, 214], { faceWidth: 13, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 24, 224, 254, 28, 'start');

    // Stage 2: Twin half-pipe channel -> upward flick into elevated deck
    addStageFail(1, 180, 52, 0, 8);
    buildSurfDeck(b, 180, 52, -18, 14, 28, 'end');
    b.addSurfChannel([180, 51, 18], [180, 38, 148], { halfGap: 13, faceWidth: 13, slopeDeg: 51, ribs: 5, lipStart: true, lipEnd: true });
    b.addSurfFlick({ start: [180, 37, 158], yaw: 0, length: 34, rise: 8, faceWidth: 12.5, slopeDeg: 51, side: 'both' });
    buildSurfDeck(b, 180, 40, 206, 238, 28, 'start');

    // Stage 3: S-curve chicane
    addStageFail(2, 360, 58, 0, 6);
    buildSurfDeck(b, 360, 58, -18, 14, 28, 'end');
    const rsc = b.addSurfSCurve({
      start: [360, 57, 16], yawStart: 0, yawDelta: Math.PI / 2.8, radius: 52, pitchDrop: -16,
      segmentsPerArc: 12, gap: 8, faceWidth: 12.5, slopeDeg: 51, bothSides: true, lipStart: true, lipEnd: true
    });
    const r3e = rsc.scurve.end;
    buildSurfDeck(b, r3e[0], r3e[1] - 7, r3e[2] + 10, r3e[2] + 42, 30, 'start');

    // Stage 4: Offset spine transfers with boost ring
    addStageFail(3, 560, 60, 0, 6);
    buildSurfDeck(b, 560, 60, -18, 14, 28, 'end');
    b.addSurfWedge([552, 59, 16], [552, 50, 102], { faceWidth: 12, slopeDeg: 52, side: 'right', lipStart: true, lipEnd: true });
    b.addSurfWedge([568, 47, 114], [568, 38, 200], { faceWidth: 12, slopeDeg: 52, side: 'left', lipStart: true, lipEnd: true });
    b.addBoostRing([560, 38, 214], [0, 0.16, 1], { radius: 6.2, minSpeed: 46, upBoost: 7 });
    b.addSurfWedge([560, 36, 230], [560, 28, 300], { faceWidth: 12, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 560, 22, 310, 340, 28, 'start');

    // Stage 5: 270 deg corkscrew drop
    addStageFail(4, 760, 74, 0, 4);
    buildSurfDeck(b, 760, 74, -18, 14, 28, 'end');
    const rsp = b.addSurfSpiral({
      start: [760, 73, 16], yawStart: 0, yawDelta: -Math.PI * 1.5, radiusStart: 38, radiusEnd: 34,
      pitchDrop: -28, segments: 24, faceWidth: 12, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true
    });
    const r5e = rsp.spiral.end, r5t = rsp.spiral.endTangent;
    const finPos = [r5e[0] + r5t[0] * 26, r5e[1] - 8, r5e[2] + r5t[2] * 26];
    b.addDeck(finPos[0], finPos[1], finPos[2], 34, 34);

    const gates = b.buildGates([
      [0, 53, 6, 8],
      [0, 28, 240, 11, 180, 52.1, -8],
      [180, 44, 222, 11, 360, 58.1, -8],
      [r3e[0], r3e[1] - 3, r3e[2] + 26, 11, 560, 60.1, -8],
      [560, 26, 326, 11, 760, 74.1, -8],
      [finPos[0], finPos[1] + 4, finPos[2], 12, undefined, undefined, undefined, r5t[0], r5t[2]]
    ]);
    b.addStageTeleporter([0, 24, 246], [16, 12, 6], [180, 52.1, -8], Math.PI, { gateIndex: 1, label: 'STAGE 2 / 5' });
    b.addStageTeleporter([180, 40, 230], [16, 12, 6], [360, 58.1, -8], Math.PI, { gateIndex: 2, label: 'STAGE 3 / 5' });
    b.addStageTeleporter([r3e[0], r3e[1] - 7, r3e[2] + 34], [16, 12, 6], [560, 60.1, -8], Math.PI, { gateIndex: 3, label: 'STAGE 4 / 5' });
    b.addStageTeleporter([560, 22, 332], [16, 12, 6], [760, 74.1, -8], Math.PI, { gateIndex: 4, label: 'STAGE 5 / 5' });
    b.gateText('ROOKIE STG 1', 0, 59, 6, '#65e7ff');
    b.gateText('FINISH', finPos[0], finPos[1] + 13, finPos[2], '#ff9b55');

    return {
      id: 'surf_rookie', theme: 'slate', format: 'staged', tier: 2,
      spawn: V3(0, 50, -10), yaw: Math.PI, course: gates, bound: 0, killY: -12, surfHint: true,
      previewWaypoints: [
        [-20, 62, 24], [180, 62, 90], [385, 64, 70], [584, 62, 120],
        [724, 76, 40], [finPos[0] - 18, finPos[1] + 18, finPos[2] - 18]
      ]
    };
  }

  // ===================================================================

  // ===================================================================
  // SURF — BREAKWATER RUN (T2 · Linear · Slate)
  // Industrial harbor course: bank transfer, two sweeping turns, a slipway wrap.
  // ===================================================================
  function buildSurfBreakwater(bOpts) {
    const b = makeBuilder('slate', bOpts);
    const catchDeck = (x, top, z, w, d) => {
      b.addDeck(x, top, z, w, d);
      b.addBox(x, top + 0.14, z - d * 0.5, w, 0.28, 0.5, b.mats.accent, false);
      b.addBox(x, top + 0.14, z + d * 0.5, w, 0.28, 0.5, b.mats.accent, false);
      b.addBox(x - w * 0.5, top + 0.14, z, 0.5, 0.28, d, b.mats.lip, false);
      b.addBox(x + w * 0.5, top + 0.14, z, 0.5, 0.28, d, b.mats.lip, false);
    };

    buildSurfDeck(b, 0, 92, -26, 16, 34, 'end');
    b.addNeonFrame(0, 105, 5, 38, 24, 0);
    b.addSurfWedge([0, 91.5, 18], [0, 80, 126], {
      faceWidth: 14, slopeDeg: 50.5, side: 'left', lipStart: true, lipEnd: true
    });
    buildSurfDeck(b, 0, 68.5, 130, 168, 38, 'end');

    const turn1 = b.addSurfCurve({
      start: [0, 67.8, 170], yawStart: 0, yawDelta: Math.PI / 2,
      radius: 54, pitchDrop: -9, segments: 20,
      faceWidth: 14, slopeDeg: 50.5, side: 'both', lipStart: true, lipEnd: true
    });
    const t1End = turn1.curve.end;
    catchDeck(76, 51.5, 224, 44, 42);

    b.addSurfWedge([99, 50.5, 224], [208, 40, 224], {
      faceWidth: 13.5, slopeDeg: 51, side: 'right', lipStart: true, lipEnd: true
    });
    catchDeck(226, 28.5, 224, 40, 40);

    const turn2 = b.addSurfCurve({
      start: [248, 27.5, 224], yawStart: Math.PI / 2, yawDelta: Math.PI / 2,
      radius: 54, pitchDrop: -9, segments: 20,
      faceWidth: 14, slopeDeg: 50.5, side: 'both', lipStart: true, lipEnd: true
    });
    const t2End = turn2.curve.end;
    catchDeck(302, 11.5, 151, 40, 42);

    b.addSurfWedge([302, 10.5, 126], [302, 1, 48], {
      faceWidth: 13.5, slopeDeg: 51, side: 'left', lipStart: true, lipEnd: true
    });
    buildSurfDeck(b, 302, -10.5, 12, 48, 38, 'end');

    const slipwayTurn = b.addSurfCurve({
      start: [302, -10.5, 9], yawStart: Math.PI, yawDelta: Math.PI,
      radius: 48, pitchDrop: -8, segments: 24,
      faceWidth: 13, slopeDeg: 51.5, side: 'both', lipStart: true, lipEnd: true
    });
    const uEnd = slipwayTurn.curve.end;
    catchDeck(206, -25.5, 27, 42, 38);

    b.addSurfWedge([206, -26.5, 50], [206, -37.5, 150], {
      faceWidth: 14, slopeDeg: 50.5, side: 'both', lipStart: true, lipEnd: true
    });
    buildSurfDeck(b, 206, -49.5, 154, 218, 42, 'start');
    b.addNeonFrame(206, -28, 184, 38, 22, 0);

    b.addPylon(-30, 65, 82, 58);
    b.addPylon(30, 65, 82, 58);
    b.addBox(0, 123, 82, 64, 1.4, 1.6, b.mats.accent, false);
    b.addBox(-58, 24, 178, 30, 48, 46, b.mats.dark, false);
    b.addBox(-58, 49, 178, 31, 0.8, 47, b.mats.lip, false);
    b.addBox(128, 12, 280, 34, 28, 44, b.mats.dark, false);
    b.addBox(128, 27, 280, 35, 0.8, 45, b.mats.accent, false);
    b.addPylon(354, -13, 150, 44);
    b.addBox(254, -10, 9, 14, 54, 14, b.mats.dark, false);
    b.addBox(254, 17.5, 9, 18, 0.9, 18, b.mats.accent, false);
    b.addBox(254, -37.5, 9, 18, 0.9, 18, b.mats.lip, false);
    b.addPylon(178, -63, 184, 25);
    b.addPylon(234, -63, 184, 25);
    b.gateText('BREAKWATER RUN', 0, 111, 5, '#65e7ff');
    b.gateText('FINISH', 206, -35, 184, '#ff9b55');

    const gates = b.buildGates([
      [0, 96, 6, 8],
      [0, 72.5, 149, 12, 0, 68.6, 137],
      [80, 55.5, 224, 12, 66, 51.6, 224, 1, 0],
      [228, 32.5, 224, 12, 214, 28.6, 224, 1, 0],
      [302, -6.5, 28, 12, 302, -10.4, 40, 0, -1],
      [206, -21.5, 30, 12, 206, -25.4, 18, 0, 1],
      [206, -45.5, 184, 14, undefined, undefined, undefined, 0, 1]
    ]);

    return {
      id: 'surf_breakwater', theme: 'slate', format: 'linear', tier: 2,
      spawn: V3(0, 92, -10), yaw: Math.PI, course: gates, bound: 0,
      killY: -78, surfHint: true,
      previewWaypoints: [
        [-20, 105, 8], [0, 88, 112], [26, 70, 198],
        [t1End[0], t1End[1] + 15, t1End[2]], [154, 56, 238], [226, 43, 224],
        [286, 28, 198], [t2End[0] + 8, t2End[1] + 12, t2End[2] - 84],
        [302, 12, 86], [254, -12, -30], [uEnd[0], uEnd[1] - 6, uEnd[2] + 24],
        [206, -35, 112], [206, -39, 184]
      ]
    };
  }

  // SURF 08 — HELIX SPIRE (T3 · Linear · Prism)
  // Chained 360-degree helical corkscrew spirals & inner-ring flicks
  // ===================================================================
  function buildSurfHelix(bOpts) {
    const b = makeBuilder('prism', bOpts);
    buildSurfDeck(b, 0, 142, -20, 14, 28, 'end');

    // Entry drop into 360 deg Clockwise Spiral
    b.addSurfWedge([0, 141, 16], [0, 132, 82], { faceWidth: 11.5, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    const sp1 = b.addSurfSpiral({
      start: [0, 131, 88], yawStart: 0, yawDelta: Math.PI * 2, radiusStart: 42, radiusEnd: 36,
      pitchDrop: -34, segments: 32, faceWidth: 11.5, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true
    });
    const s1e = sp1.spiral.end;
    buildSurfDeck(b, s1e[0], s1e[1] - 7, s1e[2] + 10, s1e[2] + 42, 30, 'end');

    // Launch flick -> boost ring -> Counter-Clockwise 360 deg Spiral
    const midZ = s1e[2] + 46;
    b.addSurfFlick({ start: [s1e[0], s1e[1] - 7.5, midZ], yaw: 0, length: 34, rise: 8.5, faceWidth: 11, slopeDeg: 53, side: 'both' });
    b.addBoostRing([s1e[0], s1e[1] + 3, midZ + 48], [0, 0.08, 1], { radius: 6, minSpeed: 48, upBoost: 5 });

    const sp2 = b.addSurfSpiral({
      start: [s1e[0], s1e[1] - 2, midZ + 66], yawStart: 0, yawDelta: -Math.PI * 2, radiusStart: 38, radiusEnd: 32,
      pitchDrop: -36, segments: 32, faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true
    });
    const s2e = sp2.spiral.end;
    buildSurfDeck(b, s2e[0], s2e[1] - 7, s2e[2] + 10, s2e[2] + 42, 30, 'end');

    // Final high-speed glass plunge + flick finish
    b.addSurfWedge([s2e[0], s2e[1] - 7.6, s2e[2] + 46], [s2e[0], s2e[1] - 20, s2e[2] + 150], { faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true });
    const finY = s2e[1] - 27, finZ0 = s2e[2] + 160, finZ1 = finZ0 + 52;
    buildSurfDeck(b, s2e[0], finY, finZ0, finZ1, 34, 'start');
    b.addNeonFrame(s2e[0], finY + 10, finZ0 + 24, 28, 18, 0);

    const gates = b.buildGates([
      [0, 145, 6, 8],
      [sp1.spiral.center[0] + 40, 118, sp1.spiral.center[2], 12, 0, 142.1, -8, 0, -1],
      [s1e[0], s1e[1] - 3, s1e[2] + 26, 12, s1e[0], s1e[1] - 6.9, s1e[2] + 16],
      [s1e[0], s1e[1] + 3, midZ + 48, 11, s1e[0], s1e[1] - 6.9, s1e[2] + 16],
      [s2e[0], s2e[1] - 3, s2e[2] + 26, 12, s2e[0], s2e[1] - 6.9, s2e[2] + 16],
      [s2e[0], finY + 4, finZ0 + 24, 13]
    ]);
    b.gateText('HELIX SPIRE', 0, 151, 6, '#b982ff');
    b.gateText('FINISH', s2e[0], finY + 14, finZ0 + 24, '#ffc857');

    return {
      id: 'surf_helix', theme: 'prism', format: 'linear', tier: 3,
      spawn: V3(0, 142, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 26, surfHint: true,
      previewWaypoints: [
        [-22, 154, 16], [sp1.spiral.center[0] + 58, 134, sp1.spiral.center[2] - 24],
        [sp1.spiral.center[0] - 48, 110, sp1.spiral.center[2] + 34],
        [s1e[0] + 26, s1e[1] + 16, midZ + 44], [sp2.spiral.center[0] - 54, s1e[1] - 12, sp2.spiral.center[2] + 14],
        [s2e[0] + 20, finY + 20, finZ0 - 8]
      ]
    };
  }

  // ===================================================================
  // SURF 09 — PRISM VAULT (T3 · Staged · 5 Stages · Prism)
  // Crystalline 53-54 deg glass chambers, spine transfers & boost threading
  // ===================================================================
  function buildSurfPrism(bOpts) {
    const b = makeBuilder('prism', bOpts);
    const regFail = (idx, x, y, z, minY) => {
      b.addFailZone({
        minY, minX: x - 75, maxX: x + 75, minZ: z - 50, maxZ: z + 380,
        respawn: [x, y + 0.1, z - 8], respawnYaw: Math.PI, label: `VAULT ${idx + 1} RETRY`
      });
    };

    // Stage 1: Narrow alternating crystal spines
    regFail(0, 0, 62, 0, 10);
    buildSurfDeck(b, 0, 62, -18, 14, 26, 'end');
    b.addSurfWedge([-8, 61, 16], [-8, 51, 98], { faceWidth: 11, slopeDeg: 53, side: 'right', lipStart: true, lipEnd: true });
    b.addSurfWedge([8, 49, 108], [8, 39, 190], { faceWidth: 11, slopeDeg: 53, side: 'left', lipStart: true, lipEnd: true });
    b.addSurfWedge([-6, 37, 200], [-6, 29, 272], { faceWidth: 11, slopeDeg: 53, side: 'right', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 22, 282, 312, 28, 'start');

    // Stage 2: High-speed double boost-ring crystal threading
    regFail(1, 190, 64, 0, 8);
    buildSurfDeck(b, 190, 64, -18, 14, 26, 'end');
    b.addSurfWedge([190, 63, 16], [190, 53, 98], { faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true });
    b.addBoostRing([190, 53, 114], [0, 0.22, 1], { radius: 5.5, minSpeed: 52, upBoost: 9 });
    b.addBoostRing([190, 56, 158], [0, 0.08, 1], { radius: 5.5, minSpeed: 54, upBoost: 6 });
    b.addSurfWedge([190, 51, 180], [190, 41, 264], { faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 190, 34, 274, 304, 28, 'start');

    // Stage 3: Steep 54 deg V-channel slingshot + launch flick
    regFail(2, 380, 64, 0, 8);
    buildSurfDeck(b, 380, 64, -18, 14, 26, 'end');
    b.addSurfChannel([380, 63, 18], [380, 48, 152], { halfGap: 11.5, faceWidth: 11.5, slopeDeg: 54, ribs: 6, lipStart: true, lipEnd: true });
    b.addSurfFlick({ start: [380, 47, 164], yaw: 0, length: 34, rise: 10, faceWidth: 10.5, slopeDeg: 54, side: 'both' });
    b.addSurfWedge([380, 52, 214], [380, 44, 286], { faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 380, 38, 296, 326, 28, 'start');

    // Stage 4: Tight S-chicane with mid-curve flick
    regFail(3, 570, 68, 0, 6);
    buildSurfDeck(b, 570, 68, -18, 14, 26, 'end');
    const psc = b.addSurfSCurve({
      start: [570, 67, 16], yawStart: 0, yawDelta: -Math.PI / 2.4, radius: 44, pitchDrop: -18,
      segmentsPerArc: 14, gap: 10, faceWidth: 10.8, slopeDeg: 54, bothSides: true, lipStart: true, lipEnd: true
    });
    const p4e = psc.scurve.end;
    buildSurfDeck(b, p4e[0], p4e[1] - 7, p4e[2] + 10, p4e[2] + 42, 28, 'start');

    // Stage 5: 360 deg crystalline spiral into finish sanctum
    regFail(4, 770, 88, 0, 6);
    buildSurfDeck(b, 770, 88, -18, 14, 26, 'end');
    const psp = b.addSurfSpiral({
      start: [770, 87, 16], yawStart: 0, yawDelta: Math.PI * 2, radiusStart: 36, radiusEnd: 30,
      pitchDrop: -32, segments: 30, faceWidth: 10.8, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true
    });
    const p5e = psp.spiral.end;
    const finY = p5e[1] - 8, finZ0 = p5e[2] + 12, finZ1 = finZ0 + 48;
    buildSurfDeck(b, p5e[0], finY, finZ0, finZ1, 32, 'start');

    const gates = b.buildGates([
      [0, 65, 6, 8],
      [0, 26, 296, 11, 190, 64.1, -8],
      [190, 38, 288, 11, 380, 64.1, -8],
      [380, 42, 310, 11, 570, 68.1, -8],
      [p4e[0], p4e[1] - 3, p4e[2] + 26, 11, 770, 88.1, -8],
      [p5e[0], finY + 4, finZ0 + 24, 12]
    ]);
    b.addStageTeleporter([0, 22, 304], [15, 11, 6], [190, 64.1, -8], Math.PI, { gateIndex: 1, label: 'STAGE 2 / 5' });
    b.addStageTeleporter([190, 34, 296], [15, 11, 6], [380, 64.1, -8], Math.PI, { gateIndex: 2, label: 'STAGE 3 / 5' });
    b.addStageTeleporter([380, 38, 318], [15, 11, 6], [570, 68.1, -8], Math.PI, { gateIndex: 3, label: 'STAGE 4 / 5' });
    b.addStageTeleporter([p4e[0], p4e[1] - 7, p4e[2] + 34], [15, 11, 6], [770, 88.1, -8], Math.PI, { gateIndex: 4, label: 'STAGE 5 / 5' });
    b.gateText('PRISM VAULT', 0, 71, 6, '#b982ff');
    b.gateText('FINISH', p5e[0], finY + 13, finZ0 + 24, '#ffc857');

    return {
      id: 'surf_prism', theme: 'prism', format: 'staged', tier: 3,
      spawn: V3(0, 62, -10), yaw: Math.PI, course: gates, bound: 0, killY: -12, surfHint: true,
      previewWaypoints: [
        [-22, 72, 24], [190 + 22, 72, 130], [380, 72, 120],
        [540, 74, 70], [806, 84, 20], [p5e[0] + 18, finY + 18, finZ0 - 6]
      ]
    };
  }

  // ===================================================================
  // SURF 10 — SYRIA DUNES (T3 · Linear · Sandstone)
  // High-speed desert aqueducts, split forks, tight S-chicanes & flicks
  // ===================================================================
  function buildSurfSyria(bOpts) {
    const b = makeBuilder('sandstone', bOpts);
    buildSurfDeck(b, 0, 112, -20, 14, 28, 'end');
    for (let z = 50; z <= 520; z += 95) {
      b.addCanyonMesa(-58, 30 - z * 0.08, z, 28, 86, 44);
      b.addCanyonMesa(58, 30 - z * 0.08, z + 30, 28, 86, 44);
    }

    // Split-fork aqueduct ramps (left & right parallel A-frames)
    b.addSurfWedge([-14, 111, 18], [-14, 98, 122], { faceWidth: 11, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    b.addSurfWedge([14, 111, 18], [14, 98, 122], { faceWidth: 11, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 90, 132, 162, 34, 'end');

    // Tight high-speed S-chicane
    const sc = b.addSurfSCurve({
      start: [0, 89, 166], yawStart: 0, yawDelta: Math.PI / 2.5, radius: 46, pitchDrop: -18,
      segmentsPerArc: 14, gap: 10, faceWidth: 11, slopeDeg: 53, bothSides: true, lipStart: true, lipEnd: true
    });
    const sce = sc.scurve.end;
    const cp2X = sce[0], cp2Y = sce[1] - 7, cp2Z0 = sce[2] + 10, cp2Z1 = cp2Z0 + 30;
    buildSurfDeck(b, cp2X, cp2Y, cp2Z0, cp2Z1, 30, 'end');

    // High-arc desert flick -> aqueduct bridge jump -> boost ring sprint
    b.addSurfFlick({ start: [cp2X, cp2Y - 0.6, cp2Z1 + 4], yaw: 0, length: 34, rise: 9.5, faceWidth: 10.8, slopeDeg: 53, side: 'both' });
    b.addBoostRing([cp2X, cp2Y + 11, cp2Z1 + 52], [0, 0.14, 1], { radius: 5.8, minSpeed: 52, upBoost: 7 });
    b.addSurfWedge([cp2X, cp2Y + 4, cp2Z1 + 74], [cp2X, cp2Y - 12, cp2Z1 + 198], { faceWidth: 11, slopeDeg: 53, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, cp2X, cp2Y - 19, cp2Z1 + 208, cp2Z1 + 238, 30, 'end');

    // Final canyon channel + flick into oasis finish
    b.addSurfChannel([cp2X, cp2Y - 19.6, cp2Z1 + 242], [cp2X, cp2Y - 32, cp2Z1 + 364], { halfGap: 11.5, faceWidth: 11, slopeDeg: 53, ribs: 4, lipStart: true, lipEnd: true });
    const finY = cp2Y - 40, finZ0 = cp2Z1 + 374, finZ1 = finZ0 + 54;
    buildSurfDeck(b, cp2X, finY, finZ0, finZ1, 34, 'start');

    const gates = b.buildGates([
      [0, 115, 6, 8],
      [0, 94, 147, 12, 0, 90.1, 138],
      [cp2X, cp2Y + 4, cp2Z0 + 15, 12, cp2X, cp2Y + 0.1, cp2Z0 + 6],
      [cp2X, cp2Y + 11, cp2Z1 + 52, 11, cp2X, cp2Y + 0.1, cp2Z0 + 6],
      [cp2X, cp2Y - 15, cp2Z1 + 223, 12, cp2X, cp2Y - 18.9, cp2Z1 + 214],
      [cp2X, finY + 4, finZ0 + 26, 13]
    ]);
    b.gateText('SYRIA DUNES', 0, 121, 6, '#ffb35c');
    b.gateText('FINISH', cp2X, finY + 13, finZ0 + 26, '#4be3ff');

    return {
      id: 'surf_syria', theme: 'sandstone', format: 'linear', tier: 3,
      spawn: V3(0, 112, -10), yaw: Math.PI, course: gates, bound: 0, killY: finY - 26, surfHint: true,
      previewWaypoints: [
        [0, 126, 12], [28, 108, 120], [42, 92, 230], [cp2X - 24, cp2Y + 20, cp2Z1 + 50],
        [cp2X + 24, cp2Y - 6, cp2Z1 + 245], [cp2X, finY + 18, finZ0 - 8]
      ]
    };
  }

  // ===================================================================
  // SURF 11 — SINSANE VOID (T4 · Staged · 5 Stages · Void Ember)
  // Expert precision: narrow 54-55 deg banks, 180 flicks & corkscrews
  // ===================================================================
  function buildSurfSinsane(bOpts) {
    const b = makeBuilder('void', bOpts);
    const regFail = (idx, x, y, z, minY) => {
      b.addFailZone({
        minY, minX: x - 85, maxX: x + 85, minZ: z - 60, maxZ: z + 380,
        respawn: [x, y + 0.1, z - 8], respawnYaw: Math.PI, label: `VOID ${idx + 1} RETRY`
      });
    };

    // Stage 1: Razor-thin offset 54 deg spine chain
    regFail(0, 0, 74, 0, 10);
    buildSurfDeck(b, 0, 74, -16, 14, 24, 'end');
    b.addSurfWedge([0, 73, 18], [0, 62, 104], { faceWidth: 9.8, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true });
    b.addSurfWedge([16, 58, 118], [16, 47, 204], { faceWidth: 9.5, slopeDeg: 55, side: 'left', lipStart: true, lipEnd: true });
    b.addSurfWedge([-14, 43, 218], [-14, 33, 298], { faceWidth: 9.5, slopeDeg: 55, side: 'right', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 0, 26, 310, 338, 24, 'start');

    // Stage 2: 180-degree blind flick wrap around void monolith
    regFail(1, 210, 76, 0, 10);
    buildSurfDeck(b, 210, 76, -16, 14, 24, 'end');
    b.addSurfWedge([210, 75, 18], [210, 64, 112], { faceWidth: 9.8, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true });
    b.addSurfFlick({ start: [210, 63, 120], yaw: 0, length: 30, rise: 9.5, faceWidth: 9.5, slopeDeg: 55, side: 'both' });
    b.addPylon(228, 48, 174, 42);
    // Return ramp heading -Z (180 deg turn!)
    b.addSurfWedge([246, 65, 166], [246, 52, 62], { faceWidth: 9.8, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 246, 45, 22, 52, 24, 'end');

    // Stage 3: High-speed narrow V-tube -> needle boost ring -> flick
    regFail(2, 430, 76, 0, 10);
    buildSurfDeck(b, 430, 76, -16, 14, 24, 'end');
    b.addSurfChannel([430, 75, 18], [430, 58, 152], { halfGap: 10.2, faceWidth: 10, slopeDeg: 55, ribs: 6, lipStart: true, lipEnd: true });
    b.addBoostRing([430, 58, 168], [0, 0.24, 1], { radius: 4.9, minSpeed: 56, upBoost: 10 });
    b.addSurfWedge([430, 58, 194], [430, 46, 286], { faceWidth: 9.5, slopeDeg: 55, side: 'both', lipStart: true, lipEnd: true });
    buildSurfDeck(b, 430, 39, 298, 326, 24, 'start');

    // Stage 4: Opposing corkscrew transfer (270 left -> 270 right)
    regFail(3, 640, 102, 0, 6);
    buildSurfDeck(b, 640, 102, -16, 14, 24, 'end');
    const spA = b.addSurfSpiral({
      start: [640, 101, 18], yawStart: 0, yawDelta: Math.PI * 1.5, radiusStart: 34, radiusEnd: 30,
      pitchDrop: -26, segments: 24, faceWidth: 9.8, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true
    });
    const sae = spA.spiral.end, sat = spA.spiral.endTangent;
    const spB = b.addSurfSpiral({
      start: [sae[0] + sat[0] * 14, sae[1] - 4, sae[2] + sat[2] * 14],
      yawStart: spA.spiral.endYaw, yawDelta: -Math.PI * 1.5, radiusStart: 32, radiusEnd: 28,
      pitchDrop: -26, segments: 24, faceWidth: 9.5, slopeDeg: 55, side: 'both', lipStart: true, lipEnd: true
    });
    const sbe = spB.spiral.end, sbt = spB.spiral.endTangent;
    const s4Deck = [sbe[0] + sbt[0] * 24, sbe[1] - 7, sbe[2] + sbt[2] * 24];
    b.addDeck(s4Deck[0], s4Deck[1], s4Deck[2], 26, 26);

    // Stage 5: Final 360 tight ember spiral -> boost sky vault -> shrine
    regFail(4, 860, 108, 0, 4);
    buildSurfDeck(b, 860, 108, -16, 14, 24, 'end');
    const spF = b.addSurfSpiral({
      start: [860, 107, 18], yawStart: 0, yawDelta: -Math.PI * 2, radiusStart: 32, radiusEnd: 26,
      pitchDrop: -34, segments: 32, faceWidth: 9.2, slopeDeg: 55, side: 'both', lipStart: true, lipEnd: true
    });
    const sfe = spF.spiral.end;
    b.addBoostRing([sfe[0], sfe[1] - 2, sfe[2] + 16], [0, 0.22, 1], { radius: 4.8, minSpeed: 56, upBoost: 9 });
    const finY = sfe[1] - 4, finZ0 = sfe[2] + 44, finZ1 = finZ0 + 48;
    buildSurfDeck(b, sfe[0], finY, finZ0, finZ1, 30, 'start');
    b.addNeonFrame(sfe[0], finY + 10, finZ0 + 22, 26, 18, 0);

    const gates = b.buildGates([
      [0, 77, 6, 8],
      [0, 30, 324, 10, 210, 76.1, -8],
      [246, 49, 36, 10, 430, 76.1, -8, 0, -1],
      [430, 43, 312, 10, 640, 102.1, -8],
      [s4Deck[0], s4Deck[1] + 4, s4Deck[2], 11, 860, 108.1, -8],
      [sfe[0], finY + 4, finZ0 + 22, 12]
    ]);
    b.addStageTeleporter([0, 26, 330], [14, 11, 6], [210, 76.1, -8], Math.PI, { gateIndex: 1, label: 'STAGE 2 / 5' });
    b.addStageTeleporter([246, 45, 28], [14, 11, 6], [430, 76.1, -8], Math.PI, { gateIndex: 2, label: 'STAGE 3 / 5' });
    b.addStageTeleporter([430, 39, 320], [14, 11, 6], [640, 102.1, -8], Math.PI, { gateIndex: 3, label: 'STAGE 4 / 5' });
    b.addStageTeleporter([s4Deck[0], s4Deck[1], s4Deck[2]], [16, 11, 10], [860, 108.1, -8], Math.PI, { gateIndex: 4, label: 'STAGE 5 / 5' });
    b.gateText('SINSANE VOID', 0, 83, 6, '#ff6b3d');
    b.gateText('FINISH', sfe[0], finY + 13, finZ0 + 22, '#5ce8ff');

    return {
      id: 'surf_sinsane', theme: 'void', format: 'staged', tier: 4,
      spawn: V3(0, 74, -10), yaw: Math.PI, course: gates, bound: 0, killY: -14, surfHint: true,
      previewWaypoints: [
        [-22, 84, 30], [228, 86, 126], [430 + 24, 82, 130],
        [670, 96, 20], [826, 106, 28], [sfe[0] + 18, finY + 18, finZ0 - 6]
      ]
    };
  }

  // ===================================================================
  // SURF 12 — OMNIFIC MARATHON (T4 · Linear · Void Ember)
  // Grand expert linear showcase uniting every authentic CS surf piece
  // ===================================================================
  function buildSurfOmnific(bOpts) {
    const b = makeBuilder('void', bOpts);
    buildSurfDeck(b, 0, 184, -22, 14, 26, 'end');

    // 1. Opening 450-degree grand helical drop
    b.addSurfWedge([0, 183, 16], [0, 174, 78], { faceWidth: 10.2, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true });
    const sp1 = b.addSurfSpiral({
      start: [0, 173, 84], yawStart: 0, yawDelta: Math.PI * 2.5, radiusStart: 42, radiusEnd: 34,
      pitchDrop: -44, segments: 38, faceWidth: 10, slopeDeg: 54, side: 'both', lipStart: true, lipEnd: true
    });
    const s1e = sp1.spiral.end, s1t = sp1.spiral.endTangent;
    const cp1 = [s1e[0] + s1t[0] * 24, s1e[1] - 7, s1e[2] + s1t[2] * 24];
    b.addDeck(cp1[0], cp1[1], cp1[2], 28, 28);

    // 2. High-speed V-channel along +X heading -> flick launch
    const chStart = [cp1[0] + 18, cp1[1] - 0.6, cp1[2]];
    const chEnd = [chStart[0] + 132, chStart[1] - 16, chStart[2]];
    b.addSurfChannel(chStart, chEnd, { halfGap: 10.5, faceWidth: 10.2, slopeDeg: 54, ribs: 5, lipStart: true, lipEnd: true });
    const fl1 = b.addSurfFlick({ start: [chEnd[0] + 10, chEnd[1] - 1, chEnd[2]], yaw: Math.PI / 2, length: 34, rise: 9.5, faceWidth: 9.8, slopeDeg: 54, side: 'both' });
    const cp2 = [fl1.spec.b[0] + 24, fl1.spec.b[1] - 5, fl1.spec.b[2]];
    b.addDeck(cp2[0], cp2[1], cp2[2], 28, 28);

    // 3. Double-spine offset flick chain + boost ring sky vault
    b.addSurfWedge([cp2[0] + 18, cp2[1] - 0.5, cp2[2] - 10], [cp2[0] + 114, cp2[1] - 12, cp2[2] - 10], { faceWidth: 9.5, slopeDeg: 55, side: 'right', lipStart: true, lipEnd: true });
    b.addSurfWedge([cp2[0] + 128, cp2[1] - 15, cp2[2] + 10], [cp2[0] + 224, cp2[1] - 26, cp2[2] + 10], { faceWidth: 9.5, slopeDeg: 55, side: 'left', lipStart: true, lipEnd: true });
    b.addBoostRing([cp2[0] + 240, cp2[1] - 25, cp2[2]], [1, 0.22, 0], { radius: 5.2, minSpeed: 56, upBoost: 9 });
    const cp3 = [cp2[0] + 278, cp2[1] - 24, cp2[2]];
    b.addDeck(cp3[0], cp3[1], cp3[2], 28, 28);

    // 4. Tight S-chicane curving along +X
    const sc = b.addSurfSCurve({
      start: [cp3[0] + 18, cp3[1] - 0.5, cp3[2]], yawStart: Math.PI / 2, yawDelta: Math.PI / 2.4, radius: 44, pitchDrop: -18,
      segmentsPerArc: 14, gap: 10, faceWidth: 9.8, slopeDeg: 54, bothSides: true, lipStart: true, lipEnd: true
    });
    const sce = sc.scurve.end;
    const cp4 = [sce[0] + 22, sce[1] - 7, sce[2]];
    b.addDeck(cp4[0], cp4[1], cp4[2], 28, 28);

    // 5. Final 360 corkscrew plunge into the Omnific Citadel
    const sp2 = b.addSurfSpiral({
      start: [cp4[0] + 18, cp4[1] - 0.6, cp4[2]], yawStart: Math.PI / 2, yawDelta: -Math.PI * 2, radiusStart: 36, radiusEnd: 28,
      pitchDrop: -34, segments: 32, faceWidth: 9.5, slopeDeg: 55, side: 'both', lipStart: true, lipEnd: true
    });
    const s2e = sp2.spiral.end;
    const finPos = [s2e[0] + 28, s2e[1] - 8, s2e[2]];
    b.addDeck(finPos[0], finPos[1], finPos[2], 36, 36);
    b.addNeonFrame(finPos[0], finPos[1] + 11, finPos[2], 28, 20, Math.PI / 2);

    const gates = b.buildGates([
      [0, 187, 6, 8],
      [cp1[0], cp1[1] + 4, cp1[2], 12, cp1[0], cp1[1] + 0.1, cp1[2], 1, 0],
      [cp2[0], cp2[1] + 4, cp2[2], 12, cp2[0], cp2[1] + 0.1, cp2[2], 1, 0],
      [cp3[0], cp3[1] + 4, cp3[2], 12, cp3[0], cp3[1] + 0.1, cp3[2], 1, 0],
      [cp4[0], cp4[1] + 4, cp4[2], 12, cp4[0], cp4[1] + 0.1, cp4[2], 1, 0],
      [finPos[0], finPos[1] + 4, finPos[2], 13, undefined, undefined, undefined, 1, 0]
    ]);
    b.gateText('OMNIFIC START', 0, 193, 6, '#ff6b3d');
    b.gateText('FINISH', finPos[0], finPos[1] + 15, finPos[2], '#5ce8ff');

    return {
      id: 'surf_omnific', theme: 'void', format: 'linear', tier: 4,
      spawn: V3(0, 184, -10), yaw: Math.PI, course: gates, bound: 0, killY: finPos[1] - 28, surfHint: true,
      previewWaypoints: [
        [-24, 196, 16], [sp1.spiral.center[0] + 56, 166, sp1.spiral.center[2] - 24],
        [chStart[0] + 70, chStart[1] + 18, chStart[2] + 34], [cp2[0] + 170, cp2[1] + 8, cp2[2] + 40],
        [cp4[0] + 46, cp4[1] + 14, cp4[2] + 46], [finPos[0] - 18, finPos[1] + 20, finPos[2] + 22]
      ]
    };
  }


  // ===================================================================
  // SURF 14 — TETHERLINE (T2 · Linear · Slate Industrial)
  // A full-length movement surf route built around VELOCITY's grapple + burst.
  // ===================================================================
  function buildSurfTetherline(bOpts) {
    const b = makeBuilder('slate', bOpts);
    const slope = 50, fw = 14;
    const advance = (p, yaw, d, drop) => [
      p[0] + Math.sin(yaw) * d,
      p[1] - drop,
      p[2] + Math.cos(yaw) * d
    ];
    const dir = yaw => [Math.sin(yaw), 0.12, Math.cos(yaw)];

    // START — elevated launch deck and first long bank.
    buildSurfDeck(b, 0, 104, -26, 18, 34, 'end');
    b.addPylon(-25, 104, -4, 27); b.addPylon(25, 104, -4, 27);
    b.gateText('TETHERLINE', 0, 116, 5, '#65e7ff');
    b.addSurfWedge([0, 103.5, 20], [0, 89, 142], {
      faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true
    });
    b.addBoostRing([0, 88.5, 155], [0, 0.12, 1], {
      radius: 7.2, minSpeed: 44, speedBoost: 26, upBoost: 7
    });

    // SECTION 1 — broad S-curve. Hold the bank, then carry the exit speed.
    const c1 = b.addSurfCurve({
      start: [0, 87, 170], yawStart: 0, yawDelta: Math.PI / 2.65,
      radius: 66, pitchDrop: -12, segments: 18,
      faceWidth: fw, slopeDeg: slope, side: 'both', lipStart: true, lipEnd: true
    });
    const c1e = c1.curve.end, c1t = c1.curve.endTangent;
    const deck1 = [c1e[0] + c1t[0] * 18, c1e[1] - 5, c1e[2] + c1t[2] * 18];
    b.addDeck(deck1[0], deck1[1], deck1[2], 34, 34);
    b.addPylon(deck1[0] + 29, deck1[1] - 12, deck1[2] + 5, 22);
    b.addPylon(deck1[0] - 29, deck1[1] - 12, deck1[2] + 5, 22);

    // SECTION 2 — long diagonal bank, then a counter-sweep back toward the core.
    const ramp1End = advance(deck1, c1.curve.endYaw, 124, 13);
    b.addSurfWedge(
      [deck1[0] + c1t[0] * 4, deck1[1] - 0.8, deck1[2] + c1t[2] * 4],
      ramp1End,
      { faceWidth: fw, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true }
    );
    b.addBoostRing(advance(ramp1End, c1.curve.endYaw, 12, 0), dir(c1.curve.endYaw), {
      radius: 7, minSpeed: 46, speedBoost: 28, upBoost: 8
    });
    const c2 = b.addSurfCurve({
      start: advance(ramp1End, c1.curve.endYaw, 22, 1),
      yawStart: c1.curve.endYaw, yawDelta: -c1.curve.endYaw,
      radius: 72, pitchDrop: -14, segments: 18,
      faceWidth: fw, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const c2e = c2.curve.end, c2t = c2.curve.endTangent;
    const deck2 = [c2e[0] + c2t[0] * 18, c2e[1] - 6, c2e[2] + c2t[2] * 18];
    buildSurfDeck(b, deck2[0], deck2[1], deck2[2] - 15, deck2[2] + 20, 36, 'end');

    // SECTION 3 — first tether transfer. The overhead blocks are real solid
    // surfaces, so the normal grapple raycast can latch onto them.
    const tether1Start = [deck2[0], deck2[1] - 0.5, deck2[2] + 23];
    const tether1End = advance(tether1Start, 0, 108, 15);
    b.addSurfWedge(tether1Start, tether1End, {
      faceWidth: 13.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    b.addBox(deck2[0] + 17, deck2[1] + 31, deck2[2] + 91, 7, 6, 7, b.mats.accent);
    b.addBox(deck2[0] - 19, deck2[1] + 38, deck2[2] + 126, 7, 6, 7, b.mats.accent);
    b.addBox(deck2[0] + 43, deck2[1] + 20, deck2[2] + 116, 3, 34, 3, b.mats.dark, false);
    const deck3 = [deck2[0], deck2[1] - 17, deck2[2] + 154];
    buildSurfDeck(b, deck3[0], deck3[1], deck3[2] - 14, deck3[2] + 30, 34, 'start');
    b.addBoostRing([deck3[0], deck3[1] + 1, deck3[2] + 38], [0, 0.16, 1], {
      radius: 7.4, minSpeed: 45, speedBoost: 30, upBoost: 9
    });

    // SECTION 4 — steep drop into a wide 180-degree return. The curve's exit
    // points the player back across the facility rather than down a hallway.
    const ramp2Start = [deck3[0], deck3[1] - 0.5, deck3[2] + 52];
    const ramp2End = [deck3[0], deck3[1] - 14, deck3[2] + 166];
    b.addSurfWedge(ramp2Start, ramp2End, {
      faceWidth: fw, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true
    });
    const c3 = b.addSurfCurve({
      start: [ramp2End[0], ramp2End[1] - 1, ramp2End[2] + 12],
      yawStart: 0, yawDelta: -Math.PI / 1.85,
      radius: 78, pitchDrop: -15, segments: 20,
      faceWidth: fw, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const c3e = c3.curve.end, c3t = c3.curve.endTangent;
    const deck4 = [c3e[0] + c3t[0] * 20, c3e[1] - 6, c3e[2] + c3t[2] * 20];
    b.addDeck(deck4[0], deck4[1], deck4[2], 38, 38);
    b.addPylon(deck4[0] - 30, deck4[1] - 12, deck4[2], 24);
    b.addPylon(deck4[0] + 30, deck4[1] - 12, deck4[2], 24);

    // SECTION 5 — second tether transfer, now across the return lane.
    const yaw4 = c3.curve.endYaw;
    const tether2Start = [deck4[0] + c3t[0] * 18, deck4[1] - 0.5, deck4[2] + c3t[2] * 18];
    const tether2End = advance(tether2Start, yaw4, 112, 14);
    b.addSurfWedge(tether2Start, tether2End, {
      faceWidth: 13.5, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const a2 = advance(tether2Start, yaw4, 64, -31);
    const a3 = advance(tether2Start, yaw4, 104, -40);
    b.addBox(a2[0] + 16, a2[1], a2[2], 7, 6, 7, b.mats.accent);
    b.addBox(a3[0] - 18, a3[1] + 7, a3[2], 7, 6, 7, b.mats.accent);
    const deck5 = advance(tether2End, yaw4, 46, 2);
    buildSurfDeck(b, deck5[0], deck5[1], deck5[2] - 15, deck5[2] + 25, 36, 'end');
    b.addBoostRing(advance(deck5, yaw4, 20, 0), dir(yaw4), {
      radius: 7.1, minSpeed: 48, speedBoost: 32, upBoost: 9
    });

    // FINAL SECTION — a fast bank-to-bank transfer, then a long clean finish.
    const finalYaw = yaw4;
    const finalStart = advance(deck5, finalYaw, 38, 0.5);
    const finalEnd = advance(deck5, finalYaw, 152, 13);
    b.addSurfWedge(finalStart, finalEnd, {
      faceWidth: 14, slopeDeg: 51, side: 'both', lipStart: true, lipEnd: true
    });
    const c4 = b.addSurfCurve({
      start: advance(finalEnd, finalYaw, 12, 1),
      yawStart: finalYaw, yawDelta: -finalYaw * 0.72,
      radius: 66, pitchDrop: -10, segments: 18,
      faceWidth: 14, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true
    });
    const c4e = c4.curve.end, c4t = c4.curve.endTangent;
    const finishDeck = [c4e[0] + c4t[0] * 20, c4e[1] - 5, c4e[2] + c4t[2] * 20];
    buildSurfDeck(b, finishDeck[0], finishDeck[1], finishDeck[2] - 18, finishDeck[2] + 58, 42, 'start');
    b.addPylon(finishDeck[0] - 33, finishDeck[1], finishDeck[2] + 18, 26);
    b.addPylon(finishDeck[0] + 33, finishDeck[1], finishDeck[2] + 18, 26);
    b.addBox(finishDeck[0], finishDeck[1] + 25, finishDeck[2] + 18, 64, 1.2, 2.2, b.mats.accent, false);

    // Industrial silhouettes and overhead trusses frame the route without
    // adding collision clutter around the playable surf faces.
    for (let i = 0; i < 7; i++) {
      const z = 52 + i * 112;
      b.addBox(-92, 20, z, 4, 150, 4, b.mats.dark, false);
      b.addBox(92, 20, z, 4, 150, 4, b.mats.dark, false);
      b.addBox(0, 91 - i * 8, z, 184, 2, 2, b.mats.dark, false);
    }

    const gates = b.buildGates([
      [0, 108, 5, 9],
      [finishDeck[0], finishDeck[1] + 3, finishDeck[2] + 19, 12]
    ]);
    b.gateText('FINISH', finishDeck[0], finishDeck[1] + 15, finishDeck[2] + 19, '#ffad60');

    return {
      id: 'surf_tetherline', theme: 'slate', format: 'linear', tier: 2,
      spawn: V3(0, 104, -9), yaw: Math.PI, course: gates, bound: 0,
      killY: -38, surfHint: true,
      previewWaypoints: [
        [-24, 120, 12], [16, 94, 152], [deck1[0] + 18, deck1[1] + 20, deck1[2] + 55],
        [deck2[0] + 24, deck2[1] + 35, deck2[2] + 100],
        [deck4[0] - 20, deck4[1] + 24, deck4[2] + 42],
        [finishDeck[0] + 20, finishDeck[1] + 28, finishDeck[2] + 35]
      ]
    };
  }

  // ===================================================================
  // TIME TRIAL 01 — THE ASCENT (T1 · Linear · Slate) [Preserves id='course1']
  // ===================================================================
  function buildCourse1(bOpts) {
    const b = makeBuilder('slate', bOpts);
    b.slab(0, 0, -20, 40, 24);
    b.addRamp([0, 0, 40], [0, 8, 72], 16);
    b.slab(0, 8, 72, 100, 16);
    for (const z of [112, 140, 168]) b.slab(0, 8, z, z + 16, 14);
    b.addBox(-5.25, 10, 232, 2, 16, 80, b.mats.deck); b.addBox(5.25, 10, 232, 2, 16, 80, b.mats.deck);
    b.slab(0, 4, 284, 300, 14);
    b.addBox(0, 4.12, 299.8, 14, .24, .35, b.mats.accent, false);
    b.addSurfWedge([0, 3.6, 302], [0, -3.4, 358], { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true });
    b.addSurfWedge([0, -3.4, 366], [0, 3.6, 418], { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true });
    b.addRamp([0, -5.5, 418], [0, 4, 452], 16);
    b.slab(0, 4, 452, 520, 14);
    for (const z of [470, 490, 510]) b.addBox(0, 6.15, z, 14, 2, 3, b.mats.lip);
    b.addBox(0, 16, 536, 6, 3, 6, b.mats.accent);
    b.slab(0, 4, 552, 590, 14);
    b.addRamp([0, 4, 590], [0, 12, 620], 16);
    b.slab(0, 12, 620, 720, 16);
    const gates = b.buildGates([
      [0, 3, 8, 6], [0, 11, 86, 6], [0, 11, 120, 6], [0, 11, 176, 6],
      [0, 10, 232, 7, 0, 8.05, 176], [0, 7, 292, 7],
      [0, -1, 362, 9.5, 0, 4.05, 292], [0, 6.5, 436, 8.5, 0, 4.05, 292],
      [0, 7, 458, 6], [0, 7, 518, 6],
      [0, 9, 536, 9, 0, 4.05, 516], [0, 7, 562, 6], [0, 15, 690, 8]
    ]);
    b.gateText('START', 0, 10, 8, '#65e7ff'); b.gateText('FINISH', 0, 22, 690, '#ff9b55');
    const gauntletTargets = [
      { id: 'c1_t1', x: -5.5, y: 11.2, z: 82, yaw: Math.PI, scale: 1.15 },
      { id: 'c1_t2', x: 5.2, y: 11.0, z: 148, yaw: Math.PI, scale: 1.15 },
      { id: 'c1_t3', x: 0, y: 12.6, z: 254, yaw: Math.PI, scale: 1.2, patrolAxis: 'x', patrolRange: 2.8, patrolSpeed: 2.1, phase: 0.5 },
      { id: 'c1_t4', x: -7.5, y: 2.2, z: 344, yaw: Math.PI, scale: 1.3 },
      { id: 'c1_t5', x: 5.5, y: 6.8, z: 482, yaw: Math.PI, scale: 1.15 },
      { id: 'c1_t6', x: 0, y: 15.5, z: 648, yaw: Math.PI, scale: 1.25, patrolAxis: 'x', patrolRange: 4.5, patrolSpeed: 2.0, phase: 1.4 }
    ];
    return {
      id: 'course1', theme: 'slate', format: 'linear', tier: 1,
      spawn: V3(0, 0, -10), yaw: Math.PI, course: gates, bound: 0, targetMode: 'gauntlet', targets: gauntletTargets,
      previewWaypoints: [
        [-22, 16, 15], [18, 22, 150], [-16, 20, 250], [22, 14, 360], [18, 24, 535], [-16, 26, 665]
      ]
    };
  }

  // ===================================================================
  // TIME TRIAL 02 — SKYLINE WALLRUN (T2 · Linear · Kitsune)
  // Chained wall-run canyons, slide tunnels & bhop bridge sprints
  // ===================================================================
  function buildTTWallrunner(bOpts) {
    const b = makeBuilder('kitsune', bOpts);
    b.slab(0, 0, -18, 30, 18);
    // Wallrun canyon 1 (alternating staggered panels)
    b.addBox(-5.2, 6, 56, 1.8, 12, 42, b.mats.deck);
    b.addBox(5.2, 7.5, 96, 1.8, 13, 44, b.mats.deck);
    b.addBox(-5.2, 9, 138, 1.8, 14, 44, b.mats.deck);
    b.slab(0, 4, 164, 198, 16);

    // Slide-boost neon tunnel (low clearance bars)
    b.slab(0, 4, 198, 286, 14);
    for (const z of [212, 232, 252, 272]) {
      b.addBox(0, 6.15, z, 14, 2, 3.2, b.mats.lip);
      b.addNeonFrame(0, 7, z, 18, 10, 0);
    }

    // Bunny-hop stepping bridges + launch pad
    for (const z of [298, 326, 354]) b.slab(0, 4, z, z + 15, 11);
    b.addLaunchPad(0, 4.1, 366);
    b.slab(0, 16, 384, 416, 16);

    // Dual-wall high corridor
    b.addBox(-5.4, 22, 466, 1.8, 16, 94, b.mats.deck);
    b.addBox(5.4, 22, 466, 1.8, 16, 94, b.mats.deck);
    b.addNeonFrame(0, 24, 440, 18, 14, 0);
    b.addNeonFrame(0, 24, 492, 18, 14, 0);
    b.slab(0, 14, 518, 588, 18);

    const gates = b.buildGates([
      [0, 3, 12, 6],
      [0, 7, 178, 7, 0, 4.1, 170],
      [0, 7, 282, 7, 0, 4.1, 278],
      [0, 19, 396, 7, 0, 16.1, 390],
      [0, 20, 466, 8, 0, 16.1, 390],
      [0, 17, 560, 8]
    ]);
    b.gateText('WALLRUNNER', 0, 10, 12, '#45f0ff');
    b.gateText('FINISH', 0, 24, 560, '#ff3b7a');

    return {
      id: 'tt_wallrunner', theme: 'kitsune', format: 'linear', tier: 2,
      spawn: V3(0, 0, -8), yaw: Math.PI, course: gates, bound: 0, killY: -22,
      previewWaypoints: [
        [-18, 14, 22], [18, 18, 118], [-16, 14, 245], [16, 20, 365], [16, 30, 468], [-14, 26, 545]
      ]
    };
  }

  // ===================================================================
  // TIME TRIAL 03 — TETHER VAULT (T3 · Linear · Boreas)
  // Grapple-swing chasms, launch pads & surf-to-grapple transfers
  // ===================================================================
  function buildTTGrapple(bOpts) {
    const b = makeBuilder('boreas', bOpts);
    b.slab(0, 20, -18, 28, 18);
    b.addBackdropPeak(-56, -10, 90, 32, 86, b.mats.deck);
    b.addBackdropPeak(56, -10, 220, 34, 92, b.mats.deck);

    // Chasm 1: overhead grapple anchor blocks
    b.addBox(0, 34, 50, 6, 3.5, 6, b.mats.accent);
    b.addBox(0, 36, 84, 6, 3.5, 6, b.mats.accent);
    b.slab(0, 20, 102, 134, 16);

    // Surf speed-build into grapple vault
    b.addSurfWedge([0, 19.5, 138], [0, 11, 212], { faceWidth: 11.5, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true });
    b.addBox(0, 30, 240, 7, 3.5, 7, b.mats.accent);
    b.slab(0, 18, 260, 294, 16);

    // Vertical climb via launch pad + grapple anchor tower
    b.addLaunchPad(0, 18.1, 286);
    b.addBox(0, 44, 318, 6, 3.5, 6, b.mats.accent);
    b.addBox(0, 50, 352, 6, 3.5, 6, b.mats.accent);
    b.slab(0, 34, 370, 404, 18);

    // Boost ring + final surf glide to glacial finish
    b.addBoostRing([0, 38, 418], [0, 0.14, 1], { radius: 6.2, minSpeed: 46, upBoost: 7 });
    b.addSurfWedge([0, 34, 434], [0, 24, 520], { faceWidth: 12, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true });
    b.slab(0, 18, 530, 594, 22);

    const gates = b.buildGates([
      [0, 23, 12, 7],
      [0, 24, 118, 8, 0, 20.1, 108],
      [0, 22, 276, 8, 0, 18.1, 266],
      [0, 38, 386, 8, 0, 34.1, 376],
      [0, 38, 418, 9, 0, 34.1, 376],
      [0, 22, 566, 9]
    ]);
    b.gateText('TETHER VAULT', 0, 30, 12, '#7ef2ff');
    b.gateText('FINISH', 0, 30, 566, '#ffad60');

    return {
      id: 'tt_grapple', theme: 'boreas', format: 'linear', tier: 3,
      spawn: V3(0, 20, -8), yaw: Math.PI, course: gates, bound: 0, killY: -20,
      previewWaypoints: [
        [-22, 34, 18], [24, 42, 76], [-22, 32, 210], [24, 48, 336], [-20, 44, 456], [16, 32, 550]
      ]
    };
  }

  // ===================================================================
  // TIME TRIAL 04 — APEX GAUNTLET (T4 · Linear · Void Ember)
  // Full-kit mastery: wallruns, bhops, grapple, surf flicks & 8 targets
  // ===================================================================
  function buildTTApex(bOpts) {
    const b = makeBuilder('void', bOpts);
    b.slab(0, 30, -18, 26, 18);
    // 1. Bhop bridge sprint
    for (const z of [38, 66, 94]) b.slab(0, 30, z, z + 14, 10);
    // 2. Wallrun gorge
    b.addBox(-5.2, 35, 152, 1.8, 15, 76, b.mats.deck);
    b.addBox(5.2, 35, 152, 1.8, 15, 76, b.mats.deck);
    b.slab(0, 28, 196, 226, 14);
    // 3. Surf drop -> flick -> grapple chasm
    b.addSurfWedge([0, 27.5, 230], [0, 18, 308], { faceWidth: 10.5, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    b.addSurfFlick({ start: [0, 17.5, 316], yaw: 0, length: 30, rise: 8.5, faceWidth: 10, slopeDeg: 52, side: 'both' });
    b.addBox(0, 38, 372, 6, 3.5, 6, b.mats.accent);
    b.slab(0, 24, 392, 424, 14);
    // 4. Slide bars + launch pad + boost ring
    b.slab(0, 24, 424, 496, 13);
    for (const z of [442, 464, 486]) b.addBox(0, 26.15, z, 13, 2, 3, b.mats.lip);
    b.addLaunchPad(0, 24.1, 494);
    b.addBoostRing([0, 38, 520], [0, 0.14, 1], { radius: 6, minSpeed: 48, upBoost: 7 });
    // 5. Final surf sprint to Apex Citadel
    b.addSurfWedge([0, 34, 538], [0, 24, 628], { faceWidth: 10.5, slopeDeg: 52, side: 'both', lipStart: true, lipEnd: true });
    b.slab(0, 18, 638, 706, 20);
    b.addNeonFrame(0, 28, 678, 22, 16, 0);

    const gates = b.buildGates([
      [0, 33, 12, 6.5],
      [0, 33, 101, 7, 0, 30.1, 98],
      [0, 31, 210, 7, 0, 28.1, 202],
      [0, 28, 354, 9, 0, 28.1, 202],
      [0, 27, 408, 7, 0, 24.1, 398],
      [0, 27, 494, 7, 0, 24.1, 488],
      [0, 38, 520, 9, 0, 24.1, 488],
      [0, 22, 678, 9]
    ]);
    b.gateText('APEX GAUNTLET', 0, 40, 12, '#ff6b3d');
    b.gateText('FINISH', 0, 32, 678, '#5ce8ff');

    const gauntletTargets = [
      { id: 'ax_t1', x: -6.5, y: 33.5, z: 54, yaw: Math.PI, scale: 1.15 },
      { id: 'ax_t2', x: 6.5, y: 33.5, z: 82, yaw: Math.PI, scale: 1.15 },
      { id: 'ax_t3', x: 0, y: 38.5, z: 162, yaw: Math.PI, scale: 1.2, patrolAxis: 'x', patrolRange: 3.0, patrolSpeed: 2.3, phase: 0.4 },
      { id: 'ax_t4', x: -8.0, y: 24.5, z: 274, yaw: Math.PI, scale: 1.25 },
      { id: 'ax_t5', x: 7.5, y: 31.0, z: 368, yaw: Math.PI, scale: 1.2 },
      { id: 'ax_t6', x: -5.5, y: 26.8, z: 454, yaw: Math.PI, scale: 1.15 },
      { id: 'ax_t7', x: 7.5, y: 31.5, z: 582, yaw: Math.PI, scale: 1.25 },
      { id: 'ax_t8', x: 0, y: 23.0, z: 656, yaw: Math.PI, scale: 1.25, patrolAxis: 'x', patrolRange: 5.0, patrolSpeed: 2.5, phase: 1.2 }
    ];
    return {
      id: 'tt_apex', theme: 'void', format: 'linear', tier: 4,
      spawn: V3(0, 30, -8), yaw: Math.PI, course: gates, bound: 0, killY: -16,
      targetMode: 'gauntlet', targets: gauntletTargets,
      previewWaypoints: [
        [-20, 42, 20], [18, 44, 152], [-22, 34, 286], [22, 42, 384], [-18, 44, 520], [18, 32, 654]
      ]
    };
  }

  // ===================================================================
  // UNIFIED COURSE CATALOG (14 Surf Maps + 4 Time Trials)
  // ===================================================================
  const COURSE_CATALOG = [
    // --- SURF MAPS (13) ---
    {
      id: 'surf1', category: 'surf', name: 'Skyline Drift', code: 'surf_skyline',
      author: 'Velocity Core', tier: 1, format: 'linear', cpCount: 4,
      parGold: 26.0, parSilver: 34.0, theme: 'slate',
      pieces: ['One-Sided Banks', 'Sweeping S-Curves', 'Sky Drop-Ins'],
      description: 'Clean high-altitude starter banks with generous catch decks and wide sweeping S-curves.',
      build: buildSurfSkyline
    },
    {
      id: 'surf_utopia', category: 'surf', name: 'Utopia Flow', code: 'surf_utopia',
      author: 'Velocity Core', tier: 1, format: 'linear', cpCount: 5,
      parGold: 34.0, parSilver: 44.0, theme: 'sandstone',
      pieces: ['Long A-Frames', 'Wide Sweeps', 'Boost Ring'],
      description: 'Sunlit sandstone A-frame downhill marathon inspired by classic surf_utopia high-speed flow.',
      build: buildSurfUtopia
    },
    {
      id: 'surf_kitsune', category: 'surf', name: 'Kitsune Neon', code: 'surf_kitsune',
      author: 'Velocity Core', tier: 1, format: 'staged', cpCount: 5,
      parGold: 42.0, parSilver: 56.0, theme: 'kitsune',
      pieces: ['Stage Portals', 'V-Channel Tube', '270° Spiral'],
      description: 'Five compartmentalized neon-obsidian rooms teaching bank transfers, tubes, flicks, and spirals.',
      build: buildSurfKitsune
    },
    {
      id: 'surf_mesa', category: 'surf', name: 'Mesa Canyon', code: 'surf_mesa',
      author: 'Velocity Core', tier: 1, format: 'linear', cpCount: 4,
      parGold: 32.0, parSilver: 42.0, theme: 'sandstone',
      pieces: ['V-Channels', 'S-Curve Chicane', 'Launch Flick'],
      description: 'Warm canyon ravines lined with twin half-pipe walls, smooth chicanes, and bridge flicks.',
      build: buildSurfMesa
    },
    {
      id: 'surf_boreas', category: 'surf', name: 'Boreas Ridge', code: 'surf_boreas',
      author: 'Velocity Core', tier: 2, format: 'linear', cpCount: 4,
      parGold: 36.0, parSilver: 47.0, theme: 'boreas',
      pieces: ['Glacial Glass', 'Boost Rings', 'Ravine Curves'],
      description: 'Snowy alpine ravines, frosted translucent glass ramps, and high-speed boost-ring gorge transfers.',
      build: buildSurfBoreas
    },
    {
      id: 'surf_aircontrol', category: 'surf', name: 'Aircontrol', code: 'surf_aircontrol',
      author: 'Velocity Core', tier: 2, format: 'linear', cpCount: 5,
      parGold: 38.0, parSilver: 50.0, theme: 'slate',
      pieces: ['90° Air-Strafes', 'Pillar Wraps', 'Launch Flick'],
      description: 'Sky-island obstacle run built around crisp 90° mid-air strafe wraps and clean ramp entries.',
      build: buildSurfAircontrol
    },
    {
      id: 'surf_rookie', category: 'surf', name: 'Rookie Ascent', code: 'surf_rookie',
      author: 'Velocity Core', tier: 2, format: 'staged', cpCount: 5,
      parGold: 48.0, parSilver: 64.0, theme: 'slate',
      pieces: ['Boosters', 'Half-Pipe Tube', '270° Corkscrew'],
      description: 'Five escalating surf stages combining boosters, twin tubes, S-chicanes, spines, and a corkscrew.',
      build: buildSurfRookie
    },
    {
      id: 'surf_breakwater', category: 'surf', name: 'Breakwater Run', code: 'surf_breakwater',
      author: 'Velocity Core', tier: 2, format: 'linear', cpCount: 5,
      parGold: 42.0, parSilver: 56.0, theme: 'slate',
      pieces: ['One-Sided Banks', '90° Surf Transfers', '180° Slipway Wrap'],
      description: 'A night-shift container port run with two sweeping transfers, a descending slipway, and a full U-turn finish.',
      build: buildSurfBreakwater
    },
    {
      id: 'surf_helix', category: 'surf', name: 'Helix Spire', code: 'surf_helix',
      author: 'Velocity Core', tier: 3, format: 'linear', cpCount: 5,
      parGold: 44.0, parSilver: 58.0, theme: 'prism',
      pieces: ['360° Spirals', 'Inner-Ring Flick', 'Boost Ring'],
      description: 'Twin opposing 360° helical corkscrew descents linked by steep crystal flicks and boost rings.',
      build: buildSurfHelix
    },
    {
      id: 'surf_prism', category: 'surf', name: 'Prism Vault', code: 'surf_prism',
      author: 'Velocity Core', tier: 3, format: 'staged', cpCount: 5,
      parGold: 52.0, parSilver: 68.0, theme: 'prism',
      pieces: ['54° Glass Banks', 'Spine Transfers', '360° Spiral'],
      description: 'Crystalline violet chambers demanding narrow spine transitions, double boost threading, and precision.',
      build: buildSurfPrism
    },
    {
      id: 'surf_syria', category: 'surf', name: 'Syria Dunes', code: 'surf_syria',
      author: 'Velocity Core', tier: 3, format: 'linear', cpCount: 5,
      parGold: 42.0, parSilver: 55.0, theme: 'sandstone',
      pieces: ['Split Forks', 'Tight S-Chicanes', 'High-Arc Flicks'],
      description: 'High-speed desert aqueducts featuring split-ramp forks, sharp S-curves, and canyon sprints.',
      build: buildSurfSyria
    },
    {
      id: 'surf_sinsane', category: 'surf', name: 'Sinsane Void', code: 'surf_sinsane',
      author: 'Velocity Core', tier: 4, format: 'staged', cpCount: 5,
      parGold: 58.0, parSilver: 76.0, theme: 'void',
      pieces: ['180° Blind Flick', '55° Razor Banks', 'Dual Corkscrews'],
      description: 'Expert volcanic-obsidian stages with razor-thin spines, 180° flick wraps, and needle boost rings.',
      build: buildSurfSinsane
    },
    {
      id: 'surf_omnific', category: 'surf', name: 'Omnific Marathon', code: 'surf_omnific',
      author: 'Velocity Core', tier: 4, format: 'linear', cpCount: 6,
      parGold: 66.0, parSilver: 86.0, theme: 'void',
      pieces: ['450° Spiral', 'V-Tunnel', 'Double-Spine Flicks'],
      description: 'Endurance Tier 4 showcase uniting 450° helical drops, V-tunnels, flick chains, and sky vaults.',
      build: buildSurfOmnific
    },

    {
      id: 'surf_tetherline', category: 'surf', name: 'Tetherline', code: 'surf_tetherline',
      author: 'Velocity Core', tier: 2, format: 'linear', cpCount: 0,
      parGold: 68.0, parSilver: 92.0, theme: 'slate',
      pieces: ['Long S-Curves', 'Grapple Transfers', 'Kinetic Boost Chains'],
      description: 'A full-length industrial surf route built around sustained speed, deliberate grapple swings, and clean kinetic-burst transfers.',
      build: buildSurfTetherline
    },

    // --- TIME TRIALS (4) ---
    {
      id: 'course1', category: 'timetrial', name: 'The Ascent', code: 'tt_ascent',
      author: 'Velocity Core', tier: 1, format: 'linear', cpCount: 11,
      parGold: 32.0, parSilver: 44.0, theme: 'slate',
      pieces: ['Wallrun', 'Surf Chain', 'Slide', 'Grapple', '6 Targets'],
      description: 'Flagship all-mechanics time trial blending bhops, wall-runs, surf wedges, grapple, and gauntlet targets.',
      build: buildCourse1
    },
    {
      id: 'tt_wallrunner', category: 'timetrial', name: 'Skyline Wallrun', code: 'tt_wallrunner',
      author: 'Velocity Core', tier: 2, format: 'linear', cpCount: 5,
      parGold: 29.0, parSilver: 39.0, theme: 'kitsune',
      pieces: ['Wallrun Canyons', 'Slide Tunnels', 'Bhop Bridges'],
      description: 'High-tempo neon corridor built around chained wall-jumps, slide-boost gates, and bhop sprints.',
      build: buildTTWallrunner
    },
    {
      id: 'tt_grapple', category: 'timetrial', name: 'Tether Vault', code: 'tt_grapple',
      author: 'Velocity Core', tier: 3, format: 'linear', cpCount: 5,
      parGold: 34.0, parSilver: 46.0, theme: 'boreas',
      pieces: ['Grapple Swings', 'Launch Pads', 'Surf-to-Tether'],
      description: 'Glacial chasm course demanding fluid grapple momentum, vertical launch pads, and surf transitions.',
      build: buildTTGrapple
    },
    {
      id: 'tt_apex', category: 'timetrial', name: 'Apex Gauntlet', code: 'tt_apex',
      author: 'Velocity Core', tier: 4, format: 'linear', cpCount: 7,
      parGold: 42.0, parSilver: 56.0, theme: 'void',
      pieces: ['Full-Kit Mastery', 'Surf Flicks', '8 Moving Targets'],
      description: 'Expert movement and marksmanship trial combining every mechanic with 8 patrolling gauntlet targets.',
      build: buildTTApex
    }
  ];

  const COURSE_BY_ID = Object.create(null);
  for (const c of COURSE_CATALOG) COURSE_BY_ID[c.id] = c;

  function getCourseMeta(id) {
    return COURSE_BY_ID[id] || null;
  }

  function getCoursesByCategory(cat) {
    if (!cat || cat === 'all') return COURSE_CATALOG.slice();
    return COURSE_CATALOG.filter(c => c.category === cat);
  }

  function getCourseMedal(meta, pbSec) {
    if (!meta || !pbSec || pbSec <= 0) return null;
    if (pbSec <= meta.parGold) return 'GOLD';
    if (pbSec <= meta.parSilver) return 'SILVER';
    return 'BRONZE';
  }

  const exportsObj = {
    TIER_INFO,
    COURSE_CATALOG,
    getCourseMeta,
    getCoursesByCategory,
    getCourseMedal
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = exportsObj;
  } else {
    root.CourseCatalog = exportsObj;
    root.slab = slab;
    root.gateText = gateText;
    root.buildGates = buildGates;
    root.buildCourse1 = buildCourse1;
    root.buildSurfMap1 = buildSurfSkyline;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
