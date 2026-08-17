---
title: "[M3] ゴールデンセットを実行可能にし、CLI を作る"
labels: engine, golden-set
milestone: M3
---
design.md §7 と §10（M3 の完了条件は「ゴールデンセットが動く」）。

ケース定義は `packages/engine/test/golden/cases.ts` に 5 件ある。
現在は定義の健全性だけ検査していて、**実行は `it.todo`**。

## やること

1. 各ケースを実際に選択エンジンに通す
2. `mustContain` を検証する
3. 出力セットをスナップショットとして保存する

## 重要

> 重みを触るたびに既存の妥当な出力が壊れていないか検出する。
> **これがないと 800 件の調整は破綻する。**

完全一致は求めない。人間が judge した結果をスナップショットとして保存し、差分だけ確認する。
**理由なしにスナップショットを更新する PR はマージしない**（CONTRIBUTING.md）。

## 自重ケースの扱い

`bodyweight_full` は「生成に成功する」だけでなく、
**二頭が空くことを明示できる**ところまでを期待値にする。
primary が二頭の自重種目は上流に 0 件（`docs/data-survey.md`）。
黙って埋まる部位だけ返すのは不可。

## CLI

M3 の完了条件。フロントエンドを書かずに出力を目視するために要る。

```
pnpm mtr --targets chest,triceps --count 6 --equipment barbell,dumbbell
```

- [ ] 種目リスト（順序付き）を出力する
- [ ] カバレッジを数値で出力する
- [ ] `uncovered` を明示する
