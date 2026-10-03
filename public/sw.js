// Service worker mínimo: hace que la app sea instalable.
// No guarda nada en caché a propósito: así siempre ves la última versión y los datos reales.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
