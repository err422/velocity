// ---------- render ----------
const _rp=V3();
ghostVisual=GhostSystem.createGhostMesh(THREE,scene);

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
  const right=V3(Math.cos(p.yaw),0,-Math.sin(p.yaw));
  const rollT=p.wallrun?-C.wallRoll*Math.sign(right.dot(p.wallN)):0;
  p.roll+=(rollT-p.roll)*Math.min(1,dt*8);
  camera.position.set(_rp.x,_rp.y+p.eye,_rp.z);
  camera.rotation.set(p.pitch,p.yaw,p.roll);
  const sp=Math.hypot(p.vel.x,p.vel.z);
  camera.fov+=(C.fovBase+Math.min(sp*C.fovPerSpeed,C.fovMax)-camera.fov)*Math.min(1,dt*5);camera.updateProjectionMatrix();
  speedEl.textContent=Math.round(sp);
  if(p.runStarted)timerEl.textContent=fmt(p.runTime);
  stateEl.textContent=!inLevel?'READY':p.wallrun?'WALLRUN':p.grapple?'TETHER':p.low&&p.grounded?'SLIDE':p.grounded?'GROUNDED':'AIRBORNE';
  if(p.grapple){
    if(!p.grappleLine){
      p.grappleLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(),V3()]),new THREE.LineBasicMaterial({color:0x65e7ff}));
      p.grappleLine.frustumCulled=false;scene.add(p.grappleLine);
    }
    const pos=p.grappleLine.geometry.attributes.position;
    pos.setXYZ(0,_rp.x,_rp.y+1.2,_rp.z);pos.setXYZ(1,p.grapple.x,p.grapple.y,p.grapple.z);pos.needsUpdate=true;
  }else if(p.grappleLine){scene.remove(p.grappleLine);p.grappleLine=null;}
  updateGhostVisual(dt);
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
  if(isSoftwareGl)afterDraw(frame);
  else frameId=requestAnimationFrame(frame);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- levels + seeded daily courses ----------
const LEVELS={sandbox:{name:'SANDBOX',build:buildSandbox},course1:{name:'COURSE 01',build:buildCourse1}};
const worldBuildApi={
  slab,
  addBox,
  addRamp,
  addLaunchPad,
  buildGates,
  gateText,
  V3,
  materials:{concrete,cyan,orange,dark,floorMat}
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

// ---------- menu, daily hub, leaderboard & auth ----------
const overlayCard=$('overlayCard'),menuEl=$('menu'),dailyHubEl=$('dailyHub'),pauseEl=$('pause');
const archiveListEl=$('archiveList'),lbListEl=$('lbList'),lbStatusEl=$('lbStatus'),lbAuthNoteEl=$('lbAuthNote');
const customSeedInput=$('customSeedInput'),customSeedPreview=$('customSeedPreview');
const menuAuthName=$('menuAuthName'),menuAuthBtn=$('menuAuthBtn'),hubAuthBtn=$('hubAuthBtn');
let inLevel=false;
let archiveCourses=[];
let selectedDateKey=DailyCourseGen.getTodayDateKey();
let activeLbRequest=0;

function localPbFor(courseId){
  return Number(localStorage.getItem('velocity_pb_'+courseId)||0);
}

function refreshTodayButton(){
  const todayKey=DailyCourseGen.getTodayDateKey();
  const todaySeed=DailyCourseGen.canonicalDailySeed(todayKey);
  const meta=DailyCourseGen.previewSeedCourse(todaySeed,todayKey);
  const pb=localPbFor(meta.id);
  $('todayBtnTitle').textContent=`TODAY'S DAILY — ${DailyCourseGen.formatDateDisplay(todayKey)}`;
  $('todayBtnSub').textContent=pb>0?`${meta.lengthLabel} · PB ${fmt(pb)}`:`${meta.lengthLabel} · ${meta.segmentCount} SEGMENTS`;
}

function renderAuthUI(user){
  if(user){
    const label=user.displayName||(user.email?user.email.split('@')[0]:'Runner');
    menuAuthName.textContent=label;
    menuAuthName.style.display='';
    menuAuthBtn.textContent='SIGN OUT';
    hubAuthBtn.textContent='SIGN OUT';
  }else{
    menuAuthName.textContent='';
    menuAuthName.style.display='none';
    menuAuthBtn.textContent='SIGN IN';
    hubAuthBtn.textContent='SIGN IN';
  }
  updateLeaderboardAuthNote();
}

async function handleAuthClick(){
  if(!window.DailyBackend)return;
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
    const msg=err&&err.message?err.message:'Sign-in canceled';
    if(!msg.includes('popup-closed-by-user'))showToast('SIGN-IN UNAVAILABLE');
  }
}

function updateLeaderboardAuthNote(){
  if(!lbAuthNoteEl)return;
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null,online:false};
  if(st.user){
    const label=st.user.displayName||'Runner';
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
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  pauseEl.style.display='none';
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
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  menuEl.style.display='';
  dailyHubEl.style.display='none';
  pauseEl.style.display='none';
  document.body.dataset.state='title';
  refreshTodayButton();
  for(const id in LEVELS){
    const el=$('pb-'+id),t=localPbFor(id);
    if(el&&t>0)el.textContent='PB '+fmt(t);
  }
}

function showPause(){
  overlay.style.display='grid';
  overlayCard.classList.remove('wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  pauseEl.style.display='';
  document.body.dataset.state='paused';
}

function enter(){
  overlay.style.display='none';
  overlayCard.classList.remove('wide');
  document.body.dataset.state='playing';
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  try{
    const res=renderer.domElement.requestPointerLock?.();
    if(res&&typeof res.catch==='function')res.catch(()=>{});
  }catch(_){}
}

function onUnlock(){if(inLevel&&overlay.style.display==='none')showPause();}

// Auto-submit daily runs to Firestore when signed in
window.onCourseFinished=async function(info){
  if(!info||!info.dateKey||!window.DailyBackend)return;
  try{
    const res=await window.DailyBackend.submitDailyRun(info.dateKey,info.runTime,info.splits);
    if(res.submitted&&res.improved){
      showToast(res.rank?`LEADERBOARD UPDATED — #${res.rank}`:'LEADERBOARD UPDATED');
    }else if(res.reason==='signed-out'&&info.isNewBest){
      showToast(`NEW LOCAL PB — ${fmt(info.runTime)} · SIGN IN TO POST`);
    }
  }catch(_){
    // Local PB and ghost are already safely persisted
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
$('resume').onclick=enter;
$('restart').onclick=()=>{resetPlayer();enter();};
$('pauseArchive').onclick=()=>openDailyHub(level.meta&&level.meta.dateKey?level.meta.dateKey:DailyCourseGen.getTodayDateKey());
$('tomenu').onclick=showMenu;

if(window.DailyBackend){
  window.DailyBackend.onAuthChange(renderAuthUI);
}

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
