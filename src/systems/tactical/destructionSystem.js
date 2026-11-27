// Browser-Lightweight Finals + R6 Modular Environmental Destruction System (UMD)
// Features:
// - Subdivided soft wall panels (~1.6m x 1.5m), destructible ceiling hatches, breakable pillars & glass
// - Bullets chip individual peek-holes (intact -> cracked -> open); shotguns/snipers/explosives blow walk-through breaches
// - Pooled InstancedMesh debris burst (1 draw call) + persistent crouchable (~1.05m) solid rubble cover piles
// - O(1) round reset restoring every panel intact and clearing all rubble & player-placed barricades
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DestructionSystem = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const hasTHREE = typeof root.THREE !== 'undefined';
  const THREE = hasTHREE ? root.THREE : null;
  const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));

  const MATERIALS_HP = Object.freeze({
    drywall: 95,
    timber: 120,
    sandstone: 145,
    concrete: 185,
    hatch: 110,
    glass: 35,
    barricade: 210,
    reinforced: 420
  });

  // Heavy weapons that blow wider walk-through breaches instead of single bullet peek-holes
  const HEAVY_BREACH_WEAPONS = new Set(['shotgun', 'sawedoff', 'leverslug', 'awp', 'revolver', 'rpg', 'mgl', 'railcannon']);
  const EXPLOSIVE_SOURCES = new Set(['frag', 'c4', 'breach_charge', 'rpg', 'mgl']);

  let panelSeq = 0;
  let worldGroup = null;
  let debrisInstanced = null;
  const MAX_DEBRIS = 160;
  const debrisPool = [];
  let debrisCursor = 0;
  const _dummy = hasTHREE ? new THREE.Object3D() : null;
  const _tmpCol = hasTHREE ? new THREE.Color() : null;

  // Registry of all destructible panels for the active map
  const panelsById = new Map();
  const panelList = [];
  // Runtime spawned rubble piles & player-placed barricades (cleared on round reset)
  const rubbleEntries = [];
  const runtimeBarricades = [];
  // Hooks supplied by worldBuilder / gameLoop so rubble & barricades join physics solids
  let registerSolidFn = null;
  let solidsRef = null;
  let solidMeshesRef = null;

  function ensureInit(parentGroup, opts) {
    const o = opts || {};
    worldGroup = parentGroup || worldGroup;
    if (typeof o.registerSolid === 'function') registerSolidFn = o.registerSolid;
    if (Array.isArray(o.solids)) solidsRef = o.solids;
    if (Array.isArray(o.solidMeshes)) solidMeshesRef = o.solidMeshes;

    if (hasTHREE && worldGroup && !debrisInstanced) {
      const geo = new THREE.BoxGeometry(0.24, 0.18, 0.24);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.08 });
      debrisInstanced = new THREE.InstancedMesh(geo, mat, MAX_DEBRIS);
      debrisInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      debrisInstanced.frustumCulled = false;
      debrisInstanced.name = 'destruction_debris_pool';
      debrisPool.length = 0;
      for (let i = 0; i < MAX_DEBRIS; i++) {
        _dummy.position.set(0, -999, 0);
        _dummy.scale.set(0.001, 0.001, 0.001);
        _dummy.updateMatrix();
        debrisInstanced.setMatrixAt(i, _dummy.matrix);
        debrisPool.push({
          active: false,
          x: 0, y: -999, z: 0,
          vx: 0, vy: 0, vz: 0,
          rx: 0, ry: 0, rz: 0,
          vrx: 0, vry: 0,
          scale: 1,
          life: 0,
          maxLife: 1.5
        });
      }
      debrisInstanced.instanceMatrix.needsUpdate = true;
      worldGroup.add(debrisInstanced);
    }
  }

  function clearMap() {
    clearRuntimeDynamic();
    panelsById.clear();
    panelList.length = 0;
    panelSeq = 0;
    if (debrisInstanced && debrisInstanced.parent) {
      debrisInstanced.parent.remove(debrisInstanced);
    }
    debrisInstanced = null;
    debrisPool.length = 0;
    worldGroup = null;
  }

  function disableSolidEntry(solid, mesh) {
    if (solid) solid.disabled = true;
    if (mesh) {
      mesh.visible = false;
      mesh.userData = mesh.userData || {};
      mesh.userData.disabled = true;
    }
  }

  function enableSolidEntry(solid, mesh) {
    if (solid) solid.disabled = false;
    if (mesh) {
      mesh.visible = true;
      mesh.userData = mesh.userData || {};
      mesh.userData.disabled = false;
    }
  }

  function clearRuntimeDynamic() {
    for (const r of rubbleEntries) {
      disableSolidEntry(r.solid, r.mesh);
      if (r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh);
    }
    rubbleEntries.length = 0;

    for (const b of runtimeBarricades) {
      disableSolidEntry(b.solid, b.mesh);
      if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
      panelsById.delete(b.id);
    }
    runtimeBarricades.length = 0;

    // Reset debris particles off-screen
    if (hasTHREE && debrisInstanced) {
      for (let i = 0; i < debrisPool.length; i++) {
        debrisPool[i].active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.set(0.001, 0.001, 0.001);
        _dummy.updateMatrix();
        debrisInstanced.setMatrixAt(i, _dummy.matrix);
      }
      debrisInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  function createPanelMaterial(kind, baseColor) {
    if (!hasTHREE) return null;
    if (kind === 'glass') {
      return new THREE.MeshStandardMaterial({
        color: baseColor || 0x8de2ff,
        roughness: 0.14,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42
      });
    }
    const col = baseColor != null
      ? baseColor
      : (kind === 'timber' ? 0x7c5738 : kind === 'sandstone' ? 0xc7a77b : kind === 'hatch' ? 0x5c6674 : kind === 'concrete' ? 0x88919c : 0x9aa3ad);
    return new THREE.MeshStandardMaterial({
      color: col,
      roughness: kind === 'hatch' ? 0.62 : 0.84,
      metalness: kind === 'hatch' ? 0.35 : 0.08
    });
  }

  function addPanelRecord(opts) {
    const id = opts.id || `dp_${++panelSeq}`;
    const kind = opts.kind || 'drywall';
    const maxHp = Number(opts.maxHp) || MATERIALS_HP[kind] || 110;
    const baseColor = opts.color != null
      ? opts.color
      : (kind === 'timber' ? 0x7c5738 : kind === 'sandstone' ? 0xc7a77b : kind === 'hatch' ? 0x5c6674 : kind === 'glass' ? 0x8de2ff : 0x9aa3ad);

    let mesh = opts.mesh || null;
    let solid = opts.solid || null;

    if (hasTHREE && !mesh && worldGroup) {
      const geo = new THREE.BoxGeometry(opts.w, opts.h, opts.d);
      const mat = createPanelMaterial(kind, baseColor);
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(opts.x, opts.y, opts.z);
      if (opts.ry) mesh.rotation.y = opts.ry;
      mesh.castShadow = kind !== 'glass';
      mesh.receiveShadow = true;
      worldGroup.add(mesh);
      if (typeof registerSolidFn === 'function') {
        solid = registerSolidFn(mesh, opts.w, opts.h, opts.d, false);
      }
    }

    if (mesh) {
      mesh.userData = mesh.userData || {};
      mesh.userData.destructiblePanelId = id;
      mesh.userData.destructibleKind = kind;
      mesh.userData.disabled = false;
    }

    const rec = {
      id,
      groupId: opts.groupId || id,
      kind,
      baseColor,
      x: Number(opts.x) || 0,
      y: Number(opts.y) || 0,
      z: Number(opts.z) || 0,
      w: Number(opts.w) || 1.6,
      h: Number(opts.h) || 1.5,
      d: Number(opts.d) || 0.32,
      ry: Number(opts.ry) || 0,
      floorY: typeof opts.floorY === 'number' ? opts.floorY : (Number(opts.y) - (Number(opts.h) || 1.5) * 0.5),
      row: Number(opts.row) || 0,
      col: Number(opts.col) || 0,
      maxHp,
      hp: maxHp,
      broken: false,
      cracked: false,
      reinforced: false,
      spawnsRubble: opts.spawnsRubble !== false && kind !== 'glass' && kind !== 'hatch',
      isRuntime: Boolean(opts.isRuntime),
      mesh,
      solid
    };

    panelsById.set(id, rec);
    if (!rec.isRuntime) {
      panelList.push(rec);
    }
    return rec;
  }

  // Subdivide a soft wall span into modular destructible tiles (~1.6m x 1.5m) with structural frame trim
  function registerSoftWall(opts) {
    const o = opts || {};
    const cx = Number(o.x) || 0;
    const baseY = Number(o.y) || 0; // bottom Y of the wall
    const cz = Number(o.z) || 0;
    const width = Math.max(1.5, Number(o.w) || 4.8);
    const height = Math.max(1.5, Number(o.h) || 3.2);
    const depth = Math.max(0.24, Number(o.d) || 0.34);
    const ry = Number(o.ry) || 0;
    const kind = o.kind || 'drywall';
    const cols = Math.max(1, Math.min(6, Math.round(o.cols || (width / 1.65))));
    const rows = Math.max(1, Math.min(3, Math.round(o.rows || (height / 1.55))));
    const groupId = o.groupId || `wall_${++panelSeq}`;
    const cellW = width / cols;
    const cellH = height / rows;
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);

    // Non-destructible outer frame posts so walls read clearly as Finals/R6 breachable panels
    if (hasTHREE && worldGroup && o.addFrame !== false) {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.65, metalness: 0.45 });
      const postW = 0.18;
      for (const side of [-1, 1]) {
        const localX = side * (width * 0.5 + postW * 0.45);
        const post = new THREE.Mesh(new THREE.BoxGeometry(postW, height + 0.14, depth + 0.08), frameMat);
        post.position.set(cx + localX * cos, baseY + height * 0.5, cz - localX * sin);
        post.rotation.y = ry;
        worldGroup.add(post);
      }
      // Subtle yellow-amber breach chevron bar at top header
      const hdr = new THREE.Mesh(
        new THREE.BoxGeometry(width + postW * 2, 0.14, depth + 0.10),
        new THREE.MeshStandardMaterial({ color: 0x3b4454, roughness: 0.55, metalness: 0.4 })
      );
      hdr.position.set(cx, baseY + height + 0.06, cz);
      hdr.rotation.y = ry;
      worldGroup.add(hdr);
    }

    const created = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const localX = -width * 0.5 + (c + 0.5) * cellW;
        const px = cx + localX * cos;
        const pz = cz - localX * sin;
        const py = baseY + (r + 0.5) * cellH;
        const rec = addPanelRecord({
          groupId,
          kind,
          color: o.color,
          x: px,
          y: py,
          z: pz,
          w: cellW - 0.03,
          h: cellH - 0.03,
          d: depth,
          ry,
          floorY: baseY,
          row: r,
          col: c,
          maxHp: o.maxHp,
          spawnsRubble: r === 0
        });
        created.push(rec);
      }
    }
    return created;
  }

  // Register a destructible horizontal floor/ceiling drop hatch (R6/Finals verticality)
  function registerCeilingHatch(opts) {
    const o = opts || {};
    const cx = Number(o.x) || 0;
    const y = Number(o.y) || 4.0;
    const cz = Number(o.z) || 0;
    const sizeX = Math.max(1.8, Number(o.w) || 2.8);
    const sizeZ = Math.max(1.8, Number(o.d) || 2.8);
    const thick = Math.max(0.22, Number(o.h) || 0.28);
    const groupId = o.groupId || `hatch_${++panelSeq}`;

    // Perimeter rim marking the breachable hatch clearly from above and below
    if (hasTHREE && worldGroup) {
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xffa63d,
        roughness: 0.45,
        metalness: 0.35,
        emissive: 0x6b3200,
        emissiveIntensity: 0.32
      });
      const rw = 0.14;
      const parts = [
        [sizeX + rw, thick + 0.04, rw, 0, 0, -sizeZ * 0.5],
        [sizeX + rw, thick + 0.04, rw, 0, 0, sizeZ * 0.5],
        [rw, thick + 0.04, sizeZ, -sizeX * 0.5, 0, 0],
        [rw, thick + 0.04, sizeZ, sizeX * 0.5, 0, 0]
      ];
      for (const [pw, ph, pd, ox, oy, oz] of parts) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), rimMat);
        m.position.set(cx + ox, y + oy, cz + oz);
        worldGroup.add(m);
      }
    }

    // 2x2 hatch panels so gunfire chips peek-angles down, while shotgun/C4/breach opens full drop!
    const created = [];
    const cw = sizeX * 0.5;
    const cd = sizeZ * 0.5;
    for (let ix = 0; ix < 2; ix++) {
      for (let iz = 0; iz < 2; iz++) {
        const rec = addPanelRecord({
          groupId,
          kind: 'hatch',
          color: o.color || 0x5c6674,
          x: cx + (ix === 0 ? -cw * 0.5 : cw * 0.5),
          y,
          z: cz + (iz === 0 ? -cd * 0.5 : cd * 0.5),
          w: cw - 0.04,
          h: thick,
          d: cd - 0.04,
          floorY: y - 4.0,
          row: 0,
          col: ix * 2 + iz,
          maxHp: o.maxHp || MATERIALS_HP.hatch,
          spawnsRubble: false
        });
        created.push(rec);
      }
    }
    return created;
  }

  function registerBreakablePillar(opts) {
    const o = opts || {};
    return [addPanelRecord({
      groupId: o.groupId || `pillar_${++panelSeq}`,
      kind: o.kind || 'concrete',
      color: o.color || 0x8f97a3,
      x: Number(o.x) || 0,
      y: (Number(o.y) || 0) + (Number(o.h) || 3.4) * 0.5,
      z: Number(o.z) || 0,
      w: Number(o.w) || 1.4,
      h: Number(o.h) || 3.4,
      d: Number(o.d) || 1.4,
      floorY: Number(o.y) || 0,
      maxHp: o.maxHp || MATERIALS_HP.concrete,
      spawnsRubble: true
    })];
  }

  function registerBreakableGlass(opts) {
    const o = opts || {};
    return [addPanelRecord({
      groupId: o.groupId || `glass_${++panelSeq}`,
      kind: 'glass',
      color: o.color || 0x8be2ff,
      x: Number(o.x) || 0,
      y: Number(o.y) || 2.0,
      z: Number(o.z) || 0,
      w: Number(o.w) || 2.8,
      h: Number(o.h) || 2.4,
      d: Number(o.d) || 0.16,
      ry: Number(o.ry) || 0,
      floorY: Number(o.floorY) || 0,
      maxHp: o.maxHp || MATERIALS_HP.glass,
      spawnsRubble: false
    })];
  }

  function spawnDebrisBurst(x, y, z, colorHex, count) {
    if (!hasTHREE || !debrisInstanced) return;
    const n = Math.min(24, Math.max(4, count || 10));
    if (_tmpCol) _tmpCol.setHex(colorHex || 0xa89f91);
    for (let i = 0; i < n; i++) {
      const idx = debrisCursor % MAX_DEBRIS;
      debrisCursor = (debrisCursor + 1) % MAX_DEBRIS;
      const p = debrisPool[idx];
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.9;
      p.y = y + (Math.random() - 0.5) * 0.7;
      p.z = z + (Math.random() - 0.5) * 0.9;
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.6 + Math.random() * 5.2;
      p.vx = Math.cos(ang) * spd;
      p.vy = 2.8 + Math.random() * 4.8;
      p.vz = Math.sin(ang) * spd;
      p.rx = Math.random() * 6.28;
      p.ry = Math.random() * 6.28;
      p.rz = Math.random() * 6.28;
      p.vrx = (Math.random() - 0.5) * 9;
      p.vry = (Math.random() - 0.5) * 9;
      p.scale = 0.55 + Math.random() * 0.95;
      p.life = 0;
      p.maxLife = 0.85 + Math.random() * 0.65;
      if (typeof debrisInstanced.setColorAt === 'function' && _tmpCol) {
        debrisInstanced.setColorAt(idx, _tmpCol);
        if (debrisInstanced.instanceColor) debrisInstanced.instanceColor.needsUpdate = true;
      }
    }
  }

  // Persistent crouch-height (~1.05m) solid rubble pile created when a lower wall or pillar collapses
  function spawnRubblePile(panel) {
    if (!panel || !panel.spawnsRubble) return null;
    // Prevent stacking duplicate rubble mounds at the exact same spot
    for (const r of rubbleEntries) {
      const dx = r.x - panel.x;
      const dz = r.z - panel.z;
      if (dx * dx + dz * dz < 1.1 && Math.abs(r.y - panel.floorY) < 1.0) return r;
    }

    const rw = clamp(panel.w * 0.92, 1.15, 2.0);
    const rh = 1.02; // Crouchable chest/waist cover!
    const rd = clamp(Math.max(panel.d * 2.6, 1.05), 1.0, 1.65);
    const ry = panel.ry || 0;
    const cy = panel.floorY + rh * 0.5;

    let mesh = null;
    let solid = null;
    if (hasTHREE && worldGroup) {
      const grp = new THREE.Mesh(
        new THREE.BoxGeometry(rw, rh, rd),
        new THREE.MeshStandardMaterial({
          color: panel.baseColor || 0x8f887d,
          roughness: 0.94,
          metalness: 0.05
        })
      );
      grp.position.set(panel.x, cy, panel.z);
      grp.rotation.y = ry;
      grp.castShadow = true;
      grp.receiveShadow = true;
      grp.userData = { isRubbleCover: true, disabled: false };

      // Visual jagged chunks on top so it unmistakably reads as a rubble mound
      const subMat = new THREE.MeshStandardMaterial({
        color: (panel.baseColor || 0x8f887d) & 0xfefefe,
        roughness: 0.96,
        metalness: 0.04
      });
      for (let i = 0; i < 3; i++) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.36, 0.24, rd * 0.42), subMat);
        ch.position.set((i - 1) * rw * 0.26, rh * 0.46, (i % 2 === 0 ? 0.14 : -0.14));
        ch.rotation.set(0.22 * (i - 1), 0.45 * i, 0.18);
        grp.add(ch);
      }

      worldGroup.add(grp);
      mesh = grp;
      if (typeof registerSolidFn === 'function') {
        solid = registerSolidFn(mesh, rw, rh, rd, false);
      }
    }

    const entry = {
      id: `rubble_${rubbleEntries.length + 1}`,
      x: panel.x,
      y: panel.floorY,
      z: panel.z,
      w: rw,
      h: rh,
      d: rd,
      mesh,
      solid
    };
    rubbleEntries.push(entry);
    return entry;
  }

  function applyCrackedVisual(panel) {
    if (!hasTHREE || !panel || !panel.mesh || !panel.mesh.material) return;
    if (panel.kind === 'glass') {
      panel.mesh.material.opacity = 0.65;
      return;
    }
    const base = new THREE.Color(panel.baseColor);
    base.multiplyScalar(0.68);
    panel.mesh.material.color.copy(base);
    panel.mesh.scale.set(0.96, 0.96, 0.92);
  }

  function breakPanel(panel, sourceWeapon) {
    if (!panel || panel.broken) return false;
    panel.broken = true;
    panel.hp = 0;
    disableSolidEntry(panel.solid, panel.mesh);
    spawnDebrisBurst(panel.x, panel.y, panel.z, panel.baseColor, panel.kind === 'glass' ? 12 : 16);
    const rubble = spawnRubblePile(panel);
    if (root.WeaponAudio && typeof root.WeaponAudio.playDestructionBreak === 'function') {
      root.WeaponAudio.playDestructionBreak(panel.kind);
    }
    return { broken: true, panelId: panel.id, kind: panel.kind, rubble: Boolean(rubble), sourceWeapon };
  }

  // Apply bullet / shotgun / explosive damage to a specific destructible panel.
  // - Standard bullets chip peek-holes on a single panel.
  // - Shotguns, heavy snipers, and explosives also breach neighboring panels for walk-through doorways!
  function damagePanel(panelId, rawDamage, sourceWeapon, opts) {
    const panel = panelsById.get(panelId);
    if (!panel || panel.broken) return { hit: false, brokenIds: [] };

    const wid = String(sourceWeapon || 'rifle').toLowerCase();
    const isExplosive = EXPLOSIVE_SOURCES.has(wid);
    const isHeavy = HEAVY_BREACH_WEAPONS.has(wid);

    let mult = 1.0;
    if (isExplosive) mult = 4.0;
    else if (isHeavy) mult = 2.15;
    if (panel.reinforced && !isExplosive) mult *= 0.28;

    const dmg = Math.max(8, Math.round((Number(rawDamage) || 30) * mult));
    panel.hp = Math.max(0, panel.hp - dmg);
    const brokenIds = [];

    if (panel.hp <= 0) {
      breakPanel(panel, wid);
      brokenIds.push(panel.id);

      // Shotguns / heavy snipers / explosives blow open a walk-through breach by clearing adjacent panel(s) in same group!
      if ((isHeavy || isExplosive) && !(opts && opts.noSplash)) {
        const splashRad = isExplosive ? 2.6 : 1.85;
        for (const other of panelsById.values()) {
          if (other.broken || other.id === panel.id) continue;
          if (other.groupId !== panel.groupId && !isExplosive) continue;
          const dist = Math.hypot(other.x - panel.x, other.y - panel.y, other.z - panel.z);
          if (dist <= splashRad) {
            if (isExplosive || (isHeavy && other.hp <= other.maxHp * 0.9)) {
              other.hp = Math.max(0, other.hp - Math.round(dmg * 0.72));
              if (other.hp <= 0) {
                breakPanel(other, wid);
                brokenIds.push(other.id);
              } else if (!other.cracked && other.hp <= other.maxHp * 0.55) {
                other.cracked = true;
                applyCrackedVisual(other);
              }
            }
          }
        }
      }
    } else if (!panel.cracked && panel.hp <= panel.maxHp * 0.55) {
      panel.cracked = true;
      applyCrackedVisual(panel);
      spawnDebrisBurst(panel.x, panel.y, panel.z, panel.baseColor, 5);
    }

    return {
      hit: true,
      panelId: panel.id,
      hp: panel.hp,
      cracked: panel.cracked,
      broken: panel.broken,
      brokenIds
    };
  }

  // Area explosion breach (Frag HE, C4 Satchel, Breach Charge)
  function applyExplosion(center, radius, maxDamage, sourceWeapon) {
    if (!center) return { brokenIds: [], damagedIds: [] };
    const rad = Math.max(1.0, Number(radius) || 3.0);
    const dmg = Math.max(40, Number(maxDamage) || 260);
    const brokenIds = [];
    const damagedIds = [];

    for (const panel of panelsById.values()) {
      if (panel.broken) continue;
      const dist = Math.hypot(panel.x - center.x, panel.y - center.y, panel.z - center.z);
      if (dist > rad) continue;
      const falloff = 1 - (dist / rad) * 0.55;
      const res = damagePanel(panel.id, dmg * falloff, sourceWeapon || 'c4', { noSplash: true });
      if (res.broken) brokenIds.push(panel.id);
      else if (res.hit) damagedIds.push(panel.id);
    }
    return { brokenIds, damagedIds };
  }

  // Reinforce an intact soft wall panel with steel armor (Defender / Tactical Barricade gadget)
  function reinforcePanel(panelId) {
    const panel = panelsById.get(panelId);
    if (!panel || panel.broken || panel.reinforced || panel.kind === 'glass') return false;
    panel.reinforced = true;
    panel.maxHp = MATERIALS_HP.reinforced;
    panel.hp = MATERIALS_HP.reinforced;
    panel.cracked = false;
    if (hasTHREE && panel.mesh && panel.mesh.material) {
      panel.mesh.material.color.setHex(0x3a4758);
      panel.mesh.material.metalness = 0.65;
      panel.mesh.material.roughness = 0.42;
      panel.mesh.scale.set(1, 1, 1.08);
    }
    return true;
  }

  // Deploy a standalone tactical barricade in world space
  function deployBarricade(pos, yaw) {
    if (!pos) return null;
    const id = `barricade_${++panelSeq}`;
    const rec = addPanelRecord({
      id,
      groupId: id,
      kind: 'barricade',
      color: 0x3b82f6,
      x: pos.x,
      y: pos.y + 0.78,
      z: pos.z,
      w: 2.0,
      h: 1.56,
      d: 0.28,
      ry: yaw || 0,
      floorY: pos.y,
      maxHp: MATERIALS_HP.barricade,
      spawnsRubble: true,
      isRuntime: true
    });
    runtimeBarricades.push(rec);
    return rec;
  }

  // O(1) clean round reset — every soft wall, ceiling hatch, pillar & glass returns intact; rubble & barricades cleared
  function resetRound() {
    clearRuntimeDynamic();
    for (let i = 0; i < panelList.length; i++) {
      const p = panelList[i];
      p.broken = false;
      p.cracked = false;
      p.reinforced = false;
      p.maxHp = MATERIALS_HP[p.kind] || 110;
      p.hp = p.maxHp;
      enableSolidEntry(p.solid, p.mesh);
      if (hasTHREE && p.mesh) {
        p.mesh.scale.set(1, 1, 1);
        if (p.mesh.material) {
          p.mesh.material.color.setHex(p.baseColor);
          p.mesh.material.metalness = p.kind === 'hatch' ? 0.35 : 0.08;
          p.mesh.material.roughness = p.kind === 'glass' ? 0.14 : (p.kind === 'hatch' ? 0.62 : 0.84);
          if (p.kind === 'glass') p.mesh.material.opacity = 0.42;
        }
      }
    }
    return panelList.length;
  }

  // Step pooled InstancedMesh debris animation (zero allocations)
  function update(dt) {
    if (!hasTHREE || !debrisInstanced || debrisPool.length === 0) return;
    let dirty = false;
    for (let i = 0; i < debrisPool.length; i++) {
      const p = debrisPool[i];
      if (!p.active) continue;
      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.set(0.001, 0.001, 0.001);
        _dummy.updateMatrix();
        debrisInstanced.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 18.0 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      const fade = Math.max(0.05, 1 - p.life / p.maxLife);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.rx, p.ry, p.rz);
      const sc = p.scale * fade;
      _dummy.scale.set(sc, sc, sc);
      _dummy.updateMatrix();
      debrisInstanced.setMatrixAt(i, _dummy.matrix);
    }
    if (dirty) debrisInstanced.instanceMatrix.needsUpdate = true;
  }

  function getStats() {
    let broken = 0;
    let cracked = 0;
    for (const p of panelList) {
      if (p.broken) broken += 1;
      else if (p.cracked) cracked += 1;
    }
    return {
      totalPanels: panelList.length,
      brokenPanels: broken,
      crackedPanels: cracked,
      rubbleCount: rubbleEntries.length,
      barricadeCount: runtimeBarricades.length
    };
  }

  function getPanel(id) {
    return panelsById.get(id) || null;
  }

  return {
    MATERIALS_HP,
    HEAVY_BREACH_WEAPONS,
    EXPLOSIVE_SOURCES,
    ensureInit,
    clearMap,
    registerSoftWall,
    registerCeilingHatch,
    registerBreakablePillar,
    registerBreakableGlass,
    damagePanel,
    applyExplosion,
    reinforcePanel,
    deployBarricade,
    resetRound,
    update,
    getPanel,
    getStats,
    getPanels: () => panelList.slice(),
    getRubble: () => rubbleEntries.slice()
  };
});
