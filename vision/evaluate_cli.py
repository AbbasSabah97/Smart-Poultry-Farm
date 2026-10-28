"""Evaluate detector predictions on manually labeled holdout frames.
Never invent performance figures or use synthetic demonstration images for reporting.
"""
import argparse,json
from pathlib import Path
from .core import VisionStore,evaluate_predictions


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--db',required=True)
    p.add_argument('--predictions',required=True,help='JSON mapping frame-id -> boxes [{class,x,y,w,h,confidence}]')
    p.add_argument('--split-manifest',required=True,help='split_manifest.json from YOLO export; only TEST frames used.')
    p.add_argument('--model-id',required=True)
    p.add_argument('--out',default='evaluation.json')
    args=p.parse_args()
    s=VisionStore(args.db)
    try:
        preds=json.loads(Path(args.predictions).read_text(encoding='utf-8'))
        manifest=json.loads(Path(args.split_manifest).read_text(encoding='utf-8'))
        ids=[k for k,v in manifest['frame_splits'].items() if v=='test']
        if not isinstance(ids,list) or not ids:raise ValueError('No held-out frame IDs supplied')
        frames=[s.get(fid) for fid in ids]
        if any(f is None for f in frames):raise ValueError('Unknown frame ID')
        if not isinstance(preds,dict):raise ValueError('Predictions must be dict')
        score=evaluate_predictions(frames,preds)
        score['model_id']=args.model_id;score['split_provenance']='export_manifest_test_only';score['split_unit']=manifest.get('split_unit','unknown')
        Path(args.out).write_text(json.dumps(score,indent=2),encoding='utf-8')
        print(json.dumps(score,indent=2))
    finally:s.close()
if __name__=='__main__':main()
