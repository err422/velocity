// Demolition 5v5 Tactical Mode Engine (Pure UMD module: browser + Node unit-testable)
// Handles CS2-style round/halftime FSM, economy, shop catalog, armor damage math,
// 5v5 solo-queue team balancing, round damage breakdown, and tactical bot buy logic.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DemolitionEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const RULES = Object.freeze({
    MODE_ID: 'demolition_5v5',
    TEAM_SIZE: 5,
    MAX_HUMANS: 4,
    WIN_ROUNDS: 5,
    HALF_ROUNDS: 3, // Swap sides after round 3 (equal halves, tiebreaker round 9 on 4-4)
    BUY_SEC: 15,
    ROUND_SEC: 115,
    BOMB_FUSE_SEC: 40,
    PLANT_SEC: 3.5,
    DEFUSE_SEC: 7.0,
    DEFUSE_KIT_SEC: 3.5,
    POST_ROUND_SEC: 5.0,
    HALFTIME_SEC: 6.0,
    START_CREDITS: 800,
    MAX_CREDITS: 8000,
    MAX_THROWABLES: 3,
    MAX_PER_THROWABLE: 2,
    LOSS_BONUSES: Object.freeze([1400, 1900, 2400, 2900, 3400]),
    WIN_REWARD_ELIM: 3250,
    WIN_REWARD_OBJ: 3500,
    PLANT_BONUS_PLAYER: 300,
    PLANT_LOSS_TEAM_BONUS: 800,
    DEFUSE_BONUS_PLAYER: 300
  });

  const TEAM_COLORS = Object.freeze({
    atk: { hex: 0xff6b35, css: '#ff6b35', label: 'ATTACKERS', short: 'ATK' },
    def: { hex: 0x38bdf8, css: '#38bdf8', label: 'DEFENDERS', short: 'DEF' }
  });

  // Valorant-style clean tactical shop catalog (equipment & utility only — weapons come from the 5 Gunsmith loadouts)
  const SHOP_ITEMS = Object.freeze({
    // Throwables & Explosives
    frag: {
      id: 'frag',
      name: 'Frag HE Grenade',
      shortName: 'FRAG HE',
      category: 'throwable',
      cost: 300,
      maxCarry: 2,
      side: 'both',
      hotkey: '5',
      desc: 'High-explosive frag. Deals heavy splash damage and blasts open soft walls.'
    },
    smoke: {
      id: 'smoke',
      name: 'Smoke Grenade',
      shortName: 'SMOKE',
      category: 'throwable',
      cost: 300,
      maxCarry: 2,
      side: 'both',
      hotkey: '5',
      desc: 'Dense 16s volumetric smoke cloud that blocks both player and bot sightlines.'
    },
    flash: {
      id: 'flash',
      name: 'Flashbang',
      shortName: 'FLASH',
      category: 'throwable',
      cost: 200,
      maxCarry: 2,
      side: 'both',
      hotkey: '5',
      desc: 'Blinds enemies looking toward detonation and disorients bots for 2.6s.'
    },
    molotov: {
      id: 'molotov',
      name: 'Molotov / Incendiary',
      shortName: 'MOLOTOV',
      category: 'throwable',
      cost: 400,
      maxCarry: 1,
      side: 'both',
      hotkey: '5',
      desc: 'Ignites a 7s floor fire zone to flush defenders or deny bomb defusal.'
    },
    c4: {
      id: 'c4',
      name: 'C4 Remote Satchel',
      shortName: 'C4 SATCHEL',
      category: 'throwable',
      cost: 450,
      maxCarry: 1,
      side: 'both',
      hotkey: '6',
      desc: 'Finals-style sticky demolition satchel. Press 6 to throw, press 6 again to detonate.'
    },
    recon: {
      id: 'recon',
      name: 'Recon Sensor Dart',
      shortName: 'RECON DART',
      category: 'throwable',
      cost: 350,
      maxCarry: 1,
      side: 'both',
      hotkey: '6',
      desc: 'Sticky sonar dart that pulses 3x to reveal enemies through walls.'
    },
    // Armor & Tactical Gadgets
    vest: {
      id: 'vest',
      name: 'Kevlar Vest',
      shortName: 'KEVLAR',
      category: 'gear',
      cost: 400,
      maxCarry: 1,
      side: 'both',
      desc: '100 body armor. Absorbs 35% of torso & limb bullet damage.'
    },
    vest_helmet: {
      id: 'vest_helmet',
      name: 'Kevlar + Helmet',
      shortName: 'VEST+HELM',
      category: 'gear',
      cost: 650,
      upgradeCost: 250,
      maxCarry: 1,
      side: 'both',
      desc: '100 armor plus ballistic helmet reducing non-sniper headshot damage.'
    },
    defuse_kit: {
      id: 'defuse_kit',
      name: 'Defuse Kit',
      shortName: 'DEFUSE KIT',
      category: 'gear',
      cost: 300,
      maxCarry: 1,
      side: 'def',
      desc: 'Defenders only. Cuts continuous bomb defusal time in half (7.0s -> 3.5s).'
    },
    breach_charge: {
      id: 'breach_charge',
      name: 'Breach Charge',
      shortName: 'BREACH',
      category: 'gadget',
      cost: 350,
      maxCarry: 2,
      side: 'both',
      hotkey: '7',
      desc: 'R6-style wall & hatch charge. Blows a clean walk-through doorway and stuns behind it.'
    },
    barricade: {
      id: 'barricade',
      name: 'Barricade / Reinforce',
      shortName: 'BARRICADE',
      category: 'gadget',
      cost: 300,
      maxCarry: 2,
      side: 'both',
      hotkey: '7',
      desc: 'Reinforce an intact soft wall with steel plating or deploy solid cover anywhere.'
    },
    mobility_kit: {
      id: 'mobility_kit',
      name: 'Grapple + Jump Pad',
      shortName: 'MOBILITY',
      category: 'gadget',
      cost: 400,
      maxCarry: 1,
      side: 'both',
      hotkey: 'E / 7',
      desc: 'Finals mobility pack: 2 Grapple charges [E] plus 1 deployable Team Jump Pad [7].'
    }
  });

  const SHOP_ORDER = Object.freeze({
    throwables: Object.freeze(['frag', 'smoke', 'flash', 'molotov', 'c4', 'recon']),
    gear: Object.freeze(['vest', 'vest_helmet', 'defuse_kit', 'breach_charge', 'barricade', 'mobility_kit'])
  });

  // Realistic solo-queue skill spread per team: 1 Carry, 2 Solid, 1-2 Weaker (unconfigurable in Demolition 5v5)
  const SOLO_QUEUE_TIERS = Object.freeze({
    carry: Object.freeze({
      id: 'carry',
      label: 'CARRY',
      scalar: 1.12,
      reactionSec: 0.27,
      aimTurnRate: 5.4,
      hsChance: 0.16,
      stationarySpread: 0.0065,
      movingSlipPerSpeed: 0.0040,
      aimSwayAmp: 0.014,
      leadFactor: 0.50,
      abilityRate: 0.90,
      burstTempoMult: 1.18,
      chronoAggression: 0.85,
      utilityIq: 0.88
    }),
    solid: Object.freeze({
      id: 'solid',
      label: 'SOLID',
      scalar: 0.90,
      reactionSec: 0.38,
      aimTurnRate: 4.0,
      hsChance: 0.105,
      stationarySpread: 0.0088,
      movingSlipPerSpeed: 0.0052,
      aimSwayAmp: 0.019,
      leadFactor: 0.36,
      abilityRate: 0.74,
      burstTempoMult: 1.36,
      chronoAggression: 0.68,
      utilityIq: 0.66
    }),
    weak: Object.freeze({
      id: 'weak',
      label: 'WEAK',
      scalar: 0.66,
      reactionSec: 0.55,
      aimTurnRate: 2.5,
      hsChance: 0.055,
      stationarySpread: 0.0125,
      movingSlipPerSpeed: 0.0074,
      aimSwayAmp: 0.026,
      leadFactor: 0.18,
      abilityRate: 0.48,
      burstTempoMult: 1.66,
      chronoAggression: 0.44,
      utilityIq: 0.38
    })
  });

  const TACTICAL_COMMS = Object.freeze([
    { id: 'rush_a', label: 'RUSH A', site: 'A', chat: 'pushing A site, come with me', botOrder: 'execute_A' },
    { id: 'rush_b', label: 'RUSH B', site: 'B', chat: 'hit B fast, drop smokes', botOrder: 'execute_B' },
    { id: 'split_mid', label: 'SPLIT MID', site: 'MID', chat: 'taking mid control first', botOrder: 'split_mid' },
    { id: 'rotate', label: 'ROTATE', site: null, chat: 'rotate off this site, they stacked it', botOrder: 'rotate' },
    { id: 'hold', label: 'HOLD', site: null, chat: 'play slow and hold angles', botOrder: 'hold' },
    { id: 'backup', label: 'BACKUP', site: null, chat: 'need help over here!', botOrder: 'backup' }
  ]);

  function clamp(v, a, b) {
    return v < a ? a : (v > b ? b : v);
  }

  function createEmptyUtility() {
    return {
      frag: 0,
      smoke: 0,
      flash: 0,
      molotov: 0,
      c4: 0,
      recon: 0,
      breach: 0,
      barricade: 0,
      grapple: 0,
      jumpPad: 0
    };
  }

  function itemToUtilKey(itemId) {
    return itemId === 'breach_charge' ? 'breach' : itemId;
  }

  function countThrowables(util) {
    if (!util) return 0;
    return (util.frag || 0) + (util.smoke || 0) + (util.flash || 0) +
      (util.molotov || 0) + (util.c4 || 0) + (util.recon || 0);
  }

  function createPlayerEconomy(overrides) {
    const o = overrides || {};
    return {
      credits: typeof o.credits === 'number' ? o.credits : RULES.START_CREDITS,
      armor: typeof o.armor === 'number' ? o.armor : 0,
      helmet: Boolean(o.helmet),
      defuseKit: Boolean(o.defuseKit),
      utility: Object.assign(createEmptyUtility(), o.utility || {}),
      loadoutIndex: Number.isFinite(o.loadoutIndex) ? o.loadoutIndex : 0,
      plants: Number(o.plants) || 0,
      defuses: Number(o.defuses) || 0,
      assists: Number(o.assists) || 0,
      damageDealt: Number(o.damageDealt) || 0
    };
  }

  function getItemEffectiveCost(econ, itemId) {
    const item = SHOP_ITEMS[itemId];
    if (!item) return Infinity;
    if (itemId === 'vest_helmet' && econ && econ.armor >= 95 && !econ.helmet) {
      return item.upgradeCost || 250;
    }
    return item.cost;
  }

  function canBuyItem(econ, side, itemId, phase) {
    const item = SHOP_ITEMS[itemId];
    if (!item || !econ) return { ok: false, reason: 'Invalid item' };
    if (phase && phase !== 'buy') return { ok: false, reason: 'Buy phase ended' };
    if (item.side !== 'both' && item.side !== side) {
      return { ok: false, reason: item.side === 'def' ? 'Defenders only' : 'Attackers only' };
    }
    const cost = getItemEffectiveCost(econ, itemId);
    if (econ.credits < cost) {
      return { ok: false, reason: 'Not enough credits' };
    }
    if (itemId === 'vest') {
      if (econ.armor >= 100) return { ok: false, reason: 'Armor full' };
      return { ok: true, cost };
    }
    if (itemId === 'vest_helmet') {
      if (econ.armor >= 100 && econ.helmet) return { ok: false, reason: 'Already equipped' };
      return { ok: true, cost };
    }
    if (itemId === 'defuse_kit') {
      if (econ.defuseKit) return { ok: false, reason: 'Already equipped' };
      return { ok: true, cost };
    }
    if (itemId === 'mobility_kit') {
      if ((econ.utility.grapple || 0) >= 2 && (econ.utility.jumpPad || 0) >= 1) {
        return { ok: false, reason: 'Mobility kit full' };
      }
      return { ok: true, cost };
    }
    const uKey = itemToUtilKey(itemId);
    if (item.category === 'throwable') {
      if (countThrowables(econ.utility) >= RULES.MAX_THROWABLES) {
        return { ok: false, reason: `Max ${RULES.MAX_THROWABLES} throwables` };
      }
      if ((econ.utility[uKey] || 0) >= item.maxCarry) {
        return { ok: false, reason: `Max ${item.maxCarry} carried` };
      }
      return { ok: true, cost };
    }
    if (item.category === 'gadget') {
      if ((econ.utility[uKey] || 0) >= item.maxCarry) {
        return { ok: false, reason: `Max ${item.maxCarry} carried` };
      }
      return { ok: true, cost };
    }
    return { ok: true, cost };
  }

  function buyItem(econ, side, itemId, phase) {
    const check = canBuyItem(econ, side, itemId, phase);
    if (!check.ok) return { ok: false, reason: check.reason, econ };
    const item = SHOP_ITEMS[itemId];
    econ.credits = Math.max(0, econ.credits - check.cost);
    if (itemId === 'vest') {
      econ.armor = 100;
    } else if (itemId === 'vest_helmet') {
      econ.armor = 100;
      econ.helmet = true;
    } else if (itemId === 'defuse_kit') {
      econ.defuseKit = true;
    } else if (itemId === 'mobility_kit') {
      econ.utility.grapple = 2;
      econ.utility.jumpPad = 1;
    } else if (item.category === 'throwable' || item.category === 'gadget') {
      const uKey = itemToUtilKey(itemId);
      econ.utility[uKey] = (econ.utility[uKey] || 0) + 1;
    }
    return { ok: true, cost: check.cost, item, econ };
  }

  // Armor & Helmet ballistic damage resolution for Demolition 5v5 (no HP regen!)
  function applyTacticalDamage(hp, armor, helmet, rawDamage, isHeadshot, weaponId) {
    let curHp = Math.max(0, Number(hp) || 0);
    let curArmor = Math.max(0, Number(armor) || 0);
    const dmg = Math.max(1, Number(rawDamage) || 0);
    const wid = String(weaponId || 'rifle').toLowerCase();

    // Heavy sniper & explosives bypass most/all helmet reduction
    const highPen = wid === 'awp' || wid === 'railcannon' || wid === 'c4' || wid === 'frag' || wid === 'breach_charge';
    const isFireOrVoid = wid === 'molotov' || wid === 'void';

    let hpDmg = dmg;
    let armorDmg = 0;

    if (!isFireOrVoid && curArmor > 0) {
      if (isHeadshot) {
        if (helmet && !highPen) {
          const reduced = dmg * 0.72;
          armorDmg = Math.min(curArmor, Math.round(dmg * 0.24));
          hpDmg = Math.round(reduced);
        } else if (helmet && highPen) {
          armorDmg = Math.min(curArmor, Math.round(dmg * 0.14));
          hpDmg = Math.round(dmg);
        }
      } else {
        const absorbRatio = highPen ? 0.16 : 0.35;
        const absorbed = Math.min(curArmor, Math.round(dmg * absorbRatio));
        armorDmg = absorbed;
        hpDmg = Math.max(1, Math.round(dmg - absorbed * 0.85));
      }
    } else {
      hpDmg = Math.round(dmg);
    }

    curArmor = Math.max(0, curArmor - armorDmg);
    curHp = Math.max(0, curHp - hpDmg);
    return {
      hp: curHp,
      armor: curArmor,
      hpDamage: hpDmg,
      armorDamage: armorDmg,
      killed: curHp <= 0
    };
  }

  function getKillReward(weaponId) {
    const wid = String(weaponId || 'rifle').toLowerCase();
    if (wid === 'knife' || wid === 'katana') return 600;
    if (wid === 'shotgun' || wid === 'sawedoff' || wid === 'leverslug') return 500;
    if (wid === 'awp') return 150;
    if (wid === 'smg' || wid === 'mp7') return 400;
    return 300;
  }

  function getLossBonus(lossStreak) {
    const idx = clamp(Math.floor(Number(lossStreak) || 0), 0, RULES.LOSS_BONUSES.length - 1);
    return RULES.LOSS_BONUSES[idx];
  }

  // Build balanced 5v5 Demolition roster:
  // - Auto-balances 1..4 real human players evenly across 'atk' and 'def' (e.g. 2v2 humans + 3 bots each).
  // - Fills remaining seats up to 5 per side with bots having locked solo-queue skill spread (1 carry, 2 solid, 1-2 weak).
  function buildDemolitionRoster(humans, opts) {
    const o = opts || {};
    const list = Array.isArray(humans) ? humans.slice(0, RULES.MAX_HUMANS) : [];
    const nameFn = typeof o.generateName === 'function'
      ? o.generateName
      : (used) => {
          if (root.BotAISystem && typeof root.BotAISystem.generatePlayerName === 'function') {
            return root.BotAISystem.generatePlayerName(used);
          }
          return 'player_' + (used.length + 1);
        };

    const usedNames = list.map((h) => h.name).filter(Boolean);
    const atkTeam = [];
    const defTeam = [];

    // Alternate humans across ATK and DEF so 2 humans = 1v1 + 4 bots each, 4 humans = 2v2 + 3 bots each
    list.forEach((h, i) => {
      const team = h.preferredTeam === 'atk' || h.preferredTeam === 'def'
        ? h.preferredTeam
        : (atkTeam.length <= defTeam.length ? 'atk' : 'def');
      const target = team === 'atk' && atkTeam.length < RULES.TEAM_SIZE ? atkTeam : defTeam;
      const side = target === atkTeam ? 'atk' : 'def';
      target.push({
        uid: h.uid,
        name: String(h.name || 'Player').slice(0, 24),
        isBot: false,
        team: side,
        originSide: side,
        botType: null,
        skillTier: null,
        skillProfile: null,
        slot: h.slot || 'rifle',
        spawnIdx: target.length,
        econ: createPlayerEconomy()
      });
    });

    // Fill each team up to 5 with realistic solo-queue bot mix (1 carry, 2 solid, remaining weak)
    const botWeaponsByTier = {
      carry: ['rifle', 'awp', 'scar'],
      solid: ['rifle', 'smg', 'famas', 'shotgun'],
      weak: ['smg', 'shotgun', 'rifle', 'dmr']
    };
    const fillSide = (arr, side) => {
      const needed = Math.max(0, RULES.TEAM_SIZE - arr.length);
      // Always guarantee 1 carry, up to 2 solid, and 1-2 weaker players per side
      const tierPlan = [];
      if (needed >= 1) tierPlan.push('carry');
      if (needed >= 2) tierPlan.push('solid');
      if (needed >= 3) tierPlan.push('weak');
      if (needed >= 4) tierPlan.push('solid');
      if (needed >= 5) tierPlan.push('weak');
      // Shuffle tier order slightly so seats aren't predictable
      for (let i = tierPlan.length - 1; i > 0; i--) {
        const j = Math.floor((typeof o.rand === 'function' ? o.rand() : Math.random()) * (i + 1));
        const tmp = tierPlan[i];
        tierPlan[i] = tierPlan[j];
        tierPlan[j] = tmp;
      }

      for (let i = 0; i < needed; i++) {
        const tierId = tierPlan[i] || 'solid';
        const botName = nameFn(usedNames);
        usedNames.push(botName);
        const wPool = botWeaponsByTier[tierId] || botWeaponsByTier.solid;
        const botType = (arr.length + (side === 'def' ? 2 : 0)) % 4;
        const weapon = wPool[(arr.length + i) % wPool.length];
        arr.push({
          uid: `demo_bot_${side}_${i}_${Math.floor(Math.random() * 10000)}`,
          name: botName,
          isBot: true,
          team: side,
          originSide: side,
          botType,
          skillTier: tierId,
          skillProfile: SOLO_QUEUE_TIERS[tierId],
          slot: weapon,
          spawnIdx: arr.length,
          econ: createPlayerEconomy()
        });
      }
    };

    fillSide(atkTeam, 'atk');
    fillSide(defTeam, 'def');

    return {
      atk: atkTeam,
      def: defTeam,
      all: atkTeam.concat(defTeam)
    };
  }

  // Bot eco-round & utility purchase planner
  function computeBotBuyPlan(player, side, roundNum, teamAvgCredits) {
    if (!player || !player.econ) return [];
    const econ = player.econ;
    const purchased = [];
    const tier = player.skillTier || 'solid';
    const isPistol = roundNum === 1 || roundNum === RULES.HALF_ROUNDS + 1;
    // Eco save awareness: if low cash mid-half and team is broke, save for next round
    const shouldEcoSave = !isPistol && econ.credits < 750 && (teamAvgCredits || econ.credits) < 1200;

    const tryBuy = (id) => {
      const res = buyItem(econ, side, id, 'buy');
      if (res.ok) purchased.push(id);
      return res.ok;
    };

    if (shouldEcoSave) {
      if (econ.credits >= 500) tryBuy('flash');
      return purchased;
    }

    // Priority 1: Armor / Helmet
    if (econ.credits >= 650 && !isPistol) {
      tryBuy('vest_helmet');
    } else if (econ.credits >= 400 && econ.armor < 65) {
      tryBuy('vest');
    }

    // Priority 2: Defender Defuse Kit (especially carry/solid)
    if (side === 'def' && !econ.defuseKit && econ.credits >= 300 && (tier !== 'weak' || econ.credits >= 1200)) {
      tryBuy('defuse_kit');
    }

    // Priority 3: Tactical Utility based on side & role
    if (side === 'atk') {
      if (econ.credits >= 300) tryBuy('smoke');
      if (econ.credits >= 350 && tier !== 'weak') tryBuy('breach_charge');
      if (econ.credits >= 300) tryBuy('frag');
      if (econ.credits >= 200) tryBuy('flash');
      if (econ.credits >= 400 && tier === 'carry') tryBuy('molotov');
    } else {
      if (econ.credits >= 300) tryBuy('smoke');
      if (econ.credits >= 300) tryBuy('barricade');
      if (econ.credits >= 300) tryBuy('frag');
      if (econ.credits >= 200) tryBuy('flash');
      if (econ.credits >= 350 && tier === 'carry') tryBuy('recon');
    }
    return purchased;
  }

  // Match State Machine
  function createMatchState(mapId) {
    return {
      mode: RULES.MODE_ID,
      mapId: mapId || 'tac_citadel',
      round: 1,
      half: 1, // 1 = rounds 1..3, 2 = rounds 4+ (swapped sides)
      swapped: false,
      phase: 'buy', // 'buy' | 'live' | 'post_round' | 'halftime' | 'match_over'
      phaseTimer: RULES.BUY_SEC,
      // Scores track the two persistent squads ('alpha' starts ATK, 'bravo' starts DEF)
      scores: { alpha: 0, bravo: 0 },
      lossStreak: { alpha: 0, bravo: 0 },
      // Which persistent squad is currently ATK vs DEF
      sideSquads: { atk: 'alpha', def: 'bravo' },
      bomb: {
        state: 'carried', // 'carried' | 'dropped' | 'planted' | 'defused' | 'detonated'
        carrierUid: null,
        site: null, // 'A' | 'B'
        pos: { x: 0, y: 0, z: 0 },
        fuseTimer: 0,
        plantProgress: 0,
        planterUid: null,
        defuseProgress: 0,
        defuserUid: null
      },
      lastRoundWinSide: null,
      lastRoundWinReason: '',
      winnerSquad: null,
      roundDamageLog: [] // Array of { attackerUid, attackerName, victimUid, victimName, dmg, armorDmg, hs, weapon }
    };
  }

  function getSquadForSide(ms, side) {
    return side === 'atk' ? ms.sideSquads.atk : ms.sideSquads.def;
  }

  function getSideForSquad(ms, squad) {
    return ms.sideSquads.atk === squad ? 'atk' : 'def';
  }

  function shouldSwapSides(completedRound) {
    return completedRound === RULES.HALF_ROUNDS;
  }

  function checkMatchWinner(ms) {
    if (!ms || !ms.scores) return null;
    if (ms.scores.alpha >= RULES.WIN_ROUNDS) return 'alpha';
    if (ms.scores.bravo >= RULES.WIN_ROUNDS) return 'bravo';
    return null;
  }

  function resolveRoundWin(ms, winSide, reason, playersList) {
    const winSquad = getSquadForSide(ms, winSide);
    const loseSide = winSide === 'atk' ? 'def' : 'atk';
    const loseSquad = getSquadForSide(ms, loseSide);

    ms.scores[winSquad] = (ms.scores[winSquad] || 0) + 1;
    ms.lossStreak[winSquad] = 0;
    ms.lossStreak[loseSquad] = Math.min(4, (ms.lossStreak[loseSquad] || 0) + 1);
    ms.lastRoundWinSide = winSide;
    ms.lastRoundWinReason = reason || 'elimination';

    const winReward = (reason === 'bomb_detonated' || reason === 'bomb_defused')
      ? RULES.WIN_REWARD_OBJ
      : RULES.WIN_REWARD_ELIM;
    const baseLossReward = getLossBonus(ms.lossStreak[loseSquad] - 1);
    const plantedThisRound = ms.bomb.state === 'planted' || ms.bomb.state === 'defused' || ms.bomb.state === 'detonated';
    const atkPlantLossBonus = (loseSide === 'atk' && plantedThisRound) ? RULES.PLANT_LOSS_TEAM_BONUS : 0;

    if (Array.isArray(playersList)) {
      for (const p of playersList) {
        if (!p || !p.econ) continue;
        const isWin = p.team === winSide;
        const add = isWin
          ? winReward
          : (baseLossReward + (p.team === 'atk' ? atkPlantLossBonus : 0));
        p.econ.credits = clamp((p.econ.credits || 0) + add, 0, RULES.MAX_CREDITS);
      }
    }

    const matchWinner = checkMatchWinner(ms);
    if (matchWinner) {
      ms.winnerSquad = matchWinner;
      ms.phase = 'match_over';
      ms.phaseTimer = 0;
      return { matchOver: true, winnerSquad: matchWinner, halftime: false };
    }

    if (shouldSwapSides(ms.round) && !ms.swapped) {
      ms.phase = 'halftime';
      ms.phaseTimer = RULES.HALFTIME_SEC;
      return { matchOver: false, winnerSquad: null, halftime: true };
    }

    ms.phase = 'post_round';
    ms.phaseTimer = RULES.POST_ROUND_SEC;
    return { matchOver: false, winnerSquad: null, halftime: false };
  }

  function advanceToNextRound(ms, playersList) {
    const doingHalftimeSwap = ms.phase === 'halftime' && !ms.swapped;
    ms.round += 1;

    if (doingHalftimeSwap) {
      ms.swapped = true;
      ms.half = 2;
      const prevAtk = ms.sideSquads.atk;
      ms.sideSquads.atk = ms.sideSquads.def;
      ms.sideSquads.def = prevAtk;
      ms.lossStreak.alpha = 0;
      ms.lossStreak.bravo = 0;
    }

    if (Array.isArray(playersList)) {
      for (const p of playersList) {
        if (!p) continue;
        if (doingHalftimeSwap) {
          p.team = p.team === 'atk' ? 'def' : 'atk';
          p.econ = createPlayerEconomy({
            credits: RULES.START_CREDITS,
            loadoutIndex: p.econ ? p.econ.loadoutIndex : 0,
            plants: p.econ ? p.econ.plants : 0,
            defuses: p.econ ? p.econ.defuses : 0,
            assists: p.econ ? p.econ.assists : 0,
            damageDealt: p.econ ? p.econ.damageDealt : 0
          });
        } else if (!p.alive && p.econ) {
          // Dead players lose carried armor/kit/utility; survivors keep surviving gear!
          p.econ.armor = 0;
          p.econ.helmet = false;
          p.econ.defuseKit = false;
          p.econ.utility = createEmptyUtility();
        }
        p.hp = 100;
        p.alive = true;
      }
    }

    ms.phase = 'buy';
    ms.phaseTimer = RULES.BUY_SEC;
    ms.roundDamageLog = [];
    ms.bomb = {
      state: 'carried',
      carrierUid: null,
      site: null,
      pos: { x: 0, y: 0, z: 0 },
      fuseTimer: 0,
      plantProgress: 0,
      planterUid: null,
      defuseProgress: 0,
      defuserUid: null
    };

    // Assign single bomb carrier on Attackers (prefer human attacker if alive, else first attacker)
    if (Array.isArray(playersList)) {
      const attackers = playersList.filter((p) => p && p.team === 'atk');
      const humanAtk = attackers.find((p) => !p.isBot);
      const carrier = humanAtk || attackers[0] || null;
      if (carrier) {
        ms.bomb.carrierUid = carrier.uid;
      }
    }

    return { swapped: doingHalftimeSwap, round: ms.round, carrierUid: ms.bomb.carrierUid };
  }

  // Round Damage Breakdown Summary (for Death Screen card)
  function recordDamageHit(ms, hit) {
    if (!ms || !Array.isArray(ms.roundDamageLog) || !hit) return;
    ms.roundDamageLog.push({
      attackerUid: hit.attackerUid || '',
      attackerName: String(hit.attackerName || 'Enemy').slice(0, 24),
      victimUid: hit.victimUid || '',
      victimName: String(hit.victimName || 'Player').slice(0, 24),
      dmg: Math.max(0, Math.round(Number(hit.dmg) || 0)),
      armorDmg: Math.max(0, Math.round(Number(hit.armorDmg) || 0)),
      hs: Boolean(hit.hs),
      weapon: String(hit.weapon || 'rifle'),
      killed: Boolean(hit.killed)
    });
  }

  function buildDeathBreakdown(ms, victimUid) {
    const log = (ms && Array.isArray(ms.roundDamageLog)) ? ms.roundDamageLog : [];
    const byOpponent = new Map();
    let killer = null;

    const getRow = (uid, name) => {
      let row = byOpponent.get(uid);
      if (!row) {
        row = {
          uid,
          name: name || 'Opponent',
          dealtDmg: 0,
          dealtHits: 0,
          dealtHs: 0,
          takenDmg: 0,
          takenHits: 0,
          takenHs: 0,
          lastWeapon: 'rifle',
          isKiller: false
        };
        byOpponent.set(uid, row);
      }
      return row;
    };

    for (const ev of log) {
      if (ev.victimUid === victimUid && ev.attackerUid && ev.attackerUid !== victimUid) {
        const r = getRow(ev.attackerUid, ev.attackerName);
        r.takenDmg += ev.dmg;
        r.takenHits += 1;
        if (ev.hs) r.takenHs += 1;
        r.lastWeapon = ev.weapon;
        if (ev.killed) {
          r.isKiller = true;
          killer = {
            uid: ev.attackerUid,
            name: ev.attackerName,
            weapon: ev.weapon,
            headshot: ev.hs,
            totalTaken: r.takenDmg,
            hits: r.takenHits
          };
        }
      } else if (ev.attackerUid === victimUid && ev.victimUid && ev.victimUid !== victimUid) {
        const r = getRow(ev.victimUid, ev.victimName);
        r.dealtDmg += ev.dmg;
        r.dealtHits += 1;
        if (ev.hs) r.dealtHs += 1;
      }
    }

    const encounters = Array.from(byOpponent.values()).sort((a, b) => {
      if (a.isKiller !== b.isKiller) return a.isKiller ? -1 : 1;
      return (b.takenDmg + b.dealtDmg) - (a.takenDmg + a.dealtDmg);
    });

    return {
      killer,
      encounters
    };
  }

  // Continuous CS2 Bomb Plant / Defuse stepper (resets to 0 if player lets go!)
  function stepBombPlant(bomb, holding, inSiteId, playerUid, dt) {
    if (!bomb || bomb.state !== 'carried' || bomb.carrierUid !== playerUid) {
      return { planted: false, progress: 0 };
    }
    if (!holding || !inSiteId) {
      if (bomb.planterUid === playerUid) {
        bomb.plantProgress = 0;
        bomb.planterUid = null;
      }
      return { planted: false, progress: 0 };
    }
    bomb.planterUid = playerUid;
    bomb.plantProgress = clamp((bomb.plantProgress || 0) + Math.max(0, dt), 0, RULES.PLANT_SEC);
    if (bomb.plantProgress >= RULES.PLANT_SEC) {
      bomb.state = 'planted';
      bomb.site = inSiteId;
      bomb.fuseTimer = RULES.BOMB_FUSE_SEC;
      bomb.carrierUid = null;
      bomb.plantProgress = RULES.PLANT_SEC;
      bomb.planterUid = null;
      return { planted: true, progress: 1, site: inSiteId };
    }
    return { planted: false, progress: bomb.plantProgress / RULES.PLANT_SEC };
  }

  function stepBombDefuse(bomb, holding, nearBomb, playerUid, hasKit, dt) {
    if (!bomb || bomb.state !== 'planted') {
      return { defused: false, progress: 0, requiredSec: RULES.DEFUSE_SEC };
    }
    const reqSec = hasKit ? RULES.DEFUSE_KIT_SEC : RULES.DEFUSE_SEC;
    // Classic CS2 continuous defuse: letting go or moving away resets progress to 0!
    if (!holding || !nearBomb) {
      if (bomb.defuserUid === playerUid) {
        bomb.defuseProgress = 0;
        bomb.defuserUid = null;
      }
      return { defused: false, progress: 0, requiredSec: reqSec };
    }
    if (bomb.defuserUid && bomb.defuserUid !== playerUid) {
      return { defused: false, progress: bomb.defuseProgress / reqSec, requiredSec: reqSec, busy: true };
    }
    bomb.defuserUid = playerUid;
    bomb.defuseProgress = clamp((bomb.defuseProgress || 0) + Math.max(0, dt), 0, reqSec);
    if (bomb.defuseProgress >= reqSec) {
      bomb.state = 'defused';
      bomb.defuseProgress = reqSec;
      bomb.defuserUid = null;
      return { defused: true, progress: 1, requiredSec: reqSec };
    }
    return { defused: false, progress: bomb.defuseProgress / reqSec, requiredSec: reqSec };
  }

  function dropBomb(bomb, playerUid, dropPos) {
    if (!bomb || bomb.state !== 'carried' || bomb.carrierUid !== playerUid) return false;
    bomb.state = 'dropped';
    bomb.carrierUid = null;
    bomb.plantProgress = 0;
    bomb.planterUid = null;
    if (dropPos) {
      bomb.pos = { x: Number(dropPos.x) || 0, y: Number(dropPos.y) || 0, z: Number(dropPos.z) || 0 };
    }
    return true;
  }

  function tryPickupBomb(bomb, playerUid, playerTeam, playerPos, pickupRadius) {
    if (!bomb || bomb.state !== 'dropped' || playerTeam !== 'atk' || !playerPos) return false;
    const rad = Number(pickupRadius) || 2.1;
    const dx = (playerPos.x || 0) - (bomb.pos.x || 0);
    const dy = (playerPos.y || 0) - (bomb.pos.y || 0);
    const dz = (playerPos.z || 0) - (bomb.pos.z || 0);
    if (dx * dx + dz * dz <= rad * rad && Math.abs(dy) <= 2.4) {
      bomb.state = 'carried';
      bomb.carrierUid = playerUid;
      return true;
    }
    return false;
  }

  return {
    RULES,
    TEAM_COLORS,
    SHOP_ITEMS,
    SHOP_ORDER,
    SOLO_QUEUE_TIERS,
    TACTICAL_COMMS,
    createEmptyUtility,
    countThrowables,
    createPlayerEconomy,
    getItemEffectiveCost,
    canBuyItem,
    buyItem,
    applyTacticalDamage,
    getKillReward,
    getLossBonus,
    buildDemolitionRoster,
    computeBotBuyPlan,
    createMatchState,
    getSquadForSide,
    getSideForSquad,
    shouldSwapSides,
    checkMatchWinner,
    resolveRoundWin,
    advanceToNextRound,
    recordDamageHit,
    buildDeathBreakdown,
    stepBombPlant,
    stepBombDefuse,
    dropBomb,
    tryPickupBomb
  };
});
