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

`category=strength` における primaryMuscles の分布:

| 部位        | 件数    |     | 部位       | 件数   |
| ----------- | ------- | --- | ---------- | ------ |
| shoulders   | **104** |     | forearms   | 21     |
| abdominals  | 81      |     | calves     | 15     |
| chest       | 67      |     | traps      | 13     |
| quadriceps  | 60      |     | glutes     | **11** |
| triceps     | 58      |     | lower back | 5      |
| biceps      | 50      |     | neck       | 5      |
| middle back | 30      |     | adductors  | **2**  |
| lats        | 29      |     | abductors  | **2**  |
| hamstrings  | 28      |     |            |        |

**偏りは想定より大きい。** shoulders 104 に対し glutes 11、内転筋・外転筋は 2 件しかない。

これは貪欲法にそのまま漏れる。§7 のゴールデンセット「下半身: 四頭・ハム・臀 / 5種目」で
臀筋の候補が 11 件しかない点は、出力の妥当性を判断するときに考慮する必要がある。
また §4.3 で中臀筋を独立させる以上、abductors 2 件では実質的にカバー不能。
**中臀筋への配分は、他部位の種目（スクワット、ランジ等）の secondary から取る必要がある。**

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
| 菱形筋                    | なし                    | `middle back` から分離する                               |
| 脊柱起立筋                | `lower back`            | ほぼ対応する                                             |
| 腕橈骨筋                  | `forearms`              | `forearms` は手関節屈伸も含むので一致しない              |
| 腹斜筋 / 腹横筋           | `abdominals` 一塊       | 81 件。回旋系は名前で判別できる                          |
| 中臀筋                    | `abductors`（2 件）     | 実質存在しない。上記参照                                 |

**推定が必要な件数の合計は概ね 250 件強**（shoulders 104 + abdominals 81 + chest 67）。
これが M1 の実作業量で、§4.4 手順 2「粒度の展開」の本体。

## ライセンス

Unlicense。派生物を Unlicense / CC0 で公開できる（§11 の前提は成立）。
`images` フィールドは使わない（§8）。
