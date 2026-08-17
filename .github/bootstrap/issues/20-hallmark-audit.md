---
title: "[M6] hallmark audit を 1 回かける"
labels: web
milestone: M6
---
design.md §8.1。

[Nutlope/hallmark](https://github.com/Nutlope/hallmark)（MIT）は anti-AI-slop デザインスキル。
`hallmark audit <target>` は **完成した UI を anti-pattern に対して採点して punch list を出す**
非破壊オペレーションなので、最後に一度回すだけでよい。

## 適用する範囲

- [ ] `hallmark audit` を完成した UI にかけ、punch list を確認する
- [ ] データセットの説明セクション（ランディング的な部分）の構成・タイポグラフィ

ハンドビルド SVG をライブラリより優先する方針が、本プロジェクトの
「画像素材を使わず SVG を自前で持つ」判断と一致している。

## 適用しない範囲

- **ツール画面本体**（部位選択 → 種目リスト → カバレッジ図）。
  hallmark はランディングページ寄りで、アプリケーション UI には効きにくい
- **人体図の重み塗り分け。** ここは固有のデータ可視化問題であり、
  どのデザインスキルも助けにならない。**本プロジェクトで唯一の本質的なデザイン作業**

## 注意

Anthropic の `frontend-design` スキルと役割が重なる。同時に有効化すると指示が競合しうるので、
プロジェクト単位でどちらかに寄せること。
