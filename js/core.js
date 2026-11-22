

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080f19);
scene.fog = new THREE.FogExp2(0x080f19, 0.0038);
const camera = new THREE.PerspectiveCamera(85, innerWidth/innerHeight, .08, 700);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9bdcff,0x18202b,1.35));
const sun = new THREE.DirectionalLight(0xc5eaff,2.1);
sun.position.set(-45,75,30); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-110;sun.shadow.camera.right=110;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;
scene.add(sun);scene.add(sun.target);
const cyan = new THREE.MeshStandardMaterial({color:0x27c9e8,emissive:0x08758e,emissiveIntensity:1.1,roughness:.35,metalness:.25});
const orange = new THREE.MeshStandardMaterial({color:0xff914d,emissive:0x9b3c12,emissiveIntensity:.85,roughness:.4});
const dark = new THREE.MeshStandardMaterial({color:0x182634,roughness:.82,metalness:.35});
const concrete = new THREE.MeshStandardMaterial({color:0x354656,roughness:.9});
const floorMat = new THREE.MeshStandardMaterial({color:0x111c28,roughness:.94});
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
  airWishCap:2.6, airAccel:12,       // air-strafe: max speed gained along wish dir per tick; accel factor
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

