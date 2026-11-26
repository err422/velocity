'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const KnivesSystem = require('../src/weapons/melee/knivesData.js');
const LoadoutsSystem = require('../src/weapons/firearms/specs.js');
const DevMode = require('../src/core/devMode.js');

test('isDevUrl detects ?dev=1 / true / on query parameters cleanly', () => {
  assert.equal(DevMode.isDevUrl('?dev=1'), true);
  assert.equal(DevMode.isDevUrl('?autostart=1&dev=true'), true);
  assert.equal(DevMode.isDevUrl('?dev=on'), true);
  assert.equal(DevMode.isDevUrl('?dev=0'), false);
  assert.equal(DevMode.isDevUrl('?autostart=1'), false);
  assert.equal(DevMode.isDevUrl(''), false);
});

test('canUseCombatCheats allows cheats offline/warmup and blocks them in online PvP', () => {
  assert.equal(DevMode.canUseCombatCheats(null), true);
  assert.equal(DevMode.canUseCombatCheats({ isOnline: false, isArena: true }), true);
  assert.equal(DevMode.canUseCombatCheats({ isOnline: true, isArena: true }), false);
});

test('buildMaxedLoadoutsState unlocks Lv. 12 attachments and Gold/Diamond/Dark Matter on all 19 weapons', () => {
  const base = LoadoutsSystem.createDefaultLoadoutState();
  const maxed = DevMode.buildMaxedLoadoutsState(base, LoadoutsSystem, { maxXp: true, maxCamos: true });

  for (const wid of LoadoutsSystem.WEAPON_IDS) {
    const lv = LoadoutsSystem.getWeaponLevelInfo(maxed.weaponXp[wid]);
    assert.equal(lv.level, LoadoutsSystem.MAX_WEAPON_LEVEL, `${wid} should reach max level 12`);

    const camo = LoadoutsSystem.getWeaponCamoStatus(maxed, wid);
    assert.equal(camo.goldUnlocked, true, `${wid} should unlock Gold`);
    assert.equal(camo.diamondUnlocked, true, `${wid} should unlock Diamond`);
    assert.equal(camo.darkMatterUnlocked, true, `${wid} should unlock Dark Matter`);
    assert.equal(camo.baseUnlockedCount, LoadoutsSystem.CAMO_CHALLENGES.length);
  }
});

test('buildUnlockedInventory grants all knives, gloves, weapon finishes, and 9,999,999 coins', () => {
  const starter = KnivesSystem.createStarterInventory();
  const unlocked = DevMode.buildUnlockedInventory(starter, KnivesSystem, { grantItems: true, grantCoins: true });

  assert.equal(unlocked.coins, DevMode.DEV_COINS);

  const knifePairs = new Set(unlocked.knives.map((k) => `${k.knifeType}:${k.skinId}`));
  for (const kt of KnivesSystem.KNIFE_TYPE_IDS) {
    for (const sid of Object.keys(KnivesSystem.SKINS)) {
      if (sid === 'default_steel') continue;
      assert.ok(knifePairs.has(`${kt}:${sid}`), `Expected knife ${kt}:${sid}`);
    }
  }

  const glovePairs = new Set(unlocked.gloves.map((g) => `${g.gloveType}:${g.skinId}`));
  for (const gt of KnivesSystem.GLOVE_TYPE_IDS) {
    for (const sid of KnivesSystem.GLOVE_SKIN_IDS) {
      if (sid === 'tactical_slate') continue;
      assert.ok(glovePairs.has(`${gt}:${sid}`), `Expected glove ${gt}:${sid}`);
    }
  }

  const weaponPairs = new Set(unlocked.weapons.map((w) => `${w.weaponType}:${w.skinId}`));
  const nonCamoSkins = KnivesSystem.WEAPON_SKIN_IDS.filter((s) => s !== 'factory_slate' && !s.startsWith('camo_'));
  for (const wt of KnivesSystem.WEAPON_TYPE_IDS) {
    for (const sid of nonCamoSkins) {
      assert.ok(weaponPairs.has(`${wt}:${sid}`), `Expected weapon skin ${wt}:${sid}`);
    }
  }
});

test('createProfileSnapshot and restoreProfileSnapshot preserve original user storage cleanly', () => {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
  const keys = DevMode.getSnapshotKeys(KnivesSystem, LoadoutsSystem);
  storage.setItem(KnivesSystem.STORAGE_KEY, '{"coins":150}');
  storage.setItem(LoadoutsSystem.STORAGE_KEY, '{"activeIndex":2}');

  const snap = DevMode.createProfileSnapshot(storage, keys);
  // Mutate storage in dev mode
  storage.setItem(KnivesSystem.STORAGE_KEY, '{"coins":9999999}');
  storage.setItem(LoadoutsSystem.STORAGE_KEY, '{"activeIndex":0}');
  storage.setItem(KnivesSystem.DIRTY_STORAGE_KEY, '1');

  DevMode.restoreProfileSnapshot(storage, snap);
  assert.equal(storage.getItem(KnivesSystem.STORAGE_KEY), '{"coins":150}');
  assert.equal(storage.getItem(LoadoutsSystem.STORAGE_KEY), '{"activeIndex":2}');
  assert.equal(storage.getItem(KnivesSystem.DIRTY_STORAGE_KEY), null);
});
