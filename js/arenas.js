// Symmetrical 1v1 Duel & 4P FFA Combat Arenas for VELOCITY:
// 1. Arena 01 — Surf Duel (arena_surf): twin opposing CS surf wedges, central sky-bridge, jump pads, sniper perches.
// 2. Arena 02 — Aim Map (arena_aim): classic symmetrical CS aim_map courtyard with concrete crates, mid AWP lane, wallrun flanks & catwalks.
function buildArenaSurf() {
  // Safety return floor below so missed surf transfers bounce right back into the fight
  addBox(0, -3, 0, 140, 2, 160, floorMat);
  const grid = new THREE.GridHelper(140, 56, 0x265268, 0x162938);
  grid.position.y = -1.98;
  levelGroup.add(grid);

  // Perimeter containment walls
  addBox(0, 14, -76, 136, 34, 3, dark);
  addBox(0, 14, 76, 136, 34, 3, dark);
  addBox(-68, 14, 0, 3, 34, 152, dark);
  addBox(68, 14, 0, 3, 34, 152, dark);

  // North & South Symmetrical Elevated Spawn Decks (top y = 14)
  for (const sign of [-1, 1]) {
    addBox(0, 13, sign * 58, 30, 2, 18, concrete);
    addBox(0, 14.12, sign * 49.1, 30, 0.24, 0.35, cyan, false);
    // Spawn cover crates (symmetrical left/right + center head-peek block)
    addBox(-8, 15.6, sign * 53, 4.2, 3.2, 2.2, dark);
    addBox(8, 15.6, sign * 53, 4.2, 3.2, 2.2, dark);
    addBox(0, 15.2, sign * 51, 3.2, 2.4, 1.8, orange);
    // Drop-down flank launch pads back up to spawn decks
    addLaunchPad(-22, -1.96, sign * 54);
    addLaunchPad(22, -1.96, sign * 54);
  }

  // Twin Opposing CS Surf Wedges flanking East & West
  addSurfWedge([-22, 13.4, -46], [-22, 7.6, -6], { faceWidth: 10, slopeDeg: 50, side: 'both', lipEnd: true });
  addSurfWedge([-22, 13.4, 46], [-22, 7.6, 6], { faceWidth: 10, slopeDeg: 50, side: 'both', lipEnd: true });
  addSurfWedge([22, 13.4, -46], [22, 7.6, -6], { faceWidth: 10, slopeDeg: 50, side: 'both', lipEnd: true });
  addSurfWedge([22, 13.4, 46], [22, 7.6, 6], { faceWidth: 10, slopeDeg: 50, side: 'both', lipEnd: true });

  // Central Sky-Bridge Arena Hub (top y = 7)
  addBox(0, 6, 0, 28, 2, 18, concrete);
  addBox(0, 7.1, 0, 28, 0.14, 0.25, orange, false);
  // Central tactical pillars for peek-dueling
  addBox(-7.5, 9.2, -3.5, 2.8, 4.4, 2.8, dark);
  addBox(7.5, 9.2, 3.5, 2.8, 4.4, 2.8, dark);
  addBox(0, 8.6, 0, 3.2, 3.2, 3.2, concrete);

  // Elevated East & West Sniper Perches (top y = 17) reached via launch pads or surf flicks
  for (const sx of [-42, 42]) {
    addBox(sx, 16, 0, 14, 2, 18, concrete);
    addBox(sx - Math.sign(sx) * 6.4, 17.8, 0, 1.2, 1.6, 12, dark);
    addLaunchPad(sx * 0.85, -1.96, -24);
    addLaunchPad(sx * 0.85, -1.96, 24);
    // Side wall-run billboards bridging perches to north/south
    addBox(sx * 1.18, 12, -26, 2, 10, 26, concrete);
    addBox(sx * 1.18, 12, 26, 2, 10, 26, concrete);
  }

  // Center floor return pads
  addLaunchPad(0, -1.96, -22);
  addLaunchPad(0, -1.96, 22);

  const spawns = [
    { x: 0, y: 14.05, z: -61, yaw: Math.PI },
    { x: 0, y: 14.05, z: 61, yaw: 0 },
    { x: -42, y: 17.05, z: 0, yaw: -Math.PI / 2 },
    { x: 42, y: 17.05, z: 0, yaw: Math.PI / 2 },
    { x: -10, y: 14.05, z: -58, yaw: Math.PI },
    { x: 10, y: 14.05, z: 58, yaw: 0 }
  ];

  return {
    id: 'arena_surf',
    name: 'Surf Duel',
    isArena: true,
    spawn: V3(spawns[0].x, spawns[0].y, spawns[0].z),
    yaw: spawns[0].yaw,
    spawns,
    arenaSpawns: spawns,
    course: null,
    bound: 0,
    killY: -18
  };
}

function buildArenaAim() {
  // Classic Symmetrical CS aim_map Courtyard (72m wide x 96m deep, floor y = 0)
  addBox(0, -1, 0, 76, 2, 100, floorMat);
  const grid = new THREE.GridHelper(96, 48, 0x2a546a, 0x182b3a);
  grid.position.y = 0.02;
  levelGroup.add(grid);

  // Perimeter concrete walls
  addBox(0, 7, -49, 76, 16, 2.5, dark);
  addBox(0, 7, 49, 76, 16, 2.5, dark);
  addBox(-37, 7, 0, 2.5, 16, 100, dark);
  addBox(37, 7, 0, 2.5, 16, 100, dark);

  // Glowing center divider stripe on floor
  addBox(0, 0.04, 0, 72, 0.08, 0.35, cyan, false);

  // Mirrored North & South Tactical Cover Crates + Head-Peek Boxes
  for (const sign of [-1, 1]) {
    // Twin spawn cover walls leaving an iconic CS aim_map center peek sightline
    addBox(-6.8, 1.8, sign * 34, 6.2, 3.6, 2.2, concrete);
    addBox(6.8, 1.8, sign * 34, 6.2, 3.6, 2.2, concrete);
    addBox(-15.5, 1.5, sign * 31, 4.2, 3.0, 4.2, dark);
    addBox(15.5, 1.5, sign * 31, 4.2, 3.0, 4.2, dark);

    // Mid-lane staggered AWP / Rifle peek crates
    addBox(-5.5, 1.6, sign * 18, 4.4, 3.2, 3.6, concrete);
    addBox(6.5, 1.1, sign * 16, 3.8, 2.2, 3.2, orange);
    addBox(-16, 2.0, sign * 14, 4.0, 4.0, 4.0, dark);
    addBox(16, 2.0, sign * 14, 4.0, 4.0, 4.0, dark);

    // Ramps climbing up to East/West Side Catwalks (top y = 5.5)
    addRamp([-29, 0, sign * 36], [-29, 5.5, sign * 22], 6.5, concrete);
    addRamp([29, 0, sign * 36], [29, 5.5, sign * 22], 6.5, concrete);

    // Slide-under tactical flank bars in mid-flank lanes (1.15m clearance)
    addBox(-21, 2.15, sign * 4, 6.5, 2.0, 2.2, orange);
    addBox(21, 2.15, sign * 4, 6.5, 2.0, 2.2, orange);
  }

  // Central Aim Duel Pillar & Low Head-Glitch Crate
  addBox(0, 2.1, 0, 4.6, 4.2, 4.6, concrete);
  addBox(-10.5, 0.95, 0, 3.4, 1.9, 2.6, dark);
  addBox(10.5, 0.95, 0, 3.4, 1.9, 2.6, dark);

  // East & West Elevated Catwalks (top y = 5.5) + Wall-Run Interior Walls
  for (const sx of [-29, 29]) {
    addBox(sx, 4.5, 0, 6.8, 2, 44, concrete);
    // Low catwalk railing cover at mid
    addBox(sx - Math.sign(sx) * 2.9, 6.2, 0, 0.8, 1.4, 14, dark);
    // Wallrun jump pad boosters near center flanks
    addLaunchPad(sx - Math.sign(sx) * 7.5, 0.02, 0);
  }

  const spawns = [
    { x: 0, y: 0.05, z: -41, yaw: Math.PI },
    { x: 0, y: 0.05, z: 41, yaw: 0 },
    { x: -29, y: 5.55, z: -16, yaw: Math.PI * 0.85 },
    { x: 29, y: 5.55, z: 16, yaw: -Math.PI * 0.15 },
    { x: -16, y: 0.05, z: -40, yaw: Math.PI },
    { x: 16, y: 0.05, z: 40, yaw: 0 }
  ];

  return {
    id: 'arena_aim',
    name: 'Aim Map',
    isArena: true,
    spawn: V3(spawns[0].x, spawns[0].y, spawns[0].z),
    yaw: spawns[0].yaw,
    spawns,
    arenaSpawns: spawns,
    course: null,
    bound: 0,
    killY: -12
  };
}
