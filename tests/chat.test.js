const test = require('node:test');
const assert = require('node:assert/strict');
const ChatSystem = require('../src/systems/chat/chatSystem.js');
const BotBanterEngine = require('../src/systems/chat/botBanterEngine.js');
const NetcodeSystem = require('../src/systems/combat/netcode.js');
const BotAISystem = require('../src/systems/bots/botAI.js');

function makeFixedRng(values) {
  let idx = 0;
  return () => {
    const v = values[idx % values.length];
    idx += 1;
    return v;
  };
}

test('chat messages are trimmed, flattened, and capped', () => {
  assert.equal(ChatSystem.sanitizeMessage('  hello\n   there\tfriend  '), 'hello there friend');
  assert.equal(ChatSystem.sanitizeMessage('x'.repeat(220)).length, ChatSystem.MAX_MESSAGE_LENGTH);
  assert.equal(ChatSystem.sanitizeMessage(' \n\t '), '');
});

test('player message classifier recognizes common chat intent', () => {
  assert.equal(ChatSystem.classifyPlayerMessage('yo whats up'), 'greeting');
  assert.equal(ChatSystem.classifyPlayerMessage('ggs nice shot'), 'gg');
  assert.equal(ChatSystem.classifyPlayerMessage('ez bot'), 'taunt');
  assert.equal(ChatSystem.classifyPlayerMessage('anyone ready?'), 'question');
  assert.equal(ChatSystem.classifyPlayerMessage('im rotating'), 'general');
});

test('solo arena chat emits local messages and rejects non-PvP sandbox mode', () => {
  const received = [];
  NetcodeSystem.setCallbacks({ onChatMessage: (message) => received.push(message) });
  NetcodeSystem.startSoloWarmup('arena_aim', 'ffa_4p');
  assert.equal(NetcodeSystem.sendChatMessage('hello arena'), true);
  assert.equal(received.length, 1);
  assert.equal(received[0].text, 'hello arena');
  assert.equal(received[0].isBot, false);

  NetcodeSystem.startSoloWarmup('sandbox', 'ffa_4p');
  assert.equal(NetcodeSystem.sendChatMessage('this should not send'), false);
  assert.equal(received.length, 1);
  NetcodeSystem.leaveSession(true);
});

test('bot names are player-like, balanced across the 3 chosen styles, and exclude TTV/clan tags', () => {
  const first = BotAISystem.generatePlayerName([]);
  const second = BotAISystem.generatePlayerName([first]);
  const third = BotAISystem.generatePlayerName([first, second]);
  assert.ok(first.length > 1 && first.length <= 24);
  assert.ok(second.length > 1 && second.length <= 24);
  assert.ok(third.length > 1 && third.length <= 24);
  assert.notEqual(first.toLowerCase(), second.toLowerCase());
  assert.notEqual(second.toLowerCase(), third.toLowerCase());
  assert.notEqual(first.toLowerCase(), third.toLowerCase());

  // 3 bots in a 4-player lobby should draw one from each chosen style (joke, normal, lazy_retro)
  const styles = new Set();
  for (const name of [first, second, third]) {
    for (const [style, pool] of Object.entries(BotAISystem.NAME_STYLE_POOLS)) {
      if (pool.includes(name)) styles.add(style);
    }
  }
  assert.equal(styles.size, 3);

  // None of the pool names should have TTV or bracket clan prefixes
  for (const name of BotAISystem.PLAYER_NAME_POOL) {
    assert.ok(!/\[.*\]|ttv/i.test(name), `unexpected clan/TTV tag in ${name}`);
    assert.ok(name.length >= 2 && name.length <= 24);
  }
});

test('every dialogue line in BotBanterEngine is slur-free while raw FPS profanity is allowed', () => {
  const allLines = BotBanterEngine.getAllDialogueLines();
  assert.ok(allLines.length >= 160, `expected rich dialogue bank, got ${allLines.length}`);
  for (const line of allLines) {
    assert.equal(BotBanterEngine.containsSlur(line), false, `slur guardrail triggered on: ${line}`);
    // Ensure no legacy nonsensical FFA team callouts remain
    assert.ok(!/someone check .*hp|dont let them reset/i.test(line), `legacy team callout found: ${line}`);
  }
  assert.equal(BotBanterEngine.containsSlur('get shit on dumbass'), false);
  assert.equal(BotBanterEngine.containsSlur('kys bro'), true);
});

test('local NLU detects rich player intents and resolves mentioned bot nicknames', () => {
  BotBanterEngine.clearAllProfiles();
  const roster = [
    { uid: 'ai_1', name: 'MicrowaveBurrito', botType: 0, alive: true },
    { uid: 'ai_2', name: 'tyler_04', botType: 1, alive: true },
    { uid: 'ai_3', name: 'xX_Sniper_Xx', botType: 2, alive: true }
  ];
  const state = {
    localUid: 'local_1',
    mapId: 'arena_aim',
    mode: 'ffa_4p',
    phase: 'live',
    players: [
      { uid: 'local_1', name: 'You', kills: 4, deaths: 5, score: 4, isBot: false },
      { uid: 'ai_1', name: 'MicrowaveBurrito', kills: 7, deaths: 2, score: 7, isBot: true },
      { uid: 'ai_2', name: 'tyler_04', kills: 3, deaths: 4, score: 3, isBot: true },
      { uid: 'ai_3', name: 'xX_Sniper_Xx', kills: 1, deaths: 6, score: 1, isBot: true }
    ]
  };

  assert.equal(BotBanterEngine.analyzePlayerMessage('are you guys bots?', roster, state).intent, 'bot_accusation');
  assert.equal(BotBanterEngine.analyzePlayerMessage('nice aimbot bro reported', roster, state).intent, 'hackusation');
  assert.equal(BotBanterEngine.analyzePlayerMessage('tyler stop camping in that corner', roster, state).intent, 'camping_salt');
  assert.equal(BotBanterEngine.analyzePlayerMessage('tyler stop camping in that corner', roster, state).mentionedBot.name, 'tyler_04');
  assert.equal(BotBanterEngine.analyzePlayerMessage('microwave awp crutch is so annoying', roster, state).intent, 'weapon_sniper');
  assert.equal(BotBanterEngine.analyzePlayerMessage('microwave awp crutch is so annoying', roster, state).mentionedBot.name, 'MicrowaveBurrito');
  assert.equal(BotBanterEngine.analyzePlayerMessage('vote courtyard not spire', roster, state).intent, 'map_talk');
  assert.equal(BotBanterEngine.analyzePlayerMessage('my ping is spiking so hard', roster, state).intent, 'lag_excuse');

  const botAccReply = BotBanterEngine.generatePlayerReply('are you guys actual bots?', 'You', roster, state, makeFixedRng([0.1, 0.2, 0.3]));
  assert.ok(botAccReply && botAccReply.primary && botAccReply.primary.text.length > 0);
  assert.equal(botAccReply.analysis.intent, 'bot_accusation');

  const directMentionReply = BotBanterEngine.generatePlayerReply('tyler youre trash stfu', 'You', roster, state, makeFixedRng([0.2, 0.5]));
  assert.equal(directMentionReply.primary.bot.name, 'tyler_04');
  assert.equal(directMentionReply.analysis.intent, 'direct_insult');
});

test('context-grounded combat events handle katana, void fall, domination, instant karma, and FFA sanity', () => {
  BotBanterEngine.clearAllProfiles();
  const roster = [
    { uid: 'ai_1', name: 'MicrowaveBurrito', botType: 0, alive: true },
    { uid: 'ai_2', name: 'tyler_04', botType: 1, alive: true },
    { uid: 'ai_3', name: 'idkman', botType: 2, alive: true }
  ];
  const state = {
    localUid: 'local_1',
    mapId: 'arena_surf',
    mode: 'ffa_4p',
    phase: 'live',
    players: [
      { uid: 'local_1', name: 'Runner', kills: 5, deaths: 4, score: 5, isBot: false },
      { uid: 'ai_1', name: 'MicrowaveBurrito', kills: 4, deaths: 3, score: 4, isBot: true },
      { uid: 'ai_2', name: 'tyler_04', kills: 2, deaths: 6, score: 2, isBot: true },
      { uid: 'ai_3', name: 'idkman', kills: 1, deaths: 7, score: 1, isBot: true }
    ]
  };

  // Katana kill draws sword/blade disbelief
  const katanaEv = BotBanterEngine.generateEventReaction({
    type: 'player_killed_bot',
    botUid: 'ai_1',
    botName: 'MicrowaveBurrito',
    playerName: 'Runner',
    weapon: 'katana',
    headshot: false,
    mapId: 'arena_surf',
    mode: 'ffa_4p'
  }, roster, state, makeFixedRng([0.05, 0.9]));
  assert.ok(katanaEv && katanaEv.primary);
  assert.match(katanaEv.primary.text, /sword|knife|katana|sliced|uninstall|clip/i);

  // Void fall triggers mockery when player falls
  const voidEv = BotBanterEngine.generateEventReaction({
    type: 'void_fall',
    victimUid: 'local_1',
    victimName: 'Runner',
    victimIsBot: false,
    mapId: 'arena_surf',
    mode: 'ffa_4p'
  }, roster, state, makeFixedRng([0.1, 0.2]));
  assert.ok(voidEv && voidEv.primary);
  assert.match(voidEv.primary.text, /void|gravity|floor|walked off|jump/i);

  // 3-0 domination triggers streak-specific trash talk
  BotBanterEngine.resetMatchMemory();
  for (let i = 0; i < 2; i++) {
    BotBanterEngine.generateEventReaction({
      type: 'bot_killed_player',
      botUid: 'ai_2',
      botName: 'tyler_04',
      victimUid: 'local_1',
      playerName: 'Runner',
      weapon: 'rifle',
      mapId: 'arena_surf',
      mode: 'ffa_4p'
    }, roster, state, makeFixedRng([0.4]));
  }
  const domEv = BotBanterEngine.generateEventReaction({
    type: 'bot_killed_player',
    botUid: 'ai_2',
    botName: 'tyler_04',
    victimUid: 'local_1',
    playerName: 'Runner',
    weapon: 'rifle',
    mapId: 'arena_surf',
    mode: 'ffa_4p'
  }, roster, state, makeFixedRng([0.0]));
  assert.ok(domEv && domEv.primary);
  assert.match(domEv.primary.text, /3-0|3 in a row|rent free|feeding|learn/i);

  // Instant karma: tyler_04 just talked trash and immediately dies -> another bot roasts him
  const karmaEv = BotBanterEngine.generateEventReaction({
    type: 'player_killed_bot',
    botUid: 'ai_2',
    botName: 'tyler_04',
    attackerUid: 'local_1',
    playerName: 'Runner',
    weapon: 'rifle',
    mapId: 'arena_surf',
    mode: 'ffa_4p'
  }, roster, state, makeFixedRng([0.1, 0.1, 0.1]));
  assert.ok(karmaEv && karmaEv.primary);
  assert.notEqual(karmaEv.primary.bot.uid, 'ai_2');
  assert.match(karmaEv.primary.text, /karma|talked|milk|typing|talking/i);

  // Low HP without an identified attacker returns null (no nonsensical team callout)
  const lowNoAttacker = BotBanterEngine.generateEventReaction({
    type: 'player_low_health',
    botUid: null,
    botName: '',
    playerName: 'Runner',
    mode: 'ffa_4p'
  }, roster, state, makeFixedRng([0.1]));
  assert.equal(lowNoAttacker, null);
});

test('bots choose map votes grounded in preferences and generate post-match vote arguments', () => {
  BotBanterEngine.clearAllProfiles();
  const bot = { uid: 'ai_vote_1', name: 'MicrowaveBurrito', botType: 0, alive: true };
  const bot2 = { uid: 'ai_vote_2', name: 'idkman', botType: 1, alive: true };
  const prof = BotBanterEngine.getBotProfile(bot);
  const fav = prof.favoriteMaps[0];
  const hated = prof.hatedMaps.find((m) => m !== fav) || 'arena_canyon';
  const third = BotBanterEngine.ARENA_IDS.find((m) => m !== fav && m !== hated) || 'arena_cargo';
  const options = [hated, fav, third];

  // Bot should strongly pick its favorite map over its hated map
  const picked = BotBanterEngine.chooseBotMapVote(bot, options, hated, { winnerUid: 'someone_else', votes: {} }, makeFixedRng([0.5, 0.5, 0.5]));
  assert.equal(picked, fav);

  // Post-match event produces verdict + optional second bot follow-up
  const roster = [bot, bot2];
  const matchOverEv = BotBanterEngine.generateEventReaction({
    type: 'match_over',
    winnerUid: bot.uid,
    winnerName: bot.name,
    mapId: hated,
    mode: 'ffa_4p',
    options
  }, roster, { localUid: 'local_1', mapId: hated, phase: 'match_over', players: roster }, makeFixedRng([0.1, 0.2, 0.3]));
  assert.ok(matchOverEv && matchOverEv.primary && matchOverEv.primary.text.length > 0);
  assert.ok(matchOverEv.followUp && matchOverEv.followUp.bot.uid === bot2.uid);

  // Human map vote triggers an immediate bot reaction
  const voteReact = BotBanterEngine.generateEventReaction({
    type: 'map_vote_cast',
    voterUid: 'local_1',
    voterName: 'You',
    voterIsBot: false,
    mapId: hated,
    options,
    votes: { local_1: hated }
  }, roster, { localUid: 'local_1', mapId: third, phase: 'match_over', players: roster }, makeFixedRng([0.1, 0.1]));
  assert.ok(voteReact && voteReact.primary && voteReact.primary.text.length > 0);
});
