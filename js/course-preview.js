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
      slate:     { sky0: '#0a1624', sky1: '#18324a', ramp: '#28526e', accent: '#65e7ff', lip: '#ff9b55', bg: '#0f2030' },
      sandstone: { sky0: '#24171c', sky1: '#523428', ramp: '#9c714e', accent: '#ffb35c', lip: '#4be3ff', bg: '#38241d' },
      kitsune:   { sky0: '#070812', sky1: '#16132b', ramp: '#1b2034', accent: '#ff3b7a', lip: '#45f0ff', bg: '#0e1120' },
      boreas:    { sky0: '#1b2f42', sky1: '#496e87', ramp: '#7cc2dc', accent: '#aef6ff', lip: '#ffad60', bg: '#2e485c' },
      prism:     { sky0: '#120d26', sky1: '#2c1e54', ramp: '#4e3985', accent: '#c290ff', lip: '#ffc857', bg: '#1e1538' },
      void:      { sky0: '#0c080e', sky1: '#26141a', ramp: '#362229', accent: '#ff6b3d', lip: '#5ce8ff', bg: '#180f14' }
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
    } else if (meta.theme === 'sandstone') {
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

  // Dedicated Live 3D Flythrough & Orbit Preview Renderer
  const CoursePreview3D = (() => {
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
    let mode = 'flythrough'; // 'flythrough' | 'orbit'
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
        if (active && currentCourseId) {
          const meta = root.CourseCatalog && root.CourseCatalog.getCourseMeta(currentCourseId);
          if (meta) showCourse(canvasEl, meta);
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
        targetDist = clamp(targetDist * (e.deltaY > 0 ? 1.12 : 0.89), 42, 620);
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
        flyCurve.getPointAt(aheadT, _lookAt);
        // Aim slightly downward toward ramps below the camera rail
        _lookAt.y -= 5.5;
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
        if (!dragging) targetYaw += dt * 0.14;
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
      applyLevelTheme(meta.theme || 'slate', pScene, pHemi, pSun);
      // Soften fog and boost ambient fill slightly in preview so distant course architecture reads crisply
      if (pScene.fog) pScene.fog.density *= 0.55;
      if (pHemi) pHemi.intensity *= 1.18;
      if (pSun) pSun.intensity *= 1.12;

      const built = meta.build({
        group: previewGroup,
        collide: false,
        theme: meta.theme || 'slate',
        isPreview: true
      });

      // Compute course bounding box for Orbit mode & fallback rail
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
      orbitDist = targetDist;
      targetYaw = 0.65; orbitYaw = 0.65;
      targetPitch = 0.36; orbitPitch = 0.36;

      // Build smooth closed flythrough rail from curated course waypoints
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
      flyDuration = Math.max(12, wps.length * 2.8);

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
    }

    return {
      showCourse,
      setMode,
      getMode,
      setOnModeChange,
      resize,
      stop
    };
  })();

  root.CoursePreview3D = CoursePreview3D;
  root.renderCourseThumbDataUrl = renderCourseThumbDataUrl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
