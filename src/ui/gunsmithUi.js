// Loadouts Manager and 3D Gunsmith Workbench UI (attachments, stats, skins, XP progression).
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

function countWeaponUnlocks(weaponId,xp){
  const spec=LoadoutsSystem.getWeaponSpec(weaponId);
  let unlocked=0,total=0;
  for(const slotId of (spec.allowedSlots||[])){
    const opts=LoadoutsSystem.getSlotAttachmentsForWeapon(weaponId,slotId);
    for(const att of opts){
      total++;
      if(LoadoutsSystem.isAttachmentUnlocked(weaponId,slotId,att.id,xp))unlocked++;
    }
  }
  return {unlocked,total};
}

function buildPipsElement(equippedCount,hasApex,isPhase){
  const wrap=document.createElement('div');
  wrap.className='cod-pips';
  for(let i=0;i<LoadoutsSystem.MAX_ATTACHMENTS;i++){
    const pip=document.createElement('span');
    pip.className='cod-pip'+(i<equippedCount?' filled':'');
    wrap.appendChild(pip);
  }
  const plus=document.createElement('span');
  plus.className='cod-pip-plus';
  plus.textContent='+';
  const apex=document.createElement('span');
  apex.className='cod-pip-apex'+(hasApex?(isPhase?' phase':' filled'):'');
  apex.title=hasApex?'Apex Chrono Kit Equipped':'Apex Slot Empty';
  wrap.append(plus,apex);
  return wrap;
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
  gunsmithTab='gunsmith';
  gunsmithDrawerSlot=null;
  gunsmithHoverAttId=null;

  overlay.style.display='grid';
  overlayCard.classList.remove('wide','browser-wide');
  overlayCard.classList.add('studio-full');
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
  gunsmithDrawerSlot=null;
  gunsmithHoverAttId=null;
  if(loadoutsReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

function launchFiringRangeFromStudio(){
  firingRangeReturnContext={
    screen:gunsmithMode?'gunsmith':'loadouts',
    slotCategory:gunsmithSlotCategory,
    loadoutIdx:selectedLoadoutIdx
  };
  const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
  next.activeIndex=selectedLoadoutIdx;
  window.activeLoadouts=LoadoutsSystem.saveLocal(next);
  applyActiveLoadoutToRuntime({immediate:true});
  ArmoryPreview.stop();
  gunsmithDrawerSlot=null;
  gunsmithHoverAttId=null;

  loadLevel('sandbox');
  inLevel=true;
  // Teleport directly behind the Sandbox Firing Range firing line facing downrange (-X)
  player.pos.set(-19.5,0.05,-74);
  player.prev.set(-19.5,0.05,-74);
  player.vel.set(0,0,0);
  player.yaw=Math.PI/2;
  player.pitch=0;
  const targetSlot=firingRangeReturnContext.screen==='gunsmith'?firingRangeReturnContext.slotCategory:'primary';
  CombatSystem.switchSlot(targetSlot,true);
  ViewmodelSystem.triggerDraw();
  enter();
  const returnLabel=firingRangeReturnContext.screen==='gunsmith'?'GUNSMITH':'LOADOUTS';
  showToast(`FIRING RANGE · PRESS ESC TO RETURN TO ${returnLabel}`);
}

function renderLoadoutsOverview(){
  if(!loadoutsOverviewViewEl||!gunsmithViewEl)return;
  gunsmithMode=false;
  gunsmithDrawerSlot=null;
  gunsmithHoverAttId=null;
  loadoutsOverviewViewEl.style.display='';
  gunsmithViewEl.style.display='none';

  const st=window.activeLoadouts;
  const ld=st.loadouts[selectedLoadoutIdx]||st.loadouts[0];
  if(loadoutsEyebrowEl)loadoutsEyebrowEl.textContent=`CREATE A CLASS / SLOT 0${selectedLoadoutIdx+1}`;

  // Far-left COD vertical numbered rail (01..05)
  if(loadoutsRailEl){
    loadoutsRailEl.textContent='';
    st.loadouts.forEach((item,i)=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cod-num-btn'+(i===selectedLoadoutIdx?' active':'');
      btn.title=`${item.name} — ${formatLoadoutShortSummary(item)}`;
      const idx=document.createElement('div');
      idx.className='cod-num-idx';
      idx.textContent=`0${i+1}`;
      if(i===st.activeIndex){
        const star=document.createElement('span');
        star.className='cod-num-star';
        star.textContent='★';
        idx.appendChild(star);
      }
      const mini=document.createElement('div');
      mini.className='cod-num-mini';
      mini.textContent=item.name;
      btn.append(idx,mini);
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

  if(!loadoutsSlotsGridEl)return;
  loadoutsSlotsGridEl.textContent='';

  const buildFirearmSlotCard=(slotCategory)=>{
    const isPrimary=slotCategory==='primary';
    const entry=ld[slotCategory];
    const spec=LoadoutsSystem.getWeaponSpec(entry.weaponId);
    const build=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,entry.attachments);
    const xp=st.weaponXp[entry.weaponId]||0;
    const lvlInfo=LoadoutsSystem.getWeaponLevelInfo(xp);
    const unlocks=countWeaponUnlocks(entry.weaponId,xp);
    const skinItem=getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);
    const skinName=skinItem&&KnivesSystem.WEAPON_SKINS[skinItem.skinId]?KnivesSystem.WEAPON_SKINS[skinItem.skinId].name:'Factory Issue';

    const card=document.createElement('div');
    card.className='cod-slot-card clickable';
    card.onclick=()=>openGunsmith(slotCategory);

    const top=document.createElement('div');
    top.className='cod-slot-top';
    const lbl=document.createElement('span');
    lbl.className='cod-slot-label';
    lbl.textContent=isPrimary?'PRIMARY':'SECONDARY';
    top.append(lbl,buildPipsElement(build.attachmentCount,build.hasChronoKit,build.chronoTier>=2));

    const mid=document.createElement('div');
    mid.className='cod-slot-mid';
    const thumb=document.createElement('div');
    thumb.className='cod-slot-thumb';
    const img=document.createElement('img');
    img.alt=spec.name;
    img.src=getThumbForItem(skinItem);
    thumb.appendChild(img);

    const info=document.createElement('div');
    info.className='cod-slot-info';
    const cls=document.createElement('div');
    cls.className='cod-slot-class';
    cls.textContent=`${spec.classLabel} · ${skinName}`;
    const name=document.createElement('div');
    name.className='cod-slot-name';
    name.textContent=spec.name;
    const uRow=document.createElement('div');
    uRow.className='cod-slot-unlocks';
    uRow.innerHTML=`<span>LV. <b>${lvlInfo.level}</b> · ${unlocks.unlocked}/${unlocks.total} UNLOCKS</span><span class="cod-gs-link">GUNSMITH →</span>`;
    info.append(cls,name,uRow);
    mid.append(thumb,info);

    const pickers=document.createElement('div');
    pickers.className='cod-wep-row';
    const roster=isPrimary?LoadoutsSystem.PRIMARY_WEAPON_IDS:LoadoutsSystem.SECONDARY_WEAPON_IDS;
    for(const wid of roster){
      const ws=LoadoutsSystem.getWeaponSpec(wid);
      const wb=document.createElement('button');
      wb.type='button';
      wb.className='cod-wep-chip'+(wid===entry.weaponId?' active':'');
      wb.textContent=ws.shortName;
      wb.onclick=(ev)=>{
        ev.stopPropagation();
        const updated=LoadoutsSystem.setLoadoutWeapon(window.activeLoadouts,selectedLoadoutIdx,slotCategory,wid);
        commitLoadoutsState(updated,{silentToast:true});
        renderLoadoutsOverview();
      };
      pickers.appendChild(wb);
    }

    card.append(top,mid,pickers);
    return card;
  };

  const buildMeleeSlotCard=()=>{
    const knife=getMeleeKnifeForLoadout(ld);
    const kt=KnivesSystem.KNIFE_TYPES[knife.knifeType]||KnivesSystem.KNIFE_TYPES.default;
    const sk=KnivesSystem.SKINS[knife.skinId]||KnivesSystem.SKINS.vanilla;

    const card=document.createElement('div');
    card.className='cod-slot-card clickable';
    card.onclick=()=>{
      invCategory='knives';
      invFilterType='all';
      openArmory(loadoutsReturnTarget,'inventory');
    };

    const top=document.createElement('div');
    top.className='cod-slot-top';
    top.innerHTML='<span class="cod-slot-label">MELEE</span><span class="cod-slot-label" style="color:#6effa6">100% PURE SURF</span>';

    const mid=document.createElement('div');
    mid.className='cod-slot-mid';
    const thumb=document.createElement('div');
    thumb.className='cod-slot-thumb';
    const img=document.createElement('img');
    img.alt=kt.name;
    img.src=getThumbForItem(knife);
    thumb.appendChild(img);

    const info=document.createElement('div');
    info.className='cod-slot-info';
    const cls=document.createElement('div');
    cls.className='cod-slot-class';
    cls.textContent=`Knife · ${sk.name} (${knife.wearGrade})`;
    const name=document.createElement('div');
    name.className='cod-slot-name';
    name.textContent=kt.name;
    const uRow=document.createElement('div');
    uRow.className='cod-slot-unlocks';
    uRow.innerHTML='<span>0.35 KG · ZERO AIR PENALTY</span><span class="cod-gs-link">ARMORY →</span>';
    info.append(cls,name,uRow);
    mid.append(thumb,info);

    const pickers=document.createElement('div');
    pickers.className='cod-wep-row';
    const ownedKnives=(window.activeInventory.knives||[]).slice(0,5);
    for(const k of ownedKnives){
      const kb=document.createElement('button');
      kb.type='button';
      kb.className='cod-wep-chip'+(k.id===knife.id?' active':'');
      const kMeta=KnivesSystem.KNIFE_TYPES[k.knifeType]||KnivesSystem.KNIFE_TYPES.default;
      kb.textContent=kMeta.name.replace(' Knife','');
      kb.title=KnivesSystem.formatKnifeFullName(k);
      kb.onclick=(ev)=>{
        ev.stopPropagation();
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

    card.append(top,mid,pickers);
    return card;
  };

  const buildGlovesMobilityCard=()=>{
    const glove=KnivesSystem.getEquippedGlove(window.activeInventory);
    const gt=KnivesSystem.GLOVE_TYPES[glove.gloveType]||KnivesSystem.GLOVE_TYPES.sport;
    const gsk=KnivesSystem.GLOVE_SKINS[glove.skinId]||KnivesSystem.GLOVE_SKINS.carbon_weave;
    const primaryBuild=LoadoutsSystem.resolveWeaponBuild(ld.primary.weaponId,ld.primary.attachments);

    const card=document.createElement('div');
    card.className='cod-slot-card clickable';
    card.onclick=()=>{
      invCategory='gloves';
      invFilterType='all';
      openArmory(loadoutsReturnTarget,'inventory');
    };

    const top=document.createElement('div');
    top.className='cod-slot-top';
    top.innerHTML=`<span class="cod-slot-label">GLOVES &amp; MOBILITY</span><span class="cod-slot-label" style="color:#ffb84d">${gt.shortName.toUpperCase()} · ${gsk.name.toUpperCase()}</span>`;

    const mob=document.createElement('div');
    mob.className='cod-mob-grid';
    const surfPct=Math.round(primaryBuild.surfAirMult*100);
    mob.innerHTML=`
      <div class="cod-mob-cell"><div class="cod-mob-k">Surf Control</div><div class="cod-mob-v ${surfPct>=95?'good':''}">${surfPct}%</div></div>
      <div class="cod-mob-cell"><div class="cod-mob-k">Primary Weight</div><div class="cod-mob-v">${primaryBuild.weightKg.toFixed(1)} kg</div></div>
      <div class="cod-mob-cell"><div class="cod-mob-k">ADS Snap</div><div class="cod-mob-v">${Math.round(primaryBuild.adsTimeSec*1000)} ms</div></div>
    `;
    card.append(top,mob);
    return card;
  };

  loadoutsSlotsGridEl.appendChild(buildFirearmSlotCard('primary'));
  loadoutsSlotsGridEl.appendChild(buildFirearmSlotCard('secondary'));
  loadoutsSlotsGridEl.appendChild(buildMeleeSlotCard());
  loadoutsSlotsGridEl.appendChild(buildGlovesMobilityCard());

  // Update 3D Runner showcase on the right half holding the equipped Primary
  const pEntry=ld.primary;
  const pSpec=LoadoutsSystem.getWeaponSpec(pEntry.weaponId);
  const pBuild=LoadoutsSystem.resolveWeaponBuild(pEntry.weaponId,pEntry.attachments);
  const pSkin=getWeaponSkinForLoadoutEntry(pEntry.weaponId,pEntry.skinItemId);
  const pSkinName=pSkin&&KnivesSystem.WEAPON_SKINS[pSkin.skinId]?KnivesSystem.WEAPON_SKINS[pSkin.skinId].name:'Factory Issue';
  const activeGlove=KnivesSystem.getEquippedGlove(window.activeInventory);
  if(ldRunnerWeaponTitleEl)ldRunnerWeaponTitleEl.textContent=pSpec.name;
  if(ldRunnerMetaEl){
    const apexTag=pBuild.hasChronoKit?' + APEX':'';
    ldRunnerMetaEl.textContent=`${pBuild.attachmentCount}/5 ATTACHMENTS${apexTag} · ${pSkinName.toUpperCase()}`;
  }
  if(loadoutsRunnerCanvasEl){
    ArmoryPreview.showRunnerShowcase(loadoutsRunnerCanvasEl,pSkin,pEntry.attachments,activeGlove);
  }
}

function openGunsmith(slotCategory){
  gunsmithMode=true;
  gunsmithSlotCategory=slotCategory==='secondary'?'secondary':'primary';
  gunsmithTab='gunsmith';
  gunsmithDrawerSlot=null;
  gunsmithAttCategory='optic';
  gunsmithHoverAttId=null;
  renderGunsmith();
}

function getGunsmithEntry(){
  const ld=window.activeLoadouts.loadouts[selectedLoadoutIdx]||window.activeLoadouts.loadouts[0];
  return ld[gunsmithSlotCategory==='secondary'?'secondary':'primary'];
}

function updateGunsmith3DPreview(previewAttachments,focusSlotOverride,opts){
  if(!gunsmithCanvasEl||!gunsmithMode)return;
  const entry=getGunsmithEntry();
  const skinItem=getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);
  const atts=previewAttachments||entry.attachments;
  const focus=focusSlotOverride!==undefined
    ?focusSlotOverride
    :(gunsmithTab==='gunsmith'?(gunsmithDrawerSlot||'none'):'none');
  ArmoryPreview.showGunsmithWeapon(gunsmithCanvasEl,skinItem,atts,{
    focusSlot:focus,
    resetCamera:opts&&opts.resetCamera===false?false:true
  });
}

function renderGunsmithStats(currentBuild,previewBuild){
  if(!gsStatsBoxEl)return;
  const cmp=LoadoutsSystem.compareBuilds(currentBuild,previewBuild);
  if(gsAttPipsEl){
    gsAttPipsEl.textContent='';
    gsAttPipsEl.appendChild(buildPipsElement(previewBuild.attachmentCount,previewBuild.hasChronoKit,previewBuild.chronoTier>=2));
  }
  if(gsBudgetBadgeEl){
    gsBudgetBadgeEl.textContent=`ATTACHMENTS ${previewBuild.attachmentCount} / ${LoadoutsSystem.MAX_ATTACHMENTS}`;
    gsBudgetBadgeEl.classList.toggle('full',previewBuild.attachmentCount>=LoadoutsSystem.MAX_ATTACHMENTS);
  }

  const rows=[
    ['DAMAGE','damage'],
    ['RANGE','range'],
    ['ACCURACY','accuracy'],
    ['MOBILITY','mobility'],
    ['HANDLING','handling']
  ];
  gsStatsBoxEl.textContent='';

  const grid=document.createElement('div');
  grid.className='gs-hud-grid';

  const barsCol=document.createElement('div');
  barsCol.className='gs-bars-col';
  for(const [label,key] of rows){
    const curVal=currentBuild.bars[key]||0;
    const preVal=previewBuild.bars[key]||0;
    const delta=cmp.bars[key]||0;
    const row=document.createElement('div');
    row.className='gs-cod-row';

    const kEl=document.createElement('span');
    kEl.className='gs-cod-k';
    kEl.textContent=label;

    const track=document.createElement('div');
    track.className='gs-cod-track';
    const baseFill=document.createElement('div');
    baseFill.className='gs-cod-base';
    baseFill.style.width=`${Math.min(curVal,preVal)}%`;
    track.appendChild(baseFill);
    if(delta>0){
      const dEl=document.createElement('div');
      dEl.className='gs-cod-pos';
      dEl.style.left=`${curVal}%`;
      dEl.style.width=`${delta}%`;
      track.appendChild(dEl);
    }else if(delta<0){
      const dEl=document.createElement('div');
      dEl.className='gs-cod-neg';
      dEl.style.left=`${preVal}%`;
      dEl.style.width=`${Math.abs(delta)}%`;
      track.appendChild(dEl);
    }

    const vEl=document.createElement('span');
    vEl.className='gs-cod-v';
    vEl.textContent=String(preVal);
    if(delta!==0){
      const dSpan=document.createElement('span');
      dSpan.className=delta>0?'d-pos':'d-neg';
      dSpan.textContent=`${delta>0?'+':''}${delta}`;
      vEl.appendChild(dSpan);
    }

    row.append(kEl,track,vEl);
    barsCol.appendChild(row);
  }

  const numsCol=document.createElement('div');
  numsCol.className='gs-nums-col';
  const adsMs=Math.round(previewBuild.adsTimeSec*1000);
  const surfPct=Math.round(previewBuild.surfAirMult*100);
  const isRevBuild=previewBuild.weaponId==='revolver';
  const chgMs=Math.round((previewBuild.chargeTimeSec||0.2)*1000);
  const numRows=isRevBuild
    ?[
      ['CHARGE / FAN',`${chgMs}ms · 285 RPM`,''],
      ['CYLINDER',`${previewBuild.magSize} RDS · SHELL`,''],
      ['SURF / BODY',`${surfPct}% · ${Math.round(previewBuild.damageBody||105)} DMG`,cmp.surfPctDelta>0?'pos':(cmp.surfPctDelta<0?'neg':'')]
    ]
    :[
      ['FIRE RATE',`${Math.round(previewBuild.rpm||600)} RPM`,''],
      ['ROUNDS',`${previewBuild.magSize} RDS`,cmp.magDelta>0?'pos':cmp.magDelta<0?'neg':''],
      ['SURF / ADS',`${surfPct}% · ${adsMs}ms`,cmp.surfPctDelta>0||cmp.adsMsDelta<0?'pos':(cmp.surfPctDelta<0||cmp.adsMsDelta>0?'neg':'')]
    ];
  for(const [k,v,cls] of numRows){
    const item=document.createElement('div');
    item.className='gs-meta-item';
    item.innerHTML=`<span class="gs-meta-k">${k}</span><span class="gs-meta-v ${cls}">${v}</span>`;
    numsCol.appendChild(item);
  }

  grid.append(barsCol,numsCol);
  gsStatsBoxEl.appendChild(grid);

  if(previewBuild.hasChronoKit||currentBuild.hasChronoKit){
    const bar=document.createElement('div');
    const isPhase=previewBuild.chronoTier>=2;
    bar.className='gs-chrono-bar'+(isPhase?' phase':'');
    const left=document.createElement('span');
    left.textContent=previewBuild.hasChronoKit?(isPhase?'APEX PHASE ANCHOR':'APEX CHRONO HANGTIME'):'APEX CHRONO HANGTIME';
    const right=document.createElement('span');
    if(previewBuild.hasChronoKit){
      const spreadPct=Math.round((1-(previewBuild.chronoAirSpreadMul||1))*100);
      right.textContent=`${previewBuild.chronoTimeScale.toFixed(2)}× HANG · −${spreadPct}% AIR SPREAD`;
    }else{
      right.textContent='OFF (1.00×)';
    }
    bar.append(left,right);
    gsStatsBoxEl.appendChild(bar);
  }
}

function renderGunsmithDrawer(entry,spec,xp,currentBuild){
  if(!gsAttDrawerEl||!gsAttachmentListEl)return;
  if(!gunsmithDrawerSlot||gunsmithTab!=='gunsmith'){
    gsAttDrawerEl.style.display='none';
    return;
  }
  const curSlotMeta=LoadoutsSystem.ATTACHMENT_SLOTS.find(s=>s.id===gunsmithDrawerSlot)||LoadoutsSystem.ATTACHMENT_SLOTS[0];
  const slotDisplayLabel=(entry.weaponId==='revolver'&&curSlotMeta.id==='magazine')?'CYLINDER':curSlotMeta.label.toUpperCase();
  gsAttDrawerEl.style.display='';
  if(gsPickerHeadingEl)gsPickerHeadingEl.textContent=slotDisplayLabel;
  if(gsPickerDescEl)gsPickerDescEl.textContent=(entry.weaponId==='revolver'&&curSlotMeta.id==='magazine')?'Precision 6-chamber cylinders tuned for faster shell loading and air handling.':(curSlotMeta.desc||'');

  const options=LoadoutsSystem.getSlotAttachmentsForWeapon(entry.weaponId,gunsmithDrawerSlot);
  const equippedId=entry.attachments[gunsmithDrawerSlot]||'';
  gsAttachmentListEl.textContent='';

  if(equippedId){
    const rmBtn=document.createElement('button');
    rmBtn.type='button';
    rmBtn.className='gs-att-card';
    rmBtn.innerHTML='<div class="gs-att-top"><span class="gs-att-name">Remove Attachment</span><span class="gs-att-tag">RESTORE STOCK</span></div><div class="gs-att-desc">Unequips this slot and frees budget.</div>';
    rmBtn.onmouseenter=()=>{
      const previewAtts={...entry.attachments};
      delete previewAtts[gunsmithDrawerSlot];
      const previewBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,previewAtts);
      renderGunsmithStats(currentBuild,previewBuild);
      updateGunsmith3DPreview(previewAtts,gunsmithDrawerSlot);
    };
    rmBtn.onmouseleave=()=>{
      renderGunsmithStats(currentBuild,currentBuild);
      updateGunsmith3DPreview(entry.attachments,gunsmithDrawerSlot);
    };
    rmBtn.onclick=()=>{
      const res=LoadoutsSystem.equipAttachment(window.activeLoadouts,selectedLoadoutIdx,gunsmithSlotCategory,gunsmithDrawerSlot,null);
      commitLoadoutsState(res.state,{silentToast:true});
      renderGunsmith();
    };
    gsAttachmentListEl.appendChild(rmBtn);
  }

  for(const att of options){
    const unlocked=LoadoutsSystem.isAttachmentUnlocked(entry.weaponId,gunsmithDrawerSlot,att.id,xp);
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
      const previewAtts={...entry.attachments,[gunsmithDrawerSlot]:att.id};
      const previewBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,previewAtts);
      renderGunsmithStats(currentBuild,previewBuild);
      updateGunsmith3DPreview(previewAtts,gunsmithDrawerSlot);
    };
    card.onmouseleave=()=>{
      gunsmithHoverAttId=null;
      renderGunsmithStats(currentBuild,currentBuild);
      updateGunsmith3DPreview(entry.attachments,gunsmithDrawerSlot);
    };
    card.onclick=()=>{
      const res=LoadoutsSystem.equipAttachment(window.activeLoadouts,selectedLoadoutIdx,gunsmithSlotCategory,gunsmithDrawerSlot,att.id);
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

function renderGunsmithProgression(entry,spec,lvlInfo){
  if(!gsProgTrackEl)return;
  gsProgTrackEl.textContent='';
  // Group all weapon attachments by unlock level 1..12
  const byLevel=new Map();
  for(let lv=1;lv<=LoadoutsSystem.MAX_WEAPON_LEVEL;lv++)byLevel.set(lv,[]);
  for(const slotId of (spec.allowedSlots||[])){
    const slotMeta=LoadoutsSystem.ATTACHMENT_SLOTS.find(s=>s.id===slotId);
    const opts=LoadoutsSystem.getSlotAttachmentsForWeapon(entry.weaponId,slotId);
    for(const att of opts){
      const lv=Math.max(1,Math.min(LoadoutsSystem.MAX_WEAPON_LEVEL,att.unlockLevel||1));
      byLevel.get(lv).push({name:att.name,slot:slotMeta?slotMeta.shortLabel:slotId.toUpperCase()});
    }
  }
  for(let lv=1;lv<=LoadoutsSystem.MAX_WEAPON_LEVEL;lv++){
    const unlocked=lvlInfo.level>=lv;
    const isCur=lvlInfo.level===lv;
    const node=document.createElement('div');
    node.className='gs-prog-node'+(isCur?' current':(unlocked?' unlocked':''));
    const head=document.createElement('div');
    head.className='gs-prog-lvl';
    const xpReq=LoadoutsSystem.LEVEL_XP_THRESHOLDS[lv-1]||0;
    head.innerHTML=`<span>LV. ${lv}</span><span>${unlocked?'UNLOCKED':`${xpReq} XP`}</span>`;
    const list=document.createElement('div');
    list.className='gs-prog-items';
    const items=byLevel.get(lv)||[];
    if(items.length===0){
      const empty=document.createElement('span');
      empty.textContent=lv===LoadoutsSystem.MAX_WEAPON_LEVEL?'MASTERY COMPLETE':'WEAPON XP MILESTONE';
      list.appendChild(empty);
    }else{
      for(const it of items.slice(0,3)){
        const row=document.createElement('div');
        row.textContent=it.name;
        const sl=document.createElement('span');
        sl.textContent=' · '+it.slot;
        row.appendChild(sl);
        list.appendChild(row);
      }
      if(items.length>3){
        const more=document.createElement('span');
        more.textContent=`+${items.length-3} MORE`;
        list.appendChild(more);
      }
    }
    node.append(head,list);
    gsProgTrackEl.appendChild(node);
  }
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
  const unlocks=countWeaponUnlocks(entry.weaponId,xp);
  const currentBuild=LoadoutsSystem.resolveWeaponBuild(entry.weaponId,entry.attachments);

  if(gsCrumbEl)gsCrumbEl.textContent=`CREATE A CLASS / ${ld.name.toUpperCase()} / ${gunsmithSlotCategory.toUpperCase()}`;
  if(gsWeaponTitleEl)gsWeaponTitleEl.textContent=spec.name;
  if(gsWeaponLevelLabelEl)gsWeaponLevelLabelEl.textContent=lvlInfo.isMax?`LV. ${lvlInfo.level} MAX`:`LV. ${lvlInfo.level}`;
  if(gsWeaponXpFillEl)gsWeaponXpFillEl.style.width=`${Math.round(lvlInfo.progress*100)}%`;
  if(gsWeaponXpTextEl){
    const xpNeeded=Math.max(0,lvlInfo.nextThreshold-lvlInfo.currentFloor);
    gsWeaponXpTextEl.textContent=lvlInfo.isMax?`${lvlInfo.xp} XP · MAXED`:`${lvlInfo.xpIntoLevel} / ${xpNeeded} XP`;
  }
  if(gsWeaponSubEl)gsWeaponSubEl.textContent=`${spec.classLabel} · ${unlocks.unlocked} / ${unlocks.total} UNLOCKS`;
  if(gsStageLabelEl)gsStageLabelEl.textContent=`DRAG TO ROTATE · ${spec.shortName.toUpperCase()}`;

  // Sync top 3 tabs (GUNSMITH | APPEARANCE | PROGRESSION)
  document.querySelectorAll('[data-gs-tab]').forEach(btn=>{
    const on=btn.dataset.gsTab===gunsmithTab;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });

  const isGsTab=gunsmithTab==='gunsmith';
  const isAppTab=gunsmithTab==='appearance';
  const isProgTab=gunsmithTab==='progression';

  if(gsSpatialNodesEl)gsSpatialNodesEl.style.display=isGsTab?'':'none';
  if(gsStatsHudEl)gsStatsHudEl.style.display=isGsTab?'':'none';
  if(gsAppearanceTrayEl)gsAppearanceTrayEl.style.display=isAppTab?'':'none';
  if(gsProgressionTrayEl)gsProgressionTrayEl.style.display=isProgTab?'':'none';

  if(isAppTab){
    if(gsAttDrawerEl)gsAttDrawerEl.style.display='none';
    if(gsAppearanceHeadingEl)gsAppearanceHeadingEl.textContent=`${spec.shortName.toUpperCase()} FINISHES (OWNED IN ARMORY)`;
    renderGunsmithSkins(entry);
    updateGunsmith3DPreview(entry.attachments,'none');
    return;
  }

  if(isProgTab){
    if(gsAttDrawerEl)gsAttDrawerEl.style.display='none';
    renderGunsmithProgression(entry,spec,lvlInfo);
    updateGunsmith3DPreview(entry.attachments,'none');
    return;
  }

  // Render floating 8 perimeter nodes + centered bottom APEX diamond node
  if(gsSpatialNodesEl){
    gsSpatialNodesEl.textContent='';
    const allowed=new Set(spec.allowedSlots||[]);
    for(const slotMeta of LoadoutsSystem.ATTACHMENT_SLOTS){
      if(!allowed.has(slotMeta.id))continue;
      const equippedId=entry.attachments[slotMeta.id];
      const equippedDef=equippedId?LoadoutsSystem.getAttachmentDef(slotMeta.id,equippedId):null;
      const isSelected=gunsmithDrawerSlot===slotMeta.id;

      if(slotMeta.isApex){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='gs-node-apex'+(equippedDef?' equipped':'')+(isSelected?' active':'');
        btn.dataset.slot=slotMeta.id;
        btn.innerHTML=`
          <div class="gs-apex-diamond"><span>${equippedDef?'◆':'◇'}</span></div>
          <span class="gs-apex-label">APEX</span>
          <span class="gs-apex-sub">${equippedDef?equippedDef.name:'CHRONO MODULE'}</span>
        `;
        btn.onmouseenter=()=>{
          if(!gunsmithDrawerSlot)updateGunsmith3DPreview(entry.attachments,'apex');
        };
        btn.onclick=()=>{
          gunsmithDrawerSlot=isSelected?null:slotMeta.id;
          gunsmithAttCategory=slotMeta.id;
          renderGunsmith();
        };
        gsSpatialNodesEl.appendChild(btn);
        continue;
      }

      const btn=document.createElement('button');
      btn.type='button';
      btn.className='gs-node'+(equippedDef?' equipped':'')+(isSelected?' active':'');
      btn.dataset.slot=slotMeta.id;

      if(equippedDef){
        const chk=document.createElement('span');
        chk.className='gs-node-check';
        chk.textContent='✓';
        btn.appendChild(chk);
      }

      const slotLabel=(entry.weaponId==='revolver'&&slotMeta.id==='magazine')?'Cylinder':slotMeta.label;
      const slotShort=(entry.weaponId==='revolver'&&slotMeta.id==='magazine')?'CY':slotMeta.shortLabel.slice(0,2);

      const plus=document.createElement('span');
      plus.className='gs-node-plus';
      plus.textContent=equippedDef?slotShort:'+';

      const copy=document.createElement('span');
      copy.className='gs-node-copy';
      const title=document.createElement('span');
      title.className='gs-node-title';
      title.textContent=equippedDef?equippedDef.name:slotLabel;
      const sub=document.createElement('span');
      sub.className='gs-node-sub';
      sub.textContent=equippedDef?slotLabel:'EMPTY SLOT';
      copy.append(title,sub);

      btn.append(plus,copy);
      btn.onmouseenter=()=>{
        if(!gunsmithDrawerSlot)updateGunsmith3DPreview(entry.attachments,slotMeta.id);
      };
      btn.onclick=()=>{
        gunsmithDrawerSlot=isSelected?null:slotMeta.id;
        gunsmithAttCategory=slotMeta.id;
        renderGunsmith();
      };
      gsSpatialNodesEl.appendChild(btn);
    }
  }

  renderGunsmithDrawer(entry,spec,xp,currentBuild);
  renderGunsmithStats(currentBuild,currentBuild);
  updateGunsmith3DPreview(entry.attachments,gunsmithDrawerSlot||'none');
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

