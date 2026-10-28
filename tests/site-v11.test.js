import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {HOUSE_LAYOUT,HOUSE_VISUAL_COUNT,BIRD_LANES,birdHeadingForLane,birdPositionForIndex} from '../src/site-plan.js';
const base=new URL('../',import.meta.url);
const read=f=>readFileSync(new URL(f,base),'utf8');
test('7 site house meshes with distinct coordinates',()=>{
 assert.equal(HOUSE_LAYOUT.length,7);assert.equal(new Set(HOUSE_LAYOUT.map(p=>p.id)).size,7);
 assert.equal(new Set(HOUSE_LAYOUT.map(p=>`${p.x},${p.z}`)).size,7);
});
test('150 stationary birds preserve five aisle layout',()=>{
 assert.equal(HOUSE_VISUAL_COUNT,150);assert.equal(BIRD_LANES.length,5);
 assert.equal(birdPositionForIndex(0).x,-30.9);
 assert.equal(birdPositionForIndex(149).z,7.25);
 assert.equal(new Set(Array.from({length:150},(_,i)=>JSON.stringify(birdPositionForIndex(i)))).size,150);
});
test('birds at wall face the center of the barn',()=>{
 assert.equal(birdHeadingForLane(0),0);
 assert.equal(birdHeadingForLane(4),Math.PI);
});
test('bird positions never leave usable floor bounds',()=>{
 for(let i=0;i<150;i++){
  const p=birdPositionForIndex(i);assert.ok(p.x>-36&&p.x<36);assert.ok(p.z>-8&&p.z<8);
 }
});
test('scene has no animation for bird legs, body or walking',()=>{
 const scene=read('src/scene.js');assert.ok(!scene.includes('userData.walking'));
 assert.ok(!scene.includes('legs.forEach'));
 assert.ok(scene.includes('stationary:true'));
});
test('animated grain and tank transfer particles removed',()=>{
 const scene=read('src/scene.js');
 for(const s of ['transferFlows','flowDots(world','dot.position.lerpVectors'])assert.ok(!scene.includes(s),s);
});
test('HMI has upper data strip and no sidebar or network gateway UI',()=>{
 const html=read('index.html');
 assert.ok(html.includes('selectedSummary'));
 assert.ok(html.includes('housePicker'));
 assert.ok(!html.includes('<aside>'));
 assert.ok(!html.includes('monitorSection'));
});
test('the two gateway executables and workflow steps were removed',()=>{
 assert.ok(!existsSync(new URL('field_gateway/',base)));
 assert.ok(!existsSync(new URL('monitoring/',base)));
 const wf=read('.github/workflows/windows.yml');
 assert.ok(!wf.includes('PoultryMonitoringGateway'));
 assert.ok(!wf.includes('PoultryFleetGateway'));
});
test('rooster icon generated for web and Tauri Windows installer',()=>{
 for(const f of ['public/favicon.png','public/rooster-icon.svg','src-tauri/icons/icon.ico','src-tauri/icons/icon.png'])
  assert.ok(existsSync(new URL(f,base)));
});
test('3D site supports raycaster selection and interior detail switching',()=>{
 const site=read('src/site.js');const scene=read('src/scene.js');
 assert.ok(site.includes('raycaster.intersectObjects'));
 assert.ok(site.includes('pointerup'));
 assert.ok(scene.includes('showSite'));
 assert.ok(scene.includes('enterHouse'));
});
test('balanced mode retains 150 birds rather than hiding 90',()=>{
 const scene=read('src/scene.js');
 assert.ok(scene.includes('b.visible=birdVisible;'));
 assert.ok(!scene.includes('i<60'));
});
test('selected bird count appears above scene',()=>{
 const html=read('index.html');const ui=read('src/fleet-ui.js');
 assert.ok(html.includes('id="selectedBirds"'));
 assert.ok(ui.includes("selectedBirds:'150"));
});
