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

test('starter inventory grants 150 starting coins, 0 free cases, and starter loadout', () => {
  const inv = KnivesSystem.createStarterInventory();
  assert.equal(inv.coins, 150);
  assert.equal(KnivesSystem.totalCaseCount(inv), 0);
  assert.equal(inv.caseCounts.velocity, 0);
  assert.equal(inv.caseCounts.chroma, 0);
  assert.equal(inv.caseCounts.spectrum, 0);
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
  assert.equal(clean.coins, 9999999);
  assert.equal(clean.caseCounts.velocity, 999);
  assert.equal(clean.caseCounts.chroma, 0);
  assert.equal(clean.caseCounts.spectrum, 0);
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

test('tiered cases enforce escalating prices (150 / 275 / 450) and empirical rarity odds', () => {
  assert.deepEqual(KnivesSystem.WEAPON_TYPE_IDS, ['rifle', 'awp', 'deagle']);
  assert.equal(KnivesSystem.WEAPON_SKIN_IDS.length, 14);
  assert.equal(KnivesSystem.getCasePrice('velocity'), 150);
  assert.equal(KnivesSystem.getCasePrice('chroma'), 275);
  assert.equal(KnivesSystem.getCasePrice('spectrum'), 450);

  const velOdds = KnivesSystem.getCaseOdds('velocity');
  const chrOdds = KnivesSystem.getCaseOdds('chroma');
  const spcOdds = KnivesSystem.getCaseOdds('spectrum');
  assert.equal(velOdds.gold, 8);
  assert.equal(chrOdds.gold, 12);
  assert.equal(spcOdds.gold, 18);
  assert.ok(velOdds.gold < chrOdds.gold && chrOdds.gold < spcOdds.gold);

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
  assert.ok(mVel.goldRate >= 0.055 && mVel.goldRate <= 0.11, `Expected ~8% Gold for velocity, got ${(mVel.goldRate * 100).toFixed(1)}%`);
  assert.ok(mChr.goldRate >= 0.095 && mChr.goldRate <= 0.15, `Expected ~12% Gold for chroma, got ${(mChr.goldRate * 100).toFixed(1)}%`);
  assert.ok(mSpc.goldRate >= 0.15 && mSpc.goldRate <= 0.21, `Expected ~18% Gold for spectrum, got ${(mSpc.goldRate * 100).toFixed(1)}%`);
  assert.ok(mVel.goldRate < mChr.goldRate && mChr.goldRate < mSpc.goldRate);

  const starter = KnivesSystem.createStarterInventory();
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

test('buyCase, sellItems, starter/equipped protection, duplicate finder, and arena coin rewards work end-to-end', () => {
  let inv = KnivesSystem.createStarterInventory(); // 150 coins

  // Cannot afford Chroma (275) yet
  const failBuy = KnivesSystem.buyCase(inv, 'chroma');
  assert.equal(failBuy.purchased, false);
  assert.equal(failBuy.deficit, 125);

  // Can afford Velocity Classic (150)
  const okBuy = KnivesSystem.buyCase(inv, 'velocity');
  assert.equal(okBuy.purchased, true);
  assert.equal(okBuy.inventory.coins, 0);
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
  assert.equal(win.inventory.coins, 105);
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
  assert.equal(sale.inventory.coins, 105 + expectedVal);
  assert.ok(sale.inventory.weapons.some((w) => w.id === 'starter_rifle_slate'));
  assert.ok(sale.inventory.knives.some((k) => k.id === unboxKnife.id));
  assert.ok(!sale.inventory.weapons.some((w) => w.id === dupBad.id));
});



