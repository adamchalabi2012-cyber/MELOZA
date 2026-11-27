const CACHE = 'maestro-v13';

// يفعّل النسخة الجديدة فوراً دون انتظار إغلاق الصفحات
self.addEventListener('install', () => {
  self.skipWaiting();
});

// يحذف كل النسخ المحفوظة القديمة (لا يمسّ الأغاني، فهي محفوظة في مكان آخر)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// يجلب النسخة الأحدث من الإنترنت أولاً، ويستخدم المحفوظة فقط عند عدم وجود اتصال
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
