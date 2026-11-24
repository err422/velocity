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
    function shellInsert() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Twin-shell crisp brass-into-tube click-snick
      [0, 0.075].forEach((off, idx) => {
        noiseBurst(c, now + off, 0.028, 'bandpass', idx === 0 ? 2350 : 2750, 2.2, 0.065);
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 860 : 1040, now + off);
        osc.frequency.exponentialRampToValueAtTime(340, now + off + 0.032);
        g.gain.setValueAtTime(0.055, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.038);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.042);
      });
    }
    function pumpRack() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [0, 0.12].forEach((off, idx) => {
        noiseBurst(c, now + off, 0.055, 'bandpass', idx === 0 ? 2100 : 2700, 1.7, 0.095);
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 0 ? 520 : 760, now + off);
        osc.frequency.exponentialRampToValueAtTime(190, now + off + 0.045);
        g.gain.setValueAtTime(0.04, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.052);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.055);
      });
    }
    function boltRack() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [0, 0.11].forEach((off, idx) => {
        noiseBurst(c, now + off, 0.038, 'highpass', idx === 0 ? 2400 : 3200, 1.4, 0.062);
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(idx === 0 ? 1280 : 1760, now + off);
        osc.frequency.exponentialRampToValueAtTime(460, now + off + 0.032);
        g.gain.setValueAtTime(0.038, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.038);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.042);
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
    let lastChronoAudioMs = 0;
    function chronoEnter(tier) {
      const c = getCtx();
      if (!c) return;
      const tMs = performance.now();
      if (tMs - lastChronoAudioMs < 110) return;
      lastChronoAudioMs = tMs;
      const now = c.currentTime;
      const isPhase = tier >= 2;
      // Deep temporal bass drop swoop
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(isPhase ? 210 : 185, now);
      sub.frequency.exponentialRampToValueAtTime(isPhase ? 42 : 52, now + 0.19);
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.linearRampToValueAtTime(0.15, now + 0.025);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.24);
      // Crystalline gyro lock harmonic shimmer
      const shim = c.createOscillator();
      const hg = c.createGain();
      shim.type = 'triangle';
      shim.frequency.setValueAtTime(isPhase ? 1320 : 1140, now);
      shim.frequency.exponentialRampToValueAtTime(isPhase ? 495 : 580, now + 0.17);
      hg.gain.setValueAtTime(0.048, now);
      hg.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      shim.connect(hg);
      hg.connect(c.destination);
      shim.start(now);
      shim.stop(now + 0.20);
    }
    function chronoExit() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
    return {
      fireRifle,
      fireAwp,
      fireDeagle,
      fireWeapon,
      dryFire,
      reloadStart,
      reloadFinish,
      shellInsert,
      pumpRack,
      boltRack,
      scopeZoom,
      weaponDraw,
      hitmarker,
      targetShatter,
      killConfirm,
      roundHorn,
      chronoEnter,
      chronoExit
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
      const wrapW = pose.wrapGrip || 0;
      for (const nm of names) {
        const c = pose[nm] !== undefined ? pose[nm] : 0.85;
        const j = f[nm];
        const spread = nm === 'index' ? -0.06 : nm === 'ring' ? 0.05 : nm === 'pinky' ? 0.12 : 0.0;
        let mcpX = -0.08 - c * 1.06;
        let pipX = -0.06 - c * 1.28;
        let dipX = -0.04 - c * 0.82;
        if (wrapW > 0 && nm !== 'index') {
          // Surface-accurate C-wrap around knife handle seated in fist pocket (y=-0.0325, z=-0.0453):
          // proximal stays ABOVE handle, middle passes cleanly IN FRONT of handle (clearing finger radius),
          // distal curls cleanly BENEATH/OUTSIDE the handle with zero mesh penetration!
          const w = wrapW * c;
          const wrapMcp = nm === 'pinky' ? -0.04 : nm === 'ring' ? -0.30 : -0.36;
          const wrapPip = nm === 'pinky' ? -1.26 : nm === 'ring' ? -1.26 : -1.24;
          const wrapDip = nm === 'pinky' ? -0.26 : nm === 'ring' ? -0.54 : -0.62;
          mcpX = THREE.MathUtils.lerp(mcpX, wrapMcp, w);
          pipX = THREE.MathUtils.lerp(pipX, wrapPip, w);
          dipX = THREE.MathUtils.lerp(dipX, wrapDip, w);
        }
        j.mcp.rotation.x = mcpX;
        j.mcp.rotation.y = side * spread * (1 - c * 0.7);
        j.pip.rotation.x = pipX;
        j.dip.rotation.x = dipX;
      }
      if (pose.indexRingHook) {
        const h = pose.indexRingHook;
        // Exact fist-pocket spindle lock: at h=1, mcp(-1.50) + pip(-0.0708) = -PI/2 so
        // the index middle phalanx runs dead-vertical along -Y at (-0.0270, -0.0309..-0.0529, -0.0453),
        // threading squarely through the Karambit ring & Skeleton hole while middle/ring/pinky
        // wrap cleanly AROUND the outside of the handle with zero clipping!
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, -1.50, h);
        f.index.mcp.rotation.y = THREE.MathUtils.lerp(f.index.mcp.rotation.y, 0.0, h);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, -0.0708, h);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, -0.32, h);
      }
      if (pose.indexPoint) {
        const p = pose.indexPoint;
        f.index.mcp.rotation.x = THREE.MathUtils.lerp(f.index.mcp.rotation.x, 0.14, p);
        f.index.pip.rotation.x = THREE.MathUtils.lerp(f.index.pip.rotation.x, 0.02, p);
        f.index.dip.rotation.x = THREE.MathUtils.lerp(f.index.dip.rotation.x, 0.02, p);
      }
      const tc = pose.thumb !== undefined ? pose.thumb : 0.8;
      if (wrapW > 0) {
        // CS2 Karambit / Skeleton thumb sits cleanly along the outside left flank of the fist
        // (resting beside the index knuckle/ring, never stabbing inside the knife handle)
        const baseCmcX = -0.18 - tc * 0.34;
        const baseCmcY = -side * (0.28 + tc * 0.42);
        const baseCmcZ = side * (0.35 + tc * 0.48);
        f.thumb.cmc.rotation.set(
          THREE.MathUtils.lerp(baseCmcX, -0.20, wrapW),
          THREE.MathUtils.lerp(baseCmcY, -side * 0.04, wrapW),
          THREE.MathUtils.lerp(baseCmcZ, side * 0.22, wrapW)
        );
        f.thumb.mcp.rotation.set(
          THREE.MathUtils.lerp(-0.08 - tc * 0.56, -0.16, wrapW),
          THREE.MathUtils.lerp(-side * tc * 0.18, -side * 0.04, wrapW),
          0
        );
        f.thumb.ip.rotation.set(THREE.MathUtils.lerp(-0.06 - tc * 0.58, -0.22, wrapW), 0, 0);
      } else {
        f.thumb.cmc.rotation.set(
          -0.18 - tc * 0.34,
          -side * (0.28 + tc * 0.42),
          side * (0.35 + tc * 0.48)
        );
        f.thumb.mcp.rotation.set(-0.08 - tc * 0.56, -side * tc * 0.18, 0);
        f.thumb.ip.rotation.set(-0.06 - tc * 0.58, 0, 0);
      }
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

    // Twin 12-gauge shotgun shells gripped in left fingers during fast M870 quad-load reload
    const reloadShellsGroup = new THREE.Group();
    reloadShellsGroup.position.set(0.008, -0.022, -0.056);
    reloadShellsGroup.rotation.set(0.18, 0.12, -0.15);
    const shellHullMat = new THREE.MeshStandardMaterial({ color: 0xc82532, roughness: 0.42, metalness: 0.14 });
    const shellBrassMat = new THREE.MeshStandardMaterial({ color: 0xd8b154, roughness: 0.28, metalness: 0.88 });
    for (const sx of [-0.011, 0.011]) {
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.044, 10), shellHullMat);
      hull.rotation.x = Math.PI / 2;
      hull.position.set(sx, 0, -0.006);
      const brass = new THREE.Mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.014, 10), shellBrassMat);
      brass.rotation.x = Math.PI / 2;
      brass.position.set(sx, 0, 0.022);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0108, 0.003, 10), shellBrassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(sx, 0, 0.029);
      reloadShellsGroup.add(hull, brass, rim);
    }
    reloadShellsGroup.visible = false;
    leftHand.add(reloadShellsGroup);

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
      reloadShellsGroup,
      shellHullMat,
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
      // Exact CS2 Karambit fist-pocket ring-spindle socket:
      // Ring center (0,0,0) locks dead-center onto the right index finger at (-0.0270, -0.0325, -0.0453)
      // with local +Z hole/spin axis collinear with -Y; handle runs underneath the pronated palm
      // toward pinky (+X) and the curved hawkbill blade sweeps boldly OUT TO THE RIGHT & UP!
      knifeMesh.position.set(-0.0270, -0.0325, -0.0453);
      knifeMesh.rotation.set(Math.PI * 0.5, 0.0, 0.0);
      knifeMesh.scale.setScalar(1.04);
    } else if (kt === 'skeleton') {
      // Exact CS2 Skeleton center-hole spindle socket inside the fist pocket:
      // Center hole (0,0,0) locks dead-center onto the right index finger (-0.0270, -0.0325, -0.0453);
      // paracord handle (-X -> rightHand +X) sits cleanly inside the curled middle/ring/pinky wrap
      // with zero finger-through-handle clipping, and local +Z spin axis aligns dead-vertical (-Y)!
      knifeMesh.position.set(-0.0270, -0.0325, -0.0453);
      knifeMesh.rotation.set(-Math.PI * 0.5, Math.PI, 0.0);
      knifeMesh.scale.setScalar(1.03);
    } else if (kt === 'butterfly') {
      knifeMesh.position.set(-0.004, -0.0240, -0.056);
      knifeMesh.rotation.set(Math.PI * 0.5 - 0.08, Math.PI - 0.14, 0.04);
      knifeMesh.scale.setScalar(1.04);
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
      rPose: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 0.9, indexRingHook: 0, indexPoint: 0, wrapGrip: 0 },
      lPose: { index: 0.64, middle: 0.74, ring: 0.82, pinky: 0.88, thumb: 0.56, indexRingHook: 0, indexPoint: 0, wrapGrip: 0 }
    };
  }

  // Evaluates rest pose, draw animation, and Normal / Uncommon / 1-in-100 Mythic inspect tricks
  // without allocating any temporary objects on the heap.
  function evaluateViewmodelChoreography(kt, animState, out, playAudio) {
    // 1) Authentic CS2 Per-Knife Rest Poses
    if (kt === 'karambit') {
      // Exact CS2 pronated Karambit stance:
      // Top/back of right gloved hand faces UP toward camera, pommel ring sits on the
      // LEFT with the index finger inside it, and the curved tiger-claw blade sweeps
      // boldly OUT TO THE RIGHT and curves UPWARD into full viewport visibility!
      out.rx = 0.086; out.ry = -0.128; out.rz = -0.340;
      out.rRotX = 0.42; out.rRotY = -0.08; out.rRotZ = -0.06;
    } else if (kt === 'skeleton') {
      out.rx = 0.188; out.ry = -0.132; out.rz = -0.335;
      out.rRotX = 0.04; out.rRotY = 0.36; out.rRotZ = -0.80;
    } else if (kt === 'butterfly') {
      // Turned cleanly inward so the curved blade's broad painted face and slotted
      // U-channel handles catch studio light instead of appearing edge-on.
      out.rx = 0.210; out.ry = -0.188; out.rz = -0.345;
      out.rRotX = -0.24; out.rRotY = 0.50; out.rRotZ = -1.16;
    } else if (kt === 'm9') {
      out.rx = 0.215; out.ry = -0.172; out.rz = -0.36;
      out.rRotX = -0.24; out.rRotY = 0.30; out.rRotZ = -0.84;
    } else {
      out.rx = 0.210; out.ry = -0.170; out.rz = -0.35;
      out.rRotX = -0.22; out.rRotY = 0.28; out.rRotZ = -0.85;
    }

    if (kt === 'karambit') {
      // Matching CS2 balanced pronated left hand (back of glove facing up on lower-left)
      out.lx = -0.150; out.ly = -0.142; out.lz = -0.350;
      out.lRotX = 0.26; out.lRotY = -0.38; out.lRotZ = 0.08;
    } else {
      out.lx = -0.270; out.ly = -0.235; out.lz = -0.38;
      out.lRotX = 0.14; out.lRotY = -0.44; out.lRotZ = 0.18;
    }

    const rp = out.rPose;
    rp.indexRingHook = 0;
    rp.indexPoint = 0;
    rp.wrapGrip = 0;
    if (kt === 'karambit') {
      rp.index = 0.56; rp.middle = 0.94; rp.ring = 0.96; rp.pinky = 0.96; rp.thumb = 0.34; rp.indexRingHook = 1.0; rp.wrapGrip = 1.0;
    } else if (kt === 'skeleton') {
      rp.index = 0.56; rp.middle = 0.94; rp.ring = 0.96; rp.pinky = 0.96; rp.thumb = 0.34; rp.indexRingHook = 1.0; rp.wrapGrip = 1.0;
    } else {
      rp.index = 0.96; rp.middle = 0.98; rp.ring = 0.98; rp.pinky = 0.96; rp.thumb = 0.88;
    }

    const lp = out.lPose;
    lp.index = kt === 'karambit' ? 0.28 : 0.64;
    lp.middle = kt === 'karambit' ? 0.34 : 0.74;
    lp.ring = kt === 'karambit' ? 0.42 : 0.82;
    lp.pinky = kt === 'karambit' ? 0.48 : 0.88;
    lp.thumb = kt === 'karambit' ? 0.36 : 0.56;
    lp.indexRingHook = 0; lp.indexPoint = 0; lp.wrapGrip = 0;

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
      out.ry -= inv * 0.16;
      out.rRotX -= inv * 0.44;
      out.ly -= inv * 0.10;

      if (kt === 'butterfly') {
        // Authentic CS2 Double-Throw Balisong Draw (physically valid tang-pin bounds [0..PI])
        if (t < 0.34) {
          // Beat 1: Snap-throw bite handle & blade outward from closed (PI, PI) into crisp fan
          const u = smoothstep(0.0, 0.34, t);
          out.baliBladeAngle = THREE.MathUtils.lerp(Math.PI, Math.PI * 0.32, u);
          out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI, Math.PI * 0.92, u);
          out.rRotZ += Math.sin(u * Math.PI) * 0.52;
          out.rRotY -= Math.sin(u * Math.PI) * 0.24;
          out.rRotX += Math.sin(u * Math.PI) * 0.18;
          rp.middle = 0.34; rp.ring = 0.30; rp.pinky = 0.28; rp.thumb = 0.36;
        } else if (t < 0.72) {
          // Beat 2: Counter-wrist whip snaps blade forward (0) and whips bite handle shut onto palm (0)
          const u = smoothstep(0.34, 0.72, t);
          out.baliBladeAngle = THREE.MathUtils.lerp(Math.PI * 0.32, 0.0, u);
          out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI * 0.92, 0.0, u);
          out.rRotZ -= Math.sin(u * Math.PI) * 0.44;
          out.rRotY += Math.sin(u * Math.PI) * 0.18;
          const gripClose = smoothstep(0.46, 0.72, t);
          rp.middle = THREE.MathUtils.lerp(0.34, 0.98, gripClose);
          rp.ring = THREE.MathUtils.lerp(0.30, 0.98, gripClose);
          rp.pinky = THREE.MathUtils.lerp(0.28, 0.96, gripClose);
          rp.thumb = THREE.MathUtils.lerp(0.36, 0.88, gripClose);
        } else {
          // Beat 3: Firm recoil lock settle
          const dip = bell(t, 0.70, 0.96);
          out.ry -= dip * 0.018;
          out.rRotX -= dip * 0.12;
          out.baliBladeAngle = 0;
          out.baliBiteAngle = 0;
        }
        if (playAudio && t > 0.30 && !(animState.drawCueMask & 1)) {
          animState.drawCueMask |= 1;
          CaseAudio.balisongClack(1.16);
        }
        if (playAudio && t > 0.68 && !(animState.drawCueMask & 2)) {
          animState.drawCueMask |= 2;
          CaseAudio.balisongClack(0.92);
        }
      } else if (kt === 'karambit') {
        out.kRotZ -= inv * Math.PI * 2;
        rp.middle = THREE.MathUtils.lerp(0.16, 0.94, smoothstep(0.5, 0.9, t));
        rp.ring = THREE.MathUtils.lerp(0.14, 0.96, smoothstep(0.5, 0.9, t));
        rp.pinky = THREE.MathUtils.lerp(0.12, 0.96, smoothstep(0.5, 0.9, t));
        rp.thumb = THREE.MathUtils.lerp(0.18, 0.34, smoothstep(0.5, 0.9, t));
        rp.indexRingHook = 1.0;
      } else if (kt === 'skeleton') {
        out.kRotZ += inv * Math.PI * 2;
        rp.middle = THREE.MathUtils.lerp(0.16, 0.94, smoothstep(0.5, 0.9, t));
        rp.ring = THREE.MathUtils.lerp(0.14, 0.96, smoothstep(0.5, 0.9, t));
        rp.pinky = THREE.MathUtils.lerp(0.12, 0.96, smoothstep(0.5, 0.9, t));
        rp.thumb = THREE.MathUtils.lerp(0.18, 0.34, smoothstep(0.5, 0.9, t));
        rp.indexRingHook = 1.0;
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
          // MYTHIC BUTTERFLY: Physically Valid Grand CS2 Balisong Freestyle!
          // Strict tang-pin bounds: baliBladeAngle in [0..PI], baliBiteAngle in [0..PI].
          if (t < 0.25) {
            // Beat 1: Crisp Zen Rollover around safe-handle pivot
            const u = smoothstep(0.0, 0.25, t);
            out.kRotZ -= u * Math.PI * 2;
            out.baliBladeAngle = Math.sin(u * Math.PI) * Math.PI * 0.92;
            out.baliBiteAngle = Math.sin(u * Math.PI * 0.78) * Math.PI * 0.96;
            out.rRotZ += Math.sin(u * Math.PI) * 0.44;
            rp.middle = 0.26; rp.ring = 0.22; rp.pinky = 0.20; rp.thumb = 0.30;
            if (t > 0.12) cue(1, () => CaseAudio.balisongClack(1.22));
          } else if (t < 0.56) {
            // Beat 2: Balanced V-Fan Index Chaplin Twirl (720° clean spin!)
            const u = smoothstep(0.25, 0.56, t);
            const fanEnv = Math.sin(u * Math.PI);
            out.kRotZ -= Math.PI * 2 + u * Math.PI * 4;
            out.kPosX -= fanEnv * 0.014;
            out.baliBladeAngle = THREE.MathUtils.lerp(0.32, Math.PI * 0.54, fanEnv);
            out.baliBiteAngle = THREE.MathUtils.lerp(0.68, Math.PI * 0.96, fanEnv);
            rp.index = 0.36; rp.indexRingHook = 0.85;
            rp.middle = 0.18; rp.ring = 0.16; rp.pinky = 0.16; rp.thumb = 0.22;
            out.rRotY += fanEnv * 0.34;
            if (t > 0.29) cue(2, () => CaseAudio.spinWhoosh(1.30));
            if (t > 0.46) cue(4, () => CaseAudio.balisongClack(1.16));
          } else if (t < 0.86) {
            // Beat 3: High Aerial Palm Helicopter (clean scissor fan within [0..PI])
            const u = smoothstep(0.56, 0.86, t);
            const palmUp = bell(t, 0.54, 0.88);
            out.rRotZ += palmUp * 1.05;
            out.rRotX += palmUp * 0.24;
            rp.index = THREE.MathUtils.lerp(0.96, 0.12, palmUp);
            rp.middle = THREE.MathUtils.lerp(0.98, 0.12, palmUp);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.12, palmUp);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.14, palmUp);
            rp.thumb = THREE.MathUtils.lerp(0.88, 0.18, palmUp);

            const airArc = bell(t, 0.58, 0.85);
            out.kPosY += airArc * 0.088;
            out.kRotZ -= Math.PI * 6 + u * Math.PI * 6;
            const scis = 0.5 - 0.5 * Math.cos(u * Math.PI * 4);
            out.baliBladeAngle = THREE.MathUtils.lerp(0.18, Math.PI * 0.86, scis);
            out.baliBiteAngle = THREE.MathUtils.lerp(0.26, Math.PI * 0.96, 1 - scis * 0.65);
            if (t > 0.60) cue(8, () => CaseAudio.spinWhoosh(1.24));
            if (t > 0.74) cue(16, () => CaseAudio.balisongClack(1.26));
          } else {
            // Beat 4: Downward Whip-Catch Lock with recoil dip
            const u = smoothstep(0.86, 1.0, t);
            const dip = bell(t, 0.86, 0.97);
            out.ry -= dip * 0.030;
            out.rRotZ -= dip * 0.30;
            out.baliBladeAngle = (1 - u) * 0.22;
            out.baliBiteAngle = (1 - u) * 0.42;
            if (t > 0.88) cue(32, () => CaseAudio.balisongClack(0.90));
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
          rp.middle = THREE.MathUtils.lerp(0.94, 0.12, openAmt);
          rp.ring = THREE.MathUtils.lerp(0.96, 0.10, openAmt);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.10, openAmt);
          rp.thumb = THREE.MathUtils.lerp(0.34, 0.18, openAmt);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.34;
          out.rRotX += env * 0.14;
          if (t > 0.34) cue(1, () => CaseAudio.spinWhoosh(1.24));
        } else {
          const spinA = smoothstep(0.0, 0.28, t) * Math.PI * 2;
          const openA = bell(t, 0.0, 0.32);
          out.kRotZ -= spinA;
          rp.middle = THREE.MathUtils.lerp(0.94, 0.16, openA);
          rp.ring = THREE.MathUtils.lerp(0.96, 0.14, openA);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.12, openA);
          rp.thumb = THREE.MathUtils.lerp(0.34, 0.18, openA);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.45;
          out.rRotX += bell(t, 0.25, 0.85) * 0.22;
          out.rRotZ += Math.sin(smoothstep(0.24, 0.86, t) * Math.PI * 2) * 0.42;
        }
      } else if (kt === 'skeleton') {
        if (isUncommon || animState.spinBonus > 0) {
          // Pure finger-in-hole CS2 Skeleton Knife spin: zero free-floating lift,
          // index finger stays locked dead-center inside the hole for the full 1080°+ whirl!
          const totalSpin = Math.PI * 6 + animState.spinBonus;
          out.kRotZ += easeOutCubic(t) * totalSpin;
          const openAmt = smoothstep(0.02, 0.12, t) * (1 - smoothstep(0.84, 0.96, t));
          rp.middle = THREE.MathUtils.lerp(0.94, 0.12, openAmt);
          rp.ring = THREE.MathUtils.lerp(0.96, 0.10, openAmt);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.10, openAmt);
          rp.thumb = THREE.MathUtils.lerp(0.34, 0.16, openAmt);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.34;
          out.rRotZ += env * 0.36;
          if (t > 0.32) cue(1, () => CaseAudio.spinWhoosh(1.08));
          if (t > 0.85) cue(2, () => CaseAudio.balisongClack(0.84));
        } else {
          const spinA = smoothstep(0.0, 0.30, t) * Math.PI * 2;
          const openA = bell(t, 0.0, 0.34);
          out.kRotZ += spinA;
          rp.middle = THREE.MathUtils.lerp(0.94, 0.14, openA);
          rp.ring = THREE.MathUtils.lerp(0.96, 0.12, openA);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.12, openA);
          rp.thumb = THREE.MathUtils.lerp(0.34, 0.18, openA);
          rp.indexRingHook = 1.0;
          out.rRotY += env * 0.48;
          out.rRotZ += Math.sin(smoothstep(0.28, 0.86, t) * Math.PI * 2) * 0.58;
        }
      } else if (kt === 'butterfly') {
        if (isUncommon) {
          // CS2 UNCOMMON BUTTERFLY INSPECT: Iconic Continuous Rhythmic Zen Twirl (F-chainable!)
          // Three crisp back-and-forth balisong fan & rollover beats with zero handle-blade clipping.
          const openFingers = smoothstep(0.03, 0.10, t) * (1 - smoothstep(0.82, 0.92, t));
          rp.index = THREE.MathUtils.lerp(0.96, 0.74, openFingers);
          rp.middle = THREE.MathUtils.lerp(0.98, 0.26, openFingers);
          rp.ring = THREE.MathUtils.lerp(0.98, 0.22, openFingers);
          rp.pinky = THREE.MathUtils.lerp(0.96, 0.20, openFingers);
          rp.thumb = THREE.MathUtils.lerp(0.88, 0.34, openFingers);

          if (t < 0.30) {
            // Cycle 1: Outward wrist whip throws bite handle & blade open-fan
            const u = smoothstep(0.0, 0.30, t);
            out.baliBladeAngle = Math.sin(u * Math.PI) * Math.PI * 0.84;
            out.baliBiteAngle = smoothstep(0.0, 0.16, t) * Math.PI * 0.94;
            out.rRotZ += Math.sin(u * Math.PI) * 0.52;
            out.rRotY -= Math.sin(u * Math.PI) * 0.26;
            if (t > 0.14) cue(1, () => CaseAudio.balisongClack(1.18));
            if (t > 0.27) cue(2, () => CaseAudio.balisongClack(1.02));
          } else if (t < 0.62) {
            // Cycle 2: Crisp 360° Zen Rollover spin with counter-fanned handles
            const u = smoothstep(0.30, 0.62, t);
            out.kRotZ -= u * Math.PI * 2;
            out.baliBladeAngle = THREE.MathUtils.lerp(0.16, Math.PI * 0.92, Math.sin(u * Math.PI));
            out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI * 0.94, Math.PI * 0.18, Math.sin(u * Math.PI));
            out.rRotZ -= Math.sin(u * Math.PI) * 0.48;
            out.rRotX += Math.sin(u * Math.PI) * 0.22;
            if (t > 0.36) cue(4, () => CaseAudio.spinWhoosh(1.22));
            if (t > 0.56) cue(8, () => CaseAudio.balisongClack(1.24));
          } else if (t < 0.86) {
            // Cycle 3: Snappy double-flare whip into firm open lock
            const u = smoothstep(0.62, 0.86, t);
            const flare = Math.sin(u * Math.PI);
            out.baliBladeAngle = flare * Math.PI * 0.72;
            out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI * 0.94, 0.0, u);
            out.rRotZ += Math.sin(u * Math.PI * 2) * 0.34;
            out.rRotY += flare * 0.28;
            if (t > 0.74) cue(16, () => CaseAudio.balisongClack(1.12));
          } else {
            // Catch & tactical recoil settle
            const dip = bell(t, 0.85, 0.97);
            out.ry -= dip * 0.022;
            out.rRotZ -= dip * 0.22;
            out.baliBladeAngle = 0;
            out.baliBiteAngle = 0;
            if (t > 0.86) cue(32, () => CaseAudio.balisongClack(0.90));
          }
        } else {
          // CS2 NORMAL BUTTERFLY INSPECT: Snappy Y2K Rollover -> Backhand Catch -> Blade Showcase
          if (t < 0.22) {
            // Beat 1: Loosen lower fingers & whip bite handle open
            const u = smoothstep(0.0, 0.22, t);
            out.baliBladeAngle = u * Math.PI * 0.68;
            out.baliBiteAngle = u * Math.PI * 0.94;
            out.rRotZ += Math.sin(u * Math.PI) * 0.46;
            out.rRotY -= u * 0.18;
            rp.middle = THREE.MathUtils.lerp(0.98, 0.28, u);
            rp.ring = THREE.MathUtils.lerp(0.98, 0.24, u);
            rp.pinky = THREE.MathUtils.lerp(0.96, 0.22, u);
            rp.thumb = THREE.MathUtils.lerp(0.88, 0.34, u);
            if (t > 0.16) cue(1, () => CaseAudio.balisongClack(1.18));
          } else if (t < 0.56) {
            // Beat 2: Smooth Y2K Rollover around safe handle with handles fanning cleanly
            const u = smoothstep(0.22, 0.56, t);
            out.kRotZ -= u * Math.PI * 2;
            out.baliBladeAngle = THREE.MathUtils.lerp(Math.PI * 0.68, Math.PI * 0.22, u) + Math.sin(u * Math.PI) * 0.72;
            out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI * 0.94, Math.PI * 0.82, u) - Math.sin(u * Math.PI) * 0.64;
            out.rRotZ += Math.sin(u * Math.PI) * 0.36;
            out.rRotX += Math.sin(u * Math.PI) * 0.20;
            rp.middle = 0.28; rp.ring = 0.24; rp.pinky = 0.22; rp.thumb = 0.34;
            if (t > 0.28) cue(2, () => CaseAudio.spinWhoosh(1.18));
            if (t > 0.48) cue(4, () => CaseAudio.balisongClack(1.12));
          } else if (t < 0.74) {
            // Beat 3: Crisp snap-lock catch into open combat grip
            const u = smoothstep(0.56, 0.74, t);
            out.baliBladeAngle = THREE.MathUtils.lerp(Math.PI * 0.22, 0.0, u);
            out.baliBiteAngle = THREE.MathUtils.lerp(Math.PI * 0.82, 0.0, u);
            out.rRotZ -= Math.sin(u * Math.PI) * 0.32;
            out.ry -= bell(t, 0.66, 0.76) * 0.018;
            rp.middle = THREE.MathUtils.lerp(0.28, 0.98, u);
            rp.ring = THREE.MathUtils.lerp(0.24, 0.98, u);
            rp.pinky = THREE.MathUtils.lerp(0.22, 0.96, u);
            rp.thumb = THREE.MathUtils.lerp(0.34, 0.88, u);
            if (t > 0.67) cue(8, () => CaseAudio.balisongClack(0.92));
          } else {
            // Beat 4: Clean angled blade-face admiration tilt before settling to idle
            const show = bell(t, 0.72, 1.0);
            out.baliBladeAngle = 0;
            out.baliBiteAngle = 0;
            out.rRotY += show * 0.48;
            out.rRotX += show * 0.16;
            out.rRotZ += show * 0.26;
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
      if (kt === 'butterfly') return 3.65;
      if (kt === 'skeleton') return 3.75;
      if (kt === 'karambit') return 3.65;
      if (kt === 'm9') return 3.60;
      return 3.65;
    }
    if (kt === 'butterfly') return tier === 'uncommon' ? 2.65 : 2.35;
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
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc59b45, roughness: 0.28, metalness: 0.86 });
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

    function makeSkinned(mesh, uvBounds) {
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

    // Per-weapon descriptor populated by each firearm branch so every attachment mounts flush
    const wpn = {
      uvBounds: { minZ: -0.52, maxZ: 0.34, minY: -0.15, maxY: 0.11 },
      attachParent: g,
      opticRail: null,
      barrelRoot: null,
      underRail: null,
      magWell: null,
      stockMount: null,
      gripSpec: null,
      ironEyePoint: [0, 0.060, -0.02],
      defaultStockGroup: null,
      defaultBarrelGroup: null,
      defaultMuzzleGroup: null,
      defaultMagMeshGroup: null,
      defaultGripGroup: null,
      defaultIronsGroup: null,
      defaultScopeGroup: null,
      defaultBipodGroup: null
    };

    if (wt === 'awp') {
      const uvBounds = { minZ: -0.68, maxZ: 0.35, minY: -0.11, maxY: 0.12 };
      wpn.uvBounds = uvBounds;

      // 1) Arctic Warfare forward polymer chassis (stops cleanly at z = 0.092 so rear stock swaps without clipping)
      const chassisShape = new THREE.Shape();
      chassisShape.moveTo(0.092, 0.038);
      chassisShape.lineTo(0.068, 0.044);
      chassisShape.lineTo(-0.425, 0.042);
      chassisShape.lineTo(-0.445, 0.024);
      chassisShape.lineTo(-0.420, -0.008);
      chassisShape.lineTo(-0.125, -0.012);
      chassisShape.lineTo(-0.115, -0.022);
      chassisShape.lineTo(-0.028, -0.022);
      chassisShape.lineTo(0.018, -0.014);
      chassisShape.lineTo(0.038, -0.088);
      chassisShape.lineTo(0.082, -0.094);
      chassisShape.lineTo(0.096, -0.056);
      chassisShape.lineTo(0.092, 0.038);
      chassisShape.closePath();
      g.add(makeSideExtrude(chassisShape, 0.040, 0.0034, skinMat, uvBounds));

      // 2) Swappable default thumbhole buttstock + buttpad + cheek-riser
      const defaultStockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.086, 0.038);
      stockShape.lineTo(0.325, 0.036);
      stockShape.lineTo(0.325, -0.072);
      stockShape.lineTo(0.300, -0.038);
      stockShape.lineTo(0.260, -0.038);
      stockShape.lineTo(0.240, -0.054);
      stockShape.lineTo(0.122, -0.058);
      stockShape.lineTo(0.086, -0.068);
      stockShape.closePath();

      const thumbhole = new THREE.Path();
      thumbhole.moveTo(0.104, 0.010);
      thumbhole.lineTo(0.228, 0.008);
      thumbhole.lineTo(0.236, -0.032);
      thumbhole.lineTo(0.108, -0.038);
      thumbhole.lineTo(0.096, -0.018);
      thumbhole.closePath();
      stockShape.holes.push(thumbhole);

      defaultStockGroup.add(makeSideExtrude(stockShape, 0.040, 0.0034, skinMat, uvBounds));
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.110, 0.022), gripMat);
      buttpad.position.set(0, -0.017, 0.336);
      const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.019, 0.118), gripMat);
      cheekRiser.position.set(0, 0.046, 0.198);
      defaultStockGroup.add(buttpad, cheekRiser);
      g.add(defaultStockGroup);
      g.userData.defaultStockGroup = defaultStockGroup;
      wpn.defaultStockGroup = defaultStockGroup;

      // 3) Swappable recessed rubber grip panels on pistol grip
      const defaultGripGroup = new THREE.Group();
      const gripPanel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.068, 0.034), gripMat);
      gripPanel.position.set(0, -0.052, 0.058);
      gripPanel.rotation.x = 0.24;
      defaultGripGroup.add(gripPanel);
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      // 4) Upper steel receiver housing + right-side (+X) ejection port cutout & chamber
      const upperRec = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.215), darkMetal);
      upperRec.position.set(0, 0.048, -0.045);
      g.add(upperRec);
      const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.066), gripMat);
      ejectPort.position.set(0.0185, 0.049, -0.032);
      const ejectChamber = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.010, 0.042), brightSteel);
      ejectChamber.position.set(0.0165, 0.049, -0.032);
      g.add(ejectPort, ejectChamber);

      // Removable .338 Lapua box magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.072, 0.074), darkMetal);
      magBody.position.set(0, -0.048, -0.072);
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.010, 0.080), gunmetal);
      magPlate.position.set(0, -0.084, -0.072);
      defaultMagMeshGroup.add(magBody, magPlate);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // Open-loop trigger guard + curved trigger
      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.052), darkMetal);
      tgBottom.position.set(0, -0.032, 0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), darkMetal);
      tgFront.position.set(0, -0.021, -0.021);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.020, 0.010);
      trigger.rotation.x = 0.25;
      g.add(tgBottom, tgFront, trigger);

      // Swappable heavy fluted free-floating barrel (y = 0.046, z = -0.155..-0.735)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0148, 0.58, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.046, -0.445);
      defaultBarrelGroup.add(barrel);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Swappable multi-baffle rectangular muzzle brake (aligned on y = 0.046)
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.026, 0.068), darkMetal);
      brake.position.set(0, 0.046, -0.766);
      defaultMuzzleGroup.add(brake);
      for (const bz of [-0.747, -0.769, -0.789]) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.010), gripMat);
        baffle.position.set(0, 0.046, bz);
        defaultMuzzleGroup.add(baffle);
      }
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // Swappable folded under-forend tactical bipod (hidden if underbarrel grip equipped)
      const defaultBipodGroup = new THREE.Group();
      const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.030), darkMetal);
      bipodMount.position.set(0, -0.014, -0.405);
      defaultBipodGroup.add(bipodMount);
      for (const bx of [-0.017, 0.017]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0062, 0.195, 6), darkMetal);
        leg.rotation.x = Math.PI / 2 - 0.05;
        leg.position.set(bx, -0.021, -0.305);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0072, 0.018, 6), gripMat);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(bx, -0.025, -0.205);
        defaultBipodGroup.add(leg, foot);
      }
      g.add(defaultBipodGroup);
      wpn.defaultBipodGroup = defaultBipodGroup;

      // Full top Picatinny rail (always present, top surface y = 0.069)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.215), darkMetal);
      rail.position.set(0, 0.064, -0.052);
      g.add(rail);

      // Swappable iconic dual-ring elevated faceted sniper scope (skin-mapped outer housing + tactical clamps/lenses)
      const defaultScopeGroup = new THREE.Group();
      for (const rz of [0.015, -0.115]) {
        const ringBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.020, 0.020), darkMetal);
        ringBase.position.set(0, 0.077, rz);
        const ringClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.020, 10), gunmetal);
        ringClamp.rotation.x = Math.PI / 2;
        ringClamp.position.set(0, 0.094, rz);
        defaultScopeGroup.add(ringBase, ringClamp);
      }
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.25, 10), skinMat);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.094, -0.055);
      makeSkinned(scopeTube, uvBounds);
      const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.016, 0.088, 10), skinMat);
      scopeBell.rotation.x = Math.PI / 2;
      scopeBell.position.set(0, 0.094, -0.218);
      makeSkinned(scopeBell, uvBounds);
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
      defaultScopeGroup.add(scopeTube, scopeBell, scopeEye, turretTop, turretSide, rearLens, frontLens);
      g.add(defaultScopeGroup);
      wpn.defaultScopeGroup = defaultScopeGroup;

      // Animated right-side (+X) bolt-action receiver cylinder + bent bolt stem + oversized tactical knob
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

      addFlash(g, 0.046, -0.82, 1.48);

      wpn.opticRail = { x: 0, y: 0.069, z: -0.045, parent: g, width: 0.024, rearIronZ: 0.038 };
      wpn.barrelRoot = { y: 0.046, rootZ: -0.155, shroudEndZ: -0.432, defaultTipZ: -0.735, radius: 0.0125, isSniper: true };
      wpn.underRail = { x: 0, y: -0.010, z: -0.285, parent: g, laserPos: [0.025, 0.022, -0.375] };
      wpn.magWell = { x: 0, y: -0.022, z: -0.072, rotX: 0, width: 0.030, depth: 0.074, bottomY: -0.084, bottomZ: -0.072 };
      wpn.stockMount = { x: 0, y: 0.006, z: 0.092, faceW: 0.038, faceH: 0.074 };
      wpn.gripSpec = { isPanel: true, pos: [0, -0.052, 0.058], size: [0.046, 0.068, 0.035], rotX: 0.24 };
      wpn.apexMount = { x: -0.022, y: 0.028, z: -0.205, parent: g, scale: 1.0 };
      wpn.ironEyePoint = [0, 0.094, 0.128];

    } else if (wt === 'revolver') {
      const uvBounds = { minZ: -0.34, maxZ: 0.10, minY: -0.14, maxY: 0.09 };
      wpn.uvBounds = uvBounds;
      const frameShape = new THREE.Shape();
      frameShape.moveTo(-0.020, 0.010); frameShape.lineTo(0.018, 0.010);
      frameShape.lineTo(0.022, 0.052); frameShape.lineTo(0.012, 0.070);
      frameShape.lineTo(-0.012, 0.070); frameShape.lineTo(-0.022, 0.048); frameShape.closePath();
      g.add(makeSideExtrude(frameShape, 0.042, 0.003, skinMat, uvBounds));
      const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, 0.205), gunmetal);
      topStrap.position.set(0, 0.066, -0.115); g.add(topStrap);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.205, 10), skinMat);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.048, -0.220); makeSkinned(barrel, uvBounds); g.add(barrel);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 10), gripMat);
      bore.rotation.x = Math.PI / 2; bore.position.set(0, 0.048, -0.326); g.add(bore);
      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 10), brightSteel);
      muzzleRing.rotation.x = Math.PI / 2; muzzleRing.position.set(0, 0.048, -0.319); g.add(muzzleRing);
      const cylinderPivot = new THREE.Group(); cylinderPivot.position.set(0.012, 0.027, -0.105); g.add(cylinderPivot);
      const cylinderGroup = new THREE.Group(); cylinderGroup.position.set(0.034, 0, 0); cylinderPivot.add(cylinderGroup);
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.050, 12, 1), gunmetal);
      cylinder.rotation.z = Math.PI / 2; cylinderGroup.add(cylinder);
      const chamberDark = new THREE.MeshBasicMaterial({ color: 0x090d12 });
      const shellMat = new THREE.MeshStandardMaterial({ color: 0xb8873c, roughness: 0.34, metalness: 0.82 });
      const shellGroup = new THREE.Group(); cylinderGroup.add(shellGroup);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, y = Math.cos(a) * 0.021, z = Math.sin(a) * 0.021;
        const chamber = new THREE.Mesh(new THREE.CircleGeometry(0.008, 8), chamberDark);
        chamber.rotation.y = Math.PI / 2; chamber.position.set(0.026, y, z); cylinderGroup.add(chamber);
        const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.018, 8), shellMat);
        casing.rotation.z = Math.PI / 2; casing.position.set(0.025, y, z); shellGroup.add(casing);
      }
      const ejectorRod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.044, 7), brightSteel);
      ejectorRod.rotation.z = Math.PI / 2; ejectorRod.position.set(0.040, 0.027, -0.105); g.add(ejectorRod);
      const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.060), brightSteel);
      craneArm.position.set(0.012, 0.027, -0.105); g.add(craneArm);
      const hammerGroup = new THREE.Group(); hammerGroup.position.set(0, 0.050, 0.035);
      const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.018), gunmetal);
      hammer.position.set(0, 0.014, 0.002); hammer.rotation.x = -0.28; hammerGroup.add(hammer); g.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup; g.userData.revolverCylinderPivot = cylinderPivot;
      g.userData.revolverCylinderGroup = cylinderGroup; g.userData.revolverShellGroup = shellGroup;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.095, 0.062), gripMat);
      grip.position.set(0, -0.047, 0.044); grip.rotation.x = -0.20; g.add(grip);
      const gripPanel = new THREE.Mesh(new THREE.BoxGeometry(0.043, 0.070, 0.010), skinMat);
      gripPanel.position.set(0, -0.049, 0.046); gripPanel.rotation.x = -0.20; makeSkinned(gripPanel, uvBounds); g.add(gripPanel);
      const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0028, 5, 12, Math.PI), brightSteel);
      triggerGuard.position.set(0, -0.010, 0.005); triggerGuard.rotation.z = Math.PI; g.add(triggerGuard);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.008), brassMat);
      trigger.position.set(0, -0.014, -0.002); trigger.rotation.z = -0.20; g.add(trigger);
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), darkMetal);
      frontSight.position.set(0, 0.074, -0.292); g.add(frontSight);
      addFlash(g, 0.048, -0.326, 1.10);
      wpn.gripSpec = { isPanel: true, pos: [0, -0.047, 0.044], size: [0.043, 0.070, 0.010], rotX: -0.20 };
      wpn.supportAnchor = [-0.014, -0.030, -0.012];
      wpn.ironEyePoint = [0, 0.074, 0.085];
      wpn.barrelRoot = { y: 0.048, rootZ: -0.150, shroudEndZ: -0.300, defaultTipZ: -0.326, radius: 0.014 };
      wpn.apexMount = { x: -0.022, y: 0.025, z: -0.180, parent: g, scale: 0.75 };

    } else if (wt === 'deagle') {
      const uvBounds = { minZ: -0.30, maxZ: 0.085, minY: -0.135, maxY: 0.085 };
      wpn.uvBounds = uvBounds;

      // Wrap entire Deagle around spinPivot centered INSIDE the open trigger guard loop!
      const spinPivotPos = new THREE.Vector3(0, -0.016, -0.026);
      const spinGroup = new THREE.Group();
      spinGroup.position.copy(spinPivotPos);
      g.add(spinGroup);

      const modelRoot = new THREE.Group();
      modelRoot.position.copy(spinPivotPos).negate();
      spinGroup.add(modelRoot);

      g.userData.spinGroup = spinGroup;
      g.userData.spinPivot = spinPivotPos;
      wpn.attachParent = modelRoot;

      // 1) Iconic heavy triangular-beveled Desert Eagle fixed front barrel shroud
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
      const shroudMesh = makeSkinned(new THREE.Mesh(shroudGeo, skinMat), uvBounds);
      modelRoot.add(shroudMesh);

      // Top Weaver rail cross-slots along fixed barrel shroud (top y = 0.0665)
      for (const rz of [-0.176, -0.146, -0.116, -0.086]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.009), darkMetal);
        slot.position.set(0, 0.065, rz);
        modelRoot.add(slot);
      }

      // Swappable default .50 AE muzzle crown + dark bore (aligned on true bore y = 0.042, z = -0.208)
      const defaultBarrelGroup = new THREE.Group();
      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.010, 10), gunmetal);
      muzzleRing.rotation.x = Math.PI / 2;
      muzzleRing.position.set(0, 0.042, -0.208);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0076, 0.0076, 0.012, 8), gripMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(0, 0.042, -0.209);
      defaultBarrelGroup.add(muzzleRing, bore);
      modelRoot.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

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
      const slideMesh = makeSkinned(new THREE.Mesh(slideGeo, skinMat), uvBounds);
      slideGroup.add(slideMesh);

      // Right-side (+X) ejection port cutout & exposed brass chamber
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.034), gripMat);
      ejCut.position.set(0.0175, 0.048, -0.014);
      const chamberBrass = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 0.028, 8), brassMat);
      chamberBrass.rotation.x = Math.PI / 2;
      chamberBrass.position.set(0.012, 0.046, -0.014);
      slideGroup.add(ejCut, chamberBrass);

      // Rear slide cocking serrations + ambidextrous safety levers
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
      frameShape.moveTo(0.074, 0.020);
      frameShape.lineTo(-0.184, 0.020);
      frameShape.lineTo(-0.172, -0.001);
      frameShape.lineTo(-0.056, -0.001);
      frameShape.lineTo(-0.054, -0.036);
      frameShape.lineTo(-0.004, -0.036);
      frameShape.lineTo(0.002, -0.012);
      frameShape.lineTo(0.018, -0.104);
      frameShape.lineTo(0.068, -0.098);
      frameShape.lineTo(0.052, 0.005);
      frameShape.closePath();

      const tgHole = new THREE.Path();
      tgHole.moveTo(-0.046, -0.006);
      tgHole.lineTo(-0.006, -0.006);
      tgHole.lineTo(-0.008, -0.028);
      tgHole.lineTo(-0.046, -0.028);
      tgHole.closePath();
      frameShape.holes.push(tgHole);

      const frameMesh = makeSideExtrude(frameShape, 0.030, 0.0024, darkMetal, null);
      modelRoot.add(frameMesh);

      // Left-side (-X) slide-release lever for right-hand thumb
      const slideRelease = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.028), gunmetal);
      slideRelease.position.set(-0.018, 0.015, -0.012);
      modelRoot.add(slideRelease);

      // Curved Deagle trigger inside open loop
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.019, 0.006), brightSteel);
      trigger.position.set(0, -0.014, -0.016);
      trigger.rotation.x = 0.28;
      modelRoot.add(trigger);

      // Swappable wrap-around ergonomic rubber grip panels
      const defaultGripGroup = new THREE.Group();
      const gripWrap = new THREE.Mesh(new THREE.BoxGeometry(0.0355, 0.086, 0.044), gripMat);
      gripWrap.position.set(0, -0.052, 0.032);
      gripWrap.rotation.x = 0.24;
      defaultGripGroup.add(gripWrap);
      modelRoot.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      // Removable .50 AE magazine & chamfered baseplate (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.013, 0.047), gunmetal);
      magBase.position.set(0, -0.102, 0.044);
      magBase.rotation.x = 0.24;
      const magShaft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.072, 0.036), darkMetal);
      magShaft.position.set(0, -0.062, 0.035);
      magShaft.rotation.x = 0.24;
      defaultMagMeshGroup.add(magShaft, magBase);
      magGroup.add(defaultMagMeshGroup);
      modelRoot.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      addFlash(modelRoot, 0.042, -0.238, 1.22);

      // Fixed front Weaver rail optic mount (does not ride reciprocating slide!), true bore y = 0.042
      wpn.opticRail = { x: 0, y: 0.066, z: -0.126, parent: modelRoot, width: 0.020, isCompact: true };
      wpn.barrelRoot = { y: 0.042, rootZ: -0.203, shroudEndZ: -0.203, defaultTipZ: -0.212, radius: 0.0115, isPistol: true };
      wpn.underRail = { x: 0, y: -0.002, z: -0.122, parent: modelRoot, isPistolRail: true, laserPos: [0, -0.012, -0.122] };
      wpn.magWell = { x: 0, y: -0.098, z: 0.042, rotX: 0.24, width: 0.027, depth: 0.040, bottomY: -0.104, bottomZ: 0.045, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = { isPanel: true, pos: [0, -0.052, 0.032], size: [0.037, 0.086, 0.045], rotX: 0.24 };
      wpn.apexMount = { x: -0.017, y: 0.012, z: -0.105, parent: modelRoot, scale: 0.72 };
      wpn.ironEyePoint = [0, 0.071, 0.044];

    } else if (wt === 'smg') {
      const uvBounds = { minZ: -0.44, maxZ: 0.28, minY: -0.18, maxY: 0.09 };
      wpn.uvBounds = uvBounds;

      // 1) Iconic KRISS Vector deep angular upper & lower receiver shroud with flat under-rail forend
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(0.085, 0.044);
      bodyShape.lineTo(-0.265, 0.044);
      bodyShape.lineTo(-0.285, 0.024);
      bodyShape.lineTo(-0.262, -0.032);
      bodyShape.lineTo(-0.168, -0.032);
      bodyShape.lineTo(-0.146, -0.055);
      bodyShape.lineTo(-0.088, -0.055);
      bodyShape.lineTo(-0.068, -0.008);
      bodyShape.lineTo(0.078, -0.008);
      bodyShape.closePath();
      g.add(makeSideExtrude(bodyShape, 0.042, 0.0028, skinMat, uvBounds));

      // Right-side (+X) ejection port cutout + recessed steel breech
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.017, 0.054), gripMat);
      ejCut.position.set(0.021, 0.022, -0.058);
      const ejBreech = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.013, 0.044), brightSteel);
      ejBreech.position.set(0.019, 0.022, -0.058);
      g.add(ejCut, ejBreech);

      // Top full-length Picatinny rail (top y = 0.053) + under-forend Picatinny rail (bottom y = -0.036)
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.34), darkMetal);
      topRail.position.set(0, 0.049, -0.090);
      const lowRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.090), darkMetal);
      lowRail.position.set(0, -0.034, -0.214);
      g.add(topRail, lowRail);

      // Swappable flip-up iron sights (folded/hidden when optic is equipped)
      const defaultIronsGroup = new THREE.Group();
      const rearIron = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.014), gunmetal);
      rearIron.position.set(0, 0.058, 0.055);
      const frontIron = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.012), gunmetal);
      frontIron.position.set(0, 0.058, -0.245);
      const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.004), accentGlow);
      frontDot.position.set(0, 0.062, -0.245);
      defaultIronsGroup.add(rearIron, frontIron, frontDot);
      g.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;

      // Swappable compact barrel + flash hider (aligned on bore y = 0.006)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.120, 10), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.006, -0.312);
      defaultBarrelGroup.add(barrel);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      const defaultMuzzleGroup = new THREE.Group();
      const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.032, 8), darkMetal);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.006, -0.386);
      defaultMuzzleGroup.add(muzzleTip);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // Swappable contoured pistol grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.018, -0.006);
      gripShape.lineTo(0.056, -0.006);
      gripShape.lineTo(0.072, -0.088);
      gripShape.lineTo(0.034, -0.092);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.028, 0.0024, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.044), darkMetal);
      tg.position.set(0, -0.028, -0.010);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.017, 0.005), brightSteel);
      trigger.position.set(0, -0.017, 0.000);
      trigger.rotation.x = 0.25;
      g.add(tg, trigger);

      // Swappable folding skeleton buttstock
      const stockGroup = new THREE.Group();
      const sTop = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.18), darkMetal);
      sTop.position.set(0, 0.024, 0.172);
      const sBot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.010, 0.17), darkMetal);
      sBot.position.set(0, -0.022, 0.168);
      sBot.rotation.x = 0.18;
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.082, 0.018), gripMat);
      butt.position.set(0, -0.008, 0.260);
      stockGroup.add(sTop, sBot, butt);
      g.add(stockGroup);
      g.userData.defaultStockGroup = stockGroup;
      wpn.defaultStockGroup = stockGroup;

      // Iconic forward-cant vertical Vector stick magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.135, 0.032), darkMetal);
      magMesh.position.set(0, -0.102, -0.132);
      magMesh.rotation.x = 0.24;
      const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.038), gunmetal);
      magBase.position.set(0, -0.165, -0.148);
      magBase.rotation.x = 0.24;
      defaultMagMeshGroup.add(magMesh, magBase);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // Authentic KRISS Vector left-side (-X) folding charging handle
      const boltGroup = new THREE.Group();
      boltGroup.position.set(-0.025, 0.026, -0.165);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 0.026), brightSteel);
      const chKnob = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.010), darkMetal);
      chKnob.position.set(-0.009, 0, 0.008);
      boltGroup.add(ch, chKnob);
      g.add(boltGroup);
      g.userData.boltGroup = boltGroup;
      g.userData.boltRestPos = new THREE.Vector3(-0.025, 0.026, -0.165);

      addFlash(g, 0.006, -0.42, 0.78);

      wpn.opticRail = { x: 0, y: 0.053, z: -0.068, parent: g, width: 0.022 };
      wpn.barrelRoot = { y: 0.006, rootZ: -0.252, shroudEndZ: -0.268, defaultTipZ: -0.372, radius: 0.011 };
      wpn.underRail = { x: 0, y: -0.036, z: -0.214, parent: g, laserPos: [0.024, 0.016, -0.222] };
      wpn.magWell = { x: 0, y: -0.054, z: -0.118, rotX: 0.24, width: 0.024, depth: 0.032, bottomY: -0.165, bottomZ: -0.148, isCantMag: true };
      wpn.stockMount = { x: 0, y: 0.014, z: 0.085, faceW: 0.036, faceH: 0.048 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.029 };
      wpn.apexMount = { x: -0.021, y: 0.022, z: -0.068, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.062, 0.055];

    } else if (wt === 'shotgun') {
      const uvBounds = { minZ: -0.66, maxZ: 0.34, minY: -0.11, maxY: 0.08 };
      wpn.uvBounds = uvBounds;

      // Shell color tied to equipped ammo type (used for side-saddle shells AND animated twin-shell reload!)
      const shotgunShellColors = {
        flechette: 0x2ec8eb,
        slug: 0xe68829,
        magnum: 0x8c1226
      };
      g.userData.shellColor = shotgunShellColors[atts.ammo] || 0xc82532;

      // 1) Classic M870 steel receiver
      const recShape = new THREE.Shape();
      recShape.moveTo(0.085, 0.040);
      recShape.lineTo(-0.155, 0.040);
      recShape.lineTo(-0.165, -0.014);
      recShape.lineTo(0.075, -0.014);
      recShape.closePath();
      g.add(makeSideExtrude(recShape, 0.042, 0.0032, skinMat, uvBounds));

      // Right-side (+X) ejection port pocket + reciprocating steel breech bolt
      const ejPocket = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.020, 0.076), gripMat);
      ejPocket.position.set(0.0215, 0.018, -0.042);
      const breechBoltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.066), brightSteel);
      breechBoltMesh.position.set(0.022, 0.018, -0.042);
      g.add(ejPocket, breechBoltMesh);
      g.userData.breechBoltMesh = breechBoltMesh;
      g.userData.breechBoltRestZ = -0.042;

      // Recessed bottom loading gate + metallic shell carrier lifter (visible during bottom twin-shell reload!)
      const loadPortRecess = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.006, 0.078), gripMat);
      loadPortRecess.position.set(0, -0.014, -0.062);
      const loadGateLifter = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.004, 0.064), brightSteel);
      loadGateLifter.position.set(0, -0.012, -0.062);
      g.add(loadPortRecess, loadGateLifter);
      g.userData.loadGateLifter = loadGateLifter;

      // Top receiver Picatinny rail (top y = 0.049)
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.007, 0.19), darkMetal);
      topRail.position.set(0, 0.045, -0.035);
      g.add(topRail);

      // Swappable 12-gauge upper barrel + front bead sight (y = 0.026, z = -0.15..-0.63)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.48, 12), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.026, -0.39);
      const frontBead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
      frontBead.position.set(0, 0.043, -0.618);
      defaultBarrelGroup.add(barrel, frontBead);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Lower tubular magazine (base tube + clamp ring; extended_mag attaches flush onto front endcap!)
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.41, 10), darkMetal);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.002, -0.36);
      const tubeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0138, 0.0138, 0.018, 10), gunmetal);
      tubeCap.rotation.x = Math.PI / 2;
      tubeCap.position.set(0, -0.002, -0.568);
      const clampRing = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.042, 0.018), darkMetal);
      clampRing.position.set(0, 0.012, -0.525);
      g.add(magTube, tubeCap, clampRing);

      // Ribbed sliding pump forend (pumpGroup animates back/forward on shots & reload finish!)
      const pumpGroup = new THREE.Group();
      const pumpBody = makeSkinned(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.023, 0.18, 10), skinMat), uvBounds);
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
      // Under-pump tactical rail strip so foregrips mount flush onto pumpGroup and slide with it!
      const pumpRail = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.125), darkMetal);
      pumpRail.position.set(0, -0.024, -0.30);
      pumpGroup.add(pumpRail);
      g.add(pumpGroup);
      g.userData.pumpGroup = pumpGroup;
      g.userData.pumpRestZ = 0;

      // Swappable contoured pistol grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.042, -0.004);
      gripShape.lineTo(0.088, -0.004);
      gripShape.lineTo(0.106, -0.082);
      gripShape.lineTo(0.068, -0.088);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.030, 0.0026, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0045, 0.046), darkMetal);
      tgBottom.position.set(0, -0.030, 0.024);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.018, 0.005), darkMetal);
      tgFront.position.set(0, -0.021, 0.002);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.016, 0.005), brightSteel);
      trigger.position.set(0, -0.020, 0.028);
      trigger.rotation.x = 0.28;
      g.add(tgBottom, tgFront, trigger);

      // Swappable buttstock
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
      wpn.defaultStockGroup = stockGroup;

      addFlash(g, 0.026, -0.66, 1.35);

      wpn.opticRail = { x: 0, y: 0.049, z: -0.035, parent: g, width: 0.020 };
      wpn.barrelRoot = { y: 0.026, rootZ: -0.155, shroudEndZ: -0.405, defaultTipZ: -0.630, radius: 0.0145, isShotgun: true };
      wpn.underRail = { x: 0, y: -0.026, z: -0.300, parent: pumpGroup, isPump: true, laserPos: [0.022, 0.012, -0.525], laserParent: g };
      wpn.magWell = { isShotgun: true, tubeY: -0.002, tubeStartZ: -0.155, tubeTipZ: -0.568, sideSaddlePos: [-0.024, 0.013, -0.044], drumPos: [0, -0.068, -0.060] };
      wpn.stockMount = { x: 0, y: 0.004, z: 0.078, faceW: 0.036, faceH: 0.052 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.031 };
      wpn.apexMount = { x: -0.021, y: 0.026, z: -0.105, parent: g, scale: 0.88 };
      wpn.ironEyePoint = [0, 0.050, -0.035];

    } else if (wt === 'pistol') {
      const uvBounds = { minZ: -0.26, maxZ: 0.09, minY: -0.12, maxY: 0.065 };
      wpn.uvBounds = uvBounds;

      const spinGroup = new THREE.Group();
      spinGroup.position.set(0, -0.020, -0.002);
      const inner = new THREE.Group();
      inner.position.set(0, 0.020, 0.002);
      spinGroup.add(inner);
      g.add(spinGroup);
      g.userData.spinGroup = spinGroup;
      wpn.attachParent = inner;

      // 1) Crisp boxy USP-9 Tactical slide (reciprocating slideGroup)
      const slideGroup = new THREE.Group();
      const slideShape = new THREE.Shape();
      slideShape.moveTo(0.072, 0.040);
      slideShape.lineTo(-0.188, 0.040);
      slideShape.lineTo(-0.194, 0.010);
      slideShape.lineTo(0.070, 0.010);
      slideShape.closePath();
      slideGroup.add(makeSideExtrude(slideShape, 0.028, 0.0022, skinMat, uvBounds));

      // Right-side (+X) ejection port cutout & brass barrel hood + rear cocking serrations
      const ejCut = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.036), gripMat);
      ejCut.position.set(0.0145, 0.030, -0.066);
      const hoodBrass = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.028), brassMat);
      hoodBrass.position.set(0.0125, 0.030, -0.066);
      slideGroup.add(ejCut, hoodBrass);
      for (let i = 0; i < 5; i++) {
        const ser = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.018, 0.003), darkMetal);
        ser.position.set(0, 0.025, 0.028 + i * 0.007);
        slideGroup.add(ser);
      }

      // Swappable rear suppressor-height tritium sights (hidden when slide-mounted optic is equipped)
      const defaultIronsGroup = new THREE.Group();
      const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.010), darkMetal);
      rSightL.position.set(-0.006, 0.045, 0.054);
      const rSightR = rSightL.clone();
      rSightR.position.x = 0.006;
      const rDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0026, 0.0026), accentGlow);
      rDotL.position.set(-0.006, 0.046, 0.059);
      const rDotR = rDotL.clone();
      rDotR.position.x = 0.006;
      defaultIronsGroup.add(rSightL, rSightR, rDotL, rDotR);
      slideGroup.add(defaultIronsGroup);
      wpn.defaultIronsGroup = defaultIronsGroup;

      const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.010), darkMetal);
      fSight.position.set(0, 0.046, -0.175);
      const fDot = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), accentGlow);
      fDot.position.set(0, 0.048, -0.172);
      slideGroup.add(fSight, fDot);
      inner.add(slideGroup);
      g.userData.slideGroup = slideGroup;

      // Swappable threaded tactical barrel tip (aligned on true bore y = 0.024)
      const defaultBarrelGroup = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.036, 10), brightSteel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.024, -0.205);
      defaultBarrelGroup.add(barrel);
      inner.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Polymer tactical lower frame + under-barrel accessory rail + left-side (-X) slide release & decocker
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.24), darkMetal);
      frame.position.set(0, 0.002, -0.056);
      const slideRel = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.007, 0.028), gunmetal);
      slideRel.position.set(-0.015, 0.009, -0.008);
      const decocker = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.014), gunmetal);
      decocker.position.set(-0.015, 0.005, 0.042);
      inner.add(frame, slideRel, decocker);

      // Swappable contoured grip + trigger guard
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.008, -0.004);
      gripShape.lineTo(0.052, -0.004);
      gripShape.lineTo(0.068, -0.092);
      gripShape.lineTo(0.022, -0.095);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.025, 0.0022, gripMat, null));
      inner.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.004, 0.042), darkMetal);
      tg.position.set(0, -0.028, -0.016);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.020, 0.005), darkMetal);
      tgFront.position.set(0, -0.018, -0.036);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.005), brightSteel);
      trigger.position.set(0, -0.016, -0.010);
      trigger.rotation.x = 0.26;
      inner.add(tg, tgFront, trigger);

      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, 0.020, 0.072);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.010), brightSteel);
      hm.position.set(0, 0.004, 0.004);
      hammerGroup.add(hm);
      inner.add(hammerGroup);
      g.userData.hammerGroup = hammerGroup;

      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magShaft = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.068, 0.032), darkMetal);
      magShaft.position.set(0, -0.062, 0.038);
      magShaft.rotation.x = 0.16;
      const magPad = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.013, 0.042), gunmetal);
      magPad.position.set(0, -0.098, 0.044);
      magPad.rotation.x = 0.16;
      defaultMagMeshGroup.add(magShaft, magPad);
      magGroup.add(defaultMagMeshGroup);
      inner.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      addFlash(inner, 0.024, -0.24, 0.65);

      wpn.opticRail = { x: 0, y: 0.041, z: 0.018, parent: slideGroup, width: 0.020, isCompact: true, isSlideMounted: true };
      wpn.barrelRoot = { y: 0.024, rootZ: -0.190, shroudEndZ: -0.190, defaultTipZ: -0.222, radius: 0.008, isPistol: true };
      wpn.underRail = { x: 0, y: -0.010, z: -0.122, parent: inner, isPistolRail: true, laserPos: [0, -0.018, -0.124] };
      wpn.magWell = { x: 0, y: -0.092, z: 0.043, rotX: 0.16, width: 0.022, depth: 0.036, bottomY: -0.100, bottomZ: 0.046, isPistolMag: true };
      wpn.stockMount = null;
      wpn.gripSpec = { shape: gripShape, thickness: 0.026 };
      wpn.apexMount = { x: -0.014, y: 0.003, z: -0.092, parent: inner, scale: 0.65 };
      wpn.ironEyePoint = [0, 0.049, 0.054];

    } else {
      // V-47 Precision Rifle (Iconic CS:S/CS2 AK-47 Faceted Silhouette)
      const uvBounds = { minZ: -0.62, maxZ: 0.32, minY: -0.17, maxY: 0.095 };
      wpn.uvBounds = uvBounds;

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

      // Right-side (+X) ejection recess + iconic AK fire selector lever; left-side (-X) dovetail optic rail pad
      const ejRecess = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.088), gripMat);
      ejRecess.position.set(0.021, 0.024, -0.046);
      const selector = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.068), gunmetal);
      selector.position.set(0.023, 0.010, 0.020);
      selector.rotation.x = 0.08;
      const sideDovetail = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.082), darkMetal);
      sideDovetail.position.set(-0.023, 0.016, -0.022);
      g.add(ejRecess, selector, sideDovetail);

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

      // 2) Swappable classic angled drop-comb AK buttstock + steel recoil buttpad
      const defaultStockGroup = new THREE.Group();
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0.090, 0.030);
      stockShape.lineTo(0.282, 0.018);
      stockShape.lineTo(0.288, -0.068);
      stockShape.lineTo(0.240, -0.062);
      stockShape.lineTo(0.090, -0.006);
      stockShape.closePath();
      defaultStockGroup.add(makeSideExtrude(stockShape, 0.034, 0.0032, skinMat, uvBounds));

      const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.090, 0.014), gripMat);
      buttplate.position.set(0, -0.025, 0.290);
      buttplate.rotation.x = -0.07;
      defaultStockGroup.add(buttplate);
      g.add(defaultStockGroup);
      g.userData.defaultStockGroup = defaultStockGroup;
      wpn.defaultStockGroup = defaultStockGroup;

      // 3) Sculpted lower handguard + upper gas-tube handguard shroud + under-handguard rail strip
      const lowerHgShape = new THREE.Shape();
      lowerHgShape.moveTo(-0.146, 0.026);
      lowerHgShape.lineTo(-0.348, 0.024);
      lowerHgShape.lineTo(-0.340, -0.008);
      lowerHgShape.lineTo(-0.240, -0.011);
      lowerHgShape.lineTo(-0.146, -0.008);
      lowerHgShape.closePath();
      g.add(makeSideExtrude(lowerHgShape, 0.038, 0.0030, skinMat, uvBounds));

      const upperHg = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0155, 0.165, 8), skinMat);
      upperHg.rotation.x = Math.PI / 2;
      upperHg.position.set(0, 0.042, -0.240);
      projectWeaponMeshUVs(upperHg, uvBounds);
      g.add(upperHg);

      const lowRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.005, 0.120), darkMetal);
      lowRail.position.set(0, -0.012, -0.252);
      g.add(lowRail);

      for (const vz of [-0.205, -0.255, -0.305]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.043, 0.007, 0.024), gripMat);
        vent.position.set(0, 0.012, vz);
        g.add(vent);
      }
      const hgCap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.014), darkMetal);
      hgCap.position.set(0, 0.014, -0.348);
      g.add(hgCap);

      // 4) Rear tangent leaf sight block
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

      // 5) Swappable barrel assembly (gas tube, 45-deg gas block, steel barrel, cleaning rod, hooded front sight)
      const defaultBarrelGroup = new THREE.Group();
      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.010, 0.120, 8), darkMetal);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 0.044, -0.365);
      const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.028), darkMetal);
      gasBlock.position.set(0, 0.034, -0.422);
      gasBlock.rotation.x = 0.42;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.012, 0.240, 8), gunmetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.020, -0.460);
      const cleanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0030, 0.0030, 0.205, 6), brightSteel);
      cleanRod.rotation.x = Math.PI / 2;
      cleanRod.position.set(0, 0.005, -0.445);
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
      defaultBarrelGroup.add(gasTube, gasBlock, barrel, cleanRod, fsBase, fsHoodL, fsHoodR, fsHoodTop, fsPost);
      g.add(defaultBarrelGroup);
      wpn.defaultBarrelGroup = defaultBarrelGroup;

      // Swappable slanted AKM muzzle compensator
      const defaultMuzzleGroup = new THREE.Group();
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.044, 8), darkMetal);
      brake.rotation.x = Math.PI / 2;
      brake.position.set(0, 0.020, -0.598);
      defaultMuzzleGroup.add(brake);
      g.add(defaultMuzzleGroup);
      wpn.defaultMuzzleGroup = defaultMuzzleGroup;

      // 6) Swappable sculpted ergonomic AK pistol grip + open trigger guard + curved trigger
      const gripShape = new THREE.Shape();
      gripShape.moveTo(0.024, -0.004);
      gripShape.lineTo(0.064, -0.004);
      gripShape.lineTo(0.078, -0.088);
      gripShape.lineTo(0.042, -0.095);
      gripShape.closePath();
      const defaultGripGroup = new THREE.Group();
      defaultGripGroup.add(makeSideExtrude(gripShape, 0.028, 0.0026, gripMat, null));
      g.add(defaultGripGroup);
      wpn.defaultGripGroup = defaultGripGroup;

      const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0045, 0.048), darkMetal);
      tgBottom.position.set(0, -0.028, -0.004);
      const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.022, 0.005), darkMetal);
      tgFront.position.set(0, -0.018, -0.027);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.018, 0.005), brightSteel);
      trigger.position.set(0, -0.017, 0.002);
      trigger.rotation.x = 0.28;
      g.add(tgBottom, tgFront, trigger);

      // 7) Curved 30-round banana magazine (magGroup wraps defaultMagMeshGroup)
      const magGroup = new THREE.Group();
      const defaultMagMeshGroup = new THREE.Group();
      const magShape = new THREE.Shape();
      magShape.moveTo(-0.062, -0.004);
      magShape.lineTo(-0.122, -0.004);
      magShape.quadraticCurveTo(-0.138, -0.076, -0.172, -0.136);
      magShape.lineTo(-0.118, -0.152);
      magShape.quadraticCurveTo(-0.086, -0.082, -0.062, -0.004);
      magShape.closePath();
      const magMesh = makeSideExtrude(magShape, 0.026, 0.0022, skinMat, uvBounds);
      const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.008, 0.060), darkMetal);
      magPlate.position.set(0, -0.146, -0.146);
      magPlate.rotation.x = -0.34;
      defaultMagMeshGroup.add(magMesh, magPlate);
      magGroup.add(defaultMagMeshGroup);
      g.add(magGroup);
      g.userData.magGroup = magGroup;
      g.userData.magRestPos = new THREE.Vector3(0, 0, 0);
      wpn.defaultMagMeshGroup = defaultMagMeshGroup;

      // 8) Right-side (+X) reciprocating bolt carrier & upturned AK charging handle (boltGroup)
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

      wpn.opticRail = { x: 0, y: 0.059, z: -0.022, parent: g, width: 0.022, needsAkMount: true };
      wpn.barrelRoot = { y: 0.020, rootZ: -0.345, shroudEndZ: -0.352, defaultTipZ: -0.578, radius: 0.011, isAk: true };
      wpn.underRail = { x: 0, y: -0.014, z: -0.252, parent: g, laserPos: [0.025, 0.018, -0.285] };
      wpn.magWell = { x: 0, y: -0.010, z: -0.095, rotX: -0.32, width: 0.026, depth: 0.058, bottomY: -0.146, bottomZ: -0.146, isAkCurve: true };
      wpn.stockMount = { x: 0, y: 0.012, z: 0.095, faceW: 0.036, faceH: 0.038 };
      wpn.gripSpec = { shape: gripShape, thickness: 0.029 };
      wpn.apexMount = { x: -0.021, y: 0.020, z: -0.175, parent: g, scale: 0.92 };
      wpn.ironEyePoint = [0, 0.063, -0.126];
    }

    // ---------- Modular Exact-Fit 3D Gunsmith Attachments (All 6 Firearms × 8 Slots) ----------
    const uvBounds = wpn.uvBounds;
    const attGroup = new THREE.Group();
    attGroup.name = 'gunsmithAttachments';
    wpn.attachParent.add(attGroup);

    const br = wpn.barrelRoot || { y: 0.020, rootZ: -0.34, shroudEndZ: -0.35, defaultTipZ: -0.58, radius: 0.011 };
    let barrelTipZ = br.defaultTipZ;

    // 1) Barrel replacement (swaps default barrel cleanly — zero clipping or floating!)
    if (atts.barrel && wpn.defaultBarrelGroup) {
      wpn.defaultBarrelGroup.visible = false;
      if (wpn.defaultMuzzleGroup) wpn.defaultMuzzleGroup.visible = false;

      if (atts.barrel === 'short_cqb') {
        const len = br.isPistol ? 0.022 : br.isShotgun ? 0.340 : br.isSniper ? 0.420 : br.isAk ? 0.145 : 0.078;
        barrelTipZ = br.rootZ - len;
        const cqbCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.96, br.radius * 1.06, len, 10),
          gunmetal
        );
        cqbCyl.rotation.x = Math.PI / 2;
        cqbCyl.position.set(0, br.y, br.rootZ - len * 0.5);
        const crown = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.25, br.radius * 1.25, 0.016, 10),
          darkMetal
        );
        crown.rotation.x = Math.PI / 2;
        crown.position.set(0, br.y, barrelTipZ + 0.006);
        attGroup.add(cqbCyl, crown);

        if (br.isAk) {
          // Compact Krinkov gas block + hooded front sight flush on short barrel
          const gTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.068, 8), darkMetal);
          gTube.rotation.x = Math.PI / 2;
          gTube.position.set(0, 0.044, br.rootZ - 0.034);
          const gSight = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.044, 0.024), darkMetal);
          gSight.position.set(0, 0.042, barrelTipZ + 0.036);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.036);
          attGroup.add(gTube, gSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.017, barrelTipZ + 0.014);
          attGroup.add(bead);
        }
      } else if (atts.barrel === 'fluted_light') {
        barrelTipZ = br.defaultTipZ - (br.isPistol ? 0.022 : 0.032);
        const len = Math.abs(barrelTipZ - br.rootZ);
        const flutedCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.94, br.radius * 1.04, len, 6),
          brightSteel
        );
        flutedCyl.rotation.x = Math.PI / 2;
        flutedCyl.position.set(0, br.y, (br.rootZ + barrelTipZ) * 0.5);
        attGroup.add(flutedCyl);

        // Tactical barrel stabilizer rings along fluted barrel
        const ringCount = br.isPistol ? 1 : 2;
        for (let i = 1; i <= ringCount; i++) {
          const rz = THREE.MathUtils.lerp(br.shroudEndZ, barrelTipZ, i / (ringCount + 0.5));
          const ring = new THREE.Mesh(
            new THREE.CylinderGeometry(br.radius * 1.18, br.radius * 1.18, 0.014, 8),
            darkMetal
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, br.y, rz);
          attGroup.add(ring);
        }
        if (br.isAk) {
          const gTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.115, 8), darkMetal);
          gTube.rotation.x = Math.PI / 2;
          gTube.position.set(0, 0.044, -0.365);
          const gBlk = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.034, 0.024), darkMetal);
          gBlk.position.set(0, 0.034, -0.422);
          gBlk.rotation.x = 0.35;
          const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.018), darkMetal);
          fSight.position.set(0, 0.042, barrelTipZ + 0.035);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.035);
          attGroup.add(gTube, gBlk, fSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.017, barrelTipZ + 0.016);
          attGroup.add(bead);
        }
      } else if (atts.barrel === 'heavy_long') {
        barrelTipZ = br.defaultTipZ - (br.isPistol ? 0.056 : 0.105);
        const len = Math.abs(barrelTipZ - br.rootZ);
        const heavyCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.12, br.radius * 1.18, len, 10),
          gunmetal
        );
        heavyCyl.rotation.x = Math.PI / 2;
        heavyCyl.position.set(0, br.y, (br.rootZ + barrelTipZ) * 0.5);
        attGroup.add(heavyCyl);

        // Skin-mapped heavy vented barrel shroud extending flush from receiver/handguard nose!
        const shroudLen = br.isPistol ? 0.042 : br.isSniper ? 0.165 : br.isShotgun ? 0.175 : 0.135;
        const shroudW = br.isPistol ? 0.026 : 0.034;
        const shroudH = br.isPistol ? 0.028 : 0.034;
        const shroudZ = br.shroudEndZ - shroudLen * 0.5 + 0.004;
        const shroudMesh = makeSkinned(
          new THREE.Mesh(new THREE.BoxGeometry(shroudW, shroudH, shroudLen), skinMat),
          uvBounds
        );
        shroudMesh.position.set(0, br.y, shroudZ);
        makeSkinned(shroudMesh, uvBounds);
        attGroup.add(shroudMesh);

        // Tactical dark cooling vents along shroud sides
        const ventCount = br.isPistol ? 2 : 4;
        for (let i = 0; i < ventCount; i++) {
          const vz = shroudZ + shroudLen * 0.34 - (i / Math.max(1, ventCount - 1)) * shroudLen * 0.68;
          const v = new THREE.Mesh(new THREE.BoxGeometry(shroudW + 0.003, 0.006, 0.012), gripMat);
          v.position.set(0, br.y, vz);
          attGroup.add(v);
        }
        if (br.isAk) {
          const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.018), darkMetal);
          fSight.position.set(0, 0.042, barrelTipZ + 0.035);
          const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.004), accentGlow);
          fPost.position.set(0, 0.062, barrelTipZ + 0.035);
          attGroup.add(fSight, fPost);
        } else if (br.isShotgun) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), accentGlow);
          bead.position.set(0, br.y + 0.018, barrelTipZ + 0.016);
          attGroup.add(bead);
        }
      }

      // If barrel was swapped and NO muzzle attachment is equipped, add clean threaded muzzle cap
      if (!atts.muzzle) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 1.14, br.radius * 1.14, 0.018, 10),
          darkMetal
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.set(0, br.y, barrelTipZ - 0.006);
        const bore = new THREE.Mesh(
          new THREE.CylinderGeometry(br.radius * 0.68, br.radius * 0.68, 0.006, 8),
          gripMat
        );
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, barrelTipZ - 0.015);
        attGroup.add(cap, bore);
      }
    }

    // 2) Muzzle attachment (always seats flush onto exact barrelTipZ & true bore br.y; tactical hardware)
    let flashZ = barrelTipZ - 0.045;
    let flashScaleMul = 1.0;
    if (atts.muzzle) {
      if (wpn.defaultMuzzleGroup) wpn.defaultMuzzleGroup.visible = false;
      const mzZ = barrelTipZ;
      if (atts.muzzle === 'suppressor') {
        const supLen = br.isPistol ? 0.145 : br.isSniper ? 0.215 : 0.180;
        const supRad = br.isShotgun ? 0.0195 : br.isPistol ? 0.0135 : 0.0165;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(supRad * 1.06, supRad * 1.06, 0.022, 12), gunmetal);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, br.y, mzZ - 0.003);
        const sup = new THREE.Mesh(new THREE.CylinderGeometry(supRad, supRad, supLen, 12), darkMetal);
        sup.rotation.x = Math.PI / 2;
        sup.position.set(0, br.y, mzZ - supLen * 0.5 + 0.008);
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(supRad * 0.55, supRad * 0.55, 0.006, 10), gripMat);
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(0, br.y, mzZ - supLen + 0.007);
        attGroup.add(collar, sup, endCap);
        flashZ = mzZ - supLen - 0.012;
        flashScaleMul = 0.28;
      } else if (atts.muzzle === 'compensator') {
        const compLen = br.isPistol ? 0.044 : 0.056;
        const compW = br.isPistol ? 0.020 : 0.024;
        const comp = new THREE.Mesh(new THREE.BoxGeometry(compW, compW, compLen), gunmetal);
        comp.position.set(0, br.y, mzZ - compLen * 0.45);
        const port1 = new THREE.Mesh(new THREE.BoxGeometry(compW + 0.002, 0.007, 0.012), darkMetal);
        port1.position.set(0, br.y + compW * 0.34, mzZ - compLen * 0.36);
        const port2 = port1.clone();
        port2.position.z = mzZ - compLen * 0.68;
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(br.radius * 0.72, br.radius * 0.72, 0.008, 8), gripMat);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, mzZ - compLen * 0.94);
        attGroup.add(comp, port1, port2, bore);
        flashZ = mzZ - compLen - 0.018;
      } else if (atts.muzzle === 'muzzle_brake') {
        const mbLen = br.isPistol ? 0.048 : 0.064;
        const mbW = br.isPistol ? 0.026 : 0.034;
        const mbH = br.isPistol ? 0.020 : 0.024;
        const mb = new THREE.Mesh(new THREE.BoxGeometry(mbW, mbH, mbLen), brightSteel);
        mb.position.set(0, br.y, mzZ - mbLen * 0.46);
        for (const frac of [0.28, 0.64]) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(mbW + 0.003, mbH * 0.46, 0.011), darkMetal);
          slot.position.set(0, br.y, mzZ - mbLen * frac);
          attGroup.add(slot);
        }
        attGroup.add(mb);
        flashZ = mzZ - mbLen - 0.020;
      } else if (atts.muzzle === 'choke_tight') {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.0175, 0.072, 10), brightSteel);
        ch.rotation.x = Math.PI / 2;
        ch.position.set(0, br.y, mzZ - 0.030);
        const teeth = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.017, 0.018, 8), darkMetal);
        teeth.rotation.x = Math.PI / 2;
        teeth.position.set(0, br.y, mzZ - 0.066);
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10), gripMat);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, br.y, mzZ - 0.074);
        attGroup.add(ch, teeth, bore);
        flashZ = mzZ - 0.088;
      }
    }
    if (g.userData.muzzleFlash) {
      g.userData.muzzleFlash.position.set(0, br.y, flashZ);
      g.userData.muzzleFlash.scale.setScalar(flashScaleMul);
    }

    // 3) Optics (skin-mapped outer hoods/tubes + tactical rails, clamps & lenses; handles AWP iron_snipe!)
    const opticRedMat = new THREE.MeshBasicMaterial({ color: 0xff3b52 });
    const opticHoloMat = new THREE.MeshBasicMaterial({ color: 0x38f2ff });
    const opticGlassMat = new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
    const or = wpn.opticRail || { x: 0, y: 0.055, z: -0.03, parent: attGroup, width: 0.022 };
    const opticParent = or.parent === g ? attGroup : (or.parent || attGroup);
    const ox = or.x, oy = or.y, oz = or.z;
    let opticEyePoint = new THREE.Vector3(wpn.ironEyePoint[0], wpn.ironEyePoint[1], wpn.ironEyePoint[2]);

    if (atts.optic) {
      // Hide default irons when mounting a non-iron optic so sights never clip through optic glass
      if (wpn.defaultIronsGroup && atts.optic !== 'iron_snipe') {
        wpn.defaultIronsGroup.visible = false;
      }
      // On AWP, hide built-in sniper scope unless using default/sniper_4x/sniper_var
      if (wt === 'awp' && wpn.defaultScopeGroup && atts.optic !== 'sniper_4x' && atts.optic !== 'sniper_var') {
        wpn.defaultScopeGroup.visible = false;
      }
      // On V-47 AK-47, build authentic left-side dovetail cantilever Picatinny mount so optics never float above curved dust cover!
      if (or.needsAkMount) {
        const sideArm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.044, 0.072), darkMetal);
        sideArm.position.set(-0.025, 0.036, oz);
        const topBridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.006, 0.108), darkMetal);
        topBridge.position.set(-0.010, oy - 0.003, oz);
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.112), gunmetal);
        topRail.position.set(0, oy - 0.001, oz);
        attGroup.add(sideArm, topBridge, topRail);
      }

      if (atts.optic === 'iron_snipe') {
        // Low-profile folding tactical peep irons for AWP CQB quickscoping
        const rz = or.rearIronZ || 0.038;
        const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.018), darkMetal);
        rearBase.position.set(0, oy + 0.003, rz);
        const rearRingL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.015, 0.008), gunmetal);
        rearRingL.position.set(-0.007, oy + 0.012, rz);
        const rearRingR = rearRingL.clone();
        rearRingR.position.x = 0.007;
        const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0024, 0.002), accentGlow);
        rearDotL.position.set(-0.007, oy + 0.013, rz + 0.005);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.007;

        const fz = Math.max(barrelTipZ + 0.045, -0.58);
        const fClamp = new THREE.Mesh(new THREE.CylinderGeometry(br.radius * 1.25, br.radius * 1.25, 0.022, 10), darkMetal);
        fClamp.rotation.x = Math.PI / 2;
        fClamp.position.set(0, br.y, fz);
        const fTower = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.014), darkMetal);
        fTower.position.set(0, br.y + 0.020, fz);
        const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.011, 0.003), accentGlow);
        fPost.position.set(0, br.y + 0.036, fz);
        attGroup.add(rearBase, rearRingL, rearRingR, rearDotL, rearDotR, fClamp, fTower, fPost);
        opticEyePoint.set(0, oy + 0.012, rz);
      } else if (atts.optic === 'reflex_dot') {
        const s = or.isCompact ? 0.78 : 1.0;
        const baseH = 0.007 * s;
        const winH = 0.022 * s;
        const winW = 0.024 * s;
        const base = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.003, baseH, 0.044 * s), darkMetal);
        base.position.set(ox, oy + baseH * 0.5, oz);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.0036 * s, winH, 0.016 * s), skinMat);
        postL.position.set(ox - winW * 0.5, oy + baseH + winH * 0.5, oz);
        makeSkinned(postL, uvBounds);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.0036 * s, winH, 0.016 * s), skinMat);
        postR.position.set(ox + winW * 0.5, oy + baseH + winH * 0.5, oz);
        makeSkinned(postR, uvBounds);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.0036 * s, 0.0036 * s, 0.016 * s), skinMat);
        topBar.position.set(ox, oy + baseH + winH + 0.0014 * s, oz);
        makeSkinned(topBar, uvBounds);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.002, winH - 0.002), opticGlassMat);
        glass.position.set(ox, oy + baseH + winH * 0.5, oz);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0016 * s, 6, 6), opticRedMat);
        dot.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        opticParent.add(base, postL, postR, topBar, glass, dot);
        opticEyePoint.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
      } else if (atts.optic === 'holo_eotech') {
        const s = or.isCompact ? 0.82 : 1.0;
        const baseH = 0.010 * s;
        const winH = 0.026 * s;
        const winW = 0.030 * s;
        const base = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.004, baseH, 0.062 * s), darkMetal);
        base.position.set(ox, oy + baseH * 0.5, oz);
        // Signature skin-mapped EOTech outer protective hood
        const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.0045 * s, winH + 0.003, 0.046 * s), skinMat);
        hoodL.position.set(ox - winW * 0.52, oy + baseH + winH * 0.5, oz);
        makeSkinned(hoodL, uvBounds);
        const hoodR = new THREE.Mesh(new THREE.BoxGeometry(0.0045 * s, winH + 0.003, 0.046 * s), skinMat);
        hoodR.position.set(ox + winW * 0.52, oy + baseH + winH * 0.5, oz);
        makeSkinned(hoodR, uvBounds);
        const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.006, 0.0045 * s, 0.046 * s), skinMat);
        hoodTop.position.set(ox, oy + baseH + winH + 0.002, oz);
        makeSkinned(hoodTop, uvBounds);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.004, winH - 0.003), opticGlassMat);
        glass.position.set(ox, oy + baseH + winH * 0.5, oz);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.0044 * s, 0.0056 * s, 16), opticHoloMat);
        ring.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        const cDot = new THREE.Mesh(new THREE.SphereGeometry(0.0012 * s, 6, 6), opticHoloMat);
        cDot.position.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
        opticParent.add(base, hoodL, hoodR, hoodTop, glass, ring, cDot);
        opticEyePoint.set(ox, oy + baseH + winH * 0.5, oz - 0.001);
      } else if (atts.optic === 'acog_25') {
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.013, 0.068), darkMetal);
        mount.position.set(ox, oy + 0.0065, oz);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.014, 0.112, 12), skinMat);
        body.rotation.x = Math.PI / 2;
        body.position.set(ox, oy + 0.026, oz - 0.008);
        makeSkinned(body, uvBounds);
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.0165, 0.032, 12), skinMat);
        bell.rotation.x = Math.PI / 2;
        bell.position.set(ox, oy + 0.026, oz - 0.072);
        makeSkinned(bell, uvBounds);
        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0145, 0.018, 12), darkMetal);
        eyeCup.rotation.x = Math.PI / 2;
        eyeCup.position.set(ox, oy + 0.026, oz + 0.052);
        const fiber = new THREE.Mesh(new THREE.BoxGeometry(0.0036, 0.0036, 0.042), opticRedMat);
        fiber.position.set(ox, oy + 0.044, oz - 0.012);
        const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), scopeLensMat);
        frontLens.position.set(ox, oy + 0.026, oz - 0.089);
        frontLens.rotation.y = Math.PI;
        const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), scopeLensMat);
        rearLens.position.set(ox, oy + 0.026, oz + 0.062);
        opticParent.add(mount, body, bell, eyeCup, fiber, frontLens, rearLens);
        opticEyePoint.set(ox, oy + 0.026, oz + 0.062);
      } else if (atts.optic === 'sniper_4x' || atts.optic === 'sniper_var') {
        if (wt !== 'awp') {
          for (const rz of [oz + 0.042, oz - 0.058]) {
            const rBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.016), darkMetal);
            rBase.position.set(ox, oy + 0.009, rz);
            const rClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.016, 10), gunmetal);
            rClamp.rotation.x = Math.PI / 2;
            rClamp.position.set(ox, oy + 0.028, rz);
            opticParent.add(rBase, rClamp);
          }
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.21, 12), skinMat);
          tube.rotation.x = Math.PI / 2;
          tube.position.set(ox, oy + 0.028, oz - 0.015);
          makeSkinned(tube, uvBounds);
          const objBell = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.052, 12), skinMat);
          objBell.rotation.x = Math.PI / 2;
          objBell.position.set(ox, oy + 0.028, oz - 0.140);
          makeSkinned(objBell, uvBounds);
          const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 10), scopeLensMat);
          rearLens.position.set(ox, oy + 0.028, oz + 0.091);
          const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 10), scopeLensMat);
          frontLens.rotation.y = Math.PI;
          frontLens.position.set(ox, oy + 0.028, oz - 0.167);
          opticParent.add(tube, objBell, rearLens, frontLens);
          opticEyePoint.set(ox, oy + 0.028, oz + 0.091);
        } else if (atts.optic === 'sniper_var') {
          // Exact coaxial sunshade extension + magnification throw lever on AWP scope (true center y = 0.094!)
          const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.052, 10), skinMat);
          shade.rotation.x = Math.PI / 2;
          shade.position.set(0, 0.094, -0.286);
          makeSkinned(shade, uvBounds);
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.014, 10), darkMetal);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, 0.094, 0.056);
          const lever = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.007), accentGlow);
          lever.position.set(0.018, 0.104, 0.056);
          lever.rotation.z = -0.35;
          attGroup.add(shade, ring, lever);
          opticEyePoint.set(0, 0.094, 0.128);
        } else {
          opticEyePoint.set(0, 0.094, 0.128);
        }
      }
    }

    // 4) Underbarrel foregrips & tactical laser (tactical dark/metallic; M870 foregrips mount onto pumpGroup!)
    if (atts.underbarrel && wpn.underRail) {
      const ur = wpn.underRail;
      const uParent = ur.parent === g ? attGroup : (ur.parent || attGroup);
      const ux = ur.x, uy = ur.y, uz = ur.z;

      if (atts.underbarrel !== 'laser_tac' && wpn.defaultBipodGroup) {
        wpn.defaultBipodGroup.visible = false;
      }

      if (atts.underbarrel === 'vertical_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.032), darkMetal);
        clamp.position.set(ux, uy - 0.004, uz);
        const vg = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.011, 0.082, 8), gripMat);
        vg.position.set(ux, uy - 0.048, uz);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8), gunmetal);
        cap.position.set(ux, uy - 0.090, uz);
        uParent.add(clamp, vg, cap);
        g.userData.supportAnchorOverride = [ux, uy - 0.050, uz];
      } else if (atts.underbarrel === 'angled_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.096), darkMetal);
        clamp.position.set(ux, uy - 0.003, uz);
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.088), gripMat);
        ag.position.set(ux, uy - 0.016, uz);
        ag.rotation.x = -0.22;
        uParent.add(clamp, ag);
        g.userData.supportAnchorOverride = [ux, uy - 0.024, uz + 0.005];
      } else if (atts.underbarrel === 'stubby_grip') {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.030), darkMetal);
        clamp.position.set(ux, uy - 0.004, uz);
        const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.0125, 0.048, 8), gripMat);
        sg.position.set(ux, uy - 0.031, uz);
        uParent.add(clamp, sg);
        g.userData.supportAnchorOverride = [ux, uy - 0.034, uz];
      } else if (atts.underbarrel === 'laser_tac') {
        const lParent = ur.laserParent === g ? attGroup : (ur.laserParent || uParent);
        const lp = ur.laserPos || [ux + 0.024, uy + 0.016, uz];
        const lScale = ur.isPistolRail ? 0.72 : 1.0;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.022 * lScale, 0.018 * lScale, 0.058 * lScale), darkMetal);
        box.position.set(lp[0], lp[1], lp[2]);
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0055 * lScale, 0.006 * lScale, 0.008, 8), gunmetal);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(lp[0], lp[1], lp[2] - 0.031 * lScale);
        const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.0032 * lScale, 6, 6), new THREE.MeshBasicMaterial({ color: 0x39ff88 }));
        emitter.position.set(lp[0], lp[1], lp[2] - 0.035 * lScale);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0010, 0.0010, 0.34, 6),
          new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.24, depthWrite: false })
        );
        beam.rotation.x = Math.PI / 2;
        beam.position.set(lp[0], lp[1], lp[2] - 0.205);
        lParent.add(box, bezel, emitter, beam);
      }
    }

    // 5) Magazine upgrades (shotgun gets tube ext / 6-shell side-saddle / receiver drum; others get exact-fit mag swaps!)
    const mw = wpn.magWell;
    const ammoColorMap = {
      fmj: 0xf4c44e,
      hollow_point: 0xff4c65,
      high_velocity: 0x38e8ff,
      subsonic: 0xa96bff,
      flechette: 0x2ec8eb,
      slug: 0xe68829,
      magnum: 0xc81e36
    };
    const ammoBandCol = atts.ammo ? (ammoColorMap[atts.ammo] || 0x38e8ff) : null;

    if (mw && mw.isShotgun) {
      const shellCol = g.userData.shellColor || 0xc82532;
      const hullMat = new THREE.MeshStandardMaterial({ color: shellCol, roughness: 0.45, metalness: 0.08 });

      if (atts.magazine === 'extended_mag') {
        // Extended skin-mapped tubular magazine sleeve extending seamlessly from tubeTipZ
        const extLen = 0.135;
        const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.0148, 0.0148, 0.022, 10), gunmetal);
        coupler.rotation.x = Math.PI / 2;
        coupler.position.set(0, mw.tubeY, mw.tubeTipZ - 0.004);
        const extTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, extLen, 10), skinMat);
        extTube.rotation.x = Math.PI / 2;
        extTube.position.set(0, mw.tubeY, mw.tubeTipZ - extLen * 0.5 - 0.008);
        makeSkinned(extTube, uvBounds);
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.013, 0.018, 10), darkMetal);
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(0, mw.tubeY, mw.tubeTipZ - extLen - 0.012);
        attGroup.add(coupler, extTube, endCap);
      } else if (atts.magazine === 'fast_mag') {
        // Left-receiver tactical 6-shell side-saddle carrier with colored 12-gauge shells!
        const [sx, sy, sz] = mw.sideSaddlePos;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.034, 0.118), darkMetal);
        plate.position.set(sx, sy, sz);
        attGroup.add(plate);
        for (let i = 0; i < 6; i++) {
          const zShell = sz - 0.045 + i * 0.018;
          const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.042, 8), hullMat);
          hull.position.set(sx - 0.005, sy + 0.003, zShell);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.011, 8), brassMat);
          rim.position.set(sx - 0.005, sy + 0.026, zShell);
          attGroup.add(hull, rim);
        }
      } else if (atts.magazine === 'drum_mag') {
        // Receiver-bottom 12-gauge rotary drum positioned behind the pump stroke
        const [dx, dy, dz] = mw.drumPos;
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.036, 0.042), darkMetal);
        neck.position.set(dx, dy + 0.044, dz);
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.046, 16), skinMat);
        drum.rotation.x = Math.PI / 2;
        drum.position.set(dx, dy, dz);
        makeSkinned(drum, uvBounds);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.052, 10), gunmetal);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(dx, dy, dz);
        attGroup.add(neck, drum, hub);
      }

      if (ammoBandCol) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0142, 0.0142, 0.010, 10),
          new THREE.MeshBasicMaterial({ color: ammoBandCol })
        );
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, mw.tubeY, -0.455);
        attGroup.add(stripe);
      }
    } else if (mw) {
      const magParent = g.userData.magGroup || attGroup;
      if (atts.magazine === 'fast_mag') {
        // Snug tactical tape band + bottom Ranger pull loop aligned with magazine floorplate
        const pull = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0036, 6, 12), gripMat);
        pull.position.set(mw.x, mw.bottomY - 0.016, mw.bottomZ);
        pull.rotation.y = Math.PI / 2;
        const tape = new THREE.Mesh(
          new THREE.BoxGeometry(mw.width + 0.004, 0.018, mw.depth + 0.004),
          new THREE.MeshStandardMaterial({ color: 0x2a7fff, roughness: 0.72 })
        );
        tape.position.set(mw.x, mw.bottomY + 0.028, mw.bottomZ - Math.sin(mw.rotX) * 0.028);
        tape.rotation.x = mw.rotX;
        magParent.add(pull, tape);
      } else if (atts.magazine === 'extended_mag') {
        if (wpn.defaultMagMeshGroup) wpn.defaultMagMeshGroup.visible = false;
        if (mw.isAkCurve) {
          // Extended 45-round curved RPK banana mag (skin-mapped!)
          const extShape = new THREE.Shape();
          extShape.moveTo(-0.062, -0.004);
          extShape.lineTo(-0.122, -0.004);
          extShape.quadraticCurveTo(-0.145, -0.102, -0.205, -0.194);
          extShape.lineTo(-0.152, -0.214);
          extShape.quadraticCurveTo(-0.094, -0.108, -0.062, -0.004);
          extShape.closePath();
          const extMesh = makeSideExtrude(extShape, 0.026, 0.0022, skinMat, uvBounds);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.010, 0.060), darkMetal);
          plate.position.set(0, -0.206, -0.178);
          plate.rotation.x = -0.44;
          magParent.add(extMesh, plate);
        } else if (mw.isCantMag) {
          // Extended 45-round forward-cant Vector stick mag (skin-mapped!)
          const extStick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.215, 0.033), skinMat);
          extStick.position.set(0, -0.140, -0.142);
          extStick.rotation.x = mw.rotX;
          makeSkinned(extStick, uvBounds);
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.029, 0.014, 0.039), darkMetal);
          base.position.set(0, -0.246, -0.168);
          base.rotation.x = mw.rotX;
          magParent.add(extStick, base);
        } else if (mw.isPistolMag) {
          // Extended pistol stick magazine matching exact grip angle!
          const extLen = 0.125;
          const dy = -0.026;
          const extMag = new THREE.Mesh(new THREE.BoxGeometry(mw.width, extLen, mw.depth), skinMat);
          extMag.position.set(mw.x, mw.y + dy, mw.z + Math.sin(mw.rotX) * 0.030);
          extMag.rotation.x = mw.rotX;
          makeSkinned(extMag, uvBounds);
          const bumper = new THREE.Mesh(new THREE.BoxGeometry(mw.width + 0.005, 0.014, mw.depth + 0.006), darkMetal);
          bumper.position.set(mw.x, mw.y + dy - extLen * 0.5, mw.z + Math.sin(mw.rotX) * (0.030 + extLen * 0.5));
          bumper.rotation.x = mw.rotX;
          magParent.add(extMag, bumper);
        } else {
          // Extended .338 Lapua box magazine for AWP
          const extBox = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.118, 0.074), skinMat);
          extBox.position.set(mw.x, -0.070, mw.z);
          makeSkinned(extBox, uvBounds);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.080), darkMetal);
          plate.position.set(mw.x, -0.130, mw.z);
          magParent.add(extBox, plate);
        }
      } else if (atts.magazine === 'drum_mag') {
        if (wpn.defaultMagMeshGroup) wpn.defaultMagMeshGroup.visible = false;
        const drumRad = mw.isPistolMag ? 0.044 : 0.056;
        const drumY = mw.isPistolMag ? mw.bottomY - 0.044 : mw.y - 0.082;
        const drumZ = mw.isPistolMag ? mw.bottomZ + 0.008 : mw.z - (mw.isCantMag ? 0.018 : 0.004);
        const towerH = Math.abs(mw.y - drumY);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(mw.width, towerH, mw.depth), darkMetal);
        tower.position.set(mw.x, (mw.y + drumY) * 0.5, (mw.z + drumZ) * 0.5);
        tower.rotation.x = mw.rotX * 0.5;
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(drumRad, drumRad, 0.044, 16), skinMat);
        drum.rotation.x = Math.PI / 2;
        drum.position.set(mw.x, drumY, drumZ);
        makeSkinned(drum, uvBounds);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(drumRad * 0.38, drumRad * 0.38, 0.050, 10), gunmetal);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(mw.x, drumY, drumZ);
        magParent.add(tower, drum, hub);
      }

      if (ammoBandCol) {
        const bandY = mw.isPistolMag ? mw.bottomY + 0.006 : (mw.isAkCurve ? -0.055 : mw.y - 0.032);
        const bandZ = mw.isPistolMag ? mw.bottomZ - 0.002 : (mw.isAkCurve ? -0.106 : mw.z - Math.sin(mw.rotX) * 0.012);
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(mw.width + 0.005, 0.008, mw.depth + 0.005),
          new THREE.MeshBasicMaterial({ color: ammoBandCol })
        );
        band.position.set(mw.x, bandY, bandZ);
        band.rotation.x = mw.isAkCurve ? -0.22 : mw.rotX;
        magParent.add(band);
      }
    }

    // 6) Contoured Rear Grip replacement (tactical matte/rubber/granulated — hides default grip so zero clipping!)
    if (atts.rearGrip && wpn.gripSpec) {
      if (wpn.defaultGripGroup) wpn.defaultGripGroup.visible = false;
      const gs = wpn.gripSpec;
      const gMat = atts.rearGrip === 'stippled_grip'
        ? new THREE.MeshStandardMaterial({ color: 0x202730, roughness: 0.96, metalness: 0.05 })
        : atts.rearGrip === 'rubberized_grip'
          ? new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.72, metalness: 0.14 })
          : new THREE.MeshStandardMaterial({ color: 0x303b48, roughness: 0.90, metalness: 0.12 });

      if (gs.shape) {
        const customGrip = makeSideExtrude(gs.shape, gs.thickness, 0.0028, gMat, null);
        attGroup.add(customGrip);
        if (atts.rearGrip === 'rubberized_grip') {
          // Subtle molded palm-swell & tactical grip bands
          const bb = new THREE.Box3().setFromObject(customGrip);
          const cy = (bb.min.y + bb.max.y) * 0.5;
          const cz = (bb.min.z + bb.max.z) * 0.5;
          for (const dy of [-0.018, 0, 0.018]) {
            const band = new THREE.Mesh(new THREE.BoxGeometry(gs.thickness + 0.005, 0.006, 0.036), darkMetal);
            band.position.set(0, cy + dy, cz + dy * -0.18);
            attGroup.add(band);
          }
        }
      } else if (gs.isPanel) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(gs.size[0], gs.size[1], gs.size[2]), gMat);
        panel.position.set(gs.pos[0], gs.pos[1], gs.pos[2]);
        panel.rotation.x = gs.rotX;
        attGroup.add(panel);
      }
    }

    // 7) Flush Stock replacement (hides default stock, mounts solid trunnion plate, skins main stock bodies!)
    if (atts.stock && wpn.stockMount) {
      if (wpn.defaultStockGroup) wpn.defaultStockGroup.visible = false;
      const sm = wpn.stockMount;
      const sx = sm.x, sy = sm.y, sz = sm.z;

      // Solid machined receiver trunnion adapter plate flush at receiver rear face
      const adapter = new THREE.Mesh(new THREE.BoxGeometry(sm.faceW, sm.faceH, 0.014), darkMetal);
      adapter.position.set(sx, sy, sz + 0.004);
      attGroup.add(adapter);

      if (atts.stock === 'no_stock') {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.018, 10), gunmetal);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(sx, sy + 0.004, sz + 0.014);
        const sling = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 6, 10), brightSteel);
        sling.position.set(sx, sy + 0.002, sz + 0.026);
        attGroup.add(cap, sling);
      } else if (atts.stock === 'skeleton_stock') {
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.018), gunmetal);
        hinge.position.set(sx, sy, sz + 0.016);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.195), skinMat);
        topBar.position.set(sx, sy + 0.016, sz + 0.112);
        makeSkinned(topBar, uvBounds);
        const lowStrut = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.011, 0.192), skinMat);
        lowStrut.position.set(sx, sy - 0.022, sz + 0.110);
        lowStrut.rotation.x = 0.17;
        makeSkinned(lowStrut, uvBounds);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.088, 0.018), gripMat);
        pad.position.set(sx, sy - 0.012, sz + 0.214);
        attGroup.add(hinge, topBar, lowStrut, pad);
      } else if (atts.stock === 'heavy_stock') {
        const hShape = new THREE.Shape();
        hShape.moveTo(sz + 0.004, sy + sm.faceH * 0.48);
        hShape.lineTo(sz + 0.215, sy + 0.022);
        hShape.lineTo(sz + 0.220, sy - 0.068);
        hShape.lineTo(sz + 0.145, sy - 0.056);
        hShape.lineTo(sz + 0.004, sy - sm.faceH * 0.44);
        hShape.closePath();
        const heavyBody = makeSideExtrude(hShape, 0.034, 0.003, skinMat, uvBounds);
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.118), gripMat);
        cheek.position.set(sx, sy + 0.034, sz + 0.105);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.098, 0.020), gripMat);
        pad.position.set(sx, sy - 0.022, sz + 0.228);
        attGroup.add(heavyBody, cheek, pad);
      }
    }

    // 8) APEX Kit: Side-rail Chrono Gyro Stabilizer / Phase Anchor (mounts flush to left receiver flank!)
    if (atts.apex && wpn.apexMount) {
      const am = wpn.apexMount;
      const isPhase = atts.apex === 'chrono_overclock';
      const glowHex = isPhase ? 0xffb020 : 0x38e8ff;
      const apexGrp = new THREE.Group();
      apexGrp.position.set(am.x, am.y, am.z);
      apexGrp.scale.setScalar(am.scale || 1.0);

      // Flush Picatinny side-clamp seated 2.5mm into receiver wall (zero air gap!)
      const clampBlock = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.018, 0.056), darkMetal);
      clampBlock.position.set(0.001, 0, 0);
      apexGrp.add(clampBlock);

      // Machined CNC Chrono Gyro housing
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.025, 0.068), gunmetal);
      chassis.position.set(-0.009, 0, 0);
      apexGrp.add(chassis);

      // Skin-matched top accent cap on the Apex housing
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.054), skinMat);
      topCap.position.set(-0.009, 0.0135, 0);
      makeSkinned(topCap, uvBounds);
      apexGrp.add(topCap);

      // Precision recessed gyro chamber bezel facing camera (-X)
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0114, 0.005, 16), darkMetal);
      bezel.rotation.z = Math.PI / 2;
      bezel.position.set(-0.016, 0, 0);
      apexGrp.add(bezel);

      // Glowing dual-ring precision temporal gyroscope + energy core
      const ringMat = new THREE.MeshStandardMaterial({
        color: glowHex,
        emissive: glowHex,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.7
      });
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.0086, 0.0013, 8, 20), ringMat);
      outerRing.rotation.y = Math.PI / 2;
      outerRing.position.set(-0.0185, 0, 0);
      apexGrp.add(outerRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.0052, 0.0011, 8, 16), ringMat);
      innerRing.position.set(-0.0185, 0, 0);
      apexGrp.add(innerRing);

      const coreMat = new THREE.MeshBasicMaterial({ color: glowHex });
      const coreOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.0026, 0), coreMat);
      coreOrb.position.set(-0.0185, 0, 0);
      apexGrp.add(coreOrb);

      // Twin status indicator pips fore & aft
      for (const dz of [-0.024, 0.024]) {
        const pip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.0036, 0.007), coreMat);
        pip.position.set(-0.0162, 0.004, dz);
        apexGrp.add(pip);
      }

      if (isPhase) {
        // Phase Anchor extra heat-sink cooling fins on fore/aft collar
        for (const dz of [-0.018, 0.018]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.029, 0.004), brightSteel);
          fin.position.set(-0.0095, 0, dz);
          apexGrp.add(fin);
        }
      }

      const targetParent = am.parent || g;
      targetParent.add(apexGrp);
      g.userData.chronoGyro = {
        group: apexGrp,
        outerRing,
        innerRing,
        coreOrb,
        ringMat,
        tier: isPhase ? 2 : 1
      };
    }

    g.userData.opticEyePoint = opticEyePoint;
    g.userData.opticEyeY = opticEyePoint.y;
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
    revolver: {
      gripCenter: [0.0, -0.047, 0.044],
      rightPocket: [0.003, -0.027, -0.035],
      supportAnchor: [-0.014, -0.030, -0.012],
      leftPocket: [0.0, -0.027, -0.035],
      leftRelEuler: [0.06, -0.34, 1.48],
      rightPose: { index: 0.42, middle: 0.92, ring: 0.95, pinky: 0.95, thumb: 0.62, indexRingHook: 0, indexPoint: 0 },
      leftPose: { index: 0.72, middle: 0.82, ring: 0.86, pinky: 0.86, thumb: 0.40, indexRingHook: 0, indexPoint: 0 }
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
      leftUseRawReload: false,
      leftAnchorOffX: 0, leftAnchorOffY: 0, leftAnchorOffZ: 0,
      leftRelOffX: 0, leftRelOffY: 0, leftRelOffZ: 0,
      leftFreeX: -0.24, leftFreeY: -0.28, leftFreeZ: -0.34,
      leftFreeRotX: 0.18, leftFreeRotY: -0.42, leftFreeRotZ: 0.24,
      boltLift: 0, boltPull: 0,
      pumpPull: 0,
      lifterPush: 0,
      showReloadShells: false,
      revolverOpen: 0, revolverEject: 0, revolverSpin: 0,
      slideBack: 0, hammerBack: 0,
      magDropY: 0, magTiltX: 0,
      rPose: { index: 0.44, middle: 0.90, ring: 0.93, pinky: 0.94, thumb: 0.68, indexRingHook: 0, indexPoint: 0 },
      lPose: { index: 0.68, middle: 0.74, ring: 0.78, pinky: 0.76, thumb: 0.36, indexRingHook: 0, indexPoint: 0 }
    };
  }

  function weaponInspectDuration(wt, tier) {
    if (wt === 'revolver') return tier === 'uncommon' ? 3.05 : 2.70;
    if (wt === 'deagle') return tier === 'uncommon' ? 2.55 : 2.15;
    if (wt === 'awp') return tier === 'uncommon' ? 2.70 : 2.55;
    return tier === 'uncommon' ? 2.65 : 2.35;
  }

  // Exact inverse-compensated right-hand shift for AWP right-side bolt cycling so rifle stays braced in left hand
  function applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull) {
    if (handOff <= 0.0001 && boltLift <= 0.0001 && boltPull <= 0.0001) return;
    const dx = handOff * 0.048 + boltLift * 0.008;
    const dy = handOff * 0.082 + boltLift * 0.016;
    const dz = -handOff * 0.018 + boltPull * 0.056;
    const cosC = Math.cos(-RIGHT_HAND_GRIP_ROLL);
    const sinC = Math.sin(-RIGHT_HAND_GRIP_ROLL);

    out.rx += dx;
    out.ry += dy;
    out.rz += dz;
    // Counter-translate weapon inside rightHandPivot so the AWP stays steady in the left support hand
    out.wPosX -= (dx * cosC - dy * sinC);
    out.wPosY -= (dx * sinC + dy * cosC);
    out.wPosZ -= dz;
    // Subtle physical bolt-impulse roll & right-hand bolt-knob pinch
    out.rRotZ -= boltPull * 0.07;
    out.boltLift = Math.max(out.boltLift, boltLift);
    out.boltPull = Math.max(out.boltPull, boltPull * 0.058);

    out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.74, handOff);
    out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.56, handOff);
    out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.42, handOff);
    out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.36, handOff);
    out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.76, handOff);
  }

  // Exact inverse-compensated right-hand shift for V-47 right-side AK charging handle rack
  // so the left hand braces the handguard steadily and NEVER reaches through the receiver!
  function applyV47RightHandRack(out, spec, handOff, rackPull) {
    if (handOff <= 0.0001 && rackPull <= 0.0001) return;
    const dx = handOff * 0.044;
    const dy = handOff * 0.072;
    const dz = -handOff * 0.062 + rackPull * 0.058;
    const cosC = Math.cos(-RIGHT_HAND_GRIP_ROLL);
    const sinC = Math.sin(-RIGHT_HAND_GRIP_ROLL);

    out.rx += dx;
    out.ry += dy;
    out.rz += dz;
    // Counter-translate V-47 inside rightHandPivot so the rifle stays braced steady in the left hand
    out.wPosX -= (dx * cosC - dy * sinC);
    out.wPosY -= (dx * sinC + dy * cosC);
    out.wPosZ -= dz;
    out.rRotZ -= rackPull * 0.06;
    out.boltPull = Math.max(out.boltPull, rackPull * 0.058);

    // Hooked index/middle fingers pulling the upturned AK charging handle straight back
    out.rPose.index = THREE.MathUtils.lerp(spec.rightPose.index, 0.84, handOff);
    out.rPose.middle = THREE.MathUtils.lerp(spec.rightPose.middle, 0.68, handOff);
    out.rPose.ring = THREE.MathUtils.lerp(spec.rightPose.ring, 0.48, handOff);
    out.rPose.pinky = THREE.MathUtils.lerp(spec.rightPose.pinky, 0.40, handOff);
    out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.62, handOff);
  }

  // Authentic real-world firearm reloads, hand-racking, M870 twin-shell bottom loading, and AWP bolt cycling
  function evaluateWeaponReloadAndAction(wt, state, out, playAudio) {
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    out.leftUseRawReload = false;
    out.pumpPull = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;

    // 1) Post-shot mechanical actions (AWP right-hand bolt cycle & M870 left-hand pump rack)
    if (state.boltT < 1 && state.reloadT >= 1) {
      const bt = state.boltT;
      if (wt === 'awp') {
        const handOff = smoothstep(0.05, 0.20, bt) * (1 - smoothstep(0.78, 0.96, bt));
        const boltLift = smoothstep(0.14, 0.28, bt) * (1 - smoothstep(0.70, 0.84, bt));
        const boltPull = smoothstep(0.28, 0.48, bt) * (1 - smoothstep(0.54, 0.72, bt));
        applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);
        if (playAudio && bt > 0.24 && !(state.boltCueMask & 1)) {
          state.boltCueMask |= 1;
          WeaponAudio.boltRack();
        }
      } else if (wt === 'shotgun') {
        const pumpArc = bell(bt, 0.12, 0.88);
        out.pumpPull = pumpArc * 0.086;
        out.rRotX += pumpArc * 0.05;
        out.rRotZ -= pumpArc * 0.06;
        if (playAudio && bt > 0.18 && !(state.boltCueMask & 1)) {
          state.boltCueMask |= 1;
          WeaponAudio.pumpRack();
        }
      }
    }

    // 2) Full reload choreography (per-firearm authentic reload + real-world side racking!)
    if (state.reloadT >= 1) return;
    const t = state.reloadT;
    out.leftUseRawReload = true;

    if (wt === 'revolver') {
      const open = smoothstep(0.06, 0.24, t) * (1 - smoothstep(0.82, 0.98, t));
      const eject = smoothstep(0.28, 0.42, t) * (1 - smoothstep(0.48, 0.60, t));
      const insert = smoothstep(0.62, 0.74, t) * (1 - smoothstep(0.82, 0.94, t));
      out.revolverOpen = open; out.revolverEject = eject;
      out.revolverSpin = t > 0.28 && t < 0.62 ? -eject * 1.5 : insert * 0.35;
      out.leftLock = 1 - smoothstep(0.05, 0.20, t) * (1 - smoothstep(0.78, 0.96, t));
      out.leftFreeX = -0.22; out.leftFreeY = -0.34; out.leftFreeZ = -0.31;
      out.leftFreeRotX = 0.28; out.leftFreeRotY = -0.38; out.leftFreeRotZ = 0.30;
      out.leftAnchorOffX += -open * 0.035 + insert * 0.012;
      out.leftAnchorOffY += -open * 0.055 - eject * 0.025 - insert * 0.040;
      out.leftAnchorOffZ += open * 0.030 + insert * 0.018;
      out.leftRelOffX += -open * 0.28 + insert * 0.18;
      out.leftRelOffY += open * 0.20 + insert * 0.16;
      out.leftRelOffZ += -open * 0.30 + insert * 0.22;
      out.rRotZ += open * 0.16;
      if (playAudio) {
        if (t > 0.24 && !(state.reloadCueMask & 1)) { state.reloadCueMask |= 1; WeaponAudio.boltRack(); }
        if (t > 0.64 && !(state.reloadCueMask & 2)) { state.reloadCueMask |= 2; WeaponAudio.magInsert(); }
        if (t > 0.90 && !(state.reloadCueMask & 4)) { state.reloadCueMask |= 4; WeaponAudio.boltRack(); }
      }
      return;
    }

    if (wt === 'shotgun') {
      // M870 FAST TWIN-SHELL BOTTOM LOADING (quad-load style) + FINAL PUMP RACK — never drops a mag!
      const cantEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.70, 0.82, t));
      out.rx -= cantEnv * 0.044;
      out.ry += cantEnv * 0.032;
      out.rz += cantEnv * 0.014;
      out.rRotX += cantEnv * 0.22;
      out.rRotY -= cantEnv * 0.20;
      out.rRotZ += cantEnv * 0.72; // Cants shotgun counter-clockwise to expose bottom loading gate!

      // Left hand leaves pump -> grabs twin shells -> pushes pair 1 into bottom gate -> dips -> pushes pair 2 -> returns to pump
      const offPump = smoothstep(0.04, 0.15, t) * (1 - smoothstep(0.68, 0.78, t));
      // Pair 1 insertion sweep (0.16..0.41) & Pair 2 insertion sweep (0.43..0.68)
      const sweep1 = bell(t, 0.17, 0.40);
      const sweep2 = bell(t, 0.44, 0.67);
      const pushPeak = Math.max(sweep1, sweep2);
      const dipBetween = bell(t, 0.36, 0.48);

      // Anchor in weapon-local space relative to shotgun pump supportAnchor [0, -0.018, -0.295]:
      // Bottom loading gate sits at [0, -0.014, -0.062] => deltaZ = +0.233, deltaY = -0.025 (approaching from below)
      const gateOffX = -0.010;
      const gateOffY = -0.095 + pushPeak * 0.072 - dipBetween * 0.045;
      const gateOffZ = 0.232;

      out.leftAnchorOffX += offPump * gateOffX;
      out.leftAnchorOffY += offPump * gateOffY;
      out.leftAnchorOffZ += offPump * gateOffZ;
      out.leftRelOffX += offPump * (-0.34 + pushPeak * 0.18);
      out.leftRelOffY += offPump * 0.28;
      out.leftRelOffZ += offPump * -0.42;

      // Visible twin 12-gauge shells held in left hand during insertion sweeps
      out.showReloadShells = t > 0.15 && t < 0.66;
      out.lifterPush = pushPeak * 0.008;

      // Cupped fingers holding twin shells with thumb pushing upward into loading gate
      out.lPose.index = THREE.MathUtils.lerp(spec.leftPose.index, 0.46, offPump);
      out.lPose.middle = THREE.MathUtils.lerp(spec.leftPose.middle, 0.54, offPump);
      out.lPose.ring = THREE.MathUtils.lerp(spec.leftPose.ring, 0.62, offPump);
      out.lPose.pinky = THREE.MathUtils.lerp(spec.leftPose.pinky, 0.68, offPump);
      out.lPose.thumb = THREE.MathUtils.lerp(spec.leftPose.thumb, 0.72, offPump);

      // Final crisp pump rack once left hand locks back onto forend (0.78..0.96)
      const rackArc = bell(t, 0.78, 0.96);
      out.pumpPull = rackArc * 0.088;
      out.rRotX += rackArc * 0.06;
      out.rRotZ -= rackArc * 0.08;

      if (playAudio) {
        if (t > 0.27 && !(state.reloadCueMask & 1)) {
          state.reloadCueMask |= 1;
          WeaponAudio.shellInsert();
        }
        if (t > 0.54 && !(state.reloadCueMask & 2)) {
          state.reloadCueMask |= 2;
          WeaponAudio.shellInsert();
        }
        if (t > 0.79 && !(state.reloadCueMask & 4)) {
          state.reloadCueMask |= 4;
          WeaponAudio.pumpRack();
        }
      }
      return;
    }

    if (wt === 'awp') {
      // AWP: Drop/insert .338 box mag (0.0..0.64) -> Right hand cycles right-side bolt (0.68..0.97)
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.68, t));
      const magPull = bell(t, 0.12, 0.58);
      out.ry -= magEnv * 0.045;
      out.rRotX -= magEnv * 0.20;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.30;

      // Left hand reaches from forend (z=-0.28) to magwell (z=-0.072 => dz=+0.208)
      out.leftAnchorOffY += magEnv * (-0.065 - magPull * 0.095);
      out.leftAnchorOffZ += magEnv * 0.205;
      out.leftRelOffX -= magEnv * 0.28;
      out.leftRelOffY += magEnv * 0.18;
      out.leftRelOffZ -= magEnv * 0.30;
      out.magDropY = -magPull * 0.115;
      out.magTiltX = -magPull * 0.10;

      // Right-hand bolt cycle on reload finish (0.68..0.97)
      const handOff = smoothstep(0.68, 0.76, t) * (1 - smoothstep(0.90, 0.98, t));
      const boltLift = smoothstep(0.72, 0.79, t) * (1 - smoothstep(0.88, 0.94, t));
      const boltPull = smoothstep(0.78, 0.85, t) * (1 - smoothstep(0.86, 0.92, t));
      applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    if (wt === 'rifle') {
      // V-47 AK-47: Left hand rocks out/in curved banana mag (0.0..0.60), returns to brace handguard,
      // then RIGHT firing hand cleanly racks the right-side (+X) AK charging handle (0.68..0.97) — zero clipping!
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.54, 0.65, t));
      const magPull = bell(t, 0.12, 0.55);

      out.ry -= magEnv * 0.048;
      out.rRotX -= magEnv * 0.22;
      out.rRotY -= magEnv * 0.18;
      out.rRotZ += magEnv * 0.34;

      // Left hand ONLY reaches straight down to the curved mag (stays cleanly on -X/center underside!)
      out.leftAnchorOffX += -magEnv * 0.008;
      out.leftAnchorOffY += magEnv * (-0.075 - magPull * 0.085);
      out.leftAnchorOffZ += magEnv * 0.138;
      out.leftRelOffX -= magEnv * 0.24;
      out.leftRelOffY += magEnv * 0.16;
      out.leftRelOffZ -= magEnv * 0.32;

      out.magDropY = -magPull * 0.108;
      out.magTiltX = -magPull * 0.34;

      // Right hand lifts off pistol grip on the +X side to rack the right-side charging handle
      const handOff = smoothstep(0.67, 0.76, t) * (1 - smoothstep(0.89, 0.98, t));
      const rackPull = bell(t, 0.74, 0.91);
      applyV47RightHandRack(out, spec, handOff, rackPull);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    if (wt === 'smg') {
      // VX-9 Vector: Swap forward-cant stick mag (0.0..0.64) -> Left hand racks left-side (-X) folding charging handle (0.66..0.96)
      const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.66, t));
      const magPull = bell(t, 0.12, 0.56);
      const rackEnv = smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t));
      const rackPull = bell(t, 0.73, 0.90);

      out.ry -= magEnv * 0.045 - rackEnv * 0.015;
      out.rRotX -= magEnv * 0.20 - rackEnv * 0.08;
      out.rRotY -= magEnv * 0.16 - rackEnv * 0.16;
      out.rRotZ += magEnv * 0.28 + rackEnv * 0.26; // Cant slightly right to present left-side Vector charging handle!

      // Mag reach (from z=-0.175 to -0.135) + left-side charging handle (-0.025, 0.026, -0.165)
      out.leftAnchorOffX += -rackEnv * 0.036;
      out.leftAnchorOffY += magEnv * (-0.072 - magPull * 0.088) + rackEnv * 0.054;
      out.leftAnchorOffZ += magEnv * 0.042 + rackEnv * (0.012 + rackPull * 0.048);
      out.leftRelOffX += -magEnv * 0.22 + rackEnv * 0.16;
      out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.18;
      out.leftRelOffZ += -magEnv * 0.28 + rackEnv * 0.24;

      out.magDropY = -magPull * 0.112;
      out.magTiltX = magPull * 0.14;
      out.boltPull = Math.max(out.boltPull, rackPull * 0.048);

      if (playAudio && t > 0.74 && !(state.reloadCueMask & 1)) {
        state.reloadCueMask |= 1;
        WeaponAudio.boltRack();
      }
      return;
    }

    // DEAGLE & USP-9 PISTOLS: Swap grip magazine (0.0..0.64) -> Left hand overhand slide rack (0.66..0.96)
    const magEnv = smoothstep(0.0, 0.14, t) * (1 - smoothstep(0.56, 0.66, t));
    const magPull = bell(t, 0.12, 0.56);
    const rackEnv = smoothstep(0.66, 0.74, t) * (1 - smoothstep(0.88, 0.98, t));
    const rackPull = bell(t, 0.73, 0.90);

    out.ry -= magEnv * 0.040 - rackEnv * 0.022;
    out.rRotX -= magEnv * 0.16 - rackEnv * 0.10;
    out.rRotY -= magEnv * 0.14 - rackEnv * 0.24;
    out.rRotZ += magEnv * 0.34 + rackEnv * 0.28;

    // Left hand drops to magazine baseplate, then hugs left side of rear slide serrations to rack back cleanly!
    out.leftAnchorOffX += -rackEnv * 0.022;
    out.leftAnchorOffY += magEnv * (-0.068 - magPull * 0.072) + rackEnv * 0.094;
    out.leftAnchorOffZ += magEnv * 0.022 + rackEnv * (-0.008 + rackPull * 0.038);
    out.leftRelOffX += -magEnv * 0.24 + rackEnv * 0.22;
    out.leftRelOffY += magEnv * 0.14 + rackEnv * 0.26;
    out.leftRelOffZ += -magEnv * 0.26 - rackEnv * 0.56;

    out.magDropY = -magPull * 0.098;
    out.magTiltX = -magPull * 0.10;
    out.slideBack = Math.max(out.slideBack, rackPull * 0.038);

    if (playAudio && t > 0.73 && !(state.reloadCueMask & 1)) {
      state.reloadCueMask |= 1;
      WeaponAudio.boltRack();
    }
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
    out.leftUseRawReload = false;
    out.leftAnchorOffX = 0; out.leftAnchorOffY = 0; out.leftAnchorOffZ = 0;
    out.leftRelOffX = 0; out.leftRelOffY = 0; out.leftRelOffZ = 0;
    out.leftFreeX = -0.24; out.leftFreeY = -0.29; out.leftFreeZ = -0.34;
    out.leftFreeRotX = 0.22; out.leftFreeRotY = -0.42; out.leftFreeRotZ = 0.28;
    out.boltLift = 0; out.boltPull = 0;
    out.pumpPull = 0;
    out.lifterPush = 0;
    out.showReloadShells = false;
    out.revolverOpen = 0; out.revolverEject = 0; out.revolverSpin = 0;
    out.slideBack = 0; out.hammerBack = 0;
    out.magDropY = 0; out.magTiltX = 0;

    Object.assign(out.rPose, spec.rightPose);
    Object.assign(out.lPose, spec.leftPose);

    const t = state.inspectT;
    if (t >= 1) return;

    const isRare = state.inspectTier === 'uncommon' || state.inspectTier === 'mythic';

    if (wt === 'revolver') {
      const env = bell(t, 0.0, 1.0);
      const open = smoothstep(0.10, 0.28, t) * (1 - smoothstep(0.70, 0.86, t));
      const spin = smoothstep(0.18, 0.72, t);
      out.leftLock = 1 - smoothstep(0.08, 0.22, t) * (1 - smoothstep(0.78, 0.94, t));
      out.leftFreeX = -0.24; out.leftFreeY = -0.34; out.leftFreeZ = -0.32;
      out.leftFreeRotX = 0.25; out.leftFreeRotY = -0.38; out.leftFreeRotZ = 0.30;
      out.rx = -0.040 * env; out.ry = 0.035 * env; out.rz = 0.018 * env;
      out.rRotX = 0.12 * env; out.rRotY = 0.22 * env; out.rRotZ = 0.12 * env;
      out.revolverOpen = open * 0.85;
      out.revolverSpin = spin * Math.PI * (state.inspectTier === 'uncommon' || state.inspectTier === 'mythic' ? 8 : 4);
      out.leftAnchorOffX += -open * 0.025; out.leftAnchorOffY += -open * 0.025;
      out.leftRelOffZ += -open * 0.20;
      out.rPose.thumb = THREE.MathUtils.lerp(spec.rightPose.thumb, 0.30, open);
      if (playAudio) {
        if (t > 0.28 && !(state.inspectCueMask & 1)) { state.inspectCueMask |= 1; CaseAudio.spinWhoosh(0.92); }
        if (t > 0.52 && !(state.inspectCueMask & 2)) { state.inspectCueMask |= 2; WeaponAudio.boltRack(); }
        if (t > 0.82 && !(state.inspectCueMask & 4)) { state.inspectCueMask |= 4; CaseAudio.balisongClack(0.82); }
      }
      return;
    }

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

        const spinPhase = smoothstep(0.14, 0.80, t);
        const openGrip = smoothstep(0.06, 0.18, t) * (1 - smoothstep(0.76, 0.86, t));
        const catchBounce = bell(t, 0.78, 0.94);

        out.rx = -0.055 * env;
        out.ry = 0.052 * env + catchBounce * 0.016;
        out.rz = 0.025 * env;
        out.rRotX = 0.16 * env - catchBounce * 0.14;
        out.rRotY = 0.44 * env;
        out.rRotZ = 0.18 * env - Math.sin(spinPhase * Math.PI * 2) * 0.14;

        const totalSpins = Math.PI * 4 + (state.spinBonus || 0);
        out.spinAngle = -spinPhase * totalSpins;

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
        // CS2 NORMAL PISTOL INSPECT: Left hand drops away -> 1-handed Play-Side admire -> Back-Side twist -> snap back
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
        const handOff = smoothstep(0.16, 0.28, t) * (1 - smoothstep(0.74, 0.86, t));
        const boltLift = smoothstep(0.20, 0.34, t) * (1 - smoothstep(0.68, 0.80, t));
        const boltPull = smoothstep(0.32, 0.48, t) * (1 - smoothstep(0.56, 0.70, t));

        out.rx = -0.045 * env;
        out.ry = 0.032 * env;
        out.rz = 0.015 * env;
        out.rRotX = 0.14 * holdTilt;
        out.rRotY = 0.52 * holdTilt;
        out.rRotZ = -0.34 * holdTilt - boltLift * 0.08;

        applyAwpRightHandBoltCycle(out, spec, handOff, boltLift, boltPull);

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
    } else if (wt === 'shotgun') {
      // M870 SHOTGUN INSPECT: Play-side receiver & barrel showcase -> chamber peek pump half-check!
      const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
      const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
      const env = bell(t, 0.0, 1.0);

      out.rx = -0.054 * env;
      out.ry = 0.036 * env;
      out.rz = 0.018 * env;
      out.rRotX = 0.12 * playSide + 0.09 * rightSide;
      out.rRotY = 0.76 * playSide - 0.42 * rightSide;
      out.rRotZ = 0.34 * playSide - 0.56 * rightSide;
      if (isRare) {
        const checkPump = bell(t, 0.54, 0.80);
        out.pumpPull = checkPump * 0.054;
        if (playAudio && t > 0.56 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          WeaponAudio.pumpRack();
        }
      }
    } else if (wt === 'smg') {
      // VX-9 VECTOR INSPECT: Play-side display -> left-side charging handle check on rare!
      const playSide = smoothstep(0.0, 0.22, t) * (1 - smoothstep(0.46, 0.62, t));
      const rightSide = smoothstep(0.48, 0.66, t) * (1 - smoothstep(0.82, 1.0, t));
      const env = bell(t, 0.0, 1.0);

      out.rx = -0.052 * env;
      out.ry = 0.034 * env;
      out.rz = 0.020 * env;
      out.rRotX = 0.12 * playSide + 0.08 * rightSide;
      out.rRotY = 0.76 * playSide - 0.44 * rightSide;
      out.rRotZ = 0.36 * playSide - 0.54 * rightSide;
      if (isRare) {
        const boltPeek = bell(t, 0.22, 0.46);
        out.leftAnchorOffX = -boltPeek * 0.030;
        out.leftAnchorOffY = boltPeek * 0.050;
        out.leftAnchorOffZ = boltPeek * 0.044;
        out.boltPull = boltPeek * 0.042;
        if (playAudio && t > 0.26 && !(state.inspectCueMask & 1)) {
          state.inspectCueMask |= 1;
          WeaponAudio.boltRack();
        }
      }
    } else {
      // V-47 RIFLE (AK-47)
      if (isRare) {
        // CS2 RARE V-47 MAG-CHECK & RIGHT-SIDE CHARGING-HANDLE PEEK
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
    const rawMode = Boolean(wOut && wOut.leftUseRawReload);
    const boltPull = (wOut ? wOut.boltPull : 0) + (wt === 'awp' ? (wOut && wOut.boltPull > 0 ? 0 : boltCycleArc * 0.056) : slideKick * 0.048);
    const boltLift = (wOut ? wOut.boltLift : 0) + (wt === 'awp' ? (wOut && wOut.boltLift > 0 ? 0 : boltCycleArc) : 0);

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
    if (wt === 'revolver' && mesh.userData.revolverCylinderPivot) {
      mesh.userData.revolverCylinderPivot.rotation.z = (wOut ? wOut.revolverOpen : 0) * 0.92;
      if (mesh.userData.revolverCylinderGroup) mesh.userData.revolverCylinderGroup.rotation.x = wOut ? wOut.revolverSpin : 0;
      if (mesh.userData.revolverShellGroup) mesh.userData.revolverShellGroup.visible = !(wOut && wOut.revolverEject > 0.45);
    }
    if (mesh.userData.pumpGroup) {
      const pumpZ = wt === 'shotgun'
        ? Math.max(wOut ? wOut.pumpPull : 0, (!rawMode && boltCycleArc > 0 ? boltCycleArc * 0.086 : 0))
        : 0;
      mesh.userData.pumpGroup.position.z = pumpZ;
      if (mesh.userData.breechBoltMesh && Number.isFinite(mesh.userData.breechBoltRestZ)) {
        mesh.userData.breechBoltMesh.position.z = mesh.userData.breechBoltRestZ + pumpZ * 0.72;
      }
    }
    if (mesh.userData.loadGateLifter) {
      mesh.userData.loadGateLifter.position.y = -0.012 + (wOut ? wOut.lifterPush : 0);
    }
    if (mesh.userData.magGroup) {
      let dropY = wOut ? wOut.magDropY : 0;
      let tiltX = wOut ? wOut.magTiltX : 0;
      if (!rawMode && reloadArc > 0.15) {
        const relDrop = Math.sin(Math.min(1, (reloadArc - 0.15) / 0.85) * Math.PI);
        dropY -= relDrop * 0.105;
        tiltX -= relDrop * (wt === 'rifle' ? 0.34 : 0.12);
      }
      mesh.userData.magGroup.position.y = dropY;
      mesh.userData.magGroup.rotation.x = tiltX;
    }
  }

  /**
   * Solves exact left-hand position & orientation in rig.rootRig space, smoothly blending
   * between locked forend/foregrip/pump grip (leftLock = 1) and free counterbalance posture (leftLock = 0).
   */
  function lockSupportHandToWeapon(rigObj, weaponMesh, wt, reloadArc, wOut) {
    if (!rigObj || !weaponMesh) return;
    const spec = WEAPON_GRIP_SPECS[wt] || WEAPON_GRIP_SPECS.rifle;
    const lockW = wOut ? wOut.leftLock : 1;
    const rawReload = Boolean(wOut && wOut.leftUseRawReload);
    const legacyRel = rawReload ? 0 : reloadArc;

    rigObj.rootRig.updateMatrixWorld(true);
    _wInvRootMat.copy(rigObj.rootRig.matrixWorld).invert();
    rigObj.rootRig.getWorldQuaternion(_wRootQuat);
    _wInvRootQuat.copy(_wRootQuat).invert();

    const baseAnchor = weaponMesh.userData.supportAnchorOverride || spec.supportAnchor;
    // On M870 shotgun, slide left hand 1:1 with the reciprocating pump forend (and any pump-mounted foregrip!)
    const pumpZ = wt === 'shotgun' && weaponMesh.userData.pumpGroup
      ? weaponMesh.userData.pumpGroup.position.z
      : 0;

    _wAnchorLocal.set(
      baseAnchor[0] + (wOut ? wOut.leftAnchorOffX : 0),
      baseAnchor[1] - legacyRel * 0.115 + (wOut ? wOut.leftAnchorOffY : 0),
      baseAnchor[2] + pumpZ + legacyRel * (wt === 'deagle' || wt === 'pistol' ? 0.04 : 0.14) + (wOut ? wOut.leftAnchorOffZ : 0)
    );
    _wWorldPos.copy(_wAnchorLocal).applyMatrix4(weaponMesh.matrixWorld).applyMatrix4(_wInvRootMat);

    weaponMesh.getWorldQuaternion(_wWorldQuat);
    _wWorldQuat.premultiply(_wInvRootQuat);

    _wLeftEuler.set(
      spec.leftRelEuler[0] - legacyRel * 0.35 + (wOut ? wOut.leftRelOffX : 0),
      spec.leftRelEuler[1] + legacyRel * 0.18 + (wOut ? wOut.leftRelOffY : 0),
      spec.leftRelEuler[2] - legacyRel * 0.28 + (wOut ? wOut.leftRelOffZ : 0),
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
    const ALL_WEAPON_TYPES = ['rifle', 'smg', 'shotgun', 'awp', 'deagle', 'pistol', 'revolver'];
    let currentWeaponMeshes = { rifle: null, smg: null, shotgun: null, awp: null, deagle: null, pistol: null, revolver: null };
    let currentWeaponItems = {
      rifle: KS.createStarterWeapon('rifle'),
      smg: KS.createStarterWeapon('smg'),
      shotgun: KS.createStarterWeapon('shotgun'),
      awp: KS.createStarterWeapon('awp'),
      deagle: KS.createStarterWeapon('deagle'),
      pistol: KS.createStarterWeapon('pistol'),
      revolver: KS.createStarterWeapon('revolver')
    };
    let currentWeaponAttachments = { rifle: {}, smg: {}, shotgun: {}, awp: {}, deagle: {}, pistol: {}, revolver: {} };
    let currentWeaponBuildSig = { rifle: '', smg: '', shotgun: '', awp: '', deagle: '', pistol: '', revolver: '' };
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
      reloadCueMask: 0,
      boltCueMask: 0,
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
      if (rig && rig.reloadShellsGroup) rig.reloadShellsGroup.visible = false;
      syncActiveMeshVisibility();
      if (playDraw && changed) {
        if (valid === 'knife') {
          triggerDraw();
        } else {
          weaponAnim.drawT = 0;
          weaponAnim.drawDuration = valid === 'awp' ? 0.44 : (valid === 'deagle' || valid === 'pistol' || valid === 'revolver') ? 0.30 : valid === 'smg' ? 0.30 : 0.36;
          weaponAnim.reloadT = 1;
          weaponAnim.reloadCueMask = 0;
          weaponAnim.boltT = 1;
          weaponAnim.boltCueMask = 0;
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
      weaponAnim.recoilKick = (s === 'awp' ? 0.088 : s === 'shotgun' ? 0.078 : s === 'revolver' ? 0.098 : s === 'deagle' ? 0.058 : s === 'smg' ? 0.022 : s === 'pistol' ? 0.028 : 0.030) * adsDamp;
      weaponAnim.recoilPitch = (s === 'awp' ? 0.24 : s === 'shotgun' ? 0.22 : s === 'revolver' ? 0.31 : s === 'deagle' ? 0.21 : s === 'smg' ? 0.052 : s === 'pistol' ? 0.095 : 0.075) * adsDamp;
      weaponAnim.slideKick = 1.0;
      weaponAnim.hammerKick = 1.0;
      weaponAnim.flashTimer = 0.048;
      if (s === 'awp' || s === 'shotgun') {
        weaponAnim.boltT = 0;
        weaponAnim.boltCueMask = 0;
      }
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
      weaponAnim.reloadCueMask = 0;
      weaponAnim.boltT = 1;
      weaponAnim.boltCueMask = 0;
      weaponAnim.reloadDuration = Math.max(0.6, Number(duration) || 1.6);
      adsActive = false;
      isScoped = false;
      syncActiveMeshVisibility();
      if (activeSlot === 'shotgun') {
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
      evaluateWeaponReloadAndAction(wt, weaponAnim, _weaponOut, true);

      const adsEase = smoothstep(0, 1, adsProgress);
      // Weapon draw should not tug the model away from the sight line after ADS starts.
      const drawDip = (1 - smoothstep(0, 1, weaponAnim.drawT)) * 0.22 * (1 - adsEase);
      const reloadArc = weaponAnim.reloadT < 1 ? Math.sin(weaponAnim.reloadT * Math.PI) : 0;
      const boltArc = (wt === 'awp' || wt === 'shotgun') && weaponAnim.boltT < 1 ? Math.sin(weaponAnim.boltT * Math.PI) : 0;
      // Fully stabilize the weapon at full ADS; do not retain surf bank or idle sway.
      const motionDamp = 1 - adsEase;

      // Scale inverse-compensated weapon socket offsets by the same (1 - adsEase)
      // factor as rightHandPivot offsets so AWP right-hand bolt cycling stays locked.
      _weaponOut.wPosX *= motionDamp;
      _weaponOut.wPosY *= motionDamp;
      _weaponOut.wPosZ *= motionDamp;

      const isPistol = wt === 'deagle' || wt === 'pistol' || wt === 'revolver';
      const hipRx = isPistol ? 0.138 : wt === 'awp' ? 0.168 : wt === 'smg' ? 0.148 : 0.162;
      const hipRy = isPistol ? -0.152 : wt === 'awp' ? -0.172 : wt === 'smg' ? -0.158 : -0.166;
      const hipRz = isPistol ? -0.320 : wt === 'awp' ? -0.252 : wt === 'smg' ? -0.285 : -0.268;

      // Apply the animated weapon socket transform before solving its actual
      // optic point; the old gripCenter/eyeY shortcut ignored X/Z and rotation.
      const adsRz = isPistol ? -0.245 : wt === 'smg' ? -0.205 : -0.190;
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
      const rootGrp = new THREE.Group();
      const upperBody = new THREE.Group();
      rootGrp.add(upperBody);

      // PBR materials with clear roughness/metalness separation
      const suitMat = new THREE.MeshStandardMaterial({ color: 0x131d29, roughness: 0.82, metalness: 0.14 });
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x1e2c3c, roughness: 0.48, metalness: 0.42 });
      const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x0b1118, roughness: 0.62, metalness: 0.28 });
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x0d131b, roughness: 0.72, metalness: 0.18 });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x102838,
        emissive: 0x2692b8,
        emissiveIntensity: 0.65,
        roughness: 0.14,
        metalness: 0.92
      });
      const cyanAccentMat = new THREE.MeshStandardMaterial({
        color: 0x65e7ff,
        emissive: 0x4fd2ef,
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.5
      });
      const amberAccentMat = new THREE.MeshStandardMaterial({
        color: 0xffb84d,
        emissive: 0xd98a26,
        emissiveIntensity: 0.72,
        roughness: 0.3,
        metalness: 0.55
      });

      // Procedural glove texture matching player's equipped glove skin!
      const cleanGlove = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
      const glovePaint = paintGloveToCanvases(cleanGlove, 256);
      const gloveMap = new THREE.CanvasTexture(glovePaint.albedoCanvas);
      gloveMap.colorSpace = THREE.SRGBColorSpace;
      const gloveMat = new THREE.MeshStandardMaterial({
        map: gloveMap,
        roughness: 0.64,
        metalness: 0.22
      });

      const addPart = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, rz);
        parent.add(m);
        return m;
      };

      // Grounded tactical stance: pivot at y = 0 (soles flush with studio floor)
      // Left & Right Legs + Boots + Knee Pads
      for (const side of [-1, 1]) {
        const lx = side * 0.135;
        const lz = side < 0 ? 0.035 : -0.04;
        // Boot sole + upper
        addPart(rootGrp, new THREE.BoxGeometry(0.11, 0.08, 0.22), bootMat, lx, 0.04, lz + 0.03, 0, side * 0.1, 0);
        addPart(rootGrp, new THREE.CylinderGeometry(0.056, 0.062, 0.12, 12), bootMat, lx, 0.12, lz);
        // Lower leg / greave
        addPart(rootGrp, new THREE.CylinderGeometry(0.064, 0.056, 0.34, 12), suitMat, lx, 0.34, lz, side < 0 ? -0.05 : 0.06, 0, 0);
        // Armored knee pad
        addPart(rootGrp, new THREE.BoxGeometry(0.095, 0.10, 0.07), armorMat, lx, 0.51, lz + 0.045);
        // Upper thigh
        addPart(rootGrp, new THREE.CylinderGeometry(0.082, 0.068, 0.36, 12), suitMat, lx * 0.96, 0.71, lz * 0.6);
        // Side thigh rig pouch / holster
        addPart(rootGrp, new THREE.BoxGeometry(0.045, 0.15, 0.10), darkTrimMat, lx + side * 0.075, 0.70, lz * 0.5);
      }

      // Pelvis & Tactical Utility Belt
      addPart(rootGrp, new THREE.BoxGeometry(0.32, 0.15, 0.20), suitMat, 0, 0.92, 0);
      addPart(rootGrp, new THREE.BoxGeometry(0.35, 0.065, 0.225), darkTrimMat, 0, 0.96, 0);
      addPart(rootGrp, new THREE.BoxGeometry(0.07, 0.048, 0.03), amberAccentMat, 0, 0.96, 0.118);

      // Upper Body (subtle breathing animation group pivoted at waist)
      upperBody.position.set(0, 0.98, 0);

      // Torso Core + Armored Plate Carrier
      addPart(upperBody, new THREE.BoxGeometry(0.34, 0.44, 0.21), suitMat, 0, 0.24, 0);
      addPart(upperBody, new THREE.BoxGeometry(0.31, 0.35, 0.245), armorMat, 0, 0.26, 0.01);
      // Chest tactical mag pouches (3 across front)
      for (let i = -1; i <= 1; i++) {
        addPart(upperBody, new THREE.BoxGeometry(0.068, 0.11, 0.042), darkTrimMat, i * 0.082, 0.16, 0.145);
      }
      // Collar guard + velocity chest chevron light
      addPart(upperBody, new THREE.CylinderGeometry(0.11, 0.14, 0.07, 14), armorMat, 0, 0.46, 0.0);
      addPart(upperBody, new THREE.BoxGeometry(0.11, 0.018, 0.02), cyanAccentMat, 0, 0.36, 0.138);
      addPart(upperBody, new THREE.BoxGeometry(0.055, 0.014, 0.02), amberAccentMat, 0.095, 0.39, 0.136);

      // Tactical Backpack / Thruster Spine Pack
      addPart(upperBody, new THREE.BoxGeometry(0.24, 0.32, 0.11), darkTrimMat, 0, 0.27, -0.155);
      addPart(upperBody, new THREE.BoxGeometry(0.03, 0.18, 0.02), cyanAccentMat, -0.07, 0.27, -0.21);
      addPart(upperBody, new THREE.BoxGeometry(0.03, 0.18, 0.02), cyanAccentMat, 0.07, 0.27, -0.21);

      // Neck & Tactical Ballistic Helmet + Reflective Visor
      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.56, 0.01);
      headGrp.rotation.y = -0.14;
      upperBody.add(headGrp);

      addPart(headGrp, new THREE.CylinderGeometry(0.062, 0.07, 0.10, 12), darkTrimMat, 0, -0.03, 0);
      // Lower face balaclava / respirator
      addPart(headGrp, new THREE.SphereGeometry(0.105, 18, 16), darkTrimMat, 0, 0.06, 0.005);
      // Helmet dome shell
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.126, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        armorMat
      );
      dome.position.set(0, 0.08, -0.005);
      headGrp.add(dome);
      // Helmet brim + NVG shroud mount + side rails + ear comms
      addPart(headGrp, new THREE.BoxGeometry(0.055, 0.045, 0.035), darkTrimMat, 0, 0.145, 0.118, -0.2, 0, 0);
      addPart(headGrp, new THREE.BoxGeometry(0.025, 0.014, 0.02), amberAccentMat, 0, 0.155, 0.135);
      addPart(headGrp, new THREE.BoxGeometry(0.036, 0.075, 0.075), darkTrimMat, -0.126, 0.075, -0.01);
      addPart(headGrp, new THREE.BoxGeometry(0.036, 0.075, 0.075), darkTrimMat, 0.126, 0.075, -0.01);
      // Curved ballistic visor
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.114, 0.110, 0.062, 18, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
        visorMat
      );
      visor.position.set(0, 0.088, 0.018);
      headGrp.add(visor);

      // Shoulders + Articulated Arms in COD Low-Ready Weapon Hold
      for (const side of [-1, 1]) {
        // Armored shoulder pauldron
        addPart(upperBody, new THREE.SphereGeometry(0.086, 14, 12), armorMat, side * 0.22, 0.40, 0);
        addPart(upperBody, new THREE.BoxGeometry(0.018, 0.06, 0.07), side > 0 ? amberAccentMat : cyanAccentMat, side * 0.28, 0.40, 0.01);
      }

      // Right arm (trigger hand tucked near right chest / pistol grip)
      addPart(upperBody, new THREE.CylinderGeometry(0.054, 0.048, 0.26, 12), suitMat, -0.23, 0.26, 0.04, -0.35, 0, 0.22);
      addPart(upperBody, new THREE.CylinderGeometry(0.046, 0.040, 0.24, 12), suitMat, -0.17, 0.15, 0.17, -1.18, 0.22, -0.18);
      addPart(upperBody, new THREE.BoxGeometry(0.068, 0.062, 0.082), gloveMat, -0.10, 0.15, 0.26, 0.1, 0.3, 0);

      // Left arm (support hand reaching forward under handguard)
      addPart(upperBody, new THREE.CylinderGeometry(0.054, 0.048, 0.26, 12), suitMat, 0.23, 0.26, 0.06, -0.52, 0, -0.26);
      addPart(upperBody, new THREE.CylinderGeometry(0.046, 0.040, 0.25, 12), suitMat, 0.15, 0.18, 0.20, -1.25, -0.45, 0.24);
      addPart(upperBody, new THREE.BoxGeometry(0.068, 0.062, 0.082), gloveMat, 0.075, 0.20, 0.285, 0.05, -0.3, 0);

      // Live 3D Equipped Primary Weapon held across chest!
      const weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.02, 0.20, 0.295);
      upperBody.add(weaponPivot);

      const cleanWep = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
      const wepModel = buildWeaponModel(cleanWep, targetRenderer, attachments || {});
      // Orient weapon across chest barrel pointing right-downward (COD low-ready hero pose)
      wepModel.rotation.set(0.14, Math.PI * 0.44, -0.22);
      const wBox = new THREE.Box3().setFromObject(wepModel);
      const wCenter = new THREE.Vector3();
      const wSize = new THREE.Vector3();
      wBox.getCenter(wCenter);
      wBox.getSize(wSize);
      const wMax = Math.max(wSize.x, wSize.y, wSize.z, 0.2);
      const isShort = cleanWep.weaponType === 'smg' || cleanWep.weaponType === 'deagle' || cleanWep.weaponType === 'pistol';
      const targetLen = isShort ? 0.56 : (cleanWep.weaponType === 'awp' ? 0.88 : 0.74);
      const wScale = targetLen / wMax;
      wepModel.scale.setScalar(wScale);
      wepModel.position.set(-wCenter.x * wScale, -wCenter.y * wScale, -wCenter.z * wScale);
      weaponPivot.add(wepModel);

      rootGrp.userData.upperBody = upperBody;
      rootGrp.userData.headGrp = headGrp;
      rootGrp.userData.wepModel = wepModel;
      return rootGrp;
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
        powerPreference: 'high-performance'
      });
      pRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pRenderer.toneMappingExposure = 1.24;

      pScene = new THREE.Scene();
      pCamera = new THREE.PerspectiveCamera(42, 1.6, 0.02, 24);
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
          const isPistol = currentWeapon && (currentWeapon.weaponType === 'deagle' || currentWeapon.weaponType === 'pistol');
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
        targetCamX = 0;
        targetCamY = gunsmithMode ? 0.01 : 0.015;
        targetCamZ = gunsmithMode ? 0.86 : 0.50;
        targetLookX = 0;
        targetLookY = gunsmithMode ? -0.015 : 0;
        if (!camLerpActive) {
          pCamera.position.set(targetCamX, targetCamY, targetCamZ);
          pCamera.lookAt(targetLookX, targetLookY, 0);
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
    }

    function showGunsmithWeapon(canvas, weaponItem, attachments, opts) {
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
          none:        { y: 0.06,  p: 0.06, z: 0.86, lx: 0.00, ly: -0.015 },
          optic:       { y: -0.14, p: 0.14, z: 0.72, lx: -0.02, ly: 0.03 },
          muzzle:      { y: 0.28,  p: 0.05, z: 0.74, lx: 0.14,  ly: 0.00 },
          barrel:      { y: 0.22,  p: 0.07, z: 0.76, lx: 0.10,  ly: 0.01 },
          underbarrel: { y: 0.18,  p: -0.06,z: 0.74, lx: 0.06,  ly: -0.03 },
          magazine:    { y: -0.10, p: -0.08,z: 0.74, lx: -0.02, ly: -0.05 },
          ammo:        { y: -0.14, p: -0.06,z: 0.75, lx: -0.03, ly: -0.04 },
          rearGrip:    { y: -0.30, p: 0.04, z: 0.74, lx: -0.10, ly: -0.03 },
          stock:       { y: -0.38, p: 0.06, z: 0.76, lx: -0.15, ly: 0.00 },
          apex:        { y: -0.26, p: 0.10, z: 0.72, lx: -0.04, ly: 0.02 }
        };
        const f = focusMap[options.focusSlot] || focusMap.none;
        targetYaw = f.y;
        targetPitch = f.p;
        targetCamZ = f.z;
        targetLookX = f.lx;
        targetLookY = f.ly;
        if (options.instantCamera) {
          yaw = targetYaw;
          pitch = targetPitch;
          pCamera.position.set(0, 0.01, targetCamZ);
          pCamera.lookAt(targetLookX, targetLookY, 0);
          camLerpActive = false;
        } else {
          camLerpActive = true;
        }
      }
      soloTrickT = 1;
      active = true;
      startLoop();
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

        const isPistol = wt === 'deagle' || wt === 'pistol';
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
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      if (previewMode === 'runner') {
        if (!dragging) {
          // Gentle alive idle sway around current user yaw
          const breathe = Math.sin(now * 0.0018);
          if (runnerMesh && runnerMesh.userData.upperBody) {
            runnerMesh.userData.upperBody.position.y = 0.98 + breathe * 0.006;
            runnerMesh.userData.upperBody.rotation.x = breathe * 0.008;
          }
          if (runnerMesh && runnerMesh.userData.headGrp) {
            runnerMesh.userData.headGrp.rotation.y = -0.14 + Math.sin(now * 0.0007) * 0.06;
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
          const k = 1 - Math.exp(-7.5 * dt);
          yaw += (targetYaw - yaw) * k;
          pitch += (targetPitch - pitch) * k;
          pCamera.position.z += (targetCamZ - pCamera.position.z) * k;
          pCamera.lookAt(targetLookX, targetLookY, 0);
          if (Math.abs(targetYaw - yaw) < 0.003 && Math.abs(targetPitch - pitch) < 0.003 && Math.abs(targetCamZ - pCamera.position.z) < 0.003) {
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
