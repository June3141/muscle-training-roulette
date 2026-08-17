import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ディレクトリをグロブで拾う。プロジェクトを列挙すると、
    // 新しいパッケージのテストや `src/` にコロケートしたテストが
    // 「1 件も実行されないまま exit 0」になる。
    // ディレクトリをグロブで拾う。プロジェクトをここで列挙すると、
    // 新しいパッケージのテストや src にコロケートしたテストが
    // 「1 件も実行されないまま exit 0」になる。
    //
    // 各パッケージ側の設定ファイルで exclude を指定しているのは、
    // ここに書いた exclude がプロジェクトに継承されないため。
    // 新しいパッケージを足すときは vitest.config.ts も一緒に置くこと。
    projects: ["packages/*", "apps/*"],
    coverage: {
      provider: "v8",
      // apps/web は M6 まで UI を書かないので対象外。
      // UI を書き始めたら apps/*/src/**/*.{ts,tsx} を足すこと（Issue: [M6] UI を作る）。
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
