// Servers & Arenas board UI (public lobbies, private room codes, 6-arena map picker, live 3D preview, host deploy, solo warmup).
// ---------- Servers & Arenas Board (Serverless WebRTC + Firestore) ----------
function stopServersSubscription(){
  if(unsubPublicLobbies){
    try{unsubPublicLobbies();}catch(_){}
    unsubPublicLobbies=null;
  }
}

function updateArenaPreviewModeButtons(mode){
  const isFly=mode==='flythrough';
  if(srvModeFlyBtn)srvModeFlyBtn.classList.toggle('active',isFly);
  if(srvModeOrbitBtn)srvModeOrbitBtn.classList.toggle('active',!isFly);
  if(arenaPreviewHintEl){
    arenaPreviewHintEl.textContent=isFly
      ?'CINEMATIC FLYTHROUGH · DRAG FOR ORBIT'
      :'DRAG TO ORBIT · SCROLL TO ZOOM';
  }
}

if(typeof ArenaPreview3D!=='undefined'&&ArenaPreview3D.setOnModeChange){
  ArenaPreview3D.setOnModeChange(updateArenaPreviewModeButtons);
}

function getArenaMetaSafe(mapId){
  if(typeof ArenaCatalog==='undefined')return null;
  return ArenaCatalog.getArenaMeta(ArenaCatalog.normalizeArenaId(mapId,'arena_surf'));
}

function selectHostArena(mapId,skipPreview){
  const meta=getArenaMetaSafe(mapId);
  if(!meta)return;
  hostSelectedMap=meta.id;

  if(arenaMapGridEl){
    arenaMapGridEl.querySelectorAll('.arena-map-card').forEach((card)=>{
      const active=card.dataset.arenaId===meta.id;
      card.classList.toggle('selected',active);
      card.setAttribute('aria-selected',active?'true':'false');
    });
  }
  if(arenaDetailTitleEl)arenaDetailTitleEl.textContent=meta.name;
  if(arenaDetailSubEl)arenaDetailSubEl.textContent=`${meta.archetype} · ${meta.pacing}`;
  if(arenaDetailDescEl)arenaDetailDescEl.textContent=meta.description;
  if(arenaDetailFeaturesEl)arenaDetailFeaturesEl.textContent=(meta.features||[]).join(' · ');
  if(arenaPreviewLabelEl)arenaPreviewLabelEl.textContent=`${meta.shortName} · LIVE 3D`;
  if(warmupSelectedBtn)warmupSelectedBtn.textContent=`SOLO BOT WARMUP · ${meta.shortName}`;

  if(!skipPreview&&typeof ArenaPreview3D!=='undefined'&&arenaPreviewCanvas&&serversPanelEl&&serversPanelEl.style.display!=='none'){
    ArenaPreview3D.showCourse(arenaPreviewCanvas,meta);
    updateArenaPreviewModeButtons(ArenaPreview3D.getMode?ArenaPreview3D.getMode():'orbit');
  }
}

function renderArenaMapPicker(){
  if(!arenaMapGridEl||typeof ArenaCatalog==='undefined')return;
  arenaMapGridEl.textContent='';
  for(const meta of ArenaCatalog.ARENA_CATALOG){
    const card=document.createElement('button');
    card.type='button';
    card.className='arena-map-card'+(meta.id===hostSelectedMap?' selected':'');
    card.dataset.arenaId=meta.id;
    card.setAttribute('role','option');
    card.setAttribute('aria-selected',meta.id===hostSelectedMap?'true':'false');

    const thumbWrap=document.createElement('div');
    thumbWrap.className='arena-map-thumb';
    const url=typeof getArenaThumbCached==='function'?getArenaThumbCached(meta):'';
    if(url){
      const img=document.createElement('img');
      img.src=url;
      img.alt=meta.name;
      thumbWrap.appendChild(img);
    }

    const info=document.createElement('div');
    info.className='arena-map-info';
    const title=document.createElement('div');
    title.className='arena-map-name';
    title.textContent=meta.name;
    const pacing=document.createElement('div');
    pacing.className='arena-map-pacing';
    pacing.textContent=meta.pacing;

    info.append(title,pacing);
    card.append(thumbWrap,info);
    card.onclick=()=>selectHostArena(meta.id,false);
    card.ondblclick=()=>launchSoloArenaWarmup(meta.id);
    arenaMapGridEl.appendChild(card);
  }
  selectHostArena(hostSelectedMap,true);
}

function renderServersBoard(){
  if(!serversBoardList)return;
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  const signedIn=!!(st.user&&st.user.uid);
  if(serversSyncNote)serversSyncNote.textContent=signedIn?'LIVE FIRESTORE BOARD':'SIGN IN FOR P2P';
  if(hostDeployBtn)hostDeployBtn.disabled=!signedIn;
  if(hostDeployNote){
    hostDeployNote.textContent=signedIn
      ?'Zero server setup: your room appears instantly on the public board via Firestore and connects players peer-to-peer over WebRTC.'
      :'Sign in with Email, Google, or Private Guest (no email) to host or join live P2P servers. Solo Arena Warmup works immediately.';
  }

  serversBoardList.textContent='';
  if(!signedIn){
    const empty=document.createElement('div');
    empty.className='srv-empty';
    empty.textContent='Sign in with Email, Google, or Private Guest (no email) to browse and join live public servers, or pick any of the 6 arenas for Solo Bot Warmup.';
    serversBoardList.appendChild(empty);
    return;
  }

  const filtered=livePublicLobbies.filter(l=>serversFilterMode==='all'||l.mode===serversFilterMode);
  if(filtered.length===0){
    const empty=document.createElement('div');
    empty.className='srv-empty';
    empty.textContent='No public servers active right now. Pick an arena on the right and click HOST & DEPLOY ARENA — others can join in 1 click.';
    serversBoardList.appendChild(empty);
    return;
  }

  for(const lob of filtered){
    const row=document.createElement('div');
    row.className='srv-row';
    const info=document.createElement('div');
    const title=document.createElement('div');
    title.className='srv-row-title';
    title.textContent=lob.roomName;
    const mapLabel=(typeof ArenaCatalog!=='undefined')
      ?ArenaCatalog.getArenaName(lob.mapId).toUpperCase()
      :(lob.mapId==='arena_surf'?'SURF STADIUM':'AIM COURTYARD');
    const modeLabel=lob.mode==='ffa_4p'?'FFA':'1v1 DUEL';
    const meta=document.createElement('div');
    meta.className='srv-row-meta';
    meta.textContent=`HOST: ${lob.hostName} · ${mapLabel} · ${modeLabel} · ${lob.playerCount}/${lob.maxPlayers}`;
    info.append(title,meta);

    const joinBtn=document.createElement('button');
    joinBtn.type='button';
    joinBtn.className='srv-join-btn';
    const full=lob.playerCount>=lob.maxPlayers;
    joinBtn.disabled=full||(st.user&&lob.hostUid===st.user.uid);
    joinBtn.textContent=full?'FULL':(st.user&&lob.hostUid===st.user.uid?'YOURS':'JOIN');
    joinBtn.onclick=()=>handleJoinLobby(lob);

    row.append(info,joinBtn);
    serversBoardList.appendChild(row);
  }
}

function startServersSubscription(){
  stopServersSubscription();
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  if(!st.user||!st.user.uid){
    livePublicLobbies=[];
    renderServersBoard();
    return;
  }
  unsubPublicLobbies=window.DailyBackend.subscribePublicLobbies((list)=>{
    livePublicLobbies=list||[];
    renderServersBoard();
  });
}

function openServersPanel(returnTo){
  cancelRebind();
  stopRouletteAnimation();
  ArmoryPreview.stop();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  serversReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','studio-full');
  overlayCard.classList.add('browser-wide');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  serversPanelEl.style.display='';
  serversBackBtn.textContent=serversReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='servers';
  document.exitPointerLock?.();
  renderBotDifficultyUi();
  renderServersBoard();
  renderArenaMapPicker();
  // Defer live 3D arena preview boot by 1 frame so canvas clientWidth/Height are laid out
  requestAnimationFrame(()=>{
    if(serversPanelEl&&serversPanelEl.style.display!=='none'){
      selectHostArena(hostSelectedMap,false);
    }
  });
  startServersSubscription();
}

function closeServersPanel(){
  stopServersSubscription();
  if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
  if(serversReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

function launchSoloArenaWarmup(mapId){
  const targetId=(typeof ArenaCatalog!=='undefined')?ArenaCatalog.normalizeArenaId(mapId,'arena_surf'):(mapId||'arena_surf');
  const label=(typeof ArenaCatalog!=='undefined')?ArenaCatalog.getArenaName(targetId).toUpperCase():'ARENA';
  stopServersSubscription();
  if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
  NetcodeSystem.startSoloWarmup(targetId,'duel_1v1');
  loadLevel(targetId,{keepSession:true});
  inLevel=true;
  enter();
  showToast(`${label} WARMUP · SHOOT AI BOTS FOR GUN XP`);
}

async function handleHostDeploy(){
  try{
    hostDeployBtn.disabled=true;
    hostDeployBtn.textContent='DEPLOYING...';
    const lobby=await NetcodeSystem.hostLobby({
      roomName:hostRoomNameInput.value,
      mapId:hostSelectedMap,
      mode:hostSelectedMode,
      isPrivate:hostSelectedVis==='private'
    });
    stopServersSubscription();
    if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
    showToast(lobby.isPrivate?`PRIVATE ARENA READY · CODE ${lobby.joinCode}`:`LIVE ON SERVERS BOARD · ${lobby.roomName.toUpperCase()}`);
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'COULD NOT HOST ARENA');
  }finally{
    hostDeployBtn.disabled=false;
    hostDeployBtn.textContent='HOST & DEPLOY ARENA';
  }
}

async function handleJoinLobby(lobby){
  try{
    showToast(`CONNECTING TO ${lobby.roomName.toUpperCase()}...`);
    await NetcodeSystem.joinLobby(lobby);
    stopServersSubscription();
    if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'COULD NOT JOIN SERVER');
  }
}

async function handleJoinPrivateCode(){
  const raw=(privateCodeInput.value||'').trim().toUpperCase();
  if(raw.length!==4){
    showToast('ENTER A 4-LETTER ROOM CODE');
    return;
  }
  try{
    showToast(`LOOKING UP ROOM ${raw}...`);
    const lobby=await NetcodeSystem.joinByCode(raw);
    stopServersSubscription();
    if(typeof ArenaPreview3D!=='undefined')ArenaPreview3D.stop();
    loadLevel(lobby.mapId,{keepSession:true});
    inLevel=true;
    enter();
  }catch(err){
    showToast((err&&err.message)?err.message.toUpperCase():'ROOM CODE NOT FOUND');
  }
}
