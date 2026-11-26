// Mobile & Tablet Touch Controls: pure joystick/look math, multi-touch controller, and HUD integration.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MobileControls = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  const STORAGE_KEY = 'velocity_touch_prefs_v1';

  const DEFAULT_PREFS = Object.freeze({
    mode: 'auto',        // 'auto' | 'on' | 'off'
    sensitivity: 1.0,    // 0.30 .. 3.00
    scale: 1.0,          // 0.75 .. 1.35
    leftFire: true       // secondary left-thumb fire button
  });

  function clamp(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function sanitizeTouchPrefs(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const mode = (r.mode === 'on' || r.mode === 'off' || r.mode === 'auto') ? r.mode : DEFAULT_PREFS.mode;
    const sensitivity = Math.round(clamp(r.sensitivity != null ? r.sensitivity : DEFAULT_PREFS.sensitivity, 0.3, 3.0) * 20) / 20;
    const scale = Math.round(clamp(r.scale != null ? r.scale : DEFAULT_PREFS.scale, 0.75, 1.35) * 20) / 20;
    const leftFire = r.leftFire === undefined ? DEFAULT_PREFS.leftFire : Boolean(r.leftFire);
    return { mode, sensitivity, scale, leftFire };
  }

  function resolveStorage(storage) {
    if (storage && typeof storage.getItem === 'function') return storage;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (_) {}
    return null;
  }

  function loadTouchPrefs(storage) {
    const store = resolveStorage(storage);
    if (!store) return sanitizeTouchPrefs(DEFAULT_PREFS);
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return sanitizeTouchPrefs(DEFAULT_PREFS);
      return sanitizeTouchPrefs(JSON.parse(raw));
    } catch (_) {
      return sanitizeTouchPrefs(DEFAULT_PREFS);
    }
  }

  function saveTouchPrefs(prefs, storage) {
    const clean = sanitizeTouchPrefs(prefs);
    const store = resolveStorage(storage);
    if (store) {
      try { store.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (_) {}
    }
    return clean;
  }

  function detectTouchDevice(env) {
    const e = env || {};
    const search = typeof e.search === 'string'
      ? e.search
      : (root.location && typeof root.location.search === 'string' ? root.location.search : '');
    if (search) {
      try {
        const sp = new URLSearchParams(search);
        const q = sp.get('touch');
        if (q === '1' || q === 'true') return true;
        if (q === '0' || q === 'false') return false;
      } catch (_) {}
    }

    const maxTouchPoints = typeof e.maxTouchPoints === 'number'
      ? e.maxTouchPoints
      : (root.navigator && typeof root.navigator.maxTouchPoints === 'number' ? root.navigator.maxTouchPoints : 0);
    const hasOntouchstart = typeof e.hasOntouchstart === 'boolean'
      ? e.hasOntouchstart
      : ('ontouchstart' in root);
    const coarsePointer = typeof e.coarsePointer === 'boolean'
      ? e.coarsePointer
      : (typeof root.matchMedia === 'function' && root.matchMedia('(pointer: coarse)').matches);
    const ua = typeof e.userAgent === 'string'
      ? e.userAgent
      : (root.navigator && typeof root.navigator.userAgent === 'string' ? root.navigator.userAgent : '');
    const isTabletOrPhoneUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (/Macintosh/i.test(ua) && maxTouchPoints > 1); // iPadOS desktop-class Safari

    return Boolean(coarsePointer || isTabletOrPhoneUa || (hasOntouchstart && maxTouchPoints > 0));
  }

  function shouldShowTouchControls(prefs, env, state) {
    const p = sanitizeTouchPrefs(prefs);
    const st = state || {};
    if (!st.inLevel || !st.overlayHidden || st.voting) return false;
    if (p.mode === 'on') return true;
    if (p.mode === 'off') return false;
    return detectTouchDevice(env);
  }

  /**
   * Computes normalized analog joystick output from pointer offset (dx, dy in screen px, +dy = down).
   * Outputs forward-positive y in [-1, 1], right-positive x in [-1, 1], plus surf-friendly lateral lock.
   */
  function computeJoystickVector(dx, dy, maxRadius, deadzone) {
    const radius = Math.max(16, Number(maxRadius) || 52);
    const dz = clamp(deadzone != null ? deadzone : 0.14, 0, 0.5);
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist <= 0.0001) {
      return { x: 0, y: 0, mag: 0, knobX: 0, knobY: 0, forward: false, back: false, left: false, right: false, sprintLock: false };
    }

    const clampedDist = Math.min(dist, radius);
    const normMag = clampedDist / radius;
    const ux = dx / dist;
    const uy = dy / dist;
    const knobX = ux * clampedDist;
    const knobY = uy * clampedDist;

    if (normMag < dz) {
      return { x: 0, y: 0, mag: 0, knobX, knobY, forward: false, back: false, left: false, right: false, sprintLock: false };
    }

    const scaled = (normMag - dz) / (1 - dz);
    let x = ux * scaled;
    let y = -uy * scaled; // invert screen Y so pushing up = positive forward

    // Surf-assist lateral deadzone: when strafing cleanly left/right, suppress tiny unintended W/S input
    if (Math.abs(x) >= 0.35 && Math.abs(y) < 0.24) {
      y = 0;
    }

    x = clamp(x, -1, 1);
    y = clamp(y, -1, 1);
    const mag = Math.min(1, Math.hypot(x, y));

    return {
      x,
      y,
      mag,
      knobX,
      knobY,
      forward: y > 0.25,
      back: y < -0.25,
      right: x > 0.25,
      left: x < -0.25,
      sprintLock: y > 0.92 && Math.abs(x) < 0.35
    };
  }

  /**
   * Converts touch look-pad pixel deltas into yaw/pitch radians with micro-aim curve.
   */
  function computeLookDelta(dx, dy, touchSens, scopeMul, invertY) {
    const rawDx = Number(dx) || 0;
    const rawDy = Number(dy) || 0;
    if (rawDx === 0 && rawDy === 0) return { dYaw: 0, dPitch: 0 };

    const sens = clamp(touchSens != null ? touchSens : 1.0, 0.3, 3.0);
    const scope = clamp(scopeMul != null ? scopeMul : 1.0, 0.1, 1.5);
    const speed = Math.hypot(rawDx, rawDy);
    // Gentle flick acceleration for fast 180s while keeping slow micro-adjustments crisp
    const accel = 1 + Math.min(0.65, Math.max(0, speed - 6) * 0.018);
    const baseRadPerPx = 0.0046 * sens * scope * accel;
    const ySign = invertY ? -1 : 1;

    return {
      dYaw: -rawDx * baseRadPerPx,
      dPitch: -rawDy * baseRadPerPx * ySign
    };
  }

  // ---------- Browser Runtime Controller ----------
  let activePrefs = loadTouchPrefs();
  let initialized = false;
  let visible = false;
  let lastTouchEventMs = 0;

  const moveAxis = { x: 0, y: 0, mag: 0, active: false };
  const heldButtons = {
    fire: false,
    adsToggle: false,
    adsHold: false,
    jump: false,
    slide: false,
    slideToggle: false
  };

  let joyPointerId = null;
  let joyOrigin = { x: 0, y: 0 };
  let lookPointerId = null;
  let lookLast = { x: 0, y: 0 };
  let fireDragPointerId = null;
  let fireDragLast = { x: 0, y: 0 };
  let leftFirePointerId = null;
  let adsPointerId = null;
  let adsPressTime = 0;
  let jumpPointerId = null;
  let slidePointerId = null;
  let slidePressTime = 0;

  let els = null;

  function queryElements() {
    if (typeof document === 'undefined') return null;
    const rootEl = document.getElementById('mobileControls');
    if (!rootEl) return null;
    return {
      root: rootEl,
      moveZone: document.getElementById('mtMoveZone'),
      joyBase: document.getElementById('mtJoyBase'),
      joyKnob: document.getElementById('mtJoyKnob'),
      lookZone: document.getElementById('mtLookZone'),
      fireBtn: document.getElementById('mtFireBtn'),
      leftFireBtn: document.getElementById('mtLeftFireBtn'),
      adsBtn: document.getElementById('mtAdsBtn'),
      adsLabel: document.getElementById('mtAdsLabel'),
      jumpBtn: document.getElementById('mtJumpBtn'),
      slideBtn: document.getElementById('mtSlideBtn'),
      reloadBtn: document.getElementById('mtReloadBtn'),
      grappleBtn: document.getElementById('mtGrappleBtn'),
      burstBtn: document.getElementById('mtBurstBtn'),
      burstLabel: document.getElementById('mtBurstLabel'),
      streakBtn: document.getElementById('mtStreakBtn'),
      streakLabel: document.getElementById('mtStreakLabel'),
      zoomBtn: document.getElementById('mtZoomBtn'),
      pauseBtn: document.getElementById('mtPauseBtn'),
      scoreboardBtn: document.getElementById('mtScoreboardBtn'),
      inspectBtn: document.getElementById('mtInspectBtn'),
      resetBtn: document.getElementById('mtResetBtn'),
      slotBtns: rootEl.querySelectorAll('[data-mt-slot]')
    };
  }

  function markTouchActivity() {
    lastTouchEventMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  function wasRecentTouch(windowMs) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (now - lastTouchEventMs) < (windowMs || 500);
  }

  function applyLookPixels(dx, dy) {
    if (typeof root.applyMobileLookDelta === 'function') {
      root.applyMobileLookDelta(dx, dy, activePrefs.sensitivity);
    }
  }

  function syncCombatFireHeld(isDown) {
    if (typeof root.setMobileActionState === 'function') {
      root.setMobileActionState('fire', isDown);
    }
  }

  function syncAdsHeld(isDown) {
    if (typeof root.setMobileActionState === 'function') {
      root.setMobileActionState('altFire', isDown);
    }
  }

  function syncJumpHeld(isDown) {
    if (typeof root.setMobileActionState === 'function') {
      root.setMobileActionState('jump', isDown);
    }
  }

  function syncSlideHeld(isDown) {
    if (typeof root.setMobileActionState === 'function') {
      root.setMobileActionState('slide', isDown);
    }
  }

  function fireOneShot(action) {
    if (typeof root.triggerMobileAction === 'function') {
      root.triggerMobileAction(action);
    }
  }

  function resetJoystickVisual() {
    moveAxis.x = 0;
    moveAxis.y = 0;
    moveAxis.mag = 0;
    moveAxis.active = false;
    joyPointerId = null;
    if (!els) return;
    if (els.joyKnob) els.joyKnob.style.transform = 'translate3d(0px, 0px, 0)';
    if (els.joyBase) {
      els.joyBase.classList.remove('active', 'sprint-lock');
      els.joyBase.style.transform = 'translate3d(0px, 0px, 0)';
    }
  }

  function clearAllInputs() {
    resetJoystickVisual();
    lookPointerId = null;
    fireDragPointerId = null;
    leftFirePointerId = null;
    adsPointerId = null;
    jumpPointerId = null;
    slidePointerId = null;
    if (heldButtons.fire) {
      heldButtons.fire = false;
      syncCombatFireHeld(false);
    }
    if (heldButtons.adsToggle || heldButtons.adsHold) {
      heldButtons.adsToggle = false;
      heldButtons.adsHold = false;
      syncAdsHeld(false);
    }
    if (heldButtons.jump) {
      heldButtons.jump = false;
      syncJumpHeld(false);
    }
    if (heldButtons.slide || heldButtons.slideToggle) {
      heldButtons.slide = false;
      heldButtons.slideToggle = false;
      syncSlideHeld(false);
    }
    if (els) {
      for (const key of ['fireBtn', 'leftFireBtn', 'adsBtn', 'jumpBtn', 'slideBtn']) {
        if (els[key]) els[key].classList.remove('pressed', 'toggled');
      }
    }
  }

  function isFireStillHeld() {
    return fireDragPointerId !== null || leftFirePointerId !== null;
  }

  function updateFireButtonVisual() {
    const down = isFireStillHeld();
    if (down !== heldButtons.fire) {
      heldButtons.fire = down;
      syncCombatFireHeld(down);
    }
    if (els && els.fireBtn) els.fireBtn.classList.toggle('pressed', fireDragPointerId !== null);
    if (els && els.leftFireBtn) els.leftFireBtn.classList.toggle('pressed', leftFirePointerId !== null);
  }

  function getActiveCombatSnapshot() {
    return root.CombatSystem && typeof root.CombatSystem.getState === 'function'
      ? root.CombatSystem.getState()
      : null;
  }

  function applyScaleStyles() {
    if (!els || !els.root) return;
    els.root.style.setProperty('--mt-scale', String(activePrefs.scale));
    if (els.leftFireBtn) {
      els.leftFireBtn.style.display = activePrefs.leftFire ? '' : 'none';
    }
  }

  function bindEvents() {
    if (!els || !els.root) return;

    // Prevent browser gestures & context menu on touch overlay
    els.root.addEventListener('contextmenu', (e) => e.preventDefault());

    // 1) Virtual Floating/Anchored Thumbstick (Left Zone)
    if (els.moveZone) {
      els.moveZone.addEventListener('pointerdown', (e) => {
        if (joyPointerId !== null) return;
        e.preventDefault();
        markTouchActivity();
        joyPointerId = e.pointerId;
        try { els.moveZone.setPointerCapture(e.pointerId); } catch (_) {}

        const zoneRect = els.moveZone.getBoundingClientRect();
        const baseRect = els.joyBase ? els.joyBase.getBoundingClientRect() : null;
        const restCx = baseRect ? (baseRect.left + baseRect.width * 0.5) : (zoneRect.left + zoneRect.width * 0.42);
        const restCy = baseRect ? (baseRect.top + baseRect.height * 0.5) : (zoneRect.top + zoneRect.height * 0.62);

        // Float origin gently within the left pad so thumb always lands centered
        const maxShift = 54 * activePrefs.scale;
        const shiftX = clamp(e.clientX - restCx, -maxShift, maxShift);
        const shiftY = clamp(e.clientY - restCy, -maxShift, maxShift);
        joyOrigin.x = restCx + shiftX;
        joyOrigin.y = restCy + shiftY;

        if (els.joyBase) {
          els.joyBase.classList.add('active');
          els.joyBase.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0)`;
        }
        moveAxis.active = true;
        updateJoystickFromPoint(e.clientX, e.clientY);
      });

      const updateJoystickFromPoint = (clientX, clientY) => {
        const maxR = 48 * activePrefs.scale;
        const vec = computeJoystickVector(clientX - joyOrigin.x, clientY - joyOrigin.y, maxR, 0.14);
        moveAxis.x = vec.x;
        moveAxis.y = vec.y;
        moveAxis.mag = vec.mag;
        if (els.joyKnob) {
          els.joyKnob.style.transform = `translate3d(${vec.knobX.toFixed(1)}px, ${vec.knobY.toFixed(1)}px, 0)`;
        }
        if (els.joyBase) {
          els.joyBase.classList.toggle('sprint-lock', vec.sprintLock);
        }
      };

      els.moveZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== joyPointerId) return;
        e.preventDefault();
        markTouchActivity();
        updateJoystickFromPoint(e.clientX, e.clientY);
      });

      const endJoy = (e) => {
        if (e.pointerId !== joyPointerId) return;
        e.preventDefault();
        resetJoystickVisual();
      };
      els.moveZone.addEventListener('pointerup', endJoy);
      els.moveZone.addEventListener('pointercancel', endJoy);
    }

    // 2) Full Right-Half Aim Look-Pad
    if (els.lookZone) {
      els.lookZone.addEventListener('pointerdown', (e) => {
        if (lookPointerId !== null) return;
        e.preventDefault();
        markTouchActivity();
        lookPointerId = e.pointerId;
        lookLast.x = e.clientX;
        lookLast.y = e.clientY;
        try { els.lookZone.setPointerCapture(e.pointerId); } catch (_) {}
      });
      els.lookZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== lookPointerId) return;
        e.preventDefault();
        markTouchActivity();
        const dx = e.clientX - lookLast.x;
        const dy = e.clientY - lookLast.y;
        lookLast.x = e.clientX;
        lookLast.y = e.clientY;
        applyLookPixels(dx, dy);
      });
      const endLook = (e) => {
        if (e.pointerId !== lookPointerId) return;
        lookPointerId = null;
      };
      els.lookZone.addEventListener('pointerup', endLook);
      els.lookZone.addEventListener('pointercancel', endLook);
    }

    // 3) Primary Right-Thumb FIRE Button (Hold to shoot + Drag to Aim simultaneously!)
    if (els.fireBtn) {
      els.fireBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        fireDragPointerId = e.pointerId;
        fireDragLast.x = e.clientX;
        fireDragLast.y = e.clientY;
        try { els.fireBtn.setPointerCapture(e.pointerId); } catch (_) {}
        updateFireButtonVisual();
      });
      els.fireBtn.addEventListener('pointermove', (e) => {
        if (e.pointerId !== fireDragPointerId) return;
        e.preventDefault();
        const dx = e.clientX - fireDragLast.x;
        const dy = e.clientY - fireDragLast.y;
        fireDragLast.x = e.clientX;
        fireDragLast.y = e.clientY;
        if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25) {
          applyLookPixels(dx, dy);
        }
      });
      const endRightFire = (e) => {
        if (e.pointerId !== fireDragPointerId) return;
        e.preventDefault();
        fireDragPointerId = null;
        updateFireButtonVisual();
      };
      els.fireBtn.addEventListener('pointerup', endRightFire);
      els.fireBtn.addEventListener('pointercancel', endRightFire);
    }

    // 4) Left-Thumb Secondary FIRE Button (for claw / dedicated aim-right play)
    if (els.leftFireBtn) {
      els.leftFireBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        leftFirePointerId = e.pointerId;
        try { els.leftFireBtn.setPointerCapture(e.pointerId); } catch (_) {}
        updateFireButtonVisual();
      });
      const endLeftFire = (e) => {
        if (e.pointerId !== leftFirePointerId) return;
        e.preventDefault();
        leftFirePointerId = null;
        updateFireButtonVisual();
      };
      els.leftFireBtn.addEventListener('pointerup', endLeftFire);
      els.leftFireBtn.addEventListener('pointercancel', endLeftFire);
    }

    // 5) ADS / Scope / Katana Deflect / Revolver Fan / Heavy Knife Button
    if (els.adsBtn) {
      els.adsBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        adsPointerId = e.pointerId;
        adsPressTime = performance.now();
        try { els.adsBtn.setPointerCapture(e.pointerId); } catch (_) {}
        els.adsBtn.classList.add('pressed');

        const cs = getActiveCombatSnapshot();
        const isHoldOnlyMode = Boolean(cs && (cs.isKatana || cs.activeSlot === 'melee' || cs.altFireMode === 'fan'));
        if (isHoldOnlyMode) {
          heldButtons.adsHold = true;
          heldButtons.adsToggle = false;
          syncAdsHeld(true);
        } else {
          // Tap-toggle OR hold-to-ADS for firearms!
          if (heldButtons.adsToggle) {
            heldButtons.adsToggle = false;
            heldButtons.adsHold = false;
            els.adsBtn.classList.remove('toggled');
            syncAdsHeld(false);
          } else {
            heldButtons.adsHold = true;
            syncAdsHeld(true);
          }
        }
      });

      const endAds = (e) => {
        if (e.pointerId !== adsPointerId) return;
        e.preventDefault();
        adsPointerId = null;
        els.adsBtn.classList.remove('pressed');

        const cs = getActiveCombatSnapshot();
        const isHoldOnlyMode = Boolean(cs && (cs.isKatana || cs.activeSlot === 'melee' || cs.altFireMode === 'fan'));
        const heldMs = performance.now() - adsPressTime;

        if (isHoldOnlyMode) {
          heldButtons.adsHold = false;
          heldButtons.adsToggle = false;
          els.adsBtn.classList.remove('toggled');
          syncAdsHeld(false);
        } else if (heldButtons.adsHold) {
          if (heldMs < 260) {
            // Quick tap latches ADS on for comfortable 2-thumb aiming
            heldButtons.adsToggle = true;
            heldButtons.adsHold = false;
            els.adsBtn.classList.add('toggled');
          } else {
            // Long hold releases ADS on lift
            heldButtons.adsHold = false;
            heldButtons.adsToggle = false;
            els.adsBtn.classList.remove('toggled');
            syncAdsHeld(false);
          }
        }
      };
      els.adsBtn.addEventListener('pointerup', endAds);
      els.adsBtn.addEventListener('pointercancel', endAds);
    }

    // 6) JUMP Button (buffered + hold for auto-bunny-hop & wall-jump)
    if (els.jumpBtn) {
      els.jumpBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        jumpPointerId = e.pointerId;
        try { els.jumpBtn.setPointerCapture(e.pointerId); } catch (_) {}
        els.jumpBtn.classList.add('pressed');
        heldButtons.jump = true;
        syncJumpHeld(true);
      });
      const endJump = (e) => {
        if (e.pointerId !== jumpPointerId) return;
        e.preventDefault();
        jumpPointerId = null;
        els.jumpBtn.classList.remove('pressed');
        heldButtons.jump = false;
        syncJumpHeld(false);
      };
      els.jumpBtn.addEventListener('pointerup', endJump);
      els.jumpBtn.addEventListener('pointercancel', endJump);
    }

    // 7) SLIDE / CROUCH Button (quick tap toggles crouch/slide, hold releases on lift)
    if (els.slideBtn) {
      els.slideBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        slidePointerId = e.pointerId;
        slidePressTime = performance.now();
        try { els.slideBtn.setPointerCapture(e.pointerId); } catch (_) {}
        els.slideBtn.classList.add('pressed');
        if (heldButtons.slideToggle) {
          heldButtons.slideToggle = false;
          heldButtons.slide = false;
          els.slideBtn.classList.remove('toggled');
          syncSlideHeld(false);
        } else {
          heldButtons.slide = true;
          syncSlideHeld(true);
        }
      });
      const endSlide = (e) => {
        if (e.pointerId !== slidePointerId) return;
        e.preventDefault();
        slidePointerId = null;
        els.slideBtn.classList.remove('pressed');
        const heldMs = performance.now() - slidePressTime;
        if (heldButtons.slide) {
          if (heldMs < 240) {
            heldButtons.slideToggle = true;
            heldButtons.slide = false;
            els.slideBtn.classList.add('toggled');
          } else {
            heldButtons.slide = false;
            heldButtons.slideToggle = false;
            els.slideBtn.classList.remove('toggled');
            syncSlideHeld(false);
          }
        }
      };
      els.slideBtn.addEventListener('pointerup', endSlide);
      els.slideBtn.addEventListener('pointercancel', endSlide);
    }

    // 8) One-Shot Combat & Ability Buttons
    const bindTap = (btn, action) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        btn.classList.add('pressed');
        fireOneShot(action);
      });
      const release = () => btn.classList.remove('pressed');
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    };

    bindTap(els.reloadBtn, 'reload');
    bindTap(els.grappleBtn, 'grapple');
    bindTap(els.burstBtn, 'burst');
    bindTap(els.streakBtn, 'scorestreak');
    bindTap(els.zoomBtn, 'scopeZoom');
    bindTap(els.pauseBtn, 'pause');
    bindTap(els.inspectBtn, 'inspect');
    bindTap(els.resetBtn, 'checkpoint');

    // Scoreboard toggle button (for Arena matches on mobile)
    if (els.scoreboardBtn) {
      els.scoreboardBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        root.isScoreboardHeld = !root.isScoreboardHeld;
        els.scoreboardBtn.classList.toggle('toggled', Boolean(root.isScoreboardHeld));
      });
    }

    // Direct tap weapon slot buttons inside mobile dock
    if (els.slotBtns) {
      els.slotBtns.forEach((btn) => {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          markTouchActivity();
          // Clear latched ADS when switching slots
          if (heldButtons.adsToggle) {
            heldButtons.adsToggle = false;
            if (els.adsBtn) els.adsBtn.classList.remove('toggled');
            syncAdsHeld(false);
          }
          fireOneShot('slot_' + btn.dataset.mtSlot);
        });
      });
    }

    // Also allow tapping the main HUD slot strip or scorestreak bar directly
    const hudSlotStrip = document.getElementById('hudSlotStrip');
    if (hudSlotStrip) {
      hudSlotStrip.addEventListener('pointerdown', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('[data-hud-slot]') : null;
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        fireOneShot('slot_' + item.dataset.hudSlot);
      });
    }
    const hudStreak = document.getElementById('hudScorestreak');
    if (hudStreak) {
      hudStreak.addEventListener('pointerdown', (e) => {
        if (!visible) return;
        e.preventDefault();
        e.stopPropagation();
        markTouchActivity();
        fireOneShot('scorestreak');
      });
    }
  }

  function init() {
    if (initialized) return;
    els = queryElements();
    if (!els) return;
    initialized = true;
    activePrefs = loadTouchPrefs();
    applyScaleStyles();
    bindEvents();
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', clearAllInputs);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearAllInputs();
      });
    }
  }

  function updateVisibility(state) {
    if (!initialized) init();
    if (!els || !els.root) return false;
    const nextVisible = shouldShowTouchControls(activePrefs, null, state);
    if (nextVisible !== visible) {
      visible = nextVisible;
      els.root.style.display = visible ? 'block' : 'none';
      els.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
      document.body.classList.toggle('touch-controls-active', visible);
      if (!visible) {
        clearAllInputs();
      }
    }
    return visible;
  }

  function syncHudState(info) {
    if (!visible || !els) return;
    const cs = info && info.combat ? info.combat : getActiveCombatSnapshot();
    const ns = info && info.netcode ? info.netcode : (root.NetcodeSystem ? root.NetcodeSystem.getState() : null);
    const isSurfOnly = Boolean(info && info.isDedicatedSurf);
    const hasCourse = Boolean(info && info.hasCourse);
    const burstCd = Number(info && info.burstCd) || 0;
    const grappleActive = Boolean(info && info.grappleActive);

    // Dynamic ADS / Deflect / Fan / Heavy label
    if (els.adsLabel && cs) {
      let lbl = 'ADS';
      if (cs.isKatana) {
        lbl = cs.katana && cs.katana.deflectActive ? 'PARRY' : 'DEFLECT';
      } else if (cs.activeSlot === 'melee') {
        lbl = 'HEAVY';
      } else if (cs.altFireMode === 'fan') {
        lbl = 'FAN';
      } else if (cs.scopeOverlay && cs.scopeOverlay.active) {
        lbl = 'EXIT';
      } else if (cs.activeBuild && cs.activeBuild.scoped) {
        lbl = 'SCOPE';
      }
      if (els.adsLabel.textContent !== lbl) els.adsLabel.textContent = lbl;
      if (els.adsBtn) {
        els.adsBtn.classList.toggle('katana-mode', Boolean(cs.isKatana));
        if (!cs.adsHeld && !cs.isKatana && heldButtons.adsToggle && !cs.reloading) {
          // keep toggled visual synced
        }
      }
    }

    // Dynamic Grapple button visibility & state
    if (els.grappleBtn) {
      els.grappleBtn.style.display = isSurfOnly ? 'none' : '';
      els.grappleBtn.classList.toggle('toggled', grappleActive);
    }

    // Dynamic Burst / Katana Slash-Dash button
    if (els.burstBtn && els.burstLabel) {
      const isKat = Boolean(cs && cs.isKatana);
      els.burstBtn.style.display = (isSurfOnly && !isKat) ? 'none' : '';
      els.burstBtn.classList.toggle('katana-mode', isKat);
      if (isKat && cs.katana) {
        const ready = Boolean(cs.katana.dashReady);
        els.burstLabel.textContent = ready ? 'DASH' : `${cs.katana.dashCooldown.toFixed(1)}s`;
        els.burstBtn.classList.toggle('on-cd', !ready);
      } else {
        els.burstLabel.textContent = burstCd > 0.05 ? `${burstCd.toFixed(1)}s` : 'BURST';
        els.burstBtn.classList.toggle('on-cd', burstCd > 0.05);
      }
    }

    // Reload button hidden for melee/katana
    if (els.reloadBtn && cs) {
      const canReload = cs.activeSlot !== 'melee' && !cs.isKatana && !cs.isScorestreak;
      els.reloadBtn.style.display = canReload ? '' : 'none';
      els.reloadBtn.classList.toggle('reloading', Boolean(cs.reloading));
    }

    // Scorestreak activate button (shows prominently when ready!)
    if (els.streakBtn && els.streakLabel && cs && cs.scorestreak) {
      const ready = Boolean(cs.scorestreak.ready && !cs.isScorestreak);
      els.streakBtn.style.display = ready ? '' : 'none';
      if (ready) {
        els.streakLabel.textContent = (cs.scorestreak.hudTag || cs.scorestreak.shortName || 'STREAK').toUpperCase();
      }
    }

    // Variable scope zoom toggle button
    if (els.zoomBtn && cs) {
      const canZoom = Boolean(cs.adsHeld && cs.activeBuild && cs.activeBuild.adsZoomAlt);
      els.zoomBtn.style.display = canZoom ? '' : 'none';
    }

    // Arena scoreboard button & Course checkpoint reset button
    if (els.scoreboardBtn) {
      els.scoreboardBtn.style.display = (ns && ns.isArena) ? '' : 'none';
      els.scoreboardBtn.classList.toggle('toggled', Boolean(root.isScoreboardHeld));
    }
    if (els.resetBtn) {
      els.resetBtn.style.display = hasCourse ? '' : 'none';
    }

    // Weapon slot buttons labels + active highlight
    if (els.slotBtns && cs) {
      els.slotBtns.forEach((btn) => {
        const slot = btn.dataset.mtSlot;
        btn.classList.toggle('active', cs.activeSlot === slot);
        const span = btn.querySelector('span');
        if (!span) return;
        if (slot === 'primary' && cs.primaryBuild) {
          span.textContent = (cs.primaryBuild.hudTag || cs.primaryBuild.shortName || 'PRI').toUpperCase();
        } else if (slot === 'secondary' && cs.secondaryBuild) {
          span.textContent = (cs.secondaryBuild.hudTag || cs.secondaryBuild.shortName || 'SEC').toUpperCase();
        } else if (slot === 'melee') {
          span.textContent = 'KNIFE';
        }
      });
    }
  }

  function getPrefs() {
    return Object.assign({}, activePrefs);
  }

  function setPrefs(patch) {
    activePrefs = saveTouchPrefs(Object.assign({}, activePrefs, patch || {}));
    applyScaleStyles();
    return getPrefs();
  }

  function getMoveAxis() {
    return moveAxis;
  }

  function isVisible() {
    return visible;
  }

  function isTouchModeEnabled() {
    if (activePrefs.mode === 'on') return true;
    if (activePrefs.mode === 'off') return false;
    return detectTouchDevice();
  }

  return {
    STORAGE_KEY,
    DEFAULT_PREFS,
    sanitizeTouchPrefs,
    loadTouchPrefs,
    saveTouchPrefs,
    detectTouchDevice,
    shouldShowTouchControls,
    computeJoystickVector,
    computeLookDelta,
    init,
    updateVisibility,
    syncHudState,
    clearAllInputs,
    wasRecentTouch,
    getPrefs,
    setPrefs,
    getMoveAxis,
    isVisible,
    isTouchModeEnabled
  };
});
