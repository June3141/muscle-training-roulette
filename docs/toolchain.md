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
| 複雑度 | oxlint の restriction ルール（別設定ファイル） |
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

## Biome を使わない理由（Biome 2.5.8 / oxlint 1.78 時点）

lint と format を 1 つにまとめられるので候補になるが、**この構成では正味の後退になる。**

**Biome に存在しないルール**（現在 oxlint で CI をブロックできているもの）:

- `complexity`（McCabe 循環的複雑度）— complexity グループ 43 ルールに相当物なし
- `max-depth`（ネスト深さ）
- `max-statements`（文数）

**得られるのは認知的複雑度 1 項目だけ**（`noExcessiveCognitiveComplexity`。oxlint にはない）。

さらに致命的なのは既定の severity。**Biome の複雑度系ルールは既定が
`information` / `warning` で、Biome は `error` のみを非ゼロ終了とする。**
`"level": "error"` を明示しない限り、**違反が出ても CI は緑のまま通る。**
これは本プロジェクトが最も避けたい状態（`dependency-cruiser` を外したのと同じ理由）。

フォーマッタも oxfmt が Prettier conformance テスト 100% 通過なのに対し Biome は 97%。

### 認知的複雑度は既知のギャップとして残す

**現状、認知的複雑度（cognitive complexity）だけは測れていない。** これは意図的な妥協。

埋める方法を 3 つ検討して、いずれも却下した。

| 案 | 却下理由 |
|---|---|
| oxlint のネイティブ `sonarjs` プラグイン | **存在しない。** 移植要望（oxc#4863）は LGPL ライセンスが障壁で 2024-08 から停止 |
| JS プラグイン API + `oxlint-plugin-complexity` | **API が alpha。** CI の信頼性を alpha 基盤に賭けることになる |
| ESLint + `eslint-plugin-sonarjs` を併用 | 下記 |

**ESLint 併用を実際に試して却下した記録**（2026-08-17）:

1. lint ツールが 2 つになり設定が二重化する。どちらが何を検査しているか追えなくなるのは、
   このプロジェクトが最も避けたい状態
2. **typescript-eslint 8.67 は TypeScript 7 に非対応**
   （[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)）。
   実行すると明示的にエラーで停止する（dependency-cruiser のようなサイレント成功ではない）
3. 回避するには TS 6 を隔離ワークスペースに閉じ込める必要がある。
   **1 ルールのために TypeScript を 2 バージョン同居させるのは割に合わない**

再検討の条件は「oxlint の JS プラグイン API が stable になる」か
「typescript-eslint が TS 7 に対応する」のどちらか。

## 複雑度チェックを別設定にした理由

`.oxlintrc.complexity.json` を分け、`pnpm complexity` から呼んでいる。

| ルール | 閾値 |
|---|---|
| `complexity`（循環的複雑度） | 12 |
| `max-depth` | 3 |
| `max-params` | 4 |
| `max-lines-per-function` | 60 |
| `max-statements` | 25 |
| `max-nested-callbacks` | 3（テストは 5） |

分けている理由:

1. これらは oxlint の **restriction カテゴリ**にあり、`-D all` にも含まれない。
   明示的に有効化する必要があり、通常の lint 設定に混ぜると意図が読み取りにくい
2. 閾値の調整が lint 全体の設定を揺らさないようにするため

**認知的複雑度（cognitive complexity）は入れていない。** oxlint はネイティブの `sonarjs` プラグインを
まだ提供しておらず（`Plugin 'sonarjs' not found`）、JS プラグイン API 経由で
`eslint-plugin-sonarjs` を使う経路は alpha 段階のため。安定したら追加を検討する。

選択エンジンの貪欲法（§5.1）と目的関数（§5.2）は複雑になりやすい箇所なので、
ここが閾値に触れたら「係数の調整」ではなく「項ごとの関数分割」で対処すること。

## TypeScript の構成

パッケージは `dist` を配布せず、`exports` から `src` の TS を直接参照する。

```json
{ "exports": { ".": "./src/index.ts" } }
```

消費側（Vitest / Vite）が TS をそのまま解決するため、tsc の役割は型検査だけ（`noEmit`）。
project references と composite ビルドは使っていない。ビルド成果物が web の 1 つしかないため。
