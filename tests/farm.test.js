import test from 'node:test';
import assert from 'node:assert/strict';
import {PoultryTwin,temperatureForAge} from '../src/farm.js';
test('setpoint drops with age',()=>{
  assert.equal(temperatureForAge(0),32);
  assert.equal(temperatureForAge(14),27);
  assert.equal(temperatureForAge(42),20);
});
test('AUTO includes stage-1 minimum ventilation',()=>{
  const e=new PoultryTwin();e.update(.1);
  assert.equal(e.outputs.fan1,true);
});
test('high temperature calls additional ventilation and cooling',()=>{
  const e=new PoultryTwin();e.tempA=36;e.tempB=35;e.update(.1);
  assert.equal(e.outputs.fan4,true);
  assert.equal(e.outputs.cooling,true);
});
test('low temperature enables heating',()=>{
  const e=new PoultryTwin();e.tempA=18;e.tempB=18;e.update(.1);
  assert.equal(e.outputs.heaterA,true);
  assert.equal(e.outputs.heaterB,true);
});
test('fire disables active heater/feed actuator commands',()=>{
  const e=new PoultryTwin();e.tempA=18;e.fire=true;e.update(.1);
  assert.equal(e.outputs.heaterA,false);
  assert.equal(e.outputs.feedA,false);
  assert.ok(e.alarms.includes('إنذار حريق'));
});
test('manual mode selectively toggles outputs',()=>{
  const e=new PoultryTwin();e.setControl('mode','MANUAL');e.setControl('fan2',true);e.update(.1);
  assert.equal(e.outputs.fan2,true);assert.equal(e.outputs.fan3,false);
});
test('outage triggers generator indicator and alert',()=>{
  const e=new PoultryTwin();e.setControl('power',false);e.update(.1);
  assert.equal(e.outputs.generator,true);
  assert.ok(e.alarms.some(x=>x.includes('الكهرباء')));
});
test('numeric settings clamp',()=>{
  const e=new PoultryTwin();e.setControl('speed',999);e.setControl('age',-1);
  assert.equal(e.speed,240);assert.equal(e.age,0);
});
test('CSV headers export and refill',()=>{
  const e=new PoultryTwin();e.feed=10;e.water=13;e.setControl('refill');
  assert.equal(e.feed,100);assert.equal(e.water,100);
  assert.ok(e.csv().startsWith('sim_min,zone_A_C'));
});
test('weather and sensor alarms do not crash simulation loop',()=>{
  const e=new PoultryTwin();e.setControl('fanFault',true);e.setControl('sensorFault',true);
  for(let i=0;i<100;i++)e.update(.1);
  assert.ok(Number.isFinite(e.tempA));assert.ok(e.alarms.length>=2);
});
