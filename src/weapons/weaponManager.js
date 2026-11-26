// First-person ViewmodelSystem overlay pass and interactive 3D ArmoryPreview / Gunsmith stage manager.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const {
    CaseAudio, WeaponAudio, createStudioEnvMap, paintGloveToCanvases,
    buildKnifeModel, disposeGroupResources, buildHandsRig,
    smoothstep, bell, applyContactGripSocket,
    createAnimOut, evaluateViewmodelChoreography, durationForInspect,
    buildWeaponModel, RIGHT_HAND_GRIP_ROLL, createWeaponAnimOut,
    weaponInspectDuration, evaluateWeaponReloadAndAction,
    evaluateWeaponChoreography, applyWeaponSocketTransform,
    applyWeaponMechanicalParts, lockSupportHandToWeapon
  } = VI;
  // ---------- Main First-Person Viewmodel Overlay Pass ----------
  const ViewmodelSystem = (() => {
    let vmScene = null;
    let vmCamera = null;
    let studioEnv = null;
    let rig = null;
    let currentKnifeMesh = null;
    const SCORESTREAK_SLOTS = ['rpg', 'minigun', 'railcannon', 'grenadelauncher'];
    const ALL_WEAPON_TYPES = [...(Array.isArray(KS.WEAPON_TYPE_IDS) ? KS.WEAPON_TYPE_IDS : ['rifle', 'smg', 'shotgun', 'awp', 'revolver', 'deagle', 'pistol']), ...SCORESTREAK_SLOTS];
    let currentWeaponMeshes = {};
    let currentWeaponItems = {};
    let currentWeaponAttachments = {};
    let currentWeaponBuildSig = {};
    for (const wt of ALL_WEAPON_TYPES) {
      currentWeaponMeshes[wt] = null;
      currentWeaponItems[wt] = SCORESTREAK_SLOTS.includes(wt)
        ? { id: 'streak_' + wt, weaponType: wt, skinId: 'tactical_carbon', floatValue: 0.04, patternSeed: 1 }
        : KS.createStarterWeapon(wt);
      currentWeaponAttachments[wt] = {};
      currentWeaponBuildSig[wt] = '';
    }
    let activeSlot = 'knife';
    let isScoped = false;
    let adsActive = false;
    let adsProgress = 0;
    let adsScopedOptic = false;
    let currentItem = null;
    let currentGlove = KS.createStarterGlove();
    let mainRenderer = null;
    let matchKillStreak = 0;

    const vmOffset = { offsetX: 0, offsetY: 0, offsetZ: 0, fov: 62 };

    const weaponAnim = {
      recoilKick: 0,
      recoilPitch: 0,
      slideKick: 0,
      hammerKick: 0,
      flashTimer: 0,
      reloadT: 1,
      reloadDuration: 1.6,
      drawT: 1,
      drawDuration: 0.36,
      drawCueMask: 0,
      inspectT: 1,
      inspectDuration: 2.35,
      inspectTier: 'normal',
      inspectCueMask: 0,
      reloadCueMask: 0,
      boltCueMask: 0,
      spinBonus: 0,
      boltT: 1,
      fanT: 1,
      revolverAmmo: 6,
      revolverCharge: 0,
      revolverReloadPhase: 'none',
      revolverReloadPhaseProgress: 0,
      revolverCylinderIndex: 0,
      slashT: 1,
      katanaSlashT: 1,
      katanaSlashCombo: 0,
      katanaDashT: 1,
      katanaDeflectProgress: 0,
      katanaDeflectActive: false,
      katanaDeflectEnergy: 1,
      akimboLeftKick: 0,
      akimboRightKick: 0,
      akimboSideToggle: 0,
      minigunSpinSpeed: 0,
      minigunSpinAngle: 0,
      drumAngle: 0
    };

    const animState = {
      drawT: 1,
      drawDuration: 0.62,
      inspectT: 1,
      inspectDuration: 2.0,
      inspectTier: 'normal',
      spinBonus: 0,
      drawCueMask: 0,
      inspectCueMask: 0
    };

    let bobPhase = 0;
    let swayX = 0, swayY = 0;
    let bankRoll = 0, crouchDip = 0;
    const _animOut = createAnimOut();
    const _weaponOut = createWeaponAnimOut();
    // Reused scratch vectors for the exact ADS optic-to-camera alignment solve.
    const _adsEyeWorld = new THREE.Vector3();
    const _adsEyeLocal = new THREE.Vector3();
    const _adsTargetLocal = new THREE.Vector3();

    function init(renderer) {
      if (vmScene) return;
      mainRenderer = renderer;
      vmScene = new THREE.Scene();
      vmCamera = new THREE.PerspectiveCamera(vmOffset.fov, innerWidth / innerHeight, 0.01, 12);
      vmScene.add(vmCamera);

      studioEnv = createStudioEnvMap(renderer);
      vmScene.environment = studioEnv;

      vmScene.add(new THREE.HemisphereLight(0xc8ecff, 0x1b2836, 1.32));
      const key = new THREE.DirectionalLight(0xfff4e6, 2.40);
      key.position.set(2.0, 3.0, 2.5);
      vmScene.add(key);
      const rim = new THREE.DirectionalLight(0x66e4ff, 1.55);
      rim.position.set(-2.5, 1.4, -1.5);
      vmScene.add(rim);

      rig = buildHandsRig();
      rig.applyGlove(currentGlove, mainRenderer);
      vmScene.add(rig.rootRig);
      applyOffsetToRig();

      addEventListener('resize', () => {
        if (!vmCamera) return;
        vmCamera.aspect = innerWidth / innerHeight;
        vmCamera.updateProjectionMatrix();
      });
    }

    function applyOffsetToRig() {
      if (rig) {
        rig.rootRig.position.set(
          vmOffset.offsetX * 0.022,
          vmOffset.offsetY * 0.022,
          -vmOffset.offsetZ * 0.026
        );
      }
      if (vmCamera && Math.abs(vmCamera.fov - vmOffset.fov) > 0.01) {
        vmCamera.fov = vmOffset.fov;
        vmCamera.updateProjectionMatrix();
      }
    }

    function applySettings(settings) {
      const vm = settings && settings.viewmodel;
      if (!vm) return;
      vmOffset.offsetX = Number.isFinite(vm.offsetX) ? Math.max(-2.5, Math.min(2.5, vm.offsetX)) : 0;
      vmOffset.offsetY = Number.isFinite(vm.offsetY) ? Math.max(-2.5, Math.min(2.5, vm.offsetY)) : 0;
      vmOffset.offsetZ = Number.isFinite(vm.offsetZ) ? Math.max(-2.5, Math.min(2.5, vm.offsetZ)) : 0;
      vmOffset.fov = Number.isFinite(vm.fov) ? Math.max(54, Math.min(72, vm.fov)) : 62;
      applyOffsetToRig();
    }

    function syncActiveMeshVisibility() {
      if (currentKnifeMesh) currentKnifeMesh.visible = activeSlot === 'knife';
      for (const wt of ALL_WEAPON_TYPES) {
        const m = currentWeaponMeshes[wt];
        if (m) m.visible = activeSlot === wt;
      }
      if (rig && rig.rootRig) {
        rig.rootRig.visible = !isScoped;
      }
    }

    function buildWeaponSignature(item, atts) {
      const a = atts && typeof atts === 'object' ? atts : {};
      const keys = Object.keys(a).sort();
      return (item ? `${item.id}:${item.skinId}:${item.patternSeed}:${item.floatValue}` : 'none') + '|' + keys.map((k) => `${k}=${a[k]}`).join(',');
    }

    function equipWeaponSkin(arg1, arg2, attachments) {
      if (!vmScene || !rig) return;
      const rawItem =
        typeof arg1 === 'string' && arg2 && typeof arg2 === 'object'
          ? { ...arg2, weaponType: arg2.weaponType || arg1 }
          : arg1;
      const rawWt = rawItem && rawItem.weaponType;
      const isStreak = SCORESTREAK_SLOTS.includes(rawWt);
      const clean = isStreak
        ? { id: 'streak_' + rawWt, weaponType: rawWt, skinId: 'tactical_carbon', floatValue: 0.04, patternSeed: 1 }
        : KS.sanitizeWeaponItem(rawItem);
      const wt = isStreak ? rawWt : clean.weaponType;
      const nextAtts = isStreak
        ? {}
        : (attachments && typeof attachments === 'object' ? Object.assign({}, attachments) : (currentWeaponAttachments[wt] || {}));
      const sig = buildWeaponSignature(clean, nextAtts);
      currentWeaponItems[wt] = clean;
      currentWeaponAttachments[wt] = nextAtts;
      if (currentWeaponMeshes[wt] && currentWeaponBuildSig[wt] === sig) {
        syncActiveMeshVisibility();
        return;
      }
      if (currentWeaponMeshes[wt]) {
        rig.knifeSocket.remove(currentWeaponMeshes[wt]);
        disposeGroupResources(currentWeaponMeshes[wt]);
        currentWeaponMeshes[wt] = null;
      }
      const mesh = buildWeaponModel(clean, mainRenderer, nextAtts);
      applyWeaponSocketTransform(mesh, wt, null);
      rig.knifeSocket.add(mesh);
      currentWeaponMeshes[wt] = mesh;
      currentWeaponBuildSig[wt] = sig;
      syncActiveMeshVisibility();
    }

    function equipWeaponBuild(weaponItem, attachments) {
      equipWeaponSkin(weaponItem, null, attachments || {});
    }

    function ensureWeaponMesh(wt) {
      if (!currentWeaponMeshes[wt] && rig && vmScene) {
        const fallback = SCORESTREAK_SLOTS.includes(wt)
          ? { id: 'streak_' + wt, weaponType: wt, skinId: 'tactical_carbon', floatValue: 0.04, patternSeed: 1 }
          : KS.createStarterWeapon(wt);
        equipWeaponSkin(currentWeaponItems[wt] || fallback, null, currentWeaponAttachments[wt] || {});
      }
    }

    function setKatanaState(st) {
      if (!st) return;
      weaponAnim.katanaDeflectActive = Boolean(st.deflecting);
      if (Number.isFinite(st.deflectEnergy)) weaponAnim.katanaDeflectEnergy = st.deflectEnergy;
    }

    function triggerKatanaSlash(comboIdx) {
      weaponAnim.katanaSlashT = 0;
      weaponAnim.katanaSlashCombo = Number.isFinite(comboIdx) ? comboIdx : ((weaponAnim.katanaSlashCombo + 1) % 3);
      weaponAnim.inspectT = 1;
    }

    function triggerKatanaDash() {
      weaponAnim.katanaDashT = 0;
      weaponAnim.inspectT = 1;
    }

    function setScorestreakAnimState(st) {
      if (!st) return;
      if (Number.isFinite(st.spinRate)) weaponAnim.minigunSpinSpeed = Math.max(0, Math.min(1, st.spinRate));
    }

    function setMatchKillStreak(streak) {
      matchKillStreak = Math.max(0, Math.floor(Number(streak) || 0));
    }

    function setRevolverState(st) {
      if (!st || !st.active) {
        weaponAnim.revolverCharge = 0;
        weaponAnim.revolverReloadPhase = 'none';
        weaponAnim.revolverReloadPhaseProgress = 0;
        return;
      }
      weaponAnim.revolverAmmo = Number.isFinite(st.ammo) ? st.ammo : 6;
      weaponAnim.revolverCharge = Number.isFinite(st.chargeProgress) ? st.chargeProgress : 0;
      weaponAnim.revolverReloadPhase = st.reloadPhase || 'none';
      weaponAnim.revolverReloadPhaseProgress = Number.isFinite(st.reloadPhaseProgress) ? st.reloadPhaseProgress : 0;
      weaponAnim.revolverCylinderIndex = Number.isFinite(st.cylinderIndex) ? st.cylinderIndex : 0;
      if (weaponAnim.revolverCharge > 0.03 || weaponAnim.revolverReloadPhase !== 'none') {
        weaponAnim.inspectT = 1;
        weaponAnim.spinBonus = 0;
      }
    }

    function setActiveSlot(slot, playDraw = true) {
      const valid = ALL_WEAPON_TYPES.includes(slot) || slot === 'knife' ? slot : 'knife';
      const changed = activeSlot !== valid;
      activeSlot = valid;
      if (changed) {
        isScoped = false;
        adsActive = false;
        adsProgress = 0;
        adsScopedOptic = false;
      }
      if (valid !== 'knife') ensureWeaponMesh(valid);
      if (rig && rig.reloadShellsGroup) rig.reloadShellsGroup.visible = false;
      if (rig && rig.reloadBulletGroup) rig.reloadBulletGroup.visible = false;
      syncActiveMeshVisibility();
      if (playDraw && changed) {
        if (valid === 'knife') {
          triggerDraw();
        } else {
          weaponAnim.drawT = 0;
          weaponAnim.drawCueMask = 0;
          weaponAnim.drawDuration = valid === 'revolver' ? 0.56 : valid === 'awp' ? 0.44 : (valid === 'deagle' || valid === 'pistol') ? 0.26 : valid === 'smg' ? 0.30 : 0.36;
          weaponAnim.reloadT = 1;
          weaponAnim.reloadCueMask = 0;
          weaponAnim.boltT = 1;
          weaponAnim.boltCueMask = 0;
          weaponAnim.fanT = 1;
          weaponAnim.inspectT = 1;
          weaponAnim.spinBonus = 0;
          weaponAnim.recoilKick = 0;
          weaponAnim.recoilPitch = 0;
          weaponAnim.slideKick = 0;
          weaponAnim.hammerKick = 0;
          if (valid === 'revolver') CaseAudio.spinWhoosh(1.16);
          else WeaponAudio.weaponDraw();
        }
      }
    }

    function triggerFireRecoil(slot, opts) {
      const s = slot || activeSlot;
      const isFan = Boolean(opts && opts.fanFire);
      if (s === 'knife') {
        weaponAnim.slashT = 0;
        CaseAudio.spinWhoosh(1.22);
        return;
      }
      weaponAnim.inspectT = 1;
      weaponAnim.spinBonus = 0;
      const adsDamp = 1 - adsProgress * 0.48;
      weaponAnim.recoilKick = (
        s === 'sawedoff' || s === 'rpg' || s === 'railcannon' ? 0.112
        : s === 'awp' || s === 'scout' || s === 'leverslug' ? 0.088
        : s === 'shotgun' || s === 'grenadelauncher' ? 0.082
        : s === 'revolver' ? (isFan ? 0.056 : 0.078)
        : s === 'deagle' || s === 'scar' || s === 'dmr' ? 0.056
        : s === 'smg' || s === 'mp7' || s === 'g18' || s === 'minigun' ? 0.020
        : s === 'pistol' || s === 'usps' || s === 'akimbo' ? 0.026
        : 0.030
      ) * adsDamp;
      weaponAnim.recoilPitch = (
        s === 'sawedoff' || s === 'rpg' || s === 'railcannon' ? 0.32
        : s === 'awp' || s === 'scout' || s === 'leverslug' ? 0.24
        : s === 'shotgun' || s === 'grenadelauncher' ? 0.23
        : s === 'revolver' ? (isFan ? 0.20 : 0.30)
        : s === 'deagle' || s === 'scar' || s === 'dmr' ? 0.19
        : s === 'smg' || s === 'mp7' || s === 'g18' || s === 'minigun' ? 0.048
        : s === 'pistol' || s === 'usps' || s === 'akimbo' ? 0.085
        : 0.072
      ) * adsDamp;
      weaponAnim.slideKick = 1.0;
      weaponAnim.hammerKick = s === 'revolver' ? 0.0 : 1.0;
      weaponAnim.flashTimer = 0.052;
      if (s === 'revolver' && isFan) {
        weaponAnim.fanT = 0;
      }
      if (s === 'awp' || s === 'shotgun' || s === 'scout' || s === 'leverslug') {
        weaponAnim.boltT = 0;
        weaponAnim.boltCueMask = 0;
      }
      if (s === 'grenadelauncher') {
        weaponAnim.drumAngle += Math.PI / 3;
      }
      const mesh = currentWeaponMeshes[s];
      if (s === 'akimbo' && mesh) {
        const useLeft = Boolean(opts && opts.akimboSide === 'left') || (weaponAnim.akimboSideToggle % 2 === 1);
        weaponAnim.akimboSideToggle++;
        if (useLeft) {
          weaponAnim.akimboLeftKick = 1.0;
          if (mesh.userData.muzzleFlashLeft) {
            mesh.userData.muzzleFlashLeft.visible = true;
            mesh.userData.muzzleFlashLeft.rotation.z = Math.random() * Math.PI * 2;
          }
        } else {
          weaponAnim.akimboRightKick = 1.0;
          if (mesh.userData.muzzleFlash) {
            mesh.userData.muzzleFlash.visible = true;
            mesh.userData.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
          }
        }
      } else if (mesh && mesh.userData.muzzleFlash) {
        mesh.userData.muzzleFlash.visible = true;
        mesh.userData.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
      }
    }

    function triggerReload(duration) {
      if (activeSlot === 'knife') return;
      weaponAnim.inspectT = 1;
      weaponAnim.spinBonus = 0;
      weaponAnim.reloadT = 0;
      weaponAnim.reloadCueMask = 0;
      weaponAnim.boltT = 1;
      weaponAnim.boltCueMask = 0;
      weaponAnim.fanT = 1;
      weaponAnim.reloadDuration = Math.max(0.6, Number(duration) || 1.6);
      adsActive = false;
      isScoped = false;
      syncActiveMeshVisibility();
      if (activeSlot === 'revolver') {
        // Revolver crane open audio is triggered by CombatSystem phase sync
      } else if (activeSlot === 'shotgun') {
        WeaponAudio.weaponDraw();
      } else {
        WeaponAudio.reloadStart();
      }
    }

    function setScoped(scoped) {
      isScoped = Boolean(scoped) && activeSlot !== 'knife';
      if (rig && rig.rootRig) rig.rootRig.visible = !isScoped;
    }

    function setAdsState(active, durationSec, isScopedOptic) {
      adsActive = Boolean(active) && activeSlot !== 'knife';
      adsScopedOptic = Boolean(isScopedOptic);
      if (!adsActive) {
        isScoped = false;
        if (rig && rig.rootRig) rig.rootRig.visible = true;
      }
    }

    function equipKnife(item, playDraw = true) {
      if (!vmScene || !rig) return;
      if (currentKnifeMesh) {
        rig.knifeSocket.remove(currentKnifeMesh);
        disposeGroupResources(currentKnifeMesh);
        currentKnifeMesh = null;
      }
      currentItem = KS.sanitizeKnifeItem(item || KS.createStarterKnife());
      currentKnifeMesh = buildKnifeModel(currentItem, mainRenderer);
      applyContactGripSocket(currentKnifeMesh, currentItem.knifeType);
      rig.knifeSocket.add(currentKnifeMesh);
      syncActiveMeshVisibility();
      if (playDraw && activeSlot === 'knife') triggerDraw();
      else {
        animState.drawT = 1;
        animState.inspectT = 1;
      }
    }

    function equipGlove(gloveItem) {
      currentGlove = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
      if (rig) {
        rig.applyGlove(currentGlove, mainRenderer);
      }
    }

    function triggerDraw() {
      if (!currentItem) return;
      const kt = currentItem.knifeType;
      animState.drawT = 0;
      animState.drawCueMask = 0;
      animState.drawDuration = kt === 'butterfly' ? 0.72 : kt === 'karambit' || kt === 'skeleton' ? 0.58 : 0.54;
      animState.inspectT = 1;
      animState.spinBonus = 0;
      if (kt === 'butterfly') CaseAudio.balisongClack(1.18);
      else CaseAudio.bladeShing();
    }

    function triggerInspect(forceTier) {
      if (activeSlot !== 'knife') {
        if (weaponAnim.reloadT < 1 || weaponAnim.revolverReloadPhase !== 'none') return null;
        const wt = activeSlot;

        // Protect an active 1/100 Mythic revolver showstopper inspect from accidental early cancel
        if (!forceTier && wt === 'revolver' && weaponAnim.inspectT < 0.55 && weaponAnim.inspectTier === 'mythic') {
          return { tier: 'mythic', weaponType: wt, mythicName: 'High Noon Showstopper', continued: true };
        }

        // Classic CS2 Deagle & R-88 Revolver F-spam chaining during active Trigger-Finger Spin!
        if (!forceTier && (wt === 'deagle' || wt === 'revolver') && weaponAnim.inspectT < 0.86 && weaponAnim.inspectTier === 'uncommon') {
          weaponAnim.spinBonus = Math.min(weaponAnim.spinBonus + Math.PI * 2, Math.PI * 10);
          weaponAnim.inspectT = Math.min(weaponAnim.inspectT, 0.24);
          weaponAnim.inspectCueMask &= ~14;
          CaseAudio.spinWhoosh(1.24);
          return { tier: 'uncommon', weaponType: wt, chained: true };
        }

        let wTier;
        if (forceTier === 'mythic') {
          wTier = wt === 'revolver' ? 'mythic' : 'uncommon';
        } else if (forceTier === 'uncommon' || forceTier === true) {
          wTier = 'uncommon';
        } else if (forceTier === 'normal' || forceTier === false) {
          wTier = 'normal';
        } else if (wt === 'revolver') {
          const r = Math.random();
          wTier = r < 0.01 ? 'mythic' : r < 0.36 ? 'uncommon' : 'normal';
        } else {
          wTier = Math.random() < (wt === 'deagle' ? 0.24 : 0.20) ? 'uncommon' : 'normal';
        }

        weaponAnim.inspectT = 0;
        weaponAnim.inspectTier = wTier;
        weaponAnim.inspectCueMask = 0;
        weaponAnim.spinBonus = 0;
        weaponAnim.inspectDuration = weaponInspectDuration(wt, wTier);
        if (wTier === 'mythic' && wt === 'revolver') CaseAudio.mythicFlourish();
        else if (wTier === 'uncommon' && (wt === 'deagle' || wt === 'revolver')) CaseAudio.spinWhoosh(1.18);
        else WeaponAudio.weaponDraw();
        return { tier: wTier, weaponType: wt, mythicName: wt === 'revolver' && wTier === 'mythic' ? 'High Noon Showstopper' : '' };
      }

      if (!currentItem) return null;
      const kt = currentItem.knifeType;

      // Protect an active 1/100 Mythic inspect from accidental cancel during its opening beat
      if (animState.inspectT < 0.45 && animState.inspectTier === 'mythic' && !forceTier) {
        return { tier: 'mythic', knifeType: kt, mythicName: KS.KNIFE_TYPES[kt].mythicName, continued: true };
      }

      // Rapid F-chaining on Normal/Uncommon inspects (classic CS surf fidget spam!)
      if (!forceTier && animState.inspectT < 0.88 && animState.inspectTier !== 'mythic' && (kt === 'karambit' || kt === 'skeleton')) {
        animState.spinBonus = Math.min(animState.spinBonus + Math.PI * 2, Math.PI * 10);
        animState.inspectT = Math.min(animState.inspectT, 0.22);
        animState.inspectTier = 'uncommon';
        CaseAudio.spinWhoosh(kt === 'karambit' ? 1.15 : 1.0);
        return { tier: 'uncommon', knifeType: kt, chained: true };
      }
      if (!forceTier && animState.inspectT < 0.82 && animState.inspectTier !== 'mythic' && kt === 'butterfly') {
        animState.inspectT = 0.06;
        animState.inspectCueMask = 0;
        const nextTier = KS.rollInspectTier();
        animState.inspectTier = nextTier;
        animState.inspectDuration = durationForInspect(kt, nextTier);
        if (nextTier === 'mythic') CaseAudio.mythicFlourish();
        CaseAudio.balisongClack(1.22);
        return { tier: nextTier, knifeType: kt, mythicName: KS.KNIFE_TYPES[kt].mythicName, chained: true };
      }

      let tier;
      if (forceTier === 'mythic' || forceTier === 'uncommon' || forceTier === 'normal') {
        tier = forceTier;
      } else if (typeof forceTier === 'boolean') {
        tier = forceTier ? 'uncommon' : 'normal';
      } else {
        tier = KS.rollInspectTier();
      }

      animState.drawT = 1;
      animState.inspectT = 0;
      animState.inspectCueMask = 0;
      animState.spinBonus = 0;
      animState.inspectTier = tier;
      animState.inspectDuration = durationForInspect(kt, tier);

      if (tier === 'mythic') {
        CaseAudio.mythicFlourish();
        if (kt === 'butterfly') CaseAudio.balisongClack(1.20);
        else CaseAudio.spinWhoosh(1.18);
      } else if (kt === 'butterfly') {
        CaseAudio.balisongClack(1.14);
      } else if (tier === 'uncommon') {
        CaseAudio.spinWhoosh(kt === 'karambit' ? 1.18 : kt === 'skeleton' ? 1.02 : 0.88);
      } else {
        CaseAudio.bladeShing();
      }

      return {
        tier,
        knifeType: kt,
        mythicName: KS.KNIFE_TYPES[kt] ? KS.KNIFE_TYPES[kt].mythicName : ''
      };
    }

    function addLookDelta(dx, dy) {
      swayX = Math.max(-0.05, Math.min(0.05, swayX - dx * 0.00016));
      swayY = Math.max(-0.04, Math.min(0.04, swayY + dy * 0.00014));
    }

    function solveAdsPivotPosition(mesh, adsRz) {
      const pivot = rig.rightHandPivot;
      const eyePoint = mesh.userData.opticEyePoint;
      if (!eyePoint) {
        return {
          x: -vmOffset.offsetX * 0.022,
          y: -vmOffset.offsetY * 0.022,
          z: adsRz
        };
      }

      // Evaluate the complete weapon -> socket -> hand -> rig transform at the
      // final ADS rotation, with the pivot temporarily at the rig origin.
      pivot.position.set(0, 0, 0);
      pivot.rotation.set(0, 0, RIGHT_HAND_GRIP_ROLL);
      rig.rootRig.updateMatrixWorld(true);

      _adsEyeWorld.copy(eyePoint);
      mesh.localToWorld(_adsEyeWorld);
      _adsEyeLocal.copy(_adsEyeWorld);
      rig.rootRig.worldToLocal(_adsEyeLocal);

      // The viewmodel camera sits at world origin. Convert that target into
      // rig-local space so user viewmodel offsets are handled automatically.
      _adsTargetLocal.set(0, 0, 0);
      rig.rootRig.worldToLocal(_adsTargetLocal);

      return {
        x: _adsTargetLocal.x - _adsEyeLocal.x,
        y: _adsTargetLocal.y - _adsEyeLocal.y,
        z: adsRz
      };
    }

    function updateWeaponViewmodel(dt, bobX, bobY, isSurf) {
      const wt = activeSlot;
      const mesh = currentWeaponMeshes[wt];
      if (!mesh) return;

      weaponAnim.recoilKick = Math.max(0, weaponAnim.recoilKick - dt * 0.34);
      weaponAnim.recoilPitch = Math.max(0, weaponAnim.recoilPitch - dt * 1.15);
      weaponAnim.slideKick = Math.max(0, weaponAnim.slideKick - dt * (wt === 'deagle' ? 8.5 : 11.5));
      weaponAnim.hammerKick = Math.max(0, weaponAnim.hammerKick - dt * 6.5);
      weaponAnim.akimboLeftKick = Math.max(0, weaponAnim.akimboLeftKick - dt * 8.0);
      weaponAnim.akimboRightKick = Math.max(0, weaponAnim.akimboRightKick - dt * 8.0);
      if (weaponAnim.katanaSlashT < 1) weaponAnim.katanaSlashT = Math.min(1, weaponAnim.katanaSlashT + dt / 0.34);
      if (weaponAnim.katanaDashT < 1) weaponAnim.katanaDashT = Math.min(1, weaponAnim.katanaDashT + dt / 0.28);
      const targetDeflect = (wt === 'katana' && weaponAnim.katanaDeflectActive) ? 1 : 0;
      weaponAnim.katanaDeflectProgress += (targetDeflect - weaponAnim.katanaDeflectProgress) * Math.min(1, dt * 16);
      if (wt === 'minigun') {
        weaponAnim.minigunSpinAngle += dt * (2.5 + weaponAnim.minigunSpinSpeed * 28.0);
      }

      if (weaponAnim.flashTimer > 0) {
        weaponAnim.flashTimer -= dt;
        if (weaponAnim.flashTimer <= 0) {
          if (mesh.userData.muzzleFlash) mesh.userData.muzzleFlash.visible = false;
          if (mesh.userData.muzzleFlashLeft) mesh.userData.muzzleFlashLeft.visible = false;
        }
      }
      if (weaponAnim.drawT < 1) weaponAnim.drawT = Math.min(1, weaponAnim.drawT + dt / weaponAnim.drawDuration);
      if (weaponAnim.reloadT < 1) weaponAnim.reloadT = Math.min(1, weaponAnim.reloadT + dt / weaponAnim.reloadDuration);
      if (weaponAnim.inspectT < 1) weaponAnim.inspectT = Math.min(1, weaponAnim.inspectT + dt / weaponAnim.inspectDuration);
      if (weaponAnim.boltT < 1) weaponAnim.boltT = Math.min(1, weaponAnim.boltT + dt / (wt === 'shotgun' || wt === 'leverslug' || wt === 'scout' ? 0.44 : 0.78));
      if (weaponAnim.fanT < 1) weaponAnim.fanT = Math.min(1, weaponAnim.fanT + dt / 0.20);

      if (adsScopedOptic) {
        const shouldHideForScope = adsProgress >= 0.72 && adsActive;
        if (isScoped !== shouldHideForScope) {
          isScoped = shouldHideForScope;
          if (rig && rig.rootRig) rig.rootRig.visible = !isScoped;
        }
      } else if (isScoped) {
        isScoped = false;
        if (rig && rig.rootRig) rig.rootRig.visible = true;
      }

      if (adsProgress > 0.05) {
        weaponAnim.inspectT = 1;
      }

      evaluateWeaponChoreography(wt, weaponAnim, _weaponOut, true);
      evaluateWeaponReloadAndAction(wt, weaponAnim, _weaponOut, true);

      // Attach live Katana / Akimbo / Scorestreak FX fields to _weaponOut
      _weaponOut.katanaTrailOpacity = 0;
      _weaponOut.katanaDeflectAura = wt === 'katana' ? weaponAnim.katanaDeflectProgress * (0.45 + 0.45 * weaponAnim.katanaDeflectEnergy) : 0;
      _weaponOut.akimboLeftKick = weaponAnim.akimboLeftKick;
      _weaponOut.akimboRightKick = weaponAnim.akimboRightKick;
      _weaponOut.minigunSpinAngle = weaponAnim.minigunSpinAngle;
      _weaponOut.drumAngle = weaponAnim.drumAngle;

      const adsEase = wt === 'katana' || wt === 'akimbo' ? 0 : smoothstep(0, 1, adsProgress);
      const drawDip = (1 - smoothstep(0, 1, weaponAnim.drawT)) * (wt === 'revolver' ? 0.16 : 0.22) * (1 - adsEase);
      const reloadArc = weaponAnim.reloadT < 1 ? Math.sin(weaponAnim.reloadT * Math.PI) : 0;
      const boltArc = (wt === 'awp' || wt === 'scout' || wt === 'shotgun' || wt === 'leverslug') && weaponAnim.boltT < 1 ? Math.sin(weaponAnim.boltT * Math.PI) : 0;
      const motionDamp = 1 - adsEase;

      _weaponOut.wPosX *= motionDamp;
      _weaponOut.wPosY *= motionDamp;
      _weaponOut.wPosZ *= motionDamp;

      const isPistol = wt === 'deagle' || wt === 'pistol' || wt === 'revolver' || wt === 'g18' || wt === 'usps';
      const isLong = wt === 'awp' || wt === 'dmr' || wt === 'scout' || wt === 'railcannon' || wt === 'rpg';
      const hipRx = wt === 'minigun' ? 0.175 : wt === 'akimbo' ? 0.135 : wt === 'katana' ? 0.165 : wt === 'revolver' ? 0.132 : isPistol ? 0.138 : isLong ? 0.168 : (wt === 'smg' || wt === 'mp7') ? 0.148 : 0.162;
      const hipRy = wt === 'minigun' ? -0.225 : wt === 'akimbo' ? -0.145 : wt === 'katana' ? -0.170 : wt === 'revolver' ? -0.148 : isPistol ? -0.152 : isLong ? -0.172 : (wt === 'smg' || wt === 'mp7') ? -0.158 : -0.166;
      const hipRz = wt === 'minigun' ? -0.220 : wt === 'akimbo' ? -0.320 : wt === 'katana' ? -0.245 : wt === 'revolver' ? -0.305 : isPistol ? -0.320 : isLong ? -0.252 : (wt === 'smg' || wt === 'mp7') ? -0.285 : -0.268;

      const adsRz = isPistol ? -0.245 : (wt === 'smg' || wt === 'mp7') ? -0.205 : -0.190;
      applyWeaponSocketTransform(mesh, wt, _weaponOut);
      const adsPivot = solveAdsPivotPosition(mesh, adsRz);

      let rx = THREE.MathUtils.lerp(hipRx, adsPivot.x, adsEase) + (bobX * 0.85 + swayX) * motionDamp + _weaponOut.rx * motionDamp;
      let ry = THREE.MathUtils.lerp(hipRy, adsPivot.y, adsEase) + (-bobY * 0.85 + swayY) * motionDamp + crouchDip * motionDamp - drawDip + _weaponOut.ry * motionDamp;
      let rz = THREE.MathUtils.lerp(hipRz, adsRz, adsEase) + weaponAnim.recoilKick + _weaponOut.rz * motionDamp;

      let rRotX = THREE.MathUtils.lerp(0.03, 0.0, adsEase) + swayY * 1.1 * motionDamp + weaponAnim.recoilPitch - drawDip * 1.35 + _weaponOut.rRotX * motionDamp;
      let rRotY = THREE.MathUtils.lerp(isPistol ? 0.06 : 0.05, 0.0, adsEase) + swayX * 1.3 * motionDamp + _weaponOut.rRotY * motionDamp;
      let rRotZ = RIGHT_HAND_GRIP_ROLL - bankRoll * 0.85 * motionDamp + _weaponOut.rRotZ * motionDamp;

      if (isSurf) {
        ry += 0.012 * motionDamp;
        rRotZ -= bankRoll * 0.24 * motionDamp;
      }

      rig.rightHandPivot.position.set(rx, ry, rz);
      rig.rightHandPivot.rotation.set(rRotX, rRotY, rRotZ);

      if (rig.reloadShellsGroup) {
        const showShells = Boolean(_weaponOut.showReloadShells) && adsEase < 0.35;
        rig.reloadShellsGroup.visible = showShells;
        if (showShells && rig.shellHullMat) {
          rig.shellHullMat.color.setHex(mesh.userData.shellColor || 0xc82532);
        }
      }
      if (rig.reloadBulletGroup) {
        rig.reloadBulletGroup.visible = Boolean(_weaponOut.showReloadBullet) && adsEase < 0.35;
      }

      applyWeaponMechanicalParts(mesh, wt, _weaponOut, reloadArc, boltArc, weaponAnim.slideKick, weaponAnim.hammerKick);
      lockSupportHandToWeapon(rig, mesh, wt, reloadArc, _weaponOut);

      // Spin & energize mounted Apex Chrono Gyro core live with ADS hangtime weight
      const gyro = mesh.userData.chronoGyro;
      if (gyro) {
        const cw = Math.max(0, Math.min(1, chronoGyroWeight));
        const spinRate = 1.6 + cw * (gyro.tier >= 2 ? 14.0 : 10.5);
        gyro.outerRing.rotation.x += dt * spinRate;
        gyro.innerRing.rotation.z -= dt * spinRate * 1.45;
        gyro.innerRing.rotation.x += dt * spinRate * 0.7;
        gyro.coreOrb.rotation.y += dt * (2.5 + cw * 9.0);
        const s = 1.0 + cw * 0.24;
        gyro.coreOrb.scale.setScalar(s);
        gyro.ringMat.emissiveIntensity = 0.85 + cw * 2.25;
      }
    }

    let chronoGyroWeight = 0;

    function update(dt, playerState, sharedAdsProgress, chronoWeight) {
      if (!rig || !currentItem) return;
      if (typeof VI.updateDynamicSkinMaterials === 'function') {
        VI.updateDynamicSkinMaterials(dt, matchKillStreak);
      }
      if (Number.isFinite(sharedAdsProgress)) {
        adsProgress = Math.max(0, Math.min(1, sharedAdsProgress));
      }
      chronoGyroWeight = Number.isFinite(chronoWeight) ? Math.max(0, Math.min(1, chronoWeight)) : 0;
      const damp = Math.min(1, dt * 11);

      swayX += (0 - swayX) * Math.min(1, dt * 10);
      swayY += (0 - swayY) * Math.min(1, dt * 10);

      const sp = playerState ? Math.hypot(playerState.vel.x, playerState.vel.z) : 0;
      const isGround = !!(playerState && playerState.grounded);
      const isSurf = !!(playerState && (playerState.surfing || playerState.surfGrace > 0.04));
      const targetBank = playerState ? (playerState.roll || 0) * 1.45 : 0;
      const targetDip = playerState && playerState.low ? -0.028 : 0;

      bankRoll += (targetBank - bankRoll) * damp;
      crouchDip += (targetDip - crouchDip) * damp;
      bobPhase += dt * (isGround && sp > 2 ? Math.min(11, 5 + sp * 0.22) : 1.65);

      const bobAmp = isGround && sp > 2 ? Math.min(0.013, sp * 0.00065) : 0.0028;
      const bobX = Math.cos(bobPhase) * bobAmp;
      const bobY = Math.abs(Math.sin(bobPhase)) * bobAmp * 1.15;

      if (activeSlot !== 'knife') {
        updateWeaponViewmodel(dt, bobX, bobY, isSurf);
        return;
      }

      if (rig && rig.reloadShellsGroup) rig.reloadShellsGroup.visible = false;
      if (rig && rig.reloadBulletGroup) rig.reloadBulletGroup.visible = false;
      if (!currentKnifeMesh) return;
      const kt = currentItem.knifeType;

      if (animState.drawT < 1) animState.drawT = Math.min(1, animState.drawT + dt / animState.drawDuration);
      if (animState.inspectT < 1) animState.inspectT = Math.min(1, animState.inspectT + dt / animState.inspectDuration);
      if (weaponAnim.slashT < 1) weaponAnim.slashT = Math.min(1, weaponAnim.slashT + dt / 0.28);

      evaluateViewmodelChoreography(kt, animState, _animOut, true);
      const slashArc = weaponAnim.slashT < 1 ? Math.sin(weaponAnim.slashT * Math.PI) : 0;

      let rx = _animOut.rx + bobX + swayX - slashArc * 0.14;
      let ry = _animOut.ry - bobY + swayY + crouchDip - slashArc * 0.04;
      const rz = _animOut.rz - slashArc * 0.09;
      let rRotX = _animOut.rRotX + swayY * 1.3 - slashArc * 0.55;
      const rRotY = _animOut.rRotY + swayX * 1.6 + slashArc * 0.65;
      let rRotZ = _animOut.rRotZ - bankRoll + slashArc * 0.72;

      const lx = _animOut.lx - bobX * 0.55 + swayX * 0.65;
      const ly = _animOut.ly - bobY * 0.45 + swayY * 0.65 + crouchDip;
      const lz = _animOut.lz;
      const lRotX = _animOut.lRotX;
      const lRotY = _animOut.lRotY;
      const lRotZ = _animOut.lRotZ - bankRoll * 0.85;

      if (isSurf) {
        ry += 0.015;
        rRotX += 0.07;
        rRotZ -= bankRoll * 0.32;
      }

      rig.rightHandPivot.position.set(rx, ry, rz);
      rig.rightHandPivot.rotation.set(rRotX, rRotY, rRotZ);
      rig.leftHandPivot.position.set(lx, ly, lz);
      rig.leftHandPivot.rotation.set(lRotX, lRotY, lRotZ);
      rig.setHandPose(rig.rightHand, _animOut.rPose);
      rig.setHandPose(rig.leftHand, _animOut.lPose);

      applyContactGripSocket(currentKnifeMesh, kt);
      currentKnifeMesh.position.x += _animOut.kPosX;
      currentKnifeMesh.position.y += _animOut.kPosY;
      currentKnifeMesh.position.z += _animOut.kPosZ;
      currentKnifeMesh.rotation.x += _animOut.kRotX;
      currentKnifeMesh.rotation.y += _animOut.kRotY;
      currentKnifeMesh.rotation.z += _animOut.kRotZ;

      if (currentKnifeMesh.userData.bladePivot && currentKnifeMesh.userData.biteHandlePivot) {
        currentKnifeMesh.userData.bladePivot.rotation.z = _animOut.baliBladeAngle;
        currentKnifeMesh.userData.biteHandlePivot.rotation.z = _animOut.baliBiteAngle;
      }
    }

    function render(renderer) {
      if (!vmScene || !vmCamera || isScoped) return;
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(vmScene, vmCamera);
      renderer.autoClear = prevAutoClear;
    }

    return {
      init,
      equipKnife,
      equipGlove,
      equipWeaponSkin,
      equipWeaponBuild,
      setActiveSlot,
      getActiveSlot: () => activeSlot,
      triggerFireRecoil,
      triggerReload,
      setRevolverState,
      setKatanaState,
      triggerKatanaSlash,
      triggerKatanaDash,
      setScorestreakAnimState,
      setMatchKillStreak,
      setScoped,
      setAdsState,
      getAdsProgress: () => adsProgress,
      applySettings,
      triggerDraw,
      triggerInspect,
      addLookDelta,
      update,
      render,
      getCurrentItem: () => currentItem,
      getCurrentGlove: () => currentGlove,
      getCurrentWeaponItem: (wt) => currentWeaponItems[wt || activeSlot] || null,
      getInspectState: () => ({
        active: animState.inspectT < 1 || weaponAnim.inspectT < 1,
        tier: activeSlot === 'knife' ? animState.inspectTier : weaponAnim.inspectTier,
        progress: activeSlot === 'knife' ? animState.inspectT : weaponAnim.inspectT
      }),
      getGloveMaterials: () => (rig ? rig.gloveMaterials : null)
    };
  })();

  // ---------- Interactive 3D Armory Preview (Live Combo Hands+Knife/Weapon OR Solo Turntable) ----------
  const ArmoryPreview = (() => {
    let canvasEl = null;
    let pRenderer = null;
    let pScene = null;
    let pCamera = null;
    let pEnv = null;

    let studioFloorGroup = null;
    let soloPivot = null;
    let soloKnifeMesh = null;

    let runnerPivot = null;
    let runnerMesh = null;

    let comboPivot = null;
    let comboRig = null;
    let comboKnifeMesh = null;

    let previewMode = 'combo'; // 'combo' | 'solo' | 'runner'
    let previewKind = 'knife'; // 'knife' | 'weapon' | 'runner'
    let currentKnife = KS.createStarterKnife();
    let currentWeapon = KS.createStarterWeapon('rifle');
    let currentAttachments = {};
    let gunsmithMode = false;
    let currentGlove = KS.createStarterGlove();

    let yaw = 0.08;
    let pitch = 0.06;
    let targetYaw = 0.08;
    let targetPitch = 0.06;
    let targetCamX = 0;
    let targetCamY = 0.02;
    let targetCamZ = 0.56;
    let targetLookX = 0;
    let targetLookY = 0;
    let curLookX = 0;
    let curLookY = 0;
    let camLerpActive = false;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let contextLost = false;

    let soloTrickT = 1;
    let soloTrickCueMask = 0;

    const comboAnimState = {
      drawT: 1,
      drawDuration: 0.6,
      inspectT: 1,
      inspectDuration: 2.1,
      inspectTier: 'normal',
      spinBonus: 0,
      drawCueMask: 0,
      inspectCueMask: 0
    };
    const _comboOut = createAnimOut();
    const _comboWeaponOut = createWeaponAnimOut();

    let rafId = 0;
    let active = false;

    function buildStudioFloor() {
      const grp = new THREE.Group();

      // Radial studio floor texture with subtle obsidian spotlight & tactical ring
      const texCanvas = document.createElement('canvas');
      texCanvas.width = 512;
      texCanvas.height = 512;
      const tctx = texCanvas.getContext('2d');
      const g = tctx.createRadialGradient(256, 256, 16, 256, 256, 248);
      g.addColorStop(0.0, 'rgba(32, 68, 92, 0.52)');
      g.addColorStop(0.32, 'rgba(15, 31, 46, 0.44)');
      g.addColorStop(0.68, 'rgba(7, 14, 22, 0.24)');
      g.addColorStop(1.0, 'rgba(5, 10, 17, 0.0)');
      tctx.fillStyle = g;
      tctx.fillRect(0, 0, 512, 512);

      // Subtle tactical crosshair ring on floor
      tctx.strokeStyle = 'rgba(101, 231, 255, 0.16)';
      tctx.lineWidth = 2;
      tctx.beginPath();
      tctx.arc(256, 256, 138, 0, Math.PI * 2);
      tctx.stroke();

      tctx.strokeStyle = 'rgba(255, 184, 77, 0.14)';
      tctx.lineWidth = 1.5;
      tctx.setLineDash([12, 16]);
      tctx.beginPath();
      tctx.arc(256, 256, 176, 0, Math.PI * 2);
      tctx.stroke();
      tctx.setLineDash([]);

      const floorTex = new THREE.CanvasTexture(texCanvas);
      floorTex.colorSpace = THREE.SRGBColorSpace;
      const floorGeo = new THREE.CircleGeometry(2.6, 48);
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        transparent: true,
        roughness: 0.78,
        metalness: 0.22,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      grp.add(floorMesh);

      // Soft contact shadow directly under center subject
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const sctx = shadowCanvas.getContext('2d');
      const sg = sctx.createRadialGradient(128, 128, 8, 128, 128, 120);
      sg.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
      sg.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 256, 256);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      shadowTex.colorSpace = THREE.SRGBColorSpace;
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 })
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.008;
      grp.add(shadowMesh);

      return grp;
    }

    function buildRunnerOperatorModel(weaponItem, attachments, gloveItem, targetRenderer) {
      if (typeof VI.buildTacticalOperatorModel === 'function') {
        return VI.buildTacticalOperatorModel({
          detail: 'showcase',
          weaponItem,
          attachments,
          gloveItem,
          targetRenderer
        });
      }
      return new THREE.Group();
    }

    function ensureInit(canvas) {
      if (pRenderer && canvasEl === canvas) return;
      if (pRenderer && canvasEl !== canvas) {
        stopLoop();
        try { pRenderer.dispose(); } catch (_) {}
        pRenderer = null;
        pScene = null;
        pCamera = null;
        soloPivot = null;
        soloKnifeMesh = null;
        runnerPivot = null;
        runnerMesh = null;
        comboPivot = null;
        comboRig = null;
        comboKnifeMesh = null;
        studioFloorGroup = null;
      }
      canvasEl = canvas;
      contextLost = false;
      pRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !(typeof isSoftwareGl !== 'undefined' && isSoftwareGl),
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      pRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pRenderer.toneMappingExposure = 1.24;

      pScene = new THREE.Scene();
      pCamera = new THREE.PerspectiveCamera(42, 1.6, 0.02, 24);
      curLookX = 0;
      curLookY = 0;
      pCamera.position.set(0, 0.02, 0.56);
      pCamera.lookAt(0, 0, 0);

      pEnv = createStudioEnvMap(pRenderer);
      pScene.environment = pEnv;

      // Balanced 3-point obsidian studio lighting (warm key + cool cyan rim + hemisphere fill)
      pScene.add(new THREE.HemisphereLight(0xd6f3ff, 0x101c28, 1.38));
      const key = new THREE.DirectionalLight(0xfff1dc, 2.75);
      key.position.set(2.1, 2.8, 2.4);
      pScene.add(key);
      const rim = new THREE.DirectionalLight(0x65e7ff, 2.15);
      rim.position.set(-2.4, 1.4, -1.8);
      pScene.add(rim);
      const amberKick = new THREE.DirectionalLight(0xffb84d, 0.85);
      amberKick.position.set(1.6, 0.4, -2.0);
      pScene.add(amberKick);

      studioFloorGroup = buildStudioFloor();
      pScene.add(studioFloorGroup);

      soloPivot = new THREE.Group();
      pScene.add(soloPivot);

      runnerPivot = new THREE.Group();
      pScene.add(runnerPivot);

      comboPivot = new THREE.Group();
      comboRig = buildHandsRig();
      comboRig.rootRig.position.set(0.015, 0.145, 0.34);
      comboPivot.add(comboRig.rootRig);
      pScene.add(comboPivot);

      if (!canvas.__velBoundOrbit) {
        canvas.__velBoundOrbit = true;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          contextLost = true;
        });
        canvas.addEventListener('webglcontextrestored', () => {
          contextLost = false;
          renderOnce();
        });
        canvas.addEventListener('pointerdown', (e) => {
          dragging = true;
          camLerpActive = false;
          lastX = e.clientX;
          lastY = e.clientY;
          canvas.setPointerCapture?.(e.pointerId);
        });
        canvas.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          yaw += dx * 0.011;
          targetYaw = yaw;
          if (previewMode === 'runner') {
            pitch = Math.max(-0.18, Math.min(0.24, pitch + dy * 0.005));
          } else {
            pitch = Math.max(-0.95, Math.min(0.95, pitch + dy * 0.009));
          }
          targetPitch = pitch;
          renderOnce();
        });
        const stopDrag = () => { dragging = false; };
        canvas.addEventListener('pointerup', stopDrag);
        canvas.addEventListener('pointercancel', stopDrag);
      }
      if (typeof ResizeObserver !== 'undefined') {
        if (canvas.__velResizeObs) {
          try { canvas.__velResizeObs.disconnect(); } catch (_) {}
        }
        const ro = new ResizeObserver(() => {
          resize();
          if (active) renderOnce();
        });
        ro.observe(canvas.parentElement || canvas);
        canvas.__velResizeObs = ro;
      }
    }

    let lastCanvasW = 0;
    let lastCanvasH = 0;

    function syncSizeIfChanged() {
      if (!pRenderer || !canvasEl || !pCamera) return false;
      const rect = canvasEl.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < 40 || h < 40) return false;
      if (w !== lastCanvasW || h !== lastCanvasH) {
        lastCanvasW = w;
        lastCanvasH = h;
        const dpr = (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 1 : Math.min(devicePixelRatio, 2);
        pRenderer.setPixelRatio(dpr);
        pRenderer.setSize(w, h, false);
        pCamera.aspect = w / h;
        pCamera.updateProjectionMatrix();
        return true;
      }
      return false;
    }

    function resize() {
      if (!pRenderer || !canvasEl || !pCamera) return;
      const rect = canvasEl.getBoundingClientRect();
      const rawW = Math.floor(rect.width);
      const rawH = Math.floor(rect.height);
      const w = rawW >= 40 ? rawW : Math.max(240, rawW);
      const h = rawH >= 40 ? rawH : Math.max(160, rawH);
      lastCanvasW = rawW >= 40 ? w : 0;
      lastCanvasH = rawH >= 40 ? h : 0;
      const dpr = (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 1 : Math.min(devicePixelRatio, 2);
      pRenderer.setPixelRatio(dpr);
      pRenderer.setSize(w, h, false);
      pCamera.aspect = w / h;
      pCamera.updateProjectionMatrix();
    }

    function rebuildModels() {
      if (!pRenderer) return;
      if (previewMode === 'runner') {
        if (runnerMesh) {
          runnerPivot.remove(runnerMesh);
          disposeGroupResources(runnerMesh);
          runnerMesh = null;
        }
        runnerMesh = buildRunnerOperatorModel(currentWeapon, currentAttachments, currentGlove, pRenderer);
        runnerPivot.add(runnerMesh);
        applyModeVisibility();
        return;
      }

      if (soloKnifeMesh) {
        soloPivot.remove(soloKnifeMesh);
        disposeGroupResources(soloKnifeMesh);
        soloKnifeMesh = null;
      }
      soloKnifeMesh = previewKind === 'weapon'
        ? buildWeaponModel(currentWeapon, pRenderer, currentAttachments)
        : buildKnifeModel(currentKnife, pRenderer);
      if (previewKind === 'weapon') {
        soloKnifeMesh.rotation.y = Math.PI / 2;
      }
      const box = new THREE.Box3().setFromObject(soloKnifeMesh);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.2);
      const fitScale = (previewKind === 'weapon' ? (gunsmithMode ? 0.62 : 0.48) : 0.40) / maxDim;
      soloKnifeMesh.scale.setScalar(fitScale);
      soloKnifeMesh.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
      soloPivot.add(soloKnifeMesh);

      if (comboKnifeMesh) {
        comboRig.knifeSocket.remove(comboKnifeMesh);
        disposeGroupResources(comboKnifeMesh);
        comboKnifeMesh = null;
      }
      comboRig.applyGlove(currentGlove, pRenderer);
      if (previewKind === 'weapon') {
        comboKnifeMesh = buildWeaponModel(currentWeapon, pRenderer, currentAttachments);
        applyWeaponSocketTransform(comboKnifeMesh, currentWeapon.weaponType, null);
      } else {
        comboKnifeMesh = buildKnifeModel(currentKnife, pRenderer);
        applyContactGripSocket(comboKnifeMesh, currentKnife.knifeType);
      }
      comboRig.knifeSocket.add(comboKnifeMesh);

      applyModeVisibility();
    }

    function applyModeVisibility() {
      if (!soloPivot || !comboPivot || !runnerPivot || !pCamera) return;
      const isCombo = previewMode === 'combo';
      const isRunner = previewMode === 'runner';
      comboPivot.visible = isCombo;
      runnerPivot.visible = isRunner;
      soloPivot.visible = !isCombo && !isRunner;
      if (studioFloorGroup) {
        studioFloorGroup.visible = !isCombo;
        if (isRunner) {
          studioFloorGroup.position.set(0, 0, 0);
          studioFloorGroup.scale.setScalar(1.0);
        } else {
          studioFloorGroup.position.set(0, -0.22, 0);
          studioFloorGroup.scale.setScalar(0.55);
        }
      }

      if (isRunner) {
        pCamera.fov = 36;
        // Shift camera target slightly left so the Runner stands heroically on the open right half
        targetCamX = -0.32;
        targetCamY = 1.18;
        targetCamZ = 2.68;
        targetLookX = -0.34;
        targetLookY = 1.04;
        pCamera.position.set(targetCamX, targetCamY, targetCamZ);
        pCamera.lookAt(targetLookX, targetLookY, 0);
      } else if (isCombo) {
        pCamera.fov = 44;
        if (previewKind === 'weapon') {
          const isPistol = currentWeapon && (currentWeapon.weaponType === 'deagle' || currentWeapon.weaponType === 'pistol' || currentWeapon.weaponType === 'revolver');
          targetCamX = 0.03; targetCamY = 0.08; targetCamZ = isPistol ? 0.50 : 0.78;
          targetLookX = 0.0; targetLookY = -0.015;
        } else {
          targetCamX = 0.01; targetCamY = 0.10; targetCamZ = 0.50;
          targetLookX = 0.01; targetLookY = 0.045;
        }
        pCamera.position.set(targetCamX, targetCamY, targetCamZ);
        pCamera.lookAt(targetLookX, targetLookY, 0);
      } else {
        pCamera.fov = gunsmithMode ? 34 : 36;
        if (!gunsmithMode) {
          targetCamX = 0;
          targetCamY = 0.015;
          targetCamZ = 0.50;
          targetLookX = 0;
          targetLookY = 0;
          curLookX = 0;
          curLookY = 0;
          if (!camLerpActive) {
            pCamera.position.set(targetCamX, targetCamY, targetCamZ);
            pCamera.lookAt(curLookX, curLookY, 0);
          }
        }
      }
      pCamera.updateProjectionMatrix();
    }

    function showCombo(canvas, knifeItem, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      gunsmithMode = false;
      camLerpActive = false;
      currentAttachments = {};
      previewKind = 'knife';
      currentKnife = KS.sanitizeKnifeItem(knifeItem || currentKnife || KS.createStarterKnife());
      currentGlove = KS.sanitizeGloveItem(gloveItem || currentGlove || KS.createStarterGlove());
      if (options.mode === 'solo' || options.mode === 'combo') {
        previewMode = options.mode;
      } else if (previewMode === 'runner') {
        previewMode = 'combo';
      }
      rebuildModels();

      yaw = previewMode === 'combo' ? 0.0 : 0.28;
      pitch = previewMode === 'combo' ? 0.04 : 0.10;
      targetYaw = yaw; targetPitch = pitch;
      soloTrickT = 1;
      soloTrickCueMask = 0;
      comboAnimState.drawT = 1;
      comboAnimState.inspectT = 1;
      comboAnimState.inspectCueMask = 0;
      comboAnimState.spinBonus = 0;
      active = true;
      startLoop();
    }

    function showWeaponCombo(canvas, weaponItem, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      gunsmithMode = false;
      camLerpActive = false;
      currentAttachments = options.attachments && typeof options.attachments === 'object' ? Object.assign({}, options.attachments) : {};
      previewKind = 'weapon';
      currentWeapon = KS.sanitizeWeaponItem(weaponItem || currentWeapon || KS.createStarterWeapon('rifle'));
      currentGlove = KS.sanitizeGloveItem(gloveItem || currentGlove || KS.createStarterGlove());
      if (options.mode === 'solo' || options.mode === 'combo') {
        previewMode = options.mode;
      } else if (previewMode === 'runner') {
        previewMode = 'combo';
      }
      rebuildModels();

      yaw = previewMode === 'combo' ? -0.78 : 0.22;
      pitch = previewMode === 'combo' ? 0.06 : 0.08;
      targetYaw = yaw; targetPitch = pitch;
      soloTrickT = 1;
      soloTrickCueMask = 0;
      comboAnimState.drawT = 1;
      comboAnimState.inspectT = 1;
      comboAnimState.inspectCueMask = 0;
      comboAnimState.spinBonus = 0;
      active = true;
      startLoop();
    }

    function showRunnerShowcase(canvas, weaponItem, attachments, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      gunsmithMode = false;
      camLerpActive = false;
      previewMode = 'runner';
      previewKind = 'runner';
      currentWeapon = KS.sanitizeWeaponItem(weaponItem || currentWeapon || KS.createStarterWeapon('rifle'));
      currentAttachments = attachments && typeof attachments === 'object' ? Object.assign({}, attachments) : {};
      currentGlove = KS.sanitizeGloveItem(gloveItem || currentGlove || KS.createStarterGlove());
      rebuildModels();
      if (options.resetCamera !== false) {
        yaw = -0.22;
        pitch = 0.02;
        targetYaw = yaw;
        targetPitch = pitch;
      }
      active = true;
      startLoop();
      requestAnimationFrame(() => { resize(); renderOnce(); });
    }

    function showGunsmithWeapon(canvas, weaponItem, attachments, opts) {
      const freshCanvas = !(pRenderer && canvasEl === canvas);
      ensureInit(canvas);
      resize();
      const options = opts || {};
      gunsmithMode = true;
      previewKind = 'weapon';
      previewMode = 'solo';
      currentWeapon = KS.sanitizeWeaponItem(weaponItem || currentWeapon || KS.createStarterWeapon('rifle'));
      currentAttachments = attachments && typeof attachments === 'object' ? Object.assign({}, attachments) : {};
      rebuildModels();
      if (options.resetCamera !== false) {
        const focusMap = {
          none:        { y: 0.06,  p: 0.06, cx: 0.00,   cy: 0.01,   z: 0.86, lx: 0.00,   ly: -0.015 },
          appearance:  { y: 0.14,  p: 0.05, cx: -0.145, cy: -0.020, z: 0.88, lx: -0.145, ly: -0.042 },
          optic:       { y: -0.14, p: 0.14, cx: 0.00,   cy: 0.01,   z: 0.72, lx: -0.02,  ly: 0.03 },
          muzzle:      { y: 0.28,  p: 0.05, cx: 0.00,   cy: 0.01,   z: 0.74, lx: 0.14,   ly: 0.00 },
          barrel:      { y: 0.22,  p: 0.07, cx: 0.00,   cy: 0.01,   z: 0.76, lx: 0.10,   ly: 0.01 },
          underbarrel: { y: 0.18,  p: -0.06,cx: 0.00,   cy: 0.01,   z: 0.74, lx: 0.06,   ly: -0.03 },
          magazine:    { y: -0.10, p: -0.08,cx: 0.00,   cy: 0.01,   z: 0.74, lx: -0.02,  ly: -0.05 },
          ammo:        { y: -0.14, p: -0.06,cx: 0.00,   cy: 0.01,   z: 0.75, lx: -0.03,  ly: -0.04 },
          rearGrip:    { y: -0.30, p: 0.04, cx: 0.00,   cy: 0.01,   z: 0.74, lx: -0.10,  ly: -0.03 },
          stock:       { y: -0.38, p: 0.06, cx: 0.00,   cy: 0.01,   z: 0.76, lx: -0.15,  ly: 0.00 },
          apex:        { y: -0.26, p: 0.10, cx: 0.00,   cy: 0.01,   z: 0.72, lx: -0.04,  ly: 0.02 }
        };
        const f = focusMap[options.focusSlot] || focusMap.none;
        targetYaw = f.y;
        targetPitch = f.p;
        targetCamX = f.cx;
        targetCamY = f.cy;
        targetCamZ = f.z;
        targetLookX = f.lx;
        targetLookY = f.ly;
        if (options.instantCamera || freshCanvas) {
          yaw = targetYaw;
          pitch = targetPitch;
          curLookX = targetLookX;
          curLookY = targetLookY;
          pCamera.position.set(targetCamX, targetCamY, targetCamZ);
          pCamera.lookAt(curLookX, curLookY, 0);
          camLerpActive = false;
        } else {
          camLerpActive = true;
        }
      }
      soloTrickT = 1;
      active = true;
      startLoop();
      requestAnimationFrame(() => { resize(); renderOnce(); });
    }

    function showKnife(canvas, knifeItem, gloveItem) {
      showCombo(canvas, knifeItem, gloveItem || currentGlove, { mode: previewMode === 'runner' ? 'combo' : previewMode });
    }

    function setMode(mode) {
      previewMode = mode === 'solo' ? 'solo' : 'combo';
      applyModeVisibility();
      yaw = previewMode === 'combo' ? (previewKind === 'weapon' ? -0.78 : 0.0) : 0.28;
      pitch = previewMode === 'combo' ? (previewKind === 'weapon' ? 0.06 : 0.04) : 0.10;
      targetYaw = yaw; targetPitch = pitch;
      renderOnce();
    }

    function playTrick(tier = 'normal') {
      if (previewMode === 'runner') return;
      if (previewKind === 'weapon') {
        const wt = currentWeapon.weaponType;
        const wTier = (tier === 'mythic' && wt === 'revolver') ? 'mythic' : (tier === 'mythic' || tier === 'uncommon') ? 'uncommon' : 'normal';
        comboAnimState.drawT = 1;
        comboAnimState.inspectT = 0;
        comboAnimState.inspectCueMask = 0;
        comboAnimState.spinBonus = 0;
        comboAnimState.inspectTier = wTier;
        comboAnimState.inspectDuration = weaponInspectDuration(wt, wTier);
        soloTrickT = 0;
        soloTrickCueMask = 0;
        if (wTier === 'mythic' && wt === 'revolver') CaseAudio.mythicFlourish();
        else if (wTier === 'uncommon' && (wt === 'deagle' || wt === 'revolver')) CaseAudio.spinWhoosh(1.22);
        else WeaponAudio.weaponDraw();
        if (!active) {
          active = true;
          startLoop();
        }
        return;
      }
      const kt = currentKnife.knifeType;
      if (previewMode === 'combo') {
        const cleanTier = tier === 'mythic' ? 'mythic' : tier === 'uncommon' ? 'uncommon' : 'normal';
        comboAnimState.drawT = 1;
        comboAnimState.inspectT = 0;
        comboAnimState.inspectCueMask = 0;
        comboAnimState.spinBonus = 0;
        comboAnimState.inspectTier = cleanTier;
        comboAnimState.inspectDuration = durationForInspect(kt, cleanTier);
        if (cleanTier === 'mythic') CaseAudio.mythicFlourish();
        if (kt === 'butterfly') CaseAudio.balisongClack(1.16);
        else CaseAudio.spinWhoosh(cleanTier === 'mythic' ? 1.2 : 1.0);
      } else {
        soloTrickT = 0;
        soloTrickCueMask = 0;
        if (tier === 'mythic') CaseAudio.mythicFlourish();
        if (kt === 'butterfly') CaseAudio.balisongClack(1.16);
        else CaseAudio.bladeShing();
      }
      if (!active) {
        active = true;
        startLoop();
      }
    }

    function updateComboRig(dt) {
      if (!comboRig || !comboKnifeMesh) return;
      if (previewKind === 'weapon') {
        const wt = currentWeapon.weaponType;
        if (comboAnimState.inspectT < 1) {
          comboAnimState.inspectT = Math.min(1, comboAnimState.inspectT + dt / comboAnimState.inspectDuration);
        }
        evaluateWeaponChoreography(wt, comboAnimState, _comboWeaponOut, true);

        const isPistol = wt === 'deagle' || wt === 'pistol' || wt === 'revolver';
        const zCenter = isPistol ? -0.26 : wt === 'awp' ? -0.09 : -0.13;
        const yCenter = isPistol ? -0.182 : -0.198;
        comboRig.rightHandPivot.position.set(
          0.02 + _comboWeaponOut.rx,
          yCenter + _comboWeaponOut.ry,
          zCenter + _comboWeaponOut.rz
        );
        comboRig.rightHandPivot.rotation.set(
          0.04 + _comboWeaponOut.rRotX,
          0.04 + _comboWeaponOut.rRotY,
          RIGHT_HAND_GRIP_ROLL + _comboWeaponOut.rRotZ
        );
        applyWeaponSocketTransform(comboKnifeMesh, wt, _comboWeaponOut);
        applyWeaponMechanicalParts(comboKnifeMesh, wt, _comboWeaponOut, 0, 0, 0, 0);
        lockSupportHandToWeapon(comboRig, comboKnifeMesh, wt, 0, _comboWeaponOut);
        return;
      }

      const kt = currentKnife.knifeType;
      if (comboAnimState.inspectT < 1) {
        comboAnimState.inspectT = Math.min(1, comboAnimState.inspectT + dt / comboAnimState.inspectDuration);
      }
      evaluateViewmodelChoreography(kt, comboAnimState, _comboOut, true);

      comboRig.rightHandPivot.position.set(_comboOut.rx * 0.72, _comboOut.ry + 0.012, _comboOut.rz);
      comboRig.rightHandPivot.rotation.set(_comboOut.rRotX, _comboOut.rRotY, _comboOut.rRotZ);
      comboRig.leftHandPivot.position.set(_comboOut.lx * 0.68, _comboOut.ly + 0.024, _comboOut.lz + 0.02);
      comboRig.leftHandPivot.rotation.set(_comboOut.lRotX, _comboOut.lRotY, _comboOut.lRotZ);
      comboRig.setHandPose(comboRig.rightHand, _comboOut.rPose);
      comboRig.setHandPose(comboRig.leftHand, _comboOut.lPose);

      applyContactGripSocket(comboKnifeMesh, kt);
      comboKnifeMesh.position.x += _comboOut.kPosX;
      comboKnifeMesh.position.y += _comboOut.kPosY;
      comboKnifeMesh.position.z += _comboOut.kPosZ;
      comboKnifeMesh.rotation.x += _comboOut.kRotX;
      comboKnifeMesh.rotation.y += _comboOut.kRotY;
      comboKnifeMesh.rotation.z += _comboOut.kRotZ;

      if (comboKnifeMesh.userData.bladePivot && comboKnifeMesh.userData.biteHandlePivot) {
        comboKnifeMesh.userData.bladePivot.rotation.z = _comboOut.baliBladeAngle;
        comboKnifeMesh.userData.biteHandlePivot.rotation.z = _comboOut.baliBiteAngle;
      }
    }

    function renderOnce() {
      if (!pRenderer || !pScene || !pCamera || contextLost) return;
      syncSizeIfChanged();
      if (previewMode === 'runner') {
        if (runnerPivot) runnerPivot.rotation.set(pitch * 0.35, yaw, 0);
      } else if (previewMode === 'combo') {
        updateComboRig(0);
        comboPivot.rotation.set(pitch, yaw, 0);
      } else {
        soloPivot.rotation.set(pitch, yaw, 0);
      }
      pRenderer.render(pScene, pCamera);
    }

    let lastTick = performance.now();
    function tick(now) {
      if (!active) return;
      syncSizeIfChanged();
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;
      if (typeof VI.updateDynamicSkinMaterials === 'function') {
        VI.updateDynamicSkinMaterials(dt, 3);
      }

      if (previewMode === 'runner') {
        if (!dragging) {
          // Gentle alive idle sway around current user yaw (upperBody is child of pelvisGrp at y = 0.08)
          const breathe = Math.sin(now * 0.0018);
          if (runnerMesh && runnerMesh.userData.upperBody) {
            runnerMesh.userData.upperBody.position.y = 0.08 + breathe * 0.005;
            runnerMesh.userData.upperBody.rotation.x = breathe * 0.007;
          }
          if (runnerMesh && runnerMesh.userData.headGrp) {
            runnerMesh.userData.headGrp.rotation.y = -0.10 + Math.sin(now * 0.0007) * 0.05;
          }
        }
        if (runnerMesh && runnerMesh.userData.wepModel && runnerMesh.userData.wepModel.userData && runnerMesh.userData.wepModel.userData.chronoGyro) {
          const g = runnerMesh.userData.wepModel.userData.chronoGyro;
          g.outerRing.rotation.x += dt * 3.4;
          g.innerRing.rotation.z -= dt * 4.8;
          g.innerRing.rotation.x += dt * 2.1;
          g.coreOrb.rotation.y += dt * 4.0;
          g.ringMat.emissiveIntensity = 1.35 + Math.sin(now * 0.005) * 0.45;
        }
        if (runnerPivot) {
          runnerPivot.rotation.set(pitch * 0.35, yaw, 0);
        }
      } else if (previewMode === 'combo') {
        if (!dragging && comboAnimState.inspectT >= 1) {
          const baseYaw = previewKind === 'weapon' ? -0.78 : 0.0;
          const swayAmp = previewKind === 'weapon' ? 0.20 : 0.28;
          yaw = baseYaw + Math.sin(now * 0.00075) * swayAmp;
        }
        updateComboRig(dt);
        if (comboPivot) {
          comboPivot.rotation.set(pitch, yaw, 0);
        }
      } else {
        if (gunsmithMode && camLerpActive && !dragging) {
          const k = 1 - Math.exp(-8.0 * dt);
          yaw += (targetYaw - yaw) * k;
          pitch += (targetPitch - pitch) * k;
          pCamera.position.x += (targetCamX - pCamera.position.x) * k;
          pCamera.position.y += (targetCamY - pCamera.position.y) * k;
          pCamera.position.z += (targetCamZ - pCamera.position.z) * k;
          curLookX += (targetLookX - curLookX) * k;
          curLookY += (targetLookY - curLookY) * k;
          pCamera.lookAt(curLookX, curLookY, 0);
          if (
            Math.abs(targetYaw - yaw) < 0.003 &&
            Math.abs(targetPitch - pitch) < 0.003 &&
            Math.abs(targetCamX - pCamera.position.x) < 0.003 &&
            Math.abs(targetCamY - pCamera.position.y) < 0.003 &&
            Math.abs(targetCamZ - pCamera.position.z) < 0.003
          ) {
            camLerpActive = false;
          }
        } else if (!dragging && !gunsmithMode) {
          yaw += dt * 0.42;
        } else if (!dragging && gunsmithMode) {
          // Subtle COD hero weapon float breath without spinning away from attachment nodes
          if (soloPivot) soloPivot.position.y = Math.sin(now * 0.0014) * 0.006;
        }

        if (soloKnifeMesh && soloTrickT < 1) {
          soloTrickT = Math.min(1, soloTrickT + dt / 1.55);
          const t = soloTrickT;
          if (previewKind === 'weapon') {
            if (soloKnifeMesh.userData.spinGroup) {
              soloKnifeMesh.userData.spinGroup.rotation.x = -smoothstep(0.08, 0.92, t) * Math.PI * 4;
            } else {
              soloPivot.rotation.z = Math.sin(t * Math.PI) * 0.42;
              if (soloKnifeMesh.userData.boltGroup && soloKnifeMesh.userData.boltRestPos) {
                const bArc = bell(t, 0.20, 0.80);
                soloKnifeMesh.userData.boltGroup.position.z = soloKnifeMesh.userData.boltRestPos.z + bArc * 0.055;
                if (currentWeapon.weaponType === 'awp') soloKnifeMesh.userData.boltGroup.rotation.z = bArc * 0.88;
              }
              if (soloKnifeMesh.userData.pumpGroup) {
                const pArc = bell(t, 0.20, 0.80);
                soloKnifeMesh.userData.pumpGroup.position.z = pArc * 0.072;
                if (soloKnifeMesh.userData.breechBoltMesh && Number.isFinite(soloKnifeMesh.userData.breechBoltRestZ)) {
                  soloKnifeMesh.userData.breechBoltMesh.position.z = soloKnifeMesh.userData.breechBoltRestZ + pArc * 0.056;
                }
              }
            }
          } else if (soloKnifeMesh.userData.bladePivot && soloKnifeMesh.userData.biteHandlePivot) {
            const f1 = bell(t, 0.04, 0.52);
            const f2 = bell(t, 0.50, 0.96);
            soloKnifeMesh.userData.bladePivot.rotation.z = Math.min(Math.PI, f1 * 2.55 + f2 * 1.15);
            soloKnifeMesh.userData.biteHandlePivot.rotation.z = Math.min(Math.PI, f1 * Math.PI + f2 * 2.45);
            soloPivot.rotation.z = -smoothstep(0.04, 0.96, t) * Math.PI * 2;
            if (t > 0.52 && !(soloTrickCueMask & 1)) {
              soloTrickCueMask |= 1;
              CaseAudio.balisongClack(0.95);
            }
          } else {
            soloPivot.rotation.z = t * Math.PI * 2;
          }
        } else if (soloPivot) {
          soloPivot.rotation.z = 0;
          if (soloKnifeMesh && soloKnifeMesh.userData.spinGroup) {
            soloKnifeMesh.userData.spinGroup.rotation.x = 0;
          }
          if (soloKnifeMesh && soloKnifeMesh.userData.boltGroup && soloKnifeMesh.userData.boltRestPos) {
            soloKnifeMesh.userData.boltGroup.position.z = soloKnifeMesh.userData.boltRestPos.z;
            soloKnifeMesh.userData.boltGroup.rotation.z = 0;
          }
          if (soloKnifeMesh && soloKnifeMesh.userData.pumpGroup) {
            soloKnifeMesh.userData.pumpGroup.position.z = 0;
            if (soloKnifeMesh.userData.breechBoltMesh && Number.isFinite(soloKnifeMesh.userData.breechBoltRestZ)) {
              soloKnifeMesh.userData.breechBoltMesh.position.z = soloKnifeMesh.userData.breechBoltRestZ;
            }
          }
          if (soloKnifeMesh && soloKnifeMesh.userData.bladePivot && soloKnifeMesh.userData.biteHandlePivot) {
            soloKnifeMesh.userData.bladePivot.rotation.z = 0;
            soloKnifeMesh.userData.biteHandlePivot.rotation.z = 0;
          }
        }
        if (soloKnifeMesh && soloKnifeMesh.userData && soloKnifeMesh.userData.chronoGyro) {
          const g = soloKnifeMesh.userData.chronoGyro;
          g.outerRing.rotation.x += dt * 3.4;
          g.innerRing.rotation.z -= dt * 4.8;
          g.innerRing.rotation.x += dt * 2.1;
          g.coreOrb.rotation.y += dt * 4.0;
          g.ringMat.emissiveIntensity = 1.35 + Math.sin(now * 0.005) * 0.45;
        }
        if (soloPivot) {
          soloPivot.rotation.x = pitch;
          soloPivot.rotation.y = yaw;
        }
      }

      if (pRenderer && pScene && pCamera && !contextLost) {
        pRenderer.render(pScene, pCamera);
      }
      if (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) {
        rafId = setTimeout(() => tick(performance.now()), 90);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    function startLoop() {
      stopLoop();
      active = true;
      lastTick = performance.now();
      tick(lastTick);
    }

    function stopLoop() {
      active = false;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
    }

    return {
      showCombo,
      showWeaponCombo,
      showGunsmithWeapon,
      showRunnerShowcase,
      showKnife,
      getWeaponSkinSwatchDataUrl: (skinId, patternSeed, floatValue) =>
        typeof VI.getWeaponSkinSwatchDataUrl === 'function'
          ? VI.getWeaponSkinSwatchDataUrl(skinId, patternSeed, floatValue)
          : '',
      setMode,
      getMode: () => previewMode,
      playTrick,
      resize,
      stop: stopLoop
    };
  })();
  root.ViewmodelSystem = ViewmodelSystem;
  root.ArmoryPreview = ArmoryPreview;
})(typeof self !== "undefined" ? self : globalThis);
