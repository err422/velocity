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
const ALL_WEAPON_TYPES=['rifle','smg','shotgun','awp','deagle','pistol'];
function syncEquippedWeaponsToViewmodel(){
  for(const wt of ALL_WEAPON_TYPES){
    const skinItem=KnivesSystem.getEquippedWeapon(window.activeInventory,wt);
    if(skinItem)ViewmodelSystem.equipWeaponSkin(skinItem);
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
  CombatSystem.applyLoadout(activeLd,window.activeInventory,window.activeLoadouts.equippedWeaponSkins);
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
  if(pauseWorldViewActive&&inLevel){
    ensurePauseAvatarVisual();
    pauseAvatarVisual.group.visible=true;
    pauseAvatarVisual.group.position.copy(_rp);
    pauseAvatarVisual.group.rotation.y=p.yaw;

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
    CombatSystem.update(dt,{
      uid:botTargetState.localUid,
      position:_rp,
      yaw:p.yaw,
      eye:p.eye,
      velocity:p.vel,
      alive:botTargetState.localAlive!==false,
      isHost:botTargetState.role==='host',
      phase:botTargetState.phase
    },solidMeshes);
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
  const stateLabel=!inLevel?'READY':p.wallrun?'WALLRUN':p.grapple?'TETHER':isSurfDisplay?'SURFING':p.low&&p.grounded?'SLIDE':p.grounded?'GROUNDED':'AIRBORNE';
  stateEl.textContent=stateLabel;
  stateEl.classList.toggle('surfing',stateLabel==='SURFING');
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
    NetcodeSystem.update(dt,{x:_rp.x,y:_rp.y,z:_rp.z,yaw:p.yaw,slot:combatFrameState.activeSlot});
    ViewmodelSystem.update(dt,p,combatFrameState.adsProgress);
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
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- levels + seeded daily courses + combat arenas ----------
const LEVELS={
  sandbox:{name:'SANDBOX',build:buildSandbox},
  arena_surf:{name:'ARENA · SURF DUEL',build:buildArenaSurf},
  arena_aim:{name:'ARENA · AIM MAP',build:buildArenaAim}
};
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
  course=level.course;
  SPAWN=level.spawn;
  SPAWN_YAW=level.yaw;
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
  document.body.dataset.level=id;

  // Set up targets & arena warmup bots
  CombatSystem.clearTargets();
  CombatSystem.clearWarmupBots();
  if(built.targets&&built.targets.length>0){
    CombatSystem.setupTargets(built.targetMode||'gauntlet',built.targets,built.rangeMeta||null);
  }
  if(built.isArena){
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

// ---------- menu, daily hub, settings, servers, loadouts, leaderboard & auth ----------
const overlayCard=$('overlayCard'),menuEl=$('menu'),courseBrowserPanelEl=$('courseBrowserPanel'),dailyHubEl=$('dailyHub'),settingsPanelEl=$('settingsPanel'),armoryPanelEl=$('armoryPanel'),serversPanelEl=$('serversPanel'),loadoutsPanelEl=$('loadoutsPanel'),pauseEl=$('pause');
const cbEyebrowEl=$('cbEyebrow'),cbTitleEl=$('cbTitle'),cbBackBtn=$('cbBackBtn'),cbSearchInput=$('cbSearch'),cbSortSelect=$('cbSort'),cbFilterRowEl=$('cbFilterRow'),cbMapListEl=$('cbMapList');
const coursePreviewCanvas=$('coursePreviewCanvas'),cbModeFlyBtn=$('cbModeFly'),cbModeOrbitBtn=$('cbModeOrbit'),cbPreviewLabelEl=$('cbPreviewLabel'),cbPreviewHintEl=$('cbPreviewHint');
const cbDetailTitleEl=$('cbDetailTitle'),cbDetailSubEl=$('cbDetailSub'),cbDetailDescEl=$('cbDetailDesc');
const cbSpecCourseEl=$('cbSpecCourse'),cbSpecTierEl=$('cbSpecTier'),cbSpecParEl=$('cbSpecPar'),cbSpecBestEl=$('cbSpecBest'),cbSpecPiecesEl=$('cbSpecPieces');
const cbGhostCheckEl=$('cbGhostCheck'),cbGhostLabelEl=$('cbGhostLabel'),cbCountNoteEl=$('cbCountNote'),cbPlayBtn=$('cbPlayBtn');
const menuSurfStatEl=$('menuSurfStat'),menuTTStatEl=$('menuTTStat'),pauseChangeMapBtn=$('pauseChangeMap');
const menuLoadoutStripEl=$('menuLoadoutStrip'),menuLoadoutSummaryEl=$('menuLoadoutSummary'),menuLoadoutStatEl=$('menuLoadoutStat');
const pauseLoadoutStripEl=$('pauseLoadoutStrip'),pauseLoadoutSummaryEl=$('pauseLoadoutSummary');
const loadoutsSyncNoteEl=$('loadoutsSyncNote'),loadoutsBackBtn=$('loadoutsBackBtn'),loadoutsArmoryBtn=$('loadoutsArmoryBtn');
const loadoutsEyebrowEl=$('loadoutsEyebrow'),loadoutsTitleEl=$('loadoutsTitle');
const loadoutsOverviewViewEl=$('loadoutsOverviewView'),gunsmithViewEl=$('gunsmithView');
const loadoutsRailEl=$('loadoutsRail'),loadoutNameInput=$('loadoutNameInput'),loadoutDuplicateBtn=$('loadoutDuplicateBtn'),loadoutResetBtn=$('loadoutResetBtn'),loadoutsSlotsGridEl=$('loadoutsSlotsGrid');
const gsBackToLoadoutsBtn=$('gsBackToLoadoutsBtn'),gsWeaponTitleEl=$('gsWeaponTitle'),gsWeaponLevelLabelEl=$('gsWeaponLevelLabel'),gsWeaponXpFillEl=$('gsWeaponXpFill'),gsWeaponXpTextEl=$('gsWeaponXpText');
const gsBudgetBadgeEl=$('gsBudgetBadge'),gsSkinsToggleBtn=$('gsSkinsToggleBtn'),gsClearAllBtn=$('gsClearAllBtn');
const gsRailLabelEl=$('gsRailLabel'),gsCategoryRailEl=$('gsCategoryRail'),gsPickerHeadingEl=$('gsPickerHeading');
const gsAttachmentListEl=$('gsAttachmentList'),gsSkinsGridEl=$('gsSkinsGrid'),gunsmithCanvasEl=$('gunsmithCanvas'),gsStageLabelEl=$('gsStageLabel'),gsStatsBoxEl=$('gsStatsBox');
const weaponXpToastEl=$('weaponXpToast'),wxpKickerEl=$('wxpKicker'),wxpTitleEl=$('wxpTitle'),wxpSubEl=$('wxpSub');
const archiveListEl=$('archiveList'),lbListEl=$('lbList'),lbStatusEl=$('lbStatus'),lbAuthNoteEl=$('lbAuthNote');
const customSeedInput=$('customSeedInput'),customSeedPreview=$('customSeedPreview');
const menuAuthName=$('menuAuthName'),menuAuthBtn=$('menuAuthBtn'),hubAuthBtn=$('hubAuthBtn'),serversAuthBtn=$('serversAuthBtn'),menuArmoryBtn=$('menuArmoryBtn');
const menuControlsEl=$('menuControls');
const settingsSyncNote=$('settingsSyncNote'),settingsBackBtn=$('settingsBackBtn');
const setDisplayNameInput=$('setDisplayName'),setDisplayNameCount=$('setDisplayNameCount'),setDisplayNameNote=$('setDisplayNameNote');
const setSensRange=$('setSensRange'),setSensVal=$('setSensVal');
const setInvertOff=$('setInvertOff'),setInvertOn=$('setInvertOn');
const setFovRange=$('setFovRange'),setFovVal=$('setFovVal');
const setVmXRange=$('setVmXRange'),setVmXVal=$('setVmXVal');
const setVmYRange=$('setVmYRange'),setVmYVal=$('setVmYVal');
const setVmZRange=$('setVmZRange'),setVmZVal=$('setVmZVal');
const setVmFovRange=$('setVmFovRange'),setVmFovVal=$('setVmFovVal');
const setVmResetBtn=$('setVmResetBtn');
const keybindGridEl=$('keybindGrid'),keybindHintEl=$('keybindHint');
const setChSizeRange=$('setChSizeRange'),setChSizeVal=$('setChSizeVal');
const crosshairPreviewEl=$('crosshairPreview'),chPreviewLabel=$('chPreviewLabel'),chPreviewHex=$('chPreviewHex');

// Combat & Arena HUD refs
const hudWeaponName=$('hudWeaponName'),hudBuildMeta=$('hudBuildMeta'),hudAmmoBox=$('hudAmmoBox'),hudAmmoCur=$('hudAmmoCur'),hudAmmoMax=$('hudAmmoMax');
const hudSlotPrimaryLabel=$('hudSlotPrimaryLabel'),hudSlotSecondaryLabel=$('hudSlotSecondaryLabel'),hudSlotMeleeLabel=$('hudSlotMeleeLabel');
const hudReloadBar=$('hudReloadBar'),hudReloadFill=$('hudReloadFill');
const hudSlotEls=document.querySelectorAll('[data-hud-slot]');
const gauntletHudEl=$('gauntletHud'),hitmarkerEl=$('hitmarker'),damageVignetteEl=$('damageVignette');
const awpScopeOverlayEl=$('awpScopeOverlay'),scopeZoomTagEl=$('scopeZoomTag');
const arenaTopBarEl=$('arenaTopBar'),arenaScoreLineEl=$('arenaScoreLine'),arenaSubLineEl=$('arenaSubLine');
const arenaHpWrapEl=$('arenaHpWrap'),hpValEl=$('hpVal'),hpFillEl=$('hpFill');
const killFeedEl=$('killFeed'),arenaScoreboardEl=$('arenaScoreboard'),sbTitleEl=$('sbTitle'),sbSubEl=$('sbSub'),sbTableEl=$('sbTable'),sbActionsEl=$('sbActions');

// Servers panel refs
const serversBoardList=$('serversBoardList'),serversSyncNote=$('serversSyncNote'),serversBackBtn=$('serversBackBtn');
const hostRoomNameInput=$('hostRoomName'),hostDeployBtn=$('hostDeployBtn'),hostDeployNote=$('hostDeployNote');
const privateCodeInput=$('privateCodeInput'),joinPrivateCodeBtn=$('joinPrivateCodeBtn');

// Armory DOM refs
const armoryCoinBalance=$('armoryCoinBalance'),armorySyncNote=$('armorySyncNote'),armoryBackBtn=$('armoryBackBtn');
const armTabCases=$('armTabCases'),armTabInventory=$('armTabInventory');
const armoryCasesSelect=$('armoryCasesSelect'),armoryCaseGrid=$('armoryCaseGrid');
const selectedCaseTitle=$('selectedCaseTitle'),caseOddsLine=$('caseOddsLine'),selectedCasePool=$('selectedCasePool');
const openCaseBtn=$('openCaseBtn'),buyCaseBtn=$('buyCaseBtn'),openCaseHint=$('openCaseHint'),armoryOpenedStat=$('armoryOpenedStat');
const armoryRouletteWrap=$('armoryRouletteWrap'),rouletteCaseLabel=$('rouletteCaseLabel');
const rouletteViewport=$('rouletteViewport'),rouletteTrack=$('rouletteTrack'),rouletteStatus=$('rouletteStatus');
const armoryRevealWrap=$('armoryRevealWrap'),armoryRevealStage=$('armoryRevealStage'),revealStageBar=$('revealStageBar');
const revealValueLine=$('revealValueLine'),revealSellBtn=$('revealSellBtn');
const armoryInspectStage=$('armoryInspectStage'),invStageBar=$('invStageBar'),armoryPreviewCanvas=$('armoryPreviewCanvas');
const armoryInvGrid=$('armoryInvGrid'),invSellBtn=$('invSellBtn');
const invBulkToggleBtn=$('invBulkToggleBtn'),invBulkBar=$('invBulkBar');
const bulkSelSummary=$('bulkSelSummary'),bulkSellConfirmBtn=$('bulkSellConfirmBtn');
const sellConfirmModal=$('sellConfirmModal'),sellConfirmTitle=$('sellConfirmTitle'),sellConfirmSub=$('sellConfirmSub');
const sellConfirmWarn=$('sellConfirmWarn'),sellConfirmList=$('sellConfirmList'),sellConfirmBalance=$('sellConfirmBalance');
const sellConfirmCancelBtn=$('sellConfirmCancelBtn'),sellConfirmYesBtn=$('sellConfirmYesBtn');

let archiveCourses=[];
let selectedDateKey=DailyCourseGen.getTodayDateKey();
let activeLbRequest=0;
let settingsReturnTarget='menu';
let activeSettingsTab='profile';
let rebindingActionId=null;
let cloudSaveTimer=null;
let cloudLoadoutsSaveTimer=null;
let lastSyncedUid=null;
let lastInvSyncedUid=null;
let lastLoadoutsSyncedUid=null;
let weaponXpToastTimer=0;

// Loadouts & 3D Gunsmith state
let loadoutsReturnTarget='menu';
let selectedLoadoutIdx=window.activeLoadouts?window.activeLoadouts.activeIndex:0;
let gunsmithMode=false;
let gunsmithSlotCategory='primary';
let gunsmithAttCategory='optic';
let gunsmithSkinsMode=false;
let gunsmithHoverAttId=null;
let pendingLoadoutApply=false;

// Servers panel state
let serversReturnTarget='menu';
let serversFilterMode='all';
let hostSelectedMap='arena_surf';
let hostSelectedMode='duel_1v1';
let hostSelectedVis='public';
let livePublicLobbies=[];
let unsubPublicLobbies=null;

// Armory state
let armoryReturnTarget='menu';
let activeArmoryTab='cases';
let selectedCaseId='velocity';
let invCategory='weapons';
let invFilterType='all';
let invPreviewMode='combo';
let selectedInvWeaponId=window.activeInventory.equippedRifleId;
let selectedInvKnifeId=window.activeInventory.equippedKnifeId;
let selectedInvGloveId=window.activeInventory.equippedGloveId;
let lastRevealedItem=null;
let bulkSellMode=false;
const bulkSelectedIds=new Set();
let pendingSale=null;
let rouletteRafId=0;
let rouletteFinishCb=null;
const thumbCache=new Map();

function fmtCoins(n){
  return Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-US');
}

function localPbFor(courseId){
  return Number(localStorage.getItem('velocity_pb_'+courseId)||0);
}

function getEffectiveUserName(user){
  return VelocitySettings.resolveEffectiveDisplayName(window.activeSettings,user);
}

function applyCrosshairGlyph(el,ch){
  if(!el||!ch)return;
  el.dataset.style=ch.style;
  el.style.setProperty('--ch-size',ch.size+'px');
  el.style.setProperty('--ch-color',ch.color);
}

function renderControlsLegend(){
  if(!menuControlsEl)return;
  const kb=window.activeSettings.keybinds;
  const f=VelocitySettings.formatInputToken;
  const moveStr=`${f(kb.forward)} ${f(kb.left)} ${f(kb.back)} ${f(kb.right)}`;
  const rows=[
    [moveStr,'Move'],
    [`${f(kb.fire)} / ${f(kb.altFire)}`,'Shoot / ADS'],
    [`${f(kb.slotRifle)}-${f(kb.slotDeagle)} / ${f(kb.slotKnife)}`,'Primary · Sec · Melee / Swap'],
    [f(kb.reload),'Reload'],
    [f(kb.jump),'Jump / wall jump'],
    [f(kb.slide),'Slide'],
    [f(kb.grapple),'Grapple / release'],
    [f(kb.burst),'Speed burst'],
    [f(kb.restart),'Restart run'],
    [f(kb.inspect),'Inspect weapon / knife']
  ];
  menuControlsEl.textContent='';
  for(const [k,desc] of rows){
    const div=document.createElement('div');
    const b=document.createElement('b');
    b.textContent=k;
    div.appendChild(b);
    div.appendChild(document.createTextNode(' '+desc));
    menuControlsEl.appendChild(div);
  }
  if(surfHintEl){
    surfHintEl.textContent=`SURF: STRAFE ${f(kb.left)}/${f(kb.right)} INTO RAMP · STEER WITH MOUSE · NO ${f(kb.forward)}`;
  }
  updateGhostHud();
}

// ---------- Combat & Arena HUD Sync ----------

function updateCombatHud(){
  const cs=CombatSystem.getState();
  const ns=NetcodeSystem.getState();
  const sig=`${cs.activeSlot}|${cs.weaponId}|${cs.magSize||0}|${cs.primaryBuild?cs.primaryBuild.weaponId:''}|${cs.secondaryBuild?cs.secondaryBuild.weaponId:''}|${cs.activeBuild?cs.activeBuild.attachmentCount:0}`;

  // Active weapon slot & ammo
  if(cs.activeSlot!==lastHudSlot||sig!==lastHudWeaponSig){
    lastHudSlot=cs.activeSlot;
    lastHudWeaponSig=sig;
    hudSlotEls.forEach(el=>el.classList.toggle('active',el.dataset.hudSlot===cs.activeSlot));
    if(hudSlotPrimaryLabel&&cs.primaryBuild)hudSlotPrimaryLabel.textContent=(cs.primaryBuild.hudTag||cs.primaryBuild.shortName||'PRI').toUpperCase();
    if(hudSlotSecondaryLabel&&cs.secondaryBuild)hudSlotSecondaryLabel.textContent=(cs.secondaryBuild.hudTag||cs.secondaryBuild.shortName||'SEC').toUpperCase();
    if(hudSlotMeleeLabel)hudSlotMeleeLabel.textContent='KNIFE';
    if(cs.activeSlot==='melee'){
      const k=KnivesSystem.getEquippedKnife(window.activeInventory);
      hudWeaponName.textContent=KnivesSystem.KNIFE_TYPES[k.knifeType].name.toUpperCase();
      if(hudBuildMeta)hudBuildMeta.textContent='SURF 100% · PURE MELEE · 0.35 KG';
      hudAmmoCur.textContent='MELEE';
      hudAmmoCur.classList.remove('low');
      hudAmmoMax.textContent='';
    }else{
      const b=cs.activeBuild;
      hudWeaponName.textContent=b?b.name.toUpperCase():(cs.weaponName||cs.activeSlot).toUpperCase();
      if(hudBuildMeta&&b){
        const surfPct=Math.round((b.surfAirMult||1)*100);
        const modStr=b.attachmentCount>0?` · ${b.attachmentCount}/5 MODS`:'';
        const supStr=b.suppressed?' · SUPP':'';
        hudBuildMeta.textContent=`SURF ${surfPct}% · ${b.weightKg.toFixed(1)} KG${modStr}${supStr}`;
      }
      hudAmmoMax.textContent=`/ ${cs.magSize||0}`;
      lastHudAmmo=-1;
    }
  }
  if(cs.activeSlot!=='melee'&&(cs.ammo!==lastHudAmmo||cs.reloading!==lastHudReloading)){
    lastHudAmmo=cs.ammo;
    lastHudReloading=cs.reloading;
    hudAmmoCur.textContent=cs.reloading?'RLD':String(cs.ammo);
    hudAmmoCur.classList.toggle('low',!cs.reloading&&cs.ammo<=Math.max(1,Math.ceil((cs.magSize||1)*0.25)));
  }
  if(cs.reloading){
    hudReloadBar.style.display='block';
    hudReloadFill.style.width=`${Math.round(cs.reloadPct*100)}%`;
  }else if(hudReloadBar.style.display!=='none'){
    hudReloadBar.style.display='none';
  }

  // Generalized Scope Overlay (ACOG / 4x / 8x Variable Sniper) + True ADS crosshair hiding
  const sc=cs.scopeOverlay||{active:false,type:'none',zoomLabel:'',hideCrosshair:false};
  const scopeKey=`${sc.active?1:0}|${sc.type}|${sc.zoomLabel}|${sc.hideCrosshair?1:0}`;
  if(scopeKey!==lastHudScopeKey){
    lastHudScopeKey=scopeKey;
    awpScopeOverlayEl.style.display=sc.active?'block':'none';
    if(sc.active){
      awpScopeOverlayEl.dataset.optic=sc.type==='acog'?'acog':'sniper';
      if(scopeZoomTagEl)scopeZoomTagEl.textContent=sc.zoomLabel||'OPTIC';
    }
    if(crosshairEl)crosshairEl.style.visibility=sc.hideCrosshair?'hidden':'visible';
  }

  // Hitmarker & Damage Vignette
  if(cs.hitmarkerTimer>0){
    hitmarkerEl.style.opacity='1';
    hitmarkerEl.style.setProperty('--hm-col',cs.hitmarkerKill?'#ff4b66':cs.hitmarkerHeadshot?'#ff9b55':'#ffffff');
  }else if(hitmarkerEl.style.opacity!=='0'){
    hitmarkerEl.style.opacity='0';
  }
  const dmgOp=cs.damageFlashTimer>0?Math.min(1,cs.damageFlashTimer/0.26):0;
  damageVignetteEl.style.opacity=dmgOp>0.01?dmgOp.toFixed(2):'0';

  // Gauntlet targets counter (courses & daily)
  const tp=CombatSystem.getTargetProgress();
  if(tp.mode==='gauntlet'&&tp.total>0){
    gauntletHudEl.style.display='block';
    const rem=tp.total-tp.hits;
    gauntletHudEl.classList.toggle('clean',rem===0);
    gauntletHudEl.textContent=rem===0
      ?`TARGETS ${tp.hits}/${tp.total} · CLEAN RUN`
      :`TARGETS ${tp.hits}/${tp.total} · +${rem.toFixed(1)}S PENALTY`;
  }else if(gauntletHudEl.style.display!=='none'){
    gauntletHudEl.style.display='none';
  }

  // Arena HP + Top Bar + Scoreboard
  if(ns.isArena){
    arenaHpWrapEl.style.display='block';
    arenaTopBarEl.style.display='flex';
    if(ns.localHp!==lastHudHp){
      lastHudHp=ns.localHp;
      hpValEl.textContent=String(ns.localHp);
      hpValEl.classList.toggle('mid',ns.localHp<=55&&ns.localHp>25);
      hpValEl.classList.toggle('low',ns.localHp<=25);
      hpFillEl.style.width=`${ns.localHp}%`;
      hpFillEl.style.background=ns.localHp>55?'#7dff9e':ns.localHp>25?'#ffd166':'#ff5470';
    }
    const showSb=(window.isScoreboardHeld||ns.phase==='match_over')&&overlay.style.display==='none';
    if(showSb){
      renderArenaScoreboard(ns);
      arenaScoreboardEl.style.display='block';
    }else if(arenaScoreboardEl.style.display!=='none'){
      arenaScoreboardEl.style.display='none';
    }
  }else{
    if(arenaHpWrapEl.style.display!=='none')arenaHpWrapEl.style.display='none';
    if(arenaTopBarEl.style.display!=='none')arenaTopBarEl.style.display='none';
    if(arenaScoreboardEl.style.display!=='none')arenaScoreboardEl.style.display='none';
  }
}

function renderArenaHudStatic(){
  const ns=NetcodeSystem.getState();
  const pauseLeave=$('pauseLeaveServer');
  if(pauseLeave)pauseLeave.style.display=ns.isArena?'':'none';
  if(!ns.isArena){
    killFeedEl.textContent='';
    return;
  }
  if(ns.role==='warmup'){
    const cs=CombatSystem.getState();
    arenaScoreLineEl.textContent=`SOLO WARMUP · HOLOGRAM BOTS · ${cs.warmupKills} KILLS`;
    arenaSubLineEl.textContent='PRACTICE AIM & SURF · 1-4 WEAPONS · C RELOAD';
  }else if(ns.phase==='warmup'){
    const codeTag=ns.lobby&&ns.lobby.isPrivate?` · PRIVATE CODE: ${ns.lobby.joinCode}`:' · LISTED ON PUBLIC BOARD';
    arenaScoreLineEl.textContent=`WAITING FOR PLAYERS (${ns.players.length}/${ns.lobby?ns.lobby.maxPlayers:2})${codeTag}`;
    arenaSubLineEl.textContent='SHOOT HOLOGRAM BOTS WHILE WAITING · MATCH STARTS AUTOMATICALLY';
  }else if(ns.mode==='duel_1v1'){
    const p1=ns.players[0]||{name:'P1',score:0};
    const p2=ns.players[1]||{name:'P2',score:0};
    arenaScoreLineEl.textContent=`${p1.name} ${p1.score}  —  ${p2.score} ${p2.name}  ·  ROUND ${ns.round}`;
    arenaSubLineEl.textContent=ns.phase==='match_over'?'MATCH COMPLETE · FIRST TO 5':'1v1 DUEL · FIRST TO 5 ROUNDS · HOLD TAB FOR SCOREBOARD';
  }else{
    const lead=ns.players[0];
    arenaScoreLineEl.textContent=lead
      ?`FFA LEADER: ${lead.name} (${lead.kills}/${CombatSystem.FFA_WIN_KILLS}) · ${ns.players.length} PLAYERS`
      :`FREE-FOR-ALL · FIRST TO ${CombatSystem.FFA_WIN_KILLS} KILLS`;
    arenaSubLineEl.textContent='HOLD TAB FOR SCOREBOARD · 2.5S RESPAWN';
  }
}

function renderKillFeed(entries){
  if(!killFeedEl)return;
  killFeedEl.textContent='';
  for(const e of entries){
    const row=document.createElement('div');
    row.className='kf-row'+(e.headshot?' hs':'');
    const wep=document.createElement('span');
    wep.className='kf-wep';
    wep.textContent=e.headshot?`[${e.weapon} ★HS]`:`[${e.weapon}]`;
    row.appendChild(document.createTextNode(e.killer));
    row.appendChild(wep);
    row.appendChild(document.createTextNode(e.victim));
    killFeedEl.appendChild(row);
  }
}

function renderArenaScoreboard(ns){
  if(!sbTableEl)return;
  sbTitleEl.textContent=ns.phase==='match_over'
    ?(ns.matchWinnerUid===ns.localUid?'VICTORY — MATCH COMPLETE':`${ns.matchWinnerName.toUpperCase()} WINS`)
    :(ns.lobby?ns.lobby.roomName.toUpperCase():'ARENA SCOREBOARD');
  sbSubEl.textContent=ns.mode==='duel_1v1'
    ?`1v1 DUEL · FIRST TO 5 · ROUND ${ns.round}`
    :`FREE-FOR-ALL · FIRST TO ${CombatSystem.FFA_WIN_KILLS}`;
  sbTableEl.textContent='';
  const hdr=document.createElement('div');
  hdr.className='sb-row hdr';
  hdr.innerHTML='<span>PLAYER</span><span>SCORE</span><span>KILLS</span><span>DEATHS</span>';
  sbTableEl.appendChild(hdr);
  for(const pl of ns.players){
    const row=document.createElement('div');
    row.className='sb-row'+(pl.uid===ns.localUid?' me':'');
    const c1=document.createElement('span');c1.textContent=pl.name;
    const c2=document.createElement('span');c2.textContent=String(pl.score);
    const c3=document.createElement('span');c3.textContent=String(pl.kills);
    const c4=document.createElement('span');c4.textContent=String(pl.deaths);
    row.append(c1,c2,c3,c4);
    sbTableEl.appendChild(row);
  }
  sbActionsEl.style.display=ns.phase==='match_over'?'flex':'none';
}

function applySettingsToRuntime(){
  const s=window.activeSettings;
  applyCrosshairGlyph(crosshairEl,s.crosshair);
  ViewmodelSystem.applySettings(s);
  renderControlsLegend();
  const user=window.DailyBackend?window.DailyBackend.getState().user:null;
  renderAuthHeaderName(user);
  updateLeaderboardAuthNote();
}

function updateSettingsSyncLabel(override){
  if(!settingsSyncNote)return;
  if(override){settingsSyncNote.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null,online:false};
  if(st.user&&st.user.emailVerified){
    settingsSyncNote.textContent='CLOUD SYNCED';
  }else{
    settingsSyncNote.textContent='LOCAL ONLY';
  }
}

function scheduleCloudSettingsSave(syncNameChange){
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified){
    updateSettingsSyncLabel('LOCAL ONLY');
    return;
  }
  updateSettingsSyncLabel('SAVING...');
  if(cloudSaveTimer)clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(async()=>{
    cloudSaveTimer=null;
    try{
      const res=await window.DailyBackend.saveUserSettings(window.activeSettings);
      updateSettingsSyncLabel(res&&res.saved?'CLOUD SYNCED':'LOCAL ONLY');
      if(syncNameChange){
        const todayKey=DailyCourseGen.getTodayDateKey();
        const keysToSync=new Set([todayKey]);
        if(selectedDateKey&&DailyCourseGen.isValidDateKey(selectedDateKey))keysToSync.add(selectedDateKey);
        for(const dk of keysToSync){
          await window.DailyBackend.syncDisplayNameToRun(dk,window.activeSettings.displayName).catch(()=>{});
        }
      }
    }catch(_){
      updateSettingsSyncLabel('LOCAL FALLBACK');
    }
  },350);
}

function commitSettings(nextSettings,opts){
  const options=opts||{};
  window.activeSettings=VelocitySettings.saveLocal(nextSettings);
  applySettingsToRuntime();
  renderSettingsPanel();
  if(!options.skipCloud){
    scheduleCloudSettingsSave(!!options.syncNameChange);
  }
}

function cancelRebind(){
  if(!rebindingActionId)return;
  rebindingActionId=null;
  window.isRebindingInput=false;
  window.removeEventListener('keydown',onRebindKeyDown,true);
  window.removeEventListener('mousedown',onRebindMouseDown,true);
  window.removeEventListener('contextmenu',onRebindContextMenu,true);
  if(keybindHintEl){
    keybindHintEl.textContent='Click any control to rebind. Supports keyboard keys and mouse buttons (LMB, RMB, MMB, Mouse 4/5). Press ESC to cancel.';
  }
  renderKeybindGrid();
}

function applyCapturedToken(token){
  const targetId=rebindingActionId;
  cancelRebind();
  if(!targetId||!VelocitySettings.isValidInputToken(token))return;
  const res=VelocitySettings.rebindAction(window.activeSettings,targetId,token);
  if(!res.changed)return;
  commitSettings(res.settings);
  if(res.swappedWith){
    const otherMeta=VelocitySettings.ACTIONS.find(a=>a.id===res.swappedWith);
    showToast(`BOUND ${VelocitySettings.formatInputToken(token)} · SWAPPED WITH ${(otherMeta?otherMeta.label:res.swappedWith).toUpperCase()}`);
  }else{
    showToast(`BOUND TO ${VelocitySettings.formatInputToken(token)}`);
  }
}

function onRebindKeyDown(e){
  e.preventDefault();
  e.stopPropagation();
  if(e.code==='Escape'){
    cancelRebind();
    return;
  }
  if(VelocitySettings.isValidInputToken(e.code)){
    applyCapturedToken(e.code);
  }
}

function onRebindMouseDown(e){
  e.preventDefault();
  e.stopPropagation();
  const tok=VelocitySettings.mouseButtonToToken(e.button);
  if(tok)applyCapturedToken(tok);
}

function onRebindContextMenu(e){
  e.preventDefault();
  e.stopPropagation();
}

function startRebind(actionId){
  if(rebindingActionId===actionId){cancelRebind();return;}
  cancelRebind();
  rebindingActionId=actionId;
  window.isRebindingInput=true;
  const meta=VelocitySettings.ACTIONS.find(a=>a.id===actionId);
  if(keybindHintEl){
    keybindHintEl.textContent=`Listening for "${meta?meta.label:actionId}" — press any key or mouse button (ESC to cancel).`;
  }
  renderKeybindGrid();
  setTimeout(()=>{
    if(rebindingActionId!==actionId)return;
    window.addEventListener('keydown',onRebindKeyDown,true);
    window.addEventListener('mousedown',onRebindMouseDown,true);
    window.addEventListener('contextmenu',onRebindContextMenu,true);
  },0);
}

function renderKeybindGrid(){
  if(!keybindGridEl)return;
  const kb=window.activeSettings.keybinds;
  keybindGridEl.textContent='';
  for(const act of VelocitySettings.ACTIONS){
    const row=document.createElement('div');
    row.className='kb-row';

    const left=document.createElement('div');
    const grp=document.createElement('span');
    grp.className='kb-group';
    grp.textContent=act.group;
    const nm=document.createElement('span');
    nm.className='kb-name';
    nm.textContent=act.label;
    left.appendChild(grp);
    left.appendChild(nm);

    const btn=document.createElement('button');
    btn.type='button';
    const listening=rebindingActionId===act.id;
    btn.className='bind-btn'+(listening?' listening':'');
    btn.dataset.action=act.id;
    btn.textContent=listening?'PRESS INPUT...':VelocitySettings.formatInputToken(kb[act.id]);
    btn.onclick=()=>startRebind(act.id);

    row.appendChild(left);
    row.appendChild(btn);
    keybindGridEl.appendChild(row);
  }
}

function renderSettingsPanel(){
  const s=window.activeSettings;
  if(document.activeElement!==setDisplayNameInput){
    setDisplayNameInput.value=s.displayName;
  }
  setDisplayNameCount.textContent=`${s.displayName.length} / 32`;
  const user=window.DailyBackend?window.DailyBackend.getState().user:null;
  const effName=getEffectiveUserName(user);
  setDisplayNameNote.textContent=user
    ?`Leaderboard name: "${effName}" · Synced to your Google account.`
    :`Active local name: "${effName}" · Sign in with Google to sync across devices.`;

  setSensRange.value=String(s.sensitivity);
  setSensVal.textContent=s.sensitivity.toFixed(2)+'×';
  setInvertOff.classList.toggle('active',!s.invertY);
  setInvertOn.classList.toggle('active',!!s.invertY);
  setFovRange.value=String(s.baseFov);
  setFovVal.textContent=s.baseFov+'°';
  const vm=s.viewmodel||VelocitySettings.DEFAULT_VIEWMODEL;
  const fmtOff=(v)=>(v>0?'+':'')+Number(v).toFixed(1);
  if(setVmXRange){setVmXRange.value=String(vm.offsetX);setVmXVal.textContent=fmtOff(vm.offsetX);}
  if(setVmYRange){setVmYRange.value=String(vm.offsetY);setVmYVal.textContent=fmtOff(vm.offsetY);}
  if(setVmZRange){setVmZRange.value=String(vm.offsetZ);setVmZVal.textContent=fmtOff(vm.offsetZ);}
  if(setVmFovRange){setVmFovRange.value=String(vm.fov);setVmFovVal.textContent=vm.fov+'°';}

  setChSizeRange.value=String(s.crosshair.size);
  setChSizeVal.textContent=s.crosshair.size+'px';
  document.querySelectorAll('[data-ch-style]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.chStyle===s.crosshair.style);
  });
  document.querySelectorAll('[data-ch-color]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.chColor===s.crosshair.color);
  });
  applyCrosshairGlyph(crosshairPreviewEl,s.crosshair);
  chPreviewLabel.textContent=`${s.crosshair.style.toUpperCase()} · ${s.crosshair.size}PX`;
  chPreviewHex.textContent=s.crosshair.style==='none'?'HIDDEN':s.crosshair.color.toUpperCase();

  renderKeybindGrid();
}

function setSettingsTab(tab){
  cancelRebind();
  activeSettingsTab=tab;
  document.querySelectorAll('[data-set-tab]').forEach(btn=>{
    const on=btn.dataset.setTab===tab;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  document.querySelectorAll('[data-set-pane]').forEach(pane=>{
    pane.style.display=pane.dataset.setPane===tab?'':'none';
  });
}

function openSettings(returnTo){
  cancelRebind();
  stopRouletteAnimation();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  settingsReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  settingsPanelEl.style.display='';
  settingsBackBtn.textContent=settingsReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='settings';
  document.exitPointerLock?.();
  updateSettingsSyncLabel();
  setSettingsTab(activeSettingsTab);
  renderSettingsPanel();
}

function closeSettings(){
  cancelRebind();
  if(settingsReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

// ---------- Armory, CS Cases & 3D Weapon/Knife/Glove Showcase ----------
function getThumbForItem(item){
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const key=isWeapon
    ?`weapon_${item.weaponType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`
    :isGlove
      ?`glove_${item.gloveType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`
      :`knife_${item.knifeType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`;
  if(thumbCache.has(key))return thumbCache.get(key);
  const url=isWeapon?renderWeaponThumbDataUrl(item):isGlove?renderGloveThumbDataUrl(item):renderKnifeThumbDataUrl(item);
  if(thumbCache.size>240)thumbCache.clear();
  thumbCache.set(key,url);
  return url;
}

function updateArmoryBadges(){
  const coins=window.activeInventory.coins||0;
  const casesTotal=KnivesSystem.totalCaseCount(window.activeInventory);
  const weaponTotal=(window.activeInventory.weapons||[]).length;
  const knifeTotal=window.activeInventory.knives.length;
  const gloveTotal=window.activeInventory.gloves.length;
  const invTotal=weaponTotal+knifeTotal+gloveTotal;
  if(armoryCoinBalance)armoryCoinBalance.textContent=`${fmtCoins(coins)} COINS`;
  if(menuArmoryBtn){
    menuArmoryBtn.textContent=casesTotal>0
      ?`ARMORY · ${fmtCoins(coins)}C (${casesTotal})`
      :`ARMORY · ${fmtCoins(coins)}C`;
  }
  if(armTabCases)armTabCases.textContent=casesTotal>0?`CASE SHOP (${casesTotal})`:'CASE SHOP';
  if(armTabInventory)armTabInventory.textContent=`INVENTORY (${invTotal})`;
  const catW=$('invCatWeapons'),catK=$('invCatKnives'),catG=$('invCatGloves');
  if(catW)catW.textContent=`WEAPONS (${weaponTotal})`;
  if(catK)catK.textContent=`KNIVES (${knifeTotal})`;
  if(catG)catG.textContent=`GLOVES (${gloveTotal})`;
  if(armoryOpenedStat)armoryOpenedStat.textContent=`${window.activeInventory.totalOpened} UNBOXED`;
}

function updateArmorySyncLabel(override){
  if(!armorySyncNote)return;
  if(override){armorySyncNote.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  armorySyncNote.textContent=(st.user&&st.user.emailVerified)?'CLOUD SYNCED':'LOCAL ONLY';
}

function persistInventorySummary(syncCloud=true,options){
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory,undefined,options);
  KnivesSystem.setLocalDirty(!window.VELOCITY_TEST_MODE);
  updateArmoryBadges();
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
    return Promise.resolve({saved:false,testMode:true});
  }
  if(syncCloud&&window.DailyBackend){
    const st=window.DailyBackend.getState();
    if(st.user&&st.user.emailVerified){
      updateArmorySyncLabel('SAVING...');
      return window.DailyBackend.saveUserInventorySummary(window.activeInventory)
        .then(r=>{
          if(r&&r.saved){
            if(KnivesSystem.loadPendingSoldItems().length===0){
              KnivesSystem.setLocalDirty(false);
            }
            updateArmorySyncLabel('CLOUD SYNCED');
          }else{
            updateArmorySyncLabel('LOCAL ONLY');
          }
          return r;
        })
        .catch(err=>{
          console.warn('Cloud inventory summary sync failed; local backup preserved:',err);
          updateArmorySyncLabel('LOCAL FALLBACK');
          return {saved:false};
        });
    }
  }
  return Promise.resolve({saved:false});
}

function applySpecialTagBadge(el,tag){
  if(!el)return;
  if(!tag){el.style.display='none';return;}
  el.style.display='inline-block';
  el.textContent=tag;
  el.className='arm-special-tag';
  if(tag==='BLUE GEM')el.classList.add('gem');
  else if(tag==='RUBY'||tag==='FIRE & ICE')el.classList.add('ruby');
  else if(tag==='SAPPHIRE')el.classList.add('sapphire');
}

function fillItemSpecs(prefix,item){
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
  const wear=KnivesSystem.getWearGrade(item.floatValue);
  const sk=isWeapon
    ?(KnivesSystem.WEAPON_SKINS[item.skinId]||KnivesSystem.WEAPON_SKINS.factory_slate)
    :isGlove
      ?(KnivesSystem.GLOVE_SKINS[item.skinId]||KnivesSystem.GLOVE_SKINS.tactical_slate)
      :(KnivesSystem.SKINS[item.skinId]||KnivesSystem.SKINS.vanilla);
  const bar=$(prefix+'StageBar');
  if(bar)bar.style.setProperty('--rar-col',rar.color);
  const rarEl=$(prefix+'Rarity');
  if(rarEl){
    if(isWeapon){
      const wt=KnivesSystem.WEAPON_TYPES[item.weaponType];
      rarEl.textContent=`${rar.label} · ${(wt?wt.shortName:'FIREARM').toUpperCase()}`;
    }else if(isGlove){
      rarEl.textContent=`${rar.label} · GLOVES`;
    }else{
      rarEl.textContent=`${rar.label} · KNIFE`;
    }
    rarEl.style.setProperty('--rar-col',rar.color);
  }
  $(prefix+'Title').textContent=KnivesSystem.formatItemFullName(item);
  applySpecialTagBadge($(prefix+'SpecialTag'),item.specialTag);
  $(prefix+'Wear').textContent=`${wear.code} · ${wear.name}`;
  $(prefix+'Float').textContent=KnivesSystem.formatFloat(item.floatValue);
  $(prefix+'Seed').textContent=sk.patternBased?`#${item.patternSeed}`:'FIXED';
  const extraK=$(prefix+'ExtraK'),extraV=$(prefix+'ExtraV');
  if(item.skinId==='case_hardened'){
    extraK.textContent=isGlove?'Knuckle Blue':'Play-Side Blue';
    extraV.textContent=`${item.bluePct}%`;
  }else if(item.skinId==='fade'){
    extraK.textContent='Fade Coverage';
    extraV.textContent=`${item.bluePct}%`;
  }else if(isWeapon){
    const wt=KnivesSystem.WEAPON_TYPES[item.weaponType];
    extraK.textContent='Loadout Slot';
    extraV.textContent=wt?`[${wt.slot}] ${wt.shortName}`:'Firearm';
  }else if(isGlove){
    const gt=KnivesSystem.GLOVE_TYPES[item.gloveType];
    extraK.textContent='Archetype';
    extraV.textContent=gt?gt.shortName:'Standard';
  }else{
    const cDef=KnivesSystem.CASES[item.caseId];
    extraK.textContent='Container';
    extraV.textContent=cDef?cDef.name.replace(' Case',''):'Starter';
  }
  const marker=$(prefix+'FloatMarker');
  if(marker)marker.style.left=`${Math.max(1,Math.min(99,item.floatValue*100))}%`;
}

function mountArmoryCanvas(hostEl,item,gloveItem,mode){
  if(!hostEl||!armoryPreviewCanvas)return;
  if(armoryPreviewCanvas.parentElement!==hostEl){
    const caption=hostEl.querySelector('.arm-stage-caption');
    if(caption)hostEl.insertBefore(armoryPreviewCanvas,caption);
    else hostEl.appendChild(armoryPreviewCanvas);
  }
  const g=gloveItem||KnivesSystem.getEquippedGlove(window.activeInventory);
  if(item&&KnivesSystem.isWeaponItem(item)){
    ArmoryPreview.showWeaponCombo(armoryPreviewCanvas,item,g,{mode:mode||'combo'});
  }else{
    const k=(item&&!KnivesSystem.isGloveItem(item))?item:KnivesSystem.getEquippedKnife(window.activeInventory);
    ArmoryPreview.showCombo(armoryPreviewCanvas,k,g,{mode:mode||'combo'});
  }
}

function stopRouletteAnimation(){
  if(rouletteRafId){
    cancelAnimationFrame(rouletteRafId);
    rouletteRafId=0;
  }
  rouletteFinishCb=null;
}

function renderArmoryCases(){
  if(!armoryCaseGrid)return;
  const coins=window.activeInventory.coins||0;
  armoryCaseGrid.textContent='';
  for(const cid of KnivesSystem.CASE_IDS){
    const c=KnivesSystem.CASES[cid];
    const count=window.activeInventory.caseCounts[cid]||0;
    const price=KnivesSystem.getCasePrice(cid);
    const odds=KnivesSystem.getCaseOdds(cid);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='case-card'+(cid===selectedCaseId?' selected':'');
    btn.style.setProperty('--case-accent',c.accent);
    btn.dataset.caseId=cid;

    const art=document.createElement('div');
    art.className='case-art case-art-'+cid;
    const sigil=document.createElement('span');
    sigil.className='case-sigil';
    sigil.textContent=c.artCode||c.shortName.slice(0,2).toUpperCase();
    sigil.setAttribute('aria-hidden','true');
    const crate=document.createElement('div');
    crate.className='case-crate';
    const lock=document.createElement('div');
    lock.className='case-crate-lock';
    crate.appendChild(lock);
    art.appendChild(crate);
    art.appendChild(sigil);

    const top=document.createElement('div');
    top.className='case-top';
    const nm=document.createElement('span');
    nm.className='case-name';
    nm.textContent=c.name;
    const tier=document.createElement('span');
    tier.className='case-tier';
    tier.textContent=c.tierLabel||'TIER';
    top.appendChild(nm);
    top.appendChild(tier);

    const priceRow=document.createElement('div');
    priceRow.className='case-price-row';
    const pr=document.createElement('span');
    pr.className='case-price';
    pr.textContent=`${fmtCoins(price)} COINS`;
    const own=document.createElement('span');
    own.className='case-owned-tag'+(count>0?'':' odds');
    own.textContent=count>0?`OWNED ×${count}`:`${odds.gold}% GOLD`;
    priceRow.appendChild(pr);
    priceRow.appendChild(own);

    const desc=document.createElement('div');
    desc.className='case-desc';
    desc.textContent=c.description;

    btn.appendChild(art);
    btn.appendChild(top);
    btn.appendChild(priceRow);
    btn.appendChild(desc);
    btn.onclick=()=>{selectedCaseId=cid;renderArmoryCases();};
    armoryCaseGrid.appendChild(btn);
  }

  const sel=KnivesSystem.CASES[selectedCaseId]||KnivesSystem.CASES.velocity;
  const selCount=window.activeInventory.caseCounts[sel.id]||0;
  const selPrice=KnivesSystem.getCasePrice(sel.id);
  const selOdds=KnivesSystem.getCaseOdds(sel.id);
  const canAfford=coins>=selPrice;
  const deficit=Math.max(0,selPrice-coins);

  selectedCaseTitle.textContent=`${sel.name.toUpperCase()} · ${sel.tierLabel} · ${fmtCoins(selPrice)} COINS`;
  if(caseOddsLine){
    caseOddsLine.textContent=`ODDS: ${selOdds.milspec}% MIL-SPEC · ${selOdds.restricted}% RESTRICTED · ${selOdds.classified}% CLASSIFIED · ${selOdds.covert}% COVERT · ${selOdds.gold}% GOLD`;
  }
  selectedCasePool.textContent='';
  const previewTiers=['gold','covert','classified','restricted','milspec'];
  for(const rid of previewTiers){
    const entries=sel.pools[rid]||[];
    const rar=KnivesSystem.RARITIES[rid];
    const picked=rid==='gold'
      ?[...entries.filter(e=>e.itemKind==='knife'||(!e.itemKind&&e.knifeType)).slice(0,2),...entries.filter(e=>e.itemKind==='glove').slice(0,2)]
      :entries.slice(0,2);
    for(const e of picked){
      const tag=document.createElement('span');
      tag.className='case-pool-item';
      tag.style.setProperty('--rar-col',rar.color);
      if(e.itemKind==='weapon'){
        const wShort=KnivesSystem.WEAPON_TYPES[e.weaponType].shortName;
        const wsName=KnivesSystem.WEAPON_SKINS[e.skinId].name;
        tag.textContent=`${wShort} | ${wsName}`;
      }else if(e.itemKind==='glove'){
        const gName=KnivesSystem.GLOVE_TYPES[e.gloveType].name;
        const gsName=KnivesSystem.GLOVE_SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`★ ${gName} | ${gsName}${suffix}`;
      }else{
        const kShort=KnivesSystem.KNIFE_TYPES[e.knifeType].shortName;
        const sName=KnivesSystem.SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceGem?' (Gem)':e.forceFireIce?' (Fire & Ice)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`★ ${kShort} | ${sName}${suffix}`;
      }
      selectedCasePool.appendChild(tag);
    }
  }

  if(selCount>0){
    openCaseBtn.disabled=false;
    openCaseBtn.textContent=`OPEN OWNED (${selCount})`;
    if(buyCaseBtn){
      buyCaseBtn.style.display='';
      buyCaseBtn.disabled=!canAfford;
      buyCaseBtn.textContent=canAfford
        ?`BUY +1 CASE · ${fmtCoins(selPrice)}C`
        :`NEED ${fmtCoins(deficit)}C TO BUY`;
    }
    openCaseHint.textContent=`Consumes 1 owned container · ${selOdds.gold}% Gold Knives & Gloves`;
  }else{
    if(buyCaseBtn)buyCaseBtn.style.display='none';
    openCaseBtn.disabled=!canAfford;
    openCaseBtn.textContent=canAfford
      ?`BUY & OPEN · ${fmtCoins(selPrice)} COINS`
      :`NEED ${fmtCoins(deficit)} MORE COINS`;
    openCaseHint.textContent=canAfford
      ?`Deducts ${fmtCoins(selPrice)} coins & unlocks immediately · ${selOdds.gold}% Gold`
      :`Beat courses, set PBs, win arenas, or sell skins for ${fmtCoins(deficit)} more coins`;
  }
  updateArmoryBadges();
}

function buyCaseOnly(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const res=KnivesSystem.buyCase(window.activeInventory,cid);
  if(!res.purchased){
    showToast(`NEED ${fmtCoins(res.deficit)} MORE COINS`);
    return;
  }
  window.activeInventory=res.inventory;
  persistInventorySummary(true);
  CaseAudio.coinChime('buy');
  renderArmoryCases();
  const cDef=KnivesSystem.CASES[cid];
  showToast(`PURCHASED ${cDef.name.toUpperCase()} · -${fmtCoins(res.price)} COINS`);
}

function showCasesView(mode){
  armoryCasesSelect.style.display=mode==='select'?'':'none';
  armoryRouletteWrap.style.display=mode==='roulette'?'':'none';
  armoryRevealWrap.style.display=mode==='reveal'?'':'none';
  if(mode!=='reveal')ArmoryPreview.stop();
}

function weaponEquipField(weaponType){
  if(weaponType==='smg')return 'equippedSmgId';
  if(weaponType==='shotgun')return 'equippedShotgunId';
  if(weaponType==='awp')return 'equippedAwpId';
  if(weaponType==='deagle')return 'equippedDeagleId';
  if(weaponType==='pistol')return 'equippedPistolId';
  return 'equippedRifleId';
}

function isWeaponEquipped(item){
  if(!item||!KnivesSystem.isWeaponItem(item))return false;
  return window.activeInventory[weaponEquipField(item.weaponType)]===item.id;
}

function refreshRevealActionButtons(){
  if(!lastRevealedItem)return;
  const item=lastRevealedItem;
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const isEq=KnivesSystem.isItemEquippedInInventory(window.activeInventory,item);
  $('revealEquipBtn').textContent=isEq?'EQUIPPED':(isWeapon?'EQUIP SKIN':isGlove?'EQUIP GLOVES':'EQUIP KNIFE');
  $('revealEquipBtn').disabled=isEq;

  const sellCheck=KnivesSystem.isItemSellable(window.activeInventory,item);
  const wear=KnivesSystem.getWearGrade(item.floatValue);
  if(revealValueLine){
    revealValueLine.textContent=`MARKET VALUE · ${fmtCoins(sellCheck.value)} COINS · ${wear.code}`;
  }
  if(revealSellBtn){
    revealSellBtn.disabled=!sellCheck.sellable;
    revealSellBtn.textContent=sellCheck.sellable
      ?`QUICK SELL · +${fmtCoins(sellCheck.value)}C`
      :sellCheck.reason;
  }

  const cid=KnivesSystem.CASES[selectedCaseId]?selectedCaseId:'velocity';
  const remCount=window.activeInventory.caseCounts[cid]||0;
  const price=KnivesSystem.getCasePrice(cid);
  const coins=window.activeInventory.coins||0;
  const openAgainBtn=$('revealOpenAgainBtn');
  if(remCount>0){
    openAgainBtn.disabled=false;
    openAgainBtn.textContent=`OPEN OWNED (${remCount})`;
  }else if(coins>=price){
    openAgainBtn.disabled=false;
    openAgainBtn.textContent=`BUY & OPEN · ${fmtCoins(price)}C`;
  }else{
    openAgainBtn.disabled=true;
    openAgainBtn.textContent=`NEED ${fmtCoins(price-coins)}C`;
  }
}

function showRevealStage(item){
  stopRouletteAnimation();
  lastRevealedItem=item;
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  if(isWeapon)selectedInvWeaponId=item.id;
  else if(isGlove)selectedInvGloveId=item.id;
  else selectedInvKnifeId=item.id;
  showCasesView('reveal');
  fillItemSpecs('reveal',item);
  refreshRevealActionButtons();
  const revTrickBtn=$('revealTrickBtn'),revMythicBtn=$('revealMythicBtn');
  if(revTrickBtn){
    revTrickBtn.style.display='';
    revTrickBtn.textContent=isWeapon?'INSPECT':'PLAY TRICK';
  }
  if(revMythicBtn){
    revMythicBtn.style.display='';
    revMythicBtn.textContent=isWeapon?'RARE TRICK ★':'MYTHIC ★';
  }
  const previewGlove=isGlove?item:KnivesSystem.getEquippedGlove(window.activeInventory);
  const previewItem=isGlove?KnivesSystem.getEquippedKnife(window.activeInventory):item;
  mountArmoryCanvas(armoryRevealStage,previewItem,previewGlove,'combo');
  CaseAudio.reveal(item.rarity);
}

function startCaseUnboxing(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const cDef=KnivesSystem.CASES[cid];
  let curCount=window.activeInventory.caseCounts[cid]||0;
  if(curCount<=0){
    const bought=KnivesSystem.buyCase(window.activeInventory,cid);
    if(!bought.purchased){
      showToast(`NEED ${fmtCoins(bought.deficit)} MORE COINS FOR ${cDef.shortName.toUpperCase()}`);
      renderArmoryCases();
      return;
    }
    window.activeInventory=bought.inventory;
    curCount=window.activeInventory.caseCounts[cid]||0;
    CaseAudio.coinChime('buy');
  }
  selectedCaseId=cid;
  const roll=KnivesSystem.rollCaseDrop(cid);
  const isGloveWin=KnivesSystem.isGloveItem(roll.winner);
  const isWeaponWin=KnivesSystem.isWeaponItem(roll.winner);

  // Commit immediately so the drop is safe even if user skips or closes Armory
  window.activeInventory.caseCounts[cid]=Math.max(0,curCount-1);
  window.activeInventory.totalOpened=(window.activeInventory.totalOpened||0)+1;
  if(isWeaponWin){
    window.activeInventory.weapons.unshift(roll.winner);
  }else if(isGloveWin){
    window.activeInventory.gloves.unshift(roll.winner);
  }else{
    window.activeInventory.knives.unshift(roll.winner);
  }
  // Save locally first so a force-reload mid-spin can NEVER lose the unboxed skin
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory);
  KnivesSystem.setLocalDirty(!window.VELOCITY_TEST_MODE);
  updateArmoryBadges();
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
  }else if(window.DailyBackend){
    const st=window.DailyBackend.getState();
    if(st.user&&st.user.emailVerified){
      const invSnapshot=window.activeInventory;
      const wonItem=roll.winner;
      updateArmorySyncLabel('SAVING...');
      window.DailyBackend.saveUserInventorySummary(invSnapshot)
        .then(sumRes=>{
          if(!sumRes||!sumRes.saved)return {saved:false};
          if(isWeaponWin)return window.DailyBackend.saveCloudWeapon(wonItem,invSnapshot);
          if(isGloveWin)return window.DailyBackend.saveCloudGlove(wonItem,invSnapshot);
          return window.DailyBackend.saveCloudKnife(wonItem,invSnapshot);
        })
        .then(itemRes=>{
          if(itemRes&&itemRes.saved){
            if(KnivesSystem.loadPendingSoldItems().length===0){
              KnivesSystem.setLocalDirty(false);
            }
            updateArmorySyncLabel('CLOUD SYNCED');
          }else{
            updateArmorySyncLabel('LOCAL FALLBACK');
          }
        })
        .catch(err=>{
          console.warn('Cloud skin save failed; preserved locally for automatic backfill:',err);
          updateArmorySyncLabel('LOCAL FALLBACK');
        });
    }
  }

  showCasesView('roulette');
  rouletteCaseLabel.textContent=`UNLOCKING ${cDef.name.toUpperCase()}`;
  rouletteStatus.textContent='ROLLING PATTERN SEED & WEAR FLOAT...';

  // Populate 45-card roulette strip
  rouletteTrack.textContent='';
  rouletteTrack.style.transform='translate3d(0px,0,0)';
  for(const cardItem of roll.strip){
    const isGloveCard=KnivesSystem.isGloveItem(cardItem);
    const isWeaponCard=KnivesSystem.isWeaponItem(cardItem);
    const rar=KnivesSystem.RARITIES[cardItem.rarity]||KnivesSystem.RARITIES.milspec;
    const card=document.createElement('div');
    card.className='roulette-card'+(cardItem.rarity==='gold'?' gold':'');
    card.style.setProperty('--rar-col',rar.color);

    const img=document.createElement('img');
    img.className='roulette-thumb';
    img.alt=KnivesSystem.formatItemFullName(cardItem);
    img.src=getThumbForItem(cardItem);

    const info=document.createElement('div');
    const kn=document.createElement('div');
    kn.className='roulette-kname';
    kn.textContent=isWeaponCard
      ?KnivesSystem.WEAPON_TYPES[cardItem.weaponType].name
      :isGloveCard
        ?KnivesSystem.GLOVE_TYPES[cardItem.gloveType].name
        :KnivesSystem.KNIFE_TYPES[cardItem.knifeType].name;
    const sn=document.createElement('div');
    sn.className='roulette-sname';
    const skinName=isWeaponCard
      ?KnivesSystem.WEAPON_SKINS[cardItem.skinId].name
      :isGloveCard
        ?KnivesSystem.GLOVE_SKINS[cardItem.skinId].name
        :KnivesSystem.SKINS[cardItem.skinId].name;
    sn.textContent=cardItem.specialTag?`${skinName} · ${cardItem.specialTag}`:skinName;
    info.appendChild(kn);
    info.appendChild(sn);

    card.appendChild(img);
    card.appendChild(info);
    rouletteTrack.appendChild(card);
  }

  const CARD_W=148;
  const GAP=8;
  const PITCH=CARD_W+GAP;
  const vpW=Math.max(300,rouletteViewport.clientWidth||780);
  const targetX=roll.winIndex*PITCH+CARD_W*0.5+roll.landingJitter*CARD_W-vpW*0.5;
  const DURATION=4200;
  const t0=performance.now();
  let lastCrossedIdx=-1;

  rouletteFinishCb=()=>showRevealStage(roll.winner);

  function stepRoulette(now){
    const elapsed=now-t0;
    const p=Math.min(1,elapsed/DURATION);
    const eased=1-Math.pow(1-p,4);
    const curX=targetX*eased;
    rouletteTrack.style.transform=`translate3d(${-curX.toFixed(1)}px,0,0)`;

    const centerIdx=Math.floor((curX+vpW*0.5)/PITCH);
    if(centerIdx!==lastCrossedIdx){
      lastCrossedIdx=centerIdx;
      CaseAudio.tick(Math.max(0.05,1-p));
    }

    if(p<1){
      rouletteRafId=requestAnimationFrame(stepRoulette);
    }else{
      rouletteRafId=0;
      rouletteStatus.textContent=`UNBOXED: ${KnivesSystem.formatItemFullName(roll.winner).toUpperCase()}`;
      setTimeout(()=>{
        if(rouletteFinishCb){
          const fn=rouletteFinishCb;
          rouletteFinishCb=null;
          fn();
        }
      },260);
    }
  }
  rouletteRafId=requestAnimationFrame(stepRoulette);
}

function equipWeaponById(weaponId){
  const found=(window.activeInventory.weapons||[]).find(w=>w.id===weaponId);
  if(!found)return;
  window.activeInventory[weaponEquipField(found.weaponType)]=found.id;
  if(window.activeLoadouts&&window.activeLoadouts.equippedWeaponSkins){
    window.activeLoadouts.equippedWeaponSkins[found.weaponType]=found.id;
    window.activeLoadouts=LoadoutsSystem.saveLocal(window.activeLoadouts);
    scheduleCloudLoadoutsSave();
  }
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipWeaponSkin(found);
  applyActiveLoadoutToRuntime({keepSlot:true});
  showToast(`EQUIPPED ${KnivesSystem.formatWeaponFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function equipKnifeById(knifeId){
  const found=window.activeInventory.knives.find(k=>k.id===knifeId);
  if(!found)return;
  window.activeInventory.equippedKnifeId=found.id;
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipKnife(found,true);
  showToast(`EQUIPPED ${KnivesSystem.formatKnifeFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function equipGloveById(gloveId){
  const found=window.activeInventory.gloves.find(g=>g.id===gloveId);
  if(!found)return;
  window.activeInventory.equippedGloveId=found.id;
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipGlove(found);
  showToast(`EQUIPPED ${KnivesSystem.formatGloveFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function getAllInventoryItems(){
  return [
    ...(window.activeInventory.weapons||[]),
    ...(window.activeInventory.knives||[]),
    ...(window.activeInventory.gloves||[])
  ];
}

function getVisibleInventoryList(){
  const isWeaponCat=invCategory==='weapons';
  const isGloveCat=invCategory==='gloves';
  const sourceList=isWeaponCat?(window.activeInventory.weapons||[]):isGloveCat?window.activeInventory.gloves:window.activeInventory.knives;
  return sourceList.filter(it=>invFilterType==='all'||(isWeaponCat?it.weaponType===invFilterType:isGloveCat?it.gloveType===invFilterType:it.knifeType===invFilterType));
}

function closeSellConfirmModal(){
  pendingSale=null;
  if(sellConfirmModal)sellConfirmModal.style.display='none';
}

function openSellConfirmModal(items,mode){
  if(!sellConfirmModal)return;
  const valid=[];
  let totalCoins=0;
  let highValueCount=0;
  for(const item of (items||[])){
    const check=KnivesSystem.isItemSellable(window.activeInventory,item);
    if(!check.sellable)continue;
    valid.push({item,value:check.value});
    totalCoins+=check.value;
    if(item.rarity==='covert'||item.rarity==='gold')highValueCount++;
  }
  if(valid.length===0){
    showToast('NO SELLABLE SKINS SELECTED');
    return;
  }

  pendingSale={items:valid.map(v=>v.item),mode:mode||'single',totalCoins};
  const curCoins=window.activeInventory.coins||0;
  const nextCoins=Math.min(KnivesSystem.ECONOMY.MAX_COINS,curCoins+totalCoins);

  if(sellConfirmTitle){
    sellConfirmTitle.textContent=valid.length===1
      ?'Sell Skin for Coins?'
      :`Sell ${valid.length} Skins for ${fmtCoins(totalCoins)} Coins?`;
  }
  if(sellConfirmSub){
    sellConfirmSub.textContent=valid.length===1
      ?'This skin will be permanently removed from your inventory and converted to coins.'
      :`These ${valid.length} skins will be permanently removed from your inventory. Starter and equipped items are always protected.`;
  }
  if(sellConfirmWarn){
    if(highValueCount>0){
      sellConfirmWarn.style.display='';
      sellConfirmWarn.textContent=`HIGH-VALUE WARNING: Includes ${highValueCount} rare Covert / Exceedingly Rare Gold item${highValueCount>1?'s':''}.`;
    }else{
      sellConfirmWarn.style.display='none';
    }
  }

  if(sellConfirmList){
    sellConfirmList.textContent='';
    const previewCap=12;
    const shown=valid.slice(0,previewCap);
    for(const entry of shown){
      const rar=KnivesSystem.RARITIES[entry.item.rarity]||KnivesSystem.RARITIES.milspec;
      const row=document.createElement('div');
      row.className='sell-modal-row';
      row.style.setProperty('--rar-col',rar.color);

      const left=document.createElement('div');
      left.style.minWidth='0';
      left.style.display='flex';
      left.style.alignItems='baseline';
      const nm=document.createElement('span');
      nm.className='sell-modal-row-name';
      nm.textContent=KnivesSystem.formatItemFullName(entry.item);
      const mt=document.createElement('span');
      mt.className='sell-modal-row-meta';
      mt.textContent=`${entry.item.wearGrade}${entry.item.specialTag?' · '+entry.item.specialTag:''}`;
      left.appendChild(nm);
      left.appendChild(mt);

      const val=document.createElement('span');
      val.className='sell-modal-row-val';
      val.textContent=`+${fmtCoins(entry.value)}C`;

      row.appendChild(left);
      row.appendChild(val);
      sellConfirmList.appendChild(row);
    }
    if(valid.length>previewCap){
      const extra=valid.length-previewCap;
      const moreRow=document.createElement('div');
      moreRow.className='sell-modal-row';
      moreRow.style.setProperty('--rar-col','#65e7ff');
      const moreTxt=document.createElement('span');
      moreTxt.className='sell-modal-row-meta';
      moreTxt.style.marginLeft='0';
      moreTxt.textContent=`+ ${extra} MORE SKIN${extra>1?'S':''} INCLUDED IN SALE`;
      moreRow.appendChild(moreTxt);
      sellConfirmList.appendChild(moreRow);
    }
  }

  if(sellConfirmBalance){
    sellConfirmBalance.innerHTML=`<span>BALANCE</span><span>${fmtCoins(curCoins)} → ${fmtCoins(nextCoins)} COINS (+${fmtCoins(totalCoins)}C)</span>`;
  }
  if(sellConfirmYesBtn){
    sellConfirmYesBtn.textContent=`CONFIRM SELL · +${fmtCoins(totalCoins)}C`;
  }
  sellConfirmModal.style.display='grid';
}

function executeConfirmedSale(){
  if(!pendingSale||!pendingSale.items||pendingSale.items.length===0){
    closeSellConfirmModal();
    return;
  }
  const {items,mode}=pendingSale;
  const ids=items.map(it=>it.id);
  const res=KnivesSystem.sellItems(window.activeInventory,ids);
  closeSellConfirmModal();
  if(!res.soldItems||res.soldItems.length===0){
    showToast('NO ELIGIBLE ITEMS SOLD');
    return;
  }

  window.activeInventory=res.inventory;
  for(const sold of res.soldItems){
    bulkSelectedIds.delete(sold.id);
  }
  KnivesSystem.recordPendingSoldItems(res.soldItems);
  persistInventorySummary(true,{allowBackupReset:true});

  if(!window.VELOCITY_TEST_MODE&&window.DailyBackend){
    Promise.allSettled(res.soldItems.map(sold=>{
      const delPromise=KnivesSystem.isWeaponItem(sold)
        ?window.DailyBackend.deleteCloudWeapon(sold.id)
        :KnivesSystem.isGloveItem(sold)
          ?window.DailyBackend.deleteCloudGlove(sold.id)
          :window.DailyBackend.deleteCloudKnife(sold.id);
      return delPromise.then(delRes=>{
        if(delRes&&delRes.deleted){
          KnivesSystem.clearPendingSoldItem(sold.id);
        }
      });
    })).then(()=>{
      if(KnivesSystem.loadPendingSoldItems().length===0){
        KnivesSystem.setLocalDirty(false);
      }
    }).catch(err=>{
      console.warn('Cloud item deletion failed; queued for next sync:',err);
    });
  }

  CaseAudio.coinChime('sell');
  const label=res.soldItems.length===1
    ?KnivesSystem.formatItemFullName(res.soldItems[0]).toUpperCase()
    :`${res.soldItems.length} SKINS`;
  showToast(`SOLD ${label} · +${fmtCoins(res.coinsEarned)} COINS`);

  if(mode==='reveal'){
    lastRevealedItem=null;
    showCasesView('select');
    renderArmoryCases();
  }else{
    if(mode==='bulk'){
      bulkSellMode=false;
      bulkSelectedIds.clear();
    }
    if(!(window.activeInventory.weapons||[]).some(w=>w.id===selectedInvWeaponId)){
      selectedInvWeaponId=window.activeInventory.equippedRifleId;
    }
    if(!window.activeInventory.knives.some(k=>k.id===selectedInvKnifeId)){
      selectedInvKnifeId=window.activeInventory.equippedKnifeId;
    }
    if(!window.activeInventory.gloves.some(g=>g.id===selectedInvGloveId)){
      selectedInvGloveId=window.activeInventory.equippedGloveId;
    }
    renderArmoryInventory();
  }
}

function updateBulkSellBarUI(){
  if(!invBulkBar||!invBulkToggleBtn)return;
  invBulkToggleBtn.classList.toggle('bulk-on',bulkSellMode);
  invBulkToggleBtn.textContent=bulkSellMode?'DONE BULK':'BULK SELL';
  invBulkBar.style.display=bulkSellMode?'':'none';
  if(!bulkSellMode)return;

  const byId=new Map(getAllInventoryItems().map(it=>[it.id,it]));
  let count=0;
  let totalCoins=0;
  for(const id of Array.from(bulkSelectedIds)){
    const it=byId.get(id);
    const check=it?KnivesSystem.isItemSellable(window.activeInventory,it):{sellable:false,value:0};
    if(!check.sellable){
      bulkSelectedIds.delete(id);
      continue;
    }
    count++;
    totalCoins+=check.value;
  }
  if(bulkSelSummary){
    bulkSelSummary.textContent=`${count} SELECTED · +${fmtCoins(totalCoins)} COINS`;
  }
  if(bulkSellConfirmBtn){
    bulkSellConfirmBtn.disabled=count===0;
    bulkSellConfirmBtn.textContent=count>0?`SELL SELECTED (${count}) · +${fmtCoins(totalCoins)}C`:'SELL SELECTED';
  }
}

function toggleBulkSellMode(forceState){
  const next=typeof forceState==='boolean'?forceState:!bulkSellMode;
  bulkSellMode=next;
  if(!bulkSellMode)bulkSelectedIds.clear();
  renderArmoryInventory();
}

function applyBulkPreset(preset){
  if(!bulkSellMode)bulkSellMode=true;
  const visible=getVisibleInventoryList();
  const visibleIds=new Set(visible.map(it=>it.id));
  if(preset==='clear'){
    bulkSelectedIds.clear();
    renderArmoryInventory();
    return;
  }
  let added=0;
  if(preset==='duplicates'){
    const dupIds=KnivesSystem.findDuplicateSellableIds(window.activeInventory,invCategory);
    for(const id of dupIds){
      if(visibleIds.has(id)){
        bulkSelectedIds.add(id);
        added++;
      }
    }
    if(added===0)showToast('NO SELLABLE DUPLICATES IN THIS VIEW');
  }else if(preset==='milspec'||preset==='restricted'){
    for(const it of visible){
      if(it.rarity===preset&&KnivesSystem.isItemSellable(window.activeInventory,it).sellable){
        bulkSelectedIds.add(it.id);
        added++;
      }
    }
    if(added===0)showToast(`NO SELLABLE ${preset==='milspec'?'MIL-SPEC':'RESTRICTED'} SKINS HERE`);
  }
  renderArmoryInventory();
}

function renderInventoryFilterButtons(){
  const bar=$('armoryFilterBar');
  if(!bar)return;
  bar.textContent='';
  const filters=invCategory==='weapons'
    ?[
      ['all','ALL'],
      ['rifle','V-47'],
      ['smg','VX-9'],
      ['shotgun','M870'],
      ['awp','AWP'],
      ['deagle','DEAGLE'],
      ['pistol','USP-9']
    ]
    :invCategory==='gloves'
      ?[
        ['all','ALL'],
        ['standard','STANDARD'],
        ['sport','SPORT'],
        ['specialist','SPECIALIST'],
        ['wraps','HAND WRAPS']
      ]
      :[
        ['all','ALL'],
        ['karambit','KARAMBIT'],
        ['butterfly','BUTTERFLY'],
        ['m9','M9'],
        ['skeleton','SKELETON'],
        ['default','DEFAULT']
      ];
  if(!filters.some(([id])=>id===invFilterType))invFilterType='all';
  for(const [id,label] of filters){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='arm-filter-btn'+(id===invFilterType?' active':'');
    btn.dataset.invFilter=id;
    btn.textContent=label;
    btn.onclick=()=>{invFilterType=id;renderArmoryInventory();};
    bar.appendChild(btn);
  }
}

function renderArmoryInventory(){
  if(!armoryInvGrid)return;
  const isWeaponCat=invCategory==='weapons';
  const isGloveCat=invCategory==='gloves';
  document.querySelectorAll('[data-inv-cat]').forEach(btn=>{
    const on=btn.dataset.invCat===invCategory;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  renderInventoryFilterButtons();
  updateBulkSellBarUI();

  const sourceList=isWeaponCat?(window.activeInventory.weapons||[]):isGloveCat?window.activeInventory.gloves:window.activeInventory.knives;
  const list=getVisibleInventoryList();
  armoryInvGrid.textContent='';

  if(list.length===0){
    const empty=document.createElement('div');
    empty.className='inv-empty';
    empty.textContent=isWeaponCat
      ?'No skins for this firearm yet. Buy & open cases in the Case Shop to unbox V-47 Rifle, AWP, and Deagle finishes.'
      :isGloveCat
        ?'No gloves in this archetype yet. Rare Gold drops in any case (8%–18% by tier) can unbox Sport, Specialist, Hand Wraps, or Standard gloves.'
        :'No knives in this category yet. Rare Gold drops in any case (8%–18% by tier) unbox knives & gloves.';
    armoryInvGrid.appendChild(empty);
  }

  let selected;
  if(isWeaponCat){
    selected=list.find(w=>w.id===selectedInvWeaponId)||sourceList.find(w=>w.id===selectedInvWeaponId)||KnivesSystem.getEquippedWeapon(window.activeInventory,'rifle');
    if(list.length>0&&!list.some(w=>w.id===selected.id))selected=list[0];
    selectedInvWeaponId=selected.id;
  }else if(isGloveCat){
    selected=list.find(g=>g.id===selectedInvGloveId)||window.activeInventory.gloves.find(g=>g.id===selectedInvGloveId)||KnivesSystem.getEquippedGlove(window.activeInventory);
    if(list.length>0&&!list.some(g=>g.id===selected.id))selected=list[0];
    selectedInvGloveId=selected.id;
  }else{
    selected=list.find(k=>k.id===selectedInvKnifeId)||window.activeInventory.knives.find(k=>k.id===selectedInvKnifeId)||KnivesSystem.getEquippedKnife(window.activeInventory);
    if(list.length>0&&!list.some(k=>k.id===selected.id))selected=list[0];
    selectedInvKnifeId=selected.id;
  }

  const selectedId=selected.id;

  for(const item of list){
    const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const isEq=KnivesSystem.isItemEquippedInInventory(window.activeInventory,item);
    const sellCheck=KnivesSystem.isItemSellable(window.activeInventory,item);
    const isBulkPicked=bulkSellMode&&bulkSelectedIds.has(item.id);
    const isBulkLocked=bulkSellMode&&!sellCheck.sellable;

    const card=document.createElement('button');
    card.type='button';
    card.className='inv-card'
      +(item.id===selectedId?' selected':'')
      +(isBulkPicked?' bulk-selected':'')
      +(isBulkLocked?' bulk-locked':'');
    card.style.setProperty('--rar-col',rar.color);
    card.dataset.itemId=item.id;
    if(isWeaponCat)card.dataset.weaponId=item.id;
    else if(isGloveCat)card.dataset.gloveId=item.id;
    else card.dataset.knifeId=item.id;

    if(bulkSellMode&&sellCheck.sellable){
      const chk=document.createElement('span');
      chk.className='inv-check';
      chk.textContent=isBulkPicked?'✓':'';
      card.appendChild(chk);
    }

    if(isEq){
      const eq=document.createElement('span');
      eq.className='inv-equipped';
      eq.textContent='EQUIPPED';
      card.appendChild(eq);
    }

    const img=document.createElement('img');
    img.className='inv-thumb';
    img.alt=KnivesSystem.formatItemFullName(item);
    img.src=getThumbForItem(item);

    const nm=document.createElement('div');
    nm.className='inv-name';
    nm.textContent=KnivesSystem.formatItemFullName(item);

    const meta=document.createElement('div');
    meta.className='inv-meta';
    const metaTxt=document.createTextNode(KnivesSystem.formatKnifeMetaLine(item));
    meta.appendChild(metaTxt);
    if(sellCheck.value>0){
      const sep=document.createTextNode(' · ');
      const pr=document.createElement('span');
      pr.className='inv-price';
      pr.textContent=`${fmtCoins(sellCheck.value)}C`;
      meta.appendChild(sep);
      meta.appendChild(pr);
    }

    card.appendChild(img);
    card.appendChild(nm);
    card.appendChild(meta);
    card.onclick=()=>{
      if(isWeaponCat)selectedInvWeaponId=item.id;
      else if(isGloveCat)selectedInvGloveId=item.id;
      else selectedInvKnifeId=item.id;
      if(bulkSellMode){
        if(!sellCheck.sellable){
          showToast(sellCheck.reason==='STARTER ITEM'?'STARTER ITEMS CANNOT BE SOLD':'UNEQUIP ITEM FIRST TO SELL');
        }else if(bulkSelectedIds.has(item.id)){
          bulkSelectedIds.delete(item.id);
        }else{
          bulkSelectedIds.add(item.id);
        }
      }
      renderArmoryInventory();
    };
    armoryInvGrid.appendChild(card);
  }

  fillItemSpecs('inv',selected);
  const isSelectedEquipped=KnivesSystem.isItemEquippedInInventory(window.activeInventory,selected);
  const selCheck=KnivesSystem.isItemSellable(window.activeInventory,selected);
  $('invEquipBtn').textContent=isSelectedEquipped?'EQUIPPED':(isWeaponCat?'EQUIP SKIN':isGloveCat?'EQUIP GLOVES':'EQUIP KNIFE');
  $('invEquipBtn').disabled=isSelectedEquipped;
  if(invSellBtn){
    invSellBtn.disabled=!selCheck.sellable;
    invSellBtn.textContent=selCheck.sellable
      ?`SELL FOR +${fmtCoins(selCheck.value)}C`
      :selCheck.reason;
  }

  const invTrickBtn=$('invTrickBtn'),invMythicBtn=$('invMythicBtn');
  if(invTrickBtn){
    invTrickBtn.style.display='';
    invTrickBtn.textContent=isWeaponCat?'INSPECT':'PLAY TRICK';
  }
  if(invMythicBtn){
    invMythicBtn.style.display='';
    invMythicBtn.textContent=isWeaponCat?'RARE TRICK ★':'MYTHIC ★';
  }

  const effectiveMode=isGloveCat?'combo':invPreviewMode;
  const modeComboBtn=$('invModeCombo'),modeSoloBtn=$('invModeSolo'),stageCap=$('invStageCaption');
  if(modeComboBtn)modeComboBtn.classList.toggle('active',effectiveMode==='combo');
  if(modeSoloBtn){
    modeSoloBtn.classList.toggle('active',effectiveMode==='solo');
    modeSoloBtn.disabled=isGloveCat;
  }
  if(stageCap){
    stageCap.textContent=effectiveMode==='combo'?'LIVE COMBO 3D PREVIEW':(isWeaponCat?'SOLO FIREARM TURNTABLE':'SOLO BLADE TURNTABLE');
  }

  const previewGlove=isGloveCat?selected:KnivesSystem.getEquippedGlove(window.activeInventory);
  const previewItem=isGloveCat?KnivesSystem.getEquippedKnife(window.activeInventory):selected;
  mountArmoryCanvas(armoryInspectStage,previewItem,previewGlove,effectiveMode);
  updateArmoryBadges();
}

function setArmoryTab(tab){
  stopRouletteAnimation();
  closeSellConfirmModal();
  if(tab!=='inventory'){
    bulkSellMode=false;
    bulkSelectedIds.clear();
  }
  activeArmoryTab=tab==='inventory'?'inventory':'cases';
  document.querySelectorAll('[data-arm-tab]').forEach(btn=>{
    const on=btn.dataset.armTab===activeArmoryTab;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  document.querySelectorAll('[data-arm-pane]').forEach(pane=>{
    pane.style.display=pane.dataset.armPane===activeArmoryTab?'':'none';
  });
  if(activeArmoryTab==='cases'){
    showCasesView('select');
    renderArmoryCases();
  }else{
    renderArmoryInventory();
  }
}

function openArmory(returnTo,initialTab){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  armoryReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  armoryPanelEl.style.display='';
  armoryBackBtn.textContent=armoryReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='armory';
  document.exitPointerLock?.();
  updateArmorySyncLabel();
  setArmoryTab(initialTab||activeArmoryTab);
}

// ---------- Servers & Arenas Board (Serverless WebRTC + Firestore) ----------
function stopServersSubscription(){
  if(unsubPublicLobbies){
    try{unsubPublicLobbies();}catch(_){}
    unsubPublicLobbies=null;
  }
}

function renderServersBoard(){
  if(!serversBoardList)return;
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  const signedIn=!!(st.user&&st.user.emailVerified);
  if(serversSyncNote)serversSyncNote.textContent=signedIn?'LIVE FIRESTORE BOARD':'SIGN IN FOR P2P';
  if(hostDeployBtn)hostDeployBtn.disabled=!signedIn;
  if(hostDeployNote){
    hostDeployNote.textContent=signedIn
      ?'Zero server setup: your room appears instantly on the public board via Firestore and connects players peer-to-peer over WebRTC.'
      :'Sign in with Google to host or join live P2P servers. Solo Arena Warmup works immediately without signing in.';
  }

  serversBoardList.textContent='';
  if(!signedIn){
    const empty=document.createElement('div');
    empty.className='srv-empty';
    empty.textContent='Sign in with Google to browse and join live public servers, or launch Solo Arena Warmup below.';
    serversBoardList.appendChild(empty);
    return;
  }

  const filtered=livePublicLobbies.filter(l=>serversFilterMode==='all'||l.mode===serversFilterMode);
  if(filtered.length===0){
    const empty=document.createElement('div');
    empty.className='srv-empty';
    empty.textContent='No public servers active right now. Click HOST & DEPLOY ARENA on the right to start one — others can join in 1 click!';
    serversBoardList.appendChild(empty);
    return;
  }

  for(const lob of filtered){
    const row=document.createElement('div');
    row.className='srv-row';
    const info=document.createElement('div');
    const title=document.createElement('div');
    title.className='srv-row-title';
    title.textContent=lob.roomName;
    const mapLabel=lob.mapId==='arena_surf'?'SURF DUEL':'AIM MAP';
    const modeLabel=lob.mode==='ffa_4p'?'FFA':'1v1 DUEL';
    const meta=document.createElement('div');
    meta.className='srv-row-meta';
    meta.textContent=`HOST: ${lob.hostName} · ${mapLabel} · ${modeLabel} · ${lob.playerCount}/${lob.maxPlayers}`;
    info.append(title,meta);

    const joinBtn=document.createElement('button');
    joinBtn.type='button';
    joinBtn.className='srv-join-btn';
    const full=lob.playerCount>=lob.maxPlayers;
    joinBtn.disabled=full||(st.user&&lob.hostUid===st.user.uid);
    joinBtn.textContent=full?'FULL':(st.user&&lob.hostUid===st.user.uid?'YOURS':'JOIN');
    joinBtn.onclick=()=>handleJoinLobby(lob);

    row.append(info,joinBtn);
    serversBoardList.appendChild(row);
  }
}

function startServersSubscription(){
  stopServersSubscription();
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified){
    livePublicLobbies=[];
    renderServersBoard();
    return;
  }
  unsubPublicLobbies=window.DailyBackend.subscribePublicLobbies((list)=>{
    livePublicLobbies=list||[];
    renderServersBoard();
  });
}

function openServersPanel(returnTo){
  cancelRebind();
  stopRouletteAnimation();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  serversReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  serversPanelEl.style.display='';
  serversBackBtn.textContent=serversReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='servers';
  document.exitPointerLock?.();
  renderServersBoard();
  startServersSubscription();
}

function closeServersPanel(){
  stopServersSubscription();
  if(serversReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

function launchSoloArenaWarmup(mapId){
  stopServersSubscription();
  NetcodeSystem.startSoloWarmup(mapId,'duel_1v1');
  loadLevel(mapId,{keepSession:true});
  inLevel=true;
  enter();
  showToast('SOLO ARENA WARMUP · SHOOT HOLOGRAM BOTS');
}

async function handleHostDeploy(){
  try{
    hostDeployBtn.disabled=true;
    hostDeployBtn.textContent='DEPLOYING...';
    const lobby=await NetcodeSystem.hostLobby({
      roomName:hostRoomNameInput.value,
      mapId:hostSelectedMap,
      mode:hostSelectedMode,
      isPrivate:hostSelectedVis==='private'
    });
    stopServersSubscription();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
    showToast(lobby.isPrivate?`PRIVATE ARENA READY · CODE ${lobby.joinCode}`:`LIVE ON SERVERS BOARD · ${lobby.roomName.toUpperCase()}`);
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'COULD NOT HOST ARENA');
  }finally{
    hostDeployBtn.disabled=false;
    hostDeployBtn.textContent='HOST & DEPLOY ARENA';
  }
}

async function handleJoinLobby(lobby){
  try{
    showToast(`CONNECTING TO ${lobby.roomName.toUpperCase()}...`);
    await NetcodeSystem.joinLobby(lobby);
    stopServersSubscription();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'COULD NOT JOIN SERVER');
  }
}

async function handleJoinPrivateCode(){
  const raw=(privateCodeInput.value||'').trim().toUpperCase();
  if(raw.length!==4){
    showToast('ENTER A 4-LETTER ROOM CODE');
    return;
  }
  try{
    showToast(`LOOKING UP ROOM ${raw}...`);
    const lobby=await NetcodeSystem.joinByCode(raw);
    stopServersSubscription();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'ROOM CODE NOT FOUND');
  }
}

function closeArmory(){
  stopRouletteAnimation();
  closeSellConfirmModal();
  bulkSellMode=false;
  bulkSelectedIds.clear();
  ArmoryPreview.stop();
  if(armoryReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

function refreshTodayButton(){
  const todayKey=DailyCourseGen.getTodayDateKey();
  const todaySeed=DailyCourseGen.canonicalDailySeed(todayKey);
  const meta=DailyCourseGen.previewSeedCourse(todaySeed,todayKey);
  const pb=localPbFor(meta.id);
  $('todayBtnTitle').textContent=`TODAY'S DAILY — ${DailyCourseGen.formatDateDisplay(todayKey)}`;
  $('todayBtnSub').textContent=pb>0?`${meta.lengthLabel} · PB ${fmt(pb)}`:`${meta.lengthLabel} · ${meta.segmentCount} SEGMENTS`;
}

function renderAuthHeaderName(user){
  if(user){
    menuAuthName.textContent=getEffectiveUserName(user);
    menuAuthName.style.display='';
  }else if(window.activeSettings&&window.activeSettings.displayName){
    menuAuthName.textContent=window.activeSettings.displayName;
    menuAuthName.style.display='';
  }else{
    menuAuthName.textContent='';
    menuAuthName.style.display='none';
  }
}

async function hydrateCloudSettingsForUser(user){
  if(!user||!user.emailVerified||!window.DailyBackend)return;
  if(lastSyncedUid===user.uid)return;
  lastSyncedUid=user.uid;
  try{
    const res=await window.DailyBackend.loadUserSettings();
    if(res&&res.exists&&res.settings){
      window.activeSettings=VelocitySettings.saveLocal(res.settings);
      applySettingsToRuntime();
      if(settingsPanelEl.style.display!=='none')renderSettingsPanel();
      updateSettingsSyncLabel('CLOUD SYNCED');
    }else if(res&&res.cloudSynced){
      await window.DailyBackend.saveUserSettings(window.activeSettings);
      updateSettingsSyncLabel('CLOUD SYNCED');
    }
  }catch(_){
    updateSettingsSyncLabel('LOCAL FALLBACK');
  }
}

async function hydrateCloudInventoryForUser(user){
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
    return;
  }
  if(!user||!user.emailVerified||!window.DailyBackend)return;
  if(lastInvSyncedUid===user.uid)return;
  lastInvSyncedUid=user.uid;
  try{
    const res=await window.DailyBackend.loadUserInventory();
    if(!res||!res.cloudSynced){
      updateArmorySyncLabel('LOCAL FALLBACK');
      return;
    }

    const pendingSold=KnivesSystem.loadPendingSoldItems();
    const merged=KnivesSystem.mergeInventories(
      window.activeInventory,
      res.exists?res.inventory:null,
      {
        knivesLoaded:res.knivesLoaded!==false,
        glovesLoaded:res.glovesLoaded!==false,
        weaponsLoaded:res.weaponsLoaded!==false,
        pendingSoldIds:pendingSold,
        localDirty:KnivesSystem.isLocalDirty()
      }
    );

    window.activeInventory=KnivesSystem.saveLocal(merged.inventory);
    ViewmodelSystem.equipGlove(KnivesSystem.getEquippedGlove(window.activeInventory));
    ViewmodelSystem.equipKnife(KnivesSystem.getEquippedKnife(window.activeInventory),false);
    syncEquippedWeaponsToViewmodel();
    updateArmoryBadges();
    if(armoryPanelEl.style.display!=='none'){
      if(activeArmoryTab==='cases')renderArmoryCases();
      else renderArmoryInventory();
    }

    let allCloudOpsOk=!merged.partialCloudLoad;
    if(!res.exists||merged.needsSummarySync){
      try{
        const sumRes=await window.DailyBackend.saveUserInventorySummary(window.activeInventory);
        if(!sumRes||!sumRes.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud inventory summary backfill failed:',err);
      }
    }

    for(const k of merged.missingInCloud.knives){
      try{
        const r=await window.DailyBackend.saveCloudKnife(k,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud knife backfill failed:',k.id,err);
      }
    }
    for(const g of merged.missingInCloud.gloves){
      try{
        const r=await window.DailyBackend.saveCloudGlove(g,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud glove backfill failed:',g.id,err);
      }
    }
    for(const w of merged.missingInCloud.weapons){
      try{
        const r=await window.DailyBackend.saveCloudWeapon(w,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud weapon backfill failed:',w.id,err);
      }
    }

    // Reconcile any locally-sold items whose cloud delete was interrupted by a reload
    const deleteTasks=[];
    const queuedDeleteIds=new Set();
    for(const entry of pendingSold){
      queuedDeleteIds.add(entry.id);
      deleteTasks.push(entry);
    }
    for(const id of merged.staleInCloud.knives){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'knife'});}
    }
    for(const id of merged.staleInCloud.gloves){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'glove'});}
    }
    for(const id of merged.staleInCloud.weapons){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'weapon'});}
    }

    for(const task of deleteTasks){
      try{
        const delRes=task.kind==='weapon'
          ?await window.DailyBackend.deleteCloudWeapon(task.id)
          :task.kind==='glove'
            ?await window.DailyBackend.deleteCloudGlove(task.id)
            :await window.DailyBackend.deleteCloudKnife(task.id);
        if(delRes&&delRes.deleted){
          KnivesSystem.clearPendingSoldItem(task.id);
        }else{
          allCloudOpsOk=false;
        }
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud stale sold-item cleanup failed:',task.id,err);
      }
    }

    if(allCloudOpsOk&&KnivesSystem.loadPendingSoldItems().length===0){
      KnivesSystem.setLocalDirty(false);
      updateArmorySyncLabel('CLOUD SYNCED');
    }else{
      updateArmorySyncLabel('LOCAL FALLBACK');
    }
  }catch(err){
    console.warn('Cloud inventory hydration failed; keeping local inventory intact:',err);
    updateArmorySyncLabel('LOCAL FALLBACK');
  }
}

function updateLoadoutsSyncLabel(override){
  if(!loadoutsSyncNoteEl)return;
  if(override){loadoutsSyncNoteEl.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  loadoutsSyncNoteEl.textContent=(st.user&&st.user.emailVerified)?'CLOUD SYNCED':'LOCAL ONLY';
}

function scheduleCloudLoadoutsSave(){
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified||!window.DailyBackend||!window.DailyBackend.saveUserLoadouts){
    updateLoadoutsSyncLabel('LOCAL ONLY');
    return;
  }
  updateLoadoutsSyncLabel('SAVING...');
  if(cloudLoadoutsSaveTimer)clearTimeout(cloudLoadoutsSaveTimer);
  cloudLoadoutsSaveTimer=setTimeout(async()=>{
    cloudLoadoutsSaveTimer=null;
    try{
      const saved=await window.DailyBackend.saveUserLoadouts(window.activeLoadouts);
      updateLoadoutsSyncLabel(saved?'CLOUD SYNCED':'LOCAL FALLBACK');
    }catch(_){
      updateLoadoutsSyncLabel('LOCAL FALLBACK');
    }
  },420);
}

async function hydrateCloudLoadoutsForUser(user){
  if(!user||!user.emailVerified||!window.DailyBackend||!window.DailyBackend.loadUserLoadouts)return;
  if(lastLoadoutsSyncedUid===user.uid)return;
  lastLoadoutsSyncedUid=user.uid;
  try{
    const cloudDoc=await window.DailyBackend.loadUserLoadouts();
    const mergedState=LoadoutsSystem.mergeLoadoutStates(window.activeLoadouts,cloudDoc);
    window.activeLoadouts=LoadoutsSystem.saveLocal(mergedState);
    selectedLoadoutIdx=window.activeLoadouts.activeIndex;
    applyActiveLoadoutToRuntime({keepSlot:true});
    renderQuickLoadoutStrips();
    if(loadoutsPanelEl&&loadoutsPanelEl.style.display!=='none'){
      if(gunsmithMode)renderGunsmith();
      else renderLoadoutsOverview();
    }
    const cloudSanitized=cloudDoc?LoadoutsSystem.sanitizeLoadoutState(cloudDoc):null;
    const needsSync=!cloudSanitized||JSON.stringify(mergedState)!==JSON.stringify(cloudSanitized);
    if(needsSync){
      await window.DailyBackend.saveUserLoadouts(window.activeLoadouts);
    }
    updateLoadoutsSyncLabel('CLOUD SYNCED');
  }catch(err){
    console.warn('Cloud loadouts hydration failed; keeping local loadouts intact:',err);
    updateLoadoutsSyncLabel('LOCAL FALLBACK');
  }
}

function renderAuthUI(user){
  renderAuthHeaderName(user);
  if(user){
    menuAuthBtn.textContent='SIGN OUT';
    hubAuthBtn.textContent='SIGN OUT';
    if(serversAuthBtn)serversAuthBtn.textContent='SIGN OUT';
    hydrateCloudSettingsForUser(user);
    hydrateCloudInventoryForUser(user);
    hydrateCloudLoadoutsForUser(user);
  }else{
    lastSyncedUid=null;
    lastInvSyncedUid=null;
    lastLoadoutsSyncedUid=null;
    menuAuthBtn.textContent='SIGN IN';
    hubAuthBtn.textContent='SIGN IN';
    if(serversAuthBtn)serversAuthBtn.textContent='SIGN IN';
  }
  updateSettingsSyncLabel();
  updateArmorySyncLabel();
  updateLoadoutsSyncLabel();
  updateLeaderboardAuthNote();
  if(settingsPanelEl.style.display!=='none')renderSettingsPanel();
  if(serversPanelEl.style.display!=='none'){
    startServersSubscription();
  }
}

async function handleAuthClick(){
  if(!window.DailyBackend){
    showToast('CLOUD BACKEND LOADING — TRY AGAIN');
    return;
  }
  const st=window.DailyBackend.getState();
  try{
    if(st.user){
      await window.DailyBackend.signOutUser();
      showToast('SIGNED OUT');
    }else{
      await window.DailyBackend.signInWithGoogle();
      showToast('SIGNED IN WITH GOOGLE');
      if(selectedDateKey&&dailyHubEl.style.display!=='none'){
        loadLeaderboardFor(selectedDateKey);
      }
    }
  }catch(err){
    const code=err&&err.code?String(err.code):'';
    const msg=err&&err.message?String(err.message):'Sign-in canceled';
    if(code.includes('unauthorized-domain')||msg.includes('unauthorized-domain')){
      showToast(`ADD ${location.hostname.toUpperCase()} IN FIREBASE AUTH DOMAINS`);
    }else if(!code.includes('popup-closed-by-user')&&!msg.includes('popup-closed-by-user')){
      showToast('SIGN-IN UNAVAILABLE');
    }
  }
}

function updateLeaderboardAuthNote(){
  if(!lbAuthNoteEl)return;
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null,online:false};
  if(st.user){
    const label=getEffectiveUserName(st.user);
    lbAuthNoteEl.textContent=`Signed in as ${label} · Daily PBs auto-submit on finish.`;
  }else{
    lbAuthNoteEl.textContent='Playing as guest · Sign in with Google to publish daily times.';
  }
}

function renderCustomSeedPreview(){
  const norm=DailyCourseGen.normalizeCustomSeed(customSeedInput.value);
  if(!norm){
    customSeedPreview.textContent='Enter any word or code to generate a deterministic course.';
    return;
  }
  const meta=DailyCourseGen.previewSeedCourse(norm,null);
  const pb=localPbFor(meta.id);
  const pbTxt=pb>0?` · PB ${fmt(pb)}`:'';
  customSeedPreview.textContent=`${meta.lengthLabel} · ${meta.segmentCount} segments · ${meta.totalLengthMeters}m${pbTxt}`;
}

function renderArchiveList(){
  const todayKey=DailyCourseGen.getTodayDateKey();
  archiveListEl.textContent='';
  for(const c of archiveCourses){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='archive-row'+(c.dateKey===selectedDateKey?' selected':'');
    btn.setAttribute('role','option');
    btn.setAttribute('aria-selected',c.dateKey===selectedDateKey?'true':'false');
    btn.dataset.dateKey=c.dateKey;

    const top=document.createElement('div');
    top.className='archive-row-top';

    const left=document.createElement('span');
    const dateSpan=document.createElement('span');
    dateSpan.className='archive-date';
    dateSpan.textContent=DailyCourseGen.formatDateDisplay(c.dateKey);
    left.appendChild(dateSpan);
    if(c.dateKey===todayKey){
      const tag=document.createElement('span');
      tag.className='archive-today';
      tag.textContent='TODAY';
      left.appendChild(tag);
    }

    const pb=localPbFor(c.id);
    const pbSpan=document.createElement('span');
    pbSpan.className='archive-pb'+(pb>0?'':' none');
    pbSpan.textContent=pb>0?'PB '+fmt(pb):'NO PB';

    top.appendChild(left);
    top.appendChild(pbSpan);

    const meta=document.createElement('div');
    meta.className='archive-meta';
    meta.textContent=`${c.lengthLabel} · ${c.segmentCount} segments · ${c.totalLengthMeters}m`;

    btn.appendChild(top);
    btn.appendChild(meta);
    btn.onclick=()=>selectDailyInHub(c.dateKey);
    archiveListEl.appendChild(btn);
  }
}

function renderSelectedDailyDetail(courseMeta){
  const todayKey=DailyCourseGen.getTodayDateKey();
  $('detailKicker').textContent=courseMeta.dateKey===todayKey?'TODAY\'S DAILY TRACK':'ARCHIVE DAILY TRACK';
  $('detailDate').textContent=DailyCourseGen.formatDateDisplay(courseMeta.dateKey);
  const pb=localPbFor(courseMeta.id);
  const pbPart=pb>0?` · Your PB ${fmt(pb)}`:'';
  $('detailMeta').textContent=`${courseMeta.lengthLabel} · ${courseMeta.segmentCount} segments · ${courseMeta.totalLengthMeters}m${pbPart}`;

  const mechEl=$('detailMechanics');
  mechEl.textContent='';
  const seedLabel=document.createElement('span');
  seedLabel.className='detail-seed';
  seedLabel.textContent=courseMeta.seed;
  mechEl.appendChild(document.createTextNode('Seed '));
  mechEl.appendChild(seedLabel);
  mechEl.appendChild(document.createTextNode(' · ' + courseMeta.mechanicsLabels.join(' · ')));

  $('playSelectedDailyBtn').textContent=courseMeta.dateKey===todayKey?'PLAY TODAY\'S DAILY':'PLAY ARCHIVE DAILY';
}

async function loadLeaderboardFor(dateKey){
  const reqId=++activeLbRequest;
  lbStatusEl.textContent='LOADING...';
  lbListEl.textContent='';
  const loadingDiv=document.createElement('div');
  loadingDiv.className='lb-empty';
  loadingDiv.textContent='Fetching leaderboard standings...';
  lbListEl.appendChild(loadingDiv);

  if(!window.DailyBackend){
    lbStatusEl.textContent='LOCAL MODE';
    loadingDiv.textContent='Shared leaderboard unavailable offline. Your local PB and 3D ghost still save automatically.';
    return;
  }

  try{
    const res=await window.DailyBackend.fetchLeaderboard(dateKey);
    if(reqId!==activeLbRequest)return;
    lbListEl.textContent='';
    lbStatusEl.textContent=res.cloudSynced?(res.entries.length>0?`TOP ${res.entries.length}`:'0 RUNS'):'LOCAL MODE';

    if(!res.cloudSynced){
      const off=document.createElement('div');
      off.className='lb-empty';
      off.textContent='Cloud leaderboard offline. You can still race this seeded course with local PBs and ghosts.';
      lbListEl.appendChild(off);
      return;
    }
    if(res.entries.length===0){
      const empty=document.createElement('div');
      empty.className='lb-empty';
      empty.textContent='No official times posted for this day yet. Complete the course to set the first record.';
      lbListEl.appendChild(empty);
      return;
    }

    const meUid=window.DailyBackend.getState().user?.uid||null;
    const leaderTime=res.entries[0].bestTime;
    for(const entry of res.entries){
      const row=document.createElement('div');
      row.className='lb-row'+(meUid&&entry.uid===meUid?' me':'');

      const rank=document.createElement('span');
      rank.className='lb-rank'+(entry.rank===1?' top1':'');
      rank.textContent='#'+entry.rank;

      const name=document.createElement('span');
      name.className='lb-name';
      name.textContent=entry.displayName;

      const time=document.createElement('span');
      time.className='lb-time';
      time.textContent=fmt(entry.bestTime);

      const delta=document.createElement('span');
      delta.className='lb-delta';
      const diff=entry.bestTime-leaderTime;
      delta.textContent=entry.rank===1?'LEAD':'+'+diff.toFixed(2)+'s';

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(time);
      row.appendChild(delta);
      lbListEl.appendChild(row);
    }
  }catch(_){
    if(reqId!==activeLbRequest)return;
    lbStatusEl.textContent='LOCAL MODE';
    lbListEl.textContent='';
    const errDiv=document.createElement('div');
    errDiv.className='lb-empty';
    errDiv.textContent='Could not load leaderboard right now. You can still play this daily track locally.';
    lbListEl.appendChild(errDiv);
  }
}

function selectDailyInHub(dateKey){
  selectedDateKey=dateKey;
  const found=archiveCourses.find(c=>c.dateKey===dateKey)||DailyCourseGen.previewSeedCourse(DailyCourseGen.canonicalDailySeed(dateKey),dateKey);
  renderArchiveList();
  renderSelectedDailyDetail(found);
  updateLeaderboardAuthNote();
  loadLeaderboardFor(dateKey);
}

async function openDailyHub(focusDateKey){
  cancelRebind();
  stopRouletteAnimation();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  pauseEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  dailyHubEl.style.display='';
  document.body.dataset.state='archive';
  document.exitPointerLock?.();

  const targetDate=focusDateKey&&(DailyCourseGen.isValidDateKey(focusDateKey)?focusDateKey:null)||DailyCourseGen.getTodayDateKey();
  // Immediately render deterministic local archive while cloud sync runs
  archiveCourses=DailyCourseGen.getRecentDateKeys(14).map(dk=>DailyCourseGen.previewSeedCourse(DailyCourseGen.canonicalDailySeed(dk),dk));
  selectDailyInHub(targetDate);

  if(window.DailyBackend){
    try{
      const synced=await window.DailyBackend.fetchDailyArchive(14);
      if(synced&&synced.courses.length>0){
        archiveCourses=synced.courses;
        const stillThere=archiveCourses.find(c=>c.dateKey===selectedDateKey);
        selectDailyInHub(stillThere?selectedDateKey:archiveCourses[0].dateKey);
      }
    }catch(_){
      // Deterministic local archive is already displayed
    }
  }
}

// ---------- Surf & Time Trials Course Browser (SurfD-Inspired Master-Detail) ----------
let cbCategory='surf';
let cbSelectedId=null;
let cbReturnTarget='menu';
let cbStatusFilter='all';
let cbTierFilter='all';
let cbFormatFilter='all';
let cbSearchQuery='';
let cbSortBy='recommended';
let cbFilteredCache=[];

function refreshMenuCourseStats(){
  if(typeof CourseCatalog==='undefined')return;
  const surfList=CourseCatalog.getCoursesByCategory('surf');
  const ttList=CourseCatalog.getCoursesByCategory('timetrial');
  const surfDone=surfList.filter(c=>localPbFor(c.id)>0).length;
  const ttDone=ttList.filter(c=>localPbFor(c.id)>0).length;
  if(menuSurfStatEl){
    menuSurfStatEl.textContent=surfDone>0
      ?`${surfList.length} MAPS · T1–T4 · ${surfDone}/${surfList.length} CLEARED`
      :`${surfList.length} MAPS · T1–T4 · LINEAR & STAGED`;
  }
  if(menuTTStatEl){
    menuTTStatEl.textContent=ttDone>0
      ?`${ttList.length} COURSES · ${ttDone}/${ttList.length} CLEARED`
      :`${ttList.length} COURSES · WALLRUN · GRAPPLE · BUNNYHOP`;
  }
}

function updatePreviewModeButtons(mode){
  const isOrbit=mode==='orbit';
  if(cbModeFlyBtn)cbModeFlyBtn.classList.toggle('active',!isOrbit);
  if(cbModeOrbitBtn)cbModeOrbitBtn.classList.toggle('active',isOrbit);
  if(cbPreviewHintEl){
    cbPreviewHintEl.textContent=isOrbit
      ?'ORBIT ACTIVE · DRAG TO ROTATE · SCROLL TO ZOOM'
      :'AUTO FLYTHROUGH · DRAG ANYWHERE TO ORBIT';
  }
}

if(typeof CoursePreview3D!=='undefined'&&CoursePreview3D.setOnModeChange){
  CoursePreview3D.setOnModeChange(updatePreviewModeButtons);
}

function resetBrowserFilters(){
  cbStatusFilter='all';
  cbTierFilter='all';
  cbFormatFilter='all';
  cbSearchQuery='';
  if(cbSearchInput)cbSearchInput.value='';
}

function getFilteredBrowserCourses(){
  if(typeof CourseCatalog==='undefined')return [];
  const all=CourseCatalog.getCoursesByCategory(cbCategory);
  const q=cbSearchQuery.trim().toLowerCase();
  const filtered=all.filter(c=>{
    const pb=localPbFor(c.id);
    if(cbStatusFilter==='todo'&&pb>0)return false;
    if(cbStatusFilter==='done'&&pb<=0)return false;
    if(cbTierFilter!=='all'&&c.tier!==cbTierFilter)return false;
    if(cbCategory==='surf'&&cbFormatFilter!=='all'&&c.format!==cbFormatFilter)return false;
    if(q){
      const hay=`${c.name} ${c.code} ${c.author||''} ${c.description} ${c.theme} ${(c.pieces||[]).join(' ')} t${c.tier}`.toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });

  if(cbSortBy==='tier_asc'){
    filtered.sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
  }else if(cbSortBy==='tier_desc'){
    filtered.sort((a,b)=>b.tier-a.tier||a.name.localeCompare(b.name));
  }else if(cbSortBy==='name_asc'){
    filtered.sort((a,b)=>a.name.localeCompare(b.name));
  }else if(cbSortBy==='pb_asc'){
    filtered.sort((a,b)=>{
      const pa=localPbFor(a.id),pb=localPbFor(b.id);
      if(pa>0&&pb>0)return pa-pb;
      if(pa>0)return -1;
      if(pb>0)return 1;
      return a.tier-b.tier;
    });
  }
  return filtered;
}

const MEDAL_COLORS={GOLD:'#f5c542',SILVER:'#cfe4f2',BRONZE:'#e39a62'};

function renderCourseBrowserFilters(){
  if(!cbFilterRowEl||typeof CourseCatalog==='undefined')return;
  const all=CourseCatalog.getCoursesByCategory(cbCategory);
  const doneCount=all.filter(c=>localPbFor(c.id)>0).length;
  const todoCount=all.length-doneCount;
  cbFilterRowEl.textContent='';

  const mkBtn=(label,count,active,onClick)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cb-filter-btn'+(active?' active':'');
    const lbl=document.createElement('span');
    lbl.textContent=label;
    const cnt=document.createElement('span');
    cnt.className='cb-filter-count';
    cnt.textContent=String(count);
    btn.append(lbl,cnt);
    btn.onclick=onClick;
    cbFilterRowEl.appendChild(btn);
  };
  const mkSep=()=>{
    const sep=document.createElement('span');
    sep.className='cb-filter-sep';
    sep.setAttribute('aria-hidden','true');
    cbFilterRowEl.appendChild(sep);
  };

  const isAllDefault=cbStatusFilter==='all'&&cbTierFilter==='all'&&cbFormatFilter==='all';
  mkBtn('All',all.length,isAllDefault,()=>{
    cbStatusFilter='all';
    cbTierFilter='all';
    cbFormatFilter='all';
    renderCourseBrowser();
  });
  mkBtn('To do',todoCount,cbStatusFilter==='todo',()=>{
    cbStatusFilter=cbStatusFilter==='todo'?'all':'todo';
    renderCourseBrowser();
  });
  mkBtn('Done',doneCount,cbStatusFilter==='done',()=>{
    cbStatusFilter=cbStatusFilter==='done'?'all':'done';
    renderCourseBrowser();
  });

  mkSep();
  for(let t=1;t<=4;t++){
    const cnt=all.filter(c=>c.tier===t).length;
    if(cnt===0)continue;
    mkBtn(`Tier ${t}`,cnt,cbTierFilter===t,()=>{
      cbTierFilter=cbTierFilter===t?'all':t;
      renderCourseBrowser();
    });
  }

  if(cbCategory==='surf'){
    mkSep();
    const linCnt=all.filter(c=>c.format==='linear').length;
    const stgCnt=all.filter(c=>c.format==='staged').length;
    mkBtn('Linear',linCnt,cbFormatFilter==='linear',()=>{
      cbFormatFilter=cbFormatFilter==='linear'?'all':'linear';
      renderCourseBrowser();
    });
    mkBtn('Staged',stgCnt,cbFormatFilter==='staged',()=>{
      cbFormatFilter=cbFormatFilter==='staged'?'all':'staged';
      renderCourseBrowser();
    });
  }
}

function selectBrowserCourse(courseId){
  if(typeof CourseCatalog==='undefined')return;
  const meta=CourseCatalog.getCourseMeta(courseId);
  if(!meta)return;
  cbSelectedId=meta.id;

  if(cbMapListEl){
    cbMapListEl.querySelectorAll('.cb-row').forEach(row=>{
      const isSel=row.dataset.courseId===meta.id;
      row.classList.toggle('selected',isSel);
      row.setAttribute('aria-selected',isSel?'true':'false');
    });
  }

  const pb=localPbFor(meta.id);
  const medal=CourseCatalog.getCourseMedal(meta,pb);
  const tierInfo=CourseCatalog.TIER_INFO[meta.tier]||CourseCatalog.TIER_INFO[1];
  const themeName=(typeof SURF_THEME_SPECS!=='undefined'&&SURF_THEME_SPECS[meta.theme])?SURF_THEME_SPECS[meta.theme].name:meta.theme;

  if(cbDetailTitleEl)cbDetailTitleEl.textContent=meta.name;
  if(cbDetailSubEl)cbDetailSubEl.textContent=`${meta.code} · by ${meta.author||'Velocity Core'} · ${themeName}`;
  if(cbDetailDescEl)cbDetailDescEl.textContent=meta.description;
  if(cbSpecCourseEl){
    cbSpecCourseEl.textContent=meta.format==='staged'
      ?`Staged · ${meta.cpCount} stages`
      :`Linear · ${meta.cpCount} checkpoints`;
  }
  if(cbSpecTierEl){
    cbSpecTierEl.textContent=tierInfo.label;
    cbSpecTierEl.style.color=tierInfo.color||'var(--cyan)';
  }
  if(cbSpecParEl){
    cbSpecParEl.textContent=`${fmt(meta.parGold)} / ${fmt(meta.parSilver)}`;
  }
  if(cbSpecBestEl){
    if(pb>0){
      cbSpecBestEl.textContent=medal?`${fmt(pb)} · ${medal}`:fmt(pb);
      cbSpecBestEl.style.color=(medal&&MEDAL_COLORS[medal])||'var(--cyan)';
    }else{
      cbSpecBestEl.textContent='Not finished yet';
      cbSpecBestEl.style.color='#7b9bb0';
    }
  }
  if(cbSpecPiecesEl){
    cbSpecPiecesEl.textContent=(meta.pieces||[]).join(' · ')||'—';
  }
  if(cbGhostLabelEl){
    cbGhostLabelEl.innerHTML=pb>0
      ?`Race your <b>PB Ghost</b> (${fmt(pb)}) on this course`
      :'Race your <b>PB Ghost</b> (auto-records on first finish)';
  }
  if(cbPlayBtn){
    cbPlayBtn.textContent=`Play ${meta.name}`;
    cbPlayBtn.disabled=false;
  }
  if(cbPreviewLabelEl){
    cbPreviewLabelEl.textContent=`${meta.code.toUpperCase()} · LIVE 3D`;
  }
  updatePreviewModeButtons('flythrough');
  if(typeof CoursePreview3D!=='undefined'&&coursePreviewCanvas){
    CoursePreview3D.setMode('flythrough');
    CoursePreview3D.showCourse(coursePreviewCanvas,meta);
  }
}

function launchBrowserCourse(courseId){
  const id=courseId||cbSelectedId;
  if(!id||!LEVELS[id])return;
  if(cbGhostCheckEl){
    ghostMode=cbGhostCheckEl.checked?'pb':'off';
  }
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  loadLevel(id);
  inLevel=true;
  enter();
}

function renderCourseBrowser(){
  if(typeof CourseCatalog==='undefined'||!cbMapListEl)return;
  const allInCat=CourseCatalog.getCoursesByCategory(cbCategory);
  if(cbEyebrowEl)cbEyebrowEl.textContent=cbCategory==='surf'?'CS SURF CIRCUIT':'MOVEMENT TIME TRIALS';
  if(cbTitleEl)cbTitleEl.textContent=cbCategory==='surf'?'Surf Maps':'Time Trials';
  document.querySelectorAll('[data-cb-cat]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.cbCat===cbCategory);
  });

  renderCourseBrowserFilters();
  const list=getFilteredBrowserCourses();
  cbFilteredCache=list;
  cbMapListEl.textContent='';

  if(cbCountNoteEl){
    const noun=cbCategory==='surf'?'maps':'courses';
    cbCountNoteEl.textContent=list.length===allInCat.length
      ?`${list.length} ${noun} · double-click to play`
      :`${list.length} of ${allInCat.length} ${noun} · double-click to play`;
  }

  if(list.length===0){
    const empty=document.createElement('div');
    empty.className='cb-empty';
    const msg=document.createElement('div');
    msg.textContent='No courses match the active search or filters.';
    const rst=document.createElement('button');
    rst.type='button';
    rst.className='alt';
    rst.textContent='RESET FILTERS';
    rst.onclick=()=>{resetBrowserFilters();renderCourseBrowser();};
    empty.append(msg,rst);
    cbMapListEl.appendChild(empty);
    if(cbPlayBtn)cbPlayBtn.disabled=!cbSelectedId;
    return;
  }

  for(const meta of list){
    const pb=localPbFor(meta.id);
    const medal=CourseCatalog.getCourseMedal(meta,pb);
    const tierInfo=CourseCatalog.TIER_INFO[meta.tier]||CourseCatalog.TIER_INFO[1];

    const row=document.createElement('button');
    row.type='button';
    row.className='cb-row';
    row.dataset.courseId=meta.id;
    row.setAttribute('role','option');

    const mapCell=document.createElement('div');
    mapCell.className='cb-map-cell';
    const thumb=document.createElement('img');
    thumb.className='cb-thumb';
    thumb.alt=`${meta.name} thumbnail`;
    thumb.src=typeof renderCourseThumbDataUrl==='function'?renderCourseThumbDataUrl(meta):'';
    const mapMeta=document.createElement('div');
    mapMeta.className='cb-map-meta';
    const nameEl=document.createElement('div');
    nameEl.className='cb-map-name';
    nameEl.textContent=meta.name;
    const subEl=document.createElement('div');
    subEl.className='cb-map-sub';
    subEl.textContent=`${meta.code} · ${(meta.pieces||[]).slice(0,2).join(' · ')}`;
    mapMeta.append(nameEl,subEl);
    mapCell.append(thumb,mapMeta);

    const typeCell=document.createElement('div');
    typeCell.className='cb-type-cell';
    typeCell.textContent=meta.format==='staged'?'Staged':'Linear';
    const typeSub=document.createElement('span');
    typeSub.className='cb-type-sub';
    typeSub.textContent=meta.format==='staged'?`${meta.cpCount} stages`:`${meta.cpCount} CPs`;
    typeCell.appendChild(typeSub);

    const tierCell=document.createElement('div');
    tierCell.className='cb-tier-cell';
    tierCell.textContent=`T${meta.tier}`;
    tierCell.style.color=tierInfo.color||'var(--cyan)';

    const pbCell=document.createElement('div');
    pbCell.className='cb-pb-cell'+(pb>0?'':' none');
    pbCell.textContent=pb>0?fmt(pb):'—';

    const medalCell=document.createElement('div');
    medalCell.className='cb-medal-cell';
    if(medal){
      medalCell.textContent=medal;
      medalCell.style.color=MEDAL_COLORS[medal]||'#67e8b5';
    }else{
      medalCell.textContent='—';
    }

    row.append(mapCell,typeCell,tierCell,pbCell,medalCell);
    row.onclick=()=>selectBrowserCourse(meta.id);
    row.ondblclick=()=>launchBrowserCourse(meta.id);
    cbMapListEl.appendChild(row);
  }

  const stillVisible=list.find(c=>c.id===cbSelectedId);
  selectBrowserCourse(stillVisible?stillVisible.id:list[0].id);
}

function openCourseBrowser(category,focusCourseId,returnTo){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  const nextCat=category==='timetrial'?'timetrial':'surf';
  if(nextCat!==cbCategory){
    cbCategory=nextCat;
    resetBrowserFilters();
  }
  cbReturnTarget=returnTo==='pause'&&inLevel?'pause':'menu';
  if(focusCourseId)cbSelectedId=focusCourseId;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  overlayCard.classList.add('browser-wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='';
  if(cbBackBtn)cbBackBtn.textContent=cbReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  if(cbGhostCheckEl)cbGhostCheckEl.checked=ghostMode!=='off';
  document.body.dataset.state='browser';
  document.exitPointerLock?.();
  renderCourseBrowser();
}

function closeCourseBrowser(){
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(cbReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

// ---------- Loadouts Manager & 3D Gunsmith Workbench ----------
function showWeaponLevelUpBanner(weaponName,newLevel,newUnlocks){
  if(!weaponXpToastEl)return;
  if(wxpKickerEl)wxpKickerEl.textContent='WEAPON LEVEL UP';
  if(wxpTitleEl)wxpTitleEl.textContent=`${String(weaponName||'WEAPON').toUpperCase()} · LV. ${newLevel}`;
  if(wxpSubEl){
    if(Array.isArray(newUnlocks)&&newUnlocks.length>0){
      const names=newUnlocks.slice(0,2).map(u=>u.name.toUpperCase()).join(' · ');
      wxpSubEl.textContent=`UNLOCKED: ${names}${newUnlocks.length>2?` +${newUnlocks.length-2}`:''}`;
    }else{
      wxpSubEl.textContent='NEW GUNSMITH MILESTONE REACHED';
    }
  }
  weaponXpToastEl.style.opacity='1';
  weaponXpToastTimer=4.0;
}

function grantWeaponXp(weaponId,xpAmount){
  if(!weaponId||!LoadoutsSystem.WEAPON_SPECS[weaponId]||!(xpAmount>0))return;
  const res=LoadoutsSystem.awardWeaponXp(window.activeLoadouts,weaponId,xpAmount);
  window.activeLoadouts=LoadoutsSystem.saveLocal(res.state);
  scheduleCloudLoadoutsSave();
  if(res.leveledUp){
    const spec=LoadoutsSystem.getWeaponSpec(weaponId);
    showWeaponLevelUpBanner(spec.name,res.newLevel,res.newUnlocks);
  }
  if(loadoutsPanelEl&&loadoutsPanelEl.style.display!=='none'){
    if(gunsmithMode)renderGunsmith();
    else renderLoadoutsOverview();
  }
}

function getWeaponSkinForLoadoutEntry(weaponId,skinItemId){
  const list=(window.activeInventory.weapons||[]).filter(w=>w.weaponType===weaponId);
  if(skinItemId){
    const exact=list.find(w=>w.id===skinItemId);
    if(exact)return exact;
  }
  const mapId=window.activeLoadouts&&window.activeLoadouts.equippedWeaponSkins?window.activeLoadouts.equippedWeaponSkins[weaponId]:'';
  if(mapId){
    const mapped=list.find(w=>w.id===mapId);
    if(mapped)return mapped;
  }
  return KnivesSystem.getEquippedWeapon(window.activeInventory,weaponId);
}

function getMeleeKnifeForLoadout(ld){
  if(ld&&ld.melee&&ld.melee.knifeItemId){
    const found=(window.activeInventory.knives||[]).find(k=>k.id===ld.melee.knifeItemId);
    if(found)return found;
  }
  return KnivesSystem.getEquippedKnife(window.activeInventory);
}

function commitLoadoutsState(nextState,opts){
  const options=opts||{};
  window.activeLoadouts=LoadoutsSystem.saveLocal(nextState);
  scheduleCloudLoadoutsSave();
  const isOnlineArena=inLevel&&NetcodeSystem.getState().isOnline;
  if(!options.skipApply){
    if(isOnlineArena&&!options.forceImmediate){
      pendingLoadoutApply=true;
      if(!options.silentToast)showToast('LOADOUT QUEUED FOR NEXT RESPAWN');
    }else{
      pendingLoadoutApply=false;
      applyActiveLoadoutToRuntime({keepSlot:true});
    }
  }
  renderQuickLoadoutStrips();
}

window.applyPendingLoadoutIfAny=function(){
  if(!pendingLoadoutApply)return false;
  pendingLoadoutApply=false;
  applyActiveLoadoutToRuntime({keepSlot:true});
  showToast(`LOADOUT ACTIVE: ${LoadoutsSystem.getActiveLoadout(window.activeLoadouts).name.toUpperCase()}`);
  return true;
};

function selectActiveLoadout(idx,opts){
  const cleanIdx=Math.max(0,Math.min(LoadoutsSystem.LOADOUT_COUNT-1,Math.floor(Number(idx)||0)));
  selectedLoadoutIdx=cleanIdx;
  const next={...window.activeLoadouts,activeIndex:cleanIdx};
  const isOnlineArena=inLevel&&NetcodeSystem.getState().isOnline;
  commitLoadoutsState(next,{silentToast:true,forceImmediate:!isOnlineArena});
  const ld=LoadoutsSystem.getActiveLoadout(window.activeLoadouts);
  if(!opts||!opts.silent){
    showToast(isOnlineArena?`QUEUED [${cleanIdx+1}] ${ld.name.toUpperCase()} FOR NEXT RESPAWN`:`ACTIVE LOADOUT [${cleanIdx+1}] ${ld.name.toUpperCase()}`);
  }
}

function formatLoadoutShortSummary(ld){
  if(!ld)return '';
  const pSpec=LoadoutsSystem.getWeaponSpec(ld.primary.weaponId);
  const sSpec=LoadoutsSystem.getWeaponSpec(ld.secondary.weaponId);
  const pCnt=LoadoutsSystem.countEquippedAttachments(ld.primary.attachments);
  const sCnt=LoadoutsSystem.countEquippedAttachments(ld.secondary.attachments);
  return `${pSpec.shortName} (${pCnt}/5) · ${sSpec.shortName} (${sCnt}/5)`;
}

function renderQuickLoadoutStrips(){
  if(!window.activeLoadouts)return;
  const activeIdx=window.activeLoadouts.activeIndex||0;
  const activeLd=LoadoutsSystem.getActiveLoadout(window.activeLoadouts);
  const summary=formatLoadoutShortSummary(activeLd);
  if(menuLoadoutSummaryEl)menuLoadoutSummaryEl.textContent=summary;
  if(pauseLoadoutSummaryEl)pauseLoadoutSummaryEl.textContent=pendingLoadoutApply?`${summary} · QUEUED`:summary;
  if(menuLoadoutStatEl)menuLoadoutStatEl.textContent=`ACTIVE: ${activeLd.name.toUpperCase()} · ${summary.toUpperCase()}`;

  const renderStrip=(container)=>{
    if(!container)return;
    container.textContent='';
    for(let i=0;i<window.activeLoadouts.loadouts.length;i++){
      const ld=window.activeLoadouts.loadouts[i];
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='ld-quick-btn'+(i===activeIdx?' active':'');
      btn.title=`${ld.name} — ${formatLoadoutShortSummary(ld)}`;
      const num=document.createElement('b');
      num.textContent=String(i+1);
      btn.appendChild(num);
      btn.appendChild(document.createTextNode(ld.name));
      btn.onclick=()=>selectActiveLoadout(i);
      container.appendChild(btn);
    }
  };
  renderStrip(menuLoadoutStripEl);
  renderStrip(pauseLoadoutStripEl);
}

function openLoadoutsPanel(returnTo,initialSlotCategory){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  loadoutsReturnTarget=returnTo==='pause'&&inLevel?'pause':'menu';
  selectedLoadoutIdx=window.activeLoadouts.activeIndex||0;
  gunsmithMode=Boolean(initialSlotCategory);
  gunsmithSlotCategory=initialSlotCategory==='secondary'?'secondary':'primary';
  gunsmithSkinsMode=false;
  gunsmithHoverAttId=null;

  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  overlayCard.classList.add('browser-wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  pauseEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='';
  if(loadoutsBackBtn)loadoutsBackBtn.textContent=loadoutsReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='loadouts';
  document.exitPointerLock?.();
  updateLoadoutsSyncLabel();
  if(gunsmithMode)renderGunsmith();
  else renderLoadoutsOverview();
}

function closeLoadoutsPanel(){
  ArmoryPreview.stop();
  gunsmithMode=false;
  gunsmithHoverAttId=null;
  if(loadoutsReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

function renderLoadoutsOverview(){
  if(!loadoutsOverviewViewEl||!gunsmithViewEl)return;
  gunsmithMode=false;
  gunsmithHoverAttId=null;
  ArmoryPreview.stop();
  loadoutsOverviewViewEl.style.display='';
  gunsmithViewEl.style.display='none';
  if(loadoutsEyebrowEl)loadoutsEyebrowEl.textContent='TACTICAL LOADOUTS & 3D GUNSMITH';
  if(loadoutsTitleEl)loadoutsTitleEl.textContent='Custom Loadouts';

  const st=window.activeLoadouts;
  const ld=st.loadouts[selectedLoadoutIdx]||st.loadouts[0];

  // Left rail: 5 named loadouts
  if(loadoutsRailEl){
    loadoutsRailEl.textContent='';
    st.loadouts.forEach((item,i)=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='ld-tab'+(i===selectedLoadoutIdx?' active':'');
      const top=document.createElement('div');
      top.className='ld-tab-top';
      const idxEl=document.createElement('span');
      idxEl.className='ld-tab-idx';
      idxEl.textContent=`LOADOUT 0${i+1}`;
      top.appendChild(idxEl);
      if(i===st.activeIndex){
        const tag=document.createElement('span');
        tag.className='ld-tab-active-tag';
        tag.textContent='EQUIPPED';
        top.appendChild(tag);
      }
      const nm=document.createElement('div');
      nm.className='ld-tab-name';
      nm.textContent=item.name;
      const sub=document.createElement('div');
      sub.className='ld-tab-sub';
      sub.textContent=formatLoadoutShortSummary(item);
      btn.append(top,nm,sub);
      btn.onclick=()=>{
        selectActiveLoadout(i,{silent:true});
        renderLoadoutsOverview();
      };
      loadoutsRailEl.appendChild(btn);
    });
  }

  if(loadoutNameInput&&document.activeElement!==loadoutNameInput){
    loadoutNameInput.value=ld.name;
  }

  // Right 3-slot cards (Primary, Secondary, Melee)
  if(!loadoutsSlotsGridEl)return;
  loadoutsSlotsGridEl.textContent='';

  const buildFirearmCard=(slotCategory)=>{
    const isPrimary=slotCategory==='primary';
    const entry=ld[slotCategory];
    const spec=LoadoutsSystem.getWeaponSpec(entry.weaponId);
    const build=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,entry.attachments);
    const lvlInfo=LoadoutsSystem.getWeaponLevelInfo(st.weaponXp[entry.weaponId]||0);
    const skinItem=getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);

    const card=document.createElement('div');
    card.className='ld-slot-card';

    const head=document.createElement('div');
    head.className='ld-slot-head';
    head.innerHTML=`<span class="ld-slot-kicker">${isPrimary?'1 · PRIMARY':'2 · SECONDARY'}</span><span class="ld-slot-lvl">LV. ${lvlInfo.level}</span>`;

    const thumbBox=document.createElement('div');
    thumbBox.className='ld-slot-thumb-box';
    const img=document.createElement('img');
    img.className='ld-slot-thumb';
    img.alt=spec.name;
    img.src=getThumbForItem(skinItem);
    thumbBox.appendChild(img);

    const title=document.createElement('h3');
    title.className='ld-slot-title';
    title.textContent=spec.name;

    const skinLine=document.createElement('div');
    skinLine.className='ld-slot-skin';
    const skinName=skinItem&&KnivesSystem.WEAPON_SKINS[skinItem.skinId]?KnivesSystem.WEAPON_SKINS[skinItem.skinId].name:'Factory Issue';
    skinLine.textContent=`${spec.classLabel} · Skin: ${skinName}`;

    // Weapon selector buttons
    const pickers=document.createElement('div');
    pickers.className='ld-wep-pickers';
    const roster=isPrimary?LoadoutsSystem.PRIMARY_WEAPON_IDS:LoadoutsSystem.SECONDARY_WEAPON_IDS;
    for(const wid of roster){
      const ws=LoadoutsSystem.getWeaponSpec(wid);
      const wb=document.createElement('button');
      wb.type='button';
      wb.className='ld-wep-btn'+(wid===entry.weaponId?' active':'');
      wb.textContent=ws.shortName.toUpperCase();
      wb.onclick=()=>{
        const updated=LoadoutsSystem.setLoadoutWeapon(window.activeLoadouts,selectedLoadoutIdx,slotCategory,wid);
        commitLoadoutsState(updated,{silentToast:true});
        renderLoadoutsOverview();
      };
      pickers.appendChild(wb);
    }

    const specs=document.createElement('div');
    specs.className='ld-slot-specs';
    specs.innerHTML=`
      <div class="ld-slot-spec"><span>Attachments</span><b>${build.attachmentCount} / 5</b></div>
      <div class="ld-slot-spec"><span>Mobility / Surf</span><b>${Math.round(build.mobilityMult*100)}% / ${Math.round(build.surfAirMult*100)}%</b></div>
      <div class="ld-slot-spec"><span>Weight / ADS</span><b>${build.weightKg.toFixed(1)} kg · ${Math.round(build.adsTimeSec*1000)} ms</b></div>
    `;

    const atts=document.createElement('div');
    atts.className='ld-slot-atts';
    if(build.equippedList.length===0){
      atts.textContent='Stock configuration — open Gunsmith to equip up to 5 attachments.';
    }else{
      atts.textContent=build.equippedList.map(a=>a.name).join(' · ');
    }

    const cta=document.createElement('button');
    cta.type='button';
    cta.className='ld-slot-cta';
    cta.textContent='CUSTOMIZE IN 3D GUNSMITH';
    cta.onclick=()=>openGunsmith(slotCategory);

    card.append(head,thumbBox,title,skinLine,pickers,specs,atts,cta);
    return card;
  };

  // Melee Card
  const buildMeleeCard=()=>{
    const knife=getMeleeKnifeForLoadout(ld);
    const kt=KnivesSystem.KNIFE_TYPES[knife.knifeType]||KnivesSystem.KNIFE_TYPES.default;
    const sk=KnivesSystem.SKINS[knife.skinId]||KnivesSystem.SKINS.vanilla;
    const card=document.createElement('div');
    card.className='ld-slot-card';

    const head=document.createElement('div');
    head.className='ld-slot-head';
    head.innerHTML='<span class="ld-slot-kicker">3 · MELEE</span><span class="ld-slot-lvl" style="color:#6effa6">100% PURE SURF</span>';

    const thumbBox=document.createElement('div');
    thumbBox.className='ld-slot-thumb-box';
    const img=document.createElement('img');
    img.className='ld-slot-thumb';
    img.alt=kt.name;
    img.src=getThumbForItem(knife);
    thumbBox.appendChild(img);

    const title=document.createElement('h3');
    title.className='ld-slot-title';
    title.textContent=kt.name;

    const skinLine=document.createElement('div');
    skinLine.className='ld-slot-skin';
    skinLine.textContent=`Finish: ${sk.name} · ${knife.wearGrade}`;

    // Owned knife quick selector
    const pickers=document.createElement('div');
    pickers.className='ld-wep-pickers';
    const ownedKnives=(window.activeInventory.knives||[]).slice(0,6);
    for(const k of ownedKnives){
      const kb=document.createElement('button');
      kb.type='button';
      kb.className='ld-wep-btn'+(k.id===knife.id?' active':'');
      const kMeta=KnivesSystem.KNIFE_TYPES[k.knifeType]||KnivesSystem.KNIFE_TYPES.default;
      kb.textContent=kMeta.name.replace(' Knife','').toUpperCase();
      kb.title=KnivesSystem.formatKnifeFullName(k);
      kb.onclick=()=>{
        const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
        next.loadouts[selectedLoadoutIdx].melee.knifeItemId=k.id;
        window.activeInventory.equippedKnifeId=k.id;
        persistInventorySummary(true);
        ViewmodelSystem.equipKnife(k,false);
        commitLoadoutsState(next,{silentToast:true});
        renderLoadoutsOverview();
      };
      pickers.appendChild(kb);
    }

    const specs=document.createElement('div');
    specs.className='ld-slot-specs';
    specs.innerHTML=`
      <div class="ld-slot-spec"><span>Ground Mobility</span><b style="color:#6effa6">100%</b></div>
      <div class="ld-slot-spec"><span>Surf Air Control</span><b style="color:#6effa6">100% (No Penalty)</b></div>
      <div class="ld-slot-spec"><span>Weight</span><b>0.35 kg</b></div>
    `;

    const atts=document.createElement('div');
    atts.className='ld-slot-atts';
    atts.textContent='Melee always preserves pure 1.00× VELOCITY surf physics and air-strafe responsiveness.';

    const cta=document.createElement('button');
    cta.type='button';
    cta.className='alt ld-slot-cta';
    cta.textContent='OPEN ARMORY KNIVES';
    cta.onclick=()=>{
      invCategory='knives';
      invFilterType='all';
      openArmory(loadoutsReturnTarget,'inventory');
    };

    card.append(head,thumbBox,title,skinLine,pickers,specs,atts,cta);
    return card;
  };

  loadoutsSlotsGridEl.appendChild(buildFirearmCard('primary'));
  loadoutsSlotsGridEl.appendChild(buildFirearmCard('secondary'));
  loadoutsSlotsGridEl.appendChild(buildMeleeCard());
}

function openGunsmith(slotCategory){
  gunsmithMode=true;
  gunsmithSlotCategory=slotCategory==='secondary'?'secondary':'primary';
  gunsmithAttCategory='optic';
  gunsmithSkinsMode=false;
  gunsmithHoverAttId=null;
  renderGunsmith();
}

function getGunsmithEntry(){
  const ld=window.activeLoadouts.loadouts[selectedLoadoutIdx]||window.activeLoadouts.loadouts[0];
  return ld[gunsmithSlotCategory==='secondary'?'secondary':'primary'];
}

function updateGunsmith3DPreview(previewAttachments){
  if(!gunsmithCanvasEl||!gunsmithMode)return;
  const entry=getGunsmithEntry();
  const skinItem=getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);
  const atts=previewAttachments||entry.attachments;
  ArmoryPreview.showGunsmithWeapon(gunsmithCanvasEl,skinItem,atts,{focusSlot:gunsmithSkinsMode?'none':gunsmithAttCategory});
}

function renderGunsmithStats(currentBuild,previewBuild){
  if(!gsStatsBoxEl)return;
  const cmp=LoadoutsSystem.compareBuilds(currentBuild,previewBuild);
  const rows=[
    ['DAMAGE','damage'],
    ['RANGE','range'],
    ['FIRE RATE','fireRate'],
    ['ACCURACY','accuracy'],
    ['HANDLING','handling'],
    ['MOBILITY','mobility']
  ];
  gsStatsBoxEl.textContent='';
  for(const [label,key] of rows){
    const curVal=currentBuild.bars[key]||0;
    const preVal=previewBuild.bars[key]||0;
    const delta=cmp.bars[key]||0;
    const row=document.createElement('div');
    row.className='gs-stat-row';

    const kEl=document.createElement('span');
    kEl.className='gs-stat-k';
    kEl.textContent=label;

    const track=document.createElement('div');
    track.className='gs-stat-track';
    const baseFill=document.createElement('div');
    baseFill.className='gs-stat-base';
    baseFill.style.width=`${Math.min(curVal,preVal)}%`;
    track.appendChild(baseFill);
    if(delta>0){
      const dEl=document.createElement('div');
      dEl.className='gs-stat-delta-pos';
      dEl.style.left=`${curVal}%`;
      dEl.style.width=`${delta}%`;
      track.appendChild(dEl);
    }else if(delta<0){
      const dEl=document.createElement('div');
      dEl.className='gs-stat-delta-neg';
      dEl.style.left=`${preVal}%`;
      dEl.style.width=`${Math.abs(delta)}%`;
      track.appendChild(dEl);
    }

    const vEl=document.createElement('span');
    vEl.className='gs-stat-v'+(delta>0?' pos':delta<0?' neg':'');
    vEl.textContent=delta===0?String(curVal):`${preVal} (${delta>0?'+':''}${delta})`;

    row.append(kEl,track,vEl);
    gsStatsBoxEl.appendChild(row);
  }

  const numGrid=document.createElement('div');
  numGrid.className='gs-num-grid';
  const adsMs=Math.round(previewBuild.adsTimeSec*1000);
  const surfPct=Math.round(previewBuild.surfAirMult*100);
  const cells=[
    ['ADS TIME',`${adsMs} ms`,cmp.adsMsDelta<0?'pos':cmp.adsMsDelta>0?'neg':''],
    ['WEIGHT',`${previewBuild.weightKg.toFixed(2)} kg`,cmp.weightDelta<0?'pos':cmp.weightDelta>0?'neg':''],
    ['SURF CTRL',`${surfPct}%`,cmp.surfPctDelta>0?'pos':cmp.surfPctDelta<0?'neg':''],
    ['MAGAZINE',`${previewBuild.magSize} rds`,cmp.magDelta>0?'pos':cmp.magDelta<0?'neg':'']
  ];
  for(const [k,v,cls] of cells){
    const c=document.createElement('div');
    c.className='gs-num-cell';
    c.innerHTML=`<div class="gs-num-k">${k}</div><div class="gs-num-v ${cls}">${v}</div>`;
    numGrid.appendChild(c);
  }
  gsStatsBoxEl.appendChild(numGrid);
}

function renderGunsmith(){
  if(!loadoutsOverviewViewEl||!gunsmithViewEl)return;
  loadoutsOverviewViewEl.style.display='none';
  gunsmithViewEl.style.display='';

  const st=window.activeLoadouts;
  const ld=st.loadouts[selectedLoadoutIdx]||st.loadouts[0];
  const entry=getGunsmithEntry();
  const spec=LoadoutsSystem.getWeaponSpec(entry.weaponId);
  const xp=st.weaponXp[entry.weaponId]||0;
  const lvlInfo=LoadoutsSystem.getWeaponLevelInfo(xp);
  const currentBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,entry.attachments);

  if(loadoutsEyebrowEl)loadoutsEyebrowEl.textContent=`3D GUNSMITH · ${ld.name.toUpperCase()} (${gunsmithSlotCategory.toUpperCase()})`;
  if(loadoutsTitleEl)loadoutsTitleEl.textContent=spec.name;
  if(gsWeaponTitleEl)gsWeaponTitleEl.textContent=spec.name;
  if(gsWeaponLevelLabelEl)gsWeaponLevelLabelEl.textContent=lvlInfo.isMax?`LV. ${lvlInfo.level} MAX`:`LV. ${lvlInfo.level}`;
  if(gsWeaponXpFillEl)gsWeaponXpFillEl.style.width=`${Math.round(lvlInfo.progress*100)}%`;
  if(gsWeaponXpTextEl){
    const xpNeededThisLevel=Math.max(0,lvlInfo.nextThreshold-lvlInfo.currentFloor);
    gsWeaponXpTextEl.textContent=lvlInfo.isMax
      ?`${lvlInfo.xp} XP · MAXED`
      :`${lvlInfo.xpIntoLevel} / ${xpNeededThisLevel} XP`;
  }
  if(gsBudgetBadgeEl){
    gsBudgetBadgeEl.textContent=`ATTACHMENTS ${currentBuild.attachmentCount} / ${LoadoutsSystem.MAX_ATTACHMENTS}`;
    gsBudgetBadgeEl.classList.toggle('full',currentBuild.attachmentCount>=LoadoutsSystem.MAX_ATTACHMENTS);
  }
  if(gsSkinsToggleBtn){
    gsSkinsToggleBtn.textContent=gunsmithSkinsMode?'ATTACHMENTS':'SKINS';
  }
  if(gsStageLabelEl){
    gsStageLabelEl.textContent=`${spec.name.toUpperCase()} · ${currentBuild.attachmentCount}/5 MODS`;
  }

  // Left 8-slot category rail
  if(gsCategoryRailEl){
    gsCategoryRailEl.textContent='';
    for(const slotMeta of LoadoutsSystem.ATTACHMENT_SLOTS){
      const equippedId=entry.attachments[slotMeta.id];
      const equippedDef=equippedId?LoadoutsSystem.getAttachmentDef(slotMeta.id,equippedId):null;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='gs-cat-btn'+(!gunsmithSkinsMode&&gunsmithAttCategory===slotMeta.id?' active':'')+(equippedDef?' equipped':'');
      const left=document.createElement('div');
      left.style.minWidth='0';
      const lbl=document.createElement('div');
      lbl.textContent=slotMeta.label.toUpperCase();
      const sub=document.createElement('span');
      sub.className='gs-cat-sub';
      sub.textContent=equippedDef?equippedDef.name:'None';
      left.append(lbl,sub);
      const dot=document.createElement('span');
      dot.className='gs-cat-dot';
      btn.append(left,dot);
      btn.onclick=()=>{
        gunsmithSkinsMode=false;
        gunsmithAttCategory=slotMeta.id;
        gunsmithHoverAttId=null;
        renderGunsmith();
      };
      gsCategoryRailEl.appendChild(btn);
    }
  }

  if(gunsmithSkinsMode){
    if(gsAttachmentListEl)gsAttachmentListEl.style.display='none';
    if(gsSkinsGridEl)gsSkinsGridEl.style.display='';
    if(gsPickerHeadingEl)gsPickerHeadingEl.textContent=`${spec.shortName.toUpperCase()} SKINS (OWNED IN ARMORY)`;
    renderGunsmithSkins(entry);
    renderGunsmithStats(currentBuild,currentBuild);
    updateGunsmith3DPreview(entry.attachments);
    return;
  }

  if(gsAttachmentListEl)gsAttachmentListEl.style.display='';
  if(gsSkinsGridEl)gsSkinsGridEl.style.display='none';
  const curSlotMeta=LoadoutsSystem.ATTACHMENT_SLOTS.find(s=>s.id===gunsmithAttCategory)||LoadoutsSystem.ATTACHMENT_SLOTS[0];
  if(gsPickerHeadingEl)gsPickerHeadingEl.textContent=`${curSlotMeta.label.toUpperCase()} — ${curSlotMeta.desc}`;

  const options=LoadoutsSystem.getSlotAttachmentsForWeapon(entry.weaponId,gunsmithAttCategory);
  const equippedId=entry.attachments[gunsmithAttCategory]||'';

  if(gsAttachmentListEl){
    gsAttachmentListEl.textContent='';
    if(equippedId){
      const rmBtn=document.createElement('button');
      rmBtn.type='button';
      rmBtn.className='gs-att-card';
      rmBtn.innerHTML='<div class="gs-att-top"><span class="gs-att-name">Remove Attachment</span><span class="gs-att-tag">RESTORE STOCK</span></div><div class="gs-att-desc">Frees 1 of your 5 Gunsmith attachment slots.</div>';
      rmBtn.onmouseenter=()=>{
        const previewAtts={...entry.attachments};
        delete previewAtts[gunsmithAttCategory];
        const previewBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,previewAtts);
        renderGunsmithStats(currentBuild,previewBuild);
        updateGunsmith3DPreview(previewAtts);
      };
      rmBtn.onmouseleave=()=>{
        renderGunsmithStats(currentBuild,currentBuild);
        updateGunsmith3DPreview(entry.attachments);
      };
      rmBtn.onclick=()=>{
        const res=LoadoutsSystem.equipAttachment(window.activeLoadouts,selectedLoadoutIdx,gunsmithSlotCategory,gunsmithAttCategory,null);
        commitLoadoutsState(res.state,{silentToast:true});
        renderGunsmith();
      };
      gsAttachmentListEl.appendChild(rmBtn);
    }

    for(const att of options){
      const unlocked=LoadoutsSystem.isAttachmentUnlocked(entry.weaponId,gunsmithAttCategory,att.id,xp);
      const isEq=equippedId===att.id;
      const card=document.createElement('button');
      card.type='button';
      card.className='gs-att-card'+(isEq?' equipped':'')+(!unlocked?' locked':'');

      const top=document.createElement('div');
      top.className='gs-att-top';
      const nm=document.createElement('span');
      nm.className='gs-att-name';
      nm.textContent=att.name;
      const tag=document.createElement('span');
      tag.className='gs-att-tag'+(!unlocked?' locked':'');
      tag.textContent=isEq?'EQUIPPED':(unlocked?`LV. ${att.unlockLevel}`:`LOCKED · LV. ${att.unlockLevel}`);
      top.append(nm,tag);

      const desc=document.createElement('div');
      desc.className='gs-att-desc';
      desc.textContent=att.desc||'';

      const pc=document.createElement('div');
      pc.className='gs-att-pc';
      for(const p of (att.pros||[])){
        const s=document.createElement('span');
        s.className='gs-pro';
        s.textContent='+ '+p;
        pc.appendChild(s);
      }
      for(const c of (att.cons||[])){
        const s=document.createElement('span');
        s.className='gs-con';
        s.textContent='− '+c;
        pc.appendChild(s);
      }

      card.append(top,desc,pc);

      card.onmouseenter=()=>{
        gunsmithHoverAttId=att.id;
        const previewAtts={...entry.attachments,[gunsmithAttCategory]:att.id};
        const previewBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,previewAtts);
        renderGunsmithStats(currentBuild,previewBuild);
        updateGunsmith3DPreview(previewAtts);
      };
      card.onmouseleave=()=>{
        gunsmithHoverAttId=null;
        renderGunsmithStats(currentBuild,currentBuild);
        updateGunsmith3DPreview(entry.attachments);
      };
      card.onclick=()=>{
        const res=LoadoutsSystem.equipAttachment(window.activeLoadouts,selectedLoadoutIdx,gunsmithSlotCategory,gunsmithAttCategory,att.id);
        if(!res.ok){
          if(res.reason==='locked'){
            showToast(`UNLOCKS AT ${spec.shortName.toUpperCase()} LV. ${res.unlockLevel} — EARN XP ON TARGETS & KILLS`);
          }else if(res.reason==='cap_reached'){
            showToast('5 / 5 ATTACHMENT CAP REACHED — REMOVE A MOD FIRST');
          }
          return;
        }
        commitLoadoutsState(res.state,{silentToast:true});
        renderGunsmith();
      };
      gsAttachmentListEl.appendChild(card);
    }
  }

  renderGunsmithStats(currentBuild,currentBuild);
  updateGunsmith3DPreview(entry.attachments);
}

function renderGunsmithSkins(entry){
  if(!gsSkinsGridEl)return;
  const owned=(window.activeInventory.weapons||[]).filter(w=>w.weaponType===entry.weaponId);
  const activeSkin=getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);
  gsSkinsGridEl.textContent='';
  if(owned.length===0){
    const empty=document.createElement('div');
    empty.className='inv-empty';
    empty.textContent='No Armory skins unlocked for this weapon yet. Open cases in the Armory to unbox finishes.';
    gsSkinsGridEl.appendChild(empty);
    return;
  }
  for(const item of owned){
    const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const sk=KnivesSystem.WEAPON_SKINS[item.skinId]||KnivesSystem.WEAPON_SKINS.factory_slate;
    const isEq=activeSkin&&activeSkin.id===item.id;
    const card=document.createElement('button');
    card.type='button';
    card.className='gs-skin-card'+(isEq?' equipped':'');
    card.style.setProperty('--rar-col',rar.color);
    const img=document.createElement('img');
    img.className='gs-skin-thumb';
    img.alt=sk.name;
    img.src=getThumbForItem(item);
    const top=document.createElement('div');
    top.className='gs-att-top';
    const nm=document.createElement('span');
    nm.className='gs-att-name';
    nm.style.fontSize='11.5px';
    nm.textContent=sk.name;
    const tag=document.createElement('span');
    tag.className='gs-att-tag';
    tag.textContent=isEq?'EQUIPPED':item.wearGrade;
    top.append(nm,tag);
    card.append(img,top);
    card.onclick=()=>{
      const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
      next.loadouts[selectedLoadoutIdx][gunsmithSlotCategory].skinItemId=item.id;
      next.equippedWeaponSkins[entry.weaponId]=item.id;
      window.activeInventory[weaponEquipField(entry.weaponId)]=item.id;
      persistInventorySummary(true);
      ViewmodelSystem.equipWeaponSkin(item);
      commitLoadoutsState(next,{silentToast:true});
      showToast(`EQUIPPED ${KnivesSystem.formatWeaponFullName(item).toUpperCase()}`);
      renderGunsmith();
    };
    gsSkinsGridEl.appendChild(card);
  }
}

function showMenu(){
  pauseWorldViewActive=false;
  pauseViewBlend=0;
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  bulkSellMode=false;
  bulkSelectedIds.clear();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  CombatSystem.clearScope();
  inLevel=false;
  pendingLoadoutApply=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','browser-wide');
  menuEl.style.display='';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  arenaScoreboardEl.style.display='none';
  awpScopeOverlayEl.style.display='none';
  document.body.dataset.state='title';
  refreshTodayButton();
  refreshMenuCourseStats();
  renderQuickLoadoutStrips();
  renderControlsLegend();
  updateArmoryBadges();
  for(const id in LEVELS){
    const el=$('pb-'+id),t=localPbFor(id);
    if(el&&t>0)el.textContent='PB '+fmt(t);
  }
}

function showPause(){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  CombatSystem.clearScope();
  pauseWorldViewActive=true;
  pauseViewBlend=0;
  pauseStartCameraPosition.copy(camera.position);
  pauseStartCameraQuaternion.copy(camera.quaternion);
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','browser-wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='';
  arenaScoreboardEl.style.display='none';
  renderQuickLoadoutStrips();
  renderArenaHudStatic();
  document.body.dataset.state='paused';
}

function enter(){
  pauseWorldViewActive=false;
  pauseViewBlend=0;
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  overlay.style.display='none';
  overlayCard.classList.remove('wide','browser-wide');
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  document.body.dataset.state='playing';
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  render(0.016);
  renderer.render(scene,camera);
  if(inLevel&&!pauseWorldViewActive)ViewmodelSystem.render(renderer);
  try{
    const res=renderer.domElement.requestPointerLock?.();
    if(res&&typeof res.catch==='function')res.catch(()=>{});
  }catch(_){}
}

function onUnlock(){if(inLevel&&overlay.style.display==='none')showPause();}

// Award coins on course completion + auto-submit daily runs to Firestore when signed in
window.onCourseFinished=async function(info){
  if(!info)return;
  const reward=KnivesSystem.grantRunRewards(window.activeInventory,{
    dateKey:info.dateKey||'',
    isNewBest:!!info.isNewBest,
    cleanGauntlet:Boolean(info.gauntlet&&info.gauntlet.cleanRun),
    todayKey:DailyCourseGen.getTodayDateKey(),
    courseTier:level&&level.tier?level.tier:1
  });
  window.activeInventory=reward.inventory;
  persistInventorySummary(true);
  let coinMsg='';
  if(reward.coinsEarned>0){
    CaseAudio.coinChime('earn');
    const tags=reward.breakdown.map(b=>{
      if(b.reason==='Course Finish')return 'FINISH';
      if(b.reason==='Clean Gauntlet')return 'CLEAN';
      if(b.reason==='New Personal Best')return 'PB';
      if(b.reason==='Daily First Clear')return 'DAILY';
      if(/^Tier \d+ Bonus$/.test(b.reason))return b.reason.replace('Tier ','T').toUpperCase();
      return b.reason.toUpperCase();
    });
    coinMsg=`+${fmtCoins(reward.coinsEarned)} COINS (${tags.join(' + ')})`;
  }

  if(!info.dateKey||!window.DailyBackend){
    if(coinMsg)showToast(coinMsg);
    return;
  }
  try{
    const res=await window.DailyBackend.submitDailyRun(info.dateKey,info.runTime,info.splits);
    if(res.submitted&&res.improved){
      showToast((res.rank?`LEADERBOARD #${res.rank}`:'LEADERBOARD UPDATED')+(coinMsg?' · '+coinMsg:''));
    }else if(res.reason==='signed-out'&&info.isNewBest){
      showToast(`NEW PB ${fmt(info.runTime)}`+(coinMsg?' · '+coinMsg:''));
    }else if(coinMsg){
      showToast(coinMsg);
    }
  }catch(_){
    if(coinMsg)showToast(coinMsg);
  }
};

// Wire Netcode & Warmup callbacks
NetcodeSystem.setCallbacks({
  onStateChange:()=>renderArenaHudStatic(),
  onKillFeed:(entries)=>renderKillFeed(entries),
  onBanner:(b)=>message(b.subtext?`${b.text} · ${b.subtext}`:b.text,{duration:b.durationMs||2000}),
  onLocalRespawn:(sp,refill)=>respawnAtSpawn(sp,refill),
  onRemoteTracer:(m)=>CombatSystem.spawnTracer(V3(m.sx,m.sy,m.sz),V3(m.ex,m.ey,m.ez),m.slot==='awp'?0x7ef2ff:0xffa065),
  onLocalKill:(info)=>{
    const hs=Boolean(info&&(info.isHeadshot||info.headshot));
    const killWep=(info&&(info.weaponId||info.slot))||CombatSystem.getActiveWeaponType();
    if(info&&info.victimIsBot){
      const xpGain=hs?LoadoutsSystem.XP_REWARDS.botHeadshot:LoadoutsSystem.XP_REWARDS.botKill;
      if(LoadoutsSystem.WEAPON_SPECS[killWep])grantWeaponXp(killWep,xpGain);
      showToast(`${hs?'HEADSHOT':'BOT ELIMINATION'} · +${xpGain} GUN XP`);
      return;
    }
    const res=KnivesSystem.grantArenaKillCoins(window.activeInventory,{headshot:hs});
    window.activeInventory=res.inventory;
    persistInventorySummary(true);
    CaseAudio.coinChime('earn');
    const xpGain=hs?LoadoutsSystem.XP_REWARDS.arenaHeadshot:LoadoutsSystem.XP_REWARDS.arenaKill;
    if(LoadoutsSystem.WEAPON_SPECS[killWep])grantWeaponXp(killWep,xpGain);
    showToast(`${hs?'HEADSHOT':'ELIMINATION'} · +${fmtCoins(res.coinsEarned)}C · +${xpGain} XP`);
  },
  onMatchEnd:(info)=>{
    const reward=KnivesSystem.grantArenaReward(window.activeInventory,{won:Boolean(info&&info.isLocalWinner)});
    window.activeInventory=reward.inventory;
    persistInventorySummary(true);
    if(reward.coinsEarned>0){
      CaseAudio.coinChime('earn');
      const prefix=info&&info.isLocalWinner?'VICTORY':'MATCH COMPLETE';
      showToast(`${prefix} · +${fmtCoins(reward.coinsEarned)} COINS`);
    }
    document.exitPointerLock?.();
  }
});
CombatSystem.setOnWarmupKill((info)=>{
  NetcodeSystem.pushWarmupKill(info.botName,info.weaponId||info.slot,info.isHeadshot);
  renderArenaHudStatic();
});
CombatSystem.setOnWeaponXp((info)=>{
  const xpGain=Number(info&&(info.xp??info.amount))||0;
  if(info&&info.weaponId&&xpGain>0)grantWeaponXp(info.weaponId,xpGain);
});

// Event bindings
if($('openLoadoutsBtn'))$('openLoadoutsBtn').onclick=()=>openLoadoutsPanel('menu');
if($('pauseLoadouts'))$('pauseLoadouts').onclick=()=>openLoadoutsPanel('pause');
if(loadoutsBackBtn)loadoutsBackBtn.onclick=closeLoadoutsPanel;
if(loadoutsArmoryBtn)loadoutsArmoryBtn.onclick=()=>openArmory(loadoutsReturnTarget,'inventory');
if(loadoutNameInput){
  loadoutNameInput.addEventListener('input',()=>{
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    next.loadouts[selectedLoadoutIdx].name=LoadoutsSystem.sanitizeLoadoutName(loadoutNameInput.value,`Loadout ${selectedLoadoutIdx+1}`);
    commitLoadoutsState(next,{skipApply:true,silentToast:true});
    // Refresh left rail labels live without rebuilding input
    const tabs=loadoutsRailEl?loadoutsRailEl.querySelectorAll('.ld-tab-name'):[];
    if(tabs[selectedLoadoutIdx])tabs[selectedLoadoutIdx].textContent=next.loadouts[selectedLoadoutIdx].name;
  });
}
if(loadoutDuplicateBtn){
  loadoutDuplicateBtn.onclick=()=>{
    const nextIdx=(selectedLoadoutIdx+1)%LoadoutsSystem.LOADOUT_COUNT;
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    const src=next.loadouts[selectedLoadoutIdx];
    next.loadouts[nextIdx]={
      ...next.loadouts[nextIdx],
      name:LoadoutsSystem.sanitizeLoadoutName(`${src.name} Copy`,`Loadout ${nextIdx+1}`),
      primary:{weaponId:src.primary.weaponId,attachments:{...src.primary.attachments},skinItemId:src.primary.skinItemId},
      secondary:{weaponId:src.secondary.weaponId,attachments:{...src.secondary.attachments},skinItemId:src.secondary.skinItemId},
      melee:{knifeItemId:src.melee.knifeItemId}
    };
    selectedLoadoutIdx=nextIdx;
    next.activeIndex=nextIdx;
    commitLoadoutsState(next,{silentToast:true});
    showToast(`COPIED TO LOADOUT 0${nextIdx+1}`);
    renderLoadoutsOverview();
  };
}
if(loadoutResetBtn){
  loadoutResetBtn.onclick=()=>{
    const starters=LoadoutsSystem.createStarterLoadouts();
    const def=starters[selectedLoadoutIdx]||starters[0];
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    next.loadouts[selectedLoadoutIdx]=def;
    commitLoadoutsState(next,{silentToast:true});
    showToast(`RESET LOADOUT 0${selectedLoadoutIdx+1} TO PRESET`);
    renderLoadoutsOverview();
  };
}
if(gsBackToLoadoutsBtn)gsBackToLoadoutsBtn.onclick=renderLoadoutsOverview;
if(gsSkinsToggleBtn){
  gsSkinsToggleBtn.onclick=()=>{
    gunsmithSkinsMode=!gunsmithSkinsMode;
    renderGunsmith();
  };
}
if(gsClearAllBtn){
  gsClearAllBtn.onclick=()=>{
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    next.loadouts[selectedLoadoutIdx][gunsmithSlotCategory].attachments={};
    commitLoadoutsState(next,{silentToast:true});
    showToast('CLEARED ALL ATTACHMENTS');
    renderGunsmith();
  };
}
addEventListener('keydown',e=>{
  if(!loadoutsPanelEl||loadoutsPanelEl.style.display==='none')return;
  if(e.code==='Escape'){
    e.preventDefault();
    if(gunsmithMode)renderLoadoutsOverview();
    else closeLoadoutsPanel();
  }
});
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{loadLevel(b.dataset.level);inLevel=true;enter();});
if($('openSurfBrowserBtn'))$('openSurfBrowserBtn').onclick=()=>openCourseBrowser('surf',null,'menu');
if($('openTimeTrialBrowserBtn'))$('openTimeTrialBrowserBtn').onclick=()=>openCourseBrowser('timetrial',null,'menu');
if(pauseChangeMapBtn){
  pauseChangeMapBtn.onclick=()=>{
    const meta=level&&typeof CourseCatalog!=='undefined'?CourseCatalog.getCourseMeta(level.id):null;
    openCourseBrowser(meta?meta.category:'surf',meta?meta.id:null,'pause');
  };
}
if(cbBackBtn)cbBackBtn.onclick=closeCourseBrowser;
document.querySelectorAll('[data-cb-cat]').forEach(btn=>{
  btn.onclick=()=>{
    const target=btn.dataset.cbCat==='timetrial'?'timetrial':'surf';
    if(target!==cbCategory){
      cbCategory=target;
      cbSelectedId=null;
      resetBrowserFilters();
      renderCourseBrowser();
    }
  };
});
if(cbSearchInput){
  cbSearchInput.addEventListener('input',()=>{
    cbSearchQuery=cbSearchInput.value||'';
    renderCourseBrowser();
  });
}
if(cbSortSelect){
  cbSortSelect.addEventListener('change',()=>{
    cbSortBy=cbSortSelect.value||'recommended';
    renderCourseBrowser();
  });
}
if(cbPlayBtn)cbPlayBtn.onclick=()=>launchBrowserCourse(cbSelectedId);
if(cbModeFlyBtn)cbModeFlyBtn.onclick=()=>{if(typeof CoursePreview3D!=='undefined')CoursePreview3D.setMode('flythrough');};
if(cbModeOrbitBtn)cbModeOrbitBtn.onclick=()=>{if(typeof CoursePreview3D!=='undefined')CoursePreview3D.setMode('orbit');};
if(cbGhostCheckEl){
  cbGhostCheckEl.addEventListener('change',()=>{
    ghostMode=cbGhostCheckEl.checked?'pb':'off';
  });
}
addEventListener('keydown',e=>{
  if(!courseBrowserPanelEl||courseBrowserPanelEl.style.display==='none')return;
  const tag=document.activeElement?document.activeElement.tagName:'';
  if(e.code==='Escape'){
    e.preventDefault();
    closeCourseBrowser();
    return;
  }
  if(tag==='INPUT'||tag==='SELECT')return;
  if(e.code==='ArrowDown'||e.code==='ArrowUp'){
    if(!cbFilteredCache.length)return;
    e.preventDefault();
    const idx=Math.max(0,cbFilteredCache.findIndex(c=>c.id===cbSelectedId));
    const nextIdx=(idx+(e.code==='ArrowDown'?1:-1)+cbFilteredCache.length)%cbFilteredCache.length;
    selectBrowserCourse(cbFilteredCache[nextIdx].id);
    const activeRow=cbMapListEl&&cbMapListEl.querySelector(`.cb-row[data-course-id="${cbFilteredCache[nextIdx].id}"]`);
    if(activeRow&&activeRow.scrollIntoView)activeRow.scrollIntoView({block:'nearest'});
  }else if(e.code==='Enter'&&tag!=='BUTTON'){
    e.preventDefault();
    launchBrowserCourse(cbSelectedId);
  }
});
$('playTodayBtn').onclick=()=>{loadDailyCourse(DailyCourseGen.getTodayDateKey());inLevel=true;enter();};
$('openServersBtn').onclick=()=>openServersPanel('menu');
$('pauseServers').onclick=()=>openServersPanel('pause');
$('serversBackBtn').onclick=closeServersPanel;
if(serversAuthBtn)serversAuthBtn.onclick=handleAuthClick;
document.querySelectorAll('[data-srv-filter]').forEach(btn=>{
  btn.onclick=()=>{
    serversFilterMode=btn.dataset.srvFilter;
    document.querySelectorAll('[data-srv-filter]').forEach(b=>b.classList.toggle('active',b===btn));
    renderServersBoard();
  };
});
document.querySelectorAll('[data-host-map]').forEach(btn=>{
  btn.onclick=()=>{
    hostSelectedMap=btn.dataset.hostMap;
    document.querySelectorAll('[data-host-map]').forEach(b=>b.classList.toggle('active',b===btn));
  };
});
document.querySelectorAll('[data-host-mode]').forEach(btn=>{
  btn.onclick=()=>{
    hostSelectedMode=btn.dataset.hostMode;
    document.querySelectorAll('[data-host-mode]').forEach(b=>b.classList.toggle('active',b===btn));
  };
});
document.querySelectorAll('[data-host-vis]').forEach(btn=>{
  btn.onclick=()=>{
    hostSelectedVis=btn.dataset.hostVis;
    document.querySelectorAll('[data-host-vis]').forEach(b=>b.classList.toggle('active',b===btn));
  };
});
hostDeployBtn.onclick=handleHostDeploy;
joinPrivateCodeBtn.onclick=handleJoinPrivateCode;
privateCodeInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleJoinPrivateCode();}});
$('warmupSurfBtn').onclick=()=>launchSoloArenaWarmup('arena_surf');
$('warmupAimBtn').onclick=()=>launchSoloArenaWarmup('arena_aim');
$('pauseLeaveServer').onclick=()=>{NetcodeSystem.leaveSession();showMenu();};
$('sbRematchBtn').onclick=()=>{NetcodeSystem.requestRematch();enter();};
$('sbLeaveBtn').onclick=()=>{NetcodeSystem.leaveSession();showMenu();};

$('openArchiveBtn').onclick=()=>openDailyHub(DailyCourseGen.getTodayDateKey());
$('hubBackBtn').onclick=showMenu;
$('playSelectedDailyBtn').onclick=()=>{
  const found=archiveCourses.find(c=>c.dateKey===selectedDateKey);
  loadDailyCourse(selectedDateKey,found?found.seed:null);
  inLevel=true;
  enter();
};
customSeedInput.addEventListener('input',renderCustomSeedPreview);
customSeedInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    e.preventDefault();
    $('playSeedBtn').click();
  }
});
$('randomSeedBtn').onclick=()=>{
  customSeedInput.value=DailyCourseGen.randomSeedCode();
  renderCustomSeedPreview();
};
$('playSeedBtn').onclick=()=>{
  const norm=DailyCourseGen.normalizeCustomSeed(customSeedInput.value)||DailyCourseGen.randomSeedCode();
  customSeedInput.value=norm;
  renderCustomSeedPreview();
  loadCustomSeedCourse(norm);
  inLevel=true;
  enter();
};
menuAuthBtn.onclick=handleAuthClick;
hubAuthBtn.onclick=handleAuthClick;
menuArmoryBtn.onclick=()=>openArmory('menu','cases');
$('pauseArmory').onclick=()=>openArmory('pause','cases');
armoryBackBtn.onclick=closeArmory;
document.querySelectorAll('[data-arm-tab]').forEach(btn=>{
  btn.onclick=()=>setArmoryTab(btn.dataset.armTab);
});
openCaseBtn.onclick=()=>startCaseUnboxing(selectedCaseId);
if(buyCaseBtn)buyCaseBtn.onclick=()=>buyCaseOnly(selectedCaseId);
$('skipRouletteBtn').onclick=()=>{
  if(rouletteFinishCb){
    const fn=rouletteFinishCb;
    rouletteFinishCb=null;
    fn();
  }
};
$('revealEquipBtn').onclick=()=>{
  if(!lastRevealedItem)return;
  if(KnivesSystem.isWeaponItem(lastRevealedItem))equipWeaponById(lastRevealedItem.id);
  else if(KnivesSystem.isGloveItem(lastRevealedItem))equipGloveById(lastRevealedItem.id);
  else equipKnifeById(lastRevealedItem.id);
};
if(revealSellBtn){
  revealSellBtn.onclick=()=>{
    if(!lastRevealedItem)return;
    openSellConfirmModal([lastRevealedItem],'reveal');
  };
}
$('revealTrickBtn').onclick=()=>ArmoryPreview.playTrick('normal');
if($('revealMythicBtn'))$('revealMythicBtn').onclick=()=>ArmoryPreview.playTrick('mythic');
$('revealOpenAgainBtn').onclick=()=>startCaseUnboxing(selectedCaseId);
$('revealBackCasesBtn').onclick=()=>{showCasesView('select');renderArmoryCases();};
document.querySelectorAll('[data-inv-cat]').forEach(btn=>{
  btn.onclick=()=>{
    invCategory=btn.dataset.invCat==='weapons'?'weapons':btn.dataset.invCat==='gloves'?'gloves':'knives';
    invFilterType='all';
    renderArmoryInventory();
  };
});
document.querySelectorAll('[data-preview-mode]').forEach(btn=>{
  btn.onclick=()=>{
    if(invCategory==='gloves')return;
    invPreviewMode=btn.dataset.previewMode==='solo'?'solo':'combo';
    renderArmoryInventory();
  };
});
$('invEquipBtn').onclick=()=>{
  if(invCategory==='weapons')equipWeaponById(selectedInvWeaponId);
  else if(invCategory==='gloves')equipGloveById(selectedInvGloveId);
  else equipKnifeById(selectedInvKnifeId);
};
$('invTrickBtn').onclick=()=>ArmoryPreview.playTrick('normal');
if($('invMythicBtn'))$('invMythicBtn').onclick=()=>ArmoryPreview.playTrick('mythic');
if(invSellBtn){
  invSellBtn.onclick=()=>{
    const item=invCategory==='weapons'
      ?(window.activeInventory.weapons||[]).find(w=>w.id===selectedInvWeaponId)
      :invCategory==='gloves'
        ?window.activeInventory.gloves.find(g=>g.id===selectedInvGloveId)
        :window.activeInventory.knives.find(k=>k.id===selectedInvKnifeId);
    if(item)openSellConfirmModal([item],'single');
  };
}
if(invBulkToggleBtn)invBulkToggleBtn.onclick=()=>toggleBulkSellMode();
if($('bulkSelectDupsBtn'))$('bulkSelectDupsBtn').onclick=()=>applyBulkPreset('duplicates');
if($('bulkSelectMilspecBtn'))$('bulkSelectMilspecBtn').onclick=()=>applyBulkPreset('milspec');
if($('bulkSelectRestrictedBtn'))$('bulkSelectRestrictedBtn').onclick=()=>applyBulkPreset('restricted');
if($('bulkClearBtn'))$('bulkClearBtn').onclick=()=>applyBulkPreset('clear');
if(bulkSellConfirmBtn){
  bulkSellConfirmBtn.onclick=()=>{
    const byId=new Map(getAllInventoryItems().map(it=>[it.id,it]));
    const items=[];
    for(const id of bulkSelectedIds){
      const it=byId.get(id);
      if(it)items.push(it);
    }
    openSellConfirmModal(items,'bulk');
  };
}
if(sellConfirmCancelBtn)sellConfirmCancelBtn.onclick=closeSellConfirmModal;
if(sellConfirmYesBtn)sellConfirmYesBtn.onclick=executeConfirmedSale;
if(sellConfirmModal){
  sellConfirmModal.addEventListener('click',e=>{
    if(e.target===sellConfirmModal)closeSellConfirmModal();
  });
}
addEventListener('keydown',e=>{
  if(e.code==='Escape'&&pendingSale&&sellConfirmModal&&sellConfirmModal.style.display!=='none'){
    e.preventDefault();
    e.stopPropagation();
    closeSellConfirmModal();
  }
},true);

$('menuSettingsBtn').onclick=()=>openSettings('menu');
$('pauseSettings').onclick=()=>openSettings('pause');
settingsBackBtn.onclick=closeSettings;
$('settingsResetBtn').onclick=()=>{
  commitSettings(VelocitySettings.resetGameplayDefaults(window.activeSettings));
  showToast('GAMEPLAY SETTINGS RESET');
};
document.querySelectorAll('[data-set-tab]').forEach(btn=>{
  btn.onclick=()=>setSettingsTab(btn.dataset.setTab);
});
setDisplayNameInput.addEventListener('input',()=>{
  const cleaned=VelocitySettings.sanitizeDisplayName(setDisplayNameInput.value);
  setDisplayNameCount.textContent=`${cleaned.length} / 32`;
  window.activeSettings=VelocitySettings.saveLocal({...window.activeSettings,displayName:cleaned});
  syncVelocityTestMode();
  const user=window.DailyBackend?window.DailyBackend.getState().user:null;
  renderAuthHeaderName(user);
  updateLeaderboardAuthNote();
  const effName=getEffectiveUserName(user);
  setDisplayNameNote.textContent=user
    ?`Leaderboard name: "${effName}" · Synced to your Google account.`
    :`Active local name: "${effName}" · Sign in with Google to sync across devices.`;
  scheduleCloudSettingsSave(true);
});
setSensRange.addEventListener('input',()=>{
  commitSettings({...window.activeSettings,sensitivity:Number(setSensRange.value)});
});
setInvertOff.onclick=()=>commitSettings({...window.activeSettings,invertY:false});
setInvertOn.onclick=()=>commitSettings({...window.activeSettings,invertY:true});
setFovRange.addEventListener('input',()=>{
  commitSettings({...window.activeSettings,baseFov:Number(setFovRange.value)});
});
const updateVmField=(patch)=>{
  commitSettings({...window.activeSettings,viewmodel:{...(window.activeSettings.viewmodel||VelocitySettings.DEFAULT_VIEWMODEL),...patch}});
};
if(setVmXRange)setVmXRange.addEventListener('input',()=>updateVmField({offsetX:Number(setVmXRange.value)}));
if(setVmYRange)setVmYRange.addEventListener('input',()=>updateVmField({offsetY:Number(setVmYRange.value)}));
if(setVmZRange)setVmZRange.addEventListener('input',()=>updateVmField({offsetZ:Number(setVmZRange.value)}));
if(setVmFovRange)setVmFovRange.addEventListener('input',()=>updateVmField({fov:Number(setVmFovRange.value)}));
if(setVmResetBtn)setVmResetBtn.onclick=()=>{
  commitSettings({...window.activeSettings,viewmodel:{...VelocitySettings.DEFAULT_VIEWMODEL}});
  showToast('VIEWMODEL CENTERED');
};
setChSizeRange.addEventListener('input',()=>{
  commitSettings({...window.activeSettings,crosshair:{...window.activeSettings.crosshair,size:Number(setChSizeRange.value)}});
});
document.querySelectorAll('[data-ch-style]').forEach(btn=>{
  btn.onclick=()=>commitSettings({...window.activeSettings,crosshair:{...window.activeSettings.crosshair,style:btn.dataset.chStyle}});
});
document.querySelectorAll('[data-ch-color]').forEach(btn=>{
  btn.onclick=()=>commitSettings({...window.activeSettings,crosshair:{...window.activeSettings.crosshair,color:btn.dataset.chColor}});
});
$('resume').onclick=enter;
$('restart').onclick=()=>{resetPlayer();enter();};
$('pauseArchive').onclick=()=>openDailyHub(level.meta&&level.meta.dateKey?level.meta.dateKey:DailyCourseGen.getTodayDateKey());
$('tomenu').onclick=showMenu;
applySettingsToRuntime();
updateArmoryBadges();

let backendBound=false;
async function bindDailyBackend(){
  if(!window.DailyBackend)return;
  if(!backendBound){
    backendBound=true;
    window.DailyBackend.onAuthChange(renderAuthUI);
  }
  if(dailyHubEl.style.display!=='none'){
    try{
      const synced=await window.DailyBackend.fetchDailyArchive(14);
      if(synced&&synced.courses.length>0){
        archiveCourses=synced.courses;
        const stillThere=archiveCourses.find(c=>c.dateKey===selectedDateKey);
        selectDailyInHub(stillThere?selectedDateKey:archiveCourses[0].dateKey);
      }
    }catch(_){}
  }
}
window.addEventListener('daily-backend-ready',bindDailyBackend);
bindDailyBackend();

const params=new URLSearchParams(location.search);
if(params.get('autostart')==='1'){
  const seedParam=params.get('seed');
  const dailyParam=params.get('daily');
  const lvlParam=params.get('level');
  if(seedParam){
    loadCustomSeedCourse(seedParam);inLevel=true;enter();
  }else if(dailyParam){
    loadDailyCourse(dailyParam==='today'?DailyCourseGen.getTodayDateKey():dailyParam);inLevel=true;enter();
  }else if(lvlParam&&LEVELS[lvlParam]){
    loadLevel(lvlParam);inLevel=true;enter();
  }else{
    loadDailyCourse(DailyCourseGen.getTodayDateKey());inLevel=true;enter();
  }
}else{
  showMenu();
}
if(isSoftwareGl)frame(performance.now());
else frameId=requestAnimationFrame(frame);
