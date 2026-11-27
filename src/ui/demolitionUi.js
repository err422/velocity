// Demolition 5v5 Tactical HUD, Valorant-style Buy Menu (B), Damage Breakdown Card, Spectator Bar, and Radio Wheel (Z).
(function(global){
  'use strict';

  let rootInit = false;
  let buyMenuOpen = false;
  let commWheelOpen = false;
  let commPingPos = null;
  let selectedThrowable = 'frag';
  let lastShopSig = '';
  let lastTopSig = '';
  let lastBottomSig = '';
  let lastDeathSig = '';

  const el = {};

  function createEl(tag, cls, id){
    const node = document.createElement(tag);
    if(cls) node.className = cls;
    if(id) node.id = id;
    return node;
  }

  function fmtClock(sec){
    const s = Math.max(0, Math.ceil(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function ensureDom(){
    if(rootInit) return;
    rootInit = true;
    const host = document.getElementById('hud') || document.body;

    // 1. Flashbang whiteout overlay
    el.flashOverlay = createEl('div', 'demo-flash-overlay', 'demoFlashOverlay');
    document.body.appendChild(el.flashOverlay);

    // 2. Top 5v5 Round Score Bar
    el.topBar = createEl('div', 'demo-top-bar', 'demoTopBar');
    el.topBar.style.display = 'none';
    el.topBar.innerHTML = [
      '<div class="demo-team-col atk">',
      '  <div class="demo-team-icons" id="demoAtkIcons"></div>',
      '  <div class="demo-team-meta"><span class="demo-team-tag">ATK</span><strong class="demo-team-score" id="demoAtkScore">0</strong></div>',
      '</div>',
      '<div class="demo-center-clock" id="demoClockBox">',
      '  <div class="demo-round-meta" id="demoRoundMeta">R1 · BUY PHASE</div>',
      '  <div class="demo-timer" id="demoTimer">0:15</div>',
      '  <div class="demo-side-callout" id="demoSideCallout">ATTACK · FIRST TO 5</div>',
      '</div>',
      '<div class="demo-team-col def">',
      '  <div class="demo-team-meta"><strong class="demo-team-score" id="demoDefScore">0</strong><span class="demo-team-tag">DEF</span></div>',
      '  <div class="demo-team-icons" id="demoDefIcons"></div>',
      '</div>'
    ].join('');
    host.appendChild(el.topBar);
    el.atkIcons = document.getElementById('demoAtkIcons');
    el.defIcons = document.getElementById('demoDefIcons');
    el.atkScore = document.getElementById('demoAtkScore');
    el.defScore = document.getElementById('demoDefScore');
    el.clockBox = document.getElementById('demoClockBox');
    el.roundMeta = document.getElementById('demoRoundMeta');
    el.timer = document.getElementById('demoTimer');
    el.sideCallout = document.getElementById('demoSideCallout');

    // 3. Bomb Context & Continuous Action Bar
    el.bombAction = createEl('div', 'demo-bomb-action', 'demoBombAction');
    el.bombAction.style.display = 'none';
    el.bombAction.innerHTML = [
      '<div class="demo-bomb-prompt" id="demoBombPrompt">HOLD [E] TO PLANT</div>',
      '<div class="demo-bomb-bar" id="demoBombBar" style="display:none"><div class="demo-bomb-fill" id="demoBombFill"></div></div>'
    ].join('');
    host.appendChild(el.bombAction);
    el.bombPrompt = document.getElementById('demoBombPrompt');
    el.bombBar = document.getElementById('demoBombBar');
    el.bombFill = document.getElementById('demoBombFill');

    // 4. Bottom Tactical Utility & Armor/Credits Bar
    el.bottomBar = createEl('div', 'demo-bottom-bar', 'demoBottomBar');
    el.bottomBar.style.display = 'none';
    el.bottomBar.innerHTML = [
      '<div class="demo-vitals">',
      '  <div class="demo-vital-cell"><span class="demo-vk">ARMOR</span><strong class="demo-vv" id="demoArmorVal">0</strong><span class="demo-vh" id="demoHelmetTag"></span></div>',
      '  <div class="demo-vital-cell"><span class="demo-vk">CREDITS</span><strong class="demo-vv credits" id="demoCreditsVal">$800</strong></div>',
      '  <div class="demo-vital-cell" id="demoKitCell" style="display:none"><span class="demo-vk">GEAR</span><strong class="demo-vv kit" id="demoKitTag">KIT</strong></div>',
      '</div>',
      '<div class="demo-util-strip" id="demoUtilStrip"></div>',
      '<div class="demo-hint-line" id="demoHintLine">[B] SHOP · [5] NADE · [6] C4/RECON · [7] GADGET · [Z] RADIO · [MMB] PING</div>'
    ].join('');
    host.appendChild(el.bottomBar);
    el.armorVal = document.getElementById('demoArmorVal');
    el.helmetTag = document.getElementById('demoHelmetTag');
    el.creditsVal = document.getElementById('demoCreditsVal');
    el.kitCell = document.getElementById('demoKitCell');
    el.kitTag = document.getElementById('demoKitTag');
    el.utilStrip = document.getElementById('demoUtilStrip');
    el.hintLine = document.getElementById('demoHintLine');

    // 5. Death Damage Breakdown Card + Spectator Controls Bar
    el.deathCard = createEl('div', 'demo-death-card', 'demoDeathCard');
    el.deathCard.style.display = 'none';
    el.deathCard.innerHTML = [
      '<div class="demo-death-head">',
      '  <div><div class="demo-death-kicker">ROUND DAMAGE REPORT</div><div class="demo-death-killer" id="demoDeathKiller">ELIMINATED</div></div>',
      '  <div class="demo-death-badge" id="demoDeathBadge"></div>',
      '</div>',
      '<div class="demo-death-rows" id="demoDeathRows"></div>',
      '<div class="demo-spec-bar" id="demoSpecBar">',
      '  <strong id="demoSpecTarget">SPECTATING TEAMMATE</strong>',
      '  <span>LMB / RMB CYCLE · [V] FREE-CAM · [TAB] SCOREBOARD</span>',
      '</div>'
    ].join('');
    document.body.appendChild(el.deathCard);
    el.deathKiller = document.getElementById('demoDeathKiller');
    el.deathBadge = document.getElementById('demoDeathBadge');
    el.deathRows = document.getElementById('demoDeathRows');
    el.specTarget = document.getElementById('demoSpecTarget');

    // 6. Valorant-Style Tactical Buy Menu (B)
    el.buyMenu = createEl('div', 'demo-buy-menu', 'demoBuyMenu');
    el.buyMenu.style.display = 'none';
    el.buyMenu.innerHTML = [
      '<div class="demo-shop-shell">',
      '  <header class="demo-shop-head">',
      '    <div>',
      '      <div class="demo-shop-kicker" id="demoShopKicker">DEMOLITION 5V5 · BUY PHASE</div>',
      '      <h2 class="demo-shop-title">Tactical Loadout &amp; Equipment Shop</h2>',
      '    </div>',
      '    <div class="demo-shop-head-right">',
      '      <div class="demo-shop-bank"><span class="demo-bank-lbl">CREDITS</span><strong id="demoShopCredits">$800</strong></div>',
      '      <div class="demo-shop-timer" id="demoShopTimer">0:15</div>',
      '      <button type="button" class="demo-shop-close" id="demoShopCloseBtn">CLOSE [B]</button>',
      '    </div>',
      '  </header>',
      '  <div class="demo-shop-team" id="demoShopTeamRow"></div>',
      '  <div class="demo-shop-grid">',
      '    <section class="demo-shop-col">',
      '      <div class="demo-col-head"><span>GUNSMITH LOADOUTS</span><em>FREE SWAP</em></div>',
      '      <div class="demo-loadout-list" id="demoShopLoadouts"></div>',
      '    </section>',
      '    <section class="demo-shop-col">',
      '      <div class="demo-col-head"><span>THROWABLES &amp; DEMOLITION</span><em>[5] / [6]</em></div>',
      '      <div class="demo-item-list" id="demoShopThrowables"></div>',
      '    </section>',
      '    <section class="demo-shop-col">',
      '      <div class="demo-col-head"><span>ARMOR &amp; TACTICAL GADGETS</span><em>[7] / [E]</em></div>',
      '      <div class="demo-item-list" id="demoShopGadgets"></div>',
      '    </section>',
      '  </div>',
      '  <footer class="demo-shop-foot">',
      '    <span>Surviving armor &amp; utility carry into the next round. Credits reset at Halftime (Round 4).</span>',
      '    <span>[B] or [ESC] to close</span>',
      '  </footer>',
      '</div>'
    ].join('');
    document.body.appendChild(el.buyMenu);
    el.shopKicker = document.getElementById('demoShopKicker');
    el.shopCredits = document.getElementById('demoShopCredits');
    el.shopTimer = document.getElementById('demoShopTimer');
    el.shopTeamRow = document.getElementById('demoShopTeamRow');
    el.shopLoadouts = document.getElementById('demoShopLoadouts');
    el.shopThrowables = document.getElementById('demoShopThrowables');
    el.shopGadgets = document.getElementById('demoShopGadgets');
    const closeShopBtn = document.getElementById('demoShopCloseBtn');
    if(closeShopBtn) closeShopBtn.onclick = () => closeBuyMenu();

    // 7. Quick-Ping / Radio Command Wheel (Z)
    el.commWheel = createEl('div', 'demo-comm-wheel', 'demoCommWheel');
    el.commWheel.style.display = 'none';
    el.commWheel.innerHTML = [
      '<div class="demo-comm-card">',
      '  <div class="demo-comm-head"><span>TACTICAL RADIO · TEAM ORDERS</span><button type="button" id="demoCommCloseBtn">×</button></div>',
      '  <div class="demo-comm-grid" id="demoCommGrid"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(el.commWheel);
    const commClose = document.getElementById('demoCommCloseBtn');
    if(commClose) commClose.onclick = () => closeCommWheel();
    const commGrid = document.getElementById('demoCommGrid');
    const commands = [
      { id: 'rush_a', label: 'RUSH SITE A', sub: 'Bots execute A' },
      { id: 'rush_b', label: 'RUSH SITE B', sub: 'Bots execute B' },
      { id: 'split_mid', label: 'SPLIT MID', sub: 'Flank & pinch' },
      { id: 'rotate', label: 'ROTATE SITE', sub: 'Shift other site' },
      { id: 'hold', label: 'HOLD ANGLES', sub: 'Play defensive' },
      { id: 'backup', label: 'NEED BACKUP', sub: 'Converge on ping' }
    ];
    for(const cmd of commands){
      const btn = createEl('button', 'demo-comm-btn');
      btn.type = 'button';
      btn.innerHTML = `<strong>${cmd.label}</strong><span>${cmd.sub}</span>`;
      btn.onclick = () => {
        if(global.NetcodeSystem && typeof global.NetcodeSystem.sendTacticalComm === 'function'){
          global.NetcodeSystem.sendTacticalComm(cmd.id, commPingPos);
        }
        if(typeof global.showToast === 'function') global.showToast(`RADIO: ${cmd.label}`);
        closeCommWheel();
      };
      commGrid.appendChild(btn);
    }
  }

  function releasePointerForModal(){
    try{
      if(document.pointerLockElement) document.exitPointerLock?.();
    }catch(_){}
  }

  function relockPointerIfPlaying(){
    const overlay = document.getElementById('overlay');
    const touchMode = global.MobileControls && typeof global.MobileControls.isTouchModeEnabled === 'function' && global.MobileControls.isTouchModeEnabled();
    if(overlay && overlay.style.display === 'none' && !touchMode && typeof renderer !== 'undefined' && renderer.domElement){
      try{
        const res = renderer.domElement.requestPointerLock?.();
        if(res && typeof res.catch === 'function') res.catch(() => {});
      }catch(_){}
    }
  }

  function openBuyMenu(){
    ensureDom();
    const ns = global.NetcodeSystem ? global.NetcodeSystem.getState() : null;
    if(!ns || ns.mode !== 'demolition_5v5') return false;
    if(ns.phase !== 'buy'){
      if(typeof global.showToast === 'function') global.showToast('SHOP ONLY OPEN DURING BUY PHASE');
      return false;
    }
    commWheelOpen = false;
    el.commWheel.style.display = 'none';
    buyMenuOpen = true;
    lastShopSig = '';
    el.buyMenu.style.display = 'grid';
    releasePointerForModal();
    renderBuyMenu(ns);
    return true;
  }

  function closeBuyMenu(){
    if(!buyMenuOpen) return;
    buyMenuOpen = false;
    if(el.buyMenu) el.buyMenu.style.display = 'none';
    relockPointerIfPlaying();
  }

  function toggleBuyMenu(){
    if(buyMenuOpen) closeBuyMenu();
    else openBuyMenu();
  }

  function openCommWheel(hitPos){
    ensureDom();
    const ns = global.NetcodeSystem ? global.NetcodeSystem.getState() : null;
    if(!ns || ns.mode !== 'demolition_5v5') return false;
    commPingPos = hitPos || null;
    buyMenuOpen = false;
    if(el.buyMenu) el.buyMenu.style.display = 'none';
    commWheelOpen = true;
    el.commWheel.style.display = 'grid';
    releasePointerForModal();
    return true;
  }

  function closeCommWheel(){
    if(!commWheelOpen) return;
    commWheelOpen = false;
    if(el.commWheel) el.commWheel.style.display = 'none';
    relockPointerIfPlaying();
  }

  function toggleCommWheel(hitPos){
    if(commWheelOpen) closeCommWheel();
    else openCommWheel(hitPos);
  }

  function closeAllModals(){
    const wasOpen = buyMenuOpen || commWheelOpen;
    buyMenuOpen = false;
    commWheelOpen = false;
    if(el.buyMenu) el.buyMenu.style.display = 'none';
    if(el.commWheel) el.commWheel.style.display = 'none';
    if(wasOpen) relockPointerIfPlaying();
  }

  function renderBuyMenu(ns){
    if(!buyMenuOpen || !el.buyMenu) return;
    const DE = global.DemolitionEngine;
    if(!DE || !ns.demoMatch) return;
    const econ = ns.localEcon || { credits: 0, armor: 0, helmet: false, defuseKit: false, utility: {}, loadoutIndex: 0 };
    const phaseSec = Math.max(0, Math.ceil(ns.demoMatch.phaseTimer || 0));
    el.shopTimer.textContent = fmtClock(phaseSec);
    el.shopCredits.textContent = `$${econ.credits || 0}`;
    el.shopKicker.textContent = `ROUND ${ns.demoMatch.round || 1} · ${ns.localTeam === 'atk' ? 'ATTACKERS' : 'DEFENDERS'} · BUY PHASE`;

    const activeLdIdx = (global.activeLoadouts && Number.isFinite(Number(global.activeLoadouts.activeIndex))) ? Math.floor(Number(global.activeLoadouts.activeIndex)) : 0;
    const shopSig = `${econ.credits}|${econ.armor}|${econ.helmet?1:0}|${econ.defuseKit?1:0}|${JSON.stringify(econ.utility||{})}|${activeLdIdx}|${ns.localTeam}|${(ns.players||[]).map(p=>`${p.uid}:${p.credits}`).join(',')}`;
    if(shopSig === lastShopSig) return;
    lastShopSig = shopSig;

    // Team credits strip
    el.shopTeamRow.textContent = '';
    const teammates = (ns.players || []).filter(p => p.team === ns.localTeam);
    for(const tm of teammates){
      const chip = createEl('div', 'demo-team-cash' + (tm.uid === ns.localUid ? ' me' : ''));
      chip.innerHTML = `<span>${tm.name}</span><strong>$${tm.credits || 0}</strong>`;
      el.shopTeamRow.appendChild(chip);
    }

    // Column 1: 5 Gunsmith Loadouts (Free Swap)
    el.shopLoadouts.textContent = '';
    const slots = (global.activeLoadouts && Array.isArray(global.activeLoadouts.loadouts)) ? global.activeLoadouts.loadouts : [];
    const getSpec = (global.LoadoutsSystem && typeof global.LoadoutsSystem.getWeaponSpec === 'function')
      ? global.LoadoutsSystem.getWeaponSpec
      : () => null;
    slots.forEach((slot, idx) => {
      const pId = slot.primary && slot.primary.weaponId;
      const sId = slot.secondary && slot.secondary.weaponId;
      const pSpec = pId ? getSpec(pId) : null;
      const sSpec = sId ? getSpec(sId) : null;
      const pName = (pSpec && pSpec.name) || pId || 'V-47 Rifle';
      const sName = (sSpec && sSpec.name) || sId || 'Deagle .50';
      const isAct = idx === activeLdIdx;
      const btn = createEl('button', 'demo-ld-card' + (isAct ? ' active' : ''));
      btn.type = 'button';
      btn.innerHTML = `
        <div class="demo-ld-top"><span class="demo-ld-num">0${idx + 1}</span><strong>${slot.name || ('Loadout ' + (idx + 1))}</strong><em>${isAct ? 'EQUIPPED' : 'EQUIP'}</em></div>
        <div class="demo-ld-weps">${pName} · ${sName}</div>
      `;
      btn.onclick = () => {
        if(global.NetcodeSystem && typeof global.NetcodeSystem.selectDemolitionLoadout === 'function'){
          global.NetcodeSystem.selectDemolitionLoadout(idx);
        }
        if(typeof global.applySavedLoadoutByIndex === 'function'){
          global.applySavedLoadoutByIndex(idx);
        }
        lastShopSig = '';
        renderBuyMenu(global.NetcodeSystem.getState());
        if(typeof global.showToast === 'function') global.showToast(`LOADOUT SWAPPED: ${(slot.name || ('0' + (idx + 1))).toUpperCase()}`);
      };
      el.shopLoadouts.appendChild(btn);
    });

    // Helper for shop item cards
    const getUtilKey = (id) => (id === 'breach_charge' ? 'breach' : id);
    const buildShopCard = (item) => {
      const check = DE.canBuyItem(econ, ns.localTeam, item.id, ns.phase);
      const uKey = getUtilKey(item.id);
      let ownedStr = '';
      if(item.id === 'vest'){
        ownedStr = econ.armor > 0 ? `${econ.armor}/100` : 'NONE';
      }else if(item.id === 'vest_helmet'){
        ownedStr = econ.helmet ? `HELM + ${econ.armor}` : (econ.armor > 0 ? 'UPGRADE' : 'NONE');
      }else if(item.id === 'defuse_kit'){
        ownedStr = econ.defuseKit ? 'OWNED' : (ns.localTeam === 'def' ? '0/1' : 'DEF ONLY');
      }else if(item.id === 'mobility_kit'){
        ownedStr = `G:${econ.utility.grapple || 0} · J:${econ.utility.jumpPad || 0}`;
      }else{
        ownedStr = `${econ.utility[uKey] || 0}/${item.maxCarry || 1}`;
      }
      const price = check.cost != null ? check.cost : DE.getItemEffectiveCost(econ, item.id);
      const card = createEl('button', 'demo-shop-item' + (!check.ok ? ' disabled' : ''));
      card.type = 'button';
      card.disabled = !check.ok;
      card.innerHTML = `
        <div class="demo-item-top">
          <strong>${item.name}</strong>
          <span class="demo-item-price">$${price}</span>
        </div>
        <div class="demo-item-desc">${item.desc}</div>
        <div class="demo-item-foot">
          <span class="demo-item-owned">${ownedStr}</span>
          <span class="demo-item-status">${check.ok ? 'CLICK TO BUY' : (check.reason || 'MAXED')}</span>
        </div>
      `;
      card.onclick = () => {
        if(!global.NetcodeSystem) return;
        const res = global.NetcodeSystem.buyDemolitionItem(item.id);
        if(res && res.ok){
          if(['frag','smoke','flash','molotov'].includes(uKey)) selectedThrowable = uKey;
          if(typeof global.showToast === 'function') global.showToast(`PURCHASED ${item.name.toUpperCase()}`);
          lastShopSig = '';
          renderBuyMenu(global.NetcodeSystem.getState());
        }else if(res && res.reason && typeof global.showToast === 'function'){
          global.showToast(res.reason.toUpperCase());
        }
      };
      return card;
    };

    const throwIds = (DE.SHOP_ORDER && Array.isArray(DE.SHOP_ORDER.throwables)) ? DE.SHOP_ORDER.throwables : [];
    const gearIds = (DE.SHOP_ORDER && Array.isArray(DE.SHOP_ORDER.gear)) ? DE.SHOP_ORDER.gear : [];

    // Column 2: Throwables & Demolition
    el.shopThrowables.textContent = '';
    for(const id of throwIds){
      const item = DE.SHOP_ITEMS && DE.SHOP_ITEMS[id];
      if(item) el.shopThrowables.appendChild(buildShopCard(item));
    }

    // Column 3: Armor & Tactical Gadgets
    el.shopGadgets.textContent = '';
    for(const id of gearIds){
      const item = DE.SHOP_ITEMS && DE.SHOP_ITEMS[id];
      if(item) el.shopGadgets.appendChild(buildShopCard(item));
    }
  }

  function renderTopBar(ns){
    const dm = ns.demoMatch;
    if(!dm) return;
    const atkPlayers = (ns.players || []).filter(p => p.team === 'atk');
    const defPlayers = (ns.players || []).filter(p => p.team === 'def');
    const atkSquad = (dm.sideSquads && dm.sideSquads.atk) || 'alpha';
    const defSquad = (dm.sideSquads && dm.sideSquads.def) || 'bravo';
    const atkScore = (dm.scores && dm.scores[atkSquad]) || 0;
    const defScore = (dm.scores && dm.scores[defSquad]) || 0;
    const bomb = dm.bomb || {};
    const planted = bomb.state === 'planted';
    const timerSec = planted ? (bomb.fuseTimer || 0) : (dm.phaseTimer || 0);
    const phaseLabel = planted
      ? `BOMB PLANTED · SITE ${bomb.site || 'A'}`
      : dm.phase === 'buy'
        ? `ROUND ${dm.round} · BUY PHASE`
        : dm.phase === 'halftime'
          ? 'HALFTIME · SIDES SWAPPING'
          : dm.phase === 'post_round'
            ? `ROUND ${dm.round} COMPLETE`
            : dm.phase === 'match_over'
              ? 'MATCH COMPLETE'
              : `ROUND ${dm.round} · LIVE`;

    const sideText = ns.localTeam === 'atk' ? 'ATTACK · PLANT SITE A/B' : 'DEFEND · PROTECT A/B';
    const sig = `${atkScore}|${defScore}|${phaseLabel}|${Math.ceil(timerSec)}|${planted?1:0}|${sideText}|${atkPlayers.map(p=>p.alive?1:0).join('')}|${defPlayers.map(p=>p.alive?1:0).join('')}`;
    if(sig === lastTopSig) return;
    lastTopSig = sig;

    el.atkScore.textContent = String(atkScore);
    el.defScore.textContent = String(defScore);
    el.roundMeta.textContent = phaseLabel;
    el.timer.textContent = fmtClock(timerSec);
    el.sideCallout.textContent = sideText;
    el.clockBox.classList.toggle('planted', planted);
    el.clockBox.classList.toggle('buy', dm.phase === 'buy');

    el.atkIcons.textContent = '';
    for(let i = 0; i < 5; i++){
      const p = atkPlayers[i];
      const dot = createEl('span', 'demo-alive-pip atk' + (p && p.alive ? ' alive' : ' dead') + (p && p.uid === ns.localUid ? ' me' : ''));
      dot.title = p ? p.name : '';
      if(p && bomb.state === 'carried' && bomb.carrierUid === p.uid) dot.classList.add('carrier');
      el.atkIcons.appendChild(dot);
    }
    el.defIcons.textContent = '';
    for(let i = 0; i < 5; i++){
      const p = defPlayers[i];
      const dot = createEl('span', 'demo-alive-pip def' + (p && p.alive ? ' alive' : ' dead') + (p && p.uid === ns.localUid ? ' me' : ''));
      dot.title = p ? p.name : '';
      el.defIcons.appendChild(dot);
    }
  }

  function renderBottomBar(ns){
    const econ = ns.localEcon || { credits: 0, armor: 0, helmet: false, defuseKit: false, utility: {} };
    const util = econ.utility || {};
    const bomb = ns.demoMatch && ns.demoMatch.bomb;
    const carryingBomb = Boolean(bomb && bomb.state === 'carried' && bomb.carrierUid === ns.localUid);
    const hasC4Armed = Boolean(global.UtilitySystem && global.UtilitySystem.hasArmedC4(ns.localUid));
    const sig = `${econ.credits}|${econ.armor}|${econ.helmet?1:0}|${econ.defuseKit?1:0}|${carryingBomb?1:0}|${hasC4Armed?1:0}|${ns.phase}|${selectedThrowable}|${JSON.stringify(util)}`;
    if(sig === lastBottomSig) return;
    lastBottomSig = sig;

    el.armorVal.textContent = String(econ.armor || 0);
    el.helmetTag.textContent = econ.helmet ? '+HELM' : '';
    el.creditsVal.textContent = `$${econ.credits || 0}`;
    if(carryingBomb){
      el.kitCell.style.display = '';
      el.kitTag.textContent = 'BOMB [G]';
      el.kitTag.className = 'demo-vv bomb';
    }else if(econ.defuseKit){
      el.kitCell.style.display = '';
      el.kitTag.textContent = 'KIT 3.5S';
      el.kitTag.className = 'demo-vv kit';
    }else{
      el.kitCell.style.display = 'none';
    }

    el.utilStrip.textContent = '';
    const slots = [
      { key: '5', label: 'FRAG', count: util.frag || 0, utilKey: 'frag', selectable: true },
      { key: '5', label: 'SMOKE', count: util.smoke || 0, utilKey: 'smoke', selectable: true },
      { key: '5', label: 'FLASH', count: util.flash || 0, utilKey: 'flash', selectable: true },
      { key: '5', label: 'MOLO', count: util.molotov || 0, utilKey: 'molotov', selectable: true },
      { key: '6', label: hasC4Armed ? 'DET C4' : 'C4', count: hasC4Armed ? 'ARM' : (util.c4 || 0), active: hasC4Armed },
      { key: '6', label: 'RECON', count: util.recon || 0 },
      { key: '7', label: 'BREACH', count: util.breach || 0 },
      { key: '7', label: 'WALL', count: util.barricade || 0 },
      { key: '7', label: 'PAD', count: util.jumpPad || 0 },
      { key: 'E', label: 'GRAP', count: util.grapple || 0 }
    ];
    for(const s of slots){
      const hasAny = s.active || (typeof s.count === 'number' ? s.count > 0 : true);
      const cell = createEl('button', 'demo-util-slot' + (hasAny ? ' owned' : ' empty') + (s.selectable && selectedThrowable === s.utilKey ? ' selected' : '') + (s.active ? ' armed' : ''));
      cell.type = 'button';
      cell.innerHTML = `<span class="du-k">${s.key}</span><span class="du-n">${s.label}</span><strong class="du-c">${s.count}</strong>`;
      if(s.selectable){
        cell.onclick = () => {
          selectedThrowable = s.utilKey;
          lastBottomSig = '';
          renderBottomBar(global.NetcodeSystem.getState());
        };
      }
      el.utilStrip.appendChild(cell);
    }

    el.hintLine.textContent = ns.phase === 'buy'
      ? 'BUY PHASE ACTIVE · PRESS [B] TO OPEN SHOP & SWAP LOADOUTS'
      : '[5] NADE · [6] C4/RECON · [7] BREACH/BARRICADE/PAD · [E] GRAPPLE/PLANT/DEFUSE · [Z] RADIO';
  }

  function renderBombAction(ns, playerObj){
    if(!ns.demoMatch || !ns.localAlive || ns.phase !== 'live'){
      el.bombAction.style.display = 'none';
      return;
    }
    const bomb = ns.demoMatch.bomb;
    if(!bomb){ el.bombAction.style.display = 'none'; return; }

    let prompt = '';
    let pct = 0;
    let showBar = false;

    const rules = (global.DemolitionEngine && global.DemolitionEngine.RULES) || { PLANT_SEC: 3.5, DEFUSE_SEC: 7.0, DEFUSE_KIT_SEC: 3.5 };
    if(bomb.planterUid === ns.localUid && bomb.plantProgress > 0){
      prompt = 'PLANTING BOMB — HOLD [E]';
      pct = Math.min(100, Math.round((bomb.plantProgress / rules.PLANT_SEC) * 100));
      showBar = true;
    }else if(bomb.defuserUid === ns.localUid && bomb.defuseProgress > 0){
      const hasKit = Boolean(ns.localEcon && ns.localEcon.defuseKit);
      const reqSec = hasKit ? rules.DEFUSE_KIT_SEC : rules.DEFUSE_SEC;
      prompt = `DEFUSING BOMB (${hasKit ? '3.5S KIT' : '7.0S'}) — DO NOT RELEASE [E]`;
      pct = Math.min(100, Math.round((bomb.defuseProgress / reqSec) * 100));
      showBar = true;
    }else if(ns.localTeam === 'atk' && bomb.state === 'carried' && bomb.carrierUid === ns.localUid && playerObj){
      const mapData = global.NetcodeSystem && global.NetcodeSystem.getTacticalLevelData();
      const site = mapData && global.TacticalMapCatalog ? global.TacticalMapCatalog.findPlantSiteAt(mapData, playerObj.pos.x, playerObj.pos.y, playerObj.pos.z) : null;
      if(site) prompt = `HOLD [E] TO PLANT AT SITE ${site.id} · [G] DROP BOMB`;
    }else if(ns.localTeam === 'def' && bomb.state === 'planted' && bomb.pos && playerObj){
      const d = Math.hypot(playerObj.pos.x - bomb.pos.x, playerObj.pos.z - bomb.pos.z);
      if(d <= 3.6 && Math.abs((playerObj.pos.y || 0) - (bomb.pos.y || 0)) <= 2.6){
        prompt = ns.localEcon && ns.localEcon.defuseKit
          ? 'HOLD [E] TO DEFUSE BOMB (KIT · 3.5S)'
          : 'HOLD [E] TO DEFUSE BOMB (7.0S · CONTINUOUS)';
      }
    }else if(ns.localTeam === 'atk' && bomb.state === 'dropped' && bomb.pos && playerObj){
      const d = Math.hypot(playerObj.pos.x - bomb.pos.x, playerObj.pos.z - bomb.pos.z);
      prompt = `BOMB DROPPED · ${Math.round(d)}M AWAY`;
    }

    if(!prompt){
      el.bombAction.style.display = 'none';
      return;
    }
    el.bombAction.style.display = 'block';
    el.bombPrompt.textContent = prompt;
    el.bombBar.style.display = showBar ? 'block' : 'none';
    if(showBar) el.bombFill.style.width = `${pct}%`;
  }

  function renderDeathBreakdown(ns, specInfo){
    const overlay = document.getElementById('overlay');
    const show = Boolean(ns.mode === 'demolition_5v5' && !ns.localAlive && (ns.phase === 'live' || ns.phase === 'post_round') && overlay && overlay.style.display === 'none');
    if(!show){
      el.deathCard.style.display = 'none';
      return;
    }
    el.deathCard.style.display = 'block';
    const report = global.NetcodeSystem && typeof global.NetcodeSystem.getLocalDeathBreakdown === 'function'
      ? global.NetcodeSystem.getLocalDeathBreakdown()
      : null;
    const specLabel = specInfo && specInfo.mode === 'freecam'
      ? 'FREE-ROAM GHOST CAMERA (WASD + SPACE/SHIFT)'
      : `SPECTATING ${(specInfo && specInfo.targetName) ? specInfo.targetName.toUpperCase() : 'TEAMMATE'}`;
    const killerObj = report && report.killer ? report.killer : null;
    const rows = (report && Array.isArray(report.encounters)) ? report.encounters : [];
    const sig = `${specLabel}|${killerObj ? `${killerObj.name}|${killerObj.weapon}|${killerObj.headshot?1:0}` : 'none'}|${rows.map(r=>`${r.uid}:${r.dealtDmg}:${r.takenDmg}`).join(',')}`;
    if(sig === lastDeathSig) return;
    lastDeathSig = sig;

    el.specTarget.textContent = specLabel;
    if(report){
      const kName = killerObj ? killerObj.name : 'ENEMY';
      const kWep = killerObj ? killerObj.weapon : 'WEAPON';
      const kHs = Boolean(killerObj && killerObj.headshot);
      el.deathKiller.textContent = `ELIMINATED BY ${String(kName).toUpperCase()} · ${String(kWep).toUpperCase()}`;
      el.deathBadge.textContent = kHs ? '★ HEADSHOT' : 'ELIMINATED';
      el.deathBadge.classList.toggle('hs', kHs);
      el.deathRows.textContent = '';
      if(rows.length === 0){
        const empty = createEl('div', 'demo-death-empty');
        empty.textContent = 'No damage exchanged this round.';
        el.deathRows.appendChild(empty);
      }else{
        for(const r of rows){
          const row = createEl('div', 'demo-death-row' + (r.isKiller ? ' killer' : ''));
          row.innerHTML = `
            <span class="ddr-name">${r.name}${r.isKiller ? ' ☠' : ''}</span>
            <span class="ddr-dealt">DEALT <strong>${r.dealtDmg || 0}</strong> <em>(${r.dealtHits || 0} hits)</em></span>
            <span class="ddr-taken">TAKEN <strong>${r.takenDmg || 0}</strong> <em>(${r.takenHits || 0} hits)</em></span>
          `;
          el.deathRows.appendChild(row);
        }
      }
    }else{
      el.deathKiller.textContent = 'ELIMINATED';
      el.deathBadge.textContent = 'WAITING FOR NEXT ROUND';
      el.deathRows.textContent = '';
    }
  }

  function update(ns, dt, playerObj, specInfo){
    ensureDom();
    const isDemo = Boolean(ns && ns.isArena && ns.mode === 'demolition_5v5');

    // Flashbang whiteout
    const flashAlpha = (isDemo && global.UtilitySystem && typeof global.UtilitySystem.getLocalFlashAlpha === 'function')
      ? global.UtilitySystem.getLocalFlashAlpha()
      : 0;
    if(el.flashOverlay){
      el.flashOverlay.style.opacity = flashAlpha > 0.01 ? flashAlpha.toFixed(3) : '0';
    }

    if(!isDemo){
      if(el.topBar.style.display !== 'none') el.topBar.style.display = 'none';
      if(el.bottomBar.style.display !== 'none') el.bottomBar.style.display = 'none';
      if(el.bombAction.style.display !== 'none') el.bombAction.style.display = 'none';
      if(el.deathCard.style.display !== 'none') el.deathCard.style.display = 'none';
      if(buyMenuOpen) closeBuyMenu();
      if(commWheelOpen) closeCommWheel();
      return;
    }

    el.topBar.style.display = 'grid';
    el.bottomBar.style.display = ns.localAlive ? 'flex' : 'none';

    renderTopBar(ns);
    if(ns.localAlive) renderBottomBar(ns);
    renderBombAction(ns, playerObj);
    renderDeathBreakdown(ns, specInfo);

    if(buyMenuOpen){
      if(ns.phase !== 'buy'){
        closeBuyMenu();
      }else{
        renderBuyMenu(ns);
      }
    }
  }

  global.DemolitionUI = {
    ensureDom,
    update,
    openBuyMenu,
    closeBuyMenu,
    toggleBuyMenu,
    openCommWheel,
    closeCommWheel,
    toggleCommWheel,
    closeAllModals,
    isBuyMenuOpen: () => buyMenuOpen,
    isCommWheelOpen: () => commWheelOpen,
    getSelectedThrowable: () => selectedThrowable
  };
})(window);
