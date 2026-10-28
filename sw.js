const CACHE = 'kariera-v7';
const FILES = ['./', 'index.html', 'style.css', 'data.js', 'data/ENG.js', 'data/ESP.js', 'data/ITA.js', 'data/GER.js', 'data/FRA.js', 'data/POL.js', 'data/CZE.js', 'data/AUT.js', 'data/NED.js', 'data/BEL.js', 'data/POR.js', 'data/TUR.js', 'data/GRE.js', 'data/NOR.js', 'data/DEN.js', 'data/SCO.js', 'data/SUI.js', 'data/SWE.js', 'data/UKR.js', 'data/CRO.js', 'data/SRB.js', 'data/USA.js', 'data/MEX.js', 'data/BRA.js', 'data/ARG.js', 'data/KSA.js', 'data/JPN.js', 'data/UEFA_MINOR.js', 'engine.js', 'world.js', 'events.js', 'uikit.js', 'uikit.css', 'ui.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
// sieć najpierw (świeże wersje), cache gdy offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
