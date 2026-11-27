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

  function normalizeMode(mode) {
    return mode === 'ffa_4p' ? 'ffa_4p' : 'demolition_5v5';
  }

  const state = {
    role: 'none', // 'none' | 'warmup' | 'host' | 'client'
    mapId: 'tac_citadel',
    mode: 'demolition_5v5', // 'demolition_5v5' | 'ffa_4p'
    lobby: null,
    localUid: '',
    localName: 'Runner',
    statusText: 'IDLE',
    phase: 'warmup', // 'warmup' | 'buy' | 'countdown' | 'live' | 'post_round' | 'halftime' | 'round_over' | 'match_over'
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
    players: new Map(), // uid -> { uid, name, hp, alive, score, kills, deaths, spawnIdx, slot, team, squad, skillTier, econ, ... }
    killFeed: [] // { id, killer, victim, weapon, headshot, ts }
  };
  let demoMatch = null;
  let tacticalLevelData = null;
  let lastLocalDeathBreakdown = null;
  let demoSyncAccum = 0;
  let localBombHoldNetAccum = 0;
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
  let botVoteTimers = [];
  let pendingBotVotes = [];
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
    frag: 'FRAG HE',
    molotov: 'MOLOTOV',
    c4: 'C4 SATCHEL',
    breach: 'BREACH',
    bomb: 'C4 BOMB',
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

  function clearBotVoteTimers() {
    for (const id of botVoteTimers) {
      clearTimeout(id);
    }
    botVoteTimers = [];
    pendingBotVotes = [];
  }

  function resetMapVoteState() {
    clearBotVoteTimers();
    state.mapVote = {
      active: false,
      options: [],
      votes: {},
      remainingSec: 0,
      resolvedMapId: null
    };
  }

  function resetMatchStructures() {
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
    demoMatch = null;
    lastLocalDeathBreakdown = null;
    demoSyncAccum = 0;
    resetMapVoteState();
  }

  function ensurePlayerRecord(uid, name, spawnIdx) {
    let rec = state.players.get(uid);
    if (!rec) {
      const DE = root.DemolitionEngine;
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
        team: '',
        squad: '',
        skillTier: 'solid',
        econ: DE && typeof DE.createPlayerEconomy === 'function' ? DE.createPlayerEconomy() : null,
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
    const carrierUid = demoMatch && demoMatch.bomb && demoMatch.bomb.state === 'carried' ? demoMatch.bomb.carrierUid : null;
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
        team: p.team || '',
        squad: p.squad || '',
        skillTier: p.skillTier || 'solid',
        hasBomb: Boolean(carrierUid && carrierUid === p.uid),
        econ: p.econ ? {
          credits: p.econ.credits || 0,
          armor: p.econ.armor || 0,
          helmet: Boolean(p.econ.helmet),
          defuseKit: Boolean(p.econ.defuseKit),
          loadoutIndex: p.econ.loadoutIndex || 0,
          plants: p.econ.plants || 0,
          defuses: p.econ.defuses || 0,
          assists: p.econ.assists || 0,
          utility: p.econ.utility ? { ...p.econ.utility } : {}
        } : null,
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

  function serializeDemolitionSummary() {
    if (!demoMatch) return null;
    return {
      round: demoMatch.round,
      half: demoMatch.half,
      swapped: Boolean(demoMatch.swapped),
      phase: demoMatch.phase,
      phaseTimer: Number((demoMatch.phaseTimer || 0).toFixed(2)),
      scores: { alpha: demoMatch.scores.alpha || 0, bravo: demoMatch.scores.bravo || 0 },
      lossStreak: { alpha: demoMatch.lossStreak.alpha || 0, bravo: demoMatch.lossStreak.bravo || 0 },
      sideSquads: { atk: demoMatch.sideSquads.atk, def: demoMatch.sideSquads.def },
      bomb: {
        state: demoMatch.bomb.state,
        carrierUid: demoMatch.bomb.carrierUid,
        site: demoMatch.bomb.site,
        pos: demoMatch.bomb.pos ? {
          x: Number((demoMatch.bomb.pos.x || 0).toFixed(2)),
          y: Number((demoMatch.bomb.pos.y || 0).toFixed(2)),
          z: Number((demoMatch.bomb.pos.z || 0).toFixed(2))
        } : { x: 0, y: 0, z: 0 },
        fuseTimer: Number((demoMatch.bomb.fuseTimer || 0).toFixed(2)),
        plantProgress: Number((demoMatch.bomb.plantProgress || 0).toFixed(2)),
        planterUid: demoMatch.bomb.planterUid,
        defuseProgress: Number((demoMatch.bomb.defuseProgress || 0).toFixed(2)),
        defuserUid: demoMatch.bomb.defuserUid
      },
      lastRoundWinSide: demoMatch.lastRoundWinSide,
      lastRoundWinReason: demoMatch.lastRoundWinReason,
      winnerSquad: demoMatch.winnerSquad,
      botPlanSite: demoMatch.botPlanSite || 'A',
      teamOrders: demoMatch.teamOrders || {}
    };
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
      demo: serializeDemolitionSummary(),
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
    if (state.role !== 'host' || !state.lobby || state.mode !== 'ffa_4p') return false;
    if (state.phase !== 'warmup' && state.phase !== 'countdown' && state.phase !== 'live') return false;

    // If a human is in the middle of joining, retry shortly rather than taking
    // the seat they are about to occupy.
    for (const peer of hostPeers.values()) {
      if (!peer.joined) {
        botFillTimer = setTimeout(() => {
          botFillTimer = null;
          hostFillLobbyWithBots();
        }, 5000);
        return false;
      }
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
      if (state.players.has(uid)) continue;
      const botName = root.BotAISystem && typeof root.BotAISystem.generatePlayerName === 'function'
        ? root.BotAISystem.generatePlayerName(usedNames)
        : 'player' + (i + 1);
      usedNames.push(botName);
      const spawnIdx = findAvailableSpawnIndex();
      const bot = ensurePlayerRecord(uid, botName, spawnIdx);
      bot.isBot = true;
      bot.botType = botType;
      bot.hp = 100;
      bot.alive = true;
      bot.slot = weapons[botType];
      bot.spawnIdx = spawnIdx;
      const spawn = getSpawnForIndex(bot.spawnIdx);
      bot.x = spawn.x;
      bot.y = spawn.y;
      bot.z = spawn.z;
      bot.yaw = spawn.yaw || 0;
      added.push(bot);
      if (root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(uid, {
          name: bot.name,
          isBot: true,
          botType: bot.botType,
          x: bot.x, y: bot.y, z: bot.z, yaw: bot.yaw,
          hp: 100, alive: true, slot: bot.slot, snap: true
        });
      }
    }

    if (!added.length) return false;
    if (root.CombatSystem) {
      root.CombatSystem.setWarmupBotsVisible(false);
      root.CombatSystem.syncArenaBots(serializePlayersList());
    }
    state.statusText = `AI OPPONENTS JOINED · ${added.length} BOT${added.length === 1 ? '' : 'S'}`;
    if (state.phase === 'warmup') {
      hostStartRoundOrMatch(true);
    } else {
      // The match may already be live because a second human joined before
      // the fill timer elapsed. Add the bots to that match without resetting it.
      broadcastFullSnapshot();
      syncLobbyMetaNow();
      emitState();
    }
    showBanner('AI OPPONENTS JOINED', `${added.length} BOT${added.length === 1 ? '' : 'S'} ENTERED THE ARENA`, 2200);
    return true;
  }

  // ---------- Demolition 5v5 Host Lifecycle & Mechanics ----------
  function getTacticalSpawn(team, idx) {
    const tac = tacticalLevelData && tacticalLevelData.tactical;
    const pool = tac
      ? (team === 'atk' ? tac.atkSpawns : tac.defSpawns)
      : arenaSpawns;
    if (Array.isArray(pool) && pool.length > 0) {
      return pool[((idx % pool.length) + pool.length) % pool.length];
    }
    return getSpawnForIndex(idx);
  }

  function hostInitDemolitionRoster(humans) {
    const DE = root.DemolitionEngine;
    if (!DE) return;
    const nameGen = (used) => (root.BotAISystem && typeof root.BotAISystem.generatePlayerName === 'function'
      ? root.BotAISystem.generatePlayerName(used)
      : ('player_' + Math.floor(10 + Math.random() * 89)));
    const roster = DE.buildDemolitionRoster(humans, { nameGenerator: nameGen });
    state.players.clear();
    let atkIdx = 0;
    let defIdx = 0;
    for (const p of roster.all) {
      const slotIdx = p.team === 'atk' ? (atkIdx++) : (defIdx++);
      const rec = ensurePlayerRecord(p.uid, p.name, slotIdx);
      rec.isBot = Boolean(p.isBot);
      rec.botType = p.botType;
      rec.team = p.team;
      rec.squad = p.team === 'atk' ? 'alpha' : 'bravo';
      rec.skillTier = p.skillTier || 'solid';
      rec.econ = p.econ || DE.createPlayerEconomy();
      rec.slot = p.slot || 'rifle';
      rec.hp = 100;
      rec.alive = true;
      rec.kills = 0;
      rec.deaths = 0;
      rec.score = 0;
    }
  }

  function hostStartDemolitionRound(isNewMatch) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5') return;
    const DE = root.DemolitionEngine;
    if (!DE) return;

    if (roundTimeout) {
      clearTimeout(roundTimeout);
      roundTimeout = null;
    }

    if (isNewMatch || !demoMatch) {
      demoMatch = DE.createMatchState(state.mapId);
      demoMatch.botPlanSite = Math.random() < 0.5 ? 'A' : 'B';
      demoMatch.teamOrders = {};
      state.round = 1;
      state.matchWinnerUid = null;
      state.matchWinnerName = '';
      resetMapVoteState();
      // Reset player stats & economy cleanly on fresh match
      for (const [, p] of state.players) {
        p.kills = 0;
        p.deaths = 0;
        p.score = 0;
        p.hp = 100;
        p.alive = true;
        p.team = p.squad === demoMatch.sideSquads.atk ? 'atk' : 'def';
        p.econ = DE.createPlayerEconomy();
      }
      // Assign initial bomb carrier on Attackers (prefer human ATK)
      const atkList = Array.from(state.players.values()).filter((p) => p.team === 'atk');
      const carrier = atkList.find((p) => !p.isBot) || atkList[0] || null;
      if (carrier) demoMatch.bomb.carrierUid = carrier.uid;
    } else {
      demoMatch.botPlanSite = Math.random() < 0.5 ? 'A' : 'B';
      demoMatch.teamOrders = {};
      state.round = demoMatch.round;
    }

    // Reset environmental destruction, tactical utility, and restore spawn Buy Barriers!
    if (root.DestructionSystem && typeof root.DestructionSystem.resetRound === 'function') {
      root.DestructionSystem.resetRound();
    }
    if (root.UtilitySystem && typeof root.UtilitySystem.clearRound === 'function') {
      root.UtilitySystem.clearRound();
    }
    if (root.TacticalMapCatalog && typeof root.TacticalMapCatalog.setBuyBarriersActive === 'function') {
      root.TacticalMapCatalog.setBuyBarriersActive(tacticalLevelData, true);
    }
    if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(false);

    // Run bot economy purchases for Buy Phase
    const allPlayers = Array.from(state.players.values());
    const atkAvg = allPlayers.filter((p) => p.team === 'atk').reduce((s, p) => s + ((p.econ && p.econ.credits) || 0), 0) / 5;
    const defAvg = allPlayers.filter((p) => p.team === 'def').reduce((s, p) => s + ((p.econ && p.econ.credits) || 0), 0) / 5;
    for (const p of allPlayers) {
      if (p.isBot) {
        DE.computeBotBuyPlan(p, p.team, demoMatch.round, p.team === 'atk' ? atkAvg : defAvg);
      }
    }

    // Place ATK & DEF teams on their side spawns
    let atkIdx = 0;
    let defIdx = 0;
    const spawnAssignments = {};
    for (const [uid, p] of state.players) {
      p.hp = 100;
      p.alive = true;
      p.lastAttackerUid = null;
      p.lastDamagedAtMs = 0;
      const idx = p.team === 'atk' ? (atkIdx++) : (defIdx++);
      p.spawnIdx = idx;
      const sp = getTacticalSpawn(p.team, idx);
      spawnAssignments[uid] = sp;
      p.x = sp.x;
      p.y = sp.y;
      p.z = sp.z;
      p.yaw = sp.yaw || 0;
      if (uid !== state.localUid && root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(uid, {
          name: p.name,
          isBot: Boolean(p.isBot),
          botType: p.botType,
          team: p.team,
          hasBomb: demoMatch.bomb.carrierUid === uid,
          x: sp.x, y: sp.y, z: sp.z, yaw: p.yaw,
          hp: 100, alive: true, slot: p.slot, snap: true
        });
      }
    }
    if (root.CombatSystem) {
      root.CombatSystem.syncArenaBots(serializePlayersList(), true);
      root.CombatSystem.resetAmmo();
    }

    lastLocalDeathBreakdown = null;
    state.localHp = 100;
    state.localAlive = true;
    state.respawnTimer = 0;
    state.phase = 'buy';
    state.freezeTimer = 0;
    demoMatch.phase = 'buy';
    demoMatch.phaseTimer = DE.RULES.BUY_SEC;

    const myRec = state.players.get(state.localUid);
    const mySideLabel = myRec && myRec.team === 'atk' ? 'ATTACKERS · PLANT THE BOMB' : 'DEFENDERS · HOLD THE SITES';
    state.statusText = `DEMOLITION 5v5 · ROUND ${demoMatch.round} · BUY PHASE`;
    const mySpawn = spawnAssignments[state.localUid] || getTacticalSpawn(myRec ? myRec.team : 'atk', 0);
    if (typeof callbacks.onLocalRespawn === 'function') {
      callbacks.onLocalRespawn(mySpawn, false);
    }
    showBanner(`ROUND ${demoMatch.round} · BUY PHASE`, `${mySideLabel} · PRESS B TO BUY`, 2600);
    if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);

    broadcastGame({
      t: 'demo_round_start',
      round: demoMatch.round,
      spawns: spawnAssignments,
      demo: serializeDemolitionSummary(),
      players: serializePlayersList()
    });
    syncLobbyMetaNow();
    emitState();
  }

  function hostConcludeDemolitionRound(winSide, reason) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch) return;
    if (demoMatch.phase !== 'live') return;
    const DE = root.DemolitionEngine;
    if (!DE) return;

    const allPlayers = Array.from(state.players.values());
    const outcome = DE.resolveRoundWin(demoMatch, winSide, reason, allPlayers);
    state.phase = demoMatch.phase;

    const winLabel = winSide === 'atk' ? 'ATTACKERS' : 'DEFENDERS';
    const reasonMap = {
      elimination: 'TEAM ELIMINATED',
      bomb_detonated: 'TARGET DETONATED',
      bomb_defused: 'BOMB DEFUSED',
      time_expired: 'TIME EXPIRED'
    };
    const reasonText = reasonMap[reason] || 'ROUND COMPLETE';

    if (outcome.matchOver) {
      const winSquad = outcome.winnerSquad;
      const localRec = state.players.get(state.localUid);
      const localWon = Boolean(localRec && localRec.squad === winSquad);
      const winTeamName = localWon ? 'YOUR SQUAD' : (winSquad === 'alpha' ? 'ALPHA SQUAD' : 'BRAVO SQUAD');
      hostBeginMapVote(localWon ? state.localUid : ('squad_' + winSquad), winTeamName);
      return;
    }

    if (outcome.halftime) {
      showBanner('HALFTIME · SWITCHING SIDES', `${winLabel} TAKE R${demoMatch.round} · ${reasonText} · $800 RESET`, 4200);
    } else {
      showBanner(`${winLabel} WIN ROUND ${demoMatch.round}`, reasonText, 3000);
    }
    if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);

    broadcastGame({
      t: 'demo_round_end',
      winSide,
      reason,
      halftime: outcome.halftime,
      demo: serializeDemolitionSummary(),
      players: serializePlayersList()
    });
    emitState();
  }

  function hostCheckDemolitionWin() {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live') return;
    let aliveAtk = 0;
    let aliveDef = 0;
    for (const p of state.players.values()) {
      if (!p.alive) continue;
      if (p.team === 'atk') aliveAtk++;
      else if (p.team === 'def') aliveDef++;
    }
    if (aliveDef === 0) {
      hostConcludeDemolitionRound('atk', 'elimination');
    } else if (aliveAtk === 0 && demoMatch.bomb.state !== 'planted') {
      hostConcludeDemolitionRound('def', 'elimination');
    }
  }

  function hostAssignJoiningHumanInDemolition(peerUid, displayName) {
    const DE = root.DemolitionEngine;
    let humanAtk = 0;
    let humanDef = 0;
    for (const p of state.players.values()) {
      if (p.isBot) continue;
      if (p.team === 'atk') humanAtk++;
      else if (p.team === 'def') humanDef++;
    }
    // Auto-balance humans across ATK & DEF (e.g. 2v2 + 3 bots each!)
    const targetTeam = humanDef < humanAtk ? 'def' : 'atk';
    let replacedBot = null;
    for (const p of state.players.values()) {
      if (p.isBot && p.team === targetTeam) {
        replacedBot = p;
        break;
      }
    }
    if (!replacedBot) {
      for (const p of state.players.values()) {
        if (p.isBot) { replacedBot = p; break; }
      }
    }
    let inheritedSpawnIdx = 0;
    let inheritedTeam = targetTeam;
    let inheritedSquad = demoMatch ? (targetTeam === 'atk' ? demoMatch.sideSquads.atk : demoMatch.sideSquads.def) : (targetTeam === 'atk' ? 'alpha' : 'bravo');
    let inheritedEcon = DE ? DE.createPlayerEconomy() : null;
    if (replacedBot) {
      inheritedSpawnIdx = replacedBot.spawnIdx || 0;
      inheritedTeam = replacedBot.team;
      inheritedSquad = replacedBot.squad || inheritedSquad;
      if (replacedBot.econ) inheritedEcon = { ...replacedBot.econ, utility: { ...(replacedBot.econ.utility || {}) } };
      if (demoMatch && demoMatch.bomb && demoMatch.bomb.carrierUid === replacedBot.uid) {
        demoMatch.bomb.carrierUid = peerUid;
      }
      state.players.delete(replacedBot.uid);
      if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(replacedBot.uid);
    }
    const rec = ensurePlayerRecord(peerUid, displayName, inheritedSpawnIdx);
    rec.isBot = false;
    rec.botType = null;
    rec.team = inheritedTeam;
    rec.squad = inheritedSquad;
    rec.econ = inheritedEcon;
    const isBuy = Boolean(demoMatch && demoMatch.phase === 'buy');
    rec.hp = isBuy ? 100 : 0;
    rec.alive = isBuy;
    const sp = getTacticalSpawn(rec.team, rec.spawnIdx);
    rec.x = sp.x;
    rec.y = sp.y;
    rec.z = sp.z;
    rec.yaw = sp.yaw || 0;
    return rec;
  }

  // ---------- Host-Authoritative Match Loop ----------
  function hostStartRoundOrMatch(resetScores) {
    if (state.role !== 'host') return;
    if (state.mode === 'demolition_5v5') {
      hostStartDemolitionRound(Boolean(resetScores) || !demoMatch);
      return;
    }
    if (roundTimeout) {
      clearTimeout(roundTimeout);
      roundTimeout = null;
    }
    if (resetScores) {
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

    state.phase = 'live';
    state.freezeTimer = 0;
    state.statusText = `FFA ARENA · FIRST TO ${FFA_WIN_KILLS}`;
    if (typeof callbacks.onLocalRespawn === 'function') {
      callbacks.onLocalRespawn(mySpawn, false);
    }
    showBanner('FREE-FOR-ALL LIVE', `FIRST TO ${FFA_WIN_KILLS} KILLS WINS`, 2200);
    if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);

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
    if (typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'round_start',
        round: state.round,
        mapId: state.mapId,
        mode: state.mode,
        resetScores: Boolean(resetScores)
      });
    }
    emitState();
  }

  function applyWarmupDamage(damage, botName, weapon, isHeadshot) {
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
        botName: botName || '',
        playerName: state.localName || 'Runner',
        mapId: state.mapId,
        mode: state.mode
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
          botName: attackerName,
          playerName: state.localName || 'Runner',
          weapon: weapon || 'rifle',
          headshot: Boolean(isHeadshot),
          mapId: state.mapId,
          mode: state.mode
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

  function pickBotVoteChoice(bot, options, winnerUid) {
    const opts = Array.isArray(options) && options.length ? options : getValidArenaIds().slice(0, 3);
    const engine = root.BotBanterEngine || (typeof require === 'function' ? (() => {
      try { return require('../chat/botBanterEngine.js'); } catch (_) { return null; }
    })() : null);
    if (engine && typeof engine.chooseBotMapVote === 'function') {
      return engine.chooseBotMapVote(bot, opts, state.mapId, {
        winnerUid,
        votes: state.mapVote.votes
      });
    }
    const fresh = opts.filter((id) => id !== state.mapId);
    const pool = fresh.length ? fresh : opts;
    return pool[Math.floor(Math.random() * pool.length) % pool.length];
  }

  function executeBotMapVote(entry) {
    if (!entry || entry.voted) return;
    if (state.role !== 'host' || state.phase !== 'match_over' || !state.mapVote.active) return;
    const bot = state.players.get(entry.botUid);
    if (!bot || !bot.isBot) return;
    entry.voted = true;
    const chosenMapId = pickBotVoteChoice(bot, state.mapVote.options, entry.winnerUid);
    if (!state.mapVote.options.includes(chosenMapId)) return;
    hostRecordMapVote(bot.uid, chosenMapId);
    if (typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'map_vote_cast',
        voterUid: bot.uid,
        voterName: bot.name,
        voterIsBot: true,
        botUid: bot.uid,
        botName: bot.name,
        botType: bot.botType,
        mapId: chosenMapId,
        options: state.mapVote.options.slice(),
        votes: { ...state.mapVote.votes }
      });
    }
  }

  function scheduleBotMapVotes(winnerUid) {
    clearBotVoteTimers();
    if (state.role !== 'host' || state.phase !== 'match_over' || !state.mapVote.active) return;
    const bots = Array.from(state.players.values()).filter((p) => p && p.isBot);
    if (!bots.length) return;
    // Shuffle bot voting order so it feels organic
    for (let i = bots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = bots[i];
      bots[i] = bots[j];
      bots[j] = tmp;
    }
    bots.forEach((bot, idx) => {
      const entry = {
        botUid: bot.uid,
        botName: bot.name,
        botType: bot.botType,
        winnerUid,
        voted: false,
        timerId: null
      };
      const delayMs = Math.round(1350 + idx * 1450 + Math.random() * 850);
      entry.timerId = setTimeout(() => {
        executeBotMapVote(entry);
      }, delayMs);
      botVoteTimers.push(entry.timerId);
      pendingBotVotes.push(entry);
    });
  }

  function acceleratePendingBotVotes() {
    const remaining = pendingBotVotes.filter((e) => e && !e.voted);
    if (!remaining.length) return;
    for (const id of botVoteTimers) clearTimeout(id);
    botVoteTimers = [];
    remaining.forEach((entry, idx) => {
      const fastDelayMs = Math.round(520 + idx * 440 + Math.random() * 240);
      entry.timerId = setTimeout(() => {
        executeBotMapVote(entry);
      }, fastDelayMs);
      botVoteTimers.push(entry.timerId);
    });
  }

  function hostBeginMapVote(winnerUid, winnerName) {
    clearBotVoteTimers();
    const options = (root.ArenaCatalog && typeof root.ArenaCatalog.pickVoteOptions === 'function')
      ? root.ArenaCatalog.pickVoteOptions(state.mapId, Math.random, state.mode)
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
    if (typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'match_over',
        winnerUid,
        winnerName,
        mapId: state.mapId,
        mode: state.mode,
        options: state.mapVote.options.slice(),
        players: serializePlayersList()
      });
    }
    scheduleBotMapVotes(winnerUid);
  }

  function hostRecordMapVote(voterUid, mapId) {
    if (state.role !== 'host' || state.phase !== 'match_over' || !state.mapVote.active) return;
    if (!state.mapVote.options.includes(mapId)) return;
    state.mapVote.votes[voterUid] = mapId;

    const voter = state.players.get(voterUid);
    const isBotVoter = Boolean(voter && voter.isBot);
    if (isBotVoter) {
      const pending = pendingBotVotes.find((e) => e && e.botUid === voterUid);
      if (pending) pending.voted = true;
    } else if (typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'map_vote_cast',
        voterUid,
        voterName: (voter && voter.name) || state.localName || 'Player',
        voterIsBot: false,
        mapId,
        options: state.mapVote.options.slice(),
        votes: { ...state.mapVote.votes }
      });
    }

    const humanUids = Array.from(state.players.values())
      .filter((p) => !p.isBot)
      .map((p) => p.uid);
    const botUids = Array.from(state.players.values())
      .filter((p) => p.isBot)
      .map((p) => p.uid);
    const allHumansVoted = humanUids.length > 0 && humanUids.every((uid) => Boolean(state.mapVote.votes[uid]));
    const allBotsVoted = botUids.every((uid) => Boolean(state.mapVote.votes[uid]));

    if (allHumansVoted && allBotsVoted) {
      if (state.mapVote.remainingSec > 2.2) state.mapVote.remainingSec = 2.2;
    } else if (allHumansVoted && !allBotsVoted) {
      // Tighten remaining bot votes into a quick organic burst so players see bots vote & react before launch
      if (!isBotVoter) acceleratePendingBotVotes();
      if (state.mapVote.remainingSec > 3.8) state.mapVote.remainingSec = 3.8;
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
    if (state.mode === 'demolition_5v5') {
      hostCheckDemolitionWin();
      return;
    }
    const roundWinner = state.players.get(roundWinnerUid);
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

  function hostResolveDamage(attackerUid, victimUid, damage, slot, isHeadshot, allowSelf) {
    if (state.role !== 'host') return;
    if (state.phase !== 'live') return;
    const attacker = state.players.get(attackerUid);
    const victim = state.players.get(victimUid);
    if (!victim || !victim.alive) return;
    if (!allowSelf && (!attacker || attackerUid === victimUid)) return;
    // No friendly fire in Demolition 5v5 (except self-explosives/molotov when allowSelf is true)
    if (state.mode === 'demolition_5v5' && attacker && attackerUid !== victimUid && attacker.team && victim.team && attacker.team === victim.team) {
      return;
    }
    // If local host player is actively deflecting with Katana, reflect bullet straight back!
    if (victimUid === state.localUid && slot !== 'frag' && slot !== 'molotov' && slot !== 'c4' && slot !== 'breach' &&
        root.CombatSystem && typeof root.CombatSystem.isLocalKatanaDeflecting === 'function' && root.CombatSystem.isLocalKatanaDeflecting()) {
      root.CombatSystem.tryInterceptDeflect(null, null, null, null);
      return;
    }

    const cleanDmg = Math.max(1, Math.min(260, Math.round(Number(damage) || 0)));
    if (attacker && attackerUid !== victimUid) {
      victim.lastAttackerUid = attackerUid;
      victim.lastAttackerName = attacker.name;
      victim.lastAttackerSlot = slot || 'rifle';
      victim.lastDamagedAtMs = Date.now();
    }
    const previousHp = victim.hp;
    let appliedHpDmg = cleanDmg;
    let appliedArmorDmg = 0;

    if (state.mode === 'demolition_5v5' && root.DemolitionEngine && demoMatch) {
      const DE = root.DemolitionEngine;
      const vArmor = victim.econ ? (victim.econ.armor || 0) : 0;
      const vHelm = Boolean(victim.econ && victim.econ.helmet);
      const armorRes = DE.applyTacticalDamage(victim.hp, vArmor, vHelm, cleanDmg, Boolean(isHeadshot), slot || 'rifle');
      victim.hp = armorRes.hp;
      if (victim.econ) victim.econ.armor = armorRes.armor;
      appliedHpDmg = armorRes.hpDamage;
      appliedArmorDmg = armorRes.armorDamage;
      if (attacker && attacker.econ && attackerUid !== victimUid) {
        attacker.econ.damageDealt = (attacker.econ.damageDealt || 0) + appliedHpDmg;
      }
      DE.recordDamageHit(demoMatch, {
        attackerUid: attacker ? attacker.uid : 'env',
        attackerName: attacker ? attacker.name : 'HAZARD',
        victimUid,
        victimName: victim.name,
        dmg: appliedHpDmg,
        armorDmg: appliedArmorDmg,
        hs: Boolean(isHeadshot),
        weapon: slot || 'rifle',
        killed: victim.hp <= 0
      });
    } else {
      victim.hp = Math.max(0, victim.hp - cleanDmg);
    }

    const killed = victim.hp <= 0;

    if (killed) {
      victim.alive = false;
      victim.deaths += 1;
      if (attacker && attackerUid !== victimUid) {
        attacker.kills += 1;
        if (state.mode === 'ffa_4p') {
          attacker.score = attacker.kills;
        } else if (state.mode === 'demolition_5v5' && root.DemolitionEngine && attacker.econ) {
          const reward = root.DemolitionEngine.getKillReward(slot || 'rifle');
          attacker.econ.credits = Math.min(root.DemolitionEngine.RULES.MAX_CREDITS, (attacker.econ.credits || 0) + reward);
          attacker.score = attacker.kills;
        }
      }
      if (state.mode === 'demolition_5v5' && demoMatch && root.DemolitionEngine) {
        // Auto-drop bomb if the carrier was eliminated!
        if (demoMatch.bomb.state === 'carried' && demoMatch.bomb.carrierUid === victimUid) {
          root.DemolitionEngine.dropBomb(demoMatch.bomb, victimUid, { x: victim.x, y: victim.y, z: victim.z });
          showBanner('BOMB DROPPED', 'ATTACKERS MUST RECOVER THE C4', 2000);
        }
        if (victimUid === state.localUid) {
          lastLocalDeathBreakdown = root.DemolitionEngine.buildDeathBreakdown(demoMatch, state.localUid);
        }
      }
      if (root.BotAISystem && attacker) {
        if (!attacker.isBot && victim.isBot && typeof root.BotAISystem.recordPlayerKill === 'function') {
          root.BotAISystem.recordPlayerKill();
        } else if (attacker.isBot && !victim.isBot && typeof root.BotAISystem.recordPlayerDeath === 'function') {
          root.BotAISystem.recordPlayerDeath();
        }
      }
    }

    // Notify everyone of damage/kill
    const deathSummary = (killed && state.mode === 'demolition_5v5' && demoMatch && root.DemolitionEngine)
      ? root.DemolitionEngine.buildDeathBreakdown(demoMatch, victimUid)
      : null;
    const dmgPacket = {
      t: 'damage_event',
      attackerUid: attacker ? attacker.uid : 'env',
      attackerName: attacker ? attacker.name : 'HAZARD',
      victimUid,
      victimName: victim.name,
      damage: appliedHpDmg,
      armorDamage: appliedArmorDmg,
      hp: victim.hp,
      alive: victim.alive,
      killed,
      slot: slot || 'rifle',
      headshot: Boolean(isHeadshot),
      attackerIsBot: Boolean(attacker && attacker.isBot),
      victimIsBot: Boolean(victim.isBot),
      deathBreakdown: deathSummary,
      demo: state.mode === 'demolition_5v5' ? serializeDemolitionSummary() : null,
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
        playerName: victim.name,
        mapId: state.mapId,
        mode: state.mode
      });
    }
    if (killed && typeof callbacks.onBotEvent === 'function') {
      if (!attacker.isBot && attacker.kills >= 3 && attacker.kills % 3 === 0) {
        callbacks.onBotEvent({
          type: 'player_kill_streak',
          playerName: attacker.name,
          totalKills: attacker.kills,
          mapId: state.mapId,
          mode: state.mode
        });
      }
      if (attacker.isBot && !victim.isBot) {
        callbacks.onBotEvent({
          type: 'bot_killed_player',
          botUid: attacker.uid,
          botName: attacker.name,
          botType: attacker.botType,
          attackerUid: attacker.uid,
          victimUid: victim.uid,
          playerName: victim.name,
          weapon: slot || 'rifle',
          headshot: Boolean(isHeadshot),
          mapId: state.mapId,
          mode: state.mode
        });
      } else if (!attacker.isBot && victim.isBot) {
        callbacks.onBotEvent({
          type: 'player_killed_bot',
          botUid: victim.uid,
          botName: victim.name,
          botType: victim.botType,
          attackerUid: attacker.uid,
          victimUid: victim.uid,
          playerName: attacker.name,
          weapon: slot || 'rifle',
          headshot: Boolean(isHeadshot),
          mapId: state.mapId,
          mode: state.mode
        });
      } else if (attacker.isBot && victim.isBot) {
        callbacks.onBotEvent({
          type: 'bot_killed_bot',
          botUid: attacker.uid,
          botName: attacker.name,
          botType: attacker.botType,
          attackerUid: attacker.uid,
          victimUid: victim.uid,
          victimName: victim.name,
          killerName: attacker.name,
          weapon: slot || 'rifle',
          headshot: Boolean(isHeadshot),
          mapId: state.mapId,
          mode: state.mode
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
    }
    if (state.mode === 'demolition_5v5' && demoMatch && root.DemolitionEngine && demoMatch.bomb.state === 'carried' && demoMatch.bomb.carrierUid === victimUid) {
      root.DemolitionEngine.dropBomb(demoMatch.bomb, victimUid, { x: victim.x, y: Math.max(0.2, victim.y), z: victim.z });
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
    if (typeof callbacks.onBotEvent === 'function') {
      callbacks.onBotEvent({
        type: 'void_fall',
        victimUid,
        victimName: victim.name,
        victimIsBot: Boolean(victim.isBot),
        attackerUid: recentAttacker ? recentAttacker.uid : null,
        attackerName: recentAttacker ? recentAttacker.name : '',
        attackerIsBot: Boolean(recentAttacker && recentAttacker.isBot),
        mapId: state.mapId,
        mode: state.mode
      });
    }
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
      if (typeof callbacks.onBotEvent === 'function') {
        callbacks.onBotEvent({
          type: 'void_fall',
          victimUid: state.localUid,
          victimName: state.localName || 'Runner',
          victimIsBot: false,
          attackerName: recent ? recent.name : '',
          attackerIsBot: Boolean(recent),
          mapId: state.mapId,
          mode: state.mode
        });
      }
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
    if (pkt.demo && state.role === 'client') {
      demoMatch = pkt.demo;
    }
    if (pkt.victimUid === state.localUid) {
      state.localHp = pkt.hp;
      state.localAlive = pkt.alive;
      if (pkt.killed && pkt.deathBreakdown) {
        lastLocalDeathBreakdown = pkt.deathBreakdown;
      }
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
      if (typeof item.team === 'string') rec.team = item.team;
      if (typeof item.squad === 'string') rec.squad = item.squad;
      if (typeof item.skillTier === 'string') rec.skillTier = item.skillTier;
      if (item.econ && typeof item.econ === 'object') {
        rec.econ = {
          ...(rec.econ || {}),
          ...item.econ,
          utility: { ...((item.econ && item.econ.utility) || {}) }
        };
      }
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
          team: rec.team,
          hasBomb: Boolean(item.hasBomb),
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

    if (msg.t === 'demo_buy' && typeof msg.itemId === 'string') {
      hostHandleDemolitionBuy(peerUid, msg.itemId);
      return;
    }

    if (msg.t === 'demo_panel_dmg' && msg.panelId) {
      if (root.DestructionSystem && typeof root.DestructionSystem.damagePanel === 'function') {
        root.DestructionSystem.damagePanel(msg.panelId, Number(msg.damage) || 25, msg.weaponId || 'rifle');
      }
      broadcastGame(msg, peerUid);
      return;
    }

    if (msg.t === 'demo_util') {
      hostHandleDemolitionUtility(peerUid, msg);
      return;
    }

    if (msg.t === 'demo_bomb_drop') {
      hostHandleBombDrop(peerUid, msg.pos);
      return;
    }

    if (msg.t === 'demo_bomb_step') {
      hostStepBombForPlayer(peerUid, Boolean(msg.holding), msg.pos, Number(msg.dt) || 0.05);
      return;
    }

    if (msg.t === 'demo_comm') {
      hostHandleTacticalComm(peerUid, msg.commId, msg.pos);
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
      if (msg.demo) {
        demoMatch = msg.demo;
        if (root.TacticalMapCatalog && typeof root.TacticalMapCatalog.setBuyBarriersActive === 'function') {
          root.TacticalMapCatalog.setBuyBarriersActive(tacticalLevelData, demoMatch.phase === 'buy');
        }
      }
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      if (root.CombatSystem) root.CombatSystem.setWarmupBotsVisible(state.phase === 'warmup');
      emitState();
      return;
    }

    if (msg.t === 'demo_round_start') {
      demoMatch = msg.demo || demoMatch;
      state.mode = 'demolition_5v5';
      state.round = msg.round || 1;
      state.phase = 'buy';
      state.localHp = 100;
      state.localAlive = true;
      state.respawnTimer = 0;
      lastLocalDeathBreakdown = null;
      resetMapVoteState();
      if (root.DestructionSystem && typeof root.DestructionSystem.resetRound === 'function') root.DestructionSystem.resetRound();
      if (root.UtilitySystem && typeof root.UtilitySystem.clearRound === 'function') root.UtilitySystem.clearRound();
      if (root.TacticalMapCatalog && typeof root.TacticalMapCatalog.setBuyBarriersActive === 'function') {
        root.TacticalMapCatalog.setBuyBarriersActive(tacticalLevelData, true);
      }
      if (root.CombatSystem) {
        root.CombatSystem.setWarmupBotsVisible(false);
        root.CombatSystem.resetAmmo();
      }
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      const mySp = msg.spawns && msg.spawns[state.localUid];
      const localRec = state.players.get(state.localUid);
      const sp = mySp || getTacticalSpawn(localRec ? localRec.team : 'atk', 0);
      if (typeof callbacks.onLocalRespawn === 'function') callbacks.onLocalRespawn(sp, false);
      const sideLabel = localRec && localRec.team === 'atk' ? 'ATTACKERS · PLANT THE BOMB' : 'DEFENDERS · HOLD THE SITES';
      showBanner(`ROUND ${state.round} · BUY PHASE`, `${sideLabel} · PRESS B TO BUY`, 2600);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
      emitState();
      return;
    }

    if (msg.t === 'demo_live') {
      if (msg.demo) demoMatch = msg.demo;
      state.phase = 'live';
      if (root.TacticalMapCatalog && typeof root.TacticalMapCatalog.setBuyBarriersActive === 'function') {
        root.TacticalMapCatalog.setBuyBarriersActive(tacticalLevelData, false);
      }
      showBanner(`ROUND ${state.round} LIVE`, 'ELIMINATE HOSTILES OR COMPLETE OBJECTIVE', 1600);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
      emitState();
      return;
    }

    if (msg.t === 'demo_round_end') {
      if (msg.demo) demoMatch = msg.demo;
      state.phase = demoMatch ? demoMatch.phase : 'post_round';
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      const winLabel = msg.winSide === 'atk' ? 'ATTACKERS' : 'DEFENDERS';
      showBanner(msg.halftime ? 'HALFTIME · SWITCHING SIDES' : `${winLabel} WIN ROUND ${state.round}`, String(msg.reason || '').toUpperCase().replace(/_/g, ' '), 3000);
      if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
      emitState();
      return;
    }

    if (msg.t === 'demo_sync') {
      if (msg.demo) demoMatch = msg.demo;
      if (msg.phase) state.phase = msg.phase;
      if (Array.isArray(msg.players)) applyPlayersSnapshot(msg.players);
      emitState();
      return;
    }

    if (msg.t === 'demo_panel_dmg' && msg.panelId) {
      if (root.DestructionSystem && typeof root.DestructionSystem.damagePanel === 'function') {
        root.DestructionSystem.damagePanel(msg.panelId, Number(msg.damage) || 25, msg.weaponId || 'rifle');
      }
      return;
    }

    if (msg.t === 'demo_util_fx') {
      applyDemolitionUtilityVisuals(msg);
      return;
    }

    if (msg.t === 'demo_ping' && msg.pos) {
      if (root.UtilitySystem && typeof root.UtilitySystem.addTacticalPing === 'function') {
        root.UtilitySystem.addTacticalPing(msg.pos, msg.label || 'PING', msg.team || 'atk', msg.senderName || 'TEAM');
      }
      return;
    }

    if (msg.t === 'round_begin') {
      state.mode = normalizeMode(msg.mode || state.mode);
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
      showBanner('FREE-FOR-ALL LIVE', `FIRST TO ${FFA_WIN_KILLS} KILLS WINS`, 2200);
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
            if (state.mode === 'demolition_5v5') {
              const humanCountNow = countHumanPlayers();
              if (humanCountNow >= (state.lobby.maxPlayers || 4)) {
                hostRemovePeer(peerUid);
                return;
              }
              const rec = hostAssignJoiningHumanInDemolition(peerUid, entry.displayName);
              entry.joined = true;
              if (root.CombatSystem) {
                root.CombatSystem.upsertRemoteAvatar(peerUid, {
                  name: rec.name,
                  team: rec.team,
                  hasBomb: Boolean(demoMatch && demoMatch.bomb && demoMatch.bomb.carrierUid === peerUid),
                  x: rec.x, y: rec.y, z: rec.z, yaw: rec.yaw,
                  hp: rec.hp, alive: rec.alive, snap: true
                });
                root.CombatSystem.syncArenaBots(serializePlayersList());
              }
              broadcastFullSnapshot();
              syncLobbyMetaNow();
              emitState();
              return;
            }
            // Re-check seats at the moment the data channel opens. A pending
            // join can overlap the 60-second bot timer or another join.
            if (!entry.replacingBotUid && state.players.size >= (state.lobby.maxPlayers || 4)) {
              entry.replacingBotUid = findUnreservedBotUid();
            }
            if (state.players.size >= (state.lobby.maxPlayers || 4) && !entry.replacingBotUid) {
              hostRemovePeer(peerUid);
              return;
            }

            let replacementSpawnIdx = null;
            if (entry.replacingBotUid) {
              replacementSpawnIdx = hostRemoveBotForReplacement(entry.replacingBotUid);
              entry.replacingBotUid = null;
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
    const departing = state.players.get(peerUid);
    state.players.delete(peerUid);
    if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(peerUid);
    if (state.lobby && root.DailyBackend) {
      root.DailyBackend.deletePeerDoc(state.lobby.lobbyId, peerUid).catch(() => {});
    }
    if (state.mode === 'demolition_5v5' && departing && state.role === 'host') {
      // Refill departed human seat with a solo-queue bot on the same team so 5v5 stays balanced!
      const usedNames = Array.from(state.players.values()).map((p) => p.name);
      const botName = root.BotAISystem && typeof root.BotAISystem.generatePlayerName === 'function'
        ? root.BotAISystem.generatePlayerName(usedNames)
        : 'sub_bot';
      const botUid = `ai_sub_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const sub = ensurePlayerRecord(botUid, botName, departing.spawnIdx || 0);
      sub.isBot = true;
      sub.botType = Math.floor(Math.random() * 4);
      sub.team = departing.team || 'def';
      sub.squad = departing.squad || 'bravo';
      sub.skillTier = 'solid';
      sub.hp = departing.alive ? departing.hp : 0;
      sub.alive = Boolean(departing.alive);
      sub.x = departing.x;
      sub.y = departing.y;
      sub.z = departing.z;
      sub.yaw = departing.yaw || 0;
      if (demoMatch && demoMatch.bomb && demoMatch.bomb.carrierUid === peerUid) {
        demoMatch.bomb.carrierUid = botUid;
      }
      if (root.CombatSystem) root.CombatSystem.syncArenaBots(serializePlayersList());
      broadcastFullSnapshot();
      syncLobbyMetaNow();
      emitState();
      return;
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
    const cleanMode = normalizeMode(mode);
    const isTacMap = root.TacticalMapCatalog && typeof root.TacticalMapCatalog.isTacticalMapId === 'function' && root.TacticalMapCatalog.isTacticalMapId(mapId);
    if (cleanMode === 'demolition_5v5' && isTacMap) {
      return startSoloDemolition(mapId);
    }
    leaveSession(true);
    const id = getLocalIdentity();
    state.role = 'warmup';
    state.mapId = normalizeArenaMapId(mapId, true);
    state.mode = 'ffa_4p';
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

  function startSoloDemolition(mapId) {
    leaveSession(true);
    const id = getLocalIdentity();
    const targetMap = (root.TacticalMapCatalog && root.TacticalMapCatalog.isTacticalMapId(mapId))
      ? mapId
      : 'tac_citadel';
    state.role = 'host';
    state.mapId = targetMap;
    state.mode = 'demolition_5v5';
    state.lobby = null;
    state.localUid = id.uid;
    state.localName = id.name;
    resetMatchStructures();
    hostInitDemolitionRoster([{ uid: id.uid, name: id.name }]);
    hostStartDemolitionRound(true);
    return getPublicState();
  }

  async function hostLobby(opts) {
    if (!root.DailyBackend) throw new Error('Cloud backend unavailable.');
    leaveSession(true);
    const id = getLocalIdentity();
    const lobby = await root.DailyBackend.createLobby(opts);
    state.role = 'host';
    state.mapId = lobby.mapId;
    state.mode = normalizeMode(lobby.mode);
    state.lobby = lobby;
    state.localUid = id.uid;
    state.localName = id.name;
    state.phase = 'warmup';
    state.statusText = lobby.isPrivate
      ? `HOSTING PRIVATE · CODE ${lobby.joinCode}`
      : `HOSTING PUBLIC · ${lobby.roomName.toUpperCase()}`;
    resetMatchStructures();

    if (state.mode === 'demolition_5v5') {
      hostInitDemolitionRoster([{ uid: id.uid, name: id.name }]);
    } else {
      ensurePlayerRecord(id.uid, id.name, 0);
    }

    unsubPeers = root.DailyBackend.subscribeLobbyPeers(lobby.lobbyId, (peers) => {
      for (const pDoc of peers) {
        hostHandlePeerDoc(pDoc);
      }
    });

    heartbeatTimer = setInterval(() => {
      syncLobbyMetaNow();
    }, HEARTBEAT_INTERVAL_MS);

    if (state.mode === 'demolition_5v5') {
      // Demolition 5v5 starts immediately with 9 solo-queue bots; up to 3 joining humans replace bots auto-balanced!
      setTimeout(() => {
        if (state.role === 'host' && state.mode === 'demolition_5v5') {
          hostStartDemolitionRound(true);
        }
      }, 150);
    } else {
      botFillTimer = setTimeout(() => {
        botFillTimer = null;
        hostFillLobbyWithBots();
      }, LOBBY_BOT_FILL_DELAY_MS);
    }

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
    state.mode = normalizeMode(lobby.mode);
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

    // Sync any environmental destruction panel hits across peers
    if (Array.isArray(shotResult.panelHits) && shotResult.panelHits.length > 0) {
      for (const ph of shotResult.panelHits) {
        reportPanelDamage(ph.panelId, ph.damage, ph.weaponId);
      }
    }
  }

  // ---------- Demolition 5v5 Interactive Actions (Shop, Bomb, Utility, Pings, Destruction Sync) ----------
  function reportPanelDamage(panelId, damage, weaponId) {
    if (!panelId) return;
    const pkt = { t: 'demo_panel_dmg', panelId, damage: Number(damage) || 25, weaponId: weaponId || 'rifle' };
    if (state.role === 'host') broadcastGame(pkt);
    else if (state.role === 'client') sendToHostGame(pkt);
  }

  function hostHandleDemolitionBuy(uid, itemId) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch) return { ok: false, reason: 'inactive' };
    const DE = root.DemolitionEngine;
    const p = state.players.get(uid);
    if (!DE || !p || !p.econ) return { ok: false, reason: 'no_player' };
    const res = DE.buyItem(p.econ, p.team, itemId, demoMatch.phase);
    if (res.ok) {
      broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
      emitState();
    }
    return res;
  }

  function buyDemolitionItem(itemId) {
    if (state.mode !== 'demolition_5v5' || !demoMatch) return { ok: false, reason: 'inactive' };
    if (state.role === 'host') {
      return hostHandleDemolitionBuy(state.localUid, itemId);
    }
    if (state.role === 'client') {
      const DE = root.DemolitionEngine;
      const p = state.players.get(state.localUid);
      if (DE && p && p.econ) {
        const chk = DE.canBuyItem(p.econ, p.team, itemId, demoMatch.phase);
        if (!chk.ok) return chk;
        DE.buyItem(p.econ, p.team, itemId, demoMatch.phase);
        sendToHostGame({ t: 'demo_buy', itemId });
        emitState();
        return { ok: true };
      }
    }
    return { ok: false, reason: 'not_connected' };
  }

  function selectDemolitionLoadout(loadoutIndex) {
    if (state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'buy') return false;
    const p = state.players.get(state.localUid);
    if (p && p.econ) p.econ.loadoutIndex = Math.max(0, Math.min(4, Math.floor(Number(loadoutIndex) || 0)));
    if (typeof callbacks.onSelectLoadout === 'function') {
      callbacks.onSelectLoadout(p && p.econ ? p.econ.loadoutIndex : 0);
    }
    emitState();
    return true;
  }

  function hostHandleBombDrop(uid, pos) {
    if (state.role !== 'host' || !demoMatch || !root.DemolitionEngine) return false;
    const ok = root.DemolitionEngine.dropBomb(demoMatch.bomb, uid, pos);
    if (ok) {
      showBanner('BOMB DROPPED', 'PICK UP WITH AN ATTACKER', 1600);
      broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
      emitState();
    }
    return ok;
  }

  function dropLocalBomb(pos) {
    if (state.mode !== 'demolition_5v5' || !demoMatch || !state.localAlive) return false;
    if (demoMatch.bomb.state !== 'carried' || demoMatch.bomb.carrierUid !== state.localUid) return false;
    if (state.role === 'host') return hostHandleBombDrop(state.localUid, pos);
    if (state.role === 'client') {
      sendToHostGame({ t: 'demo_bomb_drop', pos: { x: pos.x, y: pos.y, z: pos.z } });
      return true;
    }
    return false;
  }

  function hostStepBombForPlayer(uid, holding, pos, dt) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live') return null;
    const DE = root.DemolitionEngine;
    const p = state.players.get(uid);
    if (!DE || !p || !p.alive) return null;
    const bomb = demoMatch.bomb;

    if (p.team === 'atk' && bomb.state === 'carried' && bomb.carrierUid === uid) {
      const siteObj = tacticalLevelData && root.TacticalMapCatalog && pos
        ? root.TacticalMapCatalog.findPlantSiteAt(tacticalLevelData, pos.x, pos.y, pos.z)
        : null;
      const res = DE.stepBombPlant(bomb, holding, siteObj ? siteObj.id : null, uid, dt);
      if (res.planted) {
        bomb.pos = { x: Number(pos.x) || 0, y: Math.max(0.05, Number(pos.y) || 0), z: Number(pos.z) || 0 };
        if (p.econ) {
          p.econ.credits = Math.min(DE.RULES.MAX_CREDITS, (p.econ.credits || 0) + DE.RULES.PLANT_BONUS_PLAYER);
          p.econ.plants = (p.econ.plants || 0) + 1;
        }
        showBanner(`BOMB PLANTED AT SITE ${res.site}`, '40 SECONDS TO DETONATION', 2800);
        if (root.WeaponAudio) root.WeaponAudio.roundHorn(true);
        broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
        emitState();
      }
      return { action: 'plant', ...res };
    }

    if (p.team === 'def' && bomb.state === 'planted' && bomb.pos) {
      const dist = pos ? Math.hypot((pos.x || 0) - bomb.pos.x, (pos.z || 0) - bomb.pos.z) : 999;
      const nearBomb = dist <= 2.9 && Math.abs((pos.y || 0) - bomb.pos.y) <= 2.4;
      const hasKit = Boolean(p.econ && p.econ.defuseKit);
      const res = DE.stepBombDefuse(bomb, holding, nearBomb, uid, hasKit, dt);
      if (res.defused) {
        if (p.econ) {
          p.econ.credits = Math.min(DE.RULES.MAX_CREDITS, (p.econ.credits || 0) + DE.RULES.DEFUSE_BONUS_PLAYER);
          p.econ.defuses = (p.econ.defuses || 0) + 1;
        }
        hostConcludeDemolitionRound('def', 'bomb_defused');
      }
      return { action: 'defuse', ...res };
    }
    return null;
  }

  function stepLocalBombAction(holding, pos, dt) {
    if (state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live' || !state.localAlive) return null;
    if (state.role === 'host') {
      return hostStepBombForPlayer(state.localUid, holding, pos, dt);
    }
    if (state.role === 'client') {
      localBombHoldNetAccum += dt;
      if (holding || localBombHoldNetAccum >= 0.08) {
        localBombHoldNetAccum = 0;
        sendToHostGame({ t: 'demo_bomb_step', holding: Boolean(holding), pos: { x: pos.x, y: pos.y, z: pos.z }, dt });
      }
    }
    return null;
  }

  function botPickupBomb(botUid, pos) {
    if (state.role !== 'host' || !demoMatch || !root.DemolitionEngine) return false;
    const bot = state.players.get(botUid);
    if (!bot || !bot.alive || bot.team !== 'atk') return false;
    const ok = root.DemolitionEngine.tryPickupBomb(demoMatch.bomb, botUid, 'atk', pos, 2.5);
    if (ok) {
      broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
      emitState();
    }
    return ok;
  }

  function stepBotBombAction(botUid, dt, _siteId, pos) {
    return hostStepBombForPlayer(botUid, true, pos, dt);
  }

  function applyDemolitionAreaDamage(ownerUid, _ownerTeam, pos, radius, maxDmg, weaponId) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !pos) return;
    if (root.DestructionSystem && typeof root.DestructionSystem.applyExplosion === 'function' && weaponId !== 'molotov') {
      root.DestructionSystem.applyExplosion(pos, radius * 0.9, maxDmg * 1.4);
    }
    for (const [uid, p] of state.players) {
      if (!p.alive) continue;
      const dist = Math.hypot((p.x || 0) - pos.x, ((p.y || 0) + 0.9) - pos.y, (p.z || 0) - pos.z);
      if (dist <= radius) {
        const falloff = weaponId === 'molotov' ? 1.0 : Math.max(0.25, 1 - (dist / radius) * 0.72);
        const dmg = Math.round(maxDmg * falloff);
        const isSelf = uid === ownerUid;
        hostResolveDamage(ownerUid, uid, isSelf ? Math.round(dmg * 0.55) : dmg, weaponId, false, isSelf);
      }
    }
  }

  function applyDemolitionUtilityVisuals(msg) {
    const US = root.UtilitySystem;
    if (!US || !msg) return;
    if (msg.kind === 'throw') {
      US.throwUtility(msg.utilType, msg.origin, msg.dir, { ownerUid: msg.ownerUid, ownerTeam: msg.ownerTeam });
    } else if (msg.kind === 'detonate_c4') {
      US.detonateC4(msg.ownerUid, { onExplosion: (ev) => applyDemolitionAreaDamage(ev.ownerUid, ev.ownerTeam, ev, ev.radius, ev.maxDamage, 'c4') });
    } else if (msg.kind === 'breach') {
      US.placeBreachCharge(msg.pos, msg.normal, msg.panelId, { ownerUid: msg.ownerUid, ownerTeam: msg.ownerTeam });
    } else if (msg.kind === 'jump_pad') {
      US.deployJumpPad(msg.pos);
    } else if (msg.kind === 'barricade' && root.DestructionSystem) {
      if (msg.panelId) root.DestructionSystem.reinforcePanel(msg.panelId);
      else if (msg.pos) root.DestructionSystem.deployBarricade(msg.pos, msg.yaw || 0);
    }
  }

  function hostHandleDemolitionUtility(uid, req) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live') return { ok: false };
    const p = state.players.get(uid);
    if (!p || !p.alive || !p.econ || !p.econ.utility) return { ok: false };
    const u = p.econ.utility;
    const US = root.UtilitySystem;

    const kind = req.kind;
    const panelId = req.panelId || req.targetPanelId || null;

    if (kind === 'detonate_c4' || kind === 'c4_detonate') {
      const det = US && US.detonateC4(uid, {
        onExplosion: (ev) => applyDemolitionAreaDamage(ev.ownerUid, ev.ownerTeam, ev, ev.radius, ev.maxDamage, 'c4')
      });
      if (det && det.length > 0) {
        broadcastGame({ t: 'demo_util_fx', kind: 'detonate_c4', ownerUid: uid });
        return { ok: true, action: 'detonate_c4' };
      }
      return { ok: false };
    }

    const throwTypes = ['frag', 'smoke', 'flash', 'molotov', 'c4', 'recon'];
    const throwType = kind === 'throw' ? req.utilType : (throwTypes.includes(kind) ? kind : null);
    if (throwType && u[throwType] > 0) {
      u[throwType] -= 1;
      const fxMsg = { t: 'demo_util_fx', kind: 'throw', utilType: throwType, origin: req.origin, dir: req.dir, ownerUid: uid, ownerTeam: p.team };
      applyDemolitionUtilityVisuals(fxMsg);
      broadcastGame(fxMsg);
      emitState();
      return { ok: true, action: throwType };
    }

    if (kind === 'breach' && u.breach > 0) {
      u.breach -= 1;
      const fxMsg = { t: 'demo_util_fx', kind: 'breach', pos: req.pos, normal: req.normal, panelId, ownerUid: uid, ownerTeam: p.team };
      applyDemolitionUtilityVisuals(fxMsg);
      broadcastGame(fxMsg);
      emitState();
      return { ok: true, action: 'breach' };
    }

    if (kind === 'barricade' && u.barricade > 0) {
      u.barricade -= 1;
      const fxMsg = { t: 'demo_util_fx', kind: 'barricade', pos: req.pos, yaw: req.yaw || 0, panelId };
      applyDemolitionUtilityVisuals(fxMsg);
      broadcastGame(fxMsg);
      emitState();
      return { ok: true, action: 'barricade' };
    }

    if ((kind === 'jump_pad' || kind === 'jumpPad') && u.jumpPad > 0) {
      u.jumpPad -= 1;
      const fxMsg = { t: 'demo_util_fx', kind: 'jump_pad', pos: req.pos };
      applyDemolitionUtilityVisuals(fxMsg);
      broadcastGame(fxMsg);
      emitState();
      return { ok: true, action: 'jump_pad' };
    }

    if (kind === 'grapple' && u.grapple > 0) {
      u.grapple -= 1;
      emitState();
      return { ok: true, action: 'grapple', remaining: u.grapple };
    }

    return { ok: false };
  }

  function useDemolitionUtility(req) {
    if (state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live' || !state.localAlive) return { ok: false };
    if (state.role === 'host') return hostHandleDemolitionUtility(state.localUid, req);
    if (state.role === 'client') {
      sendToHostGame({ t: 'demo_util', ...req });
      return { ok: true };
    }
    return { ok: false };
  }

  function botTryUseUtility(botUid, botPos, targetPos) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch || demoMatch.phase !== 'live') return false;
    const p = state.players.get(botUid);
    if (!p || !p.alive || !p.econ || !p.econ.utility) return false;
    const u = p.econ.utility;
    const order = ['smoke', 'flash', 'frag', 'molotov', 'recon'];
    const pick = order.find((k) => (u[k] || 0) > 0);
    if (!pick) return false;
    const dx = targetPos.x - botPos.x;
    const dy = (targetPos.y + 0.8) - (botPos.y + 1.5);
    const dz = targetPos.z - botPos.z;
    const len = Math.max(0.01, Math.hypot(dx, dy, dz));
    const origin = { x: botPos.x, y: botPos.y + 1.5, z: botPos.z };
    const dir = { x: dx / len, y: Math.min(0.45, dy / len + 0.16), z: dz / len };
    hostHandleDemolitionUtility(botUid, { kind: 'throw', utilType: pick, origin, dir });
    return true;
  }

  function hostHandleTacticalComm(uid, commId, pos) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5' || !demoMatch) return false;
    const p = state.players.get(uid);
    const DE = root.DemolitionEngine;
    if (!p || !DE) return false;
    const comm = (DE.TACTICAL_COMMS || []).find((c) => c.id === commId) || { id: commId || 'ping', label: 'PING', chat: 'Eyes here!' };
    demoMatch.teamOrders = demoMatch.teamOrders || {};
    demoMatch.teamOrders[p.team] = {
      commId: comm.id,
      pos: pos ? { x: pos.x, y: pos.y, z: pos.z } : null,
      atSec: performance.now() * 0.001,
      senderName: p.name
    };
    if (pos && root.UtilitySystem && typeof root.UtilitySystem.addTacticalPing === 'function') {
      root.UtilitySystem.addTacticalPing(pos, comm.label, p.team, p.name);
      broadcastGame({ t: 'demo_ping', pos, label: comm.label, team: p.team, senderName: p.name });
    }
    const sideTag = p.team === 'atk' ? '[ATK]' : '[DEF]';
    emitChatMessage(p.uid, `${sideTag} ${p.name}`, comm.chat, Boolean(p.isBot));
    return true;
  }

  function sendTacticalComm(commId, pos) {
    if (state.mode !== 'demolition_5v5' || !demoMatch) return false;
    if (state.role === 'host') return hostHandleTacticalComm(state.localUid, commId, pos);
    if (state.role === 'client') {
      sendToHostGame({ t: 'demo_comm', commId, pos });
      return true;
    }
    return false;
  }

  function botTacticalCallout(botUid, team, locName) {
    if (state.role !== 'host' || state.mode !== 'demolition_5v5') return;
    const bot = state.players.get(botUid);
    if (!bot || !bot.isBot) return;
    const localRec = state.players.get(state.localUid);
    // Only show teammate tactical callouts in chat so bots feel like real squad comms
    if (localRec && localRec.team !== team) return;
    const lines = [
      `one pushing ${locName}!`,
      `contact ${locName}, watch cross`,
      `spotted enemy ${locName}`,
      `heading ${locName}, back me up`
    ];
    const line = lines[Math.floor(Math.random() * lines.length)];
    emitChatMessage(bot.uid, `[TEAM] ${bot.name}`, line, true);
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

    // Demolition 5v5 round/buy/bomb/halftime timer loop
    if (state.mode === 'demolition_5v5' && demoMatch) {
      if (state.role === 'host') {
        const DE = root.DemolitionEngine;
        if (demoMatch.phase === 'buy') {
          demoMatch.phaseTimer = Math.max(0, demoMatch.phaseTimer - dt);
          if (demoMatch.phaseTimer === 0) {
            demoMatch.phase = 'live';
            demoMatch.phaseTimer = DE ? DE.RULES.ROUND_SEC : 115;
            state.phase = 'live';
            state.statusText = `DEMOLITION 5v5 · ROUND ${demoMatch.round} · LIVE`;
            if (root.TacticalMapCatalog && typeof root.TacticalMapCatalog.setBuyBarriersActive === 'function') {
              root.TacticalMapCatalog.setBuyBarriersActive(tacticalLevelData, false);
            }
            showBanner(`ROUND ${demoMatch.round} LIVE`, 'FIGHT!', 1300);
            if (root.WeaponAudio) root.WeaponAudio.roundHorn(false);
            broadcastGame({ t: 'demo_live', demo: serializeDemolitionSummary() });
            emitState();
          }
        } else if (demoMatch.phase === 'live') {
          // Local host attacker auto-picks up dropped bomb when walking near it
          const localRec = state.players.get(state.localUid);
          if (localRec && localRec.alive && localRec.team === 'atk' && demoMatch.bomb.state === 'dropped' && playerPose && DE) {
            if (DE.tryPickupBomb(demoMatch.bomb, state.localUid, 'atk', playerPose, 2.2)) {
              showBanner('BOMB ACQUIRED', 'HOLD E IN SITE A OR B TO PLANT', 1600);
              broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
              emitState();
            }
          }
          if (demoMatch.bomb.state === 'planted') {
            demoMatch.bomb.fuseTimer = Math.max(0, (demoMatch.bomb.fuseTimer || 0) - dt);
            if (demoMatch.bomb.fuseTimer === 0) {
              demoMatch.bomb.state = 'detonated';
              if (root.WeaponAudio && typeof root.WeaponAudio.playExplosion === 'function') root.WeaponAudio.playExplosion(true);
              if (root.DestructionSystem && typeof root.DestructionSystem.applyExplosion === 'function') {
                root.DestructionSystem.applyExplosion(demoMatch.bomb.pos, 16, 400);
              }
              hostConcludeDemolitionRound('atk', 'bomb_detonated');
            }
          } else {
            demoMatch.phaseTimer = Math.max(0, demoMatch.phaseTimer - dt);
            if (demoMatch.phaseTimer === 0) {
              hostConcludeDemolitionRound('def', 'time_expired');
            }
          }
        } else if (demoMatch.phase === 'post_round' || demoMatch.phase === 'halftime') {
          demoMatch.phaseTimer = Math.max(0, demoMatch.phaseTimer - dt);
          if (demoMatch.phaseTimer === 0 && DE) {
            DE.advanceToNextRound(demoMatch, Array.from(state.players.values()));
            hostStartDemolitionRound(false);
          }
        }

        // Compact 4Hz Demolition state sync to WebRTC peers
        demoSyncAccum += dt;
        if (demoSyncAccum >= 0.25 && hostPeers.size > 0) {
          demoSyncAccum = 0;
          broadcastGame({ t: 'demo_sync', phase: state.phase, demo: serializeDemolitionSummary(), players: serializePlayersList() });
        }
      } else if (state.role === 'client') {
        // Smooth local countdown interpolation between host sync ticks
        if (demoMatch.phase === 'buy' || (demoMatch.phase === 'live' && demoMatch.bomb.state !== 'planted') || demoMatch.phase === 'post_round' || demoMatch.phase === 'halftime') {
          demoMatch.phaseTimer = Math.max(0, (demoMatch.phaseTimer || 0) - dt);
        } else if (demoMatch.phase === 'live' && demoMatch.bomb.state === 'planted') {
          demoMatch.bomb.fuseTimer = Math.max(0, (demoMatch.bomb.fuseTimer || 0) - dt);
        }
      }
    }

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

  function getAliveTeammates() {
    if (state.mode !== 'demolition_5v5') return [];
    const localRec = state.players.get(state.localUid);
    if (!localRec) return [];
    const list = [];
    for (const p of state.players.values()) {
      if (p.uid !== state.localUid && p.alive && p.team === localRec.team) {
        list.push(p);
      }
    }
    return list;
  }

  function getPublicState() {
    const playersArr = serializePlayersList().sort((a, b) => (b.score - a.score) || (b.kills - a.kills));
    const localRec = state.players.get(state.localUid);
    const tally = state.mapVote.active
      ? computeVoteTally(state.mapVote.options, state.mapVote.votes, state.mapId)
      : { counts: {}, totalVotes: 0, winnerMapId: state.mapId };
    return {
      role: state.role,
      isArena: state.role !== 'none',
      isOnline: state.role === 'host' || state.role === 'client',
      isSoloDemolition: state.role === 'host' && state.mode === 'demolition_5v5' && !state.lobby,
      chatEnabled: isChatEnabled(),
      mapId: state.mapId,
      mode: state.mode,
      lobby: state.lobby,
      localUid: state.localUid,
      localName: state.localName,
      localTeam: (localRec && localRec.team) || '',
      localSquad: (localRec && localRec.squad) || '',
      localEcon: (localRec && localRec.econ) ? { ...localRec.econ, utility: { ...(localRec.econ.utility || {}) } } : null,
      statusText: state.statusText,
      phase: state.phase,
      round: demoMatch ? demoMatch.round : state.round,
      freezeTimer: state.freezeTimer,
      respawnTimer: state.respawnTimer,
      localHp: state.localHp,
      localAlive: state.localAlive,
      matchWinnerUid: state.matchWinnerUid,
      matchWinnerName: state.matchWinnerName,
      demolition: serializeDemolitionSummary(),
      deathBreakdown: lastLocalDeathBreakdown,
      mapVote: {
        active: Boolean(state.mapVote.active),
        options: state.mapVote.options.slice(),
        votes: { ...state.mapVote.votes },
        counts: tally.counts,
        totalVotes: tally.totalVotes,
        leadingMapId: tally.winnerMapId,
        winnerMapId: tally.winnerMapId,
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
    setTacticalLevelData: (built) => { tacticalLevelData = built || null; },
    getTacticalLevelData: () => tacticalLevelData,
    startSoloWarmup,
    startSoloDemolition,
    hostLobby,
    joinLobby,
    joinByCode,
    leaveSession,
    requestRematch,
    castMapVote,
    computeVoteTally,
    reportVoidFall,
    reportShot,
    reportPanelDamage,
    reportNukeLaunch,
    reportNukeDetonate,
    applyWarmupDamage,
    applyBotDamage,
    canBotDamageTarget,
    reportBotPose,
    reportBotShot,
    sendChatMessage,
    sendBotChatMessage,
    // Demolition 5v5 Tactical API
    buyDemolitionItem,
    selectDemolitionLoadout,
    dropLocalBomb,
    stepLocalBombAction,
    useDemolitionUtility,
    applyDemolitionAreaDamage,
    sendTacticalComm,
    botPickupBomb,
    stepBotBombAction,
    botTryUseUtility,
    botTacticalCallout,
    getDemolitionState: () => demoMatch,
    getLocalDeathBreakdown: () => lastLocalDeathBreakdown,
    getAliveTeammates,
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
