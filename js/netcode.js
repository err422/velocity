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
  const DUEL_FREEZE_SEC = 2.2;
  const DUEL_POST_ROUND_SEC = 2.4;

  const state = {
    role: 'none', // 'none' | 'warmup' | 'host' | 'client'
    mapId: 'arena_aim',
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
    players: new Map(), // uid -> { uid, name, hp, alive, score, kills, deaths, spawnIdx, slot }
    killFeed: [] // { id, killer, victim, weapon, headshot, ts }
  };

  // WebRTC handles
  const hostPeers = new Map(); // peerUid -> { pc, poseCh, gameCh, displayName, offerApplied, candSet }
  let clientPc = null;
  let clientPoseCh = null;
  let clientGameCh = null;
  let clientAnswerApplied = false;
  const clientCandSet = new Set();

  let unsubPeers = null;
  let unsubMyPeer = null;
  let heartbeatTimer = null;
  let roundTimeout = null;
  let poseAccum = 0;
  let feedSeq = 1;
  let arenaSpawns = [];

  // UI/Engine callbacks
  const callbacks = {
    onStateChange: null,
    onKillFeed: null,
    onBanner: null,
    onMatchEnd: null,
    onLocalDamage: null,
    onLocalRespawn: null,
    onRemoteTracer: null,
    onLeave: null
  };

  function emitState() {
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(getPublicState());
    }
  }

  function pushKillFeed(killer, victim, weapon, headshot) {
    const entry = {
      id: feedSeq++,
      killer: String(killer || 'Unknown').slice(0, 24),
      victim: String(victim || 'Unknown').slice(0, 24),
      weapon: String(weapon || 'rifle').toUpperCase(),
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
    clientCandSet.clear();
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
        slot: 'rifle'
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
        slot: p.slot
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
    const count = Math.max(1, Math.min(state.lobby.maxPlayers || 4, state.players.size));
    const status = state.phase === 'live' || state.phase === 'countdown' ? 'in_progress' : 'open';
    root.DailyBackend.updateLobby(state.lobby.lobbyId, { playerCount: count, status }).catch(() => {});
  }

  function broadcastFullSnapshot() {
    if (state.role !== 'host') return;
    broadcastGame({
      t: 'snapshot',
      mode: state.mode,
      mapId: state.mapId,
      phase: state.phase,
      round: state.round,
      freezeTimer: state.freezeTimer,
      matchWinnerUid: state.matchWinnerUid,
      matchWinnerName: state.matchWinnerName,
      players: serializePlayersList()
    });
  }

  // ---------- Host-Authoritative Match Loop ----------
  function hostStartRoundOrMatch(resetScores) {
    if (state.role !== 'host') return;
    if (roundTimeout) {
      clearTimeout(roundTimeout);
      roundTimeout = null;
    }
    if (resetScores) {
      state.round = 1;
      state.matchWinnerUid = null;
      state.matchWinnerName = '';
      for (const [, p] of state.players) {
        p.score = 0;
        p.kills = 0;
        p.deaths = 0;
      }
    }

    // Check if at least 2 live humans are in the arena
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
      p.spawnIdx = (idx + (state.round - 1)) % Math.max(2, arenaSpawns.length);
      spawnAssignments[uid] = p.spawnIdx;
      idx++;
      if (uid !== state.localUid && root.CombatSystem) {
        const sp = getSpawnForIndex(p.spawnIdx);
        root.CombatSystem.upsertRemoteAvatar(uid, {
          name: p.name,
          x: sp.x,
          y: sp.y,
          z: sp.z,
          yaw: sp.yaw || 0,
          hp: 100,
          alive: true,
          snap: true
        });
      }
    }

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
    emitState();
  }

  function hostResolveDamage(attackerUid, victimUid, damage, slot, isHeadshot) {
    if (state.role !== 'host') return;
    if (state.phase !== 'live') return;
    const attacker = state.players.get(attackerUid);
    const victim = state.players.get(victimUid);
    if (!attacker || !victim || !victim.alive || attackerUid === victimUid) return;

    const cleanDmg = Math.max(1, Math.min(260, Math.round(Number(damage) || 0)));
    victim.hp = Math.max(0, victim.hp - cleanDmg);
    const killed = victim.hp <= 0;

    if (killed) {
      victim.alive = false;
      victim.deaths += 1;
      attacker.kills += 1;
      if (state.mode === 'ffa_4p') {
        attacker.score = attacker.kills;
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
      players: serializePlayersList()
    };
    broadcastGame(dmgPacket);
    applyDamageEventLocally(dmgPacket);

    if (!killed) return;

    // Handle Match / Round progression
    if (state.mode === 'duel_1v1') {
      const scoreMap = {};
      for (const [uid, pl] of state.players) scoreMap[uid] = pl.score;
      const duelEval = root.CombatSystem
        ? root.CombatSystem.evaluateDuelRoundResult(scoreMap, attackerUid, DUEL_WIN_ROUNDS)
        : { scores: { ...scoreMap, [attackerUid]: (scoreMap[attackerUid] || 0) + 1 }, isMatchOver: (attacker.score + 1) >= DUEL_WIN_ROUNDS };
      attacker.score = duelEval.scores[attackerUid] || (attacker.score + 1);
      state.phase = 'round_over';

      if (duelEval.isMatchOver) {
        state.phase = 'match_over';
        state.matchWinnerUid = attacker.uid;
        state.matchWinnerName = attacker.name;
        broadcastGame({
          t: 'match_over',
          winnerUid: attacker.uid,
          winnerName: attacker.name,
          mode: state.mode,
          players: serializePlayersList()
        });
        handleMatchOverLocally(attacker.uid, attacker.name);
      } else {
        const bannerSub = `${attacker.name} TAKES ROUND ${state.round}`;
        broadcastGame({
          t: 'round_won',
          winnerUid: attacker.uid,
          winnerName: attacker.name,
          round: state.round,
          players: serializePlayersList()
        });
        showBanner(`${attacker.name} WINS ROUND`, bannerSub, 2200);
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
        : { isMatchOver: attacker.kills >= FFA_WIN_KILLS };
      if (ffaEval.isMatchOver) {
        state.phase = 'match_over';
        state.matchWinnerUid = attacker.uid;
        state.matchWinnerName = attacker.name;
        broadcastGame({
          t: 'match_over',
          winnerUid: attacker.uid,
          winnerName: attacker.name,
          mode: state.mode,
          players: serializePlayersList()
        });
        handleMatchOverLocally(attacker.uid, attacker.name);
      } else {
        setTimeout(() => {
          if (state.role !== 'host' || state.phase !== 'live') return;
          const v = state.players.get(victimUid);
          if (!v || v.alive) return;
          v.hp = 100;
          v.alive = true;
          v.spawnIdx = Math.floor(Math.random() * Math.max(1, arenaSpawns.length));
          const sp = getSpawnForIndex(v.spawnIdx);
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
              x: sp.x, y: sp.y, z: sp.z, yaw: sp.yaw || 0, hp: 100, alive: true, snap: true
            });
          }
          emitState();
        }, FFA_RESPAWN_SEC * 1000);
      }
    }
  }

  function applyDamageEventLocally(pkt) {
    if (Array.isArray(pkt.players)) {
      applyPlayersSnapshot(pkt.players);
    }
    if (pkt.victimUid === state.localUid) {
      state.localHp = pkt.hp;
      state.localAlive = pkt.alive;
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
    if (pkt.attackerUid === state.localUid && pkt.killed && root.CombatSystem) {
      root.CombatSystem.triggerHitmarker(pkt.headshot, true);
    }
    if (pkt.killed) {
      pushKillFeed(pkt.attackerName, pkt.victimName, pkt.slot, pkt.headshot);
    }
    emitState();
  }

  function handleMatchOverLocally(winnerUid, winnerName) {
    state.phase = 'match_over';
    state.matchWinnerUid = winnerUid;
    state.matchWinnerName = winnerName;
    const isLocalWinner = winnerUid === state.localUid;
    showBanner(
      isLocalWinner ? 'VICTORY' : `${winnerName.toUpperCase()} WINS`,
      state.mode === 'duel_1v1' ? '1v1 DUEL COMPLETE' : 'FREE-FOR-ALL COMPLETE',
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
      if (item.uid === state.localUid) {
        state.localHp = item.hp;
        state.localAlive = item.alive;
      } else if (root.CombatSystem) {
        root.CombatSystem.upsertRemoteAvatar(item.uid, {
          name: item.name,
          hp: item.hp,
          alive: item.alive,
          slot: item.slot
        });
      }
    }
    for (const uid of Array.from(state.players.keys())) {
      if (!incomingIds.has(uid)) {
        state.players.delete(uid);
        if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(uid);
      }
    }
  }

  // ---------- Host Handling of Incoming Peer Messages ----------
  function onHostGameMessage(peerUid, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || !msg.t) return;

    if (msg.t === 'hello') {
      ensurePlayerRecord(peerUid, msg.name || 'Runner');
      if (state.players.size >= 2 && state.phase === 'warmup') {
        hostStartRoundOrMatch(true);
      } else {
        broadcastFullSnapshot();
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

    if (msg.t === 'rematch_request' && state.phase === 'match_over') {
      hostStartRoundOrMatch(true);
    }
  }

  function onHostPoseMessage(peerUid, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || typeof msg.x !== 'number') return;
    const rec = state.players.get(peerUid);
    if (rec && msg.slot) rec.slot = msg.slot;
    if (root.CombatSystem) {
      root.CombatSystem.upsertRemoteAvatar(peerUid, {
        name: rec ? rec.name : 'Player',
        x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle'
      });
    }
    // Fan out pose to all other peers in star topology
    broadcastPose({
      t: 'p',
      uid: peerUid,
      x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle'
    }, peerUid);
  }

  // ---------- Client Handling of Host Messages ----------
  function onClientGameMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }
    if (!msg || !msg.t) return;

    if (msg.t === 'snapshot') {
      state.mode = msg.mode || state.mode;
      state.phase = msg.phase || 'warmup';
      state.round = msg.round || 1;
      state.freezeTimer = msg.freezeTimer || 0;
      state.matchWinnerUid = msg.matchWinnerUid || null;
      state.matchWinnerName = msg.matchWinnerName || '';
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
      handleMatchOverLocally(msg.winnerUid, msg.winnerName);
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
    if (root.CombatSystem) {
      root.CombatSystem.upsertRemoteAvatar(msg.uid, {
        name: rec ? rec.name : 'Player',
        x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw || 0, slot: msg.slot || 'rifle'
      });
    }
  }

  // ---------- Host Peer Negotiation ----------
  async function hostHandlePeerDoc(peerDoc) {
    if (state.role !== 'host' || !state.lobby || !peerDoc || !peerDoc.peerUid) return;
    const peerUid = peerDoc.peerUid;
    if (peerUid === state.localUid) return;

    let entry = hostPeers.get(peerUid);
    if (!entry) {
      // Respect maxPlayers cap
      if (state.players.size >= (state.lobby.maxPlayers || 2)) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      entry = {
        pc,
        poseCh: null,
        gameCh: null,
        displayName: peerDoc.displayName || 'Player',
        offerApplied: false,
        candSet: new Set(),
        answerCandidates: []
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
            ensurePlayerRecord(peerUid, entry.displayName);
            if (state.players.size >= 2 && state.phase === 'warmup') {
              hostStartRoundOrMatch(true);
            } else {
              broadcastFullSnapshot();
              syncLobbyMetaNow();
              emitState();
            }
          };
          ch.onmessage = (m) => onHostGameMessage(peerUid, m.data);
          ch.onclose = () => hostRemovePeer(peerUid);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          hostRemovePeer(peerUid);
        }
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && entry.answerCandidates.length < 30) {
          entry.answerCandidates.push(JSON.stringify(ev.candidate.toJSON()));
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

        await root.DailyBackend.writePeerAnswer(
          state.lobby.lobbyId,
          peerUid,
          entry.pc.localDescription ? entry.pc.localDescription.sdp : answer.sdp,
          entry.answerCandidates
        );
      } catch (err) {
        console.warn('Host WebRTC answer error:', err);
        hostRemovePeer(peerUid);
        return;
      }
    }

    // Apply any newly received offer ICE candidates
    if (entry.offerApplied && Array.isArray(peerDoc.offerCandidates)) {
      for (const rawC of peerDoc.offerCandidates) {
        if (entry.candSet.has(rawC)) continue;
        entry.candSet.add(rawC);
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(rawC)));
        } catch (_) {}
      }
    }
  }

  function hostRemovePeer(peerUid) {
    const entry = hostPeers.get(peerUid);
    if (entry) {
      try { entry.poseCh && entry.poseCh.close(); } catch (_) {}
      try { entry.gameCh && entry.gameCh.close(); } catch (_) {}
      try { entry.pc && entry.pc.close(); } catch (_) {}
      hostPeers.delete(peerUid);
    }
    state.players.delete(peerUid);
    if (root.CombatSystem) root.CombatSystem.removeRemoteAvatar(peerUid);
    if (state.lobby && root.DailyBackend) {
      root.DailyBackend.deletePeerDoc(state.lobby.lobbyId, peerUid).catch(() => {});
    }
    if (state.players.size < 2 && state.role === 'host') {
      hostStartRoundOrMatch(false);
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
    state.mapId = mapId === 'arena_surf' ? 'arena_surf' : 'arena_aim';
    state.mode = mode === 'ffa_4p' ? 'ffa_4p' : 'duel_1v1';
    state.lobby = null;
    state.localUid = id.uid;
    state.localName = id.name;
    state.phase = 'warmup';
    state.statusText = 'SOLO WARMUP · HOLOGRAM BOTS';
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

    leaveSession(true);
    state.role = 'client';
    state.mapId = lobby.mapId;
    state.mode = lobby.mode;
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

    clientPoseCh = pc.createDataChannel('pose', { ordered: false, maxRetransmits: 0 });
    clientGameCh = pc.createDataChannel('game', { ordered: true });

    clientPoseCh.onmessage = (m) => onClientPoseMessage(m.data);
    clientGameCh.onopen = () => {
      state.statusText = `CONNECTED · ${lobby.roomName.toUpperCase()}`;
      sendToHostGame({ t: 'hello', uid: state.localUid, name: state.localName });
      emitState();
    };
    clientGameCh.onmessage = (m) => onClientGameMessage(m.data);
    clientGameCh.onclose = () => {
      if (state.role === 'client') {
        showBanner('HOST DISCONNECTED', 'RETURNING TO WARMUP', 2400);
        startSoloWarmup(state.mapId, state.mode);
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && offerCandidates.length < 30) {
        offerCandidates.push(JSON.stringify(ev.candidate.toJSON()));
        if (clientAnswerApplied === false && offerCandidates.length % 3 === 0) {
          root.DailyBackend.updatePeerOfferCandidates(lobby.lobbyId, offerCandidates).catch(() => {});
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Gather initial STUN candidates briefly before writing offer
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const timer = setTimeout(finish, 1100);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          finish();
        }
      };
    });

    await root.DailyBackend.writePeerOffer(
      lobby.lobbyId,
      lobby.hostUid,
      pc.localDescription ? pc.localDescription.sdp : offer.sdp,
      offerCandidates
    );

    unsubMyPeer = root.DailyBackend.subscribePeerDoc(lobby.lobbyId, state.localUid, async (peerDoc) => {
      if (!peerDoc || state.role !== 'client' || !clientPc) return;
      if (!clientAnswerApplied && peerDoc.answerSdp) {
        clientAnswerApplied = true;
        try {
          await clientPc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: peerDoc.answerSdp }));
        } catch (err) {
          console.warn('Client setRemoteDescription error:', err);
        }
      }
      if (clientAnswerApplied && Array.isArray(peerDoc.answerCandidates)) {
        for (const rawC of peerDoc.answerCandidates) {
          if (clientCandSet.has(rawC)) continue;
          clientCandSet.add(rawC);
          try {
            await clientPc.addIceCandidate(new RTCIceCandidate(JSON.parse(rawC)));
          } catch (_) {}
        }
      }
    });

    return lobby;
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
      hostStartRoundOrMatch(true);
    } else if (state.role === 'client') {
      sendToHostGame({ t: 'rematch_request' });
    }
  }

  // ---------- Gameplay Hooks Called From Player/Main ----------
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
      slot: shotResult.slot,
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
      slot: pose.slot || 'rifle'
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
    return {
      role: state.role,
      isArena: state.role !== 'none',
      isOnline: state.role === 'host' || state.role === 'client',
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

  root.NetcodeSystem = {
    setCallbacks: (cbs) => Object.assign(callbacks, cbs || {}),
    setArenaSpawns,
    startSoloWarmup,
    hostLobby,
    joinLobby,
    joinByCode,
    leaveSession,
    requestRematch,
    reportShot,
    update,
    pushWarmupKill: (botName, weapon, headshot) => pushKillFeed(state.localName || 'You', botName, weapon, headshot),
    getState: getPublicState
  };
})(typeof window !== 'undefined' ? window : globalThis);
