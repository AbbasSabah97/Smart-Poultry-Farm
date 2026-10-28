"""Import a bundled explicitly synthetic screenshot for UI learning only.
Cannot enter model training or evaluation, by design.
"""
import argparse
from pathlib import Path
from monitoring.gateway import default_db
from .core import VisionStore


def main():
    p=argparse.ArgumentParser();p.add_argument('--db',default=str(default_db().with_name('vision-v05.sqlite3')))
    a=p.parse_args()
    jpg=(Path(__file__).parent/'demo_frame.jpg').read_bytes()
    s=VisionStore(a.db)
    try:
        for i in range(3):s.add_frame(jpg,'SYNTHETIC_USER_INTERFACE_SAMPLE','DEMO_0001','DEMO_CAM','DEMO_FARM','2026-10-28',i*10,960,540,'synthetic')
        print('Inserted 3 explicitly synthetic UI training frames. They cannot enter ML evaluation.')
    finally:s.close()
if __name__=='__main__':main()
