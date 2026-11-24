const test = require('node:test');
const assert = require('node:assert/strict');
const BotAISystem = require('../js/bot-ai.js');

// Helper: build an axis-aligned solid matching world.js OBB format (identity rotation)
function makeAxisAlignedSolid(cx, cy, cz, hx, hy, hz, opts = {}) {
  const inv = {
    elements: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -cx, -cy, -cz, 1
    ]
  };
  return {
    box: {
      min: { x: cx - hx, y: cy - hy, z: cz - hz },
      max: { x: cx + hx, y: cy + hy, z: cz + hz }
    },
    inv,
    half: { x: hx, y: hy, z: hz },
    q: { x: 0, y: 0, z: 0, w: 1 },
    isSurf: Boolean(opts.isSurf),
    surfNormal: opts.surfNormal || null
  };
}

test('resolveBotCapsuleCollision prevents bots from clipping through walls, floors, and boxes', () => {
  const floor = makeAxisAlignedSolid(0, -1, 0, 50, 1, 50); // top y = 0
  const wall = makeAxisAlignedSolid(0, 3, -5, 6, 3, 1);    // front face at z = -4

  // Bot running directly into the wall at z = -3.8 with inward velocity vz = -12, tangent vx = 5
  const pos = { x: 0, y: -0.1, z: -3.8 };
  const vel = { x: 5, y: -6, z: -12 };
  const contact = BotAISystem.resolveBotCapsuleCollision(pos, vel, [floor, wall], { radius: 0.42, skin: 0.015 }, false);

  assert.equal(contact.ground, true, 'bot should register floor ground contact');
  assert.equal(contact.wall, true, 'bot should register vertical wall contact');
  assert.ok(pos.y >= -0.01, `bot should be pushed out of floor (y=${pos.y})`);
  assert.ok(pos.z >= -4 + 0.42 - 0.02, `bot capsule must stay outside wall front face (z=${pos.z})`);
  assert.ok(vel.z >= -0.01, `inward wall velocity should be clipped (vz=${vel.z})`);
  assert.ok(Math.abs(vel.x - 5) < 0.01, `tangential wall velocity should be preserved (vx=${vel.x})`);
});

test('computeAdaptiveSkill scales smoothly with player K/D across TACTICAL -> APEX tiers', () => {
  const struggling = BotAISystem.computeAdaptiveSkill(0, 8);
  const even = BotAISystem.computeAdaptiveSkill(5, 5);
  const strong = BotAISystem.computeAdaptiveSkill(12, 3);
  const dominant = BotAISystem.computeAdaptiveSkill(25, 2);

  assert.equal(struggling.tier, 'TACTICAL');
  assert.equal(even.tier, 'VETERAN');
  assert.ok(strong.tier === 'PRO' || strong.tier === 'APEX');
  assert.equal(dominant.tier, 'APEX');

  assert.ok(struggling.scalar >= 0.72 && dominant.scalar <= 1.35, 'scalar stays within safe bounds');
  assert.ok(struggling.reactionSec >= 0.40, `TACTICAL reaction window should be human-fair (${struggling.reactionSec}s)`);
  assert.ok(dominant.aimTurnRate > even.aimTurnRate && even.aimTurnRate > struggling.aimTurnRate);
  assert.ok(dominant.reactionSec < even.reactionSec && even.reactionSec < struggling.reactionSec);
  assert.ok(dominant.hsChance > struggling.hsChance);
});

test('computeBotShotParams punishes stationary targets tightly while fast movement induces tracking slip', () => {
  const rifle = BotAISystem.resolveBotWeaponBuild('rifle');
  const skill = BotAISystem.computeAdaptiveSkill(4, 4);

  const still = BotAISystem.computeBotShotParams(rifle, skill, 0, 18, { botChrono: false, targetChrono: false, botAirborne: false });
  const surfingFast = BotAISystem.computeBotShotParams(rifle, skill, 24, 18, { botChrono: false, targetChrono: false, botAirborne: false });
  const chronoTarget = BotAISystem.computeBotShotParams(rifle, skill, 0, 18, { botChrono: false, targetChrono: true, botAirborne: false });
  const airRaw = BotAISystem.computeBotShotParams(rifle, skill, 4, 18, { botChrono: false, targetChrono: false, botAirborne: true });
  const airChrono = BotAISystem.computeBotShotParams(rifle, skill, 4, 18, { botChrono: true, targetChrono: false, botAirborne: true });
  const flinched = BotAISystem.computeBotShotParams(rifle, skill, 4, 18, { botChrono: false, targetChrono: false, botAirborne: false, flinchWeight: 1 });
  const calm = BotAISystem.computeBotShotParams(rifle, skill, 4, 18, { botChrono: false, targetChrono: false, botAirborne: false, flinchWeight: 0 });

  assert.ok(still.totalSpread < 0.01, `stationary target spread must be tight, not stormtrooper (${still.totalSpread})`);
  assert.ok(surfingFast.totalSpread > still.totalSpread * 3, 'fast perpendicular surf movement should challenge tracking');
  assert.ok(chronoTarget.hsProb > still.hsProb, 'Chrono-hanging opponents should draw higher headshot accuracy');
  assert.ok(chronoTarget.hsProb <= 0.35, `headshot probability should stay human-bounded (${chronoTarget.hsProb})`);
  assert.ok(airChrono.totalSpread < airRaw.totalSpread, 'bot personal Chrono should stabilize mid-air shots');
  assert.ok(flinched.totalSpread > calm.totalSpread, 'taking damage should induce aim flinch bloom');
});

test('all 4 bot archetypes resolve full player weapon damage and Apex Chrono Kits', () => {
  assert.equal(BotAISystem.BOT_ARCHETYPES.length, 4);
  for (let i = 0; i < 4; i++) {
    const arch = BotAISystem.getArchetype(i);
    const build = BotAISystem.resolveBotWeaponBuild(arch.weapon, arch.attachments);
    assert.ok(build.damageBody >= 18, `${arch.id} body damage must match real player weapon`);
    assert.ok(build.damageHead >= 32, `${arch.id} head damage must match real player weapon`);
    assert.equal(build.hasChronoKit, true, `${arch.id} must carry an Apex Chrono Kit`);
    assert.ok(build.chronoTimeScale > 0 && build.chronoTimeScale <= 0.35);
  }
  const awpBuild = BotAISystem.resolveBotWeaponBuild('awp', BotAISystem.getArchetype(2).attachments);
  assert.ok(awpBuild.damageHead >= 250, 'Marksman AWP headshots must be lethal 1-taps');
});

test('bot recordPlayerKill and recordPlayerDeath dynamically adapt session state', () => {
  BotAISystem.setDifficulty('adaptive');
  BotAISystem.resetAdaptiveStats();
  const base = BotAISystem.getAdaptiveState();
  for (let i = 0; i < 10; i++) BotAISystem.recordPlayerKill();
  const elevated = BotAISystem.getAdaptiveState();
  assert.ok(elevated.scalar > base.scalar);
  BotAISystem.resetAdaptiveStats();
  assert.equal(BotAISystem.getAdaptiveState().kills, 0);
});

test('adjustable bot difficulty levels scale cleanly from RECRUIT to APEX and award Gun XP', () => {
  const storeMap = new Map();
  const mockStorage = {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
    setItem: (k, v) => storeMap.set(k, String(v))
  };

  assert.equal(BotAISystem.DIFFICULTY_LEVELS.length, 6);
  const recruit = BotAISystem.setDifficulty('recruit', mockStorage);
  assert.equal(BotAISystem.getDifficulty(), 'recruit');
  assert.equal(mockStorage.getItem(BotAISystem.DIFFICULTY_STORAGE_KEY), 'recruit');

  const tactical = BotAISystem.setDifficulty('tactical', mockStorage);
  const veteran = BotAISystem.setDifficulty('veteran', mockStorage);
  const pro = BotAISystem.setDifficulty('pro', mockStorage);
  const apex = BotAISystem.setDifficulty('apex', mockStorage);

  assert.ok(recruit.reactionSec > tactical.reactionSec && tactical.reactionSec > veteran.reactionSec && veteran.reactionSec > pro.reactionSec && pro.reactionSec > apex.reactionSec);
  assert.ok(recruit.aimTurnRate < tactical.aimTurnRate && tactical.aimTurnRate < veteran.aimTurnRate && veteran.aimTurnRate < pro.aimTurnRate && pro.aimTurnRate < apex.aimTurnRate);

  const xpRecruit = BotAISystem.computeBotXpReward(8, 'recruit');
  const xpVeteran = BotAISystem.computeBotXpReward(8, 'veteran');
  const xpApex = BotAISystem.computeBotXpReward(8, 'apex');
  assert.equal(xpRecruit, 8);
  assert.ok(xpVeteran > xpRecruit && xpApex > xpVeteran);
  assert.ok(xpApex < 75, 'bot Gun XP remains below live human arena kill XP');

  // Restore default adaptive mode
  BotAISystem.setDifficulty('adaptive', mockStorage);
  assert.equal(BotAISystem.getDifficulty(), 'adaptive');
});
