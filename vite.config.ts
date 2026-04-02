import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    proxy: {
      // cloud-back portal-api
      "/portal": {
        target: "http://127.0.0.1:8810",
        changeOrigin: true
      },
      // placeholders reserved for future services
      "/manager": {
        target: "http://127.0.0.1:8811",
        changeOrigin: true
      },
      "/console": {
        target: "http://127.0.0.1:8818",
        changeOrigin: true
      },
      "/workload": {
        target: "http://127.0.0.1:8812",
        changeOrigin: true
      }
    }
  }
});
