# ADR 0007: 同じベース名の種目をどう区別するか

- ステータス: **Accepted**
- 日付: 2026-08-18
- 関連: ADR 0002, ADR 0006

## 背景

ADR 0006 は id を `[修飾]_[動作]` の形にすると決めた。器具と片手/両手は軸なので含めない。

統合（ADR 0002）を実際に走らせると、**同じベース名で主働筋が違うレコードが 15 組できる。**
そのままでは id が衝突する。

| ベース名 | 主働筋 | 上流 |
|---|---|---|
| `upright row` | 三角筋中部 | Upright Barbell Row 等 |
| `upright row` | 僧帽筋上部 | Upright Cable Row 等 |
| `deadlift` | ハムストリングス + 大臀筋 | Barbell Deadlift |
| `deadlift` | 大腿四頭筋 | Cable Deadlifts、Leverage Deadlift |
| `deadlift` | ハムストリングス | Kettlebell One-Legged Deadlift |

原因は**上流の `primaryMuscles` が同じ動作で割れていること**で、そのうち一部は上流の誤り。
ADR 0002 は「主働筋が入れ替わるものは畳まない」と決めているので、
これらは別レコードのまま残る。

## 決定

**衝突するベース名だけ、主働筋を接尾辞に付ける。**

```
bench_press                            ← 衝突しないので接尾辞なし
upright_row__deltoid_lateral
upright_row__trapezius_upper
deadlift__hamstrings_gluteus_maximus
deadlift__quadriceps
deadlift__hamstrings
```

区切りはアンダースコア 2 つ。主働筋自体が `_` を含むため、1 つだと境界が読めない。

**日本語名にも同じ接尾辞を付ける。**

```
デッドリフト（ハムストリングス・大臀筋）
デッドリフト（大腿四頭筋）
デッドリフト（ハムストリングス）
```

id だけ分けても、UI に「デッドリフト」が 3 つ並ぶ。

## 理由

### なぜ連番にしないか

`deadlift`、`deadlift_2`、`deadlift_3` は決定論的に振れるが、
**上流にレコードが 1 件増えるだけで番号がずれる。** id は主キーなので、
上流の追加で既存の id の指す先が変わるのは避ける。

主働筋なら、上流が増えても既存レコードの主働筋は変わらない。

### なぜ全レコードに付けないか

衝突しない 601 レコードまで `bench_press__pectoralis_major_sternal` になると読めない。
接尾辞は衝突の解決にだけ使う。

### 接尾辞が同じになる可能性

同じベース名で主働筋の並びまで一致するレコードは、統合の鍵が
「ベース名 + 上流の主働筋」なので**原理的には起こりうる**
（上流の別々の値が同じタキソノミー分類に写る場合）。
現在のデータでは 0 件で、`datasetSchema` の id 重複検査で落ちる。

## 影響

- 接尾辞が付く 15 組（32 レコード）の id は、上流の `primaryMuscles` を直すと変わる。
  上流の誤りを `pipeline/overrides/` で直すたびに id が動きうる
- 接尾辞が付いていること自体が「上流で主働筋が割れている」印になる。
  M5 の重みレビューではここを優先して見るとよい

## 実装後に分かったこと

影響欄が書いた「上流の誤りを `pipeline/overrides/` で直すたびに id が動きうる」が現に起きた。
`One Arm Chin-Up` の主働筋を `middle back` から `lats` に直すと `Chin-Up` と鍵が一致し、
`chin_up__latissimus_dorsi` と `chin_up__trapezius_middle_lower` が `chin_up` 1 件に畳まれた。

**接尾辞が付いていること自体が「上流で主働筋が割れている」印になる、という読み方は正しかった。**
この 2 件は接尾辞を手がかりに見つけている。

件数は動いている。

| 本文の記述 | 決定時 | 現在 |
|---|---|---|
| 衝突しない N レコード | 601 | 583 |
| 接尾辞が付く N 組（M レコード） | 15 組（32 レコード） | 11 組（23 レコード） |
