// Synthesized Web Audio SFX for Armory cases, knife tricks, and melee swings.
(function (root) {
  "use strict";
  if (typeof window === "undefined") return;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
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

  root.CaseAudio = CaseAudio;
  VI.CaseAudio = CaseAudio;
})(typeof self !== "undefined" ? self : globalThis);
