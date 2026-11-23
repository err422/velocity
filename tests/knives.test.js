const test = require('node:test');
const assert = require('node:assert/strict');
const KnivesSystem = require('../js/knives-data.js');

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('catalog defines 5 knife silhouettes, 10 skins, 3 cases, and 5 rarity tiers', () => {
  assert.deepEqual(KnivesSystem.KNIFE_TYPE_IDS, ['default', 'karambit', 'butterfly', 'm9', 'skeleton']);
  assert.equal(KnivesSystem.SKIN_IDS.length, 10);
  assert.deepEqual(KnivesSystem.CASE_IDS, ['velocity', 'chroma', 'spectrum']);
  assert.deepEqual(KnivesSystem.RARITY_IDS, ['milspec', 'restricted', 'classified', 'covert', 'gold']);
});

test('wear grade classification matches CS float ranges', () => {
  assert.equal(KnivesSystem.getWearGrade(0.0012).code, 'FN');
  assert.equal(KnivesSystem.getWearGrade(0.0699).code, 'FN');
  assert.equal(KnivesSystem.getWearGrade(0.07).code, 'MW');
  assert.equal(KnivesSystem.getWearGrade(0.149).code, 'MW');
  assert.equal(KnivesSystem.getWearGrade(0.15).code, 'FT');
  assert.equal(KnivesSystem.getWearGrade(0.379).code, 'FT');
  assert.equal(KnivesSystem.getWearGrade(0.38).code, 'WW');
  assert.equal(KnivesSystem.getWearGrade(0.449).code, 'WW');
  assert.equal(KnivesSystem.getWearGrade(0.45).code, 'BS');
  assert.equal(KnivesSystem.getWearGrade(0.9999).code, 'BS');
});

test('Case Hardened pattern generator is deterministic and produces iconic Blue Gem #661', () => {
  const pxA = KnivesSystem.evaluateCaseHardenedPixel(0.42, 0.51, 661);
  const pxB = KnivesSystem.evaluateCaseHardenedPixel(0.42, 0.51, 661);
  assert.deepEqual(pxA, pxB);

  const blue661 = KnivesSystem.computeCaseHardenedBluePct(661);
  assert.ok(blue661 >= 72, `Expected seed #661 to have >=72% blue, got ${blue661}%`);

  const meta661 = KnivesSystem.computeSkinMetadata('case_hardened', 661);
  assert.equal(meta661.specialTag, 'BLUE GEM');
  assert.equal(meta661.bluePct, blue661);

  const blueRegular = KnivesSystem.computeCaseHardenedBluePct(104);
  assert.ok(blueRegular >= 0 && blueRegular <= 100);
});

test('Doppler, Fade, and Marble Fade pattern metadata resolve ultra-rare variants', () => {
  const gemMeta = KnivesSystem.computeSkinMetadata('doppler', 321, { forceGem: true });
  assert.ok(['RUBY', 'SAPPHIRE', 'BLACK PEARL'].includes(gemMeta.specialTag));

  const fadeMeta = KnivesSystem.computeSkinMetadata('fade', 763);
  assert.equal(fadeMeta.bluePct, 100);
  assert.equal(fadeMeta.specialTag, 'FULL FADE');

  const marbleMeta = KnivesSystem.computeSkinMetadata('marble_fade', 412);
  assert.equal(marbleMeta.specialTag, 'FIRE & ICE');
});

test('rollCaseDrop creates a 45-card strip with winner pinned at winIndex across weapon, knife, and glove drops', () => {
  const rng = makeRng(1337);
  for (const cid of KnivesSystem.CASE_IDS) {
    const roll = KnivesSystem.rollCaseDrop(cid, rng);
    assert.equal(roll.strip.length, 45);
    assert.equal(roll.winIndex, 36);
    assert.deepEqual(roll.strip[roll.winIndex], roll.winner);
    assert.ok(roll.landingJitter >= -0.35 && roll.landingJitter <= 0.35);
    assert.ok(KnivesSystem.RARITIES[roll.winner.rarity]);
    assert.ok(roll.winner.patternSeed >= 0 && roll.winner.patternSeed <= 999);
    assert.ok(roll.winner.floatValue >= 0 && roll.winner.floatValue <= 0.9999);
    if (KnivesSystem.isWeaponItem(roll.winner)) {
      assert.ok(KnivesSystem.WEAPON_TYPES[roll.winner.weaponType]);
      assert.ok(KnivesSystem.WEAPON_SKINS[roll.winner.skinId]);
    } else if (KnivesSystem.isGloveItem(roll.winner)) {
      assert.ok(KnivesSystem.GLOVE_TYPES[roll.winner.gloveType]);
      assert.ok(KnivesSystem.GLOVE_SKINS[roll.winner.skinId]);
    } else {
      assert.ok(KnivesSystem.KNIFE_TYPES[roll.winner.knifeType]);
      assert.ok(KnivesSystem.SKINS[roll.winner.skinId]);
    }
  }
});

test('starter inventory grants 3 starter cases and default vanilla knife', () => {
  const inv = KnivesSystem.createStarterInventory();
  assert.equal(KnivesSystem.totalCaseCount(inv), 3);
  assert.equal(inv.caseCounts.velocity, 1);
  assert.equal(inv.caseCounts.chroma, 1);
  assert.equal(inv.caseCounts.spectrum, 1);
  assert.equal(inv.knives.length, 1);
  assert.equal(inv.equippedKnifeId, 'starter_default_vanilla');
  assert.equal(KnivesSystem.getEquippedKnife(inv).knifeType, 'default');
});

test('grantRunRewards awards finish, PB bonus, and once-per-day Daily clear bonus', () => {
  const rng = makeRng(42);
  const start = KnivesSystem.createStarterInventory();

  // Normal course finish (no PB, non-daily) -> +1 case
  const r1 = KnivesSystem.grantRunRewards(start, { isNewBest: false, dateKey: '', todayKey: '2026-05-01' }, rng);
  assert.equal(r1.awarded.length, 1);
  assert.equal(KnivesSystem.totalCaseCount(r1.inventory), 4);

  // Today's Daily first clear + New PB -> +1 finish + +1 PB + +2 Daily bonus = +4 cases
  const r2 = KnivesSystem.grantRunRewards(r1.inventory, { isNewBest: true, dateKey: '2026-05-01', todayKey: '2026-05-01' }, rng);
  assert.equal(r2.awarded.length, 4);
  assert.equal(r2.inventory.lastDailyDropDate, '2026-05-01');
  assert.equal(KnivesSystem.totalCaseCount(r2.inventory), 8);

  // Repeating Today's Daily same UTC day does NOT re-grant the +2 Daily first clear bonus
  const r3 = KnivesSystem.grantRunRewards(r2.inventory, { isNewBest: false, dateKey: '2026-05-01', todayKey: '2026-05-01' }, rng);
  assert.equal(r3.awarded.length, 1);
  assert.equal(KnivesSystem.totalCaseCount(r3.inventory), 9);
});

test('sanitizeInventory and cloud payloads enforce strict schema bounds', () => {
  const dirty = {
    equippedKnifeId: 'missing_id',
    caseCounts: { velocity: 99999, chroma: -5, spectrum: 'bad' },
    totalOpened: -3,
    lastDailyDropDate: 'not-a-date',
    knives: [
      {
        id: 'knf_test_1',
        knifeType: 'skeleton',
        skinId: 'case_hardened',
        rarity: 'gold',
        patternSeed: 661,
        floatValue: 0.0085,
        specialTag: 'BLUE GEM',
        bluePct: 88,
        caseId: 'spectrum'
      },
      {
        id: 'bad/id with spaces',
        knifeType: 'unknown',
        skinId: 'unknown',
        rarity: 'mythic',
        patternSeed: 5000,
        floatValue: 9.9,
        specialTag: 'HACKED',
        bluePct: 999,
        caseId: 'invalid'
      }
    ]
  };
  const clean = KnivesSystem.sanitizeInventory(dirty);
  assert.equal(clean.caseCounts.velocity, 999);
  assert.equal(clean.caseCounts.chroma, 0);
  assert.equal(clean.caseCounts.spectrum, 0);
  assert.equal(clean.totalOpened, 0);
  assert.equal(clean.lastDailyDropDate, '');
  assert.equal(clean.equippedKnifeId, 'starter_default_vanilla');
  assert.equal(clean.knives.length, 3); // starter + 2 sanitized

  const summaryPayload = KnivesSystem.toCloudInventoryPayload(clean, 'user_123');
  assert.deepEqual(
    Object.keys(summaryPayload).sort(),
    ['caseCounts', 'equippedAwpId', 'equippedDeagleId', 'equippedGloveId', 'equippedKnifeId', 'equippedRifleId', 'lastDailyDropDate', 'totalOpened', 'uid']
  );
  assert.equal(summaryPayload.uid, 'user_123');
  assert.equal(summaryPayload.equippedGloveId, 'starter_standard_tactical');
  assert.equal(summaryPayload.equippedRifleId, 'starter_rifle_slate');
  assert.equal(summaryPayload.equippedAwpId, 'starter_awp_slate');
  assert.equal(summaryPayload.equippedDeagleId, 'starter_deagle_slate');

  const knifePayload = KnivesSystem.toCloudKnifePayload(clean.knives[1], 'user_123');
  assert.deepEqual(
    Object.keys(knifePayload).sort(),
    ['bluePct', 'caseId', 'floatValue', 'id', 'knifeType', 'patternSeed', 'rarity', 'skinId', 'specialTag', 'uid', 'wearGrade']
  );
  assert.equal(knifePayload.knifeType, 'skeleton');
  assert.equal(knifePayload.wearGrade, 'FN');
  assert.equal(knifePayload.specialTag, 'BLUE GEM');
});

test('glove catalog defines 4 CS archetypes, 13 skins, starter glove, and Gold drops in every case', () => {
  assert.deepEqual(KnivesSystem.GLOVE_TYPE_IDS, ['standard', 'sport', 'specialist', 'wraps']);
  assert.equal(KnivesSystem.GLOVE_SKIN_IDS.length, 13);

  const starter = KnivesSystem.createStarterInventory();
  assert.equal(starter.equippedGloveId, 'starter_standard_tactical');
  assert.equal(starter.gloves.length, 1);
  assert.equal(KnivesSystem.getEquippedGlove(starter).gloveType, 'standard');
  assert.equal(KnivesSystem.getEquippedGlove(starter).skinId, 'tactical_slate');
  assert.equal(KnivesSystem.isGloveItem(starter.gloves[0]), true);
  assert.equal(KnivesSystem.isGloveItem(starter.knives[0]), false);

  for (const cid of KnivesSystem.CASE_IDS) {
    const goldPool = KnivesSystem.CASES[cid].pools.gold;
    const knifeEntries = goldPool.filter((e) => e.itemKind !== 'glove');
    const gloveEntries = goldPool.filter((e) => e.itemKind === 'glove');
    assert.ok(knifeEntries.length >= 4, `Expected >=4 gold knives in ${cid}`);
    assert.ok(gloveEntries.length >= 4, `Expected >=4 gold gloves in ${cid}`);
    for (const ge of gloveEntries) {
      assert.ok(KnivesSystem.GLOVE_TYPES[ge.gloveType], `Invalid gloveType ${ge.gloveType}`);
      assert.ok(KnivesSystem.GLOVE_SKINS[ge.skinId], `Invalid glove skinId ${ge.skinId}`);
    }
  }
});

test('sanitizeGloveItem and toCloudGlovePayload enforce strict schema bounds', () => {
  const dirty = KnivesSystem.sanitizeGloveItem({
    id: 'glv_test_vice',
    gloveType: 'sport',
    skinId: 'vice',
    rarity: 'gold',
    patternSeed: 204,
    floatValue: 0.0412,
    specialTag: '',
    bluePct: 0,
    caseId: 'velocity'
  });
  assert.equal(dirty.itemKind, 'glove');
  assert.equal(dirty.gloveType, 'sport');
  assert.equal(dirty.skinId, 'vice');
  assert.equal(dirty.wearGrade, 'FN');
  assert.equal(KnivesSystem.formatItemFullName(dirty), 'Sport Gloves | Vice');

  const payload = KnivesSystem.toCloudGlovePayload(dirty, 'user_456');
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['bluePct', 'caseId', 'floatValue', 'gloveType', 'id', 'patternSeed', 'rarity', 'skinId', 'specialTag', 'uid', 'wearGrade']
  );
  assert.equal(payload.uid, 'user_456');
  assert.equal(payload.gloveType, 'sport');
  assert.equal(payload.wearGrade, 'FN');
});

test('rollInspectTier implements exact 1/100 Mythic, 25% Uncommon, and 74% Normal tiers', () => {
  assert.equal(KnivesSystem.MYTHIC_INSPECT_CHANCE, 0.01);
  assert.equal(KnivesSystem.rollInspectTier(() => 0.0), 'mythic');
  assert.equal(KnivesSystem.rollInspectTier(() => 0.0099), 'mythic');
  assert.equal(KnivesSystem.rollInspectTier(() => 0.01), 'uncommon');
  assert.equal(KnivesSystem.rollInspectTier(() => 0.2599), 'uncommon');
  assert.equal(KnivesSystem.rollInspectTier(() => 0.26), 'normal');
  assert.equal(KnivesSystem.rollInspectTier(() => 0.9999), 'normal');

  for (const kt of KnivesSystem.KNIFE_TYPE_IDS) {
    assert.ok(typeof KnivesSystem.KNIFE_TYPES[kt].mythicName === 'string' && KnivesSystem.KNIFE_TYPES[kt].mythicName.length > 0);
  }
});

test('weapon catalog defines Rifle, AWP, Deagle, 14 skins, 3 starters, and ~15% Gold case odds', () => {
  assert.deepEqual(KnivesSystem.WEAPON_TYPE_IDS, ['rifle', 'awp', 'deagle']);
  assert.equal(KnivesSystem.WEAPON_SKIN_IDS.length, 14);
  assert.equal(KnivesSystem.RARITIES.gold.weight, 15);

  const starter = KnivesSystem.createStarterInventory();
  assert.equal(starter.weapons.length, 3);
  assert.equal(KnivesSystem.getEquippedWeapon(starter, 'rifle').weaponType, 'rifle');
  assert.equal(KnivesSystem.getEquippedWeapon(starter, 'awp').weaponType, 'awp');
  assert.equal(KnivesSystem.getEquippedWeapon(starter, 'deagle').weaponType, 'deagle');

  // Verify empirical case drop distribution over 1000 deterministic rolls
  const rng = makeRng(9001);
  let weaponDrops = 0;
  let knifeDrops = 0;
  let gloveDrops = 0;
  for (let i = 0; i < 1000; i++) {
    const r = KnivesSystem.rollCaseDrop('velocity', rng);
    if (KnivesSystem.isWeaponItem(r.winner)) weaponDrops++;
    else if (KnivesSystem.isGloveItem(r.winner)) gloveDrops++;
    else knifeDrops++;
  }
  const goldPct = (knifeDrops + gloveDrops) / 1000;
  assert.ok(weaponDrops > 780 && weaponDrops < 920, `Expected ~85% weapon skins, got ${weaponDrops}/1000`);
  assert.ok(goldPct >= 0.10 && goldPct <= 0.21, `Expected ~15% Gold Knives+Gloves, got ${(goldPct * 100).toFixed(1)}%`);
  assert.ok(knifeDrops > 30 && gloveDrops > 20, `Expected both knives (${knifeDrops}) and gloves (${gloveDrops}) in Gold drops`);

  const wpPayload = KnivesSystem.toCloudWeaponPayload(starter.weapons[0], 'user_789');
  assert.deepEqual(
    Object.keys(wpPayload).sort(),
    ['bluePct', 'caseId', 'floatValue', 'id', 'patternSeed', 'rarity', 'skinId', 'specialTag', 'uid', 'weaponType', 'wearGrade']
  );

  // Arena match reward grants +1 case on completion and +2 cases on victory
  const lossReward = KnivesSystem.grantArenaReward(starter, { won: false }, makeRng(7));
  assert.equal(lossReward.awarded.length, 1);
  const winReward = KnivesSystem.grantArenaReward(starter, { won: true }, makeRng(7));
  assert.equal(winReward.awarded.length, 2);
});


