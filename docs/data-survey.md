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

### 対象範囲は 736 件（ストレッチと有酸素だけ除外）

**カテゴリ単位で切ると中身の例外を落とす。** 全件を精査した結果、
`stretching`（123）と `cardio`（14）だけを除外し、**残り 736 件を対象にする**。

#### 除外してよいと確認できたもの

| カテゴリ | 精査結果 |
|---|---|
| `cardio` 14 件 | 全部本物の有酸素（バイク、トレッドミル、エリプティカル、ステアマスター）。muscleWeights の概念が当てはまらない |
| `stretching` 123 件 | 56 件に `mechanic` が付いているが、中身は「Arm Circles」「Calf Stretch」。**上流のデータ品質の問題であって、筋力種目の紛れ込みではない** |

#### カテゴリで除外してはいけないもの

当初は `plyometrics` / `strongman` / `olympic weightlifting` の 117 件も
除外する案だったが、**精査したら具体的な損失が 3 つ出た**ので撤回した。

| カテゴリ | 一律除外すると失うもの |
|---|---|
| `olympic weightlifting` 35 件 | **一般的な筋力種目が 10 件以上混ざっている。** Romanian Deadlift from Deficit / Push Press / Overhead Squat / Olympic Squat / Clean Deadlift / Snatch Deadlift / Wide Stance Stiff Legs など。さらに **Clean Shrug / Snatch Shrug は僧帽筋 primary 15 件のうちの 2 件** |
| `strongman` 21 件 | **`carry`（運搬）の movementPattern が候補ゼロになる。** Farmer's Walk / Rickshaw Carry / Yoke Walk はこのカテゴリにしか存在しない |
| `plyometrics` 61 件 | **内転筋 primary の 6 件中 4 件を失う**（Lateral Bound / Lateral Box Jump / Lateral Cone Hops / Carioca Quick Step）。`strength` には Band Hip Adductions と Thigh Adductor の 2 件しか残らない |

#### 代わりに二軸で管理する

| 軸 | 内容 | 件数 |
|---|---|---|
| データセットに含める（重みを付ける） | ストレッチ・有酸素だけ除外 | **736** |
| 選択エンジンの候補に出す | `selectable` フラグ。**種目単位**で判断する | 736 − 数十件 |

アトラスストーンのような特殊器具種目や、Snatch Balance のような純粋な技術種目は
`selectable: false` にする。データとしては残るので、後から出す判断もできる。

**M5 のレビュー量は「対象を削る」ではなく「優先順位を付ける」で管理する。**
筋トレ + パワーリフティングの 619 件を先にレビューし、残り 117 件は後回しにしてよい。
ゴールデンセットの検証には 619 件で足りる。
M2 のベースライン生成は機械的なので、736 件に増えても追加コストはほぼない。

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

### 監査の結果、修正したのは 9 件

`pnpm data:audit` で動作パターン単位の割れを機械的に列挙し、全件を判定した。
対象 736 件のうち 14 グループで primaryMuscles が割れていたが、**大半は正当な差異**。

| 判定 | 例 |
|---|---|
| **正当な差異**（直さない） | リストカール（forearms）とレッグカール（hamstrings）が「curl」で同居 / アップライトロウ（traps）とベントオーバーロウ（middle back）/ リアデルトフライ（shoulders）とダンベルフライ（chest）/ Board Press・Floor Press 系（triceps。可動域を制限して三頭を狙う意図の種目） |
| キーワードの誤マッチ | Kettlebell Turkish Get-Up (Squat style) |
| **本当の不整合**（修正した） | 下表の 9 件 |

**修正した 9 件**（`packages/data/pipeline/overrides/primary-muscles.ts`）:

| 種目 | 上流 | 修正後 | 理由 |
|---|---|---|---|
| Barbell Deadlift / Axle Deadlift / Deadlift with Bands / Deadlift with Chains / Deficit Deadlift / Reverse Band Deadlift | `lower back` | `hamstrings` + `glutes` | コンベンショナルデッドリフトの主働筋は股関節伸展筋。脊柱起立筋は脊柱を中立に保つ等尺性の働きであって主働筋ではない。同じ動作の Romanian Deadlift や Sumo Deadlift は上流でも `hamstrings` |
| Bench Press - Powerlifting / Bench Press with Chains / Reverse Band Bench Press | `triceps` | `chest` | 通常のベンチプレス。チェーンやリバースバンドは負荷曲線を変えるだけで主働筋を変えない |

**上流を直接書き換えず、差分として持つ。** 上流が更新されたときに再適用でき、
「どこを何のために変えたか」が残るため。上書き対象の id が上流から消えた場合は
テストが落ちる（黙って効かなくなるのを防ぐ）。

`Car Deadlift` / `Rickshaw Deadlift` / `Leverage Deadlift` の `quadriceps` は直していない。
ハンドル位置やマシンの軌道で動作そのものが変わるため、上流の判定を尊重した。

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

### 写像の作業量は延べ 882 件

**primary だけを数えると過小評価になる。** secondary も同じ粒度で写像する必要がある。

| 上流部位 | primary | secondary | 合計 | 写像先 |
|---|---|---|---|---|
| `shoulders` | 117 | 201 | **318** | 三角筋 前/中/後 |
| `abdominals` | 85 | 53 | 138 | 腹直筋 / 腹斜筋 / 腹横筋 |
| `chest` | 79 | 54 | 133 | 大胸筋 上部 / 中下部 |
| `forearms` | 23 | 92 | 115 | 腕橈骨筋（手関節屈筋は対象外） |
| `traps` | 15 | 75 | 90 | 僧帽筋上部 |
| `middle back` | 30 | 58 | 88 | 僧帽筋中下部（菱形筋含む） |
| **合計** | | | **882** | |

これが M1 の実作業量で、§4.4 手順 2「粒度の展開」の本体。

**ただし大半は機械的に片付く。** 三角筋 317 件の実測では、
名前パターンと `force` の組み合わせで **97% を自動判定できた**（下記）。

### 三角筋の写像は 97% を自動化できた

`packages/data/pipeline/mapping/shoulders.ts`。判定の内訳:

| ルール | 件数 |
|---|---|
| 前部+中部: オーバーヘッドプレス系 | 103 |
| **前部: 押す動作の補助（`force=push`）** | 54 |
| **後部: 引く動作の補助（`force=pull`）** | 52 |
| 前部+中部: 頭上動作 | 40 |
| 後部: 水平外転系（リアデルト・リバースフライ） | 14 |
| 手動判定（instructions を読んで決定） | 18 |
| 前部: 屈曲系（フロントレイズ） | 9 |
| 中部: 外転系（サイドレイズ） | 9 |
| 中部: アップライトロウ | 7 |
| 前部: インクラインショルダーレイズ | 3 |

**鍵は `force` の利用。** 名前だけでは 56% しか判定できなかったが、
「他部位の種目に補助として入っている `shoulders`」は名前から判別できない代わりに、
**押す動作なら前部、引く動作なら後部**と決まる。これで 91% まで上がった。

残りは instructions を読んで 18 件を手動判定し、97% に到達した。

**判別不能として明示したのは 8 件。** External / Internal Rotation などの
ローテーターカフ種目で、§4.3 のタキソノミーに該当分類がない。
**黙って三角筋に寄せない**（重みの意味が壊れるため）。分類を足すかは Issue #5 で決める。

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
