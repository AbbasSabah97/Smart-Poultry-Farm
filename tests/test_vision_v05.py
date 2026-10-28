import json, tempfile, unittest, urllib.request, threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from vision.core import VisionStore, evaluate_predictions
from monitoring.gateway import App,make_handler


def img(seed=0):
    return (Path(__file__).resolve().parents[1]/'vision'/'demo_frame.jpg').read_bytes()


class VisionV05(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=Path(self.tmp.name)/'vision.sqlite'
        self.db=VisionStore(self.path)
    def tearDown(self):self.db.close();self.tmp.cleanup()
    def frame(self,clip='clip1',farm='farm1',sec=2,source='real',seed=0):
        return self.db.add_frame(img(seed),clip+'.mp4',clip,'CAM01',farm,'2026-10-28',sec,960,540,source)
    def test_add_and_read(self):
        id=self.frame();self.assertEqual(self.db.get(id)['source'],'real');self.assertEqual(self.db.summary()['frames'],1)
    def test_dedup(self):
        self.assertEqual(self.frame(),self.frame());self.assertEqual(self.db.summary()['frames'],1)
    def test_reject_bad_boxes(self):
        id=self.frame()
        with self.assertRaises(ValueError):self.db.annotate(id,[{'class':'chicken','x':-.2,'y':0,'w':.5,'h':.5}])
    def test_unlabeled_not_empty(self):
        id=self.frame()
        with self.assertRaises(ValueError):self.db.annotate(id,[])
        self.db.annotate(id,[],empty_confirmed=True)
        self.assertEqual(self.db.get(id)['annotation_state'],'empty')
    def test_label_and_review(self):
        id=self.frame();self.db.annotate(id,[{'class':'chicken','x':.1,'y':.2,'w':.5,'h':.5}],tag='crowding')
        self.assertEqual(self.db.get(id)['annotation_state'],'labeled')
        self.db.add_review(id,'Reviewer Test','needs_inspection','Inspect drinkers','Call vet if symptoms present')
        self.assertEqual(len(self.db.reviews()),1)
    def test_synthetic_training_rejected(self):
        id=self.frame(source='synthetic');self.db.annotate(id,[],empty_confirmed=True)
        with self.assertRaises(ValueError):self.db.export_yolo(Path(self.tmp.name)/'export')
    def test_split_requires_independent_clips(self):
        id=self.frame();self.db.annotate(id,[],empty_confirmed=True)
        with self.assertRaises(ValueError):self.db.export_yolo(Path(self.tmp.name)/'export')
    def test_split_clip_level(self):
        for i in range(5):
            for j in range(3):
                id=self.frame(f'clip{i}', 'farmA', j+1,seed=i)
                self.db.annotate(id,[{'class':'chicken','x':.1,'y':.1,'w':.2,'h':.2}])
        m=self.db.export_yolo(Path(self.tmp.name)/'yolo')
        self.assertEqual(m['split_unit'],'clip_id')
        byclip={}
        for f in self.db.annotated_frames():
            byclip.setdefault(f['clip_id'],set()).add(m['frame_splits'][f['id']])
        self.assertTrue(all(len(v)==1 for v in byclip.values()))
        self.assertTrue({'train','val','test'}.issubset(m['frame_splits'].values()))
    def test_holdout_farm_grouping(self):
        for i in range(3):
            id=self.frame(f'clip{i}',f'farm{i}',i+1,seed=i);self.db.annotate(id,[],empty_confirmed=True)
        m=self.db.export_yolo(Path(self.tmp.name)/'yolo')
        self.assertEqual(m['split_unit'],'farm_id')
    def test_iou_metrics(self):
        id=self.frame();self.db.annotate(id,[{'class':'chicken','x':.1,'y':.2,'w':.3,'h':.3}]);f=self.db.get(id)
        p={id:[{'class':'chicken','x':.1,'y':.2,'w':.3,'h':.3,'confidence':.9}]}
        r=evaluate_predictions([f],p)
        self.assertAlmostEqual(r['precision'],1);self.assertAlmostEqual(r['recall'],1);self.assertAlmostEqual(r['ap50'],1)
    def test_synthetic_evaluation_rejected(self):
        id=self.frame(source='synthetic');self.db.annotate(id,[],empty_confirmed=True)
        with self.assertRaises(ValueError):evaluate_predictions([self.db.get(id)],{})
    def test_api_requires_token(self):
        # Use real HTTP server on an ephemeral loopback port, not mocked handlers.
        db=Path(self.tmp.name)/'monitor.sqlite';app=App(db,token='secret-test')
        http=ThreadingHTTPServer(('127.0.0.1',0),make_handler(app))
        t=threading.Thread(target=http.serve_forever,daemon=True);t.start()
        addr='http://127.0.0.1:'+str(http.server_address[1])
        try:
            a=json.load(urllib.request.urlopen(addr+'/api/vision/stats'))
            self.assertEqual(a['frames'],0)
            with urllib.request.urlopen(addr+'/vision') as response:
                self.assertIn(b'VISION STUDIO',response.read())
            req=urllib.request.Request(addr+'/api/vision/annotate',data=b'{}',headers={'Content-Type':'application/json'},method='POST')
            with self.assertRaises(urllib.error.HTTPError) as cm:urllib.request.urlopen(req)
            self.assertEqual(cm.exception.code,403)
        finally:http.shutdown();http.server_close();app.vision.close();app.repo.conn.close()

if __name__=='__main__':unittest.main()
