// Serverless WebRTC + Firestore Signaling & Arena Match Coordinator (Host-Authoritative Star Topology)
(function (root) {
  'use strict';

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  const POSE_SEND_INTERVAL = 1 / 30;
  const HEARTBEAT_INTERVAL_MS = 10000;
  const DUEL_WIN_ROUNDS = 5;
  const FFA_WIN_KILLS = 15;
  const FFA_RESPAWN_SEC = 2.5;
  const WARMUP_RESPAWN_SEC = 2.4;
  const LOBBY_BOT_FILL_DELAY_MS = 60000;
  const DUEL_FREEZE_SEC = 2.2;
  const DUEL_POST_ROUND_SEC = 2.4;
  const MAP_VOTE_DURATION_SEC = 12;
  const VOID_ASSIST_WINDOW_MS = 5000;
  const CHAT_MAX_LENGTH = 160;
  const CHAT_RATE_LIMIT_MS = 650;
  const FALLBACK_ARENA_IDS = ['arena_surf', 'arena_aim', 'arena_spire', 'arena_cargo', 'arena_skyline', 'arena_canyon'];

  function getValidArenaIds() {
    if (root.ArenaCatalog && Array.isArray(root.ArenaCatalog.ARENA_IDS) && root.ArenaCatalog.ARENA_IDS.length) {
      return root.ArenaCatalog.ARENA_IDS;
    }
    return FALLBACK_ARENA_IDS;
  }

  function normalizeArenaMapId(mapId, allowSandbox) {
    if (allowSandbox && mapId === 'sandbox') return 'sandbox';
    const ids = getValidArenaIds();
    return ids.includes(mapId) ? mapId : 'arena_surf';
  }

  function computeVoteTally(options, votes, currentMapId) {
    const opts = Array.isArray(options) && options.length ? options.slice() : getValidArenaIds().slice(0, 3);
    const counts = {};
    for (const id of opts) counts[id] = 0;
    let totalVotes = 0;
    const voteMap = votes && typeof votes === 'object' ? votes : {};
    for (const uid of Object.keys(voteMap)) {
      const choice = voteMap[uid];
      if (Object.prototype.hasOwnProperty.call(counts, choice)) {
        counts[choice] += 1;
        totalVotes += 1;
      }
    }
    // Deterministic tie-breaker: highest votes wins; ties prefer the first option
    // (fresh arenas are placed before the current-map rematch option)
    let winnerMapId = opts[0] || normalizeArenaMapId(currentMapId, false);
    let bestCount = -1;
    for (const id of opts) {
      if (counts[id] > bestCount) {
        bestCount = counts[id];
        winnerMapId = id;
      }
    }
    return { counts, totalVotes, winnerMapId };
  }

  const state = {
    role: 'none', // 'none' | 'warmup' | 'host' | 'client'
    mapId: 'arena_surf',
    mode: 'duel_1v1', // 'duel_1v1' | 'ffa_4p'
    lobby: null,
    localUid: '',
    localName: 'Runner',
    statusText: 'IDLE',
    phase: 'warmup', // 'warmup' | 'countdown' | 'live' | 'round_over' | 'match_over'
    round: 1,
    freezeTimer: 0,
    respawnTimer: 0,
    localHp: 100,
    localAlive: true,
    matchWinnerUid: null,
    matchWinnerName: '',
    lastWarmupAttacker: null, // { name, weapon, atMs }
    mapVote: {
      active: false,
      options: [],
      votes: {},
      remainingSec: 0,
      resolvedMapId: null
    },
    players: new Map(), // uid -> { uid, name, hp, alive, score, kills, deaths, spawnIdx, slot, lastAttackerUid, lastAttackerName, lastAttackerSlot, lastDamagedAtMs }
    killFeed: [] // { id, killer, victim, weapon, headshot, ts }
  };
  const chatLastSentAt = new Map();
  let chatSeq = 1;

  // WebRTC handles
  const hostPeers = new Map(); // peerUid -> { pc, poseCh, gameCh, displayName, offerApplied, candSet }
  let clientPc = null;
  let clientPoseCh = null;
  let clientGameCh = null;
  let clientAnswerApplied = false;
  let clientOfferWritten = false;
  let clientConnected = false;
  let clientJoinTimeout = null;
  const clientCandSet = new Set();

  let unsubPeers = null;
  let unsubMyPeer = null;
  let heartbeatTimer = null;
  let roundTimeout = null;
  let botFillTimer = null;
  let poseAccum = 0;
  let feedSeq = 1;
  let arenaSpawns = [];

  // UI/Engine callbacks
  const callbacks = {
    onStateChange: null,
    onKillFeed: null,
    onBanner: null,
    onMatchEnd: null,
    onMapChange: null,
    onLocalKill: null,
    onLocalDamage: null,
    onLocalRespawn: null,
    onRemoteTracer: null,
    onChatMessage: null,
    onBotEvent: null,
    onLeave: null
  };

  function emitState() {
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(getPublicState());
    }
  }

  const KILLFEED_WEAPON_NAMES = {
    rifle: 'V-47',
    famas: 'F-33',
    scar: 'SC-20',
    honeybadger: 'HB-7',
    smg: 'VX-9',
    mp7: 'MP-7',
    shotgun: 'M870',
    sawedoff: 'DB-12',
    leverslug: 'LV-45',
    awp: 'AWP',
    dmr: 'MK-14',
    scout: 'SSG-08',
    katana: 'KATANA',
    revolver: 'R-88',
    deagle: 'DEAGLE',
    pistol: 'USP-9',
    g18: 'G-18',
    akimbo: 'AKIMBO',
    usps: 'USP-S',
    rpg: 'RPG-7',
    minigun: 'M-134',
    railcannon: 'RAIL',
    grenadelauncher: 'MGL-6',
    nuke: 'NUKE',
    melee: 'MELEE',
    knife: 'MELEE',
    void: 'VOID'
  };

  function pushKillFeed(killer, victim, weapon, headshot) {
    const rawWep = String(weapon || 'rifle').toLowerCase();
    const label = KILLFEED_WEAPON_NAMES[rawWep] || rawWep.toUpperCase();
    const entry = {
      id: feedSeq++,
      killer: String(killer || 'Unknown').slice(0, 24),
      victim: String(victim || 'Unknown').slice(0, 24),
      weapon: label,
      headshot: Boolean(headshot),
      ts: performance.now()
    };
    state.killFeed.unshift(entry);
    if (state.killFeed.length > 5) state.killFeed.length = 5;
    if (typeof callbacks.onKillFeed === 'function') {
      callbacks.onKillFeed(state.killFeed.slice());
    }
  }

  function showBanner(text, subtext, durationMs) {
    if (typeof callbacks.onBanner === 'function') {
      callbacks.onBanner({ text, subtext: subtext || '', durationMs: durationMs || 2000 });
    }
  }

  function getLocalIdentity() {
    const st = root.DailyBackend ? root.DailyBackend.getState() : { user: null };
    const user = st && st.user ? st.user : null;
    const uid = user ? user.uid : 'local_' + Math.random().toString(36).slice(2, 8);
    const name = root.VelocitySettings
      ? root.VelocitySettings.resolveEffectiveDisplayName(root.activeSettings, user)
      : ((user && user.displayName) || 'Runner');
    return { uid, name: String(name || 'Runner').slice(0, 24), user };
  }

  function getSpawnForIndex(idx) {
    if (Array.isArray(arenaSpawns) && arenaSpawns.length > 0) {
      return arenaSpawns[((idx % arenaSpawns.length) + arenaSpawns.length) % arenaSpawns.length];
    }
    return { x: 0, y: 0.4, z: 0, yaw: 0 };
  }

  function setArenaSpawns(spawns) {
    arenaSpawns = Array.isArray(spawns) ? spawns.slice() : [];
  }

  function clearTimersAndSubs() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (roundTimeout) {
      clearTimeout(roundTimeout);
      roundTimeout = null;
    }
    if (botFillTimer) {
      clearTimeout(botFillTimer);
      botFillTimer = null;
    }
    if (unsubPeers) {
      try { unsubPeers(); } catch (_) {}
      unsubPeers = null;
    }
    if (unsubMyPeer) {
      try { unsubMyPeer(); } catch (_) {}
      unsubMyPeer = null;
    }
  }

  function closeAllPeerConnections() {
    for (const [, p] of hostPeers) {
      try { p.poseCh && p.poseCh.close(); } catch (_) {}
      try { p.gameCh && p.gameCh.close(); } catch (_) {}
      try { p.pc && p.pc.close(); } catch (_) {}
    }
    hostPeers.clear();

    try { clientPoseCh && clientPoseCh.close(); } catch (_) {}
    try { clientGameCh && clientGameCh.close(); } catch (_) {}
    try { clientPc && clientPc.close(); } catch (_) {}
    clientPoseCh = null;
    clientGameCh = null;
    clientPc = null;
    clientAnswerApplied = false;
    clientOfferWritten = false;
    clientConnected = false;
    if (clientJoinTimeout) {
      clearTimeout(clientJoinTimeout);
      clientJoinTimeout = null;
    }
    clientCandSet.clear();
  }

  function resetMapVoteState() {
    state.mapVote = {
      active: false,
      options: [],
      votes: {},
      remainingSec: 0,
      resolvedMapId: null
    };
  }

  function resetChatSystemsForMatch() {
    if (root.ChatSystem && typeof root.ChatSystem.resetMatchMemory === 'function') {
      root.ChatSystem.resetMatchMemory(state.mapId);
    }
    if (root.CombatSystem && typeof root.CombatSystem.resetChatObservationTrackers === 'function') {
      root.CombatSystem.resetChatObservationTrackers();
    }
  }

  function resetMatchStructures() {
    resetChatSystemsForMatch();
    state.players.clear();
    state.killFeed = [];
    state.round = 1;
    state.freezeTimer = 0;
    state.respawnTimer = 0;
    state.localHp = 100;
    state.localAlive = true;
    state.matchWinnerUid = null;
    state.matchWinnerName = '';
    state.lastWarmupAttacker = null;
    resetMapVoteState();
  }

  function ensurePlayerRecord(uid, name, spawnIdx) {
    let rec = state.players.get(uid);
    if (!rec) {
      rec = {
        uid,
        name: String(name || 'Player').slice(0, 24),
        hp: 100,
        alive: true,
        score: 0,
        kills: 0,
        deaths: 0,
        spawnIdx: typeof spawnIdx === 'number' ? spawnIdx : state.players.size,
        slot: 'rifle',
        isBot: false,
        botType: null,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        ct: 0,
        lastAttackerUid: null,
        lastAttackerName: '',
        lastAttackerSlot: 'void',
        lastDamagedAtMs: 0
      };
      state.players.set(uid, rec);
    } else if (name) {
      rec.name = String(name).slice(0, 24);
    }
    return rec;
  }

  function serializePlayersList() {
    const arr = [];
    for (const [, p] of state.players) {
      arr.push({
        uid: p.uid,
        name: p.name,
        hp: p.hp,
        alive: p.alive,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
        spawnIdx: p.spawnIdx,
        slot: p.slot,
        isBot: Boolean(p.isBot),
        botType: Number.isFinite(p.botType) ? p.botType : null,
        x: Number.isFinite(p.x) ? p.x : 0,
        y: Number.isFinite(p.y) ? p.y : 0,
        z: Number.isFinite(p.z) ? p.z : 0,
        yaw: Number.isFinite(p.yaw) ? p.yaw : 0,
        ct: Number(p.ct) || 0
      });
    }
    return arr;
  }

  function broadcastGame(msg, excludeUid) {
    if (state.role !== 'host') return;
    const raw = JSON.stringify(msg);
    for (const [uid, p] of hostPeers) {
      if (uid === excludeUid) continue;
      if (p.gameCh && p.gameCh.readyState === 'open') {
        try { p.gameCh.send(raw); } catch (_) {}
      }
    }
  }

  function isChatEnabled() {
    return state.role !== 'none' && getValidArenaIds().includes(state.mapId);
  }

  function sanitizeChatText(value) {
    return String(value == null ? '' : value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, CHAT_MAX_LENGTH);
  }

  function emitChatMessage(uid, name, text, isBot) {
    const message = {
      t: 'chat_message',
      id: 'chat_' + (chatSeq++),
      uid: String(uid || 'unknown'),
      name: String(name || (isBot ? 'Player' : 'Runner')).slice(0, 24),
      text: sanitizeChatText(text),
      isBot: Boolean(isBot),
      ts: Date.now()
    };
    if (!message.text) return false;
    if (state.role === 'host') broadcastGame(message);
    if (typeof callbacks.onChatMessage === 'function') callbacks.onChatMessage(message);
    return true;
  }

  function canSendChatNow(uid) {
    const now = Date.now();
    const key = String(uid || state.localUid || 'local');
    const last = chatLastSentAt.get(key) || 0;
    if (now - last < CHAT_RATE_LIMIT_MS) return false;
    chatLastSentAt.set(key, now);
    return true;
  }

  function sendChatMessage(rawText) {
    if (!isChatEnabled()) return false;
    const text = sanitizeChatText(rawText);
    if (!text || !canSendChatNow(state.localUid)) return false;
    if (state.role === 'warmup' || state.role === 'host') {
      return emitChatMessage(state.localUid, state.localName, text, false);
    }
    if (state.role === 'client') {
      if (!clientGameCh || clientGameCh.readyState !== 'open') return false;
      sendToHostGame({ t: 'chat', text });
      return true;
    }
    return false;
  }

  function sendBotChatMessage(botUid, botName, rawText) {
    if (!isChatEnabled()) return false;
    const text = sanitizeChatText(rawText);
    if (!text) return false;
    if (state.role === 'warmup') {
      return emitChatMessage(botUid || 'warmup_bot', botName, text, true);
    }
    if (state.role === 'host') {
      const bot = state.players.get(botUid);
      if (!bot || !bot.isBot || (botName && bot.name !== botName)) return false;
      return emitChatMessage(bot.uid, bot.name, text, true);
    }
    return false;
  }

  function hostRelayChat(peerUid, rawText) {
    if (state.role !== 'host' || !isChatEnabled()) return false;
    const peer = hostPeers.get(peerUid);
    const player = state.players.get(peerUid);
    if (!peer || !peer.joined || !player || player.isBot || !canSendChatNow(peerUid)) return false;
    const text = sanitizeChatText(rawText);
    if (!text) return false;
    return emitChatMessage(peerUid, player.name, text, false);
  }

  function broadcastPose(msg, excludeUid) {
    if (state.role !== 'host') return;
    const raw = JSON.stringify(msg);
    for (const [uid, p] of hostPeers) {
      if (uid === excludeUid) continue;
      if (p.poseCh && p.poseCh.readyState === 'open') {
        try { p.poseCh.send(raw); } catch (_) {}
      }
    }
  }

  function sendToHostGame(msg) {
    if (state.role !== 'client') return;
    if (clientGameCh && clientGameCh.readyState === 'open') {
      try { clientGameCh.send(JSON.stringify(msg)); } catch (_) {}
    }
  }

  function sendToHostPose(msg) {
    if (state.role !== 'client') return;
    if (clientPoseCh && clientPoseCh.readyState === 'open') {
      try { clientPoseCh.send(JSON.stringify(msg)); } catch (_) {}
    }
  }

  function syncLobbyMetaNow() {
    if (state.role !== 'host' || !state.lobby || !root.DailyBackend) return;
    // AI opponents occupy match slots but should not make the public lobby
    // appear full. A real player must still be able to join and replace one.
    const humanCount = Array.from(state.players.values()).filter((p) => !p.isBot).length;
    const count = Math.max(1, Math.min(state.lobby.maxPlayers || 4, humanCount));
    const status = state.phase === 'live' || state.phase === 'countdown' ? 'in_progress' : 'open';
    const mapId = normalizeArenaMapId(state.mapId, false);
    state.lobby.mapId = mapId;
    root.DailyBackend.updateLobby(state.lobby.lobbyId, { playerCount: count, status, mapId }).catch(() => {});
  }

  function broadcastFullSnapshot() {
    if (state.role !== 'host') return;
    const votePayload = state.mapVote.active
      ? {
          options: state.mapVote.options.slice(),
          votes: Object.assign({}, state.mapVote.votes),
          remainingSec: Math.max(0, state.mapVote.remainingSec)
        }
      : null;
    broadcastGame({
      t: 'snapshot',
      mode: state.mode,
      mapId: state.mapId,
      phase: state.phase,
      round: state.round,
      freezeTimer: state.freezeTimer,
      matchWinnerUid: state.matchWinnerUid,
      matchWinnerName: state.matchWinnerName,
      players: serializePlayersList(),
      vote: votePayload
    });
  }

  function countHumanPlayers() {
    let total = 0;
    for (const player of state.players.values()) {
      if (!player.isBot) total += 1;
    }
    return total;
  }

  function findUnreservedBotUid() {
    const reserved = new Set();
    for (const peer of hostPeers.values()) {
      if (peer.replacingBotUid) reserved.add(peer.replacingBotUid);
    }
    for (const [uid, player] of state.players) {
      if (player.isBot && !reserved.has(uid)) return uid;
    }
    return null;
  }

  function findAvailableSpawnIndex() {
    const used = new Set();
    for (const player of state.players.values()) {
      if (Number.isFinite(player.spawnIdx)) used.add(player.spawnIdx);
    }
    for (let i = 0; i < Math.max(2, arenaSpawns.length); i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  function hostRemoveBotForReplacement(uid) {
    const bot = state.players.get(uid);
    if (!bot || !bot.isBot) return null;
    const spawnIdx = bot.spawnIdx;
    state.players.delete(uid);
    if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(uid);
    return spawnIdx;
  }

  function hostFillLobbyWithBots() {
    if (state.role !== 'host' || !state.lobby || state.phase !== 'warmup') return false;
    if (countHumanPlayers() !== 1) return false;
    // Do not fill seats while a real player is already completing a WebRTC join.
    for (const peer of hostPeers.values()) {
      if (!peer.joined) return false;
    }

    const capacity = Math.max(2, Math.min(4, state.lobby.maxPlayers || 2));
    const openSlots = Math.max(0, capacity - state.players.size);
    if (openSlots <= 0) return false;

    const usedNames = Array.from(state.players.values()).map((player) => player.name);
    const weapons = ['rifle', 'smg', 'awp', 'shotgun'];
    const added = [];
    for (let i = 0; i < openSlots; i++) {
      const botType = i % 4;
      const uid = `ai_${state.lobby.lobbyId}_${i}`;
      const botName = root.BotAISystem && typeof root.BotAISystem.generatePlayerName === 'function'
        ? root.BotAISystem.generatePlayerName(usedNames)
        : 'player' + (i + 1);
      usedNames.push(botName);
      const bot = ensurePlayerRecord(uid, botName, i + 1);
      bot.isBot = true;
      bot.botType = botType;
      bot.hp = 100;
      bot.alive = true;
      bot.slot = weapons[botType];
      bot.spawnIdx = i + 1;
      const spawn = getSpawnForIndex(bot.spawnIdx);
      bot.x = spawn.x;
      bot.y = spawn.y;
      bot.z = spawn.z;
      bot.yaw = spawn.yaw || 0;
      added.push(bot);
    }

    if (!added.length) return false;
    if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(false);
    state.statusText = `AI OPPONENTS JOINED · ${added.length} BOT${added.length === 1 ? '' : 'S'}`;
    hostStartRoundOrMatch(true);
    showBanner('AI OPPONENTS JOINED', `${added.length} BOT${added.length === 1 ? '' : 'S'} ENTERED THE ARENA`, 2200);
    return true;
  }

  // ---------- Host-Authoritative Match Loop ----------
  function hostStartRoundOrMatch(resetScores) {
    if (state.role !== 'host') return;
    if (roundTimeout) {
      clearTimeout(roundTimeout);
      roundTimeout = null;
    }
    if (resetScores) {
      resetChatSystemsForMatch();
      state.round = 1;
      state.matchWinnerUid = null;
      state.matchWinnerName = '';
      resetMapVoteState();
      for (const [, p] of state.players) {
        p.score = 0;
        p.kills = 0;
        p.deaths = 0;
        p.lastAttackerUid = null;
        p.lastDamagedAtMs = 0;
      }
    }

    // Check if at least 2 live players are in the arena
    if (state.players.size < 2) {
      state.phase = 'warmup';
      state.freezeTimer = 0;
      state.localHp = 100;
      state.localAlive = true;
      state.statusText = state.lobby && state.lobby.isPrivate
        ? `WAITING FOR PLAYERS · CODE ${state.lobby.joinCode}`
        : 'WAITING FOR PLAYERS · WARMUP ACTIVE';
      if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(true);
      syncLobbyMetaNow();
      emitState();
      return;
    }

    if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(false);

    // Assign fresh spawns & full HP
    let idx = 0;
    const spawnAssignments = {};
    for (const [uid, p] of state.players) {
      p.hp = 100;
      p.alive = true;
      p.lastAttackerUid = null;
      p.lastDamagedAtMs = 0;
      p.spawnIdx = (idx + (state.round - 1)) % Math.max(2, arenaSpawns.length);
      spawnAssignments[uid] = p.spawnIdx;
      idx++;
      const sp = getSpawnForIndex(p.spawnIdx);
      p.x = sp.x;
      p.y = sp.y;
      p.z = sp.z;
      p.yaw = sp.yaw || 0;
      if (uid !== state.localUid && root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(uid, {
          name: p.name,
          isBot: Boolean(p.isBot),
          botType: p.botType,
          x: sp.x,
          y: sp.y,
          z: sp.z,
          yaw: p.yaw,
          hp: 100,
          alive: true,
          slot: p.slot,
          snap: true
        });
      }
    }
    if (root.CombatSystem) root.CombatSystem.syncArenaBots(serializePlayersList(), true);

    const myRec = state.players.get(state.localUid);
    state.localHp = 100;
    state.localAlive = true;
    state.respawnTimer = 0;
    const mySpawn = getSpawnForIndex(myRec ? myRec.spawnIdx : 0);

    if (state.mode === 'duel_1v1') {
      state.phase = 'countdown';
      state.freezeTimer = DUEL_FREEZE_SEC;
      state.statusText = `1v1 DUEL · ROUND ${state.round}`;
      if (typeof callbacks.onLocalRespawn === 'function') {
        callbacks.onLocalRespawn(mySpawn, true);
      }
      showBanner(`ROUND ${state.round}`, 'FIRST TO 5 ROUNDS · GET READY', 2100);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
    } else {
      state.phase = 'live';
      state.freezeTimer = 0;
      state.statusText = `FFA ARENA · FIRST TO ${FFA_WIN_KILLS}`;
      if (typeof callbacks.onLocalRespawn === 'function') {
        callbacks.onLocalRespawn(mySpawn, false);
      }
      showBanner('FREE-FOR-ALL LIVE', `FIRST TO ${FFA_WIN_KILLS} KILLS WINS`, 2200);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
    }

    broadcastGame({
      t: 'round_begin',
      mode: state.mode,
      round: state.round,
      phase: state.phase,
      freezeTimer: state.freezeTimer,
      spawns: spawnAssignments,
      players: serializePlayersList()
    });
    syncLobbyMetaNow();
    if (typeof callbacks.onBotEvent === 'function') callbacks.onBotEvent({ type: 'round_start', round: state.round });
    emitState();
  }

  function applyWarmupDamage(damage, botName, weapon, isHeadshot, botUid, botType) {
    const isWarmup = state.role === 'warmup' ||
      ((state.role === 'host' || state.role === 'client') && state.phase === 'warmup');
    if (!isWarmup || !state.localAlive || state.localHp <= 0) return false;
    if (root.DevMode && typeof root.DevMode.isCombatCheatActive === 'function' && root.DevMode.isCombatCheatActive('godMode')) {
      return false;
    }

    const previousHp = state.localHp;
    const cleanDmg = Math.max(1, Math.min(260, Math.round(Number(damage) || 0)));
    state.lastWarmupAttacker = {
      name: String(botName || 'AI BOT').slice(0, 24),
      weapon: weapon || 'rifle',
      atMs: Date.now()
    };
    state.localHp = Math.max(0, state.localHp - cleanDmg);
    const killed = state.localHp <= 0;
    if (!killed && previousHp > 35 && state.localHp <= 35 && typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'player_low_health',
        botUid: botUid || null,
        botName: botName || '',
        botType: botType == null ? null : botType,
        playerUid: 'local',
        playerName: state.localName || 'Runner'
      });
    }
    if (killed) {
      state.localAlive = false;
      state.respawnTimer = WARMUP_RESPAWN_SEC;
      if (root.CombatSystem && typeof root.CombatSystem.resetLifeStreak === 'function') {
        root.CombatSystem.resetLifeStreak();
      }
      const attackerName = String(botName || 'AI BOT').slice(0, 24);
      if (root.BotAISystem && typeof root.BotAISystem.recordPlayerDeath === 'function') {
        root.BotAISystem.recordPlayerDeath();
      }
      if (typeof callbacks.onBotEvent === 'function') {
        callbacks.onBotEvent({
          type: 'bot_killed_player',
          botUid: botUid || null,
          botName: attackerName,
          playerUid: 'local',
          playerName: state.localName || 'Runner',
          weapon: weapon || 'rifle'
        });
      }
      pushKillFeed(attackerName, state.localName || 'Runner', weapon || 'rifle', isHeadshot);
      showBanner('ELIMINATED', (isHeadshot ? 'HEADSHOT BY ' : 'OUTPLAYED BY ') + attackerName.toUpperCase() + ' · RESPAWNING', 1900);
    }

    const localRecord = state.players.get(state.localUid);
    if (localRecord) {
      localRecord.hp = state.localHp;
      localRecord.alive = state.localAlive;
    }
    if (root.CombatSystem) root.CombatSystem.triggerDamageFlash();
    if (typeof callbacks.onLocalDamage === 'function') {
      callbacks.onLocalDamage({
        attackerName: botName || 'HOLOGRAM',
        damage: cleanDmg,
        hp: state.localHp,
        alive: state.localAlive,
        killed,
        slot: weapon || 'rifle',
        headshot: Boolean(isHeadshot)
      });
    }
    emitState();
    return true;
  }

  function hostBeginMapVote(winnerUid, winnerName) {
    const options = (root.ArenaCatalog && typeof root.ArenaCatalog.pickVoteOptions === 'function')
      ? root.ArenaCatalog.pickVoteOptions(state.mapId)
      : [
          ...getValidArenaIds().filter((id) => id !== state.mapId).slice(0, 2),
          normalizeArenaMapId(state.mapId, false)
        ];
    state.phase = 'match_over';
    state.matchWinnerUid = winnerUid;
    state.matchWinnerName = winnerName;
    state.mapVote = {
      active: true,
      options: options.slice(),
      votes: {},
      remainingSec: MAP_VOTE_DURATION_SEC,
      resolvedMapId: null
    };
    broadcastGame({
      t: 'match_over',
      winnerUid,
      winnerName,
      mode: state.mode,
      vote: {
        options: state.mapVote.options.slice(),
        votes: {},
        remainingSec: MAP_VOTE_DURATION_SEC
      },
      players: serializePlayersList()
    });
    handleMatchOverLocally(winnerUid, winnerName, state.mapVote);
  }

  function hostRecordMapVote(voterUid, mapId) {
    if (state.role !== 'host' || state.phase !== 'match_over' || !state.mapVote.active) return;
    if (!state.mapVote.options.includes(mapId)) return;
    state.mapVote.votes[voterUid] = mapId;

    // If every connected human player has cast a vote, accelerate launch to 1.8s
    const humanUids = Array.from(state.players.values())
      .filter((p) => !p.isBot)
      .map((p) => p.uid);
    const allVoted = humanUids.length > 0 && humanUids.every((uid) => Boolean(state.mapVote.votes[uid]));
    if (allVoted && state.mapVote.remainingSec > 1.8) {
      state.mapVote.remainingSec = 1.8;
    }

    broadcastGame({
      t: 'vote_update',
      options: state.mapVote.options.slice(),
      votes: { ...state.mapVote.votes },
      remainingSec: state.mapVote.remainingSec
    });
    emitState();
  }

  function hostFinalizeMapVote(forcedMapId) {
    if (state.role !== 'host') return;
    const tally = computeVoteTally(state.mapVote.options, state.mapVote.votes, state.mapId);
    const nextMapId = forcedMapId && getValidArenaIds().includes(forcedMapId)
      ? forcedMapId
      : tally.winnerMapId;
    const mapChanged = nextMapId !== state.mapId;
    state.mapId = nextMapId;
    resetChatSystemsForMatch();
    if (state.lobby) state.lobby.mapId = nextMapId;
    resetMapVoteState();

    broadcastGame({
      t: 'map_change',
      mapId: nextMapId
    });
    if (mapChanged && typeof callbacks.onMapChange === 'function') {
      callbacks.onMapChange(nextMapId);
    } else if (typeof callbacks.onMapChange === 'function') {
      callbacks.onMapChange(nextMapId);
    }
    syncLobbyMetaNow();
    // Brief tick so clients load the new arena spawns before round_begin snaps positions
    setTimeout(() => {
      if (state.role === 'host') {
        hostStartRoundOrMatch(true);
      }
    }, 120);
  }

  function castMapVote(mapId) {
    const cleanId = normalizeArenaMapId(mapId, false);
    if (state.role === 'warmup') {
      state.mapId = cleanId;
      resetChatSystemsForMatch();
      if (typeof callbacks.onMapChange === 'function') callbacks.onMapChange(cleanId);
      emitState();
      return;
    }
    if (state.phase !== 'match_over' || !state.mapVote.active) return;
    if (!state.mapVote.options.includes(cleanId)) return;
    if (state.role === 'host') {
      hostRecordMapVote(state.localUid, cleanId);
    } else if (state.role === 'client') {
      state.mapVote.votes[state.localUid] = cleanId;
      sendToHostGame({ t: 'map_vote', mapId: cleanId });
      emitState();
    }
  }

  function canBotDamageTarget(role, phase, botUid, attacker, victim) {
    return role === 'host' && phase === 'live' &&
      Boolean(attacker && attacker.isBot && victim && victim.alive &&
        attacker.uid === botUid && botUid !== victim.uid);
  }

  function hostAdvanceAfterKill(roundWinnerUid, victimUid) {
    const roundWinner = state.players.get(roundWinnerUid);
    if (state.mode === 'duel_1v1') {
      if (!roundWinner) return;
      const scoreMap = {};
      for (const [uid, pl] of state.players) scoreMap[uid] = pl.score;
      const duelEval = root.CombatSystem
        ? root.CombatSystem.evaluateDuelRoundResult(scoreMap, roundWinnerUid, DUEL_WIN_ROUNDS)
        : { scores: { ...scoreMap, [roundWinnerUid]: (scoreMap[roundWinnerUid] || 0) + 1 }, isMatchOver: (roundWinner.score + 1) >= DUEL_WIN_ROUNDS };
      roundWinner.score = duelEval.scores[roundWinnerUid] || (roundWinner.score + 1);
      state.phase = 'round_over';
      if (typeof callbacks.onBotEvent === 'function') {
        callbacks.onBotEvent({
          type: 'round_end',
          round: state.round,
          roundId: String(state.mapId) + ':' + String(state.round),
          winnerUid: roundWinner.uid,
          winnerName: roundWinner.name,
          winnerIsBot: Boolean(roundWinner.isBot)
        });
      }

      if (duelEval.isMatchOver) {
        hostBeginMapVote(roundWinner.uid, roundWinner.name);
      } else {
        const bannerSub = `${roundWinner.name} TAKES ROUND ${state.round}`;

        broadcastGame({
          t: 'round_won',
          winnerUid: roundWinner.uid,
          winnerName: roundWinner.name,
          round: state.round,
          players: serializePlayersList()
        });
        showBanner(`${roundWinner.name} WINS ROUND`, bannerSub, 2200);
        if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
        emitState();
        roundTimeout = setTimeout(() => {
          state.round += 1;
          hostStartRoundOrMatch(false);
        }, DUEL_POST_ROUND_SEC * 1000);
      }
    } else {
      // FFA: check win threshold (15 kills) or schedule victim respawn
      const ffaEval = root.CombatSystem
        ? root.CombatSystem.evaluateFfaScoreboard(Object.fromEntries(state.players), FFA_WIN_KILLS)
        : { isMatchOver: Boolean(roundWinner && roundWinner.kills >= FFA_WIN_KILLS) };
      if (ffaEval.isMatchOver && roundWinner) {
        hostBeginMapVote(roundWinner.uid, roundWinner.name);
      } else {
        setTimeout(() => {
          if (state.role !== 'host' || state.phase !== 'live') return;
          const v = state.players.get(victimUid);
          if (!v || v.alive) return;
          v.hp = 100;
          v.alive = true;
          v.lastAttackerUid = null;
          v.lastDamagedAtMs = 0;
          v.spawnIdx = Math.floor(Math.random() * Math.max(1, arenaSpawns.length));
          const sp = getSpawnForIndex(v.spawnIdx);
          v.x = sp.x;
          v.y = sp.y;
          v.z = sp.z;
          v.yaw = sp.yaw || 0;
          broadcastGame({
            t: 'respawn_player',
            uid: victimUid,
            spawnIdx: v.spawnIdx,
            players: serializePlayersList()
          });
          if (victimUid === state.localUid) {
            state.localHp = 100;
            state.localAlive = true;
            state.respawnTimer = 0;
            if (typeof callbacks.onLocalRespawn === 'function') callbacks.onLocalRespawn(sp, false);
          } else if (root.CombatSystem) {
            root.CombatSystem.upsertRemoteAvatar(victimUid, {
              isBot: Boolean(v.isBot),
              botType: v.botType,
              x: sp.x, y: sp.y, z: sp.z, yaw: sp.yaw || 0,
              hp: 100, alive: true, slot: v.slot, snap: true
            });
          }
          if (v.isBot && root.CombatSystem) root.CombatSystem.syncArenaBots(serializePlayersList());
          emitState();
        }, FFA_RESPAWN_SEC * 1000);
      }
    }
  }

  function hostResolveDamage(attackerUid, victimUid, damage, slot, isHeadshot) {
    if (state.role !== 'host') return;
    if (state.phase !== 'live') return;
    const attacker = state.players.get(attackerUid);
    const victim = state.players.get(victimUid);
    if (!attacker || !victim || !victim.alive || attackerUid === victimUid) return;
    // If local host player is actively deflecting with Katana, reflect bullet straight back!
    if (victimUid === state.localUid && root.CombatSystem && typeof root.CombatSystem.isLocalKatanaDeflecting === 'function' && root.CombatSystem.isLocalKatanaDeflecting()) {
      root.CombatSystem.tryInterceptDeflect(null, null, null, null);
      return;
    }

    const cleanDmg = Math.max(1, Math.min(260, Math.round(Number(damage) || 0)));
    victim.lastAttackerUid = attackerUid;
    victim.lastAttackerName = attacker.name;
    victim.lastAttackerSlot = slot || 'rifle';
    victim.lastDamagedAtMs = Date.now();
    const previousHp = victim.hp;
    victim.hp = Math.max(0, victim.hp - cleanDmg);
    const killed = victim.hp <= 0;

    if (killed) {
      victim.alive = false;
      victim.deaths += 1;
      attacker.kills += 1;
      if (state.mode === 'ffa_4p') {
        attacker.score = attacker.kills;
      }
      if (root.BotAISystem) {
        if (!attacker.isBot && victim.isBot && typeof root.BotAISystem.recordPlayerKill === 'function') {
          root.BotAISystem.recordPlayerKill();
        } else if (attacker.isBot && !victim.isBot && typeof root.BotAISystem.recordPlayerDeath === 'function') {
          root.BotAISystem.recordPlayerDeath();
        }
      }
    }

    // Notify everyone of damage/kill
    const dmgPacket = {
      t: 'damage_event',
      attackerUid,
      attackerName: attacker.name,
      victimUid,
      victimName: victim.name,
      damage: cleanDmg,
      hp: victim.hp,
      alive: victim.alive,
      killed,
      slot: slot || 'rifle',
      headshot: Boolean(isHeadshot),
      attackerIsBot: Boolean(attacker.isBot),
      victimIsBot: Boolean(victim.isBot),
      players: serializePlayersList()
    };
    broadcastGame(dmgPacket);
    applyDamageEventLocally(dmgPacket, true);
    if (!killed && !victim.isBot && previousHp > 35 && victim.hp <= 35 && typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'player_low_health',
        botUid: attacker.isBot ? attacker.uid : null,
        botName: attacker.isBot ? attacker.name : '',
        botType: attacker.isBot ? attacker.botType : null,
        playerUid: victim.uid,
        playerName: victim.name
      });
    }
    if (killed && typeof callbacks.onBotEvent === 'function') {
      if (!attacker.isBot && attacker.kills >= 3 && attacker.kills % 3 === 0) {
        callbacks.onBotEvent({
          type: 'player_kill_streak',
          playerUid: attacker.uid,
          playerName: attacker.name,
          totalKills: attacker.kills
        });
      }
      if (attacker.isBot && !victim.isBot) {
        callbacks.onBotEvent({
          type: 'bot_killed_player', botUid: attacker.uid, botName: attacker.name,
          botType: attacker.botType, playerUid: victim.uid,
          playerName: victim.name, weapon: slot || 'rifle'
        });
      } else if (!attacker.isBot && victim.isBot) {
        callbacks.onBotEvent({
          type: 'player_killed_bot', botUid: victim.uid, botName: victim.name,
          botType: victim.botType, playerUid: attacker.uid, attackerUid: attacker.uid,
          playerName: attacker.name, weapon: slot || 'rifle'
        });
      } else if (attacker.isBot && victim.isBot) {
        callbacks.onBotEvent({
          type: 'bot_killed_bot', botUid: attacker.uid, botName: attacker.name,
          botType: attacker.botType, victimUid: victim.uid,
          victimName: victim.name, killerName: attacker.name
        });
      }
    }
    if (killed && victim.isBot && root.CombatSystem &&
        typeof root.CombatSystem.syncArenaBots === 'function') {
      root.CombatSystem.syncArenaBots(serializePlayersList());
    }

    if (!killed) return;
    hostAdvanceAfterKill(attackerUid, victimUid);
  }

  // Host-authoritative void hazard elimination with 5s last-attacker kill credit!
  function hostResolveVoidFall(victimUid) {
    if (state.role !== 'host' || state.phase !== 'live') return;
    const victim = state.players.get(victimUid);
    if (!victim || !victim.alive) return;

    const now = Date.now();
    const recentAttacker = (victim.lastAttackerUid && (now - (victim.lastDamagedAtMs || 0)) <= VOID_ASSIST_WINDOW_MS)
      ? state.players.get(victim.lastAttackerUid)
      : null;

    victim.hp = 0;
    victim.alive = false;
    victim.deaths += 1;

    let creditUid = null;
    let creditName = 'VOID';
    let creditSlot = 'void';
    let attackerIsBot = false;

    if (recentAttacker && recentAttacker.uid !== victimUid) {
      creditUid = recentAttacker.uid;
      creditName = recentAttacker.name;
      creditSlot = victim.lastAttackerSlot || 'void';
      attackerIsBot = Boolean(recentAttacker.isBot);
      recentAttacker.kills += 1;
      if (state.mode === 'ffa_4p') recentAttacker.score = recentAttacker.kills;
    } else if (state.mode === 'duel_1v1') {
      // In 1v1, the surviving opponent takes the round
      for (const [uid, pl] of state.players) {
        if (uid !== victimUid) {
          creditUid = uid;
          break;
        }
      }
    }

    const dmgPacket = {
      t: 'damage_event',
      attackerUid: recentAttacker ? recentAttacker.uid : 'void',
      attackerName: creditName,
      victimUid,
      victimName: victim.name,
      damage: 100,
      hp: 0,
      alive: false,
      killed: true,
      slot: creditSlot,
      headshot: false,
      attackerIsBot,
      victimIsBot: Boolean(victim.isBot),
      players: serializePlayersList()
    };
    broadcastGame(dmgPacket);
    applyDamageEventLocally(dmgPacket, true);
    if (victim.isBot && root.CombatSystem && typeof root.CombatSystem.syncArenaBots === 'function') {
      root.CombatSystem.syncArenaBots(serializePlayersList());
    }
    hostAdvanceAfterKill(creditUid, victimUid);
  }

  function reportVoidFall() {
    if (state.role === 'none') return false;
    if (!state.localAlive) return true;
    const isWarmup = state.role === 'warmup' || state.phase === 'warmup';
    if (isWarmup) {
      const now = Date.now();
      const recent = state.lastWarmupAttacker && (now - state.lastWarmupAttacker.atMs <= VOID_ASSIST_WINDOW_MS)
        ? state.lastWarmupAttacker
        : null;
      state.localHp = 0;
      state.localAlive = false;
      state.respawnTimer = WARMUP_RESPAWN_SEC;
      const localRecord = state.players.get(state.localUid);
      if (localRecord) { localRecord.hp = 0; localRecord.alive = false; }
      pushKillFeed(recent ? recent.name : 'VOID', state.localName || 'Runner', 'void', false);
      showBanner('VOID ELIMINATION', recent ? `KNOCKED OFF BY ${recent.name.toUpperCase()} · RESPAWNING` : 'FELL INTO THE ABYSS · RESPAWNING', 1700);
      if (root.CombatSystem) root.CombatSystem.triggerDamageFlash();
      emitState();
      return true;
    }
    if (state.phase !== 'live') {
      return false;
    }
    if (state.role === 'host') {
      hostResolveVoidFall(state.localUid);
      return true;
    }
    if (state.role === 'client') {
      state.localHp = 0;
      state.localAlive = false;
      sendToHostGame({ t: 'void_fall' });
      emitState();
      return true;
    }
    return false;
  }

  function applyDamageEventLocally(pkt, skipPlayersSnapshot) {
    if (!skipPlayersSnapshot && Array.isArray(pkt.players)) {
      applyPlayersSnapshot(pkt.players);
    }
    if (pkt.victimUid === state.localUid) {
      state.localHp = pkt.hp;
      state.localAlive = pkt.alive;
      if (pkt.killed && root.CombatSystem && typeof root.CombatSystem.resetLifeStreak === 'function') {
        root.CombatSystem.resetLifeStreak();
      }
      if (root.CombatSystem) root.CombatSystem.triggerDamageFlash();
      if (typeof callbacks.onLocalDamage === 'function') {
        callbacks.onLocalDamage(pkt);
      }
      if (pkt.killed && state.mode === 'ffa_4p') {
        state.respawnTimer = FFA_RESPAWN_SEC;
      }
    } else if (root.CombatSystem) {
      root.CombatSystem.upsertRemoteAvatar(pkt.victimUid, {
        hp: pkt.hp,
        alive: pkt.alive
      });
    }
    if (pkt.attackerUid === state.localUid && pkt.killed) {
      if (root.CombatSystem) {
        root.CombatSystem.triggerHitmarker(pkt.headshot, true);
        if (pkt.victimUid !== state.localUid && typeof root.CombatSystem.recordPvpKill === 'function') {
          root.CombatSystem.recordPvpKill({
            weaponId: pkt.slot,
            isHeadshot: Boolean(pkt.headshot),
            victimIsBot: Boolean(pkt.victimIsBot)
          });
        }
      }
      const isOnline = state.role === 'host' || state.role === 'client';
      if (isOnline && pkt.victimUid !== state.localUid && typeof callbacks.onLocalKill === 'function') {
        callbacks.onLocalKill({
          victimUid: pkt.victimUid,
          victimName: pkt.victimName,
          slot: pkt.slot,
          weaponId: pkt.slot,
          headshot: Boolean(pkt.headshot),
          isHeadshot: Boolean(pkt.headshot),
          victimIsBot: Boolean(pkt.victimIsBot),
          mode: state.mode
        });
      }
    }
    if (pkt.killed) {
      pushKillFeed(pkt.attackerName, pkt.victimName, pkt.slot, pkt.headshot);
    }
    emitState();
  }

  function handleMatchOverLocally(winnerUid, winnerName, votePayload) {
    state.phase = 'match_over';
    state.matchWinnerUid = winnerUid;
    state.matchWinnerName = winnerName;
    if (votePayload && Array.isArray(votePayload.options) && votePayload.options.length) {
      state.mapVote = {
        active: true,
        options: votePayload.options.slice(),
        votes: { ...(votePayload.votes || {}) },
        remainingSec: Number(votePayload.remainingSec) || MAP_VOTE_DURATION_SEC,
        resolvedMapId: null
      };
    }
    const isLocalWinner = winnerUid === state.localUid;
    showBanner(
      isLocalWinner ? 'VICTORY' : `${winnerName.toUpperCase()} WINS`,
      'VOTE FOR THE NEXT ARENA',
      4500
    );
    if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
    if (typeof callbacks.onMatchEnd === 'function') {
      callbacks.onMatchEnd({
        winnerUid,
        winnerName,
        isLocalWinner,
        mode: state.mode,
        mapId: state.mapId,
        players: serializePlayersList()
      });
    }
    emitState();
  }

  function applyPlayersSnapshot(list) {
    const incomingIds = new Set();
    for (const item of list) {
      incomingIds.add(item.uid);
      const rec = ensurePlayerRecord(item.uid, item.name, item.spawnIdx);
      rec.hp = item.hp;
      rec.alive = item.alive;
      rec.score = item.score;
      rec.kills = item.kills;
      rec.deaths = item.deaths;
      rec.spawnIdx = item.spawnIdx;
      rec.slot = item.slot || 'rifle';
      rec.isBot = Boolean(item.isBot);
      rec.botType = Number.isFinite(item.botType) ? item.botType : null;
      if (Number.isFinite(item.x)) rec.x = item.x;
      if (Number.isFinite(item.y)) rec.y = item.y;
      if (Number.isFinite(item.z)) rec.z = item.z;
      if (Number.isFinite(item.yaw)) rec.yaw = item.yaw;
      rec.ct = Number(item.ct) || 0;
      if (item.uid === state.localUid) {
        state.localHp = item.hp;
        state.localAlive = item.alive;
      } else if (root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(item.uid, {
          name: item.name,
          isBot: Boolean(item.isBot),
          botType: item.botType,
          x: item.x,
          y: item.y,
          z: item.z,
          yaw: item.yaw,
          hp: item.hp,
          alive: item.alive,
          slot: item.slot,
          ct: rec.ct
        });
      }
    }
    for (const uid of Array.from(state.players.keys())) {
      if (!incomingIds.has(uid)) {
        state.players.delete(uid);
        if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(uid);
      }
    }
    if (root.CombatSystem) root.CombatSystem.syncArenaBots(list);
  }

  // ---------- Host Handling of Incoming Peer Messages ----------
  function onHostGameMessage(peerUid, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || !msg.t) return;

    if (msg.t === 'chat') {
      hostRelayChat(peerUid, msg.text);
      return;
    }

    if (msg.t === 'hello') {
      const peerEntry = hostPeers.get(peerUid);
      if (peerEntry && peerEntry.joined) {
        broadcastFullSnapshot();
        return;
      }
      let replacementSpawnIdx = null;
      if (peerEntry && peerEntry.replacingBotUid) {
        replacementSpawnIdx = hostRemoveBotForReplacement(peerEntry.replacingBotUid);
        peerEntry.replacingBotUid = null;
      }
      if (botFillTimer) {
        clearTimeout(botFillTimer);
        botFillTimer = null;
      }
      const rec = ensurePlayerRecord(peerUid, msg.name || 'Runner');
      if (replacementSpawnIdx != null) rec.spawnIdx = replacementSpawnIdx;
      else rec.spawnIdx = findAvailableSpawnIndex();
      rec.hp = 100;
      rec.alive = true;
      const spawn = getSpawnForIndex(rec.spawnIdx);
      rec.x = spawn.x;
      rec.y = spawn.y;
      rec.z = spawn.z;
      rec.yaw = spawn.yaw || 0;

      if (state.phase === 'warmup' && state.players.size >= 2) {
        hostStartRoundOrMatch(true);
      } else {
        if (root.CombatSystem) {
          root.CombatSystem.upsertRemoteAvatar(peerUid, {
            name: rec.name,
            x: spawn.x,
            y: spawn.y,
            z: spawn.z,
            yaw: rec.yaw,
            hp: 100,
            alive: true,
            snap: true
          });
        }
        if (state.phase === 'live' || state.phase === 'countdown') {
          broadcastGame({
            t: 'player_joined',
            uid: peerUid,
            name: rec.name,
            spawnIdx: rec.spawnIdx,
            phase: state.phase,
            round: state.round,
            freezeTimer: state.freezeTimer,
            players: serializePlayersList()
          });
        } else {
          broadcastFullSnapshot();
        }
        syncLobbyMetaNow();
        emitState();
      }
      return;
    }

    if (msg.t === 'shot') {
      // Relay visual tracer to other peers + local host view
      const tracerMsg = {
        t: 'remote_tracer',
        fromUid: peerUid,
        sx: msg.sx, sy: msg.sy, sz: msg.sz,
        ex: msg.ex, ey: msg.ey, ez: msg.ez,
        slot: msg.slot
      };
      broadcastGame(tracerMsg, peerUid);
      if (typeof callbacks.onRemoteTracer === 'function') callbacks.onRemoteTracer(tracerMsg);
      if (msg.hitKind === 'player' && msg.hitId && msg.damage > 0) {
        hostResolveDamage(peerUid, msg.hitId, msg.damage, msg.slot, msg.isHeadshot);
      }
      return;
    }

    if (msg.t === 'void_fall') {
      hostResolveVoidFall(peerUid);
      return;
    }

    if (msg.t === 'map_vote' && typeof msg.mapId === 'string') {
      hostRecordMapVote(peerUid, msg.mapId);
      return;
    }

    if (msg.t === 'nuke_launch') {
      const sender = state.players.get(peerUid);
      const ownerName = (sender && sender.name) || msg.ownerName || 'RUNNER';
      const ownerTeam = (sender && sender.team) || msg.ownerTeam || '';
      broadcastGame({ t: 'nuke_launch', ownerName, ownerUid: peerUid, ownerTeam }, peerUid);
      if (root.CombatSystem && typeof root.CombatSystem.triggerRemoteNuke === 'function') {
        root.CombatSystem.triggerRemoteNuke(ownerName, { ownerUid: peerUid, ownerTeam });
      }
      return;
    }

    if (msg.t === 'nuke_detonate' && state.phase === 'live') {
      hostResolveNukeDetonate(peerUid, msg.ownerName);
      return;
    }

    if (msg.t === 'rematch_request' && state.phase === 'match_over') {
      if (state.mapVote.active) {
        hostFinalizeMapVote();
      } else {
        hostStartRoundOrMatch(true);
      }
    }
  }

  function onHostPoseMessage(peerUid, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || typeof msg.x !== 'number') return;
    const rec = state.players.get(peerUid);
    // Pose channels can open just before the reliable game channel; wait for
    // the authoritative player record instead of creating an untyped avatar.
    if (!rec) return;
    const ct = Number(msg.ct) || 0;
    if (rec) {
      if (msg.slot) rec.slot = msg.slot;
      rec.x = msg.x;
      rec.y = msg.y;
      rec.z = msg.z;
      rec.yaw = msg.yaw || 0;
      rec.ct = ct;
    }
    if (root.CombatSystem) {
      root.CombatSystem.upsertRemoteAvatar(peerUid, {
        name: rec ? rec.name : 'Player',
        isBot: Boolean(rec && rec.isBot),
        botType: rec ? rec.botType : null,
        x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle', ct
      });
    }
    // Fan out pose to all other peers in star topology
    broadcastPose({
      t: 'p',
      uid: peerUid,
      x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle', ct
    }, peerUid);
  }

  // ---------- Client Handling of Host Messages ----------
  function onClientGameMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || !msg.t) return;

    if (msg.t === 'snapshot') {
      if (msg.mapId && getValidArenaIds().includes(msg.mapId) && msg.mapId !== state.mapId) {
        state.mapId = msg.mapId;
        if (state.lobby) state.lobby.mapId = msg.mapId;
        if (typeof callbacks.onMapChange === 'function') callbacks.onMapChange(msg.mapId);
      }
      state.mode = msg.mode || state.mode;
      state.phase = msg.phase || 'warmup';
      state.round = msg.round || 1;
      state.freezeTimer = msg.freezeTimer || 0;
      state.matchWinnerUid = msg.matchWinnerUid || null;
      state.matchWinnerName = msg.matchWinnerName || '';
      if (msg.vote && Array.isArray(msg.vote.options)) {
        state.mapVote = {
          active: true,
          options: msg.vote.options.slice(),
          votes: { ...(msg.vote.votes || {}) },
          remainingSec: Number(msg.vote.remainingSec) || MAP_VOTE_DURATION_SEC,
          resolvedMapId: null
        };
      } else {
        resetMapVoteState();
      }
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(state.phase === 'warmup');
      emitState();
      return;
    }

    if (msg.t === 'round_begin') {
      state.mode = msg.mode || state.mode;
      state.round = msg.round || 1;
      state.phase = msg.phase || 'live';
      state.freezeTimer = msg.freezeTimer || 0;
      state.localHp = 100;
      state.localAlive = true;
      state.respawnTimer = 0;
      resetMapVoteState();
      if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(false);
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      const myIdx = (msg.spawns && typeof msg.spawns[state.localUid] === 'number') ? msg.spawns[state.localUid] : 1;
      const sp = getSpawnForIndex(myIdx);
      if (typeof callbacks.onLocalRespawn === 'function') {
        callbacks.onLocalRespawn(sp, state.phase === 'countdown');
      }
      if (state.mode === 'duel_1v1') {
        showBanner(`ROUND ${state.round}`, 'FIRST TO 5 ROUNDS · GET READY', 2100);
      } else {
        showBanner('FREE-FOR-ALL LIVE', `FIRST TO ${FFA_WIN_KILLS} KILLS WINS`, 2200);
      }
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
      emitState();
      return;
    }

    if (msg.t === 'player_joined') {
      state.phase = msg.phase || state.phase;
      state.round = msg.round || state.round;
      state.freezeTimer = Number(msg.freezeTimer) || 0;
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      if (msg.uid === state.localUid) {
        state.localHp = 100;
        state.localAlive = true;
        state.respawnTimer = 0;
        const spawn = getSpawnForIndex(msg.spawnIdx || 0);
        if (typeof callbacks.onLocalRespawn === 'function') callbacks.onLocalRespawn(spawn, true);
        showBanner('JOINED THE MATCH', 'A HUMAN PLAYER REPLACED AN AI OPPONENT', 1800);
      }
      emitState();
      return;
    }

    if (msg.t === 'chat_message') {
      if (typeof callbacks.onChatMessage === 'function') callbacks.onChatMessage(msg);
      return;
    }

    if (msg.t === 'damage_event') {
      applyDamageEventLocally(msg);
      return;
    }

    if (msg.t === 'round_won') {
      state.phase = 'round_over';
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      showBanner(`${msg.winnerName} WINS ROUND`, `ROUND ${msg.round} COMPLETE`, 2200);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
      emitState();
      return;
    }

    if (msg.t === 'respawn_player') {
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      const sp = getSpawnForIndex(msg.spawnIdx || 0);
      if (msg.uid === state.localUid) {
        state.localHp = 100;
        state.localAlive = true;
        state.respawnTimer = 0;
        if (typeof callbacks.onLocalRespawn === 'function') callbacks.onLocalRespawn(sp, false);
      } else if (root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(msg.uid, {
          x: sp.x, y: sp.y, z: sp.z, yaw: sp.yaw || 0, hp: 100, alive: true, snap: true
        });
      }
      emitState();
      return;
    }

    if (msg.t === 'match_over') {
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      handleMatchOverLocally(msg.winnerUid, msg.winnerName, msg.vote || null);
      return;
    }

    if (msg.t === 'vote_update') {
      if (Array.isArray(msg.options)) state.mapVote.options = msg.options.slice();
      state.mapVote.active = true;
      state.mapVote.votes = { ...(msg.votes || {}) };
      if (typeof msg.remainingSec === 'number') state.mapVote.remainingSec = Math.max(0, msg.remainingSec);
      emitState();
      return;
    }

    if (msg.t === 'map_change' && typeof msg.mapId === 'string') {
      const nextId = normalizeArenaMapId(msg.mapId, false);
      state.mapId = nextId;
      if (state.lobby) state.lobby.mapId = nextId;
      resetChatSystemsForMatch();
      resetMapVoteState();
      if (typeof callbacks.onMapChange === 'function') callbacks.onMapChange(nextId);
      emitState();
      return;
    }

    if (msg.t === 'nuke_launch') {
      if (root.CombatSystem && typeof root.CombatSystem.triggerRemoteNuke === 'function') {
        root.CombatSystem.triggerRemoteNuke(msg.ownerName || 'ENEMY', { ownerUid: msg.ownerUid, ownerTeam: msg.ownerTeam });
      }
      return;
    }

    if (msg.t === 'remote_tracer') {
      if (typeof callbacks.onRemoteTracer === 'function') callbacks.onRemoteTracer(msg);
    }
  }

  function onClientPoseMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || !msg.uid || msg.uid === state.localUid || typeof msg.x !== 'number') return;
    const rec = state.players.get(msg.uid);
    if (!rec) return;
    const ct = Number(msg.ct) || 0;
    rec.ct = ct;
    if (root.CombatSystem) {
      const payload = {
        name: rec ? rec.name : 'Player',
        isBot: Boolean(rec && rec.isBot),
        botType: rec ? rec.botType : null,
        x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle', ct
      };
      if (typeof msg.gx === 'number' && typeof msg.gy === 'number' && typeof msg.gz === 'number') {
        payload.gx = msg.gx; payload.gy = msg.gy; payload.gz = msg.gz;
      } else {
        payload.clearGrapple = true;
      }
      root.CombatSystem.upsertRemoteAvatar(msg.uid, payload);
    }
  }

  // ---------- Host Peer Negotiation ----------
  async function hostHandlePeerDoc(peerDoc) {
    if (state.role !== 'host' || !state.lobby || !peerDoc || !peerDoc.peerUid) return;
    const peerUid = peerDoc.peerUid;
    if (peerUid === state.localUid) return;

    let entry = hostPeers.get(peerUid);
    if (!entry) {
      let replacingBotUid = null;
      const capacity = state.lobby.maxPlayers || 2;
      if (!state.players.has(peerUid) && state.players.size >= capacity) {
        replacingBotUid = findUnreservedBotUid();
        if (!replacingBotUid) return;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      entry = {
        pc,
        poseCh: null,
        gameCh: null,
        displayName: peerDoc.displayName || 'Player',
        replacingBotUid,
        joined: false,
        offerApplied: false,
        candSet: new Set(),
        answerCandidates: [],
        answerStarted: false,
        answerWriteChain: Promise.resolve(),
        remoteDescriptionSet: false,
        disconnectTimer: null
      };
      hostPeers.set(peerUid, entry);

      pc.ondatachannel = (ev) => {
        const ch = ev.channel;
        if (ch.label === 'pose') {
          entry.poseCh = ch;
          ch.onmessage = (m) => onHostPoseMessage(peerUid, m.data);
        } else if (ch.label === 'game') {
          entry.gameCh = ch;
          ch.onopen = () => {
            // Re-check seats at the moment the data channel opens. A pending
            // join can overlap the 60-second bot timer or another join.
            if (!entry.replacingBotUid && state.players.size >= (state.lobby.maxPlayers || 2)) {
              entry.replacingBotUid = findUnreservedBotUid();
            }
            if (state.players.size >= (state.lobby.maxPlayers || 2) && !entry.replacingBotUid) {
              hostRemovePeer(peerUid);
              return;
            }

            let replacementSpawnIdx = null;
            if (entry.replacingBotUid) {
              replacementSpawnIdx = hostRemoveBotForReplacement(entry.replacingBotUid);
              entry.replacingBotUid = null;
            }
            if (botFillTimer) {
              clearTimeout(botFillTimer);
              botFillTimer = null;
            }
            const rec = ensurePlayerRecord(peerUid, entry.displayName);
            if (replacementSpawnIdx != null) rec.spawnIdx = replacementSpawnIdx;
            else rec.spawnIdx = findAvailableSpawnIndex();
            rec.hp = 100;
            rec.alive = true;
            const spawn = getSpawnForIndex(rec.spawnIdx);
            rec.x = spawn.x;
            rec.y = spawn.y;
            rec.z = spawn.z;
            rec.yaw = spawn.yaw || 0;
            entry.joined = true;

            if (state.phase === 'warmup' && state.players.size >= 2) {
              hostStartRoundOrMatch(true);
            } else {
              if (root.CombatSystem) {
                root.CombatSystem.upsertRemoteAvatar(peerUid, {
                  name: rec.name,
                  x: spawn.x, y: spawn.y, z: spawn.z, yaw: rec.yaw,
                  hp: 100, alive: true, snap: true
                });
              }
              if (state.phase === 'live' || state.phase === 'countdown') {
                broadcastGame({
                  t: 'player_joined',
                  uid: peerUid,
                  name: rec.name,
                  spawnIdx: rec.spawnIdx,
                  phase: state.phase,
                  round: state.round,
                  freezeTimer: state.freezeTimer,
                  players: serializePlayersList()
                });
              } else {
                broadcastFullSnapshot();
              }
              syncLobbyMetaNow();
              emitState();
            }
          };
          ch.onmessage = (m) => onHostGameMessage(peerUid, m.data);
          ch.onclose = () => hostRemovePeer(peerUid);
        }
      };

      pc.onconnectionstatechange = () => {
        // "disconnected" is often a temporary ICE state while browsers gather
        // candidates or switch network routes. Don't destroy a viable join yet.
        if (pc.connectionState === 'connected' || pc.connectionState === 'completed') {
          if (entry.disconnectTimer) {
            clearTimeout(entry.disconnectTimer);
            entry.disconnectTimer = null;
          }
          return;
        }
        if (pc.connectionState === 'disconnected') {
          if (!entry.disconnectTimer) {
            entry.disconnectTimer = setTimeout(() => {
              entry.disconnectTimer = null;
              if (pc.connectionState === 'disconnected') hostRemovePeer(peerUid);
            }, 12000);
          }
          return;
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          hostRemovePeer(peerUid);
        }
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || entry.answerCandidates.length >= 30) return;
        entry.answerCandidates.push(JSON.stringify(ev.candidate.toJSON()));
        // Keep trickling host ICE candidates after the initial answer is written.
        // Serialize writes so an older candidate list cannot overwrite a newer one.
        if (entry.answerStarted) {
          entry.answerWriteChain = entry.answerWriteChain.then(() =>
            root.DailyBackend.writePeerAnswer(
              state.lobby.lobbyId,
              peerUid,
              entry.pc.localDescription ? entry.pc.localDescription.sdp : '',
              entry.answerCandidates.slice()
            )
          ).catch((err) => console.warn('Host ICE candidate update failed:', err));
        }
      };
    }

    // Apply offer SDP once
    if (!entry.offerApplied && peerDoc.offerSdp) {
      entry.offerApplied = true;
      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: peerDoc.offerSdp }));
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);

        // Wait briefly for initial STUN ICE candidates so answer writes cleanly in 1 shot
        await new Promise((resolve) => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          const timer = setTimeout(finish, 1100);
          entry.pc.onicegatheringstatechange = () => {
            if (entry.pc.iceGatheringState === 'complete') {
              clearTimeout(timer);
              finish();
            }
          };
        });

        // Queue the initial answer before any later trickle-candidate updates.
        entry.answerStarted = true;
        entry.answerWriteChain = entry.answerWriteChain.then(() =>
          root.DailyBackend.writePeerAnswer(
            state.lobby.lobbyId,
            peerUid,
            entry.pc.localDescription ? entry.pc.localDescription.sdp : answer.sdp,
            entry.answerCandidates.slice()
          )
        );
        await entry.answerWriteChain;
        entry.remoteDescriptionSet = true;
      } catch (err) {
        console.warn('Host WebRTC answer error:', err);
        hostRemovePeer(peerUid);
        return;
      }
    }

    // Apply any newly received offer ICE candidates
    if (entry.offerApplied && entry.remoteDescriptionSet && Array.isArray(peerDoc.offerCandidates)) {
      for (const rawC of peerDoc.offerCandidates) {
        if (entry.candSet.has(rawC)) continue;
        entry.candSet.add(rawC);
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(rawC)));
        } catch (err) {
          // Permit a later snapshot to retry candidates that arrived out of order.
          entry.candSet.delete(rawC);
          console.warn('Host ICE candidate error:', err);
        }
      }
    }
  }

  function hostRemovePeer(peerUid) {
    const entry = hostPeers.get(peerUid);
    // Multiple close/state-change events can fire for the same peer.
    if (!entry) return;
    if (entry.disconnectTimer) {
      clearTimeout(entry.disconnectTimer);
      entry.disconnectTimer = null;
    }
    try { entry.poseCh && entry.poseCh.close(); } catch (_) {}
    try { entry.gameCh && entry.gameCh.close(); } catch (_) {}
    try { entry.pc && entry.pc.close(); } catch (_) {}
    hostPeers.delete(peerUid);
    state.players.delete(peerUid);
    if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(peerUid);
    if (state.lobby && root.DailyBackend) {
      root.DailyBackend.deletePeerDoc(state.lobby.lobbyId, peerUid).catch(() => {});
    }
    if (state.players.size < 2 && state.role === 'host') {
      hostStartRoundOrMatch(false);
      if (botFillTimer) clearTimeout(botFillTimer);
      botFillTimer = setTimeout(() => {
        botFillTimer = null;
        hostFillLobbyWithBots();
      }, LOBBY_BOT_FILL_DELAY_MS);
    } else {
      broadcastFullSnapshot();
      syncLobbyMetaNow();
      emitState();
    }
  }

  // ---------- Public Session Starters ----------
  function startSoloWarmup(mapId, mode) {
    leaveSession(true);
    const id = getLocalIdentity();
    state.role = 'warmup';
    state.mapId = normalizeArenaMapId(mapId, true);
    state.mode = mode === 'ffa_4p' ? 'ffa_4p' : 'duel_1v1';
    state.lobby = null;
    state.localUid = id.uid;
    state.localName = id.name;
    state.phase = 'warmup';
    state.statusText = state.mapId === 'sandbox' ? 'SANDBOX SPARRING · ADAPTIVE AI' : 'SOLO WARMUP · ADAPTIVE AI';
    resetMatchStructures();
    ensurePlayerRecord(id.uid, id.name, 0);
    emitState();
    return getPublicState();
  }

  async function hostLobby(opts) {
    if (!root.DailyBackend) throw new Error('Cloud backend unavailable.');
    leaveSession(true);
    const id = getLocalIdentity();
    const lobby = await root.DailyBackend.createLobby(opts);
    state.role = 'host';
    state.mapId = lobby.mapId;
    state.mode = lobby.mode;
    state.lobby = lobby;
    state.localUid = id.uid;
    state.localName = id.name;
    state.phase = 'warmup';
    state.statusText = lobby.isPrivate
      ? `HOSTING PRIVATE · CODE ${lobby.joinCode}`
      : `HOSTING PUBLIC · ${lobby.roomName.toUpperCase()}`;
    resetMatchStructures();
    ensurePlayerRecord(id.uid, id.name, 0);

    unsubPeers = root.DailyBackend.subscribeLobbyPeers(lobby.lobbyId, (peers) => {
      for (const pDoc of peers) {
        hostHandlePeerDoc(pDoc);
      }
    });

    heartbeatTimer = setInterval(() => {
      syncLobbyMetaNow();
    }, HEARTBEAT_INTERVAL_MS);

    botFillTimer = setTimeout(() => {
      botFillTimer = null;
      hostFillLobbyWithBots();
    }, LOBBY_BOT_FILL_DELAY_MS);

    emitState();
    return lobby;
  }

  async function joinLobby(lobby) {
    if (!root.DailyBackend) throw new Error('Cloud backend unavailable.');
    if (!lobby || !lobby.lobbyId || !lobby.hostUid) throw new Error('Invalid server room.');
    const id = getLocalIdentity();
    if (lobby.hostUid === id.uid) {
      throw new Error('You are already the host of this server.');
    }

    // Never let a failed P2P connection quietly turn into a solo bot match.
    leaveSession(true);
    state.role = 'client';
    state.mapId = normalizeArenaMapId(lobby.mapId, false);
    state.mode = lobby.mode === 'ffa_4p' ? 'ffa_4p' : 'duel_1v1';
    state.lobby = lobby;
    state.localUid = id.uid;
    state.localName = id.name;
    state.phase = 'warmup';
    state.statusText = `CONNECTING TO ${lobby.roomName.toUpperCase()}...`;
    resetMatchStructures();
    ensurePlayerRecord(id.uid, id.name, 1);
    emitState();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    clientPc = pc;
    const offerCandidates = [];
    let connectionSettled = false;
    let resolveConnection;
    let rejectConnection;
    const connectionPromise = new Promise((resolve, reject) => {
      resolveConnection = resolve;
      rejectConnection = reject;
    });
    const settleConnection = (err) => {
      if (connectionSettled) return;
      connectionSettled = true;
      if (clientJoinTimeout) {
        clearTimeout(clientJoinTimeout);
        clientJoinTimeout = null;
      }
      if (err) rejectConnection(err);
      else resolveConnection();
    };
    clientJoinTimeout = setTimeout(() => {
      settleConnection(new Error('Could not connect to that lobby. The host may be offline or the connection was blocked.'));
    }, 20000);

    clientPoseCh = pc.createDataChannel('pose', { ordered: false, maxRetransmits: 0 });
    clientGameCh = pc.createDataChannel('game', { ordered: true });
    const gameChannel = clientGameCh;

    clientPoseCh.onmessage = (m) => onClientPoseMessage(m.data);
    clientGameCh.onopen = () => {
      if (state.role !== 'client' || clientGameCh !== gameChannel) return;
      clientConnected = true;
      state.statusText = `CONNECTED · ${lobby.roomName.toUpperCase()}`;
      sendToHostGame({ t: 'hello', uid: state.localUid, name: state.localName });
      emitState();
      settleConnection();
    };
    clientGameCh.onmessage = (m) => onClientGameMessage(m.data);
    clientGameCh.onclose = () => {
      if (state.role !== 'client' || clientGameCh !== gameChannel) return;
      if (!clientConnected) {
        settleConnection(new Error('The host closed the connection before you joined.'));
        return;
      }
      showBanner('HOST DISCONNECTED', 'RETURN TO SERVERS TO REJOIN', 3000);
      leaveSession(true);
    };

    pc.onconnectionstatechange = () => {
      if (state.role !== 'client' || clientPc !== pc) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        settleConnection(new Error('Connection to the host failed. Please try another lobby.'));
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || offerCandidates.length >= 30) return;
      offerCandidates.push(JSON.stringify(ev.candidate.toJSON()));
      // Candidates gathered after the initial offer are trickled to Firestore.
      if (clientOfferWritten && !clientAnswerApplied) {
        root.DailyBackend.updatePeerOfferCandidates(lobby.lobbyId, offerCandidates.slice()).catch((err) => {
          console.warn('Client ICE candidate update failed:', err);
        });
      }
    };

    try {
      // Listen before writing the offer so the answer cannot race the subscription.
      unsubMyPeer = root.DailyBackend.subscribePeerDoc(lobby.lobbyId, state.localUid, async (peerDoc) => {
        if (!peerDoc || state.role !== 'client' || !clientPc) return;
        if (!clientAnswerApplied && peerDoc.answerSdp) {
          try {
            await clientPc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: peerDoc.answerSdp }));
            clientAnswerApplied = true;
          } catch (err) {
            console.warn('Client setRemoteDescription error:', err);
            settleConnection(new Error('The host sent an invalid connection response.'));
            return;
          }
        }
        if (clientAnswerApplied && Array.isArray(peerDoc.answerCandidates)) {
          for (const rawC of peerDoc.answerCandidates) {
            if (clientCandSet.has(rawC)) continue;
            clientCandSet.add(rawC);
            try {
              await clientPc.addIceCandidate(new RTCIceCandidate(JSON.parse(rawC)));
            } catch (err) {
              clientCandSet.delete(rawC);
              console.warn('Client ICE candidate error:', err);
            }
          }
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await root.DailyBackend.writePeerOffer(
        lobby.lobbyId,
        lobby.hostUid,
        pc.localDescription ? pc.localDescription.sdp : offer.sdp,
        offerCandidates.slice()
      );
      clientOfferWritten = true;
      // Cover candidates gathered while the initial Firestore write was in flight.
      await root.DailyBackend.updatePeerOfferCandidates(lobby.lobbyId, offerCandidates.slice());

      await connectionPromise;
      return lobby;
    } catch (err) {
      if (state.role === 'client' && state.lobby && state.lobby.lobbyId === lobby.lobbyId) {
        leaveSession(true);
      }
      throw err;
    }
  }

  async function joinByCode(code) {
    if (!root.DailyBackend) throw new Error('Cloud backend unavailable.');
    const found = await root.DailyBackend.findLobbyByCode(code);
    if (!found) throw new Error('No active private room found for that 4-letter code.');
    return joinLobby(found);
  }

  function leaveSession(silent) {
    const prevRole = state.role;
    const prevLobby = state.lobby;
    chatLastSentAt.clear();
    const prevUid = state.localUid;

    clearTimersAndSubs();
    closeAllPeerConnections();
    if (root.CombatSystem) {
      root.CombatSystem.clearRemoteAvatars();
    }

    if (prevLobby && root.DailyBackend) {
      if (prevRole === 'host') {
        root.DailyBackend.closeLobby(prevLobby.lobbyId).catch(() => {});
      } else if (prevRole === 'client' && prevUid) {
        root.DailyBackend.deletePeerDoc(prevLobby.lobbyId, prevUid).catch(() => {});
      }
    }

    state.role = 'none';
    state.lobby = null;
    state.phase = 'warmup';
    state.statusText = 'IDLE';
    resetMatchStructures();

    if (!silent) {
      if (typeof callbacks.onLeave === 'function') callbacks.onLeave();
      emitState();
    }
  }

  function requestRematch() {
    if (state.role === 'host') {
      if (state.mapVote.active) {
        hostFinalizeMapVote();
      } else {
        hostStartRoundOrMatch(true);
      }
    } else if (state.role === 'client') {
      sendToHostGame({ t: 'rematch_request' });
    }
  }

  // ---------- Gameplay Hooks Called From Player/Main ----------
  function applyBotDamage(botUid, victimUid, damage, weapon, isHeadshot) {
    if (state.role !== 'host' || state.phase !== 'live') return false;
    const attacker = state.players.get(botUid);
    const victim = state.players.get(victimUid);
    if (!canBotDamageTarget(state.role, state.phase, botUid, attacker, victim)) return false;
    hostResolveDamage(botUid, victimUid, damage, weapon, isHeadshot);
    return true;
  }

  function reportBotPose(uid, pose) {
    if (state.role !== 'host' || !pose) return;
    const rec = state.players.get(uid);
    if (!rec || !rec.isBot) return;
    rec.x = Number(pose.x) || 0;
    rec.y = Number(pose.y) || 0;
    rec.z = Number(pose.z) || 0;
    rec.yaw = Number(pose.yaw) || 0;
    rec.slot = pose.slot || rec.slot || 'rifle';
    rec.ct = Number(pose.ct) || 0;
    const pkt = {
      t: 'p',
      uid,
      x: Number(rec.x.toFixed(2)),
      y: Number(rec.y.toFixed(2)),
      z: Number(rec.z.toFixed(2)),
      yaw: Number(rec.yaw.toFixed(3)),
      slot: rec.slot,
      ct: rec.ct
    };
    if (typeof pose.gx === 'number' && typeof pose.gy === 'number' && typeof pose.gz === 'number') {
      pkt.gx = Number(pose.gx.toFixed(2));
      pkt.gy = Number(pose.gy.toFixed(2));
      pkt.gz = Number(pose.gz.toFixed(2));
    }
    broadcastPose(pkt);
  }

  function reportBotShot(uid, origin, endPoint, weapon) {
    if (state.role !== 'host' || !origin || !endPoint) return;
    broadcastGame({
      t: 'remote_tracer',
      fromUid: uid,
      sx: Number(origin.x.toFixed(2)),
      sy: Number(origin.y.toFixed(2)),
      sz: Number(origin.z.toFixed(2)),
      ex: Number(endPoint.x.toFixed(2)),
      ey: Number(endPoint.y.toFixed(2)),
      ez: Number(endPoint.z.toFixed(2)),
      slot: weapon || 'rifle'
    });
  }

  function reportShot(shotResult) {
    if (!shotResult || !shotResult.fired) return;
    if (state.role !== 'host' && state.role !== 'client') return;

    const pkt = {
      t: 'shot',
      sx: Number(shotResult.origin.x.toFixed(2)),
      sy: Number(shotResult.origin.y.toFixed(2)),
      sz: Number(shotResult.origin.z.toFixed(2)),
      ex: Number(shotResult.endPoint.x.toFixed(2)),
      ey: Number(shotResult.endPoint.y.toFixed(2)),
      ez: Number(shotResult.endPoint.z.toFixed(2)),
      slot: shotResult.weaponId || shotResult.slot,
      hitKind: shotResult.hitKind,
      hitId: shotResult.hitId,
      damage: shotResult.damage,
      isHeadshot: shotResult.isHeadshot
    };

    if (state.role === 'host') {
      broadcastGame({
        t: 'remote_tracer',
        fromUid: state.localUid,
        sx: pkt.sx, sy: pkt.sy, sz: pkt.sz,
        ex: pkt.ex, ey: pkt.ey, ez: pkt.ez,
        slot: pkt.slot
      });
      if (pkt.hitKind === 'player' && pkt.hitId && pkt.damage > 0) {
        hostResolveDamage(state.localUid, pkt.hitId, pkt.damage, pkt.slot, pkt.isHeadshot);
      }
    } else {
      sendToHostGame(pkt);
    }
  }

  function sendLocalPose(pose) {
    if (state.role !== 'host' && state.role !== 'client') return;
    const msg = {
      t: 'p',
      uid: state.localUid,
      x: Number(pose.x.toFixed(2)),
      y: Number(pose.y.toFixed(2)),
      z: Number(pose.z.toFixed(2)),
      yaw: Number(pose.yaw.toFixed(3)),
      slot: pose.slot || 'rifle',
      ct: Number(pose.ct) || 0
    };
    if (state.role === 'host') {
      broadcastPose(msg);
    } else {
      sendToHostPose(msg);
    }
  }

  function update(dt, playerPose) {
    if (state.role === 'none') return;

    if (state.freezeTimer > 0) {
      state.freezeTimer = Math.max(0, state.freezeTimer - dt);
      if (state.freezeTimer === 0 && state.phase === 'countdown') {
        state.phase = 'live';
        showBanner('FIGHT!', '', 900);
        emitState();
      }
    }

    if (state.respawnTimer > 0) {
      state.respawnTimer = Math.max(0, state.respawnTimer - dt);
      if (state.respawnTimer === 0 && !state.localAlive && state.phase === 'warmup' &&
          (state.role === 'warmup' || state.role === 'host' || state.role === 'client')) {
        state.localHp = 100;
        state.localAlive = true;
        const spawn = getSpawnForIndex(Math.floor(Math.random() * Math.max(1, arenaSpawns.length)));
        const localRecord = state.players.get(state.localUid);
        if (localRecord) {
          localRecord.hp = 100;
          localRecord.alive = true;
        }
        if (root.CombatSystem) root.CombatSystem.resetAmmo();
        if (typeof callbacks.onLocalRespawn === 'function') callbacks.onLocalRespawn(spawn, true);
        showBanner('BACK IN THE FIGHT', 'WARMUP RESPAWNED', 1000);
        emitState();
      }
    }

    if (state.phase === 'match_over' && state.mapVote.active && state.mapVote.remainingSec > 0) {
      state.mapVote.remainingSec = Math.max(0, state.mapVote.remainingSec - dt);
      if (state.mapVote.remainingSec === 0 && state.role === 'host') {
        hostFinalizeMapVote();
      }
    }

    if (state.role === 'host' && playerPose) {
      const local = state.players.get(state.localUid);
      if (local) {
        local.x = playerPose.x;
        local.y = playerPose.y;
        local.z = playerPose.z;
        local.yaw = playerPose.yaw || 0;
        local.ct = Number(playerPose.ct) || 0;
      }
    }

    if (state.role === 'host' || state.role === 'client') {
      poseAccum += dt;
      if (poseAccum >= POSE_SEND_INTERVAL && playerPose) {
        poseAccum = 0;
        sendLocalPose(playerPose);
      }
    }
  }

  function getPublicState() {
    const playersArr = serializePlayersList().sort((a, b) => (b.score - a.score) || (b.kills - a.kills));
    const tally = state.mapVote.active
      ? computeVoteTally(state.mapVote.options, state.mapVote.votes, state.mapId)
      : { counts: {}, totalVotes: 0, winnerMapId: state.mapId };
    return {
      role: state.role,
      isArena: state.role !== 'none',
      isOnline: state.role === 'host' || state.role === 'client',
      chatEnabled: isChatEnabled(),
      mapId: state.mapId,
      mode: state.mode,
      lobby: state.lobby,
      localUid: state.localUid,
      localName: state.localName,
      statusText: state.statusText,
      phase: state.phase,
      round: state.round,
      freezeTimer: state.freezeTimer,
      respawnTimer: state.respawnTimer,
      localHp: state.localHp,
      localAlive: state.localAlive,
      matchWinnerUid: state.matchWinnerUid,
      matchWinnerName: state.matchWinnerName,
      mapVote: {
        active: Boolean(state.mapVote.active),
        options: state.mapVote.options.slice(),
        votes: { ...state.mapVote.votes },
        counts: tally.counts,
        totalVotes: tally.totalVotes,
        leadingMapId: tally.winnerMapId,
        localVote: state.mapVote.votes[state.localUid] || null,
        remainingSec: state.mapVote.remainingSec
      },
      players: playersArr,
      killFeed: state.killFeed.slice()
    };
  }

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('beforeunload', () => {
      if (state.role === 'host' || state.role === 'client') {
        leaveSession(true);
      }
    });
  }

  function hostResolveNukeDetonate(ownerUid, fallbackName) {
    const caster = state.players.get(ownerUid);
    const ownerName = String((caster && caster.name) || fallbackName || 'RUNNER').slice(0, 24);
    const ownerTeam = (caster && caster.team) || '';
    const allPlayers = [];
    for (const [uid, p] of state.players) {
      allPlayers.push({ uid, alive: p.alive !== false, team: p.team || '', rec: p });
    }
    const filterFn = root.CombatSystem && typeof root.CombatSystem.filterNukeTargets === 'function'
      ? root.CombatSystem.filterNukeTargets
      : (list, oUid, oTeam) => list.filter((t) => t && t.alive !== false && t.uid !== oUid && !(oTeam && t.team && t.team === oTeam));
    const victims = filterFn(allPlayers, ownerUid, ownerTeam);
    for (const v of victims) {
      const p = v.rec;
      p.hp = 0;
      p.alive = false;
      p.deaths = (p.deaths || 0) + 1;
      if (caster) caster.kills = (caster.kills || 0) + 1;
      if (v.uid === state.localUid) {
        state.localHp = 0;
        state.localAlive = false;
      } else if (root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(v.uid, { alive: false, hp: 0 });
      }
      pushKillFeed(ownerName, p.name || 'RUNNER', 'nuke', false);
      broadcastGame({
        t: 'kill',
        killerUid: ownerUid,
        killerName: ownerName,
        victimUid: v.uid,
        victimName: p.name || 'RUNNER',
        slot: 'nuke',
        isHeadshot: false
      });
    }
    if (victims.length === 0) {
      pushKillFeed(ownerName, 'HOSTILES', 'nuke', false);
    }
    showBanner('TACTICAL NUKE DETONATED', `${ownerName.toUpperCase()} ELIMINATED ALL HOSTILES`, 3600);
    if (state.phase === 'live') {
      // Allow the 3D mushroom cloud to rise dramatically before starting post-match map vote
      setTimeout(() => {
        if (state.role === 'host' && state.phase === 'live') {
          hostBeginMapVote(ownerUid, ownerName);
        }
      }, 3600);
    }
    emitState();
  }

  function reportNukeLaunch(ownerName) {
    const cleanName = String(ownerName || state.localName || 'RUNNER').slice(0, 24);
    const localRec = state.players.get(state.localUid);
    const ownerTeam = (localRec && localRec.team) || '';
    if (state.role === 'host') {
      broadcastGame({ t: 'nuke_launch', ownerName: cleanName, ownerUid: state.localUid, ownerTeam });
    } else if (state.role === 'client') {
      sendToHostGame({ t: 'nuke_launch', ownerName: cleanName, ownerTeam });
    }
  }

  function reportNukeDetonate(ownerName) {
    const cleanName = String(ownerName || state.localName || 'RUNNER').slice(0, 24);
    if (state.role === 'host') {
      hostResolveNukeDetonate(state.localUid, cleanName);
    } else if (state.role === 'client') {
      sendToHostGame({ t: 'nuke_detonate', ownerName: cleanName });
    } else {
      pushKillFeed(cleanName, 'HOSTILES', 'nuke', false);
      showBanner('TACTICAL NUKE DETONATED', `${cleanName.toUpperCase()} ELIMINATED ALL HOSTILES`, 3600);
    }
  }

  const exported = {
    setCallbacks: (cbs) => Object.assign(callbacks, cbs || {}),
    setArenaSpawns,
    startSoloWarmup,
    hostLobby,
    joinLobby,
    joinByCode,
    leaveSession,
    requestRematch,
    castMapVote,
    computeVoteTally,
    reportVoidFall,
    reportShot,
    reportNukeLaunch,
    reportNukeDetonate,
    applyWarmupDamage,
    applyBotDamage,
    canBotDamageTarget,
    reportBotPose,
    reportBotShot,
    sendChatMessage,
    sendBotChatMessage,
    update,
    devHealLocal: () => {
      if (state.role === 'host' || state.role === 'client') return false;
      state.localHp = 100;
      state.localAlive = true;
      state.respawnTimer = 0;
      const localRecord = state.players.get(state.localUid);
      if (localRecord) {
        localRecord.hp = 100;
        localRecord.alive = true;
      }
      emitState();
      return true;
    },
    pushWarmupKill: (botName, weapon, headshot) => pushKillFeed(state.localName || 'You', botName, weapon, headshot),
    getState: getPublicState
  };

  root.NetcodeSystem = exported;
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  }
})(typeof window !== 'undefined' ? window : globalThis);
