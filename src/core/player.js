// Player state, HUD helpers, movement abilities, gates/checkpoints, and 120Hz step simulation.
// ---------- state ----------
let SPAWN=V3(0,0,-83),SPAWN_YAW=Math.PI;
const player={pos:SPAWN.clone(),prev:SPAWN.clone(),vel:V3(),yaw:Math.PI,pitch:0,grounded:false,low:false,
  wallrun:false,wallN:V3(),wallTimer:0,wallCd:0,noGround:0,slideCd:0,grapple:null,grappleLine:null,
  surfing:false,surfN:V3(),surfGrace:0,surfTime:0,
  runStarted:false,runTime:0,gate:0,splits:[],cp:null,best:0,eye:CFG.eyeStand,roll:0};
const contact={ground:false,wall:false,surf:false,gn:V3(),wn:V3(),sn:V3()};
const keys={},wish=V3();
let locked=false,last=performance.now(),acc=0,jumpBuffer=0,coyote=0,burstCd=0,padCd=0,boosterCd=0,teleCd=0,toastTimer=0;
let ghostRecorder=null,ghostPb=null,ghostLast=null,ghostMode='pb',ghostVisual=null;
camera.rotation.order='YXZ';
const $=id=>document.getElementById(id);
const cpEl=$('cp'),speedEl=$('speed'),stateEl=$('state'),timerEl=$('timer'),pbEl=$('pb'),ghostHudEl=$('ghostHud'),centerMsg=$('centerMessage'),grappleEl=$('grappleState'),overlay=$('overlay'),toast=$('toast');
function fmt(t){const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
let centerMsgTimer=0;
function showToast(s){toast.textContent=s;toast.style.opacity=1;toastTimer=1.7;}
function message(s,opts){
  const mythic=!!(opts&&opts.mythic);
  const dur=(opts&&opts.duration)||1200;
  centerMsg.textContent=s;
  centerMsg.classList.toggle('mythic',mythic);
  centerMsg.style.opacity=1;
  if(centerMsgTimer)clearTimeout(centerMsgTimer);
  centerMsgTimer=setTimeout(()=>{centerMsg.style.opacity=0;centerMsgTimer=0;},dur);
}
function updateGhostHud(){
  if(!ghostHudEl)return;
  if(!course){ghostHudEl.textContent='';return;}
  const gTok=getSettings().keybinds.ghost;
  const gLbl=window.VelocitySettings?VelocitySettings.formatInputToken(gTok):'G';
  const sel=GhostSystem.selectGhostEntry(ghostMode,ghostPb,ghostLast);
  if(sel.kind==='off')ghostHudEl.textContent=`GHOST OFF [${gLbl}]`;
  else if(sel.kind==='none')ghostHudEl.textContent='GHOST NONE';
  else ghostHudEl.textContent=`GHOST ${sel.kind.toUpperCase()} ${fmt(sel.ghost.duration)} [${gLbl}]`;
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


function respawnAtSpawn(sp,refillAmmo){
  const p=player;
  if(sp){
    p.pos.set(sp.x,sp.y,sp.z);
    p.prev.set(sp.x,sp.y,sp.z);
    if(typeof sp.yaw==='number')p.yaw=sp.yaw;
  }
  p.vel.set(0,0,0);
  p.pitch=0;
  p.grapple=null;p.grounded=false;p.low=false;p.wallrun=false;p.wallTimer=0;
  p.surfing=false;p.surfGrace=0;
  if(typeof window.applyPendingLoadoutIfAny==='function')window.applyPendingLoadoutIfAny();
  if(refillAmmo&&window.CombatSystem){
    window.CombatSystem.resetAmmo();
    window.CombatSystem.clearScope();
  }
}
window.respawnAtSpawn=respawnAtSpawn;
// ---------- abilities ----------
// Dedicated surf maps are pure-surf: no player-triggered grapple or burst.
function isDedicatedSurfMap(){
  if(typeof level==='undefined'||!level||!level.id)return false;
  const catalog=window.CourseCatalog;
  if(!catalog||typeof catalog.getCourseMeta!=='function')return false;
  const meta=catalog.getCourseMeta(level.id);
  return !!(meta&&meta.category==='surf');
}
function toggleGrapple(){
  const p=player;
  if(isDedicatedSurfMap()){
    p.grapple=null;
    grappleEl.textContent='GRAPPLE DISABLED';
    showToast('GRAPPLE DISABLED IN SURF MAPS');
    return;
  }
  if(p.grapple){p.grapple=null;grappleEl.textContent='GRAPPLE READY';return;}
  const cp=Math.cos(p.pitch),dir=V3(-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp);
  raycaster.set(V3(p.pos.x,p.pos.y+p.eye,p.pos.z),dir);raycaster.far=CFG.grappleRange;
  const hits=raycaster.intersectObjects(solidMeshes,false);
  if(hits.length){p.grapple=hits[0].point.clone();grappleEl.textContent='GRAPPLE CONNECTED';showToast('TETHER CONNECTED');}
  else showToast('NO GRAPPLE ANCHOR');
}
function burst(){
  if(isDedicatedSurfMap()){
    showToast('KINETIC BURST DISABLED IN SURF MAPS');
    return;
  }
  if(burstCd>0)return;
  const d=wish.lengthSq()>0?wish.clone():V3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
  d.normalize();
  const along=player.vel.x*d.x+player.vel.z*d.z;
  const maxSpd=CFG.burstMaxSpeed||28;
  const gain=along<maxSpd?Math.min(CFG.burstImpulse,maxSpd-along):Math.max(1.2,CFG.burstImpulse*0.18);
  player.vel.addScaledVector(d,gain);
  burstCd=CFG.burstCooldown;showToast('KINETIC BURST');
}
function resetPlayer(){
  const p=player;
  p.pos.copy(SPAWN);p.prev.copy(SPAWN);p.vel.set(0,0,0);p.yaw=SPAWN_YAW;p.pitch=0;
  p.grapple=null;p.grounded=false;p.low=false;p.wallrun=false;p.wallTimer=0;
  p.surfing=false;p.surfGrace=0;p.surfTime=0;
  p.runStarted=false;p.runTime=0;p.gate=0;p.cp=null;p.splits=[];ghostRecorder=null;
  boosterCd=0;teleCd=0;
  if(window.CombatSystem){
    window.CombatSystem.resetTargets();
    window.CombatSystem.resetAmmo();
    window.CombatSystem.clearScope();
  }
  refreshGates();cpEl.textContent='';timerEl.textContent='00:00.000';grappleEl.textContent=isDedicatedSurfMap()?'GRAPPLE DISABLED':'GRAPPLE READY';showToast('POSITION RESET');
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
    if(window.CombatSystem)window.CombatSystem.resetTargets();
    ghostRecorder=GhostSystem.createRecorder(level.id);
    GhostSystem.recordSample(ghostRecorder,0,p,true);
    message('RUN STARTED');refreshGates();return;
  }
  p.splits[i]=p.runTime;
  const ref=bestSplits[i],d=ref!=null?p.runTime-ref:null;
  const dtxt=d==null?'':(d<=0?'−':'+')+Math.abs(d).toFixed(2);
  if(i<last){
    const g=course[i];
    const cpYaw=g.spawnYaw!=null?g.spawnYaw:Math.atan2(-g.n.x,-g.n.z);
    p.cp={pos:(g.spawn||p.pos).clone(),i,yaw:cpYaw};p.gate=i+1;
    const isStaged=level.format==='staged';
    const lbl=isStaged?`STAGE ${i+1}/${last}`:`GATE ${i}/${last-1}`;
    cpEl.textContent=`${lbl}  ${dtxt}`;showToast(`${lbl} — ${fmt(p.runTime)}  ${dtxt}`);
  }else{
    p.runStarted=false;p.gate=0;p.cp=null;
    const rawTime=p.runTime;
    let finalTime=rawTime;
    let gauntletSummary=null;
    if(window.CombatSystem){
      const tp=window.CombatSystem.getTargetProgress();
      if(tp.mode==='gauntlet'&&tp.total>0){
        gauntletSummary=window.CombatSystem.computeGauntletSummary(rawTime,tp.hits,tp.total);
        finalTime=gauntletSummary.finalTime;
      }
    }
    p.runTime=finalTime;
    timerEl.textContent=fmt(finalTime);
    const penTag=gauntletSummary
      ?(gauntletSummary.cleanRun?'CLEAN RUN (+0.0S)':`+${gauntletSummary.penaltySec.toFixed(1)}S (${gauntletSummary.targetsHit}/${gauntletSummary.targetsTotal})`)
      :'';
    cpEl.textContent=penTag?`FINISH · ${penTag}`:('FINISH  '+dtxt);
    const isNewBest=!p.best||finalTime<p.best;
    const recorded=GhostSystem.finalizeRecording(ghostRecorder,finalTime,p);
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
      p.best=finalTime;bestSplits=Array.from(p.splits,x=>x??null);
      localStorage.setItem(PB_KEY,p.best);localStorage.setItem(SPL_KEY,JSON.stringify(bestSplits));
      pbEl.textContent='PERSONAL BEST '+fmt(p.best);
      message(penTag?`NEW PB · ${penTag}`:'NEW PERSONAL BEST',{duration:2200});
      showToast('NEW PERSONAL BEST — '+fmt(p.best)+(penTag?' · '+penTag:''));
    }else{
      message(penTag?`RUN COMPLETE · ${penTag}`:'RUN COMPLETE',{duration:2000});
      showToast('FINISH — '+fmt(finalTime)+(penTag?' · '+penTag:'  '+dtxt));
    }
    if(typeof window.onCourseFinished==='function'){
      const cleanSplits=p.splits.filter(x=>typeof x==='number'&&Number.isFinite(x));
      window.onCourseFinished({
        levelId:level.id,
        dateKey:level.meta&&level.meta.dateKey?level.meta.dateKey:null,
        seed:level.meta&&level.meta.seed?level.meta.seed:null,
        runTime:finalTime,
        rawTime,
        gauntlet:gauntletSummary,
        splits:cleanSplits,
        isNewBest
      });
    }
  }
  refreshGates();
}
// Respawn at the last gate passed (timer keeps running); with no run active it restarts instead.
function toCheckpoint(customLabel){
  const p=player;
  if(!p.runStarted||!p.cp){resetPlayer();return;}
  const g=course[p.cp.i];
  p.pos.copy(p.cp.pos);p.prev.copy(p.pos);p.vel.set(0,0,0);
  p.yaw=p.cp.yaw!=null?p.cp.yaw:Math.atan2(-g.n.x,-g.n.z);p.pitch=0;
  p.grapple=null;p.wallrun=false;p.low=false;p.grounded=false;p.surfing=false;p.surfGrace=0;
  showToast(customLabel||(level.format==='staged'?'STAGE RETRY':'CHECKPOINT'));
}

function step(dt){
  const p=player,v=p.vel,C=CFG;
  p.prev.copy(p.pos);
  const chrono=window.CombatSystem&&typeof window.CombatSystem.getChronoState==='function'?window.CombatSystem.getChronoState():null;
  const chronoScale=chrono&&chrono.scale>0&&chrono.scale<1?chrono.scale:1;
  const moveDt=dt*chronoScale;

  jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=Math.max(0,coyote-moveDt);burstCd=Math.max(0,burstCd-dt);padCd=Math.max(0,padCd-dt);
  boosterCd=Math.max(0,boosterCd-dt);teleCd=Math.max(0,teleCd-dt);
  p.slideCd=Math.max(0,p.slideCd-dt);p.wallCd=Math.max(0,p.wallCd-dt);p.noGround=Math.max(0,p.noGround-moveDt);
  p.surfGrace=Math.max(0,p.surfGrace-moveDt);

  // Full-auto firing (V-47 Rifle, VX-9 Vector SMG) & rapid Fan-the-Hammer hold (R-88 Revolver)
  if(window.CombatSystem){
    const cst=window.CombatSystem.getState();
    if(isActionDown('fire')&&cst.auto){
      performFire(false);
    }
    if(isActionDown('altFire')&&cst.altFireMode==='fan'){
      performFire(false,{fanFire:true});
    }
  }

  // Freeze player movement during 1v1 round countdown or death respawn
  if(isArenaBlocked()){
    if(window.CombatSystem&&typeof window.CombatSystem.setChargeHeld==='function')window.CombatSystem.setChargeHeld(false);
    v.set(0,0,0);
    return;
  }

  // Full Gunsmith Weight System (Melee ALWAYS preserves pure 1.00x surf & ground baseline!)
  const mob=window.CombatSystem?window.CombatSystem.getActiveMobilityProfile():{mobilityMult:1,surfAirMult:1,adsMoveMult:1,adsProgress:0};
  const adsWalkScale=1+(mob.adsMoveMult-1)*(mob.adsProgress||0);
  const effGroundSpeed=C.groundSpeed*mob.mobilityMult*adsWalkScale;

  // Wish direction
  const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);wish.set(0,0,0);
  if(isActionDown('forward')){wish.x-=sy;wish.z-=cy;}if(isActionDown('back')){wish.x+=sy;wish.z+=cy;}
  if(isActionDown('right')){wish.x+=cy;wish.z-=sy;}if(isActionDown('left')){wish.x-=cy;wish.z+=sy;}
  const hasWish=wish.lengthSq()>0;if(hasWish)wish.normalize();

  // Stance (can't stand up under a low ceiling) and slide entry boost
  const wasLow=p.low,wantLow=isActionDown('slide');
  if(wantLow)p.low=true;else if(p.low&&!headBlocked())p.low=false;
  let grounded=p.grounded;
  if(p.low&&!wasLow&&grounded&&p.slideCd<=0&&Math.hypot(v.x,v.z)>C.slideMinSpeed){v.x*=C.slideBoost;v.z*=C.slideBoost;p.slideCd=C.slideBoostCooldown;}

  // Jump (ground / coyote / auto-hop), else wall jump. Jumping before friction = bunny hop.
  if((jumpBuffer>0||(C.autoHop&&isActionDown('jump')))&&(grounded||coyote>0)){
    v.y=Math.max(v.y,0)+C.jumpSpeed;grounded=false;coyote=0;jumpBuffer=0;p.noGround=.08;
  }else if(jumpBuffer>0&&p.wallrun){
    v.addScaledVector(p.wallN,C.wallJumpPush);v.y=Math.max(v.y,0)+C.wallJumpUp;
    p.wallrun=false;p.wallCd=C.wallCooldown;p.wallTimer=0;jumpBuffer=0;p.noGround=.05;
  }

  // Friction + acceleration (authentic CS surf: zero ramp friction + weight-aware air-strafe into ramp)
  const hs=Math.hypot(v.x,v.z);
  if(grounded){
    const fast=p.low&&hs>C.slideMinSpeed;
    if(hs>0){const ns=Math.max(0,hs-Math.max(hs,C.stopSpeed)*(fast?C.slideFriction:C.friction)*moveDt);v.x*=ns/hs;v.z*=ns/hs;}
    if(hasWish){
      if(fast)accelerate(wish,C.airWishCap,C.airAccel,moveDt,effGroundSpeed);       // carve while sliding
      else if(p.low)accelerate(wish,effGroundSpeed*.5,C.slideAccel,moveDt);         // slow crouch-walk
      else accelerate(wish,effGroundSpeed,C.groundAccel,moveDt);
    }
  }else if(hasWish){
    const surfMode=p.surfing||p.surfGrace>0;
    const d=SurfEngine.computeAirStrafeDelta(v,wish,moveDt,C,surfMode);
    v.x+=d.dx*mob.surfAirMult;v.z+=d.dz*mob.surfAirMult;
  }

  // Grapple pull
  if(p.grapple){
    const to=p.grapple.clone().sub(V3(p.pos.x,p.pos.y+1,p.pos.z)),dist=to.length();
    if(dist<C.grappleRelease){p.grapple=null;grappleEl.textContent='GRAPPLE READY';}
    else{to.divideScalar(dist);const along=v.dot(to);if(along<C.grapplePullSpeed)v.addScaledVector(to,Math.min(C.grapplePullAccel*moveDt,C.grapplePullSpeed-along));grappleEl.textContent='TETHER '+Math.round(dist)+'M';}
  }

  // Gravity (none while standing on ground, so slopes don't drag you; sliding & surfing use full gravity)
  let gs=1;if(p.wallrun)gs=C.wallGravityScale;if(p.grapple)gs=Math.min(gs,C.grappleGravityScale);
  if(!(grounded&&!p.low))v.y-=C.gravity*gs*moveDt;
  if(p.wallrun){v.y=Math.max(v.y,-C.wallMaxFall);v.addScaledVector(p.wallN,-C.wallStick*moveDt);}

  // Gentle high-speed drag on non-surf maps so grapple + burst chains stay readable in PvP
  if(!isDedicatedSurfMap()&&C.pvpSoftSpeedCap>0){
    const curHs=Math.hypot(v.x,v.z);
    if(curHs>C.pvpSoftSpeedCap){
      const excess=curHs-C.pvpSoftSpeedCap;
      const bleed=Math.min(excess,excess*(C.pvpSoftDragRate||1.2)*moveDt);
      const scale=(curHs-bleed)/curHs;
      v.x*=scale;v.z*=scale;
    }
  }

  // Move + collide (uses moveDt so velocity vector & surf momentum remain 100% preserved on exit!)
  p.pos.addScaledVector(v,moveDt);
  collide();
  p.grounded=contact.ground&&p.noGround<=0;
  if(!p.grounded&&grounded&&v.y<=.01&&p.noGround<=0&&!contact.surf){      // ground snap for running down slopes
    p.pos.y-=C.snapDist;collide();
    if(contact.ground)p.grounded=true;else{p.pos.y+=C.snapDist;collide();}
  }
  if(p.grounded){coyote=C.coyote;p.wallTimer=0;p.surfing=false;p.surfGrace=0;}
  else if(contact.surf){
    p.surfing=true;p.surfN.copy(contact.sn);p.surfGrace=C.surfGrace;p.surfTime+=moveDt;
  }else{
    p.surfing=false;
  }

  // Wall-run attach (never hijacks a surf slope; needs near-vertical contact, speed, input, and budget)
  if(!p.grounded&&!p.surfing&&contact.wall&&Math.hypot(v.x,v.z)>C.wallMinSpeed&&hasWish&&p.wallTimer<C.wallMaxTime&&p.wallCd<=0){
    p.wallN.copy(contact.wn);p.wallrun=true;p.wallTimer+=moveDt;
  }else p.wallrun=false;

  // Launch pads & vertical launch vents
  for(const pad of pads){
    const ud=pad.userData||{};
    const pr=ud.padRadius||2.6;
    if(padCd<=0&&Math.hypot(p.pos.x-pad.position.x,p.pos.z-pad.position.z)<pr&&Math.abs(p.pos.y-pad.position.y)<1.1&&v.y<10){
      const up=ud.padUp!=null?ud.padUp:C.padUp;
      const boost=ud.padBoost!=null?ud.padBoost:C.padBoost;
      v.y=up;
      v.x*=boost;
      v.z*=boost;
      if(ud.padDir&&ud.padHoriz){
        v.x+=ud.padDir.x*ud.padHoriz;
        v.z+=ud.padDir.z*ud.padHoriz;
      }
      p.noGround=.12;p.grounded=false;padCd=.32;
      showToast(ud.label||'LAUNCH PAD');
    }
  }
  // Directional CS surf / skyline boost rings
  if(boosterCd<=0&&boosters.length){
    for(const b of boosters){
      const dx=p.pos.x-b.pos.x,dy=(p.pos.y+1.0)-b.pos.y,dz=p.pos.z-b.pos.z;
      if(dx*dx+dy*dy+dz*dz<b.radius*b.radius){
        const curSpd=Math.hypot(v.x,v.z);
        const targetSpd=Math.max(curSpd+b.speedBoost*0.45,b.minSpeed);
        v.x=b.dir.x*targetSpd;
        v.z=b.dir.z*targetSpd;
        v.y=Math.max(v.y+b.upBoost*0.45,b.dir.y*targetSpd+b.upBoost);
        p.noGround=.12;p.grounded=false;boosterCd=.45;
        showToast(b.label||'BOOST RING');
        break;
      }
    }
  }
  // Stage & arena flank teleporters (respecting anti-ping-pong cooldown)
  if(teleCd<=0&&teleporters.length){
    for(const tp of teleporters){
      if(p.pos.x>=tp.min.x&&p.pos.x<=tp.max.x&&p.pos.y+1>=tp.min.y&&p.pos.y<=tp.max.y&&p.pos.z>=tp.min.z&&p.pos.z<=tp.max.z){
        p.pos.copy(tp.dest);p.prev.copy(tp.dest);
        p.yaw=tp.destYaw;p.pitch=0;
        if(tp.preserveSpeed){
          const spd=Math.hypot(v.x,v.z);
          const capped=Math.max(8,Math.min(spd,tp.maxSpeed));
          v.set(-Math.sin(tp.destYaw)*capped,0,-Math.cos(tp.destYaw)*capped);
        }else{
          v.set(0,0,0);
        }
        p.grapple=null;p.grounded=false;p.surfing=false;p.surfGrace=0;
        teleCd=tp.cooldown!=null?tp.cooldown:.55;
        if(course&&tp.gateIndex!=null&&p.gate===tp.gateIndex){
          course[tp.gateIndex].spawn=tp.dest.clone();
          course[tp.gateIndex].spawnYaw=tp.destYaw;
          passGate();
          message(tp.label||'NEXT STAGE',{duration:1400});
        }else{
          if(tp.label)showToast(tp.label);
        }
        return;
      }
    }
  }
  // Per-stage fail-return floors (instant stage retry without losing run timer)
  if(failZones.length){
    for(const fz of failZones){
      if(p.pos.y<fz.minY&&p.pos.x>=fz.minX&&p.pos.x<=fz.maxX&&p.pos.z>=fz.minZ&&p.pos.z<=fz.maxZ){
        if(fz.respawn){
          p.pos.copy(fz.respawn);p.prev.copy(fz.respawn);p.vel.set(0,0,0);
          p.yaw=fz.respawnYaw;p.pitch=0;p.grapple=null;p.grounded=false;p.surfing=false;p.surfGrace=0;
          showToast(fz.label||'STAGE RETRY');
        }else{
          toCheckpoint(fz.label||'STAGE RETRY');
        }
        return;
      }
    }
  }
  // Bounds, kill plane (PvP void fall hazards trigger real elimination + attacker credit!)
  if(level.bound){const B=level.bound;
    if(Math.abs(p.pos.x)>B){p.pos.x=Math.sign(p.pos.x)*B;v.x=0;}
    if(Math.abs(p.pos.z)>B){p.pos.z=Math.sign(p.pos.z)*B;v.z=0;}}
  const killFloor=level.killY!=null?level.killY:C.killY;
  if(p.pos.y<killFloor){
    const ns=typeof NetcodeSystem!=='undefined'?NetcodeSystem.getState():null;
    if(ns&&ns.isArena&&typeof NetcodeSystem.reportVoidFall==='function'){
      if(!NetcodeSystem.reportVoidFall()){
        resetPlayer();
      }
      return;
    }
    toCheckpoint();
    return;
  }

  // Time trial: gates must be crossed in order, along their facing direction
  if(p.runStarted){
    p.runTime+=dt;
    if(ghostRecorder)GhostSystem.recordSample(ghostRecorder,p.runTime,p);
  }
  if(course&&crossedGate(course[p.gate],p))passGate();
}


