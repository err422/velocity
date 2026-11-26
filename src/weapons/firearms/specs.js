// Pure Call of Duty–style Loadouts, 5-of-8 Gunsmith Attachments, Tactical Ammo Ballistics,
// Full Weight & Surf Mobility Solver, Per-Weapon XP Unlocks (Lv. 1–12), and Cloud Sync helpers for VELOCITY.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LoadoutsSystem = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const STORAGE_KEY = 'velocity_loadouts_v1';
  const BACKUP_STORAGE_KEY = 'velocity_loadouts_backup_v1';
  const MAX_ATTACHMENTS = 5;
  const LOADOUT_COUNT = 5;
  const MAX_WEAPON_LEVEL = 12;

  const ATTACHMENT_SLOTS = Object.freeze([
    { id: 'optic', label: 'Optic', shortLabel: 'OPTIC', cameraFocus: 'optic', desc: 'Sights, holos & variable sniper scopes' },
    { id: 'muzzle', label: 'Muzzle', shortLabel: 'MUZZLE', cameraFocus: 'muzzle', desc: 'Suppressors, brakes & chokes' },
    { id: 'barrel', label: 'Barrel', shortLabel: 'BARREL', cameraFocus: 'barrel', desc: 'Range, velocity & chassis balance' },
    { id: 'underbarrel', label: 'Underbarrel', shortLabel: 'UNDER', cameraFocus: 'underbarrel', desc: 'Foregrips & tactical lasers' },
    { id: 'magazine', label: 'Magazine', shortLabel: 'MAG', cameraFocus: 'magazine', desc: 'Capacity & reload speed' },
    { id: 'ammo', label: 'Ammunition', shortLabel: 'AMMO', cameraFocus: 'magazine', desc: 'Tactical rounds & shell loads' },
    { id: 'rearGrip', label: 'Rear Grip', shortLabel: 'GRIP', cameraFocus: 'rearGrip', desc: 'ADS snap & recoil stability' },
    { id: 'stock', label: 'Stock', shortLabel: 'STOCK', cameraFocus: 'stock', desc: 'Surf weight & aim steadiness' },
    { id: 'apex', label: 'Apex Kit', shortLabel: 'APEX', cameraFocus: 'apex', desc: 'Signature temporal hangtime modules', isApex: true }
  ]);
  const ATTACHMENT_SLOT_IDS = Object.freeze(ATTACHMENT_SLOTS.map((s) => s.id));

  // Cumulative XP required to reach levels 1..12 (smooth fast early unlocks, rewarding mastery curve)
  const LEVEL_XP_THRESHOLDS = Object.freeze([
    0,     // Lv 1
    80,    // Lv 2
    190,   // Lv 3
    330,   // Lv 4
    500,   // Lv 5
    710,   // Lv 6
    960,   // Lv 7
    1260,  // Lv 8
    1620,  // Lv 9
    2040,  // Lv 10
    2520,  // Lv 11
    3100   // Lv 12 (Mastery)
  ]);

  const XP_REWARDS = Object.freeze({
    targetHit: 15,
    bullseyeHit: 25,
    botKill: 8,
    botHeadshot: 12,
    arenaKill: 75,
    arenaHeadshot: 110
  });

  const WEAPON_CLASSES = Object.freeze([
    { id: 'ar', label: 'Assault Rifles', shortLabel: 'AR', slotCategory: 'primary' },
    { id: 'smg', label: 'SMGs', shortLabel: 'SMG', slotCategory: 'primary' },
    { id: 'shotgun', label: 'Shotguns', shortLabel: 'SHG', slotCategory: 'primary' },
    { id: 'sniper', label: 'Snipers', shortLabel: 'SNP', slotCategory: 'primary' },
    { id: 'katana', label: 'Katana', shortLabel: 'KATANA', slotCategory: 'primary' },
    { id: 'revolver', label: 'Revolver', shortLabel: 'REV', slotCategory: 'primary' },
    { id: 'pistol', label: 'Sidearms', shortLabel: 'PISTOL', slotCategory: 'secondary' }
  ]);

  const WEAPON_SPECS = Object.freeze({
    rifle: {
      id: 'rifle',
      slotCategory: 'primary',
      classId: 'ar',
      classLabel: 'Assault Rifle',
      name: 'V-47 Rifle',
      shortName: 'V-47',
      hudTag: 'AR',
      description: 'Versatile full-auto carbine balancing 1-tap headshots, range, and mobility.',
      auto: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 34,
      damageHead: 100,
      falloffStart: 55,
      falloffEnd: 165,
      minFalloffMul: 0.72,
      armorPen: 1.0,
      rpm: 600,
      magSize: 30,
      reloadTime: 1.75,
      range: 260,
      spreadHip: 0.011,
      spreadAds: 0.0018,
      spreadMove: 0.012,
      recoilPitch: 0.014,
      recoilYaw: 0.007,
      adsTimeSec: 0.21,
      baseWeightKg: 3.4,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25'])
    },
    smg: {
      id: 'smg',
      slotCategory: 'primary',
      classId: 'smg',
      classLabel: 'Submachine Gun',
      name: 'VX-9 Vector',
      shortName: 'VX-9',
      hudTag: 'SMG',
      description: 'Ultra-high RPM surf SMG with tight hipfire and featherweight air-strafe handling.',
      auto: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 22,
      damageHead: 56,
      falloffStart: 28,
      falloffEnd: 95,
      minFalloffMul: 0.56,
      armorPen: 0.92,
      rpm: 920,
      magSize: 32,
      reloadTime: 1.42,
      range: 185,
      spreadHip: 0.0068,
      spreadAds: 0.0024,
      spreadMove: 0.0065,
      recoilPitch: 0.0105,
      recoilYaw: 0.0078,
      adsTimeSec: 0.145,
      baseWeightKg: 2.35,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech'])
    },
    shotgun: {
      id: 'shotgun',
      slotCategory: 'primary',
      classId: 'shotgun',
      classLabel: 'Pump Shotgun',
      name: 'M870 Breacher',
      shortName: 'M870',
      hudTag: 'SHG',
      description: 'Devastating 12-gauge pump-action breacher with heavy blast kickback even while grounded.',
      auto: false,
      pellets: 8,
      pelletSpread: 0.036,
      damageBody: 19,   // 8 * 19 = 152 point-blank
      damageHead: 32,   // 8 * 32 = 256 point-blank
      falloffStart: 14,
      falloffEnd: 46,
      minFalloffMul: 0.34,
      armorPen: 0.90,
      rpm: 76,
      magSize: 6,
      reloadTime: 1.95,
      range: 110,
      spreadHip: 0.014,
      spreadAds: 0.006,
      spreadMove: 0.010,
      recoilPitch: 0.056,
      recoilYaw: 0.015,
      kickbackForce: 11.2,
      kickbackGroundLift: 4.9,
      adsTimeSec: 0.22,
      baseWeightKg: 3.55,
      defaultOptic: 'iron',
      ammoClass: 'shell',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech'])
    },
    awp: {
      id: 'awp',
      slotCategory: 'primary',
      classId: 'sniper',
      classLabel: 'Bolt Sniper',
      name: 'AWP Sniper',
      shortName: 'AWP',
      hudTag: 'SNP',
      description: 'High-caliber bolt-action marksman rifle built for 1-shot eliminations and variable magnification.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 100,
      damageHead: 250,
      falloffStart: 180,
      falloffEnd: 420,
      minFalloffMul: 0.92,
      armorPen: 1.15,
      rpm: 43,
      magSize: 5,
      reloadTime: 2.35,
      range: 420,
      spreadHip: 0.034,
      spreadAds: 0.00035,
      spreadMove: 0.024,
      recoilPitch: 0.062,
      recoilYaw: 0.010,
      adsTimeSec: 0.33,
      baseWeightKg: 5.6,
      defaultOptic: 'sniper_var',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['iron_snipe', 'acog_25', 'sniper_4x', 'sniper_var'])
    },
    revolver: {
      id: 'revolver',
      slotCategory: 'primary',
      classId: 'revolver',
      classLabel: 'Heavy Revolver',
      name: 'R-88 Magnum',
      shortName: 'R-88',
      hudTag: 'REV',
      description: 'Hitscan .500 magnum revolver with massive blast kickback. Hold LMB 0.20s for a 1-shot body kill anywhere, or RMB to fan the hammer.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 105,
      damageHead: 260,
      falloffStart: 340,
      falloffEnd: 460,
      minFalloffMul: 1.0,
      armorPen: 1.22,
      rpm: 86,
      magSize: 6,
      reloadTime: 2.88,
      range: 420,
      spreadHip: 0.0012,
      spreadAds: 0.0005,
      spreadMove: 0.0068,
      recoilPitch: 0.062,
      recoilYaw: 0.013,
      kickbackForce: 9.6,
      kickbackGroundLift: 4.4,
      fanKickbackForce: 6.4,
      adsTimeSec: 0.20,
      baseWeightKg: 2.35,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      chargeTimeSec: 0.20,
      altFireMode: 'fan',
      fanDamageBody: 68,
      fanDamageHead: 118,
      fanFalloffStart: 12,
      fanFalloffEnd: 38,
      fanMinFalloffMul: 0.45,
      fanSpread: 0.042,
      fanFireInterval: 0.21,
      reloadMode: 'shell',
      shellOpenTime: 0.40,
      shellInsertTime: 0.36,
      shellCloseTime: 0.32,
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech'])
    },
    deagle: {
      id: 'deagle',
      slotCategory: 'secondary',
      classId: 'pistol',
      classLabel: 'Heavy Pistol',
      name: 'Deagle .50',
      shortName: 'Deagle',
      hudTag: 'HVP',
      description: 'Hard-hitting .50 AE sidearm for mid-air flicks and 1-tap precision headshots.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 52,
      damageHead: 120,
      falloffStart: 38,
      falloffEnd: 120,
      minFalloffMul: 0.68,
      armorPen: 1.05,
      rpm: 210,
      magSize: 7,
      reloadTime: 1.45,
      range: 220,
      spreadHip: 0.009,
      spreadAds: 0.0014,
      spreadMove: 0.012,
      recoilPitch: 0.038,
      recoilYaw: 0.009,
      adsTimeSec: 0.165,
      baseWeightKg: 1.85,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot'])
    },
    pistol: {
      id: 'pistol',
      slotCategory: 'secondary',
      classId: 'pistol',
      classLabel: 'Tactical Pistol',
      name: 'USP-9 Tactical',
      shortName: 'USP-9',
      hudTag: 'PST',
      description: 'Featherweight rapid-fire 9mm sidearm with near-zero weight penalty and razor-sharp handling.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 28,
      damageHead: 84,
      falloffStart: 26,
      falloffEnd: 92,
      minFalloffMul: 0.62,
      armorPen: 0.94,
      rpm: 460,
      magSize: 15,
      reloadTime: 1.18,
      range: 175,
      spreadHip: 0.0062,
      spreadAds: 0.0016,
      spreadMove: 0.0068,
      recoilPitch: 0.015,
      recoilYaw: 0.005,
      adsTimeSec: 0.12,
      baseWeightKg: 1.05,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot'])
    },
    famas: {
      id: 'famas',
      slotCategory: 'primary',
      classId: 'ar',
      classLabel: 'Burst Assault Rifle',
      name: 'F-33 Burst',
      shortName: 'F-33',
      hudTag: 'AR',
      description: '3-round burst bullpup rifle with blistering burst cadence and surgical mid-range accuracy.',
      auto: false,
      burstCount: 3,
      burstDelay: 0.055,
      burstCooldown: 0.24,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 32,
      damageHead: 92,
      falloffStart: 62,
      falloffEnd: 175,
      minFalloffMul: 0.74,
      armorPen: 1.02,
      rpm: 820,
      magSize: 27,
      reloadTime: 1.72,
      range: 270,
      spreadHip: 0.009,
      spreadAds: 0.0013,
      spreadMove: 0.010,
      recoilPitch: 0.0105,
      recoilYaw: 0.0048,
      adsTimeSec: 0.19,
      baseWeightKg: 3.15,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25'])
    },
    scar: {
      id: 'scar',
      slotCategory: 'primary',
      classId: 'ar',
      classLabel: 'Heavy Battle Rifle',
      name: 'SC-20 Heavy',
      shortName: 'SC-20',
      hudTag: 'BR',
      description: 'Hard-hitting 7.62mm heavy battle rifle trading fire rate for crushing per-shot damage and range.',
      auto: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 46,
      damageHead: 118,
      falloffStart: 78,
      falloffEnd: 215,
      minFalloffMul: 0.80,
      armorPen: 1.12,
      rpm: 465,
      magSize: 20,
      reloadTime: 1.98,
      range: 310,
      spreadHip: 0.013,
      spreadAds: 0.0014,
      spreadMove: 0.013,
      recoilPitch: 0.021,
      recoilYaw: 0.0085,
      adsTimeSec: 0.245,
      baseWeightKg: 4.1,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25'])
    },
    honeybadger: {
      id: 'honeybadger',
      slotCategory: 'primary',
      classId: 'ar',
      classLabel: 'Stealth Carbine',
      name: 'HB-7 Phantom',
      shortName: 'HB-7',
      hudTag: 'CAR',
      description: 'Integrated-suppressor covert carbine combining silent flanks, low recoil, and crisp surf agility.',
      auto: true,
      inherentSuppressed: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 30,
      damageHead: 86,
      falloffStart: 42,
      falloffEnd: 135,
      minFalloffMul: 0.68,
      armorPen: 0.98,
      rpm: 740,
      magSize: 30,
      reloadTime: 1.56,
      range: 225,
      spreadHip: 0.0082,
      spreadAds: 0.0017,
      spreadMove: 0.0082,
      recoilPitch: 0.0115,
      recoilYaw: 0.0055,
      adsTimeSec: 0.175,
      baseWeightKg: 2.85,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25'])
    },
    mp7: {
      id: 'mp7',
      slotCategory: 'primary',
      classId: 'smg',
      classLabel: 'Micro-SMG',
      name: 'MP-7 Viper',
      shortName: 'MP-7',
      hudTag: 'PDW',
      description: 'Ultra-fast 1,050 RPM compact micro-SMG built for aggressive CQB melts and featherweight surf launches.',
      auto: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 19,
      damageHead: 48,
      falloffStart: 20,
      falloffEnd: 74,
      minFalloffMul: 0.50,
      armorPen: 0.94,
      rpm: 1050,
      magSize: 36,
      reloadTime: 1.32,
      range: 155,
      spreadHip: 0.0060,
      spreadAds: 0.0026,
      spreadMove: 0.0058,
      recoilPitch: 0.0092,
      recoilYaw: 0.0072,
      adsTimeSec: 0.13,
      baseWeightKg: 1.95,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech'])
    },
    sawedoff: {
      id: 'sawedoff',
      slotCategory: 'primary',
      classId: 'shotgun',
      classLabel: 'Double-Barrel',
      name: 'DB-12 Sawed-Off',
      shortName: 'DB-12',
      hudTag: 'DB',
      description: 'Twin-barrel sawed-off cannon firing 12-pellet devastator blasts with enormous ground and air physics kickback.',
      auto: false,
      pellets: 12,
      pelletSpread: 0.056,
      damageBody: 22,
      damageHead: 36,
      falloffStart: 10,
      falloffEnd: 32,
      minFalloffMul: 0.28,
      armorPen: 0.92,
      rpm: 240,
      magSize: 2,
      reloadTime: 1.48,
      range: 75,
      spreadHip: 0.022,
      spreadAds: 0.016,
      spreadMove: 0.014,
      recoilPitch: 0.088,
      recoilYaw: 0.022,
      kickbackForce: 16.5,
      kickbackGroundLift: 6.8,
      adsTimeSec: 0.16,
      baseWeightKg: 2.55,
      defaultOptic: 'iron',
      ammoClass: 'shell',
      allowedSlots: Object.freeze(['muzzle', 'barrel', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze([])
    },
    leverslug: {
      id: 'leverslug',
      slotCategory: 'primary',
      classId: 'shotgun',
      classLabel: 'Lever Slug',
      name: 'LV-45 Lever Slug',
      shortName: 'LV-45',
      hudTag: 'SLG',
      description: 'Mid-range lever-action rifled slug shotgun pairing surgical 1-tap headshots with punchy blast kickback.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 88,
      damageHead: 175,
      falloffStart: 36,
      falloffEnd: 115,
      minFalloffMul: 0.56,
      armorPen: 1.12,
      rpm: 88,
      magSize: 6,
      reloadTime: 1.88,
      range: 190,
      spreadHip: 0.010,
      spreadAds: 0.0020,
      spreadMove: 0.009,
      recoilPitch: 0.058,
      recoilYaw: 0.012,
      kickbackForce: 11.8,
      kickbackGroundLift: 5.2,
      adsTimeSec: 0.20,
      baseWeightKg: 3.3,
      defaultOptic: 'iron',
      ammoClass: 'shell',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25'])
    },
    dmr: {
      id: 'dmr',
      slotCategory: 'primary',
      classId: 'sniper',
      classLabel: 'Marksman DMR',
      name: 'MK-14 Marksman',
      shortName: 'MK-14',
      hudTag: 'DMR',
      description: 'Fast semi-auto marksman sniper engineered for rapid 2-tap eliminations and crisp optical tracking.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 62,
      damageHead: 155,
      falloffStart: 120,
      falloffEnd: 310,
      minFalloffMul: 0.84,
      armorPen: 1.10,
      rpm: 280,
      magSize: 12,
      reloadTime: 1.92,
      range: 360,
      spreadHip: 0.022,
      spreadAds: 0.0007,
      spreadMove: 0.015,
      recoilPitch: 0.036,
      recoilYaw: 0.008,
      adsTimeSec: 0.25,
      baseWeightKg: 4.35,
      defaultOptic: 'acog_25',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot', 'holo_eotech', 'acog_25', 'sniper_4x'])
    },
    scout: {
      id: 'scout',
      slotCategory: 'primary',
      classId: 'sniper',
      classLabel: 'Quickscope Scout',
      name: 'SSG-08 Scout',
      shortName: 'Scout',
      hudTag: 'SCT',
      description: 'Featherweight quickscope bolt-action rifle with lightning ADS and razor-accurate mid-air jump-shots.',
      auto: false,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 78,
      damageHead: 225,
      falloffStart: 160,
      falloffEnd: 390,
      minFalloffMul: 0.90,
      armorPen: 1.14,
      rpm: 62,
      magSize: 8,
      reloadTime: 1.85,
      range: 410,
      spreadHip: 0.018,
      spreadAds: 0.00035,
      spreadMove: 0.0065,
      recoilPitch: 0.044,
      recoilYaw: 0.008,
      adsTimeSec: 0.21,
      baseWeightKg: 3.1,
      defaultOptic: 'sniper_4x',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'underbarrel', 'magazine', 'ammo', 'rearGrip', 'stock', 'apex']),
      allowedOptics: Object.freeze(['iron_snipe', 'acog_25', 'sniper_4x', 'sniper_var'])
    },
    katana: {
      id: 'katana',
      slotCategory: 'primary',
      classId: 'katana',
      classLabel: 'Primary Melee',
      name: 'Ronin Katana',
      shortName: 'Katana',
      hudTag: 'BLD',
      description: 'Forged samurai blade in the Primary slot: 3-hit slash combo, mid-surf kill-resetting slash-dash (E), and timed RMB crosshair bullet reflect (2.0s / 5.5s recharge).',
      auto: false,
      isMeleeWeapon: true,
      altFireMode: 'deflect',
      pellets: 1,
      pelletSpread: 0,
      damageBody: 75,
      damageHead: 135,
      falloffStart: 5,
      falloffEnd: 8,
      minFalloffMul: 1.0,
      armorPen: 1.25,
      rpm: 155,
      magSize: 1,
      reloadTime: 0.5,
      range: 4.8,
      spreadHip: 0,
      spreadAds: 0,
      spreadMove: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      adsTimeSec: 0.10,
      baseWeightKg: 0.95,
      defaultOptic: 'iron',
      ammoClass: 'none',
      katanaConfig: Object.freeze({
        slashRange: 4.8,
        slashConeDot: 0.35,
        slashDamage: 75,
        slashHeadDamage: 135,
        dashSpeed: 33,
        dashDuration: 0.22,
        dashCooldown: 4.5,
        dashDamage: 120,
        dashHitRadius: 2.35,
        dashResetOnKill: true,
        deflectMaxSec: 2.0,
        deflectRechargeSec: 5.5,
        deflectMinCharge: 0.30,
        deflectDamage: 115
      }),
      allowedSlots: Object.freeze(['apex']),
      allowedOptics: Object.freeze([])
    },
    g18: {
      id: 'g18',
      slotCategory: 'secondary',
      classId: 'pistol',
      classLabel: 'Machine Pistol',
      name: 'G-18 Auto',
      shortName: 'G-18',
      hudTag: 'MAP',
      description: 'Full-auto pocket machine pistol delivering 940 RPM panic firepower in close quarters.',
      auto: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 18,
      damageHead: 46,
      falloffStart: 16,
      falloffEnd: 62,
      minFalloffMul: 0.48,
      armorPen: 0.90,
      rpm: 940,
      magSize: 22,
      reloadTime: 1.28,
      range: 135,
      spreadHip: 0.011,
      spreadAds: 0.0042,
      spreadMove: 0.009,
      recoilPitch: 0.013,
      recoilYaw: 0.0095,
      adsTimeSec: 0.125,
      baseWeightKg: 1.25,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'muzzle', 'barrel', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot'])
    },
    akimbo: {
      id: 'akimbo',
      slotCategory: 'secondary',
      classId: 'pistol',
      classLabel: 'Dual-Wield Pistols',
      name: 'Dual VX-Pistols',
      shortName: 'Akimbo',
      hudTag: 'DUAL',
      description: 'Matched twin tactical sidearms firing alternating left-and-right volleys with stylish high-speed handling.',
      auto: true,
      dualWield: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 25,
      damageHead: 68,
      falloffStart: 20,
      falloffEnd: 74,
      minFalloffMul: 0.54,
      armorPen: 0.94,
      rpm: 620,
      magSize: 24,
      reloadTime: 1.62,
      range: 145,
      spreadHip: 0.010,
      spreadAds: 0.0065,
      spreadMove: 0.008,
      recoilPitch: 0.012,
      recoilYaw: 0.008,
      adsTimeSec: 0.14,
      baseWeightKg: 1.75,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['muzzle', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze([])
    },
    usps: {
      id: 'usps',
      slotCategory: 'secondary',
      classId: 'pistol',
      classLabel: 'Silenced Pistol',
      name: 'USP-S Ghost',
      shortName: 'USP-S',
      hudTag: 'SUP',
      description: 'Spec-ops silenced sidearm with built-in suppressor, pinpoint first-shot accuracy, and 1-tap headshots.',
      auto: false,
      inherentSuppressed: true,
      pellets: 1,
      pelletSpread: 0,
      damageBody: 34,
      damageHead: 102,
      falloffStart: 32,
      falloffEnd: 112,
      minFalloffMul: 0.68,
      armorPen: 0.98,
      rpm: 380,
      magSize: 12,
      reloadTime: 1.24,
      range: 195,
      spreadHip: 0.0048,
      spreadAds: 0.0010,
      spreadMove: 0.0052,
      recoilPitch: 0.013,
      recoilYaw: 0.004,
      adsTimeSec: 0.115,
      baseWeightKg: 1.15,
      defaultOptic: 'iron',
      ammoClass: 'bullet',
      allowedSlots: Object.freeze(['optic', 'barrel', 'magazine', 'ammo', 'rearGrip', 'apex']),
      allowedOptics: Object.freeze(['reflex_dot'])
    }
  });

  const WEAPON_IDS = Object.freeze(Object.keys(WEAPON_SPECS));
  const PRIMARY_WEAPON_IDS = Object.freeze(WEAPON_IDS.filter((id) => WEAPON_SPECS[id].slotCategory === 'primary'));
  const SECONDARY_WEAPON_IDS = Object.freeze(WEAPON_IDS.filter((id) => WEAPON_SPECS[id].slotCategory === 'secondary'));

  // Complete Gunsmith attachment catalog across all 8 categories
  const ATTACHMENTS = Object.freeze({
    optic: Object.freeze({
      reflex_dot: {
        id: 'reflex_dot',
        slot: 'optic',
        name: 'Micro Reflex Dot',
        shortName: 'Reflex',
        unlockLevel: 1,
        visual: 'reflex',
        opticType: 'reflex',
        adsZoom: 1.18,
        adsFovMul: 0.84,
        adsSensMul: 0.88,
        pros: ['Clean 1.2× red dot sight picture', 'Tighter ADS precision'],
        cons: ['Slightly slower ADS (+8ms)'],
        mods: { adsSpreadMul: 0.88, adsTimeAdd: 0.008, weightKg: 0.12 }
      },
      holo_eotech: {
        id: 'holo_eotech',
        slot: 'optic',
        name: 'VX-Holo Sight',
        shortName: 'Holo',
        unlockLevel: 3,
        visual: 'holo',
        opticType: 'holo',
        adsZoom: 1.35,
        adsFovMul: 0.76,
        adsSensMul: 0.82,
        pros: ['1.35× framed ring-dot reticle', 'Improved target acquisition & control'],
        cons: ['Slower ADS (+18ms)', '+0.22kg optic mass'],
        mods: { adsSpreadMul: 0.80, recoilPitchMul: 0.95, adsTimeAdd: 0.018, weightKg: 0.22 }
      },
      acog_25: {
        id: 'acog_25',
        slot: 'optic',
        name: '2.5× Tactical ACOG',
        shortName: 'ACOG 2.5×',
        unlockLevel: 6,
        visual: 'acog',
        opticType: 'acog',
        adsZoom: 2.5,
        adsFovMul: 0.48,
        adsSensMul: 0.58,
        pros: ['2.5× optical chevron reticle', 'Major ADS precision & range stability'],
        cons: ['Slower ADS (+36ms)', '+0.42kg mass'],
        mods: { adsSpreadMul: 0.65, rangeMul: 1.12, adsTimeAdd: 0.036, weightKg: 0.42 }
      },
      iron_snipe: {
        id: 'iron_snipe',
        slot: 'optic',
        name: 'Match Iron Sights',
        shortName: 'Irons',
        unlockLevel: 2,
        visual: 'iron_snipe',
        opticType: 'iron',
        adsZoom: 1.22,
        adsFovMul: 0.82,
        adsSensMul: 0.85,
        pros: ['Rapid quickscope ADS (-75ms)', 'Lighter chassis (-0.55kg)'],
        cons: ['Removes high-power sniper magnification'],
        mods: { adsTimeAdd: -0.075, weightKg: -0.55, adsMoveAdd: 0.12, adsSpreadMul: 1.25 }
      },
      sniper_4x: {
        id: 'sniper_4x',
        slot: 'optic',
        name: '4× Scout Scope',
        shortName: '4× Scout',
        unlockLevel: 4,
        visual: 'sniper_4x',
        opticType: 'sniper_4x',
        adsZoom: 4.0,
        adsFovMul: 0.34,
        adsSensMul: 0.42,
        pros: ['Faster sniper ADS (-40ms)', 'Clean 4× medium-long sightline'],
        cons: ['No 8× secondary zoom stage'],
        mods: { adsTimeAdd: -0.040, weightKg: -0.25 }
      },
      sniper_var: {
        id: 'sniper_var',
        slot: 'optic',
        name: '4×/8× Variable Precision',
        shortName: '4×/8× Var',
        unlockLevel: 1,
        visual: 'sniper_var',
        opticType: 'sniper_var',
        adsZoom: 4.0,
        adsZoomAlt: 8.0,
        adsFovMul: 0.32,
        adsFovMulAlt: 0.17,
        adsSensMul: 0.40,
        adsSensMulAlt: 0.22,
        pros: ['Dual-stage 4× / 8× optical zoom', 'Pinpoint long-range hold'],
        cons: ['Heavy glass assembly (+0.18kg)'],
        mods: { adsSpreadMul: 0.80, rangeMul: 1.08, adsTimeAdd: 0.015, weightKg: 0.18 }
      }
    }),

    muzzle: Object.freeze({
      suppressor: {
        id: 'suppressor',
        slot: 'muzzle',
        name: 'Monolithic Suppressor',
        shortName: 'Suppressor',
        unlockLevel: 2,
        visual: 'suppressor',
        suppressed: true,
        pros: ['Silenced report & damped flash', '+8% damage range & -8% recoil'],
        cons: ['Slower ADS (+22ms)', '+0.32kg muzzle weight'],
        mods: { rangeMul: 1.08, falloffMul: 1.08, recoilPitchMul: 0.92, adsTimeAdd: 0.022, weightKg: 0.32 }
      },
      compensator: {
        id: 'compensator',
        slot: 'muzzle',
        name: 'Vertical Compensator',
        shortName: 'Compensator',
        unlockLevel: 1,
        visual: 'compensator',
        pros: ['-18% vertical recoil kick', 'Crisp sustained spray control'],
        cons: ['Slightly slower ADS (+10ms)', '+0.15kg mass'],
        mods: { recoilPitchMul: 0.82, recoilYawMul: 0.96, adsTimeAdd: 0.010, weightKg: 0.15 }
      },
      muzzle_brake: {
        id: 'muzzle_brake',
        slot: 'muzzle',
        name: 'Twin-Port Muzzle Brake',
        shortName: 'Brake',
        unlockLevel: 5,
        visual: 'muzzle_brake',
        pros: ['-16% horizontal bounce', '-10% vertical kick'],
        cons: ['Slower ADS (+15ms)', '+0.20kg mass'],
        mods: { recoilPitchMul: 0.90, recoilYawMul: 0.84, adsTimeAdd: 0.015, weightKg: 0.20 }
      },
      choke_tight: {
        id: 'choke_tight',
        slot: 'muzzle',
        name: 'Tight Bore Choke',
        shortName: 'Tight Choke',
        unlockLevel: 4,
        visual: 'choke',
        weaponAllow: Object.freeze(['shotgun', 'sawedoff']),
        pros: ['-24% pellet spread cone', '+14% effective shotgun range'],
        cons: ['Slower ADS (+18ms)', '+0.22kg mass'],
        mods: { pelletSpreadMul: 0.76, falloffMul: 1.14, rangeMul: 1.12, adsTimeAdd: 0.018, weightKg: 0.22 }
      }
    }),

    barrel: Object.freeze({
      short_cqb: {
        id: 'short_cqb',
        slot: 'barrel',
        name: 'Short CQB Barrel',
        shortName: 'Short CQB',
        unlockLevel: 1,
        visual: 'short',
        pros: ['Faster ADS (-28ms)', 'Lighter frame (-0.45kg) & +surf agility'],
        cons: ['-16% damage range', '+12% vertical recoil'],
        mods: { adsTimeAdd: -0.028, weightKg: -0.45, rangeMul: 0.86, falloffMul: 0.84, recoilPitchMul: 1.12, adsMoveAdd: 0.06 }
      },
      fluted_light: {
        id: 'fluted_light',
        slot: 'barrel',
        name: 'Fluted Match Barrel',
        shortName: 'Fluted',
        unlockLevel: 4,
        visual: 'fluted',
        pros: ['Balanced +8% range', 'Faster ADS (-12ms) & -0.20kg'],
        cons: ['+5% horizontal recoil'],
        mods: { rangeMul: 1.08, falloffMul: 1.08, adsTimeAdd: -0.012, weightKg: -0.20, recoilYawMul: 1.05 }
      },
      heavy_long: {
        id: 'heavy_long',
        slot: 'barrel',
        name: 'Heavy Marksman Barrel',
        shortName: 'Heavy Long',
        unlockLevel: 7,
        visual: 'heavy_long',
        pros: ['+24% range & falloff retention', '-16% recoil & tighter ADS'],
        cons: ['Heavy (+0.78kg) reduces surf/sprint speed', 'Slower ADS (+42ms)'],
        mods: { rangeMul: 1.24, falloffMul: 1.24, recoilPitchMul: 0.84, recoilYawMul: 0.88, adsSpreadMul: 0.84, adsTimeAdd: 0.042, weightKg: 0.78 }
      }
    }),

    underbarrel: Object.freeze({
      angled_grip: {
        id: 'angled_grip',
        slot: 'underbarrel',
        name: 'Angled Foregrip',
        shortName: 'Angled Grip',
        unlockLevel: 2,
        visual: 'angled',
        pros: ['Faster ADS (-24ms)', '-10% horizontal recoil'],
        cons: ['+0.12kg mass'],
        mods: { adsTimeAdd: -0.024, recoilYawMul: 0.90, weightKg: 0.12 }
      },
      vertical_grip: {
        id: 'vertical_grip',
        slot: 'underbarrel',
        name: 'Tactical Vertical Grip',
        shortName: 'Vert Grip',
        unlockLevel: 4,
        visual: 'vertical',
        pros: ['-20% vertical recoil', '-15% moving spread'],
        cons: ['Slower ADS (+16ms)', '+0.24kg mass'],
        mods: { recoilPitchMul: 0.80, moveSpreadMul: 0.85, adsTimeAdd: 0.016, weightKg: 0.24 }
      },
      laser_tac: {
        id: 'laser_tac',
        slot: 'underbarrel',
        name: '5mW Surf Laser',
        shortName: 'Tac Laser',
        unlockLevel: 6,
        visual: 'laser',
        pros: ['-30% hipfire & mid-air spread', 'Faster ADS (-16ms)'],
        cons: ['Visible green emitter module (+0.10kg)'],
        mods: { hipSpreadMul: 0.70, moveSpreadMul: 0.78, adsTimeAdd: -0.016, weightKg: 0.10 }
      },
      stubby_grip: {
        id: 'stubby_grip',
        slot: 'underbarrel',
        name: 'Carbon Stubby Grip',
        shortName: 'Stubby',
        unlockLevel: 9,
        visual: 'stubby',
        pros: ['-14% vertical & horizontal recoil', '+5% ADS strafe speed'],
        cons: ['+0.16kg mass'],
        mods: { recoilPitchMul: 0.86, recoilYawMul: 0.86, adsMoveAdd: 0.05, weightKg: 0.16 }
      }
    }),

    magazine: Object.freeze({
      fast_mag: {
        id: 'fast_mag',
        slot: 'magazine',
        name: 'Sleight Fast Mag',
        shortName: 'Fast Mag',
        unlockLevel: 1,
        visual: 'fast_mag',
        weaponDeny: Object.freeze(['revolver']),
        pros: ['-26% reload duration', 'Quicker ADS (-8ms)'],
        cons: ['Slightly smaller capacity (-10%)'],
        mods: { reloadMul: 0.74, magMul: 0.90, adsTimeAdd: -0.008, weightKg: -0.10 }
      },
      extended_mag: {
        id: 'extended_mag',
        slot: 'magazine',
        name: 'Extended Magazine',
        shortName: 'Ext Mag',
        unlockLevel: 3,
        visual: 'extended_mag',
        weaponDeny: Object.freeze(['revolver']),
        pros: ['+40% magazine capacity'],
        cons: ['+14% reload time', '+0.36kg mass & +14ms ADS'],
        mods: { magMul: 1.40, reloadMul: 1.14, adsTimeAdd: 0.014, weightKg: 0.36 }
      },
      drum_mag: {
        id: 'drum_mag',
        slot: 'magazine',
        name: 'High-Cap Drum',
        shortName: 'Drum Mag',
        unlockLevel: 10,
        visual: 'drum_mag',
        weaponAllow: Object.freeze(['rifle', 'smg', 'shotgun', 'famas', 'scar', 'honeybadger', 'mp7']),
        pros: ['+80% magazine capacity for sustained fire'],
        cons: ['Heavy (+0.85kg) mobility penalty', '+26% reload time & +38ms ADS'],
        mods: { magMul: 1.80, reloadMul: 1.26, adsTimeAdd: 0.038, weightKg: 0.85 }
      },
      chamfered_cylinder: {
        id: 'chamfered_cylinder',
        slot: 'magazine',
        name: 'Chamfered Speed Chambers',
        shortName: 'Speed Cyl',
        unlockLevel: 1,
        visual: 'fast_mag',
        weaponAllow: Object.freeze(['revolver']),
        pros: ['-26% shell-by-shell reload speed', 'Smoother crane snap-shut'],
        cons: ['+4% vertical recoil kick'],
        mods: { reloadMul: 0.74, recoilPitchMul: 1.04, weightKg: -0.08 }
      },
      titanium_cylinder: {
        id: 'titanium_cylinder',
        slot: 'magazine',
        name: 'Titanium Fluted Cylinder',
        shortName: 'Ti Cylinder',
        unlockLevel: 6,
        visual: 'extended_mag',
        weaponAllow: Object.freeze(['revolver']),
        pros: ['-0.28kg weight for faster surf air', '-16% reload speed & -12% hipfire bloom'],
        cons: ['+8% vertical recoil'],
        mods: { reloadMul: 0.84, hipSpreadMul: 0.88, recoilPitchMul: 1.08, weightKg: -0.28 }
      }
    }),

    ammo: Object.freeze({
      // Standard rifle/SMG/sniper/pistol tactical cartridges
      fmj: {
        id: 'fmj',
        slot: 'ammo',
        name: 'FMJ Armor-Piercing',
        shortName: 'FMJ',
        unlockLevel: 2,
        visual: 'ammo_fmj',
        ammoClass: 'bullet',
        ammoType: 'fmj',
        tracerStyle: 'brass',
        pros: ['+20% range retention & armor/bot punch', '+8% damage beyond mid-range'],
        cons: ['+8% vertical recoil', '+0.08kg'],
        mods: { falloffMul: 1.22, minFalloffAdd: 0.12, armorPenMul: 1.18, recoilPitchMul: 1.08, weightKg: 0.08 }
      },
      hollow_point: {
        id: 'hollow_point',
        slot: 'ammo',
        name: 'Hollow Point Rounds',
        shortName: 'Hollow Pt',
        unlockLevel: 5,
        visual: 'ammo_hp',
        ammoClass: 'bullet',
        ammoType: 'hollow_point',
        tracerStyle: 'crimson',
        pros: ['+14% close-range body damage', 'Lethal CQB stopping power'],
        cons: ['-20% falloff start distance', 'Steeper long-range drop'],
        mods: { damageBodyMul: 1.14, falloffMul: 0.80, minFalloffAdd: -0.10, weightKg: 0.04 }
      },
      high_velocity: {
        id: 'high_velocity',
        slot: 'ammo',
        name: 'High-Velocity Match',
        shortName: 'High-Vel',
        unlockLevel: 8,
        visual: 'ammo_hv',
        ammoClass: 'bullet',
        ammoType: 'high_velocity',
        tracerStyle: 'cyan',
        pros: ['+24% range & crisp mid-air stability', '-22% moving/air bloom'],
        cons: ['+11% recoil kick', 'Bright cyan vapor tracer'],
        mods: { rangeMul: 1.24, falloffMul: 1.18, moveSpreadMul: 0.78, recoilPitchMul: 1.11, weightKg: 0.06 }
      },
      subsonic: {
        id: 'subsonic',
        slot: 'ammo',
        name: 'Subsonic Stealth Rounds',
        shortName: 'Subsonic',
        unlockLevel: 11,
        visual: 'ammo_sub',
        ammoClass: 'bullet',
        ammoType: 'subsonic',
        suppressed: true,
        tracerStyle: 'stealth',
        pros: ['Whisper-quiet acoustic signature & no tracer', '-12% recoil & faster follow-ups'],
        cons: ['-18% damage falloff range'],
        mods: { recoilPitchMul: 0.88, recoilYawMul: 0.92, falloffMul: 0.82, rangeMul: 0.88, weightKg: 0.02 }
      },
      // Shotgun-exclusive shells
      flechette: {
        id: 'flechette',
        slot: 'ammo',
        name: 'Flechette Dart Shells',
        shortName: 'Flechette',
        unlockLevel: 3,
        visual: 'ammo_hv',
        ammoClass: 'shell',
        ammoType: 'flechette',
        tracerStyle: 'cyan',
        pros: ['-26% pellet spread cone', '+35% mid-range retention & armor punch'],
        cons: ['-10% point-blank pellet damage'],
        mods: { pelletSpreadMul: 0.74, damageBodyMul: 0.90, falloffMul: 1.35, minFalloffAdd: 0.14, armorPenMul: 1.20, weightKg: 0.05 }
      },
      slug: {
        id: 'slug',
        slot: 'ammo',
        name: '12G Rifled Slug',
        shortName: '12G Slug',
        unlockLevel: 7,
        visual: 'ammo_fmj',
        ammoClass: 'shell',
        ammoType: 'slug',
        tracerStyle: 'brass',
        pros: ['Single precision 86-DMG / 170-HS slug', 'Massive range boost (+140%)'],
        cons: ['Removes multi-pellet buckshot spread', '+18% recoil'],
        mods: {
          overridePellets: 1,
          overridePelletSpread: 0,
          overrideDamageBody: 86,
          overrideDamageHead: 170,
          rangeMul: 2.1,
          falloffMul: 2.4,
          minFalloffAdd: 0.28,
          adsSpreadMul: 0.35,
          recoilPitchMul: 1.18,
          weightKg: 0.10
        }
      },
      magnum: {
        id: 'magnum',
        slot: 'ammo',
        name: 'High-Brass Magnum 00',
        shortName: 'Magnum 00',
        unlockLevel: 10,
        visual: 'ammo_hp',
        ammoClass: 'shell',
        ammoType: 'magnum',
        tracerStyle: 'crimson',
        pros: ['+18% pellet damage (10 pellets)', 'Shreds close quarters'],
        cons: ['+24% recoil & -10% fire rate', '+14% pellet spread'],
        mods: {
          overridePellets: 10,
          damageBodyMul: 1.12,
          pelletSpreadMul: 1.14,
          rpmMul: 0.90,
          recoilPitchMul: 1.24,
          weightKg: 0.14
        }
      }
    }),

    rearGrip: Object.freeze({
      stippled_grip: {
        id: 'stippled_grip',
        slot: 'rearGrip',
        name: 'Stippled Speed Tape',
        shortName: 'Stippled',
        unlockLevel: 1,
        visual: 'stippled',
        pros: ['Faster ADS (-22ms)', 'Snappier weapon handling'],
        cons: ['+5% recoil kick'],
        mods: { adsTimeAdd: -0.022, recoilPitchMul: 1.05, weightKg: -0.06 }
      },
      rubberized_grip: {
        id: 'rubberized_grip',
        slot: 'rearGrip',
        name: 'Rubberized Control Grip',
        shortName: 'Rubberized',
        unlockLevel: 5,
        visual: 'rubberized',
        pros: ['-14% vertical recoil', '-8% horizontal sway'],
        cons: ['+0.08kg mass', '+6ms ADS'],
        mods: { recoilPitchMul: 0.86, recoilYawMul: 0.92, adsTimeAdd: 0.006, weightKg: 0.08 }
      },
      granulated_grip: {
        id: 'granulated_grip',
        slot: 'rearGrip',
        name: 'Granulated Precision Wrap',
        shortName: 'Granulated',
        unlockLevel: 8,
        visual: 'granulated',
        pros: ['-18% ADS & moving spread', 'Steady aim-walk stability'],
        cons: ['+0.06kg mass'],
        mods: { adsSpreadMul: 0.82, moveSpreadMul: 0.86, weightKg: 0.06 }
      }
    }),

    stock: Object.freeze({
      no_stock: {
        id: 'no_stock',
        slot: 'stock',
        name: 'No Stock (Surf Cap)',
        shortName: 'No Stock',
        unlockLevel: 3,
        visual: 'no_stock',
        pros: ['-0.65kg massive surf/sprint mobility boost', 'Lightning ADS (-42ms) & +12% ADS strafe'],
        cons: ['+24% vertical & horizontal recoil'],
        mods: { weightKg: -0.65, adsTimeAdd: -0.042, adsMoveAdd: 0.12, recoilPitchMul: 1.24, recoilYawMul: 1.22 }
      },
      skeleton_stock: {
        id: 'skeleton_stock',
        slot: 'stock',
        name: 'Skeleton Agile Stock',
        shortName: 'Skeleton',
        unlockLevel: 6,
        visual: 'skeleton',
        pros: ['-0.32kg lighter surf mobility', 'Faster ADS (-20ms) & +8% ADS strafe'],
        cons: ['+8% vertical recoil'],
        mods: { weightKg: -0.32, adsTimeAdd: -0.020, adsMoveAdd: 0.08, recoilPitchMul: 1.08 }
      },
      heavy_stock: {
        id: 'heavy_stock',
        slot: 'stock',
        name: 'Precision Cheek-Riser Stock',
        shortName: 'Heavy Stock',
        unlockLevel: 9,
        visual: 'heavy',
        pros: ['-20% recoil & -20% ADS spread', 'Rock-solid long-range hold'],
        cons: ['Heavy (+0.52kg) reduces surf mobility', 'Slower ADS (+24ms)'],
        mods: { recoilPitchMul: 0.80, recoilYawMul: 0.82, adsSpreadMul: 0.80, adsTimeAdd: 0.024, weightKg: 0.52, adsMoveAdd: -0.06 }
      }
    }),

    apex: Object.freeze({
      chrono_gyro: {
        id: 'chrono_gyro',
        slot: 'apex',
        name: 'APEX Chrono Stabilizer',
        shortName: 'Chrono 0.28×',
        unlockLevel: 1,
        visual: 'chrono_gyro',
        isApex: true,
        chronoTimeScale: 0.28,
        chronoTier: 1,
        chronoRampIn: 0.14,
        chronoRampOut: 0.16,
        chronoAirSpreadMul: 0.85,
        chronoLabel: 'CHRONO HANG',
        pros: ['ADS slows your movement to 0.28× hangtime while keeping surf velocity', '-15% airborne ADS spread & 1:1 mouse aim'],
        cons: ['Glows cyan & hangs slow in mid-air for enemies to punish', '+0.38kg gyro mass & +22ms ADS'],
        mods: { adsTimeAdd: 0.022, weightKg: 0.38 }
      },
      chrono_overclock: {
        id: 'chrono_overclock',
        slot: 'apex',
        name: 'APEX Phase Anchor',
        shortName: 'Phase 0.18×',
        unlockLevel: 7,
        visual: 'chrono_overclock',
        isApex: true,
        chronoTimeScale: 0.18,
        chronoTier: 2,
        chronoRampIn: 0.17,
        chronoRampOut: 0.22,
        chronoAirSpreadMul: 0.72,
        chronoLabel: 'PHASE ANCHOR',
        pros: ['Deep 0.18× personal slow-mo hangtime on ADS (preserves momentum)', '-28% airborne ADS spread for surgical flicks'],
        cons: ['High-visibility amber stasis beacon & slower unscope ramp', '+0.55kg mass & +38ms ADS'],
        mods: { adsTimeAdd: 0.038, weightKg: 0.55, adsSpreadMul: 0.90 }
      }
    })
  });

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function getWeaponSpec(weaponId) {
    return WEAPON_SPECS[weaponId] || WEAPON_SPECS.rifle;
  }

  function getSlotAttachmentsForWeapon(weaponId, slotId) {
    const spec = getWeaponSpec(weaponId);
    if (!spec.allowedSlots.includes(slotId)) return [];
    const pool = ATTACHMENTS[slotId];
    if (!pool) return [];
    const out = [];
    for (const att of Object.values(pool)) {
      if (slotId === 'optic' && spec.allowedOptics && !spec.allowedOptics.includes(att.id)) continue;
      if (att.weaponAllow && !att.weaponAllow.includes(spec.id)) continue;
      if (att.weaponDeny && att.weaponDeny.includes(spec.id)) continue;
      if (slotId === 'ammo' && att.ammoClass && att.ammoClass !== spec.ammoClass) continue;
      out.push(att);
    }
    out.sort((a, b) => (a.unlockLevel - b.unlockLevel) || a.name.localeCompare(b.name));
    return out;
  }

  function getAttachmentDef(slotId, attId) {
    if (!slotId || !attId) return null;
    const pool = ATTACHMENTS[slotId];
    return pool && pool[attId] ? pool[attId] : null;
  }

  function getWeaponLevelInfo(xpRaw) {
    const xp = Math.max(0, Math.min(999999, Math.floor(Number(xpRaw) || 0)));
    let level = 1;
    for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_XP_THRESHOLDS[i]) level = i + 1;
    }
    const isMax = level >= MAX_WEAPON_LEVEL;
    const currentFloor = LEVEL_XP_THRESHOLDS[level - 1] || 0;
    const nextThreshold = isMax ? LEVEL_XP_THRESHOLDS[MAX_WEAPON_LEVEL - 1] : LEVEL_XP_THRESHOLDS[level];
    const span = Math.max(1, nextThreshold - currentFloor);
    const progress = isMax ? 1 : clamp((xp - currentFloor) / span, 0, 1);
    return {
      xp,
      level,
      maxLevel: MAX_WEAPON_LEVEL,
      isMax,
      currentFloor,
      nextThreshold,
      xpIntoLevel: Math.max(0, xp - currentFloor),
      xpForNextLevel: isMax ? 0 : Math.max(0, nextThreshold - xp),
      progress
    };
  }

  function isAttachmentUnlocked(weaponId, slotId, attId, xpRaw) {
    const valid = getSlotAttachmentsForWeapon(weaponId, slotId);
    const att = valid.find((a) => a.id === attId);
    if (!att) return false;
    const info = getWeaponLevelInfo(xpRaw);
    return info.level >= att.unlockLevel;
  }

  function getUnlockedAttachmentsAtLevel(weaponId, level) {
    const spec = getWeaponSpec(weaponId);
    const unlocked = [];
    for (const slotId of spec.allowedSlots) {
      for (const att of getSlotAttachmentsForWeapon(weaponId, slotId)) {
        if (att.unlockLevel === level) unlocked.push(att);
      }
    }
    return unlocked;
  }

  function countEquippedAttachments(attMap) {
    if (!attMap || typeof attMap !== 'object') return 0;
    let c = 0;
    for (const slotId of ATTACHMENT_SLOT_IDS) {
      if (typeof attMap[slotId] === 'string' && attMap[slotId].length > 0) c++;
    }
    return c;
  }

  function sanitizeAttachmentsForWeapon(weaponId, rawAtts, weaponXp, enforceUnlock) {
    const spec = getWeaponSpec(weaponId);
    const out = {};
    if (!rawAtts || typeof rawAtts !== 'object') return out;
    let count = 0;
    for (const slotId of ATTACHMENT_SLOT_IDS) {
      if (count >= MAX_ATTACHMENTS) break;
      if (!spec.allowedSlots.includes(slotId)) continue;
      const attId = rawAtts[slotId];
      if (typeof attId !== 'string' || !attId) continue;
      const validList = getSlotAttachmentsForWeapon(weaponId, slotId);
      const found = validList.find((a) => a.id === attId);
      if (!found) continue;
      if (enforceUnlock && !isAttachmentUnlocked(weaponId, slotId, attId, weaponXp || 0)) continue;
      out[slotId] = attId;
      count++;
    }
    return out;
  }

  /**
   * Pure melee mobility baseline — Knife ALWAYS preserves pure 1.00x VELOCITY surf & ground physics.
   */
  function getMeleeMobilityProfile() {
    return {
      weaponId: 'knife',
      weightKg: 0.35,
      mobilityMult: 1.0,
      surfAirMult: 1.0,
      adsMoveMult: 1.0
    };
  }

  /**
   * Pure deterministic Gunsmith stat & weight solver.
   * Converts base weapon + up to 5 attachments into final combat & surf movement stats + 0..100 UI bars.
   */
  function resolveWeaponBuild(weaponId, rawAttachments) {
    const spec = getWeaponSpec(weaponId);
    const attachments = sanitizeAttachmentsForWeapon(spec.id, rawAttachments, 999999, false);

    let damageBody = spec.damageBody;
    let damageHead = spec.damageHead;
    let pellets = spec.pellets;
    let pelletSpread = spec.pelletSpread;
    let falloffStart = spec.falloffStart;
    let falloffEnd = spec.falloffEnd;
    let minFalloffMul = spec.minFalloffMul;
    let armorPen = spec.armorPen;
    let rpm = spec.rpm;
    let magSize = spec.magSize;
    let reloadTime = spec.reloadTime;
    let range = spec.range;
    let spreadHip = spec.spreadHip;
    let spreadAds = spec.spreadAds;
    let spreadMove = spec.spreadMove;
    let recoilPitch = spec.recoilPitch;
    let recoilYaw = spec.recoilYaw;
    let adsTimeSec = spec.adsTimeSec;
    let weightKg = spec.baseWeightKg;
    let adsMoveMult = spec.id === 'awp' ? 0.52 : spec.id === 'smg' || spec.id === 'pistol' ? 0.72 : 0.62;

    let opticType = spec.defaultOptic;
    let opticId = '';
    const defaultOpticDef = (spec.defaultOptic && ATTACHMENTS.optic[spec.defaultOptic]) || null;
    let adsZoom = defaultOpticDef ? (defaultOpticDef.adsZoom || 1.12) : 1.12;
    let adsZoomAlt = defaultOpticDef ? (defaultOpticDef.adsZoomAlt || 0) : 0;
    let adsFovMul = defaultOpticDef ? (defaultOpticDef.adsFovMul || 0.88) : 0.88;
    let adsFovMulAlt = defaultOpticDef ? (defaultOpticDef.adsFovMulAlt || 0) : 0;
    let adsSensMul = defaultOpticDef ? (defaultOpticDef.adsSensMul || 0.90) : 0.90;
    let adsSensMulAlt = defaultOpticDef ? (defaultOpticDef.adsSensMulAlt || 0) : 0;
    let suppressed = Boolean(spec.inherentSuppressed);
    let tracerStyle = spec.inherentSuppressed ? 'stealth' : 'standard';
    let ammoType = spec.ammoClass === 'shell' ? (spec.id === 'leverslug' ? 'slug' : 'buckshot') : 'standard';
    let chronoTimeScale = 1.0;
    let chronoTier = 0;
    let chronoRampIn = 0.14;
    let chronoRampOut = 0.16;
    let chronoAirSpreadMul = 1.0;
    let chronoLabel = '';

    let damageBodyMul = 1;
    let damageHeadMul = 1;
    let pelletSpreadMul = 1;
    let rangeMul = 1;
    let falloffMul = 1;
    let rpmMul = 1;
    let magMul = 1;
    let reloadMul = 1;
    let hipSpreadMul = 1;
    let adsSpreadMul = 1;
    let moveSpreadMul = 1;
    let recoilPitchMul = 1;
    let recoilYawMul = 1;
    let armorPenMul = 1;

    const equippedList = [];
    for (const slotId of ATTACHMENT_SLOT_IDS) {
      const attId = attachments[slotId];
      if (!attId) continue;
      const att = getAttachmentDef(slotId, attId);
      if (!att) continue;
      equippedList.push(att);
      const m = att.mods || {};

      if (typeof m.overridePellets === 'number') pellets = m.overridePellets;
      if (typeof m.overridePelletSpread === 'number') pelletSpread = m.overridePelletSpread;
      if (typeof m.overrideDamageBody === 'number') damageBody = m.overrideDamageBody;
      if (typeof m.overrideDamageHead === 'number') damageHead = m.overrideDamageHead;

      if (m.damageBodyMul) damageBodyMul *= m.damageBodyMul;
      if (m.damageHeadMul) damageHeadMul *= m.damageHeadMul;
      if (m.pelletSpreadMul) pelletSpreadMul *= m.pelletSpreadMul;
      if (m.rangeMul) rangeMul *= m.rangeMul;
      if (m.falloffMul) falloffMul *= m.falloffMul;
      if (m.minFalloffAdd) minFalloffMul += m.minFalloffAdd;
      if (m.armorPenMul) armorPenMul *= m.armorPenMul;
      if (m.rpmMul) rpmMul *= m.rpmMul;
      if (m.magMul) magMul *= m.magMul;
      if (m.reloadMul) reloadMul *= m.reloadMul;
      if (m.hipSpreadMul) hipSpreadMul *= m.hipSpreadMul;
      if (m.adsSpreadMul) adsSpreadMul *= m.adsSpreadMul;
      if (m.moveSpreadMul) moveSpreadMul *= m.moveSpreadMul;
      if (m.recoilPitchMul) recoilPitchMul *= m.recoilPitchMul;
      if (m.recoilYawMul) recoilYawMul *= m.recoilYawMul;
      if (m.adsTimeAdd) adsTimeSec += m.adsTimeAdd;
      if (m.weightKg) weightKg += m.weightKg;
      if (m.adsMoveAdd) adsMoveMult += m.adsMoveAdd;

      if (slotId === 'optic') {
        opticType = att.opticType || spec.defaultOptic;
        opticId = att.id;
        adsZoom = att.adsZoom || 1.18;
        adsZoomAlt = att.adsZoomAlt || 0;
        adsFovMul = att.adsFovMul || 0.84;
        adsFovMulAlt = att.adsFovMulAlt || 0;
        adsSensMul = att.adsSensMul || 0.86;
        adsSensMulAlt = att.adsSensMulAlt || 0;
      }
      if (att.suppressed) suppressed = true;
      if (att.tracerStyle) tracerStyle = att.tracerStyle;
      if (att.ammoType) ammoType = att.ammoType;
      if (typeof att.chronoTimeScale === 'number' && att.chronoTimeScale > 0 && att.chronoTimeScale < 1) {
        chronoTimeScale = att.chronoTimeScale;
        chronoTier = att.chronoTier || 1;
        chronoRampIn = att.chronoRampIn || 0.14;
        chronoRampOut = att.chronoRampOut || 0.16;
        chronoAirSpreadMul = att.chronoAirSpreadMul || 1.0;
        chronoLabel = att.chronoLabel || 'CHRONO HANG';
      }
    }

    damageBody = Math.max(8, Math.round(damageBody * damageBodyMul));
    damageHead = Math.max(damageBody + 4, Math.round(damageHead * damageHeadMul));
    pelletSpread = pellets > 1 ? Math.max(0.006, Number((pelletSpread * pelletSpreadMul).toFixed(4))) : 0;
    falloffStart = Math.max(8, Math.round(falloffStart * falloffMul));
    falloffEnd = Math.max(falloffStart + 18, Math.round(falloffEnd * falloffMul));
    minFalloffMul = clamp(Number(minFalloffMul.toFixed(2)), 0.25, 1.0);
    armorPen = clamp(Number((armorPen * armorPenMul).toFixed(2)), 0.75, 1.5);
    rpm = Math.max(30, Math.round(rpm * rpmMul));
    const fireInterval = Number((60 / rpm).toFixed(4));
    magSize = spec.id === 'revolver' ? spec.magSize : Math.max(2, Math.round(magSize * magMul));
    reloadTime = clamp(Number((reloadTime * reloadMul).toFixed(2)), 0.75, 3.8);
    range = Math.max(45, Math.round(range * rangeMul));
    spreadHip = clamp(Number((spreadHip * hipSpreadMul).toFixed(5)), 0.0005, 0.06);
    spreadAds = clamp(Number((spreadAds * adsSpreadMul).toFixed(5)), 0.0002, 0.025);
    spreadMove = clamp(Number((spreadMove * moveSpreadMul).toFixed(5)), 0.002, 0.045);
    recoilPitch = clamp(Number((recoilPitch * recoilPitchMul).toFixed(5)), 0.004, 0.11);
    recoilYaw = clamp(Number((recoilYaw * recoilYawMul).toFixed(5)), 0.0015, 0.04);
    adsTimeSec = clamp(Number(adsTimeSec.toFixed(3)), 0.085, 0.52);
    weightKg = clamp(Number(weightKg.toFixed(2)), 0.75, 8.2);
    adsMoveMult = clamp(Number(adsMoveMult.toFixed(3)), 0.45, 0.84);

    // Guarantee Revolver's core 1-shot-to-the-body from anywhere on the map across all attachment builds
    if (spec.id === 'revolver') {
      damageBody = Math.max(100, damageBody);
      damageHead = Math.max(240, damageHead);
      minFalloffMul = 1.0;
      range = Math.max(360, range);
    }

    const shellOpenTime = spec.shellOpenTime ? clamp(Number((spec.shellOpenTime * reloadMul).toFixed(3)), 0.22, 0.60) : 0;
    const shellInsertTime = spec.shellInsertTime ? clamp(Number((spec.shellInsertTime * reloadMul).toFixed(3)), 0.18, 0.55) : 0;
    const shellCloseTime = spec.shellCloseTime ? clamp(Number((spec.shellCloseTime * reloadMul).toFixed(3)), 0.18, 0.50) : 0;
    const fanSpread = spec.fanSpread ? clamp(Number((spec.fanSpread * hipSpreadMul).toFixed(5)), 0.020, 0.075) : 0;

    // Full VELOCITY Weight-to-Mobility & Surf Air-Strafe curves:
    // ~1.0 kg (USP-9) => ~1.01x mobility, ~1.005x surf air
    // ~3.4 kg (Stock V-47) => ~0.92x mobility, ~0.95x surf air
    // ~6.5 kg (Heavy AWP) => ~0.81x mobility, ~0.86x surf air
    const mobilityMult = clamp(Number((1.045 - weightKg * 0.036).toFixed(3)), 0.78, 1.02);
    const surfAirMult = clamp(Number((1.032 - weightKg * 0.024).toFixed(3)), 0.84, 1.01);

    // Normalized 0..100 stat bars for Gunsmith UI
    const effectiveBurstDamage = pellets > 1 ? Math.min(135, damageBody * pellets * 0.72) : damageBody;
    const damageBar = Math.round(clamp((effectiveBurstDamage / 112) * 100, 12, 100));
    const rangeBar = Math.round(clamp(((falloffStart * 0.65 + falloffEnd * 0.25) / 170) * 100, 10, 100));
    const fireRateBar = Math.round(clamp((Math.log(rpm) - Math.log(35)) / (Math.log(1000) - Math.log(35)) * 100, 8, 100));
    const accuracyRaw = 100 - (spreadAds * 11000 + recoilPitch * 780 + recoilYaw * 950 + pelletSpread * 520);
    const accuracyBar = Math.round(clamp(accuracyRaw, 12, 100));
    const handlingRaw = 100 - ((adsTimeSec - 0.09) * 185 + (reloadTime - 0.9) * 16);
    const handlingBar = Math.round(clamp(handlingRaw, 10, 100));
    const mobilityBar = Math.round(clamp(((mobilityMult - 0.76) / 0.26) * 100, 10, 100));

    return {
      weaponId: spec.id,
      slotCategory: spec.slotCategory,
      name: spec.name,
      shortName: spec.shortName,
      classLabel: spec.classLabel,
      hudTag: spec.hudTag,
      auto: spec.auto,
      attachments,
      attachmentCount: equippedList.length,
      equippedList,
      damageBody,
      damageHead,
      pellets,
      pelletSpread,
      falloffStart,
      falloffEnd,
      minFalloffMul,
      armorPen,
      rpm,
      fireInterval,
      magSize,
      reloadTime,
      range,
      spreadHip,
      spreadAds,
      spreadMove,
      recoilPitch,
      recoilYaw,
      adsTimeSec,
      weightKg,
      mobilityMult,
      surfAirMult,
      adsMoveMult,
      opticType,
      opticId,
      adsZoom,
      adsZoomAlt,
      adsFovMul,
      adsFovMulAlt,
      adsSensMul,
      adsSensMulAlt,
      suppressed,
      tracerStyle,
      ammoType,
      classId: spec.classId || 'ar',
      burstCount: spec.burstCount || 0,
      burstDelay: spec.burstDelay || 0.055,
      burstCooldown: spec.burstCooldown || 0.24,
      dualWield: Boolean(spec.dualWield),
      isMeleeWeapon: Boolean(spec.isMeleeWeapon),
      katanaConfig: spec.katanaConfig || null,
      kickbackForce: spec.kickbackForce || 0,
      kickbackGroundLift: spec.kickbackGroundLift || 0,
      fanKickbackForce: spec.fanKickbackForce || 0,
      chargeTimeSec: spec.chargeTimeSec || 0,
      altFireMode: spec.altFireMode || 'ads',
      fanDamageBody: spec.fanDamageBody || 0,
      fanDamageHead: spec.fanDamageHead || 0,
      fanFalloffStart: spec.fanFalloffStart || 12,
      fanFalloffEnd: spec.fanFalloffEnd || 38,
      fanMinFalloffMul: spec.fanMinFalloffMul || 0.45,
      fanSpread,
      fanFireInterval: spec.fanFireInterval || 0.21,
      reloadMode: spec.reloadMode || 'mag',
      shellOpenTime,
      shellInsertTime,
      shellCloseTime,
      hasChronoKit: chronoTier > 0,
      chronoTimeScale,
      chronoTier,
      chronoRampIn,
      chronoRampOut,
      chronoAirSpreadMul,
      chronoLabel,
      isScopedOptic: opticType === 'acog' || opticType === 'sniper_4x' || opticType === 'sniper_var',
      bars: {
        damage: damageBar,
        range: rangeBar,
        fireRate: fireRateBar,
        accuracy: accuracyBar,
        handling: handlingBar,
        mobility: mobilityBar
      }
    };
  }

  function computeDistanceDamage(build, distMeters, isHeadshot, isBotTarget, isFanFire) {
    if (!build) return 0;
    if (isFanFire && build.altFireMode === 'fan') {
      const fBase = isHeadshot ? (build.fanDamageHead || build.damageHead) : (build.fanDamageBody || build.damageBody);
      const fStart = build.fanFalloffStart || 12;
      const fEnd = build.fanFalloffEnd || 38;
      const fMin = build.fanMinFalloffMul || 0.45;
      let fMul = 1;
      if (distMeters > fStart) {
        const span = Math.max(1, fEnd - fStart);
        const t = clamp((distMeters - fStart) / span, 0, 1);
        fMul = 1 - t * (1 - fMin);
      }
      return Math.max(1, Math.round(fBase * fMul));
    }
    const base = isHeadshot ? build.damageHead : build.damageBody;
    let mul = 1;
    if (distMeters > build.falloffStart) {
      const span = Math.max(1, build.falloffEnd - build.falloffStart);
      const t = clamp((distMeters - build.falloffStart) / span, 0, 1);
      mul = 1 - t * (1 - build.minFalloffMul);
    }
    const penBonus = isBotTarget && build.armorPen > 1.0 ? 1 + (build.armorPen - 1) * 0.55 : 1;
    return Math.max(1, Math.round(base * mul * penBonus));
  }

  function compareBuilds(currentBuild, previewBuild) {
    const cur = currentBuild || resolveWeaponBuild('rifle', {});
    const pre = previewBuild || cur;
    return {
      bars: {
        damage: pre.bars.damage - cur.bars.damage,
        range: pre.bars.range - cur.bars.range,
        fireRate: pre.bars.fireRate - cur.bars.fireRate,
        accuracy: pre.bars.accuracy - cur.bars.accuracy,
        handling: pre.bars.handling - cur.bars.handling,
        mobility: pre.bars.mobility - cur.bars.mobility
      },
      adsMsDelta: Math.round((pre.adsTimeSec - cur.adsTimeSec) * 1000),
      reloadDelta: Number((pre.reloadTime - cur.reloadTime).toFixed(2)),
      weightDelta: Number((pre.weightKg - cur.weightKg).toFixed(2)),
      mobilityPctDelta: Math.round((pre.mobilityMult - cur.mobilityMult) * 100),
      surfPctDelta: Math.round((pre.surfAirMult - cur.surfAirMult) * 100),
      magDelta: pre.magSize - cur.magSize,
      chronoDelta: Number(((pre.chronoTimeScale || 1) - (cur.chronoTimeScale || 1)).toFixed(2))
    };
  }

  // ---------- Loadout-Selectable Persistent Scorestreak Special Weapons ----------
  const SCORESTREAKS = Object.freeze({
    rpg: {
      id: 'rpg',
      name: 'RPG-7 Rocket Launcher',
      shortName: 'RPG-7',
      hudTag: 'RPG',
      cost: 300,
      ammo: 3,
      fireInterval: 1.05,
      splashRadius: 7.2,
      maxDamage: 145,
      rocketSpeed: 46,
      rocketJumpImpulse: 22,
      accent: '#ff8a3d',
      description: '3 high-explosive warheads with massive splash damage and classic rocket-jump physics launches.'
    },
    minigun: {
      id: 'minigun',
      name: 'M-134 Rotary Minigun',
      shortName: 'M-134',
      hudTag: 'MINI',
      cost: 300,
      ammo: 120,
      rpm: 1400,
      fireInterval: 0.043,
      spinUpTime: 0.42,
      damageBody: 22,
      damageHead: 46,
      spread: 0.022,
      accent: '#65e7ff',
      description: '120-round rotary suppression chain gun with brief barrel spin-up into relentless tracer streams.'
    },
    railcannon: {
      id: 'railcannon',
      name: 'Hyper-Rail Plasma Cannon',
      shortName: 'HYPER-RAIL',
      hudTag: 'RAIL',
      cost: 300,
      ammo: 4,
      fireInterval: 0.72,
      damageBody: 160,
      damageHead: 320,
      pierceTargets: true,
      kickbackForce: 10.5,
      accent: '#a77dff',
      description: '4 hyper-velocity piercing plasma beams that slice straight through targets with instant impact.'
    },
    grenadelauncher: {
      id: 'grenadelauncher',
      name: 'MGL-6 Ricochet Launcher',
      shortName: 'MGL-6',
      hudTag: 'MGL',
      cost: 300,
      ammo: 6,
      fireInterval: 0.42,
      splashRadius: 6.2,
      maxDamage: 125,
      launchSpeed: 28,
      fuseTime: 1.65,
      maxBounces: 3,
      accent: '#ffd052',
      description: '6-chamber rotary grenade launcher firing bouncing explosives that bank cleanly around corners.'
    },
    nuke: {
      id: 'nuke',
      name: 'Tactical Nuke',
      shortName: 'NUKE',
      hudTag: 'NUKE',
      cost: 1000,
      ammo: 1,
      countdownSec: 5.0,
      isTacticalNuke: true,
      accent: '#ff425e',
      description: 'Orbital match-ender unlocked at 1,000 score. Sounds the siren, counts down, and wins the match on detonation.'
    }
  });
  const SCORESTREAK_IDS = Object.freeze(Object.keys(SCORESTREAKS));

  const SCORESTREAK_POINTS = Object.freeze({
    kill: 100,
    headshotBonus: 50,
    airOrSurfBonus: 25,
    deflectBonus: 50,
    botKill: 75
  });

  function getScorestreakDef(id) {
    return SCORESTREAKS[id] || SCORESTREAKS.rpg;
  }

  // ---------- CoD-Style Camo Challenges & Mastery Progression ----------
  const CAMO_KILL_WEIGHT_PVP = 1.0;
  const CAMO_KILL_WEIGHT_BOT = 0.35;

  const CAMO_CHALLENGES = Object.freeze([
    {
      id: 'kills',
      skinId: 'tactical_carbon',
      name: 'Tactical Carbon',
      label: 'Eliminations',
      desc: 'Score eliminations with this weapon (PvP 1.0× · Bots 0.35×)',
      target: 20,
      accent: '#6fa8c8'
    },
    {
      id: 'headshots',
      skinId: 'cyber_wireframe',
      name: 'Cyber Wireframe',
      label: 'Precision Kills',
      desc: 'Score headshot eliminations (or Katana lethal slashes)',
      target: 8,
      accent: '#38f6ff'
    },
    {
      id: 'airKills',
      skinId: 'holo_prism',
      name: 'Holo Prism',
      label: 'Mid-Air / Surf Kills',
      desc: 'Eliminate enemies while airborne, surfing, or moving at high speed (> 13 u/s)',
      target: 6,
      accent: '#7bf0ff'
    },
    {
      id: 'rangeKills',
      skinId: 'damascus',
      name: 'Damascus Steel',
      label: 'Point-Blank / Longshot',
      desc: 'Eliminate targets at point-blank (< 10m) or longshot (> 38m) range',
      target: 8,
      accent: '#c8d6e2'
    },
    {
      id: 'streaks',
      skinId: 'molten_magma',
      name: 'Molten Magma',
      label: '3-Kill Streaks',
      desc: 'Earn 3-kill or 5-kill streaks without dying',
      target: 3,
      accent: '#ff5e1a'
    },
    {
      id: 'signature',
      skinId: 'ronin_sakura',
      name: 'Ronin Sakura',
      label: 'Signature Mastery',
      desc: 'Katana Dash/Deflect kills · Kickback kills · Sniper HS · Multi-kills',
      target: 5,
      accent: '#ff8ec7'
    }
  ]);

  const CAMO_CHALLENGE_IDS = Object.freeze(CAMO_CHALLENGES.map((c) => c.id));

  const MASTERY_CAMOS = Object.freeze([
    {
      id: 'camo_gold',
      skinId: 'camo_gold',
      name: 'Gold',
      tier: 'MASTERY I',
      accent: '#ffd84d',
      desc: 'Complete all 6 Base Camo challenges on this weapon.'
    },
    {
      id: 'camo_diamond',
      skinId: 'camo_diamond',
      name: 'Diamond',
      tier: 'MASTERY II',
      accent: '#e6f7ff',
      desc: 'Unlock Gold on every weapon in this weapon class.'
    },
    {
      id: 'camo_dark_matter',
      skinId: 'camo_dark_matter',
      name: 'Dark Matter',
      tier: 'FINAL MASTERY',
      accent: '#c06bff',
      animated: true,
      desc: 'Unlock Diamond across all weapon classes. Animated cosmic Nebula shader.'
    }
  ]);

  const ALL_CAMO_SKIN_IDS = Object.freeze([
    ...CAMO_CHALLENGES.map((c) => c.skinId),
    ...MASTERY_CAMOS.map((m) => m.skinId)
  ]);

  function createEmptyWeaponCamoProgress() {
    const o = {};
    for (const cid of CAMO_CHALLENGE_IDS) o[cid] = 0;
    return o;
  }

  function createDefaultCamoProgress() {
    const map = {};
    for (const wid of WEAPON_IDS) map[wid] = createEmptyWeaponCamoProgress();
    return map;
  }

  function createDefaultEquippedWeaponCamos() {
    const map = {};
    for (const wid of WEAPON_IDS) map[wid] = '';
    return map;
  }

  function sanitizeCamoProgress(raw) {
    const out = createDefaultCamoProgress();
    if (!raw || typeof raw !== 'object') return out;
    for (const wid of WEAPON_IDS) {
      const entry = raw[wid];
      if (!entry || typeof entry !== 'object') continue;
      for (const cid of CAMO_CHALLENGE_IDS) {
        const val = Number(entry[cid]);
        out[wid][cid] = Number.isFinite(val) ? clamp(Math.round(val * 100) / 100, 0, 9999) : 0;
      }
    }
    return out;
  }

  function sanitizeEquippedWeaponCamos(raw) {
    const out = createDefaultEquippedWeaponCamos();
    if (!raw || typeof raw !== 'object') return out;
    for (const wid of WEAPON_IDS) {
      const cid = typeof raw[wid] === 'string' ? raw[wid].trim() : '';
      if (cid && ALL_CAMO_SKIN_IDS.includes(cid)) out[wid] = cid;
    }
    return out;
  }

  function hasWeaponGold(camoProgress, weaponId) {
    const entry = camoProgress && camoProgress[weaponId];
    if (!entry) return false;
    return CAMO_CHALLENGES.every((c) => (Number(entry[c.id]) || 0) >= c.target);
  }

  function getWeaponsInClass(classId) {
    return WEAPON_IDS.filter((wid) => WEAPON_SPECS[wid].classId === classId);
  }

  function hasClassDiamond(camoProgress, classId) {
    const members = getWeaponsInClass(classId);
    if (members.length === 0) return false;
    return members.every((wid) => hasWeaponGold(camoProgress, wid));
  }

  function hasDarkMatter(camoProgress) {
    return WEAPON_CLASSES.every((cls) => hasClassDiamond(camoProgress, cls.id));
  }

  function getWeaponCamoStatus(state, weaponId) {
    const clean = sanitizeLoadoutState(state);
    const wid = WEAPON_SPECS[weaponId] ? weaponId : 'rifle';
    const spec = WEAPON_SPECS[wid];
    const progress = (clean.camoProgress && clean.camoProgress[wid]) || createEmptyWeaponCamoProgress();

    const baseCamos = CAMO_CHALLENGES.map((ch) => {
      const current = Number(progress[ch.id]) || 0;
      const unlocked = current >= ch.target;
      return {
        id: ch.id,
        skinId: ch.skinId,
        name: ch.name,
        label: ch.label,
        desc: ch.desc,
        accent: ch.accent,
        current: Math.min(ch.target, Math.round(current * 100) / 100),
        rawCurrent: Math.round(current * 100) / 100,
        target: ch.target,
        pct: Math.round(clamp(current / ch.target, 0, 1) * 100),
        unlocked
      };
    });

    const baseUnlockedCount = baseCamos.filter((c) => c.unlocked).length;
    const goldUnlocked = baseUnlockedCount >= CAMO_CHALLENGES.length;
    const classWeapons = getWeaponsInClass(spec.classId);
    const classGoldCount = classWeapons.filter((id) => hasWeaponGold(clean.camoProgress, id)).length;
    const diamondUnlocked = goldUnlocked && classGoldCount >= classWeapons.length;
    const totalClasses = WEAPON_CLASSES.length;
    const diamondClassesCount = WEAPON_CLASSES.filter((cls) => hasClassDiamond(clean.camoProgress, cls.id)).length;
    const darkMatterUnlocked = diamondClassesCount >= totalClasses;

    const masteryCamos = [
      Object.assign({}, MASTERY_CAMOS[0], {
        unlocked: goldUnlocked,
        current: baseUnlockedCount,
        target: CAMO_CHALLENGES.length,
        pct: Math.round((baseUnlockedCount / CAMO_CHALLENGES.length) * 100)
      }),
      Object.assign({}, MASTERY_CAMOS[1], {
        unlocked: diamondUnlocked,
        current: classGoldCount,
        target: classWeapons.length,
        pct: Math.round((classGoldCount / Math.max(1, classWeapons.length)) * 100)
      }),
      Object.assign({}, MASTERY_CAMOS[2], {
        unlocked: darkMatterUnlocked,
        current: diamondClassesCount,
        target: totalClasses,
        pct: Math.round((diamondClassesCount / Math.max(1, totalClasses)) * 100)
      })
    ];

    const unlockedSkinIds = [];
    for (const c of baseCamos) if (c.unlocked) unlockedSkinIds.push(c.skinId);
    for (const m of masteryCamos) if (m.unlocked) unlockedSkinIds.push(m.skinId);

    return {
      weaponId: wid,
      classId: spec.classId,
      baseCamos,
      masteryCamos,
      baseUnlockedCount,
      goldUnlocked,
      diamondUnlocked,
      darkMatterUnlocked,
      unlockedSkinIds,
      equippedCamoId: (clean.equippedWeaponCamos && clean.equippedWeaponCamos[wid]) || ''
    };
  }

  function isCamoUnlockedForWeapon(state, weaponId, camoSkinId) {
    if (!camoSkinId) return true;
    const status = getWeaponCamoStatus(state, weaponId);
    return status.unlockedSkinIds.includes(camoSkinId);
  }

  function equipWeaponCamo(state, weaponId, camoSkinId) {
    const next = sanitizeLoadoutState(state);
    if (!WEAPON_SPECS[weaponId]) return { ok: false, reason: 'invalid_weapon', state: next };
    const cleanId = typeof camoSkinId === 'string' ? camoSkinId.trim() : '';
    if (!cleanId) {
      next.equippedWeaponCamos[weaponId] = '';
      return { ok: true, reason: 'cleared', state: next };
    }
    if (!isCamoUnlockedForWeapon(next, weaponId, cleanId)) {
      return { ok: false, reason: 'locked', state: next };
    }
    next.equippedWeaponCamos[weaponId] = cleanId;
    return { ok: true, reason: 'equipped', state: next };
  }

  function recordCombatKillForCamos(state, event) {
    const next = sanitizeLoadoutState(state);
    if (!event || !WEAPON_SPECS[event.weaponId]) {
      return { state: next, newlyUnlocked: [] };
    }
    const wid = event.weaponId;
    const spec = WEAPON_SPECS[wid];
    const beforeStatus = getWeaponCamoStatus(next, wid);
    const beforeSet = new Set(beforeStatus.unlockedSkinIds);

    const w = event.isBot ? CAMO_KILL_WEIGHT_BOT : CAMO_KILL_WEIGHT_PVP;
    const p = next.camoProgress[wid];
    const add = (key, amt) => {
      p[key] = clamp(Math.round(((p[key] || 0) + amt) * 100) / 100, 0, 9999);
    };

    // 1. Total kills
    add('kills', w);

    // 2. Headshots (Katana lethal slashes also advance precision if headshot or dash/deflect)
    if (event.isHeadshot || (wid === 'katana' && (event.isKatanaDash || event.isDeflectKill))) {
      add('headshots', w);
    }

    // 3. Mid-air / Surf / High-speed kills
    if (event.isAirborne || (Number(event.speed) || 0) >= 13) {
      add('airKills', w);
    }

    // 4. Point-Blank (< 10m) or Longshot (> 38m)
    const dist = Number(event.distance);
    if (Number.isFinite(dist) && (dist <= 10 || dist >= 38)) {
      add('rangeKills', w);
    }

    // 5. 3-Kill / 5-Kill Streaks without dying
    const streak = Math.floor(Number(event.streakCount) || 0);
    if (streak === 3 || streak === 5 || (streak > 5 && streak % 3 === 0)) {
      add('streaks', event.isBot ? 0.5 : 1.0);
    }

    // 6. Signature challenge
    const isSignature =
      Boolean(event.isKatanaDash) ||
      Boolean(event.isDeflectKill) ||
      (spec.kickbackForce > 0 && (event.isAirborne || (Number.isFinite(dist) && dist <= 14))) ||
      (spec.classId === 'sniper' && (event.isHeadshot || (Number.isFinite(dist) && dist >= 36))) ||
      (streak >= 2 && (spec.classId === 'ar' || spec.classId === 'smg' || spec.classId === 'pistol'));
    if (isSignature) {
      add('signature', w);
    }

    const afterStatus = getWeaponCamoStatus(next, wid);
    const newlyUnlocked = [];
    for (const c of afterStatus.baseCamos) {
      if (c.unlocked && !beforeSet.has(c.skinId)) {
        newlyUnlocked.push({ skinId: c.skinId, name: c.name, tier: 'BASE CAMO', accent: c.accent });
      }
    }
    for (const m of afterStatus.masteryCamos) {
      if (m.unlocked && !beforeSet.has(m.skinId)) {
        newlyUnlocked.push({ skinId: m.skinId, name: m.name, tier: m.tier, accent: m.accent });
      }
    }

    return { state: next, newlyUnlocked, status: afterStatus };
  }

  // ---------- 5 Named Loadout Slots & Progression State ----------
  function createStarterLoadouts() {
    return [
      {
        id: 'loadout_1',
        name: 'Assault Runner',
        primary: {
          weaponId: 'rifle',
          attachments: { optic: 'reflex_dot', muzzle: 'compensator', rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        secondary: {
          weaponId: 'deagle',
          attachments: { rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        melee: { knifeItemId: '' },
        scorestreakId: 'rpg'
      },
      {
        id: 'loadout_2',
        name: 'Surf Vector',
        primary: {
          weaponId: 'smg',
          attachments: { optic: 'reflex_dot', barrel: 'short_cqb', magazine: 'fast_mag' },
          skinItemId: ''
        },
        secondary: {
          weaponId: 'pistol',
          attachments: { magazine: 'fast_mag' },
          skinItemId: ''
        },
        melee: { knifeItemId: '' },
        scorestreakId: 'minigun'
      },
      {
        id: 'loadout_3',
        name: 'Breacher CQB',
        primary: {
          weaponId: 'shotgun',
          attachments: { optic: 'reflex_dot', barrel: 'short_cqb', rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        secondary: {
          weaponId: 'g18',
          attachments: { rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        melee: { knifeItemId: '' },
        scorestreakId: 'grenadelauncher'
      },
      {
        id: 'loadout_4',
        name: 'Marksman AWP',
        primary: {
          weaponId: 'awp',
          attachments: { optic: 'sniper_var', magazine: 'fast_mag', rearGrip: 'stippled_grip', apex: 'chrono_gyro' },
          skinItemId: ''
        },
        secondary: {
          weaponId: 'usps',
          attachments: { rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        melee: { knifeItemId: '' },
        scorestreakId: 'railcannon'
      },
      {
        id: 'loadout_5',
        name: 'Gunslinger R-88',
        primary: {
          weaponId: 'revolver',
          attachments: { barrel: 'short_cqb', magazine: 'chamfered_cylinder', rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        secondary: {
          weaponId: 'akimbo',
          attachments: { rearGrip: 'stippled_grip' },
          skinItemId: ''
        },
        melee: { knifeItemId: '' },
        scorestreakId: 'nuke'
      }
    ];
  }

  function createDefaultWeaponXp() {
    const map = {};
    for (const wid of WEAPON_IDS) map[wid] = 0;
    return map;
  }

  function createDefaultEquippedWeaponSkins() {
    const map = {};
    for (const wid of WEAPON_IDS) map[wid] = 'starter_' + wid + '_slate';
    return map;
  }

  function createDefaultLoadoutState() {
    return {
      activeIndex: 0,
      loadouts: createStarterLoadouts(),
      weaponXp: createDefaultWeaponXp(),
      equippedWeaponSkins: createDefaultEquippedWeaponSkins(),
      camoProgress: createDefaultCamoProgress(),
      equippedWeaponCamos: createDefaultEquippedWeaponCamos()
    };
  }

  function sanitizeLoadoutName(raw, fallback) {
    const clean = typeof raw === 'string'
      ? raw.replace(/[^\w\s\-'.]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24)
      : '';
    return clean || fallback;
  }

  function sanitizeIdStr(raw, maxLen) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > (maxLen || 64)) return '';
    return /^[a-zA-Z0-9_\-]+$/.test(trimmed) ? trimmed : '';
  }

  function sanitizeLoadoutState(raw) {
    const defaults = createDefaultLoadoutState();
    if (!raw || typeof raw !== 'object') return defaults;

    const weaponXp = createDefaultWeaponXp();
    if (raw.weaponXp && typeof raw.weaponXp === 'object') {
      for (const wid of WEAPON_IDS) {
        const n = Math.floor(Number(raw.weaponXp[wid]));
        weaponXp[wid] = Number.isFinite(n) ? clamp(n, 0, 999999) : 0;
      }
    }

    const equippedWeaponSkins = createDefaultEquippedWeaponSkins();
    if (raw.equippedWeaponSkins && typeof raw.equippedWeaponSkins === 'object') {
      for (const wid of WEAPON_IDS) {
        const sid = sanitizeIdStr(raw.equippedWeaponSkins[wid], 64);
        if (sid) equippedWeaponSkins[wid] = sid;
      }
    }

    const camoProgress = sanitizeCamoProgress(raw.camoProgress);
    const equippedWeaponCamos = sanitizeEquippedWeaponCamos(raw.equippedWeaponCamos);

    const rawLoadouts = Array.isArray(raw.loadouts) ? raw.loadouts : [];
    const loadouts = [];
    for (let i = 0; i < LOADOUT_COUNT; i++) {
      const def = defaults.loadouts[i];
      const src = rawLoadouts[i] && typeof rawLoadouts[i] === 'object' ? rawLoadouts[i] : def;
      const pSrc = src.primary && typeof src.primary === 'object' ? src.primary : def.primary;
      const sSrc = src.secondary && typeof src.secondary === 'object' ? src.secondary : def.secondary;
      const mSrc = src.melee && typeof src.melee === 'object' ? src.melee : def.melee;

      const pWeapon = PRIMARY_WEAPON_IDS.includes(pSrc.weaponId) ? pSrc.weaponId : def.primary.weaponId;
      const sWeapon = SECONDARY_WEAPON_IDS.includes(sSrc.weaponId) ? sSrc.weaponId : def.secondary.weaponId;
      const streakId = SCORESTREAK_IDS.includes(src.scorestreakId) ? src.scorestreakId : (def.scorestreakId || 'rpg');

      loadouts.push({
        id: 'loadout_' + (i + 1),
        name: sanitizeLoadoutName(src.name, def.name),
        primary: {
          weaponId: pWeapon,
          attachments: sanitizeAttachmentsForWeapon(pWeapon, pSrc.attachments, weaponXp[pWeapon], true),
          skinItemId: sanitizeIdStr(pSrc.skinItemId, 64)
        },
        secondary: {
          weaponId: sWeapon,
          attachments: sanitizeAttachmentsForWeapon(sWeapon, sSrc.attachments, weaponXp[sWeapon], true),
          skinItemId: sanitizeIdStr(sSrc.skinItemId, 64)
        },
        melee: {
          knifeItemId: sanitizeIdStr(mSrc.knifeItemId, 64)
        },
        scorestreakId: streakId
      });
    }

    const rawIdx = Math.floor(Number(raw.activeIndex));
    const activeIndex = Number.isFinite(rawIdx) ? clamp(rawIdx, 0, LOADOUT_COUNT - 1) : 0;

    return {
      activeIndex,
      loadouts,
      weaponXp,
      equippedWeaponSkins,
      camoProgress,
      equippedWeaponCamos
    };
  }

  function getActiveLoadout(state) {
    const clean = sanitizeLoadoutState(state);
    return clean.loadouts[clean.activeIndex] || clean.loadouts[0];
  }

  function setLoadoutScorestreak(state, loadoutIndex, streakId) {
    const next = sanitizeLoadoutState(state);
    const idx = clamp(Math.floor(Number(loadoutIndex) || 0), 0, LOADOUT_COUNT - 1);
    if (!SCORESTREAK_IDS.includes(streakId)) return next;
    next.loadouts[idx].scorestreakId = streakId;
    return next;
  }

  function equipAttachment(state, loadoutIndex, slotCategory, attSlot, attId) {
    const next = sanitizeLoadoutState(state);
    const idx = clamp(Math.floor(Number(loadoutIndex) || 0), 0, LOADOUT_COUNT - 1);
    const cat = slotCategory === 'secondary' ? 'secondary' : 'primary';
    const entry = next.loadouts[idx][cat];
    const weaponId = entry.weaponId;
    const xp = next.weaponXp[weaponId] || 0;

    if (!attId) {
      delete entry.attachments[attSlot];
      return { ok: true, reason: 'removed', state: next };
    }

    if (!isAttachmentUnlocked(weaponId, attSlot, attId, xp)) {
      const def = getAttachmentDef(attSlot, attId);
      return {
        ok: false,
        reason: 'locked',
        unlockLevel: def ? def.unlockLevel : 2,
        state: next
      };
    }

    const alreadyHasSlot = typeof entry.attachments[attSlot] === 'string' && entry.attachments[attSlot].length > 0;
    if (alreadyHasSlot && entry.attachments[attSlot] === attId) {
      // Toggle off when clicking the already-equipped attachment
      delete entry.attachments[attSlot];
      return { ok: true, reason: 'removed', state: next };
    }

    const currentCount = countEquippedAttachments(entry.attachments);
    if (!alreadyHasSlot && currentCount >= MAX_ATTACHMENTS) {
      return {
        ok: false,
        reason: 'cap_reached',
        maxAttachments: MAX_ATTACHMENTS,
        state: next
      };
    }

    entry.attachments[attSlot] = attId;
    return { ok: true, reason: 'equipped', state: next };
  }

  function setLoadoutWeapon(state, loadoutIndex, slotCategory, weaponId) {
    const next = sanitizeLoadoutState(state);
    const idx = clamp(Math.floor(Number(loadoutIndex) || 0), 0, LOADOUT_COUNT - 1);
    const cat = slotCategory === 'secondary' ? 'secondary' : 'primary';
    const allowed = cat === 'secondary' ? SECONDARY_WEAPON_IDS : PRIMARY_WEAPON_IDS;
    if (!allowed.includes(weaponId)) return next;
    const entry = next.loadouts[idx][cat];
    if (entry.weaponId === weaponId) return next;
    entry.weaponId = weaponId;
    // Keep only valid unlocked attachments for the new weapon (usually clears incompatible ones)
    entry.attachments = sanitizeAttachmentsForWeapon(weaponId, entry.attachments, next.weaponXp[weaponId], true);
    entry.skinItemId = '';
    return next;
  }

  function awardWeaponXp(state, weaponId, xpGain) {
    const next = sanitizeLoadoutState(state);
    if (!WEAPON_SPECS[weaponId]) {
      return { state: next, weaponId, xpAdded: 0, leveledUp: false, prevLevel: 1, newLevel: 1, newUnlocks: [] };
    }
    const add = Math.max(0, Math.floor(Number(xpGain) || 0));
    const beforeInfo = getWeaponLevelInfo(next.weaponXp[weaponId]);
    next.weaponXp[weaponId] = Math.min(999999, next.weaponXp[weaponId] + add);
    const afterInfo = getWeaponLevelInfo(next.weaponXp[weaponId]);
    const newUnlocks = [];
    if (afterInfo.level > beforeInfo.level) {
      for (let lv = beforeInfo.level + 1; lv <= afterInfo.level; lv++) {
        for (const u of getUnlockedAttachmentsAtLevel(weaponId, lv)) {
          newUnlocks.push(u);
        }
      }
    }
    return {
      state: next,
      weaponId,
      xpAdded: add,
      leveledUp: afterInfo.level > beforeInfo.level,
      prevLevel: beforeInfo.level,
      newLevel: afterInfo.level,
      levelInfo: afterInfo,
      newUnlocks
    };
  }

  // ---------- Native Firestore Serialization (No JSON Strings!) ----------
  function toCloudLoadoutsPayload(state, uid) {
    const clean = sanitizeLoadoutState(state);
    const camoProgressPayload = {};
    for (const wid of WEAPON_IDS) {
      camoProgressPayload[wid] = Object.assign({}, clean.camoProgress[wid]);
    }
    return {
      uid: String(uid || ''),
      activeIndex: clean.activeIndex,
      loadouts: clean.loadouts.map((l) => ({
        id: l.id,
        name: l.name,
        primary: {
          weaponId: l.primary.weaponId,
          attachments: Object.assign({}, l.primary.attachments),
          skinItemId: l.primary.skinItemId || ''
        },
        secondary: {
          weaponId: l.secondary.weaponId,
          attachments: Object.assign({}, l.secondary.attachments),
          skinItemId: l.secondary.skinItemId || ''
        },
        melee: {
          knifeItemId: l.melee.knifeItemId || ''
        },
        scorestreakId: l.scorestreakId || 'rpg'
      })),
      weaponXp: Object.assign({}, clean.weaponXp),
      equippedWeaponSkins: Object.assign({}, clean.equippedWeaponSkins),
      camoProgress: camoProgressPayload,
      equippedWeaponCamos: Object.assign({}, clean.equippedWeaponCamos)
    };
  }

  function mergeLoadoutStates(localState, cloudState) {
    const local = sanitizeLoadoutState(localState);
    if (!cloudState || typeof cloudState !== 'object') return local;
    const cloud = sanitizeLoadoutState(cloudState);

    // Always keep the max XP per weapon so progress is never lost across devices or reloads
    const weaponXp = {};
    for (const wid of WEAPON_IDS) {
      weaponXp[wid] = Math.max(local.weaponXp[wid] || 0, cloud.weaponXp[wid] || 0);
    }

    // Always keep the max camo progress per weapon/challenge
    const camoProgress = createDefaultCamoProgress();
    for (const wid of WEAPON_IDS) {
      for (const cid of CAMO_CHALLENGE_IDS) {
        camoProgress[wid][cid] = Math.max(
          (local.camoProgress[wid] && local.camoProgress[wid][cid]) || 0,
          (cloud.camoProgress[wid] && cloud.camoProgress[wid][cid]) || 0
        );
      }
    }

    const localTotalXp = WEAPON_IDS.reduce((s, id) => s + (local.weaponXp[id] || 0), 0);
    const cloudTotalXp = WEAPON_IDS.reduce((s, id) => s + (cloud.weaponXp[id] || 0), 0);
    const preferLocal = localTotalXp > cloudTotalXp;

    const equippedWeaponSkins = Object.assign({}, cloud.equippedWeaponSkins);
    for (const wid of WEAPON_IDS) {
      const localSkin = local.equippedWeaponSkins[wid];
      if (localSkin && !localSkin.startsWith('starter_') && (preferLocal || !equippedWeaponSkins[wid] || equippedWeaponSkins[wid].startsWith('starter_'))) {
        equippedWeaponSkins[wid] = localSkin;
      }
    }

    const equippedWeaponCamos = Object.assign({}, cloud.equippedWeaponCamos);
    for (const wid of WEAPON_IDS) {
      const localCamo = local.equippedWeaponCamos[wid];
      if (localCamo && (preferLocal || !equippedWeaponCamos[wid])) {
        equippedWeaponCamos[wid] = localCamo;
      }
    }

    const base = preferLocal ? local : cloud;
    return sanitizeLoadoutState({
      activeIndex: base.activeIndex,
      loadouts: base.loadouts,
      weaponXp,
      equippedWeaponSkins,
      camoProgress,
      equippedWeaponCamos
    });
  }

  // ---------- Local Storage with Self-Healing Backup ----------
  function resolveStorage(storage) {
    if (storage && typeof storage.getItem === 'function') return storage;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (_) {}
    return null;
  }

  function tryReadKey(store, key) {
    try {
      const raw = store.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return sanitizeLoadoutState(parsed);
    } catch (_) {
      return null;
    }
  }

  function totalXpOf(state) {
    return WEAPON_IDS.reduce((s, id) => s + (state.weaponXp[id] || 0), 0);
  }

  function loadLocal(storage) {
    const store = resolveStorage(storage);
    if (!store) return createDefaultLoadoutState();
    const primary = tryReadKey(store, STORAGE_KEY);
    const backup = tryReadKey(store, BACKUP_STORAGE_KEY);
    if (primary) {
      if (backup && totalXpOf(primary) === 0 && totalXpOf(backup) > 0) {
        try { store.setItem(STORAGE_KEY, JSON.stringify(backup)); } catch (_) {}
        return backup;
      }
      return primary;
    }
    if (backup) {
      try { store.setItem(STORAGE_KEY, JSON.stringify(backup)); } catch (_) {}
      return backup;
    }
    const fresh = createDefaultLoadoutState();
    try { store.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch (_) {}
    return fresh;
  }

  function saveLocal(state, storage) {
    const clean = sanitizeLoadoutState(state);
    const store = resolveStorage(storage);
    if (store) {
      const serialized = JSON.stringify(clean);
      try { store.setItem(STORAGE_KEY, serialized); } catch (_) {}
      try {
        const existingBackup = tryReadKey(store, BACKUP_STORAGE_KEY);
        if (!existingBackup || totalXpOf(clean) >= totalXpOf(existingBackup)) {
          store.setItem(BACKUP_STORAGE_KEY, serialized);
        }
      } catch (_) {}
    }
    return clean;
  }

  return {
    STORAGE_KEY,
    BACKUP_STORAGE_KEY,
    MAX_ATTACHMENTS,
    LOADOUT_COUNT,
    MAX_WEAPON_LEVEL,
    ATTACHMENT_SLOTS,
    ATTACHMENT_SLOT_IDS,
    LEVEL_XP_THRESHOLDS,
    XP_REWARDS,
    WEAPON_CLASSES,
    WEAPON_SPECS,
    WEAPON_IDS,
    PRIMARY_WEAPON_IDS,
    SECONDARY_WEAPON_IDS,
    ATTACHMENTS,
    SCORESTREAKS,
    SCORESTREAK_IDS,
    SCORESTREAK_POINTS,
    CAMO_KILL_WEIGHT_PVP,
    CAMO_KILL_WEIGHT_BOT,
    CAMO_CHALLENGES,
    CAMO_CHALLENGE_IDS,
    MASTERY_CAMOS,
    ALL_CAMO_SKIN_IDS,
    getWeaponSpec,
    getScorestreakDef,
    getSlotAttachmentsForWeapon,
    getAttachmentDef,
    getWeaponLevelInfo,
    isAttachmentUnlocked,
    getUnlockedAttachmentsAtLevel,
    countEquippedAttachments,
    sanitizeAttachmentsForWeapon,
    getMeleeMobilityProfile,
    resolveWeaponBuild,
    computeDistanceDamage,
    compareBuilds,
    getWeaponsInClass,
    hasWeaponGold,
    hasClassDiamond,
    hasDarkMatter,
    getWeaponCamoStatus,
    isCamoUnlockedForWeapon,
    equipWeaponCamo,
    recordCombatKillForCamos,
    createStarterLoadouts,
    createDefaultWeaponXp,
    createDefaultEquippedWeaponSkins,
    createDefaultCamoProgress,
    createDefaultEquippedWeaponCamos,
    createDefaultLoadoutState,
    sanitizeLoadoutName,
    sanitizeLoadoutState,
    getActiveLoadout,
    setLoadoutScorestreak,
    equipAttachment,
    setLoadoutWeapon,
    awardWeaponXp,
    toCloudLoadoutsPayload,
    mergeLoadoutStates,
    loadLocal,
    saveLocal
  };
});
