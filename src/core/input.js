// Keybind resolution, pointer-lock state, mouse/keyboard/wheel listeners, and firing input.
// ---------- input ----------
function getSettings(){
  if(window.activeSettings)return window.activeSettings;
  return window.VelocitySettings?VelocitySettings.DEFAULT_SETTINGS:{sensitivity:1,invertY:false,baseFov:85,keybinds:{forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',slide:'ShiftLeft',grapple:'KeyE',burst:'KeyQ',restart:'KeyR',checkpoint:'KeyT',ghost:'KeyG',inspect:'KeyF',fire:'Mouse0',altFire:'Mouse2',reload:'KeyC',slotRifle:'Digit1',slotAwp:'Digit2',slotDeagle:'Digit3',slotKnife:'Digit4'}};
}
const mobileHeldActions={fire:false,altFire:false,jump:false,slide:false};
function isActionDown(action){
  if(mobileHeldActions[action])return true;
  const tok=getSettings().keybinds[action];
  return !!(tok&&keys[tok]);
}
function isActivePlay(){
  return locked||(typeof inLevel!=='undefined'&&inLevel&&overlay.style.display==='none');
}
function clearHeldInputs(){
  for(const k in keys)keys[k]=false;
  for(const k in mobileHeldActions)mobileHeldActions[k]=false;
  window.isScoreboardHeld=false;
  if(window.MobileControls&&typeof window.MobileControls.clearAllInputs==='function'){
    window.MobileControls.clearAllInputs();
  }
  if(window.CombatSystem){
    window.CombatSystem.setAdsHeld(false);
    if(typeof window.CombatSystem.setChargeHeld==='function')window.CombatSystem.setChargeHeld(false);
    if(typeof window.CombatSystem.setKatanaDeflectHeld==='function')window.CombatSystem.setKatanaDeflectHeld(false);
    if(typeof window.CombatSystem.setMinigunHeld==='function')window.CombatSystem.setMinigunHeld(false);
  }
}
window.applyMobileLookDelta=function(dx,dy,touchSens){
  if(!isActivePlay()||window.isRebindingInput)return;
  if(typeof isMatchOverVoting==='function'&&isMatchOverVoting())return;
  const s=getSettings();
  const scopeMul=window.CombatSystem?window.CombatSystem.getScopeSensMultiplier():1;
  const delta=window.MobileControls&&typeof window.MobileControls.computeLookDelta==='function'
    ?window.MobileControls.computeLookDelta(dx,dy,touchSens,scopeMul,s.invertY)
    :{dYaw:-dx*0.0046*scopeMul,dPitch:-dy*0.0046*scopeMul*(s.invertY?-1:1)};
  player.yaw+=delta.dYaw;
  player.pitch=clamp(player.pitch+delta.dPitch,-1.48,1.48);
  if(window.ViewmodelSystem)window.ViewmodelSystem.addLookDelta(dx*1.15,dy*1.15);
};
window.setMobileActionState=function(action,isDown){
  if(!isActivePlay())return;
  const down=Boolean(isDown);
  mobileHeldActions[action]=down;
  const kb=getSettings().keybinds;
  if(action==='jump'){
    if(down)jumpBuffer=CFG.jumpBuffer;
    return;
  }
  if(action==='fire'){
    if(down){
      triggerBoundToken(kb.fire,false);
    }else if(window.CombatSystem){
      if(typeof window.CombatSystem.setChargeHeld==='function')window.CombatSystem.setChargeHeld(false);
      if(typeof window.CombatSystem.setMinigunHeld==='function')window.CombatSystem.setMinigunHeld(false);
    }
    return;
  }
  if(action==='altFire'){
    if(down){
      triggerBoundToken(kb.altFire,false);
    }else if(window.CombatSystem){
      window.CombatSystem.setAdsHeld(false);
      if(typeof window.CombatSystem.setKatanaDeflectHeld==='function')window.CombatSystem.setKatanaDeflectHeld(false);
    }
  }
};
window.triggerMobileAction=function(action){
  if(!isActivePlay())return;
  const kb=getSettings().keybinds;
  if(action==='pause'){document.exitPointerLock?.();onUnlock(true);return;}
  if(action==='reload'){triggerBoundToken(kb.reload,false);return;}
  if(action==='grapple'){triggerBoundToken(kb.grapple,false);return;}
  if(action==='burst'){triggerBoundToken(kb.burst,false);return;}
  if(action==='inspect'){triggerBoundToken(kb.inspect,false);return;}
  if(action==='checkpoint'){triggerBoundToken(kb.checkpoint,false);return;}
  if(action==='scorestreak'){tryActivateScorestreakInput();return;}
  if(action==='scopeZoom'&&window.CombatSystem){window.CombatSystem.cycleScopeZoom();return;}
  if(action==='slot_primary'&&window.CombatSystem){window.CombatSystem.switchSlot('primary');return;}
  if(action==='slot_secondary'&&window.CombatSystem){window.CombatSystem.switchSlot('secondary');return;}
  if(action==='slot_melee'&&window.CombatSystem){window.CombatSystem.switchSlot('melee');return;}
};
function isArenaBlocked(){
  if(!window.NetcodeSystem)return false;
  const ns=window.NetcodeSystem.getState();
  return ns.isArena&&(ns.freezeTimer>0||!ns.localAlive||ns.phase==='match_over');
}
function performFire(heavy,extraOpts){
  if(!window.CombatSystem||!isActivePlay()||isArenaBlocked())return null;
  const p=player;
  const cp=Math.cos(p.pitch);
  const dir=V3(-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp);
  const origin=V3(p.pos.x,p.pos.y+p.eye,p.pos.z);
  const res=window.CombatSystem.tryFire(origin,dir,{
    heavy:!!heavy,
    fanFire:!!(extraOpts&&extraOpts.fanFire),
    isBurstFollowup:!!(extraOpts&&extraOpts.isBurstFollowup),
    moveSpeed:Math.hypot(p.vel.x,p.vel.z),
    airborne:!p.grounded,
    isSurfing:p.surfing||p.surfGrace>0.04,
    solidMeshes
  });
  if(res&&res.fired){
    if(res.recoilPitch)p.pitch=clamp(p.pitch+res.recoilPitch,-1.48,1.48);
    if(res.recoilYaw)p.yaw+=res.recoilYaw;
    // Heavy Shotgun, Revolver & Railcannon physics kickback (works even while grounded!)
    if(res.kickbackForce>0){
      p.vel.addScaledVector(dir,-res.kickbackForce);
      if(p.grounded&&res.kickbackGroundLift>0){
        p.vel.y=Math.max(p.vel.y,res.kickbackGroundLift);
        p.grounded=false;
        p.noGround=0.08;
      }
    }
    if(window.NetcodeSystem)window.NetcodeSystem.reportShot(res);
    if(res.hitKind==='range_reset')showToast('SHOOTING RANGE RESET');
  }
  return res;
}
function tryActivateScorestreakInput(){
  if(!window.CombatSystem||isArenaBlocked())return false;
  const ns=window.NetcodeSystem?window.NetcodeSystem.getState():null;
  const owner=(ns&&ns.localName)||(window.activeSettings&&window.activeSettings.displayName)||'RUNNER';
  const res=window.CombatSystem.activateScorestreak(owner);
  if(res&&res.activated){
    if(res.type==='nuke'){
      showToast('TACTICAL NUKE INBOUND — 5.0S');
    }else if(res.def){
      showToast(`SCORESTREAK · ${res.def.name.toUpperCase()}`);
    }
    return true;
  }
  if(res&&res.needed>0){
    showToast(`SCORESTREAK NEEDS ${res.needed} MORE PTS`);
  }
  return false;
}
function triggerBoundToken(token,repeat){
  const kb=getSettings().keybinds;
  if(token===kb.jump)jumpBuffer=CFG.jumpBuffer;
  if(!isActivePlay())return;
  if(token===kb.grapple&&!repeat)toggleGrapple();
  if(token===kb.restart&&!repeat){
    const ns=window.NetcodeSystem?window.NetcodeSystem.getState():null;
    if(!ns||!ns.isOnline)resetPlayer();
  }
  if(token===kb.checkpoint&&!repeat){
    const ns=window.NetcodeSystem?window.NetcodeSystem.getState():null;
    if(!ns||!ns.isOnline)toCheckpoint();
  }
  if(token===kb.burst&&!repeat&&!isArenaBlocked()){
    if(window.CombatSystem&&typeof window.CombatSystem.isKatanaEquipped==='function'&&window.CombatSystem.isKatanaEquipped()){
      const p=player;
      const cp=Math.cos(p.pitch);
      const dir=V3(-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp);
      const origin=V3(p.pos.x,p.pos.y+p.eye,p.pos.z);
      const dashRes=window.CombatSystem.tryKatanaDash(origin,dir,p,solidMeshes);
      if(dashRes&&dashRes.dashed){
        if(dashRes.hitResults&&window.NetcodeSystem){
          for(const h of dashRes.hitResults)window.NetcodeSystem.reportShot(h);
        }
        showToast(dashRes.killedAny?'SLASH-DASH KILL · RESET!':'KATANA SLASH-DASH');
      }else if(dashRes&&dashRes.onCooldown){
        showToast(`DASH READY IN ${dashRes.remaining.toFixed(1)}S`);
      }
    }else{
      burst();
    }
  }
  if(token==='Digit5'&&!repeat){
    tryActivateScorestreakInput();
  }
  if(token===kb.ghost&&!repeat){
    const cst=window.CombatSystem?window.CombatSystem.getState():null;
    if(!course&&cst&&cst.scorestreak&&cst.scorestreak.ready){
      tryActivateScorestreakInput();
    }else{
      toggleGhostMode();
    }
  }
  if(token===kb.slotRifle&&!repeat&&window.CombatSystem)window.CombatSystem.switchSlot('primary');
  if(token===kb.slotAwp&&!repeat&&window.CombatSystem)window.CombatSystem.switchSlot('secondary');
  if(token===kb.slotDeagle&&!repeat&&window.CombatSystem)window.CombatSystem.switchSlot('melee');
  if(token===kb.slotKnife&&!repeat&&window.CombatSystem)window.CombatSystem.quickSwitch();
  if(token===kb.reload&&!repeat&&window.CombatSystem)window.CombatSystem.startReload();
  if(token===kb.fire&&!repeat){
    const st=window.CombatSystem?window.CombatSystem.getState():null;
    if(st&&st.isScorestreak&&st.weaponId==='minigun'&&typeof window.CombatSystem.setMinigunHeld==='function'){
      if(!isArenaBlocked())window.CombatSystem.setMinigunHeld(true);
    }else if(st&&st.chargeTimeSec>0&&typeof window.CombatSystem.setChargeHeld==='function'){
      if(!isArenaBlocked())window.CombatSystem.setChargeHeld(true);
    }else{
      performFire(false);
    }
  }
  if(token===kb.altFire&&!repeat&&window.CombatSystem){
    const st=window.CombatSystem.getState();
    if(st.isKatana&&typeof window.CombatSystem.setKatanaDeflectHeld==='function'){
      if(!isArenaBlocked()){
        if(st.katana&&!st.katana.deflectCanEngage){
          showToast('DEFLECT RECHARGING');
        }
        window.CombatSystem.setKatanaDeflectHeld(true);
      }
    }else if(st.activeSlot==='melee')performFire(true);
    else if(st.altFireMode==='fan')performFire(false,{fanFire:true});
    else window.CombatSystem.setAdsHeld(true);
  }
  if(token===kb.inspect&&!repeat&&window.ViewmodelSystem){
    const res=window.ViewmodelSystem.triggerInspect();
    if(res&&res.tier==='mythic'&&!res.continued){
      const label=res.mythicName?`★ MYTHIC INSPECT · ${res.mythicName.toUpperCase()}`:'★ 1/100 MYTHIC INSPECT';
      message(label,{mythic:true,duration:2400});
      showToast('1/100 MYTHIC INSPECT!');
    }
  }
}

document.addEventListener('pointerlockchange',()=>{
  const wasLocked=locked;
  locked=document.pointerLockElement===renderer.domElement;
  if(!locked){clearHeldInputs();if(wasLocked)onUnlock(false);}
});
document.addEventListener('mousemove',e=>{
  if(!locked||window.isRebindingInput)return;
  const s=getSettings();
  const scopeMul=window.CombatSystem?window.CombatSystem.getScopeSensMultiplier():1;
  const sens=0.0022*s.sensitivity*scopeMul;
  const ySign=s.invertY?-1:1;
  player.yaw-=e.movementX*sens;
  player.pitch=clamp(player.pitch-e.movementY*sens*ySign,-1.48,1.48);
  if(window.ViewmodelSystem)window.ViewmodelSystem.addLookDelta(e.movementX,e.movementY);
});
document.addEventListener('keydown',e=>{
  if(window.isRebindingInput)return;
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
  const activePlay=isActivePlay();
  if(e.code==='Escape'&&activePlay){document.exitPointerLock?.();onUnlock(true);return;}
  if(e.code==='Tab'&&activePlay){e.preventDefault();window.isScoreboardHeld=true;return;}
  keys[e.code]=true;
  const kb=getSettings().keybinds;
  if(e.code===kb.jump||e.code==='Space'){if(activePlay)e.preventDefault();}
  triggerBoundToken(e.code,e.repeat);
});
document.addEventListener('keyup',e=>{
  if(e.code==='Tab'){window.isScoreboardHeld=false;}
  keys[e.code]=false;
  const kb=getSettings().keybinds;
  if(e.code===kb.altFire&&window.CombatSystem){
    window.CombatSystem.setAdsHeld(false);
    if(typeof window.CombatSystem.setKatanaDeflectHeld==='function')window.CombatSystem.setKatanaDeflectHeld(false);
  }
  if(e.code===kb.fire&&window.CombatSystem){
    if(typeof window.CombatSystem.setChargeHeld==='function')window.CombatSystem.setChargeHeld(false);
    if(typeof window.CombatSystem.setMinigunHeld==='function')window.CombatSystem.setMinigunHeld(false);
  }
});
// Mouse events report each button independently, including when multiple
// buttons are held together (e.g. RMB aim + LMB fire).
document.addEventListener('mousedown',e=>{
  if(window.isRebindingInput||!isActivePlay())return;
  if(window.MobileControls&&typeof window.MobileControls.wasRecentTouch==='function'&&window.MobileControls.wasRecentTouch(500))return;
  if(e.target&&e.target.closest&&e.target.closest('#arenaScoreboard,#mobileControls,#hudSlotStrip,#hudScorestreak,#devDrawer,#devFloatingToggle'))return;
  const voting=typeof isMatchOverVoting==='function'&&isMatchOverVoting();
  if(voting)return;
  const touchMode=window.MobileControls&&typeof window.MobileControls.isTouchModeEnabled==='function'&&window.MobileControls.isTouchModeEnabled();
  if(!locked&&!touchMode&&e.target===renderer.domElement&&typeof inLevel!=='undefined'&&inLevel&&overlay.style.display==='none'){
    try{
      const res=renderer.domElement.requestPointerLock?.();
      if(res&&typeof res.catch==='function')res.catch(()=>{});
    }catch(_){}
  }
  if(touchMode)return;
  const tok=window.VelocitySettings?VelocitySettings.mouseButtonToToken(e.button):('Mouse'+e.button);
  if(!tok)return;
  keys[tok]=true;
  if(e.button===1||e.button===2||e.button===3||e.button===4)e.preventDefault();
  triggerBoundToken(tok,false);
});
document.addEventListener('mouseup',e=>{
  const tok=window.VelocitySettings?VelocitySettings.mouseButtonToToken(e.button):('Mouse'+e.button);
  if(tok){
    keys[tok]=false;
    const kb=getSettings().keybinds;
    if(tok===kb.altFire&&window.CombatSystem){
      window.CombatSystem.setAdsHeld(false);
      if(typeof window.CombatSystem.setKatanaDeflectHeld==='function')window.CombatSystem.setKatanaDeflectHeld(false);
    }
    if(tok===kb.fire&&window.CombatSystem){
      if(typeof window.CombatSystem.setChargeHeld==='function')window.CombatSystem.setChargeHeld(false);
      if(typeof window.CombatSystem.setMinigunHeld==='function')window.CombatSystem.setMinigunHeld(false);
    }
  }
});
document.addEventListener('wheel',e=>{
  if(window.isRebindingInput||!isActivePlay()||!window.CombatSystem)return;
  if(Math.abs(e.deltaY)<4)return;
  const st=window.CombatSystem.getState();
  if(st.adsHeld&&st.activeBuild&&st.activeBuild.adsZoomAlt){
    window.CombatSystem.cycleScopeZoom();
    return;
  }
  window.CombatSystem.cycleSlot(e.deltaY>0?1:-1);
},{passive:true});
renderer.domElement.addEventListener('contextmenu',e=>{
  if(isActivePlay())e.preventDefault();
});
addEventListener('blur',clearHeldInputs);

