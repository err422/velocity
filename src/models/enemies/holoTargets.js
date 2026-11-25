// Holographic shooting range and gauntlet target 3D mesh builder.
(function (root) {
  'use strict';
  if (!root.THREE || typeof document === 'undefined') return;

  const THREE = root.THREE;
  const VI = root.VelocityInternal || (root.VelocityInternal = {});

  function createHoloTargetMesh(spec, fallbackIndex) {
    const g = new THREE.Group();
    const scale = spec.scale || 1.0;

    // Ground/air projector base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x162432, roughness: 0.45, metalness: 0.72 });
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 0.42 * scale, 8), baseMat);
    pylon.position.y = -1.05 * scale;
    g.add(pylon);

    // Outer holographic target body (clickable/shootable hitbox)
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x3ee8ff,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.76 * scale, 0.76 * scale, 0.14 * scale, 6), bodyMat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.userData.targetRole = 'body';
    g.add(bodyMesh);

    // Outer tactical wireframe ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbef7ff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82 * scale, 0.045 * scale, 8, 6), ringMat);
    g.add(ring);

    // Distinct glowing gold/amber headshot core bullseye
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.20 * scale, 16), headMat);
    headMesh.rotation.x = Math.PI / 2;
    headMesh.position.y = 0.26 * scale;
    headMesh.userData.targetRole = 'head';
    g.add(headMesh);

    g.position.set(spec.x, spec.y, spec.z);
    if (typeof spec.yaw === 'number') g.rotation.y = spec.yaw;

    return {
      id: spec.id || ('tgt_' + (fallbackIndex || 0)),
      group: g,
      bodyMesh,
      headMesh,
      baseX: spec.x,
      baseY: spec.y,
      baseZ: spec.z,
      patrolAxis: spec.patrolAxis || 'x',
      patrolRange: spec.patrolRange || 0,
      patrolSpeed: spec.patrolSpeed || 1.6,
      phase: spec.phase || 0,
      alive: true,
      respawnTimer: 0
    };
  }

  VI.createHoloTargetMesh = createHoloTargetMesh;
})(typeof self !== 'undefined' ? self : globalThis);
