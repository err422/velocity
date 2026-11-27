// Local arena text chat and lightweight event-driven bot dialogue.
// Multiplayer chat is relayed by the authoritative host over the existing WebRTC game channel.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.ChatSystem = factory(root);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const MAX_MESSAGE_LENGTH = 160;
  const MAX_HISTORY = 8;
  const MESSAGE_VISIBLE_MS = 8500;
  const EVENT_COOLDOWN_MS = 2400;
  const BOT_COOLDOWN_MS = 6800;
  const PLAYER_REPLY_COOLDOWN_MS = 2600;
  const HUMBLED_DURATION_MS = 30000;

  const PERSONALITIES = [
    {
      kill: ['thats another one', 'you walked right into that', 'clean', 'free pick', 'back to spawn'],
      killed: ['ok that was clean', 'nah i got caught', 'fair enough', 'i deserved that one', 'good shot'],
      round: ['glhf', 'lets get this', 'same map, same result']
    },
    {
      kill: ['where did you think you were going', 'too slow', 'caught you lacking', 'unlucky', 'read like a book'],
      killed: ['BRO what was that', 'i actually got deleted', 'not even mad', 'you got that one', 'i wasnt ready'],
      round: ['yo', 'we running it', 'dont blink']
    },
    {
      kill: ['bad peek', 'held that angle', 'should have rotated', 'thats the timing', 'one tap'],
      killed: ['nice shot', 'i gave you that angle', 'good swing', 'noted', 'well played'],
      round: ['watch the angles', 'lets see how this goes', 'focus up']
    },
    {
      kill: ['close range is mine', 'dont push that', 'right into it', 'too close', 'easy trade'],
      killed: ['ok that hurt', 'you got lucky there', 'ill take that', 'good fight', 'next one'],
      round: ['come on then', 'lets go', 'no free rounds']
    }
  ];

  const EVENT_CHANCE = {
    bot_killed_player: 0.52,
    player_killed_bot: 0.52,
    bot_killed_bot: 0.18,
    bot_kill_streak: 0.58,
    player_low_health: 0.34,
    player_kill_streak: 0.48,
    player_camping: 0.34,
    player_weapon_switch: 0.22,
    impressive_movement: 0.42,
    round_start: 0.22,
    round_end: 0.58
  };

  const REPLIES = {
    greeting: ['yo', 'sup', 'glhf', 'hey', 'whats good'],
    gg: ['ggs', 'wp', 'that was clean', 'respect', 'gg'],
    taunt: ['you typing or playing', 'scoreboard says otherwise', 'keep talking', 'we will see', 'sure man'],
    question: ['depends whos asking', 'maybe', 'ask me after the round', 'what do you think'],
    general: ['mid fight bro', 'anyway', 'you good', 'not reading all that', 'lmao']
  };

  const RIVALRY_ARCHETYPES = [
    {
      kill: ['too easy', 'free pick', 'sit down', 'diffed', 'back to spawn {player}'],
      killed: ['ok lucky shot', 'bro i whiffed so hard', 'my mouse slipped', 'enjoy that one'],
      frustrated: ['ok bro stop following me', 'im locking in on you {player}', 'alright now its personal'],
      streak3: ['3 straight {player} wake up', 'youre actually my warmup', 'do you shoot back or nah'],
      streak4: ['4 in a row bro pack it up', 'youre donating kills right now'],
      streak5: ['5 IN A ROW lmaooo', 'im living in your head rent free {player}', 'someone check if {player} is afk'],
      revenge: ['FINALLY', 'took long enough', 'nobody farms me all game'],
      humbled: ['...', 'ok', 'whatever', 'mb'],
      round: ['lets run it', 'free lobby', 'try not to blink']
    },
    {
      kill: ['GET OUT', 'yeah stay down', 'thats what you get', 'read like a book'],
      killed: ['BRO HOW', 'no shot that hit', 'what is this timing', 'actually unplayable'],
      frustrated: ['WHY ARE YOU ONLY SHOOTING ME', 'im hunting you next round', 'alright im locking in'],
      streak3: ['3-0 on you rn', 'cant touch me', 'keep peeking me please'],
      streak4: ['4 straight?? bro uninstall', 'youre actually lost'],
      streak5: ['5 STRAIGHT GET OFF THE GAME', 'literally farming you {player}'],
      revenge: ['YEAH SIT DOWN', 'talk now', 'finally got you'],
      humbled: ['lucky asf', '...', 'mb'],
      round: ['lock in', 'no free rounds', 'im not losing this']
    },
    {
      kill: ['bad peek', 'held that angle', 'too predictable', 'free'],
      killed: ['nice shot', 'gave you that angle', 'good swing', 'noted'],
      frustrated: ['ive got your timing now {player}', 'not giving you that angle again', 'noted. adjusting'],
      streak3: ['same angle 3 times {player}', 'you never adapt huh'],
      streak4: ['4-0 in duels', 'try a different route'],
      streak5: ['5 straight. might be time to switch games', 'i know where you are before you do'],
      revenge: ['adjusted', 'fixed that', 'wont happen again'],
      humbled: ['fair', 'good adjustment', '...', 'alright'],
      round: ['watch the angles', 'lets see if you adapt', 'glhf']
    },
    {
      kill: ['?', 'u good?', 'my bad bro', 'oops', 'did your mouse die'],
      killed: ['woah ok', 'chillll', 'i let you have that', 'nice hacks'],
      frustrated: ['bro why me', 'alright now its personal', 'targeting you all game now'],
      streak3: ['bro u playing on trackpad?', '3 in a row lol', 'u good {player}?'],
      streak4: ['4 straight lmao im sorry', 'do you need a timeout'],
      streak5: ['5 in a row???', 'someone help {player}', 'this is bullying at this point'],
      revenge: ['ez', 'never doubted', 'skill issue'],
      humbled: ['ok fair', '...', 'u got me'],
      round: ['yo', 'dont tilt', 'ez clap']
    }
  ];

  const SITUATIONAL = {
    camping: ['bro {player} has been in that corner all round', 'are we pitching a tent {player}?', 'move around bro this is velocity', '{player} is glued to that angle'],
    weaponSwitch: ['oh {player} pulled out the {weapon}', 'switching to {weapon} wont save you', 'alright watch out {player} has {weapon} now'],
    movement: ['ok that movement was actually clean', 'bro is flying', 'alright {player} chill with the movement', 'how are you moving like that'],
    botCarrying: ['{bot} is actually carrying this lobby', 'somebody stop {bot}', 'bro {bot} is frying right now'],
    botStruggling: ['{bot} are you awake over there', 'someone check on {bot}', '{bot} is donating kills rn']
  };

  const BOT_BANTER = [
    ['{other} you gonna help or just watch?', 'im literally flanking chill'],
    ['{other} stop baiting me bro', 'you walked in without checking corners'],
    ['{other} we are cooking this lobby', 'dont jinx it yet'],
    ['{other} did you see that shot', 'yeah that was actually gross'],
    ['{other} watch mid this round', 'got it']
  ];

  const lastBotSpeakAt = new Map();
  const lastBotLine = new Map();
  const botMemory = new Map();
  const pendingTimers = new Set();
  const handledRoundEvents = new Set();
  let matchSessionId = 1;
  let currentMapId = null;
  let botRoundStreak = 0;
  let playerRoundStreak = 0;
  let totalBotRounds = 0;
  let totalPlayerRounds = 0;
  let lastKillerBotKey = null;
  let lastBanterAt = 0;
  let lastEventAt = 0;
  let lastPlayerReplyAt = 0;
  let messageSeq = 1;
  let fadeTimer = null;
  let open = false;
  let initialized = false;
  let messages = [];
  let messagesVisible = false;
  let container = null;
  let mobileButton = null;
  let messageList = null;
  let composer = null;
  let input = null;
  let hint = null;

  function sanitizeMessage(value) {
    return String(value == null ? '' : value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
  }

  function classifyPlayerMessage(value) {
    const text = sanitizeMessage(value).toLowerCase();
    if (!text) return 'empty';
    if (/\b(score|scoreboard|who'?s winning|who is winning|what'?s the score|whats the score|who'?s up|who is up|who'?s leading|how are we doing)\b/.test(text)) return 'score_query';
    if (/\b(hi|hey|hello|yo|sup|glhf|whats up|what's up)\b/.test(text)) return 'greeting';
    if (/\b(gg|ggs|wp|well played|nice shot|nice)\b/.test(text)) return 'gg';
    if (/\b(cope|excuse|ping|lag|hacks|cheating|broken|unfair)\b/.test(text)) return 'excuse';
    if (/\b(shut up|stfu|mad|cry|trash|garbage|dogwater|hate)\b/.test(text)) return 'rage';
    if (/\b(ez|easy|noob|trash|bot|bad|skill issue|diff|owned|rekt)\b/.test(text)) return 'taunt';
    if (text.includes('?')) return 'question';
    return 'general';
  }

  function getState() {
    if (!root.NetcodeSystem || typeof root.NetcodeSystem.getState !== 'function') return null;
    try { return root.NetcodeSystem.getState(); } catch (_) { return null; }
  }

  function isArenaChatAvailable() {
    const state = getState();
    if (!state || !state.isArena || !state.chatEnabled) return false;
    if (state.mapId === 'sandbox') return false;
    if (root.ArenaCatalog && typeof root.ArenaCatalog.isValidArenaId === 'function') {
      return root.ArenaCatalog.isValidArenaId(state.mapId);
    }
    return typeof state.mapId === 'string' && state.mapId.indexOf('arena_') === 0;
  }

  function isGameplayActive() {
    if (!root.document || !root.document.body) return true;
    const pageState = root.document.body.dataset ? root.document.body.dataset.state : '';
    return !pageState || pageState === 'playing';
  }

  function canInteractWithChat() {
    return isArenaChatAvailable() && isGameplayActive();
  }

  function getBotRoster() {
    const state = getState();
    if (!state) return [];
    if (state.role === 'warmup' && root.CombatSystem && typeof root.CombatSystem.getWarmupBots === 'function') {
      return root.CombatSystem.getWarmupBots().map(function (bot) {
        return { uid: bot.uid, name: bot.name, botType: bot.botType, alive: bot.alive !== false };
      });
    }
    return (Array.isArray(state.players) ? state.players : [])
      .filter(function (player) { return player && player.isBot; })
      .map(function (bot) {
        return { uid: bot.uid, name: bot.name, botType: bot.botType, alive: bot.alive !== false };
      });
  }

  function randomItem(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function getBotKey(bot) {
    if (typeof bot === 'string') return bot;
    return String((bot && (bot.uid || bot.name)) || 'bot');
  }

  function createBotMemory() {
    return {
      killsOnPlayer: 0,
      deathsToPlayer: 0,
      streakOnPlayer: 0,
      streakByPlayer: 0,
      killsOnBots: 0,
      deathsToBots: 0,
      ego: 0,
      tilt: 0,
      humbledUntil: 0,
      grudgeTargetUid: null,
      mood: 'neutral',
      recentLines: [],
      deathsByPlayer: Object.create(null)
    };
  }

  function getMemory(botOrKey, create) {
    const key = getBotKey(botOrKey);
    let memory = botMemory.get(key);
    if (!memory && create !== false) {
      memory = createBotMemory();
      botMemory.set(key, memory);
    }
    return memory || null;
  }

  function isHumbled(memory) {
    return Boolean(memory && memory.humbledUntil > Date.now());
  }

  function updateMood(memory) {
    if (!memory) return 'neutral';
    if (isHumbled(memory)) memory.mood = 'humbled';
    else if (memory.tilt >= 4 || memory.streakByPlayer >= 3) memory.mood = 'tilted';
    else if (memory.tilt >= 2 || memory.deathsToPlayer - memory.killsOnPlayer >= 2) memory.mood = 'frustrated';
    else if (memory.ego >= 3 || memory.streakOnPlayer >= 3) memory.mood = 'cocky';
    else memory.mood = 'neutral';
    return memory.mood;
  }

  function getBotRivalry(botUid) {
    const memory = getMemory(String(botUid || ''), false) || createBotMemory();
    updateMood(memory);
    const humbled = isHumbled(memory);
    let aggressionBias = 1;
    let chattiness = 1;
    if (memory.mood === 'cocky') {
      aggressionBias = 1.18;
      chattiness = 1.14;
    } else if (memory.mood === 'frustrated') {
      aggressionBias = 1.12;
      chattiness = 0.92;
    } else if (memory.mood === 'tilted') {
      aggressionBias = 1.30;
      chattiness = 0.82;
    } else if (humbled) {
      aggressionBias = 0.88;
      chattiness = 0.20;
    }
    return {
      mood: memory.mood,
      ego: memory.ego,
      tilt: memory.tilt,
      isHumbled: humbled,
      grudgeTargetUid: memory.grudgeTargetUid,
      aggressionBias,
      chattiness,
      killsOnPlayer: memory.killsOnPlayer,
      deathsToPlayer: memory.deathsToPlayer,
      streakOnPlayer: memory.streakOnPlayer,
      streakByPlayer: memory.streakByPlayer
    };
  }

  function formatLine(template, vars) {
    return String(template || '').replace(/\{(\w+)\}/g, function (_, key) {
      return vars && vars[key] != null ? String(vars[key]) : '';
    });
  }

  function pickFreshLine(bot, pool, vars) {
    if (!Array.isArray(pool) || !pool.length) return '';
    const memory = getMemory(bot);
    const formatted = pool.map(function (line) { return formatLine(line, vars || {}); }).filter(Boolean);
    const fresh = formatted.filter(function (line) { return memory.recentLines.indexOf(line) === -1; });
    const chosen = randomItem(fresh.length ? fresh : formatted);
    if (chosen) {
      memory.recentLines.push(chosen);
      if (memory.recentLines.length > 6) memory.recentLines.shift();
    }
    return chosen;
  }

  function clearPendingTimers() {
    pendingTimers.forEach(function (timerId) { clearTimeout(timerId); });
    pendingTimers.clear();
    fadeTimer = null;
  }

  function scheduleTimer(callback, delayMs) {
    const sessionAtSchedule = matchSessionId;
    const timerId = setTimeout(function () {
      pendingTimers.delete(timerId);
      if (timerId === fadeTimer) fadeTimer = null;
      if (matchSessionId !== sessionAtSchedule) return;
      callback();
    }, Math.max(0, Number(delayMs) || 0));
    pendingTimers.add(timerId);
    return timerId;
  }

  function resetMatchMemory(mapId) {
    matchSessionId++;
    clearPendingTimers();
    currentMapId = mapId || null;
    botMemory.clear();
    lastBotSpeakAt.clear();
    lastBotLine.clear();
    handledRoundEvents.clear();
    botRoundStreak = 0;
    playerRoundStreak = 0;
    totalBotRounds = 0;
    totalPlayerRounds = 0;
    lastKillerBotKey = null;
    lastBanterAt = 0;
    lastEventAt = 0;
    lastPlayerReplyAt = 0;
    messages = [];
    messagesVisible = false;
    open = false;
    if (input) {
      input.value = '';
      if (root.document && root.document.activeElement === input) input.blur();
    }
    if (messageList) messageList.textContent = '';
    refresh();
    return matchSessionId;
  }

  function ensureMatchMemory() {
    const state = getState();
    const mapId = state && state.mapId;
    if (!mapId) return;
    if (currentMapId == null) currentMapId = mapId;
    else if (mapId !== currentMapId) resetMatchMemory(mapId);
  }

  function recordEventMemory(event, bot) {
    const memory = getMemory(bot);
    const now = Date.now();
    const state = getState();
    if (event.type === 'bot_killed_player') {
      memory.killsOnPlayer++;
      memory.streakOnPlayer++;
      memory.streakByPlayer = 0;
      memory.ego = clamp(memory.ego + 1, -5, 5);
      memory.tilt = Math.max(0, memory.tilt - 1);
      lastKillerBotKey = getBotKey(bot);
    } else if (event.type === 'player_killed_bot') {
      if (memory.streakOnPlayer >= 3) memory.humbledUntil = now + HUMBLED_DURATION_MS;
      memory.deathsToPlayer++;
      memory.streakByPlayer++;
      memory.streakOnPlayer = 0;
      memory.ego = clamp(memory.ego - 1, -5, 5);
      memory.tilt = clamp(memory.tilt + 1, 0, 5);
      const playerUid = event.playerUid || event.attackerUid || (state && state.localUid);
      if (playerUid) {
        const playerKey = String(playerUid);
        memory.deathsByPlayer[playerKey] = (memory.deathsByPlayer[playerKey] || 0) + 1;
        if (memory.deathsByPlayer[playerKey] >= 3 || memory.deathsToPlayer - memory.killsOnPlayer >= 3) {
          memory.grudgeTargetUid = playerKey;
        }
      }
    } else if (event.type === 'bot_killed_bot') {
      memory.killsOnBots++;
      const victimMemory = event.victimUid ? getMemory(String(event.victimUid)) : null;
      if (victimMemory) victimMemory.deathsToBots++;
    } else if (event.type === 'player_kill_streak') {
      memory.tilt = clamp(memory.tilt + 1, 0, 5);
      const playerUid = event.playerUid || event.attackerUid || (state && state.localUid);
      if (playerUid && memory.deathsToPlayer - memory.killsOnPlayer >= 3) memory.grudgeTargetUid = String(playerUid);
    }
    updateMood(memory);
    return memory;
  }

  function recordRoundResult(event) {
    const eventKey = String(event.roundId || [
      currentMapId || '',
      Number(event.round) || 0,
      String(event.winnerUid || event.winnerName || 'unknown')
    ].join(':'));
    if (handledRoundEvents.has(eventKey)) return false;
    handledRoundEvents.add(eventKey);
    if (handledRoundEvents.size > 16) handledRoundEvents.delete(handledRoundEvents.values().next().value);

    const botsWereWinning = botRoundStreak >= 3;
    if (event.winnerIsBot) {
      botRoundStreak++;
      playerRoundStreak = 0;
      totalBotRounds++;
    } else {
      playerRoundStreak++;
      botRoundStreak = 0;
      totalPlayerRounds++;
    }
    if (botsWereWinning && !event.winnerIsBot) {
      getBotRoster().forEach(function (bot) { getMemory(bot); });
      botMemory.forEach(function (memory) {
        memory.humbledUntil = Date.now() + HUMBLED_DURATION_MS;
        updateMood(memory);
      });
    }
    return true;
  }

  function buildScoreSummary() {
    const state = getState();
    const players = state && Array.isArray(state.players) ? state.players.slice() : [];
    const sorted = players.filter(function (player) {
      return player && (Number.isFinite(player.score) || Number.isFinite(player.kills));
    }).sort(function (a, b) {
      const aScore = Number.isFinite(a.score) ? a.score : (Number(a.kills) || 0);
      const bScore = Number.isFinite(b.score) ? b.score : (Number(b.kills) || 0);
      return bScore - aScore;
    });
    if (sorted.length >= 2) {
      const first = sorted[0];
      const second = sorted[1];
      const firstScore = Number.isFinite(first.score) ? first.score : (Number(first.kills) || 0);
      const secondScore = Number.isFinite(second.score) ? second.score : (Number(second.kills) || 0);
      if (firstScore === secondScore) return 'tied right now at ' + firstScore;
      return String(first.name || 'someone') + ' is leading with ' + firstScore;
    }
    if (totalBotRounds !== totalPlayerRounds) {
      return totalBotRounds > totalPlayerRounds
        ? 'bots are up ' + totalBotRounds + '-' + totalPlayerRounds
        : 'youre up ' + totalPlayerRounds + '-' + totalBotRounds;
    }
    let botKills = 0;
    let botDeaths = 0;
    botMemory.forEach(function (memory) {
      botKills += memory.killsOnPlayer;
      botDeaths += memory.deathsToPlayer;
    });
    if (botKills !== botDeaths) {
      return botKills > botDeaths
        ? 'bots are up ' + botKills + '-' + botDeaths
        : 'players are up ' + botDeaths + '-' + botKills;
    }
    return 'still early, check scoreboard';
  }

  function maybeTriggerBotBanter(excludeBot) {
    const now = Date.now();
    if (now - lastBanterAt < 28000) return false;
    const roster = getBotRoster().filter(function (bot) { return bot && bot.alive !== false; });
    const ready = roster.filter(canBotSpeak);
    if (!ready.length || roster.length < 2) return false;
    const first = randomItem(ready);
    const second = randomItem(roster.filter(function (bot) { return getBotKey(bot) !== getBotKey(first); }));
    const exchange = randomItem(BOT_BANTER);
    if (!first || !second || !exchange) return false;
    const firstLine = formatLine(exchange[0], { other: second.name || 'bro' });
    const secondLine = formatLine(exchange[1], { other: first.name || 'bro' });
    if (!sendBotLine(first, firstLine, 900 + Math.floor(Math.random() * 450), false)) return false;
    lastBanterAt = now;
    scheduleTimer(function () { sendBotLine(second, secondLine, 450, false, true); }, 1800);
    return true;
  }

  function getPersonalityIndex(bot) {
    const raw = bot && bot.botType;
    if (Number.isFinite(Number(raw))) return Math.abs(Math.floor(Number(raw))) % PERSONALITIES.length;
    const str = String(raw || (bot && bot.uid) || (bot && bot.name) || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    return Math.abs(hash) % PERSONALITIES.length;
  }

  function makeMessage(uid, name, text, isBot) {
    return {
      id: 'chat_' + (messageSeq++),
      uid: String(uid || 'unknown'),
      name: String(name || (isBot ? 'Player' : 'Runner')).slice(0, 24),
      text: sanitizeMessage(text),
      isBot: Boolean(isBot),
      createdAt: Date.now()
    };
  }

  function renderMessages() {
    if (!messageList || !root.document) return;
    messageList.textContent = '';
    const state = getState();
    const localUid = state && state.localUid;
    messages.slice(-6).forEach(function (message) {
      const row = root.document.createElement('div');
      row.className = 'arena-chat-message';
      if (message.isBot) row.classList.add('is-bot');
      if (!message.isBot && message.uid === localUid) row.classList.add('is-self');

      const sender = root.document.createElement('span');
      sender.className = 'arena-chat-sender';
      sender.textContent = !message.isBot && message.uid === localUid ? 'You' : message.name;

      const body = root.document.createElement('span');
      body.className = 'arena-chat-text';
      body.textContent = message.text;

      row.appendChild(sender);
      row.appendChild(body);
      messageList.appendChild(row);
    });
    messageList.scrollTop = messageList.scrollHeight;
  }

  function refresh() {
    if (!container) return;
    const active = canInteractWithChat();
    container.classList.toggle('is-active', active);
    container.classList.toggle('is-open', active && open);
    container.style.display = active && (open || messagesVisible) ? 'flex' : 'none';
    if (composer) composer.style.display = active && open ? 'flex' : 'none';
    if (hint) hint.style.display = active && !open ? 'block' : 'none';
    if (mobileButton) mobileButton.style.display = active ? '' : 'none';
    if (!active && open) closeChat(false);
  }

  function scheduleFade() {
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      pendingTimers.delete(fadeTimer);
    }
    const sessionAtSchedule = matchSessionId;
    const timerId = scheduleTimer(function () {
      if (matchSessionId === sessionAtSchedule && !open) {
        messagesVisible = false;
        refresh();
      }
    }, MESSAGE_VISIBLE_MS);
    fadeTimer = timerId;
  }

  function showMessage(rawMessage) {
    if (!isArenaChatAvailable() || !rawMessage) return false;
    const text = sanitizeMessage(rawMessage.text);
    if (!text) return false;
    messages.push(makeMessage(rawMessage.uid, rawMessage.name, text, rawMessage.isBot));
    messagesVisible = true;
    if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);
    renderMessages();
    refresh();
    if (!open) scheduleFade();
    return true;
  }

  function openChat() {
    if (!canInteractWithChat() || !input) return false;
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      pendingTimers.delete(fadeTimer);
      fadeTimer = null;
    }
    open = true;
    refresh();
    input.value = '';
    input.focus({ preventScroll: true });
    return true;
  }

  function closeChat(clearDraft) {
    open = false;
    if (clearDraft && input) input.value = '';
    if (input && root.document && root.document.activeElement === input) input.blur();
    refresh();
    if (messages.length) scheduleFade();
    return true;
  }

  function submitMessage() {
    if (!open || !input) return false;
    const text = sanitizeMessage(input.value);
    input.value = '';
    closeChat(false);
    if (!text || !root.NetcodeSystem || typeof root.NetcodeSystem.sendChatMessage !== 'function') return false;
    return root.NetcodeSystem.sendChatMessage(text);
  }

  function handleDocumentKeydown(event) {
    if (!event || root.isRebindingInput || !canInteractWithChat()) return false;
    if (open) {
      if (event.code === 'Enter' || event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitMessage();
        return true;
      }
      if (event.code === 'Escape' || event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeChat(true);
        return true;
      }
      return false;
    }

    const target = event.target;
    const targetTag = target && target.tagName ? target.tagName.toUpperCase() : '';
    if ((event.code === 'Enter' || event.key === 'Enter') && !event.repeat &&
        targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && targetTag !== 'SELECT') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChat();
      return true;
    }
    return false;
  }

  function markBotSpoken(bot) {
    lastBotSpeakAt.set(getBotKey(bot), Date.now());
  }

  function canBotSpeak(bot) {
    if (!bot) return false;
    const memory = getMemory(bot);
    const cooldown = isHumbled(memory)
      ? BOT_COOLDOWN_MS * 2.2
      : memory.mood === 'cocky' ? BOT_COOLDOWN_MS * 0.82 : BOT_COOLDOWN_MS;
    const last = lastBotSpeakAt.get(getBotKey(bot)) || 0;
    return Date.now() - last >= cooldown;
  }

  function sendBotLine(bot, text, delayMs, allowDead, ignoreCooldown) {
    if (!bot || !text || !isArenaChatAvailable()) return false;
    if (!allowDead && bot.alive === false) return false;
    if (!ignoreCooldown && !canBotSpeak(bot)) return false;
    const clean = sanitizeMessage(text);
    if (!clean) return false;
    const stateAtSchedule = getState();
    const mapAtSchedule = stateAtSchedule && stateAtSchedule.mapId;
    markBotSpoken(bot);
    scheduleTimer(function () {
      const current = getState();
      if (!isArenaChatAvailable() || !current || current.mapId !== mapAtSchedule) return;
      const api = root.NetcodeSystem;
      if (api && typeof api.sendBotChatMessage === 'function') {
        api.sendBotChatMessage(
          bot.uid || ('warmup_' + String(bot.name || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '_')),
          bot.name,
          clean
        );
      }
    }, delayMs);
    return true;
  }

  function chooseEventBot(event) {
    const roster = getBotRoster();
    if (event && event.botUid) {
      const exact = roster.find(function (bot) { return bot.uid === event.botUid; });
      if (exact) return exact;
    }
    if (event && event.botName) {
      const named = roster.find(function (bot) { return bot.name === event.botName; });
      if (named) return named;
      return {
        uid: event.botUid || ('warmup_' + event.botName.toLowerCase().replace(/[^a-z0-9]+/g, '_')),
        name: event.botName,
        botType: event.botType,
        alive: true
      };
    }
    const living = roster.filter(function (bot) { return bot.alive !== false; });
    return randomItem(living.length ? living : roster) || null;
  }

  function eventText(event, bot) {
    const archetype = RIVALRY_ARCHETYPES[getPersonalityIndex(bot)];
    const memory = getMemory(bot);
    const playerName = String(event.playerName || event.victimName || 'you').slice(0, 24);
    const killerName = String(event.killerName || event.attackerName || 'someone').slice(0, 24);
    const vars = {
      player: playerName,
      bot: String(event.botName || event.victimName || bot.name || 'bro').slice(0, 24),
      weapon: String(event.weaponName || event.weapon || 'that weapon').slice(0, 24),
      rStreak: botRoundStreak
    };

    if (isHumbled(memory)) return { text: pickFreshLine(bot, archetype.humbled, vars), highPriority: true };
    if (event.type === 'bot_killed_player') {
      if (memory.streakOnPlayer >= 5) return { text: pickFreshLine(bot, archetype.streak5, vars), highPriority: true };
      if (memory.streakOnPlayer >= 4) return { text: pickFreshLine(bot, archetype.streak4, vars), highPriority: true };
      if (memory.streakOnPlayer >= 3) return { text: pickFreshLine(bot, archetype.streak3, vars), highPriority: true };
      if (memory.tilt >= 2) return { text: pickFreshLine(bot, archetype.frustrated, vars) };
      return { text: pickFreshLine(bot, archetype.kill, vars) };
    }
    if (event.type === 'player_killed_bot') {
      if (memory.streakByPlayer >= 3) return { text: pickFreshLine(bot, archetype.frustrated, vars), highPriority: true };
      if (memory.grudgeTargetUid) return { text: pickFreshLine(bot, archetype.revenge, vars) };
      return { text: pickFreshLine(bot, archetype.killed, vars) };
    }
    if (event.type === 'bot_killed_bot') {
      const victimMemory = event.victimUid ? getMemory(String(event.victimUid), false) : null;
      if (victimMemory && victimMemory.deathsToBots >= 3) {
        vars.bot = String(event.victimName || 'bro').slice(0, 24);
        return { text: pickFreshLine(bot, SITUATIONAL.botStruggling, vars) };
      }
      vars.bot = killerName;
      return { text: pickFreshLine(bot, SITUATIONAL.botCarrying, vars) };
    }
    if (event.type === 'bot_kill_streak') {
      const pool = memory.streakOnPlayer >= 5 ? archetype.streak5 :
        memory.streakOnPlayer >= 4 ? archetype.streak4 : archetype.streak3;
      return { text: pickFreshLine(bot, pool, vars), highPriority: true };
    }
    if (event.type === 'player_low_health') {
      return { text: pickFreshLine(bot, [
        playerName + ' is one shot',
        'push ' + playerName + ' theyre weak',
        'dont let ' + playerName + ' reset',
        'careful ' + playerName + ', youre weak'
      ], vars) };
    }
    if (event.type === 'player_kill_streak') {
      return { text: pickFreshLine(bot, [
        'somebody stop ' + playerName,
        playerName + ' is actually frying',
        'ok ' + playerName + ' turn it off'
      ], vars) };
    }
    if (event.type === 'player_camping') return { text: pickFreshLine(bot, SITUATIONAL.camping, vars) };
    if (event.type === 'player_weapon_switch') return { text: pickFreshLine(bot, SITUATIONAL.weaponSwitch, vars) };
    if (event.type === 'impressive_movement') return { text: pickFreshLine(bot, SITUATIONAL.movement, vars) };
    if (event.type === 'round_start') return { text: pickFreshLine(bot, archetype.round, vars) };
    if (event.type === 'round_end') {
      const pool = event.winnerIsBot
        ? (botRoundStreak >= 3 ? ['{rStreak} straight rounds bro', 'same map same result', 'just ff at this point'] : ['round secured', 'good round', 'one more'])
        : (playerRoundStreak >= 3 ? ['ok youre actually winning rounds', 'we need to lock in', 'this is getting old'] : ['fair round', 'run it back', 'next one']);
      return { text: pickFreshLine(bot, pool, vars), highPriority: botRoundStreak >= 3 || playerRoundStreak >= 3 };
    }
    return null;
  }

  function handleGameEvent(event) {
    const state = getState();
    if (!event || !isArenaChatAvailable() || !state || (state.role !== 'warmup' && state.role !== 'host')) return false;
    ensureMatchMemory();
    const bot = chooseEventBot(event);
    if (!bot) return false;

    if (event.type === 'round_end' && !recordRoundResult(event)) return false;
    const memory = event.type === 'round_end' ? getMemory(bot) : recordEventMemory(event, bot);
    let dialogueEvent = event;
    if (event.type === 'bot_killed_player' && memory.streakOnPlayer >= 3) {
      dialogueEvent = Object.assign({}, event, { type: 'bot_kill_streak' });
    }

    const result = eventText(dialogueEvent, bot);
    if (!result || !result.text) return false;
    const rivalry = getBotRivalry(getBotKey(bot));
    const baseChance = EVENT_CHANCE[event.type] || EVENT_CHANCE[dialogueEvent.type] || 0;
    const adjustedChance = clamp(baseChance * rivalry.chattiness, 0, 0.84);
    const chance = result.highPriority ? Math.max(adjustedChance, 0.70) : adjustedChance;
    if (!chance || Math.random() > chance) return false;

    const now = Date.now();
    const globalCooldown = result.highPriority ? EVENT_COOLDOWN_MS * 0.72 : EVENT_COOLDOWN_MS;
    if (now - lastEventAt < globalCooldown) return false;
    const key = getBotKey(bot);
    if (lastBotLine.get(key) === result.text) return false;
    if (!sendBotLine(bot, result.text, 350 + Math.floor(Math.random() * 800),
        event.type === 'player_killed_bot' || event.type === 'round_end')) return false;

    lastBotLine.set(key, result.text);
    lastEventAt = now;
    if (event.type === 'round_start' && Math.random() < 0.32) maybeTriggerBotBanter(bot);
    return true;
  }

  function buildContextReply(bot, category, rawText) {
    const memory = getMemory(bot);
    updateMood(memory);
    const diff = memory.killsOnPlayer - memory.deathsToPlayer;
    const score = memory.killsOnPlayer + '-' + memory.deathsToPlayer;
    const vars = { score: score, rStreak: botRoundStreak };

    if (category === 'score_query') return buildScoreSummary();
    if (memory.mood === 'humbled') return pickFreshLine(bot, ['...', 'whatever', 'ok', 'just play'], vars);
    if (category === 'taunt') {
      if (diff >= 2 || botRoundStreak >= 3) {
        return pickFreshLine(bot, ['bro youre down {score} and typing', 'scoreboard says {score} lol', 'win a duel first', 'typing more than shooting'], vars);
      }
      if (diff <= -2) return pickFreshLine(bot, ['congrats you found left click', 'keep that energy next round', 'yeah yeah enjoy it'], vars);
      return pickFreshLine(bot, ['we will see', 'run it back then', 'keep talking', 'all talk'], vars);
    }
    if (category === 'excuse') {
      return pickFreshLine(bot, diff >= 1
        ? ['classic excuse', 'blame the ping not the aim', 'sure bro whatever helps you sleep']
        : ['cope', 'lol ok', 'sure man', 'skill issue'], vars);
    }
    if (category === 'rage') {
      return pickFreshLine(bot, diff >= 2 || botRoundStreak >= 3
        ? ['hes tilting lmaooo', 'deep breaths bro', 'u good?', 'focus up']
        : ['chill bro', 'relax', 'its just a game lol'], vars);
    }
    if (category === 'gg') {
      if (diff >= 3) return pickFreshLine(bot, ['gg ez', 'ggs', 'good warmup'], vars);
      if (memory.tilt >= 3) return pickFreshLine(bot, ['bg', 'whatever gg', 'lucky lobby'], vars);
      return pickFreshLine(bot, ['ggs', 'wp', 'good fights', 'respect'], vars);
    }
    if (category === 'greeting') return pickFreshLine(bot, ['yo', 'sup', 'glhf', 'whats good'], vars);
    if (category === 'question') {
      if (String(rawText || '').toLowerCase().indexOf('bot') !== -1) {
        return pickFreshLine(bot, ['nah im real bro', 'losing to a bot would be crazy', 'check scoreboard'], vars);
      }
      return pickFreshLine(bot, ['depends whos asking', 'ask me after the round', 'maybe', 'what do you think'], vars);
    }
    return pickFreshLine(bot, ['mid fight bro', 'lmao', 'anyway', 'crazy', 'word'], vars);
  }

  function pickReplyBot(roster) {
    const ready = roster.filter(function (bot) { return bot.alive !== false && canBotSpeak(bot); });
    if (!ready.length) return null;
    if (lastKillerBotKey) {
      const recent = ready.find(function (bot) { return getBotKey(bot) === lastKillerBotKey; });
      if (recent && !isHumbled(getMemory(recent)) && Math.random() < 0.58) return recent;
    }
    return ready.slice().sort(function (a, b) {
      const ma = getMemory(a);
      const mb = getMemory(b);
      return (mb.killsOnPlayer + mb.deathsToPlayer) - (ma.killsOnPlayer + ma.deathsToPlayer);
    })[0] || randomItem(ready);
  }

  function handlePlayerMessage(message) {
    const state = getState();
    if (!message || message.isBot || !isArenaChatAvailable() || !state) return false;
    if (state.role !== 'warmup' && state.role !== 'host') return false;
    ensureMatchMemory();
    if (Date.now() - lastPlayerReplyAt < PLAYER_REPLY_COOLDOWN_MS) return false;
    const category = classifyPlayerMessage(message.text);
    const replyChance = category === 'score_query' || category === 'taunt' || category === 'rage' || category === 'excuse'
      ? 0.86
      : 0.62;
    if (Math.random() > replyChance) return false;
    const roster = getBotRoster();
    const bot = pickReplyBot(roster);
    if (!bot) return false;
    const line = buildContextReply(bot, category, message.text);
    if (!line) return false;
    const key = getBotKey(bot);
    if (lastBotLine.get(key) === line) return false;
    if (!sendBotLine(bot, line, 600 + Math.floor(Math.random() * 850), false)) return false;
    lastBotLine.set(key, line);
    lastPlayerReplyAt = Date.now();
    return true;
  }

  function onChatMessage(message) {
    if (!message || !isArenaChatAvailable()) return false;
    ensureMatchMemory();
    const shown = showMessage(message);
    if (shown && !message.isBot) handlePlayerMessage(message);
    return shown;
  }

  function init() {
    if (initialized || !root.document) return;
    initialized = true;
    container = root.document.getElementById('arenaChat');
    messageList = root.document.getElementById('arenaChatMessages');
    composer = root.document.getElementById('arenaChatComposer');
    input = root.document.getElementById('arenaChatInput');
    hint = root.document.getElementById('arenaChatHint');
    mobileButton = root.document.getElementById('mtChatBtn');
    if (mobileButton) mobileButton.addEventListener('click', openChat);
    root.document.addEventListener('keydown', handleDocumentKeydown, true);
    refresh();
  }

  init();

  return {
    MAX_MESSAGE_LENGTH: MAX_MESSAGE_LENGTH,
    sanitizeMessage: sanitizeMessage,
    classifyPlayerMessage: classifyPlayerMessage,
    isOpen: function () { return open; },
    isEnabled: isArenaChatAvailable,
    canInteract: canInteractWithChat,
    open: openChat,
    close: closeChat,
    refresh: refresh,
    resetMatchMemory: resetMatchMemory,
    getBotRivalry: getBotRivalry,
    handleGameEvent: handleGameEvent,
    onChatMessage: onChatMessage,
    _getBotRoster: getBotRoster
  };
});
