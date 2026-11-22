// Seeded procedural course generator for VELOCITY Daily Courses & Custom Seeds.
// Pure deterministic generation (UMD: works in browser globals and Node unit tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DailyCourseGen = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAILY_SALT = 'VELOCITY-DAILY-V1';
  const ALL_MECHANICS = ['ramp', 'gaps', 'wallrun', 'surf', 'slide', 'grapple', 'pads'];
  const MECHANIC_LABELS = {
    ramp: 'Ramps',
    gaps: 'Hop Gaps',
    wallrun: 'Wall-Run',
    surf: 'CS Surf Ramps',
    slide: 'Slide Bars',
    grapple: 'Grapple Void',
    pads: 'Launch Pads'
  };

  const LENGTH_TIERS = {
    short: { id: 'short', label: 'SHORT SPRINT', minSegs: 5, maxSegs: 6 },
    medium: { id: 'medium', label: 'MEDIUM RUN', minSegs: 8, maxSegs: 10 },
    long: { id: 'long', label: 'LONG ENDURANCE', minSegs: 12, maxSegs: 15 }
  };

  function hashString(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    // Murmur3 32-bit finalizer for strong avalanche across consecutive date strings
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  function createRng(seedStr) {
    let state = hashString(seedStr) || 0x9e3779b9;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function randRange(rng, min, max) {
    return min + rng() * (max - min);
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function formatUtcDateKey(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isValidDateKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  function getTodayDateKey(now) {
    return formatUtcDateKey(now || new Date());
  }

  function getRecentDateKeys(count, now) {
    const base = now instanceof Date ? new Date(now.getTime()) : new Date();
    const out = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - i));
      out.push(formatUtcDateKey(d));
    }
    return out;
  }

  function formatDateDisplay(dateKey) {
    if (!isValidDateKey(dateKey)) return String(dateKey || '');
    const parts = dateKey.split('-').map(Number);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mon = months[(parts[1] || 1) - 1] || 'JAN';
    return `${mon} ${String(parts[2]).padStart(2, '0')}, ${parts[0]}`;
  }

  function canonicalDailySeed(dateKey) {
    const clean = isValidDateKey(dateKey) ? dateKey : getTodayDateKey();
    const h = hashString(`${DAILY_SALT}:${clean}`).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
    return `DAY-${clean.replace(/-/g, '')}-${h}`;
  }

  function normalizeCustomSeed(raw) {
    const cleaned = String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-_ ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 32);
    return cleaned;
  }

  function randomSeedCode() {
    const words = ['APEX', 'FLUX', 'DRIFT', 'SURGE', 'PULSE', 'STRIDE', 'VECT', 'GLIDE', 'SPARK', 'ARC'];
    const w = words[Math.floor(Math.random() * words.length)];
    const num = String(100 + Math.floor(Math.random() * 900));
    return `${w}-${num}`;
  }

  function courseIdForDaily(dateKey) {
    return `daily_${dateKey}`;
  }

  function courseIdForSeed(seed) {
    return `seed_${normalizeCustomSeed(seed) || 'DEFAULT'}`;
  }

  function rollLengthTier(rng) {
    const r = rng();
    if (r < 0.32) return LENGTH_TIERS.short;
    if (r < 0.7) return LENGTH_TIERS.medium;
    return LENGTH_TIERS.long;
  }

  function buildSegmentPlan(rng, segCount) {
    // Ensure strong variety: no two identical segments back-to-back, and guarantee diverse mechanics.
    const seq = [];
    const pool = ALL_MECHANICS.slice();
    // Shuffle core pool using Fisher-Yates so even short courses get varied mechanics
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    // Start with a fast momentum opener (ramp, slide, or pads)
    const openers = ['ramp', 'slide', 'pads'];
    const first = pick(rng, openers);
    seq.push(first);

    // Pull remaining unique mechanics first, then draw randomly avoiding immediate repeats
    const unused = pool.filter((m) => m !== first);
    while (seq.length < segCount) {
      const prev = seq[seq.length - 1];
      let nextType = null;
      if (unused.length > 0) {
        const idx = unused.findIndex((m) => m !== prev);
        if (idx >= 0) {
          nextType = unused.splice(idx, 1)[0];
        } else {
          nextType = unused.shift();
        }
      } else {
        const candidates = ALL_MECHANICS.filter((m) => m !== prev);
        nextType = pick(rng, candidates);
      }
      seq.push(nextType);
    }
    return seq;
  }

  /**
   * Generates a complete, deterministic, physics-calibrated course blueprint from any seed string.
   * All geometry uses world coordinates along +Z with controlled lateral X offsets and safe checkpoints.
   */
  function generateCourseBlueprint(seedStr, options) {
    const opts = options || {};
    const seed = String(seedStr || 'VELOCITY-001').trim().toUpperCase();
    const rng = createRng(`BLUEPRINT:${seed}`);
    const tier = rollLengthTier(rng);
    const segmentCount = randInt(rng, tier.minSegs, tier.maxSegs);
    const segmentTypes = buildSegmentPlan(rng, segmentCount);

    const slabs = [];      // { x, top, z0, z1, w, mat }
    const boxes = [];      // { x, y, z, sx, sy, sz, mat }
    const ramps = [];      // { a: [x,y,z], b: [x,y,z], w, mat }
    const surfWedges = []; // { a: [x,y,z], b: [x,y,z], opts }
    const surfCurves = []; // { start, yawStart, yawDelta, radius, pitchDrop, segments, faceWidth, slopeDeg, side, lipEnd }
    const pads = [];       // { x, y, z }
    const gates = [];      // [x, y, z, r] or [x, y, z, r, sx, sy, sz]
    const mechanicsSet = new Set();

    let x = 0;
    let y = 0;
    let z = 34;

    // 1. Start Deck: always generous flat runway so player spawns cleanly facing START gate (+Z)
    slabs.push({ x: 0, top: 0, z0: -20, z1: z, w: 22, mat: 'concrete' });
    gates.push([0, 3, 8, 6]); // Gate 0: START

    // 2. Chain procedural movement segments
    for (let i = 0; i < segmentTypes.length; i++) {
      const type = segmentTypes[i];
      mechanicsSet.add(type);
      const safeEntry = [x, y + 0.05, z - 6];

      if (type === 'ramp') {
        const rise = rng() < 0.65 ? randInt(rng, 5, 9) : -randInt(rng, 4, 7);
        const len = randInt(rng, 26, 36);
        const w = randInt(rng, 14, 18);
        const nextY = Math.max(-6, Math.min(28, y + rise));
        ramps.push({ a: [x, y, z], b: [x, nextY, z + len], w, mat: 'concrete' });
        z += len;
        y = nextY;
        const deckLen = randInt(rng, 18, 26);
        slabs.push({ x, top: y, z0: z, z1: z + deckLen, w, mat: 'concrete' });
        gates.push([x, y + 3, z + deckLen * 0.55, 6]);
        z += deckLen;
      } else if (type === 'gaps') {
        const hops = randInt(rng, 2, 3);
        const w = 14;
        for (let h = 0; h < hops; h++) {
          const gap = randInt(rng, 10, 13);
          const dx = randInt(rng, -4, 4);
          const nextX = Math.max(-22, Math.min(22, x + dx));
          const platLen = randInt(rng, 14, 18);
          z += gap;
          x = nextX;
          slabs.push({ x, top: y, z0: z, z1: z + platLen, w, mat: 'concrete' });
          if (h === hops - 1) {
            gates.push([x, y + 3, z + platLen * 0.5, 6]);
          }
          z += platLen;
        }
      } else if (type === 'wallrun') {
        const wallLen = randInt(rng, 60, 78);
        const halfGap = 5.25; // 8.5m interior corridor matching Course 01
        const wallZCenter = z + 8 + wallLen / 2;
        const wallYCenter = y + 3;
        boxes.push({ x: x - halfGap, y: wallYCenter, z: wallZCenter, sx: 2, sy: 15, sz: wallLen, mat: 'concrete' });
        boxes.push({ x: x + halfGap, y: wallYCenter, z: wallZCenter, sx: 2, sy: 15, sz: wallLen, mat: 'concrete' });
        // Mid-corridor floating gate with safe respawn on entry deck
        gates.push([x, y + 2.5, wallZCenter, 7, safeEntry[0], safeEntry[1], safeEntry[2]]);
        z = z + 8 + wallLen + 8;
        y = Math.max(-6, y - 3);
        const landLen = 20;
        slabs.push({ x, top: y, z0: z, z1: z + landLen, w: 16, mat: 'concrete' });
        gates.push([x, y + 3, z + landLen * 0.55, 6]);
        z += landLen;
      } else if (type === 'surf') {
        const variant = randInt(rng, 0, 2);
        const dropY = y - 7;
        if (variant === 0) {
          // Variant 0: Downhill speed CS surf wedge -> uphill boost flick wedge + recovery ramp
          const len1 = randInt(rng, 48, 60);
          const len2 = randInt(rng, 42, 52);
          surfWedges.push({
            a: [x, y - 0.5, z + 2],
            b: [x, dropY, z + 2 + len1],
            opts: { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true }
          });
          const midZ = z + 2 + len1 + 4;
          gates.push([x, dropY + 3, midZ, 9.5, safeEntry[0], safeEntry[1], safeEntry[2]]);
          surfWedges.push({
            a: [x, dropY, midZ + 4],
            b: [x, y - 0.5, midZ + 4 + len2],
            opts: { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true }
          });
          z = midZ + 4 + len2;
          const exitLen = 30;
          ramps.push({ a: [x, dropY - 1, z], b: [x, y, z + exitLen], w: 16, mat: 'concrete' });
          z += exitLen;
        } else if (variant === 1) {
          // Variant 1: Alternating left/right A-frame spine transfer
          const sideSign = rng() < 0.5 ? 1 : -1;
          const len1 = randInt(rng, 44, 54);
          const len2 = randInt(rng, 44, 54);
          const x1 = Math.max(-20, Math.min(20, x + sideSign * 4.5));
          const x2 = Math.max(-20, Math.min(20, x - sideSign * 4.5));
          surfWedges.push({
            a: [x1, y - 0.5, z + 2],
            b: [x1, dropY + 1, z + 2 + len1],
            opts: { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true }
          });
          const midZ = z + 2 + len1 + 5;
          gates.push([x, dropY + 4, midZ, 10, safeEntry[0], safeEntry[1], safeEntry[2]]);
          surfWedges.push({
            a: [x2, dropY + 0.5, midZ + 5],
            b: [x2, y - 1, midZ + 5 + len2],
            opts: { faceWidth: 10.5, slopeDeg: 50, side: 'both', lipEnd: true }
          });
          z = midZ + 5 + len2;
          const exitLen = 30;
          ramps.push({ a: [x, dropY - 1, z], b: [x, y, z + exitLen], w: 18, mat: 'concrete' });
          z += exitLen;
        } else {
          // Variant 2: Smooth S-curve banked CS surf sweep returning seamlessly to +Z
          const turnDir = x > 6 ? -1 : x < -6 ? 1 : (rng() < 0.5 ? 1 : -1);
          const yawArc = turnDir * 0.42;
          const radius = randInt(rng, 64, 76);
          const dxOne = turnDir * radius * (1 - Math.cos(Math.abs(yawArc)));
          const dzOne = radius * Math.sin(Math.abs(yawArc));
          const startZ = z + 2;
          surfCurves.push({
            start: [x, y - 0.5, startZ],
            yawStart: 0,
            yawDelta: yawArc,
            radius,
            pitchDrop: -5.5,
            segments: 8,
            faceWidth: 11,
            slopeDeg: 50,
            side: 'both',
            lipEnd: true
          });
          const midX = x + dxOne;
          const midZ = startZ + dzOne;
          gates.push([midX, y - 3, midZ + 3, 10.5, safeEntry[0], safeEntry[1], safeEntry[2]]);
          const c2StartZ = midZ + 6;
          surfCurves.push({
            start: [midX + turnDir * 1.5, y - 6, c2StartZ],
            yawStart: yawArc,
            yawDelta: -yawArc,
            radius,
            pitchDrop: 4.5,
            segments: 8,
            faceWidth: 11,
            slopeDeg: 50,
            side: 'both',
            lipEnd: true
          });
          x = Math.max(-22, Math.min(22, midX + turnDir * 1.5 + dxOne));
          z = c2StartZ + dzOne;
          const exitLen = 28;
          ramps.push({ a: [x, y - 5.5, z], b: [x, y, z + exitLen], w: 18, mat: 'concrete' });
          z += exitLen;
        }
        const deckLen = 22;
        slabs.push({ x, top: y, z0: z, z1: z + deckLen, w: 18, mat: 'concrete' });
        gates.push([x, y + 3, z + deckLen * 0.5, 6.5]);
        z += deckLen;
      } else if (type === 'slide') {
        const bars = randInt(rng, 2, 3);
        const spacing = 18;
        const deckLen = 16 + bars * spacing + 14;
        const w = 14;
        slabs.push({ x, top: y, z0: z, z1: z + deckLen, w, mat: 'concrete' });
        for (let b = 0; b < bars; b++) {
          const bz = z + 16 + b * spacing;
          // Bottom of bar is at y + 1.15m (since height = 2, center = y + 2.15)
          boxes.push({ x, y: y + 2.15, z: bz, sx: w, sy: 2, sz: 3, mat: 'orange' });
        }
        gates.push([x, y + 3, z + deckLen - 7, 6]);
        z += deckLen;
      } else if (type === 'grapple') {
        const voidSpan = randInt(rng, 28, 34);
        const anchorZ = z + voidSpan * 0.5;
        const anchorY = y + 12;
        boxes.push({ x, y: anchorY, z: anchorZ, sx: 6, sy: 3, sz: 6, mat: 'cyan' });
        gates.push([x, y + 5, anchorZ, 9, safeEntry[0], safeEntry[1], safeEntry[2]]);
        z += voidSpan;
        const landLen = 24;
        slabs.push({ x, top: y, z0: z, z1: z + landLen, w: 16, mat: 'concrete' });
        gates.push([x, y + 3, z + landLen * 0.5, 6]);
        z += landLen;
      } else if (type === 'pads') {
        // Launch pad on current edge launching upward to a higher landing deck
        const padZ = z - 4;
        pads.push({ x, y: y + 0.02, z: padZ });
        const climb = randInt(rng, 8, 11);
        const gap = randInt(rng, 18, 24);
        const nextY = Math.min(30, y + climb);
        gates.push([x, nextY + 2, z + gap * 0.5, 7.5, safeEntry[0], safeEntry[1], safeEntry[2]]);
        z += gap;
        y = nextY;
        const landLen = 24;
        slabs.push({ x, top: y, z0: z, z1: z + landLen, w: 16, mat: 'concrete' });
        gates.push([x, y + 3, z + landLen * 0.55, 6]);
        z += landLen;
      }
    }

    // 3. Final climb & Finish run-out deck
    const finalRise = 6;
    const finalRampLen = 28;
    ramps.push({ a: [x, y, z], b: [x, y + finalRise, z + finalRampLen], w: 16, mat: 'concrete' });
    z += finalRampLen;
    y += finalRise;
    const finishDeckLen = 84;
    slabs.push({ x, top: y, z0: z, z1: z + finishDeckLen, w: 18, mat: 'concrete' });
    const finishZ = z + 52;
    gates.push([x, y + 3, finishZ, 8]); // Final gate: FINISH

    const mechanics = ALL_MECHANICS.filter((m) => mechanicsSet.has(m));
    const totalLengthMeters = Math.round(finishZ - 8);

    const meta = {
      id: opts.id || courseIdForSeed(seed),
      dateKey: opts.dateKey || null,
      seed,
      lengthTier: tier.id,
      lengthLabel: tier.label,
      segmentCount,
      mechanics,
      mechanicsLabels: mechanics.map((m) => MECHANIC_LABELS[m]),
      gateCount: gates.length,
      totalLengthMeters
    };

    return {
      meta,
      spawn: { x: 0, y: 0, z: -10 },
      yaw: Math.PI,
      bound: 0,
      slabs,
      boxes,
      ramps,
      surfWedges,
      surfCurves,
      pads,
      gates,
      finishLabelPos: { x, y: y + 10, z: finishZ }
    };
  }

  function previewSeedCourse(seedStr, dateKey) {
    return generateCourseBlueprint(seedStr, {
      id: dateKey ? courseIdForDaily(dateKey) : courseIdForSeed(seedStr),
      dateKey: dateKey || null
    }).meta;
  }

  /**
   * Instantiates a generated blueprint inside the Three.js scene using VELOCITY's existing world helpers.
   */
  function buildSeededCourseInWorld(seedStr, options, api) {
    const bp = generateCourseBlueprint(seedStr, options);
    const mats = api.materials;
    const getMat = (name) => mats[name] || mats.concrete;

    for (let i = 0; i < bp.slabs.length; i++) {
      const s = bp.slabs[i];
      api.slab(s.x, s.top, s.z0, s.z1, s.w, getMat(s.mat));
    }
    for (let i = 0; i < bp.boxes.length; i++) {
      const b = bp.boxes[i];
      api.addBox(b.x, b.y, b.z, b.sx, b.sy, b.sz, getMat(b.mat));
    }
    for (let i = 0; i < bp.ramps.length; i++) {
      const r = bp.ramps[i];
      api.addRamp(r.a, r.b, r.w, getMat(r.mat));
    }
    if (api.addSurfWedge && bp.surfWedges) {
      for (let i = 0; i < bp.surfWedges.length; i++) {
        const sw = bp.surfWedges[i];
        api.addSurfWedge(sw.a, sw.b, sw.opts);
      }
    }
    if (api.addSurfCurve && bp.surfCurves) {
      for (let i = 0; i < bp.surfCurves.length; i++) {
        api.addSurfCurve(bp.surfCurves[i]);
      }
    }
    for (let i = 0; i < bp.pads.length; i++) {
      const p = bp.pads[i];
      api.addLaunchPad(p.x, p.y, p.z);
    }

    const gates = api.buildGates(bp.gates);
    api.gateText('START', 0, 10, 8, '#65e7ff');
    api.gateText('FINISH', bp.finishLabelPos.x, bp.finishLabelPos.y, bp.finishLabelPos.z, '#ff9b55');

    return {
      id: bp.meta.id,
      meta: bp.meta,
      spawn: api.V3(bp.spawn.x, bp.spawn.y, bp.spawn.z),
      yaw: bp.yaw,
      course: gates,
      bound: bp.bound
    };
  }

  return {
    DAILY_SALT,
    ALL_MECHANICS,
    MECHANIC_LABELS,
    LENGTH_TIERS,
    hashString,
    createRng,
    formatUtcDateKey,
    isValidDateKey,
    getTodayDateKey,
    getRecentDateKeys,
    formatDateDisplay,
    canonicalDailySeed,
    normalizeCustomSeed,
    randomSeedCode,
    courseIdForDaily,
    courseIdForSeed,
    generateCourseBlueprint,
    previewSeedCourse,
    buildSeededCourseInWorld
  };
});
