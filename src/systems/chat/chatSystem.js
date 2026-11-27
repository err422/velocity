// Local arena text chat and self-contained human-like bot dialogue coordinator.
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
  const MAX_HISTORY = 10;
  const MESSAGE_VISIBLE_MS = 9500;
  const EVENT_COOLDOWN_MS = 2300;
  const HIGH_PRIORITY_EVENT_COOLDOWN_MS = 650;
  const BOT_COOLDOWN_MS = 6500;
  const HIGH_PRIORITY_BOT_COOLDOWN_MS = 2100;
  const PLAYER_REPLY_COOLDOWN_MS = 1400;

  const EVENT_CHANCE = {
    bot_killed_player: 0.64,
    player_killed_bot: 0.62,
    bot_killed_bot: 0.30,
    void_fall: 0.88,
    player_low_health: 0.34,
    player_kill_streak: 0.74,
    round_start: 0.40,
    match_over: 1.0,
    map_vote_cast: 0.84
  };

  const HIGH_PRIORITY_EVENTS = new Set(['match_over', 'map_vote_cast', 'void_fall']);

  function getBanterEngine() {
    if (root.BotBanterEngine) return root.BotBanterEngine;
    if (typeof require === 'function') {
      try { return require('./botBanterEngine.js'); } catch (_) { return null; }
    }
    return null;
  }

  const lastBotSpeakAt = new Map();
  const pendingBotTimers = new Set();
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
    const engine = getBanterEngine();
    if (engine && typeof engine.classifyPlayerMessage === 'function') {
      return engine.classifyPlayerMessage(sanitizeMessage(value));
    }
    const text = sanitizeMessage(value).toLowerCase();
    if (!text) return 'empty';
    if (/\b(hi|hey|hello|yo|sup|glhf|whats up|what's up)\b/.test(text)) return 'greeting';
    if (/\b(gg|ggs|wp|well played|nice shot|nice)\b/.test(text)) return 'gg';
    if (/\b(ez|easy|noob|trash|bot|bad|skill issue|diff|owned|rekt)\b/.test(text)) return 'taunt';
    if (text.includes('?')) return 'question';
    return 'general';
  }

  function analyzePlayerMessage(value) {
    const engine = getBanterEngine();
    if (engine && typeof engine.analyzePlayerMessage === 'function') {
      return engine.analyzePlayerMessage(sanitizeMessage(value), getBotRoster(), getState());
    }
    const cat = classifyPlayerMessage(value);
    return { intent: cat, legacyCategory: cat, mentionedBot: null, mentionedMap: null, mentionedWeapon: null };
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
    const state = getState();
    if (state && state.phase === 'match_over') {
      return !pageState || pageState === 'playing' || pageState === 'match_over';
    }
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
      // Keep bots visually indistinguishable from real opponents (no purple "bot" giveaway)
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
    const state = getState();
    const active = canInteractWithChat();
    const isPostMatch = Boolean(active && state && state.phase === 'match_over');
    container.classList.toggle('is-active', active);
    container.classList.toggle('is-open', active && open);
    container.classList.toggle('is-postmatch', isPostMatch);
    container.style.display = active && (open || messagesVisible || isPostMatch) ? 'flex' : 'none';
    if (composer) composer.style.display = active && open ? 'flex' : 'none';
    if (hint) hint.style.display = active && !open ? 'block' : 'none';
    if (mobileButton) mobileButton.style.display = active ? '' : 'none';
    if (!active && open) closeChat(false);
  }

  function scheduleFade() {
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      fadeTimer = null;
      const state = getState();
      if (!open && !(state && state.phase === 'match_over')) {
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

  function clearPendingBotTimers() {
    for (const id of pendingBotTimers) {
      clearTimeout(id);
    }
    pendingBotTimers.clear();
  }

  function resetMatchMemory() {
    clearPendingBotTimers();
    lastBotSpeakAt.clear();
    lastEventAt = 0;
    lastPlayerReplyAt = 0;
    const engine = getBanterEngine();
    if (engine && typeof engine.resetMatchMemory === 'function') {
      engine.resetMatchMemory();
    }
  }

  function markBotSpoken(bot) {
    const key = String(bot && (bot.uid || bot.name) || 'bot');
    lastBotSpeakAt.set(key, Date.now());
  }

  function canBotSpeak(bot, highPriority) {
    if (!bot) return false;
    const key = String(bot.uid || bot.name || 'bot');
    const last = lastBotSpeakAt.get(key) || 0;
    const cooldown = highPriority ? HIGH_PRIORITY_BOT_COOLDOWN_MS : BOT_COOLDOWN_MS;
    return Date.now() - last >= cooldown;
  }

  function sendBotLine(bot, text, delayMs, allowDead, highPriority) {
    if (!bot || !text || !isArenaChatAvailable()) return false;
    if (!allowDead && bot.alive === false) return false;
    if (!canBotSpeak(bot, highPriority)) return false;
    const clean = sanitizeMessage(text);
    if (!clean) return false;
    const engine = getBanterEngine();
    if (engine && typeof engine.containsSlur === 'function' && engine.containsSlur(clean)) return false;

    const stateAtSchedule = getState();
    const mapAtSchedule = stateAtSchedule && stateAtSchedule.mapId;
    markBotSpoken(bot);

    const timerId = setTimeout(function () {
      pendingBotTimers.delete(timerId);
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
    pendingBotTimers.add(timerId);
    return true;
  }

  function scheduleReaction(reaction, highPriority) {
    if (!reaction || !reaction.primary || !reaction.primary.bot || !reaction.primary.text) return false;
    const p = reaction.primary;
    const sent = sendBotLine(p.bot, p.text, p.delayMs, Boolean(p.allowDead), highPriority);
    if (sent && reaction.followUp && reaction.followUp.bot && reaction.followUp.text) {
      const f = reaction.followUp;
      const sameBot = String(f.bot.uid || f.bot.name) === String(p.bot.uid || p.bot.name);
      // Allow realistic double-text from the same bot or cross-talk from another bot
      if (sameBot) {
        const clean = sanitizeMessage(f.text);
        const stateAtSchedule = getState();
        const mapAtSchedule = stateAtSchedule && stateAtSchedule.mapId;
        if (clean) {
          const tId = setTimeout(function () {
            pendingBotTimers.delete(tId);
            const current = getState();
            if (!isArenaChatAvailable() || !current || current.mapId !== mapAtSchedule) return;
            const api = root.NetcodeSystem;
            if (api && typeof api.sendBotChatMessage === 'function') {
              api.sendBotChatMessage(
                f.bot.uid || ('warmup_' + String(f.bot.name || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '_')),
                f.bot.name,
                clean
              );
            }
          }, Math.max(600, Number(f.delayMs) || 1400));
          pendingBotTimers.add(tId);
        }
      } else {
        sendBotLine(f.bot, f.text, f.delayMs, Boolean(f.allowDead), true);
      }
    }
    return sent;
  }

  function handleGameEvent(event) {
    if (!event || !isArenaChatAvailable()) return false;
    const highPriority = HIGH_PRIORITY_EVENTS.has(event.type);
    const baseChance = EVENT_CHANCE[event.type] || 0;
    if (!baseChance) return false;

    const now = Date.now();
    const evCooldown = highPriority ? HIGH_PRIORITY_EVENT_COOLDOWN_MS : EVENT_COOLDOWN_MS;
    if (!highPriority && now - lastEventAt < evCooldown) return false;

    const engine = getBanterEngine();
    if (!engine || typeof engine.generateEventReaction !== 'function') return false;

    const roster = getBotRoster();
    const state = getState();

    // Scale speak probability subtly by persona chattiness when a specific bot is involved
    let chance = baseChance;
    if (!highPriority && (event.botUid || event.botName)) {
      const target = roster.find(function (b) {
        return (event.botUid && b.uid === event.botUid) || (event.botName && b.name === event.botName);
      });
      if (target && typeof engine.getBotProfile === 'function') {
        const prof = engine.getBotProfile(target);
        const spec = prof && engine.PERSONA_PROFILES && engine.PERSONA_PROFILES[prof.personaId];
        if (spec && spec.chattiness) {
          chance = Math.min(0.95, baseChance * spec.chattiness);
        }
      }
    }
    if (chance < 1 && Math.random() > chance) return false;

    const reaction = engine.generateEventReaction(event, roster, state);
    if (!reaction || !reaction.primary) return false;
    if (!canBotSpeak(reaction.primary.bot, highPriority)) return false;

    lastEventAt = now;
    return scheduleReaction(reaction, highPriority);
  }

  function handlePlayerMessage(message) {
    const state = getState();
    if (!message || message.isBot || !isArenaChatAvailable() || !state) return false;
    if (state.role !== 'warmup' && state.role !== 'host') return false;
    const now = Date.now();
    if (now - lastPlayerReplyAt < PLAYER_REPLY_COOLDOWN_MS) return false;

    const roster = getBotRoster();
    if (!roster.length) return false;

    const engine = getBanterEngine();
    if (!engine || typeof engine.generatePlayerReply !== 'function') return false;

    const reaction = engine.generatePlayerReply(message.text, message.name, roster, state);
    if (!reaction || !reaction.primary) return false;

    const analysis = reaction.analysis || {};
    const highReplyChance = Boolean(
      analysis.mentionedBot ||
      state.phase === 'match_over' ||
      ['bot_accusation', 'hackusation', 'direct_insult', 'map_talk', 'camping_salt'].includes(analysis.intent)
    );
    const replyProb = highReplyChance ? 0.98 : 0.84;
    if (Math.random() > replyProb) return false;

    lastPlayerReplyAt = now;
    return scheduleReaction(reaction, true);
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
    analyzePlayerMessage: analyzePlayerMessage,
    resetMatchMemory: resetMatchMemory,
    isOpen: function () { return open; },
    isEnabled: isArenaChatAvailable,
    canInteract: canInteractWithChat,
    open: openChat,
    close: closeChat,
    refresh: refresh,
    handleGameEvent: handleGameEvent,
    onChatMessage: onChatMessage,
    getMessages: function () { return messages.slice(); },
    _getBotRoster: getBotRoster
  };
});
