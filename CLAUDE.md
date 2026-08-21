# CLAUDE.md

## このプロジェクトの本体はサイトではない

部位選択サイトは**計測器**であって成果物ではない。本体は次の 2 つ。

1. 種目 × 筋肉の重み付きデータセット
2. 指定部位を最もよくカバーする N 種目を選ぶ選択エンジン

設計の根拠は [design.md](./design.md)。判断に迷ったら §1 の「非目的」と §3 の「作らない」を見る。

**M3 まではフロントエンドを書かない。** CLI とゴールデンセットで中身を固める方が速い。

## 構成

```
data/            データセット本体。upstream/ は pnpm data:fetch で再現するのでコミットしない
packages/data/   タキソノミー、スキーマ、バリデーション
packages/engine/ 選択エンジンとカバレッジ計算
apps/web/        サイト（M6）。今はタキソノミーを表示するだけ
docs/adr/        設計判断の記録
.github/bootstrap/ Issue とマイルストーンの定義。scripts/bootstrap-github.sh が読む
```

依存は `data → engine → web` の一方向。逆流させない（データパッケージ単体で公開できる状態を保つ）。

## コマンド

`pnpm verify` が CI と同じ内容
（format / lint / typecheck / テスト+カバレッジ閾値 / 複雑度 / 未使用検出 / build）。
ツール選定の理由は [docs/toolchain.md](./docs/toolchain.md)。

**テストは必ずリポジトリのルートから実行する。** パッケージのディレクトリに移動して
`vitest` を叩くと、プロジェクトの root が二重に解決されてテストが 0 件になる。
特定のパッケージだけ走らせたいときは `pnpm test --project engine`。

新しいパッケージを足すときは `vitest.config.ts` も一緒に置くこと。
ルートの `exclude` はプロジェクトに継承されないため、置き忘れると
ビルド成果物の中の古いテストが実行される。

選択結果を目視するには `pnpm mtr --targets chest,triceps_brachii --count 6 --equipment barbell`。
部位は筋肉 ID か部位グループ名（`chest` `back` `shoulders` `arms` `legs` `trunk`）。

データパイプラインは `packages/data/pipeline/`。`pnpm data:fetch` で上流を取得し、
`pnpm data:audit` で上流 primaryMuscles の不整合を洗い出す。
**上流の値を直接書き換えず、`pipeline/overrides/` に差分として持つ。**

生成スクリプトの言語は TypeScript に寄せる（[ADR 0004](./docs/adr/0004-pipeline-language.md)）。
使い捨ての探索は何で書いてもよいが、リポジトリに残すものは TypeScript。

## 越えてはいけない線

- **EMG（%MVIC）を重みの根拠にしない。** 筋間で比較できず、合計が 1 にならないため配分量に変換できない
- **画像・GIF を追加しない。** ライセンスが問題になる。可視化は自前の SVG のみ
- **CC-BY-SA のデータ（wger 等）を混ぜない。** 継承条件が付き、Unlicense で再配布できなくなる
- **「Core」のような部位総称を筋肉 ID に使わない**（design.md §4.3）
- **分割法（PPL 等）を名乗らない。** 出力が特定の分割法として正しいかの責任を負わない

## ゴールデンセット

`packages/engine/test/golden/`。重みを触ると差分が出る。**これは意図された仕組み。**

差分が出たら、それが改善か劣化かを人間が判断し、理由を PR に書く。
**理由なしにスナップショットを更新しない。** 800 件の調整はこれがないと破綻する。

## 重みデータの扱い

重み付けには主観が入るため、**収束ではなく「明らかな誤りの除去」を目的に据える。**
「0.25 か 0.22 か」の議論には立ち入らない。

## 開発フロー

テスト駆動。失敗するテストを書き、失敗を確認してからコミットし、それを通す実装を書く。
実装中はテストを変更しない。

未実装の箇所は `it.todo` で置いてある。着手するときは、**まず todo を失敗するテストに書き換える**。
