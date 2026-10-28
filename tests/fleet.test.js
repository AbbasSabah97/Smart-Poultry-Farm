import test from 'node:test';import assert from 'node:assert/strict';
import {PoultryFleet,HOUSE_PROFILES} from '../src/fleet.js';
test('seven independently instantiated houses',()=>{
 const f=new PoultryFleet();assert.equal(f.houses.length,7);assert.equal(new Set(f.houses.map(x=>x.twin)).size,7);
 assert.equal(f.houses.every(x=>x.profile.birds===15000),true);
});
test('selected proxy only affects targeted house',()=>{
 const f=new PoultryFleet();f.select('H04');f.proxy.setControl('outside',45);
 assert.equal(f.houses[3].twin.outside,45);assert.notEqual(f.houses[0].twin.outside,45);
});
test('all houses advance without active switching',()=>{
 const f=new PoultryFleet();const before=f.houses.map(x=>x.twin.elapsed);
 f.step(.05);assert.equal(f.houses.every((x,i)=>x.twin.elapsed>before[i]),true);
});
test('independent alarm and CSV source labels',()=>{
 const f=new PoultryFleet();f.houses[4].twin.fire=true;
 assert.equal(f.summary()[4].alarms>0,true);assert.equal(f.summary()[0].alarms,0);
 assert.equal(f.csv().split('\n').length,8);assert.match(f.csv(),/SIMULATION/);
});
test('invalid house identifiers refused',()=>{assert.throws(()=>new PoultryFleet().select('H99'))});
