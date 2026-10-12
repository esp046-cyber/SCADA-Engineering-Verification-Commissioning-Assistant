/* Service worker — cache-first app shell for offline use.
   Bump VERSION whenever any app file changes so clients fetch the new files. */
const VERSION = 'v1.0.0';
const CACHE = 'scada-evc-' + VERSION;
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/util.js",
  "js/csv.js",
  "js/xlsx.js",
  "js/pdf.js",
  "js/db.js",
  "js/ui.js",
  "js/charts.js",
  "js/logic.js",
  "js/builtin.js",
  "js/sample.js",
  "js/common.js",
  "js/exports.js",
  "js/views-projects.js",
  "js/views-io.js",
  "js/views-tags.js",
  "js/views-alarms.js",
  "js/views-comms.js",
  "js/views-fatsat.js",
  "js/views-checklist.js",
  "js/views-defects.js",
  "js/views-reports.js",
  "js/views-dashboard.js",
  "js/views-data.js",
  "js/app.js",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('scada-evc-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
