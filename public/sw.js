// Kill-switch service worker: evicts the old cache-first APEX worker.
// Returning browsers need a same-path replacement worker to drop the old registration.
function isOwnAppCache(name) {
  return /^apex-v\d+$/.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isOwnAppCache).map((n) => caches.delete(n)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
