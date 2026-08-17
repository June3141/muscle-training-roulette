---
title: "[M0] 重み付け対象のカテゴリ範囲を決める（873 → 何件にするか）"
labels: decision, data
milestone: M0
---

実測は `docs/data-survey.md` を参照。design.md §4.1 は「800+」としか書いていないが、実データは 873 件で、内訳に無視できない偏りがある。

| category              | 件数 |
| --------------------- | ---- |
| strength              | 581  |
| stretching            | 123  |
| plyometrics           | 61   |
| powerlifting          | 38   |
| olympic weightlifting | 35   |
| strongman             | 21   |
| cardio                | 14   |

## 論点

**`stretching`（123）と `cardio`（14）は muscleWeights の意味が変わる。**
ストレッチの「大腿四頭 0.6」は負荷配分ではなく伸張対象であり、
同じフィールドに入れると選択エンジンがストレッチを筋力種目として選ぶ。

`plyometrics` `strongman` `olympic weightlifting` は筋力種目ではあるが、
「部位をカバーする種目セット」として提案されると違和感が出る可能性がある（クリーンが胸の日に出る等）。

## 決めること

- [ ] `stretching` / `cardio` を除外するか（除外すれば 873 → 736）
- [ ] `plyometrics` / `strongman` / `olympic weightlifting` を含めるか（除外すれば 654 → 654）
- [ ] 除外ではなく「候補プールから外すが、データには残す」フラグ方式にするか

## 効果

除外すれば M2 の生成対象と M5 の人力レビュー量がそのまま減る。**M5 が律速なので、ここは実作業量に直結する。**

フラグ方式なら後から復活できるので、削除より安全。
