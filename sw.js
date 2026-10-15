const CACHE='china-family-quest-v9-3-blue';
const PHOTO_CACHE='china-family-quest-photos-v1';
const CORE=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./images/manifest.json'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const c=await caches.open(CACHE);await c.addAll(CORE.map(p=>new Request(p,{cache:'reload'})));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 // Preserve old photo caches and migrate photos when available.
 const p=await caches.open(PHOTO_CACHE);
 for(const key of keys.filter(n=>n.startsWith('china-family-quest-')&&n!==CACHE&&n!==PHOTO_CACHE)){
   const old=await caches.open(key);for(const req of await old.keys()){
    if(!new URL(req.url).pathname.match(/\/images\/[^/]+\.webp$/))continue;
    const res=await old.match(req);if(res?.ok&&res.headers.get('content-type')?.startsWith('image/'))await p.put(req,res);
   }
 }
 await Promise.all(keys.filter(n=>n.startsWith('china-family-quest-')&&n!==CACHE&&n!==PHOTO_CACHE).map(n=>caches.delete(n)));
 await self.clients.claim();
 // Fire background cache download without blocking activation.
 cachePhotos().catch(()=>{});
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
 if(event.data?.type==='CACHE_PHOTOS')event.waitUntil(cachePhotos());
});
async function cachePhotos(){
 let manifest;
 try{const r=await fetch('./images/manifest.json',{cache:'no-store'});if(!r.ok)return;manifest=await r.json()}catch{return}
 const cache=await caches.open(PHOTO_CACHE);
 await Promise.allSettled((manifest.images||[]).map(async item=>{
  if(!/^[a-z0-9_-]+\.webp$/i.test(item.file))return;
  const url=new URL('./images/'+item.file,self.registration.scope).href;
  const prev=await cache.match(url);
  if(prev?.ok&&prev.headers.get('content-type')?.startsWith('image/'))return;
  const res=await fetch(url,{cache:'no-store'});
  if(res.ok&&res.headers.get('content-type')?.startsWith('image/'))await cache.put(url,res.clone());
 }));
}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const u=new URL(req.url);if(u.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(req,{cache:'no-store'});if(r.ok)await c.put('./index.html',r.clone());return r}catch{return await c.match('./index.html')||Response.error()}})());return;
 }
 if(/\/images\/[^/]+\.webp$/.test(u.pathname)){
  event.respondWith((async()=>{
    const photo=await caches.open(PHOTO_CACHE),c=await caches.open(CACHE);
    const saved=await photo.match(req)||await c.match(req);
    if(saved?.ok&&saved.headers.get('content-type')?.startsWith('image/'))return saved;
    try{const r=await fetch(req);if(r.ok&&r.headers.get('content-type')?.startsWith('image/'))await photo.put(req,r.clone());return r}catch{return Response.error()}
  })());return;
 }
 event.respondWith((async()=>{const c=await caches.open(CACHE),v=await c.match(req);if(v?.ok)return v;try{const r=await fetch(req);if(r.ok)c.put(req,r.clone()).catch(()=>{});return r}catch{return Response.error()}})());
});
