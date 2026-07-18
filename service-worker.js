const CACHE = 'breath-v4';
const ASSETS = [
  '.', 'index.html', 'style.css', 'app.js', 'src/engine.js', 'manifest.json',
  'sound/Start.mp3', 'sound/in.mp3', 'sound/hold.mp3', 'sound/out.mp3', 'sound/finish.mp3',
  'icons/icon-192.png', 'icons/icon-512.png',
];

// 逐一快取而非 cache.addAll()：addAll 是全有全無，任一資源失敗就整批失效。
// 另外 Cache.put() 不接受被重新導向的回應（某些靜態主機會把 index.html 導向 /），
// 因此重建一份乾淨的 Response 再存入。
async function cacheAsset(cache, url) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) return;
    await cache.put(url, new Response(await res.blob(), {
      status: 200,
      headers: res.headers,
    }));
  } catch (err) {
    // 個別資源失敗不阻擋整體安裝
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((url) => cacheAsset(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
