// =====================================================================
// VELOCITY — 6-ARENA AAA-SCALE COMPETITIVE PVP MAP POOL & CATALOG
// UMD Module (window.ArenaCatalog + Node.js module.exports)
//
// Designed around authentic Call of Duty / Counter-Strike macro flow:
// - Spacious 165m–215m footprints (no cramped corridors, no spawn-to-spawn instakills)
// - Real enterable multi-room buildings, staircases, windows, balconies & rooftops
// - Distinct 3-lane layouts with connectors, vehicles, crate boost spots & landmarks
// - Seamless integration of VELOCITY movement (wallruns, surf lines, slide-unders,
//   launch vents, turbo boost rings, and paired flank portals)
// =====================================================================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    const api = factory(root);
    root.ArenaCatalog = api;
    root.buildArenaSurf = api.buildArenaSurf;
    root.buildArenaAim = api.buildArenaAim;
    root.buildArenaSpire = api.buildArenaSpire;
    root.buildArenaCargo = api.buildArenaCargo;
    root.buildArenaSkyline = api.buildArenaSkyline;
    root.buildArenaCanyon = api.buildArenaCanyon;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function makeV3(x, y, z) {
    if (typeof root.V3 === 'function') return root.V3(x, y, z);
    if (root.THREE && typeof root.THREE.Vector3 === 'function') return new root.THREE.Vector3(x, y, z);
    return { x, y, z };
  }

  function makeBuilder(opts, defaultTheme) {
    const o = opts || {};
    return root.createWorldBuilder({
      group: o.group || root.levelGroup,
      collide: o.collide !== false,
      isPreview: !!o.isPreview,
      theme: o.theme || defaultTheme
    });
  }

  // ===================================================================
  // 1. ARENA 01 — SURF STADIUM (Massive AAA Esports Surf-Combat Stadium)
  //    214m x 184m · Sweeping 112m surf bowls + 2-story central island
  // ===================================================================
  function buildArenaSurf(opts) {
    const wb = makeBuilder(opts, 'prism');
    const tm = wb.mats;
    const concFloor = wb.getArchMat('concrete_floor');
    const steelDeck = wb.getArchMat('steel_deck');
    const concWall = wb.getArchMat('concrete_wall');

    // North & South Team Concourses (top y = 16, z = ±76) — wide multi-exit bases
    for (const sign of [-1, 1]) {
      wb.addDeck(0, 16, sign * 76, 76, 28, concFloor);
      wb.addBox(0, 16.14, sign * 62.2, 76, 0.28, 0.45, tm.accent, false);
      // Rear stadium retaining facade + neon arch
      wb.addBox(0, 23, sign * 90.5, 84, 15, 2.5, tm.dark, true);
      wb.addNeonFrame(0, 26, sign * 88.5, 58, 12, 0);

      // Enterable Center Team Pavilion (breaks spawn-to-spawn sniping, offers 3 exits)
      wb.addBuilding(0, 16, sign * 75, 24, 6.2, 13, {
        wallMat: tm.deck,
        roofMat: tm.dark,
        trimMat: tm.under,
        parapetH: 1.0,
        accentStrip: true,
        doors: [
          { side: sign < 0 ? 'S' : 'N', offset: 0, width: 6.4, height: 4.4 },
          { side: 'W', offset: 0, width: 5.2, height: 4.2 },
          { side: 'E', offset: 0, width: 5.2, height: 4.2 }
        ],
        windows: [
          { side: sign < 0 ? 'S' : 'N', offset: -8.2, width: 4.2, sillH: 1.15, headH: 3.4 },
          { side: sign < 0 ? 'S' : 'N', offset: 8.2, width: 4.2, sillH: 1.15, headH: 3.4 }
        ]
      });

      // Flanking cover & crates on concourse wings
      wb.addCrateCluster(-26, 16, sign * 67, sign * 0.2);
      wb.addCrateCluster(26, 16, sign * 67, -sign * 0.2);
      wb.addJerseyBarrier(-15, 16, sign * 64.5, 5.2, 0);
      wb.addJerseyBarrier(15, 16, sign * 64.5, 5.2, 0);

      // Walkable side staircases descending to outer low-ground safety bays (y = 4)
      for (const sx of [-1, 1]) {
        wb.addDeck(sx * 54, 4, sign * 68, 26, 26, steelDeck);
        wb.addStaircase(sx * 38, 16, sign * 72, sx * 48, 4, sign * 72, 4.8, concFloor);
        // Updraft launch vent launching straight up onto the surf bowl or grandstand roof
        wb.addLaunchPad(sx * 60, 4.05, sign * 72, {
          variant: 'vent',
          upSpeed: 24.5,
          label: 'STADIUM UPDRAFT'
        });
        wb.addCrateCluster(sx * 48, 4, sign * 60, sx * 0.4);
      }
    }

    // Paired Opposing Corner Flank Portals (Cyan: NW <-> SE, Amber: NE <-> SW)
    wb.addStageTeleporter([-60, 4, -60], [6.2, 5.2, 2.6], [52, 4.5, 62], 0.65, {
      yaw: 0.55, ringHex: 0x4ef4ff, preserveSpeed: true, maxSpeed: 24, cooldown: 1.25, label: 'FLANK PORTAL · CYAN'
    });
    wb.addStageTeleporter([60, 4, 60], [6.2, 5.2, 2.6], [-52, 4.5, -62], Math.PI + 0.65, {
      yaw: 0.55, ringHex: 0x4ef4ff, preserveSpeed: true, maxSpeed: 24, cooldown: 1.25, label: 'FLANK PORTAL · CYAN'
    });
    wb.addStageTeleporter([60, 4, -60], [6.2, 5.2, 2.6], [-52, 4.5, 62], -0.65, {
      yaw: -0.55, ringHex: 0xffb347, preserveSpeed: true, maxSpeed: 24, cooldown: 1.25, label: 'FLANK PORTAL · AMBER'
    });
    wb.addStageTeleporter([-60, 4, 60], [6.2, 5.2, 2.6], [52, 4.5, -62], Math.PI - 0.65, {
      yaw: -0.55, ringHex: 0xffb347, preserveSpeed: true, maxSpeed: 24, cooldown: 1.25, label: 'FLANK PORTAL · AMBER'
    });

    // MASSIVE SWEEPING TWIN CURVED SURF BOWLS (112m long, 16m wide faces, generous aerial clearance!)
    wb.addSurfCurve({
      start: [-44, 15, -56], yawStart: -0.30, yawDelta: 0.60, radius: 189.5, pitchDrop: 0,
      segments: 10, faceWidth: 16, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true
    });
    wb.addSurfCurve({
      start: [44, 15, -56], yawStart: 0.30, yawDelta: -0.60, radius: 189.5, pitchDrop: 0,
      segments: 10, faceWidth: 16, slopeDeg: 50, side: 'both', lipStart: true, lipEnd: true
    });

    // Outer High-Speed Turbo Skyway Boost Rings (Northbound & Southbound)
    wb.addBoostRing([-72, 13.5, -18], [0, 0.08, 1], { radius: 6.2, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'WEST TURBO RING' });
    wb.addBoostRing([-72, 13.5, 18], [0, 0.08, -1], { radius: 6.2, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'WEST TURBO RING' });
    wb.addBoostRing([72, 13.5, 18], [0, 0.08, -1], { radius: 6.2, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'EAST TURBO RING' });
    wb.addBoostRing([72, 13.5, -18], [0, 0.08, 1], { radius: 6.2, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'EAST TURBO RING' });

    // Outer Wallrun Stadium Banners flanking the bowls
    wb.addWallrunPanel(-82, 14, 0, 48, 9, 0);
    wb.addWallrunPanel(82, 14, 0, 48, 9, 0);

    // CENTRAL 2-STORY FLOATING COMBAT ISLAND (54m x 48m lower deck @ y = 4, upper command bridge @ y = 11.5)
    wb.addDeck(0, 4, 0, 54, 48, concFloor);
    wb.addBox(0, 4.1, -23.8, 54, 0.22, 0.4, tm.accent, false);
    wb.addBox(0, 4.1, 23.8, 54, 0.22, 0.4, tm.accent, false);

    // Wide walkways connecting North & South Concourses to the Central Island (sloped drop-in bridges!)
    wb.addStaircase(-16, 16, -62, -16, 4, -24, 6.5, steelDeck);
    wb.addStaircase(16, 16, 62, 16, 4, 24, 6.5, steelDeck);
    wb.addStaircase(16, 16, -62, 16, 4, -24, 6.5, steelDeck);
    wb.addStaircase(-16, 16, 62, -16, 4, 24, 6.5, steelDeck);

    // Enterable Central Arena Bunker on lower island with staircases up to upper command deck (y = 11.5)
    wb.addBuilding(0, 4, 0, 22, 7.5, 18, {
      wallMat: concWall,
      roofMat: steelDeck,
      trimMat: tm.dark,
      parapetH: 1.1,
      accentStrip: true,
      parapetGaps: { W: true, E: true },
      doors: [
        { side: 'N', offset: 0, width: 5.8, height: 4.5 },
        { side: 'S', offset: 0, width: 5.8, height: 4.5 },
        { side: 'W', offset: 0, width: 5.2, height: 4.2 },
        { side: 'E', offset: 0, width: 5.2, height: 4.2 }
      ],
      windows: [
        { side: 'N', offset: -7.5, width: 3.6, sillH: 1.15, headH: 3.4 },
        { side: 'S', offset: 7.5, width: 3.6, sillH: 1.15, headH: 3.4 }
      ]
    });
    // Interior/exterior staircases onto Central Island Roof (y = 11.5)
    wb.addStaircase(-22, 4, 0, -11, 11.5, 0, 4.6, steelDeck);
    wb.addStaircase(22, 4, 0, 11, 11.5, 0, 4.6, steelDeck);

    // Cover on Central Island lower perimeter & upper roof
    wb.addJerseyBarrier(-18, 4, -15, 5.4, 0.35);
    wb.addJerseyBarrier(18, 4, 15, 5.4, 0.35);
    wb.addCrateCluster(18, 4, -14, -0.4);
    wb.addCrateCluster(-18, 4, 14, 0.4);
    wb.addJerseyBarrier(0, 11.5, -5.5, 4.8, 0);
    wb.addJerseyBarrier(0, 11.5, 5.5, 4.8, 0);

    // Central Island Launch Pads up to East/West Elevated Sniper Towers (y = 19)
    for (const sx of [-1, 1]) {
      wb.addDeck(sx * 76, 19, 0, 18, 34, concFloor);
      wb.addBox(sx * 67.2, 20.1, 0, 0.55, 1.1, 24, tm.dark, true);
      wb.addCrateCluster(sx * 75, 19, -10, sx * 0.3);
      wb.addCrateCluster(sx * 75, 19, 10, -sx * 0.3);
      wb.addLaunchPad(sx * 24, 4.05, -18, { upSpeed: 21, dir: [sx, 0], horizSpeed: 16, label: 'TOWER LAUNCH' });
      wb.addLaunchPad(sx * 24, 4.05, 18, { upSpeed: 21, dir: [sx, 0], horizSpeed: 16, label: 'TOWER LAUNCH' });
    }

    // Monumental Stadium Outer Grandstands & Glowing Arches (non-colliding AAA vista)
    for (const zArch of [-58, -22, 22, 58]) {
      wb.addNeonFrame(0, 38, zArch, 158, 22, 0);
    }
    for (const sx of [-1, 1]) {
      wb.addBox(sx * 108, 18, 0, 14, 34, 190, tm.dark, false);
      wb.addBox(sx * 100, 26, 0, 3, 2.5, 180, tm.accent, false);
      for (let z = -75; z <= 75; z += 30) wb.addPylon(sx * 96, 14, z, 28);
    }
    // Deep reactor void pit visual glow at y = -44 (matches generous killY = -38 for surf/grapple recovery!)
    wb.addBox(0, -44, 0, 210, 1, 195, tm.under, false);
    wb.addRing(0, -40, 0, 38, 0x4ef4ff).rotation.x = Math.PI * 0.5;
    wb.addRing(0, -40, 0, 62, 0xc290ff).rotation.x = Math.PI * 0.5;

    const spawns = [
      { x: 0, y: 16.05, z: -75, yaw: Math.PI },
      { x: 0, y: 16.05, z: 75, yaw: 0 },
      { x: -30, y: 16.05, z: -76, yaw: Math.PI - 0.25 },
      { x: 30, y: 16.05, z: 76, yaw: -0.25 },
      { x: -54, y: 4.05, z: -68, yaw: Math.PI - 0.5 },
      { x: 54, y: 4.05, z: 68, yaw: -0.5 },
      { x: -75, y: 19.05, z: 0, yaw: -Math.PI * 0.5 },
      { x: 75, y: 19.05, z: 0, yaw: Math.PI * 0.5 }
    ];

    return {
      id: 'arena_surf',
      theme: 'prism',
      isArena: true,
      course: null,
      bound: 140,
      killY: -38,
      voidHazard: true,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-95, 42, -92], [88, 36, -65], [96, 40, 82], [-88, 34, 72]
      ]
    };
  }

  // ===================================================================
  // 2. ARENA 02 — AIM COURTYARD (CS Mirage / Dust II + CoD Crash Town)
  //    178m x 156m · Enterable Palace Apartments, Market Square, Mid Window & Long A
  // ===================================================================
  function buildArenaAim(opts) {
    const wb = makeBuilder(opts, 'sandstone');
    const tm = wb.mats;
    const sandWall = wb.getArchMat('sandstone_wall');
    const sandFloor = wb.getArchMat('sandstone_floor');
    const roadMat = wb.getArchMat('asphalt');
    const roofClay = wb.getColorMat(0x6e4733, 0.88, 0.05);
    const awningCyan = wb.getColorMat(0x28788a, 0.78, 0.08);
    const awningTerr = wb.getColorMat(0xa84d32, 0.80, 0.06);

    // Main Town Ground + Extended Desert Floor (zero floating-box feel!)
    wb.addDeck(0, 0, 0, 178, 156, sandFloor);
    wb.addBox(0, -1.6, 0, 520, 1.0, 520, wb.getColorMat(0x8a6949, 0.96, 0.02), false);

    // Paved East Long Boulevard road stripe (flush thin overlay, split around Site A to avoid Z-fighting)
    wb.addBox(56, 0.015, -42, 22, 0.03, 56, roadMat, false);
    wb.addBox(56, 0.015, 42, 22, 0.03, 56, roadMat, false);

    // Perimeter Town Walls & Gatehouses (varied sandstone heights — looks like a real walled Mediterranean town)
    wb.addBox(0, 5.5, -79, 182, 11, 2.8, sandWall, true);
    wb.addBox(0, 5.5, 79, 182, 11, 2.8, sandWall, true);
    wb.addBox(-90, 5.5, 0, 2.8, 11, 155.2, sandWall, true);
    wb.addBox(90, 5.5, 0, 2.8, 11, 155.2, sandWall, true);

    // --- NORTH SPAWN PLAZA (z = -66) & SOUTH BAZAAR SPAWN (z = +66) ---
    // Shielded spawn screens with 3 distinct lane exits (West Palace, Mid Arch, East Long)
    for (const sign of [-1, 1]) {
      // Spawn gatehouse archways leading into Mid
      wb.addArchway(0, 0, sign * 50, 9.5, 5.2, 2.8, 0, sandWall);
      // Spawn courtyard side cover walls (prevents cross-spawn sniping)
      wb.addBox(-19, 2.8, sign * 53, 14, 5.6, 1.8, sandWall, true);
      wb.addBox(19, 2.8, sign * 53, 14, 5.6, 1.8, sandWall, true);
      wb.addCrateCluster(-10, 0, sign * 62, sign * 0.25);
      wb.addCrateCluster(12, 0, sign * 61, -sign * 0.35);
      wb.addTree(-28, 0, sign * 66, 'palm');
      wb.addTree(30, 0, sign * 65, 'palm');
      // Corner rotation launch pad onto adjacent rooftops
      wb.addLaunchPad(-34, 0.05, sign * 64, {
        upSpeed: 19.5, dir: [-0.5, -sign * 0.86], horizSpeed: 9, label: 'PALACE ROOF LAUNCH'
      });
    }

    // --- WEST LANE: ENTERABLE 2-STORY "PALACE APARTMENTS" (x = -56, z = -22 to +22) ---
    // Ground floor enterable hall (doors N, S, E into Mid, plus West Alley doorway)
    wb.addBuilding(-56, 0, 0, 24, 5.8, 48, {
      wallMat: sandWall,
      roofMat: sandFloor,
      trimMat: tm.dark,
      parapetH: 0,
      doors: [
        { side: 'N', offset: 0, width: 6.0, height: 4.4 },
        { side: 'S', offset: 0, width: 6.0, height: 4.4 },
        { side: 'E', offset: -12, width: 5.2, height: 4.2 },
        { side: 'E', offset: 12, width: 5.2, height: 4.2 },
        { side: 'W', offset: 0, width: 5.4, height: 4.2 }
      ],
      windows: [
        { side: 'E', offset: 0, width: 5.0, sillH: 1.15, headH: 3.4 }
      ]
    });
    // Interior Palace columns & crate cover (height 5.1 terminates cleanly below the y = 5.1..5.8 roof slab)
    wb.addBox(-56, 2.55, -10, 2.0, 5.1, 2.0, tm.dark, true);
    wb.addBox(-56, 2.55, 10, 2.0, 5.1, 2.0, tm.dark, true);
    wb.addCrateCluster(-59, 0, 0, 0.2, 0.85);

    // 2nd Floor Palace Apartment & Balcony overlooking Mid Plaza (y = 5.8 to 11.4)
    wb.addBuilding(-58, 5.8, 0, 18, 5.6, 36, {
      wallMat: sandWall,
      roofMat: roofClay,
      trimMat: tm.dark,
      parapetH: 1.05,
      doors: [
        { side: 'N', offset: 0, width: 5.0, height: 4.0 },
        { side: 'S', offset: 0, width: 5.0, height: 4.0 },
        { side: 'E', offset: 0, width: 6.0, height: 4.0 }
      ],
      windows: [
        { side: 'E', offset: -11, width: 4.6, sillH: 1.1, headH: 3.4 },
        { side: 'E', offset: 11, width: 4.6, sillH: 1.1, headH: 3.4 }
      ]
    });
    // Exterior Palace Balcony colonnade (flush x = -43.8..-37.8 @ y = 5.8) with grounded pillars + N/S grand staircases!
    wb.addThinDeck(-40.8, 5.8, 0, 6.0, 38, sandFloor, 0.7);
    for (const pz of [-17, 0, 17]) {
      wb.addBox(-38.4, 2.55, pz, 1.1, 5.1, 1.1, sandWall, true);
    }
    wb.addBox(-38.05, 6.38, -11, 0.45, 1.15, 11, sandWall, true);
    wb.addBox(-38.05, 6.38, 11, 0.45, 1.15, 11, sandWall, true);
    wb.addStaircase(-40.8, 0, -33, -40.8, 5.8, -19, 4.8, sandFloor, { solidBase: true });
    wb.addStaircase(-40.8, 0, 33, -40.8, 5.8, 19, 4.8, sandFloor, { solidBase: true });
    // West Outer Alley (x = -76) with crouch-slide stone archways (1.18m clearance!)
    wb.addArchway(-77, 0, -14, 6.2, 1.18, 2.6, 0, sandWall);
    wb.addArchway(-77, 0, 14, 6.2, 1.18, 2.6, 0, sandWall);
    wb.addVehicle(-76, 0, 0, 0.08, { variant: 'suv', colorHex: 0x6b5c49 });

    // --- CENTER: SUNLIT MARKET SQUARE, CENTRAL FOUNTAIN, ARMORED VAN & MID WINDOW HOUSE ---
    // Central Octagonal Stone Fountain Monument (iconic Mirage/Crash centerpiece!)
    wb.addBox(0, 0.6, 0, 11, 1.2, 11, sandWall, true);
    wb.addBox(0, 2.4, 0, 3.2, 3.6, 3.2, sandWall, true);
    wb.addBox(0, 1.12, 0, 8.8, 0.2, 8.8, wb.getColorMat(0x2899b5, 0.2, 0.15), false);
    wb.addBox(0, 4.4, 0, 4.2, 0.4, 4.2, tm.accent, false);

    // Market Stalls with colorful fabric awnings (visual CoD/CS storytelling + crouch cover)
    for (const [mx, mz, col] of [[-18, -22, awningCyan], [18, 22, awningTerr], [-18, 22, awningTerr], [18, -22, awningCyan]]) {
      wb.addBox(mx, 0.62, mz, 6.4, 1.24, 2.6, sandWall, true);
      wb.addBox(mx, 3.4, mz, 6.8, 0.24, 3.4, col, false);
      wb.addBox(mx - 3.0, 2.0, mz - 1.2, 0.24, 2.8, 0.24, tm.dark, false);
      wb.addBox(mx + 3.0, 2.0, mz - 1.2, 0.24, 2.8, 0.24, tm.dark, false);
    }

    // Parked Tactical Armored Van angled in North-Mid & Cargo Truck in South-Mid
    wb.addVehicle(-11, 0, -32, 0.42, { variant: 'van', colorHex: 0x3f4e5c });
    wb.addVehicle(11, 0, 32, Math.PI + 0.42, { variant: 'van', colorHex: 0x5c4a38 });

    // Enterable "Mid Sniper House" on East edge of Market Plaza (x = 27, z = 0) — open roof parapet on S & W for stairs + skybridge!
    wb.addBuilding(27, 0, 0, 16, 6.4, 28, {
      wallMat: sandWall,
      roofMat: roofClay,
      trimMat: tm.dark,
      parapetH: 1.05,
      parapetGaps: { S: true, W: true },
      doors: [
        { side: 'N', offset: 0, width: 4.8, height: 4.2 },
        { side: 'S', offset: 0, width: 4.8, height: 4.2 },
        { side: 'E', offset: 0, width: 5.2, height: 4.2 }
      ],
      windows: [
        { side: 'W', offset: -6, width: 5.4, sillH: 1.15, headH: 3.4 },
        { side: 'W', offset: 6, width: 5.4, sillH: 1.15, headH: 3.4 }
      ]
    });
    // Overhead Stone Skybridge linking West Palace Balcony (x = -37.8) across Mid to Sniper House Roof (x = 19) at y = 6.2 with grounded stone support piers!
    wb.addThinDeck(-9.4, 6.2, -16, 56.8, 4.8, sandFloor, 0.85);
    wb.addBox(-23, 2.67, -16, 2.2, 5.35, 3.8, sandWall, true);
    wb.addBox(4, 2.67, -16, 2.2, 5.35, 3.8, sandWall, true);
    wb.addBox(-9.4, 6.75, -18.2, 52, 1.1, 0.4, sandWall, true);
    wb.addBox(-9.4, 6.75, -13.8, 18, 1.1, 0.4, sandWall, true);
    wb.addStaircase(21.2, 0, 26, 21.2, 6.4, 14, 3.8, sandFloor, { solidBase: true });

    // --- EAST LANE: CS "LONG A" BOULEVARD & SITE A PLATFORM (x = 42 to 82) ---
    // Wide open road with angled corner building so you fight for Long control instead of spawn-sniping
    wb.addBuilding(66, 0, -34, 18, 6.0, 18, {
      wallMat: sandWall,
      roofMat: roofClay,
      trimMat: tm.dark,
      parapetH: 1.0,
      doors: [
        { side: 'W', offset: 0, width: 4.8, height: 4.2 },
        { side: 'S', offset: 0, width: 4.8, height: 4.2 }
      ],
      windows: [
        { side: 'N', offset: 0, width: 4.6, sillH: 1.15, headH: 3.4 }
      ]
    });
    wb.addBuilding(66, 0, 34, 18, 6.0, 18, {
      wallMat: sandWall,
      roofMat: roofClay,
      trimMat: tm.dark,
      parapetH: 1.0,
      doors: [
        { side: 'W', offset: 0, width: 4.8, height: 4.2 },
        { side: 'N', offset: 0, width: 4.8, height: 4.2 }
      ],
      windows: [
        { side: 'S', offset: 0, width: 4.6, sillH: 1.15, headH: 3.4 }
      ]
    });

    // Raised "Site A" Platform in center of East Boulevard (x = 64, z = 0, y = 2.4)
    wb.addBox(64, 1.2, 0, 22, 2.4, 26, sandFloor, true);
    wb.addStaircase(64, 0, -20, 64, 2.4, -13, 5.2, sandFloor, { solidBase: true });
    wb.addStaircase(64, 0, 20, 64, 2.4, 13, 5.2, sandFloor, { solidBase: true });
    wb.addStaircase(46, 0, 0, 53, 2.4, 0, 5.2, sandFloor, { solidBase: true });
    wb.addCrateCluster(66, 2.4, -4, 0.3);
    wb.addCrateCluster(62, 2.4, 5, -0.4);
    wb.addJerseyBarrier(54, 2.4, -8, 4.4, 0.25);
    wb.addJerseyBarrier(54, 2.4, 8, 4.4, -0.25);

    // Armored Truck & Jersey barriers along Long A approaches
    wb.addVehicle(50, 0, -44, -0.35, { variant: 'truck', colorHex: 0x5c5342, tarpHex: 0x8a795d });
    wb.addVehicle(50, 0, 44, Math.PI - 0.35, { variant: 'truck', colorHex: 0x4b5c4d, tarpHex: 0x7b6b52 });
    wb.addJerseyBarrier(44, 0, -18, 4.6, 0.2);
    wb.addJerseyBarrier(44, 0, 18, 4.6, -0.2);

    // Wallrun Sandstone Panels along the East Outer Wall (fast flank over Site A!)
    wb.addWallrunPanel(86, 5.2, 0, 42, 6.2, 0);
    wb.addTree(44, 0, -56, 'palm');
    wb.addTree(44, 0, 56, 'palm');
    for (const lz of [-42, 0, 42]) {
      wb.addStreetLamp(40, 0, lz, Math.PI * 0.5, 7.2);
    }

    // Distant Desert Citadel Towers, Domes & Rolling Mesas (non-colliding AAA horizon)
    wb.addCanyonMesa(-165, -2, -110, 54, 46, 48);
    wb.addCanyonMesa(170, -2, -120, 60, 54, 52);
    wb.addCanyonMesa(-175, -2, 115, 58, 44, 50);
    wb.addCanyonMesa(165, -2, 125, 52, 48, 48);
    for (const [tx, tz, th] of [[-125, -45, 34], [128, -50, 38], [-128, 55, 32], [125, 48, 40], [0, -130, 42], [0, 130, 36]]) {
      wb.addBox(tx, th * 0.5, tz, 14, th, 14, sandWall, false);
      wb.addBox(tx, th + 1.5, tz, 16, 2.2, 16, roofClay, false);
    }

    const spawns = [
      { x: 0, y: 0.05, z: -69, yaw: Math.PI },
      { x: 0, y: 0.05, z: 69, yaw: 0 },
      { x: -48, y: 0.05, z: -66, yaw: Math.PI - 0.25 },
      { x: 48, y: 0.05, z: 66, yaw: -0.25 },
      { x: 64, y: 0.05, z: -64, yaw: Math.PI + 0.2 },
      { x: -64, y: 0.05, z: 64, yaw: 0.2 },
      { x: -77, y: 0.05, z: -32, yaw: -Math.PI * 0.45 },
      { x: 81, y: 0.05, z: 20, yaw: Math.PI * 0.55 }
    ];

    return {
      id: 'arena_aim',
      theme: 'sandstone',
      isArena: true,
      course: null,
      bound: 140,
      killY: -14,
      voidHazard: false,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-88, 34, -84], [84, 30, -68], [88, 34, 82], [-84, 28, 74]
      ]
    };
  }

  // ===================================================================
  // 3. ARENA 03 — HELIX SPIRE (CS Vertigo / Angel City 3-Tier Skyscraper Deck)
  //    166m x 166m · Huge open 3-story construction decks (ZERO cramped shafts!)
  // ===================================================================
  function buildArenaSpire(opts) {
    const wb = makeBuilder(opts, 'kitsune');
    const tm = wb.mats;
    const concFloor = wb.getArchMat('concrete_floor');
    const concWall = wb.getArchMat('concrete_wall');
    const steelDeck = wb.getArchMat('steel_deck');
    const glassMat = wb.getArchMat('glass_dark');

    // --- FLOOR 1 (LOWER CONSTRUCTION DECK, y = 0, massive 136m x 136m ring around 34m open atrium) ---
    wb.addDeck(0, 0, -49, 136, 38, concFloor);
    wb.addDeck(0, 0, 49, 136, 38, concFloor);
    wb.addDeck(-49, 0, 0, 38, 60, concFloor);
    wb.addDeck(49, 0, 0, 38, 60, concFloor);
    // Cross steel girders spanning the central 34m atrium at y = 0 (split cleanly so ZERO coplanar overlap!)
    wb.addDeck(0, 0, 0, 14, 14, steelDeck);
    wb.addDeck(0, 0, -18.5, 14, 23, steelDeck);
    wb.addDeck(0, 0, 18.5, 14, 23, steelDeck);
    wb.addDeck(-18.5, 0, 0, 23, 14, steelDeck);
    wb.addDeck(18.5, 0, 0, 23, 14, steelDeck);

    // Enterable North & South Construction Site Offices on Floor 1
    for (const sign of [-1, 1]) {
      wb.addBuilding(0, 0, sign * 52, 32, 5.6, 16, {
        wallMat: concWall,
        roofMat: steelDeck,
        trimMat: tm.dark,
        parapetH: 1.0,
        accentStrip: true,
        doors: [
          { side: sign < 0 ? 'S' : 'N', offset: -8, width: 5.0, height: 4.2 },
          { side: sign < 0 ? 'S' : 'N', offset: 8, width: 5.0, height: 4.2 },
          { side: 'W', offset: 0, width: 5.0, height: 4.2 },
          { side: 'E', offset: 0, width: 5.0, height: 4.2 }
        ],
        windows: [
          { side: sign < 0 ? 'S' : 'N', offset: 0, width: 6.4, sillH: 1.15, headH: 3.4 }
        ]
      });
      wb.addVehicle(-34, 0, sign * 50, sign > 0 ? 0.3 : Math.PI - 0.3, { variant: 'truck', colorHex: 0x3b4859 });
      wb.addCrateCluster(34, 0, sign * 50, sign * 0.4);
      wb.addJerseyBarrier(0, 0, sign * 24, 6.2, 0);
    }

    // 4 Corner Updraft Launch Vents (Floor 1 -> Floor 2/3)
    for (const [vx, vz] of [[-56, -56], [56, -56], [-56, 56], [56, 56]]) {
      wb.addLaunchPad(vx, 0.05, vz, { variant: 'vent', upSpeed: 23.5, label: 'ATRIUM UPDRAFT' });
    }

    // Wide Grand Staircases Floor 1 (y = 0) -> Floor 2 (y = 11) inside open atrium edges
    wb.addStaircase(-31, 0, -7, -31, 11, -34, 5.2, steelDeck);
    wb.addStaircase(31, 0, 7, 31, 11, 34, 5.2, steelDeck);

    // --- FLOOR 2 (MEZZANINE SKY-DECK, y = 11, spacious 124m x 124m perimeter ring) ---
    wb.addDeck(0, 11, -46, 124, 24, concFloor);
    wb.addDeck(0, 11, 46, 124, 24, concFloor);
    wb.addDeck(-46, 11, 0, 24, 68, concFloor);
    wb.addDeck(46, 11, 0, 24, 68, concFloor);
    // Glowing balcony edge rails
    for (const sign of [-1, 1]) {
      wb.addBox(0, 11.12, sign * 34.2, 68, 0.24, 0.38, tm.accent, false);
      wb.addBox(sign * 34.2, 11.12, 0, 0.38, 0.24, 68, tm.lip, false);
    }

    // Enterable East & West Glass Sky-Lounges on Floor 2 (shooting windows overlooking the atrium!)
    for (const sx of [-1, 1]) {
      wb.addBuilding(sx * 47, 11, 0, 18, 5.8, 30, {
        wallMat: concWall,
        roofMat: steelDeck,
        trimMat: tm.dark,
        parapetH: 0.9,
        accentStrip: true,
        doors: [
          { side: 'N', offset: 0, width: 5.0, height: 4.2 },
          { side: 'S', offset: 0, width: 5.0, height: 4.2 },
          { side: sx < 0 ? 'E' : 'W', offset: -8, width: 4.6, height: 4.0 },
          { side: sx < 0 ? 'E' : 'W', offset: 8, width: 4.6, height: 4.0 }
        ],
        windows: [
          { side: sx < 0 ? 'E' : 'W', offset: 0, width: 7.0, sillH: 1.1, headH: 3.5 }
        ]
      });
      wb.addJerseyBarrier(sx * 24, 11, -44, 5.2, 0.3);
      wb.addJerseyBarrier(sx * 24, 11, 44, 5.2, -0.3);
    }
    // Exterior Wallrun Glass Billboards wrapping Floor 2 outer faces
    wb.addWallrunPanel(-65, 16, 0, 44, 7.5, 0);
    wb.addWallrunPanel(65, 16, 0, 44, 7.5, 0);
    wb.addWallrunPanel(0, 16, -65, 44, 7.5, Math.PI * 0.5);
    wb.addWallrunPanel(0, 16, 65, 44, 7.5, Math.PI * 0.5);

    // Wide Grand Staircases Floor 2 (y = 11) -> Floor 3 (y = 22) in open atrium airspace
    wb.addStaircase(34, 11, -32, 12, 22, -32, 5.0, steelDeck);
    wb.addStaircase(-34, 11, 32, -12, 22, 32, 5.0, steelDeck);

    // --- FLOOR 3 (UPPER CRANE DECK, y = 22) + APEX HELIPAD CROWN (y = 31) ---
    wb.addDeck(0, 22, -45, 98, 20, steelDeck);
    wb.addDeck(0, 22, 45, 98, 20, steelDeck);
    wb.addDeck(-40, 22, 0, 18, 70, steelDeck);
    wb.addDeck(40, 22, 0, 18, 70, steelDeck);
    // Landing lips linking Floor 2->3 stairs cleanly to Floor 3 deck (flush at z = ±35, zero overlap!)
    wb.addDeck(11, 22, -33.25, 6.5, 3.5, steelDeck);
    wb.addDeck(-11, 22, 33.25, 6.5, 3.5, steelDeck);
    // Cover on Floor 3
    for (const [cx, cz] of [[-20, -44], [20, -44], [-20, 44], [20, 44]]) {
      wb.addCrateCluster(cx, 22, cz, 0.35);
    }
    wb.addJerseyBarrier(-38, 22, 0, 6.0, Math.PI * 0.5);
    wb.addJerseyBarrier(38, 22, 0, 6.0, Math.PI * 0.5);

    // 4 Massive Structural Grapple Pylons framing the central 34m atrium (y = -8 to +36)
    for (const [px, pz] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
      wb.addBox(px, 14, pz, 4.2, 44, 4.2, tm.dark, true);
      wb.addBox(px, 14, pz, 4.5, 0.45, 4.5, tm.accent, false);
      wb.addBox(px, 26, pz, 4.5, 0.45, 4.5, tm.lip, false);
    }

    // APEX HELIPAD CROWN (y = 31, linked by elevated skybridges from Floor 3 & portals from Floor 1!)
    wb.addHelipad(0, 31, 0, 14);
    wb.addStaircase(0, 22, -35, 0, 31, -13.5, 5.2, steelDeck);
    wb.addStaircase(0, 22, 35, 0, 31, 13.5, 5.2, steelDeck);
    wb.addJerseyBarrier(-7, 31, 0, 4.6, Math.PI * 0.5);
    wb.addJerseyBarrier(7, 31, 0, 4.6, Math.PI * 0.5);

    // Paired Lower Deck <-> Apex Crown Flank Portals
    wb.addStageTeleporter([-32, 0, 0], [5.4, 4.8, 2.4], [0, 31.4, -9], 0, {
      yaw: Math.PI * 0.5, ringHex: 0x52f4ff, preserveSpeed: true, maxSpeed: 20, cooldown: 1.25, label: 'APEX TELEPORTER'
    });
    wb.addStageTeleporter([0, 31, -11], [5.4, 4.8, 2.4], [-38, 0.5, 0], -Math.PI * 0.5, {
      yaw: 0, ringHex: 0x52f4ff, preserveSpeed: true, maxSpeed: 20, cooldown: 1.25, label: 'LOWER DECK PORTAL'
    });
    wb.addStageTeleporter([32, 0, 0], [5.4, 4.8, 2.4], [0, 31.4, 9], Math.PI, {
      yaw: Math.PI * 0.5, ringHex: 0xff4788, preserveSpeed: true, maxSpeed: 20, cooldown: 1.25, label: 'APEX TELEPORTER'
    });
    wb.addStageTeleporter([0, 31, 11], [5.4, 4.8, 2.4], [38, 0.5, 0], Math.PI * 0.5, {
      yaw: 0, ringHex: 0xff4788, preserveSpeed: true, maxSpeed: 20, cooldown: 1.25, label: 'LOWER DECK PORTAL'
    });

    // Dramatic Neon Metropolis Skyscraper Ring (non-colliding horizon vista)
    const city = [
      [-150, -130, 34, 150, 34], [150, -130, 36, 165, 36], [-155, 130, 38, 145, 34], [155, 130, 34, 160, 38],
      [-185, 0, 36, 180, 48], [185, 0, 36, 175, 48], [0, -185, 52, 170, 34], [0, 185, 52, 165, 34],
      [-125, -180, 28, 120, 28], [125, -180, 30, 135, 30], [-125, 180, 30, 130, 30], [125, 180, 28, 125, 28]
    ];
    for (let i = 0; i < city.length; i++) {
      const [bx, bz, bw, bh, bd] = city[i];
      wb.addSkyscraperBackdrop(bx, -68, bz, bw, bh, bd, i % 2 === 0 ? tm.accent : tm.lip);
    }
    // Giant neon crown beacon above Apex
    wb.addNeonFrame(0, 46, 0, 42, 12, 0);
    wb.addNeonFrame(0, 46, 0, 42, 12, Math.PI * 0.5);

    const spawns = [
      { x: 0, y: 0.05, z: -52, yaw: Math.PI },
      { x: 0, y: 0.05, z: 52, yaw: 0 },
      { x: -56, y: 11.05, z: -48, yaw: Math.PI - 0.5 },
      { x: 56, y: 11.05, z: 48, yaw: -0.5 },
      { x: 52, y: 0.05, z: -52, yaw: Math.PI + 0.5 },
      { x: -52, y: 0.05, z: 52, yaw: 0.5 },
      { x: -40, y: 22.05, z: -42, yaw: Math.PI - 0.6 },
      { x: 40, y: 22.05, z: 42, yaw: -0.6 }
    ];

    return {
      id: 'arena_spire',
      theme: 'kitsune',
      isArena: true,
      course: null,
      bound: 135,
      killY: -28,
      voidHazard: true,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-102, 52, -96], [98, 44, -84], [102, 50, 94], [-96, 36, 86]
      ]
    };
  }

  // ===================================================================
  // 4. ARENA 04 — CARGO KILLHOUSE (CoD Hackney Yard / CS Nuke Harbor Depot)
  //    174m x 154m · Enterable 2-Story Warehouse + Spacious Container Yard + Dock Apron
  // ===================================================================
  function buildArenaCargo(opts) {
    const wb = makeBuilder(opts, 'industrial');
    const tm = wb.mats;
    const asphalt = wb.getArchMat('asphalt');
    const concFloor = wb.getArchMat('concrete_floor');
    const concWall = wb.getArchMat('concrete_wall');
    const steelDeck = wb.getArchMat('steel_deck');

    // Expansive Harbor Asphalt Yard + Outer Pier & Harbor Ocean (no cramped walls!)
    wb.addDeck(0, 0, 0, 174, 154, asphalt);
    wb.addBox(0, -1.8, 0, 560, 1.0, 560, wb.getColorMat(0x102233, 0.28, 0.45), false);
    wb.addBox(-110, -0.5, 0, 80, 1.4, 340, concFloor, false);

    // Perimeter Harbor Concrete Seawall & Industrial Security Walls
    wb.addBox(0, 4.8, -78, 178, 9.6, 2.4, concWall, true);
    wb.addBox(0, 4.8, 78, 178, 9.6, 2.4, concWall, true);
    wb.addBox(-88, 5.2, 0, 2.4, 10.4, 158, concWall, true);
    wb.addBox(88, 4.2, 0, 2.4, 8.4, 158, concWall, true);

    // --- NORTH TRUCK GATE (z = -64) & SOUTH CUSTOMS GATE (z = +64) ---
    for (const sign of [-1, 1]) {
      // Security Gatehouse Screening + Parked Semi Trucks
      wb.addVehicle(-18, 0, sign * 58, sign > 0 ? 0.15 : Math.PI - 0.15, { variant: 'truck', colorHex: 0x3a4d5c, tarpHex: 0x5c6873 });
      wb.addVehicle(22, 0, sign * 56, sign > 0 ? -0.22 : Math.PI + 0.22, { variant: 'truck', colorHex: 0x7a4232, tarpHex: 0x8f7e63 });
      wb.addJerseyBarrier(0, 0, sign * 52, 7.2, 0);
      wb.addCrateCluster(0, 0, sign * 62, sign * 0.2);
      wb.addStreetLamp(-26, 0, sign * 66, 0, 8.5);
      wb.addStreetLamp(26, 0, sign * 66, Math.PI, 8.5);
    }

    // --- WEST LANE: HUGE ENTERABLE 2-STORY LOGISTICS WAREHOUSE (x = -56, z = -34 to +34) ---
    wb.addBox(-56, 0.03, 0, 32, 0.06, 70, concFloor, false);
    wb.addBuilding(-56, 0, 0, 32, 11.4, 68, {
      wallMat: concWall,
      roofMat: steelDeck,
      trimMat: tm.dark,
      parapetH: 1.0,
      accentStrip: true,
      doors: [
        { side: 'N', offset: 0, width: 8.0, height: 5.0 },
        { side: 'S', offset: 0, width: 8.0, height: 5.0 },
        { side: 'E', offset: -18, width: 7.4, height: 4.8 },
        { side: 'E', offset: 0, width: 6.6, height: 9.8 },
        { side: 'E', offset: 18, width: 7.4, height: 4.8 },
        { side: 'W', offset: 0, width: 6.0, height: 4.6 }
      ],
      windows: [
        { side: 'E', offset: -10, width: 6.0, sillH: 6.8, headH: 9.4 },
        { side: 'E', offset: 10, width: 6.0, sillH: 6.8, headH: 9.4 }
      ]
    });
    // Interior Warehouse 2nd-Floor Overlook Office Mezzanine (flush y = 5.8 matching Gantry Catwalk!) + steel support columns + twin staircases
    wb.addThinDeck(-50.5, 5.8, 0, 21, 34, steelDeck, 0.65);
    wb.addBox(-60.3, 2.57, -15.5, 0.85, 5.15, 0.85, tm.dark, true);
    wb.addBox(-60.3, 2.57, 15.5, 0.85, 5.15, 0.85, tm.dark, true);
    wb.addBox(-60.8, 6.38, -9, 0.45, 1.15, 12, tm.dark, true);
    wb.addBox(-60.8, 6.38, 9, 0.45, 1.15, 12, tm.dark, true);
    wb.addStaircase(-54, 0, -28, -54, 5.8, -17, 4.6, steelDeck);
    wb.addStaircase(-54, 0, 28, -54, 5.8, 17, 4.6, steelDeck);
    // Warehouse interior tactical cargo cover + jacked slide-under container (cleanly in West aisle at x = -66, zero overlap with mezzanine!)
    wb.addContainer(-66, 1.18, 0, 4.0, 3.2, 11.0, 0xc7522a, { stripeHex: 0xffd166, supports: true });
    wb.addCrateCluster(-49, 0, -24, 0.3);
    wb.addCrateCluster(-49, 0, 24, -0.3);

    // --- CENTER: SPACIOUS MULTI-LANE SHIPPING CONTAINER YARD (x = -30 to +34) ---
    // Wide 10m–14m driving aisles between angled containers + elevated Gantry Catwalk @ flush y = 5.8!
    // Center Jacked Slide-Under Freight Containers (1.18m clearance!)
    wb.addContainer(0, 1.18, -14, 4.0, 3.3, 12.0, 0x26547c, { stripeHex: 0x4ae6ff, supports: true });
    wb.addContainer(0, 1.18, 14, 4.0, 3.3, 12.0, 0xbf4c28, { stripeHex: 0xffa640, supports: true });
    // Angled Flanking Containers creating dynamic CoD Shoot House sightline breaks
    wb.addContainer(-19, 0, -26, 4.0, 3.6, 12.5, 0x3b6e52, { stripeHex: 0xd9e8d2 });
    wb.addContainer(19, 0, -26, 4.0, 3.6, 12.5, 0xc77d24, { stripeHex: 0xfff0cc });
    wb.addContainer(-19, 0, 26, 4.0, 3.6, 12.5, 0x2c5e78, { stripeHex: 0x7ef2ff });
    wb.addContainer(19, 0, 26, 4.0, 3.6, 12.5, 0x9e3b33, { stripeHex: 0xffcc99 });
    // Stacked upper containers for dramatic silhouette & roof plays
    wb.addContainer(-19, 3.6, -26, 4.0, 3.4, 12.5, 0x2b455e, { stripeHex: 0x4ae6ff });
    wb.addContainer(19, 3.6, 26, 4.0, 3.4, 12.5, 0x7d3b2c, { stripeHex: 0xffb347 });

    // Central Yard Cover (Forklift/Crate stacks + Jersey Barriers)
    wb.addCrateCluster(-16, 0, 0, 0.25);
    wb.addCrateCluster(16, 0, 0, -0.25);
    wb.addJerseyBarrier(-10, 0, -38, 4.8, 0.35);
    wb.addJerseyBarrier(10, 0, 38, 4.8, 0.35);

    // Overhead Steel Gantry Catwalk spanning East <-> West across the yard (flush x = -40..48.8 @ y = 5.8 between Warehouse Mezzanine and Harbor Control Roof!)
    wb.addThinDeck(4.4, 5.8, 0, 88.8, 6.4, steelDeck, 0.65);
    wb.addBox(4.4, 6.35, -3.0, 76, 1.1, 0.35, tm.dark, true);
    wb.addBox(4.4, 6.35, 3.0, 76, 1.1, 0.35, tm.dark, true);
    // Grounded gantry support columns (clear of driving lanes & containers)
    for (const gx of [-11, 24]) {
      wb.addBox(gx, 2.57, -2.8, 0.85, 5.15, 0.85, tm.dark, true);
      wb.addBox(gx, 2.57, 2.8, 0.85, 5.15, 0.85, tm.dark, true);
    }
    wb.addStaircase(-29, 0, -18, -29, 5.8, -3.2, 4.2, steelDeck);
    wb.addStaircase(29, 0, 18, 29, 5.8, 3.2, 4.2, steelDeck);

    // --- EAST LANE: OPEN HARBOR DOCK APRON & CRANE PLATFORM (x = +38 to +82) ---
    wb.addBox(62, 0.03, 0, 42, 0.06, 128, concFloor, false);
    // Enterable Harbor Control Shack (x = 58, z = 0, roof flush at y = 5.8 with open West parapet for Gantry entry!)
    wb.addBuilding(58, 0, 0, 18, 5.8, 22, {
      wallMat: concWall,
      roofMat: steelDeck,
      trimMat: tm.dark,
      parapetH: 1.0,
      parapetGaps: { W: true },
      doors: [
        { side: 'N', offset: 0, width: 4.8, height: 4.2 },
        { side: 'S', offset: 0, width: 4.8, height: 4.2 },
        { side: 'W', offset: 0, width: 5.0, height: 4.2 }
      ],
      windows: [
        { side: 'E', offset: 0, width: 5.5, sillH: 1.15, headH: 3.4 }
      ]
    });
    // Dockside Container Cover + Parked Cargo Van + Wallrun Seawall Panels
    wb.addContainer(58, 0, -36, 4.0, 3.6, 12.5, 0x26547c, { stripeHex: 0x4ae6ff });
    wb.addContainer(58, 0, 36, 4.0, 3.6, 12.5, 0xbf4c28, { stripeHex: 0xffa640 });
    wb.addVehicle(72, 0, -18, 0.12, { variant: 'van', colorHex: 0x485c6b });
    wb.addVehicle(72, 0, 18, Math.PI - 0.12, { variant: 'van', colorHex: 0x6b5642 });
    wb.addWallrunPanel(85, 4.4, -28, 34, 6.0, 0);
    wb.addWallrunPanel(85, 4.4, 28, 34, 6.0, 0);

    // Corner Industrial Launch Pads up to Warehouse Roof / Gantry Catwalks
    wb.addLaunchPad(-32, 0.05, -48, { upSpeed: 20, label: 'WAREHOUSE LAUNCH' });
    wb.addLaunchPad(-32, 0.05, 48, { upSpeed: 20, label: 'WAREHOUSE LAUNCH' });
    wb.addLaunchPad(46, 0.05, -48, { upSpeed: 18.5, label: 'GANTRY LAUNCH' });
    wb.addLaunchPad(46, 0.05, 48, { upSpeed: 18.5, label: 'GANTRY LAUNCH' });

    // Giant Shipyard Harbor Gantry Cranes & Floodlight Towers (non-colliding AAA harbor silhouette)
    for (const cz of [-44, 44]) {
      wb.addBox(108, 20, cz - 10, 3.2, 40, 3.2, wb.getColorMat(0xb85228, 0.65, 0.4), false);
      wb.addBox(108, 20, cz + 10, 3.2, 40, 3.2, wb.getColorMat(0xb85228, 0.65, 0.4), false);
      wb.addBox(98, 38, cz, 56, 3.6, 4.4, wb.getColorMat(0xc9622e, 0.62, 0.42), false);
      wb.addBox(108, 41, cz, 4, 2.2, 24, tm.accent, false);
    }
    // Dockside floodlight poles placed cleanly beside (never piercing!) the Gantry Catwalk
    for (const lz of [-36, -16, 16, 36]) {
      wb.addStreetLamp(36, 0, lz, -Math.PI * 0.5, 9.0);
    }
    // Distant Industrial Warehouses & Harbor Freighter silhouette
    wb.addSkyscraperBackdrop(-145, 0, -65, 40, 26, 56, tm.accent);
    wb.addSkyscraperBackdrop(-145, 0, 65, 42, 32, 52, tm.lip);
    wb.addBox(175, 4, 0, 36, 12, 130, wb.getColorMat(0x2d3a47, 0.72, 0.35), false);
    wb.addBox(175, 13, 0, 24, 9, 80, wb.getColorMat(0x8c3b2b, 0.75, 0.25), false);

    const spawns = [
      { x: 0, y: 0.05, z: -70, yaw: Math.PI },
      { x: 0, y: 0.05, z: 70, yaw: 0 },
      { x: -56, y: 0.05, z: -60, yaw: Math.PI - 0.15 },
      { x: 56, y: 0.05, z: 60, yaw: -0.15 },
      { x: 64, y: 0.05, z: -62, yaw: Math.PI + 0.2 },
      { x: -64, y: 0.05, z: 62, yaw: 0.2 },
      { x: -56, y: 5.85, z: 0, yaw: -Math.PI * 0.5 },
      { x: 74, y: 0.05, z: 0, yaw: Math.PI * 0.5 }
    ];

    return {
      id: 'arena_cargo',
      theme: 'industrial',
      isArena: true,
      course: null,
      bound: 138,
      killY: -14,
      voidHazard: false,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-92, 34, -84], [88, 30, -72], [92, 34, 82], [-88, 28, 76]
      ]
    };
  }

  // ===================================================================
  // 5. ARENA 05 — SKYLINE RUN (MW2 Highrise Corporate Rooftop Complex)
  //    196m x 162m · Twin 2-Story Enterable Office Towers + Helipad + Maintenance Tunnel
  // ===================================================================
  function buildArenaSkyline(opts) {
    const wb = makeBuilder(opts, 'boreas');
    const tm = wb.mats;
    const concFloor = wb.getArchMat('concrete_floor');
    const concWall = wb.getArchMat('concrete_wall');
    const glassMat = wb.getArchMat('glass_dark');
    const steelDeck = wb.getArchMat('steel_deck');

    // Main Central Skyscraper Rooftop Slab (104m x 154m @ y = 0)
    wb.addDeck(0, 0, 0, 104, 154, concFloor);
    wb.addBox(-52, 0.12, 0, 0.5, 0.25, 154, tm.accent, false);
    wb.addBox(52, 0.12, 0, 0.5, 0.25, 154, tm.accent, false);

    // --- NORTH EXECUTIVE TOWER (z = -60) & SOUTH MEDIA TOWER (z = +60) ---
    // Iconic MW2 Highrise dual 2-story enterable corporate lobbies with glass windows & rooftop penthouses!
    for (const sign of [-1, 1]) {
      // Ground-floor Corporate Lobby (48m x 22m, 3 exits onto the rooftop plaza)
      wb.addBuilding(0, 0, sign * 60, 48, 6.0, 22, {
        wallMat: concWall,
        roofMat: concFloor,
        trimMat: tm.dark,
        parapetH: 0,
        accentStrip: true,
        doors: [
          { side: sign < 0 ? 'S' : 'N', offset: -15, width: 6.0, height: 4.4 },
          { side: sign < 0 ? 'S' : 'N', offset: 0, width: 7.2, height: 4.5 },
          { side: sign < 0 ? 'S' : 'N', offset: 15, width: 6.0, height: 4.4 },
          { side: 'W', offset: 0, width: 5.4, height: 4.2 },
          { side: 'E', offset: 0, width: 5.4, height: 4.2 }
        ],
        windows: [
          { side: sign < 0 ? 'S' : 'N', offset: -7.5, width: 4.4, sillH: 1.15, headH: 3.6 },
          { side: sign < 0 ? 'S' : 'N', offset: 7.5, width: 4.4, sillH: 1.15, headH: 3.6 }
        ]
      });
      // Interior reception desk & marble columns (height 5.3 terminates cleanly below the y = 5.3..6.0 roof slab)
      wb.addBox(0, 0.62, sign * 58, 9.0, 1.24, 2.2, tm.dark, true);
      wb.addBox(-11, 2.65, sign * 60, 1.8, 5.3, 1.8, tm.dark, true);
      wb.addBox(11, 2.65, sign * 60, 1.8, 5.3, 1.8, tm.dark, true);

      // 2nd Floor Executive Suite & Sniper Overlook Windows (y = 6.0 to 12.0)
      wb.addBuilding(0, 6.0, sign * 62, 34, 6.0, 16, {
        wallMat: glassMat,
        roofMat: concFloor,
        trimMat: tm.dark,
        parapetH: 1.05,
        accentStrip: true,
        doors: [
          { side: 'W', offset: 0, width: 5.0, height: 4.0 },
          { side: 'E', offset: 0, width: 5.0, height: 4.0 }
        ],
        windows: [
          { side: sign < 0 ? 'S' : 'N', offset: -9, width: 6.8, sillH: 1.1, headH: 3.6 },
          { side: sign < 0 ? 'S' : 'N', offset: 9, width: 6.8, sillH: 1.1, headH: 3.6 }
        ]
      });
      // Wide Exterior Staircases from Plaza -> 2nd Floor Terrace (clear of ground lobby doors)
      wb.addStaircase(-21, 0, sign * 38, -21, 6.0, sign * 49, 4.4, steelDeck);
      wb.addStaircase(21, 0, sign * 38, 21, 6.0, sign * 49, 4.4, steelDeck);
      // Rooftop terrace guard cover
      wb.addJerseyBarrier(-12, 6.0, sign * 50, 4.8, 0);
      wb.addJerseyBarrier(12, 6.0, sign * 50, 4.8, 0);
    }

    // --- CENTRAL HELIPAD PLAZA & HIGHRISE-STYLE UNDERPASS TUNNEL ---
    // Raised Central Helipad (y = 3.2, 24m x 24m) with 4 broad access staircases!
    wb.addHelipad(0, 3.2, 0, 13.5);
    wb.addStaircase(0, 0, -21, 0, 3.2, -12.2, 6.4, steelDeck);
    wb.addStaircase(0, 0, 21, 0, 3.2, 12.2, 6.4, steelDeck);
    wb.addStaircase(-21, 0, 0, -12.2, 3.2, 0, 6.4, steelDeck);
    wb.addStaircase(21, 0, 0, 12.2, 3.2, 0, 6.4, steelDeck);
    // Helipad tactical cover crates & barriers (prevents pure laser sightlines across Mid!)
    wb.addCrateCluster(-6.5, 3.2, -6.5, 0.4, 0.95);
    wb.addCrateCluster(6.5, 3.2, 6.5, -0.4, 0.95);
    wb.addJerseyBarrier(6.5, 3.2, -6.5, 4.6, 0.78);
    wb.addJerseyBarrier(-6.5, 3.2, 6.5, 4.6, 0.78);

    // Plaza Rooftop Mechanical HVAC Units, Skylight Structures & Armored Cover
    for (const [hx, hz] of [[-28, -28], [28, -28], [-28, 28], [28, 28]]) {
      wb.addBox(hx, 1.8, hz, 8.5, 3.6, 6.2, tm.dark, true);
      wb.addBox(hx, 3.8, hz, 7.6, 0.35, 5.4, steelDeck, false);
      wb.addRing(hx - 2, 4.02, hz, 1.4, 0x7ef2ff).rotation.x = Math.PI * 0.5;
      wb.addRing(hx + 2, 4.02, hz, 1.4, 0x7ef2ff).rotation.x = Math.PI * 0.5;
    }
    // Side rooftop utility vans / equipment trailers
    wb.addVehicle(-36, 0, 0, 0.12, { variant: 'van', colorHex: 0x3b5972 });
    wb.addVehicle(36, 0, 0, Math.PI - 0.12, { variant: 'van', colorHex: 0x526a7d });
    wb.addJerseyBarrier(-18, 0, -34, 5.2, 0.25);
    wb.addJerseyBarrier(18, 0, 34, 5.2, 0.25);
    wb.addCrateCluster(18, 0, -34, -0.3);
    wb.addCrateCluster(-18, 0, 34, 0.3);

    // --- WEST & EAST SKY-CHASM FLANK LANES (x = ±56 to ±84 over Void Chasm!) ---
    for (const sx of [-1, 1]) {
      // Suspended Construction Catwalk Platforms jutting out over the abyss
      wb.addDeck(sx * 64, 0, -44, 24, 20, steelDeck);
      wb.addDeck(sx * 64, 0, 44, 24, 20, steelDeck);
      // Giant floating Wallrun Skyscraper Billboards spanning the chasm gap (clean 4m center jump-reset gap)!
      wb.addWallrunPanel(sx * 76, 4.8, -15, 26, 7.4, 0);
      wb.addWallrunPanel(sx * 76, 4.8, 15, 26, 7.4, 0);
      // Mid-chasm suspended crane girder bridge (flush z = -34..34, zero overlap with ±44 platforms!)
      wb.addDeck(sx * 64, 0, 0, 8.5, 68, steelDeck);
      wb.addBox(sx * 64, 1.2, 0, 5.2, 2.4, 4.2, tm.dark, true);
      // Corner Launch Pads up onto Tower 2nd-floor roofs
      wb.addLaunchPad(sx * 64, 0.05, -48, { upSpeed: 20.5, label: 'ROOFTOP LAUNCH' });
      wb.addLaunchPad(sx * 64, 0.05, 48, { upSpeed: 20.5, label: 'ROOFTOP LAUNCH' });
    }
    // Dual Turbo Boost-Ring Skyways blasting players across the outer skyline gaps
    wb.addBoostRing([-64, 7.5, -24], [0, 0.10, 1], { radius: 5.8, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'WEST TURBO SKYWAY' });
    wb.addBoostRing([-64, 7.5, 24], [0, 0.10, -1], { radius: 5.8, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'WEST TURBO SKYWAY' });
    wb.addBoostRing([64, 7.5, 24], [0, 0.10, -1], { radius: 5.8, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'EAST TURBO SKYWAY' });
    wb.addBoostRing([64, 7.5, -24], [0, 0.10, 1], { radius: 5.8, speedBoost: 24, minSpeed: 30, upBoost: 5, label: 'EAST TURBO SKYWAY' });

    // Paired Opposite Rooftop Corner Flank Portals (Cyan & Amber)
    wb.addStageTeleporter([-45, 0, -68], [5.6, 4.8, 2.4], [42, 0.5, 64], Math.PI * 0.25, {
      yaw: 0.4, ringHex: 0x7ef2ff, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'ROOF PORTAL · CYAN'
    });
    wb.addStageTeleporter([45, 0, 68], [5.6, 4.8, 2.4], [-42, 0.5, -64], -Math.PI * 0.75, {
      yaw: 0.4, ringHex: 0x7ef2ff, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'ROOF PORTAL · CYAN'
    });
    wb.addStageTeleporter([45, 0, -68], [5.6, 4.8, 2.4], [-42, 0.5, 64], -Math.PI * 0.25, {
      yaw: -0.4, ringHex: 0xffad60, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'ROOF PORTAL · AMBER'
    });
    wb.addStageTeleporter([-45, 0, 68], [5.6, 4.8, 2.4], [42, 0.5, -64], Math.PI * 0.75, {
      yaw: -0.4, ringHex: 0xffad60, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'ROOF PORTAL · AMBER'
    });

    // Massive Twilight Skyline Backdrop (20+ surrounding skyscrapers descending into the mist!)
    const skyline = [
      [-150, -110, 36, 155, 36], [150, -110, 38, 170, 34], [-155, 115, 36, 150, 38], [155, 115, 34, 165, 36],
      [-160, 0, 40, 185, 48], [160, 0, 40, 175, 48], [0, -165, 58, 165, 34], [0, 165, 58, 160, 34],
      [-105, -155, 30, 130, 30], [105, -155, 30, 145, 30], [-105, 155, 30, 140, 30], [105, 155, 30, 135, 30],
      [-215, -60, 44, 210, 44], [215, 60, 44, 200, 44]
    ];
    for (let i = 0; i < skyline.length; i++) {
      const [bx, bz, bw, bh, bd] = skyline[i];
      wb.addSkyscraperBackdrop(bx, -82, bz, bw, bh, bd, i % 2 === 0 ? tm.accent : tm.lip);
    }

    const spawns = [
      { x: 0, y: 0.05, z: -66, yaw: Math.PI },
      { x: 0, y: 0.05, z: 66, yaw: 0 },
      { x: -38, y: 0.05, z: -60, yaw: Math.PI - 0.25 },
      { x: 38, y: 0.05, z: 60, yaw: -0.25 },
      { x: 38, y: 0.05, z: -60, yaw: Math.PI + 0.25 },
      { x: -38, y: 0.05, z: 60, yaw: 0.25 },
      { x: -64, y: 0.05, z: -40, yaw: Math.PI },
      { x: 64, y: 0.05, z: 40, yaw: 0 }
    ];

    return {
      id: 'arena_skyline',
      theme: 'boreas',
      isArena: true,
      course: null,
      bound: 145,
      killY: -28,
      voidHazard: true,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-106, 42, -96], [102, 34, -76], [106, 40, 92], [-102, 30, 82]
      ]
    };
  }

  // ===================================================================
  // 6. ARENA 06 — REDROCK CANYON (CoD Afghan / Quarry Desert Gorge & Outpost)
  //    212m x 180m · Twin Outpost Bunkers, Sunken Gorge, Highway Bridge, Surf Cliff & Mine Tunnels
  // ===================================================================
  function buildArenaCanyon(opts) {
    const wb = makeBuilder(opts, 'sunset');
    const tm = wb.mats;
    const redrock = wb.getArchMat('redrock');
    const canyonFloor = wb.getArchMat('canyon_floor');
    const asphalt = wb.getArchMat('asphalt');
    const concWall = wb.getArchMat('concrete_wall');
    const steelDeck = wb.getArchMat('steel_deck');

    // Sunken Desert Gorge Floor (y = 0) + Extended Desert Plateau (620m horizon!)
    wb.addDeck(0, 0, 0, 176, 132, canyonFloor);
    wb.addBox(0, -1.6, 0, 620, 1.0, 620, wb.getColorMat(0x6e3a28, 0.96, 0.02), false);

    // --- NORTH & SOUTH ELEVATED MESA OUTPOST BASES (y = 10, z = ±74) ---
    for (const sign of [-1, 1]) {
      wb.addDeck(0, 10, sign * 74, 156, 36, canyonFloor);
      // Solid cliff face cleanly beneath the mesa rim (y = 0..8, zero Z-fighting with y = 10 deck!)
      wb.addBox(0, 4.0, sign * 58, 156, 8.0, 4.0, redrock, true);
      // Enterable Military Radar Bunker House (open West parapet for roof stairs!)
      wb.addBuilding(0, 10, sign * 77, 28, 5.8, 16, {
        wallMat: concWall,
        roofMat: steelDeck,
        trimMat: tm.dark,
        parapetH: 1.05,
        parapetGaps: { W: true },
        accentStrip: true,
        doors: [
          { side: sign < 0 ? 'S' : 'N', offset: -7, width: 5.0, height: 4.2 },
          { side: sign < 0 ? 'S' : 'N', offset: 7, width: 5.0, height: 4.2 },
          { side: 'W', offset: 0, width: 4.8, height: 4.0 },
          { side: 'E', offset: 0, width: 4.8, height: 4.0 }
        ],
        windows: [
          { side: sign < 0 ? 'S' : 'N', offset: 0, width: 5.4, sillH: 1.15, headH: 3.4 }
        ]
      });
      wb.addStaircase(-24, 10, sign * 82.5, -14, 15.8, sign * 82.5, 4.0, steelDeck, { solidBase: true });
      wb.addVehicle(30, 10, sign * 68, sign > 0 ? -0.3 : Math.PI + 0.3, { variant: 'truck', colorHex: 0x5c5342, tarpHex: 0x857558 });
      wb.addCrateCluster(-32, 10, sign * 66, sign * 0.35);
      wb.addJerseyBarrier(-14, 10, sign * 60, 5.6, 0);
      wb.addJerseyBarrier(14, 10, sign * 60, 5.6, 0);

      // Broad solid-base Canyon Trail Ramps descending from Mesa Rim (y = 10) down into the Gorge Floor (y = 0)
      wb.addStaircase(-34, 10, sign * 56, -34, 0, sign * 34, 7.2, canyonFloor, { solidBase: true });
      wb.addStaircase(34, 10, sign * 56, 34, 0, sign * 34, 7.2, canyonFloor, { solidBase: true });
      wb.addTree(-44, 10, sign * 72, 'pine');
      wb.addTree(44, 10, sign * 72, 'pine');
    }

    // --- CENTER GORGE: TWIN ELEVATED BRIDGES (y = 10, flush z = -56..56!) + SUNKEN CANYON FLOOR (y = 0) ---
    // Bridge 1: Main Concrete Highway Overpass (x = -12, wide 11.5m deck spanning z = -56 to +56)
    wb.addDeck(-12, 10, 0, 11.5, 112, asphalt);
    wb.addBox(-17.4, 10.62, -26, 0.55, 1.15, 28, concWall, true);
    wb.addBox(-6.6, 10.62, 26, 0.55, 1.15, 28, concWall, true);
    // Support bridge piers cleanly beneath the deck (y = 0..8, ZERO Z-fighting through the road!)
    for (const pz of [-30, 0, 30]) {
      wb.addBox(-12, 4.0, pz, 5.2, 8.0, 3.6, concWall, true);
    }
    // Stalled Armored Convoy Truck & Jersey Barriers right on the Highway Bridge!
    wb.addVehicle(-12, 10, -4, 0.22, { variant: 'truck', colorHex: 0x4f5946, tarpHex: 0x7c6e54 });
    wb.addJerseyBarrier(-10, 10, 18, 4.6, -0.35);
    wb.addJerseyBarrier(-14, 10, -22, 4.6, 0.35);

    // Bridge 2: Offset Steel Truss Catwalk Bridge (x = +18, flush z = -56 to +56)
    wb.addDeck(18, 10, 0, 7.6, 112, steelDeck);
    wb.addBox(14.4, 10.6, 0, 0.4, 1.1, 34, tm.dark, true);
    wb.addBox(21.6, 10.6, -24, 0.4, 1.1, 20, tm.dark, true);
    wb.addBox(21.6, 10.6, 24, 0.4, 1.1, 20, tm.dark, true);
    for (const pz of [-28, 28]) {
      wb.addBox(18, 4.0, pz, 3.2, 8.0, 3.2, tm.dark, true);
    }
    // Cross-Connector Walkway flush between Highway Bridge (x = -6.25) and Steel Bridge (x = +14.2) at Mid (z = 0, y = 10)
    wb.addDeck(3.975, 10, 0, 20.45, 6.2, steelDeck);
    wb.addCrateCluster(18, 10, 0, 0.25, 0.9);

    // Sunken Gorge Floor (y = 0): Enterable Dam Pump Station + Natural Redrock Outcrops + Updraft Vents!
    wb.addBuilding(4, 0, 0, 16, 5.2, 18, {
      wallMat: concWall,
      roofMat: steelDeck,
      trimMat: tm.dark,
      parapetH: 0.9,
      doors: [
        { side: 'N', offset: 0, width: 4.8, height: 3.8 },
        { side: 'S', offset: 0, width: 4.8, height: 3.8 },
        { side: 'W', offset: 0, width: 4.6, height: 3.8 },
        { side: 'E', offset: 0, width: 4.6, height: 3.8 }
      ]
    });
    // Natural Redrock Boulders on the gorge floor
    wb.addRotBox(-32, 2.2, -12, 7.5, 4.4, 6.2, 0.42, redrock, true);
    wb.addRotBox(-28, 1.8, 16, 6.8, 3.6, 5.8, -0.36, redrock, true);
    wb.addRotBox(34, 2.0, -14, 7.0, 4.0, 6.0, -0.45, redrock, true);
    wb.addRotBox(30, 2.2, 14, 7.2, 4.4, 5.6, 0.32, redrock, true);
    wb.addTree(-24, 0, -28, 'pine');
    wb.addTree(24, 0, 28, 'pine');

    // 4 Gorge Updraft Launch Vents (boost seamlessly from gorge floor y = 0 up onto y = 10 bridges/rims!)
    for (const [vx, vz] of [[-28, -42], [28, -42], [-28, 42], [28, 42]]) {
      wb.addLaunchPad(vx, 0.05, vz, { variant: 'vent', upSpeed: 21.5, label: 'GORGE UPDRAFT' });
    }

    // --- WEST CANYON RIM: SWEEPING CURVED REDROCK SURF CLIFF (x = -54 to -86) ---
    wb.addSurfCurve({
      start: [-54, 14, -52], yawStart: -0.26, yawDelta: 0.52, radius: 202.3, pitchDrop: 0,
      segments: 10, faceWidth: 15, slopeDeg: 50, side: 'right', lipStart: true, lipEnd: true
    });
    // West Outer Canyon Cliff Retaining Wall
    wb.addBox(-88, 14, 0, 12, 32, 184, redrock, true);
    // Mid-West Elevated Mesa Outpost Deck (y = 10, x = -74, z = 0) clear of the surf cliff face
    wb.addDeck(-74, 10, 0, 16, 28, canyonFloor);
    wb.addCrateCluster(-74, 10, 0, 0.35);

    // --- EAST CANYON WALL: SHADED MINE TUNNELS & SLIDE-UNDER FLANK SHAFTS (flush z = -56..56!) ---
    wb.addDeck(64, 10, 0, 28, 112, canyonFloor);
    wb.addBox(86, 14, 0, 12, 32, 184, redrock, true);
    // Enterable East Canyon Mine House / Overlook with 1.18m slide-under flank tunnels on both ends!
    wb.addArchway(64, 10, -28, 7.0, 1.18, 3.2, 0, redrock);
    wb.addArchway(64, 10, 28, 7.0, 1.18, 3.2, 0, redrock);
    wb.addBuilding(64, 10, 0, 20, 5.8, 28, {
      wallMat: redrock,
      roofMat: steelDeck,
      trimMat: tm.dark,
      parapetH: 1.0,
      doors: [
        { side: 'N', offset: 0, width: 5.4, height: 4.2 },
        { side: 'S', offset: 0, width: 5.4, height: 4.2 },
        { side: 'W', offset: 0, width: 5.6, height: 4.2 }
      ],
      windows: [
        { side: 'W', offset: -8, width: 4.8, sillH: 1.15, headH: 3.4 },
        { side: 'W', offset: 8, width: 4.8, sillH: 1.15, headH: 3.4 }
      ]
    });
    // East Wallrun Canyon Face connecting East Rim to Steel Bridge
    wb.addWallrunPanel(49, 14, -26, 26, 6.2, 0);
    wb.addWallrunPanel(49, 14, 26, 26, 6.2, 0);

    // Paired Opposing Mesa Flank Portals (West-North <-> East-South)
    wb.addStageTeleporter([-66, 10, -68], [5.8, 4.8, 2.4], [58, 10.5, 66], Math.PI * 0.25, {
      yaw: 0.45, ringHex: 0x4eeeff, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'MESA PORTAL · CYAN'
    });
    wb.addStageTeleporter([66, 10, 68], [5.8, 4.8, 2.4], [-58, 10.5, -66], -Math.PI * 0.75, {
      yaw: 0.45, ringHex: 0x4eeeff, preserveSpeed: true, maxSpeed: 22, cooldown: 1.25, label: 'MESA PORTAL · CYAN'
    });

    // Monumental Desert Canyon Mesas & Stepped Buttes ringing the horizon out to 420m (non-colliding vista)
    const mesas = [
      [-175, -135, 68, 62, 62], [175, -135, 74, 68, 60], [-180, 140, 66, 58, 64], [180, 140, 72, 64, 58],
      [-215, 0, 56, 74, 140], [215, 0, 56, 72, 140], [0, -185, 160, 56, 48], [0, 185, 160, 58, 48],
      [-140, -165, 48, 78, 46], [145, 165, 52, 84, 48]
    ];
    for (const [mx, mz, mw, mh, md] of mesas) {
      wb.addCanyonMesa(mx, -2, mz, mw, mh, md);
    }

    const spawns = [
      { x: 0, y: 10.05, z: -77, yaw: Math.PI },
      { x: 0, y: 10.05, z: 77, yaw: 0 },
      { x: -48, y: 10.05, z: -76, yaw: Math.PI - 0.3 },
      { x: 48, y: 10.05, z: 76, yaw: -0.3 },
      { x: 52, y: 10.05, z: -72, yaw: Math.PI + 0.3 },
      { x: -52, y: 10.05, z: 72, yaw: 0.3 },
      { x: -74, y: 10.05, z: -9, yaw: -Math.PI * 0.5 },
      { x: 64, y: 10.05, z: 0, yaw: Math.PI * 0.5 }
    ];

    return {
      id: 'arena_canyon',
      theme: 'sunset',
      isArena: true,
      course: null,
      bound: 155,
      killY: -16,
      voidHazard: false,
      spawn: makeV3(spawns[0].x, spawns[0].y, spawns[0].z),
      yaw: spawns[0].yaw,
      spawns,
      arenaSpawns: spawns,
      previewWaypoints: [
        [-115, 44, -102], [112, 38, -86], [115, 42, 98], [-110, 36, 92]
      ]
    };
  }

  // ===================================================================
  // CANONICAL 6-ARENA METADATA CATALOG
  // ===================================================================
  const ARENA_CATALOG = Object.freeze([
    {
      id: 'arena_surf',
      name: 'Surf Stadium',
      shortName: 'SURF STADIUM',
      archetype: 'Esports Surf-Combat Stadium',
      pacing: 'Large / Open Movement',
      pacingKey: 'open',
      theme: 'prism',
      tagline: 'Massive sweeping surf bowls, 2-story central island, turbo rings & flank portals.',
      description: 'An expansive esports combat stadium built around huge 112m curved surf bowls, a two-story floating central island bunker, outer turbo ring lanes, and opposing corner portals.',
      features: ['112m Surf Bowls', 'Central Island', 'Turbo Rings', 'Flank Portals'],
      voidHazard: true,
      build: buildArenaSurf
    },
    {
      id: 'arena_aim',
      name: 'Aim Courtyard',
      shortName: 'AIM COURTYARD',
      archetype: 'CS / CoD 3-Lane Desert Town',
      pacing: 'Medium-Large / Tactical',
      pacingKey: 'mid',
      theme: 'sandstone',
      tagline: 'Enterable 2-story Palace apartments, Market fountain, Mid sniper window & Long A.',
      description: 'Inspired by classic Counter-Strike and Call of Duty desert towns. Fight through enterable Palace apartments, contest the Market plaza and Mid window house, or push Long A boulevard.',
      features: ['Enterable Buildings', '3-Lane + Connectors', 'Slide Arches', 'Long A Site'],
      voidHazard: false,
      build: buildArenaAim
    },
    {
      id: 'arena_spire',
      name: 'Helix Spire',
      shortName: 'HELIX SPIRE',
      archetype: '3-Tier Skyscraper Construction',
      pacing: 'Large / Vertical Multi-Floor',
      pacingKey: 'cqb',
      theme: 'kitsune',
      tagline: 'Sprawling 3-story skyscraper deck, glass sky-lounges, open atrium & apex helipad.',
      description: 'A monumental three-tier neon construction deck suspended over the skyline. Battle across wide open decks, enterable sky-lounges, grand staircases, updraft vents, and the Apex helipad.',
      features: ['3 Wide Decks', 'Enterable Lounges', 'Launch Vents', 'Apex Portals'],
      voidHazard: true,
      build: buildArenaSpire
    },
    {
      id: 'arena_cargo',
      name: 'Cargo Killhouse',
      shortName: 'CARGO KILLHOUSE',
      archetype: 'Industrial Harbor & Warehouse',
      pacing: 'Medium / Mixed CQB & Mid',
      pacingKey: 'cqb',
      theme: 'industrial',
      tagline: 'Enterable 2-story warehouse, wide container yard, gantry catwalk & dockside pier.',
      description: 'An open-air industrial shipping depot combining an enterable two-story logistics warehouse, wide multi-lane container aisles, an overhead gantry bridge, and dockside flank routes.',
      features: ['2-Story Warehouse', 'Wide Container Yard', 'Slide-Under Cargo', 'Gantry Bridge'],
      voidHazard: false,
      build: buildArenaCargo
    },
    {
      id: 'arena_skyline',
      name: 'Skyline Run',
      shortName: 'SKYLINE RUN',
      archetype: 'Highrise Corporate Rooftop',
      pacing: 'Large / Rooftop & Aerial',
      pacingKey: 'open',
      theme: 'boreas',
      tagline: 'Twin enterable 2-story office towers, raised central helipad & sky-chasm flanks.',
      description: 'Highrise-inspired corporate rooftop complex featuring twin enterable two-story office lobbies, a raised central helipad plaza, exterior wallrun billboards, and turbo skyway rings.',
      features: ['2-Story Offices', 'Central Helipad', 'Wallrun Chasm', 'Turbo Skyways'],
      voidHazard: true,
      build: buildArenaSkyline
    },
    {
      id: 'arena_canyon',
      name: 'Redrock Canyon',
      shortName: 'REDROCK CANYON',
      archetype: 'Desert Gorge & Dam Outpost',
      pacing: 'Large / Long-Range & Flank',
      pacingKey: 'mid',
      theme: 'sunset',
      tagline: 'Twin outpost bunkers, sunken gorge, highway convoy bridge, surf cliff & mine tunnels.',
      description: 'A sprawling golden-hour desert gorge with fortified mesa bunkers, a sunken canyon pump house, twin elevated sniper bridges, a curved redrock surf cliff, and shaded mine slide tunnels.',
      features: ['Outpost Bunkers', 'Convoy Bridge', 'Cliff Surf Face', 'Mine Tunnels'],
      voidHazard: false,
      build: buildArenaCanyon
    }
  ]);

  const ARENA_IDS = Object.freeze(ARENA_CATALOG.map((a) => a.id));
  const ARENA_BY_ID = Object.create(null);
  for (const a of ARENA_CATALOG) ARENA_BY_ID[a.id] = a;

  function isValidArenaId(id) {
    return typeof id === 'string' && Boolean(ARENA_BY_ID[id]);
  }

  function normalizeArenaId(id, fallback) {
    if (isValidArenaId(id)) return id;
    if (isValidArenaId(fallback)) return fallback;
    return 'arena_surf';
  }

  function getArenaMeta(id) {
    return ARENA_BY_ID[id] || null;
  }

  function getArenaName(id) {
    const meta = ARENA_BY_ID[id];
    return meta ? meta.name : 'Arena';
  }

  function pickVoteOptions(currentMapId, rng) {
    const cur = normalizeArenaId(currentMapId, 'arena_surf');
    const rand = typeof rng === 'function' ? rng : Math.random;
    const others = ARENA_IDS.filter((id) => id !== cur);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1)) % (i + 1);
      const tmp = others[i];
      others[i] = others[j];
      others[j] = tmp;
    }
    return [others[0], others[1], cur];
  }

  return {
    ARENA_IDS,
    ARENA_CATALOG,
    ARENA_BY_ID,
    isValidArenaId,
    normalizeArenaId,
    getArenaMeta,
    getArenaName,
    pickVoteOptions,
    buildArenaSurf,
    buildArenaAim,
    buildArenaSpire,
    buildArenaCargo,
    buildArenaSkyline,
    buildArenaCanyon
  };
});
