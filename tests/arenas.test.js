const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ArenaCatalog = require('../src/maps/arenas.js');
const NetcodeSystem = require('../src/systems/combat/netcode.js');

const EXPECTED_TACTICAL_IDS = [
  'tac_citadel',
  'tac_skyway',
  'tac_alpine'
];

const EXPECTED_ARENA_IDS = [
  'arena_surf',
  'arena_aim',
  'arena_spire',
  'arena_cargo',
  'arena_skyline',
  'arena_canyon'
];

test('ArenaCatalog exposes all 6 FFA arenas and 3 Tactical Demolition maps with complete metadata', () => {
  assert.deepEqual(ArenaCatalog.FFA_ARENA_CATALOG.map(m => m.id), EXPECTED_ARENA_IDS);
  assert.deepEqual(ArenaCatalog.DEMOLITION_ARENA_CATALOG.map(m => m.id), EXPECTED_TACTICAL_IDS);
  assert.deepEqual(ArenaCatalog.ARENA_IDS, [...EXPECTED_TACTICAL_IDS, ...EXPECTED_ARENA_IDS]);
  assert.equal(ArenaCatalog.ARENA_CATALOG.length, 9);

  const ffaThemes = new Set();
  for (const meta of ArenaCatalog.ARENA_CATALOG) {
    assert.ok(ArenaCatalog.isValidArenaId(meta.id), `expected ${meta.id} to be valid`);
    assert.equal(ArenaCatalog.getArenaMeta(meta.id), meta);
    assert.ok(meta.name && meta.shortName && meta.archetype && meta.pacing && meta.description);
    assert.ok(Array.isArray(meta.features) && meta.features.length >= 3, `${meta.id} should list features`);
    assert.equal(typeof meta.build, 'function', `${meta.id} should provide a procedural builder`);
    if (EXPECTED_ARENA_IDS.includes(meta.id)) ffaThemes.add(meta.theme);
  }
  assert.equal(ffaThemes.size, 6, 'all 6 FFA PvP arenas should use distinct visual themes');
  assert.equal(ArenaCatalog.isValidArenaId('arena_unknown'), false);
  assert.equal(ArenaCatalog.normalizeArenaId('arena_unknown'), 'tac_citadel');
  assert.equal(ArenaCatalog.normalizeArenaId('arena_cargo'), 'arena_cargo');
});

test('ArenaCatalog.pickVoteOptions returns 3 distinct arenas with current arena as rematch option', () => {
  for (const cur of EXPECTED_ARENA_IDS) {
    const opts = ArenaCatalog.pickVoteOptions(cur, () => 0.37);
    assert.equal(opts.length, 3);
    assert.equal(new Set(opts).size, 3, 'vote options must all be distinct');
    assert.equal(opts[2], cur, '3rd vote option should be the current arena for rematch');
    for (const id of opts) {
      assert.ok(ArenaCatalog.isValidArenaId(id));
    }
  }
});

test('NetcodeSystem.computeVoteTally resolves majority wins, overwrites, invalid votes, and tie-breaks cleanly', () => {
  const options = ['arena_spire', 'arena_cargo', 'arena_surf'];

  // Clear majority
  const r1 = NetcodeSystem.computeVoteTally(options, {
    u1: 'arena_cargo',
    u2: 'arena_cargo',
    u3: 'arena_surf'
  });
  assert.equal(r1.winnerMapId, 'arena_cargo');
  assert.equal(r1.totalVotes, 3);
  assert.equal(r1.counts.arena_cargo, 2);
  assert.equal(r1.counts.arena_surf, 1);

  // Tie between fresh map (option 0) and rematch (option 2) favors earlier/fresh option
  const r2 = NetcodeSystem.computeVoteTally(options, {
    u1: 'arena_spire',
    u2: 'arena_surf'
  });
  assert.equal(r2.winnerMapId, 'arena_spire');
  assert.equal(r2.totalVotes, 2);

  // Invalid map votes are ignored; zero valid votes falls back to option 0
  const r3 = NetcodeSystem.computeVoteTally(options, {
    u1: 'not_a_map',
    u2: ''
  });
  assert.equal(r3.winnerMapId, 'arena_spire');
  assert.equal(r3.totalVotes, 0);
});

test('firestore.rules and firebaseBackend.js allow all 6 canonical PvP arena mapIds', () => {
  const rulesText = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const backendText = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'progression', 'firebaseBackend.js'), 'utf8');
  for (const id of EXPECTED_ARENA_IDS) {
    assert.ok(rulesText.includes(`'${id}'`), `firestore.rules must allow ${id}`);
    assert.ok(backendText.includes(`'${id}'`), `firebaseBackend.js must allow ${id}`);
  }
});

test('all 6 AAA arena builders execute cleanly with spacious bounds, buildings, and separated spawns', () => {
  const prevCreate = globalThis.createWorldBuilder;
  try {
    for (const meta of ArenaCatalog.ARENA_CATALOG) {
      let buildings = 0;
      let staircases = 0;
      let boxes = 0;
      let surfCurveErrors = [];
      const noopMesh = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } });
      globalThis.createWorldBuilder = () => ({
        mats: { deck: {}, dark: {}, under: {}, accent: {}, lip: {}, wall: {} },
        getArchMat: () => ({}),
        getColorMat: () => ({}),
        addBox: () => { boxes++; return noopMesh(); },
        addRotBox: () => { boxes++; return noopMesh(); },
        addDeck: () => { boxes++; return noopMesh(); },
        addThinDeck: () => { boxes++; return noopMesh(); },
        addBuilding: () => { buildings++; },
        addStaircase: () => { staircases++; },
        addVehicle: () => {},
        addCrateCluster: () => {},
        addJerseyBarrier: () => {},
        addArchway: () => {},
        addTree: () => {},
        addStreetLamp: () => {},
        addSkyscraperBackdrop: () => {},
        addHelipad: () => {},
        addContainer: () => {},
        addWallrunPanel: () => {},
        addLaunchPad: () => {},
        addBoostRing: () => {},
        addStageTeleporter: () => {},
        addSurfCurve: (cOpts) => {
          if (!cOpts || !Number.isFinite(cOpts.yawStart) || !Number.isFinite(cOpts.radius) || !Number.isFinite(cOpts.pitchDrop)) {
            surfCurveErrors.push(cOpts);
          }
        },
        addNeonFrame: () => {},
        addPylon: () => {},
        addRing: noopMesh,
        addCanyonMesa: () => {},
        addBackdropPeak: () => {}
      });

      const built = meta.build({ collide: false, isPreview: true });
      const isTac = EXPECTED_TACTICAL_IDS.includes(meta.id);
      assert.equal(built.id, meta.id);
      assert.equal(built.isArena, true, `${meta.id} must set isArena: true`);
      assert.equal(built.course, null, `${meta.id} must set course: null`);
      assert.ok(Number.isFinite(built.yaw), `${meta.id} must expose finite numeric yaw`);
      assert.ok(built.spawn && Number.isFinite(built.spawn.x) && Number.isFinite(built.spawn.y) && Number.isFinite(built.spawn.z), `${meta.id} must expose finite spawn`);
      if (meta.id === 'arena_surf') {
        assert.ok(built.killY <= -35, `arena_surf killY should be <= -35 for deep recovery (got ${built.killY})`);
      }
      assert.equal(surfCurveErrors.length, 0, `${meta.id} addSurfCurve calls must pass yawStart, radius, and pitchDrop`);
      assert.ok(boxes >= 10, `${meta.id} should build substantial geometry`);
      if (isTac) {
        assert.ok(built.tactical && Array.isArray(built.tactical.sites) && built.tactical.sites.length === 2, `${meta.id} must expose 2 bomb sites`);
        assert.equal(built.tactical.atkSpawns.length, 5, `${meta.id} must expose 5 ATK spawns`);
        assert.equal(built.tactical.defSpawns.length, 5, `${meta.id} must expose 5 DEF spawns`);
        assert.ok(staircases >= 1, `${meta.id} tactical map should include multi-story staircases`);
      } else {
        assert.ok(built.bound >= 130, `${meta.id} should have spacious AAA bound >= 130 (got ${built.bound})`);
        assert.ok(buildings >= 2, `${meta.id} should contain enterable multi-room buildings (got ${buildings})`);
        assert.ok(staircases >= 2, `${meta.id} should contain walkable staircases (got ${staircases})`);
        assert.equal(built.arenaSpawns.length, 8, `${meta.id} should expose 8 arena spawns`);
        assert.equal(built.spawns.length, 8, `${meta.id} should expose 8 spawns`);

        const s0 = built.arenaSpawns[0];
        const s1 = built.arenaSpawns[1];
        const spawnDist = Math.hypot(s0.x - s1.x, s0.z - s1.z);
        assert.ok(spawnDist >= 100, `${meta.id} opposing team spawns should be >= 100m apart (got ${spawnDist.toFixed(1)}m)`);
      }
    }
  } finally {
    if (prevCreate === undefined) delete globalThis.createWorldBuilder;
    else globalThis.createWorldBuilder = prevCreate;
  }
});

