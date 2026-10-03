// Einfacher Offline-Cache: App-Dateien und Inhalte werden vorgehalten, Schriften zur Laufzeit.
const VERSION = "v1";
const KERN = ["./", "index.html", "css/style.css", "js/app.js", "js/calc.js", "js/store.js", "js/wheel.js", "js/ics.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  ...["seelenkalender", "tage", "tugenden", "nebenuebungen", "rueckschau", "aktuell", "quellen", "erinnerungen"].map((n) => `data/${n}.json`)];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(KERN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(e.request);
    const netz = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || netz;
  }));
});
