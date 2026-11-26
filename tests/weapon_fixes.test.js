const test = require('node:test');
const assert = require('node:assert/strict');

const LoadoutsSystem = require('../src/weapons/firearms/specs.js');
const CombatSystem = require('../src/systems/combat/combatSystem.js');

test('MK-14 Marksman resolves built-in ACOG scope as a real scoped optic', () => {
  const dmr = LoadoutsSystem.resolveWeaponBuild('dmr', {});
  assert.equal(dmr.opticType, 'acog');
  assert.equal(dmr.isScopedOptic, true);
  assert.ok(dmr.adsZoom >= 2.4, `Expected MK-14 zoom >= 2.4x, got ${dmr.adsZoom}`);
  assert.ok(dmr.adsFovMul < 0.7, `Expected zoomed FOV multiplier on MK-14, got ${dmr.adsFovMul}`);
});

test('SSG-08 Scout has brisk fire rate and stays scoped after firing while AWP unscopes', () => {
  const scout = LoadoutsSystem.resolveWeaponBuild('scout', {});
  const awp = LoadoutsSystem.resolveWeaponBuild('awp', {});
  assert.ok(scout.rpm >= 90, `Expected Scout RPM >= 90, got ${scout.rpm}`);
  assert.equal(scout.stayScopedOnFire, true);
  assert.equal(CombatSystem.shouldUnscopeOnFire('scout', scout), false);
  assert.equal(CombatSystem.shouldUnscopeOnFire('awp', awp), true);
});

test('F-33 Burst spec has 3-round burst and canFireWithCooldown allows burst follow-ups during burst cooldown', () => {
  const famas = LoadoutsSystem.resolveWeaponBuild('famas', {});
  assert.equal(famas.burstCount, 3);
  assert.ok(famas.burstDelay > 0 && famas.burstDelay < 0.12);
  assert.ok(famas.burstCooldown > famas.burstDelay);

  // Regular trigger pull is blocked while burstCooldown > 0, but burst follow-up shots #2 and #3 fire!
  assert.equal(CombatSystem.canFireWithCooldown(0.28, false), false);
  assert.equal(CombatSystem.canFireWithCooldown(0.28, true), true);
  assert.equal(CombatSystem.canFireWithCooldown(0, false), true);
});

test('RPG-7 blast radius and damage are buffed, Hyper-Rail has sustained 3s beam, and Nuke has type nuke', () => {
  const rpg = LoadoutsSystem.getScorestreakDef('rpg');
  assert.ok(rpg.splashRadius >= 11.0, `Expected RPG splashRadius >= 11, got ${rpg.splashRadius}`);
  assert.ok(rpg.maxDamage >= 220, `Expected RPG maxDamage >= 220, got ${rpg.maxDamage}`);

  const rail = LoadoutsSystem.getScorestreakDef('railcannon');
  assert.ok(rail.beamDurationSec >= 2.8, `Expected Hyper-Rail beamDurationSec >= 2.8, got ${rail.beamDurationSec}`);
  assert.ok(rail.beamTickDamage >= 30);
  assert.ok(rail.beamRadius >= 0.8);

  const nuke = LoadoutsSystem.getScorestreakDef('nuke');
  assert.equal(nuke.type, 'nuke');
  assert.equal(nuke.isTacticalNuke, true);
});

test('Hyper-Rail point-to-segment distance accurately detects targets walking into beam', () => {
  // Beam along X from (0, 2, 0) to (20, 2, 0)
  const hitMid = CombatSystem.pointToSegmentDistanceSq(10, 2.5, 0.3, 0, 2, 0, 20, 2, 0);
  assert.ok(Math.abs(hitMid - (0.25 + 0.09)) < 1e-6);

  // Target past endpoint clamps to (20, 2, 0)
  const pastEnd = CombatSystem.pointToSegmentDistanceSq(23, 2, 0, 0, 2, 0, 20, 2, 0);
  assert.ok(Math.abs(pastEnd - 9) < 1e-6);

  // Target before start clamps to (0, 2, 0)
  const beforeStart = CombatSystem.pointToSegmentDistanceSq(-2, 2, 0, 0, 2, 0, 20, 2, 0);
  assert.ok(Math.abs(beforeStart - 4) < 1e-6);
});

test('Tactical Nuke target filter kills all hostiles while sparing caster and teammates', () => {
  const players = [
    { uid: 'u1', team: 'alpha', alive: true },
    { uid: 'u2', team: 'alpha', alive: true },
    { uid: 'u3', team: 'bravo', alive: true },
    { uid: 'u4', team: 'bravo', alive: false },
    { uid: 'u5', team: '', alive: true }
  ];

  // Team mode: spares u1 (caster) and u2 (teammate), ignores dead u4, kills u3 and u5
  const teamVictims = CombatSystem.filterNukeTargets(players, 'u1', 'alpha').map((p) => p.uid);
  assert.deepEqual(teamVictims, ['u3', 'u5']);

  // FFA mode (no team): spares u1 (caster), kills every other alive player
  const ffaVictims = CombatSystem.filterNukeTargets(players, 'u1', '').map((p) => p.uid);
  assert.deepEqual(ffaVictims, ['u2', 'u3', 'u5']);
});
