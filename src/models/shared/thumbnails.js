// 2D patterned silhouette thumbnail renderers for Armory & Gunsmith cards (weapons, gloves, knives).
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { thumbCache, skinCacheKey, paintSkinToCanvases, gloveCacheKey, paintGloveToCanvases, weaponCacheKey, paintWeaponToCanvases } = VI;
  // ---------- 2D Patterned Firearm Silhouette Thumbnail ----------
  function renderWeaponThumbDataUrl(weaponItem) {
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const key = weaponCacheKey(item);
    if (thumbCache.has(key)) return thumbCache.get(key);

    const W = 184, H = 96;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const { albedoCanvas } = paintWeaponToCanvases(item, 192);
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
    } else if (wt === 'revolver') {
      // Sculpted ergonomic magnum revolver grip
      ctx.fillStyle = '#171f28';
      ctx.beginPath();
      ctx.moveTo(-42, 1);
      ctx.lineTo(-18, 2);
      ctx.quadraticCurveTo(-24, 22, -32, 34);
      ctx.lineTo(-56, 31);
      ctx.quadraticCurveTo(-48, 16, -42, 1);
      ctx.closePath();
      ctx.fill();
      // Exposed checkered hammer spur + trigger guard loop
      ctx.fillStyle = '#4a5c70';
      ctx.beginPath();
      ctx.moveTo(-46, -13); ctx.lineTo(-56, -21); ctx.lineTo(-50, -24); ctx.lineTo(-39, -15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3c4c5c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-18, 3); ctx.lineTo(6, 3); ctx.quadraticCurveTo(8, 15, -4, 15); ctx.lineTo(-18, 14);
      ctx.stroke();
      // Heavy R-88 vented magnum barrel + full underlug shroud + frame top strap
      drawClippedBody((g) => {
        g.moveTo(-44, -17);
        g.lineTo(64, -17);
        g.lineTo(66, -3);
        g.lineTo(12, -1);
        g.lineTo(10, 4);
        g.lineTo(-42, 4);
      });
      // Iconic 6-chamber fluted cylinder drum
      ctx.fillStyle = '#202b36';
      ctx.fillRect(-20, -14, 26, 18);
      ctx.strokeStyle = 'rgba(255, 224, 150, 0.45)';
      ctx.lineWidth = 1.6;
      for (const fy of [-10, -5, 0]) {
        ctx.beginPath(); ctx.moveTo(-17, fy); ctx.lineTo(3, fy); ctx.stroke();
      }
      // Vented top barrel rib ports
      ctx.fillStyle = '#091119';
      for (const vx of [18, 30, 42, 54]) ctx.fillRect(vx, -15.5, 7, 3.2);
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
    const { albedoCanvas, palette } = paintGloveToCanvases(item, 192);
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
    const { albedoCanvas } = paintSkinToCanvases(item, 192);

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

  root.renderKnifeThumbDataUrl = renderKnifeThumbDataUrl;
  root.renderGloveThumbDataUrl = renderGloveThumbDataUrl;
  root.renderWeaponThumbDataUrl = renderWeaponThumbDataUrl;
  Object.assign(VI, {
    renderKnifeThumbDataUrl,
    renderGloveThumbDataUrl,
    renderWeaponThumbDataUrl
  });
})(typeof self !== "undefined" ? self : globalThis);
