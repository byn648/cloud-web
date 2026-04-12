import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

function toPort(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyHost = env.VITE_PROXY_HOST || "127.0.0.1";
  const devPort = toPort(env.VITE_DEV_SERVER_PORT, 5174);
  const portalPort = toPort(env.VITE_PROXY_PORTAL_PORT, 8810);
  const managerPort = toPort(env.VITE_PROXY_MANAGER_PORT, 8811);
  const consolePort = toPort(env.VITE_PROXY_CONSOLE_PORT, 8818);
  const workloadPort = toPort(env.VITE_PROXY_WORKLOAD_PORT, 8812);

  const buildTarget = (port: number): string => `http://${proxyHost}:${port}`;

  return {
    plugins: [vue()],
    server: {
      host: "0.0.0.0",
      port: devPort,
      proxy: {
        "/portal": {
          target: buildTarget(portalPort),
          changeOrigin: true
        },
        "/manager": {
          target: buildTarget(managerPort),
          changeOrigin: true
        },
        "/console": {
          target: buildTarget(consolePort),
          changeOrigin: true
        },
        "/workload": {
          target: buildTarget(workloadPort),
          changeOrigin: true
        }
      }
    }
  };
});
