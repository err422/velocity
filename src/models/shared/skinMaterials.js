// Procedural PBR texture & material painters for knife blades, tactical gloves, and firearm finishes.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
  const { createStudioEnvMap, getProceduralTexSize } = VI;
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
        } else if (skinId === 'tactical_carbon') {
          const cx = Math.floor(u * 104);
          const cy = Math.floor(v * 72);
          const twill = ((cx + cy) % 4) < 2 ? 1.24 : 0.72;
          const hex = Math.sin(u * 46 * Math.PI) * Math.sin(v * 34 * Math.PI);
          r = (26 + micro * 10) * twill + hex * 4;
          g = (31 + micro * 12) * twill + hex * 5;
          b = (38 + micro * 14) * twill + hex * 6;
          if (Math.abs(v - 0.78) < 0.015) {
            r = 88; g = 156; b = 196; rough = 54; bump = 160;
          } else {
            rough = twill > 1 ? 82 : 148;
            bump = twill > 1 ? 158 : 96;
          }
        } else if (skinId === 'cyber_wireframe') {
          const gx = Math.abs(Math.sin((u * 24 + seed * 0.01) * Math.PI));
          const gy = Math.abs(Math.sin((v * 16 + seed * 0.02) * Math.PI));
          const diag = Math.abs(Math.sin(((u * 12 + v * 12) + seed * 0.01) * Math.PI));
          const wire = Math.max(gx, gy, diag * 0.96);
          if (wire > 0.93) {
            const shift = Math.sin((u * 3.5 + v * 2.0) * Math.PI) * 0.5 + 0.5;
            r = 38 + shift * 210;
            g = 246 - shift * 180;
            b = 255;
            rough = 28; bump = 196;
          } else {
            r = 10 + micro * 10; g = 14 + micro * 12; b = 24 + micro * 18;
            rough = 132; bump = 108;
          }
        } else if (skinId === 'holo_prism') {
          const wx = KS.fbm2D(u * 4.0 + ox, v * 4.0 + oy, seed + 211, 3);
          const facet = Math.sin((u * 11 + v * 8 + wx * 4.2) * Math.PI);
          const hue = ((u * 1.4 + v * 0.9 + wx * 0.8 + (seed % 17) * 0.06) % 1 + 1) % 1;
          const tri = (t) => Math.max(0, Math.min(1, Math.abs(((t * 6) % 6) - 3) - 1));
          const sheen = 0.72 + Math.abs(facet) * 0.28;
          r = (58 + tri(hue) * 195) * sheen;
          g = (72 + tri(hue + 0.33) * 182) * sheen;
          b = (96 + tri(hue + 0.66) * 158) * sheen;
          rough = 22 + (1 - Math.abs(facet)) * 22;
          bump = 100 + Math.abs(facet) * 76;
        } else if (skinId === 'molten_magma') {
          const n1 = KS.fbm2D(u * 5.2 + ox, v * 5.2 + oy, seed + 149, 4);
          const n2 = KS.fbm2D(u * 11.0 + n1 * 2.2, v * 11.0 + n1 * 2.2, seed + 281, 3);
          const ridge = 1 - Math.abs(Math.sin((u * 6.5 + v * 4.5 + n1 * 4.4) * Math.PI));
          const crack = Math.pow(Math.max(0, ridge * 0.72 + n2 * 0.42 - 0.58) / 0.42, 1.35);
          if (crack > 0.12) {
            const hot = Math.min(1, crack * 1.45);
            r = 255;
            g = 62 + hot * 186;
            b = 10 + Math.pow(hot, 2.2) * 130;
            rough = 26; bump = 168 + hot * 56;
          } else {
            const rock = 18 + n2 * 26;
            r = rock * 1.15; g = rock * 0.95; b = rock * 0.98;
            rough = 186; bump = 88 + n2 * 44;
          }
        } else if (skinId === 'ronin_sakura') {
          const ink = KS.fbm2D(u * 4.5 + ox, v * 4.5 + oy, seed + 331, 3);
          const split = v + Math.sin(u * 5.2 + ink * 2.4) * 0.14;
          if (split > 0.62) {
            r = 236 - ink * 18; g = 228 - ink * 18; b = 224 - ink * 14;
            rough = 58; bump = 134;
          } else if (Math.abs(split - 0.60) < 0.028) {
            r = 238; g = 186; b = 74; rough = 32; bump = 168;
          } else {
            r = 20 + ink * 18; g = 18 + ink * 16; b = 28 + ink * 22;
            rough = 84; bump = 118 + ink * 22;
          }
        } else if (skinId === 'oni_crimson') {
          const wave = KS.fbm2D(u * 4.8 + ox, v * 4.8 + oy, seed + 401, 3);
          const slash = Math.sin((u * 7.5 - v * 4.0 + wave * 3.4) * Math.PI);
          if (slash > 0.35) {
            r = 212 + wave * 42; g = 22 + wave * 24; b = 42 + wave * 26;
            rough = 54; bump = 148;
          } else if (Math.abs(slash - 0.32) < 0.06) {
            r = 234; g = 178; b = 68; rough = 34; bump = 166;
          } else {
            r = 18 + wave * 16; g = 14 + wave * 12; b = 22 + wave * 18;
            rough = 104; bump = 112 + wave * 22;
          }
        } else if (skinId === 'shogun_gold') {
          const seigaiha = Math.sin(Math.hypot(((u * 14) % 1) - 0.5, ((v * 10) % 1) - 0.5) * 28);
          const goldBand = v > 0.72 || v < 0.22 || seigaiha > 0.58;
          if (goldBand) {
            const lum = 0.84 + micro * 0.22;
            r = 248 * lum; g = 196 * lum; b = 66 * lum;
            rough = 26; bump = 158;
          } else {
            r = 20 + micro * 12; g = 18 + micro * 10; b = 24 + micro * 14;
            rough = 72; bump = 112;
          }
        } else if (skinId === 'reactive_overdrive') {
          const w = KS.fbm2D(u * 5.0 + ox, v * 5.0 + oy, seed + 503, 3);
          const pulse = Math.abs(Math.sin((u * 9.0 + v * 3.5 + w * 4.2) * Math.PI));
          if (pulse > 0.74) {
            r = 52; g = 240; b = 255; rough = 24; bump = 176;
          } else {
            r = 16 + w * 22; g = 24 + w * 28; b = 38 + w * 40; rough = 92; bump = 114;
          }
        } else if (skinId === 'reactive_oni') {
          const w = KS.fbm2D(u * 5.5 + ox, v * 5.5 + oy, seed + 547, 3);
          const vein = Math.abs(Math.sin((u * 8.0 - v * 5.0 + w * 4.8) * Math.PI));
          if (vein > 0.72) {
            r = 255; g = 56; b = 88; rough = 24; bump = 178;
          } else {
            r = 22 + w * 20; g = 14 + w * 14; b = 20 + w * 18; rough = 96; bump = 114;
          }
        } else if (skinId === 'camo_gold') {
          const topo = KS.fbm2D(u * 4.4, v * 4.4, 777, 4);
          const contour = Math.abs(Math.sin((u * 5.0 + v * 4.0 + topo * 6.5) * Math.PI * 2));
          if (contour > 0.88) {
            r = 34; g = 28; b = 22; rough = 120; bump = 88;
          } else {
            const gleam = 0.88 + topo * 0.22;
            r = Math.min(255, 252 * gleam);
            g = Math.min(255, 204 * gleam);
            b = Math.min(255, 64 * gleam);
            rough = 22 + (1 - topo) * 18;
            bump = 136 + contour * 34;
          }
        } else if (skinId === 'camo_diamond') {
          const gx = (u * 26) % 1 - 0.5;
          const gy = (v * 18) % 1 - 0.5;
          const dist = Math.abs(gx) + Math.abs(gy);
          if (v < 0.18 || v > 0.84) {
            // Gold trim rail borders
            r = 246; g = 198; b = 74; rough = 24; bump = 152;
          } else if (dist < 0.44) {
            const sparkle = KS.hash2D(Math.floor(u * 26), Math.floor(v * 18), 919);
            const facet = Math.max(0, 1 - dist * 2.1);
            const lum = 196 + facet * 59 + (sparkle > 0.72 ? 32 : 0);
            r = Math.min(255, lum * 0.94);
            g = Math.min(255, lum * 0.98);
            b = Math.min(255, lum * 1.05);
            rough = 14; bump = 148 + facet * 92;
          } else {
            r = 142; g = 154; b = 170; rough = 44; bump = 88;
          }
        } else if (skinId === 'camo_dark_matter') {
          const w1 = KS.fbm2D(u * 3.8 + 1.4, v * 3.8 + 2.1, 881, 4);
          const w2 = KS.fbm2D(u * 7.2 + w1 * 2.6, v * 7.2 + w1 * 2.6, 991, 3);
          const nebula = Math.sin((u * 4.5 + v * 3.2 + w1 * 5.2 + w2 * 2.1) * Math.PI) * 0.5 + 0.5;
          const core = Math.pow(nebula, 1.5);
          const star = KS.hash2D(px, py, 1013) > 0.994 ? 1 : 0;
          r = 16 + core * 186 + w2 * 44 + star * 220;
          g = 8 + Math.pow(core, 2.2) * 86 + star * 210;
          b = 42 + core * 204 + (1 - nebula) * 48 + star * 255;
          rough = 22 + (1 - core) * 28;
          bump = 112 + core * 54;
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
    } else if (skinId === 'ronin_sakura') {
      // Drifting sakura blossoms & branch silhouette painted cleanly across receiver/blade
      actx.save();
      const s = res;
      actx.strokeStyle = 'rgba(28, 20, 26, 0.88)';
      actx.lineWidth = Math.max(2.0, s / 120);
      actx.beginPath();
      actx.moveTo(s * 0.06, s * 0.56);
      actx.quadraticCurveTo(s * 0.36, s * 0.38, s * 0.78, s * 0.28);
      actx.stroke();
      for (let i = 0; i < 16; i++) {
        const bx = (0.10 + KS.hash2D(seed + 3, i * 19, 317) * 0.82) * s;
        const by = (0.14 + KS.hash2D(seed + 7, i * 29, 419) * 0.70) * s;
        const rad = s * (0.018 + KS.hash2D(seed + 11, i * 37, 503) * 0.018);
        actx.save();
        actx.translate(bx, by);
        actx.fillStyle = i % 3 === 0 ? 'rgba(255, 196, 224, 0.94)' : 'rgba(255, 118, 178, 0.92)';
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          actx.beginPath();
          actx.ellipse(Math.cos(ang) * rad * 0.65, Math.sin(ang) * rad * 0.65, rad * 0.55, rad * 0.32, ang, 0, Math.PI * 2);
          actx.fill();
        }
        actx.fillStyle = 'rgba(255, 220, 110, 0.95)';
        actx.beginPath();
        actx.arc(0, 0, rad * 0.24, 0, Math.PI * 2);
        actx.fill();
        actx.restore();
      }
      actx.restore();
    } else if (skinId === 'oni_crimson') {
      // Stylized geometric Oni mask emblem on receiver center
      actx.save();
      const s = res;
      const oxC = s * 0.52, oyC = s * 0.48, rC = s * 0.14;
      actx.fillStyle = 'rgba(18, 12, 16, 0.92)';
      actx.beginPath();
      actx.moveTo(oxC, oyC - rC);
      actx.lineTo(oxC + rC * 0.85, oyC - rC * 0.25);
      actx.lineTo(oxC + rC * 0.65, oyC + rC * 0.82);
      actx.lineTo(oxC, oyC + rC);
      actx.lineTo(oxC - rC * 0.65, oyC + rC * 0.82);
      actx.lineTo(oxC - rC * 0.85, oyC - rC * 0.25);
      actx.closePath();
      actx.fill();
      actx.strokeStyle = 'rgba(246, 192, 74, 0.95)';
      actx.lineWidth = Math.max(2.0, s / 145);
      actx.stroke();
      // Glowing Oni eyes & fangs
      actx.fillStyle = '#ff324d';
      actx.fillRect(oxC - rC * 0.52, oyC - rC * 0.16, rC * 0.34, rC * 0.16);
      actx.fillRect(oxC + rC * 0.18, oyC - rC * 0.16, rC * 0.34, rC * 0.16);
      actx.fillStyle = '#f8f2e4';
      actx.beginPath();
      actx.moveTo(oxC - rC * 0.36, oyC + rC * 0.54);
      actx.lineTo(oxC - rC * 0.24, oyC + rC * 0.18);
      actx.lineTo(oxC - rC * 0.12, oyC + rC * 0.54);
      actx.moveTo(oxC + rC * 0.12, oyC + rC * 0.54);
      actx.lineTo(oxC + rC * 0.24, oyC + rC * 0.18);
      actx.lineTo(oxC + rC * 0.36, oyC + rC * 0.54);
      actx.fill();
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

  // Registry of live animated / reactive weapon materials for per-frame updates
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
        if (mat.map) {
          mat.map.offset.x = (dynamicSkinClock * 0.085) % 1;
          mat.map.offset.y = Math.sin(dynamicSkinClock * 0.55) * 0.08;
        }
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.4);
        mat.emissiveIntensity = 0.42 + pulse * 0.38;
        mat.emissive.setHSL(0.76 + Math.sin(dynamicSkinClock * 0.7) * 0.06, 0.86, 0.48);
      } else if (mode === 'reactive_overdrive') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * (3.0 + streakFactor * 5.0));
        mat.emissiveIntensity = 0.22 + streakFactor * 0.95 + pulse * (0.14 + streakFactor * 0.26);
        // Shifts from cyber cyan (0 kills) -> electric violet (3 kills) -> incandescent gold-white (5+ kills)
        const hue = streak >= 5 ? 0.11 : streak >= 3 ? 0.78 : 0.52;
        mat.emissive.setHSL(hue, 0.95, 0.50 + streakFactor * 0.14);
      } else if (mode === 'reactive_oni') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * (2.6 + streakFactor * 5.5));
        mat.emissiveIntensity = 0.22 + streakFactor * 1.05 + pulse * (0.16 + streakFactor * 0.30);
        const hue = streak >= 5 ? 0.07 : streak >= 3 ? 0.96 : 0.98;
        mat.emissive.setHSL(hue, 0.96, 0.42 + streakFactor * 0.18);
      } else if (mode === 'molten_magma' || mode === 'cyber_wireframe') {
        const pulse = 0.5 + 0.5 * Math.sin(dynamicSkinClock * 2.0);
        mat.emissiveIntensity = 0.26 + pulse * 0.20;
      }
    }
  }

  function createWeaponMaterial(weaponItem, targetRenderer) {
    const { albedoCanvas, roughCanvas, bumpCanvas } = paintWeaponToCanvases(weaponItem);
    const sk = (weaponItem && weaponItem.skinId) || 'factory_slate';
    const isAnimatedDarkMatter = sk === 'camo_dark_matter';
    const wrapMode = isAnimatedDarkMatter ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = wrapMode;
    map.wrapT = wrapMode;
    const maxAniso = targetRenderer ? targetRenderer.capabilities.getMaxAnisotropy() : 4;
    map.anisotropy = Math.min(8, maxAniso);

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = wrapMode;
    roughnessMap.wrapT = wrapMode;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = wrapMode;
    bumpMap.wrapT = wrapMode;

    const isMetallic = sk === 'fade' || sk === 'case_hardened' || sk === 'damascus' || sk === 'dragon_gold' || sk === 'blaze' || sk === 'redshift' || sk === 'solarflare' || sk === 'camo_gold' || sk === 'camo_diamond' || sk === 'shogun_gold';
    const isGlossy = isMetallic || sk === 'printstream' || sk === 'hyper_chroma' || sk === 'neon_rider' || sk === 'coldfront' || sk === 'nitro' || sk === 'voidglass' || sk === 'holo_prism' || sk === 'camo_dark_matter' || sk === 'reactive_overdrive' || sk === 'reactive_oni' || sk === 'ronin_sakura';
    const iri = sk === 'holo_prism' ? 0.92 : sk === 'printstream' ? 0.78 : sk === 'camo_diamond' ? 0.64 : sk === 'camo_dark_matter' ? 0.62 : sk === 'fade' ? 0.45 : sk === 'case_hardened' ? 0.36 : sk === 'hyper_chroma' ? 0.42 : sk === 'voidglass' ? 0.54 : sk === 'coldfront' ? 0.26 : 0.0;

    let emissiveColor = 0x000000;
    let emissiveIntensity = 0.0;
    if (sk === 'camo_dark_matter') { emissiveColor = 0x8b3dff; emissiveIntensity = 0.55; }
    else if (sk === 'reactive_overdrive') { emissiveColor = 0x2deeff; emissiveIntensity = 0.30; }
    else if (sk === 'reactive_oni') { emissiveColor = 0xff2c4d; emissiveIntensity = 0.30; }
    else if (sk === 'molten_magma') { emissiveColor = 0xff4b12; emissiveIntensity = 0.32; }
    else if (sk === 'cyber_wireframe') { emissiveColor = 0x1ee8ff; emissiveIntensity = 0.28; }

    const mat = new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap,
      bumpMap,
      bumpScale: sk === 'redline' || sk === 'dragon_gold' || sk === 'damascus' || sk === 'solarflare' || sk === 'tactical_carbon' || sk === 'camo_diamond' || sk === 'camo_gold' ? 0.0034 : 0.0016,
      roughness: sk === 'camo_diamond' ? 0.14 : sk === 'camo_gold' ? 0.20 : isGlossy ? 0.28 : 0.58,
      metalness: sk === 'camo_gold' ? 0.96 : sk === 'camo_diamond' ? 0.78 : isMetallic ? 0.88 : sk === 'printstream' ? 0.16 : 0.34,
      clearcoat: isGlossy ? 0.82 : 0.18,
      clearcoatRoughness: sk === 'camo_diamond' || sk === 'holo_prism' ? 0.06 : sk === 'printstream' ? 0.12 : 0.20,
      iridescence: iri,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: sk === 'holo_prism' ? [120, 620] : sk === 'printstream' ? [180, 520] : [140, 420],
      emissive: new THREE.Color(emissiveColor),
      emissiveIntensity,
      envMapIntensity: isMetallic || sk === 'camo_diamond' ? 1.68 : sk === 'printstream' ? 1.45 : 1.22
    });

    if (sk === 'camo_dark_matter' || sk === 'reactive_overdrive' || sk === 'reactive_oni' || sk === 'molten_magma' || sk === 'cyber_wireframe') {
      mat.userData.dynamicSkin = sk;
      dynamicSkinMaterials.add(mat);
      if (dynamicSkinMaterials.size > 96) {
        const first = dynamicSkinMaterials.values().next().value;
        dynamicSkinMaterials.delete(first);
      }
    }

    return mat;
  }

  Object.assign(VI, {
    skinCanvasCache,
    gloveCanvasCache,
    weaponCanvasCache,
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
    updateDynamicSkinMaterials
  });
})(typeof self !== "undefined" ? self : globalThis);
