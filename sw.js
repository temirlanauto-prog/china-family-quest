const CACHE='china-family-quest-v9-2-blue';
const CORE=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./images/manifest.json'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(CORE.map(p=>new Request(p,{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(n=>n.startsWith('china-family-quest-')&&n!==CACHE).map(n=>caches.delete(n)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
 if(event.data?.type==='CACHE_PHOTOS')event.waitUntil(cachePhotos());
});
async function cachePhotos(){
 const cache=await caches.open(CACHE);
 try{
  const r=await fetch('./images/manifest.json',{cache:'no-store'});
  if(!r.ok)return;
  const data=await r.json();await cache.put('./images/manifest.json',r.clone());
  for(const item of data.images||[]){
   const path='./images/'+item.file;
   try{const cached=await cache.match(path);if(cached?.ok)continue;
    const res=await fetch(path);if(res.ok&&res.headers.get('content-type')?.startsWith('image/'))await cache.put(path,res.clone());
   }catch(e){console.warn('Photo offline:',path,e)}
  }
 }catch(e){console.warn('Photo manifest offline:',e)}
}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const res=await fetch(req,{cache:'no-store'});
    if(res.ok)await cache.put('./index.html',res.clone());
    return res;
   }catch{
    return await cache.match('./index.html')||Response.error();
   }
  })());return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req);if(cached?.ok)return cached;
  try{const res=await fetch(req);if(res.ok)cache.put(req,res.clone()).catch(()=>{});return res}
  catch{return Response.error()}
 })());
});
