

const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch (_) {
    return false;
  }
})();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080f19);
scene.fog = new THREE.FogExp2(0x080f19, 0.0038);
const camera = new THREE.PerspectiveCamera(85, innerWidth/innerHeight, .08, 700);
const renderer = new THREE.WebGLRenderer({antialias:!isSoftwareGl, powerPreference:'high-performance'});
renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = !isSoftwareGl;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0x9bdcff,0x18202b,1.35);
scene.add(hemiLight);
const sun = new THREE.DirectionalLight(0xc5eaff,2.1);
sun.position.set(-45,75,30); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-110;sun.shadow.camera.right=110;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;
scene.add(sun);scene.add(sun.target);
const cyan = new THREE.MeshStandardMaterial({color:0x27c9e8,emissive:0x08758e,emissiveIntensity:1.1,roughness:.35,metalness:.25});
const orange = new THREE.MeshStandardMaterial({color:0xff914d,emissive:0x9b3c12,emissiveIntensity:.85,roughness:.4});
const dark = new THREE.MeshStandardMaterial({color:0x182634,roughness:.82,metalness:.35});
const concrete = new THREE.MeshStandardMaterial({color:0x354656,roughness:.9});
const floorMat = new THREE.MeshStandardMaterial({color:0x111c28,roughness:.94});
const surfUnderMat = new THREE.MeshStandardMaterial({color:0x0f1a26,roughness:.88,metalness:.3});

function buildProceduralSurfTexture(opts){
  const o = opts || {};
  const size = isSoftwareGl ? 256 : 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const s = size / 512;

  const bg = ctx.createLinearGradient(0, 0, size, 0);
  bg.addColorStop(0, o.bg0 || '#132231');
  bg.addColorStop(0.5, o.bg1 || '#1a2e42');
  bg.addColorStop(1, o.bg2 || '#12202e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle surface grain / sandstone / frost streaks
  if (o.grain) {
    ctx.fillStyle = o.grain;
    for (let i = 0; i < 42; i++) {
      const y = ((i * 73) % 512) * s;
      const h = (4 + (i % 9) * 2) * s;
      ctx.fillRect(0, y, size, h);
    }
  }

  // Structural panel grid
  ctx.strokeStyle = o.grid || 'rgba(101, 231, 255, 0.14)';
  ctx.lineWidth = Math.max(1, 2 * s);
  const step = 64 * s;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Directional flow chevrons (+y on canvas = +Z forward along ramp)
  ctx.strokeStyle = o.chevron || 'rgba(101, 231, 255, 0.42)';
  ctx.lineWidth = Math.max(2, 7 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let row = 0; row < 4; row++) {
    const cy = (row * 128 + 46) * s;
    for (let col = 0; col < 2; col++) {
      const cx = (col * 256 + 128) * s;
      ctx.beginPath();
      ctx.moveTo(cx - 56 * s, cy - 18 * s);
      ctx.lineTo(cx, cy + 28 * s);
      ctx.lineTo(cx + 56 * s, cy - 18 * s);
      ctx.stroke();
    }
  }

  // Edge speed rails
  ctx.fillStyle = o.rail || 'rgba(101, 231, 255, 0.24)';
  const railW = Math.max(2, 9 * s);
  ctx.fillRect(0, 0, railW, size);
  ctx.fillRect(size - railW, 0, railW, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const surfTexture = buildProceduralSurfTexture();
const surfMat = new THREE.MeshStandardMaterial({
  map: surfTexture,
  color: 0xdff6ff,
  roughness: 0.42,
  metalness: 0.25
});

const SURF_THEME_SPECS = {
  slate: {
    name: 'Skyline Slate',
    bgHex: 0x080f19,
    fogDensity: 0.0034,
    hemiSky: 0x9bdcff,
    hemiGround: 0x18202b,
    hemiInt: 1.35,
    sunColor: 0xc5eaff,
    sunInt: 2.1,
    rampTex: { bg0:'#132231', bg1:'#1a2e42', bg2:'#12202e', grid:'rgba(101,231,255,0.14)', chevron:'rgba(101,231,255,0.42)', rail:'rgba(101,231,255,0.24)' },
    rampColor: 0xdff6ff, rampRough: 0.42, rampMetal: 0.25, rampOpacity: 1,
    deckColor: 0x354656, darkColor: 0x182634, underColor: 0x0f1a26,
    accentHex: 0x27c9e8, accentEmissive: 0x08758e, lipHex: 0xff914d, lipEmissive: 0x9b3c12
  },
  sandstone: {
    name: 'Utopia Sandstone',
    bgHex: 0x1a1418,
    fogDensity: 0.0028,
    hemiSky: 0xffd7a8,
    hemiGround: 0x3b261b,
    hemiInt: 1.45,
    sunColor: 0xffe0b2,
    sunInt: 2.35,
    rampTex: { bg0:'#7a573d', bg1:'#966c4b', bg2:'#704f37', grain:'rgba(255,222,175,0.06)', grid:'rgba(255,214,158,0.18)', chevron:'rgba(255,180,84,0.52)', rail:'rgba(255,168,76,0.34)' },
    rampColor: 0xfff0dc, rampRough: 0.62, rampMetal: 0.08, rampOpacity: 1,
    deckColor: 0x6e5340, darkColor: 0x3a2a22, underColor: 0x2c1f19,
    accentHex: 0xffb35c, accentEmissive: 0x8f4510, lipHex: 0x4be3ff, lipEmissive: 0x0a6c82
  },
  kitsune: {
    name: 'Kitsune Neon Obsidian',
    bgHex: 0x0d1022,
    fogDensity: 0.0024,
    hemiSky: 0x9ecaff,
    hemiGround: 0x2b1736,
    hemiInt: 1.75,
    sunColor: 0xe2ecff,
    sunInt: 2.35,
    rampTex: { bg0:'#1a2036', bg1:'#252e4d', bg2:'#171c30', grid:'rgba(255,72,140,0.28)', chevron:'rgba(88,246,255,0.72)', rail:'rgba(255,74,142,0.68)' },
    rampColor: 0xf0f7ff, rampRough: 0.28, rampMetal: 0.36, rampOpacity: 1,
    deckColor: 0x283047, darkColor: 0x161b2c, underColor: 0x111524,
    accentHex: 0xff4788, accentEmissive: 0xd11b5d, lipHex: 0x52f4ff, lipEmissive: 0x1096b5
  },
  boreas: {
    name: 'Boreas Glacial Glass',
    bgHex: 0x1f3548,
    fogDensity: 0.0026,
    hemiSky: 0xe6f7ff,
    hemiGround: 0x354d61,
    hemiInt: 1.7,
    sunColor: 0xf4fbff,
    sunInt: 2.35,
    rampTex: { bg0:'#4e86a0', bg1:'#7cc1dc', bg2:'#477d96', grain:'rgba(255,255,255,0.09)', grid:'rgba(224,250,255,0.32)', chevron:'rgba(255,255,255,0.66)', rail:'rgba(154,244,255,0.56)' },
    rampColor: 0xe2f9ff, rampRough: 0.16, rampMetal: 0.18, rampOpacity: 0.86,
    deckColor: 0x89a4b8, darkColor: 0x2f4659, underColor: 0x24394b,
    accentHex: 0x7ef2ff, accentEmissive: 0x1f8fa8, lipHex: 0xffad60, lipEmissive: 0x994214
  },
  prism: {
    name: 'Prism Crystalline Vault',
    bgHex: 0x16112b,
    fogDensity: 0.0026,
    hemiSky: 0xd1c2ff,
    hemiGround: 0x291d42,
    hemiInt: 1.65,
    sunColor: 0xede3ff,
    sunInt: 2.25,
    rampTex: { bg0:'#2f2356', bg1:'#48367c', bg2:'#2a204d', grain:'rgba(235,212,255,0.07)', grid:'rgba(196,158,255,0.28)', chevron:'rgba(255,218,122,0.62)', rail:'rgba(180,140,255,0.54)' },
    rampColor: 0xf4ecff, rampRough: 0.22, rampMetal: 0.34, rampOpacity: 0.9,
    deckColor: 0x423766, darkColor: 0x221b3d, underColor: 0x191330,
    accentHex: 0xc290ff, accentEmissive: 0x6f32cc, lipHex: 0xffcf66, lipEmissive: 0xb07110
  },
  void: {
    name: 'Sinsane Obsidian Ember',
    bgHex: 0x181018,
    fogDensity: 0.0025,
    hemiSky: 0xffb894,
    hemiGround: 0x2c171f,
    hemiInt: 1.75,
    sunColor: 0xffd6b5,
    sunInt: 2.4,
    rampTex: { bg0:'#2b2026', bg1:'#3e2c34', bg2:'#251b21', grain:'rgba(255,126,82,0.07)', grid:'rgba(255,132,84,0.28)', chevron:'rgba(255,168,82,0.68)', rail:'rgba(255,98,66,0.58)' },
    rampColor: 0xfff1eb, rampRough: 0.32, rampMetal: 0.38, rampOpacity: 1,
    deckColor: 0x423038, darkColor: 0x241920, underColor: 0x1a1217,
    accentHex: 0xff7547, accentEmissive: 0xc93010, lipHex: 0x62ebff, lipEmissive: 0x1289a8
  }
};

const _surfThemeCache = new Map();
function getSurfTheme(themeId, isPreview){
  const key = SURF_THEME_SPECS[themeId] ? themeId : 'slate';
  const cacheKey = isPreview ? ('preview:' + key) : key;
  if (_surfThemeCache.has(cacheKey)) return _surfThemeCache.get(cacheKey);
  const spec = SURF_THEME_SPECS[key];
  const tex = (!isPreview && key === 'slate') ? surfTexture : buildProceduralSurfTexture(spec.rampTex);
  const rampMat = (!isPreview && key === 'slate') ? surfMat : new THREE.MeshStandardMaterial({
    map: tex,
    color: spec.rampColor,
    roughness: spec.rampRough,
    metalness: spec.rampMetal,
    transparent: spec.rampOpacity < 0.99,
    opacity: spec.rampOpacity
  });
  const deckMat = (!isPreview && key === 'slate') ? concrete : new THREE.MeshStandardMaterial({ color: spec.deckColor, roughness: 0.86, metalness: 0.12 });
  const structMat = (!isPreview && key === 'slate') ? dark : new THREE.MeshStandardMaterial({ color: spec.darkColor, roughness: 0.80, metalness: 0.30 });
  const underMat = (!isPreview && key === 'slate') ? surfUnderMat : new THREE.MeshStandardMaterial({ color: spec.underColor, roughness: 0.84, metalness: 0.26 });
  const accentMat = (!isPreview && key === 'slate') ? cyan : new THREE.MeshStandardMaterial({ color: spec.accentHex, emissive: spec.accentEmissive, emissiveIntensity: 1.45, roughness: 0.28, metalness: 0.24 });
  const lipMat = (!isPreview && key === 'slate') ? orange : new THREE.MeshStandardMaterial({ color: spec.lipHex, emissive: spec.lipEmissive, emissiveIntensity: 1.1, roughness: 0.34 });
  const portalMat = new THREE.MeshStandardMaterial({
    color: spec.accentHex,
    emissive: spec.accentEmissive,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.38,
    roughness: 0.15,
    side: THREE.DoubleSide
  });
  const entry = {
    id: key,
    spec,
    mats: { ramp: rampMat, deck: deckMat, dark: structMat, under: underMat, accent: accentMat, lip: lipMat, portal: portalMat }
  };
  _surfThemeCache.set(cacheKey, entry);
  return entry;
}

function applyLevelTheme(themeId, targetScene, targetHemi, targetSun){
  const theme = getSurfTheme(themeId || 'slate');
  const s = theme.spec;
  const sc = targetScene || scene;
  const hl = targetHemi || hemiLight;
  const sl = targetSun || sun;
  sc.background = new THREE.Color(s.bgHex);
  sc.fog = new THREE.FogExp2(s.bgHex, s.fogDensity);
  if (hl) {
    hl.color.setHex(s.hemiSky);
    hl.groundColor.setHex(s.hemiGround);
    hl.intensity = s.hemiInt;
  }
  if (sl) {
    sl.color.setHex(s.sunColor);
    sl.intensity = s.sunInt;
  }
  return theme;
}

const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=THREE.MathUtils.clamp;

// =====================================================================
// TUNING — every movement number lives here. Units: meters, seconds.
// =====================================================================
const CFG={
  tickRate:120,                      // fixed physics steps per second (deterministic, tunnel-resistant)
  radius:.45, skin:.02,              // capsule radius; contact tolerance used for "touching"
  eyeStand:1.7, eyeLow:.9,           // camera height standing / sliding
  groundSpeed:22, groundAccel:12,    // run speed cap and Quake-style accel factor
  friction:6, stopSpeed:4,           // ground friction; speed floor used by friction (snappy stops)
  airWishCap:2.75, airAccel:15,      // air-strafe: max speed gained along wish dir per tick; accel factor
  surfMinY:.32,                      // surf slope band: surfMinY <= normal.y < walkableY (~46°..71°)
  surfWishCap:2.75, surfAirAccel:20, // authentic CS surf air-strafe responsiveness on/off ramps
  surfRoll:.085, surfGrace:.14,      // subtle surf bank roll (rad) and short seam/lip grace window
  gravity:26, jumpSpeed:9.5,         // jumpSpeed is added to any upward slope velocity (ramp-jump boost)
  autoHop:true,                      // hold Space to chain hops with no ground friction
  walkableY:.7,                      // surface normal.y >= this is ground; below it you surf
  snapDist:.3,                       // stick-to-ground distance when running down slopes
  slideFriction:.5, slideMinSpeed:4, slideAccel:3, slideBoost:1.1, slideBoostCooldown:1,
  wallMinSpeed:8, wallMaxTime:2.5, wallGravityScale:.12, wallMaxFall:4, wallStick:30,
  wallJumpPush:9, wallJumpUp:10.5, wallCooldown:.25, wallRoll:.12,
  grapplePullAccel:60, grapplePullSpeed:48, grappleRange:70, grappleGravityScale:.55, grappleRelease:3,
  burstImpulse:13, burstCooldown:2.2,
  padUp:17, padBoost:1.12,
  fovBase:85, fovPerSpeed:.3, fovMax:20,
  coyote:.1, jumpBuffer:.12, killY:-30
};
const TICK=1/CFG.tickRate;
const H_STAND=[.45,.9,1.35], H_LOW=[.45,.55];   // collision sphere heights above feet

