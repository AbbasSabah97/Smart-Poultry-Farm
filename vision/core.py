"""Ground-truth annotation store, review workflow, held-out evaluation.
No sensor writes, no diagnosis, no auto-authorized veterinary conclusions.
"""
from __future__ import annotations
import json, sqlite3, hashlib, math, shutil, time, threading, functools
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

LABELS = ('chicken',)
FRAME_TAGS = ('unclassified','normal_activity','crowding','low_activity','poor_visibility','review_requested')
REVIEW_STATUS = ('pending','needs_inspection','under_review','no_issue_observed','follow_up_required')


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def safe_float(v, name):
    n=float(v)
    if not math.isfinite(n): raise ValueError(name+' is not finite')
    return n


def valid_boxes(boxes):
    if not isinstance(boxes,list) or len(boxes)>1200: raise ValueError('boxes must be a list (max 1200)')
    clean=[]
    for b in boxes:
        if b.get('class') not in LABELS: raise ValueError('Unknown box class')
        x,y,w,h=(safe_float(b[k],k) for k in ('x','y','w','h'))
        if x<0 or y<0 or w<=0 or h<=0 or x+w>1.00001 or y+h>1.00001:raise ValueError('Box must be inside normalized [0,1] frame')
        clean.append({'class':'chicken','x':x,'y':y,'w':w,'h':h})
    return clean


def serialized(fn):
    @functools.wraps(fn)
    def wrapper(self,*args,**kwargs):
        with self.lock:return fn(self,*args,**kwargs)
    return wrapper


class VisionStore:
    def __init__(self, db_path, image_root=None):
        self.lock=threading.RLock()
        self.db_path=Path(db_path)
        self.db_path.parent.mkdir(parents=True,exist_ok=True)
        self.image_root=Path(image_root or (self.db_path.parent/'frames'))
        self.image_root.mkdir(parents=True,exist_ok=True)
        self.conn=sqlite3.connect(self.db_path,timeout=10,check_same_thread=False)
        self.conn.row_factory=sqlite3.Row
        self.conn.execute('PRAGMA journal_mode=WAL')
        self.conn.execute('PRAGMA foreign_keys=ON')
        self.conn.executescript('''
          CREATE TABLE IF NOT EXISTS vision_frames (
            id TEXT PRIMARY KEY, source_file TEXT NOT NULL, clip_id TEXT NOT NULL,
            camera_id TEXT NOT NULL, farm_id TEXT NOT NULL, recorded_day TEXT NOT NULL,
            frame_seconds REAL NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('real','synthetic','research')),
            relative_filename TEXT NOT NULL UNIQUE, annotation_state TEXT NOT NULL DEFAULT 'unlabeled',
            boxes_json TEXT NOT NULL DEFAULT '[]', frame_tag TEXT NOT NULL DEFAULT 'unclassified',
            note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS vision_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT, frame_id TEXT NOT NULL REFERENCES vision_frames(id),
            reviewer TEXT NOT NULL, review_status TEXT NOT NULL, findings TEXT NOT NULL,
            requested_action TEXT NOT NULL, created_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS vision_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT, model_id TEXT NOT NULL, eval_json TEXT NOT NULL,
            created_at TEXT NOT NULL);
        ''')
        self.conn.commit()

    @serialized
    def close(self): self.conn.close()

    @serialized
    def add_frame(self, jpg_bytes:bytes, source_file:str, clip_id:str, camera_id:str, farm_id:str,
                  recorded_day:str, frame_seconds:float,width:int,height:int,source='real'):
        if source not in ('real','synthetic','research'): raise ValueError('Unknown origin')
        if not all(isinstance(x,str) and 1<=len(x)<=120 for x in (clip_id,camera_id,farm_id,recorded_day)): raise ValueError('Invalid identifiers')
        if not jpg_bytes.startswith(b'\xff\xd8') or len(jpg_bytes)>10_000_000:raise ValueError('Expected JPEG bytes')
        if not 1<=width<=16000 or not 1<=height<=16000:raise ValueError('Invalid dimensions')
        sec=safe_float(frame_seconds,'time')
        unique=f'{clip_id}|{sec:.3f}|{hashlib.sha256(jpg_bytes).hexdigest()}'
        frame_id=hashlib.sha256(unique.encode()).hexdigest()[:24]
        name=frame_id+'.jpg'
        path=self.image_root/name
        if not path.exists():path.write_bytes(jpg_bytes)
        now=utc_now()
        with self.conn:
            self.conn.execute('''INSERT OR IGNORE INTO vision_frames
             (id,source_file,clip_id,camera_id,farm_id,recorded_day,frame_seconds,width,height,source,relative_filename,created_at,updated_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
             (frame_id,source_file[:255],clip_id,camera_id,farm_id,recorded_day,sec,width,height,source,name,now,now))
        return frame_id

    @serialized
    def list_frames(self,limit=100, state=None):
        limit=min(300,max(1,int(limit)))
        if state and state not in ('unlabeled','labeled','empty'):raise ValueError('unknown label state')
        sql='SELECT * FROM vision_frames'
        params=[]
        if state:sql+=' WHERE annotation_state=?';params=[state]
        sql+=' ORDER BY created_at DESC, frame_seconds ASC LIMIT ?';params.append(limit)
        return [self._obj(x) for x in self.conn.execute(sql,params)]

    def _obj(self,row):
        d=dict(row);d['boxes']=json.loads(d.pop('boxes_json'));return d

    @serialized
    def get(self,id):
        r=self.conn.execute('SELECT * FROM vision_frames WHERE id=?',(str(id),)).fetchone()
        return self._obj(r) if r else None

    @serialized
    def image(self,id):
        frame=self.get(id)
        if not frame:return None
        return self.image_root / frame['relative_filename']

    @serialized
    def annotate(self,frame_id,boxes,tag='unclassified',note='',empty_confirmed=False):
        if tag not in FRAME_TAGS:raise ValueError('Unknown frame tag')
        boxes=valid_boxes(boxes)
        if not isinstance(note,str) or len(note)>1000:raise ValueError('note too long')
        if not boxes and not empty_confirmed:raise ValueError('Confirm a genuinely empty frame; unlabeled is not empty')
        state='labeled' if boxes else 'empty'
        with self.conn:
            cur=self.conn.execute('''UPDATE vision_frames SET boxes_json=?,annotation_state=?,frame_tag=?,note=?,updated_at=? WHERE id=?''',
               (json.dumps(boxes),state,tag,note,utc_now(),str(frame_id)))
        if cur.rowcount!=1:raise KeyError('frame not found')
        return self.get(frame_id)

    @serialized
    def add_review(self,frame_id,reviewer,status,findings,action=''):
        if not self.get(frame_id):raise KeyError('frame not found')
        if status not in REVIEW_STATUS:raise ValueError('Invalid review status')
        if not isinstance(reviewer,str) or not 2<=len(reviewer.strip())<=100:raise ValueError('Reviewer required')
        if not isinstance(findings,str) or len(findings)>2000 or not isinstance(action,str) or len(action)>1000:raise ValueError('Notes too long')
        with self.conn:
            cur=self.conn.execute('INSERT INTO vision_reviews (frame_id,reviewer,review_status,findings,requested_action,created_at) VALUES (?,?,?,?,?,?)',
                (frame_id,reviewer.strip(),status,findings,action,utc_now()))
        return cur.lastrowid

    @serialized
    def reviews(self,limit=100):
        return [dict(r) for r in self.conn.execute('SELECT * FROM vision_reviews ORDER BY id DESC LIMIT ?', (min(int(limit),250),))]

    @serialized
    def summary(self):
        counts=dict((r['annotation_state'],r['n']) for r in self.conn.execute('SELECT annotation_state,COUNT(*) n FROM vision_frames GROUP BY annotation_state'))
        origins=dict((r['source'],r['n']) for r in self.conn.execute('SELECT source,COUNT(*) n FROM vision_frames GROUP BY source'))
        n=self.conn.execute('SELECT COUNT(*) FROM vision_reviews').fetchone()[0]
        return {'frames':sum(counts.values()),'states':counts,'origins':origins,'reviews':n,'disclaimer':'Labels and visual cues are not a disease diagnosis.'}

    @serialized
    def annotated_frames(self):
        return [self._obj(x) for x in self.conn.execute("SELECT * FROM vision_frames WHERE annotation_state IN ('labeled','empty') ORDER BY clip_id,frame_seconds")]

    @serialized
    def export_yolo(self,output_dir):
        """Split by farm when >=3 farms, otherwise by clip. Never by adjacent frame.
        Do not mix synthetic frames into real-data model training.
        """
        frames=[x for x in self.annotated_frames() if x['source'] in ('real','research')]
        if not frames:raise ValueError('No labeled REAL/RESEARCH frames; synthetic demos cannot be used for training/evaluation')
        farms=sorted(set(x['farm_id'] for x in frames))
        groupby='farm_id' if len(farms)>=3 else 'clip_id'
        groups=sorted(set(x[groupby] for x in frames))
        if len(groups)<3:raise ValueError('At least 3 independent farms/clips are required for a train/val/test export. Do not split neighboring frames.')
        # Partition via stable hashes; distribute at least one group into each split.
        hashed=sorted(groups,key=lambda v:hashlib.sha256(v.encode()).hexdigest())
        n=len(hashed);nv=max(1,int(round(n*.2)));nt=max(1,int(round(n*.2)))
        if nv+nt>=n: nv=nt=1
        split_for={}
        for i,g in enumerate(hashed):split_for[g]='test' if i<nt else 'val' if i<nt+nv else 'train'
        root=Path(output_dir)
        if root.exists() and any(root.iterdir()):raise ValueError('Export destination must be empty to avoid mixing old datasets')
        counts=defaultdict(int)
        frame_splits={}
        for f in frames:
            split=split_for[f[groupby]]
            img_dir=root/'images'/split;lbl_dir=root/'labels'/split
            img_dir.mkdir(parents=True,exist_ok=True);lbl_dir.mkdir(parents=True,exist_ok=True)
            shutil.copy2(self.image(f['id']),img_dir/(f['id']+'.jpg'))
            lines=[]
            for b in f['boxes']:
                cx=b['x']+b['w']/2;cy=b['y']+b['h']/2
                lines.append(f"0 {cx:.6f} {cy:.6f} {b['w']:.6f} {b['h']:.6f}")
            (lbl_dir/(f['id']+'.txt')).write_text('\n'.join(lines),encoding='utf-8')
            counts[split]+=1
            frame_splits[f['id']]=split
        (root/'data.yaml').write_text('path: .\ntrain: images/train\nval: images/val\ntest: images/test\nnames:\n  0: chicken\n',encoding='utf-8')
        meta={'counts':dict(counts),'split_unit':groupby,'groups':split_for,'frame_splits':frame_splits,'sources':['real','research'],
          'warning':'If only same-farm clips are present, TEST is not independent-farm validation. Preserve licensing and consent.'}
        (root/'split_manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
        return meta


def iou(a,b):
    xa=max(a['x'],b['x']);ya=max(a['y'],b['y'])
    xb=min(a['x']+a['w'],b['x']+b['w']);yb=min(a['y']+a['h'],b['y']+b['h'])
    inter=max(0,xb-xa)*max(0,yb-ya)
    area=a['w']*a['h']+b['w']*b['h']-inter
    return inter/area if area>0 else 0.0


def evaluate_predictions(reference_frames, predictions, min_conf=.25, threshold=.5):
    """Box-level precision/recall at chosen operating cutoff, interpolated AP50
    over ALL prediction confidences (independent of operating cutoff).
    Only use labeled real held-out data, never demo data.
    """
    min_conf=safe_float(min_conf,'confidence')
    if not 0<=min_conf<=1:raise ValueError('confidence cutoff outside 0..1')
    if not reference_frames:raise ValueError('No holdout frames')
    n_gt=0;pred_entries=[];gt_by={}
    for f in reference_frames:
        if f.get('annotation_state') not in ('labeled','empty'):raise ValueError('Unlabeled frames cannot be evaluated')
        if f.get('source')=='synthetic':raise ValueError('Do not evaluate model accuracy on synthetic demonstration data')
        gt_by[f['id']]=[b for b in f['boxes'] if b['class']=='chicken']
        n_gt+=len(gt_by[f['id']])
        for p in predictions.get(f['id'],[]):
            if p.get('class')!='chicken':raise ValueError('Unknown predicted class')
            valid_boxes([{k:p[k] for k in ('x','y','w','h','class')}])
            conf=safe_float(p['confidence'],'confidence')
            if not 0<=conf<=1:raise ValueError('confidence out of range')
            pred_entries.append((conf,f['id'],p))
    pred_entries.sort(reverse=True,key=lambda x:x[0])
    used=defaultdict(set);tp=fp=0;precisions=[];recalls=[]
    threshold_tp=threshold_fp=0
    for conf,fid,p in pred_entries:
        best_iou=0;best_i=None
        for k,g in enumerate(gt_by[fid]):
            if k in used[fid]:continue
            ov=iou(g,p)
            if ov>best_iou:best_iou=ov;best_i=k
        matched=best_i is not None and best_iou>=threshold
        if matched:
            tp+=1;used[fid].add(best_i)
        else:fp+=1
        if conf>=min_conf:
            if matched:threshold_tp+=1
            else:threshold_fp+=1
        precisions.append(tp/(tp+fp))
        recalls.append(tp/n_gt if n_gt else 0)
    threshold_fn=n_gt-threshold_tp
    precision=threshold_tp/(threshold_tp+threshold_fp) if threshold_tp+threshold_fp else None
    recall=threshold_tp/n_gt if n_gt else None
    f1=2*precision*recall/(precision+recall) if precision is not None and recall is not None and precision+recall else (0 if precision is not None and recall is not None else None)
    ap50=None
    if n_gt:
        ap50=sum(max([p for p,r in zip(precisions,recalls) if r>=t] or [0]) for t in [i/100 for i in range(101)])/101
    return {'frames':len(reference_frames),'ground_truth_boxes':n_gt,'tp':threshold_tp,'fp':threshold_fp,'fn':threshold_fn,
        'precision':precision,'recall':recall,'f1':f1,'ap50':ap50,'confidence_cutoff':min_conf,'iou_threshold':threshold,
        'note':'Box detection metrics only. Not clinical accuracy, no disease sensitivity or specificity.'}
