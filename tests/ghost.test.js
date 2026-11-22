const test = require('node:test');
const assert = require('node:assert/strict');
const Ghost = require('../js/ghost.js');

test('lerpAngle wraps cleanly across PI / -PI boundary', () => {
  const a = Math.PI - 0.1;
  const b = -Math.PI + 0.1;
  const mid = Ghost.normalizeAngle(Ghost.lerpAngle(a, b, 0.5));
  assert.ok(Math.abs(Math.abs(mid) - Math.PI) < 1e-6, `expected near ±PI, got ${mid}`);

  const quarter = Ghost.normalizeAngle(Ghost.lerpAngle(-Math.PI + 0.2, Math.PI - 0.2, 0.5));
  assert.ok(Math.abs(Math.abs(quarter) - Math.PI) < 1e-6);
});

test('packFlags and unpackFlags round-trip stance bits', () => {
  const bits = Ghost.packFlags({ low: true, wallrun: false, grounded: true });
  assert.deepEqual(Ghost.unpackFlags(bits), { low: true, wallrun: false, grounded: true });

  const allOff = Ghost.packFlags({ low: false, wallrun: false, grounded: false });
  assert.deepEqual(Ghost.unpackFlags(allOff), { low: false, wallrun: false, grounded: false });
});

test('recorder samples at 30 Hz and finalizes exact finish frame', () => {
  const rec = Ghost.createRecorder('course1');
  assert.equal(Ghost.recordSample(rec, 0, { pos: { x: 0, y: 0, z: 8 }, yaw: Math.PI, low: false, wallrun: false, grounded: true, roll: 0 }), true);
  // Too soon for next 30Hz sample (1/120s later)
  assert.equal(Ghost.recordSample(rec, 1 / 120, { pos: { x: 0, y: 0, z: 8.2 }, yaw: Math.PI, low: false, wallrun: false, grounded: true, roll: 0 }), false);
  // At 1/30s later, should capture
  assert.equal(Ghost.recordSample(rec, 1 / 30, { pos: { x: 0, y: 0, z: 9 }, yaw: Math.PI, low: true, wallrun: false, grounded: true, roll: 0 }), true);

  const finalized = Ghost.finalizeRecording(rec, 0.095, { pos: { x: 1, y: 2, z: 12 }, yaw: 2.9, low: false, wallrun: true, grounded: false, roll: 0.12 });
  assert.ok(finalized);
  assert.equal(finalized.courseId, 'course1');
  assert.equal(finalized.duration, 0.095);
  assert.equal(finalized.frames.length, 3);
  assert.equal(finalized.frames[2][0], 0.095);
  assert.equal(finalized.frames[2][3], 12);
});

test('sampleGhost interpolates positions, yaw, roll, and clamps past finish', () => {
  const ghost = {
    v: 1,
    courseId: 'course1',
    duration: 2.0,
    frames: [
      [0, 0, 0, 0, 0, Ghost.packFlags({ grounded: true }), 0],
      [1, 10, 4, 20, Math.PI / 2, Ghost.packFlags({ low: true, grounded: true }), 0.2],
      [2, 20, 4, 40, Math.PI, Ghost.packFlags({ wallrun: true }), -0.1]
    ]
  };

  const p0 = Ghost.sampleGhost(ghost, -0.5);
  assert.equal(p0.x, 0);
  assert.equal(p0.finished, false);

  const pMid = Ghost.sampleGhost(ghost, 0.5);
  assert.ok(Math.abs(pMid.x - 5) < 1e-6);
  assert.ok(Math.abs(pMid.y - 2) < 1e-6);
  assert.ok(Math.abs(pMid.z - 10) < 1e-6);
  assert.ok(Math.abs(pMid.yaw - Math.PI / 4) < 1e-6);
  assert.ok(Math.abs(pMid.roll - 0.1) < 1e-6);
  assert.equal(pMid.finished, false);

  const pEnd = Ghost.sampleGhost(ghost, 3.5);
  assert.equal(pEnd.x, 20);
  assert.equal(pEnd.z, 40);
  assert.equal(pEnd.finished, true);
});

test('serializeGhost and deserializeGhost validate schema and courseId', () => {
  const rec = Ghost.createRecorder('course1');
  Ghost.recordSample(rec, 0, { pos: { x: 0, y: 0, z: 8 }, yaw: 3.14, low: false, grounded: true, roll: 0 });
  const ghost = Ghost.finalizeRecording(rec, 1.5, { pos: { x: 0, y: 8, z: 50 }, yaw: 3.1, low: true, grounded: false, roll: 0, grapple: { x: 0, y: 16, z: 55 } });

  const json = Ghost.serializeGhost(ghost);
  assert.ok(typeof json === 'string');

  const decoded = Ghost.deserializeGhost(json, 'course1');
  assert.ok(decoded);
  assert.equal(decoded.courseId, 'course1');
  assert.equal(decoded.frames.length, 2);
  assert.deepEqual(Ghost.sampleGhost(decoded, 1.5).grapple, { x: 0, y: 16, z: 55 });

  // Wrong course rejected
  assert.equal(Ghost.deserializeGhost(json, 'course2'), null);
  // Corrupt JSON rejected
  assert.equal(Ghost.deserializeGhost('{bad', 'course1'), null);
  // Single-frame payload rejected
  assert.equal(Ghost.deserializeGhost(JSON.stringify({ v: 1, courseId: 'course1', frames: [[0, 0, 0, 0, 0, 0]] }), 'course1'), null);
});

test('selectGhostEntry chooses PB/LAST/OFF with fallback', () => {
  const pb = { v: 1, courseId: 'course1', duration: 10, frames: [[0, 0, 0, 0, 0, 0], [10, 0, 0, 10, 0, 0]] };
  const last = { v: 1, courseId: 'course1', duration: 12, frames: [[0, 0, 0, 0, 0, 0], [12, 0, 0, 10, 0, 0]] };

  assert.equal(Ghost.selectGhostEntry('pb', pb, last).kind, 'pb');
  assert.equal(Ghost.selectGhostEntry('last', pb, last).kind, 'last');
  assert.equal(Ghost.selectGhostEntry('pb', null, last).kind, 'last');
  assert.equal(Ghost.selectGhostEntry('off', pb, last).kind, 'off');
  assert.equal(Ghost.selectGhostEntry('pb', null, null).kind, 'none');
  assert.equal(Ghost.nextGhostMode('pb'), 'last');
  assert.equal(Ghost.nextGhostMode('last'), 'off');
  assert.equal(Ghost.nextGhostMode('off'), 'pb');
});
