"""Regression smoke test for top-HMI (3D rendering is intentionally stubbed)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf8').replace('<script type="module" src="/src/main.js"></script>','')
def strip(src):
    return src.replace("import {PoultryTwin} from './farm.js';",'').replace('export const ','const ').replace('export class ','class ').replace('export function ','function ')
engine=strip((root/'src/farm.js').read_text())
fleet=strip((root/'src/fleet.js').read_text())
ui=strip((root/'src/fleet-ui.js').read_text())
bootstrap=engine+'\n'+fleet+'\n'+ui+'''\nwindow.__fleet=new PoultryFleet();
window.__fake3d={onHouseSelect:null,showSite(){},enterHouse(){},cameraPose(){},toggleRoof(){},toggleBirds(){},highlightHouse(){},setHouseVariant(id,color){this.lastChosen={id,color};}};
window.__hmi=initFleetUI(window.__fleet,window.__fake3d);
setInterval(()=>window.__fleet.step(.03),100);
document.getElementById('loading').style.display='none';
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-web-security'])
    page=browser.new_page(viewport={'width':1365,'height':850},locale='ar-IQ')
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content=bootstrap)
    page.wait_for_timeout(300)
    assert page.locator('#housePicker button').count()==7
    assert page.locator('#selectedName').inner_text().startswith('H01')
    assert '°C' in page.locator('#selectedTemp').inner_text()
    page.locator('#housePicker button[data-house-id="H05"]').click()
    assert page.locator('#selectedName').inner_text().startswith('H05')
    assert page.evaluate('window.__fake3d.lastChosen.id')=='H05'
    page.locator('#housePicker button[data-house-id="H07"]').click()
    assert page.locator('#selectedName').inner_text().startswith('H07')
    page.locator('#modeBtn').click()
    assert page.evaluate('window.__fleet.selected.twin.mode')=='MANUAL'
    page.locator('#modeBtn').click()
    assert page.evaluate('window.__fleet.selected.twin.mode')=='AUTO'
    assert not errors, errors
    page.screenshot(path=str(root/'docs/HMI_v1_1_1_Fixed_Browser_Test.png'))
    print('PASS: 7 HMI choices, H01/H05/H07, numeric telemetry, AUTO/MANUAL; no Chromium page exceptions. Three.js visual not tested.')
    browser.close()
