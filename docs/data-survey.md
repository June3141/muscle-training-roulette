# ベースデータ実測メモ（free-exercise-db）

調査日: 2026-08-17 / 対象: `yuhonas/free-exercise-db` `dist/exercises.json`（main）

design.md §4.1 と §5.4 の想定を実データで確認した結果。**M1・M2 の見積もりはこの数字を前提にする。**

## 全体

| 項目        | 値                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------ |
| 総種目数    | **873**                                                                                    |
| `id` の重複 | 0 件                                                                                       |
| `id` の形式 | `3_4_Sit-Up` / `Barbell_Bench_Press_-_Medium_Grip`（英語名のスラグ、大文字・ハイフン混在） |

§4.2 のスキーマ例は `barbell_bench_press` 形式を想定しているが、実データは上記の形式。
**独自 id を振り直すか、元の id をそのまま外部キーとして保持するかを M1 で決める。**
振り直す場合、上流の更新に追随できなくなるので、`sourceId` を別フィールドで持つのが無難。

## カテゴリ分布

| category              | 件数    |
| --------------------- | ------- |
| strength              | **581** |
| stretching            | 123     |
| plyometrics           | 61      |
| powerlifting          | 38      |
| olympic weightlifting | 35      |
| strongman             | 21      |
| cardio                | 14      |

`stretching` と `cardio`（計 137 件）は muscleWeights の意味が変わる（負荷配分ではない）。
**M1 で対象を `strength` + `powerlifting` + `olympic weightlifting` あたりに絞るか要判断。**
絞れば重み付け対象は 873 → 654 件程度になり、M5 の人力レビュー量が 25% 減る。

## 欠損フィールド

| フィールド                  | null 件数 |
| --------------------------- | --------- |
| `mechanic`                  | **87**    |
| `equipment`                 | 77        |
| `force`                     | 29        |
| `level` / `category` / `id` | 0         |

§4.4 の決定論ベースラインは `mechanic`（compound / isolation）で分岐する設計なので、
**87 件はベースライン生成の分岐に落ちない。** primary/secondary の要素数から推定するフォールバックが要る。

## 候補プールの偏り（§5.4 の確認）

**カバレッジは secondary からも積み上がるので、primary だけを数えても偏りは分からない。**
`category=strength` における primary / secondary 両方の出現数:

| 部位        | primary | secondary | 合計    |
| ----------- | ------- | --------- | ------- |
| hamstrings  | 28      | 91        | **119** |
| glutes      | 11      | 99        | **110** |
| abdominals  | 81      | 24        | 105     |
| quadriceps  | 60      | 30        | 90      |
| calves      | 15      | 74        | 89      |
| middle back | 30      | 43        | 73      |
| forearms    | 21      | 48        | 69      |
| lats        | 29      | 39        | 68      |
| lower back  | 5       | 48        | 53      |
| traps       | 13      | 35        | 48      |
| **adductors** | 2     | 4         | **6**   |
| **abductors** | 2     | 3         | **5**   |
| **neck**    | 5       | **0**     | **5**   |

（shoulders / chest / triceps / biceps は primary だけで 50〜104 件あり十分）

**本当に薄いのは外転筋・内転筋・首の 3 つだけ。**
primary が 11 件しかない glutes も、secondary を含めれば 110 件あるので問題にならない。
§7 のゴールデンセット「下半身: 四頭・ハム・臀 / 5種目」は成立する。

### 中臀筋（abductors 5 件）の扱い

`abductors` を primary に持つのは `Monster Walk` と `Thigh Abductor` の 2 件だけで、
secondary に持つ 3 件はいずれも primary が `quadriceps`（スクワット系）。

**上流はスクワットやランジで中臀筋が働くことをほとんど記録していない。**
解剖学的には確実に働くので、これは上流の欠落。
分類を維持したうえで、M1 で片脚種目とスクワット系に自前で振る（ADR 0005）。

### 首（neck 5 件）の扱い

5 件すべてがアイソメトリック首トレで、**secondary 参照は 0**。
他のどの種目とも繋がっていない孤島なので、**タキソノミーの対象外とする**（ADR 0005）。

## 上流 primaryMuscles の信頼性

**§4.4 の決定論ベースラインは primary/secondary から按分するので、
上流の `primaryMuscles` が誤っているとベースライン全体が狂う。** 実態を確認した。

### まず、上流は「主働筋の入れ替わり」を正しく記録している

グリップによって主働筋が変わる場合、上流はそれを `primaryMuscles` に反映している。

| 種目                                   | primaryMuscles |
| -------------------------------------- | -------------- |
| Barbell Bench Press - Medium Grip      | `chest`        |
| **Close-Grip** Barbell Bench Press     | **`triceps`**  |
| Wide-Grip Barbell Bench Press          | `chest`        |
| Dumbbell Bench Press with Neutral Grip | `chest`        |

ラットプルダウンは Close-Grip / Wide-Grip / Underhand / V-Bar すべて `lats` のまま。
**この性質は M1 の種目統合を機械化する足がかりになる**（ADR 0002 を参照）。

### 一方で、基幹種目に不整合がある

動作キーワードでグルーピングし、`primaryMuscles` が割れているものを調べた。
19 グループ中 12 グループで割れていたが、**大半は問題ない**。

- **正当な差異** — リストカール（`forearms`）とレッグカール（`hamstrings`）が
  「curl」で同居する類。Dips - Chest Version、Scapular Pull-Up なども本当に別種目
- **キーワードの誤マッチ** — `Nar`**`row`**` Stance Leg Press` が「row」に引っかかる類

**本当の不整合はデッドリフト系。**

| primaryMuscles | 件数 | 例                                  |
| -------------- | ---- | ----------------------------------- |
| `hamstrings`   | 5    | Romanian Deadlift, Clean Deadlift    |
| `quadriceps`   | 4    | Cable Deadlifts, Leverage Deadlift   |
| `lower back`   | 1    | **Barbell Deadlift**                 |

同じヒンジ動作が 3 つに分裂しており、しかも**最も代表的な Barbell Deadlift だけが
`lower back`** になっている。これをそのままベースラインに通すと、
デッドリフトの重みが脊柱起立筋に偏る。

`Bench Press - Powerlifting` と `Bench Press with Chains` が `triceps` なのも疑わしい
（通常のベンチと同じく `chest` のはず）。

### 結論

**誤りの総量は未確定だが、当たりどころが悪い。**
デッドリフトは §7 のゴールデンセット「下半身」ケースに直接効く基幹種目なので、
ここが狂ったまま M3 に進むと、出力の違和感がエンジンのバグなのかデータの誤りなのか
切り分けられなくなる。

→ **M2 の前に健全性チェック工程を置く**（Issue「上流 primaryMuscles を監査する」）。

## 自重制約（§5.4 の確認）

`category=strength` かつ `equipment=body only` は **75 件**。

| 部位       | 件数  |
| ---------- | ----- |
| chest      | 12    |
| lats       | 4     |
| quadriceps | 2     |
| **biceps** | **0** |

**§5.4 の「自重のみだと二頭の種目が事実上存在しない」は事実。** primary が biceps の自重種目はゼロ。

§7 のゴールデンセット「自重のみ / 全身 / 6種目」は生成自体は成功するが、
**二頭は必ず空く。これを「枯渇」として警告するか、黙って埋まる部位だけ返すかを M3 で決める。**
テストの期待値は「生成に成功する」だけでなく「二頭が空くことを明示できる」まで含めるべき。

## §4.3 タキソノミーとのギャップ

元データの primaryMuscles は 17 分類:
`abdominals` `abductors` `adductors` `biceps` `calves` `chest` `forearms` `glutes`
`hamstrings` `lats` `lower back` `middle back` `neck` `quadriceps` `shoulders` `traps` `triceps`

§4.3 が要求する分割のうち、**元データに情報が存在しないもの**:

| §4.3 の分類               | 元データ                | 状況                                                     |
| ------------------------- | ----------------------- | -------------------------------------------------------- |
| 三角筋 前部 / 中部 / 後部 | `shoulders` 一塊        | **104 件を種目名と instructions から推定する必要がある** |
| 大胸筋 上部 / 中下部      | `chest` 一塊            | 67 件。incline/decline はほぼ名前で判別できる            |
| 僧帽筋 上部 / 中下部      | `traps` + `middle back` | 対応が 1:1 でない                                        |
| ~~菱形筋~~                | なし                    | **僧帽筋中下部に統合した**（ADR 0005）。下記参照         |
| 脊柱起立筋                | `lower back`            | ほぼ対応する                                             |
| 腕橈骨筋                  | `forearms`              | `forearms` は手関節屈伸も含むので一致しない              |
| 腹斜筋                    | `abdominals` 一塊       | 回旋・側屈系 14 件で判別できる                           |
| 腹横筋                    | `abdominals` 一塊       | アンチ伸展系 10 件で判別できる（Plank / Rollout / Pallof / Dead Bug） |
| 中臀筋                    | `abductors`（5 件）     | 実質存在しない。上記参照                                 |

**推定が必要な件数の合計は概ね 250 件強**（shoulders 104 + abdominals 81 + chest 67）。
これが M1 の実作業量で、§4.4 手順 2「粒度の展開」の本体。

### 菱形筋を分離しない理由

`middle back` 関連は 73 件あるので**データ量は足りている**。問題は判別材料。

肩甲骨内転を主目的と読める種目名は **5 件しかない**
（Barbell Rear Delt Row / Barbell Shrug Behind The Back / Face Pull /
Middle Back Shrug / Scapular Pull-Up）。

残り 68 件は僧帽筋中下部と菱形筋のどちらに寄せるか判別できず、
分けても常に同じ値が入る。**分類として情報を持たない**ため統合した（ADR 0005）。

## ライセンス

Unlicense。派生物を Unlicense / CC0 で公開できる（§11 の前提は成立）。
`images` フィールドは使わない（§8）。
