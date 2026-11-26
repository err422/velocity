'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MobileControls = require('../src/core/mobileControls.js');

test('sanitizeTouchPrefs enforces valid mode, bounds, and defaults', () => {
  const def = MobileControls.sanitizeTouchPrefs(null);
  assert.deepEqual(def, {
    mode: 'auto',
    sensitivity: 1.0,
    scale: 1.0,
    leftFire: true
  });

  const clamped = MobileControls.sanitizeTouchPrefs({
    mode: 'invalid',
    sensitivity: 9.9,
    scale: 0.1,
    leftFire: false
  });
  assert.equal(clamped.mode, 'auto');
  assert.equal(clamped.sensitivity, 3.0);
  assert.equal(clamped.scale, 0.75);
  assert.equal(clamped.leftFire, false);

  const explicit = MobileControls.sanitizeTouchPrefs({
    mode: 'on',
    sensitivity: 1.45,
    scale: 1.2,
    leftFire: true
  });
  assert.deepEqual(explicit, {
    mode: 'on',
    sensitivity: 1.45,
    scale: 1.2,
    leftFire: true
  });
});

test('loadTouchPrefs and saveTouchPrefs round-trip with localStorage shim', () => {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v))
  };

  const saved = MobileControls.saveTouchPrefs({
    mode: 'on',
    sensitivity: 1.65,
    scale: 1.15,
    leftFire: false
  }, storage);
  assert.equal(saved.mode, 'on');
  assert.equal(saved.leftFire, false);

  const loaded = MobileControls.loadTouchPrefs(storage);
  assert.deepEqual(loaded, saved);

  // Corrupt JSON falls back cleanly
  storage.setItem(MobileControls.STORAGE_KEY, '{broken');
  assert.deepEqual(MobileControls.loadTouchPrefs(storage), MobileControls.DEFAULT_PREFS);
});

test('detectTouchDevice identifies phones, iPads (including iPadOS Macintosh UA), query overrides, and desktops', () => {
  // Desktop Chrome with mouse
  assert.equal(MobileControls.detectTouchDevice({
    search: '',
    maxTouchPoints: 0,
    hasOntouchstart: false,
    coarsePointer: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0'
  }), false);

  // iPhone
  assert.equal(MobileControls.detectTouchDevice({
    search: '',
    maxTouchPoints: 5,
    hasOntouchstart: true,
    coarsePointer: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'
  }), true);

  // iPadOS Safari masquerading as Macintosh with touch points
  assert.equal(MobileControls.detectTouchDevice({
    search: '',
    maxTouchPoints: 5,
    hasOntouchstart: true,
    coarsePointer: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
  }), true);

  // Query param ?touch=1 overrides desktop
  assert.equal(MobileControls.detectTouchDevice({
    search: '?autostart=1&touch=1',
    maxTouchPoints: 0,
    hasOntouchstart: false,
    coarsePointer: false,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
  }), true);

  // Query param ?touch=0 overrides mobile
  assert.equal(MobileControls.detectTouchDevice({
    search: '?touch=0',
    maxTouchPoints: 5,
    hasOntouchstart: true,
    coarsePointer: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'
  }), false);
});

test('shouldShowTouchControls respects mode, device detection, and active play state', () => {
  const desktopEnv = { search: '', maxTouchPoints: 0, hasOntouchstart: false, coarsePointer: false, userAgent: 'Desktop' };
  const phoneEnv = { search: '', maxTouchPoints: 5, hasOntouchstart: true, coarsePointer: true, userAgent: 'iPhone' };

  // Hidden on menus / pause / post-match voting
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'on' }, phoneEnv, { inLevel: false, overlayHidden: false, voting: false }), false);
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'on' }, phoneEnv, { inLevel: true, overlayHidden: false, voting: false }), false);
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'on' }, phoneEnv, { inLevel: true, overlayHidden: true, voting: true }), false);

  // Auto mode shows on phone, hides on desktop
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'auto' }, phoneEnv, { inLevel: true, overlayHidden: true, voting: false }), true);
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'auto' }, desktopEnv, { inLevel: true, overlayHidden: true, voting: false }), false);

  // Explicit on/off overrides device
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'on' }, desktopEnv, { inLevel: true, overlayHidden: true, voting: false }), true);
  assert.equal(MobileControls.shouldShowTouchControls({ mode: 'off' }, phoneEnv, { inLevel: true, overlayHidden: true, voting: false }), false);
});

test('computeJoystickVector handles deadzone, circular clamp, forward inversion, and surf lateral assist', () => {
  // Center / inside deadzone => zero movement
  const dead = MobileControls.computeJoystickVector(3, -3, 50, 0.14);
  assert.equal(dead.x, 0);
  assert.equal(dead.y, 0);
  assert.equal(dead.mag, 0);

  // Full forward push (negative screen dy => +y forward, sprintLock true)
  const fwd = MobileControls.computeJoystickVector(0, -100, 50, 0.14);
  assert.ok(fwd.y > 0.99);
  assert.equal(fwd.x, 0);
  assert.equal(fwd.knobY, -50);
  assert.equal(fwd.forward, true);
  assert.equal(fwd.sprintLock, true);

  // Pure right strafe with slight upward thumb drift => surf-assist zeros tiny forward y!
  const strafe = MobileControls.computeJoystickVector(48, -6, 50, 0.14);
  assert.ok(strafe.x > 0.85);
  assert.equal(strafe.y, 0, 'Surf-assist should suppress tiny accidental forward input while strafing');
  assert.equal(strafe.right, true);
  assert.equal(strafe.forward, false);

  // Diagonal movement preserves both axes when forward intent is strong
  const diag = MobileControls.computeJoystickVector(35, -35, 50, 0.14);
  assert.ok(diag.x > 0.5);
  assert.ok(diag.y > 0.5);
  assert.ok(diag.mag <= 1.0001);
});

test('computeLookDelta scales with sensitivity, scope zoom, flick acceleration, and invertY', () => {
  const zero = MobileControls.computeLookDelta(0, 0, 1.0, 1.0, false);
  assert.deepEqual(zero, { dYaw: 0, dPitch: 0 });

  // Swiping right (+dx) rotates yaw right (-dYaw in Three.js Y-up), swiping up (-dy) pitches up (+dPitch)
  const slow = MobileControls.computeLookDelta(10, -10, 1.0, 1.0, false);
  assert.ok(slow.dYaw < 0);
  assert.ok(slow.dPitch > 0);

  // Invert Y flips pitch sign only
  const inv = MobileControls.computeLookDelta(10, -10, 1.0, 1.0, true);
  assert.equal(inv.dYaw, slow.dYaw);
  assert.equal(inv.dPitch, -slow.dPitch);

  // Scope multiplier reduces sensitivity proportionally for identical swipe vectors
  const scoped = MobileControls.computeLookDelta(10, -10, 1.0, 0.4, false);
  assert.ok(Math.abs(scoped.dYaw - slow.dYaw * 0.4) < 1e-9);
  assert.ok(Math.abs(scoped.dPitch - slow.dPitch * 0.4) < 1e-9);

  // Fast flick applies gentle acceleration per pixel compared to slow drag
  const slowX = MobileControls.computeLookDelta(10, 0, 1.0, 1.0, false);
  const fast = MobileControls.computeLookDelta(40, 0, 1.0, 1.0, false);
  assert.ok(Math.abs(fast.dYaw) > Math.abs(slowX.dYaw) * 4, 'Fast swipe should apply smooth flick acceleration');
});
