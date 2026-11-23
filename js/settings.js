// Pure settings store, validation, keybind token formatting, and conflict-free rebinding for VELOCITY.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VelocitySettings = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const STORAGE_KEY = 'velocity_settings_v1';

  const CROSSHAIR_STYLES = Object.freeze(['cross', 'dot', 'cross-dot', 'circle', 'none']);
  const CROSSHAIR_COLORS = Object.freeze(['#c9f8ff', '#ffffff', '#7dff8b', '#ff9b55', '#ff5e8a']);

  const ACTIONS = Object.freeze([
    { id: 'forward', label: 'Move Forward', group: 'Movement' },
    { id: 'back', label: 'Move Back', group: 'Movement' },
    { id: 'left', label: 'Strafe Left', group: 'Movement' },
    { id: 'right', label: 'Strafe Right', group: 'Movement' },
    { id: 'jump', label: 'Jump / Wall Jump', group: 'Movement' },
    { id: 'slide', label: 'Slide / Crouch', group: 'Movement' },
    { id: 'grapple', label: 'Grapple / Release', group: 'Abilities' },
    { id: 'burst', label: 'Kinetic Burst', group: 'Abilities' },
    { id: 'fire', label: 'Fire / Primary Attack', group: 'Combat' },
    { id: 'altFire', label: 'Scope / Alt Attack', group: 'Combat' },
    { id: 'reload', label: 'Reload Weapon', group: 'Combat' },
    { id: 'slotRifle', label: 'Rifle (Slot 1)', group: 'Combat' },
    { id: 'slotAwp', label: 'AWP Sniper (Slot 2)', group: 'Combat' },
    { id: 'slotDeagle', label: 'Deagle (Slot 3)', group: 'Combat' },
    { id: 'slotKnife', label: 'Knife (Slot 4)', group: 'Combat' },
    { id: 'restart', label: 'Restart Run', group: 'Shortcuts' },
    { id: 'checkpoint', label: 'Last Checkpoint', group: 'Shortcuts' },
    { id: 'ghost', label: 'Cycle Ghost Mode', group: 'Shortcuts' },
    { id: 'inspect', label: 'Inspect Weapon / Knife', group: 'Shortcuts' }
  ]);

  const ACTION_IDS = Object.freeze(ACTIONS.map((a) => a.id));

  const DEFAULT_KEYBINDS = Object.freeze({
    forward: 'KeyW',
    back: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    slide: 'ShiftLeft',
    grapple: 'KeyE',
    burst: 'KeyQ',
    fire: 'Mouse0',
    altFire: 'Mouse2',
    reload: 'KeyC',
    slotRifle: 'Digit1',
    slotAwp: 'Digit2',
    slotDeagle: 'Digit3',
    slotKnife: 'Digit4',
    restart: 'KeyR',
    checkpoint: 'KeyT',
    ghost: 'KeyG',
    inspect: 'KeyF'
  });

  const DEFAULT_CROSSHAIR = Object.freeze({
    style: 'cross',
    size: 14,
    color: '#c9f8ff'
  });

  const DEFAULT_VIEWMODEL = Object.freeze({
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    fov: 62
  });

  const DEFAULT_SETTINGS = Object.freeze({
    displayName: '',
    sensitivity: 1.0,
    invertY: false,
    baseFov: 85,
    crosshair: DEFAULT_CROSSHAIR,
    viewmodel: DEFAULT_VIEWMODEL,
    keybinds: DEFAULT_KEYBINDS
  });

  function cloneDefaults() {
    return {
      displayName: DEFAULT_SETTINGS.displayName,
      sensitivity: DEFAULT_SETTINGS.sensitivity,
      invertY: DEFAULT_SETTINGS.invertY,
      baseFov: DEFAULT_SETTINGS.baseFov,
      crosshair: { ...DEFAULT_CROSSHAIR },
      viewmodel: { ...DEFAULT_VIEWMODEL },
      keybinds: { ...DEFAULT_KEYBINDS }
    };
  }

  function clampNum(v, lo, hi, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  function sanitizeDisplayName(raw) {
    if (typeof raw !== 'string') return '';
    // Collapse whitespace first (preserving word boundaries across tabs/newlines), then strip remaining control chars
    const cleaned = raw
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 32);
    return cleaned;
  }

  function isValidInputToken(tok) {
    if (typeof tok !== 'string') return false;
    if (tok.length < 1 || tok.length > 24) return false;
    if (tok === 'Escape') return false;
    return /^[A-Za-z0-9_]+$/.test(tok);
  }

  function mouseButtonToToken(button) {
    if (typeof button !== 'number' || !Number.isInteger(button)) return null;
    if (button < 0 || button > 4) return null;
    return 'Mouse' + button;
  }

  const SPECIAL_LABELS = Object.freeze({
    Mouse0: 'LMB',
    Mouse1: 'MMB',
    Mouse2: 'RMB',
    Mouse3: 'MOUSE 4',
    Mouse4: 'MOUSE 5',
    Space: 'SPACE',
    ShiftLeft: 'L-SHIFT',
    ShiftRight: 'R-SHIFT',
    ControlLeft: 'L-CTRL',
    ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT',
    AltRight: 'R-ALT',
    MetaLeft: 'L-META',
    MetaRight: 'R-META',
    Tab: 'TAB',
    CapsLock: 'CAPS',
    Enter: 'ENTER',
    Backspace: 'BKSP',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT'
  });

  function formatInputToken(tok) {
    if (!tok || typeof tok !== 'string') return '—';
    if (SPECIAL_LABELS[tok]) return SPECIAL_LABELS[tok];
    if (/^Key[A-Z]$/.test(tok)) return tok.slice(3);
    if (/^Digit[0-9]$/.test(tok)) return tok.slice(5);
    if (/^Numpad[0-9]$/.test(tok)) return 'NUM ' + tok.slice(6);
    if (/^F([1-9]|1[0-2])$/.test(tok)) return tok;
    return tok.toUpperCase();
  }

  function sanitizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const sens = Math.round(clampNum(src.sensitivity, 0.2, 4.0, DEFAULT_SETTINGS.sensitivity) * 100) / 100;
    const baseFov = Math.round(clampNum(src.baseFov, 70, 115, DEFAULT_SETTINGS.baseFov));
    const invertY = Boolean(src.invertY);
    const displayName = sanitizeDisplayName(src.displayName || '');

    const rawCh = src.crosshair && typeof src.crosshair === 'object' ? src.crosshair : {};
    const style = CROSSHAIR_STYLES.includes(rawCh.style) ? rawCh.style : DEFAULT_CROSSHAIR.style;
    const size = Math.round(clampNum(rawCh.size, 8, 28, DEFAULT_CROSSHAIR.size));
    const rawColor = typeof rawCh.color === 'string' ? rawCh.color.toLowerCase() : '';
    const color = CROSSHAIR_COLORS.includes(rawColor) ? rawColor : DEFAULT_CROSSHAIR.color;

    const rawKb = src.keybinds && typeof src.keybinds === 'object' ? src.keybinds : {};
    const keybinds = {};
    const used = new Set();

    for (const id of ACTION_IDS) {
      const candidate = rawKb[id];
      if (isValidInputToken(candidate) && !used.has(candidate)) {
        keybinds[id] = candidate;
        used.add(candidate);
      } else {
        keybinds[id] = null;
      }
    }

    // Fill any missing/colliding slots with unused defaults (or fallback tokens)
    const fallbackPool = Object.values(DEFAULT_KEYBINDS).concat([
      'KeyZ', 'KeyX', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'
    ]);
    for (const id of ACTION_IDS) {
      if (keybinds[id]) continue;
      if (!used.has(DEFAULT_KEYBINDS[id])) {
        keybinds[id] = DEFAULT_KEYBINDS[id];
        used.add(DEFAULT_KEYBINDS[id]);
      } else {
        const free = fallbackPool.find((tok) => !used.has(tok)) || DEFAULT_KEYBINDS[id];
        keybinds[id] = free;
        used.add(free);
      }
    }

    const rawVm = src.viewmodel && typeof src.viewmodel === 'object' ? src.viewmodel : {};
    const offsetX = Math.round(clampNum(rawVm.offsetX, -2.5, 2.5, DEFAULT_VIEWMODEL.offsetX) * 10) / 10;
    const offsetY = Math.round(clampNum(rawVm.offsetY, -2.5, 2.5, DEFAULT_VIEWMODEL.offsetY) * 10) / 10;
    const offsetZ = Math.round(clampNum(rawVm.offsetZ, -2.5, 2.5, DEFAULT_VIEWMODEL.offsetZ) * 10) / 10;
    const vmFov = Math.round(clampNum(rawVm.fov, 54, 72, DEFAULT_VIEWMODEL.fov));

    return {
      displayName,
      sensitivity: sens,
      invertY,
      baseFov,
      crosshair: { style, size, color },
      viewmodel: { offsetX, offsetY, offsetZ, fov: vmFov },
      keybinds
    };
  }

  function rebindAction(settings, actionId, newToken) {
    const clean = sanitizeSettings(settings);
    if (!ACTION_IDS.includes(actionId) || !isValidInputToken(newToken)) {
      return { settings: clean, changed: false, swappedWith: null };
    }
    const prevToken = clean.keybinds[actionId];
    if (prevToken === newToken) {
      return { settings: clean, changed: false, swappedWith: null };
    }

    const nextKeybinds = { ...clean.keybinds };
    let swappedWith = null;
    for (const otherId of ACTION_IDS) {
      if (otherId !== actionId && nextKeybinds[otherId] === newToken) {
        nextKeybinds[otherId] = prevToken;
        swappedWith = otherId;
        break;
      }
    }
    nextKeybinds[actionId] = newToken;

    return {
      settings: {
        ...clean,
        crosshair: { ...clean.crosshair },
        viewmodel: { ...clean.viewmodel },
        keybinds: nextKeybinds
      },
      changed: true,
      swappedWith
    };
  }

  function resetGameplayDefaults(settings) {
    const current = sanitizeSettings(settings);
    const defaults = cloneDefaults();
    defaults.displayName = current.displayName;
    return defaults;
  }

  function resolveEffectiveDisplayName(settings, authUser) {
    const custom = sanitizeDisplayName(settings && settings.displayName ? settings.displayName : '');
    if (custom.length > 0) return custom;
    if (authUser) {
      const fromProfile = sanitizeDisplayName(authUser.displayName || '');
      if (fromProfile.length > 0) return fromProfile;
      if (typeof authUser.email === 'string' && authUser.email.includes('@')) {
        const prefix = sanitizeDisplayName(authUser.email.split('@')[0]);
        if (prefix.length > 0) return prefix;
      }
    }
    return 'Runner';
  }

  function toCloudPayload(settings, uid) {
    const clean = sanitizeSettings(settings);
    return {
      uid: String(uid || ''),
      displayName: clean.displayName,
      sensitivity: clean.sensitivity,
      invertY: clean.invertY,
      baseFov: clean.baseFov,
      crosshair: {
        style: clean.crosshair.style,
        size: clean.crosshair.size,
        color: clean.crosshair.color
      },
      viewmodel: {
        offsetX: clean.viewmodel.offsetX,
        offsetY: clean.viewmodel.offsetY,
        offsetZ: clean.viewmodel.offsetZ,
        fov: clean.viewmodel.fov
      },
      keybinds: {
        forward: clean.keybinds.forward,
        back: clean.keybinds.back,
        left: clean.keybinds.left,
        right: clean.keybinds.right,
        jump: clean.keybinds.jump,
        slide: clean.keybinds.slide,
        grapple: clean.keybinds.grapple,
        burst: clean.keybinds.burst,
        fire: clean.keybinds.fire,
        altFire: clean.keybinds.altFire,
        reload: clean.keybinds.reload,
        slotRifle: clean.keybinds.slotRifle,
        slotAwp: clean.keybinds.slotAwp,
        slotDeagle: clean.keybinds.slotDeagle,
        slotKnife: clean.keybinds.slotKnife,
        restart: clean.keybinds.restart,
        checkpoint: clean.keybinds.checkpoint,
        ghost: clean.keybinds.ghost,
        inspect: clean.keybinds.inspect
      }
    };
  }

  function loadLocal(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return cloneDefaults();
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaults();
      return sanitizeSettings(JSON.parse(raw));
    } catch (_) {
      return cloneDefaults();
    }
  }

  function saveLocal(settings, storage) {
    const clean = sanitizeSettings(settings);
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (store) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch (_) {}
    }
    return clean;
  }

  return {
    STORAGE_KEY,
    ACTIONS,
    ACTION_IDS,
    CROSSHAIR_STYLES,
    CROSSHAIR_COLORS,
    DEFAULT_KEYBINDS,
    DEFAULT_CROSSHAIR,
    DEFAULT_VIEWMODEL,
    DEFAULT_SETTINGS,
    cloneDefaults,
    sanitizeDisplayName,
    isValidInputToken,
    mouseButtonToToken,
    formatInputToken,
    sanitizeSettings,
    rebindAction,
    resetGameplayDefaults,
    resolveEffectiveDisplayName,
    toCloudPayload,
    loadLocal,
    saveLocal
  };
});
