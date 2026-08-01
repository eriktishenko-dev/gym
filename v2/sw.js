/* Erik's Training — offline shell.
   Bump CACHE when index.html changes so phones pick up the new version. */
const CACHE = 'training-v2-1';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // don't let one bad CDN response block the whole install
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Never cache Firebase traffic — it must always hit the network.
  if (/firebaseio\.com|googleapis\.com|identitytoolkit/.test(req.url)) return;

  // Network first for the page itself so a redeploy lands immediately;
  // cache first for everything else so the gym's dead wifi doesn't matter.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return r;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && r.type === 'basic') {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return r;
    }).catch(() => hit))
  );
});
