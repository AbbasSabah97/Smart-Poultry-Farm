export function initFleetUI(fleet,visual){
  const picker=document.getElementById('housePicker');
  const byId=id=>document.getElementById(id);
  function refresh(){
    const items=fleet.summary();const house=fleet.selected.profile;
    const data=items.find(h=>h.id===house.id);
    for(const [id,text] of Object.entries({
      selectedName:house.id+' — '+house.name,
      selectedTemp:data.temp.toFixed(1)+' °C',selectedHumidity:data.humidity+' %',
      selectedCo2:data.co2+' ppm',selectedNh3:data.nh3.toFixed(1)+' ppm',
      selectedFeed:data.feed+' %',selectedWater:data.water+' %',
      selectedBirds:'150 أبيض ثابت',selectedAge:data.age.toFixed(1)+' يوم',selectedAlarms:data.alarms?data.alarms+' إنذار':'طبيعي'
    }))byId(id).textContent=text;
    byId('globalStatus').textContent='7 HOUSES • '+items.reduce((a,h)=>a+h.alarms,0)+' ALARMS • SIMULATION ONLY';
    picker.querySelectorAll('button[data-house-id]').forEach(b=>{
      b.classList.toggle('active',b.dataset.houseId===house.id);
      b.setAttribute('aria-pressed',String(b.dataset.houseId===house.id));
    });
  }
  function select(id){
    fleet.select(id);
    visual.setHouseVariant?.(id,fleet.selected.profile.roof);
    visual.highlightHouse?.(id);
    refresh();
  }
  fleet.houses.forEach(h=>{
    const b=document.createElement('button');b.type='button';
    b.dataset.houseId=h.profile.id;b.textContent=h.profile.id+' | '+String(h.profile.name.split('—')[1]||'حظيرة').trim();
    b.addEventListener('click',()=>select(h.profile.id));picker.append(b);
  });
  visual.onHouseSelect=id=>select(id);
  let paused=false;
  const events={siteBtn:()=>visual.showSite(),insideBtn:()=>visual.enterHouse(fleet.selected.profile.id),feedingBtn:()=>visual.cameraPose('feeding'),fansBtn:()=>visual.cameraPose('fans'),roofBtn:()=>visual.toggleRoof(),birdBtn:()=>visual.toggleBirds()};
  for(const [id,fn] of Object.entries(events))byId(id).addEventListener('click',fn);
  byId('modeBtn').addEventListener('click',()=>{const t=fleet.selected.twin;t.setControl('mode',t.mode==='AUTO'?'MANUAL':'AUTO');refresh();});
  byId('lightsBtn').addEventListener('click',()=>{const t=fleet.selected.twin;t.setControl('lightOverride',!(t.lightOverride??t.outputs.lights));refresh();});
  byId('pauseBtn').addEventListener('click',()=>{paused=!paused;byId('pauseBtn').textContent=paused?'متابعة المحاكاة':'إيقاف المحاكاة مؤقتاً';});
  byId('reportBtn').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob(['\uFEFF'+fleet.csv()],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='seven_house_simulation.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);
  });
  select('H01');refresh();setInterval(refresh,1000);
  return {select,refresh,get paused(){return paused}};
}
