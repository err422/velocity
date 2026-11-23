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

  const RARITIES = Object.freeze({
    milspec: { id: 'milspec', label: 'Mil-Spec', color: '#4b69ff', weight: 52, order: 1 },
    restricted: { id: 'restricted', label: 'Restricted', color: '#8847ff', weight: 26, order: 2 },
    classified: { id: 'classified', label: 'Classified', color: '#d32ce6', weight: 13.5, order: 3 },
    covert: { id: 'covert', label: 'Covert', color: '#eb4b4b', weight: 6.0, order: 4 },
    gold: { id: 'gold', label: 'Rare Special', color: '#f5c542', weight: 2.5, order: 5 }
  });

  const RARITY_IDS = Object.freeze(Object.keys(RARITIES));

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
    }
  });

  const GLOVE_SKIN_IDS = Object.freeze(Object.keys(GLOVE_SKINS));

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
      accent: '#2ea8ff',
      description: 'Original surf collection featuring Case Hardened Blue Gems, Crimson Web, Slaughter, and Classic Gold Gloves.',
      pools: {
        milspec: [
          { knifeType: 'default', skinId: 'vanilla' },
          { knifeType: 'default', skinId: 'ultraviolet' },
          { knifeType: 'm9', skinId: 'ultraviolet' }
        ],
        restricted: [
          { knifeType: 'default', skinId: 'damascus' },
          { knifeType: 'm9', skinId: 'damascus' },
          { knifeType: 'skeleton', skinId: 'ultraviolet' }
        ],
        classified: [
          { knifeType: 'm9', skinId: 'crimson_web' },
          { knifeType: 'karambit', skinId: 'ultraviolet' },
          { knifeType: 'butterfly', skinId: 'slaughter' },
          { knifeType: 'skeleton', skinId: 'crimson_web' }
        ],
        covert: [
          { knifeType: 'karambit', skinId: 'case_hardened' },
          { knifeType: 'butterfly', skinId: 'case_hardened' },
          { knifeType: 'm9', skinId: 'case_hardened' },
          { knifeType: 'skeleton', skinId: 'case_hardened' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'butterfly', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'm9', skinId: 'case_hardened', forceBlueGem: true },
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
      accent: '#d32ce6',
      description: 'Anodized Chroma finishes: Doppler Ruby & Sapphire, Tiger Tooth, plus Sport & Specialist Gold Gloves.',
      pools: {
        milspec: [
          { knifeType: 'default', skinId: 'ultraviolet' },
          { knifeType: 'm9', skinId: 'vanilla' },
          { knifeType: 'default', skinId: 'damascus' }
        ],
        restricted: [
          { knifeType: 'm9', skinId: 'damascus' },
          { knifeType: 'karambit', skinId: 'damascus' },
          { knifeType: 'butterfly', skinId: 'ultraviolet' }
        ],
        classified: [
          { knifeType: 'm9', skinId: 'tiger_tooth' },
          { knifeType: 'karambit', skinId: 'tiger_tooth' },
          { knifeType: 'butterfly', skinId: 'tiger_tooth' },
          { knifeType: 'skeleton', skinId: 'slaughter' }
        ],
        covert: [
          { knifeType: 'karambit', skinId: 'doppler' },
          { knifeType: 'm9', skinId: 'doppler' },
          { knifeType: 'butterfly', skinId: 'doppler' },
          { knifeType: 'karambit', skinId: 'marble_fade' },
          { knifeType: 'm9', skinId: 'marble_fade' }
        ],
        gold: [
          { knifeType: 'karambit', skinId: 'doppler', forceGem: true },
          { knifeType: 'butterfly', skinId: 'doppler', forceGem: true },
          { knifeType: 'm9', skinId: 'doppler', forceGem: true },
          { knifeType: 'karambit', skinId: 'marble_fade', forceFireIce: true },
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
      accent: '#f5c542',
      description: 'High-tier showcase featuring Full Fades, Skeleton Blue Gems, and Vice / Slingshot / Fade Gold Gloves.',
      pools: {
        milspec: [
          { knifeType: 'skeleton', skinId: 'vanilla' },
          { knifeType: 'default', skinId: 'damascus' },
          { knifeType: 'm9', skinId: 'ultraviolet' }
        ],
        restricted: [
          { knifeType: 'butterfly', skinId: 'damascus' },
          { knifeType: 'skeleton', skinId: 'damascus' },
          { knifeType: 'karambit', skinId: 'slaughter' }
        ],
        classified: [
          { knifeType: 'butterfly', skinId: 'fade' },
          { knifeType: 'karambit', skinId: 'fade' },
          { knifeType: 'skeleton', skinId: 'fade' },
          { knifeType: 'm9', skinId: 'fade' }
        ],
        covert: [
          { knifeType: 'butterfly', skinId: 'marble_fade' },
          { knifeType: 'skeleton', skinId: 'doppler' },
          { knifeType: 'skeleton', skinId: 'case_hardened' },
          { knifeType: 'karambit', skinId: 'doppler' }
        ],
        gold: [
          { knifeType: 'butterfly', skinId: 'doppler', forceGem: true },
          { knifeType: 'skeleton', skinId: 'case_hardened', forceBlueGem: true },
          { knifeType: 'karambit', skinId: 'fade', forceFullFade: true },
          { knifeType: 'butterfly', skinId: 'fade', forceFullFade: true },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'vice' },
          { itemKind: 'glove', gloveType: 'sport', skinId: 'slingshot' },
          { itemKind: 'glove', gloveType: 'specialist', skinId: 'fade', forceFullFade: true },
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

  function isGloveItem(item) {
    return !!(item && (item.itemKind === 'glove' || (!!item.gloveType && !item.knifeType)));
  }

  function pickWeightedRarity(rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const total = RARITY_IDS.reduce((s, id) => s + RARITIES[id].weight, 0);
    let roll = r() * total;
    for (const id of RARITY_IDS) {
      roll -= RARITIES[id].weight;
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

    if (entry.itemKind === 'glove') {
      const gSkin = GLOVE_SKINS[entry.skinId] || GLOVE_SKINS.tactical_slate;
      let rawT = r();
      if (rarityId === 'gold') {
        rawT = rawT * 0.30; // Favor crisp FN/MW on Gold glove drops
      }
      const floatValue = Math.round((gSkin.minFloat + rawT * (gSkin.maxFloat - gSkin.minFloat)) * 10000) / 10000;
      const clampedFloat = Math.max(0.0001, Math.min(0.9999, floatValue));
      const wear = getWearGrade(clampedFloat);
      const meta = computeSkinMetadata(entry.skinId, patternSeed, entry);

      return sanitizeGloveItem({
        id: overrideId || createGloveId(r),
        itemKind: 'glove',
        gloveType: entry.gloveType,
        skinId: entry.skinId,
        rarity: rarityId,
        patternSeed,
        floatValue: clampedFloat,
        wearGrade: wear.code,
        specialTag: meta.specialTag,
        bluePct: meta.bluePct,
        caseId: caseDef.id
      });
    }

    const skin = SKINS[entry.skinId] || SKINS.vanilla;
    let rawT = r();
    if (rarityId === 'gold') {
      rawT = rawT * 0.25;
    } else if (skin.maxFloat - skin.minFloat > 0.4) {
      rawT = Math.pow(rawT, 1.35);
    }
    const floatValue = Math.round((skin.minFloat + rawT * (skin.maxFloat - skin.minFloat)) * 10000) / 10000;
    const clampedFloat = Math.max(0.0001, Math.min(0.9999, floatValue));
    const wear = getWearGrade(clampedFloat);
    const meta = computeSkinMetadata(entry.skinId, patternSeed, entry);

    return sanitizeKnifeItem({
      id: overrideId || createKnifeId(r),
      knifeType: entry.knifeType,
      skinId: entry.skinId,
      rarity: rarityId,
      patternSeed,
      floatValue: clampedFloat,
      wearGrade: wear.code,
      specialTag: meta.specialTag,
      bluePct: meta.bluePct,
      caseId: caseDef.id
    });
  }

  function rollCaseDrop(caseId, rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const validCaseId = CASES[caseId] ? caseId : 'velocity';
    const winRarity = pickWeightedRarity(r);
    const winner = rollItemFromPool(validCaseId, winRarity, r);

    const STRIP_LEN = 45;
    const WIN_INDEX = 36;
    const strip = [];
    for (let i = 0; i < STRIP_LEN; i++) {
      if (i === WIN_INDEX) {
        strip.push(winner);
      } else {
        const decRarity = pickWeightedRarity(r);
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

  function createStarterInventory() {
    const starterKnife = createStarterKnife();
    const starterGlove = createStarterGlove();
    return {
      equippedKnifeId: starterKnife.id,
      equippedGloveId: starterGlove.id,
      caseCounts: {
        velocity: 1,
        chroma: 1,
        spectrum: 1
      },
      totalOpened: 0,
      lastDailyDropDate: '',
      knives: [starterKnife],
      gloves: [starterGlove]
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
      : 0.12;
    const wearGrade = getWearGrade(floatValue).code;
    const specialTag = SPECIAL_TAGS.includes(src.specialTag) ? src.specialTag : '';
    const rawPct = Number(src.bluePct);
    const bluePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, Math.round(rawPct))) : 0;
    const caseId = CASES[src.caseId] || src.caseId === 'starter' ? src.caseId : 'velocity';

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
      caseId
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
      : 0.08;
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

  function clampInt(v, lo, hi, fallback) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  function sanitizeInventory(raw) {
    if (!raw || typeof raw !== 'object') return createStarterInventory();
    const rawCases = raw.caseCounts && typeof raw.caseCounts === 'object' ? raw.caseCounts : {};
    const caseCounts = {
      velocity: clampInt(rawCases.velocity, 0, 999, 0),
      chroma: clampInt(rawCases.chroma, 0, 999, 0),
      spectrum: clampInt(rawCases.spectrum, 0, 999, 0)
    };
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

    const equippedKnifeId = typeof raw.equippedKnifeId === 'string' && seenKnives.has(raw.equippedKnifeId)
      ? raw.equippedKnifeId
      : knives[0].id;
    const equippedGloveId = typeof raw.equippedGloveId === 'string' && seenGloves.has(raw.equippedGloveId)
      ? raw.equippedGloveId
      : gloves[0].id;

    return {
      equippedKnifeId,
      equippedGloveId,
      caseCounts,
      totalOpened,
      lastDailyDropDate,
      knives,
      gloves
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

  function totalCaseCount(inventory) {
    if (!inventory || !inventory.caseCounts) return 0;
    return (inventory.caseCounts.velocity || 0) + (inventory.caseCounts.chroma || 0) + (inventory.caseCounts.spectrum || 0);
  }

  function grantRunRewards(inventory, info, rng) {
    const inv = sanitizeInventory(inventory);
    const r = typeof rng === 'function' ? rng : Math.random;
    const awarded = [];
    const pickCase = () => CASE_IDS[Math.floor(r() * CASE_IDS.length) % CASE_IDS.length];

    const finishCase = pickCase();
    inv.caseCounts[finishCase] = Math.min(999, inv.caseCounts[finishCase] + 1);
    awarded.push({ caseId: finishCase, reason: 'Course Finish' });

    if (info && info.isNewBest) {
      const pbCase = pickCase();
      inv.caseCounts[pbCase] = Math.min(999, inv.caseCounts[pbCase] + 1);
      awarded.push({ caseId: pbCase, reason: 'New Personal Best' });
    }

    const todayKey = info && typeof info.todayKey === 'string' ? info.todayKey : '';
    const dateKey = info && typeof info.dateKey === 'string' ? info.dateKey : '';
    if (dateKey && todayKey && dateKey === todayKey && inv.lastDailyDropDate !== todayKey) {
      inv.lastDailyDropDate = todayKey;
      const d1 = 'chroma';
      const d2 = 'spectrum';
      inv.caseCounts[d1] = Math.min(999, inv.caseCounts[d1] + 1);
      inv.caseCounts[d2] = Math.min(999, inv.caseCounts[d2] + 1);
      awarded.push({ caseId: d1, reason: 'Daily First Clear' });
      awarded.push({ caseId: d2, reason: 'Daily First Clear' });
    }

    return { inventory: inv, awarded };
  }

  function formatKnifeFullName(item) {
    const kt = KNIFE_TYPES[item.knifeType] || KNIFE_TYPES.default;
    const sk = SKINS[item.skinId] || SKINS.vanilla;
    return `${kt.name} | ${sk.name}`;
  }

  function formatGloveFullName(item) {
    const gt = GLOVE_TYPES[item.gloveType] || GLOVE_TYPES.standard;
    const sk = GLOVE_SKINS[item.skinId] || GLOVE_SKINS.tactical_slate;
    return `${gt.name} | ${sk.name}`;
  }

  function formatItemFullName(item) {
    return isGloveItem(item) ? formatGloveFullName(item) : formatKnifeFullName(item);
  }

  function formatKnifeMetaLine(item) {
    const parts = [item.wearGrade, formatFloat(item.floatValue)];
    const sk = isGloveItem(item) ? GLOVE_SKINS[item.skinId] : SKINS[item.skinId];
    if (sk && sk.patternBased) {
      parts.push(`#${item.patternSeed}`);
    }
    if (item.skinId === 'case_hardened' && item.bluePct > 0) {
      parts.push(`${item.bluePct}% Blue`);
    } else if (item.skinId === 'fade' && item.bluePct > 0) {
      parts.push(`${item.bluePct}% Fade`);
    }
    if (item.specialTag) {
      parts.push(item.specialTag);
    }
    return parts.join(' · ');
  }

  function toCloudInventoryPayload(inventory, uid) {
    const clean = sanitizeInventory(inventory);
    return {
      uid: String(uid || ''),
      equippedKnifeId: clean.equippedKnifeId,
      equippedGloveId: clean.equippedGloveId,
      caseCounts: {
        velocity: clean.caseCounts.velocity,
        chroma: clean.caseCounts.chroma,
        spectrum: clean.caseCounts.spectrum
      },
      totalOpened: clean.totalOpened,
      lastDailyDropDate: clean.lastDailyDropDate
    };
  }

  function toCloudKnifePayload(item, uid) {
    const clean = sanitizeKnifeItem(item);
    return {
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

  function loadLocal(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return createStarterInventory();
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) {
        const starter = createStarterInventory();
        store.setItem(STORAGE_KEY, JSON.stringify(starter));
        return starter;
      }
      return sanitizeInventory(JSON.parse(raw));
    } catch (_) {
      return createStarterInventory();
    }
  }

  function saveLocal(inventory, storage) {
    const clean = sanitizeInventory(inventory);
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (store) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch (_) {}
    }
    return clean;
  }

  return {
    STORAGE_KEY,
    KNIFE_TYPES,
    KNIFE_TYPE_IDS,
    GLOVE_TYPES,
    GLOVE_TYPE_IDS,
    RARITIES,
    RARITY_IDS,
    SKINS,
    SKIN_IDS,
    GLOVE_SKINS,
    GLOVE_SKIN_IDS,
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
    rollItemFromPool,
    rollCaseDrop,
    createStarterKnife,
    createStarterGlove,
    createStarterInventory,
    sanitizeKnifeItem,
    sanitizeGloveItem,
    sanitizeInventory,
    getEquippedKnife,
    getEquippedGlove,
    totalCaseCount,
    grantRunRewards,
    formatKnifeFullName,
    formatGloveFullName,
    formatItemFullName,
    formatKnifeMetaLine,
    toCloudInventoryPayload,
    toCloudKnifePayload,
    toCloudGlovePayload,
    loadLocal,
    saveLocal
  };
});
