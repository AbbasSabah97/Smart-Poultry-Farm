import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {createSiteOverview} from './site.js';
import {birdHeadingForLane,birdPositionForIndex} from './site-plan.js';
import {applyHouseTheme} from './house-theme.js';

const C={steel:0x859aa5,teal:0x137c86,red:0xbe4533,pipe:0xc6d5d9,grass:0x506647,white:0xf0eadb};
function seedRandom(seed=2026){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
const rand=seedRandom();
export function createScene(canvas,twin){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.setClearColor(0xaccde0);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xb4d1df);scene.fog=new THREE.FogExp2(0xb4d1df,.0068);
  const camera=new THREE.PerspectiveCamera(52,1,.045,850);
  camera.position.set(41,26,38);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1,0);
  controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=1.1;controls.maxDistance=750;
  controls.maxPolarAngle=Math.PI/2-.025;controls.minPolarAngle=.08;controls.enablePan=true;
  const hemi=new THREE.HemisphereLight(0xdceeff,0x6a5847,.83);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffebd0,2.0);sun.position.set(-34,44,35);scene.add(sun);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:75,bottom:-75,near:1,far:150});sun.shadow.bias=-.00018;
  const fill=new THREE.DirectionalLight(0xa5ccfb,.26);fill.position.set(20,18,-16);scene.add(fill);
  const storage={};
  const textures={};
  const loader=new THREE.TextureLoader();
  for(const [key,file] of Object.entries({litter:'litter',soil:'soil',metal:'metal',concrete:'concrete',pad:'cooling',feathers:'feathers'})){
    const tx=loader.load(`/textures/${file}_color.jpg`,()=>{},undefined,()=>{});
    tx.colorSpace=THREE.SRGBColorSpace;
    tx.wrapS=THREE.RepeatWrapping;tx.wrapT=THREE.RepeatWrapping;
    tx.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    textures[key]=tx;
  }
  function mat(col,metal=0,rough=.72,opts={}){return new THREE.MeshStandardMaterial({color:col,metalness:metal,roughness:rough,...opts})}
  const wood=mat(0x81674d),dark=mat(0x243039,.55),silver=mat(0xa9b8c1,.65,.42),bars=mat(0x566975,.65,.48),rust=mat(0x976d45,.2),pan=mat(0xc9473d,.16),copper=mat(0xd8a557,.4,.45),blue=mat(0x3e8baf,.3,.42),clear=mat(0xe6f9fb,.17,.5,{transparent:true,opacity:.62}),birdmat=mat(0xf3ebdd,0,.9,{map:textures.feathers}),yellow=mat(0xe2a53b,.05),red=mat(0xb9473b,.1),black=mat(0x151918,.1,.3);
  const insulator=mat(0xe1e4e3,.16,.64),litterMat=mat(0xd2b38e,.04,.98,{map:textures.litter}),soilMat=mat(0xc6c5ac,.02,.96,{map:textures.soil}),roofmat=mat(0xc0d1d8,.52,.54,{map:textures.metal,side:THREE.DoubleSide});
  const materials={};
  function box(parent,name,x,y,z,w,h,d,material,shadow=true){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.name=name;
    mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cyl(parent,name,x,y,z,r1,r2,h,material,sides=12,rotX=0){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sides),material);
    mesh.position.set(x,y,z);mesh.rotation.x=rotX;mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);return mesh;
  }
  function pipe(parent,name,start,end,r,material,sides=8){
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const dir=b.clone().sub(a);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),sides),material);
    mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    mesh.castShadow=true;parent.add(mesh);mesh.name=name;return mesh;
  }
  function badge(parent,name,x,y,z,size=.5){const s=cyl(parent,name,x,y,z,size,size,.03,pan,18,Math.PI/2);return s}
  const world=new THREE.Group();scene.add(world);
  // Exterior ground, concrete apron, dirt access road and service yard
  textures.soil.repeat.set(28,28);
  const exterior=new THREE.Mesh(new THREE.PlaneGeometry(270,230),soilMat);exterior.rotation.x=-Math.PI/2;exterior.position.y=-.07;exterior.receiveShadow=true;world.add(exterior);
  box(world,'perimeter walkway',0,-.04,0,80,.08,24,mat(0x999d91,0,.98,{map:textures.concrete}),false);
  box(world,'service road',0,-.06,-27,132,.08,6,mat(0x686f6b,0,1),false);
  for(let i=0;i<22;i++){
    const x=-58+i*5.5;
    box(world,'fence post '+i,x,.65,-32,.11,1.3,.12,silver);
    if(i<21) for(let k=0;k<3;k++)pipe(world,'perimeter fence', [x,.35+k*.3,-32],[x+5.5,.35+k*.3,-32],.015,silver,6);
  }
  // House dimensions 72x16 m: X longitudinal, Z transverse
  const house=new THREE.Group();world.add(house);
  const floor=box(house,'litter floor',0,.075,0,72,.15,16,litterMat,false);
  textures.litter.repeat.set(12,3);
  const rail=box(house,'concrete foundation',0,.0,0,74,.25,18,mat(0xa7a7a0,0,.94),false);
  house.remove(rail);world.add(rail); rail.position.y=-.11;
  // Steel uprights and perimeter rails
  for(let x=-35;x<=35;x+=7){
    for(const z of [-7.7,7.7]){
      box(house,'galvanised steel post',x,2.8,z,.16,5.6,.16,bars);
      box(house,'wall gusset',x,5.55,z,.6,.16,.43,silver);
    }
    pipe(house,'roof truss left',[x,5.6,-8],[x,7.55,0],.065,bars,8);
    pipe(house,'roof truss right',[x,7.55,0],[x,5.6,8],.065,bars,8);
  }
  for(const z of [-7.8,7.8]){
    box(house,'horizontal ridge rail',0,5.52,z,72,.12,.12,bars);
  }
  // Lower masonry and upper insulating walls; partial translucency for interior observation
  const wallmat=mat(0xe5e8e2,.06,.84);
  const inletBlades=[];
  for(const z of [-8.05,8.05]){
    box(house,'insulated side wall',0,2.5,z,72,4.9,.15,wallmat,false);
    for(let x=-32;x<=32;x+=8){
      box(house,'ventilation inlet',x,4.6,z+Math.sign(z)*.11,3.2,.54,.16,dark,false);
      inletBlades.push(box(house,'adjustable inlet blade',x,4.6,z+Math.sign(z)*.21,3.05,.06,.08,silver,false));
    }
  }
  // Both tunnel ends have real openings, not decorative equipment behind opaque end walls.
  // Cooling end: each pad opening is 3.35m wide, 3.7m tall, low sill + high lintel.
  box(house,'cooling end low sill',-36,.52,0,.22,1.04,16,wallmat,false);
  box(house,'cooling end high lintel',-36,5.04,0,.22,.72,16,wallmat,false);
  const padCentres=[-5.85,-1.95,1.95,5.85], padHalf=1.69;
  const edges=[-8,...padCentres.flatMap(z=>[z-padHalf,z+padHalf]),8];
  for(let e=0;e<edges.length-1;e+=2){
    const za=edges[e],zb=edges[e+1];
    if(zb>za+.05)box(house,'cooling end masonry pier',-36,2.95,(za+zb)/2,.22,3.85,zb-za,wallmat,false);
  }
  // Exhaust end: open fan apertures remain visible from BOTH interior and exterior.
  const fanCenters=Array.from({length:6},(_,i)=>-6.7+i*2.7), fanHalf=1.16;
  box(house,'fan end lower sill',36,.92,0,.22,1.84,16,wallmat,false);
  box(house,'fan end lintel',36,4.85,0,.22,1.1,16,wallmat,false);
  const fanEdges=[-8,...fanCenters.flatMap(z=>[z-fanHalf,z+fanHalf]),8];
  for(let e=0;e<fanEdges.length-1;e+=2){
    const za=fanEdges[e],zb=fanEdges[e+1];
    if(zb>za+.05)box(house,'fan end concrete pier',36,3.07,(za+zb)/2,.22,2.46,zb-za,wallmat,false);
  }
  // Large roof panels hinged in two segments along ridge; hide both for interior camera
  const roofs=[];
  for(let half of [-1,1]){
    const roof=new THREE.Group();house.add(roof);roofs.push(roof);
    const length=Math.sqrt(8*8+1.85*1.85),pitch=Math.atan2(1.85,8);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(74,length),roofmat);
    plane.rotation.x=-Math.PI/2+half*pitch;
    plane.position.set(0,6.6,half*4.05);plane.receiveShadow=true;plane.castShadow=true;roof.add(plane);
    for(let x=-35;x<=35;x+=3.5){
      const z=half*4.1;
      const r=box(roof,'roof corrugation strip',x,6.6,z,.035,.015,8,silver,false);
      r.rotation.x=-half*pitch;
    }
  }
  // Lighting under the ridge
  const lights=[];
  const workingLights=[];
  const lightPools=[];
  const indoorLighting=new THREE.Group();indoorLighting.name='INTERIOR_LIGHTING';house.add(indoorLighting);
  for(let x=-31;x<=31;x+=9){
    const housing=box(house,'LED poultry light',x,6.15,0,1.35,.11,.32,dark,false);
    const lamp=box(house,'LED diode',x,6.07,0,1.3,.03,.28,mat(0xf8f4d3,.05,.24,{emissive:0xe9d18b,emissiveIntensity:1.9}),false);
    lights.push(lamp);
    const coneLight=new THREE.SpotLight(0xffe8bc,0,11.5,Math.PI/2.7,.85,1.7);
    coneLight.position.set(x,5.99,0);coneLight.castShadow=false;
    coneLight.target.position.set(x,.15,0);
    indoorLighting.add(coneLight,coneLight.target);workingLights.push(coneLight);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(7.1,8.9),new THREE.MeshBasicMaterial({color:0xffd9a2,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
    pool.rotation.x=-Math.PI/2;pool.position.set(x,.16,0);house.add(pool);lightPools.push(pool);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshBasicMaterial({color:0xfff5cb,transparent:true,opacity:0,depthWrite:false}));
    glow.position.set(x,5.96,0);indoorLighting.add(glow);lightPools.push(glow);
  }
  // 6 axial high-efficiency tunnel fans at end. Rotating blades visible.
  const fanRotors=[],fanHousings=[];
  for(let i=0;i<6;i++){
    const z=-6.7+i*2.7;
    const housing=new THREE.Mesh(new THREE.TorusGeometry(1.04,.16,10,36),dark);
    housing.name='tunnel fan open steel frame';housing.position.set(36.18,3.1,z);housing.rotation.y=Math.PI/2;
    house.add(housing);fanHousings.push(housing);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.91,.075,8,34),silver);rim.position.set(36.48,3.1,z);rim.rotation.y=Math.PI/2;house.add(rim);
    const rotor=new THREE.Group();rotor.position.set(36.55,3.1,z);house.add(rotor);
    cyl(rotor,'fan hub',0,0,0,.15,.15,.25,silver,16,Math.PI/2);
    for(let blade=0;blade<6;blade++){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.035,.76,.24),mat(0x8b9eaa,.75,.36));
      mesh.position.set(.04,.50,0);mesh.rotation.x=.24;
      const arm=new THREE.Group();arm.rotation.x=blade*Math.PI/3;arm.add(mesh);rotor.add(arm);
    }
    for(let y=-.72;y<=.72;y+=.18){
      pipe(house,'fan protective cage',[36.6,3.1+y,z-.75],[36.6,3.1+y,z+.75],.012,bars,5);
    }
    fanRotors.push(rotor);
  }
  // Cooling wall with pads along far end and overhead header + water line
  const pads=[];
  for(let j=0;j<4;j++){
    const z=-5.85+j*3.9;
    const panel=box(house,'evaporative cooling media',-36.24,2.8,z,.23,3.7,3.35,mat(0x6d9489,.04,.94,{map:textures.pad,side:THREE.DoubleSide}),false);
    pads.push(panel);
    box(house,'cooling pad frame',-36.42,2.8,z,.06,3.92,3.57,dark,false);
    for(let k=0;k<6;k++)pipe(house,'pad vertical flute',[-36.53,1.12,z-1.5+k*.56],[-36.53,4.52,z-1.5+k*.56],.025,blue,6);
  }
  pipe(house,'pad header pipe',[-36.63,5.0,-7],[-36.63,5.0,7],.09,blue);
  // 4 feed pan lines and 4 nipple drinker lines
  const feeders=[],waterLines=[];
  const waterCores=[],drinkDrops=[];
  let feedSurfaceA=null,feedSurfaceB=null;
  const feedFillMat=mat(0xc59839,.02,.97);
  const panCoords=[],hopperCoords=[],nippleCoords=[],hangerCoords=[];
  const feedGear=[],waterIndicators=[];
  const waterGlass=mat(0xcde8ed,.18,.19,{transparent:true,opacity:.45,depthWrite:false});
  const feedPipeMat=mat(0xb2b8b4,.76,.3);
  const rubber=mat(0x303c40,.22,.92);
  const feedGrain=mat(0xad8539,.04,.95);
  // Two silo unloading stations feed an exterior galvanized screw-auger header.
  // Each branch visibly enters a production line in the house.
  for(const sx of [-19,19]){
    // concrete base and auger from bottom of the owner-provided silo to the wall manifold
    box(world,'SILO-CONCRETE-FOUNDATION',sx,.0,-17.7,6.5,.25,6.4,mat(0x9aa5aa),false);
    cyl(world,'SILO-DISCHARGE-VALVE',sx,1.15,-17.7,.29,.29,.52,dark,16);
    pipe(world,'ENCLOSED-AUGER-'+sx,[sx,1.15,-17.7],[sx,3.2,-9.3],.17,feedPipeMat,14);
    const motor=box(world,'AUGER-GEAR-MOTOR',sx,3.2,-9.2,.85,.43,.6,mat(0x526b76,.45,.43));feedGear.push(motor);
    cyl(world,'AUGER-TRANSFER-ELBOW',sx,3.05,-8.95,.28,.28,.4,feedPipeMat,12);
    for(const t of [.27,.53,.79]){
      const x=sx, y=1.15+2.05*t, z=-17.7+8.4*t;
      const support=pipe(world,'AUGER-SUPPORT',[x,.10,z],[x,y-.25,z],.044,bars);
    }
  }
  pipe(world,'FEED-EXTERIOR-HEADER',[-33,3.1,-8.9],[33,3.1,-8.9],.115,feedPipeMat,14);
  // Feed branch lines follow the header and pass through a sealed sleeve at the wall.
  for(const z of [-5.3,-1.8,1.8,5.3]){
    pipe(house,'FEED-FILL-DROP',[-33,3.1,-8.95],[-33,3.1,z],.085,feedPipeMat,12);
    pipe(house,'FEED-FILL-CONNECTION',[-33,3.1,z],[-33,1.42,z],.08,feedPipeMat,12);
    cyl(house,'FEED-INLET-GATE',-33,2.65,z,.18,.18,.3,blue,12);
  }
  // Main water header: storage tank -> booster pump -> filter assembly -> barn drinking pipes.
  pipe(world,'RAW-WATER-TANK-OUTLET',[4,.75,-21.5],[10,.75,-20],.13,blue,12);
  pipe(world,'WATER-PUMP-DISCHARGE',[10,.85,-20],[12,1.10,-17],.12,blue,12);
  for(const x of [11.5,12.4]){
    cyl(world,'DOUBLE-WATER-FILTER-CARTRIDGE',x,1.20,-16.8,.18,.18,1.3,clear,14);
    cyl(world,'CARTRIDGE-END-CAP',x,1.85,-16.8,.22,.22,.13,blue,12);
  }
  pipe(world,'FILTER-OUTLET-TO-BARN',[12,1.25,-16.8],[-33,1.8,-8.55],.10,blue,12);
  pipe(house,'NIPPLE-HEADER-ACROSS-HOUSE',[-33,1.8,-8.55],[-33,1.8,7],.095,blue,12);
  for(const zw of [-5.3+.93,-1.8+.93,1.8+.93,5.3+.93]){
    pipe(house,'WATER-DOWNPIPE-TO-DRINKER',[-33,1.8,zw],[-33,.73,zw],.055,blue,12);
    cyl(house,'BRANCH-ISOLATION-VALVE',-33,1.54,zw,.14,.14,.18,yellow,12);
  }
  // Grey electrical cable tray from the generator to ATS, then into the house control room.
  box(world,'GENERATOR-CONCRETE-PLINTH',30,.05,-21.5,7.0,.28,4.8,mat(0xa1a6a2,0,.96),false);
  for(const bx of [26.4,33.6])for(const bz of [-23.85,-19.1])cyl(world,'GENSET-PROTECTION-BOLLARD',bx,.6,bz,.08,.08,1.2,yellow,10);
  pipe(world,'GENERATOR-POWER-CONDUIT',[31,1,-19.2],[27,1,-14.2],.075,dark,10);
  pipe(world,'GENERATOR-ATS-LOOP',[27,1,-14.2],[27,1.25,-12],.075,dark,10);
  pipe(world,'ATS-TO-HOUSE-SUPPLY',[27,1.55,-12],[27,2.2,-8],.065,dark,10);
  box(world,'ATS-DISTRIBUTION-CABINET',27,1.06,-12,2.1,2.15,1.35,mat(0x859eaa,.5,.53));
  // Visible pipe tags and control status are demonstrative; no real flow pressure is simulated in this geometry.

  
  for(const [n,z] of [-5.3,-1.8,1.8,5.3].entries()){
    pipe(house,'galvanised auger feed line',[-33,1.42,z],[32,1.42,z],.065,silver);
    for(let x=-30;x<=30;x+=3.25){
      panCoords.push([x,.38,z]);hopperCoords.push([x,.72,z]);hangerCoords.push([x,1.225,z]);
    }
    const zw=z+.93;
    pipe(house,'nipple drink pipe translucent',[-33,.73,zw],[33,.73,zw],.055,mat(0xc6e8f1,.12,.23,{transparent:true,opacity:.47,depthWrite:false}));
    const liquid=pipe(house,'water inside nipple pipe',[-33,.73,zw],[33,.73,zw],.034,mat(0x0582e9,.07,.22,{emissive:0x075ab8,emissiveIntensity:.25}));
    waterCores.push({mesh:liquid,line:n});
    for(let dx=-30;dx<=30;dx+=10){
      const droplet=new THREE.Mesh(new THREE.SphereGeometry(.052,8,7),mat(0x55d5ff,.05,.19,{transparent:true,opacity:.86}));
      droplet.position.set(dx,.41,zw);house.add(droplet);drinkDrops.push({mesh:droplet,line:n,phase:rand()*6.28});
    }
    for(let x=-31;x<=31;x+=.68)nippleCoords.push([x,.57,zw]);
    waterLines.push(zw);
  }
  function scatterCyl(name,coords,radiusTop,radiusBottom,height,material,sides=10){
    const mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,sides),material,coords.length);
    const mtx=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(1,1,1);
    coords.forEach((xyz,i)=>{p.set(...xyz);mtx.compose(p,q,sc);mesh.setMatrixAt(i,mtx)});
    mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.castShadow=false;
    mesh.name=name;house.add(mesh);return mesh;
  }
  scatterCyl('pan feeders',panCoords,.53,.43,.14,pan,24);
  // Shallow lip, guards and metering collar; instancing avoids one draw call per individual part.
  function instanceRing(name,coords,r,t,material){
    const ins=new THREE.InstancedMesh(new THREE.TorusGeometry(r,t,5,20),material,coords.length);
    const tmp=new THREE.Object3D();
    coords.forEach(([x,y,z],i)=>{tmp.position.set(x,y,z);tmp.rotation.set(Math.PI/2,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();ins.setMatrixAt(i,tmp.matrix)});
    ins.instanceMatrix.needsUpdate=true;ins.name=name;ins.frustumCulled=false;house.add(ins);return ins;
  }
  instanceRing('PAN-RIM-rolled-steel',panCoords.map(([x,y,z])=>[x,.467,z]),.46,.028,silver);
  instanceRing('PAN-GRAIN-GUARD',panCoords.map(([x,y,z])=>[x,.57,z]),.36,.013,rubber);
  // Radial dividers keep the birds from scattering the food; all 8 guards are instanced.
  for(let k=0;k<8;k++){
    const angle=k*Math.PI/4;
    const g=new THREE.CylinderGeometry(.012,.012,.33,5);
    g.rotateZ(Math.PI/2);
    const ribs=new THREE.InstancedMesh(g,bars,panCoords.length);
    const tmp=new THREE.Object3D();
    panCoords.forEach(([x,y,z],i)=>{tmp.position.set(x+Math.cos(angle)*.18,.54,z+Math.sin(angle)*.18);tmp.rotation.y=-angle;tmp.updateMatrix();ribs.setMatrixAt(i,tmp.matrix)});
    ribs.instanceMatrix.needsUpdate=true;ribs.name='PAN-FEED-GUARD';ribs.frustumCulled=false;house.add(ribs);
  }
  // Physical feed visible IN the pan; each pair of feeder lines belongs to a zone.
  const aPan=panCoords.filter(([x,y,z])=>z<0);
  const bPan=panCoords.filter(([x,y,z])=>z>=0);
  const panFillGeo=new THREE.CylinderGeometry(.405,.365,1,16);
  feedSurfaceA=new THREE.InstancedMesh(panFillGeo,feedFillMat,aPan.length);
  feedSurfaceB=new THREE.InstancedMesh(panFillGeo,feedFillMat,bPan.length);
  for(const [mesh,coords,name] of [[feedSurfaceA,aPan,'A'],[feedSurfaceB,bPan,'B']]){
    mesh.userData.panCoordinates=coords;mesh.name='visible feed contents '+name;
    mesh.frustumCulled=false;mesh.receiveShadow=true;house.add(mesh);
  }
  function updatePanContents(mesh,level){
    const tmp=new THREE.Object3D();
    for(let i=0;i<mesh.userData.panCoordinates.length;i++){
      const [x,_,z]=mesh.userData.panCoordinates[i];
      const height=level<.75?0:.105*level/100;
      tmp.position.set(x,.45+height/2,z);tmp.scale.set(1,height,1);tmp.rotation.set(0,0,0);
      tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  scatterCyl('feed cone hoppers',hopperCoords,.14,.35,.54,red,16);
  scatterCyl('hopper-metering-collar',panCoords.map(([x,y,z])=>[x,.99,z]),.12,.12,.11,silver,10);
  // Suspended cable and brackets: detail typical of chain / pan-feeder systems.
  for(const z of [-5.3,-1.8,1.8,5.3]){
    pipe(house,'feed suspension steel wire',[-33,5.45,z],[33,5.45,z],.012,bars,7);
    for(let x=-30;x<=30;x+=6){pipe(house,'feed line hanger',[x,5.45,z],[x,1.48,z],.014,bars,6)}
  }
  scatterCyl('feeder support hangers',hangerCoords,.023,.023,.39,bars,6);
  scatterCyl('nipple drinkers',nippleCoords,.025,.042,.20,copper,8);
  // Stainless hanging profile, anti-perch cable and real-looking drip cups.
  for(const z of [-5.3,-1.8,1.8,5.3]){
    const zw=z+.93;
    pipe(house,'DRINK-ANTI-PERCH-CABLE',[-33,1.02,zw],[33,1.02,zw],.012,bars,6);
    for(let x=-31;x<=31;x+=6){
      pipe(house,'DRINK-HEIGHT-ADJUST-HANGER',[x,5.45,zw],[x,.80,zw],.012,feedPipeMat,7);
    }
    // Pressure regulator / medicator on feed water line.
    box(house,'DRINK-LINE-PRESSURE-REGULATOR',-32,1.02,zw,.55,.67,.48,blue);
    cyl(house,'DRINK-REGULATOR-DIAL',-32,1.4,zw,.15,.15,.045,mat(0xecfafb),15,Math.PI/2);
    // End flushing valve and drain outside the house.
    pipe(house,'DRINK-FLUSH-RETURN',[32,.72,zw],[34,.40,zw],.055,waterGlass,10);
    cyl(house,'DRINK-FLUSH-VALVE',33,.52,zw,.12,.12,.17,yellow,10);
    const indicator=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),mat(0x0097d6,.1,.2,{emissive:0x0069bb,emissiveIntensity:.4}));
    indicator.position.set(-32,1.46,zw);house.add(indicator);waterIndicators.push(indicator);
  }
  instanceRing('WATER-DRIP-CUP-RIMS',nippleCoords.map(([x,y,z])=>[x,.39,z]),.085,.013,blue);
  scatterCyl('WATER-DRIP-CUPS',nippleCoords.map(([x,y,z])=>[x,.37,z]),.087,.064,.035,blue,12);
  const feedPulse=[];
  for(const z of [-5.3,-1.8,1.8,5.3]){
    for(const x of [-21,-7,7,21]){
      const pulse=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat(0x384441,.05,.4,{emissive:0x0b281a,emissiveIntensity:.2}));
      pulse.position.set(x,1.45,z);house.add(pulse);feedPulse.push(pulse);
    }
  }
  // Gas radiant heaters on roof / within side area
  const heaters=[];
  for(const x of [-21,5,26]){
    for(const z of [-6.7,6.7]){
      box(house,'infrared heater housing',x,4.9,z,1.05,.22,.65,dark);
      const element=box(house,'heater element',x,4.75,z,.84,.045,.42,mat(0x7c3c25,0,.7,{emissive:0xb45b26,emissiveIntensity:.22}),false);
      heaters.push(element);
    }
  }
  // Feed silo outside house and pressure water tanks
  for(const [i,x] of [0,1].entries()){
    const z=-17.7;
    cyl(world,'feed silo body',x===0?-19:19,5.2,z,2.65,2.65,6.9,insulator,24);
    cyl(world,'silo conical outlet',x===0?-19:19,1.7,z,2.6,.22,2.0,silver,24);
    cyl(world,'silo conical roof',x===0?-19:19,9.8,z,.2,2.8,2.2,silver,24);
    for(const dz of [-2.1,2.1]) for(const dx of [-2.1,2.1]){
      box(world,'silo steel support',(x===0?-19:19)+dx,1,z+dz,.12,2.0,.12,bars);
    }
    // The actual auger geometry is created in the integrated FEED-EXTERIOR-HEADER network above.
  }
  const pumpBody=box(world,'water booster pump',10,.65,-20,1.2,.9,.9,blue);
  const pumpLamp=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),mat(0x0c4d38,0,.2,{emissive:0x00ff9a,emissiveIntensity:.12}));
  pumpLamp.position.set(10,1.2,-19.45);world.add(pumpLamp);
  const tank=cyl(world,'water tank',4,2.7,-21.5,2.45,2.45,4.7,blue,24); tank.material=mat(0x3c829c,.18,.49);
  cyl(world,'tank lid',4,5.17,-21.5,2.55,2.55,.15,dark,24);
  box(world,'backup generator enclosure',30,1.45,-21.5,6,2.9,3.8,mat(0x507f78,.45,.6));
  for(let k=0;k<5;k++)box(world,'generator ventilation slats',30.6,1.2+k*.22,-19.55,2.7,.075,.03,dark,false);
  box(world,'transformer electrical cabinet',27,1.05,-12,2.2,2.1,1.45,mat(0x7c8e98,.45,.52));
  // Models supplied by project owner. Keep procedural fallback if any source fails.
  const importedEquipment=new THREE.Group(); importedEquipment.name='User supplied agricultural equipment';world.add(importedEquipment);
  const installedModels={silos:0,generator:false,waterTank:false};
  function placeAsset(source,pos,targetHeight,yaw=0){
    source.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(source);
    const extent=new THREE.Vector3();bounds.getSize(extent);
    if(!Number.isFinite(extent.length())||extent.y<.0001)throw Error('Invalid model bounds');
    const fac=targetHeight/extent.y;
    // Wrapper transform ensures exact ground alignment regardless of model pivot.
    const wrapper=new THREE.Group();wrapper.position.set(pos[0],pos[1],pos[2]);wrapper.rotation.y=yaw;
    // Preserve the source's own FBX/GLB axis/scale conversions. Transform a parent instead.
    const normalizer=new THREE.Group();normalizer.scale.setScalar(fac);
    normalizer.position.set(-((bounds.min.x+bounds.max.x)/2)*fac,-bounds.min.y*fac,-((bounds.min.z+bounds.max.z)/2)*fac);
    normalizer.add(source);wrapper.add(normalizer);
    source.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    importedEquipment.add(wrapper);
    return wrapper;
  }
  const glbLoader=new GLTFLoader();
  const auxModels={};
  Promise.allSettled([
    glbLoader.loadAsync('/models/grain_silo.glb').then(g=>{
      const source=g.scene;
      const tex=loader.load('/models/textures/silo_albedo_1024.jpg');tex.colorSpace=THREE.SRGBColorSpace;
      source.traverse(o=>{if(o.isMesh)o.material=mat(0xffffff,.45,.46,{map:tex})});
      for(const x of [-19,19])placeAsset(source.clone(true),[x,0,-17.7],10,Math.PI/3);
      installedModels.silos=2;
    }),
    glbLoader.loadAsync('/models/generator.glb').then(g=>{
      const source=g.scene;
      const tex=loader.load('/models/textures/generator_albedo_1024.jpg');tex.colorSpace=THREE.SRGBColorSpace;
      source.traverse(o=>{if(o.isMesh)o.material=mat(0xffffff,.38,.65,{map:tex})});
      // The supplied OBJ was exported Z-up. Rotate to Unity/Three Y-up BEFORE fit to ground.
      source.rotation.x=-Math.PI/2;source.updateMatrixWorld(true);
      placeAsset(source,[30,.20,-21.5],2.5,Math.PI/2);installedModels.generator=true;
    }),
    new FBXLoader().loadAsync('/models/water_tank.fbx').then(model=>{
      const tex=loader.load('/models/textures/water_tank_albedo_1024.jpg');tex.colorSpace=THREE.SRGBColorSpace;
      model.traverse(o=>{if(o.isMesh){o.material=mat(0xffffff,.23,.53,{map:tex});o.castShadow=false;}});
      placeAsset(model,[4,0,-21.5],5.0,0);installedModels.waterTank=true;
    })
  ]).then(results=>{
    results.forEach((v,i)=>{if(v.status==='rejected')console.warn('Equipment asset load failed:',i,v.reason)});
    if(installedModels.silos)world.children.forEach(o=>{if(o.name?.startsWith('feed silo')||o.name?.startsWith('silo conical')||o.name?.startsWith('silo steel'))o.visible=false;});
    if(installedModels.generator)world.children.forEach(o=>{if(o.name==='backup generator enclosure'||o.name==='generator ventilation slats')o.visible=false;});
    if(installedModels.waterTank)world.children.forEach(o=>{if(o.name==='water tank'||o.name==='tank lid')o.visible=false;});
  });
  // sensor indicators, warning beacons
  const sensors=[];
  for(const x of [-24,0,24]){
    for(const z of [-6,6]){
      const s=box(house,'IoT environment sensor',x,3.5,z,.35,.45,.22,mat(0xe6eaec,.1,.6));
      box(house,'sensor display',x,3.53,z+Math.sign(z)*.14,.22,.12,.02,mat(0x277f80,0,.3,{emissive:0x119daa,emissiveIntensity:.7}),false);
      sensors.push(s);
    }
  }
  const alarmLight=cyl(world,'roof siren beacon',38,6,0,.22,.22,.46,mat(0xb9473b,.1,.3,{emissive:0x100000}),15);
  // Only owner-supplied 3D bird assets are used; all poultry remain stationary.
  // Site overview is a separate lightweight seven-building 3D model.
  // Bird population is simulated in PoultryTwin, independently of visual GLB clones.
  const importedBirds = new THREE.Group();house.add(importedBirds);
  let roofVisible=false;roofs.forEach(r=>r.visible=roofVisible);
  let birdVisible=true;
  const importedBirdEntries=[];
  const birdModelStatus={loaded:0,errors:[]};
  function fitBirdModel(source,birdHeight=.72){
    source.updateMatrixWorld(true);
    const bound=new THREE.Box3().setFromObject(source);
    const ext=new THREE.Vector3();bound.getSize(ext);
    if(!Number.isFinite(ext.length())||ext.y<=0)throw Error('Invalid GLB: no Y height');
    const fact=birdHeight/ext.y;
    const holder=new THREE.Group();
    const normalizer=new THREE.Group();
    normalizer.scale.setScalar(fact);
    normalizer.position.set(-(bound.min.x+bound.max.x)*.5*fact,-bound.min.y*fact,-(bound.min.z+bound.max.z)*.5*fact);
    normalizer.add(source);holder.add(normalizer);
    source.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true}});
    return holder;
  }
  async function installBirdAsset(url,count){
    const gltf=await glbLoader.loadAsync(url);
    const source=gltf.scene;
    source.traverse(o=>{if(o.isMesh){
      // White birds only; clone the source material so non-bird models stay untouched.
      o.material=new THREE.MeshStandardMaterial({color:0xf5f5ed,roughness:.92,metalness:0,side:THREE.DoubleSide});
    }});
    for(let i=0;i<count;i++){
      // Five clear longitudinal service aisles. Avoid fixed feeders/drink-pipes.
      const {x,z,heading}=birdPositionForIndex(i);
      const b=fitBirdModel(source.clone(true),.73+rand()*.055);
      b.position.set(x,.153,z);b.rotation.y=rand()*Math.PI*2;
      b.userData={originX:x,originZ:z,stationary:true};
      // Wall-side birds face inwards. GLB positive-Z is the local forward convention.
      b.rotation.y=heading;
      importedBirds.add(b);importedBirdEntries.push(b);
    }
    birdModelStatus.loaded+=count;
  }
  Promise.allSettled([
    installBirdAsset('/models/hen_tripo.glb',150)
  ]).then(r=>{
    r.forEach((res,i)=>{if(res.status==='rejected'){birdModelStatus.errors.push(`${i}: ${String(res.reason)}`);console.warn('Bird asset failed:',res.reason)}});
    importedBirds.visible=birdVisible;
    // The status badge is optional in the compact top-HMI layout.
    const modelStatus = document.getElementById('modelStatus');
    if (modelStatus) modelStatus.textContent = birdModelStatus.loaded
      ? `تم تحميل ${birdModelStatus.loaded} نموذج دجاج من الحزم المرفقة • أقدامها على الأرض`:
        'تعذر تحميل مجسمات الدجاج المرفقة • لن تُعرض نماذج بديلة';
  });
  const poseMap={overview:[[39,30,42],[0,1,0]],inside:[[-4,4.7,1],[-18,1.5,0]],feeding:[[-14,5.8,9],[-14,.7,-1]],fans:[[45,9,13],[36,3,0]],cooling:[[-44,8,15],[-36,3,0]],outside:[[-36,19,-33],[0,3,0]]};
  function cameraPose(which){
    const [pos,target]=poseMap[which]||poseMap.overview;
    camera.position.set(...pos);controls.target.set(...target);controls.update();
    if(which==='inside'||which==='feeding')roofs.forEach(r=>r.visible=false);
  }
  const site=createSiteOverview({THREE,scene,canvas,camera,controls});
  let viewMode='site';
  world.visible=false; site.root.visible=true;
  site.cameraOverview();
  const enterHouse=(id)=>{
    viewMode='detail';site.root.visible=false;world.visible=true;
    controls.minDistance=1.1;controls.maxDistance=155;
    cameraPose('inside');
    scene.userData.selectedHouse=id;
  };
  const showSite=()=>{
    viewMode='site';world.visible=false;site.root.visible=true;
    site.cameraOverview();
  };
  let lowQuality=false;
  const houseThemeLabel=new THREE.Group();house.add(houseThemeLabel);
  const visual={
    setHouseVariant(houseId,roofColor){
      // Seven independently selected digital twins share one efficient renderer.
      // Different roof cladding tint + line highlighting are explicit house visual variants.
      applyHouseTheme({
        Color: THREE.Color,
        roofMaterial: roofmat,
        feederMaterial: pan, // pan is a MATERIAL, not a mesh (no .material property).
        waterIndicators,
        roofColor
      });
      scene.userData.selectedHouse=houseId; site.select(houseId);
    },
    get quality(){return lowQuality?'balanced':'high'},
    get assetStatus(){return {...installedModels,birds:birdModelStatus.loaded,birdErrors:[...birdModelStatus.errors]}},
    get visibleBirds(){return importedBirds.visible?importedBirdEntries.filter(b=>b.visible).length:0;},
    cameraPose(which){if(which==='site'||which==='overview'){showSite();return;}
      if(viewMode!=='detail')enterHouse(scene.userData.selectedHouse||'H01');cameraPose(which);},
    showSite, enterHouse, get viewMode(){return viewMode},
    highlightHouse(id){site.select(id);},
    onHouseSelect:null,
    toggleRoof(){roofVisible=!roofVisible;roofs.forEach(r=>r.visible=roofVisible);},
    toggleBirds(){birdVisible=!birdVisible;importedBirds.visible=birdVisible;},
    toggleQuality(){lowQuality=!lowQuality;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lowQuality?1:1.5));
      sun.castShadow=!lowQuality;renderer.shadowMap.enabled=!lowQuality;
      renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
    }
  };
  site.onChoose = id => visual.onHouseSelect?.(id);
  // Static water and feed connections: no animated transfer dots from tanks/silos.
  const clock=new THREE.Clock();let last=0;
  function resize(){
    const w=Math.max(10,canvas.clientWidth),h=Math.max(10,canvas.clientHeight);
    const dpr=renderer.getPixelRatio();
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    }
  }
  function loop(){
    requestAnimationFrame(loop);
    const dt=Math.min(clock.getDelta(),.07);
    resize();
    controls.update();
    if(camera.position.y<.47)camera.position.y=.47;
    const o=twin.outputs;
    const fanOn=[o.fan1,o.fan2,o.fan3,o.fan4];
    fanRotors.forEach((f,i)=>{if(fanOn[Math.min(3,Math.floor(i/1.5))])f.rotation.x+=dt*13;});
    const pulsed = o.cooling ? .9 : .12;
    pads.forEach(p=>p.material.emissive=new THREE.Color(0x2d5d67).multiplyScalar(pulsed));
    heaters.forEach((h,i)=>h.material.emissiveIntensity = (i%2===0?o.heaterA:o.heaterB)?2.2:.12);
    const daylight=twin.hour>=6 && twin.hour<18;
    // Actual light sources and material emission: switching lighting changes 3D scene illumination.
    hemi.intensity=daylight?.70:.09;
    sun.intensity=daylight?1.15:.035;
    fill.intensity=daylight?.22:.02;
    // Illuminance is driven by the real switch + HMI dimmer, including a distinct night state.
    const level=o.lights?(twin.lightDimmer/100):0;
    renderer.toneMappingExposure=daylight?(0.86+level*.25):(0.37+level*.71);
    workingLights.forEach(l=>l.intensity=level*14);
    lights.forEach(l=>l.material.emissiveIntensity=level*5.0);
    lightPools.forEach((p,i)=>{p.material.opacity=(i%2===0?.11:.95)*level;});
    waterIndicators.forEach(ind=>{ind.material.emissiveIntensity=(twin.water>3&&twin.pressure>.5)?1.4:0;ind.material.color.set((twin.water>3&&twin.pressure>.5)?0x19cfff:0x536978);});
    feedGear.forEach((gear,i)=>{gear.material.emissive=new THREE.Color((i===0?o.feedA:o.feedB)?0x0b4534:0x000000);});
    updatePanContents(feedSurfaceA,twin.panFillA);
    updatePanContents(feedSurfaceB,twin.panFillB);
    const hasWater=twin.water>2 && twin.pressure>.35;
    waterCores.forEach(({mesh})=>{mesh.visible=hasWater;mesh.material.emissiveIntensity=.18+(twin.pressure/4)*.26});
    drinkDrops.forEach(({mesh,line,phase})=>{
      mesh.visible=hasWater;mesh.position.y=.41-.065*Math.sin(clock.elapsedTime*3+phase);
    });
    // Poultry stay at their original assigned coordinates and fixed orientation.
    importedBirdEntries.forEach((b,i)=>{ b.visible=birdVisible; });
    inletBlades.forEach(b=>{b.rotation.x=(o.inlet/100)*.75;});
    feedPulse.forEach((p,i)=>{p.material.emissiveIntensity=((i%4<2?o.feedA:o.feedB)?2:.1);});
    pumpLamp.material.emissiveIntensity=o.waterPump?2.8:.08;
    alarmLight.material.emissive=new THREE.Color(o.alarm&&Math.sin(clock.elapsedTime*5)>0?0xff1111:0x080000);
    if(clock.elapsedTime-last>.055){last=clock.elapsedTime;}
    renderer.render(scene,camera);
  }
  window.addEventListener('resize',resize);
  loop();
  // Optional user replacement of the provided poultry models; Y-min anchored to floor.
  visual.loadBirdModel = async url=>{
    const gltf=await glbLoader.loadAsync(url);
    const source=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(source);
    const size=new THREE.Vector3();bounds.getSize(size);
    if(!Number.isFinite(size.length()) || size.y < 1e-5) throw Error('Invalid GLB dimensions');
    importedBirds.clear(); importedBirdEntries.length=0;birdModelStatus.loaded=0;
    source.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({color:0xf5f5ed,roughness:.91})});
    for(let i=0;i<150;i++){
      const b=fitBirdModel(source.clone(true),.75);
      const {x,z,heading}=birdPositionForIndex(i);
      b.position.set(x,.153,z);b.rotation.y=heading;
      b.userData={originX:x,originZ:z,stationary:true};
      importedBirds.add(b); importedBirdEntries.push(b);
    }
    importedBirds.visible=birdVisible;birdModelStatus.loaded=importedBirds.children.length;
    return importedBirds.children.length;
  };
  visual.loadModel = async url=>{
    const gltf=await new GLTFLoader().loadAsync(url);
    const object=gltf.scene;object.position.set(0,.6,0);scene.add(object);return object;
  };
  return visual;
}
