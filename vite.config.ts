import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Never let the SPA navigation fallback intercept API calls (e.g. the
        // Nolio OAuth redirect) — without this, clicking "Connect with Nolio"
        // just re-serves the cached app shell instead of hitting the network.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "Running Coach",
        short_name: "Running Coach",
        description: "AI running coach synced with Nolio",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
