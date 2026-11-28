const CACHE = 'maestro-v14';
const META = 'maestro-meta';
const META_KEY = 'https://maestro.invalid/mz-names';

// يفعّل النسخة الجديدة فوراً دون انتظار إغلاق الصفحات
self.addEventListener('install', () => {
  self.skipWaiting();
});

// يحذف كل النسخ المحفوظة القديمة (لا يمسّ الأغاني، فهي محفوظة في مكان آخر)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE && n !== META).map((n) => caches.delete(n)));
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

// ===== Web Push (عبر ntfy) =====
async function readMeta() {
  try {
    const c = await caches.open(META);
    const r = await c.match(META_KEY);
    return r ? await r.json() : {};
  } catch (e) { return {}; }
}

// يعرض إشعاراً ثم يغلقه فوراً (المتصفح يشترط إشعاراً مع كل push)
async function quiet() {
  await self.registration.showNotification('Maestro', { tag: 'mz-quiet', silent: true });
  const list = await self.registration.getNotifications({ tag: 'mz-quiet' });
  list.forEach((n) => n.close());
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let d = {};
    try { d = event.data.json(); } catch (e) {}
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible')) return; // التطبيق مفتوح ويعرضها بنفسه

    const meta = await readMeta();
    const names = meta.names || {};
    const L = meta.t || {};
    const m = d.message || {};

    if (d.event !== 'message' || !m.id) {
      return self.registration.showNotification('Maestro', { body: L.exp || '', tag: 'mz-exp' });
    }

    let title = '', body = '', from = '';
    if (m.attachment) {
      if (m.message === 'cover') return quiet();
      from = String((m.message || '').split('|')[0] || '').trim().toLowerCase();
      if (!names[from]) return quiet();
      title = names[from];
      body = '🎵 ' + (m.title || '');
    } else {
      let p = null;
      try { p = JSON.parse(m.message); } catch (e) {}
      if (!p || !p.f) return quiet();
      from = String(p.f).toLowerCase();
      if (p.k === 'req') {
        title = p.n || from;
        body = (L.req || '') + ' ' + (p.n || from);
      } else if (p.k === 'acc') {
        title = p.n || from;
        body = (p.n || from) + ' ' + (L.acc || '');
      } else if (p.k === 'rej') {
        return quiet();
      } else {
        if (!names[from]) return quiet();
        title = names[from];
        body = (p.s ? '🎵 ' + p.s + ' ' : '') + (p.t || '');
      }
    }
    return self.registration.showNotification(title, {
      body,
      tag: 'mz-' + from,
      renotify: true,
      vibrate: [120, 60, 120],
      data: { from }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.focus(); return; }
    }
    await self.clients.openWindow(self.registration.scope);
  })());
});
