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
  const gauntletTargets=[
    {id:'c1_t1',x:-5.5,y:11.2,z:82,yaw:Math.PI,scale:1.15},
    {id:'c1_t2',x:5.2,y:11.0,z:148,yaw:Math.PI,scale:1.15},
    {id:'c1_t3',x:0,y:12.6,z:254,yaw:Math.PI,scale:1.2,patrolAxis:'x',patrolRange:2.8,patrolSpeed:2.1,phase:0.5},
    {id:'c1_t4',x:-7.5,y:2.2,z:344,yaw:Math.PI,scale:1.3},
    {id:'c1_t5',x:5.5,y:6.8,z:482,yaw:Math.PI,scale:1.15},
    {id:'c1_t6',x:0,y:15.5,z:648,yaw:Math.PI,scale:1.25,patrolAxis:'x',patrolRange:4.5,patrolSpeed:2.0,phase:1.4}
  ];
  return {id:'course1',spawn:V3(0,0,-10),yaw:Math.PI,course:gates,bound:0,targetMode:'gauntlet',targets:gauntletTargets};
}

// SURF 01 — "SKYLINE DRIFT": a dedicated linear surf run built around one-sided banks,
// long air transfers, sweeping S-curves, and checkpoints that preserve the route's momentum.
function buildSurfMap1(){
  const slope = 50;
  const faceWidth = 14.5;
  const pylon = (x, baseY, z, height=18) => {
    addBox(x,baseY+height/2,z,1.35,height,1.35,dark,false);
    addBox(x,baseY+height,z,2.5,.35,2.5,orange,false);
  };
  const startY = 60;
  slab(0,startY,-24,16,30,concrete);
  addBox(0,startY+.12,15,30,.24,.45,cyan,false);
  addBox(-15,startY+1.5,-4,1,3,32,dark,false);
  addBox(15,startY+1.5,-4,1,3,32,dark,false);
  pylon(-20,startY,-10,22);
  pylon(20,startY,-10,22);
  addSurfWedge([0,59.5,18],[0,52,120],{faceWidth,slopeDeg:slope,side:'left',lipStart:true,lipEnd:true});
  const deckAY = 40.5;
  slab(0,deckAY,126,158,34,concrete);
  addBox(0,deckAY+.12,157.8,34,.24,.45,cyan,false);
  pylon(-22,deckAY,142,17);
  pylon(22,deckAY,142,17);
  const curveA = addSurfCurve({start:[0,40,160],yawStart:0,yawDelta:Math.PI/3,radius:62,pitchDrop:-4,segments:14,faceWidth,slopeDeg:slope,side:'left',lipStart:true,lipEnd:true});
  const curveAEnd = curveA.curve.end;
  const curveAForward = curveA.curve.endTangent;
  const curveBStart = [curveAEnd[0]+curveAForward[0]*8,curveAEnd[1]-.4,curveAEnd[2]+curveAForward[2]*8];
  const curveB = addSurfCurve({start:curveBStart,yawStart:Math.PI/3,yawDelta:-Math.PI/3,radius:62,pitchDrop:-4,segments:14,faceWidth,slopeDeg:slope,side:'left',lipStart:true,lipEnd:true});
  const curveBEnd = curveB.curve.end;
  const deckBX = curveBEnd[0];
  const deckBY = curveBEnd[1]-11.6;
  const deckBZ0 = Math.round(curveBEnd[2])+6;
  const deckBZ1 = deckBZ0+34;
  slab(deckBX,deckBY,deckBZ0,deckBZ1,36,concrete);
  addBox(deckBX,deckBY+.12,deckBZ1-.2,36,.24,.45,cyan,false);
  pylon(deckBX-24,deckBY,deckBZ0+17,18);
  pylon(deckBX+24,deckBY,deckBZ0+17,18);
  const wallBStart = deckBZ1+6;
  const wallBEnd = wallBStart+100;
  addSurfWedge([deckBX,deckBY-.5,wallBStart],[deckBX,deckBY-8,wallBEnd],{faceWidth,slopeDeg:slope,side:'right',lipStart:true,lipEnd:true});
  const deckCY = 1.2;
  const deckCZ0 = wallBEnd+6;
  const deckCZ1 = deckCZ0+32;
  slab(deckBX,deckCY,deckCZ0,deckCZ1,36,concrete);
  addBox(deckBX,deckCY+.12,deckCZ1-.2,36,.24,.45,cyan,false);
  pylon(deckBX-24,deckCY,deckCZ0+16,17);
  pylon(deckBX+24,deckCY,deckCZ0+16,17);
  const curveC = addSurfCurve({start:[deckBX,deckCY-.4,deckCZ1+2],yawStart:0,yawDelta:-Math.PI/3,radius:54,pitchDrop:-4,segments:14,faceWidth,slopeDeg:slope,side:'right',lipStart:true,lipEnd:true});
  const curveCEnd = curveC.curve.end;
  const curveCForward = curveC.curve.endTangent;
  const curveDStart = [curveCEnd[0]+curveCForward[0]*8,curveCEnd[1]-.4,curveCEnd[2]+curveCForward[2]*8];
  const curveD = addSurfCurve({start:curveDStart,yawStart:-Math.PI/3,yawDelta:Math.PI/3,radius:54,pitchDrop:-4,segments:14,faceWidth,slopeDeg:slope,side:'right',lipStart:true,lipEnd:true});
  const curveDEnd = curveD.curve.end;
  const deckDX = curveDEnd[0];
  const deckDY = curveDEnd[1]-11.6;
  const deckDZ0 = Math.round(curveDEnd[2])+6;
  const deckDZ1 = deckDZ0+34;
  slab(deckDX,deckDY,deckDZ0,deckDZ1,36,concrete);
  addBox(deckDX,deckDY+.12,deckDZ1-.2,36,.24,.45,cyan,false);
  pylon(deckDX-24,deckDY,deckDZ0+17,18);
  pylon(deckDX+24,deckDY,deckDZ0+17,18);
  const finalStart = deckDZ1+6;
  const finalEnd = finalStart+100;
  addSurfWedge([deckDX,deckDY-.5,finalStart],[deckDX,deckDY-7,finalEnd],{faceWidth,slopeDeg:slope,side:'left',lipStart:true,lipEnd:true});
  const finishY = deckDY-18.1;
  const finishZ0 = finalEnd+6;
  const finishZ1 = finishZ0+60;
  slab(deckDX,finishY,finishZ0,finishZ1,36,concrete);
  addBox(deckDX,finishY+.12,finishZ0+.2,36,.24,.45,cyan,false);
  pylon(deckDX-24,finishY,finishZ0+30,23);
  pylon(deckDX+24,finishY,finishZ0+30,23);
  addBox(deckDX,finishY+23,finishZ0+30,46,.7,1.2,orange,false);
  const gates=buildGates([
    [0,63,5,7.5],
    [0,42,142,12,0,deckAY+.05,132],
    [deckBX,deckBY+2,deckBZ0+17,13,deckBX,deckBY+.05,deckBZ0+7],
    [deckBX,deckCY+2,deckCZ0+16,13,deckBX,deckCY+.05,deckCZ0+6],
    [deckDX,deckDY+2,deckDZ0+17,13,deckDX,deckDY+.05,deckDZ0+7],
    [deckDX,finishY+2,finishZ0+30,12]
  ]);
  gateText('START',0,68,5,'#65e7ff');
  gateText('CHECKPOINT A',0,49,142,'#65e7ff');
  gateText('CHECKPOINT B',deckBX,deckBY+8,deckBZ0+17,'#65e7ff');
  gateText('CHECKPOINT C',deckBX,deckCY+8,deckCZ0+16,'#65e7ff');
  gateText('CHECKPOINT D',deckDX,deckDY+8,deckDZ0+17,'#65e7ff');
  gateText('FINISH',deckDX,finishY+12,finishZ0+30,'#ff9b55');
  return {id:'surf1',spawn:V3(0,startY,-8),yaw:Math.PI,course:gates,bound:0,killY:-42,surfHint:true};
}
