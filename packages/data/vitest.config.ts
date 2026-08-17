import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "data",
    // include は既定（**/*.test.ts）のまま。src にコロケートしたテストも拾わせる。
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
  },
});
