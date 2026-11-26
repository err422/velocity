// Main 3D render loop, pause-camera orbit, ghost visualization, and level/course activation.
// ---------- render ----------
var inLevel=false;
let lastHudSlot='';
let lastHudAmmo=-1;
let lastHudReloading=false;
let lastHudScopeKey='';
let lastHudHp=-1;
let lastHudWeaponSig='';
const _rp=V3(),_right=V3();
let pauseWorldViewActive=false;
let pauseViewBlend=0;
let pauseAvatarVisual=null;
const pauseStartCameraPosition=V3();
const pauseStartCameraQuaternion=new THREE.Quaternion();
const pauseDesiredCameraPosition=V3();
const pauseCameraTarget=V3();
const pauseCameraRight=V3();
const pauseCameraForward=V3();
// A Camera's lookAt points its -Z axis at the target. Object3D.lookAt
// has the opposite facing convention, which made the pause view point away
// from the runner.
const pauseCameraLooker=new THREE.PerspectiveCamera(85,1,0.1,100);

function ensurePauseAvatarVisual(){
  if(pauseAvatarVisual)return;
  pauseAvatarVisual=CombatSystem.createPauseAvatar();
  pauseAvatarVisual.hpFill.visible=false;
  pauseAvatarVisual.hpBg.visible=false;
  pauseAvatarVisual.label.visible=false;
  pauseAvatarVisual.group.visible=false;
  pauseAvatarVisual.group.traverse(obj=>{
    if(obj.isMesh)obj.castShadow=true;
  });
  scene.add(pauseAvatarVisual.group);
}
const surfHintEl=$('surfHint');
const crosshairEl=$('crosshair');
window.activeSettings=VelocitySettings.loadLocal();
window.activeInventory=KnivesSystem.loadLocal();

// VELOCITY_TEST is a disposable local sandbox. Snapshot every inventory-owned
// storage key before entering so test purchases/drops/sales never touch the
// normal local profile or the signed-in cloud inventory.
const VELOCITY_TEST_SNAPSHOT_KEY='velocity_test_inventory_snapshot_v1';
const VELOCITY_TEST_COINS=9999999;
function syncVelocityTestMode(refreshUi=true){
  const wantsTest=String(window.activeSettings&&window.activeSettings.displayName||'').trim().toUpperCase()==='VELOCITY_TEST';
  const keys=[KnivesSystem.STORAGE_KEY,KnivesSystem.BACKUP_STORAGE_KEY,KnivesSystem.SOLD_IDS_STORAGE_KEY,KnivesSystem.DIRTY_STORAGE_KEY];
  if(wantsTest){
    if(!window.VELOCITY_TEST_MODE){
      try{
        // Keep the original snapshot across reloads while the test username is active.
        if(!localStorage.getItem(VELOCITY_TEST_SNAPSHOT_KEY)){
          const snapshot={};
          for(const key of keys)snapshot[key]=localStorage.getItem(key);
          localStorage.setItem(VELOCITY_TEST_SNAPSHOT_KEY,JSON.stringify(snapshot));
        }
      }catch(err){
        console.warn('Could not snapshot the normal inventory before entering test mode:',err);
      }
    }
    window.VELOCITY_TEST_MODE=true;
    window.activeInventory.coins=VELOCITY_TEST_COINS;
    window.activeInventory=KnivesSystem.saveLocal(window.activeInventory);
    KnivesSystem.setLocalDirty(false);
    if(refreshUi){
      updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
      updateArmoryBadges();
    }
    return;
  }
  if(window.VELOCITY_TEST_MODE){
    window.VELOCITY_TEST_MODE=false;
    try{
      const raw=localStorage.getItem(VELOCITY_TEST_SNAPSHOT_KEY);
      if(raw){
        const snapshot=JSON.parse(raw);
        for(const key of keys){
          if(Object.prototype.hasOwnProperty.call(snapshot,key)){
            if(snapshot[key]===null)localStorage.removeItem(key);
            else localStorage.setItem(key,snapshot[key]);
          }
        }
        localStorage.removeItem(VELOCITY_TEST_SNAPSHOT_KEY);
      }
    }catch(err){
      console.warn('Could not restore the normal inventory after test mode:',err);
    }
    window.activeInventory=KnivesSystem.loadLocal();
    if(refreshUi){
      updateArmorySyncLabel('LOCAL ONLY');
      updateArmoryBadges();
    }
  }
}
syncVelocityTestMode(false);
window.activeLoadouts=LoadoutsSystem.loadLocal();
window.isRebindingInput=false;
window.isScoreboardHeld=false;
ghostVisual=GhostSystem.createGhostMesh(THREE,scene);
CombatSystem.ensureInit(scene);
ViewmodelSystem.init(renderer);
ViewmodelSystem.applySettings(window.activeSettings);
const ALL_WEAPON_TYPES=(window.KnivesSystem&&Array.isArray(KnivesSystem.WEAPON_TYPE_IDS))
  ?KnivesSystem.WEAPON_TYPE_IDS
  :['rifle','smg','shotgun','awp','revolver','deagle','pistol'];
function syncEquippedWeaponsToViewmodel(){
  const camos=(window.activeLoadouts&&window.activeLoadouts.equippedWeaponCamos)||{};
  for(const wt of ALL_WEAPON_TYPES){
    const skinItem=KnivesSystem.getEquippedWeapon(window.activeInventory,wt);
    if(skinItem){
      const camoId=camos[wt];
      ViewmodelSystem.equipWeaponSkin(camoId?{...skinItem,skinId:camoId,floatValue:0.01,patternSeed:42}:skinItem);
    }
  }
}
function applyActiveLoadoutToRuntime(opts){
  const activeLd=LoadoutsSystem.getActiveLoadout(window.activeLoadouts);
  if(activeLd&&activeLd.melee&&activeLd.melee.knifeItemId){
    const meleeKnife=(window.activeInventory.knives||[]).find(k=>k.id===activeLd.melee.knifeItemId);
    if(meleeKnife){
      window.activeInventory.equippedKnifeId=meleeKnife.id;
      ViewmodelSystem.equipKnife(meleeKnife,false);
    }
  }
  CombatSystem.applyLoadout(activeLd,window.activeInventory,window.activeLoadouts.equippedWeaponSkins,window.activeLoadouts.equippedWeaponCamos);
  if(!opts||!opts.keepSlot){
    CombatSystem.switchSlot(CombatSystem.getState().activeSlot,false);
  }
  lastHudSlot='';
  lastHudAmmo=-1;
  lastHudWeaponSig='';
}
function syncInventoryCosmeticsToViewmodel(){
  ViewmodelSystem.equipGlove(KnivesSystem.getEquippedGlove(window.activeInventory));
  ViewmodelSystem.equipKnife(KnivesSystem.getEquippedKnife(window.activeInventory),false);
  syncEquippedWeaponsToViewmodel();
  applyActiveLoadoutToRuntime();
}
syncInventoryCosmeticsToViewmodel();

function updateGhostVisual(dt){
  if(!course){
    GhostSystem.updateGhostMesh(ghostVisual,null);
    document.body.dataset.ghostActive='0';
    return;
  }
  const sel=GhostSystem.selectGhostEntry(ghostMode,ghostPb,ghostLast);
  if(!sel.ghost){
    GhostSystem.updateGhostMesh(ghostVisual,null);
    document.body.dataset.ghostActive='0';
    return;
  }
  const t=player.runStarted?player.runTime:(player.runTime>0?player.runTime:0);
  const pose=GhostSystem.sampleGhost(sel.ghost,t);
  GhostSystem.updateGhostMesh(ghostVisual,pose,_rp,dt,sel.kind);
  document.body.dataset.ghostActive=pose?'1':'0';
}

function render(dt){
  const p=player,C=CFG,a=acc/TICK;
  _rp.lerpVectors(p.prev,p.pos,a);                      // interpolate between physics ticks
  sun.position.set(_rp.x-45,_rp.y+75,_rp.z+30);sun.target.position.copy(_rp);   // shadows follow the player
  p.eye+=((p.low?C.eyeLow:C.eyeStand)-p.eye)*Math.min(1,dt*14);
  _right.set(Math.cos(p.yaw),0,-Math.sin(p.yaw));
  const isSurfDisplay=p.surfing||p.surfGrace>0.04;
  const rollT=p.wallrun?-C.wallRoll*Math.sign(_right.dot(p.wallN)):(isSurfDisplay?-C.surfRoll*Math.sign(_right.dot(p.surfN)):0);
  p.roll+=(rollT-p.roll)*Math.min(1,dt*8);
  if(!inLevel){
    pauseViewBlend=0;
    if(pauseAvatarVisual)pauseAvatarVisual.group.visible=false;
    const reduceMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t=reduceMotion?0.65:performance.now()*0.00011;
    const r=78;
    camera.position.set(Math.cos(t)*r,34+Math.sin(t*1.6)*3.2,Math.sin(t)*r);
    camera.lookAt(0,12,0);
  }else if(pauseWorldViewActive&&inLevel){
    ensurePauseAvatarVisual();
    pauseAvatarVisual.group.visible=true;
    pauseAvatarVisual.group.position.copy(_rp);
    pauseAvatarVisual.group.rotation.y=p.yaw;
    if(CombatSystem&&typeof CombatSystem.updateAvatarChronoVisual==='function'){
      const csNow=CombatSystem.getChronoState();
      CombatSystem.updateAvatarChronoVisual(pauseAvatarVisual,csNow?csNow.tier:0,dt);
    }

    // Camera moves in front of the runner and slightly to one side, looking
    // back toward their face so the character reads clearly beside the panel.
    pauseCameraForward.set(-Math.sin(p.yaw),0,-Math.cos(p.yaw));
    pauseCameraRight.set(Math.cos(p.yaw),0,-Math.sin(p.yaw));
    pauseCameraTarget.set(_rp.x,_rp.y+1.08,_rp.z);
    pauseDesiredCameraPosition.copy(_rp)
      .addScaledVector(pauseCameraForward,4.45)
      .addScaledVector(pauseCameraRight,1.15);
    pauseDesiredCameraPosition.y+=2.12;
    pauseCameraLooker.position.copy(pauseDesiredCameraPosition);
    pauseCameraLooker.lookAt(pauseCameraTarget);

    pauseViewBlend=Math.min(1,pauseViewBlend+dt*4.6);
    const eased=pauseViewBlend*pauseViewBlend*(3-2*pauseViewBlend);
    camera.position.lerpVectors(pauseStartCameraPosition,pauseDesiredCameraPosition,eased);
    camera.quaternion.slerpQuaternions(
      pauseStartCameraQuaternion,
      pauseCameraLooker.quaternion,
      eased
    );
  }else{
    pauseViewBlend=0;
    if(pauseAvatarVisual)pauseAvatarVisual.group.visible=false;
    camera.position.set(_rp.x,_rp.y+p.eye,_rp.z);
    camera.rotation.set(p.pitch,p.yaw,p.roll);
  }
  const sp=Math.hypot(p.vel.x,p.vel.z);
  // Advance combat first so the world camera and viewmodel consume the same ADS snapshot.
  let combatFrameState=null;
  if(inLevel){
    const botTargetState=NetcodeSystem.getState();
    const arenaCourseMeta=window.CourseCatalog&&typeof window.CourseCatalog.getCourseMeta==='function'
      ?window.CourseCatalog.getCourseMeta(level.id):null;
    const botMovementContext={
      config:CFG,
      solids,
      solidMeshes,
      pads,
      boosters,
      teleporters,
      killY:level&&typeof level.killY==='number'?level.killY:-18,
      mapId:botTargetState.mapId||level.id,
      abilitiesAllowed:!(arenaCourseMeta&&arenaCourseMeta.category==='surf'),
      arenaSpawns:botTargetState.players
    };
    CombatSystem.update(dt,{
      uid:botTargetState.localUid,
      position:_rp,
      yaw:p.yaw,
      pitch:p.pitch,
      eye:p.eye,
      velocity:p.vel,
      playerObj:p,
      hp:botTargetState.localHp,
      alive:botTargetState.localAlive!==false,
      isHost:botTargetState.role==='host',
      phase:botTargetState.phase,
      mode:botTargetState.mode,
      players:botTargetState.players
    },solidMeshes,botMovementContext);
    if(typeof CombatSystem.consumeChargedShot==='function'&&CombatSystem.consumeChargedShot()){
      performFire(false);
    }
    if(typeof CombatSystem.consumeBurstShot==='function'&&CombatSystem.consumeBurstShot()){
      performFire(false,{isBurstFollowup:true});
    }
    combatFrameState=CombatSystem.getState();
  }
  const baseFov=(window.activeSettings&&window.activeSettings.baseFov)||C.fovBase;
  const scopeMul=CombatSystem.getScopeFovMultiplier();
  const speedFov=Math.min(sp*C.fovPerSpeed,C.fovMax);
  const targetFov=(baseFov+speedFov)*scopeMul;
  const fovRate=5+13*(combatFrameState?combatFrameState.adsProgress:0);
  camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*fovRate);camera.updateProjectionMatrix();
  speedEl.textContent=Math.round(sp);
  if(p.runStarted)timerEl.textContent=fmt(p.runTime);
  const chronoOn=Boolean(inLevel&&combatFrameState&&combatFrameState.chronoActive);
  const chronoPhase=chronoOn&&combatFrameState.chronoTier>=2;
  const stateLabel=!inLevel?'READY':chronoOn?`${chronoPhase?'PHASE':'CHRONO'} ${combatFrameState.chronoTimeScale.toFixed(2)}×`:p.wallrun?'WALLRUN':p.grapple?'TETHER':isSurfDisplay?'SURFING':p.low&&p.grounded?'SLIDE':p.grounded?'GROUNDED':'AIRBORNE';
  stateEl.textContent=stateLabel;
  stateEl.classList.toggle('surfing',!chronoOn&&stateLabel==='SURFING');
  stateEl.classList.toggle('chrono',chronoOn&&!chronoPhase);
  stateEl.classList.toggle('chrono-phase',chronoPhase);
  if(chronoVignetteEl){
    const cw=inLevel&&combatFrameState?combatFrameState.chronoWeight:0;
    chronoVignetteEl.dataset.tier=chronoPhase?'2':'1';
    chronoVignetteEl.style.opacity=cw>0.02?cw.toFixed(2):'0';
  }
  document.body.dataset.surfing=isSurfDisplay?'1':'0';
  if(surfHintEl){
    const showHint=inLevel&&overlay.style.display==='none'&&!!level.surfHint&&p.surfTime<1.2;
    surfHintEl.style.opacity=showHint?'1':'0';
  }
  if(p.grapple){
    if(!p.grappleLine){
      p.grappleLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(),V3()]),new THREE.LineBasicMaterial({color:0x65e7ff}));
      p.grappleLine.frustumCulled=false;scene.add(p.grappleLine);
    }
    const pos=p.grappleLine.geometry.attributes.position;
    pos.setXYZ(0,_rp.x,_rp.y+1.2,_rp.z);pos.setXYZ(1,p.grapple.x,p.grapple.y,p.grapple.z);pos.needsUpdate=true;
  }else if(p.grappleLine){scene.remove(p.grappleLine);p.grappleLine=null;}
  updateGhostVisual(dt);
  if(inLevel){
    NetcodeSystem.update(dt,{x:_rp.x,y:_rp.y,z:_rp.z,yaw:p.yaw,slot:combatFrameState.activeSlot,ct:combatFrameState.chronoTier||0});
    ViewmodelSystem.update(dt,p,combatFrameState.adsProgress,combatFrameState.chronoWeight||0);
    updateCombatHud();
  }
  document.body.dataset.runStarted=p.runStarted?'1':'0';
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.style.opacity=0;}
  if(weaponXpToastTimer>0){weaponXpToastTimer-=dt;if(weaponXpToastTimer<=0&&weaponXpToastEl)weaponXpToastEl.style.opacity='0';}
}

let frameId=0;
function afterDraw(cb){
  const gl=renderer.getContext();
  if(!gl||typeof gl.fenceSync!=='function'){frameId=setTimeout(()=>cb(performance.now()),80);return;}
  const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  gl.flush();
  const poll=()=>{
    const st=sync&&gl.getSyncParameter(sync,gl.SYNC_STATUS);
    if(st===gl.UNSIGNALED){frameId=setTimeout(poll,5);}
    else{if(sync)gl.deleteSync(sync);frameId=setTimeout(()=>cb(performance.now()),80);}
  };
  frameId=setTimeout(poll,5);
}

function frame(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  const activePlay=locked||(inLevel&&overlay.style.display==='none');
  if(activePlay){acc+=dt;let n=0;while(acc>=TICK&&n<20){step(TICK);acc-=TICK;n++;}if(n===20)acc=0;}
  else{acc=0;}
  render(dt);
  renderer.render(scene,camera);
  if(inLevel&&!pauseWorldViewActive)ViewmodelSystem.render(renderer);
  if(isSoftwareGl)afterDraw(frame);
  else frameId=requestAnimationFrame(frame);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  if((loadoutsPanelEl&&loadoutsPanelEl.style.display!=='none')||(armoryPanelEl&&armoryPanelEl.style.display!=='none')){
    ArmoryPreview.resize();
  }
  if(serversPanelEl&&serversPanelEl.style.display!=='none'&&typeof ArenaPreview3D!=='undefined'){
    ArenaPreview3D.resize();
  }
  if(courseBrowserPanelEl&&courseBrowserPanelEl.style.display!=='none'&&typeof CoursePreview3D!=='undefined'){
    CoursePreview3D.resize();
  }
});

// ---------- levels + seeded daily courses + 6 competitive PvP arenas ----------
const LEVELS={
  sandbox:{name:'SANDBOX',build:buildSandbox}
};
if(typeof ArenaCatalog!=='undefined'&&Array.isArray(ArenaCatalog.ARENA_CATALOG)){
  for(const a of ArenaCatalog.ARENA_CATALOG){
    LEVELS[a.id]={
      name:`ARENA · ${a.shortName}`,
      build:()=>a.build(),
      meta:a
    };
  }
}else{
  LEVELS.arena_surf={name:'ARENA · SURF STADIUM',build:buildArenaSurf};
  LEVELS.arena_aim={name:'ARENA · AIM COURTYARD',build:buildArenaAim};
}
if(typeof CourseCatalog!=='undefined'&&Array.isArray(CourseCatalog.COURSE_CATALOG)){
  for(const c of CourseCatalog.COURSE_CATALOG){
    LEVELS[c.id]={
      name:`${c.category==='surf'?'SURF':'TIME TRIAL'} · ${c.name.toUpperCase()}`,
      build:()=>c.build(),
      meta:c
    };
  }
}else{
  LEVELS.course1={name:'COURSE 01',build:buildCourse1};
  LEVELS.surf1={name:'SURF 01',build:buildSurfMap1};
}
const worldBuildApi={
  slab,
  addBox,
  addRamp,
  addSurfWedge,
  addSurfCurve,
  addLaunchPad,
  buildGates,
  gateText,
  V3,
  materials:{concrete,cyan,orange,dark,floorMat,surfMat}
};

function clearWorldGroup(){
  scene.remove(levelGroup);
  levelGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  levelGroup=new THREE.Group();
  scene.add(levelGroup);
  solids.length=0;solidMeshes.length=0;pads=[];
  if(typeof boosters!=='undefined')boosters=[];
  if(typeof teleporters!=='undefined')teleporters=[];
  if(typeof failZones!=='undefined')failZones=[];
}

function activateLoadedLevel(built,displayName,opts){
  const o=opts||{};
  level=built;
  course=level.course||null;
  SPAWN=level.spawn&&typeof level.spawn.clone==='function'?level.spawn:V3(level.spawn?level.spawn.x:0,level.spawn?level.spawn.y:0,level.spawn?level.spawn.z:0);
  SPAWN_YAW=Number.isFinite(level.yaw)?level.yaw:(Number.isFinite(level.spawnYaw)?level.spawnYaw:Math.PI);
  const id=level.id;
  if(typeof applyLevelTheme==='function'){
    applyLevelTheme(built.theme||'slate');
  }
  PB_KEY='velocity_pb_'+id;
  SPL_KEY='velocity_splits_'+id;
  GHOST_PB_KEY='velocity_ghost_pb_'+id;
  GHOST_LAST_KEY='velocity_ghost_last_'+id;
  player.best=Number(localStorage.getItem(PB_KEY)||0);
  try{bestSplits=JSON.parse(localStorage.getItem(SPL_KEY)||'[]');}catch(_){bestSplits=[];}
  if(course){loadCourseGhosts(id);}
  else{ghostPb=null;ghostLast=null;updateGhostHud();}
  pbEl.textContent=course?(player.best>0?'PERSONAL BEST '+fmt(player.best):'PERSONAL BEST —:—.---'):'';
  document.querySelector('.rightstats').style.display=course?'':'none';
  $('levelName').textContent=displayName;
  const courseMeta=typeof CourseCatalog!=='undefined'?CourseCatalog.getCourseMeta(id):null;
  let pauseSub=displayName;
  if(courseMeta){
    const fmtLabel=courseMeta.format==='staged'?`STAGED (${courseMeta.cpCount} STAGES)`:`LINEAR (${courseMeta.cpCount} CPs)`;
    pauseSub=`${displayName} · T${courseMeta.tier} ${fmtLabel}`;
  }else if(level.meta){
    pauseSub=`${displayName} · ${level.meta.lengthLabel} (${level.meta.segmentCount} SEGMENTS)`;
  }
  $('pauseCourseLabel').textContent=pauseSub;
  const pauseChangeMapBtn=$('pauseChangeMap');
  if(pauseChangeMapBtn){
    pauseChangeMapBtn.style.display=courseMeta?'':'none';
    if(courseMeta){
      pauseChangeMapBtn.textContent=courseMeta.category==='surf'?'CHANGE SURF MAP':'CHANGE TIME TRIAL';
    }
  }
  const pauseSandboxBotsBtn=$('pauseSandboxBots');
  if(pauseSandboxBotsBtn){
    pauseSandboxBotsBtn.style.display=id==='sandbox'?'':'none';
    pauseSandboxBotsBtn.textContent='SPAWN BOTS';
  }
  document.body.dataset.level=id;

  // Set up targets & arena warmup bots
  CombatSystem.clearTargets();
  CombatSystem.clearWarmupBots();
  if(built.targets&&built.targets.length>0){
    CombatSystem.setupTargets(built.targetMode||'gauntlet',built.targets,built.rangeMeta||null);
  }
  if(built.isArena){
    if(typeof CombatSystem.resetMatchStreaks==='function')CombatSystem.resetMatchStreaks();
    const arenaSpawns=built.arenaSpawns||built.spawns||[];
    NetcodeSystem.setArenaSpawns(arenaSpawns);
    CombatSystem.setupWarmupBots(arenaSpawns,3);
    if(!o.keepSession&&!NetcodeSystem.getState().isArena){
      NetcodeSystem.startSoloWarmup(id,'duel_1v1');
    }
    const ns=NetcodeSystem.getState();
    CombatSystem.setWarmupBotsVisible(!ns.isOnline||ns.phase==='warmup');
    CombatSystem.switchSlot('primary');
  }else{
    if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
    CombatSystem.switchSlot(id==='sandbox'?'primary':'melee');
  }
  syncInventoryCosmeticsToViewmodel();
  resetPlayer();
  ViewmodelSystem.triggerDraw();
  renderArenaHudStatic();
  toast.style.opacity=0;
}

function loadLevel(id,opts){
  clearWorldGroup();
  const built=LEVELS[id].build();
  activateLoadedLevel(built,LEVELS[id].name,opts);
}

function loadDailyCourse(dateKey,seedOverride){
  const dk=DailyCourseGen.isValidDateKey(dateKey)?dateKey:DailyCourseGen.getTodayDateKey();
  const seed=seedOverride||DailyCourseGen.canonicalDailySeed(dk);
  const id=DailyCourseGen.courseIdForDaily(dk);
  clearWorldGroup();
  const built=DailyCourseGen.buildSeededCourseInWorld(seed,{id,dateKey:dk},worldBuildApi);
  activateLoadedLevel(built,`DAILY · ${DailyCourseGen.formatDateDisplay(dk)}`);
  if(window.DailyBackend){
    window.DailyBackend.ensureDailyCourseRegistered(dk).catch(()=>{});
  }
}

function loadCustomSeedCourse(rawSeed){
  const norm=DailyCourseGen.normalizeCustomSeed(rawSeed)||DailyCourseGen.randomSeedCode();
  const id=DailyCourseGen.courseIdForSeed(norm);
  clearWorldGroup();
  const built=DailyCourseGen.buildSeededCourseInWorld(norm,{id,dateKey:null},worldBuildApi);
  activateLoadedLevel(built,`SEED · ${norm}`);
}

