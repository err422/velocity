// ---------- state ----------
let SPAWN=V3(0,0,-83),SPAWN_YAW=Math.PI;
const player={pos:SPAWN.clone(),prev:SPAWN.clone(),vel:V3(),yaw:Math.PI,pitch:0,grounded:false,low:false,
  wallrun:false,wallN:V3(),wallTimer:0,wallCd:0,noGround:0,slideCd:0,grapple:null,grappleLine:null,
  runStarted:false,runTime:0,gate:0,splits:[],cp:null,best:0,eye:CFG.eyeStand,roll:0};
const contact={ground:false,wall:false,gn:V3(),wn:V3()};
const keys={},wish=V3();
let locked=false,last=performance.now(),acc=0,jumpBuffer=0,coyote=0,burstCd=0,padCd=0,toastTimer=0;
let ghostRecorder=null,ghostPb=null,ghostLast=null,ghostMode='pb',ghostVisual=null;
camera.rotation.order='YXZ';
const $=id=>document.getElementById(id);
const cpEl=$('cp'),speedEl=$('speed'),stateEl=$('state'),timerEl=$('timer'),pbEl=$('pb'),ghostHudEl=$('ghostHud'),centerMsg=$('centerMessage'),grappleEl=$('grappleState'),overlay=$('overlay'),toast=$('toast');
function fmt(t){const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
function showToast(s){toast.textContent=s;toast.style.opacity=1;toastTimer=1.7;}
function message(s){centerMsg.textContent=s;centerMsg.style.opacity=1;setTimeout(()=>centerMsg.style.opacity=0,1200);}
function updateGhostHud(){
  if(!ghostHudEl)return;
  if(!course){ghostHudEl.textContent='';return;}
  const sel=GhostSystem.selectGhostEntry(ghostMode,ghostPb,ghostLast);
  if(sel.kind==='off')ghostHudEl.textContent='GHOST OFF [G]';
  else if(sel.kind==='none')ghostHudEl.textContent='GHOST NONE';
  else ghostHudEl.textContent=`GHOST ${sel.kind.toUpperCase()} ${fmt(sel.ghost.duration)} [G]`;
}
function loadCourseGhosts(courseId){
  ghostPb=null;ghostLast=null;
  try{ghostPb=GhostSystem.deserializeGhost(localStorage.getItem(GHOST_PB_KEY),courseId);}catch(_){}
  try{ghostLast=GhostSystem.deserializeGhost(localStorage.getItem(GHOST_LAST_KEY),courseId);}catch(_){}
  updateGhostHud();
}
function toggleGhostMode(){
  if(!course)return;
  ghostMode=GhostSystem.nextGhostMode(ghostMode);
  updateGhostHud();
  const sel=GhostSystem.selectGhostEntry(ghostMode,ghostPb,ghostLast);
  showToast(sel.kind==='off'?'GHOST OFF':sel.kind==='none'?'NO GHOST SAVED':`GHOST: ${sel.kind.toUpperCase()}`);
}


// ---------- input ----------
document.addEventListener('pointerlockchange',()=>{
  const wasLocked=locked;
  locked=document.pointerLockElement===renderer.domElement;
  if(!locked){for(const k in keys)keys[k]=false;if(wasLocked)onUnlock();}
});
document.addEventListener('mousemove',e=>{if(!locked)return;player.yaw-=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0022,-1.48,1.48);});
document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space'){jumpBuffer=CFG.jumpBuffer;e.preventDefault();}
  const activePlay=locked||(typeof inLevel!=='undefined'&&inLevel&&overlay.style.display==='none');
  if(!activePlay)return;
  if(e.code==='Escape'&&!locked){onUnlock();return;}
  if(e.code==='KeyE'&&!e.repeat)toggleGrapple();
  if(e.code==='KeyR')resetPlayer();
  if(e.code==='KeyT')toCheckpoint();
  if(e.code==='KeyQ'&&!e.repeat)burst();
  if(e.code==='KeyG'&&!e.repeat)toggleGhostMode();
});
document.addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});

// ---------- collision ----------
const _lp=V3(),_c=V3(),_d=V3(),_n=V3();
// Squared distance from sphere center c to solid s; fills _d with the local-space offset.
function sphereVs(s,c){
  _lp.copy(c).applyMatrix4(s.inv);
  _d.set(_lp.x-clamp(_lp.x,-s.half.x,s.half.x),_lp.y-clamp(_lp.y,-s.half.y,s.half.y),_lp.z-clamp(_lp.z,-s.half.z,s.half.z));
  return _d.lengthSq();
}
// Push one capsule sphere out of every solid; clip velocity against the surface (keeps speed along it = surf).
function pushSphere(cy){
  const R=CFG.radius,p=player.pos,v=player.vel,T=R+CFG.skin;
  _c.set(p.x,p.y+cy,p.z);
  for(const s of solids){
    if(s.box.distanceToPoint(_c)>T)continue;
    const d2=sphereVs(s,_c);
    if(d2>=T*T)continue;
    let pen;
    if(d2>1e-12){const dist=Math.sqrt(d2);_n.copy(_d).divideScalar(dist);pen=R-dist;}
    else{ // center is inside the box: exit through the nearest face
      const ox=s.half.x-Math.abs(_lp.x),oy=s.half.y-Math.abs(_lp.y),oz=s.half.z-Math.abs(_lp.z);
      if(ox<=oy&&ox<=oz){_n.set(Math.sign(_lp.x)||1,0,0);pen=R+ox;}
      else if(oy<=oz){_n.set(0,Math.sign(_lp.y)||1,0);pen=R+oy;}
      else{_n.set(0,0,Math.sign(_lp.z)||1);pen=R+oz;}
    }
    _n.applyQuaternion(s.q);
    if(pen>0){
      p.addScaledVector(_n,pen);_c.addScaledVector(_n,pen);
      const into=v.dot(_n);if(into<0)v.addScaledVector(_n,-into);
    }
    if(_n.y>=CFG.walkableY){contact.ground=true;contact.gn.copy(_n);}
    else if(Math.abs(_n.y)<.3){contact.wall=true;contact.wn.set(_n.x,0,_n.z).normalize();}
  }
}
function collide(){
  contact.ground=false;contact.wall=false;
  const hs=player.low?H_LOW:H_STAND;
  for(let i=0;i<3;i++)for(const h of hs)pushSphere(h);
}
function headBlocked(){
  const p=player.pos;_c.set(p.x,p.y+H_STAND[2],p.z);
  for(const s of solids){if(s.box.distanceToPoint(_c)>CFG.radius)continue;if(sphereVs(s,_c)<(CFG.radius-.01)**2)return true;}
  return false;
}

// ---------- abilities ----------
function toggleGrapple(){
  const p=player;
  if(p.grapple){p.grapple=null;grappleEl.textContent='GRAPPLE READY';return;}
  const cp=Math.cos(p.pitch),dir=V3(-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp);
  raycaster.set(V3(p.pos.x,p.pos.y+p.eye,p.pos.z),dir);raycaster.far=CFG.grappleRange;
  const hits=raycaster.intersectObjects(solidMeshes,false);
  if(hits.length){p.grapple=hits[0].point.clone();grappleEl.textContent='GRAPPLE CONNECTED';showToast('TETHER CONNECTED');}
  else showToast('NO GRAPPLE ANCHOR');
}
function burst(){
  if(burstCd>0)return;
  const d=wish.lengthSq()>0?wish.clone():V3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
  player.vel.addScaledVector(d.normalize(),CFG.burstImpulse);
  burstCd=CFG.burstCooldown;showToast('KINETIC BURST');
}
function resetPlayer(){
  const p=player;
  p.pos.copy(SPAWN);p.prev.copy(SPAWN);p.vel.set(0,0,0);p.yaw=SPAWN_YAW;p.pitch=0;
  p.grapple=null;p.grounded=false;p.low=false;p.wallrun=false;p.wallTimer=0;
  p.runStarted=false;p.runTime=0;p.gate=0;p.cp=null;p.splits=[];ghostRecorder=null;
  refreshGates();cpEl.textContent='';timerEl.textContent='00:00.000';grappleEl.textContent='GRAPPLE READY';showToast('POSITION RESET');
}

// ---------- movement ----------
// Quake accelerate: add speed along wishdir only until the projection reaches wishSpeed.
function accelerate(wd,wishSpeed,accel,dt,scale=wishSpeed){
  const v=player.vel,add=wishSpeed-(v.x*wd.x+v.z*wd.z);
  if(add<=0)return;
  const a=Math.min(add,accel*scale*dt);v.x+=wd.x*a;v.z+=wd.z*a;
}
const _q=V3();
// Did the player's chest cross gate g's plane in its facing direction, inside the ring, this tick?
function crossedGate(g,p){
  const n=g.n;
  const d0=(p.prev.x-g.p.x)*n.x+(p.prev.z-g.p.z)*n.z,d1=(p.pos.x-g.p.x)*n.x+(p.pos.z-g.p.z)*n.z;
  if(!(d0<0&&d1>=0))return false;
  _q.lerpVectors(p.prev,p.pos,d0/(d0-d1));_q.y+=1;
  return _q.distanceTo(g.p)<g.r;
}
function refreshGates(){
  if(!course)return;
  course.forEach((g,i)=>{
    const next=i===player.gate,done=player.runStarted&&i<player.gate;
    g.mesh.material.color.setHex(next?(i===course.length-1?0xff9b55:0x65e7ff):done?0x2f7f5f:0x2b4a5e);
  });
}
function passGate(){
  const p=player,i=p.gate,last=course.length-1;
  if(i===0){
    p.runStarted=true;p.runTime=0;p.splits=[];p.cp=null;p.gate=1;cpEl.textContent='';
    ghostRecorder=GhostSystem.createRecorder(level.id);
    GhostSystem.recordSample(ghostRecorder,0,p,true);
    message('RUN STARTED');refreshGates();return;
  }
  p.splits[i]=p.runTime;
  const ref=bestSplits[i],d=ref!=null?p.runTime-ref:null;
  const dtxt=d==null?'':(d<=0?'−':'+')+Math.abs(d).toFixed(2);
  if(i<last){
    p.cp={pos:(course[i].spawn||p.pos).clone(),i};p.gate=i+1;
    cpEl.textContent=`GATE ${i}/${last-1}  ${dtxt}`;showToast(`GATE ${i}/${last-1} — ${fmt(p.runTime)}  ${dtxt}`);
  }else{
    p.runStarted=false;p.gate=0;p.cp=null;cpEl.textContent='FINISH  '+dtxt;
    const isNewBest=!p.best||p.runTime<p.best;
    const recorded=GhostSystem.finalizeRecording(ghostRecorder,p.runTime,p);
    ghostRecorder=null;
    if(recorded){
      ghostLast=recorded;
      try{localStorage.setItem(GHOST_LAST_KEY,GhostSystem.serializeGhost(recorded));}catch(_){}
      if(isNewBest||!ghostPb){
        ghostPb=recorded;
        try{localStorage.setItem(GHOST_PB_KEY,GhostSystem.serializeGhost(recorded));}catch(_){}
      }
      updateGhostHud();
    }
    if(isNewBest){
      p.best=p.runTime;bestSplits=Array.from(p.splits,x=>x??null);
      localStorage.setItem(PB_KEY,p.best);localStorage.setItem(SPL_KEY,JSON.stringify(bestSplits));
      pbEl.textContent='PERSONAL BEST '+fmt(p.best);message('NEW PERSONAL BEST');showToast('NEW PERSONAL BEST — '+fmt(p.best));
    }else{message('RUN COMPLETE');showToast('FINISH — '+fmt(p.runTime)+'  '+dtxt);}
  }
  refreshGates();
}
// Respawn at the last gate passed (timer keeps running); with no run active it restarts instead.
function toCheckpoint(){
  const p=player;
  if(!p.runStarted||!p.cp){resetPlayer();return;}
  const g=course[p.cp.i];
  p.pos.copy(p.cp.pos);p.prev.copy(p.pos);p.vel.set(0,0,0);p.yaw=Math.atan2(-g.n.x,-g.n.z);p.pitch=0;
  p.grapple=null;p.wallrun=false;p.low=false;p.grounded=false;showToast('CHECKPOINT');
}

function step(dt){
  const p=player,v=p.vel,C=CFG;
  p.prev.copy(p.pos);
  jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=Math.max(0,coyote-dt);burstCd=Math.max(0,burstCd-dt);padCd=Math.max(0,padCd-dt);
  p.slideCd=Math.max(0,p.slideCd-dt);p.wallCd=Math.max(0,p.wallCd-dt);p.noGround=Math.max(0,p.noGround-dt);

  // Wish direction
  const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);wish.set(0,0,0);
  if(keys.KeyW){wish.x-=sy;wish.z-=cy;}if(keys.KeyS){wish.x+=sy;wish.z+=cy;}
  if(keys.KeyD){wish.x+=cy;wish.z-=sy;}if(keys.KeyA){wish.x-=cy;wish.z+=sy;}
  const hasWish=wish.lengthSq()>0;if(hasWish)wish.normalize();

  // Stance (can't stand up under a low ceiling) and slide entry boost
  const wasLow=p.low,wantLow=!!(keys.ShiftLeft||keys.ShiftRight);
  if(wantLow)p.low=true;else if(p.low&&!headBlocked())p.low=false;
  let grounded=p.grounded;
  if(p.low&&!wasLow&&grounded&&p.slideCd<=0&&Math.hypot(v.x,v.z)>C.slideMinSpeed){v.x*=C.slideBoost;v.z*=C.slideBoost;p.slideCd=C.slideBoostCooldown;}

  // Jump (ground / coyote / auto-hop), else wall jump. Jumping before friction = bunny hop.
  if((jumpBuffer>0||(C.autoHop&&keys.Space))&&(grounded||coyote>0)){
    v.y=Math.max(v.y,0)+C.jumpSpeed;grounded=false;coyote=0;jumpBuffer=0;p.noGround=.08;
  }else if(jumpBuffer>0&&p.wallrun){
    v.addScaledVector(p.wallN,C.wallJumpPush);v.y=Math.max(v.y,0)+C.wallJumpUp;
    p.wallrun=false;p.wallCd=C.wallCooldown;p.wallTimer=0;jumpBuffer=0;p.noGround=.05;
  }

  // Friction + acceleration
  const hs=Math.hypot(v.x,v.z);
  if(grounded){
    const fast=p.low&&hs>C.slideMinSpeed;
    if(hs>0){const ns=Math.max(0,hs-Math.max(hs,C.stopSpeed)*(fast?C.slideFriction:C.friction)*dt);v.x*=ns/hs;v.z*=ns/hs;}
    if(hasWish){
      if(fast)accelerate(wish,C.airWishCap,C.airAccel,dt,C.groundSpeed);       // carve while sliding
      else if(p.low)accelerate(wish,C.groundSpeed*.5,C.slideAccel,dt);          // slow crouch-walk
      else accelerate(wish,C.groundSpeed,C.groundAccel,dt);
    }
  }else if(hasWish)accelerate(wish,C.airWishCap,C.airAccel,dt,C.groundSpeed);   // air strafe

  // Grapple pull
  if(p.grapple){
    const to=p.grapple.clone().sub(V3(p.pos.x,p.pos.y+1,p.pos.z)),dist=to.length();
    if(dist<C.grappleRelease){p.grapple=null;grappleEl.textContent='GRAPPLE READY';}
    else{to.divideScalar(dist);const along=v.dot(to);if(along<C.grapplePullSpeed)v.addScaledVector(to,Math.min(C.grapplePullAccel*dt,C.grapplePullSpeed-along));grappleEl.textContent='TETHER '+Math.round(dist)+'M';}
  }

  // Gravity (none while standing on ground, so slopes don't drag you; sliding uses full slope gravity)
  let gs=1;if(p.wallrun)gs=C.wallGravityScale;if(p.grapple)gs=Math.min(gs,C.grappleGravityScale);
  if(!(grounded&&!p.low))v.y-=C.gravity*gs*dt;
  if(p.wallrun){v.y=Math.max(v.y,-C.wallMaxFall);v.addScaledVector(p.wallN,-C.wallStick*dt);}

  // Move + collide
  p.pos.addScaledVector(v,dt);
  collide();
  p.grounded=contact.ground&&p.noGround<=0;
  if(!p.grounded&&grounded&&v.y<=.01&&p.noGround<=0){      // ground snap for running down slopes
    p.pos.y-=C.snapDist;collide();
    if(contact.ground)p.grounded=true;else{p.pos.y+=C.snapDist;collide();}
  }
  if(p.grounded){coyote=C.coyote;p.wallTimer=0;}

  // Wall-run attach (needs a near-vertical contact, speed, input, and time budget)
  if(!p.grounded&&contact.wall&&Math.hypot(v.x,v.z)>C.wallMinSpeed&&hasWish&&p.wallTimer<C.wallMaxTime&&p.wallCd<=0){
    p.wallN.copy(contact.wn);p.wallrun=true;p.wallTimer+=dt;
  }else p.wallrun=false;

  // Launch pads
  for(const pad of pads){
    if(padCd<=0&&Math.hypot(p.pos.x-pad.position.x,p.pos.z-pad.position.z)<2.6&&Math.abs(p.pos.y-pad.position.y)<.6&&v.y<8){
      v.y=C.padUp;v.x*=C.padBoost;v.z*=C.padBoost;p.noGround=.1;padCd=.3;showToast('LAUNCH PAD');
    }
  }
  // Bounds, kill plane
  if(level.bound){const B=level.bound;
    if(Math.abs(p.pos.x)>B){p.pos.x=Math.sign(p.pos.x)*B;v.x=0;}
    if(Math.abs(p.pos.z)>B){p.pos.z=Math.sign(p.pos.z)*B;v.z=0;}}
  if(p.pos.y<C.killY){toCheckpoint();return;}

  // Time trial: gates must be crossed in order, along their facing direction
  if(p.runStarted){
    p.runTime+=dt;
    if(ghostRecorder)GhostSystem.recordSample(ghostRecorder,p.runTime,p);
  }
  if(course&&crossedGate(course[p.gate],p))passGate();
}

