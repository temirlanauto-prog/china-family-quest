const CACHE='china-family-quest-v8-blue';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./images/manifest.json'];
async function cachePhotos(){const cache=await caches.open(CACHE);let manifest;try{let r=await fetch('./images/manifest.json',{cache:'no-store'});if(!r.ok)return;await cache.put('./images/manifest.json',r.clone());manifest=await r.json();}catch{return}
let successes=0;for(const item of manifest.images||[]){const url='./images/'+item.file;try{let cached=await cache.match(url);if(cached?.ok){successes++;continue}let response=await fetch(url);if(response.ok&&response.headers.get('content-type')?.startsWith('image/')){await cache.put(url,response.clone());successes++}}catch(e){console.warn('Photo not cached:',url,e)}}return successes}
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{let keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('china-family-quest-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();await cachePhotos()})()));
self.addEventListener('message',e=>{if(e.data?.type==='CACHE_PHOTOS')e.waitUntil(cachePhotos())});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==self.location.origin)return;
e.respondWith((async()=>{const c=await caches.open(CACHE);const old=await c.match(req);if(old?.ok)return old;try{const r=await fetch(req);if(r.ok){c.put(req,r.clone()).catch(()=>{});}return r}catch{if(req.mode==='navigate'){return await c.match('./index.html')||Response.error()}return Response.error()}})())});
