import argparse,json
from .core import VisionStore

def main():
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();s=VisionStore(a.db)
    try:print(json.dumps(s.export_yolo(a.out),ensure_ascii=False,indent=2))
    finally:s.close()
if __name__=='__main__':main()
