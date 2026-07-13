/// <reference lib="webworker" />
// @ts-nocheck
// Custom service worker (injectManifest strategy) — the default generateSW
// service worker can't handle push events, which real notifications need.

import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // non-JSON payload — fall back to defaults below
  }

  const title = data.title || "Running Coach";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(async (clientsList) => {
      const existing = clientsList.find((client) => client.url.includes(self.location.origin));
      if (existing) {
        // focus() alone leaves the window on whatever page it already had open
        // — navigate() is what actually takes the athlete to the right tab
        // (e.g. straight into the Coach chat) instead of just the dashboard.
        if ("navigate" in existing) await existing.navigate(url);
        if ("focus" in existing) return existing.focus();
        return;
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
