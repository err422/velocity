'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DemolitionEngine = require('../src/systems/tactical/demolitionEngine.js');
const DestructionSystem = require('../src/systems/tactical/destructionSystem.js');
const TacticalMapCatalog = require('../src/maps/tacticalMaps.js');
const ArenaCatalog = require('../src/maps/arenas.js');

test('Demolition 5v5 rules (FT5, Halftime after R3, CS2 timers, economy caps)', () => {
  const R = DemolitionEngine.RULES;
  assert.equal(R.MODE_ID, 'demolition_5v5');
  assert.equal(R.WIN_ROUNDS, 5);
  assert.equal(R.HALF_ROUNDS, 3);
  assert.equal(R.BUY_SEC, 15);
  assert.equal(R.ROUND_SEC, 115);
  assert.equal(R.BOMB_FUSE_SEC, 40);
  assert.equal(R.PLANT_SEC, 3.5);
  assert.equal(R.DEFUSE_SEC, 7.0);
  assert.equal(R.DEFUSE_KIT_SEC, 3.5);
  assert.equal(R.START_CREDITS, 800);
  assert.equal(R.MAX_CREDITS, 8000);
  assert.equal(R.MAX_HUMANS, 4);
  assert.equal(R.TEAM_SIZE, 5);
});

test('5v5 Roster auto-balance (max 4 humans) and locked solo-queue bot skill spread', () => {
  const humans = [
    { uid: 'h1', name: 'Alpha' },
    { uid: 'h2', name: 'Bravo' },
    { uid: 'h3', name: 'Charlie' },
    { uid: 'h4', name: 'Delta' }
  ];
  const built = DemolitionEngine.buildDemolitionRoster(humans, { rand: () => 0.42 });
  assert.equal(built.all.length, 10);
  assert.equal(built.atk.length, 5);
  assert.equal(built.def.length, 5);
  assert.equal(built.atk.filter(p => !p.isBot).length, 2);
  assert.equal(built.def.filter(p => !p.isBot).length, 2);
  assert.equal(built.atk.filter(p => p.isBot).length, 3);
  assert.equal(built.def.filter(p => p.isBot).length, 3);

  // Solo human: 1 human + 4 bots vs 5 bots, with realistic solo-queue spread
  const soloBuilt = DemolitionEngine.buildDemolitionRoster([{ uid: 'me', name: 'Solo' }], { rand: () => 0.5 });
  assert.equal(soloBuilt.all.length, 10);
  assert.equal(soloBuilt.def.length, 5);
  assert.ok(soloBuilt.def.some(b => b.skillTier === 'carry'));
  assert.ok(soloBuilt.def.some(b => b.skillTier === 'solid'));
  assert.ok(soloBuilt.def.some(b => b.skillTier === 'weak'));
});

test('CS2 equipment economy, armor upgrade pricing, and armor damage mitigation', () => {
  const econ = DemolitionEngine.createPlayerEconomy();
  assert.equal(econ.credits, 800);
  assert.equal(econ.armor, 0);
  assert.equal(econ.helmet, false);

  // Buy Kevlar Vest ($400)
  const r1 = DemolitionEngine.buyItem(econ, 'def', 'vest', 'buy');
  assert.equal(r1.ok, true);
  assert.equal(econ.credits, 400);
  assert.equal(econ.armor, 100);
  assert.equal(econ.helmet, false);

  // Upgrade to Helmet ($250 discounted since vest is full!)
  const r2 = DemolitionEngine.buyItem(econ, 'def', 'vest_helmet', 'buy');
  assert.equal(r2.ok, true);
  assert.equal(r2.cost, 250);
  assert.equal(econ.credits, 150);
  assert.equal(econ.helmet, true);

  // Defuse kit denied for ATK, allowed for DEF with enough cash
  const atkEcon = DemolitionEngine.createPlayerEconomy();
  const deny = DemolitionEngine.buyItem(atkEcon, 'atk', 'defuse_kit', 'buy');
  assert.equal(deny.ok, false);

  // Mobility kit populates grapple (2) + jumpPad (1)
  const mobEcon = DemolitionEngine.createPlayerEconomy();
  const mobRes = DemolitionEngine.buyItem(mobEcon, 'atk', 'mobility_kit', 'buy');
  assert.equal(mobRes.ok, true);
  assert.equal(mobEcon.utility.grapple, 2);
  assert.equal(mobEcon.utility.jumpPad, 1);

  // Armor reduces body and headshot damage cleanly
  const mitigated = DemolitionEngine.applyTacticalDamage(100, econ.armor, econ.helmet, 40, false, 'rifle');
  assert.ok(mitigated.hpDamage < 40 && mitigated.hpDamage > 0);
  assert.ok(mitigated.armor < 100);
  assert.ok(mitigated.armorDamage > 0);
});

test('Round progression, halftime side-swap after Round 3, and First-to-5 victory', () => {
  const roster = DemolitionEngine.buildDemolitionRoster([{ uid: 'h1', name: 'Player' }], { rand: () => 0.3 }).all;
  const match = DemolitionEngine.createMatchState('tac_citadel');
  assert.equal(match.round, 1);
  assert.equal(match.phase, 'buy');
  assert.equal(match.scores.alpha, 0);
  assert.equal(match.scores.bravo, 0);
  assert.equal(match.bomb.state, 'carried');

  // Win R1, R2, R3 as ATK (alpha) -> halftime after R3!
  const o1 = DemolitionEngine.resolveRoundWin(match, 'atk', 'elimination', roster);
  assert.equal(match.scores.alpha, 1);
  assert.equal(o1.halftime, false);
  DemolitionEngine.advanceToNextRound(match, roster);
  assert.equal(match.round, 2);

  DemolitionEngine.resolveRoundWin(match, 'atk', 'bomb_detonated', roster);
  DemolitionEngine.advanceToNextRound(match, roster);
  assert.equal(match.round, 3);

  const o3 = DemolitionEngine.resolveRoundWin(match, 'atk', 'elimination', roster);
  assert.equal(match.scores.alpha, 3);
  assert.equal(o3.halftime, true);
  assert.equal(match.phase, 'halftime');

  // Advance through halftime -> sides swap (alpha becomes DEF, bravo becomes ATK) and credits reset to $800
  const prevTeam = roster.find(p => p.uid === 'h1').team;
  const adv = DemolitionEngine.advanceToNextRound(match, roster);
  assert.equal(adv.swapped, true);
  assert.equal(match.swapped, true);
  assert.equal(match.sideSquads.def, 'alpha');
  assert.equal(match.sideSquads.atk, 'bravo');
  const newTeam = roster.find(p => p.uid === 'h1').team;
  assert.notEqual(prevTeam, newTeam);
  assert.equal(match.round, 4);
  assert.equal(roster.find(p => p.uid === 'h1').econ.credits, 800);

  // DEF (alpha) wins 2 more rounds -> reaches 5 -> Match Over!
  DemolitionEngine.resolveRoundWin(match, 'def', 'bomb_defused', roster);
  DemolitionEngine.advanceToNextRound(match, roster);
  const winRes = DemolitionEngine.resolveRoundWin(match, 'def', 'elimination', roster);
  assert.equal(match.scores.alpha, 5);
  assert.equal(winRes.matchOver, true);
  assert.equal(match.phase, 'match_over');
  assert.equal(match.winnerSquad, 'alpha');
});

test('Bomb drop, pickup, plant, and CS2 continuous defuse (resets to 0 on release)', () => {
  const roster = DemolitionEngine.buildDemolitionRoster([{ uid: 'h1', name: 'Planter' }], { rand: () => 0.5 }).all;
  const match = DemolitionEngine.createMatchState('tac_citadel');
  match.phase = 'live';
  const carrierUid = roster.find(p => p.team === 'atk').uid;
  match.bomb.carrierUid = carrierUid;
  match.bomb.state = 'carried';

  // Drop bomb with G
  const dropOk = DemolitionEngine.dropBomb(match.bomb, carrierUid, { x: 10, y: 0, z: -5 });
  assert.equal(dropOk, true);
  assert.equal(match.bomb.state, 'dropped');
  assert.equal(match.bomb.carrierUid, null);

  // Pick up bomb
  const pickOk = DemolitionEngine.tryPickupBomb(match.bomb, carrierUid, 'atk', { x: 10.5, y: 0, z: -5 }, 2.1);
  assert.equal(pickOk, true);
  assert.equal(match.bomb.state, 'carried');
  assert.equal(match.bomb.carrierUid, carrierUid);

  // Plant bomb over 3.5s
  let plantOut = DemolitionEngine.stepBombPlant(match.bomb, true, 'A', carrierUid, 2.0);
  assert.equal(plantOut.planted, false);
  assert.ok(match.bomb.plantProgress >= 2.0);
  plantOut = DemolitionEngine.stepBombPlant(match.bomb, true, 'A', carrierUid, 2.0);
  assert.equal(plantOut.planted, true);
  assert.equal(match.bomb.state, 'planted');
  assert.equal(match.bomb.site, 'A');

  // Defender holds defuse for 3.0s (without kit: needs 7.0s), then lets go -> MUST reset to 0!
  const defPlayer = roster.find(p => p.team === 'def');
  let defOut = DemolitionEngine.stepBombDefuse(match.bomb, true, true, defPlayer.uid, false, 3.0);
  assert.equal(defOut.defused, false);
  assert.ok(match.bomb.defuseProgress >= 3.0);
  DemolitionEngine.stepBombDefuse(match.bomb, false, true, defPlayer.uid, false, 0.05);
  assert.equal(match.bomb.defuseProgress, 0);
  assert.equal(match.bomb.defuserUid, null);

  // With Defuse Kit, 3.6s completes defusal!
  defOut = DemolitionEngine.stepBombDefuse(match.bomb, true, true, defPlayer.uid, true, 3.6);
  assert.equal(defOut.defused, true);
  assert.equal(match.bomb.state, 'defused');
});

test('Death damage breakdown report summarizes dealt and taken per opponent', () => {
  const roster = DemolitionEngine.buildDemolitionRoster([{ uid: 'h1', name: 'Hero' }], { rand: () => 0.4 }).all;
  const match = DemolitionEngine.createMatchState('tac_citadel');
  const enemy = roster.find(p => p.team === 'def');
  DemolitionEngine.recordDamageHit(match, {
    attackerUid: 'h1', attackerName: 'Hero',
    victimUid: enemy.uid, victimName: enemy.name,
    dmg: 64, armorDmg: 18, hs: false, weapon: 'V-47 Rifle', killed: false
  });
  DemolitionEngine.recordDamageHit(match, {
    attackerUid: enemy.uid, attackerName: enemy.name,
    victimUid: 'h1', victimName: 'Hero',
    dmg: 42, armorDmg: 14, hs: false, weapon: 'SCAR-H', killed: false
  });
  DemolitionEngine.recordDamageHit(match, {
    attackerUid: enemy.uid, attackerName: enemy.name,
    victimUid: 'h1', victimName: 'Hero',
    dmg: 68, armorDmg: 22, hs: true, weapon: 'SCAR-H', killed: true
  });

  const report = DemolitionEngine.buildDeathBreakdown(match, 'h1');
  assert.ok(report.killer);
  assert.equal(report.killer.uid, enemy.uid);
  assert.equal(report.killer.headshot, true);
  assert.equal(report.encounters.length, 1);
  assert.equal(report.encounters[0].dealtDmg, 64);
  assert.equal(report.encounters[0].dealtHits, 1);
  assert.equal(report.encounters[0].takenDmg, 110);
  assert.equal(report.encounters[0].takenHits, 2);
});

test('DestructionSystem state logic: bullets chip peek-holes, explosives breach + rubble, O(1) round reset', () => {
  DestructionSystem.clearMap();
  const mockSolids = [];
  const mockMeshes = [];
  const mockGroup = { add(){}, remove(){} };
  DestructionSystem.ensureInit(mockGroup, {
    registerSolid: (m, w, h, d) => {
      const s = { mesh: m, w, h, d, disabled: false };
      mockSolids.push(s);
      return s;
    },
    solids: mockSolids,
    solidMeshes: mockMeshes
  });

  const panels = DestructionSystem.registerSoftWall({
    id: 'test_wall',
    x: 0, y: 0, z: 0,
    w: 3.2, h: 3.2, d: 0.32,
    cols: 2, rows: 2,
    color: 0xc8b294
  });
  assert.equal(panels.length, 4);
  const lowerPanel = panels[0];
  assert.equal(lowerPanel.broken, false);
  assert.equal(lowerPanel.cracked, false);

  // Rifle bullets chip panel into cracked state first
  const hit1 = DestructionSystem.damagePanel(lowerPanel.id, 65, 'rifle');
  assert.equal(hit1.cracked, true);
  assert.equal(lowerPanel.cracked, true);
  assert.equal(lowerPanel.broken, false);

  // Explosive blasts open the soft wall & spawns persistent crouch-height rubble cover!
  const expRes = DestructionSystem.applyExplosion({ x: 0, y: 1.0, z: 0 }, 4.0, 260, 'frag');
  assert.ok(expRes.brokenIds.length >= 1);
  assert.equal(lowerPanel.broken, true);
  const rubble = DestructionSystem.getRubble();
  assert.ok(rubble.length >= 1);
  assert.ok(rubble[0].h <= 1.1 && rubble[0].h >= 0.9, 'rubble should be crouch-height cover (~1.02m)');

  // O(1) round reset restores all panels intact & clears rubble
  DestructionSystem.resetRound();
  assert.equal(lowerPanel.broken, false);
  assert.equal(lowerPanel.cracked, false);
  assert.equal(DestructionSystem.getRubble().length, 0);
  DestructionSystem.clearMap();
});

test('3 Tactical Demolition maps catalog and mode-isolated post-match voting', () => {
  assert.equal(TacticalMapCatalog.TACTICAL_MAPS.length, 3);
  const ids = TacticalMapCatalog.TACTICAL_MAPS.map(m => m.id);
  assert.deepEqual(ids, ['tac_citadel', 'tac_skyway', 'tac_alpine']);

  for (const id of ids) {
    assert.equal(TacticalMapCatalog.isTacticalMapId(id), true);
    assert.equal(ArenaCatalog.isValidArenaId(id), true);
  }

  // Post-match voting in Demolition rotates ONLY among the 3 tactical maps
  const demoVotes = ArenaCatalog.pickVoteOptions('tac_citadel', () => 0.4, 'demolition_5v5');
  assert.equal(demoVotes.length, 3);
  assert.ok(demoVotes.every(id => TacticalMapCatalog.isTacticalMapId(id)));

  // Post-match voting in FFA rotates ONLY among the 6 FFA arenas
  const ffaVotes = ArenaCatalog.pickVoteOptions('arena_surf', () => 0.4, 'ffa_4p');
  assert.equal(ffaVotes.length, 3);
  assert.ok(ffaVotes.every(id => !TacticalMapCatalog.isTacticalMapId(id)));
});

test('firestore.rules validates demolition_5v5 (maxPlayers 4) and all 3 tactical map IDs', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.ok(rules.includes("'demolition_5v5'"));
  assert.ok(rules.includes("'tac_citadel'"));
  assert.ok(rules.includes("'tac_skyway'"));
  assert.ok(rules.includes("'tac_alpine'"));
  assert.ok(rules.includes("data.mode == 'demolition_5v5' && data.maxPlayers == 4"));
  assert.ok(!rules.includes("'duel_1v1'"));
});
