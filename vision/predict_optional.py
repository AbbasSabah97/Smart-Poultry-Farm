"""Optional offline YOLO detector. No pretrained poultry weights shipped.
Use a detection model you have trained/validated, then run heldout evaluation.
"""
import argparse,json
from pathlib import Path
from .core import VisionStore


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--db',required=True)
    p.add_argument('--split-manifest',required=True)
    p.add_argument('--weights',required=True)
    p.add_argument('--out',default='predictions.json')
    p.add_argument('--conf',type=float,default=.25)
    a=p.parse_args()
    if not Path(a.weights).is_file():raise SystemExit('No model weights at specified path')
    manifest=json.loads(Path(a.split_manifest).read_text(encoding='utf-8'))
    ids=[k for k,v in manifest['frame_splits'].items() if v=='test']
    if not ids:raise SystemExit('Empty test split')
    from ultralytics import YOLO
    model=YOLO(a.weights)
    store=VisionStore(a.db)
    try:
        predictions={}
        for id in ids:
            f=store.get(id)
            if not f:raise ValueError('Missing frame: '+id)
            path=store.image(id)
            results=model.predict(str(path),imgsz=640,conf=a.conf,device='cpu',verbose=False)
            predictions[id]=[]
            for box in results[0].boxes:
                if int(box.cls.item())!=0:continue  # only class 0: chicken
                x,y,w,h=box.xywhn[0].tolist()
                predictions[id].append({'class':'chicken','x':x-w/2,'y':y-h/2,'w':w,'h':h,'confidence':float(box.conf.item())})
        Path(a.out).write_text(json.dumps(predictions,indent=2),encoding='utf-8')
        print('Wrote',len(predictions),'test-frame predictions to',a.out)
    finally:store.close()
if __name__=='__main__':main()
