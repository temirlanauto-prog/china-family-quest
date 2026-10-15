#!/usr/bin/env python3
"""Download curated Commons files into images/*.webp. Safe to re-run."""
from pathlib import Path
import json, urllib.request, urllib.parse, time, html, re, sys
from PIL import Image, ImageOps
from io import BytesIO
ROOT=Path(__file__).resolve().parent.parent
MANIFEST=json.loads((ROOT/'images'/'manifest.json').read_text(encoding='utf8'))
AGENT='ChinaFamilyQuestOfflinePhotoCache/1.1 (https://github.com/temirlanauto-prog/china-family-quest)'

def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':AGENT,'Accept':'application/json,image/*,*/*'})
 with urllib.request.urlopen(req,timeout=35) as response:return response.read()

def clean(v):return re.sub('<[^>]*>','',html.unescape(v or '')).replace('|',' ')

credits=[]
errors=[]
for item in MANIFEST['images']:
 path=ROOT/'images'/item['file'];title='File:'+urllib.parse.unquote(item['source'].split('File:',1)[1]).replace('_',' ')
 try:
  api='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','format':'json','titles':title,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':'1000'})
  doc=json.loads(get(api).decode('utf8'));page=next(iter(doc['query']['pages'].values()))
  info=page.get('imageinfo',[None])[0]
  if not info:raise RuntimeError('Commons file not found')
  meta=info.get('extmetadata',{})
  license=clean(meta.get('LicenseShortName',{}).get('value',''))
  allowed=any(c in license.upper() for c in ('CC','PUBLIC DOMAIN','PD'))
  if not allowed:raise RuntimeError('License needs review: '+(license or 'missing'))
  author=clean(meta.get('Artist',{}).get('value','Unknown'))
  if not path.exists():
   raw=get(info.get('thumburl') or info['url']);im=ImageOps.exif_transpose(Image.open(BytesIO(raw))).convert('RGB')
   # Uniform 16:10 editorial image, landscape focus with centered crop
   im=ImageOps.fit(im,(1280,800),method=Image.Resampling.LANCZOS,centering=(0.5,0.48))
   im.save(path,'WEBP',quality=82,method=6)
  print(f"OK {item['id']}: {path.stat().st_size//1024} KB, {license}")
  credits.append(f"- **{item['title']}** — {author}; {license}; [источник]({item['source']}); адаптация: уменьшение и WebP.\n")
 except Exception as exc:
  errors.append(item['id']+': '+str(exc));print('FAILED:',item['id'],exc,file=sys.stderr)
 time.sleep(.3)
(ROOT/'images'/'ATTRIBUTION.md').write_text('# Фотографии: авторство и лицензии\n\n'+''.join(credits),encoding='utf8')
print(f'Complete: {len(credits)}/{len(MANIFEST["images"])}')
(ROOT/'images'/'DOWNLOAD_STATUS.md').write_text(
 '# Статус загрузки фотографий\n\n'+
 f'Успешно: **{len(credits)} / {len(MANIFEST["images"])}**\n\n'+
 ('## Требуют проверки\n\n'+''.join('- '+e+'\n' for e in errors) if errors else 'Все фотографии обработаны.\n'), encoding='utf8')
if errors:
 print('Unresolved: '+'; '.join(errors),file=sys.stderr)
 # Do not block the subsequent GitHub commit: partial photos still must be published.

