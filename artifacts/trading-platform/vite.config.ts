import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname, "../..");
  const env = loadEnv(mode, rootDir, "");
  const port = Number(env.WEB_PORT || 3000);
  const basePath = env.BASE_PATH || "/";
  const apiPort = env.API_PORT || env.PORT || "8080";

  return {
    base: basePath,
    envDir: rootDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      target: "es2020",
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
              if (id.includes("framer-motion")) return "vendor-motion";
              if (id.includes("@tanstack")) return "vendor-query";
              if (id.includes("lucide-react")) return "vendor-icons";
              if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
              if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
              if (id.includes("@react-oauth")) return "vendor-oauth";
              return "vendor";
            }
          },
        },
      },
    },
    server: {
      port,
      strictPort: false,
      host: "127.0.0.1",
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes, req) => {
              if (String(req.url || "").includes("/notifications/stream")) {
                proxyRes.headers["cache-control"] = "no-cache, no-transform";
                proxyRes.headers["x-accel-buffering"] = "no";
              }
            });
          },
        },
        "/uploads": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: "127.0.0.1",
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes, req) => {
              if (String(req.url || "").includes("/notifications/stream")) {
                proxyRes.headers["cache-control"] = "no-cache, no-transform";
                proxyRes.headers["x-accel-buffering"] = "no";
              }
            });
          },
        },
        "/uploads": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
