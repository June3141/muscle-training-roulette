---
title: "[M0] 種目 id を振り直すか、上流の id を保持するか"
labels: decision, data
milestone: M0
---

design.md §4.2 のスキーマ例は `barbell_bench_press` 形式を想定しているが、
free-exercise-db の実 id は英語名のスラグで大文字・ハイフンが混在する。

```
"3_4_Sit-Up"
"Barbell_Bench_Press_-_Medium_Grip"
```

873 件で重複はゼロ（`docs/data-survey.md`）。

## 論点

- **振り直す**: URL やファイル名として扱いやすい。ただし上流の更新に追随できなくなる
- **そのまま使う**: 上流とのマージが容易。ただし id が読みにくく、独自種目を追加したとき形式が揃わない

## 提案

**独自 id を振り、`sourceId` に上流の id を保持する。** 両方の利点が取れる。

- [ ] この方式でよいか
- [ ] 独自 id の命名規則を決める（`snake_case`、器具名を含めるか）
- [ ] 上流に存在しない独自種目の id をどう区別するか
