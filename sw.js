const C='dd-v16',A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','hero-today.jpg','hero-spend.jpg','hero-food.jpg','hero-faith.jpg','hero-fit.jpg','hero-wish.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).hostname.endsWith('supabase.co'))return;e.respondWith(caches.match(e.request).then(r=>{const f=fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>r);return r||f}))});
// Reminders: show the nag, put the number of open pillars on the home-screen icon, open Today when tapped.
self.addEventListener('push',e=>{const d=e.data?e.data.json():{};e.waitUntil(Promise.all([
 self.registration.showNotification(d.title||'Daily Discipline',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',data:d.url||'./',tag:d.tag||undefined,renotify:!!d.tag,requireInteraction:true}),
 d.badge!=null&&self.navigator.setAppBadge?self.navigator.setAppBadge(d.badge).catch(()=>{}):null]))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l)if('focus' in c)return c.focus();return clients.openWindow(e.notification.data||'./')}))});
