const C='dd-v12',A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','hero-today.jpg','hero-spend.jpg','hero-food.jpg','hero-faith.jpg','hero-fit.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||/(supabase\.co|plaid\.com)$/.test(new URL(e.request.url).hostname))return;e.respondWith(caches.match(e.request).then(r=>{const f=fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>r);return r||f}))});
