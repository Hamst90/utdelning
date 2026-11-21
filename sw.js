// Utdelningsrutt – service worker. Gör appen installerbar och låter den starta utan täckning.
// Hämtar alltid nytt från nätet först (så att uppdateringar syns direkt) och faller tillbaka på sparad kopia.
const CACHE = 'utdelning-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // kalkylark, karta m.m. går direkt
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
