// Collision world + per-level state. Levels add geometry through addBox/addRamp/addRing so it can be cleared on level switch.
let levelGroup=new THREE.Group();scene.add(levelGroup);
let level={id:'',bound:0},course=null,pads=[],bestSplits=[],PB_KEY='',SPL_KEY='',GHOST_PB_KEY='',GHOST_LAST_KEY='';
// ---------- collision world (oriented boxes) ----------
const solidMeshes=[], solids=[];
const raycaster=new THREE.Raycaster();
function registerSolid(m,extra){
  m.updateMatrixWorld(true);
  const g=m.geometry.parameters;
  solids.push({
    half:V3(g.width/2,g.height/2,g.depth/2),
    inv:m.matrixWorld.clone().invert(),
    q:m.quaternion.clone(),
    box:new THREE.Box3().setFromObject(m),
    isSurf:!!(extra&&extra.isSurf),
    surfNormal:extra&&extra.surfNormal?extra.surfNormal.clone():null
  });
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
// Scales top-face (+Y) UVs of a BoxGeometry so shared surfMat tiles uniformly without stretching.
function scaleBoxTopUVs(geom,uScale,vScale){
  const uv=geom.attributes.uv;
  if(!uv)return;
  // BoxGeometry +Y face occupies vertices 8..11
  for(let i=8;i<12;i++){
    uv.setXY(i,uv.getX(i)*uScale,uv.getY(i)*vScale);
  }
  uv.needsUpdate=true;
}
// Composite Counter-Strike A-frame surf wedge (angled 50° faces + glowing cyan crest spine + structural keel + optional lip trim).
function addSurfWedge(a,b,opts){
  const o=opts||{};
  const frame=SurfEngine.computeWedgeFrame(a,b,o);
  const faceMat=o.mat||surfMat;
  const created=[];

  for(const f of frame.faces){
    const geom=new THREE.BoxGeometry(f.width,f.thick,f.length);
    scaleBoxTopUVs(geom,f.width/4.5,f.length/6.5);
    const m=new THREE.Mesh(geom,faceMat);
    const basis=new THREE.Matrix4().makeBasis(
      V3(f.xAxis.x,f.xAxis.y,f.xAxis.z),
      V3(f.yAxis.x,f.yAxis.y,f.yAxis.z),
      V3(f.zAxis.x,f.zAxis.y,f.zAxis.z)
    );
    m.quaternion.setFromRotationMatrix(basis);
    m.position.set(f.center.x,f.center.y,f.center.z);
    m.castShadow=true;m.receiveShadow=true;
    levelGroup.add(m);
    registerSolid(m,{isSurf:true,surfNormal:V3(f.normal.x,f.normal.y,f.normal.z)});
    created.push(m);
  }

  // Right-handed visual basis aligned with the ramp spine: X = -sideR, Y = upPerp, Z = F (det = +1)
  const spineBasis=new THREE.Matrix4().makeBasis(
    V3(-frame.sideR.x,-frame.sideR.y,-frame.sideR.z),
    V3(frame.upPerp.x,frame.upPerp.y,frame.upPerp.z),
    V3(frame.F.x,frame.F.y,frame.F.z)
  );
  const spineQ=new THREE.Quaternion().setFromRotationMatrix(spineBasis);

  // Glowing cyan crest rail along the top spine ridge (non-colliding visual sightline)
  if(o.spine!==false){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.34,.22,frame.length),cyan);
    rail.quaternion.copy(spineQ);
    rail.position.set(
      frame.mid.x+frame.upPerp.x*.04,
      frame.mid.y+frame.upPerp.y*.04,
      frame.mid.z+frame.upPerp.z*.04
    );
    levelGroup.add(rail);
  }

  // Architectural underside triangular prism core giving solid monolith weight (strictly recessed inside the 50° faces)
  if(o.keel!==false){
    const slopeRad=(frame.slopeDeg*Math.PI)/180;
    const yInset=frame.thick/Math.cos(slopeRad)+.18;
    const triH=frame.dropH-yInset;
    if(triH>.35){
      const innerHalf=Math.max(.35,triH/Math.tan(slopeRad)-.12);
      const xLeft=o.side==='right'?0:innerHalf;
      const xRight=o.side==='left'?0:-innerHalf;
      const shape=new THREE.Shape();
      shape.moveTo(0,-yInset);
      shape.lineTo(xLeft,-frame.dropH);
      shape.lineTo(xRight,-frame.dropH);
      shape.closePath();
      const depth=Math.max(.4,frame.length-.08);
      const keelGeo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
      keelGeo.translate(0,0,-depth*.5);
      const keel=new THREE.Mesh(keelGeo,surfUnderMat);
      keel.quaternion.copy(spineQ);
      keel.position.set(frame.mid.x,frame.mid.y,frame.mid.z);
      keel.receiveShadow=true;
      levelGroup.add(keel);
    }
  }

  // Optional warm orange launch/entry lip accents along the ramp edges
  if(o.lipEnd||o.lipStart){
    const addLipAt=(endSign)=>{
      for(const f of frame.faces){
        const lip=new THREE.Mesh(new THREE.BoxGeometry(f.width,.16,.55),orange);
        const basis=new THREE.Matrix4().makeBasis(
          V3(f.xAxis.x,f.xAxis.y,f.xAxis.z),
          V3(f.yAxis.x,f.yAxis.y,f.yAxis.z),
          V3(f.zAxis.x,f.zAxis.y,f.zAxis.z)
        );
        lip.quaternion.setFromRotationMatrix(basis);
        const zOff=endSign*(f.length*.5-.28);
        lip.position.set(
          f.center.x+f.zAxis.x*zOff+f.normal.x*(f.thick*.5+.02),
          f.center.y+f.zAxis.y*zOff+f.normal.y*(f.thick*.5+.02),
          f.center.z+f.zAxis.z*zOff+f.normal.z*(f.thick*.5+.02)
        );
        levelGroup.add(lip);
      }
    };
    if(o.lipStart)addLipAt(-1);
    if(o.lipEnd)addLipAt(1);
  }

  return {frame,meshes:created};
}
// Smooth multi-segment curved banked CS surf ramp with seam overlap and analytical normals.
function addSurfCurve(opts){
  const o=opts||{};
  const curve=SurfEngine.computeCurveSegments(o);
  const segResults=[];
  for(const seg of curve.segments){
    segResults.push(addSurfWedge(seg.a,seg.b,{
      faceWidth:o.faceWidth,
      slopeDeg:o.slopeDeg,
      thick:o.thick,
      side:o.side||'both',
      mat:o.mat,
      extendStart:seg.extendStart,
      extendEnd:seg.extendEnd,
      lipStart:seg.lipStart,
      lipEnd:seg.lipEnd,
      spine:o.spine,
      keel:o.keel
    }));
  }
  return {curve,segments:segResults};
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


