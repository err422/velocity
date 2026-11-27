const test = require('node:test');
const assert = require('node:assert/strict');
const ChatSystem = require('../src/systems/chat/chatSystem.js');
const NetcodeSystem = require('../src/systems/combat/netcode.js');
const BotAISystem = require('../src/systems/bots/botAI.js');
const CombatSystem = require('../src/systems/combat/combatSystem.js');

global.NetcodeSystem = NetcodeSystem;
global.CombatSystem = CombatSystem;

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
  assert.equal(ChatSystem.classifyPlayerMessage("who's winning?"), 'score_query');
  assert.equal(ChatSystem.classifyPlayerMessage('my ping is broken'), 'excuse');
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

test('bot names are player-like and unique against existing names', () => {
  const first = BotAISystem.generatePlayerName([]);
  const second = BotAISystem.generatePlayerName([first]);
  assert.ok(first.length > 1 && first.length <= 24);
  assert.ok(second.length > 1 && second.length <= 24);
  assert.notEqual(first.toLowerCase(), second.toLowerCase());
});


test('rivalry assigns a grudge after three deaths to the same player and clears it on reset', () => {
  const originalGetWarmupBots = CombatSystem.getWarmupBots;
  const originalRandom = Math.random;
  const botUid = 'warmup_rivalry_test';
  try {
    Math.random = () => 0;
    CombatSystem.getWarmupBots = () => [
      { uid: botUid, name: 'VEX', botType: 0, alive: true }
    ];
    NetcodeSystem.startSoloWarmup('arena_aim', 'ffa_4p');
    for (let i = 0; i < 3; i++) {
      ChatSystem.handleGameEvent({
        type: 'player_killed_bot',
        botUid,
        botName: 'VEX',
        botType: 0,
        playerUid: 'local',
        playerName: 'Runner'
      });
    }

    const rivalry = ChatSystem.getBotRivalry(botUid);
    assert.equal(rivalry.deathsToPlayer, 3);
    assert.equal(rivalry.grudgeTargetUid, 'local');
    assert.equal(rivalry.mood, 'tilted');

    ChatSystem.resetMatchMemory('arena_aim');
    const fresh = ChatSystem.getBotRivalry(botUid);
    assert.equal(fresh.grudgeTargetUid, null);
    assert.equal(fresh.mood, 'neutral');
  } finally {
    Math.random = originalRandom;
    CombatSystem.getWarmupBots = originalGetWarmupBots;
    NetcodeSystem.leaveSession(true);
  }
});

test('a snapped three-round bot streak humbles the whole bot roster once per round', () => {
  const originalGetWarmupBots = CombatSystem.getWarmupBots;
  const originalRandom = Math.random;
  const bots = [
    { uid: 'round_bot_a', name: 'VEX', botType: 0, alive: true },
    { uid: 'round_bot_b', name: 'NOVA', botType: 1, alive: true }
  ];
  try {
    Math.random = () => 0;
    CombatSystem.getWarmupBots = () => bots;
    NetcodeSystem.startSoloWarmup('arena_aim', 'ffa_4p');
    for (let round = 1; round <= 3; round++) {
      ChatSystem.handleGameEvent({
        type: 'round_end',
        round,
        roundId: 'arena_aim:' + round,
        winnerUid: 'round_bot_a',
        winnerName: 'VEX',
        winnerIsBot: true
      });
    }
    // A duplicate event for the same round must not inflate the streak.
    ChatSystem.handleGameEvent({
      type: 'round_end',
      round: 3,
      roundId: 'arena_aim:3',
      winnerUid: 'round_bot_a',
      winnerName: 'VEX',
      winnerIsBot: true
    });
    ChatSystem.handleGameEvent({
      type: 'round_end',
      round: 4,
      roundId: 'arena_aim:4',
      winnerUid: 'local',
      winnerName: 'Runner',
      winnerIsBot: false
    });

    assert.equal(ChatSystem.getBotRivalry('round_bot_a').isHumbled, true);
    assert.equal(ChatSystem.getBotRivalry('round_bot_b').isHumbled, true);
  } finally {
    Math.random = originalRandom;
    CombatSystem.getWarmupBots = originalGetWarmupBots;
    NetcodeSystem.leaveSession(true);
  }
});
