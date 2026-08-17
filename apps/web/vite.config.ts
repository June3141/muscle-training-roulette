import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // データを JSON でバンドルする（§8）。800 件で数百 KB なので API は不要。
    // 1 ファイルが大きくなるため、既定の警告閾値では毎回警告が出る。
    chunkSizeWarningLimit: 800,
  },
});
