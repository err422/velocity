// Pure CS-style knife & 4-archetype glove catalog, procedural pattern math (Case Hardened Blue Gem,
// Doppler, Fade, Marble Fade, Crimson Web, Slaughter, Vice, Pandora's Box, Hedge Maze, Cobalt Skulls, etc.),
// float wear grades, CS case drop tables (with Gold knives & Gold gloves), 1/100 Mythic inspect roller,
// roulette strip generator, and inventory state store for VELOCITY.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KnivesSystem = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const STORAGE_KEY = 'velocity_inventory_v1';
  const BACKUP_STORAGE_KEY = 'velocity_inventory_backup_v1';
  const SOLD_IDS_STORAGE_KEY = 'velocity_inventory_sold_v1';
  const DIRTY_STORAGE_KEY = 'velocity_inventory_dirty_v1';

  const KNIFE_TYPES = Object.freeze({
    default: {
      id: 'default',
      name: 'Default Tactical',
      shortName: 'Tactical',
      inspectName: 'Wrist Flip Inspect',
      mythicName: 'Precision Juggle & Tip Balance',
      description: 'Balanced drop-point tactical blade with ribbed polymer grip.'
    },
    karambit: {
      id: 'karambit',
      name: 'Karambit',
      shortName: 'Karambit',
      inspectName: 'Finger-Ring Spin',
      mythicName: 'Infinity Ring Cascade',
      description: 'Curved talon blade with signature pommel ring built for surf spins.'
    },
    butterfly: {
      id: 'butterfly',
      name: 'Butterfly Knife',
      shortName: 'Butterfly',
      inspectName: 'Balisong Rollover',
      mythicName: 'Grand Balisong Freestyle',
      description: 'Articulated dual-handle balisong with snappy fan draw and flip tricks.'
    },
    m9: {
      id: 'm9',
      name: 'M9 Bayonet',
      shortName: 'M9 Bayonet',
      inspectName: 'Heavy Blade Tilt',
      mythicName: 'Tactical Double-Flip & Reverse Roll',
      description: 'Broad clip-point combat blade with sawtooth spine and wire-cutter eye.'
    },
    skeleton: {
      id: 'skeleton',
      name: 'Skeleton Knife',
      shortName: 'Skeleton',
      inspectName: 'Center-Ring Twirl',
      mythicName: 'Kunai Vortex & Skewer Catch',
      description: 'Full-tang skeletonized kunai profile with paracord wrap and spin cutout.'
    }
  });

  const KNIFE_TYPE_IDS = Object.freeze(Object.keys(KNIFE_TYPES));

  const GLOVE_TYPES = Object.freeze({
    standard: {
      id: 'standard',
      name: 'Standard Gloves',
      shortName: 'Standard',
      description: 'Fingerless tactical surf gloves with carbon knuckle bridge and cuff piping.'
    },
    sport: {
      id: 'sport',
      name: 'Sport Gloves',
      shortName: 'Sport',
      description: 'Sleek full-finger athletic mesh and synthetic suede palms with molded dorsal ribs.'
    },
    specialist: {
      id: 'specialist',
      name: 'Specialist Gloves',
      shortName: 'Specialist',
      description: 'Heavy armored full-finger tactical gauntlets with oversized carbon knuckle plates.'
    },
    wraps: {
      id: 'wraps',
      name: 'Hand Wraps',
      shortName: 'Hand Wraps',
      description: 'Layered diagonal cloth and leather tape bandages wrapped across knuckles and wrists.'
    }
  });

  const GLOVE_TYPE_IDS = Object.freeze(Object.keys(GLOVE_TYPES));

  const WEAPON_TYPES = Object.freeze({
    rifle: {
      id: 'rifle',
      name: 'V-47 Rifle',
      shortName: 'Rifle',
      slot: 1,
      magSize: 30,
      rpm: 600,
      fireInterval: 0.10,
      damageBody: 34,
      damageHead: 100,
      reloadTime: 1.75,
      auto: true,
      scoped: false,
      range: 260,
      spreadBase: 0.0022,
      spreadHip: 0.0022,
      spreadMove: 0.011,
      recoilPitch: 0.014,
      recoilYaw: 0.007,
      inspectName: 'Mag Check & Side Tilt',
      description: 'Full-auto precision surf carbine with crisp 1-tap headshots and controlled recoil.'
    },
    smg: {
      id: 'smg',
      name: 'VX-9 Vector',
      shortName: 'VX-9',
      slot: 1,
      magSize: 32,
      rpm: 920,
      fireInterval: 0.065,
      damageBody: 22,
      damageHead: 56,
      reloadTime: 1.42,
      auto: true,
      scoped: false,
      range: 185,
      spreadBase: 0.0024,
      spreadHip: 0.0068,
      spreadMove: 0.0065,
      recoilPitch: 0.0105,
      recoilYaw: 0.0078,
      inspectName: 'Sideways Frame Flip',
      description: 'Ultra-high RPM surf SMG with tight hipfire and featherweight air-strafe handling.'
    },
    shotgun: {
      id: 'shotgun',
      name: 'M870 Breacher',
      shortName: 'M870',
      slot: 1,
      magSize: 6,
      rpm: 76,
      fireInterval: 0.79,
      damageBody: 19,
      damageHead: 32,
      reloadTime: 1.95,
      auto: false,
      scoped: false,
      range: 110,
      spreadBase: 0.006,
      spreadHip: 0.014,
      spreadMove: 0.010,
      recoilPitch: 0.052,
      recoilYaw: 0.014,
      inspectName: 'Pump Rack & Chamber Check',
      description: '12-gauge pump-action breacher configurable for Buckshot, Flechette, or precision Slugs.'
    },
    awp: {
      id: 'awp',
      name: 'AWP Sniper',
      shortName: 'AWP',
      slot: 1,
      magSize: 5,
      rpm: 43,
      fireInterval: 1.40,
      damageBody: 100,
      damageHead: 250,
      reloadTime: 2.35,
      auto: false,
      scoped: true,
      range: 420,
      spreadBase: 0.0004,
      spreadHip: 0.032,
      spreadMove: 0.022,
      recoilPitch: 0.062,
      recoilYaw: 0.010,
      inspectName: 'Bolt Sweep & Optic Check',
      description: 'High-caliber bolt-action rifle with 2-stage RMB optic zoom and 1-shot eliminations.'
    },
    revolver: {
      id: 'revolver',
      name: 'R-88 Magnum',
      shortName: 'R-88',
      slot: 1,
      magSize: 6,
      rpm: 86,
      fireInterval: 0.70,
      damageBody: 105,
      damageHead: 260,
      reloadTime: 2.88,
      auto: false,
      scoped: false,
      range: 420,
      spreadBase: 0.0012,
      spreadHip: 0.0012,
      spreadMove: 0.0068,
      recoilPitch: 0.056,
      recoilYaw: 0.011,
      inspectName: 'Cylinder Pop & Trigger Spin',
      description: 'Heavy .500 magnum revolver with 0.20s charged 1-shot hitscan power, RMB fan-the-hammer, and CS-style spins.'
    },
    deagle: {
      id: 'deagle',
      name: 'Deagle .50',
      shortName: 'Deagle',
      slot: 2,
      magSize: 7,
      rpm: 210,
      fireInterval: 0.285,
      damageBody: 52,
      damageHead: 120,
      reloadTime: 1.45,
      auto: false,
      scoped: false,
      range: 220,
      spreadBase: 0.0018,
      spreadHip: 0.0018,
      spreadMove: 0.013,
      recoilPitch: 0.038,
      recoilYaw: 0.009,
      inspectName: 'Slide Spin & Balance',
      description: 'Heavy .50 cal semi-auto hand cannon built for mid-air flicks and 1-tap headshots.'
    },
    pistol: {
      id: 'pistol',
      name: 'USP-9 Tactical',
      shortName: 'USP-9',
      slot: 2,
      magSize: 15,
      rpm: 460,
      fireInterval: 0.13,
      damageBody: 28,
      damageHead: 84,
      reloadTime: 1.18,
      auto: false,
      scoped: false,
      range: 175,
      spreadBase: 0.0016,
      spreadHip: 0.0062,
      spreadMove: 0.0068,
      recoilPitch: 0.015,
      recoilYaw: 0.005,
      inspectName: 'Slide Press Check',
      description: 'Featherweight tactical 9mm pistol with near-zero weight penalty and razor-sharp ADS.'
    },
    famas: {
      id: 'famas',
      name: 'F-33 Burst',
      shortName: 'F-33',
      slot: 1,
      magSize: 27,
      rpm: 820,
      fireInterval: 0.073,
      damageBody: 32,
      damageHead: 92,
      reloadTime: 1.72,
      auto: false,
      burstCount: 3,
      scoped: false,
      range: 270,
      spreadBase: 0.0014,
      spreadHip: 0.009,
      spreadMove: 0.010,
      recoilPitch: 0.011,
      recoilYaw: 0.005,
      inspectName: 'Bullpup Mag Flip',
      description: 'Precision 3-round burst bullpup tactical rifle capable of lethal single-burst eliminations.'
    },
    scar: {
      id: 'scar',
      name: 'SC-20 Heavy',
      shortName: 'SC-20',
      slot: 1,
      magSize: 20,
      rpm: 465,
      fireInterval: 0.129,
      damageBody: 46,
      damageHead: 118,
      reloadTime: 1.98,
      auto: true,
      scoped: false,
      range: 310,
      spreadBase: 0.0015,
      spreadHip: 0.013,
      spreadMove: 0.013,
      recoilPitch: 0.021,
      recoilYaw: 0.0085,
      inspectName: 'Charging Handle Rack',
      description: 'Hard-hitting 7.62mm heavy battle rifle built for brutal 2-to-3 shot mid-range takedowns.'
    },
    honeybadger: {
      id: 'honeybadger',
      name: 'HB-7 Phantom',
      shortName: 'HB-7',
      slot: 1,
      magSize: 30,
      rpm: 740,
      fireInterval: 0.081,
      damageBody: 30,
      damageHead: 86,
      reloadTime: 1.56,
      auto: true,
      suppressed: true,
      scoped: false,
      range: 225,
      spreadBase: 0.0018,
      spreadHip: 0.0082,
      spreadMove: 0.0085,
      recoilPitch: 0.0115,
      recoilYaw: 0.0055,
      inspectName: 'Suppressor Heat Check',
      description: 'Compact stealth carbine with an integrated suppressor, whisper-quiet report, and rapid handling.'
    },
    mp7: {
      id: 'mp7',
      name: 'MP-7 Viper',
      shortName: 'MP-7',
      slot: 1,
      magSize: 36,
      rpm: 1050,
      fireInterval: 0.057,
      damageBody: 19,
      damageHead: 48,
      reloadTime: 1.32,
      auto: true,
      scoped: false,
      range: 155,
      spreadBase: 0.0026,
      spreadHip: 0.0060,
      spreadMove: 0.0058,
      recoilPitch: 0.0092,
      recoilYaw: 0.0072,
      inspectName: 'PDW Grip Twirl',
      description: 'Ultra-fast 1,050 RPM compact micro-SMG with razor-tight surf agility and blistering CQB DPS.'
    },
    sawedoff: {
      id: 'sawedoff',
      name: 'DB-12 Sawed-Off',
      shortName: 'DB-12',
      slot: 1,
      magSize: 2,
      rpm: 240,
      fireInterval: 0.25,
      damageBody: 22,
      damageHead: 36,
      reloadTime: 1.48,
      auto: false,
      scoped: false,
      range: 75,
      spreadBase: 0.018,
      spreadHip: 0.022,
      spreadMove: 0.014,
      recoilPitch: 0.082,
      recoilYaw: 0.020,
      inspectName: 'Break-Action Shell Pop',
      description: 'Brutal twin-barrel sawed-off shotgun delivering massive burst damage and huge physics kickback.'
    },
    leverslug: {
      id: 'leverslug',
      name: 'LV-45 Lever Slug',
      shortName: 'LV-45',
      slot: 1,
      magSize: 6,
      rpm: 88,
      fireInterval: 0.68,
      damageBody: 88,
      damageHead: 175,
      reloadTime: 1.88,
      auto: false,
      scoped: false,
      range: 190,
      spreadBase: 0.0022,
      spreadHip: 0.010,
      spreadMove: 0.009,
      recoilPitch: 0.058,
      recoilYaw: 0.012,
      inspectName: 'Lever Spin Cock',
      description: 'Mid-range lever-action rifled slug shotgun combining pinpoint lethal slugs with crisp physics kickback.'
    },
    dmr: {
      id: 'dmr',
      name: 'MK-14 Marksman',
      shortName: 'MK-14',
      slot: 1,
      magSize: 12,
      rpm: 280,
      fireInterval: 0.214,
      damageBody: 62,
      damageHead: 155,
      reloadTime: 1.92,
      auto: false,
      scoped: true,
      range: 360,
      spreadBase: 0.0008,
      spreadHip: 0.022,
      spreadMove: 0.016,
      recoilPitch: 0.036,
      recoilYaw: 0.008,
      inspectName: 'Gas Block & Optic Sweep',
      description: 'Fast semi-auto designated marksman rifle for rapid 2-tap body shots and crisp 1-tap headshots.'
    },
    scout: {
      id: 'scout',
      name: 'SSG-08 Scout',
      shortName: 'Scout',
      slot: 1,
      magSize: 8,
      rpm: 62,
      fireInterval: 0.96,
      damageBody: 78,
      damageHead: 225,
      reloadTime: 1.85,
      auto: false,
      scoped: true,
      range: 410,
      spreadBase: 0.0004,
      spreadHip: 0.018,
      spreadMove: 0.007,
      recoilPitch: 0.044,
      recoilYaw: 0.008,
      inspectName: 'Featherweight Bolt Snap',
      description: 'Featherweight quickscope bolt-action sniper built for mid-air jump-scoping and 1-tap headshots.'
    },
    katana: {
      id: 'katana',
      name: 'Ronin Katana',
      shortName: 'Katana',
      slot: 1,
      magSize: 1,
      rpm: 155,
      fireInterval: 0.38,
      damageBody: 75,
      damageHead: 135,
      reloadTime: 0.5,
      auto: false,
      scoped: false,
      isMeleeWeapon: true,
      range: 4.8,
      spreadBase: 0,
      spreadHip: 0,
      spreadMove: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      inspectName: 'Samurai Chiburi Flourish',
      description: 'Primary forged katana with 3-hit slash combo, kill-resetting aerial slash-dash, and timed bullet reflection.'
    },
    g18: {
      id: 'g18',
      name: 'G-18 Auto',
      shortName: 'G-18',
      slot: 2,
      magSize: 22,
      rpm: 940,
      fireInterval: 0.064,
      damageBody: 18,
      damageHead: 46,
      reloadTime: 1.28,
      auto: true,
      scoped: false,
      range: 135,
      spreadBase: 0.0042,
      spreadHip: 0.011,
      spreadMove: 0.009,
      recoilPitch: 0.013,
      recoilYaw: 0.0095,
      inspectName: 'Extended Mag Slap',
      description: 'Full-auto pocket machine pistol delivering frantic close-quarters backup firepower.'
    },
    akimbo: {
      id: 'akimbo',
      name: 'Dual VX-Pistols',
      shortName: 'Akimbo',
      slot: 2,
      magSize: 24,
      rpm: 620,
      fireInterval: 0.096,
      damageBody: 25,
      damageHead: 68,
      reloadTime: 1.62,
      auto: true,
      dualWield: true,
      scoped: false,
      range: 145,
      spreadBase: 0.0065,
      spreadHip: 0.010,
      spreadMove: 0.008,
      recoilPitch: 0.012,
      recoilYaw: 0.008,
      inspectName: 'Twin Synchronized Spin',
      description: 'Matched dual-wield sidearms firing alternating left-and-right volleys with stylish mobility.'
    },
    usps: {
      id: 'usps',
      name: 'USP-S Ghost',
      shortName: 'USP-S',
      slot: 2,
      magSize: 12,
      rpm: 380,
      fireInterval: 0.158,
      damageBody: 34,
      damageHead: 102,
      reloadTime: 1.24,
      auto: false,
      suppressed: true,
      scoped: false,
      range: 195,
      spreadBase: 0.0010,
      spreadHip: 0.0048,
      spreadMove: 0.0052,
      recoilPitch: 0.013,
      recoilYaw: 0.004,
      inspectName: 'Silencer Thread Twist',
      description: 'Suppressed spec-ops tactical pistol engineered for surgical 1-tap headshots and silent flanks.'
    }
  });

  const WEAPON_TYPE_IDS = Object.freeze(Object.keys(WEAPON_TYPES));

  const RARITIES = Object.freeze({
    milspec: { id: 'milspec', label: 'Mil-Spec', color: '#4b69ff', weight: 42, order: 1 },
    restricted: { id: 'restricted', label: 'Restricted', color: '#8847ff', weight: 22, order: 2 },
    classified: { id: 'classified', label: 'Classified', color: '#d32ce6', weight: 13, order: 3 },
    covert: { id: 'covert', label: 'Covert', color: '#eb4b4b', weight: 8, order: 4 },
    gold: { id: 'gold', label: 'Rare Special', color: '#f5c542', weight: 15, order: 5 }
  });

  const RARITY_IDS = Object.freeze(Object.keys(RARITIES));

  const ECONOMY = Object.freeze({
    STARTING_COINS: 150,
    MAX_COINS: 9999999,
    REWARDS: Object.freeze({
      courseFinish: 25,
      cleanGauntlet: 10,
      newPb: 30,
      dailyFirstClear: 40,
      arenaKill: 8,
      arenaHeadshotKill: 12,
      arenaMatchComplete: 20,
      arenaMatchWin: 45
    }),
    SELL_RARITY_BASE: Object.freeze({
      milspec: 20,
      restricted: 45,
      classified: 100,
      covert: 220,
      gold: 480
    }),
    SELL_WEAPON_TYPE_MUL: Object.freeze({
      pistol: 0.95,
      g18: 0.98,
      usps: 1.02,
      akimbo: 1.08,
      deagle: 1.0,
      smg: 1.08,
      mp7: 1.08,
      shotgun: 1.1,
      sawedoff: 1.12,
      leverslug: 1.14,
      rifle: 1.15,
      famas: 1.15,
      scar: 1.18,
      honeybadger: 1.18,
      revolver: 1.22,
      dmr: 1.20,
      scout: 1.22,
      awp: 1.25,
      katana: 1.38
    }),
    SELL_GLOVE_TYPE_MUL: Object.freeze({
      standard: 1.1,
      wraps: 1.2,
      specialist: 1.3,
      sport: 1.4
    }),
    SELL_KNIFE_TYPE_MUL: Object.freeze({
      default: 1.05,
      m9: 1.25,
      skeleton: 1.3,
      karambit: 1.45,
      butterfly: 1.5
    }),
    SELL_WEAR_MUL: Object.freeze({
      FN: 1.45,
      MW: 1.2,
      FT: 1.0,
      WW: 0.8,
      BS: 0.62
    }),
    SELL_SPECIAL_MUL: Object.freeze({
      '': 1.0,
      'PHASE 1': 1.15,
      'PHASE 2': 1.15,
      'PHASE 3': 1.15,
      'PHASE 4': 1.15,
      'FULL FADE': 1.35,
      'FIRE & ICE': 1.45,
      'RUBY': 1.65,
      'SAPPHIRE': 1.65,
      'BLACK PEARL': 1.65,
      'BLUE GEM': 1.75
    })
  });

  const SKINS = Object.freeze({
    vanilla: {
      id: 'vanilla',
      name: 'Vanilla',
      patternBased: false,
      minFloat: 0.06,
      maxFloat: 0.38,
      accent: '#9fb4c4',
      description: 'Raw brushed stainless steel with directional factory grind.'
    },
    ultraviolet: {
      id: 'ultraviolet',
      name: 'Ultraviolet',
      patternBased: false,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#7a5cff',
      description: 'Stealth matte obsidian steel paired with deep anodized violet trim.'
    },
    damascus: {
      id: 'damascus',
      name: 'Damascus Steel',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.50,
      accent: '#c8d6e2',
      description: 'Forged layered steel waves folded across the blade face.'
    },
    crimson_web: {
      id: 'crimson_web',
      name: 'Crimson Web',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#c92434',
      description: 'Hydrographic crimson finish overlaid with seeded spider-web centers.'
    },
    slaughter: {
      id: 'slaughter',
      name: 'Slaughter',
      patternBased: true,
      minFloat: 0.01,
      maxFloat: 0.26,
      accent: '#e03a52',
      description: 'Reflective metallic crimson zebra-diamond anodized pattern.'
    },
    tiger_tooth: {
      id: 'tiger_tooth',
      name: 'Tiger Tooth',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#f0b429',
      description: 'Anodized molten gold blade etched with dark tiger stripes.'
    },
    fade: {
      id: 'fade',
      name: 'Fade',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#ff6ad5',
      description: 'Translucent chrome-to-gold-to-magenta-to-violet anodized gradient.'
    },
    marble_fade: {
      id: 'marble_fade',
      name: 'Marble Fade',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#ff4f4f',
      description: 'Swirling metallic crimson, cobalt, and gold bands — Fire & Ice possible.'
    },
    doppler: {
      id: 'doppler',
      name: 'Doppler',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#3e7bff',
      description: 'Translucent smoky metallic swirls across Phases 1–4 plus Ruby, Sapphire & Black Pearl.'
    },
    case_hardened: {
      id: 'case_hardened',
      name: 'Case Hardened',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.99,
      accent: '#2ea8ff',
      description: 'Color case-hardened steel patina — seeded blue/gold distribution with Blue Gem patterns.'
    },
    emberstrike: {
      id: 'emberstrike',
      name: 'Emberstrike',
      patternBased: true,
      minFloat: 0.02,
      maxFloat: 0.24,
      accent: '#ff6b35',
      description: 'Dark forged steel cut with glowing ember channels and a heat-darkened edge.'
    },
    arctic_veil: {
      id: 'arctic_veil',
      name: 'Arctic Veil',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.18,
      accent: '#8eeaff',
      description: 'Frosted silver alloy with fractured glacier-blue facets and a glassy ice sheen.'
    }
  });

  const SKIN_IDS = Object.freeze(Object.keys(SKINS));

  const GLOVE_SKINS = Object.freeze({
    tactical_slate: {
      id: 'tactical_slate',
      name: 'Tactical Slate',
      patternBased: false,
      minFloat: 0.06,
      maxFloat: 0.38,
      accent: '#65e7ff',
      description: 'Factory-issue charcoal tactical weave with cyan surf piping.'
    },
    case_hardened: {
      id: 'case_hardened',
      name: 'Case Hardened',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.80,
      accent: '#2ea8ff',
      description: 'Heat-quenched blue and gold patina across backhand armor and knuckles.'
    },
    vice: {
      id: 'vice',
      name: 'Vice',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#ff4fd8',
      description: 'Electric neon magenta and surf cyan athletic micro-mesh with black palms.'
    },
    pandoras_box: {
      id: 'pandoras_box',
      name: "Pandora's Box",
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#8a5cff',
      description: 'Royal ultraviolet weave with geometric obsidian trim and violet knuckles.'
    },
    hedge_maze: {
      id: 'hedge_maze',
      name: 'Hedge Maze',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#2ce878',
      description: 'Vibrant emerald athletic weave accented by crisp chalk-white dorsal ribs.'
    },
    slingshot: {
      id: 'slingshot',
      name: 'Slingshot',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#ff4757',
      description: 'Racing scarlet red mesh backhand paired with bone-cream leather palms.'
    },
    crimson_kimono: {
      id: 'crimson_kimono',
      name: 'Crimson Kimono',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#e02f3f',
      description: 'Diagonal scarlet diamond weave over matte graphite armored plates.'
    },
    emerald_web: {
      id: 'emerald_web',
      name: 'Emerald Web',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#22d876',
      description: 'Toxic emerald specialist shell overlaid with seeded spider-web centers.'
    },
    fade: {
      id: 'fade',
      name: 'Fade',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#ff6ad5',
      description: 'Seed-shifted gold, magenta, and violet fade across specialist gauntlets.'
    },
    leather: {
      id: 'leather',
      name: 'Leather',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#b87a4b',
      description: 'Hand-stitched saddle-brown hide strips bound tightly across wrist and palm.'
    },
    slaughter: {
      id: 'slaughter',
      name: 'Slaughter',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#e03a52',
      description: 'Crimson zebra-diamond tactical tape strips layered over dark under-wraps.'
    },
    cobalt_skulls: {
      id: 'cobalt_skulls',
      name: 'Cobalt Skulls',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#3b82f6',
      description: 'Deep cobalt blue wraps stamped with seeded frost-white skull motifs.'
    },
    overprint: {
      id: 'overprint',
      name: 'Overprint',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#2ee6d6',
      description: 'Electric cyan and deep teal arrow-weave cloth wraps built for surf speed.'
    },
    breachline: {
      id: 'breachline',
      name: 'Breachline',
      patternBased: true,
      minFloat: 0.04,
      maxFloat: 0.72,
      accent: '#f5a33b',
      description: 'Reinforced black ballistic weave with amber hazard panels and stitched utility tabs.'
    },
    stormgrid: {
      id: 'stormgrid',
      name: 'Stormgrid',
      patternBased: true,
      minFloat: 0.04,
      maxFloat: 0.72,
      accent: '#4bd9ff',
      description: 'Deep cobalt mesh traced with electric-cyan gridlines and violet impact padding.'
    },
    eclipse_mantle: {
      id: 'eclipse_mantle',
      name: 'Eclipse Mantle',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.68,
      accent: '#c69a55',
      description: 'Obsidian tactical gloves with brushed-gold armor ribs and muted teal stitching.'
    }
  });

  const GLOVE_SKIN_IDS = Object.freeze(Object.keys(GLOVE_SKINS));

  const WEAPON_SKINS = Object.freeze({
    factory_slate: {
      id: 'factory_slate',
      name: 'Factory Slate',
      patternBased: false,
      minFloat: 0.04,
      maxFloat: 0.35,
      accent: '#65e7ff',
      description: 'Standard-issue matte graphite polymer and gunmetal steel with subtle cyan rail piping.'
    },
    ultraviolet: {
      id: 'ultraviolet',
      name: 'Ultraviolet',
      patternBased: false,
      minFloat: 0.06,
      maxFloat: 0.78,
      accent: '#7a5cff',
      description: 'Stealth matte obsidian receiver paired with deep anodized ultraviolet furniture.'
    },
    redline: {
      id: 'redline',
      name: 'Redline',
      patternBased: false,
      minFloat: 0.10,
      maxFloat: 0.70,
      accent: '#eb4b4b',
      description: 'Woven carbon-fiber chassis sliced by razor-sharp crimson racing pinstripes.'
    },
    damascus: {
      id: 'damascus',
      name: 'Damascus Steel',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.50,
      accent: '#c8d6e2',
      description: 'Layered folded-steel Damascus ripples milled across upper receiver and barrel.'
    },
    vulcan: {
      id: 'vulcan',
      name: 'Vulcan',
      patternBased: false,
      minFloat: 0.00,
      maxFloat: 0.68,
      accent: '#2ea8ff',
      description: 'Sport-inspired chalk white, cobalt, and electric cyan geometric velocity stripes.'
    },
    crimson_web: {
      id: 'crimson_web',
      name: 'Crimson Web',
      patternBased: true,
      minFloat: 0.06,
      maxFloat: 0.80,
      accent: '#c92434',
      description: 'Hydrographic crimson enamel laced with seeded obsidian spider-web centers.'
    },
    asiimov: {
      id: 'asiimov',
      name: 'Asiimov',
      patternBased: false,
      minFloat: 0.18,
      maxFloat: 0.96,
      accent: '#ff7b29',
      description: 'Iconic sci-fi white ceramic plating with precision safety-orange and jet-black blocks.'
    },
    blaze: {
      id: 'blaze',
      name: 'Blaze',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#ff8a24',
      description: 'Mirror-dark anodized slide engulfed in roaring gold-to-crimson airbrushed flames.'
    },
    neon_rider: {
      id: 'neon_rider',
      name: 'Neon Rider',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.65,
      accent: '#ff4fd8',
      description: 'High-contrast synthwave hot magenta, electric cyan, and deep indigo diagonal streaks.'
    },
    printstream: {
      id: 'printstream',
      name: 'Printstream',
      patternBased: false,
      minFloat: 0.00,
      maxFloat: 0.80,
      accent: '#eef6ff',
      description: 'Pearlescent satin-white chassis accented with crisp micro-etched obsidian telemetry marks.'
    },
    hyper_chroma: {
      id: 'hyper_chroma',
      name: 'Hyper Chroma',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.55,
      accent: '#2ee6d6',
      description: 'Prismatic fluid waves shifting across cyber teal, ultraviolet, and coral accents.'
    },
    fade: {
      id: 'fade',
      name: 'Fade',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#ff6ad5',
      description: 'Translucent gold, magenta, and violet anodized gradient — Full Fade patterns possible.'
    },
    case_hardened: {
      id: 'case_hardened',
      name: 'Case Hardened',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.99,
      accent: '#2ea8ff',
      description: 'Heat-quenched blue and gold patina across the receiver — Blue Gem seeds possible.'
    },
    dragon_gold: {
      id: 'dragon_gold',
      name: 'Dragon Gold',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.45,
      accent: '#f5c542',
      description: 'Burnished bullion-gold etched dragon scales sweeping across deep crimson-obsidian steel.'
    },
    hazard_pay: {
      id: 'hazard_pay',
      name: 'Hazard Pay',
      patternBased: true,
      minFloat: 0.04,
      maxFloat: 0.72,
      accent: '#f3a43b',
      description: 'Matte graphite armor broken up by industrial amber panels, black hazard bars, and stamped unit marks.'
    },
    coldfront: {
      id: 'coldfront',
      name: 'Coldfront',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.58,
      accent: '#8eeaff',
      description: 'Pale ceramic plating, glacier-blue facets, and crisp frost-white receiver ribs.'
    },
    redshift: {
      id: 'redshift',
      name: 'Redshift',
      patternBased: true,
      minFloat: 0.02,
      maxFloat: 0.62,
      accent: '#f04443',
      description: 'Smoked gunmetal swept by deep crimson heat bands and razor-red speed cuts.'
    },
    nitro: {
      id: 'nitro',
      name: 'Nitro',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.58,
      accent: '#4be5ef',
      description: 'Carbon-black racing shell with liquid cyan and magenta energy streaks.'
    },
    solarflare: {
      id: 'solarflare',
      name: 'Solar Flare',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.34,
      accent: '#f6bb49',
      description: 'Burnished champagne-gold panels with a dark bronze sunburst and engraved radial cuts.'
    },
    voidglass: {
      id: 'voidglass',
      name: 'Voidglass',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.42,
      accent: '#9e82ff',
      description: 'Black mirror finish fractured by prismatic violet and deep teal glass-like shards.'
    },
    tactical_carbon: {
      id: 'tactical_carbon',
      name: 'Tactical Carbon',
      patternBased: false,
      minFloat: 0.00,
      maxFloat: 0.45,
      accent: '#6fa8c8',
      description: 'Matte woven 3K carbon-fiber weave with gunmetal titanium hardware and subtle hex embossing.'
    },
    cyber_wireframe: {
      id: 'cyber_wireframe',
      name: 'Cyber Wireframe',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.50,
      accent: '#38f6ff',
      description: 'Deep obsidian chassis mapped with glowing cyan-to-magenta holographic vector mesh lines.'
    },
    holo_prism: {
      id: 'holo_prism',
      name: 'Holo Prism',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.38,
      accent: '#7bf0ff',
      description: 'Refractive holographic foil refracting cyan, magenta, and spectrum gold facets under studio light.'
    },
    molten_magma: {
      id: 'molten_magma',
      name: 'Molten Magma',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.48,
      accent: '#ff5e1a',
      description: 'Cracked volcanic basalt plating split by incandescent orange-gold molten lava fissures.'
    },
    ronin_sakura: {
      id: 'ronin_sakura',
      name: 'Ronin Sakura',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.42,
      accent: '#ff8ec7',
      description: 'Lacquered obsidian and ivory ceramic adorned with drifting crimson-pink sakura blossoms and gold leaf.'
    },
    oni_crimson: {
      id: 'oni_crimson',
      name: 'Oni Crimson',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.45,
      accent: '#ff2e4c',
      description: 'Japanese demonic Oni mask lacquer in blood-red, charcoal ink, and gilded bronze trim.'
    },
    shogun_gold: {
      id: 'shogun_gold',
      name: 'Shogun Gold',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.30,
      accent: '#ffd052',
      description: 'Imperial black lacquer inlaid with hand-chased gold wave filigree and crimson silk accents.'
    },
    reactive_overdrive: {
      id: 'reactive_overdrive',
      name: 'Overdrive Reactive',
      patternBased: true,
      reactive: true,
      minFloat: 0.00,
      maxFloat: 0.25,
      accent: '#46f2ff',
      description: 'Reactive energy core finish whose glowing plasma veins shift and intensify with your active killstreak.'
    },
    reactive_oni: {
      id: 'reactive_oni',
      name: 'Oni Fury Reactive',
      patternBased: true,
      reactive: true,
      minFloat: 0.00,
      maxFloat: 0.25,
      accent: '#ff425e',
      description: 'Cursed Oni warrior finish whose ember veins ignite brighter as your killstreak climbs.'
    },
    camo_gold: {
      id: 'camo_gold',
      name: 'Mastery Gold',
      patternBased: false,
      camoOnly: true,
      minFloat: 0.00,
      maxFloat: 0.05,
      accent: '#ffd84d',
      description: 'Solid engraved 24K bullion gold with obsidian topographic contour lines. Earned by completing all Base Camos.'
    },
    camo_diamond: {
      id: 'camo_diamond',
      name: 'Mastery Diamond',
      patternBased: false,
      camoOnly: true,
      minFloat: 0.00,
      maxFloat: 0.03,
      accent: '#e6f7ff',
      description: 'Pavé-set faceted crystalline diamonds mounted on platinum-gold trim. Earned via Gold on every weapon in class.'
    },
    camo_dark_matter: {
      id: 'camo_dark_matter',
      name: 'Dark Matter Nebula',
      patternBased: false,
      camoOnly: true,
      animated: true,
      minFloat: 0.00,
      maxFloat: 0.01,
      accent: '#c06bff',
      description: 'Animated cosmic Dark Matter nebula shader pulsing with ultraviolet starlight. Earned via Diamond on all classes.'
    },
    // ---------- Call of Duty Inspired Painted PBR Showcase Collection (18 Skins) ----------
    cod_opal: {
      id: 'cod_opal',
      name: 'Opal',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.06,
      accent: '#e8f4ff',
      description: 'Luminous mother-of-pearl white opal mosaic with pastel rose, aqua, and ice-blue nacre facets under mirror clearcoat.'
    },
    cod_dark_spine: {
      id: 'cod_dark_spine',
      name: 'Dark Spine',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.12,
      accent: '#d946ff',
      description: 'Smoked matte graphite armor split by razor-sharp crystalline magenta-violet energy spines and backlit crystal seams.'
    },
    cod_borealis: {
      id: 'cod_borealis',
      name: 'Borealis',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#34f5c5',
      description: 'Painted northern-lights silk ribbons of emerald, glacial cyan, and royal violet sweeping cleanly across midnight arctic alloy.'
    },
    cod_interstellar: {
      id: 'cod_interstellar',
      name: 'Interstellar',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.06,
      accent: '#9d7bff',
      description: 'Deep cosmic indigo starfield layered with painted lavender nebula clouds, sharp star clusters, and delicate constellation threads.'
    },
    cod_nebula: {
      id: 'cod_nebula',
      name: 'Nebula',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.05,
      accent: '#c95bff',
      description: 'Rich deep-space violet, cyan-teal, and magenta painterly cosmos punctuated by golden-white star flares under mirror lacquer.'
    },
    cod_mercury: {
      id: 'cod_mercury',
      name: 'Mercury',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.10,
      accent: '#dbe8f4',
      description: 'Mirror-polished liquid quicksilver chrome ripples pooling cleanly across dark satin-machined titanium channels.'
    },
    cod_molten_obsidian: {
      id: 'cod_molten_obsidian',
      name: 'Molten Obsidian',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.16,
      accent: '#ff7b24',
      description: 'Matte volcanic basalt slabs cracked open with incandescent amber-gold slag veins and heat-darkened forged bevels.'
    },
    cod_constellation: {
      id: 'cod_constellation',
      name: "Constellation's End",
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.08,
      accent: '#f6cb64',
      description: 'Deep celestial midnight enamel inlaid with engraved 24K gold star-charts, brass astrolabe rings, and pinpoint starlight.'
    },
    cod_orion: {
      id: 'cod_orion',
      name: 'Orion',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.12,
      accent: '#63a8ff',
      description: 'Royal cobalt-indigo anodized alloy traced with razor-crisp iridescent cyan, violet, and magenta topographic contour waves.'
    },
    cod_retro_grid: {
      id: 'cod_retro_grid',
      name: 'Retro Grid',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.18,
      accent: '#ff49c4',
      description: 'Bold 1980s synth-arcade lacquer featuring a chrome sunset horizon and receding laser-cyan and neon-magenta perspective grid.'
    },
    cod_forged_titanium: {
      id: 'cod_forged_titanium',
      name: 'Forged Titanium',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.20,
      accent: '#9cb8cc',
      description: 'Heavy brushed billet titanium armor plates with beveled rivets, heat-blued TIG welds, and glowing orange forge seams.'
    },
    cod_stained_glass: {
      id: 'cod_stained_glass',
      name: 'Stained Glass',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.14,
      accent: '#f5b841',
      description: 'Cathedral-grade leaded stained-glass mosaic of ruby, sapphire, emerald, and amber jewel panes framed in raised dark-tin cames.'
    },
    cod_kintsugi_porcelain: {
      id: 'cod_kintsugi_porcelain',
      name: 'Kintsugi Porcelain',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.10,
      accent: '#f0c659',
      description: 'Ivory bone-china glaze painted with cobalt Sumi botanical motifs, fractured and mended with raised 24K liquid-gold kintsugi veins.'
    },
    cod_blood_cell: {
      id: 'cod_blood_cell',
      name: 'Blood Cell',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.14,
      accent: '#e6223e',
      description: 'Obsidian-burgundy gloss lacquer suspended with layered translucent ruby-red organic cellular discs under wet mirror clearcoat.'
    },
    cod_polyatomic: {
      id: 'cod_polyatomic',
      name: 'Polyatomic',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.10,
      accent: '#b45cff',
      description: 'Triangulated amethyst, ultraviolet, and electric-orchid crystal shards catching crisp geometric highlights against matte black steel.'
    },
    cod_ghoulie: {
      id: 'cod_ghoulie',
      name: 'Ghoulie',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.16,
      accent: '#3bf7d4',
      description: 'Spectral cyan-teal and phantom violet wisps curling over haunted midnight steel with stylized ghostly skull artwork.'
    },
    cod_bioluminescent: {
      id: 'cod_bioluminescent',
      name: 'Bioluminescent',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.14,
      accent: '#24f2c8',
      description: 'Abyssal slate laced with intricate luminous turquoise, seafoam-emerald, and indigo organic coral veins and spore clusters.'
    },
    cod_afterlife: {
      id: 'cod_afterlife',
      name: 'Afterlife',
      patternBased: true,
      minFloat: 0.00,
      maxFloat: 0.12,
      accent: '#5ce8ff',
      description: 'Midnight obsidian armor etched with layered spectral ice-cyan and indigo spirit flames and arcane geometric runes.'
    }
  });

  const WEAPON_SKIN_IDS = Object.freeze(Object.keys(WEAPON_SKINS));

  const SPECIAL_TAGS = Object.freeze([
    '',
    'BLUE GEM',
    'RUBY',
    'SAPPHIRE',
    'BLACK PEARL',
    'FIRE & ICE',
    'FULL FADE',
    'PHASE 1',
    'PHASE 2',
    'PHASE 3',
    'PHASE 4'
  ]);

  const WEAR_GRADES = Object.freeze([
    { code: 'FN', name: 'Factory New', max: 0.07 },
    { code: 'MW', name: 'Minimal Wear', max: 0.15 },
    { code: 'FT', name: 'Field-Tested', max: 0.38 },
    { code: 'WW', name: 'Well-Worn', max: 0.45 },
    { code: 'BS', name: 'Battle-Scarred', max: 1.01 }
  ]);

  const WEAR_CODES = Object.freeze(WEAR_GRADES.map((w) => w.code));

  const CASES = Object.freeze({
    velocity: {
      id: 'velocity',
      name: 'Velocity Classic Case',
      shortName: 'Classic Case',
      artCode: 'VC',
      tierLabel: 'ENTRY TIER',
      price: 100,
      accent: '#2ea8ff',
      rarityWeights: Object.freeze({ milspec: 48, restricted: 24, classified: 13, covert: 7, gold: 8 }),
      description: 'Classic weapon skins (Redline, Asiimov, Blaze, Case Hardened) · 8% Gold Knife & Classic Glove drops.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'ultraviolet' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'crimson_web' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'crimson_web' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'crimson_web' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'blaze' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'blaze' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'crimson_web' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'blaze' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'asiimov' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'case_hardened' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'asiimov' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'asiimov' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'case_hardened' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'butterfly', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'm9', skinId: 'crimson_web' },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'butterfly', skinId: 'slaughter' },
          { knifeType: 'default', skinId: 'case_hardened', forceBlueGem: true },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'leather' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'slaughter' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'crimson_kimono' },
          { itemKind: 'glove', gloveType: 'standard', skinId: 'case_hardened', forceBlueGem: true }
        ]
      }
    },
    chroma: {
      id: 'chroma',
      name: 'Chroma Surf Case',
      shortName: 'Chroma Case',
      artCode: 'CH',
      tierLabel: 'MID TIER',
      price: 175,
      accent: '#d32ce6',
      rarityWeights: Object.freeze({ milspec: 34, restricted: 26, classified: 18, covert: 10, gold: 12 }),
      description: 'Anodized skins (Neon Rider, Hyper Chroma, Printstream) · 12% Gold Doppler Gems & Sport Gloves.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'damascus' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'crimson_web' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'redline' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'neon_rider' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'neon_rider' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'neon_rider' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'printstream' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'printstream' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'printstream' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'neon_rider' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'printstream' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'doppler', forceGem: true },
          { knifeType: 'butterfly', skinId: 'doppler', forceGem: true },
          { knifeType: 'm9', skinId: 'doppler', forceGem: true },
          { knifeType: 'karambit', skinId: 'marble_fade', forceFireIce: true },
          { knifeType: 'm9', skinId: 'tiger_tooth' },
          { knifeType: 'karambit', skinId: 'tiger_tooth' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'pandoras_box' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'hedge_maze' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'emerald_web' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'cobalt_skulls' }
        ]
      }
    },
    spectrum: {
      id: 'spectrum',
      name: 'Spectrum Gem Case',
      shortName: 'Spectrum Case',
      artCode: 'SG',
      tierLabel: 'ELITE TIER',
      price: 275,
      accent: '#f5c542',
      rarityWeights: Object.freeze({ milspec: 20, restricted: 24, classified: 22, covert: 16, gold: 18 }),
      description: 'Dragon Gold, Fade & Printstream guns · 18% Gold Full Fades, Gems & Vice / Slingshot Gloves.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'ultraviolet' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'redline' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'hyper_chroma' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'neon_rider' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'vulcan' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'neon_rider' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'vulcan' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'fade' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'fade' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'case_hardened' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'fade' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'fade' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'case_hardened' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'fade' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'dragon_gold' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'dragon_gold' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'printstream' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'dragon_gold' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'printstream' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'dragon_gold' }
        ],
        gold: [
          { knifeType: 'butterfly', skinId: 'doppler', forceGem: true },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'karambit', skinId: 'fade', forceFullFade: true },
          { knifeType: 'butterfly', skinId: 'fade', forceFullFade: true },
          { knifeType: 'skeleton', skinId: 'fade', forceFullFade: true },
          { knifeType: 'm9', skinId: 'marble_fade', forceFireIce: true },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'vice' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'slingshot' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'fade', forceFullFade: true },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'overprint' }
        ]
      }
    },
    blacksite: {
      id: 'blacksite',
      name: 'Blacksite Case',
      shortName: 'Blacksite',
      artCode: 'BS',
      tierLabel: 'SPECIAL OPS',
      price: 375,
      accent: '#f3a43b',
      rarityWeights: Object.freeze({ milspec: 28, restricted: 24, classified: 17, covert: 11, gold: 20 }),
      description: 'Industrial finishes, arctic ceramics, and ember-cut blades · 15% Gold tactical gloves & knives.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'ultraviolet' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'redline' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'redshift' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'hazard_pay' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'solarflare' }
        ],
        gold: [
          { knifeType: 'm9', skinId: 'emberstrike' },
          { knifeType: 'karambit', skinId: 'arctic_veil' },
          { knifeType: 'butterfly', skinId: 'emberstrike' },
          { knifeType: 'skeleton', skinId: 'arctic_veil' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'breachline' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'leather' },
          { itemKind: 'glove', gloveType: 'standard', skinId: 'case_hardened', forceBlueGem: true },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'breachline' }
        ]
      }
    },
    overdrive: {
      id: 'overdrive',
      name: 'Overdrive Case',
      shortName: 'Overdrive',
      artCode: 'OD',
      tierLabel: 'RACE SPEC',
      price: 500,
      accent: '#4be5ef',
      rarityWeights: Object.freeze({ milspec: 20, restricted: 21, classified: 19, covert: 18, gold: 22 }),
      description: 'Carbon-fiber race finishes, neon energy cuts, and the Stormgrid glove set · 20% Gold.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'neon_rider' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'nitro' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'nitro' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'voidglass' }
        ],
        gold: [
          { knifeType: 'butterfly', skinId: 'arctic_veil' },
          { knifeType: 'karambit', skinId: 'doppler', forceGem: true },
          { knifeType: 'm9', skinId: 'emberstrike' },
          { knifeType: 'skeleton', skinId: 'arctic_veil' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'stormgrid' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'vice' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'overprint' },
          { itemKind: 'glove', gloveType: 'standard', skinId: 'stormgrid' }
        ]
      }
    },
    eclipse: {
      id: 'eclipse',
      name: 'Eclipse Case',
      shortName: 'Eclipse',
      artCode: 'EC',
      tierLabel: 'BLACK LABEL',
      price: 650,
      accent: '#9e82ff',
      rarityWeights: Object.freeze({ milspec: 14, restricted: 19, classified: 21, covert: 21, gold: 25 }),
      description: 'Voidglass, Solar Flare, and premium obsidian finishes · 25% Gold Eclipse Mantle gloves & rare blades.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'coldfront' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'hazard_pay' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'voidglass' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'redshift' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'voidglass' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'nitro' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'solarflare' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'solarflare' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'voidglass' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'dragon_gold' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'voidglass' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'emberstrike' },
          { knifeType: 'skeleton', skinId: 'arctic_veil' },
          { knifeType: 'butterfly', skinId: 'doppler', forceGem: true },
          { knifeType: 'm9', skinId: 'fade', forceFullFade: true },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'eclipse_mantle' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'stormgrid' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'breachline' },
          { itemKind: 'glove', gloveType: 'standard', skinId: 'eclipse_mantle' }
        ]
      }
    },
    ronin: {
      id: 'ronin',
      name: 'Ronin & Cyber Case',
      shortName: 'Ronin Case',
      artCode: 'RN',
      tierLabel: 'SAMURAI SPEC',
      price: 450,
      accent: '#ff6ba8',
      rarityWeights: Object.freeze({ milspec: 22, restricted: 24, classified: 20, covert: 16, gold: 18 }),
      description: 'Ronin Sakura, Oni Crimson, Reactive Overdrive & Katana finishes · 18% Gold knives & gloves.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'g18', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'usps', skinId: 'tactical_carbon' },
          { itemKind: 'weapon', weaponType: 'sawedoff', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'leverslug', skinId: 'damascus' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'cyber_wireframe' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'cyber_wireframe' },
          { itemKind: 'weapon', weaponType: 'dmr', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'scout', skinId: 'holo_prism' },
          { itemKind: 'weapon', weaponType: 'akimbo', skinId: 'cyber_wireframe' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'damascus' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'holo_prism' },
          { itemKind: 'weapon', weaponType: 'usps', skinId: 'ronin_sakura' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'ronin_sakura' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'molten_magma' },
          { itemKind: 'weapon', weaponType: 'sawedoff', skinId: 'molten_magma' },
          { itemKind: 'weapon', weaponType: 'leverslug', skinId: 'oni_crimson' },
          { itemKind: 'weapon', weaponType: 'dmr', skinId: 'ronin_sakura' },
          { itemKind: 'weapon', weaponType: 'scout', skinId: 'fade' },
          { itemKind: 'weapon', weaponType: 'akimbo', skinId: 'holo_prism' },
          { itemKind: 'weapon', weaponType: 'g18', skinId: 'oni_crimson' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'oni_crimson' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'shogun_gold' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'reactive_overdrive' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'reactive_oni' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'reactive_oni' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'reactive_overdrive' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'shogun_gold' },
          { itemKind: 'weapon', weaponType: 'akimbo', skinId: 'reactive_overdrive' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'fade', forceFullFade: true },
          { knifeType: 'butterfly', skinId: 'emberstrike' },
          { knifeType: 'm9', skinId: 'doppler', forceGem: true },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'crimson_kimono' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'stormgrid' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'eclipse_mantle' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'slaughter' }
        ]
      }
    },
    prestige: {
      id: 'prestige',
      name: 'Prestige Vault Case',
      shortName: 'Prestige Vault',
      artCode: 'PV',
      tierLabel: 'PRESTIGE SPEC',
      price: 550,
      accent: '#f6cb64',
      rarityWeights: Object.freeze({ milspec: 18, restricted: 22, classified: 22, covert: 18, gold: 20 }),
      description: 'Forged Titanium, Kintsugi Porcelain, Stained Glass, Blood Cell, Mercury, Molten Obsidian & Constellation · 20% Gold.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'cod_forged_titanium' },
          { itemKind: 'weapon', weaponType: 'sawedoff', skinId: 'cod_forged_titanium' },
          { itemKind: 'weapon', weaponType: 'leverslug', skinId: 'cod_forged_titanium' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'cod_retro_grid' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'cod_retro_grid' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'cod_polyatomic' },
          { itemKind: 'weapon', weaponType: 'g18', skinId: 'cod_retro_grid' },
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'cod_forged_titanium' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_orion' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'cod_forged_titanium' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'cod_polyatomic' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'cod_polyatomic' },
          { itemKind: 'weapon', weaponType: 'usps', skinId: 'cod_mercury' },
          { itemKind: 'weapon', weaponType: 'akimbo', skinId: 'cod_retro_grid' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'cod_blood_cell' },
          { itemKind: 'weapon', weaponType: 'dmr', skinId: 'cod_orion' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'cod_stained_glass' },
          { itemKind: 'weapon', weaponType: 'scout', skinId: 'cod_stained_glass' },
          { itemKind: 'weapon', weaponType: 'dmr', skinId: 'cod_stained_glass' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'cod_kintsugi_porcelain' },
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_mercury' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'cod_blood_cell' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'cod_mercury' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'cod_polyatomic' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_constellation' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'cod_constellation' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'cod_constellation' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'cod_molten_obsidian' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'cod_molten_obsidian' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'cod_kintsugi_porcelain' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'cod_kintsugi_porcelain' },
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'cod_orion' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'tiger_tooth' },
          { knifeType: 'butterfly', skinId: 'fade', forceFullFade: true },
          { knifeType: 'm9', skinId: 'emberstrike' },
          { knifeType: 'skeleton', skinId: 'damascus' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'eclipse_mantle' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'slingshot' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'crimson_kimono' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'fade', forceFullFade: true }
        ]
      }
    },
    phantom: {
      id: 'phantom',
      name: 'Phantom Relic Case',
      shortName: 'Phantom Relic',
      artCode: 'PR',
      tierLabel: 'ETHEREAL SPEC',
      price: 600,
      accent: '#3bf7d4',
      rarityWeights: Object.freeze({ milspec: 16, restricted: 21, classified: 22, covert: 19, gold: 22 }),
      description: 'Ghoulie, Bioluminescent, Afterlife, Opal, Dark Spine, Borealis, Interstellar & Nebula · 22% Gold.',
      pools: {
        milspec: [
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'cod_bioluminescent' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'cod_bioluminescent' },
          { itemKind: 'weapon', weaponType: 'pistol', skinId: 'cod_ghoulie' },
          { itemKind: 'weapon', weaponType: 'g18', skinId: 'cod_ghoulie' },
          { itemKind: 'weapon', weaponType: 'usps', skinId: 'cod_afterlife' },
          { itemKind: 'weapon', weaponType: 'shotgun', skinId: 'cod_bioluminescent' },
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'cod_afterlife' },
          { itemKind: 'weapon', weaponType: 'sawedoff', skinId: 'cod_ghoulie' }
        ],
        restricted: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_ghoulie' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'cod_bioluminescent' },
          { itemKind: 'weapon', weaponType: 'akimbo', skinId: 'cod_afterlife' },
          { itemKind: 'weapon', weaponType: 'leverslug', skinId: 'cod_afterlife' },
          { itemKind: 'weapon', weaponType: 'scout', skinId: 'cod_bioluminescent' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'cod_opal' },
          { itemKind: 'weapon', weaponType: 'dmr', skinId: 'cod_ghoulie' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'cod_opal' }
        ],
        classified: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_dark_spine' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'cod_dark_spine' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'cod_afterlife' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'cod_borealis' },
          { itemKind: 'weapon', weaponType: 'smg', skinId: 'cod_borealis' },
          { itemKind: 'weapon', weaponType: 'famas', skinId: 'cod_opal' },
          { itemKind: 'weapon', weaponType: 'mp7', skinId: 'cod_dark_spine' },
          { itemKind: 'weapon', weaponType: 'usps', skinId: 'cod_opal' }
        ],
        covert: [
          { itemKind: 'weapon', weaponType: 'rifle', skinId: 'cod_interstellar' },
          { itemKind: 'weapon', weaponType: 'awp', skinId: 'cod_interstellar' },
          { itemKind: 'weapon', weaponType: 'katana', skinId: 'cod_nebula' },
          { itemKind: 'weapon', weaponType: 'scar', skinId: 'cod_nebula' },
          { itemKind: 'weapon', weaponType: 'deagle', skinId: 'cod_interstellar' },
          { itemKind: 'weapon', weaponType: 'revolver', skinId: 'cod_nebula' },
          { itemKind: 'weapon', weaponType: 'honeybadger', skinId: 'cod_borealis' },
          { itemKind: 'weapon', weaponType: 'scout', skinId: 'cod_interstellar' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'doppler', forceGem: true },
          { knifeType: 'butterfly', skinId: 'arctic_veil' },
          { knifeType: 'm9', skinId: 'doppler', forceGem: true },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'pandoras_box' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'vice' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'emerald_web' },
          { itemKind: 'glove', gloveType: 'wraps', skinId: 'overprint' }
        ]
      }
    }
  });

  const CASE_IDS = Object.freeze(Object.keys(CASES));

  // Iconic CS Case Hardened Blue Gem pattern IDs
  const BLUE_GEM_SEEDS = Object.freeze([661, 387, 321, 670, 555, 151, 955, 442, 868, 269]);

  // 1/100 Mythic inspect trigger constants (1% Mythic, 25% Uncommon, 74% Normal)
  const MYTHIC_INSPECT_CHANCE = 0.01;
  const UNCOMMON_INSPECT_CHANCE = 0.25;

  function rollInspectTier(rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const roll = r();
    if (roll < MYTHIC_INSPECT_CHANCE) return 'mythic';
    if (roll < MYTHIC_INSPECT_CHANCE + UNCOMMON_INSPECT_CHANCE) return 'uncommon';
    return 'normal';
  }

  // ---------- deterministic seeded noise for pattern skins ----------
  function hash2D(ix, iy, seed) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    n = (n ^ (n >>> 13)) | 0;
    n = Math.imul(n, 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function valueNoise2D(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smoothstep(x - ix);
    const fy = smoothstep(y - iy);
    const a = hash2D(ix, iy, seed);
    const b = hash2D(ix + 1, iy, seed);
    const c = hash2D(ix, iy + 1, seed);
    const d = hash2D(ix + 1, iy + 1, seed);
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  function fbm2D(x, y, seed, octaves = 4) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      val += valueNoise2D(x * freq, y * freq, seed + i * 97) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.04;
    }
    return val / norm;
  }

  // Authentic Case Hardened heat-quenched steel shader evaluation at play-side UV (0..1, 0..1)
  function evaluateCaseHardenedPixel(u, v, patternSeed) {
    const seed = Math.max(0, Math.min(999, Math.floor(Number(patternSeed) || 0)));
    const isIconic = BLUE_GEM_SEEDS.includes(seed);

    const ox = hash2D(seed, 17, 42) * 14.0;
    const oy = hash2D(seed, 53, 99) * 14.0;
    const ang = hash2D(seed, 89, 13) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const ru = (u - 0.5) * ca - (v - 0.5) * sa;
    const rv = (u - 0.5) * sa + (v - 0.5) * ca;

    const wx = fbm2D(ru * 2.6 + ox, rv * 2.6 + oy, seed + 11, 3);
    const wy = fbm2D(ru * 2.6 + ox + 5.2, rv * 2.6 + oy + 1.3, seed + 29, 3);
    let heat = fbm2D((ru + (wx - 0.5) * 0.65) * 2.8 + ox, (rv + (wy - 0.5) * 0.65) * 2.8 + oy, seed + 71, 4);
    const mottle = fbm2D(ru * 9.5 + ox * 2, rv * 9.5 + oy * 2, seed + 131, 2);

    const globalBias = isIconic
      ? 0.25 + (hash2D(seed, 3, 7) * 0.08)
      : (hash2D(seed, 5, 19) - 0.52) * 0.34;
    heat = Math.max(0, Math.min(1, heat + globalBias + (mottle - 0.5) * 0.12));

    let r, g, b;
    let isBlue = false;
    let isGold = false;

    if (heat >= 0.58) {
      const t = Math.min(1, (heat - 0.58) / 0.32);
      r = Math.round(38 + (24 - 38) * t + (mottle - 0.5) * 18);
      g = Math.round(138 + (182 - 138) * t + (mottle - 0.5) * 20);
      b = Math.round(236 + (255 - 236) * t);
      isBlue = true;
    } else if (heat >= 0.51) {
      const t = (heat - 0.51) / 0.07;
      r = Math.round(168 + (85 - 168) * t);
      g = Math.round(88 + (95 - 88) * t);
      b = Math.round(165 + (225 - 165) * t);
    } else if (heat >= 0.30) {
      const t = (heat - 0.30) / 0.21;
      r = Math.round(196 + (228 - 196) * t + (mottle - 0.5) * 16);
      g = Math.round(162 + (182 - 162) * t + (mottle - 0.5) * 14);
      b = Math.round(92 + (78 - 92) * t);
      isGold = true;
    } else {
      const t = heat / 0.30;
      const base = 152 + t * 38 + (mottle - 0.5) * 20;
      r = Math.round(base);
      g = Math.round(base + 3);
      b = Math.round(base + 8);
    }

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
      isBlue,
      isGold
    };
  }

  function computeCaseHardenedBluePct(patternSeed) {
    let blueCount = 0;
    const N = 16;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const px = evaluateCaseHardenedPixel((x + 0.5) / N, (y + 0.5) / N, patternSeed);
        if (px.isBlue) blueCount++;
      }
    }
    return Math.round((blueCount / (N * N)) * 100);
  }

  function computeFadePct(patternSeed) {
    const seed = Math.max(0, Math.min(999, Math.floor(Number(patternSeed) || 0)));
    if (seed === 763 || seed === 575 || seed === 897 || seed === 93 || seed === 412) return 100;
    return Math.round(80 + hash2D(seed, 31, 77) * 20);
  }

  function evaluateDopplerVariant(patternSeed, forceGem) {
    const seed = Math.max(0, Math.min(999, Math.floor(Number(patternSeed) || 0)));
    if (forceGem) {
      const pick = seed % 10;
      if (pick < 4) return 'RUBY';
      if (pick < 8) return 'SAPPHIRE';
      return 'BLACK PEARL';
    }
    const roll = hash2D(seed, 41, 103);
    if (roll > 0.965) return 'SAPPHIRE';
    if (roll > 0.93) return 'RUBY';
    if (roll > 0.915) return 'BLACK PEARL';
    const phaseIdx = Math.floor(hash2D(seed, 19, 61) * 4);
    return 'PHASE ' + (phaseIdx + 1);
  }

  function evaluateMarbleFadeVariant(patternSeed, forceFireIce) {
    const seed = Math.max(0, Math.min(999, Math.floor(Number(patternSeed) || 0)));
    if (forceFireIce || seed === 412 || seed === 359 || seed === 602 || hash2D(seed, 67, 211) > 0.93) {
      return 'FIRE & ICE';
    }
    return '';
  }

  function getWearGrade(floatValue) {
    const f = Math.max(0, Math.min(0.9999, Number(floatValue) || 0));
    for (const g of WEAR_GRADES) {
      if (f < g.max) return g;
    }
    return WEAR_GRADES[WEAR_GRADES.length - 1];
  }

  function formatFloat(floatValue) {
    const f = Math.max(0, Math.min(0.9999, Number(floatValue) || 0));
    return f.toFixed(4);
  }

  function computeSkinMetadata(skinId, patternSeed, opts) {
    const options = opts || {};
    let specialTag = '';
    let bluePct = 0;

    if (skinId === 'case_hardened') {
      bluePct = computeCaseHardenedBluePct(patternSeed);
      if (bluePct >= 72 || BLUE_GEM_SEEDS.includes(patternSeed)) {
        specialTag = 'BLUE GEM';
      }
    } else if (skinId === 'doppler') {
      specialTag = evaluateDopplerVariant(patternSeed, !!options.forceGem);
    } else if (skinId === 'fade') {
      const fp = computeFadePct(patternSeed);
      bluePct = fp;
      if (fp >= 98 || options.forceFullFade) {
        specialTag = 'FULL FADE';
        if (options.forceFullFade && fp < 99) bluePct = 100;
      }
    } else if (skinId === 'marble_fade') {
      specialTag = evaluateMarbleFadeVariant(patternSeed, !!options.forceFireIce);
    }

    return { specialTag, bluePct };
  }

  function createItemId(prefix, rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let tail = '';
    for (let i = 0; i < 10; i++) {
      tail += chars[Math.floor(r() * chars.length) % chars.length];
    }
    return prefix + '_' + Date.now().toString(36) + '_' + tail;
  }

  function createKnifeId(rng) {
    return createItemId('knf', rng);
  }

  function createGloveId(rng) {
    return createItemId('glv', rng);
  }

  function createWeaponId(rng) {
    return createItemId('wpn', rng);
  }

  function isGloveItem(item) {
    return !!(item && (item.itemKind === 'glove' || (!!item.gloveType && !item.knifeType && !item.weaponType)));
  }

  function isWeaponItem(item) {
    return !!(item && (item.itemKind === 'weapon' || (!!item.weaponType && !item.knifeType && !item.gloveType)));
  }

  function getCasePrice(caseId) {
    const c = CASES[caseId] || CASES.velocity;
    return c.price;
  }

  function getCaseOdds(caseId) {
    const c = CASES[caseId] || CASES.velocity;
    const weights = c.rarityWeights || null;
    const total = RARITY_IDS.reduce((s, id) => s + (weights ? weights[id] : RARITIES[id].weight), 0) || 100;
    const out = {};
    for (const id of RARITY_IDS) {
      const w = weights ? weights[id] : RARITIES[id].weight;
      out[id] = Math.round((w / total) * 100);
    }
    return out;
  }

  function pickWeightedRarity(rng, caseId) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const c = caseId && CASES[caseId] ? CASES[caseId] : null;
    const weights = c && c.rarityWeights ? c.rarityWeights : null;
    const total = RARITY_IDS.reduce((s, id) => s + (weights ? weights[id] : RARITIES[id].weight), 0);
    let roll = r() * total;
    for (const id of RARITY_IDS) {
      roll -= weights ? weights[id] : RARITIES[id].weight;
      if (roll <= 0) return id;
    }
    return 'milspec';
  }

  function rollItemFromPool(caseId, rarityId, rng, overrideId) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const caseDef = CASES[caseId] || CASES.velocity;
    const pool = caseDef.pools[rarityId] || caseDef.pools.milspec;
    const entry = pool[Math.floor(r() * pool.length) % pool.length];

    let patternSeed = Math.floor(r() * 1000) % 1000;
    if (entry.forceBlueGem) {
      patternSeed = BLUE_GEM_SEEDS[Math.floor(r() * BLUE_GEM_SEEDS.length) % BLUE_GEM_SEEDS.length];
    } else if (entry.forceFullFade) {
      patternSeed = 763;
    } else if (entry.forceFireIce) {
      patternSeed = 412;
    }

    // Pristine showroom condition on all drops (wear visuals & float UI removed)
    const clampedFloat = 0.01;
    const wearCode = 'FN';
    const statTrakChance = (rarityId === 'covert' || rarityId === 'gold') ? 0.22 : 0.14;
    const isStatTrak = r() < statTrakChance;

    if (entry.itemKind === 'weapon') {
      const meta = computeSkinMetadata(entry.skinId, patternSeed, entry);
      return sanitizeWeaponItem({
        id: overrideId || createWeaponId(r),
        itemKind: 'weapon',
        weaponType: entry.weaponType,
        skinId: entry.skinId,
        rarity: rarityId,
        patternSeed,
        floatValue: clampedFloat,
        wearGrade: wearCode,
        specialTag: meta.specialTag,
        bluePct: meta.bluePct,
        caseId: caseDef.id,
        statTrak: isStatTrak,
        statTrakKills: 0
      });
    }

    if (entry.itemKind === 'glove') {
      const meta = computeSkinMetadata(entry.skinId, patternSeed, entry);
      return sanitizeGloveItem({
        id: overrideId || createGloveId(r),
        itemKind: 'glove',
        gloveType: entry.gloveType,
        skinId: entry.skinId,
        rarity: rarityId,
        patternSeed,
        floatValue: clampedFloat,
        wearGrade: wearCode,
        specialTag: meta.specialTag,
        bluePct: meta.bluePct,
        caseId: caseDef.id
      });
    }

    const meta = computeSkinMetadata(entry.skinId, patternSeed, entry);
    return sanitizeKnifeItem({
      id: overrideId || createKnifeId(r),
      knifeType: entry.knifeType,
      skinId: entry.skinId,
      rarity: rarityId,
      patternSeed,
      floatValue: clampedFloat,
      wearGrade: wearCode,
      specialTag: meta.specialTag,
      bluePct: meta.bluePct,
      caseId: caseDef.id,
      statTrak: isStatTrak,
      statTrakKills: 0
    });
  }

  function rollCaseDrop(caseId, rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const validCaseId = CASES[caseId] ? caseId : 'velocity';
    const winRarity = pickWeightedRarity(r, validCaseId);
    const winner = rollItemFromPool(validCaseId, winRarity, r);

    const STRIP_LEN = 45;
    const WIN_INDEX = 36;
    const strip = [];
    for (let i = 0; i < STRIP_LEN; i++) {
      if (i === WIN_INDEX) {
        strip.push(winner);
      } else {
        const decRarity = pickWeightedRarity(r, validCaseId);
        strip.push(rollItemFromPool(validCaseId, decRarity, r, 'decoy_' + i));
      }
    }
    const landingJitter = (r() - 0.5) * 0.68;
    return { winner, strip, winIndex: WIN_INDEX, landingJitter };
  }

  function createStarterKnife() {
    return {
      id: 'starter_default_vanilla',
      knifeType: 'default',
      skinId: 'vanilla',
      rarity: 'milspec',
      patternSeed: 0,
      floatValue: 0.12,
      wearGrade: 'MW',
      specialTag: '',
      bluePct: 0,
      caseId: 'starter'
    };
  }

  function createStarterGlove() {
    return {
      id: 'starter_standard_tactical',
      itemKind: 'glove',
      gloveType: 'standard',
      skinId: 'tactical_slate',
      rarity: 'milspec',
      patternSeed: 0,
      floatValue: 0.08,
      wearGrade: 'MW',
      specialTag: '',
      bluePct: 0,
      caseId: 'starter'
    };
  }

  function createStarterWeapon(weaponType) {
    const wt = WEAPON_TYPES[weaponType] ? weaponType : 'rifle';
    return {
      id: 'starter_' + wt + '_slate',
      itemKind: 'weapon',
      weaponType: wt,
      skinId: 'factory_slate',
      rarity: 'milspec',
      patternSeed: 0,
      floatValue: 0.09,
      wearGrade: 'MW',
      specialTag: '',
      bluePct: 0,
      caseId: 'starter'
    };
  }

  function createStarterWeapons() {
    return WEAPON_TYPE_IDS.map((wt) => createStarterWeapon(wt));
  }

  function createStarterInventory() {
    const starterKnife = createStarterKnife();
    const starterGlove = createStarterGlove();
    const starterWeapons = createStarterWeapons();
    const equippedWeaponIds = {};
    for (const wt of WEAPON_TYPE_IDS) equippedWeaponIds[wt] = 'starter_' + wt + '_slate';
    return {
      coins: ECONOMY.STARTING_COINS,
      equippedKnifeId: starterKnife.id,
      equippedGloveId: starterGlove.id,
      equippedRifleId: 'starter_rifle_slate',
      equippedSmgId: 'starter_smg_slate',
      equippedShotgunId: 'starter_shotgun_slate',
      equippedAwpId: 'starter_awp_slate',
      equippedRevolverId: 'starter_revolver_slate',
      equippedDeagleId: 'starter_deagle_slate',
      equippedPistolId: 'starter_pistol_slate',
      equippedWeaponIds,
      caseCounts: Object.fromEntries(CASE_IDS.map((id) => [id, 0])),
      totalOpened: 0,
      lastDailyDropDate: '',
      knives: [starterKnife],
      gloves: [starterGlove],
      weapons: starterWeapons
    };
  }

  function sanitizeKnifeItem(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = typeof src.id === 'string' && /^[a-zA-Z0-9_\-]{1,64}$/.test(src.id)
      ? src.id
      : createKnifeId();
    const knifeType = KNIFE_TYPES[src.knifeType] ? src.knifeType : 'default';
    const skinId = SKINS[src.skinId] ? src.skinId : 'vanilla';
    const rarity = RARITIES[src.rarity] ? src.rarity : 'milspec';
    const patternSeed = Math.max(0, Math.min(999, Math.floor(Number(src.patternSeed) || 0)));
    const rawFloat = Number(src.floatValue);
    const floatValue = Number.isFinite(rawFloat)
      ? Math.round(Math.max(0, Math.min(0.9999, rawFloat)) * 10000) / 10000
      : 0.01;
    const wearGrade = getWearGrade(floatValue).code;
    const specialTag = SPECIAL_TAGS.includes(src.specialTag) ? src.specialTag : '';
    const rawPct = Number(src.bluePct);
    const bluePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, Math.round(rawPct))) : 0;
    const caseId = CASES[src.caseId] || src.caseId === 'starter' ? src.caseId : 'velocity';
    const statTrak = Boolean(src.statTrak);
    const statTrakKills = statTrak ? clampInt(src.statTrakKills, 0, 999999, 0) : 0;

    return {
      id,
      knifeType,
      skinId,
      rarity,
      patternSeed,
      floatValue,
      wearGrade,
      specialTag,
      bluePct,
      caseId,
      statTrak,
      statTrakKills
    };
  }

  function sanitizeGloveItem(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = typeof src.id === 'string' && /^[a-zA-Z0-9_\-]{1,64}$/.test(src.id)
      ? src.id
      : createGloveId();
    const gloveType = GLOVE_TYPES[src.gloveType] ? src.gloveType : 'standard';
    const skinId = GLOVE_SKINS[src.skinId] ? src.skinId : 'tactical_slate';
    const rarity = RARITIES[src.rarity] ? src.rarity : 'milspec';
    const patternSeed = Math.max(0, Math.min(999, Math.floor(Number(src.patternSeed) || 0)));
    const rawFloat = Number(src.floatValue);
    const floatValue = Number.isFinite(rawFloat)
      ? Math.round(Math.max(0, Math.min(0.9999, rawFloat)) * 10000) / 10000
      : 0.01;
    const wearGrade = getWearGrade(floatValue).code;
    const specialTag = SPECIAL_TAGS.includes(src.specialTag) ? src.specialTag : '';
    const rawPct = Number(src.bluePct);
    const bluePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, Math.round(rawPct))) : 0;
    const caseId = CASES[src.caseId] || src.caseId === 'starter' ? src.caseId : 'velocity';

    return {
      id,
      itemKind: 'glove',
      gloveType,
      skinId,
      rarity,
      patternSeed,
      floatValue,
      wearGrade,
      specialTag,
      bluePct,
      caseId
    };
  }

  function sanitizeWeaponItem(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = typeof src.id === 'string' && /^[a-zA-Z0-9_\-]{1,64}$/.test(src.id)
      ? src.id
      : createWeaponId();
    const weaponType = WEAPON_TYPES[src.weaponType] ? src.weaponType : 'rifle';
    const skinId = WEAPON_SKINS[src.skinId] ? src.skinId : 'factory_slate';
    const rarity = RARITIES[src.rarity] ? src.rarity : 'milspec';
    const patternSeed = Math.max(0, Math.min(999, Math.floor(Number(src.patternSeed) || 0)));
    const rawFloat = Number(src.floatValue);
    const floatValue = Number.isFinite(rawFloat)
      ? Math.round(Math.max(0, Math.min(0.9999, rawFloat)) * 10000) / 10000
      : 0.01;
    const wearGrade = getWearGrade(floatValue).code;
    const specialTag = SPECIAL_TAGS.includes(src.specialTag) ? src.specialTag : '';
    const rawPct = Number(src.bluePct);
    const bluePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, Math.round(rawPct))) : 0;
    const caseId = CASES[src.caseId] || src.caseId === 'starter' ? src.caseId : 'velocity';
    const statTrak = Boolean(src.statTrak);
    const statTrakKills = statTrak ? clampInt(src.statTrakKills, 0, 999999, 0) : 0;

    return {
      id,
      itemKind: 'weapon',
      weaponType,
      skinId,
      rarity,
      patternSeed,
      floatValue,
      wearGrade,
      specialTag,
      bluePct,
      caseId,
      statTrak,
      statTrakKills
    };
  }

  function clampInt(v, lo, hi, fallback) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  function sanitizeInventory(raw) {
    if (!raw || typeof raw !== 'object') return createStarterInventory();
    const coins = raw.coins === undefined || raw.coins === null
      ? ECONOMY.STARTING_COINS
      : clampInt(raw.coins, 0, ECONOMY.MAX_COINS, ECONOMY.STARTING_COINS);
    const rawCases = raw.caseCounts && typeof raw.caseCounts === 'object' ? raw.caseCounts : {};
    const caseCounts = Object.fromEntries(
      CASE_IDS.map((id) => [id, clampInt(rawCases[id], 0, 999, 0)])
    );
    const totalOpened = clampInt(raw.totalOpened, 0, 99999, 0);
    const lastDailyDropDate = typeof raw.lastDailyDropDate === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw.lastDailyDropDate)
      ? raw.lastDailyDropDate
      : '';

    const seenKnives = new Set();
    const knives = [];
    if (Array.isArray(raw.knives)) {
      for (const item of raw.knives) {
        const clean = sanitizeKnifeItem(item);
        if (!seenKnives.has(clean.id)) {
          seenKnives.add(clean.id);
          knives.push(clean);
        }
      }
    }
    if (!seenKnives.has('starter_default_vanilla')) {
      knives.unshift(createStarterKnife());
      seenKnives.add('starter_default_vanilla');
    }

    const seenGloves = new Set();
    const gloves = [];
    if (Array.isArray(raw.gloves)) {
      for (const item of raw.gloves) {
        const clean = sanitizeGloveItem(item);
        if (!seenGloves.has(clean.id)) {
          seenGloves.add(clean.id);
          gloves.push(clean);
        }
      }
    }
    if (!seenGloves.has('starter_standard_tactical')) {
      gloves.unshift(createStarterGlove());
      seenGloves.add('starter_standard_tactical');
    }

    const seenWeapons = new Set();
    const weapons = [];
    if (Array.isArray(raw.weapons)) {
      for (const item of raw.weapons) {
        const clean = sanitizeWeaponItem(item);
        if (!seenWeapons.has(clean.id)) {
          seenWeapons.add(clean.id);
          weapons.push(clean);
        }
      }
    }
    for (const wt of WEAPON_TYPE_IDS) {
      const sid = 'starter_' + wt + '_slate';
      if (!seenWeapons.has(sid)) {
        weapons.unshift(createStarterWeapon(wt));
        seenWeapons.add(sid);
      }
    }

    const equippedKnifeId = typeof raw.equippedKnifeId === 'string' && seenKnives.has(raw.equippedKnifeId)
      ? raw.equippedKnifeId
      : knives[0].id;
    const equippedGloveId = typeof raw.equippedGloveId === 'string' && seenGloves.has(raw.equippedGloveId)
      ? raw.equippedGloveId
      : gloves[0].id;

    const findValidWeaponId = (candidate, wt) => {
      if (typeof candidate === 'string') {
        const found = weapons.find((w) => w.id === candidate && w.weaponType === wt);
        if (found) return found.id;
      }
      const fallback = weapons.find((w) => w.weaponType === wt);
      return fallback ? fallback.id : 'starter_' + wt + '_slate';
    };

    const rawEqMap = raw.equippedWeaponIds && typeof raw.equippedWeaponIds === 'object' ? raw.equippedWeaponIds : {};
    const equippedWeaponIds = {};
    for (const wt of WEAPON_TYPE_IDS) {
      const legacyField = 'equipped' + wt.charAt(0).toUpperCase() + wt.slice(1) + 'Id';
      const mapVal = typeof rawEqMap[wt] === 'string' ? rawEqMap[wt] : '';
      const legacyVal = typeof raw[legacyField] === 'string' ? raw[legacyField] : '';
      const candidate = (mapVal && !mapVal.startsWith('starter_'))
        ? mapVal
        : ((legacyVal && !legacyVal.startsWith('starter_')) ? legacyVal : (mapVal || legacyVal));
      equippedWeaponIds[wt] = findValidWeaponId(candidate, wt);
    }

    const equippedRifleId = equippedWeaponIds.rifle;
    const equippedSmgId = equippedWeaponIds.smg;
    const equippedShotgunId = equippedWeaponIds.shotgun;
    const equippedAwpId = equippedWeaponIds.awp;
    const equippedRevolverId = equippedWeaponIds.revolver;
    const equippedDeagleId = equippedWeaponIds.deagle;
    const equippedPistolId = equippedWeaponIds.pistol;

    return {
      coins,
      equippedKnifeId,
      equippedGloveId,
      equippedRifleId,
      equippedSmgId,
      equippedShotgunId,
      equippedAwpId,
      equippedRevolverId,
      equippedDeagleId,
      equippedPistolId,
      equippedWeaponIds,
      caseCounts,
      totalOpened,
      lastDailyDropDate,
      knives,
      gloves,
      weapons
    };
  }

  function getEquippedKnife(inventory) {
    const inv = sanitizeInventory(inventory);
    return inv.knives.find((k) => k.id === inv.equippedKnifeId) || inv.knives[0];
  }

  function getEquippedGlove(inventory) {
    const inv = sanitizeInventory(inventory);
    return inv.gloves.find((g) => g.id === inv.equippedGloveId) || inv.gloves[0];
  }

  function getEquippedWeapon(inventory, weaponType) {
    const inv = sanitizeInventory(inventory);
    const wt = WEAPON_TYPES[weaponType] ? weaponType : 'rifle';
    const eqId = (inv.equippedWeaponIds && inv.equippedWeaponIds[wt]) || inv.equippedRifleId;
    return inv.weapons.find((w) => w.id === eqId && w.weaponType === wt)
      || inv.weapons.find((w) => w.weaponType === wt)
      || createStarterWeapon(wt);
  }

  function totalCaseCount(inventory) {
    if (!inventory || !inventory.caseCounts) return 0;
    return CASE_IDS.reduce((sum, id) => sum + (inventory.caseCounts[id] || 0), 0);
  }

  function getItemSellValue(item) {
    if (!item || typeof item !== 'object') return 0;
    if (typeof item.id === 'string' && item.id.startsWith('starter_')) return 0;
    const rarityBase = ECONOMY.SELL_RARITY_BASE[item.rarity] || ECONOMY.SELL_RARITY_BASE.milspec;
    let typeMul = 1.0;
    if (isWeaponItem(item)) {
      typeMul = ECONOMY.SELL_WEAPON_TYPE_MUL[item.weaponType] || 1.0;
    } else if (isGloveItem(item)) {
      typeMul = ECONOMY.SELL_GLOVE_TYPE_MUL[item.gloveType] || 1.1;
    } else {
      typeMul = ECONOMY.SELL_KNIFE_TYPE_MUL[item.knifeType] || 1.05;
    }
    const wearCode = WEAR_CODES.includes(item.wearGrade)
      ? item.wearGrade
      : getWearGrade(item.floatValue).code;
    const wearMul = ECONOMY.SELL_WEAR_MUL[wearCode] || 1.0;
    const specialTag = typeof item.specialTag === 'string' ? item.specialTag : '';
    const specialMul = ECONOMY.SELL_SPECIAL_MUL[specialTag] || 1.0;
    const statTrakMul = item.statTrak ? 1.45 : 1.0;
    return Math.max(10, Math.round(rarityBase * typeMul * wearMul * specialMul * statTrakMul));
  }

  function incrementStatTrakKills(inventory, itemId, delta = 1) {
    const inv = sanitizeInventory(inventory);
    const step = Math.max(1, Math.floor(Number(delta) || 1));
    let updatedItem = null;
    for (const w of inv.weapons) {
      if (w.id === itemId && w.statTrak) {
        w.statTrakKills = Math.min(999999, (w.statTrakKills || 0) + step);
        updatedItem = w;
        break;
      }
    }
    if (!updatedItem) {
      for (const k of inv.knives) {
        if (k.id === itemId && k.statTrak) {
          k.statTrakKills = Math.min(999999, (k.statTrakKills || 0) + step);
          updatedItem = k;
          break;
        }
      }
    }
    return { inventory: inv, item: updatedItem, updated: Boolean(updatedItem) };
  }

  function isItemEquippedInInventory(inventory, item) {
    if (!inventory || !item) return false;
    if (isWeaponItem(item)) {
      if (inventory.equippedWeaponIds && inventory.equippedWeaponIds[item.weaponType]) {
        return inventory.equippedWeaponIds[item.weaponType] === item.id;
      }
      if (item.weaponType === 'smg') return inventory.equippedSmgId === item.id;
      if (item.weaponType === 'shotgun') return inventory.equippedShotgunId === item.id;
      if (item.weaponType === 'awp') return inventory.equippedAwpId === item.id;
      if (item.weaponType === 'revolver') return inventory.equippedRevolverId === item.id;
      if (item.weaponType === 'deagle') return inventory.equippedDeagleId === item.id;
      if (item.weaponType === 'pistol') return inventory.equippedPistolId === item.id;
      return inventory.equippedRifleId === item.id;
    }
    if (isGloveItem(item)) return inventory.equippedGloveId === item.id;
    return inventory.equippedKnifeId === item.id;
  }

  function isItemSellable(inventory, item) {
    if (!item || typeof item !== 'object') return { sellable: false, reason: 'INVALID ITEM', value: 0 };
    if (typeof item.id === 'string' && item.id.startsWith('starter_')) {
      return { sellable: false, reason: 'STARTER ITEM', value: 0 };
    }
    const value = getItemSellValue(item);
    if (isItemEquippedInInventory(inventory, item)) {
      return { sellable: false, reason: 'UNEQUIP TO SELL', value };
    }
    return { sellable: true, reason: '', value };
  }


  function buyCases(inventory, caseId, quantity) {
    const inv = sanitizeInventory(inventory);
    const validId = CASES[caseId] ? caseId : 'velocity';
    const price = getCasePrice(validId);
    const qty = Number(quantity);
    const owned = inv.caseCounts[validId] || 0;
    const available = Math.max(0, 999 - owned);

    if (!Number.isSafeInteger(qty) || qty < 1) {
      return {
        purchased: false,
        reason: 'INVALID_QUANTITY',
        price,
        quantity: 0,
        available,
        totalCost: 0,
        inventory: inv
      };
    }

    if (qty > available) {
      return {
        purchased: false,
        reason: 'CASE_CAPACITY',
        price,
        quantity: qty,
        available,
        totalCost: price * qty,
        inventory: inv
      };
    }

    const totalCost = price * qty;
    if (inv.coins < totalCost) {
      return {
        purchased: false,
        reason: 'INSUFFICIENT_COINS',
        price,
        quantity: qty,
        totalCost,
        deficit: totalCost - inv.coins,
        available,
        inventory: inv
      };
    }

    inv.coins -= totalCost;
    inv.caseCounts[validId] = owned + qty;
    return {
      purchased: true,
      caseId: validId,
      quantity: qty,
      price,
      totalCost,
      inventory: inv
    };
  }


  function openCases(inventory, caseId, quantity, rng) {
    const inv = sanitizeInventory(inventory);
    const validId = CASES[caseId] ? caseId : 'velocity';
    const qty = Number(quantity);
    const owned = inv.caseCounts[validId] || 0;

    if (!Number.isSafeInteger(qty) || qty < 1) {
      return {
        opened: false,
        reason: 'INVALID_QUANTITY',
        quantity: 0,
        available: owned,
        inventory: inv
      };
    }
    if (qty > 100) {
      return {
        opened: false,
        reason: 'QUANTITY_LIMIT',
        quantity: qty,
        available: owned,
        inventory: inv
      };
    }
    if (qty > owned) {
      return {
        opened: false,
        reason: 'INSUFFICIENT_CASES',
        quantity: qty,
        available: owned,
        inventory: inv
      };
    }

    const r = typeof rng === 'function' ? rng : Math.random;
    const items = [];
    for (let i = 0; i < qty; i++) {
      const rarity = pickWeightedRarity(r, validId);
      const item = rollItemFromPool(validId, rarity, r);
      if (isWeaponItem(item)) inv.weapons.unshift(item);
      else if (isGloveItem(item)) inv.gloves.unshift(item);
      else inv.knives.unshift(item);
      items.push(item);
    }

    inv.caseCounts[validId] = owned - qty;
    inv.totalOpened = Math.min(99999, (inv.totalOpened || 0) + qty);
    return {
      opened: true,
      caseId: validId,
      quantity: qty,
      items,
      inventory: inv
    };
  }

  function buyCase(inventory, caseId) {
    const inv = sanitizeInventory(inventory);
    const validId = CASES[caseId] ? caseId : 'velocity';
    const price = getCasePrice(validId);
    if (inv.coins < price) {
      return {
        purchased: false,
        reason: 'INSUFFICIENT_COINS',
        price,
        deficit: price - inv.coins,
        inventory: inv
      };
    }
    inv.coins = Math.max(0, inv.coins - price);
    inv.caseCounts[validId] = Math.min(999, (inv.caseCounts[validId] || 0) + 1);
    return {
      purchased: true,
      caseId: validId,
      price,
      inventory: inv
    };
  }

  function sellItems(inventory, itemIds) {
    const inv = sanitizeInventory(inventory);
    const idSet = new Set(Array.isArray(itemIds) ? itemIds.map((x) => String(x)) : []);
    if (idSet.size === 0) {
      return { inventory: inv, soldItems: [], coinsEarned: 0 };
    }

    const soldItems = [];
    let coinsEarned = 0;

    const filterList = (list) => {
      const kept = [];
      for (const item of list) {
        if (idSet.has(item.id)) {
          const check = isItemSellable(inv, item);
          if (check.sellable) {
            soldItems.push(item);
            coinsEarned += check.value;
            continue;
          }
        }
        kept.push(item);
      }
      return kept;
    };

    inv.weapons = filterList(inv.weapons);
    inv.knives = filterList(inv.knives);
    inv.gloves = filterList(inv.gloves);
    inv.coins = Math.min(ECONOMY.MAX_COINS, inv.coins + coinsEarned);

    return { inventory: inv, soldItems, coinsEarned };
  }

  function findDuplicateSellableIds(inventory, category) {
    const inv = sanitizeInventory(inventory);
    const lists = [];
    if (!category || category === 'all' || category === 'weapons') lists.push(inv.weapons);
    if (!category || category === 'all' || category === 'knives') lists.push(inv.knives);
    if (!category || category === 'all' || category === 'gloves') lists.push(inv.gloves);

    const dupIds = [];
    for (const list of lists) {
      const groups = new Map();
      for (const item of list) {
        if (typeof item.id === 'string' && item.id.startsWith('starter_')) continue;
        const groupKey = isWeaponItem(item)
          ? `w:${item.weaponType}:${item.skinId}`
          : isGloveItem(item)
            ? `g:${item.gloveType}:${item.skinId}`
            : `k:${item.knifeType}:${item.skinId}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
      }
      for (const items of groups.values()) {
        if (items.length < 2) continue;
        // Keep the single best copy: equipped first, then highest sell value, then lowest float
        items.sort((a, b) => {
          const eqDiff = (isItemEquippedInInventory(inv, b) ? 1 : 0) - (isItemEquippedInInventory(inv, a) ? 1 : 0);
          if (eqDiff !== 0) return eqDiff;
          const valDiff = getItemSellValue(b) - getItemSellValue(a);
          if (valDiff !== 0) return valDiff;
          return (a.floatValue || 1) - (b.floatValue || 1);
        });
        for (let i = 1; i < items.length; i++) {
          if (isItemSellable(inv, items[i]).sellable) {
            dupIds.push(items[i].id);
          }
        }
      }
    }
    return dupIds;
  }

  function grantRunRewards(inventory, info) {
    const inv = sanitizeInventory(inventory);
    const breakdown = [];
    let coinsEarned = 0;

    const add = (coins, reason) => {
      coinsEarned += coins;
      breakdown.push({ coins, reason });
    };

    add(ECONOMY.REWARDS.courseFinish, 'Course Finish');

    const tierNum = info && Number.isFinite(info.courseTier) ? Math.floor(info.courseTier) : 1;
    const tierBonus = tierNum >= 4 ? 35 : tierNum === 3 ? 20 : tierNum === 2 ? 10 : 0;
    if (tierBonus > 0) {
      add(tierBonus, `Tier ${tierNum} Bonus`);
    }

    if (info && info.cleanGauntlet) {
      add(ECONOMY.REWARDS.cleanGauntlet, 'Clean Gauntlet');
    }

    if (info && info.isNewBest) {
      add(ECONOMY.REWARDS.newPb, 'New Personal Best');
    }

    const todayKey = info && typeof info.todayKey === 'string' ? info.todayKey : '';
    const dateKey = info && typeof info.dateKey === 'string' ? info.dateKey : '';
    if (dateKey && todayKey && dateKey === todayKey && inv.lastDailyDropDate !== todayKey) {
      inv.lastDailyDropDate = todayKey;
      add(ECONOMY.REWARDS.dailyFirstClear, 'Daily First Clear');
    }

    inv.coins = Math.min(ECONOMY.MAX_COINS, inv.coins + coinsEarned);
    return { inventory: inv, coinsEarned, breakdown };
  }

  function grantArenaKillCoins(inventory, info) {
    const inv = sanitizeInventory(inventory);
    const isHeadshot = Boolean(info && info.headshot);
    const coinsEarned = isHeadshot ? ECONOMY.REWARDS.arenaHeadshotKill : ECONOMY.REWARDS.arenaKill;
    inv.coins = Math.min(ECONOMY.MAX_COINS, inv.coins + coinsEarned);
    return {
      inventory: inv,
      coinsEarned,
      reason: isHeadshot ? 'Headshot Elimination' : 'Arena Elimination'
    };
  }

  function grantArenaReward(inventory, info) {
    const inv = sanitizeInventory(inventory);
    const breakdown = [];
    let coinsEarned = 0;

    coinsEarned += ECONOMY.REWARDS.arenaMatchComplete;
    breakdown.push({ coins: ECONOMY.REWARDS.arenaMatchComplete, reason: 'Arena Match Complete' });

    if (info && info.won) {
      coinsEarned += ECONOMY.REWARDS.arenaMatchWin;
      breakdown.push({ coins: ECONOMY.REWARDS.arenaMatchWin, reason: 'Arena Victory Bonus' });
    }

    inv.coins = Math.min(ECONOMY.MAX_COINS, inv.coins + coinsEarned);
    return { inventory: inv, coinsEarned, breakdown };
  }

  function formatKnifeFullName(item) {
    const kt = KNIFE_TYPES[item.knifeType] || KNIFE_TYPES.default;
    const sk = SKINS[item.skinId] || SKINS.vanilla;
    const prefix = item.statTrak ? 'StatTrak™ ' : '';
    return `${prefix}${kt.name} | ${sk.name}`;
  }

  function formatGloveFullName(item) {
    const gt = GLOVE_TYPES[item.gloveType] || GLOVE_TYPES.standard;
    const sk = GLOVE_SKINS[item.skinId] || GLOVE_SKINS.tactical_slate;
    return `${gt.name} | ${sk.name}`;
  }

  function formatWeaponFullName(item) {
    const wt = WEAPON_TYPES[item.weaponType] || WEAPON_TYPES.rifle;
    const sk = WEAPON_SKINS[item.skinId] || WEAPON_SKINS.factory_slate;
    const prefix = item.statTrak ? 'StatTrak™ ' : '';
    return `${prefix}${wt.name} | ${sk.name}`;
  }

  function formatItemFullName(item) {
    if (isWeaponItem(item)) return formatWeaponFullName(item);
    if (isGloveItem(item)) return formatGloveFullName(item);
    return formatKnifeFullName(item);
  }

  function formatKnifeMetaLine(item) {
    const parts = [];
    if (item.statTrak) {
      parts.push(`ST™ ${item.statTrakKills || 0} KILLS`);
    }
    const sk = isWeaponItem(item)
      ? WEAPON_SKINS[item.skinId]
      : isGloveItem(item)
        ? GLOVE_SKINS[item.skinId]
        : SKINS[item.skinId];
    if (sk && sk.patternBased) {
      parts.push(`SEED #${item.patternSeed}`);
    }
    if (item.skinId === 'case_hardened' && item.bluePct > 0) {
      parts.push(`${item.bluePct}% Blue`);
    } else if (item.skinId === 'fade' && item.bluePct > 0) {
      parts.push(`${item.bluePct}% Fade`);
    }
    if (item.specialTag) {
      parts.push(item.specialTag);
    }
    if (parts.length === 0) {
      const rar = RARITIES[item.rarity] || RARITIES.milspec;
      parts.push(rar.label);
    }
    return parts.join(' · ');
  }

  function toCloudInventoryPayload(inventory, uid) {
    const clean = sanitizeInventory(inventory);
    return {
      uid: String(uid || ''),
      coins: clean.coins,
      equippedKnifeId: clean.equippedKnifeId,
      equippedGloveId: clean.equippedGloveId,
      equippedRifleId: clean.equippedRifleId,
      equippedAwpId: clean.equippedAwpId,
      equippedDeagleId: clean.equippedDeagleId,
      caseCounts: Object.fromEntries(CASE_IDS.map((id) => [id, clean.caseCounts[id]])),
      totalOpened: clean.totalOpened,
      lastDailyDropDate: clean.lastDailyDropDate
    };
  }

  function toCloudKnifePayload(item, uid) {
    const clean = sanitizeKnifeItem(item);
    const payload = {
      uid: String(uid || ''),
      id: clean.id,
      knifeType: clean.knifeType,
      skinId: clean.skinId,
      rarity: clean.rarity,
      patternSeed: clean.patternSeed,
      floatValue: clean.floatValue,
      wearGrade: clean.wearGrade,
      specialTag: clean.specialTag,
      bluePct: clean.bluePct,
      caseId: clean.caseId
    };
    if (clean.statTrak) {
      payload.statTrak = true;
      payload.statTrakKills = clean.statTrakKills;
    }
    return payload;
  }

  function toCloudGlovePayload(item, uid) {
    const clean = sanitizeGloveItem(item);
    return {
      uid: String(uid || ''),
      id: clean.id,
      gloveType: clean.gloveType,
      skinId: clean.skinId,
      rarity: clean.rarity,
      patternSeed: clean.patternSeed,
      floatValue: clean.floatValue,
      wearGrade: clean.wearGrade,
      specialTag: clean.specialTag,
      bluePct: clean.bluePct,
      caseId: clean.caseId
    };
  }

  function toCloudWeaponPayload(item, uid) {
    const clean = sanitizeWeaponItem(item);
    const payload = {
      uid: String(uid || ''),
      id: clean.id,
      weaponType: clean.weaponType,
      skinId: clean.skinId,
      rarity: clean.rarity,
      patternSeed: clean.patternSeed,
      floatValue: clean.floatValue,
      wearGrade: clean.wearGrade,
      specialTag: clean.specialTag,
      bluePct: clean.bluePct,
      caseId: clean.caseId
    };
    if (clean.statTrak) {
      payload.statTrak = true;
      payload.statTrakKills = clean.statTrakKills;
    }
    return payload;
  }

  function countNonStarterItems(inventory) {
    if (!inventory || typeof inventory !== 'object') return 0;
    const isNonStarter = (it) => it && typeof it.id === 'string' && !it.id.startsWith('starter_');
    const k = Array.isArray(inventory.knives) ? inventory.knives.filter(isNonStarter).length : 0;
    const g = Array.isArray(inventory.gloves) ? inventory.gloves.filter(isNonStarter).length : 0;
    const w = Array.isArray(inventory.weapons) ? inventory.weapons.filter(isNonStarter).length : 0;
    return k + g + w;
  }

  function resolveStorage(storage) {
    return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  function isLocalDirty(storage) {
    const store = resolveStorage(storage);
    if (!store) return false;
    try {
      return store.getItem(DIRTY_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setLocalDirty(dirty, storage) {
    const store = resolveStorage(storage);
    if (!store) return;
    try {
      if (dirty) store.setItem(DIRTY_STORAGE_KEY, '1');
      else store.removeItem(DIRTY_STORAGE_KEY);
    } catch (_) {}
  }

  function loadPendingSoldItems(storage) {
    const store = resolveStorage(storage);
    if (!store) return [];
    try {
      const raw = store.getItem(SOLD_IDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      const out = [];
      for (const entry of parsed) {
        const id = typeof entry === 'string' ? entry : (entry && typeof entry.id === 'string' ? entry.id : '');
        if (!id || id.startsWith('starter_') || seen.has(id)) continue;
        seen.add(id);
        const kind = entry && (entry.kind === 'weapon' || entry.kind === 'glove' || entry.kind === 'knife')
          ? entry.kind
          : (id.startsWith('wpn_') ? 'weapon' : id.startsWith('glv_') ? 'glove' : 'knife');
        out.push({ id, kind });
        if (out.length >= 500) break;
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function savePendingSoldItems(items, storage) {
    const store = resolveStorage(storage);
    if (!store) return;
    try {
      const clean = Array.isArray(items) ? items.slice(-500) : [];
      if (clean.length === 0) {
        store.removeItem(SOLD_IDS_STORAGE_KEY);
      } else {
        store.setItem(SOLD_IDS_STORAGE_KEY, JSON.stringify(clean));
      }
    } catch (_) {}
  }

  function recordPendingSoldItems(soldItems, storage) {
    if (!Array.isArray(soldItems) || soldItems.length === 0) return loadPendingSoldItems(storage);
    const existing = loadPendingSoldItems(storage);
    const byId = new Map(existing.map((e) => [e.id, e]));
    for (const item of soldItems) {
      if (!item || typeof item.id !== 'string' || item.id.startsWith('starter_')) continue;
      const kind = isWeaponItem(item) ? 'weapon' : isGloveItem(item) ? 'glove' : 'knife';
      byId.set(item.id, { id: item.id, kind });
    }
    const next = Array.from(byId.values()).slice(-500);
    savePendingSoldItems(next, storage);
    return next;
  }

  function clearPendingSoldItem(itemId, storage) {
    if (!itemId) return;
    const existing = loadPendingSoldItems(storage);
    const next = existing.filter((e) => e.id !== itemId);
    if (next.length !== existing.length) {
      savePendingSoldItems(next, storage);
    }
  }

  function mergeInventories(localInv, cloudInv, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const local = sanitizeInventory(localInv);
    const knivesLoaded = opts.knivesLoaded !== false;
    const glovesLoaded = opts.glovesLoaded !== false;
    const weaponsLoaded = opts.weaponsLoaded !== false;
    const localDirty = Boolean(opts.localDirty);
    const partialCloudLoad = !(knivesLoaded && glovesLoaded && weaponsLoaded);

    const soldIdSet = new Set();
    if (opts.pendingSoldIds) {
      const iter = opts.pendingSoldIds instanceof Set ? opts.pendingSoldIds : (Array.isArray(opts.pendingSoldIds) ? opts.pendingSoldIds : []);
      for (const entry of iter) {
        const id = typeof entry === 'string' ? entry : (entry && typeof entry.id === 'string' ? entry.id : '');
        if (id && !id.startsWith('starter_')) soldIdSet.add(id);
      }
    }

    if (!cloudInv || typeof cloudInv !== 'object') {
      const missingKnives = local.knives.filter((k) => !k.id.startsWith('starter_') && !soldIdSet.has(k.id));
      const missingGloves = local.gloves.filter((g) => !g.id.startsWith('starter_') && !soldIdSet.has(g.id));
      const missingWeapons = local.weapons.filter((w) => !w.id.startsWith('starter_') && !soldIdSet.has(w.id));
      return {
        inventory: local,
        missingInCloud: {
          knives: missingKnives,
          gloves: missingGloves,
          weapons: missingWeapons
        },
        staleInCloud: { knives: [], gloves: [], weapons: [] },
        needsSummarySync: true,
        partialCloudLoad: false
      };
    }

    const cloud = sanitizeInventory(cloudInv);

    const mergeCategory = (localList, cloudList, loaded) => {
      const merged = [];
      const seen = new Set();
      const missingInCloud = [];
      const staleInCloud = [];

      for (const item of localList) {
        if (!item.id.startsWith('starter_') && soldIdSet.has(item.id)) continue;
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }

      if (loaded) {
        const cloudIds = new Set();
        for (const item of cloudList) {
          cloudIds.add(item.id);
          if (!item.id.startsWith('starter_') && soldIdSet.has(item.id)) {
            staleInCloud.push(item.id);
            continue;
          }
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
        for (const item of merged) {
          if (!item.id.startsWith('starter_') && !cloudIds.has(item.id)) {
            missingInCloud.push(item);
          }
        }
      }

      return { merged, missingInCloud, staleInCloud };
    };

    const kMerge = mergeCategory(local.knives, cloud.knives, knivesLoaded);
    const gMerge = mergeCategory(local.gloves, cloud.gloves, glovesLoaded);
    const wMerge = mergeCategory(local.weapons, cloud.weapons, weaponsLoaded);

    const hasMissingInCloud =
      kMerge.missingInCloud.length > 0 ||
      gMerge.missingInCloud.length > 0 ||
      wMerge.missingInCloud.length > 0;

    const pickEquipped = (localId, cloudId, list, extraCheck) => {
      const isValid = (id) => typeof id === 'string' && list.some((it) => it.id === id && (!extraCheck || extraCheck(it)));
      const localValid = isValid(localId);
      const cloudValid = isValid(cloudId);
      const localCustom = localValid && !localId.startsWith('starter_');
      const cloudCustom = cloudValid && !cloudId.startsWith('starter_');

      if (localDirty) {
        if (localValid) return localId;
        if (cloudValid) return cloudId;
        return list[0] ? list[0].id : localId;
      }
      if (cloudCustom) return cloudId;
      if (localCustom) return localId;
      if (cloudValid) return cloudId;
      if (localValid) return localId;
      return list[0] ? list[0].id : localId;
    };

    const equippedKnifeId = pickEquipped(local.equippedKnifeId, cloud.equippedKnifeId, kMerge.merged);
    const equippedGloveId = pickEquipped(local.equippedGloveId, cloud.equippedGloveId, gMerge.merged);
    const equippedWeaponIds = {};
    for (const wt of WEAPON_TYPE_IDS) {
      const localId = local.equippedWeaponIds ? local.equippedWeaponIds[wt] : undefined;
      const cloudId = cloud.equippedWeaponIds ? cloud.equippedWeaponIds[wt] : undefined;
      equippedWeaponIds[wt] = pickEquipped(localId, cloudId, wMerge.merged, (w) => w.weaponType === wt);
    }

    const totalOpened = Math.max(local.totalOpened, cloud.totalOpened);
    const lastDailyDropDate = local.lastDailyDropDate >= cloud.lastDailyDropDate
      ? local.lastDailyDropDate
      : cloud.lastDailyDropDate;

    const preferLocalBalances =
      localDirty ||
      local.totalOpened > cloud.totalOpened ||
      hasMissingInCloud ||
      soldIdSet.size > 0;

    const coins = preferLocalBalances ? local.coins : cloud.coins;
    const balanceSource = preferLocalBalances ? local.caseCounts : cloud.caseCounts;
    const caseCounts = Object.fromEntries(CASE_IDS.map((id) => [id, balanceSource[id]]));

    const inventory = sanitizeInventory({
      coins,
      equippedKnifeId,
      equippedGloveId,
      equippedRifleId: equippedWeaponIds.rifle,
      equippedSmgId: equippedWeaponIds.smg,
      equippedShotgunId: equippedWeaponIds.shotgun,
      equippedAwpId: equippedWeaponIds.awp,
      equippedRevolverId: equippedWeaponIds.revolver,
      equippedDeagleId: equippedWeaponIds.deagle,
      equippedPistolId: equippedWeaponIds.pistol,
      equippedWeaponIds,
      caseCounts,
      totalOpened,
      lastDailyDropDate,
      knives: kMerge.merged,
      gloves: gMerge.merged,
      weapons: wMerge.merged
    });

    const summaryDiffersFromCloud =
      inventory.coins !== cloud.coins ||
      inventory.totalOpened !== cloud.totalOpened ||
      inventory.lastDailyDropDate !== cloud.lastDailyDropDate ||
      inventory.equippedKnifeId !== cloud.equippedKnifeId ||
      inventory.equippedGloveId !== cloud.equippedGloveId ||
      inventory.equippedRifleId !== cloud.equippedRifleId ||
      inventory.equippedAwpId !== cloud.equippedAwpId ||
      inventory.equippedDeagleId !== cloud.equippedDeagleId ||
      CASE_IDS.some((id) => inventory.caseCounts[id] !== cloud.caseCounts[id]);

    return {
      inventory,
      missingInCloud: {
        knives: kMerge.missingInCloud,
        gloves: gMerge.missingInCloud,
        weapons: wMerge.missingInCloud
      },
      staleInCloud: {
        knives: kMerge.staleInCloud,
        gloves: gMerge.staleInCloud,
        weapons: wMerge.staleInCloud
      },
      needsSummarySync: summaryDiffersFromCloud || hasMissingInCloud || localDirty,
      partialCloudLoad
    };
  }

  function tryReadInventoryKey(store, key) {
    try {
      const raw = store.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return sanitizeInventory(parsed);
    } catch (_) {
      return null;
    }
  }

  function loadLocal(storage) {
    const store = resolveStorage(storage);
    if (!store) return createStarterInventory();
    const primary = tryReadInventoryKey(store, STORAGE_KEY);
    const backup = tryReadInventoryKey(store, BACKUP_STORAGE_KEY);

    if (primary) {
      // Self-heal if primary was somehow blanked to a zero-progress starter while a populated backup exists
      if (
        backup &&
        countNonStarterItems(primary) === 0 &&
        primary.totalOpened === 0 &&
        countNonStarterItems(backup) > 0
      ) {
        try {
          store.setItem(STORAGE_KEY, JSON.stringify(backup));
        } catch (_) {}
        return backup;
      }
      return primary;
    }

    if (backup) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(backup));
      } catch (_) {}
      return backup;
    }

    const starter = createStarterInventory();
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(starter));
    } catch (_) {}
    return starter;
  }

  function saveLocal(inventory, storage, options) {
    const clean = sanitizeInventory(inventory);
    const store = resolveStorage(storage);
    if (store) {
      const serialized = JSON.stringify(clean);
      try {
        store.setItem(STORAGE_KEY, serialized);
      } catch (_) {}
      try {
        const allowBackupReset = Boolean(options && options.allowBackupReset);
        const hasProgress = countNonStarterItems(clean) > 0 || clean.totalOpened > 0;
        const existingBackup = tryReadInventoryKey(store, BACKUP_STORAGE_KEY);
        if (hasProgress || allowBackupReset || !existingBackup) {
          store.setItem(BACKUP_STORAGE_KEY, serialized);
        }
      } catch (_) {}
    }
    return clean;
  }

  return {
    STORAGE_KEY,
    BACKUP_STORAGE_KEY,
    SOLD_IDS_STORAGE_KEY,
    DIRTY_STORAGE_KEY,
    ECONOMY,
    KNIFE_TYPES,
    KNIFE_TYPE_IDS,
    GLOVE_TYPES,
    GLOVE_TYPE_IDS,
    WEAPON_TYPES,
    WEAPON_TYPE_IDS,
    RARITIES,
    RARITY_IDS,
    SKINS,
    SKIN_IDS,
    GLOVE_SKINS,
    GLOVE_SKIN_IDS,
    WEAPON_SKINS,
    WEAPON_SKIN_IDS,
    SPECIAL_TAGS,
    WEAR_GRADES,
    WEAR_CODES,
    CASES,
    CASE_IDS,
    BLUE_GEM_SEEDS,
    MYTHIC_INSPECT_CHANCE,
    UNCOMMON_INSPECT_CHANCE,
    rollInspectTier,
    hash2D,
    valueNoise2D,
    fbm2D,
    evaluateCaseHardenedPixel,
    computeCaseHardenedBluePct,
    computeFadePct,
    evaluateDopplerVariant,
    evaluateMarbleFadeVariant,
    getWearGrade,
    formatFloat,
    computeSkinMetadata,
    isGloveItem,
    isWeaponItem,
    getCasePrice,
    getCaseOdds,
    getItemSellValue,
    incrementStatTrakKills,
    isItemEquippedInInventory,
    isItemSellable,
    buyCase,
    buyCases,
    openCases,
    sellItems,
    findDuplicateSellableIds,
    rollItemFromPool,
    rollCaseDrop,
    createStarterKnife,
    createStarterGlove,
    createStarterWeapon,
    createStarterWeapons,
    createStarterInventory,
    sanitizeKnifeItem,
    sanitizeGloveItem,
    sanitizeWeaponItem,
    sanitizeInventory,
    getEquippedKnife,
    getEquippedGlove,
    getEquippedWeapon,
    totalCaseCount,
    countNonStarterItems,
    grantRunRewards,
    grantArenaKillCoins,
    grantArenaReward,
    formatKnifeFullName,
    formatGloveFullName,
    formatWeaponFullName,
    formatItemFullName,
    formatKnifeMetaLine,
    toCloudInventoryPayload,
    toCloudKnifePayload,
    toCloudGlovePayload,
    toCloudWeaponPayload,
    isLocalDirty,
    setLocalDirty,
    loadPendingSoldItems,
    recordPendingSoldItems,
    clearPendingSoldItem,
    mergeInventories,
    loadLocal,
    saveLocal
  };
});
