// Collision world + per-level state. Levels add geometry through addBox/addRamp/addRing so it can be cleared on level switch.
let levelGroup=new THREE.Group();scene.add(levelGroup);
let level={id:'',bound:0},course=null,pads=[],bestSplits=[],PB_KEY='',SPL_KEY='',GHOST_PB_KEY='',GHOST_LAST_KEY='';
// ---------- collision world (oriented boxes) ----------
const solidMeshes=[], solids=[];
const raycaster=new THREE.Raycaster();
function registerSolid(m){
  m.updateMatrixWorld(true);
  const g=m.geometry.parameters;
  solids.push({half:V3(g.width/2,g.height/2,g.depth/2),inv:m.matrixWorld.clone().invert(),q:m.quaternion.clone(),box:new THREE.Box3().setFromObject(m)});
  solidMeshes.push(m);
}
function addBox(x,y,z,sx,sy,sz,mat=dark,collide=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;levelGroup.add(m);
  if(collide)registerSolid(m);
  return m;
}
// Ramp defined by the two ends of its top surface, so slopes are exact.
function addRamp(a,b,w,mat=concrete,thick=1.2){
  const A=V3(...a),B=V3(...b),dir=B.clone().sub(A),len=dir.length();dir.divideScalar(len);
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,thick,len),mat);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(dir,V3(),V3(0,1,0)));
  const up=V3(0,1,0).applyQuaternion(m.quaternion);
  m.position.copy(A).add(B).multiplyScalar(.5).addScaledVector(up,-thick/2);
  m.castShadow=true;m.receiveShadow=true;levelGroup.add(m);registerSolid(m);
  return m;
}
function addRing(x,y,z,r=2,color=0x5deaff){
  const m=new THREE.Mesh(new THREE.TorusGeometry(r,.075,8,48),new THREE.MeshBasicMaterial({color}));
  m.position.set(x,y,z);levelGroup.add(m);return m;
}
function addLaunchPad(x,y,z){
  const p=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.22,32),orange);
  p.position.set(x,y,z);levelGroup.add(p);pads.push(p);
  const tor=addRing(x,y+.18,z,2.6,0xffa15d);tor.rotation.x=Math.PI/2;
  return p;
}

