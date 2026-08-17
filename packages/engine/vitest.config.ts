import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "engine",
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
  },
});
