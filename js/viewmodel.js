// 3D First-Person 4-Archetype Glove Rig (Standard, Sport, Specialist, Hand Wraps),
// 5 Authentic CS Knife Models (Karambit, Skeleton, True 3-Link Kinematic Butterfly, M9 Bayonet, Default Tactical),
// Sharpened Bevel Blade Loft Geometry, Procedural Pattern PBR Skins for Knives & Gloves,
// Authentic CS Draw / Normal / Uncommon / 1-in-100 Mythic Inspect Tricks + F-Chaining,
// Live Viewmodel Offset/FOV, Armory Live Combo 3D Preview Turntable, and Web Audio SFX.
(function (root) {
  const THREE = root.THREE;
  const KS = root.KnivesSystem;

  // ---------- Synthesized Web Audio SFX (zero external audio files) ----------
  const CaseAudio = (() => {
    let ctx = null;
    function getCtx() {
      if (ctx) return ctx;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        return ctx;
      } catch (_) {
        return null;
      }
    }
    function tick(pitch = 1) {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(760 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(220 * pitch, now + 0.028);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.036);
    }
    function reveal(rarity) {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const notes =
        rarity === 'gold'
          ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
          : rarity === 'covert'
            ? [440, 554.37, 659.25, 880]
            : rarity === 'classified'
              ? [392, 493.88, 587.33]
              : [329.63, 440];
      notes.forEach((freq, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = rarity === 'gold' ? 'sine' : 'triangle';
        const t0 = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(rarity === 'gold' ? 0.11 : 0.075, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (rarity === 'gold' ? 0.72 : 0.42));
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 0.75);
      });
    }
    function bladeShing() {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1650, now);
      osc.frequency.exponentialRampToValueAtTime(2950, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.14);
      gain.gain.setValueAtTime(0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }
    function balisongClack(pitch = 1.0) {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const freqs = [2450 * pitch, 4120 * pitch];
      freqs.forEach((f, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = idx === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.42, now + 0.026);
        gain.gain.setValueAtTime(idx === 0 ? 0.048 : 0.018, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.034);
      });
    }
    function spinWhoosh(pitch = 1.0) {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(480 * pitch, now + 0.065);
      osc.frequency.exponentialRampToValueAtTime(175 * pitch, now + 0.15);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }
    // Signature crystalline harmonic shimmer for the 1/100 Mythic inspect trigger
    function mythicFlourish() {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const chord = [880, 1108.73, 1318.51, 1760];
      chord.forEach((freq, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        const t0 = now + idx * 0.045;
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.006, t0 + 0.36);
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(0.055 - idx * 0.006, t0 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 0.45);
      });
    }
    return { tick, reveal, bladeShing, balisongClack, spinWhoosh, mythicFlourish, _getCtx: getCtx };
  })();

  // ---------- Synthesized Web Audio Firearm & Combat SFX ----------
  const WeaponAudio = (() => {
    let noiseBuffer = null;
    function getCtx() {
      const c = CaseAudio._getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
      return c;
    }
    function getNoise(c) {
      if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
      const len = Math.floor(c.sampleRate * 0.45);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noiseBuffer = buf;
      return buf;
    }
    function noiseBurst(c, startTime, dur, filterType, freq, q, peakGain) {
      const src = c.createBufferSource();
      src.buffer = getNoise(c);
      const filter = c.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(freq, startTime);
      filter.Q.setValueAtTime(q, startTime);
      const gain = c.createGain();
      gain.gain.setValueAtTime(Math.max(0.0005, peakGain), startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(startTime);
      src.stop(startTime + dur + 0.01);
    }
    function fireRifle() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.11, 'bandpass', 1450, 0.85, 0.24);
      noiseBurst(c, now, 0.05, 'highpass', 2600, 0.7, 0.14);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.085);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
    function fireAwp() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.34, 'lowpass', 1200, 0.7, 0.36);
      noiseBurst(c, now, 0.14, 'bandpass', 2200, 0.9, 0.22);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.26);
      sg.gain.setValueAtTime(0.32, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.3);
      // Mechanical bolt cycle click-clack
      [0.36, 0.56].forEach((offset, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(idx === 0 ? 1580 : 1940, now + offset);
        osc.frequency.exponentialRampToValueAtTime(540, now + offset + 0.035);
        g.gain.setValueAtTime(0.036, now + offset);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.045);
      });
    }
    function fireDeagle() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.18, 'bandpass', 1100, 0.75, 0.28);
      noiseBurst(c, now, 0.07, 'highpass', 2100, 0.6, 0.16);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(44, now + 0.14);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }
    function fireWeapon(slot) {
      if (slot === 'awp') fireAwp();
      else if (slot === 'deagle') fireDeagle();
      else fireRifle();
    }
    function dryFire() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.02);
      g.gain.setValueAtTime(0.045, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.028);
    }
    function reloadStart() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [0, 0.16].forEach((off, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 680 : 480, now + off);
        osc.frequency.exponentialRampToValueAtTime(220, now + off + 0.05);
        g.gain.setValueAtTime(0.06, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.055);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.06);
      });
    }
    function reloadFinish() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [0, 0.09].forEach((off, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(idx === 0 ? 940 : 1480, now + off);
        osc.frequency.exponentialRampToValueAtTime(520, now + off + 0.036);
        g.gain.setValueAtTime(0.048, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.042);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.045);
      });
    }
    function scopeZoom(stage) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      const base = stage === 2 ? 1240 : stage === 1 ? 920 : 620;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.04);
      g.gain.setValueAtTime(0.045, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
    function weaponDraw() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.065, 'bandpass', 1800, 1.4, 0.055);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
      g.gain.setValueAtTime(0.042, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now + 0.03);
      osc.stop(now + 0.095);
    }
    function hitmarker(isHeadshot) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = isHeadshot ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isHeadshot ? 1960 : 1220, now);
      osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2680 : 720, now + 0.055);
      g.gain.setValueAtTime(isHeadshot ? 0.14 : 0.09, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (isHeadshot ? 0.11 : 0.06));
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
    function targetShatter(isHeadshot) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const freqs = isHeadshot ? [1560, 2093, 2637] : [1046, 1396];
      freqs.forEach((f, i) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.02);
        osc.frequency.exponentialRampToValueAtTime(f * 1.18, now + i * 0.02 + 0.12);
        g.gain.setValueAtTime(0.075, now + i * 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.02 + 0.15);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + i * 0.02);
        osc.stop(now + i * 0.02 + 0.16);
      });
    }
    function killConfirm() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [659.25, 987.77, 1318.5].forEach((f, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        const t0 = now + idx * 0.035;
        osc.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.09, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      });
    }
    function roundHorn(win) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const notes = win ? [440, 554.37, 659.25, 880] : [392, 349.23, 293.66];
      notes.forEach((f, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sawtooth';
        const filt = c.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 1400;
        const t0 = now + idx * 0.08;
        osc.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.065, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
        osc.connect(filt);
        filt.connect(g);
        g.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 0.36);
      });
    }
    return {
      fireRifle,
      fireAwp,
      fireDeagle,
      fireWeapon,
      dryFire,
      reloadStart,
      reloadFinish,
      scopeZoom,
      weaponDraw,
      hitmarker,
      targetShatter,
      killConfirm,
      roundHorn
    };
  })();

  // ---------- Procedural Studio Environment Map (PMREMGenerator) ----------
  function createStudioEnvMap(targetRenderer) {
    const pmrem = new THREE.PMREMGenerator(targetRenderer);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0b1622);

    const panelGeo = new THREE.PlaneGeometry(8, 5);
    const addPanel = (color, intensity, pos, rot) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(panelGeo, mat);
      m.position.set(pos[0], pos[1], pos[2]);
      m.rotation.set(rot[0], rot[1], rot[2]);
      envScene.add(m);
    };
    addPanel(0xeef8ff, 3.1, [0, 6.5, 0], [Math.PI / 2, 0, 0]);
    addPanel(0xffecd2, 2.6, [6.5, 2.5, 2], [0, -Math.PI / 2, 0]);
    addPanel(0x7be8ff, 2.2, [-6.5, 1.8, -2], [0, Math.PI / 2, 0]);
    addPanel(0xd4eaff, 1.9, [0, 2.0, 7], [0, Math.PI, 0]);
    addPanel(0x28435a, 0.9, [0, -5.5, 0], [-Math.PI / 2, 0, 0]);

    const rt = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    panelGeo.dispose();
    return rt.texture;
  }

  // ---------- Procedural Knife Skin PBR Texture Generator ----------
  const skinCanvasCache = new Map();
  const gloveCanvasCache = new Map();
  const weaponCanvasCache = new Map();
  const thumbCache = new Map();

  function skinCacheKey(item) {
    return `${item.skinId}_${item.patternSeed}_${item.specialTag || ''}_${Math.round((item.floatValue || 0) * 50)}`;
  }

  function paintSkinToCanvases(item, size = 256) {
    const key = skinCacheKey(item) + '_' + size;
    if (skinCanvasCache.has(key)) return skinCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = size;
    albedoCanvas.height = size;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d');

    const skinId = item.skinId || 'vanilla';
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.08));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.05) / 0.72));
    const tag = item.specialTag || '';

    const aImg = actx.createImageData(size, size);
    const rImg = rctx.createImageData(size, size);
    const ad = aImg.data;
    const rd = rImg.data;

    const webCenters = [];
    if (skinId === 'crimson_web') {
      for (let i = 0; i < 3; i++) {
        webCenters.push({
          x: 0.14 + KS.hash2D(seed, i * 17 + 3, 211) * 0.72,
          y: 0.18 + KS.hash2D(seed, i * 29 + 7, 307) * 0.64,
          spokes: 7 + (seed + i) % 3,
          rot: KS.hash2D(seed, i * 41, 131) * Math.PI * 2
        });
      }
    }

    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 90;
    const ox = KS.hash2D(seed, 11, 73) * 10;
    const oy = KS.hash2D(seed, 23, 89) * 10;

    for (let py = 0; py < size; py++) {
      const v = py / (size - 1);
      for (let px = 0; px < size; px++) {
        const u = px / (size - 1);
        const idx = (py * size + px) * 4;
        let r = 175, g = 185, b = 195;
        let rough = 58;

        if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          r = ch.r; g = ch.g; b = ch.b;
          rough = ch.isBlue ? 40 : ch.isGold ? 52 : 66;
        } else if (skinId === 'doppler') {
          const wx = KS.fbm2D(u * 3.4 + ox, v * 3.4 + oy, seed + 13, 3);
          const wy = KS.fbm2D(u * 3.4 + ox + 4.1, v * 3.4 + oy + 2.7, seed + 29, 3);
          const sw = KS.fbm2D((u + (wx - 0.5) * 0.75) * 4.2 + ox, (v + (wy - 0.5) * 0.75) * 4.2 + oy, seed + 53, 4);
          const streak = Math.sin((u * 6 + v * 3 + sw * 4.5) * Math.PI) * 0.5 + 0.5;
          const t = Math.max(0, Math.min(1, sw * 0.72 + streak * 0.28));
          if (tag === 'RUBY') {
            r = 148 + t * 107; g = 12 + t * 34; b = 26 + t * 44; rough = 24 + (1 - t) * 18;
          } else if (tag === 'SAPPHIRE') {
            r = 16 + t * 34; g = 42 + t * 108; b = 178 + t * 77; rough = 22 + (1 - t) * 18;
          } else if (tag === 'BLACK PEARL') {
            r = 28 + t * 76; g = 18 + t * 36; b = 46 + t * 88; rough = 22 + (1 - t) * 20;
          } else if (tag === 'PHASE 2') {
            r = 52 + t * 192; g = 16 + t * 42; b = 68 + t * 124; rough = 30;
          } else if (tag === 'PHASE 4') {
            r = 18 + t * 34; g = 34 + t * 102; b = 78 + t * 172; rough = 30;
          } else if (tag === 'PHASE 3') {
            r = 14 + t * 38; g = 48 + t * 124; b = 64 + t * 118; rough = 32;
          } else {
            r = 32 + t * 138; g = 14 + t * 24; b = 48 + t * 84; rough = 32;
          }
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.12 - (1 - shift) * 0.22 + (v - 0.5) * 0.14));
          if (pos < 0.18) {
            const t = pos / 0.18;
            r = 195 + t * 45; g = 200 + t * 15; b = 208 - t * 65;
          } else if (pos < 0.48) {
            const t = (pos - 0.18) / 0.30;
            r = 246; g = 196 - t * 116; b = 72 + t * 102;
          } else if (pos < 0.78) {
            const t = (pos - 0.48) / 0.30;
            r = 244 - t * 112; g = 78 - t * 24; b = 178 + t * 58;
          } else {
            const t = (pos - 0.78) / 0.22;
            r = 132 - t * 38; g = 52 - t * 10; b = 236 + t * 16;
          }
          rough = 24;
        } else if (skinId === 'marble_fade') {
          const wave = KS.fbm2D(u * 2.8 + ox, v * 2.8 + oy, seed + 17, 3);
          const band = (u * 1.35 + (wave - 0.5) * 0.45 + (seed % 100) * 0.01) % 1;
          if (tag === 'FIRE & ICE') {
            const t = Math.sin((u * 1.8 + wave * 0.9) * Math.PI) * 0.5 + 0.5;
            r = 22 + t * 218; g = 34 + (1 - Math.abs(t - 0.5) * 2) * 24; b = 242 - t * 204;
          } else if (band < 0.34) {
            const t = band / 0.34;
            r = 232 - t * 200; g = 32 + t * 58; b = 46 + t * 194;
          } else if (band < 0.68) {
            const t = (band - 0.34) / 0.34;
            r = 32 + t * 212; g = 90 + t * 112; b = 240 - t * 192;
          } else {
            const t = (band - 0.68) / 0.32;
            r = 244 - t * 12; g = 202 - t * 170; b = 48 - t * 2;
          }
          rough = 26;
        } else if (skinId === 'tiger_tooth') {
          const warp = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 37, 3);
          const stripes = Math.sin((u * 15 + v * 4.5 + warp * 2.4) * Math.PI);
          if (stripes > 0.46) {
            r = 78; g = 52; b = 18; rough = 58;
          } else {
            const sheen = 0.85 + 0.15 * KS.fbm2D(u * 8, v * 8, seed + 5, 2);
            r = 238 * sheen; g = 184 * sheen; b = 44 * sheen; rough = 28;
          }
        } else if (skinId === 'damascus') {
          const w1 = KS.fbm2D(u * 3.5 + ox, v * 3.5 + oy, seed + 7, 4);
          const w2 = KS.fbm2D(u * 7.5 + w1 * 2.2, v * 7.5 + w1 * 2.2, seed + 43, 3);
          const bands = Math.sin((u * 6 + v * 5 + w1 * 5.2 + w2 * 1.4) * Math.PI * 2) * 0.5 + 0.5;
          const lum = 104 + bands * 118;
          r = lum * 0.96; g = lum; b = lum * 1.05;
          rough = 38 + (1 - bands) * 32;
        } else if (skinId === 'slaughter') {
          const angle = 0.65 + (seed % 7) * 0.14;
          const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
          const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
          const zebra = Math.sin((su * 16 + Math.sin(sv * 10) * 0.9) * Math.PI) * 0.5 + 0.5;
          const diamond = Math.abs(Math.sin(su * 6) * Math.sin(sv * 6));
          const mix = Math.min(1, zebra * 0.65 + diamond * 0.5);
          r = 112 + mix * 126; g = 18 + mix * 46; b = 28 + mix * 48;
          rough = 34 + (1 - mix) * 26;
        } else if (skinId === 'crimson_web') {
          const n = KS.fbm2D(u * 10, v * 10, seed + 19, 2);
          r = 152 + n * 38; g = 18 + n * 12; b = 24 + n * 14;
          rough = 80;
        } else if (skinId === 'ultraviolet') {
          const grain = KS.fbm2D(u * 18, v * 18, seed + 9, 2);
          r = 30 + grain * 18; g = 32 + grain * 18; b = 42 + grain * 22;
          if (v > 0.82) {
            r += 42; g += 18; b += 96; rough = 52;
          } else {
            rough = 136;
          }
        } else {
          const brush = KS.fbm2D(u * 4, v * 46, 17, 2);
          const lum = 162 + brush * 52;
          r = lum * 0.96; g = lum; b = lum * 1.06;
          rough = 48 + (1 - brush) * 24;
        }

        if (wearFactor > 0.01 && skinId !== 'vanilla') {
          const scratchNoise = KS.fbm2D(u * 14 + 3.1, v * 14 + 7.4, seed + 313, 3);
          const edgeMask = Math.max(0, 1 - v * 3.4) * 0.55 + Math.max(0, (u - 0.72) * 2.2) * 0.35;
          const threshold = 0.88 - wearFactor * 0.62 - edgeMask * wearFactor * 0.45;
          if (scratchNoise > threshold) {
            const k = Math.min(1, (scratchNoise - threshold) * 5.0);
            r = r * (1 - k) + 132 * k;
            g = g * (1 - k) + 138 * k;
            b = b * (1 - k) + 146 * k;
            rough = Math.min(240, rough + k * 95);
          } else {
            const dark = 1 - wearFactor * 0.22;
            r *= dark; g *= dark; b *= dark;
            rough = Math.min(230, rough + wearFactor * 36);
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(16, Math.min(245, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);

    if (skinId === 'crimson_web') {
      actx.save();
      actx.strokeStyle = 'rgba(12, 10, 14, 0.84)';
      actx.lineWidth = Math.max(1.2, size / 160);
      for (const wc of webCenters) {
        const cx = wc.x * size;
        const cy = wc.y * size;
        const maxR = size * 0.44;
        for (let s = 0; s < wc.spokes; s++) {
          const ang = wc.rot + (s / wc.spokes) * Math.PI * 2;
          actx.beginPath();
          actx.moveTo(cx, cy);
          actx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
          actx.stroke();
        }
        for (let ring = 1; ring <= 4; ring++) {
          const rr = (ring / 4) * maxR;
          actx.beginPath();
          for (let s = 0; s <= wc.spokes; s++) {
            const ang = wc.rot + (s / wc.spokes) * Math.PI * 2;
            const px = cx + Math.cos(ang) * rr;
            const py = cy + Math.sin(ang) * rr;
            if (s === 0) actx.moveTo(px, py);
            else actx.lineTo(px, py);
          }
          actx.stroke();
        }
      }
      actx.restore();
    }

    const result = { albedoCanvas, roughCanvas };
    if (skinCanvasCache.size > 48) {
      const firstKey = skinCanvasCache.keys().next().value;
      skinCanvasCache.delete(firstKey);
    }
    skinCanvasCache.set(key, result);
    return result;
  }

  // ---------- Procedural Glove PBR Texture & Palette Generator ----------
  const GLOVE_PALETTES = Object.freeze({
    tactical_slate: { palm: 0x121820, knuckle: 0x2b3a4a, cuff: 0x45c8e6, cuffEmissive: 0x0b4b5c, sleeve: 0x0f161f, metal: 0.14, rough: 0.78 },
    case_hardened:  { palm: 0x18212b, knuckle: 0x2e88d8, cuff: 0xe6b85c, cuffEmissive: 0x2a1e08, sleeve: 0x111720, metal: 0.56, rough: 0.42 },
    vice:           { palm: 0x1a1e26, knuckle: 0x38e8ff, cuff: 0xff4fd8, cuffEmissive: 0x480d3a, sleeve: 0x121722, metal: 0.16, rough: 0.68 },
    pandoras_box:   { palm: 0x161424, knuckle: 0x7a4dff, cuff: 0xa67bff, cuffEmissive: 0x291154, sleeve: 0x0f0e18, metal: 0.18, rough: 0.68 },
    hedge_maze:     { palm: 0x1c2822, knuckle: 0xecf5ef, cuff: 0x28d874, cuffEmissive: 0x093a1e, sleeve: 0x111915, metal: 0.14, rough: 0.70 },
    slingshot:      { palm: 0xd9cbb8, knuckle: 0x201c1d, cuff: 0xe83644, cuffEmissive: 0x420b10, sleeve: 0x171416, metal: 0.14, rough: 0.72 },
    crimson_kimono: { palm: 0x181518, knuckle: 0x1e1d22, cuff: 0xe22c3c, cuffEmissive: 0x40090e, sleeve: 0x111014, metal: 0.24, rough: 0.68 },
    emerald_web:    { palm: 0x101c16, knuckle: 0x16241c, cuff: 0x25de72, cuffEmissive: 0x083d1d, sleeve: 0x0e1511, metal: 0.22, rough: 0.68 },
    fade:           { palm: 0x1d1d26, knuckle: 0x342a48, cuff: 0xff6ad5, cuffEmissive: 0x3b1232, sleeve: 0x12131c, metal: 0.42, rough: 0.48 },
    leather:        { palm: 0x4a2f1d, knuckle: 0x70482b, cuff: 0x9b6840, cuffEmissive: 0x1a0e06, sleeve: 0x181412, metal: 0.08, rough: 0.84 },
    slaughter:      { palm: 0x2a1419, knuckle: 0x9c1e2e, cuff: 0xe03a52, cuffEmissive: 0x3b0b13, sleeve: 0x161114, metal: 0.18, rough: 0.70 },
    cobalt_skulls:  { palm: 0x121e33, knuckle: 0x2c68d8, cuff: 0x62b4ff, cuffEmissive: 0x0b254a, sleeve: 0x0e1520, metal: 0.14, rough: 0.76 },
    overprint:      { palm: 0x0e2228, knuckle: 0x1ea8a8, cuff: 0x47f2e6, cuffEmissive: 0x093a38, sleeve: 0x0c171b, metal: 0.14, rough: 0.74 }
  });

  function gloveCacheKey(item) {
    const gt = (item && item.gloveType) || 'standard';
    const sk = (item && item.skinId) || 'tactical_slate';
    const sd = (item && item.patternSeed) || 0;
    const fl = Math.round(((item && item.floatValue) || 0.08) * 50);
    return `glv_${gt}_${sk}_${sd}_${fl}`;
  }

  function paintGloveToCanvases(gloveItem, size = 256) {
    const item = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
    const key = gloveCacheKey(item) + '_' + size;
    if (gloveCanvasCache.has(key)) return gloveCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = size;
    albedoCanvas.height = size;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d');

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.08));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.06) / 0.72));
    const palette = GLOVE_PALETTES[skinId] || GLOVE_PALETTES.tactical_slate;

    const aImg = actx.createImageData(size, size);
    const rImg = rctx.createImageData(size, size);
    const ad = aImg.data;
    const rd = rImg.data;

    const ox = KS.hash2D(seed, 13, 59) * 10;
    const oy = KS.hash2D(seed, 29, 83) * 10;
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;

    for (let py = 0; py < size; py++) {
      const v = py / (size - 1);
      for (let px = 0; px < size; px++) {
        const u = px / (size - 1);
        const idx = (py * size + px) * 4;

        // Subtle woven ballistic mesh / fabric micro-grain
        const weave = ((Math.floor(u * 42) + Math.floor(v * 42)) & 1) ? 0.94 : 1.06;
        const micro = KS.fbm2D(u * 18, v * 18, seed + 17, 2);
        let r = 34, g = 42, b = 52;
        let rough = 185;

        if (skinId === 'tactical_slate') {
          r = (30 + micro * 16) * weave;
          g = (38 + micro * 18) * weave;
          b = (48 + micro * 22) * weave;
          rough = 192;
        } else if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          r = ch.r * (0.9 + micro * 0.14);
          g = ch.g * (0.9 + micro * 0.14);
          b = ch.b * (0.9 + micro * 0.14);
          rough = ch.isBlue ? 90 : 122;
        } else if (skinId === 'vice') {
          const diag = u * 0.85 + v * 0.65 + (KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 5, 2) - 0.5) * 0.22;
          const stripe = Math.sin((diag * 2.4 + (seed % 10) * 0.08) * Math.PI);
          if (stripe > 0.18) {
            // Vivid neon magenta-pink
            r = (238 + micro * 16) * weave;
            g = (52 + micro * 26) * weave;
            b = (176 + micro * 38) * weave;
          } else if (stripe < -0.22) {
            // Electric surf cyan
            r = (36 + micro * 24) * weave;
            g = (212 + micro * 28) * weave;
            b = (242 + micro * 12) * weave;
          } else {
            // Charcoal athletic divider band
            r = (32 + micro * 14) * weave;
            g = (36 + micro * 16) * weave;
            b = (48 + micro * 18) * weave;
          }
          rough = 162;
        } else if (skinId === 'pandoras_box') {
          const hex = Math.sin((u * 14 + ox) * Math.PI) * Math.sin((v * 14 + oy) * Math.PI);
          const diag = Math.sin(((u + v) * 4.5 + (seed % 12) * 0.12) * Math.PI);
          if (diag > -0.15) {
            const pMix = 0.5 + 0.5 * hex;
            r = (102 + pMix * 48) * weave;
            g = (56 + pMix * 32) * weave;
            b = (196 + pMix * 52) * weave;
          } else {
            r = (26 + micro * 16) * weave;
            g = (24 + micro * 16) * weave;
            b = (38 + micro * 24) * weave;
          }
          rough = 166;
        } else if (skinId === 'hedge_maze') {
          const band = Math.sin(((u * 3.5 - v * 2.5) + (seed % 11) * 0.1) * Math.PI);
          if (band > 0.62) {
            // Crisp chalk-white sport stripes
            r = (224 + micro * 22) * weave;
            g = (232 + micro * 18) * weave;
            b = (226 + micro * 20) * weave;
          } else if (band < -0.45) {
            // Deep forest dark green accent
            r = (20 + micro * 16) * weave;
            g = (72 + micro * 28) * weave;
            b = (44 + micro * 18) * weave;
          } else {
            // Vivid emerald athletic green
            r = (34 + micro * 22) * weave;
            g = (176 + micro * 42) * weave;
            b = (92 + micro * 28) * weave;
          }
          rough = 170;
        } else if (skinId === 'slingshot') {
          const split = v + (KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 3, 2) - 0.5) * 0.12;
          if (split < 0.62) {
            r = (208 + micro * 34) * weave;
            g = (38 + micro * 20) * weave;
            b = (44 + micro * 20) * weave;
          } else if (split < 0.72) {
            r = (28 + micro * 14) * weave;
            g = (26 + micro * 14) * weave;
            b = (30 + micro * 14) * weave;
          } else {
            r = (218 + micro * 24) * weave;
            g = (204 + micro * 22) * weave;
            b = (182 + micro * 22) * weave;
          }
          rough = 175;
        } else if (skinId === 'crimson_kimono') {
          const shift = (KS.hash2D(seed, 9, 41) - 0.5) * 0.55;
          const diamond = Math.abs(Math.sin((u * 12 + v * 12) * Math.PI)) * Math.abs(Math.sin((u * 12 - v * 12) * Math.PI));
          const redZone = (u * 0.7 + v * 0.4 + shift + (micro - 0.5) * 0.25) > 0.42;
          if (redZone) {
            r = (168 + diamond * 78) * weave;
            g = (20 + diamond * 24) * weave;
            b = (28 + diamond * 26) * weave;
          } else {
            r = (30 + diamond * 26) * weave;
            g = (32 + diamond * 26) * weave;
            b = (38 + diamond * 30) * weave;
          }
          rough = 176;
        } else if (skinId === 'emerald_web') {
          r = (20 + micro * 22) * weave;
          g = (142 + micro * 48) * weave;
          b = (72 + micro * 26) * weave;
          rough = 165;
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.05 + (v - 0.5) * 0.32 - (1 - shift) * 0.2));
          if (pos < 0.34) {
            const t = pos / 0.34;
            r = 244; g = 196 - t * 114; b = 68 + t * 98;
          } else if (pos < 0.70) {
            const t = (pos - 0.34) / 0.36;
            r = 242 - t * 112; g = 82 - t * 28; b = 166 + t * 66;
          } else {
            const t = (pos - 0.70) / 0.30;
            r = 130 - t * 44; g = 54 - t * 12; b = 232 + t * 18;
          }
          r *= (0.92 + weave * 0.08);
          g *= (0.92 + weave * 0.08);
          b *= (0.92 + weave * 0.08);
          rough = 112;
        } else if (skinId === 'leather') {
          const grain = KS.fbm2D(u * 12 + ox, v * 28 + oy, seed + 7, 3);
          const stitch = (Math.abs((v * 8) % 1 - 0.5) > 0.44 && Math.floor(u * 26) % 2 === 0);
          r = stitch ? 214 : 114 + grain * 56;
          g = stitch ? 186 : 68 + grain * 36;
          b = stitch ? 148 : 38 + grain * 24;
          rough = stitch ? 160 : 210 - grain * 30;
        } else if (skinId === 'slaughter') {
          const angle = 0.62 + (seed % 7) * 0.14;
          const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
          const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
          const zebra = Math.sin((su * 14 + Math.sin(sv * 8) * 0.9) * Math.PI) * 0.5 + 0.5;
          const diamond = Math.abs(Math.sin(su * 5) * Math.sin(sv * 5));
          const mix = Math.min(1, zebra * 0.62 + diamond * 0.5);
          r = (108 + mix * 124) * weave;
          g = (18 + mix * 42) * weave;
          b = (26 + mix * 46) * weave;
          rough = 160;
        } else if (skinId === 'cobalt_skulls') {
          const swirl = KS.fbm2D(u * 5 + ox, v * 5 + oy, seed + 23, 3);
          r = (26 + swirl * 34) * weave;
          g = (72 + swirl * 66) * weave;
          b = (168 + swirl * 78) * weave;
          rough = 188;
        } else if (skinId === 'overprint') {
          const chevron = Math.sin(((u * 10 + Math.abs(v - 0.5) * 8) + (seed % 9) * 0.2) * Math.PI);
          const sub = Math.sin((u * 20 - v * 12) * Math.PI);
          if (chevron > 0.2) {
            r = (42 + micro * 24) * weave;
            g = (214 + micro * 32) * weave;
            b = (206 + micro * 34) * weave;
          } else if (sub > 0.45) {
            r = (22 + micro * 16) * weave;
            g = (128 + micro * 28) * weave;
            b = (142 + micro * 28) * weave;
          } else {
            r = (16 + micro * 14) * weave;
            g = (44 + micro * 20) * weave;
            b = (56 + micro * 22) * weave;
          }
          rough = 182;
        }

        // Authentic CS glove wear scuffing along knuckles / edges
        if (wearFactor > 0.02 && skinId !== 'tactical_slate') {
          const scuff = KS.fbm2D(u * 13 + 2.7, v * 13 + 6.1, seed + 409, 3);
          const knuckleMask = Math.max(0, 1 - Math.abs(v - 0.25) * 2.8) * 0.5 + 0.25;
          const thresh = 0.86 - wearFactor * 0.56 - knuckleMask * wearFactor * 0.34;
          if (scuff > thresh) {
            const k = Math.min(1, (scuff - thresh) * 4.2);
            r = r * (1 - k) + 86 * k;
            g = g * (1 - k) + 84 * k;
            b = b * (1 - k) + 82 * k;
            rough = Math.min(248, rough + k * 65);
          } else {
            const fadeOut = 1 - wearFactor * 0.16;
            r *= fadeOut; g *= fadeOut; b *= fadeOut;
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(40, Math.min(250, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);

    // Extra crisp canvas overlays for Emerald Web (spiderwebs) and Cobalt Skulls (seeded frost skulls)
    if (skinId === 'emerald_web') {
      actx.save();
      actx.strokeStyle = 'rgba(10, 16, 12, 0.86)';
      actx.lineWidth = Math.max(1.2, size / 145);
      for (let i = 0; i < 3; i++) {
        const cx = (0.18 + KS.hash2D(seed, i * 19 + 5, 191) * 0.64) * size;
        const cy = (0.18 + KS.hash2D(seed, i * 31 + 9, 277) * 0.64) * size;
        const spokes = 7 + ((seed + i) % 3);
        const rot = KS.hash2D(seed, i * 43, 113) * Math.PI * 2;
        const maxR = size * 0.42;
        for (let s = 0; s < spokes; s++) {
          const ang = rot + (s / spokes) * Math.PI * 2;
          actx.beginPath();
          actx.moveTo(cx, cy);
          actx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
          actx.stroke();
        }
        for (let ring = 1; ring <= 4; ring++) {
          const rr = (ring / 4) * maxR;
          actx.beginPath();
          for (let s = 0; s <= spokes; s++) {
            const ang = rot + (s / spokes) * Math.PI * 2;
            const px = cx + Math.cos(ang) * rr;
            const py = cy + Math.sin(ang) * rr;
            if (s === 0) actx.moveTo(px, py);
            else actx.lineTo(px, py);
          }
          actx.stroke();
        }
      }
      actx.restore();
    } else if (skinId === 'cobalt_skulls') {
      actx.save();
      const count = 8;
      for (let i = 0; i < count; i++) {
        const sx = (0.12 + KS.hash2D(seed, i * 17, 311) * 0.76) * size;
        const sy = (0.12 + KS.hash2D(seed, i * 29, 419) * 0.76) * size;
        const rad = size * (0.048 + KS.hash2D(seed, i * 37, 503) * 0.025);
        const rot = (KS.hash2D(seed, i * 41, 613) - 0.5) * 0.9;
        actx.save();
        actx.translate(sx, sy);
        actx.rotate(rot);
        actx.fillStyle = 'rgba(222, 242, 255, 0.82)';
        actx.beginPath();
        actx.arc(0, -rad * 0.12, rad, 0, Math.PI * 2);
        actx.fill();
        actx.fillRect(-rad * 0.55, rad * 0.42, rad * 1.1, rad * 0.58);
        actx.fillStyle = 'rgba(14, 34, 72, 0.95)';
        actx.beginPath();
        actx.arc(-rad * 0.36, -rad * 0.08, rad * 0.24, 0, Math.PI * 2);
        actx.arc(rad * 0.36, -rad * 0.08, rad * 0.24, 0, Math.PI * 2);
        actx.fill();
        actx.restore();
      }
      actx.restore();
    }

    const result = { albedoCanvas, roughCanvas, palette };
    if (gloveCanvasCache.size > 48) {
      const firstKey = gloveCanvasCache.keys().next().value;
      gloveCanvasCache.delete(firstKey);
    }
    gloveCanvasCache.set(key, result);
    return result;
  }

  function createBladeMaterial(item, targetRenderer) {
    const { albedoCanvas, roughCanvas } = paintSkinToCanvases(item, 256);
    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

    const skinId = item.skinId || 'vanilla';
    const isMatte = skinId === 'ultraviolet' || skinId === 'crimson_web';
    const isGem = skinId === 'doppler' || skinId === 'fade' || skinId === 'marble_fade' || skinId === 'tiger_tooth';

    return new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap,
      roughness: isMatte ? 0.82 : 0.56,
      metalness: isMatte ? 0.38 : 0.94,
      clearcoat: isGem ? 0.9 : skinId === 'case_hardened' ? 0.52 : 0.2,
      clearcoatRoughness: isGem ? 0.1 : 0.24,
      envMapIntensity: isGem ? 1.55 : 1.25
    });
  }

  // ---------- Procedural Firearm PBR Skin Painter & Material ----------
  function weaponCacheKey(item) {
    const wt = (item && item.weaponType) || 'rifle';
    const sk = (item && item.skinId) || 'factory_slate';
    const sd = (item && item.patternSeed) || 0;
    const fl = Math.round(((item && item.floatValue) || 0.09) * 50);
    return `wpn_${wt}_${sk}_${sd}_${fl}`;
  }

  function paintWeaponToCanvases(weaponItem, size = 256) {
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const key = weaponCacheKey(item) + '_' + size;
    if (weaponCanvasCache.has(key)) return weaponCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = size;
    albedoCanvas.height = size;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d');

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.09));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.06) / 0.72));
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;
    const ox = KS.hash2D(seed, 17, 67) * 10;
    const oy = KS.hash2D(seed, 31, 97) * 10;

    const aImg = actx.createImageData(size, size);
    const rImg = rctx.createImageData(size, size);
    const ad = aImg.data;
    const rd = rImg.data;

    for (let py = 0; py < size; py++) {
      const v = py / (size - 1);
      for (let px = 0; px < size; px++) {
        const u = px / (size - 1);
        const idx = (py * size + px) * 4;
        const micro = KS.fbm2D(u * 20, v * 20, seed + 13, 2);
        let r = 46, g = 54, b = 64, rough = 128;

        if (skinId === 'factory_slate') {
          const brush = KS.fbm2D(u * 40, v * 8, 7, 2);
          r = 38 + brush * 18; g = 46 + brush * 20; b = 56 + brush * 24;
          if (Math.abs(v - 0.22) < 0.025) { r = 74; g = 216; b = 248; rough = 74; }
          else rough = 136;
        } else if (skinId === 'ultraviolet') {
          r = 26 + micro * 16; g = 28 + micro * 16; b = 38 + micro * 20;
          if (v > 0.76 || Math.abs(v - 0.18) < 0.03) { r = 104; g = 62; b = 228; rough = 82; }
          else rough = 152;
        } else if (skinId === 'redline') {
          const carbon = ((Math.floor(u * 38) + Math.floor(v * 38)) & 1) ? 0.86 : 1.12;
          r = (26 + micro * 12) * carbon;
          g = (28 + micro * 12) * carbon;
          b = (33 + micro * 14) * carbon;
          if (Math.abs(v - 0.50) < 0.032 || Math.abs(v - 0.20) < 0.016) {
            r = 232; g = 42; b = 46; rough = 66;
          } else {
            rough = 122;
          }
        } else if (skinId === 'damascus') {
          const w1 = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 11, 4);
          const bands = Math.sin((u * 7 + v * 5 + w1 * 5.0) * Math.PI * 2) * 0.5 + 0.5;
          const lum = 108 + bands * 114;
          r = lum * 0.96; g = lum; b = lum * 1.05;
          rough = 48 + (1 - bands) * 34;
        } else if (skinId === 'vulcan') {
          const d = (u * 1.3 + v * 0.65) % 1;
          if (d < 0.26) { r = 236; g = 244; b = 252; rough = 84; }
          else if (d < 0.42) { r = 24; g = 34; b = 48; rough = 124; }
          else if (d < 0.60) { r = 36; g = 188; b = 252; rough = 64; }
          else if (d < 0.78) { r = 34; g = 96; b = 214; rough = 88; }
          else { r = 228; g = 238; b = 246; rough = 84; }
        } else if (skinId === 'crimson_web') {
          r = 156 + micro * 38; g = 18 + micro * 12; b = 24 + micro * 14;
          rough = 92;
        } else if (skinId === 'asiimov') {
          const diag = u * 1.15 - v * 0.55;
          if (Math.abs(diag - 0.28) < 0.14 || (v > 0.76 && u < 0.55)) {
            r = 252; g = 114; b = 28; rough = 76;
          } else if (Math.abs(diag - 0.56) < 0.11 || (v < 0.18 && u > 0.45)) {
            r = 22; g = 24; b = 29; rough = 128;
          } else {
            r = 238 - micro * 12; g = 242 - micro * 12; b = 246 - micro * 10; rough = 94;
          }
        } else if (skinId === 'blaze') {
          const flameWave = KS.fbm2D(u * 5 + ox, v * 8 + oy, seed + 29, 3);
          const edge = 0.26 + flameWave * 0.44;
          if (u < edge) {
            const t = Math.max(0, Math.min(1, u / Math.max(0.01, edge)));
            if (t < 0.45) {
              const k = t / 0.45;
              r = 255; g = 216 - k * 96; b = 68 - k * 42;
            } else {
              const k = (t - 0.45) / 0.55;
              r = 252 - k * 34; g = 120 - k * 92; b = 26;
            }
            rough = 46;
          } else {
            r = 24 + micro * 16; g = 26 + micro * 16; b = 34 + micro * 20;
            rough = 58;
          }
        } else if (skinId === 'neon_rider') {
          const wave = Math.sin((u * 5.2 + v * 3.1 + (seed % 9) * 0.15) * Math.PI);
          if (wave > 0.28) {
            r = 244; g = 48; b = 188; rough = 60;
          } else if (wave < -0.28) {
            r = 32; g = 228; b = 252; rough = 58;
          } else {
            r = 38 + micro * 22; g = 24 + micro * 18; b = 88 + micro * 42; rough = 88;
          }
        } else if (skinId === 'printstream') {
          const iri = Math.sin((u * 3 + v * 2.5) * Math.PI) * 0.5 + 0.5;
          r = 234 + iri * 14; g = 236 + (1 - iri) * 14; b = 244 + iri * 10;
          if (v > 0.78 || (Math.abs(u - 0.5) < 0.04 && Math.abs(v - 0.45) < 0.16)) {
            r = 18; g = 20; b = 25; rough = 110;
          } else {
            rough = 46;
          }
        } else if (skinId === 'hyper_chroma') {
          const wx = KS.fbm2D(u * 3.6 + ox, v * 3.6 + oy, seed + 19, 3);
          const sw = Math.sin((u * 4 + v * 3 + wx * 4.5) * Math.PI) * 0.5 + 0.5;
          if (sw < 0.34) {
            const t = sw / 0.34;
            r = 22 + t * 96; g = 228 - t * 140; b = 216 + t * 34;
          } else if (sw < 0.68) {
            const t = (sw - 0.34) / 0.34;
            r = 118 + t * 128; g = 88 - t * 24; b = 250 - t * 98;
          } else {
            const t = (sw - 0.68) / 0.32;
            r = 246 - t * 224; g = 64 + t * 164; b = 152 + t * 64;
          }
          rough = 42;
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.12 - (1 - shift) * 0.22 + (v - 0.5) * 0.14));
          if (pos < 0.22) {
            const t = pos / 0.22;
            r = 200 + t * 44; g = 204 + t * 10; b = 210 - t * 70;
          } else if (pos < 0.52) {
            const t = (pos - 0.22) / 0.30;
            r = 246; g = 196 - t * 118; b = 72 + t * 102;
          } else if (pos < 0.80) {
            const t = (pos - 0.52) / 0.28;
            r = 244 - t * 112; g = 78 - t * 24; b = 178 + t * 58;
          } else {
            const t = (pos - 0.80) / 0.20;
            r = 132 - t * 38; g = 52 - t * 10; b = 236 + t * 16;
          }
          rough = 34;
        } else if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          r = ch.r; g = ch.g; b = ch.b;
          rough = ch.isBlue ? 44 : ch.isGold ? 56 : 70;
        } else if (skinId === 'dragon_gold') {
          const scale = Math.sin(u * 26 * Math.PI) * Math.sin(v * 20 * Math.PI);
          const wave = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 47, 3);
          if (wave > 0.36) {
            const sheen = 0.82 + 0.18 * (scale * 0.5 + 0.5);
            r = 246 * sheen; g = 196 * sheen; b = 64 * sheen;
            rough = 36;
          } else {
            r = 68 + wave * 92; g = 16 + wave * 18; b = 22 + wave * 18;
            rough = 84;
          }
        }

        if (wearFactor > 0.02 && skinId !== 'factory_slate') {
          const sc = KS.fbm2D(u * 14 + 1.9, v * 14 + 4.3, seed + 521, 3);
          const thresh = 0.88 - wearFactor * 0.58;
          if (sc > thresh) {
            const k = Math.min(1, (sc - thresh) * 4.5);
            r = r * (1 - k) + 92 * k;
            g = g * (1 - k) + 98 * k;
            b = b * (1 - k) + 106 * k;
            rough = Math.min(242, rough + k * 88);
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(22, Math.min(245, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);

    if (skinId === 'crimson_web') {
      actx.save();
      actx.strokeStyle = 'rgba(12, 10, 14, 0.86)';
      actx.lineWidth = Math.max(1.2, size / 155);
      for (let i = 0; i < 3; i++) {
        const cx = (0.16 + KS.hash2D(seed, i * 19 + 5, 211) * 0.68) * size;
        const cy = (0.18 + KS.hash2D(seed, i * 29 + 9, 307) * 0.64) * size;
        const spokes = 7 + ((seed + i) % 3);
        const rot = KS.hash2D(seed, i * 41, 131) * Math.PI * 2;
        const maxR = size * 0.42;
        for (let s = 0; s < spokes; s++) {
          const ang = rot + (s / spokes) * Math.PI * 2;
          actx.beginPath();
          actx.moveTo(cx, cy);
          actx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
          actx.stroke();
        }
        for (let ring = 1; ring <= 4; ring++) {
          const rr = (ring / 4) * maxR;
          actx.beginPath();
          for (let s = 0; s <= spokes; s++) {
            const ang = rot + (s / spokes) * Math.PI * 2;
            const px = cx + Math.cos(ang) * rr;
            const py = cy + Math.sin(ang) * rr;
            if (s === 0) actx.moveTo(px, py);
            else actx.lineTo(px, py);
          }
          actx.stroke();
        }
      }
      actx.restore();
    } else if (skinId === 'printstream') {
      actx.save();
      actx.strokeStyle = 'rgba(20, 24, 32, 0.72)';
      actx.lineWidth = Math.max(1.2, size / 140);
      actx.strokeRect(size * 0.08, size * 0.12, size * 0.84, size * 0.54);
      actx.fillStyle = 'rgba(20, 24, 32, 0.8)';
      actx.fillRect(size * 0.14, size * 0.22, size * 0.18, size * 0.05);
      actx.fillRect(size * 0.68, size * 0.22, size * 0.16, size * 0.05);
      actx.restore();
    }

    const result = { albedoCanvas, roughCanvas };
    if (weaponCanvasCache.size > 48) {
      const firstKey = weaponCanvasCache.keys().next().value;
      weaponCanvasCache.delete(firstKey);
    }
    weaponCanvasCache.set(key, result);
    return result;
  }

  function createWeaponMaterial(weaponItem, targetRenderer) {
    const { albedoCanvas, roughCanvas } = paintWeaponToCanvases(weaponItem, 256);
    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

    const sk = (weaponItem && weaponItem.skinId) || 'factory_slate';
    const isMetallic = sk === 'fade' || sk === 'case_hardened' || sk === 'damascus' || sk === 'dragon_gold' || sk === 'blaze';
    const isGlossy = isMetallic || sk === 'printstream' || sk === 'hyper_chroma' || sk === 'neon_rider';
    return new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap,
      roughness: isGlossy ? 0.34 : 0.62,
      metalness: isMetallic ? 0.86 : 0.34,
      clearcoat: isGlossy ? 0.68 : 0.18,
      clearcoatRoughness: 0.22,
      envMapIntensity: isMetallic ? 1.45 : 1.15
    });
  }

  // ---------- 2D Patterned Firearm Silhouette Thumbnail ----------
  function renderWeaponThumbDataUrl(weaponItem) {
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const key = weaponCacheKey(item);
    if (thumbCache.has(key)) return thumbCache.get(key);

    const W = 184, H = 96;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const { albedoCanvas } = paintWeaponToCanvases(item, 128);
    const wt = item.weaponType;

    const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 8, W * 0.5, H * 0.5, W * 0.62);
    bg.addColorStop(0, 'rgba(34, 58, 82, 0.44)');
    bg.addColorStop(1, 'rgba(7, 14, 24, 0.0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W * 0.5, H * 0.52);

    const drawClippedBody = (pathFn) => {
      ctx.save();
      ctx.beginPath();
      pathFn(ctx);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(albedoCanvas, -86, -34, 172, 68);
      const sheen = ctx.createLinearGradient(-75, -24, 75, 24);
      sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-88, -36, 176, 72);
      ctx.restore();
      ctx.beginPath();
      pathFn(ctx);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(218, 244, 255, 0.44)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    if (wt === 'awp') {
      // Dark steel barrel + muzzle brake
      ctx.fillStyle = '#1b242e';
      ctx.fillRect(14, -10, 62, 5.5);
      ctx.fillStyle = '#2d3a48';
      ctx.fillRect(72, -12, 11, 9.5);
      // Scope mount & optic tube
      ctx.fillStyle = '#161e28';
      ctx.fillRect(-16, -24, 34, 8);
      ctx.fillRect(-20, -25.5, 9, 11);
      ctx.fillRect(14, -25, 8, 10);
      ctx.fillRect(-10, -16, 4, 7);
      ctx.fillRect(8, -16, 4, 7);
      // Magazine
      ctx.fillStyle = '#18202a';
      ctx.fillRect(-6, 4, 14, 16);
      // Main chassis body
      drawClippedBody((g) => {
        g.moveTo(-78, -6);
        g.lineTo(-42, -11);
        g.lineTo(28, -10);
        g.lineTo(36, 0);
        g.lineTo(8, 5);
        g.lineTo(-22, 6);
        g.lineTo(-32, 20);
        g.lineTo(-44, 20);
        g.lineTo(-38, 6);
        g.lineTo(-78, 14);
      });
    } else if (wt === 'deagle') {
      // Slanted dark grip
      ctx.fillStyle = '#18202a';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 32);
      ctx.lineTo(-52, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,210,235,0.3)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Trigger guard
      ctx.strokeStyle = '#3c4c5c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.lineTo(8, 2);
      ctx.lineTo(2, 15);
      ctx.lineTo(-18, 15);
      ctx.stroke();
      // Heavy Desert Eagle slide & barrel shroud
      drawClippedBody((g) => {
        g.moveTo(-46, -18);
        g.lineTo(44, -18);
        g.lineTo(54, -8);
        g.lineTo(54, 1);
        g.lineTo(-42, 1);
        g.lineTo(-50, -6);
      });
    } else {
      // V-47 Rifle: barrel, gas tube, curved mag, sight
      ctx.fillStyle = '#1a232e';
      ctx.fillRect(36, -9, 44, 5.5);
      ctx.fillRect(74, -10.5, 9, 8.5);
      // Curved magazine
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.quadraticCurveTo(10, 22, 20, 32);
      ctx.lineTo(6, 34);
      ctx.quadraticCurveTo(-4, 22, -8, 5);
      ctx.closePath();
      ctx.fillStyle = '#1a232e';
      ctx.fill();
      // Pistol grip
      ctx.beginPath();
      ctx.moveTo(-26, 4);
      ctx.lineTo(-14, 4);
      ctx.lineTo(-20, 24);
      ctx.lineTo(-32, 24);
      ctx.closePath();
      ctx.fill();
      // Reflex optic
      ctx.fillStyle = '#1c2734';
      ctx.fillRect(-16, -22, 18, 8);
      ctx.fillStyle = '#65e7ff';
      ctx.fillRect(-8, -20, 3, 3);
      // Main receiver + stock + handguard
      drawClippedBody((g) => {
        g.moveTo(-78, -4);
        g.lineTo(-42, -13);
        g.lineTo(38, -13);
        g.lineTo(42, -2);
        g.lineTo(14, 5);
        g.lineTo(-42, 5);
        g.lineTo(-78, 14);
      });
    }

    ctx.restore();
    const url = c.toDataURL('image/png');
    if (thumbCache.size > 160) {
      const firstKey = thumbCache.keys().next().value;
      thumbCache.delete(firstKey);
    }
    thumbCache.set(key, url);
    return url;
  }

  // ---------- 2D Patterned Glove Pair Silhouette Thumbnail ----------
  function renderGloveThumbDataUrl(gloveItem) {
    const item = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
    const key = gloveCacheKey(item);
    if (thumbCache.has(key)) return thumbCache.get(key);

    const W = 184, H = 96;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const { albedoCanvas, palette } = paintGloveToCanvases(item, 128);
    const gt = item.gloveType;
    const accentHex = '#' + palette.cuff.toString(16).padStart(6, '0');
    const knuckleHex = '#' + palette.knuckle.toString(16).padStart(6, '0');

    const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 8, W * 0.5, H * 0.5, W * 0.62);
    bg.addColorStop(0, 'rgba(34, 56, 78, 0.44)');
    bg.addColorStop(1, 'rgba(7, 14, 24, 0.0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    function drawOneGlove(cx, cy, mirror, tilt) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(mirror, 1);

      const isFingerless = gt === 'standard' || gt === 'wraps';

      // Fingers (skin tips if fingerless/wraps, full textured if sport/specialist)
      const fingerX = [-15, -5, 5, 14];
      const fingerH = [20, 24, 21, 16];
      for (let i = 0; i < 4; i++) {
        const fx = fingerX[i];
        const fh = fingerH[i];
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(fx - 3.8, -14 - fh, 7.6, fh + 4, 3.8);
        ctx.clip();
        if (isFingerless) {
          ctx.fillStyle = '#c49072';
          ctx.fillRect(fx - 5, -14 - fh, 10, fh + 5);
          if (gt === 'standard') {
            ctx.drawImage(albedoCanvas, -30, -36, 60, 72);
            ctx.fillStyle = '#c49072';
            ctx.fillRect(fx - 5, -14 - fh, 10, fh * 0.56);
          }
        } else {
          ctx.drawImage(albedoCanvas, -30, -40, 60, 80);
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(220,245,255,0.28)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.roundRect(fx - 3.8, -14 - fh, 7.6, fh + 4, 3.8);
        ctx.stroke();
      }

      // Thumb
      ctx.save();
      ctx.translate(-21, 4);
      ctx.rotate(-0.55);
      ctx.beginPath();
      ctx.roundRect(-4.2, -16, 8.4, 20, 4);
      ctx.clip();
      if (isFingerless) {
        ctx.fillStyle = '#c49072';
        ctx.fillRect(-5, -17, 10, 22);
      } else {
        ctx.drawImage(albedoCanvas, -24, -24, 48, 48);
      }
      ctx.restore();

      // Main Palm / Backhand Body
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-20, -16, 40, 34, 7);
      ctx.clip();
      ctx.drawImage(albedoCanvas, -26, -24, 52, 52);
      if (gt === 'wraps') {
        // Diagonal overlapping wrap bandages
        ctx.strokeStyle = 'rgba(8, 12, 18, 0.58)';
        ctx.lineWidth = 2.2;
        for (let b = -28; b <= 28; b += 9) {
          ctx.beginPath();
          ctx.moveTo(b, -18);
          ctx.lineTo(b + 16, 20);
          ctx.stroke();
        }
      }
      const shade = ctx.createLinearGradient(-20, -16, 20, 22);
      shade.addColorStop(0, 'rgba(255,255,255,0.22)');
      shade.addColorStop(0.55, 'rgba(255,255,255,0.0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = shade;
      ctx.fillRect(-22, -18, 44, 40);
      ctx.restore();

      // Archetype accent details
      if (gt === 'specialist') {
        // Oversized armored knuckle plate
        ctx.fillStyle = knuckleHex;
        ctx.beginPath();
        ctx.roundRect(-19, -17, 38, 9.5, 3);
        ctx.fill();
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      } else if (gt === 'sport') {
        // Sleek molded dorsal ribs
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 1.8;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 9, -12);
          ctx.lineTo(i * 9, 8);
          ctx.stroke();
        }
      } else if (gt === 'standard') {
        ctx.fillStyle = knuckleHex;
        ctx.fillRect(-17, -15, 34, 5.5);
      }

      // Wrist cuff
      ctx.fillStyle = gt === 'wraps' ? knuckleHex : '#141d28';
      ctx.beginPath();
      ctx.roundRect(-16, 17, 32, 11, 3);
      ctx.fill();
      ctx.fillStyle = accentHex;
      ctx.fillRect(-16, 17, 32, 2.6);

      ctx.restore();
    }

    drawOneGlove(W * 0.35, H * 0.56, -1, -0.14);
    drawOneGlove(W * 0.65, H * 0.56, 1, 0.14);

    const url = c.toDataURL('image/png');
    if (thumbCache.size > 140) {
      const firstKey = thumbCache.keys().next().value;
      thumbCache.delete(firstKey);
    }
    thumbCache.set(key, url);
    return url;
  }

  // ---------- 2D Patterned Knife Silhouette Thumbnail ----------
  function renderKnifeThumbDataUrl(item) {
    if (KS.isWeaponItem(item)) return renderWeaponThumbDataUrl(item);
    if (KS.isGloveItem(item)) return renderGloveThumbDataUrl(item);
    const key = `${item.knifeType}_${skinCacheKey(item)}`;
    if (thumbCache.has(key)) return thumbCache.get(key);

    const W = 184, H = 96;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const { albedoCanvas } = paintSkinToCanvases(item, 128);

    const bg = ctx.createRadialGradient(W * 0.52, H * 0.48, 8, W * 0.52, H * 0.48, W * 0.62);
    bg.addColorStop(0, 'rgba(28, 52, 74, 0.42)');
    bg.addColorStop(1, 'rgba(7, 14, 24, 0.0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const kt = item.knifeType || 'default';
    const handleCol = item.skinId === 'ultraviolet' ? '#4f3a88' : '#1b2633';
    const trimCol = item.skinId === 'ultraviolet' ? '#8c6bff' : '#5b768d';

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);

    const drawBladeClip = (pathFn) => {
      ctx.save();
      ctx.beginPath();
      pathFn(ctx);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(albedoCanvas, -82, -40, 164, 80);
      const gloss = ctx.createLinearGradient(-70, -28, 70, 28);
      gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
      gloss.addColorStop(0.5, 'rgba(255,255,255,0.0)');
      gloss.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = gloss;
      ctx.fillRect(-85, -42, 170, 84);
      ctx.restore();
      ctx.beginPath();
      pathFn(ctx);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(220,245,255,0.42)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    if (kt === 'karambit') {
      drawBladeClip((g) => {
        g.moveTo(0, -18);
        g.quadraticCurveTo(46, -24, 68, 28);
        g.quadraticCurveTo(38, 6, 4, -2);
      });
      ctx.beginPath();
      ctx.moveTo(-50, -6);
      ctx.quadraticCurveTo(-24, -20, 2, -18);
      ctx.lineTo(4, -2);
      ctx.quadraticCurveTo(-8, 5, -18, 0);
      ctx.quadraticCurveTo(-28, 6, -38, 2);
      ctx.quadraticCurveTo(-46, 7, -52, 4);
      ctx.closePath();
      ctx.fillStyle = handleCol;
      ctx.fill();
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-59, 0, 10.5, 0, Math.PI * 2);
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = trimCol;
      ctx.stroke();
    } else if (kt === 'butterfly') {
      drawBladeClip((g) => {
        g.moveTo(-4, -9);
        g.lineTo(14, -12);
        g.quadraticCurveTo(46, -12, 74, -2);
        g.quadraticCurveTo(54, 9, -4, 7);
      });
      const drawBaliHandle = (dy, rot) => {
        ctx.save();
        ctx.translate(-6, dy);
        ctx.rotate(rot);
        ctx.fillStyle = handleCol;
        ctx.beginPath();
        ctx.roundRect(-62, -4.5, 62, 9, 3);
        ctx.fill();
        ctx.strokeStyle = trimCol;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#08121c';
        for (const hx of [-18, -34, -50]) {
          ctx.beginPath();
          ctx.ellipse(hx, 0, 5.5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      drawBaliHandle(-5, -0.14);
      drawBaliHandle(5, 0.14);
    } else if (kt === 'm9') {
      drawBladeClip((g) => {
        g.moveTo(-12, -13);
        g.lineTo(44, -13);
        g.lineTo(74, -2);
        g.lineTo(58, 12);
        g.lineTo(-12, 11);
      });
      ctx.fillStyle = '#09131d';
      ctx.beginPath();
      ctx.ellipse(44, -2, 4.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = trimCol;
      ctx.fillRect(-18, -19, 7, 38);
      ctx.fillStyle = handleCol;
      ctx.fillRect(-66, -9, 48, 18);
      ctx.strokeStyle = trimCol;
      ctx.strokeRect(-66, -9, 48, 18);
    } else if (kt === 'skeleton') {
      drawBladeClip((g) => {
        g.moveTo(-70, 0);
        g.lineTo(-54, -8);
        g.lineTo(-14, -9);
        g.quadraticCurveTo(2, -15, 26, -13);
        g.quadraticCurveTo(56, -11, 76, 0);
        g.quadraticCurveTo(52, 14, 18, 14);
        g.quadraticCurveTo(0, 14, -14, 9);
        g.lineTo(-54, 8);
      });
      ctx.fillStyle = '#09131d';
      ctx.beginPath();
      ctx.arc(-4, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = '#181f27';
      ctx.lineWidth = 4.2;
      for (let i = 0; i < 5; i++) {
        const x0 = -50 + i * 7.2;
        ctx.beginPath();
        ctx.moveTo(x0 - 2, -8);
        ctx.lineTo(x0 + 5, 8);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      drawBladeClip((g) => {
        g.moveTo(-12, -9);
        g.lineTo(50, -9);
        g.lineTo(72, 1);
        g.lineTo(54, 10);
        g.lineTo(-12, 9);
      });
      ctx.fillStyle = trimCol;
      ctx.fillRect(-17, -14, 6, 28);
      ctx.fillStyle = handleCol;
      ctx.fillRect(-64, -8, 47, 16);
      ctx.strokeStyle = trimCol;
      ctx.strokeRect(-64, -8, 47, 16);
    }

    ctx.restore();
    const url = c.toDataURL('image/png');
    if (thumbCache.size > 140) {
      const firstKey = thumbCache.keys().next().value;
      thumbCache.delete(firstKey);
    }
    thumbCache.set(key, url);
    return url;
  }

  // ---------- Normalize Geometry UVs to a target bounding box [0..1] ----------
  function normalizeGeometryUVs(geo, customBounds) {
    geo.computeBoundingBox();
    const bb = customBounds || geo.boundingBox;
    const sx = Math.max(1e-5, bb.max.x - bb.min.x);
    const sy = Math.max(1e-5, bb.max.y - bb.min.y);
    const pos = geo.attributes.position;
    let uv = geo.attributes.uv;
    if (!uv) {
      uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
      geo.setAttribute('uv', uv);
    }
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - bb.min.x) / sx;
      const v = (pos.getY(i) - bb.min.y) / sy;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
    return geo;
  }

  // ---------- True Sharpened Bevel Blade Loft Geometry Builder ----------
  function buildSharpenedBladeGeometry(stations, uvBounds) {
    const positions = [];
    const normals = [];
    const uvs = [];

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const fn = new THREE.Vector3();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (uvBounds) {
      minX = uvBounds.min.x; maxX = uvBounds.max.x;
      minY = uvBounds.min.y; maxY = uvBounds.max.y;
    } else {
      for (const s of stations) {
        for (const p of [s.spine, s.ridge, s.edge]) {
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        }
      }
    }
    const spanX = Math.max(1e-5, maxX - minX);
    const spanY = Math.max(1e-5, maxY - minY);

    function pushTri(ax, ay, az, bx, by, bz, cx, cy, cz) {
      vA.set(ax, ay, az);
      vB.set(bx, by, bz);
      vC.set(cx, cy, cz);
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      fn.crossVectors(e1, e2);
      const len = fn.length();
      if (len < 1e-10) return;
      fn.divideScalar(len);
      positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      normals.push(fn.x, fn.y, fn.z, fn.x, fn.y, fn.z, fn.x, fn.y, fn.z);
      uvs.push(
        (ax - minX) / spanX, (ay - minY) / spanY,
        (bx - minX) / spanX, (by - minY) / spanY,
        (cx - minX) / spanX, (cy - minY) / spanY
      );
    }

    function pushQuad(a, b, c, d) {
      pushTri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      pushTri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    }

    for (let i = 0; i < stations.length - 1; i++) {
      const s0 = stations[i];
      const s1 = stations[i + 1];

      const sp0P = [s0.spine[0], s0.spine[1], s0.spineT];
      const sp0N = [s0.spine[0], s0.spine[1], -s0.spineT];
      const rg0P = [s0.ridge[0], s0.ridge[1], s0.ridgeT];
      const rg0N = [s0.ridge[0], s0.ridge[1], -s0.ridgeT];
      const ed0 = [s0.edge[0], s0.edge[1], 0];

      const sp1P = [s1.spine[0], s1.spine[1], s1.spineT];
      const sp1N = [s1.spine[0], s1.spine[1], -s1.spineT];
      const rg1P = [s1.ridge[0], s1.ridge[1], s1.ridgeT];
      const rg1N = [s1.ridge[0], s1.ridge[1], -s1.ridgeT];
      const ed1 = [s1.edge[0], s1.edge[1], 0];

      pushQuad(sp0P, rg0P, rg1P, sp1P);
      pushQuad(rg0P, ed0, ed1, rg1P);
      pushQuad(sp0N, sp1N, rg1N, rg0N);
      pushQuad(rg0N, rg1N, ed1, ed0);
      pushQuad(sp0N, sp0P, sp1P, sp1N);
    }

    const h = stations[0];
    pushTri(h.spine[0], h.spine[1], h.spineT, h.spine[0], h.spine[1], -h.spineT, h.ridge[0], h.ridge[1], -h.ridgeT);
    pushTri(h.spine[0], h.spine[1], h.spineT, h.ridge[0], h.ridge[1], -h.ridgeT, h.ridge[0], h.ridge[1], h.ridgeT);
    pushTri(h.ridge[0], h.ridge[1], h.ridgeT, h.ridge[0], h.ridge[1], -h.ridgeT, h.edge[0], h.edge[1], 0);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  // ---------- 5 Authentic 3D Knife Models ----------
  function buildKnifeModel(item, targetRenderer) {
    const group = new THREE.Group();
    const kt = (item && item.knifeType) || 'default';
    const bladeMat = createBladeMaterial(item || KS.createStarterKnife(), targetRenderer);
    const isUV = item && item.skinId === 'ultraviolet';

    const gripMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x3b2c68 : 0x171e26,
      roughness: 0.78,
      metalness: 0.14
    });
    const tapeMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x2c204d : 0x16191e,
      roughness: 0.92,
      metalness: 0.05
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x574199 : 0x2c3641,
      roughness: 0.36,
      metalness: 0.88
    });
    const accentSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x8e6fff : 0x7a90a4,
      roughness: 0.24,
      metalness: 0.92
    });
    const recessedMat = new THREE.MeshStandardMaterial({
      color: 0x0d141c,
      roughness: 0.65,
      metalness: 0.55
    });

    if (kt === 'karambit') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0052, 14, 32), darkSteelMat);
      group.add(ring);

      const ringCollar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.009), darkSteelMat);
      ringCollar.position.set(0.022, 0.003, 0);
      group.add(ringCollar);

      const handleShape = new THREE.Shape();
      handleShape.moveTo(0.018, 0.009);
      handleShape.quadraticCurveTo(0.068, 0.028, 0.118, 0.017);
      handleShape.lineTo(0.114, -0.013);
      handleShape.quadraticCurveTo(0.098, -0.022, 0.088, -0.010);
      handleShape.quadraticCurveTo(0.072, -0.021, 0.060, -0.009);
      handleShape.quadraticCurveTo(0.044, -0.019, 0.032, -0.007);
      handleShape.lineTo(0.019, -0.007);
      handleShape.closePath();

      const tangGeo = new THREE.ExtrudeGeometry(handleShape, { depth: 0.007, bevelEnabled: false });
      tangGeo.translate(0, 0, -0.0035);
      group.add(new THREE.Mesh(tangGeo, darkSteelMat));

      const scaleGeo = new THREE.ExtrudeGeometry(handleShape, {
        depth: 0.015,
        bevelEnabled: true,
        bevelThickness: 0.0035,
        bevelSize: 0.0025,
        bevelSegments: 2
      });
      scaleGeo.translate(0, 0, -0.0075);
      const scaleMesh = new THREE.Mesh(scaleGeo, gripMat);
      scaleMesh.scale.set(0.95, 0.90, 1.0);
      scaleMesh.position.set(0.003, 0.0005, 0);
      group.add(scaleMesh);

      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.022), darkSteelMat);
      bolster.position.set(0.116, 0.002, 0);
      bolster.rotation.z = -0.18;
      group.add(bolster);

      for (const [px, py] of [[0.042, 0.005], [0.072, 0.008], [0.100, 0.004]]) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.023, 12), accentSteelMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(px, py, 0);
        group.add(pin);
      }

      const stations = [];
      const cx = 0.098, cy = -0.106;
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ang = THREE.MathUtils.lerp(1.42, -0.18, t);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rOuter = THREE.MathUtils.lerp(0.128, 0.136, Math.sin(t * Math.PI * 0.7)) - t * t * 0.004;
        const width = 0.034 * Math.pow(1 - t, 0.72);
        const rInner = rOuter - width;
        const rRidge = rOuter - width * 0.34;
        const thick = 0.0046 * (1 - t * 0.85);
        if (i === N) {
          const tipX = cx + ca * rOuter;
          const tipY = cy + sa * rOuter;
          stations.push({ spine: [tipX, tipY], ridge: [tipX, tipY], edge: [tipX, tipY], spineT: 0, ridgeT: 0 });
        } else {
          stations.push({
            spine: [cx + ca * rOuter, cy + sa * rOuter],
            ridge: [cx + ca * rRidge, cy + sa * rRidge],
            edge: [cx + ca * rInner, cy + sa * rInner],
            spineT: thick * 0.78,
            ridgeT: thick
          });
        }
      }
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations), bladeMat));
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'skeleton') {
      const unifiedBounds = {
        min: new THREE.Vector3(-0.155, -0.028, -0.01),
        max: new THREE.Vector3(0.186, 0.028, 0.01)
      };

      const tangShape = new THREE.Shape();
      tangShape.moveTo(-0.152, 0.0);
      tangShape.lineTo(-0.124, 0.014);
      tangShape.lineTo(-0.030, 0.016);
      tangShape.quadraticCurveTo(-0.018, 0.025, 0.0, 0.025);
      tangShape.quadraticCurveTo(0.018, 0.025, 0.030, 0.018);
      tangShape.lineTo(0.030, -0.018);
      tangShape.quadraticCurveTo(0.018, -0.025, 0.0, -0.025);
      tangShape.quadraticCurveTo(-0.018, -0.025, -0.030, -0.016);
      tangShape.lineTo(-0.124, -0.014);
      tangShape.closePath();

      const centerHole = new THREE.Path();
      centerHole.absarc(0, 0, 0.0155, 0, Math.PI * 2, false);
      tangShape.holes.push(centerHole);

      const rearSlot = new THREE.Path();
      rearSlot.moveTo(-0.114, -0.005);
      rearSlot.lineTo(-0.044, -0.005);
      rearSlot.lineTo(-0.044, 0.005);
      rearSlot.lineTo(-0.114, 0.005);
      rearSlot.closePath();
      tangShape.holes.push(rearSlot);

      const tangGeo = new THREE.ExtrudeGeometry(tangShape, {
        depth: 0.0058,
        bevelEnabled: true,
        bevelThickness: 0.0018,
        bevelSize: 0.0014,
        bevelSegments: 2
      });
      tangGeo.translate(0, 0, -0.0029);
      normalizeGeometryUVs(tangGeo, unifiedBounds);
      tangGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tangGeo, bladeMat));

      const stations = [
        { spine: [0.026, 0.018], ridge: [0.026, 0.006], edge: [0.026, -0.018], spineT: 0.0036, ridgeT: 0.0044 },
        { spine: [0.048, 0.021], ridge: [0.048, 0.008], edge: [0.048, -0.023], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.078, 0.022], ridge: [0.078, 0.009], edge: [0.078, -0.025], spineT: 0.0034, ridgeT: 0.0043 },
        { spine: [0.112, 0.020], ridge: [0.112, 0.008], edge: [0.112, -0.023], spineT: 0.0030, ridgeT: 0.0038 },
        { spine: [0.144, 0.014], ridge: [0.144, 0.005], edge: [0.144, -0.016], spineT: 0.0022, ridgeT: 0.0028 },
        { spine: [0.168, 0.007], ridge: [0.168, 0.002], edge: [0.168, -0.007], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.185, 0.001], ridge: [0.185, 0.001], edge: [0.185, 0.001], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations, unifiedBounds), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.0042, 0.0092), recessedMat);
      fuller.position.set(0.086, 0.013, 0);
      fuller.rotation.z = -0.04;
      group.add(fuller);

      for (let i = 0; i < 7; i++) {
        const tx = -0.106 + i * 0.0115;
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.033, 0.0126), tapeMat);
        wrap.position.set(tx, 0, 0);
        wrap.rotation.z = (i % 2 === 0 ? 0.24 : -0.18);
        group.add(wrap);
      }
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'butterfly') {
      function buildUChannelHandle(isBite) {
        const hGroup = new THREE.Group();
        const sign = isBite ? -1 : 1;

        const sideShape = new THREE.Shape();
        sideShape.moveTo(0.0, -0.0075 * sign);
        sideShape.quadraticCurveTo(-0.068, -0.0105 * sign, -0.132, -0.0055 * sign);
        sideShape.quadraticCurveTo(-0.138, 0.0, -0.132, 0.0075 * sign);
        sideShape.quadraticCurveTo(-0.068, 0.0045 * sign, 0.0, 0.0075 * sign);
        sideShape.quadraticCurveTo(0.008, 0.0, 0.0, -0.0075 * sign);
        sideShape.closePath();

        for (const hx of [-0.032, -0.068, -0.104]) {
          const cut = new THREE.Path();
          cut.absellipse(hx, -0.0005 * sign, 0.0125, 0.0036, 0, Math.PI * 2, false, 0);
          sideShape.holes.push(cut);
        }

        const slabGeo = new THREE.ExtrudeGeometry(sideShape, {
          depth: 0.0032,
          bevelEnabled: true,
          bevelThickness: 0.0009,
          bevelSize: 0.0007,
          bevelSegments: 1
        });
        const frontSlab = new THREE.Mesh(slabGeo, gripMat);
        frontSlab.position.set(0, 0, 0.0052);
        hGroup.add(frontSlab);

        const backSlab = new THREE.Mesh(slabGeo, gripMat);
        backSlab.position.set(0, 0, -0.0084);
        hGroup.add(backSlab);

        const spacer = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.0036, 0.0108), darkSteelMat);
        spacer.position.set(-0.068, -0.0068 * sign, 0);
        hGroup.add(spacer);

        const frontBolster = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0185, 14), darkSteelMat);
        frontBolster.rotation.x = Math.PI / 2;
        hGroup.add(frontBolster);

        const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0205, 12), accentSteelMat);
        pivotPin.rotation.x = Math.PI / 2;
        hGroup.add(pivotPin);

        const buttSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.013, 0.011), accentSteelMat);
        buttSpacer.position.set(-0.128, 0, 0);
        hGroup.add(buttSpacer);

        if (isBite) {
          const latch = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.007), accentSteelMat);
          latch.position.set(-0.141, 0.002, 0);
          latch.rotation.z = 0.25;
          hGroup.add(latch);
        }

        return hGroup;
      }

      const safeHandleGroup = new THREE.Group();
      const safeVisual = buildUChannelHandle(false);
      safeVisual.position.set(0.068, 0.0095, 0);
      safeHandleGroup.add(safeVisual);
      group.add(safeHandleGroup);

      const bladePivot = new THREE.Group();
      bladePivot.position.set(0.068, 0.0095, 0);
      safeHandleGroup.add(bladePivot);

      const tangBlock = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.026, 0.0072), darkSteelMat);
      tangBlock.position.set(0.003, -0.0095, 0);
      bladePivot.add(tangBlock);

      const bladeStations = [
        { spine: [0.008, 0.008], ridge: [0.008, -0.003], edge: [0.008, -0.020], spineT: 0.0032, ridgeT: 0.0039 },
        { spine: [0.028, 0.013], ridge: [0.028, -0.001], edge: [0.028, -0.018], spineT: 0.0032, ridgeT: 0.0039 },
        { spine: [0.056, 0.009], ridge: [0.056, -0.003], edge: [0.056, -0.021], spineT: 0.0030, ridgeT: 0.0037 },
        { spine: [0.092, 0.010], ridge: [0.092, -0.002], edge: [0.092, -0.023], spineT: 0.0028, ridgeT: 0.0034 },
        { spine: [0.126, 0.006], ridge: [0.126, -0.004], edge: [0.126, -0.019], spineT: 0.0021, ridgeT: 0.0027 },
        { spine: [0.150, -0.001], ridge: [0.150, -0.006], edge: [0.150, -0.012], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.168, -0.005], ridge: [0.168, -0.005], edge: [0.168, -0.005], spineT: 0.0, ridgeT: 0.0 }
      ];
      bladePivot.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.0052, 0.0082), recessedMat);
      fuller.position.set(0.068, 0.0015, 0);
      bladePivot.add(fuller);

      const biteHandlePivot = new THREE.Group();
      biteHandlePivot.position.set(0, -0.019, 0);
      biteHandlePivot.add(buildUChannelHandle(true));
      bladePivot.add(biteHandlePivot);

      group.userData.safeHandleGroup = safeHandleGroup;
      group.userData.bladePivot = bladePivot;
      group.userData.biteHandlePivot = biteHandlePivot;

    } else if (kt === 'm9') {
      const bladeStations = [
        { spine: [0.076, 0.026], ridge: [0.076, 0.005], edge: [0.076, -0.024], spineT: 0.0042, ridgeT: 0.0050 },
        { spine: [0.130, 0.026], ridge: [0.130, 0.005], edge: [0.130, -0.024], spineT: 0.0042, ridgeT: 0.0050 },
        { spine: [0.195, 0.026], ridge: [0.195, 0.006], edge: [0.195, -0.024], spineT: 0.0038, ridgeT: 0.0046 },
        { spine: [0.228, 0.025], ridge: [0.228, 0.007], edge: [0.228, -0.022], spineT: 0.0032, ridgeT: 0.0040 },
        { spine: [0.262, 0.015], ridge: [0.262, 0.005], edge: [0.262, -0.014], spineT: 0.0020, ridgeT: 0.0026 },
        { spine: [0.296, 0.003], ridge: [0.296, 0.003], edge: [0.296, 0.003], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const toothGeo = new THREE.ConeGeometry(0.0052, 0.010, 4);
      for (let i = 0; i < 8; i++) {
        const tooth = new THREE.Mesh(toothGeo, bladeMat);
        tooth.position.set(0.094 + i * 0.0165, 0.0285, 0);
        tooth.rotation.z = -0.32;
        tooth.scale.set(1.0, 1.0, 0.55);
        group.add(tooth);
      }

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.0085, 0.0105), recessedMat);
      fuller.position.set(0.148, 0.012, 0);
      group.add(fuller);

      const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0108, 12), recessedMat);
      eyeRing.rotation.x = Math.PI / 2;
      eyeRing.scale.set(1.6, 0.72, 1);
      eyeRing.position.set(0.228, -0.001, 0);
      group.add(eyeRing);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.086, 0.026), darkSteelMat);
      guard.position.set(0.070, 0.004, 0);
      group.add(guard);

      const barrelRing = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0036, 10, 22), darkSteelMat);
      barrelRing.rotation.y = Math.PI / 2;
      barrelRing.position.set(0.070, 0.048, 0);
      group.add(barrelRing);

      const gripCore = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0175, 0.134, 16), gripMat);
      gripCore.rotation.z = Math.PI / 2;
      group.add(gripCore);
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.0176, 0.0026, 8, 18), darkSteelMat);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(-0.048 + i * 0.019, 0, 0);
        group.add(rib);
      }

      const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0185, 0.020, 8), darkSteelMat);
      pommel.rotation.z = Math.PI / 2;
      pommel.position.set(-0.075, 0, 0);
      group.add(pommel);

    } else {
      const bladeStations = [
        { spine: [0.068, 0.018], ridge: [0.068, 0.005], edge: [0.068, -0.017], spineT: 0.0035, ridgeT: 0.0043 },
        { spine: [0.115, 0.020], ridge: [0.115, 0.006], edge: [0.115, -0.018], spineT: 0.0035, ridgeT: 0.0043 },
        { spine: [0.175, 0.019], ridge: [0.175, 0.006], edge: [0.175, -0.017], spineT: 0.0030, ridgeT: 0.0038 },
        { spine: [0.222, 0.012], ridge: [0.222, 0.004], edge: [0.222, -0.011], spineT: 0.0019, ridgeT: 0.0025 },
        { spine: [0.258, 0.001], ridge: [0.258, 0.001], edge: [0.258, 0.001], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.0045, 0.0088), recessedMat);
      fuller.position.set(0.132, 0.011, 0);
      group.add(fuller);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.056, 0.024), darkSteelMat);
      guard.position.set(0.064, -0.002, 0);
      guard.rotation.z = -0.08;
      group.add(guard);

      const hShape = new THREE.Shape();
      hShape.moveTo(-0.064, 0.013);
      hShape.quadraticCurveTo(0.0, 0.019, 0.060, 0.015);
      hShape.lineTo(0.060, -0.015);
      hShape.quadraticCurveTo(0.025, -0.019, -0.005, -0.015);
      hShape.quadraticCurveTo(-0.036, -0.012, -0.064, -0.016);
      hShape.closePath();
      const hGeo = new THREE.ExtrudeGeometry(hShape, {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.003,
        bevelSegments: 2
      });
      hGeo.translate(0, 0, -0.008);
      group.add(new THREE.Mesh(hGeo, gripMat));

      for (const rx of [-0.036, -0.012, 0.014, 0.038]) {
        const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.026, 0.025), darkSteelMat);
        inlay.position.set(rx, 0, 0);
        group.add(inlay);
      }

      const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.022), accentSteelMat);
      pommel.position.set(-0.070, -0.001, 0);
      group.add(pommel);
    }

    group.userData.knifeType = kt;
    return group;
  }

  function disposeGroupResources(grp) {
    if (!grp) return;
    const mats = new Set();
    const texs = new Set();
    grp.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) {
          mats.add(m);
          if (m.map) texs.add(m.map);
          if (m.roughnessMap) texs.add(m.roughnessMap);
        }
      }
    });
    texs.forEach((t) => t.dispose());
    mats.forEach((m) => m.dispose());
  }

  // ---------- 4-Archetype Sculpted Articulated First-Person Hands Rig ----------
  // Supports live switching between Standard, Sport, Specialist, and Hand Wraps
  // with procedural PBR textures and zero geometry rebuilds.
  function buildHandsRig() {
    const rootRig = new THREE.Group();

    const gloveMaterials = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xc29072,
        roughness: 0.72,
        metalness: 0.02
      }),
      gloveBase: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.14
      }),
      palmLeather: new THREE.MeshStandardMaterial({
        color: 0x121820,
        roughness: 0.88,
        metalness: 0.08
      }),
      knuckleCarbon: new THREE.MeshStandardMaterial({
        color: 0x2b3a4a,
        roughness: 0.34,
        metalness: 0.65
      }),
      cuffTrim: new THREE.MeshStandardMaterial({
        color: 0x45c8e6,
        emissive: 0x0b4b5c,
        emissiveIntensity: 0.45,
        roughness: 0.38,
        metalness: 0.45
      }),
      sleeve: new THREE.MeshStandardMaterial({
        color: 0x0f161f,
        roughness: 0.88,
        metalness: 0.1
      })
    };

    const archetypeGroups = {
      standard: [],
      sport: [],
      specialist: [],
      wraps: []
    };
    const fingerProxMeshes = [];
    const fingerMidMeshes = [];
    const fingerDistMeshes = [];
    const thumbProxMeshes = [];
    const thumbMidMeshes = [];
    const thumbDistMeshes = [];
    const fingerHemMeshes = [];
    const palmBaseMeshes = [];
    const palmPadMeshes = [];

    function createArticulatedHand(side) {
      const handGroup = new THREE.Group();

      // 1) Tapered athletic forearm sleeve
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.056, 0.48, 16), gloveMaterials.sleeve);
      forearm.rotation.x = Math.PI / 2;
      forearm.scale.set(1.08, 1.0, 0.86);
      forearm.position.set(side * 0.008, -0.012, 0.31);
      handGroup.add(forearm);

      // 2) Core beveled anatomically tapered palm (UV normalized for clean pattern mapping)
      const palmShape = new THREE.Shape();
      palmShape.moveTo(-0.031, -0.042);
      palmShape.lineTo(0.031, -0.042);
      palmShape.quadraticCurveTo(0.040, -0.005, 0.037, 0.044);
      palmShape.quadraticCurveTo(0.0, 0.050, -0.038, 0.044);
      palmShape.quadraticCurveTo(-0.040, -0.005, -0.031, -0.042);
      palmShape.closePath();

      const palmGeo = new THREE.ExtrudeGeometry(palmShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.0055,
        bevelSize: 0.0045,
        bevelSegments: 2
      });
      normalizeGeometryUVs(palmGeo);
      palmGeo.rotateX(-Math.PI / 2);
      palmGeo.translate(0, -0.010, 0.0);
      const palmMesh = new THREE.Mesh(palmGeo, gloveMaterials.gloveBase);
      handGroup.add(palmMesh);
      palmBaseMeshes.push(palmMesh);

      const dorsalArch = new THREE.Mesh(new THREE.SphereGeometry(0.040, 14, 12), gloveMaterials.gloveBase);
      dorsalArch.scale.set(0.95, 0.36, 1.15);
      dorsalArch.position.set(0, 0.008, -0.002);
      handGroup.add(dorsalArch);
      palmBaseMeshes.push(dorsalArch);

      const wristBridge = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), gloveMaterials.gloveBase);
      wristBridge.scale.set(0.98, 0.62, 1.05);
      wristBridge.position.set(side * 0.003, -0.003, 0.038);
      handGroup.add(wristBridge);
      palmBaseMeshes.push(wristBridge);

      // Palm grip pad + thenar / hypothenar muscle pads
      const palmPad = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.008, 0.062), gloveMaterials.palmLeather);
      palmPad.position.set(0, -0.012, -0.008);
      handGroup.add(palmPad);
      palmPadMeshes.push(palmPad);

      const thenar = new THREE.Mesh(new THREE.SphereGeometry(0.020, 12, 10), gloveMaterials.palmLeather);
      thenar.scale.set(1.05, 0.68, 1.45);
      thenar.position.set(-side * 0.024, -0.012, 0.006);
      handGroup.add(thenar);
      palmPadMeshes.push(thenar);

      const hypothenar = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), gloveMaterials.palmLeather);
      hypothenar.scale.set(0.85, 0.65, 1.6);
      hypothenar.position.set(side * 0.027, -0.010, 0.012);
      handGroup.add(hypothenar);
      palmPadMeshes.push(hypothenar);

      // ============================================================
      // ARCHETYPE LAYER 1: STANDARD (Fingerless Tactical)
      // ============================================================
      const stdGrp = new THREE.Group();
      const stdCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.043, 0.058, 16), gloveMaterials.gloveBase);
      stdCuff.rotation.x = Math.PI / 2;
      stdCuff.scale.set(1.12, 1.0, 0.82);
      stdCuff.position.set(side * 0.004, -0.006, 0.072);
      stdGrp.add(stdCuff);

      const stdStrap = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.014, 0.022), gloveMaterials.knuckleCarbon);
      stdStrap.position.set(0, 0.022, 0.068);
      stdGrp.add(stdStrap);

      const stdPiping = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.007, 16), gloveMaterials.cuffTrim);
      stdPiping.rotation.x = Math.PI / 2;
      stdPiping.scale.set(1.13, 1.0, 0.84);
      stdPiping.position.set(side * 0.004, -0.006, 0.048);
      stdGrp.add(stdPiping);

      const stdKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.009, 0.022), gloveMaterials.knuckleCarbon);
      stdKnuckle.position.set(0, 0.012, -0.036);
      stdGrp.add(stdKnuckle);

      handGroup.add(stdGrp);
      archetypeGroups.standard.push(stdGrp);

      // ============================================================
      // ARCHETYPE LAYER 2: SPORT GLOVES (Sleek Athletic Full-Finger)
      // ============================================================
      const sportGrp = new THREE.Group();
      const sportCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.044, 0.064, 16), gloveMaterials.gloveBase);
      sportCuff.rotation.x = Math.PI / 2;
      sportCuff.scale.set(1.10, 1.0, 0.84);
      sportCuff.position.set(side * 0.004, -0.006, 0.072);
      sportGrp.add(sportCuff);

      // Angled racing stripe cuff collar & logo tab
      const sportBand = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.013, 16), gloveMaterials.cuffTrim);
      sportBand.rotation.x = Math.PI / 2;
      sportBand.scale.set(1.11, 1.0, 0.86);
      sportBand.position.set(side * 0.004, -0.005, 0.052);
      sportGrp.add(sportBand);

      const sportTab = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.008, 0.022), gloveMaterials.knuckleCarbon);
      sportTab.position.set(0, 0.024, 0.074);
      sportGrp.add(sportTab);

      // Molded sleek neoprene dorsal rib rails running across back of hand
      for (const rx of [-0.026, -0.009, 0.009, 0.026]) {
        const rib = new THREE.Mesh(new THREE.CapsuleGeometry(0.0036, 0.048, 4, 8), gloveMaterials.knuckleCarbon);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(rx * side, 0.0185, -0.006);
        sportGrp.add(rib);
      }
      // Subtle contoured athletic knuckle crest
      const sportCrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.056, 5, 10), gloveMaterials.cuffTrim);
      sportCrest.rotation.z = Math.PI / 2;
      sportCrest.scale.set(1.0, 0.72, 1.0);
      sportCrest.position.set(0, 0.016, -0.036);
      sportGrp.add(sportCrest);

      sportGrp.visible = false;
      handGroup.add(sportGrp);
      archetypeGroups.sport.push(sportGrp);

      // ============================================================
      // ARCHETYPE LAYER 3: SPECIALIST GLOVES (Heavy Armored Tactical)
      // ============================================================
      const specGrp = new THREE.Group();
      const specGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.047, 0.078, 16), gloveMaterials.gloveBase);
      specGauntlet.rotation.x = Math.PI / 2;
      specGauntlet.scale.set(1.14, 1.0, 0.86);
      specGauntlet.position.set(side * 0.004, -0.006, 0.078);
      specGrp.add(specGauntlet);

      // Dual tactical buckle straps on wrist
      for (const sz of [0.056, 0.088]) {
        const sBand = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.016, 0.016), gloveMaterials.knuckleCarbon);
        sBand.position.set(0, 0.021, sz);
        specGrp.add(sBand);
      }
      const specTrim = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.007, 0.012), gloveMaterials.cuffTrim);
      specTrim.position.set(0, 0.028, 0.072);
      specGrp.add(specTrim);

      // Oversized beveled armored knuckle shield
      const armorMain = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.016, 0.028), gloveMaterials.knuckleCarbon);
      armorMain.position.set(0, 0.017, -0.037);
      specGrp.add(armorMain);

      const armorRidge = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.006, 0.010), gloveMaterials.cuffTrim);
      armorRidge.position.set(0, 0.025, -0.036);
      specGrp.add(armorRidge);

      // Dorsal metacarpal armor shield plate
      const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.011, 0.044), gloveMaterials.knuckleCarbon);
      backPlate.position.set(0, 0.017, 0.004);
      specGrp.add(backPlate);

      specGrp.visible = false;
      handGroup.add(specGrp);
      archetypeGroups.specialist.push(specGrp);

      // ============================================================
      // ARCHETYPE LAYER 4: HAND WRAPS (Snug Layered Diagonal Cloth/Leather Bandages)
      // ============================================================
      const wrapsGrp = new THREE.Group();
      // 4 snug diagonal wrist bandage coils
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.036 + i * 0.0008, 0.0072, 8, 20), gloveMaterials.gloveBase);
        coil.scale.set(1.12, 0.80, 0.92);
        coil.position.set(side * 0.003, -0.005, 0.044 + i * 0.0135);
        coil.rotation.y = (i % 2 === 0 ? 0.12 : -0.12) * side;
        coil.rotation.x = 0.06;
        wrapsGrp.add(coil);
      }
      // 4 contoured oval palm/metacarpal wrap bands hugging the hand tightly
      for (let i = 0; i < 4; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.0375, 0.0068, 8, 20), gloveMaterials.gloveBase);
        band.scale.set(1.06, 0.56, 0.95);
        band.position.set(0, -0.0005 + (i % 2) * 0.0012, -0.029 + i * 0.018);
        band.rotation.y = (i % 2 === 0 ? 0.14 : -0.14) * side;
        band.rotation.x = 0.05;
        wrapsGrp.add(band);
      }
      // Snug dorsal X-cross weave strips flush against the back of the hand
      const xStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.0055, 0.013), gloveMaterials.gloveBase);
      xStrip1.position.set(-side * 0.002, 0.0145, -0.012);
      xStrip1.rotation.y = 0.50 * side;
      wrapsGrp.add(xStrip1);

      const xStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.0055, 0.013), gloveMaterials.gloveBase);
      xStrip2.position.set(side * 0.002, 0.0155, -0.010);
      xStrip2.rotation.y = -0.48 * side;
      wrapsGrp.add(xStrip2);

      // Exposed skin wrist peeking subtly between forearm sleeve and tape edge
      const wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.040, 0.030, 14), gloveMaterials.skin);
      wristSkin.rotation.x = Math.PI / 2;
      wristSkin.scale.set(1.08, 1.0, 0.82);
      wristSkin.position.set(side * 0.004, -0.007, 0.100);
      wrapsGrp.add(wristSkin);

      // Velcro end-tab accent
      const wrapTab = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.006, 0.012), gloveMaterials.cuffTrim);
      wrapTab.position.set(0, 0.023, 0.070);
      wrapsGrp.add(wrapTab);

      wrapsGrp.visible = false;
      handGroup.add(wrapsGrp);
      archetypeGroups.wraps.push(wrapsGrp);

      // ============================================================
      // 3-JOINT ARTICULATED FINGERS + ARCHETYPE KNUCKLE / FINGER CAPS
      // ============================================================
      const fingerSpecs = [
        { name: 'index',  x: -0.0285, y:  0.001, z: -0.044, lens: [0.032, 0.022, 0.018], rads: [0.0082, 0.0074, 0.0064] },
        { name: 'middle', x: -0.0095, y:  0.003, z: -0.047, lens: [0.035, 0.024, 0.019], rads: [0.0084, 0.0076, 0.0066] },
        { name: 'ring',   x:  0.0095, y:  0.001, z: -0.045, lens: [0.033, 0.022, 0.018], rads: [0.0080, 0.0072, 0.0062] },
        { name: 'pinky',  x:  0.0275, y: -0.003, z: -0.041, lens: [0.026, 0.018, 0.015], rads: [0.0071, 0.0064, 0.0055] }
      ];

      const fingers = {};

      for (const spec of fingerSpecs) {
        // Standard carbon knuckle dome
        const dome = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[0] * 1.08, 10, 8), gloveMaterials.knuckleCarbon);
        dome.scale.set(1.0, 0.72, 1.0);
        dome.position.set(spec.x * side, spec.y + 0.009, spec.z + 0.007);
        stdGrp.add(dome);

        // Specialist bulky knuckle armor stud
        const specStud = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 2.1, 0.012, 0.016), gloveMaterials.knuckleCarbon);
        specStud.position.set(spec.x * side, spec.y + 0.014, spec.z + 0.006);
        specGrp.add(specStud);

        const mcp = new THREE.Group();
        mcp.position.set(spec.x * side, spec.y, spec.z);
        handGroup.add(mcp);

        const s0 = new THREE.Mesh(
          new THREE.CapsuleGeometry(spec.rads[0], Math.max(0.002, spec.lens[0] - spec.rads[0] * 1.1), 5, 10),
          gloveMaterials.gloveBase
        );
        s0.rotation.x = Math.PI / 2;
        s0.position.set(0, 0, -spec.lens[0] * 0.5);
        mcp.add(s0);
        fingerProxMeshes.push(s0);

        // Specialist proximal finger guard plate (moves cleanly with finger curl!)
        const fGuard = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 1.65, 0.006, spec.lens[0] * 0.65), gloveMaterials.knuckleCarbon);
        fGuard.position.set(0, spec.rads[0] * 0.92, -spec.lens[0] * 0.45);
        fGuard.visible = false;
        mcp.add(fGuard);
        archetypeGroups.specialist.push(fGuard);

        const hem = new THREE.Mesh(new THREE.TorusGeometry(spec.rads[0] * 0.96, 0.0014, 6, 12), gloveMaterials.knuckleCarbon);
        hem.position.set(0, 0, -spec.lens[0] * 0.88);
        mcp.add(hem);
        fingerHemMeshes.push(hem);

        const pip = new THREE.Group();
        pip.position.set(0, 0, -spec.lens[0]);
        mcp.add(pip);

        const s1 = new THREE.Mesh(
          new THREE.CapsuleGeometry(spec.rads[1], Math.max(0.002, spec.lens[1] - spec.rads[1] * 1.0), 5, 10),
          gloveMaterials.skin
        );
        s1.rotation.x = Math.PI / 2;
        s1.position.set(0, 0, -spec.lens[1] * 0.5);
        pip.add(s1);
        fingerMidMeshes.push(s1);

        const dip = new THREE.Group();
        dip.position.set(0, 0, -spec.lens[1]);
        pip.add(dip);

        const s2 = new THREE.Mesh(
          new THREE.CapsuleGeometry(spec.rads[2], Math.max(0.002, spec.lens[2] - spec.rads[2] * 1.0), 5, 10),
          gloveMaterials.skin
        );
        s2.rotation.x = Math.PI / 2;
        s2.position.set(0, 0, -spec.lens[2] * 0.48);
        dip.add(s2);
        fingerDistMeshes.push(s2);

        fingers[spec.name] = { mcp, pip, dip };
      }

      // 4) Opposable 3-Joint Articulated Thumb
      const thumbCmc = new THREE.Group();
      thumbCmc.position.set(-side * 0.036, -0.008, 0.004);
      handGroup.add(thumbCmc);

      const t0 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0108, 0.018, 5, 10), gloveMaterials.gloveBase);
      t0.rotation.x = Math.PI / 2;
      t0.position.set(0, 0, -0.014);
      thumbCmc.add(t0);
      thumbProxMeshes.push(t0);

      // Wraps thumb loop bandage
      const thumbWrap = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0042, 6, 14), gloveMaterials.gloveBase);
      thumbWrap.position.set(0, 0, -0.012);
      thumbWrap.visible = false;
      thumbCmc.add(thumbWrap);
      archetypeGroups.wraps.push(thumbWrap);

      // Specialist thumb armor shield
      const thumbArmor = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.020), gloveMaterials.knuckleCarbon);
      thumbArmor.position.set(0, 0.010, -0.015);
      thumbArmor.visible = false;
      thumbCmc.add(thumbArmor);
      archetypeGroups.specialist.push(thumbArmor);

      const thumbMcp = new THREE.Group();
      thumbMcp.position.set(0, 0, -0.028);
      thumbCmc.add(thumbMcp);

      const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0092, 0.016, 5, 10), gloveMaterials.skin);
      t1.rotation.x = Math.PI / 2;
      t1.position.set(0, 0, -0.013);
      thumbMcp.add(t1);
      thumbMidMeshes.push(t1);

      const thumbIp = new THREE.Group();
      thumbIp.position.set(0, 0, -0.025);
      thumbMcp.add(thumbIp);

      const t2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0080, 0.012, 5, 10), gloveMaterials.skin);
      t2.rotation.x = Math.PI / 2;
      t2.position.set(0, 0, -0.010);
      thumbIp.add(t2);
      thumbDistMeshes.push(t2);

      fingers.thumb = { cmc: thumbCmc, mcp: thumbMcp, ip: thumbIp };
      handGroup.userData.fingers = fingers;
      handGroup.userData.side = side;

      return handGroup;
    }

    function setHandPose(handGroup, pose) {
      const f = handGroup.userData.fingers;
      const side = handGroup.userData.side;
      const names = ['index', 'middle', 'ring', 'pinky'];
      for (const nm of names) {
        const c = pose[nm] !== undefined ? pose[nm] : 0.85;
        const j = f[nm];
        const spread = nm === 'index' ? -0.06 : nm === 'ring' ? 0.05 : nm === 'pinky' ? 0.12 : 0.0;
        j.mcp.rotation.x = -0.08 - c * 1.06;
        j.mcp.rotation.y = side * spread * (1 - c * 0.7);
        j.pip.rotation.x = -0.06 - c * 1.28;
        j.dip.rotation.x = -0.04 - c * 0.82;
      }
      if (pose.indexRingHook) {
        const h = pose.indexRingHook;
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, -0.68, h);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, -0.82, h);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, -0.45, h);
      }
      // Special extended fingertip balance override for Default Mythic trick
      if (pose.indexPoint) {
        const p = pose.indexPoint;
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, 0.14, p);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, 0.02, p);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, 0.02, p);
      }
      const tc = pose.thumb !== undefined ? pose.thumb : 0.8;
      f.thumb.cmc.rotation.set(
        -0.18 - tc * 0.34,
        -side * (0.28 + tc * 0.42),
        side * (0.35 + tc * 0.48)
      );
      f.thumb.mcp.rotation.set(-0.08 - tc * 0.56, -side * tc * 0.18, 0);
      f.thumb.ip.rotation.set(-0.06 - tc * 0.58, 0, 0);
    }

    let activeGloveMap = null;
    let activeGloveRough = null;
    let currentGloveItem = KS.createStarterGlove();

    function applyGlove(gloveItem, targetRenderer) {
      const clean = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
      currentGloveItem = clean;
      const gt = clean.gloveType;
      const { albedoCanvas, roughCanvas, palette } = paintGloveToCanvases(clean, 256);

      if (activeGloveMap) activeGloveMap.dispose();
      if (activeGloveRough) activeGloveRough.dispose();

      activeGloveMap = new THREE.CanvasTexture(albedoCanvas);
      activeGloveMap.colorSpace = THREE.SRGBColorSpace;
      activeGloveMap.wrapS = THREE.RepeatWrapping;
      activeGloveMap.wrapT = THREE.RepeatWrapping;
      const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
      activeGloveMap.anisotropy = Math.min(8, maxAniso);

      activeGloveRough = new THREE.CanvasTexture(roughCanvas);
      activeGloveRough.wrapS = THREE.RepeatWrapping;
      activeGloveRough.wrapT = THREE.RepeatWrapping;

      gloveMaterials.gloveBase.color.setHex(0xffffff);
      gloveMaterials.gloveBase.map = activeGloveMap;
      gloveMaterials.gloveBase.roughnessMap = activeGloveRough;
      gloveMaterials.gloveBase.roughness = palette.rough;
      gloveMaterials.gloveBase.metalness = palette.metal;
      gloveMaterials.gloveBase.needsUpdate = true;

      gloveMaterials.palmLeather.color.setHex(palette.palm);
      gloveMaterials.knuckleCarbon.color.setHex(palette.knuckle);
      gloveMaterials.cuffTrim.color.setHex(palette.cuff);
      gloveMaterials.cuffTrim.emissive.setHex(palette.cuffEmissive);
      gloveMaterials.sleeve.color.setHex(palette.sleeve);

      // Toggle 4 archetype geometry layers
      for (const arch of Object.keys(archetypeGroups)) {
        const show = arch === gt;
        for (const obj of archetypeGroups[arch]) {
          obj.visible = show;
        }
      }

      // Assign finger & palm materials according to archetype cut
      const isFullFinger = gt === 'sport' || gt === 'specialist';
      const isWraps = gt === 'wraps';
      const isStandard = gt === 'standard';

      for (const m of palmBaseMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of palmPadMeshes) {
        m.visible = !isWraps;
      }
      for (const m of fingerProxMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of fingerMidMeshes) {
        m.material = isFullFinger ? gloveMaterials.gloveBase : gloveMaterials.skin;
      }
      for (const m of fingerDistMeshes) {
        m.material = isFullFinger ? (gt === 'sport' ? gloveMaterials.palmLeather : gloveMaterials.gloveBase) : gloveMaterials.skin;
      }
      for (const m of thumbProxMeshes) {
        m.material = isWraps ? gloveMaterials.skin : gloveMaterials.gloveBase;
      }
      for (const m of thumbMidMeshes) {
        m.material = isFullFinger ? gloveMaterials.gloveBase : gloveMaterials.skin;
      }
      for (const m of thumbDistMeshes) {
        m.material = isFullFinger ? (gt === 'sport' ? gloveMaterials.palmLeather : gloveMaterials.gloveBase) : gloveMaterials.skin;
      }
      for (const m of fingerHemMeshes) {
        m.visible = isStandard;
      }
    }

    const rightHandPivot = new THREE.Group();
    rightHandPivot.rotation.order = 'YXZ';
    const rightHand = createArticulatedHand(1);
    rightHandPivot.add(rightHand);

    const knifeSocket = new THREE.Group();
    rightHand.add(knifeSocket);

    const leftHandPivot = new THREE.Group();
    leftHandPivot.rotation.order = 'YXZ';
    const leftHand = createArticulatedHand(-1);
    leftHandPivot.add(leftHand);

    setHandPose(leftHand, { index: 0.64, middle: 0.74, ring: 0.82, pinky: 0.88, thumb: 0.56 });

    rootRig.add(rightHandPivot);
    rootRig.add(leftHandPivot);

    // Initialize default starter Standard Gloves look immediately
    applyGlove(currentGloveItem, null);

    return {
      rootRig,
      rightHandPivot,
      rightHand,
      leftHandPivot,
      leftHand,
      knifeSocket,
      gloveMaterials,
      setHandPose,
      applyGlove,
      getCurrentGlove: () => currentGloveItem
    };
  }

  // ---------- Shared Animation Math & Contact Grip Solver ----------
  function easeOutCubic(t) {
    const u = Math.max(0, Math.min(1, t));
    return 1 - (1 - u) * (1 - u) * (1 - u);
  }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function bell(t, a, b) {
    if (t <= a || t >= b) return 0;
    const u = (t - a) / (b - a);
    return Math.sin(u * Math.PI);
  }

  function applyContactGripSocket(knifeMesh, kt) {
    knifeMesh.rotation.order = 'XYZ';
    if (kt === 'karambit') {
      knifeMesh.position.set(-0.027, -0.020, -0.044);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.36, 0.04, -0.06);
      knifeMesh.scale.setScalar(1.06);
    } else if (kt === 'skeleton') {
      knifeMesh.position.set(-0.027, -0.023, -0.042);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.16, Math.PI - 0.24, 0.08);
      knifeMesh.scale.setScalar(1.04);
    } else if (kt === 'butterfly') {
      knifeMesh.position.set(-0.002, -0.023, -0.038);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.14, Math.PI - 0.26, 0.06);
      knifeMesh.scale.setScalar(1.04);
    } else if (kt === 'm9') {
      knifeMesh.position.set(0.002, -0.023, -0.038);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.12, Math.PI - 0.24, 0.05);
      knifeMesh.scale.setScalar(0.94);
    } else {
      knifeMesh.position.set(0.002, -0.023, -0.038);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.12, Math.PI - 0.24, 0.05);
      knifeMesh.scale.setScalar(1.0);
    }
  }

  function createAnimOut() {
    return {
      rx: 0, ry: 0, rz: 0, rRotX: 0, rRotY: 0, rRotZ: 0,
      lx: 0, ly: 0, lz: 0, lRotX: 0, lRotY: 0, lRotZ: 0,
      kPosX: 0, kPosY: 0, kPosZ: 0,
      kRotX: 0, kRotY: 0, kRotZ: 0,
      baliBladeAngle: 0, baliBiteAngle: 0,
      rPose: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 0.9, indexRingHook: 0, indexPoint: 0 },
      lPose: { index: 0.64, middle: 0.74, ring: 0.82, pinky: 0.88, thumb: 0.56, indexRingHook: 0, indexPoint: 0 }
    };
  }

  // Evaluates rest pose, draw animation, and Normal / Uncommon / 1-in-100 Mythic inspect tricks
  // without allocating any temporary objects on the heap.
  function evaluateViewmodelChoreography(kt, animState, out, playAudio) {
    // 1) Authentic CS Surf Per-Knife Rest Poses
    if (kt === 'karambit') {
      out.rx = 0.215; out.ry = -0.175; out.rz = -0.35;
      out.rRotX = 0.14; out.rRotY = 0.68; out.rRotZ = 1.66;
    } else if (kt === 'skeleton') {
      out.rx = 0.205; out.ry = -0.165; out.rz = -0.35;
      out.rRotX = -0.22; out.rRotY = 0.26; out.rRotZ = -0.82;
    } else if (kt === 'butterfly') {
      out.rx = 0.205; out.ry = -0.168; out.rz = -0.35;
      out.rRotX = -0.20; out.rRotY = 0.28; out.rRotZ = -0.86;
    } else if (kt === 'm9') {
      out.rx = 0.215; out.ry = -0.172; out.rz = -0.36;
      out.rRotX = -0.24; out.rRotY = 0.30; out.rRotZ = -0.84;
    } else {
      out.rx = 0.210; out.ry = -0.170; out.rz = -0.35;
      out.rRotX = -0.22; out.rRotY = 0.28; out.rRotZ = -0.85;
    }

    out.lx = -0.270; out.ly = -0.235; out.lz = -0.38;
    out.lRotX = 0.14; out.lRotY = -0.44; out.lRotZ = 0.18;

    const rp = out.rPose;
    rp.indexRingHook = 0;
    rp.indexPoint = 0;
    if (kt === 'karambit') {
      rp.index = 0.58; rp.middle = 0.96; rp.ring = 0.98; rp.pinky = 0.95; rp.thumb = 0.86; rp.indexRingHook = 0.75;
    } else if (kt === 'skeleton') {
      rp.index = 0.62; rp.middle = 0.96; rp.ring = 0.98; rp.pinky = 0.96; rp.thumb = 0.84; rp.indexRingHook = 0.55;
    } else {
      rp.index = 0.96; rp.middle = 0.98; rp.ring = 0.98; rp.pinky = 0.96; rp.thumb = 0.88;
    }

    const lp = out.lPose;
    lp.index = 0.64; lp.middle = 0.74; lp.ring = 0.82; lp.pinky = 0.88; lp.thumb = 0.56; lp.indexRingHook = 0; lp.indexPoint = 0;

    out.kPosX = 0; out.kPosY = 0; out.kPosZ = 0;
    out.kRotX = 0; out.kRotY = 0; out.kRotZ = 0;
    out.baliBladeAngle = 0;
    out.baliBiteAngle = 0;

    const cue = (bit, fn) => {
      if (!playAudio) return;
      if (!(animState.inspectCueMask & bit)) {
        animState.inspectCueMask |= bit;
        fn();
      }
    };

    // 2) Draw Animation
    if (animState.drawT < 1) {
      const t = animState.drawT;
      const e = easeOutCubic(t);
      const inv = 1 - e;
      out.ry -= inv * 0.17;
      out.rRotX -= inv * 0.52;
      out.ly -= inv * 0.10;

      if (kt === 'butterfly') {
        if (t < 0.42) {
          const u = smoothstep(0.0, 0.42, t);
          out.baliBladeAngle = THREE.MathUtils.lerp(Math.PI, -0.18, u);
          out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI, Math.PI * 1.92, u);
          out.rRotZ += Math.sin(u * Math.PI) * 0.58;
          out.rRotX += Math.sin(u * Math.PI) * 0.25;
          rp.middle = 0.45; rp.ring = 0.40; rp.pinky = 0.38; rp.thumb = 0.35;
        } else {
          const u = smoothstep(0.42, 0.92, t);
          out.baliBladeAngle = THREE.MathUtils.lerp(-0.18, 0.0, u);
          out.baliBiteAngle = t >= 0.92 ? 0 : THREE.MathUtils.lerp(Math.PI * 1.92, Math.PI * 2.0, u);
          out.rRotZ -= Math.sin(u * Math.PI) * 0.26;
          const gripClose = smoothstep(0.55, 0.85, t);
          rp.middle = THREE.MathUtils.lerp(0.45, 0.98, gripClose);
          rp.ring = THREE.MathUtils.lerp(0.40, 0.98, gripClose);
          rp.pinky = THREE.MathUtils.lerp(0.38, 0.96, gripClose);
          rp.thumb = THREE.MathUtils.lerp(0.35, 0.88, gripClose);
        }
        if (playAudio && t > 0.38 && !(animState.drawCueMask & 1)) {
          animState.drawCueMask |= 1;
          CaseAudio.balisongClack(1.08);
        }
        if (playAudio && t > 0.78 && !(animState.drawCueMask & 2)) {
          animState.drawCueMask |= 2;
          CaseAudio.balisongClack(0.90);
        }
      } else if (kt === 'karambit') {
        out.kRotZ += inv * Math.PI * 2;
        rp.middle = THREE.MathUtils.lerp(0.25, 0.96, smoothstep(0.5, 0.9, t));
        rp.ring = THREE.MathUtils.lerp(0.22, 0.98, smoothstep(0.5, 0.9, t));
        rp.pinky = THREE.MathUtils.lerp(0.20, 0.95, smoothstep(0.5, 0.9, t));
        rp.indexRingHook = 1.0;
      } else if (kt === 'skeleton') {
        out.kRotZ -= inv * Math.PI * 2;
        rp.middle = THREE.MathUtils.lerp(0.24, 0.96, smoothstep(0.5, 0.9, t));
        rp.ring = THREE.MathUtils.lerp(0.22, 0.98, smoothstep(0.5, 0.9, t));
        rp.pinky = THREE.MathUtils.lerp(0.20, 0.96, smoothstep(0.5, 0.9, t));
        rp.indexRingHook = 0.95;
      } else {
        out.rRotY -= inv * 0.45;
        out.kRotX -= inv * 0.35;
      }
      return;
    }

    // 3) Inspect Tricks: Normal (74%), Uncommon (25%), and 1/100 Mythic (1%)!
    if (animState.inspectT < 1) {
      const t = animState.inspectT;
      const tier = animState.inspectTier || 'normal';
      const env = smoothstep(0.0, 0.12, t) * (1 - smoothstep(0.86, 1.0, t));

      out.rx -= env * 0.072;
      out.ry += env * 0.068;
      out.rz += env * 0.025;
      out.lx += env * 0.022;
      out.ly += env * 0.016;

      // ================================================================
      // 1/100 MYTHIC INSPECT SEQUENCES (BESPOKE FOR EVERY KNIFE!)
      // ================================================================
      if (tier === 'mythic') {
        // Bring showcase hand slightly higher-center and lift left hand subtly to frame the stunt
        out.rx -= env * 0.025;
        out.ry += env * 0.018;
        out.lx += env * 0.048;
        out.ly += env * 0.045;
        out.lRotY += env * 0.22;
        out.lRotX += env * 0.14;
        lp.index = THREE.MathUtils.lerp(0.64, 0.32, env);
        lp.middle = THREE.MathUtils.lerp(0.74, 0.38, env);
        lp.ring = THREE.MathUtils.lerp(0.82, 0.44, env);

        if (kt === 'butterfly') {
          // MYTHIC BUTTERFLY: Grand Balisong Freestyle!
          // 0.00..0.24 Zen Rollover -> 0.24..0.52 Chaplin Index Twirl -> 0.52..0.64 Behind-Thumb Whip
          // -> 0.64..0.88 High Horizontal Aerial Palm Helicopter -> 0.88..1.00 Downward Whip-Catch Lock
          if (t < 0.24) {
            const u = smoothstep(0.0, 0.24, t);
            out.kRotZ -= u * Math.PI * 2;
            out.baliBladeAngle = Math.sin(u * Math.PI) * 2.4;
            out.baliBiteAngle = u * Math.PI * 2;
            out.rRotZ += Math.sin(u * Math.PI) * 0.46;
            rp.middle = 0.28; rp.ring = 0.22; rp.pinky = 0.20; rp.thumb = 0.32;
            if (t > 0.12) cue(1, () => CaseAudio.balisongClack(1.24));
          } else if (t < 0.54) {
            // Chaplin rapid 720° twirl around index finger with handles fanned wide
            const u = smoothstep(0.24, 0.54, t);
            out.kRotZ -= Math.PI * 2 + u * Math.PI * 4;
            out.kPosX -= Math.sin(u * Math.PI) * 0.016;
            out.baliBladeAngle = THREE.MathUtils.lerp(0.65, 1.45, Math.sin(u * Math.PI));
            out.baliBiteAngle = THREE.MathUtils.lerp(1.3, 2.75, Math.sin(u * Math.PI));
            rp.index = 0.36; rp.indexRingHook = 0.85;
            rp.middle = 0.18; rp.ring = 0.16; rp.pinky = 0.16; rp.thumb = 0.22;
            out.rRotY += Math.sin(u * Math.PI) * 0.35;
            if (t > 0.28) cue(2, () => CaseAudio.spinWhoosh(1.32));
            if (t > 0.44) cue(4, () => CaseAudio.balisongClack(1.18));
          } else if (t < 0.88) {
            // Behind-thumb transfer into high horizontal aerial palm helicopter (1080° spin!)
            const u = smoothstep(0.54, 0.88, t);
            const palmUp = bell(t, 0.52, 0.90);
            out.rRotZ += palmUp * 1.12;
            out.rRotX += palmUp * 0.28;
            rp.index = THREE.MathUtils.lerp(0.96, 0.10, palmUp);
            rp.middle = THREE.MathUtils.lerp(0.98, 0.10, palmUp);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.10, palmUp);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.12, palmUp);
            rp.thumb = THREE.MathUtils.lerp(0.88, 0.16, palmUp);

            const airArc = bell(t, 0.58, 0.87);
            out.kPosY += airArc * 0.092;
            out.kRotZ += u * Math.PI * 6;
            out.baliBladeAngle = Math.sin(u * Math.PI * 3) * 1.75;
            out.baliBiteAngle = Math.sin(u * Math.PI * 3 + 0.8) * 2.55;
            if (t > 0.60) cue(8, () => CaseAudio.spinWhoosh(1.26));
            if (t > 0.74) cue(16, () => CaseAudio.balisongClack(1.28));
          } else {
            // Dramatic downward whip-catch lock with recoil dip
            const u = smoothstep(0.88, 1.0, t);
            const dip = bell(t, 0.87, 0.97);
            out.ry -= dip * 0.032;
            out.rRotZ -= dip * 0.34;
            out.baliBladeAngle = (1 - u) * 0.45;
            out.baliBiteAngle = (1 - u) * 0.85;
            if (t > 0.89) cue(32, () => CaseAudio.balisongClack(0.92));
            if (t > 0.94) cue(64, () => CaseAudio.balisongClack(1.06));
          }
          return;
        }

        if (kt === 'karambit') {
          // MYTHIC KARAMBIT: Infinity Ring Cascade & Aerial Reverse-to-Forward Flip Catch!
          // 0.00..0.34 High-RPM double index-ring cascade
          // 0.34..0.64 Aerial 360° flip + 180° forward-grip presentation catch
          // 0.64..0.88 Reverse snap-whirl back onto index ring
          // 0.88..1.00 Locked reverse stance recoil
          if (t < 0.34) {
            const u = smoothstep(0.0, 0.34, t);
            out.kRotZ -= u * Math.PI * 6;
            rp.middle = 0.15; rp.ring = 0.14; rp.pinky = 0.12; rp.thumb = 0.22; rp.indexRingHook = 1.0;
            out.rRotY += Math.sin(u * Math.PI) * 0.32;
            if (t > 0.10) cue(1, () => CaseAudio.spinWhoosh(1.28));
            if (t > 0.24) cue(2, () => CaseAudio.spinWhoosh(1.36));
          } else if (t < 0.64) {
            const u = smoothstep(0.34, 0.64, t);
            const toss = bell(t, 0.34, 0.54);
            out.kPosY += toss * 0.082;
            out.kRotZ -= Math.PI * 6 + smoothstep(0.34, 0.54, t) * Math.PI * 2;
            // Flip into forward grip presentation (180° yaw around Y)
            out.kRotY += smoothstep(0.36, 0.54, t) * Math.PI;
            const open = bell(t, 0.33, 0.54);
            rp.index = THREE.MathUtils.lerp(0.88, 0.14, open);
            rp.middle = THREE.MathUtils.lerp(0.96, 0.14, open);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.14, open);
            rp.pinky = THREE.MathUtils.lerp(0.95, 0.14, open);
            rp.thumb = THREE.MathUtils.lerp(0.86, 0.20, open);
            rp.indexRingHook = 0.2;
            out.rRotY += 0.38 * bell(t, 0.45, 0.66);
            out.ry -= bell(t, 0.52, 0.61) * 0.022;
            if (t > 0.36) cue(4, () => CaseAudio.spinWhoosh(1.12));
            if (t > 0.53) cue(8, () => CaseAudio.balisongClack(0.95));
          } else if (t < 0.88) {
            // Reverse snap-whirl back onto index ring into reverse stance
            const u = smoothstep(0.64, 0.88, t);
            const toss2 = bell(t, 0.64, 0.78);
            out.kPosY += toss2 * 0.044;
            out.kRotY += (1 - smoothstep(0.64, 0.78, t)) * Math.PI;
            out.kRotZ -= Math.PI * 8 + u * Math.PI * 4;
            rp.middle = 0.16; rp.ring = 0.14; rp.pinky = 0.12; rp.thumb = 0.24; rp.indexRingHook = 1.0;
            if (t > 0.67) cue(16, () => CaseAudio.spinWhoosh(1.30));
          } else {
            const dip = bell(t, 0.87, 0.97);
            out.ry -= dip * 0.026;
            out.rRotZ += dip * 0.24;
            rp.indexRingHook = 0.85;
            if (t > 0.88) cue(32, () => CaseAudio.balisongClack(0.88));
          }
          return;
        }

        if (kt === 'skeleton') {
          // MYTHIC SKELETON: Kunai Vortex & Mid-Air Index-Hole Skewer Catch!
          // 0.00..0.36 Center-hole tornado vortex spin (4 revolutions)
          // 0.36..0.72 High vertical 720° aerial helicopter toss above open palm
          // 0.72..0.90 Mid-air index-finger skewer catch with decelerating spin
          // 0.90..1.00 Athletic tape grip snap
          if (t < 0.36) {
            const u = smoothstep(0.0, 0.36, t);
            out.kRotZ += u * Math.PI * 8;
            rp.middle = 0.14; rp.ring = 0.12; rp.pinky = 0.12; rp.thumb = 0.20;
            rp.index = 0.38; rp.indexRingHook = 1.0;
            out.rRotZ += Math.sin(u * Math.PI) * 0.38;
            if (t > 0.08) cue(1, () => CaseAudio.spinWhoosh(1.16));
            if (t > 0.24) cue(2, () => CaseAudio.spinWhoosh(1.28));
          } else if (t < 0.72) {
            const u = smoothstep(0.36, 0.72, t);
            const palmOpen = bell(t, 0.34, 0.73);
            out.rRotZ += palmOpen * 0.78;
            rp.index = THREE.MathUtils.lerp(0.62, 0.10, palmOpen);
            rp.middle = THREE.MathUtils.lerp(0.96, 0.10, palmOpen);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.10, palmOpen);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.12, palmOpen);
            rp.thumb = THREE.MathUtils.lerp(0.84, 0.18, palmOpen);
            rp.indexRingHook = 0;

            const arc = bell(t, 0.36, 0.72);
            out.kPosY += arc * 0.098;
            out.kRotZ += Math.PI * 8 + u * Math.PI * 4;
            out.kRotX += Math.sin(u * Math.PI) * 0.32;
            if (t > 0.38) cue(4, () => CaseAudio.spinWhoosh(1.06));
            if (t > 0.56) cue(8, () => CaseAudio.spinWhoosh(1.20));
          } else if (t < 0.90) {
            // Precision index-finger skewer catch straight through center cutout!
            const u = easeOutCubic((t - 0.72) / 0.18);
            out.kRotZ += Math.PI * 12 + u * Math.PI * 2;
            rp.index = 0.45; rp.indexRingHook = 1.0;
            rp.middle = THREE.MathUtils.lerp(0.16, 0.96, u);
            rp.ring = THREE.MathUtils.lerp(0.14, 0.98, u);
            rp.pinky = THREE.MathUtils.lerp(0.14, 0.96, u);
            rp.thumb = THREE.MathUtils.lerp(0.24, 0.84, u);
            out.ry -= bell(t, 0.72, 0.82) * 0.028;
            if (t > 0.73) cue(16, () => CaseAudio.balisongClack(1.12));
          } else {
            const dip = bell(t, 0.89, 0.98);
            out.ry -= dip * 0.016;
            if (t > 0.90) cue(32, () => CaseAudio.balisongClack(0.84));
          }
          return;
        }

        if (kt === 'm9') {
          // MYTHIC M9 BAYONET: Tactical Double-Flip & Reverse Icepick Roll!
          // 0.00..0.32 Heavy 540° vertical flip into Reverse Grip
          // 0.32..0.58 Reverse-grip catch & wrist-roll inspection showing sawtooth spine
          // 0.58..0.86 Second high-torque counter-flip (-540°) back to forward combat grip
          // 0.86..1.00 Weighty combat recoil settle
          if (t < 0.32) {
            const u = smoothstep(0.0, 0.32, t);
            const open = bell(t, 0.04, 0.31);
            rp.index = THREE.MathUtils.lerp(0.96, 0.12, open);
            rp.middle = THREE.MathUtils.lerp(0.98, 0.12, open);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.12, open);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.14, open);
            rp.thumb = THREE.MathUtils.lerp(0.88, 0.18, open);
            out.kPosY += bell(t, 0.04, 0.31) * 0.078;
            out.kRotZ -= u * Math.PI * 3; // lands inverted (reverse icepick grip!)
            out.rRotZ += open * 0.45;
            if (t > 0.06) cue(1, () => CaseAudio.spinWhoosh(0.82));
            if (t > 0.30) cue(2, () => CaseAudio.balisongClack(0.68));
          } else if (t < 0.58) {
            const u = smoothstep(0.32, 0.58, t);
            out.kRotZ -= Math.PI * 3; // held cleanly in reverse icepick grip
            out.ry -= bell(t, 0.32, 0.40) * 0.026;
            out.rRotY += Math.sin(u * Math.PI) * 0.52;
            out.rRotZ += Math.sin(u * Math.PI * 2) * 0.42;
            if (t > 0.42) cue(4, () => CaseAudio.bladeShing());
          } else if (t < 0.86) {
            const u = smoothstep(0.58, 0.86, t);
            const open = bell(t, 0.58, 0.85);
            rp.index = THREE.MathUtils.lerp(0.96, 0.12, open);
            rp.middle = THREE.MathUtils.lerp(0.98, 0.12, open);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.12, open);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.14, open);
            rp.thumb = THREE.MathUtils.lerp(0.88, 0.18, open);
            out.kPosY += bell(t, 0.58, 0.85) * 0.086;
            out.kRotZ -= Math.PI * 3 + u * Math.PI * 3; // completes full 360*3 = 6*PI back to forward grip!
            out.rRotZ -= open * 0.42;
            if (t > 0.60) cue(8, () => CaseAudio.spinWhoosh(0.86));
            if (t > 0.84) cue(16, () => CaseAudio.balisongClack(0.64));
          } else {
            const dip = bell(t, 0.86, 0.96);
            out.ry -= dip * 0.032;
            out.rRotY += bell(t, 0.86, 1.0) * 0.28;
          }
          return;
        }

        // MYTHIC DEFAULT TACTICAL: Precision Juggle & Fingertip Tip-Balance Hover!
        // 0.00..0.24 Crisp spin toss orienting blade tip-down
        // 0.24..0.68 Extended index fingertip balance hover with graceful 360° vertical pirouette
        // 0.68..0.88 Flick-catch drop back into palm
        // 0.88..1.00 Saber combat grip lock
        if (t < 0.24) {
          const u = smoothstep(0.0, 0.24, t);
          const open = bell(t, 0.02, 0.24);
          rp.index = THREE.MathUtils.lerp(0.96, 0.08, u);
          rp.middle = THREE.MathUtils.lerp(0.98, 0.88, u);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.92, u);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.94, u);
          rp.thumb = THREE.MathUtils.lerp(0.88, 0.62, u);
          rp.indexPoint = u;
          out.kPosY += open * 0.068 + u * 0.056;
          out.kPosX -= u * 0.024;
          out.kRotZ -= u * (Math.PI * 1.5); // brings blade tip straight down onto extended index tip!
          out.rRotZ += u * 0.72;
          if (t > 0.05) cue(1, () => CaseAudio.spinWhoosh(1.04));
        } else if (t < 0.68) {
          const u = (t - 0.24) / 0.44;
          rp.index = 0.06; rp.indexPoint = 1.0;
          rp.middle = 0.88; rp.ring = 0.92; rp.pinky = 0.94; rp.thumb = 0.64;
          out.rRotZ += 0.72;
          out.rRotY += 0.24;
          // Graceful gentle micro-sway while spinning 360° vertically on the index fingertip!
          out.kPosX -= 0.024;
          out.kPosY += 0.058 + Math.sin(u * Math.PI * 4) * 0.004;
          out.kRotZ -= Math.PI * 1.5 + Math.sin(u * Math.PI * 3) * 0.07;
          out.kRotX += u * Math.PI * 2;
          if (t > 0.28) cue(2, () => CaseAudio.bladeShing());
        } else if (t < 0.88) {
          const u = smoothstep(0.68, 0.88, t);
          const arc = bell(t, 0.68, 0.88);
          rp.index = THREE.MathUtils.lerp(0.06, 0.96, u);
          rp.indexPoint = 1 - u;
          rp.middle = THREE.MathUtils.lerp(0.88, 0.18, arc);
          rp.ring = THREE.MathUtils.lerp(0.92, 0.16, arc);
          rp.pinky = THREE.MathUtils.lerp(0.94, 0.16, arc);
          out.rRotZ += (1 - u) * 0.72;
          out.kPosX -= (1 - u) * 0.024;
          out.kPosY += (1 - u) * 0.058 + arc * 0.048;
          out.kRotZ -= Math.PI * 1.5 + u * (Math.PI * 0.5); // lands cleanly at -2*PI (upright saber grip!)
          if (t > 0.70) cue(4, () => CaseAudio.spinWhoosh(0.95));
          if (t > 0.86) cue(8, () => CaseAudio.balisongClack(0.80));
        } else {
          const dip = bell(t, 0.88, 0.98);
          out.ry -= dip * 0.026;
        }
        return;
      }

      // ================================================================
      // EXISTING UNCOMMON (25%) & NORMAL (74%) INSPECT TRICKS + F-CHAIN
      // ================================================================
      const isUncommon = tier === 'uncommon';

      if (kt === 'karambit') {
        if (isUncommon || animState.spinBonus > 0) {
          const totalSpin = Math.PI * 6 + animState.spinBonus;
          out.kRotZ -= easeOutCubic(t) * totalSpin;
          const openAmt = smoothstep(0.02, 0.12, t) * (1 - smoothstep(0.82, 0.96, t));
          rp.middle = THREE.MathUtils.lerp(0.96, 0.16, openAmt);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.14, openAmt);
          rp.pinky = THREE.MathUtils.lerp(0.95, 0.12, openAmt);
          rp.thumb = THREE.MathUtils.lerp(0.86, 0.24, openAmt);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.34;
          out.rRotX += env * 0.14;
          if (t > 0.34) cue(1, () => CaseAudio.spinWhoosh(1.24));
        } else {
          const spinA = smoothstep(0.0, 0.28, t) * Math.PI * 2;
          const openA = bell(t, 0.0, 0.32);
          out.kRotZ -= spinA;
          rp.middle = THREE.MathUtils.lerp(0.96, 0.20, openA);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.18, openA);
          rp.pinky = THREE.MathUtils.lerp(0.95, 0.16, openA);
          rp.thumb = THREE.MathUtils.lerp(0.86, 0.30, openA);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.55;
          out.rRotX += bell(t, 0.25, 0.85) * 0.24;
          out.rRotZ += Math.sin(smoothstep(0.24, 0.86, t) * Math.PI * 2) * 0.55;
        }
      } else if (kt === 'skeleton') {
        if (isUncommon || animState.spinBonus > 0) {
          const totalSpin = Math.PI * 6 + animState.spinBonus;
          out.kRotZ += easeOutCubic(t) * totalSpin;
          const openAmt = smoothstep(0.02, 0.12, t) * (1 - smoothstep(0.84, 0.96, t));
          rp.middle = THREE.MathUtils.lerp(0.96, 0.15, openAmt);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.14, openAmt);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.12, openAmt);
          rp.thumb = THREE.MathUtils.lerp(0.84, 0.22, openAmt);
          rp.index = 0.42;
          rp.indexRingHook = 1.0;
          out.kPosY += bell(t, 0.62, 0.88) * 0.045;
          out.rRotY += env * 0.38;
          out.rRotZ += env * 0.42;
          if (t > 0.32) cue(1, () => CaseAudio.spinWhoosh(1.08));
          if (t > 0.85) cue(2, () => CaseAudio.balisongClack(0.84));
        } else {
          const spinA = smoothstep(0.0, 0.30, t) * Math.PI * 2;
          const openA = bell(t, 0.0, 0.34);
          out.kRotZ += spinA;
          rp.middle = THREE.MathUtils.lerp(0.96, 0.18, openA);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.16, openA);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.16, openA);
          rp.indexRingHook = THREE.MathUtils.lerp(0.55, 1.0, openA);
          out.rRotY += env * 0.52;
          out.rRotZ += Math.sin(smoothstep(0.28, 0.86, t) * Math.PI * 2) * 0.65;
        }
      } else if (kt === 'butterfly') {
        if (isUncommon) {
          const palmUp = smoothstep(0.06, 0.22, t) * (1 - smoothstep(0.72, 0.90, t));
          out.rRotZ += palmUp * 1.05;
          out.rRotX += palmUp * 0.26;
          const fingersOpen = smoothstep(0.14, 0.24, t) * (1 - smoothstep(0.70, 0.82, t));
          rp.index = THREE.MathUtils.lerp(0.96, 0.14, fingersOpen);
          rp.middle = THREE.MathUtils.lerp(0.98, 0.12, fingersOpen);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.12, fingersOpen);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.14, fingersOpen);
          rp.thumb = THREE.MathUtils.lerp(0.88, 0.18, fingersOpen);

          out.kPosY += bell(t, 0.20, 0.74) * 0.072;
          const airSpin = smoothstep(0.20, 0.74, t);
          out.kRotZ += airSpin * Math.PI * 4;
          out.baliBladeAngle = Math.sin(airSpin * Math.PI * 2) * 1.55;
          out.baliBiteAngle = Math.sin(airSpin * Math.PI * 2 + 0.65) * 2.2;

          if (t > 0.22) cue(1, () => CaseAudio.spinWhoosh(1.22));
          if (t > 0.48) cue(2, () => CaseAudio.balisongClack(1.25));
          if (t > 0.74) cue(4, () => CaseAudio.balisongClack(0.92));
        } else {
          const openF = smoothstep(0.04, 0.14, t) * (1 - smoothstep(0.68, 0.78, t));
          rp.middle = THREE.MathUtils.lerp(0.98, 0.26, openF);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.22, openF);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.20, openF);
          rp.thumb = THREE.MathUtils.lerp(0.88, 0.34, openF);

          if (t < 0.28) {
            const u = smoothstep(0.0, 0.28, t);
            out.baliBladeAngle = u * 1.15;
            out.baliBiteAngle = u * 2.45;
            out.rRotZ += Math.sin(u * Math.PI * 0.5) * 0.42;
          } else if (t < 0.62) {
            const u = smoothstep(0.28, 0.62, t);
            out.kRotZ -= u * Math.PI * 2;
            out.baliBladeAngle = THREE.MathUtils.lerp(1.15, Math.PI, Math.sin(u * Math.PI));
            out.baliBiteAngle = THREE.MathUtils.lerp(2.45, Math.PI * 2.0, u);
            out.rRotZ += 0.42 - u * 0.62;
            out.rRotY += Math.sin(u * Math.PI) * 0.38;
            if (t > 0.34) cue(1, () => CaseAudio.spinWhoosh(1.16));
            if (t > 0.52) cue(2, () => CaseAudio.balisongClack(1.12));
          } else {
            const u = smoothstep(0.62, 0.76, t);
            out.baliBladeAngle = THREE.MathUtils.lerp(1.15, 0.0, u);
            out.baliBiteAngle = 0;
            out.rRotZ += THREE.MathUtils.lerp(-0.20, 0.16, bell(t, 0.62, 0.96));
            out.rRotY += bell(t, 0.62, 0.96) * 0.44;
            if (t > 0.73) cue(4, () => CaseAudio.balisongClack(0.90));
          }
        }
      } else {
        if (isUncommon) {
          const openAmt = bell(t, 0.12, 0.66);
          rp.index = THREE.MathUtils.lerp(0.96, 0.14, openAmt);
          rp.middle = THREE.MathUtils.lerp(0.98, 0.12, openAmt);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.12, openAmt);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.14, openAmt);
          rp.thumb = THREE.MathUtils.lerp(0.88, 0.18, openAmt);

          const flipArc = bell(t, 0.16, 0.64);
          const flipProg = smoothstep(0.16, 0.64, t);
          out.kPosY += flipArc * 0.068;
          out.kRotZ -= flipProg * Math.PI * 2;
          out.rRotZ += flipArc * 0.55;
          out.ry -= bell(t, 0.62, 0.78) * 0.028;
          out.rRotY += bell(t, 0.65, 0.98) * 0.42;

          if (t > 0.18) cue(1, () => CaseAudio.spinWhoosh(0.86));
          if (t > 0.63) cue(2, () => CaseAudio.balisongClack(0.70));
        } else {
          out.rRotY += env * 0.62;
          out.rRotX += env * 0.16;
          out.rRotZ += Math.sin(smoothstep(0.14, 0.86, t) * Math.PI * 2) * 0.68;
        }
      }
    }
  }

  function durationForInspect(kt, tier) {
    if (tier === 'mythic') {
      if (kt === 'butterfly') return 3.85;
      if (kt === 'skeleton') return 3.75;
      if (kt === 'karambit') return 3.65;
      if (kt === 'm9') return 3.60;
      return 3.65;
    }
    if (kt === 'butterfly') return tier === 'uncommon' ? 2.55 : 2.25;
    if (kt === 'karambit') return tier === 'uncommon' ? 2.15 : 1.85;
    if (kt === 'skeleton') return tier === 'uncommon' ? 2.25 : 1.95;
    return tier === 'uncommon' ? 2.15 : 2.10;
  }

  // ---------- Composite 3D Firearm Models (V-47 Rifle, AWP Sniper, Deagle .50) ----------
  function buildWeaponModel(weaponItem, targetRenderer) {
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const wt = item.weaponType;
    const g = new THREE.Group();

    const skinMat = createWeaponMaterial(item, targetRenderer);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.42, metalness: 0.78 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2a3542, roughness: 0.36, metalness: 0.84 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x121820, roughness: 0.82, metalness: 0.12 });
    const accentGlow = new THREE.MeshBasicMaterial({ color: 0x65e7ff });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.92, depthWrite: false });

    const addFlash = (zPos, scale) => {
      const fg = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.036 * scale, 0), flashMat);
      s1.scale.set(1.2, 1.2, 2.2);
      const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.028 * scale, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
      s2.rotation.z = Math.PI / 4;
      s2.scale.set(1.6, 0.35, 1.4);
      fg.add(s1, s2);
      fg.position.set(0, 0.025, zPos);
      fg.visible = false;
      g.add(fg);
      g.userData.muzzleFlash = fg;
    };

    if (wt === 'awp') {
      // Long chassis & thumbhole stock (textured with equipped AWP skin)
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.056, 0.28), skinMat);
      receiver.position.set(0, 0.02, -0.04);
      const forend = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.046, 0.22), skinMat);
      forend.position.set(0, 0.016, -0.26);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.068, 0.22), skinMat);
      stock.position.set(0, 0.002, 0.19);
      const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.022, 0.11), gripMat);
      cheekRest.position.set(0, 0.044, 0.18);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.095, 0.044), gripMat);
      grip.position.set(0, -0.045, 0.055);
      grip.rotation.x = 0.24;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.085, 0.068), darkMetal);
      mag.position.set(0, -0.044, -0.075);

      // Long fluted sniper barrel + rectangular muzzle brake
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.56, 12), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.036, -0.44);
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.026, 0.065), darkMetal);
      brake.position.set(0, 0.036, -0.73);

      // Dual-ring elevated tactical scope
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.22), darkMetal);
      rail.position.set(0, 0.054, -0.06);
      const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.018, 12), darkMetal);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.set(0, 0.082, 0.01);
      const ring2 = ring1.clone();
      ring2.position.set(0, 0.082, -0.12);
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 14), darkMetal);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.082, -0.06);
      const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.075, 14), gunmetal);
      scopeBell.rotation.x = Math.PI / 2;
      scopeBell.position.set(0, 0.082, -0.21);
      const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.016, 0.055, 14), darkMetal);
      scopeEye.rotation.x = Math.PI / 2;
      scopeEye.position.set(0, 0.082, 0.085);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 14), new THREE.MeshBasicMaterial({ color: 0x35b8ff }));
      lens.position.set(0, 0.082, 0.114);

      // Bolt handle group for animated bolt-action cycling
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.028, 0.034, 0.04);
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.042, 8), gunmetal);
      boltStem.rotation.z = -Math.PI / 2.2;
      boltStem.position.set(0.018, -0.005, 0);
      const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), darkMetal);
      boltKnob.position.set(0.038, -0.011, 0);
      boltGroup.add(boltStem, boltKnob);
      g.userData.boltGroup = boltGroup;

      const trigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.048), darkMetal);
      trigGuard.position.set(0, -0.014, 0.002);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.006), gunmetal);
      trigger.position.set(0, -0.012, 0.008);
      trigger.rotation.x = 0.25;

      g.add(receiver, forend, stock, cheekRest, grip, mag, trigGuard, trigger, barrel, brake, rail, ring1, ring2, scopeTube, scopeBell, scopeEye, lens, boltGroup);
      addFlash(-0.79, 1.45);
    } else if (wt === 'deagle') {
      // Heavy iconic beveled Desert Eagle slide & barrel shroud
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.044, 0.23), skinMat);
      slide.position.set(0, 0.038, -0.065);
      const topRib = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.010, 0.22), skinMat);
      topRib.position.set(0, 0.062, -0.068);
      const lowerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.026, 0.19), darkMetal);
      lowerFrame.position.set(0, 0.008, -0.045);
      const barrelMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.035, 10), gunmetal);
      barrelMuzzle.rotation.x = Math.PI / 2;
      barrelMuzzle.position.set(0, 0.036, -0.188);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.105, 0.046), gripMat);
      grip.position.set(0, -0.048, 0.024);
      grip.rotation.x = 0.26;
      const trigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.048), darkMetal);
      trigGuard.position.set(0, -0.016, -0.026);
      // Glowing tritium iron sights
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.008), darkMetal);
      rearL.position.set(-0.010, 0.070, 0.036);
      const rearR = rearL.clone();
      rearR.position.x = 0.010;
      const dotL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), accentGlow);
      dotL.position.set(-0.010, 0.071, 0.041);
      const dotR = dotL.clone();
      dotR.position.x = 0.010;
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.010, 0.012), darkMetal);
      frontSight.position.set(0, 0.070, -0.165);

      g.add(slide, topRib, lowerFrame, barrelMuzzle, grip, trigGuard, rearL, rearR, dotL, dotR, frontSight);
      addFlash(-0.22, 1.15);
    } else {
      // V-47 Precision Surf Rifle
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.056, 0.24), skinMat);
      receiver.position.set(0, 0.022, -0.03);
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.046, 0.22), skinMat);
      handguard.position.set(0, 0.022, -0.25);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.062, 0.19), skinMat);
      stock.position.set(0, 0.008, 0.175);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.095, 0.040), gripMat);
      grip.position.set(0, -0.044, 0.045);
      grip.rotation.x = 0.26;
      // Curved 30rd magazine
      const magUpper = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.075, 0.052), darkMetal);
      magUpper.position.set(0, -0.042, -0.095);
      magUpper.rotation.x = -0.14;
      const magLower = new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.070, 0.050), darkMetal);
      magLower.position.set(0, -0.102, -0.114);
      magLower.rotation.x = -0.36;
      // Steel barrel + gas block + flash hider
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.28, 10), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.028, -0.42);
      const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.014, 0.055, 10), darkMetal);
      flashHider.rotation.x = Math.PI / 2;
      flashHider.position.set(0, 0.028, -0.57);
      // Top Picatinny rail + holographic reflex optic
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.34), darkMetal);
      rail.position.set(0, 0.054, -0.10);
      const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.014, 0.072), darkMetal);
      opticBase.position.set(0, 0.064, -0.01);
      const opticFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.028, 0.055), gunmetal);
      opticFrameL.position.set(-0.014, 0.082, -0.01);
      const opticFrameR = opticFrameL.clone();
      opticFrameR.position.x = 0.014;
      const opticTop = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.005, 0.055), gunmetal);
      opticTop.position.set(0, 0.096, -0.01);
      const holoDot = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 6, 6), accentGlow);
      holoDot.position.set(0, 0.081, -0.01);

      const trigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.048), darkMetal);
      trigGuard.position.set(0, -0.014, -0.006);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.006), gunmetal);
      trigger.position.set(0, -0.012, 0.000);
      trigger.rotation.x = 0.25;

      g.add(receiver, handguard, stock, grip, trigGuard, trigger, magUpper, magLower, barrel, flashHider, rail, opticBase, opticFrameL, opticFrameR, opticTop, holoDot);
      addFlash(-0.62, 1.0);
    }

    g.userData.weaponType = wt;
    return g;
  }

  // Exact anatomical grip constants & pre-allocated scratch math (zero GC per frame)
  const RIGHT_HAND_GRIP_ROLL = -1.42; // Rolls right hand so back faces +X, palm faces -X, thumb/index at +Y, fingers wrap grip front
  const _wAnchorLocal = new THREE.Vector3();
  const _wLeftPocketLocal = new THREE.Vector3();
  const _wWorldPos = new THREE.Vector3();
  const _wWorldQuat = new THREE.Quaternion();
  const _wLeftRelQuat = new THREE.Quaternion();
  const _wLeftEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _wOffsetVec = new THREE.Vector3();
  const _wInvRootMat = new THREE.Matrix4();
  const _wRootQuat = new THREE.Quaternion();
  const _wInvRootQuat = new THREE.Quaternion();

  const WEAPON_GRIP_SPECS = {
    rifle: {
      // Pistol grip center in weapon-local space -> locked into right hand's closed-finger palm pocket
      gripCenter: [0.0, -0.044, 0.045],
      rightPocket: [0.003, -0.029, -0.042],
      // Left hand cradles bottom of handguard
      supportAnchor: [0.0, -0.010, -0.255],
      leftPocket: [0.002, -0.025, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.42, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36 }
    },
    awp: {
      gripCenter: [0.0, -0.045, 0.055],
      rightPocket: [0.003, -0.029, -0.042],
      supportAnchor: [0.0, -0.014, -0.275],
      leftPocket: [0.002, -0.025, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.42, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36 }
    },
    deagle: {
      gripCenter: [0.0, -0.048, 0.024],
      rightPocket: [0.003, -0.029, -0.042],
      // Classic two-handed pistol hold: left palm wraps snugly over left side of grip & right fingertips
      supportAnchor: [-0.015, -0.046, 0.016],
      leftPocket: [0.0, -0.029, -0.036],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42 }
    }
  };

  function applyWeaponSocketTransform(mesh, wt) {
    if (!mesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    // Counter-roll the firearm upright inside rightHand.knifeSocket so rightHand wraps cleanly around the vertical pistol grip
    const counterRoll = -RIGHT_HAND_GRIP_ROLL;
    mesh.rotation.order = 'XYZ';
    mesh.rotation.set(0, 0, counterRoll);

    const cosR = Math.cos(counterRoll);
    const sinR = Math.sin(counterRoll);
    const gx = spec.gripCenter[0];
    const gy = spec.gripCenter[1];
    const gz = spec.gripCenter[2];
    const rotGx = gx * cosR - gy * sinR;
    const rotGy = gx * sinR + gy * cosR;

    mesh.position.set(
      spec.rightPocket[0] - rotGx,
      spec.rightPocket[1] - rotGy,
      spec.rightPocket[2] - gz
    );
  }

  /**
   * Solves exact left-hand position & orientation in rig.rootRig space so the left gloved hand
   * stays welded to the firearm's forend/handguard (or Deagle support grip) through recoil, sway,
   * surf banking, reload mag-swap drop, and 3D Armory preview inspection.
   */
  function lockSupportHandToWeapon(rigObj, weaponMesh, wt, reloadArc, inspEnv) {
    if (!rigObj || !weaponMesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;

    rigObj.rootRig.updateMatrixWorld(true);
    _wInvRootMat.copy(rigObj.rootRig.matrixWorld).invert();
    rigObj.rootRig.getWorldQuaternion(_wRootQuat);
    _wInvRootQuat.copy(_wRootQuat).invert();

    // Target support anchor on the weapon mesh -> rootRig local coordinates
    _wAnchorLocal.set(
      spec.supportAnchor[0],
      spec.supportAnchor[1] - reloadArc * 0.115,
      spec.supportAnchor[2] + reloadArc * (wt === 'deagle' ? 0.04 : 0.14)
    );
    _wWorldPos.copy(_wAnchorLocal).applyMatrix4(weaponMesh.matrixWorld).applyMatrix4(_wInvRootMat);

    // Weapon orientation in rootRig space
    weaponMesh.getWorldQuaternion(_wWorldQuat);
    _wWorldQuat.premultiply(_wInvRootQuat);

    // Left hand orientation relative to weapon
    _wLeftEuler.set(
      spec.leftRelEuler[0] - reloadArc * 0.35,
      spec.leftRelEuler[1] + reloadArc * 0.18,
      spec.leftRelEuler[2] + inspEnv * 0.14 - reloadArc * 0.28,
      'YXZ'
    );
    _wLeftRelQuat.setFromEuler(_wLeftEuler);
    _wWorldQuat.multiply(_wLeftRelQuat);

    // Shift leftHandPivot so its palm-cradle pocket lands exactly on the weapon support anchor
    _wLeftPocketLocal.set(spec.leftPocket[0], spec.leftPocket[1], spec.leftPocket[2]);
    _wOffsetVec.copy(_wLeftPocketLocal).applyQuaternion(_wWorldQuat);

    rigObj.leftHandPivot.position.copy(_wWorldPos).sub(_wOffsetVec);
    rigObj.leftHandPivot.quaternion.copy(_wWorldQuat);

    rigObj.setHandPose(rigObj.rightHand, spec.rightPose);
    rigObj.setHandPose(rigObj.leftHand, spec.leftPose);
  }

  // ---------- Main First-Person Viewmodel Overlay Pass ----------
  const ViewmodelSystem = (() => {
    let vmScene = null;
    let vmCamera = null;
    let studioEnv = null;
    let rig = null;
    let currentKnifeMesh = null;
    let currentWeaponMeshes = { rifle: null, awp: null, deagle: null };
    let currentWeaponItems = {
      rifle: KS.createStarterWeapon('rifle'),
      awp: KS.createStarterWeapon('awp'),
      deagle: KS.createStarterWeapon('deagle')
    };
    let activeSlot = 'knife'; // 'rifle' | 'awp' | 'deagle' | 'knife'
    let isScoped = false;
    let currentItem = null;
    let currentGlove = KS.createStarterGlove();
    let mainRenderer = null;

    const vmOffset = { offsetX: 0, offsetY: 0, offsetZ: 0, fov: 62 };

    const weaponAnim = {
      recoilKick: 0,
      recoilPitch: 0,
      flashTimer: 0,
      reloadT: 1,
      reloadDuration: 1.6,
      drawT: 1,
      drawDuration: 0.36,
      inspectT: 1,
      inspectDuration: 2.1,
      boltT: 1,
      slashT: 1
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

    function init(renderer) {
      if (vmScene) return;
      mainRenderer = renderer;
      vmScene = new THREE.Scene();
      vmCamera = new THREE.PerspectiveCamera(vmOffset.fov, innerWidth / innerHeight, 0.01, 12);
      vmScene.add(vmCamera);

      studioEnv = createStudioEnvMap(renderer);
      vmScene.environment = studioEnv;

      vmScene.add(new THREE.HemisphereLight(0xc8ecff, 0x1b2836, 1.3));
      const key = new THREE.DirectionalLight(0xfff4e6, 2.35);
      key.position.set(2.0, 3.0, 2.5);
      vmScene.add(key);
      const rim = new THREE.DirectionalLight(0x66e4ff, 1.5);
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
      for (const wt of ['rifle', 'awp', 'deagle']) {
        const m = currentWeaponMeshes[wt];
        if (m) m.visible = activeSlot === wt;
      }
      if (rig && rig.rootRig) {
        rig.rootRig.visible = !isScoped;
      }
    }

    function equipWeaponSkin(weaponItem) {
      if (!vmScene || !rig) return;
      const clean = KS.sanitizeWeaponItem(weaponItem);
      const wt = clean.weaponType;
      currentWeaponItems[wt] = clean;
      if (currentWeaponMeshes[wt]) {
        rig.knifeSocket.remove(currentWeaponMeshes[wt]);
        disposeGroupResources(currentWeaponMeshes[wt]);
        currentWeaponMeshes[wt] = null;
      }
      const mesh = buildWeaponModel(clean, mainRenderer);
      applyWeaponSocketTransform(mesh, wt);
      rig.knifeSocket.add(mesh);
      currentWeaponMeshes[wt] = mesh;
      syncActiveMeshVisibility();
    }

    function ensureWeaponMesh(wt) {
      if (!currentWeaponMeshes[wt] && rig && vmScene) {
        equipWeaponSkin(currentWeaponItems[wt] || KS.createStarterWeapon(wt));
      }
    }

    function setActiveSlot(slot, playDraw = true) {
      const valid = slot === 'rifle' || slot === 'awp' || slot === 'deagle' || slot === 'knife' ? slot : 'knife';
      const changed = activeSlot !== valid;
      activeSlot = valid;
      if (valid !== 'awp') isScoped = false;
      if (valid !== 'knife') ensureWeaponMesh(valid);
      syncActiveMeshVisibility();
      if (playDraw && changed) {
        if (valid === 'knife') {
          triggerDraw();
        } else {
          weaponAnim.drawT = 0;
          weaponAnim.drawDuration = valid === 'awp' ? 0.44 : valid === 'deagle' ? 0.30 : 0.36;
          weaponAnim.reloadT = 1;
          weaponAnim.inspectT = 1;
          weaponAnim.recoilKick = 0;
          weaponAnim.recoilPitch = 0;
          WeaponAudio.weaponDraw();
        }
      }
    }

    function triggerFireRecoil(slot) {
      const s = slot || activeSlot;
      if (s === 'knife') {
        weaponAnim.slashT = 0;
        CaseAudio.spinWhoosh(1.22);
        return;
      }
      weaponAnim.inspectT = 1;
      weaponAnim.recoilKick = s === 'awp' ? 0.088 : s === 'deagle' ? 0.058 : 0.030;
      weaponAnim.recoilPitch = s === 'awp' ? 0.24 : s === 'deagle' ? 0.20 : 0.075;
      weaponAnim.flashTimer = 0.048;
      if (s === 'awp') weaponAnim.boltT = 0;
      const mesh = currentWeaponMeshes[s];
      if (mesh && mesh.userData.muzzleFlash) {
        mesh.userData.muzzleFlash.visible = true;
        mesh.userData.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
      }
    }

    function triggerReload(duration) {
      if (activeSlot === 'knife') return;
      weaponAnim.inspectT = 1;
      weaponAnim.reloadT = 0;
      weaponAnim.reloadDuration = Math.max(0.6, Number(duration) || 1.6);
      WeaponAudio.reloadStart();
    }

    function setScoped(scoped) {
      isScoped = Boolean(scoped) && activeSlot === 'awp';
      if (rig && rig.rootRig) rig.rootRig.visible = !isScoped;
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
        if (weaponAnim.reloadT < 1) return null;
        weaponAnim.inspectT = 0;
        weaponAnim.inspectDuration = 2.05;
        WeaponAudio.weaponDraw();
        return { tier: 'normal', weaponType: activeSlot };
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

    function updateWeaponViewmodel(dt, bobX, bobY, isSurf) {
      const wt = activeSlot;
      const mesh = currentWeaponMeshes[wt];
      if (!mesh) return;

      weaponAnim.recoilKick = Math.max(0, weaponAnim.recoilKick - dt * 0.34);
      weaponAnim.recoilPitch = Math.max(0, weaponAnim.recoilPitch - dt * 1.15);
      if (weaponAnim.flashTimer > 0) {
        weaponAnim.flashTimer -= dt;
        if (weaponAnim.flashTimer <= 0 && mesh.userData.muzzleFlash) {
          mesh.userData.muzzleFlash.visible = false;
        }
      }
      if (weaponAnim.drawT < 1) weaponAnim.drawT = Math.min(1, weaponAnim.drawT + dt / weaponAnim.drawDuration);
      if (weaponAnim.reloadT < 1) weaponAnim.reloadT = Math.min(1, weaponAnim.reloadT + dt / weaponAnim.reloadDuration);
      if (weaponAnim.inspectT < 1) weaponAnim.inspectT = Math.min(1, weaponAnim.inspectT + dt / weaponAnim.inspectDuration);
      if (weaponAnim.boltT < 1) weaponAnim.boltT = Math.min(1, weaponAnim.boltT + dt / 0.85);

      const drawDip = (1 - smoothstep(0, 1, weaponAnim.drawT)) * 0.22;
      const reloadArc = weaponAnim.reloadT < 1 ? Math.sin(weaponAnim.reloadT * Math.PI) : 0;
      const inspEnv = weaponAnim.inspectT < 1 ? Math.sin(weaponAnim.inspectT * Math.PI) : 0;
      const inspWave = weaponAnim.inspectT < 1 ? Math.sin(weaponAnim.inspectT * Math.PI * 2) : 0;
      const boltArc = wt === 'awp' && weaponAnim.boltT < 1 ? Math.sin(weaponAnim.boltT * Math.PI) : 0;

      // Base right-hand pistol-grip posture: hand rolled -1.42 rad so fingers wrap vertical pistol grip
      let rx = (wt === 'deagle' ? 0.138 : wt === 'awp' ? 0.168 : 0.162) + bobX * 0.85 + swayX;
      let ry = (wt === 'deagle' ? -0.152 : wt === 'awp' ? -0.172 : -0.166) - bobY * 0.85 + swayY + crouchDip - drawDip - reloadArc * 0.06;
      let rz = (wt === 'deagle' ? -0.320 : wt === 'awp' ? -0.252 : -0.268) + weaponAnim.recoilKick;

      let rRotX = 0.03 + swayY * 1.1 + weaponAnim.recoilPitch - drawDip * 1.35 - reloadArc * 0.28 + inspEnv * 0.14;
      let rRotY = (wt === 'deagle' ? 0.06 : 0.05) + swayX * 1.3 + inspEnv * 0.62 - reloadArc * 0.22;
      let rRotZ = RIGHT_HAND_GRIP_ROLL - bankRoll * 0.85 + reloadArc * 0.38 + inspWave * 0.26 - boltArc * 0.14;

      if (isSurf) {
        ry += 0.012;
        rRotZ -= bankRoll * 0.24;
      }

      rig.rightHandPivot.position.set(rx, ry, rz);
      rig.rightHandPivot.rotation.set(rRotX, rRotY, rRotZ);

      applyWeaponSocketTransform(mesh, wt);
      lockSupportHandToWeapon(rig, mesh, wt, reloadArc, inspEnv);

      if (mesh.userData.boltGroup) {
        mesh.userData.boltGroup.rotation.z = boltArc * 0.85;
        mesh.userData.boltGroup.position.z = 0.04 + boltArc * 0.055;
      }
    }

    function update(dt, playerState) {
      if (!rig || !currentItem) return;
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
      setActiveSlot,
      getActiveSlot: () => activeSlot,
      triggerFireRecoil,
      triggerReload,
      setScoped,
      applySettings,
      triggerDraw,
      triggerInspect,
      addLookDelta,
      update,
      render,
      getCurrentItem: () => currentItem,
      getCurrentGlove: () => currentGlove,
      getCurrentWeaponItem: (wt) => currentWeaponItems[wt || activeSlot] || null,
      getInspectState: () => ({ active: animState.inspectT < 1 || weaponAnim.inspectT < 1, tier: animState.inspectTier, progress: animState.inspectT }),
      getGloveMaterials: () => (rig ? rig.gloveMaterials : null)
    };
  })();

  // ---------- Interactive 3D Armory Preview (Live Combo Hands+Knife OR Solo Blade) ----------
  const ArmoryPreview = (() => {
    let canvasEl = null;
    let pRenderer = null;
    let pScene = null;
    let pCamera = null;
    let pEnv = null;

    let soloPivot = null;
    let soloKnifeMesh = null;

    let comboPivot = null;
    let comboRig = null;
    let comboKnifeMesh = null;

    let previewMode = 'combo'; // 'combo' | 'solo'
    let previewKind = 'knife'; // 'knife' | 'weapon'
    let currentKnife = KS.createStarterKnife();
    let currentWeapon = KS.createStarterWeapon('rifle');
    let currentGlove = KS.createStarterGlove();

    let yaw = 0.08;
    let pitch = 0.06;
    let dragging = false;
    let lastX = 0, lastY = 0;

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

    let rafId = 0;
    let active = false;

    function ensureInit(canvas) {
      if (pRenderer && canvasEl === canvas) return;
      canvasEl = canvas;
      pRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !(typeof isSoftwareGl !== 'undefined' && isSoftwareGl),
        alpha: true,
        powerPreference: 'high-performance'
      });
      pRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pRenderer.toneMappingExposure = 1.18;

      pScene = new THREE.Scene();
      pCamera = new THREE.PerspectiveCamera(44, 1.6, 0.02, 20);
      pCamera.position.set(0, 0.02, 0.56);
      pCamera.lookAt(0, 0, 0);

      pEnv = createStudioEnvMap(pRenderer);
      pScene.environment = pEnv;

      pScene.add(new THREE.HemisphereLight(0xd2f1ff, 0x162230, 1.32));
      const key = new THREE.DirectionalLight(0xfff4e2, 2.55);
      key.position.set(1.8, 2.5, 2.2);
      pScene.add(key);
      const rim = new THREE.DirectionalLight(0x65e7ff, 1.85);
      rim.position.set(-2.2, 1.1, -1.5);
      pScene.add(rim);

      soloPivot = new THREE.Group();
      pScene.add(soloPivot);

      comboPivot = new THREE.Group();
      comboRig = buildHandsRig();
      // Center first-person hands & knife cleanly inside the turntable origin
      comboRig.rootRig.position.set(0.015, 0.145, 0.34);
      comboPivot.add(comboRig.rootRig);
      pScene.add(comboPivot);

      canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
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
        yaw += dx * 0.012;
        pitch = Math.max(-0.95, Math.min(0.95, pitch + dy * 0.01));
        renderOnce();
      });
      const stopDrag = () => { dragging = false; };
      canvas.addEventListener('pointerup', stopDrag);
      canvas.addEventListener('pointercancel', stopDrag);
    }

    function resize() {
      if (!pRenderer || !canvasEl || !pCamera) return;
      const rect = canvasEl.getBoundingClientRect();
      const w = Math.max(240, Math.floor(rect.width));
      const h = Math.max(160, Math.floor(rect.height));
      const dpr = (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 1 : Math.min(devicePixelRatio, 2);
      pRenderer.setPixelRatio(dpr);
      pRenderer.setSize(w, h, false);
      pCamera.aspect = w / h;
      pCamera.updateProjectionMatrix();
    }

    function rebuildModels() {
      if (!pRenderer) return;
      // Rebuild solo mesh (knife or firearm)
      if (soloKnifeMesh) {
        soloPivot.remove(soloKnifeMesh);
        disposeGroupResources(soloKnifeMesh);
        soloKnifeMesh = null;
      }
      soloKnifeMesh = previewKind === 'weapon'
        ? buildWeaponModel(currentWeapon, pRenderer)
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
      const fitScale = (previewKind === 'weapon' ? 0.44 : 0.38) / maxDim;
      soloKnifeMesh.scale.setScalar(fitScale);
      soloKnifeMesh.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
      soloPivot.add(soloKnifeMesh);

      // Rebuild combo mesh + apply gloves to preview hands
      if (comboKnifeMesh) {
        comboRig.knifeSocket.remove(comboKnifeMesh);
        disposeGroupResources(comboKnifeMesh);
        comboKnifeMesh = null;
      }
      comboRig.applyGlove(currentGlove, pRenderer);
      if (previewKind === 'weapon') {
        comboKnifeMesh = buildWeaponModel(currentWeapon, pRenderer);
        applyWeaponSocketTransform(comboKnifeMesh, currentWeapon.weaponType);
      } else {
        comboKnifeMesh = buildKnifeModel(currentKnife, pRenderer);
        applyContactGripSocket(comboKnifeMesh, currentKnife.knifeType);
      }
      comboRig.knifeSocket.add(comboKnifeMesh);

      applyModeVisibility();
    }

    function applyModeVisibility() {
      if (!soloPivot || !comboPivot || !pCamera) return;
      const isCombo = previewMode === 'combo';
      comboPivot.visible = isCombo;
      soloPivot.visible = !isCombo;
      if (isCombo) {
        pCamera.fov = previewKind === 'weapon' ? 44 : 44;
        if (previewKind === 'weapon') {
          const isPistol = currentWeapon && currentWeapon.weaponType === 'deagle';
          pCamera.position.set(0.03, 0.08, isPistol ? 0.50 : 0.78);
          pCamera.lookAt(0.0, -0.015, 0.0);
        } else {
          pCamera.position.set(0, 0.07, 0.35);
          pCamera.lookAt(0, 0.01, 0);
        }
      } else {
        pCamera.fov = 36;
        pCamera.position.set(0, 0.015, 0.47);
        pCamera.lookAt(0, 0, 0);
      }
      pCamera.updateProjectionMatrix();
    }

    function showCombo(canvas, knifeItem, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      previewKind = 'knife';
      currentKnife = KS.sanitizeKnifeItem(knifeItem || currentKnife || KS.createStarterKnife());
      currentGlove = KS.sanitizeGloveItem(gloveItem || currentGlove || KS.createStarterGlove());
      if (options.mode === 'solo' || options.mode === 'combo') {
        previewMode = options.mode;
      }
      rebuildModels();

      yaw = previewMode === 'combo' ? 0.0 : 0.28;
      pitch = previewMode === 'combo' ? 0.04 : 0.10;
      soloTrickT = 1;
      soloTrickCueMask = 0;
      comboAnimState.drawT = 1;
      comboAnimState.inspectT = 1;
      comboAnimState.inspectCueMask = 0;
      active = true;
      startLoop();
    }

    function showWeaponCombo(canvas, weaponItem, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      previewKind = 'weapon';
      currentWeapon = KS.sanitizeWeaponItem(weaponItem || currentWeapon || KS.createStarterWeapon('rifle'));
      currentGlove = KS.sanitizeGloveItem(gloveItem || currentGlove || KS.createStarterGlove());
      if (options.mode === 'solo' || options.mode === 'combo') {
        previewMode = options.mode;
      }
      rebuildModels();

      yaw = previewMode === 'combo' ? -0.78 : 0.22;
      pitch = previewMode === 'combo' ? 0.06 : 0.08;
      soloTrickT = 1;
      comboAnimState.drawT = 1;
      comboAnimState.inspectT = 1;
      active = true;
      startLoop();
    }

    function showKnife(canvas, knifeItem, gloveItem) {
      showCombo(canvas, knifeItem, gloveItem || currentGlove, { mode: previewMode });
    }

    function setMode(mode) {
      previewMode = mode === 'solo' ? 'solo' : 'combo';
      applyModeVisibility();
      yaw = previewMode === 'combo' ? (previewKind === 'weapon' ? -0.78 : 0.0) : 0.28;
      pitch = previewMode === 'combo' ? (previewKind === 'weapon' ? 0.06 : 0.04) : 0.10;
      renderOnce();
    }

    function playTrick(tier = 'normal') {
      if (previewKind === 'weapon') {
        comboAnimState.inspectT = 0;
        comboAnimState.inspectDuration = 1.9;
        soloTrickT = 0;
        WeaponAudio.weaponDraw();
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
        const insp = comboAnimState.inspectT < 1 ? Math.sin(comboAnimState.inspectT * Math.PI) : 0;
        const twist = comboAnimState.inspectT < 1 ? Math.sin(comboAnimState.inspectT * Math.PI * 2) : 0;

        const zCenter = wt === 'deagle' ? -0.26 : wt === 'awp' ? -0.09 : -0.13;
        const yCenter = wt === 'deagle' ? -0.182 : -0.198;
        comboRig.rightHandPivot.position.set(0.02, yCenter + insp * 0.016, zCenter);
        comboRig.rightHandPivot.rotation.set(0.04 + insp * 0.12, 0.04 + insp * 0.54, RIGHT_HAND_GRIP_ROLL + twist * 0.22);
        applyWeaponSocketTransform(comboKnifeMesh, wt);
        lockSupportHandToWeapon(comboRig, comboKnifeMesh, wt, 0, insp);
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
      if (!pRenderer || !pScene || !pCamera) return;
      if (previewMode === 'combo') {
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
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      if (previewMode === 'combo') {
        if (!dragging && comboAnimState.inspectT >= 1) {
          // Gentle subtle breathing sway around the optimal camera angle (3/4 side profile for firearms, forward surf angle for knives)
          const baseYaw = previewKind === 'weapon' ? -0.78 : 0.0;
          const swayAmp = previewKind === 'weapon' ? 0.20 : 0.28;
          yaw = baseYaw + Math.sin(now * 0.00075) * swayAmp;
        }
        updateComboRig(dt);
        if (comboPivot) {
          comboPivot.rotation.set(pitch, yaw, 0);
        }
      } else {
        if (!dragging) {
          yaw += dt * 0.42;
        }
        if (soloKnifeMesh && soloTrickT < 1) {
          soloTrickT = Math.min(1, soloTrickT + dt / 1.55);
          const t = soloTrickT;
          if (soloKnifeMesh.userData.bladePivot && soloKnifeMesh.userData.biteHandlePivot) {
            if (t < 0.45) {
              const u = t / 0.45;
              soloKnifeMesh.userData.bladePivot.rotation.z = Math.sin(u * Math.PI) * Math.PI;
              soloKnifeMesh.userData.biteHandlePivot.rotation.z = u * Math.PI * 2;
              soloPivot.rotation.z = -u * Math.PI * 2;
            } else {
              const u = (t - 0.45) / 0.55;
              soloKnifeMesh.userData.bladePivot.rotation.z = Math.sin(u * Math.PI) * 0.95;
              soloKnifeMesh.userData.biteHandlePivot.rotation.z = Math.sin(u * Math.PI) * 1.9;
              soloPivot.rotation.z = 0;
              if (t > 0.55 && !(soloTrickCueMask & 1)) {
                soloTrickCueMask |= 1;
                CaseAudio.balisongClack(0.95);
              }
            }
          } else {
            soloPivot.rotation.z = t * Math.PI * 2;
          }
        } else if (soloPivot) {
          soloPivot.rotation.z = 0;
          if (soloKnifeMesh && soloKnifeMesh.userData.bladePivot && soloKnifeMesh.userData.biteHandlePivot) {
            soloKnifeMesh.userData.bladePivot.rotation.z = 0;
            soloKnifeMesh.userData.biteHandlePivot.rotation.z = 0;
          }
        }
        if (soloPivot) {
          soloPivot.rotation.x = pitch;
          soloPivot.rotation.y = yaw;
        }
      }

      if (pRenderer && pScene && pCamera) {
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
      showKnife,
      setMode,
      getMode: () => previewMode,
      playTrick,
      resize,
      stop: stopLoop
    };
  })();

  root.ViewmodelSystem = ViewmodelSystem;
  root.ArmoryPreview = ArmoryPreview;
  root.CaseAudio = CaseAudio;
  root.WeaponAudio = WeaponAudio;
  root.renderKnifeThumbDataUrl = renderKnifeThumbDataUrl;
  root.renderGloveThumbDataUrl = renderGloveThumbDataUrl;
  root.renderWeaponThumbDataUrl = renderWeaponThumbDataUrl;
})(typeof self !== 'undefined' ? self : globalThis);
