from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import numpy as np, math, random
out=Path(__file__).parent/'public'/'textures';out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(20261027); W=768; Y,X=np.mgrid[0:W,0:W]

def noise(c,amp=18,detail=3):
    x=np.empty((W,W,3),dtype=float)
    coarse=rng.integers(0,255,(W//30+2,W//30+2),dtype=np.uint8)
    cimg=np.asarray(Image.fromarray(coarse).resize((W,W),Image.Resampling.BILINEAR),float)
    cimg=(cimg-127)/100
    granular=rng.normal(0,detail,(W,W))
    for i in range(3): x[:,:,i]=np.clip(c[i]+amp*cimg+granular,0,255)
    return Image.fromarray(x.astype(np.uint8),'RGB')

soil=noise((105,97,73),15,11)
d=ImageDraw.Draw(soil)
for i in range(25000):
    x=int(rng.integers(W));y=int(rng.integers(W)); size=float(rng.uniform(.35,1.8))
    col=(int(rng.integers(58,153)),int(rng.integers(59,141)),int(rng.integers(41,100)))
    d.ellipse((x,y,x+size,y+size),fill=col)
soil.save(out/'soil_color.jpg',quality=83,optimize=True)

litter=noise((155,120,80),16,7);d=ImageDraw.Draw(litter)
for i in range(17000):
    x=int(rng.integers(W));y=int(rng.integers(W)); l=int(rng.integers(2,9));th=1 if rng.random()<.92 else 2
    a=int(rng.integers(85,196));col=(a,min(232,int(a*.87)),max(35,int(a*.55)))
    d.line((x,y,x+l,y+int(rng.uniform(-2,3))),fill=col,width=th)
litter.save(out/'litter_color.jpg',quality=86,optimize=True)

concrete=noise((155,161,160),11,9);d=ImageDraw.Draw(concrete)
for i in range(2800):
    x=int(rng.integers(W));y=int(rng.integers(W));r=int(rng.integers(1,4));
    c=int(rng.integers(115,175));d.ellipse((x,y,x+r,y+r),fill=(c,c+2,c+1))
concrete.save(out/'concrete_color.jpg',quality=82,optimize=True)

metal=noise((170,183,186),10,3);d=ImageDraw.Draw(metal)
for x in range(0,W,48):
    d.rectangle((x,0,x+9,W),fill=(115,130,136))
    d.rectangle((x+13,0,x+19,W),fill=(214,224,224))
    d.line((x+47,0,x+47,W),fill=(101,120,129),width=2)
for i in range(100):
    y=int(rng.integers(W)); x=int(rng.integers(W));d.ellipse((x,y,x+3,y+3),fill=(116,124,128))
metal.save(out/'metal_color.jpg',quality=85,optimize=True)

pad=noise((83,122,119),8,2);d=ImageDraw.Draw(pad)
for y in range(-12,W+18,22):
    for x in range(-18,W+18,22):
        off=11 if (y//22)%2 else 0
        x2=x+off
        d.polygon([(x2,y+7),(x2+6,y),(x2+16,y),(x2+21,y+7),(x2+15,y+14),(x2+5,y+14)],outline=(45,78,77),width=3)
        d.line((x2+4,y+14,x2+20,y+7),fill=(127,158,149),width=1)
pad.save(out/'cooling_color.jpg',quality=86,optimize=True)

feathers=noise((234,230,217),7,2);d=ImageDraw.Draw(feathers)
for i in range(2300):
    x=int(rng.integers(W));y=int(rng.integers(W));l=int(rng.integers(4,15))
    c=int(rng.integers(207,247));d.arc((x,y,x+l,y+l//2),0,150,fill=(c,c,min(255,c+5)),width=1)
feathers.save(out/'feathers_color.jpg',quality=88,optimize=True)

# project icon
icon=Image.new('RGBA',(512,512),(10,42,50,255));d=ImageDraw.Draw(icon)
for y in range(512):
    p=y/511;d.line((0,y,512,y),fill=(int(12+9*p),int(41+14*p),int(50+20*p),255))
d.rounded_rectangle((63,74,450,430),radius=80,outline=(74,211,183,255),width=20)
d.ellipse((154,160,339,343),fill=(242,239,219,255))
d.ellipse((300,184,405,285),fill=(242,239,219,255))
d.polygon([(403,220),(449,244),(401,258)],fill=(238,179,69,255))
d.polygon([(318,172),(340,137),(355,183)],fill=(223,87,69,255))
d.ellipse((367,208,378,219),fill=(26,37,43,255))
d.polygon([(125,241),(98,198),(113,287),(155,286)],fill=(233,236,221,255))
icon.save(Path(__file__).parent/'public'/'favicon.png')
icon.save(Path(__file__).parent/'src-tauri'/'icons'/'icon.png')
icon.resize((256,256),Image.Resampling.LANCZOS).save(Path(__file__).parent/'src-tauri'/'icons'/'icon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print([(p.name,round(p.stat().st_size/1024)) for p in sorted(out.iterdir())])
