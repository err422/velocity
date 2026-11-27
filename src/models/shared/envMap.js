// Studio PMREM environment map, UV normalizers, blade bevel loft builder, and Three.js disposal helpers.
(function (root) {
  "use strict";
  if (!root.THREE || typeof document === "undefined") return;
  const THREE = root.THREE;
  const KS = root.KnivesSystem;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});
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
    // Crisp studio softboxes + warm/cool specular edge strips for rich PBR skin & metallic bevel reflections
    addPanel(panelGeo, 0xf6fbff, 3.6, [0, 6.5, 0.5], [Math.PI / 2, 0, 0]);
    addPanel(stripGeo, 0xffffff, 4.6, [0, 5.8, -3.5], [Math.PI / 2.6, 0, 0]);
    addPanel(panelGeo, 0xffe4be, 3.0, [6.5, 2.6, 2.2], [0, -Math.PI / 2, 0]);
    addPanel(panelGeo, 0x7ae8ff, 2.55, [-6.5, 1.9, -2.0], [0, Math.PI / 2, 0]);
    addPanel(stripGeo, 0xdff2ff, 2.6, [0, 2.2, 7.0], [0, Math.PI, 0]);
    addPanel(panelGeo, 0x1e344a, 1.05, [0, -5.5, 0], [-Math.PI / 2, 0, 0]);

    const rt = pmrem.fromScene(envScene, 0.032);
    pmrem.dispose();
    panelGeo.dispose();
    stripGeo.dispose();
    return rt.texture;
  }

  function getProceduralTexSize() {
    return (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 256 : 512;
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

  // ---------- Face-Normal-Aware Box UV Mapper (Eliminates Top/Bottom/Front/Bevel Streaking!) ----------
  // Side faces (|nx| dominant): u = Stock(+Z)->Muzzle(-Z), v = Bottom->Top
  // Top/Bottom faces (|ny| dominant): u = Stock(+Z)->Muzzle(-Z), v mapped cleanly in upper/lower bands
  // Front/Rear faces (|nz| dominant): u = Left->Right at matched density, v = Bottom->Top
  const _uvA = new THREE.Vector3();
  const _uvB = new THREE.Vector3();
  const _uvC = new THREE.Vector3();
  const _uvE1 = new THREE.Vector3();
  const _uvE2 = new THREE.Vector3();
  const _uvN = new THREE.Vector3();

  function projectWeaponMeshUVs(mesh, bounds) {
    if (!mesh || !mesh.geometry) return mesh;
    mesh.updateMatrix();
    let geo = mesh.geometry;
    if (geo.index) {
      const nonIdx = geo.toNonIndexed();
      geo.dispose();
      geo = nonIdx;
      mesh.geometry = geo;
    }
    const pos = geo.attributes.position;
    if (!pos || pos.count < 3) return mesh;
    let uv = geo.attributes.uv;
    if (!uv || uv.count !== pos.count) {
      uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
      geo.setAttribute('uv', uv);
    }
    const spanZ = Math.max(1e-4, bounds.maxZ - bounds.minZ);
    const spanY = Math.max(1e-4, bounds.maxY - bounds.minY);
    const mat = mesh.matrix;
    const clampUV = (val) => Math.max(0.015, Math.min(0.985, val));

    for (let i = 0; i < pos.count; i += 3) {
      if (i + 2 >= pos.count) break;
      _uvA.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat);
      _uvB.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)).applyMatrix4(mat);
      _uvC.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)).applyMatrix4(mat);

      _uvE1.subVectors(_uvB, _uvA);
      _uvE2.subVectors(_uvC, _uvA);
      _uvN.crossVectors(_uvE1, _uvE2);

      const ax = Math.abs(_uvN.x);
      const ay = Math.abs(_uvN.y);
      const az = Math.abs(_uvN.z);
      const isTopFace = _uvN.y >= 0;

      const verts = [_uvA, _uvB, _uvC];
      for (let k = 0; k < 3; k++) {
        const p = verts[k];
        let u, v;
        if (ax >= ay && ax >= az) {
          // Play-side / off-side faces: classic full-length projection
          u = (bounds.maxZ - p.z) / spanZ;
          v = (p.y - bounds.minY) / spanY;
        } else if (ay >= ax && ay >= az) {
          // Top dust cover / upper receiver / under-handguard: keep upper & lower zones coherent
          u = (bounds.maxZ - p.z) / spanZ;
          v = isTopFace
            ? Math.max(0.54, Math.min(0.94, 0.74 + (p.x / spanY) * 0.55))
            : Math.max(0.08, Math.min(0.46, 0.26 + (p.x / spanY) * 0.55));
        } else {
          // Front / rear faces: map X along U at matched vertical density so no edge lines ever smear
          u = 0.50 + (p.x / spanZ);
          v = (p.y - bounds.minY) / spanY;
        }
        uv.setXY(i + k, clampUV(u), clampUV(v));
      }
    }
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    return mesh;
  }

  // ---------- 3D StatTrak™ Glowing Digital LED Kill Counter Module ----------
  function paintStatTrakCanvas(ctx, kills) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 138, 36, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    const digits = String(Math.max(0, Math.min(999999, Math.floor(Number(kills) || 0)))).padStart(6, '0');
    // Subtle dark ghost segments
    ctx.font = 'bold 28px "JetBrains Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 120, 24, 0.14)';
    ctx.fillText('888888', w * 0.5, h * 0.54);
    // Glowing amber LED readout
    ctx.shadowColor = '#ff7b1c';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff9a32';
    ctx.fillText(digits, w * 0.5, h * 0.54);
    ctx.shadowBlur = 0;
  }

  function createStatTrakModule(kills) {
    const grp = new THREE.Group();
    grp.name = 'statTrakModule';
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 0.42, metalness: 0.72 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc96218, roughness: 0.34, metalness: 0.65 });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.0085, 0.0175, 0.038), bodyMat);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.0092, 0.0145, 0.034), trimMat);
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 56;
    const ctx = canvas.getContext('2d');
    paintStatTrakCanvas(ctx, kills);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.031, 0.0115), screenMat);
    screen.rotation.y = -Math.PI / 2;
    screen.position.x = -0.0049;
    grp.add(housing, bezel, screen);
    grp.userData.updateCount = (nextKills) => {
      paintStatTrakCanvas(ctx, nextKills);
      tex.needsUpdate = true;
    };
    return grp;
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
          if (m.emissiveMap) texs.add(m.emissiveMap);
        }
      }
    });
    texs.forEach((t) => t.dispose());
    mats.forEach((m) => m.dispose());
  }

  Object.assign(VI, {
    createStudioEnvMap,
    getProceduralTexSize,
    normalizeGeometryUVs,
    projectWeaponMeshUVs,
    createStatTrakModule,
    buildSharpenedBladeGeometry,
    disposeGroupResources
  });
})(typeof self !== "undefined" ? self : globalThis);
