import react from "@vitejs/plugin-react";
// vitest の test フィールドを型として受け付けるのは vitest/config の defineConfig。
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    // データを JSON でバンドルする（§8）。800 件で数百 KB なので API は不要。
    // 1 ファイルが大きくなるため、既定の警告閾値では毎回警告が出る。
    chunkSizeWarningLimit: 800,
  },
  test: {
    name: "web",
    // ビルド成果物（dist/）の中の js を拾わせない。
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
    // M6 まで UI のテストがないので、0 件でも失敗させない。
    // UI を書き始めたらこの行を消すこと。
    passWithNoTests: true,
  },
});
