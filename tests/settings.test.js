const test = require('node:test');
const assert = require('node:assert/strict');
const VelocitySettings = require('../js/settings.js');

test('sanitizeSettings clamps out-of-range values and applies safe defaults', () => {
  const s = VelocitySettings.sanitizeSettings({
    displayName: '   Apex\t\nRunner   ',
    sensitivity: 99,
    invertY: 1,
    baseFov: 20,
    crosshair: { style: 'bogus', size: 200, color: '#000000' },
    viewmodel: { offsetX: 99, offsetY: -99, offsetZ: 'bad', fov: 120 },
    keybinds: { forward: 'Escape', jump: 'Mouse2' }
  });

  assert.equal(s.displayName, 'Apex Runner');
  assert.equal(s.sensitivity, 4.0);
  assert.equal(s.invertY, true);
  assert.equal(s.baseFov, 70);
  assert.equal(s.crosshair.style, 'cross');
  assert.equal(s.crosshair.size, 28);
  assert.equal(s.crosshair.color, '#c9f8ff');
  assert.deepEqual(s.viewmodel, { offsetX: 2.5, offsetY: -2.5, offsetZ: 0, fov: 72 });
  assert.equal(s.keybinds.forward, 'KeyW');
  assert.equal(s.keybinds.jump, 'Mouse2');
  assert.equal(new Set(Object.values(s.keybinds)).size, VelocitySettings.ACTION_IDS.length);
});

test('mouseButtonToToken and formatInputToken handle mouse and keyboard inputs', () => {
  assert.equal(VelocitySettings.mouseButtonToToken(0), 'Mouse0');
  assert.equal(VelocitySettings.mouseButtonToToken(2), 'Mouse2');
  assert.equal(VelocitySettings.mouseButtonToToken(4), 'Mouse4');
  assert.equal(VelocitySettings.mouseButtonToToken(5), null);
  assert.equal(VelocitySettings.mouseButtonToToken(-1), null);

  assert.equal(VelocitySettings.formatInputToken('Mouse0'), 'LMB');
  assert.equal(VelocitySettings.formatInputToken('Mouse1'), 'MMB');
  assert.equal(VelocitySettings.formatInputToken('Mouse2'), 'RMB');
  assert.equal(VelocitySettings.formatInputToken('Mouse3'), 'MOUSE 4');
  assert.equal(VelocitySettings.formatInputToken('Mouse4'), 'MOUSE 5');
  assert.equal(VelocitySettings.formatInputToken('KeyW'), 'W');
  assert.equal(VelocitySettings.formatInputToken('ShiftLeft'), 'L-SHIFT');
  assert.equal(VelocitySettings.formatInputToken('Space'), 'SPACE');
});

test('rebindAction swaps conflicting bindings cleanly and rejects Escape', () => {
  const base = VelocitySettings.cloneDefaults();

  // Rebind grapple to Space -> swaps with jump (which gets KeyE)
  const swapRes = VelocitySettings.rebindAction(base, 'grapple', 'Space');
  assert.equal(swapRes.changed, true);
  assert.equal(swapRes.swappedWith, 'jump');
  assert.equal(swapRes.settings.keybinds.grapple, 'Space');
  assert.equal(swapRes.settings.keybinds.jump, 'KeyE');
  assert.equal(new Set(Object.values(swapRes.settings.keybinds)).size, VelocitySettings.ACTION_IDS.length);

  // Rebind grapple to Mouse3 (free) -> no swap
  const mouseRes = VelocitySettings.rebindAction(swapRes.settings, 'grapple', 'Mouse3');
  assert.equal(mouseRes.changed, true);
  assert.equal(mouseRes.swappedWith, null);
  assert.equal(mouseRes.settings.keybinds.grapple, 'Mouse3');

  // Rebind grapple to Mouse2 (bound to altFire) -> swaps cleanly
  const altSwap = VelocitySettings.rebindAction(mouseRes.settings, 'grapple', 'Mouse2');
  assert.equal(altSwap.changed, true);
  assert.equal(altSwap.swappedWith, 'altFire');
  assert.equal(altSwap.settings.keybinds.grapple, 'Mouse2');
  assert.equal(altSwap.settings.keybinds.altFire, 'Mouse3');

  // Escape is forbidden as a bind target
  const escRes = VelocitySettings.rebindAction(altSwap.settings, 'grapple', 'Escape');
  assert.equal(escRes.changed, false);
  assert.equal(escRes.settings.keybinds.grapple, 'Mouse2');
});

test('resetGameplayDefaults resets controls and aim while preserving displayName', () => {
  const custom = VelocitySettings.sanitizeSettings({
    displayName: 'SkyDrifter',
    sensitivity: 2.5,
    invertY: true,
    baseFov: 105,
    crosshair: { style: 'circle', size: 22, color: '#ff9b55' },
    keybinds: { ...VelocitySettings.DEFAULT_KEYBINDS, grapple: 'Mouse2' }
  });
  const reset = VelocitySettings.resetGameplayDefaults(custom);
  assert.equal(reset.displayName, 'SkyDrifter');
  assert.equal(reset.sensitivity, 1.0);
  assert.equal(reset.invertY, false);
  assert.equal(reset.baseFov, 85);
  assert.equal(reset.crosshair.style, 'cross');
  assert.equal(reset.keybinds.grapple, 'KeyE');
});

test('resolveEffectiveDisplayName prioritizes custom name, then Google profile, then email prefix', () => {
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: 'SurfKing' }, { displayName: 'Alex Doe', email: 'alex@example.com' }),
    'SurfKing'
  );
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: '' }, { displayName: 'Alex Doe', email: 'alex@example.com' }),
    'Alex Doe'
  );
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: '' }, { email: 'runner99@example.com' }),
    'runner99'
  );
  assert.equal(VelocitySettings.resolveEffectiveDisplayName({ displayName: '' }, null), 'Runner');
});

test('toCloudPayload produces strict blueprint-matching schema with native maps and no extra keys', () => {
  const payload = VelocitySettings.toCloudPayload(VelocitySettings.cloneDefaults(), 'uid_test_123');
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['baseFov', 'crosshair', 'displayName', 'invertY', 'keybinds', 'sensitivity', 'uid', 'viewmodel']
  );
  assert.deepEqual(Object.keys(payload.crosshair).sort(), ['color', 'size', 'style']);
  assert.deepEqual(Object.keys(payload.viewmodel).sort(), ['fov', 'offsetX', 'offsetY', 'offsetZ']);
  assert.deepEqual(Object.keys(payload.keybinds).sort(), [...VelocitySettings.ACTION_IDS].sort());
});

test('saveLocal and loadLocal round-trip cleanly through a storage adapter', () => {
  const mem = new Map();
  const fakeStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v))
  };
  const custom = VelocitySettings.sanitizeSettings({
    displayName: 'LocalRunner',
    sensitivity: 1.75,
    invertY: true,
    baseFov: 96,
    crosshair: { style: 'cross-dot', size: 18, color: '#7dff8b' },
    keybinds: { ...VelocitySettings.DEFAULT_KEYBINDS, burst: 'Mouse4' }
  });
  VelocitySettings.saveLocal(custom, fakeStorage);
  const loaded = VelocitySettings.loadLocal(fakeStorage);
  assert.deepEqual(loaded, custom);
});
