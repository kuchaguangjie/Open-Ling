import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["apps/desktop/src/renderer/test/setup.ts"],
    css: true
  },
  resolve: {
    alias: {
      "@renderer": "/apps/desktop/src/renderer",
      "@shared": "/packages/shared/src",
      "@core": "/packages/core/src"
    }
  }
});
