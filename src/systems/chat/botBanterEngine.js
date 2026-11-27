// VELOCITY — Self-Contained Human-Like Bot Lobby & Banter Engine (Zero API Cost)
// UMD Module (window.BotBanterEngine + Node.js module.exports)
// Provides persistent per-bot personas, dynamic tilt tracking, live match memory,
// 18+ intent local player-chat NLU, bot-to-bot cross-talk, and arena map voting logic.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.BotBanterEngine = factory(root);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const ARENA_IDS = [
    'arena_surf',
    'arena_aim',
    'arena_spire',
    'arena_cargo',
    'arena_skyline',
    'arena_canyon'
  ];

  const ARENA_SHORT_NAMES = {
    arena_surf: 'surf',
    arena_aim: 'courtyard',
    arena_spire: 'spire',
    arena_cargo: 'cargo',
    arena_skyline: 'skyline',
    arena_canyon: 'canyon'
  };

  // Strict zero-slur safety guardrail while allowing authentic raw FPS profanity
  const SLUR_GUARD_RE = /\b(n[i1!|]gg(?:er|a|as|ers)|f[a4@]gg?(?:ot|ots|s)?|r[e3]t[a4@]rd(?:ed|s)?|k[i1!]ke|ch[i1!]nk|sp[i1!]c|tr[a4@]nn(?:y|ies)|kys|kill\s+yourself)\b/i;

  function containsSlur(text) {
    return SLUR_GUARD_RE.test(String(text || ''));
  }

  // 6 distinct human player chat personas
  const PERSONA_IDS = Object.freeze(['rager', 'sweat', 'gremlin', 'vet', 'quiet', 'hype']);

  const PERSONA_PROFILES = Object.freeze({
    rager: {
      id: 'rager',
      chattiness: 1.22,
      tiltGain: 22,
      tiltDecay: 6,
      capsAtHighTilt: true,
      doubleTextChance: 0.28,
      typingMsPerChar: 44
    },
    sweat: {
      id: 'sweat',
      chattiness: 1.05,
      tiltGain: 15,
      tiltDecay: 10,
      capsAtHighTilt: false,
      doubleTextChance: 0.14,
      typingMsPerChar: 38
    },
    gremlin: {
      id: 'gremlin',
      chattiness: 1.18,
      tiltGain: 10,
      tiltDecay: 12,
      capsAtHighTilt: false,
      doubleTextChance: 0.24,
      typingMsPerChar: 46
    },
    vet: {
      id: 'vet',
      chattiness: 0.92,
      tiltGain: 12,
      tiltDecay: 9,
      capsAtHighTilt: false,
      doubleTextChance: 0.12,
      typingMsPerChar: 52
    },
    quiet: {
      id: 'quiet',
      chattiness: 0.42,
      tiltGain: 11,
      tiltDecay: 10,
      capsAtHighTilt: false,
      doubleTextChance: 0.06,
      typingMsPerChar: 58
    },
    hype: {
      id: 'hype',
      chattiness: 1.15,
      tiltGain: 16,
      tiltDecay: 11,
      capsAtHighTilt: true,
      doubleTextChance: 0.22,
      typingMsPerChar: 42
    }
  });

  // Weapon-specific banter pools (grounded in actual VELOCITY weapons)
  const WEAPON_BANTER = Object.freeze({
    sniper: {
      killer: [
        'cleanest flick of my life',
        'sit down',
        'dont peek mid with an awp staring at you dumbass',
        'point and click adventure',
        'deleted your whole shit',
        'scoped in before you even swung',
        'head gone'
      ],
      victim: [
        'awp crutch is fucking crazy',
        'hardscoping a corner like your life depends on it',
        'how tf did that hit me',
        'bro has not moved from that angle all game',
        'one shot body shot cheese bruh',
        'ok sniper god chill tf out',
        'literally walked into a scoped awp my bad'
      ]
    },
    shotgun: {
      killer: [
        'eat buckshot bitch',
        'barrel stuffed your ass',
        'step closer next time lmao',
        'pump to the chest',
        'sent you back to the menu',
        'get out of my face'
      ],
      victim: [
        'shotgun rat',
        'sitting in a corner with a pump is pathetic',
        'bro how much range does that shotgun have wtf',
        'actually using a shotgun in 2026',
        'zero aim required with that thing',
        'camp harder with the pump bro'
      ]
    },
    melee: {
      killer: [
        'GET SLICED BOZO',
        'brought a sword to a gunfight and won lmao',
        'clipped his ass with the blade',
        'uninstall right now',
        'how do you let me knife you',
        'free clip thanks'
      ],
      victim: [
        'WHO BRINGS A FUCKING SWORD TO A GUNFIGHT',
        'mf really knifed me im done',
        'nah im actually uninstalling',
        'how did i miss every bullet and get sliced',
        'bro was swinging a katana at mach 5 wtf',
        'do not clip that shit'
      ]
    },
    handcannon: {
      killer: [
        'big iron to the dome',
        'one tap is disgusting',
        'deagle diff',
        'sit tf down',
        'pocket sniper',
        'cleanest tap all day'
      ],
      victim: [
        'lucky ass spam shot',
        'how did that one tap me across the map',
        'revolver damage is bullshit',
        'ok cowboy calm down',
        'actually got two pieced by a pistol bro'
      ]
    },
    smg: {
      killer: [
        'melted your shit',
        'too slow bro',
        'run and gun diff',
        'shredded',
        'break your ankles'
      ],
      victim: [
        'hold w and pray huh',
        'smg crutch',
        'bro is flying around at 90mph spraying',
        'actually got sprayed down from narnia',
        'zero recoil ass gun'
      ]
    },
    streak: {
      killer: [
        'boom bitch',
        'enjoy the killstreak',
        'get blown up lmao',
        'clear the lobby'
      ],
      victim: [
        'who gave this mf an rpg',
        'zero skill killstreak bullshit',
        'bro really pulled out the cheese weapon',
        'alright bro chill with the rockets'
      ]
    }
  });

  // Persona-flavored combat banter
  const PERSONA_COMBAT = Object.freeze({
    rager: {
      kill: [
        'FINALLY sit the fuck down',
        'get shit on',
        'yeah take that bitch',
        'dogshit',
        'eat shit',
        'how does that taste huh'
      ],
      killedLow: [
        'bro how did that hit me',
        'nah my bullets just disappeared',
        'actually bullshit timing',
        'i shot first wtf',
        'terrible spawn bro'
      ],
      killedHigh: [
        'HOW THE FUCK DID YOU NOT DIE',
        'THIS GAME IS ACTUAL DOGSHIT',
        'BRO MY HITREG IS NONEXISTENT',
        'I PUT 6 BULLETS IN YOUR HEAD WTF',
        'STOP SPAWNING ME IN FRONT OF HIM',
        'FUCK THIS GUN BRO IM WHIFFING EVERYTHING'
      ],
      round: [
        'alright im locking in for real now',
        'if i get bullshitted one more time',
        'lets fucking go'
      ]
    },
    sweat: {
      kill: [
        'sit',
        'diff',
        'free',
        'gn',
        'too easy',
        'dogwater',
        'clip that',
        'not even close'
      ],
      killedLow: [
        'lucky',
        'nice timing',
        'i whiffed',
        'bad swing by me',
        'whatever'
      ],
      killedHigh: [
        'actually getting timinged every life',
        'no way you won that gunfight',
        'you play so weird bro',
        'cringe ass angle',
        'literally only killing me from behind'
      ],
      round: [
        'freelo',
        'run it',
        'glhf i guess'
      ]
    },
    gremlin: {
      kill: [
        'lmao folded',
        'sent u to the shadow realm',
        'bro forgot to shoot back',
        'my bad gang',
        'rip bozo',
        'get cooked'
      ],
      killedLow: [
        'ow wtf',
        'bro deleted my whole bloodline',
        'ok damn chill',
        'i was literally scratching my nose',
        'unfair i blinked'
      ],
      killedHigh: [
        'bro leave me alone damn',
        'why are u hunting me specifically',
        'im literally 1v1ing my own mouse rn',
        'my cat walked across my keyboard stop',
        'bro let me breathe for 2 seconds'
      ],
      round: [
        'yo',
        'who ready to lose',
        'im playing on 40fps pray for me'
      ]
    },
    vet: {
      kill: [
        'what were you even looking at',
        'embarrassing',
        'free kill appreciate it',
        'checked your corners? guess not',
        'read you like a picture book'
      ],
      killedLow: [
        'alright fair shot',
        'sold that fight hard',
        'yeah i deserved that',
        'clean ngl'
      ],
      killedHigh: [
        'holy fuck i cant buy a kill right now',
        'how are you winning every single 50/50',
        'my aim went on vacation',
        'this lobby is cursed'
      ],
      round: [
        'glhf',
        'lets see who actually has hands',
        'dont sell this time'
      ]
    },
    quiet: {
      kill: [
        'gn',
        'clean',
        'sit',
        'unlucky'
      ],
      killedLow: [
        'ns',
        'wp',
        'mb'
      ],
      killedHigh: [
        'wtf',
        'bro',
        'ok'
      ],
      round: [
        'glhf',
        'yo'
      ]
    },
    hype: {
      kill: [
        'YOOO GET SHIT ON',
        'SMOKED YOUR ASS',
        'BRO DID YOU SEE THAT',
        'NASTY AS HELL',
        'LETS GOOO'
      ],
      killedLow: [
        'BRO WHAT WAS THAT SHOT',
        'ok ok i see you',
        'damn u actually fried me',
        'nah that was disgusting'
      ],
      killedHigh: [
        'BRO STOP JUMPING LIKE A KANGAROO',
        'WHY AM I GETTING COOKED RN',
        'NAHHH NO WAY THAT HIT ME',
        'IM ACTUALLY LOSING MY MIND'
      ],
      round: [
        'YOOO WE RUNNING IT',
        'lets get active',
        'glhf boys'
      ]
    }
  });

  // Special match-context pools
  const CONTEXT_POOLS = Object.freeze({
    headshotKill: [
      'right between the eyes',
      'clean dome',
      'dinked your shit',
      'one tap to the forehead',
      'headshot diff'
    ],
    headshotVictim: [
      'instant dome wtf',
      'did not even get to shoot back',
      'nice headshot fuck you',
      'my head is apparently the size of a planet',
      'instant delete button'
    ],
    domination: [
      '{count}-0 sit the fuck down',
      'bro thats {count} in a row stop peeking me',
      'living rent free in your head rn',
      '{target} is literally feeding me',
      'do you ever learn {target}?'
    ],
    revenge: [
      'FINALLY got your ass',
      'yeah get that shit back',
      'took me long enough jesus',
      'nobody kills me 4 times in a row',
      'there we go fuck you'
    ],
    instantKarma: [
      'talked all that shit just to get folded',
      'LMFAO instant karma',
      'aged like milk bro',
      'keep typing while dead lmao',
      'all that talking for what'
    ],
    voidMockery: [
      'LMFAO BRO WALKED OFF THE MAP',
      'gravity diff',
      'did {victim} just jump into the void',
      'bro lost a 1v1 to the floor',
      'nice jump dumbass lmao',
      'gravity is top fragging'
    ],
    voidSelfExcuse: [
      'my spacebar didnt fucking work',
      'lagged right off the edge bro',
      'who put a hole right there',
      'nobody saw that',
      'slippery ass floor wtf',
      'my finger slipped shut up'
    ],
    lowHpAttacker: [
      'HOW ARE YOU NOT DEAD',
      'bro is 1 hp running for his life',
      '1 hp and a dream huh',
      'literally 1 bullet away wtf',
      'stop running youre 1 shot'
    ],
    playerStreak: [
      'bro someone kill {player} wtf',
      'alright {player} turn the cheats off',
      '{player} is actually sweating his ass off',
      'how is {player} on a {kills} streak rn',
      'take a shower {player} damn',
      'ok {player} chill tf out'
    ],
    botKilledBotKiller: [
      'sit down {victim}',
      'too slow {victim}',
      'free kill {victim}',
      'get smoked {victim}'
    ],
    botKilledBotVictim: [
      'bro {killer} came out of nowhere wtf',
      'fuck off {killer}',
      '{killer} stop third partying me',
      'actually got caught reloading by {killer}'
    ],
    bottomFragCallout: [
      'bro youre {k}-{d} shut the fuck up',
      'talking crazy from dead last',
      'check the scoreboard before typing lmao',
      'zero business talking shit at {k}-{d}'
    ],
    pileOn: [
      'LMFAO',
      'hes not wrong tho',
      'damn he cooked you',
      'cap',
      'bro stop crying',
      'both of yall are ass',
      'facts',
      'nah thats crazy'
    ],
    doubleTextAfterDeath: [
      'actually how tf did that hit me',
      'on my screen i was behind the wall',
      'nah im actually done',
      'whatever bro'
    ]
  });

  // Map-specific opinions across all 6 VELOCITY arenas
  const MAP_OPINIONS = Object.freeze({
    arena_surf: {
      love: [
        'vote surf',
        'surf stadium goes hard',
        'run surf lets fly around',
        'surf bowls are peak'
      ],
      hate: [
        'fuck surf stadium i keep falling off',
        'anyone voting surf just wants void kills',
        'nah not surf bro',
        'surf is pure chaos hell no'
      ],
      open: [
        'try not to fall off the map this time',
        'surf stadium lets go'
      ]
    },
    arena_aim: {
      love: [
        'aim courtyard pls',
        'vote courtyard best map in the game',
        'run courtyard',
        'courtyard for real gunfights'
      ],
      hate: [
        'courtyard is just awp campers in mid window',
        'nah we played courtyard too much',
        'fuck courtyard bro'
      ],
      open: [
        'dont peek mid window lol',
        'courtyard lets get it'
      ]
    },
    arena_spire: {
      love: [
        'vote spire',
        'helix spire is pure chaos lets go',
        'run spire bro'
      ],
      hate: [
        'who tf voted spire',
        'anyone voting spire needs jail time',
        'nah not spire getting shot from 3 floors up',
        'fuck helix spire'
      ],
      open: [
        'watch the roof campers on spire',
        'spire time lets go'
      ]
    },
    arena_cargo: {
      love: [
        'vote cargo',
        'cargo killhouse so we can actually fight',
        'run cargo pls',
        'cargo is instant action'
      ],
      hate: [
        'cargo is just shotgun rats everywhere',
        'nah cargo spawns are cooked',
        'fuck cargo killhouse'
      ],
      open: [
        'watch the containers',
        'cargo lets scrap'
      ]
    },
    arena_skyline: {
      love: [
        'vote skyline',
        'skyline rooftops go hard',
        'run skyline bro'
      ],
      hate: [
        'nah skyline is void simulator',
        'fuck skyline i hate falling off roofs',
        'who wants skyline ew'
      ],
      open: [
        'dont fall off the helipad',
        'skyline run lets go'
      ]
    },
    arena_canyon: {
      love: [
        'vote canyon',
        'redrock canyon for sniper duels',
        'run canyon pls'
      ],
      hate: [
        'canyon is way too fucking big bro',
        'nah not redrock canyon',
        'fuck canyon running simulator'
      ],
      open: [
        'snipers on the bridge calling it now',
        'canyon lets go'
      ]
    }
  });

  const POST_MATCH_POOLS = Object.freeze({
    winnerCocky: [
      'gg ez',
      'too fucking easy',
      'scoreboard',
      'carry was heavy as hell',
      'sit down lobby',
      'gg thanks for the warm up'
    ],
    winnerChill: [
      'gg',
      'ggs close one',
      'wp yall',
      'ggs that was fun'
    ],
    loserSalty: [
      'shit lobby',
      'run it back i was warming up',
      'bullshit spawns all match',
      'literally got third partied 10 times',
      'not gg that was cancer',
      'lucky as hell'
    ],
    loserChill: [
      'gg',
      'ggs',
      'wp {winner}',
      'damn {winner} cooked us',
      'run it back'
    ],
    voteAgree: [
      'w vote',
      'finally someone with a brain',
      'yeah lock {map} in',
      'bet im voting {map} too'
    ],
    voteDisagree: [
      'bro really voted {map} wtf',
      'nah veto {map}',
      'who tf wants {map}',
      'stop voting {map} bro'
    ]
  });

  // Live local reply banks for 18+ player intents
  const REPLY_POOLS = Object.freeze({
    bot_accusation: [
      'bro im literally eating pizza with one hand chill',
      'calling everyone a bot cuz youre getting cooked is crazy',
      'beep boop shut the fuck up',
      'my bad forgot real players arent allowed to shoot back',
      'nah im just high as shit rn',
      'coping so hard you think im an ai lmao',
      'im on a laptop trackpad relax bro',
      'whatever helps you sleep at night'
    ],
    hackusation: [
      'thanks for the compliment',
      'bro thinks im cheating on a 60hz monitor',
      'report me then idc',
      'hit aimlabs instead of crying in chat',
      'yeah bro i bought cheats for a browser game totally',
      'stay mad',
      'skill issue honestly'
    ],
    camping_salt: [
      'its called holding an angle dumbass',
      'check your corners next time',
      'why would i push when you sprint into my crosshair',
      'cry about it',
      'not my fault you run straight down mid every life',
      'stay mad bro'
    ],
    weapon_sniper: [
      'cry about the awp more',
      'stop peeking long angles then',
      'if its so easy pick it up yourself',
      'sniper diff stay mad'
    ],
    weapon_shotgun: [
      'dont run into my face then lol',
      'shotgun stays winning',
      'keep crying about the pump',
      'close range is mine bro'
    ],
    weapon_melee: [
      'getting sliced is a personal problem bro',
      'how do you lose to a sword with a gun lmao',
      'katana diff',
      'shouldve hit your shots'
    ],
    weapon_other: [
      'use whatever gun you want stop whining',
      'blaming the weapon is crazy',
      'literally a skill issue not the gun',
      'pick it up then if its broken'
    ],
    lag_excuse: [
      'sure blame the wifi',
      'classic excuse',
      'mcdonalds wifi diff',
      'tbf hitreg felt kinda ass for a second',
      'plug in an ethernet cable bro',
      'yeah ok sure it was lag'
    ],
    rematch_1v1: [
      'run it back then',
      'bet dont dodge',
      'im down lets run it',
      'you dont want that smoke'
    ],
    direct_insult_winning: [
      'scoreboard says otherwise dumbass',
      'check the board before talking shit',
      'bro is losing and still typing essays',
      'all that talking while down on kills lmao',
      'cry harder',
      'sit down'
    ],
    direct_insult_losing: [
      'bro shut the fuck up',
      'yeah yeah wait til next map',
      'sweating your balls off in a pub lobby',
      'go take a shower',
      'talk all you want youre still cringe',
      'whatever bro'
    ],
    direct_insult_even: [
      'keep typing instead of playing',
      'stfu and shoot your gun',
      'youre ass too relax',
      'mad for what lmao',
      'say less and play'
    ],
    profanity_rage: [
      'bro is actually crashing out',
      'calm down before you break your desk',
      'take a deep breath lmao',
      'someone is tilted as hell',
      'stay mad bitch'
    ],
    laugh: [
      'im crying',
      'that actually made no sense',
      'lmao right',
      'this lobby is cooked',
      'idk what just happened either'
    ],
    compliment: [
      'ty',
      'preciate it',
      'all luck tbh',
      'nah that was kinda gross',
      'respect'
    ],
    gg: [
      'gg',
      'ggs',
      'wp',
      'gg ez',
      'ggs close as hell',
      'respect gg'
    ],
    greeting: [
      'yo',
      'sup',
      'whats good',
      'glhf',
      'yo ready to get cooked?'
    ],
    how_question: [
      'honestly idk either',
      'heard your footsteps from a mile away',
      'just clicked on your head bro',
      'ask the game not me',
      'pure luck ngl'
    ],
    ready_question: [
      'born ready',
      'yeah lets go',
      'been waiting bro',
      'run it'
    ],
    scoreboard_talk: [
      'scoreboard doesnt lie',
      'im warming up chill',
      'kills arent everything ok (im coping)',
      'look at the board again in 2 minutes'
    ],
    apology: [
      'all good',
      'youre fine bro',
      'dont worry about it',
      'nah you owe me a kill now'
    ],
    general: [
      'fair enough',
      'bro is typing mid fight',
      'alright man',
      'wild take',
      'real',
      'bro what are you even saying',
      'focus up lmao'
    ]
  });

  // Persistent per-lobby state
  const botProfiles = new Map(); // key -> profile
  let matchMemory = createEmptyMatchMemory();

  function createEmptyMatchMemory() {
    return {
      killPairs: new Map(), // "killerKey->victimKey" -> consecutive kills
      recentTrashTalk: new Map(), // botKey -> { ts, line }
      lastPlayerPartner: null, // { uid, name, ts }
      lobbyRecentLines: [],
      lastVoteBanterAt: 0
    };
  }

  function resetMatchMemory() {
    matchMemory = createEmptyMatchMemory();
    for (const profile of botProfiles.values()) {
      profile.tilt = Math.max(0, Math.round(profile.tilt * 0.25));
      profile.lastTrashTalkAt = 0;
    }
  }

  function clearAllProfiles() {
    botProfiles.clear();
    matchMemory = createEmptyMatchMemory();
  }

  function hashString(str) {
    const s = String(str || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function botKey(bot) {
    if (!bot) return '';
    return String(bot.uid || bot.name || '').trim().toLowerCase();
  }

  function getOrCreateBotProfile(bot) {
    const key = botKey(bot);
    if (!key) return null;
    let profile = botProfiles.get(key);
    if (profile) {
      if (bot.name && profile.name !== bot.name) profile.name = bot.name;
      return profile;
    }
    const seed = hashString(key + ':' + String(bot.name || ''));
    const personaId = PERSONA_IDS[seed % PERSONA_IDS.length];
    const fav1 = ARENA_IDS[seed % ARENA_IDS.length];
    const fav2 = ARENA_IDS[(seed + 2) % ARENA_IDS.length];
    const hate1 = ARENA_IDS[(seed + 3) % ARENA_IDS.length];
    const hate2 = ARENA_IDS[(seed + 5) % ARENA_IDS.length];
    profile = {
      key,
      uid: bot.uid || key,
      name: bot.name || 'player',
      personaId,
      tilt: (seed % 14),
      favoriteMaps: [fav1, fav2],
      hatedMaps: [hate1, hate2],
      lastSpokeAt: 0,
      lastTrashTalkAt: 0
    };
    botProfiles.set(key, profile);
    return profile;
  }

  function getBotProfile(bot) {
    return getOrCreateBotProfile(bot);
  }

  function normalizeWeaponClass(weapon) {
    const w = String(weapon || '').toLowerCase();
    if (!w) return 'rifle';
    if (/(awp|ssg|sniper|mk14|mk_14|rail)/.test(w)) return 'sniper';
    if (/(shotgun|m870|db12|db_12|pump)/.test(w)) return 'shotgun';
    if (/(knife|katana|blade|sword|melee)/.test(w)) return 'melee';
    if (/(deagle|revolver|r88|r_88|magnum|usp|g18|akimbo|pistol)/.test(w)) return 'handcannon';
    if (/(smg|vx9|mp7|mp_7|hb7|hb_7|vector)/.test(w)) return 'smg';
    if (/(rpg|minigun|m134|nuke|streak)/.test(w)) return 'streak';
    return 'rifle';
  }

  function pickNonRepeating(pool, rng) {
    if (!Array.isArray(pool) || !pool.length) return '';
    const rand = typeof rng === 'function' ? rng : Math.random;
    const recentSet = new Set(matchMemory.lobbyRecentLines);
    const fresh = pool.filter((line) => line && !recentSet.has(line) && !containsSlur(line));
    const source = fresh.length ? fresh : pool.filter((line) => line && !containsSlur(line));
    if (!source.length) return '';
    return source[Math.floor(rand() * source.length) % source.length];
  }

  function rememberLine(line) {
    if (!line) return;
    matchMemory.lobbyRecentLines.push(line);
    if (matchMemory.lobbyRecentLines.length > 28) {
      matchMemory.lobbyRecentLines = matchMemory.lobbyRecentLines.slice(-28);
    }
  }

  function fillTemplate(template, vars) {
    if (!template) return '';
    let out = String(template);
    const data = vars || {};
    for (const k of Object.keys(data)) {
      out = out.split('{' + k + '}').join(String(data[k]));
    }
    return out;
  }

  function stylizeForPersona(text, profile, rng) {
    let out = String(text || '').trim();
    if (!out || !profile) return out;
    const rand = typeof rng === 'function' ? rng : Math.random;
    const spec = PERSONA_PROFILES[profile.personaId] || PERSONA_PROFILES.vet;
    if (spec.capsAtHighTilt && profile.tilt >= 65 && out.length <= 42 && rand() < 0.45) {
      out = out.toUpperCase();
    } else if (profile.personaId === 'gremlin' || profile.personaId === 'quiet') {
      if (out !== out.toUpperCase()) out = out.toLowerCase();
    }
    return out;
  }

  function computeTypingDelayMs(text, profile, opts) {
    const clean = String(text || '');
    const spec = (profile && PERSONA_PROFILES[profile.personaId]) || PERSONA_PROFILES.vet;
    const urgent = Boolean(opts && opts.urgent);
    const rand = (opts && typeof opts.rng === 'function') ? opts.rng : Math.random;
    const reaction = urgent ? (320 + rand() * 380) : (520 + rand() * 680);
    const typing = clean.length * (spec.typingMsPerChar || 45) * (0.85 + rand() * 0.35);
    const total = Math.round(reaction + typing);
    return Math.max(450, Math.min(3800, total));
  }

  function extractNameTokens(name) {
    const raw = String(name || '').trim();
    if (!raw) return [];
    const low = raw.toLowerCase();
    const tokens = new Set([low]);
    // Split camelCase, underscores, dashes, xX_..._Xx wrappers, and trailing numbers
    const stripped = raw
      .replace(/^xx[_\-\s]*/i, '')
      .replace(/[_\-\s]*xx$/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\d+/g, ' ');
    for (const part of stripped.toLowerCase().split(/\s+/)) {
      if (part.length >= 3 && !['the', 'and', 'for', 'pro', 'its', 'not', 'you'].includes(part)) {
        tokens.add(part);
      }
    }
    return Array.from(tokens);
  }

  function findMentionedBot(text, roster) {
    if (!text || !Array.isArray(roster) || !roster.length) return null;
    const low = String(text).toLowerCase();
    // Exact full-name substring match first
    for (const bot of roster) {
      if (!bot || !bot.name) continue;
      const bLow = bot.name.toLowerCase();
      if (bLow.length >= 3 && low.includes(bLow)) return bot;
    }
    // Natural stem/nickname match (e.g., "microwave" -> MicrowaveBurrito, "tyler" -> tyler_04)
    const words = low.replace(/[^a-z0-9_\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (const bot of roster) {
      if (!bot || !bot.name) continue;
      const tokens = extractNameTokens(bot.name);
      for (const tok of tokens) {
        if (tok.length >= 4 && words.includes(tok)) return bot;
      }
    }
    return null;
  }

  function detectMapMention(text) {
    const low = String(text || '').toLowerCase();
    if (/\bsurf\b|stadium/.test(low)) return 'arena_surf';
    if (/\bcourtyard\b|\baim\s+court/.test(low)) return 'arena_aim';
    if (/\bspire\b|\bhelix\b/.test(low)) return 'arena_spire';
    if (/\bcargo\b|\bkillhouse\b/.test(low)) return 'arena_cargo';
    if (/\bskyline\b|\brooftop/.test(low)) return 'arena_skyline';
    if (/\bcanyon\b|\bredrock\b/.test(low)) return 'arena_canyon';
    return null;
  }

  function detectWeaponMention(text) {
    const low = String(text || '').toLowerCase();
    if (/\b(awp|sniper|sniping|hardscop\w*|quickscop\w*|ssg)\b/.test(low)) return 'sniper';
    if (/\b(shotgun|pump|m870|db12|buckshot|spas)\b/.test(low)) return 'shotgun';
    if (/\b(katana|sword|knife|knif\w*|blade|melee)\b/.test(low)) return 'melee';
    if (/\b(deagle|revolver|magnum|smg|rpg|nuke|rifle|minigun|railgun)\b/.test(low)) return 'other';
    return null;
  }

  // Backwards-compatible high-level classifier (preserves existing 5 core categories)
  function classifyPlayerMessage(value) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text) return 'empty';
    if (/\b(hi|hey|hello|yo|sup|glhf|whats up|what's up|wsg)\b/.test(text)) return 'greeting';
    if (/\b(gg|ggs|wp|well played|nice shot|nice|good game)\b/.test(text)) return 'gg';
    if (/\b(ez|easy|noob|trash|bot|bots|ai|npc|bad|skill issue|diff|owned|rekt|dogshit|ass|sit|suck|sucks|garb\w*|cringe|clown|bitch|stfu|fuck\s+you)\b/.test(text)) return 'taunt';
    if (text.includes('?')) return 'question';
    return 'general';
  }

  // Deep zero-API NLU analyzer (18+ intents + entity extraction)
  function analyzePlayerMessage(rawText, roster, state) {
    const text = String(rawText == null ? '' : rawText).replace(/\s+/g, ' ').trim();
    const low = text.toLowerCase();
    if (!low) {
      return { intent: 'empty', legacyCategory: 'empty', mentionedBot: null, mentionedMap: null, mentionedWeapon: null };
    }

    const mentionedBot = findMentionedBot(text, roster);
    const mentionedMap = detectMapMention(text);
    const mentionedWeapon = detectWeaponMention(text);
    const legacyCategory = classifyPlayerMessage(text);

    let intent = 'general';

    if (/\b(are\s+you\s+(guys\s+)?bots?|actual\s+bots?|literal\s+bots?|real\s+players?|fake\s+players?|you\s+guys\s+ai|is\s+this\s+ai|npc|npcs|coded|scripted|not\s+real)\b/.test(low) ||
        (/\bbot\b|\bbots\b/.test(low) && (low.includes('?') || /\b(real|ai|actual|literal|fake)\b/.test(low)))) {
      intent = 'bot_accusation';
    } else if (/\b(hack|hacks|hacker|hacking|cheat|cheats|cheater|cheating|aimbot|walls|walling|wallhacks|triggerbot|spinbot|sus|report|reported)\b/.test(low)) {
      intent = 'hackusation';
    } else if (/\b(camp|camper|camping|rat|ratting|corner|hardscop\w*|hiding|sitting\s+in)\b/.test(low)) {
      intent = 'camping_salt';
    } else if (mentionedWeapon && /\b(crutch|broken|op|annoying|cringe|rat|spam|abuse|hate|why|using|fuck|shit|ass|only|no\s+skill)\b/.test(low)) {
      intent = 'weapon_' + mentionedWeapon;
    } else if (mentionedMap || /\b(vote|voting|next\s+map|rematch|this\s+map|bad\s+map|good\s+map)\b/.test(low)) {
      intent = 'map_talk';
    } else if (/\b(lag|lagging|ping|fps|stutter|desync|hitreg|no\s+reg|packet|wifi|server)\b/.test(low)) {
      intent = 'lag_excuse';
    } else if (/\b(1v1|run\s+it\s+back|rematch|play\s+again)\b/.test(low)) {
      intent = 'rematch_1v1';
    } else if (/\b(scoreboard|score|kills|kd|k\/d|bottom\s+frag|top\s+frag|carrying)\b/.test(low)) {
      intent = 'scoreboard_talk';
    } else if (/\b(gg|ggs|good\s+game)\b/.test(low)) {
      intent = 'gg';
    } else if (/\b(nice\s+shot|nice|clean|ns|wp|well\s+played|sick|insane|crazy\s+shot|respect|good\s+shot)\b/.test(low)) {
      intent = 'compliment';
    } else if (/\b(sorry|my\s+bad|mb|oops)\b/.test(low)) {
      intent = 'apology';
    } else if (/\b(fuck\s+you|stfu|shut\s+the\s+fuck\s+up|shut\s+up|trash|dogshit|dogwater|you\s+suck|ur\s+bad|youre\s+bad|ur\s+ass|youre\s+ass|ez|easy|skill\s+issue|diff|owned|rekt|noob|sit\s+down|clown|loser|bitch|garbage|bot)\b/.test(low)) {
      intent = 'direct_insult';
    } else if (/\b(fuck|fucking|bullshit|wtf|tf|shit|bs|ass\s+game|hate\s+this)\b/.test(low)) {
      intent = 'profanity_rage';
    } else if (/\b(hi|hey|hello|yo|sup|glhf|whats\s+up|what's\s+up|wsg)\b/.test(low)) {
      intent = 'greeting';
    } else if (/\b(lmao|lmfao|lol|haha|hahaha|dead|crying|aint\s+no\s+way|no\s+way|bruh)\b/.test(low)) {
      intent = 'laugh';
    } else if (/\b(ready|anyone\s+here|u\s+there|you\s+there|start)\b/.test(low) && low.includes('?')) {
      intent = 'ready_question';
    } else if (low.includes('?') || /^(how|why|what|where|who)\b/.test(low)) {
      intent = 'how_question';
    } else if (mentionedWeapon) {
      intent = 'weapon_' + mentionedWeapon;
    }

    return {
      intent,
      legacyCategory,
      mentionedBot,
      mentionedMap,
      mentionedWeapon,
      isMatchOver: Boolean(state && state.phase === 'match_over')
    };
  }

  function getScoreboardContext(state, bot) {
    const players = (state && Array.isArray(state.players)) ? state.players : [];
    const sorted = players.slice().sort((a, b) => ((b.score || b.kills || 0) - (a.score || a.kills || 0)));
    const localUid = state && state.localUid;
    const localPlayer = sorted.find((p) => p && p.uid === localUid) || null;
    const botPlayer = bot ? sorted.find((p) => p && (p.uid === bot.uid || p.name === bot.name)) : null;
    const botRank = botPlayer ? sorted.indexOf(botPlayer) + 1 : 0;
    const localRank = localPlayer ? sorted.indexOf(localPlayer) + 1 : 0;
    const botKills = botPlayer ? (botPlayer.kills || 0) : 0;
    const botDeaths = botPlayer ? (botPlayer.deaths || 0) : 0;
    const localKills = localPlayer ? (localPlayer.kills || 0) : 0;
    const localDeaths = localPlayer ? (localPlayer.deaths || 0) : 0;
    const isBottomFrag = sorted.length >= 3 && botRank === sorted.length && botDeaths >= 3 && botKills < botDeaths;
    return {
      sorted,
      localPlayer,
      botPlayer,
      botRank,
      localRank,
      botKills,
      botDeaths,
      localKills,
      localDeaths,
      isBottomFrag
    };
  }

  function pickOtherBot(roster, excludeBot, rng) {
    if (!Array.isArray(roster) || roster.length < 2) return null;
    const rand = typeof rng === 'function' ? rng : Math.random;
    const exKey = botKey(excludeBot);
    const others = roster.filter((b) => b && botKey(b) !== exKey);
    if (!others.length) return null;
    return others[Math.floor(rand() * others.length) % others.length];
  }

  function recordKillLedger(killerKey, victimKey) {
    if (!killerKey || !victimKey || killerKey === victimKey) {
      return { dominationCount: 0, wasRevenge: false };
    }
    const forward = killerKey + '->' + victimKey;
    const reverse = victimKey + '->' + killerKey;
    const prevReverse = matchMemory.killPairs.get(reverse) || 0;
    const nextForward = (matchMemory.killPairs.get(forward) || 0) + 1;
    matchMemory.killPairs.set(forward, nextForward);
    matchMemory.killPairs.set(reverse, 0);
    return {
      dominationCount: nextForward,
      wasRevenge: prevReverse >= 2
    };
  }

  function generateEventReaction(event, roster, state, rng) {
    if (!event || !event.type) return null;
    const rand = typeof rng === 'function' ? rng : Math.random;
    const list = Array.isArray(roster) ? roster : [];
    if (!list.length && !event.botName) return null;

    const findBot = (uid, name) => {
      if (uid) {
        const byUid = list.find((b) => b && b.uid === uid);
        if (byUid) return byUid;
      }
      if (name) {
        const byName = list.find((b) => b && b.name === name);
        if (byName) return byName;
        return { uid: uid || ('warmup_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_')), name, botType: event.botType, alive: true };
      }
      return null;
    };

    const mode = event.mode || (state && state.mode) || 'ffa_4p';
    const mapId = event.mapId || (state && state.mapId) || 'arena_surf';
    const weaponClass = normalizeWeaponClass(event.weapon || event.slot);
    const isHeadshot = Boolean(event.headshot || event.isHeadshot);
    const now = Date.now();

    // 1. BOT KILLED PLAYER
    if (event.type === 'bot_killed_player') {
      const bot = findBot(event.botUid, event.botName) || list[0];
      if (!bot) return null;
      const profile = getOrCreateBotProfile(bot);
      const spec = PERSONA_PROFILES[profile.personaId];
      profile.tilt = Math.max(0, profile.tilt - spec.tiltDecay);
      matchMemory.lastPlayerPartner = { uid: bot.uid, name: bot.name, ts: now };

      const playerKey = String(event.victimUid || event.playerName || 'local').toLowerCase();
      const ledger = recordKillLedger(profile.key, playerKey);

      let pool = [];
      if (ledger.dominationCount >= 3) {
        pool = CONTEXT_POOLS.domination.map((t) => fillTemplate(t, { count: ledger.dominationCount, target: event.playerName || 'bro' }));
      } else if (ledger.wasRevenge) {
        pool = CONTEXT_POOLS.revenge;
      } else if (weaponClass !== 'rifle' && WEAPON_BANTER[weaponClass] && rand() < 0.62) {
        pool = WEAPON_BANTER[weaponClass].killer;
      } else if (isHeadshot && rand() < 0.45) {
        pool = CONTEXT_POOLS.headshotKill;
      } else {
        pool = PERSONA_COMBAT[profile.personaId].kill;
      }

      const raw = pickNonRepeating(pool, rand);
      const text = stylizeForPersona(raw, profile, rand);
      if (!text) return null;
      rememberLine(raw);
      matchMemory.recentTrashTalk.set(profile.key, { ts: now, line: text });
      profile.lastTrashTalkAt = now;

      const sb = getScoreboardContext(state, bot);
      let followUp = null;
      // If a bottom-fragging bot talks trash, another bot in FFA calls them out!
      if (sb.isBottomFrag && mode !== 'duel_1v1' && rand() < 0.58) {
        const caller = pickOtherBot(list, bot, rand);
        if (caller) {
          const callerProfile = getOrCreateBotProfile(caller);
          const roastRaw = pickNonRepeating(CONTEXT_POOLS.bottomFragCallout, rand);
          const roastText = stylizeForPersona(fillTemplate(roastRaw, { k: sb.botKills, d: sb.botDeaths }), callerProfile, rand);
          if (roastText) {
            rememberLine(roastRaw);
            followUp = {
              bot: caller,
              text: roastText,
              delayMs: computeTypingDelayMs(roastText, callerProfile, { rng: rand }) + 1250,
              allowDead: true
            };
          }
        }
      }

      return {
        primary: {
          bot,
          text,
          delayMs: computeTypingDelayMs(text, profile, { rng: rand }),
          allowDead: false
        },
        followUp
      };
    }

    // 2. PLAYER KILLED BOT
    if (event.type === 'player_killed_bot') {
      const bot = findBot(event.botUid, event.botName) || list[0];
      if (!bot) return null;
      const profile = getOrCreateBotProfile(bot);
      const spec = PERSONA_PROFILES[profile.personaId];
      const extraTilt = (weaponClass === 'melee' ? 20 : 0) + (isHeadshot ? 8 : 0);
      profile.tilt = Math.min(100, profile.tilt + spec.tiltGain + extraTilt);
      matchMemory.lastPlayerPartner = { uid: bot.uid, name: bot.name, ts: now };

      const playerKey = String(event.attackerUid || event.playerName || 'local').toLowerCase();
      recordKillLedger(playerKey, profile.key);

      // Check for instant karma (bot talked trash in last 18s and just died!)
      const trashMeta = matchMemory.recentTrashTalk.get(profile.key);
      const isInstantKarma = Boolean(trashMeta && (now - trashMeta.ts) <= 18000);
      if (isInstantKarma && list.length >= 2 && rand() < 0.65) {
        const bystander = pickOtherBot(list, bot, rand);
        if (bystander) {
          const bProfile = getOrCreateBotProfile(bystander);
          const kRaw = pickNonRepeating(CONTEXT_POOLS.instantKarma, rand);
          const kText = stylizeForPersona(kRaw, bProfile, rand);
          if (kText) {
            rememberLine(kRaw);
            matchMemory.recentTrashTalk.delete(profile.key);
            return {
              primary: {
                bot: bystander,
                text: kText,
                delayMs: computeTypingDelayMs(kText, bProfile, { rng: rand }),
                allowDead: true
              },
              followUp: null
            };
          }
        }
      }

      let pool = [];
      if (weaponClass === 'melee') {
        pool = WEAPON_BANTER.melee.victim;
      } else if (weaponClass !== 'rifle' && WEAPON_BANTER[weaponClass] && rand() < 0.55) {
        pool = WEAPON_BANTER[weaponClass].victim;
      } else if (isHeadshot && rand() < 0.42) {
        pool = CONTEXT_POOLS.headshotVictim;
      } else if (profile.tilt >= 48) {
        pool = PERSONA_COMBAT[profile.personaId].killedHigh;
      } else {
        pool = PERSONA_COMBAT[profile.personaId].killedLow;
      }

      const raw = pickNonRepeating(pool, rand);
      const text = stylizeForPersona(raw, profile, rand);
      if (!text) return null;
      rememberLine(raw);

      let followUp = null;
      // Occasional realistic double-text from tilted player
      if (profile.tilt >= 50 && rand() < spec.doubleTextChance) {
        const secondRaw = pickNonRepeating(CONTEXT_POOLS.doubleTextAfterDeath, rand);
        const secondText = stylizeForPersona(secondRaw, profile, rand);
        if (secondText && secondText !== text) {
          rememberLine(secondRaw);
          followUp = {
            bot,
            text: secondText,
            delayMs: computeTypingDelayMs(secondText, profile, { rng: rand }) + 1150,
            allowDead: true
          };
        }
      }

      return {
        primary: {
          bot,
          text,
          delayMs: computeTypingDelayMs(text, profile, { rng: rand }),
          allowDead: true
        },
        followUp
      };
    }

    // 3. BOT KILLED BOT (FFA cross-talk!)
    if (event.type === 'bot_killed_bot') {
      const killer = findBot(event.attackerUid || event.botUid, event.killerName || event.botName);
      const victim = findBot(event.victimUid, event.victimName);
      if (!killer || !victim || botKey(killer) === botKey(victim)) return null;
      const kProf = getOrCreateBotProfile(killer);
      const vProf = getOrCreateBotProfile(victim);
      vProf.tilt = Math.min(100, vProf.tilt + PERSONA_PROFILES[vProf.personaId].tiltGain);
      kProf.tilt = Math.max(0, kProf.tilt - 6);

      const killerSpeaks = rand() < 0.48;
      const speaker = killerSpeaks ? killer : victim;
      const sProf = killerSpeaks ? kProf : vProf;
      const pool = killerSpeaks ? CONTEXT_POOLS.botKilledBotKiller : CONTEXT_POOLS.botKilledBotVictim;
      const raw = pickNonRepeating(pool, rand);
      const text = stylizeForPersona(fillTemplate(raw, { victim: victim.name, killer: killer.name }), sProf, rand);
      if (!text) return null;
      rememberLine(raw);

      let followUp = null;
      if (rand() < 0.42) {
        const responder = killerSpeaks ? victim : killer;
        const rProf = killerSpeaks ? vProf : kProf;
        const rPool = killerSpeaks ? PERSONA_COMBAT[rProf.personaId].killedHigh : ['cry about it', 'skill issue', 'keep crying lmao', 'stay mad'];
        const rRaw = pickNonRepeating(rPool, rand);
        const rText = stylizeForPersona(rRaw, rProf, rand);
        if (rText) {
          rememberLine(rRaw);
          followUp = {
            bot: responder,
            text: rText,
            delayMs: computeTypingDelayMs(rText, rProf, { rng: rand }) + 1400,
            allowDead: true
          };
        }
      }

      return {
        primary: {
          bot: speaker,
          text,
          delayMs: computeTypingDelayMs(text, sProf, { rng: rand }),
          allowDead: true
        },
        followUp
      };
    }

    // 4. VOID FALL (Surf Stadium, Helix Spire, Skyline Run)
    if (event.type === 'void_fall') {
      if (event.victimIsBot) {
        const victimBot = findBot(event.victimUid, event.victimName);
        const other = pickOtherBot(list, victimBot, rand);
        if (other && rand() < 0.62) {
          const oProf = getOrCreateBotProfile(other);
          const raw = pickNonRepeating(CONTEXT_POOLS.voidMockery, rand);
          const text = stylizeForPersona(fillTemplate(raw, { victim: event.victimName || 'bro' }), oProf, rand);
          rememberLine(raw);
          let followUp = null;
          if (victimBot && rand() < 0.55) {
            const vProf = getOrCreateBotProfile(victimBot);
            vProf.tilt = Math.min(100, vProf.tilt + 18);
            const eRaw = pickNonRepeating(CONTEXT_POOLS.voidSelfExcuse, rand);
            const eText = stylizeForPersona(eRaw, vProf, rand);
            rememberLine(eRaw);
            followUp = {
              bot: victimBot,
              text: eText,
              delayMs: computeTypingDelayMs(eText, vProf, { rng: rand }) + 1200,
              allowDead: true
            };
          }
          return {
            primary: { bot: other, text, delayMs: computeTypingDelayMs(text, oProf, { urgent: true, rng: rand }), allowDead: true },
            followUp
          };
        }
        if (victimBot) {
          const vProf = getOrCreateBotProfile(victimBot);
          vProf.tilt = Math.min(100, vProf.tilt + 16);
          const raw = pickNonRepeating(CONTEXT_POOLS.voidSelfExcuse, rand);
          const text = stylizeForPersona(raw, vProf, rand);
          rememberLine(raw);
          return {
            primary: { bot: victimBot, text, delayMs: computeTypingDelayMs(text, vProf, { rng: rand }), allowDead: true },
            followUp: null
          };
        }
      } else {
        // Human player fell into the void!
        const speaker = findBot(event.attackerUid, event.attackerName) || list[Math.floor(rand() * list.length) % list.length];
        if (!speaker) return null;
        const prof = getOrCreateBotProfile(speaker);
        const raw = pickNonRepeating(CONTEXT_POOLS.voidMockery, rand);
        const text = stylizeForPersona(fillTemplate(raw, { victim: event.victimName || 'bro' }), prof, rand);
        rememberLine(raw);
        return {
          primary: { bot: speaker, text, delayMs: computeTypingDelayMs(text, prof, { urgent: true, rng: rand }), allowDead: true },
          followUp: null
        };
      }
      return null;
    }

    // 5. PLAYER LOW HEALTH (ONLY from the bot who actually shot them — NO nonsensical FFA team callouts!)
    if (event.type === 'player_low_health') {
      const attacker = findBot(event.botUid, event.botName);
      if (!attacker) return null;
      const prof = getOrCreateBotProfile(attacker);
      const raw = pickNonRepeating(CONTEXT_POOLS.lowHpAttacker, rand);
      const text = stylizeForPersona(raw, prof, rand);
      if (!text) return null;
      rememberLine(raw);
      return {
        primary: { bot: attacker, text, delayMs: computeTypingDelayMs(text, prof, { urgent: true, rng: rand }), allowDead: false },
        followUp: null
      };
    }

    // 6. PLAYER KILL STREAK
    if (event.type === 'player_kill_streak') {
      const speaker = list[Math.floor(rand() * list.length) % list.length];
      if (!speaker) return null;
      const prof = getOrCreateBotProfile(speaker);
      prof.tilt = Math.min(100, prof.tilt + 14);
      const raw = pickNonRepeating(CONTEXT_POOLS.playerStreak, rand);
      const text = stylizeForPersona(fillTemplate(raw, { player: event.playerName || 'bro', kills: event.totalKills || 3 }), prof, rand);
      if (!text) return null;
      rememberLine(raw);
      return {
        primary: { bot: speaker, text, delayMs: computeTypingDelayMs(text, prof, { rng: rand }), allowDead: true },
        followUp: null
      };
    }

    // 7. ROUND / MATCH START
    if (event.type === 'round_start') {
      const speaker = list[Math.floor(rand() * list.length) % list.length];
      if (!speaker) return null;
      const prof = getOrCreateBotProfile(speaker);
      const mapBank = MAP_OPINIONS[mapId];
      const useMapComment = Boolean(mapBank && event.round === 1 && rand() < 0.45);
      const pool = useMapComment ? mapBank.open : PERSONA_COMBAT[prof.personaId].round;
      const raw = pickNonRepeating(pool, rand);
      const text = stylizeForPersona(raw, prof, rand);
      if (!text) return null;
      rememberLine(raw);
      return {
        primary: { bot: speaker, text, delayMs: computeTypingDelayMs(text, prof, { rng: rand }), allowDead: true },
        followUp: null
      };
    }

    // 8. MATCH OVER (Post-match verdicts + trash talk)
    if (event.type === 'match_over') {
      if (!list.length) return null;
      const winnerBot = list.find((b) => b && b.uid === event.winnerUid);
      const speaker = winnerBot || list[Math.floor(rand() * list.length) % list.length];
      const prof = getOrCreateBotProfile(speaker);
      let pool;
      if (winnerBot && botKey(speaker) === botKey(winnerBot)) {
        pool = (prof.personaId === 'quiet' || prof.personaId === 'vet') ? POST_MATCH_POOLS.winnerChill : POST_MATCH_POOLS.winnerCocky;
      } else {
        pool = (prof.tilt >= 40 || prof.personaId === 'rager' || prof.personaId === 'sweat')
          ? POST_MATCH_POOLS.loserSalty
          : POST_MATCH_POOLS.loserChill;
      }
      const raw = pickNonRepeating(pool, rand);
      const text = stylizeForPersona(fillTemplate(raw, { winner: event.winnerName || 'bro' }), prof, rand);
      if (!text) return null;
      rememberLine(raw);

      let followUp = null;
      const second = pickOtherBot(list, speaker, rand);
      if (second) {
        const sProf = getOrCreateBotProfile(second);
        const sPool = (sProf.tilt >= 42 || sProf.personaId === 'rager') ? POST_MATCH_POOLS.loserSalty : POST_MATCH_POOLS.loserChill;
        const sRaw = pickNonRepeating(sPool, rand);
        const sText = stylizeForPersona(fillTemplate(sRaw, { winner: event.winnerName || 'bro' }), sProf, rand);
        if (sText) {
          rememberLine(sRaw);
          followUp = {
            bot: second,
            text: sText,
            delayMs: computeTypingDelayMs(sText, sProf, { rng: rand }) + 1250,
            allowDead: true
          };
        }
      }

      return {
        primary: { bot: speaker, text, delayMs: computeTypingDelayMs(text, prof, { urgent: true, rng: rand }), allowDead: true },
        followUp
      };
    }

    // 9. MAP VOTE CAST (Bots lobby for maps, argue over picks, and roast bad votes!)
    if (event.type === 'map_vote_cast') {
      const votedMap = event.mapId;
      const mapShort = ARENA_SHORT_NAMES[votedMap] || 'that map';
      const mapBank = MAP_OPINIONS[votedMap] || null;

      if (event.voterIsBot) {
        const voter = findBot(event.botUid || event.voterUid, event.botName || event.voterName);
        if (!voter) return null;
        const vProf = getOrCreateBotProfile(voter);
        const pool = mapBank ? mapBank.love : ['vote ' + mapShort];
        const raw = pickNonRepeating(pool, rand);
        const text = stylizeForPersona(raw, vProf, rand);
        if (!text) return null;
        rememberLine(raw);

        // Another bot who hates that map argues back!
        let followUp = null;
        const hater = list.find((b) => {
          if (!b || botKey(b) === botKey(voter)) return false;
          const p = getOrCreateBotProfile(b);
          return p && p.hatedMaps.includes(votedMap);
        }) || (rand() < 0.45 ? pickOtherBot(list, voter, rand) : null);

        if (hater && mapBank) {
          const hProf = getOrCreateBotProfile(hater);
          const hRaw = pickNonRepeating(mapBank.hate, rand);
          const hText = stylizeForPersona(hRaw, hProf, rand);
          if (hText) {
            rememberLine(hRaw);
            followUp = {
              bot: hater,
              text: hText,
              delayMs: computeTypingDelayMs(hText, hProf, { urgent: true, rng: rand }) + 950,
              allowDead: true
            };
          }
        }

        return {
          primary: { bot: voter, text, delayMs: computeTypingDelayMs(text, vProf, { urgent: true, rng: rand }), allowDead: true },
          followUp
        };
      } else {
        // Human voted for a map! Pick a bot with a strong opinion on that map
        const opinionated = list.find((b) => {
          const p = getOrCreateBotProfile(b);
          return p && (p.hatedMaps.includes(votedMap) || p.favoriteMaps.includes(votedMap));
        }) || list[Math.floor(rand() * list.length) % list.length];
        if (!opinionated) return null;
        const oProf = getOrCreateBotProfile(opinionated);
        const likesIt = oProf.favoriteMaps.includes(votedMap);
        const pool = likesIt
          ? POST_MATCH_POOLS.voteAgree
          : (mapBank && rand() < 0.55 ? mapBank.hate : POST_MATCH_POOLS.voteDisagree);
        const raw = pickNonRepeating(pool, rand);
        const text = stylizeForPersona(fillTemplate(raw, { map: mapShort }), oProf, rand);
        if (!text) return null;
        rememberLine(raw);
        return {
          primary: { bot: opinionated, text, delayMs: computeTypingDelayMs(text, oProf, { urgent: true, rng: rand }), allowDead: true },
          followUp: null
        };
      }
    }

    return null;
  }

  // Live Zero-API Reply Generator when a human player types in chat
  function generatePlayerReply(rawText, senderName, roster, state, rng) {
    const rand = typeof rng === 'function' ? rng : Math.random;
    const list = Array.isArray(roster) ? roster : [];
    if (!list.length) return null;

    const analysis = analyzePlayerMessage(rawText, list, state);
    if (analysis.intent === 'empty') return null;

    // Choose the most contextually relevant bot to answer
    let targetBot = analysis.mentionedBot;
    if (!targetBot && matchMemory.lastPlayerPartner && (Date.now() - matchMemory.lastPlayerPartner.ts) <= 22000) {
      targetBot = list.find((b) => b && (b.uid === matchMemory.lastPlayerPartner.uid || b.name === matchMemory.lastPlayerPartner.name)) || null;
    }
    if (!targetBot) {
      // Weight by chattiness so quiet tryhards reply less often than ragers/gremlins
      const weighted = [];
      for (const b of list) {
        const p = getOrCreateBotProfile(b);
        const copies = p && p.personaId === 'quiet' ? 1 : 3;
        for (let i = 0; i < copies; i++) weighted.push(b);
      }
      targetBot = weighted[Math.floor(rand() * weighted.length) % weighted.length] || list[0];
    }

    const profile = getOrCreateBotProfile(targetBot);
    const sb = getScoreboardContext(state, targetBot);
    let pool = null;

    if (analysis.intent === 'map_talk') {
      const targetMap = analysis.mentionedMap || (state && state.mapId) || 'arena_surf';
      const mapBank = MAP_OPINIONS[targetMap];
      if (mapBank) {
        const likes = profile.favoriteMaps.includes(targetMap);
        pool = likes ? mapBank.love : mapBank.hate;
      } else {
        pool = ['vote courtyard pls', 'anything but spire bro', 'run cargo'];
      }
    } else if (analysis.intent === 'direct_insult') {
      profile.tilt = Math.min(100, profile.tilt + 14);
      if (sb.botKills > sb.localKills) {
        pool = REPLY_POOLS.direct_insult_winning;
      } else if (sb.localKills > sb.botKills) {
        pool = REPLY_POOLS.direct_insult_losing;
      } else {
        pool = REPLY_POOLS.direct_insult_even;
      }
    } else if (REPLY_POOLS[analysis.intent]) {
      pool = REPLY_POOLS[analysis.intent];
    } else {
      pool = REPLY_POOLS.general;
    }

    const raw = pickNonRepeating(pool, rand);
    const text = stylizeForPersona(raw, profile, rand);
    if (!text) return null;
    rememberLine(raw);

    // Optional second bot chiming in to make the lobby feel genuinely multi-player
    let followUp = null;
    const spicyIntent = ['bot_accusation', 'hackusation', 'direct_insult', 'profanity_rage', 'camping_salt', 'map_talk'].includes(analysis.intent);
    if (spicyIntent && list.length >= 2 && rand() < 0.36) {
      const second = pickOtherBot(list, targetBot, rand);
      if (second) {
        const sProf = getOrCreateBotProfile(second);
        let sPool = CONTEXT_POOLS.pileOn;
        if (analysis.intent === 'bot_accusation') {
          sPool = ['bro thinks were bots lmao', 'nah hes just ass', 'beep boop bitch'];
        } else if (analysis.intent === 'map_talk' && analysis.mentionedMap && MAP_OPINIONS[analysis.mentionedMap]) {
          const sLikes = sProf.favoriteMaps.includes(analysis.mentionedMap);
          sPool = sLikes ? MAP_OPINIONS[analysis.mentionedMap].love : MAP_OPINIONS[analysis.mentionedMap].hate;
        }
        const sRaw = pickNonRepeating(sPool, rand);
        const sText = stylizeForPersona(sRaw, sProf, rand);
        if (sText && sText !== text) {
          rememberLine(sRaw);
          followUp = {
            bot: second,
            text: sText,
            delayMs: computeTypingDelayMs(sText, sProf, { rng: rand }) + 1250,
            allowDead: true
          };
        }
      }
    }

    return {
      analysis,
      primary: {
        bot: targetBot,
        text,
        delayMs: computeTypingDelayMs(text, profile, { rng: rand }),
        allowDead: true
      },
      followUp
    };
  }

  // Host-authoritative per-bot map vote choice grounded in persona map likes/dislikes & match outcome
  function chooseBotMapVote(bot, options, currentMapId, context, rng) {
    const opts = Array.isArray(options) && options.length ? options.slice() : ARENA_IDS.slice(0, 3);
    const rand = typeof rng === 'function' ? rng : Math.random;
    const profile = getOrCreateBotProfile(bot);
    const ctx = context || {};
    const botWon = Boolean(ctx.winnerUid && bot && ctx.winnerUid === bot.uid);
    const existingVotes = (ctx.votes && typeof ctx.votes === 'object') ? ctx.votes : {};

    let bestId = opts[0];
    let bestScore = -Infinity;
    for (const id of opts) {
      let score = rand() * 1.4;
      if (profile) {
        if (profile.favoriteMaps.includes(id)) score += 3.0;
        if (profile.hatedMaps.includes(id)) score -= 2.8;
      }
      if (id === currentMapId) {
        // Winners like running it back; tilted losers want a new map
        if (botWon) score += 1.4;
        else if (profile && profile.tilt >= 45) score -= 2.2;
        else score -= 0.7;
      }
      // Subtle bandwagon/contrarian effect from existing votes
      let votesForThis = 0;
      for (const uid of Object.keys(existingVotes)) {
        if (existingVotes[uid] === id) votesForThis += 1;
      }
      if (votesForThis > 0) {
        score += (profile && profile.personaId === 'rager') ? -0.35 * votesForThis : 0.4 * votesForThis;
      }
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }

  // Expose all static line arrays for automated zero-slur and quality verification
  function getAllDialogueLines() {
    const lines = [];
    const pushArr = (arr) => { if (Array.isArray(arr)) lines.push(...arr); };
    for (const k of Object.keys(WEAPON_BANTER)) {
      pushArr(WEAPON_BANTER[k].killer);
      pushArr(WEAPON_BANTER[k].victim);
    }
    for (const k of Object.keys(PERSONA_COMBAT)) {
      pushArr(PERSONA_COMBAT[k].kill);
      pushArr(PERSONA_COMBAT[k].killedLow);
      pushArr(PERSONA_COMBAT[k].killedHigh);
      pushArr(PERSONA_COMBAT[k].round);
    }
    for (const k of Object.keys(CONTEXT_POOLS)) pushArr(CONTEXT_POOLS[k]);
    for (const k of Object.keys(MAP_OPINIONS)) {
      pushArr(MAP_OPINIONS[k].love);
      pushArr(MAP_OPINIONS[k].hate);
      pushArr(MAP_OPINIONS[k].open);
    }
    for (const k of Object.keys(POST_MATCH_POOLS)) pushArr(POST_MATCH_POOLS[k]);
    for (const k of Object.keys(REPLY_POOLS)) pushArr(REPLY_POOLS[k]);
    return lines;
  }

  return {
    ARENA_IDS,
    ARENA_SHORT_NAMES,
    PERSONA_IDS,
    PERSONA_PROFILES,
    MAP_OPINIONS,
    containsSlur,
    getBotProfile,
    resetMatchMemory,
    clearAllProfiles,
    normalizeWeaponClass,
    computeTypingDelayMs,
    findMentionedBot,
    detectMapMention,
    detectWeaponMention,
    classifyPlayerMessage,
    analyzePlayerMessage,
    generateEventReaction,
    generatePlayerReply,
    chooseBotMapVote,
    getAllDialogueLines
  };
});
