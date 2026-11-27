// 3 Brand-New Multi-Story 2-Site Destructible Tactical Maps for Demolition 5v5:
// 1. tac_citadel — Desert Citadel (Dust2/Mirage 3-lane flow + 2-story Palace + breachable walls & hatch)
// 2. tac_skyway  — Neon Skyway Penthouse (The Finals Seoul + R6 Bank multi-floor vertical breach atrium)
// 3. tac_alpine  — Alpine Research Bunker (R6 Chalet snow lodge + subterranean reactor with skylight & hatch breaches)
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.TacticalMapCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function makeV3(x, y, z) {
    if (root.THREE && root.THREE.Vector3) return new root.THREE.Vector3(x, y, z);
    return { x, y, z };
  }

  function makeMat(hex, rough, metal, extra) {
    if (!root.THREE) return null;
    return new root.THREE.MeshStandardMaterial(Object.assign({
      color: hex,
      roughness: rough != null ? rough : 0.78,
      metalness: metal != null ? metal : 0.08
    }, extra || {}));
  }

  function resolveBuilder(wbOrOpts, defaultTheme) {
    if (wbOrOpts && typeof wbOrOpts.addBox === 'function') return wbOrOpts;
    const o = wbOrOpts || {};
    if (typeof root.createWorldBuilder === 'function') {
      return root.createWorldBuilder({
        group: o.group || root.levelGroup,
        collide: o.collide !== false,
        isPreview: !!o.isPreview,
        theme: o.theme || defaultTheme
      });
    }
    throw new Error('createWorldBuilder is not available');
  }

  // Helper: register destructible pieces into DestructionSystem when live, or visual-only meshes when in 3D preview
  function createDestructibleHelper(wb) {
    const live = !wb.isPreview && wb.allowCollide && root.DestructionSystem;
    if (live) {
      root.DestructionSystem.clearMap();
      root.DestructionSystem.ensureInit(wb.group, {
        registerSolid: (mesh) => (typeof root.registerSolid === 'function' ? root.registerSolid(mesh) : null),
        solids: typeof root.solids !== 'undefined' ? root.solids : null,
        solidMeshes: typeof root.solidMeshes !== 'undefined' ? root.solidMeshes : null
      });
    }

    return {
      softWall(opts) {
        if (live) return root.DestructionSystem.registerSoftWall(opts);
        const m = makeMat(opts.color || 0x9aa3ad, 0.85, 0.08);
        wb.addBox(opts.x, opts.y + (opts.h || 3.2) * 0.5, opts.z, opts.w || 4.8, opts.h || 3.2, opts.d || 0.34, m, false);
        return [];
      },
      hatch(opts) {
        if (live) return root.DestructionSystem.registerCeilingHatch(opts);
        const m = makeMat(opts.color || 0x5c6674, 0.62, 0.35);
        wb.addBox(opts.x, opts.y, opts.z, opts.w || 2.8, opts.h || 0.28, opts.d || 2.8, m, false);
        return [];
      },
      pillar(opts) {
        if (live) return root.DestructionSystem.registerBreakablePillar(opts);
        const m = makeMat(opts.color || 0x8f97a3, 0.88, 0.06);
        wb.addBox(opts.x, (opts.y || 0) + (opts.h || 3.4) * 0.5, opts.z, opts.w || 1.4, opts.h || 3.4, opts.d || 1.4, m, false);
        return [];
      },
      glass(opts) {
        if (live) return root.DestructionSystem.registerBreakableGlass(opts);
        const m = makeMat(opts.color || 0x8be2ff, 0.14, 0.15, { transparent: true, opacity: 0.42 });
        wb.addBox(opts.x, opts.y || 2.0, opts.z, opts.w || 2.8, opts.h || 2.4, opts.d || 0.16, m, false);
        return [];
      }
    };
  }

  // Painted Bomb Site floor decal + glowing perimeter lines + vertical site sign
  function addBombSiteVisual(wb, site) {
    if (!root.THREE || !wb || !wb.group) return;
    const THREE = root.THREE;
    const col = site.id === 'A' ? 0xff6b35 : 0xfacc15;
    const r = site.radius || 6.2;
    const y = (site.y || 0) + 0.04;

    // Ground zone tint
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 1.9, r * 1.9),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    zone.rotation.x = -Math.PI * 0.5;
    zone.position.set(site.x, y, site.z);
    wb.group.add(zone);

    // Crisp hazard perimeter frame
    const edgeMat = new THREE.MeshBasicMaterial({ color: col });
    const half = r * 0.95;
    const bars = [
      [r * 1.9, 0.05, 0.18, 0, 0, -half],
      [r * 1.9, 0.05, 0.18, 0, 0, half],
      [0.18, 0.05, r * 1.9, -half, 0, 0],
      [0.18, 0.05, r * 1.9, half, 0, 0]
    ];
    for (const [w, h, d, ox, oy, oz] of bars) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), edgeMat);
      b.position.set(site.x + ox, y + 0.01, site.z + oz);
      wb.group.add(b);
    }

    // Crisp canvas-painted 'A' or 'B' floor spray marker
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 256;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 256, 256);
      g.strokeStyle = site.id === 'A' ? '#ff6b35' : '#facc15';
      g.lineWidth = 10;
      g.strokeRect(18, 18, 220, 220);
      g.fillStyle = site.id === 'A' ? '#ff6b35' : '#facc15';
      g.font = '900 156px Oxanium, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(site.id, 128, 134);
      const tex = new THREE.CanvasTexture(cv);
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false })
      );
      decal.rotation.x = -Math.PI * 0.5;
      decal.position.set(site.x, y + 0.02, site.z);
      wb.group.add(decal);
    }
  }

  // Translucent Buy-Phase Force-Field Barriers (locked during 15s Buy Phase, disabled when round goes Live)
  function addBuyBarrier(wb, list, x, y, z, w, h, d, team) {
    if (!root.THREE || !wb || !wb.group) return null;
    const THREE = root.THREE;
    const col = team === 'atk' ? 0xff6b35 : 0x38bdf8;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    mesh.position.set(x, y + h * 0.5, z);
    mesh.userData = { isBuyBarrier: true, team, disabled: false };
    wb.group.add(mesh);

    let solid = null;
    if (!wb.isPreview && wb.allowCollide && typeof root.registerSolid === 'function') {
      solid = root.registerSolid(mesh);
    }
    const entry = { mesh, solid, team };
    if (Array.isArray(list)) list.push(entry);
    return entry;
  }

  // =========================================================================
  // MAP 1: DESERT CITADEL (tac_citadel) — Dust2 + Mirage 3-Lane Tactical Flow
  // =========================================================================
  function buildTacCitadel(wbOrOpts) {
    const wb = resolveBuilder(wbOrOpts, 'sandstone');
    const ds = createDestructibleHelper(wb);
    const buyBarriers = [];

    const sandFloor = makeMat(0xcbb086, 0.90, 0.04);
    const stoneFloor = makeMat(0x9a8c78, 0.85, 0.06);
    const sandWall = makeMat(0xd6be96, 0.86, 0.05);
    const darkStone = makeMat(0x524940, 0.80, 0.14);
    const roofTimber = makeMat(0x6e4e34, 0.82, 0.08);
    const trimGold = makeMat(0xd97736, 0.55, 0.24);

    // Main playable ground deck (104m wide x 108m deep, y = 0)
    wb.addDeck(0, 0, 0, 104, 108, sandFloor);

    // Outer Citadel Perimeter Fortress Walls (10m tall)
    wb.addBox(0, 5, -54, 106, 10, 2, sandWall, true);
    wb.addBox(0, 5, 54, 106, 10, 2, sandWall, true);
    wb.addBox(-52, 5, 0, 2, 10, 108, sandWall, true);
    wb.addBox(52, 5, 0, 2, 10, 108, sandWall, true);

    // Attacker Spawn Courtyard (South, z = +34..+52)
    wb.addDeck(0, 0.08, 43, 44, 16, stoneFloor);
    wb.addBox(-24, 2.5, 34, 4, 5, 2, darkStone, true);
    wb.addBox(24, 2.5, 34, 4, 5, 2, darkStone, true);
    // Attacker Buy Barriers (lock spawn exits during 15s Buy Phase)
    addBuyBarrier(wb, buyBarriers, -30, 0, 26, 22, 5.5, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 0, 0, 26, 20, 5.5, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 30, 0, 26, 22, 5.5, 0.4, 'atk');

    // Defender Spawn Courtyard (North, z = -34..-52)
    wb.addDeck(0, 0.08, -43, 46, 16, stoneFloor);
    wb.addBox(-20, 2.5, -34, 4, 5, 2, darkStone, true);
    wb.addBox(20, 2.5, -34, 4, 5, 2, darkStone, true);
    // Defender Buy Barriers (let Defenders set up on sites or lock mid choke during Buy)
    addBuyBarrier(wb, buyBarriers, -29, 0, -24, 20, 5.5, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 0, 0, -24, 16, 5.5, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 29, 0, -24, 20, 5.5, 0.4, 'def');

    // --- Lane Dividers (Classic 3-lane A / Mid / B structural spine) ---
    // West Spine separating Site A from Mid (with soft-wall breachable Connector!)
    wb.addBox(-14, 3.6, 12, 2.0, 7.2, 18, sandWall, true);
    wb.addBox(-14, 3.6, -24, 2.0, 7.2, 14, sandWall, true);
    // Soft breachable Connector wall between Mid & Site A (z = -6..+2)
    ds.softWall({ x: -14, y: 0, z: -2, w: 6.4, h: 3.4, d: 0.36, ry: Math.PI * 0.5, kind: 'sandstone', color: 0xc29e6c });

    // East Spine separating Site B from Mid (with soft-wall breachable Market!)
    wb.addBox(14, 3.6, 12, 2.0, 7.2, 18, sandWall, true);
    wb.addBox(14, 3.6, -24, 2.0, 7.2, 14, sandWall, true);
    // Soft breachable Market wall between Mid & Site B
    ds.softWall({ x: 14, y: 0, z: -2, w: 6.4, h: 3.4, d: 0.36, ry: Math.PI * 0.5, kind: 'sandstone', color: 0xc29e6c });

    // --- SITE A: 2-STORY PALACE & COURTYARD (West: x = -32, z = -10) ---
    wb.addDeck(-32, 0.08, -10, 30, 26, stoneFloor);
    // Elevated Palace 2nd Floor Overlooking Site A (y = 4.6)
    wb.addDeck(-42, 4.6, 4, 16, 22, roofTimber);
    // Upper Palace Balcony Extending Over Site A Plant Zone (with ceiling drop hatch!)
    wb.addDeck(-37, 4.6, -12, 6, 10, roofTimber);
    wb.addDeck(-27, 4.6, -12, 6, 10, roofTimber);
    wb.addDeck(-32, 4.6, -15.5, 4.2, 3, roofTimber);
    wb.addDeck(-32, 4.6, -8.5, 4.2, 3, roofTimber);
    // Destructible Ceiling Hatch right above Site A!
    ds.hatch({ x: -32, y: 4.6, z: -12, w: 3.6, d: 3.6, h: 0.30 });
    // Staircase from Attacker A-Main up to 2nd Floor Palace
    wb.addStaircase(-45, 0, 22, -45, 4.6, 14, 4.2, stoneFloor);
    // Staircase from Defender A-CT up to Upper Palace
    wb.addStaircase(-45, 0, -24, -45, 4.6, -16, 4.2, stoneFloor);
    // Soft Breachable Palace Front Walls (shoot peek-holes or blow open onto Site A!)
    ds.softWall({ x: -34, y: 4.6, z: 4, w: 6.4, h: 3.2, d: 0.34, ry: Math.PI * 0.5, kind: 'timber', color: 0x875f3c });
    ds.softWall({ x: -32, y: 0, z: 4, w: 6.4, h: 3.3, d: 0.36, ry: 0, kind: 'sandstone', color: 0xc5a273 });
    // Breakable Cover Pillars on Site A (collapse into crouchable rubble cover)
    ds.pillar({ x: -26, y: 0, z: -6, w: 1.5, h: 3.6, d: 1.5, kind: 'sandstone', color: 0xc2a072 });
    ds.pillar({ x: -38, y: 0, z: -14, w: 1.5, h: 3.6, d: 1.5, kind: 'sandstone', color: 0xc2a072 });
    // Solid Triple-Stack Crate on A for classic CS plant cover
    wb.addBox(-29, 1.3, -15, 2.8, 2.6, 2.8, trimGold, true);

    // --- MID COURTYARD & SNIPER WINDOW (Center: x = 0, z = 0) ---
    wb.addDeck(0, 0.08, 0, 24, 38, stoneFloor);
    // Central Fountain / Obelisk cover + 2 breakable mid pillars
    wb.addBox(0, 1.15, 6, 4.6, 2.3, 2.2, darkStone, true);
    ds.pillar({ x: -6, y: 0, z: -2, w: 1.4, h: 3.5, d: 1.4, kind: 'sandstone', color: 0xc2a072 });
    ds.pillar({ x: 6, y: 0, z: -2, w: 1.4, h: 3.5, d: 1.4, kind: 'sandstone', color: 0xc2a072 });
    // Elevated Defender Mid Sniper Nest (y = 3.2) with breakable glass window & soft drywall flank
    wb.addDeck(0, 3.2, -20, 12, 7, stoneFloor);
    wb.addStaircase(0, 0, -29, 0, 3.2, -23.5, 3.6, stoneFloor);
    wb.addBox(-4.5, 4.9, -16.6, 3, 3.4, 0.5, sandWall, true);
    wb.addBox(4.5, 4.9, -16.6, 3, 3.4, 0.5, sandWall, true);
    wb.addBox(0, 3.85, -16.6, 6, 1.3, 0.5, darkStone, true);
    ds.glass({ x: 0, y: 5.5, z: -16.6, w: 5.6, h: 2.0, d: 0.16 });

    // --- SITE B: VAULT & 2-STORY APARTMENTS (East: x = +32, z = -10) ---
    wb.addDeck(32, 0.08, -10, 30, 26, stoneFloor);
    // 2-Story B-Apartments Gallery on East flank (y = 4.6)
    wb.addDeck(42, 4.6, 2, 16, 24, roofTimber);
    wb.addStaircase(45, 0, 22, 45, 4.6, 14, 4.2, stoneFloor);
    wb.addStaircase(45, 0, -24, 45, 4.6, -15, 4.2, stoneFloor);
    // Overhanging B-Vault Drop Deck with Ceiling Hatch!
    wb.addDeck(36.5, 4.6, -12, 5.5, 10, roofTimber);
    wb.addDeck(27.5, 4.6, -12, 5.5, 10, roofTimber);
    wb.addDeck(32, 4.6, -15.5, 3.8, 3, roofTimber);
    wb.addDeck(32, 4.6, -8.5, 3.8, 3, roofTimber);
    ds.hatch({ x: 32, y: 4.6, z: -12, w: 3.4, d: 3.4, h: 0.30 });
    // Soft Breach Walls into Site B Apartments & B-Main
    ds.softWall({ x: 34, y: 4.6, z: 2, w: 6.4, h: 3.2, d: 0.34, ry: Math.PI * 0.5, kind: 'timber', color: 0x875f3c });
    ds.softWall({ x: 32, y: 0, z: 4, w: 6.4, h: 3.3, d: 0.36, ry: 0, kind: 'sandstone', color: 0xc5a273 });
    // Breakable Pillars & Solid Vault Crate on Site B
    ds.pillar({ x: 26, y: 0, z: -6, w: 1.5, h: 3.6, d: 1.5, kind: 'sandstone', color: 0xc2a072 });
    ds.pillar({ x: 38, y: 0, z: -14, w: 1.5, h: 3.6, d: 1.5, kind: 'sandstone', color: 0xc2a072 });
    wb.addBox(30, 1.3, -15, 2.8, 2.6, 2.8, trimGold, true);

    // Subtle Wallrun Sand-Brick Strips along outer A/B corridors for VELOCITY movement flair
    wb.addWallrunPanel(-50.6, 2.8, 8, 16, 4.4, 0);
    wb.addWallrunPanel(50.6, 2.8, 8, 16, 4.4, 0);

    // Decorative Citadel Minaret Towers outside perimeter
    for (const [tx, tz] of [[-58, -56], [58, -56], [-58, 56], [58, 56]]) {
      wb.addBox(tx, 14, tz, 7, 28, 7, sandWall, false);
      wb.addBox(tx, 29, tz, 8.2, 2, 8.2, trimGold, false);
    }

    const sites = [
      { id: 'A', name: 'A PALACE', x: -32, y: 0, z: -10, radius: 6.4 },
      { id: 'B', name: 'B VAULT', x: 32, y: 0, z: -10, radius: 6.4 }
    ];
    sites.forEach((s) => addBombSiteVisual(wb, s));

    const atkSpawns = [
      { x: -10, y: 0.2, z: 44, yaw: 0 },
      { x: -5, y: 0.2, z: 46, yaw: 0 },
      { x: 0, y: 0.2, z: 44, yaw: 0 },
      { x: 5, y: 0.2, z: 46, yaw: 0 },
      { x: 10, y: 0.2, z: 44, yaw: 0 }
    ];
    const defSpawns = [
      { x: -10, y: 0.2, z: -44, yaw: Math.PI },
      { x: -5, y: 0.2, z: -46, yaw: Math.PI },
      { x: 0, y: 0.2, z: -44, yaw: Math.PI },
      { x: 5, y: 0.2, z: -46, yaw: Math.PI },
      { x: 10, y: 0.2, z: -44, yaw: Math.PI }
    ];
    const spawns = atkSpawns.concat(defSpawns);

    return {
      id: 'tac_citadel',
      name: 'Desert Citadel',
      theme: 'sandstone',
      isArena: true,
      course: null,
      isDemolition: true,
      mode: 'demolition',
      bound: 78,
      killY: -12,
      voidHazard: false,
      spawn: makeV3(atkSpawns[2].x, atkSpawns[2].y, atkSpawns[2].z),
      yaw: atkSpawns[2].yaw,
      spawns,
      arenaSpawns: spawns,
      tactical: {
        atkSpawns,
        defSpawns,
        sites,
        buyBarriers,
        waypoints: {
          A: [{ x: -32, y: 0.2, z: 18 }, { x: -32, y: 0.2, z: 4 }, { x: -32, y: 0.2, z: -10 }],
          B: [{ x: 32, y: 0.2, z: 18 }, { x: 32, y: 0.2, z: 4 }, { x: 32, y: 0.2, z: -10 }],
          MID: [{ x: 0, y: 0.2, z: 18 }, { x: 0, y: 0.2, z: 0 }, { x: 0, y: 0.2, z: -14 }],
          DEF_A: [{ x: -28, y: 0.2, z: -26 }, { x: -32, y: 0.2, z: -12 }],
          DEF_B: [{ x: 28, y: 0.2, z: -26 }, { x: 32, y: 0.2, z: -12 }]
        },
        callouts: [
          { name: 'A PALACE', x: -32, z: -10, r: 14 },
          { name: 'A MAIN', x: -34, z: 16, r: 12 },
          { name: 'MID COURTYARD', x: 0, z: 0, r: 14 },
          { name: 'MID WINDOW', x: 0, z: -20, r: 9 },
          { name: 'B VAULT', x: 32, z: -10, r: 14 },
          { name: 'B APARTMENTS', x: 38, z: 12, r: 12 },
          { name: 'ATK SPAWN', x: 0, z: 43, r: 16 },
          { name: 'DEF SPAWN', x: 0, z: -43, r: 16 }
        ]
      },
      previewWaypoints: [
        [-48, 22, 46], [48, 20, 42], [48, 24, -46], [-48, 22, -44]
      ]
    };
  }

  // =========================================================================
  // MAP 2: NEON SKYWAY PENTHOUSE (tac_skyway) — The Finals Seoul + R6 Bank
  // =========================================================================
  function buildTacSkyway(wbOrOpts) {
    const wb = resolveBuilder(wbOrOpts, 'kitsune');
    const ds = createDestructibleHelper(wb);
    const buyBarriers = [];

    const marbleFloor = makeMat(0x2d3748, 0.42, 0.22);
    const upperFloor = makeMat(0x3a4659, 0.48, 0.28);
    const concreteWall = makeMat(0x1f2937, 0.72, 0.18);
    const cyanTrim = makeMat(0x38bdf8, 0.35, 0.45, { emissive: 0x0c4a6e, emissiveIntensity: 0.45 });
    const coralTrim = makeMat(0xff6b35, 0.35, 0.35, { emissive: 0x7c2d12, emissiveIntensity: 0.40 });

    // Lower Level Full Deck (Server Vault & Lobby, y = 0, 96m x 98m)
    wb.addDeck(0, 0, 0, 96, 98, marbleFloor);
    // Outer Penthouse Curtain Perimeter
    wb.addBox(0, 6, -49, 98, 12, 2, concreteWall, true);
    wb.addBox(0, 6, 49, 98, 12, 2, concreteWall, true);
    wb.addBox(-48, 6, 0, 2, 12, 98, concreteWall, true);
    wb.addBox(48, 6, 0, 2, 12, 98, concreteWall, true);

    // Upper Penthouse Level (y = 4.6) — South Attacker Skybridge, North Defender Core, West Site A Lounge, East Mezzanine
    wb.addDeck(0, 4.6, 38, 72, 18, upperFloor);   // South ATK Skybridge Terrace
    wb.addDeck(0, 4.6, -38, 72, 18, upperFloor);  // North DEF Penthouse Terrace
    // Central Glass Skybridge crossing Mid Atrium at y = 4.6
    wb.addDeck(0, 4.6, 0, 12, 58, upperFloor);
    ds.glass({ x: -5.9, y: 6.1, z: 0, w: 0.16, h: 2.8, d: 18, color: 0x7dd3fc });
    ds.glass({ x: 5.9, y: 6.1, z: 0, w: 0.16, h: 2.8, d: 18, color: 0x7dd3fc });

    // Grand Staircases linking Lower Level (y=0) & Upper Penthouse (y=4.6)
    wb.addStaircase(-16, 0, 24, -16, 4.6, 32, 4.4, marbleFloor);
    wb.addStaircase(16, 0, 24, 16, 4.6, 32, 4.4, marbleFloor);
    wb.addStaircase(-16, 0, -24, -16, 4.6, -32, 4.4, marbleFloor);
    wb.addStaircase(16, 0, -24, 16, 4.6, -32, 4.4, marbleFloor);

    // Buy-Phase Barriers on Upper & Lower exits
    addBuyBarrier(wb, buyBarriers, -26, 4.6, 26, 20, 4.8, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 0, 4.6, 26, 14, 4.8, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 26, 4.6, 26, 20, 4.8, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 0, 0, 22, 24, 4.5, 0.4, 'atk');

    addBuyBarrier(wb, buyBarriers, -26, 4.6, -26, 20, 4.8, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 0, 4.6, -26, 14, 4.8, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 26, 4.6, -26, 20, 4.8, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 0, 0, -22, 24, 4.5, 0.4, 'def');

    // --- SITE A: UPPER EXECUTIVE LOUNGE (West: x = -28, y = 4.6, z = -8) ---
    // Built with a central Floor Breach Hatch directly above Lower Server Room!
    wb.addDeck(-37, 4.6, -6, 14, 44, upperFloor);
    wb.addDeck(-19, 4.6, -6, 14, 44, upperFloor);
    wb.addDeck(-28, 4.6, 9, 4.2, 18, upperFloor);
    wb.addDeck(-28, 4.6, -21, 4.2, 18, upperFloor);
    wb.addDeck(-28, 4.6, -12.5, 4.2, 5, upperFloor);
    wb.addDeck(-28, 4.6, -2.5, 4.2, 5, upperFloor);
    // Destructible Executive Lounge Floor Hatch (blow open to drop into lower flank or shoot up!)
    ds.hatch({ x: -28, y: 4.6, z: -7.5, w: 3.8, d: 4.2, h: 0.30 });
    // Soft Office Drywall Breach Walls ringing Executive Lounge
    ds.softWall({ x: -28, y: 4.6, z: 6, w: 8.0, h: 3.4, d: 0.32, ry: 0, kind: 'drywall', color: 0x94a3b8 });
    ds.softWall({ x: -16, y: 4.6, z: -8, w: 8.0, h: 3.4, d: 0.32, ry: Math.PI * 0.5, kind: 'drywall', color: 0x94a3b8 });
    ds.softWall({ x: -28, y: 4.6, z: -19, w: 6.4, h: 3.4, d: 0.32, ry: 0, kind: 'drywall', color: 0x94a3b8 });
    // Breakable Lounge Pillars + Executive Desk Cover
    ds.pillar({ x: -23, y: 4.6, z: -4, w: 1.4, h: 3.6, d: 1.4, kind: 'concrete', color: 0x64748b });
    ds.pillar({ x: -33, y: 4.6, z: -12, w: 1.4, h: 3.6, d: 1.4, kind: 'concrete', color: 0x64748b });
    wb.addBox(-32, 5.4, -6, 3.2, 1.4, 1.4, coralTrim, true);

    // --- SITE B: LOWER SERVER VAULT & HELIPAD ATRIUM (East: x = +28, y = 0, z = -8) ---
    // Upper Mezzanine over East Site B with TWO destructible ceiling drop hatches!
    wb.addDeck(38, 4.6, -6, 12, 44, upperFloor);
    wb.addDeck(18, 4.6, -6, 12, 44, upperFloor);
    wb.addDeck(28, 4.6, 10, 8.2, 16, upperFloor);
    wb.addDeck(28, 4.6, -21, 8.2, 16, upperFloor);
    wb.addDeck(28, 4.6, -8, 8.2, 4.5, upperFloor);
    ds.hatch({ x: 28, y: 4.6, z: -2.2, w: 3.8, d: 3.8, h: 0.30 });
    ds.hatch({ x: 28, y: 4.6, z: -13.8, w: 3.8, d: 3.8, h: 0.30 });
    // Lower Site B Breachable Vault Partitions & Server Racks
    ds.softWall({ x: 28, y: 0, z: 6, w: 8.0, h: 3.6, d: 0.36, ry: 0, kind: 'drywall', color: 0x8a97a8 });
    ds.softWall({ x: 16, y: 0, z: -8, w: 8.0, h: 3.6, d: 0.36, ry: Math.PI * 0.5, kind: 'drywall', color: 0x8a97a8 });
    ds.pillar({ x: 24, y: 0, z: -5, w: 1.5, h: 4.2, d: 1.5, kind: 'concrete', color: 0x64748b });
    ds.pillar({ x: 33, y: 0, z: -11, w: 1.5, h: 4.2, d: 1.5, kind: 'concrete', color: 0x64748b });
    wb.addBox(29, 1.35, -8, 2.2, 2.7, 3.2, cyanTrim, true);

    // Lower Mid Lobby Cover & Wallrun Neon Strips
    wb.addBox(0, 1.2, 0, 5.2, 2.4, 2.2, concreteWall, true);
    wb.addWallrunPanel(-46.6, 7.2, 0, 22, 4.2, 0);
    wb.addWallrunPanel(46.6, 7.2, 0, 22, 4.2, 0);

    // Exterior Twilight Skyscraper Skyline Silhouette (purely visual)
    for (const [bx, bz, bh] of [[-78, -60, 52], [78, -58, 60], [-82, 34, 48], [80, 40, 56], [0, -82, 68]]) {
      wb.addBox(bx, bh * 0.5 - 14, bz, 18, bh, 18, concreteWall, false);
      wb.addBox(bx, bh - 15, bz, 18.6, 1.2, 18.6, cyanTrim, false);
    }

    const sites = [
      { id: 'A', name: 'A EXECUTIVE LOUNGE', x: -28, y: 4.6, z: -8, radius: 6.2 },
      { id: 'B', name: 'B SERVER VAULT', x: 28, y: 0, z: -8, radius: 6.4 }
    ];
    sites.forEach((s) => addBombSiteVisual(wb, s));

    const atkSpawns = [
      { x: -12, y: 4.8, z: 40, yaw: 0 },
      { x: -6, y: 4.8, z: 42, yaw: 0 },
      { x: 0, y: 4.8, z: 40, yaw: 0 },
      { x: 6, y: 4.8, z: 42, yaw: 0 },
      { x: 12, y: 4.8, z: 40, yaw: 0 }
    ];
    const defSpawns = [
      { x: -12, y: 4.8, z: -40, yaw: Math.PI },
      { x: -6, y: 4.8, z: -42, yaw: Math.PI },
      { x: 0, y: 4.8, z: -40, yaw: Math.PI },
      { x: 6, y: 4.8, z: -42, yaw: Math.PI },
      { x: 12, y: 4.8, z: -40, yaw: Math.PI }
    ];
    const spawns = atkSpawns.concat(defSpawns);

    return {
      id: 'tac_skyway',
      name: 'Neon Skyway Penthouse',
      theme: 'kitsune',
      isArena: true,
      course: null,
      isDemolition: true,
      mode: 'demolition',
      bound: 76,
      killY: -14,
      voidHazard: false,
      spawn: makeV3(atkSpawns[2].x, atkSpawns[2].y, atkSpawns[2].z),
      yaw: atkSpawns[2].yaw,
      spawns,
      arenaSpawns: spawns,
      tactical: {
        atkSpawns,
        defSpawns,
        sites,
        buyBarriers,
        waypoints: {
          A: [{ x: -28, y: 4.8, z: 18 }, { x: -28, y: 4.8, z: 4 }, { x: -28, y: 4.8, z: -8 }],
          B: [{ x: 18, y: 0.2, z: 16 }, { x: 28, y: 0.2, z: 4 }, { x: 28, y: 0.2, z: -8 }],
          MID: [{ x: 0, y: 4.8, z: 18 }, { x: 0, y: 4.8, z: 0 }, { x: 0, y: 4.8, z: -18 }],
          DEF_A: [{ x: -28, y: 4.8, z: -24 }, { x: -28, y: 4.8, z: -10 }],
          DEF_B: [{ x: 24, y: 0.2, z: -24 }, { x: 28, y: 0.2, z: -10 }]
        },
        callouts: [
          { name: 'A LOUNGE', x: -28, z: -8, r: 14 },
          { name: 'SKYBRIDGE MID', x: 0, z: 0, r: 12 },
          { name: 'B SERVER VAULT', x: 28, z: -8, r: 14 },
          { name: 'EAST MEZZANINE', x: 34, z: 12, r: 12 },
          { name: 'ATK SKYBRIDGE', x: 0, z: 38, r: 16 },
          { name: 'DEF PENTHOUSE', x: 0, z: -38, r: 16 }
        ]
      },
      previewWaypoints: [
        [-46, 26, 44], [46, 22, 42], [46, 26, -44], [-46, 22, -42]
      ]
    };
  }

  // =========================================================================
  // MAP 3: ALPINE RESEARCH BUNKER (tac_alpine) — R6 Chalet Snow Compound
  // =========================================================================
  function buildTacAlpine(wbOrOpts) {
    const wb = resolveBuilder(wbOrOpts, 'boreas');
    const ds = createDestructibleHelper(wb);
    const buyBarriers = [];

    const snowFloor = makeMat(0xdbeafe, 0.88, 0.04);
    const bunkerFloor = makeMat(0x475569, 0.72, 0.22);
    const timberWall = makeMat(0x6b472d, 0.84, 0.06);
    const slateWall = makeMat(0x334155, 0.76, 0.16);
    const alpineBlue = makeMat(0x38bdf8, 0.40, 0.35, { emissive: 0x0369a1, emissiveIntensity: 0.35 });

    // Subterranean Bunker Ground Level (y = 0, 96m x 100m)
    wb.addDeck(0, 0, 0, 96, 100, bunkerFloor);
    // Outer Mountain Cliff Perimeter
    wb.addBox(0, 6.5, -50, 98, 13, 2, slateWall, true);
    wb.addBox(0, 6.5, 50, 98, 13, 2, slateWall, true);
    wb.addBox(-48, 6.5, 0, 2, 13, 100, slateWall, true);
    wb.addBox(48, 6.5, 0, 2, 13, 100, slateWall, true);

    // Upper Snow Compound & Chalet Lodge Deck (y = 4.5)
    wb.addDeck(0, 4.5, 38, 86, 20, snowFloor);   // South ATK Snow Courtyard
    wb.addDeck(0, 4.5, -38, 86, 20, snowFloor);  // North DEF Ridge Courtyard
    wb.addDeck(0, 4.5, 0, 18, 56, timberWall);   // Central Chalet Lodge Hall

    // Interior & Exterior Stairways down to Subterranean Reactor Bunker (y = 0)
    wb.addStaircase(0, 0, 18, 0, 4.5, 27, 4.6, bunkerFloor);
    wb.addStaircase(0, 0, -18, 0, 4.5, -27, 4.6, bunkerFloor);
    wb.addStaircase(36, 0, 20, 36, 4.5, 28, 4.4, snowFloor);
    wb.addStaircase(36, 0, -20, 36, 4.5, -28, 4.4, snowFloor);

    // Buy-Phase Barriers
    addBuyBarrier(wb, buyBarriers, -26, 4.5, 26, 24, 4.8, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 0, 4.5, 26, 18, 4.8, 0.4, 'atk');
    addBuyBarrier(wb, buyBarriers, 26, 4.5, 26, 24, 4.8, 0.4, 'atk');

    addBuyBarrier(wb, buyBarriers, -26, 4.5, -26, 24, 4.8, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 0, 4.5, -26, 18, 4.8, 0.4, 'def');
    addBuyBarrier(wb, buyBarriers, 26, 4.5, -26, 24, 4.8, 0.4, 'def');

    // --- SITE A: UPPER OBSERVATORY LODGE (West: x = -28, y = 4.5, z = -8) ---
    wb.addDeck(-28, 4.5, -2, 36, 54, timberWall);
    // Overhead Observatory Roof Frame with Breakable Glass Skylight!
    wb.addBox(-28, 9.2, -16, 22, 0.5, 6, slateWall, true);
    wb.addBox(-28, 9.2, 0, 22, 0.5, 6, slateWall, true);
    ds.glass({ x: -28, y: 9.1, z: -8, w: 12, h: 0.18, d: 8.5, color: 0xbae6fd });
    // Soft Chalet Timber Breach Walls surrounding Observatory Site A
    ds.softWall({ x: -28, y: 4.5, z: 6, w: 8.0, h: 3.4, d: 0.34, ry: 0, kind: 'timber', color: 0x855a36 });
    ds.softWall({ x: -14, y: 4.5, z: -8, w: 8.0, h: 3.4, d: 0.34, ry: Math.PI * 0.5, kind: 'timber', color: 0x855a36 });
    ds.softWall({ x: -28, y: 4.5, z: -20, w: 6.4, h: 3.4, d: 0.34, ry: 0, kind: 'timber', color: 0x855a36 });
    // Breakable Stone Fireplace Pillars & Console Cover
    ds.pillar({ x: -22, y: 4.5, z: -4, w: 1.5, h: 3.8, d: 1.5, kind: 'concrete', color: 0x64748b });
    ds.pillar({ x: -34, y: 4.5, z: -12, w: 1.5, h: 3.8, d: 1.5, kind: 'concrete', color: 0x64748b });
    wb.addBox(-28, 5.6, -12, 3.0, 2.2, 1.8, alpineBlue, true);

    // --- SITE B: SUB-LEVEL REACTOR BUNKER (East: x = +28, y = 0, z = -8) ---
    // Upper Snow Terrace above Site B with 2 Destructible Floor Drop Hatches!
    wb.addDeck(38, 4.5, -2, 16, 52, snowFloor);
    wb.addDeck(18, 4.5, -2, 14, 52, snowFloor);
    wb.addDeck(28, 4.5, 11, 8.2, 22, snowFloor);
    wb.addDeck(28, 4.5, -21, 8.2, 16, snowFloor);
    wb.addDeck(28, 4.5, -8, 8.2, 4.5, snowFloor);
    ds.hatch({ x: 28, y: 4.5, z: -2.0, w: 3.8, d: 3.8, h: 0.30 });
    ds.hatch({ x: 28, y: 4.5, z: -13.8, w: 3.8, d: 3.8, h: 0.30 });
    // Iconic R6 Chalet Wide Garage Breach Wall into Sub-Level Reactor Site B!
    ds.softWall({ x: 28, y: 0, z: 7, w: 9.2, h: 3.6, d: 0.38, ry: 0, kind: 'drywall', color: 0x94a3b8 });
    ds.softWall({ x: 14, y: 0, z: -8, w: 7.4, h: 3.6, d: 0.36, ry: Math.PI * 0.5, kind: 'drywall', color: 0x94a3b8 });
    // Reactor Core Cover & Breakable Lab Columns
    wb.addBox(28, 1.6, -8, 2.8, 3.2, 2.8, alpineBlue, true);
    ds.pillar({ x: 22, y: 0, z: -3, w: 1.5, h: 4.1, d: 1.5, kind: 'concrete', color: 0x64748b });
    ds.pillar({ x: 34, y: 0, z: -13, w: 1.5, h: 4.1, d: 1.5, kind: 'concrete', color: 0x64748b });

    // Mid Chalet Great Room Cover + Breakable Glass Window
    wb.addBox(0, 5.7, 0, 3.6, 2.4, 2.2, slateWall, true);
    ds.glass({ x: -8.8, y: 6.2, z: 6, w: 0.16, h: 2.4, d: 5.2, color: 0xbae6fd });

    // Snowy Pine Mountain Peaks outside perimeter (visual vista)
    for (const [mx, mz, mh] of [[-74, -56, 36], [76, -52, 42], [-72, 48, 32], [74, 46, 38]]) {
      wb.addBox(mx, mh * 0.5, mz, 22, mh, 22, slateWall, false);
      wb.addBox(mx, mh + 0.6, mz, 16, 2.2, 16, snowFloor, false);
    }

    const sites = [
      { id: 'A', name: 'A OBSERVATORY', x: -28, y: 4.5, z: -8, radius: 6.2 },
      { id: 'B', name: 'B REACTOR', x: 28, y: 0, z: -8, radius: 6.4 }
    ];
    sites.forEach((s) => addBombSiteVisual(wb, s));

    const atkSpawns = [
      { x: -12, y: 4.7, z: 40, yaw: 0 },
      { x: -6, y: 4.7, z: 42, yaw: 0 },
      { x: 0, y: 4.7, z: 40, yaw: 0 },
      { x: 6, y: 4.7, z: 42, yaw: 0 },
      { x: 12, y: 4.7, z: 40, yaw: 0 }
    ];
    const defSpawns = [
      { x: -12, y: 4.7, z: -40, yaw: Math.PI },
      { x: -6, y: 4.7, z: -42, yaw: Math.PI },
      { x: 0, y: 4.7, z: -40, yaw: Math.PI },
      { x: 6, y: 4.7, z: -42, yaw: Math.PI },
      { x: 12, y: 4.7, z: -40, yaw: Math.PI }
    ];
    const spawns = atkSpawns.concat(defSpawns);

    return {
      id: 'tac_alpine',
      name: 'Alpine Research Bunker',
      theme: 'boreas',
      isArena: true,
      course: null,
      isDemolition: true,
      mode: 'demolition',
      bound: 76,
      killY: -14,
      voidHazard: false,
      spawn: makeV3(atkSpawns[2].x, atkSpawns[2].y, atkSpawns[2].z),
      yaw: atkSpawns[2].yaw,
      spawns,
      arenaSpawns: spawns,
      tactical: {
        atkSpawns,
        defSpawns,
        sites,
        buyBarriers,
        waypoints: {
          A: [{ x: -28, y: 4.7, z: 16 }, { x: -28, y: 4.7, z: 4 }, { x: -28, y: 4.7, z: -8 }],
          B: [{ x: 28, y: 0.2, z: 16 }, { x: 28, y: 0.2, z: 4 }, { x: 28, y: 0.2, z: -8 }],
          MID: [{ x: 0, y: 4.7, z: 14 }, { x: 0, y: 4.7, z: 0 }, { x: 0, y: 4.7, z: -14 }],
          DEF_A: [{ x: -28, y: 4.7, z: -24 }, { x: -28, y: 4.7, z: -10 }],
          DEF_B: [{ x: 28, y: 0.2, z: -24 }, { x: 28, y: 0.2, z: -10 }]
        },
        callouts: [
          { name: 'A OBSERVATORY', x: -28, z: -8, r: 14 },
          { name: 'CHALET MID', x: 0, z: 0, r: 12 },
          { name: 'B REACTOR', x: 28, z: -8, r: 14 },
          { name: 'B GARAGE', x: 28, z: 12, r: 10 },
          { name: 'ATK COURTYARD', x: 0, z: 38, r: 16 },
          { name: 'DEF RIDGE', x: 0, z: -38, r: 16 }
        ]
      },
      previewWaypoints: [
        [-46, 24, 44], [46, 22, 42], [46, 24, -44], [-46, 22, -42]
      ]
    };
  }

  const TACTICAL_MAPS = Object.freeze([
    {
      id: 'tac_citadel',
      name: 'Desert Citadel',
      shortName: 'DESERT CITADEL',
      mode: 'demolition',
      archetype: '5v5 Demolition · 3-Lane Citadel',
      pacing: '2-Site / Vertical Breach',
      pacingKey: 'tactical',
      theme: 'sandstone',
      tagline: 'Dust2 & Mirage 3-lane flow with 2-story Palace, ceiling drop hatches & breachable sandstone walls.',
      description: 'Sun-baked 5v5 bomb defusal fortress featuring a 2-story Palace overlooking Site A, breachable Mid Connector and Market walls, destructible drop hatches, and collapsing cover columns.',
      features: ['2 Bomb Sites', 'Soft Breach Walls', 'Ceiling Drop Hatches', '3-Lane + Mid Window'],
      voidHazard: false,
      build: buildTacCitadel
    },
    {
      id: 'tac_skyway',
      name: 'Neon Skyway Penthouse',
      shortName: 'NEON SKYWAY',
      mode: 'demolition',
      archetype: '5v5 Demolition · Vertical High-Rise',
      pacing: 'Multi-Floor / Heavy Breach',
      pacingKey: 'tactical',
      theme: 'kitsune',
      tagline: 'The Finals Seoul meets R6 Bank: Executive Lounge floor breaches above the Server Vault.',
      description: 'Two-story twilight high-rise atrium linking Upper Executive Lounge Site A and Lower Server Vault Site B via destructible floor hatches, breakable glass skybridges, and soft office partitions.',
      features: ['2 Full Floors', 'Floor Drop Breaches', 'Breakable Glass', 'Soft Office Walls'],
      voidHazard: false,
      build: buildTacSkyway
    },
    {
      id: 'tac_alpine',
      name: 'Alpine Research Bunker',
      shortName: 'ALPINE BUNKER',
      mode: 'demolition',
      archetype: '5v5 Demolition · Snow Lodge & Lab',
      pacing: 'Skylight + Garage Breach',
      pacingKey: 'tactical',
      theme: 'boreas',
      tagline: 'R6 Chalet snow compound with Observatory skylight breaches and a sub-level Reactor garage.',
      description: 'Snow-draped mountain research lodge above a subterranean reactor bunker. Blast open the wide B Garage breach wall, drop through snow terrace hatches, or shatter Observatory skylights.',
      features: ['Observatory Skylight', 'Wide Garage Breach', 'Sub-Level Reactor', 'Snow Drop Hatches'],
      voidHazard: false,
      build: buildTacAlpine
    }
  ]);

  const TACTICAL_MAP_IDS = Object.freeze(TACTICAL_MAPS.map((m) => m.id));
  const TACTICAL_BY_ID = Object.create(null);
  for (const m of TACTICAL_MAPS) TACTICAL_BY_ID[m.id] = m;

  function isTacticalMapId(id) {
    return typeof id === 'string' && Boolean(TACTICAL_BY_ID[id]);
  }

  function getCalloutName(mapData, x, z) {
    const callouts = mapData && mapData.tactical && Array.isArray(mapData.tactical.callouts)
      ? mapData.tactical.callouts
      : [];
    let best = 'MID';
    let bestDist = Infinity;
    for (const c of callouts) {
      const d = Math.hypot((x || 0) - c.x, (z || 0) - c.z);
      if (d <= c.r && d < bestDist) {
        bestDist = d;
        best = c.name;
      }
    }
    return best;
  }

  function findPlantSiteAt(mapData, x, y, z) {
    const sites = mapData && mapData.tactical && Array.isArray(mapData.tactical.sites)
      ? mapData.tactical.sites
      : [];
    for (const s of sites) {
      const dx = (x || 0) - s.x;
      const dz = (z || 0) - s.z;
      const dy = Math.abs((y || 0) - (s.y || 0));
      if (dx * dx + dz * dz <= (s.radius || 6.2) * (s.radius || 6.2) && dy <= 2.6) {
        return s;
      }
    }
    return null;
  }

  function setBuyBarriersActive(mapData, active) {
    const list = mapData && mapData.tactical && Array.isArray(mapData.tactical.buyBarriers)
      ? mapData.tactical.buyBarriers
      : [];
    for (const b of list) {
      if (b.solid) b.solid.disabled = !active;
      if (b.mesh) {
        b.mesh.visible = Boolean(active);
        b.mesh.userData = b.mesh.userData || {};
        b.mesh.userData.disabled = !active;
      }
    }
  }

  return {
    TACTICAL_MAPS,
    TACTICAL_MAP_IDS,
    TACTICAL_BY_ID,
    isTacticalMapId,
    getCalloutName,
    findPlantSiteAt,
    setBuyBarriersActive,
    buildTacCitadel,
    buildTacSkyway,
    buildTacAlpine
  };
});
