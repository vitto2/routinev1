/* Service worker do Routine: cache de assets estáticos, páginas principais offline e push. */
const VERSION = "routine-v2";
const STATIC_CACHE = `${VERSION}-static`;
// Termina em "-pages": o app apaga todos os caches com esse sufixo ao sair da conta.
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

// Só estas telas ficam disponíveis sem internet (a última versão visitada).
const OFFLINE_PAGES = new Set(["/today", "/week", "/progress", "/profile"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Navegação: sempre rede primeiro (dados e sessão são dinâmicos). Se a rede falhar,
 * usa a última cópia da tela; sem cópia, mostra a página de aviso offline.
 */
async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const cacheable = OFFLINE_PAGES.has(url.pathname);

  try {
    const response = await fetch(event.request);

    // Não guarda redirecionamentos (ex.: sessão expirada levando ao login) nem erros.
    if (cacheable && response.ok && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.put(url.pathname, copy)));
    }

    return response;
  } catch {
    if (cacheable) {
      const cached = await caches.match(url.pathname, { cacheName: PAGES_CACHE });
      if (cached) return cached;
    }
    return caches.match(OFFLINE_URL);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Assets imutáveis e ícones: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Routine", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "routine",
      data: { url: payload.url || "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/today", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
