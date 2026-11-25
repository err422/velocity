// Main Menu / Pause Menu orchestration, global DOM event bindings, and startup bootstrap.
let unsubMenuLobbies=null;
function stopMenuLobbySubscription(){
  if(unsubMenuLobbies){
    try{unsubMenuLobbies();}catch(_){}
    unsubMenuLobbies=null;
  }
}
function refreshMenuLiveArenaStat(){
  const el=$('menuLiveArenaStat');
  if(!el)return;
  stopMenuLobbySubscription();
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified||!window.DailyBackend||typeof window.DailyBackend.subscribePublicLobbies!=='function'){
    el.textContent='Host or Join Match';
    return;
  }
  el.textContent='Checking Lobbies...';
  unsubMenuLobbies=window.DailyBackend.subscribePublicLobbies((list)=>{
    const count=Array.isArray(list)?list.length:0;
    el.textContent=count>0?`${count} Live ${count===1?'Lobby':'Lobbies'} Open`:'Host or Join Match';
  });
}

function showMenu(){
  pauseWorldViewActive=false;
  pauseViewBlend=0;
  firingRangeReturnContext=null;
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  bulkSellMode=false;
  bulkSelectedIds.clear();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  CombatSystem.clearScope();
  if(typeof CombatSystem.setChargeHeld==='function')CombatSystem.setChargeHeld(false);
  const revRing=$('revolverChargeRing');
  if(revRing){revRing.style.opacity='0';revRing.classList.remove('primed');}
  inLevel=false;
  pendingLoadoutApply=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','browser-wide','studio-full');
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
  refreshMenuLiveArenaStat();
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
  if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
  CombatSystem.clearScope();
  pauseWorldViewActive=true;
  pauseViewBlend=0;
  pauseStartCameraPosition.copy(camera.position);
  pauseStartCameraQuaternion.copy(camera.quaternion);
  overlay.style.display='grid';
  overlay.scrollTop=0;
  overlayCard.classList.remove('wide','browser-wide','studio-full');
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
  renderBotDifficultyUi();
  renderArenaHudStatic();
  document.body.dataset.state='paused';
}

function isMatchOverVoting(){
  const ns=window.NetcodeSystem?window.NetcodeSystem.getState():null;
  return Boolean(ns&&ns.isArena&&ns.phase==='match_over');
}

function enter(){
  pauseWorldViewActive=false;
  pauseViewBlend=0;
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  stopMenuLobbySubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
  overlay.style.display='none';
  overlayCard.classList.remove('wide','browser-wide','studio-full');
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
  if(isMatchOverVoting()){
    if(document.pointerLockElement===renderer.domElement){
      document.exitPointerLock?.();
    }
  }else{
    try{
      const res=renderer.domElement.requestPointerLock?.();
      if(res&&typeof res.catch==='function')res.catch(()=>{});
    }catch(_){}
  }
}

function onUnlock(fromEsc){
  if(!inLevel||overlay.style.display!=='none')return;
  if(!fromEsc&&isMatchOverVoting())return;
  showPause();
}

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
  onRemoteTracer:(m)=>CombatSystem.spawnTracer(V3(m.sx,m.sy,m.sz),V3(m.ex,m.ey,m.ez),m.slot==='awp'?0x7ef2ff:m.slot==='revolver'?0xffd27a:0xffa065),
  onLocalKill:(info)=>{
    const hs=Boolean(info&&(info.isHeadshot||info.headshot));
    const rawWep=(info&&(info.weaponId||info.slot))||CombatSystem.getActiveWeaponType();
    const killWep=(rawWep==='primary'||rawWep==='secondary')?CombatSystem.getActiveWeaponType():rawWep;
    const isFirearm=Boolean(LoadoutsSystem.WEAPON_SPECS[killWep]);
    if(info&&info.victimIsBot){
      const baseXp=hs?LoadoutsSystem.XP_REWARDS.botHeadshot:LoadoutsSystem.XP_REWARDS.botKill;
      const xpGain=(window.BotAISystem&&typeof window.BotAISystem.computeBotXpReward==='function')
        ?window.BotAISystem.computeBotXpReward(baseXp)
        :baseXp;
      if(isFirearm){
        grantWeaponXp(killWep,xpGain);
        showToast(`${hs?'HEADSHOT':'BOT ELIMINATION'} · +${xpGain} GUN XP`);
      }else{
        showToast('BOT ELIMINATION');
      }
      return;
    }
    const res=KnivesSystem.grantArenaKillCoins(window.activeInventory,{headshot:hs});
    window.activeInventory=res.inventory;
    persistInventorySummary(true);
    CaseAudio.coinChime('earn');
    const xpGain=hs?LoadoutsSystem.XP_REWARDS.arenaHeadshot:LoadoutsSystem.XP_REWARDS.arenaKill;
    if(isFirearm)grantWeaponXp(killWep,xpGain);
    showToast(isFirearm
      ?`${hs?'HEADSHOT':'ELIMINATION'} · +${fmtCoins(res.coinsEarned)}C · +${xpGain} XP`
      :`${hs?'HEADSHOT':'ELIMINATION'} · +${fmtCoins(res.coinsEarned)}C`);
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
    if(document.pointerLockElement===renderer.domElement){
      document.exitPointerLock?.();
    }
  },
  onMapChange:(mapId)=>{
    const targetId=(typeof ArenaCatalog!=='undefined')?ArenaCatalog.normalizeArenaId(mapId,'arena_surf'):(mapId||'arena_surf');
    const arenaName=(typeof ArenaCatalog!=='undefined')?ArenaCatalog.getArenaName(targetId).toUpperCase():targetId.toUpperCase();
    lastScoreboardTableSig='';
    lastVoteRenderSig='';
    loadLevel(targetId,{keepSession:true});
    inLevel=true;
    enter();
    showToast(`NEXT ARENA · ${arenaName}`);
  }
});
CombatSystem.setOnWarmupKill((info)=>{
  NetcodeSystem.pushWarmupKill(info.botName,info.weaponId||info.slot,info.isHeadshot);
  renderArenaHudStatic();
});
CombatSystem.setOnWeaponXp((info)=>{
  const xpGain=Number(info&&(info.xp??info.amount))||0;
  if(info&&info.weaponId&&xpGain>0){
    grantWeaponXp(info.weaponId,xpGain);
    if(info.source==='bot_kill'||info.source==='bot_headshot'){
      showToast(`${info.isHeadshot?'HEADSHOT':'BOT ELIMINATION'} · +${xpGain} GUN XP`);
    }
  }
});

function renderBotDifficultyUi(){
  const BAI=window.BotAISystem;
  if(!BAI||!Array.isArray(BAI.DIFFICULTY_LEVELS))return;
  const activeMode=typeof BAI.getDifficulty==='function'?BAI.getDifficulty():'adaptive';
  const skill=typeof BAI.getActiveSkill==='function'?BAI.getActiveSkill():{label:'ADAPTIVE',desc:'Auto-scales to your K/D',xpMult:1.5};
  const bodyXp=typeof BAI.computeBotXpReward==='function'?BAI.computeBotXpReward(LoadoutsSystem.XP_REWARDS.botKill):LoadoutsSystem.XP_REWARDS.botKill;
  const headXp=typeof BAI.computeBotXpReward==='function'?BAI.computeBotXpReward(LoadoutsSystem.XP_REWARDS.botHeadshot):LoadoutsSystem.XP_REWARDS.botHeadshot;
  const metaText=`${skill.label} · +${bodyXp}/+${headXp} XP`;

  const srvMeta=$('srvBotDiffMeta');
  if(srvMeta)srvMeta.textContent=metaText;
  const srvDesc=$('srvBotDiffDesc');
  if(srvDesc)srvDesc.textContent=`${skill.desc} · applies to Warmup, Sandbox & Arena Bot Fill`;
  const pauseSummary=$('pauseBotDiffSummary');
  if(pauseSummary)pauseSummary.textContent=metaText;

  const renderStrip=(container,isPause)=>{
    if(!container)return;
    container.textContent='';
    for(const lvl of BAI.DIFFICULTY_LEVELS){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className=(isPause?'ld-quick-btn':'bot-diff-btn')+(lvl.id===activeMode?' active':'');
      btn.setAttribute('role','radio');
      btn.setAttribute('aria-checked',lvl.id===activeMode?'true':'false');
      btn.textContent=isPause?lvl.shortLabel:lvl.label;
      btn.onclick=()=>{
        BAI.setDifficulty(lvl.id);
        renderBotDifficultyUi();
        renderArenaHudStatic();
        const nextBody=BAI.computeBotXpReward(LoadoutsSystem.XP_REWARDS.botKill);
        const nextHead=BAI.computeBotXpReward(LoadoutsSystem.XP_REWARDS.botHeadshot);
        showToast(`BOT DIFFICULTY: ${lvl.label} · +${nextBody}/+${nextHead} GUN XP`);
      };
      container.appendChild(btn);
    }
  };
  renderStrip($('srvBotDiffStrip'),false);
  renderStrip($('pauseBotDiffStrip'),true);
}
renderBotDifficultyUi();

// Event bindings
if($('openLoadoutsBtn'))$('openLoadoutsBtn').onclick=()=>{stopMenuLobbySubscription();openLoadoutsPanel('menu');};
if($('pauseLoadouts'))$('pauseLoadouts').onclick=()=>openLoadoutsPanel('pause');
if(pauseReturnStudioBtn){
  pauseReturnStudioBtn.onclick=()=>{
    const ctx=firingRangeReturnContext;
    if(!ctx)return;
    window.activeLoadouts.activeIndex=ctx.loadoutIdx||0;
    openLoadoutsPanel('pause',ctx.screen==='gunsmith'?ctx.slotCategory:null);
  };
}
if(loadoutsBackBtn)loadoutsBackBtn.onclick=closeLoadoutsPanel;
if(loadoutsBackIconBtn)loadoutsBackIconBtn.onclick=closeLoadoutsPanel;
if(loadoutsArmoryBtn)loadoutsArmoryBtn.onclick=()=>openArmory(loadoutsReturnTarget,'inventory');
if(ldFiringRangeBtn)ldFiringRangeBtn.onclick=launchFiringRangeFromStudio;
if(gsFiringRangeBtn)gsFiringRangeBtn.onclick=launchFiringRangeFromStudio;
if(gsArmoryBtn)gsArmoryBtn.onclick=()=>openArmory(loadoutsReturnTarget,'inventory');
if(gsOpenCasesBtn)gsOpenCasesBtn.onclick=()=>openArmory(loadoutsReturnTarget,'cases');
if(gsDrawerCloseBtn){
  gsDrawerCloseBtn.onclick=()=>{
    gunsmithDrawerSlot=null;
    renderGunsmith();
  };
}
document.querySelectorAll('[data-gs-tab]').forEach(btn=>{
  btn.onclick=()=>{
    gunsmithTab=btn.dataset.gsTab||'gunsmith';
    if(gunsmithTab!=='gunsmith')gunsmithDrawerSlot=null;
    renderGunsmith();
  };
});
if(loadoutNameInput){
  loadoutNameInput.addEventListener('input',()=>{
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    next.loadouts[selectedLoadoutIdx].name=LoadoutsSystem.sanitizeLoadoutName(loadoutNameInput.value,`Loadout ${selectedLoadoutIdx+1}`);
    commitLoadoutsState(next,{skipApply:true,silentToast:true});
    const minis=loadoutsRailEl?loadoutsRailEl.querySelectorAll('.cod-num-mini'):[];
    if(minis[selectedLoadoutIdx])minis[selectedLoadoutIdx].textContent=next.loadouts[selectedLoadoutIdx].name;
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
  if(loadoutsPanelEl&&loadoutsPanelEl.style.display!=='none'){
    const tag=document.activeElement?document.activeElement.tagName:'';
    const typing=tag==='INPUT'||tag==='TEXTAREA';
    if(e.code==='Escape'){
      e.preventDefault();
      if(gunsmithMode&&gunsmithDrawerSlot){
        gunsmithDrawerSlot=null;
        renderGunsmith();
      }else if(gunsmithMode){
        renderLoadoutsOverview();
      }else{
        closeLoadoutsPanel();
      }
      return;
    }
    if(!typing&&e.code==='Digit1'){
      e.preventDefault();
      launchFiringRangeFromStudio();
      return;
    }
  }
  if(armoryPanelEl&&armoryPanelEl.style.display!=='none'&&e.code==='Escape'){
    if(sellConfirmModal&&sellConfirmModal.style.display!=='none')return;
    e.preventDefault();
    closeArmory();
  }
});
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{stopMenuLobbySubscription();loadLevel(b.dataset.level);inLevel=true;enter();});
if($('openSurfBrowserBtn'))$('openSurfBrowserBtn').onclick=()=>{stopMenuLobbySubscription();openCourseBrowser('surf',null,'menu');};
if($('openTimeTrialBrowserBtn'))$('openTimeTrialBrowserBtn').onclick=()=>{stopMenuLobbySubscription();openCourseBrowser('timetrial',null,'menu');};
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
$('playTodayBtn').onclick=()=>{stopMenuLobbySubscription();loadDailyCourse(DailyCourseGen.getTodayDateKey());inLevel=true;enter();};
$('openServersBtn').onclick=()=>{stopMenuLobbySubscription();openServersPanel('menu');};
if($('menuNavArenasBtn'))$('menuNavArenasBtn').onclick=()=>{stopMenuLobbySubscription();openServersPanel('menu');};
if($('menuNavLoadoutsBtn'))$('menuNavLoadoutsBtn').onclick=()=>{stopMenuLobbySubscription();openLoadoutsPanel('menu');};
if($('menuNavCoursesBtn'))$('menuNavCoursesBtn').onclick=()=>{stopMenuLobbySubscription();openCourseBrowser('surf',null,'menu');};
document.querySelectorAll('[data-quick-arena]').forEach(btn=>{
  btn.onclick=()=>{
    stopMenuLobbySubscription();
    launchSoloArenaWarmup(btn.dataset.quickArena);
  };
});
async function handleMenuQuickCodeJoin(){
  const input=$('menuQuickCodeInput');
  const raw=((input&&input.value)||'').trim().toUpperCase();
  if(raw.length!==4){
    showToast('ENTER A 4-LETTER ROOM CODE');
    return;
  }
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified){
    showToast('SIGN IN WITH GOOGLE TO JOIN PVP ROOMS');
    return;
  }
  try{
    showToast(`LOOKING UP ROOM ${raw}...`);
    const lobby=await NetcodeSystem.joinByCode(raw);
    stopMenuLobbySubscription();
    stopServersSubscription();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'ROOM CODE NOT FOUND');
  }
}
if($('menuQuickCodeBtn'))$('menuQuickCodeBtn').onclick=handleMenuQuickCodeJoin;
if($('menuQuickCodeInput'))$('menuQuickCodeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleMenuQuickCodeJoin();}});
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
if(warmupSelectedBtn)warmupSelectedBtn.onclick=()=>launchSoloArenaWarmup(hostSelectedMap);
if(srvModeOrbitBtn)srvModeOrbitBtn.onclick=()=>{if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.setMode('orbit');};
if(srvModeFlyBtn)srvModeFlyBtn.onclick=()=>{if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.setMode('flythrough');};
if($('warmupSurfBtn'))$('warmupSurfBtn').onclick=()=>launchSoloArenaWarmup('arena_surf');
if($('warmupAimBtn'))$('warmupAimBtn').onclick=()=>launchSoloArenaWarmup('arena_aim');
$('pauseLeaveServer').onclick=()=>{NetcodeSystem.leaveSession();showMenu();};
const pauseSandboxBotsBtnEl=$('pauseSandboxBots');
if(pauseSandboxBotsBtnEl){
  pauseSandboxBotsBtnEl.onclick=()=>{
    if(!level||level.id!=='sandbox')return;
    const active=CombatSystem&&typeof CombatSystem.hasActiveWarmupBots==='function'&&CombatSystem.hasActiveWarmupBots();
    if(active){
      CombatSystem.clearWarmupBots();
      if(NetcodeSystem.getState().role==='warmup')NetcodeSystem.leaveSession(true);
      renderArenaHudStatic();
      showToast('SANDBOX BOTS REMOVED');
      enter();
    }else{
      const spawns=Array.isArray(level.botSpawns)&&level.botSpawns.length?level.botSpawns:[{x:0,y:0.05,z:-83,yaw:Math.PI},{x:0,y:6.05,z:0,yaw:0},{x:27,y:9.05,z:-36,yaw:0.8},{x:-26,y:6.05,z:36,yaw:-2.4}];
      NetcodeSystem.setArenaSpawns(spawns);
      NetcodeSystem.startSoloWarmup('sandbox','ffa_4p');
      CombatSystem.setupWarmupBots(spawns,3);
      CombatSystem.setWarmupBotsVisible(true);
      CombatSystem.switchSlot('primary');
      renderArenaHudStatic();
      showToast('ADAPTIVE AI BOTS DEPLOYED');
      enter();
    }
  };
}
$('sbRematchBtn').onclick=()=>{NetcodeSystem.requestRematch();enter();};
$('sbLeaveBtn').onclick=()=>{NetcodeSystem.leaveSession();showMenu();};

$('openArchiveBtn').onclick=()=>{stopMenuLobbySubscription();openDailyHub(DailyCourseGen.getTodayDateKey());};
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
menuArmoryBtn.onclick=()=>{stopMenuLobbySubscription();openArmory('menu','cases');};
$('pauseArmory').onclick=()=>openArmory('pause','cases');
armoryBackBtn.onclick=closeArmory;
if(armoryBackIconBtn)armoryBackIconBtn.onclick=closeArmory;
if(armoryLoadoutsBtn)armoryLoadoutsBtn.onclick=()=>openLoadoutsPanel(armoryReturnTarget);
document.querySelectorAll('[data-arm-tab]').forEach(btn=>{
  btn.onclick=()=>setArmoryTab(btn.dataset.armTab);
});
openCaseBtn.onclick=()=>startCaseUnboxing(selectedCaseId);
if(buyCaseBtn)buyCaseBtn.onclick=()=>buyCaseOnly(selectedCaseId);
if(bulkCaseQuantityInput){
  bulkCaseQuantityInput.value=String(bulkCaseQuantity);
  bulkCaseQuantityInput.addEventListener('input',()=>{
    const next=Number(bulkCaseQuantityInput.value);
    bulkCaseQuantity=Number.isSafeInteger(next)?next:0;
    updateBulkCaseBuyUI();
  });
}
document.querySelectorAll('[data-case-qty]').forEach(btn=>{
  btn.onclick=()=>{
    bulkCaseQuantity=Number(btn.dataset.caseQty)||1;
    if(bulkCaseQuantityInput)bulkCaseQuantityInput.value=String(bulkCaseQuantity);
    updateBulkCaseBuyUI();
  };
});
if(bulkBuyCaseBtn)bulkBuyCaseBtn.onclick=()=>buyCasesInBulk(selectedCaseId);
if(bulkOpenQuantityInput){
  bulkOpenQuantityInput.value=String(bulkOpenQuantity);
  bulkOpenQuantityInput.addEventListener('input',()=>{
    const next=Number(bulkOpenQuantityInput.value);
    bulkOpenQuantity=Number.isSafeInteger(next)?next:0;
    updateBulkCaseOpenUI();
  });
}
document.querySelectorAll('[data-open-case-qty]').forEach(btn=>{
  btn.onclick=()=>{
    const owned=window.activeInventory.caseCounts[selectedCaseId]||0;
    bulkOpenQuantity=Math.min(Number(btn.dataset.openCaseQty)||1,Math.min(owned,100));
    if(bulkOpenQuantityInput)bulkOpenQuantityInput.value=String(bulkOpenQuantity);
    updateBulkCaseOpenUI();
  };
});
if(bulkOpenBtn)bulkOpenBtn.onclick=()=>openCasesInBulk(selectedCaseId);
if($('bulkDropKeepAllBtn'))$('bulkDropKeepAllBtn').onclick=()=>{
  bulkDropSellIds.clear();
  finishBulkCaseReview();
};
if($('bulkDropMarkAllSellBtn'))$('bulkDropMarkAllSellBtn').onclick=()=>{
  bulkDropSellIds.clear();
  for(const item of pendingBulkDrops){
    if(KnivesSystem.isItemSellable(window.activeInventory,item).sellable)bulkDropSellIds.add(item.id);
  }
  renderBulkCaseResults();
};
if(bulkResultsConfirmBtn)bulkResultsConfirmBtn.onclick=finishBulkCaseReview;
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

$('menuSettingsBtn').onclick=()=>{stopMenuLobbySubscription();openSettings('menu');};
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
    window.DailyBackend.onAuthChange((user)=>{
      renderAuthUI(user);
      if(menuEl&&menuEl.style.display!=='none')refreshMenuLiveArenaStat();
    });
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
    loadLevel('arena_surf');inLevel=true;enter();
  }
}else{
  loadLevel('arena_surf');
  showMenu();
}
if(isSoftwareGl)frame(performance.now());
else frameId=requestAnimationFrame(frame);

