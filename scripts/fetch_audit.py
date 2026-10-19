#!/usr/bin/env python3
import json, os, sys, hashlib, subprocess, tempfile, requests, math, time, numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
items=json.loads((ROOT/'data/inventory.json').read_text())
batch=int(sys.argv[1]); selected=items[batch*50:(batch+1)*50]
out=ROOT/'reports';out.mkdir(exist_ok=True)
def run(s):
 p=subprocess.run(s,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=65)
 if p.returncode:raise ValueError((p.stderr or b'bad conversion').decode('utf8','ignore')[-200:])
 return p.stdout
def process(x):
 p=ROOT/'assets/previews'/f"{x['id']}.mp3"
 with tempfile.TemporaryDirectory(prefix='sm-') as t:
  src=Path(t)/('source'+Path(x['filename']).suffix)
  for k in range(2):
   try:
    r=requests.get(x['download_url'],timeout=35,headers={'User-Agent':'SoundmarkSFX/1.5.0'})
    r.raise_for_status()
    raw=r.content
    if len(raw)<800 or len(raw)>5_000_000:raise ValueError('size_out_of_range')
    src.write_bytes(raw)
    break
   except Exception:
    if k==1:raise
    time.sleep(.8)
  info=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate','-of','json',str(src)]))
  dur=float(info['format']['duration'])
  if not (.12<=dur<=600):raise ValueError('duration_out_of_bounds')
  decoded=run(['ffmpeg','-nostdin','-loglevel','error','-t','20','-i',str(src),'-ac','1','-ar','16000','-f','f32le','-'])
  y=np.frombuffer(decoded,dtype='<f4')
  if y.size<2400 or not np.isfinite(y).all():raise ValueError('audio_decode_failed')
  peak=float(np.max(np.abs(y)));rms=float(np.sqrt(np.mean(y.astype('float64')**2)))
  if peak<.003 or rms<.0008:raise ValueError('near_silent')
  clip_fraction=float(np.mean(np.abs(y)>=.999))
  if clip_fraction>.025:raise ValueError('excessive_clipping')
  # Static independent preview; ceiling and loudness normalization are applied only to preview.
  run(['ffmpeg','-nostdin','-y','-hide_banner','-loglevel','error','-t','12','-i',str(src),
       '-vn','-af','loudnorm=I=-19:TP=-2:LRA=11,alimiter=limit=0.86',
       '-ac','1','-ar','24000','-c:a','libmp3lame','-b:a','64k',str(p)])
  play=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)]))
  prev=float(play['format']['duration'])
  if prev<.15:raise ValueError('bad_preview_duration')
  return {'id':x['id'],'success':True,'input_sha256':hashlib.sha256(raw).hexdigest(),'preview_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
       'input_bytes':len(raw),'preview_bytes':p.stat().st_size,'source_duration':round(dur,3),'preview_duration':round(prev,3),
       'peak_dbfs':round(20*math.log10(max(peak,1e-8)),1),'rms_dbfs':round(20*math.log10(max(rms,1e-8)),1),
       'clip_fraction':round(clip_fraction,5),'codec':info.get('streams',[{}])[0].get('codec_name',''),'file':p.name}
def f(x):
 try:return process(x)
 except Exception as e:return {'id':x['id'],'success':False,'error':str(e)[:220]}
with ThreadPoolExecutor(max_workers=9) as ex:
 jobs=[ex.submit(f,x) for x in selected]
 rows=[j.result() for j in as_completed(jobs)]
(out/f'qa-batch-{batch}.json').write_text(json.dumps(sorted(rows,key=lambda y:y['id']),ensure_ascii=False,indent=2))
print(json.dumps({'batch':batch,'attempted':len(rows),'passed':sum(x['success'] for x in rows),'failures':[x for x in rows if not x['success']][:10]},ensure_ascii=False))
