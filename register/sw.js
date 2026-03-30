const CACHE_NAME='moana-caisse-v2';
const ASSETS=[
  'index.html','manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>c.addAll(['index.html','manifest.json']))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>{
    if(r)return r;
    return fetch(e.request).then(res=>{
      if(!res||res.status!==200)return res;
      const clone=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
      return res;
    }).catch(()=>caches.match(e.request));
  }));
});

self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
