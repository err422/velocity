// Armory hub, CS-style cases, roulette unboxing, bulk open/sell, and 3D inventory showcase UI.
// ---------- Armory, CS Cases & 3D Weapon/Knife/Glove Showcase ----------
function getThumbForItem(item){
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const key=isWeapon
    ?`weapon_${item.weaponType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`
    :isGlove
      ?`glove_${item.gloveType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`
      :`knife_${item.knifeType}_${item.skinId}_${item.patternSeed}_${item.wearGrade}_${item.specialTag}`;
  if(thumbCache.has(key))return thumbCache.get(key);
  const url=isWeapon?renderWeaponThumbDataUrl(item):isGlove?renderGloveThumbDataUrl(item):renderKnifeThumbDataUrl(item);
  if(thumbCache.size>240)thumbCache.clear();
  thumbCache.set(key,url);
  return url;
}

function updateArmoryBadges(){
  const coins=window.activeInventory.coins||0;
  const casesTotal=KnivesSystem.totalCaseCount(window.activeInventory);
  const weaponTotal=(window.activeInventory.weapons||[]).length;
  const knifeTotal=window.activeInventory.knives.length;
  const gloveTotal=window.activeInventory.gloves.length;
  const invTotal=weaponTotal+knifeTotal+gloveTotal;
  if(armoryCoinBalance)armoryCoinBalance.textContent=`${fmtCoins(coins)} COINS`;
  if(menuArmoryBtn){
    menuArmoryBtn.textContent=casesTotal>0
      ?`Armory · ${fmtCoins(coins)}C (${casesTotal})`
      :`Armory · ${fmtCoins(coins)}C`;
  }
  if(armTabCases)armTabCases.textContent=casesTotal>0?`CASE SHOP (${casesTotal})`:'CASE SHOP';
  if(armTabInventory)armTabInventory.textContent=`INVENTORY (${invTotal})`;
  const catW=$('invCatWeapons'),catK=$('invCatKnives'),catG=$('invCatGloves');
  if(catW)catW.textContent=`WEAPONS (${weaponTotal})`;
  if(catK)catK.textContent=`KNIVES (${knifeTotal})`;
  if(catG)catG.textContent=`GLOVES (${gloveTotal})`;
  if(armoryOpenedStat)armoryOpenedStat.textContent=`${window.activeInventory.totalOpened} UNBOXED`;
}

function updateArmorySyncLabel(override){
  if(!armorySyncNote)return;
  if(override){armorySyncNote.textContent=override;return;}
  const st=window.DailyBackend?window.DailyBackend.getState():{user:null};
  armorySyncNote.textContent=(st.user&&st.user.emailVerified)?'CLOUD SYNCED':'LOCAL ONLY';
}

function persistInventorySummary(syncCloud=true,options){
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory,undefined,options);
  KnivesSystem.setLocalDirty(!window.VELOCITY_TEST_MODE);
  updateArmoryBadges();
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
    return Promise.resolve({saved:false,testMode:true});
  }
  if(syncCloud&&window.DailyBackend){
    const st=window.DailyBackend.getState();
    if(st.user&&st.user.emailVerified){
      updateArmorySyncLabel('SAVING...');
      return window.DailyBackend.saveUserInventorySummary(window.activeInventory)
        .then(r=>{
          if(r&&r.saved){
            if(KnivesSystem.loadPendingSoldItems().length===0){
              KnivesSystem.setLocalDirty(false);
            }
            updateArmorySyncLabel('CLOUD SYNCED');
          }else{
            updateArmorySyncLabel('LOCAL ONLY');
          }
          return r;
        })
        .catch(err=>{
          console.warn('Cloud inventory summary sync failed; local backup preserved:',err);
          updateArmorySyncLabel('LOCAL FALLBACK');
          return {saved:false};
        });
    }
  }
  return Promise.resolve({saved:false});
}

function applySpecialTagBadge(el,tag){
  if(!el)return;
  if(!tag){el.style.display='none';return;}
  el.style.display='inline-block';
  el.textContent=tag;
  el.className='arm-special-tag';
  if(tag==='BLUE GEM')el.classList.add('gem');
  else if(tag==='RUBY'||tag==='FIRE & ICE')el.classList.add('ruby');
  else if(tag==='SAPPHIRE')el.classList.add('sapphire');
}

function fillItemSpecs(prefix,item){
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
  const wear=KnivesSystem.getWearGrade(item.floatValue);
  const sk=isWeapon
    ?(KnivesSystem.WEAPON_SKINS[item.skinId]||KnivesSystem.WEAPON_SKINS.factory_slate)
    :isGlove
      ?(KnivesSystem.GLOVE_SKINS[item.skinId]||KnivesSystem.GLOVE_SKINS.tactical_slate)
      :(KnivesSystem.SKINS[item.skinId]||KnivesSystem.SKINS.vanilla);
  const bar=$(prefix+'StageBar');
  if(bar)bar.style.setProperty('--rar-col',rar.color);
  const rarEl=$(prefix+'Rarity');
  if(rarEl){
    if(isWeapon){
      const wt=KnivesSystem.WEAPON_TYPES[item.weaponType];
      rarEl.textContent=`${rar.label} · ${(wt?wt.shortName:'FIREARM').toUpperCase()}`;
    }else if(isGlove){
      rarEl.textContent=`${rar.label} · GLOVES`;
    }else{
      rarEl.textContent=`${rar.label} · KNIFE`;
    }
    rarEl.style.setProperty('--rar-col',rar.color);
  }
  $(prefix+'Title').textContent=KnivesSystem.formatItemFullName(item);
  applySpecialTagBadge($(prefix+'SpecialTag'),item.specialTag);
  $(prefix+'Wear').textContent=`${wear.code} · ${wear.name}`;
  $(prefix+'Float').textContent=KnivesSystem.formatFloat(item.floatValue);
  $(prefix+'Seed').textContent=sk.patternBased?`#${item.patternSeed}`:'FIXED';
  const extraK=$(prefix+'ExtraK'),extraV=$(prefix+'ExtraV');
  if(item.skinId==='case_hardened'){
    extraK.textContent=isGlove?'Knuckle Blue':'Play-Side Blue';
    extraV.textContent=`${item.bluePct}%`;
  }else if(item.skinId==='fade'){
    extraK.textContent='Fade Coverage';
    extraV.textContent=`${item.bluePct}%`;
  }else if(isWeapon){
    const wt=KnivesSystem.WEAPON_TYPES[item.weaponType];
    extraK.textContent='Loadout Slot';
    extraV.textContent=wt?`[${wt.slot}] ${wt.shortName}`:'Firearm';
  }else if(isGlove){
    const gt=KnivesSystem.GLOVE_TYPES[item.gloveType];
    extraK.textContent='Archetype';
    extraV.textContent=gt?gt.shortName:'Standard';
  }else{
    const cDef=KnivesSystem.CASES[item.caseId];
    extraK.textContent='Container';
    extraV.textContent=cDef?cDef.name.replace(' Case',''):'Starter';
  }
  const marker=$(prefix+'FloatMarker');
  if(marker)marker.style.left=`${Math.max(1,Math.min(99,item.floatValue*100))}%`;
}

function mountArmoryCanvas(hostEl,item,gloveItem,mode){
  if(!hostEl||!armoryPreviewCanvas)return;
  if(armoryPreviewCanvas.parentElement!==hostEl){
    const caption=hostEl.querySelector('.arm-stage-caption');
    if(caption)hostEl.insertBefore(armoryPreviewCanvas,caption);
    else hostEl.appendChild(armoryPreviewCanvas);
  }
  const g=gloveItem||KnivesSystem.getEquippedGlove(window.activeInventory);
  if(item&&KnivesSystem.isWeaponItem(item)){
    ArmoryPreview.showWeaponCombo(armoryPreviewCanvas,item,g,{mode:mode||'combo'});
  }else{
    const k=(item&&!KnivesSystem.isGloveItem(item))?item:KnivesSystem.getEquippedKnife(window.activeInventory);
    ArmoryPreview.showCombo(armoryPreviewCanvas,k,g,{mode:mode||'combo'});
  }
}

function stopRouletteAnimation(){
  if(rouletteRafId){
    cancelAnimationFrame(rouletteRafId);
    rouletteRafId=0;
  }
  rouletteFinishCb=null;
}

function renderArmoryCases(){
  if(!armoryCaseGrid)return;
  const coins=window.activeInventory.coins||0;
  armoryCaseGrid.textContent='';
  for(const cid of KnivesSystem.CASE_IDS){
    const c=KnivesSystem.CASES[cid];
    const count=window.activeInventory.caseCounts[cid]||0;
    const price=KnivesSystem.getCasePrice(cid);
    const odds=KnivesSystem.getCaseOdds(cid);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='case-card'+(cid===selectedCaseId?' selected':'');
    btn.style.setProperty('--case-accent',c.accent);
    btn.dataset.caseId=cid;

    const art=document.createElement('div');
    art.className='case-art case-art-'+cid;
    const sigil=document.createElement('span');
    sigil.className='case-sigil';
    sigil.textContent=c.artCode||c.shortName.slice(0,2).toUpperCase();
    sigil.setAttribute('aria-hidden','true');
    const crate=document.createElement('div');
    crate.className='case-crate';
    const lock=document.createElement('div');
    lock.className='case-crate-lock';
    crate.appendChild(lock);
    art.appendChild(crate);
    art.appendChild(sigil);

    const top=document.createElement('div');
    top.className='case-top';
    const nm=document.createElement('span');
    nm.className='case-name';
    nm.textContent=c.name;
    const tier=document.createElement('span');
    tier.className='case-tier';
    tier.textContent=c.tierLabel||'TIER';
    top.appendChild(nm);
    top.appendChild(tier);

    const priceRow=document.createElement('div');
    priceRow.className='case-price-row';
    const pr=document.createElement('span');
    pr.className='case-price';
    pr.textContent=`${fmtCoins(price)} COINS`;
    const own=document.createElement('span');
    own.className='case-owned-tag'+(count>0?'':' odds');
    own.textContent=count>0?`OWNED ×${count}`:`${odds.gold}% GOLD`;
    priceRow.appendChild(pr);
    priceRow.appendChild(own);

    const desc=document.createElement('div');
    desc.className='case-desc';
    desc.textContent=c.description;

    btn.appendChild(art);
    btn.appendChild(top);
    btn.appendChild(priceRow);
    btn.appendChild(desc);
    btn.onclick=()=>{selectedCaseId=cid;renderArmoryCases();};
    armoryCaseGrid.appendChild(btn);
  }

  const sel=KnivesSystem.CASES[selectedCaseId]||KnivesSystem.CASES.velocity;
  const selCount=window.activeInventory.caseCounts[sel.id]||0;
  const selPrice=KnivesSystem.getCasePrice(sel.id);
  const selOdds=KnivesSystem.getCaseOdds(sel.id);
  const canAfford=coins>=selPrice;
  const deficit=Math.max(0,selPrice-coins);

  selectedCaseTitle.textContent=`${sel.name.toUpperCase()} · ${sel.tierLabel} · ${fmtCoins(selPrice)} COINS`;
  if(caseOddsLine){
    caseOddsLine.textContent=`ODDS: ${selOdds.milspec}% MIL-SPEC · ${selOdds.restricted}% RESTRICTED · ${selOdds.classified}% CLASSIFIED · ${selOdds.covert}% COVERT · ${selOdds.gold}% GOLD`;
  }
  selectedCasePool.textContent='';
  const previewTiers=['gold','covert','classified','restricted','milspec'];
  for(const rid of previewTiers){
    const entries=sel.pools[rid]||[];
    const rar=KnivesSystem.RARITIES[rid];
    const picked=rid==='gold'
      ?[...entries.filter(e=>e.itemKind==='knife'||(!e.itemKind&&e.knifeType)).slice(0,2),...entries.filter(e=>e.itemKind==='glove').slice(0,2)]
      :entries.slice(0,2);
    for(const e of picked){
      const tag=document.createElement('span');
      tag.className='case-pool-item';
      tag.style.setProperty('--rar-col',rar.color);
      if(e.itemKind==='weapon'){
        const wShort=KnivesSystem.WEAPON_TYPES[e.weaponType].shortName;
        const wsName=KnivesSystem.WEAPON_SKINS[e.skinId].name;
        tag.textContent=`${wShort} | ${wsName}`;
      }else if(e.itemKind==='glove'){
        const gName=KnivesSystem.GLOVE_TYPES[e.gloveType].name;
        const gsName=KnivesSystem.GLOVE_SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`★ ${gName} | ${gsName}${suffix}`;
      }else{
        const kShort=KnivesSystem.KNIFE_TYPES[e.knifeType].shortName;
        const sName=KnivesSystem.SKINS[e.skinId].name;
        const suffix=e.forceBlueGem?' (Blue Gem)':e.forceGem?' (Gem)':e.forceFireIce?' (Fire & Ice)':e.forceFullFade?' (Full Fade)':'';
        tag.textContent=`★ ${kShort} | ${sName}${suffix}`;
      }
      selectedCasePool.appendChild(tag);
    }
  }

  if(selCount>0){
    openCaseBtn.disabled=false;
    openCaseBtn.textContent=`OPEN OWNED (${selCount})`;
    if(buyCaseBtn){
      buyCaseBtn.style.display='';
      buyCaseBtn.disabled=!canAfford;
      buyCaseBtn.textContent=canAfford
        ?`BUY +1 CASE · ${fmtCoins(selPrice)}C`
        :`NEED ${fmtCoins(deficit)}C TO BUY`;
    }
    openCaseHint.textContent=`Consumes 1 owned container · ${selOdds.gold}% Gold Knives & Gloves`;
  }else{
    if(buyCaseBtn)buyCaseBtn.style.display='none';
    openCaseBtn.disabled=!canAfford;
    openCaseBtn.textContent=canAfford
      ?`BUY & OPEN · ${fmtCoins(selPrice)} COINS`
      :`NEED ${fmtCoins(deficit)} MORE COINS`;
    openCaseHint.textContent=canAfford
      ?`Deducts ${fmtCoins(selPrice)} coins & unlocks immediately · ${selOdds.gold}% Gold`
      :`Beat courses, set PBs, win arenas, or sell skins for ${fmtCoins(deficit)} more coins`;
  }
  updateArmoryBadges();
  updateBulkCaseBuyUI();
  updateBulkCaseOpenUI();
}

function buyCaseOnly(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const res=KnivesSystem.buyCase(window.activeInventory,cid);
  if(!res.purchased){
    showToast(`NEED ${fmtCoins(res.deficit)} MORE COINS`);
    return;
  }
  window.activeInventory=res.inventory;
  persistInventorySummary(true);
  CaseAudio.coinChime('buy');
  renderArmoryCases();
  const cDef=KnivesSystem.CASES[cid];
  showToast(`PURCHASED ${cDef.name.toUpperCase()} · -${fmtCoins(res.price)} COINS`);
}


function updateBulkCaseBuyUI(){
  if(!bulkCaseQuantityInput||!bulkBuyCaseBtn)return;
  const cid=KnivesSystem.CASES[selectedCaseId]?selectedCaseId:'velocity';
  const price=KnivesSystem.getCasePrice(cid);
  const coins=window.activeInventory.coins||0;
  const owned=window.activeInventory.caseCounts[cid]||0;
  const available=Math.max(0,999-owned);
  const raw=Number(bulkCaseQuantityInput.value);
  const qty=Number.isSafeInteger(raw)?raw:0;
  const validQty=qty>=1&&qty<=available;
  const total=qty>0?price*qty:0;
  const deficit=Math.max(0,total-coins);

  bulkCaseQuantityInput.max=String(available);
  bulkCaseTotalEl.textContent=qty>0
    ?`${fmtCoins(qty)} CASES · ${fmtCoins(total)} COINS TOTAL`
    :'CHOOSE HOW MANY CASES TO BUY';
  if(bulkCaseHintEl){
    bulkCaseHintEl.textContent=available>0
      ?`${fmtCoins(price)} COINS EACH · ${fmtCoins(available)} INVENTORY SLOTS AVAILABLE`
      :'CASE STORAGE FULL · OPEN SOME CASES FIRST';
  }
  bulkBuyCaseBtn.disabled=!validQty||coins<total;
  bulkBuyCaseBtn.textContent=!validQty
    ?(available===0?'CASE STORAGE FULL':qty<1?'ENTER A QUANTITY':`MAX ${fmtCoins(available)} CASES`)
    :deficit>0
      ?`NEED ${fmtCoins(deficit)} MORE COINS`
      :`BUY ${fmtCoins(qty)} CASES · ${fmtCoins(total)}C`;

  document.querySelectorAll('[data-case-qty]').forEach(btn=>{
    btn.classList.toggle('active',Number(btn.dataset.caseQty)===qty);
  });
}

function buyCasesInBulk(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const requested=bulkCaseQuantityInput?Number(bulkCaseQuantityInput.value):bulkCaseQuantity;
  const res=KnivesSystem.buyCases(window.activeInventory,cid,requested);
  if(!res.purchased){
    if(res.reason==='INSUFFICIENT_COINS'){
      showToast(`NEED ${fmtCoins(res.deficit)} MORE COINS`);
    }else if(res.reason==='CASE_CAPACITY'){
      showToast(`ONLY ${fmtCoins(res.available)} CASE SLOTS AVAILABLE`);
    }else{
      showToast('ENTER A VALID CASE QUANTITY');
    }
    updateBulkCaseBuyUI();
    return;
  }

  window.activeInventory=res.inventory;
  bulkCaseQuantity=res.quantity;
  persistInventorySummary(true);
  CaseAudio.coinChime('buy');
  renderArmoryCases();
  const cDef=KnivesSystem.CASES[cid];
  showToast(`BULK PURCHASE · ${fmtCoins(res.quantity)} ${cDef.shortName.toUpperCase()} CASES · -${fmtCoins(res.totalCost)} COINS`);
}


function updateBulkCaseOpenUI(){
  if(!bulkOpenPanelEl||!bulkOpenQuantityInput||!bulkOpenBtn)return;
  const cid=KnivesSystem.CASES[selectedCaseId]?selectedCaseId:'velocity';
  const owned=window.activeInventory.caseCounts[cid]||0;
  const maxQty=Math.min(owned,100);
  bulkOpenPanelEl.style.display=owned>1?'':'none';

  if(maxQty>0){
    bulkOpenQuantityInput.max=String(maxQty);
    const current=Number(bulkOpenQuantityInput.value);
    if(!Number.isSafeInteger(current)||current>maxQty){
      bulkOpenQuantity= maxQty>1 ? Math.min(10,maxQty) : maxQty;
      bulkOpenQuantityInput.value=String(bulkOpenQuantity);
    }
  }

  const qty=Number(bulkOpenQuantityInput.value);
  const valid=Number.isSafeInteger(qty)&&qty>=1&&qty<=maxQty;
  if(bulkOpenTotalEl){
    bulkOpenTotalEl.textContent=valid
      ?`OPEN ${fmtCoins(qty)} CASES · ${fmtCoins(qty)} DROPS`
      :`YOU OWN ${fmtCoins(owned)} CASES`;
  }
  if(bulkOpenHintEl){
    bulkOpenHintEl.textContent=owned>100
      ?`${fmtCoins(owned)} OWNED · 100 MAX PER BATCH`
      :`${fmtCoins(owned)} OWNED · EACH DROP CAN BE KEPT OR SOLD`;
  }
  bulkOpenBtn.disabled=!valid;
  bulkOpenBtn.textContent=valid?`OPEN ${fmtCoins(qty)} CASES`:'NOT ENOUGH OWNED CASES';
  document.querySelectorAll('[data-open-case-qty]').forEach(btn=>{
    btn.classList.toggle('active',Number(btn.dataset.openCaseQty)===qty);
  });
}

function bulkDropDisplayName(item){
  return KnivesSystem.formatItemFullName(item);
}

function updateBulkCaseResultsSummary(){
  if(!bulkResultsTitleEl||!bulkResultsConfirmBtn)return;
  const total=pendingBulkDrops.length;
  const sellItems=pendingBulkDrops.filter(item=>bulkDropSellIds.has(item.id));
  const sellValue=sellItems.reduce((sum,item)=>sum+KnivesSystem.getItemSellValue(item),0);
  const keepCount=total-sellItems.length;
  bulkResultsTitleEl.textContent=`${fmtCoins(total)} CASES OPENED`;
  if(bulkResultsSubtitleEl){
    bulkResultsSubtitleEl.textContent=`${fmtCoins(keepCount)} KEEP · ${fmtCoins(sellItems.length)} MARKED TO SELL`;
  }
  if(bulkResultsValueEl){
    bulkResultsValueEl.textContent=sellItems.length
      ?`POTENTIAL SALE · +${fmtCoins(sellValue)} COINS`
      :'NO ITEMS MARKED FOR SALE';
  }
  bulkResultsConfirmBtn.disabled=total===0;
  bulkResultsConfirmBtn.textContent=sellItems.length
    ?`REVIEW SALE · SELL ${fmtCoins(sellItems.length)} / KEEP ${fmtCoins(keepCount)} · +${fmtCoins(sellValue)}C`
    :`KEEP ALL ${fmtCoins(total)} DROPS`;
}

function renderBulkCaseResults(){
  if(!bulkDropListEl)return;
  bulkDropListEl.textContent='';
  for(const item of pendingBulkDrops){
    const rarity=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const sellValue=KnivesSystem.getItemSellValue(item);
    const marked=bulkDropSellIds.has(item.id);
    const row=document.createElement('div');
    row.className='bulk-drop-row'+(marked?' marked-sell':'');
    row.style.setProperty('--rar-col',rarity.color);

    const thumb=document.createElement('img');
    thumb.className='bulk-drop-thumb';
    thumb.src=getThumbForItem(item);
    thumb.alt=bulkDropDisplayName(item);
    thumb.loading='lazy';

    const details=document.createElement('div');
    details.className='bulk-drop-details';
    const name=document.createElement('div');
    name.className='bulk-drop-name';
    name.textContent=bulkDropDisplayName(item);
    const meta=document.createElement('div');
    meta.className='bulk-drop-meta';
    const parts=[rarity.label,item.wearGrade||KnivesSystem.getWearGrade(item.floatValue).code,
      `FLOAT ${KnivesSystem.formatFloat(item.floatValue)}`,`#${item.patternSeed}`];
    if(item.specialTag)parts.push(item.specialTag);
    meta.textContent=parts.join(' · ');
    details.appendChild(name);
    details.appendChild(meta);

    const right=document.createElement('div');
    right.className='bulk-drop-right';
    const value=document.createElement('div');
    value.className='bulk-drop-value';
    value.textContent=`SELL VALUE · ${fmtCoins(sellValue)}C`;
    const decision=document.createElement('button');
    decision.type='button';
    decision.className='bulk-drop-decision'+(marked?' sell':' keep');
    decision.textContent=marked?`SELL · +${fmtCoins(sellValue)}C`:'KEEP';
    decision.setAttribute('aria-pressed',marked?'true':'false');
    decision.onclick=()=>{
      if(marked)bulkDropSellIds.delete(item.id);
      else bulkDropSellIds.add(item.id);
      renderBulkCaseResults();
    };
    right.appendChild(value);
    right.appendChild(decision);
    row.appendChild(thumb);
    row.appendChild(details);
    row.appendChild(right);
    bulkDropListEl.appendChild(row);
  }
  updateBulkCaseResultsSummary();
}

function saveBulkOpenedItemsToCloud(items){
  const snapshot=window.activeInventory;
  const summaryPromise=persistInventorySummary(true);
  pendingBulkOpenCloudSync=Promise.resolve(summaryPromise).then(async summary=>{
    if(window.VELOCITY_TEST_MODE||!window.DailyBackend||!summary||!summary.saved){
      return {saved:false};
    }
    const st=window.DailyBackend.getState();
    if(!st.user||!st.user.emailVerified)return {saved:false};

    const outcomes=[];
    for(let i=0;i<items.length;i+=10){
      const chunk=items.slice(i,i+10);
      const chunkResults=await Promise.allSettled(chunk.map(item=>{
        if(KnivesSystem.isWeaponItem(item))return window.DailyBackend.saveCloudWeapon(item,snapshot);
        if(KnivesSystem.isGloveItem(item))return window.DailyBackend.saveCloudGlove(item,snapshot);
        return window.DailyBackend.saveCloudKnife(item,snapshot);
      }));
      outcomes.push(...chunkResults);
    }
    const allSaved=outcomes.length===items.length&&outcomes.every(result=>
      result.status==='fulfilled'&&result.value&&result.value.saved
    );
    if(allSaved){
      if(KnivesSystem.loadPendingSoldItems().length===0)KnivesSystem.setLocalDirty(false);
      updateArmorySyncLabel('CLOUD SYNCED');
    }else{
      updateArmorySyncLabel('LOCAL FALLBACK');
    }
    return {saved:allSaved};
  }).catch(err=>{
    console.warn('Bulk case cloud sync failed; items remain saved locally:',err);
    updateArmorySyncLabel('LOCAL FALLBACK');
    return {saved:false};
  });
  return pendingBulkOpenCloudSync;
}

function openCasesInBulk(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const requested=bulkOpenQuantityInput?Number(bulkOpenQuantityInput.value):bulkOpenQuantity;
  const result=KnivesSystem.openCases(window.activeInventory,cid,requested);
  if(!result.opened){
    if(result.reason==='INSUFFICIENT_CASES'){
      showToast(`YOU ONLY OWN ${fmtCoins(result.available)} CASES`);
    }else if(result.reason==='QUANTITY_LIMIT'){
      showToast('MAXIMUM 100 CASES PER BULK OPEN');
    }else{
      showToast('ENTER A VALID BULK OPEN QUANTITY');
    }
    updateBulkCaseOpenUI();
    return;
  }

  window.activeInventory=result.inventory;
  pendingBulkDrops=result.items;
  bulkDropSellIds.clear();
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory);
  KnivesSystem.setLocalDirty(!window.VELOCITY_TEST_MODE);
  updateArmoryBadges();
  saveBulkOpenedItemsToCloud(result.items);
  renderBulkCaseResults();
  showCasesView('bulk');
  const caseDef=KnivesSystem.CASES[cid];
  showToast(`OPENED ${fmtCoins(result.quantity)} ${caseDef.shortName.toUpperCase()} CASES · REVIEW YOUR DROPS`);
}

function finishBulkCaseReview(){
  const sellItems=pendingBulkDrops.filter(item=>bulkDropSellIds.has(item.id));
  if(sellItems.length===0){
    pendingBulkDrops=[];
    bulkDropSellIds.clear();
    pendingBulkOpenCloudSync=Promise.resolve(null);
    showCasesView('select');
    renderArmoryCases();
    showToast('ALL DROPS KEPT · ADDED TO INVENTORY');
    return;
  }
  openSellConfirmModal(sellItems,'bulk-case');
}

function showCasesView(mode){
  armoryCasesSelect.style.display=mode==='select'?'':'none';
  armoryRouletteWrap.style.display=mode==='roulette'?'':'none';
  armoryRevealWrap.style.display=mode==='reveal'?'':'none';
  if(armoryBulkResultsWrap)armoryBulkResultsWrap.style.display=mode==='bulk'?'':'none';
  if(mode!=='reveal')ArmoryPreview.stop();
}

function weaponEquipField(weaponType){
  if(weaponType==='smg')return 'equippedSmgId';
  if(weaponType==='shotgun')return 'equippedShotgunId';
  if(weaponType==='awp')return 'equippedAwpId';
  if(weaponType==='revolver')return 'equippedRevolverId';
  if(weaponType==='deagle')return 'equippedDeagleId';
  if(weaponType==='pistol')return 'equippedPistolId';
  return 'equippedRifleId';
}

function isWeaponEquipped(item){
  if(!item||!KnivesSystem.isWeaponItem(item))return false;
  return window.activeInventory[weaponEquipField(item.weaponType)]===item.id;
}

function refreshRevealActionButtons(){
  if(!lastRevealedItem)return;
  const item=lastRevealedItem;
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  const isEq=KnivesSystem.isItemEquippedInInventory(window.activeInventory,item);
  $('revealEquipBtn').textContent=isEq?'EQUIPPED':(isWeapon?'EQUIP SKIN':isGlove?'EQUIP GLOVES':'EQUIP KNIFE');
  $('revealEquipBtn').disabled=isEq;

  const sellCheck=KnivesSystem.isItemSellable(window.activeInventory,item);
  const wear=KnivesSystem.getWearGrade(item.floatValue);
  if(revealValueLine){
    revealValueLine.textContent=`MARKET VALUE · ${fmtCoins(sellCheck.value)} COINS · ${wear.code}`;
  }
  if(revealSellBtn){
    revealSellBtn.disabled=!sellCheck.sellable;
    revealSellBtn.textContent=sellCheck.sellable
      ?`QUICK SELL · +${fmtCoins(sellCheck.value)}C`
      :sellCheck.reason;
  }

  const cid=KnivesSystem.CASES[selectedCaseId]?selectedCaseId:'velocity';
  const remCount=window.activeInventory.caseCounts[cid]||0;
  const price=KnivesSystem.getCasePrice(cid);
  const coins=window.activeInventory.coins||0;
  const openAgainBtn=$('revealOpenAgainBtn');
  if(remCount>0){
    openAgainBtn.disabled=false;
    openAgainBtn.textContent=`OPEN OWNED (${remCount})`;
  }else if(coins>=price){
    openAgainBtn.disabled=false;
    openAgainBtn.textContent=`BUY & OPEN · ${fmtCoins(price)}C`;
  }else{
    openAgainBtn.disabled=true;
    openAgainBtn.textContent=`NEED ${fmtCoins(price-coins)}C`;
  }
}

function showRevealStage(item){
  stopRouletteAnimation();
  lastRevealedItem=item;
  const isGlove=KnivesSystem.isGloveItem(item);
  const isWeapon=KnivesSystem.isWeaponItem(item);
  if(isWeapon)selectedInvWeaponId=item.id;
  else if(isGlove)selectedInvGloveId=item.id;
  else selectedInvKnifeId=item.id;
  showCasesView('reveal');
  fillItemSpecs('reveal',item);
  refreshRevealActionButtons();
  const revTrickBtn=$('revealTrickBtn'),revMythicBtn=$('revealMythicBtn');
  if(revTrickBtn){
    revTrickBtn.style.display='';
    revTrickBtn.textContent=isWeapon?'INSPECT':'PLAY TRICK';
  }
  if(revMythicBtn){
    revMythicBtn.style.display='';
    revMythicBtn.textContent=isWeapon?(item.weaponType==='revolver'?'MYTHIC ★':'RARE TRICK ★'):'MYTHIC ★';
  }
  const previewGlove=isGlove?item:KnivesSystem.getEquippedGlove(window.activeInventory);
  const previewItem=isGlove?KnivesSystem.getEquippedKnife(window.activeInventory):item;
  mountArmoryCanvas(armoryRevealStage,previewItem,previewGlove,'combo');
  CaseAudio.reveal(item.rarity);
}

function startCaseUnboxing(caseId){
  const cid=KnivesSystem.CASES[caseId]?caseId:'velocity';
  const cDef=KnivesSystem.CASES[cid];
  let curCount=window.activeInventory.caseCounts[cid]||0;
  if(curCount<=0){
    const bought=KnivesSystem.buyCase(window.activeInventory,cid);
    if(!bought.purchased){
      showToast(`NEED ${fmtCoins(bought.deficit)} MORE COINS FOR ${cDef.shortName.toUpperCase()}`);
      renderArmoryCases();
      return;
    }
    window.activeInventory=bought.inventory;
    curCount=window.activeInventory.caseCounts[cid]||0;
    CaseAudio.coinChime('buy');
  }
  selectedCaseId=cid;
  const roll=KnivesSystem.rollCaseDrop(cid);
  const isGloveWin=KnivesSystem.isGloveItem(roll.winner);
  const isWeaponWin=KnivesSystem.isWeaponItem(roll.winner);

  // Commit immediately so the drop is safe even if user skips or closes Armory
  window.activeInventory.caseCounts[cid]=Math.max(0,curCount-1);
  window.activeInventory.totalOpened=(window.activeInventory.totalOpened||0)+1;
  if(isWeaponWin){
    window.activeInventory.weapons.unshift(roll.winner);
  }else if(isGloveWin){
    window.activeInventory.gloves.unshift(roll.winner);
  }else{
    window.activeInventory.knives.unshift(roll.winner);
  }
  // Save locally first so a force-reload mid-spin can NEVER lose the unboxed skin
  window.activeInventory=KnivesSystem.saveLocal(window.activeInventory);
  KnivesSystem.setLocalDirty(!window.VELOCITY_TEST_MODE);
  updateArmoryBadges();
  if(window.VELOCITY_TEST_MODE){
    updateArmorySyncLabel('TEST MODE · LOCAL ONLY');
  }else if(window.DailyBackend){
    const st=window.DailyBackend.getState();
    if(st.user&&st.user.emailVerified){
      const invSnapshot=window.activeInventory;
      const wonItem=roll.winner;
      updateArmorySyncLabel('SAVING...');
      window.DailyBackend.saveUserInventorySummary(invSnapshot)
        .then(sumRes=>{
          if(!sumRes||!sumRes.saved)return {saved:false};
          if(isWeaponWin)return window.DailyBackend.saveCloudWeapon(wonItem,invSnapshot);
          if(isGloveWin)return window.DailyBackend.saveCloudGlove(wonItem,invSnapshot);
          return window.DailyBackend.saveCloudKnife(wonItem,invSnapshot);
        })
        .then(itemRes=>{
          if(itemRes&&itemRes.saved){
            if(KnivesSystem.loadPendingSoldItems().length===0){
              KnivesSystem.setLocalDirty(false);
            }
            updateArmorySyncLabel('CLOUD SYNCED');
          }else{
            updateArmorySyncLabel('LOCAL FALLBACK');
          }
        })
        .catch(err=>{
          console.warn('Cloud skin save failed; preserved locally for automatic backfill:',err);
          updateArmorySyncLabel('LOCAL FALLBACK');
        });
    }
  }

  showCasesView('roulette');
  rouletteCaseLabel.textContent=`UNLOCKING ${cDef.name.toUpperCase()}`;
  rouletteStatus.textContent='ROLLING PATTERN SEED & WEAR FLOAT...';

  // Populate 45-card roulette strip
  rouletteTrack.textContent='';
  rouletteTrack.style.transform='translate3d(0px,0,0)';
  for(const cardItem of roll.strip){
    const isGloveCard=KnivesSystem.isGloveItem(cardItem);
    const isWeaponCard=KnivesSystem.isWeaponItem(cardItem);
    const rar=KnivesSystem.RARITIES[cardItem.rarity]||KnivesSystem.RARITIES.milspec;
    const card=document.createElement('div');
    card.className='roulette-card'+(cardItem.rarity==='gold'?' gold':'');
    card.style.setProperty('--rar-col',rar.color);

    const img=document.createElement('img');
    img.className='roulette-thumb';
    img.alt=KnivesSystem.formatItemFullName(cardItem);
    img.src=getThumbForItem(cardItem);

    const info=document.createElement('div');
    const kn=document.createElement('div');
    kn.className='roulette-kname';
    kn.textContent=isWeaponCard
      ?KnivesSystem.WEAPON_TYPES[cardItem.weaponType].name
      :isGloveCard
        ?KnivesSystem.GLOVE_TYPES[cardItem.gloveType].name
        :KnivesSystem.KNIFE_TYPES[cardItem.knifeType].name;
    const sn=document.createElement('div');
    sn.className='roulette-sname';
    const skinName=isWeaponCard
      ?KnivesSystem.WEAPON_SKINS[cardItem.skinId].name
      :isGloveCard
        ?KnivesSystem.GLOVE_SKINS[cardItem.skinId].name
        :KnivesSystem.SKINS[cardItem.skinId].name;
    sn.textContent=cardItem.specialTag?`${skinName} · ${cardItem.specialTag}`:skinName;
    info.appendChild(kn);
    info.appendChild(sn);

    card.appendChild(img);
    card.appendChild(info);
    rouletteTrack.appendChild(card);
  }

  const CARD_W=148;
  const GAP=8;
  const PITCH=CARD_W+GAP;
  const vpW=Math.max(300,rouletteViewport.clientWidth||780);
  const targetX=roll.winIndex*PITCH+CARD_W*0.5+roll.landingJitter*CARD_W-vpW*0.5;
  const DURATION=4200;
  const t0=performance.now();
  let lastCrossedIdx=-1;

  rouletteFinishCb=()=>showRevealStage(roll.winner);

  function stepRoulette(now){
    const elapsed=now-t0;
    const p=Math.min(1,elapsed/DURATION);
    const eased=1-Math.pow(1-p,4);
    const curX=targetX*eased;
    rouletteTrack.style.transform=`translate3d(${-curX.toFixed(1)}px,0,0)`;

    const centerIdx=Math.floor((curX+vpW*0.5)/PITCH);
    if(centerIdx!==lastCrossedIdx){
      lastCrossedIdx=centerIdx;
      CaseAudio.tick(Math.max(0.05,1-p));
    }

    if(p<1){
      rouletteRafId=requestAnimationFrame(stepRoulette);
    }else{
      rouletteRafId=0;
      rouletteStatus.textContent=`UNBOXED: ${KnivesSystem.formatItemFullName(roll.winner).toUpperCase()}`;
      setTimeout(()=>{
        if(rouletteFinishCb){
          const fn=rouletteFinishCb;
          rouletteFinishCb=null;
          fn();
        }
      },260);
    }
  }
  rouletteRafId=requestAnimationFrame(stepRoulette);
}

function equipWeaponById(weaponId){
  const found=(window.activeInventory.weapons||[]).find(w=>w.id===weaponId);
  if(!found)return;
  window.activeInventory[weaponEquipField(found.weaponType)]=found.id;
  if(window.activeLoadouts&&window.activeLoadouts.equippedWeaponSkins){
    window.activeLoadouts.equippedWeaponSkins[found.weaponType]=found.id;
    window.activeLoadouts=LoadoutsSystem.saveLocal(window.activeLoadouts);
    scheduleCloudLoadoutsSave();
  }
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipWeaponSkin(found);
  applyActiveLoadoutToRuntime({keepSlot:true});
  showToast(`EQUIPPED ${KnivesSystem.formatWeaponFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function equipKnifeById(knifeId){
  const found=window.activeInventory.knives.find(k=>k.id===knifeId);
  if(!found)return;
  window.activeInventory.equippedKnifeId=found.id;
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipKnife(found,true);
  showToast(`EQUIPPED ${KnivesSystem.formatKnifeFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function equipGloveById(gloveId){
  const found=window.activeInventory.gloves.find(g=>g.id===gloveId);
  if(!found)return;
  window.activeInventory.equippedGloveId=found.id;
  bulkSelectedIds.delete(found.id);
  persistInventorySummary(true);
  ViewmodelSystem.equipGlove(found);
  showToast(`EQUIPPED ${KnivesSystem.formatGloveFullName(found).toUpperCase()}`);
  if(activeArmoryTab==='inventory')renderArmoryInventory();
  if(lastRevealedItem&&lastRevealedItem.id===found.id)refreshRevealActionButtons();
}

function getAllInventoryItems(){
  return [
    ...(window.activeInventory.weapons||[]),
    ...(window.activeInventory.knives||[]),
    ...(window.activeInventory.gloves||[])
  ];
}

function getVisibleInventoryList(){
  const isWeaponCat=invCategory==='weapons';
  const isGloveCat=invCategory==='gloves';
  const sourceList=isWeaponCat?(window.activeInventory.weapons||[]):isGloveCat?window.activeInventory.gloves:window.activeInventory.knives;
  return sourceList.filter(it=>invFilterType==='all'||(isWeaponCat?it.weaponType===invFilterType:isGloveCat?it.gloveType===invFilterType:it.knifeType===invFilterType));
}

function closeSellConfirmModal(){
  pendingSale=null;
  if(sellConfirmModal)sellConfirmModal.style.display='none';
}

function openSellConfirmModal(items,mode){
  if(!sellConfirmModal)return;
  const valid=[];
  let totalCoins=0;
  let highValueCount=0;
  for(const item of (items||[])){
    const check=KnivesSystem.isItemSellable(window.activeInventory,item);
    if(!check.sellable)continue;
    valid.push({item,value:check.value});
    totalCoins+=check.value;
    if(item.rarity==='covert'||item.rarity==='gold')highValueCount++;
  }
  if(valid.length===0){
    showToast('NO SELLABLE SKINS SELECTED');
    return;
  }

  pendingSale={items:valid.map(v=>v.item),mode:mode||'single',totalCoins};
  const curCoins=window.activeInventory.coins||0;
  const nextCoins=Math.min(KnivesSystem.ECONOMY.MAX_COINS,curCoins+totalCoins);

  if(sellConfirmTitle){
    sellConfirmTitle.textContent=valid.length===1
      ?'Sell Skin for Coins?'
      :`Sell ${valid.length} Skins for ${fmtCoins(totalCoins)} Coins?`;
  }
  if(sellConfirmSub){
    sellConfirmSub.textContent=valid.length===1
      ?'This skin will be permanently removed from your inventory and converted to coins.'
      :`These ${valid.length} skins will be permanently removed from your inventory. Starter and equipped items are always protected.`;
  }
  if(sellConfirmWarn){
    if(highValueCount>0){
      sellConfirmWarn.style.display='';
      sellConfirmWarn.textContent=`HIGH-VALUE WARNING: Includes ${highValueCount} rare Covert / Exceedingly Rare Gold item${highValueCount>1?'s':''}.`;
    }else{
      sellConfirmWarn.style.display='none';
    }
  }

  if(sellConfirmList){
    sellConfirmList.textContent='';
    const previewCap=12;
    const shown=valid.slice(0,previewCap);
    for(const entry of shown){
      const rar=KnivesSystem.RARITIES[entry.item.rarity]||KnivesSystem.RARITIES.milspec;
      const row=document.createElement('div');
      row.className='sell-modal-row';
      row.style.setProperty('--rar-col',rar.color);

      const left=document.createElement('div');
      left.style.minWidth='0';
      left.style.display='flex';
      left.style.alignItems='baseline';
      const nm=document.createElement('span');
      nm.className='sell-modal-row-name';
      nm.textContent=KnivesSystem.formatItemFullName(entry.item);
      const mt=document.createElement('span');
      mt.className='sell-modal-row-meta';
      mt.textContent=`${entry.item.wearGrade}${entry.item.specialTag?' · '+entry.item.specialTag:''}`;
      left.appendChild(nm);
      left.appendChild(mt);

      const val=document.createElement('span');
      val.className='sell-modal-row-val';
      val.textContent=`+${fmtCoins(entry.value)}C`;

      row.appendChild(left);
      row.appendChild(val);
      sellConfirmList.appendChild(row);
    }
    if(valid.length>previewCap){
      const extra=valid.length-previewCap;
      const moreRow=document.createElement('div');
      moreRow.className='sell-modal-row';
      moreRow.style.setProperty('--rar-col','#65e7ff');
      const moreTxt=document.createElement('span');
      moreTxt.className='sell-modal-row-meta';
      moreTxt.style.marginLeft='0';
      moreTxt.textContent=`+ ${extra} MORE SKIN${extra>1?'S':''} INCLUDED IN SALE`;
      moreRow.appendChild(moreTxt);
      sellConfirmList.appendChild(moreRow);
    }
  }

  if(sellConfirmBalance){
    sellConfirmBalance.innerHTML=`<span>BALANCE</span><span>${fmtCoins(curCoins)} → ${fmtCoins(nextCoins)} COINS (+${fmtCoins(totalCoins)}C)</span>`;
  }
  if(sellConfirmYesBtn){
    sellConfirmYesBtn.textContent=`CONFIRM SELL · +${fmtCoins(totalCoins)}C`;
  }
  sellConfirmModal.style.display='grid';
}

function executeConfirmedSale(){
  if(!pendingSale||!pendingSale.items||pendingSale.items.length===0){
    closeSellConfirmModal();
    return;
  }
  const {items,mode}=pendingSale;
  const ids=items.map(it=>it.id);
  const res=KnivesSystem.sellItems(window.activeInventory,ids);
  closeSellConfirmModal();
  if(!res.soldItems||res.soldItems.length===0){
    showToast('NO ELIGIBLE ITEMS SOLD');
    return;
  }

  window.activeInventory=res.inventory;
  for(const sold of res.soldItems){
    bulkSelectedIds.delete(sold.id);
  }
  KnivesSystem.recordPendingSoldItems(res.soldItems);
  const saleSummaryPromise=persistInventorySummary(true,{allowBackupReset:true});

  const deleteSoldCloudItems=()=>{
    if(window.VELOCITY_TEST_MODE||!window.DailyBackend)return Promise.resolve();
    return Promise.allSettled(res.soldItems.map(sold=>{
      const delPromise=KnivesSystem.isWeaponItem(sold)
        ?window.DailyBackend.deleteCloudWeapon(sold.id)
        :KnivesSystem.isGloveItem(sold)
          ?window.DailyBackend.deleteCloudGlove(sold.id)
          :window.DailyBackend.deleteCloudKnife(sold.id);
      return delPromise.then(delRes=>{
        if(delRes&&delRes.deleted)KnivesSystem.clearPendingSoldItem(sold.id);
      });
    })).then(()=>{
      if(KnivesSystem.loadPendingSoldItems().length===0){
        KnivesSystem.setLocalDirty(false);
      }
    });
  };
  const runCloudDeletes=()=>Promise.resolve(saleSummaryPromise)
    .then(()=>deleteSoldCloudItems())
    .catch(err=>console.warn('Cloud item deletion failed; queued for next sync:',err));
  if(mode==='bulk-case'){
    Promise.resolve(pendingBulkOpenCloudSync).catch(()=>{}).then(runCloudDeletes);
  }else{
    runCloudDeletes();
  }

  CaseAudio.coinChime('sell');
  const label=res.soldItems.length===1
    ?KnivesSystem.formatItemFullName(res.soldItems[0]).toUpperCase()
    :`${res.soldItems.length} SKINS`;
  showToast(`SOLD ${label} · +${fmtCoins(res.coinsEarned)} COINS`);

  if(mode==='bulk-case'){
    pendingBulkDrops=[];
    bulkDropSellIds.clear();
    pendingBulkOpenCloudSync=Promise.resolve(null);
    showCasesView('select');
    renderArmoryCases();
  }else if(mode==='reveal'){
    lastRevealedItem=null;
    showCasesView('select');
    renderArmoryCases();
  }else{
    if(mode==='bulk'){
      bulkSellMode=false;
      bulkSelectedIds.clear();
    }
    if(!(window.activeInventory.weapons||[]).some(w=>w.id===selectedInvWeaponId)){
      selectedInvWeaponId=window.activeInventory.equippedRifleId;
    }
    if(!window.activeInventory.knives.some(k=>k.id===selectedInvKnifeId)){
      selectedInvKnifeId=window.activeInventory.equippedKnifeId;
    }
    if(!window.activeInventory.gloves.some(g=>g.id===selectedInvGloveId)){
      selectedInvGloveId=window.activeInventory.equippedGloveId;
    }
    renderArmoryInventory();
  }
}

function updateBulkSellBarUI(){
  if(!invBulkBar||!invBulkToggleBtn)return;
  invBulkToggleBtn.classList.toggle('bulk-on',bulkSellMode);
  invBulkToggleBtn.textContent=bulkSellMode?'DONE BULK':'BULK SELL';
  invBulkBar.style.display=bulkSellMode?'':'none';
  if(!bulkSellMode)return;

  const byId=new Map(getAllInventoryItems().map(it=>[it.id,it]));
  let count=0;
  let totalCoins=0;
  for(const id of Array.from(bulkSelectedIds)){
    const it=byId.get(id);
    const check=it?KnivesSystem.isItemSellable(window.activeInventory,it):{sellable:false,value:0};
    if(!check.sellable){
      bulkSelectedIds.delete(id);
      continue;
    }
    count++;
    totalCoins+=check.value;
  }
  if(bulkSelSummary){
    bulkSelSummary.textContent=`${count} SELECTED · +${fmtCoins(totalCoins)} COINS`;
  }
  if(bulkSellConfirmBtn){
    bulkSellConfirmBtn.disabled=count===0;
    bulkSellConfirmBtn.textContent=count>0?`SELL SELECTED (${count}) · +${fmtCoins(totalCoins)}C`:'SELL SELECTED';
  }
}

function toggleBulkSellMode(forceState){
  const next=typeof forceState==='boolean'?forceState:!bulkSellMode;
  bulkSellMode=next;
  if(!bulkSellMode)bulkSelectedIds.clear();
  renderArmoryInventory();
}

function applyBulkPreset(preset){
  if(!bulkSellMode)bulkSellMode=true;
  const visible=getVisibleInventoryList();
  const visibleIds=new Set(visible.map(it=>it.id));
  if(preset==='clear'){
    bulkSelectedIds.clear();
    renderArmoryInventory();
    return;
  }
  let added=0;
  if(preset==='duplicates'){
    const dupIds=KnivesSystem.findDuplicateSellableIds(window.activeInventory,invCategory);
    for(const id of dupIds){
      if(visibleIds.has(id)){
        bulkSelectedIds.add(id);
        added++;
      }
    }
    if(added===0)showToast('NO SELLABLE DUPLICATES IN THIS VIEW');
  }else if(preset==='milspec'||preset==='restricted'){
    for(const it of visible){
      if(it.rarity===preset&&KnivesSystem.isItemSellable(window.activeInventory,it).sellable){
        bulkSelectedIds.add(it.id);
        added++;
      }
    }
    if(added===0)showToast(`NO SELLABLE ${preset==='milspec'?'MIL-SPEC':'RESTRICTED'} SKINS HERE`);
  }
  renderArmoryInventory();
}

function renderInventoryFilterButtons(){
  const bar=$('armoryFilterBar');
  if(!bar)return;
  bar.textContent='';
  const filters=invCategory==='weapons'
    ?[
      ['all','ALL'],
      ['rifle','V-47'],
      ['smg','VX-9'],
      ['shotgun','M870'],
      ['awp','AWP'],
      ['revolver','R-88'],
      ['deagle','DEAGLE'],
      ['pistol','USP-9']
    ]
    :invCategory==='gloves'
      ?[
        ['all','ALL'],
        ['standard','STANDARD'],
        ['sport','SPORT'],
        ['specialist','SPECIALIST'],
        ['wraps','HAND WRAPS']
      ]
      :[
        ['all','ALL'],
        ['karambit','KARAMBIT'],
        ['butterfly','BUTTERFLY'],
        ['m9','M9'],
        ['skeleton','SKELETON'],
        ['default','DEFAULT']
      ];
  if(!filters.some(([id])=>id===invFilterType))invFilterType='all';
  for(const [id,label] of filters){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='arm-filter-btn'+(id===invFilterType?' active':'');
    btn.dataset.invFilter=id;
    btn.textContent=label;
    btn.onclick=()=>{invFilterType=id;renderArmoryInventory();};
    bar.appendChild(btn);
  }
}

function renderArmoryInventory(){
  if(!armoryInvGrid)return;
  const isWeaponCat=invCategory==='weapons';
  const isGloveCat=invCategory==='gloves';
  document.querySelectorAll('[data-inv-cat]').forEach(btn=>{
    const on=btn.dataset.invCat===invCategory;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  renderInventoryFilterButtons();
  updateBulkSellBarUI();

  const sourceList=isWeaponCat?(window.activeInventory.weapons||[]):isGloveCat?window.activeInventory.gloves:window.activeInventory.knives;
  const list=getVisibleInventoryList();
  armoryInvGrid.textContent='';

  if(list.length===0){
    const empty=document.createElement('div');
    empty.className='inv-empty';
    empty.textContent=isWeaponCat
      ?'No skins for this firearm yet. Buy & open cases in the Case Shop to unbox V-47 Rifle, AWP, R-88 Magnum, and Deagle finishes.'
      :isGloveCat
        ?'No gloves in this archetype yet. Rare Gold drops in any case (8%–18% by tier) can unbox Sport, Specialist, Hand Wraps, or Standard gloves.'
        :'No knives in this category yet. Rare Gold drops in any case (8%–18% by tier) unbox knives & gloves.';
    armoryInvGrid.appendChild(empty);
  }

  let selected;
  if(isWeaponCat){
    selected=list.find(w=>w.id===selectedInvWeaponId)||sourceList.find(w=>w.id===selectedInvWeaponId)||KnivesSystem.getEquippedWeapon(window.activeInventory,'rifle');
    if(list.length>0&&!list.some(w=>w.id===selected.id))selected=list[0];
    selectedInvWeaponId=selected.id;
  }else if(isGloveCat){
    selected=list.find(g=>g.id===selectedInvGloveId)||window.activeInventory.gloves.find(g=>g.id===selectedInvGloveId)||KnivesSystem.getEquippedGlove(window.activeInventory);
    if(list.length>0&&!list.some(g=>g.id===selected.id))selected=list[0];
    selectedInvGloveId=selected.id;
  }else{
    selected=list.find(k=>k.id===selectedInvKnifeId)||window.activeInventory.knives.find(k=>k.id===selectedInvKnifeId)||KnivesSystem.getEquippedKnife(window.activeInventory);
    if(list.length>0&&!list.some(k=>k.id===selected.id))selected=list[0];
    selectedInvKnifeId=selected.id;
  }

  const selectedId=selected.id;

  for(const item of list){
    const rar=KnivesSystem.RARITIES[item.rarity]||KnivesSystem.RARITIES.milspec;
    const isEq=KnivesSystem.isItemEquippedInInventory(window.activeInventory,item);
    const sellCheck=KnivesSystem.isItemSellable(window.activeInventory,item);
    const isBulkPicked=bulkSellMode&&bulkSelectedIds.has(item.id);
    const isBulkLocked=bulkSellMode&&!sellCheck.sellable;

    const card=document.createElement('button');
    card.type='button';
    card.className='inv-card'
      +(item.id===selectedId?' selected':'')
      +(isBulkPicked?' bulk-selected':'')
      +(isBulkLocked?' bulk-locked':'');
    card.style.setProperty('--rar-col',rar.color);
    card.dataset.itemId=item.id;
    if(isWeaponCat)card.dataset.weaponId=item.id;
    else if(isGloveCat)card.dataset.gloveId=item.id;
    else card.dataset.knifeId=item.id;

    if(bulkSellMode&&sellCheck.sellable){
      const chk=document.createElement('span');
      chk.className='inv-check';
      chk.textContent=isBulkPicked?'✓':'';
      card.appendChild(chk);
    }

    if(isEq){
      const eq=document.createElement('span');
      eq.className='inv-equipped';
      eq.textContent='EQUIPPED';
      card.appendChild(eq);
    }

    const img=document.createElement('img');
    img.className='inv-thumb';
    img.alt=KnivesSystem.formatItemFullName(item);
    img.src=getThumbForItem(item);

    const nm=document.createElement('div');
    nm.className='inv-name';
    nm.textContent=KnivesSystem.formatItemFullName(item);

    const meta=document.createElement('div');
    meta.className='inv-meta';
    const metaTxt=document.createTextNode(KnivesSystem.formatKnifeMetaLine(item));
    meta.appendChild(metaTxt);
    if(sellCheck.value>0){
      const sep=document.createTextNode(' · ');
      const pr=document.createElement('span');
      pr.className='inv-price';
      pr.textContent=`${fmtCoins(sellCheck.value)}C`;
      meta.appendChild(sep);
      meta.appendChild(pr);
    }

    card.appendChild(img);
    card.appendChild(nm);
    card.appendChild(meta);
    card.onclick=()=>{
      if(isWeaponCat)selectedInvWeaponId=item.id;
      else if(isGloveCat)selectedInvGloveId=item.id;
      else selectedInvKnifeId=item.id;
      if(bulkSellMode){
        if(!sellCheck.sellable){
          showToast(sellCheck.reason==='STARTER ITEM'?'STARTER ITEMS CANNOT BE SOLD':'UNEQUIP ITEM FIRST TO SELL');
        }else if(bulkSelectedIds.has(item.id)){
          bulkSelectedIds.delete(item.id);
        }else{
          bulkSelectedIds.add(item.id);
        }
      }
      renderArmoryInventory();
    };
    armoryInvGrid.appendChild(card);
  }

  fillItemSpecs('inv',selected);
  const isSelectedEquipped=KnivesSystem.isItemEquippedInInventory(window.activeInventory,selected);
  const selCheck=KnivesSystem.isItemSellable(window.activeInventory,selected);
  $('invEquipBtn').textContent=isSelectedEquipped?'EQUIPPED':(isWeaponCat?'EQUIP SKIN':isGloveCat?'EQUIP GLOVES':'EQUIP KNIFE');
  $('invEquipBtn').disabled=isSelectedEquipped;
  if(invSellBtn){
    invSellBtn.disabled=!selCheck.sellable;
    invSellBtn.textContent=selCheck.sellable
      ?`SELL FOR +${fmtCoins(selCheck.value)}C`
      :selCheck.reason;
  }

  const invTrickBtn=$('invTrickBtn'),invMythicBtn=$('invMythicBtn');
  if(invTrickBtn){
    invTrickBtn.style.display='';
    invTrickBtn.textContent=isWeaponCat?'INSPECT':'PLAY TRICK';
  }
  if(invMythicBtn){
    invMythicBtn.style.display='';
    invMythicBtn.textContent=isWeaponCat?(selected&&selected.weaponType==='revolver'?'MYTHIC ★':'RARE TRICK ★'):'MYTHIC ★';
  }

  const effectiveMode=isGloveCat?'combo':invPreviewMode;
  const modeComboBtn=$('invModeCombo'),modeSoloBtn=$('invModeSolo'),stageCap=$('invStageCaption');
  if(modeComboBtn)modeComboBtn.classList.toggle('active',effectiveMode==='combo');
  if(modeSoloBtn){
    modeSoloBtn.classList.toggle('active',effectiveMode==='solo');
    modeSoloBtn.disabled=isGloveCat;
  }
  if(stageCap){
    stageCap.textContent=effectiveMode==='combo'?'LIVE COMBO 3D PREVIEW':(isWeaponCat?'SOLO FIREARM TURNTABLE':'SOLO BLADE TURNTABLE');
  }

  const previewGlove=isGloveCat?selected:KnivesSystem.getEquippedGlove(window.activeInventory);
  const previewItem=isGloveCat?KnivesSystem.getEquippedKnife(window.activeInventory):selected;
  mountArmoryCanvas(armoryInspectStage,previewItem,previewGlove,effectiveMode);
  updateArmoryBadges();
}

function setArmoryTab(tab){
  stopRouletteAnimation();
  closeSellConfirmModal();
  if(tab!=='inventory'){
    bulkSellMode=false;
    bulkSelectedIds.clear();
  }
  activeArmoryTab=tab==='inventory'?'inventory':'cases';
  document.querySelectorAll('[data-arm-tab]').forEach(btn=>{
    const on=btn.dataset.armTab===activeArmoryTab;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-selected',on?'true':'false');
  });
  document.querySelectorAll('[data-arm-pane]').forEach(pane=>{
    pane.style.display=pane.dataset.armPane===activeArmoryTab?'':'none';
  });
  if(activeArmoryTab==='cases'){
    if(pendingBulkDrops.length){
      renderBulkCaseResults();
      showCasesView('bulk');
    }else{
      showCasesView('select');
    }
    renderArmoryCases();
  }else{
    renderArmoryInventory();
  }
}

function openArmory(returnTo,initialTab){
  cancelRebind();
  stopRouletteAnimation();
  closeSellConfirmModal();
  stopServersSubscription();
  if(typeof CoursePreview3D!=='undefined')CoursePreview3D.stop();
  armoryReturnTarget=returnTo==='pause'?'pause':'menu';
  overlay.style.display='grid';
  overlayCard.classList.remove('wide','browser-wide');
  overlayCard.classList.add('studio-full');
  menuEl.style.display='none';
  if(courseBrowserPanelEl)courseBrowserPanelEl.style.display='none';
  dailyHubEl.style.display='none';
  settingsPanelEl.style.display='none';
  serversPanelEl.style.display='none';
  if(loadoutsPanelEl)loadoutsPanelEl.style.display='none';
  pauseEl.style.display='none';
  armoryPanelEl.style.display='';
  armoryBackBtn.textContent=armoryReturnTarget==='pause'?'BACK TO PAUSE':'MENU';
  document.body.dataset.state='armory';
  document.exitPointerLock?.();
  updateArmorySyncLabel();
  setArmoryTab(initialTab||activeArmoryTab);
}


function closeArmory(){
  stopRouletteAnimation();
  closeSellConfirmModal();
  bulkSellMode=false;
  bulkSelectedIds.clear();
  ArmoryPreview.stop();
  if(armoryReturnTarget==='pause'&&inLevel){
    showPause();
  }else{
    showMenu();
  }
}

