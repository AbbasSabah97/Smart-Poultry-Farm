import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PoultryTwin} from '../src/farm.js';
const base=new URL('../',import.meta.url);
const read=x=>readFileSync(new URL(x,base),'utf8');
test('HMI forced OFF actually drives lighting output OFF in AUTO',()=>{
 const p=new PoultryTwin();p.hour=12;p.setControl('lightOverride',false);p.update(.02);
 assert.equal(p.outputs.lights,false);
 assert.equal(p.snapshot.lightOverride,false);
});
test('HMI forced ON also controls lighting during MANUAL',()=>{
 const p=new PoultryTwin();p.setControl('mode','MANUAL');p.setControl('lightOverride',true);p.update(.01);
 assert.equal(p.outputs.lights,true);
});
test('HMI schedule release restores programmed automatic lighting',()=>{
 const p=new PoultryTwin();p.hour=12;p.setControl('lightOverride',false);p.update(.01);
 p.setControl('lightOverride',null);p.update(.01);assert.equal(p.outputs.lights,true);
});
test('feed pan content is independent from feed silo level',()=>{
 const p=new PoultryTwin();p.setControl('emptyPans');assert.equal(p.panFillA,0);assert.equal(p.panFillB,0);
 assert.ok(p.feed>0);p.setControl('fillPans');assert.equal(p.panFillA,100);
});
test('manual feed auger refills the physical feed tray levels',()=>{
 const p=new PoultryTwin();p.setControl('emptyPans');p.setControl('mode','MANUAL');
 p.setControl('feedA',true);p.update(.1);assert.ok(p.panFillA>0);
});
test('empty water tank gives zero liquid supply',()=>{
 const p=new PoultryTwin();p.setControl('emptyWater');p.update(.02);
 assert.equal(p.water,0);assert.equal(p.snapshot.flowA,0);
});
test('model filenames packaged for both birds and all three equipment types',()=>{
 for(const f of ['chicken_realistic.glb','hen_tripo.glb','grain_silo.glb','generator.glb','water_tank.fbx']){
  assert.ok(existsSync(new URL('public/models/'+f,base)),f);
 }
});
test('end walls no longer use solid opaque 16m end-wall sheets',()=>{
 const scene=read('src/scene.js');
 assert.ok(scene.includes('cooling end low sill'));
 assert.ok(scene.includes('fan end lower sill'));
 assert.ok(!scene.includes("'north end wall'"));
 assert.ok(!scene.includes("'south end wall'"));
});
test('ground correction uses model Y minimum, not constant model pivot',()=>{
 const scene=read('src/scene.js');
 assert.match(scene,/\-bound\.min\.y\*fact/);
 assert.match(scene,/b\.position\.set\(x,\.153,z\)/);
});
test('light fixtures use dimmable spotlights and feed pans have physical fill mesh',()=>{
 const scene=read('src/scene.js');
 assert.match(scene,/new THREE\.SpotLight/);
 assert.match(scene,/workingLights\.forEach\(l=>l\.intensity=level\*14\)/);
 assert.match(scene,/updatePanContents\(feedSurfaceA,twin\.panFillA\)/);
});
test('top-only HMI shows selected house data without side panel',()=>{
 const html=read('index.html'),ui=read('src/fleet-ui.js');
 for(const key of ['selectedSummary','selectedTemp','selectedFeed','selectedWater','selectedAlarms','housePicker','siteBtn','insideBtn']){
  assert.ok(html.includes('id="'+key+'"'),key);if(key!=='selectedSummary')assert.ok(ui.includes(key),key);
 }
 assert.ok(!html.includes('<aside>'));
});
