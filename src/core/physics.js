// Counter-Strike style Surf Physics & Procedural Ramp Geometry Engine.
// Pure deterministic math (UMD: works in browser globals and Node unit tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SurfEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_CFG = {
    walkableY: 0.7,
    surfMinY: 0.32,
    wallMaxAbsY: 0.3,
    groundSpeed: 22,
    airWishCap: 2.75,
    airAccel: 15,
    surfWishCap: 2.75,
    surfAirAccel: 20,
    gravity: 26,
    radius: 0.45,
    skin: 0.02
  };

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function vSub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function vAdd(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function vScale(a, s) {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  }

  function vDot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function vCross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function vLen(a) {
    return Math.hypot(a.x, a.y, a.z);
  }

  function vNorm(a) {
    const l = vLen(a);
    if (l < 1e-9) return { x: 0, y: 1, z: 0 };
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  }

  /**
   * Classifies a world-space contact normal's Y component into 'ground', 'surf', 'wall', or 'ceiling'.
   */
  function classifySurfaceNormal(ny, cfg, isSurfSolid) {
    const c = cfg || DEFAULT_CFG;
    const walkY = c.walkableY != null ? c.walkableY : DEFAULT_CFG.walkableY;
    const surfMinY = c.surfMinY != null ? c.surfMinY : DEFAULT_CFG.surfMinY;
    const wallMaxAbsY = c.wallMaxAbsY != null ? c.wallMaxAbsY : DEFAULT_CFG.wallMaxAbsY;

    if (ny >= walkY) return 'ground';
    if (ny >= surfMinY) return 'surf';
    if (isSurfSolid && ny > 0.15) return 'surf';
    if (Math.abs(ny) < wallMaxAbsY && !isSurfSolid) return 'wall';
    return 'ceiling';
  }

  /**
   * Anti-ramp-bug seam resolver for surf slab OBBs.
   * For a surf slab whose local +Y is the analytical surf plane normal and local +Z is the ramp flow direction:
   * if a sphere gliding across the top surface clips an internal segment seam end-cap (large |localN.z|),
   * clamp the contact normal to local +Y (analytical surfNormal) so zero backward speed snag occurs.
   */
  function resolveSurfLocalNormal(localPos, localNormal, half, radius, isSurf) {
    if (!isSurf) {
      return { useAnalytical: false, nx: localNormal.x, ny: localNormal.y, nz: localNormal.z };
    }
    const nearTopFace = localPos.y > half.y - radius * 0.92;
    const withinFaceWidth = Math.abs(localPos.x) <= half.x + radius * 0.55;
    const isSeamEndHit = Math.abs(localNormal.z) > 0.22 && localNormal.y >= -0.05;
    const isUpperEdgeHit = localNormal.y > 0.35;

    if (nearTopFace && withinFaceWidth && (isSeamEndHit || isUpperEdgeHit)) {
      return { useAnalytical: true, nx: 0, ny: 1, nz: 0 };
    }
    return { useAnalytical: false, nx: localNormal.x, ny: localNormal.y, nz: localNormal.z };
  }

  /**
   * Authentic CS Source-style air-strafe acceleration calculation.
   * Returns horizontal delta velocity { dx, dz }.
   */
  function computeAirStrafeDelta(vel, wish, dt, cfg, isSurfing) {
    const c = cfg || DEFAULT_CFG;
    const wishCap = isSurfing
      ? (c.surfWishCap != null ? c.surfWishCap : DEFAULT_CFG.surfWishCap)
      : (c.airWishCap != null ? c.airWishCap : DEFAULT_CFG.airWishCap);
    const accel = isSurfing
      ? (c.surfAirAccel != null ? c.surfAirAccel : DEFAULT_CFG.surfAirAccel)
      : (c.airAccel != null ? c.airAccel : DEFAULT_CFG.airAccel);
    const scale = c.groundSpeed != null ? c.groundSpeed : DEFAULT_CFG.groundSpeed;

    const currentProj = vel.x * wish.x + vel.z * wish.z;
    const add = wishCap - currentProj;
    if (add <= 0) return { dx: 0, dz: 0 };
    const a = Math.min(add, accel * scale * dt);
    return { dx: wish.x * a, dz: wish.z * a };
  }

  /**
   * Computes exact orthonormal frames, slab centers, and analytical face normals for a straight A-frame surf wedge
   * running from spine point a=[x,y,z] to spine point b=[x,y,z].
   */
  function computeWedgeFrame(a, b, opts) {
    const o = opts || {};
    const A = { x: a[0], y: a[1], z: a[2] };
    const B = { x: b[0], y: b[1], z: b[2] };
    const diff = vSub(B, A);
    const length = vLen(diff);
    const F = vNorm(diff);
    const worldUp = { x: 0, y: 1, z: 0 };

    // sideR points to the player's right when traveling from A -> B
    let sideR = vCross(F, worldUp);
    if (vLen(sideR) < 1e-6) {
      sideR = { x: -1, y: 0, z: 0 };
    } else {
      sideR = vNorm(sideR);
    }
    const upPerp = vNorm(vCross(sideR, F));
    const mid = vScale(vAdd(A, B), 0.5);

    const slopeDeg = o.slopeDeg != null ? o.slopeDeg : 50;
    const slopeRad = (slopeDeg * Math.PI) / 180;
    const sinA = Math.sin(slopeRad);
    const cosA = Math.cos(slopeRad);
    const faceWidth = o.faceWidth != null ? o.faceWidth : 10.5;
    const thick = o.thick != null ? o.thick : 1.1;
    const sideMode = o.side || 'both';
    const extendStart = o.extendStart || 0;
    const extendEnd = o.extendEnd || 0;

    const effLen = length + extendStart + extendEnd;
    const effMid = vAdd(mid, vScale(F, (extendEnd - extendStart) * 0.5));

    const faces = [];

    if (sideMode === 'both' || sideMode === 'right') {
      const normal = vNorm(vAdd(vScale(sideR, sinA), vScale(upPerp, cosA)));
      const downDir = vNorm(vSub(vScale(sideR, cosA), vScale(upPerp, sinA)));
      // Right-handed basis: X = -downDir, Y = normal, Z = F  (det = +1)
      const xAxis = vScale(downDir, -1);
      const center = vSub(vAdd(effMid, vScale(downDir, faceWidth * 0.5)), vScale(normal, thick * 0.5));
      faces.push({
        side: 'right',
        center,
        normal,
        downDir,
        xAxis,
        yAxis: normal,
        zAxis: F,
        width: faceWidth,
        thick,
        length: effLen
      });
    }

    if (sideMode === 'both' || sideMode === 'left') {
      const normal = vNorm(vAdd(vScale(sideR, -sinA), vScale(upPerp, cosA)));
      const downDir = vNorm(vSub(vScale(sideR, -cosA), vScale(upPerp, sinA)));
      // Right-handed basis: X = downDir, Y = normal, Z = F  (det = +1)
      const xAxis = downDir;
      const center = vSub(vAdd(effMid, vScale(downDir, faceWidth * 0.5)), vScale(normal, thick * 0.5));
      faces.push({
        side: 'left',
        center,
        normal,
        downDir,
        xAxis,
        yAxis: normal,
        zAxis: F,
        width: faceWidth,
        thick,
        length: effLen
      });
    }

    // Underside base depth and width for visual structural keel
    const dropH = faceWidth * sinA;
    const halfBase = faceWidth * cosA;

    return {
      A,
      B,
      mid,
      effMid,
      F,
      sideR,
      upPerp,
      length,
      effLen,
      slopeDeg,
      faceWidth,
      thick,
      dropH,
      halfBase,
      faces
    };
  }

  /**
   * Computes smoothly connected segments along a curved horizontal yaw arc with optional pitch drop/rise.
   * yaw = 0 faces +Z; positive yawDelta curves left (+X); negative yawDelta curves right (-X).
   */
  function computeCurveSegments(opts) {
    const o = opts || {};
    const start = o.start || [0, 0, 0];
    const yawStart = o.yawStart != null ? o.yawStart : 0;
    const yawDelta = o.yawDelta != null ? o.yawDelta : Math.PI / 3;
    const radius = Math.max(8, o.radius != null ? o.radius : 60);
    const pitchDrop = o.pitchDrop != null ? o.pitchDrop : -8;
    const segments = Math.max(2, Math.floor(o.segments != null ? o.segments : 10));
    const overlap = o.overlap != null ? o.overlap : 0.45;

    const dirSign = yawDelta >= 0 ? 1 : -1;
    // Left perpendicular to heading (sin(y), cos(y)) is (cos(y), -sin(y)).
    // Turn center lies at start + dirSign * radius * leftPerp.
    const cx = start[0] + dirSign * radius * Math.cos(yawStart);
    const cz = start[2] - dirSign * radius * Math.sin(yawStart);

    function samplePoint(t) {
      const yaw = yawStart + t * yawDelta;
      const px = cx - dirSign * radius * Math.cos(yaw);
      const pz = cz + dirSign * radius * Math.sin(yaw);
      const py = start[1] + t * pitchDrop;
      return { p: [px, py, pz], yaw };
    }

    const out = [];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const s0 = samplePoint(t0);
      const s1 = samplePoint(t1);
      const midYaw = yawStart + ((i + 0.5) / segments) * yawDelta;
      out.push({
        index: i,
        a: s0.p,
        b: s1.p,
        yawStart: s0.yaw,
        yawEnd: s1.yaw,
        yawMid: midYaw,
        extendStart: i > 0 ? overlap : 0,
        extendEnd: i < segments - 1 ? overlap : 0,
        lipStart: i === 0 && !!o.lipStart,
        lipEnd: i === segments - 1 && !!o.lipEnd
      });
    }

    const endSample = samplePoint(1);
    return {
      segments: out,
      start: [start[0], start[1], start[2]],
      end: endSample.p,
      endYaw: endSample.yaw,
      endTangent: [Math.sin(endSample.yaw), 0, Math.cos(endSample.yaw)]
    };
  }

  /**
   * Pure headless 120Hz surf traversal simulator for deterministic unit testing of curved multi-segment ramps.
   */
  function simulateSurfOnFaces(faces, startPos, startVel, inputFn, ticks, cfg) {
    const c = Object.assign({}, DEFAULT_CFG, cfg || {});
    const dt = 1 / 120;
    const pos = { x: startPos.x, y: startPos.y, z: startPos.z };
    const vel = { x: startVel.x, y: startVel.y, z: startVel.z };
    let surfTicks = 0;
    let minSpeed = Infinity;
    let maxSpeed = 0;
    let seamFixes = 0;

    for (let t = 0; t < ticks; t++) {
      const inp = inputFn ? inputFn(t, pos, vel) : null;
      let isSurfing = false;

      if (inp && inp.wish) {
        const d = computeAirStrafeDelta(vel, inp.wish, dt, c, true);
        vel.x += d.dx;
        vel.z += d.dz;
      }
      vel.y -= c.gravity * dt;

      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;

      // Collide single test sphere at pos + (0, radius, 0) against all faces
      const sp = { x: pos.x, y: pos.y + c.radius, z: pos.z };
      const T = c.radius + c.skin;

      for (let fIdx = 0; fIdx < faces.length; fIdx++) {
        const f = faces[fIdx];
        const rel = vSub(sp, f.center);
        const lx = vDot(rel, f.xAxis);
        const ly = vDot(rel, f.yAxis);
        const lz = vDot(rel, f.zAxis);
        const hx = f.width * 0.5;
        const hy = f.thick * 0.5;
        const hz = f.length * 0.5;

        const dx = lx - clamp(lx, -hx, hx);
        const dy = ly - clamp(ly, -hy, hy);
        const dz = lz - clamp(lz, -hz, hz);
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= T * T) continue;

        let lnx, lny, lnz, pen;
        if (d2 > 1e-12) {
          const dist = Math.sqrt(d2);
          lnx = dx / dist;
          lny = dy / dist;
          lnz = dz / dist;
          pen = c.radius - dist;
        } else {
          lnx = 0;
          lny = 1;
          lnz = 0;
          pen = c.radius + (hy - Math.abs(ly));
        }

        const resolved = resolveSurfLocalNormal(
          { x: lx, y: ly, z: lz },
          { x: lnx, y: lny, z: lnz },
          { x: hx, y: hy, z: hz },
          c.radius,
          true
        );

        let wn;
        if (resolved.useAnalytical) {
          if (Math.abs(lnz) > 0.22) seamFixes++;
          wn = f.normal;
          pen = c.radius - (ly - hy);
        } else {
          wn = vNorm({
            x: f.xAxis.x * lnx + f.yAxis.x * lny + f.zAxis.x * lnz,
            y: f.xAxis.y * lnx + f.yAxis.y * lny + f.zAxis.y * lnz,
            z: f.xAxis.z * lnx + f.yAxis.z * lny + f.zAxis.z * lnz
          });
        }

        if (pen > 0) {
          pos.x += wn.x * pen;
          pos.y += wn.y * pen;
          pos.z += wn.z * pen;
          sp.x += wn.x * pen;
          sp.y += wn.y * pen;
          sp.z += wn.z * pen;
          const into = vDot(vel, wn);
          if (into < 0) {
            vel.x -= wn.x * into;
            vel.y -= wn.y * into;
            vel.z -= wn.z * into;
          }
        }

        if (classifySurfaceNormal(wn.y, c, true) === 'surf') {
          isSurfing = true;
        }
      }

      if (isSurfing) surfTicks++;
      const spd = Math.hypot(vel.x, vel.z);
      if (spd < minSpeed) minSpeed = spd;
      if (spd > maxSpeed) maxSpeed = spd;
    }

    return {
      pos,
      vel,
      surfTicks,
      minSpeed,
      maxSpeed,
      finalSpeed: Math.hypot(vel.x, vel.z),
      seamFixes
    };
  }

  /**
   * Computes smoothly connected segments along a multi-turn helical / corkscrew CS surf spiral.
   * Supports arbitrary yawDelta (e.g. 270 deg to 540 deg), tapered radiusStart -> radiusEnd, and pitchDrop.
   */
  function computeSpiralSegments(opts) {
    const o = opts || {};
    const start = o.start || [0, 0, 0];
    const yawStart = o.yawStart != null ? o.yawStart : 0;
    const yawDelta = o.yawDelta != null ? o.yawDelta : Math.PI * 2;
    const radiusStart = Math.max(10, o.radiusStart != null ? o.radiusStart : (o.radius != null ? o.radius : 38));
    const radiusEnd = Math.max(10, o.radiusEnd != null ? o.radiusEnd : radiusStart);
    const pitchDrop = o.pitchDrop != null ? o.pitchDrop : -28;
    const absYaw = Math.abs(yawDelta);
    const defaultSegs = Math.max(12, Math.ceil((absYaw / (Math.PI / 6)) * 2.5));
    const segments = Math.max(6, Math.floor(o.segments != null ? o.segments : defaultSegs));
    const overlap = o.overlap != null ? o.overlap : 0.52;

    const dirSign = yawDelta >= 0 ? 1 : -1;
    // Spiral center placed perpendicular to start heading at radiusStart
    const cx = start[0] + dirSign * radiusStart * Math.cos(yawStart);
    const cz = start[2] - dirSign * radiusStart * Math.sin(yawStart);

    function samplePoint(t) {
      const yaw = yawStart + t * yawDelta;
      const r = radiusStart + (radiusEnd - radiusStart) * t;
      const px = cx - dirSign * r * Math.cos(yaw);
      const pz = cz + dirSign * r * Math.sin(yaw);
      const py = start[1] + t * pitchDrop;
      return { p: [px, py, pz], yaw, r };
    }

    const out = [];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const s0 = samplePoint(t0);
      const s1 = samplePoint(t1);
      const midYaw = yawStart + ((i + 0.5) / segments) * yawDelta;
      out.push({
        index: i,
        a: s0.p,
        b: s1.p,
        yawStart: s0.yaw,
        yawEnd: s1.yaw,
        yawMid: midYaw,
        extendStart: i > 0 ? overlap : 0,
        extendEnd: i < segments - 1 ? overlap : 0,
        lipStart: i === 0 && !!o.lipStart,
        lipEnd: i === segments - 1 && !!o.lipEnd
      });
    }

    const endSample = samplePoint(1);
    return {
      segments: out,
      start: [start[0], start[1], start[2]],
      end: endSample.p,
      center: [cx, start[1] + pitchDrop * 0.5, cz],
      endYaw: endSample.yaw,
      endTangent: [Math.sin(endSample.yaw), 0, Math.cos(endSample.yaw)]
    };
  }

  /**
   * Computes a classic Counter-Strike surf S-curve chicane: two opposing curved sweeps connected
   * smoothly with an optional short transition gap so surfers switch air-strafe direction cleanly.
   */
  function computeSCurveSegments(opts) {
    const o = opts || {};
    const start = o.start || [0, 0, 0];
    const yawStart = o.yawStart != null ? o.yawStart : 0;
    const yawDelta = o.yawDelta != null ? o.yawDelta : Math.PI / 3;
    const radius = Math.max(12, o.radius != null ? o.radius : 56);
    const pitchDrop = o.pitchDrop != null ? o.pitchDrop : -10;
    const segmentsPerArc = Math.max(4, Math.floor(o.segmentsPerArc != null ? o.segmentsPerArc : 12));
    const gap = o.gap != null ? o.gap : 4;
    const gapDrop = o.gapDrop != null ? o.gapDrop : -0.6;
    const overlap = o.overlap != null ? o.overlap : 0.48;

    const first = computeCurveSegments({
      start,
      yawStart,
      yawDelta,
      radius,
      pitchDrop: pitchDrop * 0.5,
      segments: segmentsPerArc,
      overlap,
      lipStart: !!o.lipStart,
      lipEnd: gap > 0.5
    });

    const midStart = [
      first.end[0] + first.endTangent[0] * gap,
      first.end[1] + gapDrop,
      first.end[2] + first.endTangent[2] * gap
    ];

    const second = computeCurveSegments({
      start: midStart,
      yawStart: first.endYaw,
      yawDelta: -yawDelta,
      radius,
      pitchDrop: pitchDrop * 0.5,
      segments: segmentsPerArc,
      overlap,
      lipStart: gap > 0.5,
      lipEnd: !!o.lipEnd
    });

    return {
      first,
      second,
      segments: first.segments.concat(second.segments),
      start: [start[0], start[1], start[2]],
      mid: first.end,
      end: second.end,
      endYaw: second.endYaw,
      endTangent: second.endTangent
    };
  }

  /**
   * Computes twin opposing inward-facing surf walls forming a CS half-pipe / V-channel canyon
   * running from a=[x,y,z] to b=[x,y,z]. Left wall faces right (+sideR); right wall faces left (-sideR).
   */
  function computeChannelSegments(a, b, opts) {
    const o = opts || {};
    const A = { x: a[0], y: a[1], z: a[2] };
    const B = { x: b[0], y: b[1], z: b[2] };
    const diff = vSub(B, A);
    const length = vLen(diff);
    const F = vNorm(diff);
    let sideR = vCross(F, { x: 0, y: 1, z: 0 });
    sideR = vLen(sideR) < 1e-6 ? { x: -1, y: 0, z: 0 } : vNorm(sideR);

    const halfGap = Math.max(4, o.halfGap != null ? o.halfGap : 13);
    const slopeDeg = o.slopeDeg != null ? o.slopeDeg : 52;
    const faceWidth = o.faceWidth != null ? o.faceWidth : 13;

    // Offset left spine to -sideR * halfGap (using 'right' face so it slopes INWARD toward channel center)
    // Offset right spine to +sideR * halfGap (using 'left' face so it slopes INWARD toward channel center)
    const leftA = [A.x - sideR.x * halfGap, A.y, A.z - sideR.z * halfGap];
    const leftB = [B.x - sideR.x * halfGap, B.y, B.z - sideR.z * halfGap];
    const rightA = [A.x + sideR.x * halfGap, A.y, A.z + sideR.z * halfGap];
    const rightB = [B.x + sideR.x * halfGap, B.y, B.z + sideR.z * halfGap];

    return {
      length,
      F,
      sideR,
      halfGap,
      slopeDeg,
      faceWidth,
      leftWall: { a: leftA, b: leftB, side: 'right', slopeDeg, faceWidth },
      rightWall: { a: rightA, b: rightB, side: 'left', slopeDeg, faceWidth }
    };
  }

  /**
   * Computes a sharp CS surf launch flick ramp from start along heading yaw with upward kick.
   */
  function computeFlickSpec(opts) {
    const o = opts || {};
    const start = o.start || [0, 0, 0];
    const yaw = o.yaw != null ? o.yaw : 0;
    const length = Math.max(10, o.length != null ? o.length : 30);
    const rise = o.rise != null ? o.rise : 8.5;
    const fwd = [Math.sin(yaw), 0, Math.cos(yaw)];
    const end = [
      start[0] + fwd[0] * length,
      start[1] + rise,
      start[2] + fwd[2] * length
    ];
    return {
      a: [start[0], start[1], start[2]],
      b: end,
      yaw,
      forward: fwd,
      length,
      rise,
      slopeDeg: o.slopeDeg != null ? o.slopeDeg : 52,
      faceWidth: o.faceWidth != null ? o.faceWidth : 10.5,
      side: o.side || 'both'
    };
  }

  return {
    DEFAULT_CFG,
    classifySurfaceNormal,
    resolveSurfLocalNormal,
    computeAirStrafeDelta,
    computeWedgeFrame,
    computeCurveSegments,
    computeSpiralSegments,
    computeSCurveSegments,
    computeChannelSegments,
    computeFlickSpec,
    simulateSurfOnFaces
  };
});


// ---------- Browser Capsule Collision & Quake Acceleration ----------
var _lp, _c, _d, _n;
if (typeof window !== "undefined" && typeof V3 === "function") {
  _lp = V3();
  _c = V3();
  _d = V3();
  _n = V3();
}
// ---------- collision ----------
// Scratch vectors initialized above when running in browser
// Squared distance from sphere center c to solid s; fills _d with the local-space offset.
function sphereVs(s,c){
  _lp.copy(c).applyMatrix4(s.inv);
  _d.set(_lp.x-clamp(_lp.x,-s.half.x,s.half.x),_lp.y-clamp(_lp.y,-s.half.y,s.half.y),_lp.z-clamp(_lp.z,-s.half.z,s.half.z));
  return _d.lengthSq();
}
// Push one capsule sphere out of every solid; clip velocity against the surface (keeps speed along it = surf).
function pushSphere(cy){
  const R=CFG.radius,p=player.pos,v=player.vel,T=R+CFG.skin;
  _c.set(p.x,p.y+cy,p.z);
  for(const s of solids){
    if(s.disabled)continue;
    if(s.box.distanceToPoint(_c)>T)continue;
    const d2=sphereVs(s,_c);
    if(d2>=T*T)continue;
    let pen;
    if(d2>1e-12){const dist=Math.sqrt(d2);_n.copy(_d).divideScalar(dist);pen=R-dist;}
    else{ // center is inside the box: exit through the nearest face
      const ox=s.half.x-Math.abs(_lp.x),oy=s.half.y-Math.abs(_lp.y),oz=s.half.z-Math.abs(_lp.z);
      if(ox<=oy&&ox<=oz){_n.set(Math.sign(_lp.x)||1,0,0);pen=R+ox;}
      else if(oy<=oz){_n.set(0,Math.sign(_lp.y)||1,0);pen=R+oy;}
      else{_n.set(0,0,Math.sign(_lp.z)||1);pen=R+oz;}
    }
    // Anti-ramp-bug analytical normal clamp for multi-segment curved CS surf ramps
    if(s.isSurf&&s.surfNormal){
      const res=SurfEngine.resolveSurfLocalNormal(_lp,_n,s.half,R,true);
      if(res.useAnalytical){
        _n.copy(s.surfNormal);
        pen=R-(_lp.y-s.half.y);
      }else{
        _n.applyQuaternion(s.q);
      }
    }else{
      _n.applyQuaternion(s.q);
    }
    if(pen>0){
      p.addScaledVector(_n,pen);_c.addScaledVector(_n,pen);
      const into=v.dot(_n);if(into<0)v.addScaledVector(_n,-into);
    }
    const kind=SurfEngine.classifySurfaceNormal(_n.y,CFG,s.isSurf);
    if(kind==='ground'){contact.ground=true;contact.gn.copy(_n);}
    else if(kind==='surf'){contact.surf=true;contact.sn.copy(_n);}
    else if(kind==='wall'){contact.wall=true;contact.wn.set(_n.x,0,_n.z).normalize();}
  }
}
function collide(){
  contact.ground=false;contact.wall=false;contact.surf=false;
  const hs=player.low?H_LOW:H_STAND;
  for(let i=0;i<3;i++)for(const h of hs)pushSphere(h);
}
function headBlocked(){
  const p=player.pos;_c.set(p.x,p.y+H_STAND[2],p.z);
  for(const s of solids){if(s.disabled)continue;if(s.box.distanceToPoint(_c)>CFG.radius)continue;if(sphereVs(s,_c)<(CFG.radius-.01)**2)return true;}
  return false;
}

// ---------- movement ----------
// Quake accelerate: add speed along wishdir only until the projection reaches wishSpeed.
function accelerate(wd,wishSpeed,accel,dt,scale=wishSpeed){
  const v=player.vel,add=wishSpeed-(v.x*wd.x+v.z*wd.z);
  if(add<=0)return;
  const a=Math.min(add,accel*scale*dt);v.x+=wd.x*a;v.z+=wd.z*a;
}

