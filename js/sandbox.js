// SANDBOX: the open movement arena (no timer).
function buildSandbox(){
addBox(0,-1,0,190,2,190,floorMat);                       // floor top = y 0
const grid=new THREE.GridHelper(190,76,0x28546a,0x1a3040);grid.position.y=.02;levelGroup.add(grid);
for(let i=-3;i<=3;i++){
  addBox(-94,8,i*28,3,18,25);addBox(94,8,i*28,3,18,25);
  addBox(i*28,8,-94,25,18,3);addBox(i*28,8,94,25,18,3);
}
addBox(0,5,0,15,2,24,concrete);                          // central spine, top y 6
// Platforms
addBox(-26,5,36,18,2,15);addBox(27,8,-36,20,2,18);addBox(0,12,-52,24,2,12);
addBox(0,3,55,24,2,12);addBox(-52,10,0,14,2,22);addBox(52,6,0,14,2,22);
// Ramps: [x,y,z] of each end of the top surface, then width
addRamp([0,0,-36],[0,6,-12],14);   addRamp([0,0,36],[0,6,12],14);
addRamp([-26,0,8],[-26,6,28.5],12);addRamp([27,0,-8],[27,9,-27],14);
addRamp([-24,0,0],[-45,11,0],12);  addRamp([24,0,0],[45,7,0],12);
// Counter-Strike Surf Zone A (North-East): drop-in deck + launch pad -> downhill A-frame CS wedge
addBox(64,15,-74,16,2,14,concrete);                      // top y 16
addBox(64,16.12,-67.1,16,.24,.35,cyan,false);            // drop-in edge guide
addLaunchPad(46,.02,-74);
addSurfWedge([64,15,-64],[64,7.5,-16],{faceWidth:9.5,slopeDeg:50,side:'both',lipEnd:true});

// Counter-Strike Surf Zone B (South-West Curved Circuit): drop-in tower -> downhill wedge -> smooth 75° banked turn
addBox(-68,16,14,15,2,14,concrete);                      // top y 17
addBox(-68,17.12,20.9,15,.24,.35,cyan,false);            // drop-in edge guide
addLaunchPad(-54,.02,14);
addSurfWedge([-68,16,22],[-68,10.5,55],{faceWidth:9.5,slopeDeg:50,side:'both'});
addSurfCurve({start:[-68,10.5,55],yawStart:0,yawDelta:Math.PI*.42,radius:28,pitchDrop:-2.5,segments:10,faceWidth:9.5,slopeDeg:50,side:'both',lipEnd:true});

// Wall-run lanes
addBox(-72,5,-25,2,10,48,concrete);addBox(72,5,25,2,10,48,concrete);
addBox(-15,6,72,36,12,2,concrete);addBox(15,6,-72,36,12,2,concrete);
// Pillars
for(const [x,z,h] of [[-43,-43,14],[43,43,17],[-45,45,10],[45,-45,12],[-8,43,8],[9,-42,9]])addBox(x,h/2,z,5,h,5);
// Launch pads (triggers, not solid)
for(const [x,z] of [[-10,20],[10,-20],[-43,-24],[43,24],[0,66]]){
  addLaunchPad(x,.02,z);
}

  return {id:'sandbox',spawn:V3(0,0,-83),yaw:Math.PI,course:null,bound:91};
}
