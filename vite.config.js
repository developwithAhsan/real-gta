import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    host: true,
    port: 5000,
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      "/proxy-game-download": {
        target: "https://archive.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) =>
          path.replace(
            "/proxy-game-download",
            "/download/gta-vicecity-wasm-assets",
          ),
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["cross-origin-resource-policy"] = "cross-origin";
          });
        },
      },
    },
  },
});
