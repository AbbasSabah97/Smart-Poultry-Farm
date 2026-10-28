import {PoultryTwin} from './farm.js';

// Seven independent simulation instances. SIMULATION ONLY. Not a live PLC command source.
export const HOUSE_PROFILES = Object.freeze([
  {id:'H01',name:'الحظيرة 01 — شمال',zone:'NORTH',roof:'#7b9ab0',birds:15000,age:7, outside:36,cameras:3,silos:2,panLines:4,waterLines:4,variant:'brooding'},
  {id:'H02',name:'الحظيرة 02 — شمال أوسط',zone:'NORTH',roof:'#5e8c86',birds:15000,age:14,outside:35,cameras:3,silos:2,panLines:4,waterLines:4,variant:'growth'},
  {id:'H03',name:'الحظيرة 03 — شرقي',zone:'EAST',roof:'#b69c78',birds:15000,age:21,outside:37,cameras:4,silos:2,panLines:4,waterLines:4,variant:'tunnel'},
  {id:'H04',name:'الحظيرة 04 — مركزي',zone:'CENTER',roof:'#8f9ea5',birds:15000,age:14,outside:36,cameras:4,silos:2,panLines:4,waterLines:4,variant:'hybrid'},
  {id:'H05',name:'الحظيرة 05 — غربي',zone:'WEST',roof:'#7a9487',birds:15000,age:28,outside:38,cameras:4,silos:2,panLines:4,waterLines:4,variant:'tunnel'},
  {id:'H06',name:'الحظيرة 06 — جنوبي أوسط',zone:'SOUTH',roof:'#9a8f82',birds:15000,age:10,outside:36,cameras:3,silos:2,panLines:4,waterLines:4,variant:'brooding'},
  {id:'H07',name:'الحظيرة 07 — جنوب',zone:'SOUTH',roof:'#64899c',birds:15000,age:35,outside:37,cameras:4,silos:2,panLines:4,waterLines:4,variant:'finishing'}
]);
export class PoultryFleet {
  constructor(){
    this.houses=HOUSE_PROFILES.map((p,i)=>{
      const twin=new PoultryTwin(); twin.houseId=p.id; twin.age=p.age; twin.outside=p.outside;
      twin.birds=p.birds; twin.tempA=27+(i%3)*.4; twin.tempB=twin.tempA+.25;
      twin.feed=85-i*3; twin.water=88-i*2;
      twin.log(`${p.id}: بيانات تجريبية مستقلة`);
      return {profile:p,twin};
    });
    this.selectedIndex=0;
    this.proxy=new Proxy({}, {
      get:(_target,key)=>{
        const twin=this.selected.twin, value=twin[key];
        return typeof value==='function'?value.bind(twin):value;
      },
      set:(_target,key,value)=>{this.selected.twin[key]=value;return true},
      has:(_target,key)=>key in this.selected.twin
    });
  }
  get selected(){return this.houses[this.selectedIndex]}
  select(id){const next=this.houses.findIndex(x=>x.profile.id===id);if(next<0)throw Error('Unknown house');this.selectedIndex=next;return this.selected}
  step(dt){for(const h of this.houses)h.twin.update(dt)}
  summary(){return this.houses.map(({profile,twin})=>({id:profile.id,name:profile.name,age:+twin.age.toFixed(1),temp:+((twin.tempA+twin.tempB)/2).toFixed(1),humidity:+twin.humidity.toFixed(0),feed:+twin.feed.toFixed(0),water:+twin.water.toFixed(0),co2:+twin.co2.toFixed(0),nh3:+twin.nh3.toFixed(1),mode:twin.mode,alarms:twin.alarms.length,birds:twin.birds,source:'SIMULATION'}))}
  csv(){const rows=['house_id,source,age_days,temp_a_c,temp_b_c,rh_percent,co2_ppm,nh3_ppm,feed_percent,water_percent,alarm_count'];for(const h of this.houses){const t=h.twin;rows.push([h.profile.id,'SIMULATION',t.age.toFixed(1),t.tempA.toFixed(1),t.tempB.toFixed(1),t.humidity.toFixed(0),t.co2.toFixed(0),t.nh3.toFixed(1),t.feed.toFixed(0),t.water.toFixed(0),t.alarms.length].join(','))}return rows.join('\n')}
}
