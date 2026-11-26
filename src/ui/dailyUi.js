// Daily Surf Hub, custom seeds, archive list, leaderboards, and cloud auth/profile hydration.
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
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
    return;
  }
  if(!user||!user.emailVerified||!window.DailyBackend)return;
  if(lastInvSyncedUid===user.uid)return;
  lastInvSyncedUid=user.uid;
  try{
    const res=await window.DailyBackend.loadUserInventory();
    if(!res||!res.cloudSynced){
      updateArmorySyncLabel('LOCAL FALLBACK');
      return;
    }

    const pendingSold=KnivesSystem.loadPendingSoldItems();
    const merged=KnivesSystem.mergeInventories(
      window.activeInventory,
      res.exists?res.inventory:null,
      {
        knivesLoaded:res.knivesLoaded!==false,
        glovesLoaded:res.glovesLoaded!==false,
        weaponsLoaded:res.weaponsLoaded!==false,
        pendingSoldIds:pendingSold,
        localDirty:KnivesSystem.isLocalDirty()
      }
    );

    window.activeInventory=KnivesSystem.saveLocal(merged.inventory);
    ViewmodelSystem.equipGlove(KnivesSystem.getEquippedGlove(window.activeInventory));
    ViewmodelSystem.equipKnife(KnivesSystem.getEquippedKnife(window.activeInventory),false);
    syncEquippedWeaponsToViewmodel();
    updateArmoryBadges();
    if(armoryPanelEl.style.display!=='none'){
      if(activeArmoryTab==='cases')renderArmoryCases();
      else renderArmoryInventory();
    }

    let allCloudOpsOk=!merged.partialCloudLoad;
    if(!res.exists||merged.needsSummarySync){
      try{
        const sumRes=await window.DailyBackend.saveUserInventorySummary(window.activeInventory);
        if(!sumRes||!sumRes.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud inventory summary backfill failed:',err);
      }
    }

    for(const k of merged.missingInCloud.knives){
      try{
        const r=await window.DailyBackend.saveCloudKnife(k,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud knife backfill failed:',k.id,err);
      }
    }
    for(const g of merged.missingInCloud.gloves){
      try{
        const r=await window.DailyBackend.saveCloudGlove(g,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud glove backfill failed:',g.id,err);
      }
    }
    for(const w of merged.missingInCloud.weapons){
      try{
        const r=await window.DailyBackend.saveCloudWeapon(w,window.activeInventory);
        if(!r||!r.saved)allCloudOpsOk=false;
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud weapon backfill failed:',w.id,err);
      }
    }

    // Reconcile any locally-sold items whose cloud delete was interrupted by a reload
    const deleteTasks=[];
    const queuedDeleteIds=new Set();
    for(const entry of pendingSold){
      queuedDeleteIds.add(entry.id);
      deleteTasks.push(entry);
    }
    for(const id of merged.staleInCloud.knives){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'knife'});}
    }
    for(const id of merged.staleInCloud.gloves){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'glove'});}
    }
    for(const id of merged.staleInCloud.weapons){
      if(!queuedDeleteIds.has(id)){queuedDeleteIds.add(id);deleteTasks.push({id,kind:'weapon'});}
    }

    for(const task of deleteTasks){
      try{
        const delRes=task.kind==='weapon'
          ?await window.DailyBackend.deleteCloudWeapon(task.id)
          :task.kind==='glove'
            ?await window.DailyBackend.deleteCloudGlove(task.id)
            :await window.DailyBackend.deleteCloudKnife(task.id);
        if(delRes&&delRes.deleted){
          KnivesSystem.clearPendingSoldItem(task.id);
        }else{
          allCloudOpsOk=false;
        }
      }catch(err){
        allCloudOpsOk=false;
        console.warn('Cloud stale sold-item cleanup failed:',task.id,err);
      }
    }

    if(allCloudOpsOk&&KnivesSystem.loadPendingSoldItems().length===0){
      KnivesSystem.setLocalDirty(false);
      updateArmorySyncLabel('CLOUD SYNCED');
    }else{
      updateArmorySyncLabel('LOCAL FALLBACK');
    }
  }catch(err){
    console.warn('Cloud inventory hydration failed; keeping local inventory intact:',err);
    updateArmorySyncLabel('LOCAL FALLBACK');
  }
}

function updateLoadoutsSyncLabel(override){
  if(!loadoutsSyncNoteEl)return;
  if(override){loadoutsSyncNoteEl.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  loadoutsSyncNoteEl.textContent=(st.user&&st.user.emailVerified)?'CLOUD SYNCED':'LOCAL ONLY';
}

function scheduleCloudLoadoutsSave(){
  if(window.VELOCITY_TEST_MODE){
    updateLoadoutsSyncLabel('DEV SANDBOX · LOCAL ONLY');
    return;
  }
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.emailVerified||!window.DailyBackend||!window.DailyBackend.saveUserLoadouts){
    updateLoadoutsSyncLabel('LOCAL ONLY');
    return;
  }
  updateLoadoutsSyncLabel('SAVING...');
  if(cloudLoadoutsSaveTimer)clearTimeout(cloudLoadoutsSaveTimer);
  cloudLoadoutsSaveTimer=setTimeout(async()=>{
    cloudLoadoutsSaveTimer=null;
    try{
      const saved=await window.DailyBackend.saveUserLoadouts(window.activeLoadouts);
      updateLoadoutsSyncLabel(saved?'CLOUD SYNCED':'LOCAL FALLBACK');
    }catch(_){
      updateLoadoutsSyncLabel('LOCAL FALLBACK');
    }
  },420);
}

async function hydrateCloudLoadoutsForUser(user){
  if(window.VELOCITY_TEST_MODE){
    updateLoadoutsSyncLabel('DEV SANDBOX · LOCAL ONLY');
    return;
  }
  if(!user||!user.emailVerified||!window.DailyBackend||!window.DailyBackend.loadUserLoadouts)return;
  if(lastLoadoutsSyncedUid===user.uid)return;
  lastLoadoutsSyncedUid=user.uid;
  try{
    const cloudDoc=await window.DailyBackend.loadUserLoadouts();
    const mergedState=LoadoutsSystem.mergeLoadoutStates(window.activeLoadouts,cloudDoc);
    window.activeLoadouts=LoadoutsSystem.saveLocal(mergedState);
    selectedLoadoutIdx=window.activeLoadouts.activeIndex;
    applyActiveLoadoutToRuntime({keepSlot:true});
    renderQuickLoadoutStrips();
    if(loadoutsPanelEl&&loadoutsPanelEl.style.display!=='none'){
      if(gunsmithMode)renderGunsmith();
      else renderLoadoutsOverview();
    }
    const cloudSanitized=cloudDoc?LoadoutsSystem.sanitizeLoadoutState(cloudDoc):null;
    const needsSync=!cloudSanitized||JSON.stringify(mergedState)!==JSON.stringify(cloudSanitized);
    if(needsSync){
      if(cloudLoadoutsSaveTimer){clearTimeout(cloudLoadoutsSaveTimer);cloudLoadoutsSaveTimer=null;}
      await window.DailyBackend.saveUserLoadouts(window.activeLoadouts);
    }
    updateLoadoutsSyncLabel('CLOUD SYNCED');
  }catch(err){
    console.warn('Cloud loadouts hydration failed; keeping local loadouts intact:',err);
    updateLoadoutsSyncLabel('LOCAL FALLBACK');
  }
}

function renderAuthUI(user){
  renderAuthHeaderName(user);
  if(user){
    menuAuthBtn.textContent='SIGN OUT';
    hubAuthBtn.textContent='SIGN OUT';
    if(serversAuthBtn)serversAuthBtn.textContent='SIGN OUT';
    hydrateCloudSettingsForUser(user);
    hydrateCloudInventoryForUser(user);
    hydrateCloudLoadoutsForUser(user);
  }else{
    lastSyncedUid=null;
    lastInvSyncedUid=null;
    lastLoadoutsSyncedUid=null;
    menuAuthBtn.textContent='SIGN IN';
    hubAuthBtn.textContent='SIGN IN';
    if(serversAuthBtn)serversAuthBtn.textContent='SIGN IN';
  }
  updateSettingsSyncLabel();
  updateArmorySyncLabel();
  updateLoadoutsSyncLabel();
  updateLeaderboardAuthNote();
  if(settingsPanelEl.style.display!=='none')renderSettingsPanel();
  if(serversPanelEl.style.display!=='none'){
    startServersSubscription();
  }
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
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  inLevel=false;
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide','studio-full');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  pauseEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
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

