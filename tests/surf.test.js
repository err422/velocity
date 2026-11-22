const test = require('node:test');
const assert = require('node:assert/strict');
const Surf = require('../js/surf.js');
const Daily = require('../js/daily.js');

test('classifySurfaceNormal separates ground, CS surf slopes, walls, and ceilings accurately', () => {
  const cfg = Surf.DEFAULT_CFG;
  // Flat ground and gentle ramp
  assert.equal(Surf.classifySurfaceNormal(1.0, cfg, false), 'ground');
  assert.equal(Surf.classifySurfaceNormal(0.75, cfg, false), 'ground');
  // 50-degree CS surf ramp: cos(50 deg) ~= 0.6428
  assert.equal(Surf.classifySurfaceNormal(Math.cos((50 * Math.PI) / 180), cfg, true), 'surf');
  assert.equal(Surf.classifySurfaceNormal(0.45, cfg, true), 'surf');
  // Vertical wall-run wall
  assert.equal(Surf.classifySurfaceNormal(0.0, cfg, false), 'wall');
  assert.equal(Surf.classifySurfaceNormal(0.15, cfg, false), 'wall');
  // Surf solids must never be misclassified as wall-runnable walls
  assert.equal(Surf.classifySurfaceNormal(0.2, cfg, true), 'surf');
  // Underside ceiling
  assert.equal(Surf.classifySurfaceNormal(-0.8, cfg, false), 'ceiling');
});

test('resolveSurfLocalNormal clamps curved-ramp seam end-cap hits to analytical top normal', () => {
  const half = { x: 5.5, y: 0.55, z: 4.0 };
  const radius = 0.45;
  // Player gliding on top surface across a segment end seam (large localN.z backward normal)
  const seamHit = Surf.resolveSurfLocalNormal(
    { x: 1.2, y: 0.88, z: -4.1 },
    { x: 0.0, y: 0.12, z: -0.99 },
    half,
    radius,
    true
  );
  assert.equal(seamHit.useAnalytical, true);
  assert.deepEqual({ x: seamHit.nx, y: seamHit.ny, z: seamHit.nz }, { x: 0, y: 1, z: 0 });

  // Non-surf solid should never be overridden
  const nonSurf = Surf.resolveSurfLocalNormal(
    { x: 1.2, y: 0.88, z: -4.1 },
    { x: 0.0, y: 0.12, z: -0.99 },
    half,
    radius,
    false
  );
  assert.equal(nonSurf.useAnalytical, false);

  // Hitting the underside of a surf ramp should NOT snap to top face
  const underside = Surf.resolveSurfLocalNormal(
    { x: 0, y: -0.9, z: 0 },
    { x: 0, y: -1, z: 0 },
    half,
    radius,
    true
  );
  assert.equal(underside.useAnalytical, false);
});

test('computeWedgeFrame builds right-handed orthonormal faces at exact 50 deg surf slope', () => {
  const frame = Surf.computeWedgeFrame([0, 40, 0], [0, 30, 60], {
    faceWidth: 11,
    slopeDeg: 50,
    side: 'both'
  });
  assert.equal(frame.faces.length, 2);

  for (const f of frame.faces) {
    // Normal must be strictly orthogonal to spine forward axis F
    const dotNF = f.normal.x * frame.F.x + f.normal.y * frame.F.y + f.normal.z * frame.F.z;
    assert.ok(Math.abs(dotNF) < 1e-6, `Expected normal orthogonal to F, got ${dotNF}`);

    // Normal Y must sit squarely inside CS surf slope band
    assert.equal(Surf.classifySurfaceNormal(f.normal.y, Surf.DEFAULT_CFG, true), 'surf');

    // Basis determinant (xAxis x yAxis) . zAxis must be +1 (right-handed)
    const cx = f.xAxis.y * f.yAxis.z - f.xAxis.z * f.yAxis.y;
    const cy = f.xAxis.z * f.yAxis.x - f.xAxis.x * f.yAxis.z;
    const cz = f.xAxis.x * f.yAxis.y - f.xAxis.y * f.yAxis.x;
    const det = cx * f.zAxis.x + cy * f.zAxis.y + cz * f.zAxis.z;
    assert.ok(Math.abs(det - 1) < 1e-6, `Expected right-handed det=+1, got ${det}`);
  }
});

test('headless 120Hz surf simulation glides across 12-segment curved surf ramp without ramp-bug snag', () => {
  const curve = Surf.computeCurveSegments({
    start: [0, 21, 0],
    yawStart: 0,
    yawDelta: Math.PI / 3,
    radius: 72,
    pitchDrop: -10,
    segments: 12,
    overlap: 0.45
  });

  // Collect all left-face slabs along the 60-degree curved surf ramp
  const faces = [];
  for (const seg of curve.segments) {
    const wf = Surf.computeWedgeFrame(seg.a, seg.b, {
      faceWidth: 12,
      slopeDeg: 50,
      side: 'left',
      extendStart: seg.extendStart,
      extendEnd: seg.extendEnd
    });
    faces.push(wf.faces[0]);
  }

  // Place player cleanly on the upper-middle of segment 0's left face, moving forward at 28 u/s
  const f0 = faces[0];
  const startPos = {
    x: f0.center.x + f0.normal.x * (f0.thick * 0.5 + 0.55) - f0.zAxis.x * (f0.length * 0.35),
    y: f0.center.y + f0.normal.y * (f0.thick * 0.5 + 0.55) - f0.zAxis.y * (f0.length * 0.35) - 0.45,
    z: f0.center.z + f0.normal.z * (f0.thick * 0.5 + 0.55) - f0.zAxis.z * (f0.length * 0.35)
  };
  const startVel = { x: 0, y: -2, z: 28 };

  // Continuously look along the curve tangent and hold D (strafe right into the left-hand ramp face)
  const sim = Surf.simulateSurfOnFaces(
    faces,
    startPos,
    startVel,
    (_t, pos) => {
      const ang = Math.atan2(pos.z, 72 - pos.x);
      const yaw = Math.min(Math.PI / 3, Math.max(0, ang));
      return { wish: { x: -Math.cos(yaw), z: Math.sin(yaw) } };
    },
    180 // 1.5 seconds of curved surfing across 7+ consecutive segments
  );

  assert.ok(sim.surfTicks > 150, `Expected sustained surf contact, got ${sim.surfTicks}/180 ticks`);
  assert.ok(sim.minSpeed >= 28.0, `Expected zero ramp-bug speed stall, minSpeed was ${sim.minSpeed.toFixed(2)}`);
  assert.ok(sim.maxSpeed > 30.5, `Expected downhill surf speed gain > 30.5 u/s, got ${sim.maxSpeed.toFixed(2)}`);
  assert.ok(sim.pos.x > 12, `Expected curved ramp to deflect player smoothly along +X arc, got x=${sim.pos.x.toFixed(2)}`);
});

test('daily generator produces real deterministic CS surf wedges and curved surf sweeps across seeds', () => {
  const dates = Daily.getRecentDateKeys(45, new Date('2026-11-22T12:00:00Z'));
  let wedgeCount = 0;
  let curveCount = 0;

  for (const dk of dates) {
    const seed = Daily.canonicalDailySeed(dk);
    const bp = Daily.generateCourseBlueprint(seed, { dateKey: dk });
    wedgeCount += bp.surfWedges.length;
    curveCount += bp.surfCurves.length;
    if (bp.meta.mechanics.includes('surf')) {
      assert.ok(
        bp.surfWedges.length + bp.surfCurves.length > 0,
        `${dk}: surf mechanic must emit CS surfWedges or surfCurves`
      );
    }
  }

  assert.ok(wedgeCount > 0, 'Expected CS surf wedges across daily seeds');
  assert.ok(curveCount > 0, 'Expected curved CS surf sweeps across daily seeds');
});
