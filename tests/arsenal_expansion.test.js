const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KnivesSystem = require('../src/weapons/melee/knivesData.js');
const LoadoutsSystem = require('../src/weapons/firearms/specs.js');
const CombatSystem = require('../src/systems/combat/combatSystem.js');

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('all 19 weapons exist in both KnivesSystem and LoadoutsSystem with valid archetypes and resolved builds', () => {
  assert.equal(LoadoutsSystem.WEAPON_IDS.length, 19);
  assert.deepEqual(
    [...KnivesSystem.WEAPON_TYPE_IDS].sort(),
    [...LoadoutsSystem.WEAPON_IDS].sort()
  );

  for (const wid of LoadoutsSystem.WEAPON_IDS) {
    const spec = LoadoutsSystem.getWeaponSpec(wid);
    const build = LoadoutsSystem.resolveWeaponBuild(wid, {});
    assert.ok(spec, `Missing WEAPON_SPECS entry for ${wid}`);
    assert.ok(KnivesSystem.WEAPON_TYPES[wid], `Missing KnivesSystem.WEAPON_TYPES entry for ${wid}`);
    assert.equal(build.weaponId, wid);
    assert.ok(build.damageBody > 0 && build.damageHead >= build.damageBody);
    assert.ok(build.weightKg > 0);
  }

  // Verify signature archetype properties
  const famas = LoadoutsSystem.resolveWeaponBuild('famas', {});
  assert.equal(famas.burstCount, 3);

  const honeybadger = LoadoutsSystem.resolveWeaponBuild('honeybadger', {});
  assert.equal(honeybadger.suppressed, true);

  const usps = LoadoutsSystem.resolveWeaponBuild('usps', {});
  assert.equal(usps.suppressed, true);

  const akimbo = LoadoutsSystem.resolveWeaponBuild('akimbo', {});
  assert.equal(akimbo.dualWield, true);

  const katana = LoadoutsSystem.getWeaponSpec('katana');
  assert.equal(katana.slotCategory, 'primary');
  assert.equal(katana.isMeleeWeapon, true);
  assert.ok(katana.katanaConfig && katana.katanaConfig.dashCooldown > 0 && katana.katanaConfig.dashSpeed > 25);
  assert.equal(katana.katanaConfig.dashResetOnKill, true);
  assert.equal(katana.katanaConfig.deflectMaxSec, 2.0);
  assert.equal(katana.katanaConfig.deflectRechargeSec, 5.5);
  assert.equal(katana.katanaConfig.deflectMinCharge, 0.30);
});

test('Shotguns, Revolver, and Rail Cannon enforce heavy grounded physics kickback', () => {
  const kickWeapons = ['shotgun', 'sawedoff', 'leverslug', 'revolver'];
  for (const wid of kickWeapons) {
    const build = LoadoutsSystem.resolveWeaponBuild(wid, {});
    assert.ok(build.kickbackForce >= 9.0, `Expected heavy kickbackForce on ${wid}, got ${build.kickbackForce}`);
    assert.ok(build.kickbackGroundLift > 0, `Expected grounded lift kickback on ${wid}, got ${build.kickbackGroundLift}`);
  }

  // Sawed-off should kick harder than pump shotgun
  const pump = LoadoutsSystem.resolveWeaponBuild('shotgun', {});
  const sawed = LoadoutsSystem.resolveWeaponBuild('sawedoff', {});
  assert.ok(sawed.kickbackForce > pump.kickbackForce);

  // Rail Cannon scorestreak also applies heavy kickback and pierces targets
  const rail = LoadoutsSystem.getScorestreakDef('railcannon');
  assert.ok(rail.kickbackForce >= 10 && rail.pierceTargets === true);
});

test('Katana timed bullet deflection drains in 2.0s, blocks re-engage under 30%, and recharges in 5.5s', () => {
  const cfg = {
    deflectMaxDurationSec: 2.0,
    deflectRechargeSec: 5.5,
    deflectMinChargePct: 0.30
  };

  // Start full, hold RMB for 1.0s -> 50% remaining and active
  let st = CombatSystem.advanceKatanaDeflect(1.0, false, true, 1.0, cfg);
  assert.equal(st.active, true);
  assert.equal(st.depleted, false);
  assert.ok(Math.abs(st.energy - 0.5) < 0.001);

  // Hold another 1.05s -> fully depleted and forced out of deflect
  st = CombatSystem.advanceKatanaDeflect(st.energy, st.active, true, 1.05, cfg);
  assert.equal(st.active, false);
  assert.equal(st.depleted, true);
  assert.equal(st.energy, 0);
  assert.equal(st.canEngage, false);

  // Holding RMB while recharging below 30% (1.0s = 18.2%) cannot re-engage
  st = CombatSystem.advanceKatanaDeflect(st.energy, st.active, true, 1.0, cfg);
  assert.equal(st.active, false);
  assert.ok(st.energy > 0.15 && st.energy < 0.25);
  assert.equal(st.canEngage, false);

  // After another 1.0s (~36.4% total), holding RMB re-engages deflect cleanly
  st = CombatSystem.advanceKatanaDeflect(st.energy, st.active, false, 1.0, cfg);
  assert.ok(st.energy >= 0.30);
  assert.equal(st.canEngage, true);

  st = CombatSystem.advanceKatanaDeflect(st.energy, st.active, true, 0.25, cfg);
  assert.equal(st.active, true);

  // Full recharge from 0 takes 5.5s
  let recharged = CombatSystem.advanceKatanaDeflect(0, false, false, 5.5, cfg);
  assert.equal(recharged.energy, 1.0);
  assert.equal(recharged.canEngage, true);
});

test('5 loadout-selectable Scorestreaks unlock at 300 pts (1000 pts for Tactical Nuke) and persist per loadout', () => {
  assert.deepEqual(LoadoutsSystem.SCORESTREAK_IDS, ['rpg', 'minigun', 'railcannon', 'grenadelauncher', 'nuke']);
  for (const sid of ['rpg', 'minigun', 'railcannon', 'grenadelauncher']) {
    const def = LoadoutsSystem.getScorestreakDef(sid);
    assert.equal(def.cost, 300);
    assert.ok(def.ammo > 0);
  }
  const nuke = LoadoutsSystem.getScorestreakDef('nuke');
  assert.equal(nuke.cost, 1000);
  assert.equal(nuke.isTacticalNuke, true);

  let state = LoadoutsSystem.createDefaultLoadoutState();
  const updated = LoadoutsSystem.setLoadoutScorestreak(state, 0, 'nuke');
  assert.equal(updated.loadouts[0].scorestreakId, 'nuke');

  // Invalid streak ID ignored / falls back safely
  const unchanged = LoadoutsSystem.setLoadoutScorestreak(updated, 0, 'orbital_laser');
  assert.equal(unchanged.loadouts[0].scorestreakId, 'nuke');

  // Cloud payload preserves scorestreakId per loadout
  const payload = LoadoutsSystem.toCloudLoadoutsPayload(updated, 'uid_streak');
  assert.equal(payload.loadouts[0].scorestreakId, 'nuke');
});

test('CoD Camo Challenges track PvP 1.0x vs Bot 0.35x and cascade Base -> Gold -> Diamond -> Dark Matter', () => {
  let state = LoadoutsSystem.createDefaultLoadoutState();

  // Bot kill counts 0.35x, PvP kill counts 1.0x
  const botKill = LoadoutsSystem.recordCombatKillForCamos(state, {
    weaponId: 'katana',
    isBot: true,
    isHeadshot: false,
    isAirborne: true,
    distance: 4,
    speed: 18,
    streakCount: 1,
    isKatanaDash: true,
    isDeflectKill: false
  });
  assert.equal(botKill.state.camoProgress.katana.kills, 0.35);
  assert.equal(botKill.state.camoProgress.katana.airKills, 0.35);
  assert.equal(botKill.state.camoProgress.katana.signature, 0.35);

  const pvpKill = LoadoutsSystem.recordCombatKillForCamos(botKill.state, {
    weaponId: 'katana',
    isBot: false,
    isHeadshot: false,
    isAirborne: false,
    distance: 6,
    speed: 10,
    streakCount: 3,
    isKatanaDash: false,
    isDeflectKill: true
  });
  assert.equal(pvpKill.state.camoProgress.katana.kills, 1.35);
  assert.equal(pvpKill.state.camoProgress.katana.streaks, 1);

  // Locked camo cannot be equipped
  const lockedEq = LoadoutsSystem.equipWeaponCamo(pvpKill.state, 'katana', 'camo_gold');
  assert.equal(lockedEq.ok, false);
  assert.equal(lockedEq.reason, 'locked');

  // Complete all 6 Base Camos on katana -> unlocks Gold AND Diamond (only weapon in melee class)
  state = pvpKill.state;
  for (const ch of LoadoutsSystem.CAMO_CHALLENGES) {
    state.camoProgress.katana[ch.id] = ch.target;
  }
  const katanaStatus = LoadoutsSystem.getWeaponCamoStatus(state, 'katana');
  assert.equal(katanaStatus.baseUnlockedCount, 6);
  assert.equal(katanaStatus.goldUnlocked, true);
  assert.equal(katanaStatus.diamondUnlocked, true);
  assert.equal(katanaStatus.darkMatterUnlocked, false);

  // Equip Gold camo and verify serialization in cloud payload
  const eqGold = LoadoutsSystem.equipWeaponCamo(state, 'katana', 'camo_gold');
  assert.equal(eqGold.ok, true);
  const payload = LoadoutsSystem.toCloudLoadoutsPayload(eqGold.state, 'uid_camo');
  assert.equal(payload.equippedWeaponCamos.katana, 'camo_gold');
  assert.equal(payload.camoProgress.katana.kills, LoadoutsSystem.CAMO_CHALLENGES[0].target);

  // Completing all base camos across all 19 weapons unlocks Dark Matter
  for (const wid of LoadoutsSystem.WEAPON_IDS) {
    for (const ch of LoadoutsSystem.CAMO_CHALLENGES) {
      eqGold.state.camoProgress[wid][ch.id] = ch.target;
    }
  }
  const dmStatus = LoadoutsSystem.getWeaponCamoStatus(eqGold.state, 'rifle');
  assert.equal(dmStatus.darkMatterUnlocked, true);
  const eqDm = LoadoutsSystem.equipWeaponCamo(eqGold.state, 'rifle', 'camo_dark_matter');
  assert.equal(eqDm.ok, true);
});

test('Ronin & Cyber Case rolls valid drops and firestore.rules allows all new weapons, skins, camos, and scorestreaks', () => {
  assert.ok(KnivesSystem.CASES.ronin);
  assert.equal(KnivesSystem.getCasePrice('ronin'), 450);

  const rng = makeRng(2026);
  let sawWeapon = false;
  let sawGold = false;
  for (let i = 0; i < 200; i++) {
    const roll = KnivesSystem.rollCaseDrop('ronin', rng);
    if (KnivesSystem.isWeaponItem(roll.winner)) sawWeapon = true;
    if (roll.winner.rarity === 'gold') sawGold = true;
  }
  assert.equal(sawWeapon, true);
  assert.equal(sawGold, true);

  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.ok(rules.includes("'ronin'"));
  assert.ok(rules.includes("'camo_dark_matter'"));
  assert.ok(rules.includes("'reactive_overdrive'"));
  assert.ok(rules.includes("'reactive_oni'"));
  assert.ok(rules.includes('camoProgress'));
  assert.ok(rules.includes('equippedWeaponCamos'));
  assert.ok(rules.includes('scorestreakId'));
  for (const sid of LoadoutsSystem.SCORESTREAK_IDS) {
    assert.ok(rules.includes(`'${sid}'`), `Expected scorestreak '${sid}' in firestore.rules`);
  }
});
