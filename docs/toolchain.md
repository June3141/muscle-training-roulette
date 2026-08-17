# ツールチェーンの選定理由

調査日: 2026-08-17

design.md §8 は「Vite + React（または Astro）。好みで可。ビルド成果物が静的であることのみ必須」
としか書いていない。実際に選ぶにあたって重視したのは **CI の精度**と**複雑度の可視化**の 2 点。

## 結論

| 層 | 採用 |
|---|---|
| パッケージマネージャ | pnpm 11（workspace + catalog） |
| 言語 | TypeScript 7 |
| フレームワーク | React 19 + Vite 8（Rolldown 既定） |
| テスト | Vitest 4 + v8 カバレッジ（閾値あり） |
| Lint | oxlint 1.x |
| Format | oxfmt |
| 未使用検出 | knip 6 |
| 循環依存検出 | oxlint `import/no-cycle` |
| 複雑度 | oxlint の restriction ルール + `oxlint-plugin-complexity`（別設定ファイル） |
| CI | GitHub Actions |

## Vite+ を採らなかった理由（v0.2.9 時点）

Vite+ は **MIT で完全オープンソース**。2025-10 の発表時にあった商用ライセンス計画は撤回され、
2026-06 の Cloudflare による VoidZero 買収後も MIT のまま維持されている。
有償プランもライセンスキーもないので、ライセンスは採否の理由にならない。

採らなかったのは以下の理由。

1. **v0.2.9 で 1.0 未満。** CI の再現性を最重視する土台に 0.x の破壊的変更リスクを置きたくない
2. **固有の利点がこの規模では効かない。** Vite+ の価値は `vp check` の単一パス実行（fmt + lint +
   typecheck を 1 回のパースで）と monorepo タスクキャッシュだが、3 パッケージ・テスト 1 秒台の
   本プロジェクトでは短縮幅がほぼない
3. **knip はどちらにせよ別途必要。** Vite+ は未使用 export の検出をカバーしていない

**ただし中身は Vite+ と同じツール群を選んでいる**（Vite 8 / Vitest / oxlint / oxfmt）。
Vite+ が 1.0 に達したら `vp migrate` で乗り換えられる状態を意図的に保っている。

## dependency-cruiser を使わない理由（18.2.0 / TypeScript 7 時点）

循環依存とレイヤー越境（`data → engine → web` の一方向）の検出に使いたくなるが、
**現在のバージョンの組み合わせでは使えない。**

**dependency-cruiser 18.2.0 は TypeScript 7 に非対応**（サポート範囲は `>=2.0.0 <7.0.0`）で、
実行すると次の状態になる。

```
✔ no dependency violations found (0 modules, 0 dependencies cruised)
‼ missing-typescript-transpiler: ...
```

**0 モジュールしか走査していないのに終了コード 0 で成功する。**
CI に置くと「検査していないのに緑」という最悪の形になる。

> dependency-cruiser が TypeScript 7 に対応したら再検討してよい。
> その場合も、導入直後に「意図的な循環を検出できるか」を必ず実機で確認すること。

代替は以下で、いずれも実機で動作を確認済み:

- **循環依存** → oxlint の `import/no-cycle`。TypeScript のバージョンに依存しない自前パーサで動く。
  意図的に循環を作って検出されることを確認した
- **レイヤー越境** → pnpm workspace の `dependencies` で担保する。
  `packages/data/package.json` に `@mtr/engine` を書かなければ import できない

TypeScript を 6 系に落とせば dependency-cruiser は使えるが、
そのために言語のバージョンを下げるほどの機能ではないと判断した。

## 複雑度チェックを別設定にした理由

`.oxlintrc.complexity.json` を分け、`pnpm complexity` から呼んでいる。

| ルール | 閾値 | 提供元 |
|---|---|---|
| `complexity/complexity`（循環的複雑度） | 12 | `oxlint-plugin-complexity` |
| `complexity/complexity`（**認知的複雑度**） | 15 | 同上（同一ルールで両方測る） |
| `max-depth` | 3 | oxlint ネイティブ |
| `max-params` | 4 | 同上 |
| `max-lines-per-function` | 60 | 同上 |
| `max-statements` | 25 | 同上 |
| `max-nested-callbacks` | 3（テストは 5） | 同上 |

分けている理由:

1. ネイティブ側は oxlint の **restriction カテゴリ**にあり、`-D all` にも含まれない。
   明示的に有効化する必要があり、通常の lint 設定に混ぜると意図が読み取りにくい
2. 閾値の調整が lint 全体の設定を揺らさないようにするため

選択エンジンの貪欲法（§5.1）と目的関数（§5.2）は複雑になりやすい箇所なので、
ここが閾値に触れたら「係数の調整」ではなく「項ごとの関数分割」で対処すること。

### 認知的複雑度をどう測っているか（oxlint 1.78 / plugin 2.1.7 時点）

`oxlint-plugin-complexity` を `jsPlugins` 経由で読み込み、
**循環的複雑度と認知的複雑度を `complexity/complexity` 1 ルールで**測っている。

診断は行単位の内訳を出す。どの分岐が何点寄与し、どこが最大の原因かまで分かる。

```
Function 'messy' has Cognitive Complexity of 20. Maximum allowed is 15.
Breakdown: Line 3: +1 for 'for'  Line 4: +2 for 'if' (incl. +1 nesting)
  >>> Line 5: +3 for 'if' (incl. +2 nesting) [top offender] ...
```

**JS プラグイン API は alpha だが、失敗時に黙らないことを実機で確認している。**

| 失敗のさせ方 | 挙動 |
|---|---|
| プラグインが見つからない | `Cannot find module` で exit 1 |
| プラグイン指定を消してルールだけ残す | `Plugin 'complexity' not found` で exit 1 |

これが確認できたので採用した。dependency-cruiser を外したのは
「0 モジュール走査で exit 0」だったためで、判断基準は同じ。

### Biome を採らなかった理由（Biome 2.5.8 時点）

Biome にも `noExcessiveCognitiveComplexity` はあるが、**McCabe 循環的複雑度・
max-depth・max-statements が存在しない**（設定スキーマと公式の ESLint 対応表で確認）。
つまり Biome を選んでも別ツールとの併用が必要になる。

加えて Biome の複雑度系ルールは**既定 severity が `information` / `warning`** で、
Biome は `error` のみを非ゼロ終了とする。`"level": "error"` を明示し忘れると、
**違反しても CI が緑のまま通る。**

ESLint + `eslint-plugin-sonarjs` の併用も試したが、
**typescript-eslint 8.67 が TypeScript 7 に非対応**
（[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)）。
回避には TS 6 を隔離ワークスペースに閉じ込める必要があり、
1 ルールのために TypeScript を 2 バージョン同居させるのは割に合わない。

## TypeScript の構成

パッケージは `dist` を配布せず、`exports` から `src` の TS を直接参照する。

```json
{ "exports": { ".": "./src/index.ts" } }
```

消費側（Vitest / Vite）が TS をそのまま解決するため、tsc の役割は型検査だけ（`noEmit`）。
project references と composite ビルドは使っていない。ビルド成果物が web の 1 つしかないため。
