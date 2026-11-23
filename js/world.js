// Collision world + per-level state + reusable CS surf piece builders.
// Supports both live playable world (collidable) and isolated preview scene builds (visual-only).
let levelGroup=new THREE.Group();scene.add(levelGroup);
let level={id:'',bound:0},course=null,pads=[],boosters=[],teleporters=[],failZones=[],bestSplits=[],PB_KEY='',SPL_KEY='',GHOST_PB_KEY='',GHOST_LAST_KEY='';
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

// Scales top-face (+Y) UVs of a BoxGeometry so shared surf materials tile uniformly without stretching.
function scaleBoxTopUVs(geom,uScale,vScale){
  const uv=geom.attributes.uv;
  if(!uv)return;
  for(let i=8;i<12;i++){
    uv.setXY(i,uv.getX(i)*uScale,uv.getY(i)*vScale);
  }
  uv.needsUpdate=true;
}

/**
 * Creates a self-contained world builder bound either to the live playable levelGroup
 * (collide=true) or to an isolated preview THREE.Group (collide=false, no mutation of game globals).
 */
function createWorldBuilder(opts){
  const o=opts||{};
  const group=o.group||levelGroup;
  const allowCollide=o.collide!==false;
  const isPreview=!!o.isPreview;
  const theme=getSurfTheme(o.theme||'slate',isPreview);
  const tm=theme.mats;

  function addBox(x,y,z,sx,sy,sz,mat=tm.dark,collide=true){
    const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    m.position.set(x,y,z);
    if(!isPreview){m.castShadow=true;m.receiveShadow=true;}
    group.add(m);
    if(allowCollide&&collide)registerSolid(m);
    return m;
  }

  function slab(x,top,z0,z1,w,mat=tm.deck){
    return addBox(x,top-1,(z0+z1)/2,w,2,z1-z0,mat,true);
  }

  function addDeck(x,top,z,w,d,mat=tm.deck){
    return addBox(x,top-1,z,w,2,d,mat,true);
  }

  function addRamp(a,b,w,mat=tm.deck,thick=1.2){
    const A=V3(...a),B=V3(...b),dir=B.clone().sub(A),len=dir.length();dir.divideScalar(len);
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,thick,len),mat);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(dir,V3(),V3(0,1,0)));
    const up=V3(0,1,0).applyQuaternion(m.quaternion);
    m.position.copy(A).add(B).multiplyScalar(.5).addScaledVector(up,-thick/2);
    if(!isPreview){m.castShadow=true;m.receiveShadow=true;}
    group.add(m);
    if(allowCollide)registerSolid(m);
    return m;
  }

  // Composite Counter-Strike A-frame / one-sided surf wedge
  function addSurfWedge(a,b,wOpts){
    const wo=wOpts||{};
    const frame=SurfEngine.computeWedgeFrame(a,b,wo);
    const faceMat=wo.mat||tm.ramp;
    const spineMat=wo.spineMat||tm.accent;
    const lipMat=wo.lipMat||tm.lip;
    const keelMat=wo.keelMat||tm.under;
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
      if(!isPreview){m.castShadow=true;m.receiveShadow=true;}
      group.add(m);
      if(allowCollide)registerSolid(m,{isSurf:true,surfNormal:V3(f.normal.x,f.normal.y,f.normal.z)});
      created.push(m);
    }

    const spineBasis=new THREE.Matrix4().makeBasis(
      V3(-frame.sideR.x,-frame.sideR.y,-frame.sideR.z),
      V3(frame.upPerp.x,frame.upPerp.y,frame.upPerp.z),
      V3(frame.F.x,frame.F.y,frame.F.z)
    );
    const spineQ=new THREE.Quaternion().setFromRotationMatrix(spineBasis);

    if(wo.spine!==false){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.34,.22,frame.length),spineMat);
      rail.quaternion.copy(spineQ);
      rail.position.set(
        frame.mid.x+frame.upPerp.x*.04,
        frame.mid.y+frame.upPerp.y*.04,
        frame.mid.z+frame.upPerp.z*.04
      );
      group.add(rail);
    }

    if(wo.keel!==false){
      const slopeRad=(frame.slopeDeg*Math.PI)/180;
      const yInset=frame.thick/Math.cos(slopeRad)+.18;
      const triH=frame.dropH-yInset;
      if(triH>.35){
        const innerHalf=Math.max(.35,triH/Math.tan(slopeRad)-.12);
        const xLeft=wo.side==='right'?0:innerHalf;
        const xRight=wo.side==='left'?0:-innerHalf;
        const shape=new THREE.Shape();
        shape.moveTo(0,-yInset);
        shape.lineTo(xLeft,-frame.dropH);
        shape.lineTo(xRight,-frame.dropH);
        shape.closePath();
        const depth=Math.max(.4,frame.length-.08);
        const keelGeo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
        keelGeo.translate(0,0,-depth*.5);
        const keel=new THREE.Mesh(keelGeo,keelMat);
        keel.quaternion.copy(spineQ);
        keel.position.set(frame.mid.x,frame.mid.y,frame.mid.z);
        if(!isPreview)keel.receiveShadow=true;
        group.add(keel);
      }
    }

    if(wo.lipEnd||wo.lipStart){
      const addLipAt=(endSign)=>{
        for(const f of frame.faces){
          const lip=new THREE.Mesh(new THREE.BoxGeometry(f.width,.16,.55),lipMat);
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
          group.add(lip);
        }
      };
      if(wo.lipStart)addLipAt(-1);
      if(wo.lipEnd)addLipAt(1);
    }

    return {frame,meshes:created};
  }

  function addSurfCurve(cOpts){
    const co=cOpts||{};
    const curve=SurfEngine.computeCurveSegments(co);
    const segResults=[];
    for(const seg of curve.segments){
      segResults.push(addSurfWedge(seg.a,seg.b,{
        faceWidth:co.faceWidth,
        slopeDeg:co.slopeDeg,
        thick:co.thick,
        side:co.side||'both',
        mat:co.mat,
        spineMat:co.spineMat,
        lipMat:co.lipMat,
        keelMat:co.keelMat,
        extendStart:seg.extendStart,
        extendEnd:seg.extendEnd,
        lipStart:seg.lipStart,
        lipEnd:seg.lipEnd,
        spine:co.spine,
        keel:co.keel
      }));
    }
    return {curve,segments:segResults};
  }

  // Multi-turn helical corkscrew spiral ramp
  function addSurfSpiral(sOpts){
    const so=sOpts||{};
    const spiral=SurfEngine.computeSpiralSegments(so);
    const segResults=[];
    for(const seg of spiral.segments){
      segResults.push(addSurfWedge(seg.a,seg.b,{
        faceWidth:so.faceWidth||12,
        slopeDeg:so.slopeDeg||52,
        thick:so.thick,
        side:so.side||'both',
        mat:so.mat,
        spineMat:so.spineMat,
        lipMat:so.lipMat,
        keelMat:so.keelMat,
        extendStart:seg.extendStart,
        extendEnd:seg.extendEnd,
        lipStart:seg.lipStart,
        lipEnd:seg.lipEnd,
        spine:so.spine,
        keel:so.keel
      }));
    }
    if(so.centerPillar!==false){
      const h=Math.abs(so.pitchDrop||28)+26;
      const r=Math.max(2.2,Math.min(5.5,(so.radiusStart||38)*0.12));
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,h,10),tm.dark);
      pillar.position.set(spiral.center[0],spiral.center[1],spiral.center[2]);
      group.add(pillar);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*1.35,r*1.35,0.6,10),tm.accent);
      cap.position.set(spiral.center[0],spiral.center[1]+h*0.5,spiral.center[2]);
      group.add(cap);
    }
    return {spiral,segments:segResults};
  }

  // Classic Counter-Strike S-curve banked chicane
  function addSurfSCurve(scOpts){
    const sco=scOpts||{};
    const sc=SurfEngine.computeSCurveSegments(sco);
    const firstSide=sco.firstSide||(sco.yawDelta>=0?'left':'right');
    const secondSide=sco.secondSide||(sco.bothSides?'both':(firstSide==='left'?'right':'left'));
    const buildArc=(arc,side)=>arc.segments.map(seg=>addSurfWedge(seg.a,seg.b,{
      faceWidth:sco.faceWidth||13,
      slopeDeg:sco.slopeDeg||50,
      thick:sco.thick,
      side:sco.side||side,
      mat:sco.mat,
      extendStart:seg.extendStart,
      extendEnd:seg.extendEnd,
      lipStart:seg.lipStart,
      lipEnd:seg.lipEnd,
      spine:sco.spine,
      keel:sco.keel
    }));
    const segA=buildArc(sc.first,firstSide);
    const segB=buildArc(sc.second,secondSide);
    return {scurve:sc,segments:segA.concat(segB)};
  }

  // Twin opposing inward-facing surf walls (V-trough canyon / half-pipe tunnel)
  function addSurfChannel(a,b,chOpts){
    const cho=chOpts||{};
    const ch=SurfEngine.computeChannelSegments(a,b,cho);
    const left=addSurfWedge(ch.leftWall.a,ch.leftWall.b,{
      faceWidth:ch.faceWidth,slopeDeg:ch.slopeDeg,side:'right',mat:cho.mat,
      lipStart:cho.lipStart,lipEnd:cho.lipEnd,spine:cho.spine,keel:cho.keel
    });
    const right=addSurfWedge(ch.rightWall.a,ch.rightWall.b,{
      faceWidth:ch.faceWidth,slopeDeg:ch.slopeDeg,side:'left',mat:cho.mat,
      lipStart:cho.lipStart,lipEnd:cho.lipEnd,spine:cho.spine,keel:cho.keel
    });
    // Optional architectural overhead tunnel ribs (non-colliding sightlines)
    if(cho.ribs){
      const ribCount=Math.max(2,Math.floor(cho.ribs));
      const ribSpan=ch.halfGap*2+1.2;
      const yaw=Math.atan2(ch.F.x,ch.F.z);
      for(let i=0;i<ribCount;i++){
        const t=(i+0.5)/ribCount;
        const rx=a[0]+(b[0]-a[0])*t;
        const ry=a[1]+(b[1]-a[1])*t;
        const rz=a[2]+(b[2]-a[2])*t;
        const arch=new THREE.Group();
        arch.position.set(rx,ry,rz);
        arch.rotation.y=yaw;
        const topBeam=new THREE.Mesh(new THREE.BoxGeometry(ribSpan+1.6,0.9,1.2),tm.dark);
        topBeam.position.set(0,8.5,0);
        arch.add(topBeam);
        const neonBar=new THREE.Mesh(new THREE.BoxGeometry(ribSpan-1.2,0.28,0.42),tm.accent);
        neonBar.position.set(0,7.9,0);
        arch.add(neonBar);
        for(const s of [-1,1]){
          const post=new THREE.Mesh(new THREE.BoxGeometry(1.1,9.0,1.2),tm.dark);
          post.position.set(s*(ch.halfGap+0.4),4.0,0);
          arch.add(post);
        }
        group.add(arch);
      }
    }
    return {channel:ch,left,right};
  }

  // Upward CS surf launch flick ramp
  function addSurfFlick(fOpts){
    const fo=fOpts||{};
    const spec=SurfEngine.computeFlickSpec(fo);
    const res=addSurfWedge(spec.a,spec.b,{
      faceWidth:spec.faceWidth,
      slopeDeg:spec.slopeDeg,
      side:spec.side,
      mat:fo.mat,
      lipStart:fo.lipStart!==false,
      lipEnd:true,
      spine:fo.spine,
      keel:fo.keel
    });
    return {spec,wedge:res};
  }

  function addRing(x,y,z,r=2,color=0x5deaff){
    const m=new THREE.Mesh(new THREE.TorusGeometry(r,.075,8,48),new THREE.MeshBasicMaterial({color}));
    m.position.set(x,y,z);group.add(m);return m;
  }

  function addLaunchPad(x,y,z){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.22,32),tm.lip);
    p.position.set(x,y,z);group.add(p);
    if(allowCollide)pads.push(p);
    const tor=addRing(x,y+.18,z,2.6,theme.spec.lipHex);tor.rotation.x=Math.PI/2;
    return p;
  }

  // Composite directional CS surf speed boost ring (trigger_push equivalent)
  function addBoostRing(pos,dir,bOpts){
    const bo=bOpts||{};
    const radius=bo.radius||6.0;
    const dVec=V3(dir[0],dir[1],dir[2]).normalize();
    const ringGroup=new THREE.Group();
    ringGroup.position.set(pos[0],pos[1],pos[2]);
    ringGroup.quaternion.setFromUnitVectors(V3(0,0,1),dVec);

    const outer=new THREE.Mesh(new THREE.TorusGeometry(radius,0.34,8,28),tm.dark);
    ringGroup.add(outer);
    const glow=new THREE.Mesh(new THREE.TorusGeometry(radius-0.42,0.16,8,28),tm.lip);
    ringGroup.add(glow);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(radius-0.85,0.08,6,24),tm.accent);
    inner.position.z=0.35;
    ringGroup.add(inner);
    for(let k=0;k<4;k++){
      const ang=(k*Math.PI)/2;
      const fin=new THREE.Mesh(new THREE.BoxGeometry(0.45,1.2,1.6),tm.lip);
      fin.position.set(Math.cos(ang)*(radius+0.35),Math.sin(ang)*(radius+0.35),0);
      fin.rotation.z=ang+Math.PI/2;
      ringGroup.add(fin);
    }
    group.add(ringGroup);

    if(allowCollide){
      boosters.push({
        pos:V3(pos[0],pos[1],pos[2]),
        dir:dVec,
        radius:radius+0.8,
        speedBoost:bo.speedBoost!=null?bo.speedBoost:24,
        minSpeed:bo.minSpeed!=null?bo.minSpeed:44,
        upBoost:bo.upBoost!=null?bo.upBoost:8
      });
    }
    return ringGroup;
  }

  // Composite framed CS surf stage end teleporter portal
  function addStageTeleporter(pos,size,dest,destYaw,tOpts){
    const to=tOpts||{};
    const w=size[0]||12, h=size[1]||10, d=size[2]||4;
    const portalGroup=new THREE.Group();
    portalGroup.position.set(pos[0],pos[1],pos[2]);
    if(to.yaw)portalGroup.rotation.y=to.yaw;

    // Frame posts & header
    const postL=new THREE.Mesh(new THREE.BoxGeometry(0.9,h,1.2),tm.dark);
    postL.position.set(-w*0.5,h*0.5,0);
    const postR=new THREE.Mesh(new THREE.BoxGeometry(0.9,h,1.2),tm.dark);
    postR.position.set(w*0.5,h*0.5,0);
    const header=new THREE.Mesh(new THREE.BoxGeometry(w+1.4,1.1,1.4),tm.dark);
    header.position.set(0,h+0.4,0);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(w-0.4,0.28,0.45),tm.accent);
    trim.position.set(0,h-0.25,0);
    const field=new THREE.Mesh(new THREE.PlaneGeometry(w-0.8,h-0.5),tm.portal);
    field.position.set(0,h*0.5,0);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(w,0.22,d),tm.accent);
    pad.position.set(0,0.11,0);
    portalGroup.add(postL,postR,header,trim,field,pad);
    group.add(portalGroup);

    if(allowCollide){
      const halfX=w*0.55, halfZ=Math.max(d*0.6,2.8);
      teleporters.push({
        min:V3(pos[0]-halfX,pos[1]-1.0,pos[2]-halfZ),
        max:V3(pos[0]+halfX,pos[1]+h+1.0,pos[2]+halfZ),
        dest:V3(dest[0],dest[1],dest[2]),
        destYaw:destYaw!=null?destYaw:Math.PI,
        preserveSpeed:!!to.preserveSpeed,
        maxSpeed:to.maxSpeed!=null?to.maxSpeed:14,
        gateIndex:to.gateIndex!=null?to.gateIndex:null,
        label:to.label||'STAGE TELEPORT'
      });
    }
    return portalGroup;
  }

  function addFailZone(fOpts){
    if(!allowCollide||!fOpts)return;
    failZones.push({
      minY:fOpts.minY,
      minX:fOpts.minX!=null?fOpts.minX:-Infinity,
      maxX:fOpts.maxX!=null?fOpts.maxX:Infinity,
      minZ:fOpts.minZ!=null?fOpts.minZ:-Infinity,
      maxZ:fOpts.maxZ!=null?fOpts.maxZ:Infinity,
      respawn:fOpts.respawn?V3(...fOpts.respawn):null,
      respawnYaw:fOpts.respawnYaw!=null?fOpts.respawnYaw:Math.PI,
      label:fOpts.label||'STAGE RETRY'
    });
  }

  // Architectural & environmental framing props (non-colliding sightlines)
  function addPylon(x,baseY,z,height=18){
    addBox(x,baseY+height/2,z,1.35,height,1.35,tm.dark,false);
    addBox(x,baseY+height,z,2.5,.35,2.5,tm.lip,false);
  }

  function addBackdropPeak(x,y,z,radius=26,height=58,mat){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(radius,height,6),mat||tm.dark);
    cone.position.set(x,y+height*0.5,z);
    cone.rotation.y=(x*0.13+z*0.07);
    group.add(cone);
    return cone;
  }

  function addCanyonMesa(x,y,z,w=24,h=38,d=24){
    addBox(x,y+h*0.5,z,w,h,d,tm.dark,false);
    addBox(x,y+h+0.6,z,w*0.86,1.2,d*0.86,tm.deck,false);
  }

  function addNeonFrame(x,y,z,w=26,h=18,yaw=0){
    const fg=new THREE.Group();
    fg.position.set(x,y,z);
    fg.rotation.y=yaw;
    const t=0.55;
    const top=new THREE.Mesh(new THREE.BoxGeometry(w,t,t),tm.accent);
    top.position.set(0,h*0.5,0);
    const bot=new THREE.Mesh(new THREE.BoxGeometry(w,t,t),tm.lip);
    bot.position.set(0,-h*0.5,0);
    const left=new THREE.Mesh(new THREE.BoxGeometry(t,h,t),tm.accent);
    left.position.set(-w*0.5,0,0);
    const right=new THREE.Mesh(new THREE.BoxGeometry(t,h,t),tm.accent);
    right.position.set(w*0.5,0,0);
    fg.add(top,bot,left,right);
    group.add(fg);
    return fg;
  }

  function gateText(text,x,y,z,color){
    if(isPreview)return null;
    const c=document.createElement('canvas');c.width=512;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle=color||'#65e7ff';ctx.font='bold 64px Arial';ctx.textAlign='center';ctx.fillText(text,256,82);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
    s.position.set(x,y,z);s.scale.set(15,3.75,1);group.add(s);
    return s;
  }

  function buildGates(list){
    const gates=list.map(([x,y,z,r,sx,sy,sz,nx,nz])=>{
      const n=nx!==undefined&&nz!==undefined?V3(nx,0,nz).normalize():V3(0,0,1);
      return {p:V3(x,y,z),n,r,spawn:sx===undefined?null:V3(sx,sy,sz)};
    });
    for(let i=0;i<gates.length;i++){
      const g=gates[i];
      const isFinish=i===gates.length-1;
      const isStart=i===0;
      const col=isFinish?theme.spec.lipHex:(isStart?theme.spec.accentHex:0x2b4a5e);
      g.mesh=new THREE.Mesh(new THREE.TorusGeometry(g.r,.16,8,isPreview?24:48),new THREE.MeshBasicMaterial({color:col}));
      g.mesh.position.copy(g.p);
      g.mesh.rotation.y=Math.atan2(g.n.x,g.n.z);
      group.add(g.mesh);
    }
    return gates;
  }

  return {
    group,
    theme,
    mats:tm,
    isPreview,
    addBox,
    slab,
    addDeck,
    addRamp,
    addSurfWedge,
    addSurfCurve,
    addSurfSpiral,
    addSurfSCurve,
    addSurfChannel,
    addSurfFlick,
    addRing,
    addLaunchPad,
    addBoostRing,
    addStageTeleporter,
    addFailZone,
    addPylon,
    addBackdropPeak,
    addCanyonMesa,
    addNeonFrame,
    gateText,
    buildGates
  };
}

// Backward-compatible global helpers delegating to live levelGroup (used by sandbox.js, arenas.js, daily.js)
function addBox(x,y,z,sx,sy,sz,mat=dark,collide=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;levelGroup.add(m);
  if(collide)registerSolid(m);
  return m;
}
function addRamp(a,b,w,mat=concrete,thick=1.2){
  const A=V3(...a),B=V3(...b),dir=B.clone().sub(A),len=dir.length();dir.divideScalar(len);
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,thick,len),mat);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(dir,V3(),V3(0,1,0)));
  const up=V3(0,1,0).applyQuaternion(m.quaternion);
  m.position.copy(A).add(B).multiplyScalar(.5).addScaledVector(up,-thick/2);
  m.castShadow=true;m.receiveShadow=true;levelGroup.add(m);registerSolid(m);
  return m;
}
function addSurfWedge(a,b,opts){
  return createWorldBuilder({group:levelGroup,collide:true,theme:'slate'}).addSurfWedge(a,b,opts);
}
function addSurfCurve(opts){
  return createWorldBuilder({group:levelGroup,collide:true,theme:'slate'}).addSurfCurve(opts);
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
