const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LoadoutsSystem = require('../js/loadouts-data.js');

function createMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); }
  };
}

test('expanded 6-weapon roster separates Primary (4) and Secondary (2) cleanly', () => {
  assert.deepEqual(LoadoutsSystem.PRIMARY_WEAPON_IDS, ['rifle', 'smg', 'shotgun', 'awp']);
  assert.deepEqual(LoadoutsSystem.SECONDARY_WEAPON_IDS, ['deagle', 'pistol']);
  assert.equal(LoadoutsSystem.WEAPON_IDS.length, 6);
  assert.equal(LoadoutsSystem.ATTACHMENT_SLOT_IDS.length, 8);
  assert.equal(LoadoutsSystem.MAX_ATTACHMENTS, 5);
  assert.equal(LoadoutsSystem.LOADOUT_COUNT, 5);

  for (const wid of LoadoutsSystem.WEAPON_IDS) {
    const spec = LoadoutsSystem.getWeaponSpec(wid);
    assert.ok(spec && spec.id === wid);
    assert.ok(spec.damageBody > 0 && spec.damageHead >= spec.damageBody);
    assert.ok(spec.baseWeightKg > 0);
    // Every weapon must have Lv. 1 starter attachments available
    const lv1Unlocks = LoadoutsSystem.getUnlockedAttachmentsAtLevel(wid, 1);
    assert.ok(lv1Unlocks.length >= 3, `Expected at least 3 starter Lv. 1 attachments on ${wid}`);
  }
});

test('weapon level progress exposes the fields used by the Gunsmith XP display', () => {
  const levelOne = LoadoutsSystem.getWeaponLevelInfo(0);
  assert.equal(levelOne.level, 1);
  assert.equal(levelOne.xp, 0);
  assert.equal(levelOne.xpIntoLevel, 0);
  assert.equal(levelOne.nextThreshold - levelOne.currentFloor, levelOne.xpForNextLevel);
  assert.ok(levelOne.xpForNextLevel > 0);
  assert.equal(levelOne.nextLevelXp, undefined);
});

test('resolved attachment entries expose their display name directly for loadout overview cards', () => {
  const build = LoadoutsSystem.resolveWeaponBuild('rifle', { optic: 'reflex_dot' });
  assert.equal(build.equippedList.length, 1);
  assert.equal(build.equippedList[0].name, 'Micro Reflex Dot');
  assert.equal(build.equippedList[0].def, undefined);
});

test('5-of-8 Gunsmith attachment cap is strictly enforced and allows swapping within occupied slots', () => {
  let state = LoadoutsSystem.createDefaultLoadoutState();
  // Grant max XP so all attachments on V-47 Rifle are unlocked
  state.weaponXp.rifle = 50000;
  state.loadouts[0].primary.weaponId = 'rifle';
  state.loadouts[0].primary.attachments = {};

  const toEquip = [
    ['optic', 'reflex_dot'],
    ['muzzle', 'suppressor'],
    ['barrel', 'heavy_long'],
    ['underbarrel', 'vertical_grip'],
    ['magazine', 'extended_mag']
  ];

  for (const [slot, id] of toEquip) {
    const res = LoadoutsSystem.equipAttachment(state, 0, 'primary', slot, id);
    assert.equal(res.ok, true, `Should equip ${slot}:${id}`);
    state = res.state;
  }
  assert.equal(LoadoutsSystem.countEquippedAttachments(state.loadouts[0].primary.attachments), 5);

  // Attempting to equip a 6th distinct slot must fail with cap_reached
  const sixth = LoadoutsSystem.equipAttachment(state, 0, 'primary', 'stock', 'no_stock');
  assert.equal(sixth.ok, false);
  assert.equal(sixth.reason, 'cap_reached');
  assert.equal(LoadoutsSystem.countEquippedAttachments(sixth.state.loadouts[0].primary.attachments), 5);

  // Replacing an already-occupied slot (optic) is allowed and stays at 5/5
  const swap = LoadoutsSystem.equipAttachment(state, 0, 'primary', 'optic', 'acog_25');
  assert.equal(swap.ok, true);
  assert.equal(swap.state.loadouts[0].primary.attachments.optic, 'acog_25');
  assert.equal(LoadoutsSystem.countEquippedAttachments(swap.state.loadouts[0].primary.attachments), 5);

  // Clicking the same equipped attachment removes it (drops to 4/5)
  const toggleOff = LoadoutsSystem.equipAttachment(swap.state, 0, 'primary', 'optic', 'acog_25');
  assert.equal(toggleOff.ok, true);
  assert.equal(toggleOff.reason, 'removed');
  assert.equal(LoadoutsSystem.countEquippedAttachments(toggleOff.state.loadouts[0].primary.attachments), 4);
});

test('attachment unlock gating respects per-weapon Lv. 1-12 XP progression', () => {
  let state = LoadoutsSystem.createDefaultLoadoutState();
  state.loadouts[0].primary.weaponId = 'rifle';
  state.loadouts[0].primary.attachments = {};

  // Drum mag requires higher weapon level; must reject at 0 XP
  const lockedTry = LoadoutsSystem.equipAttachment(state, 0, 'primary', 'magazine', 'drum_mag');
  assert.equal(lockedTry.ok, false);
  assert.equal(lockedTry.reason, 'locked');
  assert.ok(lockedTry.unlockLevel > 1);

  // Award XP incrementally and verify level-up triggers and newly unlocked attachments
  const xpRes = LoadoutsSystem.awardWeaponXp(state, 'rifle', 1500);
  assert.equal(xpRes.leveledUp, true);
  assert.ok(xpRes.newLevel > xpRes.prevLevel);
  assert.ok(xpRes.newUnlocks.length > 0);

  // Max out rifle XP to Lv. 12 and verify drum_mag unlocks
  const maxRes = LoadoutsSystem.awardWeaponXp(xpRes.state, 'rifle', 10000);
  const lvlInfo = LoadoutsSystem.getWeaponLevelInfo(maxRes.state.weaponXp.rifle);
  assert.equal(lvlInfo.level, LoadoutsSystem.MAX_WEAPON_LEVEL);
  assert.equal(lvlInfo.isMax, true);

  const unlockedTry = LoadoutsSystem.equipAttachment(maxRes.state, 0, 'primary', 'magazine', 'drum_mag');
  assert.equal(unlockedTry.ok, true);
});

test('full weight system scales ground and surf mobility while Melee remains pure 1.00x', () => {
  const melee = LoadoutsSystem.getMeleeMobilityProfile();
  assert.equal(melee.mobilityMult, 1.0);
  assert.equal(melee.surfAirMult, 1.0);
  assert.equal(melee.adsMoveMult, 1.0);

  // Heavy AWP build vs ultralight VX-9 Vector surf build
  const heavyAwp = LoadoutsSystem.resolveWeaponBuild('awp', {
    optic: 'sniper_var',
    muzzle: 'suppressor',
    barrel: 'heavy_long',
    magazine: 'extended_mag',
    stock: 'heavy_stock'
  });
  const lightSmg = LoadoutsSystem.resolveWeaponBuild('smg', {
    barrel: 'short_cqb',
    stock: 'no_stock',
    rearGrip: 'stippled_grip',
    magazine: 'fast_mag'
  });

  assert.ok(heavyAwp.weightKg > lightSmg.weightKg);
  assert.ok(lightSmg.mobilityMult > heavyAwp.mobilityMult);
  assert.ok(lightSmg.surfAirMult > heavyAwp.surfAirMult);
  assert.ok(heavyAwp.mobilityMult >= 0.78 && heavyAwp.mobilityMult <= 1.02);
  assert.ok(heavyAwp.surfAirMult >= 0.84 && heavyAwp.surfAirMult <= 1.01);
  assert.ok(lightSmg.mobilityMult >= 0.78 && lightSmg.mobilityMult <= 1.02);
  assert.ok(lightSmg.surfAirMult >= 0.84 && lightSmg.surfAirMult <= 1.01);

  // compareBuilds reports signed deltas cleanly
  const cmp = LoadoutsSystem.compareBuilds(heavyAwp, lightSmg);
  assert.ok(cmp.bars.mobility > 0);
  assert.ok(cmp.weightDelta < 0);
  assert.ok(cmp.surfPctDelta > 0);
});

test('tactical ammo types and shotgun shells alter ballistics, pellets, falloff, and stealth', () => {
  const rifleStock = LoadoutsSystem.resolveWeaponBuild('rifle', {});
  const rifleFmj = LoadoutsSystem.resolveWeaponBuild('rifle', { ammo: 'fmj' });
  const rifleHp = LoadoutsSystem.resolveWeaponBuild('rifle', { ammo: 'hollow_point' });
  const rifleHv = LoadoutsSystem.resolveWeaponBuild('rifle', { ammo: 'high_velocity' });
  const rifleSub = LoadoutsSystem.resolveWeaponBuild('rifle', { ammo: 'subsonic' });

  assert.ok(rifleFmj.armorPen > rifleStock.armorPen);
  assert.ok(rifleHp.damageBody > rifleStock.damageBody);
  assert.ok(rifleHv.falloffStart > rifleStock.falloffStart);
  assert.equal(rifleSub.suppressed, true);
  assert.equal(rifleSub.tracerStyle, 'stealth');

  // Distance falloff check: High-Velocity out-damages Hollow Point at long range (150m)
  const hpFar = LoadoutsSystem.computeDistanceDamage(rifleHp, 150, false, false);
  const hvFar = LoadoutsSystem.computeDistanceDamage(rifleHv, 150, false, false);
  assert.ok(hvFar > hpFar);

  // Shotgun shell conversions: Buckshot (8 pellets) vs Slug (1 high-damage precision round) vs Flechette
  const sgStock = LoadoutsSystem.resolveWeaponBuild('shotgun', {});
  const sgSlug = LoadoutsSystem.resolveWeaponBuild('shotgun', { ammo: 'slug' });
  const sgFlechette = LoadoutsSystem.resolveWeaponBuild('shotgun', { ammo: 'flechette' });

  assert.equal(sgStock.pellets, 8);
  assert.equal(sgSlug.pellets, 1);
  assert.ok(sgSlug.damageBody > sgStock.damageBody * 3);
  assert.ok(sgSlug.pelletSpread < sgStock.pelletSpread);
  assert.ok(sgFlechette.armorPen > sgStock.armorPen);
});

test('localStorage persistence self-heals from backup and cloud merge preserves higher weapon XP', () => {
  const store = createMockStorage();
  let state = LoadoutsSystem.createDefaultLoadoutState();
  state.activeIndex = 2;
  state.loadouts[2].name = 'Surf Rush';
  state.weaponXp.smg = 900;
  LoadoutsSystem.saveLocal(state, store);

  // Corrupt primary key and verify automatic recovery from backup
  store.setItem(LoadoutsSystem.STORAGE_KEY, '{corrupted_json');
  const recovered = LoadoutsSystem.loadLocal(store);
  assert.equal(recovered.activeIndex, 2);
  assert.equal(recovered.loadouts[2].name, 'Surf Rush');
  assert.equal(recovered.weaponXp.smg, 900);

  // Merge local and cloud states: keep max XP per weapon across devices
  const cloud = LoadoutsSystem.createDefaultLoadoutState();
  cloud.weaponXp.rifle = 2200;
  cloud.weaponXp.smg = 400;
  const merged = LoadoutsSystem.mergeLoadoutStates(recovered, cloud);
  assert.equal(merged.weaponXp.rifle, 2200);
  assert.equal(merged.weaponXp.smg, 900);

  // Firestore payload uses native maps/lists (zero JSON strings)
  const payload = LoadoutsSystem.toCloudLoadoutsPayload(merged, 'uid_test_123');
  assert.equal(payload.uid, 'uid_test_123');
  assert.equal(Array.isArray(payload.loadouts), true);
  assert.equal(payload.loadouts.length, 5);
  assert.equal(typeof payload.weaponXp, 'object');
  assert.equal(typeof payload.equippedWeaponSkins, 'object');
});

test('firestore.rules defines hardened /userLoadouts/{uid} rules and expanded 6-weapon allowlist', () => {
  const rulesText = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.ok(rulesText.includes('match /userLoadouts/{uid}'));
  assert.ok(rulesText.includes('isValidUserLoadoutsCreate'));
  assert.ok(rulesText.includes('isValidUserLoadoutsUpdate'));
  assert.ok(rulesText.includes("'smg'") && rulesText.includes("'shotgun'") && rulesText.includes("'pistol'"));
});
