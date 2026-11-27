const test = require('node:test');
const assert = require('node:assert/strict');
const ChatSystem = require('../src/systems/chat/chatSystem.js');
const NetcodeSystem = require('../src/systems/combat/netcode.js');
const BotAISystem = require('../src/systems/bots/botAI.js');

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

test('bot names are player-like and unique against existing names', () => {
  const first = BotAISystem.generatePlayerName([]);
  const second = BotAISystem.generatePlayerName([first]);
  assert.ok(first.length > 1 && first.length <= 24);
  assert.ok(second.length > 1 && second.length <= 24);
  assert.notEqual(first.toLowerCase(), second.toLowerCase());
});
