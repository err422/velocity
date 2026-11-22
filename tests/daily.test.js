const test = require('node:test');
const assert = require('node:assert/strict');
const Daily = require('../js/daily.js');

test('canonicalDailySeed is deterministic and valid for any dateKey', () => {
  const s1 = Daily.canonicalDailySeed('2026-11-22');
  const s2 = Daily.canonicalDailySeed('2026-11-22');
  const s3 = Daily.canonicalDailySeed('2026-11-21');
  assert.equal(s1, s2);
  assert.notEqual(s1, s3);
  assert.match(s1, /^[A-Z0-9-]+$/);
});

test('generateCourseBlueprint is 100% deterministic for identical seeds', () => {
  const seed = Daily.canonicalDailySeed('2026-11-22');
  const a = Daily.generateCourseBlueprint(seed, { dateKey: '2026-11-22', id: 'daily_2026-11-22' });
  const b = Daily.generateCourseBlueprint(seed, { dateKey: '2026-11-22', id: 'daily_2026-11-22' });
  assert.deepEqual(a, b);
});

test('daily generator produces mixed length tiers (short, medium, long) and covers all movement mechanics', () => {
  const tiers = new Set();
  const mechanics = new Set();
  const dates = Daily.getRecentDateKeys(40, new Date('2026-11-22T12:00:00Z'));

  for (const dk of dates) {
    const seed = Daily.canonicalDailySeed(dk);
    const bp = Daily.generateCourseBlueprint(seed, { dateKey: dk });
    tiers.add(bp.meta.lengthTier);
    for (const m of bp.meta.mechanics) mechanics.add(m);

    // Segment count matches rolled tier bounds
    const spec = Daily.LENGTH_TIERS[bp.meta.lengthTier];
    assert.ok(
      bp.meta.segmentCount >= spec.minSegs && bp.meta.segmentCount <= spec.maxSegs,
      `${dk}: segmentCount ${bp.meta.segmentCount} outside ${spec.minSegs}..${spec.maxSegs}`
    );

    // Gate monotonicity along +Z and safe respawns above killY (-30)
    assert.ok(bp.gates.length >= 6, `${dk}: expected at least 6 gates`);
    assert.equal(bp.gates[0][2], 8, 'Gate 0 must be START at z=8');
    for (let i = 1; i < bp.gates.length; i++) {
      assert.ok(bp.gates[i][2] > bp.gates[i - 1][2], `${dk}: gate ${i} z must strictly increase`);
      if (bp.gates[i].length >= 7) {
        assert.ok(bp.gates[i][5] > -20, `${dk}: respawn y must be safely above killY`);
      }
    }
  }

  assert.equal(tiers.has('short'), true, 'Expected short courses across 40 days');
  assert.equal(tiers.has('medium'), true, 'Expected medium courses across 40 days');
  assert.equal(tiers.has('long'), true, 'Expected long courses across 40 days');

  for (const m of Daily.ALL_MECHANICS) {
    assert.equal(mechanics.has(m), true, `Expected mechanic "${m}" to appear across daily seeds`);
  }
});

test('normalizeCustomSeed strips invalid characters and caps length at 32', () => {
  assert.equal(Daily.normalizeCustomSeed('  apex 42!!  '), 'APEX-42');
  assert.equal(Daily.normalizeCustomSeed('a'.repeat(50)).length, 32);
  assert.equal(Daily.normalizeCustomSeed(''), '');
});

test('getRecentDateKeys returns consecutive UTC days in descending order', () => {
  const keys = Daily.getRecentDateKeys(3, new Date('2026-11-22T15:00:00Z'));
  assert.deepEqual(keys, ['2026-11-22', '2026-11-21', '2026-11-20']);
});
