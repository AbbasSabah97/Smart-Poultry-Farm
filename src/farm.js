// Educational digital twin only. Never connect this control loop to real livestock equipment.
export const clamp = (n,lo,hi)=>Math.min(hi,Math.max(lo,n));
export const temperatureForAge = (age) => {
  const curve = [[0,32],[3,31],[7,29],[14,27],[21,24],[28,22],[35,21],[42,20]];
  age=clamp(age,0,42);
  for(let i=1;i<curve.length;i++) {
    if(age<=curve[i][0]){
      const [da,ta]=curve[i-1], [db,tb]=curve[i];
      return ta+(tb-ta)*(age-da)/(db-da);
    }
  }
  return 20;
};
export class PoultryTwin {
  constructor(){
    this.age=14; this.birds=15000; this.tempA=27.1; this.tempB=27.4;
    this.humidity=56; this.nh3=8; this.co2=1450;
    this.feed=78;this.water=86;this.pressure=2.7;
    this.panFillA=76;this.panFillB=63;this.flowA=1.2;this.flowB=1.1;
    this.outside=36;this.outHumidity=38;this.mode='AUTO';
    this.speed=30;this.hour=11.5;this.elapsed=0;this.energy=0;
    this.totalFeed=0;this.totalWater=0;this.lightOverride=null;this.lightDimmer=100;this.power=true;this.fanFault=false;
    this.leak=false;this.estop=false;this.fire=false;this.sensorFault=false;
    this.outputs={fan1:true,fan2:true,fan3:false,fan4:false,heaterA:false,heaterB:false,cooling:false,feedA:false,feedB:false,waterPump:false,lights:true,generator:false,alarm:false,inlet:34};
    this.manual={};Object.keys(this.outputs).forEach(k=>this.manual[k]=false);
    this.events=[];this.trend=[];this.log('المحاكاة جاهزة، وضع التدريب فقط');
  }
  log(msg){this.events.unshift({time:this.hour.toFixed(1),msg}); if(this.events.length>40)this.events.pop();}
  setControl(name,value){
    if(name==='mode' && ['AUTO','MANUAL'].includes(value)){this.mode=value;this.log('وضع '+value);return;}
    if(['age','outside','speed'].includes(name)){
      const lim={age:[0,42],outside:[5,52],speed:[1,240]};
      this[name]=clamp(Number(value)||0,...lim[name]);return;
    }
    if(name==='refill'){this.feed=100;this.water=100;this.pressure=2.7;this.log('ملء السايلو وخزان الماء (تجريبي)');return;}
    if(name==='emptyPans'){this.panFillA=0;this.panFillB=0;this.log('تفريغ جميع المعالف لأغراض الاختبار');return;}
    if(name==='fillPans'){this.panFillA=100;this.panFillB=100;this.log('ملء المعالف لأغراض الاختبار');return;}
    if(name==='emptyWater'){this.water=0;this.pressure=0;this.log('تفريغ خزان المياه للتجربة');return;}
    if(name==='lightDimmer'){this.lightDimmer=clamp(Number(value)||0,0,100);return;}
    if(name==='nightTest'){this.hour=value?22:12;this.log(value?'محاكاة ليلية':'محاكاة نهارية');return;}
    if(name==='lightOverride'){
      if(value===null||typeof value==='boolean'){
        this.lightOverride=value;
        if(typeof value==='boolean')this.manual.lights=value;
        this.log(value===null?'تم إرجاع الإنارة إلى الجدول':'الإنارة: تجاوز يدوي '+(value?'ON':'OFF'));
      }
      return;
    }
    if(['power','fanFault','leak','estop','fire','sensorFault'].includes(name)){
      this[name]=!!value;this.log(`${name} = ${value}`);return;
    }
    if(name in this.manual) this.manual[name]=!!value;
  }
  get setpoint(){return temperatureForAge(this.age)}
  update(realSeconds){
    const dt=clamp(realSeconds,0,.12)*this.speed;
    if(dt<=0)return;
    this.elapsed+=dt;
    this.hour=(this.hour+dt/3600)%24;
    this.age=Math.min(42,this.age+dt/86400);
    const sp=this.setpoint, hot=Math.max(this.tempA,this.tempB), coolAllowed=this.humidity<80;
    const A=this.outputs;
    if(this.mode==='AUTO'){
      A.fan1=true; // minimum ventilation is never switched off by user interface
      A.fan2=(hot>sp+.7 || this.co2>1800 || this.nh3>14);
      A.fan3=(hot>sp+1.8 || this.co2>2500 || this.nh3>22);
      A.fan4=(hot>sp+3.1 || this.co2>3200 || this.nh3>28);
      A.heaterA=this.tempA<sp-.8;
      A.heaterB=this.tempB<sp-.8;
      A.cooling=hot>sp+2.3 && coolAllowed;
      A.feedA=(this.elapsed%900)<130 && this.feed>2;
      A.feedB=(this.elapsed%900)>=65 && (this.elapsed%900)<195 && this.feed>2;
      A.waterPump=this.pressure<2.4;
      A.lights=this.lightOverride===null?(this.hour>=5 && this.hour<23):this.lightOverride;
    }else {
      Object.keys(this.manual).forEach(k=>{if(typeof A[k]==='boolean' && k!=='alarm' && k!=='generator')A[k]=this.manual[k];});
    }
    A.generator=!this.power;
    const outage = !this.power;
    if(this.estop || this.fire){
      // Simulation stops mechanical feeding/heating; it does NOT model industrial safety/real E-stop.
      A.feedA=A.feedB=A.heaterA=A.heaterB=A.cooling=false;
    }
    if(outage){
      A.feedA=A.feedB=A.heaterA=A.heaterB=A.cooling=false;
    }
    if(this.fanFault)A.fan1=false;
    const fans=[A.fan1,A.fan2,A.fan3,A.fan4].filter(Boolean).length;
    const airExchange=fans*.0054;
    const heatGain=(this.outside-(this.tempA+this.tempB)/2)*(.00014+fans*.000048);
    const heatBirds=.00065*(this.birds/15000);
    const heatingA=A.heaterA?.014:0, heatingB=A.heaterB?.014:0;
    const cooling=A.cooling?.013:0;
    this.tempA=clamp(this.tempA+(heatGain+heatBirds+heatingA-cooling)*dt,5,50);
    this.tempB=clamp(this.tempB+(heatGain+heatBirds+heatingB-cooling)*dt*.94,5,50);
    this.humidity=clamp(this.humidity+((this.outHumidity-this.humidity)*(.00008+airExchange*.012) + .0011 + (A.cooling?.012:0)+(this.leak?.002:0))*dt,15,99);
    this.nh3=clamp(this.nh3+(this.birds/15000*.0006 - fans*.00035 + (this.leak?.0008:0))*dt,0,90);
    this.co2=clamp(this.co2+(this.birds/15000*1.2-fans*.42)*dt,410,6000);
    this.feed=clamp(this.feed-((A.feedA?1:0)+(A.feedB?1:0))*.0038*dt,0,100);
    // Trays really fill while their auger runs, slowly empty through feed consumption.
    this.panFillA=clamp(this.panFillA+((A.feedA&&this.feed>2)? .032:-.0025)*dt,0,100);
    this.panFillB=clamp(this.panFillB+((A.feedB&&this.feed>2)? .032:-.0025)*dt,0,100);
    this.flowA=(this.water>2&&this.pressure>.5)?+(0.38*this.pressure).toFixed(2):0;
    this.flowB=(this.water>2&&this.pressure>.5)?+(0.35*this.pressure).toFixed(2):0;
    this.water=clamp(this.water-(.0011+(this.leak?.012:0))*dt,0,100);
    this.pressure=clamp(this.pressure + ((this.water>5?2.8:0) - this.pressure)*(.002+(A.waterPump?.006:0))*dt -(this.leak?.006*dt:0),0,4);
    this.energy+=(fans*3.8 + (A.cooling?4:0)+(A.heaterA?9:0)+(A.heaterB?9:0)+((A.feedA?1:0)+(A.feedB?1:0))*1.4)*dt/3600;
    if(this.elapsed%7 < dt) {
      this.trend.push({t:Math.round(this.elapsed/60),a:+this.tempA.toFixed(2),b:+this.tempB.toFixed(2),co2:+this.co2.toFixed(0),nh3:+this.nh3.toFixed(1)});
      if(this.trend.length>130)this.trend.shift();
    }
    A.inlet=clamp(20+fans*14,20,84);
    A.alarm=this.alarms.length>0;
  }
  get alarms(){
    const list=[];
    if(this.fire)list.push('إنذار حريق');
    if(this.estop)list.push('إيقاف طوارئ في المحاكاة');
    if(!this.power)list.push('انقطاع الكهرباء الرئيسية');
    if(this.fanFault)list.push('عطل مروحة المرحلة الأولى');
    if(this.sensorFault)list.push('فقدان إشارة حساس');
    if(this.leak)list.push('تسرّب في خطوط المياه');
    if(Math.max(this.tempA,this.tempB)>this.setpoint+3.5)list.push('ارتفاع الحرارة عن نقطة الضبط');
    if(this.co2>3000)list.push('ارتفاع ثاني أكسيد الكربون');
    if(this.nh3>25)list.push('ارتفاع الأمونيا');
    if(this.water<15)list.push('انخفاض خزان المياه');
    if(this.feed<12)list.push('انخفاض مستوى العلف');
    return list;
  }
  get recommendations(){
    const r=[];
    if(this.co2>2200)r.push('مستوى CO₂ مرتفع: افحص كفاءة التهوية وملاحظات المراوح.');
    if(this.nh3>14)r.push('الأمونيا تتزايد: افحص رطوبة الفرشة وتجديد الهواء.');
    if(this.humidity>75)r.push('الرطوبة مرتفعة: راجع التحكم في التبريد التبخيري.');
    if(this.fanFault)r.push('فشل المروحة الأولى: افحص حماية المحرك وإشارة التشغيل الراجع.');
    if(!this.power)r.push('فقدان مصدر الطاقة: اختبر منظومة المولد والـATS خارج المحاكاة.');
    if(!r.length)r.push('المؤشرات مستقرة ضمن حدود النموذج الافتراضي. استمر بالمراقبة.');
    return r;
  }
  get snapshot(){
    return {age:this.age,birds:this.birds,tempA:this.tempA,tempB:this.tempB,humidity:this.humidity,nh3:this.nh3,co2:this.co2,feed:this.feed,water:this.water,
      pressure:this.pressure,panFillA:this.panFillA,panFillB:this.panFillB,flowA:this.flowA,flowB:this.flowB,outside:this.outside,mode:this.mode,speed:this.speed,hour:this.hour,setpoint:this.setpoint,
      lightOverride:this.lightOverride,lightDimmer:this.lightDimmer,outputs:{...this.outputs},alarms:this.alarms,recommendations:this.recommendations,energy:this.energy};
  }
  csv(){return ['sim_min,zone_A_C,zone_B_C,CO2_ppm,NH3_ppm',...this.trend.map(x=>`${x.t},${x.a},${x.b},${x.co2},${x.nh3}`)].join('\n')}
}
