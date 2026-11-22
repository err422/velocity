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
  stateEl.textContent=p.wallrun?'WALLRUN':p.grapple?'TETHER':p.low&&p.grounded?'SLIDE':p.grounded?'GROUNDED':'AIRBORNE';
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

// ---------- levels + menu ----------
const LEVELS={sandbox:{name:'SANDBOX',build:buildSandbox},course1:{name:'COURSE 01',build:buildCourse1}};
function loadLevel(id){
  scene.remove(levelGroup);levelGroup.traverse(o=>o.geometry&&o.geometry.dispose());
  levelGroup=new THREE.Group();scene.add(levelGroup);
  solids.length=0;solidMeshes.length=0;pads=[];
  level=LEVELS[id].build();course=level.course;SPAWN=level.spawn;SPAWN_YAW=level.yaw;
  PB_KEY='velocity_pb_'+id;SPL_KEY='velocity_splits_'+id;
  GHOST_PB_KEY='velocity_ghost_pb_'+id;GHOST_LAST_KEY='velocity_ghost_last_'+id;
  player.best=Number(localStorage.getItem(PB_KEY)||0);
  try{bestSplits=JSON.parse(localStorage.getItem(SPL_KEY)||'[]');}catch(e){bestSplits=[];}
  if(course){loadCourseGhosts(id);}
  else{ghostPb=null;ghostLast=null;updateGhostHud();}
  pbEl.textContent=course?(player.best>0?'PERSONAL BEST '+fmt(player.best):'PERSONAL BEST —:—.---'):'';
  document.querySelector('.rightstats').style.display=course?'':'none';
  $('levelName').textContent=LEVELS[id].name;
  document.body.dataset.level=id;
  resetPlayer();toast.style.opacity=0;
}
const menuEl=$('menu'),pauseEl=$('pause');let inLevel=false;
function showMenu(){
  inLevel=false;overlay.style.display='grid';menuEl.style.display='';pauseEl.style.display='none';
  document.body.dataset.state='title';
  for(const id in LEVELS){const el=$('pb-'+id),t=Number(localStorage.getItem('velocity_pb_'+id)||0);if(el&&t>0)el.textContent='PB '+fmt(t);}
}
function showPause(){overlay.style.display='grid';menuEl.style.display='none';pauseEl.style.display='';document.body.dataset.state='paused';}
function enter(){
  overlay.style.display='none';
  document.body.dataset.state='playing';
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  try{
    const res=renderer.domElement.requestPointerLock?.();
    if(res&&typeof res.catch==='function')res.catch(()=>{});
  }catch(_){}
}
function onUnlock(){if(inLevel&&overlay.style.display==='none')showPause();}
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{loadLevel(b.dataset.level);inLevel=true;enter();});
$('resume').onclick=enter;$('restart').onclick=()=>{resetPlayer();enter();};$('tomenu').onclick=showMenu;

const params=new URLSearchParams(location.search);
if(params.get('autostart')==='1'){
  const lvl=LEVELS[params.get('level')]?params.get('level'):'course1';
  loadLevel(lvl);inLevel=true;enter();
}else{
  showMenu();
}
if(isSoftwareGl)frame(performance.now());
else frameId=requestAnimationFrame(frame);
