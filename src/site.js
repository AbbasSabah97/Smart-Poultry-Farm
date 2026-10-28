// Lightweight 3D site overview. 7 independent building meshes with click selection.
// The detailed interior GLB model is reused on demand to fit Intel integrated GPUs.
import {HOUSE_LAYOUT} from './site-plan.js';
export function createSiteOverview({THREE,scene,canvas,camera,controls}) {
  const root=new THREE.Group();root.name='SEVEN_HOUSES_3D_SITE';scene.add(root);
  const zones=new Map(), pickables=[];
  const material=(hex,metalness=.06,roughness=.8)=>new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
  const soil=material(0x60765a),wall=material(0xcbd4d4),concrete=material(0xa7afb0);
  const steel=material(0x65737d,.35,.6),dark=material(0x243a4b),blue=material(0x4a9bbb),glass=material(0x80aeba,.06,.32);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(415,250),soil);
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.24,0);ground.receiveShadow=true;root.add(ground);
  function box(parent,w,h,d,x,y,z,mat,name=''){
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.name=name;parent.add(o);return o;
  }
  function cylinder(parent,rt,rb,h,x,y,z,mat,seg=14){
    const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);
    o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
  }
  function tagText(group,id){
    const can=document.createElement('canvas');can.width=256;can.height=96;
    const cx=can.getContext('2d');cx.fillStyle='#073750';cx.fillRect(0,0,256,96);
    cx.strokeStyle='#69d6e1';cx.lineWidth=6;cx.strokeRect(3,3,250,90);
    cx.font='bold 58px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#fff';cx.fillText(id,128,50);
    const tx=new THREE.CanvasTexture(can);tx.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(9,3.4),new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide,transparent:true}));
    sign.rotation.x=-Math.PI/2;sign.position.set(0,7.9,0);group.add(sign);return sign;
  }
  const road=material(0x47555d);
  for(const z of [-106,5,118])box(root,403,.08,9,0,-.12,z,road,'service road');
  for(const x of [-184,-91,2,95,188])box(root,8,.06,244,x,-.10,0,road,'crossroad');
  HOUSE_LAYOUT.forEach((point,i)=>{
    const g=new THREE.Group();g.position.set(point.x,0,point.z);g.name=`HOUSE_3D_${point.id}`;
    g.userData.houseId=point.id;root.add(g);zones.set(point.id,g);
    const foundation=box(g,74,.3,18,0,.06,0,concrete,'foundation');
    const shell=box(g,72,5.2,16,0,2.72,0,wall,'walls');
    const roofMat=material([0x839dab,0x67908b,0xa99579,0x7b99a5,0x688d86,0x999081,0x6189a0][i],.35,.56);
    const roofMeshes=[];
    for(const side of [-1,1]){
      const m=new THREE.Mesh(new THREE.BoxGeometry(73,.22,8.3),roofMat);
      m.position.set(0,6.25,side*4.0);m.rotation.x=-side*.22;
      m.castShadow=true;g.add(m);roofMeshes.push(m);
    }
    // Steel service doors, vents, end wall cooling and exhausts visible on site overview
    for(const x of [-26,-12,2,16,30]){
      for(const z of [-8.13,8.13])box(g,3.1,.6,.10,x,4.5,z,dark,'louver vent');
    }
    box(g,.14,3.2,2.1,-36.12,2.6,0,blue,'cooling pad header');
    box(g,.14,4.1,12,-36.18,2.7,0,material(0x7199a1),'cooling facade');
    for(let n=0;n<6;n++){
      const fan=cylinder(g,1.03,1.03,.13,36.16,3.1,-6.6+n*2.65,dark,20);
      fan.rotation.z=Math.PI/2;fan.name='exhaust axial fan';
      cylinder(g,.38,.38,.18,36.30,3.1,-6.6+n*2.65,steel,12).rotation.z=Math.PI/2;
    }
    for(const x of [-18,18]){
      cylinder(g,2.15,2.15,5.5,x,4.3,-18.5,material(0xc5c8c5,.36,.5));
      cylinder(g,.3,2.15,1.65,x,.7,-18.5,steel);
      cylinder(g,.08,2.25,1.1,x,7.65,-18.5,steel);
    }
    cylinder(g,2.2,2.2,4.2,4,2.2,-21.3,material(0x5d9cb4,.2,.5));
    box(g,7,2.3,3.7,28,1.2,-22.0,material(0x507c75,.2,.6),'generator');
    // Roof tag is also clickable; mesh parent identity is resolved by ancestor walk.
    tagText(g,point.id);
    g.userData.roofMeshes=roofMeshes;
    pickables.push(g);
  });
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let selected='H01', down=null;
  function select(id){
    if(!zones.has(id))return;
    selected=id;
    zones.forEach((group,name)=>{
      const active=name===selected;
      group.userData.roofMeshes.forEach(m=>{
        m.material.emissive=new THREE.Color(active?0x0e718c:0x000000);
        m.material.emissiveIntensity=active?.38:0;
      });
    });
  }
  function clickSite(e){
    if(!root.visible||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;
    const r=canvas.getBoundingClientRect();
    mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));
    raycaster.setFromCamera(mouse,camera);
    const intersects=raycaster.intersectObjects(pickables,true);
    for(const hit of intersects){
      let ob=hit.object;
      while(ob&&!ob.userData.houseId)ob=ob.parent;
      if(ob?.userData?.houseId){select(ob.userData.houseId);api.onChoose?.(ob.userData.houseId);break;}
    }
  }
  const pointerDown=e=>{down={x:e.clientX,y:e.clientY}},pointerUp=e=>{clickSite(e);down=null};
  canvas.addEventListener('pointerdown',pointerDown);
  canvas.addEventListener('pointerup',pointerUp);
  function cameraOverview(){
    camera.position.set(176,173,223);controls.target.set(0,0,0);
    controls.minDistance=10;controls.maxDistance=750;controls.update();
  }
  const api={root,select,cameraOverview,onChoose:null,dispose(){canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp)}};
  select(selected);return api;
}
