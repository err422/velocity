// Collision world + per-level state + reusable CS surf piece builders.
// Supports both live playable world (collidable) and isolated preview scene builds (visual-only).
let levelGroup=new THREE.Group();scene.add(levelGroup);
let level={id:'',bound:0},course=null,pads=[],boosters=[],teleporters=[],failZones=[],bestSplits=[],PB_KEY='',SPL_KEY='',GHOST_PB_KEY='',GHOST_LAST_KEY='';
// ---------- collision world (oriented boxes) ----------
const solidMeshes=[], solids=[];
const raycaster=new THREE.Raycaster();
function registerSolid(m,extra){
  m.updateMatrixWorld(true);
  m.userData=m.userData||{};
  m.userData.isSurf=!!(extra&&extra.isSurf);
  const g=m.geometry.parameters;
  const entry={
    half:V3(g.width/2,g.height/2,g.depth/2),
    inv:m.matrixWorld.clone().invert(),
    q:m.quaternion.clone(),
    box:new THREE.Box3().setFromObject(m),
    isSurf:!!(extra&&extra.isSurf),
    surfNormal:extra&&extra.surfNormal?extra.surfNormal.clone():null,
    disabled:false
  };
  solids.push(entry);
  solidMeshes.push(m);
  return entry;
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

// Tiles all 6 faces of a BoxGeometry proportionally in world meters so architectural textures never stretch.
function tileBoxUVs(geom,sx,sy,sz,tileSize){
  const uv=geom.attributes.uv;
  if(!uv||!tileSize||tileSize<=0)return;
  const inv=1/tileSize;
  const scales=[
    [sz*inv,sy*inv], // +X
    [sz*inv,sy*inv], // -X
    [sx*inv,sz*inv], // +Y
    [sx*inv,sz*inv], // -Y
    [sx*inv,sy*inv], // +Z
    [sx*inv,sy*inv]  // -Z
  ];
  for(let f=0;f<6;f++){
    const uS=Math.max(0.25,scales[f][0]), vS=Math.max(0.25,scales[f][1]);
    const base=f*4;
    for(let k=0;k<4;k++){
      uv.setXY(base+k,uv.getX(base+k)*uS,uv.getY(base+k)*vS);
    }
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
    const geom=new THREE.BoxGeometry(sx,sy,sz);
    if(mat&&mat.userData&&mat.userData.tileSize)tileBoxUVs(geom,sx,sy,sz,mat.userData.tileSize);
    const m=new THREE.Mesh(geom,mat);
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

  function addThinDeck(x,top,z,w,d,mat=tm.deck,thick=0.7){
    return addBox(x,top-thick*0.5,z,w,thick,d,mat,true);
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

  const _solidColorMatCache = new Map();
  function getColorMat(hex, rough = 0.72, metal = 0.22) {
    const key = `${hex}|${rough}|${metal}`;
    if (_solidColorMatCache.has(key)) return _solidColorMatCache.get(key);
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
    _solidColorMatCache.set(key, mat);
    return mat;
  }

  // Procedural architectural PBR material cache (isolated per live vs preview WebGL renderer)
  if (!window._archMatCache) window._archMatCache = new Map();
  function getArchMat(kind) {
    const cache = window._archMatCache;
    const cacheKey = (isPreview ? 'preview:' : 'live:') + kind;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const sz = (typeof isSoftwareGl !== 'undefined' && isSoftwareGl) ? 128 : 256;
    const c = document.createElement('canvas');
    c.width = sz; c.height = sz;
    const ctx = c.getContext('2d');
    const s = sz / 256;
    let rough = 0.86, metal = 0.08, tileSize = 6.0;

    if (kind === 'asphalt') {
      ctx.fillStyle = '#252b33';
      ctx.fillRect(0, 0, sz, sz);
      for (let i = 0; i < 650; i++) {
        const px = (i * 97) % sz, py = (i * 53) % sz;
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(px, py, 2 * s, 2 * s);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.strokeRect(1, 1, sz - 2, sz - 2);
      rough = 0.92; metal = 0.06; tileSize = 8.0;
    } else if (kind === 'sandstone_wall') {
      ctx.fillStyle = '#c4a178';
      ctx.fillRect(0, 0, sz, sz);
      for (let row = 0; row < 8; row++) {
        const y = row * 32 * s;
        ctx.fillStyle = row % 2 === 0 ? 'rgba(255,232,196,0.08)' : 'rgba(84,52,28,0.08)';
        ctx.fillRect(0, y, sz, 32 * s);
        ctx.fillStyle = 'rgba(72,46,24,0.22)';
        ctx.fillRect(0, y, sz, Math.max(1, 2 * s));
        const off = (row % 2) * 32 * s;
        for (let col = 0; col < 4; col++) {
          ctx.fillRect((col * 64 * s + off) % sz, y, Math.max(1, 2 * s), 32 * s);
        }
      }
      rough = 0.88; metal = 0.04; tileSize = 5.0;
    } else if (kind === 'sandstone_floor') {
      ctx.fillStyle = '#b08e68';
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = 'rgba(64,42,24,0.22)';
      ctx.lineWidth = Math.max(1, 2 * s);
      const step = 64 * s;
      for (let x = 0; x < sz; x += step) {
        for (let y = 0; y < sz; y += step) {
          ctx.fillStyle = ((x + y) % (step * 2) === 0) ? 'rgba(255,234,200,0.07)' : 'rgba(66,44,24,0.05)';
          ctx.fillRect(x, y, step, step);
          ctx.strokeRect(x, y, step, step);
        }
      }
      rough = 0.90; metal = 0.04; tileSize = 7.0;
    } else if (kind === 'canyon_floor') {
      ctx.fillStyle = '#9c563a';
      ctx.fillRect(0, 0, sz, sz);
      for (let i = 0; i < 480; i++) {
        const px = (i * 89 + 13) % sz, py = (i * 61 + 29) % sz;
        ctx.fillStyle = (i % 3 === 0) ? 'rgba(255,204,158,0.09)' : 'rgba(62,24,14,0.11)';
        ctx.fillRect(px, py, (3 + (i % 4)) * s, (2 + (i % 3)) * s);
      }
      ctx.strokeStyle = 'rgba(64,26,14,0.14)';
      ctx.lineWidth = Math.max(1, 2 * s);
      const step = 64 * s;
      for (let x = 0; x < sz; x += step) {
        for (let y = 0; y < sz; y += step) {
          ctx.strokeRect(x, y, step, step);
        }
      }
      rough = 0.93; metal = 0.03; tileSize = 8.0;
    } else if (kind === 'concrete_wall') {
      ctx.fillStyle = '#708090';
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = 'rgba(20,28,36,0.26)';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.strokeRect(2 * s, 2 * s, sz - 4 * s, 124 * s);
      ctx.strokeRect(2 * s, 130 * s, sz - 4 * s, 124 * s);
      ctx.fillStyle = 'rgba(18,24,32,0.32)';
      for (const tx of [48, 208]) {
        for (const ty of [64, 192]) {
          ctx.beginPath(); ctx.arc(tx * s, ty * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
        }
      }
      rough = 0.84; metal = 0.12; tileSize = 5.5;
    } else if (kind === 'concrete_floor') {
      ctx.fillStyle = '#4e5b6a';
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = 'rgba(16,22,30,0.28)';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.strokeRect(1, 1, sz - 2, sz - 2);
      ctx.beginPath();
      ctx.moveTo(sz * 0.5, 0); ctx.lineTo(sz * 0.5, sz);
      ctx.moveTo(0, sz * 0.5); ctx.lineTo(sz, sz * 0.5);
      ctx.stroke();
      rough = 0.88; metal = 0.10; tileSize = 7.0;
    } else if (kind === 'redrock') {
      ctx.fillStyle = '#9e5338';
      ctx.fillRect(0, 0, sz, sz);
      const bands = ['#b56544', '#86432c', '#c2764f', '#7a3c27', '#a85a3d'];
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = bands[i % bands.length];
        ctx.fillRect(0, i * 16 * s, sz, 16 * s);
        ctx.fillStyle = 'rgba(42,16,10,0.16)';
        ctx.fillRect(0, i * 16 * s, sz, Math.max(1, 2 * s));
      }
      rough = 0.90; metal = 0.05; tileSize = 7.5;
    } else if (kind === 'wood_crate') {
      ctx.fillStyle = '#8b633c';
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = '#4c321b';
      ctx.lineWidth = Math.max(2, 10 * s);
      ctx.strokeRect(6 * s, 6 * s, sz - 12 * s, sz - 12 * s);
      ctx.lineWidth = Math.max(1, 3 * s);
      for (let y = 42; y < 220; y += 36) {
        ctx.beginPath(); ctx.moveTo(12 * s, y * s); ctx.lineTo(sz - 12 * s, y * s); ctx.stroke();
      }
      ctx.lineWidth = Math.max(2, 8 * s);
      ctx.beginPath(); ctx.moveTo(14 * s, 14 * s); ctx.lineTo(sz - 14 * s, sz - 14 * s); ctx.stroke();
      rough = 0.85; metal = 0.06; tileSize = 0;
    } else if (kind === 'steel_deck') {
      ctx.fillStyle = '#3d4c5d';
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = 'rgba(180,215,240,0.16)';
      ctx.lineWidth = Math.max(1, 2 * s);
      for (let i = 0; i < sz; i += 32 * s) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, sz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(sz, i); ctx.stroke();
      }
      rough = 0.48; metal = 0.56; tileSize = 5.5;
    } else if (kind === 'glass_dark') {
      ctx.fillStyle = '#1f3b54';
      ctx.fillRect(0, 0, sz, sz);
      const grad = ctx.createLinearGradient(0, 0, sz, sz);
      grad.addColorStop(0, 'rgba(140,224,255,0.24)');
      grad.addColorStop(0.5, 'rgba(30,68,98,0.08)');
      grad.addColorStop(1, 'rgba(140,224,255,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, sz, sz);
      ctx.strokeStyle = '#0d1a26';
      ctx.lineWidth = Math.max(2, 6 * s);
      ctx.strokeRect(0, 0, sz, sz);
      ctx.beginPath(); ctx.moveTo(sz * 0.5, 0); ctx.lineTo(sz * 0.5, sz); ctx.stroke();
      rough = 0.18; metal = 0.65; tileSize = 4.5;
    } else if (kind === 'hazard_stripe') {
      ctx.fillStyle = '#d49a2a';
      ctx.fillRect(0, 0, sz, sz);
      ctx.fillStyle = '#1b2028';
      for (let i = -sz; i < sz * 2; i += 48 * s) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i + 24 * s, 0);
        ctx.lineTo(i - 40 * s, sz); ctx.lineTo(i - 64 * s, sz);
        ctx.closePath(); ctx.fill();
      }
      rough = 0.72; metal = 0.15; tileSize = 2.6;
    } else {
      ctx.fillStyle = '#526273';
      ctx.fillRect(0, 0, sz, sz);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: rough, metalness: metal });
    mat.userData = { tileSize };
    cache.set(cacheKey, mat);
    return mat;
  }

  // Rotated collidable or decorative box (supports angled cover, canyon outcrops, and diagonal walls)
  function addRotBox(x, y, z, sx, sy, sz, yaw = 0, mat = tm.dark, collide = true) {
    const geom = new THREE.BoxGeometry(sx, sy, sz);
    if (mat && mat.userData && mat.userData.tileSize) tileBoxUVs(geom, sx, sy, sz, mat.userData.tileSize);
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.rotation.y = yaw;
    if (!isPreview) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    if (allowCollide && collide) registerSolid(m);
    return m;
  }

  // Smooth walkable AAA staircase: 1 clean recessed ramp collider + solid stepped risers + anchored handrails
  function addStaircase(x0, y0, z0, x1, y1, z1, width = 4.0, mat = tm.deck, sOpts) {
    const so = sOpts || {};
    // Normalize so A is always the lower end and B is always the higher end
    const flip = y1 < y0;
    const ax = flip ? x1 : x0, ay = flip ? y1 : y0, az = flip ? z1 : z0;
    const bx = flip ? x0 : x1, by = flip ? y0 : y1, bz = flip ? z0 : z1;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const horizLen = Math.hypot(dx, dz);
    if (horizLen < 0.2) return null;

    // 1 smooth recessed ramp collider (acts as the structural stair carriage underneath the treads — never snags feet or Z-fights!)
    const carriageMat = getColorMat(theme.spec.darkColor, 0.86, 0.18);
    addRamp([ax, ay - 0.05, az], [bx, by - 0.05, bz], width - 0.06, carriageMat, 0.55);

    const yaw = Math.atan2(dx, dz);
    const stepCount = Math.max(4, Math.min(20, Math.round(Math.max(1.2, dy) / 0.36)));
    const treadD = horizLen / stepCount;
    const risePerStep = dy / stepCount;

    // Solid stepped risers sitting cleanly atop the carriage (zero floating wafers or Z-fighting!)
    for (let i = 0; i < stepCount; i++) {
      const t0 = i / stepCount;
      const t1 = (i + 1) / stepCount;
      const tmMid = (t0 + t1) * 0.5;
      const sx = ax + dx * tmMid;
      const sz = az + dz * tmMid;
      const yTop = ay + dy * t1;
      const yBot = so.solidBase ? ay : Math.max(ay - 0.1, ay + dy * t0 - 0.26);
      const stepH = Math.max(0.24, yTop - yBot);
      addRotBox(sx, yBot + stepH * 0.5, sz, width - 0.22, stepH, treadD + 0.05, yaw, mat, false);
    }

    // Anchored side curbs + supported handrail bars with vertical newel posts (NEVER floating sticks!)
    if (so.rails !== false) {
      const nx = Math.cos(yaw), nz = -Math.sin(yaw);
      const railH = 0.96;
      const postMat = tm.dark;
      const postCount = Math.max(2, Math.min(5, Math.round(horizLen / 4.2) + 1));
      for (const s of [-1, 1]) {
        const ox = nx * s * (width * 0.5 - 0.06);
        const oz = nz * s * (width * 0.5 - 0.06);
        const A = V3(ax + ox, ay + railH, az + oz);
        const B = V3(bx + ox, by + railH, bz + oz);
        const dVec = B.clone().sub(A);
        const rLen = dVec.length();
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, rLen + 0.12), postMat);
        rail.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(dVec.clone().normalize(), V3(), V3(0, 1, 0)));
        rail.position.copy(A).add(B).multiplyScalar(0.5);
        group.add(rail);
        // Sloped side curb beam anchoring stairs cleanly
        const curbA = V3(ax + ox, ay + 0.16, az + oz);
        const curbB = V3(bx + ox, by + 0.16, bz + oz);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, rLen + 0.1), postMat);
        curb.quaternion.copy(rail.quaternion);
        curb.position.copy(curbA).add(curbB).multiplyScalar(0.5);
        group.add(curb);
        // Vertical newel posts anchoring rail straight into curb/stairs
        for (let p = 0; p < postCount; p++) {
          const pt = p / (postCount - 1);
          const px = ax + ox + dx * pt;
          const py = ay + dy * pt;
          const pz = az + oz + dz * pt;
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, railH + 0.18, 0.12), postMat);
          post.position.set(px, py + railH * 0.5 - 0.04, pz);
          group.add(post);
        }
      }
    }
    return true;
  }

  // Real enterable AAA building with doorways, sniper windows, walkable roof, ceiling lights, and parapet walls!
  // opts: { wallMat, floorMat, roofMat, trimMat, wallThick, parapetH, parapetGaps, floor: false, roof: true, doors: [...], windows: [...] }
  function addBuilding(x, baseY, z, w, h, d, opts) {
    const o = opts || {};
    const wallMat = o.wallMat || tm.deck;
    const floorMatUse = o.floorMat || tm.under;
    const roofMat = o.roofMat || tm.dark;
    const trimMat = o.trimMat || tm.dark;
    const t = o.wallThick || 0.75;
    const doors = Array.isArray(o.doors) ? o.doors : [];
    const windows = Array.isArray(o.windows) ? o.windows : [];
    const hasRoof = o.roof !== false;
    const roofThick = 0.65;
    // Cap wall height right beneath the roof slab so wall tops NEVER Z-fight with the roof!
    const wallH = hasRoof ? Math.max(1.2, h - roofThick) : h;

    // Only emit an interior floor slab if explicitly requested (avoids coplanar Z-fighting with supporting decks/roofs!)
    if (o.floor === true) {
      addBox(x, baseY - 0.35, z, w, 0.7, d, floorMatUse, true);
    }

    // Build each wall segmented cleanly around doorways & windows so interiors are 100% walkable & shootable
    const buildWall = (side, span, cx, cz, alongX) => {
      const openings = [];
      for (const dr of doors) {
        if (dr.side !== side) continue;
        const ow = Math.min(span - 1.6, dr.width || 4.4);
        const oh = Math.min(wallH - 0.25, dr.height || 3.8);
        openings.push({ start: (dr.offset || 0) - ow * 0.5, end: (dr.offset || 0) + ow * 0.5, y0: 0, y1: oh });
      }
      for (const win of windows) {
        if (win.side !== side) continue;
        const ow = Math.min(span - 1.6, win.width || 4.0);
        const y0 = win.sillH != null ? win.sillH : 1.15;
        const y1 = Math.min(wallH - 0.25, win.headH != null ? win.headH : 3.2);
        openings.push({ start: (win.offset || 0) - ow * 0.5, end: (win.offset || 0) + ow * 0.5, y0, y1 });
      }
      openings.sort((a, b) => a.start - b.start);

      const half = span * 0.5;
      let cursor = -half;
      const emitPiece = (s0, s1, y0, y1) => {
        const segLen = s1 - s0;
        const segH = y1 - y0;
        if (segLen < 0.2 || segH < 0.2) return;
        const midS = (s0 + s1) * 0.5;
        const midY = baseY + (y0 + y1) * 0.5;
        if (alongX) addBox(cx + midS, midY, cz, segLen, segH, t, wallMat, true);
        else addBox(cx, midY, cz + midS, t, segH, segLen, wallMat, true);
      };

      for (const op of openings) {
        const a = Math.max(-half, op.start);
        const b = Math.min(half, op.end);
        if (a > cursor + 0.15) emitPiece(cursor, a, 0, wallH);
        if (op.y0 > 0.15) emitPiece(a, b, 0, op.y0);
        if (op.y1 < wallH - 0.15) emitPiece(a, b, op.y1, wallH);
        // Window sill trim (non-colliding detail)
        if (op.y0 > 0.2) {
          const midS = (a + b) * 0.5;
          if (alongX) addBox(cx + midS, baseY + op.y0 + 0.04, cz, b - a + 0.3, 0.16, t + 0.22, trimMat, false);
          else addBox(cx, baseY + op.y0 + 0.04, cz + midS, t + 0.22, 0.16, b - a + 0.3, trimMat, false);
        }
        cursor = Math.max(cursor, b);
      }
      if (cursor < half - 0.15) emitPiece(cursor, half, 0, wallH);
    };

    const openSides = new Set(o.openSides || []);
    if (!openSides.has('N')) buildWall('N', w, x, z - d * 0.5 + t * 0.5, true);
    if (!openSides.has('S')) buildWall('S', w, x, z + d * 0.5 - t * 0.5, true);
    if (!openSides.has('W')) buildWall('W', d - t * 2, x - w * 0.5 + t * 0.5, z, false);
    if (!openSides.has('E')) buildWall('E', d - t * 2, x + w * 0.5 - t * 0.5, z, false);

    // Roof slab + cornice + rooftop tactical parapet + interior ceiling light fixtures
    if (hasRoof) {
      const roofTop = baseY + h;
      addBox(x, roofTop - roofThick * 0.5, z, w + 0.4, roofThick, d + 0.4, roofMat, true);
      // Exterior cornice trim (offset outside walls so zero Z-fighting)
      addBox(x, roofTop - 0.12, z - d * 0.5 - 0.28, w + 0.6, 0.24, 0.22, trimMat, false);
      addBox(x, roofTop - 0.12, z + d * 0.5 + 0.28, w + 0.6, 0.24, 0.22, trimMat, false);
      // Subtle emissive interior ceiling light strips so interiors stay readable
      if (o.ceilingLight !== false && w >= 12 && d >= 10) {
        const lightMat = getColorMat(0xeef6ff, 0.25, 0.1);
        lightMat.emissive = new THREE.Color(0xc8e4ff);
        lightMat.emissiveIntensity = 0.85;
        const rows = d >= 30 ? [-d * 0.28, 0, d * 0.28] : [0];
        for (const rz of rows) {
          addBox(x, roofTop - roofThick - 0.08, z + rz, Math.min(w * 0.52, 10), 0.12, 0.7, lightMat, false);
        }
      }
      const pH = o.parapetH != null ? o.parapetH : 1.05;
      if (pH > 0.2) {
        const pGap = o.parapetGaps || {};
        if (!pGap.N) addBox(x, roofTop + pH * 0.5, z - d * 0.5 + 0.25, w, pH, 0.45, trimMat, true);
        if (!pGap.S) addBox(x, roofTop + pH * 0.5, z + d * 0.5 - 0.25, w, pH, 0.45, trimMat, true);
        if (!pGap.W) addBox(x - w * 0.5 + 0.25, roofTop + pH * 0.5, z, 0.45, pH, d - 0.9, trimMat, true);
        if (!pGap.E) addBox(x + w * 0.5 - 0.25, roofTop + pH * 0.5, z, 0.45, pH, d - 0.9, trimMat, true);
      }
    }

    // Subtle glowing accent strip on exterior facade if specified
    if (o.accentStrip) {
      addBox(x, baseY + h - 0.28, z - d * 0.5 - 0.26, w - 0.6, 0.16, 0.12, tm.accent, false);
      addBox(x, baseY + h - 0.28, z + d * 0.5 + 0.26, w - 0.6, 0.16, 0.12, tm.accent, false);
    }
    return true;
  }

  // Composite 10-part tactical vehicle (cargo truck / armored van / SUV) with lean 2-box collision
  function addVehicle(x, baseY, z, yaw = 0, vOpts) {
    const vo = vOpts || {};
    const variant = vo.variant || 'truck';
    const isTruck = variant === 'truck';
    const len = isTruck ? 7.4 : 4.8;
    const wid = isTruck ? 2.6 : 2.15;
    const bodyMat = getColorMat(vo.colorHex != null ? vo.colorHex : (isTruck ? 0x4b5c4d : 0x3b4d63), 0.58, 0.32);
    const darkMetal = getColorMat(0x1a2028, 0.65, 0.5);
    const tireMat = getColorMat(0x121519, 0.92, 0.08);
    const glassMat = getArchMat('glass_dark');
    const tarpMat = getColorMat(vo.tarpHex != null ? vo.tarpHex : 0x7b6b52, 0.88, 0.05);

    // Lean collision boxes: lower chassis/hood (great crouch & head-glitch cover) + rear cargo/cab
    addRotBox(x, baseY + 0.72, z, wid, 1.44, len, yaw, darkMetal, true);
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    if (isTruck) {
      // Rear cargo canopy (tall solid sightline blocker)
      const rx = x - sinY * 1.1, rz = z - cosY * 1.1;
      addRotBox(rx, baseY + 2.15, rz, wid - 0.1, 1.55, 4.4, yaw, tarpMat, true);
    } else {
      addRotBox(x - sinY * 0.25, baseY + 1.68, z - cosY * 0.25, wid - 0.15, 0.95, 2.5, yaw, bodyMat, true);
    }

    // Composite visual details (collide = false, pivoted cleanly at baseY)
    const vg = new THREE.Group();
    vg.position.set(x, baseY, z);
    vg.rotation.y = yaw;
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.04, 0.88, len + 0.04), bodyMat);
    chassis.position.set(0, 0.96, 0);
    vg.add(chassis);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.14, 1.18, isTruck ? 2.15 : 2.35), bodyMat);
    cab.position.set(0, 1.84, isTruck ? 2.15 : -0.2);
    vg.add(cab);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.34, 0.72, 0.16), glassMat);
    windshield.position.set(0, 1.92, isTruck ? 3.22 : 0.98);
    windshield.rotation.x = -0.22;
    vg.add(windshield);
    // 4 wheels
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, isPreview ? 10 : 14);
    wheelGeo.rotateZ(Math.PI * 0.5);
    const wheelZ = isTruck ? [-2.2, 2.35] : [-1.45, 1.45];
    for (const wz of wheelZ) {
      for (const wx of [-wid * 0.48, wid * 0.48]) {
        const wMesh = new THREE.Mesh(wheelGeo, tireMat);
        wMesh.position.set(wx, 0.46, wz);
        vg.add(wMesh);
      }
    }
    // Headlights & taillights
    const headMat = getColorMat(0xfff1c8, 0.2, 0.1);
    const tailMat = getColorMat(0xd93838, 0.3, 0.1);
    for (const lx of [-wid * 0.34, wid * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.1), headMat);
      hl.position.set(lx, 1.0, len * 0.5 + 0.04);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), tailMat);
      tl.position.set(lx, 1.0, -len * 0.5 - 0.04);
      vg.add(hl, tl);
    }
    group.add(vg);
    return vg;
  }

  // Classic CS stacked crate cluster (boost-friendly double stack + pallet)
  function addCrateCluster(x, baseY, z, yaw = 0, scale = 1) {
    const crateMat = getArchMat('wood_crate');
    const s = scale;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    addRotBox(x, baseY + 1.05 * s, z, 2.2 * s, 2.1 * s, 2.2 * s, yaw, crateMat, true);
    addRotBox(x + cosY * 1.95 * s, baseY + 0.65 * s, z - sinY * 1.95 * s, 1.55 * s, 1.3 * s, 1.65 * s, yaw + 0.16, crateMat, true);
    addRotBox(x - sinY * 1.85 * s, baseY + 0.55 * s, z - cosY * 1.85 * s, 1.45 * s, 1.1 * s, 1.45 * s, yaw - 0.12, getColorMat(0x4c5e4b, 0.8, 0.15), true);
  }

  // Concrete Jersey tactical road barrier (ideal 1.18m crouch/peek cover)
  function addJerseyBarrier(x, baseY, z, len = 4.2, yaw = 0) {
    const cMat = getArchMat('concrete_wall');
    addRotBox(x, baseY + 0.58, z, len, 1.16, 0.72, yaw, cMat, true);
    addRotBox(x, baseY + 1.08, z, len + 0.04, 0.18, 0.52, yaw, getArchMat('hazard_stripe'), false);
  }

  // Walkable stone/concrete archway (or 1.18m slide-under arch when height = 1.18)
  function addArchway(x, baseY, z, span = 6.0, height = 4.6, depth = 2.4, yaw = 0, mat = tm.deck) {
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const pillarW = 1.4;
    const halfOff = span * 0.5 + pillarW * 0.5;
    addRotBox(x - cosY * halfOff, baseY + height * 0.5, z + sinY * halfOff, pillarW, height, depth, yaw, mat, true);
    addRotBox(x + cosY * halfOff, baseY + height * 0.5, z - sinY * halfOff, pillarW, height, depth, yaw, mat, true);
    addRotBox(x, baseY + height + 0.8, z, span + pillarW * 2, 1.6, depth, yaw, mat, true);
    if (height <= 1.35) {
      addRotBox(x, baseY + height + 0.08, z, span + 0.2, 0.16, depth + 0.12, tm.accent, false);
    }
  }

  // Composite palm or cypress/pine tree for lively outdoor CoD/CS silhouettes
  function addTree(x, baseY, z, variant = 'palm') {
    const tg = new THREE.Group();
    tg.position.set(x, baseY, z);
    const trunkMat = getColorMat(0x5c4330, 0.92, 0.04);
    const leafMat = getColorMat(variant === 'palm' ? 0x456b3a : 0x2f4f38, 0.82, 0.05);
    if (variant === 'palm') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 7.2, 7), trunkMat);
      trunk.position.y = 3.6;
      tg.add(trunk);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 3.6), leafMat);
        frond.position.set(Math.sin(a) * 1.6, 7.1, Math.cos(a) * 1.6);
        frond.rotation.y = a;
        frond.rotation.x = 0.34;
        tg.add(frond);
      }
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, 4.0, 7), trunkMat);
      trunk.position.y = 2.0;
      tg.add(trunk);
      for (let tier = 0; tier < 3; tier++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.3 - tier * 0.45, 3.4, 7), leafMat);
        cone.position.y = 3.8 + tier * 2.1;
        tg.add(cone);
      }
    }
    group.add(tg);
    // Slim trunk collider only so players don't snag on high fronds
    if (allowCollide) addBox(x, baseY + 1.6, z, 0.65, 3.2, 0.65, trunkMat, true);
    return tg;
  }

  // Street lamp / harbor floodlight pole (non-colliding visual framing)
  function addStreetLamp(x, baseY, z, yaw = 0, height = 7.5) {
    const lg = new THREE.Group();
    lg.position.set(x, baseY, z);
    lg.rotation.y = yaw;
    const poleMat = getColorMat(0x28333f, 0.55, 0.55);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, height, 6), poleMat);
    pole.position.y = height * 0.5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.2), poleMat);
    arm.position.set(0, height - 0.15, 1.0);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.85), tm.accent);
    bulb.position.set(0, height - 0.28, 1.85);
    lg.add(pole, arm, bulb);
    group.add(lg);
    return lg;
  }

  // Distant skyscraper silhouette with glowing window bands (non-colliding vista)
  function addSkyscraperBackdrop(x, baseY, z, w, h, d, bandMat) {
    const bMat = getColorMat(0x162231, 0.65, 0.38);
    addBox(x, baseY + h * 0.5, z, w, h, d, bMat, false);
    const glow = bandMat || tm.accent;
    const bands = Math.max(2, Math.min(6, Math.floor(h / 18)));
    for (let i = 1; i <= bands; i++) {
      const by = baseY + (h * i) / (bands + 1);
      addBox(x, by, z, w + 0.4, 0.65, d + 0.4, glow, false);
    }
    addBox(x, baseY + h + 5.5, z, 0.7, 11, 0.7, bMat, false);
  }

  // Raised circular/octagonal helipad deck with painted H marking & perimeter beacons
  function addHelipad(x, topY, z, radius = 12) {
    const padSize = radius * 1.8;
    addDeck(x, topY, z, padSize, padSize, getArchMat('asphalt'));
    // Painted H marking (non-colliding)
    const paint = getColorMat(0xf0c954, 0.6, 0.1);
    const barW = 0.85;
    addBox(x - radius * 0.34, topY + 0.05, z, barW, 0.08, radius * 0.95, paint, false);
    addBox(x + radius * 0.34, topY + 0.05, z, barW, 0.08, radius * 0.95, paint, false);
    addBox(x, topY + 0.05, z, Math.max(0.8, radius * 0.68 - barW), 0.08, barW, paint, false);
    const ring = addRing(x, topY + 0.08, z, radius * 0.82, 0xf0c954);
    ring.rotation.x = Math.PI * 0.5;
  }

  function addLaunchPad(x,y,z,pOpts){
    const po=pOpts||{};
    const isVent=po.variant==='vent';
    const radius=po.radius||2.4;
    const p=new THREE.Mesh(
      new THREE.CylinderGeometry(radius,radius*1.08,isVent?0.36:0.22,isPreview?18:32),
      isVent?tm.dark:tm.lip
    );
    p.position.set(x,y,z);
    p.userData={
      padUp:po.upSpeed!=null?po.upSpeed:null,
      padBoost:po.boost!=null?po.boost:null,
      padDir:po.dir?{x:po.dir[0]||0,z:po.dir[1]||0}:null,
      padHoriz:po.horizSpeed!=null?po.horizSpeed:0,
      padRadius:radius+0.3,
      label:po.label||(isVent?'LAUNCH VENT':'LAUNCH PAD')
    };
    group.add(p);
    if(allowCollide)pads.push(p);
    const ringCol=po.colorHex!=null?po.colorHex:(isVent?theme.spec.accentHex:theme.spec.lipHex);
    const tor=addRing(x,y+(isVent?0.26:0.18),z,radius+0.2,ringCol);tor.rotation.x=Math.PI/2;
    if(isVent){
      const core=new THREE.Mesh(new THREE.CylinderGeometry(radius*0.72,radius*0.72,0.08,isPreview?16:24),tm.accent);
      core.position.set(x,y+0.2,z);
      group.add(core);
      const tor2=addRing(x,y+1.15,z,radius*0.86,ringCol);tor2.rotation.x=Math.PI/2;
    }
    return p;
  }

  // Composite directional CS surf / skyline speed boost ring (trigger_push equivalent)
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
        r:radius+0.6,
        speedBoost:bo.speedBoost!=null?bo.speedBoost:24,
        boost:bo.speedBoost!=null?bo.speedBoost:20,
        minSpeed:bo.minSpeed!=null?bo.minSpeed:44,
        upBoost:bo.upBoost!=null?bo.upBoost:8,
        label:bo.label||'BOOST RING'
      });
    }
    return ringGroup;
  }

  // Composite framed CS surf stage / PvP flank teleporter portal
  function addStageTeleporter(pos,size,dest,destYaw,tOpts){
    const to=tOpts||{};
    const w=size[0]||12, h=size[1]||10, d=size[2]||4;
    const portalGroup=new THREE.Group();
    portalGroup.position.set(pos[0],pos[1],pos[2]);
    if(to.yaw)portalGroup.rotation.y=to.yaw;

    const useCustomCol=to.ringHex!=null;
    const trimMat=useCustomCol
      ?new THREE.MeshStandardMaterial({color:to.ringHex,emissive:to.ringHex,emissiveIntensity:1.15,roughness:0.25})
      :tm.accent;
    const fieldMat=useCustomCol
      ?new THREE.MeshStandardMaterial({color:to.ringHex,emissive:to.ringHex,emissiveIntensity:1.35,transparent:true,opacity:0.34,roughness:0.15,side:THREE.DoubleSide})
      :tm.portal;

    // Frame posts & header
    const postL=new THREE.Mesh(new THREE.BoxGeometry(0.75,h,1.0),tm.dark);
    postL.position.set(-w*0.5,h*0.5,0);
    const postR=new THREE.Mesh(new THREE.BoxGeometry(0.75,h,1.0),tm.dark);
    postR.position.set(w*0.5,h*0.5,0);
    const header=new THREE.Mesh(new THREE.BoxGeometry(w+1.2,0.9,1.2),tm.dark);
    header.position.set(0,h+0.35,0);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(w-0.4,0.28,0.45),trimMat);
    trim.position.set(0,h-0.2,0);
    const field=new THREE.Mesh(new THREE.PlaneGeometry(w-0.7,h-0.4),fieldMat);
    field.position.set(0,h*0.5,0);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(w,0.22,d),trimMat);
    pad.position.set(0,0.11,0);
    portalGroup.add(postL,postR,header,trim,field,pad);
    group.add(portalGroup);

    if(allowCollide){
      const yaw=to.yaw||0;
      const cosY=Math.abs(Math.cos(yaw)), sinY=Math.abs(Math.sin(yaw));
      const baseHalfX=w*0.52, baseHalfZ=Math.max(d*0.58,2.2);
      const halfX=baseHalfX*cosY+baseHalfZ*sinY;
      const halfZ=baseHalfX*sinY+baseHalfZ*cosY;
      teleporters.push({
        pos:V3(pos[0],pos[1]+h*0.45,pos[2]),
        r:Math.max(w*0.48,2.4),
        min:V3(pos[0]-halfX,pos[1]-0.8,pos[2]-halfZ),
        max:V3(pos[0]+halfX,pos[1]+h+0.8,pos[2]+halfZ),
        dest:V3(dest[0],dest[1],dest[2]),
        destYaw:destYaw!=null?destYaw:Math.PI,
        preserveSpeed:!!to.preserveSpeed,
        maxSpeed:to.maxSpeed!=null?to.maxSpeed:22,
        cooldown:to.cooldown!=null?to.cooldown:0.55,
        gateIndex:to.gateIndex!=null?to.gateIndex:null,
        label:to.label||'STAGE TELEPORT'
      });
    }
    return portalGroup;
  }

  // Distinct wallrun billboard panel with horizontal emissive guide rails
  function addWallrunPanel(x,y,z,len,height,yaw=0,wOpts){
    const wo=wOpts||{};
    const thick=wo.thick||1.1;
    const mat=wo.mat||tm.deck;
    const m=new THREE.Mesh(new THREE.BoxGeometry(thick,height,len),mat);
    m.position.set(x,y,z);
    m.rotation.y=yaw;
    if(!isPreview){m.castShadow=true;m.receiveShadow=true;}
    group.add(m);
    if(allowCollide)registerSolid(m);

    // Top, bottom, and mid glowing wallrun guide strips (non-colliding)
    const deco=new THREE.Group();
    deco.position.set(x,y,z);
    deco.rotation.y=yaw;
    const stripW=thick+0.12;
    const topBar=new THREE.Mesh(new THREE.BoxGeometry(stripW,0.22,len-0.4),tm.accent);
    topBar.position.set(0,height*0.5-0.35,0);
    const botBar=new THREE.Mesh(new THREE.BoxGeometry(stripW,0.18,len-0.4),tm.lip);
    botBar.position.set(0,-height*0.5+0.35,0);
    const midBar=new THREE.Mesh(new THREE.BoxGeometry(stripW,0.12,len-1.2),tm.accent);
    deco.add(topBar,botBar,midBar);
    group.add(deco);
    return m;
  }

  // Corrugated industrial shipping container with structural corner posts (optional slide-under elevation)
  function addContainer(x,baseY,z,sx,sy,sz,colorHex,cOpts){
    const co=cOpts||{};
    const bodyMat=getColorMat(colorHex||0x3b4d5e,0.68,0.28);
    const body=addBox(x,baseY+sy*0.5,z,sx,sy,sz,bodyMat,true);
    // Corner structural frame posts & top rail (non-colliding detail)
    const trimMat=tm.dark;
    const hx=sx*0.5-0.16, hz=sz*0.5-0.16;
    for(const sxSign of [-1,1]){
      for(const szSign of [-1,1]){
        addBox(x+sxSign*hx,baseY+sy*0.5,z+szSign*hz,0.34,sy+0.08,0.34,trimMat,false);
      }
    }
    if(co.stripeHex!=null){
      const stripeMat=getColorMat(co.stripeHex,0.45,0.2);
      addBox(x,baseY+sy*0.5,z,sx+0.08,0.34,sz+0.08,stripeMat,false);
    }
    if(co.supports&&baseY>0.2){
      // Corner steel jack legs leaving exact slide-under clearance down the middle!
      for(const sxSign of [-1,1]){
        for(const szSign of [-1,1]){
          addBox(x+sxSign*(sx*0.5-0.38),baseY*0.5,z+szSign*(sz*0.5-0.38),0.65,baseY,0.65,trimMat,true);
        }
      }
      // Low clearance warning trim along underside
      addBox(x,baseY+0.08,z,sx+0.12,0.14,sz+0.12,tm.accent,false);
    }
    return body;
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
    getColorMat,
    getArchMat,
    addBox,
    addRotBox,
    slab,
    addDeck,
    addThinDeck,
    addRamp,
    addStaircase,
    addBuilding,
    addVehicle,
    addCrateCluster,
    addJerseyBarrier,
    addArchway,
    addTree,
    addStreetLamp,
    addSkyscraperBackdrop,
    addHelipad,
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
    addWallrunPanel,
    addContainer,
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
