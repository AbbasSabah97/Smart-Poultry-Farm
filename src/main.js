import {PoultryFleet} from './fleet.js';
import {createScene} from './scene.js';
import {initFleetUI} from './fleet-ui.js';

const fleet=new PoultryFleet();
let visual=null;
const loading=document.querySelector('#loading');
try {
  visual=createScene(document.querySelector('#scene'),fleet.proxy);
  loading.style.display='none';
} catch(err) {
  console.error('3D display failed',err);
  loading.classList.add('error');
  loading.textContent='خطأ في العرض ثلاثي الأبعاد: '+String(err?.message||err);
  // Preserve the HMI / telemetry even if WebGL is unavailable.
  const unavailable=()=>{};
  visual={showSite:unavailable,enterHouse:unavailable,cameraPose:unavailable,
    toggleRoof:unavailable,toggleBirds:unavailable,
    setHouseVariant:unavailable,highlightHouse:unavailable,onHouseSelect:null};
}

try {
  const fleetUI=initFleetUI(fleet,visual);
  let last=performance.now();
  function tick(t){
    const dt=Math.min((t-last)/1000,.12);
    last=t;
    if(!fleetUI.paused) fleet.step(dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.__smartPoultry={fleet,visual,fleetUI};
} catch(err) {
  console.error('HMI initialization failed',err);
  loading.classList.add('error');
  loading.style.display='grid';
  loading.textContent='خطأ في تهيئة واجهة التحكم: '+String(err?.message||err);
}
