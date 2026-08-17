---
title: "[M1] 上流の primaryMuscles を監査してから M2 に渡す"
labels: data, taxonomy
milestone: M1
---
**M2 の決定論ベースラインは primary/secondary から按分する（§4.4）ので、
上流の `primaryMuscles` が誤っているとベースライン全体が狂う。**

## 確認済みの不整合

詳細は `docs/data-survey.md` の「上流 primaryMuscles の信頼性」。

デッドリフト系 10 件が 3 つに分裂している。

| primaryMuscles | 件数 | 例                                |
| -------------- | ---- | --------------------------------- |
| `hamstrings`   | 5    | Romanian Deadlift, Clean Deadlift  |
| `quadriceps`   | 4    | Cable Deadlifts, Leverage Deadlift |
| `lower back`   | 1    | **Barbell Deadlift**               |

**最も代表的な Barbell Deadlift だけが `lower back`。**
このままだとデッドリフトの重みが脊柱起立筋に偏る。

`Bench Press - Powerlifting` と `Bench Press with Chains` が `triceps` なのも疑わしい。

## なぜ M5 まで先送りにしないのか

M5（人力レビュー）で直すこともできるが、それでは
**M3 のゴールデンセットが最初から意味のない出力を返す。**
デッドリフトは §7 の「下半身」ケースに直接効く基幹種目なので、
出力の違和感がエンジンのバグなのかデータの誤りなのか切り分けられなくなる。

前倒ししても総作業量は変わらない。M2 の出力が信用できるようになる分だけ得。

## やること

- [ ] 動作パターン単位でグルーピングし、`primaryMuscles` が割れているグループを機械的に列挙する
- [ ] 各グループを「正当な差異 / キーワードの誤マッチ / 本当の不整合」に分類する
- [ ] 本当の不整合だけを修正し、**上流の値を上書きした事実と理由を記録する**
      （上流を更新したときに再適用できるように、差分として持つ）
- [ ] 修正結果をテストで固定する（デッドリフト系の primary が揃っていること等）

## 注意

**全件を見直さない。** 割れているグループだけを見る。
上流は「主働筋の入れ替わり」自体は正しく記録できている
（Close-Grip Bench Press → `triceps`）ので、上流全体を疑う必要はない。
