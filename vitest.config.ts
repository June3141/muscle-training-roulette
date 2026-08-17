import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "data", root: "./packages/data", include: ["test/**/*.test.ts"] } },
      { test: { name: "engine", root: "./packages/engine", include: ["test/**/*.test.ts"] } },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      reporter: ["text-summary", "lcov"],
      // 実測（2026-08-17 時点で lines 95%）から安全マージンを取った値。
      // 実装が進むにつれて引き上げる。下げる変更は PR で理由を書くこと。
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
