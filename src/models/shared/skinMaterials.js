// Studio-grade Procedural PBR Skin Engine (Albedo + Packed Roughness/Metalness + Bump + Emissive)
// Covers all 12 Knife Skins, 16 Glove Skins, and 50 Firearm Skins (CS2 x MW4 x BO6 x MW3 x Valorant x Apex).
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { getProceduralTexSize } = VI;

  const skinCanvasCache = new Map();
  const gloveCanvasCache = new Map();
  const weaponCanvasCache = new Map();
  const weaponSwatchCache = new Map();
  const thumbCache = new Map();

  // ============================================================================
  // SHARED CANVAS & PBR DRAWING HELPERS
  // ============================================================================
  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  // Packed Roughness (G) + Metalness (B) color helper for Three.js MeshPhysicalMaterial
  // (Three.js samples roughnessMap.g and metalnessMap.b; set roughness=1, metalness=1 on material)
  function rmStyle(rough01, metal01) {
    const g = Math.max(14, Math.min(248, Math.round(rough01 * 255)));
    const b = Math.max(0, Math.min(255, Math.round(metal01 * 255)));
    return `rgb(255,${g},${b})`;
  }

  function bumpStyle(level01) {
    const v = Math.max(0, Math.min(255, Math.round(level01 * 255)));
    return `rgb(${v},${v},${v})`;
  }

  function fillAll(ctx, style, w, h) {
    ctx.fillStyle = style;
    ctx.fillRect(0, 0, w, h);
  }

  function seededRand(seed, idx, salt) {
    return KS.hash2D(seed + idx * 13, idx * 31 + salt, salt * 17 + 7);
  }

  // Crisp directional brushed metal micro-streaks (no noisy dot static)
  function paintBrushedMetal(actx, bctx, w, h, seed, alpha, horizontal) {
    actx.save();
    bctx.save();
    const count = Math.min(220, Math.max(70, Math.round((horizontal ? h : w) * 0.65)));
    for (let i = 0; i < count; i++) {
      const t = seededRand(seed, i, 19);
      const len = 0.25 + seededRand(seed, i, 41) * 0.75;
      const start = seededRand(seed, i, 67) * (1 - len * 0.5);
      const bright = seededRand(seed, i, 97) > 0.5;
      const lw = Math.max(0.6, (horizontal ? h : w) / 280);
      actx.strokeStyle = bright ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.85})`;
      actx.lineWidth = lw;
      bctx.strokeStyle = bright ? `rgba(176,176,176,${alpha * 2.2})` : `rgba(88,88,88,${alpha * 2.2})`;
      bctx.lineWidth = lw;
      actx.beginPath();
      bctx.beginPath();
      if (horizontal) {
        const y = t * h;
        const x0 = start * w;
        const x1 = x0 + len * w;
        actx.moveTo(x0, y); actx.lineTo(x1, y);
        bctx.moveTo(x0, y); bctx.lineTo(x1, y);
      } else {
        const x = t * w;
        const y0 = start * h;
        const y1 = y0 + len * h;
        actx.moveTo(x, y0); actx.lineTo(x, y1);
        bctx.moveTo(x, y0); bctx.lineTo(x, y1);
      }
      actx.stroke();
      bctx.stroke();
    }
    actx.restore();
    bctx.restore();
  }

  // True 2x2 diagonal twill 3K carbon fiber pattern (cached tile per palette)
  function paintCarbonFiber(actx, rmctx, bctx, w, h, cellPx, darkHex, lightHex, sheenRough, matteRough, metal01) {
    const cell = Math.max(4, Math.round(cellPx));
    const tileSize = cell * 4;
    const tA = makeCanvas(tileSize, tileSize);
    const tRM = makeCanvas(tileSize, tileSize);
    const tB = makeCanvas(tileSize, tileSize);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const phase = (x + y) % 4;
        const isWarp = phase < 2;
        const px = x * cell;
        const py = y * cell;

        // Subtle cylindrical fiber highlight gradient across each tow bundle
        const gA = isWarp
          ? tA.ctx.createLinearGradient(px, py, px + cell, py)
          : tA.ctx.createLinearGradient(px, py, px, py + cell);
        if (isWarp) {
          gA.addColorStop(0, darkHex);
          gA.addColorStop(0.5, lightHex);
          gA.addColorStop(1, darkHex);
        } else {
          gA.addColorStop(0, '#0a0d12');
          gA.addColorStop(0.5, darkHex);
          gA.addColorStop(1, '#0a0d12');
        }
        tA.ctx.fillStyle = gA;
        tA.ctx.fillRect(px, py, cell, cell);

        tRM.ctx.fillStyle = rmStyle(isWarp ? sheenRough : matteRough, metal01);
        tRM.ctx.fillRect(px, py, cell, cell);

        tB.ctx.fillStyle = bumpStyle(isWarp ? 0.64 : 0.36);
        tB.ctx.fillRect(px, py, cell, cell);
      }
    }

    actx.fillStyle = actx.createPattern(tA.canvas, 'repeat');
    actx.fillRect(0, 0, w, h);
    rmctx.fillStyle = rmctx.createPattern(tRM.canvas, 'repeat');
    rmctx.fillRect(0, 0, w, h);
    bctx.fillStyle = bctx.createPattern(tB.canvas, 'repeat');
    bctx.fillRect(0, 0, w, h);
  }

  // Crisp hex micro-inlay pattern (for athletic gloves & sci-fi chassis accents)
  function paintHexOverlay(ctx, bctx, w, h, radius, strokeStyle, lineWidth, alphaBump) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    const dx = radius * 1.5;
    const dy = radius * Math.sqrt(3);
    const drawInto = (target, style) => {
      target.save();
      target.strokeStyle = style;
      target.lineWidth = lineWidth;
      target.beginPath();
      for (let col = -1; col * dx < w + radius * 2; col++) {
        for (let row = -1; row * dy < h + radius * 2; row++) {
          const cx = col * dx;
          const cy = row * dy + (col & 1 ? dy * 0.5 : 0);
          for (let s = 0; s < 6; s++) {
            const ang = (s / 6) * Math.PI * 2;
            const px = cx + Math.cos(ang) * radius;
            const py = cy + Math.sin(ang) * radius;
            if (s === 0) target.moveTo(px, py);
            else target.lineTo(px, py);
          }
          target.closePath();
        }
      }
      target.stroke();
      target.restore();
    };
    drawInto(ctx, strokeStyle);
    if (bctx && alphaBump) {
      drawInto(bctx, `rgba(170,170,170,${alphaBump})`);
    }
    ctx.restore();
  }

  // Seeded multi-ring spider webs (Crimson Web knives/weapons & Emerald Web gloves)
  function paintSpiderWebs(actx, bctx, w, h, seed, count, inkColor, sheenColor) {
    const centers = [];
    for (let i = 0; i < count; i++) {
      centers.push({
        x: (0.14 + KS.hash2D(seed, i * 19 + 3, 211) * 0.72) * w,
        y: (0.18 + KS.hash2D(seed, i * 29 + 7, 307) * 0.64) * h,
        spokes: 8 + ((seed + i) % 3),
        rot: KS.hash2D(seed, i * 41, 131) * Math.PI * 2,
        maxR: Math.min(w, h) * (0.46 + KS.hash2D(seed, i * 53, 173) * 0.16)
      });
    }
    const drawLayer = (ctx2d, style, lw, offset) => {
      ctx2d.save();
      ctx2d.strokeStyle = style;
      ctx2d.lineWidth = lw;
      ctx2d.lineCap = 'round';
      for (const wc of centers) {
        const cx = wc.x + offset;
        const cy = wc.y + offset;
        for (let s = 0; s < wc.spokes; s++) {
          const ang = wc.rot + (s / wc.spokes) * Math.PI * 2;
          ctx2d.beginPath();
          ctx2d.moveTo(cx, cy);
          ctx2d.lineTo(cx + Math.cos(ang) * wc.maxR, cy + Math.sin(ang) * wc.maxR);
          ctx2d.stroke();
        }
        const rings = 6;
        for (let ring = 1; ring <= rings; ring++) {
          const rr = Math.pow(ring / rings, 1.15) * wc.maxR;
          ctx2d.beginPath();
          for (let s = 0; s < wc.spokes; s++) {
            const a0 = wc.rot + (s / wc.spokes) * Math.PI * 2;
            const a1 = wc.rot + ((s + 1) / wc.spokes) * Math.PI * 2;
            const am = (a0 + a1) * 0.5;
            const x0 = cx + Math.cos(a0) * rr;
            const y0 = cy + Math.sin(a0) * rr;
            const xm = cx + Math.cos(am) * (rr * 0.86);
            const ym = cy + Math.sin(am) * (rr * 0.86);
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
    const baseLw = Math.max(1.2, Math.min(w, h) / 145);
    if (sheenColor) drawLayer(actx, sheenColor, baseLw * 1.45, baseLw * 0.55);
    drawLayer(actx, inkColor, baseLw, 0);
    drawLayer(bctx, 'rgba(64,64,64,0.9)', baseLw * 1.15, 0);
  }

  // Deterministic triangulated crystalline facet mesh (Coldfront, Voidglass, Holo Prism, Arctic Veil)
  function paintCrystalFacets(actx, rmctx, bctx, ectx, w, h, seed, cols, rows, styleFn) {
    const pts = [];
    for (let r = 0; r <= rows; r++) {
      const rowPts = [];
      for (let c = 0; c <= cols; c++) {
        const jx = (c === 0 || c === cols) ? 0 : (seededRand(seed, r * 37 + c, 101) - 0.5) * 0.72;
        const jy = (r === 0 || r === rows) ? 0 : (seededRand(seed, r * 53 + c, 223) - 0.5) * 0.72;
        rowPts.push({
          x: ((c + jx) / cols) * w,
          y: ((r + jy) / rows) * h
        });
      }
      pts.push(rowPts);
    }

    const drawTri = (a, b, c, idx) => {
      const cx = (a.x + b.x + c.x) / (3 * w);
      const cy = (a.y + b.y + c.y) / (3 * h);
      const st = styleFn(cx, cy, idx);

      const trace = (ctx2d) => {
        ctx2d.beginPath();
        ctx2d.moveTo(a.x, a.y);
        ctx2d.lineTo(b.x, b.y);
        ctx2d.lineTo(c.x, c.y);
        ctx2d.closePath();
      };

      trace(actx);
      actx.fillStyle = st.fill;
      actx.fill();
      if (st.stroke) {
        actx.strokeStyle = st.stroke;
        actx.lineWidth = st.lineWidth || Math.max(0.8, h / 220);
        actx.stroke();
      }

      trace(rmctx);
      rmctx.fillStyle = rmStyle(st.rough, st.metal);
      rmctx.fill();

      trace(bctx);
      bctx.fillStyle = bumpStyle(st.bump);
      bctx.fill();
      if (st.bumpStroke) {
        bctx.strokeStyle = st.bumpStroke;
        bctx.lineWidth = st.lineWidth || Math.max(0.8, h / 220);
        bctx.stroke();
      }

      if (ectx && st.emissiveStroke) {
        trace(ectx);
        ectx.strokeStyle = st.emissiveStroke;
        ectx.lineWidth = st.emissiveWidth || Math.max(1.2, h / 170);
        ectx.stroke();
      }
      if (ectx && st.emissiveFill) {
        trace(ectx);
        ectx.fillStyle = st.emissiveFill;
        ectx.fill();
      }
    };

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p00 = pts[r][c];
        const p10 = pts[r][c + 1];
        const p01 = pts[r + 1][c];
        const p11 = pts[r + 1][c + 1];
        const flip = seededRand(seed, r * 19 + c, 311) > 0.5;
        if (flip) {
          drawTri(p00, p10, p11, idx++);
          drawTri(p00, p11, p01, idx++);
        } else {
          drawTri(p00, p10, p01, idx++);
          drawTri(p10, p11, p01, idx++);
        }
      }
    }
  }

  // Subtle receiver architectural seam lines & bevel accents (keeps guns cohesive, never cluttered)
  function paintReceiverArchitecture(actx, bctx, w, h, opts) {
    const o = opts || {};
    const seamAlpha = o.seamAlpha !== undefined ? o.seamAlpha : 0.34;
    const hiliteAlpha = o.hiliteAlpha !== undefined ? o.hiliteAlpha : 0.14;
    const lw = Math.max(1.0, h / 210);
    actx.save();
    bctx.save();

    // Subtle upper receiver bevel line (around y = 0.24*h -> v = 0.76)
    const yTop = h * 0.23;
    const yMid = h * 0.74;
    actx.strokeStyle = `rgba(0,0,0,${seamAlpha})`;
    actx.lineWidth = lw;
    actx.beginPath();
    actx.moveTo(w * 0.04, yTop); actx.lineTo(w * 0.96, yTop);
    actx.moveTo(w * 0.06, yMid); actx.lineTo(w * 0.94, yMid);
    actx.stroke();

    actx.strokeStyle = `rgba(255,255,255,${hiliteAlpha})`;
    actx.lineWidth = lw * 0.75;
    actx.beginPath();
    actx.moveTo(w * 0.04, yTop + lw); actx.lineTo(w * 0.96, yTop + lw);
    actx.stroke();

    bctx.strokeStyle = 'rgba(72,72,72,0.72)';
    bctx.lineWidth = lw * 1.2;
    bctx.beginPath();
    bctx.moveTo(w * 0.04, yTop); bctx.lineTo(w * 0.96, yTop);
    bctx.moveTo(w * 0.06, yMid); bctx.lineTo(w * 0.94, yMid);
    bctx.stroke();

    // Subtle machined fastener pins
    if (o.pins !== false) {
      const pinColor = o.pinColor || 'rgba(14,18,24,0.58)';
      const pinRing = o.pinRing || 'rgba(255,255,255,0.22)';
      const pr = Math.max(1.8, h * 0.013);
      for (const [px, py] of [[0.28, 0.56], [0.44, 0.56], [0.64, 0.52]]) {
        actx.fillStyle = pinColor;
        actx.beginPath(); actx.arc(w * px, h * py, pr, 0, Math.PI * 2); actx.fill();
        actx.strokeStyle = pinRing;
        actx.lineWidth = Math.max(0.7, pr * 0.35);
        actx.stroke();
        bctx.fillStyle = 'rgb(70,70,70)';
        bctx.beginPath(); bctx.arc(w * px, h * py, pr * 1.1, 0, Math.PI * 2); bctx.fill();
      }
    }

    actx.restore();
    bctx.restore();
  }

  // Helper to paint an angled polygon consistently across albedo, rm, and bump
  function fillPoly(ctx, pts, style) {
    ctx.fillStyle = style;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ============================================================================
  // 1. PROCEDURAL KNIFE BLADE PBR SKIN PAINTER (ALL 12 KNIFE SKINS)
  // ============================================================================
  function skinCacheKey(item) {
    return `${item.skinId}_${item.patternSeed}_${item.specialTag || ''}`;
  }

  function paintSkinToCanvases(item, size) {
    const res = size || getProceduralTexSize();
    const key = skinCacheKey(item) + '_' + res;
    if (skinCanvasCache.has(key)) return skinCanvasCache.get(key);

    const { canvas: albedoCanvas, ctx: actx } = makeCanvas(res, res);
    const { canvas: roughCanvas, ctx: rmctx } = makeCanvas(res, res);
    const { canvas: bumpCanvas, ctx: bctx } = makeCanvas(res, res);
    const { canvas: emissiveCanvas, ctx: ectx } = makeCanvas(res, res);
    fillAll(ectx, '#000000', res, res);

    const skinId = item.skinId || 'vanilla';
    const seed = item.patternSeed || 0;
    const tag = item.specialTag || '';
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 90;
    const ox = KS.hash2D(seed, 11, 73) * 10;
    const oy = KS.hash2D(seed, 23, 89) * 10;
    let hasEmissive = false;

    if (skinId === 'arctic_veil') {
      // Fractured crystalline glacier facets with mirror frost sheen & icy edge glow
      fillAll(actx, '#78c4e8', res, res);
      fillAll(rmctx, rmStyle(0.18, 0.84), res, res);
      fillAll(bctx, bumpStyle(0.5), res, res);
      paintCrystalFacets(actx, rmctx, bctx, ectx, res, res, seed + 151, 9, 7, (cx, cy, idx) => {
        const h1 = seededRand(seed, idx, 37);
        const h2 = seededRand(seed, idx, 71);
        const lum = 0.60 + h1 * 0.38;
        const r = Math.round((108 + cx * 45 + h2 * 40) * lum);
        const g = Math.round((192 + (1 - cy) * 32 + h2 * 26) * lum);
        const b = Math.min(255, Math.round((238 + h1 * 17)));
        return {
          fill: `rgb(${r},${g},${b})`,
          stroke: 'rgba(232,252,255,0.58)',
          lineWidth: Math.max(0.9, res / 220),
          rough: 0.12 + (1 - h1) * 0.16,
          metal: 0.78 + h1 * 0.18,
          bump: 0.34 + h1 * 0.42,
          bumpStroke: 'rgb(215,215,215)',
          emissiveStroke: h2 > 0.62 ? 'rgba(130,234,255,0.42)' : null
        };
      });
      hasEmissive = true;
    } else if (skinId === 'ultraviolet') {
      // Stealth matte ceramic obsidian blade + razor-crisp satin anodized violet bevel/spine
      const grad = actx.createLinearGradient(0, 0, res, res);
      grad.addColorStop(0, '#171922');
      grad.addColorStop(0.5, '#1e212d');
      grad.addColorStop(1, '#12141c');
      fillAll(actx, grad, res, res);
      fillAll(rmctx, rmStyle(0.76, 0.16), res, res);
      fillAll(bctx, bumpStyle(0.48), res, res);
      paintBrushedMetal(actx, bctx, res, res, seed + 9, 0.035, true);

      // Anodized ultraviolet upper fuller & geometric slash near tang
      const uvGrad = actx.createLinearGradient(0, 0, res, 0);
      uvGrad.addColorStop(0, '#5a2be2');
      uvGrad.addColorStop(0.55, '#8648ff');
      uvGrad.addColorStop(1, '#6834e8');
      actx.fillStyle = uvGrad;
      actx.fillRect(0, res * 0.78, res, res * 0.22);
      rmctx.fillStyle = rmStyle(0.24, 0.86);
      rmctx.fillRect(0, res * 0.78, res, res * 0.22);
      bctx.fillStyle = bumpStyle(0.62);
      bctx.fillRect(0, res * 0.78, res, res * 0.22);

      // Subtle glowing violet edge line separating ceramic & anodized spine
      actx.fillStyle = '#b48bff';
      actx.fillRect(0, res * 0.768, res, res * 0.015);
      ectx.fillStyle = 'rgba(138,76,255,0.55)';
      ectx.fillRect(0, res * 0.768, res, res * 0.015);
      hasEmissive = true;
    } else if (skinId === 'vanilla') {
      // Precision satin stainless steel with fine directional belt-grind & mirror fuller
      const sg = actx.createLinearGradient(0, 0, 0, res);
      sg.addColorStop(0, '#c8d4de');
      sg.addColorStop(0.35, '#a2b0bc');
      sg.addColorStop(0.65, '#bcc8d4');
      sg.addColorStop(1, '#8d9ba8');
      fillAll(actx, sg, res, res);
      fillAll(rmctx, rmStyle(0.26, 0.95), res, res);
      fillAll(bctx, bumpStyle(0.50), res, res);
      paintBrushedMetal(actx, bctx, res, res, 17, 0.08, false);
      paintBrushedMetal(actx, bctx, res, res, 53, 0.04, true);
    } else if (skinId === 'crimson_web') {
      // Deep candy-crimson metallic lacquer with fine woven under-mesh & razor spider webs
      const cg = actx.createRadialGradient(res * 0.45, res * 0.45, res * 0.05, res * 0.5, res * 0.5, res * 0.78);
      cg.addColorStop(0, '#d81c2e');
      cg.addColorStop(0.65, '#9d0e1c');
      cg.addColorStop(1, '#5c0710');
      fillAll(actx, cg, res, res);
      fillAll(rmctx, rmStyle(0.30, 0.52), res, res);
      fillAll(bctx, bumpStyle(0.52), res, res);
      paintHexOverlay(actx, bctx, res, res, Math.max(4, res / 42), 'rgba(255,80,96,0.08)', 0.7, 0.14);
      paintSpiderWebs(actx, bctx, res, res, seed, 3, 'rgba(8,6,10,0.94)', 'rgba(255,88,104,0.28)');
    } else {
      // High-craft organic metallic pixel finishes: case_hardened, doppler, fade, marble_fade, tiger_tooth, damascus, slaughter, emberstrike
      const aImg = actx.createImageData(res, res);
      const rmImg = rmctx.createImageData(res, res);
      const bImg = bctx.createImageData(res, res);
      const eImg = ectx.createImageData(res, res);
      const ad = aImg.data;
      const rmd = rmImg.data;
      const bd = bImg.data;
      const ed = eImg.data;

      for (let py = 0; py < res; py++) {
        const v = py / (res - 1);
        for (let px = 0; px < res; px++) {
          const u = px / (res - 1);
          const idx = (py * res + px) * 4;
          const grind = KS.fbm2D(u * 4.5, v * 58, 17, 2);
          let r = 180, g = 188, b = 198;
          let rough = 0.22;
          let metal = 0.94;
          let bump = 0.50;
          let er = 0, eg = 0, eb = 0;

          if (skinId === 'case_hardened') {
            const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
            const patina = KS.fbm2D(u * 12 + ox, v * 12 + oy, seed + 71, 2);
            const quench = 0.90 + patina * 0.18;
            r = ch.r * quench;
            g = ch.g * quench;
            b = ch.b * quench;
            if (ch.isBlue) {
              // Deep electric quench cobalt polish
              b = Math.min(255, b * 1.08);
              rough = 0.12 + (1 - patina) * 0.08;
              metal = 0.96;
            } else if (ch.isGold) {
              rough = 0.18 + (1 - patina) * 0.08;
              metal = 0.94;
            } else {
              rough = 0.28 + (1 - patina) * 0.12;
              metal = 0.88;
            }
            bump = 0.48 + (patina - 0.5) * 0.14 + (grind - 0.5) * 0.08;
          } else if (skinId === 'doppler') {
            hasEmissive = true;
            const wx = KS.fbm2D(u * 2.8 + ox, v * 2.8 + oy, seed + 13, 3);
            const wy = KS.fbm2D(u * 2.8 + ox + 4.3, v * 2.8 + oy + 2.9, seed + 29, 3);
            const sw = KS.fbm2D((u + (wx - 0.5) * 1.05) * 4.2 + ox, (v + (wy - 0.5) * 1.05) * 4.2 + oy, seed + 53, 4);
            const wisp = Math.sin((u * 5.0 + v * 2.6 + sw * 5.6) * Math.PI) * 0.5 + 0.5;
            const smoke = KS.fbm2D(u * 7.2 + wy * 1.5, v * 7.2 + wx * 1.5, seed + 97, 3);
            const t = Math.max(0, Math.min(1, sw * 0.60 + wisp * 0.30 + smoke * 0.10));
            const hot = Math.pow(t, 1.45);
            const gemCore = Math.pow(Math.max(0, t - 0.42) / 0.58, 1.8);
            metal = 0.92;
            rough = 0.08 + (1 - t) * 0.12;
            bump = 0.48 + wisp * 0.08 + (grind - 0.5) * 0.05;

            if (tag === 'RUBY') {
              r = 140 + hot * 115; g = 8 + hot * 32; b = 22 + hot * 48;
              er = gemCore * 165; eg = gemCore * 14; eb = gemCore * 30;
            } else if (tag === 'SAPPHIRE') {
              r = 12 + hot * 48; g = 42 + hot * 138; b = 164 + hot * 91;
              er = gemCore * 18; eg = gemCore * 90; eb = gemCore * 185;
            } else if (tag === 'BLACK PEARL') {
              r = 22 + hot * 96 + smoke * 28; g = 14 + hot * 44; b = 42 + hot * 134;
              er = gemCore * 76; eg = gemCore * 28; eb = gemCore * 130;
            } else if (tag === 'PHASE 2') {
              const p = Math.max(0, Math.min(1, (t - 0.20) * 1.38));
              r = 24 + p * 231; g = 10 + p * 48; b = 48 + p * 150;
              er = gemCore * 145; eg = gemCore * 18; eb = gemCore * 98;
            } else if (tag === 'PHASE 4') {
              const p = Math.max(0, Math.min(1, (t - 0.22) * 1.38));
              r = 12 + p * 34; g = 28 + p * 124; b = 54 + p * 201;
              er = gemCore * 14; eg = gemCore * 82; eb = gemCore * 160;
            } else if (tag === 'PHASE 3') {
              const teal = Math.max(0, Math.min(1, (smoke - 0.34) * 1.85));
              r = 12 + t * 24; g = 30 + t * 96 + teal * 74; b = 48 + t * 164;
              er = gemCore * 12; eg = gemCore * 115; eb = gemCore * 125;
            } else {
              const ruby = Math.max(0, Math.min(1, (t - 0.30) * 1.65));
              r = 20 + ruby * 195; g = 10 + ruby * 24; b = 40 + t * 94;
              er = gemCore * 135; eg = gemCore * 12; eb = gemCore * 62;
            }
          } else if (skinId === 'fade') {
            const shift = (fadePct - 80) / 20;
            const pos = Math.max(0, Math.min(1, u * 1.12 - (1 - shift) * 0.20 + (v - 0.5) * 0.12));
            if (pos < 0.16) {
              const t = pos / 0.16;
              r = 204 + t * 48; g = 210 + t * 12; b = 220 - t * 88;
            } else if (pos < 0.46) {
              const t = (pos - 0.16) / 0.30;
              r = 252; g = 202 - t * 132; b = 62 + t * 116;
            } else if (pos < 0.76) {
              const t = (pos - 0.46) / 0.30;
              r = 250 - t * 124; g = 70 - t * 26; b = 178 + t * 66;
            } else {
              const t = (pos - 0.76) / 0.24;
              r = 126 - t * 44; g = 44 - t * 10; b = 244 + t * 11;
            }
            rough = 0.10 + (1 - grind) * 0.04;
            metal = 0.96;
            bump = 0.49 + (grind - 0.5) * 0.06;
          } else if (skinId === 'marble_fade') {
            const wave = KS.fbm2D(u * 2.4 + ox, v * 2.4 + oy, seed + 17, 3);
            const band = ((u * 1.28 + (wave - 0.5) * 0.50 + (seed % 100) * 0.01) % 1 + 1) % 1;
            if (tag === 'FIRE & ICE') {
              const t = Math.sin((u * 1.7 + wave * 0.95) * Math.PI) * 0.5 + 0.5;
              r = 14 + t * 238; g = 22 + (1 - Math.abs(t - 0.5) * 2) * 26; b = 252 - t * 220;
            } else if (band < 0.34) {
              const t = band / 0.34;
              r = 244 - t * 222; g = 26 + t * 66; b = 38 + t * 212;
            } else if (band < 0.68) {
              const t = (band - 0.34) / 0.34;
              r = 22 + t * 230; g = 92 + t * 118; b = 250 - t * 210;
            } else {
              const t = (band - 0.68) / 0.32;
              r = 252 - t * 8; g = 210 - t * 184; b = 40 - t * 2;
            }
            rough = 0.11 + (1 - grind) * 0.05;
            metal = 0.95;
            bump = 0.49 + (grind - 0.5) * 0.06;
          } else if (skinId === 'tiger_tooth') {
            const warp1 = KS.fbm2D(u * 3.6 + ox, v * 3.6 + oy, seed + 37, 3);
            const warp2 = KS.fbm2D(u * 8.5 + ox, v * 4.8 + oy, seed + 61, 2);
            const phase = (u * 13.0 + v * 3.6 + warp1 * 2.5 + (warp2 - 0.5) * 0.55) * Math.PI;
            const stripeVal = Math.sin(phase);
            const taper = 0.36 + 0.24 * Math.sin(v * Math.PI * 2.2 + warp1 * 3.0);
            const edgeBlend = Math.max(0, Math.min(1, (stripeVal - taper) * 5.0));
            const sheen = 0.88 + 0.12 * KS.fbm2D(u * 8, v * 8, seed + 5, 2);
            const gr = 252 * sheen, gg = 194 * sheen, gb = 40 * sheen;
            const sr = 58, sg = 34, sb = 10;
            r = gr + (sr - gr) * edgeBlend;
            g = gg + (sg - gg) * edgeBlend;
            b = gb + (sb - gb) * edgeBlend;
            rough = 0.11 + edgeBlend * 0.28;
            metal = 0.96 - edgeBlend * 0.22;
            bump = 0.55 - edgeBlend * 0.20 + (grind - 0.5) * 0.06;
          } else if (skinId === 'damascus') {
            const w1 = KS.fbm2D(u * 3.0 + ox, v * 3.0 + oy, seed + 7, 4);
            const w2 = KS.fbm2D(u * 7.0 + w1 * 2.4, v * 7.0 + w1 * 2.4, seed + 43, 3);
            const wave = Math.sin((u * 5.6 + v * 4.6 + w1 * 5.8 + w2 * 1.4) * Math.PI * 2) * 0.5 + 0.5;
            const band = Math.pow(wave, 0.78);
            const lum = 72 + band * 168;
            r = lum * 0.95; g = lum * 0.99; b = Math.min(255, lum * 1.07);
            rough = 0.14 + (1 - band) * 0.34;
            metal = 0.95;
            bump = 0.32 + band * 0.38;
          } else if (skinId === 'slaughter') {
            const angle = 0.62 + (seed % 7) * 0.14;
            const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
            const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
            const w = KS.fbm2D(su * 4.8, sv * 4.8, seed + 23, 2);
            const zebra = Math.sin((su * 14.0 + Math.sin(sv * 8.2 + w * 2.0) * 1.12) * Math.PI) * 0.5 + 0.5;
            const diamond = Math.pow(Math.abs(Math.sin(su * 5.0) * Math.sin(sv * 5.0)), 0.75);
            const band = Math.min(1, zebra * 0.56 + diamond * 0.54);
            r = 104 + band * 150;
            g = 12 + Math.pow(band, 1.85) * 90;
            b = 22 + Math.pow(band, 1.75) * 86;
            rough = 0.12 + (1 - band) * 0.22;
            metal = 0.92;
            bump = 0.44 + band * 0.18;
          } else if (skinId === 'emberstrike') {
            hasEmissive = true;
            const flow = KS.fbm2D(u * 4.6 + ox, v * 3.8 + oy, seed + 83, 4);
            const crackle = KS.fbm2D(u * 15 + ox, v * 11 + oy, seed + 127, 3);
            const ridge = 1 - Math.abs(Math.sin((u * 7.5 + v * 3.0 + flow * 5.4) * Math.PI));
            const heat = Math.max(0, Math.min(1, (ridge * 0.58 + crackle * 0.52 - 0.62) / 0.38));
            const edgeHeat = Math.max(0, (0.14 - v) / 0.14);
            const glow = Math.min(1, Math.pow(heat, 1.35) + edgeHeat * 0.65);
            if (glow > 0.08) {
              r = 255;
              g = 64 + glow * 174;
              b = 12 + Math.pow(glow, 2.2) * 136;
              er = 255 * glow;
              eg = (55 + glow * 155) * glow;
              eb = 10 * glow;
              rough = 0.22;
              metal = 0.30;
              bump = 0.62 + glow * 0.24;
            } else {
              const steel = 24 + flow * 28;
              r = steel * 1.05; g = steel; b = steel * 1.15;
              rough = 0.52;
              metal = 0.82;
              bump = 0.36 + crackle * 0.22;
            }
          }

          // Subtle honed mirror bevel along the cutting edge (v < 0.085) for realism
          if (v < 0.085 && skinId !== 'emberstrike') {
            const edgeT = (0.085 - v) / 0.085;
            r = r + (236 - r) * edgeT * 0.34;
            g = g + (242 - g) * edgeT * 0.34;
            b = b + (248 - b) * edgeT * 0.34;
            rough = Math.max(0.06, rough * (1 - edgeT * 0.55));
            metal = Math.min(0.99, metal + edgeT * 0.12);
          }

          ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
          ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
          ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
          ad[idx + 3] = 255;

          rmd[idx] = 255;
          rmd[idx + 1] = Math.max(14, Math.min(248, Math.round(rough * 255)));
          rmd[idx + 2] = Math.max(0, Math.min(255, Math.round(metal * 255)));
          rmd[idx + 3] = 255;

          const bv = Math.max(0, Math.min(255, Math.round(bump * 255)));
          bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;

          ed[idx] = Math.max(0, Math.min(255, Math.round(er)));
          ed[idx + 1] = Math.max(0, Math.min(255, Math.round(eg)));
          ed[idx + 2] = Math.max(0, Math.min(255, Math.round(eb)));
          ed[idx + 3] = 255;
        }
      }

      actx.putImageData(aImg, 0, 0);
      rmctx.putImageData(rmImg, 0, 0);
      bctx.putImageData(bImg, 0, 0);
      if (hasEmissive) ectx.putImageData(eImg, 0, 0);
    }

    const result = { albedoCanvas, roughCanvas, bumpCanvas, emissiveCanvas: hasEmissive ? emissiveCanvas : null };
    if (skinCanvasCache.size > 48) {
      const firstKey = skinCanvasCache.keys().next().value;
      skinCanvasCache.delete(firstKey);
    }
    skinCanvasCache.set(key, result);
    return result;
  }

  function createBladeMaterial(item, targetRenderer) {
    const { albedoCanvas, roughCanvas, bumpCanvas, emissiveCanvas } = paintSkinToCanvases(item);
    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const rmTex = new THREE.CanvasTexture(roughCanvas);
    rmTex.wrapS = THREE.ClampToEdgeWrapping;
    rmTex.wrapT = THREE.ClampToEdgeWrapping;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    bumpMap.wrapT = THREE.ClampToEdgeWrapping;

    let emissiveMap = null;
    if (emissiveCanvas) {
      emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
      emissiveMap.colorSpace = THREE.SRGBColorSpace;
      emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
      emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
    }

    const skinId = item.skinId || 'vanilla';
    const isGem = skinId === 'doppler' || skinId === 'fade' || skinId === 'marble_fade' || skinId === 'tiger_tooth' || skinId === 'arctic_veil' || skinId === 'emberstrike';
    const iri = skinId === 'fade' ? 0.55 : skinId === 'doppler' ? 0.48 : skinId === 'case_hardened' ? 0.42 : skinId === 'marble_fade' ? 0.36 : skinId === 'arctic_veil' ? 0.38 : 0.0;

    return new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap: rmTex,
      metalnessMap: rmTex,
      bumpMap,
      bumpScale: skinId === 'damascus' || skinId === 'emberstrike' ? 0.0030 : 0.0016,
      roughness: 1.0,
      metalness: 1.0,
      clearcoat: isGem ? 0.96 : skinId === 'slaughter' ? 0.78 : skinId === 'case_hardened' ? 0.62 : 0.25,
      clearcoatRoughness: isGem ? 0.06 : 0.16,
      iridescence: iri,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [150, 480],
      emissive: emissiveMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveMap,
      emissiveIntensity: skinId === 'emberstrike' ? 1.35 : skinId === 'doppler' ? 0.55 : skinId === 'arctic_veil' ? 0.35 : 0.45,
      envMapIntensity: isGem ? 1.82 : 1.44
    });
  }

  // ============================================================================
  // 2. PROCEDURAL GLOVE PBR PAINTER (ALL 16 GLOVE SKINS)
  // ============================================================================
  const GLOVE_PALETTES = Object.freeze({
    tactical_slate: { palm: 0x131922, knuckle: 0x2c3b4c, cuff: 0x45d2f2, cuffEmissive: 0x0b4b5c, sleeve: 0x0f161f, metal: 0.14, rough: 0.78 },
    case_hardened:  { palm: 0x19232f, knuckle: 0x2c8ae2, cuff: 0xedc05c, cuffEmissive: 0x2e2008, sleeve: 0x111720, metal: 0.62, rough: 0.36 },
    vice:           { palm: 0x181c26, knuckle: 0x28ecff, cuff: 0xff3ed2, cuffEmissive: 0x4e0c3d, sleeve: 0x111622, metal: 0.16, rough: 0.62 },
    pandoras_box:   { palm: 0x151326, knuckle: 0x2ce2dc, cuff: 0x8e52ff, cuffEmissive: 0x2c115c, sleeve: 0x0f0e1a, metal: 0.22, rough: 0.60 },
    hedge_maze:     { palm: 0x16241b, knuckle: 0xf4faf6, cuff: 0x28ec76, cuffEmissive: 0x083e1f, sleeve: 0x101913, metal: 0.14, rough: 0.64 },
    slingshot:      { palm: 0xe6d6be, knuckle: 0x1c1a1d, cuff: 0xf43636, cuffEmissive: 0x460a10, sleeve: 0x161416, metal: 0.14, rough: 0.66 },
    crimson_kimono: { palm: 0x171418, knuckle: 0x201e24, cuff: 0xec283b, cuffEmissive: 0x46090e, sleeve: 0x111014, metal: 0.24, rough: 0.64 },
    emerald_web:    { palm: 0x0f1d15, knuckle: 0x16271d, cuff: 0x24e674, cuffEmissive: 0x08421f, sleeve: 0x0e1511, metal: 0.24, rough: 0.64 },
    fade:           { palm: 0x1d1d28, knuckle: 0x382a4e, cuff: 0xff6ad8, cuffEmissive: 0x421236, sleeve: 0x12131c, metal: 0.48, rough: 0.42 },
    leather:        { palm: 0x4c2f1c, knuckle: 0x764b2c, cuff: 0xb27848, cuffEmissive: 0x1c0e06, sleeve: 0x181412, metal: 0.08, rough: 0.82 },
    slaughter:      { palm: 0x2a1419, knuckle: 0xa41c2e, cuff: 0xe83852, cuffEmissive: 0x400b13, sleeve: 0x161114, metal: 0.20, rough: 0.64 },
    cobalt_skulls:  { palm: 0x0f1c34, knuckle: 0x2666e0, cuff: 0x72c2ff, cuffEmissive: 0x0b2952, sleeve: 0x0d1522, metal: 0.14, rough: 0.72 },
    overprint:      { palm: 0x0c2026, knuckle: 0x18b4b4, cuff: 0x44f8ec, cuffEmissive: 0x08403d, sleeve: 0x0b161a, metal: 0.14, rough: 0.70 },
    breachline:     { palm: 0x15191c, knuckle: 0x364046, cuff: 0xf8a638, cuffEmissive: 0x4e2b08, sleeve: 0x0d1116, metal: 0.28, rough: 0.68 },
    stormgrid:      { palm: 0x0f1b32, knuckle: 0x285ea4, cuff: 0x4ee0ff, cuffEmissive: 0x0b3858, sleeve: 0x0c1424, metal: 0.22, rough: 0.64 },
    eclipse_mantle: { palm: 0x14171b, knuckle: 0x3e3a30, cuff: 0xd4a456, cuffEmissive: 0x442f12, sleeve: 0x0d1517, metal: 0.46, rough: 0.50 }
  });

  function gloveCacheKey(item) {
    const gt = (item && item.gloveType) || 'standard';
    const sk = (item && item.skinId) || 'tactical_slate';
    const sd = (item && item.patternSeed) || 0;
    return `glv_${gt}_${sk}_${sd}`;
  }

  function paintGloveToCanvases(gloveItem, size) {
    const res = size || getProceduralTexSize();
    const item = KS.sanitizeGloveItem(gloveItem || KS.createStarterGlove());
    const key = gloveCacheKey(item) + '_' + res;
    if (gloveCanvasCache.has(key)) return gloveCanvasCache.get(key);

    const { canvas: albedoCanvas, ctx: actx } = makeCanvas(res, res);
    const { canvas: roughCanvas, ctx: rctx } = makeCanvas(res, res);
    const { canvas: bumpCanvas, ctx: bctx } = makeCanvas(res, res);

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const palette = GLOVE_PALETTES[skinId] || GLOVE_PALETTES.tactical_slate;
    const ox = KS.hash2D(seed, 13, 59) * 10;
    const oy = KS.hash2D(seed, 29, 83) * 10;
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;

    // Default crisp athletic ballistic weave base
    fillAll(rctx, 'rgb(218,218,218)', res, res);
    fillAll(bctx, bumpStyle(0.50), res, res);

    if (skinId === 'tactical_slate') {
      paintCarbonFiber(actx, rctx, bctx, res, res, res / 44, '#1b242f', '#2b394a', 0.74, 0.88, 0.14);
      // Clean cyan surf piping stripes
      actx.fillStyle = '#38d8f6';
      actx.fillRect(0, res * 0.16, res, res * 0.032);
      actx.fillRect(0, res * 0.80, res, res * 0.022);
      bctx.fillStyle = bumpStyle(0.72);
      bctx.fillRect(0, res * 0.16, res, res * 0.032);
    } else if (skinId === 'vice') {
      // Crisp CS2 Sport Gloves | Vice: hot magenta + electric cyan athletic mesh split by matte black piping
      fillAll(actx, '#151822', res, res);
      const shift = ((seed % 7) - 3) * 0.035;
      const gPink = actx.createLinearGradient(0, 0, res, res);
      gPink.addColorStop(0, '#ff3cc8');
      gPink.addColorStop(1, '#f02698');
      const gCyan = actx.createLinearGradient(0, 0, res, res);
      gCyan.addColorStop(0, '#1ee6ff');
      gCyan.addColorStop(1, '#08b8e6');

      fillPoly(actx, [[0, 0], [res * (0.66 + shift), 0], [res * (0.34 + shift), res], [0, res]], gPink);
      fillPoly(actx, [[res * (0.74 + shift), 0], [res, 0], [res, res], [res * (0.42 + shift), res]], gCyan);

      // Clean white piping edge along diagonal seam
      actx.strokeStyle = 'rgba(255,255,255,0.68)';
      actx.lineWidth = Math.max(1.4, res / 110);
      actx.beginPath();
      actx.moveTo(res * (0.66 + shift), 0); actx.lineTo(res * (0.34 + shift), res);
      actx.moveTo(res * (0.74 + shift), 0); actx.lineTo(res * (0.42 + shift), res);
      actx.stroke();

      paintHexOverlay(actx, bctx, res, res, Math.max(4, res / 34), 'rgba(10,12,20,0.22)', Math.max(0.8, res / 220), 0.32);
      fillAll(rctx, 'rgb(206,206,206)', res, res);
    } else if (skinId === 'pandoras_box') {
      // Deep royal violet diamond quilt + luminous aquamarine diagonal geometric ribs
      const pg = actx.createLinearGradient(0, 0, res, res);
      pg.addColorStop(0, '#4f22a8');
      pg.addColorStop(0.5, '#7238d8');
      pg.addColorStop(1, '#3b1682');
      fillAll(actx, pg, res, res);
      paintHexOverlay(actx, bctx, res, res, Math.max(5, res / 26), 'rgba(18,10,36,0.45)', Math.max(1.2, res / 150), 0.36);

      // Aquamarine chevron framing band
      const s = ((seed % 7) - 3) * 0.04;
      fillPoly(actx, [[0, res * (0.42 + s)], [res, res * (0.20 + s)], [res, res * (0.36 + s)], [0, res * (0.58 + s)]], '#141224');
      fillPoly(actx, [[0, res * (0.45 + s)], [res, res * (0.23 + s)], [res, res * (0.33 + s)], [0, res * (0.55 + s)]], '#2ce6dc');
      bctx.fillStyle = bumpStyle(0.70);
      fillPoly(bctx, [[0, res * (0.45 + s)], [res, res * (0.23 + s)], [res, res * (0.33 + s)], [0, res * (0.55 + s)]], bumpStyle(0.70));
      fillAll(rctx, 'rgb(202,202,202)', res, res);
    } else if (skinId === 'hedge_maze') {
      // Deep emerald athletic shell with crisp geometric neon-lime labyrinth & chalk white ribs
      fillAll(actx, '#0f3d24', res, res);
      const step = res / 10;
      actx.strokeStyle = '#2ee878';
      actx.lineWidth = Math.max(2, step * 0.28);
      actx.lineCap = 'square';
      bctx.strokeStyle = bumpStyle(0.76);
      bctx.lineWidth = actx.lineWidth;
      for (let gy = 0; gy < 10; gy++) {
        for (let gx = 0; gx < 10; gx++) {
          const h = KS.hash2D(gx + seed, gy, 193);
          const x = gx * step, y = gy * step;
          actx.beginPath(); bctx.beginPath();
          if (h > 0.5) {
            actx.moveTo(x, y + step * 0.5); actx.lineTo(x + step, y + step * 0.5);
            actx.moveTo(x + step * 0.5, y); actx.lineTo(x + step * 0.5, y + step * 0.5);
            bctx.moveTo(x, y + step * 0.5); bctx.lineTo(x + step, y + step * 0.5);
          } else {
            actx.moveTo(x + step * 0.5, y); actx.lineTo(x + step * 0.5, y + step);
            actx.moveTo(x, y + step * 0.5); actx.lineTo(x + step * 0.5, y + step * 0.5);
            bctx.moveTo(x + step * 0.5, y); bctx.lineTo(x + step * 0.5, y + step);
          }
          actx.stroke(); bctx.stroke();
        }
      }
      // Crisp white athletic stripe
      fillPoly(actx, [[0, res * 0.72], [res, res * 0.52], [res, res * 0.62], [0, res * 0.82]], '#f2f8f4');
      fillAll(rctx, 'rgb(212,212,212)', res, res);
    } else if (skinId === 'slingshot') {
      // Motorsport scarlet-red honeycomb upper, matte charcoal divider, chalk white stripe, bone leather lower
      fillAll(actx, '#df262c', res, res);
      paintHexOverlay(actx, bctx, res, res, Math.max(4, res / 32), 'rgba(70,8,12,0.34)', Math.max(0.9, res / 210), 0.28);
      fillPoly(actx, [[0, res * 0.56], [res, res * 0.44], [res, res * 0.58], [0, res * 0.70]], '#1a1b22');
      fillPoly(actx, [[0, res * 0.66], [res, res * 0.54], [res, res * 0.63], [0, res * 0.75]], '#f6f4ee');
      fillPoly(actx, [[0, res * 0.75], [res, res * 0.63], [res, res], [0, res]], '#d8c8ae');
      fillAll(rctx, 'rgb(214,214,214)', res, res);
    } else if (skinId === 'crimson_kimono') {
      // Graphite ballistic nylon + diagonal scarlet Japanese diamond brocade zone
      fillAll(actx, '#1e2028', res, res);
      const shift = (KS.hash2D(seed, 9, 41) - 0.5) * 0.32;
      fillPoly(actx, [[res * (0.28 + shift), 0], [res, 0], [res, res], [res * (0.04 + shift), res]], '#b81424');
      // Crisp geometric diamond lattice overlay
      const step = res / 12;
      actx.strokeStyle = 'rgba(255,58,76,0.45)';
      actx.lineWidth = Math.max(1.2, res / 160);
      bctx.strokeStyle = bumpStyle(0.70);
      bctx.lineWidth = actx.lineWidth;
      for (let i = -12; i <= 24; i++) {
        actx.beginPath(); bctx.beginPath();
        actx.moveTo(i * step, 0); actx.lineTo((i + 12) * step, res);
        actx.moveTo(i * step, 0); actx.lineTo((i - 12) * step, res);
        bctx.moveTo(i * step, 0); bctx.lineTo((i + 12) * step, res);
        bctx.moveTo(i * step, 0); bctx.lineTo((i - 12) * step, res);
        actx.stroke(); bctx.stroke();
      }
      fillAll(rctx, 'rgb(210,210,210)', res, res);
    } else if (skinId === 'emerald_web') {
      const eg = actx.createRadialGradient(res * 0.5, res * 0.5, res * 0.08, res * 0.5, res * 0.5, res * 0.74);
      eg.addColorStop(0, '#1ed872');
      eg.addColorStop(0.65, '#0e8c48');
      eg.addColorStop(1, '#084824');
      fillAll(actx, eg, res, res);
      paintHexOverlay(actx, bctx, res, res, Math.max(4, res / 34), 'rgba(6,28,16,0.28)', 0.9, 0.22);
      paintSpiderWebs(actx, bctx, res, res, seed, 3, 'rgba(6,14,10,0.92)', 'rgba(100,255,165,0.25)');
      fillAll(rctx, 'rgb(206,206,206)', res, res);
    } else if (skinId === 'leather') {
      // Rich saddle-brown hide strips with diagonal overlap shadows & cream waxed stitching
      const lg = actx.createLinearGradient(0, 0, res, res);
      lg.addColorStop(0, '#8a522c');
      lg.addColorStop(0.5, '#6d3e1f');
      lg.addColorStop(1, '#542d14');
      fillAll(actx, lg, res, res);
      paintBrushedMetal(actx, bctx, res, res, seed + 7, 0.06, true);
      const bands = 6;
      for (let i = 0; i <= bands; i++) {
        const y = (i / bands) * res;
        actx.strokeStyle = 'rgba(26,12,6,0.85)';
        actx.lineWidth = Math.max(2, res / 85);
        actx.beginPath(); actx.moveTo(0, y); actx.lineTo(res, y); actx.stroke();
        bctx.strokeStyle = bumpStyle(0.18);
        bctx.lineWidth = Math.max(2.5, res / 75);
        bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(res, y); bctx.stroke();

        // Waxed cream thread dashes along strap edges
        actx.strokeStyle = '#ebd4b0';
        actx.lineWidth = Math.max(1.2, res / 150);
        actx.setLineDash([res / 28, res / 36]);
        actx.beginPath();
        actx.moveTo(0, y + res / 40); actx.lineTo(res, y + res / 40);
        actx.stroke();
        actx.setLineDash([]);
      }
      fillAll(rctx, 'rgb(228,228,228)', res, res);
    } else if (skinId === 'cobalt_skulls') {
      const bg = actx.createLinearGradient(0, 0, res, res);
      bg.addColorStop(0, '#1648a8');
      bg.addColorStop(0.5, '#1d5cd0');
      bg.addColorStop(1, '#0e2d72');
      fillAll(actx, bg, res, res);
      paintBrushedMetal(actx, bctx, res, res, seed + 23, 0.05, true);
      // Crisp angular frost-white skulls & crossbones
      for (let i = 0; i < 9; i++) {
        const sx = (0.12 + KS.hash2D(seed, i * 17, 311) * 0.76) * res;
        const sy = (0.12 + KS.hash2D(seed, i * 29, 419) * 0.76) * res;
        const rad = res * (0.052 + KS.hash2D(seed, i * 37, 503) * 0.022);
        const rot = (KS.hash2D(seed, i * 41, 613) - 0.5) * 1.1;
        actx.save();
        actx.translate(sx, sy);
        actx.rotate(rot);
        actx.strokeStyle = 'rgba(186,230,255,0.78)';
        actx.lineWidth = Math.max(1.8, rad * 0.24);
        actx.lineCap = 'round';
        actx.beginPath();
        actx.moveTo(-rad * 1.15, -rad * 0.65); actx.lineTo(rad * 1.15, rad * 0.75);
        actx.moveTo(rad * 1.15, -rad * 0.65); actx.lineTo(-rad * 1.15, rad * 0.75);
        actx.stroke();
        actx.fillStyle = '#e8f5ff';
        actx.beginPath();
        actx.moveTo(0, -rad * 1.05);
        actx.lineTo(rad * 0.84, -rad * 0.60);
        actx.lineTo(rad * 0.92, rad * 0.08);
        actx.lineTo(rad * 0.54, rad * 0.44);
        actx.lineTo(rad * 0.48, rad * 0.94);
        actx.lineTo(-rad * 0.48, rad * 0.94);
        actx.lineTo(-rad * 0.54, rad * 0.44);
        actx.lineTo(-rad * 0.92, rad * 0.08);
        actx.lineTo(-rad * 0.84, -rad * 0.60);
        actx.closePath();
        actx.fill();
        actx.fillStyle = '#0d2354';
        actx.beginPath();
        actx.moveTo(-rad * 0.58, -rad * 0.20); actx.lineTo(-rad * 0.16, -rad * 0.08); actx.lineTo(-rad * 0.24, rad * 0.20); actx.lineTo(-rad * 0.56, rad * 0.14); actx.closePath();
        actx.moveTo(rad * 0.58, -rad * 0.20); actx.lineTo(rad * 0.16, -rad * 0.08); actx.lineTo(rad * 0.24, rad * 0.20); actx.lineTo(rad * 0.56, rad * 0.14); actx.closePath();
        actx.moveTo(0, rad * 0.14); actx.lineTo(rad * 0.14, rad * 0.42); actx.lineTo(-rad * 0.14, rad * 0.42); actx.closePath();
        actx.fill();
        actx.fillRect(-rad * 0.28, rad * 0.60, rad * 0.10, rad * 0.32);
        actx.fillRect(-rad * 0.05, rad * 0.60, rad * 0.10, rad * 0.32);
        actx.fillRect(rad * 0.18, rad * 0.60, rad * 0.10, rad * 0.32);
        actx.restore();
      }
      fillAll(rctx, 'rgb(218,218,218)', res, res);
    } else if (skinId === 'overprint') {
      fillAll(actx, '#0c242c', res, res);
      const bands = 10;
      for (let i = -2; i < bands + 2; i++) {
        const y = (i / bands) * res;
        actx.strokeStyle = i % 2 === 0 ? '#2df0e4' : '#128a94';
        actx.lineWidth = Math.max(3, res / 24);
        actx.beginPath();
        actx.moveTo(0, y + res * 0.14);
        actx.lineTo(res * 0.5, y);
        actx.lineTo(res, y + res * 0.14);
        actx.stroke();
        bctx.strokeStyle = bumpStyle(i % 2 === 0 ? 0.68 : 0.42);
        bctx.lineWidth = actx.lineWidth;
        bctx.beginPath();
        bctx.moveTo(0, y + res * 0.14);
        bctx.lineTo(res * 0.5, y);
        bctx.lineTo(res, y + res * 0.14);
        bctx.stroke();
      }
      fillAll(rctx, 'rgb(216,216,216)', res, res);
    } else if (skinId === 'breachline') {
      paintCarbonFiber(actx, rctx, bctx, res, res, res / 42, '#1d2329', '#2f3840', 0.78, 0.90, 0.18);
      // Industrial amber hazard diagonal strip
      const bandTop = res * 0.32;
      const bandH = res * 0.26;
      actx.save();
      actx.beginPath();
      actx.rect(0, bandTop, res, bandH);
      actx.clip();
      fillAll(actx, '#f59f28', res, res);
      actx.fillStyle = '#14181e';
      for (let x = -res; x < res * 2; x += res * 0.18) {
        fillPoly(actx, [[x, bandTop], [x + res * 0.08, bandTop], [x - res * 0.04, bandTop + bandH], [x - res * 0.12, bandTop + bandH]], '#14181e');
      }
      actx.restore();
      bctx.fillStyle = bumpStyle(0.72);
      bctx.fillRect(0, bandTop, res, bandH);
      rctx.fillStyle = 'rgb(168,168,168)';
      rctx.fillRect(0, bandTop, res, bandH);
    } else if (skinId === 'stormgrid') {
      const sg = actx.createLinearGradient(0, 0, res, res);
      sg.addColorStop(0, '#0c1c3a');
      sg.addColorStop(0.5, '#16386c');
      sg.addColorStop(1, '#0b1830');
      fillAll(actx, sg, res, res);
      const step = res / 12;
      actx.strokeStyle = 'rgba(68,224,255,0.82)';
      actx.lineWidth = Math.max(1.1, res / 190);
      bctx.strokeStyle = bumpStyle(0.74);
      bctx.lineWidth = actx.lineWidth;
      for (let i = 0; i <= 12; i++) {
        const p = i * step;
        actx.beginPath(); bctx.beginPath();
        actx.moveTo(p, 0); actx.lineTo(p, res);
        actx.moveTo(0, p); actx.lineTo(res, p);
        bctx.moveTo(p, 0); bctx.lineTo(p, res);
        bctx.moveTo(0, p); bctx.lineTo(res, p);
        actx.stroke(); bctx.stroke();
      }
      fillAll(rctx, 'rgb(198,198,198)', res, res);
    } else if (skinId === 'eclipse_mantle') {
      paintCarbonFiber(actx, rctx, bctx, res, res, res / 42, '#14171d', '#242934', 0.68, 0.84, 0.24);
      // Brushed champagne gold armored ribs
      for (const y of [0.22, 0.48, 0.74]) {
        const gGold = actx.createLinearGradient(0, res * y, res, res * (y + 0.08));
        gGold.addColorStop(0, '#966d2e');
        gGold.addColorStop(0.5, '#e8bc68');
        gGold.addColorStop(1, '#8c6428');
        actx.fillStyle = gGold;
        actx.fillRect(0, res * y, res, res * 0.065);
        bctx.fillStyle = bumpStyle(0.78);
        bctx.fillRect(0, res * y, res, res * 0.065);
        rctx.fillStyle = 'rgb(122,122,122)';
        rctx.fillRect(0, res * y, res, res * 0.065);
      }
    } else {
      // Organic metallic gloves: case_hardened, fade, slaughter
      const aImg = actx.createImageData(res, res);
      const rImg = rctx.createImageData(res, res);
      const bImg = bctx.createImageData(res, res);
      const ad = aImg.data, rd = rImg.data, bd = bImg.data;
      for (let py = 0; py < res; py++) {
        const v = py / (res - 1);
        for (let px = 0; px < res; px++) {
          const u = px / (res - 1);
          const idx = (py * res + px) * 4;
          const twill = ((Math.floor(u * 52) + Math.floor(v * 52)) % 4 < 2) ? 1.04 : 0.95;
          const micro = KS.fbm2D(u * 18, v * 18, seed + 17, 2);
          let r = 34, g = 42, b = 52, rough = 190, bump = 128;

          if (skinId === 'case_hardened') {
            const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
            r = ch.r * (0.92 + micro * 0.12);
            g = ch.g * (0.92 + micro * 0.12);
            b = ch.b * (0.92 + micro * 0.12);
            rough = ch.isBlue ? 140 : 178;
            bump = 124 + micro * 24;
          } else if (skinId === 'fade') {
            const shift = (fadePct - 80) / 20;
            const pos = Math.max(0, Math.min(1, u * 1.08 + (v - 0.5) * 0.30 - (1 - shift) * 0.18));
            if (pos < 0.34) {
              const t = pos / 0.34;
              r = 250; g = 200 - t * 120; b = 60 + t * 108;
            } else if (pos < 0.70) {
              const t = (pos - 0.34) / 0.36;
              r = 248 - t * 118; g = 80 - t * 28; b = 168 + t * 70;
            } else {
              const t = (pos - 0.70) / 0.30;
              r = 130 - t * 44; g = 52 - t * 12; b = 238 + t * 16;
            }
            r *= twill; g *= twill; b *= twill;
            rough = 158;
          } else {
            // slaughter
            const angle = 0.62 + (seed % 7) * 0.14;
            const su = (u + ox * 0.08) * Math.cos(angle) - (v + oy * 0.08) * Math.sin(angle);
            const sv = (u + ox * 0.08) * Math.sin(angle) + (v + oy * 0.08) * Math.cos(angle);
            const zebra = Math.sin((su * 14 + Math.sin(sv * 8) * 0.95) * Math.PI) * 0.5 + 0.5;
            const diamond = Math.abs(Math.sin(su * 5) * Math.sin(sv * 5));
            const mix = Math.min(1, zebra * 0.60 + diamond * 0.52);
            r = (106 + mix * 142) * twill;
            g = (14 + mix * 54) * twill;
            b = (22 + mix * 58) * twill;
            rough = 178;
          }
          ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
          ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
          ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
          ad[idx + 3] = 255;
          rd[idx] = rough; rd[idx + 1] = rough; rd[idx + 2] = rough; rd[idx + 3] = 255;
          bd[idx] = bump; bd[idx + 1] = bump; bd[idx + 2] = bump; bd[idx + 3] = 255;
        }
      }
      actx.putImageData(aImg, 0, 0);
      rctx.putImageData(rImg, 0, 0);
      bctx.putImageData(bImg, 0, 0);
    }

    const result = { albedoCanvas, roughCanvas, bumpCanvas, palette };
    if (gloveCanvasCache.size > 48) {
      const firstKey = gloveCanvasCache.keys().next().value;
      gloveCanvasCache.delete(firstKey);
    }
    gloveCanvasCache.set(key, result);
    return result;
  }

  // ============================================================================
  // 3. PROCEDURAL FIREARM PBR SKIN PAINTER (ALL 32 WEAPON SKINS)
  // ============================================================================
  const WEAPON_UV_ASPECT = Object.freeze({
    rifle: 3.55, awp: 4.48, deagle: 1.75, revolver: 1.80, smg: 2.67, shotgun: 5.26,
    pistol: 1.89, famas: 3.15, scar: 4.08, honeybadger: 3.91, mp7: 2.52, sawedoff: 3.30,
    leverslug: 4.86, dmr: 4.08, scout: 4.70, g18: 1.48, usps: 2.50, akimbo: 1.76, katana: 8.83
  });
  const WEAPON_TEX_BUDGET = 2;

  function weaponTexDims(type, baseRes) {
    const uvAspect = WEAPON_UV_ASPECT[type] || 3.5;
    const budget = baseRes * baseRes * WEAPON_TEX_BUDGET;
    const W = Math.min(2048, Math.max(128, Math.round(Math.sqrt(budget * uvAspect) / 4) * 4));
    const H = Math.max(96, Math.round(W / uvAspect / 4) * 4);
    return { W, H, aspect: W / H };
  }

  function weaponCacheKey(item) {
    const wt = (item && item.weaponType) || 'rifle';
    const sk = (item && item.skinId) || 'factory_slate';
    const sd = (item && item.patternSeed) || 0;
    return `wpn_${wt}_${sk}_${sd}`;
  }

  // Helper: paint crisp Japanese Seigaiha (concentric wave) filigree for Shogun Gold
  function paintSeigaihaGold(actx, rmctx, bctx, w, h) {
    const rad = Math.max(12, h * 0.14);
    const dx = rad * 1.9;
    const dy = rad * 0.56;
    actx.save();
    rmctx.save();
    bctx.save();
    for (let row = -1; row * dy < h + rad * 2; row++) {
      for (let col = -1; col * dx < w + rad * 2; col++) {
        const cx = col * dx + (row & 1 ? dx * 0.5 : 0);
        const cy = row * dy;
        // Obsidian lacquer scallop disk
        actx.fillStyle = '#0e1015';
        actx.beginPath(); actx.arc(cx, cy, rad, Math.PI, Math.PI * 2); actx.fill();
        rmctx.fillStyle = rmStyle(0.20, 0.18);
        rmctx.beginPath(); rmctx.arc(cx, cy, rad, Math.PI, Math.PI * 2); rmctx.fill();

        // 4 concentric gold-leaf rings
        for (let k = 4; k >= 1; k--) {
          const rr = (k / 4) * rad;
          actx.strokeStyle = k === 4 ? '#ffd666' : k === 3 ? '#e2a832' : '#f4c44e';
          actx.lineWidth = Math.max(1.2, rad * 0.11);
          actx.beginPath(); actx.arc(cx, cy, rr, Math.PI, Math.PI * 2); actx.stroke();

          rmctx.strokeStyle = rmStyle(0.14, 0.96);
          rmctx.lineWidth = actx.lineWidth;
          rmctx.beginPath(); rmctx.arc(cx, cy, rr, Math.PI, Math.PI * 2); rmctx.stroke();

          bctx.strokeStyle = bumpStyle(0.76);
          bctx.lineWidth = actx.lineWidth;
          bctx.beginPath(); bctx.arc(cx, cy, rr, Math.PI, Math.PI * 2); bctx.stroke();
        }
      }
    }
    actx.restore();
    rmctx.restore();
    bctx.restore();
  }

  // Note on weapon canvas orientation (Three.js CanvasTexture flipY = true):
  // x = 0 -> buttstock/rear (u=0), x = W -> muzzle/front (u=1)
  // y = 0 -> top receiver (v=1),   y = H -> lower chassis/skirt (v=0)
  function paintWeaponToCanvases(weaponItem, size) {
    const baseRes = size || getProceduralTexSize();
    const item = KS.sanitizeWeaponItem(weaponItem || KS.createStarterWeapon('rifle'));
    const key = weaponCacheKey(item) + '_' + baseRes;
    if (weaponCanvasCache.has(key)) return weaponCanvasCache.get(key);

    const { W, H } = weaponTexDims(item.weaponType, baseRes);
    const { canvas: albedoCanvas, ctx: actx } = makeCanvas(W, H);
    const { canvas: roughCanvas, ctx: rmctx } = makeCanvas(W, H);
    const { canvas: bumpCanvas, ctx: bctx } = makeCanvas(W, H);
    const { canvas: emissiveCanvas, ctx: ectx } = makeCanvas(W, H);
    fillAll(ectx, '#000000', W, H);

    const skinId = item.skinId;
    const seed = item.patternSeed || 0;
    const fadePct = skinId === 'fade' ? (item.bluePct || KS.computeFadePct(seed)) : 92;
    const ox = KS.hash2D(seed, 17, 67) * 10;
    const oy = KS.hash2D(seed, 31, 97) * 10;
    let hasEmissive = false;

    // ------------------------------------------------------------------------
    // VECTOR & PROCEDURAL STUDIO PAINTERS FOR ALL 32 WEAPON SKINS
    // ------------------------------------------------------------------------
    if (skinId === 'factory_slate') {
      // MW4 / Apex tactical blueprint: satin charcoal Cerakote, dark lower skirt, machined bevels, sky-cyan pinstripe
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#303b48');
      bg.addColorStop(0.68, '#262f3a');
      bg.addColorStop(0.72, '#171d25');
      bg.addColorStop(1, '#131820');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.46, 0.56), W, H);
      rmctx.fillStyle = rmStyle(0.70, 0.24);
      rmctx.fillRect(0, H * 0.72, W, H * 0.28);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintBrushedMetal(actx, bctx, W, H, 7, 0.045, true);

      // Subtle machined forward weight-reduction chamfer panel
      fillPoly(actx, [[W * 0.54, H * 0.30], [W * 0.86, H * 0.30], [W * 0.82, H * 0.62], [W * 0.50, H * 0.62]], 'rgba(16,22,30,0.42)');
      // Clean cyan factory piping along upper rail bevel
      actx.fillStyle = '#4ad8f8';
      actx.fillRect(W * 0.04, H * 0.215, W * 0.92, Math.max(2, H * 0.022));
      rmctx.fillStyle = rmStyle(0.24, 0.65);
      rmctx.fillRect(W * 0.04, H * 0.215, W * 0.92, Math.max(2, H * 0.022));
      // Subtle technical vent ticks
      actx.fillStyle = 'rgba(200,224,240,0.34)';
      for (let i = 0; i < 6; i++) actx.fillRect(W * 0.18 + i * H * 0.065, H * 0.36, H * 0.024, H * 0.14);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.42 });
    } else if (skinId === 'ultraviolet') {
      // Stealth luxury matte obsidian polymer + deep satin anodized ultraviolet furniture & luminous seam
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#181a24');
      bg.addColorStop(1, '#0e1017');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.78, 0.12), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);
      paintHexOverlay(actx, bctx, W, H, Math.max(6, H / 16), 'rgba(255,255,255,0.035)', 0.9, 0.12);

      // Anodized royal ultraviolet upper dust cover & angled handguard block
      const uvG = actx.createLinearGradient(0, 0, W, 0);
      uvG.addColorStop(0, '#5a2be0');
      uvG.addColorStop(0.5, '#8648ff');
      uvG.addColorStop(1, '#6830ea');
      const upperPts = [[0, 0], [W, 0], [W, H * 0.27], [W * 0.62, H * 0.27], [W * 0.56, H * 0.34], [0, H * 0.34]];
      fillPoly(actx, upperPts, uvG);
      fillPoly(rmctx, upperPts, rmStyle(0.24, 0.86));
      fillPoly(bctx, upperPts, bumpStyle(0.64));

      const sidePanel = [[W * 0.62, H * 0.38], [W * 0.86, H * 0.38], [W * 0.80, H * 0.64], [W * 0.56, H * 0.64]];
      fillPoly(actx, sidePanel, uvG);
      fillPoly(rmctx, sidePanel, rmStyle(0.24, 0.86));
      fillPoly(bctx, sidePanel, bumpStyle(0.64));

      // Razor lavender accent pinstripe
      actx.strokeStyle = '#c49cff';
      actx.lineWidth = Math.max(1.5, H * 0.014);
      actx.beginPath();
      actx.moveTo(0, H * 0.345); actx.lineTo(W * 0.56, H * 0.345);
      actx.lineTo(W * 0.62, H * 0.275); actx.lineTo(W, H * 0.275);
      actx.stroke();
      ectx.strokeStyle = 'rgba(146,82,255,0.52)';
      ectx.lineWidth = actx.lineWidth;
      ectx.beginPath();
      ectx.moveTo(0, H * 0.345); ectx.lineTo(W * 0.56, H * 0.345);
      ectx.lineTo(W * 0.62, H * 0.275); ectx.lineTo(W, H * 0.275);
      ectx.stroke();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.45 });
    } else if (skinId === 'redline') {
      // Iconic CS2 Redline: true 2x2 diagonal carbon fiber + contoured crimson motorsport stripes & vents
      paintCarbonFiber(actx, rmctx, bctx, W, H, Math.max(4, H / 38), '#161a20', '#2b323d', 0.30, 0.62, 0.24);
      // Darker matte lower skirt
      actx.fillStyle = 'rgba(8,10,14,0.55)';
      actx.fillRect(0, H * 0.76, W, H * 0.24);

      // Sweeping contoured crimson main racing stripe + hairline silver companion
      actx.save();
      actx.strokeStyle = '#ec1c28';
      actx.lineWidth = Math.max(3, H * 0.044);
      actx.beginPath();
      actx.moveTo(0, H * 0.36);
      actx.bezierCurveTo(W * 0.32, H * 0.31, W * 0.64, H * 0.41, W, H * 0.34);
      actx.stroke();

      rmctx.strokeStyle = rmStyle(0.18, 0.48);
      rmctx.lineWidth = actx.lineWidth;
      rmctx.beginPath();
      rmctx.moveTo(0, H * 0.36);
      rmctx.bezierCurveTo(W * 0.32, H * 0.31, W * 0.64, H * 0.41, W, H * 0.34);
      rmctx.stroke();

      bctx.strokeStyle = bumpStyle(0.72);
      bctx.lineWidth = actx.lineWidth;
      bctx.beginPath();
      bctx.moveTo(0, H * 0.36);
      bctx.bezierCurveTo(W * 0.32, H * 0.31, W * 0.64, H * 0.41, W, H * 0.34);
      bctx.stroke();

      // Secondary lower crimson pinstripe
      actx.strokeStyle = '#ff2a38';
      actx.lineWidth = Math.max(1.5, H * 0.018);
      actx.beginPath();
      actx.moveTo(W * 0.12, H * 0.68); actx.lineTo(W * 0.88, H * 0.68);
      actx.stroke();

      // Angled racing intake chevrons
      actx.fillStyle = '#f22430';
      for (let i = 0; i < 4; i++) {
        const x = W * 0.62 + i * H * 0.14;
        fillPoly(actx, [[x, H * 0.46], [x + H * 0.08, H * 0.46], [x + H * 0.02, H * 0.58], [x - H * 0.06, H * 0.58]], '#f22430');
      }
      actx.restore();
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.38 });
    } else if (skinId === 'vulcan') {
      // Iconic CS2 Vulcan: stark satin ceramic white, matte graphite core, razor cyan & cobalt velocity stripes
      fillAll(actx, '#edf2f7', W, H);
      fillAll(rmctx, rmStyle(0.32, 0.16), W, H);
      fillAll(bctx, bumpStyle(0.52), W, H);

      // Graphite lower frame & mid-chassis hex-inlay pocket
      fillPoly(actx, [[0, H * 0.74], [W, H * 0.74], [W, H], [0, H]], '#181e28');
      fillPoly(rmctx, [[0, H * 0.74], [W, H * 0.74], [W, H], [0, H]], rmStyle(0.62, 0.22));
      const midCore = [[W * 0.30, H * 0.34], [W * 0.56, H * 0.34], [W * 0.50, H * 0.66], [W * 0.24, H * 0.66]];
      fillPoly(actx, midCore, '#1a2230');
      fillPoly(rmctx, midCore, rmStyle(0.58, 0.28));
      fillPoly(bctx, midCore, bumpStyle(0.42));

      // Sharp aerodynamic diagonal stripes (obsidian -> electric cyan -> deep cobalt)
      const stripe = (x0, w0, color, r0, m0) => {
        const slant = H * 0.74;
        const pts = [[x0, 0], [x0 + w0, 0], [x0 + w0 - slant, H * 0.74], [x0 - slant, H * 0.74]];
        fillPoly(actx, pts, color);
        fillPoly(rmctx, pts, rmStyle(r0, m0));
        fillPoly(bctx, pts, bumpStyle(0.58));
      };
      stripe(W * 0.20, W * 0.032, '#141923', 0.54, 0.24);
      stripe(W * 0.232, W * 0.068, '#16c8ff', 0.24, 0.44);
      stripe(W * 0.30, W * 0.056, '#1a58d8', 0.30, 0.42);
      stripe(W * 0.68, W * 0.028, '#141923', 0.54, 0.24);
      stripe(W * 0.708, W * 0.072, '#16c8ff', 0.24, 0.44);
      stripe(W * 0.78, W * 0.058, '#1a58d8', 0.30, 0.42);
      stripe(W * 0.855, W * 0.025, '#141923', 0.54, 0.24);

      paintHexOverlay(actx, bctx, W, H, Math.max(5, H / 18), 'rgba(18,32,48,0.08)', 0.8, 0.14);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.34 });
    } else if (skinId === 'crimson_web') {
      // Rich metallic candy crimson with subtle mesh texture + razor seeded spider webs
      const cg = actx.createLinearGradient(0, 0, W, H);
      cg.addColorStop(0, '#c81628');
      cg.addColorStop(0.5, '#a20d1c');
      cg.addColorStop(1, '#680812');
      fillAll(actx, cg, W, H);
      fillAll(rmctx, rmStyle(0.28, 0.56), W, H);
      fillAll(bctx, bumpStyle(0.52), W, H);
      paintHexOverlay(actx, bctx, W, H, Math.max(5, H / 20), 'rgba(255,96,112,0.08)', 0.8, 0.14);
      paintSpiderWebs(actx, bctx, W, H, seed, 4, 'rgba(8,6,10,0.94)', 'rgba(255,92,108,0.28)');
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.42 });
    } else if (skinId === 'asiimov') {
      // Crisp CS2 Asiimov: satin sci-fi white ceramic, bold safety-orange angular wedges, matte jet-black cutouts, technical stencils
      fillAll(actx, '#f2f4f7', W, H);
      fillAll(rmctx, rmStyle(0.32, 0.14), W, H);
      fillAll(bctx, bumpStyle(0.52), W, H);

      // Matte black structural base & diagonal framing wedges
      const blackPolys = [
        [[0, H * 0.74], [W, H * 0.74], [W, H], [0, H]],
        [[W * 0.54, 0], [W * 0.62, 0], [W * 0.50, H * 0.74], [W * 0.42, H * 0.74]],
        [[W * 0.18, H * 0.14], [W * 0.24, H * 0.14], [W * 0.19, H * 0.44], [W * 0.13, H * 0.44]]
      ];
      for (const p of blackPolys) {
        fillPoly(actx, p, '#17191f');
        fillPoly(rmctx, p, rmStyle(0.68, 0.18));
        fillPoly(bctx, p, bumpStyle(0.44));
      }

      // Vivid safety-orange sci-fi armor wedges
      const orangePolys = [
        [[W * 0.36, 0], [W * 0.53, 0], [W * 0.41, H * 0.66], [W * 0.26, H * 0.66]],
        [[W * 0.05, H * 0.16], [W * 0.17, H * 0.16], [W * 0.12, H * 0.48], [W * 0.02, H * 0.48]],
        [[W * 0.72, H * 0.42], [W * 0.94, H * 0.42], [W * 0.90, H * 0.70], [W * 0.68, H * 0.70]]
      ];
      for (const p of orangePolys) {
        fillPoly(actx, p, '#ff6814');
        fillPoly(rmctx, p, rmStyle(0.28, 0.22));
        fillPoly(bctx, p, bumpStyle(0.60));
      }

      // Crisp geometric panel trace, reticle circle, orange micro-ticks & black louver slashes
      actx.save();
      actx.strokeStyle = 'rgba(20,22,28,0.88)';
      actx.lineWidth = Math.max(1.5, H / 135);
      actx.beginPath();
      actx.moveTo(W * 0.04, H * 0.58); actx.lineTo(W * 0.46, H * 0.58);
      actx.lineTo(W * 0.56, H * 0.36); actx.lineTo(W * 0.94, H * 0.36);
      actx.stroke();

      actx.strokeStyle = '#ff6814';
      actx.lineWidth = Math.max(2, H / 95);
      actx.beginPath(); actx.arc(W * 0.58, H * 0.54, H * 0.065, 0, Math.PI * 2); actx.stroke();
      actx.fillStyle = '#ff6814';
      for (let i = 0; i < 6; i++) actx.fillRect(W * 0.12 + i * H * 0.09, H * 0.62, H * 0.045, H * 0.05);
      for (let i = 0; i < 4; i++) {
        const x = W * 0.66 + i * H * 0.15;
        fillPoly(actx, [[x, H * 0.14], [x + H * 0.09, H * 0.14], [x + H * 0.03, H * 0.26], [x - H * 0.06, H * 0.26]], '#17191f');
      }
      actx.restore();
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.30 });
    } else if (skinId === 'neon_rider') {
      // CS2 Synthwave Masterpiece: deep ultraviolet night sky, perspective laser grid, blazing cyan/magenta ribbons & cyber helmet
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#12082a');
      bg.addColorStop(0.55, '#2b0e58');
      bg.addColorStop(1, '#0e1030');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.28, 0.34), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      // Perspective synthwave cyan horizon grid on lower third
      actx.save();
      actx.strokeStyle = 'rgba(42,236,255,0.68)';
      actx.lineWidth = Math.max(1.1, H / 180);
      ectx.strokeStyle = 'rgba(32,226,255,0.45)';
      ectx.lineWidth = actx.lineWidth;
      for (let r = 0; r < 6; r++) {
        const y = H * (0.64 + Math.pow(r / 5, 1.35) * 0.35);
        actx.beginPath(); actx.moveTo(0, y); actx.lineTo(W, y); actx.stroke();
        ectx.beginPath(); ectx.moveTo(0, y); ectx.lineTo(W, y); ectx.stroke();
      }
      for (let c = -8; c <= 16; c++) {
        const xTop = W * 0.5 + (c - 4) * W * 0.07;
        const xBot = W * 0.5 + (c - 4) * W * 0.17;
        actx.beginPath(); actx.moveTo(xTop, H * 0.64); actx.lineTo(xBot, H); actx.stroke();
      }

      // Blazing hot-magenta & electric-cyan angled speed ribbons
      const sOff = ((seed % 7) - 3) * W * 0.02;
      const ribbon = (x0, width, color, emColor) => {
        const pts = [[x0 + sOff, 0], [x0 + width + sOff, 0], [x0 + width - H * 0.62 + sOff, H], [x0 - H * 0.62 + sOff, H]];
        fillPoly(actx, pts, color);
        fillPoly(rmctx, pts, rmStyle(0.16, 0.45));
        if (emColor) fillPoly(ectx, pts, emColor);
      };
      ribbon(W * 0.18, W * 0.055, '#ff2cc4', 'rgba(255,40,190,0.42)');
      ribbon(W * 0.25, W * 0.032, '#28f0ff', 'rgba(32,240,255,0.42)');
      ribbon(W * 0.78, W * 0.062, '#ff2cc4', 'rgba(255,40,190,0.42)');
      ribbon(W * 0.86, W * 0.034, '#28f0ff', 'rgba(32,240,255,0.42)');

      // Stylized synthwave rider helmet centerpiece with radial neon bloom
      const hx = W * 0.52, hy = H * 0.44, hr = H * 0.23;
      const glow = actx.createRadialGradient(hx, hy, hr * 0.2, hx, hy, hr * 1.65);
      glow.addColorStop(0, 'rgba(255,42,204,0.72)');
      glow.addColorStop(1, 'rgba(255,42,204,0)');
      actx.fillStyle = glow;
      actx.beginPath(); actx.arc(hx, hy, hr * 1.65, 0, Math.PI * 2); actx.fill();

      const helmPts = [
        [hx - hr * 0.78, hy + hr * 0.58], [hx - hr * 0.96, hy - hr * 0.14],
        [hx - hr * 0.36, hy - hr * 0.90], [hx + hr * 0.58, hy - hr * 0.80],
        [hx + hr * 1.04, hy - hr * 0.08], [hx + hr * 0.78, hy + hr * 0.70], [hx + hr * 0.05, hy + hr * 0.86]
      ];
      fillPoly(actx, helmPts, '#9d22f0');
      actx.strokeStyle = '#38f6ff';
      actx.lineWidth = Math.max(2, H / 100);
      actx.stroke();
      // Visor housing + glowing cyan visor slit
      fillPoly(actx, [[hx - hr * 0.18, hy - hr * 0.24], [hx + hr * 0.94, hy - hr * 0.16], [hx + hr * 0.86, hy + hr * 0.24], [hx - hr * 0.12, hy + hr * 0.18]], '#0b1228');
      fillPoly(actx, [[hx - hr * 0.08, hy - hr * 0.12], [hx + hr * 0.84, hy - hr * 0.06], [hx + hr * 0.80, hy + hr * 0.08], [hx - hr * 0.06, hy + hr * 0.04]], '#44f8ff');
      fillPoly(ectx, [[hx - hr * 0.08, hy - hr * 0.12], [hx + hr * 0.84, hy - hr * 0.06], [hx + hr * 0.80, hy + hr * 0.08], [hx - hr * 0.06, hy + hr * 0.04]], '#44f8ff');
      actx.restore();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.36 });
    } else if (skinId === 'printstream') {
      // Iconic CS2 Printstream: luminous pearlescent satin-white upper + matte jet-black lower + crisp minimalist telemetry graphics
      const pg = actx.createLinearGradient(0, 0, W, H * 0.76);
      pg.addColorStop(0, '#f4f7fb');
      pg.addColorStop(0.35, '#fbf4fa');
      pg.addColorStop(0.68, '#f0f9fc');
      pg.addColorStop(1, '#f7f5fc');
      fillAll(actx, pg, W, H);
      fillAll(rmctx, rmStyle(0.20, 0.16), W, H);
      fillAll(bctx, bumpStyle(0.52), W, H);

      // Stark matte obsidian lower chassis skirt
      actx.fillStyle = '#14171d';
      actx.fillRect(0, H * 0.74, W, H * 0.26);
      rmctx.fillStyle = rmStyle(0.72, 0.14);
      rmctx.fillRect(0, H * 0.74, W, H * 0.26);
      bctx.fillStyle = bumpStyle(0.42);
      bctx.fillRect(0, H * 0.74, W, H * 0.26);

      // Minimalist geometric obsidian telemetry markings
      actx.save();
      actx.strokeStyle = '#12151c';
      actx.fillStyle = '#12151c';
      actx.lineWidth = Math.max(1.6, H / 120);
      actx.strokeRect(W * 0.05, H * 0.14, W * 0.90, H * 0.52);

      // Signature triple X marks
      for (const x of [0.43, 0.48, 0.53]) {
        const y = H * 0.38, r = H * 0.056;
        actx.lineWidth = Math.max(2.2, H / 82);
        actx.beginPath();
        actx.moveTo(W * x - r, y - r); actx.lineTo(W * x + r, y + r);
        actx.moveTo(W * x + r, y - r); actx.lineTo(W * x - r, y + r);
        actx.stroke();
      }
      // Crisp barcode strip
      for (let i = 0; i < 16; i++) {
        actx.fillRect(W * 0.11 + i * H * 0.036, H * 0.24, (i % 3 === 0 ? 0.020 : 0.010) * H, H * 0.16);
      }
      // Angled geometric parallelogram chevrons
      for (let i = 0; i < 5; i++) {
        const x = W * 0.70 + i * H * 0.145;
        fillPoly(actx, [[x, H * 0.22], [x + H * 0.095, H * 0.22], [x - H * 0.015, H * 0.44], [x - H * 0.11, H * 0.44]], '#12151c');
      }
      // Precision circle + reticle + subtle pearl dot matrix
      actx.lineWidth = Math.max(1.8, H / 110);
      actx.beginPath(); actx.arc(W * 0.28, H * 0.50, H * 0.068, 0, Math.PI * 2); actx.stroke();
      actx.fillRect(W * 0.39, H * 0.52, W * 0.26, H * 0.024);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          actx.fillRect(W * 0.09 + c * H * 0.042, H * 0.48 + r * H * 0.042, H * 0.014, H * 0.014);
        }
      }
      actx.restore();
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.22, pins: true });
    } else if (skinId === 'hazard_pay') {
      // Apex / MW4 industrial demolition: dark tungsten armor plates, Caterpillar amber panels, crisp black/amber caution chevrons
      fillAll(actx, '#2a323a', W, H);
      fillAll(rmctx, rmStyle(0.56, 0.48), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 181, 0.06, true);

      // Matte charcoal armor skirt & center cutout
      fillPoly(actx, [[0, H * 0.72], [W, H * 0.72], [W, H], [0, H]], '#15191f');
      fillPoly(rmctx, [[0, H * 0.72], [W, H * 0.72], [W, H], [0, H]], rmStyle(0.72, 0.24));

      // Bold Caterpillar-amber coated upper plates
      const amberZone = [[W * 0.08, H * 0.12], [W * 0.44, H * 0.12], [W * 0.38, H * 0.62], [W * 0.04, H * 0.62]];
      fillPoly(actx, amberZone, '#f4a21c');
      fillPoly(rmctx, amberZone, rmStyle(0.32, 0.28));
      fillPoly(bctx, amberZone, bumpStyle(0.62));

      // Razor caution hazard stripe bar across forward receiver
      actx.save();
      actx.beginPath();
      actx.rect(W * 0.54, H * 0.24, W * 0.36, H * 0.36);
      actx.clip();
      actx.fillStyle = '#f4a21c';
      actx.fillRect(W * 0.54, H * 0.24, W * 0.36, H * 0.36);
      actx.fillStyle = '#14171c';
      const step = H * 0.19;
      for (let x = W * 0.48; x < W * 1.05; x += step) {
        fillPoly(actx, [[x, H * 0.22], [x + step * 0.48, H * 0.22], [x + step * 0.16, H * 0.62], [x - step * 0.32, H * 0.62]], '#14171c');
      }
      actx.restore();
      actx.strokeStyle = '#101318';
      actx.lineWidth = Math.max(1.8, H / 110);
      actx.strokeRect(W * 0.54, H * 0.24, W * 0.36, H * 0.36);
      bctx.strokeStyle = bumpStyle(0.74);
      bctx.lineWidth = Math.max(2, H / 100);
      bctx.strokeRect(W * 0.54, H * 0.24, W * 0.36, H * 0.36);

      // Clean dark industrial stencil marks
      actx.fillStyle = '#15191f';
      for (let i = 0; i < 4; i++) actx.fillRect(W * 0.12 + i * H * 0.08, H * 0.34, H * 0.045, H * 0.16);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.44 });
    } else if (skinId === 'coldfront') {
      // Valorant / Apex cryo-ceramic: crisp polygonal glacier facets in frost white, glacier blue & deep arctic navy
      fillAll(actx, '#d6f0ff', W, H);
      fillAll(rmctx, rmStyle(0.24, 0.38), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintCrystalFacets(actx, rmctx, bctx, null, W, H, seed + 239, 14, 6, (cx, cy, idx) => {
        const h1 = seededRand(seed, idx, 47);
        const h2 = seededRand(seed, idx, 89);
        if (cy > 0.74) {
          return { fill: '#122238', stroke: 'rgba(130,224,255,0.28)', rough: 0.60, metal: 0.30, bump: 0.42 };
        }
        if (h1 > 0.76) {
          return { fill: '#f2fbff', stroke: 'rgba(140,210,240,0.45)', rough: 0.22, metal: 0.22, bump: 0.64 };
        }
        if (h1 > 0.38) {
          const bVal = Math.round(230 + h2 * 25);
          return { fill: `rgb(${Math.round(140 + h2 * 56)},${Math.round(208 + h2 * 34)},${bVal})`, stroke: 'rgba(255,255,255,0.42)', rough: 0.18, metal: 0.52, bump: 0.56 };
        }
        return { fill: `rgb(${Math.round(48 + h2 * 44)},${Math.round(128 + h2 * 50)},${Math.round(188 + h2 * 46)})`, stroke: 'rgba(212,244,255,0.34)', rough: 0.20, metal: 0.66, bump: 0.46 };
      });
      // Crisp dark-navy geometric receiver rib
      fillPoly(actx, [[W * 0.44, 0], [W * 0.50, 0], [W * 0.42, H * 0.76], [W * 0.36, H * 0.76]], '#102036');
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.34 });
    } else if (skinId === 'redshift') {
      // Smoked brushed titanium swept by razor crimson Doppler shockwave chevrons & glowing thermal slits
      const bg = actx.createLinearGradient(0, 0, W, 0);
      bg.addColorStop(0, '#181c24');
      bg.addColorStop(0.55, '#252b36');
      bg.addColorStop(1, '#1c151c');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.36, 0.78), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 271, 0.06, true);

      // Sweeping crimson Doppler speed chevrons toward muzzle
      const shift = ((seed % 7) - 3) * W * 0.02;
      const chev = (x, wBand, col, emCol) => {
        const pts = [[x + shift, 0], [x + wBand + shift, 0], [x + wBand + H * 0.44 + shift, H * 0.50], [x + wBand + shift, H], [x + shift, H], [x + H * 0.44 + shift, H * 0.50]];
        fillPoly(actx, pts, col);
        fillPoly(rmctx, pts, rmStyle(0.18, 0.82));
        fillPoly(bctx, pts, bumpStyle(0.64));
        if (emCol) fillPoly(ectx, pts, emCol);
      };
      chev(W * 0.22, W * 0.065, '#8c0e1c', null);
      chev(W * 0.31, W * 0.045, '#d81b2c', 'rgba(220,24,42,0.34)');
      chev(W * 0.58, W * 0.085, '#e81e30', 'rgba(240,28,46,0.44)');
      chev(W * 0.69, W * 0.032, '#ff4848', 'rgba(255,64,56,0.72)');

      // Thermal vent glow slits
      for (let i = 0; i < 4; i++) {
        const vx = W * 0.76 + i * H * 0.11;
        actx.fillStyle = '#ff3838';
        actx.fillRect(vx, H * 0.38, H * 0.045, H * 0.18);
        ectx.fillStyle = '#ff3228';
        ectx.fillRect(vx, H * 0.38, H * 0.045, H * 0.18);
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.42 });
    } else if (skinId === 'nitro') {
      // Hypercar forged carbon + sweeping liquid neon-cyan & hyper-magenta aerodynamic ribbons
      paintCarbonFiber(actx, rmctx, bctx, W, H, Math.max(4, H / 38), '#12161e', '#222b38', 0.26, 0.58, 0.28);
      actx.save();
      const s = ((seed % 7) - 3) * W * 0.025;
      const drawSweep = (yOffset, color, emColor, lw) => {
        actx.strokeStyle = color;
        actx.lineWidth = lw;
        actx.beginPath();
        actx.moveTo(-W * 0.05, H * (0.76 + yOffset));
        actx.bezierCurveTo(W * 0.28 + s, H * (0.20 + yOffset), W * 0.62 + s, H * (0.64 + yOffset), W * 1.05, H * (0.18 + yOffset));
        actx.stroke();

        rmctx.strokeStyle = rmStyle(0.14, 0.55);
        rmctx.lineWidth = lw;
        rmctx.beginPath();
        rmctx.moveTo(-W * 0.05, H * (0.76 + yOffset));
        rmctx.bezierCurveTo(W * 0.28 + s, H * (0.20 + yOffset), W * 0.62 + s, H * (0.64 + yOffset), W * 1.05, H * (0.18 + yOffset));
        rmctx.stroke();

        ectx.strokeStyle = emColor;
        ectx.lineWidth = lw * 0.72;
        ectx.beginPath();
        ectx.moveTo(-W * 0.05, H * (0.76 + yOffset));
        ectx.bezierCurveTo(W * 0.28 + s, H * (0.20 + yOffset), W * 0.62 + s, H * (0.64 + yOffset), W * 1.05, H * (0.18 + yOffset));
        ectx.stroke();
      };
      drawSweep(-0.06, '#14f0f8', 'rgba(20,240,252,0.72)', Math.max(4, H * 0.068));
      drawSweep(0.05, '#ff26b8', 'rgba(255,36,184,0.68)', Math.max(3, H * 0.048));
      drawSweep(-0.13, '#ffffff', 'rgba(180,250,255,0.45)', Math.max(1.4, H * 0.016));
      actx.restore();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.42 });
    } else if (skinId === 'solarflare') {
      // Art-Deco burnished champagne-gold & obsidian bronze radial sunburst
      const bg = actx.createRadialGradient(W * 0.56, H * 0.48, H * 0.05, W * 0.56, H * 0.48, W * 0.68);
      bg.addColorStop(0, '#ffe892');
      bg.addColorStop(0.32, '#eab03e');
      bg.addColorStop(0.72, '#9a621c');
      bg.addColorStop(1, '#2c1c0e');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.18, 0.94), W, H);
      fillAll(bctx, bumpStyle(0.52), W, H);

      // Crisp engraved radial Art-Deco sunburst rays
      const cx = W * 0.56, cy = H * 0.48;
      const rayCount = 24;
      for (let i = 0; i < rayCount; i++) {
        const a0 = (i / rayCount) * Math.PI * 2 + (seed % 11) * 0.05;
        const a1 = a0 + (0.45 / rayCount) * Math.PI * 2;
        const rad = W * 0.85;
        const pts = [[cx, cy], [cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad], [cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad]];
        fillPoly(actx, pts, 'rgba(34,20,8,0.42)');
        fillPoly(rmctx, pts, rmStyle(0.38, 0.78));
        fillPoly(bctx, pts, bumpStyle(0.36));
      }

      // Dark bronze top & bottom architectural borders
      actx.fillStyle = '#1b1410';
      actx.fillRect(0, 0, W, H * 0.15);
      actx.fillRect(0, H * 0.82, W, H * 0.18);
      actx.fillStyle = '#ffd66b';
      actx.fillRect(0, H * 0.15, W, Math.max(1.6, H * 0.018));
      actx.fillRect(0, H * 0.805, W, Math.max(1.6, H * 0.018));
      rmctx.fillStyle = rmStyle(0.52, 0.58);
      rmctx.fillRect(0, 0, W, H * 0.15);
      rmctx.fillRect(0, H * 0.82, W, H * 0.18);

      // Subtle glowing amber sun core
      const coreG = ectx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.34);
      coreG.addColorStop(0, 'rgba(255,210,88,0.68)');
      coreG.addColorStop(1, 'rgba(255,150,20,0)');
      ectx.fillStyle = coreG;
      ectx.fillRect(0, 0, W, H);
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.32 });
    } else if (skinId === 'voidglass') {
      // Shattered pitch-black mirror obsidian fractured into sharp geometric shards with glowing violet & teal internal edges
      fillAll(actx, '#0b0c14', W, H);
      fillAll(rmctx, rmStyle(0.14, 0.74), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintCrystalFacets(actx, rmctx, bctx, ectx, W, H, seed + 353, 13, 6, (cx, cy, idx) => {
        const h1 = seededRand(seed, idx, 19);
        const h2 = seededRand(seed, idx, 61);
        const isPrism = h1 > 0.64;
        const isTeal = h2 > 0.62;
        if (isPrism) {
          const fill = isTeal
            ? `rgb(${Math.round(16 + h1 * 24)},${Math.round(54 + h1 * 76)},${Math.round(78 + h1 * 96)})`
            : `rgb(${Math.round(48 + h1 * 72)},${Math.round(22 + h1 * 38)},${Math.round(92 + h1 * 116)})`;
          return {
            fill,
            stroke: isTeal ? 'rgba(64,244,236,0.88)' : 'rgba(176,104,255,0.90)',
            lineWidth: Math.max(1.2, H / 165),
            rough: 0.08 + (1 - h1) * 0.08,
            metal: 0.88,
            bump: 0.62 + h2 * 0.24,
            bumpStroke: 'rgb(240,240,240)',
            emissiveStroke: isTeal ? 'rgba(42,232,226,0.78)' : 'rgba(166,84,255,0.82)',
            emissiveWidth: Math.max(1.3, H / 155)
          };
        }
        const dark = Math.round(11 + h1 * 18);
        return {
          fill: `rgb(${dark},${dark + 2},${dark + 10})`,
          stroke: 'rgba(104,76,184,0.34)',
          lineWidth: Math.max(0.9, H / 210),
          rough: 0.14 + h2 * 0.14,
          metal: 0.66,
          bump: 0.36 + h1 * 0.18,
          emissiveStroke: h2 > 0.72 ? 'rgba(128,72,255,0.38)' : null
        };
      });
      hasEmissive = true;
    } else if (skinId === 'tactical_carbon') {
      // MW4 spec-ops luxury: ultra-crisp 3K carbon fiber, machined titanium inlay panels, subtle ice-blue trim
      paintCarbonFiber(actx, rmctx, bctx, W, H, Math.max(4, H / 42), '#171c23', '#2d3644', 0.28, 0.60, 0.26);
      // Machined satin titanium upper accent panel
      const tiPts = [[W * 0.06, H * 0.08], [W * 0.94, H * 0.08], [W * 0.90, H * 0.24], [W * 0.10, H * 0.24]];
      fillPoly(actx, tiPts, '#4a586a');
      fillPoly(rmctx, tiPts, rmStyle(0.28, 0.88));
      fillPoly(bctx, tiPts, bumpStyle(0.64));
      // Hairline ice-blue anodized accent
      actx.fillStyle = '#6ec8f2';
      actx.fillRect(W * 0.08, H * 0.245, W * 0.84, Math.max(1.5, H * 0.016));
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.44 });
    } else if (skinId === 'cyber_wireframe') {
      // Valorant / Tron vector mesh: pitch obsidian shell + razor glowing cyan-to-magenta wireframe lines & circuit nodes (ONLY lines glow!)
      fillAll(actx, '#0a0e18', W, H);
      fillAll(rmctx, rmStyle(0.42, 0.44), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);

      const lineGrad = actx.createLinearGradient(0, 0, W, H);
      lineGrad.addColorStop(0, '#20f4ff');
      lineGrad.addColorStop(0.5, '#7c66ff');
      lineGrad.addColorStop(1, '#ff34d8');

      const stepX = W / 18;
      const stepY = H / 7;
      const drawGrid = (ctx2d, strokeStyle, lw) => {
        ctx2d.save();
        ctx2d.strokeStyle = strokeStyle;
        ctx2d.lineWidth = lw;
        ctx2d.beginPath();
        for (let c = 0; c <= 18; c++) {
          ctx2d.moveTo(c * stepX, 0); ctx2d.lineTo(c * stepX, H);
        }
        for (let r = 0; r <= 7; r++) {
          ctx2d.moveTo(0, r * stepY); ctx2d.lineTo(W, r * stepY);
        }
        // Triangulated diagonal vector braces
        for (let c = 0; c < 18; c++) {
          for (let r = 0; r < 7; r++) {
            if (((c + r + seed) % 3) === 0) {
              ctx2d.moveTo(c * stepX, r * stepY);
              ctx2d.lineTo((c + 1) * stepX, (r + 1) * stepY);
            }
          }
        }
        ctx2d.stroke();
        ctx2d.restore();
      };

      const lw = Math.max(1.3, H / 155);
      drawGrid(actx, lineGrad, lw);
      drawGrid(ectx, lineGrad, lw * 1.15);
      drawGrid(bctx, bumpStyle(0.84), lw * 1.3);
      drawGrid(rmctx, rmStyle(0.16, 0.80), lw);

      // Glowing intersection nodes
      for (let i = 0; i < 16; i++) {
        const c = Math.floor(seededRand(seed, i, 29) * 16) + 1;
        const r = Math.floor(seededRand(seed, i, 59) * 5) + 1;
        const nx = c * stepX, ny = r * stepY;
        const nr = Math.max(2.2, H * 0.018);
        actx.fillStyle = '#ffffff';
        actx.beginPath(); actx.arc(nx, ny, nr, 0, Math.PI * 2); actx.fill();
        ectx.fillStyle = i % 2 === 0 ? '#44faff' : '#ff56e4';
        ectx.beginPath(); ectx.arc(nx, ny, nr * 1.5, 0, Math.PI * 2); ectx.fill();
      }
      hasEmissive = true;
    } else if (skinId === 'holo_prism') {
      // Refractive collector holographic prism mosaic with full spectrum facets & diamond-dust glints
      fillAll(actx, '#24304c', W, H);
      fillAll(rmctx, rmStyle(0.10, 0.92), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);
      paintCrystalFacets(actx, rmctx, bctx, ectx, W, H, seed + 211, 16, 7, (cx, cy, idx) => {
        const h1 = seededRand(seed, idx, 23);
        const h2 = seededRand(seed, idx, 83);
        const hue = ((cx * 310 + cy * 170 + (seed % 36) * 10 + h1 * 55) % 360 + 360) % 360;
        const lit = 48 + h2 * 24;
        const sparkle = h1 > 0.86;
        return {
          fill: `hsl(${hue.toFixed(0)}, 86%, ${lit.toFixed(0)}%)`,
          stroke: 'rgba(255,255,255,0.44)',
          lineWidth: Math.max(0.8, H / 240),
          rough: 0.06 + (1 - h2) * 0.10,
          metal: 0.92,
          bump: 0.30 + h1 * 0.48,
          bumpStroke: 'rgb(228,228,228)',
          emissiveFill: sparkle ? `hsla(${hue.toFixed(0)}, 95%, 72%, 0.45)` : null
        };
      });
      hasEmissive = true;
    } else if (skinId === 'ronin_sakura') {
      // Japanese urushi black & warm ivory two-tone lacquer split by kintsugi gold seam + painted bonsai & cherry blossoms
      fillAll(actx, '#14131c', W, H);
      fillAll(rmctx, rmStyle(0.24, 0.20), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      // Warm porcelain ivory upper-rear lacquer sweep
      actx.save();
      const traceIvory = (ctx2d) => {
        ctx2d.beginPath();
        ctx2d.moveTo(0, 0);
        ctx2d.lineTo(W, 0);
        ctx2d.lineTo(W, H * 0.34);
        ctx2d.bezierCurveTo(W * 0.68, H * 0.46, W * 0.34, H * 0.24, 0, H * 0.48);
        ctx2d.closePath();
      };
      traceIvory(actx);
      actx.fillStyle = '#f4ece4';
      actx.fill();
      traceIvory(rmctx);
      rmctx.fillStyle = rmStyle(0.22, 0.14);
      rmctx.fill();

      // Kintsugi 24K gold-leaf wave seam along lacquer border
      const traceSeam = (ctx2d) => {
        ctx2d.beginPath();
        ctx2d.moveTo(0, H * 0.48);
        ctx2d.bezierCurveTo(W * 0.34, H * 0.24, W * 0.68, H * 0.46, W, H * 0.34);
      };
      traceSeam(actx);
      actx.strokeStyle = '#f2bf48';
      actx.lineWidth = Math.max(2.6, H * 0.032);
      actx.stroke();
      traceSeam(rmctx);
      rmctx.strokeStyle = rmStyle(0.14, 0.96);
      rmctx.lineWidth = actx.lineWidth;
      rmctx.stroke();
      traceSeam(bctx);
      bctx.strokeStyle = bumpStyle(0.76);
      bctx.lineWidth = actx.lineWidth;
      bctx.stroke();

      // Sumi-ink bonsai branch sweeping across receiver
      actx.strokeStyle = '#1b141a';
      actx.lineWidth = Math.max(3, H * 0.032);
      actx.lineCap = 'round';
      actx.beginPath();
      actx.moveTo(W * 0.04, H * 0.68);
      actx.bezierCurveTo(W * 0.28, H * 0.50, W * 0.56, H * 0.42, W * 0.86, H * 0.28);
      actx.moveTo(W * 0.38, H * 0.48);
      actx.quadraticCurveTo(W * 0.52, H * 0.62, W * 0.68, H * 0.58);
      actx.stroke();

      // Layered multi-petal sakura blossoms + drifting petals
      for (let i = 0; i < 18; i++) {
        const bx = (0.08 + KS.hash2D(seed + 3, i * 19, 317) * 0.84) * W;
        const by = (0.14 + KS.hash2D(seed + 7, i * 29, 419) * 0.72) * H;
        const rad = H * (0.036 + KS.hash2D(seed + 11, i * 37, 503) * 0.034);
        actx.save();
        actx.translate(bx, by);
        actx.rotate(KS.hash2D(seed, i * 43, 601) * Math.PI * 2);
        const outerCol = i % 3 === 0 ? '#ffc2df' : i % 3 === 1 ? '#ff7ab8' : '#f44c8e';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          actx.fillStyle = outerCol;
          actx.beginPath();
          actx.ellipse(Math.cos(a) * rad * 0.62, Math.sin(a) * rad * 0.62, rad * 0.56, rad * 0.32, a, 0, Math.PI * 2);
          actx.fill();
        }
        actx.fillStyle = '#ffe072';
        actx.beginPath(); actx.arc(0, 0, rad * 0.24, 0, Math.PI * 2); actx.fill();
        actx.restore();
      }
      actx.restore();
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'oni_crimson') {
      // Blood-lacquer crimson, sumi-ink brush strokes, hammered gold trim & fierce geometric Oni demon mask with glowing eyes
      fillAll(actx, '#120d14', W, H);
      fillAll(rmctx, rmStyle(0.32, 0.36), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      // Sweeping crimson lacquer bands framed in gold leaf
      const slash = (x0, w0) => {
        const pts = [[x0, 0], [x0 + w0, 0], [x0 + w0 - H * 0.55, H], [x0 - H * 0.55, H]];
        fillPoly(actx, pts, '#b81024');
        fillPoly(rmctx, pts, rmStyle(0.22, 0.44));
        actx.strokeStyle = '#e8b648';
        actx.lineWidth = Math.max(1.8, H * 0.020);
        actx.stroke();
      };
      slash(W * 0.14, W * 0.22);
      slash(W * 0.62, W * 0.28);

      // Sculpted Oni war mask emblem centered on receiver
      const oxC = W * 0.52, oyC = H * 0.48, or = H * 0.27;
      actx.save();
      // Gold curving horns
      fillPoly(actx, [[oxC - or * 0.45, oyC - or * 0.55], [oxC - or * 0.92, oyC - or * 1.15], [oxC - or * 0.22, oyC - or * 0.78]], '#f0c050');
      fillPoly(actx, [[oxC + or * 0.45, oyC - or * 0.55], [oxC + or * 0.92, oyC - or * 1.15], [oxC + or * 0.22, oyC - or * 0.78]], '#f0c050');
      // Mask face plate
      const maskPts = [
        [oxC, oyC - or * 0.92], [oxC + or * 0.84, oyC - or * 0.34], [oxC + or * 0.68, oyC + or * 0.74],
        [oxC, oyC + or * 0.98], [oxC - or * 0.68, oyC + or * 0.74], [oxC - or * 0.84, oyC - or * 0.34]
      ];
      fillPoly(actx, maskPts, '#160d14');
      actx.strokeStyle = '#f4c456';
      actx.lineWidth = Math.max(2, H / 95);
      actx.stroke();
      // Glowing crimson demonic eyes (with emissive!)
      const eyeL = [[oxC - or * 0.58, oyC - or * 0.22], [oxC - or * 0.14, oyC - or * 0.04], [oxC - or * 0.24, oyC + or * 0.12], [oxC - or * 0.54, oyC + or * 0.02]];
      const eyeR = [[oxC + or * 0.58, oyC - or * 0.22], [oxC + or * 0.14, oyC - or * 0.04], [oxC + or * 0.24, oyC + or * 0.12], [oxC + or * 0.54, oyC + or * 0.02]];
      fillPoly(actx, eyeL, '#ff2846'); fillPoly(actx, eyeR, '#ff2846');
      fillPoly(ectx, eyeL, '#ff2442'); fillPoly(ectx, eyeR, '#ff2442');
      // Ivory upward fangs
      fillPoly(actx, [[oxC - or * 0.42, oyC + or * 0.64], [oxC - or * 0.28, oyC + or * 0.20], [oxC - or * 0.14, oyC + or * 0.64]], '#faf4e6');
      fillPoly(actx, [[oxC + or * 0.14, oyC + or * 0.64], [oxC + or * 0.28, oyC + or * 0.20], [oxC + or * 0.42, oyC + or * 0.64]], '#faf4e6');
      actx.restore();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.36 });
    } else if (skinId === 'shogun_gold') {
      // Imperial mirror-black urushi lacquer inlaid with crisp Seigaiha 24K gold wave filigree & vermilion silk borders
      fillAll(actx, '#0c0e14', W, H);
      fillAll(rmctx, rmStyle(0.20, 0.24), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);
      paintSeigaihaGold(actx, rmctx, bctx, W, H);

      // Sculpted imperial 24K gold upper & lower borders + crimson silk pinstripe
      const gBorder = actx.createLinearGradient(0, 0, W, 0);
      gBorder.addColorStop(0, '#c68e28');
      gBorder.addColorStop(0.5, '#ffe078');
      gBorder.addColorStop(1, '#c68e28');
      actx.fillStyle = gBorder;
      actx.fillRect(0, 0, W, H * 0.16);
      actx.fillRect(0, H * 0.84, W, H * 0.16);
      rmctx.fillStyle = rmStyle(0.14, 0.96);
      rmctx.fillRect(0, 0, W, H * 0.16);
      rmctx.fillRect(0, H * 0.84, W, H * 0.16);
      bctx.fillStyle = bumpStyle(0.74);
      bctx.fillRect(0, 0, W, H * 0.16);
      bctx.fillRect(0, H * 0.84, W, H * 0.16);

      // Imperial vermilion silk trim lines
      actx.fillStyle = '#c81c28';
      actx.fillRect(0, H * 0.16, W, Math.max(2, H * 0.032));
      actx.fillRect(0, H * 0.808, W, Math.max(2, H * 0.032));
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.34, pins: false });
    } else if (skinId === 'reactive_overdrive') {
      // BO6 / Valorant reactive plasma armor: sleek dark titanium plates housing glowing geometric reactor conduits (emissive white mask tinted dynamically!)
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#18202c');
      bg.addColorStop(0.5, '#111822');
      bg.addColorStop(1, '#0c1018');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.32, 0.78), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);
      paintHexOverlay(actx, bctx, W, H, Math.max(5, H / 16), 'rgba(72,224,255,0.08)', 0.9, 0.14);

      // Sculpted glowing plasma conduits (white in emissiveMap so updateDynamicSkinMaterials smoothly shifts Cyan -> Violet -> Solar Gold!)
      const drawConduit = (pts, lw) => {
        const trace = (ctx2d) => {
          ctx2d.beginPath();
          for (let i = 0; i < pts.length; i++) {
            if (i === 0) ctx2d.moveTo(pts[i][0], pts[i][1]);
            else ctx2d.lineTo(pts[i][0], pts[i][1]);
          }
        };
        actx.save();
        actx.lineCap = 'round'; actx.lineJoin = 'round';
        trace(actx); actx.strokeStyle = '#38eeff'; actx.lineWidth = lw; actx.stroke();
        trace(actx); actx.strokeStyle = '#dffcff'; actx.lineWidth = lw * 0.42; actx.stroke();
        actx.restore();

        ectx.save();
        ectx.lineCap = 'round'; ectx.lineJoin = 'round';
        trace(ectx); ectx.strokeStyle = '#ffffff'; ectx.lineWidth = lw * 1.15; ectx.stroke();
        ectx.restore();

        bctx.save();
        trace(bctx); bctx.strokeStyle = bumpStyle(0.84); bctx.lineWidth = lw; bctx.stroke();
        bctx.restore();
      };

      const lw = Math.max(3, H * 0.042);
      drawConduit([[W * 0.05, H * 0.34], [W * 0.28, H * 0.34], [W * 0.36, H * 0.52], [W * 0.62, H * 0.52], [W * 0.70, H * 0.32], [W * 0.95, H * 0.32]], lw);
      drawConduit([[W * 0.14, H * 0.66], [W * 0.44, H * 0.66], [W * 0.52, H * 0.52]], lw * 0.68);
      drawConduit([[W * 0.62, H * 0.52], [W * 0.72, H * 0.68], [W * 0.92, H * 0.68]], lw * 0.68);

      // Reactor energy vents along forward shroud
      for (let i = 0; i < 4; i++) {
        const vx = W * 0.74 + i * H * 0.13;
        fillPoly(actx, [[vx, H * 0.42], [vx + H * 0.07, H * 0.42], [vx + H * 0.04, H * 0.56], [vx - H * 0.03, H * 0.56]], '#8af8ff');
        fillPoly(ectx, [[vx, H * 0.42], [vx + H * 0.07, H * 0.42], [vx + H * 0.04, H * 0.56], [vx - H * 0.03, H * 0.56]], '#ffffff');
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.48 });
    } else if (skinId === 'reactive_oni') {
      // Cursed Oni spirit armor: sumi-ink charcoal steel etched with glowing spectral veins & talisman runes (emissive white mask tinted Crimson -> White-Hot!)
      fillAll(actx, '#140f16', W, H);
      fillAll(rmctx, rmStyle(0.36, 0.58), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 547, 0.05, true);

      // Branching spirit-ember veins across receiver
      const veinPaths = [
        [[W * 0.04, H * 0.54], [W * 0.20, H * 0.40], [W * 0.38, H * 0.58], [W * 0.58, H * 0.34], [W * 0.78, H * 0.50], [W * 0.96, H * 0.36]],
        [[W * 0.20, H * 0.40], [W * 0.28, H * 0.22], [W * 0.44, H * 0.24]],
        [[W * 0.38, H * 0.58], [W * 0.48, H * 0.76], [W * 0.68, H * 0.74]],
        [[W * 0.58, H * 0.34], [W * 0.68, H * 0.18], [W * 0.86, H * 0.20]]
      ];
      for (const vp of veinPaths) {
        const trace = (ctx2d) => {
          ctx2d.beginPath();
          for (let i = 0; i < vp.length; i++) {
            if (i === 0) ctx2d.moveTo(vp[i][0], vp[i][1]);
            else ctx2d.lineTo(vp[i][0], vp[i][1]);
          }
        };
        const lw = Math.max(2.6, H * 0.036);
        actx.strokeStyle = '#ff2c4d'; actx.lineWidth = lw; actx.lineJoin = 'round'; trace(actx); actx.stroke();
        actx.strokeStyle = '#ff96a8'; actx.lineWidth = lw * 0.4; trace(actx); actx.stroke();
        ectx.strokeStyle = '#ffffff'; ectx.lineWidth = lw * 1.1; ectx.lineJoin = 'round'; trace(ectx); ectx.stroke();
        bctx.strokeStyle = bumpStyle(0.84); bctx.lineWidth = lw; trace(bctx); bctx.stroke();
      }
      // Subtle gilded spirit emblem diamond
      const dx = W * 0.52, dy = H * 0.48, dr = H * 0.16;
      const dia = [[dx, dy - dr], [dx + dr * 0.85, dy], [dx, dy + dr], [dx - dr * 0.85, dy]];
      actx.strokeStyle = '#f2be48'; actx.lineWidth = Math.max(2, H / 95);
      fillPoly(actx, dia, 'rgba(30,10,16,0.92)'); actx.stroke();
      fillPoly(ectx, [[dx, dy - dr * 0.45], [dx + dr * 0.38, dy], [dx, dy + dr * 0.45], [dx - dr * 0.38, dy]], '#ffffff');
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.42 });
    } else if (skinId === 'camo_diamond') {
      // BO2 / BO6 Iconic Mastery Diamond: pavé-set brilliant-cut diamonds mounted on 24K mirror-gold structural rails + starlight glints!
      fillAll(actx, '#d6e4f0', W, H);
      fillAll(rmctx, rmStyle(0.10, 0.90), W, H);
      fillAll(bctx, bumpStyle(0.45), W, H);

      // Dense pavé brilliant-cut diamond grid across body
      const cell = Math.max(10, Math.round(H / 12));
      const half = cell * 0.5;
      for (let row = 0; row * cell < H + cell; row++) {
        for (let col = -1; col * cell < W + cell; col++) {
          const cx = col * cell + (row & 1 ? half : 0);
          const cy = row * cell;
          const h1 = seededRand(919, row * 71 + col, 17);
          const h2 = seededRand(919, row * 53 + col, 43);

          // Silver bezel bed
          actx.fillStyle = '#8fa0b4';
          actx.fillRect(cx - half, cy - half, cell, cell);

          // 4 angled specular triangular facets per diamond stone
          const r = half * 0.92;
          const top = [cx, cy - r], right = [cx + r, cy], bot = [cx, cy + r], left = [cx - r, cy], mid = [cx, cy];
          const f1 = Math.round(215 + h1 * 40);
          const f2 = Math.round(170 + h2 * 52);
          const f3 = Math.round(230 + h2 * 25);
          const f4 = Math.round(150 + h1 * 55);
          fillPoly(actx, [top, right, mid], `rgb(${f1 - 8},${f1},${Math.min(255, f1 + 10)})`);
          fillPoly(actx, [right, bot, mid], `rgb(${f2 - 6},${f2},${Math.min(255, f2 + 12)})`);
          fillPoly(actx, [bot, left, mid], `rgb(${f4 - 8},${f4},${Math.min(255, f4 + 10)})`);
          fillPoly(actx, [left, top, mid], `rgb(${f3 - 4},${f3},${Math.min(255, f3 + 6)})`);
          // Bright diamond table crown
          const tr = r * 0.42;
          fillPoly(actx, [[cx, cy - tr], [cx + tr, cy], [cx, cy + tr], [cx - tr, cy]], '#ffffff');

          // Bump pyramid + ultra-gloss roughness
          fillPoly(bctx, [top, right, bot, left], bumpStyle(0.76));
          fillPoly(bctx, [[cx, cy - tr], [cx + tr, cy], [cx, cy + tr], [cx - tr, cy]], bumpStyle(0.96));
          fillPoly(rmctx, [top, right, bot, left], rmStyle(0.06, 0.94));

          // Selective crystalline starlight glint in emissiveMap (only brightest stones twinkle!)
          if (h1 > 0.78) {
            ectx.fillStyle = h2 > 0.5 ? '#c6f2ff' : '#ffffff';
            fillPoly(ectx, [[cx, cy - tr * 1.1], [cx + tr * 1.1, cy], [cx, cy + tr * 1.1], [cx - tr * 1.1, cy]], ectx.fillStyle);
          }
        }
      }

      // Mirror 24K gold structural top & bottom trim rails framing the diamonds
      const goldTrim = actx.createLinearGradient(0, 0, W, 0);
      goldTrim.addColorStop(0, '#d89f2e');
      goldTrim.addColorStop(0.5, '#ffe484');
      goldTrim.addColorStop(1, '#d89f2e');
      actx.fillStyle = goldTrim;
      actx.fillRect(0, 0, W, H * 0.16);
      actx.fillRect(0, H * 0.84, W, H * 0.16);
      rmctx.fillStyle = rmStyle(0.11, 0.98);
      rmctx.fillRect(0, 0, W, H * 0.16);
      rmctx.fillRect(0, H * 0.84, W, H * 0.16);
      bctx.fillStyle = bumpStyle(0.68);
      bctx.fillRect(0, 0, W, H * 0.16);
      bctx.fillRect(0, H * 0.84, W, H * 0.16);
      // Mask out emissive over the gold trim rails
      ectx.fillStyle = '#000000';
      ectx.fillRect(0, 0, W, H * 0.16);
      ectx.fillRect(0, H * 0.84, W, H * 0.16);
      hasEmissive = true;
    } else if (skinId === 'cod_opal') {
      // BO6 Zombies Mastery: Iridescent mother-of-pearl polygonal opal cabochons framed by brushed platinum bezels
      fillAll(actx, '#d6dee8', W, H);
      fillAll(rmctx, rmStyle(0.14, 0.92), W, H);
      fillAll(bctx, bumpStyle(0.42), W, H);

      const cols = Math.max(8, Math.round((W / H) * 7));
      const rows = 7;
      const cw = W / cols;
      const ch = H / rows;
      const pts = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const jx = (c === 0 || c === cols) ? 0 : (seededRand(seed + 11, r * 31 + c, 17) - 0.5) * cw * 0.62;
          const jy = (r === 0 || r === rows) ? 0 : (seededRand(seed + 19, r * 31 + c, 43) - 0.5) * ch * 0.62;
          pts[r][c] = [c * cw + jx, r * ch + jy];
        }
      }

      const opalPalettes = [
        ['#fff8fc', '#d9f8ff', '#f7d8f2'],
        ['#f2fcff', '#b8f3eb', '#d8dcff'],
        ['#fff6eb', '#ffdce9', '#c8ecff'],
        ['#eef7ff', '#c9e0ff', '#e7d4ff'],
        ['#f6fff8', '#c6f7df', '#d9e8ff']
      ];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p00 = pts[r][c], p10 = pts[r][c + 1], p11 = pts[r + 1][c + 1], p01 = pts[r + 1][c];
          const tris = seededRand(seed + 23, r * 29 + c, 59) > 0.5
            ? [[p00, p10, p11], [p00, p11, p01]]
            : [[p00, p10, p01], [p10, p11, p01]];
          for (let ti = 0; ti < tris.length; ti++) {
            const tri = tris[ti];
            const idx = (r * 37 + c * 13 + ti * 7);
            const pal = opalPalettes[Math.floor(seededRand(seed + 31, idx, 71) * opalPalettes.length)];
            const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
            const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            const og = actx.createLinearGradient(tri[0][0], tri[0][1], tri[2][0], tri[2][1]);
            og.addColorStop(0, pal[0]);
            og.addColorStop(0.52, pal[1]);
            og.addColorStop(1, pal[2]);
            fillPoly(actx, tri, og);

            // Subtle internal opal fire flash inside selected tiles
            const fireRoll = seededRand(seed + 53, idx, 89);
            if (fireRoll > 0.45) {
              const rad = Math.max(cw, ch) * 0.45;
              const fg = actx.createRadialGradient(cx, cy, 0, cx, cy, rad);
              const hueCol = fireRoll > 0.78 ? 'rgba(130,255,235,0.44)' : fireRoll > 0.62 ? 'rgba(255,176,232,0.40)' : 'rgba(170,210,255,0.38)';
              fg.addColorStop(0, hueCol);
              fg.addColorStop(1, 'rgba(255,255,255,0)');
              fillPoly(actx, tri, fg);
            }

            // Polished gem roughness + raised cabochon bump
            fillPoly(rmctx, tri, rmStyle(0.07 + seededRand(seed + 61, idx, 13) * 0.06, 0.34));
            fillPoly(bctx, tri, bumpStyle(0.76 + (fireRoll - 0.5) * 0.16));

            // Razor-thin brushed platinum bezel framing each opal stone
            actx.save();
            actx.strokeStyle = '#9aa9ba';
            actx.lineWidth = Math.max(1.2, H / 160);
            actx.beginPath();
            actx.moveTo(tri[0][0], tri[0][1]); actx.lineTo(tri[1][0], tri[1][1]); actx.lineTo(tri[2][0], tri[2][1]);
            actx.closePath();
            actx.stroke();
            actx.restore();

            rmctx.save();
            rmctx.strokeStyle = rmStyle(0.14, 0.98);
            rmctx.lineWidth = Math.max(1.4, H / 150);
            rmctx.beginPath();
            rmctx.moveTo(tri[0][0], tri[0][1]); rmctx.lineTo(tri[1][0], tri[1][1]); rmctx.lineTo(tri[2][0], tri[2][1]);
            rmctx.closePath();
            rmctx.stroke();
            rmctx.restore();

            bctx.save();
            bctx.strokeStyle = bumpStyle(0.28);
            bctx.lineWidth = Math.max(1.4, H / 150);
            bctx.beginPath();
            bctx.moveTo(tri[0][0], tri[0][1]); bctx.lineTo(tri[1][0], tri[1][1]); bctx.lineTo(tri[2][0], tri[2][1]);
            bctx.closePath();
            bctx.stroke();
            bctx.restore();

            // Delicate static opal starlight fire glint
            if (fireRoll > 0.80) {
              ectx.fillStyle = fireRoll > 0.90 ? '#bff9ff' : '#ffd8fa';
              ectx.beginPath();
              ectx.arc(cx, cy, Math.max(2, H * 0.022), 0, Math.PI * 2);
              ectx.fill();
              hasEmissive = true;
            }
          }
        }
      }
      // Subtle platinum structural rail trim
      const pTrim = actx.createLinearGradient(0, 0, W, 0);
      pTrim.addColorStop(0, '#c8d4e2'); pTrim.addColorStop(0.5, '#f2f7fc'); pTrim.addColorStop(1, '#bcc9d8');
      actx.fillStyle = pTrim;
      actx.fillRect(0, 0, W, H * 0.085);
      actx.fillRect(0, H * 0.915, W, H * 0.085);
      rmctx.fillStyle = rmStyle(0.10, 0.98);
      rmctx.fillRect(0, 0, W, H * 0.085);
      rmctx.fillRect(0, H * 0.915, W, H * 0.085);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'cod_dark_spine') {
      // BO6 Mastery: Matte graphite armor cleaved by razor-sharp crystalline magenta-violet energy spines
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1c1d27');
      bg.addColorStop(0.55, '#12131b');
      bg.addColorStop(1, '#0b0c12');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.76, 0.26), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 17, 0.035, true);

      // Subtle diagonal tactical armor plates
      for (let i = 0; i < 6; i++) {
        const px = W * (0.04 + i * 0.17);
        fillPoly(actx, [[px, H * 0.08], [px + W * 0.13, H * 0.08], [px + W * 0.09, H * 0.92], [px - W * 0.04, H * 0.92]], 'rgba(255,255,255,0.035)');
      }

      // Main central & branching crystalline Dark Spine formations
      const spineCount = Math.max(9, Math.round((W / H) * 6));
      for (let i = 0; i < spineCount; i++) {
        const t = (i + 0.35) / spineCount;
        const bx = t * W + (seededRand(seed, i, 13) - 0.5) * W * 0.05;
        const by = H * (0.50 + Math.sin(t * Math.PI * 2.4 + seed * 0.1) * 0.14);
        const dir = i % 2 === 0 ? -1 : 1;
        const len = H * (0.30 + seededRand(seed, i, 29) * 0.24);
        const halfW = Math.max(H * 0.055, W * 0.038);
        const tipX = bx + dir * H * 0.16 + (seededRand(seed, i, 41) - 0.5) * H * 0.12;
        const tipY = by + dir * len;

        // Backlit crystal fissure halo underneath each spine
        const halo = actx.createRadialGradient(bx, by, 0, bx, by, len * 0.72);
        halo.addColorStop(0, 'rgba(224,62,255,0.48)');
        halo.addColorStop(0.55, 'rgba(138,32,235,0.16)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = halo;
        actx.beginPath(); actx.arc(bx, by, len * 0.72, 0, Math.PI * 2); actx.fill();

        const eHalo = ectx.createRadialGradient(bx, by, 0, bx, by, len * 0.58);
        eHalo.addColorStop(0, 'rgba(220,56,255,0.75)');
        eHalo.addColorStop(1, 'rgba(0,0,0,0)');
        ectx.fillStyle = eHalo;
        ectx.beginPath(); ectx.arc(bx, by, len * 0.58, 0, Math.PI * 2); ectx.fill();

        // Two-facet beveled crystal shard (left bright magenta-lavender, right deep ultraviolet)
        const baseL = [bx - halfW, by - dir * H * 0.04];
        const baseR = [bx + halfW, by + dir * H * 0.03];
        const ridgeMid = [(bx + tipX) * 0.52, (by + tipY) * 0.52];
        const tip = [tipX, tipY];

        const gL = actx.createLinearGradient(baseL[0], baseL[1], tip[0], tip[1]);
        gL.addColorStop(0, '#5a1696');
        gL.addColorStop(0.55, '#d642ff');
        gL.addColorStop(1, '#ffd6ff');
        fillPoly(actx, [baseL, ridgeMid, tip], gL);

        const gR = actx.createLinearGradient(baseR[0], baseR[1], tip[0], tip[1]);
        gR.addColorStop(0, '#2a094e');
        gR.addColorStop(0.6, '#8b24d9');
        gR.addColorStop(1, '#f28eff');
        fillPoly(actx, [baseR, ridgeMid, tip], gR);

        // Specular glassy crystal roughness & raised ridge bump
        fillPoly(rmctx, [baseL, baseR, tip], rmStyle(0.10, 0.86));
        fillPoly(bctx, [baseL, ridgeMid, tip], bumpStyle(0.92));
        fillPoly(bctx, [baseR, ridgeMid, tip], bumpStyle(0.80));

        // Razor bright center ridge & emissive seam
        actx.strokeStyle = '#ffebff';
        actx.lineWidth = Math.max(1.2, H / 145);
        actx.beginPath(); actx.moveTo(bx, by); actx.lineTo(tipX, tipY); actx.stroke();

        ectx.strokeStyle = '#f588ff';
        ectx.lineWidth = Math.max(2.0, H / 100);
        ectx.beginPath(); ectx.moveTo(bx, by); ectx.lineTo(tipX, tipY); ectx.stroke();
      }
      // Connecting glowing fracture spine backbone along receiver midline
      ectx.strokeStyle = '#d43dff';
      ectx.lineWidth = Math.max(2.2, H / 90);
      ectx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const u = s / 18;
        const x = u * W;
        const y = H * (0.50 + Math.sin(u * Math.PI * 2.4 + seed * 0.1) * 0.14);
        if (s === 0) ectx.moveTo(x, y); else ectx.lineTo(x, y);
      }
      ectx.stroke();
      actx.strokeStyle = '#ff9dff';
      actx.lineWidth = Math.max(1.5, H / 130);
      actx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const u = s / 18;
        const x = u * W;
        const y = H * (0.50 + Math.sin(u * Math.PI * 2.4 + seed * 0.1) * 0.14);
        if (s === 0) actx.moveTo(x, y); else actx.lineTo(x, y);
      }
      actx.stroke();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.34 });
    } else if (skinId === 'cod_borealis') {
      // MW3 Zombies Mastery: Arctic midnight brushed alloy swept by layered northern-lights aurora ribbons
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#060e1c');
      bg.addColorStop(0.5, '#0b182e');
      bg.addColorStop(1, '#091024');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.18, 0.86), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 29, 0.03, true);

      // Painted multi-ribbon aurora borealis curtains (emerald -> glacier cyan -> aurora violet)
      const ribbons = [
        { yBase: 0.28, amp: 0.16, freq: 1.8, phase: 0.4, c0: 'rgba(18,245,172,0.0)', c1: 'rgba(28,248,186,0.92)', c2: 'rgba(46,220,255,0.78)', eCol: 'rgba(36,245,190,0.68)', hFrac: 0.30 },
        { yBase: 0.54, amp: 0.18, freq: 2.2, phase: 2.1, c0: 'rgba(54,230,255,0.0)', c1: 'rgba(56,236,255,0.88)', c2: 'rgba(156,82,255,0.82)', eCol: 'rgba(72,220,255,0.62)', hFrac: 0.34 },
        { yBase: 0.72, amp: 0.13, freq: 1.5, phase: 3.9, c0: 'rgba(170,74,255,0.0)', c1: 'rgba(178,86,255,0.84)', c2: 'rgba(255,96,204,0.52)', eCol: 'rgba(172,88,255,0.52)', hFrac: 0.26 }
      ];
      for (let ri = 0; ri < ribbons.length; ri++) {
        const rb = ribbons[ri];
        const steps = 40;
        const bandH = H * rb.hFrac;
        for (let k = 0; k < 2; k++) {
          const target = k === 0 ? actx : ectx;
          target.save();
          target.beginPath();
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const x = u * W;
            const wave = Math.sin(u * Math.PI * 2 * rb.freq + rb.phase + (seed % 17) * 0.2) * H * rb.amp
              + Math.cos(u * Math.PI * 3.1 - rb.phase) * H * 0.05;
            const y = H * rb.yBase + wave;
            if (s === 0) target.moveTo(x, y - bandH * 0.45);
            else target.lineTo(x, y - bandH * 0.45);
          }
          for (let s = steps; s >= 0; s--) {
            const u = s / steps;
            const x = u * W;
            const wave = Math.sin(u * Math.PI * 2 * rb.freq + rb.phase + (seed % 17) * 0.2) * H * rb.amp
              + Math.cos(u * Math.PI * 3.1 - rb.phase) * H * 0.05;
            const y = H * rb.yBase + wave;
            target.lineTo(x, y + bandH * 0.55);
          }
          target.closePath();
          const rg = target.createLinearGradient(0, H * (rb.yBase - 0.25), 0, H * (rb.yBase + 0.30));
          if (k === 0) {
            rg.addColorStop(0, rb.c0);
            rg.addColorStop(0.35, rb.c1);
            rg.addColorStop(0.72, rb.c2);
            rg.addColorStop(1, rb.c0);
          } else {
            rg.addColorStop(0, 'rgba(0,0,0,0)');
            rg.addColorStop(0.45, rb.eCol);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
          }
          target.fillStyle = rg;
          target.fill();
          target.restore();
        }

        // Fine vertical aurora silk striations along the curtain ridge
        actx.save();
        actx.strokeStyle = ri === 0 ? 'rgba(186,255,232,0.42)' : ri === 1 ? 'rgba(180,242,255,0.38)' : 'rgba(235,186,255,0.34)';
        actx.lineWidth = Math.max(1, W / 380);
        for (let s = 0; s < 56; s++) {
          const u = (s + 0.5) / 56;
          const x = u * W;
          const wave = Math.sin(u * Math.PI * 2 * rb.freq + rb.phase + (seed % 17) * 0.2) * H * rb.amp;
          const y = H * rb.yBase + wave;
          const hLen = bandH * (0.35 + seededRand(seed + ri * 7, s, 31) * 0.55);
          actx.beginPath(); actx.moveTo(x, y - hLen * 0.5); actx.lineTo(x, y + hLen * 0.5); actx.stroke();
        }
        actx.restore();
      }

      // Crisp arctic starlight pinpoints
      for (let i = 0; i < 65; i++) {
        const sx = seededRand(seed + 71, i, 13) * W;
        const sy = seededRand(seed + 71, i, 37) * H;
        const sr = Math.max(0.8, (0.6 + seededRand(seed + 71, i, 61) * 1.4) * (H / 240));
        actx.fillStyle = '#e8ffff';
        actx.beginPath(); actx.arc(sx, sy, sr, 0, Math.PI * 2); actx.fill();
        if (i % 4 === 0) {
          ectx.fillStyle = '#a4fff2';
          ectx.beginPath(); ectx.arc(sx, sy, sr * 1.3, 0, Math.PI * 2); ectx.fill();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.22 });
    } else if (skinId === 'cod_interstellar') {
      // MW3 Grand Mastery: Deep cosmic indigo starfield, painted lavender/indigo nebula clouds, 4-point star flares & constellation lines
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#07081c');
      bg.addColorStop(0.48, '#101036');
      bg.addColorStop(1, '#080a22');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.14, 0.78), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      // Velvety painted nebula clouds
      const clouds = [
        [0.18, 0.36, 0.34, 'rgba(136,78,255,0.68)', 'rgba(56,120,255,0.28)'],
        [0.52, 0.60, 0.38, 'rgba(92,152,255,0.62)', 'rgba(176,72,248,0.26)'],
        [0.82, 0.34, 0.32, 'rgba(218,86,232,0.58)', 'rgba(94,70,240,0.24)'],
        [0.36, 0.74, 0.26, 'rgba(66,204,255,0.44)', 'rgba(110,60,220,0.18)'],
        [0.68, 0.22, 0.28, 'rgba(164,116,255,0.52)', 'rgba(42,88,220,0.18)']
      ];
      for (const [cx, cy, rad, c0, c1] of clouds) {
        const rx = W * cx, ry = H * cy, rr = Math.max(W, H) * rad;
        const cg = actx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        cg.addColorStop(0, c0);
        cg.addColorStop(0.55, c1);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = cg;
        actx.fillRect(0, 0, W, H);

        const eg = ectx.createRadialGradient(rx, ry, 0, rx, ry, rr * 0.72);
        eg.addColorStop(0, c0.replace(/0\.\d+\)/, '0.42)'));
        eg.addColorStop(1, 'rgba(0,0,0,0)');
        ectx.fillStyle = eg;
        ectx.fillRect(0, 0, W, H);
      }

      // Constellation nodes & delicate engraved silver-violet coordinate threads
      const starNodes = [];
      for (let i = 0; i < 11; i++) {
        const sx = W * (0.07 + (i / 10) * 0.86) + (seededRand(seed + 19, i, 11) - 0.5) * W * 0.04;
        const sy = H * (0.18 + seededRand(seed + 19, i, 29) * 0.64);
        starNodes.push([sx, sy]);
      }
      actx.save();
      actx.strokeStyle = 'rgba(204,224,255,0.52)';
      actx.lineWidth = Math.max(1.0, H / 200);
      ectx.strokeStyle = 'rgba(168,200,255,0.48)';
      ectx.lineWidth = Math.max(1.0, H / 210);
      for (let i = 0; i < starNodes.length - 1; i++) {
        const a = starNodes[i], b = starNodes[i + 1];
        actx.beginPath(); actx.moveTo(a[0], a[1]); actx.lineTo(b[0], b[1]); actx.stroke();
        ectx.beginPath(); ectx.moveTo(a[0], a[1]); ectx.lineTo(b[0], b[1]); ectx.stroke();
        if (i + 2 < starNodes.length && i % 3 === 0) {
          const c = starNodes[i + 2];
          actx.beginPath(); actx.moveTo(a[0], a[1]); actx.lineTo(c[0], c[1]); actx.stroke();
        }
      }
      actx.restore();

      // Crisp 4-point diamond star flares on constellation anchors
      for (let i = 0; i < starNodes.length; i++) {
        const [sx, sy] = starNodes[i];
        const fl = H * (0.045 + (i % 3) * 0.018);
        for (const tctx of [actx, ectx]) {
          tctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#d6e6ff';
          tctx.beginPath();
          tctx.moveTo(sx, sy - fl); tctx.lineTo(sx + fl * 0.16, sy - fl * 0.16);
          tctx.lineTo(sx + fl, sy); tctx.lineTo(sx + fl * 0.16, sy + fl * 0.16);
          tctx.lineTo(sx, sy + fl); tctx.lineTo(sx - fl * 0.16, sy + fl * 0.16);
          tctx.lineTo(sx - fl, sy); tctx.lineTo(sx - fl * 0.16, sy - fl * 0.16);
          tctx.closePath();
          tctx.fill();
        }
        bctx.fillStyle = bumpStyle(0.72);
        bctx.beginPath(); bctx.arc(sx, sy, fl * 0.22, 0, Math.PI * 2); bctx.fill();
      }

      // Fine dense starfield dust
      for (let i = 0; i < 120; i++) {
        const sx = seededRand(seed + 91, i, 17) * W;
        const sy = seededRand(seed + 91, i, 43) * H;
        const sr = Math.max(0.7, (0.5 + seededRand(seed + 91, i, 73) * 1.4) * (H / 250));
        const col = i % 5 === 0 ? '#c4b8ff' : i % 3 === 0 ? '#a8e4ff' : '#ffffff';
        actx.fillStyle = col;
        actx.beginPath(); actx.arc(sx, sy, sr, 0, Math.PI * 2); actx.fill();
        if (i % 3 === 0) {
          ectx.fillStyle = col;
          ectx.beginPath(); ectx.arc(sx, sy, sr, 0, Math.PI * 2); ectx.fill();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.20 });
    } else if (skinId === 'cod_nebula') {
      // BO6 Final Mastery: Deep-space violet, cosmic teal, magenta-crimson lacquer with dark dust lanes & golden star flares
      fillAll(actx, '#080512', W, H);
      fillAll(rmctx, rmStyle(0.11, 0.72), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      const nebulaBlooms = [
        [0.16, 0.56, 0.42, 'rgba(196,42,255,0.88)', 'rgba(92,20,168,0.42)'],
        [0.44, 0.34, 0.40, 'rgba(26,216,226,0.82)', 'rgba(22,86,158,0.36)'],
        [0.72, 0.62, 0.44, 'rgba(255,58,162,0.84)', 'rgba(130,24,142,0.38)'],
        [0.88, 0.26, 0.34, 'rgba(148,74,255,0.78)', 'rgba(34,148,210,0.28)'],
        [0.34, 0.74, 0.30, 'rgba(255,186,88,0.52)', 'rgba(182,42,126,0.22)']
      ];
      for (const [cx, cy, rad, c0, c1] of nebulaBlooms) {
        const rx = W * cx, ry = H * cy, rr = Math.max(W, H) * rad;
        const g = actx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = g; actx.fillRect(0, 0, W, H);

        const eg = ectx.createRadialGradient(rx, ry, 0, rx, ry, rr * 0.62);
        eg.addColorStop(0, c0.replace(/0\.\d+\)/, '0.48)')); eg.addColorStop(1, 'rgba(0,0,0,0)');
        ectx.fillStyle = eg; ectx.fillRect(0, 0, W, H);
      }

      // Dramatic dark cosmic dust lanes carving sculptural contrast across the nebula
      actx.save();
      actx.strokeStyle = 'rgba(7,4,16,0.78)';
      actx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        actx.lineWidth = H * (0.075 + (i % 2) * 0.045);
        actx.beginPath();
        const y0 = H * (0.18 + i * 0.22);
        actx.moveTo(-W * 0.05, y0);
        actx.bezierCurveTo(W * 0.28, y0 + H * 0.24 * (i % 2 ? -1 : 1), W * 0.66, y0 - H * 0.22 * (i % 2 ? -1 : 1), W * 1.05, y0 + H * 0.08);
        actx.stroke();
      }
      actx.restore();

      // Golden-white star clusters & bright 4-point star flares
      for (let i = 0; i < 110; i++) {
        const sx = seededRand(seed + 131, i, 19) * W;
        const sy = seededRand(seed + 131, i, 47) * H;
        const sr = Math.max(0.8, (0.6 + seededRand(seed + 131, i, 83) * 1.7) * (H / 240));
        const warm = i % 4 === 0;
        actx.fillStyle = warm ? '#ffe8a6' : '#f2faff';
        actx.beginPath(); actx.arc(sx, sy, sr, 0, Math.PI * 2); actx.fill();
        if (i < 9) {
          const fl = H * (0.048 + (i % 3) * 0.02);
          for (const tctx of [actx, ectx]) {
            tctx.fillStyle = warm ? '#ffdf88' : '#ffffff';
            tctx.beginPath();
            tctx.moveTo(sx, sy - fl); tctx.lineTo(sx + fl * 0.14, sy - fl * 0.14);
            tctx.lineTo(sx + fl, sy); tctx.lineTo(sx + fl * 0.14, sy + fl * 0.14);
            tctx.lineTo(sx, sy + fl); tctx.lineTo(sx - fl * 0.14, sy + fl * 0.14);
            tctx.lineTo(sx - fl, sy); tctx.lineTo(sx - fl * 0.14, sy - fl * 0.14);
            tctx.closePath(); tctx.fill();
          }
        } else if (i % 3 === 0) {
          ectx.fillStyle = warm ? '#ffd876' : '#c6f4ff';
          ectx.beginPath(); ectx.arc(sx, sy, sr * 1.2, 0, Math.PI * 2); ectx.fill();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.18 });
    } else if (skinId === 'cod_mercury') {
      // MW3 Prestige I: Mirror liquid quicksilver chrome ripples pooling over satin dark machined titanium grooves
      const aImg = actx.createImageData(W, H);
      const rmImg = rmctx.createImageData(W, H);
      const bImg = bctx.createImageData(W, H);
      const ad = aImg.data, rmd = rmImg.data, bd = bImg.data;
      for (let py = 0; py < H; py++) {
        const v = 1 - py / (H - 1);
        for (let px = 0; px < W; px++) {
          const u = px / (W - 1);
          const idx = (py * W + px) * 4;
          const w1 = KS.fbm2D(u * 4.4 + ox, v * 4.4 + oy, seed + 17, 4);
          const w2 = KS.fbm2D(u * 8.6 + w1 * 2.1, v * 8.6 - w1 * 1.8, seed + 61, 3);
          const ripple = Math.sin((u * 5.6 + v * 3.8 + w1 * 5.2 + w2 * 1.4) * Math.PI * 2) * 0.5 + 0.5;
          const pool = Math.pow(ripple, 0.72);
          let r, g, b, rough, metal, bump;
          if (pool > 0.24) {
            // Pure liquid quicksilver chrome wave
            const crest = Math.pow((pool - 0.24) / 0.76, 1.15);
            const lum = 162 + crest * 93;
            r = Math.min(255, lum * 0.97);
            g = Math.min(255, lum * 1.00);
            b = Math.min(255, lum * 1.05);
            rough = 0.04 + (1 - crest) * 0.09;
            metal = 1.0;
            bump = 0.44 + crest * 0.52;
          } else {
            // Recessed satin dark machined titanium channel
            const groove = pool / 0.24;
            r = 28 + groove * 34; g = 33 + groove * 38; b = 42 + groove * 44;
            rough = 0.56 - groove * 0.14;
            metal = 0.72;
            bump = 0.18 + groove * 0.16;
          }
          ad[idx] = Math.round(r); ad[idx + 1] = Math.round(g); ad[idx + 2] = Math.round(b); ad[idx + 3] = 255;
          rmd[idx] = 255;
          rmd[idx + 1] = Math.max(14, Math.min(248, Math.round(rough * 255)));
          rmd[idx + 2] = Math.max(0, Math.min(255, Math.round(metal * 255)));
          rmd[idx + 3] = 255;
          const bv = Math.max(0, Math.min(255, Math.round(bump * 255)));
          bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
        }
      }
      actx.putImageData(aImg, 0, 0);
      rmctx.putImageData(rmImg, 0, 0);
      bctx.putImageData(bImg, 0, 0);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'cod_molten_obsidian') {
      // MW3 Prestige II: Matte volcanic polygonal obsidian slabs fractured by crisp incandescent amber-gold slag veins
      fillAll(actx, '#141112', W, H);
      fillAll(rmctx, rmStyle(0.88, 0.16), W, H);
      fillAll(bctx, bumpStyle(0.76), W, H);

      const cols = Math.max(7, Math.round((W / H) * 5.5));
      const rows = 5;
      const cw = W / cols;
      const ch = H / rows;
      const pts = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const jx = (c === 0 || c === cols) ? 0 : (seededRand(seed + 41, r * 29 + c, 19) - 0.5) * cw * 0.72;
          const jy = (r === 0 || r === rows) ? 0 : (seededRand(seed + 41, r * 29 + c, 53) - 0.5) * ch * 0.72;
          pts[r][c] = [c * cw + jx, r * ch + jy];
        }
      }

      // First paint molten slag under-layer along all fracture edges
      const drawEdges = (ctx, style, lw) => {
        ctx.save();
        ctx.strokeStyle = style;
        ctx.lineWidth = lw;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p00 = pts[r][c], p10 = pts[r][c + 1], p11 = pts[r + 1][c + 1], p01 = pts[r + 1][c];
            ctx.beginPath();
            ctx.moveTo(p00[0], p00[1]); ctx.lineTo(p10[0], p10[1]); ctx.lineTo(p11[0], p11[1]); ctx.lineTo(p01[0], p01[1]);
            ctx.closePath();
            ctx.stroke();
            if (seededRand(seed + 67, r * 17 + c, 11) > 0.36) {
              ctx.beginPath(); ctx.moveTo(p00[0], p00[1]); ctx.lineTo(p11[0], p11[1]); ctx.stroke();
            }
          }
        }
        ctx.restore();
      };

      // Paint volcanic basalt slabs with subtle facet shading
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const quad = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
          const v = 16 + Math.round(seededRand(seed + 79, r * 23 + c, 31) * 16);
          const sg = actx.createLinearGradient(quad[0][0], quad[0][1], quad[2][0], quad[2][1]);
          sg.addColorStop(0, `rgb(${v + 12},${v + 10},${v + 13})`);
          sg.addColorStop(1, `rgb(${v},${v - 1},${v + 2})`);
          fillPoly(actx, quad, sg);
          fillPoly(rmctx, quad, rmStyle(0.84 + seededRand(seed, r * 19 + c, 7) * 0.10, 0.14));
          fillPoly(bctx, quad, bumpStyle(0.74 + seededRand(seed, r * 19 + c, 23) * 0.16));
        }
      }

      // Layered molten fissures: deep scorch -> bright orange-amber -> white-gold core
      drawEdges(actx, '#5a1606', Math.max(8, H / 28));
      drawEdges(actx, '#ff590a', Math.max(4.6, H / 48));
      drawEdges(actx, '#ffbe32', Math.max(2.4, H / 92));
      drawEdges(actx, '#fff2b0', Math.max(1.1, H / 190));

      drawEdges(rmctx, rmStyle(0.20, 0.12), Math.max(5.0, H / 46));
      drawEdges(bctx, bumpStyle(0.10), Math.max(5.5, H / 42));

      drawEdges(ectx, '#ff4800', Math.max(6.2, H / 36));
      drawEdges(ectx, '#ffaa1e', Math.max(3.0, H / 72));
      drawEdges(ectx, '#fff0a4', Math.max(1.2, H / 180));
      hasEmissive = true;
    } else if (skinId === 'cod_constellation') {
      // MW3 Prestige III ("Constellation's End"): Prussian-navy celestial enamel + engraved 24K gold astrolabe rings & zodiac star-charts
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#071229');
      bg.addColorStop(0.5, '#0c1f44');
      bg.addColorStop(1, '#061024');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.18, 0.42), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);

      // Soft midnight celestial halo behind central astrolabe
      const ax = W * 0.54, ay = H * 0.48;
      const halo = actx.createRadialGradient(ax, ay, 0, ax, ay, H * 0.65);
      halo.addColorStop(0, 'rgba(34,76,162,0.52)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      actx.fillStyle = halo; actx.fillRect(0, 0, W, H);

      const goldGrad = actx.createLinearGradient(0, 0, W, H);
      goldGrad.addColorStop(0, '#d89b2c');
      goldGrad.addColorStop(0.35, '#ffe694');
      goldGrad.addColorStop(0.7, '#e2a634');
      goldGrad.addColorStop(1, '#fff0b2');

      const strokeGold = (drawFn, lw, glow) => {
        actx.save(); actx.strokeStyle = goldGrad; actx.lineWidth = lw; drawFn(actx); actx.restore();
        rmctx.save(); rmctx.strokeStyle = rmStyle(0.10, 0.98); rmctx.lineWidth = lw * 1.1; drawFn(rmctx); rmctx.restore();
        bctx.save(); bctx.strokeStyle = bumpStyle(0.84); bctx.lineWidth = lw * 1.1; drawFn(bctx); bctx.restore();
        if (glow) {
          ectx.save(); ectx.strokeStyle = 'rgba(255,212,102,0.55)'; ectx.lineWidth = lw; drawFn(ectx); ectx.restore();
        }
      };

      // Concentric celestial astrolabe rings & degree ticks
      const radii = [H * 0.16, H * 0.28, H * 0.39, H * 0.46];
      for (let i = 0; i < radii.length; i++) {
        const rad = radii[i];
        strokeGold((ctx) => { ctx.beginPath(); ctx.arc(ax, ay, rad, 0, Math.PI * 2); ctx.stroke(); }, Math.max(1.4, H / (i === 2 ? 95 : 155)), i === 2);
      }
      // Secondary offset orbital ring (rear receiver)
      strokeGold((ctx) => { ctx.beginPath(); ctx.arc(W * 0.18, H * 0.56, H * 0.34, 0, Math.PI * 2); ctx.stroke(); }, Math.max(1.3, H / 160), false);
      strokeGold((ctx) => { ctx.beginPath(); ctx.arc(W * 0.88, H * 0.42, H * 0.28, 0, Math.PI * 2); ctx.stroke(); }, Math.max(1.3, H / 160), false);

      // Degree tick marks around outer astrolabe ring
      strokeGold((ctx) => {
        ctx.beginPath();
        for (let t = 0; t < 48; t++) {
          const ang = (t / 48) * Math.PI * 2;
          const inner = radii[2] - (t % 4 === 0 ? H * 0.045 : H * 0.022);
          ctx.moveTo(ax + Math.cos(ang) * inner, ay + Math.sin(ang) * inner);
          ctx.lineTo(ax + Math.cos(ang) * radii[2], ay + Math.sin(ang) * radii[2]);
        }
        ctx.stroke();
      }, Math.max(1.0, H / 210), false);

      // Sweeping meridian arcs & compass crosshairs
      strokeGold((ctx) => {
        ctx.beginPath();
        ctx.moveTo(W * 0.04, ay); ctx.lineTo(W * 0.96, ay);
        ctx.moveTo(ax, H * 0.06); ctx.lineTo(ax, H * 0.94);
        ctx.moveTo(W * 0.05, H * 0.14); ctx.quadraticCurveTo(W * 0.50, H * 0.88, W * 0.95, H * 0.14);
        ctx.moveTo(W * 0.05, H * 0.86); ctx.quadraticCurveTo(W * 0.50, H * 0.12, W * 0.95, H * 0.86);
        ctx.stroke();
      }, Math.max(1.1, H / 190), false);

      // Engraved gold border rails & zodiac star points
      actx.fillStyle = goldGrad;
      actx.fillRect(0, H * 0.075, W, Math.max(2, H * 0.02));
      actx.fillRect(0, H * 0.905, W, Math.max(2, H * 0.02));
      rmctx.fillStyle = rmStyle(0.10, 0.98);
      rmctx.fillRect(0, H * 0.075, W, Math.max(2, H * 0.02));
      rmctx.fillRect(0, H * 0.905, W, Math.max(2, H * 0.02));

      for (let i = 0; i < 24; i++) {
        const sx = W * (0.06 + seededRand(seed + 37, i, 13) * 0.88);
        const sy = H * (0.14 + seededRand(seed + 37, i, 59) * 0.72);
        const fl = H * (i < 6 ? 0.042 : 0.018);
        for (const tctx of [actx, ectx]) {
          tctx.fillStyle = i < 6 ? '#ffe89a' : '#f0c458';
          tctx.beginPath();
          tctx.moveTo(sx, sy - fl); tctx.lineTo(sx + fl * 0.2, sy - fl * 0.2);
          tctx.lineTo(sx + fl, sy); tctx.lineTo(sx + fl * 0.2, sy + fl * 0.2);
          tctx.lineTo(sx, sy + fl); tctx.lineTo(sx - fl * 0.2, sy + fl * 0.2);
          tctx.lineTo(sx - fl, sy); tctx.lineTo(sx - fl * 0.2, sy - fl * 0.2);
          tctx.closePath(); tctx.fill();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'cod_orion') {
      // MW2 AR Signature: Royal cobalt-indigo anodized alloy + crisp iridescent cyan/violet/magenta topographic contour waves
      const aImg = actx.createImageData(W, H);
      const rmImg = rmctx.createImageData(W, H);
      const bImg = bctx.createImageData(W, H);
      const eImg = ectx.createImageData(W, H);
      const ad = aImg.data, rmd = rmImg.data, bd = bImg.data, ed = eImg.data;
      hasEmissive = true;

      for (let py = 0; py < H; py++) {
        const v = 1 - py / (H - 1);
        for (let px = 0; px < W; px++) {
          const u = px / (W - 1);
          const idx = (py * W + px) * 4;
          const f1 = KS.fbm2D(u * 3.6 + ox, v * 3.6 + oy, seed + 23, 4);
          const f2 = KS.fbm2D(u * 7.2 + f1 * 2.0, v * 7.2 - f1 * 1.6, seed + 83, 3);
          const field = u * 2.8 + v * 1.9 + f1 * 4.8 + f2 * 1.2;
          const wave = Math.abs(Math.sin(field * Math.PI * 2.4));
          const isLine = wave > 0.84;
          const colorPos = (f1 * 1.6 + u * 0.7 + v * 0.4) % 1;
          let r, g, b, rough, metal, bump, er = 0, eg = 0, eb = 0;

          if (isLine) {
            const lineIntensity = Math.min(1, (wave - 0.84) / 0.16);
            if (colorPos < 0.34) {
              const t = colorPos / 0.34;
              r = 46 + t * 116; g = 232 - t * 140; b = 255;
            } else if (colorPos < 0.68) {
              const t = (colorPos - 0.34) / 0.34;
              r = 162 + t * 93; g = 92 - t * 30; b = 255 - t * 72;
            } else {
              const t = (colorPos - 0.68) / 0.32;
              r = 255 - t * 209; g = 62 + t * 170; b = 183 + t * 72;
            }
            er = r * 0.58 * lineIntensity;
            eg = g * 0.58 * lineIntensity;
            eb = b * 0.64 * lineIntensity;
            rough = 0.12;
            metal = 0.94;
            bump = 0.78;
          } else {
            // Deep royal cobalt-indigo metallic base with subtle diagonal brushed hatching
            const hatch = Math.sin((px + py) * 0.55) * 0.5 + 0.5;
            r = 12 + f2 * 22 + hatch * 6;
            g = 18 + f2 * 30 + hatch * 8;
            b = 54 + f1 * 64 + hatch * 14;
            rough = 0.24 + (1 - hatch) * 0.08;
            metal = 0.90;
            bump = 0.44 + hatch * 0.08;
          }

          ad[idx] = Math.min(255, Math.round(r)); ad[idx + 1] = Math.min(255, Math.round(g)); ad[idx + 2] = Math.min(255, Math.round(b)); ad[idx + 3] = 255;
          rmd[idx] = 255; rmd[idx + 1] = Math.round(rough * 255); rmd[idx + 2] = Math.round(metal * 255); rmd[idx + 3] = 255;
          const bv = Math.round(bump * 255); bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
          ed[idx] = Math.min(255, Math.round(er)); ed[idx + 1] = Math.min(255, Math.round(eg)); ed[idx + 2] = Math.min(255, Math.round(eb)); ed[idx + 3] = 255;
        }
      }
      actx.putImageData(aImg, 0, 0);
      rmctx.putImageData(rmImg, 0, 0);
      bctx.putImageData(bImg, 0, 0);
      ectx.putImageData(eImg, 0, 0);
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'cod_retro_grid') {
      // SMG Signature: Striped Outrun sunset chrome horizon sun + receding laser-cyan & neon-magenta perspective wireframe grid
      const horY = H * 0.54;
      const sky = actx.createLinearGradient(0, 0, 0, horY);
      sky.addColorStop(0, '#09041c');
      sky.addColorStop(0.58, '#230b4a');
      sky.addColorStop(1, '#78196e');
      actx.fillStyle = sky;
      actx.fillRect(0, 0, W, horY);

      const ground = actx.createLinearGradient(0, horY, 0, H);
      ground.addColorStop(0, '#180834');
      ground.addColorStop(1, '#070312');
      actx.fillStyle = ground;
      actx.fillRect(0, horY, W, H - horY);
      fillAll(rmctx, rmStyle(0.16, 0.80), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      // Iconic sliced retro sunset chrome sun disc
      const sunX = W * 0.50, sunY = horY - H * 0.04, sunR = H * 0.34;
      actx.save();
      actx.beginPath(); actx.arc(sunX, sunY, sunR, 0, Math.PI * 2); actx.clip();
      const sg = actx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sg.addColorStop(0, '#fff275');
      sg.addColorStop(0.42, '#ff8c2e');
      sg.addColorStop(0.78, '#ff2a94');
      sg.addColorStop(1, '#b8147a');
      actx.fillStyle = sg;
      actx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
      // Horizontal retro slice cutouts across lower half of sun
      actx.fillStyle = '#240b4c';
      for (let s = 0; s < 5; s++) {
        const sy = sunY + sunR * (0.08 + s * 0.17);
        const sh = sunR * (0.035 + s * 0.014);
        actx.fillRect(sunX - sunR, sy, sunR * 2, sh);
      }
      actx.restore();

      // Sun emissive glow
      const eSun = ectx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.25);
      eSun.addColorStop(0, 'rgba(255,154,64,0.85)');
      eSun.addColorStop(0.65, 'rgba(255,46,158,0.45)');
      eSun.addColorStop(1, 'rgba(0,0,0,0)');
      ectx.fillStyle = eSun; ectx.fillRect(0, 0, W, horY + H * 0.1);

      // Silhouette geometric mountain ridge along horizon
      const peaks = [[0, horY], [W * 0.12, horY - H * 0.14], [W * 0.24, horY - H * 0.04], [W * 0.34, horY - H * 0.18], [W * 0.44, horY],
        [W * 0.58, horY], [W * 0.70, horY - H * 0.16], [W * 0.82, horY - H * 0.05], [W * 0.92, horY - H * 0.15], [W, horY]];
      fillPoly(actx, peaks, '#0e0524');

      // Glowing horizon line
      actx.fillStyle = '#ff44cc';
      actx.fillRect(0, horY - 1.5, W, 3);
      ectx.fillStyle = '#ff44cc';
      ectx.fillRect(0, horY - 2, W, 4);

      // Receding laser-cyan perspective wireframe grid
      actx.save(); ectx.save(); bctx.save();
      actx.strokeStyle = '#38f6ff'; actx.lineWidth = Math.max(1.3, H / 160);
      ectx.strokeStyle = '#2aeaff'; ectx.lineWidth = Math.max(1.5, H / 145);
      bctx.strokeStyle = bumpStyle(0.76); bctx.lineWidth = Math.max(1.6, H / 140);
      const vpX = W * 0.50;
      for (let i = -9; i <= 9; i++) {
        const bx = vpX + i * (W * 0.14);
        for (const tctx of [actx, ectx, bctx]) {
          tctx.beginPath(); tctx.moveTo(vpX + i * (W * 0.022), horY); tctx.lineTo(bx, H); tctx.stroke();
        }
      }
      for (let r = 1; r <= 7; r++) {
        const t = Math.pow(r / 7, 1.75);
        const y = horY + t * (H - horY);
        const col = r % 2 === 0 ? '#ff49c4' : '#38f6ff';
        actx.strokeStyle = col; ectx.strokeStyle = col;
        for (const tctx of [actx, ectx, bctx]) {
          tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(W, y); tctx.stroke();
        }
      }
      actx.restore(); ectx.restore(); bctx.restore();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.22 });
    } else if (skinId === 'cod_forged_titanium') {
      // Shotgun Signature: Interlocking brushed billet titanium plates + chamfered rivets + heat-blued TIG weld beads
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#9baab8');
      bg.addColorStop(0.45, '#c8d4de');
      bg.addColorStop(0.75, '#7c8b99');
      bg.addColorStop(1, '#aebcc9');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.24, 0.94), W, H);
      fillAll(bctx, bumpStyle(0.56), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 19, 0.065, true);

      // Interlocking billet titanium armor panels
      const panels = [
        [[0.02, 0.08], [0.36, 0.08], [0.31, 0.52], [0.02, 0.52]],
        [[0.38, 0.08], [0.74, 0.08], [0.69, 0.52], [0.33, 0.52]],
        [[0.76, 0.08], [0.98, 0.08], [0.98, 0.52], [0.71, 0.52]],
        [[0.02, 0.55], [0.48, 0.55], [0.43, 0.92], [0.02, 0.92]],
        [[0.50, 0.55], [0.98, 0.55], [0.98, 0.92], [0.45, 0.92]]
      ];
      for (let i = 0; i < panels.length; i++) {
        const poly = panels[i].map(([u, v]) => [u * W, v * H]);
        const shade = i % 2 === 0 ? '#b7c4d0' : '#8b99a8';
        const pg = actx.createLinearGradient(poly[0][0], poly[0][1], poly[2][0], poly[2][1]);
        pg.addColorStop(0, '#d8e2eb');
        pg.addColorStop(0.5, shade);
        pg.addColorStop(1, '#6f7e8d');
        fillPoly(actx, poly, pg);
        fillPoly(rmctx, poly, rmStyle(i % 2 === 0 ? 0.20 : 0.28, 0.96));
        fillPoly(bctx, poly, bumpStyle(0.68));

        // Chamfered dark seam groove
        actx.save();
        actx.strokeStyle = '#1b232c';
        actx.lineWidth = Math.max(2.4, H / 85);
        actx.beginPath();
        poly.forEach((p, idx) => idx === 0 ? actx.moveTo(p[0], p[1]) : actx.lineTo(p[0], p[1]));
        actx.closePath(); actx.stroke();
        actx.restore();

        bctx.save();
        bctx.strokeStyle = bumpStyle(0.18);
        bctx.lineWidth = Math.max(3.0, H / 72);
        bctx.beginPath();
        poly.forEach((p, idx) => idx === 0 ? bctx.moveTo(p[0], p[1]) : bctx.lineTo(p[0], p[1]));
        bctx.closePath(); bctx.stroke();
        bctx.restore();
      }

      // Heat-blued iridescent TIG weld seams along horizontal & diagonal panel joins
      const weldPaths = [
        [[W * 0.02, H * 0.535], [W * 0.98, H * 0.535]],
        [[W * 0.37, H * 0.08], [W * 0.32, H * 0.52]],
        [[W * 0.75, H * 0.08], [W * 0.70, H * 0.52]],
        [[W * 0.49, H * 0.55], [W * 0.44, H * 0.92]]
      ];
      for (const [p0, p1] of weldPaths) {
        const wg = actx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        wg.addColorStop(0, '#c89242');
        wg.addColorStop(0.28, '#8a4be0');
        wg.addColorStop(0.55, '#2c76ff');
        wg.addColorStop(0.80, '#58c8f5');
        wg.addColorStop(1, '#d89a44');
        actx.save();
        actx.strokeStyle = wg;
        actx.lineWidth = Math.max(4.5, H / 48);
        actx.globalAlpha = 0.72;
        actx.beginPath(); actx.moveTo(p0[0], p0[1]); actx.lineTo(p1[0], p1[1]); actx.stroke();
        actx.restore();

        // Stacked coin TIG weld beads
        const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const beads = Math.max(6, Math.round(dist / Math.max(5, H * 0.04)));
        for (let b = 0; b <= beads; b++) {
          const t = b / beads;
          const bx = p0[0] + (p1[0] - p0[0]) * t;
          const by = p0[1] + (p1[1] - p0[1]) * t;
          const br = Math.max(1.8, H * 0.018);
          actx.fillStyle = b % 2 === 0 ? '#d8e8ff' : '#8cb8f0';
          actx.beginPath(); actx.arc(bx, by, br, 0, Math.PI * 2); actx.fill();
          bctx.fillStyle = bumpStyle(0.92);
          bctx.beginPath(); bctx.arc(bx, by, br * 1.1, 0, Math.PI * 2); bctx.fill();
        }
      }

      // Machined recessed titanium Torx rivets in panel corners
      const rivets = [[0.06, 0.14], [0.32, 0.14], [0.42, 0.14], [0.69, 0.14], [0.80, 0.14], [0.94, 0.14],
        [0.06, 0.85], [0.39, 0.85], [0.54, 0.85], [0.94, 0.85]];
      for (const [rx, ry] of rivets) {
        const cx = rx * W, cy = ry * H, rr = Math.max(2.6, H * 0.028);
        actx.fillStyle = '#252f3a'; actx.beginPath(); actx.arc(cx, cy, rr * 1.25, 0, Math.PI * 2); actx.fill();
        actx.fillStyle = '#d4e0eb'; actx.beginPath(); actx.arc(cx, cy, rr * 0.85, 0, Math.PI * 2); actx.fill();
        actx.fillStyle = '#1d2630'; actx.beginPath(); actx.arc(cx, cy, rr * 0.38, 0, Math.PI * 2); actx.fill();
        bctx.fillStyle = bumpStyle(0.88); bctx.beginPath(); bctx.arc(cx, cy, rr, 0, Math.PI * 2); bctx.fill();
      }
      // Subtle warm amber forge accent stripe near top rail
      actx.fillStyle = '#ff8c32';
      actx.fillRect(W * 0.05, H * 0.03, W * 0.90, Math.max(2, H * 0.02));
      ectx.fillStyle = '#ff7218';
      ectx.fillRect(W * 0.05, H * 0.03, W * 0.90, Math.max(2, H * 0.02));
      hasEmissive = true;
    } else if (skinId === 'cod_stained_glass') {
      // Sniper Signature: Illuminated cathedral leaded stained-glass geometric mosaic with raised dark-tin lead cames
      fillAll(actx, '#121318', W, H);
      fillAll(rmctx, rmStyle(0.10, 0.28), W, H);
      fillAll(bctx, bumpStyle(0.42), W, H);

      const cols = Math.max(8, Math.round((W / H) * 6.5));
      const rows = 6;
      const cw = W / cols;
      const ch = H / rows;
      const pts = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const jx = (c === 0 || c === cols) ? 0 : (seededRand(seed + 101, r * 31 + c, 17) - 0.5) * cw * 0.65;
          const jy = (r === 0 || r === rows) ? 0 : (seededRand(seed + 101, r * 31 + c, 47) - 0.5) * ch * 0.65;
          pts[r][c] = [c * cw + jx, r * ch + jy];
        }
      }
      const glassJewels = [
        ['#ff3b6b', '#a80c2e', '#d91e48'], // cathedral ruby
        ['#3888ff', '#0d2b8a', '#1e5ce6'], // royal sapphire
        ['#26e698', '#09643d', '#15a86b'], // emerald glass
        ['#ffcf4a', '#b56a08', '#f2a826'], // burnished amber gold
        ['#c266ff', '#4b128c', '#8c38d9'], // cathedral amethyst
        ['#44ecff', '#0f6a8a', '#1ab8d9']  // stained turquoise
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p00 = pts[r][c], p10 = pts[r][c + 1], p11 = pts[r + 1][c + 1], p01 = pts[r + 1][c];
          const tris = seededRand(seed + 107, r * 23 + c, 13) > 0.45
            ? [[p00, p10, p11], [p00, p11, p01]]
            : [[p00, p10, p01], [p10, p11, p01]];
          for (let ti = 0; ti < tris.length; ti++) {
            const tri = tris[ti];
            const idx = r * 41 + c * 17 + ti * 11;
            const pal = glassJewels[Math.floor(seededRand(seed + 113, idx, 29) * glassJewels.length)];
            const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
            const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            const rad = Math.max(cw, ch) * 0.78;
            const gg = actx.createRadialGradient(cx, cy, 0, cx, cy, rad);
            gg.addColorStop(0, pal[0]);
            gg.addColorStop(0.58, pal[2]);
            gg.addColorStop(1, pal[1]);
            fillPoly(actx, tri, gg);

            // Subtle translucent backlit jewel emission (recessed from lead cames)
            const eg = ectx.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.72);
            eg.addColorStop(0, pal[0]);
            eg.addColorStop(1, 'rgba(0,0,0,0)');
            fillPoly(ectx, tri, eg);

            fillPoly(rmctx, tri, rmStyle(0.08, 0.24));
            fillPoly(bctx, tri, bumpStyle(0.36));

            // Thick raised dark-tin lead cames framing every glass shard
            const lw = Math.max(2.4, H / 85);
            actx.save(); actx.strokeStyle = '#161920'; actx.lineWidth = lw; actx.lineJoin = 'round';
            actx.beginPath(); actx.moveTo(tri[0][0], tri[0][1]); actx.lineTo(tri[1][0], tri[1][1]); actx.lineTo(tri[2][0], tri[2][1]); actx.closePath(); actx.stroke(); actx.restore();
            rmctx.save(); rmctx.strokeStyle = rmStyle(0.56, 0.72); rmctx.lineWidth = lw;
            rmctx.beginPath(); rmctx.moveTo(tri[0][0], tri[0][1]); rmctx.lineTo(tri[1][0], tri[1][1]); rmctx.lineTo(tri[2][0], tri[2][1]); rmctx.closePath(); rmctx.stroke(); rmctx.restore();
            bctx.save(); bctx.strokeStyle = bumpStyle(0.88); bctx.lineWidth = lw * 1.1;
            bctx.beginPath(); bctx.moveTo(tri[0][0], tri[0][1]); bctx.lineTo(tri[1][0], tri[1][1]); bctx.lineTo(tri[2][0], tri[2][1]); bctx.closePath(); bctx.stroke(); bctx.restore();
            ectx.save(); ectx.strokeStyle = '#000000'; ectx.lineWidth = lw * 1.25;
            ectx.beginPath(); ectx.moveTo(tri[0][0], tri[0][1]); ectx.lineTo(tri[1][0], tri[1][1]); ectx.lineTo(tri[2][0], tri[2][1]); ectx.closePath(); ectx.stroke(); ectx.restore();
          }
        }
      }
      hasEmissive = true;
    } else if (skinId === 'cod_kintsugi_porcelain') {
      // Katana Signature: Ivory bone-china ceramic glaze + cobalt Sumi botanical brushwork + raised 24K liquid-gold kintsugi fracture seams
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#f7f4eb');
      bg.addColorStop(0.52, '#ede7d9');
      bg.addColorStop(1, '#dfd6c4');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.14, 0.04), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);

      // Subtle ceramic porcelain kiln micro-craquelure
      actx.save();
      actx.strokeStyle = 'rgba(130,118,100,0.14)';
      actx.lineWidth = Math.max(0.7, H / 300);
      for (let i = 0; i < 18; i++) {
        const sx = seededRand(seed + 13, i, 17) * W;
        const sy = seededRand(seed + 13, i, 31) * H;
        actx.beginPath();
        actx.moveTo(sx, sy);
        actx.lineTo(sx + (seededRand(seed, i, 41) - 0.5) * W * 0.16, sy + (seededRand(seed, i, 59) - 0.5) * H * 0.28);
        actx.stroke();
      }
      actx.restore();

      // Delicate cobalt-indigo Japanese porcelain botanical brushwork (bamboo stalks, leaves & plum blossoms)
      actx.save();
      actx.strokeStyle = '#20458a';
      actx.fillStyle = '#234c96';
      actx.lineCap = 'round';
      for (let b = 0; b < 3; b++) {
        const bx = W * (0.14 + b * 0.34);
        actx.lineWidth = Math.max(2.0, H / 95);
        actx.beginPath();
        actx.moveTo(bx, H * 0.94);
        actx.quadraticCurveTo(bx + W * 0.06, H * 0.52, bx - W * 0.03, H * 0.10);
        actx.stroke();
        // Flowing cobalt leaves
        for (let lf = 0; lf < 5; lf++) {
          const ly = H * (0.20 + lf * 0.15);
          const lx = bx + Math.sin(lf * 1.4) * W * 0.025;
          const dir = lf % 2 === 0 ? 1 : -1;
          actx.beginPath();
          actx.moveTo(lx, ly);
          actx.quadraticCurveTo(lx + dir * H * 0.11, ly - H * 0.045, lx + dir * H * 0.17, ly + H * 0.015);
          actx.quadraticCurveTo(lx + dir * H * 0.09, ly + H * 0.04, lx, ly);
          actx.fill();
        }
      }
      // Small cobalt porcelain blossom petals
      for (let f = 0; f < 6; f++) {
        const fx = W * (0.08 + f * 0.17);
        const fy = H * (0.22 + (f % 3) * 0.26);
        const pr = Math.max(3.2, H * 0.032);
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          actx.fillStyle = p % 2 === 0 ? '#2b58ab' : '#4a79cc';
          actx.beginPath();
          actx.arc(fx + Math.cos(ang) * pr, fy + Math.sin(ang) * pr, pr * 0.56, 0, Math.PI * 2);
          actx.fill();
        }
        actx.fillStyle = '#e8b948';
        actx.beginPath(); actx.arc(fx, fy, pr * 0.34, 0, Math.PI * 2); actx.fill();
      }
      actx.restore();

      // Dramatic 24K liquid-gold Kintsugi fracture repair seams (raised mirror-gold metallic relief)
      const goldGrad = actx.createLinearGradient(0, 0, W, H);
      goldGrad.addColorStop(0, '#c88c1e');
      goldGrad.addColorStop(0.35, '#ffe888');
      goldGrad.addColorStop(0.68, '#d99e26');
      goldGrad.addColorStop(1, '#fff0a4');

      const cracks = [
        [[0.00, 0.34], [0.16, 0.42], [0.31, 0.26], [0.49, 0.48], [0.68, 0.36], [0.84, 0.56], [1.00, 0.44]],
        [[0.31, 0.26], [0.27, 0.00]],
        [[0.49, 0.48], [0.42, 0.78], [0.36, 1.00]],
        [[0.68, 0.36], [0.74, 0.14], [0.80, 0.00]],
        [[0.68, 0.36], [0.76, 0.74], [0.88, 1.00]],
        [[0.16, 0.42], [0.11, 0.76], [0.04, 1.00]]
      ];
      for (let ci = 0; ci < cracks.length; ci++) {
        const pts = cracks[ci].map(([u, v]) => [u * W, v * H]);
        const baseLw = Math.max(ci === 0 ? 4.4 : 2.8, H / (ci === 0 ? 48 : 74));
        const trace = (ctx) => {
          ctx.beginPath();
          pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
          ctx.stroke();
        };
        // Dark porcelain fracture edge shadow
        actx.save(); actx.strokeStyle = 'rgba(42,28,12,0.58)'; actx.lineWidth = baseLw + 2.6; actx.lineJoin = 'round'; trace(actx); actx.restore();
        // Rich liquid 24K gold inlay
        actx.save(); actx.strokeStyle = goldGrad; actx.lineWidth = baseLw; actx.lineJoin = 'round'; trace(actx); actx.restore();
        // Highlight gold ridge
        actx.save(); actx.strokeStyle = '#fff8cf'; actx.lineWidth = Math.max(1.0, baseLw * 0.28); actx.lineJoin = 'round'; trace(actx); actx.restore();
        // Mirror metallic gold roughness/metalness + high raised bump
        rmctx.save(); rmctx.strokeStyle = rmStyle(0.08, 0.98); rmctx.lineWidth = baseLw + 1.0; rmctx.lineJoin = 'round'; trace(rmctx); rmctx.restore();
        bctx.save(); bctx.strokeStyle = bumpStyle(0.92); bctx.lineWidth = baseLw + 1.2; bctx.lineJoin = 'round'; trace(bctx); bctx.restore();
      }
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.16 });
    } else if (skinId === 'cod_blood_cell') {
      // Revolver Signature: Deep obsidian-burgundy mirror lacquer suspending layered translucent ruby biconcave organic cells
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#140308');
      bg.addColorStop(0.5, '#2b050f');
      bg.addColorStop(1, '#120206');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.12, 0.34), W, H);
      fillAll(bctx, bumpStyle(0.42), W, H);

      // Subtle dark arterial plasma glow beneath
      for (let i = 0; i < 5; i++) {
        const vx = W * (0.12 + i * 0.20), vy = H * (0.28 + (i % 2) * 0.44), vr = H * 0.48;
        const vg = actx.createRadialGradient(vx, vy, 0, vx, vy, vr);
        vg.addColorStop(0, 'rgba(168,12,34,0.48)');
        vg.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = vg; actx.fillRect(0, 0, W, H);
      }

      // Three depth layers of biconcave ruby erythrocytes (back muted -> mid rich -> foreground glossy)
      const cellCount = Math.max(24, Math.round((W / H) * 18));
      for (let i = 0; i < cellCount; i++) {
        const layer = i < cellCount * 0.38 ? 0 : i < cellCount * 0.72 ? 1 : 2;
        const cx = seededRand(seed + 17, i, 13) * W;
        const cy = seededRand(seed + 17, i, 37) * H;
        const rx = H * (layer === 0 ? 0.085 : layer === 1 ? 0.115 : 0.14) * (0.78 + seededRand(seed + 17, i, 59) * 0.45);
        const ry = rx * (0.58 + seededRand(seed + 17, i, 79) * 0.38);
        const rot = seededRand(seed + 17, i, 97) * Math.PI;

        actx.save();
        actx.translate(cx, cy);
        actx.rotate(rot);

        // Outer ruby biconcave torus rim
        const cg = actx.createRadialGradient(-rx * 0.18, -ry * 0.18, rx * 0.08, 0, 0, rx);
        if (layer === 0) {
          cg.addColorStop(0, '#440510');
          cg.addColorStop(0.55, '#8c0a20');
          cg.addColorStop(0.86, '#b81430');
          cg.addColorStop(1, '#30030a');
        } else if (layer === 1) {
          cg.addColorStop(0, '#5a0714');
          cg.addColorStop(0.50, '#be102c');
          cg.addColorStop(0.84, '#eb1f40');
          cg.addColorStop(1, '#4a0612');
        } else {
          cg.addColorStop(0, '#74091a');
          cg.addColorStop(0.46, '#d91636');
          cg.addColorStop(0.82, '#ff3556');
          cg.addColorStop(1, '#5c0716');
        }
        actx.fillStyle = cg;
        actx.beginPath(); actx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); actx.fill();

        // Inner concave dimple shadow
        const dg = actx.createRadialGradient(rx * 0.06, ry * 0.06, 0, 0, 0, rx * 0.56);
        dg.addColorStop(0, 'rgba(32,2,8,0.82)');
        dg.addColorStop(0.75, 'rgba(84,6,18,0.42)');
        dg.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = dg;
        actx.beginPath(); actx.ellipse(0, 0, rx * 0.58, ry * 0.56, 0, 0, Math.PI * 2); actx.fill();

        // Crisp wet-glass specular highlight crescent on foreground/mid cells
        if (layer >= 1) {
          actx.strokeStyle = layer === 2 ? 'rgba(255,196,208,0.72)' : 'rgba(255,152,172,0.44)';
          actx.lineWidth = Math.max(1.2, rx * 0.11);
          actx.lineCap = 'round';
          actx.beginPath();
          actx.ellipse(0, 0, rx * 0.76, ry * 0.74, 0, Math.PI * 1.12, Math.PI * 1.62);
          actx.stroke();
        }
        actx.restore();

        // Dimensional biconcave bump relief & subtle ruby backlit emissive on foreground cells
        bctx.save(); bctx.translate(cx, cy); bctx.rotate(rot);
        bctx.fillStyle = bumpStyle(layer === 2 ? 0.86 : layer === 1 ? 0.70 : 0.56);
        bctx.beginPath(); bctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = bumpStyle(0.36);
        bctx.beginPath(); bctx.ellipse(0, 0, rx * 0.44, ry * 0.44, 0, 0, Math.PI * 2); bctx.fill();
        bctx.restore();

        if (layer === 2) {
          ectx.save(); ectx.translate(cx, cy); ectx.rotate(rot);
          ectx.strokeStyle = 'rgba(255,36,68,0.62)';
          ectx.lineWidth = Math.max(1.6, rx * 0.18);
          ectx.beginPath(); ectx.ellipse(0, 0, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2); ectx.stroke();
          ectx.restore();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.22 });
    } else if (skinId === 'cod_polyatomic') {
      // MW2 Sidearm Signature: Triangulated amethyst/ultraviolet/electric-orchid crystal facets against matte black steel
      fillAll(actx, '#120b1d', W, H);
      fillAll(rmctx, rmStyle(0.16, 0.84), W, H);
      fillAll(bctx, bumpStyle(0.50), W, H);

      const cols = Math.max(9, Math.round((W / H) * 7.5));
      const rows = 6;
      const cw = W / cols;
      const ch = H / rows;
      const pts = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const jx = (c === 0 || c === cols) ? 0 : (seededRand(seed + 43, r * 31 + c, 19) - 0.5) * cw * 0.68;
          const jy = (r === 0 || r === rows) ? 0 : (seededRand(seed + 43, r * 31 + c, 61) - 0.5) * ch * 0.68;
          pts[r][c] = [c * cw + jx, r * ch + jy];
        }
      }

      const polyColors = [
        ['#200a3c', '#3c136b'],
        ['#361066', '#6820b8'],
        ['#5819a6', '#9a3ef5'],
        ['#7b28dc', '#d26eff'],
        ['#44147a', '#b644f0'],
        ['#18082b', '#2c0d52']
      ];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p00 = pts[r][c], p10 = pts[r][c + 1], p11 = pts[r + 1][c + 1], p01 = pts[r + 1][c];
          const tris = (r + c) % 2 === 0
            ? [[p00, p10, p11], [p00, p11, p01]]
            : [[p00, p10, p01], [p10, p11, p01]];
          for (let ti = 0; ti < tris.length; ti++) {
            const tri = tris[ti];
            const idx = r * 37 + c * 19 + ti * 7;
            const roll = seededRand(seed + 73, idx, 29);
            const pal = polyColors[Math.floor(roll * polyColors.length)];
            const fg = actx.createLinearGradient(tri[0][0], tri[0][1], tri[2][0], tri[2][1]);
            fg.addColorStop(0, pal[0]);
            fg.addColorStop(1, pal[1]);
            fillPoly(actx, tri, fg);

            fillPoly(rmctx, tri, rmStyle(0.10 + (1 - roll) * 0.16, 0.86));
            fillPoly(bctx, tri, bumpStyle(0.32 + roll * 0.62));

            // Crisp beveled electric-orchid edge wireframe
            const brightEdge = roll > 0.62;
            actx.save();
            actx.strokeStyle = brightEdge ? '#e8a4ff' : '#8038c8';
            actx.lineWidth = Math.max(1.1, H / 170);
            actx.beginPath(); actx.moveTo(tri[0][0], tri[0][1]); actx.lineTo(tri[1][0], tri[1][1]); actx.lineTo(tri[2][0], tri[2][1]); actx.closePath(); actx.stroke();
            actx.restore();

            if (brightEdge) {
              ectx.save();
              ectx.strokeStyle = roll > 0.82 ? '#f4b4ff' : '#b248ff';
              ectx.lineWidth = Math.max(1.4, H / 140);
              ectx.beginPath(); ectx.moveTo(tri[0][0], tri[0][1]); ectx.lineTo(tri[1][0], tri[1][1]); ectx.lineTo(tri[2][0], tri[2][1]); ectx.closePath(); ectx.stroke();
              ectx.restore();
            }
          }
        }
      }
      // Matte black structural framing strips top/bottom
      actx.fillStyle = '#0e0e14';
      actx.fillRect(0, 0, W, H * 0.08);
      actx.fillRect(0, H * 0.92, W, H * 0.08);
      rmctx.fillStyle = rmStyle(0.72, 0.24);
      rmctx.fillRect(0, 0, W, H * 0.08);
      rmctx.fillRect(0, H * 0.92, W, H * 0.08);
      ectx.fillStyle = '#000000';
      ectx.fillRect(0, 0, W, H * 0.08);
      ectx.fillRect(0, H * 0.92, W, H * 0.08);
      hasEmissive = true;
    } else if (skinId === 'cod_ghoulie') {
      // MW2/MW3 Event Showpiece: Spectral ectoplasm cyan-teal & phantom violet wisps + stylized ghostly skull silhouettes on midnight steel
      const bg = actx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#050c14');
      bg.addColorStop(0.5, '#091826');
      bg.addColorStop(1, '#080a1c');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.24, 0.72), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);

      // Swirling spectral ectoplasm plumes
      for (let i = 0; i < 8; i++) {
        const y0 = H * (0.14 + (i / 7) * 0.74);
        const isCyan = i % 3 !== 2;
        const col = isCyan ? 'rgba(54,248,228,0.58)' : 'rgba(136,84,255,0.52)';
        const eCol = isCyan ? 'rgba(48,245,222,0.52)' : 'rgba(130,78,255,0.44)';
        for (let k = 0; k < 2; k++) {
          const ctx = k === 0 ? actx : ectx;
          ctx.save();
          ctx.strokeStyle = k === 0 ? col : eCol;
          ctx.lineWidth = H * (0.045 + (i % 3) * 0.025);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-W * 0.04, y0);
          ctx.bezierCurveTo(W * 0.28, y0 - H * 0.22 * (i % 2 ? 1 : -1), W * 0.66, y0 + H * 0.24 * (i % 2 ? 1 : -1), W * 1.04, y0 - H * 0.06);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Stylized spectral ghost-skull emblems drifting across the receiver
      const skulls = [[0.22, 0.48, 0.24], [0.54, 0.44, 0.29], [0.82, 0.54, 0.22]];
      for (let si = 0; si < skulls.length; si++) {
        const [ux, uy, srFrac] = skulls[si];
        const sx = W * ux, sy = H * uy, sr = H * srFrac;

        // Soft phantom glow aura
        const aura = actx.createRadialGradient(sx, sy, sr * 0.15, sx, sy, sr * 1.45);
        aura.addColorStop(0, 'rgba(72,255,238,0.42)');
        aura.addColorStop(0.6, 'rgba(20,162,188,0.16)');
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = aura;
        actx.beginPath(); actx.arc(sx, sy, sr * 1.45, 0, Math.PI * 2); actx.fill();

        // Cranium silhouette
        const cg = actx.createLinearGradient(sx, sy - sr, sx, sy + sr);
        cg.addColorStop(0, '#c2fff8');
        cg.addColorStop(0.55, '#3ef0df');
        cg.addColorStop(1, 'rgba(38,148,196,0.22)');
        actx.fillStyle = cg;
        actx.beginPath();
        actx.arc(sx, sy - sr * 0.12, sr * 0.68, Math.PI * 0.88, Math.PI * 2.12);
        actx.lineTo(sx + sr * 0.42, sy + sr * 0.64);
        actx.lineTo(sx + sr * 0.18, sy + sr * 0.48);
        actx.lineTo(sx, sy + sr * 0.68);
        actx.lineTo(sx - sr * 0.18, sy + sr * 0.48);
        actx.lineTo(sx - sr * 0.42, sy + sr * 0.64);
        actx.closePath();
        actx.fill();

        bctx.fillStyle = bumpStyle(0.76);
        bctx.beginPath(); bctx.arc(sx, sy - sr * 0.12, sr * 0.64, 0, Math.PI * 2); bctx.fill();

        // Dark hollow eye sockets + luminous pinpoint spectral irises
        actx.fillStyle = '#050c14';
        actx.beginPath(); actx.ellipse(sx - sr * 0.25, sy - sr * 0.08, sr * 0.17, sr * 0.20, -0.2, 0, Math.PI * 2); actx.fill();
        actx.beginPath(); actx.ellipse(sx + sr * 0.25, sy - sr * 0.08, sr * 0.17, sr * 0.20, 0.2, 0, Math.PI * 2); actx.fill();
        // Nasal cavity
        fillPoly(actx, [[sx, sy + sr * 0.04], [sx + sr * 0.09, sy + sr * 0.24], [sx - sr * 0.09, sy + sr * 0.24]], '#050c14');

        // Glowing cyan spectral eye sparks
        for (const ex of [sx - sr * 0.25, sx + sr * 0.25]) {
          actx.fillStyle = '#e6ffff';
          actx.beginPath(); actx.arc(ex, sy - sr * 0.08, sr * 0.075, 0, Math.PI * 2); actx.fill();
          ectx.fillStyle = '#7afff4';
          ectx.beginPath(); ectx.arc(ex, sy - sr * 0.08, sr * 0.11, 0, Math.PI * 2); ectx.fill();
        }
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else if (skinId === 'cod_bioluminescent') {
      // MW3 Event Showpiece: Matte abyssal slate laced with branching luminous turquoise/emerald/indigo coral veins & glowing spore clusters
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#07141f');
      bg.addColorStop(0.55, '#050d16');
      bg.addColorStop(1, '#040a11');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.74, 0.22), W, H);
      fillAll(bctx, bumpStyle(0.46), W, H);

      // Organic branching bioluminescent coral/mycelium veins
      const drawBranch = (x, y, ang, len, depth, paletteIdx) => {
        if (depth <= 0 || len < 4) return;
        const x2 = x + Math.cos(ang) * len;
        const y2 = y + Math.sin(ang) * len;
        const lw = Math.max(1.2, depth * (H / 95));
        const col = paletteIdx === 0 ? '#26f7dc' : paletteIdx === 1 ? '#38ff9c' : '#5e7aff';
        const eCol = paletteIdx === 0 ? '#1de8d0' : paletteIdx === 1 ? '#2ef28e' : '#526eff';

        // Soft glowing coral halo
        actx.save(); actx.strokeStyle = col; actx.globalAlpha = 0.26; actx.lineWidth = lw * 3.2; actx.lineCap = 'round';
        actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x2, y2); actx.stroke(); actx.restore();
        // Crisp glowing vein core
        actx.save(); actx.strokeStyle = col; actx.lineWidth = lw; actx.lineCap = 'round';
        actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x2, y2); actx.stroke(); actx.restore();
        ectx.save(); ectx.strokeStyle = eCol; ectx.lineWidth = lw * 1.15; ectx.lineCap = 'round';
        ectx.beginPath(); ectx.moveTo(x, y); ectx.lineTo(x2, y2); ectx.stroke(); ectx.restore();
        rmctx.save(); rmctx.strokeStyle = rmStyle(0.18, 0.35); rmctx.lineWidth = lw * 1.4;
        rmctx.beginPath(); rmctx.moveTo(x, y); rmctx.lineTo(x2, y2); rmctx.stroke(); rmctx.restore();
        bctx.save(); bctx.strokeStyle = bumpStyle(0.84); bctx.lineWidth = lw * 1.4;
        bctx.beginPath(); bctx.moveTo(x, y); bctx.lineTo(x2, y2); bctx.stroke(); bctx.restore();

        // Luminous spore node at branch tip
        if (depth <= 2) {
          const sr = Math.max(2.0, H * 0.020);
          actx.fillStyle = '#e0fff9'; actx.beginPath(); actx.arc(x2, y2, sr, 0, Math.PI * 2); actx.fill();
          ectx.fillStyle = col; ectx.beginPath(); ectx.arc(x2, y2, sr * 1.4, 0, Math.PI * 2); ectx.fill();
        }
        const spread = 0.42 + seededRand(seed + depth * 11, Math.round(x + y), 19) * 0.28;
        drawBranch(x2, y2, ang - spread, len * 0.72, depth - 1, paletteIdx);
        drawBranch(x2, y2, ang + spread * 0.92, len * 0.68, depth - 1, (paletteIdx + 1) % 3);
      };

      const roots = [
        [0.06, 0.78, -0.45, 0],
        [0.28, 0.20, 0.55, 1],
        [0.52, 0.84, -0.78, 2],
        [0.74, 0.22, 0.72, 0],
        [0.92, 0.72, -2.35, 1]
      ];
      for (const [ux, uy, ang, pIdx] of roots) {
        drawBranch(W * ux, H * uy, ang, H * 0.26, 4, pIdx);
      }

      // Scattered deep-sea bioluminescent spore clusters
      for (let i = 0; i < 42; i++) {
        const sx = seededRand(seed + 157, i, 23) * W;
        const sy = seededRand(seed + 157, i, 59) * H;
        const sr = Math.max(1.2, (1.0 + seededRand(seed + 157, i, 89) * 2.2) * (H / 220));
        const col = i % 3 === 0 ? '#38ff9c' : i % 3 === 1 ? '#26f7dc' : '#6e8aff';
        actx.fillStyle = col; actx.beginPath(); actx.arc(sx, sy, sr, 0, Math.PI * 2); actx.fill();
        ectx.fillStyle = col; ectx.beginPath(); ectx.arc(sx, sy, sr * 1.35, 0, Math.PI * 2); ectx.fill();
      }
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.26 });
    } else if (skinId === 'cod_afterlife') {
      // BO6/BO2 Event Showpiece: Satin-matte obsidian armor + layered spectral ice-cyan & indigo spirit flames + etched arcane runes
      const bg = actx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f121b');
      bg.addColorStop(0.65, '#0a0d15');
      bg.addColorStop(1, '#060810');
      fillAll(actx, bg, W, H);
      fillAll(rmctx, rmStyle(0.52, 0.45), W, H);
      fillAll(bctx, bumpStyle(0.48), W, H);
      paintBrushedMetal(actx, bctx, W, H, seed + 61, 0.035, true);

      // Rising spectral spirit-flame tongues along lower receiver (indigo outer -> electric ice-cyan -> white-blue inner core)
      const flameCount = Math.max(8, Math.round((W / H) * 6));
      for (let i = 0; i < flameCount; i++) {
        const fx = W * ((i + 0.5) / flameCount) + (seededRand(seed, i, 17) - 0.5) * W * 0.04;
        const fh = H * (0.48 + seededRand(seed, i, 41) * 0.36);
        const fw = Math.max(H * 0.14, W / (flameCount * 1.25));
        const lean = (seededRand(seed, i, 73) - 0.5) * H * 0.22;

        const drawTongue = (ctx, scaleW, scaleH, style) => {
          ctx.fillStyle = style;
          ctx.beginPath();
          ctx.moveTo(fx - fw * scaleW, H);
          ctx.bezierCurveTo(fx - fw * scaleW * 0.8, H - fh * scaleH * 0.45, fx + lean * 0.5 - fw * 0.2, H - fh * scaleH * 0.72, fx + lean, H - fh * scaleH);
          ctx.bezierCurveTo(fx + lean * 0.5 + fw * 0.35, H - fh * scaleH * 0.62, fx + fw * scaleW * 0.8, H - fh * scaleH * 0.35, fx + fw * scaleW, H);
          ctx.closePath();
          ctx.fill();
        };

        const outerG = actx.createLinearGradient(fx, H, fx + lean, H - fh);
        outerG.addColorStop(0, '#1d34c8');
        outerG.addColorStop(0.55, '#228eff');
        outerG.addColorStop(1, 'rgba(42,216,255,0.12)');
        drawTongue(actx, 1.0, 1.0, outerG);

        const midG = actx.createLinearGradient(fx, H, fx + lean, H - fh * 0.82);
        midG.addColorStop(0, '#2ce6ff');
        midG.addColorStop(0.6, '#7af5ff');
        midG.addColorStop(1, 'rgba(180,252,255,0.18)');
        drawTongue(actx, 0.62, 0.80, midG);

        drawTongue(actx, 0.30, 0.52, '#e6ffff');

        // Matching clean static spectral flame emissive
        drawTongue(ectx, 0.72, 0.85, 'rgba(42,210,255,0.68)');
        drawTongue(ectx, 0.34, 0.54, 'rgba(204,252,255,0.92)');
        drawTongue(rmctx, 0.65, 0.80, rmStyle(0.18, 0.60));
      }

      // Precision-etched arcane geometric runes along the dark obsidian upper receiver
      const runeCount = Math.max(6, Math.round((W / H) * 4.5));
      actx.save(); ectx.save(); bctx.save();
      actx.strokeStyle = '#92f4ff'; actx.lineWidth = Math.max(1.5, H / 135);
      ectx.strokeStyle = '#4ee8ff'; ectx.lineWidth = Math.max(1.8, H / 120);
      bctx.strokeStyle = bumpStyle(0.82); bctx.lineWidth = Math.max(1.8, H / 120);
      for (let i = 0; i < runeCount; i++) {
        const rx = W * (0.09 + (i / Math.max(1, runeCount - 1)) * 0.82);
        const ry = H * 0.22;
        const rr = H * 0.085;
        for (const tctx of [actx, ectx, bctx]) {
          tctx.beginPath();
          // Outer diamond sigil
          tctx.moveTo(rx, ry - rr); tctx.lineTo(rx + rr * 0.72, ry); tctx.lineTo(rx, ry + rr); tctx.lineTo(rx - rr * 0.72, ry); tctx.closePath();
          // Inner vertical rune staff + glyph crossbar
          tctx.moveTo(rx, ry - rr * 0.75); tctx.lineTo(rx, ry + rr * 0.75);
          if (i % 2 === 0) {
            tctx.moveTo(rx - rr * 0.42, ry - rr * 0.22); tctx.lineTo(rx + rr * 0.42, ry + rr * 0.22);
          } else {
            tctx.moveTo(rx - rr * 0.38, ry - rr * 0.25); tctx.lineTo(rx, ry + rr * 0.15); tctx.lineTo(rx + rr * 0.38, ry - rr * 0.25);
          }
          tctx.stroke();
        }
      }
      actx.restore(); ectx.restore(); bctx.restore();
      hasEmissive = true;
      paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.24 });
    } else {
      // High-craft organic/pixel weapon finishes:
      // damascus, blaze, hyper_chroma, fade, case_hardened, dragon_gold, molten_magma, camo_gold, camo_dark_matter
      const aImg = actx.createImageData(W, H);
      const rmImg = rmctx.createImageData(W, H);
      const bImg = bctx.createImageData(W, H);
      const eImg = ectx.createImageData(W, H);
      const ad = aImg.data;
      const rmd = rmImg.data;
      const bd = bImg.data;
      const ed = eImg.data;

      for (let py = 0; py < H; py++) {
        const v = 1 - py / (H - 1);
        for (let px = 0; px < W; px++) {
          const u = px / (W - 1);
          const idx = (py * W + px) * 4;
          const micro = KS.fbm2D(u * 22, v * 22, seed + 13, 2);
          let r = 46, g = 54, b = 64;
          let rough = 0.42;
          let metal = 0.50;
          let bump = 0.50;
          let er = 0, eg = 0, eb = 0;

          if (skinId === 'damascus') {
            const w1 = KS.fbm2D(u * 4.0 + ox, v * 4.0 + oy, seed + 11, 4);
            const w2 = KS.fbm2D(u * 8.2 + w1 * 2.2, v * 8.2 + w1 * 2.2, seed + 43, 3);
            const bands = Math.sin((u * 7.0 + v * 5.0 + w1 * 5.4 + w2 * 1.4) * Math.PI * 2) * 0.5 + 0.5;
            const lum = 72 + bands * 168;
            r = lum * 0.94; g = lum * 0.99; b = Math.min(255, lum * 1.08);
            rough = 0.14 + (1 - bands) * 0.34;
            metal = 0.96;
            bump = 0.30 + bands * 0.42;
          } else if (skinId === 'blaze') {
            hasEmissive = true;
            const fromMuzzle = 1 - u;
            const tongue = Math.sin(v * 18.0 + KS.fbm2D(u * 4.4 + ox, v * 4.4 + oy, seed + 29, 3) * 4.8) * 0.14;
            const lick = KS.fbm2D(u * 7.4 + ox, v * 11.0 + oy, seed + 61, 3) * 0.24;
            const reach = 0.28 + tongue + lick + (1 - Math.abs(v - 0.52) * 1.4) * 0.22;
            if (fromMuzzle < reach) {
              const t = Math.max(0, Math.min(1, fromMuzzle / Math.max(0.02, reach)));
              if (t < 0.28) {
                const k = t / 0.28;
                r = 255; g = 248 - k * 34; b = 170 - k * 120;
                er = 220 * (1 - k * 0.4); eg = 160 * (1 - k * 0.5); eb = 50 * (1 - k);
              } else if (t < 0.66) {
                const k = (t - 0.28) / 0.38;
                r = 255; g = 214 - k * 130; b = 50 - k * 36;
                er = 135 * (1 - k * 0.5); eg = 62 * (1 - k * 0.7); eb = 6;
              } else {
                const k = (t - 0.66) / 0.34;
                r = 252 - k * 96; g = 84 - k * 72; b = 16;
                er = 48 * (1 - k); eg = 8 * (1 - k); eb = 0;
              }
              rough = 0.14;
              metal = 0.88;
              bump = 0.56;
            } else {
              const brush = KS.fbm2D(u * 48, v * 8, 19, 2);
              r = 16 + brush * 14; g = 19 + brush * 15; b = 28 + brush * 22;
              rough = 0.22 + (1 - brush) * 0.08;
              metal = 0.92;
              bump = 0.48 + (brush - 0.5) * 0.10;
            }
          } else if (skinId === 'hyper_chroma') {
            const wx = KS.fbm2D(u * 3.2 + ox, v * 3.2 + oy, seed + 19, 3);
            const wy = KS.fbm2D(u * 3.2 + ox + 3.2, v * 3.2 + oy + 2.1, seed + 41, 3);
            const sw = Math.sin((u * 3.6 + v * 2.6 + wx * 4.4 + wy * 1.8) * Math.PI) * 0.5 + 0.5;
            if (sw < 0.34) {
              const t = sw / 0.34;
              r = 14 + t * 108; g = 238 - t * 152; b = 226 + t * 28;
            } else if (sw < 0.68) {
              const t = (sw - 0.34) / 0.34;
              r = 122 + t * 133; g = 86 - t * 32; b = 254 - t * 104;
            } else {
              const t = (sw - 0.68) / 0.32;
              r = 255 - t * 241; g = 54 + t * 184; b = 150 + t * 76;
            }
            rough = 0.14;
            metal = 0.86;
            bump = 0.46 + sw * 0.14;
          } else if (skinId === 'fade') {
            const shift = (fadePct - 80) / 20;
            const pos = Math.max(0, Math.min(1, u * 1.14 - (1 - shift) * 0.22 + (v - 0.5) * 0.14));
            if (pos < 0.20) {
              const t = pos / 0.20;
              r = 204 + t * 48; g = 210 + t * 10; b = 220 - t * 88;
            } else if (pos < 0.50) {
              const t = (pos - 0.20) / 0.30;
              r = 252; g = 200 - t * 128; b = 62 + t * 116;
            } else if (pos < 0.78) {
              const t = (pos - 0.50) / 0.28;
              r = 250 - t * 122; g = 72 - t * 26; b = 178 + t * 66;
            } else {
              const t = (pos - 0.78) / 0.22;
              r = 128 - t * 44; g = 46 - t * 12; b = 244 + t * 11;
            }
            rough = 0.11;
            metal = 0.96;
            bump = 0.50;
          } else if (skinId === 'case_hardened') {
            const ch = KS.evaluateCaseHardenedPixel(u, v, seed);
            const patina = KS.fbm2D(u * 12 + ox, v * 12 + oy, seed + 71, 2);
            const q = 0.92 + patina * 0.16;
            r = ch.r * q; g = ch.g * q; b = ch.b * q;
            if (ch.isBlue) {
              b = Math.min(255, b * 1.08);
              rough = 0.13; metal = 0.96;
            } else if (ch.isGold) {
              rough = 0.19; metal = 0.94;
            } else {
              rough = 0.28; metal = 0.88;
            }
            bump = 0.46 + patina * 0.16;
          } else if (skinId === 'dragon_gold') {
            const row = Math.floor(v * 20);
            const su = (u * 26 + (row & 1) * 0.5) % 1 - 0.5;
            const sv = (v * 20) % 1 - 0.5;
            const scaleDist = Math.hypot(su, sv * 1.15);
            const scaleRim = Math.max(0, 1 - scaleDist * 2.0);
            const dragonBody = Math.sin((u * 4.5 + Math.sin(v * 6.0) * 0.6) * Math.PI) * 0.5 + 0.5;
            const wave = KS.fbm2D(u * 4 + ox, v * 4 + oy, seed + 47, 3);
            const isGold = (wave * 0.55 + dragonBody * 0.45) > 0.38 || v > 0.82 || v < 0.18;
            if (isGold) {
              const sheen = 0.74 + scaleRim * 0.30;
              r = 252 * sheen; g = 198 * sheen; b = 52 * sheen;
              rough = 0.12 + (1 - scaleRim) * 0.14;
              metal = 0.96;
              bump = 0.36 + scaleRim * 0.46;
            } else {
              r = 62 + wave * 76; g = 10 + wave * 14; b = 16 + wave * 14;
              rough = 0.40;
              metal = 0.64;
              bump = 0.44 + scaleRim * 0.14;
            }
          } else if (skinId === 'molten_magma') {
            hasEmissive = true;
            const n1 = KS.fbm2D(u * 5.2 + ox, v * 5.2 + oy, seed + 149, 4);
            const n2 = KS.fbm2D(u * 11.0 + n1 * 2.2, v * 11.0 + n1 * 2.2, seed + 281, 3);
            const ridge = 1 - Math.abs(Math.sin((u * 6.4 + v * 4.4 + n1 * 4.6) * Math.PI));
            const crack = Math.pow(Math.max(0, ridge * 0.72 + n2 * 0.42 - 0.58) / 0.42, 1.30);
            if (crack > 0.10) {
              const hot = Math.min(1, crack * 1.50);
              r = 255;
              g = 56 + hot * 192;
              b = 10 + Math.pow(hot, 2.2) * 145;
              er = 255 * hot;
              eg = (48 + hot * 184) * hot;
              eb = Math.pow(hot, 2.2) * 120;
              rough = 0.24;
              metal = 0.10;
              bump = 0.26;
            } else {
              const rock = 16 + n2 * 24;
              r = rock * 1.12; g = rock * 0.96; b = rock * 1.00;
              rough = 0.86;
              metal = 0.14;
              bump = 0.46 + n2 * 0.32;
            }
          } else if (skinId === 'camo_gold') {
            // MW4 / BO6 Mastercraft 24K Bullion Gold with engraved matte-obsidian topographic contours
            hasEmissive = true;
            const topo = KS.fbm2D(u * 4.2, v * 4.2, 777, 4);
            const contour = Math.abs(Math.sin((u * 4.8 + v * 3.8 + topo * 6.4) * Math.PI * 2));
            if (contour > 0.87) {
              r = 22; g = 18; b = 15;
              rough = 0.74;
              metal = 0.24;
              bump = 0.26;
            } else {
              const gleam = 0.88 + topo * 0.20;
              r = Math.min(255, 254 * gleam);
              g = Math.min(255, 206 * gleam);
              b = Math.min(255, 62 * gleam);
              rough = 0.10 + (1 - topo) * 0.08;
              metal = 0.98;
              bump = 0.54 + contour * 0.22;
              const hi = Math.pow(Math.max(0, topo - 0.55) / 0.45, 2.0);
              er = hi * 110; eg = hi * 82; eb = hi * 18;
            }
          } else if (skinId === 'camo_dark_matter') {
            // BO3 / BO6 Ultimate Mastery: deep cosmic void + swirling ultraviolet/magenta/cyan galactic nebula & starfield (seamless tileable U!)
            hasEmissive = true;
            const ang = u * Math.PI * 2;
            const nx = Math.cos(ang) * 1.1 + 3.2;
            const nz = Math.sin(ang) * 1.1 + 3.2;
            const w1 = KS.fbm2D(nx * 1.7 + v * 1.4, nz * 1.7 + v * 2.6, 881, 4);
            const w2 = KS.fbm2D(nx * 3.4 + w1 * 2.4, nz * 3.4 + v * 4.2 + w1 * 2.0, 991, 3);
            const neb = Math.sin((w1 * 5.8 + w2 * 2.6 + v * 2.4) * Math.PI) * 0.5 + 0.5;
            const core = Math.pow(neb, 1.55);
            const cyanBand = Math.pow(Math.max(0, w2 - 0.54) / 0.46, 1.6);
            const star = KS.hash2D(px, py, 1013) > 0.994 ? 1 : 0;

            r = 12 + core * 196 + w2 * 38 + star * 240;
            g = 6 + Math.pow(core, 2.1) * 74 + cyanBand * 130 + star * 235;
            b = 34 + core * 212 + cyanBand * 180 + star * 255;

            er = core * 195 + star * 255;
            eg = Math.pow(core, 2.0) * 68 + cyanBand * 145 + star * 245;
            eb = core * 225 + cyanBand * 185 + star * 255;

            rough = 0.12 + (1 - core) * 0.16;
            metal = 0.72;
            bump = 0.44 + core * 0.24;
          }

          ad[idx] = Math.max(0, Math.min(255, Math.round(r)));
          ad[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
          ad[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
          ad[idx + 3] = 255;

          rmd[idx] = 255;
          rmd[idx + 1] = Math.max(14, Math.min(248, Math.round(rough * 255)));
          rmd[idx + 2] = Math.max(0, Math.min(255, Math.round(metal * 255)));
          rmd[idx + 3] = 255;

          const bv = Math.max(0, Math.min(255, Math.round(bump * 255)));
          bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;

          ed[idx] = Math.max(0, Math.min(255, Math.round(er)));
          ed[idx + 1] = Math.max(0, Math.min(255, Math.round(eg)));
          ed[idx + 2] = Math.max(0, Math.min(255, Math.round(eb)));
          ed[idx + 3] = 255;
        }
      }

      actx.putImageData(aImg, 0, 0);
      rmctx.putImageData(rmImg, 0, 0);
      bctx.putImageData(bImg, 0, 0);
      if (hasEmissive) ectx.putImageData(eImg, 0, 0);

      // Extra crisp engraved dragon filigree over Dragon Gold
      if (skinId === 'dragon_gold') {
        actx.save();
        actx.strokeStyle = 'rgba(255,232,118,0.92)';
        actx.lineWidth = Math.max(2.4, H / 82);
        actx.beginPath();
        actx.moveTo(W * 0.06, H * 0.52);
        actx.bezierCurveTo(W * 0.28, H * 0.20, W * 0.54, H * 0.78, W * 0.78, H * 0.36);
        actx.quadraticCurveTo(W * 0.88, H * 0.22, W * 0.95, H * 0.40);
        actx.stroke();
        actx.strokeStyle = 'rgba(255,214,82,0.82)';
        actx.lineWidth = Math.max(1.6, H / 130);
        actx.strokeRect(W * 0.03, H * 0.14, W * 0.94, H * 0.72);
        actx.restore();
      }
      if (skinId !== 'camo_dark_matter' && skinId !== 'molten_magma') {
        paintReceiverArchitecture(actx, bctx, W, H, { seamAlpha: 0.28 });
      }
    }

    const result = {
      albedoCanvas,
      roughCanvas,
      bumpCanvas,
      emissiveCanvas: hasEmissive ? emissiveCanvas : null
    };
    if (weaponCanvasCache.size > 48) {
      const firstKey = weaponCanvasCache.keys().next().value;
      weaponCanvasCache.delete(firstKey);
    }
    weaponCanvasCache.set(key, result);
    return result;
  }

  // ============================================================================
  // 4. LIVE ANIMATED & KILLSTREAK-REACTIVE MATERIAL REGISTRY
  // ============================================================================
  const dynamicSkinMaterials = new Set();
  let dynamicSkinClock = 0;

  function updateDynamicSkinMaterials(dt, streakCount) {
    const safeDt = Math.min(0.05, Math.max(0, Number(dt) || 0.016));
    dynamicSkinClock += safeDt;
    const streak = Math.max(0, Number(streakCount) || 0);
    const streakFactor = Math.min(1, streak / 5);

    for (const mat of dynamicSkinMaterials) {
      if (!mat || !mat.userData || !mat.userData.dynamicSkin) {
        dynamicSkinMaterials.delete(mat);
        continue;
      }
      const mode = mat.userData.dynamicSkin;
      if (mode === 'camo_dark_matter') {
        const ox = (dynamicSkinClock * 0.075) % 1;
        const oy = Math.sin(dynamicSkinClock * 0.48) * 0.04;
        if (mat.map) { mat.map.offset.set(ox, oy); }
        if (mat.emissiveMap) { mat.emissiveMap.offset.set(ox, oy); }
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.2);
        mat.emissiveIntensity = 0.85 + pulse * 0.55;
        mat.emissive.setHSL(0.78 + Math.sin(dynamicSkinClock * 0.6) * 0.05, 0.72, 0.78);
      } else if (mode === 'camo_diamond') {
        const shimmer = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 4.2);
        mat.emissiveIntensity = 0.45 + shimmer * 0.75;
        mat.emissive.setHSL(0.55 + Math.sin(dynamicSkinClock * 1.6) * 0.08, 0.45, 0.88);
      } else if (mode === 'camo_gold') {
        const gleam = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.2);
        mat.emissiveIntensity = 0.18 + gleam * 0.28;
      } else if (mode === 'reactive_overdrive') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * (3.2 + streakFactor * 5.0));
        mat.emissiveIntensity = 0.85 + streakFactor * 1.25 + pulse * (0.25 + streakFactor * 0.40);
        // 0-2 kills: Electric Cyan | 3-4 kills: Hyper Violet | 5+ kills: Solar Gold Overdrive
        const hue = streak >= 5 ? 0.11 : streak >= 3 ? 0.78 : 0.52;
        mat.emissive.setHSL(hue, 0.96, 0.58 + streakFactor * 0.10);
      } else if (mode === 'reactive_oni') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * (2.8 + streakFactor * 5.4));
        mat.emissiveIntensity = 0.85 + streakFactor * 1.35 + pulse * (0.28 + streakFactor * 0.42);
        // 0-2 kills: Cursed Crimson | 3-4 kills: Molten Scarlet | 5+ kills: Blazing Amber-White Inferno
        const hue = streak >= 5 ? 0.07 : streak >= 3 ? 0.98 : 0.96;
        mat.emissive.setHSL(hue, 0.96, 0.52 + streakFactor * 0.16);
      } else if (mode === 'molten_magma') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.4);
        mat.emissiveIntensity = 1.05 + pulse * 0.55;
      } else if (mode === 'cyber_wireframe') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 3.0);
        mat.emissiveIntensity = 0.90 + pulse * 0.45;
      } else if (mode === 'voidglass' || mode === 'holo_prism') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.0);
        mat.emissiveIntensity = 0.55 + pulse * 0.35;
      }
    }
  }

  function createWeaponMaterial(weaponItem, targetRenderer) {
    const { albedoCanvas, roughCanvas, bumpCanvas, emissiveCanvas } = paintWeaponToCanvases(weaponItem);
    const sk = (weaponItem && weaponItem.skinId) || 'factory_slate';
    const isAnimatedDarkMatter = sk === 'camo_dark_matter';
    const wrapMode = isAnimatedDarkMatter ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = wrapMode;
    map.wrapT = wrapMode;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const rmTex = new THREE.CanvasTexture(roughCanvas);
    rmTex.wrapS = wrapMode;
    rmTex.wrapT = wrapMode;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = wrapMode;
    bumpMap.wrapT = wrapMode;

    let emissiveMap = null;
    if (emissiveCanvas) {
      emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
      emissiveMap.colorSpace = THREE.SRGBColorSpace;
      emissiveMap.wrapS = wrapMode;
      emissiveMap.wrapT = wrapMode;
      emissiveMap.anisotropy = Math.min(8, maxAniso);
    }

    const isMetallic =
      sk === 'fade' || sk === 'case_hardened' || sk === 'damascus' || sk === 'dragon_gold' ||
      sk === 'blaze' || sk === 'redshift' || sk === 'solarflare' || sk === 'camo_gold' ||
      sk === 'camo_diamond' || sk === 'shogun_gold' || sk === 'holo_prism' ||
      sk === 'cod_mercury' || sk === 'cod_forged_titanium' || sk === 'cod_orion' ||
      sk === 'cod_polyatomic' || sk === 'cod_constellation';

    const isGlossy =
      isMetallic || sk === 'printstream' || sk === 'hyper_chroma' || sk === 'neon_rider' ||
      sk === 'coldfront' || sk === 'nitro' || sk === 'voidglass' || sk === 'camo_dark_matter' ||
      sk === 'reactive_overdrive' || sk === 'reactive_oni' || sk === 'ronin_sakura' || sk === 'oni_crimson' ||
      sk === 'cod_opal' || sk === 'cod_nebula' || sk === 'cod_interstellar' || sk === 'cod_borealis' ||
      sk === 'cod_kintsugi_porcelain' || sk === 'cod_stained_glass' || sk === 'cod_blood_cell' ||
      sk === 'cod_retro_grid';

    const iri =
      sk === 'holo_prism' || sk === 'cod_opal' ? 0.96 :
      sk === 'printstream' ? 0.88 :
      sk === 'cod_orion' ? 0.78 :
      sk === 'camo_diamond' || sk === 'cod_borealis' ? 0.72 :
      sk === 'camo_dark_matter' || sk === 'cod_nebula' ? 0.68 :
      sk === 'voidglass' || sk === 'cod_interstellar' ? 0.62 :
      sk === 'fade' || sk === 'cod_polyatomic' ? 0.54 :
      sk === 'hyper_chroma' || sk === 'cod_stained_glass' ? 0.52 :
      sk === 'case_hardened' || sk === 'cod_forged_titanium' ? 0.42 :
      sk === 'coldfront' || sk === 'cod_mercury' ? 0.32 : 0.0;

    let emissiveColor = 0xffffff;
    let emissiveIntensity = emissiveMap ? 0.75 : 0.0;
    if (sk === 'camo_dark_matter') { emissiveColor = 0xe4b8ff; emissiveIntensity = 1.10; }
    else if (sk === 'camo_diamond') { emissiveColor = 0xdff6ff; emissiveIntensity = 0.75; }
    else if (sk === 'camo_gold') { emissiveColor = 0xffd252; emissiveIntensity = 0.25; }
    else if (sk === 'reactive_overdrive') { emissiveColor = 0x38eeff; emissiveIntensity = 1.05; }
    else if (sk === 'reactive_oni') { emissiveColor = 0xff2c4d; emissiveIntensity = 1.05; }
    else if (sk === 'molten_magma') { emissiveColor = 0xffffff; emissiveIntensity = 1.25; }
    else if (sk === 'cyber_wireframe') { emissiveColor = 0xffffff; emissiveIntensity = 1.05; }
    else if (sk === 'voidglass') { emissiveColor = 0xffffff; emissiveIntensity = 0.72; }
    else if (sk === 'cod_opal') { emissiveColor = 0xffffff; emissiveIntensity = 0.28; }
    else if (sk === 'cod_dark_spine') { emissiveColor = 0xffffff; emissiveIntensity = 0.62; }
    else if (sk === 'cod_borealis') { emissiveColor = 0xffffff; emissiveIntensity = 0.46; }
    else if (sk === 'cod_interstellar') { emissiveColor = 0xffffff; emissiveIntensity = 0.54; }
    else if (sk === 'cod_nebula') { emissiveColor = 0xffffff; emissiveIntensity = 0.60; }
    else if (sk === 'cod_molten_obsidian') { emissiveColor = 0xffffff; emissiveIntensity = 0.78; }
    else if (sk === 'cod_constellation') { emissiveColor = 0xffffff; emissiveIntensity = 0.34; }
    else if (sk === 'cod_orion') { emissiveColor = 0xffffff; emissiveIntensity = 0.46; }
    else if (sk === 'cod_retro_grid') { emissiveColor = 0xffffff; emissiveIntensity = 0.56; }
    else if (sk === 'cod_forged_titanium') { emissiveColor = 0xffffff; emissiveIntensity = 0.38; }
    else if (sk === 'cod_stained_glass') { emissiveColor = 0xffffff; emissiveIntensity = 0.36; }
    else if (sk === 'cod_blood_cell') { emissiveColor = 0xffffff; emissiveIntensity = 0.32; }
    else if (sk === 'cod_polyatomic') { emissiveColor = 0xffffff; emissiveIntensity = 0.44; }
    else if (sk === 'cod_ghoulie') { emissiveColor = 0xffffff; emissiveIntensity = 0.58; }
    else if (sk === 'cod_bioluminescent') { emissiveColor = 0xffffff; emissiveIntensity = 0.64; }
    else if (sk === 'cod_afterlife') { emissiveColor = 0xffffff; emissiveIntensity = 0.60; }
    else if (!emissiveMap) { emissiveColor = 0x000000; emissiveIntensity = 0.0; }

    const mat = new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap: rmTex,
      metalnessMap: rmTex,
      bumpMap,
      bumpScale:
        sk === 'redline' || sk === 'dragon_gold' || sk === 'damascus' || sk === 'solarflare' ||
        sk === 'tactical_carbon' || sk === 'camo_diamond' || sk === 'camo_gold' || sk === 'shogun_gold' ||
        sk === 'molten_magma' || sk === 'cod_molten_obsidian' || sk === 'cod_mercury' ||
        sk === 'cod_kintsugi_porcelain' || sk === 'cod_stained_glass' || sk === 'cod_forged_titanium' ||
        sk === 'cod_polyatomic' || sk === 'cod_dark_spine' || sk === 'cod_constellation' ? 0.0038 : 0.0018,
      roughness: 1.0,
      metalness: 1.0,
      clearcoat: isGlossy ? 0.90 : 0.18,
      clearcoatRoughness:
        sk === 'camo_diamond' || sk === 'holo_prism' || sk === 'voidglass' || sk === 'cod_opal' ||
        sk === 'cod_mercury' || sk === 'cod_blood_cell' || sk === 'cod_kintsugi_porcelain' ||
        sk === 'cod_stained_glass' ? 0.04 : sk === 'printstream' || sk === 'cod_nebula' ? 0.09 : 0.16,
      iridescence: iri,
      iridescenceIOR: 1.40,
      iridescenceThicknessRange:
        sk === 'holo_prism' || sk === 'cod_opal' ? [120, 640] :
        sk === 'printstream' || sk === 'cod_orion' ? [180, 540] : [140, 440],
      emissive: new THREE.Color(emissiveColor),
      emissiveMap,
      emissiveIntensity,
      envMapIntensity: isMetallic || sk === 'camo_diamond' || sk === 'cod_opal' ? 1.88 : sk === 'printstream' || sk === 'cod_kintsugi_porcelain' ? 1.56 : 1.32
    });

    if (
      sk === 'camo_dark_matter' || sk === 'camo_diamond' || sk === 'camo_gold' ||
      sk === 'reactive_overdrive' || sk === 'reactive_oni' || sk === 'molten_magma' ||
      sk === 'cyber_wireframe' || sk === 'voidglass' || sk === 'holo_prism'
    ) {
      mat.userData.dynamicSkin = sk;
      dynamicSkinMaterials.add(mat);
      if (dynamicSkinMaterials.size > 96) {
        const first = dynamicSkinMaterials.values().next().value;
        dynamicSkinMaterials.delete(first);
      }
    }

    return mat;
  }

  // Crisp 96x96 Gunsmith / Armory Camo Tile Swatch generator
  function getWeaponSkinSwatchDataUrl(skinId, patternSeed = 42) {
    const cleanSkin = KS.WEAPON_SKINS[skinId] ? skinId : 'factory_slate';
    const seed = Math.max(0, Math.min(999, Math.floor(Number(patternSeed) || 0)));
    const key = `${cleanSkin}|${seed}`;
    if (weaponSwatchCache.has(key)) return weaponSwatchCache.get(key);
    if (typeof document === 'undefined') return '';
    try {
      const { albedoCanvas } = paintWeaponToCanvases({
        weaponType: 'deagle', // balanced ~1.75 aspect ratio so swatch shows the full signature graphic cleanly!
        skinId: cleanSkin,
        patternSeed: seed
      }, 192);
      const size = 96;
      const out = document.createElement('canvas');
      out.width = size;
      out.height = size;
      const ctx = out.getContext('2d');
      const sw = albedoCanvas.width;
      const sh = albedoCanvas.height;
      const cropH = sh * 0.90;
      const cropW = Math.min(sw, cropH * 1.15);
      ctx.drawImage(albedoCanvas, (sw - cropW) * 0.5, (sh - cropH) * 0.48, cropW, cropH, 0, 0, size, size);
      // Subtle studio vignette for swatch depth
      const vig = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.25, size * 0.5, size * 0.5, size * 0.72);
      vig.addColorStop(0, 'rgba(255,255,255,0.06)');
      vig.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, size, size);
      const url = out.toDataURL('image/png');
      if (weaponSwatchCache.size > 160) {
        const firstKey = weaponSwatchCache.keys().next().value;
        weaponSwatchCache.delete(firstKey);
      }
      weaponSwatchCache.set(key, url);
      return url;
    } catch (_) {
      return '';
    }
  }

  Object.assign(VI, {
    skinCanvasCache,
    gloveCanvasCache,
    weaponCanvasCache,
    weaponSwatchCache,
    thumbCache,
    skinCacheKey,
    paintSkinToCanvases,
    GLOVE_PALETTES,
    gloveCacheKey,
    paintGloveToCanvases,
    createBladeMaterial,
    weaponCacheKey,
    paintWeaponToCanvases,
    createWeaponMaterial,
    getWeaponSkinSwatchDataUrl,
    updateDynamicSkinMaterials
  });
})(typeof self !== "undefined" ? self : globalThis);
