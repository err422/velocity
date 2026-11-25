// Surf & Time Trials master-detail Course Browser UI and interactive 3D preview controls.
// ---------- Surf & Time Trials Course Browser (SurfD-Inspired Master-Detail) ----------
let cbCategory='surf';
let cbSelectedId=null;
let cbReturnTarget='menu';
let cbStatusFilter='all';
let cbTierFilter='all';
let cbFormatFilter='all';
let cbSearchQuery='';
let cbSortBy='recommended';
let cbFilteredCache=[];

function refreshMenuCourseStats(){
  if(typeof CourseCatalog==='undefined')return;
  const surfList=CourseCatalog.getCoursesByCategory('surf');
  const ttList=CourseCatalog.getCoursesByCategory('timetrial');
  const surfDone=surfList.filter(c=>localPbFor(c.id)>0).length;
  const ttDone=ttList.filter(c=>localPbFor(c.id)>0).length;
  if(menuSurfStatEl){
    menuSurfStatEl.textContent=surfDone>0
      ?`${surfList.length} MAPS · T1–T5 · ${surfDone}/${surfList.length} CLEARED`
      :`${surfList.length} MAPS · T1–T5 · LINEAR & STAGED`;
  }
  if(menuTTStatEl){
    menuTTStatEl.textContent=ttDone>0
      ?`${ttList.length} COURSES · ${ttDone}/${ttList.length} CLEARED`
      :`${ttList.length} COURSES · WALLRUN · GRAPPLE · BUNNYHOP`;
  }
}

function updatePreviewModeButtons(mode){
  const isOrbit=mode==='orbit';
  if(cbModeFlyBtn)cbModeFlyBtn.classList.toggle('active',!isOrbit);
  if(cbModeOrbitBtn)cbModeOrbitBtn.classList.toggle('active',isOrbit);
  if(cbPreviewHintEl){
    cbPreviewHintEl.textContent=isOrbit
      ?'ORBIT ACTIVE · DRAG TO ROTATE · SCROLL TO ZOOM'
      :'AUTO FLYTHROUGH · DRAG ANYWHERE TO ORBIT';
  }
}

if(typeof CoursePreview3D!=='undefined'&&CoursePreview3D.setOnModeChange){
  CoursePreview3D.setOnModeChange(updatePreviewModeButtons);
}

function resetBrowserFilters(){
  cbStatusFilter='all';
  cbTierFilter='all';
  cbFormatFilter='all';
  cbSearchQuery='';
  if(cbSearchInput)cbSearchInput.value='';
}

function getFilteredBrowserCourses(){
  if(typeof CourseCatalog==='undefined')return [];
  const all=CourseCatalog.getCoursesByCategory(cbCategory);
  const q=cbSearchQuery.trim().toLowerCase();
  const filtered=all.filter(c=>{
    const pb=localPbFor(c.id);
    if(cbStatusFilter==='todo'&&pb>0)return false;
    if(cbStatusFilter==='done'&&pb<=0)return false;
    if(cbTierFilter!=='all'&&c.tier!==cbTierFilter)return false;
    if(cbCategory==='surf'&&cbFormatFilter!=='all'&&c.format!==cbFormatFilter)return false;
    if(q){
      const hay=`${c.name} ${c.code} ${c.author||''} ${c.description} ${c.theme} ${(c.pieces||[]).join(' ')} t${c.tier}`.toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });

  if(cbSortBy==='tier_asc'){
    filtered.sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
  }else if(cbSortBy==='tier_desc'){
    filtered.sort((a,b)=>b.tier-a.tier||a.name.localeCompare(b.name));
  }else if(cbSortBy==='name_asc'){
    filtered.sort((a,b)=>a.name.localeCompare(b.name));
  }else if(cbSortBy==='pb_asc'){
    filtered.sort((a,b)=>{
      const pa=localPbFor(a.id),pb=localPbFor(b.id);
      if(pa>0&&pb>0)return pa-pb;
      if(pa>0)return -1;
      if(pb>0)return 1;
      return a.tier-b.tier;
    });
  }
  return filtered;
}

const MEDAL_COLORS={GOLD:'#f5c542',SILVER:'#cfe4f2',BRONZE:'#e39a62'};

function renderCourseBrowserFilters(){
  if(!cbFilterRowEl||typeof CourseCatalog==='undefined')return;
  const all=CourseCatalog.getCoursesByCategory(cbCategory);
  const doneCount=all.filter(c=>localPbFor(c.id)>0).length;
  const todoCount=all.length-doneCount;
  cbFilterRowEl.textContent='';

  const mkBtn=(label,count,active,onClick)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cb-filter-btn'+(active?' active':'');
    const lbl=document.createElement('span');
    lbl.textContent=label;
    const cnt=document.createElement('span');
    cnt.className='cb-filter-count';
    cnt.textContent=String(count);
    btn.append(lbl,cnt);
    btn.onclick=onClick;
    cbFilterRowEl.appendChild(btn);
  };
  const mkSep=()=>{
    const sep=document.createElement('span');
    sep.className='cb-filter-sep';
    sep.setAttribute('aria-hidden','true');
    cbFilterRowEl.appendChild(sep);
  };

  const isAllDefault=cbStatusFilter==='all'&&cbTierFilter==='all'&&cbFormatFilter==='all';
  mkBtn('All',all.length,isAllDefault,()=>{
    cbStatusFilter='all';
    cbTierFilter='all';
    cbFormatFilter='all';
    renderCourseBrowser();
  });
  mkBtn('To do',todoCount,cbStatusFilter==='todo',()=>{
    cbStatusFilter=cbStatusFilter==='todo'?'all':'todo';
    renderCourseBrowser();
  });
  mkBtn('Done',doneCount,cbStatusFilter==='done',()=>{
    cbStatusFilter=cbStatusFilter==='done'?'all':'done';
    renderCourseBrowser();
  });

  mkSep();
  for(let t=1;t<=5;t++){
    const cnt=all.filter(c=>c.tier===t).length;
    if(cnt===0)continue;
    mkBtn(`Tier ${t}`,cnt,cbTierFilter===t,()=>{
      cbTierFilter=cbTierFilter===t?'all':t;
      renderCourseBrowser();
    });
  }

  if(cbCategory==='surf'){
    mkSep();
    const linCnt=all.filter(c=>c.format==='linear').length;
    const stgCnt=all.filter(c=>c.format==='staged').length;
    mkBtn('Linear',linCnt,cbFormatFilter==='linear',()=>{
      cbFormatFilter=cbFormatFilter==='linear'?'all':'linear';
      renderCourseBrowser();
    });
    mkBtn('Staged',stgCnt,cbFormatFilter==='staged',()=>{
      cbFormatFilter=cbFormatFilter==='staged'?'all':'staged';
      renderCourseBrowser();
    });
  }
}

function selectBrowserCourse(courseId){
  if(typeof CourseCatalog==='undefined')return;
  const meta=CourseCatalog.getCourseMeta(courseId);
  if(!meta)return;
  cbSelectedId=meta.id;

  if(cbMapListEl){
    cbMapListEl.querySelectorAll('.cb-row').forEach(row=>{
      const isSel=row.dataset.courseId===meta.id;
      row.classList.toggle('selected',isSel);
      row.setAttribute('aria-selected',isSel?'true':'false');
    });
  }

  const pb=localPbFor(meta.id);
  const medal=CourseCatalog.getCourseMedal(meta,pb);
  const tierInfo=CourseCatalog.TIER_INFO[meta.tier]||CourseCatalog.TIER_INFO[1];
  const themeName=(typeof SURF_THEME_SPECS!=='undefined'&&SURF_THEME_SPECS[meta.theme])?SURF_THEME_SPECS[meta.theme].name:meta.theme;

  if(cbDetailTitleEl)cbDetailTitleEl.textContent=meta.name;
  if(cbDetailSubEl)cbDetailSubEl.textContent=`${meta.code} · by ${meta.author||'Velocity Core'} · ${themeName}`;
  if(cbDetailDescEl)cbDetailDescEl.textContent=meta.description;
  if(cbSpecCourseEl){
    cbSpecCourseEl.textContent=meta.format==='staged'
      ?`Staged · ${meta.cpCount} stages`
      :`Linear · ${meta.cpCount} checkpoints`;
  }
  if(cbSpecTierEl){
    cbSpecTierEl.textContent=tierInfo.label;
    cbSpecTierEl.style.color=tierInfo.color||'var(--cyan)';
  }
  if(cbSpecParEl){
    cbSpecParEl.textContent=`${fmt(meta.parGold)} / ${fmt(meta.parSilver)}`;
  }
  if(cbSpecBestEl){
    if(pb>0){
      cbSpecBestEl.textContent=medal?`${fmt(pb)} · ${medal}`:fmt(pb);
      cbSpecBestEl.style.color=(medal&&MEDAL_COLORS[medal])||'var(--cyan)';
    }else{
      cbSpecBestEl.textContent='Not finished yet';
      cbSpecBestEl.style.color='#7b9bb0';
    }
  }
  if(cbSpecPiecesEl){
    cbSpecPiecesEl.textContent=(meta.pieces||[]).join(' · ')||'—';
  }
  if(cbGhostLabelEl){
    cbGhostLabelEl.innerHTML=pb>0
      ?`Race your <b>PB Ghost</b> (${fmt(pb)}) on this course`
      :'Race your <b>PB Ghost</b> (auto-records on first finish)';
  }
  if(cbPlayBtn){
    cbPlayBtn.textContent=`Play ${meta.name}`;
    cbPlayBtn.disabled=false;
  }
  if(cbPreviewLabelEl){
    cbPreviewLabelEl.textContent=`${meta.code.toUpperCase()} · LIVE 3D`;
  }
  updatePreviewModeButtons('flythrough');
  if(typeof CoursePreview3D!=='undefined'&&coursePreviewCanvas){
    CoursePreview3D.setMode('flythrough');
    CoursePreview3D.showCourse(coursePreviewCanvas,meta);
  }
}

function launchBrowserCourse(courseId){
  const id=courseId||cbSelectedId;
  if(!id||!LEVELS[id])return;
  if(cbGhostCheckEl){
    ghostMode=cbGhostCheckEl.checked?'pb':'off';
  }
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  loadLevel(id);
  inLevel=true;
  enter();
}

function renderCourseBrowser(){
  if(typeof CourseCatalog==='undefined'||!cbMapListEl)return;
  const allInCat=CourseCatalog.getCoursesByCategory(cbCategory);
  if(cbEyebrowEl)cbEyebrowEl.textContent=cbCategory==='surf'?'CS SURF CIRCUIT':'MOVEMENT TIME TRIALS';
  if(cbTitleEl)cbTitleEl.textContent=cbCategory==='surf'?'Surf Maps':'Time Trials';
  document.querySelectorAll('[data-cb-cat]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.cbCat===cbCategory);
  });

  renderCourseBrowserFilters();
  const list=getFilteredBrowserCourses();
  cbFilteredCache=list;
  cbMapListEl.textContent='';

  if(cbCountNoteEl){
    const noun=cbCategory==='surf'?'maps':'courses';
    cbCountNoteEl.textContent=list.length===allInCat.length
      ?`${list.length} ${noun} · double-click to play`
      :`${list.length} of ${allInCat.length} ${noun} · double-click to play`;
  }

  if(list.length===0){
    const empty=document.createElement('div');
    empty.className='cb-empty';
    const msg=document.createElement('div');
    msg.textContent='No courses match the active search or filters.';
    const rst=document.createElement('button');
    rst.type='button';
    rst.className='alt';
    rst.textContent='RESET FILTERS';
    rst.onclick=()=>{resetBrowserFilters();renderCourseBrowser();};
    empty.append(msg,rst);
    cbMapListEl.appendChild(empty);
    if(cbPlayBtn)cbPlayBtn.disabled=!cbSelectedId;
    return;
  }

  for(const meta of list){
    const pb=localPbFor(meta.id);
    const medal=CourseCatalog.getCourseMedal(meta,pb);
    const tierInfo=CourseCatalog.TIER_INFO[meta.tier]||CourseCatalog.TIER_INFO[1];

    const row=document.createElement('button');
    row.type='button';
    row.className='cb-row';
    row.dataset.courseId=meta.id;
    row.setAttribute('role','option');

    const mapCell=document.createElement('div');
    mapCell.className='cb-map-cell';
    const thumb=document.createElement('img');
    thumb.className='cb-thumb';
    thumb.alt=`${meta.name} thumbnail`;
    thumb.src=typeof renderCourseThumbDataUrl==='function'?renderCourseThumbDataUrl(meta):'';
    const mapMeta=document.createElement('div');
    mapMeta.className='cb-map-meta';
    const nameEl=document.createElement('div');
    nameEl.className='cb-map-name';
    nameEl.textContent=meta.name;
    const subEl=document.createElement('div');
    subEl.className='cb-map-sub';
    subEl.textContent=`${meta.code} · ${(meta.pieces||[]).slice(0,2).join(' · ')}`;
    mapMeta.append(nameEl,subEl);
    mapCell.append(thumb,mapMeta);

    const typeCell=document.createElement('div');
    typeCell.className='cb-type-cell';
    typeCell.textContent=meta.format==='staged'?'Staged':'Linear';
    const typeSub=document.createElement('span');
    typeSub.className='cb-type-sub';
    typeSub.textContent=meta.format==='staged'?`${meta.cpCount} stages`:`${meta.cpCount} CPs`;
    typeCell.appendChild(typeSub);

    const tierCell=document.createElement('div');
    tierCell.className='cb-tier-cell';
    tierCell.textContent=`T${meta.tier}`;
    tierCell.style.color=tierInfo.color||'var(--cyan)';

    const pbCell=document.createElement('div');
    pbCell.className='cb-pb-cell'+(pb>0?'':' none');
    pbCell.textContent=pb>0?fmt(pb):'—';

    const medalCell=document.createElement('div');
    medalCell.className='cb-medal-cell';
    if(medal){
      medalCell.textContent=medal;
      medalCell.style.color=MEDAL_COLORS[medal]||'#67e8b5';
    }else{
      medalCell.textContent='—';
    }

    row.append(mapCell,typeCell,tierCell,pbCell,medalCell);
    row.onclick=()=>selectBrowserCourse(meta.id);
    row.ondblclick=()=>launchBrowserCourse(meta.id);
    cbMapListEl.appendChild(row);
  }

  const stillVisible=list.find(c=>c.id===cbSelectedId);
  selectBrowserCourse(stillVisible?stillVisible.id:list[0].id);
}

function openCourseBrowser(category,focusCourseId,returnTo){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  ArmoryPreview.stop();
  if(NetcodeSystem.getState().isArena)NetcodeSystem.leaveSession();
  const nextCat=category==='timetrial'?'timetrial':'surf';
  if(nextCat!==cbCategory){
    cbCategory=nextCat;
    resetBrowserFilters();
  }
  cbReturnTarget=returnTo==='pause'&&inLevel?'pause':'menu';
  if(focusCourseId)cbSelectedId=focusCourseId;
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','studio-full');
  overlayCard.classList.add('browser-wide');
  menuEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  armoryPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='';
  if(cbBackBtn)cbBackBtn.textContent=cbReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  if(cbGhostCheckEl)cbGhostCheckEl.checked=ghostMode!=='off';
  document.body.dataset.state='browser';
  document.exitPointerLock?.();
  renderCourseBrowser();
}

function closeCourseBrowser(){
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  if(cbReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

