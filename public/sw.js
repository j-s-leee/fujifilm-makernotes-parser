// Self-destructing service worker: unregisters itself and clears all caches.
// Deployed to clean up after the serwist SW was removed.
self.addEventListener("install", function() { self.skipWaiting(); });
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.registration.unregister();
    }).then(function() {
      return self.clients.matchAll({ type: "window" });
    }).then(function(clients) {
      clients.forEach(function(c) { c.navigate(c.url); });
    })
  );
});
