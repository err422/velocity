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
    function coinChime(kind = 'earn') {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;
      const notes = kind === 'sell'
        ? [1046.5, 1318.51, 1567.98]
        : kind === 'buy'
          ? [659.25, 880]
          : [987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        const t0 = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(0.042, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 0.24);
      });
    }
    return { tick, reveal, bladeShing, balisongClack, spinWhoosh, mythicFlourish, coinChime, _getCtx: getCtx };
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
    function fireSmg() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.068, 'bandpass', 2100, 1.0, 0.20);
      noiseBurst(c, now, 0.035, 'highpass', 3400, 0.8, 0.12);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.055);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.068);
    }
    function fireShotgun() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.28, 'lowpass', 980, 0.65, 0.36);
      noiseBurst(c, now, 0.14, 'bandpass', 1650, 0.8, 0.24);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(125, now);
      sub.frequency.exponentialRampToValueAtTime(34, now + 0.22);
      sg.gain.setValueAtTime(0.32, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.25);
      // Crisp 12-gauge pump rack chik-chak
      [0.24, 0.38].forEach((offset, idx) => {
        noiseBurst(c, now + offset, 0.05, 'bandpass', idx === 0 ? 2200 : 2800, 1.8, 0.085);
      });
    }
    function firePistol() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.09, 'bandpass', 1750, 0.9, 0.20);
      noiseBurst(c, now, 0.04, 'highpass', 2900, 0.7, 0.12);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.075);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.082);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.088);
    }
    function fireSuppressed(slot) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const isHeavy = slot === 'awp' || slot === 'shotgun' || slot === 'deagle';
      noiseBurst(c, now, isHeavy ? 0.11 : 0.065, 'bandpass', isHeavy ? 1350 : 2400, 1.35, isHeavy ? 0.14 : 0.10);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHeavy ? 170 : 240, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.06);
      g.gain.setValueAtTime(isHeavy ? 0.13 : 0.085, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.075);
      // Mechanical bolt/slide click
      noiseBurst(c, now + 0.025, 0.024, 'highpass', 3600, 1.5, 0.04);
    }
    function fireWeapon(slot, opts) {
      if (opts && opts.suppressed) {
        fireSuppressed(slot);
        return;
      }
      if (slot === 'awp') fireAwp();
      else if (slot === 'deagle') fireDeagle();
      else if (slot === 'smg') fireSmg();
      else if (slot === 'shotgun') fireShotgun();
      else if (slot === 'pistol') firePistol();
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
    envScene.background = new THREE.Color(0x09131e);

    const panelGeo = new THREE.PlaneGeometry(8, 5);
    const stripGeo = new THREE.PlaneGeometry(11, 1.6);
    const addPanel = (geo, color, intensity, pos, rot) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pos[0], pos[1], pos[2]);
      m.rotation.set(rot[0], rot[1], rot[2]);
      envScene.add(m);
    };
    // Crisp high-contrast overhead softboxes + warm/cool specular edge strips for faceted CS:S bevels & CS2 metallic sheen
    addPanel(panelGeo, 0xf2faff, 3.4, [0, 6.5, 0.5], [Math.PI / 2, 0, 0]);
    addPanel(stripGeo, 0xffffff, 4.2, [0, 5.8, -3.5], [Math.PI / 2.6, 0, 0]);
    addPanel(panelGeo, 0xffe8c8, 2.85, [6.5, 2.6, 2.2], [0, -Math.PI / 2, 0]);
    addPanel(panelGeo, 0x6ae4ff, 2.45, [-6.5, 1.9, -2.0], [0, Math.PI / 2, 0]);
    addPanel(stripGeo, 0xd8f0ff, 2.4, [0, 2.2, 7.0], [0, Math.PI, 0]);
    addPanel(panelGeo, 0x223b52, 0.95, [0, -5.5, 0], [-Math.PI / 2, 0, 0]);

    const rt = pmrem.fromScene(envScene, 0.032);
    pmrem.dispose();
    panelGeo.dispose();
    stripGeo.dispose();
    return rt.texture;
  }

  function getProceduralTexSize() {
    return (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 256 : 512;
  }

  // ---------- Procedural Knife Skin PBR Texture Generator (Albedo + Roughness + Bump) ----------
  const skinCanvasCache = new Map();
  const gloveCanvasCache = new Map();
  const weaponCanvasCache = new Map();
  const thumbCache = new Map();

  function skinCacheKey(item) {
    return `${item.skinId}_${item.patternSeed}_${item.specialTag || ''}_${Math.round((item.floatValue || 0) * 50)}`;
  }

  function paintSkinToCanvases(item, size) {
    const res = size || getProceduralTexSize();
    const key = skinCacheKey(item) + '_' + res;
    if (skinCanvasCache.has(key)) return skinCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = res;
    roughCanvas.height = res;
    const rctx = roughCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = res;
    bumpCanvas.height = res;
    const bctx = bumpCanvas.getContext('2d');

    const skinId = item.skinId || 'vanilla';
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.08));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.05) / 0.72));
    const tag = item.specialTag || '';

    const aImg = actx.createImageData(res, res);
    const rImg = rctx.createImageData(res, res);
    const bImg = bctx.createImageData(res, res);
    const ad = aImg.data;
    const rd = rImg.data;
    const bd = bImg.data;

    const webCenters = [];
    if (skinId === 'crimson_web') {
      for (let i = 0; i < 3; i++) {
        webCenters.push({
          x: 0.14 + KS.hash2D(seed, i * 17 + 3, 211) * 0.72,
          y: 0.18 + KS.hash2D(seed, i * 29 + 7, 307) * 0.64,
          spokes: 7 + ((seed + i) % 3),
          rot: KS.hash2D(seed, i * 41, 131) * Math.PI * 2
        });
      }
    }

    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 90;
    const ox = KS.hash2D(seed, 11, 73) * 10;
    const oy = KS.hash2D(seed, 23, 89) * 10;

    for (let py = 0; py < res; py++) {
      const v = py / (res - 1);
      for (let px = 0; px < res; px++) {
        const u = px / (res - 1);
        const idx = (py * res + px) * 4;
        let r = 178, g = 188, b = 198;
        let rough = 52;
        let bump = 128;

        const grind = KS.fbm2D(u * 4.5, v * 58, 17, 2);

        if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          const patina = KS.fbm2D(u * 14 + ox, v * 14 + oy, seed + 71, 2);
          r = ch.r * (0.92 + patina * 0.14);
          g = ch.g * (0.92 + patina * 0.14);
          b = ch.b * (0.92 + patina * 0.14);
          rough = ch.isBlue ? 30 : ch.isGold ? 44 : 62;
          bump = 120 + patina * 24 + grind * 10;
        } else if (skinId === 'doppler') {
          // Deep CS2 Doppler smoky marble domain-warped swirls
          const wx = KS.fbm2D(u * 3.0 + ox, v * 3.0 + oy, seed + 13, 3);
          const wy = KS.fbm2D(u * 3.0 + ox + 4.3, v * 3.0 + oy + 2.9, seed + 29, 3);
          const sw = KS.fbm2D((u + (wx - 0.5) * 0.95) * 4.4 + ox, (v + (wy - 0.5) * 0.95) * 4.4 + oy, seed + 53, 4);
          const wisp = Math.sin((u * 5.2 + v * 2.8 + sw * 5.2) * Math.PI) * 0.5 + 0.5;
          const smoke = KS.fbm2D(u * 7.5 + wy * 1.4, v * 7.5 + wx * 1.4, seed + 97, 3);
          const t = Math.max(0, Math.min(1, sw * 0.62 + wisp * 0.28 + smoke * 0.10));
          const hot = Math.pow(t, 1.55);
          if (tag === 'RUBY') {
            r = 126 + hot * 129; g = 6 + hot * 36; b = 18 + hot * 48; rough = 18 + (1 - t) * 18;
          } else if (tag === 'SAPPHIRE') {
            r = 10 + hot * 44; g = 34 + hot * 124; b = 152 + hot * 103; rough = 18 + (1 - t) * 18;
          } else if (tag === 'BLACK PEARL') {
            r = 20 + hot * 92 + smoke * 22; g = 12 + hot * 40; b = 34 + hot * 114; rough = 18 + (1 - t) * 20;
          } else if (tag === 'PHASE 2') {
            // Vivid CS2 P2: rich galaxy pink/magenta over smoky violet-black
            const pinkZone = Math.max(0, Math.min(1, (t - 0.22) * 1.35));
            r = 28 + pinkZone * 220; g = 10 + pinkZone * 46; b = 46 + pinkZone * 138; rough = 22 + (1 - pinkZone) * 18;
          } else if (tag === 'PHASE 4') {
            // Vivid CS2 P4: electric sapphire-blue plumes over obsidian
            const blueZone = Math.max(0, Math.min(1, (t - 0.24) * 1.35));
            r = 12 + blueZone * 32; g = 24 + blueZone * 116; b = 52 + blueZone * 200; rough = 22 + (1 - blueZone) * 18;
          } else if (tag === 'PHASE 3') {
            // CS2 P3: deep blue + emerald-cyan & smoky black plumes
            const teal = Math.max(0, Math.min(1, (smoke - 0.35) * 1.8));
            r = 12 + t * 24; g = 28 + t * 92 + teal * 62; b = 46 + t * 156; rough = 24 + (1 - t) * 18;
          } else {
            // CS2 P1: smoky obsidian-violet with glowing crimson-magenta ribbons
            const ruby = Math.max(0, Math.min(1, (t - 0.34) * 1.65));
            r = 22 + ruby * 176; g = 10 + ruby * 22; b = 36 + t * 88; rough = 24 + (1 - t) * 18;
          }
          bump = 122 + wisp * 12 + grind * 8;
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.14 - (1 - shift) * 0.22 + (v - 0.5) * 0.14));
          if (pos < 0.17) {
            const t = pos / 0.17;
            r = 198 + t * 48; g = 204 + t * 14; b = 214 - t * 76;
          } else if (pos < 0.48) {
            const t = (pos - 0.17) / 0.31;
            r = 250; g = 198 - t * 124; b = 64 + t * 112;
          } else if (pos < 0.78) {
            const t = (pos - 0.48) / 0.30;
            r = 248 - t * 118; g = 74 - t * 26; b = 178 + t * 62;
          } else {
            const t = (pos - 0.78) / 0.22;
            r = 130 - t * 42; g = 48 - t * 12; b = 240 + t * 14;
          }
          rough = 20;
          bump = 124 + grind * 10;
        } else if (skinId === 'marble_fade') {
          const wave = KS.fbm2D(u * 2.6 + ox, v * 2.6 + oy, seed + 17, 3);
          const band = (u * 1.32 + (wave - 0.5) * 0.48 + (seed % 100) * 0.01) % 1;
          if (tag === 'FIRE & ICE') {
            const t = Math.sin((u * 1.75 + wave * 0.95) * Math.PI) * 0.5 + 0.5;
            r = 16 + t * 230; g = 24 + (1 - Math.abs(t - 0.5) * 2) * 28; b = 248 - t * 214;
          } else if (band < 0.34) {
            const t = band / 0.34;
            r = 238 - t * 212; g = 28 + t * 62; b = 40 + t * 206;
          } else if (band < 0.68) {
            const t = (band - 0.34) / 0.34;
            r = 26 + t * 222; g = 90 + t * 116; b = 246 - t * 204;
          } else {
            const t = (band - 0.68) / 0.32;
            r = 248 - t * 10; g = 206 - t * 178; b = 42 - t * 2;
          }
          rough = 22;
          bump = 124 + grind * 10;
        } else if (skinId === 'tiger_tooth') {
          // Authentic organic tapered tiger stripes over anodized molten gold
          const warp1 = KS.fbm2D(u * 3.8 + ox, v * 3.8 + oy, seed + 37, 3);
          const warp2 = KS.fbm2D(u * 9.0 + ox, v * 5.0 + oy, seed + 61, 2);
          const phase = (u * 13.5 + v * 3.8 + warp1 * 2.6 + (warp2 - 0.5) * 0.6) * Math.PI;
          const stripeVal = Math.sin(phase);
          const taper = 0.38 + 0.24 * Math.sin(v * Math.PI * 2.2 + warp1 * 3.0);
          if (stripeVal > taper) {
            const depth = Math.min(1, (stripeVal - taper) * 3.5);
            r = 76 - depth * 30; g = 48 - depth * 22; b = 14 - depth * 6;
            rough = 54 + depth * 20;
            bump = 104 - depth * 18;
          } else {
            const sheen = 0.86 + 0.14 * KS.fbm2D(u * 8, v * 8, seed + 5, 2);
            r = 246 * sheen; g = 188 * sheen; b = 38 * sheen;
            rough = 24;
            bump = 132 + grind * 12;
          }
        } else if (skinId === 'damascus') {
          // Crisp high-contrast folded Damascus steel topographic bands + acid-etch bump
          const w1 = KS.fbm2D(u * 3.2 + ox, v * 3.2 + oy, seed + 7, 4);
          const w2 = KS.fbm2D(u * 7.2 + w1 * 2.5, v * 7.2 + w1 * 2.5, seed + 43, 3);
          const wave = Math.sin((u * 5.8 + v * 4.8 + w1 * 5.8 + w2 * 1.5) * Math.PI * 2) * 0.5 + 0.5;
          const bands = Math.pow(wave, 0.82);
          const lum = 88 + bands * 144;
          r = lum * 0.96; g = lum; b = lum * 1.06;
          rough = 30 + (1 - bands) * 44;
          bump = 96 + bands * 64;
        } else if (skinId === 'slaughter') {
          // Authentic CS2 Slaughter: angled metallic crimson zebra/diamond/heart anodized foil
          const angle = 0.62 + (seed % 7) * 0.14;
          const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
          const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
          const w = KS.fbm2D(su * 5.0, sv * 5.0, seed + 23, 2);
          const zebra = Math.sin((su * 14.5 + Math.sin(sv * 8.5 + w * 2.0) * 1.15) * Math.PI) * 0.5 + 0.5;
          const diamond = Math.pow(Math.abs(Math.sin(su * 5.2) * Math.sin(sv * 5.2)), 0.75);
          const band = Math.min(1, zebra * 0.58 + diamond * 0.52);
          // Silver-rose metallic specular crest on high peaks, deep blood crimson in valleys
          r = 98 + band * 150;
          g = 12 + Math.pow(band, 1.8) * 78;
          b = 22 + Math.pow(band, 1.7) * 76;
          rough = 26 + (1 - band) * 34;
          bump = 114 + band * 28;
        } else if (skinId === 'crimson_web') {
          const n = KS.fbm2D(u * 12, v * 12, seed + 19, 2);
          const mesh = ((Math.floor(u * 64) + Math.floor(v * 64)) & 1) ? 0.96 : 1.04;
          r = (156 + n * 42) * mesh; g = (14 + n * 12) * mesh; b = (20 + n * 14) * mesh;
          rough = 72;
          bump = 122 + (mesh > 1 ? 8 : -8);
        } else if (skinId === 'emberstrike') {
          const flow = KS.fbm2D(u * 5 + ox, v * 4 + oy, seed + 83, 4);
          const crackle = KS.fbm2D(u * 17 + ox, v * 12 + oy, seed + 127, 3);
          const vein = Math.sin((u * 8.5 + v * 3.2 + flow * 5.8) * Math.PI);
          const heat = Math.max(0, Math.min(1, (vein * 0.34 + crackle * 0.82 + flow * 0.22) - 0.82));
          const glow = Math.pow(heat, 1.25);
          r = 22 + flow * 24 + glow * 226;
          g = 26 + flow * 18 + glow * 88;
          b = 34 + flow * 22 + glow * 25;
          rough = 72 - glow * 48;
          bump = 104 + crackle * 40 + glow * 48;
        } else if (skinId === 'arctic_veil') {
          const frost = KS.fbm2D(u * 8 + ox, v * 8 + oy, seed + 151, 4);
          const facet = Math.abs(Math.sin((u * 9.0 + v * 6.5 + frost * 2.4) * Math.PI));
          const ice = Math.max(0, Math.min(1, frost * 0.58 + facet * 0.42));
          const base = 106 + ice * 116;
          r = base * 0.70;
          g = base * 0.92 + facet * 12;
          b = Math.min(255, base * 1.10 + 18);
          rough = 46 + (1 - ice) * 26;
          bump = 96 + facet * 68 + grind * 10;
        } else if (skinId === 'ultraviolet') {
          const grain = KS.fbm2D(u * 26, v * 26, seed + 9, 2);
          r = 24 + grain * 16; g = 26 + grain * 16; b = 34 + grain * 20;
          if (v > 0.80) {
            r = 92 + grain * 26; g = 50 + grain * 18; b = 212 + grain * 32; rough = 48;
            bump = 132 + grain * 10;
          } else {
            rough = 148;
            bump = 116 + grain * 24;
          }
        } else {
          // Vanilla directional factory-grind brushed steel
          const lum = 158 + grind * 62;
          r = lum * 0.96; g = lum; b = lum * 1.06;
          rough = 42 + (1 - grind) * 28;
          bump = 112 + grind * 34;
        }

        if (wearFactor > 0.01 && skinId !== 'vanilla') {
          const scratchNoise = KS.fbm2D(u * 15 + 3.1, v * 15 + 7.4, seed + 313, 3);
          const edgeMask = Math.max(0, 1 - v * 3.4) * 0.58 + Math.max(0, (u - 0.72) * 2.2) * 0.35;
          const threshold = 0.88 - wearFactor * 0.62 - edgeMask * wearFactor * 0.45;
          if (scratchNoise > threshold) {
            const k = Math.min(1, (scratchNoise - threshold) * 5.2);
            r = r * (1 - k) + 138 * k;
            g = g * (1 - k) + 144 * k;
            b = b * (1 - k) + 152 * k;
            rough = Math.min(240, rough + k * 95);
            bump = Math.max(24, bump - k * 58);
          } else {
            const dark = 1 - wearFactor * 0.20;
            r *= dark; g *= dark; b *= dark;
            rough = Math.min(230, rough + wearFactor * 34);
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(14, Math.min(245, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;

        const bv = Math.max(0, Math.min(255, Math.round(bump)));
        bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);
    bctx.putImageData(bImg, 0, 0);

    if (skinId === 'crimson_web') {
      const drawWebs = (ctx2d, strokeStyle, lw) => {
        ctx2d.save();
        ctx2d.strokeStyle = strokeStyle;
        ctx2d.lineWidth = lw;
        for (const wc of webCenters) {
          const cx = wc.x * res;
          const cy = wc.y * res;
          const maxR = res * 0.46;
          for (let s = 0; s < wc.spokes; s++) {
            const ang = wc.rot + (s / wc.spokes) * Math.PI * 2;
            ctx2d.beginPath();
            ctx2d.moveTo(cx, cy);
            ctx2d.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
            ctx2d.stroke();
          }
          for (let ring = 1; ring <= 5; ring++) {
            const rr = (ring / 5) * maxR;
            ctx2d.beginPath();
            for (let s = 0; s < wc.spokes; s++) {
              const a0 = wc.rot + (s / wc.spokes) * Math.PI * 2;
              const a1 = wc.rot + ((s + 1) / wc.spokes) * Math.PI * 2;
              const am = (a0 + a1) * 0.5;
              const x0 = cx + Math.cos(a0) * rr;
              const y0 = cy + Math.sin(a0) * rr;
              const xm = cx + Math.cos(am) * (rr * 0.88);
              const ym = cy + Math.sin(am) * (rr * 0.88);
              const x1 = cx + Math.cos(a1) * rr;
              const y1 = cy + Math.sin(a1) * rr;
              if (s === 0) ctx2d.moveTo(x0, y0);
              ctx2d.quadraticCurveTo(xm, ym, x1, y1);
            }
            ctx2d.closePath();
            ctx2d.stroke();
          }
        }
        ctx2d.restore();
      };
      drawWebs(actx, 'rgba(10, 8, 12, 0.90)', Math.max(1.3, res / 170));
      drawWebs(bctx, 'rgba(60, 60, 60, 0.85)', Math.max(1.4, res / 160));
    }

    const result = { albedoCanvas, roughCanvas, bumpCanvas };
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
    case_hardened:  { palm: 0x18212b, knuckle: 0x2e88d8, cuff: 0xe6b85c, cuffEmissive: 0x2a1e08, sleeve: 0x111720, metal: 0.58, rough: 0.40 },
    vice:           { palm: 0x181c24, knuckle: 0x28e8ff, cuff: 0xff46d4, cuffEmissive: 0x480d3a, sleeve: 0x111622, metal: 0.16, rough: 0.66 },
    pandoras_box:   { palm: 0x151324, knuckle: 0x2cd8d8, cuff: 0x8a52ff, cuffEmissive: 0x291154, sleeve: 0x0f0e1a, metal: 0.22, rough: 0.64 },
    hedge_maze:     { palm: 0x19261e, knuckle: 0xf0f6f2, cuff: 0x2ae874, cuffEmissive: 0x093a1e, sleeve: 0x111a14, metal: 0.14, rough: 0.68 },
    slingshot:      { palm: 0xded0bc, knuckle: 0x1e1b1d, cuff: 0xf03838, cuffEmissive: 0x420b10, sleeve: 0x161416, metal: 0.14, rough: 0.70 },
    crimson_kimono: { palm: 0x171417, knuckle: 0x1e1d22, cuff: 0xe6293a, cuffEmissive: 0x40090e, sleeve: 0x111014, metal: 0.24, rough: 0.68 },
    emerald_web:    { palm: 0x101c16, knuckle: 0x16241c, cuff: 0x25de72, cuffEmissive: 0x083d1d, sleeve: 0x0e1511, metal: 0.22, rough: 0.68 },
    fade:           { palm: 0x1d1d26, knuckle: 0x342a48, cuff: 0xff6ad5, cuffEmissive: 0x3b1232, sleeve: 0x12131c, metal: 0.44, rough: 0.46 },
    leather:        { palm: 0x4a2f1d, knuckle: 0x70482b, cuff: 0xa26d42, cuffEmissive: 0x1a0e06, sleeve: 0x181412, metal: 0.08, rough: 0.84 },
    slaughter:      { palm: 0x2a1419, knuckle: 0x9c1e2e, cuff: 0xe03a52, cuffEmissive: 0x3b0b13, sleeve: 0x161114, metal: 0.18, rough: 0.68 },
    cobalt_skulls:  { palm: 0x101c32, knuckle: 0x2864d8, cuff: 0x68baff, cuffEmissive: 0x0b254a, sleeve: 0x0d1522, metal: 0.14, rough: 0.76 },
    overprint:      { palm: 0x0d2026, knuckle: 0x1aa8a8, cuff: 0x44f4e8, cuffEmissive: 0x093a38, sleeve: 0x0b161a, metal: 0.14, rough: 0.74 },
    breachline:     { palm: 0x15191b, knuckle: 0x343d42, cuff: 0xf3a43b, cuffEmissive: 0x4b2a08, sleeve: 0x0d1116, metal: 0.28, rough: 0.72 },
    stormgrid:      { palm: 0x101b30, knuckle: 0x285a9a, cuff: 0x4bd9ff, cuffEmissive: 0x0b3552, sleeve: 0x0c1424, metal: 0.22, rough: 0.68 },
    eclipse_mantle: { palm: 0x15171a, knuckle: 0x39372f, cuff: 0xc69a55, cuffEmissive: 0x3d2b12, sleeve: 0x0d1517, metal: 0.42, rough: 0.54 }
  });

  function gloveCacheKey(item) {
    const gt = (item && item.gloveType) || 'standard';
    const sk = (item && item.skinId) || 'tactical_slate';
    const sd = (item && item.patternSeed) || 0;
    const fl = Math.round(((item && item.floatValue) || 0.08) * 50);
    return `glv_${gt}_${sk}_${sd}_${fl}`;
  }

  function paintGloveToCanvases(gloveItem, size) {
    const res = size || getProceduralTexSize();
    const item = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
    const key = gloveCacheKey(item) + '_' + res;
    if (gloveCanvasCache.has(key)) return gloveCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = res;
    roughCanvas.height = res;
    const rctx = roughCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = res;
    bumpCanvas.height = res;
    const bctx = bumpCanvas.getContext('2d');

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.08));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.06) / 0.72));
    const palette = GLOVE_PALETTES[skinId] || GLOVE_PALETTES.tactical_slate;

    const aImg = actx.createImageData(res, res);
    const rImg = rctx.createImageData(res, res);
    const bImg = bctx.createImageData(res, res);
    const ad = aImg.data;
    const rd = rImg.data;
    const bd = bImg.data;

    const ox = KS.hash2D(seed, 13, 59) * 10;
    const oy = KS.hash2D(seed, 29, 83) * 10;
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;

    for (let py = 0; py < res; py++) {
      const v = py / (res - 1);
      for (let px = 0; px < res; px++) {
        const u = px / (res - 1);
        const idx = (py * res + px) * 4;

        // Tactical athletic mesh / ballistic fabric twill weave
        const wx = Math.floor(u * 56);
        const wy = Math.floor(v * 56);
        const twill = ((wx + wy) % 4 < 2) ? 1.05 : 0.94;
        const hexMesh = Math.sin(u * 48 * Math.PI) * Math.sin(v * 48 * Math.PI);
        const micro = KS.fbm2D(u * 20, v * 20, seed + 17, 2);
        let r = 34, g = 42, b = 52;
        let rough = 185;
        let bump = 128 + (twill > 1 ? 14 : -14);

        if (skinId === 'tactical_slate') {
          r = (28 + micro * 16) * twill;
          g = (36 + micro * 18) * twill;
          b = (46 + micro * 22) * twill;
          rough = 190;
        } else if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          r = ch.r * (0.90 + micro * 0.14);
          g = ch.g * (0.90 + micro * 0.14);
          b = ch.b * (0.90 + micro * 0.14);
          rough = ch.isBlue ? 84 : 116;
          bump = 124 + micro * 22;
        } else if (skinId === 'vice') {
          // Authentic CS2 Sport Gloves | Vice: sharp neon pink & electric cyan athletic blocks with black structural trim
          const diag = u * 0.92 + v * 0.68 + (seed % 7) * 0.04;
          const border = Math.abs((diag * 1.9) % 1 - 0.5);
          if (border < 0.065) {
            r = (22 + micro * 12) * twill; g = (24 + micro * 14) * twill; b = (32 + micro * 16) * twill;
            rough = 195; bump = 104;
          } else if (Math.sin(diag * Math.PI * 1.9) > -0.05) {
            // Vivid hot neon pink/magenta mesh
            const hm = 0.94 + hexMesh * 0.07;
            r = (246 + micro * 10) * hm; g = (44 + micro * 20) * hm; b = (176 + micro * 30) * hm;
            rough = 152; bump = 132 + hexMesh * 20;
          } else {
            // Electric surf cyan panel
            const hm = 0.94 + hexMesh * 0.07;
            r = (28 + micro * 20) * hm; g = (218 + micro * 26) * hm; b = (248 + micro * 8) * hm;
            rough = 150; bump = 132 + hexMesh * 20;
          }
        } else if (skinId === 'pandoras_box') {
          // Authentic CS2 Pandora's Box: deep royal purple diamond mesh + bright aquamarine/teal geometric framing
          const du = (u * 11 + ox * 0.2) % 1;
          const dv = (v * 11 + oy * 0.2) % 1;
          const diamondDist = Math.abs(du - 0.5) + Math.abs(dv - 0.5);
          const diagBand = Math.abs(((u * 0.85 - v * 0.65 + (seed % 9) * 0.07) * 2.2) % 1 - 0.5);
          if (diagBand < 0.085) {
            // Vibrant aquamarine/teal geometric accent framing
            r = (32 + micro * 18) * twill; g = (210 + micro * 28) * twill; b = (206 + micro * 30) * twill;
            rough = 148; bump = 144;
          } else if (diagBand < 0.13) {
            // Obsidian border seam
            r = 20; g = 18; b = 30; rough = 200; bump = 96;
          } else {
            const pCell = diamondDist < 0.36 ? 1.15 : 0.72;
            r = (92 + micro * 28) * pCell;
            g = (44 + micro * 18) * pCell;
            b = (194 + micro * 42) * pCell;
            rough = 150; bump = 120 + (diamondDist < 0.36 ? 26 : -14);
          }
        } else if (skinId === 'hedge_maze') {
          // Authentic CS2 Hedge Maze: digitized geometric green maze lines over dark forest & neon lime
          const gx = Math.floor((u * 14 + ox * 0.3));
          const gy = Math.floor((v * 14 + oy * 0.3));
          const fx = (u * 14 + ox * 0.3) - gx;
          const fy = (v * 14 + oy * 0.3) - gy;
          const cellHash = KS.hash2D(gx + seed, gy, 193);
          const onMazeWall = cellHash > 0.5
            ? (Math.abs(fx - 0.5) < 0.16 || (fy < 0.24 && fx > 0.34))
            : (Math.abs(fy - 0.5) < 0.16 || (fx < 0.24 && fy > 0.34));
          const whiteStripe = Math.abs(((u * 1.4 - v * 1.1 + (seed % 7) * 0.08) % 1) - 0.5) < 0.055;
          if (whiteStripe) {
            r = (232 + micro * 16) * twill; g = (240 + micro * 12) * twill; b = (234 + micro * 14) * twill;
            rough = 158; bump = 142;
          } else if (onMazeWall) {
            r = (48 + micro * 22) * twill; g = (218 + micro * 30) * twill; b = (94 + micro * 24) * twill;
            rough = 154; bump = 148;
          } else {
            r = (16 + micro * 14) * twill; g = (76 + micro * 24) * twill; b = (42 + micro * 18) * twill;
            rough = 186; bump = 112;
          }
        } else if (skinId === 'slingshot') {
          // Authentic CS2 Slingshot: high-energy scarlet-orange motorsport panels + crisp white & dark charcoal trim
          const split = v + (u - 0.5) * 0.22;
          if (split < 0.56) {
            r = (224 + micro * 24) * twill; g = (42 + micro * 18) * twill; b = (40 + micro * 18) * twill;
            rough = 160; bump = 132 + hexMesh * 16;
          } else if (split < 0.65) {
            r = (24 + micro * 12) * twill; g = (24 + micro * 14) * twill; b = (30 + micro * 14) * twill;
            rough = 196; bump = 104;
          } else if (split < 0.75) {
            r = (238 + micro * 14) * twill; g = (236 + micro * 14) * twill; b = (230 + micro * 14) * twill;
            rough = 164; bump = 138;
          } else {
            r = (216 + micro * 22) * twill; g = (200 + micro * 20) * twill; b = (176 + micro * 20) * twill;
            rough = 184; bump = 122 + micro * 16;
          }
        } else if (skinId === 'crimson_kimono') {
          // Authentic CS2 Crimson Kimono: diagonal red Japanese diamond brocade over matte tactical graphite
          const shift = (KS.hash2D(seed, 9, 41) - 0.5) * 0.55;
          const d1 = Math.abs(Math.sin((u * 13 + v * 13) * Math.PI));
          const d2 = Math.abs(Math.sin((u * 13 - v * 13) * Math.PI));
          const diamond = Math.pow(d1 * d2, 0.72);
          const redZone = (u * 0.72 + v * 0.38 + shift + (micro - 0.5) * 0.18) > 0.38;
          if (redZone) {
            r = (158 + diamond * 94) * twill;
            g = (14 + diamond * 26) * twill;
            b = (22 + diamond * 28) * twill;
            rough = 158; bump = 116 + diamond * 38;
          } else {
            r = (26 + diamond * 24) * twill;
            g = (28 + diamond * 24) * twill;
            b = (34 + diamond * 28) * twill;
            rough = 192; bump = 114 + diamond * 22;
          }
        } else if (skinId === 'emerald_web') {
          r = (18 + micro * 20) * twill;
          g = (148 + micro * 50) * twill;
          b = (70 + micro * 26) * twill;
          rough = 158; bump = 128 + hexMesh * 18;
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.08 + (v - 0.5) * 0.32 - (1 - shift) * 0.2));
          if (pos < 0.34) {
            const t = pos / 0.34;
            r = 248; g = 198 - t * 116; b = 64 + t * 102;
          } else if (pos < 0.70) {
            const t = (pos - 0.34) / 0.36;
            r = 244 - t * 114; g = 82 - t * 28; b = 166 + t * 68;
          } else {
            const t = (pos - 0.70) / 0.30;
            r = 130 - t * 44; g = 54 - t * 12; b = 234 + t * 18;
          }
          r *= (0.93 + twill * 0.07);
          g *= (0.93 + twill * 0.07);
          b *= (0.93 + twill * 0.07);
          rough = 104;
        } else if (skinId === 'leather') {
          const grain = KS.fbm2D(u * 14 + ox, v * 30 + oy, seed + 7, 3);
          const pebble = KS.fbm2D(u * 44, v * 44, seed + 59, 2);
          const edgeDist = Math.abs(((v * 7.5) % 1) - 0.5);
          const stitch = (edgeDist > 0.43 && edgeDist < 0.48 && (Math.floor(u * 32) & 1) === 0);
          const seamCrease = edgeDist > 0.48;
          if (seamCrease) {
            r = 56; g = 32; b = 18; rough = 228; bump = 64;
          } else if (stitch) {
            r = 224; g = 196; b = 156; rough = 155; bump = 196;
          } else {
            r = 112 + grain * 54 + pebble * 14;
            g = 66 + grain * 34 + pebble * 10;
            b = 36 + grain * 22 + pebble * 6;
            rough = 204 - grain * 28;
            bump = 110 + pebble * 36;
          }
        } else if (skinId === 'slaughter') {
          const angle = 0.62 + (seed % 7) * 0.14;
          const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
          const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
          const zebra = Math.sin((su * 14 + Math.sin(sv * 8) * 0.95) * Math.PI) * 0.5 + 0.5;
          const diamond = Math.abs(Math.sin(su * 5) * Math.sin(sv * 5));
          const mix = Math.min(1, zebra * 0.62 + diamond * 0.5);
          r = (104 + mix * 136) * twill;
          g = (14 + mix * 48) * twill;
          b = (22 + mix * 52) * twill;
          rough = 156;
        } else if (skinId === 'cobalt_skulls') {
          const fold = Math.sin((u * 4 + v * 12) * Math.PI) * 0.5 + 0.5;
          const swirl = KS.fbm2D(u * 5 + ox, v * 5 + oy, seed + 23, 3);
          r = (20 + swirl * 28) * twill;
          g = (66 + swirl * 68) * twill;
          b = (164 + swirl * 84) * twill;
          rough = 184;
          bump = 108 + fold * 36 + (twill > 1 ? 8 : -8);
        } else if (skinId === 'overprint') {
          const chevron = Math.sin(((u * 10 + Math.abs(v - 0.5) * 9) + (seed % 9) * 0.2) * Math.PI);
          const sub = Math.sin((u * 20 - v * 12) * Math.PI);
          if (chevron > 0.18) {
            r = (36 + micro * 24) * twill;
            g = (220 + micro * 30) * twill;
            b = (212 + micro * 32) * twill;
            bump = 142;
          } else if (sub > 0.45) {
            r = (18 + micro * 16) * twill;
            g = (132 + micro * 28) * twill;
            b = (146 + micro * 28) * twill;
            bump = 124;
          } else {
            r = (14 + micro * 12) * twill;
            g = (42 + micro * 18) * twill;
            b = (54 + micro * 20) * twill;
            bump = 108;
          }
          rough = 178;
        } else if (skinId === 'breachline') {
          const grain = KS.fbm2D(u * 34 + ox, v * 24 + oy, seed + 101, 3);
          const hazard = Math.abs(Math.sin((u * 7.5 + v * 1.3 + grain * 0.8) * Math.PI));
          const panel = Math.abs(((u * 1.4 + v * 0.8 + seed * 0.001) % 1) - 0.5);
          if (hazard > 0.76 && panel < 0.34) {
            r = 238 + grain * 12; g = 148 + grain * 32; b = 42 + grain * 16;
            rough = 142; bump = 160;
          } else if (panel > 0.43) {
            r = (18 + grain * 20) * twill; g = (24 + grain * 22) * twill; b = (29 + grain * 22) * twill;
            rough = 212; bump = 102 + grain * 18;
          } else {
            r = (52 + grain * 24) * twill; g = (61 + grain * 22) * twill; b = (64 + grain * 18) * twill;
            rough = 188; bump = 132 + hexMesh * 12;
          }
        } else if (skinId === 'stormgrid') {
          const gx = Math.abs(Math.sin((u * 22 + seed * 0.01) * Math.PI));
          const gy = Math.abs(Math.sin((v * 18 + seed * 0.02) * Math.PI));
          const grid = Math.max(gx, gy);
          const storm = KS.fbm2D(u * 6 + ox, v * 6 + oy, seed + 173, 3);
          if (grid > 0.91) {
            r = 55 + storm * 28; g = 201 + storm * 36; b = 240 + storm * 15;
            rough = 126; bump = 158;
          } else {
            r = (18 + storm * 30) * twill; g = (40 + storm * 48) * twill; b = (82 + storm * 82) * twill;
            rough = 174; bump = 112 + grid * 20;
          }
        } else if (skinId === 'eclipse_mantle') {
          const fold = KS.fbm2D(u * 12 + ox, v * 20 + oy, seed + 229, 3);
          const rib = Math.abs(Math.sin((u * 12 + v * 3 + fold * 2.2) * Math.PI));
          if (rib > 0.82) {
            r = 190 + fold * 36; g = 143 + fold * 34; b = 68 + fold * 25;
            rough = 86; bump = 166;
          } else {
            r = (18 + fold * 22) * twill; g = (24 + fold * 20) * twill; b = (27 + fold * 20) * twill;
            rough = 186; bump = 108 + rib * 28;
          }
        }

        // Authentic CS glove wear scuffing along knuckles / edges
        if (wearFactor > 0.02 && skinId !== 'tactical_slate') {
          const scuff = KS.fbm2D(u * 14 + 2.7, v * 14 + 6.1, seed + 409, 3);
          const knuckleMask = Math.max(0, 1 - Math.abs(v - 0.25) * 2.8) * 0.55 + 0.22;
          const thresh = 0.86 - wearFactor * 0.56 - knuckleMask * wearFactor * 0.36;
          if (scuff > thresh) {
            const k = Math.min(1, (scuff - thresh) * 4.4);
            r = r * (1 - k) + 84 * k;
            g = g * (1 - k) + 82 * k;
            b = b * (1 - k) + 80 * k;
            rough = Math.min(248, rough + k * 68);
            bump = Math.max(32, bump - k * 46);
          } else {
            const fadeOut = 1 - wearFactor * 0.15;
            r *= fadeOut; g *= fadeOut; b *= fadeOut;
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(40, Math.min(250, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;

        const bv = Math.max(0, Math.min(255, Math.round(bump)));
        bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);
    bctx.putImageData(bImg, 0, 0);

    // Extra crisp vector decals for Emerald Web & Cobalt Skulls
    if (skinId === 'emerald_web') {
      const drawGloveWebs = (ctx2d, style, lw) => {
        ctx2d.save();
        ctx2d.strokeStyle = style;
        ctx2d.lineWidth = lw;
        for (let i = 0; i < 3; i++) {
          const cx = (0.18 + KS.hash2D(seed, i * 19 + 5, 191) * 0.64) * res;
          const cy = (0.18 + KS.hash2D(seed, i * 31 + 9, 277) * 0.64) * res;
          const spokes = 7 + ((seed + i) % 3);
          const rot = KS.hash2D(seed, i * 43, 113) * Math.PI * 2;
          const maxR = res * 0.44;
          for (let s = 0; s < spokes; s++) {
            const ang = rot + (s / spokes) * Math.PI * 2;
            ctx2d.beginPath();
            ctx2d.moveTo(cx, cy);
            ctx2d.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
            ctx2d.stroke();
          }
          for (let ring = 1; ring <= 4; ring++) {
            const rr = (ring / 4) * maxR;
            ctx2d.beginPath();
            for (let s = 0; s < spokes; s++) {
              const a0 = rot + (s / spokes) * Math.PI * 2;
              const a1 = rot + ((s + 1) / spokes) * Math.PI * 2;
              const am = (a0 + a1) * 0.5;
              if (s === 0) ctx2d.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
              ctx2d.quadraticCurveTo(cx + Math.cos(am) * rr * 0.88, cy + Math.sin(am) * rr * 0.88, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr);
            }
            ctx2d.closePath();
            ctx2d.stroke();
          }
        }
        ctx2d.restore();
      };
      drawGloveWebs(actx, 'rgba(8, 16, 12, 0.88)', Math.max(1.3, res / 155));
      drawGloveWebs(bctx, 'rgba(65, 65, 65, 0.85)', Math.max(1.4, res / 150));
    } else if (skinId === 'cobalt_skulls') {
      // Crisp low-poly faceted frost-white skulls & crossbones stamped onto cobalt cloth wraps
      actx.save();
      const count = 9;
      for (let i = 0; i < count; i++) {
        const sx = (0.12 + KS.hash2D(seed, i * 17, 311) * 0.76) * res;
        const sy = (0.12 + KS.hash2D(seed, i * 29, 419) * 0.76) * res;
        const rad = res * (0.048 + KS.hash2D(seed, i * 37, 503) * 0.024);
        const rot = (KS.hash2D(seed, i * 41, 613) - 0.5) * 1.1;
        actx.save();
        actx.translate(sx, sy);
        actx.rotate(rot);
        // Crossbones behind skull
        actx.strokeStyle = 'rgba(182, 224, 255, 0.72)';
        actx.lineWidth = Math.max(1.8, rad * 0.24);
        actx.lineCap = 'round';
        actx.beginPath();
        actx.moveTo(-rad * 1.15, -rad * 0.65); actx.lineTo(rad * 1.15, rad * 0.75);
        actx.moveTo(rad * 1.15, -rad * 0.65); actx.lineTo(-rad * 1.15, rad * 0.75);
        actx.stroke();
        // Faceted angular skull cranium + jaw
        actx.fillStyle = 'rgba(228, 244, 255, 0.92)';
        actx.beginPath();
        actx.moveTo(0, -rad * 1.05);
        actx.lineTo(rad * 0.82, -rad * 0.62);
        actx.lineTo(rad * 0.92, rad * 0.08);
        actx.lineTo(rad * 0.54, rad * 0.44);
        actx.lineTo(rad * 0.48, rad * 0.92);
        actx.lineTo(-rad * 0.48, rad * 0.92);
        actx.lineTo(-rad * 0.54, rad * 0.44);
        actx.lineTo(-rad * 0.92, rad * 0.08);
        actx.lineTo(-rad * 0.82, -rad * 0.62);
        actx.closePath();
        actx.fill();
        // Angular eye sockets & nasal cavity & teeth slots
        actx.fillStyle = 'rgba(12, 32, 74, 0.96)';
        actx.beginPath();
        actx.moveTo(-rad * 0.60, -rad * 0.20); actx.lineTo(-rad * 0.16, -rad * 0.08); actx.lineTo(-rad * 0.24, rad * 0.20); actx.lineTo(-rad * 0.56, rad * 0.14); actx.closePath();
        actx.moveTo(rad * 0.60, -rad * 0.20); actx.lineTo(rad * 0.16, -rad * 0.08); actx.lineTo(rad * 0.24, rad * 0.20); actx.lineTo(rad * 0.56, rad * 0.14); actx.closePath();
        actx.moveTo(0, rad * 0.14); actx.lineTo(rad * 0.14, rad * 0.42); actx.lineTo(-rad * 0.14, rad * 0.42); actx.closePath();
        actx.fill();
        actx.fillRect(-rad * 0.28, rad * 0.60, rad * 0.10, rad * 0.30);
        actx.fillRect(-rad * 0.05, rad * 0.60, rad * 0.10, rad * 0.30);
        actx.fillRect(rad * 0.18, rad * 0.60, rad * 0.10, rad * 0.30);
        actx.restore();
      }
      actx.restore();
    }

    const result = { albedoCanvas, roughCanvas, bumpCanvas, palette };
    if (gloveCanvasCache.size > 48) {
      const firstKey = gloveCanvasCache.keys().next().value;
      gloveCanvasCache.delete(firstKey);
    }
    gloveCanvasCache.set(key, result);
    return result;
  }

  function createBladeMaterial(item, targetRenderer) {
    const { albedoCanvas, roughCanvas, bumpCanvas } = paintSkinToCanvases(item);
    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    bumpMap.wrapT = THREE.ClampToEdgeWrapping;

    const skinId = item.skinId || 'vanilla';
    const isMatte = skinId === 'ultraviolet' || skinId === 'crimson_web';
    const isGem = skinId === 'doppler' || skinId === 'fade' || skinId === 'marble_fade' || skinId === 'tiger_tooth' || skinId === 'arctic_veil' || skinId === 'emberstrike';
    const iri = skinId === 'fade' ? 0.45 : skinId === 'doppler' ? 0.38 : skinId === 'case_hardened' ? 0.34 : skinId === 'marble_fade' ? 0.30 : skinId === 'arctic_veil' ? 0.28 : 0.0;

    return new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap,
      bumpMap,
      bumpScale: skinId === 'damascus' ? 0.0028 : 0.0014,
      roughness: isMatte ? 0.80 : 0.50,
      metalness: isMatte ? 0.36 : 0.95,
      clearcoat: isGem ? 0.95 : skinId === 'slaughter' ? 0.72 : skinId === 'case_hardened' ? 0.56 : 0.22,
      clearcoatRoughness: isGem ? 0.08 : 0.20,
      iridescence: iri,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [140, 440],
      envMapIntensity: isGem ? 1.68 : 1.32
    });
  }

  // ---------- Procedural Firearm PBR Skin Painter & Material (Unified Side-Projected UVs) ----------
  function weaponCacheKey(item) {
    const wt = (item && item.weaponType) || 'rifle';
    const sk = (item && item.skinId) || 'factory_slate';
    const sd = (item && item.patternSeed) || 0;
    const fl = Math.round(((item && item.floatValue) || 0.09) * 50);
    return `wpn_${wt}_${sk}_${sd}_${fl}`;
  }

  // Note on unified weapon UV convention:
  // u = 0 -> buttstock / rear of slide, u = 1 -> muzzle / front shroud
  // v = 0 -> lower chassis / frame,     v = 1 -> upper receiver / dust cover / top rail
  function paintWeaponToCanvases(weaponItem, size) {
    const res = size || getProceduralTexSize();
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const key = weaponCacheKey(item) + '_' + res;
    if (weaponCanvasCache.has(key)) return weaponCanvasCache.get(key);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const actx = albedoCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = res;
    roughCanvas.height = res;
    const rctx = roughCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = res;
    bumpCanvas.height = res;
    const bctx = bumpCanvas.getContext('2d');

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const flt = Math.max(0, Math.min(0.9999, Number(item.floatValue) || 0.09));
    const wearFactor = Math.max(0, Math.min(1, (flt - 0.06) / 0.72));
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;
    const ox = KS.hash2D(seed, 17, 67) * 10;
    const oy = KS.hash2D(seed, 31, 97) * 10;

    const aImg = actx.createImageData(res, res);
    const rImg = rctx.createImageData(res, res);
    const bImg = bctx.createImageData(res, res);
    const ad = aImg.data;
    const rd = rImg.data;
    const bd = bImg.data;

    for (let py = 0; py < res; py++) {
      // Canvas Y=0 is top of image -> v=1 is top of weapon when CanvasTexture flipY=true!
      const v = 1 - py / (res - 1);
      for (let px = 0; px < res; px++) {
        const u = px / (res - 1);
        const idx = (py * res + px) * 4;
        const micro = KS.fbm2D(u * 24, v * 24, seed + 13, 2);
        let r = 46, g = 54, b = 64, rough = 126, bump = 128;

        if (skinId === 'factory_slate') {
          const brush = KS.fbm2D(u * 54, v * 10, 7, 2);
          r = 36 + brush * 20; g = 43 + brush * 22; b = 52 + brush * 26;
          rough = 124; bump = 120 + brush * 20;
          if (Math.abs(v - 0.76) < 0.020) {
            r = 72; g = 216; b = 248; rough = 68; bump = 148;
          } else if (v < 0.24) {
            r *= 0.72; g *= 0.72; b *= 0.76; rough = 162;
          }
        } else if (skinId === 'ultraviolet') {
          const grain = KS.fbm2D(u * 30, v * 30, seed + 5, 2);
          r = 22 + grain * 14; g = 24 + grain * 14; b = 32 + grain * 18;
          rough = 158; bump = 118 + grain * 24;
          if (v > 0.74 || (u > 0.56 && u < 0.84 && v > 0.30 && v < 0.70)) {
            r = 96 + grain * 20; g = 54 + grain * 16; b = 224 + grain * 24;
            rough = 82; bump = 134 + grain * 14;
          }
        } else if (skinId === 'redline') {
          // Authentic CS2 Redline: true diagonal 2x2 twill carbon-fiber weave + sharp crimson racing pinstripes
          const cx = Math.floor(u * 96);
          const cy = Math.floor(v * 64);
          const twillPhase = (cx + cy) % 4;
          const twill = twillPhase < 2 ? 1.18 : 0.76;
          const fiberGloss = twillPhase < 2 ? 96 : 148;
          r = (22 + micro * 10) * twill;
          g = (24 + micro * 10) * twill;
          b = (28 + micro * 12) * twill;
          rough = fiberGloss;
          bump = twillPhase < 2 ? 156 : 98;
          // Crisp contoured crimson pinstripes hugging top chassis crease & receiver beltline
          const mainLine = Math.abs(v - (0.64 + Math.sin(u * 3.14) * 0.03)) < 0.022;
          const lowerLine = Math.abs(v - 0.30) < 0.011 && u > 0.14 && u < 0.88;
          if (mainLine || lowerLine) {
            r = 236; g = 32; b = 38; rough = 52; bump = 166;
          }
        } else if (skinId === 'damascus') {
          const w1 = KS.fbm2D(u * 4.2 + ox, v * 4.2 + oy, seed + 11, 4);
          const w2 = KS.fbm2D(u * 8.5 + w1 * 2.2, v * 8.5 + w1 * 2.2, seed + 43, 3);
          const bands = Math.sin((u * 7.2 + v * 5.2 + w1 * 5.4 + w2 * 1.4) * Math.PI * 2) * 0.5 + 0.5;
          const lum = 92 + bands * 138;
          r = lum * 0.96; g = lum; b = lum * 1.06;
          rough = 38 + (1 - bands) * 42;
          bump = 96 + bands * 64;
        } else if (skinId === 'vulcan') {
          // Authentic CS2 Vulcan: stark white, graphite, electric cyan & cobalt aerodynamic sports livery
          const hex = Math.sin(u * 60 * Math.PI) * Math.sin(v * 40 * Math.PI);
          const s1 = u * 1.15 + v * 0.55;
          const s2 = u * 0.85 - v * 0.65;
          if (v < 0.22 || (u > 0.34 && u < 0.56 && v > 0.42 && v < 0.66)) {
            // Matte charcoal hex-inlay chassis core
            r = 22 + hex * 6; g = 28 + hex * 7; b = 38 + hex * 8; rough = 136; bump = 114 + hex * 18;
          } else if (Math.abs(s1 - 0.72) < 0.095 || Math.abs(s1 - 1.24) < 0.08) {
            // Vivid electric cyan velocity blade
            r = 28; g = 198; b = 252; rough = 54; bump = 148;
          } else if (Math.abs(s1 - 0.86) < 0.075 || Math.abs(s2 - 0.06) < 0.09) {
            // Deep royal cobalt sport stripe
            r = 28; g = 88; b = 216; rough = 74; bump = 138;
          } else if (Math.abs(s1 - 0.58) < 0.045 || Math.abs(s1 - 1.10) < 0.04) {
            // Razor obsidian divider
            r = 16; g = 20; b = 28; rough = 128; bump = 104;
          } else {
            // Clean ceramic chalk-white athletic shell
            r = 236 - micro * 10; g = 242 - micro * 10; b = 248 - micro * 8; rough = 72; bump = 132;
          }
        } else if (skinId === 'crimson_web') {
          r = 158 + micro * 38; g = 14 + micro * 12; b = 20 + micro * 14;
          rough = 84; bump = 124 + micro * 16;
        } else if (skinId === 'asiimov') {
          // Authentic CS2 Asiimov: crisp stark-white sci-fi ceramic + bold geometric safety-orange & matte-black panel cutouts
          const dA = u * 1.10 + v * 0.48;
          const dB = u * 0.92 - v * 0.58;
          const isOrangeBlock =
            (dA > 0.66 && dA < 0.94 && v > 0.34) ||
            (u > 0.08 && u < 0.30 && v > 0.52 && v < 0.86) ||
            (u > 0.74 && u < 0.94 && v > 0.24 && v < 0.54);
          const isBlackBlock =
            (dA > 0.94 && dA < 1.09 && v > 0.26) ||
            (v < 0.24) ||
            (dB > 0.22 && dB < 0.32 && v > 0.55) ||
            (u > 0.30 && u < 0.37 && v > 0.56);
          if (isBlackBlock) {
            r = 20 + micro * 8; g = 22 + micro * 8; b = 26 + micro * 10; rough = 138; bump = 116;
          } else if (isOrangeBlock) {
            r = 252; g = 108 + micro * 10; b = 22; rough = 68; bump = 142;
          } else {
            r = 242 - micro * 10; g = 244 - micro * 10; b = 246 - micro * 8; rough = 86; bump = 130;
          }
        } else if (skinId === 'blaze') {
          // Authentic CS2 Blaze: mirror-dark blued obsidian steel with roaring hot-rod flames licking BACKWARD from muzzle (u = 1)
          const fromMuzzle = 1 - u; // 0 at muzzle, 1 at buttstock
          const tongueWave = Math.sin(v * 18.0 + KS.fbm2D(u * 4.5 + ox, v * 4.5 + oy, seed + 29, 3) * 4.8) * 0.14;
          const secondaryLick = KS.fbm2D(u * 7.5 + ox, v * 11.0 + oy, seed + 61, 3) * 0.24;
          const reach = 0.26 + tongueWave + secondaryLick + (1 - Math.abs(v - 0.52) * 1.4) * 0.22;
          if (fromMuzzle < reach) {
            const t = Math.max(0, Math.min(1, fromMuzzle / Math.max(0.02, reach)));
            if (t < 0.30) {
              // Incandescent yellow-white hot core at muzzle
              const k = t / 0.30;
              r = 255; g = 246 - k * 34; b = 156 - k * 108;
            } else if (t < 0.68) {
              // Roaring molten gold -> deep tangerine orange flames
              const k = (t - 0.30) / 0.38;
              r = 255; g = 212 - k * 124; b = 48 - k * 34;
            } else {
              // Crimson-red outer airbrushed flame tips
              const k = (t - 0.68) / 0.32;
              r = 252 - k * 84; g = 88 - k * 72; b = 16;
            }
            rough = 32; bump = 136;
          } else {
            // Deep mirror-blued gunmetal obsidian steel
            const brush = KS.fbm2D(u * 44, v * 8, 19, 2);
            r = 18 + brush * 14; g = 20 + brush * 15; b = 28 + brush * 20;
            rough = 46; bump = 122 + brush * 14;
          }
        } else if (skinId === 'neon_rider') {
          // Authentic CS2 Neon Rider: dark synthwave indigo backdrop, retro grid, blazing hot-pink & turquoise speed streaks
          const diag = u * 1.25 - v * 0.85 + (seed % 7) * 0.05;
          const streak = Math.sin(diag * Math.PI * 5.2);
          const grid = v < 0.34 && (Math.abs(((u * 18) % 1) - 0.5) > 0.45 || Math.abs(((v * 14) % 1) - 0.5) > 0.44);
          if (grid) {
            r = 44; g = 228; b = 255; rough = 52; bump = 152;
          } else if (streak > 0.52) {
            r = 252; g = 42; b = 196; rough = 48; bump = 144;
          } else if (streak < -0.58) {
            r = 24; g = 232; b = 252; rough = 48; bump = 144;
          } else {
            const grad = Math.max(0, Math.min(1, v));
            r = 34 + grad * 52 + micro * 16;
            g = 16 + grad * 14 + micro * 12;
            b = 84 + grad * 68 + micro * 26;
            rough = 78; bump = 124;
          }
        } else if (skinId === 'printstream') {
          // Authentic CS2 Printstream: pearlescent satin-white upper chassis + crisp matte-black lower skirt (decals painted below!)
          const pearl = Math.sin((u * 3.4 + v * 2.6) * Math.PI) * 0.5 + 0.5;
          if (v < 0.24) {
            r = 18 + micro * 8; g = 20 + micro * 8; b = 24 + micro * 10;
            rough = 132; bump = 114;
          } else {
            r = 238 + pearl * 14; g = 240 + (1 - pearl) * 12; b = 246 + pearl * 8;
            rough = 38; bump = 132;
          }
        } else if (skinId === 'hyper_chroma') {
          const wx = KS.fbm2D(u * 3.4 + ox, v * 3.4 + oy, seed + 19, 3);
          const wy = KS.fbm2D(u * 3.4 + ox + 3.2, v * 3.4 + oy + 2.1, seed + 41, 3);
          const sw = Math.sin((u * 3.8 + v * 2.8 + wx * 4.4 + wy * 1.8) * Math.PI) * 0.5 + 0.5;
          if (sw < 0.34) {
            const t = sw / 0.34;
            r = 18 + t * 104; g = 234 - t * 146; b = 222 + t * 30;
          } else if (sw < 0.68) {
            const t = (sw - 0.34) / 0.34;
            r = 122 + t * 130; g = 88 - t * 28; b = 252 - t * 102;
          } else {
            const t = (sw - 0.68) / 0.32;
            r = 252 - t * 234; g = 60 + t * 174; b = 150 + t * 72;
          }
          rough = 36; bump = 124 + sw * 20;
        } else if (skinId === 'fade') {
          const shift = (fadePct - 80) / 20;
          const pos = Math.max(0, Math.min(1, u * 1.14 - (1 - shift) * 0.22 + (v - 0.5) * 0.14));
          if (pos < 0.20) {
            const t = pos / 0.20;
            r = 200 + t * 48; g = 204 + t * 12; b = 212 - t * 74;
          } else if (pos < 0.50) {
            const t = (pos - 0.20) / 0.30;
            r = 250; g = 198 - t * 122; b = 66 + t * 108;
          } else if (pos < 0.78) {
            const t = (pos - 0.50) / 0.28;
            r = 248 - t * 118; g = 76 - t * 26; b = 176 + t * 62;
          } else {
            const t = (pos - 0.78) / 0.22;
            r = 130 - t * 40; g = 50 - t * 12; b = 238 + t * 16;
          }
          rough = 26;
        } else if (skinId === 'case_hardened') {
          const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
          r = ch.r; g = ch.g; b = ch.b;
          rough = ch.isBlue ? 36 : ch.isGold ? 50 : 66;
          bump = 122 + micro * 22;
        } else if (skinId === 'dragon_gold') {
          // Authentic embossed bullion-gold overlapping dragon scales over deep crimson-obsidian steel
          const row = Math.floor(v * 20);
          const su = (u * 26 + (row & 1) * 0.5) % 1 - 0.5;
          const sv = (v * 20) % 1 - 0.5;
          const scaleDist = Math.hypot(su, sv * 1.15);
          const scaleRim = Math.max(0, 1 - scaleDist * 2.0);
          const dragonBody = Math.sin((u * 4.5 + Math.sin(v * 6.0) * 0.6) * Math.PI) * 0.5 + 0.5;
          const wave = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 47, 3);
          const isGoldZone = (wave * 0.55 + dragonBody * 0.45) > 0.38 || v > 0.80 || v < 0.18;
          if (isGoldZone) {
            const sheen = 0.74 + scaleRim * 0.30;
            r = 250 * sheen; g = 196 * sheen; b = 52 * sheen;
            rough = 28 + (1 - scaleRim) * 26;
            bump = 96 + scaleRim * 88;
          } else {
            r = 64 + wave * 82; g = 12 + wave * 16; b = 18 + wave * 16;
            rough = 86; bump = 112 + scaleRim * 24;
          }
        } else if (skinId === 'hazard_pay') {
          const grain = KS.fbm2D(u * 42, v * 13 + oy, seed + 181, 2);
          const stripe = Math.abs(((u * 5.5 + v * 2.1 + (seed % 9) * 0.06) % 1) - 0.5);
          const armor = v < 0.22 || (u > 0.34 && u < 0.48 && v > 0.36 && v < 0.72);
          if (stripe < 0.075 && v > 0.24 && v < 0.86) {
            r = 242; g = 158 + grain * 24; b = 50; rough = 68; bump = 160;
          } else if (armor) {
            r = 17 + grain * 12; g = 22 + grain * 12; b = 27 + grain * 14; rough = 148; bump = 112;
          } else {
            r = 48 + grain * 20; g = 56 + grain * 20; b = 62 + grain * 24; rough = 118; bump = 134;
          }
        } else if (skinId === 'coldfront') {
          const frost = KS.fbm2D(u * 7 + ox, v * 6 + oy, seed + 239, 4);
          const facet = Math.abs(Math.sin((u * 9 + v * 7 + frost * 2.3) * Math.PI));
          const ice = Math.max(0, Math.min(1, frost * 0.60 + facet * 0.40));
          const panel = Math.abs(Math.sin((u * 2.2 - v * 1.3) * Math.PI));
          if (panel > 0.94) {
            r = 18; g = 31; b = 48; rough = 156; bump = 112;
          } else {
            r = 174 + ice * 60; g = 202 + ice * 48; b = 218 + ice * 37;
            rough = 54 + (1 - ice) * 26; bump = 100 + facet * 56;
          }
        } else if (skinId === 'redshift') {
          const smoke = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 271, 3);
          const slash = Math.sin((u * 5.0 + v * 2.1 + smoke * 2.8) * Math.PI);
          const glow = Math.max(0, Math.min(1, (slash * 0.5 + smoke * 0.68) - 0.72));
          r = 24 + smoke * 30 + glow * 215;
          g = 22 + smoke * 20 + glow * 34;
          b = 30 + smoke * 27 + glow * 31;
          rough = 78 - glow * 44; bump = 108 + smoke * 28 + glow * 42;
        } else if (skinId === 'nitro') {
          const carbon = Math.floor((u * 72 + v * 64 + seed) % 4) < 2;
          const sweep = Math.sin((u * 1.3 + v * 0.74 + (seed % 11) * 0.04) * Math.PI * 6);
          if (carbon) {
            r = 18 + micro * 12; g = 23 + micro * 14; b = 31 + micro * 18; rough = 126; bump = 156;
          } else {
            r = 25 + micro * 10; g = 35 + micro * 16; b = 45 + micro * 22; rough = 148; bump = 96;
          }
          if (sweep > 0.56) { r = 30; g = 222 + micro * 24; b = 232; rough = 44; bump = 154; }
          else if (sweep < -0.62) { r = 218; g = 40 + micro * 16; b = 174 + micro * 38; rough = 46; bump = 148; }
        } else if (skinId === 'solarflare') {
          const rays = KS.fbm2D(u * 3 + ox, v * 3 + oy, seed + 313, 3);
          const radial = Math.abs(Math.sin((u * 4.5 + v * 2.8 + rays * 2.1) * Math.PI));
          const gold = Math.max(0, Math.min(1, 0.52 + rays * 0.38 + radial * 0.25));
          r = 104 + gold * 146; g = 57 + gold * 143; b = 24 + gold * 62;
          if (v < 0.18 || v > 0.84) { r *= 0.48; g *= 0.44; b *= 0.42; }
          rough = 34 + (1 - gold) * 28; bump = 92 + radial * 65;
        } else if (skinId === 'voidglass') {
          const wx = KS.fbm2D(u * 3.4 + ox, v * 3.4 + oy, seed + 353, 3);
          const wy = KS.fbm2D(u * 3.4 + ox + 3.1, v * 3.4 + oy + 1.7, seed + 389, 3);
          const shard = Math.abs(Math.sin((u * 8.5 + wx * 5.0 - v * 3.2 + wy) * Math.PI));
          const prism = Math.max(0, Math.min(1, (shard * 0.58 + wx * 0.48) - 0.50));
          r = 13 + prism * 140 + wy * 10;
          g = 15 + prism * 76 + wx * 13;
          b = 27 + prism * 198 + wy * 22;
          if (prism > 0.75) { r += 45; g += 24; b = 245; }
          rough = 28 + (1 - prism) * 36; bump = 92 + prism * 112;
        }

        // Authentic edge-weighted float wear scuffing
        if (wearFactor > 0.02 && skinId !== 'factory_slate') {
          const sc = KS.fbm2D(u * 15 + 1.9, v * 15 + 4.3, seed + 521, 3);
          const edgeMask = (v > 0.80 || v < 0.20 || u > 0.84) ? 0.32 : 0.0;
          const thresh = 0.88 - wearFactor * 0.58 - edgeMask * wearFactor * 0.40;
          if (sc > thresh) {
            const k = Math.min(1, (sc - thresh) * 4.6);
            r = r * (1 - k) + 96 * k;
            g = g * (1 - k) + 102 * k;
            b = b * (1 - k) + 110 * k;
            rough = Math.min(242, rough + k * 90);
            bump = Math.max(28, bump - k * 56);
          }
        }

        ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
        ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        ad[idx + 3] = 255;

        const rv = Math.max(18, Math.min(245, Math.round(rough)));
        rd[idx] = rv; rd[idx + 1] = rv; rd[idx + 2] = rv; rd[idx + 3] = 255;

        const bv = Math.max(0, Math.min(255, Math.round(bump)));
        bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    rctx.putImageData(rImg, 0, 0);
    bctx.putImageData(bImg, 0, 0);

    // High-resolution vector decals & CS2 artwork overlays!
    if (skinId === 'crimson_web') {
      const drawWpnWebs = (ctx2d, style, lw) => {
        ctx2d.save();
        ctx2d.strokeStyle = style;
        ctx2d.lineWidth = lw;
        for (let i = 0; i < 3; i++) {
          const cx = (0.16 + KS.hash2D(seed, i * 19 + 5, 211) * 0.68) * res;
          const cy = (0.18 + KS.hash2D(seed, i * 29 + 9, 307) * 0.64) * res;
          const spokes = 7 + ((seed + i) % 3);
          const rot = KS.hash2D(seed, i * 41, 131) * Math.PI * 2;
          const maxR = res * 0.42;
          for (let s = 0; s < spokes; s++) {
            const ang = rot + (s / spokes) * Math.PI * 2;
            ctx2d.beginPath();
            ctx2d.moveTo(cx, cy);
            ctx2d.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
            ctx2d.stroke();
          }
          for (let ring = 1; ring <= 4; ring++) {
            const rr = (ring / 4) * maxR;
            ctx2d.beginPath();
            for (let s = 0; s < spokes; s++) {
              const a0 = rot + (s / spokes) * Math.PI * 2;
              const a1 = rot + ((s + 1) / spokes) * Math.PI * 2;
              const am = (a0 + a1) * 0.5;
              if (s === 0) ctx2d.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
              ctx2d.quadraticCurveTo(cx + Math.cos(am) * rr * 0.88, cy + Math.sin(am) * rr * 0.88, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr);
            }
            ctx2d.closePath();
            ctx2d.stroke();
          }
        }
        ctx2d.restore();
      };
      drawWpnWebs(actx, 'rgba(10, 8, 12, 0.90)', Math.max(1.3, res / 165));
      drawWpnWebs(bctx, 'rgba(62, 62, 62, 0.85)', Math.max(1.4, res / 160));
    } else if (skinId === 'printstream') {
      // Iconic CS2 Printstream vector marks: X-crosses, sharp diagonal slashes, barcode telemetry, clean border frame
      actx.save();
      const s = res;
      actx.strokeStyle = 'rgba(16, 19, 25, 0.90)';
      actx.fillStyle = 'rgba(16, 19, 25, 0.92)';
      actx.lineWidth = Math.max(1.6, s / 160);
      // Technical outer panel frame
      actx.strokeRect(s * 0.06, s * 0.14, s * 0.88, s * 0.54);
      // Iconic bold X-X-X cross badges across receiver center
      const drawX = (cx, cy, r) => {
        actx.lineWidth = Math.max(2.2, s / 110);
        actx.beginPath();
        actx.moveTo(cx - r, cy - r); actx.lineTo(cx + r, cy + r);
        actx.moveTo(cx + r, cy - r); actx.lineTo(cx - r, cy + r);
        actx.stroke();
      };
      drawX(s * 0.44, s * 0.40, s * 0.032);
      drawX(s * 0.53, s * 0.40, s * 0.032);
      drawX(s * 0.62, s * 0.40, s * 0.032);
      // Crisp vertical telemetry barcode strip
      for (let i = 0; i < 14; i++) {
        const bw = (i % 3 === 0 ? 0.008 : 0.004) * s;
        actx.fillRect(s * (0.14 + i * 0.013), s * 0.24, bw, s * 0.12);
      }
      // Precision diagonal slash vents near muzzle
      for (let i = 0; i < 5; i++) {
        actx.beginPath();
        actx.moveTo(s * (0.74 + i * 0.032), s * 0.22);
        actx.lineTo(s * (0.765 + i * 0.032), s * 0.22);
        actx.lineTo(s * (0.735 + i * 0.032), s * 0.42);
        actx.lineTo(s * (0.710 + i * 0.032), s * 0.42);
        actx.closePath();
        actx.fill();
      }
      // Subtle geometric target circle + micro dots
      actx.lineWidth = Math.max(1.4, s / 190);
      actx.beginPath();
      actx.arc(s * 0.28, s * 0.52, s * 0.042, 0, Math.PI * 2);
      actx.stroke();
      actx.fillRect(s * 0.40, s * 0.54, s * 0.26, s * 0.022);
      actx.restore();
    } else if (skinId === 'asiimov') {
      // Crisp CS2 Asiimov sci-fi micro-markings, hazard ticks, and precision panel seams
      actx.save();
      const s = res;
      actx.strokeStyle = 'rgba(20, 22, 26, 0.85)';
      actx.lineWidth = Math.max(1.4, s / 210);
      // Angled panel seam lines
      actx.beginPath();
      actx.moveTo(s * 0.08, s * 0.34); actx.lineTo(s * 0.48, s * 0.34); actx.lineTo(s * 0.60, s * 0.52); actx.lineTo(s * 0.92, s * 0.52);
      actx.stroke();
      // Safety-orange crosshair / tactical target pips
      actx.strokeStyle = 'rgba(252, 108, 22, 0.96)';
      actx.lineWidth = Math.max(1.8, s / 170);
      actx.beginPath();
      actx.arc(s * 0.48, s * 0.44, s * 0.036, 0, Math.PI * 2);
      actx.stroke();
      actx.fillStyle = 'rgba(252, 108, 22, 0.96)';
      for (let i = 0; i < 6; i++) {
        actx.fillRect(s * (0.14 + i * 0.024), s * 0.62, s * 0.012, s * 0.044);
      }
      // Crisp black angled hazard chevrons
      actx.fillStyle = 'rgba(18, 20, 24, 0.94)';
      for (let i = 0; i < 4; i++) {
        actx.beginPath();
        actx.moveTo(s * (0.64 + i * 0.045), s * 0.20);
        actx.lineTo(s * (0.665 + i * 0.045), s * 0.20);
        actx.lineTo(s * (0.645 + i * 0.045), s * 0.30);
        actx.lineTo(s * (0.620 + i * 0.045), s * 0.30);
        actx.closePath();
        actx.fill();
      }
      actx.restore();
    } else if (skinId === 'neon_rider') {
      // Stylized CS2 Neon Rider retro-synthwave cyber-helmet graphic centerpiece on receiver!
      actx.save();
      const s = res;
      const hx = s * 0.52;
      const hy = s * 0.44;
      const hr = s * 0.16;
      // Glowing magenta outer halo
      const glow = actx.createRadialGradient(hx, hy, hr * 0.2, hx, hy, hr * 1.45);
      glow.addColorStop(0, 'rgba(255, 48, 204, 0.55)');
      glow.addColorStop(1, 'rgba(255, 48, 204, 0.0)');
      actx.fillStyle = glow;
      actx.beginPath();
      actx.arc(hx, hy, hr * 1.45, 0, Math.PI * 2);
      actx.fill();
      // Angular helmet shell (hot pink -> deep violet)
      const hGrad = actx.createLinearGradient(hx - hr, hy - hr, hx + hr, hy + hr);
      hGrad.addColorStop(0, '#ff4fd8');
      hGrad.addColorStop(0.55, '#a028e8');
      hGrad.addColorStop(1, '#1d1448');
      actx.fillStyle = hGrad;
      actx.beginPath();
      actx.moveTo(hx - hr * 0.72, hy + hr * 0.62);
      actx.lineTo(hx - hr * 0.92, hy - hr * 0.12);
      actx.lineTo(hx - hr * 0.36, hy - hr * 0.86);
      actx.lineTo(hx + hr * 0.52, hy - hr * 0.78);
      actx.lineTo(hx + hr * 0.98, hy - hr * 0.10);
      actx.lineTo(hx + hr * 0.76, hy + hr * 0.68);
      actx.lineTo(hx + hr * 0.05, hy + hr * 0.84);
      actx.closePath();
      actx.fill();
      actx.strokeStyle = '#38f0ff';
      actx.lineWidth = Math.max(1.8, s / 180);
      actx.stroke();
      // Razor-sharp electric cyan cyber visor + specular slash
      actx.fillStyle = '#0e1630';
      actx.beginPath();
      actx.moveTo(hx - hr * 0.20, hy - hr * 0.24);
      actx.lineTo(hx + hr * 0.88, hy - hr * 0.16);
      actx.lineTo(hx + hr * 0.72, hy + hr * 0.30);
      actx.lineTo(hx - hr * 0.08, hy + hr * 0.22);
      actx.closePath();
      actx.fill();
      actx.fillStyle = '#38f6ff';
      actx.beginPath();
      actx.moveTo(hx - hr * 0.10, hy - hr * 0.14);
      actx.lineTo(hx + hr * 0.76, hy - hr * 0.08);
      actx.lineTo(hx + hr * 0.66, hy + hr * 0.06);
      actx.lineTo(hx - hr * 0.04, hy + hr * 0.02);
      actx.closePath();
      actx.fill();
      // Speed streaks shooting backward from helmet
      actx.strokeStyle = 'rgba(56, 246, 255, 0.9)';
      actx.lineWidth = Math.max(2.0, s / 160);
      for (let i = 0; i < 4; i++) {
        const ly = hy - hr * 0.45 + i * hr * 0.32;
        actx.beginPath();
        actx.moveTo(hx - hr * 1.0, ly);
        actx.lineTo(hx - hr * (1.8 + (i % 2) * 0.45), ly + s * 0.02);
        actx.stroke();
      }
      actx.restore();
    } else if (skinId === 'dragon_gold') {
      // Sweeping golden dragon flame filigree silhouette along receiver
      actx.save();
      const s = res;
      actx.strokeStyle = 'rgba(255, 224, 102, 0.92)';
      actx.lineWidth = Math.max(2.2, s / 130);
      actx.beginPath();
      actx.moveTo(s * 0.08, s * 0.48);
      actx.bezierCurveTo(s * 0.28, s * 0.20, s * 0.52, s * 0.74, s * 0.76, s * 0.36);
      actx.quadraticCurveTo(s * 0.86, s * 0.24, s * 0.94, s * 0.40);
      actx.stroke();
      // Ornate border lines
      actx.strokeStyle = 'rgba(255, 210, 72, 0.78)';
      actx.lineWidth = Math.max(1.5, s / 200);
      actx.strokeRect(s * 0.04, s * 0.14, s * 0.92, s * 0.68);
      actx.restore();
    } else if (skinId === 'redline') {
      // Crisp micro red speed chevrons along receiver
      actx.save();
      const s = res;
      actx.fillStyle = 'rgba(238, 34, 42, 0.96)';
      for (let i = 0; i < 3; i++) {
        const bx = s * (0.64 + i * 0.042);
        actx.beginPath();
        actx.moveTo(bx, s * 0.28);
        actx.lineTo(bx + s * 0.022, s * 0.28);
        actx.lineTo(bx + s * 0.008, s * 0.38);
        actx.lineTo(bx - s * 0.014, s * 0.38);
        actx.closePath();
        actx.fill();
      }
      actx.restore();
    }

    const result = { albedoCanvas, roughCanvas, bumpCanvas };
    if (weaponCanvasCache.size > 48) {
      const firstKey = weaponCanvasCache.keys().next().value;
      weaponCanvasCache.delete(firstKey);
    }
    weaponCanvasCache.set(key, result);
    return result;
  }

  function createWeaponMaterial(weaponItem, targetRenderer) {
    const { albedoCanvas, roughCanvas, bumpCanvas } = paintWeaponToCanvases(weaponItem);
    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    bumpMap.wrapT = THREE.ClampToEdgeWrapping;

    const sk = (weaponItem && weaponItem.skinId) || 'factory_slate';
    const isMetallic = sk === 'fade' || sk === 'case_hardened' || sk === 'damascus' || sk === 'dragon_gold' || sk === 'blaze' || sk === 'redshift' || sk === 'solarflare';
    const isGlossy = isMetallic || sk === 'printstream' || sk === 'hyper_chroma' || sk === 'neon_rider' || sk === 'coldfront' || sk === 'nitro' || sk === 'voidglass';
    const iri = sk === 'printstream' ? 0.78 : sk === 'fade' ? 0.45 : sk === 'case_hardened' ? 0.36 : sk === 'hyper_chroma' ? 0.42 : sk === 'voidglass' ? 0.54 : sk === 'coldfront' ? 0.26 : 0.0;

    return new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap,
      bumpMap,
      bumpScale: sk === 'redline' || sk === 'dragon_gold' || sk === 'damascus' || sk === 'solarflare' ? 0.0032 : 0.0016,
      roughness: isGlossy ? 0.30 : 0.58,
      metalness: isMetallic ? 0.88 : sk === 'printstream' ? 0.16 : 0.32,
      clearcoat: isGlossy ? 0.78 : 0.18,
      clearcoatRoughness: sk === 'printstream' ? 0.12 : 0.20,
      iridescence: iri,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: sk === 'printstream' ? [180, 520] : [140, 420],
      envMapIntensity: isMetallic ? 1.55 : sk === 'printstream' ? 1.45 : 1.18
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
      // Dark steel fluted barrel + slotted muzzle brake
      ctx.fillStyle = '#1b242e';
      ctx.fillRect(14, -11, 60, 5.5);
      ctx.fillStyle = '#2d3a48';
      ctx.fillRect(71, -13, 12, 9.5);
      // Scope mount, optic tube & turrets
      ctx.fillStyle = '#161e28';
      ctx.fillRect(-16, -24, 34, 7.5);
      ctx.fillRect(-20, -25.5, 9, 10.5);
      ctx.fillRect(14, -25.5, 9, 10.5);
      ctx.fillRect(-1, -28, 5, 4);
      ctx.fillRect(-10, -16.5, 4, 7);
      ctx.fillRect(8, -16.5, 4, 7);
      // Magazine + folded bipod
      ctx.fillStyle = '#18202a';
      ctx.fillRect(-6, 4, 14, 15);
      ctx.fillRect(20, 2, 20, 3.5);
      // Iconic Arctic Warfare thumbhole stock & chassis
      drawClippedBody((g) => {
        g.moveTo(-78, -5);
        g.lineTo(-42, -12);
        g.lineTo(30, -11);
        g.lineTo(38, -2);
        g.lineTo(10, 5);
        g.lineTo(-22, 6);
        g.lineTo(-32, 20);
        g.lineTo(-44, 20);
        g.lineTo(-78, 15);
      });
      // Thumbhole stock cutout window
      ctx.fillStyle = '#09121c';
      ctx.beginPath();
      ctx.roundRect(-64, 0, 22, 11, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(218,244,255,0.34)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else if (wt === 'smg') {
      // Compact angled VX-9 Vector SMG silhouette
      ctx.fillStyle = '#18212b';
      ctx.fillRect(-66, -6, 26, 6);
      ctx.fillRect(-66, -10, 6, 22);
      ctx.fillRect(38, -11, 24, 6);
      ctx.fillStyle = '#131b24';
      ctx.beginPath();
      ctx.moveTo(6, 5); ctx.lineTo(22, 5); ctx.lineTo(14, 34); ctx.lineTo(-1, 32);
      ctx.closePath();
      ctx.fill();
      drawClippedBody((g) => {
        g.moveTo(-42, -14);
        g.lineTo(42, -14);
        g.lineTo(46, -2);
        g.lineTo(28, 8);
        g.lineTo(-10, 8);
        g.lineTo(-22, 24);
        g.lineTo(-34, 24);
        g.lineTo(-30, 4);
        g.lineTo(-42, 2);
      });
    } else if (wt === 'shotgun') {
      // Long 12-gauge M870 pump shotgun silhouette
      ctx.fillStyle = '#1d2732';
      ctx.fillRect(10, -13, 68, 6);
      ctx.fillRect(10, -5, 52, 5);
      ctx.fillStyle = '#141c24';
      ctx.fillRect(18, -6, 30, 10);
      drawClippedBody((g) => {
        g.moveTo(-76, -3);
        g.lineTo(-36, -12);
        g.lineTo(24, -12);
        g.lineTo(28, -2);
        g.lineTo(12, 5);
        g.lineTo(-24, 6);
        g.lineTo(-42, 16);
        g.lineTo(-76, 15);
      });
    } else if (wt === 'pistol') {
      // Sleek tactical USP-9 sidearm silhouette
      ctx.fillStyle = '#171f28';
      ctx.beginPath();
      ctx.moveTo(-34, -1); ctx.lineTo(-12, -1); ctx.lineTo(-19, 30); ctx.lineTo(-42, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c3947';
      ctx.fillRect(42, -12, 10, 5);
      drawClippedBody((g) => {
        g.moveTo(-42, -16);
        g.lineTo(44, -16);
        g.lineTo(44, -1);
        g.lineTo(-40, -1);
      });
    } else if (wt === 'deagle') {
      // Slanted wrap-around grip + flared mag baseplate
      ctx.fillStyle = '#171f28';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 32);
      ctx.lineTo(-52, 32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2d3a48';
      ctx.fillRect(-54, 31, 34, 3.5);
      // Exposed hammer + trigger guard
      ctx.fillStyle = '#384858';
      ctx.fillRect(-50, -14, 6, 8);
      ctx.strokeStyle = '#3c4c5c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.lineTo(10, 2);
      ctx.lineTo(4, 15);
      ctx.lineTo(-18, 15);
      ctx.stroke();
      // Heavy iconic CS:S triangular-beveled Desert Eagle slide & barrel shroud
      drawClippedBody((g) => {
        g.moveTo(-46, -18);
        g.lineTo(46, -18);
        g.lineTo(56, -7);
        g.lineTo(56, 2);
        g.lineTo(-42, 2);
        g.lineTo(-50, -6);
      });
    } else {
      // V-47 Rifle (CS:S AK-47): gas tube, angled gas block, hooded front sight, slanted muzzle brake, banana mag
      ctx.fillStyle = '#1b242f';
      ctx.fillRect(36, -8, 42, 4.5);
      ctx.fillRect(32, -14, 24, 3.8);
      ctx.fillRect(53, -15, 5, 9);
      ctx.fillRect(68, -17, 5, 11);
      ctx.fillRect(76, -9.5, 9, 7);
      // Curved banana magazine
      ctx.beginPath();
      ctx.moveTo(4, 4);
      ctx.quadraticCurveTo(10, 22, 22, 33);
      ctx.lineTo(7, 35);
      ctx.quadraticCurveTo(-4, 22, -8, 4);
      ctx.closePath();
      ctx.fillStyle = '#1c2530';
      ctx.fill();
      // Pistol grip
      ctx.beginPath();
      ctx.moveTo(-26, 4);
      ctx.lineTo(-14, 4);
      ctx.lineTo(-20, 24);
      ctx.lineTo(-32, 24);
      ctx.closePath();
      ctx.fill();
      // Main AK receiver + curved dust cover + handguard + angled stock
      drawClippedBody((g) => {
        g.moveTo(-78, -2);
        g.lineTo(-42, -10);
        g.lineTo(-34, -14);
        g.lineTo(10, -14);
        g.lineTo(14, -11);
        g.lineTo(38, -10);
        g.lineTo(40, -1);
        g.lineTo(14, 4);
        g.lineTo(-42, 4);
        g.lineTo(-78, 16);
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

  // ---------- Unified Side-Projected Firearm UV Mapper (Stock +Z = u:0 -> Muzzle -Z = u:1) ----------
  const _uvProjVec = new THREE.Vector3();
  function projectWeaponMeshUVs(mesh, bounds) {
    if (!mesh || !mesh.geometry) return mesh;
    mesh.updateMatrix();
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    let uv = geo.attributes.uv;
    if (!uv) {
      uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
      geo.setAttribute('uv', uv);
    }
    const spanZ = Math.max(1e-5, bounds.maxZ - bounds.minZ);
    const spanY = Math.max(1e-5, bounds.maxY - bounds.minY);
    const mat = mesh.matrix;
    for (let i = 0; i < pos.count; i++) {
      _uvProjVec.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat);
      const u = Math.max(0.002, Math.min(0.998, (bounds.maxZ - _uvProjVec.z) / spanZ));
      const v = Math.max(0.002, Math.min(0.998, (_uvProjVec.y - bounds.minY) / spanY));
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
    return mesh;
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

  // ---------- 5 Authentic CS:S-Faceted x CS2-Silhouette 3D Knife Models ----------
  function buildKnifeModel(item, targetRenderer) {
    const group = new THREE.Group();
    const kt = (item && item.knifeType) || 'default';
    const bladeMat = createBladeMaterial(item || KS.createStarterKnife(), targetRenderer);
    const isUV = item && item.skinId === 'ultraviolet';

    const gripMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x3b2c68 : 0x181f28,
      roughness: 0.76,
      metalness: 0.16
    });
    const tapeMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x2c204d : 0x171a20,
      roughness: 0.90,
      metalness: 0.06
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x574199 : 0x2a3440,
      roughness: 0.34,
      metalness: 0.90
    });
    const accentSteelMat = new THREE.MeshStandardMaterial({
      color: isUV ? 0x9b7dff : 0x89a0b6,
      roughness: 0.22,
      metalness: 0.94
    });
    const recessedMat = new THREE.MeshStandardMaterial({
      color: 0x0b1219,
      roughness: 0.62,
      metalness: 0.58
    });

    if (kt === 'karambit') {
      // Faceted CS:S retention ring with chamfered tang collar
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0049, 8, 22), darkSteelMat);
      group.add(ring);

      const ringInnerRim = new THREE.Mesh(new THREE.TorusGeometry(0.0140, 0.0014, 6, 20), accentSteelMat);
      group.add(ringInnerRim);

      const ringCollar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.0086), darkSteelMat);
      ringCollar.position.set(0.022, 0.003, 0);
      group.add(ringCollar);

      // Ergonomic scalloped CS2 Karambit grip with 3 finger grooves & 1-seg chamfered G10 scales
      const handleShape = new THREE.Shape();
      handleShape.moveTo(0.018, 0.010);
      handleShape.quadraticCurveTo(0.068, 0.030, 0.119, 0.018);
      handleShape.lineTo(0.115, -0.013);
      handleShape.quadraticCurveTo(0.100, -0.023, 0.089, -0.010);
      handleShape.quadraticCurveTo(0.072, -0.022, 0.060, -0.009);
      handleShape.quadraticCurveTo(0.044, -0.020, 0.031, -0.007);
      handleShape.lineTo(0.019, -0.007);
      handleShape.closePath();

      const tangGeo = new THREE.ExtrudeGeometry(handleShape, { depth: 0.0068, bevelEnabled: false });
      tangGeo.translate(0, 0, -0.0034);
      group.add(new THREE.Mesh(tangGeo, darkSteelMat));

      const scaleGeo = new THREE.ExtrudeGeometry(handleShape, {
        depth: 0.0142,
        bevelEnabled: true,
        bevelThickness: 0.0032,
        bevelSize: 0.0022,
        bevelSegments: 1
      });
      scaleGeo.translate(0, 0, -0.0071);
      const scaleMesh = new THREE.Mesh(scaleGeo, gripMat);
      scaleMesh.scale.set(0.95, 0.90, 1.0);
      scaleMesh.position.set(0.003, 0.0005, 0);
      group.add(scaleMesh);

      // Angled machined bolster + thumb jimping notches
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.035, 0.0215), darkSteelMat);
      bolster.position.set(0.116, 0.002, 0);
      bolster.rotation.z = -0.20;
      group.add(bolster);

      for (let j = 0; j < 4; j++) {
        const jimp = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0032, 0.0062), accentSteelMat);
        jimp.position.set(0.114 + j * 0.0046, 0.0195 - j * 0.0006, 0);
        group.add(jimp);
      }

      // Recessed hex pivot + Torx scale screws
      for (const [px, py, rad] of [[0.042, 0.005, 0.0034], [0.072, 0.008, 0.0034], [0.102, 0.004, 0.0048]]) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.0222, 6), accentSteelMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(px, py, 0);
        group.add(pin);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, 0.0230, 6), recessedMat);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(px, py, 0);
        group.add(cap);
      }

      // Swept tiger-claw blade with crisp CS:S ridge facet & needle talon tip
      const stations = [];
      const cx = 0.097, cy = -0.108;
      const N = 15;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ang = THREE.MathUtils.lerp(1.43, -0.22, t);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rOuter = THREE.MathUtils.lerp(0.130, 0.139, Math.sin(t * Math.PI * 0.72)) - t * t * 0.0045;
        const width = 0.036 * Math.pow(1 - t, 0.70);
        const rInner = rOuter - width;
        const rRidge = rOuter - width * 0.30;
        const thick = 0.0048 * (1 - t * 0.86);
        if (i === N) {
          const tipX = cx + ca * rOuter;
          const tipY = cy + sa * rOuter;
          stations.push({ spine: [tipX, tipY], ridge: [tipX, tipY], edge: [tipX, tipY], spineT: 0, ridgeT: 0 });
        } else {
          stations.push({
            spine: [cx + ca * rOuter, cy + sa * rOuter],
            ridge: [cx + ca * rRidge, cy + sa * rRidge],
            edge: [cx + ca * rInner, cy + sa * rInner],
            spineT: thick * 0.74,
            ridgeT: thick
          });
        }
      }
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations), bladeMat));
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'skeleton') {
      const unifiedBounds = {
        min: new THREE.Vector3(-0.156, -0.029, -0.01),
        max: new THREE.Vector3(0.188, 0.029, 0.01)
      };

      const tangShape = new THREE.Shape();
      tangShape.moveTo(-0.154, 0.0);
      tangShape.lineTo(-0.125, 0.0145);
      tangShape.lineTo(-0.031, 0.0165);
      tangShape.quadraticCurveTo(-0.018, 0.026, 0.0, 0.026);
      tangShape.quadraticCurveTo(0.018, 0.026, 0.031, 0.0185);
      tangShape.lineTo(0.031, -0.0185);
      tangShape.quadraticCurveTo(0.018, -0.026, 0.0, -0.026);
      tangShape.quadraticCurveTo(-0.018, -0.026, -0.031, -0.0165);
      tangShape.lineTo(-0.125, -0.0145);
      tangShape.closePath();

      const centerHole = new THREE.Path();
      centerHole.absarc(0, 0, 0.0158, 0, Math.PI * 2, false);
      tangShape.holes.push(centerHole);

      const rearSlot = new THREE.Path();
      rearSlot.moveTo(-0.114, -0.0052);
      rearSlot.lineTo(-0.044, -0.0052);
      rearSlot.lineTo(-0.044, 0.0052);
      rearSlot.lineTo(-0.114, 0.0052);
      rearSlot.closePath();
      tangShape.holes.push(rearSlot);

      const tangGeo = new THREE.ExtrudeGeometry(tangShape, {
        depth: 0.0058,
        bevelEnabled: true,
        bevelThickness: 0.0018,
        bevelSize: 0.0014,
        bevelSegments: 1
      });
      tangGeo.translate(0, 0, -0.0029);
      normalizeGeometryUVs(tangGeo, unifiedBounds);
      tangGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tangGeo, bladeMat));

      // Inner metallic ring chamfer around finger hole
      const holeBevel = new THREE.Mesh(new THREE.TorusGeometry(0.0162, 0.0014, 6, 20), accentSteelMat);
      group.add(holeBevel);

      const stations = [
        { spine: [0.026, 0.0185], ridge: [0.026, 0.006], edge: [0.026, -0.0185], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.048, 0.0215], ridge: [0.048, 0.008], edge: [0.048, -0.0235], spineT: 0.0036, ridgeT: 0.0046 },
        { spine: [0.079, 0.0225], ridge: [0.079, 0.009], edge: [0.079, -0.0255], spineT: 0.0034, ridgeT: 0.0044 },
        { spine: [0.114, 0.0205], ridge: [0.114, 0.008], edge: [0.114, -0.0235], spineT: 0.0030, ridgeT: 0.0039 },
        { spine: [0.146, 0.0145], ridge: [0.146, 0.005], edge: [0.146, -0.0165], spineT: 0.0022, ridgeT: 0.0028 },
        { spine: [0.170, 0.0070], ridge: [0.170, 0.002], edge: [0.170, -0.0072], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.188, 0.0010], ridge: [0.188, 0.001], edge: [0.188, 0.0010], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(stations, unifiedBounds), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.0044, 0.0096), recessedMat);
      fuller.position.set(0.088, 0.0132, 0);
      fuller.rotation.z = -0.04;
      group.add(fuller);

      // Diagonal paracord / grip tape wrap with chamfered ridges
      for (let i = 0; i < 8; i++) {
        const tx = -0.112 + i * 0.0108;
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.0112, 0.0325, 0.0124), i % 2 === 0 ? tapeMat : gripMat);
        wrap.position.set(tx, 0, 0);
        wrap.rotation.z = (i % 2 === 0 ? 0.26 : -0.20);
        group.add(wrap);
      }
      group.userData.spinPivot = new THREE.Vector3(0, 0, 0);

    } else if (kt === 'butterfly') {
      function buildUChannelHandle(isBite) {
        const hGroup = new THREE.Group();
        const sign = isBite ? -1 : 1;

        const sideShape = new THREE.Shape();
        sideShape.moveTo(0.0, -0.0078 * sign);
        sideShape.quadraticCurveTo(-0.068, -0.0112 * sign, -0.134, -0.0058 * sign);
        sideShape.quadraticCurveTo(-0.140, 0.0, -0.134, 0.0078 * sign);
        sideShape.quadraticCurveTo(-0.068, 0.0046 * sign, 0.0, 0.0078 * sign);
        sideShape.quadraticCurveTo(0.0085, 0.0, 0.0, -0.0078 * sign);
        sideShape.closePath();

        for (const hx of [-0.032, -0.068, -0.104]) {
          const cut = new THREE.Path();
          cut.absellipse(hx, -0.0005 * sign, 0.0128, 0.0038, 0, Math.PI * 2, false, 0);
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

        const spacer = new THREE.Mesh(new THREE.BoxGeometry(0.120, 0.0038, 0.0108), darkSteelMat);
        spacer.position.set(-0.068, -0.0070 * sign, 0);
        hGroup.add(spacer);

        const frontBolster = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0088, 0.0188, 10), darkSteelMat);
        frontBolster.rotation.x = Math.PI / 2;
        hGroup.add(frontBolster);

        const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0208, 6), accentSteelMat);
        pivotPin.rotation.x = Math.PI / 2;
        hGroup.add(pivotPin);

        const buttSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.0135, 0.0112), accentSteelMat);
        buttSpacer.position.set(-0.130, 0, 0);
        hGroup.add(buttSpacer);

        if (isBite) {
          const latchStem = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.0052, 0.0072), accentSteelMat);
          latchStem.position.set(-0.143, 0.002, 0);
          latchStem.rotation.z = 0.24;
          hGroup.add(latchStem);
          const latchHead = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.009, 0.0082), darkSteelMat);
          latchHead.position.set(-0.151, 0.004, 0);
          latchHead.rotation.z = 0.24;
          hGroup.add(latchHead);
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

      const tangBlock = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.027, 0.0074), darkSteelMat);
      tangBlock.position.set(0.003, -0.0095, 0);
      bladePivot.add(tangBlock);

      // Tang horn / zen kicker stop pin
      const tangPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.015, 6), accentSteelMat);
      tangPin.rotation.x = Math.PI / 2;
      tangPin.position.set(0.011, -0.0095, 0);
      bladePivot.add(tangPin);

      // Authentic curved CS2 Balisong clip-point blade with bold spine hump & hollow grind ridge
      const bladeStations = [
        { spine: [0.008, 0.008], ridge: [0.008, -0.003], edge: [0.008, -0.020], spineT: 0.0032, ridgeT: 0.0040 },
        { spine: [0.028, 0.014], ridge: [0.028, -0.001], edge: [0.028, -0.018], spineT: 0.0033, ridgeT: 0.0041 },
        { spine: [0.058, 0.009], ridge: [0.058, -0.003], edge: [0.058, -0.022], spineT: 0.0031, ridgeT: 0.0038 },
        { spine: [0.095, 0.011], ridge: [0.095, -0.002], edge: [0.095, -0.024], spineT: 0.0028, ridgeT: 0.0035 },
        { spine: [0.128, 0.006], ridge: [0.128, -0.004], edge: [0.128, -0.020], spineT: 0.0021, ridgeT: 0.0027 },
        { spine: [0.153, -0.001], ridge: [0.153, -0.006], edge: [0.153, -0.012], spineT: 0.0011, ridgeT: 0.0015 },
        { spine: [0.172, -0.005], ridge: [0.172, -0.005], edge: [0.172, -0.005], spineT: 0.0, ridgeT: 0.0 }
      ];
      bladePivot.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.0052, 0.0084), recessedMat);
      fuller.position.set(0.070, 0.0018, 0);
      bladePivot.add(fuller);

      const biteHandlePivot = new THREE.Group();
      biteHandlePivot.position.set(0, -0.019, 0);
      biteHandlePivot.add(buildUChannelHandle(true));
      bladePivot.add(biteHandlePivot);

      group.userData.safeHandleGroup = safeHandleGroup;
      group.userData.bladePivot = bladePivot;
      group.userData.biteHandlePivot = biteHandlePivot;

    } else if (kt === 'm9') {
      // Heavy M9 Bayonet Bowie clip-point blade with fuller, wire-cutter slot & machined sawteeth
      const bladeStations = [
        { spine: [0.074, 0.0265], ridge: [0.074, 0.005], edge: [0.074, -0.0245], spineT: 0.0044, ridgeT: 0.0052 },
        { spine: [0.132, 0.0265], ridge: [0.132, 0.005], edge: [0.132, -0.0245], spineT: 0.0044, ridgeT: 0.0052 },
        { spine: [0.198, 0.0265], ridge: [0.198, 0.006], edge: [0.198, -0.0245], spineT: 0.0040, ridgeT: 0.0048 },
        { spine: [0.232, 0.0245], ridge: [0.232, 0.007], edge: [0.232, -0.0225], spineT: 0.0033, ridgeT: 0.0041 },
        { spine: [0.266, 0.0145], ridge: [0.266, 0.005], edge: [0.266, -0.0145], spineT: 0.0020, ridgeT: 0.0026 },
        { spine: [0.300, 0.0030], ridge: [0.300, 0.003], edge: [0.300, 0.0030], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      // Stepped machined trapezoidal sawteeth along dorsal spine (authentic M9 silhouette)
      const toothShape = new THREE.Shape();
      toothShape.moveTo(-0.0052, 0);
      toothShape.lineTo(-0.0012, 0.0072);
      toothShape.lineTo(0.0034, 0.0072);
      toothShape.lineTo(0.0052, 0);
      toothShape.closePath();
      const toothGeo = new THREE.ExtrudeGeometry(toothShape, { depth: 0.0052, bevelEnabled: false });
      toothGeo.translate(0, 0, -0.0026);
      normalizeGeometryUVs(toothGeo);
      for (let i = 0; i < 9; i++) {
        const tooth = new THREE.Mesh(toothGeo, bladeMat);
        tooth.position.set(0.090 + i * 0.0145, 0.0255, 0);
        group.add(tooth);
      }

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.130, 0.0088, 0.0108), recessedMat);
      fuller.position.set(0.150, 0.012, 0);
      group.add(fuller);

      // Wire-cutter oblong eye
      const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0112, 10), recessedMat);
      eyeRing.rotation.x = Math.PI / 2;
      eyeRing.scale.set(1.65, 0.70, 1);
      eyeRing.position.set(0.230, -0.001, 0);
      group.add(eyeRing);

      // Heavy crossguard + faceted rifle muzzle ring
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.088, 0.025), darkSteelMat);
      guard.position.set(0.068, 0.004, 0);
      group.add(guard);

      const barrelRing = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0038, 8, 16), darkSteelMat);
      barrelRing.rotation.y = Math.PI / 2;
      barrelRing.position.set(0.068, 0.049, 0);
      group.add(barrelRing);

      // Barrel-profile ribbed tactical handle (10-sided faceted CS:S grip)
      const gripCore = new THREE.Mesh(new THREE.CylinderGeometry(0.0160, 0.0172, 0.134, 10), gripMat);
      gripCore.rotation.z = Math.PI / 2;
      group.add(gripCore);
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.0174, 0.0026, 6, 12), darkSteelMat);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(-0.048 + i * 0.019, 0, 0);
        group.add(rib);
      }

      // Octagonal steel bayonet latch pommel
      const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0185, 0.021, 8), darkSteelMat);
      pommel.rotation.z = Math.PI / 2;
      pommel.position.set(-0.075, 0, 0);
      group.add(pommel);
      const pommelCap = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.016), accentSteelMat);
      pommelCap.position.set(-0.087, 0, 0);
      group.add(pommelCap);

    } else {
      // Default Tactical — sharp CS:S/CS2 combat drop-point with swedge, angled guard & faceted grip
      const bladeStations = [
        { spine: [0.066, 0.019], ridge: [0.066, 0.005], edge: [0.066, -0.0175], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.116, 0.021], ridge: [0.116, 0.006], edge: [0.116, -0.0185], spineT: 0.0036, ridgeT: 0.0045 },
        { spine: [0.178, 0.0195], ridge: [0.178, 0.006], edge: [0.178, -0.0175], spineT: 0.0031, ridgeT: 0.0039 },
        { spine: [0.226, 0.012], ridge: [0.226, 0.004], edge: [0.226, -0.0115], spineT: 0.0020, ridgeT: 0.0026 },
        { spine: [0.264, 0.001], ridge: [0.264, 0.001], edge: [0.264, 0.001], spineT: 0.0, ridgeT: 0.0 }
      ];
      group.add(new THREE.Mesh(buildSharpenedBladeGeometry(bladeStations), bladeMat));

      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.0048, 0.0092), recessedMat);
      fuller.position.set(0.134, 0.0112, 0);
      group.add(fuller);

      // Angled dual-wing tactical guard with dorsal jimping
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.0135, 0.058, 0.0245), darkSteelMat);
      guard.position.set(0.062, -0.002, 0);
      guard.rotation.z = -0.10;
      group.add(guard);

      const hShape = new THREE.Shape();
      hShape.moveTo(-0.065, 0.0135);
      hShape.quadraticCurveTo(0.0, 0.0195, 0.059, 0.0155);
      hShape.lineTo(0.059, -0.0155);
      hShape.quadraticCurveTo(0.024, -0.0195, -0.006, -0.0155);
      hShape.quadraticCurveTo(-0.036, -0.0125, -0.065, -0.0165);
      hShape.closePath();
      const hGeo = new THREE.ExtrudeGeometry(hShape, {
        depth: 0.0152,
        bevelEnabled: true,
        bevelThickness: 0.0038,
        bevelSize: 0.0028,
        bevelSegments: 1
      });
      hGeo.translate(0, 0, -0.0076);
      group.add(new THREE.Mesh(hGeo, gripMat));

      for (const rx of [-0.036, -0.012, 0.014, 0.038]) {
        const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.0068, 0.0255, 0.0242), darkSteelMat);
        inlay.position.set(rx, 0, 0);
        group.add(inlay);
      }

      const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.031, 0.021), accentSteelMat);
      pommel.position.set(-0.071, -0.001, 0);
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
          if (m.bumpMap) texs.add(m.bumpMap);
          if (m.normalMap) texs.add(m.normalMap);
          if (m.metalnessMap) texs.add(m.metalnessMap);
        }
      }
    });
    texs.forEach((t) => t.dispose());
    mats.forEach((m) => m.dispose());
  }

  // ---------- 4-Archetype CS:S-Faceted Articulated First-Person Hands Rig ----------
  // Supports live switching between Standard, Sport, Specialist, and Hand Wraps
  // with procedural PBR albedo/roughness/bump maps and zero geometry rebuilds.
  function buildHandsRig() {
    const rootRig = new THREE.Group();

    const gloveMaterials = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xc59374,
        roughness: 0.70,
        metalness: 0.02
      }),
      nail: new THREE.MeshStandardMaterial({
        color: 0xd9b39c,
        roughness: 0.42,
        metalness: 0.04
      }),
      gloveBase: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.74,
        metalness: 0.14,
        bumpScale: 0.0045
      }),
      palmLeather: new THREE.MeshStandardMaterial({
        color: 0x121820,
        roughness: 0.84,
        metalness: 0.08
      }),
      knuckleCarbon: new THREE.MeshStandardMaterial({
        color: 0x263444,
        roughness: 0.30,
        metalness: 0.68
      }),
      cuffTrim: new THREE.MeshStandardMaterial({
        color: 0x45c8e6,
        emissive: 0x0b4b5c,
        emissiveIntensity: 0.40,
        roughness: 0.34,
        metalness: 0.48
      }),
      sleeve: new THREE.MeshStandardMaterial({
        color: 0x101720,
        roughness: 0.86,
        metalness: 0.10
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
    const nailMeshes = [];
    const palmBaseMeshes = [];
    const palmPadMeshes = [];

    function createArticulatedHand(side) {
      const handGroup = new THREE.Group();

      // 1) Slimmed CS:S faceted athletic forearm sleeve + folded cuff seam
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.050, 0.48, 10), gloveMaterials.sleeve);
      forearm.rotation.x = Math.PI / 2;
      forearm.scale.set(1.06, 1.0, 0.84);
      forearm.position.set(side * 0.007, -0.011, 0.308);
      handGroup.add(forearm);

      const sleeveHem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.039, 0.022, 10), gloveMaterials.palmLeather);
      sleeveHem.rotation.x = Math.PI / 2;
      sleeveHem.scale.set(1.08, 1.0, 0.85);
      sleeveHem.position.set(side * 0.005, -0.009, 0.095);
      handGroup.add(sleeveHem);

      // 2) Core crisp-beveled anatomically tapered palm (UV normalized for clean pattern mapping)
      const palmShape = new THREE.Shape();
      palmShape.moveTo(-0.029, -0.041);
      palmShape.lineTo(0.029, -0.041);
      palmShape.quadraticCurveTo(0.037, -0.005, 0.035, 0.043);
      palmShape.quadraticCurveTo(0.0, 0.048, -0.036, 0.043);
      palmShape.quadraticCurveTo(-0.037, -0.005, -0.029, -0.041);
      palmShape.closePath();

      const palmGeo = new THREE.ExtrudeGeometry(palmShape, {
        depth: 0.0165,
        bevelEnabled: true,
        bevelThickness: 0.0046,
        bevelSize: 0.0038,
        bevelSegments: 1
      });
      normalizeGeometryUVs(palmGeo);
      palmGeo.rotateX(-Math.PI / 2);
      palmGeo.translate(0, -0.0095, 0.0);
      const palmMesh = new THREE.Mesh(palmGeo, gloveMaterials.gloveBase);
      handGroup.add(palmMesh);
      palmBaseMeshes.push(palmMesh);

      // Crisp faceted dorsal metacarpal plane (catches directional highlights cleanly)
      const dorsalGeo = new THREE.CylinderGeometry(0.031, 0.035, 0.010, 8);
      normalizeGeometryUVs(dorsalGeo);
      const dorsalArch = new THREE.Mesh(dorsalGeo, gloveMaterials.gloveBase);
      dorsalArch.scale.set(1.02, 0.85, 1.16);
      dorsalArch.position.set(0, 0.0085, -0.002);
      handGroup.add(dorsalArch);
      palmBaseMeshes.push(dorsalArch);

      const wristBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.042, 8), gloveMaterials.gloveBase);
      wristBridge.rotation.x = Math.PI / 2;
      wristBridge.scale.set(1.04, 1.0, 0.68);
      wristBridge.position.set(side * 0.003, -0.004, 0.038);
      handGroup.add(wristBridge);
      palmBaseMeshes.push(wristBridge);

      // Palm grip pad + faceted thenar / hypothenar muscle pads
      const palmPad = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.0075, 0.058), gloveMaterials.palmLeather);
      palmPad.position.set(0, -0.0115, -0.008);
      handGroup.add(palmPad);
      palmPadMeshes.push(palmPad);

      const thenar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.038, 8), gloveMaterials.palmLeather);
      thenar.rotation.x = Math.PI / 2;
      thenar.scale.set(1.05, 1.0, 0.65);
      thenar.position.set(-side * 0.022, -0.011, 0.006);
      handGroup.add(thenar);
      palmPadMeshes.push(thenar);

      const hypothenar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.040, 8), gloveMaterials.palmLeather);
      hypothenar.rotation.x = Math.PI / 2;
      hypothenar.scale.set(0.90, 1.0, 0.64);
      hypothenar.position.set(side * 0.025, -0.0095, 0.011);
      handGroup.add(hypothenar);
      palmPadMeshes.push(hypothenar);

      // ============================================================
      // ARCHETYPE LAYER 1: STANDARD (CS:S Fingerless Tactical)
      // ============================================================
      const stdGrp = new THREE.Group();
      const stdCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.039, 0.056, 10), gloveMaterials.gloveBase);
      stdCuff.rotation.x = Math.PI / 2;
      stdCuff.scale.set(1.10, 1.0, 0.80);
      stdCuff.position.set(side * 0.004, -0.006, 0.070);
      stdGrp.add(stdCuff);

      const stdStrap = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.012, 0.020), gloveMaterials.knuckleCarbon);
      stdStrap.position.set(0, 0.020, 0.067);
      stdGrp.add(stdStrap);

      const stdPiping = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.007, 10), gloveMaterials.cuffTrim);
      stdPiping.rotation.x = Math.PI / 2;
      stdPiping.scale.set(1.12, 1.0, 0.82);
      stdPiping.position.set(side * 0.004, -0.006, 0.047);
      stdGrp.add(stdPiping);

      const stdKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.0085, 0.020), gloveMaterials.knuckleCarbon);
      stdKnuckle.position.set(0, 0.012, -0.035);
      stdGrp.add(stdKnuckle);

      handGroup.add(stdGrp);
      archetypeGroups.standard.push(stdGrp);

      // ============================================================
      // ARCHETYPE LAYER 2: SPORT GLOVES (CS2 Sleek Athletic Full-Finger)
      // ============================================================
      const sportGrp = new THREE.Group();
      const sportCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.062, 10), gloveMaterials.gloveBase);
      sportCuff.rotation.x = Math.PI / 2;
      sportCuff.scale.set(1.08, 1.0, 0.82);
      sportCuff.position.set(side * 0.004, -0.006, 0.070);
      sportGrp.add(sportCuff);

      const sportBand = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 10), gloveMaterials.cuffTrim);
      sportBand.rotation.x = Math.PI / 2;
      sportBand.scale.set(1.10, 1.0, 0.84);
      sportBand.position.set(side * 0.004, -0.005, 0.050);
      sportGrp.add(sportBand);

      const sportTab = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.007, 0.020), gloveMaterials.knuckleCarbon);
      sportTab.position.set(0, 0.022, 0.072);
      sportGrp.add(sportTab);

      // Molded faceted dorsal aero-ribs
      for (const rx of [-0.024, -0.008, 0.008, 0.024]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.0055, 0.046), gloveMaterials.knuckleCarbon);
        rib.position.set(rx * side, 0.0165, -0.006);
        sportGrp.add(rib);
      }
      // Sculpted low-profile knuckle crest bar
      const sportCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.062, 8), gloveMaterials.cuffTrim);
      sportCrest.rotation.z = Math.PI / 2;
      sportCrest.scale.set(1.0, 0.68, 1.0);
      sportCrest.position.set(0, 0.0155, -0.035);
      sportGrp.add(sportCrest);

      sportGrp.visible = false;
      handGroup.add(sportGrp);
      archetypeGroups.sport.push(sportGrp);

      // ============================================================
      // ARCHETYPE LAYER 3: SPECIALIST GLOVES (CS2 Armored Tactical)
      // ============================================================
      const specGrp = new THREE.Group();
      const specGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.043, 0.076, 10), gloveMaterials.gloveBase);
      specGauntlet.rotation.x = Math.PI / 2;
      specGauntlet.scale.set(1.12, 1.0, 0.84);
      specGauntlet.position.set(side * 0.004, -0.006, 0.076);
      specGrp.add(specGauntlet);

      for (const sz of [0.054, 0.086]) {
        const sBand = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.015), gloveMaterials.knuckleCarbon);
        sBand.position.set(0, 0.020, sz);
        specGrp.add(sBand);
      }
      const specTrim = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.0065, 0.011), gloveMaterials.cuffTrim);
      specTrim.position.set(0, 0.026, 0.070);
      specGrp.add(specTrim);

      // Faceted hexagonal-bevel knuckle bumper shield
      const armorMain = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.026), gloveMaterials.knuckleCarbon);
      armorMain.position.set(0, 0.016, -0.036);
      specGrp.add(armorMain);

      const armorRidge = new THREE.Mesh(new THREE.BoxGeometry(0.070, 0.0055, 0.009), gloveMaterials.cuffTrim);
      armorRidge.position.set(0, 0.0235, -0.035);
      specGrp.add(armorRidge);

      // Dorsal rubberized metacarpal shield plate
      const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0095, 0.042), gloveMaterials.knuckleCarbon);
      backPlate.position.set(0, 0.016, 0.004);
      specGrp.add(backPlate);

      specGrp.visible = false;
      handGroup.add(specGrp);
      archetypeGroups.specialist.push(specGrp);

      // ============================================================
      // ARCHETYPE LAYER 4: HAND WRAPS (CS2 Layered Diagonal Cloth Bandages)
      // ============================================================
      const wrapsGrp = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.033 + i * 0.0008, 0.0066, 6, 14), gloveMaterials.gloveBase);
        coil.scale.set(1.10, 0.78, 0.90);
        coil.position.set(side * 0.003, -0.005, 0.042 + i * 0.0132);
        coil.rotation.y = (i % 2 === 0 ? 0.14 : -0.14) * side;
        coil.rotation.x = 0.06;
        wrapsGrp.add(coil);
      }
      for (let i = 0; i < 4; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0062, 6, 14), gloveMaterials.gloveBase);
        band.scale.set(1.04, 0.54, 0.94);
        band.position.set(0, -0.0005 + (i % 2) * 0.0012, -0.028 + i * 0.0175);
        band.rotation.y = (i % 2 === 0 ? 0.16 : -0.16) * side;
        band.rotation.x = 0.05;
        wrapsGrp.add(band);
      }
      const xStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0050, 0.0125), gloveMaterials.gloveBase);
      xStrip1.position.set(-side * 0.002, 0.0135, -0.011);
      xStrip1.rotation.y = 0.50 * side;
      wrapsGrp.add(xStrip1);

      const xStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0050, 0.0125), gloveMaterials.gloveBase);
      xStrip2.position.set(side * 0.002, 0.0145, -0.009);
      xStrip2.rotation.y = -0.48 * side;
      wrapsGrp.add(xStrip2);

      const wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.028, 10), gloveMaterials.skin);
      wristSkin.rotation.x = Math.PI / 2;
      wristSkin.scale.set(1.06, 1.0, 0.80);
      wristSkin.position.set(side * 0.004, -0.007, 0.097);
      wrapsGrp.add(wristSkin);

      const wrapTab = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.0055, 0.0115), gloveMaterials.cuffTrim);
      wrapTab.position.set(0, 0.021, 0.068);
      wrapsGrp.add(wrapTab);

      wrapsGrp.visible = false;
      handGroup.add(wrapsGrp);
      archetypeGroups.wraps.push(wrapsGrp);

      // ============================================================
      // 3-JOINT TAPERED OCTAGONAL FINGERS + KNUCKLE CAPS & NAILS
      // ============================================================
      const fingerSpecs = [
        { name: 'index',  x: -0.0270, y:  0.001, z: -0.043, lens: [0.032, 0.022, 0.018], rads: [0.0076, 0.0068, 0.0058] },
        { name: 'middle', x: -0.0090, y:  0.003, z: -0.046, lens: [0.035, 0.024, 0.019], rads: [0.0078, 0.0070, 0.0060] },
        { name: 'ring',   x:  0.0090, y:  0.001, z: -0.044, lens: [0.033, 0.022, 0.018], rads: [0.0074, 0.0066, 0.0056] },
        { name: 'pinky',  x:  0.0260, y: -0.003, z: -0.040, lens: [0.026, 0.018, 0.015], rads: [0.0065, 0.0058, 0.0049] }
      ];

      const fingers = {};

      for (const spec of fingerSpecs) {
        // Standard carbon knuckle dome (faceted low-poly)
        const dome = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[0] * 1.10, 8, 6), gloveMaterials.knuckleCarbon);
        dome.scale.set(1.0, 0.70, 1.0);
        dome.position.set(spec.x * side, spec.y + 0.0085, spec.z + 0.007);
        stdGrp.add(dome);

        // Specialist bulky knuckle armor stud
        const specStud = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 2.15, 0.011, 0.015), gloveMaterials.knuckleCarbon);
        specStud.position.set(spec.x * side, spec.y + 0.013, spec.z + 0.006);
        specGrp.add(specStud);

        const mcp = new THREE.Group();
        mcp.position.set(spec.x * side, spec.y, spec.z);
        handGroup.add(mcp);

        // Proximal phalanx: tapered 8-sided octagonal cylinder + knuckle joint cap
        const s0 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[1] * 0.98, spec.rads[0] * 1.04, spec.lens[0], 8),
          gloveMaterials.gloveBase
        );
        s0.rotation.x = Math.PI / 2;
        s0.position.set(0, 0, -spec.lens[0] * 0.5);
        mcp.add(s0);
        fingerProxMeshes.push(s0);

        const j0 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[0] * 0.98, 8, 6), gloveMaterials.gloveBase);
        mcp.add(j0);
        fingerProxMeshes.push(j0);

        // Specialist proximal finger guard plate
        const fGuard = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[0] * 1.65, 0.0055, spec.lens[0] * 0.65), gloveMaterials.knuckleCarbon);
        fGuard.position.set(0, spec.rads[0] * 0.92, -spec.lens[0] * 0.45);
        fGuard.visible = false;
        mcp.add(fGuard);
        archetypeGroups.specialist.push(fGuard);

        const hem = new THREE.Mesh(new THREE.TorusGeometry(spec.rads[1] * 1.02, 0.0014, 6, 10), gloveMaterials.knuckleCarbon);
        hem.position.set(0, 0, -spec.lens[0] * 0.90);
        mcp.add(hem);
        fingerHemMeshes.push(hem);

        const pip = new THREE.Group();
        pip.position.set(0, 0, -spec.lens[0]);
        mcp.add(pip);

        // Middle phalanx: tapered 8-sided cylinder + PIP knuckle joint
        const j1 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[1] * 0.98, 8, 6), gloveMaterials.skin);
        pip.add(j1);
        fingerMidMeshes.push(j1);

        const s1 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[2] * 1.02, spec.rads[1] * 0.98, spec.lens[1], 8),
          gloveMaterials.skin
        );
        s1.rotation.x = Math.PI / 2;
        s1.position.set(0, 0, -spec.lens[1] * 0.5);
        pip.add(s1);
        fingerMidMeshes.push(s1);

        const dip = new THREE.Group();
        dip.position.set(0, 0, -spec.lens[1]);
        pip.add(dip);

        // Distal phalanx: tapered 8-sided tip + rounded fingertip dome + fingernail plate
        const j2 = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[2] * 0.96, 8, 6), gloveMaterials.skin);
        dip.add(j2);
        fingerDistMeshes.push(j2);

        const s2 = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.rads[2] * 0.74, spec.rads[2] * 0.98, spec.lens[2], 8),
          gloveMaterials.skin
        );
        s2.rotation.x = Math.PI / 2;
        s2.position.set(0, 0, -spec.lens[2] * 0.48);
        dip.add(s2);
        fingerDistMeshes.push(s2);

        const tipCap = new THREE.Mesh(new THREE.SphereGeometry(spec.rads[2] * 0.74, 8, 6), gloveMaterials.skin);
        tipCap.position.set(0, 0, -spec.lens[2] * 0.94);
        dip.add(tipCap);
        fingerDistMeshes.push(tipCap);

        const nail = new THREE.Mesh(new THREE.BoxGeometry(spec.rads[2] * 1.05, 0.0014, spec.lens[2] * 0.46), gloveMaterials.nail);
        nail.position.set(0, spec.rads[2] * 0.78, -spec.lens[2] * 0.68);
        dip.add(nail);
        nailMeshes.push(nail);

        fingers[spec.name] = { mcp, pip, dip };
      }

      // 4) Opposable 3-Joint Tapered Octagonal Thumb
      const thumbCmc = new THREE.Group();
      thumbCmc.position.set(-side * 0.034, -0.008, 0.004);
      handGroup.add(thumbCmc);

      const t0 = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0108, 0.028, 8), gloveMaterials.gloveBase);
      t0.rotation.x = Math.PI / 2;
      t0.position.set(0, 0, -0.014);
      thumbCmc.add(t0);
      thumbProxMeshes.push(t0);

      const thumbWrap = new THREE.Mesh(new THREE.TorusGeometry(0.0118, 0.0038, 6, 12), gloveMaterials.gloveBase);
      thumbWrap.position.set(0, 0, -0.012);
      thumbWrap.visible = false;
      thumbCmc.add(thumbWrap);
      archetypeGroups.wraps.push(thumbWrap);

      const thumbArmor = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.0055, 0.019), gloveMaterials.knuckleCarbon);
      thumbArmor.position.set(0, 0.0095, -0.015);
      thumbArmor.visible = false;
      thumbCmc.add(thumbArmor);
      archetypeGroups.specialist.push(thumbArmor);

      const thumbMcp = new THREE.Group();
      thumbMcp.position.set(0, 0, -0.027);
      thumbCmc.add(thumbMcp);

      const tj1 = new THREE.Mesh(new THREE.SphereGeometry(0.0088, 8, 6), gloveMaterials.skin);
      thumbMcp.add(tj1);
      thumbMidMeshes.push(tj1);

      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0080, 0.0090, 0.025, 8), gloveMaterials.skin);
      t1.rotation.x = Math.PI / 2;
      t1.position.set(0, 0, -0.0125);
      thumbMcp.add(t1);
      thumbMidMeshes.push(t1);

      const thumbIp = new THREE.Group();
      thumbIp.position.set(0, 0, -0.024);
      thumbMcp.add(thumbIp);

      const tj2 = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 8, 6), gloveMaterials.skin);
      thumbIp.add(tj2);
      thumbDistMeshes.push(tj2);

      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0078, 0.020, 8), gloveMaterials.skin);
      t2.rotation.x = Math.PI / 2;
      t2.position.set(0, 0, -0.010);
      thumbIp.add(t2);
      thumbDistMeshes.push(t2);

      const tTip = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 8, 6), gloveMaterials.skin);
      tTip.position.set(0, 0, -0.0195);
      thumbIp.add(tTip);
      thumbDistMeshes.push(tTip);

      const tNail = new THREE.Mesh(new THREE.BoxGeometry(0.0082, 0.0014, 0.0095), gloveMaterials.nail);
      tNail.position.set(0, 0.0062, -0.013);
      thumbIp.add(tNail);
      nailMeshes.push(tNail);

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
    let activeGloveBump = null;
    let currentGloveItem = KS.createStarterGlove();

    function applyGlove(gloveItem, targetRenderer) {
      const clean = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
      currentGloveItem = clean;
      const gt = clean.gloveType;
      const { albedoCanvas, roughCanvas, bumpCanvas, palette } = paintGloveToCanvases(clean, getProceduralTexSize());

      if (activeGloveMap) activeGloveMap.dispose();
      if (activeGloveRough) activeGloveRough.dispose();
      if (activeGloveBump) activeGloveBump.dispose();

      activeGloveMap = new THREE.CanvasTexture(albedoCanvas);
      activeGloveMap.colorSpace = THREE.SRGBColorSpace;
      activeGloveMap.wrapS = THREE.RepeatWrapping;
      activeGloveMap.wrapT = THREE.RepeatWrapping;
      const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
      activeGloveMap.anisotropy = Math.min(8, maxAniso);

      activeGloveRough = new THREE.CanvasTexture(roughCanvas);
      activeGloveRough.wrapS = THREE.RepeatWrapping;
      activeGloveRough.wrapT = THREE.RepeatWrapping;

      activeGloveBump = new THREE.CanvasTexture(bumpCanvas);
      activeGloveBump.wrapS = THREE.RepeatWrapping;
      activeGloveBump.wrapT = THREE.RepeatWrapping;

      gloveMaterials.gloveBase.color.setHex(0xffffff);
      gloveMaterials.gloveBase.map = activeGloveMap;
      gloveMaterials.gloveBase.roughnessMap = activeGloveRough;
      gloveMaterials.gloveBase.bumpMap = activeGloveBump;
      gloveMaterials.gloveBase.bumpScale = gt === 'wraps' ? 0.0062 : gt === 'specialist' ? 0.0052 : 0.0044;
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
      for (const m of nailMeshes) {
        m.visible = !isFullFinger;
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
      // Keep the blade extending to screen-right; arm clearance is handled
      // by the hand/forearm rest pose below, not by twisting the knife socket.
      knifeMesh.position.set(-0.0205, -0.0085, -0.043);
      knifeMesh.rotation.set(1.05, 0.04, 0.80);
      knifeMesh.scale.setScalar(1.10);
    } else if (kt === 'skeleton') {
      knifeMesh.position.set(-0.0255, -0.0215, -0.041);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.16, Math.PI - 0.24, 0.08);
      knifeMesh.scale.setScalar(1.03);
    } else if (kt === 'butterfly') {
      knifeMesh.position.set(-0.002, -0.0215, -0.037);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.14, Math.PI - 0.26, 0.06);
      knifeMesh.scale.setScalar(1.03);
    } else if (kt === 'm9') {
      knifeMesh.position.set(0.002, -0.0215, -0.037);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.12, Math.PI - 0.24, 0.05);
      knifeMesh.scale.setScalar(0.94);
    } else {
      knifeMesh.position.set(0.002, -0.0215, -0.037);
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
      // Keep the karambit's hooked-index ring grip, but use the same natural
      // wrist orientation as the other first-person melee models. The old
      // near-vertical wrist roll made the knife look twisted across the palm.
      // Keep the arm's position, but pitch the wrist down so the hand
      // hangs more naturally, closer to the relaxed left-hand angle.
      out.rx = 0.205; out.ry = -0.125; out.rz = -0.35;
      out.rRotX = -0.08; out.rRotY = 0.16; out.rRotZ = -0.34;
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
        // Static CS-style blade presentation: raise the already-open knife
        // into a high diagonal pose and show the blade face to the camera.
        // The bite handle stays rotated through a full turn so both handles
        // remain spread in the characteristic open butterfly silhouette.
        const reveal = smoothstep(0.02, 0.38, t);
        const settle = smoothstep(0.82, 1.0, t);
        const hold = smoothstep(0.34, 0.52, t) * (1 - settle);

        // Lift and cant the wrist into the reference's high, diagonal pose.
        out.rx -= reveal * 0.048;
        out.ry += reveal * 0.014;
        out.rRotX += reveal * 0.18;
        out.rRotY += reveal * 0.28;
        out.rRotZ += reveal * 0.24;
        out.kPosX -= reveal * 0.010;
        out.kPosY += reveal * 0.036;

        // Turn the blade's broad face toward the player, then make only a
        // tiny presentation sweep while keeping the hand essentially still.
        out.kRotY += reveal * 0.30 + hold * Math.sin(t * Math.PI * 1.4) * 0.035;
        out.kRotX += reveal * 0.12 + hold * Math.sin(t * Math.PI * 1.4) * 0.018;
        out.kRotZ -= reveal * 0.08;

        // Fully open silhouette: blade handle aligned, bite handle swung
        // around to the open side (2π is the model's open resting position).
        out.baliBladeAngle = 0;
        out.baliBiteAngle = Math.PI * 2;

        // Keep a secure presentation grip; no finger release or flipping.
        rp.index = THREE.MathUtils.lerp(0.96, 0.94, reveal);
        rp.middle = THREE.MathUtils.lerp(0.98, 0.96, reveal);
        rp.ring = THREE.MathUtils.lerp(0.98, 0.96, reveal);
        rp.pinky = THREE.MathUtils.lerp(0.96, 0.94, reveal);
        rp.thumb = THREE.MathUtils.lerp(0.88, 0.86, reveal);

        if (t > 0.40) cue(1, () => CaseAudio.balisongClack(0.88));
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
    if (kt === 'butterfly') return tier === 'uncommon' ? 3.85 : 3.85;
    if (kt === 'karambit') return tier === 'uncommon' ? 2.15 : 1.85;
    if (kt === 'skeleton') return tier === 'uncommon' ? 2.25 : 1.95;
    return tier === 'uncommon' ? 2.15 : 2.10;
  }

  // ---------- CS:S-Faceted x CS2-Silhouette 3D Firearm Models + Modular 3D Gunsmith Attachments ----------
  function buildWeaponModel(weaponItem, targetRenderer, attachments) {
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const wt = item.weaponType;
    const atts = attachments && typeof attachments === 'object' ? attachments : {};
    const g = new THREE.Group();

    const skinMat = createWeaponMaterial(item, targetRenderer);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a212a, roughness: 0.40, metalness: 0.80 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2f3b49, roughness: 0.32, metalness: 0.88 });
    const brightSteel = new THREE.MeshStandardMaterial({ color: 0x7a8fa3, roughness: 0.24, metalness: 0.92 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x12171e, roughness: 0.84, metalness: 0.10 });
    const scopeLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f82c8,
      emissive: 0x0b3658,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    const accentGlow = new THREE.MeshBasicMaterial({ color: 0x65e7ff });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.92, depthWrite: false });

    // Helper: extrudes a 2D side-profile (shapeX -> +Z rear / -Z front, shapeY -> +Y) symmetrically across X
    function makeSideExtrude(shape, thickness, bevel, mat, uvBounds) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel * 0.85,
        bevelSegments: 1
      });
      geo.translate(0, 0, -thickness * 0.5);
      geo.rotateY(-Math.PI / 2);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      if (uvBounds) projectWeaponMeshUVs(mesh, uvBounds);
      return mesh;
    }

    const addFlash = (parentGrp, yPos, zPos, scale) => {
      const fg = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.036 * scale, 0), flashMat);
      s1.scale.set(1.2, 1.2, 2.2);
      const s2 = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.028 * scale, 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })
      );
      s2.rotation.z = Math.PI / 4;
      s2.scale.set(1.6, 0.35, 1.4);
      fg.add(s1, s2);
      fg.position.set(0, yPos, zPos);
      fg.visible = false;
      parentGrp.add(fg);
      g.userData.muzzleFlash = fg;
    };

    if (wt === 'awp') {
      // Unified side-projected UV bounds (buttstock +0.34 -> forend nose -0.46)
      const uvBounds = { minZ: -0.46, maxZ: 0.34, minY: -0.10, maxY: 0.08 };

      // 1) Iconic Arctic Warfare monolithic polymer chassis with GENUINE cut-through thumbhole stock
      const chassisShape = new THREE.Shape();
      chassisShape.moveTo(0.325, 0.036);      // top of buttpad
      chassisShape.lineTo(0.115, 0.038);      // rear receiver comb
      chassisShape.lineTo(0.068, 0.044);      // bridge behind receiver
      chassisShape.lineTo(-0.425, 0.042);     // long flat forend top
      chassisShape.lineTo(-0.445, 0.024);     // angled forend nose
      chassisShape.lineTo(-0.420, -0.008);    // forend belly nose
      chassisShape.lineTo(-0.125, -0.012);    // under forend to magwell
      chassisShape.lineTo(-0.115, -0.022);    // magwell lip front
      chassisShape.lineTo(-0.028, -0.022);    // magwell lip rear
      chassisShape.lineTo(0.018, -0.014);     // behind trigger guard
      chassisShape.lineTo(0.038, -0.088);     // front edge of pistol grip
      chassisShape.lineTo(0.082, -0.094);     // bottom of pistol grip
      chassisShape.lineTo(0.122, -0.058);     // lower thumbhole bridge
      chassisShape.lineTo(0.240, -0.054);     // lower stock rail
      chassisShape.lineTo(0.260, -0.038);     // monopod cutout notch
      chassisShape.lineTo(0.300, -0.038);
      chassisShape.lineTo(0.325, -0.072);     // bottom heel of buttstock
      chassisShape.closePath();

      // Genuine cut-through AW thumbhole!
      const thumbhole = new THREE.Path();
      thumbhole.moveTo(0.092, 0.010);
      thumbhole.lineTo(0.228, 0.008);
      thumbhole.lineTo(0.236, -0.032);
      thumbhole.lineTo(0.106, -0.038);
      thumbhole.lineTo(0.086, -0.020);
      thumbhole.closePath();
      chassisShape.holes.push(thumbhole);

      const chassisMesh = makeSideExtrude(chassisShape, 0.040, 0.0036, skinMat, uvBounds);
      g.add(chassisMesh);

      // Thick rubberized recoil buttpad & adjustable cheek-riser
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.110, 0.022), gripMat);
      buttpad.position.set(0, -0.017, 0.336);
      g.add(buttpad);

      const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.019, 0.118), gripMat);
      cheekRiser.position.set(0, 0.046, 0.198);
      g.add(cheekRiser);

      // Recessed rubber grip panels on pistol grip
      const gripPanel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.068, 0.034), gripMat);
      gripPanel.position.set(0, -0.052, 0.058);
      gripPanel.rotation.x = 0.24;
      g.add(gripPanel);

      // Upper steel receiver housing + ejection port cutout
      const upperRec = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.215), darkMetal);
      upperRec.position.set(0, 0.048, -0.045);
      g.add(upperRec);
      const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.066), gripMat);
      ejectPort.position.set(0.018, 0.049, -0.032);
      g.add(ejectPort);

      // Removable .338 Lapua box magazine (magGroup)
      const magGroup = new THREE.Group();
      const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.072, 0.074), darkMetal);
      magBody.position.set(0, -0.048, -0.072);
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.010, 0.080), gunmetal);
      magPlate.position.set(0, -0.084, -0.072);
      magGroup.add(magBody, magPlate);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);

      // Open-loop trigger guard + curved trigger
      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.052), darkMetal);
      tgBottom.position.set(0, -0.032, 0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), darkMetal);
      tgFront.position.set(0, -0.021, -0.021);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.020, 0.010);
      trigger.rotation.x = 0.25;
      g.add(tgBottom, tgFront, trigger);

      // Heavy fluted 8-sided free-floating barrel + multi-baffle rectangular muzzle brake
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0148, 0.56, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.046, -0.455);
      g.add(barrel);

      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.026, 0.068), darkMetal);
      brake.position.set(0, 0.046, -0.755);
      g.add(brake);
      for (const bz of [-0.736, -0.758, -0.778]) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.010), gripMat);
        baffle.position.set(0, 0.046, bz);
        g.add(baffle);
      }

      // Folded under-forend tactical bipod
      const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.030), darkMetal);
      bipodMount.position.set(0, -0.014, -0.405);
      g.add(bipodMount);
      for (const bx of [-0.017, 0.017]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0062, 0.195, 6), darkMetal);
        leg.rotation.x = Math.PI / 2 - 0.05;
        leg.position.set(bx, -0.021, -0.305);
        g.add(leg);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0072, 0.018, 6), gripMat);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(bx, -0.025, -0.205);
        g.add(foot);
      }

      // Iconic dual-ring elevated faceted scope + elevation/windage turrets + tinted lenses
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.21), darkMetal);
      rail.position.set(0, 0.064, -0.055);
      g.add(rail);
      for (const rz of [0.015, -0.115]) {
        const ringBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.020), darkMetal);
        ringBase.position.set(0, 0.075, rz);
        const ringClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.020, 10), gunmetal);
        ringClamp.rotation.x = Math.PI / 2;
        ringClamp.position.set(0, 0.094, rz);
        g.add(ringBase, ringClamp);
      }
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.25, 10), darkMetal);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.094, -0.055);
      const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.016, 0.088, 10), gunmetal);
      scopeBell.rotation.x = Math.PI / 2;
      scopeBell.position.set(0, 0.094, -0.218);
      const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.016, 0.064, 10), darkMetal);
      scopeEye.rotation.x = Math.PI / 2;
      scopeEye.position.set(0, 0.094, 0.095);
      const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 8), gunmetal);
      turretTop.position.set(0, 0.114, -0.052);
      const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.014, 8), gunmetal);
      turretSide.rotation.z = Math.PI / 2;
      turretSide.position.set(0.020, 0.094, -0.052);
      const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 10), scopeLensMat);
      rearLens.position.set(0, 0.094, 0.128);
      const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), scopeLensMat);
      frontLens.rotation.y = Math.PI;
      frontLens.position.set(0, 0.094, -0.263);
      g.add(scopeTube, scopeBell, scopeEye, turretTop, turretSide, rearLens, frontLens);

      // Animated bolt-action receiver cylinder + bent bolt stem + oversized tactical knob
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.022, 0.048, 0.036);
      const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.062, 8), brightSteel);
      boltBody.rotation.x = Math.PI / 2;
      boltBody.position.set(-0.012, 0, -0.022);
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.040, 8), gunmetal);
      boltStem.rotation.z = -Math.PI / 2.25;
      boltStem.position.set(0.016, -0.005, 0);
      const boltKnob = new THREE.Mesh(new THREE.OctahedronGeometry(0.0115, 1), darkMetal);
      boltKnob.position.set(0.036, -0.011, 0);
      boltGroup.add(boltBody, boltStem, boltKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.022, 0.048, 0.036);

      addFlash(g, 0.046, -0.81, 1.48);

    } else if (wt === 'deagle') {
      // Unified side-projected UV bounds (beavertail +0.08 -> muzzle -0.215)
      const uvBounds = { minZ: -0.215, maxZ: 0.082, minY: -0.115, maxY: 0.075 };

      // Wrap entire Deagle around spinPivot centered INSIDE the open trigger guard loop!
      // Rotating spinGroup.rotation.x spins the whole pistol smoothly around the player's trigger finger!
      const spinPivotPos = new THREE.Vector3(0, -0.016, -0.026);
      const spinGroup = new THREE.Group();
      spinGroup.position.copy(spinPivotPos);
      g.add(spinGroup);

      const modelRoot = new THREE.Group();
      modelRoot.position.copy(spinPivotPos).negate();
      spinGroup.add(modelRoot);

      g.userData.spinGroup = spinGroup;
      g.userData.spinPivot = spinPivotPos;

      // 1) Iconic heavy triangular-beveled Desert Eagle fixed front barrel shroud
      // Cross-section in XY extruded along Z (from z = -0.205 muzzle to z = -0.032)
      const shroudSec = new THREE.Shape();
      shroudSec.moveTo(-0.0175, 0.016);
      shroudSec.lineTo(0.0175, 0.016);
      shroudSec.lineTo(0.0195, 0.036);
      shroudSec.lineTo(0.0110, 0.064);
      shroudSec.lineTo(-0.0110, 0.064);
      shroudSec.lineTo(-0.0195, 0.036);
      shroudSec.closePath();

      const shroudGeo = new THREE.ExtrudeGeometry(shroudSec, {
        depth: 0.172,
        bevelEnabled: true,
        bevelThickness: 0.0025,
        bevelSize: 0.0018,
        bevelSegments: 1
      });
      shroudGeo.translate(0, 0, -0.204);
      shroudGeo.computeVertexNormals();
      const shroudMesh = new THREE.Mesh(shroudGeo, skinMat);
      projectWeaponMeshUVs(shroudMesh, uvBounds);
      modelRoot.add(shroudMesh);

      // Top Weaver rail cross-slots along fixed barrel shroud
      for (const rz of [-0.176, -0.146, -0.116, -0.086]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.009), darkMetal);
        slot.position.set(0, 0.065, rz);
        modelRoot.add(slot);
      }

      // Recessed .50 AE muzzle crown + dark bore
      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.010, 10), gunmetal);
      muzzleRing.rotation.x = Math.PI / 2;
      muzzleRing.position.set(0, 0.042, -0.208);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0076, 0.0076, 0.012, 8), gripMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(0, 0.042, -0.209);
      modelRoot.add(muzzleRing, bore);

      // Front dovetail ramped iron sight + glowing tritium dot
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.012, 0.016), darkMetal);
      frontSight.position.set(0, 0.070, -0.188);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0035, 0.003), accentGlow);
      frontDot.position.set(0, 0.072, -0.179);
      modelRoot.add(frontSight, frontDot);

      // 2) Reciprocating rear slide (authentic Desert Eagle rear-slide split)
      const slideGroup = new THREE.Group();
      const slideSec = new THREE.Shape();
      slideSec.moveTo(-0.0185, 0.018);
      slideSec.lineTo(0.0185, 0.018);
      slideSec.lineTo(0.0195, 0.040);
      slideSec.lineTo(0.0125, 0.064);
      slideSec.lineTo(-0.0125, 0.064);
      slideSec.lineTo(-0.0195, 0.040);
      slideSec.closePath();

      const slideGeo = new THREE.ExtrudeGeometry(slideSec, {
        depth: 0.088,
        bevelEnabled: true,
        bevelThickness: 0.0022,
        bevelSize: 0.0015,
        bevelSegments: 1
      });
      slideGeo.translate(0, 0, -0.032);
      slideGeo.computeVertexNormals();
      const slideMesh = new THREE.Mesh(slideGeo, skinMat);
      projectWeaponMeshUVs(slideMesh, uvBounds);
      slideGroup.add(slideMesh);

      // Rear slide cocking serrations + ambidextrous safety levers + ejection recess
      for (let i = 0; i < 6; i++) {
        const ser = new THREE.Mesh(new THREE.BoxGeometry(0.041, 0.022, 0.0035), darkMetal);
        ser.position.set(0, 0.036, 0.010 + i * 0.0075);
        ser.rotation.x = 0.20;
        slideGroup.add(ser);
      }
      const safety = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.0075, 0.016), gunmetal);
      safety.position.set(0, 0.052, 0.042);
      slideGroup.add(safety);

      // Rear combat sights with twin glowing tritium dots
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.0065, 0.010, 0.010), darkMetal);
      rearL.position.set(-0.0095, 0.069, 0.044);
      const rearR = rearL.clone();
      rearR.position.x = 0.0095;
      const dotL = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0032, 0.003), accentGlow);
      dotL.position.set(-0.0095, 0.070, 0.050);
      const dotR = dotL.clone();
      dotR.position.x = 0.0095;
      slideGroup.add(rearL, rearR, dotL, dotR);

      modelRoot.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // 3) Exposed animated hammer at rear beavertail
      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.024, 0.054);
      const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.0085, 0.022, 0.012), gunmetal);
      hammerSpur.position.set(0, 0.010, 0.006);
      hammerSpur.rotation.x = -0.35;
      hammerGroup.add(hammerSpur);
      modelRoot.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      // 4) Sculpted lower frame + pronounced beavertail + genuine OPEN-LOOP squared combat trigger guard
      const frameShape = new THREE.Shape();
      frameShape.moveTo(0.074, 0.020);        // pronounced beavertail tip
      frameShape.lineTo(-0.184, 0.020);       // dust cover rail front
      frameShape.lineTo(-0.172, -0.001);      // front angled frame chin
      frameShape.lineTo(-0.056, -0.001);      // front of trigger guard
      frameShape.lineTo(-0.054, -0.036);      // squared combat trigger guard front
      frameShape.lineTo(-0.004, -0.036);      // bottom of trigger guard
      frameShape.lineTo(0.002, -0.012);       // rear of trigger guard
      frameShape.lineTo(0.018, -0.104);       // front strap of bulky .50 grip
      frameShape.lineTo(0.068, -0.098);       // rear grip heel
      frameShape.lineTo(0.052, 0.005);        // under beavertail tang
      frameShape.closePath();

      // Open hole inside trigger guard so right index finger passes cleanly through!
      const tgHole = new THREE.Path();
      tgHole.moveTo(-0.046, -0.006);
      tgHole.lineTo(-0.006, -0.006);
      tgHole.lineTo(-0.008, -0.028);
      tgHole.lineTo(-0.046, -0.028);
      tgHole.closePath();
      frameShape.holes.push(tgHole);

      const frameMesh = makeSideExtrude(frameShape, 0.030, 0.0024, darkMetal, null);
      modelRoot.add(frameMesh);

      // Curved Deagle trigger inside open loop
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.019, 0.006), brightSteel);
      trigger.position.set(0, -0.014, -0.016);
      trigger.rotation.x = 0.28;
      modelRoot.add(trigger);

      // Wrap-around ergonomic rubber grip panels
      const gripWrap = new THREE.Mesh(new THREE.BoxGeometry(0.0355, 0.086, 0.044), gripMat);
      gripWrap.position.set(0, -0.052, 0.032);
      gripWrap.rotation.x = 0.24;
      modelRoot.add(gripWrap);

      // Removable .50 AE magazine & chamfered baseplate (magGroup)
      const magGroup = new THREE.Group();
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.013, 0.047), gunmetal);
      magBase.position.set(0, -0.102, 0.044);
      magBase.rotation.x = 0.24;
      const magShaft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.072, 0.036), darkMetal);
      magShaft.position.set(0, -0.062, 0.035);
      magShaft.rotation.x = 0.24;
      magGroup.add(magShaft, magBase);
      modelRoot.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);

      addFlash(modelRoot, 0.042, -0.238, 1.22);

    } else {
      // V-47 Precision Rifle (Iconic CS:S/CS2 AK-47 Faceted Silhouette)
      const uvBounds = { minZ: -0.45, maxZ: 0.30, minY: -0.15, maxY: 0.075 };

      // 1) Sculpted stamped AK receiver + angled lower magwell
      const recShape = new THREE.Shape();
      recShape.moveTo(0.095, 0.034);
      recShape.lineTo(-0.150, 0.036);
      recShape.lineTo(-0.150, -0.008);
      recShape.lineTo(-0.045, -0.010);
      recShape.lineTo(0.015, -0.008);
      recShape.lineTo(0.095, -0.004);
      recShape.closePath();
      g.add(makeSideExtrude(recShape, 0.042, 0.0028, skinMat, uvBounds));

      // Curved ribbed AK top dust cover (faceted half-arch along Z)
      const dustGeo = new THREE.CylinderGeometry(0.019, 0.020, 0.228, 8, 1, false, 0, Math.PI);
      dustGeo.rotateZ(Math.PI / 2);
      dustGeo.rotateY(Math.PI / 2);
      const dustMesh = new THREE.Mesh(dustGeo, skinMat);
      dustMesh.scale.set(1.05, 0.85, 1.0);
      dustMesh.position.set(0, 0.035, -0.024);
      projectWeaponMeshUVs(dustMesh, uvBounds);
      g.add(dustMesh);

      const dustButton = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.012), gunmetal);
      dustButton.position.set(0, 0.036, 0.096);
      g.add(dustButton);

      // 2) Classic angled drop-comb AK buttstock + steel recoil buttpad
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.090, 0.030);
      stockShape.lineTo(0.282, 0.018);
      stockShape.lineTo(0.288, -0.068);
      stockShape.lineTo(0.240, -0.062);
      stockShape.lineTo(0.090, -0.006);
      stockShape.closePath();
      g.add(makeSideExtrude(stockShape, 0.034, 0.0032, skinMat, uvBounds));

      const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.090, 0.014), gripMat);
      buttplate.position.set(0, -0.025, 0.290);
      buttplate.rotation.x = -0.07;
      g.add(buttplate);

      // 3) Sculpted lower handguard + upper gas-tube handguard shroud
      const lowerHgShape = new THREE.Shape();
      lowerHgShape.moveTo(-0.146, 0.026);
      lowerHgShape.lineTo(-0.348, 0.024);
      lowerHgShape.lineTo(-0.340, -0.006);
      lowerHgShape.lineTo(-0.240, -0.012);
      lowerHgShape.lineTo(-0.146, -0.008);
      lowerHgShape.closePath();
      g.add(makeSideExtrude(lowerHgShape, 0.038, 0.0030, skinMat, uvBounds));

      const upperHg = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0155, 0.165, 8), skinMat);
      upperHg.rotation.x = Math.PI / 2;
      upperHg.position.set(0, 0.042, -0.240);
      projectWeaponMeshUVs(upperHg, uvBounds);
      g.add(upperHg);

      // Cooling vent slots + handguard retainer cap
      for (const vz of [-0.205, -0.255, -0.305]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.043, 0.007, 0.024), gripMat);
        vent.position.set(0, 0.012, vz);
        g.add(vent);
      }
      const hgCap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.014), darkMetal);
      hgCap.position.set(0, 0.014, -0.348);
      g.add(hgCap);

      // 4) Rear tangent leaf sight block + gas tube + 45-degree slanted AK gas block
      const rearSightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.056), darkMetal);
      rearSightBlock.position.set(0, 0.048, -0.155);
      const rearNotchL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.010), gunmetal);
      rearNotchL.position.set(-0.006, 0.062, -0.132);
      const rearNotchR = rearNotchL.clone();
      rearNotchR.position.x = 0.006;
      const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0026, 0.0026), accentGlow);
      rearDotL.position.set(-0.006, 0.063, -0.126);
      const rearDotR = rearDotL.clone();
      rearDotR.position.x = 0.006;
      g.add(rearSightBlock, rearNotchL, rearNotchR, rearDotL, rearDotR);

      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.010, 0.120, 8), darkMetal);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 0.044, -0.365);
      const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.028), darkMetal);
      gasBlock.position.set(0, 0.034, -0.422);
      gasBlock.rotation.x = 0.42;
      g.add(gasTube, gasBlock);

      // 5) 10-sided steel barrel + under-barrel cleaning rod + hooded AK front sight + slanted brake
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.012, 0.255, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.020, -0.452);
      const cleanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0030, 0.0030, 0.215, 6), brightSteel);
      cleanRod.rotation.x = Math.PI / 2;
      cleanRod.position.set(0, 0.005, -0.440);
      g.add(barrel, cleanRod);

      // Hooded AK front sight tower
      const fsBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.034, 0.024), darkMetal);
      fsBase.position.set(0, 0.034, -0.532);
      const fsHoodL = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.022, 0.014), darkMetal);
      fsHoodL.position.set(-0.009, 0.056, -0.532);
      const fsHoodR = fsHoodL.clone();
      fsHoodR.position.x = 0.009;
      const fsHoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.0035, 0.014), darkMetal);
      fsHoodTop.position.set(0, 0.067, -0.532);
      const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.004), accentGlow);
      fsPost.position.set(0, 0.057, -0.532);
      g.add(fsBase, fsHoodL, fsHoodR, fsHoodTop, fsPost);

      // Slanted AKM muzzle compensator
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.044, 8), darkMetal);
      brake.rotation.x = Math.PI / 2;
      brake.position.set(0, 0.020, -0.592);
      g.add(brake);

      // 6) Sculpted ergonomic AK pistol grip + open trigger guard + curved trigger
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.024, -0.004);
      gripShape.lineTo(0.064, -0.004);
      gripShape.lineTo(0.078, -0.088);
      gripShape.lineTo(0.042, -0.095);
      gripShape.closePath();
      g.add(makeSideExtrude(gripShape, 0.028, 0.0026, gripMat, null));

      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0045, 0.048), darkMetal);
      tgBottom.position.set(0, -0.028, -0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.022, 0.005), darkMetal);
      tgFront.position.set(0, -0.018, -0.027);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.017, 0.002);
      trigger.rotation.x = 0.28;
      g.add(tgBottom, tgFront, trigger);

      // 7) Curved 30-round banana magazine (magGroup, unified skin UV-mapped!)
      const magGroup = new THREE.Group();
      const magShape = new THREE.Shape();
      magShape.moveTo(-0.062, -0.004);
      magShape.lineTo(-0.122, -0.004);
      magShape.quadraticCurveTo(-0.138, -0.076, -0.172, -0.136);
      magShape.lineTo(-0.118, -0.152);
      magShape.quadraticCurveTo(-0.086, -0.082, -0.062, -0.004);
      magShape.closePath();
      const magMesh = makeSideExtrude(magShape, 0.026, 0.0022, skinMat, uvBounds);
      magGroup.add(magMesh);

      // Stamped dark steel floorplate & mag catch lug
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.008, 0.060), darkMetal);
      magPlate.position.set(0, -0.146, -0.146);
      magPlate.rotation.x = -0.34;
      magGroup.add(magPlate);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);

      // 8) Right-side reciprocating bolt carrier & upturned AK charging handle (boltGroup)
      const boltGroup = new THREE.Group();
      boltGroup.position.set(0.022, 0.024, -0.042);
      const carrier = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.082), brightSteel);
      const chStem = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.007, 0.011), gunmetal);
      chStem.position.set(0.012, 0.002, -0.022);
      const chKnob = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.014, 0.013), darkMetal);
      chKnob.position.set(0.022, 0.007, -0.022);
      chKnob.rotation.z = -0.25;
      boltGroup.add(carrier, chStem, chKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(0.022, 0.024, -0.042);

      addFlash(g, 0.020, -0.635, 1.05);
    }

    // Add newly modeled firearms (smg: VX-9 Vector, shotgun: M870 Breacher, pistol: USP-9 Tactical)
    if (wt === 'smg') {
      // Clear default rifle fallback children if smg hit the else branch above — rebuild clean VX-9 Vector!
      while (g.children.length > 0) g.remove(g.children[0]);
      delete g.userData.magGroup;
      delete g.userData.boltGroup;
      delete g.userData.muzzleFlash;

      const uvBounds = { minZ: -0.34, maxZ: 0.24, minY: -0.11, maxY: 0.07 };

      // 1) Iconic Vector deep angular upper & lower receiver shroud
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(0.085, 0.044);
      bodyShape.lineTo(-0.265, 0.044);
      bodyShape.lineTo(-0.285, 0.024);
      bodyShape.lineTo(-0.250, -0.028);
      bodyShape.lineTo(-0.145, -0.055);
      bodyShape.lineTo(-0.088, -0.055);
      bodyShape.lineTo(-0.068, -0.008);
      bodyShape.lineTo(0.078, -0.008);
      bodyShape.closePath();
      g.add(makeSideExtrude(bodyShape, 0.042, 0.0028, skinMat, uvBounds));

      // Top full-length picatinny rail & iron sights
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.34), darkMetal);
      topRail.position.set(0, 0.049, -0.09);
      const rearIron = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.014), gunmetal);
      rearIron.position.set(0, 0.058, 0.055);
      const frontIron = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.012), gunmetal);
      frontIron.position.set(0, 0.058, -0.245);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.004), accentGlow);
      frontDot.position.set(0, 0.062, -0.245);
      g.add(topRail, rearIron, frontIron, frontDot);

      // Barrel shroud + short compact muzzle
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.14, 10), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.006, -0.32);
      const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.032, 8), darkMetal);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.006, -0.388);
      g.add(barrel, muzzleTip);

      // Pistol grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.018, -0.006);
      gripShape.lineTo(0.056, -0.006);
      gripShape.lineTo(0.072, -0.088);
      gripShape.lineTo(0.034, -0.092);
      gripShape.closePath();
      g.add(makeSideExtrude(gripShape, 0.028, 0.0024, gripMat, null));

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.044), darkMetal);
      tg.position.set(0, -0.028, -0.010);
      g.add(tg);

      // Folding skeleton buttstock (tag as defaultStockGroup so No Stock removes it cleanly)
      const stockGroup = new THREE.Group();
      const sTop = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.18), darkMetal);
      sTop.position.set(0, 0.024, 0.17);
      const sBot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.010, 0.17), darkMetal);
      sBot.position.set(0, -0.022, 0.165);
      sBot.rotation.x = 0.18;
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.082, 0.018), gripMat);
      butt.position.set(0, -0.008, 0.258);
      stockGroup.add(sTop, sBot, butt);
      g.add(stockGroup);
      g.userData.defaultStockGroup = stockGroup;

      // Iconic forward-cant vertical Vector stick magazine
      const magGroup = new THREE.Group();
      const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.135, 0.032), darkMetal);
      magMesh.position.set(0, -0.102, -0.132);
      magMesh.rotation.x = 0.24;
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.038), gunmetal);
      magBase.position.set(0, -0.165, -0.148);
      magBase.rotation.x = 0.24;
      magGroup.add(magMesh, magBase);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);

      // Left-side reciprocating bolt/charging handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(-0.026, 0.026, -0.165);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 0.024), brightSteel);
      boltGroup.add(ch);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(-0.026, 0.026, -0.165);

      addFlash(g, 0.006, -0.42, 0.78);
    } else if (wt === 'shotgun') {
      while (g.children.length > 0) g.remove(g.children[0]);
      delete g.userData.magGroup;
      delete g.userData.boltGroup;
      delete g.userData.muzzleFlash;

      const uvBounds = { minZ: -0.58, maxZ: 0.30, minY: -0.09, maxY: 0.06 };

      // 1) Classic M870 steel receiver
      const recShape = new THREE.Shape();
      recShape.moveTo(0.085, 0.040);
      recShape.lineTo(-0.155, 0.040);
      recShape.lineTo(-0.165, -0.014);
      recShape.lineTo(0.075, -0.014);
      recShape.closePath();
      g.add(makeSideExtrude(recShape, 0.042, 0.0032, skinMat, uvBounds));

      // Ejection port & top rail
      const ejPort = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.020, 0.075), brightSteel);
      ejPort.position.set(0.022, 0.018, -0.042);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.007, 0.19), darkMetal);
      topRail.position.set(0, 0.045, -0.035);
      g.add(ejPort, topRail);

      // Long 12-gauge upper barrel + lower tubular magazine
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.48, 12), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.026, -0.39);
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.42, 10), darkMetal);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.002, -0.36);
      const clampRing = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.042, 0.018), darkMetal);
      clampRing.position.set(0, 0.012, -0.53);
      const frontBead = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), accentGlow);
      frontBead.position.set(0, 0.044, -0.615);
      g.add(barrel, magTube, clampRing, frontBead);

      // Ribbed sliding pump forend (pumpGroup animates back/forward on shots!)
      const pumpGroup = new THREE.Group();
      const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.023, 0.18, 10), skinMat);
      pumpBody.rotation.x = Math.PI / 2;
      pumpBody.position.set(0, -0.002, -0.30);
      projectWeaponMeshUVs(pumpBody, uvBounds);
      pumpGroup.add(pumpBody);
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.010, 10), gripMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(0, -0.002, -0.23 - i * 0.026);
        pumpGroup.add(rib);
      }
      g.add(pumpGroup);
      g.userData.pumpGroup = pumpGroup;
      g.userData.pumpRestZ = 0;

      // Pistol grip + stock
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.042, -0.004);
      gripShape.lineTo(0.088, -0.004);
      gripShape.lineTo(0.106, -0.082);
      gripShape.lineTo(0.068, -0.088);
      gripShape.closePath();
      g.add(makeSideExtrude(gripShape, 0.030, 0.0026, gripMat, null));

      const stockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.075, 0.028);
      stockShape.lineTo(0.305, 0.012);
      stockShape.lineTo(0.312, -0.082);
      stockShape.lineTo(0.082, -0.022);
      stockShape.closePath();
      stockGroup.add(makeSideExtrude(stockShape, 0.034, 0.003, skinMat, uvBounds));
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.096, 0.016), gripMat);
      pad.position.set(0, -0.036, 0.316);
      stockGroup.add(pad);
      g.add(stockGroup);
      g.userData.defaultStockGroup = stockGroup;

      addFlash(g, 0.026, -0.66, 1.35);
    } else if (wt === 'pistol') {
      while (g.children.length > 0) g.remove(g.children[0]);
      delete g.userData.magGroup;
      delete g.userData.boltGroup;
      delete g.userData.muzzleFlash;

      const uvBounds = { minZ: -0.22, maxZ: 0.09, minY: -0.09, maxY: 0.05 };
      const spinGroup = new THREE.Group();
      spinGroup.position.set(0, -0.020, -0.002);
      const inner = new THREE.Group();
      inner.position.set(0, 0.020, 0.002);
      spinGroup.add(inner);
      g.add(spinGroup);
      g.userData.spinGroup = spinGroup;

      // 1) Crisp boxy USP-9 Tactical slide (reciprocating slideGroup)
      const slideGroup = new THREE.Group();
      const slideShape = new THREE.Shape();
      slideShape.moveTo(0.072, 0.040);
      slideShape.lineTo(-0.188, 0.040);
      slideShape.lineTo(-0.194, 0.010);
      slideShape.lineTo(0.070, 0.010);
      slideShape.closePath();
      slideGroup.add(makeSideExtrude(slideShape, 0.028, 0.0022, skinMat, uvBounds));

      // Rear & front raised suppressor-height tritium sights
      const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.010), darkMetal);
      rSightL.position.set(-0.006, 0.045, 0.054);
      const rSightR = rSightL.clone();
      rSightR.position.x = 0.006;
      const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.010), darkMetal);
      fSight.position.set(0, 0.046, -0.175);
      const fDot = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), accentGlow);
      fDot.position.set(0, 0.048, -0.172);
      slideGroup.add(rSightL, rSightR, fSight, fDot);
      inner.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // Threaded tactical barrel tip
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.044, 10), brightSteel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.024, -0.205);
      inner.add(barrel);

      // Polymer tactical lower frame + accessory rail
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.24), darkMetal);
      frame.position.set(0, 0.002, -0.056);
      inner.add(frame);

      // Grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.008, -0.004);
      gripShape.lineTo(0.052, -0.004);
      gripShape.lineTo(0.068, -0.092);
      gripShape.lineTo(0.022, -0.095);
      gripShape.closePath();
      inner.add(makeSideExtrude(gripShape, 0.025, 0.0022, gripMat, null));

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.004, 0.042), darkMetal);
      tg.position.set(0, -0.028, -0.016);
      inner.add(tg);

      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.020, 0.072);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.010), brightSteel);
      hm.position.set(0, 0.004, 0.004);
      hammerGroup.add(hm);
      inner.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      const magGroup = new THREE.Group();
      const magPad = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.014, 0.044), gunmetal);
      magPad.position.set(0, -0.098, 0.044);
      magGroup.add(magPad);
      inner.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);

      addFlash(inner, 0.024, -0.24, 0.65);
    }

    // ---------- Modular Visible 3D Gunsmith Attachments (Mounted Across All 6 Firearms) ----------
    const MOUNT_ANCHORS = {
      rifle:   { optic: [0, 0.054, -0.02],  muzzle: [0, 0.020, -0.60],  under: [0, -0.012, -0.27], mag: [0, -0.095, -0.12], grip: [0, -0.046, 0.052], stock: [0, 0.008, 0.14], ironEyeY: 0.060 },
      smg:     { optic: [0, 0.053, -0.06],  muzzle: [0, 0.006, -0.39],  under: [0, -0.028, -0.22], mag: [0, -0.115, -0.135], grip: [0, -0.048, 0.045], stock: [0, 0.006, 0.09], ironEyeY: 0.062 },
      shotgun: { optic: [0, 0.049, -0.03],  muzzle: [0, 0.026, -0.63],  under: [0, -0.026, -0.31], mag: [0, -0.002, -0.44], grip: [0, -0.044, 0.072], stock: [0, 0.002, 0.08], ironEyeY: 0.046 },
      awp:     { optic: [0, 0.064, -0.04],  muzzle: [0, 0.038, -0.78],  under: [0, -0.014, -0.30], mag: [0, -0.055, -0.075], grip: [0, -0.045, 0.055], stock: [0, 0.004, 0.16], ironEyeY: 0.094 },
      deagle:  { optic: [0, 0.052, -0.05],  muzzle: [0, 0.028, -0.255], under: [0, -0.004, -0.14], mag: [0, -0.098, 0.036], grip: [0, -0.048, 0.034], stock: null,              ironEyeY: 0.056 },
      pistol:  { optic: [0, 0.044, -0.04],  muzzle: [0, 0.024, -0.22],  under: [0, -0.010, -0.12], mag: [0, -0.098, 0.044], grip: [0, -0.048, 0.038], stock: null,              ironEyeY: 0.049 }
    };

    const anchor = MOUNT_ANCHORS[wt] || MOUNT_ANCHORS.rifle;
    const attachParent = (wt === 'deagle' || wt === 'pistol') && g.userData.spinGroup
      ? g.userData.spinGroup.children[0]
      : g;
    const attGroup = new THREE.Group();
    attGroup.name = 'gunsmithAttachments';
    attachParent.add(attGroup);

    let eyeY = anchor.ironEyeY;
    let barrelShiftZ = 0;

    // 1) Barrel visual extension/contraction
    if (atts.barrel === 'heavy_long') {
      barrelShiftZ = -0.11;
      const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.13, 10), gunmetal);
      ext.rotation.x = Math.PI / 2;
      ext.position.set(anchor.muzzle[0], anchor.muzzle[1], anchor.muzzle[2] - 0.05);
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.085), darkMetal);
      shroud.position.set(anchor.muzzle[0], anchor.muzzle[1], anchor.muzzle[2] - 0.01);
      attGroup.add(ext, shroud);
    } else if (atts.barrel === 'fluted_light') {
      barrelShiftZ = -0.04;
      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.075, 6), brightSteel);
      flute.rotation.x = Math.PI / 2;
      flute.position.set(anchor.muzzle[0], anchor.muzzle[1], anchor.muzzle[2] - 0.02);
      attGroup.add(flute);
    } else if (atts.barrel === 'short_cqb') {
      barrelShiftZ = 0.02;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.028, 8), darkMetal);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(anchor.muzzle[0], anchor.muzzle[1], anchor.muzzle[2] + 0.04);
      attGroup.add(collar);
    }

    // 2) Muzzle attachment
    const mzZ = anchor.muzzle[2] + barrelShiftZ;
    let flashZ = mzZ - 0.04;
    let flashScaleMul = 1.0;
    if (atts.muzzle === 'suppressor') {
      const supLen = wt === 'pistol' || wt === 'deagle' ? 0.145 : 0.185;
      const supRad = wt === 'shotgun' ? 0.019 : wt === 'pistol' ? 0.013 : 0.0165;
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(supRad, supRad, supLen, 12), darkMetal);
      sup.rotation.x = Math.PI / 2;
      sup.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - supLen * 0.45);
      const knurl = new THREE.Mesh(new THREE.CylinderGeometry(supRad * 1.08, supRad * 1.08, 0.024, 12), gunmetal);
      knurl.rotation.x = Math.PI / 2;
      knurl.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - 0.01);
      attGroup.add(sup, knurl);
      flashZ = mzZ - supLen - 0.02;
      flashScaleMul = 0.35;
    } else if (atts.muzzle === 'compensator') {
      const comp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.056), gunmetal);
      comp.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - 0.026);
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.024), darkMetal);
      port.position.set(anchor.muzzle[0], anchor.muzzle[1] + 0.006, mzZ - 0.032);
      attGroup.add(comp, port);
      flashZ = mzZ - 0.075;
    } else if (atts.muzzle === 'muzzle_brake') {
      const mb = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.062), brightSteel);
      mb.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - 0.028);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.011, 0.016), darkMetal);
      slot.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - 0.028);
      attGroup.add(mb, slot);
      flashZ = mzZ - 0.08;
    } else if (atts.muzzle === 'choke_tight') {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.075, 10), brightSteel);
      ch.rotation.x = Math.PI / 2;
      ch.position.set(anchor.muzzle[0], anchor.muzzle[1], mzZ - 0.032);
      attGroup.add(ch);
      flashZ = mzZ - 0.085;
    }
    if (g.userData.muzzleFlash) {
      g.userData.muzzleFlash.position.z = flashZ;
      g.userData.muzzleFlash.scale.setScalar(flashScaleMul);
    }

    // 3) Optics (with genuine glowing 3D reticles for Reflex & Holo!)
    const opticRedMat = new THREE.MeshBasicMaterial({ color: 0xff3b52 });
    const opticHoloMat = new THREE.MeshBasicMaterial({ color: 0x38f2ff });
    const opticGlassMat = new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
    const opticParent = (wt === 'pistol' || wt === 'deagle') && g.userData.slideGroup ? g.userData.slideGroup : attGroup;
    const ox = anchor.optic[0], oy = anchor.optic[1], oz = anchor.optic[2];

    if (atts.optic === 'reflex_dot') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.044), darkMetal);
      base.position.set(ox, oy + 0.004, oz);
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.024, 0.012), darkMetal);
      postL.position.set(ox - 0.012, oy + 0.018, oz);
      const postR = postL.clone(); postR.position.x = ox + 0.012;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0035, 0.012), darkMetal);
      topBar.position.set(ox, oy + 0.030, oz);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), opticGlassMat);
      glass.position.set(ox, oy + 0.019, oz);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 6, 6), opticRedMat);
      dot.position.set(ox, oy + 0.019, oz - 0.001);
      opticParent.add(base, postL, postR, topBar, glass, dot);
      eyeY = oy + 0.019;
    } else if (atts.optic === 'holo_eotech') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.011, 0.064), darkMetal);
      base.position.set(ox, oy + 0.006, oz);
      const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.030, 0.048), gunmetal);
      hoodL.position.set(ox - 0.016, oy + 0.022, oz);
      const hoodR = hoodL.clone(); hoodR.position.x = ox + 0.016;
      const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0045, 0.048), gunmetal);
      hoodTop.position.set(ox, oy + 0.037, oz);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.027, 0.024), opticGlassMat);
      glass.position.set(ox, oy + 0.023, oz);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.0045, 0.0058, 16), opticHoloMat);
      ring.position.set(ox, oy + 0.023, oz - 0.001);
      const cDot = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 6, 6), opticHoloMat);
      cDot.position.set(ox, oy + 0.023, oz - 0.001);
      opticParent.add(base, hoodL, hoodR, hoodTop, glass, ring, cDot);
      eyeY = oy + 0.023;
    } else if (atts.optic === 'acog_25') {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.068), darkMetal);
      mount.position.set(ox, oy + 0.008, oz);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 0.115, 12), gunmetal);
      body.rotation.x = Math.PI / 2;
      body.position.set(ox, oy + 0.028, oz - 0.008);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.017, 0.032, 12), darkMetal);
      bell.rotation.x = Math.PI / 2;
      bell.position.set(ox, oy + 0.028, oz - 0.072);
      const fiber = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.042), opticRedMat);
      fiber.position.set(ox, oy + 0.046, oz - 0.012);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), scopeLensMat);
      lens.position.set(ox, oy + 0.028, oz - 0.089);
      lens.rotation.y = Math.PI;
      opticParent.add(mount, body, bell, fiber, lens);
      eyeY = oy + 0.028;
    } else if (atts.optic === 'sniper_4x' || atts.optic === 'sniper_var') {
      if (wt !== 'awp') {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 12), darkMetal);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(ox, oy + 0.032, oz - 0.02);
        const objBell = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.016, 0.055, 12), gunmetal);
        objBell.rotation.x = Math.PI / 2;
        objBell.position.set(ox, oy + 0.032, oz - 0.145);
        attGroup.add(tube, objBell);
      } else if (atts.optic === 'sniper_var') {
        // Variable magnification throw lever & sunshade extension on AWP scope
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.055, 12), darkMetal);
        shade.rotation.x = Math.PI / 2;
        shade.position.set(0, 0.088, -0.25);
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.024, 0.008), accentGlow);
        lever.position.set(0.018, 0.098, 0.02);
        attGroup.add(shade, lever);
      }
      eyeY = oy + 0.032;
    }

    // 4) Underbarrel grips & tactical laser
    if (atts.underbarrel && anchor.under) {
      const [ux, uy, uz] = anchor.under;
      if (atts.underbarrel === 'vertical_grip') {
        const vg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.086, 8), gripMat);
        vg.position.set(ux, uy - 0.044, uz);
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.030), darkMetal);
        collar.position.set(ux, uy - 0.004, uz);
        attGroup.add(vg, collar);
      } else if (atts.underbarrel === 'angled_grip') {
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.026, 0.095), gripMat);
        ag.position.set(ux, uy - 0.018, uz);
        ag.rotation.x = -0.22;
        attGroup.add(ag);
      } else if (atts.underbarrel === 'stubby_grip') {
        const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.052, 8), gunmetal);
        sg.position.set(ux, uy - 0.028, uz);
        attGroup.add(sg);
      } else if (atts.underbarrel === 'laser_tac') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.020, 0.064), darkMetal);
        box.position.set(ux + 0.022, uy + 0.012, uz);
        const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 6), new THREE.MeshBasicMaterial({ color: 0x39ff88 }));
        emitter.position.set(ux + 0.024, uy + 0.012, uz - 0.034);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0012, 0.0012, 0.34, 6),
          new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.28, depthWrite: false })
        );
        beam.rotation.x = Math.PI / 2;
        beam.position.set(ux + 0.024, uy + 0.012, uz - 0.205);
        attGroup.add(box, emitter, beam);
      }
    }

    // 5) Magazine visual modifiers + Tactical Ammo color band
    const magParent = g.userData.magGroup || attGroup;
    const [mx, my, mz] = anchor.mag;
    if (atts.magazine === 'fast_mag') {
      const pull = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12), gripMat);
      pull.position.set(mx, my - 0.045, mz);
      pull.rotation.y = Math.PI / 2;
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.016, 0.038), new THREE.MeshStandardMaterial({ color: 0x2e88ff, roughness: 0.7 }));
      tape.position.set(mx, my - 0.018, mz);
      magParent.add(pull, tape);
    } else if (atts.magazine === 'extended_mag') {
      const ext = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.072, 0.042), darkMetal);
      ext.position.set(mx, my - 0.055, mz - 0.012);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.012, 0.048), gunmetal);
      base.position.set(mx, my - 0.092, mz - 0.014);
      magParent.add(ext, base);
    } else if (atts.magazine === 'drum_mag') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.046, 16), darkMetal);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(mx, my - 0.025, mz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.052, 10), gunmetal);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(mx, my - 0.025, mz);
      magParent.add(drum, hub);
    }

    if (atts.ammo) {
      const ammoColorMap = {
        fmj: 0xf4c44e,
        hollow_point: 0xff4c65,
        high_velocity: 0x38e8ff,
        subsonic: 0xa96bff,
        flechette: 0x56d8ff,
        slug: 0xff9f38,
        magnum: 0xff3b52
      };
      const bandCol = ammoColorMap[atts.ammo] || 0x38e8ff;
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.031, 0.008, 0.040),
        new THREE.MeshBasicMaterial({ color: bandCol })
      );
      band.position.set(mx, my + 0.008, mz);
      magParent.add(band);
    }

    // 6) Rear grip wrap
    if (atts.rearGrip && anchor.grip) {
      const gCol = atts.rearGrip === 'stippled_grip' ? 0x262e38 : atts.rearGrip === 'rubberized_grip' ? 0x161b22 : 0x333f4d;
      const wrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.056, 0.034),
        new THREE.MeshStandardMaterial({ color: gCol, roughness: 0.92, metalness: 0.08 })
      );
      wrap.position.set(anchor.grip[0], anchor.grip[1], anchor.grip[2]);
      wrap.rotation.x = 0.22;
      attGroup.add(wrap);
    }

    // 7) Stock modifiers
    if (atts.stock && anchor.stock) {
      if (g.userData.defaultStockGroup) {
        g.userData.defaultStockGroup.visible = false;
      }
      const [sx, sy, sz] = anchor.stock;
      if (atts.stock === 'no_stock') {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.022, 10), gunmetal);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(sx, sy + 0.010, sz);
        const sling = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 10), brightSteel);
        sling.position.set(sx, sy + 0.006, sz + 0.016);
        attGroup.add(cap, sling);
      } else if (atts.stock === 'skeleton_stock') {
        const tubeA = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.20, 8), brightSteel);
        tubeA.rotation.x = Math.PI / 2;
        tubeA.position.set(sx, sy + 0.020, sz + 0.10);
        const tubeB = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.19, 8), darkMetal);
        tubeB.rotation.x = Math.PI / 2 + 0.22;
        tubeB.position.set(sx, sy - 0.016, sz + 0.095);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.082, 0.016), gripMat);
        pad.position.set(sx, sy - 0.008, sz + 0.20);
        attGroup.add(tubeA, tubeB, pad);
      } else if (atts.stock === 'heavy_stock') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.072, 0.22), darkMetal);
        body.position.set(sx, sy - 0.004, sz + 0.11);
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.12), gunmetal);
        cheek.position.set(sx, sy + 0.034, sz + 0.095);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.102, 0.020), gripMat);
        pad.position.set(sx, sy - 0.010, sz + 0.224);
        attGroup.add(body, cheek, pad);
      }
    }

    // Store the actual optical center in weapon-local coordinates. ADS uses
    // this 3D point (not just its Y coordinate) to solve the final hand pose.
    if (wt === 'awp') {
      // The AWP's built-in scope rear eyepiece is the true eye point.
      g.userData.opticEyePoint = new THREE.Vector3(0, 0.094, 0.128);
    } else if (atts.optic === 'reflex_dot' || atts.optic === 'holo_eotech') {
      g.userData.opticEyePoint = new THREE.Vector3(anchor.optic[0], eyeY, anchor.optic[2] - 0.001);
    } else if (atts.optic === 'acog_25') {
      // Rear/eye-side end of the ACOG tube (+Z is toward the shooter).
      g.userData.opticEyePoint = new THREE.Vector3(anchor.optic[0], eyeY, anchor.optic[2] + 0.050);
    } else if (atts.optic === 'sniper_4x' || atts.optic === 'sniper_var') {
      g.userData.opticEyePoint = new THREE.Vector3(anchor.optic[0], eyeY, anchor.optic[2] + 0.090);
    } else {
      g.userData.opticEyePoint = new THREE.Vector3(0, eyeY, anchor.optic[2]);
    }
    g.userData.opticEyeY = eyeY;
    g.userData.weaponType = wt;
    g.userData.attachments = Object.assign({}, atts);
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
  const _wFreePos = new THREE.Vector3();
  const _wFreeQuat = new THREE.Quaternion();
  const _wFreeEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  const WEAPON_GRIP_SPECS = {
    rifle: {
      gripCenter: [0.0, -0.048, 0.052],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.012, -0.245],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.46, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    smg: {
      gripCenter: [0.0, -0.048, 0.046],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.030, -0.175],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.14, -0.42, 1.96],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.72, middle: 0.78, ring: 0.82, pinky: 0.80, thumb: 0.40, indexRingHook: 0, indexPoint: 0 }
    },
    shotgun: {
      gripCenter: [0.0, -0.046, 0.072],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.018, -0.295],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.12],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.70, middle: 0.76, ring: 0.80, pinky: 0.78, thumb: 0.38, indexRingHook: 0, indexPoint: 0 }
    },
    awp: {
      gripCenter: [0.0, -0.048, 0.058],
      rightPocket: [0.003, -0.027, -0.040],
      supportAnchor: [0.0, -0.014, -0.280],
      leftPocket: [0.002, -0.024, -0.032],
      leftRelEuler: [0.16, -0.48, 2.08],
      rightPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.66, middle: 0.72, ring: 0.76, pinky: 0.74, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    },
    deagle: {
      gripCenter: [0.0, -0.050, 0.030],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.015, -0.048, 0.022],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    },
    pistol: {
      gripCenter: [0.0, -0.048, 0.036],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.046, 0.028],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.44, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.64, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.78, middle: 0.86, ring: 0.90, pinky: 0.90, thumb: 0.42, indexRingHook: 0, indexPoint: 0 }
    }
  };

  function createWeaponAnimOut() {
    return {
      rx: 0, ry: 0, rz: 0,
      rRotX: 0, rRotY: 0, rRotZ: 0,
      wPosX: 0, wPosY: 0, wPosZ: 0,
      wRotX: 0, wRotY: 0, wRotZ: 0,
      spinAngle: 0,
      leftLock: 1,
      leftAnchorOffX: 0, leftAnchorOffY: 0, leftAnchorOffZ: 0,
      leftRelOffX: 0, leftRelOffY: 0, leftRelOffZ: 0,
      leftFreeX: -0.24, leftFreeY: -0.28, leftFreeZ: -0.34,
      leftFreeRotX: 0.18, leftFreeRotY: -0.42, leftFreeRotZ: 0.24,
      boltLift: 0, boltPull: 0,
      slideBack: 0, hammerBack: 0,
      magDropY: 0, magTiltX: 0,
      rPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      lPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    };
  }

  function weaponInspectDuration(wt, tier) {
    if (wt === 'deagle') return tier === 'uncommon' ? 2.55 : 2.15;
    if (wt === 'awp') return tier === 'uncommon' ? 2.70 : 2.55;
    return tier === 'uncommon' ? 2.65 : 2.35;
  }

  // Authentic CS2 Hand-Synchronized Firearm Choreography (zero GC allocations)
  function evaluateWeaponChoreography(wt, state, out, playAudio) {
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    out.rx = 0; out.ry = 0; out.rz = 0;
    out.rRotX = 0; out.rRotY = 0; out.rRotZ = 0;
    out.wPosX = 0; out.wPosY = 0; out.wPosZ = 0;
    out.wRotX = 0; out.wRotY = 0; out.wRotZ = 0;
    out.spinAngle = 0;
    out.leftLock = 1;
    out.leftAnchorOffX = 0; out.leftAnchorOffY = 0; out.leftAnchorOffZ = 0;
    out.leftRelOffX = 0; out.leftRelOffY = 0; out.leftRelOffZ = 0;
    out.leftFreeX = -0.24; out.leftFreeY = -0.29; out.leftFreeZ = -0.34;
    out.leftFreeRotX = 0.22; out.leftFreeRotY = -0.42; out.leftFreeRotZ = 0.28;
    out.boltLift = 0; out.boltPull = 0;
    out.slideBack = 0; out.hammerBack = 0;
    out.magDropY = 0; out.magTiltX = 0;

    Object.assign(out.rPose, spec.rightPose);
    Object.assign(out.lPose, spec.leftPose);

    const t = state.inspectT;
    if (t >= 1) return;

    const isRare = state.inspectTier === 'uncommon' || state.inspectTier === 'mythic';

    if (wt === 'deagle' || wt === 'pistol') {
      if (isRare) {
        // CS2 RARE DEAGLE TRIGGER-FINGER SPIN (with F-chain spinBonus support!)
        const env = bell(t, 0.0, 1.0);
        const dropLeft = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.86, 1.0, t));
        out.leftLock = 1 - dropLeft;
        out.leftFreeX = -0.25;
        out.leftFreeY = -0.34;
        out.leftFreeZ = -0.34;
        out.leftFreeRotX = 0.26;
        out.leftFreeRotY = -0.36;
        out.leftFreeRotZ = 0.34;
        out.lPose.index = 0.45; out.lPose.middle = 0.56; out.lPose.ring = 0.64; out.lPose.pinky = 0.72; out.lPose.thumb = 0.38;

        // Lift Deagle cleanly into center-left showcase space & open lower 3 fingers for spin
        const spinPhase = smoothstep(0.14, 0.80, t);
        const openGrip = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.86, t));
        const catchBounce = bell(t, 0.78, 0.94);

        out.rx = -0.055 * env;
        out.ry = 0.052 * env + catchBounce * 0.016;
        out.rz = 0.025 * env;
        out.rRotX = 0.16 * env - catchBounce * 0.14;
        out.rRotY = 0.44 * env;
        out.rRotZ = 0.18 * env - Math.sin(spinPhase * Math.PI * 2) * 0.14;

        // Spin around the open trigger-guard pivot!
        const totalSpins = Math.PI * 4 + (state.spinBonus || 0);
        out.spinAngle = -spinPhase * totalSpins;

        // Hook right index finger through trigger guard while opening middle/ring/pinky/thumb clear!
        out.rPose.indexRingHook = openGrip * 0.95;
        out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.56, openGrip);
        out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.14, openGrip);
        out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.16, openGrip);
        out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.20, openGrip);
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.16, openGrip);

        if (playAudio) {
          if (t > 0.16 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.spinWhoosh(1.25);
          }
          if (t > 0.46 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.spinWhoosh(1.12);
          }
          if (t > 0.80 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            CaseAudio.balisongClack(0.95);
          }
        }
      } else {
        // CS2 NORMAL DEAGLE INSPECT: Left hand drops away -> 1-handed Play-Side admire -> Back-Side twist -> snap back
        const dropLeft = smoothstep(0.0, 0.16, t) * (1 - smoothstep(0.84, 1.0, t));
        out.leftLock = 1 - dropLeft;
        out.leftFreeX = -0.24;
        out.leftFreeY = -0.32;
        out.leftFreeZ = -0.35;
        out.leftFreeRotX = 0.24;
        out.leftFreeRotY = -0.38;
        out.leftFreeRotZ = 0.28;

        const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
        const backSide = smoothstep(0.48, 0.68, t) * (1 - smoothstep(0.82, 0.98, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.052 * env;
        out.ry = 0.044 * env;
        out.rz = 0.022 * env;
        out.rRotX = 0.15 * playSide + 0.10 * backSide;
        out.rRotY = 0.78 * playSide - 0.58 * backSide;
        out.rRotZ = 0.48 * playSide - 0.66 * backSide;

        // Slight thumb relax while admiring back side
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.36, backSide);
        if (playAudio && t > 0.50 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          CaseAudio.spinWhoosh(0.86);
        }
      }
    } else if (wt === 'awp') {
      if (isRare) {
        // CS2 RARE AWP BOLT-LIFT BRASS CHECK: Left braces forend, right hand lifts & cycles bolt handle
        const env = bell(t, 0.0, 1.0);
        const holdTilt = smoothstep(0.0, 0.20, t) * (1 - smoothstep(0.82, 1.0, t));
        const boltLift = smoothstep(0.20, 0.34, t) * (1 - smoothstep(0.68, 0.80, t));
        const boltPull = smoothstep(0.32, 0.48, t) * (1 - smoothstep(0.56, 0.70, t));

        out.rx = -0.045 * env;
        out.ry = 0.032 * env;
        out.rz = 0.015 * env;
        out.rRotX = 0.14 * holdTilt;
        out.rRotY = 0.52 * holdTilt;
        out.rRotZ = -0.34 * holdTilt - boltLift * 0.10;

        out.boltLift = boltLift;
        out.boltPull = boltPull;
        out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.18, boltLift);
        out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.24, boltLift);

        if (playAudio) {
          if (t > 0.28 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.balisongClack(0.84);
          }
          if (t > 0.66 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.balisongClack(1.06);
          }
        }
      } else {
        // CS2 NORMAL AWP INSPECT: Heavy deliberate play-side chassis showcase -> bolt-side roll
        const playSide = smoothstep(0.0, 0.24, t) * (1 - smoothstep(0.48, 0.64, t));
        const boltSide = smoothstep(0.50, 0.68, t) * (1 - smoothstep(0.82, 1.0, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.058 * env;
        out.ry = 0.036 * env;
        out.rz = 0.020 * env;
        out.rRotX = 0.12 * playSide + 0.08 * boltSide;
        out.rRotY = 0.76 * playSide - 0.36 * boltSide;
        out.rRotZ = 0.32 * playSide - 0.52 * boltSide;
        out.leftRelOffZ = 0.14 * playSide - 0.18 * boltSide;
      }
    } else {
      // V-47 RIFLE (AK-47)
      if (isRare) {
        // CS2 RARE V-47 MAG-CHECK & CHARGING-HANDLE PEEK
        const env = bell(t, 0.0, 1.0);
        const tilt = smoothstep(0.0, 0.18, t) * (1 - smoothstep(0.84, 1.0, t));
        const magPhase = smoothstep(0.16, 0.32, t) * (1 - smoothstep(0.42, 0.52, t));
        const boltPhase = smoothstep(0.54, 0.68, t) * (1 - smoothstep(0.74, 0.84, t));

        out.rx = -0.048 * env;
        out.ry = 0.038 * env;
        out.rz = 0.018 * env;
        out.rRotX = 0.14 * tilt;
        out.rRotY = 0.58 * tilt - boltPhase * 0.26;
        out.rRotZ = 0.28 * magPhase - 0.44 * tilt;

        // Left hand smoothly slides from handguard -> banana mag -> charging handle -> back to handguard
        const toMag = smoothstep(0.10, 0.22, t) * (1 - smoothstep(0.48, 0.56, t));
        const toBolt = smoothstep(0.50, 0.62, t) * (1 - smoothstep(0.78, 0.90, t));

        out.leftAnchorOffX = 0.014 * toMag + 0.055 * toBolt;
        out.leftAnchorOffY = -0.105 * toMag + 0.042 * toBolt - magPhase * 0.045;
        out.leftAnchorOffZ = 0.135 * toMag + (0.205 + boltPhase * 0.058) * toBolt;
        out.leftRelOffX = -0.22 * toMag + 0.28 * toBolt;
        out.leftRelOffY = 0.18 * toMag - 0.34 * toBolt;
        out.leftRelOffZ = -0.35 * toMag - 0.72 * toBolt;

        out.magDropY = -magPhase * 0.046;
        out.magTiltX = -magPhase * 0.22;
        out.boltPull = boltPhase * 0.058;

        if (playAudio) {
          if (t > 0.24 && !(state.inspectCueMask & 1)) {
            state.inspectCueMask |= 1;
            CaseAudio.balisongClack(0.86);
          }
          if (t > 0.48 && !(state.inspectCueMask & 2)) {
            state.inspectCueMask |= 2;
            CaseAudio.balisongClack(1.12);
          }
          if (t > 0.64 && !(state.inspectCueMask & 4)) {
            state.inspectCueMask |= 4;
            CaseAudio.balisongClack(0.96);
          }
          if (t > 0.80 && !(state.inspectCueMask & 8)) {
            state.inspectCueMask |= 8;
            CaseAudio.balisongClack(1.22);
          }
        }
      } else {
        // CS2 NORMAL V-47 AK-47 INSPECT: Crisp play-side display -> smooth two-hand flip to bolt side
        const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
        const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
        const env = bell(t, 0.0, 1.0);

        out.rx = -0.056 * env;
        out.ry = 0.036 * env;
        out.rz = 0.022 * env;
        out.rRotX = 0.13 * playSide + 0.09 * rightSide;
        out.rRotY = 0.78 * playSide - 0.42 * rightSide;
        out.rRotZ = 0.36 * playSide - 0.58 * rightSide;
        out.leftRelOffZ = 0.16 * playSide - 0.20 * rightSide;
      }
    }
  }

  function applyWeaponSocketTransform(mesh, wt, wOut) {
    if (!mesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    const counterRoll = -RIGHT_HAND_GRIP_ROLL;
    mesh.rotation.order = 'XYZ';
    mesh.rotation.set(
      wOut ? wOut.wRotX : 0,
      wOut ? wOut.wRotY : 0,
      counterRoll + (wOut ? wOut.wRotZ : 0)
    );

    const cosR = Math.cos(counterRoll);
    const sinR = Math.sin(counterRoll);
    const gx = spec.gripCenter[0];
    const gy = spec.gripCenter[1];
    const gz = spec.gripCenter[2];
    const rotGx = gx * cosR - gy * sinR;
    const rotGy = gx * sinR + gy * cosR;

    mesh.position.set(
      spec.rightPocket[0] - rotGx + (wOut ? wOut.wPosX : 0),
      spec.rightPocket[1] - rotGy + (wOut ? wOut.wPosY : 0),
      spec.rightPocket[2] - gz + (wOut ? wOut.wPosZ : 0)
    );

    if (mesh.userData.spinGroup) {
      mesh.userData.spinGroup.rotation.x = wOut ? wOut.spinAngle : 0;
    }
  }

  function applyWeaponMechanicalParts(mesh, wt, wOut, reloadArc, boltCycleArc, slideKick, hammerKick) {
    if (!mesh) return;
    const boltPull = (wOut ? wOut.boltPull : 0) + (wt === 'awp' ? boltCycleArc * 0.056 : slideKick * 0.048);
    const boltLift = (wOut ? wOut.boltLift : 0) + (wt === 'awp' ? boltCycleArc : 0);

    if (mesh.userData.boltGroup && mesh.userData.boltRestPos) {
      const rp = mesh.userData.boltRestPos;
      mesh.userData.boltGroup.position.set(rp.x, rp.y, rp.z + boltPull);
      mesh.userData.boltGroup.rotation.z = wt === 'awp' ? boltLift * 0.92 : 0;
    }
    if (mesh.userData.slideGroup) {
      mesh.userData.slideGroup.position.z = (wOut ? wOut.slideBack : 0) + slideKick * 0.036;
    }
    if (mesh.userData.hammerGroup) {
      mesh.userData.hammerGroup.rotation.x = -((wOut ? wOut.hammerBack : 0) + hammerKick * 0.95);
    }
    if (mesh.userData.pumpGroup) {
      mesh.userData.pumpGroup.position.z = (wt === 'shotgun' ? boltCycleArc * 0.085 : 0);
    }
    if (mesh.userData.magGroup) {
      const relDrop = reloadArc > 0.15 ? Math.sin(Math.min(1, (reloadArc - 0.15) / 0.85) * Math.PI) : 0;
      const dropY = (wOut ? wOut.magDropY : 0) - relDrop * 0.105;
      const tiltX = (wOut ? wOut.magTiltX : 0) - relDrop * (wt === 'rifle' ? 0.34 : 0.12);
      mesh.userData.magGroup.position.y = dropY;
      mesh.userData.magGroup.rotation.x = tiltX;
    }
  }

  /**
   * Solves exact left-hand position & orientation in rig.rootRig space, smoothly blending
   * between locked forend/support grip (leftLock = 1) and free counterbalance posture (leftLock = 0)
   * for one-handed Deagle inspects & trigger-finger spins, plus mag-check / charging-handle reaches.
   */
  function lockSupportHandToWeapon(rigObj, weaponMesh, wt, reloadArc, wOut) {
    if (!rigObj || !weaponMesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    const lockW = wOut ? wOut.leftLock : 1;

    rigObj.rootRig.updateMatrixWorld(true);
    _wInvRootMat.copy(rigObj.rootRig.matrixWorld).invert();
    rigObj.rootRig.getWorldQuaternion(_wRootQuat);
    _wInvRootQuat.copy(_wRootQuat).invert();

    _wAnchorLocal.set(
      spec.supportAnchor[0] + (wOut ? wOut.leftAnchorOffX : 0),
      spec.supportAnchor[1] - reloadArc * 0.115 + (wOut ? wOut.leftAnchorOffY : 0),
      spec.supportAnchor[2] + reloadArc * (wt === 'deagle' ? 0.04 : 0.14) + (wOut ? wOut.leftAnchorOffZ : 0)
    );
    _wWorldPos.copy(_wAnchorLocal).applyMatrix4(weaponMesh.matrixWorld).applyMatrix4(_wInvRootMat);

    weaponMesh.getWorldQuaternion(_wWorldQuat);
    _wWorldQuat.premultiply(_wInvRootQuat);

    _wLeftEuler.set(
      spec.leftRelEuler[0] - reloadArc * 0.35 + (wOut ? wOut.leftRelOffX : 0),
      spec.leftRelEuler[1] + reloadArc * 0.18 + (wOut ? wOut.leftRelOffY : 0),
      spec.leftRelEuler[2] - reloadArc * 0.28 + (wOut ? wOut.leftRelOffZ : 0),
      'YXZ'
    );
    _wLeftRelQuat.setFromEuler(_wLeftEuler);
    _wWorldQuat.multiply(_wLeftRelQuat);

    _wLeftPocketLocal.set(spec.leftPocket[0], spec.leftPocket[1], spec.leftPocket[2]);
    _wOffsetVec.copy(_wLeftPocketLocal).applyQuaternion(_wWorldQuat);
    _wWorldPos.sub(_wOffsetVec);

    if (lockW < 0.999 && wOut) {
      _wFreePos.set(wOut.leftFreeX, wOut.leftFreeY, wOut.leftFreeZ);
      _wFreeEuler.set(wOut.leftFreeRotX, wOut.leftFreeRotY, wOut.leftFreeRotZ, 'YXZ');
      _wFreeQuat.setFromEuler(_wFreeEuler);
      _wWorldPos.lerp(_wFreePos, 1 - lockW);
      _wWorldQuat.slerp(_wFreeQuat, 1 - lockW);
    }

    rigObj.leftHandPivot.position.copy(_wWorldPos);
    rigObj.leftHandPivot.quaternion.copy(_wWorldQuat);

    rigObj.setHandPose(rigObj.rightHand, wOut ? wOut.rPose : spec.rightPose);
    rigObj.setHandPose(rigObj.leftHand, wOut ? wOut.lPose : spec.leftPose);
  }

  // ---------- Main First-Person Viewmodel Overlay Pass ----------
  const ViewmodelSystem = (() => {
    let vmScene = null;
    let vmCamera = null;
    let studioEnv = null;
    let rig = null;
    let currentKnifeMesh = null;
    const ALL_WEAPON_TYPES = ['rifle', 'smg', 'shotgun', 'awp', 'deagle', 'pistol'];
    let currentWeaponMeshes = { rifle: null, smg: null, shotgun: null, awp: null, deagle: null, pistol: null };
    let currentWeaponItems = {
      rifle: KS.createStarterWeapon('rifle'),
      smg: KS.createStarterWeapon('smg'),
      shotgun: KS.createStarterWeapon('shotgun'),
      awp: KS.createStarterWeapon('awp'),
      deagle: KS.createStarterWeapon('deagle'),
      pistol: KS.createStarterWeapon('pistol')
    };
    let currentWeaponAttachments = { rifle: {}, smg: {}, shotgun: {}, awp: {}, deagle: {}, pistol: {} };
    let currentWeaponBuildSig = { rifle: '', smg: '', shotgun: '', awp: '', deagle: '', pistol: '' };
    let activeSlot = 'knife'; // 'rifle' | 'smg' | 'shotgun' | 'awp' | 'deagle' | 'pistol' | 'knife'
    let isScoped = false;
    let adsActive = false;
    let adsProgress = 0;
    let adsScopedOptic = false;
    let currentItem = null;
    let currentGlove = KS.createStarterGlove();
    let mainRenderer = null;

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
      inspectT: 1,
      inspectDuration: 2.35,
      inspectTier: 'normal',
      inspectCueMask: 0,
      spinBonus: 0,
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
      const clean = KS.sanitizeWeaponItem(rawItem);
      const wt = clean.weaponType;
      const nextAtts = attachments && typeof attachments === 'object'
        ? Object.assign({}, attachments)
        : (currentWeaponAttachments[wt] || {});
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
        equipWeaponSkin(currentWeaponItems[wt] || KS.createStarterWeapon(wt), null, currentWeaponAttachments[wt] || {});
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
      syncActiveMeshVisibility();
      if (playDraw && changed) {
        if (valid === 'knife') {
          triggerDraw();
        } else {
          weaponAnim.drawT = 0;
          weaponAnim.drawDuration = valid === 'awp' ? 0.44 : (valid === 'deagle' || valid === 'pistol') ? 0.26 : valid === 'smg' ? 0.30 : 0.36;
          weaponAnim.reloadT = 1;
          weaponAnim.inspectT = 1;
          weaponAnim.spinBonus = 0;
          weaponAnim.recoilKick = 0;
          weaponAnim.recoilPitch = 0;
          weaponAnim.slideKick = 0;
          weaponAnim.hammerKick = 0;
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
      weaponAnim.spinBonus = 0;
      const adsDamp = 1 - adsProgress * 0.48;
      weaponAnim.recoilKick = (s === 'awp' ? 0.088 : s === 'shotgun' ? 0.078 : s === 'deagle' ? 0.058 : s === 'smg' ? 0.022 : s === 'pistol' ? 0.028 : 0.030) * adsDamp;
      weaponAnim.recoilPitch = (s === 'awp' ? 0.24 : s === 'shotgun' ? 0.22 : s === 'deagle' ? 0.21 : s === 'smg' ? 0.052 : s === 'pistol' ? 0.095 : 0.075) * adsDamp;
      weaponAnim.slideKick = 1.0;
      weaponAnim.hammerKick = 1.0;
      weaponAnim.flashTimer = 0.048;
      if (s === 'awp' || s === 'shotgun') weaponAnim.boltT = 0;
      const mesh = currentWeaponMeshes[s];
      if (mesh && mesh.userData.muzzleFlash) {
        mesh.userData.muzzleFlash.visible = true;
        mesh.userData.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
      }
    }

    function triggerReload(duration) {
      if (activeSlot === 'knife') return;
      weaponAnim.inspectT = 1;
      weaponAnim.spinBonus = 0;
      weaponAnim.reloadT = 0;
      weaponAnim.reloadDuration = Math.max(0.6, Number(duration) || 1.6);
      adsActive = false;
      isScoped = false;
      syncActiveMeshVisibility();
      WeaponAudio.reloadStart();
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
        if (weaponAnim.reloadT < 1) return null;
        const wt = activeSlot;

        // Classic CS2 Deagle F-spam chaining during active Trigger-Finger Spin!
        if (!forceTier && wt === 'deagle' && weaponAnim.inspectT < 0.86 && weaponAnim.inspectTier === 'uncommon') {
          weaponAnim.spinBonus = Math.min(weaponAnim.spinBonus + Math.PI * 2, Math.PI * 10);
          weaponAnim.inspectT = Math.min(weaponAnim.inspectT, 0.24);
          weaponAnim.inspectCueMask &= ~6;
          CaseAudio.spinWhoosh(1.24);
          return { tier: 'uncommon', weaponType: wt, chained: true };
        }

        let wTier;
        if (forceTier === 'uncommon' || forceTier === 'mythic' || forceTier === true) {
          wTier = 'uncommon';
        } else if (forceTier === 'normal' || forceTier === false) {
          wTier = 'normal';
        } else {
          wTier = Math.random() < (wt === 'deagle' ? 0.24 : 0.20) ? 'uncommon' : 'normal';
        }

        weaponAnim.inspectT = 0;
        weaponAnim.inspectTier = wTier;
        weaponAnim.inspectCueMask = 0;
        weaponAnim.spinBonus = 0;
        weaponAnim.inspectDuration = weaponInspectDuration(wt, wTier);
        if (wTier === 'uncommon' && wt === 'deagle') CaseAudio.spinWhoosh(1.18);
        else WeaponAudio.weaponDraw();
        return { tier: wTier, weaponType: wt };
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
      if (weaponAnim.flashTimer > 0) {
        weaponAnim.flashTimer -= dt;
        if (weaponAnim.flashTimer <= 0 && mesh.userData.muzzleFlash) {
          mesh.userData.muzzleFlash.visible = false;
        }
      }
      if (weaponAnim.drawT < 1) weaponAnim.drawT = Math.min(1, weaponAnim.drawT + dt / weaponAnim.drawDuration);
      if (weaponAnim.reloadT < 1) weaponAnim.reloadT = Math.min(1, weaponAnim.reloadT + dt / weaponAnim.reloadDuration);
      if (weaponAnim.inspectT < 1) weaponAnim.inspectT = Math.min(1, weaponAnim.inspectT + dt / weaponAnim.inspectDuration);
      if (weaponAnim.boltT < 1) weaponAnim.boltT = Math.min(1, weaponAnim.boltT + dt / (wt === 'shotgun' ? 0.45 : 0.85));

      // adsProgress is supplied by CombatSystem so camera, overlay, and weapon
      // all use the exact same per-frame transition value.
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

      const adsEase = smoothstep(0, 1, adsProgress);
      // Weapon draw should not tug the model away from the sight line after ADS starts.
      const drawDip = (1 - smoothstep(0, 1, weaponAnim.drawT)) * 0.22 * (1 - adsEase);
      const reloadArc = weaponAnim.reloadT < 1 ? Math.sin(weaponAnim.reloadT * Math.PI) : 0;
      const boltArc = (wt === 'awp' || wt === 'shotgun') && weaponAnim.boltT < 1 ? Math.sin(weaponAnim.boltT * Math.PI) : 0;
      // Fully stabilize the weapon at full ADS; do not retain surf bank or idle sway.
      const motionDamp = 1 - adsEase;

      const isPistol = wt === 'deagle' || wt === 'pistol';
      const hipRx = isPistol ? 0.138 : wt === 'awp' ? 0.168 : wt === 'smg' ? 0.148 : 0.162;
      const hipRy = isPistol ? -0.152 : wt === 'awp' ? -0.172 : wt === 'smg' ? -0.158 : -0.166;
      const hipRz = isPistol ? -0.320 : wt === 'awp' ? -0.252 : wt === 'smg' ? -0.285 : -0.268;

      // Apply the animated weapon socket transform before solving its actual
      // optic point; the old gripCenter/eyeY shortcut ignored X/Z and rotation.
      const adsRz = isPistol ? -0.245 : wt === 'smg' ? -0.205 : -0.190;
      applyWeaponSocketTransform(mesh, wt, _weaponOut);
      const adsPivot = solveAdsPivotPosition(mesh, adsRz);

      let rx = THREE.MathUtils.lerp(hipRx, adsPivot.x, adsEase) + (bobX * 0.85 + swayX) * motionDamp + _weaponOut.rx * (1 - adsEase);
      let ry = THREE.MathUtils.lerp(hipRy, adsPivot.y, adsEase) + (-bobY * 0.85 + swayY) * motionDamp + crouchDip * motionDamp - drawDip - reloadArc * 0.06 + _weaponOut.ry * (1 - adsEase);
      let rz = THREE.MathUtils.lerp(hipRz, adsRz, adsEase) + weaponAnim.recoilKick + _weaponOut.rz * (1 - adsEase);

      let rRotX = THREE.MathUtils.lerp(0.03, 0.0, adsEase) + swayY * 1.1 * motionDamp + weaponAnim.recoilPitch - drawDip * 1.35 - reloadArc * 0.28 + _weaponOut.rRotX * (1 - adsEase);
      let rRotY = THREE.MathUtils.lerp(isPistol ? 0.06 : 0.05, 0.0, adsEase) + swayX * 1.3 * motionDamp - reloadArc * 0.22 + _weaponOut.rRotY * (1 - adsEase);
      let rRotZ = RIGHT_HAND_GRIP_ROLL - bankRoll * 0.85 * motionDamp + reloadArc * 0.38 - boltArc * 0.14 + _weaponOut.rRotZ * (1 - adsEase);

      if (isSurf) {
        ry += 0.012 * motionDamp;
        rRotZ -= bankRoll * 0.24 * motionDamp;
      }

      rig.rightHandPivot.position.set(rx, ry, rz);
      rig.rightHandPivot.rotation.set(rRotX, rRotY, rRotZ);

      applyWeaponMechanicalParts(mesh, wt, _weaponOut, reloadArc, boltArc, weaponAnim.slideKick, weaponAnim.hammerKick);
      lockSupportHandToWeapon(rig, mesh, wt, reloadArc, _weaponOut);
    }

    function update(dt, playerState, sharedAdsProgress) {
      if (!rig || !currentItem) return;
      if (Number.isFinite(sharedAdsProgress)) {
        adsProgress = Math.max(0, Math.min(1, sharedAdsProgress));
      }
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
      equipWeaponBuild,
      setActiveSlot,
      getActiveSlot: () => activeSlot,
      triggerFireRecoil,
      triggerReload,
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

    let soloPivot = null;
    let soloKnifeMesh = null;

    let comboPivot = null;
    let comboRig = null;
    let comboKnifeMesh = null;

    let previewMode = 'combo'; // 'combo' | 'solo'
    let previewKind = 'knife'; // 'knife' | 'weapon'
    let currentKnife = KS.createStarterKnife();
    let currentWeapon = KS.createStarterWeapon('rifle');
    let currentAttachments = {};
    let gunsmithMode = false;
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
    const _comboWeaponOut = createWeaponAnimOut();

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
      pRenderer.toneMappingExposure = 1.20;

      pScene = new THREE.Scene();
      pCamera = new THREE.PerspectiveCamera(44, 1.6, 0.02, 20);
      pCamera.position.set(0, 0.02, 0.56);
      pCamera.lookAt(0, 0, 0);

      pEnv = createStudioEnvMap(pRenderer);
      pScene.environment = pEnv;

      pScene.add(new THREE.HemisphereLight(0xd2f1ff, 0x162230, 1.34));
      const key = new THREE.DirectionalLight(0xfff4e2, 2.60);
      key.position.set(1.8, 2.5, 2.2);
      pScene.add(key);
      const rim = new THREE.DirectionalLight(0x65e7ff, 1.90);
      rim.position.set(-2.2, 1.1, -1.5);
      pScene.add(rim);

      soloPivot = new THREE.Group();
      pScene.add(soloPivot);

      comboPivot = new THREE.Group();
      comboRig = buildHandsRig();
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
      const fitScale = (previewKind === 'weapon' ? (gunsmithMode ? 0.50 : 0.45) : 0.38) / maxDim;
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
      if (!soloPivot || !comboPivot || !pCamera) return;
      const isCombo = previewMode === 'combo';
      comboPivot.visible = isCombo;
      soloPivot.visible = !isCombo;
      if (isCombo) {
        pCamera.fov = 44;
        if (previewKind === 'weapon') {
          const isPistol = currentWeapon && currentWeapon.weaponType === 'deagle';
          pCamera.position.set(0.03, 0.08, isPistol ? 0.50 : 0.78);
          pCamera.lookAt(0.0, -0.015, 0.0);
        } else {
          pCamera.position.set(0.01, 0.10, 0.50);
          pCamera.lookAt(0.01, 0.045, 0);
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
      gunsmithMode = false;
      currentAttachments = {};
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
      comboAnimState.spinBonus = 0;
      active = true;
      startLoop();
    }

    function showWeaponCombo(canvas, weaponItem, gloveItem, opts) {
      ensureInit(canvas);
      resize();
      const options = opts || {};
      gunsmithMode = false;
      currentAttachments = options.attachments && typeof options.attachments === 'object' ? Object.assign({}, options.attachments) : {};
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
      soloTrickCueMask = 0;
      comboAnimState.drawT = 1;
      comboAnimState.inspectT = 1;
      comboAnimState.inspectCueMask = 0;
      comboAnimState.spinBonus = 0;
      active = true;
      startLoop();
    }

    function showGunsmithWeapon(canvas, weaponItem, attachments, opts) {
      const prevCanvas = canvasEl;
      if (pRenderer && prevCanvas !== canvas) {
        stopLoop();
        try { pRenderer.dispose(); } catch (_) {}
        pRenderer = null;
      }
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
        const focusYaw = {
          optic: -0.22,
          muzzle: 0.42,
          barrel: 0.34,
          underbarrel: 0.25,
          magazine: -0.15,
          ammo: -0.15,
          rearGrip: -0.45,
          stock: -0.58
        };
        yaw = focusYaw[options.focusSlot] !== undefined ? focusYaw[options.focusSlot] : 0.16;
        pitch = options.focusSlot === 'optic' ? 0.16 : 0.08;
      }
      soloTrickT = 1;
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
        const wt = currentWeapon.weaponType;
        const wTier = tier === 'mythic' || tier === 'uncommon' ? 'uncommon' : 'normal';
        comboAnimState.drawT = 1;
        comboAnimState.inspectT = 0;
        comboAnimState.inspectCueMask = 0;
        comboAnimState.spinBonus = 0;
        comboAnimState.inspectTier = wTier;
        comboAnimState.inspectDuration = weaponInspectDuration(wt, wTier);
        soloTrickT = 0;
        soloTrickCueMask = 0;
        if (wTier === 'uncommon' && wt === 'deagle') CaseAudio.spinWhoosh(1.22);
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

        const zCenter = wt === 'deagle' ? -0.26 : wt === 'awp' ? -0.09 : -0.13;
        const yCenter = wt === 'deagle' ? -0.182 : -0.198;
        comboRig.rightHandPivot.position.set(
          0.02 + _comboWeaponOut.rx * 0.72,
          yCenter + _comboWeaponOut.ry * 0.85,
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
          yaw += dt * (gunsmithMode ? 0.18 : 0.42);
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
            }
          } else if (soloKnifeMesh.userData.bladePivot && soloKnifeMesh.userData.biteHandlePivot) {
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
          if (soloKnifeMesh && soloKnifeMesh.userData.spinGroup) {
            soloKnifeMesh.userData.spinGroup.rotation.x = 0;
          }
          if (soloKnifeMesh && soloKnifeMesh.userData.boltGroup && soloKnifeMesh.userData.boltRestPos) {
            soloKnifeMesh.userData.boltGroup.position.z = soloKnifeMesh.userData.boltRestPos.z;
            soloKnifeMesh.userData.boltGroup.rotation.z = 0;
          }
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
      showGunsmithWeapon,
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
