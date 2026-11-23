// ---------- render ----------
const _rp=V3(),_right=V3();
const surfHintEl=$('surfHint');
const crosshairEl=$('crosshair');
window.activeSettings=VelocitySettings.loadLocal();
window.activeInventory=KnivesSystem.loadLocal();
window.isRebindingInput=false;
ghostVisual=GhostSystem.createGhostMesh(THREE,scene);
ViewmodelSystem.init(renderer);
ViewmodelSystem.applySettings(window.activeSettings);
ViewmodelSystem.equipGlove(KnivesSystem.getEquippedGlove(window.activeInventory));
ViewmodelSystem.equipKnife(KnivesSystem.getEquippedKnife(window.activeInventory),false);

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
  camera.position.set(_rp.x,_rp.y+p.eye,_rp.z);
  camera.rotation.set(p.pitch,p.yaw,p.roll);
  const sp=Math.hypot(p.vel.x,p.vel.z);
  const baseFov=(window.activeSettings&&window.activeSettings.baseFov)||C.fovBase;
  camera.fov+=(baseFov+Math.min(sp*C.fovPerSpeed,C.fovMax)-camera.fov)*Math.min(1,dt*5);camera.updateProjectionMatrix();
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
  if(inLevel)ViewmodelSystem.update(dt,p);
  document.body.dataset.runStarted=p.runStarted?'1':'0';
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.style.opacity=0;}
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
  if(inLevel)ViewmodelSystem.render(renderer);
  if(isSoftwareGl)afterDraw(frame);
  else frameId=requestAnimationFrame(frame);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- levels + seeded daily courses ----------
const LEVELS={
  sandbox:{name:'SANDBOX',build:buildSandbox},
  course1:{name:'COURSE 01',build:buildCourse1},
  surf1:{name:'SURF 01',build:buildSurfMap1}
};
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
}

function activateLoadedLevel(built,displayName){
  level=built;
  course=level.course;
  SPAWN=level.spawn;
  SPAWN_YAW=level.yaw;
  const id=level.id;
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
  $('pauseCourseLabel').textContent=displayName+(level.meta?` · ${level.meta.lengthLabel} (${level.meta.segmentCount} SEGMENTS)`:'');
  document.body.dataset.level=id;
  resetPlayer();
  ViewmodelSystem.triggerDraw();
  toast.style.opacity=0;
}

function loadLevel(id){
  clearWorldGroup();
  const built=LEVELS[id].build();
  activateLoadedLevel(built,LEVELS[id].name);
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

// ---------- menu, daily hub, settings, leaderboard & auth ----------
const overlayCard=$('overlayCard'),menuEl=$('menu'),dailyHubEl=$('dailyHub'),settingsPanelEl=$('settingsPanel'),armoryPanelEl=$('armoryPanel'),pauseEl=$('pause');
const archiveListEl=$('archiveList'),lbListEl=$('lbList'),lbStatusEl=$('lbStatus'),lbAuthNoteEl=$('lbAuthNote');
const customSeedInput=$('customSeedInput'),customSeedPreview=$('customSeedPreview');
const menuAuthName=$('menuAuthName'),menuAuthBtn=$('menuAuthBtn'),hubAuthBtn=$('hubAuthBtn'),menuArmoryBtn=$('menuArmoryBtn');
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

// Armory DOM refs
const armorySyncNote=$('armorySyncNote'),armoryBackBtn=$('armoryBackBtn');
const armTabCases=$('armTabCases'),armTabInventory=$('armTabInventory');
const armoryCasesSelect=$('armoryCasesSelect'),armoryCaseGrid=$('armoryCaseGrid');
const selectedCaseTitle=$('selectedCaseTitle'),selectedCasePool=$('selectedCasePool');
const openCaseBtn=$('openCaseBtn'),openCaseHint=$('openCaseHint'),armoryOpenedStat=$('armoryOpenedStat');
const armoryRouletteWrap=$('armoryRouletteWrap'),rouletteCaseLabel=$('rouletteCaseLabel');
const rouletteViewport=$('rouletteViewport'),rouletteTrack=$('rouletteTrack'),rouletteStatus=$('rouletteStatus');
const armoryRevealWrap=$('armoryRevealWrap'),armoryRevealStage=$('armoryRevealStage'),revealStageBar=$('revealStageBar');
const armoryInspectStage=$('armoryInspectStage'),invStageBar=$('invStageBar'),armoryPreviewCanvas=$('armoryPreviewCanvas');
const armoryInvGrid=$('armoryInvGrid');

let inLevel=false;
let archiveCourses=[];
let selectedDateKey=DailyCourseGen.getTodayDateKey();
let activeLbRequest=0;
let settingsReturnTarget='menu';
let activeSettingsTab='profile';
let rebindingActionId=null;
let cloudSaveTimer=null;
let lastSyncedUid=null;
let lastInvSyncedUid=null;

// Armory state
let armoryReturnTarget='menu';
let activeArmoryTab='cases';
let selectedCaseId='velocity';
let invCategory='knives';
let invFilterType='all';
let invPreviewMode='combo';
let selectedInvKnifeId=window.activeInventory.equippedKnifeId;
let selectedInvGloveId=window.activeInventory.equippedGloveId;
let lastRevealedItem=null;
let rouletteRafId=0;
let rouletteFinishCb=null;
const thumbCache=new Map();

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
    ['MOUSE','Look'],
    [f(kb.jump),'Jump / wall jump'],
    [f(kb.slide),'Slide'],
    [f(kb.grapple),'Grapple / release'],
    [f(kb.burst),'Speed burst'],
    [f(kb.restart),'Restart run'],
    [f(kb.checkpoint),'Last checkpoint'],
    [f(kb.inspect),'Inspect knife'],
    [f(kb.ghost),'Ghost mode']
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
  ArmoryPreview.stop();
  settingsReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  armoryPanelEl.style.display='none';
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

// ---------- Armory, CS Cases & 3D Knife/Glove Showcase ----------
function getThumbForItem(item){
  const isGlove=KnivesSystem.isGloveItem(item);
  const key=isGlove
    ?`glove_${item.gloveType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`
    :`knife_${item.knifeType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`;
  if(thumbCache.has(key))return thumbCache.get(key);
  const url=isGlove?renderGloveThumbDataUrl(item):renderKnifeThumbDataUrl(item);
  if(thumbCache.size>200)thumbCache.clear();
  thumbCache.set(key,url);
  return url;
}

function updateArmoryBadges(){
  const casesTotal=KnivesSystem.totalCaseCount(window.activeInventory);
  const knifeTotal=window.activeInventory.knives.length;
  const gloveTotal=window.activeInventory.gloves.length;
  const invTotal=knifeTotal+gloveTotal;
  if(menuArmoryBtn)menuArmoryBtn.textContent=casesTotal>0?`ARMORY (${casesTotal})`:'ARMORY';
  if(armTabCases)armTabCases.textContent=`CASES (${casesTotal})`;
  if(armTabInventory)armTabInventory.textContent=`INVENTORY (${invTotal})`;
  const catK=$('invCatKnives'),catG=$('invCatGloves');
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

function persistInventorySummary(syncCloud=true){
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory);
  updateArmoryBadges();
  if(syncCloud&&window.DailyBackend){
    const st=window.DailyBackend.getState();
    if(st.user&&st.user.emailVerified){
      updateArmorySyncLabel('SAVING...');
      window.DailyBackend.saveUserInventorySummary(window.activeInventory)
        .then(r=>updateArmorySyncLabel(r&&r.saved?'CLOUD SYNCED':'LOCAL ONLY'))
        .catch(()=>updateArmorySyncLabel('LOCAL FALLBACK'));
    }
  }
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
  const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
  const wear=KnivesSystem.getWearGrade(item.floatValue);
  const sk=isGlove
    ?(KnivesSystem.GLOVE_SKINS[item.skinId]||KnivesSystem.GLOVE_SKINS.tactical_slate)
    :(KnivesSystem.SKINS[item.skinId]||KnivesSystem.SKINS.vanilla);
  const bar=$(prefix+'StageBar');
  if(bar)bar.style.setProperty('--rar-col',rar.color);
  const rarEl=$(prefix+'Rarity');
  if(rarEl){
    rarEl.textContent=isGlove?`${rar.label} · GLOVES`:rar.label;
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

function mountArmoryCanvas(hostEl,knifeItem,gloveItem,mode){
  if(!hostEl||!armoryPreviewCanvas)return;
  if(armoryPreviewCanvas.parentElement!==hostEl){
    const caption=hostEl.querySelector('.arm-stage-caption');
    if(caption)hostEl.insertBefore(armoryPreviewCanvas,caption);
    else hostEl.appendChild(armoryPreviewCanvas);
  }
  const k=knifeItem||KnivesSystem.getEquippedKnife(window.activeInventory);
  const g=gloveItem||KnivesSystem.getEquippedGlove(window.activeInventory);
  ArmoryPreview.showCombo(armoryPreviewCanvas,k,g,{mode:mode||'combo'});
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
  armoryCaseGrid.textContent='';
  for(const cid of KnivesSystem.CASE_IDS){
    const c=KnivesSystem.CASES[cid];
    const count=window.activeInventory.caseCounts[cid]||0;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='case-card'+(cid===selectedCaseId?' selected':'');
    btn.style.setProperty('--case-accent',c.accent);
    btn.dataset.caseId=cid;

    const art=document.createElement('div');
    art.className='case-art';
    const crate=document.createElement('div');
    crate.className='case-crate';
    const lock=document.createElement('div');
    lock.className='case-crate-lock';
    crate.appendChild(lock);
    art.appendChild(crate);

    const top=document.createElement('div');
    top.className='case-top';
    const nm=document.createElement('span');
    nm.className='case-name';
    nm.textContent=c.name;
    const cnt=document.createElement('span');
    cnt.className='case-count'+(count===0?' zero':'');
    cnt.textContent=`×${count}`;
    top.appendChild(nm);
    top.appendChild(cnt);

    const desc=document.createElement('div');
    desc.className='case-desc';
    desc.textContent=c.description;

    btn.appendChild(art);
    btn.appendChild(top);
    btn.appendChild(desc);
    btn.onclick=()=>{selectedCaseId=cid;renderArmoryCases();};
    armoryCaseGrid.appendChild(btn);
  }

  const sel=KnivesSystem.CASES[selectedCaseId]||KnivesSystem.CASES.velocity;
  const selCount=window.activeInventory.caseCounts[sel.id]||0;
  selectedCaseTitle.textContent=`${sel.name.toUpperCase()} — KNIFE & GLOVE POOL`;
  selectedCasePool.textContent='';
  const previewTiers=['gold','covert','classified','restricted','milspec'];
  for(const rid of previewTiers){
    const entries=sel.pools[rid]||[];
    const rar=KnivesSystem.RARITIES[rid];
    const picked=rid==='gold'
      ?[...entries.filter(e=>e.itemKind!=='glove').slice(0,2),...entries.filter(e=>e.itemKind==='glove').slice(0,2)]
      :entries.slice(0,2);
    for(const e of picked){
      const tag=document.createElement('span');
      tag.className='case-pool-item';
      tag.style.setProperty('--rar-col',rar.color);
      if(e.itemKind==='glove'){
        const gName=KnivesSystem.GLOVE_TYPES[e.gloveType].name;
        const gsName=KnivesSystem.GLOVE_SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`★ ${gName} | ${gsName}${suffix}`;
      }else{
        const kShort=KnivesSystem.KNIFE_TYPES[e.knifeType].shortName;
        const sName=KnivesSystem.SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceGem?' (Gem)':e.forceFireIce?' (Fire & Ice)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`${kShort} | ${sName}${suffix}`;
      }
      selectedCasePool.appendChild(tag);
    }
  }
  openCaseBtn.disabled=selCount<=0;
  openCaseBtn.textContent=selCount>0?`OPEN ${sel.name.replace(' Case','').toUpperCase()} (${selCount})`:'NO CASES OWNED';
  openCaseHint.textContent=selCount>0?'Consumes 1 container · Rare Gold drops include Knives & Gloves':'Finish any timed course or Daily run to earn more cases';
  updateArmoryBadges();
}

function showCasesView(mode){
  armoryCasesSelect.style.display=mode==='select'?'':'none';
  armoryRouletteWrap.style.display=mode==='roulette'?'':'none';
  armoryRevealWrap.style.display=mode==='reveal'?'':'none';
  if(mode!=='reveal')ArmoryPreview.stop();
}

function showRevealStage(item){
  stopRouletteAnimation();
  lastRevealedItem=item;
  const isGlove=KnivesSystem.isGloveItem(item);
  if(isGlove)selectedInvGloveId=item.id;
  else selectedInvKnifeId=item.id;
  showCasesView('reveal');
  fillItemSpecs('reveal',item);
  const isEq=isGlove
    ?(window.activeInventory.equippedGloveId===item.id)
    :(window.activeInventory.equippedKnifeId===item.id);
  $('revealEquipBtn').textContent=isEq?'EQUIPPED':(isGlove?'EQUIP GLOVES':'EQUIP KNIFE');
  $('revealEquipBtn').disabled=isEq;
  const remCount=window.activeInventory.caseCounts[selectedCaseId]||0;
  $('revealOpenAgainBtn').disabled=remCount<=0;
  $('revealOpenAgainBtn').textContent=remCount>0?`OPEN ANOTHER (${remCount})`:'NO MORE OF THIS CASE';
  const previewKnife=isGlove?KnivesSystem.getEquippedKnife(window.activeInventory):item;
  const previewGlove=isGlove?item:KnivesSystem.getEquippedGlove(window.activeInventory);
  mountArmoryCanvas(armoryRevealStage,previewKnife,previewGlove,'combo');
  CaseAudio.reveal(item.rarity);
}

function startCaseUnboxing(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const curCount=window.activeInventory.caseCounts[cid]||0;
  if(curCount<=0){
    showToast('NO CASES AVAILABLE — FINISH A COURSE TO EARN MORE');
    return;
  }
  selectedCaseId=cid;
  const roll=KnivesSystem.rollCaseDrop(cid);
  const isGloveWin=KnivesSystem.isGloveItem(roll.winner);

  // Commit immediately so the drop is safe even if user skips or closes Armory
  window.activeInventory.caseCounts[cid]=curCount-1;
  window.activeInventory.totalOpened=(window.activeInventory.totalOpened||0)+1;
  if(isGloveWin){
    window.activeInventory.gloves.unshift(roll.winner);
  }else{
    window.activeInventory.knives.unshift(roll.winner);
  }
  persistInventorySummary(true);
  if(window.DailyBackend){
    if(isGloveWin){
      window.DailyBackend.saveCloudGlove(roll.winner,window.activeInventory).catch(()=>{});
    }else{
      window.DailyBackend.saveCloudKnife(roll.winner,window.activeInventory).catch(()=>{});
    }
  }

  showCasesView('roulette');
  const cDef=KnivesSystem.CASES[cid];
  rouletteCaseLabel.textContent=`UNLOCKING ${cDef.name.toUpperCase()}`;
  rouletteStatus.textContent='ROLLING PATTERN SEED & WEAR FLOAT...';

  // Populate 45-card roulette strip
  rouletteTrack.textContent='';
  rouletteTrack.style.transform='translate3d(0px,0,0)';
  for(const cardItem of roll.strip){
    const isGloveCard=KnivesSystem.isGloveItem(cardItem);
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
    kn.textContent=isGloveCard
      ?KnivesSystem.GLOVE_TYPES[cardItem.gloveType].name
      :KnivesSystem.KNIFE_TYPES[cardItem.knifeType].name;
    const sn=document.createElement('div');
    sn.className='roulette-sname';
    const skinName=isGloveCard
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
    // Smooth CS-style quartic deceleration
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

function equipKnifeById(knifeId){
  const found=window.activeInventory.knives.find(k=>k.id===knifeId);
  if(!found)return;
  window.activeInventory.equippedKnifeId=found.id;
  persistInventorySummary(true);
  ViewmodelSystem.equipKnife(found,true);
  showToast(`EQUIPPED ${KnivesSystem.formatKnifeFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id){
    $('revealEquipBtn').textContent='EQUIPPED';
    $('revealEquipBtn').disabled=true;
  }
}

function equipGloveById(gloveId){
  const found=window.activeInventory.gloves.find(g=>g.id===gloveId);
  if(!found)return;
  window.activeInventory.equippedGloveId=found.id;
  persistInventorySummary(true);
  ViewmodelSystem.equipGlove(found);
  showToast(`EQUIPPED ${KnivesSystem.formatGloveFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id){
    $('revealEquipBtn').textContent='EQUIPPED';
    $('revealEquipBtn').disabled=true;
  }
}

function discardKnifeById(knifeId){
  if(knifeId==='starter_default_vanilla'||knifeId===window.activeInventory.equippedKnifeId)return;
  const idx=window.activeInventory.knives.findIndex(k=>k.id===knifeId);
  if(idx<0)return;
  const removed=window.activeInventory.knives.splice(idx,1)[0];
  persistInventorySummary(true);
  if(window.DailyBackend){
    window.DailyBackend.deleteCloudKnife(removed.id).catch(()=>{});
  }
  selectedInvKnifeId=window.activeInventory.equippedKnifeId;
  renderArmoryInventory();
  showToast(`DISCARDED ${KnivesSystem.formatKnifeFullName(removed).toUpperCase()}`);
}

function discardGloveById(gloveId){
  if(gloveId==='starter_standard_tactical'||gloveId===window.activeInventory.equippedGloveId)return;
  const idx=window.activeInventory.gloves.findIndex(g=>g.id===gloveId);
  if(idx<0)return;
  const removed=window.activeInventory.gloves.splice(idx,1)[0];
  persistInventorySummary(true);
  if(window.DailyBackend){
    window.DailyBackend.deleteCloudGlove(removed.id).catch(()=>{});
  }
  selectedInvGloveId=window.activeInventory.equippedGloveId;
  renderArmoryInventory();
  showToast(`DISCARDED ${KnivesSystem.formatGloveFullName(removed).toUpperCase()}`);
}

function renderInventoryFilterButtons(){
  const bar=$('armoryFilterBar');
  if(!bar)return;
  bar.textContent='';
  const filters=invCategory==='gloves'
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
  const isGloveCat=invCategory==='gloves';
  document.querySelectorAll('[data-inv-cat]').forEach(btn=>{
    const on=btn.dataset.invCat===invCategory;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  renderInventoryFilterButtons();

  const sourceList=isGloveCat?window.activeInventory.gloves:window.activeInventory.knives;
  const list=sourceList.filter(it=>invFilterType==='all'||(isGloveCat?it.gloveType===invFilterType:it.knifeType===invFilterType));
  armoryInvGrid.textContent='';

  if(list.length===0){
    const empty=document.createElement('div');
    empty.className='inv-empty';
    empty.textContent=isGloveCat
      ?'No gloves in this archetype yet. Rare Gold drops in any CS case can unbox Sport, Specialist, Hand Wraps, or Standard gloves.'
      :'No knives in this category yet. Open cases in the Cases tab to expand your collection.';
    armoryInvGrid.appendChild(empty);
  }

  let selected;
  if(isGloveCat){
    selected=list.find(g=>g.id===selectedInvGloveId)||window.activeInventory.gloves.find(g=>g.id===selectedInvGloveId)||KnivesSystem.getEquippedGlove(window.activeInventory);
    if(list.length>0&&!list.some(g=>g.id===selected.id))selected=list[0];
    selectedInvGloveId=selected.id;
  }else{
    selected=list.find(k=>k.id===selectedInvKnifeId)||window.activeInventory.knives.find(k=>k.id===selectedInvKnifeId)||KnivesSystem.getEquippedKnife(window.activeInventory);
    if(list.length>0&&!list.some(k=>k.id===selected.id))selected=list[0];
    selectedInvKnifeId=selected.id;
  }

  const equippedId=isGloveCat?window.activeInventory.equippedGloveId:window.activeInventory.equippedKnifeId;
  const selectedId=selected.id;

  for(const item of list){
    const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const isEq=item.id===equippedId;
    const card=document.createElement('button');
    card.type='button';
    card.className='inv-card'+(item.id===selectedId?' selected':'');
    card.style.setProperty('--rar-col',rar.color);
    card.dataset.itemId=item.id;
    if(isGloveCat)card.dataset.gloveId=item.id;
    else card.dataset.knifeId=item.id;

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
    meta.textContent=KnivesSystem.formatKnifeMetaLine(item);

    card.appendChild(img);
    card.appendChild(nm);
    card.appendChild(meta);
    card.onclick=()=>{
      if(isGloveCat)selectedInvGloveId=item.id;
      else selectedInvKnifeId=item.id;
      renderArmoryInventory();
    };
    armoryInvGrid.appendChild(card);
  }

  fillItemSpecs('inv',selected);
  const isSelectedEquipped=selected.id===equippedId;
  const isStarter=isGloveCat?(selected.id==='starter_standard_tactical'):(selected.id==='starter_default_vanilla');
  $('invEquipBtn').textContent=isSelectedEquipped?'EQUIPPED':(isGloveCat?'EQUIP GLOVES':'EQUIP KNIFE');
  $('invEquipBtn').disabled=isSelectedEquipped;
  $('invDiscardBtn').disabled=isStarter||isSelectedEquipped;

  const effectiveMode=isGloveCat?'combo':invPreviewMode;
  const modeComboBtn=$('invModeCombo'),modeSoloBtn=$('invModeSolo'),stageCap=$('invStageCaption');
  if(modeComboBtn)modeComboBtn.classList.toggle('active',effectiveMode==='combo');
  if(modeSoloBtn){
    modeSoloBtn.classList.toggle('active',effectiveMode==='solo');
    modeSoloBtn.disabled=isGloveCat;
  }
  if(stageCap){
    stageCap.textContent=effectiveMode==='combo'?'LIVE COMBO 3D PREVIEW':'SOLO BLADE TURNTABLE';
  }

  const previewKnife=isGloveCat?KnivesSystem.getEquippedKnife(window.activeInventory):selected;
  const previewGlove=isGloveCat?selected:KnivesSystem.getEquippedGlove(window.activeInventory);
  mountArmoryCanvas(armoryInspectStage,previewKnife,previewGlove,effectiveMode);
  updateArmoryBadges();
}

function setArmoryTab(tab){
  stopRouletteAnimation();
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
  armoryReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  pauseEl.style.display='none';
  armoryPanelEl.style.display='';
  armoryBackBtn.textContent=armoryReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='armory';
  document.exitPointerLock?.();
  updateArmorySyncLabel();
  setArmoryTab(initialTab||activeArmoryTab);
}

function closeArmory(){
  stopRouletteAnimation();
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
  if(!user||!user.emailVerified||!window.DailyBackend)return;
  if(lastInvSyncedUid===user.uid)return;
  lastInvSyncedUid=user.uid;
  try{
    const res=await window.DailyBackend.loadUserInventory();
    if(res&&res.exists&&res.inventory){
      window.activeInventory=KnivesSystem.saveLocal(res.inventory);
      ViewmodelSystem.equipGlove(KnivesSystem.getEquippedGlove(window.activeInventory));
      ViewmodelSystem.equipKnife(KnivesSystem.getEquippedKnife(window.activeInventory),false);
      updateArmoryBadges();
      updateArmorySyncLabel('CLOUD SYNCED');
      if(armoryPanelEl.style.display!=='none'){
        if(activeArmoryTab==='cases')renderArmoryCases();
        else renderArmoryInventory();
      }
    }else if(res&&res.cloudSynced){
      await window.DailyBackend.saveUserInventorySummary(window.activeInventory);
      for(const k of window.activeInventory.knives){
        if(k.id!=='starter_default_vanilla'){
          await window.DailyBackend.saveCloudKnife(k,window.activeInventory).catch(()=>{});
        }
      }
      for(const g of window.activeInventory.gloves){
        if(g.id!=='starter_standard_tactical'){
          await window.DailyBackend.saveCloudGlove(g,window.activeInventory).catch(()=>{});
        }
      }
      updateArmorySyncLabel('CLOUD SYNCED');
    }
  }catch(_){
    updateArmorySyncLabel('LOCAL FALLBACK');
  }
}

function renderAuthUI(user){
  renderAuthHeaderName(user);
  if(user){
    menuAuthBtn.textContent='SIGN OUT';
    hubAuthBtn.textContent='SIGN OUT';
    hydrateCloudSettingsForUser(user);
    hydrateCloudInventoryForUser(user);
  }else{
    lastSyncedUid=null;
    lastInvSyncedUid=null;
    menuAuthBtn.textContent='SIGN IN';
    hubAuthBtn.textContent='SIGN IN';
  }
  updateSettingsSyncLabel();
  updateArmorySyncLabel();
  updateLeaderboardAuthNote();
  if(settingsPanelEl.style.display!=='none')renderSettingsPanel();
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
  ArmoryPreview.stop();
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  pauseEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
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

function showMenu(){
  cancelRebind();
  stopRouletteAnimation();
  ArmoryPreview.stop();
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  menuEl.style.display='';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  pauseEl.style.display='none';
  document.body.dataset.state='title';
  refreshTodayButton();
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
  ArmoryPreview.stop();
  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  pauseEl.style.display='';
  document.body.dataset.state='paused';
}

function enter(){
  cancelRebind();
  stopRouletteAnimation();
  ArmoryPreview.stop();
  overlay.style.display='none';
  overlayCard.classList.remove('wide');
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  document.body.dataset.state='playing';
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  try{
    const res=renderer.domElement.requestPointerLock?.();
    if(res&&typeof res.catch==='function')res.catch(()=>{});
  }catch(_){}
}

function onUnlock(){if(inLevel&&overlay.style.display==='none')showPause();}

// Award CS cases on course completion + auto-submit daily runs to Firestore when signed in
window.onCourseFinished=async function(info){
  if(!info)return;
  const reward=KnivesSystem.grantRunRewards(window.activeInventory,{
    dateKey:info.dateKey||'',
    isNewBest:!!info.isNewBest,
    todayKey:DailyCourseGen.getTodayDateKey()
  });
  window.activeInventory=reward.inventory;
  persistInventorySummary(true);
  const earnedCount=reward.awarded.length;
  let dropMsg='';
  if(earnedCount>0){
    dropMsg=`+${earnedCount} CASE${earnedCount>1?'S':''} EARNED`;
  }

  if(!info.dateKey||!window.DailyBackend){
    if(dropMsg)showToast(dropMsg);
    return;
  }
  try{
    const res=await window.DailyBackend.submitDailyRun(info.dateKey,info.runTime,info.splits);
    if(res.submitted&&res.improved){
      showToast((res.rank?`LEADERBOARD #${res.rank}`:'LEADERBOARD UPDATED')+(dropMsg?' · '+dropMsg:''));
    }else if(res.reason==='signed-out'&&info.isNewBest){
      showToast(`NEW PB ${fmt(info.runTime)}`+(dropMsg?' · '+dropMsg:''));
    }else if(dropMsg){
      showToast(dropMsg);
    }
  }catch(_){
    if(dropMsg)showToast(dropMsg);
  }
};

// Event bindings
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{loadLevel(b.dataset.level);inLevel=true;enter();});
$('playTodayBtn').onclick=()=>{loadDailyCourse(DailyCourseGen.getTodayDateKey());inLevel=true;enter();};
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
$('skipRouletteBtn').onclick=()=>{
  if(rouletteFinishCb){
    const fn=rouletteFinishCb;
    rouletteFinishCb=null;
    fn();
  }
};
$('revealEquipBtn').onclick=()=>{
  if(!lastRevealedItem)return;
  if(KnivesSystem.isGloveItem(lastRevealedItem))equipGloveById(lastRevealedItem.id);
  else equipKnifeById(lastRevealedItem.id);
};
$('revealTrickBtn').onclick=()=>ArmoryPreview.playTrick('normal');
if($('revealMythicBtn'))$('revealMythicBtn').onclick=()=>ArmoryPreview.playTrick('mythic');
$('revealOpenAgainBtn').onclick=()=>startCaseUnboxing(selectedCaseId);
$('revealBackCasesBtn').onclick=()=>{showCasesView('select');renderArmoryCases();};
document.querySelectorAll('[data-inv-cat]').forEach(btn=>{
  btn.onclick=()=>{
    invCategory=btn.dataset.invCat==='gloves'?'gloves':'knives';
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
  if(invCategory==='gloves')equipGloveById(selectedInvGloveId);
  else equipKnifeById(selectedInvKnifeId);
};
$('invTrickBtn').onclick=()=>ArmoryPreview.playTrick('normal');
if($('invMythicBtn'))$('invMythicBtn').onclick=()=>ArmoryPreview.playTrick('mythic');
$('invDiscardBtn').onclick=()=>{
  if(invCategory==='gloves')discardGloveById(selectedInvGloveId);
  else discardKnifeById(selectedInvKnifeId);
};

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
