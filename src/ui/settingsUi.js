// Settings panel, profile/crosshair/viewmodel controls, and interactive keybind rebinding UI.
function applySettingsToRuntime(){
  const s=window.activeSettings;
  applyCrosshairGlyph(crosshairEl,s.crosshair);
  ViewmodelSystem.applySettings(s);
  renderControlsLegend();
  const user=window.DailyBackend?window.DailyBackend.getState().user:null;
  renderAuthHeaderName(user);
  updateLeaderboardAuthNote();
}

function updateSettingsSyncLabel(override){
  if(!settingsSyncNote)return;
  if(override){settingsSyncNote.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null,online:false};
  if(st.user&&st.user.uid){
    settingsSyncNote.textContent=st.user.isAnonymous?'PRIVATE GUEST · SYNCED':'CLOUD SYNCED';
  }else{
    settingsSyncNote.textContent='LOCAL ONLY';
  }
}

function scheduleCloudSettingsSave(syncNameChange){
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.uid){
    updateSettingsSyncLabel('LOCAL ONLY');
    return;
  }
  updateSettingsSyncLabel('SAVING...');
  if(cloudSaveTimer)clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(async()=>{
    cloudSaveTimer=null;
    try{
      const res=await window.DailyBackend.saveUserSettings(window.activeSettings);
      updateSettingsSyncLabel(res&&res.saved?'CLOUD SYNCED':'LOCAL ONLY');
      if(syncNameChange){
        const todayKey=DailyCourseGen.getTodayDateKey();
        const keysToSync=new Set([todayKey]);
        if(selectedDateKey&&DailyCourseGen.isValidDateKey(selectedDateKey))keysToSync.add(selectedDateKey);
        for(const dk of keysToSync){
          await window.DailyBackend.syncDisplayNameToRun(dk,window.activeSettings.displayName).catch(()=>{});
        }
      }
    }catch(_){
      updateSettingsSyncLabel('LOCAL FALLBACK');
    }
  },350);
}

function commitSettings(nextSettings,opts){
  const options=opts||{};
  window.activeSettings=VelocitySettings.saveLocal(nextSettings);
  applySettingsToRuntime();
  renderSettingsPanel();
  if(!options.skipCloud){
    scheduleCloudSettingsSave(!!options.syncNameChange);
  }
}

function cancelRebind(){
  if(!rebindingActionId)return;
  rebindingActionId=null;
  window.isRebindingInput=false;
  window.removeEventListener('keydown',onRebindKeyDown,true);
  window.removeEventListener('mousedown',onRebindMouseDown,true);
  window.removeEventListener('contextmenu',onRebindContextMenu,true);
  if(keybindHintEl){
    keybindHintEl.textContent='Click any control to rebind. Supports keyboard keys and mouse buttons (LMB, RMB, MMB, Mouse 4/5). Press ESC to cancel.';
  }
  renderKeybindGrid();
}

function applyCapturedToken(token){
  const targetId=rebindingActionId;
  cancelRebind();
  if(!targetId||!VelocitySettings.isValidInputToken(token))return;
  const res=VelocitySettings.rebindAction(window.activeSettings,targetId,token);
  if(!res.changed)return;
  commitSettings(res.settings);
  if(res.swappedWith){
    const otherMeta=VelocitySettings.ACTIONS.find(a=>a.id===res.swappedWith);
    showToast(`BOUND ${VelocitySettings.formatInputToken(token)} · SWAPPED WITH ${(otherMeta?otherMeta.label:res.swappedWith).toUpperCase()}`);
  }else{
    showToast(`BOUND TO ${VelocitySettings.formatInputToken(token)}`);
  }
}

function onRebindKeyDown(e){
  e.preventDefault();
  e.stopPropagation();
  if(e.code==='Escape'){
    cancelRebind();
    return;
  }
  if(VelocitySettings.isValidInputToken(e.code)){
    applyCapturedToken(e.code);
  }
}

function onRebindMouseDown(e){
  e.preventDefault();
  e.stopPropagation();
  const tok=VelocitySettings.mouseButtonToToken(e.button);
  if(tok)applyCapturedToken(tok);
}

function onRebindContextMenu(e){
  e.preventDefault();
  e.stopPropagation();
}

function startRebind(actionId){
  if(rebindingActionId===actionId){cancelRebind();return;}
  cancelRebind();
  rebindingActionId=actionId;
  window.isRebindingInput=true;
  const meta=VelocitySettings.ACTIONS.find(a=>a.id===actionId);
  if(keybindHintEl){
    keybindHintEl.textContent=`Listening for "${meta?meta.label:actionId}" — press any key or mouse button (ESC to cancel).`;
  }
  renderKeybindGrid();
  setTimeout(()=>{
    if(rebindingActionId!==actionId)return;
    window.addEventListener('keydown',onRebindKeyDown,true);
    window.addEventListener('mousedown',onRebindMouseDown,true);
    window.addEventListener('contextmenu',onRebindContextMenu,true);
  },0);
}

function renderKeybindGrid(){
  if(!keybindGridEl)return;
  const kb=window.activeSettings.keybinds;
  keybindGridEl.textContent='';
  for(const act of VelocitySettings.ACTIONS){
    const row=document.createElement('div');
    row.className='kb-row';

    const left=document.createElement('div');
    const grp=document.createElement('span');
    grp.className='kb-group';
    grp.textContent=act.group;
    const nm=document.createElement('span');
    nm.className='kb-name';
    nm.textContent=act.label;
    left.appendChild(grp);
    left.appendChild(nm);

    const btn=document.createElement('button');
    btn.type='button';
    const listening=rebindingActionId===act.id;
    btn.className='bind-btn'+(listening?' listening':'');
    btn.dataset.action=act.id;
    btn.textContent=listening?'PRESS INPUT...':VelocitySettings.formatInputToken(kb[act.id]);
    btn.onclick=()=>startRebind(act.id);

    row.appendChild(left);
    row.appendChild(btn);
    keybindGridEl.appendChild(row);
  }
}

function renderSettingsPanel(){
  const s=window.activeSettings;
  if(document.activeElement!==setDisplayNameInput){
    setDisplayNameInput.value=s.displayName;
  }
  setDisplayNameCount.textContent=`${s.displayName.length} / 32`;
  const user=window.DailyBackend?window.DailyBackend.getState().user:null;
  const effName=getEffectiveUserName(user);
  setDisplayNameNote.textContent=(user&&user.uid)
    ?(user.isAnonymous
      ?`Callsign: "${effName}" · Saved for your Private Guest session on this browser.`
      :`Leaderboard name: "${effName}" · Synced across devices to your account.`)
    :`Active local name: "${effName}" · Sign in with Email, Google, or Private Guest to sync.`;

  setSensRange.value=String(s.sensitivity);
  setSensVal.textContent=s.sensitivity.toFixed(2)+'×';
  setInvertOff.classList.toggle('active',!s.invertY);
  setInvertOn.classList.toggle('active',!!s.invertY);
  setFovRange.value=String(s.baseFov);
  setFovVal.textContent=s.baseFov+'°';
  const vm=s.viewmodel||VelocitySettings.DEFAULT_VIEWMODEL;
  const fmtOff=(v)=>(v>0?'+':'')+Number(v).toFixed(1);
  if(setVmXRange){setVmXRange.value=String(vm.offsetX);setVmXVal.textContent=fmtOff(vm.offsetX);}
  if(setVmYRange){setVmYRange.value=String(vm.offsetY);setVmYVal.textContent=fmtOff(vm.offsetY);}
  if(setVmZRange){setVmZRange.value=String(vm.offsetZ);setVmZVal.textContent=fmtOff(vm.offsetZ);}
  if(setVmFovRange){setVmFovRange.value=String(vm.fov);setVmFovVal.textContent=vm.fov+'°';}

  setChSizeRange.value=String(s.crosshair.size);
  setChSizeVal.textContent=s.crosshair.size+'px';
  document.querySelectorAll('[data-ch-style]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.chStyle===s.crosshair.style);
  });
  document.querySelectorAll('[data-ch-color]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.chColor===s.crosshair.color);
  });
  applyCrosshairGlyph(crosshairPreviewEl,s.crosshair);
  chPreviewLabel.textContent=`${s.crosshair.style.toUpperCase()} · ${s.crosshair.size}PX`;
  chPreviewHex.textContent=s.crosshair.style==='none'?'HIDDEN':s.crosshair.color.toUpperCase();

  renderKeybindGrid();

  if(window.MobileControls&&typeof window.MobileControls.getPrefs==='function'){
    const tp=window.MobileControls.getPrefs();
    document.querySelectorAll('[data-touch-mode]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.touchMode===tp.mode);
    });
    const tsRange=$('setTouchSensRange'),tsVal=$('setTouchSensVal');
    if(tsRange&&tsVal){tsRange.value=String(tp.sensitivity);tsVal.textContent=tp.sensitivity.toFixed(2)+'×';}
    const tScRange=$('setTouchScaleRange'),tScVal=$('setTouchScaleVal');
    if(tScRange&&tScVal){tScRange.value=String(tp.scale);tScVal.textContent=Math.round(tp.scale*100)+'%';}
    const lfOn=$('setTouchLeftFireOn'),lfOff=$('setTouchLeftFireOff');
    if(lfOn&&lfOff){lfOn.classList.toggle('active',!!tp.leftFire);lfOff.classList.toggle('active',!tp.leftFire);}
  }
}

function setSettingsTab(tab){
  cancelRebind();
  activeSettingsTab=tab;
  document.querySelectorAll('[data-set-tab]').forEach(btn=>{
    const on=btn.dataset.setTab===tab;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  document.querySelectorAll('[data-set-pane]').forEach(pane=>{
    pane.style.display=pane.dataset.setPane===tab?'':'none';
  });
}

function openSettings(returnTo){
  cancelRebind();
  stopRouletteAnimation();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  settingsReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('browser-wide','studio-full');
  overlayCard.classList.add('wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  settingsPanelEl.style.display='';
  settingsBackBtn.textContent=settingsReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='settings';
  document.exitPointerLock?.();
  updateSettingsSyncLabel();
  setSettingsTab(activeSettingsTab);
  renderSettingsPanel();
}

function closeSettings(){
  cancelRebind();
  if(settingsReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

