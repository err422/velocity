const test = require('node:test');
const assert = require('node:assert/strict');
const CombatSystem = require('../js/combat.js');

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
