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

  Object.assign(VI, {
    createStudioEnvMap,
    getProceduralTexSize,
    normalizeGeometryUVs,
    projectWeaponMeshUVs,
    buildSharpenedBladeGeometry,
    disposeGroupResources
  });
})(typeof self !== "undefined" ? self : globalThis);
