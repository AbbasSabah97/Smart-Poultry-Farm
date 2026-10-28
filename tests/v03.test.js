import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PoultryTwin} from '../src/farm.js';
const read=p=>readFileSync(new URL('../'+p, import.meta.url),'utf8');
const scene=read('src/scene.js');
const ui=read('src/fleet-ui.js');
const html=read('index.html');
test('NO procedural chicken templates are generated',()=>{
  for(const pattern of ['birdPart(', 'flockRoot', 'drawBirds(', 'new THREE.InstancedMesh(g,material,flockCount)']) assert.ok(!scene.includes(pattern));
});
test('Only owner-supplied GLB white chickens, 150 visible in high quality',()=>{
  assert.ok(!scene.includes("installBirdAsset('/models/chicken_realistic.glb',13)"));
  assert.ok(scene.includes("installBirdAsset('/models/hen_tripo.glb',150)"));
  assert.ok(scene.includes('fitBirdModel(source.clone(true),.73+rand()*.055)'));
});
test('Z-up generator is corrected before ground fitting',()=>{
  assert.ok(scene.includes('source.rotation.x=-Math.PI/2'));
  assert.ok(scene.indexOf('source.rotation.x=-Math.PI/2') < scene.indexOf('placeAsset(source,[30,.20,-21.5],2.5'));
});
test('Silos, water tank and genset are connected to barn systems',()=>{
 for(const label of ['ENCLOSED-AUGER','FEED-EXTERIOR-HEADER','FEED-FILL-CONNECTION',
 'RAW-WATER-TANK-OUTLET','WATER-PUMP-DISCHARGE','FILTER-OUTLET-TO-BARN','WATER-DOWNPIPE-TO-DRINKER',
 'GENERATOR-POWER-CONDUIT','GENERATOR-ATS-LOOP','ATS-TO-HOUSE-SUPPLY'])assert.ok(scene.includes(label),label);
});
test('Additional realistic feeders and drinker details are present',()=>{
 for(const label of ['PAN-RIM-rolled-steel','PAN-FEED-GUARD','hopper-metering-collar','WATER-DRIP-CUP-RIMS','DRINK-LINE-PRESSURE-REGULATOR']) assert.ok(scene.includes(label),label);
});
test('new site interface removes old light control sidebar, preserves engine dimmer API',()=>{
 assert.ok(!html.includes('data-action="lightsOn"'));
 const p=new PoultryTwin();p.setControl('lightDimmer',30);assert.equal(p.lightDimmer,30);
 assert.ok(ui.includes('selectedSummary')||html.includes('selectedSummary'));
});
test('Dimmer is bounded to 0..100',()=>{
 const twin=new PoultryTwin();twin.setControl('lightDimmer',-1);assert.equal(twin.lightDimmer,0);
 twin.setControl('lightDimmer',999);assert.equal(twin.lightDimmer,100);
 twin.setControl('lightOverride',false);twin.update(.01);assert.equal(twin.outputs.lights,false);
});
test('Night test sets virtual simulation clock and illumination schedule respects the hour',()=>{
 const twin=new PoultryTwin();twin.setControl('lightOverride',null);twin.setControl('nightTest',true);
 assert.equal(twin.hour,22);twin.update(.01);assert.equal(twin.outputs.lights,true);
 twin.setControl('nightTest',false);assert.equal(twin.hour,12);
});
