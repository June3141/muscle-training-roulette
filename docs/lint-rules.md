# lint 設定の意図

`.oxlintrc.json` は JSON なのでコメントを書けない。無効化したルールの理由はここに残す。

検証日: 2026-08-17 / oxlint 1.78.0

## 型認識 lint（`--type-aware`）を有効にしている

`pnpm lint` は `oxlint --type-aware --deny-warnings` を実行する。
`oxlint-tsgolint` が型情報を読み、typescript-eslint 相当の型依存ルールが動く。

**これがないと `await` 忘れが素通りする。** 実測:

| 検査 | `--type-aware` あり | なし |
|---|---|---|
| `no-floating-promises`（await 忘れ） | 検出 | **exit 0 で素通り** |
| `await-thenable`（非 Promise への await） | 検出 | **exit 0 で素通り** |

実行時間は 1.5 秒（型情報なしは 0.8 秒）。

## `--deny-warnings` を付けている理由

**oxlint は既定で警告を出しても終了コード 0 を返す。** 実測で確認済み
（`no-debugger` を `warn` にして違反を作ると、警告は表示されるが exit 0）。

CI に置く以上、警告が出たら落ちてほしいので `--deny-warnings` を付けている。
あわせて `perf` カテゴリを `warn` から `error` に変えた
（`warn` のままでは perf ルールの違反が CI を素通りしていた）。

## 無効にしたルールと理由

| ルール | 理由 |
|---|---|
| `typescript/no-unsafe-type-assertion` | `Object.keys()` が `string[]` を返す TypeScript の制約により、`as MuscleId[]` のようなキャストが避けられない。typescript-eslint でも strict プリセットに含まれない opt-in ルール |
| `vitest/warn-todo` | **未実装箇所を `it.todo` で明示的にマークする運用**（CLAUDE.md）と衝突する。着手時に失敗するテストへ書き換えるのが前提なので、`.todo` の存在自体は正常 |
| `vitest/valid-expect` | **誤検出。** vitest は `expect(actual, message)` の第 2 引数を公式にサポートしているが、このルールは jest の仕様（引数 1 個）で判定している。ゴールデンセットのテストで「どのケースが失敗したか」を示すのに使っている |
| `react/react-in-jsx-scope` | 新しい JSX transform では `import React` が不要 |
| `no-console` | CLI とデータ生成スクリプトが標準出力を使う |

## 有効にしていて実際に効いているもの

いずれも意図的に違反を作って発火を確認済み。

- `import/no-cycle` — 循環 import（dependency-cruiser の代替）
- `react/jsx-key` — リスト描画の key 欠落
- `vitest/no-focused-tests` — `it.only` のコミット防止
- `complexity/complexity` — 循環的複雑度 12 / 認知的複雑度 15（`.oxlintrc.complexity.json`）
- `eslint/max-depth` ほか構造メトリクス（同上）

## テストファイルの緩和

`**/*.test.ts` では `typescript/no-explicit-any` を無効にしている。
不正な入力を渡してバリデーションを検証する箇所で必要になるため。
