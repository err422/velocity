// COURSE 01 — "THE ASCENT": a long linear time trial along +Z over a void. Falling respawns you at the last gate.
const slab=(x,top,z0,z1,w,mat=concrete)=>addBox(x,top-1,(z0+z1)/2,w,2,z1-z0,mat);   // flat track piece, top surface at y=top
const gateText=(text,x,y,z,color)=>{
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='bold 64px Arial';ctx.textAlign='center';ctx.fillText(text,256,82);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.position.set(x,y,z);s.scale.set(15,3.75,1);levelGroup.add(s);
};
// [x,y,z,radius, optional respawn x,y,z, optional facing nx,nz]. Defaults to facing +Z.
function buildGates(list){
  const gates=list.map(([x,y,z,r,sx,sy,sz,nx,nz])=>{
    const n=nx!==undefined&&nz!==undefined?V3(nx,0,nz).normalize():V3(0,0,1);
    return {p:V3(x,y,z),n,r,spawn:sx===undefined?null:V3(sx,sy,sz)};
  });
  for(const g of gates){
    g.mesh=new THREE.Mesh(new THREE.TorusGeometry(g.r,.14,8,64),new THREE.MeshBasicMaterial({color:0x2b4a5e}));
    g.mesh.position.copy(g.p);
    g.mesh.rotation.y=Math.atan2(g.n.x,g.n.z);
    levelGroup.add(g.mesh);
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
  // 4. Counter-Strike Surf Chain: downhill A-frame speed wedge -> uphill launch flick wedge + forgiving recovery ramp
  addBox(0,4.12,299.8,14,.24,.35,cyan,false);
  addSurfWedge([0,3.6,302],[0,-3.4,358],{faceWidth:10.5,slopeDeg:50,side:'both',lipEnd:true});
  addSurfWedge([0,-3.4,366],[0,3.6,418],{faceWidth:10.5,slopeDeg:50,side:'both',lipEnd:true});
  addRamp([0,-5.5,418],[0,4,452],16);
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
    [0,-1,362,9.5, 0,4.05,292],[0,6.5,436,8.5, 0,4.05,292],
    [0,7,458,6],[0,7,518,6],
    [0,9,536,9, 0,4.05,516],[0,7,562,6],[0,15,690,8]
  ]);
  gateText('START',0,10,8,'#65e7ff');gateText('FINISH',0,22,690,'#ff9b55');
  return {id:'course1',spawn:V3(0,0,-10),yaw:Math.PI,course:gates,bound:0};
}

// SURF 01 — "SKYLINE DRIFT": dedicated Counter-Strike linear multi-ramp surf map.
function buildSurfMap1(){
  // Stage 0: Elevated Skyline Drop-In Start Deck (y = 48)
  slab(0,48,-14,12,22,concrete);
  addBox(0,48.12,11.8,22,.24,.4,cyan,false);
  addBox(-11.4,49.5,-1,0.8,3,26,dark);
  addBox(11.4,49.5,-1,0.8,3,26,dark);

  // Stage 1: Opening Downhill Speed Wedge -> Twin Symmetrical Spine Transfer Wedges
  addSurfWedge([0,47.5,14],[0,36,78],{faceWidth:11.5,slopeDeg:50,side:'both',lipEnd:true});
  addSurfWedge([11,35,88],[11,26,144],{faceWidth:11.5,slopeDeg:50,side:'both',lipEnd:true});
  addSurfWedge([-11,35,88],[-11,26,144],{faceWidth:11.5,slopeDeg:50,side:'both',lipEnd:true});

  // Transfer Deck A (Checkpoint 1, y = 22)
  slab(0,22,152,180,28,concrete);
  addBox(0,22.12,179.8,28,.24,.4,cyan,false);

  // Stage 2: Smooth 60° Curved Banked Left Sweep (+X)
  const curveLeft=addSurfCurve({
    start:[0,21,182],
    yawStart:0,
    yawDelta:Math.PI/3,
    radius:72,
    pitchDrop:-10,
    segments:12,
    faceWidth:12,
    slopeDeg:50,
    side:'both',
    lipEnd:true
  });
  const midLeftSeg=curveLeft.curve.segments[6];
  const midLeftPt=midLeftSeg.a;
  const midLeftNx=Math.sin(midLeftSeg.yawStart);
  const midLeftNz=Math.cos(midLeftSeg.yawStart);

  // Stage 3: S-Curve Reversal Sweep (60° Right Turn back to +Z)
  const e1=curveLeft.curve.end;
  const t1=curveLeft.curve.endTangent;
  const gap1=12;
  const curveRightStart=[e1[0]+t1[0]*gap1,e1[1]-1,e1[2]+t1[2]*gap1];
  const curveRight=addSurfCurve({
    start:curveRightStart,
    yawStart:Math.PI/3,
    yawDelta:-Math.PI/3,
    radius:72,
    pitchDrop:-9,
    segments:12,
    faceWidth:12,
    slopeDeg:50,
    side:'both',
    lipEnd:true
  });

  // Transfer Deck B (Checkpoint 2, aligned with curveRight end)
  const e2=curveRight.curve.end;
  const deckX=e2[0];
  const deckZ0=Math.round(e2[2])+7;
  const deckZ1=deckZ0+28;
  const deckY=-3;
  slab(deckX,deckY,deckZ0,deckZ1,28,concrete);
  addBox(deckX,deckY+.12,deckZ1-.2,28,.24,.4,cyan,false);

  // Stage 4: Steep Downhill Speed Drop -> Uphill Boost Flick Launch
  const dropZ0=deckZ1+2;
  const dropZ1=dropZ0+58;
  addSurfWedge([deckX,-4,dropZ0],[deckX,-15,dropZ1],{faceWidth:12,slopeDeg:50,side:'both'});
  const launchZ1=dropZ1+48;
  addSurfWedge([deckX,-15,dropZ1-.5],[deckX,-9,launchZ1],{faceWidth:12,slopeDeg:50,side:'both',lipEnd:true});

  // Stage 5: Final Sweeping Glide Wedge & Finish Deck
  const glideZ0=launchZ1+18;
  const glideZ1=glideZ0+62;
  addSurfWedge([deckX,-8,glideZ0],[deckX,-13,glideZ1],{faceWidth:12.5,slopeDeg:50,side:'both',lipEnd:true});
  const finZ0=glideZ1+6;
  const finZ1=finZ0+76;
  const finY=-15;
  slab(deckX,finY,finZ0,finZ1,28,concrete);
  // Subtle skyline finish framing pylons
  addBox(deckX-13,finY+8,finZ0+36,1.6,16,1.6,orange,false);
  addBox(deckX+13,finY+8,finZ0+36,1.6,16,1.6,orange,false);
  addBox(deckX,finY+16,finZ0+36,27.6,1.4,1.6,orange,false);

  const gates=buildGates([
    [0,51,6,6.5],
    [0,26,166,9.5],
    [midLeftPt[0],midLeftPt[1]+2,midLeftPt[2],11, 0,22.05,166, midLeftNx,midLeftNz],
    [deckX,deckY+4,deckZ0+14,9.5],
    [deckX,-5,launchZ1+9,11.5, deckX,deckY+.05,deckZ0+14],
    [deckX,finY+4,finZ0+36,10]
  ]);
  gateText('START',0,58,6,'#65e7ff');
  gateText('FINISH',deckX,finY+11,finZ0+36,'#ff9b55');

  return {
    id:'surf1',
    spawn:V3(0,48,-8),
    yaw:Math.PI,
    course:gates,
    bound:0,
    killY:-42,
    surfHint:true
  };
}

