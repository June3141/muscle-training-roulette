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

## Vite+ を採らなかった理由

**前提が 1 つ変わっている。** Vite+ は 2025-10 の発表時に商用ライセンス（source-available、
企業規模による課金）を計画していたが、この計画は撤回された。2026-06 の Cloudflare による
VoidZero 買収を経て、現在は **MIT で完全オープンソース**。有償プランもライセンスキーもない。
つまり「有償だから CI で使えない」という判断は成立しない。

それでも採らなかったのは以下の理由。

1. **v0.2.9 で 1.0 未満。** CI の再現性を最重視する土台に 0.x の破壊的変更リスクを置きたくない
2. **固有の利点がこの規模では効かない。** Vite+ の価値は `vp check` の単一パス実行（fmt + lint +
   typecheck を 1 回のパースで）と monorepo タスクキャッシュだが、3 パッケージ・テスト 1 秒台の
   本プロジェクトでは短縮幅がほぼない
3. **knip はどちらにせよ別途必要。** Vite+ は未使用 export の検出をカバーしていない

**ただし中身は Vite+ と同じツール群を選んでいる**（Vite 8 / Vitest / oxlint / oxfmt）。
Vite+ が 1.0 に達したら `vp migrate` で乗り換えられる状態を意図的に保っている。

## dependency-cruiser を外した理由

当初は循環依存とレイヤー越境（`data → engine → web` の一方向）の検出に採用したが、外した。

**dependency-cruiser 18.2.0 は TypeScript 7 に非対応**（サポート範囲は `>=2.0.0 <7.0.0`）で、
実行すると次の状態になる。

```
✔ no dependency violations found (0 modules, 0 dependencies cruised)
‼ missing-typescript-transpiler: ...
```

**0 モジュールしか走査していないのに終了コード 0 で成功する。**
CI に置くと「検査していないのに緑」という最悪の形になるため、採用を見送った。

代替は以下で、いずれも実機で動作を確認済み:

- **循環依存** → oxlint の `import/no-cycle`。TypeScript のバージョンに依存しない自前パーサで動く。
  意図的に循環を作って検出されることを確認した
- **レイヤー越境** → pnpm workspace の `dependencies` で担保する。
  `packages/data/package.json` に `@mtr/engine` を書かなければ import できない

TypeScript を 6 系に落とせば dependency-cruiser は使えるが、
そのために言語のバージョンを下げるほどの機能ではないと判断した。

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
