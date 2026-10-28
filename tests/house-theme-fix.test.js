import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyHouseTheme} from '../src/house-theme.js';

class Color {
  constructor(value){this.value=value}
  copy(other){this.value=other.value;return this}
  lerp(other,t){this.value={base:this.value,to:other.value,t};return this}
  set(value){this.value=value;return this}
}
function material(){return {color:new Color('before')}}

test('regression: selecting a house updates the material directly, not a missing .material.color',()=>{
  const roofMaterial=material(),feederMaterial=material();
  const indicators=[{material:material()},{material:material()}];
  assert.doesNotThrow(()=>applyHouseTheme({Color,roofMaterial,feederMaterial,
    waterIndicators:indicators,roofColor:'#5e8c86'}));
  assert.equal(roofMaterial.color.value,'#5e8c86');
  assert.deepEqual(feederMaterial.color.value,{base:0xbf4430,to:'#5e8c86',t:.12});
  assert.equal(indicators[0].material.color.value,0x0f94d2);
  assert.equal(indicators[1].material.color.value,0x13b5df);
});
test('house theme gives an explicit error if materials are wrong',()=>{
  assert.throws(()=>applyHouseTheme({Color,roofMaterial:material(),feederMaterial:{},roofColor:'#fff'}),
    /requires material objects/);
});
test('scene passes feeder material, not mesh.material, to theme helper',()=>{
  const src=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  assert.match(src,/feederMaterial:\s*pan/);
  assert.doesNotMatch(src,/pan\.material\.color/);
});
test('bird model status update is optional and cannot crash async asset loading',()=>{
  const src=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  assert.match(src,/if \(modelStatus\) modelStatus\.textContent/);
});
test('telemetry HMI is initialized independently if 3D WebGL fails',()=>{
  const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(src,/visual=\{showSite:unavailable/);
  assert.match(src,/initFleetUI\(fleet,visual\)/);
});
