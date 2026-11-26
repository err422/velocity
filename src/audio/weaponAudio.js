// Synthesized Web Audio SFX for firearms, reloads, revolver cylinder/hammer, Chrono, and arena horns.
(function (root) {
  "use strict";
  if (typeof window === "undefined") return;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
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
    function fireRevolver(fanFire) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const isFan = Boolean(fanFire);
      // Optional crisp palm-slap transient on RMB Fan-the-Hammer
      if (isFan) {
        noiseBurst(c, now, 0.032, 'bandpass', 920, 1.3, 0.14);
      }
      // Massive .500 magnum boom + crisp high crack
      noiseBurst(c, now, isFan ? 0.22 : 0.30, 'lowpass', isFan ? 1280 : 1080, 0.65, isFan ? 0.32 : 0.38);
      noiseBurst(c, now, isFan ? 0.09 : 0.13, 'bandpass', 2150, 0.82, isFan ? 0.22 : 0.26);
      // Heavy sub-bass body punch
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(isFan ? 155 : 138, now);
      sub.frequency.exponentialRampToValueAtTime(30, now + (isFan ? 0.18 : 0.25));
      sg.gain.setValueAtTime(isFan ? 0.28 : 0.34, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + (isFan ? 0.20 : 0.27));
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.29);
      // Signature heavy steel barrel ring overtone
      const ring = c.createOscillator();
      const rg = c.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(isFan ? 1820 : 1640, now + 0.01);
      ring.frequency.exponentialRampToValueAtTime(760, now + 0.18);
      rg.gain.setValueAtTime(0.055, now + 0.01);
      rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      ring.connect(rg);
      rg.connect(c.destination);
      ring.start(now + 0.01);
      ring.stop(now + 0.20);
    }
    function revolverRatchet(stage) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const hi = stage >= 2;
      noiseBurst(c, now, 0.018, 'highpass', hi ? 3400 : 2700, 1.8, 0.048);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(hi ? 2680 : 2120, now);
      osc.frequency.exponentialRampToValueAtTime(hi ? 1140 : 880, now + 0.018);
      g.gain.setValueAtTime(hi ? 0.046 : 0.036, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    }
    function revolverCraneOpen() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Latch thumb click + hinged yoke swing out
      noiseBurst(c, now, 0.035, 'bandpass', 2400, 2.0, 0.075);
      [0, 0.085, 0.19].forEach((off, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = idx === 2 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 1850 : idx === 1 ? 1120 : 3180, now + off);
        osc.frequency.exponentialRampToValueAtTime(idx === 2 ? 2350 : 480, now + off + 0.045);
        g.gain.setValueAtTime(idx === 2 ? 0.032 : 0.052, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.055);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.06);
      });
    }
    function revolverCylinderSpin(intensity) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const spd = Math.max(0.65, Number(intensity) || 1.0);
      // 13 decelerating metallic pawl clicks for that iconic free-spinning revolver cylinder whirr
      let tOff = 0;
      const count = spd > 1.15 ? 16 : 13;
      for (let i = 0; i < count; i++) {
        const frac = i / Math.max(1, count - 1);
        const step = (0.024 + frac * frac * 0.056) / spd;
        const t = now + tOff;
        tOff += step;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2950 - frac * 680, t);
        osc.frequency.exponentialRampToValueAtTime(1180, t + 0.015);
        const amp = (0.046 * (1 - frac * 0.48)) * Math.min(1.2, spd);
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.021);
      }
      // Soft metallic resonance tail
      noiseBurst(c, now, 0.24 / spd, 'bandpass', 3600, 3.2, 0.028);
    }
    function revolverShellInsert() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Single brass .500 magnum round sliding into steel chamber + rim ping
      noiseBurst(c, now, 0.026, 'bandpass', 2550, 2.4, 0.062);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1380, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.032);
      g.gain.setValueAtTime(0.056, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.042);
      const ping = c.createOscillator();
      const pg = c.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(3280, now + 0.022);
      pg.gain.setValueAtTime(0.028, now + 0.022);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      ping.connect(pg);
      pg.connect(c.destination);
      ping.start(now + 0.022);
      ping.stop(now + 0.070);
    }
    function revolverCraneClose() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Crisp heavy steel wrist-flick snap-shut
      noiseBurst(c, now, 0.042, 'bandpass', 2250, 1.8, 0.092);
      const thud = c.createOscillator();
      const tg = c.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(520, now);
      thud.frequency.exponentialRampToValueAtTime(140, now + 0.048);
      tg.gain.setValueAtTime(0.11, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.054);
      thud.connect(tg);
      tg.connect(c.destination);
      thud.start(now);
      thud.stop(now + 0.058);
      const lock = c.createOscillator();
      const lg = c.createGain();
      lock.type = 'square';
      lock.frequency.setValueAtTime(2480, now + 0.012);
      lock.frequency.exponentialRampToValueAtTime(980, now + 0.044);
      lg.gain.setValueAtTime(0.058, now + 0.012);
      lg.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
      lock.connect(lg);
      lg.connect(c.destination);
      lock.start(now + 0.012);
      lock.stop(now + 0.052);
    }
    function fireSuppressed(slot) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const isHeavy = slot === 'awp' || slot === 'shotgun' || slot === 'sawedoff' || slot === 'leverslug' || slot === 'deagle' || slot === 'revolver' || slot === 'scar' || slot === 'dmr' || slot === 'scout';
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
    function fireScar() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.15, 'lowpass', 1280, 0.72, 0.30);
      noiseBurst(c, now, 0.065, 'bandpass', 2100, 0.85, 0.18);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
    function fireSawedoff() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.34, 'lowpass', 880, 0.6, 0.42);
      noiseBurst(c, now, 0.18, 'bandpass', 1500, 0.72, 0.28);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(112, now);
      sub.frequency.exponentialRampToValueAtTime(26, now + 0.28);
      sg.gain.setValueAtTime(0.38, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.32);
    }
    function fireLever() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.24, 'lowpass', 1120, 0.7, 0.34);
      noiseBurst(c, now, 0.11, 'bandpass', 2050, 0.85, 0.22);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(148, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.19);
      sg.gain.setValueAtTime(0.29, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.22);
      // Lever flick clack-clack
      [0.19, 0.31].forEach((offset, idx) => {
        noiseBurst(c, now + offset, 0.04, 'highpass', idx === 0 ? 2500 : 3200, 1.8, 0.07);
      });
    }
    function fireDmr() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.18, 'bandpass', 1350, 0.78, 0.28);
      noiseBurst(c, now, 0.075, 'highpass', 2400, 0.75, 0.17);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(165, now);
      sub.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      sg.gain.setValueAtTime(0.24, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.16);
    }
    function fireScout() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.24, 'bandpass', 1500, 0.8, 0.30);
      noiseBurst(c, now, 0.10, 'highpass', 2600, 0.85, 0.20);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(175, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      sg.gain.setValueAtTime(0.26, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.22);
      [0.26, 0.42].forEach((offset, idx) => {
        noiseBurst(c, now + offset, 0.032, 'highpass', idx === 0 ? 2200 : 2900, 1.5, 0.055);
      });
    }
    function katanaSlash(combo) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const pitchShift = 1 + ((combo || 0) % 3) * 0.14;
      noiseBurst(c, now, 0.15, 'bandpass', 1800 * pitchShift, 1.4, 0.18);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920 * pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(240 * pitchShift, now + 0.14);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }
    function katanaDash() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.26, 'bandpass', 2400, 0.9, 0.28);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(1680, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.24);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }
    function katanaDeflect() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Crisp metallic samurai blade ring + ricochet ping
      [2180, 3290, 4420].forEach((freq, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.88, now + 0.22);
        g.gain.setValueAtTime(idx === 0 ? 0.14 : 0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
      noiseBurst(c, now, 0.055, 'highpass', 3600, 1.8, 0.16);
    }
    function fireRpg() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.42, 'lowpass', 950, 0.7, 0.36);
      noiseBurst(c, now + 0.04, 0.38, 'bandpass', 1400, 0.85, 0.22);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(135, now);
      sub.frequency.exponentialRampToValueAtTime(44, now + 0.36);
      sg.gain.setValueAtTime(0.24, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.40);
    }
    function explosion() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.44, 'lowpass', 620, 0.55, 0.46);
      noiseBurst(c, now, 0.26, 'bandpass', 1100, 0.7, 0.28);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(98, now);
      sub.frequency.exponentialRampToValueAtTime(22, now + 0.42);
      sg.gain.setValueAtTime(0.42, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.45);
    }
    function fireMinigun() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.055, 'bandpass', 1850, 0.9, 0.22);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.048);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.056);
    }
    function fireRailcannon() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.32, 'highpass', 2000, 0.9, 0.28);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1680, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.30);
      g.gain.setValueAtTime(0.26, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.34);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(130, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.28);
      sg.gain.setValueAtTime(0.32, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 0.32);
    }
    function fireGrenade() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Signature hollow 40mm THUMP
      noiseBurst(c, now, 0.14, 'lowpass', 720, 1.2, 0.24);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }
    function grenadeBounce() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.045);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    }
    function nukeSiren() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      for (let i = 0; i < 4; i++) {
        const t0 = now + i * 1.15;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sawtooth';
        const filt = c.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 1400;
        osc.frequency.setValueAtTime(420, t0);
        osc.frequency.linearRampToValueAtTime(860, t0 + 0.52);
        osc.frequency.linearRampToValueAtTime(420, t0 + 1.02);
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.11, t0 + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.06);
        osc.connect(filt);
        filt.connect(g);
        g.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 1.08);
      }
    }
    function nukeDetonate() {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      noiseBurst(c, now, 0.44, 'lowpass', 480, 0.5, 0.50);
      noiseBurst(c, now + 0.12, 0.44, 'lowpass', 320, 0.5, 0.42);
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(82, now);
      sub.frequency.exponentialRampToValueAtTime(18, now + 1.2);
      sg.gain.setValueAtTime(0.45, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      sub.connect(sg);
      sg.connect(c.destination);
      sub.start(now);
      sub.stop(now + 1.3);
    }
    function fireWeapon(slot, opts) {
      if ((opts && opts.suppressed) || slot === 'honeybadger' || slot === 'usps') {
        fireSuppressed(slot);
        return;
      }
      if (slot === 'awp') fireAwp();
      else if (slot === 'scout') fireScout();
      else if (slot === 'dmr') fireDmr();
      else if (slot === 'revolver') fireRevolver(Boolean(opts && opts.fanFire));
      else if (slot === 'deagle') fireDeagle();
      else if (slot === 'smg' || slot === 'mp7' || slot === 'g18') fireSmg();
      else if (slot === 'shotgun') fireShotgun();
      else if (slot === 'sawedoff') fireSawedoff();
      else if (slot === 'leverslug') fireLever();
      else if (slot === 'scar') fireScar();
      else if (slot === 'pistol' || slot === 'akimbo') firePistol();
      else if (slot === 'katana') katanaSlash(opts && opts.combo);
      else if (slot === 'rpg') fireRpg();
      else if (slot === 'minigun') fireMinigun();
      else if (slot === 'railcannon') fireRailcannon();
      else if (slot === 'grenadelauncher') fireGrenade();
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
      fireRevolver,
      fireDeagle,
      fireScar,
      fireSawedoff,
      fireLever,
      fireDmr,
      fireScout,
      fireRpg,
      fireMinigun,
      fireRailcannon,
      fireGrenade,
      grenadeBounce,
      explosion,
      katanaSlash,
      katanaDash,
      katanaDeflect,
      nukeSiren,
      nukeDetonate,
      fireWeapon,
      revolverRatchet,
      revolverCraneOpen,
      revolverCylinderSpin,
      revolverShellInsert,
      revolverCraneClose,
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

  root.WeaponAudio = WeaponAudio;
  VI.WeaponAudio = WeaponAudio;
})(typeof self !== "undefined" ? self : globalThis);
