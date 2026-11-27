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
  const EVENT_COOLDOWN_MS = 2600;
  const BOT_COOLDOWN_MS = 8500;
  const PLAYER_REPLY_COOLDOWN_MS = 2600;

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
    bot_killed_player: 0.58,
    player_killed_bot: 0.54,
    bot_killed_bot: 0.24,
    round_start: 0.28
  };

  const REPLIES = {
    greeting: ['yo', 'sup', 'glhf', 'hey', 'whats good'],
    gg: ['ggs', 'wp', 'that was clean', 'respect', 'gg'],
    taunt: ['you typing or playing', 'scoreboard says otherwise', 'keep talking', 'we will see', 'sure man'],
    question: ['depends whos asking', 'maybe', 'ask me after the round', 'what do you think'],
    general: ['mid fight bro', 'anyway', 'you good', 'not reading all that', 'lmao']
  };

  const lastBotSpeakAt = new Map();
  const lastBotLine = new Map();
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
    if (/\b(hi|hey|hello|yo|sup|glhf|whats up|what's up)\b/.test(text)) return 'greeting';
    if (/\b(gg|ggs|wp|well played|nice shot|nice)\b/.test(text)) return 'gg';
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
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      fadeTimer = null;
      if (!open) {
        messagesVisible = false;
        refresh();
      }
    }, MESSAGE_VISIBLE_MS);
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
    const key = String(bot && (bot.uid || bot.name) || 'bot');
    lastBotSpeakAt.set(key, Date.now());
  }

  function canBotSpeak(bot) {
    const key = String(bot && (bot.uid || bot.name) || 'bot');
    const last = lastBotSpeakAt.get(key) || 0;
    return Boolean(bot && Date.now() - last >= BOT_COOLDOWN_MS);
  }

  function sendBotLine(bot, text, delayMs, allowDead) {
    if (!bot || !text || !isArenaChatAvailable()) return false;
    if (!allowDead && bot.alive === false) return false;
    if (!canBotSpeak(bot)) return false;
    const clean = sanitizeMessage(text);
    if (!clean) return false;
    const stateAtSchedule = getState();
    const mapAtSchedule = stateAtSchedule && stateAtSchedule.mapId;
    markBotSpoken(bot);
    setTimeout(function () {
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
    }, Math.max(0, Number(delayMs) || 0));
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
    const personality = PERSONALITIES[getPersonalityIndex(bot)];
    const playerName = String(event.playerName || event.victimName || 'you').slice(0, 24);
    const killerName = String(event.killerName || event.attackerName || 'someone').slice(0, 24);
    let pool = [];
    if (event.type === 'bot_killed_player') {
      pool = personality.kill.concat([playerName + ', back to spawn', 'got you ' + playerName, 'you gotta watch that angle']);
    } else if (event.type === 'player_killed_bot') {
      pool = personality.killed.concat([playerName + ' got me there', 'ok ' + playerName + ', i see you', 'that was a nasty shot']);
    } else if (event.type === 'bot_killed_bot') {
      pool = [killerName + ' is actually frying', 'someone stop ' + killerName, 'that trade was rough', 'bro just got folded'];
    } else if (event.type === 'round_start') {
      pool = personality.round;
    }
    return randomItem(pool);
  }

  function handleGameEvent(event) {
    if (!event || !isArenaChatAvailable()) return false;
    const chance = EVENT_CHANCE[event.type] || 0;
    if (!chance || Math.random() > chance) return false;
    if (Date.now() - lastEventAt < EVENT_COOLDOWN_MS) return false;
    const bot = chooseEventBot(event);
    if (!bot || !canBotSpeak(bot)) return false;
    const line = eventText(event, bot);
    if (!line) return false;
    const key = String(bot.uid || bot.name);
    if (lastBotLine.get(key) === line) return false;
    lastBotLine.set(key, line);
    lastEventAt = Date.now();
    return sendBotLine(bot, line, 350 + Math.floor(Math.random() * 1050), event.type === 'player_killed_bot');
  }

  function handlePlayerMessage(message) {
    const state = getState();
    if (!message || message.isBot || !isArenaChatAvailable() || !state) return false;
    if (state.role !== 'warmup' && state.role !== 'host') return false;
    if (Date.now() - lastPlayerReplyAt < PLAYER_REPLY_COOLDOWN_MS) return false;
    if (Math.random() > 0.68) return false;
    const roster = getBotRoster();
    if (!roster.length) return false;
    const ready = roster.filter(function (bot) { return bot.alive !== false && canBotSpeak(bot); });
    if (!ready.length) return false;
    const bot = randomItem(ready);
    const category = classifyPlayerMessage(message.text);
    const line = randomItem(REPLIES[category] || REPLIES.general);
    const key = String(bot.uid || bot.name);
    if (lastBotLine.get(key) === line) return false;
    lastBotLine.set(key, line);
    lastPlayerReplyAt = Date.now();
    return sendBotLine(bot, line, 650 + Math.floor(Math.random() * 1250), false);
  }

  function onChatMessage(message) {
    if (!message || !isArenaChatAvailable()) return false;
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
    handleGameEvent: handleGameEvent,
    onChatMessage: onChatMessage,
    _getBotRoster: getBotRoster
  };
});
