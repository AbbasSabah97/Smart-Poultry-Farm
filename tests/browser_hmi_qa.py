from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text().replace('<script type="module" src="/src/main.js"></script>','')
engine=(root/'src/farm.js').read_text().replace('export const','const').replace('export class','class')
ui=(root/'src/ui.js').read_text().replace('export function','function')
bootstrap=engine+'\n'+ui+'''\nwindow.twin=new PoultryTwin();window.visual={quality:'high',visibleBirds:123,cameraPose(){},toggleRoof(){},toggleBirds(){},toggleQuality(){}};window.hmi=initUI(window.twin,window.visual);let t=performance.now();function tick(n){window.twin.update(Math.min(.06,(n-t)/1000));t=n;requestAnimationFrame(tick);}requestAnimationFrame(tick);document.getElementById('loading').style.display='none';'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-web-security'])
 page=browser.new_page(viewport={'width':1350,'height':950},locale='ar-IQ')
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_script_tag(content=bootstrap)
 page.wait_for_timeout(480)
 assert page.locator('#hmi-process').is_visible()
 assert float(page.locator('#panABar').evaluate('(el)=>parseFloat(el.style.width)'))>0
 page.locator('#lightsOffBtn').click();page.wait_for_timeout(350)
 assert page.evaluate('window.twin.outputs.lights') is False
 page.locator('[data-action="emptyPans"]').click();page.wait_for_timeout(350)
 assert float(page.locator('#panABar').evaluate('(el)=>parseFloat(el.style.width)'))<2
 page.locator('[data-action="fillPans"]').click();page.wait_for_timeout(350)
 assert float(page.locator('#panABar').evaluate('(el)=>parseFloat(el.style.width)'))>95
 page.locator('#lightsOnBtn').click();page.wait_for_timeout(350)
 assert page.evaluate('window.twin.outputs.lights') is True
 page.locator('#lightsScheduleBtn').click();page.wait_for_timeout(350)
 assert page.locator('#lightMode').inner_text()=='SCHEDULE'
 assert not errors,errors
 page.locator('aside').screenshot(path='/mnt/data/Poultry_HMI_v02_Browser_Test.png')
 print('PASS: Browser HMI DOM, feed 0-100, lighting OFF/ON/AUTO, no browser errors. 3D is NOT tested in this stubbed smoke test.')
 browser.close()
