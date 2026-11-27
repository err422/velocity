const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KnivesSystem = require('../src/weapons/melee/knivesData.js');
const LoadoutsSystem = require('../src/weapons/firearms/specs.js');
const DevMode = require('../src/core/devMode.js');

const NEW_COD_SKIN_IDS = [
  'cod_opal',
  'cod_dark_spine',
  'cod_borealis',
  'cod_interstellar',
  'cod_nebula',
  'cod_mercury',
  'cod_molten_obsidian',
  'cod_constellation',
  'cod_orion',
  'cod_retro_grid',
  'cod_forged_titanium',
  'cod_stained_glass',
  'cod_kintsugi_porcelain',
  'cod_blood_cell',
  'cod_polyatomic',
  'cod_ghoulie',
  'cod_bioluminescent',
  'cod_afterlife'
];

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('all 18 CoD-inspired skins exist in WEAPON_SKINS with valid Firestore-safe IDs', () => {
  assert.equal(NEW_COD_SKIN_IDS.length, 18);
  assert.equal(KnivesSystem.WEAPON_SKIN_IDS.length, 50);
  for (const sid of NEW_COD_SKIN_IDS) {
    assert.ok(sid.length >= 4 && sid.length <= 24, `skinId ${sid} violates Firestore length rule`);
    const def = KnivesSystem.WEAPON_SKINS[sid];
    assert.ok(def, `Missing WEAPON_SKINS entry for ${sid}`);
    assert.ok(typeof def.name === 'string' && def.name.length > 0);
    assert.ok(typeof def.description === 'string' && def.description.length > 10);
    assert.ok(typeof def.accent === 'string' && def.accent.startsWith('#'));
  }
});

test('Prestige Vault and Phantom Relic cases drop curated new CoD weapon skins', () => {
  assert.ok(KnivesSystem.CASES.prestige);
  assert.ok(KnivesSystem.CASES.phantom);
  assert.equal(KnivesSystem.getCasePrice('prestige'), 550);
  assert.equal(KnivesSystem.getCasePrice('phantom'), 600);

  const seenPrestige = new Set();
  const seenPhantom = new Set();
  const rngA = makeRng(4242);
  const rngB = makeRng(7777);

  for (let i = 0; i < 600; i++) {
    const pDrop = KnivesSystem.rollCaseDrop('prestige', rngA).winner;
    assert.equal(pDrop.caseId, 'prestige');
    if (KnivesSystem.isWeaponItem(pDrop)) seenPrestige.add(pDrop.skinId);

    const phDrop = KnivesSystem.rollCaseDrop('phantom', rngB).winner;
    assert.equal(phDrop.caseId, 'phantom');
    if (KnivesSystem.isWeaponItem(phDrop)) seenPhantom.add(phDrop.skinId);
  }

  for (const expected of ['cod_forged_titanium', 'cod_kintsugi_porcelain', 'cod_mercury', 'cod_molten_obsidian', 'cod_constellation']) {
    assert.ok(seenPrestige.has(expected), `Expected prestige case to drop ${expected}`);
  }
  for (const expected of ['cod_ghoulie', 'cod_bioluminescent', 'cod_afterlife', 'cod_opal', 'cod_dark_spine', 'cod_borealis', 'cod_interstellar', 'cod_nebula']) {
    assert.ok(seenPhantom.has(expected), `Expected phantom case to drop ${expected}`);
  }
});

test('Weapon Prestige camos unlock strictly at Weapon Levels 8, 10, and 12', () => {
  const base = LoadoutsSystem.createDefaultLoadoutState();
  const lv1Status = LoadoutsSystem.getWeaponCamoStatus(base, 'rifle');
  assert.equal(lv1Status.prestigeCamos.length, 3);
  assert.equal(lv1Status.prestigeCamos.filter((c) => c.unlocked).length, 0);

  // Reach Lv. 8 -> unlocks Mercury only
  const lv8Xp = LoadoutsSystem.LEVEL_XP_THRESHOLDS[7];
  const st8 = LoadoutsSystem.sanitizeLoadoutState(Object.assign({}, base, { weaponXp: Object.assign({}, base.weaponXp, { rifle: lv8Xp }) }));
  const s8 = LoadoutsSystem.getWeaponCamoStatus(st8, 'rifle');
  assert.equal(s8.weaponLevel, 8);
  assert.equal(s8.prestigeCamos[0].unlocked, true);
  assert.equal(s8.prestigeCamos[1].unlocked, false);
  assert.equal(s8.prestigeCamos[2].unlocked, false);
  assert.equal(LoadoutsSystem.equipWeaponCamo(st8, 'rifle', 'cod_mercury').ok, true);
  assert.equal(LoadoutsSystem.equipWeaponCamo(st8, 'rifle', 'cod_molten_obsidian').ok, false);

  // Reach Lv. 10 -> unlocks Mercury + Molten Obsidian
  const lv10Xp = LoadoutsSystem.LEVEL_XP_THRESHOLDS[9];
  const st10 = LoadoutsSystem.sanitizeLoadoutState(Object.assign({}, base, { weaponXp: Object.assign({}, base.weaponXp, { rifle: lv10Xp }) }));
  const s10 = LoadoutsSystem.getWeaponCamoStatus(st10, 'rifle');
  assert.equal(s10.weaponLevel, 10);
  assert.equal(s10.prestigeCamos[0].unlocked, true);
  assert.equal(s10.prestigeCamos[1].unlocked, true);
  assert.equal(s10.prestigeCamos[2].unlocked, false);

  // Reach Lv. 12 -> unlocks all 3 Prestige camos including Constellation's End
  const lv12Xp = LoadoutsSystem.LEVEL_XP_THRESHOLDS[11];
  const st12 = LoadoutsSystem.sanitizeLoadoutState(Object.assign({}, base, { weaponXp: Object.assign({}, base.weaponXp, { rifle: lv12Xp }) }));
  const s12 = LoadoutsSystem.getWeaponCamoStatus(st12, 'rifle');
  assert.equal(s12.weaponLevel, 12);
  assert.equal(s12.prestigeCamos.every((c) => c.unlocked), true);
  assert.equal(LoadoutsSystem.equipWeaponCamo(st12, 'rifle', 'cod_constellation').ok, true);
});

test('All 7 weapon classes map to distinct Class Signature camos requiring Gold + class metric', () => {
  const expectedByClass = {
    ar: 'cod_orion',
    smg: 'cod_retro_grid',
    shotgun: 'cod_forged_titanium',
    sniper: 'cod_stained_glass',
    katana: 'cod_kintsugi_porcelain',
    revolver: 'cod_blood_cell',
    pistol: 'cod_polyatomic'
  };
  const sampleWeapons = {
    ar: 'rifle',
    smg: 'smg',
    shotgun: 'shotgun',
    sniper: 'awp',
    katana: 'katana',
    revolver: 'revolver',
    pistol: 'deagle'
  };

  for (const [cls, skinId] of Object.entries(expectedByClass)) {
    const def = LoadoutsSystem.getClassSignatureCamo(cls);
    assert.equal(def.skinId, skinId);

    const wid = sampleWeapons[cls];
    const st = LoadoutsSystem.createDefaultLoadoutState();
    // Metric reached without Gold should stay locked
    st.camoProgress[wid][def.metric] = def.target;
    const lockedStatus = LoadoutsSystem.getWeaponCamoStatus(st, wid);
    assert.equal(lockedStatus.signatureCamos[0].unlocked, false);

    // Complete all base camos (Gold) + signature target -> unlocks
    for (const ch of LoadoutsSystem.CAMO_CHALLENGES) {
      st.camoProgress[wid][ch.id] = Math.max(st.camoProgress[wid][ch.id] || 0, ch.target);
    }
    st.camoProgress[wid][def.metric] = Math.max(st.camoProgress[wid][def.metric], def.target);
    const unlockedStatus = LoadoutsSystem.getWeaponCamoStatus(st, wid);
    assert.equal(unlockedStatus.goldUnlocked, true);
    assert.equal(unlockedStatus.signatureCamos[0].unlocked, true);
    assert.equal(LoadoutsSystem.equipWeaponCamo(st, wid, skinId).ok, true);
  }
});

test('Expanded 8-tier Mastery ladder and DevMode unlock-all unlock all 18 progression camos cleanly', () => {
  assert.equal(LoadoutsSystem.MASTERY_CAMOS.length, 8);
  const maxed = DevMode.buildMaxedLoadoutsState(LoadoutsSystem.createDefaultLoadoutState(), LoadoutsSystem, {
    maxXp: true,
    maxCamos: true
  });

  for (const wid of LoadoutsSystem.WEAPON_IDS) {
    const st = LoadoutsSystem.getWeaponCamoStatus(maxed, wid);
    assert.equal(st.weaponLevel, 12);
    assert.equal(st.baseCamos.every((c) => c.unlocked), true, `${wid} base camos`);
    assert.equal(st.signatureCamos.every((c) => c.unlocked), true, `${wid} signature camo`);
    assert.equal(st.prestigeCamos.every((c) => c.unlocked), true, `${wid} prestige camos`);
    assert.equal(st.masteryCamos.every((c) => c.unlocked), true, `${wid} mastery camos`);
    assert.equal(st.opalUnlocked, true);
    assert.equal(st.darkSpineUnlocked, true);
    assert.equal(st.borealisUnlocked, true);
    assert.equal(st.interstellarUnlocked, true);
    assert.equal(st.nebulaUnlocked, true);
  }

  const unlockedInv = DevMode.buildUnlockedInventory(KnivesSystem.sanitizeInventory({}), KnivesSystem, {
    grantItems: true,
    grantCoins: true
  });
  const rifleSkinIds = new Set(unlockedInv.weapons.filter((w) => w.weaponType === 'rifle').map((w) => w.skinId));
  for (const sid of NEW_COD_SKIN_IDS) {
    assert.ok(rifleSkinIds.has(sid), `Expected DevMode unlocked inventory to include ${sid} on rifle`);
  }
});

test('firestore.rules and firebase-blueprint.json allowlist all 50 weapon skins and 9 cases', () => {
  const rulesText = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const bp = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-blueprint.json'), 'utf8'));

  for (const sid of KnivesSystem.WEAPON_SKIN_IDS) {
    assert.ok(rulesText.includes(`'${sid}'`), `firestore.rules missing weapon skinId '${sid}'`);
    assert.ok(bp.entities.WeaponItem.properties.skinId.enum.includes(sid), `firebase-blueprint.json missing skinId '${sid}'`);
  }
  for (const cid of KnivesSystem.CASE_IDS) {
    assert.ok(rulesText.includes(`'${cid}'`), `firestore.rules missing caseId '${cid}'`);
    assert.ok(bp.entities.WeaponItem.properties.caseId.enum.includes(cid), `firebase-blueprint.json WeaponItem missing caseId '${cid}'`);
    assert.ok(bp.entities.UserInventory.properties.caseCounts.properties[cid], `firebase-blueprint.json caseCounts missing '${cid}'`);
  }
});
