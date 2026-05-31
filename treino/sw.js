const CACHE = 'bhr-saude-v13';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&family=Syne:wght@500;700;800&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Web Push: notificação mandada pelo servidor (tela bloqueada) ─────
// O app.js chama a Edge Function que dorme N segundos e manda o push
// via APNs. O SW aqui só recebe o evento push e exibe a notificação.
// Chega no fone Bluetooth mesmo com tela apagada — igual WhatsApp.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data?.json() || {}; } catch(_) {}
  e.waitUntil(
    self.registration.showNotification(data.title || '⏱ Descanso acabou!', {
      body:               data.body || 'Hora da próxima série 💪',
      icon:               './icon-192.png',
      badge:              './icon-192.png',
      tag:                'rest-timer',
      renotify:           true,
      requireInteraction: false,
      vibrate:            [300, 100, 300, 100, 500],
      silent:             false,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(cs => {
    const c = cs.find(w => w.url.includes('bhr-saude'));
    if (c) return c.focus();
    return clients.openWindow('./');
  }));
});

// Network-first pros próprios assets (HTML/JS/CSS/manifest) — garante update
// Cache-first pras fontes e outros CDNs (raramente mudam).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isOwnAsset = url.origin === location.origin;

  if (isOwnAsset) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        }).catch(() => cached);
      })
    );
  }
});
