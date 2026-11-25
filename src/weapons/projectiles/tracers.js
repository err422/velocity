// Pooled 3D hitscan tracer beams and impact/shatter spark particles.
(function (root) {
  'use strict';
  if (!root.THREE || typeof document === 'undefined') return;

  const THREE = root.THREE;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});

  function createCombatFxPool(fxGroup, opts) {
    const o = opts || {};
    const tracerPoolSize = o.tracerPoolSize || 42;
    const sparkPoolSize = o.sparkPoolSize || 96;
    const tracers = [];
    const sparks = [];
    let tracerCursor = 0;
    let sparkCursor = 0;
    const _tmpA = new THREE.Vector3();

    const tGeo = new THREE.BoxGeometry(0.028, 0.028, 1);
    for (let i = 0; i < tracerPoolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.9, depthWrite: false });
      const mesh = new THREE.Mesh(tGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      fxGroup.add(mesh);
      tracers.push({ mesh, life: 0, maxLife: 0.09 });
    }

    const sGeo = new THREE.OctahedronGeometry(0.09, 0);
    for (let i = 0; i < sparkPoolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x65e7ff, transparent: true, opacity: 0.95, depthWrite: false });
      const mesh = new THREE.Mesh(sGeo, mat);
      mesh.visible = false;
      fxGroup.add(mesh);
      sparks.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.35 });
    }

    function spawnTracer(startPos, endPos, colorHex) {
      if (!tracers.length) return;
      const t = tracers[tracerCursor];
      tracerCursor = (tracerCursor + 1) % tracerPoolSize;
      _tmpA.copy(endPos).sub(startPos);
      const len = _tmpA.length();
      if (len < 0.05) return;
      t.mesh.position.copy(startPos).addScaledVector(_tmpA, 0.5);
      t.mesh.scale.set(1, 1, len);
      t.mesh.lookAt(endPos);
      t.mesh.material.color.setHex(colorHex || 0xffe49c);
      t.mesh.material.opacity = 0.92;
      t.mesh.visible = true;
      t.life = 0.095;
      t.maxLife = 0.095;
    }

    function spawnBurst(pos, colorHex, count = 8, speed = 6.5) {
      if (!sparks.length) return;
      for (let i = 0; i < count; i++) {
        const s = sparks[sparkCursor];
        sparkCursor = (sparkCursor + 1) % sparkPoolSize;
        s.mesh.position.copy(pos);
        const a = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.25) * Math.PI;
        const spd = speed * (0.45 + Math.random() * 0.75);
        s.vel.set(Math.cos(a) * Math.cos(elev) * spd, Math.sin(elev) * spd + 1.8, Math.sin(a) * Math.cos(elev) * spd);
        s.mesh.material.color.setHex(colorHex || 0x65e7ff);
        s.mesh.material.opacity = 0.95;
        s.mesh.scale.setScalar(0.65 + Math.random() * 0.8);
        s.mesh.visible = true;
        s.life = 0.26 + Math.random() * 0.16;
        s.maxLife = s.life;
      }
    }

    function update(dt) {
      for (let i = 0; i < tracers.length; i++) {
        const t = tracers[i];
        if (t.life > 0) {
          t.life -= dt;
          if (t.life <= 0) {
            t.mesh.visible = false;
          } else {
            t.mesh.material.opacity = (t.life / t.maxLife) * 0.92;
          }
        }
      }
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        if (s.life > 0) {
          s.life -= dt;
          if (s.life <= 0) {
            s.mesh.visible = false;
          } else {
            s.vel.y -= 16 * dt;
            s.mesh.position.addScaledVector(s.vel, dt);
            s.mesh.material.opacity = s.life / s.maxLife;
          }
        }
      }
    }

    return { spawnTracer, spawnBurst, update };
  }

  VI.createCombatFxPool = createCombatFxPool;
})(typeof self !== 'undefined' ? self : globalThis);
