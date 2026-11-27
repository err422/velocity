// VELOCITY — Player-Grade Adaptive Enemy AI Engine (UMD: window.BotAISystem + Node.js)
// Features:
//  - True 3-sphere capsule OBB collision solver (zero wall/box/crate/ceiling clipping)
//  - Full player movement & abilities: personal Chrono Hangtime, 3D Grapple swings,
//    Kinetic Burst dodges/rushes, Wall-Runs + Wall-Jumps, Slides, Bunny-Hops, Ramp Surfing
//  - Real LoadoutsSystem weapon builds with full player damage, distance falloff, & headshots
//  - Non-stormtrooper tracking aim: stationary targets are laser-punished; high-speed movement
//    challenges angular tracking rate
//  - Rolling K/D adaptive skill scaling across TACTICAL / VETERAN / PRO / APEX tiers

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.BotAISystem = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const H_STAND = [0.42, 1.0, 1.48];
  const H_LOW = [0.42, 0.72, 0.92];
  const COVER_PROBE_ANGLES = [0, 0.785, -0.785, 1.571, -1.571, 2.356, -2.356, Math.PI];
  const STEER_ANGLES = [0.42, -0.42, 0.92, -0.92, 1.48, -1.48, 2.15, -2.15];

  // Fallback weapon specs used only if LoadoutsSystem isn't loaded (e.g. isolated unit tests)
  const FALLBACK_WEAPONS = {
    rifle: {
      weaponId: 'rifle', name: 'V-47 Rifle', shortName: 'V-47',
      damageBody: 34, damageHead: 100, fireInterval: 0.115, magSize: 30,
      reloadSec: 1.85, pellets: 1, pelletSpread: 0, hipSpread: 0.015, adsSpread: 0.004,
      range: 140, falloffStart: 38, falloffEnd: 85, falloffMinMult: 0.62,
      tracerColor: 0xffe291, hasChronoKit: true, chronoTimeScale: 0.28, chronoTier: 1,
      chronoRampIn: 0.14, chronoRampOut: 0.14
    },
    smg: {
      weaponId: 'smg', name: 'VX-9 Vector', shortName: 'VX-9',
      damageBody: 23, damageHead: 62, fireInterval: 0.072, magSize: 36,
      reloadSec: 1.45, pellets: 1, pelletSpread: 0, hipSpread: 0.019, adsSpread: 0.007,
      range: 95, falloffStart: 20, falloffEnd: 52, falloffMinMult: 0.50,
      tracerColor: 0x76eaff, hasChronoKit: true, chronoTimeScale: 0.28, chronoTier: 1,
      chronoRampIn: 0.14, chronoRampOut: 0.14
    },
    awp: {
      weaponId: 'awp', name: 'AWP Sniper', shortName: 'AWP',
      damageBody: 105, damageHead: 260, fireInterval: 1.35, magSize: 5,
      reloadSec: 2.35, pellets: 1, pelletSpread: 0, hipSpread: 0.055, adsSpread: 0.0008,
      range: 220, falloffStart: 90, falloffEnd: 180, falloffMinMult: 0.88,
      tracerColor: 0xffd07a, hasChronoKit: true, chronoTimeScale: 0.18, chronoTier: 2,
      chronoRampIn: 0.16, chronoRampOut: 0.14
    },
    shotgun: {
      weaponId: 'shotgun', name: 'M870 Shotgun', shortName: 'M870',
      damageBody: 18, damageHead: 32, fireInterval: 0.72, magSize: 8,
      reloadSec: 2.05, pellets: 7, pelletSpread: 0.036, hipSpread: 0.018, adsSpread: 0.010,
      range: 52, falloffStart: 12, falloffEnd: 30, falloffMinMult: 0.36,
      tracerColor: 0xffa06b, hasChronoKit: true, chronoTimeScale: 0.28, chronoTier: 1,
      chronoRampIn: 0.14, chronoRampOut: 0.14
    },
    deagle: {
      weaponId: 'deagle', name: 'Deagle .50', shortName: 'DEAGLE',
      damageBody: 52, damageHead: 145, fireInterval: 0.30, magSize: 7,
      reloadSec: 1.55, pellets: 1, pelletSpread: 0, hipSpread: 0.014, adsSpread: 0.003,
      range: 120, falloffStart: 30, falloffEnd: 70, falloffMinMult: 0.56,
      tracerColor: 0xffc66b, hasChronoKit: true, chronoTimeScale: 0.28, chronoTier: 1,
      chronoRampIn: 0.14, chronoRampOut: 0.14
    },
    revolver: {
      weaponId: 'revolver', name: 'R-88 Magnum', shortName: 'R-88',
      damageBody: 105, damageHead: 260, fireInterval: 0.70, magSize: 6,
      reloadSec: 2.88, pellets: 1, pelletSpread: 0, hipSpread: 0.008, adsSpread: 0.0006,
      range: 420, falloffStart: 340, falloffEnd: 460, falloffMinMult: 1.0,
      tracerColor: 0xffe48a, hasChronoKit: true, chronoTimeScale: 0.28, chronoTier: 1,
      chronoRampIn: 0.14, chronoRampOut: 0.14
    }
  };

  // Player-style callsigns keep bots from looking like labeled training dummies.
  const PLAYER_NAME_POOL = Object.freeze([
    'nox', 'Kairo', 'vanta', 'm1dnite', 'zyro', 'lowkey', 's0lar', 'kaizen',
    'Rift', 'kuro', 'breezy', 'clutch.exe', 'pixelshift', 'ghosted', 'Jett',
    'r0gue', 'Echo', 'drift', 'Navi', 'sway', 'coldboot', 'Marlow', 'onyx',
    'flickz', 'orbit', 'riven', 'no_scope', 'hollow', 'tundra', 'juno',
    'static', 's1lent', 'Afterglow', 'vexed', 'stride', 'Mako', 'zenith',
    'rez', 'lumen', 'ace_', 'skylark', 'wraith', 'frosty', 'nimbus', 'koda',
    'voided', 'dash', 'monarch', 'sidequest', 'lagging', 'sable'
  ]);

  function generatePlayerName(usedNames) {
    const used = new Set();
    if (Array.isArray(usedNames)) {
      for (const item of usedNames) {
        const name = typeof item === 'string' ? item : item && item.name;
        if (name) used.add(String(name).trim().toLowerCase());
      }
    }
    const available = PLAYER_NAME_POOL.filter((name) => !used.has(name.toLowerCase()));
    if (available.length) return available[Math.floor(Math.random() * available.length)];
    const base = PLAYER_NAME_POOL[Math.floor(Math.random() * PLAYER_NAME_POOL.length)] || 'player';
    let suffix = Math.floor(Math.random() * 90) + 10;
    let candidate = base + suffix;
    while (used.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = base + suffix;
    }
    return candidate.slice(0, 24);
  }

  // Four player-grade bot archetypes (all armed with real Apex Chrono Kits)
  const BOT_ARCHETYPES = [
    {
      id: 'entry',
      role: 'ENTRY',
      name: 'AI · VEX',
      weapon: 'rifle',
      secondaryWeapon: 'deagle',
      attachments: { optic: 'optic_reflex', muzzle: 'muzzle_comp', grip: 'grip_vertical', mag: 'mag_fast', chrono: 'chrono_stabilizer' },
      secondaryAttachments: { optic: 'optic_reflex', muzzle: 'muzzle_comp', chrono: 'chrono_stabilizer' },
      color: 0xff6b55,
      preferredRange: 19,
      minRange: 8,
      maxRange: 34,
      sightRange: 76,
      burstMin: 2,
      burstMax: 4,
      burstGapMin: 0.28,
      burstGapMax: 0.48,
      chronoStyle: 'midair_dive',
      grappleBias: 0.72,
      slideBias: 0.55,
      wallRunBias: 0.65
    },
    {
      id: 'flanker',
      role: 'FLANKER',
      name: 'AI · KIRA',
      weapon: 'smg',
      secondaryWeapon: null,
      attachments: { optic: 'optic_reflex', barrel: 'barrel_short', grip: 'grip_angled', mag: 'mag_fast', chrono: 'chrono_stabilizer' },
      secondaryAttachments: null,
      color: 0x4eeeff,
      preferredRange: 11.5,
      minRange: 4.5,
      maxRange: 23,
      sightRange: 64,
      burstMin: 3,
      burstMax: 6,
      burstGapMin: 0.24,
      burstGapMax: 0.44,
      chronoStyle: 'midair_dive',
      grappleBias: 0.85,
      slideBias: 0.85,
      wallRunBias: 0.88
    },
    {
      id: 'marksman',
      role: 'MARKSMAN',
      name: 'AI · ZERO',
      weapon: 'awp',
      secondaryWeapon: 'deagle',
      attachments: { optic: 'optic_sniper', barrel: 'barrel_long', stock: 'stock_light', chrono: 'chrono_phase' },
      secondaryAttachments: { optic: 'optic_reflex', muzzle: 'muzzle_comp', chrono: 'chrono_stabilizer' },
      color: 0xffbe3d,
      preferredRange: 30,
      minRange: 14,
      maxRange: 58,
      sightRange: 96,
      burstMin: 1,
      burstMax: 1,
      burstGapMin: 0.30,
      burstGapMax: 0.50,
      chronoStyle: 'awp_peek',
      grappleBias: 0.82,
      slideBias: 0.35,
      wallRunBias: 0.52,
      swapCloseRange: 11.5,
      swapFarRange: 15.5
    },
    {
      id: 'breacher',
      role: 'BREACHER',
      name: 'AI · NOVA',
      weapon: 'shotgun',
      secondaryWeapon: 'deagle',
      attachments: { optic: 'optic_reflex', barrel: 'barrel_short', grip: 'grip_angled', mag: 'mag_fast', chrono: 'chrono_stabilizer' },
      secondaryAttachments: { optic: 'optic_reflex', chrono: 'chrono_stabilizer' },
      color: 0xc77dff,
      preferredRange: 8.5,
      minRange: 3.0,
      maxRange: 18,
      sightRange: 60,
      burstMin: 1,
      burstMax: 2,
      burstGapMin: 0.26,
      burstGapMax: 0.44,
      chronoStyle: 'midair_dive',
      grappleBias: 0.88,
      slideBias: 0.90,
      wallRunBias: 0.78,
      swapCloseRange: 20,
      swapFarRange: 25
    }
  ];

  // ---------- Adjustable Bot Difficulty Levels + Adaptive K/D Tracker ----------
  const DIFFICULTY_STORAGE_KEY = 'velocity_bot_difficulty_v1';

  const DIFFICULTY_LEVELS = Object.freeze([
    {
      id: 'adaptive',
      label: 'ADAPTIVE',
      shortLabel: 'ADAPT',
      desc: 'Auto-scales to your K/D',
      scalar: null,
      xpMult: 1.5
    },
    {
      id: 'recruit',
      label: 'RECRUIT',
      shortLabel: 'RECRUIT',
      desc: 'Relaxed aim · chill warmup',
      scalar: 0.55,
      xpMult: 1.0
    },
    {
      id: 'tactical',
      label: 'TACTICAL',
      shortLabel: 'TACTICAL',
      desc: 'Casual human pace',
      scalar: 0.72,
      xpMult: 1.25
    },
    {
      id: 'veteran',
      label: 'VETERAN',
      shortLabel: 'VETERAN',
      desc: 'Balanced competitive duels',
      scalar: 0.94,
      xpMult: 1.5
    },
    {
      id: 'pro',
      label: 'PRO',
      shortLabel: 'PRO',
      desc: 'Sharp tracking & bursts',
      scalar: 1.15,
      xpMult: 2.0
    },
    {
      id: 'apex',
      label: 'APEX',
      shortLabel: 'APEX',
      desc: 'Peak aim, Chrono & flanks',
      scalar: 1.35,
      xpMult: 2.5
    }
  ]);

  const DIFFICULTY_BY_ID = Object.create(null);
  for (const lvl of DIFFICULTY_LEVELS) DIFFICULTY_BY_ID[lvl.id] = lvl;

  const adaptiveStats = {
    playerKills: 0,
    playerDeaths: 0
  };

  function getBrowserStorage(override) {
    if (override) return override;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (_) {}
    return null;
  }

  let difficultyMode = 'adaptive';
  (function initStoredDifficulty() {
    const store = getBrowserStorage();
    if (!store) return;
    try {
      const saved = String(store.getItem(DIFFICULTY_STORAGE_KEY) || '').toLowerCase();
      if (DIFFICULTY_BY_ID[saved]) difficultyMode = saved;
    } catch (_) {}
  })();

  function clamp(v, a, b) {
    return v < a ? a : (v > b ? b : v);
  }

  function resolveBotWeaponBuild(weaponId, attachments) {
    const LS = root.LoadoutsSystem;
    if (LS && typeof LS.resolveWeaponBuild === 'function') {
      try {
        const b = LS.resolveWeaponBuild(weaponId, attachments || {});
        if (b && b.weaponId) return b;
      } catch (_) {}
    }
    return Object.assign({}, FALLBACK_WEAPONS[weaponId] || FALLBACK_WEAPONS.rifle);
  }

  function buildSkillFromScalar(scalar, tier, extra) {
    const ex = extra || {};
    // t = 0 at TACTICAL (0.72), 1 at APEX (1.35), and extends smoothly down to -0.27 at RECRUIT (0.55)
    const tRaw = (scalar - 0.72) / (1.35 - 0.72);
    const t = clamp(tRaw, -0.35, 1.0);
    const xpMult = typeof ex.xpMult === 'number'
      ? ex.xpMult
      : (tier === 'RECRUIT' ? 1.0 : tier === 'TACTICAL' ? 1.25 : tier === 'VETERAN' ? 1.5 : tier === 'PRO' ? 2.0 : 2.5);
    return {
      mode: ex.mode || 'adaptive',
      scalar: Number(scalar.toFixed(3)),
      kd: typeof ex.kd === 'number' ? Number(ex.kd.toFixed(2)) : 1.0,
      tier,
      label: ex.label || tier,
      desc: ex.desc || '',
      kills: ex.kills || 0,
      deaths: ex.deaths || 0,
      xpMult,
      reactionSec: Number(clamp(0.52 - t * 0.28 - (t < 0 ? t * 0.45 : 0), 0.22, 0.72).toFixed(3)),
      aimTurnRate: Number(clamp(2.5 + t * 4.2, 1.75, 6.7).toFixed(3)), // rad/sec human angular tracking speed
      hsChance: Number(clamp(0.06 + t * 0.14, 0.035, 0.20).toFixed(3)),
      stationarySpread: Number(clamp(0.011 - t * 0.0055, 0.0055, 0.015).toFixed(4)),
      movingSlipPerSpeed: Number(clamp(0.0066 - t * 0.0032 - (t < 0 ? t * 0.006 : 0), 0.0034, 0.0095).toFixed(4)),
      aimSwayAmp: Number(clamp(0.024 - t * 0.013, 0.011, 0.032).toFixed(4)),
      leadFactor: Number(clamp(0.20 + t * 0.45, 0.10, 0.65).toFixed(3)),
      abilityRate: Number(clamp(0.58 + t * 0.42, 0.40, 1.0).toFixed(3)),
      burstTempoMult: Number(clamp(1.58 - t * 0.48 - (t < 0 ? t * 0.42 : 0), 1.10, 1.85).toFixed(3)),
      chronoAggression: Number(clamp(0.55 + t * 0.45, 0.35, 1.0).toFixed(3))
    };
  }

  function computeAdaptiveSkill(kills, deaths) {
    const k = Math.max(0, Number(kills) || 0);
    const d = Math.max(0, Number(deaths) || 0);
    // Bayesian-smoothed K/D starting at 1.0 (VETERAN) and scaling seamlessly with player performance
    const kd = (k + 1.5) / (d + 1.5);
    const scalar = clamp(0.72 + (kd - 0.55) * 0.36, 0.72, 1.35);
    let tier = 'VETERAN';
    if (scalar < 0.88) tier = 'TACTICAL';
    else if (scalar < 1.06) tier = 'VETERAN';
    else if (scalar < 1.22) tier = 'PRO';
    else tier = 'APEX';

    return buildSkillFromScalar(scalar, tier, {
      mode: 'adaptive',
      kd,
      kills: k,
      deaths: d,
      label: `ADAPTIVE (${tier})`,
      desc: DIFFICULTY_BY_ID.adaptive.desc
    });
  }

  function setDifficulty(mode, storageOverride) {
    const norm = String(mode || 'adaptive').toLowerCase();
    const valid = DIFFICULTY_BY_ID[norm] ? norm : 'adaptive';
    difficultyMode = valid;
    const store = getBrowserStorage(storageOverride);
    if (store) {
      try { store.setItem(DIFFICULTY_STORAGE_KEY, valid); } catch (_) {}
    }
    return getActiveSkill();
  }

  function getDifficulty() {
    return difficultyMode;
  }

  function getActiveSkill(modeOverride) {
    const mode = modeOverride && DIFFICULTY_BY_ID[String(modeOverride).toLowerCase()]
      ? String(modeOverride).toLowerCase()
      : difficultyMode;
    if (mode === 'adaptive') {
      return computeAdaptiveSkill(adaptiveStats.playerKills, adaptiveStats.playerDeaths);
    }
    const preset = DIFFICULTY_BY_ID[mode] || DIFFICULTY_BY_ID.veteran;
    return buildSkillFromScalar(preset.scalar, preset.label, {
      mode: preset.id,
      kd: (adaptiveStats.playerKills + 1.5) / (adaptiveStats.playerDeaths + 1.5),
      kills: adaptiveStats.playerKills,
      deaths: adaptiveStats.playerDeaths,
      label: preset.label,
      desc: preset.desc,
      xpMult: preset.xpMult
    });
  }

  function computeBotXpReward(baseXp, modeOverride) {
    const base = Math.max(1, Number(baseXp) || 8);
    const skill = getActiveSkill(modeOverride);
    return Math.max(1, Math.round(base * (skill.xpMult || 1)));
  }

  function recordPlayerKill() {
    adaptiveStats.playerKills += 1;
    return getActiveSkill();
  }

  function recordPlayerDeath() {
    adaptiveStats.playerDeaths += 1;
    return getActiveSkill();
  }

  function resetAdaptiveStats() {
    adaptiveStats.playerKills = 0;
    adaptiveStats.playerDeaths = 0;
  }

  function getAdaptiveState() {
    return getActiveSkill();
  }

  // ---------- Pure Shot & Spread Evaluation (Unit-Testable) ----------
  // Separates tight gun spread (so stationary targets get laser-punished!) from
  // perpendicular-velocity tracking slip (so high-speed surfing & strafe reversals evade shots).
  function computeBotShotParams(build, skill, targetPerpSpeed, distance, opts) {
    const o = opts || {};
    const sk = skill || computeAdaptiveSkill(0, 0);
    const perp = Math.max(0, Number(targetPerpSpeed) || 0);
    const dist = Math.max(1, Number(distance) || 10);
    const isChrono = Boolean(o.botChrono);
    const targetInChrono = Boolean(o.targetChrono);
    const botAirborne = Boolean(o.botAirborne);
    const botHorizSpeed = Math.max(0, Number(o.botHorizSpeed) || 0);
    const burstShotIdx = Math.max(0, Number(o.burstShotIdx) || 0);
    const flinchWeight = clamp(Number(o.flinchWeight) || 0, 0, 1);
    const weaponId = build && build.weaponId ? build.weaponId : 'rifle';

    const baseGunSpread = build
      ? (isChrono || weaponId === 'awp' ? (build.adsSpread || 0.003) : ((build.adsSpread || 0.004) * 1.15))
      : 0.005;

    // Stationary or very slow target (< 1.5 u/s): tight accuracy so standing still is genuinely punished
    const effectivePerp = perp < 1.5 ? 0 : (perp - 1.0);
    const trackingSlip = effectivePerp * sk.movingSlipPerSpeed * (isChrono ? 0.68 : 1.0);
    // Chrono stabilizes mid-air shots; unstabilized mid-air adds realistic bloom
    const airPenalty = botAirborne && !isChrono ? (weaponId === 'awp' ? 0.045 : 0.022) : 0;
    // Bot self-movement, consecutive burst recoil, and incoming-hit aim punch
    const botMoveBloom = !isChrono && botHorizSpeed > 4.5
      ? Math.min(0.015, (botHorizSpeed - 4.5) * 0.0014) * (effectivePerp === 0 ? 0.35 : 1.0)
      : 0;
    const recoilBloom = burstShotIdx * (weaponId === 'smg' ? 0.0042 : 0.0062);
    const flinchBloom = flinchWeight * 0.022;

    const totalSpread = Math.max(
      0.0015,
      baseGunSpread +
        (effectivePerp === 0 ? sk.stationarySpread * 0.5 : trackingSlip) +
        airPenalty +
        botMoveBloom +
        recoilBloom +
        flinchBloom
    );

    // Human-fair headshot frequency: rises modestly against stationary or Chrono-hanging targets
    let hsProb = sk.hsChance;
    if (perp < 1.5) hsProb += 0.08;
    if (targetInChrono) hsProb += 0.10;
    if (isChrono) hsProb += 0.04;
    if (weaponId === 'awp') hsProb += 0.03;
    if (weaponId === 'shotgun') hsProb *= 0.40; // shotguns aim upper chest for max pellet count
    if (dist > 45) hsProb *= 0.80;
    hsProb = clamp(hsProb, 0.04, 0.34);

    return {
      totalSpread,
      hsProb,
      maxFireAngle: clamp(0.08 + totalSpread * 2.2 + (weaponId === 'shotgun' ? 0.08 : 0), 0.06, 0.24)
    };
  }

  // Kept backward-compatible with tests/combat.test.js
  function chooseBotMovementIntent(distance, preferredRange, lowAmmo, roll) {
    if (lowAmmo) return 'reload';
    if (distance > preferredRange + 8.5) return 'advance';
    if (distance < Math.max(4.5, preferredRange - 8.5)) return 'disengage';
    if (roll < 0.14) return 'hold';
    if (roll < 0.56) return 'strafe';
    if (roll < 0.86) return 'reposition';
    return 'advance';
  }

  // ---------- Pure 3-Sphere Capsule OBB Collision Solver (Zero Allocations) ----------
  // Works with both THREE.Vector3/Matrix4/Quaternion and duck-typed math objects in Node tests.
  const _colLp = { x: 0, y: 0, z: 0 };
  const _colC = { x: 0, y: 0, z: 0 };
  const _colD = { x: 0, y: 0, z: 0 };
  const _colN = { x: 0, y: 0, z: 0 };

  function applyMat4ToPoint(out, p, m) {
    const e = m.elements;
    const x = p.x, y = p.y, z = p.z;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    out.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    out.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    out.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
  }

  function applyQuatToVec(v, q) {
    const x = v.x, y = v.y, z = v.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    v.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    v.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    v.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  }

  function boxDistanceToPointSq(box, c) {
    let dx = 0, dy = 0, dz = 0;
    if (c.x < box.min.x) dx = box.min.x - c.x;
    else if (c.x > box.max.x) dx = c.x - box.max.x;
    if (c.y < box.min.y) dy = box.min.y - c.y;
    else if (c.y > box.max.y) dy = c.y - box.max.y;
    if (c.z < box.min.z) dz = box.min.z - c.z;
    else if (c.z > box.max.z) dz = c.z - box.max.z;
    return dx * dx + dy * dy + dz * dz;
  }

  function classifySurfaceFallback(ny, cfg, isSurf) {
    const groundMin = (cfg && cfg.groundMin) || 0.72;
    const surfMin = (cfg && cfg.surfMin) || 0.25;
    if (ny >= groundMin) return 'ground';
    if (isSurf && ny >= surfMin) return 'surf';
    if (!isSurf && ny >= surfMin) return 'surf';
    if (ny > -0.25) return 'wall';
    return 'ceiling';
  }

  function pushBotSphere(pos, vel, cy, solids, cfg, contact) {
    const R = (cfg && cfg.radius) || 0.42;
    const skin = (cfg && cfg.skin) || 0.015;
    const T = R + skin;
    const T2 = T * T;
    const SE = root.SurfEngine;

    _colC.x = pos.x;
    _colC.y = pos.y + cy;
    _colC.z = pos.z;

    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (!s || !s.box || !s.inv || !s.half) continue;
      if (boxDistanceToPointSq(s.box, _colC) > T2) continue;

      applyMat4ToPoint(_colLp, _colC, s.inv);
      const cx = clamp(_colLp.x, -s.half.x, s.half.x);
      const cyL = clamp(_colLp.y, -s.half.y, s.half.y);
      const cz = clamp(_colLp.z, -s.half.z, s.half.z);
      _colD.x = _colLp.x - cx;
      _colD.y = _colLp.y - cyL;
      _colD.z = _colLp.z - cz;
      const d2 = _colD.x * _colD.x + _colD.y * _colD.y + _colD.z * _colD.z;
      if (d2 >= T2) continue;

      let pen;
      if (d2 > 1e-12) {
        const dist = Math.sqrt(d2);
        const invDist = 1 / dist;
        _colN.x = _colD.x * invDist;
        _colN.y = _colD.y * invDist;
        _colN.z = _colD.z * invDist;
        pen = R - dist;
      } else {
        const ox = s.half.x - Math.abs(_colLp.x);
        const oy = s.half.y - Math.abs(_colLp.y);
        const oz = s.half.z - Math.abs(_colLp.z);
        if (ox <= oy && ox <= oz) {
          _colN.x = _colLp.x >= 0 ? 1 : -1; _colN.y = 0; _colN.z = 0;
          pen = R + ox;
        } else if (oy <= oz) {
          _colN.x = 0; _colN.y = _colLp.y >= 0 ? 1 : -1; _colN.z = 0;
          pen = R + oy;
        } else {
          _colN.x = 0; _colN.y = 0; _colN.z = _colLp.z >= 0 ? 1 : -1;
          pen = R + oz;
        }
      }

      if (s.isSurf && s.surfNormal && SE && typeof SE.resolveSurfLocalNormal === 'function') {
        const res = SE.resolveSurfLocalNormal(_colLp, _colN, s.half, R, true);
        if (res && res.useAnalytical) {
          _colN.x = s.surfNormal.x;
          _colN.y = s.surfNormal.y;
          _colN.z = s.surfNormal.z;
          pen = R - (_colLp.y - s.half.y);
        } else if (s.q) {
          applyQuatToVec(_colN, s.q);
        }
      } else if (s.q) {
        applyQuatToVec(_colN, s.q);
      }

      if (pen > 0) {
        pos.x += _colN.x * pen;
        pos.y += _colN.y * pen;
        pos.z += _colN.z * pen;
        _colC.x += _colN.x * pen;
        _colC.y += _colN.y * pen;
        _colC.z += _colN.z * pen;
        const into = vel.x * _colN.x + vel.y * _colN.y + vel.z * _colN.z;
        if (into < 0) {
          vel.x -= _colN.x * into;
          vel.y -= _colN.y * into;
          vel.z -= _colN.z * into;
        }
      }

      const kind = (SE && typeof SE.classifySurfaceNormal === 'function')
        ? SE.classifySurfaceNormal(_colN.y, cfg || {}, s.isSurf)
        : classifySurfaceFallback(_colN.y, cfg, s.isSurf);

      if (kind === 'ground') {
        contact.ground = true;
        contact.gn.x = _colN.x; contact.gn.y = _colN.y; contact.gn.z = _colN.z;
      } else if (kind === 'surf') {
        contact.surf = true;
        contact.sn.x = _colN.x; contact.sn.y = _colN.y; contact.sn.z = _colN.z;
      } else if (kind === 'wall') {
        const wl = Math.hypot(_colN.x, _colN.z);
        if (wl > 0.001) {
          contact.wall = true;
          contact.wn.x = _colN.x / wl;
          contact.wn.y = 0;
          contact.wn.z = _colN.z / wl;
        }
      }
    }
  }

  function resolveBotCapsuleCollision(pos, vel, solids, cfg, low, outContact) {
    const contact = outContact || {
      ground: false, wall: false, surf: false,
      gn: { x: 0, y: 1, z: 0 },
      sn: { x: 0, y: 1, z: 0 },
      wn: { x: 0, y: 0, z: 0 }
    };
    contact.ground = false;
    contact.wall = false;
    contact.surf = false;
    if (!Array.isArray(solids) || solids.length === 0) return contact;

    const hs = low ? H_LOW : H_STAND;
    for (let iter = 0; iter < 3; iter++) {
      for (let h = 0; h < hs.length; h++) {
        pushBotSphere(pos, vel, hs[h], solids, cfg, contact);
      }
    }
    return contact;
  }

  function isBotHeadBlocked(pos, solids, cfg) {
    if (!Array.isArray(solids) || solids.length === 0) return false;
    const R = (cfg && cfg.radius) || 0.42;
    const R2 = (R - 0.01) * (R - 0.01);
    _colC.x = pos.x;
    _colC.y = pos.y + H_STAND[2];
    _colC.z = pos.z;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (!s || !s.box || !s.inv || !s.half) continue;
      if (boxDistanceToPointSq(s.box, _colC) > R * R) continue;
      applyMat4ToPoint(_colLp, _colC, s.inv);
      const dx = _colLp.x - clamp(_colLp.x, -s.half.x, s.half.x);
      const dy = _colLp.y - clamp(_colLp.y, -s.half.y, s.half.y);
      const dz = _colLp.z - clamp(_colLp.z, -s.half.z, s.half.z);
      if (dx * dx + dy * dy + dz * dz < R2) return true;
    }
    return false;
  }

  // ---------- Scratch THREE Vectors & Raycasters (Zero Per-Frame Allocations) ----------
  const hasTHREE = typeof root.THREE !== 'undefined';
  const V3 = hasTHREE ? () => new root.THREE.Vector3() : () => ({ x: 0, y: 0, z: 0 });
  const _raySight = hasTHREE ? new root.THREE.Raycaster() : null;
  const _rayNav = hasTHREE ? new root.THREE.Raycaster() : null;
  const _rayShot = hasTHREE ? new root.THREE.Raycaster() : null;
  const _rayGrapple = hasTHREE ? new root.THREE.Raycaster() : null;
  const _vOrigin = V3();
  const _vDir = V3();
  const _vRight = V3();
  const _vUp = V3();
  const _vWorldUp = hasTHREE ? new root.THREE.Vector3(0, 1, 0) : { x: 0, y: 1, z: 0 };
  const _vMove = V3();
  const _vToTarget = V3();
  const _vLeadPos = V3();
  const _vAimDesired = V3();
  const _vCand = V3();
  const _vBestDir = V3();
  const _vShotDir = V3();
  const _vEndPt = V3();
  const _vTmpA = V3();
  const _vTmpB = V3();
  const _vDown = hasTHREE ? new root.THREE.Vector3(0, -1, 0) : { x: 0, y: -1, z: 0 };

  function getArchetype(index) {
    const idx = Math.abs(Math.floor(Number(index) || 0)) % BOT_ARCHETYPES.length;
    return BOT_ARCHETYPES[idx];
  }

  // ---------- Bot State Factory & Reset ----------
  function createBotState(opts) {
    const o = opts || {};
    const profile = o.profile || getArchetype(o.profileIndex || 0);
    const primaryBuild = resolveBotWeaponBuild(profile.weapon, profile.attachments);
    const secondaryBuild = profile.secondaryWeapon
      ? resolveBotWeaponBuild(profile.secondaryWeapon, profile.secondaryAttachments)
      : null;

    const sx = o.pos ? o.pos.x : 0;
    const sy = o.pos ? o.pos.y : 0;
    const sz = o.pos ? o.pos.z : 0;
    const yaw = Number(o.yaw) || 0;

    return {
      index: typeof o.index === 'number' ? o.index : 0,
      uid: o.uid || `bot_${o.index || 0}`,
      name: o.name || profile.name,
      profile,
      primaryBuild,
      secondaryBuild,
      activeWeaponSlot: 'primary',
      visual: o.visual || null,
      hp: Number.isFinite(o.hp) ? o.hp : 100,
      alive: o.alive !== false,
      respawnTimer: 0,

      // True 3D physics state
      pos: hasTHREE ? new root.THREE.Vector3(sx, sy, sz) : { x: sx, y: sy, z: sz },
      vel: hasTHREE ? new root.THREE.Vector3() : { x: 0, y: 0, z: 0 },
      yaw,
      pitch: 0,
      grounded: false,
      low: false,
      sliding: false,
      surfing: false,
      wallrun: false,
      wallN: hasTHREE ? new root.THREE.Vector3() : { x: 0, y: 0, z: 0 },
      wallRunTime: 0,
      wallRunCd: 0,
      jumpCd: 0,
      slideCd: 0,
      burstCd: 0.6 + (o.index || 0) * 0.25,
      grappleCd: 1.0 + (o.index || 0) * 0.35,
      grapplePoint: null,
      grappleTimer: 0,
      padCd: 0,
      tpCd: 0,
      justLaunched: 0,
      contact: {
        ground: false, wall: false, surf: false,
        gn: { x: 0, y: 1, z: 0 },
        sn: { x: 0, y: 1, z: 0 },
        wn: { x: 0, y: 0, z: 0 }
      },

      // Personal Apex Chrono Hangtime state
      chronoActive: false,
      chronoWeight: 0,
      chronoTimeScale: 1.0,
      chronoTier: 0,
      chronoHoldTimer: 0,
      chronoCooldown: 0.9 + (o.index || 0) * 0.3,

      // Tactical navigation & memory
      anchor: hasTHREE ? new root.THREE.Vector3(sx, sy, sz) : { x: sx, y: sy, z: sz },
      waypoint: hasTHREE ? new root.THREE.Vector3(sx, sy, sz) : { x: sx, y: sy, z: sz },
      coverPoint: null,
      coverTimer: 0,
      lastKnownTarget: hasTHREE ? new root.THREE.Vector3(sx, sy, sz) : { x: sx, y: sy, z: sz },
      hasLastKnown: false,
      lastKnownAge: 99,
      stuckTimer: 0,
      lastStuckCheckPos: hasTHREE ? new root.THREE.Vector3(sx, sy, sz) : { x: sx, y: sy, z: sz },
      decisionTimer: 0.4 + (o.index || 0) * 0.25,
      strafeSign: (o.index || 0) % 2 === 0 ? 1 : -1,
      strafeTimer: 0.75 + (o.index || 0) * 0.2,
      combatIntent: 'strafe',
      intentTimer: 0,
      searchAngle: (o.index || 0) * 1.57,

      // Aim, weapon & reaction state
      aimDir: hasTHREE
        ? new root.THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
        : { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) },
      aimSwayPhase: (o.index || 0) * 1.9 + Math.random() * 6.28,
      reactionTimer: 0.42,
      alertTimer: 0,
      tookDamageAt: 0,
      flinchTimer: 0,
      damageSourcePos: null,
      magazine: primaryBuild.magSize,
      secondaryMagazine: secondaryBuild ? secondaryBuild.magSize : 0,
      reloadTimer: 0,
      fireCooldown: 0.55 + (o.index || 0) * 0.14,
      burstRemaining: 0,
      burstShotIdx: 0,
      burstPause: 0,

      // Target velocity tracking
      trackedTargetUid: '',
      lastTargetPos: hasTHREE ? new root.THREE.Vector3() : { x: 0, y: 0, z: 0 },
      targetVel: hasTHREE ? new root.THREE.Vector3() : { x: 0, y: 0, z: 0 },
      targetSampleValid: false,
      targetUid: '',

      // Visual & netcode sync helpers
      strideClock: (o.index || 0) * 1.3,
      poseTimer: 0
    };
  }

  function resetBotState(bot, pos, yaw) {
    if (!bot) return;
    if (pos) {
      bot.pos.x = pos.x; bot.pos.y = pos.y; bot.pos.z = pos.z;
      bot.anchor.x = pos.x; bot.anchor.y = pos.y; bot.anchor.z = pos.z;
      bot.waypoint.x = pos.x; bot.waypoint.y = pos.y; bot.waypoint.z = pos.z;
      bot.lastStuckCheckPos.x = pos.x; bot.lastStuckCheckPos.y = pos.y; bot.lastStuckCheckPos.z = pos.z;
    }
    if (typeof yaw === 'number') bot.yaw = yaw;
    bot.pitch = 0;
    bot.vel.x = 0; bot.vel.y = 0; bot.vel.z = 0;
    bot.grounded = false;
    bot.low = false;
    bot.sliding = false;
    bot.surfing = false;
    bot.wallrun = false;
    bot.wallRunTime = 0;
    bot.wallRunCd = 0;
    bot.jumpCd = 0;
    bot.slideCd = 0;
    bot.burstCd = 0.7;
    bot.grappleCd = 1.0;
    bot.grapplePoint = null;
    bot.grappleTimer = 0;
    bot.padCd = 0;
    bot.tpCd = 0;
    bot.justLaunched = 0;
    bot.chronoActive = false;
    bot.chronoWeight = 0;
    bot.chronoTimeScale = 1.0;
    bot.chronoTier = 0;
    bot.chronoHoldTimer = 0;
    bot.chronoCooldown = 0.8;
    bot.coverPoint = null;
    bot.coverTimer = 0;
    bot.hasLastKnown = false;
    bot.lastKnownAge = 99;
    bot.stuckTimer = 0;
    bot.activeWeaponSlot = 'primary';
    bot.magazine = bot.primaryBuild.magSize;
    bot.secondaryMagazine = bot.secondaryBuild ? bot.secondaryBuild.magSize : 0;
    bot.reloadTimer = 0;
    bot.fireCooldown = 0.65;
    bot.burstRemaining = 0;
    bot.burstShotIdx = 0;
    bot.burstPause = 0;
    bot.reactionTimer = 0.42;
    bot.alertTimer = 0;
    bot.flinchTimer = 0;
    bot.damageSourcePos = null;
    bot.targetSampleValid = false;
    bot.targetVel.x = 0; bot.targetVel.y = 0; bot.targetVel.z = 0;
    bot.aimDir.x = -Math.sin(bot.yaw);
    bot.aimDir.y = 0;
    bot.aimDir.z = -Math.cos(bot.yaw);
    if (bot.visual && bot.visual.group) {
      bot.visual.group.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
      bot.visual.group.rotation.y = bot.yaw;
    }
  }

  function alertBotDamage(bot, attackerPos) {
    if (!bot || !bot.alive) return;
    bot.alertTimer = Math.max(bot.alertTimer, 5.2);
    bot.reactionTimer = Math.min(bot.reactionTimer, 0.22);
    bot.tookDamageAt = 0.9;
    bot.flinchTimer = 0.26;
    if (attackerPos) {
      if (!bot.damageSourcePos && hasTHREE) bot.damageSourcePos = new root.THREE.Vector3();
      if (bot.damageSourcePos) {
        bot.damageSourcePos.x = attackerPos.x;
        bot.damageSourcePos.y = attackerPos.y;
        bot.damageSourcePos.z = attackerPos.z;
      }
      bot.lastKnownTarget.x = attackerPos.x;
      bot.lastKnownTarget.y = attackerPos.y;
      bot.lastKnownTarget.z = attackerPos.z;
      bot.hasLastKnown = true;
      bot.lastKnownAge = 0;
    }
  }

  function getActiveBotBuild(bot) {
    if (bot.activeWeaponSlot === 'secondary' && bot.secondaryBuild) return bot.secondaryBuild;
    return bot.primaryBuild;
  }

  function getActiveBotAmmo(bot) {
    return bot.activeWeaponSlot === 'secondary' ? bot.secondaryMagazine : bot.magazine;
  }

  function setActiveBotAmmo(bot, val) {
    if (bot.activeWeaponSlot === 'secondary') bot.secondaryMagazine = val;
    else bot.magazine = val;
  }

  // ---------- Vision, Navigation & Grapple Ray Helpers ----------
  function hasLineOfSight(origin, targetPt, solidMeshes) {
    if (!_raySight || !solidMeshes || solidMeshes.length === 0) return true;
    _vDir.subVectors(targetPt, origin);
    const d = _vDir.length();
    if (d < 0.25) return true;
    _vDir.divideScalar(d);
    _raySight.set(origin, _vDir);
    _raySight.near = 0.08;
    _raySight.far = Math.max(0.08, d - 0.35);
    return _raySight.intersectObjects(solidMeshes, false).length === 0;
  }

  function probeClearance(origin, dir, maxDist, solidMeshes) {
    if (!_rayNav || !solidMeshes || solidMeshes.length === 0) return maxDist;
    _rayNav.set(origin, dir);
    _rayNav.near = 0.08;
    _rayNav.far = maxDist;
    const hits = _rayNav.intersectObjects(solidMeshes, false);
    return hits.length > 0 ? hits[0].distance : maxDist;
  }

  function probeFloorBelow(x, y, z, solidMeshes) {
    if (!_rayNav || !solidMeshes || solidMeshes.length === 0) return y;
    _vOrigin.set(x, y + 1.8, z);
    _rayNav.set(_vOrigin, _vDown);
    _rayNav.near = 0.05;
    _rayNav.far = 22.0;
    const hits = _rayNav.intersectObjects(solidMeshes, false);
    for (let i = 0; i < hits.length; i++) {
      const fy = hits[i].point.y;
      if (fy <= y + 1.2 && fy >= y - 18.0) return fy;
    }
    return null;
  }

  function findGrappleAnchor(bot, targetPos, solidMeshes, wantHighGround, retreating) {
    if (!_rayGrapple || !solidMeshes || solidMeshes.length === 0) return null;
    const eyeY = bot.pos.y + 1.45;
    _vOrigin.set(bot.pos.x, eyeY, bot.pos.z);

    let baseYaw = bot.yaw;
    if (targetPos) {
      const dx = targetPos.x - bot.pos.x;
      const dz = targetPos.z - bot.pos.z;
      baseYaw = Math.atan2(-dx, -dz);
      if (retreating) baseYaw += Math.PI;
    }

    // Candidate ray yaw offsets and upward pitch angles (search high ledges, flank pillars, ramps)
    const yawOffsets = retreating ? [0, 0.55, -0.55, 1.05, -1.05] : [0, 0.42, -0.42, 0.88, -0.88];
    const pitches = wantHighGround ? [0.46, 0.30, 0.62] : [0.28, 0.46];

    let bestPt = null;
    let bestScore = -Infinity;

    for (let yi = 0; yi < yawOffsets.length; yi++) {
      const yaw = baseYaw + yawOffsets[yi];
      for (let pi = 0; pi < pitches.length; pi++) {
        const pitch = pitches[pi];
        const cp = Math.cos(pitch);
        _vDir.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp).normalize();
        _rayGrapple.set(_vOrigin, _vDir);
        _rayGrapple.near = 6.5;
        _rayGrapple.far = 42.0;
        const hits = _rayGrapple.intersectObjects(solidMeshes, false);
        if (!hits.length) continue;

        const hit = hits[0];
        const pt = hit.point;
        const gainY = pt.y - bot.pos.y;
        if (gainY < 1.8 || gainY > 22) continue;

        // Avoid grappling directly into an unreachable flat ceiling right overhead
        const horizDist = Math.hypot(pt.x - bot.pos.x, pt.z - bot.pos.z);
        if (horizDist < 4.5) continue;

        let score = gainY * 1.1 + Math.min(horizDist, 26) * 0.45 - Math.abs(yawOffsets[yi]) * 2.2;
        if (targetPos && !retreating) {
          const dNow = Math.hypot(targetPos.x - bot.pos.x, targetPos.z - bot.pos.z);
          const dAfter = Math.hypot(targetPos.x - pt.x, targetPos.z - pt.z);
          score += (dNow - dAfter) * (wantHighGround ? 0.15 : 0.42);
        }
        if (score > bestScore) {
          bestScore = score;
          bestPt = pt;
        }
      }
    }

    return bestPt ? bestPt.clone() : null;
  }

  function findNearbyCover(bot, threatPos, solidMeshes) {
    if (!_rayNav || !threatPos || !solidMeshes || solidMeshes.length === 0) return null;
    const baseYaw = Math.atan2(-(bot.pos.x - threatPos.x), -(bot.pos.z - threatPos.z));
    _vTmpA.set(threatPos.x, threatPos.y + 1.45, threatPos.z);

    let bestPoint = null;
    let bestScore = -Infinity;

    for (let i = 0; i < COVER_PROBE_ANGLES.length; i++) {
      const ang = baseYaw + COVER_PROBE_ANGLES[i];
      _vCand.set(-Math.sin(ang), 0, -Math.cos(ang));
      _vOrigin.set(bot.pos.x, bot.pos.y + 0.9, bot.pos.z);
      const clear = probeClearance(_vOrigin, _vCand, 11.5, solidMeshes);
      if (clear < 2.2) continue;
      const step = Math.min(clear - 0.85, 8.5);
      const cx = bot.pos.x + _vCand.x * step;
      const cz = bot.pos.z + _vCand.z * step;
      const fy = probeFloorBelow(cx, bot.pos.y, cz, solidMeshes);
      if (fy === null || fy < bot.pos.y - 6.0) continue;

      _vTmpB.set(cx, fy + 1.35, cz);
      const blocked = !hasLineOfSight(_vTmpB, _vTmpA, solidMeshes);
      if (!blocked) continue;

      const distThreat = Math.hypot(cx - threatPos.x, cz - threatPos.z);
      const score = 12 + distThreat * 0.35 - Math.abs(step - 5.5) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestPoint = hasTHREE ? new root.THREE.Vector3(cx, fy, cz) : { x: cx, y: fy, z: cz };
      }
    }
    return bestPoint;
  }

  function steerAroundObstacles(bot, desiredDir, solidMeshes) {
    const len = Math.hypot(desiredDir.x, desiredDir.z);
    if (len < 0.001 || !_rayNav || !solidMeshes || solidMeshes.length === 0) return;
    desiredDir.x /= len;
    desiredDir.z /= len;

    _vOrigin.set(bot.pos.x, bot.pos.y + 0.88, bot.pos.z);
    const aheadClear = probeClearance(_vOrigin, desiredDir, 2.4, solidMeshes);
    if (aheadClear > 1.75) {
      // Also check we aren't running straight off a lethal void
      const fy = probeFloorBelow(bot.pos.x + desiredDir.x * 1.9, bot.pos.y, bot.pos.z + desiredDir.z * 1.9, solidMeshes);
      if (fy !== null) return;
    }

    const bx = desiredDir.x, bz = desiredDir.z;
    let bestScore = -Infinity;
    _vBestDir.set(0, 0, 0);

    for (let i = 0; i < STEER_ANGLES.length; i++) {
      const a = STEER_ANGLES[i];
      const c = Math.cos(a), s = Math.sin(a);
      _vCand.set(bx * c - bz * s, 0, bx * s + bz * c).normalize();
      const cl = probeClearance(_vOrigin, _vCand, 3.0, solidMeshes);
      if (cl < 0.75) continue;
      const probeDist = Math.min(2.1, cl - 0.25);
      const fy = probeFloorBelow(bot.pos.x + _vCand.x * probeDist, bot.pos.y, bot.pos.z + _vCand.z * probeDist, solidMeshes);
      if (fy === null) continue;
      const align = _vCand.x * bx + _vCand.z * bz;
      const score = Math.min(cl, 3.0) * 0.75 + align * 1.25 - (fy < bot.pos.y - 5.5 ? 0.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        _vBestDir.copy(_vCand);
      }
    }

    if (bestScore > -Infinity) {
      desiredDir.x = _vBestDir.x;
      desiredDir.z = _vBestDir.z;
    }
  }

  // ---------- Bot Movement Physics Step (Player-Equivalent) ----------
  function accelerateBot(vel, wishX, wishZ, wishSpeed, accel, dt) {
    const cur = vel.x * wishX + vel.z * wishZ;
    const add = wishSpeed - cur;
    if (add <= 0) return;
    const acc = Math.min(accel * dt * wishSpeed, add);
    vel.x += wishX * acc;
    vel.z += wishZ * acc;
  }

  function applyGroundFriction(vel, friction, dt) {
    const sp = Math.hypot(vel.x, vel.z);
    if (sp < 0.05) { vel.x = 0; vel.z = 0; return; }
    const drop = Math.max(sp, 2.5) * friction * dt;
    const next = Math.max(0, sp - drop) / sp;
    vel.x *= next;
    vel.z *= next;
  }

  function stepBotPhysics(bot, moveDt, wishDir, wantsJump, wantsSlide, ctx) {
    const cfg = (ctx && ctx.config) || {
      grav: 24, jumpVel: 8.7, groundSpeed: 9.8, groundAccel: 7.5, groundFriction: 6.0,
      airAccel: 18, airWishCap: 2.6, slideFriction: 1.15, slideBoost: 4.4,
      wallGrav: 3.2, wallMaxTime: 2.2, wallKickOut: 7.6, wallKickUp: 8.2,
      grapplePull: 28, grappleMax: 24, radius: 0.42, skin: 0.015, groundMin: 0.72, surfMin: 0.25
    };
    const solids = (ctx && ctx.solids) || [];
    const vel = bot.vel;
    const pos = bot.pos;

    // Cooldowns tick in real/personal physics dt
    if (bot.wallRunCd > 0) bot.wallRunCd = Math.max(0, bot.wallRunCd - moveDt);
    if (bot.jumpCd > 0) bot.jumpCd = Math.max(0, bot.jumpCd - moveDt);
    if (bot.slideCd > 0) bot.slideCd = Math.max(0, bot.slideCd - moveDt);
    if (bot.padCd > 0) bot.padCd = Math.max(0, bot.padCd - moveDt);
    if (bot.tpCd > 0) bot.tpCd = Math.max(0, bot.tpCd - moveDt);
    if (bot.justLaunched > 0) bot.justLaunched = Math.max(0, bot.justLaunched - moveDt);

    // Slide entry & exit
    const horizSpeed = Math.hypot(vel.x, vel.z);
    if (wantsSlide && bot.grounded && !bot.low && horizSpeed > 7.4 && bot.slideCd <= 0) {
      bot.low = true;
      bot.sliding = true;
      bot.slideCd = 1.05;
      const sx = horizSpeed > 0.1 ? vel.x / horizSpeed : wishDir.x;
      const sz = horizSpeed > 0.1 ? vel.z / horizSpeed : wishDir.z;
      vel.x += sx * (cfg.slideBoost || 5.5) * 0.85;
      vel.z += sz * (cfg.slideBoost || 5.5) * 0.85;
    } else if (!wantsSlide && bot.low && !isBotHeadBlocked(pos, solids, cfg)) {
      bot.low = false;
      bot.sliding = false;
    }
    if (bot.sliding && (!bot.grounded || Math.hypot(vel.x, vel.z) < 4.5)) {
      bot.sliding = false;
      if (!isBotHeadBlocked(pos, solids, cfg)) bot.low = false;
    }

    // Grapple pull physics
    if (bot.grapplePoint) {
      bot.grappleTimer -= moveDt;
      const gx = bot.grapplePoint.x - pos.x;
      const gy = bot.grapplePoint.y - (pos.y + 1.3);
      const gz = bot.grapplePoint.z - pos.z;
      const gDist = Math.hypot(gx, gy, gz);
      if (gDist < 4.6 || bot.grappleTimer <= 0) {
        // Release grapple with clean upward pop into air / Chrono
        bot.grapplePoint = null;
        vel.y = Math.max(vel.y, 6.2);
        bot.justLaunched = 1.2;
      } else {
        const pull = (cfg.grapplePull || 28) * moveDt;
        vel.x += (gx / gDist) * pull;
        vel.y += (gy / gDist) * pull + 7.5 * moveDt;
        vel.z += (gz / gDist) * pull;
        const maxG = cfg.grappleMax || 24;
        const sp3 = Math.hypot(vel.x, vel.y, vel.z);
        if (sp3 > maxG) {
          const k = maxG / sp3;
          vel.x *= k; vel.y *= k; vel.z *= k;
        }
        bot.grounded = false;
        bot.wallrun = false;
      }
    }

    // Wall-run maintenance & wall-jump
    if (bot.wallrun) {
      bot.wallRunTime += moveDt;
      const hs = Math.hypot(vel.x, vel.z);
      if (bot.grounded || !bot.contact.wall || hs < 4.2 || bot.wallRunTime > (cfg.wallMaxTime || 2.2) * 0.72) {
        // Wall-jump cleanly off the wall!
        if (!bot.grounded && bot.contact.wall) {
          vel.x += bot.wallN.x * (cfg.wallKickOut || 9.2);
          vel.z += bot.wallN.z * (cfg.wallKickOut || 9.2);
          vel.y = Math.max(vel.y, cfg.wallKickUp || 8.4);
          bot.justLaunched = 1.05;
        }
        bot.wallrun = false;
        bot.wallRunTime = 0;
        bot.wallRunCd = 0.75;
      } else {
        // Run parallel to wall with reduced gravity
        vel.y = Math.max(vel.y - (cfg.wallGrav || 3.2) * moveDt, -1.8);
        const dot = vel.x * bot.wallN.x + vel.z * bot.wallN.z;
        vel.x -= bot.wallN.x * dot;
        vel.z -= bot.wallN.z * dot;
        // Maintain strong forward wall-run speed
        const wLen = Math.hypot(vel.x, vel.z);
        if (wLen > 0.2 && wLen < 12.5) {
          const boost = (12.5 - wLen) * Math.min(1, moveDt * 5);
          vel.x += (vel.x / wLen) * boost;
          vel.z += (vel.z / wLen) * boost;
        }
      }
    }

    // Ground vs. Surf vs. Air movement
    const wishLen = Math.hypot(wishDir.x, wishDir.z);
    const wx = wishLen > 0.001 ? wishDir.x / wishLen : 0;
    const wz = wishLen > 0.001 ? wishDir.z / wishLen : 0;
    const baseSpeed = (cfg.groundSpeed || 10.6) * (bot.activeWeaponSlot === 'primary' && bot.primaryBuild.weaponId === 'awp' ? 0.90 : 1.0);

    if (bot.grounded && !bot.grapplePoint) {
      if (wantsJump && bot.jumpCd <= 0) {
        vel.y = cfg.jumpVel || 8.7;
        bot.grounded = false;
        bot.sliding = false;
        if (!isBotHeadBlocked(pos, solids, cfg)) bot.low = false;
        bot.jumpCd = 0.28;
      } else {
        applyGroundFriction(vel, bot.sliding ? (cfg.slideFriction || 1.15) : (cfg.groundFriction || 6.2), moveDt);
        if (!bot.sliding && wishLen > 0.01) {
          accelerateBot(vel, wx, wz, baseSpeed, cfg.groundAccel || 11, moveDt);
        }
      }
    } else if (!bot.wallrun) {
      // Airborne or surfing: apply gravity + Source-style air-strafe acceleration
      vel.y -= (cfg.grav || 24) * moveDt;
      if (wishLen > 0.01) {
        if (bot.surfing) {
          // Surf tangent acceleration along ramp face
          const sn = bot.contact.sn;
          const dot = wx * sn.x + wz * sn.z;
          let tx = wx - sn.x * dot;
          let tz = wz - sn.z * dot;
          const tl = Math.hypot(tx, tz);
          if (tl > 0.05) {
            tx /= tl; tz /= tl;
            accelerateBot(vel, tx, tz, baseSpeed * 1.45, (cfg.airAccel || 26) * 0.75, moveDt);
          }
        } else {
          accelerateBot(vel, wx, wz, Math.max(cfg.airWishCap || 3.1, baseSpeed * 0.52), (cfg.airAccel || 26) * 0.65, moveDt);
        }
      }
    }

    // Integrate position in sub-steps if fast so bots never tunnel through thin walls
    const speed3 = Math.hypot(vel.x, vel.y, vel.z);
    const steps = speed3 * moveDt > 0.34 ? 2 : 1;
    const subDt = moveDt / steps;
    for (let s = 0; s < steps; s++) {
      pos.x += vel.x * subDt;
      pos.y += vel.y * subDt;
      pos.z += vel.z * subDt;
      resolveBotCapsuleCollision(pos, vel, solids, cfg, bot.low, bot.contact);
    }

    bot.grounded = bot.contact.ground;
    bot.surfing = !bot.contact.ground && bot.contact.surf;
    if (bot.grounded && vel.y < 0) vel.y = 0;

    // Attach to wall-run if airborne against vertical wall at decent speed
    if (!bot.grounded && !bot.surfing && !bot.wallrun && !bot.grapplePoint &&
        bot.contact.wall && bot.wallRunCd <= 0 && Math.hypot(vel.x, vel.z) > 6.0 &&
        bot.profile.wallRunBias > 0.4) {
      bot.wallrun = true;
      bot.wallRunTime = 0;
      bot.wallN.x = bot.contact.wn.x;
      bot.wallN.y = 0;
      bot.wallN.z = bot.contact.wn.z;
      vel.y = Math.max(vel.y, 2.2);
    }

    // Arena Launch Pads, Launch Vents, Boost Rings, and Teleporters
    const pads = ctx && ctx.pads;
    if (Array.isArray(pads) && bot.padCd <= 0) {
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        const src = pad.position || pad.pos || pad;
        const ud = pad.userData || {};
        const px = src.x || 0;
        const py = src.y || 0;
        const pz = src.z || 0;
        const pr = ud.padRadius || pad.r || pad.radius || 2.5;
        if (Math.hypot(pos.x - px, pos.z - pz) <= pr && Math.abs(pos.y - py) < 2.2) {
          vel.y = Math.max(vel.y, ud.padUp || pad.vy || 18.5);
          if (ud.padDir && ud.padHoriz) {
            vel.x += ud.padDir.x * ud.padHoriz;
            vel.z += ud.padDir.z * ud.padHoriz;
          } else if (pad.dir) {
            vel.x += pad.dir.x * (pad.vx || 10);
            vel.z += pad.dir.z * (pad.vz || 10);
          }
          bot.grounded = false;
          bot.padCd = 0.65;
          bot.justLaunched = 1.35;
          break;
        }
      }
    }

    const boosters = ctx && ctx.boosters;
    if (Array.isArray(boosters) && bot.padCd <= 0) {
      for (let i = 0; i < boosters.length; i++) {
        const b = boosters[i];
        const bx = b.pos ? b.pos.x : b.x;
        const by = b.pos ? b.pos.y : b.y;
        const bz = b.pos ? b.pos.z : b.z;
        const br = b.r || b.radius || 3.4;
        if (Math.hypot(pos.x - bx, pos.y + 1.0 - by, pos.z - bz) <= br) {
          const boost = b.boost || b.speedBoost || 18;
          if (b.dir) {
            vel.x += b.dir.x * boost;
            vel.y += b.dir.y * boost * 0.55;
            vel.z += b.dir.z * boost;
          }
          bot.padCd = 0.7;
          bot.justLaunched = 1.25;
          break;
        }
      }
    }

    const teleporters = ctx && ctx.teleporters;
    if (Array.isArray(teleporters) && bot.tpCd <= 0) {
      for (let i = 0; i < teleporters.length; i++) {
        const tp = teleporters[i];
        if (!tp || !tp.pos || !tp.dest) continue;
        const tr = tp.r || 2.4;
        if (Math.hypot(pos.x - tp.pos.x, pos.y + 1.0 - tp.pos.y, pos.z - tp.pos.z) <= tr) {
          pos.x = tp.dest.x; pos.y = tp.dest.y; pos.z = tp.dest.z;
          vel.y = Math.max(0, vel.y * 0.5);
          bot.grapplePoint = null;
          bot.tpCd = tp.cooldown || 1.25;
          break;
        }
      }
    }

    // Safety recovery if bot falls below the map void
    const voidLimit = (ctx && typeof ctx.killY === 'number') ? ctx.killY : -22;
    if (pos.y < voidLimit) {
      pos.x = bot.anchor.x;
      pos.y = bot.anchor.y + 0.5;
      pos.z = bot.anchor.z;
      vel.x = 0; vel.y = 0; vel.z = 0;
      bot.grapplePoint = null;
      bot.wallrun = false;
    }
  }

  // ---------- Lethal Real-Weapon Firing ----------
  function fireBotWeapon(bot, build, skill, targetInfo, targetPerpSpeed, dist, solidMeshes, callbacks) {
    const ammo = getActiveBotAmmo(bot);
    if (ammo <= 0 || bot.reloadTimer > 0) return false;

    setActiveBotAmmo(bot, ammo - 1);
    const skillT = clamp((skill.scalar - 0.72) / (1.35 - 0.72), 0, 1);
    const cooldownMult = build.weaponId === 'awp'
      ? (1.32 + (1 - skillT) * 0.35)
      : (build.weaponId === 'shotgun' ? (1.18 + (1 - skillT) * 0.25) : skill.burstTempoMult);
    bot.fireCooldown = build.fireInterval * cooldownMult;

    const eyeY = bot.low ? 1.05 : 1.52;
    _vOrigin.set(bot.pos.x, bot.pos.y + eyeY, bot.pos.z);

    const botHorizSpeed = Math.hypot(bot.vel.x, bot.vel.z);
    const shotParams = computeBotShotParams(build, skill, targetPerpSpeed, dist, {
      botChrono: bot.chronoActive,
      targetChrono: Boolean(targetInfo.chronoTier > 0),
      botAirborne: !bot.grounded,
      botHorizSpeed,
      burstShotIdx: bot.burstShotIdx || 0,
      flinchWeight: clamp((bot.flinchTimer || 0) / 0.26, 0, 1)
    });

    const wantHead = Math.random() < shotParams.hsProb;
    const targetFootY = targetInfo.position.y;
    const targetHeadY = targetFootY + Math.min(1.62, (targetInfo.eye || 1.6) - 0.02);
    const targetBodyY = targetFootY + Math.min(1.06, (targetInfo.eye || 1.6) * 0.64);
    const trackedAimY = targetFootY + Math.min(1.38, (targetInfo.eye || 1.6) * 0.82);
    const aimY = wantHead ? targetHeadY : targetBodyY;

    const pellets = Math.max(1, build.pellets || 1);
    const LS = root.LoadoutsSystem;
    let totalDamage = 0;
    let landedHeadshot = false;
    let anyHit = false;
    let firstEndPt = null;

    // Preserve natural 3D vertical tracking lag from bot.aimDir (only apply the small head-vs-chest offset)
    _vTmpA.copy(bot.aimDir);
    _vTmpA.y += (aimY - trackedAimY) / Math.max(2.5, dist);
    _vTmpA.normalize();

    _vRight.crossVectors(_vTmpA, _vWorldUp);
    if (_vRight.lengthSq() < 0.001) _vRight.set(1, 0, 0);
    else _vRight.normalize();
    _vUp.crossVectors(_vRight, _vTmpA).normalize();

    const maxRange = build.range || 120;

    for (let p = 0; p < pellets; p++) {
      _vShotDir.copy(_vTmpA);
      const cone = shotParams.totalSpread + (pellets > 1 ? (build.pelletSpread || 0.036) : 0);
      if (cone > 0.0001) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * cone;
        _vShotDir
          .addScaledVector(_vRight, Math.cos(ang) * rad)
          .addScaledVector(_vUp, Math.sin(ang) * rad)
          .normalize();
      }

      // Check solid world occlusion
      let worldDist = maxRange;
      if (_rayShot && solidMeshes && solidMeshes.length > 0) {
        _rayShot.set(_vOrigin, _vShotDir);
        _rayShot.near = 0.08;
        _rayShot.far = maxRange;
        const wh = _rayShot.intersectObjects(solidMeshes, false);
        if (wh.length > 0) worldDist = wh[0].distance;
      }

      // Ray-sphere test against realistic player head (radius 0.18m) and torso (radius 0.35m)
      let hitThisPellet = false;
      let pelletHead = false;
      let hitDist = worldDist;

      // Test Head
      _vTmpB.set(targetInfo.position.x - _vOrigin.x, targetHeadY - _vOrigin.y, targetInfo.position.z - _vOrigin.z);
      const projH = _vTmpB.dot(_vShotDir);
      if (projH > 0.1 && projH <= worldDist + 0.2) {
        const perpSqH = _vTmpB.lengthSq() - projH * projH;
        if (perpSqH <= 0.18 * 0.18) {
          hitThisPellet = true;
          pelletHead = true;
          hitDist = projH;
        }
      }

      // Test Torso if head missed
      if (!hitThisPellet) {
        _vTmpB.set(targetInfo.position.x - _vOrigin.x, targetBodyY - _vOrigin.y, targetInfo.position.z - _vOrigin.z);
        const projB = _vTmpB.dot(_vShotDir);
        if (projB > 0.1 && projB <= worldDist + 0.2) {
          const perpSqB = _vTmpB.lengthSq() - projB * projB;
          if (perpSqB <= 0.35 * 0.35) {
            hitThisPellet = true;
            hitDist = projB;
          }
        }
      }

      _vEndPt.copy(_vOrigin).addScaledVector(_vShotDir, Math.min(hitDist, worldDist));
      if (p === 0) firstEndPt = _vEndPt.clone();

      if (callbacks && typeof callbacks.spawnTracer === 'function' && (pellets === 1 || p < 4)) {
        const col = bot.chronoActive
          ? (bot.chronoTier >= 2 ? 0xffbe4d : 0x5ef0ff)
          : (build.tracerColor || 0xff7b63);
        callbacks.spawnTracer(_vOrigin, _vEndPt, col);
      }

      if (hitThisPellet) {
        anyHit = true;
        if (pelletHead) landedHeadshot = true;
        const dmg = LS && typeof LS.computeDistanceDamage === 'function'
          ? LS.computeDistanceDamage(build, hitDist, pelletHead, false)
          : (pelletHead ? build.damageHead : build.damageBody);
        totalDamage += dmg;
      } else if (callbacks && typeof callbacks.spawnBurst === 'function' && worldDist < maxRange && p < 2) {
        callbacks.spawnBurst(_vEndPt, 0xffe2a0, 3, 4.0);
      }
    }

    if (callbacks && typeof callbacks.onShot === 'function' && firstEndPt) {
      callbacks.onShot(bot, _vOrigin, firstEndPt, build.weaponId);
    }

    if (root.WeaponAudio && typeof root.WeaponAudio.fireWeapon === 'function') {
      root.WeaponAudio.fireWeapon(build.weaponId, { suppressed: Boolean(build.suppressed) });
    }

    if (anyHit && totalDamage > 0 && callbacks && typeof callbacks.onDamage === 'function') {
      callbacks.onDamage(Math.round(totalDamage), build.weaponId, landedHeadshot);
    }

    // Auto-reload when mag hits 0
    if (getActiveBotAmmo(bot) <= 0) {
      bot.reloadTimer = build.reloadSec || 1.7;
      bot.chronoActive = false;
      bot.chronoHoldTimer = 0;
    }

    return true;
  }

  // ---------- Main Per-Frame Bot Step ----------
  function stepBot(bot, dt, ctx) {
    if (!bot || !bot.alive) return;
    const clampedDt = clamp(Number(dt) || 0, 0, 0.05);
    if (clampedDt <= 0) return;

    const skill = getActiveSkill();
    const solidMeshes = (ctx && ctx.solidMeshes) || [];
    const target = ctx && ctx.target;
    const targetPos = target && target.position;
    const targetAlive = Boolean(target && target.alive && targetPos);
    const abilitiesAllowed = !ctx || ctx.abilitiesAllowed !== false;
    const aggressionBias = clamp(Number(ctx && ctx.aggressionBias) || 1, 0.82, 1.35);
    const callbacks = (ctx && ctx.callbacks) || {};

    // Timers (tick in world time so weapon fire rates & cooldowns match human Chrono rules!)
    if (bot.fireCooldown > 0) bot.fireCooldown = Math.max(0, bot.fireCooldown - clampedDt);
    if (bot.burstPause > 0) bot.burstPause = Math.max(0, bot.burstPause - clampedDt);
    if (bot.alertTimer > 0) bot.alertTimer = Math.max(0, bot.alertTimer - clampedDt);
    if (bot.tookDamageAt > 0) bot.tookDamageAt = Math.max(0, bot.tookDamageAt - clampedDt);
    if (bot.flinchTimer > 0) bot.flinchTimer = Math.max(0, bot.flinchTimer - clampedDt);
    if (bot.burstCd > 0) bot.burstCd = Math.max(0, bot.burstCd - clampedDt);
    if (bot.grappleCd > 0) bot.grappleCd = Math.max(0, bot.grappleCd - clampedDt);
    if (bot.chronoCooldown > 0) bot.chronoCooldown = Math.max(0, bot.chronoCooldown - clampedDt);
    if (bot.coverTimer > 0) bot.coverTimer = Math.max(0, bot.coverTimer - clampedDt);
    bot.lastKnownAge += clampedDt;

    if (bot.reloadTimer > 0) {
      bot.reloadTimer = Math.max(0, bot.reloadTimer - clampedDt);
      if (bot.reloadTimer === 0) {
        const b = getActiveBotBuild(bot);
        setActiveBotAmmo(bot, b.magSize);
      }
    }

    // 1. Target sensing & velocity estimation
    let canSee = false;
    let dist = Infinity;
    let horizDist = Infinity;
    let targetPerpSpeed = 0;

    if (targetAlive) {
      const dx = targetPos.x - bot.pos.x;
      const dy = targetPos.y - bot.pos.y;
      const dz = targetPos.z - bot.pos.z;
      horizDist = Math.hypot(dx, dz);
      dist = Math.hypot(dx, dy, dz);

      if (target.velocity) {
        bot.targetVel.x = target.velocity.x;
        bot.targetVel.y = target.velocity.y;
        bot.targetVel.z = target.velocity.z;
        bot.targetSampleValid = true;
      } else if (bot.targetSampleValid && bot.trackedTargetUid === target.uid && clampedDt > 0.0005) {
        const inv = 1 / clampedDt;
        const vx = clamp((targetPos.x - bot.lastTargetPos.x) * inv, -45, 45);
        const vy = clamp((targetPos.y - bot.lastTargetPos.y) * inv, -35, 35);
        const vz = clamp((targetPos.z - bot.lastTargetPos.z) * inv, -45, 45);
        const sm = Math.min(1, clampedDt * 12);
        bot.targetVel.x += (vx - bot.targetVel.x) * sm;
        bot.targetVel.y += (vy - bot.targetVel.y) * sm;
        bot.targetVel.z += (vz - bot.targetVel.z) * sm;
      } else {
        bot.targetVel.x = 0; bot.targetVel.y = 0; bot.targetVel.z = 0;
        bot.targetSampleValid = true;
      }
      bot.trackedTargetUid = target.uid || 'local';
      bot.lastTargetPos.x = targetPos.x;
      bot.lastTargetPos.y = targetPos.y;
      bot.lastTargetPos.z = targetPos.z;

      // Vision cone + raycast LOS (360-degree awareness when alerted or within close hearing range < 13m)
      if (dist <= bot.profile.sightRange) {
        const fx = -Math.sin(bot.yaw), fz = -Math.cos(bot.yaw);
        const dot = horizDist > 0.001 ? (dx * fx + dz * fz) / horizDist : 1;
        const inFov = dot >= -0.25 || bot.alertTimer > 0 || dist < 13.5 || Boolean(target.chronoTier > 0);
        if (inFov) {
          _vOrigin.set(bot.pos.x, bot.pos.y + (bot.low ? 1.05 : 1.52), bot.pos.z);
          _vTmpB.set(targetPos.x, targetPos.y + Math.min(1.42, (target.eye || 1.6) * 0.82), targetPos.z);
          canSee = hasLineOfSight(_vOrigin, _vTmpB, solidMeshes);
        }
      }

      if (canSee) {
        bot.lastKnownTarget.x = targetPos.x;
        bot.lastKnownTarget.y = targetPos.y;
        bot.lastKnownTarget.z = targetPos.z;
        bot.hasLastKnown = true;
        bot.lastKnownAge = 0;
        bot.alertTimer = Math.max(bot.alertTimer, 3.8);

        // Compute perpendicular speed relative to line-of-sight
        if (dist > 0.25) {
          const ux = dx / dist, uy = dy / dist, uz = dz / dist;
          const radial = bot.targetVel.x * ux + bot.targetVel.y * uy + bot.targetVel.z * uz;
          const px = bot.targetVel.x - ux * radial;
          const py = bot.targetVel.y - uy * radial;
          const pz = bot.targetVel.z - uz * radial;
          targetPerpSpeed = Math.hypot(px, py, pz);
        }
      } else if (bot.reactionTimer < skill.reactionSec) {
        bot.reactionTimer = Math.min(skill.reactionSec, bot.reactionTimer + clampedDt * 1.4);
      }
    }

    // 2. Smart Weapon Swap (Marksman AWP pulls Deagle inside 11.5m; Breacher pulls Deagle at > 25m)
    if (bot.secondaryBuild && bot.reloadTimer <= 0 && targetAlive) {
      if (bot.profile.weapon === 'awp') {
        if (bot.activeWeaponSlot === 'primary' && dist < (bot.profile.swapCloseRange || 11.5)) {
          bot.activeWeaponSlot = 'secondary';
          bot.fireCooldown = Math.max(bot.fireCooldown, 0.24);
        } else if (bot.activeWeaponSlot === 'secondary' && dist > (bot.profile.swapFarRange || 15.5)) {
          bot.activeWeaponSlot = 'primary';
          bot.fireCooldown = Math.max(bot.fireCooldown, 0.28);
        }
      } else if (bot.profile.weapon === 'shotgun') {
        if (bot.activeWeaponSlot === 'primary' && dist > (bot.profile.swapFarRange || 25)) {
          bot.activeWeaponSlot = 'secondary';
          bot.fireCooldown = Math.max(bot.fireCooldown, 0.24);
        } else if (bot.activeWeaponSlot === 'secondary' && dist < (bot.profile.swapCloseRange || 20)) {
          bot.activeWeaponSlot = 'primary';
          bot.fireCooldown = Math.max(bot.fireCooldown, 0.24);
        }
      }
    }
    const activeBuild = getActiveBotBuild(bot);

    // 3. Personal Apex Chrono Hangtime Decision (Mid-air shots, high-ground dives, & AWP peeks!)
    const CS = root.CombatSystem;
    const isAirborneHigh = !bot.grounded && (bot.vel.y > -16) && (bot.justLaunched > 0 || bot.wallrun || bot.grapplePoint || Math.abs(bot.vel.y) > 1.8);
    const isHighGroundDive = !bot.grounded && targetAlive && (bot.pos.y > targetPos.y + 1.8);
    const isAwpPeek = activeBuild.weaponId === 'awp' && canSee && dist > 14 && (bot.grounded || !bot.grounded);
    const wantChronoTrigger = Boolean(
      activeBuild.hasChronoKit &&
      canSee &&
      bot.reloadTimer <= 0 &&
      getActiveBotAmmo(bot) > 0 &&
      bot.hp > 28 &&
      bot.tookDamageAt <= 0.15 &&
      (isAirborneHigh || isHighGroundDive || isAwpPeek)
    );

    if (bot.chronoHoldTimer > 0) {
      bot.chronoHoldTimer -= clampedDt;
      if (!canSee || bot.reloadTimer > 0 || bot.hp <= 22 || bot.tookDamageAt > 0.55) {
        bot.chronoHoldTimer = 0;
      }
    } else if (wantChronoTrigger && bot.chronoCooldown <= 0) {
      if (Math.random() < skill.chronoAggression * aggressionBias * (isAwpPeek ? 0.55 : 0.85)) {
        bot.chronoHoldTimer = isAwpPeek ? (0.55 + Math.random() * 0.45) : (0.72 + Math.random() * 0.65);
        bot.chronoCooldown = (isAwpPeek ? 2.6 : 2.9) / Math.max(0.75, skill.abilityRate);
      } else {
        bot.chronoCooldown = 0.7;
      }
    }

    const chronoTarget = bot.chronoHoldTimer > 0 && activeBuild.hasChronoKit;
    if (CS && typeof CS.advanceChronoState === 'function') {
      bot.chronoWeight = CS.advanceChronoState(
        bot.chronoWeight,
        chronoTarget,
        clampedDt,
        activeBuild.chronoRampIn || 0.14,
        activeBuild.chronoRampOut || 0.14
      );
    } else {
      const rate = clampedDt / 0.14;
      bot.chronoWeight = clamp(bot.chronoWeight + (chronoTarget ? rate : -rate), 0, 1);
    }
    const targetScale = activeBuild.hasChronoKit ? (activeBuild.chronoTimeScale || 0.28) : 1.0;
    bot.chronoTimeScale = 1.0 + (targetScale - 1.0) * bot.chronoWeight;
    bot.chronoActive = bot.chronoWeight > 0.08;
    bot.chronoTier = bot.chronoActive ? (activeBuild.chronoTier || 1) : 0;

    // Personal slow-mo moveDt preserves 100% velocity vector on release!
    const moveDt = clampedDt * bot.chronoTimeScale;

    // 4. Tactical Movement Brain: Cover, Flanking, Grappling, Bursting, Sliding, Jumping
    _vMove.set(0, 0, 0);
    let wantsJump = false;
    let wantsSlide = false;

    const lowHp = bot.hp <= 40;
    const isReloading = bot.reloadTimer > 0;
    const needCover = (lowHp || isReloading) && canSee && targetAlive;

    // Strafe cadence & tactical intent switching
    bot.strafeTimer -= clampedDt;
    if (bot.strafeTimer <= 0) {
      bot.strafeSign = -bot.strafeSign;
      bot.strafeTimer = 0.45 + Math.random() * 0.75;
    }

    bot.intentTimer -= clampedDt;
    if (bot.intentTimer <= 0 && targetAlive) {
      let nextIntent = chooseBotMovementIntent(dist, bot.profile.preferredRange, isReloading || lowHp, Math.random());
      // Rivalry changes how willingly a bot commits to a fight, without overriding
      // critical cover/reload decisions or the normal range-based intent selection.
      if (!isReloading && !lowHp && aggressionBias >= 1.08 &&
          nextIntent !== 'advance' && nextIntent !== 'reload' &&
          Math.random() < Math.min(0.24, (aggressionBias - 1) * 0.72)) {
        nextIntent = 'advance';
      } else if (!isReloading && !lowHp && aggressionBias <= 0.92 &&
          nextIntent === 'advance' && Math.random() < Math.min(0.26, (1 - aggressionBias) * 0.9)) {
        nextIntent = 'strafe';
      }
      bot.combatIntent = nextIntent;
      bot.intentTimer = 0.65 + Math.random() * 0.85;
    }

    // Immediate Evasive Kinetic Burst when taking damage!
    if (abilitiesAllowed && bot.tookDamageAt > 0.65 && bot.burstCd <= 0 && targetAlive) {
      const rx = -(targetPos.z - bot.pos.z);
      const rz = (targetPos.x - bot.pos.x);
      const rl = Math.hypot(rx, rz) || 1;
      const boost = ((ctx && ctx.config && ctx.config.burstBoost) || 9.5) * 0.82;
      bot.vel.x += (rx / rl) * bot.strafeSign * boost;
      bot.vel.z += (rz / rl) * bot.strafeSign * boost;
      if (bot.grounded) bot.vel.y = Math.max(bot.vel.y, 4.8);
      bot.burstCd = 4.2 / Math.max(0.75, skill.abilityRate);
      if (callbacks.spawnBurst) {
        _vTmpA.set(bot.pos.x, bot.pos.y + 1.0, bot.pos.z);
        callbacks.spawnBurst(_vTmpA, 0x56eeff, 8, 6.5);
      }
    }

    if (needCover) {
      if (!bot.coverPoint || bot.coverTimer <= 0) {
        bot.coverPoint = findNearbyCover(bot, targetPos, solidMeshes);
        bot.coverTimer = 1.6;
      }
      if (bot.coverPoint) {
        _vMove.set(bot.coverPoint.x - bot.pos.x, 0, bot.coverPoint.z - bot.pos.z);
        if (_vMove.lengthSq() < 2.2) {
          _vMove.set(0, 0, 0);
        } else {
          wantsSlide = bot.grounded && Math.hypot(bot.vel.x, bot.vel.z) > 7.8;
        }
      } else {
        // Disengage laterally away from enemy
        _vToTarget.set(bot.pos.x - targetPos.x, 0, bot.pos.z - targetPos.z).normalize();
        _vRight.set(-_vToTarget.z * bot.strafeSign, 0, _vToTarget.x * bot.strafeSign);
        _vMove.copy(_vToTarget).multiplyScalar(0.75).addScaledVector(_vRight, 0.72);
        wantsJump = bot.grounded && Math.random() < 0.08;
      }
      // Emergency escape grapple if critically low
      if (abilitiesAllowed && lowHp && !bot.grapplePoint && bot.grappleCd <= 0 && Math.random() < 0.14) {
        const gp = findGrappleAnchor(bot, targetPos, solidMeshes, true, true);
        if (gp) {
          bot.grapplePoint = gp;
          bot.grappleTimer = 1.45;
          bot.grappleCd = 4.5;
        }
      }
    } else if (canSee && targetAlive) {
      bot.coverPoint = null;
      _vToTarget.set(targetPos.x - bot.pos.x, 0, targetPos.z - bot.pos.z);
      const tLen = Math.max(0.001, _vToTarget.length());
      _vToTarget.divideScalar(tLen);
      _vRight.set(-_vToTarget.z * bot.strafeSign, 0, _vToTarget.x * bot.strafeSign);

      if (bot.combatIntent === 'advance') {
        _vMove.copy(_vToTarget).multiplyScalar(0.86).addScaledVector(_vRight, 0.52);
        wantsSlide = bot.grounded && dist < 16 && dist > 6 && Math.random() < bot.profile.slideBias * 0.05;
        wantsJump = bot.grounded && dist > 14 && Math.random() < 0.07;
      } else if (bot.combatIntent === 'disengage') {
        _vMove.copy(_vToTarget).multiplyScalar(-0.78).addScaledVector(_vRight, 0.68);
        wantsJump = bot.grounded && Math.random() < 0.06;
      } else if (bot.combatIntent === 'hold' && activeBuild.weaponId === 'awp') {
        // Marksman micro-strafes or jump-peeks
        _vMove.copy(_vRight).multiplyScalar(0.32);
        if (bot.grounded && bot.chronoCooldown <= 0.1 && Math.random() < 0.04) wantsJump = true;
      } else {
        // Active combat strafing + counter-strafing
        const radialAdjust = dist > bot.profile.maxRange ? 0.35 : (dist < bot.profile.minRange ? -0.42 : 0.06);
        _vMove.copy(_vRight).multiplyScalar(0.95).addScaledVector(_vToTarget, radialAdjust);
        if (bot.grounded && Math.random() < 0.035 * skill.abilityRate) wantsJump = true;
      }

      // Aggressive Kinetic Burst to close distance (Flanker / Breacher)
      if (abilitiesAllowed && bot.burstCd <= 0 && (bot.profile.id === 'flanker' || bot.profile.id === 'breacher') && dist > 13 && dist < 30 && Math.random() < 0.04 * skill.abilityRate * aggressionBias) {
        const boost = ((ctx && ctx.config && ctx.config.burstBoost) || 9.5) * 0.85;
        bot.vel.x += _vToTarget.x * boost;
        bot.vel.z += _vToTarget.z * boost;
        if (bot.grounded) bot.vel.y = Math.max(bot.vel.y, 4.5);
        bot.burstCd = 4.6 / Math.max(0.75, skill.abilityRate);
        if (callbacks.spawnBurst) {
          _vTmpA.set(bot.pos.x, bot.pos.y + 1.0, bot.pos.z);
          callbacks.spawnBurst(_vTmpA, 0x56eeff, 8, 6.5);
        }
      }

      // Tactical Grapple to High Ground / Flank Angle!
      const wantHighGround = (targetPos.y > bot.pos.y + 2.5) || (bot.profile.id === 'marksman' && bot.pos.y < 5.0) || (dist > 22);
      if (abilitiesAllowed && !bot.grapplePoint && bot.grappleCd <= 0 &&
          (wantHighGround || Math.random() < 0.015 * bot.profile.grappleBias * skill.abilityRate * aggressionBias)) {
        const gp = findGrappleAnchor(bot, targetPos, solidMeshes, wantHighGround, false);
        if (gp) {
          bot.grapplePoint = gp;
          bot.grappleTimer = 1.65;
          bot.grappleCd = 4.8 / Math.max(0.75, skill.abilityRate);
          bot.vel.y = Math.max(bot.vel.y, 5.2);
          bot.grounded = false;
        } else {
          bot.grappleCd = 1.1;
        }
      }
    } else if (bot.hasLastKnown && bot.lastKnownAge < 9.5) {
      // Hunt last known enemy location
      _vMove.set(bot.lastKnownTarget.x - bot.pos.x, 0, bot.lastKnownTarget.z - bot.pos.z);
      const rem = _vMove.length();
      if (rem < 2.2) {
        bot.hasLastKnown = false;
      } else {
        _vMove.divideScalar(rem);
        // Bunny-hop while rotating/hunting
        wantsJump = bot.grounded && Math.hypot(bot.vel.x, bot.vel.z) > 7.5 && Math.random() < 0.12;
        if (abilitiesAllowed && !bot.grapplePoint && bot.grappleCd <= 0 &&
            (bot.lastKnownTarget.y > bot.pos.y + 2.6 || rem > 20) && Math.random() < 0.05) {
          const gp = findGrappleAnchor(bot, bot.lastKnownTarget, solidMeshes, true, false);
          if (gp) {
            bot.grapplePoint = gp;
            bot.grappleTimer = 1.6;
            bot.grappleCd = 4.5;
            bot.vel.y = Math.max(bot.vel.y, 5.2);
          } else {
            bot.grappleCd = 0.9;
          }
        }
      }
    } else if (targetAlive) {
      // Patrol aggressively toward arena hot zones / opponent sector
      bot.decisionTimer -= clampedDt;
      if (bot.decisionTimer <= 0 || Math.hypot(bot.waypoint.x - bot.pos.x, bot.waypoint.z - bot.pos.z) < 2.8) {
        bot.decisionTimer = 1.8 + Math.random() * 1.6;
        // Blend between target sector and tactical offset so bots actively find engagements
        const flankAng = Math.atan2(-(targetPos.x - bot.pos.x), -(targetPos.z - bot.pos.z)) + (Math.random() - 0.5) * 1.1;
        const step = clamp(horizDist * 0.65, 8, 24);
        bot.waypoint.set(
          bot.pos.x - Math.sin(flankAng) * step,
          bot.pos.y,
          bot.pos.z - Math.cos(flankAng) * step
        );
      }
      _vMove.set(bot.waypoint.x - bot.pos.x, 0, bot.waypoint.z - bot.pos.z);
      if (_vMove.lengthSq() > 0.2) {
        _vMove.normalize();
        wantsJump = bot.grounded && Math.hypot(bot.vel.x, bot.vel.z) > 8.0 && Math.random() < 0.08;
      }
    }

    // Obstacle avoidance steering + stuck escape
    if (!bot.grapplePoint && _vMove.lengthSq() > 0.01) {
      steerAroundObstacles(bot, _vMove, solidMeshes);
    }

    bot.stuckTimer += clampedDt;
    if (bot.stuckTimer >= 0.95) {
      const moved = Math.hypot(bot.pos.x - bot.lastStuckCheckPos.x, bot.pos.z - bot.lastStuckCheckPos.z);
      bot.lastStuckCheckPos.x = bot.pos.x;
      bot.lastStuckCheckPos.y = bot.pos.y;
      bot.lastStuckCheckPos.z = bot.pos.z;
      bot.stuckTimer = 0;
      if (moved < 0.85 && !bot.chronoActive && !needCover) {
        // Jump & pick a fresh flank angle to unstick cleanly
        wantsJump = true;
        bot.strafeSign = -bot.strafeSign;
        bot.decisionTimer = 0;
        if (abilitiesAllowed && !bot.grapplePoint && bot.grappleCd <= 0) {
          const gp = findGrappleAnchor(bot, targetPos, solidMeshes, true, false);
          if (gp) { bot.grapplePoint = gp; bot.grappleTimer = 1.4; bot.grappleCd = 4.0; }
        }
      }
    }

    // 5. Execute True 3D Capsule Physics + Collision
    stepBotPhysics(bot, moveDt, _vMove, wantsJump, wantsSlide, ctx);

    // 6. Smooth Human-Grade Angular Aim Tracking & Lethal Firing
    if (canSee && targetAlive) {
      const leadSec = clamp(dist * 0.0018 * skill.leadFactor, 0, 0.075);
      const targetAimY = targetPos.y + Math.min(1.38, (target.eye || 1.6) * 0.82);
      _vLeadPos.set(
        targetPos.x + bot.targetVel.x * leadSec,
        targetAimY + bot.targetVel.y * leadSec * 0.35,
        targetPos.z + bot.targetVel.z * leadSec
      );
      _vOrigin.set(bot.pos.x, bot.pos.y + (bot.low ? 1.05 : 1.52), bot.pos.z);
      _vAimDesired.subVectors(_vLeadPos, _vOrigin).normalize();

      // Natural human micro-sway (tightens heavily on stationary targets so standing still is still punished)
      bot.aimSwayPhase = (bot.aimSwayPhase || 0) + clampedDt * 3.1;
      const swayScale = (targetPerpSpeed < 1.5 ? 0.22 : 1.0) * (bot.chronoActive ? 0.65 : 1.0);
      const swayAmp = (skill.aimSwayAmp || 0.018) * swayScale;
      if (swayAmp > 0.0005) {
        _vRight.crossVectors(_vAimDesired, _vWorldUp);
        if (_vRight.lengthSq() > 0.001) {
          _vRight.normalize();
          _vUp.crossVectors(_vRight, _vAimDesired).normalize();
          const swX = Math.sin(bot.aimSwayPhase) * 0.72 + Math.sin(bot.aimSwayPhase * 2.13) * 0.28;
          const swY = Math.cos(bot.aimSwayPhase * 0.83) * 0.65 + Math.sin(bot.aimSwayPhase * 1.67) * 0.35;
          _vAimDesired
            .addScaledVector(_vRight, swX * swayAmp)
            .addScaledVector(_vUp, swY * swayAmp * 0.65)
            .normalize();
        }
      }

      // Rotate bot.aimDir toward _vAimDesired capped by skill.aimTurnRate (in real world dt!)
      const dot = clamp(bot.aimDir.dot(_vAimDesired), -1, 1);
      const angleErr = Math.acos(dot);
      // Modest tracking focus while bot is in Chrono Hangtime
      const maxStep = skill.aimTurnRate * (bot.chronoActive ? 1.12 : 1.0) * clampedDt;
      if (angleErr <= maxStep || angleErr < 0.0005) {
        bot.aimDir.copy(_vAimDesired);
      } else {
        const frac = maxStep / angleErr;
        bot.aimDir.lerp(_vAimDesired, frac).normalize();
      }

      // Face body yaw toward tracked aimDir
      bot.yaw = Math.atan2(-bot.aimDir.x, -bot.aimDir.z);

      // Tick reaction timer down while target is in sight
      if (bot.reactionTimer > 0) {
        bot.reactionTimer = Math.max(0, bot.reactionTimer - clampedDt);
      }

      const shotParams = computeBotShotParams(activeBuild, skill, targetPerpSpeed, dist, {
        botChrono: bot.chronoActive,
        targetChrono: Boolean(target.chronoTier > 0),
        botAirborne: !bot.grounded,
        botHorizSpeed: Math.hypot(bot.vel.x, bot.vel.z),
        burstShotIdx: bot.burstShotIdx || 0,
        flinchWeight: clamp((bot.flinchTimer || 0) / 0.26, 0, 1)
      });

      const currentErr = Math.acos(clamp(bot.aimDir.dot(_vAimDesired), -1, 1));
      if (bot.reactionTimer <= 0 && bot.reloadTimer <= 0 && bot.fireCooldown <= 0 &&
          bot.burstPause <= 0 && currentErr <= shotParams.maxFireAngle) {
        if (bot.burstRemaining <= 0) {
          const span = Math.max(1, bot.profile.burstMax - bot.profile.burstMin + 1);
          bot.burstRemaining = bot.profile.burstMin + Math.floor(Math.random() * span);
          bot.burstShotIdx = 0;
        }
        const fired = fireBotWeapon(bot, activeBuild, skill, target, targetPerpSpeed, dist, solidMeshes, callbacks);
        if (fired) {
          bot.burstRemaining -= 1;
          bot.burstShotIdx = (bot.burstShotIdx || 0) + 1;
          if (bot.burstRemaining <= 0 && activeBuild.weaponId !== 'awp' && activeBuild.weaponId !== 'shotgun') {
            const gap = bot.profile.burstGapMin + Math.random() * (bot.profile.burstGapMax - bot.profile.burstGapMin);
            bot.burstPause = gap * skill.burstTempoMult;
            bot.burstShotIdx = 0;
          }
        }
      }
    } else {
      bot.burstShotIdx = 0;
      // Look toward damage source, last known target, or movement direction
      let lookYaw = bot.yaw;
      if (bot.tookDamageAt > 0 && bot.damageSourcePos) {
        lookYaw = Math.atan2(-(bot.damageSourcePos.x - bot.pos.x), -(bot.damageSourcePos.z - bot.pos.z));
      } else if (bot.hasLastKnown && bot.lastKnownAge < 5.0) {
        lookYaw = Math.atan2(-(bot.lastKnownTarget.x - bot.pos.x), -(bot.lastKnownTarget.z - bot.pos.z));
      } else if (_vMove.lengthSq() > 0.04) {
        lookYaw = Math.atan2(-_vMove.x, -_vMove.z);
      }
      let dyaw = lookYaw - bot.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const turnStep = Math.min(Math.abs(dyaw), (bot.tookDamageAt > 0 ? 6.5 : 5.5) * clampedDt);
      bot.yaw += Math.sign(dyaw) * turnStep;
      bot.aimDir.set(-Math.sin(bot.yaw), 0, -Math.cos(bot.yaw));
    }

    // 7. Update 3D Avatar Pose, Crouch/Slide Drop, Stride, Chrono Shell, & Visible Grapple Tether
    if (bot.visual && bot.visual.group) {
      const vg = bot.visual.group;
      vg.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
      vg.rotation.y = bot.yaw;

      // Crouch / Slide visual silhouette drop
      const targetScaleY = bot.low ? 0.72 : 1.0;
      vg.scale.y += (targetScaleY - vg.scale.y) * Math.min(1, clampedDt * 14);

      // Wall-run bank tilt
      const bankTarget = bot.wallrun ? 0.22 : (bot.sliding ? -0.18 : 0);
      vg.rotation.z += (bankTarget - vg.rotation.z) * Math.min(1, clampedDt * 10);

      // Leg stride animation (slows down visually during personal Chrono!)
      const spH = Math.hypot(bot.vel.x, bot.vel.z);
      bot.strideClock += moveDt * Math.min(14, Math.max(2, spH * 0.9));
      const strideAmp = bot.grounded && !bot.sliding ? Math.min(0.65, spH * 0.06) : 0.18;
      if (bot.visual.legL && bot.visual.legR) {
        bot.visual.legL.rotation.x = Math.sin(bot.strideClock) * strideAmp;
        bot.visual.legR.rotation.x = -Math.sin(bot.strideClock) * strideAmp;
      }
      if (bot.visual.gunBar) {
        bot.visual.gunBar.visible = true;
      }

      // Billboard HP bar toward local viewer
      const viewerPos = (ctx && ctx.viewerPos) || targetPos;
      if (viewerPos && bot.visual.hpBg && bot.visual.hpFill) {
        bot.visual.hpBg.lookAt(viewerPos.x, bot.pos.y + 2.16, viewerPos.z);
        bot.visual.hpFill.lookAt(viewerPos.x, bot.pos.y + 2.16, viewerPos.z);
      }

      if (callbacks.updateChronoVisual) {
        callbacks.updateChronoVisual(bot.visual, bot.chronoTier, clampedDt);
      }
      if (callbacks.updateGrappleVisual) {
        callbacks.updateGrappleVisual(bot.visual, bot.pos, bot.grapplePoint);
      }
    }
  }

  return {
    BOT_ARCHETYPES,
    PLAYER_NAME_POOL,
    generatePlayerName,
    DIFFICULTY_LEVELS,
    DIFFICULTY_STORAGE_KEY,
    H_STAND,
    H_LOW,
    getArchetype,
    resolveBotWeaponBuild,
    computeAdaptiveSkill,
    setDifficulty,
    getDifficulty,
    getActiveSkill,
    computeBotXpReward,
    recordPlayerKill,
    recordPlayerDeath,
    resetAdaptiveStats,
    getAdaptiveState,
    computeBotShotParams,
    chooseBotMovementIntent,
    resolveBotCapsuleCollision,
    isBotHeadBlocked,
    createBotState,
    resetBotState,
    alertBotDamage,
    stepBot
  };
});
