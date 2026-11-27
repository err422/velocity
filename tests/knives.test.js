const test = require('node:test');
const assert = require('node:assert/strict');
const KnivesSystem = require('../src/weapons/melee/knivesData.js');

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('catalog defines 5 knife silhouettes, 12 skins, 9 cases, and 5 rarity tiers', () => {
  assert.deepEqual(KnivesSystem.KNIFE_TYPE_IDS, ['default', 'karambit', 'butterfly', 'm9', 'skeleton']);
  assert.equal(KnivesSystem.SKIN_IDS.length, 12);
  assert.deepEqual(KnivesSystem.CASE_IDS, ['velocity', 'chroma', 'spectrum', 'blacksite', 'overdrive', 'eclipse', 'ronin', 'prestige', 'phantom']);
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

test('starter inventory grants 150 starting coins, 0 free cases, and starter loadout', () => {
  const inv = KnivesSystem.createStarterInventory();
  assert.equal(inv.coins, 150);
  assert.equal(KnivesSystem.totalCaseCount(inv), 0);
  assert.equal(inv.caseCounts.velocity, 0);
  assert.equal(inv.caseCounts.chroma, 0);
  assert.equal(inv.caseCounts.spectrum, 0);
  assert.equal(inv.caseCounts.blacksite, 0);
  assert.equal(inv.caseCounts.overdrive, 0);
  assert.equal(inv.caseCounts.eclipse, 0);
  assert.equal(inv.knives.length, 1);
  assert.equal(inv.equippedKnifeId, 'starter_default_vanilla');
  assert.equal(KnivesSystem.getEquippedKnife(inv).knifeType, 'default');
});

test('legacy saves without coins migrate with 150 coins while preserving existing unopened cases', () => {
  const legacy = {
    equippedKnifeId: 'starter_default_vanilla',
    caseCounts: { velocity: 2, chroma: 1, spectrum: 3 },
    totalOpened: 4,
    lastDailyDropDate: '2026-04-30',
    knives: [KnivesSystem.createStarterKnife()]
  };
  const migrated = KnivesSystem.sanitizeInventory(legacy);
  assert.equal(migrated.coins, 150);
  assert.equal(migrated.caseCounts.velocity, 2);
  assert.equal(migrated.caseCounts.chroma, 1);
  assert.equal(migrated.caseCounts.spectrum, 3);
  assert.equal(migrated.caseCounts.blacksite, 0);
  assert.equal(migrated.caseCounts.overdrive, 0);
  assert.equal(migrated.caseCounts.eclipse, 0);
  assert.equal(KnivesSystem.totalCaseCount(migrated), 6);
});

test('grantRunRewards awards finish, clean gauntlet, PB bonus, and once-per-day Daily clear coins', () => {
  const start = KnivesSystem.createStarterInventory(); // 150 coins

  // Normal course finish (no clean gauntlet, no PB, non-daily) -> +25 coins
  const r1 = KnivesSystem.grantRunRewards(start, { isNewBest: false, cleanGauntlet: false, dateKey: '', todayKey: '2026-05-01' });
  assert.equal(r1.coinsEarned, 25);
  assert.equal(r1.inventory.coins, 175);
  assert.equal(KnivesSystem.totalCaseCount(r1.inventory), 0);

  // Today's Daily first clear + Clean Gauntlet + New PB -> 25 + 10 + 30 + 40 = +105 coins
  const r2 = KnivesSystem.grantRunRewards(r1.inventory, { isNewBest: true, cleanGauntlet: true, dateKey: '2026-05-01', todayKey: '2026-05-01' });
  assert.equal(r2.coinsEarned, 105);
  assert.equal(r2.inventory.lastDailyDropDate, '2026-05-01');
  assert.equal(r2.inventory.coins, 280);

  // Repeating Today's Daily same UTC day does NOT re-grant the +40 Daily first clear bonus
  const r3 = KnivesSystem.grantRunRewards(r2.inventory, { isNewBest: false, cleanGauntlet: false, dateKey: '2026-05-01', todayKey: '2026-05-01' });
  assert.equal(r3.coinsEarned, 25);
  assert.equal(r3.inventory.coins, 305);
});

test('sanitizeInventory and cloud payloads enforce strict schema bounds including coins', () => {
  const dirty = {
    coins: 999999999,
    equippedKnifeId: 'missing_id',
    caseCounts: { velocity: 99999, chroma: -5, spectrum: 'bad', blacksite: 99999, overdrive: -5, eclipse: 'bad' },
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
  assert.equal(clean.coins, 9999999);
  assert.equal(clean.caseCounts.velocity, 999);
  assert.equal(clean.caseCounts.chroma, 0);
  assert.equal(clean.caseCounts.spectrum, 0);
  assert.equal(clean.caseCounts.blacksite, 999);
  assert.equal(clean.caseCounts.overdrive, 0);
  assert.equal(clean.caseCounts.eclipse, 0);
  assert.equal(clean.totalOpened, 0);
  assert.equal(clean.lastDailyDropDate, '');
  assert.equal(clean.equippedKnifeId, 'starter_default_vanilla');
  assert.equal(clean.knives.length, 3); // starter + 2 sanitized

  const negCoins = KnivesSystem.sanitizeInventory({ coins: -50 });
  assert.equal(negCoins.coins, 0);

  const summaryPayload = KnivesSystem.toCloudInventoryPayload(clean, 'user_123');
  assert.deepEqual(
    Object.keys(summaryPayload).sort(),
    ['caseCounts', 'coins', 'equippedAwpId', 'equippedDeagleId', 'equippedGloveId', 'equippedKnifeId', 'equippedRifleId', 'lastDailyDropDate', 'totalOpened', 'uid']
  );
  assert.equal(summaryPayload.uid, 'user_123');
  assert.equal(summaryPayload.coins, 9999999);
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

test('glove catalog defines 4 CS archetypes, 16 skins, starter glove, and Gold drops in every case', () => {
  assert.deepEqual(KnivesSystem.GLOVE_TYPE_IDS, ['standard', 'sport', 'specialist', 'wraps']);
  assert.equal(KnivesSystem.GLOVE_SKIN_IDS.length, 16);

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

test('tiered cases enforce escalating prices and increasing Gold odds', () => {
  assert.deepEqual(KnivesSystem.WEAPON_TYPE_IDS, [
    'rifle', 'smg', 'shotgun', 'awp', 'revolver', 'deagle', 'pistol',
    'famas', 'scar', 'honeybadger', 'mp7', 'sawedoff', 'leverslug',
    'dmr', 'scout', 'katana', 'g18', 'akimbo', 'usps'
  ]);
  assert.equal(KnivesSystem.WEAPON_SKIN_IDS.length, 50);
  assert.equal(KnivesSystem.getCasePrice('velocity'), 100);
  assert.equal(KnivesSystem.getCasePrice('chroma'), 175);
  assert.equal(KnivesSystem.getCasePrice('spectrum'), 275);
  assert.equal(KnivesSystem.getCasePrice('blacksite'), 375);
  assert.equal(KnivesSystem.getCasePrice('overdrive'), 500);
  assert.equal(KnivesSystem.getCasePrice('eclipse'), 650);
  assert.equal(KnivesSystem.getCasePrice('ronin'), 450);
  assert.equal(KnivesSystem.getCasePrice('prestige'), 550);
  assert.equal(KnivesSystem.getCasePrice('phantom'), 600);

  const velOdds = KnivesSystem.getCaseOdds('velocity');
  const chrOdds = KnivesSystem.getCaseOdds('chroma');
  const spcOdds = KnivesSystem.getCaseOdds('spectrum');
  assert.equal(velOdds.gold, 8);
  assert.equal(chrOdds.gold, 12);
  assert.equal(spcOdds.gold, 18);
  const bksOdds = KnivesSystem.getCaseOdds('blacksite');
  const odrOdds = KnivesSystem.getCaseOdds('overdrive');
  const eclOdds = KnivesSystem.getCaseOdds('eclipse');
  assert.equal(bksOdds.gold, 20);
  assert.equal(odrOdds.gold, 22);
  assert.equal(eclOdds.gold, 25);
  assert.ok(velOdds.gold < chrOdds.gold && chrOdds.gold < spcOdds.gold);
  assert.ok(spcOdds.gold < bksOdds.gold && bksOdds.gold < odrOdds.gold && odrOdds.gold < eclOdds.gold);

  // Empirical distribution over 2000 deterministic rolls per case
  const measureGold = (cid, seed) => {
    const rng = makeRng(seed);
    let gold = 0;
    let weapons = 0;
    for (let i = 0; i < 2000; i++) {
      const r = KnivesSystem.rollCaseDrop(cid, rng);
      if (r.winner.rarity === 'gold') gold++;
      if (KnivesSystem.isWeaponItem(r.winner)) weapons++;
    }
    return { goldRate: gold / 2000, weaponRate: weapons / 2000 };
  };
  const mVel = measureGold('velocity', 9001);
  const mChr = measureGold('chroma', 9002);
  const mSpc = measureGold('spectrum', 9003);
  const mBks = measureGold('blacksite', 9004);
  const mOdr = measureGold('overdrive', 9005);
  const mEcl = measureGold('eclipse', 9006);
  assert.ok(mVel.goldRate >= 0.055 && mVel.goldRate <= 0.11, `Expected ~8% Gold for velocity, got ${(mVel.goldRate * 100).toFixed(1)}%`);
  assert.ok(mChr.goldRate >= 0.095 && mChr.goldRate <= 0.15, `Expected ~12% Gold for chroma, got ${(mChr.goldRate * 100).toFixed(1)}%`);
  assert.ok(mSpc.goldRate >= 0.15 && mSpc.goldRate <= 0.21, `Expected ~18% Gold for spectrum, got ${(mSpc.goldRate * 100).toFixed(1)}%`);
  assert.ok(mBks.goldRate >= 0.16 && mBks.goldRate <= 0.24, `Expected ~20% Gold for blacksite, got ${(mBks.goldRate * 100).toFixed(1)}%`);
  assert.ok(mOdr.goldRate >= 0.18 && mOdr.goldRate <= 0.26, `Expected ~22% Gold for overdrive, got ${(mOdr.goldRate * 100).toFixed(1)}%`);
  assert.ok(mEcl.goldRate >= 0.205 && mEcl.goldRate <= 0.295, `Expected ~25% Gold for eclipse, got ${(mEcl.goldRate * 100).toFixed(1)}%`);
  assert.ok(mVel.goldRate < mChr.goldRate && mChr.goldRate < mSpc.goldRate);
  assert.ok(mSpc.goldRate < mBks.goldRate && mBks.goldRate < mOdr.goldRate && mOdr.goldRate < mEcl.goldRate);

  const starter = KnivesSystem.createStarterInventory();
  assert.equal(starter.equippedRevolverId, 'starter_revolver_slate');
  assert.equal(KnivesSystem.getEquippedWeapon(starter, 'revolver').weaponType, 'revolver');
  const wpPayload = KnivesSystem.toCloudWeaponPayload(starter.weapons[0], 'user_789');
  assert.deepEqual(
    Object.keys(wpPayload).sort(),
    ['bluePct', 'caseId', 'floatValue', 'id', 'patternSeed', 'rarity', 'skinId', 'specialTag', 'uid', 'weaponType', 'wearGrade']
  );
});

test('skin valuation scales properly by rarity, wear, item type, and special tags', () => {
  const starterWep = KnivesSystem.createStarterWeapon('rifle');
  assert.equal(KnivesSystem.getItemSellValue(starterWep), 0);

  const msBsDeagle = KnivesSystem.sanitizeWeaponItem({ id: 'wp_1', weaponType: 'deagle', skinId: 'ultraviolet', rarity: 'milspec', floatValue: 0.72, patternSeed: 10 });
  const msFnDeagle = KnivesSystem.sanitizeWeaponItem({ id: 'wp_2', weaponType: 'deagle', skinId: 'ultraviolet', rarity: 'milspec', floatValue: 0.02, patternSeed: 10 });
  const msFnAwp = KnivesSystem.sanitizeWeaponItem({ id: 'wp_3', weaponType: 'awp', skinId: 'ultraviolet', rarity: 'milspec', floatValue: 0.02, patternSeed: 10 });
  const covFnAwp = KnivesSystem.sanitizeWeaponItem({ id: 'wp_4', weaponType: 'awp', skinId: 'dragon_gold', rarity: 'covert', floatValue: 0.02, patternSeed: 10 });
  const goldKarambit = KnivesSystem.sanitizeKnifeItem({ id: 'knf_1', knifeType: 'karambit', skinId: 'tiger_tooth', rarity: 'gold', floatValue: 0.02, patternSeed: 10 });
  const blueGemKarambit = KnivesSystem.sanitizeKnifeItem({ id: 'knf_2', knifeType: 'karambit', skinId: 'case_hardened', rarity: 'gold', floatValue: 0.02, patternSeed: 661, specialTag: 'BLUE GEM', bluePct: 90 });

  const v1 = KnivesSystem.getItemSellValue(msBsDeagle);
  const v2 = KnivesSystem.getItemSellValue(msFnDeagle);
  const v3 = KnivesSystem.getItemSellValue(msFnAwp);
  const v4 = KnivesSystem.getItemSellValue(covFnAwp);
  const v5 = KnivesSystem.getItemSellValue(goldKarambit);
  const v6 = KnivesSystem.getItemSellValue(blueGemKarambit);

  assert.ok(v1 > 0 && v1 < v2, `FN (${v2}) should beat BS (${v1})`);
  assert.ok(v2 < v3, `AWP (${v3}) should beat Deagle (${v2})`);
  assert.ok(v3 < v4, `Covert (${v4}) should beat Mil-Spec (${v3})`);
  assert.ok(v4 < v5, `Gold Karambit (${v5}) should beat Covert AWP (${v4})`);
  assert.ok(v5 < v6, `Blue Gem Karambit (${v6}) should beat standard Gold Karambit (${v5})`);
});


test('bulk case purchases are atomic and respect the 999-case inventory cap', () => {
  const inv = KnivesSystem.createStarterInventory();
  inv.coins = 5000;

  const bulk = KnivesSystem.buyCases(inv, 'velocity', 25);
  assert.equal(bulk.purchased, true);
  assert.equal(bulk.quantity, 25);
  assert.equal(bulk.price, KnivesSystem.getCasePrice('velocity'));
  assert.equal(bulk.totalCost, 25 * KnivesSystem.getCasePrice('velocity'));
  assert.equal(bulk.inventory.caseCounts.velocity, 25);
  assert.equal(bulk.inventory.coins, 5000 - bulk.totalCost);

  const poorInv = KnivesSystem.createStarterInventory();
  poorInv.coins = 999;
  const insufficient = KnivesSystem.buyCases(poorInv, 'velocity', 10);
  assert.equal(insufficient.purchased, false);
  assert.equal(insufficient.reason, 'INSUFFICIENT_COINS');
  assert.equal(insufficient.deficit, 1);
  assert.equal(insufficient.inventory.coins, 999);
  assert.equal(insufficient.inventory.caseCounts.velocity, 0);

  const cappedInv = KnivesSystem.createStarterInventory();
  cappedInv.coins = 100000;
  cappedInv.caseCounts.velocity = 997;
  const fillLastSlots = KnivesSystem.buyCases(cappedInv, 'velocity', 2);
  assert.equal(fillLastSlots.purchased, true);
  assert.equal(fillLastSlots.inventory.caseCounts.velocity, 999);
  const overCap = KnivesSystem.buyCases(fillLastSlots.inventory, 'velocity', 1);
  assert.equal(overCap.purchased, false);
  assert.equal(overCap.reason, 'CASE_CAPACITY');
  assert.equal(overCap.available, 0);

  const invalid = KnivesSystem.buyCases(inv, 'velocity', 0);
  assert.equal(invalid.purchased, false);
  assert.equal(invalid.reason, 'INVALID_QUANTITY');
});


test('bulk case opening consumes the requested cases and grants every drop atomically', () => {
  const inv = KnivesSystem.createStarterInventory();
  inv.caseCounts.velocity = 100;

  const opened = KnivesSystem.openCases(inv, 'velocity', 100);
  assert.equal(opened.opened, true);
  assert.equal(opened.quantity, 100);
  assert.equal(opened.items.length, 100);
  assert.equal(opened.inventory.caseCounts.velocity, 0);
  assert.equal(opened.inventory.totalOpened, 100);

  const allOwned = [
    ...opened.inventory.weapons,
    ...opened.inventory.knives.filter(item => item.id !== 'starter_default_vanilla'),
    ...opened.inventory.gloves.filter(item => item.id !== 'starter_standard_tactical')
  ];
  const newIds = new Set(opened.items.map(item => item.id));
  assert.equal(newIds.size, 100, 'every bulk drop must have a unique inventory id');
  assert.equal(opened.items.every(item => allOwned.some(owned => owned.id === item.id)), true);

  const noCases = KnivesSystem.openCases(inv, 'velocity', 101);
  assert.equal(noCases.opened, false);
  assert.equal(noCases.reason, 'QUANTITY_LIMIT');
  assert.equal(inv.caseCounts.velocity, 100, 'failed batch must not consume cases');

  const insufficient = KnivesSystem.openCases(inv, 'velocity', 101);
  assert.equal(insufficient.opened, false);
  assert.equal(insufficient.reason, 'QUANTITY_LIMIT');

  const invalid = KnivesSystem.openCases(inv, 'velocity', 0);
  assert.equal(invalid.opened, false);
  assert.equal(invalid.reason, 'INVALID_QUANTITY');
});

test('buyCase, sellItems, starter/equipped protection, duplicate finder, and arena coin rewards work end-to-end', () => {
  let inv = KnivesSystem.createStarterInventory(); // 150 coins

  // Cannot afford Chroma (175) yet
  const failBuy = KnivesSystem.buyCase(inv, 'chroma');
  assert.equal(failBuy.purchased, false);
  assert.equal(failBuy.deficit, 25);

  // Can afford Velocity Classic (100)
  const okBuy = KnivesSystem.buyCase(inv, 'velocity');
  assert.equal(okBuy.purchased, true);
  assert.equal(okBuy.inventory.coins, 50);
  assert.equal(okBuy.inventory.caseCounts.velocity, 1);
  inv = okBuy.inventory;

  // Arena kill & match rewards
  const kBody = KnivesSystem.grantArenaKillCoins(inv, { headshot: false });
  assert.equal(kBody.coinsEarned, 8);
  const kHead = KnivesSystem.grantArenaKillCoins(kBody.inventory, { headshot: true });
  assert.equal(kHead.coinsEarned, 12);
  const loss = KnivesSystem.grantArenaReward(kHead.inventory, { won: false });
  assert.equal(loss.coinsEarned, 20);
  const win = KnivesSystem.grantArenaReward(loss.inventory, { won: true });
  assert.equal(win.coinsEarned, 65);
  assert.equal(win.inventory.coins, 155);
  inv = win.inventory;

  // Add two duplicate rifles (one better FN, one worse BS) + one equipped knife
  const dupGood = KnivesSystem.sanitizeWeaponItem({ id: 'wp_dup_fn', weaponType: 'rifle', skinId: 'redline', rarity: 'restricted', floatValue: 0.03, patternSeed: 12 });
  const dupBad = KnivesSystem.sanitizeWeaponItem({ id: 'wp_dup_bs', weaponType: 'rifle', skinId: 'redline', rarity: 'restricted', floatValue: 0.78, patternSeed: 13 });
  const unboxKnife = KnivesSystem.sanitizeKnifeItem({ id: 'knf_eq_test', knifeType: 'karambit', skinId: 'fade', rarity: 'gold', floatValue: 0.02, patternSeed: 763, specialTag: 'FULL FADE', bluePct: 100 });
  inv.weapons.push(dupGood, dupBad);
  inv.knives.push(unboxKnife);
  inv.equippedKnifeId = unboxKnife.id;

  // Starter & equipped items are protected
  assert.equal(KnivesSystem.isItemSellable(inv, inv.weapons[0]).sellable, false);
  assert.equal(KnivesSystem.isItemSellable(inv, unboxKnife).sellable, false);
  assert.equal(KnivesSystem.isItemSellable(inv, dupBad).sellable, true);

  // Duplicate finder keeps the higher-value FN copy and selects only the lower-value BS copy
  const dups = KnivesSystem.findDuplicateSellableIds(inv, 'weapons');
  assert.deepEqual(dups, ['wp_dup_bs']);

  // Attempting to sell starter + equipped + sellable duplicate only sells the duplicate
  const expectedVal = KnivesSystem.getItemSellValue(dupBad);
  const sale = KnivesSystem.sellItems(inv, ['starter_rifle_slate', unboxKnife.id, dupBad.id]);
  assert.equal(sale.soldItems.length, 1);
  assert.equal(sale.soldItems[0].id, dupBad.id);
  assert.equal(sale.coinsEarned, expectedVal);
  assert.equal(sale.inventory.coins, 155 + expectedVal);
  assert.ok(sale.inventory.weapons.some((w) => w.id === 'starter_rifle_slate'));
  assert.ok(sale.inventory.knives.some((k) => k.id === unboxKnife.id));
  assert.ok(!sale.inventory.weapons.some((w) => w.id === dupBad.id));
});

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    }
  };
}

test('mergeInventories never wipes local skins when cloud subcollections are empty or partially fail', () => {
  const local = KnivesSystem.createStarterInventory();
  const localKnife = KnivesSystem.sanitizeKnifeItem({
    id: 'knf_local_bluegem',
    knifeType: 'karambit',
    skinId: 'case_hardened',
    rarity: 'gold',
    patternSeed: 661,
    floatValue: 0.015,
    specialTag: 'BLUE GEM',
    bluePct: 91,
    caseId: 'velocity'
  });
  const localWeapon = KnivesSystem.sanitizeWeaponItem({
    id: 'wpn_local_dragon',
    weaponType: 'awp',
    skinId: 'dragon_gold',
    rarity: 'covert',
    patternSeed: 42,
    floatValue: 0.03,
    caseId: 'spectrum'
  });
  const localGlove = KnivesSystem.sanitizeGloveItem({
    id: 'glv_local_vice',
    gloveType: 'sport',
    skinId: 'vice',
    rarity: 'gold',
    patternSeed: 120,
    floatValue: 0.07,
    caseId: 'spectrum'
  });
  local.knives.unshift(localKnife);
  local.weapons.unshift(localWeapon);
  local.gloves.unshift(localGlove);
  local.equippedKnifeId = localKnife.id;
  local.equippedAwpId = localWeapon.id;
  local.equippedGloveId = localGlove.id;
  local.coins = 320;
  local.totalOpened = 3;

  // Simulate cloud doc existing with empty subcollections (exact prior reload-wipe bug)
  const emptyCloud = KnivesSystem.createStarterInventory();
  emptyCloud.totalOpened = 3;

  const merged = KnivesSystem.mergeInventories(local, emptyCloud, {
    knivesLoaded: true,
    glovesLoaded: true,
    weaponsLoaded: true,
    localDirty: false
  });

  assert.ok(merged.inventory.knives.some((k) => k.id === localKnife.id));
  assert.ok(merged.inventory.weapons.some((w) => w.id === localWeapon.id));
  assert.ok(merged.inventory.gloves.some((g) => g.id === localGlove.id));
  assert.equal(merged.inventory.equippedKnifeId, localKnife.id);
  assert.equal(merged.inventory.equippedAwpId, localWeapon.id);
  assert.equal(merged.inventory.equippedGloveId, localGlove.id);
  assert.equal(merged.inventory.coins, 320);
  assert.equal(merged.missingInCloud.knives.length, 1);
  assert.equal(merged.missingInCloud.weapons.length, 1);
  assert.equal(merged.missingInCloud.gloves.length, 1);
  assert.equal(merged.needsSummarySync, true);
  assert.equal(merged.partialCloudLoad, false);

  // Simulate partial cloud read failure (knives subcollection timed out/failed)
  const partial = KnivesSystem.mergeInventories(local, emptyCloud, {
    knivesLoaded: false,
    glovesLoaded: true,
    weaponsLoaded: true,
    localDirty: false
  });
  assert.ok(partial.inventory.knives.some((k) => k.id === localKnife.id));
  assert.equal(partial.partialCloudLoad, true);
  assert.equal(partial.missingInCloud.knives.length, 0); // Don't treat unread category as missing
});

test('mergeInventories unions multi-device skins while honoring pending sold tombstones', () => {
  const local = KnivesSystem.createStarterInventory();
  const localWep = KnivesSystem.sanitizeWeaponItem({
    id: 'wpn_device_a',
    weaponType: 'rifle',
    skinId: 'redline',
    rarity: 'restricted',
    patternSeed: 10,
    floatValue: 0.14,
    caseId: 'velocity'
  });
  local.weapons.push(localWep);
  local.coins = 400;
  local.totalOpened = 5;

  const cloud = KnivesSystem.createStarterInventory();
  const cloudKnife = KnivesSystem.sanitizeKnifeItem({
    id: 'knf_device_b',
    knifeType: 'butterfly',
    skinId: 'doppler',
    rarity: 'gold',
    patternSeed: 77,
    floatValue: 0.01,
    specialTag: 'RUBY',
    caseId: 'chroma'
  });
  const soldWep = KnivesSystem.sanitizeWeaponItem({
    id: 'wpn_sold_offline',
    weaponType: 'deagle',
    skinId: 'blaze',
    rarity: 'classified',
    patternSeed: 99,
    floatValue: 0.02,
    caseId: 'velocity'
  });
  cloud.knives.push(cloudKnife);
  cloud.weapons.push(soldWep);
  cloud.totalOpened = 5;

  const merged = KnivesSystem.mergeInventories(local, cloud, {
    knivesLoaded: true,
    glovesLoaded: true,
    weaponsLoaded: true,
    pendingSoldIds: [{ id: soldWep.id, kind: 'weapon' }],
    localDirty: true
  });

  assert.ok(merged.inventory.weapons.some((w) => w.id === localWep.id));
  assert.ok(merged.inventory.knives.some((k) => k.id === cloudKnife.id));
  assert.ok(!merged.inventory.weapons.some((w) => w.id === soldWep.id));
  assert.deepEqual(merged.staleInCloud.weapons, [soldWep.id]);
  assert.equal(merged.missingInCloud.weapons.length, 1);
  assert.equal(merged.missingInCloud.weapons[0].id, localWep.id);
});

test('loadLocal recovers from backup snapshot if primary storage is corrupted or wiped to starter', () => {
  const storage = createMemoryStorage();
  const inv = KnivesSystem.createStarterInventory();
  const knife = KnivesSystem.sanitizeKnifeItem({
    id: 'knf_backup_test',
    knifeType: 'm9',
    skinId: 'fade',
    rarity: 'gold',
    patternSeed: 763,
    floatValue: 0.01,
    specialTag: 'FULL FADE',
    bluePct: 100,
    caseId: 'spectrum'
  });
  inv.knives.unshift(knife);
  inv.totalOpened = 1;
  KnivesSystem.saveLocal(inv, storage);

  // Corrupt primary storage
  storage.setItem(KnivesSystem.STORAGE_KEY, '{corrupt json');
  const recoveredCorrupt = KnivesSystem.loadLocal(storage);
  assert.ok(recoveredCorrupt.knives.some((k) => k.id === knife.id));

  // Accidentally overwrite primary with empty starter without allowBackupReset
  KnivesSystem.saveLocal(KnivesSystem.createStarterInventory(), storage);
  const recoveredBlank = KnivesSystem.loadLocal(storage);
  assert.ok(recoveredBlank.knives.some((k) => k.id === knife.id));

  // Legitimately resetting backup (e.g. after selling last item) updates backup
  const emptyAfterSale = KnivesSystem.createStarterInventory();
  emptyAfterSale.coins = 750;
  KnivesSystem.saveLocal(emptyAfterSale, storage, { allowBackupReset: true });
  const reloadedAfterSale = KnivesSystem.loadLocal(storage);
  assert.equal(KnivesSystem.countNonStarterItems(reloadedAfterSale), 0);
  assert.equal(reloadedAfterSale.coins, 750);
});

test('pending sold item queue and local dirty flag persist cleanly in storage', () => {
  const storage = createMemoryStorage();
  assert.equal(KnivesSystem.isLocalDirty(storage), false);
  KnivesSystem.setLocalDirty(true, storage);
  assert.equal(KnivesSystem.isLocalDirty(storage), true);
  KnivesSystem.setLocalDirty(false, storage);
  assert.equal(KnivesSystem.isLocalDirty(storage), false);

  const w = KnivesSystem.sanitizeWeaponItem({ id: 'wpn_q1', weaponType: 'rifle', skinId: 'redline', rarity: 'restricted', floatValue: 0.2, patternSeed: 5 });
  const k = KnivesSystem.sanitizeKnifeItem({ id: 'knf_q2', knifeType: 'karambit', skinId: 'fade', rarity: 'gold', floatValue: 0.02, patternSeed: 12 });
  KnivesSystem.recordPendingSoldItems([w, k, KnivesSystem.createStarterKnife()], storage);
  const pending = KnivesSystem.loadPendingSoldItems(storage);
  assert.equal(pending.length, 2);
  assert.deepEqual(pending.map((p) => `${p.kind}:${p.id}`).sort(), ['knife:knf_q2', 'weapon:wpn_q1']);

  KnivesSystem.clearPendingSoldItem('wpn_q1', storage);
  assert.deepEqual(KnivesSystem.loadPendingSoldItems(storage), [{ id: 'knf_q2', kind: 'knife' }]);
});

test('firestore.rules allows non-existent get checks and matches all catalog skin and type IDs', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

  // Verify resource == null guard exists for knives, gloves, and weapons subcollections
  const nullGuardMatches = rules.match(/resource == null \|\| existing\(\)\.uid == request\.auth\.uid/g) || [];
  assert.ok(nullGuardMatches.length >= 6, `Expected >=6 null-safe owner checks for get/delete across knives/gloves/weapons, found ${nullGuardMatches.length}`);

  // Verify every skinId, weaponType, knifeType, gloveType, rarity, specialTag, caseId appears in rules
  for (const id of [
    ...KnivesSystem.KNIFE_TYPE_IDS,
    ...KnivesSystem.SKIN_IDS,
    ...KnivesSystem.GLOVE_TYPE_IDS,
    ...KnivesSystem.GLOVE_SKIN_IDS,
    ...KnivesSystem.WEAPON_TYPE_IDS,
    ...KnivesSystem.WEAPON_SKIN_IDS,
    ...KnivesSystem.RARITY_IDS,
    ...KnivesSystem.WEAR_CODES,
    ...KnivesSystem.CASE_IDS
  ]) {
    assert.ok(rules.includes(`'${id}'`), `Expected '${id}' to be allowlisted in firestore.rules`);
  }
});

test('new drops are pristine, StatTrak™ rolls/sanitizes/tracks kills/adds +45% sell value, and meta line omits wear/float', () => {
  const rng = makeRng(4242);
  let sawStatTrak = false;
  for (let i = 0; i < 60; i++) {
    const roll = KnivesSystem.rollCaseDrop('spectrum', rng);
    assert.equal(roll.winner.floatValue, 0.01);
    assert.equal(roll.winner.wearGrade, 'FN');
    if (roll.winner.statTrak) {
      sawStatTrak = true;
      assert.equal(roll.winner.statTrakKills, 0);
    }
  }
  assert.equal(sawStatTrak, true, 'Expected at least one StatTrak™ drop across 60 rolls');

  const stdAwp = KnivesSystem.sanitizeWeaponItem({
    id: 'wp_std_awp',
    weaponType: 'awp',
    skinId: 'dragon_gold',
    rarity: 'covert',
    patternSeed: 123,
    floatValue: 0.01,
    statTrak: false
  });
  const stAwp = KnivesSystem.sanitizeWeaponItem({
    id: 'wp_st_awp',
    weaponType: 'awp',
    skinId: 'dragon_gold',
    rarity: 'covert',
    patternSeed: 123,
    floatValue: 0.01,
    statTrak: true,
    statTrakKills: 42
  });
  const stKnife = KnivesSystem.sanitizeKnifeItem({
    id: 'knf_st_karambit',
    knifeType: 'karambit',
    skinId: 'case_hardened',
    rarity: 'gold',
    patternSeed: 661,
    floatValue: 0.01,
    specialTag: 'BLUE GEM',
    bluePct: 88,
    statTrak: true,
    statTrakKills: 7
  });

  // +45% StatTrak™ value bonus
  const stdVal = KnivesSystem.getItemSellValue(stdAwp);
  const stVal = KnivesSystem.getItemSellValue(stAwp);
  assert.ok(stVal > stdVal && Math.abs(stVal / stdVal - 1.45) < 0.05, `Expected ~1.45x value for StatTrak™ (${stVal} vs ${stdVal})`);

  // Naming & wear-free meta line
  assert.equal(KnivesSystem.formatItemFullName(stAwp).startsWith('StatTrak™ '), true);
  assert.equal(KnivesSystem.formatItemFullName(stKnife).startsWith('StatTrak™ '), true);
  const meta = KnivesSystem.formatKnifeMetaLine(stKnife);
  assert.ok(meta.includes('ST™ 7 KILLS'));
  assert.ok(meta.includes('SEED #661'));
  assert.ok(meta.includes('BLUE GEM'));
  assert.ok(!meta.includes('FN') && !meta.includes('0.01'), `Meta line must hide wear/float, got: ${meta}`);

  // Cloud payload includes StatTrak fields when enabled
  const wpCloud = KnivesSystem.toCloudWeaponPayload(stAwp, 'uid_st');
  assert.equal(wpCloud.statTrak, true);
  assert.equal(wpCloud.statTrakKills, 42);
  const knCloud = KnivesSystem.toCloudKnifePayload(stKnife, 'uid_st');
  assert.equal(knCloud.statTrak, true);
  assert.equal(knCloud.statTrakKills, 7);

  // incrementStatTrakKills updates weapon & knife counters and ignores non-StatTrak items
  let inv = KnivesSystem.createStarterInventory();
  inv.weapons.push(stdAwp, stAwp);
  inv.knives.push(stKnife);

  const noopRes = KnivesSystem.incrementStatTrakKills(inv, stdAwp.id, 1);
  assert.equal(noopRes.updated, false);

  const wpRes = KnivesSystem.incrementStatTrakKills(inv, stAwp.id, 3);
  assert.equal(wpRes.updated, true);
  assert.equal(wpRes.item.statTrakKills, 45);

  const knRes = KnivesSystem.incrementStatTrakKills(wpRes.inventory, stKnife.id, 1);
  assert.equal(knRes.updated, true);
  assert.equal(knRes.item.statTrakKills, 8);
});




