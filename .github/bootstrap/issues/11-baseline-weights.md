---
title: "[M2] 決定論ベースラインで全件に muscleWeights を入れる"
labels: data, weight-review
milestone: M2
---
design.md §4.4 の手順 1〜2。**品質は問わない。全件に値が入っていることが完了条件。**

## ベースライン規則

- `isolation` → primary に 0.75〜0.85、残りを secondary に分配
- `compound` → primary 間で分配、secondary は 0.10〜0.20 帯
- 合計 1.0 に正規化（`muscleWeightsSchema` が検証する）

## 欠損への対処

**`mechanic` が null の種目が上流に 87 件ある**（`docs/data-survey.md`）。
このままだと上の分岐に落ちない。primary/secondary の要素数からのフォールバックが必要。

目安: primary が 1 つで secondary が 0〜1 なら isolation 相当、
primary が複数または secondary が 3 つ以上なら compound 相当。

## EMG は使わない

%MVIC は「その筋自身の最大収縮に対する割合」であり、筋間で比較できず、合計が 1 にならない。
必要な配分量に変換できないため、根拠として採用しない（§4.4）。

## 完了条件

- [ ] 対象全件に `muscleWeights` が入り、スキーマ検証を通る
- [ ] 生成が決定論的（同じ入力から同じ出力）で、スクリプトとして再実行できる
- [ ] 手で書いた値が 1 件も混ざっていない（M2 の時点では機械生成のみ）
