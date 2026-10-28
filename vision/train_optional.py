"""OPTIONAL training. Requires real manually annotated dataset and separate validation.
Not run automatically. Weights are NOT shipped. Research licensing must be checked first.
"""
from pathlib import Path
import argparse


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--dataset',required=True,help='Path to exported YOLO data.yaml')
    p.add_argument('--weights',required=True,help='Path to installed pretrained detection weights, e.g. yolo11n.pt')
    p.add_argument('--epochs',type=int,default=20)
    p.add_argument('--imgsz',type=int,default=640)
    p.add_argument('--device',default='cpu')
    a=p.parse_args()
    if not Path(a.dataset).is_file() or not Path(a.weights).is_file():raise SystemExit('Dataset and weights must exist locally; no fabricated model supplied')
    if not 1<=a.epochs<=500:raise SystemExit('Invalid epochs')
    from ultralytics import YOLO
    model=YOLO(a.weights)
    out=model.train(data=str(Path(a.dataset).resolve()),epochs=a.epochs,imgsz=a.imgsz,device=a.device,workers=0,batch=2,project='vision_training',name='poultry_detector')
    print('Training output:',out.save_dir)
    print('Evaluate on truly held-out farm before any health/welfare inference. See README.')
if __name__=='__main__':main()
