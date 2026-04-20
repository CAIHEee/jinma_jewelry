import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
        allowedHosts: [
      'pettiest-commutatively-conception.ngrok-free.dev', // 精确添加您的 ngrok 域名
      // 如果需要，也可以添加通配符以允许所有 ngrok-free.dev 的子域名
      // '.ngrok-free.dev'
    ],
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_BACKEND_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
