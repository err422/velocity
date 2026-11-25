const test = require('node:test');
const assert = require('node:assert/strict');
const CombatSystem = require('../src/systems/combat/combatSystem.js');

test('ADS progress cannot move back toward hip-fire while aim remains held', () => {
  let progress = 0;
  for (let i = 0; i < 90; i++) {
    const next = CombatSystem.advanceAdsProgress(progress, true, 1 / 60, 0.20);
    assert.ok(next >= progress, 'held ADS must never reverse toward hip-fire');
    progress = next;
  }
  assert.equal(progress, 1);

  const released = CombatSystem.advanceAdsProgress(progress, false, 1 / 60, 0.20);
  assert.ok(released < progress, 'releasing aim should return toward hip-fire');
});

test('computeGauntletSummary gives CLEAN RUN (+0.0s) when all targets hit and +1.0s per missed target', () => {
  const clean = CombatSystem.computeGauntletSummary(18.42, 6, 6);
  assert.equal(clean.cleanRun, true);
  assert.equal(clean.missed, 0);
  assert.equal(clean.penaltySec, 0);
  assert.equal(clean.finalTime, 18.42);

  const twoMissed = CombatSystem.computeGauntletSummary(18.42, 4, 6);
  assert.equal(twoMissed.cleanRun, false);
  assert.equal(twoMissed.missed, 2);
  assert.equal(twoMissed.penaltySec, 2.0);
  assert.equal(Number(twoMissed.finalTime.toFixed(2)), 20.42);

  const noneHit = CombatSystem.computeGauntletSummary(15.0, 0, 5);
  assert.equal(noneHit.missed, 5);
  assert.equal(noneHit.penaltySec, 5.0);
  assert.equal(noneHit.finalTime, 20.0);

  // Clamping edge case: hits > total never yields negative penalty
  const over = CombatSystem.computeGauntletSummary(12.5, 9, 5);
  assert.equal(over.missed, 0);
  assert.equal(over.penaltySec, 0);
  assert.equal(over.finalTime, 12.5);
});

test('evaluateDuelRoundResult enforces First to 5 rounds victory threshold', () => {
  const mid = CombatSystem.evaluateDuelRoundResult({ a: 2, b: 2 }, 'a', 5);
  assert.equal(mid.isMatchOver, false);
  assert.equal(mid.matchWinner, null);
  assert.equal(mid.scores.a, 3);

  const p1Win = CombatSystem.evaluateDuelRoundResult({ a: 4, b: 4 }, 'a', 5);
  assert.equal(p1Win.isMatchOver, true);
  assert.equal(p1Win.matchWinner, 'a');

  const p2Win = CombatSystem.evaluateDuelRoundResult({ a: 1, b: 4 }, 'b', 5);
  assert.equal(p2Win.isMatchOver, true);
  assert.equal(p2Win.matchWinner, 'b');
});

test('evaluateFfaScoreboard ranks players by kills then deaths and detects 15-kill winner', () => {
  const active = CombatSystem.evaluateFfaScoreboard({
    u1: { uid: 'u1', name: 'Alpha', kills: 8, deaths: 4 },
    u2: { uid: 'u2', name: 'Bravo', kills: 12, deaths: 5 },
    u3: { uid: 'u3', name: 'Charlie', kills: 8, deaths: 2 }
  }, 15);
  assert.equal(active.isMatchOver, false);
  assert.equal(active.matchWinner, null);
  assert.deepEqual(active.scoreboard.map((r) => r.uid), ['u2', 'u3', 'u1']);

  const done = CombatSystem.evaluateFfaScoreboard({
    u1: { uid: 'u1', name: 'Alpha', kills: 15, deaths: 6 },
    u2: { uid: 'u2', name: 'Bravo', kills: 14, deaths: 3 }
  }, 15);
  assert.equal(done.isMatchOver, true);
  assert.equal(done.matchWinner, 'u1');
});

test('CombatSystem exposes 3-slot loadout model (primary, secondary, melee) and default thresholds', () => {
  assert.deepEqual(CombatSystem.SLOTS, ['primary', 'secondary', 'melee']);
  assert.equal(CombatSystem.MISSED_TARGET_PENALTY_SEC, 1.0);
  assert.equal(CombatSystem.DUEL_WIN_ROUNDS, 5);
  assert.equal(CombatSystem.FFA_WIN_KILLS, 15);
});

test('chooseBotMovementIntent uses distance, ammo, and varied combat choices', () => {
  const choose = CombatSystem.chooseBotMovementIntent;
  assert.equal(typeof choose, 'function');
  assert.equal(choose(40, 18, false, 0.5), 'advance');
  assert.equal(choose(4, 18, false, 0.5), 'disengage');
  assert.equal(choose(18, 18, true, 0.5), 'reload');
  assert.equal(choose(18, 18, false, 0.05), 'hold');
  assert.equal(choose(18, 18, false, 0.3), 'strafe');
  assert.equal(choose(18, 18, false, 0.7), 'reposition');
  assert.equal(choose(18, 18, false, 0.95), 'advance');
});

test('advanceTriggerCharge reaches 100% readyToFire at 0.20s and decocks cleanly on early release', () => {
  assert.equal(typeof CombatSystem.advanceTriggerCharge, 'function');

  // Holding for 0.10s -> half charged, not ready
  const mid = CombatSystem.advanceTriggerCharge(0, true, 0.10, 0.20);
  assert.equal(mid.readyToFire, false);
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-6);

  // Releasing early decocks toward 0 without firing
  const decock = CombatSystem.advanceTriggerCharge(mid.progress, false, 0.05, 0.20);
  assert.equal(decock.readyToFire, false);
  assert.ok(decock.progress < mid.progress);

  // Full 0.20s hold triggers readyToFire
  let p = 0;
  let fired = false;
  for (let i = 0; i < 20; i++) {
    const res = CombatSystem.advanceTriggerCharge(p, true, 0.01, 0.20);
    p = res.progress;
    if (res.readyToFire) { fired = true; break; }
  }
  assert.equal(fired, true);
  assert.equal(p, 1);
});

test('stepShellReload loads 6 rounds one by one and supports mid-reload interrupt', () => {
  assert.equal(typeof CombatSystem.stepShellReload, 'function');
  const build = {
    magSize: 6,
    shellOpenTime: 0.30,
    shellInsertTime: 0.35,
    shellCloseTime: 0.25
  };

  // Full reload from 3 -> 6 rounds
  let st = { phase: 'open', timer: 0.30, duration: 0.30, interruptQueued: false };
  let ammo = 3;
  let insertedCount = 0;
  let closeTriggered = false;
  let done = false;

  for (let step = 0; step < 60 && !done; step++) {
    const res = CombatSystem.stepShellReload(st, 0.05, build, ammo);
    st = { phase: res.phase, timer: res.timer, duration: res.duration, interruptQueued: st.interruptQueued };
    ammo = res.ammo;
    if (res.shellInserted) insertedCount++;
    if (res.event === 'close_start') closeTriggered = true;
    if (res.done) done = true;
  }
  assert.equal(done, true);
  assert.equal(ammo, 6);
  assert.equal(insertedCount, 3);
  assert.equal(closeTriggered, true);

  // Mid-reload interrupt after 1 shell inserted from 0 -> snaps straight to close with 1 round chambered
  let st2 = { phase: 'open', timer: 0.30, duration: 0.30, interruptQueued: true };
  let ammo2 = 0;
  let done2 = false;
  for (let step = 0; step < 40 && !done2; step++) {
    const res = CombatSystem.stepShellReload(st2, 0.05, build, ammo2);
    st2 = { phase: res.phase, timer: res.timer, duration: res.duration, interruptQueued: st2.interruptQueued };
    ammo2 = res.ammo;
    if (res.done) done2 = true;
  }
  assert.equal(done2, true);
  assert.equal(ammo2, 1, 'Interrupting from 0 ammo must finish loading at least 1 round before snapping crane shut');
});

test('netcode.js fires onLocalKill for active host/client Arena matches instead of checking undefined state.isOnline', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'combat', 'netcode.js'), 'utf8');
  assert.ok(!src.includes('state.isOnline'), 'netcode.js must not check nonexistent state.isOnline property');
  assert.ok(src.includes("state.role === 'host' || state.role === 'client'"), 'netcode.js should check active host/client role before invoking onLocalKill');
});

test('AVATAR_HITBOX covers full leg-to-shoulder body volume and generous spherical head', () => {
  const hb = CombatSystem.AVATAR_HITBOX;
  assert.ok(hb, 'AVATAR_HITBOX should be exported');
  // Full-body cylinder starts at feet (~0) and extends to top of torso (~1.5m) with >1m diameter
  const bodyBottom = hb.bodyCenterY - hb.bodyHeight / 2;
  const bodyTop = hb.bodyCenterY + hb.bodyHeight / 2;
  assert.ok(bodyBottom <= 0.02, 'body hitbox must cover legs down to feet');
  assert.ok(bodyTop >= 1.48, 'body hitbox must cover full torso and shoulders');
  assert.ok(hb.bodyRadiusTop >= 0.52 && hb.bodyRadiusBottom >= 0.48, 'body hitbox must be wide and rotation-invariant');
  assert.ok(hb.headRadius >= 0.34, 'head hitbox radius should be generous');
});

test('pickBestDynamicHit prioritizes same-target head hitbox over overlapping body graze and respects wall occlusion', () => {
  const pick = CombatSystem.pickBestDynamicHit;
  assert.equal(typeof pick, 'function');

  // Same remote player: ray clips upper chest cylinder slightly before head sphere -> upgrades to head
  const sameTargetHits = [
    { distance: 12.0, object: { userData: { remoteUid: 'p1', hitbox: 'body' } } },
    { distance: 12.22, object: { userData: { remoteUid: 'p1', hitbox: 'head' } } }
  ];
  const chosen = pick(sameTargetHits, 30);
  assert.equal(chosen.object.userData.hitbox, 'head');

  // Different targets: never skips a closer opponent body to hit a farther opponent head
  const twoTargetHits = [
    { distance: 10.0, object: { userData: { remoteUid: 'p1', hitbox: 'body' } } },
    { distance: 10.3, object: { userData: { remoteUid: 'p2', hitbox: 'head' } } }
  ];
  const chosenNear = pick(twoTargetHits, 30);
  assert.equal(chosenNear.object.userData.remoteUid, 'p1');
  assert.equal(chosenNear.object.userData.hitbox, 'body');

  // Wall occlusion blocks hits behind geometry
  assert.equal(pick(sameTargetHits, 8.0), null);
});



