// =====================================================================
// LIVE 3D FLYTHROUGH / ORBIT PREVIEW RENDERER & ROW THUMBNAILS
// Renders each course's real geometry inside the SurfD-style Browser.
// =====================================================================
(function (root) {
  'use strict';

  const thumbCache = new Map();

  // Crisp procedural 16:9 thumbnail for each map row in the left table
  function renderCourseThumbDataUrl(meta) {
    if (!meta) return '';
    if (thumbCache.has(meta.id)) return thumbCache.get(meta.id);
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 72;
    const ctx = c.getContext('2d');

    const palettes = {
      slate:      { sky0: '#0a1624', sky1: '#18324a', ramp: '#28526e', accent: '#65e7ff', lip: '#ff9b55', bg: '#0f2030' },
      sandstone:  { sky0: '#24171c', sky1: '#523428', ramp: '#9c714e', accent: '#ffb35c', lip: '#4be3ff', bg: '#38241d' },
      kitsune:    { sky0: '#070812', sky1: '#16132b', ramp: '#1b2034', accent: '#ff3b7a', lip: '#45f0ff', bg: '#0e1120' },
      boreas:     { sky0: '#1b2f42', sky1: '#496e87', ramp: '#7cc2dc', accent: '#aef6ff', lip: '#ffad60', bg: '#2e485c' },
      prism:      { sky0: '#120d26', sky1: '#2c1e54', ramp: '#4e3985', accent: '#c290ff', lip: '#ffc857', bg: '#1e1538' },
      void:       { sky0: '#0c080e', sky1: '#26141a', ramp: '#362229', accent: '#ff6b3d', lip: '#5ce8ff', bg: '#180f14' },
      industrial: { sky0: '#0d131a', sky1: '#222d38', ramp: '#465463', accent: '#ffa640', lip: '#4ae6ff', bg: '#19212a' },
      sunset:     { sky0: '#2b1414', sky1: '#6e3222', ramp: '#a85a3a', accent: '#ff9a44', lip: '#4eeeff', bg: '#452019' }
    };
    const p = palettes[meta.theme] || palettes.slate;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, p.sky0);
    sky.addColorStop(1, p.sky1);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 128, 72);

    // Subtle atmospheric silhouettes per theme
    ctx.fillStyle = p.bg;
    if (meta.theme === 'boreas') {
      ctx.beginPath();
      ctx.moveTo(0, 72); ctx.lineTo(24, 24); ctx.lineTo(50, 56);
      ctx.lineTo(78, 18); ctx.lineTo(108, 50); ctx.lineTo(128, 30); ctx.lineTo(128, 72);
      ctx.closePath(); ctx.fill();
    } else if (meta.theme === 'sandstone' || meta.theme === 'sunset') {
      ctx.fillRect(6, 26, 28, 46);
      ctx.fillRect(92, 22, 30, 50);
    } else if (meta.theme === 'kitsune' || meta.theme === 'prism') {
      ctx.strokeStyle = p.accent;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(22, 12, 84, 48);
      ctx.strokeRect(36, 20, 56, 32);
      ctx.globalAlpha = 1;
    }

    // Signature geometry icon (spiral vs channel vs wedge vs time-trial)
    const piecesStr = (meta.pieces || []).join(' ').toLowerCase();
    ctx.save();
    if (piecesStr.includes('spiral') || piecesStr.includes('corkscrew')) {
      // Stylized corkscrew helix ribbon
      ctx.strokeStyle = p.ramp;
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = 64 + Math.sin(t * Math.PI * 3.1) * (36 - t * 14);
        const y = 12 + t * 52;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (piecesStr.includes('channel') || piecesStr.includes('tube')) {
      // Twin opposing V-channel surf walls
      ctx.fillStyle = p.ramp;
      ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(52, 66); ctx.lineTo(38, 66); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(118, 14); ctx.lineTo(76, 66); ctx.lineTo(90, 66); ctx.lineTo(128, 22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(52, 66); ctx.moveTo(118, 14); ctx.lineTo(76, 66); ctx.stroke();
    } else if (meta.category === 'timetrial') {
      // Wallrun panels & glowing checkpoint ring
      ctx.fillStyle = p.ramp;
      ctx.fillRect(16, 18, 12, 46);
      ctx.fillRect(100, 18, 12, 46);
      ctx.fillRect(36, 54, 56, 8);
      ctx.strokeStyle = p.accent; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(64, 34, 15, 0, Math.PI * 2); ctx.stroke();
    } else {
      // Classic CS A-frame surf wedge perspective
      ctx.fillStyle = p.ramp;
      ctx.beginPath();
      ctx.moveTo(64, 18); ctx.lineTo(114, 68); ctx.lineTo(14, 68);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.moveTo(64, 18); ctx.lineTo(114, 68); ctx.lineTo(64, 68);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(64, 16); ctx.lineTo(64, 68); ctx.stroke();
      ctx.strokeStyle = p.lip; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(22, 62); ctx.lineTo(64, 22); ctx.lineTo(106, 62); ctx.stroke();
    }

    // Optional boost ring accent
    if (piecesStr.includes('boost')) {
      ctx.strokeStyle = p.lip;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(94, 24, 9, 12, 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    const url = c.toDataURL('image/png');
    thumbCache.set(meta.id, url);
    return url;
  }

  // Distinct procedural 16:9 architectural emblem thumbnail for each of the 6 PvP Arenas
  function renderArenaThumbDataUrl(meta) {
    if (!meta) return '';
    const key = 'arena:' + meta.id;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const c = document.createElement('canvas');
    c.width = 224;
    c.height = 126;
    const ctx = c.getContext('2d');

    const styles = {
      arena_surf:    { sky0: '#110b26', sky1: '#2e1d5e', main: '#574194', dark: '#211740', acc: '#4ef4ff', lip: '#ffcf66' },
      arena_aim:     { sky0: '#2d1c16', sky1: '#784c35', main: '#b38661', dark: '#4a2e22', acc: '#ffb35c', lip: '#4be3ff' },
      arena_spire:   { sky0: '#070917', sky1: '#1a1536', main: '#2c3452', dark: '#121626', acc: '#52f4ff', lip: '#ff4788' },
      arena_cargo:   { sky0: '#0e141c', sky1: '#273340', main: '#465463', dark: '#1a222b', acc: '#ffa640', lip: '#4ae6ff' },
      arena_skyline: { sky0: '#16293d', sky1: '#446a85', main: '#7bbcd6', dark: '#243a4d', acc: '#9bf4ff', lip: '#ffad60' },
      arena_canyon:  { sky0: '#2c1312', sky1: '#803a24', main: '#b86240', dark: '#4f2419', acc: '#ffad52', lip: '#4eeeff' }
    };
    const s = styles[meta.id] || styles.arena_surf;

    const sky = ctx.createLinearGradient(0, 0, 0, 126);
    sky.addColorStop(0, s.sky0);
    sky.addColorStop(1, s.sky1);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 224, 126);

    // Subtle atmospheric horizon glow
    const glow = ctx.createRadialGradient(112, 74, 8, 112, 74, 96);
    glow.addColorStop(0, s.acc + '30');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 224, 126);

    ctx.save();
    if (meta.id === 'arena_surf') {
      // Curved twin surf-bowl wings + central crown deck + turbo ring
      ctx.fillStyle = s.main;
      ctx.beginPath(); ctx.moveTo(14, 34); ctx.quadraticCurveTo(54, 82, 86, 108); ctx.lineTo(52, 108); ctx.quadraticCurveTo(28, 76, 6, 46); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(210, 34); ctx.quadraticCurveTo(170, 82, 138, 108); ctx.lineTo(172, 108); ctx.quadraticCurveTo(196, 76, 218, 46); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.dark;
      ctx.fillRect(82, 74, 60, 14);
      ctx.strokeStyle = s.acc; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(14, 34); ctx.quadraticCurveTo(54, 82, 86, 108); ctx.moveTo(210, 34); ctx.quadraticCurveTo(170, 82, 138, 108); ctx.stroke();
      ctx.strokeStyle = s.lip; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(112, 46, 20, 14, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (meta.id === 'arena_aim') {
      // Sunlit CS 3-lane courtyard with catwalk overpass & sandstone arches
      ctx.fillStyle = s.dark;
      ctx.fillRect(10, 34, 32, 92);
      ctx.fillRect(182, 34, 32, 92);
      ctx.fillStyle = s.main;
      ctx.fillRect(10, 62, 204, 14); // Overhead sky-bridge
      ctx.fillRect(92, 84, 40, 26); // Central monument
      ctx.fillStyle = '#9c4e36';
      ctx.fillRect(48, 86, 30, 14);
      ctx.fillRect(146, 86, 30, 14);
      ctx.strokeStyle = s.acc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 62); ctx.lineTo(214, 62); ctx.stroke();
      ctx.fillStyle = s.acc;
      ctx.fillRect(48, 100, 30, 3);
      ctx.fillRect(146, 100, 30, 3);
    } else if (meta.id === 'arena_spire') {
      // 4-story vertical grapple tower & glowing central columns
      ctx.fillStyle = s.dark;
      ctx.fillRect(86, 16, 10, 104);
      ctx.fillRect(128, 16, 10, 104);
      ctx.fillStyle = s.main;
      for (const y of [28, 52, 76, 100]) {
        ctx.fillRect(58, y, 108, 9);
      }
      ctx.strokeStyle = s.acc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(91, 16); ctx.lineTo(91, 118); ctx.moveTo(133, 16); ctx.lineTo(133, 118); ctx.stroke();
      ctx.strokeStyle = s.lip; ctx.lineWidth = 2;
      ctx.strokeRect(78, 14, 68, 14);
    } else if (meta.id === 'arena_cargo') {
      // Industrial warehouse trusses & colorful stacked shipping containers
      ctx.strokeStyle = s.dark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(224, 22); ctx.moveTo(28, 22); ctx.lineTo(28, 126); ctx.moveTo(196, 22); ctx.lineTo(196, 126); ctx.stroke();
      ctx.fillStyle = '#8f3336'; ctx.fillRect(34, 72, 46, 32);
      ctx.fillStyle = '#256173'; ctx.fillRect(144, 72, 46, 32);
      ctx.fillStyle = '#a6742b'; ctx.fillRect(84, 58, 56, 28); // Elevated slide-under container!
      ctx.fillStyle = s.acc; ctx.fillRect(84, 86, 56, 3);
      ctx.fillStyle = s.dark; ctx.fillRect(86, 89, 6, 16); ctx.fillRect(132, 89, 6, 16);
      ctx.fillStyle = s.acc; ctx.fillRect(48, 22, 42, 4); ctx.fillRect(134, 22, 42, 4);
    } else if (meta.id === 'arena_skyline') {
      // Twin skyscraper rooftops over void chasm + helipad + turbo rings
      ctx.fillStyle = s.dark;
      ctx.fillRect(10, 56, 62, 70);
      ctx.fillRect(152, 56, 62, 70);
      ctx.fillStyle = s.main;
      ctx.fillRect(10, 52, 62, 7);
      ctx.fillRect(152, 52, 62, 7);
      ctx.fillRect(86, 62, 52, 9); // Helipad
      ctx.strokeStyle = s.acc; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(72, 54); ctx.lineTo(152, 54); ctx.stroke();
      ctx.strokeStyle = s.lip; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(112, 40, 12, 16, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      // Redrock Canyon: twin mesas, high sniper bridges, sunset sun
      ctx.fillStyle = '#ff9a44';
      ctx.beginPath(); ctx.arc(112, 34, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.dark;
      ctx.beginPath(); ctx.moveTo(0, 126); ctx.lineTo(0, 46); ctx.lineTo(56, 46); ctx.lineTo(74, 126); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(224, 126); ctx.lineTo(224, 46); ctx.lineTo(168, 46); ctx.lineTo(150, 126); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.main;
      ctx.fillRect(46, 54, 132, 8); // Sniper bridge
      ctx.fillStyle = s.lip;
      ctx.fillRect(52, 53, 120, 2);
      ctx.fillStyle = s.acc;
      ctx.fillRect(92, 102, 40, 4);
    }
    ctx.restore();

    const url = c.toDataURL('image/png');
    thumbCache.set(key, url);
    return url;
  }

  // Dedicated Live 3D Flythrough & Orbit Preview Renderer Factory
  function createPreview3DController(defaultMode) {
    let pRenderer = null;
    let pScene = null;
    let pCamera = null;
    let pHemi = null;
    let pSun = null;
    let previewGroup = null;
    let canvasEl = null;

    let active = false;
    let frameId = 0;
    let lastTs = 0;
    let currentCourseId = null;
    let currentMeta = null;
    let mode = defaultMode === 'orbit' ? 'orbit' : 'flythrough'; // 'flythrough' | 'orbit'
    let onModeChangeCb = null;

    // Flythrough spline & orbit state
    let flyCurve = null;
    let flyT = 0;
    let flyDuration = 14;
    let orbitYaw = 0.65;
    let orbitPitch = 0.34;
    let orbitDist = 180;
    let targetYaw = 0.65;
    let targetPitch = 0.34;
    let targetDist = 180;
    let dragging = false;
    let lastPtrX = 0;
    let lastPtrY = 0;

    // Pre-allocated zero-GC scratch vectors
    const _camPos = new THREE.Vector3();
    const _lookAt = new THREE.Vector3();
    const _smoothPos = new THREE.Vector3();
    const _smoothLook = new THREE.Vector3();
    const _orbitCenter = new THREE.Vector3();
    const _box = new THREE.Box3();
    const _size = new THREE.Vector3();

    function disposePreviewGroup() {
      if (!previewGroup) return;
      previewGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        // Only dispose per-gate/unique materials; shared theme materials live in _surfThemeCache
        if (obj.material && obj.material.isMeshBasicMaterial) {
          obj.material.dispose();
        }
      });
      while (previewGroup.children.length > 0) {
        previewGroup.remove(previewGroup.children[0]);
      }
    }

    function ensureInit(canvas) {
      if (pRenderer && canvasEl === canvas) return;
      canvasEl = canvas;
      pRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false
      });
      pRenderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      pRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pRenderer.toneMappingExposure = 1.08;

      pScene = new THREE.Scene();
      pCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.4, 1200);
      pHemi = new THREE.HemisphereLight(0x9bdcff, 0x18202b, 1.35);
      pScene.add(pHemi);
      pSun = new THREE.DirectionalLight(0xc5eaff, 2.0);
      pSun.position.set(-70, 120, 50);
      pScene.add(pSun);

      previewGroup = new THREE.Group();
      pScene.add(previewGroup);

      // Context loss safety
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        stopLoop();
      });
      canvas.addEventListener('webglcontextrestored', () => {
        if (active && currentMeta) {
          showCourse(canvasEl, currentMeta);
        }
      });

      // Pointer drag switches smoothly to orbit inspection
      canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
        lastPtrX = e.clientX;
        lastPtrY = e.clientY;
        if (mode !== 'orbit') setMode('orbit');
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastPtrX;
        const dy = e.clientY - lastPtrY;
        lastPtrX = e.clientX;
        lastPtrY = e.clientY;
        targetYaw -= dx * 0.008;
        targetPitch = clamp(targetPitch + dy * 0.006, 0.08, 1.28);
      });
      const endDrag = () => { dragging = false; };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (mode !== 'orbit') setMode('orbit');
        targetDist = clamp(targetDist * (e.deltaY > 0 ? 1.12 : 0.89), 36, 620);
      }, { passive: false });
    }

    function resize() {
      if (!pRenderer || !canvasEl || !pCamera) return;
      const w = Math.max(240, canvasEl.clientWidth || 440);
      const h = Math.max(135, canvasEl.clientHeight || 248);
      pRenderer.setSize(w, h, false);
      pCamera.aspect = w / h;
      pCamera.updateProjectionMatrix();
    }

    function afterDraw(cb) {
      const gl = pRenderer.getContext();
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(() => cb(performance.now()), 90);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!active) { if (sync) gl.deleteSync(sync); return; }
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(() => cb(performance.now()), 90);
        }
      };
      frameId = window.setTimeout(poll, 8);
    }

    function updateCamera(dt, snap) {
      if (!pCamera) return;
      if (mode === 'flythrough' && flyCurve) {
        flyT = (flyT + dt / flyDuration) % 1;
        const aheadT = (flyT + 0.065) % 1;
        flyCurve.getPointAt(flyT, _camPos);
        if (currentMeta && currentMeta.archetype) {
          // For arenas, look inward toward arena center so the combat space stays framed!
          _lookAt.copy(_orbitCenter);
          _lookAt.y = Math.max(2, _orbitCenter.y * 0.55);
        } else {
          flyCurve.getPointAt(aheadT, _lookAt);
          _lookAt.y -= 5.5;
        }
        if (snap) {
          _smoothPos.copy(_camPos);
          _smoothLook.copy(_lookAt);
        } else {
          const alpha = 1 - Math.exp(-5.5 * dt);
          _smoothPos.lerp(_camPos, alpha);
          _smoothLook.lerp(_lookAt, alpha);
        }
        pCamera.position.copy(_smoothPos);
        pCamera.lookAt(_smoothLook);
      } else {
        if (!dragging) targetYaw += dt * 0.16;
        const alpha = snap ? 1 : (1 - Math.exp(-8.5 * dt));
        orbitYaw += (targetYaw - orbitYaw) * alpha;
        orbitPitch += (targetPitch - orbitPitch) * alpha;
        orbitDist += (targetDist - orbitDist) * alpha;
        const cp = Math.cos(orbitPitch);
        pCamera.position.set(
          _orbitCenter.x + Math.sin(orbitYaw) * cp * orbitDist,
          _orbitCenter.y + Math.sin(orbitPitch) * orbitDist,
          _orbitCenter.z + Math.cos(orbitYaw) * cp * orbitDist
        );
        pCamera.lookAt(_orbitCenter);
      }
    }

    function tick(now) {
      if (!active || !pRenderer || !pScene || !pCamera) return;
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      updateCamera(dt, false);
      pRenderer.render(pScene, pCamera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = window.requestAnimationFrame(tick);
    }

    function stopLoop() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
        frameId = 0;
      }
    }

    function showCourse(canvas, meta) {
      if (!canvas || !meta || typeof meta.build !== 'function') return;
      ensureInit(canvas);
      resize();
      disposePreviewGroup();

      currentCourseId = meta.id;
      currentMeta = meta;
      applyLevelTheme(meta.theme || 'slate', pScene, pHemi, pSun);
      // Soften fog and boost ambient fill slightly in preview so architecture reads crisply
      if (pScene.fog) pScene.fog.density *= 0.52;
      if (pHemi) pHemi.intensity *= 1.18;
      if (pSun) pSun.intensity *= 1.12;

      const built = meta.build({
        group: previewGroup,
        collide: false,
        theme: meta.theme || 'slate',
        isPreview: true
      });

      // Compute bounding box for Orbit mode (for arenas, center cleanly on playable core)
      if (meta.archetype) {
        _orbitCenter.set(0, meta.id === 'arena_spire' ? 16 : (meta.id === 'arena_surf' ? 12 : 8), 0);
        targetDist = meta.id === 'arena_cargo' ? 132 : (meta.id === 'arena_aim' ? 138 : (meta.id === 'arena_spire' ? 142 : 162));
      } else {
        _box.setFromObject(previewGroup);
        if (_box.isEmpty()) {
          _orbitCenter.set(0, 20, 80);
          targetDist = 140;
        } else {
          _box.getCenter(_orbitCenter);
          _box.getSize(_size);
          const radius = Math.max(40, _size.length() * 0.42);
          targetDist = clamp(radius * 1.15, 70, 440);
        }
      }
      orbitDist = targetDist;
      targetYaw = 0.65; orbitYaw = 0.65;
      targetPitch = meta.archetype ? 0.40 : 0.36; orbitPitch = targetPitch;

      const wps = built && Array.isArray(built.previewWaypoints) && built.previewWaypoints.length >= 3
        ? built.previewWaypoints.map(pt => new THREE.Vector3(pt[0], pt[1], pt[2]))
        : [
            new THREE.Vector3(_orbitCenter.x - 40, _orbitCenter.y + 32, _orbitCenter.z - 80),
            new THREE.Vector3(_orbitCenter.x + 40, _orbitCenter.y + 24, _orbitCenter.z),
            new THREE.Vector3(_orbitCenter.x - 30, _orbitCenter.y + 20, _orbitCenter.z + 80),
            new THREE.Vector3(_orbitCenter.x + 30, _orbitCenter.y + 38, _orbitCenter.z)
          ];
      flyCurve = new THREE.CatmullRomCurve3(wps, true, 'catmullrom', 0.45);
      flyT = 0.04;
      flyDuration = meta.archetype ? 18 : Math.max(12, wps.length * 2.8);

      updateCamera(0.016, true);
      pRenderer.render(pScene, pCamera);

      active = true;
      lastTs = performance.now();
      stopLoop();
      if (isSoftwareGl) afterDraw(tick);
      else frameId = window.requestAnimationFrame(tick);
    }

    function setMode(nextMode) {
      mode = nextMode === 'orbit' ? 'orbit' : 'flythrough';
      if (typeof onModeChangeCb === 'function') onModeChangeCb(mode);
    }

    function getMode() { return mode; }

    function setOnModeChange(fn) { onModeChangeCb = fn; }

    function stop() {
      active = false;
      dragging = false;
      stopLoop();
      disposePreviewGroup();
      currentCourseId = null;
      currentMeta = null;
    }

    return {
      showCourse,
      setMode,
      getMode,
      setOnModeChange,
      resize,
      stop
    };
  }

  const CoursePreview3D = createPreview3DController('flythrough');
  const ArenaPreview3D = createPreview3DController('orbit');

  root.CoursePreview3D = CoursePreview3D;
  root.ArenaPreview3D = ArenaPreview3D;
  root.renderCourseThumbDataUrl = renderCourseThumbDataUrl;
  root.renderArenaThumbDataUrl = renderArenaThumbDataUrl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
