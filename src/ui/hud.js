// Shared UI DOM references, runtime UI state, controls legend, and Combat/Arena HUD updates.
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
const loadoutsSyncNoteEl=$('loadoutsSyncNote'),loadoutsBackBtn=$('loadoutsBackBtn'),loadoutsBackIconBtn=$('loadoutsBackIconBtn'),loadoutsArmoryBtn=$('loadoutsArmoryBtn');
const loadoutsEyebrowEl=$('loadoutsEyebrow'),loadoutsTitleEl=$('loadoutsTitle');
const loadoutsOverviewViewEl=$('loadoutsOverviewView'),gunsmithViewEl=$('gunsmithView');
const loadoutsRunnerCanvasEl=$('loadoutsRunnerCanvas'),ldRunnerWeaponTitleEl=$('ldRunnerWeaponTitle'),ldRunnerMetaEl=$('ldRunnerMeta'),ldFiringRangeBtn=$('ldFiringRangeBtn');
const loadoutsRailEl=$('loadoutsRail'),loadoutNameInput=$('loadoutNameInput'),loadoutDuplicateBtn=$('loadoutDuplicateBtn'),loadoutResetBtn=$('loadoutResetBtn'),loadoutsSlotsGridEl=$('loadoutsSlotsGrid');
const gsBackToLoadoutsBtn=$('gsBackToLoadoutsBtn'),gsCrumbEl=$('gsCrumb'),gsWeaponTitleEl=$('gsWeaponTitle'),gsWeaponSubEl=$('gsWeaponSub'),gsWeaponLevelLabelEl=$('gsWeaponLevelLabel'),gsWeaponXpFillEl=$('gsWeaponXpFill'),gsWeaponXpTextEl=$('gsWeaponXpText');
const gsBudgetBadgeEl=$('gsBudgetBadge'),gsAttPipsEl=$('gsAttPips'),gsClearAllBtn=$('gsClearAllBtn'),gsArmoryBtn=$('gsArmoryBtn');
const gsSpatialNodesEl=$('gsSpatialNodes'),gsAttDrawerEl=$('gsAttDrawer'),gsPickerHeadingEl=$('gsPickerHeading'),gsPickerDescEl=$('gsPickerDesc'),gsDrawerCloseBtn=$('gsDrawerCloseBtn');
const gsStatsHudEl=$('gsStatsHud'),gsAppearanceTrayEl=$('gsAppearanceTray'),gsAppearanceHeadingEl=$('gsAppearanceHeading'),gsOpenCasesBtn=$('gsOpenCasesBtn'),gsProgressionTrayEl=$('gsProgressionTray'),gsProgTrackEl=$('gsProgTrack'),gsFiringRangeBtn=$('gsFiringRangeBtn');
const gsAttachmentListEl=$('gsAttachmentList'),gsSkinsGridEl=$('gsSkinsGrid'),gunsmithCanvasEl=$('gunsmithCanvas'),gsStageLabelEl=$('gsStageLabel'),gsStatsBoxEl=$('gsStatsBox');
const armoryBackIconBtn=$('armoryBackIconBtn'),armoryLoadoutsBtn=$('armoryLoadoutsBtn'),pauseReturnStudioBtn=$('pauseReturnStudioBtn');
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
const hudScorestreakEl=$('hudScorestreak'),hudStreakKeyEl=$('hudStreakKey'),hudStreakNameEl=$('hudStreakName'),hudStreakPtsEl=$('hudStreakPts'),hudStreakFillEl=$('hudStreakFill');
const hudKatanaEl=$('hudKatana'),hudKatanaDashEl=$('hudKatanaDash'),hudKatanaDeflectStateEl=$('hudKatanaDeflectState'),hudKatanaDeflectFillEl=$('hudKatanaDeflectFill');
const nukeBannerEl=$('nukeBanner'),nukeTimerEl=$('nukeTimer'),nukeOwnerEl=$('nukeOwner'),nukeFlashEl=$('nukeFlash');
const gauntletHudEl=$('gauntletHud'),hitmarkerEl=$('hitmarker'),damageVignetteEl=$('damageVignette'),chronoVignetteEl=$('chronoVignette');
const awpScopeOverlayEl=$('awpScopeOverlay'),scopeZoomTagEl=$('scopeZoomTag');
const arenaTopBarEl=$('arenaTopBar'),arenaScoreLineEl=$('arenaScoreLine'),arenaSubLineEl=$('arenaSubLine');
const arenaHpWrapEl=$('arenaHpWrap'),hpValEl=$('hpVal'),hpFillEl=$('hpFill');
const killFeedEl=$('killFeed'),arenaScoreboardEl=$('arenaScoreboard'),sbTitleEl=$('sbTitle'),sbSubEl=$('sbSub'),sbTableEl=$('sbTable'),sbActionsEl=$('sbActions');
const sbVoteSectionEl=$('sbVoteSection'),sbVoteTimerEl=$('sbVoteTimer'),sbVoteGridEl=$('sbVoteGrid'),sbRematchBtnEl=$('sbRematchBtn');

// Servers panel refs
const serversBoardList=$('serversBoardList'),serversSyncNote=$('serversSyncNote'),serversBackBtn=$('serversBackBtn');
const hostRoomNameInput=$('hostRoomName'),hostDeployBtn=$('hostDeployBtn'),hostDeployNote=$('hostDeployNote');
const privateCodeInput=$('privateCodeInput'),joinPrivateCodeBtn=$('joinPrivateCodeBtn');
const arenaPreviewCanvas=$('arenaPreviewCanvas'),srvModeOrbitBtn=$('srvModeOrbit'),srvModeFlyBtn=$('srvModeFly');
const arenaPreviewLabelEl=$('arenaPreviewLabel'),arenaPreviewHintEl=$('arenaPreviewHint');
const arenaDetailTitleEl=$('arenaDetailTitle'),arenaDetailSubEl=$('arenaDetailSub'),arenaDetailDescEl=$('arenaDetailDesc'),arenaDetailFeaturesEl=$('arenaDetailFeatures');
const arenaMapGridEl=$('arenaMapGrid'),warmupSelectedBtn=$('warmupSelectedBtn');

// Armory DOM refs
const armoryCoinBalance=$('armoryCoinBalance'),armorySyncNote=$('armorySyncNote'),armoryBackBtn=$('armoryBackBtn');
const armTabCases=$('armTabCases'),armTabInventory=$('armTabInventory');
const armoryCasesSelect=$('armoryCasesSelect'),armoryCaseGrid=$('armoryCaseGrid');
const selectedCaseTitle=$('selectedCaseTitle'),caseOddsLine=$('caseOddsLine'),selectedCasePool=$('selectedCasePool');
const openCaseBtn=$('openCaseBtn'),buyCaseBtn=$('buyCaseBtn'),openCaseHint=$('openCaseHint'),armoryOpenedStat=$('armoryOpenedStat');
const bulkCaseQuantityInput=$('bulkCaseQuantity'),bulkCaseTotalEl=$('bulkCaseTotal'),bulkCaseHintEl=$('bulkCaseHint'),bulkBuyCaseBtn=$('bulkBuyCaseBtn');
const bulkOpenPanelEl=$('bulkCaseOpenBox'),bulkOpenQuantityInput=$('bulkOpenQuantity'),bulkOpenTotalEl=$('bulkOpenTotal'),bulkOpenHintEl=$('bulkOpenHint'),bulkOpenBtn=$('bulkOpenBtn');
const armoryBulkResultsWrap=$('armoryBulkResultsWrap'),bulkDropListEl=$('bulkDropList'),bulkResultsTitleEl=$('bulkResultsTitle'),bulkResultsSubtitleEl=$('bulkResultsSubtitle'),bulkResultsValueEl=$('bulkResultsValue'),bulkResultsConfirmBtn=$('bulkResultsConfirmBtn');
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
let gunsmithTab='gunsmith'; // 'gunsmith' | 'appearance' | 'progression'
let gunsmithDrawerSlot=null; // null or slotId
let gunsmithAttCategory='optic';
let gunsmithHoverAttId=null;
let primaryClassFilter='all';
let pendingLoadoutApply=false;
let firingRangeReturnContext=null; // { screen: 'loadouts'|'gunsmith', slotCategory, loadoutIdx }

// Servers panel state
let serversReturnTarget='menu';
let serversFilterMode='all';
let hostSelectedMap='arena_surf';
let hostSelectedMode='duel_1v1';
let hostSelectedVis='public';
let livePublicLobbies=[];
let unsubPublicLobbies=null;
let lastScoreboardTableSig='';
let lastVoteRenderSig='';

// Armory state
let armoryReturnTarget='menu';
let activeArmoryTab='cases';
let selectedCaseId='velocity';
let bulkCaseQuantity=10;
let bulkOpenQuantity=10;
let pendingBulkDrops=[];
const bulkDropSellIds=new Set();
let pendingBulkOpenCloudSync=Promise.resolve(null);
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
    [`${f(kb.fire)} / ${f(kb.altFire)}`,'Shoot / ADS / Katana Deflect'],
    [`${f(kb.slotRifle)}-${f(kb.slotDeagle)} / ${f(kb.slotKnife)}`,'Primary · Sec · Melee / Swap'],
    ['5','Deploy Scorestreak'],
    [f(kb.reload),'Reload'],
    [f(kb.jump),'Jump / wall jump'],
    [f(kb.slide),'Slide'],
    [f(kb.grapple),'Grapple / Katana Dash (Q)'],
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
  const sig=`${cs.activeSlot}|${cs.weaponId}|${cs.magSize||0}|${cs.primaryBuild?cs.primaryBuild.weaponId:''}|${cs.secondaryBuild?cs.secondaryBuild.weaponId:''}|${cs.activeBuild?cs.activeBuild.attachmentCount:0}|${cs.activeBuild?cs.activeBuild.chronoTier:0}`;

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
    }else if(cs.isKatana){
      hudWeaponName.textContent='RONIN KATANA';
      if(hudBuildMeta)hudBuildMeta.textContent='LMB SLASH · Q AIR-DASH · RMB DEFLECT';
      hudAmmoCur.textContent='BLADE';
      hudAmmoCur.classList.remove('low','shell-rld');
      hudAmmoMax.textContent='';
    }else if(cs.isScorestreak){
      const b=cs.activeBuild;
      hudWeaponName.textContent=b?`★ ${b.name.toUpperCase()}`:'SCORESTREAK';
      if(hudBuildMeta)hudBuildMeta.textContent='SCORESTREAK WEAPON · LIMITED AMMO';
      hudAmmoMax.textContent=`/ ${cs.magSize||0}`;
      lastHudAmmo=-1;
    }else{
      const b=cs.activeBuild;
      hudWeaponName.textContent=b?b.name.toUpperCase():(cs.weaponName||cs.activeSlot).toUpperCase();
      if(hudBuildMeta&&b){
        const surfPct=Math.round((b.surfAirMult||1)*100);
        const modStr=b.attachmentCount>0?` · ${b.attachmentCount}/5 MODS`:'';
        const supStr=b.suppressed?' · SUPP':'';
        const chronoStr=b.hasChronoKit?(b.chronoTier>=2?' · PHASE':' · CHRONO'):'';
        const revStr=b.weaponId==='revolver'?' · LMB 0.2S · RMB FAN':(b.burstCount>1?' · 3-RD BURST':(b.dualWield?' · AKIMBO':''));
        hudBuildMeta.textContent=`SURF ${surfPct}% · ${b.weightKg.toFixed(1)} KG${modStr}${supStr}${chronoStr}${revStr}`;
      }
      hudAmmoMax.textContent=`/ ${cs.magSize||0}`;
      lastHudAmmo=-1;
    }
  }
  if(cs.activeSlot!=='melee'&&!cs.isKatana&&(cs.ammo!==lastHudAmmo||cs.reloading!==lastHudReloading)){
    lastHudAmmo=cs.ammo;
    lastHudReloading=cs.reloading;
    const isShellRld=cs.reloading&&cs.reloadMode==='shell';
    hudAmmoCur.textContent=cs.reloading?(isShellRld?String(cs.ammo):'RLD'):String(cs.ammo);
    hudAmmoCur.classList.toggle('shell-rld',isShellRld);
    hudAmmoCur.classList.toggle('low',!cs.reloading&&cs.ammo<=Math.max(1,Math.ceil((cs.magSize||1)*0.25)));
  }
  if(cs.reloading){
    hudReloadBar.style.display='block';
    hudReloadFill.style.width=`${Math.round(cs.reloadPct*100)}%`;
  }else if(hudReloadBar.style.display!=='none'){
    hudReloadBar.style.display='none';
  }

  // Scorestreak Meter (visible in Arena & Sandbox)
  if(hudScorestreakEl&&cs.scorestreak){
    const showStreak=Boolean(ns.isArena||(level&&level.id==='sandbox'));
    hudScorestreakEl.style.display=showStreak?'block':'none';
    if(showStreak){
      const ss=cs.scorestreak;
      const pct=Math.max(0,Math.min(100,Math.round((ss.points/Math.max(1,ss.cost))*100)));
      hudScorestreakEl.classList.toggle('ready',Boolean(ss.ready&&!cs.isScorestreak));
      hudScorestreakEl.classList.toggle('active-weapon',Boolean(cs.isScorestreak));
      if(hudStreakKeyEl)hudStreakKeyEl.textContent=cs.isScorestreak?'★':'5';
      if(hudStreakNameEl)hudStreakNameEl.textContent=(ss.shortName||ss.name||'STREAK').toUpperCase();
      if(hudStreakPtsEl){
        hudStreakPtsEl.textContent=cs.isScorestreak
          ?`ACTIVE · ${ss.ammo}/${ss.maxAmmo}`
          :(ss.ready?'READY [5]':`${ss.points} / ${ss.cost}`);
      }
      if(hudStreakFillEl){
        hudStreakFillEl.style.width=cs.isScorestreak
          ?`${Math.round((ss.ammo/Math.max(1,ss.maxAmmo))*100)}%`
          :`${pct}%`;
      }
    }
  }

  // Katana Slash-Dash + Time-Limited Deflect Energy Gauge
  if(hudKatanaEl&&cs.katana){
    const showKat=Boolean(cs.katana.equipped);
    hudKatanaEl.style.display=showKat?'block':'none';
    if(showKat){
      const kt=cs.katana;
      const pct=Math.max(0,Math.min(100,Math.round((kt.deflectEnergy||0)*100)));
      const recharging=!kt.deflectActive&&!kt.deflectCanEngage;
      hudKatanaEl.classList.toggle('deflecting',Boolean(kt.deflectActive));
      hudKatanaEl.classList.toggle('recharging',recharging);
      if(hudKatanaDashEl){
        hudKatanaDashEl.textContent=kt.dashReady?'READY':`${kt.dashCooldown.toFixed(1)}S`;
        hudKatanaDashEl.className='hk-val '+(kt.dashReady?'ready':'cool');
      }
      if(hudKatanaDeflectStateEl){
        hudKatanaDeflectStateEl.textContent=kt.deflectActive
          ?`ACTIVE · ${pct}%`
          :(recharging?`RECHARGE ${pct}%`:`${pct}%`);
        hudKatanaDeflectStateEl.className='hk-val '+(kt.deflectActive?'active':(recharging?'cool':'ready'));
      }
      if(hudKatanaDeflectFillEl)hudKatanaDeflectFillEl.style.width=`${pct}%`;
    }
  }

  // Tactical Nuke Inbound Countdown Banner & Flash Overlay
  if(nukeBannerEl&&cs.nuke){
    const nk=cs.nuke;
    const showBanner=Boolean(nk.active&&nk.timer>0);
    nukeBannerEl.style.display=showBanner?'block':'none';
    if(showBanner){
      if(nukeTimerEl)nukeTimerEl.textContent=`${Math.max(0,nk.timer).toFixed(1)}S`;
      if(nukeOwnerEl)nukeOwnerEl.textContent=`DEPLOYED BY ${String(nk.ownerName||'RUNNER').toUpperCase()}`;
    }
    if(nukeFlashEl){
      const fa=nk.flashAlpha>0.01?Math.min(1,nk.flashAlpha):0;
      nukeFlashEl.style.opacity=fa>0?fa.toFixed(2):'0';
    }
  }

  // R-88 Revolver 0.20s double-action charge ring around crosshair
  const revRingEl=$('revolverChargeRing');
  const revArcEl=$('revolverChargeArc');
  if(revRingEl&&revArcEl){
    const cp=cs.chargeTimeSec>0?(cs.chargeProgress||0):0;
    if(cp>0.015){
      const circ=100.53;
      revRingEl.style.opacity=String(Math.min(1,0.35+cp*0.65));
      const scale=1.14-cp*0.26;
      revRingEl.style.transform=`translate(-50%,-50%) rotate(-90deg) scale(${scale.toFixed(3)})`;
      revRingEl.classList.toggle('primed',cp>=0.82);
      revArcEl.style.strokeDashoffset=(circ*(1-Math.min(1,cp))).toFixed(2);
    }else if(revRingEl.style.opacity!=='0'){
      revRingEl.style.opacity='0';
      revRingEl.classList.remove('primed');
      revArcEl.style.strokeDashoffset='100.53';
    }
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
    if(ns.phase==='match_over'&&overlay.style.display==='none'&&document.pointerLockElement===renderer.domElement){
      document.exitPointerLock?.();
    }
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
  const isSandboxSpar=Boolean(level&&level.id==='sandbox'&&ns.role==='warmup');
  const resumeLabelEl=$('resumeLabel');
  if(resumeLabelEl)resumeLabelEl.textContent=ns.isArena?'RESUME MATCH':'RESUME RUN';
  const restartBtnEl=$('restart');
  if(restartBtnEl)restartBtnEl.textContent=ns.isArena?'RESPAWN':'RESTART RUN';
  const pauseLeave=$('pauseLeaveServer');
  if(pauseLeave)pauseLeave.style.display=(ns.isArena&&!isSandboxSpar)?'':'none';
  const pauseRoomCodeBox=$('pauseRoomCodeBox');
  const pauseRoomCode=$('pauseRoomCode');
  const roomCode=ns.isArena&&ns.lobby&&ns.lobby.joinCode?String(ns.lobby.joinCode).toUpperCase():'';
  if(pauseRoomCodeBox)pauseRoomCodeBox.style.display=roomCode?'':'none';
  if(pauseRoomCode)pauseRoomCode.textContent=roomCode||'----';
  const pauseSandboxBtn=$('pauseSandboxBots');
  if(pauseSandboxBtn){
    pauseSandboxBtn.style.display=(level&&level.id==='sandbox')?'':'none';
    pauseSandboxBtn.textContent=(CombatSystem&&typeof CombatSystem.hasActiveWarmupBots==='function'&&CombatSystem.hasActiveWarmupBots())?'REMOVE BOTS':'SPAWN BOTS';
  }
  const pauseBotDiffBox=$('pauseBotDiffBox');
  if(pauseBotDiffBox){
    const showBotDiff=Boolean((level&&level.id==='sandbox')||ns.role==='warmup'||ns.role==='host');
    pauseBotDiffBox.style.display=showBotDiff?'':'none';
  }
  if(pauseReturnStudioBtn){
    const showReturn=Boolean(firingRangeReturnContext&&level&&level.id==='sandbox');
    pauseReturnStudioBtn.style.display=showReturn?'':'none';
    if(showReturn){
      const label=firingRangeReturnContext.screen==='gunsmith'?'← RETURN TO GUNSMITH':'← RETURN TO LOADOUTS';
      pauseReturnStudioBtn.firstElementChild.textContent=label;
    }
  }
  if(!ns.isArena){
    killFeedEl.textContent='';
    return;
  }
  const aiSkill=(window.BotAISystem&&typeof window.BotAISystem.getActiveSkill==='function')
    ?window.BotAISystem.getActiveSkill()
    :{mode:'adaptive',tier:'VETERAN',label:'ADAPTIVE (VETERAN)'};
  const aiLabel=aiSkill.mode==='adaptive'?`ADAPTIVE (${aiSkill.tier})`:`AI: ${aiSkill.tier}`;
  const arenaLabel=(typeof ArenaCatalog!=='undefined'&&ns.mapId&&ArenaCatalog.isValidArenaId(ns.mapId))
    ?ArenaCatalog.getArenaName(ns.mapId).toUpperCase()
    :'ARENA';
  if(ns.role==='warmup'){
    const cs=CombatSystem.getState();
    arenaScoreLineEl.textContent=isSandboxSpar
      ?`SANDBOX SPARRING · ${aiLabel} · ${cs.warmupKills} KILLS`
      :`${arenaLabel} WARMUP · ${aiLabel} · ${cs.warmupKills} KILLS`;
    arenaSubLineEl.textContent=isSandboxSpar
      ?'LIVE AI COMBAT · ESC FOR DIFFICULTY & BOTS · KILLS GRANT GUN XP'
      :'BOT KILLS GRANT GUN XP · ESC TO ADJUST DIFFICULTY · 1-3 WEAPONS';
  }else if(ns.phase==='warmup'){
    const codeTag=ns.lobby&&ns.lobby.isPrivate?` · PRIVATE CODE: ${ns.lobby.joinCode}`:' · LISTED ON PUBLIC BOARD';
    arenaScoreLineEl.textContent=`${arenaLabel} · WAITING (${ns.players.length}/${ns.lobby?ns.lobby.maxPlayers:2})${codeTag}`;
    arenaSubLineEl.textContent=`FIGHT ${aiLabel} BOTS WHILE WAITING · KILLS GRANT GUN XP`;
  }else if(ns.mode==='duel_1v1'){
    const p1=ns.players[0]||{name:'P1',score:0};
    const p2=ns.players[1]||{name:'P2',score:0};
    arenaScoreLineEl.textContent=`${p1.name} ${p1.score}  —  ${p2.score} ${p2.name}  ·  ROUND ${ns.round}`;
    arenaSubLineEl.textContent=ns.phase==='match_over'?`${arenaLabel} · MATCH COMPLETE · VOTE NEXT ARENA`:`${arenaLabel} · 1v1 FIRST TO 5 · HOLD TAB FOR SCOREBOARD`;
  }else{
    const lead=ns.players[0];
    arenaScoreLineEl.textContent=lead
      ?`FFA LEADER: ${lead.name} (${lead.kills}/${CombatSystem.FFA_WIN_KILLS}) · ${ns.players.length} PLAYERS`
      :`${arenaLabel} · FREE-FOR-ALL · FIRST TO ${CombatSystem.FFA_WIN_KILLS}`;
    arenaSubLineEl.textContent=ns.phase==='match_over'?`${arenaLabel} · MATCH COMPLETE · VOTE NEXT ARENA`:`${arenaLabel} · HOLD TAB FOR SCOREBOARD · 2.5S RESPAWN`;
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

function getArenaThumbCached(meta){
  if(!meta)return '';
  const key='arena_thumb_'+meta.id;
  if(thumbCache.has(key))return thumbCache.get(key);
  const url=(typeof renderArenaThumbDataUrl==='function')?renderArenaThumbDataUrl(meta):'';
  if(url)thumbCache.set(key,url);
  return url;
}

function renderArenaScoreboard(ns){
  if(!sbTableEl)return;
  const arenaName=(typeof ArenaCatalog!=='undefined'&&ns.mapId&&ArenaCatalog.isValidArenaId(ns.mapId))
    ?ArenaCatalog.getArenaName(ns.mapId).toUpperCase()
    :'ARENA';
  sbTitleEl.textContent=ns.phase==='match_over'
    ?(ns.matchWinnerUid===ns.localUid?'VICTORY — MATCH COMPLETE':`${ns.matchWinnerName.toUpperCase()} WINS`)
    :(ns.lobby?ns.lobby.roomName.toUpperCase():`${arenaName} SCOREBOARD`);
  sbSubEl.textContent=ns.mode==='duel_1v1'
    ?`${arenaName} · 1v1 DUEL · FIRST TO 5 · ROUND ${ns.round}`
    :`${arenaName} · FREE-FOR-ALL · FIRST TO ${CombatSystem.FFA_WIN_KILLS}`;

  const tableSig=ns.players.map(pl=>`${pl.uid}:${pl.name}:${pl.score}:${pl.kills}:${pl.deaths}`).join('|');
  if(tableSig!==lastScoreboardTableSig){
    lastScoreboardTableSig=tableSig;
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
  }

  // Post-Match Map Voting panel (signature-cached so 60fps updates never drop clicks)
  const mv=ns.mapVote;
  const showVote=Boolean(sbVoteSectionEl&&ns.phase==='match_over'&&mv&&mv.active&&Array.isArray(mv.options)&&mv.options.length>0);
  if(sbVoteSectionEl){
    sbVoteSectionEl.style.display=showVote?'block':'none';
    arenaScoreboardEl.classList.toggle('has-vote',showVote);
    if(showVote){
      const sec=Math.max(0,Math.ceil(mv.remainingSec||0));
      if(sbVoteTimerEl)sbVoteTimerEl.textContent=sec>0?`NEXT MATCH IN ${sec}S`:'LAUNCHING...';
      const voteSig=`${mv.options.join(',')}|${JSON.stringify(mv.votes||{})}|${mv.winnerMapId||''}|${ns.localUid}|${ns.mapId}`;
      if(voteSig!==lastVoteRenderSig&&sbVoteGridEl){
        lastVoteRenderSig=voteSig;
        sbVoteGridEl.textContent='';
        const myVote=mv.votes?mv.votes[ns.localUid]:null;
        const totalVotes=Math.max(1,mv.totalVotes||0);
        for(const optId of mv.options){
          const meta=(typeof ArenaCatalog!=='undefined')?ArenaCatalog.getArenaMeta(optId):null;
          const count=(mv.counts&&mv.counts[optId])||0;
          const isMine=myVote===optId;
          const isLeading=mv.winnerMapId===optId&&mv.totalVotes>0;
          const isRematch=optId===ns.mapId;

          const card=document.createElement('button');
          card.type='button';
          card.className='sb-vote-card'+(isMine?' voted':'')+(isLeading?' leading':'');
          card.setAttribute('aria-pressed',isMine?'true':'false');
          card.onclick=()=>{
            if(typeof NetcodeSystem!=='undefined'&&typeof NetcodeSystem.castMapVote==='function'){
              NetcodeSystem.castMapVote(optId);
            }
          };

          const thumbWrap=document.createElement('div');
          thumbWrap.className='sb-vote-thumb';
          const url=getArenaThumbCached(meta);
          if(url){
            const img=document.createElement('img');
            img.src=url;
            img.alt=meta?meta.name:optId;
            thumbWrap.appendChild(img);
          }
          if(isRematch){
            const tag=document.createElement('span');
            tag.className='sb-vote-rematch';
            tag.textContent='REMATCH';
            thumbWrap.appendChild(tag);
          }

          const body=document.createElement('div');
          body.className='sb-vote-body';
          const nameEl=document.createElement('div');
          nameEl.className='sb-vote-name';
          nameEl.textContent=meta?meta.name:optId;
          const metaRow=document.createElement('div');
          metaRow.className='sb-vote-meta';
          const pacingEl=document.createElement('span');
          pacingEl.textContent=meta?meta.pacing:'Arena';
          const countEl=document.createElement('span');
          countEl.className='sb-vote-count';
          countEl.textContent=count===1?'1 VOTE':`${count} VOTES`;
          metaRow.append(pacingEl,countEl);

          const bar=document.createElement('div');
          bar.className='sb-vote-bar';
          const fill=document.createElement('div');
          fill.className='sb-vote-fill';
          fill.style.width=`${mv.totalVotes>0?Math.round((count/totalVotes)*100):0}%`;
          bar.appendChild(fill);

          body.append(nameEl,metaRow,bar);
          card.append(thumbWrap,body);
          sbVoteGridEl.appendChild(card);
        }
      }
    }else{
      lastVoteRenderSig='';
    }
  }

  if(sbRematchBtnEl){
    if(showVote){
      sbRematchBtnEl.textContent=ns.role==='host'?'LAUNCH LEADING NOW':'REMATCH NOW';
      sbRematchBtnEl.style.display=ns.role==='host'?'':'none';
    }else{
      sbRematchBtnEl.textContent='REMATCH';
      sbRematchBtnEl.style.display='';
    }
  }
  sbActionsEl.style.display=ns.phase==='match_over'?'flex':'none';
}

