const test = require('node:test');
const assert = require('node:assert/strict');
const Surf = require('../src/core/physics.js');
const Daily = require('../src/maps/daily.js');

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

test('computeSpiralSegments generates continuous helical corkscrews with tapered radius', () => {
  const sp = Surf.computeSpiralSegments({
    start: [0, 80, 0],
    yawStart: 0,
    yawDelta: Math.PI * 3,
    radiusStart: 56,
    radiusEnd: 40,
    pitchDrop: -42,
    segments: 27,
    overlap: 0.55
  });
  assert.equal(sp.segments.length, 27);
  assert.ok(Math.abs(sp.end[1] - 38) < 1e-4, `Expected end Y ~38, got ${sp.end[1]}`);
  assert.ok(Math.abs(sp.endYaw - Math.PI * 3) < 1e-5, `Expected endYaw 3π, got ${sp.endYaw}`);
  // Adjacent segments must share exact spine endpoints
  for (let i = 1; i < sp.segments.length; i++) {
    const prevB = sp.segments[i - 1].b;
    const curA = sp.segments[i].a;
    assert.ok(Math.hypot(prevB[0] - curA[0], prevB[1] - curA[1], prevB[2] - curA[2]) < 1e-5);
  }
});

test('computeSCurveSegments chains opposing-yaw sweeps cleanly', () => {
  const sc = Surf.computeSCurveSegments({
    start: [0, 50, 0],
    yawStart: 0,
    yawDelta: Math.PI / 3,
    radius: 60,
    pitchDrop: -16,
    gap: 6,
    gapDrop: -1.5,
    segmentsPerArc: 10
  });
  assert.equal(sc.first.segments.length, 10);
  assert.equal(sc.second.segments.length, 10);
  assert.equal(sc.segments.length, 20);
  assert.ok(Math.abs(sc.endYaw) < 1e-5, `Opposing equal arcs should exit at yaw ~0, got ${sc.endYaw}`);
  assert.ok(Math.abs(sc.end[1] - (50 - 16 - 1.5)) < 1e-4, `Expected end Y 32.5, got ${sc.end[1]}`);
});

test('computeChannelSegments emits opposing twin surf walls and computeFlickSpec emits upward launch ramp', () => {
  const ch = Surf.computeChannelSegments([0, 30, 0], [0, 20, 70], { halfGap: 8 });
  assert.equal(ch.leftWall.side, 'right');
  assert.equal(ch.rightWall.side, 'left');
  // Opposing spines separated by 2 * halfGap = 16
  const sep = Math.hypot(ch.rightWall.a[0] - ch.leftWall.a[0], ch.rightWall.a[2] - ch.leftWall.a[2]);
  assert.ok(Math.abs(sep - 16) < 1e-4, `Expected separation 16, got ${sep}`);

  const flick = Surf.computeFlickSpec({ start: [0, 20, 0], yaw: 0, length: 24, rise: 11, faceWidth: 11 });
  assert.equal(flick.a[1], 20);
  assert.equal(flick.b[1], 31);
  assert.ok(Math.abs(flick.b[2] - 24) < 1e-4);
});

test('headless 120Hz surf simulation glides smoothly through a 360-degree helical spiral without snagging', () => {
  const sp = Surf.computeSpiralSegments({
    start: [0, 70, 0],
    yawStart: 0,
    yawDelta: Math.PI * 2,
    radiusStart: 78,
    radiusEnd: 78,
    pitchDrop: -44,
    segments: 32,
    overlap: 0.65
  });
  const faces = sp.segments.map((seg) =>
    Surf.computeWedgeFrame(seg.a, seg.b, {
      faceWidth: 14,
      slopeDeg: 50,
      side: 'left',
      extendStart: seg.extendStart,
      extendEnd: seg.extendEnd
    }).faces[0]
  );

  const f0 = faces[0];
  const startPos = {
    x: f0.center.x + f0.normal.x * (f0.thick * 0.5 + 0.55) - f0.zAxis.x * (f0.length * 0.3),
    y: f0.center.y + f0.normal.y * (f0.thick * 0.5 + 0.55) - f0.zAxis.y * (f0.length * 0.3) - 0.45,
    z: f0.center.z + f0.normal.z * (f0.thick * 0.5 + 0.55) - f0.zAxis.z * (f0.length * 0.3)
  };
  const startVel = { x: 0, y: -2, z: 26 };

  const sim = Surf.simulateSurfOnFaces(
    faces,
    startPos,
    startVel,
    (_t, pos) => {
      // Spiral center is at (+78, y, 0); left face normal points inward toward center,
      // so pressing outward (-dx, -dz) holds the player against the banked spiral face.
      const dx = 78 - pos.x;
      const dz = 0 - pos.z;
      const len = Math.hypot(dx, dz) || 1;
      return { wish: { x: -dx / len, z: -dz / len } };
    },
    220
  );

  assert.ok(sim.surfTicks > 180, `Expected sustained spiral surf contact, got ${sim.surfTicks}/220 ticks`);
  assert.ok(sim.minSpeed >= 26.0, `Expected zero spiral seam stall, minSpeed was ${sim.minSpeed.toFixed(2)}`);
  assert.ok(sim.maxSpeed > 26.5, `Expected spiral speed gain > 26.5 u/s, got ${sim.maxSpeed.toFixed(2)}`);
  assert.ok(sim.pos.x > 10, `Expected helical spiral to curve player along +X arc, got x=${sim.pos.x.toFixed(2)}`);
  assert.ok(sim.pos.z > 30, `Expected sustained forward travel across spiral segments, got z=${sim.pos.z.toFixed(2)}`);
});

test('CourseCatalog defines 12 CS surf maps (T1-T4, Linear & Staged) and 4 Time Trials with valid metadata', () => {
  const CourseCatalog = require('../src/maps/courses.js');
  const all = CourseCatalog.COURSE_CATALOG;
  const surfMaps = CourseCatalog.getCoursesByCategory('surf');
  const timeTrials = CourseCatalog.getCoursesByCategory('timetrial');

  assert.ok(surfMaps.length >= 12, `Expected at least 12 surf maps, got ${surfMaps.length}`);
  assert.ok(timeTrials.length >= 4, `Expected at least 4 time trials, got ${timeTrials.length}`);
  assert.equal(all.length, surfMaps.length + timeTrials.length);

  // Backward compatibility IDs
  assert.ok(CourseCatalog.getCourseMeta('surf1'), 'surf1 must remain registered');
  assert.ok(CourseCatalog.getCourseMeta('course1'), 'course1 must remain registered');

  // Every tier 1..4 must be represented in surf maps, and both linear and staged formats
  for (const tier of [1, 2, 3, 4]) {
    assert.ok(surfMaps.some((m) => m.tier === tier), `Surf maps must include Tier ${tier}`);
    assert.ok(CourseCatalog.TIER_INFO[tier].color, `Tier ${tier} must specify a display color`);
  }
  assert.ok(surfMaps.filter((m) => m.format === 'linear').length >= 6);
  assert.ok(surfMaps.filter((m) => m.format === 'staged').length >= 4);

  const ids = new Set();
  for (const c of all) {
    assert.ok(!ids.has(c.id), `Duplicate course id ${c.id}`);
    ids.add(c.id);
    assert.equal(typeof c.build, 'function', `${c.id} must have a build function`);
    assert.ok(c.parGold > 0 && c.parSilver > c.parGold, `${c.id} parSilver must exceed parGold`);
    assert.ok(Array.isArray(c.pieces) && c.pieces.length >= 2, `${c.id} should list signature pieces`);
    assert.equal(CourseCatalog.getCourseMedal(c, c.parGold - 0.5), 'GOLD');
    assert.equal(CourseCatalog.getCourseMedal(c, c.parGold + 1.0), 'SILVER');
    assert.equal(CourseCatalog.getCourseMedal(c, c.parSilver + 5.0), 'BRONZE');
    assert.equal(CourseCatalog.getCourseMedal(c, 0), null);
  }
});

