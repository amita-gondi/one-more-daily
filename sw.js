const CACHE='one-more-app-v2';
const BASE=new URL('./',self.location.href);
const FILES=['./','index.html','style.css','app.mjs','engine.mjs','install.mjs','push.mjs','public-url.mjs','words.txt','common.txt','puzzles.json','families.json','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const ASSETS=new Set(FILES.map(path=>new URL(path,BASE).pathname));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new URL(path,BASE).href))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('one-more-app-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin||!ASSETS.has(url.pathname)||url.search)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response.ok&&!response.redirected&&response.type==='basic')await cache.put(request,response.clone());
      return response;
    }catch(error){
      const stored=await cache.match(request);
      if(stored)return stored;
      if(request.mode==='navigate')return (await cache.match(new URL('index.html',BASE).href))||Response.error();
      return Response.error();
    }
  })());
});
// Delivery is activated only after a public push service has been connected
// and the player explicitly subscribes. No permission request happens here.
self.addEventListener('push',event=>{
  let message={};
  try{message=event.data?.json()||{};}catch{}
  event.waitUntil(self.registration.showNotification(message.title||'One More',{
    body:message.body||'Your new daily words are ready.',
    icon:new URL('icons/icon-192.png',BASE).href,
    badge:new URL('icons/icon-192.png',BASE).href,
    tag:'one-more-daily',
    data:{url:BASE.href}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    const current=windows.find(client=>new URL(client.url).origin===BASE.origin&&new URL(client.url).pathname.startsWith(BASE.pathname));
    if(current)return current.focus();
    return self.clients.openWindow(BASE.href);
  }));
});
