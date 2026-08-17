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

> [!NOTE]
> **結論が出た（2026-08-17）。** 全件を精査した結果、**ストレッチ 123 件と有酸素 14 件だけを除外し、
> 残り 736 件を対象にする**。詳細は `docs/data-survey.md` の「対象範囲は 736 件」。
>
> 当初は plyometrics / strongman / olympic の 117 件も除外する案だったが、
> **カテゴリ単位で切ると中身の例外を落とす**ことが分かったので撤回した。
>
> - `olympic weightlifting` を落とすと Romanian Deadlift / Push Press / Overhead Squat など
>   一般的な筋力種目が 10 件以上消え、僧帽筋 primary 15 件のうち 2 件も失う
> - `strongman` を落とすと **`carry` の movementPattern が候補ゼロ**になる
>   （Farmer's Walk / Rickshaw Carry / Yoke Walk はこのカテゴリにしかない）
> - `plyometrics` を落とすと **内転筋 primary 6 件のうち 4 件**を失う
>
> 代わりに二軸で管理する。データセットは 736 件、候補プールは `selectable` フラグで
> **種目単位**に絞る。M5 のレビュー量は「対象を削る」ではなく「優先順位を付ける」で管理する。

## 残っている作業

- [ ] `selectable: false` にする種目を種目単位で洗い出す
      （アトラスストーン等の特殊器具、Snatch Balance 等の純粋な技術種目）
- [ ] M5 のレビュー優先度を決める（筋トレ + パワーリフティング 619 件を先に）

## 当初の検討内容（記録）

## 決めること

- [ ] `stretching` / `cardio` を除外するか（除外すれば 873 → 736）
- [ ] `plyometrics` / `strongman` / `olympic weightlifting` を含めるか（除外すれば 654 → 654）
- [ ] 除外ではなく「候補プールから外すが、データには残す」フラグ方式にするか

## 効果

除外すれば M2 の生成対象と M5 の人力レビュー量がそのまま減る。**M5 が律速なので、ここは実作業量に直結する。**

フラグ方式なら後から復活できるので、削除より安全。
