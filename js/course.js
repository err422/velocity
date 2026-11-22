// COURSE 01 — "THE ASCENT": a long linear time trial along +Z over a void. Falling respawns you at the last gate.
const slab=(x,top,z0,z1,w,mat=concrete)=>addBox(x,top-1,(z0+z1)/2,w,2,z1-z0,mat);   // flat track piece, top surface at y=top
const gateText=(text,x,y,z,color)=>{
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='bold 64px Arial';ctx.textAlign='center';ctx.fillText(text,256,82);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.position.set(x,y,z);s.scale.set(15,3.75,1);levelGroup.add(s);
};
// [x,y,z,radius, optional respawn x,y,z]. All gates face +Z. Respawn is used where the gate hangs over the void.
function buildGates(list){
  const gates=list.map(([x,y,z,r,sx,sy,sz])=>({p:V3(x,y,z),n:V3(0,0,1),r,spawn:sx===undefined?null:V3(sx,sy,sz)}));
  for(const g of gates){
    g.mesh=new THREE.Mesh(new THREE.TorusGeometry(g.r,.14,8,64),new THREE.MeshBasicMaterial({color:0x2b4a5e}));
    g.mesh.position.copy(g.p);levelGroup.add(g.mesh);
  }
  return gates;
}
function buildCourse1(){
  // 1. Start deck, then a ramp up
  slab(0,0,-20,40,24);
  addRamp([0,0,40],[0,8,72],16);
  slab(0,8,72,100,16);
  // 2. Bunny-hop gaps (12 m each)
  for(const z of [112,140,168])slab(0,8,z,z+16,14);
  // 3. Wall-run corridor: no floor, walls 8.5 m apart. Run a wall, wall-jump across, repeat.
  addBox(-5.25,10,232,2,16,80,concrete);addBox(5.25,10,232,2,16,80,concrete);
  slab(0,4,284,300,14);
  // 4. Surf V: the track ends and you DROP into a V of two steep banks (~51 deg, not walkable, no floor).
  //    You can't stand or run in it: you slide along it at your entry speed and air-strafe up the banks to steer.
  //    A walkable exit ramp at the far end carries you back up to the track.
  addRamp([-8,4,360],[0,-6,360],120,cyan);addRamp([8,4,360],[0,-6,360],120,cyan);
  addRamp([0,-6,420],[0,4,452],14);
  // 5. Slide-under bars (1.15 m clearance: you must slide)
  slab(0,4,452,520,14);
  for(const z of [470,490,510])addBox(0,6.15,z,14,2,3,orange);
  // 6. Grapple gap: 32 m of void with a hanging anchor block
  addBox(0,16,536,6,3,6,cyan);
  slab(0,4,552,590,14);
  // 7. Final climb and run-out
  addRamp([0,4,590],[0,12,620],16);
  slab(0,12,620,720,16);
  const gates=buildGates([
    [0,3,8,6],[0,11,86,6],[0,11,120,6],[0,11,176,6],
    [0,10,232,7, 0,8.05,176],[0,7,292,7],
    [0,-1,360,7, 0,4.05,292],[0,3,436,7, 0,-0.95,436],
    [0,7,458,6],[0,7,518,6],
    [0,9,536,9, 0,4.05,516],[0,7,562,6],[0,15,690,8]
  ]);
  gateText('START',0,10,8,'#65e7ff');gateText('FINISH',0,22,690,'#ff9b55');
  return {id:'course1',spawn:V3(0,0,-10),yaw:Math.PI,course:gates,bound:0};
}
