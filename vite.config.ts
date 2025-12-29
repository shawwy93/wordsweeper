import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Word Sweeper",
        short_name: "Word Sweeper",
        start_url: "/",
        display: "standalone",
        background_color: "#0b1020",
        theme_color: "#0b1020",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,png,svg,webp,woff2,mp3,json,txt}"],
        navigateFallback: "/index.html"
      }
    })
  ]
});
