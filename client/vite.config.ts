import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
        credentials: true,
      },
      "/users": {
        target: "http://localhost:4000",
        changeOrigin: true,
        credentials: true,
      },
      "/requests": {
        target: "http://localhost:4000",
        changeOrigin: true,
        credentials: true,
      },
      "/nexconn": {
        target: "http://localhost:4000",
        changeOrigin: true,
        credentials: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
        credentials: true,
      },
    },
  },
});
