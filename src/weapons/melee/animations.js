// First-person melee knife draw, slash, inspect, and mythic trick animation choreography.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { CaseAudio, easeOutCubic, smoothstep, bell } = VI;
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

  Object.assign(VI, {
    createAnimOut,
    evaluateViewmodelChoreography,
    durationForInspect
  });
})(typeof self !== "undefined" ? self : globalThis);
