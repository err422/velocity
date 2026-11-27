// Loadouts Manager and 3D Gunsmith Workbench UI (attachments, stats, skins, XP progression).
// ---------- Loadouts Manager & 3D Gunsmith Workbench ----------
function showWeaponLevelUpBanner(weaponName,newLevel,newUnlocks){
  if(!weaponXpToastEl)return;
  weaponXpToastEl.classList.remove('camo-mode');
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

function showCamoUnlockBanner(weaponName,camoName,tierLabel){
  if(!weaponXpToastEl)return;
  weaponXpToastEl.classList.add('camo-mode');
  if(wxpKickerEl)wxpKickerEl.textContent=tierLabel?`${tierLabel.toUpperCase()} CAMO UNLOCKED`:'CAMO UNLOCKED';
  if(wxpTitleEl)wxpTitleEl.textContent=`${String(weaponName||'WEAPON').toUpperCase()} · ${String(camoName||'CAMO').toUpperCase()}`;
  if(wxpSubEl)wxpSubEl.textContent='EQUIP IN GUNSMITH → APPEARANCE';
  weaponXpToastEl.style.opacity='1';
  weaponXpToastTimer=4.6;
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
  let baseItem=null;
  if(skinItemId){
    baseItem=list.find(w=>w.id===skinItemId)||null;
  }
  if(!baseItem){
    const mapId=window.activeLoadouts&&window.activeLoadouts.equippedWeaponSkins?window.activeLoadouts.equippedWeaponSkins[weaponId]:'';
    if(mapId)baseItem=list.find(w=>w.id===mapId)||null;
  }
  if(!baseItem){
    baseItem=KnivesSystem.getEquippedWeapon(window.activeInventory,weaponId);
  }
  const camoId=window.activeLoadouts&&window.activeLoadouts.equippedWeaponCamos?window.activeLoadouts.equippedWeaponCamos[weaponId]:'';
  if(camoId&&KnivesSystem.WEAPON_SKINS[camoId]){
    return {
      ...baseItem,
      id:`camo_override_${weaponId}_${camoId}`,
      skinId:camoId,
      floatValue:0.01,
      patternSeed:42,
      wearGrade:'FN',
      isCamoOverride:true
    };
  }
  return baseItem;
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
    const isKat=entry.weaponId==='katana';
    uRow.innerHTML=isKat
      ?`<span>LV. <b>${lvlInfo.level}</b> · DASH + DEFLECT</span><span class="cod-gs-link">CAMOS →</span>`
      :`<span>LV. <b>${lvlInfo.level}</b> · ${unlocks.unlocked}/${unlocks.total} UNLOCKS</span><span class="cod-gs-link">GUNSMITH →</span>`;
    info.append(cls,name,uRow);
    mid.append(thumb,info);

    const roster=isPrimary?LoadoutsSystem.PRIMARY_WEAPON_IDS:LoadoutsSystem.SECONDARY_WEAPON_IDS;
    const filterWrap=document.createElement('div');
    if(isPrimary){
      filterWrap.className='cod-class-filters';
      const classTabs=[
        ['all','ALL'],
        ['ar','AR'],
        ['smg','SMG'],
        ['shotgun','SHG'],
        ['sniper','SNP'],
        ['melee','MELEE'],
        ['revolver','REV']
      ];
      for(const [cid,clbl] of classTabs){
        const fb=document.createElement('button');
        fb.type='button';
        fb.className='cod-class-btn'+(primaryClassFilter===cid?' active':'');
        fb.textContent=clbl;
        fb.onclick=(ev)=>{
          ev.stopPropagation();
          primaryClassFilter=cid;
          renderLoadoutsOverview();
        };
        filterWrap.appendChild(fb);
      }
    }

    const pickers=document.createElement('div');
    pickers.className='cod-wep-row';
    const filteredRoster=isPrimary&&primaryClassFilter!=='all'
      ?roster.filter(wid=>{
        const ws=LoadoutsSystem.getWeaponSpec(wid);
        if(!ws)return false;
        const cid=ws.classId==='katana'?'melee':(ws.classId||ws.weaponClass);
        return cid===primaryClassFilter;
      })
      :roster;
    for(const wid of filteredRoster){
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

    if(isPrimary)card.append(top,mid,filterWrap,pickers);
    else card.append(top,mid,pickers);
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
    cls.textContent=`Knife · ${sk.name}${knife.statTrak?` · StatTrak™ (${knife.statTrakKills||0})`:''}`;
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

  const buildScorestreakSlotCard=()=>{
    const activeSid=ld.scorestreakId||'rpg';
    const activeDef=(LoadoutsSystem.SCORESTREAKS&&LoadoutsSystem.SCORESTREAKS[activeSid])||LoadoutsSystem.SCORESTREAKS.rpg;
    const card=document.createElement('div');
    card.className='cod-slot-card';

    const top=document.createElement('div');
    top.className='cod-slot-top';
    top.innerHTML=`<span class="cod-slot-label">SCORESTREAK [5]</span><span class="cod-slot-label" style="color:#ffb84d">${activeDef.shortName.toUpperCase()} · ${activeDef.cost} PTS</span>`;

    const grid=document.createElement('div');
    grid.className='cod-streak-grid';
    for(const sid of (LoadoutsSystem.SCORESTREAK_IDS||[])){
      const sDef=LoadoutsSystem.SCORESTREAKS[sid];
      if(!sDef)continue;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cod-streak-btn'+(sid===activeSid?' active':'')+(sDef.type==='nuke'?' nuke-btn':'');
      const sTop=document.createElement('div');
      sTop.className='cod-streak-top';
      const sNm=document.createElement('span');
      sNm.textContent=sDef.name;
      const sCost=document.createElement('span');
      sCost.className='cod-streak-cost';
      sCost.textContent=`${sDef.cost} PTS`;
      sTop.append(sNm,sCost);
      const sDesc=document.createElement('div');
      sDesc.className='cod-streak-desc';
      sDesc.textContent=sDef.desc||sDef.description||'';
      btn.append(sTop,sDesc);
      btn.onclick=(ev)=>{
        ev.stopPropagation();
        const updated=LoadoutsSystem.setLoadoutScorestreak(window.activeLoadouts,selectedLoadoutIdx,sid);
        commitLoadoutsState(updated,{silentToast:true});
        showToast(`SCORESTREAK SET: ${sDef.name.toUpperCase()} (${sDef.cost} PTS)`);
        renderLoadoutsOverview();
      };
      grid.appendChild(btn);
    }
    card.append(top,grid);
    return card;
  };

  loadoutsSlotsGridEl.appendChild(buildFirearmSlotCard('primary'));
  loadoutsSlotsGridEl.appendChild(buildFirearmSlotCard('secondary'));
  loadoutsSlotsGridEl.appendChild(buildScorestreakSlotCard());
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

let gunsmithCamoFilter='all';
let gunsmithLastTab='';
let gunsmithLastWeaponId='';
let gunsmithPinnedFinishKey='';

function openGunsmith(slotCategory){
  gunsmithMode=true;
  gunsmithSlotCategory=slotCategory==='secondary'?'secondary':'primary';
  const entry=getGunsmithEntry();
  const spec=LoadoutsSystem.getWeaponSpec(entry.weaponId);
  gunsmithTab=(spec&&Array.isArray(spec.allowedSlots)&&spec.allowedSlots.length===0)?'appearance':'gunsmith';
  gunsmithDrawerSlot=null;
  gunsmithAttCategory='optic';
  gunsmithHoverAttId=null;
  gunsmithLastTab='';
  gunsmithLastWeaponId='';
  gunsmithPinnedFinishKey='';
  renderGunsmith();
}

function getGunsmithEntry(){
  const ld=window.activeLoadouts.loadouts[selectedLoadoutIdx]||window.activeLoadouts.loadouts[0];
  return ld[gunsmithSlotCategory==='secondary'?'secondary':'primary'];
}

function updateGunsmith3DPreview(previewAttachments,focusSlotOverride,opts){
  if(!gunsmithCanvasEl||!gunsmithMode)return;
  const entry=getGunsmithEntry();
  const options=opts||{};
  const skinItem=options.previewSkinItem||getWeaponSkinForLoadoutEntry(entry.weaponId,entry.skinItemId);
  const atts=previewAttachments||entry.attachments;
  const focus=focusSlotOverride!==undefined
    ?focusSlotOverride
    :(gunsmithTab==='appearance'?'appearance':(gunsmithTab==='gunsmith'?(gunsmithDrawerSlot||'none'):'none'));
  ArmoryPreview.showGunsmithWeapon(gunsmithCanvasEl,skinItem,atts,{
    focusSlot:focus,
    resetCamera:options.resetCamera===false?false:true
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

  const tabChanged=gunsmithLastTab!==gunsmithTab||gunsmithLastWeaponId!==entry.weaponId;
  gunsmithLastTab=gunsmithTab;
  gunsmithLastWeaponId=entry.weaponId;

  if(isAppTab){
    if(gsAttDrawerEl)gsAttDrawerEl.style.display='none';
    if(gsAppearanceHeadingEl)gsAppearanceHeadingEl.textContent=`${spec.shortName.toUpperCase()} FINISHES`;
    renderGunsmithSkins(entry);
    updateGunsmith3DPreview(entry.attachments,'appearance',{resetCamera:tabChanged});
    return;
  }

  if(isProgTab){
    if(gsAttDrawerEl)gsAttDrawerEl.style.display='none';
    renderGunsmithProgression(entry,spec,lvlInfo);
    updateGunsmith3DPreview(entry.attachments,'none',{resetCamera:tabChanged});
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

function formatCamoProgressNum(val){
  const n=Number(val)||0;
  return Math.abs(n-Math.round(n))<0.01?String(Math.round(n)):n.toFixed(1);
}

function getSwatchFallbackBg(skinId,accent){
  const c=accent||'#65e7ff';
  if(skinId==='camo_gold')return 'linear-gradient(135deg,#8c6112 0%,#ffd84d 52%,#6e480a 100%)';
  if(skinId==='camo_diamond')return 'linear-gradient(135deg,#9fb4c8 0%,#f5fbff 48%,#e6b84c 100%)';
  if(skinId==='camo_dark_matter')return 'linear-gradient(135deg,#19092b 0%,#9e42ff 52%,#2a0b4a 100%)';
  if(skinId==='cod_opal')return 'linear-gradient(135deg,#eef9ff 0%,#c7f6ee 50%,#f8d7f4 100%)';
  if(skinId==='cod_dark_spine')return 'linear-gradient(135deg,#14151e 0%,#d946ff 55%,#1a1026 100%)';
  if(skinId==='cod_borealis')return 'linear-gradient(135deg,#071324 0%,#26f5ba 48%,#9a54ff 100%)';
  if(skinId==='cod_interstellar')return 'linear-gradient(135deg,#090a22 0%,#6394ff 52%,#c468ff 100%)';
  if(skinId==='cod_nebula')return 'linear-gradient(135deg,#0a0514 0%,#1ed4e0 44%,#e042b8 100%)';
  if(skinId==='cod_mercury')return 'linear-gradient(135deg,#2a313b 0%,#f2f8ff 50%,#6d7a8a 100%)';
  if(skinId==='cod_molten_obsidian')return 'linear-gradient(135deg,#171314 0%,#ff6c14 54%,#ffd454 100%)';
  if(skinId==='cod_constellation')return 'linear-gradient(135deg,#07142e 0%,#f4c95d 52%,#0c2046 100%)';
  if(skinId==='cod_orion')return 'linear-gradient(135deg,#0b1742 0%,#36eeff 48%,#ff3fb4 100%)';
  if(skinId==='cod_retro_grid')return 'linear-gradient(135deg,#190736 0%,#ff49c4 50%,#38f6ff 100%)';
  if(skinId==='cod_forged_titanium')return 'linear-gradient(135deg,#7c8c9c 0%,#d8e4ee 50%,#4d78d8 100%)';
  if(skinId==='cod_stained_glass')return 'linear-gradient(135deg,#d91e48 0%,#f2a826 48%,#1e5ce6 100%)';
  if(skinId==='cod_kintsugi_porcelain')return 'linear-gradient(135deg,#f4efe4 0%,#2a56a8 52%,#f4c852 100%)';
  if(skinId==='cod_blood_cell')return 'linear-gradient(135deg,#1c0309 0%,#e6223e 54%,#3d0611 100%)';
  if(skinId==='cod_polyatomic')return 'linear-gradient(135deg,#200b3b 0%,#9e44f5 52%,#e496ff 100%)';
  if(skinId==='cod_ghoulie')return 'linear-gradient(135deg,#06111c 0%,#3cf7e0 52%,#7e4dff 100%)';
  if(skinId==='cod_bioluminescent')return 'linear-gradient(135deg,#06121b 0%,#26f7dc 50%,#38ff9c 100%)';
  if(skinId==='cod_afterlife')return 'linear-gradient(135deg,#0c1018 0%,#2ce6ff 54%,#1e38c8 100%)';
  return `linear-gradient(135deg,rgba(14,24,36,.95) 0%,${c} 100%)`;
}

function createCamoStateSvg(kind){
  if(kind==='locked'){
    return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="7.2" width="9.6" height="6.8" rx="1.2"/><path d="M5.4 7.2V5.1a2.6 2.6 0 0 1 5.2 0v2.1"/></svg>';
  }
  if(kind==='equipped'){
    return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 8.4l3.1 3.1 6.5-6.8"/></svg>';
  }
  return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.4l1.6 3.5 3.8.5-2.8 2.6.7 3.8L8 11l-3.3 1.8.7-3.8-2.8-2.6 3.8-.5z"/></svg>';
}

function renderGunsmithSkins(entry){
  if(!gsSkinsGridEl)return;
  const groupsEl=document.getElementById('gsCamoGroups');
  const subtabsEl=document.getElementById('gsCamoSubtabs');
  const railEl=gsAppearanceTrayEl?gsAppearanceTrayEl.querySelector('.gs-camo-rail'):null;
  const inspCodeEl=document.getElementById('gsCamoInspCode');
  const inspIconEl=document.getElementById('gsCamoInspIcon');
  const inspTitleEl=document.getElementById('gsCamoInspTitle');
  const inspStateEl=document.getElementById('gsCamoInspState');
  const inspTierEl=document.getElementById('gsCamoInspTier');
  const inspDescEl=document.getElementById('gsCamoInspDesc');
  const inspProgRowEl=document.getElementById('gsCamoInspProgRow');
  const inspFillEl=document.getElementById('gsCamoInspFill');
  const inspCountEl=document.getElementById('gsCamoInspCount');
  const inspSubEl=document.getElementById('gsCamoInspSub');
  const inspEquipBtn=document.getElementById('gsCamoEquipBtn');

  const owned=(window.activeInventory.weapons||[]).filter(w=>w.weaponType===entry.weaponId);
  const baseEquippedItem=(()=>{
    if(entry.skinItemId){
      const bySlot=owned.find(w=>w.id===entry.skinItemId);
      if(bySlot)return bySlot;
    }
    const mapId=window.activeLoadouts&&window.activeLoadouts.equippedWeaponSkins?window.activeLoadouts.equippedWeaponSkins[entry.weaponId]:'';
    if(mapId){
      const byMap=owned.find(w=>w.id===mapId);
      if(byMap)return byMap;
    }
    return KnivesSystem.getEquippedWeapon(window.activeInventory,entry.weaponId);
  })();
  const equippedCamoId=window.activeLoadouts&&window.activeLoadouts.equippedWeaponCamos?(window.activeLoadouts.equippedWeaponCamos[entry.weaponId]||''):'';
  const status=typeof LoadoutsSystem.getWeaponCamoStatus==='function'
    ?LoadoutsSystem.getWeaponCamoStatus(window.activeLoadouts,entry.weaponId)
    :null;

  if(subtabsEl){
    subtabsEl.querySelectorAll('[data-camo-filter]').forEach(btn=>{
      const on=btn.dataset.camoFilter===gunsmithCamoFilter;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
      btn.onclick=()=>{
        gunsmithCamoFilter=btn.dataset.camoFilter||'all';
        renderGunsmithSkins(entry);
      };
    });
  }

  const descriptors=[];
  const byKey=new Map();

  const makeCamoPreviewItem=(skinId)=>({
    ...baseEquippedItem,
    id:`preview_camo_${entry.weaponId}_${skinId}`,
    skinId,
    floatValue:0.01,
    patternSeed:42,
    wearGrade:'FN',
    isCamoOverride:true
  });

  const equipCamoSkin=(skinId,camoName,isCurrentlyEquipped)=>{
    const nextCamo=isCurrentlyEquipped?'':skinId;
    const res=LoadoutsSystem.equipWeaponCamo(window.activeLoadouts,entry.weaponId,nextCamo);
    if(!res.ok){
      showToast('CHALLENGE CAMO LOCKED · COMPLETE CHALLENGE TO EQUIP');
      return;
    }
    gunsmithPinnedFinishKey='';
    commitLoadoutsState(res.state,{silentToast:true});
    showToast(nextCamo?`EQUIPPED ${camoName.toUpperCase()} CAMO`:'CAMO REMOVED · USING ARMORY FINISH');
    renderGunsmith();
  };

  const equipArmoryItem=(item)=>{
    const next=LoadoutsSystem.sanitizeLoadoutState(window.activeLoadouts);
    next.loadouts[selectedLoadoutIdx][gunsmithSlotCategory].skinItemId=item.id;
    next.equippedWeaponSkins[entry.weaponId]=item.id;
    if(next.equippedWeaponCamos)next.equippedWeaponCamos[entry.weaponId]='';
    if(!window.activeInventory.equippedWeaponIds)window.activeInventory.equippedWeaponIds={};
    window.activeInventory.equippedWeaponIds[entry.weaponId]=item.id;
    const legacyField=weaponEquipField(entry.weaponId);
    if(legacyField)window.activeInventory[legacyField]=item.id;
    persistInventorySummary(true);
    ViewmodelSystem.equipWeaponSkin(item);
    gunsmithPinnedFinishKey='';
    commitLoadoutsState(next,{silentToast:true});
    showToast(`EQUIPPED ${KnivesSystem.formatWeaponFullName(item).toUpperCase()}`);
    renderGunsmith();
  };

  const renderInspector=(desc)=>{
    if(!desc||!inspTitleEl)return;
    const accent=desc.accent||'#65e7ff';
    if(inspCodeEl)inspCodeEl.textContent=desc.code||'CAMO SELECT';
    if(inspIconEl){
      inspIconEl.className='gs-camo-insp-icon '+(desc.equipped?'equipped':(desc.unlocked?'unlocked':'locked'));
      inspIconEl.innerHTML=createCamoStateSvg(desc.equipped?'equipped':(desc.unlocked?'unlocked':'locked'));
    }
    inspTitleEl.textContent=(desc.name||'FACTORY SLATE').toUpperCase();
    if(inspStateEl){
      inspStateEl.className='gs-camo-insp-state '+(desc.equipped?'equipped':(desc.unlocked?'unlocked':'locked'));
      inspStateEl.textContent=desc.equipped?'EQUIPPED':(desc.unlocked?'UNLOCKED · CLICK TO EQUIP':'LOCKED');
    }
    if(inspTierEl){
      inspTierEl.textContent=desc.tier||'';
      inspTierEl.style.color=accent;
    }
    if(inspDescEl)inspDescEl.textContent=desc.desc||'';
    if(inspProgRowEl){
      if(desc.hasProgress){
        inspProgRowEl.style.display='';
        if(inspFillEl){
          inspFillEl.style.width=`${Math.max(0,Math.min(100,desc.pct||0))}%`;
          inspFillEl.style.background=accent;
        }
        if(inspCountEl)inspCountEl.textContent=`${formatCamoProgressNum(desc.current)} / ${desc.target}`;
      }else{
        inspProgRowEl.style.display='none';
      }
    }
    if(inspSubEl){
      inspSubEl.textContent=desc.sub||'';
      inspSubEl.style.display=desc.sub?'':'none';
    }
    if(inspEquipBtn){
      if(desc.unlocked&&typeof desc.onEquip==='function'){
        inspEquipBtn.style.display='';
        if(desc.kind==='camo'){
          inspEquipBtn.textContent=desc.equipped?'REMOVE CAMO':'EQUIP CAMO';
          inspEquipBtn.disabled=false;
          inspEquipBtn.onclick=()=>desc.onEquip();
        }else{
          inspEquipBtn.textContent=desc.equipped?'EQUIPPED':'EQUIP FINISH';
          inspEquipBtn.disabled=!!desc.equipped;
          inspEquipBtn.onclick=()=>{if(!desc.equipped)desc.onEquip();};
        }
      }else{
        inspEquipBtn.style.display='none';
        inspEquipBtn.onclick=null;
      }
    }
  };

  const applySwatchHighlight=(activeKey)=>{
    if(!gsAppearanceTrayEl)return;
    gsAppearanceTrayEl.querySelectorAll('.gs-swatch-tile').forEach(el=>{
      el.classList.toggle('focused',el.dataset.finishKey===activeKey);
    });
  };

  const buildSwatchTile=(desc)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.finishKey=desc.key;
    btn.dataset.skinId=desc.skinId;
    btn.dataset.finishKind=desc.kind;
    btn.className='gs-swatch-tile'+(desc.unlocked?' unlocked':' locked')+(desc.equipped?' equipped':'');
    btn.style.setProperty('--swatch-col',desc.accent||'#65e7ff');
    btn.title=`${desc.name}${desc.equipped?' (Equipped)':desc.unlocked?'':' (Locked)'}`;

    const swatchUrl=typeof ArmoryPreview.getWeaponSkinSwatchDataUrl==='function'
      ?ArmoryPreview.getWeaponSkinSwatchDataUrl(desc.skinId,desc.patternSeed,desc.floatValue)
      :'';
    if(swatchUrl){
      const img=document.createElement('img');
      img.className='gs-swatch-img';
      img.alt=desc.name;
      img.src=swatchUrl;
      btn.appendChild(img);
    }else{
      const fallback=document.createElement('div');
      fallback.className='gs-swatch-fallback';
      fallback.style.background=getSwatchFallbackBg(desc.skinId,desc.accent);
      btn.appendChild(fallback);
    }

    if(desc.equipped){
      const badge=document.createElement('span');
      badge.className='gs-swatch-badge equipped';
      badge.setAttribute('aria-label','Equipped');
      badge.innerHTML=createCamoStateSvg('equipped');
      btn.appendChild(badge);
    }else if(!desc.unlocked){
      const badge=document.createElement('span');
      badge.className='gs-swatch-badge locked';
      badge.setAttribute('aria-label','Locked');
      badge.innerHTML=createCamoStateSvg('locked');
      btn.appendChild(badge);
    }

    if(desc.statTrakTag){
      const wt=document.createElement('span');
      wt.className='gs-swatch-wear';
      wt.style.color='#ff9c42';
      wt.style.borderColor='rgba(255,148,56,0.55)';
      wt.textContent=desc.statTrakTag;
      btn.appendChild(wt);
    }

    const bar=document.createElement('span');
    bar.className='gs-swatch-bar';
    if(desc.hasProgress&&!desc.unlocked){
      const prog=document.createElement('span');
      prog.className='gs-swatch-bar-fill';
      prog.style.width=`${Math.max(0,Math.min(100,desc.pct||0))}%`;
      bar.appendChild(prog);
    }
    btn.appendChild(bar);

    const previewNow=()=>{
      applySwatchHighlight(desc.key);
      renderInspector(desc);
      updateGunsmith3DPreview(entry.attachments,'appearance',{
        resetCamera:false,
        previewSkinItem:desc.previewItem
      });
    };

    btn.onmouseenter=previewNow;
    btn.onfocus=previewNow;
    btn.onclick=()=>{
      if(!desc.unlocked){
        gunsmithPinnedFinishKey=desc.key;
        previewNow();
        showToast(`LOCKED: ${desc.name.toUpperCase()} (${formatCamoProgressNum(desc.current)}/${desc.target})`);
        return;
      }
      desc.onEquip();
    };
    return btn;
  };

  if(groupsEl)groupsEl.textContent='';
  gsSkinsGridEl.textContent='';

  const showChallenges=gunsmithCamoFilter==='all'||gunsmithCamoFilter==='challenges';
  const showPrestige=gunsmithCamoFilter==='all'||gunsmithCamoFilter==='prestige';
  const showArmory=gunsmithCamoFilter==='all'||gunsmithCamoFilter==='armory';

  let defaultDescriptor=null;

  if(status){
    // Base Challenges (6)
    const baseDescs=status.baseCamos.map((bc,idx)=>{
      const isEq=equippedCamoId===bc.skinId;
      const desc={
        key:`base:${bc.skinId}`,
        kind:'camo',
        skinId:bc.skinId,
        patternSeed:42,
        floatValue:0.01,
        name:bc.name,
        code:`BASE 0${idx+1} · ${bc.label.toUpperCase()}`,
        tier:'BASE CHALLENGE',
        desc:bc.desc,
        sub:`PvP 1.0× · Bots 0.35× · Base Progress ${status.baseUnlockedCount}/${status.baseCamos.length} for Gold`,
        accent:bc.accent||'#65e7ff',
        unlocked:!!bc.unlocked,
        equipped:isEq,
        hasProgress:true,
        current:bc.current,
        target:bc.target,
        pct:bc.pct,
        previewItem:makeCamoPreviewItem(bc.skinId),
        onEquip:()=>equipCamoSkin(bc.skinId,bc.name,isEq)
      };
      descriptors.push(desc);
      byKey.set(desc.key,desc);
      if(isEq)defaultDescriptor=desc;
      return desc;
    });

    // Class Signature Camo (1 per weapon class)
    const sigDescs=(status.signatureCamos||[]).map((sc)=>{
      const skinId=sc.skinId||sc.id;
      const isEq=equippedCamoId===skinId;
      const desc={
        key:`sig:${skinId}`,
        kind:'camo',
        skinId,
        patternSeed:42,
        floatValue:0.01,
        name:sc.name,
        code:`SIGNATURE · ${sc.tier||'CLASS ART'}`,
        tier:sc.tier||'CLASS SIGNATURE',
        desc:sc.desc,
        sub:status.goldUnlocked?'Gold Complete · Signature Painted PBR Finish':'Requires Gold Camo on this weapon first',
        accent:sc.accent||'#65e7ff',
        unlocked:!!sc.unlocked,
        equipped:isEq,
        hasProgress:true,
        current:sc.current,
        target:sc.target,
        pct:sc.pct,
        previewItem:makeCamoPreviewItem(skinId),
        onEquip:()=>equipCamoSkin(skinId,sc.name,isEq)
      };
      descriptors.push(desc);
      byKey.set(desc.key,desc);
      if(isEq)defaultDescriptor=desc;
      return desc;
    });

    // Weapon Prestige Camos (Lv. 8 Mercury, Lv. 10 Molten Obsidian, Lv. 12 Constellation's End)
    const prestigeDescs=(status.prestigeCamos||[]).map((pc,idx)=>{
      const skinId=pc.skinId||pc.id;
      const isEq=equippedCamoId===skinId;
      const desc={
        key:`prestige:${skinId}`,
        kind:'camo',
        skinId,
        patternSeed:42,
        floatValue:0.01,
        name:pc.name,
        code:`PRESTIGE 0${idx+1} · WEAPON LV. ${pc.reqLevel}`,
        tier:pc.tier||'WEAPON PRESTIGE',
        desc:pc.desc,
        sub:`Current Weapon Level: Lv. ${status.weaponLevel||1} / ${pc.reqLevel} · Painted Liquid-Metal PBR`,
        accent:pc.accent||'#ffd84d',
        unlocked:!!pc.unlocked,
        equipped:isEq,
        hasProgress:true,
        current:pc.current,
        target:pc.target,
        pct:pc.pct,
        previewItem:makeCamoPreviewItem(skinId),
        onEquip:()=>equipCamoSkin(skinId,pc.name,isEq)
      };
      descriptors.push(desc);
      byKey.set(desc.key,desc);
      if(isEq)defaultDescriptor=desc;
      return desc;
    });

    // Completionist Mastery Camos (Gold, Opal, Diamond, Dark Spine, Borealis, Interstellar, Dark Matter, Nebula)
    const masteryDescs=status.masteryCamos.map((mc,idx)=>{
      const skinId=mc.skinId||mc.id;
      const isEq=equippedCamoId===skinId;
      const desc={
        key:`mastery:${skinId}`,
        kind:'camo',
        skinId,
        patternSeed:42,
        floatValue:0.01,
        name:mc.name,
        code:`MASTERY 0${idx+1} · COMPLETIONIST`,
        tier:mc.tier||'COMPLETIONIST',
        desc:mc.desc,
        sub:mc.animated?'Animated shader · Unlocks across all weapons':'Masterpiece painted PBR finish · Click swatch to toggle',
        accent:mc.accent||'#ffd84d',
        unlocked:!!mc.unlocked,
        equipped:isEq,
        hasProgress:true,
        current:mc.current,
        target:mc.target,
        pct:mc.pct,
        previewItem:makeCamoPreviewItem(skinId),
        onEquip:()=>equipCamoSkin(skinId,mc.name,isEq)
      };
      descriptors.push(desc);
      byKey.set(desc.key,desc);
      if(isEq)defaultDescriptor=desc;
      return desc;
    });

    if(groupsEl&&showChallenges){
      const baseSec=document.createElement('div');
      baseSec.className='gs-swatch-section';
      const baseHead=document.createElement('div');
      baseHead.className='gs-swatch-sec-head';
      baseHead.innerHTML=`<span>BASE CHALLENGES</span><strong>${status.baseUnlockedCount}/${status.baseCamos.length}</strong>`;
      const baseGrid=document.createElement('div');
      baseGrid.className='gs-swatch-grid';
      for(const d of baseDescs)baseGrid.appendChild(buildSwatchTile(d));
      baseSec.append(baseHead,baseGrid);
      groupsEl.appendChild(baseSec);

      const mastUnlocked=masteryDescs.filter(m=>m.unlocked).length;
      const mastSec=document.createElement('div');
      mastSec.className='gs-swatch-section';
      const mastHead=document.createElement('div');
      mastHead.className='gs-swatch-sec-head';
      mastHead.innerHTML=`<span>COMPLETIONIST</span><strong>${mastUnlocked}/${masteryDescs.length}</strong>`;
      const mastGrid=document.createElement('div');
      mastGrid.className='gs-swatch-grid';
      for(const d of masteryDescs)mastGrid.appendChild(buildSwatchTile(d));
      mastSec.append(mastHead,mastGrid);
      groupsEl.appendChild(mastSec);
    }

    if(groupsEl&&showPrestige){
      if(sigDescs.length){
        const sigUnlocked=sigDescs.filter(s=>s.unlocked).length;
        const sigSec=document.createElement('div');
        sigSec.className='gs-swatch-section';
        const sigHead=document.createElement('div');
        sigHead.className='gs-swatch-sec-head';
        sigHead.innerHTML=`<span>CLASS SIGNATURE</span><strong>${sigUnlocked}/${sigDescs.length}</strong>`;
        const sigGrid=document.createElement('div');
        sigGrid.className='gs-swatch-grid';
        for(const d of sigDescs)sigGrid.appendChild(buildSwatchTile(d));
        sigSec.append(sigHead,sigGrid);
        groupsEl.appendChild(sigSec);
      }

      if(prestigeDescs.length){
        const pUnlocked=prestigeDescs.filter(p=>p.unlocked).length;
        const pSec=document.createElement('div');
        pSec.className='gs-swatch-section';
        const pHead=document.createElement('div');
        pHead.className='gs-swatch-sec-head';
        pHead.innerHTML=`<span>WEAPON PRESTIGE</span><strong>${pUnlocked}/${prestigeDescs.length}</strong>`;
        const pGrid=document.createElement('div');
        pGrid.className='gs-swatch-grid';
        for(const d of prestigeDescs)pGrid.appendChild(buildSwatchTile(d));
        pSec.append(pHead,pGrid);
        groupsEl.appendChild(pSec);
      }
    }
  }

  // Armory Finishes (Owned case skins + Factory Default)
  const armoryDescs=[];
  const hasFactoryOwned=owned.some(w=>w.skinId==='factory_slate');
  const armoryItems=hasFactoryOwned?owned:[KnivesSystem.createStarterWeapon(entry.weaponId),...owned];

  for(const item of armoryItems){
    const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const sk=KnivesSystem.WEAPON_SKINS[item.skinId]||KnivesSystem.WEAPON_SKINS.factory_slate;
    const isEq=!equippedCamoId&&baseEquippedItem&&(baseEquippedItem.id===item.id||(!hasFactoryOwned&&item.skinId==='factory_slate'&&baseEquippedItem.skinId==='factory_slate'));
    const special=item.specialTag?` · ${item.specialTag}`:'';
    const stKills=Math.max(0,Math.floor(Number(item.statTrakKills)||0));
    const desc={
      key:`armory:${item.id}`,
      kind:'armory',
      skinId:item.skinId,
      patternSeed:item.patternSeed||0,
      floatValue:0.01,
      statTrakTag:item.statTrak?'ST™':'',
      name:item.statTrak?`StatTrak™ ${sk.name}`:sk.name,
      code:`ARMORY FINISH · ${rar.label.toUpperCase()}${item.statTrak?` · STATTRAK™ (${stKills} KILLS)`:''}`,
      tier:`PATTERN #${item.patternSeed||0}${special}`,
      desc:sk.description||'Armory weapon finish.',
      sub:equippedCamoId?'Equipping an Armory finish clears the active Challenge Camo':'Owned in Armory Inventory',
      accent:rar.color||sk.accent||'#65e7ff',
      unlocked:true,
      equipped:isEq,
      hasProgress:false,
      previewItem:item,
      onEquip:()=>equipArmoryItem(item)
    };
    descriptors.push(desc);
    byKey.set(desc.key,desc);
    armoryDescs.push(desc);
    if(isEq&&!defaultDescriptor)defaultDescriptor=desc;
  }

  if(showArmory){
    const armSec=document.createElement('div');
    armSec.className='gs-swatch-section';
    const armHead=document.createElement('div');
    armHead.className='gs-swatch-sec-head';
    armHead.innerHTML=`<span>ARMORY FINISHES</span><strong>${armoryDescs.length}</strong>`;
    const armGrid=document.createElement('div');
    armGrid.className='gs-swatch-grid';
    for(const d of armoryDescs)armGrid.appendChild(buildSwatchTile(d));
    armSec.append(armHead,armGrid);
    if(owned.length===0){
      const hint=document.createElement('div');
      hint.className='gs-swatch-empty-note';
      hint.textContent='Unbox cases in the Armory to unlock custom finishes for this weapon.';
      armSec.appendChild(hint);
    }
    gsSkinsGridEl.appendChild(armSec);
  }

  const initialDesc=(gunsmithPinnedFinishKey&&byKey.get(gunsmithPinnedFinishKey))
    ||defaultDescriptor
    ||descriptors[0];

  if(initialDesc){
    applySwatchHighlight(initialDesc.key);
    renderInspector(initialDesc);
  }

  if(railEl){
    railEl.onmouseleave=()=>{
      const restore=(gunsmithPinnedFinishKey&&byKey.get(gunsmithPinnedFinishKey))||defaultDescriptor||descriptors[0];
      if(restore){
        applySwatchHighlight(restore.key);
        renderInspector(restore);
      }
      updateGunsmith3DPreview(entry.attachments,'appearance',{resetCamera:false});
    };
  }
}

