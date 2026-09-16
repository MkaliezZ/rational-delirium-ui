import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { obsidian: fileURLToPath(new URL("./tests/support/fake-obsidian-api.ts", import.meta.url)) },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
});
