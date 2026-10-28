"""Offline/RTSP frame sampling. READ ONLY. RTSP secrets must be set via environment variable.
No video uploads, no data shared with cloud. Requires cv2 (optional dependency).
"""
from __future__ import annotations
import os, cv2, argparse, hashlib, time, re
from pathlib import Path
from datetime import datetime
from .core import VisionStore


def clean_id(value):
    if not re.fullmatch('[A-Za-z0-9_-]{1,60}',str(value)):raise ValueError('Use only A-Z, 0-9, underscore, dash in IDs')
    return value


def sample_video(db,input_value, camera_id,farm_id,day, source='real',interval=6.0,limit=200,rtsp=False):
    camera_id=clean_id(camera_id);farm_id=clean_id(farm_id)
    if not re.fullmatch('\\d{4}-\\d{2}-\\d{2}',day):raise ValueError('Day must be YYYY-MM-DD')
    datetime.strptime(day,'%Y-%m-%d')
    if source not in ('real','research','synthetic'):raise ValueError('Bad source')
    interval=float(interval);limit=int(limit)
    if interval<1 or interval>3600 or not 1<=limit<=10000:raise ValueError('Invalid interval/limit')
    if rtsp:
        url=os.getenv(input_value)
        if not url or not url.lower().startswith(('rtsp://','rtsps://')):raise ValueError('Set RTSP URL in env var (do not put secret into arguments)')
        clip_id=hashlib.sha256((farm_id+camera_id+day+input_value).encode()).hexdigest()[:24]
        source_name='RTSP:'+input_value
    else:
        path=Path(input_value).expanduser().resolve()
        if not path.is_file():raise ValueError('No file: '+str(path))
        clip_id=hashlib.sha256((str(path)+str(path.stat().st_size)).encode()).hexdigest()[:24]
        url=str(path);source_name=path.name
    cap=cv2.VideoCapture(url)
    if not cap.isOpened():raise RuntimeError('Cannot open camera/video')
    store=VisionStore(db)
    n=0;step=0;start=time.monotonic();fps=cap.get(cv2.CAP_PROP_FPS)
    next_at=0.0
    try:
        while n<limit:
            success,frame=cap.read()
            if not success:break
            # Local video: use video timestamps, RTSP: wall-clock.
            t=(time.monotonic()-start) if rtsp else cap.get(cv2.CAP_PROP_POS_MSEC)/1000
            if not rtsp and t<=0 and step>0:t=step/(fps if fps and fps>0 else 25)
            step+=1
            if t<next_at:continue
            next_at=t+interval
            h,w=frame.shape[:2]
            if w>1280:
                new_w=1280;frame=cv2.resize(frame,(new_w,round(h*new_w/w)))
            h,w=frame.shape[:2]
            ok,jpg=cv2.imencode('.jpg',frame,[cv2.IMWRITE_JPEG_QUALITY,82])
            if not ok:continue
            frame_id=store.add_frame(jpg.tobytes(),source_name,clip_id,camera_id,farm_id,day,t,w,h,source)
            n+=1
        return {'stored_frames':n,'clip_id':clip_id,'camera_id':camera_id,'source':source,'database':str(db)}
    finally:
        cap.release();store.close()


def main():
    p=argparse.ArgumentParser(description='Sample video/RTSP for manual poultry bounding-box labeling')
    src=p.add_mutually_exclusive_group(required=True)
    src.add_argument('--video',help='Local MP4 or other video file')
    src.add_argument('--rtsp-env',help='Name of environment variable containing RTSP URL')
    p.add_argument('--db',default=os.getenv('POULTRY_VISION_DB',str(Path.home()/'SmartPoultryFarm'/'vision-v05.sqlite3')))
    p.add_argument('--camera',required=True,help='Camera identifier, e.g. CAM01')
    p.add_argument('--farm',required=True,help='Farm identifier')
    p.add_argument('--date',required=True,help='Recorded date YYYY-MM-DD')
    p.add_argument('--source',choices=['real','research','synthetic'],default='real')
    p.add_argument('--every',type=float,default=6,help='Seconds between sampled frames (default 6)')
    p.add_argument('--limit',type=int,default=200)
    a=p.parse_args()
    out=sample_video(a.db,a.video or a.rtsp_env,a.camera,a.farm,a.date,a.source,a.every,a.limit,bool(a.rtsp_env))
    print(out)

if __name__=='__main__':main()
